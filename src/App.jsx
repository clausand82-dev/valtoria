import React, { useEffect, useMemo, useRef, useState } from "react";
import { MAX_INVENTORY, TILE_H, TILE_W } from "./game/data.js";
import { drawGroundTile, drawShadow, loadGeneratedAtlas } from "./game/assets-ground.js";
import { drawHero } from "./game/assets-hero.js";
import { loadAnimationSheets } from "./game/assets.js";
import { GameEngine } from "./game/GameEngine.js";
import { worldToIso, worldToScreen } from "./game/iso.js";
import { RESOURCE_DEFS } from "./game/config/resource-config.js";
import { CITY_BUILDINGS } from "./game/config/city-buildings-config.js";

const cityAssetCache = {
  promise: null,
  assets: null,
};

const CITY_STORAGE_KEY = "runebound-depths-city-v1";

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
    popularity: 0,
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

const INVENTORY_FILTERS = [
  { id: "all", label: "All", text: "*", color: "#f5f3ea" },
  { id: "merge", label: "Can merge", text: "M", color: "#f1c657" },
  { id: "resource", label: "Resources", text: "R", color: "#8be9ff" },
  { id: "poor", label: "Poor", text: "P", color: "#9a9a9a" },
  { id: "normal", label: "Normal", text: "N", color: "#f5f3ea" },
  { id: "upgraded", label: "Upgraded", text: "U", color: "#58d96d" },
  { id: "rare", label: "Rare", text: "G", color: "#ffd85d" },
  { id: "epic", label: "Epic", text: "E", color: "#b579ff" },
  { id: "legendary", label: "Legendary", text: "L", color: "#ff5757" },
  { id: "unique", label: "Unique", text: "Q", color: "#f1c657" },
];

export default function App() {
  const canvasRef = useRef(null);
  const minimapRef = useRef(null);
  const engineRef = useRef(null);
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [destroyConfirmItem, setDestroyConfirmItem] = useState(null);
  const [inventoryFilter, setInventoryFilter] = useState("all");
  const [mergeChoice, setMergeChoice] = useState(null);

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
      if (cityOpen) return;
      const key = event.key.toLowerCase();
      if (key === "i") setInventoryOpen((value) => !value);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [cityOpen]);

  useEffect(() => {
    engineRef.current?.setInputLocked(cityOpen);
    engineRef.current?.setPaused(cityOpen);
    if (cityOpen) {
      setInventoryOpen(false);
      setDestroyConfirmItem(null);
      setSelectedItem(null);
    }
    return () => {
      engineRef.current?.setInputLocked(false);
      engineRef.current?.setPaused(false);
    };
  }, [cityOpen]);

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
        <b className={selectedItem.mode === "resource" ? "resource-rarity" : selectedItem.rarity}>{selectedItem.name}</b>
        {selectedItem.mode === "resource" && <em>Stack: {selectedItem.count ?? 1} / {selectedItem.stackMax ?? "?"}</em>}
        {selectedItem.mode === "potion" && selectedItem.count > 1 && <em>Stack: {selectedItem.count}</em>}
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
  const popularityPct = Math.max(0, Math.min(100, player.popularity ?? 0));
  const hoverMonster = snapshot.hoverMonster;
  const monsterHpPct = hoverMonster
    ? Math.max(0, Math.min(100, (hoverMonster.hp / hoverMonster.maxHp) * 100))
    : 0;
  const inventorySlots = useMemo(() => (
    Array.from({ length: MAX_INVENTORY }, (_, index) => snapshot.inventory[index] ?? null)
  ), [snapshot.inventory]);
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
          <b>{player.level}</b>
        </div>
        <div className="resource-stack">
          <ResourceBar type="health" value={hpPct} label={`HP ${player.hp} / ${player.maxHp}`} />
          <ResourceBar type="mana" value={manaPct} label={`MANA ${player.mana} / ${player.maxMana}`} />
          <ResourceBar type="xp" value={xpPct} label={`XP ${player.xp} / ${player.nextXp}`} />
          <ResourceBar type="popularity" value={popularityPct} label={`POPULARITY ${Math.round(player.popularity ?? 0)}%`} />
        </div>
        <div className="stat-chip">
          <span>Guld</span>
          <b>{player.gold}</b>
        </div>
      </section>

      <section className="hud hud-right">
        <div className="zone-panel">
          <div className="zone-header">
            <b>{snapshot.zone.name}</b>
            <button
              type="button"
              className="city-toggle"
              aria-label="Aaben city page"
              title="Aaben city page"
              onClick={() => setCityOpen(true)}
            >
              <span className="house-icon" />
            </button>
          </div>
          <span>
            Seed {snapshot.zone.seed} | Omraade L{snapshot.zone.level}
          </span>
        </div>
        <canvas ref={minimapRef} className="minimap" width="154" height="154" aria-label="Minimap" />
      </section>

      {hoverMonster && (
        <section className="monster-hover-card" aria-live="polite">
          <div className="monster-hover-title">
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

          <div className="inventory-filter-bar" aria-label="Backpack visual filters">
            {INVENTORY_FILTERS.map((filter) => (
              <button
                type="button"
                className={`inventory-filter filter-${filter.id} ${inventoryFilter === filter.id ? "active" : ""}`}
                style={{ "--filter-color": filter.color }}
                key={filter.id}
                title={filter.label}
                onClick={() => setInventoryFilter(filter.id)}
              >
                <i aria-hidden="true" />
                <span>{filter.text}</span>
              </button>
            ))}
          </div>

          <div className="item-grid">
            {inventorySlots.map((item, slotIndex) => {
              if (!item) {
                return <article className="item-card empty-slot" key={`empty-${slotIndex}`} aria-hidden="true" />;
              }
              const dimmed = inventoryFilter !== "all" && !itemMatchesInventoryFilter(item, inventoryFilter);
              return (
                <article
                  className={`item-card ${item.rarity} ${item.mode === "resource" ? "resource-item" : ""} ${dimmed ? "filter-dimmed" : ""}`}
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
                  {(item.mode === "potion" || item.mode === "resource") && item.count > 1 && <b className="stack-count">{item.count}</b>}
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
                        const result = engineRef.current?.mergeInventoryItem(item.index);
                        if (result?.type === "resource-choice") setMergeChoice(result);
                      }}
                    >
                      M
                    </button>
                  )}
                </article>
              );
            })}
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

      {mergeChoice && (
        <MergeChoiceDialog
          choice={mergeChoice}
          onCancel={() => setMergeChoice(null)}
          onChoose={(output) => {
            const current = snapshot.inventory.find((item) => item.id === mergeChoice.itemId);
            if (current) engineRef.current?.mergeInventoryResourceWithRecipe(current.index, output);
            setMergeChoice(null);
          }}
        />
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

      {cityOpen && (
        <CityPage
          engineRef={engineRef}
          snapshot={snapshot}
          onClose={() => setCityOpen(false)}
        />
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

function MergeChoiceDialog({ choice, onCancel, onChoose }) {
  return (
    <div className="confirm-backdrop" role="presentation">
      <section className="confirm-dialog merge-choice-dialog" role="dialog" aria-modal="true" aria-labelledby="merge-choice-title">
        <h2 id="merge-choice-title">Choose merge result</h2>
        <p>This resource can be used in more than one recipe.</p>
        <div className="merge-choice-list">
          {choice.options.map((option) => (
            <button type="button" className="merge-choice-option" key={option.output} onClick={() => onChoose(option.output)}>
              <InventoryIcon iconIndex={option.iconIndex} iconSheet={option.iconSheet} />
              <span>
                <b>{option.name}</b>
                <em>{formatMergeInputs(option.inputs)}</em>
              </span>
            </button>
          ))}
        </div>
        <div>
          <button type="button" onClick={onCancel}>Cancel</button>
        </div>
      </section>
    </div>
  );
}

function formatMergeInputs(inputs) {
  return Object.entries(inputs)
    .map(([resourceId, count]) => `${count} ${RESOURCE_DEFS[resourceId]?.name ?? resourceId}`)
    .join(" + ");
}

function itemMatchesInventoryFilter(item, filter) {
  if (filter === "merge") return Boolean(item.canMerge);
  if (filter === "resource") return item.mode === "resource";
  if (filter === "unique") return item.unique || item.rarity === "unique";
  return item.mode !== "resource" && item.rarity === filter;
}

function CityPage({ engineRef, snapshot, onClose }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(0);
  const keysRef = useRef(new Set());
  const selectedBuildingRef = useRef(null);
  const activeMarkerRef = useRef(null);
  const nearbyBuildingRef = useRef(null);
  const [loadingCity, setLoadingCity] = useState(!cityAssetCache.assets);
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [nearbyBuildingId, setNearbyBuildingId] = useState(null);
  const [cityProgress, setCityProgress] = useState(loadCityProgress);
  const cityStateRef = useRef({
    layout: buildCityLayout(),
    heroGX: 0,
    heroGY: 0,
    facingX: 1,
    facingY: -1,
    facing: 1,
    walkClock: 0,
    heroReady: false,
    animationSheets: null,
    atlas: null,
    houseSprites: [],
    staticLayer: null,
    time: 0,
    gait: 0,
  });
  const cityProgressRef = useRef(cityProgress);

  useEffect(() => {
    cityProgressRef.current = cityProgress;
    saveCityProgress(cityProgress);
  }, [cityProgress]);

  useEffect(() => {
    selectedBuildingRef.current = selectedBuildingId;
  }, [selectedBuildingId]);

  useEffect(() => {
    let cancelled = false;
    loadCityAssets().then(({ atlas, animationSheets, houseSprites }) => {
      if (cancelled) return;
      cityStateRef.current.atlas = atlas;
      cityStateRef.current.animationSheets = animationSheets;
      cityStateRef.current.houseSprites = houseSprites;
      cityStateRef.current.heroReady = true;
      cityStateRef.current.staticLayer = null;
      setLoadingCity(false);
    }).catch(() => {
      if (cancelled) return;
      cityStateRef.current.heroReady = false;
      setLoadingCity(false);
    });

    const onKeyDown = (event) => {
      const key = event.key.toLowerCase();
      if (key === "escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (key === "e" && nearbyBuildingRef.current) {
        event.preventDefault();
        setSelectedBuildingId(nearbyBuildingRef.current);
        return;
      }
      keysRef.current.add(key);
    };

    const onKeyUp = (event) => {
      keysRef.current.delete(event.key.toLowerCase());
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const loop = (now) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        frameRef.current = requestAnimationFrame(loop);
        return;
      }
      const ctx = canvas.getContext("2d");
      const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 1.5));
      const width = Math.max(360, window.innerWidth);
      const height = Math.max(360, window.innerHeight);
      const resized = canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr);
      if (resized) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const city = cityStateRef.current;
      const layout = city.layout;
      if (!city.heroReady || !city.atlas || !city.animationSheets || !city.houseSprites.length) {
        frameRef.current = requestAnimationFrame(loop);
        return;
      }

      if (!Number.isFinite(city.heroGX) || !Number.isFinite(city.heroGY) || city.heroGX === 0) {
        city.heroGX = layout.spawn.gx;
        city.heroGY = layout.spawn.gy;
      }

      if (!city.staticLayer) city.staticLayer = buildCityTerrainLayer(layout, city.atlas);

      const dt = Math.min(0.034, (now - (city.lastNow ?? now)) / 1000);
      city.lastNow = now;

      const movement = getIsoMovementVector(keysRef.current);
      const speed = 3.2;
      let moved = false;
      if (movement.gx || movement.gy) {
        const nextGX = city.heroGX + movement.gx * speed * dt;
        const nextGY = city.heroGY + movement.gy * speed * dt;
        if (isRoadPassable(layout, nextGX, city.heroGY, 0.22)) {
          city.heroGX = nextGX;
          moved = true;
        }
        if (isRoadPassable(layout, city.heroGX, nextGY, 0.22)) {
          city.heroGY = nextGY;
          moved = true;
        }
        city.facingX = movement.gx;
        city.facingY = movement.gy;
        const screenDx = movement.gx - movement.gy;
        if (screenDx !== 0) city.facing = screenDx >= 0 ? 1 : -1;
      }
      city.time += dt;
      if (moved) city.gait += dt * (7.5 + speed * 2.3);
      city.walkClock = city.time;

      const markerHit = findTouchedCityMarker(layout, city.heroGX, city.heroGY);
      if (!markerHit) {
        activeMarkerRef.current = null;
        nearbyBuildingRef.current = null;
        setNearbyBuildingId((current) => current === null ? current : null);
      } else {
        activeMarkerRef.current = markerHit.id;
        nearbyBuildingRef.current = markerHit.id;
        setNearbyBuildingId((current) => current === markerHit.id ? current : markerHit.id);
      }

      drawIsometricCityScene(ctx, width, height, layout, city, cityProgressRef.current, moved);
      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [onClose]);

  return (
    <section className="city-page" role="dialog" aria-modal="true" aria-label="City page">
      <header className="city-page-header">
        <h2>City</h2>
        <button type="button" className="city-close" onClick={onClose}>Tilbage</button>
      </header>
      <canvas ref={canvasRef} className="city-canvas" aria-label="City" />
      {loadingCity && (
        <div className="city-loading" role="status">
          <b>Building city</b>
          <span>Preparing fixed city assets...</span>
        </div>
      )}
      {!loadingCity && nearbyBuildingId && !selectedBuildingId && (
        <div className="city-interact-prompt">
          Press <b>E</b> to open {CITY_BUILDINGS.find((entry) => entry.id === nearbyBuildingId)?.title ?? "building"}
        </div>
      )}
      {!loadingCity && selectedBuildingId && (
        <CityBuildingPopup
          buildingId={selectedBuildingId}
          engineRef={engineRef}
          snapshot={snapshot}
          progress={cityProgress}
          houseSprites={cityStateRef.current.houseSprites}
          onChangeProgress={setCityProgress}
          onClose={() => setSelectedBuildingId(null)}
        />
      )}
      <p className="city-help">WASD eller piletaster: gaa rundt i isometrisk view. ESC: tilbage.</p>
    </section>
  );
}

function loadCityAssets() {
  if (cityAssetCache.assets) return Promise.resolve(cityAssetCache.assets);
  if (!cityAssetCache.promise) {
    cityAssetCache.promise = Promise.all([
      loadGeneratedAtlas(),
      loadAnimationSheets(),
      loadImage("/assets/generated/citystructure_sheet_001.png"),
    ]).then(([atlas, animationSheets, cityImage]) => {
      cityAssetCache.assets = {
        atlas,
        animationSheets,
        houseSprites: buildCitySprites(cityImage),
      };
      return cityAssetCache.assets;
    }).catch((error) => {
      cityAssetCache.promise = null;
      throw error;
    });
  }
  return cityAssetCache.promise;
}

function loadCityProgress() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CITY_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveCityProgress(progress) {
  try {
    localStorage.setItem(CITY_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Progress is a convenience layer; failing to persist should not break city play.
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function removeGreenScreen(image) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (g > 145 && g > r * 1.5 && g > b * 1.5) {
      data[i + 3] = 0;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function trimTransparent(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = 0;
  let maxY = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] <= 20) continue;
    const p = i / 4;
    const x = p % canvas.width;
    const y = Math.floor(p / canvas.width);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  if (maxX <= minX || maxY <= minY) return canvas;
  const pad = 3;
  const sx = Math.max(0, minX - pad);
  const sy = Math.max(0, minY - pad);
  const sw = Math.min(canvas.width - sx, maxX - minX + 1 + pad * 2);
  const sh = Math.min(canvas.height - sy, maxY - minY + 1 + pad * 2);
  const out = document.createElement("canvas");
  out.width = sw;
  out.height = sh;
  out.getContext("2d").drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
  return out;
}

function buildCitySprites(cityImage) {
  const clean = removeGreenScreen(cityImage);
  const componentSprites = buildCitySpritesFromComponents(clean);
  if (componentSprites.length === 9) return componentSprites;

  const rows = 3;
  const cols = 3;
  const cellW = clean.width / cols;
  const cellH = clean.height / rows;
  const sprites = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const sx = Math.floor(col * cellW);
      const sy = Math.floor(row * cellH);
      const ex = Math.ceil((col + 1) * cellW);
      const ey = Math.ceil((row + 1) * cellH);
      const cell = document.createElement("canvas");
      cell.width = ex - sx;
      cell.height = ey - sy;
      cell.getContext("2d").drawImage(clean, sx, sy, cell.width, cell.height, 0, 0, cell.width, cell.height);
      sprites.push(trimTransparent(cell));
    }
  }
  return sprites;
}

function buildCitySpritesFromComponents(clean) {
  const ctx = clean.getContext("2d", { willReadFrequently: true });
  const imageData = ctx.getImageData(0, 0, clean.width, clean.height);
  const { data } = imageData;
  const width = clean.width;
  const height = clean.height;
  const visited = new Uint8Array(width * height);
  const components = [];
  const stack = [];
  const alphaAt = (index) => data[index * 4 + 3];

  for (let i = 0; i < visited.length; i += 1) {
    if (visited[i] || alphaAt(i) <= 20) continue;
    visited[i] = 1;
    stack.push(i);
    let area = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;

    while (stack.length) {
      const p = stack.pop();
      const x = p % width;
      const y = Math.floor(p / width);
      area += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);

      const neighbors = [p - 1, p + 1, p - width, p + width];
      for (const next of neighbors) {
        if (next < 0 || next >= visited.length || visited[next] || alphaAt(next) <= 20) continue;
        const nx = next % width;
        if ((next === p - 1 && nx > x) || (next === p + 1 && nx < x)) continue;
        visited[next] = 1;
        stack.push(next);
      }
    }

    if (area >= 70) {
      components.push({
        area,
        minX,
        minY,
        maxX,
        maxY,
        cx: (minX + maxX) / 2,
        cy: (minY + maxY) / 2,
      });
    }
  }

  const rows = 3;
  const cols = 3;
  const cellW = width / cols;
  const cellH = height / rows;
  const groups = Array.from({ length: rows * cols }, (_, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      minX: width,
      minY: height,
      maxX: 0,
      maxY: 0,
      centerX: (col + 0.5) * cellW,
      centerY: (row + 0.5) * cellH,
      area: 0,
    };
  });

  for (const component of components) {
    let bestIndex = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < groups.length; i += 1) {
      const group = groups[i];
      const dx = (component.cx - group.centerX) / cellW;
      const dy = (component.cy - group.centerY) / cellH;
      const distance = dx * dx + dy * dy;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }
    if (bestDistance > 0.82) continue;
    const group = groups[bestIndex];
    group.minX = Math.min(group.minX, component.minX);
    group.minY = Math.min(group.minY, component.minY);
    group.maxX = Math.max(group.maxX, component.maxX);
    group.maxY = Math.max(group.maxY, component.maxY);
    group.area += component.area;
  }

  const sprites = [];
  for (const group of groups) {
    if (!group.area) return [];
    const pad = 4;
    const sx = Math.max(0, group.minX - pad);
    const sy = Math.max(0, group.minY - pad);
    const sw = Math.min(width - sx, group.maxX - group.minX + 1 + pad * 2);
    const sh = Math.min(height - sy, group.maxY - group.minY + 1 + pad * 2);
    const sprite = document.createElement("canvas");
    sprite.width = sw;
    sprite.height = sh;
    sprite.getContext("2d").drawImage(clean, sx, sy, sw, sh, 0, 0, sw, sh);
    sprites.push(sprite);
  }
  return sprites;
}

function buildCityLayout() {
  const mapWidth = 21;
  const mapHeight = 21;
  const rows = Array.from({ length: mapHeight }, () => Array.from({ length: mapWidth }, () => "g"));

  const roadRows = [4, 10, 16];
  const roadCols = [4, 10, 16];
  for (const y of roadRows) {
    for (let x = 2; x < mapWidth - 2; x += 1) rows[y][x] = "r";
  }
  for (const x of roadCols) {
    for (let y = 2; y < mapHeight - 2; y += 1) rows[y][x] = "r";
  }

  const houses = [];
  const housePositions = [
    { gx: 2.6, gy: 2.6 },
    { gx: 8.2, gy: 2.6 },
    { gx: 13.8, gy: 2.6 },
    { gx: 2.6, gy: 8.2 },
    { gx: 13.8, gy: 8.2 },
    { gx: 2.6, gy: 13.8 },
    { gx: 8.2, gy: 13.8 },
    { gx: 13.8, gy: 13.8 },
    { gx: 17.8, gy: 17.8 },
  ];
  for (let i = 0; i < housePositions.length; i += 1) {
    houses.push({ ...housePositions[i], spriteIndex: i });
  }

  return {
    mapWidth,
    mapHeight,
    rows,
    houses,
    spawn: { gx: 10.5, gy: 10.5 },
  };
}

function getIsoMovementVector(keys) {
  let gx = 0;
  let gy = 0;
  if (keys.has("w") || keys.has("arrowup")) {
    gx -= 1;
    gy -= 1;
  }
  if (keys.has("s") || keys.has("arrowdown")) {
    gx += 1;
    gy += 1;
  }
  if (keys.has("a") || keys.has("arrowleft")) {
    gx -= 1;
    gy += 1;
  }
  if (keys.has("d") || keys.has("arrowright")) {
    gx += 1;
    gy -= 1;
  }

  const length = Math.hypot(gx, gy) || 1;
  return { gx: gx / length, gy: gy / length };
}

function isRoadPassable(layout, gx, gy, radius = 0) {
  const points = [
    [gx, gy],
    [gx + radius, gy],
    [gx - radius, gy],
    [gx, gy + radius],
    [gx, gy - radius],
  ];

  return points.every(([px, py]) => {
    const tx = Math.floor(px);
    const ty = Math.floor(py);
    return tx >= 0 && ty >= 0 && tx < layout.mapWidth && ty < layout.mapHeight && !isHouseBlockingPoint(layout, px, py);
  });
}

function isHouseBlockingPoint(layout, gx, gy) {
  return layout.houses.some((house) => {
    const dx = (gx - house.gx) / 0.88;
    const dy = (gy - house.gy) / 0.78;
    return dx * dx + dy * dy < 1;
  });
}

function drawIsometricCityScene(ctx, width, height, layout, city, progress, moving) {
  drawCityBackdrop(ctx, width, height);
  const camera = getCityCamera(width, height, city);
  const terrain = city.staticLayer ?? buildCityTerrainLayer(layout, city.atlas);
  const terrainOrigin = worldToScreen(0, 0, 0, camera);
  ctx.drawImage(terrain.canvas, terrainOrigin.x - terrain.originX, terrainOrigin.y - terrain.originY);

  const entities = [
    ...layout.houses.map((house) => ({ type: "house", ...house, depth: house.gx + house.gy })),
    ...layout.houses.map((house) => {
      const offset = getCityQuestOffset(house.spriteIndex);
      return {
        type: "quest",
        gx: house.gx + offset.gx,
        gy: house.gy + offset.gy,
        phase: house.spriteIndex * 0.65,
        depth: house.gx + house.gy + offset.gx + offset.gy + 0.2,
      };
    }),
    { type: "hero", gx: city.heroGX, gy: city.heroGY, depth: city.heroGX + city.heroGY + 0.15 },
  ].sort((a, b) => a.depth - b.depth);

  for (const entity of entities) {
    if (entity.type === "house") {
      const building = CITY_BUILDINGS[entity.spriteIndex];
      drawIsoHouse(ctx, entity, city.houseSprites, camera, isCityBuildingOwned(progress, building?.id));
      continue;
    }
    if (entity.type === "quest") {
      drawCityQuestMarker(ctx, entity, camera, city.walkClock);
      continue;
    }
    drawIsoHero(ctx, city, moving, camera);
  }
}

function findTouchedCityMarker(layout, gx, gy) {
  for (const house of layout.houses) {
    const building = CITY_BUILDINGS[house.spriteIndex];
    if (!building) continue;
    const offset = getCityQuestOffset(house.spriteIndex);
    if (Math.hypot(gx - (house.gx + offset.gx), gy - (house.gy + offset.gy)) <= 0.9) return building;
  }
  return null;
}

function isCityBuildingOwned(progress, buildingId) {
  return (progress?.[buildingId]?.level ?? 0) > 0;
}

function getCityQuestOffset(spriteIndex) {
  const offsets = [
    { gx: 0.58, gy: 0.58 },
    { gx: 0.56, gy: 0.56 },
    { gx: 0.62, gy: 0.62 },
    { gx: 0.58, gy: 0.58 },
    { gx: 0.56, gy: 0.56 },
    { gx: 0.6, gy: 0.6 },
    { gx: 0.58, gy: 0.58 },
    { gx: 0.58, gy: 0.58 },
    { gx: 0.56, gy: 0.56 },
  ];
  return offsets[spriteIndex % offsets.length];
}

function drawCityBackdrop(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#0a0d10");
  gradient.addColorStop(1, "#151711");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "rgba(56, 76, 48, 0.48)";
  ctx.fillRect(0, 0, width, height);
}

function buildCityTerrainLayer(layout, atlas) {
  const padTop = 56;
  const padBottom = 88;
  const originX = (layout.mapWidth * TILE_W) / 2 + TILE_W / 2;
  const originY = padTop;
  const width = layout.mapWidth * TILE_W + TILE_W;
  const height = layout.mapHeight * TILE_H + TILE_H + padTop + padBottom;
  const layer = document.createElement("canvas");
  layer.width = width;
  layer.height = height;
  const ctx = layer.getContext("2d");

  for (let gy = 0; gy < layout.mapHeight; gy += 1) {
    for (let gx = 0; gx < layout.mapWidth; gx += 1) {
      const tile = {
        x: originX + (gx - gy) * (TILE_W / 2),
        y: originY + (gx + gy) * (TILE_H / 2),
      };
      const type = layout.rows[gy][gx];
      drawIsoTile(ctx, atlas, gx, gy, tile.x, tile.y, type);
    }
  }

  return { canvas: layer, originX, originY, width, height };
}

function getCityCamera(width, height, city) {
  const heroIso = worldToIso(city.heroGX, city.heroGY, 0);
  return {
    offsetX: width * 0.5 - heroIso.x,
    offsetY: height * 0.52 - heroIso.y,
  };
}

function drawIsoTile(ctx, atlas, gx, gy, x, y, type) {
  const variant = Math.abs((gx * 13 + gy * 17) % 16);
  drawGroundTile(ctx, atlas, "desert", variant, x, y, {
    baseColor: "#876241",
    baseAlpha: type === "r" ? 0.22 : 0.12,
    path: type === "r",
    pathColor: "rgba(82, 54, 31, 0.35)",
  });
}

function drawIsoHouse(ctx, house, sprites, camera, owned = false) {
  if (!sprites.length) return;
  const sprite = sprites[house.spriteIndex % sprites.length];
  if (!sprite) return;

  const tile = worldToScreen(house.gx, house.gy, 0, camera);
  const targetH = TILE_W * 1.8;
  const scale = targetH / sprite.height;
  const w = sprite.width * scale;
  const h = sprite.height * scale;
  const baseX = tile.x;
  const baseY = tile.y + TILE_H * 0.56;

  ctx.save();
  if (!owned) {
    ctx.globalAlpha *= 0.46;
    ctx.filter = "grayscale(0.85) brightness(0.75)";
  }
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.beginPath();
  ctx.ellipse(baseX, baseY + 4, TILE_W * 0.28, TILE_H * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.drawImage(sprite, baseX - w * 0.5, baseY - h, w, h);
  ctx.restore();
}

function drawCityQuestMarker(ctx, marker, camera, time) {
  const screen = worldToScreen(marker.gx, marker.gy, 0, camera);
  const bob = Math.sin(time * 4.5 + marker.phase) * 4;
  const x = screen.x;
  const y = screen.y - 18 + bob;

  drawShadow(ctx, x, screen.y + 12, 17, 6, 0.24);
  ctx.save();
  ctx.shadowColor = "#ffcf32";
  ctx.shadowBlur = 12;
  ctx.strokeStyle = "#4a2b05";
  ctx.lineCap = "round";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(x, y - 18);
  ctx.lineTo(x, y - 3);
  ctx.stroke();
  ctx.fillStyle = "#4a2b05";
  ctx.beginPath();
  ctx.arc(x, y + 8, 5.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 8;
  ctx.strokeStyle = "#ffd94a";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y - 18);
  ctx.lineTo(x, y - 3);
  ctx.stroke();
  ctx.fillStyle = "#ffd94a";
  ctx.beginPath();
  ctx.arc(x, y + 8, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawIsoHero(ctx, city, moving, camera) {
  const screen = worldToScreen(city.heroGX, city.heroGY, 0, camera);
  if (!city.animationSheets?.hero) {
    ctx.fillStyle = "#f4da96";
    ctx.beginPath();
    ctx.arc(screen.x, screen.y - 10, 13, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  drawHero(ctx, screen, {
    hurtCooldown: 0,
    facingX: city.facingX,
    facingY: city.facingY,
    moving,
    gait: city.gait,
    moveSpeed: moving ? 3.2 : 0,
    time: city.time,
    attackAnim: 0,
    castAnim: 0,
    weaponMode: "melee",
    weaponColor: "#d9d3ca",
  }, null, city.animationSheets);
}

function CityBuildingPopup({ buildingId, engineRef, snapshot, progress, houseSprites, onChangeProgress, onClose }) {
  const building = CITY_BUILDINGS.find((entry) => entry.id === buildingId);
  const [draggedBankItem, setDraggedBankItem] = useState(null);
  if (!building) return null;

  const buildingState = progress[building.id] ?? { level: 0, paid: {}, durability: 100 };
  const owned = buildingState.level > 0;
  const costEntries = Object.entries(building.cost ?? {});
  const complete = costEntries.length > 0 && costEntries.every(([resourceId, needed]) => (
    Math.max(0, buildingState.paid?.[resourceId] ?? 0) >= needed
  ));
  const sprite = houseSprites?.[CITY_BUILDINGS.findIndex((entry) => entry.id === building.id)];
  const purchasedAddons = new Set(buildingState.addons ?? []);

  const applyResource = (resourceId, amount) => {
    const paid = Math.max(0, buildingState.paid?.[resourceId] ?? 0);
    const needed = Math.max(0, (building.cost?.[resourceId] ?? 0) - paid);
    const available = cityCostAvailable(snapshot, resourceId);
    const count = Math.min(needed, available, amount);
    if (count <= 0) return;
    const consumed = resourceId === "gold"
      ? engineRef.current?.consumeGold?.(count) ?? 0
      : engineRef.current?.consumeResource?.(resourceId, count) ?? 0;
    if (consumed <= 0) return;
    onChangeProgress((current) => ({
      ...current,
      [building.id]: {
        ...(current[building.id] ?? {}),
        level: current[building.id]?.level ?? 0,
        durability: current[building.id]?.durability ?? 100,
        paid: {
          ...(current[building.id]?.paid ?? {}),
          [resourceId]: Math.min(building.cost[resourceId], (current[building.id]?.paid?.[resourceId] ?? 0) + consumed),
        },
      },
    }));
  };

  const finishBuild = () => {
    if (!complete && costEntries.length > 0) return;
    onChangeProgress((current) => ({
      ...current,
      [building.id]: {
        ...(current[building.id] ?? {}),
        level: 1,
        durability: 100,
        paid: {},
      },
    }));
  };

  const buyAddon = (addon) => {
    if (!owned || purchasedAddons.has(addon.id)) return;
    const goldCost = addon.cost?.gold ?? 0;
    if (goldCost > 0 && (snapshot?.player?.gold ?? 0) < goldCost) return;
    const paidGold = goldCost > 0 ? engineRef.current?.consumeGold?.(goldCost) ?? 0 : 0;
    if (paidGold < goldCost) return;
    onChangeProgress((current) => ({
      ...current,
      [building.id]: {
        ...(current[building.id] ?? {}),
        addons: [...new Set([...(current[building.id]?.addons ?? []), addon.id])],
      },
    }));
  };

  const depositInventoryItem = (inventoryIndex, slotIndex) => {
    if (building.id !== "bank" || !owned) return;
    const capacity = cityBankCapacity(building, buildingState);
    if (slotIndex >= capacity) return;
    if (buildingState.items?.[slotIndex]) return;
    const item = engineRef.current?.takeInventoryItem?.(inventoryIndex);
    if (!item) return;
    onChangeProgress((current) => {
      const state = current[building.id] ?? {};
      const items = [...(state.items ?? [])];
      items[slotIndex] = item;
      return { ...current, [building.id]: { ...state, items } };
    });
  };

  const withdrawBankItem = (slotIndex) => {
    if (building.id !== "bank" || !owned) return;
    const item = buildingState.items?.[slotIndex];
    if (!item) return;
    if (!engineRef.current?.returnInventoryItem?.(item)) return;
    onChangeProgress((current) => {
      const state = current[building.id] ?? {};
      const items = [...(state.items ?? [])];
      items[slotIndex] = null;
      return { ...current, [building.id]: { ...state, items } };
    });
  };

  return (
    <div className="city-popup-backdrop">
      <section className="city-popup" role="dialog" aria-modal="true" aria-label={building.title}>
        <header className="city-popup-header">
          <div>
            <h3>{building.title}</h3>
            <span>{owned ? `Lvl ${buildingState.level}` : "Not owned"}</span>
          </div>
          <button type="button" className="city-popup-close" onClick={onClose}>X</button>
        </header>

        <div className="city-popup-summary">
          <div className="city-building-thumb">
            {sprite && <canvas ref={(canvas) => drawCityPopupThumb(canvas, sprite, !owned)} width="170" height="150" />}
          </div>
          <p>{building.help}</p>
        </div>

        <div className="city-popup-actions">
          <button type="button" onClick={finishBuild} disabled={owned || (!complete && costEntries.length > 0)}>
            Buy
          </button>
          <button type="button" disabled={(buildingState.durability ?? 100) >= 100}>Repair</button>
        </div>

        <main className="city-popup-main">
          <p>{building.functionText}</p>
          {building.addons?.length > 0 && (
            <div className="city-addon-list">
              {building.addons.map((addon) => {
                const bought = purchasedAddons.has(addon.id);
                const affordable = (snapshot?.player?.gold ?? 0) >= (addon.cost?.gold ?? 0);
                const iconSprite = houseSprites?.[addon.iconSpriteIndex ?? 0];
                return (
                  <button
                    type="button"
                    className={`city-addon ${bought ? "bought" : ""}`}
                    key={addon.id}
                    disabled={!owned || bought || !affordable}
                    title={addon.help}
                    onClick={() => buyAddon(addon)}
                  >
                    {iconSprite && <canvas ref={(canvas) => drawCityPopupThumb(canvas, iconSprite, !owned || !bought)} width="46" height="42" />}
                    <span>{addon.title}</span>
                    <b>{addon.cost?.gold ?? 0} G</b>
                  </button>
                );
              })}
            </div>
          )}
          <div className="city-cost-list">
            {costEntries.length === 0 && <span>No cost configured yet.</span>}
            {costEntries.map(([resourceId, needed]) => {
              const paid = Math.max(0, buildingState.paid?.[resourceId] ?? 0);
              const remaining = Math.max(0, needed - paid);
              const available = cityCostAvailable(snapshot, resourceId);
              const label = cityCostLabel(resourceId);
              return (
                <div className="city-cost-row" key={resourceId}>
                  <CityCostIcon resourceId={resourceId} />
                  <span>{label}</span>
                  <b>{paid} / {needed}</b>
                  <em>Available {available}</em>
                  <button type="button" disabled={!remaining || !available} onClick={() => applyResource(resourceId, 1)}>+1</button>
                  <button type="button" disabled={!remaining || !available} onClick={() => applyResource(resourceId, Math.min(10, remaining))}>+10</button>
                  <button type="button" disabled={!remaining || !available} onClick={() => applyResource(resourceId, remaining)}>Max</button>
                </div>
              );
            })}
          </div>
          {building.id === "bank" && (
            <CityBankPanel
              building={building}
              buildingState={buildingState}
              owned={owned}
              inventory={snapshot.inventory}
              draggedBankItem={draggedBankItem}
              onDragBankItem={setDraggedBankItem}
              onDepositInventoryItem={depositInventoryItem}
              onWithdrawBankItem={withdrawBankItem}
            />
          )}
        </main>
      </section>
    </div>
  );
}

function CityCostIcon({ resourceId }) {
  if (resourceId === "gold") return <i className="city-cost-gold-icon" aria-hidden="true" />;
  const def = RESOURCE_DEFS[resourceId];
  if (!def) return <i className="city-cost-missing-icon" aria-hidden="true" />;
  return (
    <InventoryIcon
      iconIndex={def.iconIndex}
      iconSheet={def.sheet ?? "resources"}
    />
  );
}

function CityBankPanel({
  building,
  buildingState,
  owned,
  inventory,
  draggedBankItem,
  onDragBankItem,
  onDepositInventoryItem,
  onWithdrawBankItem,
}) {
  const capacity = owned ? cityBankCapacity(building, buildingState) : 0;
  const totalSlots = cityBankMaxSlots(building);
  const bankItems = buildingState.items ?? [];
  const inventorySlots = Array.from({ length: MAX_INVENTORY }, (_, index) => inventory[index] ?? null);

  return (
    <section className="city-bank-panel">
      <div className="city-bank-column">
        <h4>Backpack</h4>
        <div
          className="city-bank-grid backpack-drop"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            if (draggedBankItem?.source === "bank") onWithdrawBankItem(draggedBankItem.slotIndex);
            onDragBankItem(null);
          }}
        >
          {inventorySlots.map((item, index) => (
            <CityItemSlot
              key={`inv-${index}`}
              item={item}
              locked={false}
              draggable={Boolean(item)}
              onDragStart={(event) => {
                event.dataTransfer.setData("application/x-city-item", JSON.stringify({ source: "inventory", index }));
                event.dataTransfer.effectAllowed = "move";
              }}
            />
          ))}
        </div>
      </div>
      <div className="city-bank-column">
        <h4>Bank {capacity} / {totalSlots}</h4>
        <div className="city-bank-grid">
          {Array.from({ length: totalSlots }, (_, index) => {
            const locked = !owned || index >= capacity;
            return (
              <CityItemSlot
                key={`bank-${index}`}
                item={bankItems[index]}
                locked={locked}
                draggable={owned && Boolean(bankItems[index])}
                onDragStart={(event) => {
                  onDragBankItem({ source: "bank", slotIndex: index });
                  event.dataTransfer.setData("application/x-city-item", JSON.stringify({ source: "bank", slotIndex: index }));
                  event.dataTransfer.effectAllowed = "move";
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (locked) return;
                  const raw = event.dataTransfer.getData("application/x-city-item");
                  if (!raw) return;
                  const payload = JSON.parse(raw);
                  if (payload.source === "inventory") onDepositInventoryItem(payload.index, index);
                  onDragBankItem(null);
                }}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CityItemSlot({ item, locked, draggable, onDragStart, onDrop }) {
  return (
    <button
      type="button"
      className={`city-item-slot ${locked ? "locked" : ""} ${item ? "filled" : ""}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={(event) => {
        if (onDrop) event.preventDefault();
      }}
      onDrop={onDrop}
      title={locked ? "Locked" : item?.name ?? "Empty"}
    >
      {locked ? <span>LOCK</span> : item && <InventoryIcon iconIndex={item.iconIndex} iconSheet={item.iconSheet} iconUrl={item.iconUrl} />}
      {!locked && item?.count > 1 && <b>{item.count}</b>}
    </button>
  );
}

function cityBankCapacity(building, state) {
  const addons = new Set(state.addons ?? []);
  return (building.baseSlots ?? 0) + (building.addons ?? []).reduce((sum, addon) => (
    addons.has(addon.id) ? sum + (addon.slots ?? 0) : sum
  ), 0);
}

function cityBankMaxSlots(building) {
  return (building.baseSlots ?? 0) + (building.addons ?? []).reduce((sum, addon) => sum + (addon.slots ?? 0), 0);
}

function drawCityPopupThumb(canvas, sprite, muted) {
  if (!canvas || !sprite) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const scale = Math.min(canvas.width * 0.9 / sprite.width, canvas.height * 0.9 / sprite.height);
  const w = sprite.width * scale;
  const h = sprite.height * scale;
  ctx.save();
  if (muted) {
    ctx.globalAlpha = 0.54;
    ctx.filter = "grayscale(0.85) brightness(0.8)";
  }
  ctx.drawImage(sprite, (canvas.width - w) / 2, canvas.height - h - 4, w, h);
  ctx.restore();
}

function resourceCountFromSnapshot(snapshot, resourceId) {
  return (snapshot?.inventory ?? []).reduce((sum, item) => (
    item?.mode === "resource" && item.resourceId === resourceId
      ? sum + Math.max(1, Math.floor(Number(item.count) || 1))
      : sum
  ), 0);
}

function cityCostAvailable(snapshot, resourceId) {
  if (resourceId === "gold") return Math.max(0, Math.floor(Number(snapshot?.player?.gold) || 0));
  return resourceCountFromSnapshot(snapshot, resourceId);
}

function cityCostLabel(resourceId) {
  if (resourceId === "gold") return "Gold";
  return RESOURCE_DEFS[resourceId]?.name ?? resourceId;
}

const iconSheetPromises = new Map();

function InventoryIcon({ iconIndex, iconSheet = "items", iconUrl = null }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const source = iconUrl || (
      iconSheet === "armor"
        ? "/assets/generated/armor001_sheet.png"
        : iconSheet === "resources"
          ? "/assets/generated/res_sheet_001.png"
          : iconSheet === "gemstones"
            ? "/assets/generated/res_sheet_002.png"
          : "/assets/generated/items001_sheet.png"
    );
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
        drawInventoryIcon(canvasRef.current, image, iconIndex, iconSheet);
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

function drawInventoryIcon(canvas, image, iconIndex, iconSheet = "items") {
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
