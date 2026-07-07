import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { READABLE_DEF_BY_ID } from "../../game/config/readable-config.js";
import { useLocalization } from "../../i18n/index.js";
import "./readable-dialog.css";

export function ReadableDialog({ entry, onClose }) {
  const { language, localize, t } = useLocalization();
  const contentRef = useRef(null);
  const [spread, setSpread] = useState(0);
  const [spreadCount, setSpreadCount] = useState(1);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowLeft") setSpread((current) => Math.max(0, current - 1));
      if (e.key === "ArrowRight") setSpread((current) => Math.min(spreadCount - 1, current + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, spreadCount]);

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content || !entry) return undefined;

    setSpread(0);
    const measure = () => {
      const styles = window.getComputedStyle(content);
      const gap = Number.parseFloat(styles.columnGap) || 0;
      const stride = content.clientWidth + gap;
      const overflowWidth = Math.max(0, content.scrollWidth - content.clientWidth);
      const count = Math.max(1, Math.ceil(overflowWidth / Math.max(1, stride)) + 1);
      setSpreadCount(count);
      content.scrollLeft = 0;
    };

    measure();
    document.fonts?.ready?.then(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    return () => observer.disconnect();
  }, [entry, language]);

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const gap = Number.parseFloat(window.getComputedStyle(content).columnGap) || 0;
    content.scrollLeft = spread * (content.clientWidth + gap);
  }, [spread, spreadCount]);

  if (!entry) return null;

  const readableId = entry.readableId ?? entry.item?.readableId;
  const readableDef = readableId ? READABLE_DEF_BY_ID[readableId] : null;
  const title = String((readableDef && localize(readableDef, "title")) || entry.title || "");
  const text = String((readableDef && localize(readableDef, "story")) || entry.text || "");

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
          <div className="readable-content" ref={contentRef}>
            <div className="readable-text" dangerouslySetInnerHTML={{ __html: `<strong id="readable-title">${title}</strong>${text.replace(/\n/g, "<br/>")}` }} />
          </div>

          <div className="readable-controls">
            {spreadCount > 1 && (
              <div className="readable-pagination" aria-label={language === "da" ? "Sidenavigation" : "Page navigation"}>
                <button
                  type="button"
                  onClick={() => setSpread((current) => Math.max(0, current - 1))}
                  disabled={spread === 0}
                  aria-label={language === "da" ? "Forrige opslag" : "Previous spread"}
                >
                  ‹
                </button>
                <span>{spread + 1} / {spreadCount}</span>
                <button
                  type="button"
                  onClick={() => setSpread((current) => Math.min(spreadCount - 1, current + 1))}
                  disabled={spread >= spreadCount - 1}
                  aria-label={language === "da" ? "Næste opslag" : "Next spread"}
                >
                  ›
                </button>
              </div>
            )}
            <button type="button" onClick={onClose}>{t("ui.close")}</button>
          </div>
        </div>
      </section>
    </div>
  );
}
