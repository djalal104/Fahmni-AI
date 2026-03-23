import React, { useState, useRef, useCallback } from "react";
import "katex/dist/katex.min.css";
import { InlineMath, BlockMath } from "react-katex";

function formatTime(ts) {
  if (ts == null) return "";
  try {
    return new Date(ts).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function formatSlideList(sources) {
  if (!sources?.length) return "";
  const slides = [...new Set(sources.map((s) => s.page).filter((n) => n != null && n > 0))].sort(
    (a, b) => a - b
  );
  return slides.map((n) => `Slide ${n}`).join(", ");
}

function formatPageList(sources) {
  if (!sources?.length) return "";
  const pages = [...new Set(sources.map((s) => s.page).filter((n) => n != null && n > 0))].sort(
    (a, b) => a - b
  );
  return pages.map((n) => `Page ${n}`).join(", ");
}

function renderMathContent(text) {
  if (text == null || text === "") return null;
  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g);

  return parts.map((part, idx) => {
    if (!part) return null;

    if (part.startsWith("$$") && part.endsWith("$$")) {
      const mathContent = part.slice(2, -2);
      try {
        return <BlockMath key={idx} math={mathContent} />;
      } catch {
        return <span key={idx}>{part}</span>;
      }
    }
    if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
      const mathContent = part.slice(1, -1);
      try {
        return <InlineMath key={idx} math={mathContent} />;
      } catch {
        return <span key={idx}>{part}</span>;
      }
    }
    return <span key={idx}>{part}</span>;
  });
}

const Sparkle = () => (
  <svg className="msg-sparkle" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2l1.2 3h3.1L14 7l1.3 3L12 8.5 8.7 10 10 7 7.7 5h3.1L12 2z" />
  </svg>
);

const Message = ({
  role,
  content,
  sources,
  loading,
  timestamp,
  isStreaming = false,
  userQuestion,
  showToast,
}) => {
  const [copyLabel, setCopyLabel] = useState("Copy");
  const [thumb, setThumb] = useState(null);
  const shareInnerRef = useRef(null);

  const isUser = role === "user";
  const isSystem = role === "system";
  const timeLabel = formatTime(timestamp);
  const slideLine = formatSlideList(sources);
  const pageLine = formatPageList(sources);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content || "");
      setCopyLabel("✓ Copied!");
      setTimeout(() => setCopyLabel("Copy"), 2000);
    } catch {
      showToast?.({ message: "Copy failed", type: "error" });
    }
  }, [content, showToast]);

  const handleShareImage = useCallback(async () => {
    const el = shareInnerRef.current;
    if (!el) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const link = document.createElement("a");
      link.download = "fahmni-answer.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
      showToast?.({ message: "✓ Downloaded!", type: "success" });
    } catch {
      showToast?.({ message: "Could not create image", type: "error" });
    }
  }, [showToast]);

  if (loading) {
    return (
      <div className="message-row assistant msg-enter">
        <div className="bubble bubble-assistant bubble-loading">
          <div className="skeleton-stack" aria-hidden>
            <div className="skeleton-line skeleton-line--w90" />
            <div className="skeleton-line skeleton-line--w70" />
            <div className="skeleton-line skeleton-line--w50" />
          </div>
          <p className="loading-caption">Analyzing document…</p>
        </div>
      </div>
    );
  }

  if (isSystem) {
    return (
      <div className="message-row system msg-enter">
        <div className="message-block">
          <div className="bubble bubble-system">
            <p>{content}</p>
          </div>
          {timeLabel ? (
            <div className="msg-meta msg-meta--system">
              <time dateTime={new Date(timestamp).toISOString()}>{timeLabel}</time>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="message-row user msg-enter">
        <div className="message-block">
          <div className="bubble bubble-user">
            <p>{content}</p>
          </div>
          {timeLabel ? (
            <div className="msg-meta msg-meta--user">
              <time dateTime={new Date(timestamp).toISOString()}>{timeLabel}</time>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  const nSources = sources?.length ?? 0;
  const showToolbar = content != null && !String(content).startsWith("Error:");

  return (
    <div className="message-row assistant msg-enter">
      <div className="message-block message-block--assistant">
        <div className="msg-ai-header">
          <Sparkle />
          <span className="label-ai">Fahmni AI</span>
          {timeLabel ? <time dateTime={new Date(timestamp).toISOString()}>{timeLabel}</time> : null}
        </div>

        <div className="bubble bubble-assistant msg-bubble-with-toolbar">
          <div className="message-content">
            {renderMathContent(content || "")}
            {isStreaming ? <span className="stream-cursor" aria-hidden /> : null}
          </div>
        </div>

        {showToolbar && (
          <div className="msg-ai-toolbar" role="toolbar" aria-label="Message actions">
            <button type="button" className="msg-tool-btn" onClick={handleCopy}>
              {copyLabel === "Copy" ? "📋 Copy" : copyLabel}
            </button>
            <button type="button" className="msg-tool-btn" onClick={handleShareImage}>
              🔗 Share as Image
            </button>
            <button
              type="button"
              className={`msg-tool-btn msg-tool-btn--vote ${thumb === "up" ? "is-active is-up" : ""}`}
              onClick={() => setThumb((t) => (t === "up" ? null : "up"))}
              aria-pressed={thumb === "up"}
              aria-label="Thumbs up"
            >
              👍
            </button>
            <button
              type="button"
              className={`msg-tool-btn msg-tool-btn--vote ${thumb === "down" ? "is-active is-down" : ""}`}
              onClick={() => setThumb((t) => (t === "down" ? null : "down"))}
              aria-pressed={thumb === "down"}
              aria-label="Thumbs down"
            >
              👎
            </button>
          </div>
        )}

        {nSources > 0 && (
          <div className="sources-simple">
            <span className="sources-simple__icon" aria-hidden>
              📄
            </span>
            <span className="sources-simple__text">Sources · {slideLine}</span>
          </div>
        )}

        {/* Off-screen capture target for html2canvas */}
        <div className="share-card-portal" aria-hidden>
          <div ref={shareInnerRef} className="share-card-inner">
            <div className="share-card-topbar" />
            <div className="share-card-brand-row">
              <span className="share-card-brand">🔍 Fahmni AI</span>
            </div>
            <div className="share-card-rule" />
            {userQuestion ? (
              <p className="share-card-question">{userQuestion}</p>
            ) : null}
            <div className="share-card-answer">{content || ""}</div>
            <div className="share-card-rule" />
            <div className="share-card-footer">
              <span>📄 Sources: {pageLine || "—"}</span>
              <span className="share-card-footer-right">fahmni.ai</span>
            </div>
            <p className="share-card-tagline">Generated by Fahmni AI</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Message;
