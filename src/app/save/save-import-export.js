import { WORLD_MAP } from "../../game/config/map-region-config.js";
import { GAME_VERSION } from "../../game/config/game-constants-config.js";
import { saveRepository } from "../../storage/saveRepository.js";
import { createSaveSlot, loadRegionCorruption, loadRegionMapInitialId, normalizeSaveSlot, upsertSaveSlot } from "./save-slots.js";

export function migrateImportedSave(importedSaveWrapper) {
  return importedSaveWrapper.save;
}

export function validateImportedSaveWrapper(wrapper) {
  if (!wrapper || typeof wrapper !== "object" || Array.isArray(wrapper)) return false;
  if (wrapper.game !== "Valtoria") return false;
  if (wrapper.type !== "savegame") return false;
  if (typeof wrapper.version !== "number") return false;
  return wrapper.save !== undefined && wrapper.save !== null;
}

export function buildSaveExportWrapper(slot) {
  const normalizedSlot = normalizeSaveSlot(slot);
  if (!normalizedSlot) return null;
  const payload = saveRepository.loadSaveSync(normalizedSlot.saveKey);
  if (!payload) return null;
  return {
    game: "Valtoria",
    type: "savegame",
    version: 1,
    exportedAt: new Date().toISOString(),
    appVersion: GAME_VERSION,
    saveId: normalizedSlot.id,
    save: {
      payload,
      cityProgress: saveRepository.loadCityProgressSync(normalizedSlot.cityStorageKey),
      regionCorruption: loadRegionCorruption(normalizedSlot.regionCorruptionStorageKey),
      regionMapLastId: loadRegionMapInitialId(normalizedSlot.regionMapLastIdStorageKey),
    },
  };
}

function normalizeImportedSaveData(importedSave) {
  if (!importedSave || typeof importedSave !== "object" || Array.isArray(importedSave)) return null;
  if (importedSave.payload && typeof importedSave.payload === "object") {
    return {
      payload: importedSave.payload,
      cityProgress: importedSave.cityProgress && typeof importedSave.cityProgress === "object" && !Array.isArray(importedSave.cityProgress)
        ? importedSave.cityProgress
        : {},
      regionCorruption: importedSave.regionCorruption && typeof importedSave.regionCorruption === "object" && !Array.isArray(importedSave.regionCorruption)
        ? importedSave.regionCorruption
        : null,
      regionMapLastId: typeof importedSave.regionMapLastId === "string" ? importedSave.regionMapLastId : WORLD_MAP.id,
    };
  }
  return {
    payload: importedSave,
    cityProgress: {},
    regionCorruption: null,
    regionMapLastId: WORLD_MAP.id,
  };
}

export function importSaveWrapper(importedSaveWrapper) {
  if (!validateImportedSaveWrapper(importedSaveWrapper)) {
    return { ok: false, reason: "invalid" };
  }

  const saveData = normalizeImportedSaveData(migrateImportedSave(importedSaveWrapper));
  if (!saveData?.payload || typeof saveData.payload !== "object" || Array.isArray(saveData.payload)) {
    return { ok: false, reason: "invalid" };
  }

  const slot = createSaveSlot();
  if (!slot) return { ok: false, reason: "failed" };
  const savedAt = Math.max(0, Number(saveData.payload.savedAt) || Date.now());
  const importedSlot = {
    ...slot,
    label: `Importeret save ${formatImportedSaveTimestamp(savedAt)}`,
    createdAt: Date.now(),
    updatedAt: savedAt,
  };

  const payloadSaved = saveRepository.saveGameSync(importedSlot.saveKey, saveData.payload);
  if (!payloadSaved) return { ok: false, reason: "failed" };

  saveRepository.saveCityProgressSync(importedSlot.cityStorageKey, saveData.cityProgress);
  if (saveData.regionCorruption) saveRepository.saveRegionCorruptionSync(importedSlot.regionCorruptionStorageKey, saveData.regionCorruption);
  saveRepository.saveLastRegionMapIdSync(importedSlot.regionMapLastIdStorageKey, saveData.regionMapLastId);
  upsertSaveSlot(importedSlot);
  return { ok: true, slot: importedSlot };
}

function formatImportedSaveTimestamp(timestamp) {
  try {
    return new Intl.DateTimeFormat("da-DK", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(timestamp));
  } catch {
    return "";
  }
}
