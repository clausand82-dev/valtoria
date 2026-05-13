import { AREA_MAPS, MAP_REGION_SETS, WORLD_MAP } from "../../game/config/map-region-config.js";
import { SAVE_STORAGE_KEY, SAVE_VERSION } from "../../game/config/game-engine-config.js";
import { SAVE_PERSIST_CONFIG } from "../../game/config/save-persist-config.js";
import {
  CITY_STORAGE_KEY,
  REGION_CORRUPTION_STORAGE_KEY,
  REGION_MAP_LAST_ID_STORAGE_KEY,
  SAVE_INDEX_STORAGE_KEY,
  regionStatusKey,
  saveSlotKeys,
} from "./save-keys.js";

export function loadRegionCorruption(storageKey = REGION_CORRUPTION_STORAGE_KEY) {
  const initial = {};
  for (const [areaMapId, regions] of Object.entries(MAP_REGION_SETS)) {
    if (areaMapId === WORLD_MAP.id) continue;
    for (const region of regions) {
      initial[regionStatusKey(areaMapId, region.id)] = region.corrupted !== false;
    }
  }

  if (!SAVE_PERSIST_CONFIG.storage.regionCorruption) return initial;

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

export function loadRegionMapInitialId(storageKey = REGION_MAP_LAST_ID_STORAGE_KEY) {
  if (!SAVE_PERSIST_CONFIG.storage.regionMapLastId) return WORLD_MAP.id;
  try {
    const saved = String(localStorage.getItem(storageKey) || "").trim();
    if (saved === WORLD_MAP.id) return WORLD_MAP.id;
    if (saved && AREA_MAPS[saved]) return saved;
  } catch {
    // Fallback to world map when storage is unavailable.
  }
  return WORLD_MAP.id;
}

export function saveRegionCorruption(regionCorruption, storageKey = REGION_CORRUPTION_STORAGE_KEY) {
  if (!SAVE_PERSIST_CONFIG.storage.regionCorruption) return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(regionCorruption));
  } catch {
    // Ignore quota or storage-denied errors.
  }
}

export function normalizeSaveSlot(slot) {
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
  if (!SAVE_PERSIST_CONFIG.storage.playerSave) return null;
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
  if (!SAVE_PERSIST_CONFIG.storage.saveIndex) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVE_INDEX_STORAGE_KEY) || "{}");
    const rawSlots = Array.isArray(parsed) ? parsed : Array.isArray(parsed.slots) ? parsed.slots : [];
    return rawSlots.map(normalizeSaveSlot).filter(Boolean);
  } catch {
    return [];
  }
}

function writeSaveIndex(slots) {
  if (!SAVE_PERSIST_CONFIG.storage.saveIndex) return;
  try {
    localStorage.setItem(SAVE_INDEX_STORAGE_KEY, JSON.stringify({ version: 1, slots }));
  } catch {
    // Save slot metadata is convenience data; the actual save payload is stored separately.
  }
}

export function upsertSaveSlot(slot) {
  const normalized = normalizeSaveSlot(slot);
  if (!normalized || normalized.legacy) return normalized;
  const slots = readSaveIndex();
  const next = [normalized, ...slots.filter((entry) => entry.id !== normalized.id)];
  writeSaveIndex(next);
  return normalized;
}

export function createSaveSlot() {
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

export function collectSaveSlots() {
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

export function formatSaveTimestamp(timestamp) {
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
