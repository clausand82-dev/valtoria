import React, { useState } from "react";
import { formatSaveTimestamp } from "../save/save-slots.js";

export function StartMenu({ view, saveSlots, onNewGame, onLoadClick, onBack, onLoadGame, onDeleteSave }) {
  const hasSaves = saveSlots.some((slot) => slot.exists);
  const [menuImageLoaded, setMenuImageLoaded] = useState(false);
  const [confirmNewGameOpen, setConfirmNewGameOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  return (
    <section className={`start-menu-screen ${menuImageLoaded ? "has-menu-image" : ""}`} aria-label="Valtoria start menu">
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
          <nav className="start-menu-actions" aria-label="Main menu">
            <button type="button" onClick={() => setConfirmNewGameOpen(true)}>New Game</button>
            <button type="button" onClick={onLoadClick} disabled={!hasSaves}>Load Game</button>
            <button type="button" disabled>Game Setting</button>
          </nav>
        )}
        {view === "load" && (
          <div className="load-menu">
            <div className="load-menu-head">
              <button type="button" onClick={onBack}>Back</button>
              <span>Choose save</span>
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
                      Level {slot.level} | Gold {slot.gold} | Quests {slot.activeQuestCount} | {formatSaveTimestamp(slot.updatedAt)}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="save-slot-delete danger-action"
                    onClick={() => setDeleteCandidate(slot)}
                    aria-label={`Delete ${slot.label}`}
                  >
                    Delete
                  </button>
                </div>
              ))}
              {!hasSaves && <p>Ingen saves fundet.</p>}
            </div>
          </div>
        )}

        {confirmNewGameOpen && (
          <div className="confirm-backdrop" role="presentation">
            <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="new-game-confirm-title">
              <h2 id="new-game-confirm-title">Start nyt spil?</h2>
              <p>Vil du starte et nyt spil nu?</p>
              <div>
                <button type="button" onClick={() => setConfirmNewGameOpen(false)}>
                  Nej
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmNewGameOpen(false);
                    onNewGame();
                  }}
                >
                  Ja, start nyt spil
                </button>
              </div>
            </section>
          </div>
        )}

        {deleteCandidate && (
          <div className="confirm-backdrop" role="presentation">
            <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-save-confirm-title">
              <h2 id="delete-save-confirm-title">Slet gem?</h2>
              <p>
                Du er ved at slette <b>{deleteCandidate.label}</b>. Denne handling kan ikke fortrydes.
              </p>
              <div>
                <button type="button" onClick={() => setDeleteCandidate(null)}>
                  Annuller
                </button>
                <button
                  type="button"
                  className="danger-action"
                  onClick={() => {
                    onDeleteSave?.(deleteCandidate);
                    setDeleteCandidate(null);
                  }}
                >
                  Ja, slet dette gem
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </section>
  );
}
