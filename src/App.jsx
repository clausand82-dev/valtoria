import React, { useEffect, useMemo, useRef, useState } from "react";
import { MAX_INVENTORY, RARITIES, TILE_H, TILE_W } from "./game/data.js";
import { drawGroundTile, drawShadow, loadGeneratedAtlas } from "./game/assets-ground.js";
import { GameEngine } from "./game/GameEngine.js";
import { makeItem, itemValue } from "./game/world.js";
import { makeResourceItem } from "./game/GameEngine/helpers.js";
import { ATLAS_FRAMES } from "./game/assets.js";
import { screenToWorld, worldToIso, worldToScreen } from "./game/iso.js";
import { RESOURCE_DEFS, RESOURCE_MERGE_RECIPES } from "./game/config/resource-config.js";
import { READABLE_DEF_BY_ID, READABLE_ITEM_DEFS } from "./game/config/readable-config.js";
import { CITY_AREAS, CITY_AREA_LABEL_OPTIONS, CITY_MAP_IMAGE, CITY_NPC_AREA, CITY_NPC_POINTS } from "./game/config/city-areas-config.js";
import { CITY_BUILDINGS } from "./game/config/city-buildings-config.js";
import { DURABILITY_DEFAULT, DURABILITY_DEGRADE_CHANCE, DURABILITY_DEGRADE_MIN_PCT, DURABILITY_DEGRADE_MAX_PCT } from "./game/config/durability-config.js";
import { CITY_STATS_RULES } from "./game/config/city-stats-rules-config.js";
import { SPELL_DEFS } from "./game/config/spell-config.js";
import { GEM_SOCKET_BONUSES, MAX_ITEM_SOCKETS, itemCanHaveSockets, normalizeSockets } from "./game/config/socket-config.js";
import {
  SKILL_TREE_BRANCHES,
  skillTreeAvailablePoints,
  skillTreeBranchSpentPoints,
  normalizeSkillTree,
} from "./game/config/skill-tree-config.js";
import { AREA_MAPS, MAP_REGION_SETS, WORLD_MAP } from "./game/config/map-region-config.js";
import { QUEST_DEFS, QUEST_ITEM_DEFS } from "./game/config/quest-config.js";
import { QUEST_NPCS } from "./game/config/npc-config.js";
import { SAVE_STORAGE_KEY, SAVE_VERSION, SHOW_INACTIVE_CITY_NPCS } from "./game/config/game-engine-config.js";
import {
  deriveIconKey,
  iconUrlFromKey,
  isEquippableItem,
  isPotionItem,
  isQuestItem,
  isReadableItem,
  isResourceItem,
} from "./game/item-system.js";

const cityAssetCache = {
  promise: null,
  assets: null,
};

const cityPrebuildCache = {
  layout: null,
};

const CITY_STORAGE_KEY = "runebound-depths-city-v1";
const SAVE_INDEX_STORAGE_KEY = "runebound-depths-save-index-v1";
const SAVE_SLOT_STORAGE_PREFIX = "runebound-depths-save-slot-v1-";
const CITY_SLOT_STORAGE_PREFIX = "runebound-depths-city-slot-v1-";
const REGION_CORRUPTION_SLOT_STORAGE_PREFIX = "runebound-depths-region-corruption-slot-v1-";
const REGION_MAP_LAST_SLOT_STORAGE_PREFIX = "runebound-depths-region-map-last-slot-v1-";

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
    skillTree: normalizeSkillTree(),
    skillPoints: 0,
    unlockedSpells: ["ember_spark"],
    activeSpellId: "ember_spark",
    activeSpellTitle: "Ember Spark",
    critChance: 0,
    critDamage: 1.5,
    blockChance: 0,
    dodgeChance: 0,
    lifeSteal: 0,
    magicFind: 0,
    goldFind: 0,
    resourceFind: 0,
    xpGain: 0,
  },
  zone: { name: "Stonewake Wilds", level: 1, seed: 7341 },
  region: { name: "Stonewake Wilds", index: 1, seed: 7341 },
  regionRun: null,
  mapReturn: null,
  mobs: { total: 0, alive: 0, killed: 0 },
  exitPrompt: false,
  nearbyFoliageLoot: null,
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
const QUICKBAR_QUEST_ICON_URL = "/assets/generated/item/item_res_scroll.png";
const ITEM_STANDARD_ICON_URL = "/assets/generated/item/item_standard.png";
const ITEM_GOLD_ICON_URL = "/assets/generated/item/item_gold.png";
const ITEM_MONEY_ICON_URL = "/assets/generated/item/item_gold.png";
const CITY_STAT_ALIASES = {
  defence: "city_defence",
  cityDefence: "city_defence",
  city_defence: "city_defence",
  citizensHealth: "citizens_health",
  citizens_health: "citizens_health",
  food: "provision",
};
const CITY_STAT_DEFS = [
  { id: "city_defence", classId: "defence", label: "CITY DEFENCE" },
  { id: "population", label: "POPULATION" },
  { id: "housing", label: "HOUSING" },
  { id: "provision", label: "PROVISION" },
  { id: "water", label: "WATER" },
  { id: "army", label: "ARMY" },
  { id: "happiness", label: "HAPPINESS" },
  { id: "citizens_health", classId: "citizens-health", label: "CITIZENS HEALTH" },
  { id: "xp", label: "XP", max: (snapshot) => snapshot.player?.nextXp ?? 1 },
  { id: "popularity", label: "POPULARITY", max: 100 },
  { id: "gold", label: "GOLD", max: 999999 },
];
const CITY_CITIZEN_CONDITION_DEFS = [
  { id: "homeless_people", label: "Homeless" },
  { id: "hungry_people", label: "Hungry" },
  { id: "thirsty_people", label: "Thirsty" },
  { id: "sick_people", label: "Sick" },
  { id: "angry_people", label: "Angry" },
];
const CITY_STAT_ICON_URLS = {
  city_defence: "/assets/generated/icon/icon_citydefence.png",
  population: "/assets/generated/icon/icon_population.png",
  housing: "/assets/generated/icon/icon_housing.png",
  provision: "/assets/generated/icon/icon_provision.png",
  water: "/assets/generated/icon/icon_water.png",
  army: "/assets/generated/icon/icon_army.png",
  happiness: "/assets/generated/icon/icon_happiness.png",
  citizens_health: "/assets/generated/icon/icon_health.png",
  hungry_people: "/assets/generated/icon/icon_hunger.png",
  homeless_people: "/assets/generated/icon/icon_homeless.png",
  thirsty_people: "/assets/generated/icon/icon_thirst.png",
  sick_people: "/assets/generated/icon/icon_sick.png",
  angry_people: "/assets/generated/icon/icon_angry.png",
  xp: "/assets/generated/icon/icon_xp.png",
  popularity: "/assets/generated/icon/icon_popularity.png",
  gold: ITEM_MONEY_ICON_URL,
};
const CITY_BUILDING_CHIPS_ALWAYS_VISIBLE = true;
const REGION_CORRUPTION_STORAGE_KEY = "runebound-depths-region-corruption-v1";
const REGION_MAP_LAST_ID_STORAGE_KEY = "runebound-depths-region-map-last-id-v1";

function regionStatusKey(areaMapId, regionId) {
  return `${areaMapId}:${regionId}`;
}

function loadRegionCorruption(storageKey = REGION_CORRUPTION_STORAGE_KEY) {
  const initial = {};
  for (const [areaMapId, regions] of Object.entries(MAP_REGION_SETS)) {
    if (areaMapId === WORLD_MAP.id) continue;
    for (const region of regions) {
      initial[regionStatusKey(areaMapId, region.id)] = region.corrupted !== false;
    }
  }

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
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

function loadRegionMapInitialId(storageKey = REGION_MAP_LAST_ID_STORAGE_KEY) {
  try {
    const saved = String(localStorage.getItem(storageKey) || "").trim();
    if (saved === WORLD_MAP.id) return WORLD_MAP.id;
    if (saved && AREA_MAPS[saved]) return saved;
  } catch {
    // Fallback to world map when storage is unavailable.
  }
  return WORLD_MAP.id;
}

function saveRegionCorruption(regionCorruption, storageKey = REGION_CORRUPTION_STORAGE_KEY) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(regionCorruption));
  } catch {
    // Ignore quota or storage-denied errors.
  }
}

function mapRegionColor(mapId, region, regionCorruption) {
  if (mapId === WORLD_MAP.id) return region.color;
  const corrupted = regionCorruption[regionStatusKey(mapId, region.id)] ?? region.corrupted ?? true;
  return corrupted ? "#d94343" : "#58d96d";
}

function saveSlotKeys(slotId) {
  return {
    saveKey: `${SAVE_SLOT_STORAGE_PREFIX}${slotId}`,
    cityStorageKey: `${CITY_SLOT_STORAGE_PREFIX}${slotId}`,
    regionCorruptionStorageKey: `${REGION_CORRUPTION_SLOT_STORAGE_PREFIX}${slotId}`,
    regionMapLastIdStorageKey: `${REGION_MAP_LAST_SLOT_STORAGE_PREFIX}${slotId}`,
  };
}

function normalizeSaveSlot(slot) {
  if (!slot || typeof slot !== "object") return null;
  const id = String(slot.id ?? "").trim();
  if (!id) return null;
  const keys = saveSlotKeys(id);
  return {
    id,
    label: String(slot.label ?? "Valtoria Save").trim() || "Valtoria Save",
    createdAt: Math.max(0, Number(slot.createdAt) || 0),
    updatedAt: Math.max(0, Number(slot.updatedAt) || 0),
    legacy: Boolean(slot.legacy),
    saveKey: String(slot.saveKey ?? keys.saveKey),
    cityStorageKey: String(slot.cityStorageKey ?? keys.cityStorageKey),
    regionCorruptionStorageKey: String(slot.regionCorruptionStorageKey ?? keys.regionCorruptionStorageKey),
    regionMapLastIdStorageKey: String(slot.regionMapLastIdStorageKey ?? keys.regionMapLastIdStorageKey),
  };
}

function readSavePayloadAt(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== SAVE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function readSaveIndex() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVE_INDEX_STORAGE_KEY) || "{}");
    const rawSlots = Array.isArray(parsed) ? parsed : Array.isArray(parsed.slots) ? parsed.slots : [];
    return rawSlots.map(normalizeSaveSlot).filter(Boolean);
  } catch {
    return [];
  }
}

function writeSaveIndex(slots) {
  try {
    localStorage.setItem(SAVE_INDEX_STORAGE_KEY, JSON.stringify({ version: 1, slots }));
  } catch {
    // Save slot metadata is convenience data; the actual save payload is stored separately.
  }
}

function upsertSaveSlot(slot) {
  const normalized = normalizeSaveSlot(slot);
  if (!normalized || normalized.legacy) return normalized;
  const slots = readSaveIndex();
  const next = [normalized, ...slots.filter((entry) => entry.id !== normalized.id)];
  writeSaveIndex(next);
  return normalized;
}

function createSaveSlot() {
  const createdAt = Date.now();
  const id = `${createdAt.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return normalizeSaveSlot({
    id,
    label: `Valtoria ${formatSaveTimestamp(createdAt)}`,
    createdAt,
    updatedAt: createdAt,
    ...saveSlotKeys(id),
  });
}

function collectSaveSlots() {
  const indexedSlots = readSaveIndex();
  const usedSaveKeys = new Set(indexedSlots.map((slot) => slot.saveKey));
  const legacyPayload = readSavePayloadAt(SAVE_STORAGE_KEY);
  const slots = [...indexedSlots];
  if (legacyPayload && !usedSaveKeys.has(SAVE_STORAGE_KEY)) {
    const savedAt = Math.max(0, Number(legacyPayload.savedAt) || 0);
    slots.unshift(normalizeSaveSlot({
      id: "legacy-autosave",
      label: "Legacy Autosave",
      createdAt: savedAt,
      updatedAt: savedAt,
      legacy: true,
      saveKey: SAVE_STORAGE_KEY,
      cityStorageKey: CITY_STORAGE_KEY,
      regionCorruptionStorageKey: REGION_CORRUPTION_STORAGE_KEY,
      regionMapLastIdStorageKey: REGION_MAP_LAST_ID_STORAGE_KEY,
    }));
  }
  return slots.map(summarizeSaveSlot).filter(Boolean);
}

function summarizeSaveSlot(slot) {
  const payload = readSavePayloadAt(slot.saveKey);
  const savedAt = Math.max(0, Number(payload?.savedAt) || Number(slot.updatedAt) || Number(slot.createdAt) || 0);
  const player = payload?.player ?? {};
  return {
    ...slot,
    exists: Boolean(payload),
    updatedAt: savedAt,
    level: Math.max(1, Math.floor(Number(player.level) || 1)),
    gold: Math.max(0, Math.floor(Number(player.gold) || 0)),
    activeQuestCount: Array.isArray(payload?.quests?.active) ? payload.quests.active.length : 0,
  };
}

function formatSaveTimestamp(timestamp) {
  if (!timestamp) return "No date";
  try {
    return new Intl.DateTimeFormat("da-DK", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toLocaleString();
  }
}

export default function App() {
  const canvasRef = useRef(null);
  const minimapRef = useRef(null);
  const engineRef = useRef(null);
  const [gameSession, setGameSession] = useState(null);
  const [menuView, setMenuView] = useState("main");
  const [saveSlots, setSaveSlots] = useState(collectSaveSlots);
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [regionMapOpen, setRegionMapOpen] = useState(false);
  const [regionMapInitialId, setRegionMapInitialId] = useState(WORLD_MAP.id);
  const [regionCorruption, setRegionCorruption] = useState(() => loadRegionCorruption());
  const [heroOpen, setHeroOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [inventoryFilter, setInventoryFilter] = useState("all");
  const [mergeChoice, setMergeChoice] = useState(null);
  const [readableDialog, setReadableDialog] = useState(null);
  const [questOffer, setQuestOffer] = useState(null);
  const [acceptedQuestNotice, setAcceptedQuestNotice] = useState(null);
  const [questRewardModal, setQuestRewardModal] = useState(null);
  const [viewedQuest, setViewedQuest] = useState(null);
  const [questOverviewOpen, setQuestOverviewOpen] = useState(false);
  const [confirmMapAbandonOpen, setConfirmMapAbandonOpen] = useState(false);
  const [cityMinimapHero, setCityMinimapHero] = useState(null);
  const [cityProgressHud, setCityProgressHud] = useState(() => loadCityProgress());
  const snapshotRef = useRef(emptySnapshot);
  const gameSessionRef = useRef(null);
  const lastMapReturnIdRef = useRef(null);
  const lastCityOpenRef = useRef(false);
  const lastCityRollSessionRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const preload = () => {
      if (!cancelled) loadCityAssets().catch(() => {});
    };
    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(preload, { timeout: 1000 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback?.(idleId);
      };
    }
    const timeoutId = window.setTimeout(preload, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    gameSessionRef.current = gameSession;
  }, [gameSession]);

  useEffect(() => {
    if (!gameSession || !canvasRef.current) return undefined;
    const slot = gameSession.slot;
    const engine = new GameEngine(canvasRef.current, setSnapshot, {
      saveStorageKey: slot.saveKey,
      newGame: gameSession.newGame,
      onSave: (payload) => {
        if (!slot.legacy) upsertSaveSlot({ ...slot, updatedAt: payload?.savedAt ?? Date.now() });
        setSaveSlots(collectSaveSlots());
      },
    });
    engineRef.current = engine;
    engine.start();
    if (gameSession.newGame) engine.saveProgress({ force: true });
    return () => {
      engine.stop();
      engineRef.current = null;
    };
  }, [gameSession?.sessionId]);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    const enteredCity = cityOpen && !lastCityOpenRef.current;
    lastCityOpenRef.current = cityOpen;
    if (!cityOpen || !gameSession?.sessionId || !engineRef.current) return;
    if (enteredCity) engineRef.current.restoreVitalsForCity?.();
    if (!enteredCity && lastCityRollSessionRef.current === gameSession.sessionId) return;
    lastCityRollSessionRef.current = gameSession.sessionId;
    engineRef.current.rollCityRepeatableQuestOffers?.();
  }, [cityOpen, gameSession?.sessionId]);

  useEffect(() => {
    if (!gameSession?.slot?.regionCorruptionStorageKey) return;
    saveRegionCorruption(regionCorruption, gameSession.slot.regionCorruptionStorageKey);
  }, [gameSession?.slot?.regionCorruptionStorageKey, regionCorruption]);

  useEffect(() => {
    if (!gameSession?.slot?.regionMapLastIdStorageKey) return;
    try {
      localStorage.setItem(gameSession.slot.regionMapLastIdStorageKey, regionMapInitialId);
    } catch {
      // Ignore storage-denied errors.
    }
  }, [gameSession?.slot?.regionMapLastIdStorageKey, regionMapInitialId]);

  useEffect(() => {
    setCityProgressHud(loadCityProgress(gameSession?.slot?.cityStorageKey ?? CITY_STORAGE_KEY));
  }, [gameSession?.slot?.cityStorageKey, cityOpen]);

  useEffect(() => {
    const mapReturn = snapshot.mapReturn;
    if (!mapReturn?.id || lastMapReturnIdRef.current === mapReturn.id) return;
    lastMapReturnIdRef.current = mapReturn.id;
    const cityStorageKey = gameSessionRef.current?.slot?.cityStorageKey ?? CITY_STORAGE_KEY;
    const wasCorrupted = regionCorruption[regionStatusKey(mapReturn.areaMapId, mapReturn.regionId)] ?? true;
    const populationProgress = applyMapReturnPopulationProgress(loadCityProgress(cityStorageKey), mapReturn, wasCorrupted);
    if (populationProgress.changed) {
      saveCityProgress(populationProgress.progress, cityStorageKey);
      setCityProgressHud(populationProgress.progress);
    }
    setRegionCorruption((current) => ({
      ...current,
      [regionStatusKey(mapReturn.areaMapId, mapReturn.regionId)]: !mapReturn.cleared,
    }));
    setRegionMapInitialId(mapReturn.areaMapId ?? WORLD_MAP.id);
    setRegionMapOpen(false);
    setMapOpen(false);
    setInventoryOpen(false);
    setHeroOpen(false);
    setCityOpen(true);
    setConfirmMapAbandonOpen(false);
  }, [snapshot.mapReturn, regionCorruption]);

  useEffect(() => {
    if (!import.meta.hot) return undefined;
    const openWorldMapAfterHotUpdate = () => {
      if (!gameSessionRef.current) return;
      setRegionMapInitialId(WORLD_MAP.id);
      setRegionMapOpen(false);
      setMapOpen(false);
      setInventoryOpen(false);
      setHeroOpen(false);
      setCityOpen(true);
    };
    import.meta.hot.on("vite:afterUpdate", openWorldMapAfterHotUpdate);
    return () => import.meta.hot.off("vite:afterUpdate", openWorldMapAfterHotUpdate);
  }, []);

  useEffect(() => {
    const handleKey = (event) => {
      if (!gameSessionRef.current) return;
      // Allow inventory/map/hero hotkeys while city is open; city should not
      // block access to quickbar functionality.
      const key = event.key.toLowerCase();
      if (key === "i") setInventoryOpen((value) => !value);
      if (key === "m" && !cityOpen) setMapOpen((value) => !value);
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
    const modalOpen = cityOpen
      || mapOpen
      || regionMapOpen
      || heroOpen
      || questOverviewOpen
      || confirmMapAbandonOpen
      || Boolean(questOffer)
      || Boolean(acceptedQuestNotice);
    engineRef.current?.setInputLocked(modalOpen);
    engineRef.current?.setPaused(modalOpen);
    if (cityOpen) {
      setInventoryOpen(false);
      setSelectedItem(null);
    }
    return () => {
      engineRef.current?.setInputLocked(false);
      engineRef.current?.setPaused(false);
    };
  }, [cityOpen, mapOpen, regionMapOpen, heroOpen, questOverviewOpen, confirmMapAbandonOpen, questOffer, acceptedQuestNotice]);

  useEffect(() => {
    if (!minimapRef.current) return;
    if (cityOpen) {
      return;
    }
    engineRef.current?.renderMinimap(minimapRef.current);
  }, [snapshot, cityOpen, cityMinimapHero]);

  useEffect(() => {
    if (!inventoryOpen) {
      setSelectedItem(null);
      setReadableDialog(null);
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
  const derivedCityStats = useMemo(
    () => calculateCityStats(cityProgressHud, snapshot),
    [cityProgressHud, snapshot],
  );
  const cityHudStats = useMemo(() => CITY_STAT_DEFS.map((stat) => {
    const value = Math.max(0, Math.floor(Number(derivedCityStats[stat.id]) || 0));
    const configuredMax = CITY_STATS_RULES.displayMax?.[stat.id] ?? 500;
    const max = Math.max(1, Math.floor(Number(typeof stat.max === "function" ? stat.max(snapshot) : stat.max ?? configuredMax) || 1));
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    const label = stat.id === "popularity" ? `${stat.label} ${Math.round(value)}%` : `${stat.label} ${value}`;
    return { ...stat, value, max, pct, label, classId: stat.classId ?? stat.id };
  }), [derivedCityStats, snapshot]);
  const hoverMonster = snapshot.hoverMonster;
  const monsterHpPct = hoverMonster
    ? Math.max(0, Math.min(100, (hoverMonster.hp / hoverMonster.maxHp) * 100))
    : 0;
  const inventorySlots = useMemo(() => (
    Array.from({ length: MAX_INVENTORY }, (_, index) => snapshot.inventory[index] ?? null)
  ), [snapshot.inventory]);
  const activeQuests = snapshot.quests?.active ?? [];
  const trackedQuests = useMemo(
    () => activeQuests.filter((quest) => quest.tracked !== false),
    [activeQuests],
  );
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
    setCityOpen(false);
  };

  const beginSession = (slot, newGame = false) => {
    const normalizedSlot = normalizeSaveSlot(slot);
    if (!normalizedSlot) return;
    loadCityAssets().catch(() => {});
    if (!normalizedSlot.legacy) upsertSaveSlot(normalizedSlot);
    setSnapshot(emptySnapshot);
    setInventoryOpen(false);
    setMapOpen(false);
    setRegionMapOpen(false);
    setHeroOpen(false);
    setSelectedItem(null);
    setMergeChoice(null);
    setReadableDialog(null);
    setQuestOffer(null);
    setAcceptedQuestNotice(null);
    setQuestRewardModal(null);
    setViewedQuest(null);
    setQuestOverviewOpen(false);
    setConfirmMapAbandonOpen(false);
    setCityMinimapHero(null);
    setCityProgressHud(loadCityProgress(normalizedSlot.cityStorageKey));
    setRegionCorruption(loadRegionCorruption(normalizedSlot.regionCorruptionStorageKey));
    setRegionMapInitialId(loadRegionMapInitialId(normalizedSlot.regionMapLastIdStorageKey));
    lastMapReturnIdRef.current = null;
    setCityOpen(true);
    setGameSession({
      sessionId: `${normalizedSlot.id}-${Date.now()}`,
      slot: normalizedSlot,
      newGame,
    });
    setSaveSlots(collectSaveSlots());
  };

  const startNewGame = () => {
    const slot = createSaveSlot();
    beginSession(slot, true);
  };

  const openWorldMapFromCity = () => {
    setRegionMapInitialId(WORLD_MAP.id);
    setRegionMapOpen(true);
    setMapOpen(false);
    setInventoryOpen(false);
    setHeroOpen(false);
    setCityOpen(false);
  };

  const handleOpenCityFromMap = () => {
    setRegionMapOpen(false);
    setMapOpen(false);
    setCityOpen(true);
  };

  return (
    <main className={`game-shell ${gameSession ? "game-active" : "menu-active"} ${cityOpen ? "city-open" : ""}`}>
      {!gameSession && (
        <StartMenu
          view={menuView}
          saveSlots={saveSlots}
          onNewGame={startNewGame}
          onLoadClick={() => {
            setSaveSlots(collectSaveSlots());
            setMenuView("load");
          }}
          onBack={() => setMenuView("main")}
          onLoadGame={(slot) => beginSession(slot, false)}
        />
      )}

      {gameSession && <canvas ref={canvasRef} className="game-canvas" aria-label="Runebound Depths isometric game" />}

      {gameSession && (
      <>
      <section className="hud hud-left" aria-live="polite">
        {cityOpen ? (
          <div className="city-hero-cluster">
            <div className="portrait">
              <b>{player.level}</b>
            </div>
            <CityCitizenConditions stats={derivedCityStats} />
          </div>
        ) : (
          <div className="portrait">
            <b>{player.level}</b>
          </div>
        )}
        {cityOpen ? (
          <CityStatsTopBar stats={cityHudStats} />
        ) : (
          <div className="resource-stack">
            <ResourceBar type="health" value={hpPct} label={`HP ${player.hp} / ${player.maxHp}`} />
            <ResourceBar type="mana" value={manaPct} label={`MANA ${player.mana} / ${player.maxMana}`} />
            <ResourceBar type="xp" value={xpPct} label={`XP ${player.xp} / ${player.nextXp}`} />
            <ResourceBar type="popularity" value={popularityPct} label={`POPULARITY ${Math.round(player.popularity ?? 0)}%`} />
          </div>
        )}
        {!cityOpen && (
          <div className="stat-chip">
            <span>Guld</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ImageIcon src={ITEM_MONEY_ICON_URL} />
              <b>{player.gold}</b>
            </div>
          </div>
        )}
      </section>

      <section className="hud hud-right">
        <div className="zone-panel">
          <div className="zone-header">
            <b>{cityOpen ? "City" : snapshot.zone.name}</b>
          </div>
          {!cityOpen && (
            <span>
              Seed {snapshot.zone.seed} | Omraade L{snapshot.zone.level}
            </span>
          )}
        </div>
        {!cityOpen && <canvas ref={minimapRef} className="minimap" width="154" height="154" aria-label="Minimap" />}
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

      {trackedQuests.length > 0 && (
        <section className="quest-tracker" aria-label="Aktive quests">
          {trackedQuests.slice(0, 8).map((quest) => (
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
              <QuestObjectiveMeta quest={quest} compact />
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
        <button type="button" className="skill" title={cityOpen ? "Minimap er deaktiveret i byen" : "Map"} disabled={cityOpen} onClick={() => setMapOpen(true)}>
          <ImageIcon src="/assets/generated/icon_map.png" />
          <span className="hotkey-badge">M</span>
        </button>
        <button type="button" className="skill" title="Hero" onClick={() => setHeroOpen(true)}>
          <ImageIcon src="/assets/generated/ui_hero.png" />
          <span className="hotkey-badge">C</span>
        </button>
        <button type="button" className="skill" title="Questoversigt" onClick={() => setQuestOverviewOpen(true)}>
          <ImageIcon src={QUICKBAR_QUEST_ICON_URL} />
        </button>
        <button
          type="button"
          className="skill"
          title={snapshot.regionRun ? "Til world map (progression nulstilles)" : "Aaben world map"}
          onClick={() => {
            if (snapshot.regionRun) {
              setConfirmMapAbandonOpen(true);
              return;
            }
            openWorldMapFromCity();
          }}
        >
          <ImageIcon src={snapshot.regionRun ? QUICKBAR_WILDERNESS_ICON_URL : QUICKBAR_CITY_ICON_URL} />
        </button>
      </section>

      {confirmMapAbandonOpen && (
        <div className="confirm-backdrop" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="abandon-map-title">
            <h2 id="abandon-map-title">Tilbage til byen?</h2>
            <p>Hvis du forlader dette map nu, nulstilles al progression herfra, inklusive nyt loot, XP og quest-fremgang.</p>
            <div>
              <button type="button" onClick={() => setConfirmMapAbandonOpen(false)}>
                Bliv her
              </button>
              <button
                type="button"
                className="danger-action"
                onClick={() => {
                  const left = engineRef.current?.abandonMapRegionToWorldMap?.();
                  if (left) {
                    setConfirmMapAbandonOpen(false);
                    setRegionMapInitialId(WORLD_MAP.id);
                    setRegionMapOpen(false);
                    setCityOpen(true);
                  }
                }}
              >
                Forlad til by
              </button>
            </div>
          </section>
        </div>
      )}

      {questOverviewOpen && (
        <QuestOverviewDialog
          activeQuests={activeQuests}
          onClose={() => setQuestOverviewOpen(false)}
          onToggleTracked={(questId, tracked) => engineRef.current?.setQuestTracked?.(questId, tracked)}
          onOpenQuest={(quest) => {
            setViewedQuest(quest);
            setQuestOverviewOpen(false);
          }}
        />
      )}

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
                  ) : slot.emptyIconKey ? (
                    <InventoryIcon iconSheet="items" iconUrl={iconUrlFromKey(slot.emptyIconKey)} />
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
                    title={cityOpen ? "Kan ikke droppe i byen" : isQuestItem(item) ? "Kan ikke droppe quest item" : "Drop"}
                    disabled={cityOpen || isQuestItem(item)}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!cityOpen && !isQuestItem(item)) {
                        engineRef.current?.dropInventoryItem(item.index);
                      }
                    }}
                  >
                    D
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
                        if (result?.type === "resource-choice" || result?.type === "readable-choice") setMergeChoice(result);
                      }}
                    >
                      M
                    </button>
                  )}
                  {item.canRead && (
                    <button
                      type="button"
                      className="corner-action merge-action"
                      title="Read"
                      onClick={(event) => {
                        event.stopPropagation();
                        const result = engineRef.current?.readInventoryItem?.(item.index);
                        if (result?.type === "readable-text") setReadableDialog(result);
                      }}
                    >
                      R
                    </button>
                  )}
                  {item.canConsume && (
                    <button
                      type="button"
                      className="corner-action merge-action"
                      title="Use"
                      onClick={(event) => {
                        event.stopPropagation();
                        engineRef.current?.consumeInventoryItem?.(item.index);
                      }}
                    >
                      U
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

      {mergeChoice && (
        <MergeChoiceDialog
          choice={mergeChoice}
          onCancel={() => setMergeChoice(null)}
          onChoose={(output) => {
            const current = snapshot.inventory.find((item) => item.id === mergeChoice.itemId);
            if (current) {
              if (mergeChoice.type === "readable-choice") {
                engineRef.current?.mergeInventoryReadableWithRecipe?.(current.index, output);
              } else {
                engineRef.current?.mergeInventoryResourceWithRecipe(current.index, output);
              }
            }
            setMergeChoice(null);
          }}
        />
      )}

      {readableDialog && (
        <ReadableDialog
          entry={readableDialog}
          onClose={() => setReadableDialog(null)}
        />
      )}

      {snapshot.quests?.nearbyQuestgiver && !cityOpen && !questOffer && (
        <div className="city-interact-prompt wilderness-prompt">
          Press <b>E</b> to speak with {QUEST_NPCS[snapshot.quests.nearbyQuestgiver.npcId]?.name ?? "questgiver"}
        </div>
      )}

      {snapshot.nearbyFoliageLoot && !snapshot.quests?.nearbyQuestgiver && !cityOpen && !questOffer && (
        <div className="city-interact-prompt wilderness-prompt">
          Press <b>E</b> to gather {snapshot.nearbyFoliageLoot.label}
        </div>
      )}

      {questOffer && (
        <QuestOfferDialog
          interaction={questOffer}
          onDecline={() => {
            engineRef.current?.declineWildernessQuest?.();
            setQuestOffer(null);
          }}
          onAcceptQuest={(quest) => {
            const accepted = engineRef.current?.acceptWildernessQuest?.({
              npcId: questOffer.npcId,
              quest,
            });
            if (accepted) setAcceptedQuestNotice({ npcId: questOffer.npcId, quest });
            setQuestOffer(null);
          }}
          onTurnInQuest={(quest) => {
            const result = engineRef.current?.completeQuest?.(quest.id);
            if (result?.ok) {
              setQuestRewardModal(result);
              setQuestOffer(null);
            }
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

      {acceptedQuestNotice && (
        <div className="confirm-backdrop" role="presentation">
          <section className="confirm-dialog quest-parchment-dialog quest-accepted-dialog" role="dialog" aria-modal="true" aria-labelledby="quest-city-title">
            <h2 id="quest-city-title">Quest taget</h2>
            <h3>{acceptedQuestNotice.quest?.title ?? "Ny quest"}</h3>
            {acceptedQuestNotice.quest?.story && <p>{acceptedQuestNotice.quest.story}</p>}
            {acceptedQuestNotice.quest?.acceptText && <p>{acceptedQuestNotice.quest.acceptText}</p>}
            <QuestObjectiveMeta quest={acceptedQuestNotice.quest} />
            <p>{QUEST_NPCS[acceptedQuestNotice.npcId]?.name ?? "Questgiver"} kan findes i byen, naar questen skal indleveres.</p>
            <div>
              <button type="button" onClick={() => setAcceptedQuestNotice(null)}>OK</button>
            </div>
          </section>
        </div>
      )}

      {questRewardModal && (
        <div className="confirm-backdrop" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="quest-reward-title">
            <h2 id="quest-reward-title">Quest reward</h2>
            <p>{questRewardModal.questTitle}</p>
            {questRewardModal.questInfo && <QuestObjectiveMeta quest={questRewardModal.questInfo} compact />}
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

      {snapshot.exitPrompt && !cityOpen && (
        <div className="confirm-backdrop" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="region-exit-title">
            <h2 id="region-exit-title">{snapshot.regionRun ? "Tilbage til byen?" : "Rejs videre?"}</h2>
            <p>
              {snapshot.regionRun
                ? `Du har fundet udgangen fra ${snapshot.region.name}. Forlad regionen og vend tilbage til byen?`
                : `Du har fundet udgangen fra ${snapshot.region.name}. Fortsaet til naeste region?`}
            </p>
            <div>
              <button type="button" onClick={() => engineRef.current?.dismissExitPrompt()}>
                Bliv her
              </button>
              <button type="button" onClick={() => engineRef.current?.travelToNextRegion()}>
                {snapshot.regionRun ? "Til byen" : "Rejs videre"}
              </button>
            </div>
          </section>
        </div>
      )}

      {mapOpen && !cityOpen && (
        <MinimapDialog
          engineRef={engineRef}
          snapshot={snapshot}
          cityOpen={cityOpen}
          cityMinimapHero={cityMinimapHero}
          onClose={() => setMapOpen(false)}
        />
      )}

      {regionMapOpen && (
        <RegionMapDialog
          initialMapId={regionMapInitialId}
          regionCorruption={regionCorruption}
          completedQuests={snapshot.quests?.completed ?? []}
          army={snapshot.player?.stats?.army ?? 0}
          onPlayableRegionSelected={startPlayableMapRegion}
          onCityOpen={handleOpenCityFromMap}
          onMapNavigation={(mapId) => setRegionMapInitialId(mapId)}
        />
      )}

      {heroOpen && (
        <HeroDialog
          snapshot={snapshot}
          onSelectSpell={(spellId) => engineRef.current?.setActiveSpell?.(spellId)}
          onClose={() => setHeroOpen(false)}
        />
      )}

      {cityOpen && (
        <CityPage
          key={gameSession.slot.id}
          engineRef={engineRef}
          snapshot={snapshot}
          onQuestCompleted={(result) => setQuestRewardModal(result)}
          cityStorageKey={gameSession.slot.cityStorageKey}
          onProgressChange={setCityProgressHud}
          onClose={openWorldMapFromCity}
        />
      )}
      </>
      )}
    </main>
  );
}

function StartMenu({ view, saveSlots, onNewGame, onLoadClick, onBack, onLoadGame }) {
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

function ResourceBar({ type, value, label }) {
  return (
    <div className={`resource ${type}`}>
      <span style={{ width: `${value}%` }} />
      <b>{label}</b>
    </div>
  );
}

function CityStatsTopBar({ stats }) {
  return (
    <div className="city-top-stat-bar" aria-label="City stats">
      {stats.map((stat) => (
        <div className={`city-top-stat city-top-stat-${stat.classId}`} key={stat.id} title={stat.label}>
          <img src={CITY_STAT_ICON_URLS[stat.id]} alt="" draggable="false" />
          <div>
            <span>{cityTopStatLabel(stat)}</span>
            <b>{cityTopStatValue(stat)}</b>
          </div>
        </div>
      ))}
    </div>
  );
}

function CityCitizenConditions({ stats }) {
  return (
    <div className="city-citizen-conditions" aria-label="Citizen conditions">
      {CITY_CITIZEN_CONDITION_DEFS.map((entry) => {
        const value = Math.max(0, Math.floor(Number(stats?.[entry.id]) || 0));
        return (
          <div className={value > 0 ? "warning" : ""} title={entry.label} key={entry.id}>
            <img src={CITY_STAT_ICON_URLS[entry.id]} alt="" draggable="false" />
            <span>{value}</span>
          </div>
        );
      })}
    </div>
  );
}

function cityTopStatLabel(stat) {
  return stat.label.replace(/\s+-?\d+%?(\s*\/\s*\d+)?$/, "");
}

function cityTopStatValue(stat) {
  if (stat.id === "xp") return `${stat.value} / ${stat.max}`;
  if (stat.id === "popularity" || stat.id === "happiness") return `${Math.round(stat.value)}%`;
  return String(stat.value);
}

function MergeChoiceDialog({ choice, onCancel, onChoose }) {
  const mergeTitle = choice?.type === "readable-choice" ? "Choose assembled item" : "Choose merge result";
  const mergeBody = choice?.type === "readable-choice"
    ? "These fragments can assemble more than one item."
    : "This resource can be used in more than one recipe.";
  return (
    <div className="confirm-backdrop" role="presentation">
      <section className="confirm-dialog merge-choice-dialog" role="dialog" aria-modal="true" aria-labelledby="merge-choice-title">
        <h2 id="merge-choice-title">{mergeTitle}</h2>
        <p>{mergeBody}</p>
        <div className="merge-choice-list">
          {choice.options.map((option) => (
            <button type="button" className="merge-choice-option" key={option.output} onClick={() => onChoose(option.output)}>
              <InventoryIcon iconIndex={option.iconIndex} iconSheet={option.iconSheet} iconUrl={option.iconUrl} />
              <span>
                <b>{option.name}</b>
                <em>{formatMergeInputs(option.inputs, choice?.type)}</em>
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

function ReadableDialog({ entry, onClose }) {
  if (!entry) return null;
  return (
    <div className="confirm-backdrop" role="presentation">
      <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="readable-title">
        <h2 id="readable-title">{entry.title}</h2>
        <p>{entry.text}</p>
        {entry.questStarted && <p><b>Quest startet:</b> {entry.questStarted.title}</p>}
        <div>
          <button type="button" onClick={onClose}>Close</button>
        </div>
      </section>
    </div>
  );
}

function formatMergeInputs(inputs, type = "resource-choice") {
  return Object.entries(inputs)
    .map(([resourceId, count]) => {
      if (type === "readable-choice") return `${count} ${READABLE_DEF_BY_ID[resourceId]?.title ?? resourceId}`;
      return `${count} ${RESOURCE_DEFS[resourceId]?.name ?? resourceId}`;
    })
    .join(" + ");
}

function normalizeQuestRegions(quest) {
  const target = quest?.target ?? {};
  if (quest?.type === "clear_map" && target.regionId) return [String(target.regionId)];

  const regions = new Set();
  if (Array.isArray(target.dropRegionIds)) {
    for (const regionId of target.dropRegionIds) regions.add(String(regionId));
  }
  for (const entry of target.questItems ?? []) {
    if (Array.isArray(entry?.dropRegionIds)) {
      for (const regionId of entry.dropRegionIds) regions.add(String(regionId));
    }
  }
  if (regions.size) return [...regions];

  const explicit = Array.isArray(quest?.regionIds)
    ? quest.regionIds.map(String).filter((regionId) => regionId !== "city")
    : [];
  if (explicit.length) return explicit;
  return [];
}

function getRegionLabel(regionId) {
  // Search all map region sets for a matching region id
  for (const regions of Object.values(MAP_REGION_SETS)) {
    const region = regions.find((r) => r?.id === regionId);
    if (region?.label) return region.label;
  }
  return regionId; // Fallback to id if no label found
}

function monsterSpriteSheetFromType(typeName) {
  const type = String(typeName ?? "");
  const id = type === "Scorpion" ? "scorpion"
    : type === "Snake" ? "snake"
    : type === "Spider" ? "spider"
    : type === "MiniSpider" ? "spider"
    : type === "MediumSpider" ? "spider"
    : type === "LargeSpider" ? "spider"
    : type === "Wolf" ? "wolf"
    : type === "Skeleton" ? "skeleton"
    : type === "Ghost" ? "ghost"
    : type === "Demon" ? "demon"
    : type.includes("Bone") ? "skeleton"
    : type.includes("Warden") ? "skeleton"
    : type.includes("Shade") ? "ghost"
    : "demon";
  return `/assets/generated/mobs/${id}_animated_sheet.png`;
}

function QuestMonsterSprite({ monsterType }) {
  const canvasRef = React.useRef(null);
  
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const image = new Image();
    image.onload = () => {
      // Extract frame 0 from 4-col x 3-row sheet
      const cellW = image.naturalWidth / 4;
      const cellH = image.naturalHeight / 3;
      
      // Draw frame 0 to canvas
      ctx.drawImage(image, 0, 0, cellW, cellH, 0, 0, canvas.width, canvas.height);
      
      // Remove green screen like loadChromaImage does
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (g > 145 && g > r * 1.55 && g > b * 1.55) {
          data[i + 3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);
    };
    image.src = monsterSpriteSheetFromType(monsterType);
  }, [monsterType]);
  
  return <canvas ref={canvasRef} className="quest-monster-mini" width={22} height={22} />;
}

function collectQuestTargets(quest) {
  const target = quest?.target ?? {};
  const rows = [];
  if (target.questItemId) {
    const def = QUEST_ITEM_DEFS[target.questItemId];
    rows.push({
      key: `quest-item-${target.questItemId}`,
      label: `${target.count ?? 1}x ${def?.name ?? target.questItemId}`,
      iconUrl: def?.iconUrl ?? ITEM_STANDARD_ICON_URL,
    });
  }
  for (const entry of target.questItems ?? []) {
    if (!entry?.questItemId) continue;
    const def = QUEST_ITEM_DEFS[entry.questItemId];
    rows.push({
      key: `quest-item-${entry.questItemId}`,
      label: `${entry.count ?? 1}x ${def?.name ?? entry.questItemId}`,
      iconUrl: def?.iconUrl ?? ITEM_STANDARD_ICON_URL,
    });
  }
  for (const entry of target.resources ?? []) {
    const resourceId = String(entry?.resource ?? "");
    if (!resourceId) continue;
    rows.push({
      key: `resource-${resourceId}`,
      label: `${entry.count ?? 1}x ${RESOURCE_DEFS[resourceId]?.name ?? resourceId}`,
      iconUrl: iconUrlFromKey(deriveIconKey({ mode: "resource", resourceId })),
    });
  }
  for (const entry of target.items ?? []) {
    const name = entry?.templateId ?? entry?.namePrefix ?? entry?.baseName ?? "item";
    rows.push({
      key: `item-${name}`,
      label: `${entry?.count ?? 1}x ${name}`,
      iconUrl: ITEM_STANDARD_ICON_URL,
    });
  }
  return rows;
}

function killQuestMonsters(quest) {
  const target = quest?.target ?? {};
  if (Array.isArray(target.monsters) && target.monsters.length) return target.monsters.map(String);
  if (target.monster && String(target.monster) !== "random") return [String(target.monster)];
  return [];
}

function killQuestCountLabel(quest) {
  const target = quest?.target ?? {};
  if (target.count !== undefined) return `${target.count}`;
  if (target.countMin !== undefined && target.countMax !== undefined) return `${target.countMin}-${target.countMax}`;
  if (target.countMin !== undefined) return `${target.countMin}`;
  if (target.countMax !== undefined) return `${target.countMax}`;
  return "?";
}

function QuestObjectiveMeta({ quest, compact = false }) {
  if (!quest) return null;
  const regions = normalizeQuestRegions(quest);
  const collectRows = quest.type === "collect_quest_item" ? collectQuestTargets(quest) : [];
  const killMonsters = quest.type === "kill_monsters" ? killQuestMonsters(quest) : [];
  const clearMapMonsters = quest.type === "clear_map" ? (quest.target?.monsters ?? []).map(String) : [];
  return (
    <div className={`quest-objective-meta ${compact ? "compact" : ""}`}>
      {quest.type === "collect_quest_item" && collectRows.length > 0 && (
        <div className="quest-objective-row quest-objective-items">
          {collectRows.map((row) => (
            <span className="quest-chip" key={row.key}>
              {row.iconUrl && <img src={row.iconUrl} alt="" />}
              {row.label}
            </span>
          ))}
        </div>
      )}

      {quest.type === "kill_monsters" && (
        <div className="quest-objective-row quest-objective-kills">
          <span className="quest-chip kill-count">Dræb: {killQuestCountLabel(quest)}</span>
          {killMonsters.length > 0 ? killMonsters.map((monster) => (
            <span className="quest-monster-chip" key={monster}>
              <QuestMonsterSprite monsterType={monster} />
              {monster}
            </span>
          )) : <span className="quest-chip">Regionens monstre</span>}
        </div>
      )}

      {quest.type === "clear_map" && (
        <div className="quest-objective-row quest-objective-kills">
          {clearMapMonsters.map((monster) => (
            <span className="quest-monster-chip" key={monster}>
              <QuestMonsterSprite monsterType={monster} />
              {monster}
            </span>
          ))}
        </div>
      )}

      {(regions.length > 0 || quest.type === "kill_monsters" || quest.target?.dropChance !== undefined) && (
        <div className="quest-objective-row quest-objective-regions">
          <span className="quest-chip region-chip">Regioner: {regions.length ? regions.map(getRegionLabel).join(", ") : "Alle"}</span>
        </div>
      )}
      {quest.source === "readable" && (
        <div className="quest-objective-row quest-objective-regions">
          <span className="quest-chip region-chip">Udløser: {quest.sourceLabel ?? "Readable"}</span>
        </div>
      )}
    </div>
  );
}

function QuestOfferDialog({ interaction, onDecline, onAcceptQuest, onTurnInQuest }) {
  const npc = QUEST_NPCS[interaction.npcId];
  const offers = interaction.offers ?? [];
  const active = interaction.active ?? [];
  const completeActive = active.filter((quest) => quest.complete);
  const inProgress = active.filter((quest) => !quest.complete);
  return (
    <div className="confirm-backdrop" role="presentation">
      <section className="confirm-dialog quest-offer-dialog" role="dialog" aria-modal="true" aria-labelledby="quest-offer-title">
        <div className="quest-offer-header">
          {npc?.imageUrl && <img src={npc.imageUrl} alt="" />}
          <div>
            <h2 id="quest-offer-title">{npc?.name ?? "Questgiver"}</h2>
            <span>{npc?.name ?? "Questgiver"} - {npc?.title ?? "Questgiver"}</span>
          </div>
        </div>
        {completeActive.length > 0 && (
          <>
            <p>Ferdige quests:</p>
            <div className="quest-list">
              {completeActive.map((quest) => (
                <article className="quest-card complete" key={quest.id}>
                  <header>
                    <b>{quest.title}</b>
                    <span>{quest.progressText}</span>
                  </header>
                  <p>{quest.turnInText}</p>
                  <QuestObjectiveMeta quest={quest} />
                  <button type="button" onClick={() => onTurnInQuest?.(quest)}>Indlever quest</button>
                </article>
              ))}
            </div>
          </>
        )}
        {offers.length > 0 && (
          <>
            <p>Tilgaengelige quests:</p>
            <div className="quest-list">
              {offers.map((quest) => (
                <article className="quest-card" key={quest.id}>
                  <header>
                    <b>{quest.title}</b>
                    <span>{quest.progressText}</span>
                  </header>
                  <p>{quest.story}</p>
                  <p>{quest.acceptText}</p>
                  <QuestObjectiveMeta quest={quest} />
                  <button type="button" onClick={() => onAcceptQuest?.(quest)}>Tag quest</button>
                </article>
              ))}
            </div>
          </>
        )}
        {offers.length === 0 && completeActive.length === 0 && inProgress.length > 0 && (
          <p>Du har aktive quests herfra, og ingen nye quests er tilgaengelige lige nu.</p>
        )}
        {offers.length === 0 && completeActive.length === 0 && inProgress.length === 0 && (
          <p>Ingen quests tilgaengelige lige nu.</p>
        )}
        <div>
          <button type="button" onClick={onDecline}>Luk</button>
        </div>
      </section>
    </div>
  );
}

function QuestDetailDialog({ quest, engineRef, onClose, onQuestCompleted, cityOpen }) {
  if (!quest) return null;
  const npc = QUEST_NPCS[quest.npcId];
  const turnIn = async () => {
    const result = engineRef.current?.completeQuest?.(quest.id);
    if (result?.ok) {
      onQuestCompleted?.(result);
      onClose?.();
    }
  };

  return (
    <div className="city-popup-backdrop">
      <section className="confirm-dialog quest-offer-dialog quest-parchment-dialog quest-detail-dialog" role="dialog" aria-modal="true" aria-label={quest.title}>
        <div className="quest-offer-header">
          {npc?.imageUrl && <img src={npc.imageUrl} alt="" />}
          <div>
            <h2>{quest.title}</h2>
            <span>{npc?.name ?? "Questgiver"} - {npc?.title ?? ""}</span>
          </div>
        </div>
        <p>{quest.complete ? quest.turnInText : quest.story}</p>
        {quest.progressText && (
          <p className="quest-progress-line">
            <b>Progress:</b> {quest.progressText}
          </p>
        )}
        <QuestObjectiveMeta quest={quest} />
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

function QuestOverviewDialog({ activeQuests, onClose, onToggleTracked, onOpenQuest }) {
  const [selectedQuestId, setSelectedQuestId] = useState(activeQuests[0]?.id ?? null);

  useEffect(() => {
    if (!activeQuests.length) {
      setSelectedQuestId(null);
      return;
    }
    const stillExists = activeQuests.some((quest) => quest.id === selectedQuestId);
    if (!stillExists) setSelectedQuestId(activeQuests[0].id);
  }, [activeQuests, selectedQuestId]);

  const selectedQuest = activeQuests.find((quest) => quest.id === selectedQuestId) ?? activeQuests[0] ?? null;
  const selectedNpc = selectedQuest ? QUEST_NPCS[selectedQuest.npcId] : null;

  return (
    <div className="confirm-backdrop" role="presentation">
      <section className="confirm-dialog quest-overview-dialog" role="dialog" aria-modal="true" aria-labelledby="quest-overview-title">
        <header className="quest-overview-head">
          <h2 id="quest-overview-title">Questoversigt</h2>
        </header>

        <div className="quest-overview-body">
          {activeQuests.length <= 0 ? (
            <p>Ingen aktive quests lige nu.</p>
          ) : (
            <div className="quest-overview-layout">
              <div className="quest-overview-list">
                {activeQuests.map((quest) => (
                  (() => {
                    const completionPct = questCompletionPercent(quest);
                    return (
                  <article
                    className={`quest-overview-row ${quest.complete ? "complete" : ""} ${selectedQuest?.id === quest.id ? "selected" : ""}`}
                    key={quest.id}
                  >
                    <button type="button" className="quest-open-button" onClick={() => setSelectedQuestId(quest.id)}>
                      <span
                        className="quest-name-bar"
                        style={{
                          "--quest-pct": `${completionPct}%`,
                        }}
                      >
                        <b className="quest-name-label">{quest.title}</b>
                      </span>
                    </button>
                    <label className="quest-track-toggle">
                      <input
                        type="checkbox"
                        checked={quest.tracked !== false}
                        onChange={(event) => onToggleTracked?.(quest.id, event.target.checked)}
                      />
                      Track
                    </label>
                  </article>
                    );
                  })()
                ))}
              </div>

              {selectedQuest && (
                <aside className="quest-overview-detail quest-parchment-panel">
                  <header>
                    <div>
                      <b>{selectedQuest.title}</b>
                      <span>{selectedNpc?.name ?? "Questgiver"}{selectedNpc?.title ? ` | ${selectedNpc.title}` : ""}</span>
                    </div>
                    <button type="button" onClick={() => onOpenQuest?.(selectedQuest)}>Aaben quest</button>
                  </header>
                  <p>{selectedQuest.complete ? selectedQuest.turnInText : selectedQuest.story}</p>
                  {selectedQuest.progressText && (
                    <p className="quest-progress-line">
                      <b>Progress:</b> {selectedQuest.progressText}
                    </p>
                  )}
                  <QuestObjectiveMeta quest={selectedQuest} />
                  <div className="comparison-list">
                    {(selectedQuest.rewards?.xp ?? 0) > 0 && <span className="diff-good">+ XP {selectedQuest.rewards.xp}</span>}
                    {(selectedQuest.rewards?.gold ?? 0) > 0 && <span className="diff-good">+ Gold {selectedQuest.rewards.gold}</span>}
                    {(selectedQuest.rewards?.resources ?? []).map((r) => (
                      <span className="diff-good" key={`ov-res-${selectedQuest.id}-${r.resource}`}>+ {r.count}x {r.resource}</span>
                    ))}
                  </div>
                </aside>
              )}
            </div>
          )}
        </div>

        <footer className="quest-overview-foot">
          <button type="button" onClick={onClose}>Luk</button>
        </footer>
      </section>
    </div>
  );
}

function questCompletionPercent(quest) {
  if (!quest) return 0;
  if (quest.complete) return 100;
  const text = String(quest.progressText ?? "");
  const matches = [...text.matchAll(/(\d+)\s*\/\s*(\d+)/g)];
  if (!matches.length) return 0;
  const ratios = matches
    .map((match) => {
      const current = Number(match[1]);
      const total = Number(match[2]);
      if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) return null;
      return Math.max(0, Math.min(1, current / total));
    })
    .filter((value) => value !== null);
  if (!ratios.length) return 0;
  const avg = ratios.reduce((sum, value) => sum + value, 0) / ratios.length;
  return Math.round(avg * 100);
}

function MinimapDialog({ engineRef, snapshot, cityOpen, cityMinimapHero, onClose }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    if (cityOpen) {
      renderCityMinimap(canvasRef.current, cityMinimapHero ?? undefined);
      return;
    }
    engineRef.current?.renderMinimap(canvasRef.current);
  }, [engineRef, snapshot, cityOpen, cityMinimapHero]);
  return (
    <div className="confirm-backdrop" role="presentation">
      <section className="map-dialog" role="dialog" aria-modal="true" aria-label="Map">
        <header>
          <div>
            <h2>Map</h2>
            <span>{cityOpen ? "City" : `${snapshot.region.name} | Seed ${snapshot.region.seed}`}</span>
          </div>
          <button type="button" className="city-popup-close" onClick={onClose}>X</button>
        </header>
        <canvas ref={canvasRef} width="520" height="520" aria-label="Current minimap" />
      </section>
    </div>
  );
}

function renderCityMinimap(canvas, heroPosition) {
  if (!canvas) return;
  const layout = getCityLayout();
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const pad = 20;
  const gridW = width - pad * 2;
  const gridH = height - pad * 2;
  const cellW = gridW / layout.mapWidth;
  const cellH = gridH / layout.mapHeight;

  ctx.clearRect(0, 0, width, height);
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#1b2420");
  gradient.addColorStop(1, "#0e1411");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  for (let y = 0; y < layout.mapHeight; y += 1) {
    for (let x = 0; x < layout.mapWidth; x += 1) {
      const tile = layout.rows[y]?.[x] ?? "g";
      const px = pad + x * cellW;
      const py = pad + y * cellH;
      ctx.fillStyle = tile === "r" ? "#6f6756" : "#2a5f39";
      ctx.fillRect(Math.floor(px), Math.floor(py), Math.ceil(cellW) + 1, Math.ceil(cellH) + 1);
    }
  }

  for (const house of layout.houses) {
    const hx = pad + (house.gx + 0.5) * cellW;
    const hy = pad + (house.gy + 0.5) * cellH;
    ctx.fillStyle = "#d3b47d";
    ctx.beginPath();
    ctx.arc(hx, hy, Math.max(2, Math.min(cellW, cellH) * 0.35), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(255, 255, 255, 0.24)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);
}

function RegionMapDialog({ initialMapId, regionCorruption, completedQuests = [], army = 0, onPlayableRegionSelected, onCityOpen, onMapNavigation }) {
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
  const currentArmy = Math.max(0, Math.floor(Number(army) || 0));
  const activateRegion = (region) => {
    if (!regionIsUnlocked(region, completedQuestSet, currentArmy)) {
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
                      const locked = !regionIsUnlocked(region, completedQuestSet, currentArmy);
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
                  const locked = !regionIsUnlocked(region, completedQuestSet, currentArmy);
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
                      aria-label={locked ? `${region.label} er laast. ${regionUnlockText(region, completedQuestSet, currentArmy)}` : `${isWorldMap ? "Aaben" : "Vaelg"} ${region.label}`}
                      title={locked ? `${region.label} er laast. ${regionUnlockText(region, completedQuestSet, currentArmy)}` : region.label}
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
                ? regionIsUnlocked(selectedRegion, completedQuestSet, currentArmy)
                  ? `${selectedRegion.label} | id: ${selectedRegion.id} | biodome: ${selectedRegion.biodome ?? "not set"}`
                  : `${selectedRegion.label} er laast. ${regionUnlockText(selectedRegion, completedQuestSet, currentArmy)}`
                : `${activeMap.title} er aabnet som underkort. Klik et omraade for at vaelge det.`}
            </p>
          )}
          {isWorldMap && selectedRegion && !regionIsUnlocked(selectedRegion, completedQuestSet, currentArmy) && (
            <p className="map-note">{selectedRegion.label} er laast. {regionUnlockText(selectedRegion, completedQuestSet, currentArmy)}</p>
          )}
        </div>
        {lockedRegion && (
          <LockedRegionDialog
            completedQuestSet={completedQuestSet}
            army={currentArmy}
            region={lockedRegion}
            onClose={() => setLockedRegion(null)}
          />
        )}
      </section>
    </div>
  );
}

function regionIsUnlocked(region, completedQuestSet, army = 0) {
  if (region?.unlock?.locked) return false;
  const requiredArmy = Math.max(0, Math.floor(Number(region?.unlock?.army ?? region?.unlock?.requiredArmy) || 0));
  if (army < requiredArmy) return false;
  const hasQuestCompletion = (questId) => {
    const raw = String(questId ?? "");
    if (!raw) return false;
    const swapped = raw.includes("-") ? raw.replace(/-/g, "_") : raw.replace(/_/g, "-");
    return completedQuestSet.has(raw) || completedQuestSet.has(swapped);
  };
  const requiredQuests = region?.unlock?.completedQuests ?? [];
  return requiredQuests.every((questId) => hasQuestCompletion(questId));
}

function regionUnlockText(region, completedQuestSet, army = 0) {
  if (region?.unlock?.text) return region.unlock.text;
  const requiredArmy = Math.max(0, Math.floor(Number(region?.unlock?.army ?? region?.unlock?.requiredArmy) || 0));
  if (army < requiredArmy) return `Kraever ${requiredArmy} army. Du har ${Math.max(0, Math.floor(Number(army) || 0))}.`;
  const hasQuestCompletion = (questId) => {
    const raw = String(questId ?? "");
    if (!raw) return false;
    const swapped = raw.includes("-") ? raw.replace(/-/g, "_") : raw.replace(/_/g, "-");
    return completedQuestSet.has(raw) || completedQuestSet.has(swapped);
  };
  const missingQuests = (region?.unlock?.completedQuests ?? [])
    .filter((questId) => !hasQuestCompletion(questId));
  if (!missingQuests.length) return "Ingen manglende krav.";
  const questNames = missingQuests.map((questId) => {
    const raw = String(questId ?? "");
    const swapped = raw.includes("-") ? raw.replace(/-/g, "_") : raw.replace(/_/g, "-");
    return QUEST_DEFS[raw]?.title ?? QUEST_DEFS[swapped]?.title ?? raw;
  });
  return `Kraever quest: ${questNames.join(", ")}.`;
}

function LockedRegionDialog({ region, completedQuestSet, army = 0, onClose }) {
  const hasQuestCompletion = (questId) => {
    const raw = String(questId ?? "");
    if (!raw) return false;
    const swapped = raw.includes("-") ? raw.replace(/-/g, "_") : raw.replace(/_/g, "-");
    return completedQuestSet.has(raw) || completedQuestSet.has(swapped);
  };
  const missingQuestIds = (region?.unlock?.completedQuests ?? [])
    .filter((questId) => !hasQuestCompletion(questId));
  const requiredArmy = Math.max(0, Math.floor(Number(region?.unlock?.army ?? region?.unlock?.requiredArmy) || 0));
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
        {requiredArmy > 0 && army < requiredArmy && <p>Kraever {requiredArmy} army. Du har {army}.</p>}
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

function HeroDialog({ snapshot, onSelectSpell, onClose }) {
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
            <HeroStat label="Active spell" value={snapshot.player.activeSpellTitle ?? "None"} />
            <HeroStat label="Skill points" value={snapshot.player.skillPoints ?? 0} />
            <HeroStat label="Crit" value={`${Math.round((snapshot.player.critChance ?? 0) * 100)}% / ${Math.round((snapshot.player.critDamage ?? 1.5) * 100)}%`} />
            <HeroStat label="Block" value={`${Math.round((snapshot.player.blockChance ?? 0) * 100)}%`} />
            <HeroStat label="Find" value={`G ${Math.round((snapshot.player.goldFind ?? 0) * 100)}% / M ${Math.round((snapshot.player.magicFind ?? 0) * 100)}%`} />
            <HeroStat label="Deaths" value={stats.deaths ?? 0} />
          </div>
        )}
        {tab === "overview" && (snapshot.player.unlockedSpells?.length ?? 0) > 0 && (
          <div className="spell-picker">
            {snapshot.player.unlockedSpells.map((spellId) => (
              <button
                type="button"
                className={snapshot.player.activeSpellId === spellId ? "active" : ""}
                key={spellId}
                onClick={() => onSelectSpell?.(spellId)}
              >
                {SPELL_DEFS[spellId]?.title ?? spellId}
              </button>
            ))}
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
          <section className="hero-quest-section">
            <h3>{`Quests completed: ${stats.questsCompleted ?? 0}`}</h3>
            {(snapshot.quests?.active ?? []).length > 0 ? (
              <div className="quest-list hero-quest-list">
                {(snapshot.quests?.active ?? []).map((quest) => (
                  <article className={`quest-card ${quest.complete ? "complete" : ""}`} key={quest.id}>
                    <header>
                      <b>{quest.title}</b>
                      <span>{quest.progressText}</span>
                    </header>
                    <QuestObjectiveMeta quest={quest} compact />
                  </article>
                ))}
              </div>
            ) : <p>Ingen aktive quests</p>}
          </section>
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

function CityPage({ engineRef, snapshot, cityStorageKey = CITY_STORAGE_KEY, onClose, onQuestCompleted, onProgressChange }) {
  const snapshotRef = useRef(snapshot);
  const cityStorageKeyRef = useRef(cityStorageKey);
  const [loadingCity, setLoadingCity] = useState(!cityAssetCache.assets);
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [selectedQuestNpcId, setSelectedQuestNpcId] = useState(null);
  const [hoveredAreaId, setHoveredAreaId] = useState(null);
  const [clickedAreaId, setClickedAreaId] = useState(null);
  const [cityProgress, setCityProgress] = useState(() => loadCityProgress(cityStorageKey));
  const [cityAssets, setCityAssets] = useState(() => cityAssetCache.assets ?? { houseImages: {}, npcImages: {} });
  const cityProgressRef = useRef(cityProgress);
  const npcPlacementSeedRef = useRef(Math.floor(Math.random() * 1000000));
  const interactiveAreas = useMemo(() => CITY_AREAS.filter((area) => area.interactive !== false), []);
  const hoveredArea = useMemo(
    () => interactiveAreas.find((area) => area.id === hoveredAreaId) ?? null,
    [hoveredAreaId, interactiveAreas],
  );
  const clickedArea = useMemo(
    () => interactiveAreas.find((area) => area.id === clickedAreaId) ?? null,
    [clickedAreaId, interactiveAreas],
  );
  const activeAreaPanel = clickedArea ?? hoveredArea;
  const unlockedLayerUrls = useMemo(() => (
    interactiveAreas
      .filter((area) => isCityAreaUnlocked(cityProgress, area))
      .flatMap((area) => cityAreaLayerUrls(area, cityProgress))
      .concat(cityBuildingLayerUrls(cityProgress))
  ), [cityProgress, interactiveAreas]);
  const previewLayerUrls = useMemo(() => {
    const previewAreas = [hoveredArea, clickedArea]
      .filter(Boolean)
      .filter((area, index, list) => list.findIndex((candidate) => candidate.id === area.id) === index)
      .filter((area) => !isCityAreaUnlocked(cityProgress, area));
    return previewAreas.flatMap((area) => cityAreaPreviewLayerUrls(area));
  }, [hoveredArea, clickedArea, cityProgress]);
  const hoverAreaBuildings = useMemo(() => (
    hoveredArea && isCityAreaUnlocked(cityProgress, hoveredArea)
      ? cityAreaBuildingRefs(hoveredArea)
      : []
  ), [hoveredArea, cityProgress]);
  const visibleAreaBuildingGroups = useMemo(() => {
    if (!CITY_BUILDING_CHIPS_ALWAYS_VISIBLE) return [];
    return interactiveAreas
      .filter((area) => isCityAreaUnlocked(cityProgress, area))
      .map((area) => ({
        area,
        buildingRefs: cityAreaBuildingRefs(area),
      }))
      .filter((group) => group.buildingRefs.length > 0);
  }, [interactiveAreas, cityProgress]);
  const activeAreaPanelBuildings = useMemo(() => (
    activeAreaPanel && isCityAreaUnlocked(cityProgress, activeAreaPanel)
      ? cityAreaBuildingRefs(activeAreaPanel)
      : []
  ), [activeAreaPanel, cityProgress]);
  const cityMapNpcs = useMemo(() => (
    getCityMapQuestNpcs(snapshot.quests?.cityNpcStates ?? [], SHOW_INACTIVE_CITY_NPCS, npcPlacementSeedRef.current)
  ), [snapshot.quests?.cityNpcStates]);
  const cityStats = useMemo(() => calculateCityStats(cityProgress, snapshot), [cityProgress, snapshot]);
  const cityNpcImageUrls = useMemo(() => {
    const entries = Object.entries(cityAssets.npcImages ?? {}).map(([npcId, image]) => {
      if (!image || typeof image.toDataURL !== "function") return [npcId, QUEST_NPCS[npcId]?.imageUrl ?? ""];
      try {
        return [npcId, image.toDataURL("image/png")];
      } catch {
        return [npcId, QUEST_NPCS[npcId]?.imageUrl ?? ""];
      }
    });
    return Object.fromEntries(entries);
  }, [cityAssets.npcImages]);
  const cityBuildingImageUrls = useMemo(() => {
    const entries = Object.entries(cityAssets.houseImages ?? {}).map(([key, image]) => {
      if (!image || typeof image.toDataURL !== "function") return [key, ""];
      try {
        return [key, image.toDataURL("image/png")];
      } catch {
        return [key, ""];
      }
    });
    return Object.fromEntries(entries);
  }, [cityAssets.houseImages]);

  useEffect(() => {
    cityStorageKeyRef.current = cityStorageKey;
    setCityProgress(loadCityProgress(cityStorageKey));
    setHoveredAreaId(null);
    setClickedAreaId(null);
  }, [cityStorageKey]);

  useEffect(() => {
    setCityProgress((current) => rerollMerchantStockForCityVisit(current, snapshotRef.current.player?.level ?? 1));
  }, [cityStorageKey]);

  // Apply durability degradation on each city visit
  useEffect(() => {
    setCityProgress((current) => applyDurabilityDegradationForVisit(current));
  }, [cityStorageKey]);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    const station = selectedBuildingId === "library"
      ? "library"
      : selectedBuildingId === "mage_tower"
        ? "mage_tower"
        : "backpack";
    engineRef.current?.setReadableMergeStation?.(station);
  }, [selectedBuildingId, engineRef]);

  useEffect(() => {
    if (cityStorageKeyRef.current !== cityStorageKey) return;
    cityProgressRef.current = cityProgress;
    onProgressChange?.(cityProgress);
    saveCityProgress(cityProgress, cityStorageKey);
    engineRef.current?.saveProgress?.({ force: true });
  }, [cityProgress, cityStorageKey, engineRef, onProgressChange]);

  useEffect(() => {
    let cancelled = false;
    loadCityAssets().then((assets) => {
      if (cancelled) return;
      setCityAssets(assets ?? { houseImages: {}, npcImages: {} });
      setLoadingCity(false);
    }).catch(() => {
      if (cancelled) return;
      setLoadingCity(false);
    });

    const onKeyDown = (event) => {
      const key = event.key.toLowerCase();
      if (key === "escape") {
        event.preventDefault();
        onClose();
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      cancelled = true;
      engineRef.current?.setReadableMergeStation?.("backpack");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const unlockArea = (area) => {
    if (!area || isCityAreaUnlocked(cityProgressRef.current, area)) return;
    const stats = calculateCityStats(cityProgressRef.current, snapshotRef.current);
    if (!cityAreaCanUnlock(area, snapshotRef.current, stats)) return;
    const paid = payCityAreaUnlockCost(area, engineRef.current, snapshotRef.current);
    if (!paid) return;
    setCityProgress((current) => ({
      ...current,
      areas: {
        ...(current.areas ?? {}),
        [area.id]: { unlocked: true, level: 1, unlockedAt: Date.now(), durability: DURABILITY_DEFAULT },
      },
    }));
  };

  const upgradeArea = (area) => {
    if (!area || !isCityAreaUnlocked(cityProgressRef.current, area)) return;
    const stats = calculateCityStats(cityProgressRef.current, snapshotRef.current);
    const state = getCityAreaState(cityProgressRef.current, area);
    const nextLevel = cityAreaNextLevel(area, state.level);
    if (!nextLevel) return;
    if (!cityStatsMeetRequirements(nextLevel.statRequirements ?? nextLevel.unlock?.statRequirements, stats)) return;
    if (!payCityCostEntries(cityLevelCostEntries(nextLevel), engineRef.current, snapshotRef.current)) return;
    setCityProgress((current) => ({
      ...current,
      areas: {
        ...(current.areas ?? {}),
        [area.id]: {
          ...(typeof current.areas?.[area.id] === "object" ? current.areas[area.id] : {}),
          unlocked: true,
          level: nextLevel.level,
          upgradedAt: Date.now(),
        },
      },
    }));
  };

  const repairArea = (area, percent = null) => {
    if (!area) return;
    const progressState = cityProgressRef.current ?? {};
    const areaState = (progressState.areas ?? {})[area.id] ?? (area.prebuilt ? { unlocked: true, level: 1, durability: DURABILITY_DEFAULT } : null);
    if (!areaState) return;
    const currentDur = Math.max(0, Math.min(100, Number(areaState.durability ?? DURABILITY_DEFAULT)));
    const missing = Math.max(0, Math.ceil((percent === null ? 100 - currentDur : percent)));
    if (missing <= 0) return;
    const baseCost = area.unlock?.cost ?? area.cost ?? {};
    const repairEntries = computeRepairCostEntries(baseCost, missing);

    const deficits = repairEntries
      .map(([resourceId, amount]) => ({ resourceId, amount, available: cityCostAvailable(snapshotRef.current, resourceId) }))
      .filter((entry) => entry.available < entry.amount);
    if (deficits.length > 0) {
      const parts = deficits.map((d) => `${cityCostLabel(d.resourceId)} ${d.amount} (du har ${d.available})`);
      engineRef.current?.addToast?.(`Kan ikke reparere: mangler ${parts.join(", ")}`);
      return;
    }

    const paid = payCityCostEntries(repairEntries, engineRef.current, snapshotRef.current);
    if (!paid) {
      engineRef.current?.addToast?.("Betaling mislykkedes ved reparation af område.");
      return;
    }

    setCityProgress((current) => ({
      ...current,
      areas: {
        ...(current.areas ?? {}),
        [area.id]: {
          ...(current.areas?.[area.id] ?? {}),
          durability: Math.min(100, Math.max(0, Number((current.areas?.[area.id]?.durability ?? DURABILITY_DEFAULT))) + missing),
        },
      },
    }));

    engineRef.current?.addToast?.(`Område repareret: +${missing}%`);
  };

  const hoverArea = (area) => {
    setHoveredAreaId(area.id);
  };

  const selectArea = (area) => {
    setClickedAreaId(area.id);
    setHoveredAreaId(area.id);
  };

  const openBuilding = (buildingId) => {
    setSelectedQuestNpcId(null);
    setSelectedBuildingId(buildingId);
  };

  const openNpc = (npcId) => {
    setSelectedBuildingId(null);
    setSelectedQuestNpcId(npcId);
  };

  return (
    <section className="city-page city-mode-page" role="dialog" aria-modal="true" aria-label="City page">
      <header className="city-page-header">
        <h2>City</h2>
      </header>
      <div className="city-map-stage">
        <div
          className="city-map-frame"
          style={{ "--city-map-aspect": `${CITY_MAP_IMAGE.width} / ${CITY_MAP_IMAGE.height}` }}
          onPointerLeave={() => setHoveredAreaId(null)}
          onClick={(event) => {
            if (event.target.closest?.(".city-map-area, .city-area-popover, .city-map-action-icon")) return;
            setClickedAreaId(null);
          }}
        >
          <img className="city-map-background" src={CITY_MAP_IMAGE.src} alt="" draggable="false" />
          {unlockedLayerUrls.map((layerUrl) => (
            <img className="city-built-layer" src={layerUrl} alt="" draggable="false" key={layerUrl} />
          ))}
          {previewLayerUrls.map((layerUrl) => (
            <img className="city-built-layer city-built-layer-preview" src={layerUrl} alt="" draggable="false" key={`preview-${layerUrl}`} />
          ))}
          <svg
            className="city-area-layer"
            viewBox={`0 0 ${CITY_MAP_IMAGE.width} ${CITY_MAP_IMAGE.height}`}
            aria-label="City districts"
          >
            {interactiveAreas.map((area) => {
              const unlocked = isCityAreaUnlocked(cityProgress, area);
              const hovered = hoveredAreaId === area.id;
              const clicked = clickedAreaId === area.id;
              return (
                <CityAreaShape
                  key={area.id}
                  area={area}
                  className={`city-map-area city-map-area-${area.category ?? "district"} ${unlocked ? "unlocked" : "locked"} ${hovered ? "hovered" : ""} ${clicked ? "selected" : ""}`}
                  aria-label={`${area.title}${unlocked ? "" : " locked"}`}
                  onPointerEnter={() => hoverArea(area)}
                  onFocus={() => hoverArea(area)}
                  onClick={() => selectArea(area)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    selectArea(area);
                  }}
                />
              );
            })}
          </svg>
          {interactiveAreas.flatMap((area) => {
            const unlocked = isCityAreaUnlocked(cityProgress, area);
            if (!area.showLabel || (unlocked && !CITY_AREA_LABEL_OPTIONS.showLabelWhenBuilt)) return [];
            return [(
              <CityAreaLabel
                area={area}
                unlocked={unlocked}
                key={area.id}
              />
            )];
          })}
          {CITY_BUILDING_CHIPS_ALWAYS_VISIBLE && visibleAreaBuildingGroups.map(({ area, buildingRefs }) => (
            <CityMapHoverIcons
              area={area}
              buildingRefs={buildingRefs}
              npcRefs={[]}
              buildingImageUrls={cityBuildingImageUrls}
              onOpenBuilding={openBuilding}
              onOpenNpc={openNpc}
              key={area.id}
            />
          ))}
          {!CITY_BUILDING_CHIPS_ALWAYS_VISIBLE && hoveredArea && isCityAreaUnlocked(cityProgress, hoveredArea) && (
            <CityMapHoverIcons
              area={hoveredArea}
              buildingRefs={hoverAreaBuildings}
              npcRefs={[]}
              buildingImageUrls={cityBuildingImageUrls}
              onOpenBuilding={openBuilding}
              onOpenNpc={openNpc}
            />
          )}
          <CityMapHoverIcons
            area={{ id: "city_npcs", title: "City NPCs" }}
            buildingRefs={[]}
            npcRefs={cityMapNpcs}
            npcImageUrls={cityNpcImageUrls}
            onOpenBuilding={openBuilding}
            onOpenNpc={openNpc}
          />
        </div>
        <div className={`city-area-panel-slot ${activeAreaPanel ? "has-content" : ""}`}>
        {activeAreaPanel ? (
          <CityAreaPopover
            area={activeAreaPanel}
            snapshot={snapshot}
            progress={cityProgress}
            cityStats={cityStats}
            buildingRefs={activeAreaPanelBuildings}
            onUnlock={() => unlockArea(activeAreaPanel)}
            onUpgrade={() => upgradeArea(activeAreaPanel)}
            onRepair={(area, percent) => repairArea(area, percent)}
          />
        ) : (
          <aside className="city-area-popover city-area-popover-empty" aria-hidden="true" />
        )}
        </div>
      </div>
      {loadingCity && (
        <div className="city-loading" role="status">
          <b>Loading city</b>
          <span>Preparing map assets...</span>
        </div>
      )}
      {!loadingCity && selectedBuildingId && (
        <CityBuildingPopup
          buildingId={selectedBuildingId}
          engineRef={engineRef}
          snapshot={snapshot}
          snapshotRef={snapshotRef}
          progress={cityProgress}
          houseImages={cityAssets.houseImages ?? {}}
          cityStats={cityStats}
          onChangeProgress={setCityProgress}
          onClose={() => setSelectedBuildingId(null)}
        />
      )}
      {!loadingCity && selectedQuestNpcId && (
        <CityQuestPopup
          npcId={selectedQuestNpcId}
          engineRef={engineRef}
          npcStates={snapshot.quests?.cityNpcStates ?? []}
          onQuestCompleted={onQuestCompleted}
          onClose={() => setSelectedQuestNpcId(null)}
        />
      )}
      <p className="city-help">ESC: aaben kort.</p>
    </section>
  );
}

function CityAreaShape({ area, className, ...props }) {
  const shared = {
    className,
    tabIndex: "0",
    role: "button",
    ...props,
  };
  if (Array.isArray(area.rings) && area.rings.length > 0) {
    return (
      <path
        {...shared}
        d={cityAreaPathD(area)}
        fillRule="evenodd"
        clipRule="evenodd"
      />
    );
  }
  return <polygon {...shared} points={area.points} />;
}

function CityAreaLabel({ area, unlocked }) {
  const center = cityAreaCenter(area);
  return (
    <button
      type="button"
      className={`city-area-label ${unlocked ? "unlocked" : "locked"}`}
      style={cityMapPositionStyle(center.x, center.y)}
      tabIndex={-1}
      aria-hidden="true"
    >
      {area.title}
    </button>
  );
}

function CityAreaPopover({ area, snapshot, progress, cityStats, buildingRefs, onUnlock, onUpgrade, onRepair }) {
  const unlocked = isCityAreaUnlocked(progress, area);
  const areaState = getCityAreaState(progress, area);
  const nextLevel = unlocked ? cityAreaNextLevel(area, areaState.level) : null;
  const nextLevelCostEntries = cityLevelCostEntries(nextLevel);
  const nextLevelRequirementEntries = cityStatRequirementEntries(nextLevel?.statRequirements ?? nextLevel?.unlock?.statRequirements, cityStats);
  const canUpgrade = Boolean(nextLevel)
    && nextLevelRequirementEntries.every((entry) => entry.met)
    && nextLevelCostEntries.every(([resourceId, amount]) => cityCostAvailable(snapshot, resourceId) >= amount);
  const canUnlock = cityAreaCanUnlock(area, snapshot, cityStats);
  const gates = cityAreaGateEntries(area, snapshot, cityStats);
  const costEntries = cityAreaCostEntries(area);
  const activeEffects = cityAreaActiveStatEffects(area, areaState.level);
  const panelImageUrl = buildingRefs[0]?.building?.imageUrl ?? CITY_MAP_IMAGE.src;
  return (
    <aside
      className={`city-area-popover ${unlocked ? "unlocked" : "locked"}`}
    >
      <header style={{ "--city-area-panel-image": `url("${panelImageUrl}")` }}>
        <b>{area.title}</b>
        <span>{unlocked ? `Level ${areaState.level}` : "Locked"}</span>
      </header>
      <p className="city-area-panel-description">{area.description ?? "No area description configured yet."}</p>
      {unlocked ? (
        <div className="city-area-popover-body">
          <CityPanelSection title="Stats effect">
            <CityStatEffectsSummary effects={activeEffects} />
          </CityPanelSection>
          {area.id === "outer_5" && <CityCampStats cityStats={cityStats} />}
          {buildingRefs.length > 0 && (
            <CityPanelSection title="Buildings">
              <div className="city-area-mini-list">
                {buildingRefs.map(({ building }) => <span key={building.id}>{building.title}</span>)}
              </div>
            </CityPanelSection>
          )}
          <CityPanelSection title="Durability">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <b>Durability:</b>
              <span>{(Math.floor(Number(areaState.durability ?? DURABILITY_DEFAULT) * 100) / 100).toFixed(2)}%</span>
              <button
                type="button"
                disabled={(areaState.durability ?? DURABILITY_DEFAULT) >= 100}
                onClick={() => onRepair?.(area, Math.ceil(100 - (areaState.durability ?? DURABILITY_DEFAULT)))}
              >
                Repair
              </button>
            </div>
            <div style={{ marginTop: 8 }}>
              <b>Repair cost:</b>
              <div className="city-area-costs" style={{ marginTop: 6 }}>
                {(computeRepairCostEntries(area.unlock?.cost ?? area.cost ?? {}, Math.max(0, Math.ceil(100 - (areaState.durability ?? DURABILITY_DEFAULT))))).length === 0 && (
                  <span>Ingen resources kræves.</span>
                )}
                {computeRepairCostEntries(area.unlock?.cost ?? area.cost ?? {}, Math.max(0, Math.ceil(100 - (areaState.durability ?? DURABILITY_DEFAULT))))
                  .map(([resourceId, amount]) => (
                    <span key={resourceId} className={cityCostAvailable(snapshot, resourceId) >= amount ? "met" : "missing"}>
                      <CityCostIcon resourceId={resourceId} />
                      {amount} {cityCostLabel(resourceId)} {`(${cityCostAvailable(snapshot, resourceId)} available)`}
                    </span>
                  ))}
              </div>
            </div>
          </CityPanelSection>
          {buildingRefs.length === 0 && <p>Empty area.</p>}
          {nextLevel && (
            <>
            <CityPanelSection title="Next level">
              <div className="city-upgrade-summary">
                <b>Level {nextLevel.level}</b>
                {nextLevel.title && <span>{nextLevel.title}</span>}
              </div>
            </CityPanelSection>
            <CityPanelSection title="Stats effect">
              <CityStatEffectsSummary effects={nextLevel.statEffects} />
            </CityPanelSection>
            <CityPanelSection title="Requirements">
              {nextLevelRequirementEntries.length > 0 && (
                <div className="city-area-requirements">
                  {nextLevelRequirementEntries.map((entry) => (
                    <span className={entry.met ? "met" : "missing"} key={entry.key}>{entry.label}</span>
                  ))}
                </div>
              )}
              {nextLevelRequirementEntries.length === 0 && <p>No requirements.</p>}
            </CityPanelSection>
            <CityPanelSection title="Build price">
              {nextLevelCostEntries.length > 0 && (
                <div className="city-area-costs">
                  {nextLevelCostEntries.map(([resourceId, amount]) => (
                    <span className={cityCostAvailable(snapshot, resourceId) >= amount ? "met" : "missing"} key={resourceId}>
                      <CityCostIcon resourceId={resourceId} />
                      {amount} {cityCostLabel(resourceId)}
                    </span>
                  ))}
                </div>
              )}
              {nextLevelCostEntries.length === 0 && <p>No price configured.</p>}
              <button type="button" disabled={!canUpgrade} onClick={onUpgrade}>Upgrade area</button>
            </CityPanelSection>
            </>
          )}
        </div>
      ) : (
        <div className="city-area-popover-body">
          <CityPanelSection title="Next level">
            <div className="city-upgrade-summary"><b>Level 1</b></div>
          </CityPanelSection>
          <CityPanelSection title="Stats effect">
            <CityStatEffectsSummary effects={area.statEffects} />
          </CityPanelSection>
          <CityPanelSection title="Requirements">
            {gates.length > 0 ? (
              <div className="city-area-requirements">
                {gates.map((entry) => (
                  <span className={entry.met ? "met" : "missing"} key={entry.key}>
                    {entry.label}
                  </span>
                ))}
              </div>
            ) : <p>No requirements.</p>}
          </CityPanelSection>
          <CityPanelSection title="Build price">
            {costEntries.length > 0 ? (
              <div className="city-area-costs">
                {costEntries.map(([resourceId, amount]) => (
                  <span className={cityCostAvailable(snapshot, resourceId) >= amount ? "met" : "missing"} key={resourceId}>
                    <CityCostIcon resourceId={resourceId} />
                    {amount} {cityCostLabel(resourceId)}
                  </span>
                ))}
              </div>
            ) : <p>No price configured.</p>}
            <button type="button" disabled={!canUnlock} onClick={onUnlock}>
              Unlock area
            </button>
          </CityPanelSection>
        </div>
      )}
    </aside>
  );
}

function CityPanelSection({ title, children }) {
  return (
    <section className="city-panel-section">
      <h4>{title}</h4>
      {children}
    </section>
  );
}

function CityMapHoverIcons({ area, buildingRefs, npcRefs, npcImageUrls = {}, buildingImageUrls = {}, onOpenBuilding, onOpenNpc }) {
  return (
    <div className="city-map-hover-icons" aria-label={`${area.title} actions`}>
      {buildingRefs.map(({ building, x, y }) => {
        const imageUrl = buildingImageUrls[cityBuildingImageKey(building)] || building.imageUrl || "";
        return (
          <button
            type="button"
            className="city-map-action-icon building"
            style={cityMapPositionStyle(x, y)}
            title={building.title}
            aria-label={building.title}
            onClick={(event) => {
              event.stopPropagation();
              onOpenBuilding(building.id);
            }}
            key={building.id}
          >
            <span className="city-building-portrait">
              {imageUrl ? <img src={imageUrl} alt="" draggable="false" /> : cityBuildingIconText(building)}
            </span>
            <b>{building.title}</b>
          </button>
        );
      })}
      {npcRefs.map((npc) => (
        <button
          type="button"
          className={`city-map-action-icon npc ${npc.hasOffer ? "offer" : npc.hasComplete ? "complete" : npc.hasActive ? "active-quest" : ""}`}
          style={cityMapPositionStyle(npc.x, npc.y)}
          title={npc.name}
          aria-label={npc.name}
          onClick={(event) => {
            event.stopPropagation();
            onOpenNpc(npc.npcId);
          }}
          key={npc.npcId}
        >
          <span className="city-npc-portrait">
            {npcImageUrls[npc.npcId] || npc.imageUrl ? <img src={npcImageUrls[npc.npcId] || npc.imageUrl} alt="" draggable="false" /> : "NPC"}
          </span>
          {(npc.hasComplete || npc.hasOffer || npc.hasActive) && (
            <i className="city-npc-quest-marker" aria-hidden="true">
              {npc.hasOffer ? "!" : npc.hasComplete ? "?" : "?"}
            </i>
          )}
          <b>{npc.name}</b>
        </button>
      ))}
    </div>
  );
}

const cityAreaGeometryCache = new Map();

function cityAreaLayerUrls(area, progress) {
  const state = getCityAreaState(progress, area);
  return [
    area?.builtLayer,
    ...(Array.isArray(area?.builtLayers) ? area.builtLayers : []),
    ...cityReachedLevels(area, state.level).flatMap((level) => [
      level?.builtLayer,
      ...(Array.isArray(level?.builtLayers) ? level.builtLayers : []),
    ]),
  ].filter(Boolean);
}

function cityBuildingLayerUrls(progress) {
  return CITY_BUILDINGS.flatMap((building) => {
    const state = getCityBuildingState(progress, building);
    if ((state.level ?? 0) <= 0) return [];
    return cityReachedLevels(building, state.level).flatMap((level) => [
      level?.builtLayer,
      ...(Array.isArray(level?.builtLayers) ? level.builtLayers : []),
    ]);
  }).filter(Boolean);
}

function cityAreaPreviewLayerUrls(area) {
  return [
    area?.builtLayer,
    ...(Array.isArray(area?.builtLayers) ? area.builtLayers : []),
    ...cityReachedLevels(area, 1).flatMap((level) => [
      level?.builtLayer,
      ...(Array.isArray(level?.builtLayers) ? level.builtLayers : []),
    ]),
  ].filter(Boolean);
}

function getCityAreaState(progress, area) {
  if (!area?.id) return { unlocked: false, level: 0, durability: DURABILITY_DEFAULT };
  if (area.prebuilt) {
    const saved = progress?.areas?.[area.id];
    const savedLevel = typeof saved === "object" ? saved.level : 0;
    return {
      ...(typeof saved === "object" ? saved : {}),
      unlocked: true,
      level: Math.max(1, savedLevel ?? 0),
      durability: saved?.durability ?? DURABILITY_DEFAULT,
    };
  }
  const saved = progress?.areas?.[area.id];
  if (saved === true) return { unlocked: true, level: 1, durability: DURABILITY_DEFAULT };
  if (!saved || typeof saved !== "object") return { unlocked: false, level: 0, durability: DURABILITY_DEFAULT };
  return {
    ...saved,
    unlocked: Boolean(saved.unlocked),
    level: saved.unlocked ? Math.max(1, saved.level ?? 1) : 0,
    durability: saved.durability ?? DURABILITY_DEFAULT,
  };
}

function isCityAreaUnlocked(progress, area) {
  if (!area || area.interactive === false) return false;
  return getCityAreaState(progress, area).unlocked;
}

function cityAreaPathD(area) {
  const rings = Array.isArray(area?.rings) ? area.rings : [area?.points];
  return rings
    .map((ring) => parseCityAreaPoints(ring))
    .filter((points) => points.length > 0)
    .map((points) => `M ${points.map((point) => `${point.x} ${point.y}`).join(" L ")} Z`)
    .join(" ");
}

function cityAreaBuildingRefs(area) {
  const entries = area?.buildings ?? [];
  const count = entries.length;
  return entries.flatMap((entry, index) => {
    const buildingId = typeof entry === "string" ? entry : entry.id;
    const building = CITY_BUILDINGS.find((candidate) => candidate.id === buildingId);
    if (!building) return [];
    const fallback = cityAreaIconFallbackPosition(area, index, count);
    return [{
      building,
      x: Number.isFinite(entry?.x) ? entry.x : fallback.x,
      y: Number.isFinite(entry?.y) ? entry.y : fallback.y,
    }];
  });
}

function getCityMapQuestNpcs(cityNpcStates = [], showInactive = SHOW_INACTIVE_CITY_NPCS, seed = 0) {
  const stateByNpc = new Map((cityNpcStates ?? []).map((entry) => [entry.npcId, entry]));
  const candidates = Object.entries(QUEST_NPCS).flatMap(([npcId, npc]) => {
    const state = stateByNpc.get(npcId) ?? { active: [], offers: [], hasComplete: false };
    const hasOffer = (state.offers?.length ?? 0) > 0;
    const hasActive = (state.active?.length ?? 0) > 0;
    if (!showInactive && !hasOffer && !hasActive && !state.hasComplete) return [];
    return [{ npcId, npc, state, hasOffer, hasActive, hasComplete: Boolean(state.hasComplete) }];
  });
  const positions = cityNpcAreaPositions(candidates.length, seed);

  return candidates.map((entry, index) => {
    const position = positions[index] ?? cityAreaCenter(CITY_NPC_AREA);
    return {
      npcId: entry.npcId,
      name: entry.npc.name,
      title: entry.npc.title,
      imageUrl: entry.npc.imageUrl,
      x: position.x,
      y: position.y,
      hasOffer: entry.hasOffer,
      hasActive: entry.hasActive,
      hasComplete: entry.hasComplete,
    };
  });
}

function cityNpcAreaPositions(count, seed = 0) {
  if (count <= 0) return [];
  const points = cityAreaGeometry(CITY_NPC_AREA).points;
  const center = cityAreaCenter(CITY_NPC_AREA);
  const bounds = cityAreaBounds(points);
  const fixedPoints = shuffleCityPoints(CITY_NPC_POINTS, seed)
    .filter((point) => pointInPolygon(point, points));
  const candidates = [...fixedPoints];
  const step = 36;
  for (let radius = 1; candidates.length < count * 3 && radius < 12; radius += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        const point = { x: center.x + dx * step, y: center.y + dy * step };
        if (point.x < bounds.minX || point.x > bounds.maxX || point.y < bounds.minY || point.y > bounds.maxY) continue;
        if (pointInPolygon(point, points)) candidates.push(point);
      }
    }
  }
  if (!candidates.length) candidates.push({ ...center });
  return candidates.slice(0, count);
}

function shuffleCityPoints(points, seed = 0) {
  return [...points]
    .map((point, index) => ({
      point,
      sort: seededCityNoise(index + 1, seed),
    }))
    .sort((a, b) => a.sort - b.sort)
    .map((entry) => entry.point);
}

function seededCityNoise(index, seed) {
  const value = Math.sin(index * 127.1 + seed * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

function cityAreaBounds(points) {
  if (!points.length) {
    return { minX: 0, minY: 0, maxX: CITY_MAP_IMAGE.width, maxY: CITY_MAP_IMAGE.height };
  }
  return points.reduce((bounds, point) => ({
    minX: Math.min(bounds.minX, point.x),
    minY: Math.min(bounds.minY, point.y),
    maxX: Math.max(bounds.maxX, point.x),
    maxY: Math.max(bounds.maxY, point.y),
  }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const pi = polygon[i];
    const pj = polygon[j];
    const intersects = ((pi.y > point.y) !== (pj.y > point.y))
      && (point.x < ((pj.x - pi.x) * (point.y - pi.y)) / ((pj.y - pi.y) || 1) + pi.x);
    if (intersects) inside = !inside;
  }
  return inside;
}

function cityAreaIdForNpcLocation(cityLocation) {
  const buildingByLocation = {
    blacksmith: "blacksmith",
    farm: "farm",
    inn: "inn",
    mage_tower: "mage_tower",
    library: "library",
  };
  const buildingId = buildingByLocation[cityLocation];
  if (!buildingId) return "town_center";
  return CITY_AREAS.find((area) => (
    area.interactive !== false
    && (area.buildings ?? []).some((entry) => (typeof entry === "string" ? entry : entry.id) === buildingId)
  ))?.id ?? "town_center";
}

function cityNpcPositionForArea(area, npc, index, count, buildingRefs) {
  const buildingByLocation = {
    blacksmith: "blacksmith",
    farm: "farm",
    inn: "inn",
    mage_tower: "mage_tower",
    library: "library",
  };
  const buildingId = buildingByLocation[npc?.cityLocation];
  const buildingRef = buildingRefs.find((entry) => entry.building.id === buildingId);
  if (buildingRef) {
    const direction = index % 2 === 0 ? 1 : -1;
    return { x: buildingRef.x + direction * 26, y: buildingRef.y - 34 };
  }
  const center = cityAreaCenter(area);
  const radius = Math.max(34, Math.min(72, 30 + count * 6));
  const angle = ((Math.PI * 2) / Math.max(1, count)) * index - Math.PI / 2;
  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius,
  };
}

function cityAreaIconFallbackPosition(area, index, count) {
  const center = cityAreaCenter(area);
  if (count <= 1) return center;
  const radius = Math.min(58, 26 + count * 8);
  const angle = ((Math.PI * 2) / count) * index - Math.PI / 2;
  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius,
  };
}

function cityMapPositionStyle(x, y) {
  return {
    left: `${(x / CITY_MAP_IMAGE.width) * 100}%`,
    top: `${(y / CITY_MAP_IMAGE.height) * 100}%`,
  };
}

function cityBuildingIconText(building) {
  const shortLabels = {
    town_hall: "TH",
    blacksmith: "BS",
    research_lab: "LAB",
    mage_tower: "MT",
    sanctuary: "SAN",
    merchant: "M",
    library: "LIB",
    bank: "BANK",
    inn: "INN",
    farm: "FARM",
    field: "FIELD",
  };
  if (shortLabels[building?.id]) return shortLabels[building.id];
  return String(building?.title ?? "?")
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();
}

function cityAreaCenter(area) {
  const geometry = cityAreaGeometry(area);
  return geometry.center;
}

function cityAreaGeometry(area) {
  if (!area?.id) return { points: [], center: { x: CITY_MAP_IMAGE.width * 0.5, y: CITY_MAP_IMAGE.height * 0.5 } };
  if (cityAreaGeometryCache.has(area.id)) return cityAreaGeometryCache.get(area.id);
  const points = parseCityAreaPoints(Array.isArray(area.rings) ? area.rings[0] : area.points);
  const center = polygonCentroid(points);
  const geometry = { points, center };
  cityAreaGeometryCache.set(area.id, geometry);
  return geometry;
}

function parseCityAreaPoints(points) {
  return String(points ?? "")
    .trim()
    .split(/\s+/)
    .flatMap((pair) => {
      const [x, y] = pair.split(",").map(Number);
      return Number.isFinite(x) && Number.isFinite(y) ? [{ x, y }] : [];
    });
}

function polygonCentroid(points) {
  if (!points.length) return { x: CITY_MAP_IMAGE.width * 0.5, y: CITY_MAP_IMAGE.height * 0.5 };
  let twiceArea = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const cross = a.x * b.y - b.x * a.y;
    twiceArea += cross;
    cx += (a.x + b.x) * cross;
    cy += (a.y + b.y) * cross;
  }
  if (Math.abs(twiceArea) < 0.001) {
    return {
      x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
      y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
    };
  }
  return {
    x: cx / (3 * twiceArea),
    y: cy / (3 * twiceArea),
  };
}

function cityAreaCostEntries(area) {
  const cost = area?.unlock?.cost ?? area?.cost ?? {};
  return Object.entries(cost)
    .map(([resourceId, amount]) => [resourceId, Math.max(0, Math.floor(Number(amount) || 0))])
    .filter(([, amount]) => amount > 0);
}

function cityLevelCostEntries(levelDef) {
  return Object.entries(levelDef?.cost ?? {})
    .map(([resourceId, amount]) => [resourceId, Math.max(0, Math.floor(Number(amount) || 0))])
    .filter(([, amount]) => amount > 0);
}

function computeRepairCostEntries(baseCost = {}, percent = 100) {
  const pct = Math.max(0, Math.min(100, Number(percent) || 0));
  return Object.entries(baseCost ?? {})
    .map(([resourceId, amount]) => [resourceId, Math.max(0, Math.ceil((Number(amount) || 0) * (pct / 100)))])
    .filter(([, amount]) => amount > 0);
}

function cityAreaGateEntries(area, snapshot, cityStats = {}) {
  const unlock = area?.unlock ?? {};
  const entries = [];
  if (unlock.level) {
    const needed = Math.max(1, Math.floor(Number(unlock.level) || 1));
    entries.push({
      key: "level",
      label: `Level ${needed}`,
      met: (snapshot?.player?.level ?? 1) >= needed,
    });
  }
  const completed = new Set((snapshot?.quests?.completed ?? []).map(String));
  for (const questId of unlock.completedQuests ?? unlock.requiresQuests ?? []) {
    entries.push({
      key: `quest:${questId}`,
      label: QUEST_DEFS[questId]?.title ?? `Quest ${questId}`,
      met: completed.has(String(questId)),
    });
  }
  for (const req of unlock.items ?? []) {
    const count = Math.max(1, Math.floor(Number(req.count) || 1));
    const have = cityAreaRequiredItemCount(snapshot, req);
    entries.push({
      key: `item:${cityAreaItemRequirementLabel(req)}`,
      label: `${cityAreaItemRequirementLabel(req)} ${have}/${count}`,
      met: have >= count,
    });
  }
  entries.push(...cityStatRequirementEntries(unlock.statRequirements ?? unlock.stats, cityStats));
  return entries;
}

function cityAreaCanUnlock(area, snapshot, cityStats = {}) {
  if (!area || area.prebuilt) return false;
  const gatesMet = cityAreaGateEntries(area, snapshot, cityStats).every((entry) => entry.met);
  if (!gatesMet) return false;
  return cityAreaCostEntries(area).every(([resourceId, amount]) => cityCostAvailable(snapshot, resourceId) >= amount);
}

function payCityAreaUnlockCost(area, engine, snapshot) {
  return payCityCostEntries(cityAreaCostEntries(area), engine, snapshot);
}

function payCityCostEntries(entries, engine, snapshot) {
  if (!engine) return entries.length === 0;
  if (!entries.every(([resourceId, amount]) => cityCostAvailable(snapshot, resourceId) >= amount)) return false;
  for (const [resourceId, amount] of entries) {
    const consumed = resourceId === "gold"
      ? engine.consumeGold?.(amount) ?? 0
      : engine.consumeResource?.(resourceId, amount) ?? 0;
    if (consumed < amount) return false;
  }
  return true;
}

function cityAreaRequiredItemCount(snapshot, req) {
  return (snapshot?.inventory ?? []).reduce((sum, item) => (
    itemMatchesCityAreaRequirement(item, req)
      ? sum + Math.max(1, Math.floor(Number(item.count) || 1))
      : sum
  ), 0);
}

function itemMatchesCityAreaRequirement(item, req) {
  if (!item || !req) return false;
  let match = true;
  if (req.mode) match = match && String(item.mode) === String(req.mode);
  if (req.resourceId || req.resource) match = match && item.mode === "resource" && String(item.resourceId) === String(req.resourceId ?? req.resource);
  if (req.questItemId) match = match && item.mode === "quest" && String(item.questItemId) === String(req.questItemId);
  if (req.readableId) match = match && isReadableItem(item) && String(item.readableId) === String(req.readableId);
  if (req.uniqueId) match = match && String(item.uniqueId) === String(req.uniqueId);
  if (req.namedId) match = match && String(item.namedId) === String(req.namedId);
  if (req.rarity) match = match && String(item.rarity) === String(req.rarity);
  if (req.baseName) match = match && String(item.baseName) === String(req.baseName);
  if (req.name) match = match && String(item.name) === String(req.name);
  if (req.slot) match = match && String(item.slot) === String(req.slot);
  return match;
}

function cityAreaItemRequirementLabel(req) {
  if (req.label) return req.label;
  if (req.resourceId || req.resource) return cityCostLabel(req.resourceId ?? req.resource);
  if (req.questItemId) return QUEST_ITEM_DEFS[req.questItemId]?.name ?? req.questItemId;
  if (req.readableId) return READABLE_DEF_BY_ID[req.readableId]?.title ?? req.readableId;
  if (req.uniqueId) return req.uniqueId;
  if (req.namedId) return req.namedId;
  if (req.name) return req.name;
  if (req.baseName) return req.baseName;
  return "Required item";
}

function calculateCityStats(progress = {}, snapshot = emptySnapshot) {
  const stats = {
    ...CITY_STATS_RULES.baseStats,
    army: Math.max(0, Math.floor(Number(snapshot?.player?.stats?.army) || CITY_STATS_RULES.baseStats.army)),
    gold: Math.max(0, Math.floor(Number(snapshot?.player?.gold) || 0)),
    xp: Math.max(0, Math.floor(Number(snapshot?.player?.xp) || 0)),
    popularity: Math.max(0, Math.floor(Number(snapshot?.player?.popularity) || 0)),
  };
  applyCityStatEffects(stats, progress?.statBonuses);
  for (const area of CITY_AREAS) {
    const state = getCityAreaState(progress, area);
    if (!state.unlocked) continue;
    applyCityStatEffects(stats, cityAreaActiveStatEffects(area, state.level));
  }
  for (const building of CITY_BUILDINGS) {
    const state = getCityBuildingState(progress, building);
    if ((state.level ?? 0) <= 0) continue;
    applyCityStatEffects(stats, cityBuildingActiveStatEffects(building, state.level));
    const purchasedAddons = new Set(state.addons ?? []);
    for (const addon of building.addons ?? []) {
      if (!purchasedAddons.has(addon.id)) continue;
      applyCityStatEffects(stats, addon.statEffects ?? addon.effects?.cityStats);
    }
  }
  applyCityCitizenDerivedStats(stats);
  return stats;
}

function applyCityCitizenDerivedStats(stats) {
  const population = Math.max(0, Math.floor(Number(stats.population) || 0));
  const provision = Math.max(0, Math.floor(Number(stats.provision) || 0));
  const housing = Math.max(0, Math.floor(Number(stats.housing) || 0));
  const water = Math.max(0, Math.floor(Number(stats.water) || 0));
  stats.hungry_people = Math.max(0, population - provision);
  stats.homeless_people = Math.max(0, population - housing);
  stats.thirsty_people = Math.max(0, population - water);
  stats.camp_population = Math.max(stats.hungry_people, stats.homeless_people, stats.thirsty_people);
  stats.sick_people = cityWeightedPressure(CITY_STATS_RULES.pressureWeights.sick_people, stats);
  stats.angry_people = cityWeightedPressure(CITY_STATS_RULES.pressureWeights.angry_people, stats);
  const happinessPenalty = population > 0
    ? Math.ceil((cityWeightedPressure(CITY_STATS_RULES.pressureWeights.happiness, stats) / population) * 10)
    : 0;
  stats.happiness = Math.max(0, Math.min(100, Math.floor(Number(stats.happiness) || 0) - happinessPenalty));
}

function cityWeightedPressure(weights = {}, stats = {}) {
  return Object.entries(weights ?? {}).reduce((sum, [statId, weight]) => (
    sum + Math.max(0, Math.floor(Number(stats[normalizeCityStatId(statId)]) || 0)) * Math.max(0, Number(weight) || 0)
  ), 0);
}

function cityAreaActiveStatEffects(area, level = 1) {
  return mergeCityStatEffects([
    area?.statEffects ?? area?.effects?.cityStats,
    ...cityReachedLevels(area, level).map((entry) => entry.statEffects ?? entry.effects?.cityStats),
  ]);
}

function cityBuildingActiveStatEffects(building, level = 1) {
  return mergeCityStatEffects([
    building?.statEffects ?? building?.effects?.cityStats,
    ...cityReachedLevels(building, level).map((entry) => entry.statEffects ?? entry.effects?.cityStats),
  ]);
}

function mergeCityStatEffects(effectList = []) {
  const merged = {};
  for (const effects of effectList) {
    for (const [rawId, rawAmount] of Object.entries(effects ?? {})) {
      const statId = normalizeCityStatId(rawId);
      if (!statId) continue;
      merged[statId] = (merged[statId] ?? 0) + Math.floor(Number(rawAmount) || 0);
    }
  }
  return merged;
}

function cityReachedLevels(config, currentLevel = 1) {
  return (config?.levels ?? [])
    .filter((entry) => Math.floor(Number(entry?.level) || 0) <= currentLevel)
    .sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
}

function cityNextLevel(config, currentLevel = 1) {
  return (config?.levels ?? [])
    .filter((entry) => Math.floor(Number(entry?.level) || 0) > currentLevel)
    .sort((a, b) => (a.level ?? 0) - (b.level ?? 0))[0] ?? null;
}

function cityAreaNextLevel(area, currentLevel = 1) {
  return cityNextLevel(area, currentLevel);
}

function cityBuildingNextLevel(building, currentLevel = 1) {
  return cityNextLevel(building, currentLevel);
}

function applyCityStatEffects(stats, effects = {}) {
  for (const [rawId, rawAmount] of Object.entries(effects ?? {})) {
    const statId = normalizeCityStatId(rawId);
    if (!statId) continue;
    stats[statId] = Math.max(0, Math.floor(Number(stats[statId]) || 0) + Math.floor(Number(rawAmount) || 0));
  }
}

function cityStatRequirementEntries(requirements = {}, cityStats = {}) {
  return Object.entries(requirements ?? {}).map(([rawId, rawNeeded]) => {
    const statId = normalizeCityStatId(rawId);
    const needed = Math.max(0, Math.floor(Number(rawNeeded) || 0));
    const current = Math.max(0, Math.floor(Number(cityStats[statId]) || 0));
    return {
      key: `stat:${statId}`,
      label: `${cityStatLabel(statId)} ${current}/${needed}`,
      met: current >= needed,
    };
  });
}

function cityStatsMeetRequirements(requirements = {}, cityStats = {}) {
  return cityStatRequirementEntries(requirements, cityStats).every((entry) => entry.met);
}

function normalizeCityStatId(id) {
  if (!id) return "";
  const raw = String(id);
  const normalized = raw.replaceAll("-", "_");
  return CITY_STAT_ALIASES[raw] ?? CITY_STAT_ALIASES[normalized] ?? normalized;
}

function cityStatLabel(id) {
  const normalized = normalizeCityStatId(id);
  return CITY_STAT_DEFS.find((stat) => stat.id === normalized)?.label ?? normalized.replaceAll("_", " ").toUpperCase();
}

function loadCityAssets() {
  if (cityAssetCache.assets) return Promise.resolve(cityAssetCache.assets);
  if (!cityAssetCache.promise) {
    cityAssetCache.promise = Promise.all([
      loadGeneratedAtlas(),
      loadCityHouseImages(),
      Promise.all(Object.entries(QUEST_NPCS).map(([npcId, npc]) => (
        loadImage(npc.imageUrl)
          .then((image) => [npcId, removeGreenScreen(image)])
          .catch(() => [npcId, null])
      ))),
    ]).then(([atlas, houseImages, npcImageEntries]) => {
      const layout = getCityLayout();
      cityAssetCache.assets = {
        atlas,
        houseImages,
        npcImages: Object.fromEntries(npcImageEntries),
        staticLayer: buildCityTerrainLayer(layout, atlas),
      };
      return cityAssetCache.assets;
    }).catch((error) => {
      cityAssetCache.promise = null;
      throw error;
    });
  }
  return cityAssetCache.promise;
}

function loadCityHouseImages() {
  const entries = [];
  for (const building of CITY_BUILDINGS) {
    if (building.imageUrl) entries.push([cityBuildingImageKey(building), building.imageUrl]);
    for (const addon of building.addons ?? []) {
      if (addon.imageUrl) entries.push([cityAddonImageKey(building, addon), addon.imageUrl]);
    }
  }
  return Promise.all(entries.map(([key, src]) => (
      loadImage(src)
      .then((image) => [key, removeGreenScreen(image)])
      .catch(() => [key, null])
  ))).then((loaded) => Object.fromEntries(loaded));
}

function cityBuildingImageKey(building) {
  return `building:${building.id}`;
}

function cityAddonImageKey(building, addon) {
  return `addon:${building.id}:${addon.id}`;
}

function loadCityProgress(storageKey = CITY_STORAGE_KEY) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function applyMapReturnPopulationProgress(progress = {}, mapReturn, wasCorrupted = true) {
  if (!mapReturn?.cleared || !mapReturn.areaMapId || !mapReturn.regionId) return { progress, changed: false };
  const region = findMapRegionConfig(mapReturn.areaMapId, mapReturn.regionId);
  const firstGain = Math.max(0, Math.floor(Number(region?.populationGain ?? CITY_STATS_RULES.mapLiberation.defaultPopulationGain) || 0));
  if (firstGain <= 0) return { progress, changed: false };
  const gain = wasCorrupted
    ? firstGain
    : Math.max(1, Math.ceil(firstGain * (CITY_STATS_RULES.mapLiberation.repeatRunPct ?? 0.02)));
  return {
    progress: addCityPermanentStatBonus(progress, "population", gain),
    changed: gain > 0,
  };
}

function findMapRegionConfig(areaMapId, regionId) {
  return (MAP_REGION_SETS[areaMapId] ?? []).find((region) => String(region.id) === String(regionId)) ?? null;
}

function addCityPermanentStatBonus(progress = {}, statId, amount) {
  const normalized = normalizeCityStatId(statId);
  const value = Math.floor(Number(amount) || 0);
  if (!normalized || value === 0) return progress;
  return {
    ...progress,
    statBonuses: {
      ...(progress.statBonuses ?? {}),
      [normalized]: Math.max(0, Math.floor(Number(progress.statBonuses?.[normalized]) || 0) + value),
    },
  };
}

function saveCityProgress(progress, storageKey = CITY_STORAGE_KEY) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(progress));
  } catch {
    // Progress is a convenience layer; failing to persist should not break city play.
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      if (typeof image.decode !== "function") {
        resolve(image);
        return;
      }
      image.decode().then(() => resolve(image)).catch(() => resolve(image));
    };
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

function getCityLayout() {
  if (!cityPrebuildCache.layout) cityPrebuildCache.layout = buildCityLayout();
  return cityPrebuildCache.layout;
}

function buildCityLayout() {
  const mapWidth = 17;
  const mapHeight = 17;
  const rows = Array.from({ length: mapHeight }, () => Array.from({ length: mapWidth }, () => "g"));

  const roadRows = [3, 8, 13];
  const roadCols = [3, 8, 13];
  for (const y of roadRows) {
    for (let x = 1; x < mapWidth - 1; x += 1) rows[y][x] = "r";
  }
  for (const x of roadCols) {
    for (let y = 1; y < mapHeight - 1; y += 1) rows[y][x] = "r";
  }

  const houses = [];
  const housePositions = [
    { gx: 2.35, gy: 2.35 },
    { gx: 7.1, gy: 2.35 },
    { gx: 11.85, gy: 2.35 },
    { gx: 2.35, gy: 6.75 },
    { gx: 11.85, gy: 6.75 },
    { gx: 2.35, gy: 11.15 },
    { gx: 7.1, gy: 11.15 },
    { gx: 11.85, gy: 11.15 },
    { gx: 14.65, gy: 8.15 },
    { gx: 14.65, gy: 12.75 },
  ];
  for (let i = 0; i < housePositions.length; i += 1) {
    houses.push({ ...housePositions[i], spriteIndex: i, buildingId: CITY_BUILDINGS[i]?.id ?? null });
  }

  return {
    mapWidth,
    mapHeight,
    rows,
    houses,
    spawn: { gx: 8.5, gy: 8.5 },
  };
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

function updateCityEdgePan(city, width, height, dt) {
  const margin = 130;
  const maxPanX = 360;
  const maxPanY = 210;
  const speed = 460;
  let dx = 0;
  let dy = 0;
  if (Number.isFinite(city.pointerX) && Number.isFinite(city.pointerY)) {
    if (city.pointerX < margin) dx = 1 - city.pointerX / margin;
    else if (city.pointerX > width - margin) dx = -((city.pointerX - (width - margin)) / margin);
    if (city.pointerY < margin) dy = 1 - city.pointerY / margin;
    else if (city.pointerY > height - margin) dy = -((city.pointerY - (height - margin)) / margin);
  }
  city.panX = Math.max(-maxPanX, Math.min(maxPanX, (Number(city.panX) || 0) + dx * speed * dt));
  city.panY = Math.max(-maxPanY, Math.min(maxPanY, (Number(city.panY) || 0) + dy * speed * dt));
}

function drawIsometricCityScene(ctx, width, height, layout, city, progress, quests) {
  drawCityBackdrop(ctx, width, height);
  const camera = getCityCamera(width, height, city);
  const terrain = city.staticLayer ?? buildCityTerrainLayer(layout, city.atlas);
  const terrainOrigin = worldToScreen(0, 0, 0, camera);
  ctx.drawImage(terrain.canvas, terrainOrigin.x - terrain.originX, terrainOrigin.y - terrain.originY);

  const activeNpcs = getActiveCityQuestNpcs(layout, quests?.cityNpcStates ?? []);
  const entities = [
    ...layout.houses.map((house) => ({ type: "house", ...house, depth: house.gx + house.gy })),
    ...activeNpcs.map((npc) => ({ type: "npc", ...npc, depth: npc.gx + npc.gy + 0.18 })),
  ].sort((a, b) => a.depth - b.depth);

  for (const entity of entities) {
    if (entity.type === "house") {
      const building = cityBuildingFromHouse(entity);
      drawIsoHouse(ctx, entity, building, city.houseImages, camera, isCityBuildingOwned(progress, building), city.hoveredBuildingId === building?.id);
      continue;
    }
    if (entity.type === "npc") {
      drawCityQuestNpc(ctx, entity, city.npcImages?.[entity.npcId], camera, city.walkClock);
      continue;
    }
  }
}

function getActiveCityQuestNpcs(layout, cityNpcStates = [], showInactive = SHOW_INACTIVE_CITY_NPCS) {
  const allNpcIds = Object.keys(QUEST_NPCS);
  const stateByNpc = new Map((cityNpcStates ?? []).map((entry) => [entry.npcId, entry]));
  const occupiedSpots = [];
  return allNpcIds.flatMap((npcId, index) => {
    const npc = QUEST_NPCS[npcId];
    const state = stateByNpc.get(npcId) ?? { active: [], offers: [], hasComplete: false };
    const hasQuestActivity = (state.offers?.length ?? 0) > 0 || (state.active?.length ?? 0) > 0;
    if (!showInactive && !hasQuestActivity) return [];
    const preferred = cityNpcLocation(layout, npc?.cityLocation, index);
    const base = resolveCityNpcLocation(layout, preferred, occupiedSpots);
    occupiedSpots.push(base);
    return {
      ...base,
      npcId,
      state,
      alpha: 1,
    };
  });
}

function cityNpcLocation(layout, cityLocation, index = 0) {
  const buildingByLocation = {
    blacksmith: "blacksmith",
    farm: "farm",
    inn: "inn",
    mage_tower: "mage_tower",
    library: "library",
  };
  const buildingNpcOffset = { gx: 1.45, gy: 1.1 };
  const buildingId = buildingByLocation[cityLocation];
  if (buildingId) {
    const house = layout.houses.find((entry) => entry.buildingId === buildingId) ?? layout.houses[0];
    return { gx: house.gx + buildingNpcOffset.gx, gy: house.gy + buildingNpcOffset.gy };
  }
  const openSpots = [
    { gx: 8.2, gy: 8.35 },
    { gx: 4.35, gy: 8.7 },
    { gx: 12.35, gy: 8.2 },
    { gx: 8.0, gy: 4.8 },
    { gx: 8.55, gy: 12.55 },
    { gx: 13.85, gy: 4.85 },
    { gx: 4.25, gy: 13.25 },
    { gx: 13.2, gy: 13.45 },
  ];
  return openSpots[index % openSpots.length];
}

function resolveCityNpcLocation(layout, preferred, occupiedSpots) {
  const candidates = [preferred, ...buildCityNpcSpotRing(preferred, 5, 1.05)];
  for (const candidate of candidates) {
    if (!isCityNpcSpotClear(layout, candidate, occupiedSpots)) continue;
    return candidate;
  }
  return preferred;
}

function isCityNpcSpotClear(layout, candidate, occupiedSpots) {
  if (!isRoadPassable(layout, candidate.gx, candidate.gy, 0.22)) return false;
  if (occupiedSpots.some((spot) => Math.hypot(candidate.gx - spot.gx, candidate.gy - spot.gy) < 1.05)) return false;
  return !isNearCityBuildingMarker(layout, candidate, 1.35);
}

function isNearCityBuildingMarker(layout, candidate, clearance) {
  return layout.houses.some((house) => {
    const offset = getCityQuestOffset(house.spriteIndex);
    return Math.hypot(candidate.gx - (house.gx + offset.gx), candidate.gy - (house.gy + offset.gy)) < clearance;
  });
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

function isCityBuildingOwned(progress, building) {
  return getCityBuildingState(progress, building).level > 0;
}

function getCityBuildingState(progress, building) {
  if (!building?.id) return { level: 0, paid: {}, durability: DURABILITY_DEFAULT, addons: [] };
  const saved = progress?.[building.id] ?? {};
  const prebuiltAddons = (building.addons ?? [])
    .filter((addon) => addon.prebuilt)
    .map((addon) => addon.id);
  const savedAddons = Array.isArray(saved.addons) ? saved.addons : [];
  return {
    ...saved,
    level: building.prebuilt ? Math.max(1, saved.level ?? 0) : (saved.level ?? 0),
    paid: saved.paid ?? {},
    durability: saved.durability ?? DURABILITY_DEFAULT,
    addons: [...new Set([...prebuiltAddons, ...savedAddons])],
  };
}

function cityBuildingFromHouse(house) {
  return CITY_BUILDINGS.find((building) => building.id === house?.buildingId) ?? CITY_BUILDINGS[house?.spriteIndex];
}

function cityImageForBuilding(houseImages, building) {
  if (!building) return null;
  return houseImages?.[cityBuildingImageKey(building)] ?? null;
}

function cityImageForAddon(houseImages, building, addon) {
  if (!building || !addon) return cityImageForBuilding(houseImages, building);
  return houseImages?.[cityAddonImageKey(building, addon)] ?? cityImageForBuilding(houseImages, building);
}

function imageSourceWidth(image) {
  return image?.naturalWidth || image?.width || 1;
}

function imageSourceHeight(image) {
  return image?.naturalHeight || image?.height || 1;
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
  const layout = city?.layout ?? getCityLayout();
  const heroIso = worldToIso(layout.mapWidth * 0.5, layout.mapHeight * 0.5, 0);
  return {
    offsetX: width * 0.5 - heroIso.x + (Number(city?.panX) || 0),
    offsetY: height * 0.52 - heroIso.y + (Number(city?.panY) || 0),
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

function drawIsoHouse(ctx, house, building, houseImages, camera, owned = false, hovered = false) {
  const sprite = cityImageForBuilding(houseImages, building);
  if (!sprite) return;

  const tile = worldToScreen(house.gx, house.gy, 0, camera);
  const targetH = TILE_W * 1.8;
  const sourceW = imageSourceWidth(sprite);
  const sourceH = imageSourceHeight(sprite);
  const scale = targetH / sourceH;
  const w = sourceW * scale;
  const h = sourceH * scale;
  const baseX = tile.x;
  const baseY = tile.y + TILE_H * 0.56;

  ctx.save();
  if (!owned) {
    ctx.globalAlpha *= 0.46;
    ctx.filter = "grayscale(0.85) brightness(0.75)";
  }
  if (hovered) {
    ctx.filter = owned ? "brightness(1.28) saturate(1.12)" : "grayscale(0.55) brightness(0.95) saturate(0.95)";
    ctx.shadowColor = "rgba(244, 218, 150, 0.62)";
    ctx.shadowBlur = 14;
  }
  ctx.drawImage(sprite, baseX - w * 0.5, baseY - h, w, h);
  ctx.restore();
}

function findCityBuildingAtScreen(layout, city, sx, sy, width, height) {
  const camera = getCityCamera(width, height, city);
  const hits = [];
  for (const house of layout.houses) {
    const building = cityBuildingFromHouse(house);
    if (!building) continue;
    const sprite = cityImageForBuilding(city.houseImages, building);
    const tile = worldToScreen(house.gx, house.gy, 0, camera);
    const targetH = TILE_W * 1.8;
    const sourceW = sprite ? imageSourceWidth(sprite) : TILE_W;
    const sourceH = sprite ? imageSourceHeight(sprite) : TILE_W;
    const scale = targetH / sourceH;
    const w = sourceW * scale;
    const h = sourceH * scale;
    const baseX = tile.x;
    const baseY = tile.y + TILE_H * 0.56;
    const insideSprite = sx >= baseX - w * 0.5 && sx <= baseX + w * 0.5 && sy >= baseY - h && sy <= baseY + 18;
    const world = screenToWorld(sx, sy, camera);
    const nearMarker = Math.hypot(world.x - (house.gx + 0.55), world.y - (house.gy + 0.55)) < 1.35;
    if (insideSprite || nearMarker) hits.push({ building, depth: house.gx + house.gy });
  }
  hits.sort((a, b) => b.depth - a.depth);
  return hits[0]?.building ?? null;
}

function findCityQuestNpcAtScreen(layout, city, cityNpcStates, sx, sy, width, height) {
  const camera = getCityCamera(width, height, city);
  const hits = [];
  for (const npc of getActiveCityQuestNpcs(layout, cityNpcStates)) {
    const screen = worldToScreen(npc.gx, npc.gy, 0, camera);
    const image = city.npcImages?.[npc.npcId];
    const h = 82;
    const w = image ? h * (image.width / image.height) : 42;
    const insideSprite = sx >= screen.x - w * 0.5 && sx <= screen.x + w * 0.5 && sy >= screen.y - h && sy <= screen.y + 22;
    const world = screenToWorld(sx, sy, camera);
    const nearNpc = Math.hypot(world.x - npc.gx, world.y - npc.gy) <= 0.75;
    if (insideSprite || nearNpc) hits.push({ npc, depth: npc.gx + npc.gy });
  }
  hits.sort((a, b) => b.depth - a.depth);
  return hits[0]?.npc ?? null;
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
  drawCityQuestStatusMarker(ctx, {
    gx: npc.gx,
    gy: npc.gy,
    phase: 0.2,
    complete: Boolean(npc.state?.hasComplete),
    hasOffer: (npc.state?.offers?.length ?? 0) > 0,
  }, camera, time);
  ctx.restore();
}

function drawCityQuestStatusMarker(ctx, marker, camera, time) {
  const screen = worldToScreen(marker.gx, marker.gy, 0, camera);
  const bob = Math.sin(time * 4.5 + marker.phase) * 4;
  const x = screen.x;
  const y = screen.y - 64 + bob;
  const complete = Boolean(marker.complete);
  const hasOffer = Boolean(marker.hasOffer);
  const symbol = complete ? "?" : hasOffer ? "!" : "-";
  ctx.save();
  ctx.font = "900 30px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = complete ? "#ffcf32" : hasOffer ? "#ff4d3f" : "#8ba0b8";
  ctx.shadowBlur = 12;
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#361b08";
  ctx.fillStyle = complete ? "#ffd94a" : hasOffer ? "#ff4d3f" : "#8ba0b8";
  ctx.strokeText(symbol, x, y);
  ctx.fillText(symbol, x, y);
  ctx.restore();
}

function CityQuestPopup({ npcId, engineRef, npcStates, onClose, onQuestCompleted }) {
  const npc = QUEST_NPCS[npcId];
  const state = (npcStates ?? []).find((entry) => entry.npcId === npcId) ?? { active: [], offers: [] };
  const npcQuests = state.active ?? [];
  const npcOffers = state.offers ?? [];
  if (!npc) return null;

  const turnIn = (quest) => {
    const result = engineRef.current?.completeQuest?.(quest.id);
    if (result?.ok) {
      onQuestCompleted?.(result);
    }
  };

  const acceptQuest = (quest) => {
    const accepted = engineRef.current?.acceptQuestOffer?.(quest, "city");
    if (accepted) onClose();
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
          {npcOffers.map((quest) => (
            <article className="quest-card" key={`offer-${quest.id}`}>
              <header>
                <b>{quest.title}</b>
                <span>Ny quest</span>
              </header>
              <p>{quest.story}</p>
              <QuestObjectiveMeta quest={quest} />
              <button type="button" onClick={() => acceptQuest(quest)}>
                Tag quest
              </button>
            </article>
          ))}
          {npcQuests.map((quest) => (
            <article className={`quest-card ${quest.complete ? "complete" : ""}`} key={quest.id}>
              <header>
                <b>{quest.title}</b>
                <span>{quest.progressText}</span>
              </header>
              <p>{quest.complete ? quest.turnInText : quest.story}</p>
              <QuestObjectiveMeta quest={quest} compact />
              <button type="button" disabled={!quest.complete} onClick={() => turnIn(quest)}>
                Indlever quest
              </button>
            </article>
          ))}
          {!npcOffers.length && !npcQuests.length && <p>Ingen quests tilgaengelige lige nu.</p>}
        </main>
      </section>
    </div>
  );
}

function CityBuildingPopup({ buildingId, engineRef, snapshot, snapshotRef, progress, houseImages, cityStats = {}, onChangeProgress, onClose }) {
  const building = CITY_BUILDINGS.find((entry) => entry.id === buildingId);
  const [draggedCityItem, setDraggedCityItem] = useState(null);
  const [activeAddonId, setActiveAddonId] = useState(null);
  const [buildPaymentOpen, setBuildPaymentOpen] = useState(false);
  const [storedReadable, setStoredReadable] = useState(null);
  const [confirmStoreItem, setConfirmStoreItem] = useState(null);
  if (!building) return null;

  const buildingState = getCityBuildingState(progress, building);
  const owned = buildingState.level > 0;
  const prebuilt = Boolean(building.prebuilt);
  const nextBuildingLevel = owned ? cityBuildingNextLevel(building, buildingState.level) : null;
  const nextBuildingLevelCostEntries = cityLevelCostEntries(nextBuildingLevel);
  const nextBuildingLevelRequirementEntries = cityStatRequirementEntries(nextBuildingLevel?.statRequirements ?? nextBuildingLevel?.unlock?.statRequirements, cityStats);
  const canUpgradeBuilding = Boolean(nextBuildingLevel)
    && nextBuildingLevelRequirementEntries.every((entry) => entry.met)
    && nextBuildingLevelCostEntries.every(([resourceId, amount]) => cityCostAvailable(snapshot, resourceId) >= amount);
  const costEntries = Object.entries(building.cost ?? {});
  const remainingCostEntries = costEntries.map(([resourceId, needed]) => {
    const paid = Math.max(0, buildingState.paid?.[resourceId] ?? 0);
    return [resourceId, Math.max(0, needed - paid)];
  });
  const buildingStatRequirements = building.statRequirements ?? building.unlock?.statRequirements ?? building.unlock?.stats;
  const statRequirementEntries = cityStatRequirementEntries(buildingStatRequirements, cityStats);
  const statRequirementsMet = cityStatsMeetRequirements(buildingStatRequirements, cityStats);
  const canBuyBuilding = remainingCostEntries.every(([resourceId, remaining]) => (
    remaining <= 0 || cityCostAvailable(snapshot, resourceId) >= remaining
  )) && statRequirementsMet;
  const sprite = cityImageForBuilding(houseImages, building);
  const purchasedAddons = new Set(buildingState.addons ?? []);
  const activeAddon = (building.addons ?? []).find((addon) => addon.id === activeAddonId && purchasedAddons.has(addon.id)) ?? null;
  const storageSections = cityInventorySections(building, buildingState, owned);
  const activeStorageSection = activeAddon
    ? storageSections.find((section) => section.key === cityInventorySectionKey(activeAddon)) ?? null
    : storageSections.find((section) => section.key === "base") ?? storageSections[0] ?? null;

  const applyBuildResource = (resourceId, amount) => {
    if (owned) return;
    if (!statRequirementsMet) return;
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
    if (owned) return;
    if (!statRequirementsMet) return;
    if (!remainingCostEntries.every(([, remaining]) => remaining <= 0)) return;
    onChangeProgress((current) => ({
      ...current,
      [building.id]: {
        ...(current[building.id] ?? {}),
        level: 1,
        durability: 100,
        paid: {},
      },
    }));
    setBuildPaymentOpen(false);
  };

  const upgradeBuilding = () => {
    if (!owned || !nextBuildingLevel || !canUpgradeBuilding) return;
    if (!payCityCostEntries(nextBuildingLevelCostEntries, engineRef.current, snapshot)) return;
    onChangeProgress((current) => ({
      ...current,
      [building.id]: {
        ...(current[building.id] ?? {}),
        level: nextBuildingLevel.level,
        durability: current[building.id]?.durability ?? 100,
        paid: current[building.id]?.paid ?? {},
        upgradedAt: Date.now(),
      },
    }));
  };

  const buyAddon = (addon) => {
    if (!owned || purchasedAddons.has(addon.id)) return;
    if (!cityAddonIsUnlocked(addon, snapshot)) return;
    const goldCost = addon.cost?.gold ?? 0;
    if (goldCost > 0 && (snapshot?.player?.gold ?? 0) < goldCost) return;
    const paidGold = goldCost > 0 ? engineRef.current?.consumeGold?.(goldCost) ?? 0 : 0;
    if (paidGold < goldCost) return;
    onChangeProgress((current) => ({
      ...current,
      [building.id]: {
        ...(current[building.id] ?? {}),
        addons: [...new Set([...(Array.isArray(current[building.id]?.addons) ? current[building.id].addons : []), addon.id])],
      },
    }));
  };

  const depositInventoryItem = (inventoryIndex, sectionKey, slotIndex, confirmed = false) => {
    if (!owned) return;
    const item = snapshot.inventory?.[inventoryIndex];
    const section = cityInventorySections(building, buildingState, owned).find((entry) => entry.key === sectionKey);
    if (!section || slotIndex >= section.slots || !itemMatchesCityInventorySlot(item, section, slotIndex)) return;
    if (section.fixedDefs?.[slotIndex] && !confirmed) {
      setConfirmStoreItem({ inventoryIndex, sectionKey, slotIndex, itemName: item.name });
      return;
    }
    const inventories = normalizeCityInventories(buildingState, building);
    if (inventories[sectionKey]?.[slotIndex]) return;
    const taken = engineRef.current?.takeInventoryItem?.(inventoryIndex);
    if (!taken) return;
    if (section.fixedDefs?.[slotIndex]) {
      const xp = Math.max(0, Math.floor(Number(taken.readableXp ?? READABLE_DEF_BY_ID[taken.readableId]?.xp) || 0));
      if (xp > 0) engineRef.current?.awardXp?.(xp, taken.name);
      const spellUnlock = READABLE_DEF_BY_ID[taken.readableId]?.spellUnlock;
      if (spellUnlock) engineRef.current?.unlockSpell?.(spellUnlock, taken.name);
    }
    onChangeProgress((current) => {
      const state = current[building.id] ?? {};
      const currentBuildingState = getCityBuildingState(current, building);
      const nextInventories = normalizeCityInventories(currentBuildingState, building);
      const items = [...(nextInventories[sectionKey] ?? [])];
      items[slotIndex] = taken;
      return {
        ...current,
        [building.id]: {
          ...state,
          inventories: {
            ...nextInventories,
            [sectionKey]: items,
          },
        },
      };
    });
  };

  const withdrawStoredItem = (sectionKey, slotIndex) => {
    if (!owned) return;
    const section = cityInventorySections(building, buildingState, owned).find((entry) => entry.key === sectionKey);
    if (section?.fixedDefs?.[slotIndex]) return;
    const inventories = normalizeCityInventories(buildingState, building);
    const item = inventories[sectionKey]?.[slotIndex];
    if (!item) return;
    if (!engineRef.current?.returnInventoryItem?.(item)) return;
    onChangeProgress((current) => {
      const state = current[building.id] ?? {};
      const currentBuildingState = getCityBuildingState(current, building);
      const nextInventories = normalizeCityInventories(currentBuildingState, building);
      const items = [...(nextInventories[sectionKey] ?? [])];
      items[slotIndex] = null;
      return {
        ...current,
        [building.id]: {
          ...state,
          inventories: {
            ...nextInventories,
            [sectionKey]: items,
          },
        },
      };
    });
  };

  const repairBuilding = (percent = 0) => {
    if (!building) return;
    const state = progress?.[building.id] ?? {};
    const currentDur = Math.max(0, Math.min(100, Number(state.durability ?? DURABILITY_DEFAULT)));
    const missing = Math.max(0, Math.ceil((typeof percent === "number" ? percent : (100 - currentDur))));
    if (missing <= 0) return;
    const repairEntries = computeRepairCostEntries(building.cost ?? {}, missing);

    // Check availability and show informative toast if missing
    const deficits = repairEntries
      .map(([resourceId, amount]) => {
        const available = cityCostAvailable(snapshotRef?.current ?? snapshot, resourceId);
        return { resourceId, amount, available };
      })
      .filter((entry) => entry.available < entry.amount);
    if (deficits.length > 0) {
      const parts = deficits.map((d) => `${cityCostLabel(d.resourceId)} ${d.amount} (du har ${d.available})`);
      engineRef.current?.addToast?.(`Kan ikke reparere: mangler ${parts.join(", ")}`);
      return;
    }

    const paid = payCityCostEntries(repairEntries, engineRef.current, snapshotRef?.current ?? snapshot);
    if (!paid) {
      engineRef.current?.addToast?.("Betaling mislykkedes ved reparation.");
      return;
    }

    onChangeProgress((current) => {
      const state = current[building.id] ?? {};
      const currentDur = Math.max(0, Math.min(100, Number(state.durability ?? DURABILITY_DEFAULT)));
      const nextDur = Math.min(100, currentDur + missing);
      return {
        ...current,
        [building.id]: {
          ...state,
          durability: nextDur,
        },
      };
    });

    engineRef.current?.addToast?.(`Reparation gennemført: +${missing}%`);
  };

  const moveStoredItem = (fromSectionKey, fromSlotIndex, toSectionKey, toSlotIndex) => {
    if (!owned) return;
    const sections = cityInventorySections(building, buildingState, owned);
    const toSection = sections.find((section) => section.key === toSectionKey);
    const fromSection = sections.find((section) => section.key === fromSectionKey);
    if (!fromSection || !toSection || toSlotIndex >= toSection.slots || fromSlotIndex >= fromSection.slots) return;
    if (fromSection.fixedDefs?.[fromSlotIndex]) return;
    onChangeProgress((current) => {
      const state = current[building.id] ?? {};
      const currentBuildingState = getCityBuildingState(current, building);
      const nextInventories = normalizeCityInventories(currentBuildingState, building);
      const fromItems = [...(nextInventories[fromSectionKey] ?? [])];
      const toItems = fromSectionKey === toSectionKey ? fromItems : [...(nextInventories[toSectionKey] ?? [])];
      const moving = fromItems[fromSlotIndex];
      const target = toItems[toSlotIndex];
      if (!moving || !itemMatchesCityInventorySlot(moving, toSection, toSlotIndex)) return current;
      if (target && !itemMatchesCityInventorySlot(target, fromSection, fromSlotIndex)) return current;
      fromItems[fromSlotIndex] = target ?? null;
      toItems[toSlotIndex] = moving;
      return {
        ...current,
        [building.id]: {
          ...state,
          inventories: {
            ...nextInventories,
            [fromSectionKey]: fromItems,
            [toSectionKey]: toItems,
          },
        },
      };
    });
  };

  const produceFoodBarrel = (resourceId, cost) => {
    engineRef.current?.convertResourceToResource?.(resourceId, cost, "food", 1);
  };

  const addFarmProvision = (resourceId, cost, provision) => {
    const consumed = engineRef.current?.consumeResource?.(resourceId, cost) ?? 0;
    if (consumed < cost) return;
    onChangeProgress((current) => addCityPermanentStatBonus(current, "provision", provision));
  };

  const contributeTownHallResource = (resourceId, cost, armyGain) => {
    const population = Math.max(0, Math.floor(Number(cityStats.population) || 0));
    const army = Math.max(0, Math.floor(Number(snapshot.player?.stats?.army) || 0));
    if (army >= population) return;
    const consumed = engineRef.current?.consumeResource?.(resourceId, cost) ?? 0;
    if (consumed >= cost) engineRef.current?.addArmy?.(Math.min(armyGain, population - army), RESOURCE_DEFS[resourceId]?.name ?? resourceId);
  };

  const buyResearchRecipe = (recipeKey) => {
    const recipe = researchRecipeByKey(recipeKey);
    if (!recipe) return;
    const cost = researchRecipeCost(recipe);
    if ((snapshot?.player?.gold ?? 0) < cost) return;
    const paid = engineRef.current?.consumeGold?.(cost) ?? 0;
    if (paid < cost) return;
    onChangeProgress((current) => {
      const state = current[building.id] ?? {};
      return {
        ...current,
        [building.id]: {
          ...state,
          recipes: [...new Set([...(Array.isArray(state.recipes) ? state.recipes : []), recipeKey])],
        },
      };
    });
  };

  const mergeResearchRecipe = (recipe) => {
    const key = researchRecipeKey(recipe);
    if (!new Set(buildingState.recipes ?? []).has(key)) return;
    engineRef.current?.mergeResearchResourceRecipe?.(recipe.output);
  };

  const setMerchantState = (updater) => {
    onChangeProgress((current) => {
      const state = current[building.id] ?? {};
      const merchant = updater(state.merchant ?? {});
      return {
        ...current,
        [building.id]: {
          ...state,
          merchant,
        },
      };
    });
  };

  const sellMerchantItem = (inventoryIndex, quantity = 1) => {
    const item = snapshot.inventory?.[inventoryIndex];
    if (!merchantItemCanTrade(item)) return;
    const qty = merchantTradeQuantity(item, quantity);
    let sold = null;
    if (isResourceItem(item)) {
      const consumed = engineRef.current?.consumeResource?.(item.resourceId, qty) ?? 0;
      if (consumed < qty) return;
      sold = merchantCloneItem({ ...item, count: qty });
    } else {
      sold = engineRef.current?.takeInventoryItem?.(inventoryIndex);
      if (!sold) return;
      sold = merchantCloneItem(sold);
    }
    const gold = merchantSellPrice(sold, snapshot.player?.popularity ?? 0) * qty;
    engineRef.current?.addGold?.(gold, "Merchant");
    setMerchantState((merchant) => {
      const soldItems = [sold, ...(merchant.soldItems ?? [])].slice(0, 10);
      return {
        ...merchant,
        soldItems,
        stock: [...soldItems, ...(merchant.stock ?? []).filter((entry) => !soldItems.some((soldEntry) => soldEntry.id === entry.id))].slice(0, 22),
      };
    });
  };

  const buyMerchantItem = (stockIndex, quantity = 1) => {
    const merchant = buildingState.merchant ?? {};
    const stock = [...(merchant.stock ?? [])];
    const item = stock[stockIndex];
    if (!item) return;
    const qty = merchantTradeQuantity(item, quantity);
    const price = merchantBuyPrice(item, snapshot.player?.popularity ?? 0) * qty;
    if ((snapshot.player?.gold ?? 0) < price) return;
    const bought = merchantCloneItem({ ...item, count: isResourceItem(item) ? qty : item.count });
    if (!engineRef.current?.addInventoryItem?.(bought)) return;
    const paid = engineRef.current?.consumeGold?.(price) ?? 0;
    if (paid < price) return;
    if (isResourceItem(item) && Math.max(1, Math.floor(Number(item.count) || 1)) > qty) {
      stock[stockIndex] = { ...item, count: Math.max(1, Math.floor(Number(item.count) || 1)) - qty };
    } else {
      stock.splice(stockIndex, 1);
    }
    setMerchantState((merchantState) => ({
      ...merchantState,
      stock,
    }));
  };

  return (
    <div className="city-popup-backdrop">
      <section className="city-popup" role="dialog" aria-modal="true" aria-label={building.title}>
        <header className="city-popup-header">
          <div>
            <h3>{building.title}</h3>
            <span>{owned ? `${prebuilt ? "Prebuilt | " : ""}Lvl ${buildingState.level}` : "Not owned"}</span>
          </div>
          <button type="button" className="city-popup-close" onClick={onClose}>X</button>
        </header>

        <div className="city-popup-summary">
          <div className="city-building-thumb">
            {sprite && <canvas ref={(canvas) => drawCityPopupThumb(canvas, sprite, !owned)} width="170" height="150" />}
          </div>
          <div>
            <p>{building.help}</p>
            {owned && <CityStatEffectsSummary title="Building effects" effects={cityBuildingActiveStatEffects(building, buildingState.level)} />}
            {owned && (
              <div style={{ marginTop: 8 }}>
                <b>Durability:</b> {(Math.floor(Number(buildingState.durability ?? DURABILITY_DEFAULT) * 100) / 100).toFixed(2)}%
              </div>
            )}
            {owned && (
              <div style={{ marginTop: 6 }}>
                <b>Repair cost:</b>
                <div className="city-area-costs" style={{ marginTop: 6 }}>
                  {(computeRepairCostEntries(building.cost ?? {}, Math.max(0, Math.ceil(100 - (buildingState.durability ?? DURABILITY_DEFAULT))))).length === 0 && (
                    <span>Ingen resources kræves.</span>
                  )}
                  {computeRepairCostEntries(building.cost ?? {}, Math.max(0, Math.ceil(100 - (buildingState.durability ?? DURABILITY_DEFAULT)))).map(([resourceId, amount]) => (
                    <span key={resourceId} className={cityCostAvailable(snapshotRef?.current ?? snapshot, resourceId) >= amount ? "met" : "missing"}>
                      <CityCostIcon resourceId={resourceId} />
                      {amount} {cityCostLabel(resourceId)} {cityCostAvailable(snapshotRef?.current ?? snapshot, resourceId) !== undefined && `(${cityCostAvailable(snapshotRef?.current ?? snapshot, resourceId)} available)`}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {owned && nextBuildingLevel && (
              <div className="city-upgrade-summary">
                <b>Next: Level {nextBuildingLevel.level}{nextBuildingLevel.title ? ` - ${nextBuildingLevel.title}` : ""}</b>
                <CityStatEffectsSummary title="Adds" effects={nextBuildingLevel.statEffects} />
                {nextBuildingLevelRequirementEntries.length > 0 && (
                  <div className="city-area-requirements city-building-requirements">
                    {nextBuildingLevelRequirementEntries.map((entry) => (
                      <span className={entry.met ? "met" : "missing"} key={entry.key}>{entry.label}</span>
                    ))}
                  </div>
                )}
                {nextBuildingLevelCostEntries.length > 0 && (
                  <div className="city-area-costs">
                    {nextBuildingLevelCostEntries.map(([resourceId, amount]) => (
                      <span className={cityCostAvailable(snapshot, resourceId) >= amount ? "met" : "missing"} key={resourceId}>
                        <CityCostIcon resourceId={resourceId} />
                        {amount} {cityCostLabel(resourceId)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            {!owned && statRequirementEntries.length > 0 && (
              <div className="city-area-requirements city-building-requirements">
                {statRequirementEntries.map((entry) => (
                  <span className={entry.met ? "met" : "missing"} key={entry.key}>
                    {entry.label}
                  </span>
                ))}
              </div>
            )}
            {!owned && costEntries.length > 0 && <CityCostSummary costEntries={costEntries} buildingState={buildingState} snapshot={snapshot} />}
          </div>
        </div>

        <div className="city-popup-actions">
          <button type="button" onClick={() => setBuildPaymentOpen(true)} disabled={owned || !statRequirementsMet}>
            Buy
          </button>
          <button type="button" onClick={upgradeBuilding} disabled={!owned || !nextBuildingLevel || !canUpgradeBuilding}>
            Upgrade
          </button>
            <button type="button" onClick={() => repairBuilding()} disabled={(buildingState.durability ?? 100) >= 100}>Repair</button>
        </div>

        <main className="city-popup-main">
          <p>{building.functionText}</p>
          {building.addons?.length > 0 && (
            <div className="city-addon-list">
              {owned && normalizeInventoryType(building.inventoryType).slots > 0 && (
                <button
                  type="button"
                  className={`city-addon ${activeAddonId ? "" : "active"}`}
                  onClick={() => setActiveAddonId(null)}
                  title={`${building.title} storage`}
                >
                  {sprite && <canvas ref={(canvas) => drawCityPopupThumb(canvas, sprite, false)} width="46" height="42" />}
                  <span>{building.title}</span>
                  <b>{cityInventorySlotCount(building.inventoryType)} slots</b>
                </button>
              )}
              {building.addons.map((addon) => {
                const bought = purchasedAddons.has(addon.id);
                const prebuiltAddon = Boolean(addon.prebuilt);
                const unlocked = cityAddonIsUnlocked(addon, snapshot);
                  const affordable = (snapshot?.player?.gold ?? 0) >= (addon.cost?.gold ?? 0);
                  const iconSprite = cityImageForAddon(houseImages, building, addon);
                  return (
                    <button
                      type="button"
                      className={`city-addon ${bought ? "bought" : ""} ${activeAddonId === addon.id ? "active" : ""} ${!unlocked ? "locked" : ""}`}
                      key={addon.id}
                      disabled={!owned || (!bought && (!affordable || !unlocked))}
                      title={!unlocked ? cityAddonLockText(addon, snapshot) : addon.help}
                      onClick={() => {
                        if (bought) {
                          setActiveAddonId((current) => current === addon.id ? null : addon.id);
                          return;
                        }
                        buyAddon(addon);
                      }}
                    >
                    {iconSprite && <canvas ref={(canvas) => drawCityPopupThumb(canvas, iconSprite, !owned || !bought)} width="46" height="42" />}
                    <span>{addon.title}</span>
                    <b>{bought ? (prebuiltAddon ? "Prebuilt" : "Built") : !unlocked ? "Locked" : `${addon.cost?.gold ?? 0} G`}</b>
                  </button>
                );
              })}
            </div>
          )}
          {owned && activeStorageSection && (
            <CityStoragePanel
              building={building}
              buildingState={buildingState}
              owned={owned}
              inventory={snapshot.inventory}
              activeSectionKey={activeStorageSection.key}
              draggedCityItem={draggedCityItem}
              onDragCityItem={setDraggedCityItem}
              onDepositInventoryItem={depositInventoryItem}
              onWithdrawStoredItem={withdrawStoredItem}
              onMoveStoredItem={moveStoredItem}
              onReadStoredItem={(item) => setStoredReadable(readableDialogFromItem(item))}
            />
          )}
          {building.id === "mage_tower" && owned && activeAddonId === "arcane_extractor" && purchasedAddons.has("arcane_extractor") && (
            <CityArcaneExtractorPanel
              inventory={snapshot.inventory}
              onExtract={(index) => engineRef.current?.extractArcaneEssence?.(index)}
            />
          )}
          {owned && (building.id === "library" || (building.id === "mage_tower" && activeAddonId === "arcane_archive" && purchasedAddons.has("arcane_archive"))) && (
            <CityReadableMergePanel
              inventory={snapshot.inventory}
              kind={building.id === "library" ? "lorenote" : "spellbook"}
              onMerge={(index) => engineRef.current?.mergeInventoryItem?.(index)}
            />
          )}
          {building.id === "blacksmith" && owned && activeAddonId === "minting_furnace" && purchasedAddons.has("minting_furnace") && (
            <CityGoldBarPanel
              gold={snapshot.player?.gold ?? 0}
              popularity={snapshot.player?.popularity ?? 0}
              onSmelt={() => engineRef.current?.smeltGoldToBar?.(1)}
            />
          )}
          {building.id === "farm" && owned && (
            <CityFarmPanel
              inventory={snapshot.inventory}
              popularity={snapshot.player?.popularity ?? 0}
              onProduceFoodBarrel={produceFoodBarrel}
              onProduceProvision={addFarmProvision}
            />
          )}
          {building.id === "town_hall" && owned && (
            <CityTownHallPanel
              inventory={snapshot.inventory}
              army={snapshot.player?.stats?.army ?? 0}
              population={cityStats.population ?? 0}
              popularity={snapshot.player?.popularity ?? 0}
              onContribute={contributeTownHallResource}
            />
          )}
          {building.id === "research_lab" && owned && !activeAddonId && (
            <CityResearchPanel
              buildingState={buildingState}
              snapshot={snapshot}
              onBuyRecipe={(recipeKey) => buyResearchRecipe(recipeKey)}
              onMerge={(recipe) => mergeResearchRecipe(recipe)}
            />
          )}
          {building.id === "research_lab" && owned && activeAddonId === "socket_workbench" && purchasedAddons.has("socket_workbench") && (
            <CitySocketPanel
              inventory={snapshot.inventory}
              gold={snapshot.player?.gold ?? 0}
              onAddSocket={(index) => engineRef.current?.addSocketToInventoryItem?.(index)}
              onSocketGem={(itemIndex, gemIndex) => engineRef.current?.socketGemIntoInventoryItem?.(itemIndex, gemIndex)}
            />
          )}
          {building.id === "merchant" && owned && (
            <CityMerchantPanel
              inventory={snapshot.inventory}
              stock={buildingState.merchant?.stock ?? []}
              gold={snapshot.player?.gold ?? 0}
              popularity={snapshot.player?.popularity ?? 0}
              onSell={sellMerchantItem}
              onBuy={buyMerchantItem}
            />
          )}
          {building.id === "sanctuary" && owned && (
            <CitySkillTreePanel
              player={snapshot.player}
              onBuyRank={(nodeId) => engineRef.current?.buySkillTreeRank?.(nodeId)}
            />
          )}
          {building.id === "blacksmith" && owned && (
            <CityBlacksmithPanel
              engineRef={engineRef}
              snapshot={snapshot}
              activeAddonId={activeAddonId}
              purchasedAddons={purchasedAddons}
            />
          )}
        </main>
      </section>
      {buildPaymentOpen && !owned && (
        <CityBuildPaymentModal
          building={building}
          buildingState={buildingState}
          snapshot={snapshot}
          costEntries={costEntries}
          canFinish={remainingCostEntries.every(([, remaining]) => remaining <= 0)}
          canPayAll={canBuyBuilding}
          statRequirementsMet={statRequirementsMet}
          onApplyResource={applyBuildResource}
          onPayAll={() => {
            for (const [resourceId, remaining] of remainingCostEntries) {
              if (remaining > 0) applyBuildResource(resourceId, remaining);
            }
          }}
          onFinish={finishBuild}
          onClose={() => setBuildPaymentOpen(false)}
        />
      )}
      {storedReadable && (
        <ReadableDialog
          entry={storedReadable}
          onClose={() => setStoredReadable(null)}
        />
      )}
      {confirmStoreItem && (
        <div className="confirm-backdrop" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-label="Confirm storage">
            <h2>Aflever bogen?</h2>
            <p>{confirmStoreItem.itemName} bliver placeret permanent i denne samling.</p>
            <div>
              <button type="button" onClick={() => setConfirmStoreItem(null)}>Cancel</button>
              <button type="button" onClick={() => {
                depositInventoryItem(confirmStoreItem.inventoryIndex, confirmStoreItem.sectionKey, confirmStoreItem.slotIndex, true);
                setConfirmStoreItem(null);
              }}>Confirm</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function CityBlacksmithPanel({ engineRef, snapshot, activeAddonId, purchasedAddons }) {
  const hasWeaponAnvil = purchasedAddons.has("weapon_anvil");
  const hasArmorAnvil = purchasedAddons.has("armor_anvil");
  const hasForge = purchasedAddons.has("forge");
  const forgeWeapons = useMemo(() => (
    (snapshot.inventory ?? []).filter((item) => item?.slot === "weapon")
  ), [snapshot.inventory]);
  const visibleAddonId = activeAddonId && purchasedAddons.has(activeAddonId)
    ? activeAddonId
    : hasWeaponAnvil
      ? "weapon_anvil"
      : hasArmorAnvil
        ? "armor_anvil"
        : hasForge
          ? "forge"
          : null;

  return (
    <section className="blacksmith-panel">
      {visibleAddonId === "weapon_anvil" && (
        <BlacksmithMergeStation
          title="Weapon Anvil"
          enabled={hasWeaponAnvil}
          lockedText="Build Weapon Anvil to merge weapons."
          inventory={snapshot.inventory}
          category="weapon"
          onMerge={(indices) => engineRef.current?.mergeInventoryGearAtBlacksmith?.(indices[0], "weapon", indices)}
        />
      )}
      {visibleAddonId === "armor_anvil" && (
        <BlacksmithMergeStation
          title="Armor Anvil"
          enabled={hasArmorAnvil}
          lockedText="Build Armor Anvil to merge armor."
          inventory={snapshot.inventory}
          category="armor"
          onMerge={(indices) => engineRef.current?.mergeInventoryGearAtBlacksmith?.(indices[0], "armor", indices)}
        />
      )}
      {visibleAddonId === "forge" && (
        <BlacksmithForgeStation
          enabled={hasForge}
          weapons={forgeWeapons}
          onDestroy={(index) => engineRef.current?.forgeDestroyInventoryWeapon?.(index)}
        />
      )}
      {!visibleAddonId && <p>Build a blacksmith addon to unlock this workstation.</p>}
    </section>
  );
}

function BlacksmithMergeStation({ title, enabled, lockedText, inventory, category, onMerge }) {
  const [selectedIndices, setSelectedIndices] = useState([]);
  const relevantInventory = (inventory ?? []).filter((item) => canBlacksmithMergeItem(item, category));
  const selectedItems = selectedIndices.map((index) => inventory?.[index]).filter(Boolean);
  const firstItem = selectedItems[0] ?? null;
  const matchingInventory = new Set((inventory ?? [])
    .filter((item) => blacksmithItemCanEnterMergeSlot(item, category, firstItem))
    .map((item) => item.index));
  const canMerge = selectedItems.length === 3 && selectedItems.every((item) => blacksmithItemCanEnterMergeSlot(item, category, firstItem));

  useEffect(() => {
    setSelectedIndices((current) => current.filter((index) => inventory?.[index]));
  }, [inventory]);

  const addIndex = (index) => {
    const item = inventory?.[index];
    if (!blacksmithItemCanEnterMergeSlot(item, category, firstItem)) return;
    setSelectedIndices((current) => {
      if (current.includes(index) || current.length >= 3) return current;
      return [...current, index];
    });
  };

  const removeSlot = (slotIndex) => {
    setSelectedIndices((current) => current.filter((_, index) => index !== slotIndex));
  };

  return (
    <section className={`blacksmith-station ${enabled ? "" : "locked"}`}>
      <header>
        <h4>{title}</h4>
        <span>{enabled ? "Traek 3 matchende items ind" : lockedText}</span>
      </header>
      {!enabled && <p>{lockedText}</p>}
      {enabled && (
        <div className="blacksmith-merge-workspace">
          <div className="blacksmith-merge-slots">
            {Array.from({ length: 3 }, (_, slotIndex) => {
              const item = selectedItems[slotIndex] ?? null;
              return (
                <CityItemSlot
                  key={`merge-${slotIndex}`}
                  item={item}
                  locked={false}
                  draggable={false}
                  accepted={Boolean(item)}
                  onClick={() => removeSlot(slotIndex)}
                  onDrop={(event) => {
                    event.preventDefault();
                    const payload = parseCityDragPayload(event);
                    if (payload?.source === "inventory") addIndex(payload.index);
                  }}
                />
              );
            })}
          </div>
          <button type="button" disabled={!canMerge} onClick={() => {
            if (!canMerge) return;
            const merged = onMerge(selectedIndices);
            if (merged !== false) setSelectedIndices([]);
          }}>
            Merge
          </button>
          <div className="blacksmith-backpack">
            {relevantInventory.map((item) => {
              const index = item.index;
              return (
              <CityItemSlot
                key={`smith-${index}`}
                item={item}
                locked={false}
                draggable={Boolean(item) && blacksmithItemCanEnterMergeSlot(item, category, firstItem) && !selectedIndices.includes(index)}
                accepted={Boolean(item) && matchingInventory.has(index)}
                muted={Boolean(item) && !matchingInventory.has(index)}
                onDragStart={(event) => {
                  event.dataTransfer.setData("application/x-city-item", JSON.stringify({ source: "inventory", index }));
                  event.dataTransfer.effectAllowed = "move";
                }}
                onClick={() => addIndex(index)}
                onDoubleClick={() => addIndex(index)}
              />
            );})}
          </div>
        </div>
      )}
    </section>
  );
}

function BlacksmithForgeStation({ enabled, weapons, onDestroy }) {
  return (
    <section className={`blacksmith-station ${enabled ? "" : "locked"}`}>
      <header>
        <h4>Forge Addon</h4>
        <span>{enabled ? "Destroy weapons for resources" : "Build Forge Addon to extract weapon resources."}</span>
      </header>
      {!enabled && <p>Build Forge Addon to destroy weapons here.</p>}
      {enabled && weapons.length === 0 && <p>No weapons in backpack.</p>}
      {enabled && weapons.map((item) => (
        <div className="blacksmith-row" key={item.id}>
          <InventoryIcon iconIndex={item.iconIndex} iconSheet={item.iconSheet} iconUrl={item.iconUrl} />
          <div>
            <CityItemName item={item} />
            <span>{item.rarityLabel} | L{item.level} | {item.damageMin}-{item.damageMax} damage</span>
          </div>
          <button type="button" className="danger-action" onClick={() => onDestroy(item.index)}>
            Destroy
          </button>
        </div>
      ))}
    </section>
  );
}

function CityGoldBarPanel({ gold, popularity, onSmelt }) {
  const unitCost = goldBarUnitCost(popularity);
  return (
    <section className="blacksmith-station">
      <header>
        <h4>Minting Furnace</h4>
        <span>{unitCost} gold {"->"} 1 Gold Bar</span>
      </header>
      <div className="blacksmith-row">
        <InventoryIcon iconSheet="items" iconUrl="/assets/generated/item/item_res_goldbar.png" />
        <div>
          <b>Gold Bar</b>
          <span>Popularity {Math.round(popularity ?? 0)}% | Available gold: {gold}</span>
        </div>
        <button type="button" disabled={gold < unitCost} onClick={onSmelt}>Smelt</button>
      </div>
    </section>
  );
}

function CityFarmPanel({ inventory, popularity, onProduceFoodBarrel, onProduceProvision }) {
  const foodBarrelCostValue = foodBarrelCost(popularity);
  const foodBarrelOptions = [
    { id: "meat", label: "Meat" },
    { id: "fruit", label: "Fruit" },
    { id: "wheat", label: "Wheat" },
  ];
  const provisionOptions = CITY_STATS_RULES.farmProvisionRecipes ?? [];
  return (
    <section className="blacksmith-station">
      <header>
        <h4>Food Barrels</h4>
        <span>{foodBarrelCostValue} raw food {"->"} 1 Food Barrel</span>
      </header>
      {foodBarrelOptions.map((option) => {
        const available = cityResourceCount(inventory, option.id);
        const def = RESOURCE_DEFS[option.id];
        return (
          <div className="blacksmith-row" key={`barrel-${option.id}`}>
            <InventoryIcon iconSheet={def?.sheet ?? "resources"} iconUrl={def?.iconUrl ?? iconUrlFromKey(deriveIconKey({ mode: "resource", resourceId: option.id }))} />
            <div>
              <b>{option.label}</b>
              <span>Available: {available} | Popularity {Math.round(popularity ?? 0)}%</span>
            </div>
            <button type="button" disabled={available < foodBarrelCostValue} onClick={() => onProduceFoodBarrel(option.id, foodBarrelCostValue)}>Make</button>
          </div>
        );
      })}
      <header>
        <h4>Provision</h4>
        <span>Convert food resources into city provision.</span>
      </header>
      {provisionOptions.map((option) => {
        const available = cityResourceCount(inventory, option.resourceId);
        const def = RESOURCE_DEFS[option.resourceId];
        return (
          <div className="blacksmith-row" key={`provision-${option.resourceId}`}>
            <InventoryIcon iconSheet={def?.sheet ?? "resources"} iconUrl={def?.iconUrl ?? iconUrlFromKey(deriveIconKey({ mode: "resource", resourceId: option.resourceId }))} />
            <div>
              <b>{option.label}</b>
              <span>{option.cost} {"->"} +{option.provision} provision | Available: {available}</span>
            </div>
            <button type="button" disabled={available < option.cost} onClick={() => onProduceProvision(option.resourceId, option.cost, option.provision)}>Convert</button>
          </div>
        );
      })}
    </section>
  );
}

function CityTownHallPanel({ inventory, army, population, popularity, onContribute }) {
  const bonus = popularityBonusStep(popularity);
  const armyRoom = Math.max(0, Math.floor(Number(population) || 0) - Math.max(0, Math.floor(Number(army) || 0)));
  const options = [
    { id: "gold_bar", cost: 1, army: 10 + bonus, label: "Gold Bar" },
    { id: "food", cost: 1, army: 8 + bonus, label: "Food Barrel" },
    { id: "magic_essence", cost: 10, army: 1 + bonus, label: "Magic Essence" },
  ];
  return (
    <section className="blacksmith-station">
      <header>
        <h4>Army Muster</h4>
        <span>Army: {army} / Population {population} | Nethrendor target: 1000</span>
      </header>
      {options.map((option) => {
        const available = cityResourceCount(inventory, option.id);
        const def = RESOURCE_DEFS[option.id];
        return (
          <div className="blacksmith-row" key={option.id}>
            <InventoryIcon iconSheet={def?.sheet ?? "resources"} iconUrl={def?.iconUrl ?? iconUrlFromKey(deriveIconKey({ mode: "resource", resourceId: option.id }))} />
            <div>
              <b>{option.label}</b>
              <span>{option.cost} {"->"} {Math.min(option.army, armyRoom)} army | Available: {available}</span>
            </div>
            <button type="button" disabled={available < option.cost || armyRoom <= 0} onClick={() => onContribute(option.id, option.cost, option.army)}>Contribute</button>
          </div>
        );
      })}
    </section>
  );
}

function CityResearchPanel({ buildingState, snapshot, onBuyRecipe, onMerge }) {
  const bought = new Set(buildingState.recipes ?? []);
  const recipes = cityResearchRecipes();
  return (
    <section className="blacksmith-station">
      <header>
        <h4>Research Lab</h4>
        <span>Gemstone recipes are researched and merged here.</span>
      </header>
      {recipes.map((recipe) => {
        const key = researchRecipeKey(recipe);
        const unlocked = bought.has(key);
        const cost = researchRecipeCost(recipe);
        const hasInputs = Object.entries(recipe.inputs ?? {}).every(([resourceId, count]) => cityResourceCount(snapshot.inventory, resourceId) >= count);
        const outputDef = RESOURCE_DEFS[recipe.output];
        const inputText = Object.entries(recipe.inputs ?? {})
          .map(([resourceId, count]) => `${count} ${RESOURCE_DEFS[resourceId]?.name ?? resourceId}`)
          .join(" + ");
        return (
          <div className="blacksmith-row" key={key}>
            <InventoryIcon iconSheet={outputDef?.sheet ?? "resources"} iconUrl={outputDef?.iconUrl ?? iconUrlFromKey(deriveIconKey({ mode: "resource", resourceId: recipe.output }))} />
            <div>
              <b>{outputDef?.name ?? recipe.output}</b>
              <span>{inputText} {"->"} {recipe.count ?? 1} {outputDef?.name ?? recipe.output}</span>
            </div>
            {unlocked ? (
              <button type="button" disabled={!hasInputs} onClick={() => onMerge(recipe)}>Merge</button>
            ) : (
              <button type="button" disabled={(snapshot.player?.gold ?? 0) < cost} onClick={() => onBuyRecipe(key)}>
                Research {cost} G
              </button>
            )}
          </div>
        );
      })}
    </section>
  );
}

function CitySocketPanel({ inventory, gold, onAddSocket, onSocketGem }) {
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const socketItems = (inventory ?? []).filter((item) => itemCanHaveSockets(item));
  const gems = (inventory ?? []).filter((item) => item?.mode === "resource" && GEM_SOCKET_BONUSES[item.resourceId]);
  const selectedItem = inventory?.[selectedItemIndex] ?? null;
  const selectedSockets = normalizeSockets(selectedItem?.sockets);
  const addCost = selectedItem ? 500 * (selectedSockets.length + 1) : 0;
  return (
    <section className="blacksmith-station">
      <header>
        <h4>Socket Workbench</h4>
        <span>Max {MAX_ITEM_SOCKETS} sockets. Socketed gems are consumed.</span>
      </header>
      <div className="city-bank-panel">
        <div className="city-bank-column">
          <h4>Gear</h4>
          {socketItems.length === 0 && <p>No socketable gear in backpack.</p>}
          {socketItems.map((item) => (
            <div className={`blacksmith-row ${selectedItemIndex === item.index ? "selected-row" : ""}`} key={item.id}>
              <InventoryIcon iconIndex={item.iconIndex} iconSheet={item.iconSheet} iconUrl={item.iconUrl} />
              <div>
                <CityItemName item={item} />
                <span>{socketText(item)}</span>
              </div>
              <button type="button" onClick={() => setSelectedItemIndex(item.index)}>Select</button>
            </div>
          ))}
        </div>
        <div className="city-bank-column">
          <h4>Selected</h4>
          {!selectedItem && <p>Select gear first.</p>}
          {selectedItem && (
            <>
              <div className="blacksmith-row">
                <InventoryIcon iconIndex={selectedItem.iconIndex} iconSheet={selectedItem.iconSheet} iconUrl={selectedItem.iconUrl} />
                <div>
                  <CityItemName item={selectedItem} />
                  <span>{socketText(selectedItem)}</span>
                </div>
                <button type="button" disabled={selectedSockets.length >= MAX_ITEM_SOCKETS || gold < addCost} onClick={() => onAddSocket(selectedItemIndex)}>
                  Add {addCost} G
                </button>
              </div>
              {gems.length === 0 && <p>No socket gemstones in backpack.</p>}
              {gems.map((gem) => (
                <div className="blacksmith-row" key={gem.id}>
                  <InventoryIcon iconIndex={gem.iconIndex} iconSheet={gem.iconSheet} iconUrl={gem.iconUrl} />
                  <div>
                    <CityItemName item={gem} />
                    <span>{socketBonusText(gem.resourceId)} | x{gem.count ?? 1}</span>
                  </div>
                  <button type="button" disabled={!selectedSockets.some((socket) => !socket)} onClick={() => onSocketGem(selectedItemIndex, gem.index)}>
                    Insert
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function CityMerchantPanel({ inventory, stock, gold, popularity, onSell, onBuy }) {
  const [tradeDraft, setTradeDraft] = useState(null);
  const sellable = (inventory ?? []).filter(merchantItemCanTrade);
  const openTrade = (mode, item, index) => {
    const max = mode === "buy"
      ? merchantTradeMax(item)
      : merchantTradeMax(item);
    const unitPrice = mode === "buy" ? merchantBuyPrice(item, popularity) : merchantSellPrice(item, popularity);
    setTradeDraft({ mode, item, index, quantity: 1, max, unitPrice });
  };
  const confirmTrade = () => {
    if (!tradeDraft) return;
    if (tradeDraft.mode === "buy") onBuy(tradeDraft.index, tradeDraft.quantity);
    else onSell(tradeDraft.index, tradeDraft.quantity);
    setTradeDraft(null);
  };
  return (
    <section className="blacksmith-station">
      <header>
        <h4>Merchant</h4>
        <span>Gold {gold} | Popularity {Math.round(popularity ?? 0)}%</span>
      </header>
      <div className="city-bank-panel">
        <div className="city-bank-column">
          <h4>Sell</h4>
          {sellable.length === 0 && <p>No sellable items in backpack.</p>}
          {sellable.map((item) => (
            <div className="blacksmith-row" key={item.id}>
              <InventoryIcon iconIndex={item.iconIndex} iconSheet={item.iconSheet} iconUrl={item.iconUrl} />
              <div>
                <CityItemName item={item} />
                <span>{merchantSellPrice(item, popularity)} G each | have {merchantTradeMax(item)} | value {item.value ?? itemValue(item)}</span>
              </div>
              <button type="button" onClick={() => openTrade("sell", item, item.index)}>Sell</button>
            </div>
          ))}
        </div>
        <div className="city-bank-column">
          <h4>Buy <span>sold items stay here</span></h4>
          {(stock ?? []).length === 0 && <p>No stock this visit.</p>}
          {(stock ?? []).map((item, index) => {
            const price = merchantBuyPrice(item, popularity);
            return (
              <div className="blacksmith-row" key={`${item.id}-${index}`}>
                <InventoryIcon iconIndex={item.iconIndex} iconSheet={item.iconSheet} iconUrl={item.iconUrl} />
                <div>
                  <CityItemName item={item} />
                  <span>{price} G each | stock {merchantTradeMax(item)} | {item.mode === "resource" ? `resource` : item.rarityLabel}</span>
                </div>
                <button type="button" disabled={gold < price} onClick={() => openTrade("buy", item, index)}>Buy</button>
              </div>
            );
          })}
        </div>
      </div>
      {tradeDraft && (
        <div className="confirm-backdrop" role="presentation" onClick={() => setTradeDraft(null)}>
          <section className="confirm-card merchant-trade-modal" role="dialog" aria-modal="true" aria-label="Confirm trade" onClick={(event) => event.stopPropagation()}>
            <h3>{tradeDraft.mode === "buy" ? "Buy" : "Sell"} {tradeDraft.item.name}</h3>
            <p>{tradeDraft.unitPrice} G each | max {tradeDraft.max}</p>
            <label>
              Quantity
              <input
                type="number"
                min="1"
                max={tradeDraft.max}
                value={tradeDraft.quantity}
                onChange={(event) => setTradeDraft((current) => ({
                  ...current,
                  quantity: Math.max(1, Math.min(current.max, Math.floor(Number(event.target.value) || 1))),
                }))}
              />
            </label>
            <div className="merchant-quantity-actions">
              <button
                type="button"
                onClick={() => setTradeDraft((current) => ({
                  ...current,
                  quantity: Math.min(current.max, current.quantity + 5),
                }))}
              >
                +5
              </button>
              <button
                type="button"
                onClick={() => setTradeDraft((current) => ({
                  ...current,
                  quantity: Math.min(current.max, current.quantity + 10),
                }))}
              >
                +10
              </button>
              <button
                type="button"
                onClick={() => setTradeDraft((current) => ({
                  ...current,
                  quantity: current.max,
                }))}
              >
                All
              </button>
            </div>
            <b>Total: {tradeDraft.unitPrice * tradeDraft.quantity} G</b>
            <div>
              <button type="button" onClick={() => setTradeDraft(null)}>Cancel</button>
              <button type="button" disabled={tradeDraft.mode === "buy" && gold < tradeDraft.unitPrice * tradeDraft.quantity} onClick={confirmTrade}>
                Accept
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function CitySkillTreePanel({ player, onBuyRank }) {
  const tree = normalizeSkillTree(player?.skillTree);
  const points = skillTreeAvailablePoints(player?.level ?? 1, tree);
  return (
    <section className="blacksmith-station">
      <header>
        <h4>Sanctuary Training</h4>
        <span>{points} skill point{points === 1 ? "" : "s"} available</span>
      </header>
      {SKILL_TREE_BRANCHES.map((branch) => {
        const branchPoints = skillTreeBranchSpentPoints(tree, branch.id);
        return (
          <div className="skill-branch" key={branch.id}>
            <header>
              <h5>{branch.title}</h5>
              <span>{branchPoints} points</span>
            </header>
            <p>{branch.description}</p>
            {branch.nodes.map((node) => {
              const rank = tree[node.id] ?? 0;
              const locked = branchPoints < (node.requiresBranchPoints ?? 0);
              const capped = rank >= node.maxRank;
              return (
                <div className={`blacksmith-row ${locked ? "locked" : ""}`} key={node.id}>
                  <div>
                    <b>{node.title} {rank}/{node.maxRank}</b>
                    <span>{locked ? `Requires ${node.requiresBranchPoints} points in ${branch.title}. ` : ""}{node.description}</span>
                  </div>
                  <button
                    type="button"
                    disabled={points <= 0 || locked || capped}
                    onClick={() => onBuyRank(node.id)}
                  >
                    Rank
                  </button>
                </div>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}

function CityArcaneExtractorPanel({ inventory, onExtract }) {
  const candidates = (inventory ?? []).filter(canExtractArcaneEssence);
  return (
    <section className="blacksmith-station">
      <header>
        <h4>Arcane Extractor</h4>
        <span>Green+ non-unique gear {"->"} Magic Essence</span>
      </header>
      {candidates.length === 0 && <p>No extractable gear in backpack.</p>}
      {candidates.map((item) => (
        <div className="blacksmith-row" key={item.id}>
          <InventoryIcon iconIndex={item.iconIndex} iconSheet={item.iconSheet} iconUrl={item.iconUrl} />
          <div>
            <CityItemName item={item} />
            <span>{item.rarityLabel} | becomes normal and loses rarity stats</span>
          </div>
          <button type="button" onClick={() => onExtract(item.index)}>Extract</button>
        </div>
      ))}
    </section>
  );
}

function CityReadableMergePanel({ inventory, kind, onMerge }) {
  const parts = (inventory ?? []).filter((item) => (
    isReadableItem(item)
    && item.readableStatus === "mergeable"
    && item.readableKind === kind
  ));
  return (
    <section className="blacksmith-station">
      <header>
        <h4>{kind === "spellbook" ? "Spellbook Assembly" : "Lorebook Assembly"}</h4>
        <span>{kind === "spellbook" ? "Merge spellbook fragments here" : "Merge lore notes here"}</span>
      </header>
      {parts.length === 0 && <p>No matching readable fragments in backpack.</p>}
      {parts.map((item) => (
        <div className="blacksmith-row" key={item.id}>
          <InventoryIcon iconIndex={item.iconIndex} iconSheet={item.iconSheet} iconUrl={item.iconUrl} />
          <div>
            <CityItemName item={item} />
            <span>{item.summaryText ?? item.readableStatus}</span>
          </div>
          <button type="button" onClick={() => onMerge(item.index)}>Merge</button>
        </div>
      ))}
    </section>
  );
}

function buildGearMergeGroups(inventory = [], category = "weapon") {
  const groups = new Map();
  for (const item of inventory) {
    if (!canBlacksmithMergeItem(item, category)) continue;
    const key = `${category}:${item.baseName}:${item.rarity}:${item.slot}:${item.mode}`;
    const rarityIndex = RARITIES.findIndex((rarity) => rarity.id === item.rarity);
    const nextRarity = RARITIES[rarityIndex + 1];
    const group = groups.get(key) ?? {
      key,
      item,
      firstIndex: item.index,
      count: 0,
      nextRarity,
    };
    group.count += 1;
    if (item.index < group.firstIndex) {
      group.firstIndex = item.index;
      group.item = item;
    }
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => (
    a.item.baseName.localeCompare(b.item.baseName) || a.item.rarityLabel.localeCompare(b.item.rarityLabel)
  ));
}

function canBlacksmithMergeItem(item, category) {
  if (!item || item.unique || item.named) return false;
  if (category === "weapon" && item.slot !== "weapon") return false;
  if (category === "armor" && item.mode !== "armor") return false;
  const rarityIndex = RARITIES.findIndex((rarity) => rarity.id === item.rarity);
  return rarityIndex >= 0 && rarityIndex < RARITIES.length - 1;
}

function cityAddonIsUnlocked(addon, snapshot) {
  if (addon?.prebuilt) return true;
  const required = addon?.unlock?.completedQuests ?? [];
  if (!required.length) return true;
  const completed = new Set((snapshot?.quests?.completed ?? []).map(String));
  return required.every((questId) => completed.has(String(questId)));
}

function cityAddonLockText(addon, snapshot) {
  if (cityAddonIsUnlocked(addon, snapshot)) return "";
  if (addon?.unlock?.text) return addon.unlock.text;
  const required = addon?.unlock?.completedQuests ?? [];
  const completed = new Set((snapshot?.quests?.completed ?? []).map(String));
  const missing = required.filter((questId) => !completed.has(String(questId)));
  if (!missing.length) return "Locked";
  return `Requires ${missing.map((questId) => QUEST_DEFS[questId]?.title ?? questId).join(", ")}`;
}

function normalizeInventoryType(value) {
  if (!value || value === "none") return { type: "none", slots: 0 };
  if (typeof value === "number") return { type: "all", slots: Math.max(0, Math.floor(value)) };
  if (typeof value === "string") return { type: value, slots: 0 };
  return {
    type: String(value.type ?? value.accepts ?? "none"),
    slots: Math.max(0, Math.floor(Number(value.slots ?? value.size ?? 0) || 0)),
  };
}

function cityInventorySectionKey(source) {
  return source?.id ? `addon:${source.id}` : "base";
}

function cityInventorySections(building, state, owned) {
  if (!owned) return [];
  const sections = [];
  const baseInventory = normalizeInventoryType(building.inventoryType);
  const baseFixedDefs = fixedReadableDefsForInventoryType(baseInventory.type);
  const baseSlots = baseFixedDefs.length || baseInventory.slots;
  if (baseInventory.type !== "none" && baseSlots > 0) {
    sections.push({
      key: "base",
      label: building.title,
      type: baseInventory.type,
      typeLabel: cityInventoryTypeLabel(baseInventory.type),
      slots: baseSlots,
      fixedDefs: baseFixedDefs,
    });
  }
  const bought = new Set(state.addons ?? []);
  for (const addon of building.addons ?? []) {
    if (!bought.has(addon.id)) continue;
    const addonInventory = normalizeInventoryType(addon.inventoryType);
    const fixedDefs = fixedReadableDefsForInventoryType(addonInventory.type);
    const slots = fixedDefs.length || addonInventory.slots;
    if (addonInventory.type === "none" || slots <= 0) continue;
    sections.push({
      key: cityInventorySectionKey(addon),
      label: addon.title,
      type: addonInventory.type,
      typeLabel: cityInventoryTypeLabel(addonInventory.type),
      slots,
      fixedDefs,
    });
  }
  return sections;
}

function normalizeCityInventories(state, building) {
  const source = state?.inventories && typeof state.inventories === "object" ? state.inventories : {};
  const next = { ...source };
  if (!next.base && Array.isArray(state?.items)) next.base = state.items;
  for (const section of cityInventorySections(building, state, true)) {
    next[section.key] = Array.from({ length: section.slots }, (_, index) => next[section.key]?.[index] ?? null);
  }
  return next;
}

function cityInventoryTypeLabel(type) {
  const labels = {
    all: "All items",
    gemstone: "Gemstones",
    potion: "Potions",
    resource: "Resources",
    weapon: "Weapons",
    armor: "Armor",
    quest: "Quest items",
    readable: "Readables",
    fixed_lorebook: "Lorebooks",
    fixed_spellbook: "Spellbooks",
  };
  return labels[type] ?? type;
}

function fixedReadableDefsForInventoryType(type) {
  if (type === "fixed_lorebook") {
    return READABLE_ITEM_DEFS.filter((def) => def.kind === "lorebook" && def.status !== "mergeable");
  }
  if (type === "fixed_spellbook") {
    return READABLE_ITEM_DEFS.filter((def) => def.kind === "spellbook" && def.status !== "mergeable");
  }
  return [];
}

function cityInventorySlotCount(inventoryType) {
  const normalized = normalizeInventoryType(inventoryType);
  return fixedReadableDefsForInventoryType(normalized.type).length || normalized.slots;
}

function itemMatchesCityInventorySlot(item, section, slotIndex) {
  if (!item || !section) return false;
  const fixedDef = section.fixedDefs?.[slotIndex];
  if (fixedDef) return isReadableItem(item) && String(item.readableId) === String(fixedDef.id);
  return itemMatchesCityInventoryType(item, section.type);
}

function itemCanEnterAnyCityInventorySlot(item, section, storedItems = []) {
  if (!item || !section) return false;
  for (let index = 0; index < section.slots; index += 1) {
    if (!storedItems[index] && itemMatchesCityInventorySlot(item, section, index)) return true;
  }
  return false;
}

function firstCityInventorySlotForItem(item, section, storedItems = []) {
  if (!item || !section) return -1;
  for (let index = 0; index < section.slots; index += 1) {
    if (!storedItems[index] && itemMatchesCityInventorySlot(item, section, index)) return index;
  }
  return -1;
}

function itemMatchesCityInventoryType(item, type) {
  if (!item || !type || type === "none") return false;
  if (type === "all") return true;
  if (type === "gemstone") return item.mode === "resource" && (RESOURCE_DEFS[item.resourceId]?.sheet === "gemstones" || String(item.resourceId ?? "").includes("gemstone") || item.resourceId === "diamond");
  if (type === "potion") return isPotionItem(item);
  if (type === "resource") return isResourceItem(item);
  if (type === "weapon") return item.slot === "weapon";
  if (type === "armor") return item.mode === "armor";
  if (type === "quest") return isQuestItem(item);
  if (type === "readable") return isReadableItem(item);
  if (type === "fixed_lorebook") return isReadableItem(item) && item.readableKind === "lorebook" && item.readableStatus !== "mergeable";
  if (type === "fixed_spellbook") return isReadableItem(item) && item.readableKind === "spellbook" && item.readableStatus !== "mergeable";
  return item.mode === type || item.slot === type;
}

function canExtractArcaneEssence(item) {
  if (!item || item.unique || item.named) return false;
  if (item.mode === "resource" || item.mode === "potion" || item.mode === "readable") return false;
  const rarityIndex = RARITIES.findIndex((rarity) => rarity.id === item.rarity);
  const normalIndex = RARITIES.findIndex((rarity) => rarity.id === "normal");
  return rarityIndex > normalIndex;
}

function goldBarUnitCost(popularity) {
  const value = Math.max(0, Math.min(100, Number(popularity) || 0));
  return Math.max(1, Math.round(1000 * Math.max(0.75, Math.min(1.25, 1.25 - (value / 100) * 0.5))));
}

function cityResourceCount(inventory = [], resourceId) {
  return (inventory ?? []).reduce((total, item) => {
    if (item?.mode !== "resource" || item.resourceId !== resourceId) return total;
    return total + Math.max(1, Math.floor(Number(item.count) || 1));
  }, 0);
}

function popularityBonusStep(popularity) {
  return Math.max(0, Math.floor((Math.max(0, Number(popularity) || 0) - 50) / 10));
}

function foodBarrelCost(popularity) {
  return Math.max(50, 100 - (popularityBonusStep(popularity) * 5));
}

function cityResearchRecipes() {
  return RESOURCE_MERGE_RECIPES.filter((recipe) => cityRecipeRequiresResearchLab(recipe));
}

function cityRecipeRequiresResearchLab(recipe) {
  if (recipe?.station === "research_lab") return true;
  const ids = [...Object.keys(recipe?.inputs ?? {}), recipe?.output].map(String);
  return ids.some((id) => id === "diamond" || id.includes("gemstone"));
}

function researchRecipeKey(recipe) {
  const inputs = Object.entries(recipe?.inputs ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([resourceId, count]) => `${resourceId}:${count}`)
    .join("+");
  return `${inputs}->${recipe?.output}:${recipe?.count ?? 1}`;
}

function researchRecipeByKey(recipeKey) {
  return cityResearchRecipes().find((recipe) => researchRecipeKey(recipe) === recipeKey) ?? null;
}

function researchRecipeCost(recipe) {
  const inputTotal = Object.values(recipe?.inputs ?? {}).reduce((sum, count) => sum + Math.max(1, Number(count) || 1), 0);
  return Math.max(250, Math.min(5000, Math.round(inputTotal)));
}

function socketText(item) {
  const sockets = normalizeSockets(item?.sockets);
  if (!sockets.length) return "No sockets";
  return sockets.map((socket) => socket ? RESOURCE_DEFS[socket.resourceId]?.name ?? socket.resourceId : "Empty").join(" | ");
}

function socketBonusText(resourceId) {
  const bonuses = GEM_SOCKET_BONUSES[resourceId]?.bonuses ?? {};
  return Object.entries(bonuses).map(([key, value]) => {
    const pct = ["damagePct", "maxHpPct", "maxManaPct", "speedPct", "critChance", "dodgeChance", "goldFind", "magicFind", "xpGain", "lifeSteal"].includes(key);
    return `${key} ${pct ? `${Math.round(value * 100)}%` : `+${value}`}`;
  }).join(", ");
}

function merchantItemCanTrade(item) {
  if (!item || isQuestItem(item)) return false;
  if (item.unique || item.uniqueId || item.rarity === "unique") return false;
  return true;
}

function merchantTradeMax(item) {
  return isResourceItem(item) ? Math.max(1, Math.floor(Number(item.count) || 1)) : 1;
}

function merchantTradeQuantity(item, quantity) {
  return Math.max(1, Math.min(merchantTradeMax(item), Math.floor(Number(quantity) || 1)));
}

function merchantSellPrice(item, popularity) {
  const value = Math.max(1, Math.floor(Number(item?.value) || itemValue(item)));
  const pop = Math.max(0, Math.min(100, Number(popularity) || 0));
  return Math.max(1, Math.floor(value * (0.22 + pop * 0.0036)));
}

function merchantBuyPrice(item, popularity) {
  const value = Math.max(1, Math.floor(Number(item?.value) || itemValue(item)));
  const pop = Math.max(0, Math.min(100, Number(popularity) || 0));
  return Math.max(2, Math.ceil(value * (2.55 - pop * 0.0075)));
}

function merchantCloneItem(item) {
  return {
    ...item,
    id: Math.floor(Date.now() + Math.random() * 1000000),
    sockets: normalizeSockets(item?.sockets),
  };
}

function generateMerchantStock(level, soldItems = []) {
  const stock = [...(soldItems ?? []).slice(0, 10).map(merchantCloneItem)];
  const resourceIds = Object.keys(RESOURCE_DEFS).filter((id) => id !== "diamond");
  let guard = 0;
  while (stock.length < 18 && guard < 80) {
    guard += 1;
    const roll = Math.random();
    const item = roll < 0.42
      ? makeResourceItem(resourceIds[Math.floor(Math.random() * resourceIds.length)], Math.ceil(1 + Math.random() * 8))
      : makeItem(Math.max(1, Math.floor(Number(level) || 1)), roll < 0.7 ? 0.1 : 0.9);
    if (!merchantItemCanTrade(item)) continue;
    const rarityIndex = RARITIES.findIndex((rarity) => rarity.id === item.rarity);
    if (rarityIndex >= 4 && Math.random() < 0.86) continue;
    if (rarityIndex === 3 && Math.random() < 0.68) continue;
    stock.push(merchantCloneItem(item));
  }
  return stock;
}

function rerollMerchantStockForCityVisit(progress, level) {
  const merchantBuilding = CITY_BUILDINGS.find((building) => building.id === "merchant");
  if (!merchantBuilding) return progress;
  const state = progress?.merchant ?? {};
  const merchant = state.merchant ?? {};
  return {
    ...progress,
    merchant: {
      ...state,
      merchant: {
        ...merchant,
        stock: generateMerchantStock(level, merchant.soldItems ?? []),
      },
    },
  };
}

function applyDurabilityDegradationForVisit(progress) {
  if (!progress) return progress;
  const next = { ...progress };
  // degrade areas
  next.areas = { ...next.areas };
  for (const area of CITY_AREAS) {
    const id = area.id;
    if (!id) continue;
    const state = next.areas?.[id] ?? (area.prebuilt ? { unlocked: true, level: 1, durability: DURABILITY_DEFAULT } : undefined);
    if (!state) continue;
    const currentDur = Math.max(0, Math.min(100, Number(state.durability ?? DURABILITY_DEFAULT)));
    if (Math.random() < DURABILITY_DEGRADE_CHANCE) {
      const drop = Math.random() * (DURABILITY_DEGRADE_MAX_PCT - DURABILITY_DEGRADE_MIN_PCT) + DURABILITY_DEGRADE_MIN_PCT;
      const newDur = Math.max(0, currentDur - drop);
      next.areas[id] = { ...state, durability: newDur };
    } else {
      next.areas[id] = { ...state, durability: currentDur };
    }
  }
  // degrade buildings
  for (const building of CITY_BUILDINGS) {
    const id = building.id;
    if (!id) continue;
    const state = next[id] ?? (building.prebuilt ? { level: 1, durability: DURABILITY_DEFAULT } : undefined);
    if (!state) continue;
    const currentDur = Math.max(0, Math.min(100, Number(state.durability ?? DURABILITY_DEFAULT)));
    if (Math.random() < DURABILITY_DEGRADE_CHANCE) {
      const drop = Math.random() * (DURABILITY_DEGRADE_MAX_PCT - DURABILITY_DEGRADE_MIN_PCT) + DURABILITY_DEGRADE_MIN_PCT;
      const newDur = Math.max(0, currentDur - drop);
      next[id] = { ...state, durability: newDur };
    } else {
      next[id] = { ...state, durability: currentDur };
    }
  }
  return next;
}

function readableDialogFromItem(item) {
  if (!item || !isReadableItem(item)) return null;
  return {
    title: item.name ?? READABLE_DEF_BY_ID[item.readableId]?.title ?? "Readable",
    text: item.storyText ?? READABLE_DEF_BY_ID[item.readableId]?.story ?? item.summaryText ?? READABLE_DEF_BY_ID[item.readableId]?.summary ?? "",
  };
}

function blacksmithItemCanEnterMergeSlot(item, category, firstItem = null) {
  if (!canBlacksmithMergeItem(item, category)) return false;
  if (!firstItem) return true;
  return item.baseName === firstItem.baseName
    && item.rarity === firstItem.rarity
    && item.slot === firstItem.slot
    && item.mode === firstItem.mode;
}

function parseCityDragPayload(event) {
  try {
    const raw = event.dataTransfer.getData("application/x-city-item");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function CityCostSummary({ costEntries, buildingState, snapshot }) {
  if (!costEntries.length) return null;
  return (
    <div className="city-cost-summary">
      {costEntries.map(([resourceId, needed]) => {
        const paid = Math.max(0, buildingState.paid?.[resourceId] ?? 0);
        const remaining = Math.max(0, needed - paid);
        return (
          <span key={resourceId}>
            <CityCostIcon resourceId={resourceId} />
            {paid}/{needed} {cityCostLabel(resourceId)}
            {remaining > 0 && ` (${cityCostAvailable(snapshot, resourceId)} available)`}
          </span>
        );
      })}
    </div>
  );
}

function CityStatEffectsSummary({ title, effects }) {
  const entries = Object.entries(mergeCityStatEffects([effects]));
  if (!entries.length) return null;
  return (
    <div className="city-stat-effects">
      {title && <b>{title}</b>}
      <div>
        {entries.map(([statId, amount]) => (
          <span className={amount >= 0 ? "positive" : "negative"} key={statId}>
            {amount >= 0 ? "+" : ""}{amount} {cityStatLabel(statId)}
          </span>
        ))}
      </div>
    </div>
  );
}

function CityCampStats({ cityStats }) {
  const hungry = Math.max(0, Math.floor(Number(cityStats.hungry_people) || 0));
  const homeless = Math.max(0, Math.floor(Number(cityStats.homeless_people) || 0));
  const thirsty = Math.max(0, Math.floor(Number(cityStats.thirsty_people) || 0));
  const camp = Math.max(0, Math.floor(Number(cityStats.camp_population) || 0));
  const overlapText = camp > 0
    ? `${Math.max(0, camp - hungry)} only homeless/other unmet | ${Math.min(hungry, camp)} also hungry`
    : "No citizens are forced into camp.";
  return (
    <div className="city-stat-effects">
      <b>Camp</b>
      <div>
        <span>{camp} outside city</span>
        <span>{homeless} homeless</span>
        <span>{hungry} hungry</span>
        <span>{thirsty} thirsty</span>
      </div>
      <p>{overlapText}</p>
    </div>
  );
}

function CityBuildPaymentModal({ building, buildingState, snapshot, costEntries, canFinish, canPayAll, statRequirementsMet = true, onApplyResource, onPayAll, onFinish, onClose }) {
  return (
    <div className="city-build-payment-backdrop" role="presentation">
      <section className="city-build-payment-modal" role="dialog" aria-modal="true" aria-label={`Build ${building.title}`}>
        <header>
          <div>
            <h4>{building.title}</h4>
            <span>Pay construction cost</span>
          </div>
          <button type="button" onClick={onClose}>X</button>
        </header>
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
                <button type="button" disabled={!statRequirementsMet || !remaining || !available} onClick={() => onApplyResource(resourceId, 1)}>+1</button>
                <button type="button" disabled={!statRequirementsMet || !remaining || !available} onClick={() => onApplyResource(resourceId, Math.min(10, remaining))}>+10</button>
                <button type="button" disabled={!statRequirementsMet || !remaining || !available} onClick={() => onApplyResource(resourceId, remaining)}>Max</button>
              </div>
            );
          })}
        </div>
        <footer>
          <button type="button" onClick={onClose}>Close</button>
          <button type="button" disabled={!canPayAll} onClick={onPayAll}>Pay all</button>
          <button type="button" disabled={!statRequirementsMet || !canFinish} onClick={onFinish}>Build</button>
        </footer>
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

function CityStoragePanel({
  building,
  buildingState,
  owned,
  inventory,
  activeSectionKey,
  draggedCityItem,
  onDragCityItem,
  onDepositInventoryItem,
  onWithdrawStoredItem,
  onMoveStoredItem,
  onReadStoredItem,
}) {
  const sections = cityInventorySections(building, buildingState, owned);
  const activeSection = sections.find((section) => section.key === activeSectionKey) ?? sections[0];
  const inventories = normalizeCityInventories(buildingState, building);
  const storedItems = inventories[activeSection?.key] ?? [];
  const inventorySlots = Array.from({ length: MAX_INVENTORY }, (_, index) => ({ item: inventory[index] ?? null, index }))
    .filter(({ item }) => (
      !activeSection?.fixedDefs?.length
      || (Boolean(item) && itemCanEnterAnyCityInventorySlot(item, activeSection, storedItems))
    ));

  if (!activeSection) return null;

  return (
    <section className="city-bank-panel">
      <div className="city-bank-column">
        <h4>Backpack</h4>
        <div
          className="city-bank-grid backpack-drop"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            if (draggedCityItem?.source === "storage") onWithdrawStoredItem(draggedCityItem.sectionKey, draggedCityItem.slotIndex);
            onDragCityItem(null);
          }}
        >
          {inventorySlots.map(({ item, index }) => {
            const canEnter = itemCanEnterAnyCityInventorySlot(item, activeSection, storedItems);
            return (
            <CityItemSlot
              key={`inv-${index}`}
              item={item}
              locked={false}
              draggable={Boolean(item) && canEnter}
              accepted={Boolean(item) && canEnter}
              muted={Boolean(item) && !canEnter}
              onDoubleClick={() => {
                const slotIndex = firstCityInventorySlotForItem(item, activeSection, storedItems);
                if (slotIndex >= 0) onDepositInventoryItem(index, activeSection.key, slotIndex);
              }}
              onDragStart={(event) => {
                event.dataTransfer.setData("application/x-city-item", JSON.stringify({ source: "inventory", index }));
                event.dataTransfer.effectAllowed = "move";
              }}
            />
            );
          })}
        </div>
      </div>
      <div className="city-bank-column">
        <h4>{activeSection.label} <span>{activeSection.typeLabel}</span></h4>
        <div className="city-bank-grid">
          {Array.from({ length: activeSection.slots }, (_, index) => {
            const locked = !owned;
            return (
              <CityItemSlot
                key={`${activeSection.key}-${index}`}
                item={storedItems[index]}
                placeholder={activeSection.fixedDefs?.[index]}
                locked={locked}
                draggable={owned && Boolean(storedItems[index]) && !activeSection.fixedDefs?.[index]}
                onClick={() => {
                  if (storedItems[index] && isReadableItem(storedItems[index])) onReadStoredItem(storedItems[index]);
                }}
                onDoubleClick={() => {
                  if (storedItems[index] && !activeSection.fixedDefs?.[index]) onWithdrawStoredItem(activeSection.key, index);
                }}
                onDragStart={(event) => {
                  if (activeSection.fixedDefs?.[index]) return;
                  onDragCityItem({ source: "storage", sectionKey: activeSection.key, slotIndex: index });
                  event.dataTransfer.setData("application/x-city-item", JSON.stringify({ source: "storage", sectionKey: activeSection.key, slotIndex: index }));
                  event.dataTransfer.effectAllowed = "move";
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (locked) return;
                  const payload = parseCityDragPayload(event);
                  if (payload?.source === "inventory") onDepositInventoryItem(payload.index, activeSection.key, index);
                  if (payload?.source === "storage") onMoveStoredItem(payload.sectionKey, payload.slotIndex, activeSection.key, index);
                  onDragCityItem(null);
                }}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CityItemSlot({ item, placeholder, locked, draggable, accepted, muted, onClick, onDoubleClick, onDragStart, onDrop }) {
  const rarityClass = cityItemRarityClass(item);
  const qualityColor = cityItemQualityColor(item);
  return (
    <button
      type="button"
      className={`city-item-slot ${locked ? "locked" : ""} ${item ? "filled" : ""} ${rarityClass} ${accepted ? "accepted" : ""} ${muted ? "muted" : ""}`}
      style={qualityColor ? { "--city-item-quality": qualityColor } : undefined}
      draggable={draggable}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onDragStart={onDragStart}
      onDragOver={(event) => {
        if (onDrop) event.preventDefault();
      }}
      onDrop={onDrop}
      title={locked ? "Locked" : item?.name ?? placeholder?.title ?? "Empty"}
    >
      {locked ? <span>LOCK</span> : item ? (
        <InventoryIcon iconIndex={item.iconIndex} iconSheet={item.iconSheet} iconUrl={item.iconUrl} />
      ) : placeholder ? (
        <img className="city-slot-placeholder" src={placeholder.iconUrl} alt="" draggable="false" />
      ) : null}
      {!locked && item?.count > 1 && <b>{item.count}</b>}
    </button>
  );
}

function cityItemRarityClass(item) {
  if (!item) return "";
  if (item.mode === "resource") return "resource-rarity";
  return item.rarity ? `rarity-${item.rarity}` : "";
}

function cityItemQualityColor(item) {
  if (!item) return null;
  if (item.rarityColor) return item.rarityColor;
  if (item.mode === "resource") return RESOURCE_DEFS[item.resourceId]?.rarityColor ?? "#8be9ff";
  return RARITIES.find((rarity) => rarity.id === item.rarity)?.color ?? null;
}

function CityItemName({ item }) {
  if (!item) return null;
  const className = item.mode === "resource" ? "resource-rarity" : item.rarity ?? "";
  return <b className={className} style={{ color: cityItemQualityColor(item) ?? undefined }}>{item.name}</b>;
}

function drawCityPopupThumb(canvas, sprite, muted) {
  if (!canvas || !sprite) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const sourceW = imageSourceWidth(sprite);
  const sourceH = imageSourceHeight(sprite);
  const scale = Math.min(canvas.width * 0.9 / sourceW, canvas.height * 0.9 / sourceH);
  const w = sourceW * scale;
  const h = sourceH * scale;
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
