// ============================================================
// CITY MOBS ATTACK CONFIG
// Alle regler for threat meter, mob spawn og angreb på by.
// ============================================================

// --- Threat meter stigning ved dødsfald (baseret på XP pct mod næste level) ---
// Tjekkes nedefra: første bracket der matcher bruges.
export const CITY_THREAT_RISE_ON_DEATH = [
  { maxXpPct: 0.25, min: 10, max: 15 }, // Under 25% af vejen til næste level
  { maxXpPct: 0.50, min: 5, max: 10 },  // 25%–49%
  { default: true, min: 2, max: 5 },    // 50%+ (tæt på næste level)
];

// --- Threat meter fald ved gennemførelse af map (baseret på map størrelse) ---
export const CITY_THREAT_FALL_MAP_SIZE = {
  small:  { min: 0, max: 15 },
  medium: { min: 0, max: 25 },
  large:  { min: 0, max: 35 },
  giga:   { min: 0, max: 65 },
};

// --- Tærskel og spawn chance ---
export const CITY_THREAT_SPAWN_THRESHOLD = 90;   // % hvorfra spawn kan ske
export const CITY_THREAT_SPAWN_BASE_CHANCE = 10; // % chance ved præcis 90
export const CITY_THREAT_SPAWN_CHANCE_PER_PCT = 5; // % ekstra per % over 90

export const CITY_STAT_THREAT_DELTA_MIN = -5;
export const CITY_STAT_THREAT_DELTA_MAX = 8;
export const CITY_STAT_THREAT_WEIGHTS = {
  corruption: 1.5,
  provisionShortage: 3,
  provisionSurplus: -0.8,
  waterShortage: 3.5,
  waterSurplus: -1,
  healthLow: 2,
  healthHigh: -1,
  housingShortage: 2.5,
  housingSurplus: -0.7,
  popularityLow: 2,
  popularityHigh: -1.2,
  defenseLow: 2,
  defenseHigh: -1,
  maintenanceLow: 1.5,
  maintenanceHigh: -0.7,
};

// --- Tilgængelige mobs i city mode ---
// type svarer til monster typeName i GameEngine
export const CITY_MOB_POOL = [
  { type: "Peasant", weight: 4, miniIcon: "/assets/generated/mini/mini_peasant.png" },
  { type: "Knight", weight: 3, miniIcon: "/assets/generated/mini/mini_knight.png" },
  { type: "Demon",    weight: 3, miniIcon: "/assets/generated/mini/mini_demon.png" },
  { type: "Skeleton", weight: 5, miniIcon: "/assets/generated/mini/mini_skeleton.png" },
  { type: "Wolf", weight: 6, miniIcon: "/assets/generated/mini/mini_wolf.png" },
  { type: "Spider", weight: 6, miniIcon: "/assets/generated/mini/mini_spider.png" },
];

// --- Mob level regler ---
// densityMultiplier ganges med normal mob count på det givne map
// spreadChance er sandsynlighed (0–1) for at mob spreder sig ved besøg
export const CITY_MOB_LEVELS = {
  1: { mapSize: "small",  densityMultiplier: 1.0,  spreadChance: 0 },
  2: { mapSize: "small",  densityMultiplier: 1.75, spreadChance: 0 },
  3: { mapSize: "medium", densityMultiplier: 1.0,  spreadChance: 0.08 },
  4: { mapSize: "medium", densityMultiplier: 1.25, spreadChance: 0.15 },
  5: { mapSize: "large",  densityMultiplier: 1.0,  spreadChance: 0.25 },
};
export const CITY_MOB_MAX_LEVEL = 5;

export const CITY_MOB_BALANCE = {
  levelUpChancePerVisit: 0.12,
  durabilityDamagePerLevelPct: 0.12,
  minVisitsBeforeLevelUp: 1,
  minVisitsBeforeSpread: 2,
  minVisitsBeforeDurabilityDamage: 1,
  maxActiveCityMobs: 12,
  newMobWarningEffectMultiplier: 0.35,
  levelEffectMultiplierByLevel: {
    1: 1,
    2: 1.5,
    3: 2,
    4: 3,
    5: 4,
  },
  spreadChanceByLevel: {
    3: 0.08,
    4: 0.15,
    5: 0.25,
  },
  zoneDamageMultiplier: {
    border: 0,
    corner: 0.05,
    edge: 0.05,
    bridge: 0.45,
    close: 1,
  },
};

export const CITY_MOB_TYPE_EFFECTS = {
  Peasant: {
    label: "Angry peasants",
    cityStats: { safety: -3, provision: -2, popularity: -2 },
    pressureText: "Local unrest disrupts food supply and public order.",
  },
  Knight: {
    label: "Rogue knights",
    cityStats: { safety: -5, trade: -3, wealth: -2 },
    pressureText: "Armed deserters intimidate citizens and block trade.",
  },
  Demon: {
    label: "Demonic incursion",
    cityStats: { safety: -5, faith: -4, health: -2 },
    pressureText: "Dark pressure weakens faith and safety until the incursion is cleared.",
  },
  Skeleton: {
    label: "Restless dead",
    cityStats: { safety: -4, faith: -3, health: -2 },
    pressureText: "Undead pressure strains city order, faith and public health.",
  },
  Wolf: {
    label: "Wolf pack",
    cityStats: { safety: -4, provision: -3, trade: -1 },
    pressureText: "The pack blocks travel and food supply routes.",
  },
  Spider: {
    label: "Spider nest",
    cityStats: { health: -4, provision: -2, safety: -2 },
    pressureText: "Venom, webs and infestations hurt health and supply.",
  },
  default: {
    label: "City threat",
    cityStats: { safety: -3 },
    pressureText: "This threat reduces city safety while it remains active.",
  },
};

// --- Chance for level-up per besøg ---
export const CITY_MOB_LEVEL_UP_CHANCE = CITY_MOB_BALANCE.levelUpChancePerVisit;

// --- Bygningsskade: % per mob level per mob i feltet per city visit ---
export const CITY_MOB_DAMAGE_PER_LEVEL_PCT = CITY_MOB_BALANCE.durabilityDamagePerLevelPct;

// --- Defence tower building-IDs (et pr. retning) ---
// Towers ligger i "bridge" spawn-områder og beskytter dem
export const CITY_DEFENCE_TOWER_BUILDING_IDS = {
  NW: "defence_tower_nw",
  SW: "defence_tower_sw",
  NE: "defence_tower_ne",
  SE: "defence_tower_se",
};

// --- City wall building ID (giver beskyttelse i "close" spawn-områder) ---
export const CITY_WALL_BUILDING_ID = "city_wall";

// --- Spawn-area regler ---
// requiresNoDefenceTower: hvilken retning's tower MÅ IKKE være ejet
// requiresNoCityWall: city wall MÅ IKKE være ejet
// requiresMobsIn: hvilke andre spawn-areas der SKAL have mobs
// alwaysAllowed: true = ingen betingelser overhovedet
export const CITY_SPAWN_AREA_RULES = {
  NW_SPAWN_BORDER:         { alwaysAllowed: true },
  SW_SPAWN_BORDER:         { alwaysAllowed: true },
  NE_SPAWN_BORDER_LOWER:   { alwaysAllowed: true },
  SE_SPAWN_BORDER:         { alwaysAllowed: true },
  W_SPAWN_EDGE:            { alwaysAllowed: true },

  NW_SPAWN_CORNER:         { requiresMobsIn: ["NW_SPAWN_BORDER"] },

  NW_SPAWN_BRIDGE:         { requiresNoDefenceTower: "NW",   requiresMobsIn: ["NW_SPAWN_BORDER"] },
  NW_SPAWN_CLOSE:          { requiresNoDefenceTower: "NW",   requiresNoCityWall: true, requiresMobsIn: ["NW_SPAWN_BORDER", "NW_SPAWN_BRIDGE"] },

  SW_SPAWN_BRIDGE:         { requiresNoDefenceTower: "SW",   requiresMobsIn: ["SW_SPAWN_BORDER"] },
  SW_SPAWN_CLOSE:          { requiresNoDefenceTower: "SW",   requiresNoCityWall: true, requiresMobsIn: ["SW_SPAWN_BORDER", "SW_SPAWN_BRIDGE"] },

  NE_SPAWN_BORDER_UPPER:   { requiresNoDefenceTower: "NE" },
  NE_SPAWN_BRIDGE:         { requiresNoDefenceTower: "NE" },
  NE_SPAWN_CLOSE:          { requiresNoDefenceTower: "NE",   requiresNoCityWall: true, requiresMobsAnyIn: ["NE_SPAWN_BORDER_UPPER", "NE_SPAWN_BORDER_LOWER"] },

  SE_SPAWN_CORNER:         { requiresMobsIn: ["SE_SPAWN_BORDER"] },
  SE_SPAWN_BRIDGE:         { requiresNoDefenceTower: "SE" },
  SE_SPAWN_CLOSE:          { requiresNoDefenceTower: "SE",   requiresNoCityWall: true },
};

// --- Path branches ---
// Ordre i hvert branch: yderst (entry) → inderst (close til by)
// Angreb er kun muligt på det inderste felt i en branch, der har mobs.
export const CITY_SPAWN_PATHS = [
  ["NW_SPAWN_BORDER", "NW_SPAWN_CORNER"],
  ["NW_SPAWN_BORDER", "NW_SPAWN_BRIDGE", "NW_SPAWN_CLOSE"],
  ["W_SPAWN_EDGE"],
  ["SW_SPAWN_BORDER", "SW_SPAWN_BRIDGE", "SW_SPAWN_CLOSE"],
  ["NE_SPAWN_BORDER_UPPER", "NE_SPAWN_BRIDGE", "NE_SPAWN_CLOSE"],
  ["NE_SPAWN_BORDER_LOWER", "NE_SPAWN_BRIDGE", "NE_SPAWN_CLOSE"],
  ["SE_SPAWN_BORDER", "SE_SPAWN_CORNER"],
  ["SE_SPAWN_BORDER", "SE_SPAWN_BRIDGE", "SE_SPAWN_CLOSE"],
];

// --- Sprednings-naboer: hvorfra kan en mob sprede sig hen? ---
// Brugt til lvl 3+ spredning. Mobs spreder sig til relateret naboområde.
export const CITY_SPAWN_SPREAD_TARGETS = {
  NW_SPAWN_BORDER:       ["NW_SPAWN_CORNER", "NW_SPAWN_BRIDGE"],
  NW_SPAWN_BRIDGE:       ["NW_SPAWN_CLOSE"],
  SW_SPAWN_BORDER:       ["SW_SPAWN_BRIDGE"],
  SW_SPAWN_BRIDGE:       ["SW_SPAWN_CLOSE"],
  NE_SPAWN_BORDER_UPPER: ["NE_SPAWN_BRIDGE"],
  NE_SPAWN_BORDER_LOWER: ["NE_SPAWN_BRIDGE"],
  NE_SPAWN_BRIDGE:       ["NE_SPAWN_CLOSE"],
  SE_SPAWN_BORDER:       ["SE_SPAWN_CORNER", "SE_SPAWN_BRIDGE"],
  SE_SPAWN_BRIDGE:       ["SE_SPAWN_CLOSE"],
};

// --- Bygninger der tager skade hvis mobs er i disse areas ---
// bridge-areas angriber defence towers; close-areas angriber city wall
export const CITY_SPAWN_AREA_BUILDING_TARGETS = {
  NW_SPAWN_BRIDGE: "defence_tower_nw",
  SW_SPAWN_BRIDGE: "defence_tower_sw",
  NE_SPAWN_BRIDGE: "defence_tower_ne",
  SE_SPAWN_BRIDGE: "defence_tower_se",
  NW_SPAWN_CLOSE:  "city_wall",
  SW_SPAWN_CLOSE:  "city_wall",
  NE_SPAWN_CLOSE:  "city_wall",
  SE_SPAWN_CLOSE:  "city_wall",
};

// --- Hjælpefunktion: beregn spawn-chance ud fra threatLevel ---
export function calcCitySpawnChance(threatLevel) {
  if (threatLevel < CITY_THREAT_SPAWN_THRESHOLD) return 0;
  const over = threatLevel - CITY_THREAT_SPAWN_THRESHOLD;
  return (CITY_THREAT_SPAWN_BASE_CHANCE + over * CITY_THREAT_SPAWN_CHANCE_PER_PCT) / 100;
}

// --- Hjælpefunktion: vælg mob fra pool via vægtet tilfældig ---
export function pickCityMobType(rng = Math.random) {
  const total = CITY_MOB_POOL.reduce((s, e) => s + e.weight, 0);
  let roll = rng() * total;
  for (const entry of CITY_MOB_POOL) {
    roll -= entry.weight;
    if (roll <= 0) return entry.type;
  }
  return CITY_MOB_POOL[CITY_MOB_POOL.length - 1].type;
}

// --- Hjælpefunktion: beregn threat-stigning ved dødsfald ---
export function calcThreatRiseOnDeath(xpPct, rng = Math.random) {
  const bracket = CITY_THREAT_RISE_ON_DEATH.find((b) => b.default || xpPct < b.maxXpPct);
  const { min, max } = bracket ?? { min: 2, max: 5 };
  return Math.round(min + rng() * (max - min));
}

// --- Hjælpefunktion: beregn threat-fald ved map exit ---
export function calcThreatFallOnMapExit(mapSize, rng = Math.random) {
  const range = CITY_THREAT_FALL_MAP_SIZE[mapSize] ?? CITY_THREAT_FALL_MAP_SIZE.medium;
  return Math.round(range.min + rng() * (range.max - range.min));
}

function statNumber(stats, keys, fallback = 0) {
  for (const key of keys) {
    const value = Number(stats?.[key]);
    if (Number.isFinite(value)) return value;
  }
  return fallback;
}

function shortageRatio(available, needed) {
  const target = Math.max(1, Number(needed) || 0);
  return Math.max(-1, Math.min(1, (target - Math.max(0, Number(available) || 0)) / target));
}

function pctPressure(value, lowGoodAt, highBadAt) {
  const current = Math.max(0, Math.min(100, Number(value) || 0));
  if (current < lowGoodAt) return (lowGoodAt - current) / Math.max(1, lowGoodAt);
  if (current > highBadAt) return -((current - highBadAt) / Math.max(1, 100 - highBadAt));
  return 0;
}

export function calcThreatDeltaFromCityStats(cityStats = {}) {
  const stats = cityStats && typeof cityStats === "object" && !Array.isArray(cityStats) ? cityStats : {};
  const weights = CITY_STAT_THREAT_WEIGHTS;
  const population = Math.max(0, Math.floor(statNumber(stats, ["population"], 0)));
  const provision = Math.max(0, Math.floor(statNumber(stats, ["provision", "food"], 0)));
  const water = Math.max(0, Math.floor(statNumber(stats, ["water"], 0)));
  const housing = Math.max(0, Math.floor(statNumber(stats, ["housing"], population)));
  const health = Math.max(0, Math.min(100, statNumber(stats, ["health", "citizens_health"], 70)));
  const popularity = Math.max(0, Math.min(100, statNumber(stats, ["popularity", "morale", "order", "stability", "happiness"], 65)));
  const defense = Math.max(0, Math.floor(statNumber(stats, ["defense", "city_defence"], 0)));
  const maintenance = Math.max(0, Math.min(100, statNumber(stats, ["maintenance", "stability"], 75)));
  const corruption = Math.max(0, Math.min(100, statNumber(stats, ["corruption", "corruptionPressure"], 50)));

  let delta = 0;
  delta += ((corruption - 50) / 50) * weights.corruption;

  if (population > 0) {
    const provisionPressure = shortageRatio(provision, population);
    delta += provisionPressure >= 0
      ? provisionPressure * weights.provisionShortage
      : Math.abs(provisionPressure) * weights.provisionSurplus;

    const waterPressure = shortageRatio(water, population);
    delta += waterPressure >= 0
      ? waterPressure * weights.waterShortage
      : Math.abs(waterPressure) * weights.waterSurplus;

    const housingPressure = shortageRatio(housing, population);
    delta += housingPressure >= 0
      ? housingPressure * weights.housingShortage
      : Math.abs(housingPressure) * weights.housingSurplus;

    const defensePressure = shortageRatio(defense, population);
    delta += defensePressure >= 0
      ? defensePressure * weights.defenseLow
      : Math.abs(defensePressure) * weights.defenseHigh;
  }

  const healthPressure = pctPressure(health, 60, 85);
  delta += healthPressure >= 0 ? healthPressure * weights.healthLow : Math.abs(healthPressure) * weights.healthHigh;

  const popularityPressure = pctPressure(popularity, 50, 80);
  delta += popularityPressure >= 0 ? popularityPressure * weights.popularityLow : Math.abs(popularityPressure) * weights.popularityHigh;

  const maintenancePressure = pctPressure(maintenance, 60, 90);
  delta += maintenancePressure >= 0 ? maintenancePressure * weights.maintenanceLow : Math.abs(maintenancePressure) * weights.maintenanceHigh;

  return Math.max(CITY_STAT_THREAT_DELTA_MIN, Math.min(CITY_STAT_THREAT_DELTA_MAX, Math.round(delta)));
}
