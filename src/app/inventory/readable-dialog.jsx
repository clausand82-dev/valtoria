import React, { useEffect } from "react";
import { useLocalization } from "../../i18n/index.js";
import "./readable-dialog.css";

export function ReadableDialog({ entry, onClose }) {
  const { t } = useLocalization();
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!entry) return null;

  return (
    <div className="confirm-backdrop" role="presentation">
      <section
        className="confirm-dialog readable-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="readable-title"
      >
        <img src="/assets/generated/lorebook.png" alt="" className="readable-frame" draggable="false" />

        <div className="readable-overlay">
          <div className="readable-content">
            <div className="readable-text" dangerouslySetInnerHTML={{ __html: `<strong id="readable-title">${entry.title}</strong>${String(entry.text ?? "").replace(/\n/g, "<br/>")}` }} />
          </div>

          <div className="readable-controls">
            <div />
            <button type="button" onClick={onClose}>{t("ui.close")}</button>
          </div>
        </div>
      </section>
    </div>
  );
}
