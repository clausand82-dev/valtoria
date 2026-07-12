import { createVillageOutskirtsMapRegions } from "./map-region/village-outskirts.js";

const AREA_MAP_VIEW = {
  aspect: "1672 / 941",
  maxWidth: "1180px",
};

const DEFAULT_TILESET = { fileName: "tileset/tileset_grass.png" };
const DEFAULT_WATER = [{ fileName: "tileset/tileset_water.png", weight: 1 }];
const DEFAULT_SPAWN_COUNTS = {
  objects: 15,
  foliage: 28,
  decals: 24,
  monsters: { min: 8, max: 12 },
  water: 0,
};

export const ambientCritterDefaults = {
  enabled: true,
  maxAlivePerRegion: 20,
  maxPerType: 10,
  collision: false,
  hostile: false,
  canBeTargeted: false,
  givesXp: false,
  dropsLoot: false,
  persist: false,
  offscreenUpdate: false,
  offscreenRender: false,
};

export const WORLD_MAP = {
  id: "world",
  title: "World map",
  subtitle: "Elvindalen and surrounding areas",
  i18n: { da: { title: "Verdenskort", subtitle: "Elvindalen og omkringliggende omraader" } },
  imageUrl: "/assets/generated/map/map_worldmap_elvindale_v2.png",
  ...AREA_MAP_VIEW,
};

export const AREA_MAPS = {
  "sea-serpent": {
    ...AREA_MAP_VIEW,
    title: "Sea Serpent",
    subtitle: "Waters of the sea serpent",
    i18n: { da: { title: "Soslangen", subtitle: "Soslangens farvande" } },
    imageUrl: "/assets/generated/map/map_seasnake_v2.png",
  },
  "leviathans-waters": {
    ...AREA_MAP_VIEW,
    title: "Leviathan Waters",
    subtitle: "Deep leviathan waters",
    i18n: { da: { title: "Leviathans Farvand", subtitle: "Leviathanernes dybe farvande" } },
    imageUrl: "/assets/generated/map/map_leviathanswater_v2.png",
  },
  vortexen: {
    ...AREA_MAP_VIEW,
    title: "The Vortex",
    subtitle: "The spinning waters",
    i18n: { da: { title: "Vortexen", subtitle: "De hvirvlende vande" } },
    imageUrl: "/assets/generated/map/map_vortexen_v2.png",
  },
  "kraken-waters": {
    ...AREA_MAP_VIEW,
    title: "Kraken Waters",
    subtitle: "Kraken hunting grounds",
    i18n: { da: { title: "Tentakelfarvand", subtitle: "Krakens jagtmarker" } },
    imageUrl: "/assets/generated/map/map_krakenwaters_v2.png",
  },
  elvindale: {
    ...AREA_MAP_VIEW,
    title: "Elvindalen",
    subtitle: "Forest region",
    i18n: { da: { subtitle: "Skovregion" } },
    imageUrl: "/assets/generated/map/map_elvindale_v2.png",
  },
  "village-outskirts": {
    ...AREA_MAP_VIEW,
    title: "Village Outskirts",
    subtitle: "Fields and roads around the village",
    i18n: { da: { title: "Landsbyudkanten", subtitle: "Marker og veje omkring landsbyen" } },
    imageUrl: "/assets/generated/map/map_villageoutskirts_v2.png",
  },
  nethrendor: {
    ...AREA_MAP_VIEW,
    title: "Nethrendor",
    subtitle: "Eastern forest region",
    i18n: { da: { subtitle: "Oestlig skovregion" } },
    imageUrl: "/assets/generated/map/map_nethrendor_v2.png",
  },
  swampfield: {
    ...AREA_MAP_VIEW,
    title: "Swampfield",
    subtitle: "Mushroom marshes",
    i18n: { da: { title: "Sumpmark", subtitle: "Svampemoser" } },
    imageUrl: "/assets/generated/map/map_swampfield_v2.png",
  },
  "life-tree": {
    ...AREA_MAP_VIEW,
    title: "The Life Tree",
    subtitle: "The ancient life tree",
    i18n: { da: { title: "Livstraeet", subtitle: "Det gamle livstrae" } },
    imageUrl: "/assets/generated/map/map_treeoflife_v2.png",
  },
  eldiria: {
    ...AREA_MAP_VIEW,
    title: "Eldiria",
    subtitle: "Fertile plains and forests",
    i18n: { da: { subtitle: "Frodige sletter og skove" } },
    imageUrl: "/assets/generated/map/map_eldiria_v2.png",
  },
  tornvalhed: {
    ...AREA_MAP_VIEW,
    title: "Tornvalhed",
    subtitle: "Troll island",
    i18n: { da: { subtitle: "Troldeoe" } },
    imageUrl: "/assets/generated/map/map_tornvalhed_v2.png",
  },
  "sunk-city": {
    ...AREA_MAP_VIEW,
    title: "Sunk City",
    subtitle: "The drowned city",
    i18n: { da: { title: "Den sunkne by", subtitle: "Den druknede by" } },
    imageUrl: "/assets/generated/map/map_sunkcity_v2.png",
  },
  sunkcity: {
    ...AREA_MAP_VIEW,
    title: "Sunk City",
    subtitle: "The drowned city",
    i18n: { da: { title: "Den sunkne by", subtitle: "Den druknede by" } },
    imageUrl: "/assets/generated/map/map_sunkcity_v2.png",
  },
  "eternal-mountains": {
    ...AREA_MAP_VIEW,
    title: "The Eternal Mountains",
    subtitle: "Frozen mountain range",
    i18n: { da: { title: "De Evige Bjerge", subtitle: "Frossen bjergkaede" } },
    imageUrl: "/assets/generated/map/map_eternalmountains_v2.png",
  },
};

/*
Region parameter guide:

Example region with old and conditional formats:

region({
  id: "example-copse",                                      // Unique stable id. Used for region worldState keys and saved corruption.
  label: "Example Copse",                                  // Display name shown on maps and run UI.
  points: "12,20 28,18 31,35 15,39",                       // SVG polygon points in percent coordinates for map click/hover.
  labelX: 21,                                               // Map label x position in percent.
  labelY: 28,                                               // Map label y position in percent.
  color: "#5f8f5f",                                         // World-map polygon color. Area maps still tint corrupted/cleared red/green.
  targetMapId: "elvindale",                                // Optional world-map navigation target. Omit to use region id.
  unlock: { completedQuests: ["first_hunt"], army: 10 },    // Optional map access requirements. locked/text/requiredArmy are also supported.

  corrupted: true,                                          // Default starting corruption. Existing regionCorruption save still controls current state.
  cityStats: { population: 5 },                             // Region city stat impact at corruptionLevel 0.
  mapSize: "medium",                                        // small, medium, large, or giga.

  tileset: ["tileset/tileset_grass.png"],                   // Old format: fixed tileset list.
  tileset: {                                                // New format: conditional field.
    value: ["tileset/tileset_grass.png"],                   // Default value when no variant matches.
    variants: [
      {
        requires: { flag: "region.example-copse.corrupted" }, // First matching variant wins.
        value: ["tileset/tileset_swamp.png"],               // value replaces the whole default field.
      },
      {
        requires: { counter: "region.example-copse.visits", gte: 3 }, // Counter condition.
        patch: [{ fileName: "tileset/tileset_grass.png", x: 2, y: 2 }], // patch merges by fileName for tilesets.
      },
    ],
  },

  water: [{ fileName: "tileset/tileset_water.png", weight: 1, x: [1, 2], y: [1, 3] }], // Water tiles. Water only appears when spawnCounts.water > 0.

  foliageSet: [                                            // Old format: fixed foliage sheets.
    { fileName: "foilage/foilage_plants_mainland.png", lootTables: { wood_piece: 0.02 } }, // lootTables is chance per placed foliage.
    { fileName: "foilage/foilage_roots.png", scale: 0.75 }, // fileName is the patch key for foliageSet.
  ],
  foliageSet: {                                             // New format: conditional foliage.
    value: [
      { fileName: "foilage/foilage_plants_mainland.png", lootTables: { wood_piece: 0.02 } }, // Default foliage entry.
      { fileName: "foilage/foilage_roots.png", scale: 0.75, lootTables: { bonedust: 0.05 } }, // rows/cols/particles/depthMode also supported.
    ],
    variants: [
      {
        requires: { flag: "region.example-copse.corrupted" }, // Only applies while corrupted flag is true.
        patch: [
          { fileName: "foilage/foilage_roots.png", scale: 1.1, lootTables: { bonedust: 0.15 } }, // Deep-merges into matching default entry.
          { fileName: "foilage/foilage_deadanimal_small.png", particles: { type: "flies", chance: 0.75 } }, // Adds entry if fileName is new.
        ],
      },
    ],
  },

  objects: [                                                // Object ids come from region-object-config.js.
    { id: "object_tree_mainland", weight: 8, destructible: true }, // weight is relative spawn chance.
    { id: "object_house_mainland", weight: 2, variant: 5 }, // variant fixes the zero-based spritesheet cell; omit it for random selection.
    { id: "object_woodboxes_ground", weight: 2, scale: { min: 0.8, max: 1.2 } }, // scale supports number, fixed, min/max.
    { id: "object_purified_totem", weight: 1, destructible: true, destroyRewards: { lydra: 1, netdra: 0.1 } }, // destroyRewards adds raw world energy points when destroyed.
    { id: "object_bones", weight: 2, worldBalanceNetdra: { min: 10, max: 20 } }, // percentage condition: spawn only while Net'dra'thot is 10-20%.
    { id: "object_house_mainland", weight: 1, effects: { chimneySmoke: false, lanternGlow: true, windowGlow: { enabled: true, onlyAtNight: true } } }, // effects only enable/disable/settings attached socket effects; socket coordinates live in object-sockets-config.js.
    // spawnDamage supports: "all", "damaged", "destroyed", "damaged_destroyed". Omit for undamaged.
    // spawnTags/spawnAvoidRadius mark an influence zone; avoidSpawnTags avoids matching zones; foregroundFade fades objects in front of player/mobs/loot.
    // Missing sockets skip silently. socketPrefix effects can spawn once per matching socket, for example lanternA and lanternB.
  ],

  decay: [                                                  // Decal/decay ids come from decay-config.js.
    { id: "decay_spiderweb", weight: 2, x: [1, 2, 4], y: [1, 2] }, // x/y select 1-based cells in the 4x4 decay sheet.
  ],

  ambient: {                                                // Visual-only atmosphere.
    particles: [{ type: "fireflies", density: 0.14, area: "wholeMap", chance: 1 }], // Particle types come from particle-presets.js.
  },

  weather: {                                                // Visual-only weather.
    possible: [
      { id: "none", weight: 60 },                           // Weighted stable roll for the generated map.
      { id: "light_rain", weight: 25 },                     // active: "light_rain" can be used for fixed weather.
      { id: "fog", weight: 15 },
    ],
  },

  prefabRules: {                                            // Prefabs come from map-prefab-config.js.
    maxTotal: 2,                                            // Maximum prefab instances for the region.
    minDistanceBetweenPrefabs: 8,                            // Minimum distance between prefab anchors.
    anchors: ["clearing", "room"],                          // Allowed layout anchors.
    pool: [{ id: "old_well_clearing", weight: 4, max: 2 }], // pool patching uses id.
  },

  mobs: [{ type: "Wolf", weight: 3 }, { type: "WolfCub", weight: 1 }], // Old format: fixed mob pool. Strings also work.
  mobs: [                                                   // Entry-level shorthand conditions are filtered before weighted mob roll.
    { type: "Rat", weight: 5, questCompleted: "check_inn_infestation" },
    { type: "SickRat", weight: 2, blockedBy: { questCompleted: "check_inn_infestation" } },
    { type: "MiniSpider", weight: 3 },
  ],
  mobs: {                                                   // New format: conditional mob pool.
    value: [{ type: "Wolf", weight: 3 }, { type: "WolfCub", weight: 1 }], // Default mob pool.
    variants: [
      {
        requires: { all: [                                  // all means every nested condition must pass.
          { flag: "region.example-copse.cleared" },         // Flag must be true.
          { not: { flag: "mob.Skeleton.seen" } },           // not means the nested condition must fail.
        ] },
        patch: [{ type: "Wolf", weight: 1 }, { type: "WolfFenris", weight: 0.5 }], // patch merges by id/type for mobs.
      },
      {
        blockedBy: { flag: "region.example-copse.cleared" }, // blockedBy removes this variant when the condition is true.
        value: [{ type: "Skeleton", weight: 2 }],           // value replaces the whole mob pool.
      },
    ],
  },

  rareMobs: [                                               // Rare instance layer checked before specialSpawn and weighted mobs.
    {
      id: "rare_cursed_wolf",                             // Stable encounter id used for per-region spawn limits.
      type: "Wolf",                                       // Monster type from monster-config.js. Use a dedicated type there for combat-stat changes.
      chance: 0.04,                                        // Per monster-slot spawn attempt chance. Defaults to 0 when omitted.
      maxPerRegion: 1,                                     // Numeric max for this rare mob in the region.
      displayName: "Den Forbandede Ulv",                  // Optional runtime name override for UI/snapshot text.
      namePrefix: "Den",                                  // Optional prefix/suffix around displayName (or base monster name).
      nameSuffix: "af Elvindale",
      levelOffset: 2,                                       // Optional level offset for this rare instance.
      scale: 1.15,                                          // Optional visual scale multiplier for this rare instance.
      tint: "#7cc8ff",                                    // Optional color tint override for this rare instance.
      quest: "find_cursed_fang",                          // Shorthand conditions work directly on the rare mob entry.
      corruption: { min: 5 },
      loot: {
        mode: "add",                                      // add = normal monster loot plus rare loot. override = rare loot only.
        resources: [
          { resource: "bonedust", min: 1, max: 1, chance: 1, questItem: true, quest: "find_cursed_fang" },
        ],
        items: [
          { itemId: "iron_sword", chance: 0.1 },          // Common gear can target generated item names/base names.
        ],
        named: [
          { itemId: "nethrendor_soldier_sword", chance: 0.25 },
        ],
        uniques: [
          { itemId: "blade_of_the_pulse", chance: 0.02 },
        ],
      },
    },
  ],

  spawnCounts: {                                            // Per chunk spawn counts.
    objects: 15,                                            // Regular objects.
    foliage: 28,                                            // Foliage placements.
    decals: 24,                                             // Decay/decal placements.
    water: 0,                                               // Lake-like water patches. 0 disables water.
    monsters: { min: 8, max: 12 },                          // Monster count range.
  },

  eliteSpawns: {                                            // Optional conditions for elite conversion in this region.
    blockedBy: { questActive: "quest_id" },                  // Ordinary mobs still spawn while elite conversion is blocked.
  },

  antiDrops: {                                              // Region drop blacklist.
    resources: ["magic_essence"],                           // Blocks resource ids.
    categories: ["weapon"],                                 // Blocks loot categories.
    rarities: ["rare"],                                     // Blocks rare and all higher rarities.
    allPotions: true,                                       // Also supports allItems/allResources/allUniques/allNamed/allQuestItems/allReadables.
  },
})

Conditional config notes:
- Old values still work unchanged. Only objects with { value, variants } use worldState resolution.
- variants are checked in order; the first matching variant wins.
- variant.value replaces the whole field.
- variant.patch merges into the default field. Lists merge by id/type/fileName depending on field.
- variant.patch merges into the default field. Lists merge by id/type/fileName depending on field, including rareMobs by id/type.
- requires must pass. blockedBy must not pass.
- Supported conditions include { flag }, { counter, gte/gt/lte/lt/equals }, { all }, { any }, and { not }.
- { value, equals/notEquals/in } and { stat, gte/... } are supported inside requires/conditions. Prefer wrapper syntax for these because "value" is also used by conditional field configs.
- World energy balance is available as shorthand conditions anywhere this condition system is used:
  worldBalanceLydra: 30 means Ly'dra'thot percentage >= 30.
  worldBalanceNetdra: { min: 10, max: 20 } means Net'dra'thot percentage between 10 and 20.
  These use percent balance, not raw points.
- Automatic worldState currently tracks region.{id}.unlocked/explored/corrupted, region.{id}.visits, region.{id}.cleared on return, and mob.{typeName}.seen on hover/combat.

Region audio supports all three forms without changing ambience sound-id lists:
audio: { musicProfile: "forest", ambience: ["forest_ambience"] }, // Direct object.
audio: { value: { musicProfile: "forest" }, variants: [{ corruption: { min: 5 }, value: { musicProfile: "forest_corrupted" } }] }, // Existing conditional value/variants form.
audio: [ // Shorthand entries are checked top to bottom; the first matching entry wins.
  { musicProfile: "forest_corrupted", ambience: ["dark_forest_ambience"], corruption: { min: 5 } },
  { musicProfile: "forest", ambience: ["forest_ambience"] }, // No conditions: unconditional fallback.
]
- Only the top-level region.audio array is shorthand-conditioned. ambience: ["forest_ambience", "river_ambience"] remains a normal sound-id list.

Shorthand conditions:
- List entries can add simple condition tags directly. Multiple tags on the same entry are AND.
- Direct all/any/not also works on entries, for example { id: "x", all: [{ flag: "a" }, { notFlag: "b" }] }.
- Direct shorthand and requires must both pass. blockedBy always removes the entry when it matches.
- requires is still the recommended syntax for advanced all/any/not groups, and it also understands shorthand scopes.
- corruption reads region.{id}.corruptionLevel from worldState values/counters first, then regionConfig.corruptionLevel, then falls back to region.{id}.corrupted where true means 10 and false means 0.
- corruption: 5 means exactly 5. corruption: { min: 5 } means 5 or higher. Numeric checks support min/max/equals/gt/gte/lt/lte.
- visited: 1 is treated as visits >= 1. visited: { min: 1 } is preferred.
- cityStorage and cityInventory use the same item counting shape; if the engine has not split them yet, they may be passed as aliases.
- tileset strings are still valid. Object-form tilesets can use id (preferred) or fileName, plus weight and shorthand conditions.
- rareMobs supports the same value/variants pattern as mobs when you need region-wide conditional rare encounter lists.
- rareMobs entries and nested rare loot lines both support shorthand conditions plus requires/conditions/blockedBy.
- eliteSpawns supports the same requires/conditions/blockedBy syntax and controls elite conversion without removing ordinary mobs.
- rareMobs is a lightweight instance layer, not a full monster definition. Allowed instance overrides include displayName, namePrefix, nameSuffix, levelOffset, scale, and tint.
- combat-stat changes should be made in monster-config.js by creating a dedicated monster type and referencing it via rareMobs.type.
- rare loot mode "add" keeps normal monster loot and appends rare loot. "override" skips normal monster loot entirely.
- rare loot uniques are unique-rarity drops, not one-per-save collectibles.

Recommended shorthand syntax:
objects: [
  { id: "object_tree", weight: 5, variant: 5 }, // zero-based fixed spritesheet cell.
  { id: "object_cursed_tree", weight: 2, corruption: { min: 6 } },
  { id: "object_woodboxes_ground", weight: 15, destructible: true, spawnDamage: "all", worldBalanceLydra: 30 },
  { id: "object_bones", weight: 5, destructible: true, worldBalanceNetdra: { min: 10, max: 20 } },
  { id: "object_quest_note", weight: 1, quest: "quest_lord_kealand" },
]

weather: {
  possible: [
    { id: "none", weight: 50 },
    { id: "fog", weight: 10, visited: { min: 1 } },
    { id: "black_rain", weight: 5, corruption: { min: 7 } },
  ],
}

tileset: [
  "tileset/grass.png",
  { id: "tileset/corrupt_grass.png", weight: 2, corruption: { min: 5 } },
]

Any extra fields passed to region({...}) are preserved on the region object for later use.
*/
function normalizeMobs(mobs) {
  if (!Array.isArray(mobs)) return mobs;
  return mobs
    .map((m) => {
      if (typeof m === "string") return { type: m, weight: 1 };
      if (!m || typeof m !== "object" || Array.isArray(m)) return null;
      return {
        ...m,
        type: String(m.type ?? m.typeName ?? "").trim(),
        weight: Number(m.weight) || 1,
      };
    })
    .filter((entry) => entry?.type);
}

function normalizeLootTableRefs(value) {
  const entries = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(entries.map((entry) => String(entry ?? "").trim()).filter(Boolean))];
}

function normalizeRareMobEntry(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
  const normalizedType = String(entry.type ?? entry.typeName ?? "").trim();
  if (!normalizedType) return null;
  const normalized = {
    ...entry,
    type: normalizedType,
    chance: Math.max(0, Number(entry.chance) || 0),
    lootMode: entry.lootMode === "override" ? "override" : "add",
    lootTables: normalizeLootTableRefs(entry.lootTables ?? entry.lootTable),
  };
  // rareMobs is an instance layer only. Combat/stat changes should be made on a dedicated monster type.
  const blockedMonsterDefinitionFields = [
    "hp", "maxHp", "maxMana", "damage", "damageMin", "damageMax", "armor", "speed", "range",
    "magic", "critChance", "critDamage", "blockChance", "dodgeChance", "allResist",
    "physicalResist", "fireResist", "iceResist", "lightningResist", "poisonResist",
    "arcaneResist", "holyResist", "shadowResist", "natureResist",
    "spells", "onHitStatus", "leapAttack", "attackCooldown", "attackCooldownConfig", "meleeAreaDamage",
    "aggro", "xp", "killLydra", "killNetdra", "eliteKillLydra", "eliteKillNetdra", "allowElite", "isBoss",
    "boss", "noLoot", "despawnOnDeath", "haveMinion", "minions", "minionCooldown", "isMinion", "minionOwnerId",
    "loot",
  ];
  for (const key of blockedMonsterDefinitionFields) delete normalized[key];
  if (entry.maxPerRegion !== undefined) {
    const maxPerRegion = Math.max(0, Math.round(Number(entry.maxPerRegion) || 0));
    normalized.maxPerRegion = maxPerRegion;
  }
  if (entry.uniquePerRegion !== undefined) normalized.uniquePerRegion = Boolean(entry.uniquePerRegion);
  if (entry.displayName !== undefined) normalized.displayName = String(entry.displayName);
  if (entry.namePrefix !== undefined) normalized.namePrefix = String(entry.namePrefix);
  if (entry.nameSuffix !== undefined) normalized.nameSuffix = String(entry.nameSuffix);
  if (entry.levelOffset !== undefined) {
    const levelOffset = Number(entry.levelOffset);
    if (Number.isFinite(levelOffset)) normalized.levelOffset = Math.round(levelOffset);
  }
  if (entry.scale !== undefined) {
    const scale = Number(entry.scale);
    if (Number.isFinite(scale) && scale > 0) normalized.scale = scale;
  }
  if (entry.tint !== undefined) normalized.tint = String(entry.tint);
  if (entry.id !== undefined) normalized.id = String(entry.id);
  return normalized;
}

function normalizeConditionalRareMobs(value) {
  if (!isConditionalConfig(value)) return normalizeRareMobs(value);
  return {
    ...value,
    value: normalizeRareMobs(value.value),
    variants: value.variants.map((variant) => {
      if (!variant || typeof variant !== "object" || Array.isArray(variant)) return variant;
      const normalized = { ...variant };
      if (Object.prototype.hasOwnProperty.call(variant, "value")) normalized.value = normalizeRareMobs(variant.value);
      if (Object.prototype.hasOwnProperty.call(variant, "patch")) normalized.patch = normalizeRareMobs(variant.patch);
      return normalized;
    }),
  };
}

function normalizeRareMobs(rareMobs) {
  if (!Array.isArray(rareMobs)) return rareMobs;
  return rareMobs.map((entry) => normalizeRareMobEntry(entry)).filter(Boolean);
}

function normalizeCount(value, fallback) {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, parsed);
}

function normalizeSpawnCounts(input = {}, weights = {}) {
  const weightedFoliage = weights.foilage === undefined
    ? DEFAULT_SPAWN_COUNTS.foliage
    : Math.round(DEFAULT_SPAWN_COUNTS.foliage * Math.min(2.4, Math.max(0, Number(weights.foilage) || 0) / 8));
  const monsterInput = input.monsters && typeof input.monsters === "object" ? input.monsters : {};
  return {
    objects: normalizeCount(input.objects, DEFAULT_SPAWN_COUNTS.objects),
    foliage: normalizeCount(input.foliage ?? input.foilage, weightedFoliage),
    decals: normalizeCount(input.decals ?? input.decay, DEFAULT_SPAWN_COUNTS.decals),
    monsters: {
      min: normalizeCount(monsterInput.min, DEFAULT_SPAWN_COUNTS.monsters.min),
      max: normalizeCount(monsterInput.max, DEFAULT_SPAWN_COUNTS.monsters.max),
    },
    water: normalizeCount(input.water, normalizeCount(weights.water, DEFAULT_SPAWN_COUNTS.water)),
  };
}

function isConditionalConfig(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && Array.isArray(value.variants) && Object.prototype.hasOwnProperty.call(value, "value"));
}

function region({ mobs = ["Wolf", "Spider"], rareMobs = [], mapSize = "medium", weights = {}, spawnCounts = {}, water, antiDrops = {}, corrupted = true, ...regionConfig }) {
  const normalizedSpawnCounts = normalizeSpawnCounts(spawnCounts, weights);
  const conditionalSpawnCounts = isConditionalConfig(spawnCounts);
  return {
    corrupted,
    mapSize,
    tileset: regionConfig.tileset ?? DEFAULT_TILESET,
    water: water ?? (conditionalSpawnCounts || normalizedSpawnCounts.water > 0 ? DEFAULT_WATER : undefined),
    spawnCounts: conditionalSpawnCounts ? spawnCounts : normalizedSpawnCounts,
    mobs: normalizeMobs(mobs),
    rareMobs: normalizeConditionalRareMobs(rareMobs),
    antiDrops: {
      items: [],
      resources: [],
      uniques: [],
      named: [],
      categories: [],
      ...antiDrops,
    },
    ambientCritterDefaults,
    ...regionConfig,
  };
}

export const MAP_REGION_SETS = {
  world: [
    /*FOR EXPANSION
    region({
      id: "sea-serpent",
      label: "Soslangen",
      color: "#5f94ad",
      unlock: { locked: true, text: "Soslangen kraever en senere historiequest." },
      labelX: 11.44,
      labelY: 27.47,
      mobs: ["Snake", "Ghost", "Scorpion", { type: "Spawn of Hydre", weight: 0.8 }],
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
      mobs: ["Snake", "Ghost", "Scorpion", { type: "Spawn of Hydre", weight: 0.8 }],
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
      mobs: ["Ghost", "Demon", { type: "Infernus Minion", weight: 1.2 }],
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
      mobs: ["Snake", "Demon", "Ghost", { type: "Spawn of Hydre", weight: 0.7 }, { type: "Infernus Minion", weight: 0.8 }],
      // TODO:DELETE: weights: { tree: 0, house: 0, foilage: 1, rock: 5, ruin: 2, pillar: 3, water: 22 }
      weights: { foilage: 1, water: 22 },
      objects: [
        { id: "object_stone_cluster", weight: 5 },
        { id: "object_pillar_stone", weight: 3 },
        { id: "object_ruin_mainland", weight: 2 },
        { id: "object_fireplace_mainland", weight: 1 },
      ],
      points: "75.36,36.13 78.95,40.38 83.73,40.38 96.89,21.25 92.11,10.63 83.73,2.13 82.54,14.88 81.34,19.13 81.34,23.38",
    }),*/
    region({
      id: "village-outskirts",
      label: "Village on the Edge of Elvindale",
      i18n: { da: { label: "Landsby Ved Elvindalens Udkant" } },
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
      label: "Elvindale",
      i18n: { da: { label: "Elvindalen" } },
      color: "#9fca66",
      unlock: { locked: true, text: "Nethrendor requires a later story quest.", i18n: { da: { text: "Nethrendor kraever en senere historiequest." } } },
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
      i18n: { da: { label: "Nethrendor" } },
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
      i18n: { da: { label: "Sumpmark" } },
      color: "#b58bd6",
      unlock: { locked: true, text: "Swampfield requires a later story quest.", i18n: { da: { text: "Sumpmark kraever en senere historiequest." } } },
      labelX: 58.53,
      labelY: 62.17,
      ambient: {
        particles: [
          { type: "fogWisps", density: 0.16, area: "wholeMap", chance: 1 },
        ],
      },
      weather: {
        possible: [
          { id: "none", weight: 45 },
          { id: "fog", weight: 35 },
          { id: "light_rain", weight: 20 },
        ],
      },
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
    /*FOR EXPANSION
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
    }),*/
    region({
      id: "tornvalhed",
      label: "Tornvalhed",
      i18n: { da: { label: "Tornvalhed" } },
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
      i18n: { da: { label: "Den sunkne by" } },
      color: "#7fb6d6",
      unlock: { locked: true, text: "Sunk City requires a later story quest.", i18n: { da: { text: "Den sunkne by kraever en senere historiequest." } } },
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
    /*FOR EXPANSION
    region({
      id: "eternal-mountains",
      label: "De Evige Bjerge",
      color: "#a6a0a0",
      mobs: ["Skeleton", "Ghost", { type: "Icebear", weight: 1.4 }, { type: "Bear", weight: 0.8 }, { type: "MountainTroll", weight: 1 }, { type: "GiantTroll", weight: 0.25 }],
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
    }),*/
  ],
  ...createVillageOutskirtsMapRegions(region),
  
  
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
      layout: {
        pool: [
          { id: "linear_path", weight: 4 },
          { id: "forked_path", weight: 3 },
          { id: "central_clearing", weight: 2 },
        ],
      },
      prefabRules: {
        maxTotal: 4,
        minDistanceBetweenPrefabs: 8,
        anchors: ["room", "pathSide", "clearing"],
        pool: [
          { id: "small_camp", weight: 4, max: 2 },
          { id: "broken_wagon_ambush", weight: 3, max: 1 },
          { id: "ruined_shrine", weight: 2, max: 1 },
          { id: "spider_nest", weight: 2, max: 1 },
        ],
      },
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
      mobs: ["Spider", "Snake", { type: "Rat", weight: 1.5 }, { type: "SickRat", weight: 2.5 }],
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
      mobs: ["Skeleton", "Ghost", { type: "Icebear", weight: 1.1 }, { type: "Bear", weight: 0.6 }],
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
