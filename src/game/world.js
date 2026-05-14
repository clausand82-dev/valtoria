import { BIOMES, BIOME_IDS } from "./config/biome-config.js";
import { CHUNK_SIZE, WORLD_SEED } from "./config/game-constants-config.js";
import { ARMOR_BASES, EQUIPMENT_SLOTS, WEAPON_BASES } from "./config/equipment-config.js";
import { NAMED_ITEM_TEMPLATES, PREFIXES, UNIQUE_ITEMS } from "./config/item-config.js";
import { MONSTER_STATS } from "./config/monster-config.js";
import { RARITIES, UNIQUE_RARITY } from "./config/rarity-config.js";
import { DECAL_SETS_BY_BIOME, OBJECT_SPAWN_TUNING, SPAWN_CONFIG } from "./config/spawn-config.js";
import { normalizeRegionFoliageSets, normalizeRegionTileset } from "./config/region-asset-config.js";
import {
  getRegionObjectFamily,
  // legacyRegionObjectsFromWeights,
  normalizeRegionObjects,
  pickObjectSpawnType,
  REGION_OBJECT_DEFS,
  resolveRegionObjectDestructibleDef,
} from "./config/region-object-config.js";
import { normalizeRegionDecaySets } from "./config/decay-config.js";
import { normalizeParticleConfigs, rollParticleConfigs } from "./config/particle-presets.js";
import { resolveWeatherForRegion } from "./config/weather-presets.js";
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

let nextId = 1;
const GROUND_VARIANT_COUNT = 16;
const REGION_W = 72;
const REGION_H = 52;
const START_SAFE_CENTER = SPAWN_CONFIG.safeCenter;
const BIOME_FIELDS = BIOME_IDS.map((id, index) => ({
  id,
  index,
  weight: BIOMES[id].weight ?? 1,
}));
const ITEM_BONUS_STAT_KEYS = [
  "maxHpPct",
  "maxManaPct",
  "armorFlat",
  "damagePct",
  "speedPct",
  "attackSpeed",
  "critChance",
  "critDamage",
  "blockChance",
  "dodgeChance",
  "lifeSteal",
  "magicFind",
  "goldFind",
  "resourceFind",
  "xpGain",
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
    (Number(item.damagePct) || 0) * 150 +
    (Number(item.speedPct) || 0) * 120 +
    (Number(item.attackSpeed) || 0) * 150 +
    (Number(item.critChance) || 0) * 220 +
    (Number(item.critDamage) || 0) * 90 +
    (Number(item.blockChance) || 0) * 180 +
    (Number(item.dodgeChance) || 0) * 180 +
    (Number(item.lifeSteal) || 0) * 260 +
    (Number(item.magicFind) || 0) * 85 +
    (Number(item.goldFind) || 0) * 65 +
    (Number(item.resourceFind) || 0) * 70 +
    (Number(item.xpGain) || 0) * 75;
  return Math.max(1, Math.floor((8 + level * 6 + power) * rarity.mult));
}

function withItemValue(item) {
  return {
    ...item,
    value: itemValue(item),
  };
}

function withRandomSockets(item) {
  if (!item || item.unique || item.named || (item.slot !== "weapon" && item.mode !== "armor")) return item;
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
    mode: "armor",
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
    level: itemLevel,
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
    effects: cloneItemEffects(definition.effects),
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
    level: itemLevel,
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
    effects: cloneItemEffects(definition.effects),
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
  const health = type === "health";
  return finalizeItem({
    id: createId(),
    name: health ? "Health Potion" : "Mana Potion",
    baseName: health ? "Health Potion" : "Mana Potion",
    rarity: "normal",
    rarityLabel: "Normal",
    rarityColor: health ? "#c52c38" : "#2d8ed8",
    slot: "consumable",
    mode: "potion",
    potionType: health ? "health" : "mana",
    restorePct: 0.25,
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
  }, { mergeable: false }, health ? "potion_health" : "potion_mana");
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

export function createRegion(regionIndex = 1, seed = Math.floor(Math.random() * 1000000), biomeId = null, regionConfig = null) {
  const pickedBiomeId = regionConfig?.biodome ?? biomeId ?? BIOME_IDS[Math.floor(seededRand(seed, 1) * BIOME_IDS.length)] ?? "mainland";
  const normalizedTileset = normalizeRegionTileset(regionConfig?.tileset);
  const normalizedTilesetArray = Array.isArray(normalizedTileset) ? normalizedTileset : (normalizedTileset ? [normalizedTileset] : null);
  const normalizedFoliageSets = normalizeRegionFoliageSets(regionConfig ?? {});
  const normalizedObjects = normalizeRegionObjects(regionConfig ?? {}, pickedBiomeId);
  const normalizedDecaySets = normalizeRegionDecaySets(regionConfig ?? {});
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
      biodome: pickedBiomeId,
      tileset: normalizedTilesetArray
        ? normalizedTilesetArray.map((normalizedTileset) => ({
          fileName: normalizedTileset.fileName,
          sheetId: normalizedTileset.sheetId,
          x: normalizedTileset.x,
          y: normalizedTileset.y,
          lockedVariant: normalizedTileset.lockedVariant,
          variantCount: normalizedTileset.variantCount,
        }))
        : null,
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
        depthMode: entry.depthMode,
        sortAnchor: entry.sortAnchor ? { ...entry.sortAnchor } : null,
        depthOffset: entry.depthOffset,
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
      weights: { ...(regionConfig.weights ?? {}) },
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
      mapSize: regionConfig.mapSize ?? "medium",
    } : null,
    width: regionW,
    height: regionH,
    biomeId: pickedBiomeId,
    biome: BIOMES[pickedBiomeId] ?? BIOMES.mainland,
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
  const waterWeight = Math.max(0, Number(region.mapRegion?.weights?.water) || 0);
  if (waterWeight <= 0) return false;
  const tileX = Math.floor(x);
  const tileY = Math.floor(y);
  if (!region.mask.has(`${tileX},${tileY}`)) return false;
  return regionWaterVariant(region, tileX, tileY) !== null;
}

function regionWaterVariant(region, tileX, tileY) {
  const waterWeight = Math.max(0, Number(region?.mapRegion?.weights?.water) || 0);
  if (!region || waterWeight <= 0) return null;
  const patchCount = Math.max(1, Math.round(waterWeight * 0.65));
  for (let i = 0; i < patchCount; i += 1) {
    const centerX = seededRegionCoord(region.seed, i, 7100, region.width);
    const centerY = seededRegionCoord(region.seed, i, 7200, region.height);
    if (
      Math.hypot(centerX - region.start.x, centerY - region.start.y) < SPAWN_CONFIG.regionStartClearRadius + 3
      || Math.hypot(centerX - region.end.x, centerY - region.end.y) < SPAWN_CONFIG.regionEndClearRadius + 2
    ) continue;
    const rx = 2.2 + rand01(region.seed, i, 7300) * (2.8 + waterWeight * 0.18);
    const ry = 1.8 + rand01(region.seed, i, 7400) * (2.4 + waterWeight * 0.15);
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
    return hashInt(tileX, tileY, 7600 + i) % 16;
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
    biome: region?.biome ?? BIOMES.mainland,
    region,
    level: Math.max(1, 1 + Math.floor((region?.index ?? distanceLevel) * 0.9)),
    tiles: [],
    edgeTiles: [],
    decals: [],
    objects: [],
    monsters: [],
  };
  const biomeCounts = new Map();
  const waterTiles = buildChunkWaterTiles(region, cx, cy);

  for (let ty = 0; ty < CHUNK_SIZE; ty += 1) {
    for (let tx = 0; tx < CHUNK_SIZE; tx += 1) {
      const worldX = chunk.x + tx;
      const worldY = chunk.y + ty;
      if (region && !isRegionTilePlayable(region, worldX, worldY)) continue;
      const lockedStarterGround = safeChunk
        && Math.hypot(worldX + 0.5 - START_SAFE_CENTER.x, worldY + 0.5 - START_SAFE_CENTER.y) < 5.6;
      const biomeId = region ? region.biomeId : lockedStarterGround ? "mainland" : biomeIdAt(worldX, worldY);
      const noise = hashInt(worldX, worldY, 31);
      const regionTileset = region?.mapRegion?.tileset;
      const chosenTileset = Array.isArray(regionTileset) && regionTileset.length
        ? regionTileset[noise % regionTileset.length]
        : regionTileset;
      const useCustomGround = Boolean(chosenTileset?.sheetId);
      const lockedGroundVariant = Number.isInteger(chosenTileset?.lockedVariant)
        ? chosenTileset.lockedVariant
        : null;
      biomeCounts.set(biomeId, (biomeCounts.get(biomeId) ?? 0) + 1);
      const edgeMask = region ? regionEdgeMask(region, worldX, worldY) : 0;
      const waterVariant = waterTiles.get(`${worldX},${worldY}`);
      chunk.tiles.push({
        x: worldX,
        y: worldY,
        biomeId,
        groundSheetId: useCustomGround ? chosenTileset.sheetId : null,
        variant: lockedGroundVariant ?? (noise % GROUND_VARIANT_COUNT),
        water: waterVariant !== undefined,
        waterVariant,
        path: region ? distanceToRegionPoint(region.start, worldX + 0.5, worldY + 0.5) < 4 || distanceToRegionPoint(region.end, worldX + 0.5, worldY + 0.5) < 3 : false,
        crack: noise % 9 === 0,
        moss: noise % 13 === 0,
        edgeMask,
      });
      if (edgeMask) chunk.edgeTiles.push({ x: worldX, y: worldY, edgeMask, variant: noise });
    }
  }

  chunk.biome = region?.biome ?? BIOMES[dominantBiomeId(biomeCounts)] ?? BIOMES.mainland;
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
  const waterWeight = Math.max(0, Number(region?.mapRegion?.weights?.water) || 0);
  if (!region || waterWeight <= 0) return waterTiles;

  const left = cx * CHUNK_SIZE;
  const right = left + CHUNK_SIZE - 1;
  const top = cy * CHUNK_SIZE;
  const bottom = top + CHUNK_SIZE - 1;
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const variant = regionWaterVariant(region, x, y);
      if (variant !== null) {
        waterTiles.set(`${x},${y}`, variant);
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
  // TODO:DELETE: legacy biodome/weights object fallback is deprecated.
  // return legacyRegionObjectsFromWeights(region?.mapRegion?.weights ?? {}, region?.biomeId ?? "mainland");
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
    chunk.objects.push({
      id: createId(),
      type,
      x,
      y,
      radius,
      size: Number(item.size) || tuning.sizeBase,
      rotation: (Number(item.rotation) || 0) + (instance.rotation * Math.PI) / 180,
      colorShift: rand01(chunk.cx, chunk.cy, 7900 + i),
      flip: instance.mirrored,
      treeVariant: Number.isFinite(Number(item.variant))
        ? Math.max(0, Math.floor(Number(item.variant)))
        : Math.floor(rand01(chunk.cx, chunk.cy, 7910 + i) * 16),
      animSeed: rand01(chunk.cx, chunk.cy, 7920 + i) * Math.PI * 2,
      visualScale: Number(item.visualScale) || 1,
      blocking: item.blocking !== false,
      destructible: effectiveDestructible,
      renderBiomeId: def.renderBiomeId ?? null,
      graphicsRef: def.graphicsRef ?? null,
      particles: rollParticleConfigs(normalizeParticleConfigs(def.particles), () => rand01(chunk.cx, chunk.cy, 7930 + i)),
      depthMode: def.depthMode ?? "dynamic",
      sortAnchor: def.sortAnchor ? { ...def.sortAnchor } : { x: 0.5, y: 1 },
      depthOffset: Number.isFinite(Number(def.depthOffset)) ? Number(def.depthOffset) : 0,
      maxHp: effectiveDestructible ? resolvedDef?.hp : undefined,
      hp: effectiveDestructible ? resolvedDef?.hp : undefined,
      prefabId: instance.id,
      prefabInstanceId: instance.instanceId,
    });
  }
}

function addPrefabFoliage(chunk, instance) {
  for (let i = 0; i < (instance.foliage ?? []).length; i += 1) {
    const item = instance.foliage[i];
    const { x, y } = prefabWorldPoint(instance, item);
    if (!pointInChunk(chunk, x, y)) continue;
    if (!isRegionPointPlayable(chunk.region, x, y, 0.2) || isWaterAt(chunk, x, y)) continue;
    chunk.objects.push({
      id: createId(),
      type: "foliage",
      x,
      y,
      radius: 0,
      size: Number(item.size) || 0.72,
      rotation: (Number(item.rotation) || 0) + (instance.rotation * Math.PI) / 180,
      colorShift: rand01(chunk.cx, chunk.cy, 7940 + i),
      flip: instance.mirrored,
      foliageVariant: Number.isFinite(Number(item.variant))
        ? Math.floor(Number(item.variant))
        : Math.floor(rand01(chunk.cx, chunk.cy, 7950 + i) * 16),
      foliageSheet: item.id ?? chunk.biome.id,
      animSeed: rand01(chunk.cx, chunk.cy, 7960 + i) * Math.PI * 2,
      visualScale: Number(item.visualScale) || 1,
      wind: 0.1,
      resourceDrops: [],
      particles: [],
      depthMode: "ground",
      sortAnchor: { x: 0.5, y: 1 },
      depthOffset: 0,
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
      type: "chest",
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
      prefabId: instance.id,
      prefabInstanceId: instance.instanceId,
      prefabChestId: item.id ?? "chest",
    });
  }
}

function addPrefabDecals(chunk, instance) {
  for (let i = 0; i < (instance.decals ?? []).length; i += 1) {
    const item = instance.decals[i];
    const { x, y } = prefabWorldPoint(instance, item);
    if (!pointInChunk(chunk, x, y)) continue;
    if (!isRegionPointPlayable(chunk.region, x, y, 0.15) || isWaterAt(chunk, x, y)) continue;
    chunk.decals.push({
      id: createId(),
      type: item.type ?? item.id ?? "debris",
      x,
      y,
      size: Number(item.size) || 0.9,
      rotation: (Number(item.rotation) || 0) + (instance.rotation * Math.PI) / 180,
      color: rand01(chunk.cx, chunk.cy, 7970 + i),
      alpha: Number(item.alpha) || 0.42,
      animSeed: rand01(chunk.cx, chunk.cy, 7980 + i) * Math.PI * 2,
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
      spells: [...(base.spells ?? [])],
      spellCooldown: 0.6 + rand01(chunk.cx, chunk.cy, 8000 + i) * 1.5,
      statusEffects: [],
      allowElite: base.allowElite !== false,
      isBoss: Boolean(base.isBoss),
      boss: base.isBoss ? { ...BOSS_TINT } : null,
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

function addObjects(chunk, safeChunk) {
  const objectPool = regionObjectPool(chunk.region);
  const objectCount = SPAWN_CONFIG.objectCountsByBiome[chunk.biome.id]
    ?? SPAWN_CONFIG.objectCountsByBiome.default;
  const center = SPAWN_CONFIG.safeCenter;

  for (let i = 0; i < objectCount; i += 1) {
    const selectedEntry = pickRegionObjectEntry(objectPool, chunk.cx, chunk.cy, i);
    const type = selectedEntry
      ? pickObjectSpawnType(selectedEntry, rand01(chunk.cx, chunk.cy, 3320 + i))
      : chunk.biome.objects[Math.floor(rand01(chunk.cx, chunk.cy, 300 + i) * chunk.biome.objects.length)];
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
    chunk.objects.push({
      id: createId(),
      type,
      x,
      y,
      radius,
      size,
      rotation: rand01(chunk.cx, chunk.cy, 400 + i) * Math.PI * 2,
      colorShift: rand01(chunk.cx, chunk.cy, 500 + i),
      flip: rand01(chunk.cx, chunk.cy, 530 + i) > 0.5,
      treeVariant: Math.floor(rand01(chunk.cx, chunk.cy, 545 + i) * 16),
      animSeed: rand01(chunk.cx, chunk.cy, 560 + i) * Math.PI * 2,
      visualScale: 0.92 + rand01(chunk.cx, chunk.cy, 590 + i) * 0.18,
      blocking: true,
      destructible: effectiveDestructible,
      renderBiomeId: selectedEntry?.renderBiomeId ?? null,
      graphicsRef: selectedEntry?.graphicsRef ?? null,
      particles: rollParticleConfigs(selectedEntry?.particles, () => rand01(chunk.cx, chunk.cy, 7600 + i)),
      depthMode: selectedEntry?.depthMode ?? "dynamic",
      sortAnchor: selectedEntry?.sortAnchor ? { ...selectedEntry.sortAnchor } : { x: 0.5, y: 1 },
      depthOffset: Number.isFinite(Number(selectedEntry?.depthOffset)) ? Number(selectedEntry.depthOffset) : 0,
      // TODO: Support occluder metadata here for future pixel/shape masking.
      maxHp: effectiveDestructible ? resolvedDef?.hp : undefined,
      hp: effectiveDestructible ? resolvedDef?.hp : undefined,
    });
  }

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
    type: "chest",
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
  });
}

function collidesWithBlockingObject(chunk, x, y, radius) {
  return chunk.objects.some((object) => (
    object.blocking
    && Math.hypot(object.x - x, object.y - y) < object.radius + radius + 0.12
  ));
}

function addFoliage(chunk, safeChunk) {
  const baseCount = SPAWN_CONFIG.foliageCountsByBiome[chunk.biome.id]
    ?? SPAWN_CONFIG.foliageCountsByBiome.default;
  const regionFoliageWeight = Math.max(0, Number(chunk.region?.mapRegion?.weights?.foilage) || 0);
  const count = chunk.region
    ? Math.round(baseCount * Math.min(2.4, regionFoliageWeight / 8))
    : baseCount;
  const center = SPAWN_CONFIG.safeCenter;
  const regionFoliageSets = chunk.region?.mapRegion?.foliageSets ?? [];
  const hasRegionFoliageOverride = regionFoliageSets.length > 0;

  for (let i = 0; i < count; i += 1) {
    const localX = -0.15 + rand01(chunk.cx, chunk.cy, 6100 + i) * (CHUNK_SIZE + 0.3);
    const localY = -0.15 + rand01(chunk.cx, chunk.cy, 6200 + i) * (CHUNK_SIZE + 0.3);
    if (isWaterAt(chunk, chunk.x + localX, chunk.y + localY)) continue;
    if (chunk.region && isReservedTile(chunk.region, chunk.x + localX, chunk.y + localY)) continue;
    if (chunk.region && !isRegionPointPlayable(chunk.region, chunk.x + localX, chunk.y + localY, 0.2)) continue;
    if (safeChunk && Math.hypot(localX - center.x, localY - center.y) < SPAWN_CONFIG.foliageSafeRadius) continue;

    const selectedFoliageSet = hasRegionFoliageOverride
      ? pickWeightedFoliageSet(regionFoliageSets, chunk.cx, chunk.cy, 6650 + i)
      : null;
    const variantCount = Math.max(1, Number(selectedFoliageSet?.variantCount) || 16);
    const resourceDrops = rollFoliageResourceDrops(selectedFoliageSet, chunk.cx, chunk.cy, i);
    const particles = rollParticleConfigs(selectedFoliageSet?.particles, () => rand01(chunk.cx, chunk.cy, 7100 + i));
    const fixedScale = Number(selectedFoliageSet?.scale);
    const hasFixedScale = Number.isFinite(fixedScale) && fixedScale > 0;

    chunk.objects.push({
      id: createId(),
      type: "foliage",
      x: chunk.x + localX,
      y: chunk.y + localY,
      radius: 0,
      size: hasFixedScale ? fixedScale : 0.72 + rand01(chunk.cx, chunk.cy, 6300 + i) * 0.72,
      rotation: (rand01(chunk.cx, chunk.cy, 6400 + i) - 0.5) * 0.55,
      colorShift: rand01(chunk.cx, chunk.cy, 6500 + i),
      flip: rand01(chunk.cx, chunk.cy, 6600 + i) > 0.5,
      foliageVariant: Math.floor(rand01(chunk.cx, chunk.cy, 6700 + i) * variantCount),
      foliageSheet: hasRegionFoliageOverride
        ? selectedFoliageSet?.sheetId
        : rand01(chunk.cx, chunk.cy, 6750 + i) < SPAWN_CONFIG.foliageBonesChance ? "bones" : chunk.biome.id,
      animSeed: rand01(chunk.cx, chunk.cy, 6800 + i) * Math.PI * 2,
      visualScale: hasFixedScale ? 1 : 0.84 + rand01(chunk.cx, chunk.cy, 6900 + i) * 0.38,
      wind: rand01(chunk.cx, chunk.cy, 7000 + i) * 0.5,
      resourceDrops,
      particles,
      depthMode: selectedFoliageSet?.depthMode ?? "ground",
      sortAnchor: selectedFoliageSet?.sortAnchor ? { ...selectedFoliageSet.sortAnchor } : { x: 0.5, y: 1 },
      depthOffset: Number.isFinite(Number(selectedFoliageSet?.depthOffset)) ? Number(selectedFoliageSet.depthOffset) : 0,
      foliageLooted: false,
      blocking: false,
    });
  }
}

function addDecals(chunk, safeChunk) {
  const count = SPAWN_CONFIG.decalCountsByBiome[chunk.biome.id]
    ?? SPAWN_CONFIG.decalCountsByBiome.default;
  const center = SPAWN_CONFIG.safeCenter;
  const regionDecaySets = chunk.region?.mapRegion?.decaySets ?? [];
  const hasRegionDecayOverride = regionDecaySets.length > 0;
  const set = DECAL_SETS_BY_BIOME[chunk.biome.id] || DECAL_SETS_BY_BIOME.mainland;

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

    const selectedDecaySet = hasRegionDecayOverride
      ? pickDecaySet(1400 + i)
      : null;

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

    if (selectedDecaySet) {
      chunk.decals.push({
        id: createId(),
        type: "decay",
        x: chunk.x + localX,
        y: chunk.y + localY,
        size,
        rotation: rand01(chunk.cx, chunk.cy, 1600 + i) * Math.PI * 2,
        color: rand01(chunk.cx, chunk.cy, 1700 + i),
        alpha: 0.2 + rand01(chunk.cx, chunk.cy, 1750 + i) * 0.32,
        decaySheetId: selectedDecaySet.sheetId,
        decayVariant: pickDecayVariant(selectedDecaySet, 1450 + i),
        decayRenderScale: decayScale,
        animSeed: rand01(chunk.cx, chunk.cy, 1800 + i) * Math.PI * 2,
        particles: rollParticleConfigs(selectedDecaySet.particles, () => rand01(chunk.cx, chunk.cy, 1810 + i)),
      });
      continue;
    }

    chunk.decals.push({
      id: createId(),
      type: set[Math.floor(rand01(chunk.cx, chunk.cy, 1400 + i) * set.length)],
      x: chunk.x + localX,
      y: chunk.y + localY,
      size,
      rotation: rand01(chunk.cx, chunk.cy, 1600 + i) * Math.PI * 2,
      color: rand01(chunk.cx, chunk.cy, 1700 + i),
      alpha: 0.2 + rand01(chunk.cx, chunk.cy, 1750 + i) * 0.32,
      animSeed: rand01(chunk.cx, chunk.cy, 1800 + i) * Math.PI * 2,
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

function addMonsters(chunk, safeChunk) {
  const baseCount = chunk.biome.id === "jungle" || chunk.biome.id === "lava" ? 9 : 8;
  const count = baseCount + Math.floor(rand01(chunk.cx, chunk.cy, 700) * 5);
  const safeCenter = { x: 3.2, y: 3.1 };
  const monsterTypes = chunk.region?.mapRegion?.mobs?.length
    ? chunk.region.mapRegion.mobs
    : chunk.biome.monsters;

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

    const monsterType = pickWeightedMob(monsterTypes, rand01(chunk.cx, chunk.cy, 900 + i));
    const base = MONSTER_STATS[monsterType];
    if (!base) continue;
    if (base.isBoss) {
      const spawnedBossTypes = chunk.region
        ? (chunk.region.__spawnedBossTypes ??= new Set())
        : (chunk.__spawnedBossTypes ??= new Set());
      if (spawnedBossTypes.has(monsterType)) continue;
      spawnedBossTypes.add(monsterType);
    }
    const level = chunk.level + Math.floor(rand01(chunk.cx, chunk.cy, 930 + i) * 2);
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
      spells: [...(base.spells ?? [])],
      spellCooldown: 0.6 + rand01(chunk.cx, chunk.cy, 985 + i) * 1.5,
      statusEffects: [],
      allowElite: base.allowElite !== false,
      isBoss: Boolean(base.isBoss),
      boss: base.isBoss ? { ...BOSS_TINT } : null,
      haveMinion: Boolean(base.haveMinion),
      minions: base.minions ?? false,
      minionCooldown: Number(base.minions?.cooldown) || 0,
      isMinion: false,
      minionOwnerId: null,
      aggro: base.range > 1 ? 8.2 : 6.7,
      attackCooldown: 0.3 + rand01(chunk.cx, chunk.cy, 980 + i),
      color: base.color,
      xp: Math.floor(base.xp * (1 + level * 0.15)),
      animSeed: rand01(chunk.cx, chunk.cy, 1010 + i) * Math.PI * 2,
      breathSpeed: 1.6 + rand01(chunk.cx, chunk.cy, 1020 + i) * 1.4,
      visualScale: 0.9 + rand01(chunk.cx, chunk.cy, 1030 + i) * 0.22,
      facingX: 1,
      facingY: 0,
      moving: false,
      gait: rand01(chunk.cx, chunk.cy, 1040 + i) * Math.PI * 2,
      moveSpeed: 0,
      attackAnim: 0,
      dead: false,
      hurt: 0,
    });
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

function dominantBiomeId(counts) {
  let bestId = "mainland";
  let bestCount = -1;
  for (const [id, count] of counts) {
    if (count > bestCount) {
      bestId = id;
      bestCount = count;
    }
  }
  return bestId;
}

function biomeIdAt(worldX, worldY) {
  let bestId = "mainland";
  let bestScore = -Infinity;
  for (const field of BIOME_FIELDS) {
    const score = biomeScore(field, worldX, worldY);
    if (score > bestScore) {
      bestScore = score;
      bestId = field.id;
    }
  }
  return bestId;
}

function biomeScore(field, x, y) {
  const salt = 2200 + field.index * 137;
  const offsetX = field.index * 17.31;
  const offsetY = field.index * -11.73;
  const continent = valueNoise(x * 0.018 + offsetX, y * 0.018 + offsetY, salt);
  const region = valueNoise(x * 0.043 + offsetY, y * 0.043 + offsetX, salt + 41);
  const edge = valueNoise(x * 0.095 - offsetX, y * 0.095 - offsetY, salt + 83) - 0.5;
  const weightBias = Math.log2(field.weight + 1) * 0.16;
  return continent * 0.85 + region * 0.5 + edge * 0.16 + weightBias;
}

function valueNoise(x, y, salt) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smoothstep(x - x0);
  const ty = smoothstep(y - y0);
  const a = rand01(x0, y0, salt);
  const b = rand01(x0 + 1, y0, salt);
  const c = rand01(x0, y0 + 1, salt);
  const d = rand01(x0 + 1, y0 + 1, salt);
  return mix(mix(a, b, tx), mix(c, d, tx), ty);
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

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function mix(a, b, t) {
  return a + (b - a) * t;
}
