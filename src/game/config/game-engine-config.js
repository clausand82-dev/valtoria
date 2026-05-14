export const GAME_ENGINE_CONFIG = {
  terrainLayerPad: {
    top: 56,
    bottom: 88,
  },
  save: {
    version: 1,
    storageKeyPrefix: "runebound-depths-save-v",
  },
  autosaveIntervalSeconds: 1.5,
  inventory: {
    maxPotionStack: 10,
  },
  city: {
    showInactiveNpcs: false,
  },
  monsters: {
    maxElitePerRegion: 6,
  },
  fogOfWar: {
    enabled: true,
    revealRadiusTiles: 8.5,
    visiblePaddingTiles: 1.5,
    entityFadeTiles: 2.8,
    exploreStampSpacingTiles: 1.2,
    unexploredOverlayAlpha: 0.96,
  },
  quests: {
    interactRadius: 0.92,
  },
  objects: {
    destructibleAttackRange: 1.15,
  },
  loot: {
    groundDespawnSeconds: 300,
  },
};

export const TERRAIN_LAYER_PAD_TOP = GAME_ENGINE_CONFIG.terrainLayerPad.top;
export const TERRAIN_LAYER_PAD_BOTTOM = GAME_ENGINE_CONFIG.terrainLayerPad.bottom;
export const SAVE_VERSION = GAME_ENGINE_CONFIG.save.version;
export const SAVE_STORAGE_KEY = GAME_ENGINE_CONFIG.save.storageKeyPrefix + SAVE_VERSION;
export const AUTOSAVE_INTERVAL_SECONDS = GAME_ENGINE_CONFIG.autosaveIntervalSeconds;
export const MAX_POTION_STACK = GAME_ENGINE_CONFIG.inventory.maxPotionStack;
export const SHOW_INACTIVE_CITY_NPCS = GAME_ENGINE_CONFIG.city.showInactiveNpcs;
export const MAX_ELITE_MONSTERS_PER_REGION = GAME_ENGINE_CONFIG.monsters.maxElitePerRegion;
export const FOG_OF_WAR_CONFIG = GAME_ENGINE_CONFIG.fogOfWar;
export const QUEST_INTERACT_RADIUS = GAME_ENGINE_CONFIG.quests.interactRadius;
export const DESTRUCTIBLE_OBJECT_ATTACK_RANGE = GAME_ENGINE_CONFIG.objects.destructibleAttackRange;
export const GROUND_LOOT_DESPAWN_SECONDS = GAME_ENGINE_CONFIG.loot.groundDespawnSeconds;
