"use client";
import { useEffect, useRef } from "react";

// In-page confirmation for destructive actions, in place of window.confirm().
// Safari lets a user silence a page's dialogs for the rest of the session ("prevent
// this page from creating additional dialogs"); after that confirm() returns false
// immediately and every button behind it looks dead with no way to tell why.
export function ConfirmBar({
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  busy,
}: {
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // The trigger button unmounts as this mounts, so focus would otherwise fall to
  // <body> and a keyboard/screen-reader user would lose their place entirely.
  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <div ref={ref} className="warn-box" tabIndex={-1} style={{ outline: "none" }}>
      <div role="alert" style={{ marginBottom: 10 }}>
        {message}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-sm" style={{ width: "auto", background: "#c62828", color: "#fff" }} onClick={onConfirm} disabled={busy}>
          {confirmLabel}
        </button>
        <button type="button" className="btn btn-sm btn-ghost" style={{ width: "auto" }} onClick={onCancel} disabled={busy}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
