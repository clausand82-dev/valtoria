export {
  collectSaveSlots,
  createSaveSlot,
  upsertSaveSlot,
  normalizeSaveSlot,
  saveRegionCorruption,
  loadRegionMapInitialId,
  loadRegionCorruption,
} from "./save/save-slots.js";
export {
  regionStatusKey,
  CITY_STORAGE_KEY,
} from "./save/save-keys.js";
export { emptySnapshot } from "./app-snapshot.js";

export { AppLoadingScreen } from "./loading/app-loading-screen.jsx";
export { InventoryPanel } from "./inventory/inventory-panel.jsx";
export { InventoryItemDetail } from "./inventory/inventory-item-detail.jsx";
export { MergeChoiceDialog } from "./inventory/merge-choice-dialog.jsx";
export { ReadableDialog } from "./inventory/readable-dialog.jsx";
export {
  INVENTORY_FILTERS,
  isItemRequiredByActiveQuests,
  itemMatchesInventoryFilter,
} from "./inventory/inventory-filters.js";
export { GameHud } from "./hud/game-hud.jsx";
export {
  CITY_STAT_DEFS,
  CITY_STAT_ALIASES,
  CITY_STAT_ICON_URLS,
  CITY_CITIZEN_CONDITION_DEFS,
  CityCitizenConditions,
  CitySideStats,
  CityStatsTopBar,
  ResourceBar,
} from "./hud/resource-bar.jsx";
export {
  QuestDetailCard,
  QuestDetailDialog,
  QuestObjectiveMeta,
  QuestOfferDialog,
  QuestOverviewDialog,
} from "./quests/quest-dialogs.jsx";
export {
  MinimapDialog,
  RegionMapDialog,
  mapRegionColor,
} from "./map/map-dialogs.jsx";
export { HeroDialog } from "./hero/hero-dialog.jsx";
export { StartMenu } from "./ui/start-menu.jsx";
export { RunSummaryDialog } from "./run-summary/run-summary-dialog.jsx";
export {
  AtlasIcon,
  ImageIcon,
  InventoryIcon,
  ITEM_GOLD_ICON_URL,
  ITEM_MONEY_ICON_URL,
  ITEM_STANDARD_ICON_URL,
  QUICKBAR_ATTACK_ICON_URL,
  QUICKBAR_CITY_ICON_URL,
  QUICKBAR_HEALTH_POTION_ICON_URL,
  QUICKBAR_MANA_POTION_ICON_URL,
  QUICKBAR_QUEST_ICON_URL,
  QUICKBAR_WILDERNESS_ICON_URL,
} from "./ui/icons.jsx";
export { useEngineModalLock } from "./hooks/use-engine-modal-lock.js";

export {
  CityPage,
  CityThreatMeter,
  buildCityQuestCompletionInventory,
  consumeCityQuestStorageRequirements,
  loadCityAssets,
  loadCityAssetsOnce,
  loadCityProgress,
  saveCityProgress,
  normalizeCityMobs,
  updateRegionCorruptionFromMapReturn,
  normalizeRegionCorruptionEntry,
  getRegionCorruptionLevel,
  setRegionCorruptionLevel,
  calculateCityStats,
  calculateCityStatBreakdown,
  availablePopulationForRecruitment,
} from "./city.jsx";
