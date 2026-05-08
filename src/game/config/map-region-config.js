const AREA_MAP_VIEW = {
  aspect: "1122 / 1402",
  maxWidth: "620px",
};

const defaultRegionWeights = {
  tree: 8,
  pillar: 1,
  house: 1,
  foilage: 8,
  rock: 4,
  ruin: 1,
  fireplace: 1,
  firebeacon: 0,
  water: 0,
};

export const WORLD_MAP = {
  id: "world",
  title: "World map",
  subtitle: "Elvindalen and surrounding areas",
  imageUrl: "/assets/generated/map/map_worldmap_elvindale_v2.png",
  aspect: "1672 / 941",
  maxWidth: "1180px",
};

export const AREA_MAPS = {
  elvindale: {
    title: "Elvindalen",
    subtitle: "Forest region",
    imageUrl: "/assets/generated/map/map_elvindale_v2.png",
    aspect: "1672 / 941",
    maxWidth: "1180px",
  },
  "village-outskirts": {
    title: "Village Outskirts",
    subtitle: "Fields and roads around the village",
    imageUrl: "/assets/generated/map/map_villageoutskirts_v2.png",
    aspect: "1672 / 941",
    maxWidth: "1180px",
  },
  nethrendor: {
    ...AREA_MAP_VIEW,
    title: "Nethrendor",
    subtitle: "Eastern forest region",
    imageUrl: "/assets/generated/map/map_nethrendor.png",
  },
  swampfield: {
    ...AREA_MAP_VIEW,
    title: "Swampfield",
    subtitle: "Mushroom marshes",
    imageUrl: "/assets/generated/map/map_swampfield.png",
  },
  tornvalhed: {
    ...AREA_MAP_VIEW,
    title: "Tornvalhed",
    subtitle: "Troll island",
    imageUrl: "/assets/generated/map/map_tornvalhed_v2.png",
          aspect: "1672 / 941",
  maxWidth: "1180px",
  },
  sunkcity: {
    ...AREA_MAP_VIEW,
    title: "Sunk City",
    subtitle: "The drowned city",
    imageUrl: "/assets/generated/map/map_sunkcity.png",

  },
};

/*
Region parameter guide:

Required map/UI fields:
- id: Unique stable region id in English kebab-case. Used for saved corruption state and future biodome/data hooks.
- label: Display name shown on the map.
- points: SVG polygon points in percentage coordinates: "x,y x,y x,y". These define the clickable/highlighted area.
- labelX / labelY: Label position in percentage coordinates on the map.
- color: Base polygon color. World map uses this color directly; area maps are tinted red/green by corruption state.

Optional navigation fields:
- targetMapId: Area map id to open when clicking a world-map region. If omitted, the region id is used as the target map id.
- unlock: Access requirements before the region can be opened.
  Available keys:
  - locked: true keeps the region locked even without quest requirements. Useful for areas whose quest is not implemented yet.
  - text: Custom lock text shown on the map.
  - completedQuests: Quest ids that must be completed first.

Optional gameplay fields:
- corrupted: Boolean starting corruption state. Defaults to true. Corrupted regions show red; cleared/noncorrupted regions show green.
- populationGain: How many citizens the city gains the first time this region is liberated.
  Later completed runs add ceil(populationGain * repeatRunPct) from city-stats-rules-config.js.
  If omitted, city stats use CITY_STATS_RULES.mapLiberation.defaultPopulationGain.
- biodome: General biome/style key used by generation. Defaults to "mainland".
- tileset: Optional ground tileset override for this region.
  Supported formats:
  - string: "my_tileset.png" (uses all 16 tiles in a 4x4 sheet)
  - object: { fileName: "my_tileset.png", x: 1, y: 1 } (locks to one 4x4 tile cell)
  Notes:
  - x/y are 1-based where x=1,y=1 is the first tile in the sheet.
  - If tileset is missing, ground falls back to biome/biodome sheets as before.
- foliageSets / foliageSet: Optional foliage sheet override(s) for this region.
  Supported formats:
  - string: "my_foliage.png" (defaults to 4x4)
  - object: { fileName: "my_foliage.png", rows: 4, cols: 4 }
  - object with fixed scale: { fileName: "my_foliage.png", scale: 1.1 }
  - object with loot: { fileName: "my_foliage.png", resourceDrop: { wood_piece: 0.04 } }
  - array of strings/objects to mix multiple sheets.
  Notes:
  - If set, region foliage uses these sheets instead of biome+bones logic.
  - Legacy 8x8 sheets can be used by setting rows/cols to 8.
  - scale is per foliage sheet entry. If omitted, foliage keeps its current varied scale.
  - resourceDrop maps resource ids from resource-config.js to a per-foliage chance.
    The chance is rolled when each foliage piece is placed. No rolled resource means no E prompt.
  - For amounts, use resourceDrop: { wood_piece: { chance: 0.04, min: 1, max: 2 } }.
- objects: Optional explicit object spawn list for this region.
  If set and non-empty, this list overrides normal weight-based object selection.
  Format: array of object definitions:
  - { id: "object_tree_mainland", weight: 8 }
  - { id: "object_woodboxes_ground", weight: 2, destructible: true }
  Fields:
  - id: Object id from region-object-config.js
  - weight: Relative spawn weight for this object id
  - destructible: Optional override. true forces destructible, false blocks destruction.
- decay: Optional decay/decal sheet selection for this region.
  If set and non-empty, region decals use these sheet sets instead of the legacy
  biome decal list.
  Supported formats:
  - string: "decay_spiderweb" (uses all 4x4 cells)
  - object: { id: "decay_spiderweb", weight: 2, x: [1, 2, 4], y: [1, 2] }
  - array: mix strings/objects to blend multiple decay sets
  Notes:
  - x/y are 1-based cell selectors on the 4x4 grid.
  - If x/y are omitted, all cells from the decay set are used.
- mobs: Array of monster types allowed in this region. Defaults to ["Wolf", "Spider"].
  Supports plain strings (equal weight) and weighted objects:
  - "Wolf"                           plain string, weight 1
  - { type: "Spider", weight: 3 }    spawns 3x as often as weight-1 types
  - Mix: ["Wolf", { type: "Spider", weight: 2 }, { type: "MiniSpider", weight: 1 }]
- mapSize: Optional. Controls the generated map size.
  Options: "small", "medium" (default), "large", "giga".
  medium = current 72x52 tiles. small ~40x29, large ~108x78, giga ~158x114.
- weights: Object spawn weights for generated maps. Higher number means more of that feature; 0 disables it.
  Available keys:
  - tree: Trees.
  - pillar: Pillars.
  - house: Buildings/huts.
  - foilage: Small foliage clusters.
  - rock: Stones.
  - ruin: Ruin objects.
  - fireplace: Small fire/campfire points.
  - firebeacon: Larger fire beacon points.
  - water: Lake-like water patches. If omitted or 0, no water is generated. Water cannot be walked on.
- antiDrops: Drop blacklist for the region. This overrides normal drop rules.
  Available keys:
  - items: Item base names to block.
  - resources: Resource ids to block.
  - uniques: Unique item ids to block.
  - named: Named item ids to block.
  - categories: Loot categories to block, for example "weapon", "armor", "health", "mana".
  - rarities: Rarity ids to block. Blocks the listed rarity AND all higher rarities.
    Rarity order (lowest to highest): poor, normal, upgraded, rare, epic, legendary.
    Example: rarities: ["rare"] blocks rare, epic, and legendary items.
  - allItems: true blocks all equipment items (poor through legendary).
  - allResources: true blocks all resource drops.
  - allUniques: true blocks all unique item drops.
  - allNamed: true blocks all named item drops.
  - allPotions: true blocks all potion drops.
  - allQuestItems: true blocks all quest item drops.
  - allReadables: true blocks readable drops. Readables ignore rarity blocks.

Any extra fields passed to region({...}) are preserved on the region object for later use.
*/
function normalizeMobs(mobs) {
  return mobs.map((m) =>
    typeof m === "string"
      ? { type: m, weight: 1 }
      : { type: String(m.type), weight: Number(m.weight) || 1 }
  );
}

function region({ biodome = "mainland", mobs = ["Wolf", "Spider"], mapSize = "medium", weights = {}, antiDrops = {}, corrupted = true, ...regionConfig }) {
  return {
    corrupted,
    biodome,
    mapSize,
    mobs: normalizeMobs(mobs),
    antiDrops: {
      items: [],
      resources: [],
      uniques: [],
      named: [],
      categories: [],
      ...antiDrops,
    },
    weights: {
      ...defaultRegionWeights,
      ...weights,
    },
    ...regionConfig,
  };
}

export const MAP_REGION_SETS = {
  world: [
    region({
      id: "sea-serpent",
      label: "Soslangen",
      color: "#5f94ad",
      unlock: { locked: true, text: "Soslangen kraever en senere historiequest." },
      labelX: 11.44,
      labelY: 27.47,
      biodome: "jungle",
      mobs: ["Snake", "Ghost", "Scorpion"],
      // TODO:DELETE: weights: { tree: 0, house: 0, foilage: 1, rock: 7, ruin: 1, pillar: 1, water: 20 }
      weights: { foilage: 1, water: 20 },
      objects: [
        { id: "object_stone_cluster", weight: 7 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "12.2,19.16 5.26,21.52 2.37,26.45 2.54,33.34 7.86,35.7 16.75,34.01 22.73,23.38 16.47,20.81",
    }),
    region({
      id: "leviathans-waters",
      label: "Leviathans Farvand",
      color: "#5f94ad",
      unlock: { locked: true, text: "Leviathans Farvand kraever en senere historiequest." },
      labelX: 29.74,
      labelY: 27.35,
      biodome: "jungle",
      mobs: ["Snake", "Ghost", "Scorpion"],
      // TODO:DELETE: weights: { tree: 0, house: 0, foilage: 2, rock: 8, ruin: 1, pillar: 2, water: 20 }
      weights: { foilage: 2, water: 20 },
      objects: [
        { id: "object_stone_cluster", weight: 8 },
        { id: "object_pillar_stone", weight: 2 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "16.75,34.01 20.33,27.63 22.73,23.38 27.51,19.13 32.3,19.13 37.08,14.88 39.47,17 41.87,25.5 37.08,31.88 34.69,31.88 29.9,36.13 25.12,36.13 22.73,38.26 19.14,38.26",
    }),
    region({
      id: "vortexen",
      label: "Vortexen",
      color: "#79b9cd",
      unlock: { locked: true, text: "Vortexen kraever en senere historiequest." },
      labelX: 48.41,
      labelY: 19.78,
      biodome: "jungle",
      mobs: ["Ghost", "Demon"],
      // TODO:DELETE: weights: { tree: 0, house: 0, foilage: 1, rock: 5, ruin: 3, pillar: 4, water: 22 }
      weights: { foilage: 1, water: 22 },
      objects: [
        { id: "object_pillar_stone", weight: 4 },
        { id: "object_stone_cluster", weight: 5 },
        { id: "object_ruin_mainland", weight: 3 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "49.25,11.97 45.38,11.87 43.35,14.75 39.47,17 41.87,25.5 52.63,27.63 56.22,23.38 56.22,17 52.89,13.41",
    }),
    region({
      id: "kraken-waters",
      label: "Tentakelfarvand",
      color: "#79b9cd",
      unlock: { locked: true, text: "Tentakelfarvand kraever en senere historiequest." },
      labelX: 86.14,
      labelY: 23.22,
      biodome: "jungle",
      mobs: ["Snake", "Demon", "Ghost"],
      // TODO:DELETE: weights: { tree: 0, house: 0, foilage: 1, rock: 5, ruin: 2, pillar: 3, water: 22 }
      weights: { foilage: 1, water: 22 },
      objects: [
        { id: "object_stone_cluster", weight: 5 },
        { id: "object_pillar_stone", weight: 3 },
        { id: "object_ruin_mainland", weight: 2 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "75.36,36.13 78.95,40.38 83.73,40.38 96.89,21.25 92.11,10.63 83.73,2.13 82.54,14.88 81.34,19.13 81.34,23.38",
    }),
    region({
      id: "village-outskirts",
      label: "Landsby Ved Elvindalens Udkant",
      color: "#d7a85b",
      labelX: 13.6,
      labelY: 67,
      // TODO:DELETE: weights: { house: 8, tree: 3, rock: 2, foilage: 5, fireplace: 3 }
      weights: { foilage: 5 },
      objects: [
        { id: "object_house_mainland", weight: 8 },
        { id: "object_tree_mainland", weight: 3 },
        { id: "object_fireplace_mainland", weight: 3 },
        { id: "object_stone_cluster", weight: 2 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
      ],
      points: "1.91,67.33 6.59,53.67 13.16,51.01 19.14,57.39 23.92,65.89 26.32,74.39 13.16,82.89 8.38,75.55 3.82,73.7",
    }),
    region({
      id: "elvindale",
      label: "Elvindalen",
      color: "#9fca66",
      unlock: { locked: true, text: "Nethrendor kraever en senere historiequest." },
      labelX: 34.06,
      labelY: 54.05,
      objects: [
        { id: "object_tree_mainland", weight: 8 },
        { id: "object_stone_cluster", weight: 4 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "26.32,74.39 23.92,65.89 19.14,57.39 13.16,51.01 16.75,46.76 14.35,44.63 19.14,38.26 22.73,38.26 25.12,36.13 27.51,36.13 29.9,36.13 32.3,34.01 34.69,31.88 37.08,31.88 39.47,36.13 50.24,40.38 51.44,55.26 46.65,65.89 44.26,76.51 33.49,76.51",
    }),
    region({
      id: "nethrendor",
      label: "Nethrendor",
      color: "#7fb172",
      unlock: { army: 1000 },
      labelX: 67.62,
      labelY: 51.44,
      objects: [
        { id: "object_tree_mainland", weight: 8 },
        { id: "object_stone_cluster", weight: 4 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "51.44,55.26 61,53.13 69.38,59.51 66.99,70.14 70.57,82.89 78.95,65.89 78.95,59.51 81.34,48.88 77.75,42.51 78.95,40.38 75.36,36.13 71.77,38.26 66.99,34.01 62.2,31.88 57.42,34.01 55.02,40.38 50.24,40.38",
    }),
    region({
      id: "swampfield",
      label: "Swampfield",
      color: "#b58bd6",
      unlock: { locked: true, text: "Swampfield kraever en senere historiequest." },
      labelX: 58.53,
      labelY: 62.17,
      objects: [
        { id: "object_tree_mainland", weight: 8 },
        { id: "object_stone_cluster", weight: 4 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "46.65,65.89 53.83,70.14 58.61,68.01 63.4,70.14 66.99,70.14 69.38,59.51 61,53.13 51.44,55.26",
    }),
    region({
      id: "life-tree",
      label: "Livstraeet",
      color: "#cadf74",
      unlock: { locked: true, text: "Livstraeet kraever en senere historiequest." },
      labelX: 66.42,
      labelY: 84.47,
      mobs: ["Wolf", "Ghost"],
      // TODO:DELETE: weights: { tree: 12, rock: 4, pillar: 3, foilage: 10, fireplace: 1 }
      weights: { foilage: 10 },
      objects: [
        { id: "object_tree_mainland", weight: 12 },
        { id: "object_stone_cluster", weight: 4 },
        { id: "object_pillar_stone", weight: 3 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "56.22,97.77 80.14,97.77 78.95,65.89 70.57,82.89 66.99,70.14 63.4,70.14 58.61,68.01 53.83,70.14 53.83,89.27",
    }),
    region({
      id: "eldiria",
      label: "Eldiria",
      color: "#b4c46f",
      unlock: { locked: true, text: "Eldiria kraever en senere historiequest." },
      labelX: 36.31,
      labelY: 85.94,
      // TODO:DELETE: weights: { tree: 5, rock: 2, house: 1, foilage: 10, fireplace: 1 }
      weights: { foilage: 10 },
      objects: [
        { id: "object_tree_mainland", weight: 5 },
        { id: "object_stone_cluster", weight: 2 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "13.16,82.89 17.94,97.77 56.22,97.77 53.83,89.27 53.83,70.14 46.65,65.89 44.26,76.51 33.49,76.51 26.32,74.39",
    }),
    region({
      id: "tornvalhed",
      label: "Tornvalhed",
      color: "#d7a85b",
      unlock: { completedQuests: ["sail_to_tornvalhed"] },
      labelX: 69.79,
      labelY: 19.14,
      objects: [
        { id: "object_tree_mainland", weight: 8 },
        { id: "object_stone_cluster", weight: 4 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "57.42,34.01 52.63,27.63 56.22,23.38 56.22,17 68.18,2.13 83.73,2.13 82.54,14.88 81.34,19.13 81.34,23.38 75.36,36.13 71.77,38.26 66.99,34.01 62.2,31.88",
    }),
    region({
      id: "sunk-city",
      targetMapId: "sunkcity",
      label: "Sunk City",
      color: "#7fb6d6",
      unlock: { locked: true, text: "Sunk City kraever en senere historiequest." },
      labelX: 47.56,
      labelY: 33.09,
      objects: [
        { id: "object_tree_mainland", weight: 8 },
        { id: "object_stone_cluster", weight: 4 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "37.08,31.88 41.87,25.5 52.63,27.63 57.42,34.01 55.02,40.38 50.24,40.38 39.47,36.13",
    }),
    region({
      id: "eternal-mountains",
      label: "De Evige Bjerge",
      color: "#a6a0a0",
      biodome: "rock",
      mobs: ["Skeleton", "Ghost"],
      unlock: { locked: true, text: "De Evige Bjerge kraever en senere historiequest." },
      labelX: 90.01,
      labelY: 64.28,
      // TODO:DELETE: weights: { tree: 1, rock: 12, pillar: 4, ruin: 2, foilage: 2, fireplace: 1 }
      weights: { foilage: 2 },
      objects: [
        { id: "object_stone_cluster", weight: 12 },
        { id: "object_pillar_stone", weight: 4 },
        { id: "object_ruin_mainland", weight: 2 },
        { id: "object_tree_rock", weight: 1 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "78.95,40.38 83.73,40.38 96.89,21.25 99.28,21.25 99.28,97.77 80.14,97.77 78.95,65.89 78.95,59.51 81.34,48.88 77.75,42.51",
    }),
  ],
  
  // VILLAGE OUTSKIRTS AREA MAP REGIONS
  // VILLAGE OUTSKIRTS AREA MAP REGIONS
  // VILLAGE OUTSKIRTS AREA MAP REGIONS
  
  "village-outskirts": [
    region({
      id: "path-to-hunter-hut",
      label: "Path to Hunter Hut",
      color: "#d7a85b",
      unlock: { locked: true, text: "Laas op ved at fuldfoere quests i landsbyen." },
      labelX: 38,
      labelY: 10,
      // TODO:DELETE: weights: { tree: 6, rock: 2, foilage: 8, fireplace: 1 }
      objects: [
        { id: "object_tree_mainland", weight: 6 },
        { id: "object_stone_cluster", weight: 2 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "29.90,4.25 47.85,4.25 41.87,17.00 31.10,14.88",
    }),
    region({
      id: "lookout-post",
      label: "Udkigsposten",
      color: "#9fca66",
      unlock: { locked: true, text: "Laas op ved at fuldfoere quests i landsbyen." },
      labelX: 35,
      labelY: 26,
      // TODO:DELETE: weights: { tree: 7, rock: 3, foilage: 7, fireplace: 1 }
      weights: { foilage: 7 },
      objects: [
        { id: "object_tree_mainland", weight: 7 },
        { id: "object_stone_cluster", weight: 3 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "31.10,14.88 41.87,17.00 41.87,31.88 34.69,36.13 23.92,29.76",
    }),
    region({
      id: "old-shrine",
      label: "Den gamle helligdom",
      color: "#cadf74",
      unlock: { locked: true, text: "Laas op ved at fuldfoere quests i landsbyen." },
      labelX: 72,
      labelY: 14,
      // TODO:DELETE: weights: { pillar: 2, ruin: 2, tree: 4, rock: 3, foilage: 5 }
      weights: { foilage: 5 },
      objects: [
        { id: "object_tree_mainland", weight: 4 },
        { id: "object_stone_cluster", weight: 3 },
        { id: "object_pillar_stone", weight: 2 },
        { id: "object_ruin_mainland", weight: 2 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "78.95,4.25 65.79,4.25 61.00,17.00 72.97,27.63 83.73,17.00",
    }),
    region({
      id: "paths-into-elvindale",
      label: "Stier videre ind i elvindalen",
      color: "#d7a85b",
      unlock: { locked: true, text: "Laas op ved at fuldfoere quests i landsbyen." },
      labelX: 89,
      labelY: 13,
      // TODO:DELETE: weights: { tree: 8, rock: 2, foilage: 9, fireplace: 1 }
      weights: { foilage: 9 },
      objects: [
        { id: "object_tree_mainland", weight: 8 },
        { id: "object_stone_cluster", weight: 2 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "78.95,4.25 95.69,4.25 98.09,25.50 83.73,17.00",
    }),
    region({
      id: "southern-fields",
      label: "Soendre marker",
      color: "#b4c46f",
      unlock: { locked: true, text: "Laas op ved at fuldfoere quests i landsbyen." },
      labelX: 70,
      labelY: 73,
      // TODO:DELETE: weights: { tree: 3, rock: 1, foilage: 6, house: 1, fireplace: 1 }
      weights: { foilage: 6 },
      objects: [
        { id: "object_tree_mainland", weight: 3 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_stone_cluster", weight: 1 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "66.99,87.14 87.32,72.26 70.57,57.39 56.22,74.39",
    }),
    region({
      id: "river-creek",
      label: "Elvbaekken",
      color: "#7fb6d6",
      unlock: { locked: true, text: "Laas op ved at fuldfoere quests i landsbyen." },
      labelX: 49,
      labelY: 79,
      // TODO:DELETE: weights: { tree: 4, rock: 3, foilage: 7, water: 12 }
      weights: { foilage: 7, water: 12 },
      objects: [
        { id: "object_tree_mainland", weight: 4 },
        { id: "object_stone_cluster", weight: 3 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "66.99,87.14 35.89,85.02 35.89,68.01 56.22,74.39",
    }),
    region({
      id: "trail-to-inner-elvindale",
      label: "Sti mod Elvindalens indre dal",
      color: "#d7a85b",
      unlock: { locked: true, text: "Laas op ved at fuldfoere quests i landsbyen." },
      labelX: 25,
      labelY: 77,
      // TODO:DELETE: weights: { tree: 6, rock: 2, foilage: 9, fireplace: 1 }
      weights: { foilage: 9 },
      objects: [
        { id: "object_tree_mainland", weight: 6 },
        { id: "object_stone_cluster", weight: 2 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "35.89,85.02 13.16,87.14 14.35,68.01 35.89,68.01",
    }),
    region({
      id: "market-square",
      label: "Markedstorv",
      color: "#f0d58a",
      unlock: { locked: true, text: "Markedstorv kraever en senere historiequest." },
      labelX: 50,
      labelY: 45,
      // TODO:DELETE: weights: { house: 3, tree: 2, rock: 1, foilage: 4, fireplace: 2 }
      weights: { foilage: 4 },
      objects: [
        { id: "object_house_mainland", weight: 3 },
        { id: "object_tree_mainland", weight: 2 },
        { id: "object_fireplace_mainland", weight: 2 },
        { id: "object_stone_cluster", weight: 1 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
      ],
      points: "47.85,40.38 44.26,46.76 46.65,51.01 50.24,48.88 55.02,48.88 56.22,42.51 51.44,38.26",
    }),
    region({
      id: "well",
      label: "Broenden",
      color: "#7fb6d6",
      //unlock: { locked: true, text: "Broenden kraever en senere historiequest." },
      labelX: 53,
      labelY: 52,
      // TODO:DELETE: weights: { tree: 2, rock: 2, foilage: 4, water: 8, fireplace: 1 }
      weights: { foilage: 4, water: 8 },
      objects: [
        { id: "object_tree_mainland", weight: 20 },
        { id: "object_stone_cluster", weight: 20 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "46.65,51.01 49.04,57.39 56.22,55.26 58.61,51.01 55.02,48.88 50.24,48.88",
    }),
    region({
      id: "inn-of-the-good-oak",
      label: "Kroen Den Gode Eg",
      mapSize: "small",
      color: "#7fb172",
      tileset: "tileset/tileset_bricktiles.png",
      //populationGain: 10,
      foliageSet: [
        { fileName: "foilage/foilage_basement.png", resourceDrop: { magic_essence: 0.05, wood_piece: 0.02, rare_pink_flower: 0.01 } }, 
        { fileName: "foilage/foilage_boneparts.png"},
        { fileName: "foilage/foilage_deadanimal_small.png", scale: 0.5},
        { fileName: "foilage/foilage_deadanimal_verysmall.png", scale: 0.25 },
      ],
      objects: [
        //{ id: "object_tree_mainland", weight: 8 },
        { id: "object_woodboxes_ground", weight: 15, destructible: true },
        { id: "object_shelfs", weight: 3, destructible: true },
        //{ id: "object_firebeacon_snow", weight: 1, destructible: false },
      ],
      decay: [
        { id: "decay_spiderweb", weight: 12 },
        { id: "decay_cracks", weight: 8 },
        { id: "decay_dust", weight: 10 },
        { id: "decay_basement", weight: 20 },
      ],
      labelX: 60,
      labelY: 31,
      mobs: [{ type: "MiniSpider", weight: 3 }, "Spider", "MediumSpider", "LargeSpider", { type: "MotherSpider", weight: 0.5 }],
      //weights: { house: 10, tree: 10, rock: 2, foilage: 9, fireplace: 1 },
      antiDrops: { allPotions: false, rarities: ["rare"], allUniques: true, allResources: false },
      points: "51.44,38.26 61.00,17.00 72.97,27.63 56.22,42.51",
    }),
    region({
      id: "barn",
      label: "Laden",
      mapSize: "small",
      color: "#c4a86a",
      tileset: { fileName: "tileset/tileset_woodplank.png", x: 1, y: 1 },
      foliageSet: [{ fileName: "foilage/foilage_barn.png"},
        { fileName: "foilage/foilage_boneparts.png"},
        { fileName: "foilage/foilage_barnitems.png", scale: 0.5},
        { fileName: "foilage/foilage_smashed_smallanimals.png", scale: 0.25 },],
      objects: [
        //{ id: "object_tree_mainland", weight: 8 },
        //{ id: "object_barn", weight: 15, destructible: true },
        { id: "object_sacks_ground", weight: 5, destructible: true },
        { id: "object_hay01", weight: 5, destructible: true },
        { id: "object_hay02", weight: 5, destructible: true },
        //{ id: "object_firebeacon_snow", weight: 1, destructible: false },
      ],
      decay: [
        { id: "decay_spiderweb", weight: 12 },
        { id: "decay_cracks", weight: 8 },
        { id: "decay_dust", weight: 10 },
        { id: "decay_field", weight: 20 },
      ],
      unlock: { completedQuests: ["clear_the_inn"] },
      labelX: 58,
      labelY: 59,
      mobs: [{ type: "Skeleton", weight: 5 }, "Spider", "Wolf", "Bone Warden", "Gate Warden"],
      antiDrops: { allPotions: true, categories: ["weapon"], rarities: ["rare"], allUniques: true, allResources: true },
      //weights: { house: 5, tree: 2, rock: 1, foilage: 4, fireplace: 2 },
      points: "70.57,57.39 56.22,74.39 49.04,57.39 56.22,55.26 58.61,51.01",
    }),
    region({
      id: "mill",
      label: "Kvaernen",
      color: "#d7a85b",
      unlock: { locked: true, text: "Laas op ved at fuldfoere quests i landsbyen." },
      labelX: 83,
      labelY: 57,
      // TODO:DELETE: weights: { house: 3, tree: 3, rock: 2, foilage: 4, fireplace: 1 }
      weights: { foilage: 4 },
      objects: [
        { id: "object_house_mainland", weight: 3 },
        { id: "object_tree_mainland", weight: 3 },
        { id: "object_stone_cluster", weight: 2 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "70.57,57.39 81.34,44.63 94.50,55.26 87.32,72.26",
    }),
    region({
      id: "hunter-trail-to-the-forest",
      label: "Jaegerstien mod skoven",
      color: "#9fca66",
      unlock: { locked: true, text: "Laas op ved at fuldfoere quests i landsbyen." },
      labelX: 93,
      labelY: 45,
      // TODO:DELETE: weights: { tree: 9, rock: 2, foilage: 10, fireplace: 1 }
      weights: { foilage: 10 },
      objects: [
        { id: "object_tree_mainland", weight: 9 },
        { id: "object_stone_cluster", weight: 2 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "81.34,44.63 98.09,25.50 98.09,55.26 94.50,55.26",
    }),
    region({
      id: "smithy",
      label: "Smedjen",
      color: "#c4a86a",
      unlock: { locked: true, text: "Laas op ved at fuldfoere quests i landsbyen." },
      labelX: 44,
      labelY: 35,
      // TODO:DELETE: weights: { house: 4, tree: 2, rock: 4, foilage: 3, fireplace: 3 }
      weights: { foilage: 3 },
      objects: [
        { id: "object_house_mainland", weight: 4 },
        { id: "object_stone_cluster", weight: 4 },
        { id: "object_fireplace_mainland", weight: 3 },
        { id: "object_tree_mainland", weight: 2 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
      ],
      points: "34.69,36.13 44.26,46.76 47.85,40.38 51.44,38.26 41.87,17.00 41.87,31.88",
    }),
    region({
      id: "northern-fields",
      label: "Nordlige marker",
      color: "#b4c46f",
      tileset: { fileName: "tileset/tileset_field.png"},
      foliageSet: [
        { fileName: "foilage/foilage_field.png", weight: 45, resourceDrop: { red_rose: 0.02 } },
        { fileName: "foilage/foilage_plants_mainland.png", weight: 10 },
      ],
      decay: [
        { id: "decay_field", weight: 20 },
        { id: "decay_cracks", weight: 8 },
      ],
      unlock: { completedQuests: ["lost_watch"] },
      labelX: 72,
      labelY: 39,
      // TODO:DELETE: weights: { tree: 3, rock: 2, foilage: 6, house: 1 }
      weights: { foilage: 100 },
      mobs: [{ type: "Skeleton", weight: 5 }, "Spider", "Wolf", "Bone Warden", "Gate Warden"],
      objects: [
        { id: "object_tree_mainland", weight: 3 },
        { id: "object_stone_cluster", weight: 2 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_barn", weight: 15, destructible: true },
        { id: "object_sacks_ground", weight: 5, destructible: true },
      ],
      points: "98.09,25.50 81.34,44.63 70.57,57.39 58.61,51.01 55.02,48.88 56.22,42.51 72.97,27.63 83.73,17.00",
    }),
    region({
      id: "village",
      label: "Landsbyen",
      color: "#d7a85b",
      mapSize: "large",
      tileset: [{ fileName: "tileset/tileset_bricktiles.png"}, { fileName: "tileset/tileset_grass.png"}, { fileName: "tileset/tileset_debris.png"}],
      labelX: 38,
      labelY: 54,
            foliageSet: [
        { fileName: "foilage/foilage_field.png", weight: 25, resourceDrop: { wheat: 0.02 } },
        { fileName: "foilage/foilage_plants_mainland.png", weight: 10 },
        { fileName: "foilage/foilage_deadvillages.png", weight: 50, scale: 1.5, resourceDrop: { red_rose: 0.02, fruit: 0.01, meat: 0.01, wheat: 0.01 } },
        { fileName: "foilage/foilage_village_items_broken.png", weight: 10, scale: 0.7},
        { fileName: "foilage/foilage_village_debris.png", weight: 10, },
        { fileName: "foilage/foilage_cityplant.png", weight: 25, resourceDrop: { red_rose: 0.02, fruit: 0.01, meat: 0.01, wheat: 0.01 } },
      ],
      decay: [
        { id: "decay_blood", weight: 50 },
        { id: "decay_field", weight: 20 },
        { id: "decay_cracks", weight: 8 },
        
      ],
      unlock: { completedQuests: ["vitlias_kings_relics"] },
      // TODO:DELETE: weights: { house: 8, tree: 3, rock: 2, foilage: 5, fireplace: 3 }
      weights: { foilage: 5 },
      mobs: ["Knight", "Wild Boar", "Village01", "Village02", "Village03", "Village04", "Village05", "Village06", "Wizard"],
      objects: [
        { id: "object_house_mainland", weight: 20 },
        { id: "object_tree_mainland", weight: 3 },
        { id: "object_fireplace_mainland", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
      ],
      points: "23.92,29.76 34.69,36.13 44.26,46.76 46.65,51.01 49.04,57.39 56.22,74.39 35.89,68.01 14.35,68.01",
    }),
    region({
      id: "the-forest",
      label: "The Forest",
      color: "#7fb172",
      unlock: { locked: true, text: "Laas op ved at fuldfoere quests i landsbyen." },
      labelX: 54,
      labelY: 16,
      // TODO:DELETE: weights: { tree: 11, rock: 2, foilage: 10, fireplace: 1 }
      weights: { foilage: 10 },
      objects: [
        { id: "object_tree_mainland", weight: 11 },
        { id: "object_stone_cluster", weight: 2 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "41.87,17.00 47.85,4.25 65.79,4.25 61.00,17.00 51.44,38.26",
    }),
  ],
  elvindale: [
    region({
      id: "to-hunters-hut-and-village",
      label: "To Hunter's Hut And Village",
      color: "#d7a85b",
      labelX: 5,
      labelY: 22,
      // TODO:DELETE: weights: { house: 3, tree: 7, rock: 2, foilage: 6, fireplace: 2 }
      weights: { foilage: 6 },
      objects: [
        { id: "object_tree_mainland", weight: 7 },
        { id: "object_house_mainland", weight: 3 },
        { id: "object_stone_cluster", weight: 2 },
        { id: "object_fireplace_mainland", weight: 2 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
      ],
      points: "1.20,17.00 9.57,17.00 10.77,19.13 5.98,25.50 1.20,25.50",
    }),
    region({
      id: "to-the-drowned-city",
      label: "To The Drowned City",
      biodome: "jungle",
      color: "#7fb6d6",
      labelX: 57,
      labelY: 6,
      mobs: ["Ghost", "Skeleton"],
      // TODO:DELETE: weights: { tree: 4, rock: 5, ruin: 3, pillar: 2, foilage: 4, house: 10, fireplace: 1, water: 16 }
      weights: { foilage: 4, water: 16 },
      objects: [
        { id: "object_house_mainland", weight: 10 },
        { id: "object_stone_cluster", weight: 5 },
        { id: "object_tree_jungle", weight: 4 },
        { id: "object_ruin_mainland", weight: 3 },
        { id: "object_pillar_stone", weight: 2 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "43.06,2.13 59.81,2.13 63.40,6.38 47.85,8.50",
    }),
    region({
      id: "goat-hill",
      label: "Goat Hill",
      color: "#b4c46f",
      labelX: 46,
      labelY: 16,
      // TODO:DELETE: weights: { tree: 6, rock: 7, pillar: 2, foilage: 5, fireplace: 1 }
      weights: { foilage: 5 },
      objects: [
        { id: "object_stone_cluster", weight: 7 },
        { id: "object_tree_mainland", weight: 6 },
        { id: "object_pillar_stone", weight: 2 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "47.85,8.50 43.06,2.13 31.10,14.88 44.26,34.01 51.44,17.00",
    }),
    region({
      id: "shadow-thicket",
      label: "Shadow Thicket",
      color: "#9d85d2",
      labelX: 79,
      labelY: 16,
      mobs: ["Spider", "Ghost"],
      // TODO:DELETE: weights: { tree: 10, rock: 3, ruin: 1, pillar: 1, foilage: 10 }
      weights: { foilage: 10 },
      objects: [
        { id: "object_tree_mainland", weight: 10 },
        { id: "object_stone_cluster", weight: 3 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "68.18,25.50 62.20,21.25 63.40,6.38 75.36,4.25 89.71,12.75 84.93,23.38 80.14,19.13 75.36,14.88 69.38,14.88",
    }),
    region({
      id: "quiet-tree",
      label: "Det Lyste Trae",
      color: "#7fb172",
      labelX: 75,
      labelY: 23,
      mobs: ["Wolf", "Spider"],
      // TODO:DELETE: weights: { tree: 11, rock: 2, pillar: 1, foilage: 9, fireplace: 1 }
      weights: { foilage: 9 },
      objects: [
        { id: "object_tree_mainland", weight: 11 },
        { id: "object_stone_cluster", weight: 2 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "68.18,25.50 69.38,14.88 75.36,14.88 84.93,23.38 75.36,27.63",
    }),
    region({
      id: "waterfall-stream",
      label: "Waterfall Stream",
      color: "#7fb6d6",
      labelX: 60,
      labelY: 32,
      mobs: ["Wolf", "Spider"],
      // TODO:DELETE: weights: { tree: 5, rock: 6, pillar: 1, foilage: 7, fireplace: 1 }
      weights: { foilage: 7 },
      objects: [
        { id: "object_stone_cluster", weight: 6 },
        { id: "object_tree_mainland", weight: 5 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "58.61,36.13 68.18,25.50 62.20,21.25 63.40,6.38 47.85,8.50 51.44,17.00 44.26,34.01",
    }),
    region({
      id: "stone-ring-glade",
      label: "Stone Ring Glade",
      color: "#9fca66",
      labelX: 28,
      labelY: 29,
      // TODO:DELETE: weights: { tree: 8, rock: 4, ruin: 1, pillar: 2, foilage: 7 }
      weights: { foilage: 7 },
      objects: [
        { id: "object_tree_mainland", weight: 8 },
        { id: "object_stone_cluster", weight: 4 },
        { id: "object_pillar_stone", weight: 2 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "10.77,19.13 31.10,14.88 38.28,25.50 29.90,34.01 20.33,38.26 10.77,36.13",
    }),
    region({
      id: "hunter-trail",
      label: "Hunter Trail",
      color: "#cadf74",
      labelX: 20,
      labelY: 49,
      // TODO:DELETE: weights: { tree: 9, rock: 2, pillar: 1, foilage: 12, fireplace: 1 }
      weights: { foilage: 12 },
      objects: [
        { id: "object_tree_mainland", weight: 9 },
        { id: "object_stone_cluster", weight: 2 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "13.16,53.13 17.94,44.63 33.49,44.63 31.10,55.26",
    }),
    region({
      id: "hunters-hut",
      label: "Hunter's Hut",
      color: "#d7a85b",
      labelX: 12,
      labelY: 49,
      // TODO:DELETE: weights: { house: 4, tree: 6, rock: 2, foilage: 5, fireplace: 3 }
      weights: { foilage: 5 },
      objects: [
        { id: "object_tree_mainland", weight: 6 },
        { id: "object_house_mainland", weight: 4 },
        { id: "object_fireplace_mainland", weight: 3 },
        { id: "object_stone_cluster", weight: 2 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
      ],
      points: "1.20,57.39 3.59,53.13 8.37,61.64 17.94,44.63 20.33,38.26 10.77,36.13 10.77,19.13 5.98,25.50 1.20,25.50",
    }),
    region({
      id: "elflight-glow",
      label: "Elflight Glow",
      color: "#c4a86a",
      labelX: 20,
      labelY: 53,
      // TODO:DELETE: weights: { tree: 7, rock: 2, foilage: 6, fireplace: 1 }
      weights: { foilage: 6 },
      objects: [
        { id: "object_tree_mainland", weight: 7 },
        { id: "object_stone_cluster", weight: 2 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "20.33,38.26 17.94,44.63 33.49,44.63 38.28,25.50 29.90,34.01",
    }),
    region({
      id: "to-village",
      label: "To Village",
      color: "#d7a85b",
      labelX: 3,
      labelY: 64,
      // TODO:DELETE: weights: { house: 3, tree: 4, rock: 2, foilage: 5, fireplace: 2 }
      weights: { foilage: 5 },
      objects: [
        { id: "object_tree_mainland", weight: 4 },
        { id: "object_house_mainland", weight: 3 },
        { id: "object_stone_cluster", weight: 2 },
        { id: "object_fireplace_mainland", weight: 2 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
      ],
      points: "1.20,57.39 1.20,68.01 8.37,61.64 3.59,53.13",
    }),
    region({
      id: "wild-trails",
      label: "Wild Trails",
      color: "#9fca66",
      labelX: 21,
      labelY: 67,
      // TODO:DELETE: weights: { tree: 9, rock: 3, foilage: 8, fireplace: 1 }
      objects: [
        { id: "object_tree_mainland", weight: 9 },
        { id: "object_stone_cluster", weight: 3 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "8.37,61.64 11.96,76.51 29.90,61.64 31.10,55.26 13.16,53.13",
    }),
    region({
      id: "fishermans-fall",
      label: "Fisherman's Fall",
      color: "#7fb6d6",
      labelX: 18,
      labelY: 85,
      mobs: ["Wolf", "Spider"],
      // TODO:DELETE: weights: { tree: 5, rock: 6, foilage: 7, fireplace: 1 }
      weights: { foilage: 7 },
      objects: [
        { id: "object_stone_cluster", weight: 6 },
        { id: "object_tree_mainland", weight: 5 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "23.92,93.52 11.96,76.51 29.90,61.64 33.49,76.51",
    }),
    region({
      id: "summer-heather",
      label: "Summer Heather",
      color: "#b58bd6",
      labelX: 37,
      labelY: 69,
      // TODO:DELETE: weights: { tree: 6, rock: 3, foilage: 12, fireplace: 1 }
      weights: { foilage: 12 },
      objects: [
        { id: "object_tree_mainland", weight: 6 },
        { id: "object_stone_cluster", weight: 3 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "29.90,61.64 43.06,53.13 46.65,74.39 33.49,76.51",
    }),
    region({
      id: "eldgrass-meadow",
      label: "Eldgrass Meadow",
      color: "#b4c46f",
      labelX: 39,
      labelY: 87,
      // TODO:DELETE: weights: { tree: 5, rock: 2, house: 1, foilage: 10, fireplace: 1 }
      weights: { foilage: 10 },
      objects: [
        { id: "object_tree_mainland", weight: 5 },
        { id: "object_stone_cluster", weight: 2 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "35.89,95.64 23.92,93.52 33.49,76.51 44.26,74.39 53.83,74.39 56.22,85.02 37.08,85.02",
    }),
    region({
      id: "rislen-valley",
      label: "Rislen Valley",
      color: "#9fca66",
      labelX: 38,
      labelY: 50,
      // TODO:DELETE: weights: { tree: 6, rock: 5, pillar: 1, foilage: 7 }
      weights: { foilage: 7 },
      objects: [
        { id: "object_tree_mainland", weight: 6 },
        { id: "object_stone_cluster", weight: 5 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "38.28,25.50 44.26,34.01 43.06,53.13 29.90,61.64 31.10,55.26 33.49,44.63",
    }),
    region({
      id: "bridge-over-rislen",
      label: "Bridge Over Rislen",
      color: "#d7a85b",
      labelX: 50,
      labelY: 41,
      // TODO:DELETE: weights: { tree: 4, rock: 4, ruin: 1, pillar: 2, foilage: 5, fireplace: 1 }
      weights: { foilage: 5 },
      objects: [
        { id: "object_tree_mainland", weight: 4 },
        { id: "object_stone_cluster", weight: 4 },
        { id: "object_pillar_stone", weight: 2 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "44.26,34.01 58.61,36.13 51.44,42.51 43.06,53.13",
    }),
    region({
      id: "siltmarsh",
      label: "Siltmarsh",
      color: "#7fb6d6",
      labelX: 73,
      labelY: 43,
      mobs: ["Spider", "Snake"],
      // TODO:DELETE: weights: { tree: 4, rock: 3, pillar: 1, foilage: 12 }
      weights: { foilage: 12 },
      objects: [
        { id: "object_tree_mainland", weight: 4 },
        { id: "object_stone_cluster", weight: 3 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "63.40,53.13 87.32,40.38 86.13,34.77 90.75,29.54 84.93,23.38 75.36,27.63 68.18,25.50 58.61,36.13",
    }),
    region({
      id: "castle-of-light",
      label: "Det Lyse Slot",
      color: "#f0d58a",
      labelX: 53,
      labelY: 60,
      mobs: ["Wolf", "Ghost"],
      // TODO:DELETE: weights: { tree: 12, rock: 4, pillar: 3, foilage: 10, fireplace: 1 }
      weights: { foilage: 10 },
      objects: [
        { id: "object_tree_mainland", weight: 12 },
        { id: "object_stone_cluster", weight: 4 },
        { id: "object_pillar_stone", weight: 3 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "51.44,42.51 58.61,36.13 63.40,53.13 64.59,65.89 66.99,70.14 53.83,74.39 46.65,74.39 43.06,53.13",
    }),
    region({
      id: "glimmering-spring",
      label: "Glimmering Spring",
      color: "#7fb6d6",
      labelX: 70,
      labelY: 87,
      // TODO:DELETE: weights: { tree: 5, rock: 5, pillar: 1, foilage: 9, fireplace: 1 }
      weights: { foilage: 9 },
      objects: [
        { id: "object_tree_mainland", weight: 5 },
        { id: "object_stone_cluster", weight: 5 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "62.20,93.52 86.12,93.52 92.11,89.27 66.99,70.14 53.83,74.39 56.22,85.02 63.40,85.02",
    }),
    region({
      id: "to-the-eternal-mountains",
      label: "To The Eternal Mountains",
      color: "#d7a85b",
      labelX: 95,
      labelY: 42,
      biodome: "rock",
      mobs: ["Skeleton", "Ghost"],
      // TODO:DELETE: weights: { tree: 1, rock: 10, pillar: 4, ruin: 2, foilage: 2, fireplace: 1 }
      weights: { foilage: 2 },
      objects: [
        { id: "object_stone_cluster", weight: 10 },
        { id: "object_pillar_stone", weight: 4 },
        { id: "object_ruin_mainland", weight: 2 },
        { id: "object_tree_rock", weight: 1 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "87.32,40.38 99.13,37.55 99.25,51.31 93.35,51.51",
    }),
    region({
      id: "ruin-of-forgetfulness",
      label: "Ruin Of Forgetfulness",
      color: "#a6a0a0",
      labelX: 86,
      labelY: 57,
      biodome: "rock",
      mobs: ["Skeleton", "Ghost"],
      // TODO:DELETE: weights: { tree: 2, rock: 7, ruin: 7, pillar: 5, foilage: 3, fireplace: 1 }
      weights: { foilage: 3 },
      objects: [
        { id: "object_stone_cluster", weight: 7 },
        { id: "object_ruin_mainland", weight: 7 },
        { id: "object_pillar_stone", weight: 5 },
        { id: "object_tree_rock", weight: 2 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "93.30,51.01 78.95,63.76 64.59,65.89 63.40,53.13 87.32,40.38",
    }),
    region({
      id: "heartwood",
      label: "Heartwood",
      color: "#7fb172",
      labelX: 84,
      labelY: 80,
      mobs: ["Wolf", "Spider", "Ghost"],
      // TODO:DELETE: weights: { tree: 12, rock: 4, ruin: 1, pillar: 1, foilage: 11, fireplace: 1 }
      weights: { foilage: 11 },
      objects: [
        { id: "object_tree_mainland", weight: 12 },
        { id: "object_stone_cluster", weight: 4 },
        { id: "object_house_mainland", weight: 1 },
        { id: "object_pillar_stone", weight: 1 },
        { id: "object_ruin_mainland", weight: 1 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "66.99,70.14 92.11,89.27 98.09,80.77 98.09,59.51 93.30,51.01 78.95,63.76 64.59,65.89",
    }),
  ],
};
