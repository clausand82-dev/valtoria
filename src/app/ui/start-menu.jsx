import React, { useState } from "react";
import { formatSaveTimestamp } from "../save/save-slots.js";

export function StartMenu({ view, saveSlots, onNewGame, onLoadClick, onBack, onLoadGame }) {
  const hasSaves = saveSlots.some((slot) => slot.exists);
  const [menuImageLoaded, setMenuImageLoaded] = useState(false);
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
            <button type="button" onClick={onNewGame}>New Game</button>
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
                <button
                  type="button"
                  className="save-slot-row"
                  key={slot.id}
                  onClick={() => onLoadGame(slot)}
                >
                  <b>{slot.label}</b>
                  <span>
                    Level {slot.level} | Gold {slot.gold} | Quests {slot.activeQuestCount} | {formatSaveTimestamp(slot.updatedAt)}
                  </span>
                </button>
              ))}
              {!hasSaves && <p>Ingen saves fundet.</p>}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
