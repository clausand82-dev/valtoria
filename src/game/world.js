import {
  ARMOR_BASES,
  BIOMES,
  BIOME_IDS,
  CHUNK_SIZE,
  EQUIPMENT_SLOTS,
  MONSTER_STATS,
  NAMED_ITEM_TEMPLATES,
  PREFIXES,
  RARITIES,
  UNIQUE_RARITY,
  UNIQUE_ITEMS,
  WEAPON_BASES,
  WORLD_SEED,
} from "./data.js";

let nextId = 1;
const GROUND_VARIANT_COUNT = 16;
const REGION_W = 72;
const REGION_H = 52;
const START_SAFE_CENTER = { x: 3.2, y: 3.1 };
const BIOME_FIELDS = BIOME_IDS.map((id, index) => ({
  id,
  index,
  weight: BIOMES[id].weight ?? 1,
}));

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
  return withItemValue({
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
    (Number(item.speed) || 0) * 55;
  return Math.max(1, Math.floor((8 + level * 6 + power) * rarity.mult));
}

function withItemValue(item) {
  return {
    ...item,
    value: itemValue(item),
  };
}

export function makeItem(level, weaponBias = Math.random()) {
  const rarity = getRarity(level);
  const multiplier = rarity.mult * (1 + level * 0.12);

  if (weaponBias < 0.44) {
    const base = pick(WEAPON_BASES);
    return withItemValue({
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
  return withItemValue({
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

  return makeUniqueItem(candidates[Math.floor(Math.random() * candidates.length)], level);
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
    iconUrl: definition.iconUrl || undefined,
  };
  return withItemValue(item);
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
    iconUrl: definition.iconUrl || undefined,
  };
  return withItemValue(item);
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
  return withItemValue({
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
  });
}

export function createRegion(regionIndex = 1, seed = Math.floor(Math.random() * 1000000), biomeId = null) {
  const pickedBiomeId = biomeId ?? BIOME_IDS[Math.floor(seededRand(seed, 1) * BIOME_IDS.length)] ?? "mainland";
  const start = { x: 5.5, y: 42 + seededRand(seed, 2) * 4 };
  const end = { x: REGION_W - 7.5, y: 7 + seededRand(seed, 3) * 10 };
  const path = [];
  const rooms = [];
  const mask = new Set();

  for (let i = 0; i < 18; i += 1) {
    const t = i / 17;
    const bend = Math.sin(t * Math.PI * 2.2 + seededRand(seed, 10) * Math.PI * 2) * 7;
    const wobble = Math.sin(t * Math.PI * 5.4 + seededRand(seed, 11) * Math.PI * 2) * 3.8;
    path.push({
      x: lerp(start.x, end.x, t) + bend + wobble,
      y: lerp(start.y, end.y, t) + Math.sin(t * Math.PI * 3.1 + seededRand(seed, 12) * Math.PI * 2) * 8,
      r: 3.4 + seededRand(seed, 40 + i) * 4.3,
    });
  }

  for (let i = 0; i < 9; i += 1) {
    const anchor = path[2 + Math.floor(seededRand(seed, 80 + i) * (path.length - 4))];
    const angle = seededRand(seed, 100 + i) * Math.PI * 2;
    rooms.push({
      x: anchor.x + Math.cos(angle) * (5 + seededRand(seed, 120 + i) * 8),
      y: anchor.y + Math.sin(angle) * (5 + seededRand(seed, 140 + i) * 8),
      rx: 4 + seededRand(seed, 160 + i) * 7,
      ry: 3 + seededRand(seed, 180 + i) * 6,
    });
  }

  for (let y = 0; y < REGION_H; y += 1) {
    for (let x = 0; x < REGION_W; x += 1) {
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
      if (Math.hypot(px - start.x, py - start.y) < 5.4 || Math.hypot(px - end.x, py - end.y) < 4.8) playable = true;
      if (playable) mask.add(`${x},${y}`);
    }
  }

  return {
    id: `${seed}-${regionIndex}`,
    index: regionIndex,
    seed,
    width: REGION_W,
    height: REGION_H,
    biomeId: pickedBiomeId,
    biome: BIOMES[pickedBiomeId] ?? BIOMES.mainland,
    start,
    end,
    mask,
  };
}

export function isRegionTilePlayable(region, x, y) {
  if (!region) return true;
  return region.mask.has(`${Math.floor(x)},${Math.floor(y)}`);
}

export function isRegionPointPlayable(region, x, y, radius = 0) {
  if (!region) return true;
  const checks = radius > 0
    ? [[0, 0], [radius, 0], [-radius, 0], [0, radius], [0, -radius]]
    : [[0, 0]];
  return checks.every(([dx, dy]) => isRegionTilePlayable(region, x + dx, y + dy));
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

  for (let ty = 0; ty < CHUNK_SIZE; ty += 1) {
    for (let tx = 0; tx < CHUNK_SIZE; tx += 1) {
      const worldX = chunk.x + tx;
      const worldY = chunk.y + ty;
      if (region && !isRegionTilePlayable(region, worldX, worldY)) continue;
      const lockedStarterGround = safeChunk
        && Math.hypot(worldX + 0.5 - START_SAFE_CENTER.x, worldY + 0.5 - START_SAFE_CENTER.y) < 5.6;
      const biomeId = region ? region.biomeId : lockedStarterGround ? "mainland" : biomeIdAt(worldX, worldY);
      const noise = hashInt(worldX, worldY, 31);
      biomeCounts.set(biomeId, (biomeCounts.get(biomeId) ?? 0) + 1);
      const edgeMask = region ? regionEdgeMask(region, worldX, worldY) : 0;
      chunk.tiles.push({
        x: worldX,
        y: worldY,
        biomeId,
        variant: noise % GROUND_VARIANT_COUNT,
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
  addObjects(chunk, safeChunk);
  addFoliage(chunk, safeChunk);
  addMonsters(chunk, safeChunk);
  return chunk;
}

function regionEdgeMask(region, x, y) {
  let mask = 0;
  if (!isRegionTilePlayable(region, x + 1, y)) mask |= 1;
  if (!isRegionTilePlayable(region, x - 1, y)) mask |= 2;
  if (!isRegionTilePlayable(region, x, y + 1)) mask |= 4;
  if (!isRegionTilePlayable(region, x, y - 1)) mask |= 8;
  return mask;
}

function addObjects(chunk, safeChunk) {
  const objectCount = chunk.biome.id === "mainland" || chunk.biome.id === "jungle"
    ? 18
    : chunk.biome.id === "desert" || chunk.biome.id === "lava"
      ? 12
      : 15;
  const center = { x: 3.2, y: 3.1 };

  for (let i = 0; i < objectCount; i += 1) {
    const localX = 1 + rand01(chunk.cx, chunk.cy, 100 + i) * (CHUNK_SIZE - 2);
    const localY = 1 + rand01(chunk.cx, chunk.cy, 200 + i) * (CHUNK_SIZE - 2);
    const x = chunk.x + localX;
    const y = chunk.y + localY;
    if (chunk.region && !isRegionPointPlayable(chunk.region, x, y, 0.7)) continue;
    if (chunk.region && (Math.hypot(x - chunk.region.start.x, y - chunk.region.start.y) < 4.2 || Math.hypot(x - chunk.region.end.x, y - chunk.region.end.y) < 3.4)) continue;
    if (safeChunk && Math.hypot(localX - center.x, localY - center.y) < 4.2) continue;

    let type = chunk.biome.objects[Math.floor(rand01(chunk.cx, chunk.cy, 300 + i) * chunk.biome.objects.length)];
    let radius = 0.4;
    let size = 1;

    if (type === "building") {
      radius = 1.15;
      size = 1.2 + rand01(chunk.cx, chunk.cy, 330 + i) * 0.32;
    } else if (type === "ruin") {
      radius = 0.82;
      size = 1.08 + rand01(chunk.cx, chunk.cy, 335 + i) * 0.28;
    } else if (type === "firebeacon" || type === "fireplace") {
      radius = 0.42;
      size = 0.88 + rand01(chunk.cx, chunk.cy, 338 + i) * 0.18;
    } else if (type === "broken-wall") {
      radius = 0.72;
      size = 1.25;
    } else if (type === "old-oak" || type === "pine" || type === "pillar" || type === "obelisk") {
      radius = 0.5;
      size = 1.15;
    } else if (type === "crystal") {
      radius = 0.34;
      size = 0.9;
    }

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
  });
}

function collidesWithBlockingObject(chunk, x, y, radius) {
  return chunk.objects.some((object) => (
    object.blocking
    && Math.hypot(object.x - x, object.y - y) < object.radius + radius + 0.12
  ));
}

function addFoliage(chunk, safeChunk) {
  const countByBiome = {
    mainland: 42,
    jungle: 56,
    snow: 20,
    desert: 16,
    rock: 22,
    lava: 12,
  };
  const count = countByBiome[chunk.biome.id] ?? 28;
  const center = { x: 3.2, y: 3.1 };

  for (let i = 0; i < count; i += 1) {
    const localX = -0.15 + rand01(chunk.cx, chunk.cy, 6100 + i) * (CHUNK_SIZE + 0.3);
    const localY = -0.15 + rand01(chunk.cx, chunk.cy, 6200 + i) * (CHUNK_SIZE + 0.3);
    if (chunk.region && !isRegionPointPlayable(chunk.region, chunk.x + localX, chunk.y + localY, 0.2)) continue;
    if (safeChunk && Math.hypot(localX - center.x, localY - center.y) < 2.2) continue;

    chunk.objects.push({
      id: createId(),
      type: "foliage",
      x: chunk.x + localX,
      y: chunk.y + localY,
      radius: 0,
      size: 0.72 + rand01(chunk.cx, chunk.cy, 6300 + i) * 0.72,
      rotation: (rand01(chunk.cx, chunk.cy, 6400 + i) - 0.5) * 0.55,
      colorShift: rand01(chunk.cx, chunk.cy, 6500 + i),
      flip: rand01(chunk.cx, chunk.cy, 6600 + i) > 0.5,
      foliageVariant: Math.floor(rand01(chunk.cx, chunk.cy, 6700 + i) * 64),
      animSeed: rand01(chunk.cx, chunk.cy, 6800 + i) * Math.PI * 2,
      visualScale: 0.84 + rand01(chunk.cx, chunk.cy, 6900 + i) * 0.38,
      wind: rand01(chunk.cx, chunk.cy, 7000 + i) * 0.5,
      blocking: false,
    });
  }
}

function addDecals(chunk, safeChunk) {
  const count = chunk.biome.id === "mainland" || chunk.biome.id === "jungle" ? 20 : 24;
  const center = { x: 3.2, y: 3.1 };
  const decalSets = {
    mainland: ["pebble", "rubble"],
    desert: ["pebble", "pebble", "bone", "crack", "rubble"],
    snow: ["pebble", "bone", "crack"],
    rock: ["rubble", "rubble", "pebble", "crack", "bone"],
    lava: ["crack", "rubble"],
    jungle: ["rubble", "pebble"],
  };
  const set = decalSets[chunk.biome.id] || decalSets.mainland;

  for (let i = 0; i < count; i += 1) {
    const localX = 0.35 + rand01(chunk.cx, chunk.cy, 1200 + i) * (CHUNK_SIZE - 0.7);
    const localY = 0.35 + rand01(chunk.cx, chunk.cy, 1300 + i) * (CHUNK_SIZE - 0.7);
    if (chunk.region && !isRegionPointPlayable(chunk.region, chunk.x + localX, chunk.y + localY, 0.2)) continue;
    if (safeChunk && Math.hypot(localX - center.x, localY - center.y) < 2.8) continue;
    chunk.decals.push({
      id: createId(),
      type: set[Math.floor(rand01(chunk.cx, chunk.cy, 1400 + i) * set.length)],
      x: chunk.x + localX,
      y: chunk.y + localY,
      size: 0.75 + rand01(chunk.cx, chunk.cy, 1500 + i) * 0.75,
      rotation: rand01(chunk.cx, chunk.cy, 1600 + i) * Math.PI * 2,
      color: rand01(chunk.cx, chunk.cy, 1700 + i),
      animSeed: rand01(chunk.cx, chunk.cy, 1800 + i) * Math.PI * 2,
    });
  }
}

function addMonsters(chunk, safeChunk) {
  const baseCount = chunk.biome.id === "jungle" || chunk.biome.id === "lava" ? 9 : 8;
  const count = baseCount + Math.floor(rand01(chunk.cx, chunk.cy, 700) * 5);
  const safeCenter = { x: 3.2, y: 3.1 };

  for (let i = 0; i < count; i += 1) {
    let localX = 1.1 + rand01(chunk.cx, chunk.cy, 760 + i) * (CHUNK_SIZE - 2.2);
    let localY = 1.1 + rand01(chunk.cx, chunk.cy, 810 + i) * (CHUNK_SIZE - 2.2);
    if (chunk.region && !isRegionPointPlayable(chunk.region, chunk.x + localX, chunk.y + localY, 0.5)) continue;
    if (chunk.region && (Math.hypot(chunk.x + localX - chunk.region.start.x, chunk.y + localY - chunk.region.start.y) < 6 || Math.hypot(chunk.x + localX - chunk.region.end.x, chunk.y + localY - chunk.region.end.y) < 3)) continue;
    if (safeChunk && Math.hypot(localX - safeCenter.x, localY - safeCenter.y) < 5) continue;

    let x = chunk.x + localX;
    let y = chunk.y + localY;
    for (let tries = 0; tries < 8 && (blockedByChunkObjects(chunk, x, y, 0.38) || (chunk.region && !isRegionPointPlayable(chunk.region, x, y, 0.5))); tries += 1) {
      localX = 1.1 + rand01(chunk.cx + tries, chunk.cy, 840 + i) * (CHUNK_SIZE - 2.2);
      localY = 1.1 + rand01(chunk.cx, chunk.cy + tries, 880 + i) * (CHUNK_SIZE - 2.2);
      x = chunk.x + localX;
      y = chunk.y + localY;
    }
    if (chunk.region && !isRegionPointPlayable(chunk.region, x, y, 0.5)) continue;

    const monsterType = chunk.biome.monsters[Math.floor(rand01(chunk.cx, chunk.cy, 900 + i) * chunk.biome.monsters.length)];
    const base = MONSTER_STATS[monsterType];
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
      range: base.range,
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
