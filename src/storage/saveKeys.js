export const CITY_STORAGE_KEY = "runebound-depths-city-v1";
export const SAVE_INDEX_STORAGE_KEY = "runebound-depths-save-index-v1";
export const SAVE_SLOT_STORAGE_PREFIX = "runebound-depths-save-slot-v1-";
export const CITY_SLOT_STORAGE_PREFIX = "runebound-depths-city-slot-v1-";
export const REGION_CORRUPTION_SLOT_STORAGE_PREFIX = "runebound-depths-region-corruption-slot-v1-";
export const REGION_MAP_LAST_SLOT_STORAGE_PREFIX = "runebound-depths-region-map-last-slot-v1-";
export const REGION_CORRUPTION_STORAGE_KEY = "runebound-depths-region-corruption-v1";
export const REGION_MAP_LAST_ID_STORAGE_KEY = "runebound-depths-region-map-last-id-v1";

export function regionStatusKey(areaMapId, regionId) {
  return `${areaMapId}:${regionId}`;
}

export function saveSlotKeys(slotId) {
  return {
    saveKey: `${SAVE_SLOT_STORAGE_PREFIX}${slotId}`,
    cityStorageKey: `${CITY_SLOT_STORAGE_PREFIX}${slotId}`,
    regionCorruptionStorageKey: `${REGION_CORRUPTION_SLOT_STORAGE_PREFIX}${slotId}`,
    regionMapLastIdStorageKey: `${REGION_MAP_LAST_SLOT_STORAGE_PREFIX}${slotId}`,
  };
}
