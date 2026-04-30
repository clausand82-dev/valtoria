export const TILE_W = 104;
export const TILE_H = 52;
export const CHUNK_SIZE = 16;
export const WORLD_SEED = 7341;
export const MAX_INVENTORY = 30;

export const RARITIES = [
  { id: "poor", label: "Poor", color: "#9a9a9a", mult: 0.75, weight: 34 },
  { id: "normal", label: "Normal", color: "#f5f3ea", mult: 1, weight: 32 },
  { id: "upgraded", label: "Upgraded", color: "#58d96d", mult: 1.34, weight: 19 },
  { id: "rare", label: "Good", color: "#ffd85d", mult: 1.72, weight: 6 },
  { id: "epic", label: "Great", color: "#b579ff", mult: 2.25, weight: 4 },
  { id: "legendary", label: "Legendary", color: "#ff5757", mult: 3.05, weight: 2 },
];

export const UNIQUE_RARITY = {
  id: "unique",
  label: "Unique",
  color: "#ff9f1c",
  mult: 6.5,
};

export const BIOMES = {
  mainland: {
    id: "mainland",
    name: "Mainland",
    weight: 10,
    groundSheet: "grass_test.png",
    fog: "rgba(46, 82, 45, 0.18)",
    tile: ["#4b5d31", "#526338", "#3f4e2c", "#5c6a3d"],
    path: "rgba(118, 91, 50, 0.28)",
    accent: "#8ba65d",
    objects: ["pine", "old-oak", "boulder", "building", "ruin", "firebeacon", "fireplace"],
    monsters: ["Wolf", "Spider"],
  },
  desert: {
    id: "desert",
    name: "Sunscar Desert",
    weight: 7,
    groundSheet: "sand_test.png",
    fog: "rgba(116, 84, 42, 0.17)",
    tile: ["#b58b4e", "#c49a5d", "#9e7441", "#d3ad73"],
    path: "rgba(93, 62, 35, 0.22)",
    accent: "#d8b66e",
    objects: ["pine", "old-oak", "stone", "rubble", "pillar", "ruin"],
    monsters: ["Snake", "Demon", "Scorpion"],
  },
  snow: {
    id: "snow",
    name: "Frostfall Expanse",
    weight: 7,
    groundSheet: "snow_test.png",
    fog: "rgba(171, 207, 226, 0.16)",
    tile: ["#c9d7d8", "#dce8e8", "#aebfc2", "#eef4f2"],
    path: "rgba(107, 114, 112, 0.22)",
    accent: "#bfe3f2",
    objects: ["pine", "stone", "pillar", "building", "ruin", "crystal", "firebeacon", "fireplace"],
    monsters: ["Skeleton"],
  },
  rock: {
    id: "rock",
    name: "Greyfang Highlands",
    weight: 5,
    groundSheet: "rock_test.png",
    fog: "rgba(80, 82, 78, 0.2)",
    tile: ["#62675e", "#74766d", "#4f564f", "#858272"],
    path: "rgba(74, 65, 49, 0.2)",
    accent: "#bdb48f",
    objects: ["boulder", "stone", "rubble", "obelisk", "crystal"],
    monsters: ["Ghost", "Skeleton"],
  },
  lava: {
    id: "lava",
    name: "Cinderflow",
    weight: 3,
    groundSheet: "lava_test.png",
    fog: "rgba(139, 48, 25, 0.22)",
    tile: ["#6f392c", "#8b4230", "#3d3430", "#c36532"],
    path: "rgba(39, 30, 27, 0.2)",
    accent: "#ff8a42",
    objects: ["pine", "old-oak", "boulder", "stone", "crystal", "pillar"],
    monsters: ["Demon", "Ghost", "Scorpion", "Skeleton"],
  },
  jungle: {
    id: "jungle",
    name: "Vinewake Jungle",
    weight: 2,
    groundSheet: "jungle_test.png",
    fog: "rgba(26, 94, 56, 0.18)",
    tile: ["#2f7b45", "#3f8f4f", "#246338", "#5d9a46"],
    path: "rgba(74, 61, 37, 0.23)",
    accent: "#6fc15d",
    objects: ["old-oak", "pine", "boulder", "ruin", "firebeacon", "fireplace"],
    monsters: ["Wolf", "Spider", "Ghost"],
  },
};

export const BIOME_IDS = Object.keys(BIOMES);

export const MONSTER_STATS = {
  Fallen: { hp: 35, damage: 7, speed: 1.62, range: 0.52, radius: 0.26, color: "#b84d43", xp: 12 },
  "Thorn Husk": { hp: 58, damage: 9, speed: 1.22, range: 0.58, radius: 0.34, color: "#667848", xp: 19 },
  "Mire Brute": { hp: 92, damage: 14, speed: 0.9, range: 0.66, radius: 0.43, color: "#706344", xp: 30 },
  Hollow: { hp: 42, damage: 8, speed: 1.7, range: 0.52, radius: 0.27, color: "#798391", xp: 15 },
  "Shard Crawler": { hp: 66, damage: 12, speed: 1.36, range: 0.6, radius: 0.32, color: "#758996", xp: 24 },
  "Deep Guard": { hp: 118, damage: 18, speed: 0.86, range: 0.76, radius: 0.45, color: "#9a8e80", xp: 39 },
  Raider: { hp: 50, damage: 10, speed: 1.72, range: 0.58, radius: 0.28, color: "#a45f3f", xp: 17 },
  Ashbound: { hp: 76, damage: 14, speed: 1.18, range: 0.64, radius: 0.35, color: "#925758", xp: 26 },
  "Gate Warden": { hp: 134, damage: 20, speed: 0.78, range: 0.82, radius: 0.48, color: "#aa8849", xp: 44 },
  "Bone Warden": { hp: 60, damage: 11, speed: 1.38, range: 0.6, radius: 0.32, color: "#c8bda7", xp: 22 },
  "Rune Shade": { hp: 78, damage: 16, speed: 1.48, range: 3.4, radius: 0.3, color: "#7468c7", xp: 31 },
  "Iron Revenant": { hp: 150, damage: 22, speed: 0.72, range: 0.84, radius: 0.5, color: "#85888f", xp: 49 },
  Demon: { hp: 86, damage: 16, speed: 1.16, range: 0.66, radius: 0.38, color: "#925758", xp: 30 },
  Ghost: { hp: 66, damage: 15, speed: 1.5, range: 3.4, radius: 0.3, color: "#7468c7", xp: 32 },
  Skeleton: { hp: 72, damage: 13, speed: 1.32, range: 0.62, radius: 0.32, color: "#c8bda7", xp: 26 },
  Scorpion: { hp: 64, damage: 13, speed: 1.28, range: 0.62, radius: 0.32, color: "#b46b38", xp: 24 },
  Snake: { hp: 46, damage: 11, speed: 1.72, range: 0.58, radius: 0.26, color: "#6f9a45", xp: 19 },
  Spider: { hp: 58, damage: 12, speed: 1.5, range: 0.6, radius: 0.3, color: "#6d5b83", xp: 22 },
  Wolf: { hp: 72, damage: 14, speed: 1.86, range: 0.64, radius: 0.34, color: "#8b8f93", xp: 28 },
};

export const EQUIPMENT_SLOTS = [
  { id: "head", label: "Head" },
  { id: "neck", label: "Neck" },
  { id: "chest", label: "Chest" },
  { id: "arms", label: "Arms" },
  { id: "legs", label: "Legs" },
  { id: "ring1", label: "Ring" },
  { id: "ring2", label: "Ring" },
  { id: "amulet", label: "Amulet" },
  { id: "bracelet", label: "Bracelet" },
  { id: "feet", label: "Feet" },
  { id: "hands", label: "Hands" },
  { id: "weapon", label: "Weapon" },
];

export const ARMOR_BASES = [
  { slot: "head", name: "Helm", armor: 5, life: 9 },
  { slot: "neck", name: "Gorget", armor: 2, mana: 10 },
  { slot: "chest", name: "Chestplate", armor: 12, life: 18 },
  { slot: "arms", name: "Vambraces", armor: 7, damage: 1 },
  { slot: "legs", name: "Greaves", armor: 8, speed: 0.08 },
  { slot: "ring", name: "Ring", armor: 1, magic: 3 },
  { slot: "amulet", name: "Amulet", armor: 1, mana: 15 },
  { slot: "bracelet", name: "Bracelet", armor: 3, damage: 2 },
  { slot: "feet", name: "Boots", armor: 5, speed: 0.14 },
  { slot: "hands", name: "Gloves", armor: 4, damage: 2 },
];

export const WEAPON_BASES = [
  { name: "Sword", mode: "melee", min: 7, max: 13, range: 1.25, cooldown: 0.52 },
  { name: "Spear", mode: "melee", min: 8, max: 16, range: 1.65, cooldown: 0.72 },
  { name: "Dagger", mode: "melee", min: 5, max: 10, range: 1.05, cooldown: 0.35 },
  { name: "Crossbow", mode: "ranged", min: 9, max: 17, range: 5.3, cooldown: 0.86 },
  { name: "Bow", mode: "ranged", min: 7, max: 14, range: 5.8, cooldown: 0.62 },
  { name: "Javelin", mode: "ranged", min: 10, max: 20, range: 4.7, cooldown: 0.95 },
  { name: "Rune Staff", mode: "magic", min: 8, max: 15, range: 5.2, cooldown: 0.74 },
  { name: "Spell Mask", mode: "magic", min: 6, max: 12, range: 4.6, cooldown: 0.48 },
];

export const PREFIXES = {
  poor: ["Cracked", "Bent", "Frayed"],
  normal: ["Iron", "Oaken", "Plain"],
  upgraded: ["Tempered", "Verdant", "Hunter"],
  rare: ["Sunforged", "Kingsguard", "Storm"],
  epic: ["Voidmarked", "Moonlit", "Warborn"],
  legendary: ["Dragonwake", "Bloodstar", "Eternal"],
};

export const UNIQUE_ITEMS = [
  {
    id: "frostheart",
    name: "Frostheart",
    baseName: "Sword",
    rarity: "unique",
    slot: "weapon",
    mode: "melee",
    levelMin: 1,
    sources: ["chest", "boss", "monster"],
    biomes: ["snow", "mainland", "jungle", "rock", "desert", "lava"],
    iconUrl: "/assets/generated/uniqueitem_frostheart.png",
    scaleWithLevel: true,
    stats: {
      damageMin: 72,
      damageMax: 112,
      range: 1.38,
      cooldown: 0.42,
      magic: 24,
      maxMana: 30,
    },
  },
];

export const NAMED_ITEM_TEMPLATES = [
  {
    id: "nethrendor_soldier_sword",
    name: "Nethrendor Soldier Sword",
    baseName: "Sword",
    slot: "weapon",
    mode: "melee",
    levelMin: 3,
    sources: ["monster", "chest"],
    biomes: ["mainland", "rock", "snow"],
    dropChance: 0.012,
    rarityIds: ["poor", "normal", "upgraded", "rare", "epic", "legendary"],
    iconUrl: null,
    scaleWithLevel: true,
    stats: {
      damageMin: 9,
      damageMax: 16,
      range: 1.22,
      cooldown: 0.54,
      armor: 2,
    },
  },
];
