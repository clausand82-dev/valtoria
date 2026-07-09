import React from "react";
import "./app-loading-screen.css";
import { useLocalization } from "../../i18n/index.js";

export function AppLoadingScreen({ state }) {
  const { t } = useLocalization();
  const percent = Math.max(0, Math.min(100, Math.round(Number(state?.percent) || 0)));
  return (
    <section className="app-loading-screen" role="status" aria-live="polite" aria-label={t("loading.title")}>
      <div className="app-loading-copy">
        <b>{state?.title ?? t("loading.title")}</b>
        <span>{state?.label ?? t("loading.preparingGame")}</span>
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
