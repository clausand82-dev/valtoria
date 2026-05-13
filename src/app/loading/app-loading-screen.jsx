import React from "react";

export function AppLoadingScreen({ state }) {
  const percent = Math.max(0, Math.min(100, Math.round(Number(state?.percent) || 0)));
  return (
    <section className="app-loading-screen" role="status" aria-live="polite" aria-label="Loading">
      <div className="app-loading-copy">
        <b>{state?.title ?? "Loading"}</b>
        <span>{state?.label ?? "Preparing game..."}</span>
        {state?.error && <em>{state.error}</em>}
      </div>
      <div className="app-loading-bar" aria-hidden="true">
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className="app-loading-meta">
        <span>{state?.detail ?? ""}</span>
        <b>{percent}%</b>
      </div>
    </section>
  );
}
