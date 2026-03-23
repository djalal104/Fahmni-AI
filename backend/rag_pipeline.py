"""
rag_pipeline.py
---------------
RAG pipeline: process PDF → answer questions with page-aware sources; streaming support.
"""

from __future__ import annotations

import json
import os
import time

from dotenv import load_dotenv
from openai import APIStatusError, OpenAI, RateLimitError

from pdf_utils import extract_pages_from_pdf, chunk_text
from embeddings import embed_texts, embed_query
from vector_store import document_store

load_dotenv()

SYSTEM_PROMPT = """You are Fahmni AI, a professional, friendly, and highly intelligent assistant.

You have two modes depending on the user's message:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODE 1 — CONVERSATIONAL (greetings, small talk, general questions)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Triggered when the user says hello, thanks, asks how you work,
asks a general knowledge question unrelated to any document,
or engages in casual conversation.

Rules:
- Respond naturally, warmly, and concisely like a helpful assistant.
- For general knowledge questions (science, history, math, coding, etc.)
  answer confidently from your own knowledge — no need to reference
  any document.
- Keep greetings short (1-2 sentences).
- Never say "the document does not contain..." for conversational messages.
- Example: "Hello!" → "Hello! I'm Fahmni AI. Ask me anything about
  your uploaded document, or any general question — I'm here to help."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODE 2 — DOCUMENT ANALYSIS (questions about the uploaded content)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Triggered when the user asks about the content, topic, data,
findings, or any specific information from the uploaded document.

Rules:
1. Always prioritize facts, figures, and claims from the document.
   Paraphrase and synthesize them accurately.
2. If multiple parts of the document are relevant, weave them into
   one coherent, well-structured answer using short paragraphs or
   bullet points as appropriate.
3. You may briefly clarify standard terms, acronyms, or concepts
   if the document assumes them but does not define them — keep
   such additions short and clearly secondary to the document.
4. If the document does not fully answer the question:
   - State what is available in the document first.
   - Then add 1-2 sentences of general knowledge to complement,
     clearly marked as: "In general, ..."
5. Never contradict the document.
6. Never invent specifics (names, dates, numbers) not supported
   by the document or widely accepted facts.
7. Never mention "chunks", "context", "retrieval", or
   "the provided text" — answer as if you read the document yourself.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULES THAT ALWAYS APPLY (BOTH MODES)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Always answer in the same language as the user's question.
- Be concise, clear, and professional — no filler sentences.
- Be warm and approachable — never robotic or cold.
- If the user asks who you are: "I am Fahmni AI, an intelligent
  document analysis assistant. I can answer questions about your
  uploaded documents and help with general knowledge questions."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MATHEMATICAL EXPRESSIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Always use LaTeX notation for any math:
- Inline math:  $E = mc^2$
- Block math:   $$\\int_0^\\infty f(x)\\,dx$$
- Never write math as plain text without LaTeX delimiters.
- Examples:
    x squared      →  $x^2$
    square root    →  $\\sqrt{2}$
    fraction       →  $\\frac{x}{y}$
    summation      →  $\\sum_{i=0}^{n} x_i$
    matrix         →  $$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$$
"""


def _excerpt_from_text(text: str, max_words: int = 20) -> str:
    words = text.split()
    if len(words) <= max_words:
        return text
    return " ".join(words[:max_words]) + "..."


def _format_sources_for_response(retrieval_results: list[dict]) -> list[dict]:
    by_page: dict[int, list[dict]] = {}
    for r in retrieval_results:
        p = r["page"]
        by_page.setdefault(p, []).append(r)

    out: list[dict] = []
    for page in sorted(by_page.keys()):
        group = by_page[page]
        best = max(group, key=lambda x: x["score"])
        out.append({
            "page": page,
            "excerpt": _excerpt_from_text(best["text"]),
            "score": best["score"],
        })
    return out


def _build_user_prompt(question: str, context: str) -> str:
    return f"""DOCUMENT CONTEXT:
{context}

---
QUESTION: {question}

Provide a clear, well-structured answer grounded in the document above. Use careful general knowledge only where it clarifies or where the document is silent, without inventing document-specific facts."""


def _retrieve(question: str, top_k: int = 5) -> tuple[str, list[dict]]:
    query_vec = embed_query(question)
    results = document_store.search(query_vec, top_k=top_k)
    context_parts = [r["text"] for r in results]
    context = "\n\n---\n\n".join(context_parts)
    return context, results


def _chat_completion_with_retry(system_prompt: str, user_prompt: str, max_attempts: int = 4) -> str:
    last_err: Exception | None = None
    for attempt in range(max_attempts):
        try:
            response = client.chat.completions.create(
                model=LLM_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.28,
                max_tokens=1024,
            )
            return response.choices[0].message.content.strip()
        except RateLimitError as e:
            last_err = e
        except APIStatusError as e:
            if e.status_code != 429:
                raise
            last_err = e
        if attempt < max_attempts - 1:
            wait = 2 ** attempt
            print(f"[RAG] Rate limited (429), retrying in {wait}s (attempt {attempt + 1}/{max_attempts})...")
            time.sleep(wait)
    assert last_err is not None
    raise last_err


OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")

if OPENROUTER_API_KEY:
    client = OpenAI(
        api_key=OPENROUTER_API_KEY,
        base_url="https://openrouter.ai/api/v1",
    )
    LLM_MODEL = os.getenv("LLM_MODEL", "openai/gpt-3.5-turbo")
    print("[RAG] Using OpenRouter")
elif OPENAI_API_KEY:
    client = OpenAI(api_key=OPENAI_API_KEY)
    LLM_MODEL = os.getenv("LLM_MODEL", "gpt-3.5-turbo")
    print("[RAG] Using OpenAI")
else:
    raise EnvironmentError(
        "No LLM API key found. Set OPENAI_API_KEY or OPENROUTER_API_KEY in .env"
    )


def process_pdf(file_bytes: bytes, doc_id: str, display_name: str) -> dict:
    print("[Pipeline] Extracting text from PDF...")
    pages = extract_pages_from_pdf(file_bytes)

    if not pages:
        raise ValueError("Could not extract any text from the PDF. Is it a scanned image?")

    print("[Pipeline] Chunking text...")
    chunks = chunk_text(pages, chunk_size=500, overlap=100)
    print(f"[Pipeline] Created {len(chunks)} chunks.")

    print("[Pipeline] Embedding chunks (this may take a moment)...")
    embeddings = embed_texts(chunks)

    print("[Pipeline] Building vector index...")
    document_store.add_document(doc_id, display_name, embeddings, chunks)

    return {
        "status": "success",
        "chunks": len(chunks),
        "preview": chunks[0]["text"][:200] if chunks else "",
        "doc_id": doc_id,
    }


def answer_question(question: str, top_k: int = 5) -> dict:
    if not document_store.is_ready():
        raise ValueError("No document loaded. Please upload a PDF first.")

    context, results = _retrieve(question, top_k=top_k)
    user_prompt = _build_user_prompt(question, context)

    print(f"[RAG] Calling LLM ({LLM_MODEL}) with {len(results)} context chunks...")
    answer = _chat_completion_with_retry(
        system_prompt=SYSTEM_PROMPT,
        user_prompt=user_prompt,
    )

    sources = _format_sources_for_response(results)

    return {
        "answer": answer,
        "sources": sources,
        "chunks_used": len(results),
    }


def stream_answer(question: str, top_k: int = 5):
    """
    Generator yielding Server-Sent Event lines: token chunks, then {done, sources}.
    """
    if not document_store.is_ready():
        yield f"data: {json.dumps({'error': 'No document loaded. Please upload a PDF first.'})}\n\n"
        return

    try:
        context, results = _retrieve(question, top_k=top_k)
    except ValueError as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
        return

    user_prompt = _build_user_prompt(question, context)
    sources = _format_sources_for_response(results)
    sources_payload = [
        {"page": s["page"], "excerpt": s["excerpt"], "score": s["score"]}
        for s in sources
    ]

    try:
        stream = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.28,
            max_tokens=1024,
            stream=True,
        )
        for chunk in stream:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta
            if delta and delta.content:
                yield f"data: {json.dumps({'token': delta.content})}\n\n"
    except (RateLimitError, APIStatusError) as e:
        msg = str(e)
        if isinstance(e, APIStatusError) and e.status_code == 429:
            msg = "Rate limited. Please retry shortly."
        yield f"data: {json.dumps({'error': msg})}\n\n"
        return
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
        return

    yield f"data: {json.dumps({'sources': sources_payload, 'done': True})}\n\n"
