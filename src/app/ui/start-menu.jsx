import React, { useState } from "react";
import { formatSaveTimestamp } from "../save/save-slots.js";
import { useLocalization } from "../../i18n/index.js";

export function StartMenu({ view, saveSlots, onNewGame, onLoadClick, onBack, onLoadGame, onDeleteSave }) {
  const { t } = useLocalization();
  const hasSaves = saveSlots.some((slot) => slot.exists);
  const [menuImageLoaded, setMenuImageLoaded] = useState(false);
  const [confirmNewGameOpen, setConfirmNewGameOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  return (
    <section className={`start-menu-screen ${menuImageLoaded ? "has-menu-image" : ""}`} aria-label={t("menu.main")}>
      <img
        className="start-menu-bg"
        src="/assets/generated/menu.png"
        alt=""
        aria-hidden="true"
        onLoad={() => setMenuImageLoaded(true)}
        onError={() => setMenuImageLoaded(false)}
      />
      <div className="start-menu-panel">
        {!menuImageLoaded && <h1>Valtoria</h1>}
        {view === "main" && (
          <nav className="start-menu-actions" aria-label={t("menu.main")}>
            <button type="button" onClick={() => setConfirmNewGameOpen(true)}>{t("menu.newGame")}</button>
            <button type="button" onClick={onLoadClick} disabled={!hasSaves}>{t("menu.loadGame")}</button>
            <button type="button" disabled>{t("menu.gameSettings")}</button>
          </nav>
        )}
        {view === "load" && (
          <div className="load-menu">
            <div className="load-menu-head">
              <button type="button" onClick={onBack}>{t("ui.back")}</button>
              <span>{t("menu.chooseSave")}</span>
            </div>
            <div className="save-slot-list">
              {saveSlots.filter((slot) => slot.exists).map((slot) => (
                <div className="save-slot-row" key={slot.id}>
                  <button
                    type="button"
                    className="save-slot-load"
                    onClick={() => onLoadGame(slot)}
                  >
                    <b>{slot.label}</b>
                    <span>
                      {t("menu.saveSummary", { level: slot.level, gold: slot.gold, quests: slot.activeQuestCount, updatedAt: formatSaveTimestamp(slot.updatedAt) })}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="save-slot-delete danger-action"
                    onClick={() => setDeleteCandidate(slot)}
                    aria-label={t("menu.deleteSaveLabel", { name: slot.label })}
                  >
                    {t("ui.delete")}
                  </button>
                </div>
              ))}
              {!hasSaves && <p>{t("menu.noSaves")}</p>}
            </div>
          </div>
        )}

        {confirmNewGameOpen && (
          <div className="confirm-backdrop" role="presentation">
            <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="new-game-confirm-title">
              <h2 id="new-game-confirm-title">{t("menu.startNewGameTitle")}</h2>
              <p>{t("menu.startNewGamePrompt")}</p>
              <div>
                <button type="button" onClick={() => setConfirmNewGameOpen(false)}>
                  {t("ui.no")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmNewGameOpen(false);
                    onNewGame();
                  }}
                >
                  {t("menu.startNewGameConfirm")}
                </button>
              </div>
            </section>
          </div>
        )}

        {deleteCandidate && (
          <div className="confirm-backdrop" role="presentation">
            <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-save-confirm-title">
              <h2 id="delete-save-confirm-title">{t("menu.deleteSaveTitle")}</h2>
              <p>{t("menu.deleteSavePrompt", { name: deleteCandidate.label })}</p>
              <div>
                <button type="button" onClick={() => setDeleteCandidate(null)}>
                  {t("ui.cancel")}
                </button>
                <button
                  type="button"
                  className="danger-action"
                  onClick={() => {
                    onDeleteSave?.(deleteCandidate);
                    setDeleteCandidate(null);
                  }}
                >
                  {t("menu.deleteSaveConfirm")}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </section>
  );
}
