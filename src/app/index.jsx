export {
  collectSaveSlots,
  createSaveSlot,
  upsertSaveSlot,
  normalizeSaveSlot,
  saveRegionCorruption,
  loadRegionMapInitialId,
  loadRegionCorruption,
  regionStatusKey,
  emptySnapshot,
  CITY_STORAGE_KEY,
} from "./shared.jsx";

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
  CityCitizenConditions,
  CityStatsTopBar,
  ResourceBar,
} from "./hud/resource-bar.jsx";
export {
  QuestDetailDialog,
  QuestObjectiveMeta,
  QuestOfferDialog,
  QuestOverviewDialog,
} from "./quests/quest-dialogs.jsx";
export {
  MinimapDialog,
  RegionMapDialog,
} from "./map/map-dialogs.jsx";
export { HeroDialog } from "./hero/hero-dialog.jsx";
export { StartMenu } from "./ui/start-menu.jsx";
export {
  AtlasIcon,
  ImageIcon,
  InventoryIcon,
  ITEM_MONEY_ICON_URL,
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
  loadCityAssets,
  loadCityAssetsOnce,
  loadCityProgress,
  saveCityProgress,
  normalizeCityMobs,
  applyMapReturnPopulationProgress,
  calculateCityStats,
} from "./city.jsx";
