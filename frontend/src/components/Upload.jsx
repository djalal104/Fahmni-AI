import React, { useState, useRef, useEffect } from "react";
import { uploadPDF } from "../api";

const PROCESS_STEPS = [
  { label: "Reading document", key: "s1" },
  { label: "Splitting into sections", key: "s2" },
  { label: "Generating embeddings", key: "s3" },
  { label: "Building search index", key: "s4" },
];

const Upload = ({ onUploadSuccess, variant = "full" }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [completedSteps, setCompletedSteps] = useState(0);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!uploading) {
      setCompletedSteps(0);
      return;
    }
    setCompletedSteps(0);
    const timers = [
      setTimeout(() => setCompletedSteps(1), 800),
      setTimeout(() => setCompletedSteps(2), 1600),
      setTimeout(() => setCompletedSteps(3), 2400),
      setTimeout(() => setCompletedSteps(4), 3200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [uploading]);

  const pickFile = (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a PDF file.");
      return;
    }
    setError("");
    setSelectedFile(file);
  };

  const handleFileChange = (e) => {
    pickFile(e.target.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    pickFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a PDF file first.");
      return;
    }

    setUploading(true);
    setError("");
    setProgress(0);
    setCompletedSteps(0);

    try {
      const data = await uploadPDF(selectedFile, setProgress);
      setCompletedSteps(4);
      onUploadSuccess?.(data);
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        err.message ||
        "Upload failed. Is the backend running?";
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  const isCompact = variant === "compact";

  return (
    <div className={`upload-card upload-card-enter ${isCompact ? "upload-card--compact" : ""}`}>
      {!isCompact && (
        <div className="upload-hero-icon">
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path
              d="M12 10h18l8 8v22a4 4 0 01-4 4H12a4 4 0 01-4-4V14a4 4 0 014-4z"
              stroke="var(--accent)"
              strokeWidth="2"
              fill="var(--accent-light)"
            />
            <path d="M28 10v8h8" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
            <path d="M16 26h16M16 32h10" stroke="var(--accent-hover)" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
          </svg>
        </div>
      )}

      <h2 className="upload-title">{isCompact ? "Add PDF" : "Upload your document"}</h2>
      {!isCompact && (
        <p className="upload-sub">Upload a PDF and ask questions grounded in its content</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      <div
        className={`drop-zone ${selectedFile ? "has-file" : ""} ${isCompact ? "drop-zone--compact" : ""}`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        <div className="drop-zone-inner">
          {selectedFile ? (
            <div className="file-selected">
              <div className="file-check" aria-hidden>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="file-name">{selectedFile.name}</span>
              <span className="file-size">{(selectedFile.size / 1024).toFixed(1)} KB</span>
            </div>
          ) : (
            <>
              <div className="drop-icon-wrap">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" aria-hidden>
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="drop-hint-title">Drag & drop your PDF</span>
              <button
                type="button"
                className="drop-browse"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Browse files
              </button>
            </>
          )}
        </div>
      </div>

      <button type="button" className="btn-upload-primary" onClick={handleUpload} disabled={!selectedFile || uploading}>
        <span className="btn-upload-primary__shine" aria-hidden />
        {uploading ? "Processing…" : "Process Document →"}
      </button>

      {uploading && (
        <div className="progress-wrap">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="progress-label">
            {progress < 100 ? `Uploading… ${progress}%` : "Processing on server…"}
          </p>
        </div>
      )}

      {uploading && (
        <div className="process-steps" aria-live="polite">
          {PROCESS_STEPS.map((step, i) => {
            const done = completedSteps > i;
            const active = completedSteps === i;
            return (
              <div
                key={step.key}
                className={`process-step process-step-enter ${done ? "is-done" : ""} ${active ? "is-active" : ""}`}
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                <span className="step-status" aria-hidden>
                  {done ? (
                    <span className="step-check">✓</span>
                  ) : active ? (
                    <span className="step-spinner" />
                  ) : (
                    <span className="step-dot" />
                  )}
                </span>
                <span className="step-label">{step.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}
    </div>
  );
};

export default Upload;
