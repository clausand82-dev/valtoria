import React from "react";

export function ReadableDialog({ entry, onClose }) {
  if (!entry) return null;
  return (
    <div className="confirm-backdrop" role="presentation">
      <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="readable-title">
        <h2 id="readable-title">{entry.title}</h2>
        <p>{entry.text}</p>
        {entry.questStarted && <p><b>Quest startet:</b> {entry.questStarted.title}</p>}
        <div>
          <button type="button" onClick={onClose}>Close</button>
        </div>
      </section>
    </div>
  );
}
