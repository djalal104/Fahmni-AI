<div align="center">

<br/>

# فهمني — Fahmni

### AI-Powered Document Intelligence — Ask Questions, Get Grounded Answers

<br/>

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org)
[![FAISS](https://img.shields.io/badge/FAISS-Vector_DB-blue?style=flat)](https://github.com/facebookresearch/faiss)
[![OpenRouter](https://img.shields.io/badge/OpenRouter-LLM_Gateway-FF6B35?style=flat)](https://openrouter.ai)
[![License](https://img.shields.io/badge/License-MIT-22C55E?style=flat)](LICENSE)

<br/>

> Upload any PDF. Ask anything. Get answers grounded strictly in your document.
> Built with RAG — Retrieval-Augmented Generation.

<br/>

</div>

---

## 📋 Table of Contents

- [What is Fahmni?](#-what-is-fahmni)
- [How It Works](#-how-it-works)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Running the Project](#-running-the-project)
- [API Reference](#-api-reference)
- [Troubleshooting](#-troubleshooting)
- [Roadmap](#-roadmap)
- [Author](#-author)

---

## 🤖 What is Fahmni?

**Fahmni** (Arabic: فهمني — *"Understand me"*) is a full-stack AI application that lets you have an intelligent conversation with any PDF document. It uses **Retrieval-Augmented Generation (RAG)** — a technique that combines semantic search with large language models — to answer your questions based strictly on the content of your uploaded document.

Unlike general chatbots, Fahmni **does not hallucinate** or use outside knowledge when answering document-specific questions. Every answer is traceable back to a specific page in your PDF.

### Why RAG?

| Approach | Problem |
|---|---|
| Send full PDF to LLM | Token limits, slow, expensive |
| Fine-tune a model | Requires large dataset, expensive, time-consuming |
| **RAG — used in Fahmni** | ✅ Fast, accurate, cheap, no training needed |

---

## 🧠 How It Works

```
PDF Upload
    │
    ▼
① Text Extraction ──── PyMuPDF reads every page, tags text with page numbers
    │
    ▼
② Chunking ─────────── Text split into ~500 char overlapping segments
    │                  overlap = 100 chars to preserve boundary context
    ▼
③ Embedding ────────── all-MiniLM-L6-v2 converts each chunk → 384-dim vector
    │
    ▼
④ FAISS Index ──────── All vectors stored in a fast in-memory similarity index
    │
    │                   User asks a question
    ▼
⑤ Query Embedding ──── Question converted to a vector using the same model
    │
    ▼
⑥ Semantic Search ──── FAISS finds the top 5 most relevant chunks
    │
    ▼
⑦ Prompt Building ──── Chunks + question assembled into a grounded prompt
    │
    ▼
⑧ LLM Generation ───── OpenRouter LLM generates a precise, sourced answer
    │
    ▼
  Answer returned with page citations
```

---

## ✨ Features

- 📄 **PDF Upload & Processing** — Upload any text-based PDF and index it in seconds
- 💬 **Intelligent Q&A** — Ask questions in natural language, get precise answers
- 📍 **Page-Level Citations** — Every answer shows exactly which page it came from
- 🌊 **Streaming Answers** — Responses stream word by word like ChatGPT
- 📚 **Multi-Document Support** — Upload multiple PDFs and switch between them
- 🔢 **LaTeX Math Rendering** — Mathematical formulas rendered beautifully with KaTeX
- 🖼️ **Share as Image** — Download any answer as a shareable image card
- 📋 **Copy to Clipboard** — One-click copy any AI answer
- 🌐 **Multi-Language** — Ask in any language, Fahmni answers in the same language
- 🔒 **Grounded Answers** — AI cannot make up information not in your document
- ⚡ **Fast & Local Embeddings** — No paid embedding API needed (runs locally)

---

## 🛠 Tech Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Python | 3.10+ | Core language |
| FastAPI | 0.111 | REST API framework |
| PyMuPDF | 1.24 | PDF text extraction |
| sentence-transformers | 2.7 | Local embedding model (MiniLM-L6-v2) |
| FAISS | 1.8 | Vector similarity search |
| OpenAI SDK | 1.30 | LLM client (OpenAI + OpenRouter compatible) |
| python-dotenv | 1.0 | Environment variable management |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18 | UI framework |
| Axios | 1.7 | HTTP client |
| KaTeX / react-katex | latest | LaTeX math rendering |
| html2canvas | latest | Share answer as image |

### AI / Models
| Component | Model | Details |
|---|---|---|
| Embeddings | all-MiniLM-L6-v2 | 384-dim vectors, runs locally, free |
| LLM | Configurable via .env | OpenAI GPT or any OpenRouter model |

---

## 📁 Project Structure

```
fahmni/
│
├── backend/
│   ├── main.py              ← FastAPI app — API endpoints
│   ├── rag_pipeline.py      ← RAG orchestration (ingestion + Q&A + streaming)
│   ├── pdf_utils.py         ← PDF extraction + chunking with page tracking
│   ├── embeddings.py        ← Text → vector conversion (MiniLM)
│   ├── vector_store.py      ← FAISS index — multi-document support
│   ├── requirements.txt     ← Python dependencies
│   └── .env.example         ← Environment config template
│
├── frontend/
│   ├── package.json
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── index.js              ← React entry point
│       ├── App.jsx               ← Root component + documents sidebar
│       ├── api.js                ← Centralized API layer (Axios + streaming)
│       ├── styles.css            ← Full design system
│       └── components/
│           ├── Upload.jsx        ← PDF upload + processing steps UI
│           ├── Chat.jsx          ← Chat interface + empty state
│           ├── Message.jsx       ← Message bubbles + page citations + share
│           └── Toast.jsx         ← Toast notifications
│
└── README.md
```

---

## 📦 Installation

### Prerequisites

Make sure you have these installed:

- **Python** 3.10+ → [python.org](https://python.org)
- **Node.js** 18+ → [nodejs.org](https://nodejs.org)
- **Git** → [git-scm.com](https://git-scm.com)
- An **API key** from [OpenRouter](https://openrouter.ai) (free tier available)

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/fahmni.git
cd fahmni
```

### 2. Backend setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate — Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Activate — Mac / Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Frontend setup

```bash
cd ../frontend
npm install
```

---

## ⚙️ Configuration

### Create your `.env` file

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` and fill it in:

```env
# ── Option A: OpenRouter (recommended — free models available) ──
OPENROUTER_API_KEY=sk-or-your-key-here
LLM_MODEL=meta-llama/llama-3.3-70b-instruct:free

# ── Option B: OpenAI directly ──
# OPENAI_API_KEY=sk-your-openai-key-here
# LLM_MODEL=gpt-3.5-turbo
```

### Recommended models on OpenRouter

| Model | ID | Notes |
|---|---|---|
| Llama 3.3 70B | `meta-llama/llama-3.3-70b-instruct:free` | Best free — general documents |
| Mistral Small 3.1 | `mistralai/mistral-small-3.1-24b-instruct:free` | Best for long documents |
| Gemma 3 27B | `google/gemma-3-27b-it:free` | Good for scientific content |
| DeepSeek V3 | `deepseek/deepseek-chat` | Best quality — paid (~$0.001/question) |

> **Free tier limits:** 20 requests/minute · 200 requests/day  
> Add $5 credits on OpenRouter to remove limits permanently.

---

## 🚀 Running the Project

### Terminal 1 — Start the backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

You should see:
```
[RAG] Using OpenRouter
INFO: Uvicorn running on http://127.0.0.1:8000
INFO: Application startup complete.
```

### Terminal 2 — Start the frontend

```bash
cd frontend
npm start
```

App opens at **http://localhost:3000** ✅

### Verify

| URL | Expected |
|---|---|
| `http://localhost:8000` | `{"status": "ok"}` |
| `http://localhost:8000/docs` | Interactive API docs (Swagger UI) |
| `http://localhost:3000` | Fahmni chat interface |

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `GET` | `/status` | Check if a document is loaded |
| `GET` | `/documents` | List all uploaded documents |
| `POST` | `/upload` | Upload and process a PDF |
| `POST` | `/ask` | Ask a question (full response) |
| `POST` | `/ask/stream` | Ask a question (streaming SSE) |
| `POST` | `/documents/{id}/activate` | Switch active document |
| `DELETE` | `/documents/{id}` | Delete a document |

### Example — Upload a PDF

```bash
curl -X POST http://localhost:8000/upload \
  -F "file=@document.pdf"
```

### Example — Ask a question

```bash
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the main topic of this document?"}'
```

### Response format

```json
{
  "answer": "The document covers...",
  "chunks_used": 5,
  "sources": [
    { "page": 3, "excerpt": "First 20 words of the relevant passage...", "score": 0.94 },
    { "page": 7, "excerpt": "Another relevant passage from page 7...", "score": 0.87 }
  ]
}
```

---

## 🐛 Troubleshooting

| Error | Cause | Solution |
|---|---|---|
| `CORS error` in browser | Backend not running | Start `uvicorn main:app --reload --port 8000` |
| `401 Incorrect API key` | Wrong provider | Delete `OPENAI_API_KEY`, keep only `OPENROUTER_API_KEY` |
| `404 No endpoints found` | Invalid model ID | Check exact model ID at [openrouter.ai/models](https://openrouter.ai/models) |
| `429 Rate limit exceeded` | Free model overloaded | Wait 60s or switch to another free model |
| Slow first upload | Model downloading | Wait ~30s for MiniLM (~90 MB), cached after first run |
| Empty PDF error | Scanned image PDF | Only text-based PDFs supported |
| PowerShell activation error | Execution policy blocked | Run `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` |

---

## 🗺 Roadmap

- [x] PDF upload and full RAG pipeline
- [x] Page-level source citations
- [x] Real-time streaming answers
- [x] Multi-document support
- [x] LaTeX math rendering
- [x] Share answer as image
- [x] Copy to clipboard
- [ ] OCR support for scanned PDFs
- [ ] Persistent vector storage (database)
- [ ] User authentication
- [ ] Chat history saved across sessions
- [ ] Docker deployment

---

## 👨‍💻 Author

**Djalal Eddine Belkadi**
AI Student — National School of Artificial Intelligence (ENSIA), Algeria

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Made with ❤️ · RAG · FastAPI · React · FAISS · sentence-transformers

**فهمني — Fahmni**

</div>
