"""
vector_store.py
---------------
Multi-document FAISS store: each PDF has its own index; one active document at a time.
"""

from __future__ import annotations

from datetime import datetime, timezone

import faiss
import numpy as np


class DocumentStore:
    """Manages multiple vector indexes keyed by doc_id."""

    def __init__(self, dimension: int = 384):
        self.dimension = dimension
        self.documents: dict[str, dict] = {}
        self.active_doc_id: str | None = None

    def add_document(
        self,
        doc_id: str,
        name: str,
        embeddings: np.ndarray,
        chunks: list[dict],
    ) -> None:
        index = faiss.IndexFlatIP(self.dimension)
        index.add(embeddings)
        self.documents[doc_id] = {
            "index": index,
            "chunks": chunks,
            "name": name,
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
        }
        self.active_doc_id = doc_id
        print(f"[DocumentStore] Added document {doc_id!r} ({name}), {len(chunks)} chunks. Active.")

    def switch_document(self, doc_id: str) -> None:
        if doc_id not in self.documents:
            raise ValueError(f"Unknown document: {doc_id}")
        self.active_doc_id = doc_id

    def delete_document(self, doc_id: str) -> bool:
        if doc_id not in self.documents:
            return False
        del self.documents[doc_id]
        if self.active_doc_id == doc_id:
            self.active_doc_id = next(iter(self.documents), None)
        return True

    def search(self, query_embedding: np.ndarray, top_k: int = 5) -> list[dict]:
        if not self.is_ready():
            raise ValueError("Vector store is empty. Please upload a PDF first.")
        doc = self.documents[self.active_doc_id]
        index = doc["index"]
        chunks = doc["chunks"]
        if index.ntotal == 0:
            raise ValueError("Vector store is empty. Please upload a PDF first.")

        actual_k = min(top_k, index.ntotal)
        scores, indices = index.search(query_embedding, actual_k)

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx != -1:
                c = chunks[idx]
                results.append({
                    "text": c["text"],
                    "page": c["page"],
                    "score": float(score),
                })
        return results

    def is_ready(self) -> bool:
        return (
            self.active_doc_id is not None
            and self.active_doc_id in self.documents
            and self.documents[self.active_doc_id]["index"].ntotal > 0
        )

    def active_chunk_count(self) -> int:
        if not self.is_ready():
            return 0
        return len(self.documents[self.active_doc_id]["chunks"])

    def get_all_documents(self) -> list[dict]:
        out = []
        for did, d in self.documents.items():
            out.append({
                "id": did,
                "name": d["name"],
                "chunks": len(d["chunks"]),
                "uploaded_at": d["uploaded_at"],
                "is_active": did == self.active_doc_id,
            })
        return sorted(out, key=lambda x: x["uploaded_at"], reverse=True)


document_store = DocumentStore(dimension=384)
