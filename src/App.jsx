import React, { useEffect, useMemo, useRef, useState } from "react";
import { MAX_INVENTORY, TILE_H, TILE_W } from "./game/data.js";
import { drawGroundTile, drawShadow, loadGeneratedAtlas } from "./game/assets-ground.js";
import { drawHero } from "./game/assets-hero.js";
import { loadAnimationSheets } from "./game/assets.js";
import { GameEngine } from "./game/GameEngine.js";
import { ATLAS_FRAMES } from "./game/assets.js";
import { worldToIso, worldToScreen } from "./game/iso.js";
import { RESOURCE_DEFS } from "./game/config/resource-config.js";
import { CITY_BUILDINGS } from "./game/config/city-buildings-config.js";
import { AREA_MAPS, MAP_REGION_SETS, WORLD_MAP } from "./game/config/map-region-config.js";
import { QUEST_DEFS, QUEST_ITEM_DEFS, QUEST_NPCS } from "./game/config/quest-config.js";
import { deriveIconKey, iconUrlFromKey, isEquippableItem } from "./game/item-system.js";

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
  regionRun: null,
  mapReturn: null,
  mobs: { total: 0, alive: 0, killed: 0 },
  exitPrompt: false,
  inventory: [],
  equipment: [],
  hoverMonster: null,
  quickActions: { healthPotions: 0, manaPotions: 0, potionCooldown: 0 },
  quests: { active: [], completed: [], cityFade: [], wildernessNpc: null, nearbyQuestgiver: null },
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

const QUICKBAR_HEALTH_POTION_ICON_URL = iconUrlFromKey(deriveIconKey({ mode: "potion", potionType: "health" }));
const QUICKBAR_MANA_POTION_ICON_URL = iconUrlFromKey(deriveIconKey({ mode: "potion", potionType: "mana" }));
const QUICKBAR_ATTACK_ICON_URL = iconUrlFromKey("common_sword");
const QUICKBAR_CITY_ICON_URL = "/assets/generated/icon_city.png";
const QUICKBAR_WILDERNESS_ICON_URL = "/assets/generated/icon_wilderness.png";
const ITEM_STANDARD_ICON_URL = "/assets/generated/item/item_standard.png";
const ITEM_GOLD_ICON_URL = "/assets/generated/item/item_gold.png";
const ITEM_MONEY_ICON_URL = "/assets/generated/item/item_gold.png";
const REGION_CORRUPTION_STORAGE_KEY = "runebound-depths-region-corruption-v1";

function regionStatusKey(areaMapId, regionId) {
  return `${areaMapId}:${regionId}`;
}

function loadRegionCorruption() {
  const initial = {};
  for (const [areaMapId, regions] of Object.entries(MAP_REGION_SETS)) {
    if (areaMapId === WORLD_MAP.id) continue;
    for (const region of regions) {
      initial[regionStatusKey(areaMapId, region.id)] = region.corrupted !== false;
    }
  }

  try {
    const saved = JSON.parse(localStorage.getItem(REGION_CORRUPTION_STORAGE_KEY) || "{}");
    if (saved && typeof saved === "object") {
      for (const key of Object.keys(initial)) {
        if (typeof saved[key] === "boolean") initial[key] = saved[key];
      }
    }
  } catch {
    // Keep default corruption state if localStorage is unavailable or invalid.
  }
  return initial;
}

function saveRegionCorruption(regionCorruption) {
  try {
    localStorage.setItem(REGION_CORRUPTION_STORAGE_KEY, JSON.stringify(regionCorruption));
  } catch {
    // Ignore quota or storage-denied errors.
  }
}

function mapRegionColor(mapId, region, regionCorruption) {
  if (mapId === WORLD_MAP.id) return region.color;
  const corrupted = regionCorruption[regionStatusKey(mapId, region.id)] ?? region.corrupted ?? true;
  return corrupted ? "#d94343" : "#58d96d";
}

export default function App() {
  const canvasRef = useRef(null);
  const minimapRef = useRef(null);
  const engineRef = useRef(null);
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [cityEnteredFromMap, setCityEnteredFromMap] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [regionMapOpen, setRegionMapOpen] = useState(true);
  const [regionMapInitialId, setRegionMapInitialId] = useState(WORLD_MAP.id);
  const [regionCorruption, setRegionCorruption] = useState(loadRegionCorruption);
  const [heroOpen, setHeroOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [destroyConfirmItem, setDestroyConfirmItem] = useState(null);
  const [inventoryFilter, setInventoryFilter] = useState("all");
  const [mergeChoice, setMergeChoice] = useState(null);
  const [questOffer, setQuestOffer] = useState(null);
  const [acceptedQuestNpc, setAcceptedQuestNpc] = useState(null);
  const [questRewardModal, setQuestRewardModal] = useState(null);
  const [viewedQuest, setViewedQuest] = useState(null);
  const snapshotRef = useRef(emptySnapshot);
  const lastMapReturnIdRef = useRef(null);

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
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    saveRegionCorruption(regionCorruption);
  }, [regionCorruption]);

  useEffect(() => {
    const mapReturn = snapshot.mapReturn;
    if (!mapReturn?.id || lastMapReturnIdRef.current === mapReturn.id) return;
    lastMapReturnIdRef.current = mapReturn.id;
    setRegionCorruption((current) => ({
      ...current,
      [regionStatusKey(mapReturn.areaMapId, mapReturn.regionId)]: !mapReturn.cleared,
    }));
    setRegionMapInitialId(mapReturn.areaMapId ?? WORLD_MAP.id);
    setRegionMapOpen(true);
    setMapOpen(false);
    setInventoryOpen(false);
    setHeroOpen(false);
  }, [snapshot.mapReturn]);

  useEffect(() => {
    if (!import.meta.hot) return undefined;
    const openWorldMapAfterHotUpdate = () => {
      setRegionMapInitialId(WORLD_MAP.id);
      setRegionMapOpen(true);
      setMapOpen(false);
      setInventoryOpen(false);
      setHeroOpen(false);
      setCityOpen(false);
    };
    import.meta.hot.on("vite:afterUpdate", openWorldMapAfterHotUpdate);
    return () => import.meta.hot.off("vite:afterUpdate", openWorldMapAfterHotUpdate);
  }, []);

  useEffect(() => {
    const handleKey = (event) => {
      // Allow inventory/map/hero hotkeys while city is open; city should not
      // block access to quickbar functionality.
      const key = event.key.toLowerCase();
      if (key === "i") setInventoryOpen((value) => !value);
      if (key === "m") setMapOpen((value) => !value);
      if (key === "c") setHeroOpen((value) => !value);
      if (key === "e" && snapshotRef.current.quests?.nearbyQuestgiver) {
        event.preventDefault();
        setQuestOffer(snapshotRef.current.quests.nearbyQuestgiver);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [cityOpen]);

  useEffect(() => {
    const modalOpen = cityOpen || mapOpen || regionMapOpen || heroOpen || Boolean(questOffer) || Boolean(acceptedQuestNpc);
    engineRef.current?.setInputLocked(modalOpen);
    engineRef.current?.setPaused(modalOpen);
    if (cityOpen) {
      setInventoryOpen(false);
      setDestroyConfirmItem(null);
      setSelectedItem(null);
    }
    return () => {
      engineRef.current?.setInputLocked(false);
      engineRef.current?.setPaused(false);
    };
  }, [cityOpen, mapOpen, regionMapOpen, heroOpen, questOffer, acceptedQuestNpc]);

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
  const startPlayableMapRegion = (areaMapId, region) => {
    if (!areaMapId || !region?.id) return;
    const started = engineRef.current?.startMapRegion?.(areaMapId, region);
    if (!started) return;
    setRegionCorruption((current) => ({
      ...current,
      [regionStatusKey(areaMapId, region.id)]: true,
    }));
    setRegionMapOpen(false);
    setMapOpen(false);
  };

  const handleOpenCityFromMap = () => {
    setCityEnteredFromMap(true);
    setRegionMapOpen(false);
    setCityOpen(true);
  };

  const handleCityClose = () => {
    setCityOpen(false);
    if (cityEnteredFromMap) {
      setCityEnteredFromMap(false);
      setRegionMapOpen(true);
    }
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
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <ImageIcon src={ITEM_MONEY_ICON_URL} />
            <b>{player.gold}</b>
          </div>
        </div>
      </section>

      <section className="hud hud-right">
        <div className="zone-panel">
          <div className="zone-header">
            <b>{snapshot.zone.name}</b>
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
        {snapshot.regionRun && snapshot.mobs?.total > 0 && (
          <span>Mobs {snapshot.mobs.killed} / {snapshot.mobs.total}</span>
        )}
      </section>

      {snapshot.quests?.active?.length > 0 && (
        <section className="quest-tracker" aria-label="Aktive quests">
          {snapshot.quests.active.slice(0, 8).map((quest) => (
            <div
              className={`quest-track-row ${quest.complete ? "complete" : ""}`}
              key={quest.id}
              role="button"
              tabIndex={0}
              onClick={() => setViewedQuest(quest)}
              onKeyDown={(e) => { if (e.key === "Enter") setViewedQuest(quest); }}
            >
              <b>{quest.title}</b>
              <span>{quest.progressText}</span>
            </div>
          ))}
        </section>
      )}

      <section className="skillbar">
        <span title={cityOpen ? "Ikke tilgængelig i byen" : undefined}>
          <button
            type="button"
            className="quick-potion"
            title="Health potion"
            disabled={cityOpen || !snapshot.quickActions.healthPotions || snapshot.quickActions.potionCooldown > 0}
            onClick={() => engineRef.current?.usePotion("health")}
          >
            <InventoryIcon iconIndex={4} iconSheet="items" iconUrl={QUICKBAR_HEALTH_POTION_ICON_URL} />
            <span className="hotkey-badge">1</span>
            <b>{snapshot.quickActions.healthPotions}</b>
          </button>
        </span>
        <span title={cityOpen ? "Ikke tilgængelig i byen" : undefined}>
          <button
            type="button"
            className="quick-potion"
            title="Mana potion"
            disabled={cityOpen || !snapshot.quickActions.manaPotions || snapshot.quickActions.potionCooldown > 0}
            onClick={() => engineRef.current?.usePotion("mana")}
          >
            <InventoryIcon iconIndex={3} iconSheet="items" iconUrl={QUICKBAR_MANA_POTION_ICON_URL} />
            <span className="hotkey-badge">2</span>
            <b>{snapshot.quickActions.manaPotions}</b>
          </button>
        </span>
        <span title={cityOpen ? "Ikke tilgængelig i byen" : undefined}>
          <button type="button" className="skill active" title="Angrib" disabled={cityOpen} onClick={() => engineRef.current?.primaryAttack()}>
            <InventoryIcon iconIndex={0} iconSheet="items" iconUrl={QUICKBAR_ATTACK_ICON_URL} />
          </button>
        </span>
        <span title={cityOpen ? "Ikke tilgængelig i byen" : undefined}>
          <button
            type="button"
            className="skill"
            title="Kast magi"
            disabled={cityOpen}
            onClick={() => {
              const engine = engineRef.current;
              if (engine) engine.castSpellAt(engine.pointer.worldX, engine.pointer.worldY);
            }}
          >
            <AtlasIcon frameName="orb" />
          </button>
        </span>
        <button type="button" className="skill" title="Rygsaek" onClick={() => setInventoryOpen((value) => !value)}>
          <ImageIcon src="/assets/generated/icon_backpack.png" />
          <span className="hotkey-badge">I</span>
        </button>
        <button type="button" className="skill" title="Map" onClick={() => setMapOpen(true)}>
          <ImageIcon src="/assets/generated/icon_map.png" />
          <span className="hotkey-badge">M</span>
        </button>
        <button type="button" className="skill" title="Hero" onClick={() => setHeroOpen(true)}>
          <ImageIcon src="/assets/generated/ui_hero.png" />
          <span className="hotkey-badge">C</span>
        </button>
        <button
          type="button"
          className="skill"
          title={cityOpen ? "Til wilderness" : "Aaben city page"}
          onClick={() => { if (cityOpen) { handleCityClose(); } else { setCityEnteredFromMap(false); setCityOpen(true); } }}
        >
          <ImageIcon src={cityOpen ? QUICKBAR_WILDERNESS_ICON_URL : QUICKBAR_CITY_ICON_URL} />
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
                  className={`item-card ${item.rarity} ${item.mode === "resource" ? "resource-item" : ""} ${dimmed ? "filter-dimmed" : ""} ${isItemRequiredByActiveQuests(item, snapshot.quests?.active) ? "quest-related" : ""}`}
                  style={{ "--item-quality": item.rarityColor ?? "rgba(255,255,255,0.16)" }}
                  key={item.id}
                  onMouseEnter={() => setSelectedItem(item)}
                  onFocus={() => setSelectedItem(item)}
                  onClick={() => {
                    if (isEquippableItem(item)) engineRef.current?.equipItem(item.index);
                  }}
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

      {snapshot.quests?.nearbyQuestgiver && !cityOpen && !questOffer && (
        <div className="city-interact-prompt wilderness-prompt">
          Press <b>E</b> to speak with {QUEST_NPCS[snapshot.quests.nearbyQuestgiver.npcId]?.name ?? "questgiver"}
        </div>
      )}

      {questOffer && (
        <QuestOfferDialog
          offer={questOffer}
          onDecline={() => {
            engineRef.current?.declineWildernessQuest?.();
            setQuestOffer(null);
          }}
          onAccept={() => {
            engineRef.current?.acceptWildernessQuest?.({
              npcId: questOffer.npcId,
              quest: questOffer.quest,
            });
            setAcceptedQuestNpc(questOffer.npcId);
            setQuestOffer(null);
          }}
        />
      )}

      {viewedQuest && (
        <QuestDetailDialog
          quest={viewedQuest}
          engineRef={engineRef}
          onClose={() => setViewedQuest(null)}
          onQuestCompleted={(result) => setQuestRewardModal(result)}
          cityOpen={cityOpen}
        />
      )}

      {acceptedQuestNpc && (
        <div className="confirm-backdrop" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="quest-city-title">
            <h2 id="quest-city-title">Quest taget</h2>
            <p>{QUEST_NPCS[acceptedQuestNpc]?.name ?? "Questgiver"} kan findes i byen, naar questen skal indleveres.</p>
            <div>
              <button type="button" onClick={() => setAcceptedQuestNpc(null)}>OK</button>
            </div>
          </section>
        </div>
      )}

      {questRewardModal && (
        <div className="confirm-backdrop" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="quest-reward-title">
            <h2 id="quest-reward-title">Quest reward</h2>
            <p>{questRewardModal.questTitle}</p>
            <div className="comparison-list">
              {questRewardModal.rewards?.xp > 0 && <span className="diff-good">+ XP {questRewardModal.rewards.xp}</span>}
              {questRewardModal.rewards?.gold > 0 && <span className="diff-good">+ Gold {questRewardModal.rewards.gold}</span>}
              {(questRewardModal.rewards?.resources ?? []).map((entry) => (
                <span className="diff-good" key={`res-${entry.id}`}>+ {entry.count}x {entry.name}</span>
              ))}
              {(questRewardModal.rewards?.items ?? []).map((entry, index) => (
                <span className="diff-good" key={`item-${entry.id ?? index}`}>+ {entry.name}</span>
              ))}
            </div>
            <div>
              <button type="button" onClick={() => setQuestRewardModal(null)}>OK</button>
            </div>
          </section>
        </div>
      )}

      {snapshot.exitPrompt && (
        <div className="confirm-backdrop" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="region-exit-title">
            <h2 id="region-exit-title">{snapshot.regionRun ? "Tilbage til kortet?" : "Rejs videre?"}</h2>
            <p>
              {snapshot.regionRun
                ? `Du har fundet udgangen fra ${snapshot.region.name}. Forlad regionen og vend tilbage til omraadekortet?`
                : `Du har fundet udgangen fra ${snapshot.region.name}. Fortsaet til naeste region?`}
            </p>
            <div>
              <button type="button" onClick={() => engineRef.current?.dismissExitPrompt()}>
                Bliv her
              </button>
              <button type="button" onClick={() => engineRef.current?.travelToNextRegion()}>
                {snapshot.regionRun ? "Til kortet" : "Rejs videre"}
              </button>
            </div>
          </section>
        </div>
      )}

      {mapOpen && (
        <MinimapDialog engineRef={engineRef} snapshot={snapshot} onClose={() => setMapOpen(false)} />
      )}

      {regionMapOpen && (
        <RegionMapDialog
          initialMapId={regionMapInitialId}
          regionCorruption={regionCorruption}
          completedQuests={snapshot.quests?.completed ?? []}
          onPlayableRegionSelected={startPlayableMapRegion}
          onCityOpen={handleOpenCityFromMap}
          onMapNavigation={(mapId) => setRegionMapInitialId(mapId)}
        />
      )}

      {heroOpen && (
        <HeroDialog snapshot={snapshot} onClose={() => setHeroOpen(false)} />
      )}

      {cityOpen && (
        <CityPage
          engineRef={engineRef}
          snapshot={snapshot}
          onQuestCompleted={(result) => setQuestRewardModal(result)}
          onClose={handleCityClose}
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
              <InventoryIcon iconIndex={option.iconIndex} iconSheet={option.iconSheet} iconUrl={option.iconUrl} />
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

function QuestOfferDialog({ offer, onDecline, onAccept }) {
  const npc = QUEST_NPCS[offer.npcId];
  const quest = offer.quest;
  return (
    <div className="confirm-backdrop" role="presentation">
      <section className="confirm-dialog quest-offer-dialog" role="dialog" aria-modal="true" aria-labelledby="quest-offer-title">
        <div className="quest-offer-header">
          {npc?.imageUrl && <img src={npc.imageUrl} alt="" />}
          <div>
            <h2 id="quest-offer-title">{quest.title}</h2>
            <span>{npc?.name ?? "Questgiver"} - {npc?.title ?? "Questgiver"}</span>
          </div>
        </div>
        <p>{quest.story}</p>
        <p>{quest.acceptText}</p>
        <div>
          <button type="button" onClick={onDecline}>Nej</button>
          <button type="button" onClick={onAccept}>Tag quest</button>
        </div>
      </section>
    </div>
  );
}

function QuestDetailDialog({ quest, engineRef, onClose, onQuestCompleted, cityOpen }) {
  const npc = QUEST_NPCS[quest.npcId];
  if (!quest) return null;
  const turnIn = async () => {
    const result = engineRef.current?.completeQuest?.(quest.id);
    if (result?.ok) {
      onQuestCompleted?.(result);
      onClose?.();
    }
  };

  return (
    <div className="city-popup-backdrop">
      <section className="confirm-dialog quest-offer-dialog" role="dialog" aria-modal="true" aria-label={quest.title}>
        <div className="quest-offer-header">
          {npc?.imageUrl && <img src={npc.imageUrl} alt="" />}
          <div>
            <h2>{quest.title}</h2>
            <span>{npc?.name ?? "Questgiver"} - {npc?.title ?? ""}</span>
          </div>
        </div>
        <p>{quest.complete ? quest.turnInText : quest.story}</p>
        <div className="comparison-list">
          {(quest.rewards?.xp ?? 0) > 0 && <span className="diff-good">+ XP {quest.rewards.xp}</span>}
          {(quest.rewards?.gold ?? 0) > 0 && <span className="diff-good">+ Gold {quest.rewards.gold}</span>}
          {(quest.rewards?.resources ?? []).map((r) => (
            <span className="diff-good" key={`res-${r.resource}`}>+ {r.count}x {r.resource}</span>
          ))}
        </div>
        <div>
          <button type="button" onClick={onClose}>Luk</button>
          {cityOpen && (
            <button type="button" disabled={!quest.complete} onClick={turnIn}>Indlever quest</button>
          )}
        </div>
      </section>
    </div>
  );
}

function MinimapDialog({ engineRef, snapshot, onClose }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    engineRef.current?.renderMinimap(canvasRef.current);
  }, [engineRef, snapshot]);
  return (
    <div className="confirm-backdrop" role="presentation">
      <section className="map-dialog" role="dialog" aria-modal="true" aria-label="Map">
        <header>
          <div>
            <h2>Map</h2>
            <span>{snapshot.region.name} | Seed {snapshot.region.seed}</span>
          </div>
          <button type="button" className="city-popup-close" onClick={onClose}>X</button>
        </header>
        <canvas ref={canvasRef} width="520" height="520" aria-label="Current minimap" />
      </section>
    </div>
  );
}

function RegionMapDialog({ initialMapId, regionCorruption, completedQuests = [], onPlayableRegionSelected, onCityOpen, onMapNavigation }) {
  const [selectedMapId, setSelectedMapId] = useState(initialMapId ?? WORLD_MAP.id);
  const [hoveredRegionId, setHoveredRegionId] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [lockedRegion, setLockedRegion] = useState(null);
  const isWorldMap = selectedMapId === WORLD_MAP.id;
  const activeMap = isWorldMap ? WORLD_MAP : AREA_MAPS[selectedMapId] ?? WORLD_MAP;
  const activeRegions = MAP_REGION_SETS[selectedMapId] ?? [];
  useEffect(() => {
    setSelectedMapId(initialMapId ?? WORLD_MAP.id);
    setHoveredRegionId(null);
    setSelectedRegion(null);
    setLockedRegion(null);
  }, [initialMapId]);
  const navigateToMap = (mapId) => {
    setSelectedMapId(mapId);
    onMapNavigation?.(mapId);
  };
  const selectWorldMap = () => {
    navigateToMap(WORLD_MAP.id);
    setHoveredRegionId(null);
    setSelectedRegion(null);
    setLockedRegion(null);
  };
  const completedQuestSet = new Set(completedQuests.map(String));
  const activateRegion = (region) => {
    if (!regionIsUnlocked(region, completedQuestSet)) {
      setSelectedRegion(region);
      setLockedRegion(region);
      return;
    }
    const targetMapId = region.targetMapId ?? region.id;
    if (isWorldMap && AREA_MAPS[targetMapId]) {
      navigateToMap(targetMapId);
      setHoveredRegionId(null);
      setSelectedRegion(null);
      return;
    }
    setSelectedRegion(region);
    onPlayableRegionSelected?.(selectedMapId, region);
  };
  const handleRegionKeyDown = (event, region) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    activateRegion(region);
  };
  const mapAspectValue = useMemo(() => {
    const rawAspect = String(activeMap?.aspect ?? "").trim();
    const [rawWidth, rawHeight] = rawAspect.split("/").map((part) => Number.parseFloat(part.trim()));
    if (!Number.isFinite(rawWidth) || !Number.isFinite(rawHeight) || rawHeight <= 0) return 1;
    return rawWidth / rawHeight;
  }, [activeMap?.aspect]);

  return (
    <div className="confirm-backdrop" role="presentation">
      <section className="map-dialog world-map-dialog" role="dialog" aria-modal="true" aria-label="World map">
        <header>
          <div>
            <h2>{activeMap.title}</h2>
            <span>{isWorldMap ? activeMap.subtitle : `${activeMap.subtitle} | vaelg en region`}</span>
          </div>
          <div className="map-dialog-actions">
            {!isWorldMap && (
              <button type="button" className="map-back-button" onClick={selectWorldMap}>
                World map
              </button>
            )}
            {onCityOpen && (
              <button type="button" className="map-back-button" onClick={onCityOpen}>
                By
              </button>
            )}
          </div>
        </header>
        <div className="map-viewer">
          <div
            className={`map-frame ${isWorldMap ? "interactive-map-frame" : "area-map-frame"}`}
            style={{
              "--map-aspect": activeMap.aspect,
              "--map-max-width": activeMap.maxWidth,
              "--map-aspect-value": mapAspectValue,
            }}
          >
            <img src={activeMap.imageUrl} alt={activeMap.title} draggable="false" />
            {activeRegions.length > 0 && (
              <>
                <svg className="world-map-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label={`Klikbare omraader paa ${activeMap.title}`}>
                  {activeRegions.map((region) => (
                    (() => {
                      const locked = !regionIsUnlocked(region, completedQuestSet);
                      const regionColor = mapRegionColor(selectedMapId, region, regionCorruption);
                      return (
                    <g
                      className={`world-map-region ${locked ? "locked" : ""} ${hoveredRegionId === region.id || selectedRegion?.id === region.id ? "hovered" : ""}`}
                      style={{ "--region-color": regionColor }}
                      key={region.id}
                      role="button"
                      tabIndex={0}
                      aria-label={locked ? `${region.label} er laast` : `${isWorldMap ? "Aaben" : "Vaelg"} ${region.label}`}
                      onClick={() => activateRegion(region)}
                      onKeyDown={(event) => handleRegionKeyDown(event, region)}
                      onMouseEnter={() => setHoveredRegionId(region.id)}
                      onMouseLeave={() => setHoveredRegionId(null)}
                      onFocus={() => setHoveredRegionId(region.id)}
                      onBlur={() => setHoveredRegionId(null)}
                    >
                      <title>{region.label}</title>
                      <polygon points={region.points} />
                    </g>
                      );
                    })()
                  ))}
                </svg>
                {activeRegions.map((region) => {
                  const locked = !regionIsUnlocked(region, completedQuestSet);
                  const regionColor = mapRegionColor(selectedMapId, region, regionCorruption);
                  return (
                    <button
                      type="button"
                      className={`world-map-label ${locked ? "locked" : ""} ${hoveredRegionId === region.id ? "hovered" : ""}`}
                      style={{
                        "--region-color": regionColor,
                        left: `${region.labelX}%`,
                        top: `${region.labelY}%`,
                      }}
                      key={`${region.id}-label`}
                      aria-label={locked ? `${region.label} er laast. ${regionUnlockText(region, completedQuestSet)}` : `${isWorldMap ? "Aaben" : "Vaelg"} ${region.label}`}
                      title={locked ? `${region.label} er laast. ${regionUnlockText(region, completedQuestSet)}` : region.label}
                      onClick={() => activateRegion(region)}
                      onMouseEnter={() => setHoveredRegionId(region.id)}
                      onMouseLeave={() => setHoveredRegionId(null)}
                      onFocus={() => setHoveredRegionId(region.id)}
                      onBlur={() => setHoveredRegionId(null)}
                    >
                      {locked && (
                        <img
                          className="map-lock-icon"
                          src="/assets/generated/minilock.png"
                          alt=""
                          aria-hidden="true"
                        />
                      )}
                      {region.label}
                    </button>
                  );
                })}
              </>
            )}
          </div>
          {!isWorldMap && (
            <p className="map-note">
              {selectedRegion
                ? regionIsUnlocked(selectedRegion, completedQuestSet)
                  ? `${selectedRegion.label} | id: ${selectedRegion.id} | biodome: ${selectedRegion.biodome ?? "not set"}`
                  : `${selectedRegion.label} er laast. ${regionUnlockText(selectedRegion, completedQuestSet)}`
                : `${activeMap.title} er aabnet som underkort. Klik et omraade for at vaelge det.`}
            </p>
          )}
          {isWorldMap && selectedRegion && !regionIsUnlocked(selectedRegion, completedQuestSet) && (
            <p className="map-note">{selectedRegion.label} er laast. {regionUnlockText(selectedRegion, completedQuestSet)}</p>
          )}
        </div>
        {lockedRegion && (
          <LockedRegionDialog
            completedQuestSet={completedQuestSet}
            region={lockedRegion}
            onClose={() => setLockedRegion(null)}
          />
        )}
      </section>
    </div>
  );
}

function regionIsUnlocked(region, completedQuestSet) {
  if (region?.unlock?.locked) return false;
  const requiredQuests = region?.unlock?.completedQuests ?? [];
  return requiredQuests.every((questId) => completedQuestSet.has(String(questId)));
}

function regionUnlockText(region, completedQuestSet) {
  if (region?.unlock?.text) return region.unlock.text;
  const missingQuests = (region?.unlock?.completedQuests ?? [])
    .filter((questId) => !completedQuestSet.has(String(questId)));
  if (!missingQuests.length) return "Ingen manglende krav.";
  const questNames = missingQuests.map((questId) => QUEST_DEFS[questId]?.title ?? questId);
  return `Kraever quest: ${questNames.join(", ")}.`;
}

function LockedRegionDialog({ region, completedQuestSet, onClose }) {
  const missingQuestIds = (region?.unlock?.completedQuests ?? [])
    .filter((questId) => !completedQuestSet.has(String(questId)));
  return (
    <div className="map-lock-modal-backdrop" role="presentation" onClick={onClose}>
      <section className="map-lock-modal" role="dialog" aria-modal="true" aria-label={`${region.label} er laast`} onClick={(event) => event.stopPropagation()}>
        <header>
          <div className="map-lock-title">
            <img src="/assets/generated/minilock.png" alt="" aria-hidden="true" />
            <div>
              <span className="map-lock-kicker">Laast omraade</span>
              <h3>{region.label}</h3>
            </div>
          </div>
          <button type="button" onClick={onClose}>Luk</button>
        </header>
        {region?.unlock?.text && <p>{region.unlock.text}</p>}
        {missingQuestIds.length > 0 && (
          <div className="map-lock-quests">
            {missingQuestIds.map((questId) => (
              <LockedQuestRequirement questId={questId} key={questId} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function LockedQuestRequirement({ questId }) {
  const quest = QUEST_DEFS[questId];
  const npcId = quest?.npcIds?.[0];
  const npc = npcId ? QUEST_NPCS[npcId] : null;
  return (
    <article className="map-lock-quest">
      <div className="map-lock-quest-head">
        {npc?.imageUrl && <img src={npc.imageUrl} alt={npc.name} />}
        <div>
          <b>{quest?.title ?? questId}</b>
          <span>{npc ? `${npc.name} | ${npc.title}` : "Questgiver ikke sat"}</span>
        </div>
      </div>
      {quest?.story && <p>{quest.story}</p>}
      <div className="map-lock-requirements">
        {questRequirementRows(quest).map((row) => (
          <span className="map-lock-requirement" key={row.key}>
            {row.iconUrl && <img src={row.iconUrl} alt="" aria-hidden="true" />}
            {row.label}
          </span>
        ))}
      </div>
    </article>
  );
}

function questRequirementRows(quest) {
  const target = quest?.target ?? {};
  const rows = [];
  const addQuestItem = (entry) => {
    const def = QUEST_ITEM_DEFS[entry.questItemId];
    rows.push({
      key: `quest-${entry.questItemId}`,
      label: `${entry.count ?? 1}x ${def?.name ?? entry.questItemId}`,
      iconUrl: def?.iconUrl,
    });
  };
  if (target.questItemId) addQuestItem({ questItemId: target.questItemId, count: target.count ?? 1 });
  for (const entry of target.questItems ?? []) addQuestItem(entry);
  for (const entry of target.resources ?? []) {
    const def = RESOURCE_DEFS[entry.resource];
    rows.push({
      key: `resource-${entry.resource}`,
      label: `${entry.count ?? 1}x ${def?.name ?? entry.resource}`,
      iconUrl: iconUrlFromKey(deriveIconKey({ mode: "resource", resourceId: entry.resource })),
    });
  }
  for (const entry of target.items ?? []) {
    rows.push({
      key: `item-${entry.templateId ?? entry.namePrefix ?? entry.baseName ?? "item"}`,
      label: `${entry.count ?? 1}x ${entry.templateId ?? entry.namePrefix ?? entry.baseName ?? "item"}`,
      iconUrl: ITEM_STANDARD_ICON_URL,
    });
  }
  return rows.length ? rows : [{ key: "quest-completion", label: "Fuldfør questen", iconUrl: null }];
}

function HeroDialog({ snapshot, onClose }) {
  const [tab, setTab] = useState("overview");
  const stats = snapshot.player.stats ?? {};
  const monsterRows = Object.entries(stats.killsByMonster ?? {})
    .sort(([a], [b]) => a.localeCompare(b));
  const objectsDestroyed = detailEntries(stats.objectsDestroyedByType);
  const pickedRarity = detailEntries(stats.itemsPickedByRarity);
  const droppedRarity = detailEntries(stats.itemsDroppedByRarity);
  const notPickedRarity = detailEntries(stats.itemsNotPickedByRarity);
  const destroyedRarity = detailEntries(stats.itemsDestroyedByRarity);
  return (
    <div className="confirm-backdrop" role="presentation">
      <section className="hero-dialog" role="dialog" aria-modal="true" aria-label="Hero">
        <header>
          <div className="hero-dialog-title">
            <img src="/assets/generated/ui_hero.png" alt="" />
            <div>
              <h2>Hero</h2>
              <span>Level {snapshot.player.level} | XP {snapshot.player.xp} / {snapshot.player.nextXp}</span>
            </div>
          </div>
          <button type="button" className="city-popup-close" onClick={onClose}>X</button>
        </header>
        <div className="hero-tabs" role="tablist" aria-label="Hero tabs">
          {["overview", "combat", "loot", "quests"].map((id) => (
            <button type="button" className={tab === id ? "active" : ""} key={id} onClick={() => setTab(id)}>{id}</button>
          ))}
        </div>
        {tab === "overview" && (
          <div className="hero-stat-grid">
            <HeroStat label="HP" value={`${snapshot.player.hp} / ${snapshot.player.maxHp}`} />
            <HeroStat label="Mana" value={`${snapshot.player.mana} / ${snapshot.player.maxMana}`} />
            <HeroStat label="Gold" value={snapshot.player.gold} />
            <HeroStat label="Popularity" value={`${snapshot.player.popularity}%`} />
            <HeroStat label="Damage" value={snapshot.player.damage} />
            <HeroStat label="Armor" value={snapshot.player.armor} />
            <HeroStat label="Mode" value={snapshot.player.mode} />
            <HeroStat label="Deaths" value={stats.deaths ?? 0} />
          </div>
        )}
        {tab === "combat" && (
          <>
            <div className="hero-stat-grid">
              <HeroStat label="Damage dealt" value={stats.damageDealt ?? 0} />
              <HeroStat label="Damage taken" value={stats.damageTaken ?? 0} />
              <HeroStat label="Kills total" value={stats.killsTotal ?? 0} />
              <HeroStat label="Melee attacks" value={stats.meleeAttacks ?? 0} />
              <HeroStat label="Ranged attacks" value={stats.rangedAttacks ?? 0} />
              <HeroStat label="Spell projectiles" value={stats.spellProjectiles ?? 0} />
              <HeroStat label="Spells cast" value={stats.spellsCast ?? 0} />
              <HeroStat label="Objects destroyed" value={stats.objectsDestroyed ?? 0} details={objectsDestroyed} />
            </div>
            <HeroDetailSection title="Kills by monster" empty="Ingen kills endnu" rows={monsterRows.map(([name, value]) => `${name}: ${value.normal ?? 0} normal | ${value.elite ?? 0} elite`)} />
          </>
        )}
        {tab === "loot" && (
          <div className="hero-stat-grid">
            <HeroStat label="Gold earned" value={stats.goldEarned ?? 0} />
            <HeroStat label="Gold looted" value={stats.goldLooted ?? 0} />
            <HeroStat label="Items dropped" value={stats.itemsDropped ?? 0} details={droppedRarity} />
            <HeroStat label="Items picked" value={stats.itemsPicked ?? 0} details={pickedRarity} />
            <HeroStat label="Items not picked" value={stats.itemsNotPicked ?? 0} details={notPickedRarity} />
            <HeroStat label="Items destroyed" value={stats.itemsDestroyed ?? 0} details={destroyedRarity} />
            <HeroStat label="Resources picked" value={stats.resourcesPicked ?? 0} />
            <HeroStat label="Health potions" value={stats.healthPotionsUsed ?? 0} />
            <HeroStat label="Mana potions" value={stats.manaPotionsUsed ?? 0} />
          </div>
        )}
        {tab === "quests" && (
          <HeroDetailSection
            title={`Quests completed: ${stats.questsCompleted ?? 0}`}
            empty="Ingen aktive quests"
            rows={(snapshot.quests?.active ?? []).map((quest) => `${quest.title}: ${quest.progressText}`)}
          />
        )}
      </section>
    </div>
  );
}

function HeroStat({ label, value, details = [] }) {
  return (
    <div className="hero-stat" title={details.length ? details.join("\n") : undefined}>
      <span>{label}</span>
      <b>{value}</b>
      {details.length > 0 && <em>{details.slice(0, 2).join(" | ")}</em>}
    </div>
  );
}

function HeroDetailSection({ title, rows, empty }) {
  return (
    <section className="hero-quest-section">
      <h3>{title}</h3>
      {rows.length ? rows.map((row) => <p key={row}>{row}</p>) : <p>{empty}</p>}
    </section>
  );
}

function detailEntries(record = {}) {
  return Object.entries(record)
    .filter(([, value]) => Number(value) > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}: ${value}`);
}

function itemMatchesInventoryFilter(item, filter) {
  if (filter === "merge") return Boolean(item.canMerge);
  if (filter === "resource") return item.mode === "resource";
  if (filter === "unique") return item.unique || item.rarity === "unique";
  return item.mode !== "resource" && item.rarity === filter;
}

function isItemRequiredByActiveQuests(item, activeQuests = []) {
  if (!item || !activeQuests?.length) return false;
  for (const quest of activeQuests) {
    if (quest.type !== "collect_quest_item") continue;
    const target = quest.target ?? {};
    // Quest-specific quest items
    if (target.questItemId && item.mode === "quest" && String(item.questItemId) === String(target.questItemId)) return true;
    if (Array.isArray(target.questItems) && item.mode === "quest") {
      for (const req of target.questItems) {
        if (String(req.questItemId) === String(item.questItemId)) return true;
      }
    }
    // Resource requirements
    if (target.resources && item.mode === "resource") {
      for (const req of target.resources) {
        if (String(req.resource) === String(item.resourceId)) return true;
      }
    }
    // Specific item matching rules
    if (Array.isArray(target.items)) {
      for (const req of target.items) {
        let match = true;
        if (req.templateId) match = match && (String(item.uniqueId) === String(req.templateId) || String(item.namedId) === String(req.templateId));
        if (req.namePrefix) match = match && String(item.name || "").startsWith(`${req.namePrefix} `);
        if (req.baseName) match = match && String(item.baseName || "") === String(req.baseName);
        if (req.rarity) match = match && String(item.rarity || "") === String(req.rarity);
        if (match) return true;
      }
    }
  }
  return false;
}

function CityPage({ engineRef, snapshot, onClose, onQuestCompleted }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(0);
  const keysRef = useRef(new Set());
  const selectedBuildingRef = useRef(null);
  const activeMarkerRef = useRef(null);
  const nearbyBuildingRef = useRef(null);
  const nearbyQuestNpcRef = useRef(null);
  const snapshotRef = useRef(snapshot);
  const [loadingCity, setLoadingCity] = useState(!cityAssetCache.assets);
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [selectedQuestNpcId, setSelectedQuestNpcId] = useState(null);
  const [nearbyBuildingId, setNearbyBuildingId] = useState(null);
  const [nearbyQuestNpcId, setNearbyQuestNpcId] = useState(null);
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
    npcImages: {},
    staticLayer: null,
    time: 0,
    gait: 0,
  });
  const cityProgressRef = useRef(cityProgress);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    cityProgressRef.current = cityProgress;
    saveCityProgress(cityProgress);
  }, [cityProgress]);

  useEffect(() => {
    selectedBuildingRef.current = selectedBuildingId;
  }, [selectedBuildingId]);

  useEffect(() => {
    let cancelled = false;
    loadCityAssets().then(({ atlas, animationSheets, houseSprites, npcImages }) => {
      if (cancelled) return;
      cityStateRef.current.atlas = atlas;
      cityStateRef.current.animationSheets = animationSheets;
      cityStateRef.current.houseSprites = houseSprites;
      cityStateRef.current.npcImages = npcImages ?? {};
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
      if (key === "e" && nearbyQuestNpcRef.current) {
        event.preventDefault();
        setSelectedQuestNpcId(nearbyQuestNpcRef.current);
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
      const questNpcHit = findTouchedCityQuestNpc(layout, snapshotRef.current.quests?.active ?? [], city.heroGX, city.heroGY);
      if (!questNpcHit) {
        nearbyQuestNpcRef.current = null;
        setNearbyQuestNpcId((current) => current === null ? current : null);
      } else {
        nearbyQuestNpcRef.current = questNpcHit.npcId;
        setNearbyQuestNpcId((current) => current === questNpcHit.npcId ? current : questNpcHit.npcId);
      }
      if (!markerHit) {
        activeMarkerRef.current = null;
        nearbyBuildingRef.current = null;
        setNearbyBuildingId((current) => current === null ? current : null);
      } else {
        activeMarkerRef.current = markerHit.id;
        nearbyBuildingRef.current = markerHit.id;
        setNearbyBuildingId((current) => current === markerHit.id ? current : markerHit.id);
      }

      drawIsometricCityScene(ctx, width, height, layout, city, cityProgressRef.current, snapshotRef.current.quests ?? {}, moved);
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
        <button type="button" className="city-close" onClick={onClose} title="Til wilderness" aria-label="Til wilderness">
          <ImageIcon src={QUICKBAR_WILDERNESS_ICON_URL} />
        </button>
      </header>
      <canvas ref={canvasRef} className="city-canvas" aria-label="City" />
      {loadingCity && (
        <div className="city-loading" role="status">
          <b>Building city</b>
          <span>Preparing fixed city assets...</span>
        </div>
      )}
      {!loadingCity && (nearbyQuestNpcId || nearbyBuildingId) && !selectedBuildingId && !selectedQuestNpcId && (
        <div className="city-interact-prompt">
          Press <b>E</b> to open {nearbyQuestNpcId
            ? `${QUEST_NPCS[nearbyQuestNpcId]?.name ?? "questgiver"}`
            : CITY_BUILDINGS.find((entry) => entry.id === nearbyBuildingId)?.title ?? "building"}
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
      {!loadingCity && selectedQuestNpcId && (
        <CityQuestPopup
          npcId={selectedQuestNpcId}
          engineRef={engineRef}
          quests={snapshot.quests?.active ?? []}
          onQuestCompleted={onQuestCompleted}
          onClose={() => setSelectedQuestNpcId(null)}
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
      Promise.all(Object.entries(QUEST_NPCS).map(([npcId, npc]) => (
        loadImage(npc.imageUrl)
          .then((image) => [npcId, removeGreenScreen(image)])
          .catch(() => [npcId, null])
      ))),
    ]).then(([atlas, animationSheets, cityImage, npcImageEntries]) => {
      cityAssetCache.assets = {
        atlas,
        animationSheets,
        houseSprites: buildCitySprites(cityImage),
        npcImages: Object.fromEntries(npcImageEntries),
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

function drawIsometricCityScene(ctx, width, height, layout, city, progress, quests, moving) {
  drawCityBackdrop(ctx, width, height);
  const camera = getCityCamera(width, height, city);
  const terrain = city.staticLayer ?? buildCityTerrainLayer(layout, city.atlas);
  const terrainOrigin = worldToScreen(0, 0, 0, camera);
  ctx.drawImage(terrain.canvas, terrainOrigin.x - terrain.originX, terrainOrigin.y - terrain.originY);

  const activeNpcs = getActiveCityQuestNpcs(layout, quests?.active ?? [], quests?.cityFade ?? []);
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
    ...activeNpcs.map((npc) => ({ type: "npc", ...npc, depth: npc.gx + npc.gy + 0.18 })),
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
    if (entity.type === "npc") {
      drawCityQuestNpc(ctx, entity, city.npcImages?.[entity.npcId], camera, city.walkClock);
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

function findTouchedCityQuestNpc(layout, activeQuests, gx, gy) {
  for (const npc of getActiveCityQuestNpcs(layout, activeQuests, [])) {
    if (Math.hypot(gx - npc.gx, gy - npc.gy) <= 0.85) return npc;
  }
  return null;
}

function getActiveCityQuestNpcs(layout, activeQuests, cityFade = []) {
  const byNpc = new Map();
  for (const quest of activeQuests ?? []) {
    if (!quest?.npcId || byNpc.has(quest.npcId)) continue;
    byNpc.set(quest.npcId, quest);
  }
  for (const fade of cityFade ?? []) {
    if (!fade?.npcId || byNpc.has(fade.npcId)) continue;
    byNpc.set(fade.npcId, { npcId: fade.npcId, fading: true, fadeStartedAt: fade.startedAt });
  }
  const occupiedSpots = [];
  return [...byNpc.values()].map((quest, index) => {
    const npc = QUEST_NPCS[quest.npcId];
    const preferred = cityNpcLocation(layout, npc?.cityLocation, index);
    const base = resolveCityNpcLocation(layout, preferred, occupiedSpots);
    occupiedSpots.push(base);
    const fadeAge = quest.fading ? Math.max(0, Date.now() - (quest.fadeStartedAt ?? Date.now())) : 0;
    return {
      ...base,
      npcId: quest.npcId,
      quest,
      alpha: quest.fading ? Math.max(0, 1 - fadeAge / 1200) : 1,
    };
  });
}

function cityNpcLocation(layout, cityLocation, index = 0) {
  const buildingByLocation = {
    blacksmith: 1,
    farm: 0,
    inn: 5,
    mage_tower: 2,
    library: 6,
  };
  const spriteIndex = buildingByLocation[cityLocation];
  if (Number.isInteger(spriteIndex)) {
    const house = layout.houses[spriteIndex] ?? layout.houses[0];
    return { gx: house.gx + 1.05, gy: house.gy + 0.76 };
  }
  const openSpots = [
    { gx: 9.1, gy: 10.9 },
    { gx: 11.9, gy: 9.4 },
    { gx: 16.2, gy: 10.9 },
    { gx: 10.1, gy: 15.2 },
    { gx: 4.2, gy: 10.8 },
  ];
  return openSpots[index % openSpots.length];
}

function resolveCityNpcLocation(layout, preferred, occupiedSpots) {
  const candidates = [preferred, ...buildCityNpcSpotRing(preferred, 6, 0.92)];
  for (const candidate of candidates) {
    if (!isRoadPassable(layout, candidate.gx, candidate.gy, 0.22)) continue;
    if (occupiedSpots.some((spot) => Math.hypot(candidate.gx - spot.gx, candidate.gy - spot.gy) < 0.75)) continue;
    return candidate;
  }
  return preferred;
}

function buildCityNpcSpotRing(origin, maxRadius = 6, step = 0.92) {
  const spots = [];
  for (let radius = 1; radius <= maxRadius; radius += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        spots.push({
          gx: origin.gx + dx * step,
          gy: origin.gy + dy * step,
        });
      }
    }
  }
  return spots;
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

function drawCityQuestNpc(ctx, npc, image, camera, time) {
  const screen = worldToScreen(npc.gx, npc.gy, 0, camera);
  const bob = Math.sin(time * 3.2 + npc.gx + npc.gy) * 2;
  const alpha = npc.alpha ?? 1;
  drawShadow(ctx, screen.x, screen.y + 12, 18, 6, 0.22 * alpha);
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (image) {
    const height = 74;
    const width = height * (image.width / image.height);
    ctx.drawImage(image, screen.x - width * 0.5, screen.y - height + 15 + bob, width, height);
  } else {
    ctx.fillStyle = "#d6c18a";
    ctx.beginPath();
    ctx.arc(screen.x, screen.y - 30 + bob, 14, 0, Math.PI * 2);
    ctx.fill();
  }
  if (!npc.quest?.fading) {
    drawCityQuestStatusMarker(ctx, { gx: npc.gx, gy: npc.gy, phase: 0.2, complete: npc.quest?.complete }, camera, time);
  }
  ctx.restore();
}

function drawCityQuestStatusMarker(ctx, marker, camera, time) {
  const screen = worldToScreen(marker.gx, marker.gy, 0, camera);
  const bob = Math.sin(time * 4.5 + marker.phase) * 4;
  const x = screen.x;
  const y = screen.y - 64 + bob;
  const complete = Boolean(marker.complete);
  ctx.save();
  ctx.font = "900 30px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = complete ? "#ffcf32" : "#ff4d3f";
  ctx.shadowBlur = 12;
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#361b08";
  ctx.fillStyle = complete ? "#ffd94a" : "#ff4d3f";
  ctx.strokeText(complete ? "?" : "!", x, y);
  ctx.fillText(complete ? "?" : "!", x, y);
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

function CityQuestPopup({ npcId, engineRef, quests, onClose, onQuestCompleted }) {
  const npc = QUEST_NPCS[npcId];
  const npcQuests = quests.filter((quest) => quest.npcId === npcId).slice(0, 1);
  if (!npc || !npcQuests.length) return null;

  const turnIn = (quest) => {
    const result = engineRef.current?.completeQuest?.(quest.id);
    if (result?.ok) {
      onQuestCompleted?.(result);
      onClose();
    }
  };

  return (
    <div className="city-popup-backdrop">
      <section className="city-popup quest-popup" role="dialog" aria-modal="true" aria-label={npc.name}>
        <header className="city-popup-header">
          <div>
            <h3>{npc.name}</h3>
            <span>{npc.title}</span>
          </div>
          <button type="button" className="city-popup-close" onClick={onClose}>X</button>
        </header>
        <div className="quest-npc-summary">
          <img src={npc.imageUrl} alt="" />
          <p>{npc.cityHint}</p>
        </div>
        <main className="quest-list">
          {npcQuests.map((quest) => (
            <article className={`quest-card ${quest.complete ? "complete" : ""}`} key={quest.id}>
              <header>
                <b>{quest.title}</b>
                <span>{quest.progressText}</span>
              </header>
              <p>{quest.complete ? quest.turnInText : quest.story}</p>
              <button type="button" disabled={!quest.complete} onClick={() => turnIn(quest)}>
                Indlever quest
              </button>
            </article>
          ))}
        </main>
      </section>
    </div>
  );
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
  if (resourceId === "gold") {
    return <InventoryIcon iconSheet="items" iconUrl={ITEM_GOLD_ICON_URL} />;
  }
  const def = RESOURCE_DEFS[resourceId];
  if (!def) return <i className="city-cost-missing-icon" aria-hidden="true" />;
  const iconUrl = iconUrlFromKey(deriveIconKey({ mode: "resource", resourceId }));
  return (
    <InventoryIcon
      iconIndex={def.iconIndex}
      iconSheet={def.sheet ?? "resources"}
      iconUrl={def.iconUrl ?? iconUrl}
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
    const itemFallbackSource = ITEM_STANDARD_ICON_URL;
    const fallbackSource = (
      iconSheet === "armor"
        ? "/assets/generated/armor001_sheet.png"
        : iconSheet === "resources"
          ? "/assets/generated/res_sheet_001.png"
          : iconSheet === "gemstones"
            ? "/assets/generated/res_sheet_002.png"
          : "/assets/generated/items001_sheet.png"
    );
    const iconFallbackSource = itemFallbackSource;

    const source = iconUrl || fallbackSource;
    if (!iconSheetPromises.has(source)) {
      iconSheetPromises.set(source, new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = source;
      }));
    }

    if (!iconSheetPromises.has(iconFallbackSource)) {
      iconSheetPromises.set(iconFallbackSource, new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = iconFallbackSource;
      }));
    }

    iconSheetPromises.get(source).then((image) => {
      if (cancelled || !canvasRef.current) return;
      if (iconUrl) {
        drawCustomInventoryIcon(canvasRef.current, image);
      } else {
        drawInventoryIcon(canvasRef.current, image, iconIndex, iconSheet);
      }
    }).catch(() => {
      iconSheetPromises.get(iconFallbackSource)?.then((image) => {
        if (cancelled || !canvasRef.current) return;
        drawCustomInventoryIcon(canvasRef.current, image);
      }).catch(() => {});
    });

    return () => {
      cancelled = true;
    };
  }, [iconIndex, iconSheet, iconUrl]);

  return <canvas ref={canvasRef} className="inventory-icon" width="52" height="52" aria-hidden="true" />;
}

function ImageIcon({ src }) {
  return <img className="hud-image-icon" src={src} alt="" />;
}

function AtlasIcon({ frameName }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled || !canvasRef.current) return;
      const frame = ATLAS_FRAMES[frameName];
      if (!frame) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const temp = document.createElement("canvas");
      temp.width = frame.w;
      temp.height = frame.h;
      const tctx = temp.getContext("2d", { willReadFrequently: true });
      tctx.drawImage(image, frame.x, frame.y, frame.w, frame.h, 0, 0, frame.w, frame.h);
      const imageData = tctx.getImageData(0, 0, temp.width, temp.height);
      const { data } = imageData;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (g > 135 && g > r * 1.45 && g > b * 1.35) data[i + 3] = 0;
      }
      tctx.putImageData(imageData, 0, 0);
      const bounds = expandBounds(alphaBoundsFromCanvas(temp), temp.width, temp.height, frameName === "orb" ? 18 : 3);
      const scale = Math.min((canvas.width - 6) / bounds.w, (canvas.height - 6) / bounds.h, frameName === "orb" ? 0.34 : Infinity);
      const width = bounds.w * scale;
      const height = bounds.h * scale;
      ctx.drawImage(temp, bounds.x, bounds.y, bounds.w, bounds.h, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
    };
    image.src = "/assets/generated/runebound-atlas-source.png";
    return () => {
      cancelled = true;
    };
  }, [frameName]);
  return <canvas ref={canvasRef} className="inventory-icon" width="52" height="52" aria-hidden="true" />;
}

function alphaBoundsFromCanvas(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      if (data[(y * canvas.width + x) * 4 + 3] <= 20) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX <= minX || maxY <= minY) return { x: 0, y: 0, w: canvas.width, h: canvas.height };
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function expandBounds(bounds, maxW, maxH, pad) {
  const x = Math.max(0, bounds.x - pad);
  const y = Math.max(0, bounds.y - pad);
  const right = Math.min(maxW, bounds.x + bounds.w + pad);
  const bottom = Math.min(maxH, bounds.y + bounds.h + pad);
  return { x, y, w: right - x, h: bottom - y };
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
