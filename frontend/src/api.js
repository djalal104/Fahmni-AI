/**
 * api.js
 * ------
 * Centralized API layer: Axios for JSON, fetch for SSE streaming.
 */

import axios from "axios";

export const BASE_URL = "http://localhost:8000";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120000,
});

export const uploadPDF = async (file, onProgress) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percent);
      }
    },
  });

  return response.data;
};

export const askQuestion = async (question) => {
  const response = await api.post("/ask", { question });
  return response.data;
};

/**
 * Stream answer tokens via SSE. Parses "data: {...}" lines with a line buffer.
 */
export const streamQuestion = async (question, onToken, onDone, onError) => {
  let buffer = "";
  let finished = false;

  const finish = (sources) => {
    if (finished) return;
    finished = true;
    onDone(sources || []);
  };

  try {
    const response = await fetch(`${BASE_URL}/ask/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const j = await response.json();
        if (j.detail) {
          detail = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
        }
      } catch (_) {
        /* ignore */
      }
      onError(detail);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        let data;
        try {
          data = JSON.parse(trimmed.slice(6));
        } catch {
          onError("Invalid stream data");
          return;
        }
        if (data.error) {
          onError(data.error);
          return;
        }
        if (data.done) {
          finish(data.sources);
          return;
        }
        if (data.token) onToken(data.token);
      }
    }

    const tail = buffer.trim();
    if (tail.startsWith("data: ")) {
      try {
        const data = JSON.parse(tail.slice(6));
        if (data.done) {
          finish(data.sources);
          return;
        }
      } catch (_) {
        /* ignore */
      }
    }

    finish([]);
  } catch (err) {
    onError(err.message || String(err));
  }
};

export const getDocuments = async () => {
  const response = await api.get("/documents");
  return response.data;
};

export const activateDocument = async (docId) => {
  const response = await api.post(`/documents/${encodeURIComponent(docId)}/activate`);
  return response.data;
};

export const deleteDocument = async (docId) => {
  const response = await api.delete(`/documents/${encodeURIComponent(docId)}`);
  return response.data;
};

export const getStatus = async () => {
  const response = await api.get("/status");
  return response.data;
};

export default api;
