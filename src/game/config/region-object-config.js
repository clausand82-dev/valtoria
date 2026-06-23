import { normalizeParticleConfigs } from "./particle-presets.js";

export const REGION_OBJECT_DEFS = {
  object_tree_mainland: {
    spawnTypes: [{ type: "object_tree_mainland", weight: 1 }],
    defaultDestructible: true,
    tags: ["object", "destructible", "wood", "tree", "plant"],
    avoidSpawnTags: ["canopy"],
    destructible: { hp: 40, damageStages: 3, particleColor: "#b88454", lootTables: ["object_wood_material"] },
    renderBiomeId: "mainland",
    graphicsRef: "object/object_tree_normal.png (tree sheet)",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.95 },
    particles: { type: "leaves", count: [4, 14], radius: 28, heightOffset: -36, chance: 1, onlyWhenOnScreen: true }
  },
  object_tree_snow: {
    spawnTypes: [{ type: "object_tree_snow", weight: 1 }],
    defaultDestructible: true,
    tags: ["object", "destructible", "wood", "tree", "plant"],
    avoidSpawnTags: ["canopy"],
    destructible: { hp: 40, damageStages: 3, particleColor: "#b88454", lootTables: ["object_wood_material"] },
    renderBiomeId: "snow",
    graphicsRef: "object/object_tree_snow.png (tree sheet)",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.95 }
  },
  object_tree_sand: {
    spawnTypes: [{ type: "object_tree_sand", weight: 1 }],
    defaultDestructible: true,
    tags: ["object", "destructible", "wood", "tree", "plant"],
    avoidSpawnTags: ["canopy"],
    destructible: { hp: 40, damageStages: 3, particleColor: "#b88454", lootTables: ["object_wood_material"] },
    renderBiomeId: "desert",
    graphicsRef: "object/object_tree_sand.png (tree sheet)",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.95 }
  },
  object_tree_jungle: {
    spawnTypes: [{ type: "object_tree_jungle", weight: 1 }],
    defaultDestructible: true,
    tags: ["object", "destructible", "wood", "tree", "plant"],
    avoidSpawnTags: ["canopy"],
    destructible: { hp: 40, damageStages: 3, particleColor: "#b88454", lootTables: ["object_wood_material"] },
    renderBiomeId: "jungle",
    graphicsRef: "object/object_tree_jungle.png (tree sheet)",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.95 },
    particles: { type: "leaves", count: [4, 12], radius: 28, heightOffset: -36, chance: 1, onlyWhenOnScreen: true }
  },
  object_tree_rock: {
    spawnTypes: [{ type: "object_tree_rock", weight: 1 }],
    defaultDestructible: true,
    tags: ["object", "destructible", "stone"],
    destructible: { hp: 40, damageStages: 3, particleColor: "#b88454", lootTables: ["object_wood_material"] },
    renderBiomeId: "rock",
    graphicsRef: "object/object_tree_normal.png (tree sheet)",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.95 }
  },
  object_tree_lava: {
    spawnTypes: [{ type: "object_tree_lava", weight: 1 }],
    defaultDestructible: true,
    destructible: { hp: 40, damageStages: 3, particleColor: "#b88454", lootTables: ["object_wood_material"] },
    renderBiomeId: "lava",
    graphicsRef: "object/object_tree_dead.png (tree sheet)",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.95 }
  },
  object_house_mainland: {
    spawnTypes: [{ type: "object_house_mainland", weight: 1 }],
    defaultDestructible: true,
    tags: ["object", "destructible", "wood", "building"],
    destructible: { hp: 70, damageStages: 3, particleColor: "#c99b5d", popularityDelta: -3, lootTables: ["object_house_scrap", "object_rare_gemstones"] },
    renderBiomeId: "mainland",
    graphics: { mode: "sheet", files: ["object/object_house_normal_1.png"], rows: 4, cols: 4, renderScale: 2 },
    sockets: {
      coordinateSpace: "sheet",
      frameNumberBase: 1,
      cols: 4,
      rows: 4,
      imageWidth: 1254,
      imageHeight: 1254,
      files: {
        "object/object_house_normal_1.png": {
          "1": {chimney: { x: 174, y: 68 }},
          "2": {chimney: { x: 428, y: 78 }},
          "3": {chimney: { x: 832, y: 84 }},
          "4": {chimney: { x: 1044, y: 62 }},
          "5": {chimney: { x: 123, y: 388 }},
          "6": {  },
          "7": {chimney: { x: 831, y: 359 }, lanternA: { x: 655, y: 528 }},
          "8": {chimney: { x: 1032, y: 387 }, fireplace: { x: 1126, y: 551 }},
          "9": {chimney: { x: 191, y: 673 }},
          "10": {  },
          "11": {chimney: { x: 704, y: 670 }},
          "12": {chimney: { x: 1160, y: 697 }},
          "13": {fireplace: { x: 197, y: 1135 }},
          "14": {chimney: { x: 498, y: 965 }},
          "15": {chimney: { x: 714, y: 981 }},
          "16": {chimney: { x: 1114, y: 984 }, lanternA: { x: 960, y: 1117 }},
          }
        },
        "object/object_house_normal_2.png": {
          "1": {  },
          "2": {  },
          "3": {  },
          "4": {  }
        },
        "object/object_house_normal_3.png": {
          "1": {  },
          "2": {  },
          "3": {  },
          "4": {  }
        }
      },
    attachedEffects: [
      {
        id: "chimneySmoke",
        type: "particle",
        preset: "chimney_smoke",
        socket: "chimney",
        offset: { x: 0, y: -4 },
        enabledByDefault: true
      },
      { id: "lanternGlow", type: "particle", preset: "lantern_glow", socketPrefix: "lantern", enabledByDefault: true },
      { id: "windowGlow", type: "particle", preset: "window_glow", socketPrefix: "windowGlow", enabledByDefault: true },
      { id: "fireplaceGlow", type: "particle", preset: "fireplace_glow", socket: "fireplace", enabledByDefault: true },
      {
        id: "fireplaceSmoke",
        type: "particle",
        preset: "fireplace_smoke",
        socket: "fireplace",
        offset: { x: 0, y: -6 },
        enabledByDefault: false
      }
    ],
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.94 }
  },
  object_pillar_stone: {
    spawnTypes: [{ type: "object_pillar_stone", weight: 1 }],
    defaultDestructible: true,
    destructible: { hp: 52, damageStages: 3, particleColor: "#9a9488", lootTables: ["object_object_pillar_stone_loot"] },
    renderBiomeId: "mainland",
    graphics: { mode: "sheet", files: ["object/object_pillar_stone_1.png", "object/object_pillar_stone_2.png"], rows: 4, cols: 4, renderScale: 1 },
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.92 }
  },
  object_stone_cluster: {
    spawnTypes: [{ type: "object_stone_cluster", weight: 1 }],
    defaultDestructible: true,
    destructible: { hp: 42, damageStages: 3, particleColor: "#9a9488", lootTables: ["object_stone_material", "object_rare_gemstones"] },
    renderBiomeId: "mainland",
    graphicsRef: "object/object_rock_normal.png (rock sheet)",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.85 }
  },
  object_ruin_normal: {
    spawnTypes: [{ type: "object_ruin_normal", weight: 1 }],
    defaultDestructible: true,
    destructible: {
      hp: 64,
      damageStages: 3,
      particleColor: "#9a9488",
      lootTables: ["object_stone_material", "object_rare_gemstones", "object_object_ruin_normal_items"]
    },
    renderBiomeId: "mainland",
    graphicsRef: "object/object_ruin_normal.png (4x4)",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 }
  },
  object_ruin_snow: {
    spawnTypes: [{ type: "object_ruin_snow", weight: 1 }],
    defaultDestructible: true,
    destructible: { hp: 64, damageStages: 3, particleColor: "#9a9488", lootTables: ["object_stone_material", "object_rare_gemstones", "object_object_ruin_snow_items"] },
    renderBiomeId: "snow",
    graphicsRef: "object/object_ruin_snow.png (4x4)",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 }
  },
  object_ruin_sand: {
    spawnTypes: [{ type: "object_ruin_sand", weight: 1 }],
    defaultDestructible: true,
    destructible: { hp: 64, damageStages: 3, particleColor: "#9a9488", lootTables: ["object_stone_material", "object_rare_gemstones", "object_object_ruin_sand_items"] },
    renderBiomeId: "sand",
    graphicsRef: "object/object_ruin_sand.png (4x4)",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 }
  },
  object_ruin_jungle: {
    spawnTypes: [{ type: "object_ruin_jungle", weight: 1 }],
    defaultDestructible: true,
    destructible: {
      hp: 64,
      damageStages: 3,
      particleColor: "#9a9488",
      lootTables: ["object_stone_material", "object_rare_gemstones", "object_object_ruin_jungle_items"]
    },
    renderBiomeId: "jungle",
    graphicsRef: "object/object_ruin_jungle.png (4x4)",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 }
  },
  object_fireplace_mainland: {
    spawnTypes: [{ type: "fireplace", weight: 1 }],
    defaultDestructible: false,
    renderBiomeId: "mainland",
    graphicsRef: "fireplace_normal_01..04.png (animated)",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 },
    particles: [
      { type: "smoke", count: [2, 5], radius: 16, heightOffset: -36, chance: 1 },
      { type: "embers", count: [1, 4], radius: 12, heightOffset: -20, chance: 1 }
    ]
  },
  object_firebeacon_snow: {
    spawnTypes: [{ type: "firebeacon", weight: 1 }],
    defaultDestructible: false,
    renderBiomeId: "snow",
    graphicsRef: "firebeacon_snow_animated_001..008.png (animated)",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.93 },
    particles: [
      { type: "smoke", count: [3, 6], radius: 20, heightOffset: -54, chance: 1 },
      { type: "embers", count: [2, 5], radius: 16, heightOffset: -32, chance: 1 }
    ]
  },
  object_woodboxes_ground: {
    spawnTypes: [{ type: "object_woodboxes_ground", weight: 1 }],
    defaultDestructible: true,
    tags: ["object", "destructible", "wood", "container"],
    destructible: { hp: 52, damageStages: 3, particleColor: "#c99b5d", lootTables: ["object_object_woodboxes_ground_loot", "object_rare_gemstones"] },
    renderBiomeId: "mainland",
    graphicsRef: "object/object_woodboxes_ground.png",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 },
    particles: [{ type: "dust", count: [2, 5], radius: 16, heightOffset: -36, chance: 1 }]
  },
  object_shelfs: {
    spawnTypes: [{ type: "object_shelfs", weight: 1 }],
    defaultDestructible: true,
    tags: ["object", "destructible", "wood", "container"],
    destructible: { hp: 52, damageStages: 3, particleColor: "#c99b5d", lootTables: ["object_object_shelfs_loot", "object_object_shelfs_rare"] },
    renderBiomeId: "mainland",
    graphicsRef: "object/object_shelfs.png",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.92 }
  },
  object_chests_ground: {
    spawnTypes: [{ type: "object_chests_ground", weight: 1 }],
    defaultDestructible: false,
    renderBiomeId: "mainland",
    graphicsRef: "object/object_chests_ground.png",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 },
    sheetRenderScale: 0.95
  },
  object_field: {
    spawnTypes: [{ type: "object_field", weight: 1 }],
    defaultDestructible: false,
    renderBiomeId: "mainland",
    graphicsRef: "object/object_field.png",
    depthMode: "ground"
  },
  object_barn: {
    spawnTypes: [{ type: "object_barn", weight: 1 }],
    defaultDestructible: true,
    destructible: { hp: 52, damageStages: 3, particleColor: "#c99b5d", lootTables: ["object_object_barn_loot", "object_object_barn_rare"] },
    renderBiomeId: "mainland",
    graphicsRef: "object/object_barn.png",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.94 }
  },
  object_well: {
    spawnTypes: [{ type: "object_well", weight: 1 }],
    defaultDestructible: true,
    tags: ["object", "destructible", "stone"],
    destructible: { hp: 52, damageStages: 3, particleColor: "#9a9488", lootTables: ["object_object_well_loot", "object_object_well_rare"] },
    renderBiomeId: "mainland",
    graphicsRef: "object/object_well.png",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 }
  },
  object_sacks_ground: {
    spawnTypes: [{ type: "object_sacks_ground", weight: 1 }],
    defaultDestructible: true,
    tags: ["object", "destructible", "leather", "container"],
    destructible: { hp: 52, damageStages: 3, particleColor: "#c99b5d", lootTables: ["object_object_sacks_ground_loot", "object_object_sacks_ground_rare"] },
    renderBiomeId: "mainland",
    graphicsRef: "object/object_sacks_ground.png",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.88 }
  },
  object_barrels_ground: {
    spawnTypes: [{ type: "object_barrels_ground", weight: 1 }],
    defaultDestructible: true,
    tags: ["object", "destructible", "wood", "container"],
    destructible: { hp: 52, damageStages: 3, particleColor: "#c99b5d", lootTables: ["object_object_barrels_ground_loot", "object_object_barrels_ground_rare"] },
    renderBiomeId: "mainland",
    graphicsRef: "object/object_barrels_ground.png",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.88 }
  },
  object_hay: {
    spawnTypes: [{ type: "object_hay", weight: 1 }],
    defaultDestructible: true,
    tags: ["object", "destructible", "thatch"],
    destructible: { hp: 52, damageStages: 3, particleColor: "#c99b5d", lootTables: ["object_object_hay_loot", "object_object_hay_rare"] },
    renderBiomeId: "mainland",
    graphics: { mode: "sheet", files: ["object/object_hay01.png", "object/object_hay02.png"] },
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 }
  },
  object_bones: {
    spawnTypes: [{ type: "object_bones", weight: 1 }],
    defaultDestructible: true,
    tags: ["object", "destructible", "wood", "tree", "plant", "bones"],
    destructible: { hp: 52, damageStages: 3, particleColor: "#ffffff", lootTables: ["object_object_bones_loot", "object_object_bones_rare"] },
    renderBiomeId: "mainland",
    graphicsRef: "foilage/foilage_bones.png",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 }
  },
  object_inn_cellar_crack: {
    spawnTypes: [{ type: "object_inn_cellar_crack", weight: 1 }],
    defaultDestructible: false,
    renderBiomeId: "mainland",
    graphicsRef: "object/object_cracks02.png",
    depthMode: "ground",
    sortAnchor: { x: 0.5, y: 0.7 },
    sheetRenderScale: 1.75
  },
  object_caves: {
    spawnTypes: [{ type: "object_caves", weight: 1 }],
    defaultDestructible: false,
    tags: ["object", "cave"],
    renderBiomeId: "mainland",
    graphicsRef: "object/object_caves.png",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 },
    sheetRenderScale: 1.25
  },
  object_treestumps: {
    spawnTypes: [{ type: "object_treestumps", weight: 1 }],
    defaultDestructible: true,
    tags: ["object", "destructible", "wood", "tree", "plant"],
    destructible: { hp: 52, damageStages: 3, particleColor: "#ffffff", lootTables: ["object_object_treestumps_loot", "object_object_treestumps_rare"] },
    renderBiomeId: "mainland",
    graphicsRef: "object/object_treestumps.png",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 }
  },
  object_talltree_medium: {
    spawnTypes: [{ type: "object_talltree_medium", weight: 1 }],
    defaultDestructible: true,
    spawnTags: ["canopy"],
    spawnAvoidRadius: 1.8,
    foregroundFade: true,
    tags: ["object", "destructible", "wood", "tree", "plant"],
    destructible: { hp: 52, damageStages: 3, particleColor: "#ffffff", lootTables: ["object_object_talltree_medium_loot", "object_object_talltree_medium_rare"] },
    graphics: {
      mode: "sheet",
      files: [
        "object/trees/object_talltree_medium_1.png",
        "object/trees/object_talltree_medium_2.png",
        "object/trees/object_talltree_medium_3.png",
        "object/trees/object_talltree_medium_4.png",
        "object/trees/object_talltree_medium_5.png"
      ],
      rows: 2,
      cols: 2,
      renderScale: 0.5
    },
    renderBiomeId: "mainland",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 }
  },
  object_talltree_big: {
    spawnTypes: [{ type: "object_talltree_big", weight: 1 }],
    defaultDestructible: true,
    spawnTags: ["canopy"],
    spawnAvoidRadius: 2.4,
    foregroundFade: true,
    tags: ["object", "destructible", "wood", "tree", "plant"],
    destructible: { hp: 52, damageStages: 3, particleColor: "#ffffff", lootTables: ["object_object_talltree_big_loot", "object_object_talltree_big_rare"] },
    graphics: {
      mode: "sheet",
      files: [
        "object/trees/object_talltree_big_1.png",
        "object/trees/object_talltree_big_2.png",
        "object/trees/object_talltree_big_3.png",
        "object/trees/object_talltree_big_4.png",
        "object/trees/object_talltree_big_5.png"
      ],
      rows: 1,
      cols: 1,
      renderScale: 0.25
    },
    renderBiomeId: "mainland",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 }
  },
  object_fruitbaskets: {
    spawnTypes: [{ type: "object_fruitbaskets", weight: 1 }],
    defaultDestructible: true,
    tags: ["object", "destructible", "wood", "container"],
    destructible: { hp: 52, damageStages: 3, particleColor: "#f2b017", lootTables: ["object_fruit_baskets", "object_object_fruitbaskets_rare"] },
    renderBiomeId: "mainland",
    graphics: { mode: "sheet", files: ["object/object_fruitbaskets_01.png", "object/object_fruitbaskets_02.png"], renderScale: 0.5 },
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 }
  },
  object_marketstalls: {
    spawnTypes: [{ type: "object_marketstalls", weight: 1 }],
    defaultDestructible: true,
    tags: ["object", "destructible", "wood"],
    destructible: { hp: 52, damageStages: 3, particleColor: "#f2b017", lootTables: ["object_object_marketstalls_loot", "object_object_marketstalls_rare"] },
    renderBiomeId: "mainland",
    graphicsRef: "object/object_marketstalls.png",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 }
  },
  object_destroyed_marketstalls: {
    spawnTypes: [{ type: "object_destroyed_marketstalls", weight: 1 }],
    defaultDestructible: true,
    tags: ["object", "destructible", "wood"],
    destructible: {
      hp: 42,
      damageStages: 3,
      particleColor: "#8c6a43",
      lootTables: ["object_object_destroyed_marketstalls_loot", "object_object_destroyed_marketstalls_rare"]
    },
    renderBiomeId: "mainland",
    graphicsRef: "object/object_destroyed_marketstalls.png",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 }
  },
  object_wagons: {
    spawnTypes: [{ type: "object_wagons", weight: 1 }],
    defaultDestructible: true,
    tags: ["object", "destructible", "wood"],
    destructible: { hp: 52, damageStages: 3, particleColor: "#f2b017", lootTables: ["object_wood_material", "object_object_wagons_rare"] },
    renderBiomeId: "mainland",
    graphicsRef: "object/object_wagons.png",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 }
  },
  object_metalchest: {
    spawnTypes: [{ type: "object_metalchest", weight: 1 }],
    defaultDestructible: true,
    tags: ["object", "destructible", "metal"],
    destructible: { hp: 52, damageStages: 3, particleColor: "#f2b017", lootTables: ["object_metal_scrap", "object_object_metalchest_rare"] },
    renderBiomeId: "mainland",
    graphicsRef: "object/object_metalchest.png",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 }
  },
  object_furnace: {
    spawnTypes: [{ type: "object_furnace", weight: 1 }],
    defaultDestructible: false,
    tags: ["object", "metal"],
    destructible: { hp: 52, damageStages: 3, particleColor: "#f2b017", lootTables: ["object_metal_scrap", "object_object_furnace_rare"] },
    renderBiomeId: "mainland",
    graphicsRef: "object/object_furnace.png",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 }
  },
  object_anvil: {
    spawnTypes: [{ type: "object_anvil", weight: 1 }],
    defaultDestructible: false,
    tags: ["object", "metal"],
    destructible: { hp: 52, damageStages: 3, particleColor: "#f2b017", lootTables: ["object_metal_scrap", "object_object_anvil_rare"] },
    renderBiomeId: "mainland",
    graphicsRef: "object/object_anvil.png",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 }
  },
  object_bellow: {
    spawnTypes: [{ type: "object_bellow", weight: 1 }],
    defaultDestructible: false,
    tags: ["object", "metal"],
    destructible: { hp: 52, damageStages: 3, particleColor: "#f2b017", lootTables: ["object_metal_scrap", "object_object_bellow_rare"] },
    renderBiomeId: "mainland",
    graphicsRef: "object/object_bellow.png",
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 }
  }
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
    questTargetKey: def.questTargetKey ? String(def.questTargetKey) : null,
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
    if (normalized && entry.questTargetKey !== undefined) {
      normalized.questTargetKey = String(entry.questTargetKey ?? "").trim() || null;
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
