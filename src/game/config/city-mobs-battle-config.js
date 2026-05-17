/*
City mob battle map profiles.

These profiles are used only when a mob group on the city map is attacked.
They intentionally do not define mapSize; city mob level rules in
city-mobs-attack-config.js still decide the battle map size.

Asset fields use the same formats as map-region-config.js:
- tileset
- foliageSet / foliageSets
- objects
- decay
- weights
- antiDrops
*/

export const CITY_MOB_BATTLE_PROFILES = [
  {
    id: "city-nw-ruins",
    label: "City NW Ruins",
    spawnZoneIds: ["NW_SPAWN_BORDER", "NW_SPAWN_CORNER", "NW_SPAWN_BRIDGE", "NW_SPAWN_CLOSE"],
    tileset: [
      { fileName: "tileset/tileset_debris.png" },
      { fileName: "tileset/tileset_bricktiles.png" },
    ],
    foliageSet: [
      { fileName: "foilage/foilage_deadvillages.png", scale: 0.65 },
      { fileName: "foilage/foilage_boneparts.png", scale: 0.45 },
      { fileName: "foilage/foilage_garbage_001.png", scale: 0.55 },
    ],
    objects: [
      { id: "object_woodboxes_ground", weight: 6, destructible: true },
      { id: "object_barrels_ground", weight: 4, destructible: true },
      { id: "object_chests_ground", weight: 1, destructible: true },
      { id: "object_statue_mixed", weight: 1, destructible: false },
    ],
    decay: [
      { id: "decay_blood", weight: 8 },
      { id: "decay_cracks", weight: 6 },
      { id: "decay_dust", weight: 6 },
    ],
    weights: { foilage: 8 },
    mobs: ["Skeleton", "Ghost", "Demon"],
  },
  {
    id: "city-sw-fields",
    label: "City SW Fields",
    spawnZoneIds: ["SW_SPAWN_BORDER", "SW_SPAWN_BRIDGE", "SW_SPAWN_CLOSE", "W_SPAWN_EDGE"],
    tileset: [
      { fileName: "tileset/tileset_field.png" },
      { fileName: "tileset/tileset_grass.png" },
      { fileName: "tileset/tileset_debris.png" },
    ],
    foliageSet: [
      { fileName: "foilage/foilage_field.png" },
      { fileName: "foilage/foilage_bones.png", scale: 0.5 },
      { fileName: "foilage/foilage_deadanimal_small.png", scale: 0.45 },
    ],
    objects: [
      { id: "object_field", weight: 8, destructible: true },
      { id: "object_hay01", weight: 3, destructible: true },
      { id: "object_hay02", weight: 3, destructible: true },
      { id: "object_sacks_ground", weight: 2, destructible: true },
    ],
    decay: [
      { id: "decay_field", weight: 10 },
      { id: "decay_blood", weight: 4 },
      { id: "decay_cracks", weight: 2 },
    ],
    weights: { foilage: 9 },
    mobs: ["Wolf", "Wild Boar", "Skeleton"],
  },
  {
    id: "city-ne-flooded-road",
    label: "City NE Flooded Road",
    spawnZoneIds: ["NE_SPAWN_BORDER_UPPER", "NE_SPAWN_BORDER_LOWER", "NE_SPAWN_BRIDGE", "NE_SPAWN_CLOSE"],
    tileset: [
      { fileName: "tileset/tileset_swamp.png" },
      { fileName: "tileset/tileset_debris.png" },
    ],
    foliageSet: [
      { fileName: "foilage/foilage_roots.png" },
      { fileName: "foilage/foilage_mushrooms.png", scale: 0.65 },
      { fileName: "foilage/foilage_bones_001.png", scale: 0.45 },
    ],
    objects: [
      { id: "object_tree_lava", weight: 5, destructible: true },
      { id: "object_caves", weight: 1, destructible: false },
      { id: "object_wheelbarrel", weight: 2, destructible: true },
      { id: "object_barrels_ground", weight: 3, destructible: true },
    ],
    decay: [
      { id: "decay_spiderweb", weight: 7 },
      { id: "decay_dust", weight: 5 },
      { id: "decay_blood", weight: 3 },
    ],
    weights: { water: 2, foilage: 8 },
    mobs: ["Spider", "Snake", "Ghost"],
  },
  {
    id: "city-se-broken-stones",
    label: "City SE Broken Stones",
    spawnZoneIds: ["SE_SPAWN_BORDER", "SE_SPAWN_CORNER", "SE_SPAWN_BRIDGE", "SE_SPAWN_CLOSE"],
    tileset: [
      { fileName: "tileset/tileset_rock.png" },
      //{ fileName: "tileset/tileset_debriswithblood.png" },
    ],
    foliageSet: [
      { fileName: "foilage/foilage_smallstone.png" },
      { fileName: "foilage/foilage_plants_stone.png", scale: 0.55 },
      { fileName: "foilage/foilage_boneparts.png", scale: 0.45 },
    ],
    objects: [
      { id: "object_stone_cluster", weight: 8, destructible: true },
      { id: "object_pillar_stone", weight: 2, destructible: true },
      { id: "object_statue_troll", weight: 1, destructible: false },
      { id: "object_woodboxes_ground", weight: 2, destructible: true },
    ],
    decay: [
      { id: "decay_cracks", weight: 10 },
      { id: "decay_blood", weight: 5 },
      { id: "decay_dust", weight: 3 },
    ],
    weights: { foilage: 7 },
    mobs: ["Demon", "Skeleton", "Scorpion"],
  },
];

const CITY_MOB_BASE_SPAWN_COUNTS_BY_MAP_SIZE = {
  small: { objects: 12, foliage: 20, decals: 16, monsters: { min: 3, max: 6 }, water: 0 },
  medium: { objects: 15, foliage: 28, decals: 24, monsters: { min: 4, max: 9 }, water: 0 },
  large: { objects: 20, foliage: 36, decals: 30, monsters: { min: 6, max: 12 }, water: 0 },
  giga: { objects: 26, foliage: 46, decals: 36, monsters: { min: 8, max: 14 }, water: 0 },
};

function normalizeCount(value, fallback) {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, parsed);
}

function buildCityMobSpawnCounts(profile = {}, mapSize = "small") {
  const sizeKey = String(mapSize || "small").toLowerCase();
  const base = CITY_MOB_BASE_SPAWN_COUNTS_BY_MAP_SIZE[sizeKey] ?? CITY_MOB_BASE_SPAWN_COUNTS_BY_MAP_SIZE.small;
  const input = (profile.spawnCounts && typeof profile.spawnCounts === "object") ? profile.spawnCounts : {};
  const monsterInput = (input.monsters && typeof input.monsters === "object") ? input.monsters : {};
  const legacyWeights = (profile.weights && typeof profile.weights === "object") ? profile.weights : {};
  const weightedFoliage = legacyWeights.foilage === undefined
    ? base.foliage
    : Math.round(base.foliage * Math.min(2.4, Math.max(0, Number(legacyWeights.foilage) || 0) / 8));

  return {
    objects: normalizeCount(input.objects, base.objects),
    foliage: normalizeCount(input.foliage ?? input.foilage, weightedFoliage),
    decals: normalizeCount(input.decals ?? input.decay, base.decals),
    monsters: {
      min: normalizeCount(monsterInput.min, base.monsters.min),
      max: normalizeCount(monsterInput.max, base.monsters.max),
    },
    water: normalizeCount(input.water, normalizeCount(legacyWeights.water, base.water)),
  };
}

function normalizeMobEntries(mobs = []) {
  if (!Array.isArray(mobs)) return [];
  return mobs
    .map((mob) => (
      typeof mob === "string"
        ? { type: mob, weight: 1 }
        : { type: String(mob?.type ?? "").trim(), weight: Math.max(0, Number(mob?.weight) || 1) }
    ))
    .filter((mob) => mob.type);
}

export function profileMatchesCitySpawnZone(profile, areaId) {
  const areaIds = Array.isArray(profile?.spawnZoneIds)
    ? profile.spawnZoneIds
    : Array.isArray(profile?.spawnZones)
      ? profile.spawnZones
      : [profile?.spawnZoneId ?? profile?.spawnZone].filter(Boolean);
  return areaIds.map(String).includes(String(areaId));
}

export function cityMobBattleProfilesForArea(areaId) {
  return CITY_MOB_BATTLE_PROFILES.filter((profile) => profileMatchesCitySpawnZone(profile, areaId));
}

export function buildCityMobBattleRegion(profile, { areaId, mobType, mapSize }) {
  if (!profile?.id || !mobType) return null;
  const spawnCounts = buildCityMobSpawnCounts(profile, mapSize);
  const extraMobs = normalizeMobEntries(profile.mobs)
    .filter((mob) => mob.type.toLowerCase() !== String(mobType).toLowerCase());
  const extraTotal = extraMobs.reduce((sum, mob) => sum + mob.weight, 0);
  const weightedExtraMobs = extraTotal > 0
    ? extraMobs.map((mob) => ({ type: mob.type, weight: (mob.weight / extraTotal) * 10 }))
    : [];

  return {
    ...profile,
    id: `citymob:${profile.id}`,
    label: profile.label ?? profile.id,
    citySpawnZoneId: areaId,
    mapSize,
    spawnCounts,
    mobs: [
      { type: String(mobType), weight: 90 },
      ...weightedExtraMobs,
    ],
  };
}
