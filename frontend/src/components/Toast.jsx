import React, { useEffect } from "react";

/**
 * Floating toast: { message, type?: 'success'|'error'|'info' }
 * Auto-dismiss after durationMs (default 2000).
 */
const Toast = ({ toast, onDismiss, durationMs = 2000 }) => {
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => onDismiss(), durationMs);
    return () => clearTimeout(t);
  }, [toast, onDismiss, durationMs]);

  if (!toast) return null;

  const type = toast.type || "info";

  return (
    <div className={`toast toast--${type}`} role="status">
      {toast.message}
    </div>
  );
};

export default Toast;
