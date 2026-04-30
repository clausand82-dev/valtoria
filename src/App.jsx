import React, { useEffect, useMemo, useRef, useState } from "react";
import { MAX_INVENTORY } from "./game/data.js";
import { GameEngine } from "./game/GameEngine.js";

const emptySnapshot = {
  player: {
    level: 1,
    hp: 1,
    maxHp: 1,
    mana: 1,
    maxMana: 1,
    xp: 0,
    nextXp: 1,
    gold: 0,
    damage: "0-0",
    armor: 0,
    mode: "melee",
  },
  zone: { name: "Stonewake Wilds", level: 1, seed: 7341 },
  region: { name: "Stonewake Wilds", index: 1, seed: 7341 },
  exitPrompt: false,
  inventory: [],
  equipment: [],
  hoverMonster: null,
  quickActions: { healthPotions: 0, manaPotions: 0, potionCooldown: 0 },
  toasts: [],
};

export default function App() {
  const canvasRef = useRef(null);
  const minimapRef = useRef(null);
  const engineRef = useRef(null);
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [destroyConfirmItem, setDestroyConfirmItem] = useState(null);

  useEffect(() => {
    const engine = new GameEngine(canvasRef.current, setSnapshot);
    engineRef.current = engine;
    engine.start();
    return () => {
      engine.stop();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const handleKey = (event) => {
      const key = event.key.toLowerCase();
      if (key === "i") setInventoryOpen((value) => !value);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    engineRef.current?.renderMinimap(minimapRef.current);
  }, [snapshot]);

  useEffect(() => {
    if (!inventoryOpen) {
      setDestroyConfirmItem(null);
      setSelectedItem(null);
    }
  }, [inventoryOpen]);

  const selectedDetails = useMemo(() => {
    if (!selectedItem) {
      return null;
    }

    const comparisonItem = findEquippedComparison(selectedItem, snapshot.equipment);
    const diffs = comparisonItem ? getItemDiffs(selectedItem, comparisonItem) : [];

    return (
      <div className="item-detail">
        <b className={selectedItem.rarity}>{selectedItem.name}</b>
        {selectedItem.mode === "potion" && selectedItem.count > 1 && <em>Stack: {selectedItem.count} / 5</em>}
        <span>{selectedItem.summary}</span>
        {comparisonItem && diffs.length > 0 && (
          <div className="comparison-list">
            {diffs.map((diff) => (
              <span className={diff.good ? "diff-good" : "diff-bad"} key={diff.label}>
                {diff.good ? "+" : "-"} {diff.label} {diff.text}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }, [selectedItem, snapshot.equipment]);

  const player = snapshot.player;
  const hpPct = Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));
  const manaPct = Math.max(0, Math.min(100, (player.mana / player.maxMana) * 100));
  const xpPct = Math.max(0, Math.min(100, (player.xp / player.nextXp) * 100));
  const hoverMonster = snapshot.hoverMonster;
  const monsterHpPct = hoverMonster
    ? Math.max(0, Math.min(100, (hoverMonster.hp / hoverMonster.maxHp) * 100))
    : 0;
  const destroyItem = (item) => {
    if (item.rarity === "legendary" || item.rarity === "unique") {
      setDestroyConfirmItem(item);
      return;
    }
    engineRef.current?.destroyInventoryItem(item.index, true);
  };

  return (
    <main className="game-shell">
      <canvas ref={canvasRef} className="game-canvas" aria-label="Runebound Depths isometric game" />

      <section className="hud hud-left" aria-live="polite">
        <div className="portrait">
          <div className="portrait-head" />
          <b>{player.level}</b>
        </div>
        <div className="resource-stack">
          <ResourceBar type="health" value={hpPct} label={`${player.hp} / ${player.maxHp}`} />
          <ResourceBar type="mana" value={manaPct} label={`${player.mana} / ${player.maxMana}`} />
          <ResourceBar type="xp" value={xpPct} label={`${player.xp} / ${player.nextXp} xp`} />
        </div>
        <div className="stat-chip">
          <span>Guld</span>
          <b>{player.gold}</b>
        </div>
      </section>

      <section className="hud hud-right">
        <div className="zone-panel">
          <b>{snapshot.zone.name}</b>
          <span>
            Seed {snapshot.zone.seed} | Omraade L{snapshot.zone.level}
          </span>
        </div>
        <canvas ref={minimapRef} className="minimap" width="154" height="154" aria-label="Minimap" />
      </section>

      {hoverMonster && (
        <section className="monster-hover-card" aria-live="polite">
          <div>
            <span>L{hoverMonster.level}</span>
            <b>{hoverMonster.name}</b>
          </div>
          <ResourceBar type="monster-health" value={monsterHpPct} label={`${hoverMonster.hp} / ${hoverMonster.maxHp}`} />
        </section>
      )}

      <section className="combat-card">
        <span>Skade {player.damage}</span>
        <span>Armor {player.armor}</span>
        <span>{player.mode}</span>
      </section>

      <section className="skillbar">
        <button
          type="button"
          className="quick-potion"
          title="Health potion"
          disabled={!snapshot.quickActions.healthPotions || snapshot.quickActions.potionCooldown > 0}
          onClick={() => engineRef.current?.usePotion("health")}
        >
          <InventoryIcon iconIndex={4} iconSheet="items" />
          <b>{snapshot.quickActions.healthPotions}</b>
        </button>
        <button
          type="button"
          className="quick-potion"
          title="Mana potion"
          disabled={!snapshot.quickActions.manaPotions || snapshot.quickActions.potionCooldown > 0}
          onClick={() => engineRef.current?.usePotion("mana")}
        >
          <InventoryIcon iconIndex={3} iconSheet="items" />
          <b>{snapshot.quickActions.manaPotions}</b>
        </button>
        <button type="button" className="skill active" title="Angrib" onClick={() => engineRef.current?.primaryAttack()}>
          <span className="sword-icon" />
        </button>
        <button
          type="button"
          className="skill"
          title="Kast magi"
          onClick={() => {
            const engine = engineRef.current;
            if (engine) engine.castSpellAt(engine.pointer.worldX, engine.pointer.worldY);
          }}
        >
          <span className="spell-icon" />
        </button>
        <button type="button" className="skill" title="Rygsaek" onClick={() => setInventoryOpen((value) => !value)}>
          <span className="bag-icon" />
        </button>
      </section>

      {inventoryOpen && (
        <aside className="inventory-panel" onMouseLeave={() => setSelectedItem(null)}>
          <header>
            <div>
              <h1>Rygsaek</h1>
              <span>
                {snapshot.inventory.length} / {MAX_INVENTORY}
              </span>
            </div>
            <button type="button" className="close-button" onClick={() => setInventoryOpen(false)} title="Luk">
              x
            </button>
          </header>

          <div className="equipment-grid">
            {snapshot.equipment.map((slot) => (
              <button
                type="button"
                className={`equipment-slot equipment-${slot.id} ${slot.item ? "equipped" : "empty"}`}
                style={{ "--item-quality": slot.item?.rarityColor ?? "rgba(255,255,255,0.16)" }}
                key={slot.id}
                onMouseEnter={() => setSelectedItem(slot.item)}
                onFocus={() => setSelectedItem(slot.item)}
              >
                <span className="equipment-icon" aria-hidden="true">
                  {slot.item ? (
                    <InventoryIcon iconIndex={slot.item.iconIndex} iconSheet={slot.item.iconSheet} iconUrl={slot.item.iconUrl} />
                  ) : (
                    <i />
                  )}
                </span>
                <span className="equipment-label">{slot.label}</span>
                <b className={slot.item?.rarity ?? ""}>{slot.item?.name ?? "Empty"}</b>
              </button>
            ))}
          </div>

          <div className="item-grid">
            {snapshot.inventory.map((item) => (
              <article
                className={`item-card ${item.rarity}`}
                style={{ "--item-quality": item.rarityColor ?? "rgba(255,255,255,0.16)" }}
                key={item.id}
                onMouseEnter={() => setSelectedItem(item)}
                onFocus={() => setSelectedItem(item)}
                onClick={() => engineRef.current?.equipItem(item.index)}
                tabIndex={0}
              >
                <button
                  type="button"
                  className="corner-action drop-action"
                  title="Drop"
                  onClick={(event) => {
                    event.stopPropagation();
                    engineRef.current?.dropInventoryItem(item.index);
                  }}
                >
                  D
                </button>
                <button
                  type="button"
                  className="corner-action destroy-action"
                  title="Destroy"
                  onClick={(event) => {
                    event.stopPropagation();
                    destroyItem(item);
                  }}
                >
                  X
                </button>
                <InventoryIcon iconIndex={item.iconIndex} iconSheet={item.iconSheet} iconUrl={item.iconUrl} />
                {item.mode === "potion" && item.count > 1 && <b className="stack-count">{item.count}</b>}
                <span>
                  {item.rarityLabel} | L{item.level} | {item.value}g
                </span>
                {item.canMerge && (
                  <button
                    type="button"
                    className="corner-action merge-action"
                    title="Merge"
                    onClick={(event) => {
                      event.stopPropagation();
                      engineRef.current?.mergeInventoryItem(item.index);
                    }}
                  >
                    M
                  </button>
                )}
              </article>
            ))}
          </div>

        </aside>
      )}

      {inventoryOpen && selectedDetails && (
        <aside className="item-hover-panel" aria-live="polite">
          {selectedDetails}
        </aside>
      )}

      <div className="toast-stack">
        {snapshot.toasts.map((toast) => (
          <div className="toast" key={toast.id}>
            {toast.text}
          </div>
        ))}
      </div>

      {destroyConfirmItem && (
        <div className="confirm-backdrop" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="destroy-title">
            <h2 id="destroy-title">Destroy red item?</h2>
            <p>{destroyConfirmItem.name} forsvinder permanent.</p>
            <div>
              <button type="button" onClick={() => setDestroyConfirmItem(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="danger-action"
                onClick={() => {
                  const current = snapshot.inventory.find((item) => item.id === destroyConfirmItem.id);
                  if (current) engineRef.current?.destroyInventoryItem(current.index, true);
                  setDestroyConfirmItem(null);
                }}
              >
                Destroy
              </button>
            </div>
          </section>
        </div>
      )}

      {snapshot.exitPrompt && (
        <div className="confirm-backdrop" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="region-exit-title">
            <h2 id="region-exit-title">Rejs videre?</h2>
            <p>Du har fundet udgangen fra {snapshot.region.name}. Fortsaet til naeste region?</p>
            <div>
              <button type="button" onClick={() => engineRef.current?.dismissExitPrompt()}>
                Bliv her
              </button>
              <button type="button" onClick={() => engineRef.current?.travelToNextRegion()}>
                Rejs videre
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function ResourceBar({ type, value, label }) {
  return (
    <div className={`resource ${type}`}>
      <span style={{ width: `${value}%` }} />
      <b>{label}</b>
    </div>
  );
}

const iconSheetPromises = new Map();

function InventoryIcon({ iconIndex, iconSheet = "items", iconUrl = null }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const source = iconUrl || (iconSheet === "armor" ? "/assets/generated/armor001_sheet.png" : "/assets/generated/items001_sheet.png");
    if (!iconSheetPromises.has(source)) {
      iconSheetPromises.set(source, new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = source;
      }));
    }

    iconSheetPromises.get(source).then((image) => {
      if (cancelled || !canvasRef.current) return;
      if (iconUrl) {
        drawCustomInventoryIcon(canvasRef.current, image);
      } else {
        drawInventoryIcon(canvasRef.current, image, iconIndex);
      }
    }).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [iconIndex, iconSheet, iconUrl]);

  return <canvas ref={canvasRef} className="inventory-icon" width="52" height="52" aria-hidden="true" />;
}

function drawCustomInventoryIcon(canvas, image) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const scale = Math.min((canvas.width - 8) / image.naturalWidth, (canvas.height - 8) / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
}

function drawInventoryIcon(canvas, image, iconIndex) {
  const ctx = canvas.getContext("2d");
  const cols = 4;
  const rows = 3;
  const col = Math.abs(iconIndex ?? 0) % cols;
  const row = Math.floor(Math.abs(iconIndex ?? 0) / cols) % rows;
  const sx = Math.round((col * image.naturalWidth) / cols);
  const sy = Math.round((row * image.naturalHeight) / rows);
  const nextX = Math.round(((col + 1) * image.naturalWidth) / cols);
  const nextY = Math.round(((row + 1) * image.naturalHeight) / rows);
  const cellW = nextX - sx;
  const cellH = nextY - sy;

  const temp = document.createElement("canvas");
  temp.width = cellW;
  temp.height = cellH;
  const tctx = temp.getContext("2d", { willReadFrequently: true });
  tctx.drawImage(image, sx, sy, cellW, cellH, 0, 0, cellW, cellH);
  const imageData = tctx.getImageData(0, 0, cellW, cellH);
  const data = imageData.data;
  let minX = cellW;
  let minY = cellH;
  let maxX = 0;
  let maxY = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (g > 145 && g > r * 1.55 && g > b * 1.55) data[i + 3] = 0;
    if (data[i + 3] > 45) {
      const p = i / 4;
      const x = p % cellW;
      const y = Math.floor(p / cellW);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  tctx.putImageData(imageData, 0, 0);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (maxX <= minX || maxY <= minY) return;
  const sourceW = maxX - minX + 1;
  const sourceH = maxY - minY + 1;
  const scale = Math.min((canvas.width - 8) / sourceW, (canvas.height - 8) / sourceH);
  const width = sourceW * scale;
  const height = sourceH * scale;
  ctx.drawImage(temp, minX, minY, sourceW, sourceH, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
}

function findEquippedComparison(item, equipment) {
  if (!item || item.index === undefined) return null;
  let slotId = item.slot;
  if (slotId === "ring") {
    const ring1 = equipment.find((slot) => slot.id === "ring1")?.item;
    const ring2 = equipment.find((slot) => slot.id === "ring2")?.item;
    return ring1 || ring2 || null;
  }
  return equipment.find((slot) => slot.id === slotId)?.item ?? null;
}

function getItemDiffs(item, equipped) {
  const rows = [
    diffNumber("Skade min", item.damageMin, equipped.damageMin),
    diffNumber("Skade max", item.damageMax, equipped.damageMax),
    diffNumber("Armor", item.armor, equipped.armor),
    diffNumber("Liv", item.maxHp, equipped.maxHp),
    diffNumber("Mana", item.maxMana, equipped.maxMana),
    diffNumber("Magi", item.magic, equipped.magic),
    diffNumber("Fart", item.speed, equipped.speed, { decimals: 2 }),
    diffNumber("Range", item.range, equipped.range, { decimals: 2 }),
    diffNumber("Cooldown", item.cooldown, equipped.cooldown, { decimals: 2, lowerIsBetter: true }),
  ];
  return rows.filter(Boolean);
}

function diffNumber(label, next, current, options = {}) {
  const decimals = options.decimals ?? 0;
  const diff = Number(next || 0) - Number(current || 0);
  if (Math.abs(diff) < 0.005) return null;
  const good = options.lowerIsBetter ? diff < 0 : diff > 0;
  return {
    label,
    good,
    text: Math.abs(diff).toFixed(decimals),
  };
}
