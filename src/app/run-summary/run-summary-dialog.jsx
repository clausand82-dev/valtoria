import React from "react";
import { useLocalization } from "../../i18n/index.js";
import { localizeItemField } from "../../i18n/item-localization.js";
import { getMonsterDisplayName } from "../../i18n/beast/monster-localization.js";
import { QUEST_DEFS } from "../../game/config/quest-config.js";
import "./run-summary.css";

const entries = (record = {}) => Object.entries(record).sort((a, b) => b[1] - a[1]);

function CountList({ values, empty = "None" }) {
  const rows = entries(values);
  if (!rows.length) return <p className="run-summary-empty">{empty}</p>;
  return <ul className="run-summary-list">{rows.map(([label, count]) => <li key={label}><span>{label}</span><strong>{count}</strong></li>)}</ul>;
}

function rarityClass(rarity) {
  return `run-summary-rarity-${String(rarity ?? "normal").replace(/[^a-z0-9_-]/gi, "").toLowerCase()}`;
}

function ItemList({ values, empty, localize, markers = true, rarity = true, t }) {
  const rows = Object.values(values ?? {}).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  if (!rows.length) return <p className="run-summary-empty">{empty}</p>;
  return <ul className="run-summary-list run-summary-item-list">{rows.map((item, index) => (
    <li key={`${item.label}-${item.rarity}-${index}`} className={rarity ? rarityClass(item.rarity) : "run-summary-plain-item"}>
      <span>{localizeItemField(item.item ?? item, "name", localize) || item.label}{markers && item.unique ? ` (${t("runSummary.item.unique")})` : markers && item.named ? ` (${t("runSummary.item.named")})` : ""}</span><strong>{item.count}</strong>
    </li>
  ))}</ul>;
}

function durationText(summary, t) {
  const seconds = Math.max(0, Math.round((summary.endedAt - summary.startedAt) / 1000));
  const minutes = Math.floor(seconds / 60);
  return minutes ? t("runSummary.duration.minutes", { minutes, seconds: seconds % 60 }) : t("runSummary.duration.seconds", { seconds });
}

export function RunSummaryDialog({ summary, onClose }) {
  const { language, localize, t } = useLocalization();
  if (!summary) return null;
  const consequences = [];
  if (!summary.regionCleared) consequences.push(t("runSummary.consequence.notCleared"));
  if (summary.remainingMobs > 0) consequences.push(t("runSummary.consequence.enemiesLeft", { count: summary.remainingMobs }));
  const unfinishedActions = Math.max(0, summary.actionsAvailable - summary.actionsCompleted);
  if (unfinishedActions > 0) consequences.push(t("runSummary.consequence.actionsLeft", { count: unfinishedActions, total: summary.actionsAvailable }));
  if (summary.runtimeCleared) consequences.push(t("runSummary.consequence.runtimeCleared"));
  const outcome = summary.earlyExit
    ? t("runSummary.outcome.earlyExit")
    : summary.regionCleared ? t("runSummary.outcome.completed") : t("runSummary.outcome.returned");
  const regionLabel = localize({ label: summary.regionLabel, i18n: summary.regionI18n }, "label") || summary.regionLabel;

  return (
    <div className="run-summary-overlay" role="presentation">
      <section className="run-summary-dialog" role="dialog" aria-modal="true" aria-labelledby="run-summary-title">
        <header className="run-summary-header">
          <p className="run-summary-kicker">{t("runSummary.title")}</p>
          <h2 id="run-summary-title">{regionLabel}</h2>
        </header>
        <div className="run-summary-scroll">
          <div className="run-summary-status">
            <div className={`run-summary-outcome ${summary.earlyExit ? "is-early" : "is-complete"}`}>{outcome}</div>
            <p className="run-summary-duration">{t("runSummary.duration", { duration: durationText(summary, t) })}</p>
          </div>

          <div className="run-summary-totals">
            <article><span>{t("runSummary.xpGained")}</span><strong>{summary.xpGained}</strong></article>
            <article><span>{t("runSummary.goldFound")}</span><strong>{summary.goldGained}</strong></article>
            <article><span>{t("runSummary.enemiesDefeated")}</span><strong>{entries(summary.kills).reduce((sum, row) => sum + row[1], 0)} / {summary.monstersSpawned}</strong></article>
          </div>

          <section className="run-summary-energy" aria-label={t("runSummary.energyGained")}>
            <div className="run-summary-energy-side run-summary-energy-lydra"><span>Ly'dra'thot</span><strong>+{Number(summary.lydraGained ?? 0).toFixed(2)}</strong></div>
            <div className="run-summary-energy-divider" aria-hidden="true">◆</div>
            <div className="run-summary-energy-side run-summary-energy-netdra"><span>Net'dra'thot</span><strong>+{Number(summary.netdraGained ?? 0).toFixed(2)}</strong></div>
          </section>

          <div className="run-summary-grid">
            <section className="run-summary-section"><h3>{t("runSummary.resourcesFound")}</h3><ItemList values={summary.resources} empty={t("runSummary.none")} localize={localize} markers={false} rarity={false} t={t} /></section>
            <section className="run-summary-section"><h3>{t("runSummary.questItems")}</h3><ItemList values={summary.questItems} empty={t("runSummary.none")} localize={localize} markers={false} rarity={false} t={t} /></section>
            <section className="run-summary-section"><h3>{t("runSummary.itemsCollected")}</h3><ItemList values={summary.itemsCollected} empty={t("runSummary.none")} localize={localize} t={t} /></section>
            <section className="run-summary-section"><h3>{t("runSummary.itemsLeft")}</h3><ItemList values={summary.itemsLeftBehind} empty={t("runSummary.none")} localize={localize} t={t} /></section>
            <section className="run-summary-section"><h3>{t("runSummary.combat")}</h3><CountList values={Object.fromEntries(entries(summary.kills).map(([type, count]) => [getMonsterDisplayName(type, language), count]))} empty={t("runSummary.noEnemiesDefeated")} /></section>
            <section className="run-summary-section">
              <h3>{t("runSummary.worldInteractions")}</h3>
              <p>{t("runSummary.objectsDestroyed")} <strong>{summary.objectsDestroyed} / {summary.objectsAvailable}</strong></p>
              <p>{t("runSummary.actionsCompleted")} <strong>{summary.actionsCompleted} / {summary.actionsAvailable}</strong></p>
              {summary.actions.map((action) => <p key={action.label}>{t(`runSummary.action.${action.label.toLowerCase()}`)} <strong>{action.completed} / {action.available}</strong></p>)}
            </section>
            <section className="run-summary-section run-summary-wide">
              <h3>{t("runSummary.questProgress")}</h3>
              {summary.questProgress.length ? <ul className="run-summary-list">{summary.questProgress.map((quest) => <li key={quest.title}><span>{localize(QUEST_DEFS[quest.questId], "title") || quest.title}</span><strong>+{quest.gained}</strong></li>)}</ul> : <p className="run-summary-empty">{t("runSummary.noQuestProgress")}</p>}
            </section>
          </div>

          {summary.earlyExit && <section className="run-summary-consequences"><h3>{t("runSummary.unfinished")}</h3><ul>{consequences.map((text) => <li key={text}>{text}</li>)}</ul></section>}
        </div>
        <footer className="run-summary-footer"><button type="button" onClick={onClose}>{t("runSummary.continue")}</button></footer>
      </section>
    </div>
  );
}
