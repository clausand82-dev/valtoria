import { AREA_MAPS, MAP_REGION_SETS, WORLD_MAP } from "../game/config/map-region-config.js";
import { SAVE_STORAGE_KEY, SAVE_VERSION } from "../game/config/game-engine-config.js";
import { SAVE_PERSIST_CONFIG } from "../game/config/save-persist-config.js";
import {
  CITY_STORAGE_KEY,
  SAVE_SLOT_STORAGE_PREFIX,
  REGION_CORRUPTION_STORAGE_KEY,
  REGION_MAP_LAST_ID_STORAGE_KEY,
  SAVE_INDEX_STORAGE_KEY,
  regionStatusKey,
  saveSlotKeys,
} from "./saveKeys.js";

function warnStorageError(action, key, error) {
  if (import.meta.env.DEV) {
    console.warn(`[saveRepository] ${action} failed for ${key}`, error);
  }
}

function safeJsonParse(value, fallback) {
  if (value == null || value === "") return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    warnStorageError("JSON parse", "localStorage value", error);
    return fallback;
  }
}

function safeJsonStringify(value) {
  try {
    return JSON.stringify(value);
  } catch (error) {
    warnStorageError("JSON stringify", "localStorage value", error);
    return null;
  }
}

function readText(key, fallback = null) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch (error) {
    warnStorageError("read", key, error);
    return fallback;
  }
}

function writeText(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    warnStorageError("write", key, error);
    return false;
  }
}

function removeKey(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    warnStorageError("remove", key, error);
    return false;
  }
}

function readJson(key, fallback) {
  return safeJsonParse(readText(key), fallback);
}

function writeJson(key, value) {
  const serialized = safeJsonStringify(value);
  if (serialized == null) return false;
  return writeText(key, serialized);
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

function savePayloadStorageKey(slotIdOrKey = SAVE_STORAGE_KEY) {
  const key = String(slotIdOrKey || SAVE_STORAGE_KEY);
  if (key === SAVE_STORAGE_KEY || key.startsWith(SAVE_SLOT_STORAGE_PREFIX)) return key;
  const directPayload = readJson(key, null);
  if (directPayload) return key;
  const slotKey = saveSlotKeys(key).saveKey;
  return readJson(slotKey, null) ? slotKey : key;
}

function writeSavePayloadStorageKey(slotIdOrKey = SAVE_STORAGE_KEY) {
  const key = String(slotIdOrKey || SAVE_STORAGE_KEY);
  if (key === SAVE_STORAGE_KEY || key.startsWith(SAVE_SLOT_STORAGE_PREFIX)) return key;
  return saveSlotKeys(key).saveKey;
}

function initialRegionCorruption() {
  const initial = {};
  for (const [areaMapId, regions] of Object.entries(MAP_REGION_SETS)) {
    if (areaMapId === WORLD_MAP.id) continue;
    for (const region of regions) {
      initial[regionStatusKey(areaMapId, region.id)] = region.corrupted !== false;
    }
  }
  return initial;
}

export const localSaveRepository = {
  async listSaves() {
    return this.listSavesSync();
  },

  listSavesSync() {
    return this.readSaveIndexSync();
  },

  async readSaveIndex() {
    return this.readSaveIndexSync();
  },

  readSaveIndexSync() {
    if (!SAVE_PERSIST_CONFIG.storage.saveIndex) return [];
    const parsed = readJson(SAVE_INDEX_STORAGE_KEY, {});
    const rawSlots = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.slots) ? parsed.slots : [];
    return rawSlots.map(normalizeSaveSlot).filter(Boolean);
  },

  async writeSaveIndex(index) {
    return this.writeSaveIndexSync(index);
  },

  writeSaveIndexSync(index) {
    if (!SAVE_PERSIST_CONFIG.storage.saveIndex) return false;
    return writeJson(SAVE_INDEX_STORAGE_KEY, { version: 1, slots: Array.isArray(index) ? index : [] });
  },

  async loadSave(slotIdOrKey) {
    return this.loadSaveSync(slotIdOrKey);
  },

  loadSaveSync(slotIdOrKey = SAVE_STORAGE_KEY) {
    if (!SAVE_PERSIST_CONFIG.storage.playerSave) return null;
    const storageKey = savePayloadStorageKey(slotIdOrKey);
    const parsed = readJson(storageKey, null);
    if (!parsed || parsed.version !== SAVE_VERSION) return null;
    return parsed;
  },

  async saveGame(slotIdOrKey, payload) {
    return this.saveGameSync(slotIdOrKey, payload);
  },

  saveGameSync(slotIdOrKey = SAVE_STORAGE_KEY, payload) {
    if (!SAVE_PERSIST_CONFIG.storage.playerSave) return false;
    return writeJson(writeSavePayloadStorageKey(slotIdOrKey), payload);
  },

  async deleteSave(slotIdOrKey) {
    return this.deleteSaveSync(slotIdOrKey);
  },

  deleteSaveSync(slotIdOrKey) {
    const storageKey = String(slotIdOrKey || "");
    if (!storageKey) return false;
    const slot = this.readSaveIndexSync().find((entry) => entry.id === storageKey || entry.saveKey === storageKey);
    if (slot) {
      removeKey(slot.saveKey);
      removeKey(slot.cityStorageKey);
      removeKey(slot.regionCorruptionStorageKey);
      removeKey(slot.regionMapLastIdStorageKey);
      this.writeSaveIndexSync(this.readSaveIndexSync().filter((entry) => entry.id !== slot.id));
      return true;
    }
    return removeKey(storageKey);
  },

  async loadCityProgress(storageKey = CITY_STORAGE_KEY) {
    return this.loadCityProgressSync(storageKey);
  },

  loadCityProgressSync(storageKey = CITY_STORAGE_KEY) {
    if (!SAVE_PERSIST_CONFIG.storage.cityProgress) return {};
    const parsed = readJson(storageKey, {});
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  },

  async saveCityProgress(storageKey = CITY_STORAGE_KEY, cityProgress) {
    return this.saveCityProgressSync(storageKey, cityProgress);
  },

  saveCityProgressSync(storageKey = CITY_STORAGE_KEY, cityProgress) {
    if (!SAVE_PERSIST_CONFIG.storage.cityProgress) return false;
    return writeJson(storageKey, cityProgress);
  },

  async loadRegionCorruption(storageKey = REGION_CORRUPTION_STORAGE_KEY) {
    return this.loadRegionCorruptionSync(storageKey);
  },

  loadRegionCorruptionSync(storageKey = REGION_CORRUPTION_STORAGE_KEY) {
    const initial = initialRegionCorruption();
    if (!SAVE_PERSIST_CONFIG.storage.regionCorruption) return initial;
    const saved = readJson(storageKey, {});
    if (saved && typeof saved === "object") {
      for (const key of Object.keys(initial)) {
        if (typeof saved[key] === "boolean") initial[key] = saved[key];
      }
    }
    return initial;
  },

  async saveRegionCorruption(storageKey = REGION_CORRUPTION_STORAGE_KEY, data) {
    return this.saveRegionCorruptionSync(storageKey, data);
  },

  saveRegionCorruptionSync(storageKey = REGION_CORRUPTION_STORAGE_KEY, data) {
    if (!SAVE_PERSIST_CONFIG.storage.regionCorruption) return false;
    return writeJson(storageKey, data);
  },

  async loadLastRegionMapId(storageKey = REGION_MAP_LAST_ID_STORAGE_KEY) {
    return this.loadLastRegionMapIdSync(storageKey);
  },

  loadLastRegionMapIdSync(storageKey = REGION_MAP_LAST_ID_STORAGE_KEY) {
    if (!SAVE_PERSIST_CONFIG.storage.regionMapLastId) return WORLD_MAP.id;
    const saved = String(readText(storageKey, "") || "").trim();
    if (saved === WORLD_MAP.id) return WORLD_MAP.id;
    if (saved && AREA_MAPS[saved]) return saved;
    return WORLD_MAP.id;
  },

  async saveLastRegionMapId(storageKey = REGION_MAP_LAST_ID_STORAGE_KEY, mapId) {
    return this.saveLastRegionMapIdSync(storageKey, mapId);
  },

  saveLastRegionMapIdSync(storageKey = REGION_MAP_LAST_ID_STORAGE_KEY, mapId) {
    if (!SAVE_PERSIST_CONFIG.storage.regionMapLastId) return false;
    return writeText(storageKey, String(mapId ?? ""));
  },
};
