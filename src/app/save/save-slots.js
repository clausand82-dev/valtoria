import { WORLD_MAP } from "../../game/config/map-region-config.js";
import { SAVE_STORAGE_KEY } from "../../game/config/game-engine-config.js";
import { saveRepository } from "../../storage/saveRepository.js";
import {
  CITY_STORAGE_KEY,
  REGION_CORRUPTION_STORAGE_KEY,
  REGION_MAP_LAST_ID_STORAGE_KEY,
  saveSlotKeys,
} from "./save-keys.js";

export function loadRegionCorruption(storageKey = REGION_CORRUPTION_STORAGE_KEY) {
  return saveRepository.loadRegionCorruptionSync(storageKey);
}

export function loadRegionMapInitialId(storageKey = REGION_MAP_LAST_ID_STORAGE_KEY) {
  return saveRepository.loadLastRegionMapIdSync(storageKey);
}

export function saveRegionCorruption(regionCorruption, storageKey = REGION_CORRUPTION_STORAGE_KEY) {
  saveRepository.saveRegionCorruptionSync(storageKey, regionCorruption);
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
  return saveRepository.loadSaveSync(storageKey);
}

function readSaveIndex() {
  return saveRepository.readSaveIndexSync();
}

function writeSaveIndex(slots) {
  saveRepository.writeSaveIndexSync(slots);
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
