"""
main.py
-------
FastAPI application — RAG PDF chatbot with multi-document store and streaming.
"""

import uuid

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from rag_pipeline import process_pdf, answer_question, stream_answer
from vector_store import document_store

app = FastAPI(
    title="RAG PDF Chatbot API",
    description="Upload PDFs, switch documents, ask questions with optional streaming.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000","https://fahmni.vercel.app",  
        "https://fahmni-*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QuestionRequest(BaseModel):
    question: str

    class Config:
        json_schema_extra = {
            "example": {"question": "What is the main topic of this document?"}
        }


class UploadResponse(BaseModel):
    status: str
    message: str
    chunks: int
    preview: str
    doc_id: str


class SourceItem(BaseModel):
    page: int = Field(..., description="1-based PDF page number")
    excerpt: str = Field(..., description="Short excerpt (about 20 words)")
    score: float = Field(..., description="Relevance score (inner product / similarity)")


class AnswerResponse(BaseModel):
    answer: str
    chunks_used: int
    sources: list[SourceItem]


class DocumentsListResponse(BaseModel):
    documents: list[dict]


class ActivateResponse(BaseModel):
    success: bool
    active_doc_id: str | None


class DeleteResponse(BaseModel):
    success: bool


@app.get("/")
def root():
    return {"message": "RAG PDF Chatbot API is running!", "status": "ok"}


@app.get("/status")
def get_status():
    return {
        "document_loaded": document_store.is_ready(),
        "total_chunks": document_store.active_chunk_count(),
        "active_doc_id": document_store.active_doc_id,
    }


@app.get("/documents", response_model=DocumentsListResponse)
def list_documents():
    return {"documents": document_store.get_all_documents()}


@app.post("/documents/{doc_id}/activate", response_model=ActivateResponse)
def activate_document(doc_id: str):
    try:
        document_store.switch_document(doc_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return ActivateResponse(success=True, active_doc_id=document_store.active_doc_id)


@app.delete("/documents/{doc_id}", response_model=DeleteResponse)
def remove_document(doc_id: str):
    if not document_store.delete_document(doc_id):
        raise HTTPException(status_code=404, detail="Document not found.")
    return DeleteResponse(success=True)


@app.post("/upload", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported. Please upload a .pdf file.",
        )

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    doc_id = str(uuid.uuid4())

    try:
        result = process_pdf(file_bytes, doc_id, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")

    return UploadResponse(
        status="success",
        message=f"PDF '{file.filename}' processed successfully!",
        chunks=result["chunks"],
        preview=result["preview"],
        doc_id=result["doc_id"],
    )


@app.post("/ask", response_model=AnswerResponse)
def ask_question(request: QuestionRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        result = answer_question(request.question)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM error: {str(e)}")

    return AnswerResponse(
        answer=result["answer"],
        chunks_used=result["chunks_used"],
        sources=result["sources"],
    )


@app.post("/ask/stream")
def ask_stream(request: QuestionRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    if not document_store.is_ready():
        raise HTTPException(status_code=400, detail="No document loaded.")

    return StreamingResponse(
        stream_answer(request.question),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
