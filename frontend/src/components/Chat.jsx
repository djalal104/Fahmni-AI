import React, { useState, useRef, useEffect, useCallback } from "react";
import { streamQuestion } from "../api";
import Message from "./Message";

const EXAMPLE_QUESTIONS = [
  "What is this document about?",
  "List the key points",
  "What are the main conclusions?",
];

const MODEL_DISPLAY = "Language model";

function truncate(str, n) {
  if (!str || str.length <= n) return str;
  return `${str.slice(0, n)}…`;
}

const Chat = ({ activeDocument, showToast }) => {
  const idRef = useRef(0);
  const nextId = () => ++idRef.current;

  const [messages, setMessages] = useState(() => [
    {
      id: nextId(),
      ts: Date.now(),
      role: "system",
      content: "Document loaded. Ask questions grounded in your PDF.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ripple, setRipple] = useState(null);

  const bottomRef = useRef(null);
  const docIdRef = useRef(null);

  const docName = activeDocument?.name ?? "Document";
  const chunkCount = activeDocument?.chunks ?? 0;

  useEffect(() => {
    const id = activeDocument?.id;
    if (id === docIdRef.current) return;
    const prevId = docIdRef.current;
    docIdRef.current = id;
    idRef.current = 0;
    const nid = () => ++idRef.current;
    const welcome =
      prevId === null
        ? "Document loaded. Ask questions grounded in your PDF."
        : "Switched document. Ask questions about this file.";
    setMessages([
      {
        id: nid(),
        ts: Date.now(),
        role: "system",
        content: welcome,
      },
    ]);
    setInput("");
    setError("");
  }, [activeDocument?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [messages, loading]);

  const handleSend = useCallback(
    async (overrideText) => {
      const question = (overrideText != null ? String(overrideText) : input).trim();
      if (!question || loading) return;

      const userMessage = {
        id: nextId(),
        ts: Date.now(),
        role: "user",
        content: question,
      };
      const assistantId = nextId();
      const assistantPlaceholder = {
        id: assistantId,
        ts: Date.now(),
        role: "assistant",
        content: "",
        sources: [],
        streaming: true,
        questionAsked: question,
      };

      setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
      setInput("");
      setError("");
      setLoading(true);

      await streamQuestion(
        question,
        (token) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: (m.content || "") + token } : m
            )
          );
        },
        (sources) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, sources: sources || [], streaming: false }
                : m
            )
          );
          setLoading(false);
        },
        (errMsg) => {
          setError(errMsg);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: m.content ? `${m.content}\n\nError: ${errMsg}` : `Error: ${errMsg}`,
                    streaming: false,
                    sources: [],
                  }
                : m
            )
          );
          setLoading(false);
        }
      );
    },
    [input, loading]
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const onSendMouseDown = (e) => {
    if (e.button !== 0 || !input.trim() || loading) return;
    const r = e.currentTarget.getBoundingClientRect();
    setRipple({
      id: Date.now(),
      x: e.clientX - r.left,
      y: e.clientY - r.top,
    });
    setTimeout(() => setRipple(null), 550);
  };

  const showEmptyState = !messages.some((m) => m.role === "user");

  return (
    <div className="chat-root chat-container chat-root-enter">
      <div className="chat-doc-strip">
        <span className="strip-doc-icon" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <path d="M14 2v6h6" strokeLinejoin="round" />
          </svg>
        </span>
        <div className="strip-inner">
          <span className="strip-name">{truncate(docName, 40)}</span>
          <span className="strip-meta">
            <span>{chunkCount} slides indexed</span>
            <span className="strip-dot">·</span>
            <span>{MODEL_DISPLAY}</span>
          </span>
        </div>
      </div>

      <div className="chat-history-wrap">
        {error && <div className="chat-error-banner">{error}</div>}

        <div
          className={`chat-history ${showEmptyState ? "chat-history--empty" : ""}`}
        >
          {showEmptyState ? (
            <div className="chat-empty">
              <div className="chat-empty__logo" aria-hidden>
                <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="6" y="4" width="24" height="32" rx="3" stroke="var(--accent)" strokeWidth="1.8" />
                  <path d="M10 14h16M10 20h12" stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </div>
              <h2 className="chat-empty__title">Document Intelligence</h2>
              <p className="chat-empty__sub">
                Ask anything about your file. Choose a suggestion or type your own question.
              </p>
              <div className="example-chips">
                {EXAMPLE_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    className="example-chip"
                    onClick={() => handleSend(q)}
                    disabled={loading}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <Message
                key={msg.id}
                role={msg.role}
                content={msg.content}
                sources={msg.sources}
                loading={false}
                timestamp={msg.ts}
                isStreaming={msg.streaming === true}
                userQuestion={msg.questionAsked}
                showToast={showToast}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="chat-input-dock">
        <div className="chat-input-card">
          <div className="chat-input-row">
            <textarea
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your document…"
              rows={2}
              disabled={loading}
            />
            <button
              type="button"
              className="btn-send"
              onMouseDown={onSendMouseDown}
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              aria-label="Send message"
            >
              {ripple && (
                <span
                  className="ripple"
                  style={{
                    left: ripple.x - 40,
                    top: ripple.y - 40,
                  }}
                />
              )}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
        <p className="input-hint">
          <span className="input-hint-bolt" aria-hidden>
            ⚡
          </span>{" "}
          Streaming answers · RAG-grounded
        </p>
      </div>
    </div>
  );
};

export default Chat;
