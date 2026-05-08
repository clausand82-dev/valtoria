import {
  clamp,
  POPULARITY_CONFIG,
  ELITE_VARIANTS,
  ELITE_NO_VARIANT_WEIGHT
} from "../dependencies.js";

export function rollEliteVariant() {
  const entries = [
    { variant: null, weight: ELITE_NO_VARIANT_WEIGHT },
    ...ELITE_VARIANTS.filter(Boolean).map((variant) => ({ variant, weight: variant.weight })),
  ];
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry.variant;
  }
  return null;
}

export function eliteVariantLevelPct(elite) {
  if (!elite) return 0;
  if (Number.isFinite(Number(elite.levelPct))) return Number(elite.levelPct);
  return ELITE_VARIANTS.find((variant) => variant?.id === elite.id)?.levelPct ?? 0;
}

export function namedItemChanceMultiplier(monster) {
  const levelPct = eliteVariantLevelPct(monster?.elite);
  if (levelPct >= 1) return 8;
  if (levelPct >= 0.5) return 4;
  if (levelPct > 0) return 2.25;
  return 1;
}

export function monsterPopularityDelta(monster, playerLevel) {
  const rule = POPULARITY_CONFIG.monsterRules[monster?.typeName];
  const base = Number(rule?.change ?? POPULARITY_CONFIG.defaultMonsterChange) || 0;
  if (!base) return 0;
  const levelDelta = Math.floor(Number(monster?.level) || 1) - Math.floor(Number(playerLevel) || 1);
  const levelMultiplier = clamp(
    1 + levelDelta * POPULARITY_CONFIG.monsterLevelScalePerLevel,
    POPULARITY_CONFIG.minMonsterLevelMultiplier,
    POPULARITY_CONFIG.maxMonsterLevelMultiplier,
  );
  const eliteMultiplier = monster?.elite
    ? 1 + eliteVariantLevelPct(monster.elite) * POPULARITY_CONFIG.eliteMultiplier
    : 1;
  return base * levelMultiplier * eliteMultiplier;
}

export function housePopularityDelta(regionLevel) {
  const house = POPULARITY_CONFIG.houseDestroy;
  const level = Math.max(1, Math.floor(Number(regionLevel) || 1));
  return house.baseCost * (1 + (level - 1) * house.regionLevelScale);
}

export function createHeroStats() {
  return {
    damageDealt: 0,
    damageTaken: 0,
    killsTotal: 0,
    killsByMonster: {},
    meleeAttacks: 0,
    rangedAttacks: 0,
    spellProjectiles: 0,
    spellsCast: 0,
    questsCompleted: 0,
    goldEarned: 0,
    goldLooted: 0,
    itemsPicked: 0,
    resourcesPicked: 0,
    healthPotionsUsed: 0,
    manaPotionsUsed: 0,
    deaths: 0,
    objectsDestroyed: 0,
    objectsDestroyedByType: {},
    itemsDropped: 0,
    itemsDroppedByRarity: {},
    itemsNotPicked: 0,
    itemsNotPickedByRarity: {},
    itemsPickedByRarity: {},
    itemsDestroyed: 0,
    itemsDestroyedByRarity: {},
    readablesRead: 0,
    readablesConsumed: 0,
    army: 0,
  };
}

export function normalizeHeroStats(stats) {
  const base = createHeroStats();
  if (!stats || typeof stats !== "object") return base;
  const killsByMonster = {};
  if (stats.killsByMonster && typeof stats.killsByMonster === "object") {
    for (const [name, value] of Object.entries(stats.killsByMonster)) {
      killsByMonster[name] = {
        normal: Math.max(0, Math.floor(Number(value?.normal) || 0)),
        elite: Math.max(0, Math.floor(Number(value?.elite) || 0)),
      };
    }
  }
  const mapKeys = [
    "objectsDestroyedByType",
    "itemsDroppedByRarity",
    "itemsNotPickedByRarity",
    "itemsPickedByRarity",
    "itemsDestroyedByRarity",
  ];
  const statMaps = Object.fromEntries(mapKeys.map((key) => [key, normalizeStatMap(stats[key])]));
  return {
    ...base,
    ...Object.fromEntries(Object.keys(base)
      .filter((key) => key !== "killsByMonster")
      .map((key) => [key, Math.max(0, Math.floor(Number(stats[key]) || 0))])),
    killsByMonster,
    ...statMaps,
  };
}

export function normalizeStatMap(record) {
  if (!record || typeof record !== "object") return {};
  return Object.fromEntries(Object.entries(record)
    .map(([key, value]) => [key, Math.max(0, Math.floor(Number(value) || 0))])
    .filter(([, value]) => value > 0));
}

export function incrementStatMap(record, key, amount = 1) {
  if (!record || !key) return;
  record[key] = Math.max(0, Math.floor(Number(record[key]) || 0)) + Math.max(1, Math.floor(Number(amount) || 1));
}

export function decrementStatMap(record, key, amount = 1) {
  if (!record || !key) return;
  const next = Math.max(0, Math.floor(Number(record[key]) || 0) - Math.max(1, Math.floor(Number(amount) || 1)));
  if (next > 0) record[key] = next;
  else delete record[key];
}

export function itemRarityBucket(item) {
  if (item?.mode === "quest") return "quest";
  return item?.rarity ?? "normal";
}
