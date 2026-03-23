🤖 Fahmni AI — RAG-Powered PDF Chatbot

An intelligent full-stack document Q&A system built with FastAPI and React.
Upload any PDF and ask questions about it — answers are grounded strictly 
in your document content using Retrieval-Augmented Generation (RAG).

🔍 How it works:
PDF Upload → Text Extraction → Chunking → Embeddings (MiniLM) → 
FAISS Vector Index → Semantic Search → LLM Answer Generation

⚙️ Tech Stack:
- Backend:  Python · FastAPI · FAISS · sentence-transformers · PyMuPDF
- Frontend: React 18 · Axios · KaTeX (math rendering) · html2canvas
- LLM:      OpenAI API / OpenRouter (configurable via .env)
- Embeddings: all-MiniLM-L6-v2 (local, free, no API needed)

✨ Features:
- Upload multiple PDFs and switch between them
- Real-time streaming answers (word by word like ChatGPT)
- Page-level source citations (shows exactly which page the answer came from)
- LaTeX math rendering for scientific and technical documents
- Share any answer as a downloadable image card
- Copy answers to clipboard
- Professional chat interface with dark/light theme
- Works with any LLM on OpenRouter (including free models)

🚀 Built as a student AI project at ENSIA (National School of AI, Algeria)
