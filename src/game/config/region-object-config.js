import { normalizeParticleConfigs } from "./particle-presets.js";
import { OBJECT_SOCKET_CONFIG } from "./object-sockets-config.js";

// TODO:DELETE - TREE_OBJECT_BY_BIOME is only used by legacyRegionObjectsFromWeights. All regions now use explicit objects: arrays.
// const TREE_OBJECT_BY_BIOME = {
//   snow: "object_tree_snow",
//   desert: "object_tree_sand",
//   sand: "object_tree_sand",
//   jungle: "object_tree_jungle",
//   rock: "object_tree_rock",
//   lava: "object_tree_lava",
//   mainland: "object_tree_mainland",
// };
// TODO:DELETE - legacy tree fallback is disabled. Regions must now specify explicit objects.
// function getTreeObjectIdForBiome(biomeId) {
//   const map = { snow: "object_tree_snow", desert: "object_tree_sand", sand: "object_tree_sand", jungle: "object_tree_jungle", rock: "object_tree_rock", lava: "object_tree_lava" };
//   return map[biomeId] ?? "object_tree_mainland";
// }

/*
Region object definition guide

Fields used on each object in REGION_OBJECT_DEFS:
- spawnTypes: Runtime types that can be spawned for this object id.
  Example: [{ type: "object_woodboxes_ground", weight: 1 }]
- TODO:DELETE legacyWeightKey: Only used by legacyRegionObjectsFromWeights (old biodome weight system).
- defaultDestructible: Default destructible flag if region override is not set.
- destructible: Inline destructible data used by runtime object damage/loot.
- destroyRewards: Optional raw world energy rewards when this object is destroyed.
  Example: destroyRewards: { lydra: 1, netdra: 0.1 }
  Region overrides in map-region-config.js can also set destroyRewards per object spawn entry.
- defaultActionId: Optional fallback action id for objects spawned from this definition.
- spawnDamage: Optional start damage state: "all", "damaged", "destroyed",
  or "damaged_destroyed". Omit for current behavior: spawn undamaged.
- spawnTags/spawnAvoidRadius: Optional spawn influence metadata, e.g. canopy zones.
- avoidSpawnTags: Optional list of spawn influence tags this object should avoid.
- foregroundFade: Optional render fade when this object is in front of actors/loot.
- renderBiomeId: Optional visual biome override when rendering.
- graphicsRef: PNG reference text. For new object_* sheet generation this should
  contain a real file name like "my_object.png".
- graphics: Optional explicit graphics config.
  - { mode: "sheet", fileName, rows, cols, renderScale }
  - { mode: "sheet", files: [...], rows, cols, renderScale } combines variants from multiple sheets.
  - { mode: "frames", frameFiles: [...], animated: true, ... }
- depthMode: Render sorting layer. Use "dynamic" for tall/blocking props that
  should sort with actors, "ground" for flat decoration.
- sortAnchor: Visual base point inside the rendered sprite, normalized 0..1.
  Default is { x: 0.5, y: 1 }.
- depthOffset: Optional pixel offset applied after sortAnchor depth.
- particles: Optional visual-only particle effects attached to placed objects,
  for example smoke, embers, flies, spores, or magical glow. particles.type
  must match PARTICLE_PRESETS in particle-presets.js.
- sockets: Socket definitions from object-sockets-config.js. Sheet-space x/y
  are Photoshop coordinates on the whole sheet and are converted to frame-local
  coordinates at runtime. Missing sockets are valid and skip effects.
- attachedEffects: Particle or visual effects that attach to named sockets.
  Use socket for one exact match or socketPrefix for groups like lanternA/B.
  Region objects can override only enable/settings with effects:
  { chimneySmoke: false, lanternGlow: true, windowGlow: { enabled: true, onlyAtNight: true } }.

How to tell old vs new system here:
- New defs-driven sheet path: spawnTypes has exactly one type starting with
  "object_". See inferSheetObjectType() below.
- Old path: spawnTypes uses non-object types (for example "firebeacon"), and
  the visual sheet is still provided by OBJECT_SHEETS in asset-config.js.

Example if firebeacon is moved to new system later:
object_firebeacon_snow: {
  spawnTypes: [{ type: "object_firebeacon_snow", weight: 1 }],
  defaultDestructible: false,
  renderBiomeId: "snow",
  graphicsRef: "firebeacon_snow_animated_001.png",
  graphics: {
    mode: "frames",
    frameFiles: [
      "firebeacon_snow_animated_001.png",
      "firebeacon_snow_animated_002.png",
      "firebeacon_snow_animated_003.png",
      "firebeacon_snow_animated_004.png",
      "firebeacon_snow_animated_005.png",
      "firebeacon_snow_animated_006.png",
      "firebeacon_snow_animated_007.png",
      "firebeacon_snow_animated_008.png",
    ],
    animated: true,
    keyEdgeBlack: true,
    keyEdgeHalo: true,
    renderScale: 0.29,
  },
}
*/

export const REGION_OBJECT_LOOT_TABLES = {
  WOOD: Object.freeze([
    { resource: "wood_piece", min: 2, max: 6, chance: 0.45 },
    { resource: "wood_plank", min: 1, max: 2, chance: 0.02 },
    { resource: "coal", min: 1, max: 2, chance: 0.01 },
  ]),
  STONE: Object.freeze([
    { resource: "rock_piece", min: 2, max: 5, chance: 0.45 },
    { resource: "iron_piece", min: 1, max: 2, chance: 0.11 },
    { resource: "coal", min: 1, max: 2, chance: 0.1 },
    { resource: "stone_brick", min: 1, max: 1, chance: 0.04 },
    { resource: "diamond", min: 1, max: 1, chance: 0.001 },
  ]),
  RARE: Object.freeze([
    { resource: "red_gemstone", min: 1, max: 1, chance: 0.004 },
    { resource: "yellow_gemstone", min: 1, max: 1, chance: 0.004 },
    { resource: "green_gemstone", min: 1, max: 1, chance: 0.004 },
    { resource: "blue_gemstone", min: 1, max: 1, chance: 0.004 },
    { resource: "black_gemstone", min: 1, max: 1, chance: 0.0007 },
    { resource: "white_gemstone", min: 1, max: 1, chance: 0.0007 },
    { resource: "diamond", min: 1, max: 1, chance: 0.00045 },
  ]),
  HOUSE: Object.freeze([
    { resource: "junk", min: 2, max: 6, chance: 1 },
    { resource: "wood_piece", min: 1, max: 5, chance: 0.45 },
    { resource: "rock_piece", min: 1, max: 4, chance: 0.34 },
    { resource: "iron_piece", min: 1, max: 2, chance: 0.12 },
    { resource: "crystal_piece", min: 1, max: 4, chance: 0.06 },
    { resource: "meat", min: 1, max: 2, chance: 0.05 },
    { resource: "fruit", min: 1, max: 2, chance: 0.05 },
    { resource: "coal", min: 1, max: 2, chance: 0.05 },
    { resource: "wood_plank", min: 1, max: 1, chance: 0.035 },
    { resource: "stone_brick", min: 1, max: 1, chance: 0.03 },
    { resource: "iron_bar", min: 1, max: 1, chance: 0.018 },
    { resource: "crystal", min: 1, max: 1, chance: 0.012 },
  ]),
  FRUITBASKETS: Object.freeze([
    { resource: "fruit_orange", min: 1, max: 2, chance: 0.01 },
    { resource: "fruit_banana", min: 1, max: 2, chance: 0.01 },
    { resource: "fruit", min: 1, max: 2, chance: 0.10 },
  ]),

};

export const REGION_OBJECT_DEFS = {
  object_tree_mainland: {
    spawnTypes: [{ type: "object_tree_mainland", weight: 1 }],
    // legacyWeightKey: "tree", // TODO:DELETE legacy biodome weight key disabled
    defaultDestructible: true,
    tags: ["object", "destructible", "wood", "tree", "plant"],
    avoidSpawnTags: ["canopy"],
    destructible: {
      hp: 40,
      damageStages: 3,
      particleColor: "#b88454",
      loot: REGION_OBJECT_LOOT_TABLES.WOOD,
    },
    renderBiomeId: "mainland",
    graphicsRef: "object/object_tree_normal.png (tree sheet)",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.95 },
    particles: {
      type: "leaves",
      count: [4, 14],
      radius: 28,
      heightOffset: -36,
      chance: 1,
      onlyWhenOnScreen: true
    }
  },
  object_tree_snow: {
    spawnTypes: [{ type: "object_tree_snow", weight: 1 }],
    // legacyWeightKey: "tree", // TODO:DELETE legacy biodome weight key disabled
    defaultDestructible: true,
    tags: ["object", "destructible", "wood", "tree", "plant"],
    avoidSpawnTags: ["canopy"],
    destructible: {
      hp: 40,
      damageStages: 3,
      particleColor: "#b88454",
      loot: REGION_OBJECT_LOOT_TABLES.WOOD,
    },
    renderBiomeId: "snow",
    graphicsRef: "object/object_tree_snow.png (tree sheet)",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.95 },
  },
  object_tree_sand: {
    spawnTypes: [{ type: "object_tree_sand", weight: 1 }],
    // legacyWeightKey: "tree", // TODO:DELETE legacy biodome weight key disabled
    defaultDestructible: true,
    tags: ["object", "destructible", "wood", "tree", "plant"],
    avoidSpawnTags: ["canopy"],
    destructible: {
      hp: 40,
      damageStages: 3,
      particleColor: "#b88454",
      loot: REGION_OBJECT_LOOT_TABLES.WOOD,
    },
    renderBiomeId: "desert",
    graphicsRef: "object/object_tree_sand.png (tree sheet)",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.95 },
  },
  object_tree_jungle: {
    spawnTypes: [{ type: "object_tree_jungle", weight: 1 }],
    // legacyWeightKey: "tree", // TODO:DELETE legacy biodome weight key disabled
    defaultDestructible: true,
    tags: ["object", "destructible", "wood", "tree", "plant"],
    avoidSpawnTags: ["canopy"],
    destructible: {
      hp: 40,
      damageStages: 3,
      particleColor: "#b88454",
      loot: REGION_OBJECT_LOOT_TABLES.WOOD,
    },
    renderBiomeId: "jungle",
    graphicsRef: "object/object_tree_jungle.png (tree sheet)",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.95 },
    particles: {
      type: "leaves",
      count: [4, 12],
      radius: 28,
      heightOffset: -36,
      chance: 1,
      onlyWhenOnScreen: true
    }
  },
  object_tree_rock: {
    spawnTypes: [{ type: "object_tree_rock", weight: 1 }],
    // legacyWeightKey: "tree", // TODO:DELETE legacy biodome weight key disabled
    defaultDestructible: true,
    destructible: {
      hp: 40,
      damageStages: 3,
      particleColor: "#b88454",
      loot: REGION_OBJECT_LOOT_TABLES.WOOD,
    },
    renderBiomeId: "rock",
    graphicsRef: "object/object_tree_normal.png (tree sheet)",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.95 },
  },
  object_tree_lava: {
    spawnTypes: [{ type: "object_tree_lava", weight: 1 }],
    // legacyWeightKey: "tree", // TODO:DELETE legacy biodome weight key disabled
    defaultDestructible: true,
    destructible: {
      hp: 40,
      damageStages: 3,
      particleColor: "#b88454",
      loot: REGION_OBJECT_LOOT_TABLES.WOOD,
    },
    renderBiomeId: "lava",
    graphicsRef: "object/object_tree_dead.png (tree sheet)",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.95 },
  },
  object_house_mainland: {
    spawnTypes: [{ type: "object_house_mainland", weight: 1 }],
    // legacyWeightKey: "house", // TODO:DELETE legacy biodome weight key disabled
    defaultDestructible: true,
    destructible: {
      hp: 70,
      damageStages: 3,
      particleColor: "#c99b5d",
      popularityDelta: -3,
      loot: REGION_OBJECT_LOOT_TABLES.HOUSE,
      rareLoot: REGION_OBJECT_LOOT_TABLES.RARE,
    },
    renderBiomeId: "mainland",
    graphics: {
      mode: "sheet",
      files: [
        "object/object_house_normal_1.png",
        //"object/object_house_normal_2.png",
        //"object/object_house_normal_3.png",
      ],
      rows: 4,
      cols: 4,
      renderScale: 2,
    },
    sockets: OBJECT_SOCKET_CONFIG.object_house_mainland,
    attachedEffects: [
      {
        id: "chimneySmoke",
        type: "particle",
        preset: "chimney_smoke",
        socket: "chimney",
        offset: { x: 0, y: -4 },
        enabledByDefault: true,
      },
      {
        id: "lanternGlow",
        type: "particle",
        preset: "lantern_glow",
        socketPrefix: "lantern",
        enabledByDefault: true,
      },
      {
        id: "windowGlow",
        type: "particle",
        preset: "window_glow",
        socketPrefix: "windowGlow",
        enabledByDefault: true,
      },
      {
        id: "fireplaceGlow",
        type: "particle",
        preset: "fireplace_glow",
        socket: "fireplace",
        enabledByDefault: true,
      },
      {
        id: "fireplaceSmoke",
        type: "particle",
        preset: "fireplace_smoke",
        socket: "fireplace",
        offset: { x: 0, y: -6 },
        enabledByDefault: false,
      },
    ],
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.94 },
  },
  object_pillar_stone: {
    spawnTypes: [{ type: "object_pillar_stone", weight: 1 }],
    // legacyWeightKey: "pillar", // TODO:DELETE legacy biodome weight key disabled
    defaultDestructible: true,
    destructible: {
      hp: 52,
      damageStages: 3,
      particleColor: "#9a9488",
      loot: [{ resource: "stone_brick", min: 1, max: 2, chance: 0.45 }],
      rareLoot: [],
    },
    renderBiomeId: "mainland",
    graphics: {
      mode: "sheet",
      files: [
        "object/object_pillar_stone_1.png",
        "object/object_pillar_stone_2.png",
      ],
      rows: 4,
      cols: 4,
      renderScale: 1,
    },
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.92 },
  },
  object_stone_cluster: {
    spawnTypes: [{ type: "object_stone_cluster", weight: 1 }],
    // legacyWeightKey: "rock", // TODO:DELETE legacy biodome weight key disabled
    defaultDestructible: true,
    destructible: {
      hp: 42,
      damageStages: 3,
      particleColor: "#9a9488",
      loot: REGION_OBJECT_LOOT_TABLES.STONE,
      rareLoot: REGION_OBJECT_LOOT_TABLES.RARE,
    },
    renderBiomeId: "mainland",
    graphicsRef: "object/object_rock_normal.png (rock sheet)",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.85 },
  },
  object_ruin_normal: {
    spawnTypes: [{ type: "object_ruin_normal", weight: 1 }],
    // legacyWeightKey: "ruin", // TODO:DELETE legacy biodome weight key disabled
    defaultDestructible: true,
    destructible: {
      hp: 64,
      damageStages: 3,
      particleColor: "#9a9488",
      loot: REGION_OBJECT_LOOT_TABLES.STONE,
      rareLoot: REGION_OBJECT_LOOT_TABLES.RARE,
      itemLoot: [
        { rarity: "legendary", chance: 0.0035, tries: 120 },
      ],
    },
    renderBiomeId: "mainland",
    graphicsRef: "object/object_ruin_normal.png (4x4)",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 },
  },
    object_ruin_snow: {
    spawnTypes: [{ type: "object_ruin_snow", weight: 1 }],
    // legacyWeightKey: "ruin", // TODO:DELETE legacy biodome weight key disabled
    defaultDestructible: true,
    destructible: {
      hp: 64,
      damageStages: 3,
      particleColor: "#9a9488",
      loot: REGION_OBJECT_LOOT_TABLES.STONE,
      rareLoot: REGION_OBJECT_LOOT_TABLES.RARE,
      itemLoot: [
        { rarity: "legendary", chance: 0.0035, tries: 120 },
      ],
    },
    renderBiomeId: "snow",
    graphicsRef: "object/object_ruin_snow.png (4x4)",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 },
  },
      object_ruin_sand: {
    spawnTypes: [{ type: "object_ruin_sand", weight: 1 }],
    // legacyWeightKey: "ruin", // TODO:DELETE legacy biodome weight key disabled
    defaultDestructible: true,
    destructible: {
      hp: 64,
      damageStages: 3,
      particleColor: "#9a9488",
      loot: REGION_OBJECT_LOOT_TABLES.STONE,
      rareLoot: REGION_OBJECT_LOOT_TABLES.RARE,
      itemLoot: [
        { rarity: "legendary", chance: 0.0035, tries: 120 },
      ],
    },
    renderBiomeId: "sand",
    graphicsRef: "object/object_ruin_sand.png (4x4)",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 },
  },
        object_ruin_jungle: {
    spawnTypes: [{ type: "object_ruin_jungle", weight: 1 }],
    // legacyWeightKey: "ruin", // TODO:DELETE legacy biodome weight key disabled
    defaultDestructible: true,
    destructible: {
      hp: 64,
      damageStages: 3,
      particleColor: "#9a9488",
      loot: REGION_OBJECT_LOOT_TABLES.STONE,
      rareLoot: REGION_OBJECT_LOOT_TABLES.RARE,
      itemLoot: [
        { rarity: "poor", chance: 0.035, tries: 120 },
        { rarity: "normal", chance: 0.024, tries: 120 },
        { rarity: "upgraded", chance: 0.012, tries: 120 },
        { rarity: "rare", chance: 0.01, tries: 120 },
        { rarity: "epic", chance: 0.0035, tries: 120 },
        { rarity: "legendary", chance: 0.0012, tries: 120 },
      ],
    },
    renderBiomeId: "jungle",
    graphicsRef: "object/object_ruin_jungle.png (4x4)",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 },
  },
  object_fireplace_mainland: {
    spawnTypes: [{ type: "fireplace", weight: 1 }],
    // legacyWeightKey: "fireplace", // TODO:DELETE legacy biodome weight key disabled
    defaultDestructible: false,
    renderBiomeId: "mainland",
    graphicsRef: "fireplace_normal_01..04.png (animated)",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 },
    particles: [
      { type: "smoke", count: [2, 5], radius: 16, heightOffset: -36, chance: 1 },
      { type: "embers", count: [1, 4], radius: 12, heightOffset: -20, chance: 1 },
    ],
  },
  object_firebeacon_snow: {
    // Legacy runtime type: still uses "firebeacon" (old OBJECT_SHEETS path).
    spawnTypes: [{ type: "firebeacon", weight: 1 }],
    // legacyWeightKey: "firebeacon", // TODO:DELETE legacy biodome weight key disabled
    defaultDestructible: false,
    renderBiomeId: "snow",
    graphicsRef: "firebeacon_snow_animated_001..008.png (animated)",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.93 },
    particles: [
      { type: "smoke", count: [3, 6], radius: 20, heightOffset: -54, chance: 1 },
      { type: "embers", count: [2, 5], radius: 16, heightOffset: -32, chance: 1 },
    ],
  },
  object_woodboxes_ground: {
    spawnTypes: [{ type: "object_woodboxes_ground", weight: 1 }],
    defaultDestructible: true,
    tags: ["object", "destructible", "wood", "container"],
    destructible: {
      hp: 52,
      damageStages: 3,
      particleColor: "#c99b5d",
      loot: [
        ...REGION_OBJECT_LOOT_TABLES.WOOD,
        ...REGION_OBJECT_LOOT_TABLES.STONE,
        { resource: "junk", min: 1, max: 3, chance: 0.33 },
      ],
      rareLoot: [
        REGION_OBJECT_LOOT_TABLES.RARE,
      ],
    },
    renderBiomeId: "mainland",
    graphicsRef: "object/object_woodboxes_ground.png",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 },
    particles: [
      { type: "dust", count: [2, 5], radius: 16, heightOffset: -36, chance: 1 },
    ],
  },
  object_shelfs: {
    spawnTypes: [{ type: "object_shelfs", weight: 1 }],
    defaultDestructible: true,
    destructible: {
      hp: 52,
      damageStages: 3,
      particleColor: "#c99b5d",
      loot: [
        { resource: "health", min: 1, max: 3, chance: 0.1 },
        { resource: "paper", min: 1, max: 4, chance: 0.1 },
        { resource: "wood_plank", min: 1, max: 4, chance: 0.1 },
      ],
      rareLoot: [
        { resource: "diamond", min: 1, max: 1, chance: 0.005 },
      ],
    },
    renderBiomeId: "mainland",
    graphicsRef: "object/object_shelfs.png",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.92 },
  },
  object_chests_ground: {
    spawnTypes: [{ type: "object_chests_ground", weight: 1 }],
    defaultDestructible: false,
    renderBiomeId: "mainland",
    graphicsRef: "object/object_chests_ground.png",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 },
    sheetRenderScale: 0.95,
  },
  object_field: {
    spawnTypes: [{ type: "object_field", weight: 1 }],
    defaultDestructible: false,
    // destructibleProfile: "object_field", // TODO: enable again if object_field gets destructible data later
    renderBiomeId: "mainland",
    graphicsRef: "object/object_field.png",
    depthMode: "ground",
  },
  object_barn: {
    spawnTypes: [{ type: "object_barn", weight: 1 }],
    defaultDestructible: true,
    destructible: {
      hp: 52,
      damageStages: 3,
      particleColor: "#c99b5d",
      loot: [
        { resource: "junk", min: 1, max: 3, chance: 1 },
        { resource: "wood_piece", min: 1, max: 4, chance: 0.10 },
        { resource: "wood_plank", min: 1, max: 1, chance: 0.05 },
      ],
      rareLoot: [
        { resource: "diamond", min: 1, max: 1, chance: 0.001 },
      ],
    },
    renderBiomeId: "mainland",
    graphicsRef: "object/object_barn.png",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.94 },
  },
  object_well: {
    spawnTypes: [{ type: "object_well", weight: 1 }],
    defaultDestructible: true,
    destructible: {
      hp: 52,
      damageStages: 3,
      particleColor: "#9a9488",
      loot: [{ resource: "rock_piece", min: 1, max: 3, chance: 1 }],
      rareLoot: [
        { resource: "stone_brick", min: 1, max: 1, chance: 0.06 },
      ],
    },
    renderBiomeId: "mainland",
    graphicsRef: "object/object_well.png",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 },
  },
  object_sacks_ground: {
    spawnTypes: [{ type: "object_sacks_ground", weight: 1 }],
    defaultDestructible: true,
    destructible: {
      hp: 52,
      damageStages: 3,
      particleColor: "#c99b5d",
      loot: [
        { resource: "health", min: 1, max: 3, chance: 0.1 },
        { resource: "wheat", min: 1, max: 3, chance: 0.65 },
        { resource: "paper", min: 1, max: 4, chance: 0.1 },
        { resource: "wood_plank", min: 1, max: 4, chance: 0.1 },
      ],
      rareLoot: [
        { resource: "diamond", min: 1, max: 1, chance: 0.005 },
      ],
    },
    renderBiomeId: "mainland",
    graphicsRef: "object/object_sacks_ground.png",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.88 },
  },
  object_barrels_ground: {
    spawnTypes: [{ type: "object_barrels_ground", weight: 1 }],
    defaultDestructible: true,
    tags: ["object", "destructible", "wood", "container"],
    destructible: {
      hp: 52,
      damageStages: 3,
      particleColor: "#c99b5d",
      loot: [
        { resource: "health", min: 1, max: 3, chance: 0.1 },
        { resource: "wheat", min: 1, max: 3, chance: 0.65 },
        { resource: "paper", min: 1, max: 4, chance: 0.1 },
        { resource: "wood_plank", min: 1, max: 4, chance: 0.1 },
      ],
      rareLoot: [
        { resource: "bonedust", min: 1, max: 1, chance: 0.01 },
      ],
    },
    renderBiomeId: "mainland",
    graphicsRef: "object/object_barrels_ground.png",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.88 },
  },
  object_hay01: {
    spawnTypes: [{ type: "object_hay01", weight: 1 }],
    defaultDestructible: true,
    destructible: {
      hp: 52,
      damageStages: 3,
      particleColor: "#c99b5d",
      loot: [
        { resource: "wheat", min: 1, max: 3, chance: 0.75 },
        { resource: "wood_piece", min: 1, max: 4, chance: 0.10 },
        { resource: "wood_plank", min: 1, max: 1, chance: 0.05 },
      ],
      rareLoot: [
        { resource: "diamond", min: 1, max: 1, chance: 0.001 },
      ],
    },
    renderBiomeId: "mainland",
    graphicsRef: "object/object_hay01.png",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 },
  },
  object_hay02: {
    spawnTypes: [{ type: "object_hay02", weight: 1 }],
    defaultDestructible: true,
    destructible: {
      hp: 52,
      damageStages: 3,
      particleColor: "#c99b5d",
      loot: [
        { resource: "wheat", min: 1, max: 3, chance: 0.75 },
        { resource: "wood_piece", min: 1, max: 4, chance: 0.10 },
        { resource: "wood_plank", min: 1, max: 1, chance: 0.05 },
      ],
      rareLoot: [
        { resource: "diamond", min: 1, max: 1, chance: 0.001 },
      ],  
    },
    renderBiomeId: "mainland",
    graphicsRef: "object/object_hay02.png",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 },
  },
  object_bones: {
    spawnTypes: [{ type: "object_bones", weight: 1 }],
    defaultDestructible: true,
    tags: ["object", "destructible", "wood", "tree", "plant", "bones"],
    destructible: {
      hp: 52,
      damageStages: 3,
      particleColor: "#ffffff",
      loot: [
        { resource: "bonedust", min: 1, max: 3, chance: 0.50 },
      ],
      rareLoot: [
        { resource: "magic_essence", min: 1, max: 1, chance: 0.01 },
      ],  
    },
    renderBiomeId: "mainland",
    graphicsRef: "foilage/foilage_bones.png",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 },
  },
  object_inn_cellar_crack: {
    spawnTypes: [{ type: "object_inn_cellar_crack", weight: 1 }],
    defaultDestructible: false,
    renderBiomeId: "mainland",
    graphicsRef: "object/object_cracks02.png",
    depthMode: "ground",
    sortAnchor: { x: 0.5, y: 0.7 },
    sheetRenderScale: 1.75,
  },
    object_treestumps: {
    spawnTypes: [{ type: "object_treestumps", weight: 1 }],
    defaultDestructible: true,
    tags: ["object", "destructible", "wood", "tree", "plant"],
    destructible: {
      hp: 52,
      damageStages: 3,
      particleColor: "#ffffff",
      loot: [
        { resource: "bonedust", min: 1, max: 3, chance: 0.50 },
      ],
      rareLoot: [
        { resource: "magic_essence", min: 1, max: 1, chance: 0.01 },
      ],  
    },
    renderBiomeId: "mainland",
    graphicsRef: "object/object_treestumps.png",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 },
  },
  object_talltree_medium: {
    spawnTypes: [{ type: "object_talltree_medium", weight: 1 }],
    defaultDestructible: true,
    spawnTags: ["canopy"],
    spawnAvoidRadius: 1.8,
    foregroundFade: true,
    tags: ["object", "destructible", "wood", "tree", "plant"],
    destructible: {
      hp: 52,
      damageStages: 3,
      particleColor: "#ffffff",
      loot: [
        { resource: "bonedust", min: 1, max: 3, chance: 0.50 },
      ],
      rareLoot: [
        { resource: "magic_essence", min: 1, max: 1, chance: 0.01 },
      ],  
    },
    graphics: {
  mode: "sheet",
  files: [
      "object/trees/object_talltree_medium_1.png",
      "object/trees/object_talltree_medium_2.png",
      "object/trees/object_talltree_medium_3.png",
      "object/trees/object_talltree_medium_4.png",
      "object/trees/object_talltree_medium_5.png",
  ],
  
  rows: 2,
  cols: 2,
  renderScale: 0.5,
},
    renderBiomeId: "mainland",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 },
  },
  object_talltree_big: {
    spawnTypes: [{ type: "object_talltree_big", weight: 1 }],
    defaultDestructible: true,
    spawnTags: ["canopy"],
    spawnAvoidRadius: 2.4,
    foregroundFade: true,
    tags: ["object", "destructible", "wood", "tree", "plant"],
    destructible: {
      hp: 52,
      damageStages: 3,
      particleColor: "#ffffff",
      loot: [
        { resource: "bonedust", min: 1, max: 3, chance: 0.50 },
      ],
      rareLoot: [
        { resource: "magic_essence", min: 1, max: 1, chance: 0.01 },
      ],  
    },
    graphics: {
  mode: "sheet",
  files: [
    "object/trees/object_talltree_big_1.png",
    "object/trees/object_talltree_big_2.png",
    "object/trees/object_talltree_big_3.png",
    "object/trees/object_talltree_big_4.png",
    "object/trees/object_talltree_big_5.png",
  ],
  rows: 1,
  cols: 1,
  renderScale: 0.25,
},
    renderBiomeId: "mainland",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 },
  },
  object_fruitbaskets: {
    spawnTypes: [{ type: "object_fruitbaskets", weight: 1 }],
    defaultDestructible: true,
    destructible: {
      hp: 52,
      damageStages: 3,
      particleColor: "#f2b017",
      loot: [
      ...REGION_OBJECT_LOOT_TABLES.FRUITBASKETS,
      ],
      rareLoot: [
        { resource: "magic_essence", min: 1, max: 1, chance: 0.001 },
      ],  
    },
    renderBiomeId: "mainland",
    graphicsRef: "object/object_fruitbaskets.png",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 },
  },
};

function clampNumber(value, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeDepthMode(value, fallback = "dynamic") {
  const mode = String(value ?? fallback).trim();
  return ["ground", "dynamic", "alwaysBehind", "alwaysFront"].includes(mode) ? mode : fallback;
}

function normalizeSortAnchor(value) {
  if (!value || typeof value !== "object") return { x: 0.5, y: 1 };
  const x = clampNumber(value.x, 0, 1);
  const y = clampNumber(value.y, 0, 1);
  return {
    x: x ?? 0.5,
    y: y ?? 1,
  };
}

function extractPngFileName(graphicsRef) {
  const raw = String(graphicsRef ?? "").trim();
  if (!raw) return null;
  // Allow optional subfolder paths such as "object/object_woodboxes_ground.png".
  const match = raw.match(/([a-z0-9_./-]+\.png)/i);
  return match ? match[1] : null;
}

function normalizeGraphicsConfig(def) {
  const graphics = def?.graphics;
  if (!graphics || typeof graphics !== "object") return null;

  const mode = String(graphics.mode ?? "sheet").trim().toLowerCase();
  if (mode === "frames") {
    const rawFiles = Array.isArray(graphics.frameFiles) ? graphics.frameFiles : [];
    const frameFiles = rawFiles
      .map((file) => String(file ?? "").trim())
      .filter((file) => /\.png$/i.test(file));
    if (!frameFiles.length) return null;
    return {
      frameFiles,
      animated: graphics.animated !== false,
      keyEdgeBlack: graphics.keyEdgeBlack,
      keyEdgeHalo: graphics.keyEdgeHalo,
      blackThreshold: graphics.blackThreshold,
      renderScale: Number.isFinite(Number(graphics.renderScale)) ? Number(graphics.renderScale) : 1,
      normalizeAnimation: graphics.normalizeAnimation,
    };
  }

  const files = (Array.isArray(graphics.files) ? graphics.files : [graphics.fileName])
    .map((file) => String(file ?? "").trim())
    .filter((file) => /\.png$/i.test(file));
  const fileName = files[0] ?? "";
  if (!fileName) return null;
  const rows = Number.isFinite(Number(graphics.rows)) ? Math.max(1, Math.floor(Number(graphics.rows))) : 4;
  const cols = Number.isFinite(Number(graphics.cols)) ? Math.max(1, Math.floor(Number(graphics.cols))) : 4;
  const frameCount = Number.isFinite(Number(graphics.frameCount)) ? Math.max(1, Math.floor(Number(graphics.frameCount))) : undefined;
  return {
    fileName,
    files: files.length > 1 ? files : undefined,
    rows,
    cols,
    frameCount,
    variantCount: files.length * (frameCount ?? rows * cols),
    animated: graphics.animated,
    renderScale: Number.isFinite(Number(graphics.renderScale)) ? Number(graphics.renderScale) : 1,
  };
}

function objectVariantCountFromDef(def) {
  const graphics = normalizeGraphicsConfig(def);
  if (graphics?.variantCount) return graphics.variantCount;
  if (graphics?.frameFiles?.length) return graphics.frameFiles.length;
  return 16;
}

function inferSheetObjectType(def) {
  const spawnTypes = Array.isArray(def?.spawnTypes) ? def.spawnTypes : [];
  if (spawnTypes.length !== 1) return null;
  const type = String(spawnTypes[0]?.type ?? "").trim();
  // New system marker: only types prefixed with "object_" are auto-built
  // into REGION_OBJECT_SHEETS from REGION_OBJECT_DEFS.
  if (!type || !type.startsWith("object_")) return null;
  return type;
}

function buildRegionObjectSheets(definitions) {
  const sheets = {};
  for (const def of Object.values(definitions ?? {})) {
    const type = inferSheetObjectType(def);
    if (!type) continue;

    const explicitGraphics = normalizeGraphicsConfig(def);
    if (explicitGraphics) {
      sheets[type] = { default: explicitGraphics };
      continue;
    }

    const fileName = extractPngFileName(def?.graphicsRef);
    if (!fileName) continue;
    sheets[type] = {
      default: {
        fileName,
        rows: 4,
        cols: 4,
        variantCount: 16,
        renderScale: Number.isFinite(Number(def?.sheetRenderScale)) ? Number(def.sheetRenderScale) : 1,
      },
    };
  }
  return sheets;
}

export const REGION_OBJECT_SHEETS = buildRegionObjectSheets(REGION_OBJECT_DEFS);

function parseWeight(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}

function normalizeScale(scale) {
  if (!scale) return null;
  // Fixed scale: { fixed: 1.2 } or just a number 1.2
  if (typeof scale === "number" && Number.isFinite(scale) && scale > 0) {
    return { type: "fixed", value: scale };
  }
  if (typeof scale === "object") {
    // { fixed: 1.2 }
    if (Number.isFinite(Number(scale.fixed)) && Number(scale.fixed) > 0) {
      return { type: "fixed", value: Number(scale.fixed) };
    }
    // { min: 0.8, max: 1.2 }
    const min = Number.isFinite(Number(scale.min)) && Number(scale.min) > 0 ? Number(scale.min) : null;
    const max = Number.isFinite(Number(scale.max)) && Number(scale.max) > 0 ? Number(scale.max) : null;
    if (min !== null && max !== null) {
      return { type: "range", min: Math.min(min, max), max: Math.max(min, max) };
    }
  }
  return null;
}

function normalizeStringList(value) {
  const list = Array.isArray(value) ? value : (value ? [value] : []);
  return list
    .map((entry) => String(entry ?? "").trim())
    .filter(Boolean);
}

function normalizeOptionalRadius(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeForegroundFade(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value && typeof value === "object") return true;
  return Boolean(fallback);
}

function normalizeSpawnTypes(def) {
  const list = Array.isArray(def?.spawnTypes) ? def.spawnTypes : [];
  const normalized = [];
  for (const entry of list) {
    const type = String(entry?.type ?? "").trim();
    if (!type) continue;
    const weight = parseWeight(entry?.weight) || 1;
    normalized.push({ type, weight });
  }
  return normalized;
}

export function findRegionObjectDefBySpawnType(type) {
  if (!type) return null;
  for (const def of Object.values(REGION_OBJECT_DEFS)) {
    const spawnTypes = Array.isArray(def?.spawnTypes) ? def.spawnTypes : [];
    if (spawnTypes.some((entry) => entry?.type === type)) {
      return def;
    }
  }
  return null;
}

export function resolveRegionObjectDestructibleDef(type) {
  return findRegionObjectDefBySpawnType(type)?.destructible ?? null;
}

export function resolveRegionObjectDefBySpawnType(type) {
  return findRegionObjectDefBySpawnType(type);
}

export function resolveRegionObjectVariantCount(type) {
  const def = findRegionObjectDefBySpawnType(type);
  return def ? objectVariantCountFromDef(def) : 16;
}

export function getRegionObjectFamily(type) {
  const def = findRegionObjectDefBySpawnType(type);
  if (!def) return type ?? null;
  const spawnTypes = Array.isArray(def?.spawnTypes) ? def.spawnTypes : [];
  if (spawnTypes.some((entry) => String(entry?.type ?? "").startsWith("object_tree_"))) return "tree";
  if (spawnTypes.some((entry) => entry?.type === "object_stone_cluster")) return "stone";
  if (spawnTypes.some((entry) => entry?.type === "object_house_mainland")) return "building";
  if (spawnTypes.some((entry) => String(entry?.type ?? "").startsWith("object_ruin_"))) return "ruin";
  if (spawnTypes.some((entry) => entry?.type === "object_pillar_stone")) return "pillar";
  if (spawnTypes.some((entry) => entry?.type === "object_fireplace_mainland")) return "fireplace";
  if (spawnTypes.some((entry) => entry?.type === "object_firebeacon_snow")) return "firebeacon";
  return type ?? null;
}

export function normalizeObjectSpawnDamage(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return null;
  const normalized = raw.replace(/[\s-]+/g, "_");
  if (["all", "any", "random"].includes(normalized)) return "all";
  if (["damaged", "damage", "damaged_only", "damage_only"].includes(normalized)) return "damaged";
  if (["destroyed", "destroy", "destoyed", "destoryed", "destroyed_only", "destroy_only", "destoyed_only", "destoryed_only"].includes(normalized)) return "destroyed";
  if ([
    "damaged_destroyed",
    "damage_destroyed",
    "damaged_and_destroyed",
    "damage_and_destroyed",
    "damaged_destroy",
    "damage_destroy",
    "damange_and_destoryed",
    "damange_destoryed",
    "damaged_and_destoryed",
    "damaged_destoryed",
    "damage_and_destoryed",
    "damage_destoryed",
  ].includes(normalized)) return "damaged_destroyed";
  return null;
}

function buildObjectEntry(objectId, weight, destructible = null, scale = null, spawnDamage = null) {
  const def = REGION_OBJECT_DEFS[objectId];
  if (!def) return null;
  const resolvedWeight = parseWeight(weight);
  if (resolvedWeight <= 0) return null;
  const spawnTypes = normalizeSpawnTypes(def);
  if (!spawnTypes.length) return null;
  return {
    id: objectId,
    weight: resolvedWeight,
    spawnTypes,
    destructible,
    defaultDestructible: def.defaultDestructible !== false,
    renderBiomeId: def.renderBiomeId ?? null,
    graphicsRef: def.graphicsRef ?? null,
    particles: normalizeParticleConfigs(def.particles),
    effects: null,
    depthMode: normalizeDepthMode(def.depthMode, "dynamic"),
    sortAnchor: normalizeSortAnchor(def.sortAnchor),
    depthOffset: Number.isFinite(Number(def.depthOffset)) ? Number(def.depthOffset) : 0,
    scale: normalizeScale(scale),
    variantCount: objectVariantCountFromDef(def),
    spawnDamage: normalizeObjectSpawnDamage(spawnDamage),
    spawnTags: normalizeStringList(def.spawnTags),
    avoidSpawnTags: normalizeStringList(def.avoidSpawnTags),
    spawnAvoidRadius: normalizeOptionalRadius(def.spawnAvoidRadius),
    foregroundFade: normalizeForegroundFade(def.foregroundFade),
    foregroundFadeAlpha: Number.isFinite(Number(def.foregroundFadeAlpha))
      ? Math.min(1, Math.max(0.1, Number(def.foregroundFadeAlpha)))
      : undefined,
    destroyRewards: normalizeDestroyRewards(def.destroyRewards),
    tags: normalizeStringList(def.tags),
    factionId: def.factionId ? String(def.factionId) : null,
    onDestroyed: normalizeOnDestroyed(def.onDestroyed),
    defaultActionId: def.defaultActionId ? String(def.defaultActionId) : null,
    actionId: null,
  };
}

function normalizeObjectEffects(effects) {
  if (!effects || typeof effects !== "object" || Array.isArray(effects)) return null;
  const normalized = {};
  for (const [id, value] of Object.entries(effects)) {
    if (!id) continue;
    if (value === true || value === false) {
      normalized[id] = value;
      continue;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      normalized[id] = { ...value };
    }
  }
  return Object.keys(normalized).length ? normalized : null;
}

function normalizeDestroyRewards(rewards) {
  if (!rewards || typeof rewards !== "object" || Array.isArray(rewards)) return null;
  const lydra = Number(rewards.lydra) || 0;
  const netdra = Number(rewards.netdra) || 0;
  if (!lydra && !netdra) return null;
  return { lydra, netdra };
}

function normalizeFactionRepEffect(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const result = {};
  for (const [factionId, amount] of Object.entries(value)) {
    const n = Number(amount);
    if (String(factionId).trim() && Number.isFinite(n) && n !== 0) result[factionId] = n;
  }
  return Object.keys(result).length ? result : null;
}

function normalizeOnDestroyed(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const factionRep = normalizeFactionRepEffect(value.factionRep);
  return factionRep ? { factionRep } : null;
}

// TODO:DELETE - legacy biodome weight mapping is disabled. Regions must now use explicit objects arrays.
// function legacyObjectIdForWeightKey(weightKey, biomeId) {
//   switch (weightKey) {
//     case "tree":
//       return getTreeObjectIdForBiome(biomeId);
//     case "house":
//       return "object_house_mainland";
//     case "rock":
//       return "object_stone_cluster";
//     case "ruin":
//       return "object_ruin_mainland";
//     case "pillar":
//       return "object_pillar_stone";
//     case "fireplace":
//       return "object_fireplace_mainland";
//     case "firebeacon":
//       return "object_firebeacon_snow";
//     default:
//       return null;
//   }
// }

// export function legacyRegionObjectsFromWeights(weights = {}, biomeId = "mainland") {
//   const keys = ["tree", "house", "rock", "ruin", "pillar", "fireplace", "firebeacon"];
//   const entries = [];
//   for (const key of keys) {
//     const objectId = legacyObjectIdForWeightKey(key, biomeId);
//     if (!objectId) continue;
//     const weight = parseWeight(weights[key]);
//     const entry = buildObjectEntry(objectId, weight, null);
//     if (entry) entries.push(entry);
//   }
//   return entries;
// }

export function normalizeRegionObjects(regionConfig = {}, biomeId = "mainland") {
  const raw = regionConfig.objects;
  if (!Array.isArray(raw) || !raw.length) return [];
  const entries = [];
  for (const entry of raw) {
    if (typeof entry === "string") {
      const normalized = buildObjectEntry(entry, 1, null, null, null);
      if (normalized) entries.push(normalized);
      continue;
    }
    if (!entry || typeof entry !== "object") continue;
    const objectId = String(entry.id ?? entry.objectId ?? "").trim();
    if (!objectId) continue;
    const destructible = typeof entry.destructible === "boolean" ? entry.destructible : null;
    const weight = parseWeight(entry.weight) || 1;
    const normalized = buildObjectEntry(objectId, weight, destructible, entry.scale, entry.spawnDamage ?? entry.damageState ?? entry.damageSpawn);
    if (normalized && entry.particles) {
      normalized.particles = normalizeParticleConfigs(entry.particles);
    }
    if (normalized && entry.effects !== undefined) {
      normalized.effects = normalizeObjectEffects(entry.effects);
    }
    if (normalized && entry.depthMode) {
      normalized.depthMode = normalizeDepthMode(entry.depthMode, normalized.depthMode);
    }
    if (normalized && entry.sortAnchor) {
      normalized.sortAnchor = normalizeSortAnchor(entry.sortAnchor);
    }
    if (normalized && Number.isFinite(Number(entry.depthOffset))) {
      normalized.depthOffset = Number(entry.depthOffset);
    }
    if (normalized && (entry.spawnTags !== undefined)) {
      normalized.spawnTags = normalizeStringList(entry.spawnTags);
    }
    if (normalized && (entry.avoidSpawnTags !== undefined)) {
      normalized.avoidSpawnTags = normalizeStringList(entry.avoidSpawnTags);
    }
    if (normalized && entry.spawnAvoidRadius !== undefined) {
      normalized.spawnAvoidRadius = normalizeOptionalRadius(entry.spawnAvoidRadius);
    }
    if (normalized && entry.foregroundFade !== undefined) {
      normalized.foregroundFade = normalizeForegroundFade(entry.foregroundFade);
    }
    if (normalized && Number.isFinite(Number(entry.foregroundFadeAlpha))) {
      normalized.foregroundFadeAlpha = Math.min(1, Math.max(0.1, Number(entry.foregroundFadeAlpha)));
    }
    if (normalized && entry.destroyRewards !== undefined) {
      normalized.destroyRewards = normalizeDestroyRewards(entry.destroyRewards);
    }
    if (normalized && entry.tags !== undefined) {
      normalized.tags = normalizeStringList(entry.tags);
    }
    if (normalized && entry.factionId !== undefined) {
      normalized.factionId = String(entry.factionId ?? "").trim() || null;
    }
    if (normalized && entry.onDestroyed !== undefined) {
      normalized.onDestroyed = normalizeOnDestroyed(entry.onDestroyed);
    }
    if (normalized && entry.actionId !== undefined) {
      normalized.actionId = String(entry.actionId ?? "").trim() || null;
    }
    if (normalized) entries.push(normalized);
  }

  // TODO:DELETE - legacy tree fallback is disabled. Empty objects arrays now stay empty.
  return entries;
}

export function pickObjectSpawnType(objectEntry, randValue = Math.random()) {
  const spawnTypes = objectEntry?.spawnTypes ?? [];
  if (!spawnTypes.length) return null;
  const total = spawnTypes.reduce((sum, item) => sum + item.weight, 0);
  if (total <= 0) return spawnTypes[0].type;
  let cursor = Math.max(0, Math.min(1, randValue)) * total;
  for (const item of spawnTypes) {
    cursor -= item.weight;
    if (cursor <= 0) return item.type;
  }
  return spawnTypes[spawnTypes.length - 1].type;
}
