"""
embeddings.py
-------------
Handles converting text into numerical vectors (embeddings).

RAG Pipeline Step 3: Text → Embeddings
"""

from sentence_transformers import SentenceTransformer
import numpy as np

MODEL_NAME = "all-MiniLM-L6-v2"
model = SentenceTransformer(MODEL_NAME)


def embed_texts(chunks: list[dict]) -> np.ndarray:
    """
    Converts chunk dicts into embedding vectors (uses only the "text" field).

    Args:
        chunks: [{"text": "...", "page": int}, ...]

    Returns:
        2D numpy array of shape (len(chunks), 384), float32.
    """
    texts = [c["text"] for c in chunks]
    embeddings = model.encode(
        texts,
        convert_to_numpy=True,
        show_progress_bar=False,
        normalize_embeddings=True,
    )
    return embeddings.astype("float32")


def embed_query(query: str) -> np.ndarray:
    """Single query → shape (1, 384)."""
    embedding = model.encode(
        [query],
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    return embedding.astype("float32")
