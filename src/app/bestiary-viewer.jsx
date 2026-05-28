import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  bestiaryRegionRows,
  bestiarySpriteSheet,
  bestiaryStatRows,
  getBestiaryEntries,
} from "../game/bestiary.js";

const STAGE_LABELS = {
  unknown: "Ukendt",
  seen: "Set",
  fought: "Bekaempet",
  killed: "Draebt",
};

function MonsterSpriteCanvas({ monsterId, seen }) {
  const canvasRef = useRef(null);
  const sheet = useMemo(() => seen ? bestiarySpriteSheet(monsterId) : null, [monsterId, seen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sheet?.url) return undefined;
    const ctx = canvas.getContext("2d");
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const frameW = image.width / Math.max(1, sheet.cols || 1);
      const frameH = image.height / Math.max(1, sheet.rows || 1);
      const scale = Math.min((canvas.width - 12) / frameW, (canvas.height - 12) / frameH);
      const w = frameW * scale;
      const h = frameH * scale;
      ctx.drawImage(image, 0, 0, frameW, frameH, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    };
    image.onerror = () => {
      if (cancelled) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    image.src = sheet.url;
    return () => { cancelled = true; };
  }, [sheet]);

  if (!seen || !sheet?.url) return <div className="bestiary-sprite-placeholder">?</div>;
  return <canvas ref={canvasRef} className="bestiary-sprite" width={72} height={72} aria-hidden="true" />;
}

function BestiaryBookModal({ entry, onClose }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!entry) return null;
  const { def, discovery, id, stage, stats } = entry;
  const library = def.library ?? {};
  const seen = stage !== "unknown";
  const fought = stage === "fought" || stage === "killed";
  const killed = stage === "killed";
  const statRows = bestiaryStatRows(stats);
  const regionRows = bestiaryRegionRows(discovery);
  const loreText = String(library.text ?? "Feltstudierne er endnu sparsomme, men vaesenet er nu identificeret.").trim();

  return (
    <div className="confirm-backdrop" role="presentation">
      <section
        className="confirm-dialog readable-dialog bestiary-book-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bestiary-title"
      >
        <img src="/assets/generated/lorebook.png" alt="" className="readable-frame" draggable="false" />
        <div className="readable-overlay bestiary-book-overlay">
          <div className="bestiary-book-spread">
            <article className="bestiary-book-page">
              {!seen ? (
                <>
                  <h4 id="bestiary-title">Ukendt vaesen</h4>
                  <p>Denne side er laast. Find vaesenet i vildmarken for at begynde noterne.</p>
                </>
              ) : (
                <>
                  <header className="bestiary-detail-header">
                    <MonsterSpriteCanvas monsterId={id} seen={seen} />
                    <div>
                      <h4 id="bestiary-title">{entry.title}</h4>
                      <span>{STAGE_LABELS[stage]}</span>
                      {discovery.lastSeenRegionId && <small>Set i: {discovery.lastSeenRegionId}</small>}
                    </div>
                  </header>
                  {!fought && <p>Vaesenet er observeret, men detaljerede kampnoter mangler stadig.</p>}
                  {fought && (
                    <>
                      <p>{loreText}</p>
                      {library.habitatText && <p><b>Habitat:</b> {library.habitatText}</p>}
                      {Array.isArray(library.strengths) && library.strengths.length > 0 && (
                        <div className="bestiary-chip-group">
                          <b>Styrker</b>
                          {library.strengths.map((item) => <span key={item}>{item}</span>)}
                        </div>
                      )}
                      {Array.isArray(library.weaknesses) && library.weaknesses.length > 0 && (
                        <div className="bestiary-chip-group weak">
                          <b>Svagheder</b>
                          {library.weaknesses.map((item) => <span key={item}>{item}</span>)}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </article>
            <article className="bestiary-book-page">
              <h4>Feltdata</h4>
              {!seen && <p>Ingen feltdata endnu.</p>}
              {seen && !fought && <p>Stats og kampdata laases op efter foerste kamp.</p>}
              {fought && (
                <div className="bestiary-stat-grid">
                  {statRows.map((row) => (
                    <span key={row.key}><b>{row.label}</b>{row.value}</span>
                  ))}
                </div>
              )}
              {seen && regionRows.length > 0 && (
                <>
                  <h5>Set regioner</h5>
                  <div className="bestiary-region-list">
                    {regionRows.map((row) => <span key={row.regionId}>{row.regionId}: {row.count}</span>)}
                  </div>
                </>
              )}
              {killed && (
                <>
                  <h5>Drab</h5>
                  <div className="bestiary-stat-grid">
                    <span><b>Normal</b>{discovery.killedNormal ?? 0}</span>
                    <span><b>Elite</b>{discovery.killedElite ?? 0}</span>
                    <span><b>Boss</b>{discovery.killedBoss ?? 0}</span>
                    <span><b>Max level</b>{discovery.maxLevelKilled ?? 0}</span>
                  </div>
                </>
              )}
            </article>
          </div>
          <div className="readable-controls">
            <div />
            <button type="button" onClick={onClose}>Close</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function BestiaryViewer({ worldState }) {
  const entries = useMemo(() => getBestiaryEntries(worldState), [worldState]);
  const [openEntryId, setOpenEntryId] = useState(null);
  const openEntry = entries.find((entry) => entry.id === openEntryId) ?? null;

  return (
    <section className="blacksmith-station bestiary-panel">
      <header>
        <h4>Bestiary</h4>
        <span>{entries.length} vaesener fra monster-config</span>
      </header>
      <div className="bestiary-list" role="listbox" aria-label="Bestiary entries">
        {entries.map((entry) => {
          const seen = entry.stage !== "unknown";
          return (
            <button
              type="button"
              key={entry.id}
              className={`bestiary-entry ${entry.stage}`}
              onClick={() => setOpenEntryId(entry.id)}
            >
              <MonsterSpriteCanvas monsterId={entry.id} seen={seen} />
              <span>{entry.title}</span>
              <b>{STAGE_LABELS[entry.stage]}</b>
            </button>
          );
        })}
      </div>
      {openEntry && <BestiaryBookModal entry={openEntry} onClose={() => setOpenEntryId(null)} />}
    </section>
  );
}
