import { CHUNK_SIZE, WORLD_SEED } from "./config/game-constants-config.js";
import { ARMOR_BASES, EQUIPMENT_SLOTS, WEAPON_BASES } from "./config/equipment-config.js";
import { NAMED_ITEM_TEMPLATES, PREFIXES, UNIQUE_ITEMS } from "./config/item-config.js";
import { MONSTER_STATS } from "./config/monster-config.js";
import { QUEST_NPCS } from "./config/npc-config.js";
import { RARITIES, UNIQUE_RARITY } from "./config/rarity-config.js";
import { OBJECT_SPAWN_TUNING, SPAWN_CONFIG } from "./config/spawn-config.js";
import { normalizeRegionFoliageSets, normalizeRegionTileset, normalizeRegionWaterSets } from "./config/region-asset-config.js";
import {
  getRegionObjectFamily,
  // legacyRegionObjectsFromWeights,
  normalizeObjectSpawnDamage,
  normalizeRegionObjects,
  pickObjectSpawnType,
  REGION_OBJECT_DEFS,
  resolveRegionObjectDestructibleDef,
  resolveRegionObjectVariantCount,
} from "./config/region-object-config.js";
import {
  buildDecaySheetId,
  DECAY_SET_DEFS,
  normalizeDecayRenderConfig,
  normalizeRegionDecaySets,
} from "./config/decay-config.js";
import { normalizeParticleConfigs, rollParticleConfigs } from "./config/particle-presets.js";
import { resolveWeatherForRegion } from "./config/weather-presets.js";
import { potionDefById, normalizePotionId } from "./config/potion-config.js";
import { BOSS_TINT } from "./config/monster-config.js";
import { withItemFlags, withItemIcon } from "./item-system.js";
import { MAX_ITEM_SOCKETS } from "./config/socket-config.js";
import { ITEM_DURABILITY_RANDOM_MIN, ITEM_DURABILITY_RANDOM_MAX } from "./config/durability-config.js";
import {
  chooseLayoutForRegion,
  isReservedTile,
  placeRegionPrefabs,
  prefabInstancesForChunk,
} from "./world/map-prefab-placement.js";
import { resolveAttachedObjectParticleConfigs } from "./objects/object-attached-effects.js";

let nextId = 1;
const GROUND_VARIANT_COUNT = 16;
const REGION_W = 72;
const REGION_H = 52;
const DEFAULT_GROUND_SHEET_ID = "ground-custom:tileset/tileset_grass.png";
const ITEM_BONUS_STAT_KEYS = [
  "maxHpPct",
  "maxManaPct",
  "armorFlat",
  "armorPct",
  "damagePct",
  "speedPct",
  "attackSpeed",
  "critChance",
  "critDamage",
  "blockChance",
  "blockAmount",
  "dodgeChance",
  "lifeSteal",
  "magicFind",
  "goldFind",
  "resourceFind",
  "xpGain",
  "physicalResist",
  "fireResist",
  "iceResist",
  "lightningResist",
  "poisonResist",
  "arcaneResist",
  "holyResist",
  "shadowResist",
  "natureResist",
  "allResist",
  "magicResist",
  "physicalDamageBonus",
  "fireDamageBonus",
  "iceDamageBonus",
  "lightningDamageBonus",
  "poisonDamageBonus",
  "arcaneDamageBonus",
  "holyDamageBonus",
  "shadowDamageBonus",
  "natureDamageBonus",
  "spellDamageBonus",
  "directDamageBonus",
  "areaDamageBonus",
  "dotDamageBonus",
  "hazardDamageBonus",
  "dotDurationBonus",
  "statusDurationBonus",
];

function cloneItemEffects(effects) {
  if (!effects || typeof effects !== "object") return undefined;
  return {
    ...effects,
    onHit: Array.isArray(effects.onHit)
      ? effects.onHit
        .filter((effect) => effect && typeof effect === "object")
        .map((effect) => ({ ...effect }))
      : undefined,
  };
}

export function createId() {
  nextId += 1;
  return nextId;
}

export function ensureNextId(minId) {
  const target = Math.floor(Number(minId) || 0);
  if (target > nextId) nextId = target;
}

export function hashInt(x, y, salt = 0) {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(WORLD_SEED + salt, 1442695041);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (n ^ (n >>> 16)) >>> 0;
}

export function rand01(x, y, salt = 0) {
  return hashInt(x, y, salt) / 4294967295;
}

function seededRand(seed, salt = 0) {
  return hashInt(seed, salt, 9000 + salt) / 4294967295;
}

export function chunkKey(cx, cy) {
  return `${cx},${cy}`;
}

export function chunkCoords(x, y) {
  return {
    cx: Math.floor(x / CHUNK_SIZE),
    cy: Math.floor(y / CHUNK_SIZE),
  };
}

export function makeStarterWeapon() {
  return finalizeItem({
    id: createId(),
    name: "Plain Sword",
    baseName: "Sword",
    rarity: "normal",
    rarityLabel: "Normal",
    rarityColor: "#f5f3ea",
    slot: "weapon",
    mode: "melee",
    hands: 1,
    level: 1,
    damageMin: 7,
    damageMax: 12,
    range: 1.25,
    cooldown: 0.52,
    armor: 0,
    maxHp: 0,
    maxMana: 0,
    speed: 0,
    magic: 0,
  });
}

export function createEquipment() {
  const equipment = Object.fromEntries(EQUIPMENT_SLOTS.map((slot) => [slot.id, null]));
  equipment.weapon = makeStarterWeapon();
  return equipment;
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function pickWeighted(entries, roll = Math.random()) {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = roll * total;
  for (const entry of entries) {
    cursor -= entry.weight;
    if (cursor <= 0) return entry;
  }
  return entries[entries.length - 1];
}

function pickWeightedByWeight(entries, roll = Math.random()) {
  const weighted = entries.map((entry) => ({
    entry,
    weight: Math.max(0, Number(entry.weight) || 1),
  }));
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  if (total <= 0) return entries[Math.floor(roll * entries.length)] ?? entries[0];
  let cursor = roll * total;
  for (const item of weighted) {
    cursor -= item.weight;
    if (cursor <= 0) return item.entry;
  }
  return weighted[weighted.length - 1]?.entry ?? entries[0];
}

function pickWeightedTileset(entries, roll = Math.random()) {
  if (!Array.isArray(entries) || !entries.length) return null;
  return pickWeightedByWeight(entries, roll);
}

export function getRarity(level) {
  const shifted = RARITIES.map((rarity, index) => ({
    ...rarity,
    weight: rarity.weight + (index > 1 ? Math.min(10, level * 0.7) : 0),
  }));
  return pickWeighted(shifted);
}

export function itemValue(item) {
  if (!item) return 0;
  const rarity = item.rarity === UNIQUE_RARITY.id
    ? UNIQUE_RARITY
    : RARITIES.find((entry) => entry.id === item.rarity) ?? RARITIES[1];
  const level = Math.max(1, Math.floor(Number(item.level) || 1));
  const power =
    (Number(item.damageMin) || 0) +
    (Number(item.damageMax) || 0) +
    (Number(item.armor) || 0) * 1.8 +
    (Number(item.maxHp) || 0) * 0.45 +
    (Number(item.maxMana) || 0) * 0.35 +
    (Number(item.magic) || 0) * 1.6 +
    (Number(item.speed) || 0) * 55 +
    (Number(item.maxHpPct) || 0) * 115 +
    (Number(item.maxManaPct) || 0) * 90 +
    (Number(item.armorFlat) || 0) * 1.8 +
    (Number(item.armorPct) || 0) * 180 +
    (Number(item.damagePct) || 0) * 150 +
    (Number(item.speedPct) || 0) * 120 +
    (Number(item.attackSpeed) || 0) * 150 +
    (Number(item.critChance) || 0) * 220 +
    (Number(item.critDamage) || 0) * 90 +
    (Number(item.blockChance) || 0) * 180 +
    (Number(item.blockAmount) || 0) * 18 +
    (Number(item.dodgeChance) || 0) * 180 +
    (Number(item.lifeSteal) || 0) * 260 +
    (Number(item.magicFind) || 0) * 85 +
    (Number(item.goldFind) || 0) * 65 +
    (Number(item.resourceFind) || 0) * 70 +
    (Number(item.xpGain) || 0) * 75 +
    (Number(item.allResist) || 0) * 9 +
    (Number(item.magicResist) || 0) * 8 +
    (Number(item.physicalResist) || 0) * 5 +
    (Number(item.fireResist) || 0) * 5 +
    (Number(item.iceResist) || 0) * 5 +
    (Number(item.lightningResist) || 0) * 5 +
    (Number(item.poisonResist) || 0) * 5 +
    (Number(item.arcaneResist) || 0) * 5 +
    (Number(item.holyResist) || 0) * 5 +
    (Number(item.shadowResist) || 0) * 5 +
    (Number(item.natureResist) || 0) * 5 +
    (Number(item.spellDamageBonus) || 0) * 150 +
    (Number(item.directDamageBonus) || 0) * 120 +
    (Number(item.areaDamageBonus) || 0) * 120 +
    (Number(item.dotDamageBonus) || 0) * 120 +
    (Number(item.hazardDamageBonus) || 0) * 120 +
    (Number(item.physicalDamageBonus) || 0) * 100 +
    (Number(item.fireDamageBonus) || 0) * 100 +
    (Number(item.iceDamageBonus) || 0) * 100 +
    (Number(item.lightningDamageBonus) || 0) * 100 +
    (Number(item.poisonDamageBonus) || 0) * 100 +
    (Number(item.arcaneDamageBonus) || 0) * 100 +
    (Number(item.holyDamageBonus) || 0) * 100 +
    (Number(item.shadowDamageBonus) || 0) * 100 +
    (Number(item.natureDamageBonus) || 0) * 100;
  return Math.max(1, Math.floor((8 + level * 6 + power) * rarity.mult));
}

function withItemValue(item) {
  return {
    ...item,
    value: itemValue(item),
  };
}

function withRandomSockets(item) {
  if (!item || item.unique || item.named || (item.slot !== "weapon" && item.mode !== "armor" && item.slot !== "offhand")) return item;
  const rarityIndex = RARITIES.findIndex((rarity) => rarity.id === item.rarity);
  const chance = Math.max(0, 0.03 + rarityIndex * 0.035 + Math.max(0, Number(item.level) || 1) * 0.003);
  if (Math.random() >= chance) return item;
  const sockets = 1 + (Math.random() < 0.22 ? 1 : 0) + (Math.random() < 0.06 ? 1 : 0);
  return { ...item, sockets: Array.from({ length: Math.min(MAX_ITEM_SOCKETS, sockets) }, () => null) };
}

function finalizeItem(item, flags = null, iconKey = null) {
  // Add random durability to all equipment items (weapon / armor slots)
  if (!Object.prototype.hasOwnProperty.call(item, "durability")) {
    const pct = Math.round(
      ITEM_DURABILITY_RANDOM_MIN + Math.random() * (ITEM_DURABILITY_RANDOM_MAX - ITEM_DURABILITY_RANDOM_MIN)
    );
    item.durability = pct;
  }
  return withItemIcon(withItemFlags(withItemValue(withRandomSockets(item)), flags), iconKey);
}

function itemBonusStats(stats = {}) {
  return Object.fromEntries(ITEM_BONUS_STAT_KEYS.map((key) => [key, Number(stats[key]) || 0]));
}

export function makeItem(level, weaponBias = Math.random()) {
  const rarity = getRarity(level);
  const multiplier = rarity.mult * (1 + level * 0.12);

  if (weaponBias < 0.44) {
    const base = pick(WEAPON_BASES);
    return finalizeItem({
      id: createId(),
      name: `${pick(PREFIXES[rarity.id])} ${base.name}`,
      baseName: base.name,
      rarity: rarity.id,
      rarityLabel: rarity.label,
      rarityColor: rarity.color,
      slot: "weapon",
      mode: base.mode,
      hands: base.hands ?? 1,
      level,
      damageMin: Math.max(1, Math.floor(base.min * multiplier)),
      damageMax: Math.max(2, Math.floor(base.max * multiplier + level)),
      range: Number((base.range * (base.mode === "melee" ? 1 : 1 + rarity.mult * 0.035)).toFixed(2)),
      cooldown: Math.max(0.28, Number((base.cooldown - (rarity.mult - 1) * 0.035).toFixed(2))),
      armor: 0,
      maxHp: 0,
      maxMana: base.mode === "magic" ? Math.floor(5 * rarity.mult + level) : 0,
      speed: base.mode === "ranged" ? 0.06 * rarity.mult : 0,
      magic: base.mode === "magic" ? Math.floor(4 * rarity.mult + level) : 0,
    });
  }

  const base = pick(ARMOR_BASES);
  return finalizeItem({
    id: createId(),
    name: `${pick(PREFIXES[rarity.id])} ${base.name}`,
    baseName: base.name,
    rarity: rarity.id,
    rarityLabel: rarity.label,
    rarityColor: rarity.color,
    slot: base.slot,
    mode: base.type === "shield" ? "shield" : "armor",
    type: base.type,
    level,
    damageMin: base.damage ? Math.floor(base.damage * multiplier) : 0,
    damageMax: base.damage ? Math.floor(base.damage * multiplier + level * 0.5) : 0,
    range: 0,
    cooldown: 0,
    armor: Math.floor((base.armor || 0) * multiplier),
    maxHp: Math.floor((base.life || 0) * multiplier),
    maxMana: Math.floor((base.mana || 0) * multiplier),
    speed: Number(((base.speed || 0) * multiplier).toFixed(2)),
    magic: Math.floor((base.magic || 0) * multiplier),
    ...itemBonusStats(base),
  });
}

export function rollUniqueItem(level, context = {}) {
  const chance = Number(context.chance) || 0;
  if (chance <= 0 || Math.random() >= chance) return null;

  const source = context.source ?? "monster";
  const biomeId = context.biomeId ?? "mainland";
  const candidates = UNIQUE_ITEMS.filter((item) => (
    level >= (item.levelMin ?? 1)
    && (!item.sources || item.sources.includes(source))
    && (!item.biomes || item.biomes.includes(biomeId))
  ));
  if (!candidates.length) return null;

  return makeUniqueItem(pickWeightedByWeight(candidates), level);
}

export function makeUniqueItem(definition, level = 1) {
  const rarity = definition.rarity === UNIQUE_RARITY.id
    ? UNIQUE_RARITY
    : RARITIES.find((entry) => entry.id === definition.rarity) ?? RARITIES[3];
  const itemLevel = Math.max(definition.levelMin ?? 1, Math.floor(Number(level) || 1));
  const scale = definition.scaleWithLevel ? 1 + itemLevel * 0.1 : 1;
  const stats = definition.stats ?? {};
  const item = {
    id: createId(),
    unique: true,
    uniqueId: definition.id,
    name: definition.name,
    baseName: definition.baseName,
    rarity: rarity.id,
    rarityLabel: rarity.label,
    rarityColor: rarity.color,
    slot: definition.slot,
    mode: definition.mode,
    type: definition.type,
    hands: definition.hands ?? (definition.slot === "weapon" ? 1 : undefined),
    level: itemLevel,
    classReq: Array.isArray(definition.classReq) ? [...definition.classReq] : undefined,
    levelReq: definition.levelReq,
    requiresClassNode: definition.requiresClassNode,
    damageMin: Math.max(0, Math.floor((stats.damageMin ?? 0) * scale)),
    damageMax: Math.max(0, Math.floor((stats.damageMax ?? 0) * scale)),
    range: Number(stats.range ?? 0),
    cooldown: Number(stats.cooldown ?? 0),
    armor: Math.floor((stats.armor ?? 0) * scale),
    maxHp: Math.floor((stats.maxHp ?? 0) * scale),
    maxMana: Math.floor((stats.maxMana ?? 0) * scale),
    speed: Number(((stats.speed ?? 0) * scale).toFixed(2)),
    magic: Math.floor((stats.magic ?? 0) * scale),
    ...itemBonusStats(stats),
    slowImmune: Boolean(stats.slowImmune),
    effects: cloneItemEffects(definition.effects),
    tags: Array.isArray(definition.tags) ? [...definition.tags] : undefined,
    target: Array.isArray(definition.target) ? [...definition.target] : undefined,
    bonus: Array.isArray(definition.bonus) ? definition.bonus.map((entry) => Array.isArray(entry) ? [...entry] : entry) : undefined,
    iconUrl: definition.iconUrl || undefined,
  };
  return finalizeItem(item, { mergeable: false }, definition.id);
}

export function rollNamedItem(level, context = {}) {
  const chanceMult = Number(context.chanceMult) || 1;
  if (chanceMult <= 0) return null;

  const source = context.source ?? "monster";
  const biomeId = context.biomeId ?? "mainland";
  const candidates = NAMED_ITEM_TEMPLATES.filter((item) => (
    level >= (item.levelMin ?? 1)
    && Math.random() < (item.dropChance ?? 0) * chanceMult
    && (!item.sources || item.sources.includes(source))
    && (!item.biomes || item.biomes.includes(biomeId))
  ));
  if (!candidates.length) return null;

  return makeNamedItem(candidates[Math.floor(Math.random() * candidates.length)], level);
}

export function makeNamedItem(definition, level = 1) {
  const allowedRarities = definition.rarityIds?.length
    ? RARITIES.filter((rarity) => definition.rarityIds.includes(rarity.id))
    : RARITIES;
  const rarity = rollRarityFromList(allowedRarities, level);
  const itemLevel = Math.max(definition.levelMin ?? 1, Math.floor(Number(level) || 1));
  const scale = definition.scaleWithLevel ? 1 + itemLevel * 0.12 : 1;
  const rarityScale = rarity.mult;
  const stats = definition.stats ?? {};
  const item = {
    id: createId(),
    named: true,
    namedId: definition.id,
    name: definition.name,
    baseName: definition.baseName,
    rarity: rarity.id,
    rarityLabel: rarity.label,
    rarityColor: rarity.color,
    slot: definition.slot,
    mode: definition.mode,
    type: definition.type,
    hands: definition.hands ?? (definition.slot === "weapon" ? 1 : undefined),
    level: itemLevel,
    classReq: Array.isArray(definition.classReq) ? [...definition.classReq] : undefined,
    levelReq: definition.levelReq,
    requiresClassNode: definition.requiresClassNode,
    damageMin: Math.max(0, Math.floor((stats.damageMin ?? 0) * scale * rarityScale)),
    damageMax: Math.max(0, Math.floor((stats.damageMax ?? 0) * scale * rarityScale + itemLevel * 0.5)),
    range: Number(stats.range ?? 0),
    cooldown: Number(stats.cooldown ?? 0),
    armor: Math.floor((stats.armor ?? 0) * scale * rarityScale),
    maxHp: Math.floor((stats.maxHp ?? 0) * scale * rarityScale),
    maxMana: Math.floor((stats.maxMana ?? 0) * scale * rarityScale),
    speed: Number(((stats.speed ?? 0) * scale * rarityScale).toFixed(2)),
    magic: Math.floor((stats.magic ?? 0) * scale * rarityScale),
    ...itemBonusStats(stats),
    slowImmune: Boolean(stats.slowImmune),
    effects: cloneItemEffects(definition.effects),
    tags: Array.isArray(definition.tags) ? [...definition.tags] : undefined,
    target: Array.isArray(definition.target) ? [...definition.target] : undefined,
    bonus: Array.isArray(definition.bonus) ? definition.bonus.map((entry) => Array.isArray(entry) ? [...entry] : entry) : undefined,
    iconUrl: definition.iconUrl || undefined,
  };
  return finalizeItem(item, { mergeable: false }, definition.id);
}

function rollRarityFromList(rarities, level) {
  const allowed = rarities.length ? rarities : RARITIES;
  const shifted = allowed.map((rarity) => ({
    ...rarity,
    weight: rarity.weight + (RARITIES.findIndex((entry) => entry.id === rarity.id) > 1 ? Math.min(10, level * 0.7) : 0),
  }));
  return pickWeighted(shifted);
}

export function makePotion(type = Math.random() < 0.5 ? "health" : "mana", level = 1) {
  const potionId = normalizePotionId(type) || "small_health";
  const def = potionDefById(potionId);
  const health = def?.type === "health";
  return finalizeItem({
    id: createId(),
    name: def?.name ?? (health ? "Small Health Potion" : "Mana Potion"),
    baseName: def?.name ?? (health ? "Small Health Potion" : "Mana Potion"),
    rarity: "normal",
    rarityLabel: "Normal",
    rarityColor: def?.color ?? (health ? "#c52c38" : "#2d8ed8"),
    slot: "consumable",
    mode: "potion",
    potionId,
    potionType: def?.type ?? (health ? "health" : "mana"),
    restorePct: Number(def?.restorePct) || 0.25,
    iconKey: def?.iconKey,
    iconUrl: def?.iconUrl,
    level: Math.max(1, Math.floor(Number(level) || 1)),
    damageMin: 0,
    damageMax: 0,
    range: 0,
    cooldown: 0,
    armor: 0,
    maxHp: 0,
    maxMana: 0,
    speed: 0,
    magic: 0,
  }, { mergeable: false }, def?.iconKey ?? (health ? "potion_health" : "potion_mana"));
}

const MAP_SIZE_SCALES = { small: 0.55, medium: 1.0, large: 1.5, giga: 2.2 };

function layoutAnchorIndex(layoutDef, index, count, pathLength, seed) {
  const min = 2;
  const max = Math.max(min, pathLength - 3);
  if (!layoutDef) return min + Math.floor(seededRand(seed, 80 + index) * (pathLength - 4));
  if (layoutDef.roomBias === "branchEnds") {
    const side = index % 2 === 0 ? 0.2 : 0.8;
    const t = Math.max(0.08, Math.min(0.92, side + (seededRand(seed, 82 + index) - 0.5) * 0.18));
    return Math.max(min, Math.min(max, Math.round(t * (pathLength - 1))));
  }
  if (layoutDef.roomBias === "aroundCenter") {
    const t = 0.5 + (seededRand(seed, 84 + index) - 0.5) * 0.35;
    return Math.max(min, Math.min(max, Math.round(t * (pathLength - 1))));
  }
  if (layoutDef.roomBias === "aroundRing") {
    const t = (index + seededRand(seed, 86 + index) * 0.35) / Math.max(1, count);
    return Math.max(min, Math.min(max, Math.round(t * (pathLength - 1))));
  }
  return min + Math.floor(seededRand(seed, 80 + index) * (pathLength - 4));
}

function layoutRoomAngle(layoutDef, index, count, seed) {
  if (layoutDef?.roomBias === "aroundRing") return (index / Math.max(1, count)) * Math.PI * 2;
  if (layoutDef?.roomBias === "aroundCenter") return (index / Math.max(1, count)) * Math.PI * 2 + seededRand(seed, 102) * 0.7;
  return seededRand(seed, 100 + index) * Math.PI * 2;
}

function layoutRoomDistance(layoutDef, index, seed) {
  if (layoutDef?.roomBias === "aroundCenter") return 3.5 + seededRand(seed, 120 + index) * 5.5;
  if (layoutDef?.roomBias === "aroundRing") return 6.5 + seededRand(seed, 120 + index) * 4.5;
  return 5 + seededRand(seed, 120 + index) * 8;
}

function normalizeSpawnCounts(input = {}) {
  const monsters = input.monsters && typeof input.monsters === "object" ? input.monsters : {};
  const minMonsters = Math.max(0, Math.round(Number(monsters.min) || 0));
  const maxMonsters = Math.max(minMonsters, Math.round(Number(monsters.max) || minMonsters));
  return {
    objects: Math.max(0, Math.round(Number(input.objects) || 0)),
    foliage: Math.max(0, Math.round(Number(input.foliage ?? input.foilage) || 0)),
    decals: Math.max(0, Math.round(Number(input.decals ?? input.decay) || 0)),
    water: Math.max(0, Math.round(Number(input.water) || 0)),
    monsters: { min: minMonsters, max: maxMonsters },
  };
}

function spawnCount(chunk, key) {
  return Math.max(0, Math.round(Number(chunk.region?.mapRegion?.spawnCounts?.[key]) || 0));
}

export function createRegion(regionIndex = 1, seed = Math.floor(Math.random() * 1000000), biomeId = null, regionConfig = null) {
  const normalizedTileset = normalizeRegionTileset(regionConfig?.tileset);
  const normalizedTilesetArray = Array.isArray(normalizedTileset) ? normalizedTileset : (normalizedTileset ? [normalizedTileset] : null);
  const normalizedWaterSets = normalizeRegionWaterSets(regionConfig ?? {});
  const normalizedFoliageSets = normalizeRegionFoliageSets(regionConfig ?? {});
  const normalizedObjects = normalizeRegionObjects(regionConfig ?? {});
  const normalizedDecaySets = normalizeRegionDecaySets(regionConfig ?? {});
  const normalizedSpawnCounts = normalizeSpawnCounts(regionConfig?.spawnCounts ?? {});
  const sizeMult = MAP_SIZE_SCALES[regionConfig?.mapSize] ?? 1.0;
  const regionW = Math.round(REGION_W * sizeMult);
  const regionH = Math.round(REGION_H * sizeMult);
  const start = { x: 5.5 * sizeMult, y: (42 + seededRand(seed, 2) * 4) * sizeMult };
  const end = { x: regionW - 7.5 * sizeMult, y: (7 + seededRand(seed, 3) * 10) * sizeMult };
  const layoutDef = chooseLayoutForRegion(regionConfig, () => seededRand(seed, 8600 + regionIndex * 31));
  const layoutRoomCount = Math.max(1, Math.floor(Number(layoutDef?.roomCount) || 9));
  const bendScale = layoutDef ? Number(layoutDef.bendScale ?? 1) || 1 : 1;
  const wobbleScale = layoutDef ? Number(layoutDef.wobbleScale ?? 1) || 1 : 1;
  const roomScale = layoutDef ? Number(layoutDef.roomScale ?? 1) || 1 : 1;
  const path = [];
  const rooms = [];
  const mask = new Set();

  for (let i = 0; i < 18; i += 1) {
    const t = i / 17;
    const bend = Math.sin(t * Math.PI * 2.2 + seededRand(seed, 10) * Math.PI * 2) * 7 * sizeMult * bendScale;
    const wobble = Math.sin(t * Math.PI * 5.4 + seededRand(seed, 11) * Math.PI * 2) * 3.8 * sizeMult * wobbleScale;
    path.push({
      x: lerp(start.x, end.x, t) + bend + wobble,
      y: lerp(start.y, end.y, t) + Math.sin(t * Math.PI * 3.1 + seededRand(seed, 12) * Math.PI * 2) * 8 * sizeMult,
      r: (3.4 + seededRand(seed, 40 + i) * 4.3) * sizeMult,
    });
  }

  for (let i = 0; i < layoutRoomCount; i += 1) {
    const anchorIndex = layoutAnchorIndex(layoutDef, i, layoutRoomCount, path.length, seed);
    const anchor = path[anchorIndex];
    const angle = layoutRoomAngle(layoutDef, i, layoutRoomCount, seed);
    const distance = layoutRoomDistance(layoutDef, i, seed) * sizeMult;
    rooms.push({
      x: anchor.x + Math.cos(angle) * distance,
      y: anchor.y + Math.sin(angle) * distance,
      rx: (4 + seededRand(seed, 160 + i) * 7) * sizeMult * roomScale,
      ry: (3 + seededRand(seed, 180 + i) * 6) * sizeMult * roomScale,
    });
  }
  if (layoutDef?.forceRoomAt === "center") {
    rooms.push({
      x: regionW * 0.5,
      y: regionH * 0.5,
      rx: 8.5 * sizeMult,
      ry: 6.8 * sizeMult,
    });
  }

  for (let y = 0; y < regionH; y += 1) {
    for (let x = 0; x < regionW; x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;
      let playable = false;
      for (let i = 0; i < path.length - 1 && !playable; i += 1) {
        const a = path[i];
        const b = path[i + 1];
        const d = distanceToSegment(px, py, a.x, a.y, b.x, b.y);
        const r = lerp(a.r, b.r, 0.5);
        const edgeNoise = seededRand(seed, x * 97 + y * 131 + i * 17) * 1.8 - 0.9;
        playable = d < r + edgeNoise;
      }
      for (const room of rooms) {
        const nx = (px - room.x) / room.rx;
        const ny = (py - room.y) / room.ry;
        if (nx * nx + ny * ny < 1) playable = true;
      }
      if (Math.hypot(px - start.x, py - start.y) < 5.4 * sizeMult || Math.hypot(px - end.x, py - end.y) < 4.8 * sizeMult) playable = true;
      if (playable) mask.add(`${x},${y}`);
    }
  }

  // Flood-fill from the start tile so isolated "islands" are removed.
  // Only tiles reachable from spawn are kept — the player can never get stranded.
  {
    const sx = Math.floor(start.x);
    const sy = Math.floor(start.y);
    const visited = new Set();
    const queue = [`${sx},${sy}`];
    visited.add(`${sx},${sy}`);
    while (queue.length > 0) {
      const key = queue.pop();
      const comma = key.indexOf(",");
      const tx = Number(key.slice(0, comma));
      const ty = Number(key.slice(comma + 1));
      for (let dx = -1; dx <= 1; dx += 1) {
        for (let dy = -1; dy <= 1; dy += 1) {
          if (dx === 0 && dy === 0) continue;
          const nk = `${tx + dx},${ty + dy}`;
          if (!visited.has(nk) && mask.has(nk)) {
            visited.add(nk);
            queue.push(nk);
          }
        }
      }
    }
    mask.clear();
    for (const k of visited) mask.add(k);
  }

  const region = {
    id: `${seed}-${regionIndex}`,
    index: regionIndex,
    seed,
    layoutId: layoutDef?.id ?? null,
    layoutDef: layoutDef ? { ...layoutDef } : null,
    mapRegion: regionConfig ? {
      id: regionConfig.id,
      label: regionConfig.label,
      areaMapId: regionConfig.areaMapId,
      tileset: normalizedTilesetArray
        ? normalizedTilesetArray.map((normalizedTileset) => ({
          fileName: normalizedTileset.fileName,
          sheetId: normalizedTileset.sheetId,
          weight: normalizedTileset.weight,
          x: normalizedTileset.x,
          y: normalizedTileset.y,
          lockedVariant: normalizedTileset.lockedVariant,
          variantCount: normalizedTileset.variantCount,
        }))
        : null,
      waterSets: normalizedWaterSets.map((set) => ({
        fileName: set.fileName,
        sheetId: set.sheetId,
        weight: set.weight,
        x: set.x ? [...set.x] : null,
        y: set.y ? [...set.y] : null,
        variants: [...set.variants],
        variantCount: set.variantCount,
      })),
      foliageSets: normalizedFoliageSets.map((set) => ({
        fileName: set.fileName,
        sheetId: set.sheetId,
        weight: set.weight,
        scale: set.scale,
        rows: set.rows,
        cols: set.cols,
        variantCount: set.variantCount,
        resourceDrops: set.resourceDrops.map((entry) => ({ ...entry })),
        particles: set.particles.map((entry) => ({ ...entry })),
        actionId: set.actionId,
        questTargetKey: set.questTargetKey,
        depthMode: set.depthMode,
        sortAnchor: set.sortAnchor ? { ...set.sortAnchor } : null,
        depthOffset: set.depthOffset,
      })),
      objects: normalizedObjects.map((entry) => ({
        id: entry.id,
        weight: entry.weight,
        spawnTypes: entry.spawnTypes.map((item) => ({ type: item.type, weight: item.weight })),
        destructible: entry.destructible,
        defaultDestructible: entry.defaultDestructible,
        renderBiomeId: entry.renderBiomeId,
        graphicsRef: entry.graphicsRef,
        particles: entry.particles.map((particle) => ({ ...particle })),
        effects: entry.effects ? { ...entry.effects } : null,
        depthMode: entry.depthMode,
        sortAnchor: entry.sortAnchor ? { ...entry.sortAnchor } : null,
        depthOffset: entry.depthOffset,
        scale: entry.scale ? { ...entry.scale } : null,
        variantCount: entry.variantCount,
        spawnDamage: entry.spawnDamage ?? null,
        spawnTags: [...(entry.spawnTags ?? [])],
        avoidSpawnTags: [...(entry.avoidSpawnTags ?? [])],
        spawnAvoidRadius: entry.spawnAvoidRadius,
        foregroundFade: entry.foregroundFade,
        foregroundFadeAlpha: entry.foregroundFadeAlpha,
        destroyRewards: entry.destroyRewards ? { ...entry.destroyRewards } : null,
        actionId: entry.actionId ?? null,
        defaultActionId: entry.defaultActionId ?? null,
        questTargetKey: entry.questTargetKey ?? null,
      })),
      decaySets: normalizedDecaySets.map((set) => ({
        id: set.id,
        weight: set.weight,
        sheetId: set.sheetId,
        rows: set.rows,
        cols: set.cols,
        fileName: set.fileName,
        renderScale: set.renderScale,
        variants: [...set.variants],
        particles: set.particles.map((entry) => ({ ...entry })),
      })),
      ambient: {
        ...((regionConfig.ambient && typeof regionConfig.ambient === "object") ? regionConfig.ambient : {}),
        particles: normalizeParticleConfigs(regionConfig.ambient?.particles).map((entry) => ({ ...entry })),
      },
      weather: resolveWeatherForRegion(regionConfig, seed + regionIndex * 9973),
      layout: regionConfig.layout ? {
        pool: Array.isArray(regionConfig.layout.pool)
          ? regionConfig.layout.pool.map((entry) => ({ id: entry.id, weight: entry.weight }))
          : [],
      } : null,
      prefabRules: regionConfig.prefabRules ? {
        maxTotal: regionConfig.prefabRules.maxTotal,
        minDistanceBetweenPrefabs: regionConfig.prefabRules.minDistanceBetweenPrefabs,
        anchors: [...(regionConfig.prefabRules.anchors ?? [])],
        pool: Array.isArray(regionConfig.prefabRules.pool)
          ? regionConfig.prefabRules.pool.map((entry) => ({ id: entry.id, weight: entry.weight, max: entry.max }))
          : [],
      } : null,
      spawnCounts: {
        objects: normalizedSpawnCounts.objects,
        foliage: normalizedSpawnCounts.foliage,
        decals: normalizedSpawnCounts.decals,
        water: normalizedSpawnCounts.water,
        monsters: { ...normalizedSpawnCounts.monsters },
      },
      antiDrops: {
        items: [...(regionConfig.antiDrops?.items ?? [])],
        resources: [...(regionConfig.antiDrops?.resources ?? [])],
        uniques: [...(regionConfig.antiDrops?.uniques ?? [])],
        named: [...(regionConfig.antiDrops?.named ?? [])],
        categories: [...(regionConfig.antiDrops?.categories ?? [])],
        rarities: [...(regionConfig.antiDrops?.rarities ?? [])],
        allResources: regionConfig.antiDrops?.allResources ?? false,
        allUniques: regionConfig.antiDrops?.allUniques ?? false,
        allNamed: regionConfig.antiDrops?.allNamed ?? false,
        allPotions: regionConfig.antiDrops?.allPotions ?? false,
        allQuestItems: regionConfig.antiDrops?.allQuestItems ?? false,
        allItems: regionConfig.antiDrops?.allItems ?? false,
      },
      mobs: [...(regionConfig.mobs ?? [])],
      ambientCritterDefaults: regionConfig.ambientCritterDefaults
        ? { ...regionConfig.ambientCritterDefaults }
        : null,
      ambientCritters: Array.isArray(regionConfig.ambientCritters)
        ? regionConfig.ambientCritters.map((entry) => ({ ...entry, count: entry?.count ? { ...entry.count } : entry?.count }))
        : [],
      rareMobs: Array.isArray(regionConfig.rareMobs)
        ? regionConfig.rareMobs.map((entry) => ({
          ...entry,
          loot: cloneRareMobLoot(entry.loot),
        }))
        : [],
      mapSize: regionConfig.mapSize ?? "medium",
    } : null,
    width: regionW,
    height: regionH,
    start,
    end,
    path,
    rooms,
    mask,
    prefabInstances: [],
    reservedTiles: new Set(),
    prefabDebug: null,
  };
  placeRegionPrefabs(region, regionConfig, (salt = 0) => seededRand(seed, 8800 + regionIndex * 97 + salt), {
    isPointPlayable: isRegionPointPlayable,
  });
  return region;
}

export function isRegionTilePlayable(region, x, y) {
  if (!region) return true;
  return region.mask.has(`${Math.floor(x)},${Math.floor(y)}`);
}

export function isRegionWaterTile(region, x, y) {
  if (!region) return false;
  if (Math.max(0, Number(region.mapRegion?.spawnCounts?.water) || 0) <= 0) return false;
  if (!(region.mapRegion?.waterSets?.length)) return false;
  const tileX = Math.floor(x);
  const tileY = Math.floor(y);
  if (!region.mask.has(`${tileX},${tileY}`)) return false;
  return regionWaterTile(region, tileX, tileY) !== null;
}

function pickWeightedWaterSet(region, salt) {
  const sets = region?.mapRegion?.waterSets ?? [];
  if (!sets.length) return null;
  const total = sets.reduce((sum, entry) => sum + Math.max(0, Number(entry.weight) || 0), 0);
  if (total <= 0) return sets[0];
  let cursor = rand01(region.seed, salt, 7710) * total;
  for (const entry of sets) {
    cursor -= Math.max(0, Number(entry.weight) || 0);
    if (cursor <= 0) return entry;
  }
  return sets[sets.length - 1];
}

function pickWaterVariant(set, tileX, tileY, salt) {
  const variants = Array.isArray(set?.variants) && set.variants.length
    ? set.variants
    : Array.from({ length: Math.max(1, Number(set?.variantCount) || 16) }, (_, index) => index);
  return variants[hashInt(tileX, tileY, 7600 + salt) % variants.length] ?? 0;
}

function regionWaterTile(region, tileX, tileY) {
  const patchCount = Math.max(0, Number(region?.mapRegion?.spawnCounts?.water) || 0);
  if (!region || patchCount <= 0 || !(region.mapRegion?.waterSets?.length)) return null;
  for (let i = 0; i < patchCount; i += 1) {
    const centerX = seededRegionCoord(region.seed, i, 7100, region.width);
    const centerY = seededRegionCoord(region.seed, i, 7200, region.height);
    if (
      Math.hypot(centerX - region.start.x, centerY - region.start.y) < SPAWN_CONFIG.regionStartClearRadius + 3
      || Math.hypot(centerX - region.end.x, centerY - region.end.y) < SPAWN_CONFIG.regionEndClearRadius + 2
    ) continue;
    const rx = 2.2 + rand01(region.seed, i, 7300) * 4.6;
    const ry = 1.8 + rand01(region.seed, i, 7400) * 4.0;
    const pathDistance = distanceToRegionPath(region, tileX + 0.5, tileY + 0.5);
    if (pathDistance < Math.max(2.4, Math.min(rx, ry) * 0.74)) continue;
    const nx = (tileX + 0.5 - centerX) / rx;
    const ny = (tileY + 0.5 - centerY) / ry;
    const wobble = rand01(tileX + region.seed, tileY - region.seed, 7500 + i) * 0.32 - 0.16;
    if (nx * nx + ny * ny > 1 + wobble) continue;
    if (
      Math.hypot(tileX + 0.5 - region.start.x, tileY + 0.5 - region.start.y) < SPAWN_CONFIG.regionStartClearRadius
      || Math.hypot(tileX + 0.5 - region.end.x, tileY + 0.5 - region.end.y) < SPAWN_CONFIG.regionEndClearRadius
    ) continue;
    const set = pickWeightedWaterSet(region, i);
    return {
      sheetId: set?.sheetId ?? null,
      variant: pickWaterVariant(set, tileX, tileY, i),
    };
  }
  return null;
}

export function isRegionPointPlayable(region, x, y, radius = 0) {
  if (!region) return true;
  const checks = radius > 0
    ? [[0, 0], [radius, 0], [-radius, 0], [0, radius], [0, -radius]]
    : [[0, 0]];
  return checks.every(([dx, dy]) => (
    isRegionTilePlayable(region, x + dx, y + dy)
    && !isRegionWaterTile(region, x + dx, y + dy)
  ));
}

export function createChunk(cx, cy, region = null) {
  const safeChunk = cx === 0 && cy === 0;
  const distanceLevel = Math.abs(cx) + Math.abs(cy);
  const chunk = {
    key: chunkKey(cx, cy),
    cx,
    cy,
    x: cx * CHUNK_SIZE,
    y: cy * CHUNK_SIZE,
    region,
    level: Math.max(1, 1 + Math.floor((region?.index ?? distanceLevel) * 0.9)),
    tiles: [],
    edgeTiles: [],
    decals: [],
    objects: [],
    monsters: [],
    npcs: [],
  };
  const waterTiles = buildChunkWaterTiles(region, cx, cy);

  for (let ty = 0; ty < CHUNK_SIZE; ty += 1) {
    for (let tx = 0; tx < CHUNK_SIZE; tx += 1) {
      const worldX = chunk.x + tx;
      const worldY = chunk.y + ty;
      if (region && !isRegionTilePlayable(region, worldX, worldY)) continue;
      const noise = hashInt(worldX, worldY, 31);
      const regionTileset = region?.mapRegion?.tileset;
      const chosenTileset = Array.isArray(regionTileset) && regionTileset.length
        ? pickWeightedTileset(regionTileset, noise / 4294967295)
        : regionTileset;
      const groundSheetId = chosenTileset?.sheetId ?? DEFAULT_GROUND_SHEET_ID;
      const lockedGroundVariant = Number.isInteger(chosenTileset?.lockedVariant)
        ? chosenTileset.lockedVariant
        : null;
      const edgeMask = region ? regionEdgeMask(region, worldX, worldY) : 0;
      const water = waterTiles.get(`${worldX},${worldY}`);
      chunk.tiles.push({
        x: worldX,
        y: worldY,
        groundSheetId,
        variant: lockedGroundVariant ?? (noise % GROUND_VARIANT_COUNT),
        water: water !== undefined,
        waterVariant: water?.variant,
        waterSheetId: water?.sheetId,
        path: region ? distanceToRegionPoint(region.start, worldX + 0.5, worldY + 0.5) < 4 || distanceToRegionPoint(region.end, worldX + 0.5, worldY + 0.5) < 3 : false,
        crack: noise % 9 === 0,
        moss: noise % 13 === 0,
        edgeMask,
      });
      if (edgeMask) chunk.edgeTiles.push({ x: worldX, y: worldY, edgeMask, variant: noise });
    }
  }

  if (!chunk.tiles.length) return chunk;
  addPrefabContent(chunk);
  addObjects(chunk, safeChunk);
  addFoliage(chunk, safeChunk);
  addDecals(chunk, safeChunk);
  addMonsters(chunk, safeChunk);
  return chunk;
}

function addPrefabContent(chunk) {
  if (!chunk.region?.prefabInstances?.length) return;
  const chunkBounds = { x: chunk.x, y: chunk.y, w: CHUNK_SIZE, h: CHUNK_SIZE };
  for (const instance of prefabInstancesForChunk(chunk.region, chunkBounds)) {
    addPrefabObjects(chunk, instance);
    addPrefabChests(chunk, instance);
    addPrefabFoliage(chunk, instance);
    addPrefabDecals(chunk, instance);
    addPrefabMonsters(chunk, instance);
    addPrefabNpcs(chunk, instance);
  }
}

function regionEdgeMask(region, x, y) {
  let mask = 0;
  if (!isRegionTilePlayable(region, x + 1, y)) mask |= 1;
  if (!isRegionTilePlayable(region, x - 1, y)) mask |= 2;
  if (!isRegionTilePlayable(region, x, y + 1)) mask |= 4;
  if (!isRegionTilePlayable(region, x, y - 1)) mask |= 8;
  return mask;
}

function buildChunkWaterTiles(region, cx, cy) {
  const waterTiles = new Map();
  const waterCount = Math.max(0, Number(region?.mapRegion?.spawnCounts?.water) || 0);
  if (!region || waterCount <= 0 || !(region.mapRegion?.waterSets?.length)) return waterTiles;

  const left = cx * CHUNK_SIZE;
  const right = left + CHUNK_SIZE - 1;
  const top = cy * CHUNK_SIZE;
  const bottom = top + CHUNK_SIZE - 1;
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const water = regionWaterTile(region, x, y);
      if (water !== null) {
        waterTiles.set(`${x},${y}`, water);
      }
    }
  }
  return waterTiles;
}

function seededRegionCoord(seed, index, salt, max) {
  return 2 + rand01(seed + index * 977, index * 131, salt) * Math.max(1, max - 4);
}

function distanceToRegionPath(region, x, y) {
  const path = region?.path ?? [];
  if (path.length < 2) return Infinity;
  let best = Infinity;
  for (let i = 0; i < path.length - 1; i += 1) {
    const a = path[i];
    const b = path[i + 1];
    best = Math.min(best, distanceToSegment(x, y, a.x, a.y, b.x, b.y));
  }
  return best;
}

function regionObjectPool(region) {
  const configured = region?.mapRegion?.objects;
  if (Array.isArray(configured) && configured.length) return configured;
  return [];
}

function pickRegionObjectEntry(entries, cx, cy, salt) {
  if (!entries?.length) return null;
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  if (total <= 0) return null;
  let cursor = rand01(cx, cy, 3300 + salt) * total;
  for (const entry of entries) {
    cursor -= entry.weight;
    if (cursor <= 0) return entry;
  }
  return entries[entries.length - 1];
}

function pickWeightedFoliageSet(entries, cx, cy, salt) {
  if (!entries?.length) return null;
  const total = entries.reduce((sum, entry) => sum + Math.max(0, Number(entry.weight) || 0), 0);
  if (total <= 0) return entries[Math.floor(rand01(cx, cy, salt) * entries.length)] ?? entries[0];
  let cursor = rand01(cx, cy, salt) * total;
  for (const entry of entries) {
    cursor -= Math.max(0, Number(entry.weight) || 0);
    if (cursor <= 0) return entry;
  }
  return entries[entries.length - 1];
}

function rollFoliageResourceDrops(entry, cx, cy, foliageIndex) {
  const drops = Array.isArray(entry?.resourceDrops) ? entry.resourceDrops : [];
  if (!drops.length) return [];
  const rolled = [];
  for (let i = 0; i < drops.length; i += 1) {
    const drop = drops[i];
    const chance = Math.max(0, Math.min(1, Number(drop.chance) || 0));
    if (chance <= 0 || rand01(cx, cy, 7060 + foliageIndex * 97 + i * 13) > chance) continue;
    const min = Math.max(1, Math.floor(Number(drop.min) || 1));
    const max = Math.max(min, Math.floor(Number(drop.max) || min));
    const count = min + Math.floor(rand01(cx, cy, 7070 + foliageIndex * 97 + i * 13) * (max - min + 1));
    rolled.push({
      resource: drop.resource,
      count,
    });
  }
  return rolled;
}

function pointInChunk(chunk, x, y) {
  return x >= chunk.x && x < chunk.x + CHUNK_SIZE && y >= chunk.y && y < chunk.y + CHUNK_SIZE;
}

function prefabWorldPoint(instance, item) {
  return {
    x: instance.x + (Number(item.x) || 0) + 0.5,
    y: instance.y + (Number(item.y) || 0) + 0.5,
  };
}

function initialObjectDamageState(def, spawnDamage, randValue = 0) {
  const maxHp = Math.max(1, Math.floor(Number(def?.hp) || 1));
  const stages = Math.max(1, Math.floor(Number(def?.damageStages) || 3));
  const damagedHits = Math.min(1, stages - 1);
  const destroyedHits = Math.max(0, stages - 1);
  const mode = normalizeObjectSpawnDamage(spawnDamage);
  let options = [0];
  if (mode === "all") options = [0, damagedHits, destroyedHits];
  else if (mode === "damaged") options = [damagedHits];
  else if (mode === "destroyed") options = [destroyedHits];
  else if (mode === "damaged_destroyed") options = [damagedHits, destroyedHits];

  const uniqueOptions = [...new Set(options.filter((hits) => Number.isFinite(hits) && hits >= 0))];
  const index = Math.min(uniqueOptions.length - 1, Math.floor(Math.max(0, Math.min(1, randValue)) * uniqueOptions.length));
  const harvestHits = uniqueOptions[Math.max(0, index)] ?? 0;
  const remainingStages = Math.max(1, stages - harvestHits);
  const hp = Math.max(1, Math.ceil(maxHp * (remainingStages / stages)));
  return harvestHits > 0
    ? { maxHp, hp, harvestHits }
    : { maxHp, hp };
}

function objectSpawnMetadataFromDef(def) {
  return {
    spawnTags: Array.isArray(def?.spawnTags) ? def.spawnTags.map(String).filter(Boolean) : [],
    avoidSpawnTags: Array.isArray(def?.avoidSpawnTags) ? def.avoidSpawnTags.map(String).filter(Boolean) : [],
    spawnAvoidRadius: Number.isFinite(Number(def?.spawnAvoidRadius)) && Number(def.spawnAvoidRadius) > 0
      ? Number(def.spawnAvoidRadius)
      : null,
    foregroundFade: Boolean(def?.foregroundFade),
    foregroundFadeAlpha: Number.isFinite(Number(def?.foregroundFadeAlpha))
      ? Math.min(1, Math.max(0.1, Number(def.foregroundFadeAlpha)))
      : undefined,
    tags: Array.isArray(def?.tags) ? def.tags.map(String).filter(Boolean) : [],
    factionId: def?.factionId ? String(def.factionId) : null,
    onDestroyed: def?.onDestroyed && typeof def.onDestroyed === "object" ? { ...def.onDestroyed } : null,
    questTargetKey: def?.questTargetKey ? String(def.questTargetKey) : null,
  };
}

function objectGraphicsVariantInfo(def, variant) {
  const graphics = def?.graphics ?? {};
  const files = (Array.isArray(graphics.files) ? graphics.files : [graphics.fileName])
    .map((file) => String(file ?? "").trim())
    .filter(Boolean);
  const rows = Math.max(1, Math.floor(Number(graphics.rows) || 4));
  const cols = Math.max(1, Math.floor(Number(graphics.cols) || 4));
  const frameCount = Math.max(1, Math.floor(Number(graphics.frameCount) || rows * cols));
  const index = Math.max(0, Math.floor(Number(variant) || 0));
  return {
    graphicsFileName: files.length ? files[Math.floor(index / frameCount) % files.length] : null,
    frameIndex: index % frameCount,
  };
}

function runtimeObjectParticles(def, runtimeObject, regionObjectConfig, rand) {
  const legacyParticles = rollParticleConfigs(
    normalizeParticleConfigs(regionObjectConfig?.particles ?? def?.particles),
    rand,
  );
  const attachedParticles = resolveAttachedObjectParticleConfigs({
    objectDef: def,
    runtimeObject,
    regionObjectConfig,
  });
  return [...legacyParticles, ...attachedParticles];
}

function objectAvoidsSpawnZone(object, producer) {
  const avoidTags = Array.isArray(object?.avoidSpawnTags) ? object.avoidSpawnTags : [];
  const producerTags = Array.isArray(producer?.spawnTags) ? producer.spawnTags : [];
  const avoidRadius = Number(producer?.spawnAvoidRadius) || 0;
  if (!avoidTags.length || !producerTags.length || avoidRadius <= 0 || object.id === producer.id) return false;
  if (!avoidTags.some((tag) => producerTags.includes(tag))) return false;
  return Math.hypot(object.x - producer.x, object.y - producer.y) < avoidRadius;
}

function applySpawnAvoidance(chunk) {
  const producers = chunk.objects.filter((object) => (
    Array.isArray(object.spawnTags)
    && object.spawnTags.length
    && Number(object.spawnAvoidRadius) > 0
  ));
  if (!producers.length) return;
  chunk.objects = chunk.objects.filter((object) => !producers.some((producer) => objectAvoidsSpawnZone(object, producer)));
}

function addPrefabObjects(chunk, instance) {
  for (let i = 0; i < (instance.objects ?? []).length; i += 1) {
    const item = instance.objects[i];
    const def = REGION_OBJECT_DEFS[item.id];
    if (!def) {
      console.warn(`[map-prefabs] Unknown object id: ${item.id}`);
      continue;
    }
    const spawnTypes = Array.isArray(def.spawnTypes) ? def.spawnTypes : [];
    const type = spawnTypes[0]?.type;
    if (!type) {
      console.warn(`[map-prefabs] Object has no spawn type: ${item.id}`);
      continue;
    }
    const { x, y } = prefabWorldPoint(instance, item);
    if (!pointInChunk(chunk, x, y)) continue;
    if (!isRegionPointPlayable(chunk.region, x, y, 0.35) || isWaterAt(chunk, x, y)) continue;

    const tuning = OBJECT_SPAWN_TUNING[type]
      ?? OBJECT_SPAWN_TUNING[getRegionObjectFamily(type)]
      ?? OBJECT_SPAWN_TUNING.default;
    const radius = Number(item.radius) || tuning.radius;
    const resolvedDef = resolveRegionObjectDestructibleDef(type);
    const effectiveDestructible = typeof item.destructible === "boolean"
      ? item.destructible
      : def.defaultDestructible !== false && Boolean(resolvedDef);
    const damageState = resolvedDef && (effectiveDestructible || item.spawnDamage || item.damageState || item.damageSpawn)
      ? initialObjectDamageState(resolvedDef, item.spawnDamage ?? item.damageState ?? item.damageSpawn, rand01(chunk.cx, chunk.cy, 7940 + i))
      : {};
    const spawnMetadata = objectSpawnMetadataFromDef(def);
    if (Array.isArray(item.spawnTags)) spawnMetadata.spawnTags = item.spawnTags.map(String).filter(Boolean);
    if (Array.isArray(item.avoidSpawnTags)) spawnMetadata.avoidSpawnTags = item.avoidSpawnTags.map(String).filter(Boolean);
    if (Number.isFinite(Number(item.spawnAvoidRadius)) && Number(item.spawnAvoidRadius) > 0) {
      spawnMetadata.spawnAvoidRadius = Number(item.spawnAvoidRadius);
    }
    if (item.foregroundFade !== undefined) spawnMetadata.foregroundFade = Boolean(item.foregroundFade);
    if (Number.isFinite(Number(item.foregroundFadeAlpha))) {
      spawnMetadata.foregroundFadeAlpha = Math.min(1, Math.max(0.1, Number(item.foregroundFadeAlpha)));
    }
    if (Array.isArray(item.tags)) spawnMetadata.tags = item.tags.map(String).filter(Boolean);
    if (item.factionId !== undefined) spawnMetadata.factionId = String(item.factionId ?? "").trim() || null;
    if (item.onDestroyed && typeof item.onDestroyed === "object") spawnMetadata.onDestroyed = { ...item.onDestroyed };
    if (item.questTargetKey !== undefined) spawnMetadata.questTargetKey = String(item.questTargetKey ?? "").trim() || null;
    const treeVariant = Number.isFinite(Number(item.variant))
      ? Math.max(0, Math.floor(Number(item.variant)))
      : Math.floor(rand01(chunk.cx, chunk.cy, 7910 + i) * Math.max(1, Math.floor(Number(item.variantCount) || resolveRegionObjectVariantCount(type))));
    const variantInfo = objectGraphicsVariantInfo(def, treeVariant);
    const runtimeObject = {
      id: createId(),
      runtimeId: `${chunk.region?.id ?? "region"}:prefab:${instance.instanceId}:object:${i}:${item.id}`,
      objectDefId: item.id,
      type,
      x,
      y,
      radius,
      size: Number(item.size) || tuning.sizeBase,
      rotation: (Number(item.rotation) || 0) + (instance.rotation * Math.PI) / 180,
      colorShift: rand01(chunk.cx, chunk.cy, 7900 + i),
      flip: instance.mirrored,
      treeVariant,
      ...variantInfo,
      animSeed: rand01(chunk.cx, chunk.cy, 7920 + i) * Math.PI * 2,
      visualScale: Number(item.visualScale) || 1,
      blocking: item.blocking !== false,
      destructible: effectiveDestructible,
      renderBiomeId: def.renderBiomeId ?? null,
      graphicsRef: def.graphicsRef ?? null,
      particles: [],
      effects: item.effects && typeof item.effects === "object" ? { ...item.effects } : null,
      depthMode: def.depthMode ?? "dynamic",
      sortAnchor: def.sortAnchor ? { ...def.sortAnchor } : { x: 0.5, y: 1 },
      depthOffset: Number.isFinite(Number(def.depthOffset)) ? Number(def.depthOffset) : 0,
      ...spawnMetadata,
      destroyRewards: item.destroyRewards ? { ...item.destroyRewards } : def.destroyRewards ? { ...def.destroyRewards } : null,
      actionId: item.actionId ? String(item.actionId) : null,
      actions: Array.isArray(item.actions) ? item.actions.map((entry) => ({ ...entry })) : null,
      defaultActionId: def.defaultActionId ? String(def.defaultActionId) : null,
      ...damageState,
      prefabId: instance.id,
      prefabInstanceId: instance.instanceId,
    };
    runtimeObject.particles = runtimeObjectParticles(def, runtimeObject, item, () => rand01(chunk.cx, chunk.cy, 7930 + i));
    chunk.objects.push(runtimeObject);
  }
}

function resolvePrefabFoliage(item, chunk, index) {
  const direct = normalizeRegionFoliageSets({ foliageSet: item })[0] ?? null;
  if (direct) {
    return {
      sheetId: direct.sheetId,
      variantCount: direct.variantCount,
      scale: direct.scale,
      resourceDrops: direct.resourceDrops,
      particles: rollParticleConfigs(direct.particles, () => rand01(chunk.cx, chunk.cy, 7965 + index)),
      depthMode: direct.depthMode,
      sortAnchor: direct.sortAnchor ? { ...direct.sortAnchor } : { x: 0.5, y: 1 },
      depthOffset: direct.depthOffset,
    };
  }
  return {
    sheetId: item.id ?? chunk.region?.mapRegion?.foliageSets?.[0]?.sheetId ?? null,
    variantCount: Math.max(1, Math.floor(Number(item.variantCount) || 64)),
    scale: null,
    resourceDrops: [],
    particles: [],
    depthMode: "ground",
    sortAnchor: { x: 0.5, y: 1 },
    depthOffset: 0,
  };
}

function addPrefabFoliage(chunk, instance) {
  for (let i = 0; i < (instance.foliage ?? []).length; i += 1) {
    const item = instance.foliage[i];
    const { x, y } = prefabWorldPoint(instance, item);
    if (!pointInChunk(chunk, x, y)) continue;
    if (!isRegionPointPlayable(chunk.region, x, y, 0.2) || isWaterAt(chunk, x, y)) continue;
    const foliage = resolvePrefabFoliage(item, chunk, i);
    const fixedScale = Number(item.scale ?? foliage.scale);
    const hasFixedScale = Number.isFinite(fixedScale) && fixedScale > 0;
    chunk.objects.push({
      id: createId(),
      type: "foliage",
      x,
      y,
      radius: 0,
      size: hasFixedScale ? fixedScale : Number(item.size) || 0.72,
      rotation: (Number(item.rotation) || 0) + (instance.rotation * Math.PI) / 180,
      colorShift: rand01(chunk.cx, chunk.cy, 7940 + i),
      flip: instance.mirrored,
      foliageVariant: Number.isFinite(Number(item.cell))
        ? Math.max(0, Math.floor(Number(item.cell)) - 1)
        : Number.isFinite(Number(item.variant))
        ? Math.floor(Number(item.variant))
        : Math.floor(rand01(chunk.cx, chunk.cy, 7950 + i) * foliage.variantCount),
      foliageSheet: foliage.sheetId,
      animSeed: rand01(chunk.cx, chunk.cy, 7960 + i) * Math.PI * 2,
      visualScale: hasFixedScale ? 1 : Number(item.visualScale) || 1,
      wind: 0.1,
      resourceDrops: foliage.resourceDrops,
      particles: foliage.particles,
      depthMode: foliage.depthMode,
      sortAnchor: foliage.sortAnchor,
      depthOffset: foliage.depthOffset,
      foliageLooted: false,
      blocking: false,
      prefabId: instance.id,
      prefabInstanceId: instance.instanceId,
    });
  }
}

function addPrefabChests(chunk, instance) {
  for (let i = 0; i < (instance.chests ?? []).length; i += 1) {
    const item = instance.chests[i];
    const { x, y } = prefabWorldPoint(instance, item);
    if (!pointInChunk(chunk, x, y)) continue;
    if (!isRegionPointPlayable(chunk.region, x, y, 0.42) || isWaterAt(chunk, x, y)) continue;
    chunk.objects.push({
      id: createId(),
      runtimeId: `${chunk.region?.id ?? "region"}:prefab:${instance.instanceId}:chest:${i}:${item.id ?? "chest"}`,
      objectDefId: "object_chests_ground",
      type: "object_chests_ground",
      x,
      y,
      radius: 0.42,
      size: 1,
      rotation: (Number(item.rotation) || 0) + (instance.rotation * Math.PI) / 180,
      colorShift: 0,
      flip: instance.mirrored,
      treeVariant: 0,
      animSeed: 0,
      visualScale: 1,
      blocking: item.blocking !== false,
      depthMode: "dynamic",
      sortAnchor: { x: 0.5, y: 0.9 },
      depthOffset: 0,
      actionId: item.actionId ? String(item.actionId) : "open_map_chest",
      prefabId: instance.id,
      prefabInstanceId: instance.instanceId,
      prefabChestId: item.id ?? "chest",
    });
  }
}

function resolvePrefabDecay(item, chunk, index) {
  const decayId = String(item.decayId ?? item.id ?? "").trim();
  const def = DECAY_SET_DEFS[decayId];
  if (!def) return null;
  const rows = Math.max(1, Math.floor(Number(def.rows) || 4));
  const cols = Math.max(1, Math.floor(Number(def.cols) || 4));
  const variantCount = rows * cols;
  const explicitVariant = Number.isFinite(Number(item.decayVariant))
    ? Number(item.decayVariant)
    : Number.isFinite(Number(item.variant))
      ? Number(item.variant)
      : Number.isFinite(Number(item.cell))
        ? Number(item.cell) - 1
        : null;
  const variant = explicitVariant === null
    ? hashInt(chunk.cx, chunk.cy, 7975 + index) % variantCount
    : Math.max(0, Math.floor(explicitVariant)) % variantCount;
  const renderConfig = normalizeDecayRenderConfig({
    ...def,
    ...item,
    renderScale: item.renderScale ?? item.decayRenderScale ?? def.renderScale,
    projection: item.projection ?? item.sourceProjection ?? def.projection ?? def.sourceProjection,
  });
  return {
    decaySheetId: buildDecaySheetId(decayId),
    decayVariant: variant,
    decayRenderScale: renderConfig.renderScale,
    decayProjection: renderConfig.projection,
    decayBlendMode: renderConfig.blendMode,
    decayRotation: renderConfig.rotation,
    decayRandomRotation: renderConfig.randomRotation,
    decayWidthScale: renderConfig.widthScale,
    decayHeightScale: renderConfig.heightScale,
    decayOffsetX: renderConfig.offsetX,
    decayOffsetY: renderConfig.offsetY,
    decayAnchorX: renderConfig.anchorX,
    decayAnchorY: renderConfig.anchorY,
    decayAlpha: renderConfig.alpha,
    decayAlphaExplicit: renderConfig.alpha !== null || Number.isFinite(Number(item.alpha)),
    particles: rollParticleConfigs(
      normalizeParticleConfigs(item.particles ?? def.particles),
      () => rand01(chunk.cx, chunk.cy, 7985 + index),
    ),
  };
}

function addPrefabDecals(chunk, instance) {
  for (let i = 0; i < (instance.decals ?? []).length; i += 1) {
    const item = instance.decals[i];
    const { x, y } = prefabWorldPoint(instance, item);
    if (!pointInChunk(chunk, x, y)) continue;
    if (!isRegionPointPlayable(chunk.region, x, y, 0.15) || isWaterAt(chunk, x, y)) continue;
    const decay = resolvePrefabDecay(item, chunk, i);
    chunk.decals.push({
      id: createId(),
      type: item.type ?? item.id ?? "debris",
      x,
      y,
      size: Number(item.size) || 0.9,
      rotation: decay?.decayProjection === "iso" && decay?.decayRotation === null && decay?.decayRandomRotation !== true
        ? 0
        : (Number.isFinite(Number(item.rotation)) ? Number(item.rotation) : decay?.decayRotation ?? 0)
          + (decay?.decayProjection === "iso" ? 0 : (instance.rotation * Math.PI) / 180),
      color: rand01(chunk.cx, chunk.cy, 7970 + i),
      alpha: Number.isFinite(Number(item.alpha))
        ? Number(item.alpha)
        : decay?.decayAlpha ?? (decay?.decayProjection === "iso" ? 1 : 0.42),
      animSeed: rand01(chunk.cx, chunk.cy, 7980 + i) * Math.PI * 2,
      decaySheetId: decay?.decaySheetId,
      decayVariant: decay?.decayVariant,
      decayRenderScale: decay?.decayRenderScale,
      decayProjection: decay?.decayProjection,
      decayBlendMode: decay?.decayBlendMode,
      decayRandomRotation: decay?.decayRandomRotation,
      decayWidthScale: decay?.decayWidthScale,
      decayHeightScale: decay?.decayHeightScale,
      decayOffsetX: decay?.decayOffsetX,
      decayOffsetY: decay?.decayOffsetY,
      decayAnchorX: decay?.decayAnchorX,
      decayAnchorY: decay?.decayAnchorY,
      decayAlphaExplicit: decay?.decayAlphaExplicit,
      particles: decay?.particles ?? [],
      prefabId: instance.id,
      prefabInstanceId: instance.instanceId,
    });
  }
}

function addPrefabMonsters(chunk, instance) {
  for (let i = 0; i < (instance.monsters ?? []).length; i += 1) {
    const item = instance.monsters[i];
    const monsterType = item.type ?? item.typeName;
    const base = MONSTER_STATS[monsterType];
    if (!base) {
      console.warn(`[map-prefabs] Unknown monster type: ${monsterType}`);
      continue;
    }
    const { x, y } = prefabWorldPoint(instance, item);
    if (!pointInChunk(chunk, x, y)) continue;
    if (!isRegionPointPlayable(chunk.region, x, y, 0.5) || isWaterAt(chunk, x, y)) continue;
    const level = chunk.level + Math.floor(rand01(chunk.cx, chunk.cy, 7990 + i) * 2);
    const hp = Math.floor(base.hp * (1 + level * 0.18));
    chunk.monsters.push({
      id: createId(),
      typeName: monsterType,
      x,
      y,
      vx: 0,
      vy: 0,
      radius: base.radius,
      baseLevel: level,
      level,
      maxHp: hp,
      hp,
      damage: Math.floor(base.damage * (1 + level * 0.16)),
      speed: base.speed * (1 + Math.min(0.32, level * 0.025)),
      baseSpeed: base.speed * (1 + Math.min(0.32, level * 0.025)),
      range: base.range,
      magic: Math.floor(Number(base.magic) || 0),
      critChance: Number(base.critChance) || 0,
      critDamage: Number(base.critDamage) || 1.5,
      blockChance: Number(base.blockChance) || 0,
      dodgeChance: Number(base.dodgeChance) || 0,
      physicalResist: Number(base.physicalResist) || 0,
      fireResist: Number(base.fireResist) || 0,
      iceResist: Number(base.iceResist) || 0,
      lightningResist: Number(base.lightningResist) || 0,
      poisonResist: Number(base.poisonResist) || 0,
      arcaneResist: Number(base.arcaneResist) || 0,
      holyResist: Number(base.holyResist) || 0,
      shadowResist: Number(base.shadowResist) || 0,
      natureResist: Number(base.natureResist) || 0,
      allResist: Number(base.allResist) || 0,
      spells: [...(base.spells ?? [])],
      killLydra: Math.max(0, Number(base.killLydra) || 0),
      killNetdra: Math.max(0, Number(base.killNetdra) || 0),
      eliteKillLydra: Math.max(0, Number(base.eliteKillLydra) || 0),
      eliteKillNetdra: Math.max(0, Number(base.eliteKillNetdra) || 0),
      speciesId: base.speciesId,
      factionId: base.factionId,
      tags: Array.isArray(base.tags) ? [...base.tags] : [],
      spellCooldown: 0.6 + rand01(chunk.cx, chunk.cy, 8000 + i) * 1.5,
      statusEffects: [],
      allowElite: base.allowElite !== false,
      isBoss: Boolean(base.isBoss),
      boss: base.isBoss ? { ...BOSS_TINT } : null,
      noLoot: Boolean(base.noLoot),
      despawnOnDeath: Boolean(base.despawnOnDeath),
      onHitStatus: base.onHitStatus ? { ...base.onHitStatus } : null,
      leapAttack: base.leapAttack ? { ...base.leapAttack } : null,
      attackCooldownConfig: base.attackCooldown ? { ...base.attackCooldown } : null,
      meleeAreaDamage: base.meleeAreaDamage ? { ...base.meleeAreaDamage } : null,
      shadow: base.shadow ? { ...base.shadow } : null,
      haveMinion: Boolean(base.haveMinion),
      minions: base.minions ?? false,
      minionCooldown: Number(base.minions?.cooldown) || 0,
      isMinion: false,
      minionOwnerId: null,
      aggro: base.range > 1 ? 8.2 : 6.7,
      attackCooldown: 0.3 + rand01(chunk.cx, chunk.cy, 8010 + i),
      color: base.color,
      xp: Math.floor(base.xp * (1 + level * 0.15)),
      animSeed: rand01(chunk.cx, chunk.cy, 8020 + i) * Math.PI * 2,
      breathSpeed: 1.6 + rand01(chunk.cx, chunk.cy, 8030 + i) * 1.4,
      visualScale: 0.9 + rand01(chunk.cx, chunk.cy, 8040 + i) * 0.22,
      facingX: 1,
      facingY: 0,
      moving: false,
      gait: rand01(chunk.cx, chunk.cy, 8050 + i) * Math.PI * 2,
      moveSpeed: 0,
      attackAnim: 0,
      dead: false,
      hurt: 0,
      prefabId: instance.id,
      prefabInstanceId: instance.instanceId,
    });
  }
}

function addPrefabNpcs(chunk, instance) {
  for (let i = 0; i < (instance.npcs ?? []).length; i += 1) {
    const item = instance.npcs[i];
    const npcId = String(item.npcId ?? item.id ?? "").trim();
    const def = QUEST_NPCS[npcId];
    if (!def) {
      console.warn(`[map-prefabs] Unknown NPC id: ${npcId || "(empty)"}`);
      continue;
    }
    const { x, y } = prefabWorldPoint(instance, item);
    if (!pointInChunk(chunk, x, y)) continue;
    if (!isRegionPointPlayable(chunk.region, x, y, 0.35) || isWaterAt(chunk, x, y)) continue;
    chunk.npcs.push({
      id: createId(),
      runtimeId: `${chunk.region?.id ?? "region"}:prefab:${instance.instanceId}:npc:${i}:${npcId}`,
      type: "npc",
      npcId,
      name: def.name,
      title: def.title,
      imageUrl: def.imageUrl,
      x,
      y,
      radius: Number(item.radius) || 0.45,
      facing: item.facing ?? "south",
      facingX: 0,
      facingY: 1,
      bob: rand01(chunk.cx, chunk.cy, 8060 + i) * Math.PI * 2,
      actionId: item.actionId ? String(item.actionId) : null,
      actions: Array.isArray(item.actions) ? item.actions.map((entry) => ({ ...entry })) : null,
      defaultActionId: def.defaultActionId ? String(def.defaultActionId) : null,
      defaultActions: Array.isArray(def.defaultActions) ? def.defaultActions.map((entry) => ({ ...entry })) : null,
      prefabId: instance.id,
      prefabInstanceId: instance.instanceId,
    });
  }
}

function addObjects(chunk, safeChunk) {
  const objectPool = regionObjectPool(chunk.region);
  const objectCount = spawnCount(chunk, "objects");
  const center = SPAWN_CONFIG.safeCenter;

  for (let i = 0; i < objectCount; i += 1) {
    const selectedEntry = pickRegionObjectEntry(objectPool, chunk.cx, chunk.cy, i);
    const type = selectedEntry ? pickObjectSpawnType(selectedEntry, rand01(chunk.cx, chunk.cy, 3320 + i)) : null;
    if (!type) continue;
    const localX = 1 + rand01(chunk.cx, chunk.cy, 100 + i) * (CHUNK_SIZE - 2);
    const localY = 1 + rand01(chunk.cx, chunk.cy, 200 + i) * (CHUNK_SIZE - 2);
    const x = chunk.x + localX;
    const y = chunk.y + localY;
    if (isWaterAt(chunk, x, y)) continue;
    if (chunk.region && isReservedTile(chunk.region, x, y)) continue;
    if (chunk.region && !isRegionPointPlayable(chunk.region, x, y, 0.7)) continue;
    if (chunk.region && (
      Math.hypot(x - chunk.region.start.x, y - chunk.region.start.y) < SPAWN_CONFIG.regionStartClearRadius
      || Math.hypot(x - chunk.region.end.x, y - chunk.region.end.y) < SPAWN_CONFIG.regionEndClearRadius
    )) continue;
    if (safeChunk && Math.hypot(localX - center.x, localY - center.y) < SPAWN_CONFIG.objectSafeRadius) continue;

    const tuning = OBJECT_SPAWN_TUNING[type]
      ?? OBJECT_SPAWN_TUNING[getRegionObjectFamily(type)]
      ?? OBJECT_SPAWN_TUNING.default;
    const radius = tuning.radius;
    const size = tuning.sizeBase + (tuning.sizeRange ? rand01(chunk.cx, chunk.cy, tuning.sizeSalt + i) * tuning.sizeRange : 0);

    const resolvedDef = resolveRegionObjectDestructibleDef(type);
    const explicitDestructible = typeof selectedEntry?.destructible === "boolean"
      ? selectedEntry.destructible
      : null;
    const effectiveDestructible = explicitDestructible ?? selectedEntry?.defaultDestructible ?? Boolean(resolvedDef);
    const damageState = resolvedDef && (effectiveDestructible || selectedEntry?.spawnDamage)
      ? initialObjectDamageState(resolvedDef, selectedEntry?.spawnDamage, rand01(chunk.cx, chunk.cy, 7950 + i))
      : {};
    
    // Handle scale: fixed, range, or default (1.0)
    const objectScale = selectedEntry?.scale;
    let visualScale;
    if (objectScale?.type === "fixed") {
      visualScale = objectScale.value;
    } else if (objectScale?.type === "range") {
      visualScale = objectScale.min + rand01(chunk.cx, chunk.cy, 590 + i) * (objectScale.max - objectScale.min);
    } else {
      visualScale = 1; // Default: no variation, normal size
    }
    
    const treeVariant = Math.floor(rand01(chunk.cx, chunk.cy, 545 + i) * Math.max(1, Math.floor(Number(selectedEntry?.variantCount) || 16)));
    const selectedDef = REGION_OBJECT_DEFS[selectedEntry?.id] ?? null;
    const variantInfo = objectGraphicsVariantInfo(selectedDef, treeVariant);
    const runtimeObject = {
      id: createId(),
      runtimeId: `${chunk.region?.id ?? "region"}:chunk:${chunk.cx},${chunk.cy}:object:${i}:${selectedEntry?.id ?? type}:${x.toFixed(2)},${y.toFixed(2)}`,
      objectDefId: selectedEntry?.id ?? null,
      type,
      x,
      y,
      radius,
      size,
      rotation: rand01(chunk.cx, chunk.cy, 400 + i) * Math.PI * 2,
      colorShift: rand01(chunk.cx, chunk.cy, 500 + i),
      flip: rand01(chunk.cx, chunk.cy, 530 + i) > 0.5,
      treeVariant,
      ...variantInfo,
      animSeed: rand01(chunk.cx, chunk.cy, 560 + i) * Math.PI * 2,
      visualScale,
      blocking: true,
      destructible: effectiveDestructible,
      renderBiomeId: selectedEntry?.renderBiomeId ?? null,
      graphicsRef: selectedEntry?.graphicsRef ?? null,
      particles: [],
      effects: selectedEntry?.effects ? { ...selectedEntry.effects } : null,
      depthMode: selectedEntry?.depthMode ?? "dynamic",
      sortAnchor: selectedEntry?.sortAnchor ? { ...selectedEntry.sortAnchor } : { x: 0.5, y: 1 },
      depthOffset: Number.isFinite(Number(selectedEntry?.depthOffset)) ? Number(selectedEntry.depthOffset) : 0,
      spawnTags: [...(selectedEntry?.spawnTags ?? [])],
      avoidSpawnTags: [...(selectedEntry?.avoidSpawnTags ?? [])],
      spawnAvoidRadius: selectedEntry?.spawnAvoidRadius ?? null,
      foregroundFade: Boolean(selectedEntry?.foregroundFade),
      foregroundFadeAlpha: selectedEntry?.foregroundFadeAlpha,
      tags: [...(selectedEntry?.tags ?? [])],
      factionId: selectedEntry?.factionId ?? null,
      onDestroyed: selectedEntry?.onDestroyed ? { ...selectedEntry.onDestroyed } : null,
      destroyRewards: selectedEntry?.destroyRewards ? { ...selectedEntry.destroyRewards } : null,
      actionId: selectedEntry?.actionId ? String(selectedEntry.actionId) : null,
      defaultActionId: selectedEntry?.defaultActionId ? String(selectedEntry.defaultActionId) : null,
      questTargetKey: selectedEntry?.questTargetKey ? String(selectedEntry.questTargetKey) : null,
      // TODO: Support occluder metadata here for future pixel/shape masking.
      ...damageState,
    };
    runtimeObject.particles = runtimeObjectParticles(selectedDef, runtimeObject, selectedEntry, () => rand01(chunk.cx, chunk.cy, 7600 + i));
    chunk.objects.push(runtimeObject);
  }

  applySpawnAvoidance(chunk);
  addRegionChest(chunk);
}

function addRegionChest(chunk) {
  if (!chunk.region) return;
  if (chunk.region.chestOpened) return;
  const { end } = chunk.region;
  if (chunkCoords(end.x, end.y).cx !== chunk.cx || chunkCoords(end.x, end.y).cy !== chunk.cy) return;

  const candidates = [
    { x: end.x - 2.8, y: end.y + 1.2 },
    { x: end.x - 3.4, y: end.y },
    { x: end.x - 2.3, y: end.y - 1.5 },
    { x: end.x - 1.4, y: end.y + 2.0 },
    { x: end.x, y: end.y + 2.4 },
    { x: end.x - 4.1, y: end.y + 1.8 },
    { x: end.x - 3.2, y: end.y - 2.2 },
  ];
  const radius = 0.42;
  const position = candidates.find((candidate) => (
    chunkCoords(candidate.x, candidate.y).cx === chunk.cx
    && chunkCoords(candidate.x, candidate.y).cy === chunk.cy
    && !isReservedTile(chunk.region, candidate.x, candidate.y)
    && isRegionPointPlayable(chunk.region, candidate.x, candidate.y, radius)
    && !collidesWithBlockingObject(chunk, candidate.x, candidate.y, radius)
  ));
  if (!position) return;

  chunk.objects.push({
    id: createId(),
    runtimeId: `map-end-chest:${chunk.region?.mapRegion?.id ?? chunk.region?.id ?? "region"}`,
    objectDefId: "object_chests_ground",
    type: "object_chests_ground",
    x: position.x,
    y: position.y,
    radius,
    size: 1,
    rotation: 0,
    colorShift: 0,
    flip: false,
    treeVariant: 0,
    animSeed: 0,
    visualScale: 1,
    blocking: true,
    depthMode: "dynamic",
    sortAnchor: { x: 0.5, y: 0.9 },
    depthOffset: 0,
    actionId: "open_map_chest",
  });
}

function collidesWithBlockingObject(chunk, x, y, radius) {
  return chunk.objects.some((object) => (
    object.blocking
    && Math.hypot(object.x - x, object.y - y) < object.radius + radius + 0.12
  ));
}

function addFoliage(chunk, safeChunk) {
  const count = spawnCount(chunk, "foliage");
  const center = SPAWN_CONFIG.safeCenter;
  const regionFoliageSets = chunk.region?.mapRegion?.foliageSets ?? [];
  if (!regionFoliageSets.length) return;

  for (let i = 0; i < count; i += 1) {
    const localX = -0.15 + rand01(chunk.cx, chunk.cy, 6100 + i) * (CHUNK_SIZE + 0.3);
    const localY = -0.15 + rand01(chunk.cx, chunk.cy, 6200 + i) * (CHUNK_SIZE + 0.3);
    if (isWaterAt(chunk, chunk.x + localX, chunk.y + localY)) continue;
    if (chunk.region && isReservedTile(chunk.region, chunk.x + localX, chunk.y + localY)) continue;
    if (chunk.region && !isRegionPointPlayable(chunk.region, chunk.x + localX, chunk.y + localY, 0.2)) continue;
    if (safeChunk && Math.hypot(localX - center.x, localY - center.y) < SPAWN_CONFIG.foliageSafeRadius) continue;

    const selectedFoliageSet = pickWeightedFoliageSet(regionFoliageSets, chunk.cx, chunk.cy, 6650 + i);
    const variantCount = Math.max(1, Number(selectedFoliageSet?.variantCount) || 16);
    const resourceDrops = rollFoliageResourceDrops(selectedFoliageSet, chunk.cx, chunk.cy, i);
    const particles = rollParticleConfigs(selectedFoliageSet?.particles, () => rand01(chunk.cx, chunk.cy, 7100 + i));
    const fixedScale = Number(selectedFoliageSet?.scale);
    const hasFixedScale = Number.isFinite(fixedScale) && fixedScale > 0;

    chunk.objects.push({
      id: createId(),
      runtimeId: `${chunk.region?.mapRegion?.id ?? "region"}:chunk:${chunk.cx},${chunk.cy}:foliage:procedural:${i}`,
      type: "foliage",
      x: chunk.x + localX,
      y: chunk.y + localY,
      radius: 0,
      size: hasFixedScale ? fixedScale : 0.72 + rand01(chunk.cx, chunk.cy, 6300 + i) * 0.72,
      rotation: (rand01(chunk.cx, chunk.cy, 6400 + i) - 0.5) * 0.55,
      colorShift: rand01(chunk.cx, chunk.cy, 6500 + i),
      flip: rand01(chunk.cx, chunk.cy, 6600 + i) > 0.5,
      foliageVariant: Math.floor(rand01(chunk.cx, chunk.cy, 6700 + i) * variantCount),
      foliageSheet: selectedFoliageSet?.sheetId,
      animSeed: rand01(chunk.cx, chunk.cy, 6800 + i) * Math.PI * 2,
      visualScale: hasFixedScale ? 1 : 0.84 + rand01(chunk.cx, chunk.cy, 6900 + i) * 0.38,
      wind: rand01(chunk.cx, chunk.cy, 7000 + i) * 0.5,
      resourceDrops,
      particles,
      actionId: selectedFoliageSet?.actionId ?? null,
      questTargetKey: selectedFoliageSet?.questTargetKey ?? null,
      depthMode: selectedFoliageSet?.depthMode ?? "ground",
      sortAnchor: selectedFoliageSet?.sortAnchor ? { ...selectedFoliageSet.sortAnchor } : { x: 0.5, y: 1 },
      depthOffset: Number.isFinite(Number(selectedFoliageSet?.depthOffset)) ? Number(selectedFoliageSet.depthOffset) : 0,
      foliageLooted: false,
      blocking: false,
    });
  }
}

function addDecals(chunk, safeChunk) {
  const count = spawnCount(chunk, "decals");
  const center = SPAWN_CONFIG.safeCenter;
  const regionDecaySets = chunk.region?.mapRegion?.decaySets ?? [];
  if (!regionDecaySets.length) return;

  const pickDecaySet = (salt) => {
    if (!regionDecaySets.length) return null;
    const total = regionDecaySets.reduce((sum, entry) => sum + (Number(entry.weight) || 0), 0);
    if (total <= 0) return regionDecaySets[0];
    let cursor = rand01(chunk.cx, chunk.cy, salt) * total;
    for (const entry of regionDecaySets) {
      cursor -= Number(entry.weight) || 0;
      if (cursor <= 0) return entry;
    }
    return regionDecaySets[regionDecaySets.length - 1];
  };

  const pickDecayVariant = (entry, salt) => {
    const variants = Array.isArray(entry?.variants) ? entry.variants : [];
    if (!variants.length) return 0;
    return variants[Math.floor(rand01(chunk.cx, chunk.cy, salt) * variants.length)] ?? variants[0];
  };

  for (let i = 0; i < count; i += 1) {
    const localX = -0.2 + rand01(chunk.cx, chunk.cy, 1200 + i) * (CHUNK_SIZE + 0.4);
    const localY = -0.2 + rand01(chunk.cx, chunk.cy, 1300 + i) * (CHUNK_SIZE + 0.4);
    const sizeRoll = rand01(chunk.cx, chunk.cy, 1490 + i);
    const size = sizeRoll < 0.12
      ? 1.22 + rand01(chunk.cx, chunk.cy, 1491 + i) * 0.36
      : sizeRoll < 0.56
        ? 0.92 + rand01(chunk.cx, chunk.cy, 1492 + i) * 0.36
        : 0.78 + rand01(chunk.cx, chunk.cy, 1493 + i) * 0.24;

    const selectedDecaySet = pickDecaySet(1400 + i);

    const decayScale = selectedDecaySet
      ? (Number.isFinite(Number(selectedDecaySet.renderScale)) ? Number(selectedDecaySet.renderScale) : 1)
      : 1;
    // Keep decay fully inside playable region by scaling the edge check with
    // rendered footprint. Larger decals need larger interior margin.
    const edgeRadius = Math.max(0.2, 0.42 * size * decayScale);

    if (isWaterAt(chunk, chunk.x + localX, chunk.y + localY)) continue;
    if (chunk.region && isReservedTile(chunk.region, chunk.x + localX, chunk.y + localY)) continue;
    if (chunk.region && !isRegionPointPlayable(chunk.region, chunk.x + localX, chunk.y + localY, edgeRadius)) continue;
    if (safeChunk && Math.hypot(localX - center.x, localY - center.y) < SPAWN_CONFIG.decalSafeRadius + edgeRadius * 0.5) continue;

    chunk.decals.push({
      id: createId(),
      type: "decay",
      x: chunk.x + localX,
      y: chunk.y + localY,
      size,
      rotation: selectedDecaySet.randomRotation
        ? rand01(chunk.cx, chunk.cy, 1600 + i) * Math.PI * 2
        : selectedDecaySet.rotation ?? 0,
      color: rand01(chunk.cx, chunk.cy, 1700 + i),
      alpha: selectedDecaySet.alpha ?? (
        selectedDecaySet.projection === "iso"
          ? 1
          : 0.2 + rand01(chunk.cx, chunk.cy, 1750 + i) * 0.32
      ),
      decaySheetId: selectedDecaySet.sheetId,
      decayVariant: pickDecayVariant(selectedDecaySet, 1450 + i),
      decayRenderScale: decayScale,
      decayProjection: selectedDecaySet.projection,
      decayBlendMode: selectedDecaySet.blendMode,
      decayWidthScale: selectedDecaySet.widthScale,
      decayHeightScale: selectedDecaySet.heightScale,
      decayOffsetX: selectedDecaySet.offsetX,
      decayOffsetY: selectedDecaySet.offsetY,
      decayAnchorX: selectedDecaySet.anchorX,
      decayAnchorY: selectedDecaySet.anchorY,
      decayAlphaExplicit: selectedDecaySet.alpha !== null,
      animSeed: rand01(chunk.cx, chunk.cy, 1800 + i) * Math.PI * 2,
      particles: rollParticleConfigs(selectedDecaySet.particles, () => rand01(chunk.cx, chunk.cy, 1810 + i)),
    });
  }
}

function pickWeightedMob(entries, roll) {
  const total = entries.reduce((sum, e) => sum + (typeof e === "string" ? 1 : (e.weight ?? 1)), 0);
  let cursor = roll * total;
  for (const e of entries) {
    cursor -= typeof e === "string" ? 1 : (e.weight ?? 1);
    if (cursor <= 0) return typeof e === "string" ? e : e.type;
  }
  const last = entries[entries.length - 1];
  return typeof last === "string" ? last : last.type;
}

function cloneRareMobLoot(loot) {
  if (!loot || typeof loot !== "object" || Array.isArray(loot)) return null;
  return {
    ...loot,
    resources: Array.isArray(loot.resources) ? loot.resources.map((entry) => ({ ...entry })) : [],
    items: Array.isArray(loot.items) ? loot.items.map((entry) => ({ ...entry })) : [],
    named: Array.isArray(loot.named) ? loot.named.map((entry) => ({ ...entry })) : [],
    uniques: Array.isArray(loot.uniques) ? loot.uniques.map((entry) => ({ ...entry })) : [],
  };
}

function clampRareMobScale(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  return Math.max(0.25, Math.min(4, parsed));
}

function normalizeRareMobLevelOffset(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed);
}

function composeRareMobDisplayName(monsterType, rareMob) {
  const hasNameOverride = (
    rareMob?.displayName !== undefined
    || rareMob?.namePrefix !== undefined
    || rareMob?.nameSuffix !== undefined
  );
  if (!hasNameOverride) return undefined;
  const baseName = String(rareMob?.displayName ?? monsterType ?? "").trim();
  const prefix = String(rareMob?.namePrefix ?? "").trim();
  const suffix = String(rareMob?.nameSuffix ?? "").trim();
  return `${prefix ? `${prefix} ` : ""}${baseName}${suffix ? ` ${suffix}` : ""}`.trim();
}

function rareMobKey(entry) {
  return String(entry?.id ?? entry?.type ?? entry?.typeName ?? "").trim();
}

function rareMobSpawnLimit(entry) {
  if (entry?.uniquePerRegion) return 1;
  if (entry?.maxPerRegion === undefined) return Infinity;
  return Math.max(0, Math.round(Number(entry.maxPerRegion) || 0));
}

function rareMobCountsStore(owner) {
  return owner ? (owner.__spawnedRareMobCounts ??= new Map()) : new Map();
}

function pickRegionRareMob(chunk, slotIndex) {
  const rareMobs = chunk.region?.mapRegion?.rareMobs ?? [];
  if (!rareMobs.length) return null;

  const spawnedRareMobCounts = rareMobCountsStore(chunk.region ?? chunk);
  const spawnedBossTypes = chunk.region
    ? (chunk.region.__spawnedBossTypes ??= new Set())
    : (chunk.__spawnedBossTypes ??= new Set());

  let selected = null;
  let selectedRoll = Infinity;

  for (let rareIndex = 0; rareIndex < rareMobs.length; rareIndex += 1) {
    const entry = rareMobs[rareIndex];
    const monsterType = String(entry?.type ?? entry?.typeName ?? "").trim();
    if (!monsterType) continue;
    const base = MONSTER_STATS[monsterType];
    if (!base) continue;
    if (base.isBoss && spawnedBossTypes.has(monsterType)) continue;

    const spawnLimit = rareMobSpawnLimit(entry);
    if (spawnLimit <= 0) continue;

    const id = rareMobKey(entry);
    const alreadySpawned = id ? (spawnedRareMobCounts.get(id) ?? 0) : 0;
    if (alreadySpawned >= spawnLimit) continue;

    const chance = Math.max(0, Math.min(1, Number(entry?.chance) || 0));
    if (chance <= 0) continue;

    const roll = rand01(chunk.cx + rareIndex * 37, chunk.cy + slotIndex * 53, 1110 + rareIndex * 97 + slotIndex * 131);
    if (roll >= chance) continue;

    if (roll < selectedRoll) {
      selected = entry;
      selectedRoll = roll;
    }
  }

  return selected;
}

function listValueMatches(value, list) {
  if (!Array.isArray(list) || !list.length) return false;
  return list.map(String).includes(String(value ?? ""));
}

function specialSpawnRuleAllowsRegion(rule, region) {
  if (!rule || rule.enabled === false) return false;
  const mapSize = region?.mapRegion?.mapSize ?? "medium";
  const areaMapId = region?.mapRegion?.areaMapId ?? null;
  const regionId = region?.mapRegion?.id ?? null;
  if (rule.mapSize?.include?.length && !listValueMatches(mapSize, rule.mapSize.include)) return false;
  if (rule.mapSize?.exclude?.length && listValueMatches(mapSize, rule.mapSize.exclude)) return false;
  if (rule.areaMapIds?.include?.length && !listValueMatches(areaMapId, rule.areaMapIds.include)) return false;
  if (rule.areaMapIds?.exclude?.length && listValueMatches(areaMapId, rule.areaMapIds.exclude)) return false;
  if (rule.regionIds?.include?.length && !listValueMatches(regionId, rule.regionIds.include)) return false;
  if (rule.regionIds?.exclude?.length && listValueMatches(regionId, rule.regionIds.exclude)) return false;
  return true;
}

function pickSpecialSpawnMonster(chunk) {
  for (const [monsterType, base] of Object.entries(MONSTER_STATS)) {
    const rule = base.specialSpawn;
    if (!specialSpawnRuleAllowsRegion(rule, chunk.region)) continue;
    const spawnedBossTypes = chunk.region
      ? (chunk.region.__spawnedBossTypes ??= new Set())
      : (chunk.__spawnedBossTypes ??= new Set());
    if (rule.uniquePerRegion !== false && spawnedBossTypes.has(monsterType)) continue;
    const chance = Math.max(0, Math.min(1, Number(rule.chance) || 0));
    if (chance <= 0) continue;
    const salt = Number.isFinite(Number(rule.salt)) ? Number(rule.salt) : 1100;
    if (rand01(chunk.cx, chunk.cy, salt) < chance) return monsterType;
  }
  return null;
}

function createChunkMonster(chunk, slotIndex, monsterType, x, y, level, extra = {}) {
  const base = MONSTER_STATS[monsterType];
  if (!base) return null;
  const hp = Math.floor(base.hp * (1 + level * 0.18));
  return {
    id: createId(),
    typeName: monsterType,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: base.radius,
    baseLevel: level,
    level,
    maxHp: hp,
    hp,
    damage: Math.floor(base.damage * (1 + level * 0.16)),
    speed: base.speed * (1 + Math.min(0.32, level * 0.025)),
    baseSpeed: base.speed * (1 + Math.min(0.32, level * 0.025)),
    range: base.range,
    magic: Math.floor(Number(base.magic) || 0),
    critChance: Number(base.critChance) || 0,
    critDamage: Number(base.critDamage) || 1.5,
    blockChance: Number(base.blockChance) || 0,
    dodgeChance: Number(base.dodgeChance) || 0,
    physicalResist: Number(base.physicalResist) || 0,
    fireResist: Number(base.fireResist) || 0,
    iceResist: Number(base.iceResist) || 0,
    lightningResist: Number(base.lightningResist) || 0,
    poisonResist: Number(base.poisonResist) || 0,
    arcaneResist: Number(base.arcaneResist) || 0,
    holyResist: Number(base.holyResist) || 0,
    shadowResist: Number(base.shadowResist) || 0,
    natureResist: Number(base.natureResist) || 0,
    allResist: Number(base.allResist) || 0,
    spells: [...(base.spells ?? [])],
    killLydra: Math.max(0, Number(base.killLydra) || 0),
    killNetdra: Math.max(0, Number(base.killNetdra) || 0),
    eliteKillLydra: Math.max(0, Number(base.eliteKillLydra) || 0),
    eliteKillNetdra: Math.max(0, Number(base.eliteKillNetdra) || 0),
    speciesId: base.speciesId,
    factionId: base.factionId,
    tags: Array.isArray(base.tags) ? [...base.tags] : [],
    spellCooldown: 0.6 + rand01(chunk.cx, chunk.cy, 985 + slotIndex) * 1.5,
    statusEffects: [],
    allowElite: base.allowElite !== false,
    isBoss: Boolean(base.isBoss),
    boss: base.isBoss ? { ...BOSS_TINT } : null,
    noLoot: Boolean(base.noLoot),
    despawnOnDeath: Boolean(base.despawnOnDeath),
    onHitStatus: base.onHitStatus ? { ...base.onHitStatus } : null,
    leapAttack: base.leapAttack ? { ...base.leapAttack } : null,
    attackCooldownConfig: base.attackCooldown ? { ...base.attackCooldown } : null,
    meleeAreaDamage: base.meleeAreaDamage ? { ...base.meleeAreaDamage } : null,
    shadow: base.shadow ? { ...base.shadow } : null,
    haveMinion: Boolean(base.haveMinion),
    minions: base.minions ?? false,
    minionCooldown: Number(base.minions?.cooldown) || 0,
    isMinion: false,
    minionOwnerId: null,
    aggro: base.range > 1 ? 8.2 : 6.7,
    attackCooldown: 0.3 + rand01(chunk.cx, chunk.cy, 980 + slotIndex),
    color: base.color,
    xp: Math.floor(base.xp * (1 + level * 0.15)),
    animSeed: rand01(chunk.cx, chunk.cy, 1010 + slotIndex) * Math.PI * 2,
    breathSpeed: 1.6 + rand01(chunk.cx, chunk.cy, 1020 + slotIndex) * 1.4,
    visualScale: 0.9 + rand01(chunk.cx, chunk.cy, 1030 + slotIndex) * 0.22,
    facingX: 1,
    facingY: 0,
    moving: false,
    gait: rand01(chunk.cx, chunk.cy, 1040 + slotIndex) * Math.PI * 2,
    moveSpeed: 0,
    attackAnim: 0,
    dead: false,
    hurt: 0,
    ...extra,
  };
}

function addMonsters(chunk, safeChunk) {
  const monsterCounts = chunk.region?.mapRegion?.spawnCounts?.monsters ?? { min: 0, max: 0 };
  const minCount = Math.max(0, Math.round(Number(monsterCounts.min) || 0));
  const maxCount = Math.max(minCount, Math.round(Number(monsterCounts.max) || minCount));
  const count = minCount + Math.floor(rand01(chunk.cx, chunk.cy, 700) * (maxCount - minCount + 1));
  const safeCenter = { x: 3.2, y: 3.1 };
  const monsterTypes = chunk.region?.mapRegion?.mobs ?? [];
  if (!monsterTypes.length) return;

  for (let i = 0; i < count; i += 1) {
    let localX = 1.1 + rand01(chunk.cx, chunk.cy, 760 + i) * (CHUNK_SIZE - 2.2);
    let localY = 1.1 + rand01(chunk.cx, chunk.cy, 810 + i) * (CHUNK_SIZE - 2.2);
    if (chunk.region && isReservedTile(chunk.region, chunk.x + localX, chunk.y + localY)) continue;
    if (chunk.region && !isRegionPointPlayable(chunk.region, chunk.x + localX, chunk.y + localY, 0.5)) continue;
    if (isWaterAt(chunk, chunk.x + localX, chunk.y + localY)) continue;
    if (chunk.region && (Math.hypot(chunk.x + localX - chunk.region.start.x, chunk.y + localY - chunk.region.start.y) < 6 || Math.hypot(chunk.x + localX - chunk.region.end.x, chunk.y + localY - chunk.region.end.y) < 3)) continue;
    if (safeChunk && Math.hypot(localX - safeCenter.x, localY - safeCenter.y) < 5) continue;

    let x = chunk.x + localX;
    let y = chunk.y + localY;
    for (let tries = 0; tries < 8 && (
      blockedByChunkObjects(chunk, x, y, 0.38)
      || isWaterAt(chunk, x, y)
      || (chunk.region && isReservedTile(chunk.region, x, y))
      || (chunk.region && !isRegionPointPlayable(chunk.region, x, y, 0.5))
    ); tries += 1) {
      localX = 1.1 + rand01(chunk.cx + tries, chunk.cy, 840 + i) * (CHUNK_SIZE - 2.2);
      localY = 1.1 + rand01(chunk.cx, chunk.cy + tries, 880 + i) * (CHUNK_SIZE - 2.2);
      x = chunk.x + localX;
      y = chunk.y + localY;
    }
    if (chunk.region && isReservedTile(chunk.region, x, y)) continue;
    if (chunk.region && !isRegionPointPlayable(chunk.region, x, y, 0.5)) continue;

    const rareMob = pickRegionRareMob(chunk, i);
    const monsterType = rareMob?.type ?? pickSpecialSpawnMonster(chunk) ?? pickWeightedMob(monsterTypes, rand01(chunk.cx, chunk.cy, 900 + i));
    const base = MONSTER_STATS[monsterType];
    if (!base) continue;
    if (base.isBoss) {
      const spawnedBossTypes = chunk.region
        ? (chunk.region.__spawnedBossTypes ??= new Set())
        : (chunk.__spawnedBossTypes ??= new Set());
      if (spawnedBossTypes.has(monsterType)) continue;
      spawnedBossTypes.add(monsterType);
    }
    const baseLevel = chunk.level + Math.floor(rand01(chunk.cx, chunk.cy, 930 + i) * 2);
    const levelOffset = rareMob ? normalizeRareMobLevelOffset(rareMob.levelOffset) : 0;
    const level = Math.max(1, baseLevel + levelOffset);
    const baseVisualScale = 0.9 + rand01(chunk.cx, chunk.cy, 1030 + i) * 0.22;
    const scaleMultiplier = rareMob ? clampRareMobScale(rareMob.scale) : 1;
    const rareDisplayName = rareMob ? composeRareMobDisplayName(monsterType, rareMob) : undefined;
    const rareTint = rareMob?.tint !== undefined ? String(rareMob.tint).trim() : "";
    if (rareMob) {
      const spawnedRareMobCounts = rareMobCountsStore(chunk.region ?? chunk);
      const rareId = rareMobKey(rareMob);
      if (rareId) spawnedRareMobCounts.set(rareId, (spawnedRareMobCounts.get(rareId) ?? 0) + 1);
    }
    chunk.monsters.push(createChunkMonster(chunk, i, monsterType, x, y, level, rareMob ? {
      spawnSource: "rareMobs",
      rareMobId: rareMobKey(rareMob),
      rareLoot: cloneRareMobLoot(rareMob.loot),
      displayName: rareDisplayName,
      visualScale: Number((baseVisualScale * scaleMultiplier).toFixed(3)),
      color: rareTint || undefined,
      rareLevelOffset: levelOffset,
      rareScaleMultiplier: scaleMultiplier,
      rareTint: rareTint || undefined,
    } : {}));
  }
}

function blockedByChunkObjects(chunk, x, y, radius) {
  return chunk.objects.some((object) => object.blocking && Math.hypot(object.x - x, object.y - y) < object.radius + radius);
}

function isWaterAt(chunk, x, y) {
  const tileX = Math.floor(x);
  const tileY = Math.floor(y);
  return chunk.tiles.some((tile) => tile.x === tileX && tile.y === tileY && tile.water);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function distanceToRegionPoint(point, x, y) {
  return Math.hypot(point.x - x, point.y - y);
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq <= 0.0001) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}


function mix(a, b, t) {
  return a + (b - a) * t;
}
