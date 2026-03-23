"""
pdf_utils.py
------------
Handles PDF text extraction using PyMuPDF (fitz).

RAG Pipeline Step 1: Extract text per page, then chunk with page metadata.
"""

import fitz  # PyMuPDF


def extract_pages_from_pdf(file_bytes: bytes) -> list[dict]:
    """
    Extracts text from each page of a PDF, preserving 1-based page numbers.

    Returns:
        [{"page": 1, "text": "..."}, ...] — empty pages are omitted.
    """
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    pages: list[dict] = []
    for i in range(len(doc)):
        page = doc.load_page(i)
        text = page.get_text()
        if text.strip():
            pages.append({"page": i + 1, "text": text.strip()})
    doc.close()
    return pages


def chunk_text(pages: list[dict], chunk_size: int = 500, overlap: int = 100) -> list[dict]:
    """
    Splits each page's text into overlapping chunks. Every chunk carries its page number.

    Args:
        pages: List of {"page": int, "text": str} from extract_pages_from_pdf.
        chunk_size: Max characters per chunk.
        overlap: Characters shared between consecutive chunks on the same page.

    Returns:
        [{"text": "...", "page": 3}, ...]
    """
    chunks: list[dict] = []
    for p in pages:
        page_num = p["page"]
        text = p["text"]
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end]
            if chunk.strip():
                chunks.append({"text": chunk.strip(), "page": page_num})
            start += chunk_size - overlap
    return chunks
