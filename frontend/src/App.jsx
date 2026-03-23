import React, { useState, useLayoutEffect, useEffect, useCallback } from "react";
import Upload from "./components/Upload";
import Chat from "./components/Chat";
import Toast from "./components/Toast";
import { getDocuments, activateDocument, deleteDocument } from "./api";

const THEME_KEY = "fahmni-theme";

const DocIcon = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path
      d="M8 6h12a2 2 0 012 2v14l-4 4H8a2 2 0 01-2-2V8a2 2 0 012-2z"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <path d="M10 11h10M10 15h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
  </svg>
);

const IconMoon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconSun = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
  </svg>
);

const IconPlus = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
  </svg>
);

const IconMenu = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
  </svg>
);

function formatRelativeTime(iso) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "1 day ago" : `${d} days ago`;
}

function truncate(str, n) {
  if (!str || str.length <= n) return str;
  return `${str.slice(0, n)}…`;
}

const App = () => {
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    return localStorage.getItem(THEME_KEY) || "light";
  });

  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  const refreshDocuments = useCallback(async () => {
    try {
      const data = await getDocuments();
      const list = data?.documents ?? [];
      setDocuments(list);
      return list;
    } catch {
      setToast({ message: "Could not load documents", type: "error" });
      setDocuments([]);
      return [];
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setDocsLoading(true);
      await refreshDocuments();
      if (!cancelled) setDocsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshDocuments]);

  const activeDocument =
    documents.find((d) => d.is_active) ?? (documents.length ? documents[0] : null);
  const hasDocuments = documents.length > 0;

  const handleActivate = async (docId) => {
    try {
      await activateDocument(docId);
      await refreshDocuments();
      setSidebarOpen(false);
    } catch {
      setToast({ message: "Could not switch document", type: "error" });
    }
  };

  const handleDelete = async (docId, e) => {
    e.stopPropagation();
    try {
      await deleteDocument(docId);
      await refreshDocuments();
      setToast({ message: "Document removed", type: "info" });
    } catch {
      setToast({ message: "Could not delete document", type: "error" });
    }
  };

  const handleUploadSuccess = useCallback(async (data) => {
    await refreshDocuments();
    setUploadModalOpen(false);
    setToast({
      message: data?.message || "Document processed",
      type: "success",
    });
  }, [refreshDocuments]);

  const openUploadModal = () => setUploadModalOpen(true);

  const dismissToast = useCallback(() => setToast(null), []);

  const showToast = useCallback((t) => setToast(t), []);

  const activeName = activeDocument?.name ?? "";

  return (
    <div className="app">
      <div className="app-bg" aria-hidden>
        <div className="app-bg__dots" />
      </div>

      <header className="app-header app-header-enter">
        <div className="header-brand-row">
          {hasDocuments && (
            <button
              type="button"
              className="sidebar-toggle-mobile"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open documents"
            >
              <IconMenu />
            </button>
          )}
          <div className="header-brand">
            <div className="logo-mark">
              <DocIcon />
            </div>
            <div className="brand-text">
              <h1 className="brand-title">Fahmni</h1>
              <p className="subtitle">Document Intelligence</p>
            </div>
          </div>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            {theme === "light" ? <IconMoon /> : <IconSun />}
          </button>

          {hasDocuments && activeDocument && (
            <>
              <span className="ready-badge">
                <span className="status-dot" aria-hidden />
                Ready
              </span>
              <span className="doc-name-header" title={activeName}>
                {truncate(activeName, 24)}
              </span>
            </>
          )}
        </div>
      </header>

      <div className="app-body">
        {docsLoading ? (
          <main className="app-main app-main--center">
            <div className="docs-loading">Loading…</div>
          </main>
        ) : hasDocuments ? (
          <>
            {sidebarOpen ? (
              <button
                type="button"
                className="sidebar-scrim"
                aria-label="Close documents panel"
                onClick={() => setSidebarOpen(false)}
              />
            ) : null}
            <aside
              className={`docs-sidebar ${sidebarOpen ? "is-open" : ""}`}
              aria-label="Documents"
            >
              <div className="docs-sidebar-inner">
                <div className="docs-sidebar-header">
                  <h2 className="docs-sidebar-title">Documents</h2>
                  <button
                    type="button"
                    className="docs-sidebar-new"
                    onClick={openUploadModal}
                    aria-label="Upload new document"
                    title="New document"
                  >
                    <IconPlus />
                  </button>
                </div>

                <ul className="docs-list">
                  {documents.map((doc) => {
                    const active = doc.is_active;
                    return (
                      <li key={doc.id}>
                        <div className={`doc-item ${active ? "is-active" : ""}`}>
                          <button
                            type="button"
                            className="doc-item-select"
                            onClick={() => handleActivate(doc.id)}
                          >
                            <span className="doc-item-icon" aria-hidden>
                              📄
                            </span>
                            <span className="doc-item-text">
                              <span className="doc-item-name" title={doc.name}>
                                {truncate(doc.name, 28)}
                              </span>
                              <span className="doc-item-meta">
                                {doc.chunks} chunks · {formatRelativeTime(doc.uploaded_at)}
                              </span>
                            </span>
                          </button>
                          <button
                            type="button"
                            className="doc-item-delete"
                            aria-label={`Delete ${doc.name}`}
                            onClick={(e) => handleDelete(doc.id, e)}
                          >
                            ✕
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </aside>

            <main className="app-main app-main--with-sidebar">
              <div className="view-panel view-panel--chat">
                <div className="chat-page-slot">
                  {activeDocument ? (
                    <Chat activeDocument={activeDocument} showToast={showToast} />
                  ) : (
                    <div className="docs-loading">Select a document</div>
                  )}
                </div>
              </div>
            </main>
          </>
        ) : (
          <main className="app-main">
            <div className="view-panel">
              <Upload variant="full" onUploadSuccess={handleUploadSuccess} />
            </div>
          </main>
        )}
      </div>

      {uploadModalOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-modal-title"
          onClick={() => setUploadModalOpen(false)}
        >
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-sheet-head">
              <h2 id="upload-modal-title" className="modal-sheet-title">
                New document
              </h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setUploadModalOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <Upload variant="compact" onUploadSuccess={handleUploadSuccess} />
          </div>
        </div>
      )}

      <footer className="app-footer">Fahmni</footer>

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
};

export default App;
