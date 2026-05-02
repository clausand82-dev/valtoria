// Resource- og harvesting-konfiguration.
//
// RESOURCE_DEFS beskriver items der ikke er normalt udstyr, men materialer.
// De kan stackes i inventory og kan senere bruges til crafting, bybygning eller
// merge/forarbejdning.
//
// iconIndex peger på 4x3 resource sheets.
// sheet: "resources" bruger res_sheet_001.png.
// sheet: "gemstones" bruger res_sheet_002.png.
// rarityColor er bevidst samme lyseblaa farve for alle resources, fordi UI'et
// flere steder bruger rarityColor til tekst/glow. Det adskiller resources fra
// mana-farven og fra almindeligt udstyr.
export const RESOURCE_RARITY_COLOR = "#8be9ff";

export const RESOURCE_DEFS = {
  // res_sheet_001, row 1: wood piece, iron piece, rock piece, crystal piece
  wood_piece: { name: "Wood Piece", stackMax: 50, value: 1, sheet: "resources", iconIndex: 0, color: "#b88454" },
  iron_piece: { name: "Iron Piece", stackMax: 50, value: 3, sheet: "resources", iconIndex: 1, color: "#a88f78" },
  rock_piece: { name: "Rock Piece", stackMax: 50, value: 1, sheet: "resources", iconIndex: 2, color: "#9a9488" },
  crystal_piece: { name: "Crystal Piece", stackMax: 100, value: 2, sheet: "resources", iconIndex: 3, color: "#7fdcff" },

  // res_sheet_001, row 2: wood plank, iron bar, crystal, stone brick
  wood_plank: { name: "Wood Plank", stackMax: 50, value: 8, sheet: "resources", iconIndex: 4, color: "#c99b5d" },
  iron_bar: { name: "Iron Bar", stackMax: 25, value: 12, sheet: "resources", iconIndex: 5, color: "#c2b3a2" },
  crystal: { name: "Crystal", stackMax: 25, value: 18, sheet: "resources", iconIndex: 6, color: "#b6f1ff" },
  stone_brick: { name: "Stone Brick", stackMax: 25, value: 6, sheet: "resources", iconIndex: 7, color: "#b8b0a2" },

  // res_sheet_001, row 3: meat, fruit, coal, junk
  meat: { name: "Meat", stackMax: 25, value: 2, sheet: "resources", iconIndex: 8, color: "#c8786c" },
  fruit: { name: "Fruit", stackMax: 25, value: 2, sheet: "resources", iconIndex: 9, color: "#d5b84e" },
  coal: { name: "Coal", stackMax: 100, value: 2, sheet: "resources", iconIndex: 10, color: "#4d4a48" },
  paper: { name: "Paper", stackMax: 100, value: 2, sheet: "resources", iconIndex: 8, color: "#f3f4aa" },
  scroll: { name: "Scroll", stackMax: 20, value: 2, sheet: "resources", iconIndex: 9, color: "#ffbb00" },
  junk: { name: "Junk", stackMax: 100, value: 1, sheet: "resources", iconIndex: 11, color: "#8f887d" },

  // res_sheet_002 gemstones
  red_gemstone: { name: "Red Gemstone", stackMax: 100, value: 28, sheet: "gemstones", iconIndex: 0, color: "#ff6b5f" },
  yellow_gemstone: { name: "Yellow Gemstone", stackMax: 100, value: 28, sheet: "gemstones", iconIndex: 1, color: "#ffd85d" },
  green_gemstone: { name: "Green Gemstone", stackMax: 100, value: 28, sheet: "gemstones", iconIndex: 2, color: "#58d96d" },
  blue_gemstone: { name: "Blue Gemstone", stackMax: 100, value: 28, sheet: "gemstones", iconIndex: 3, color: "#58bfff" },
  black_gemstone: { name: "Black Gemstone", stackMax: 100, value: 80, sheet: "gemstones", iconIndex: 4, color: "#303030" },
  white_gemstone: { name: "White Gemstone", stackMax: 100, value: 80, sheet: "gemstones", iconIndex: 5, color: "#f2f4ef" },
  purple_gemstone: { name: "Purple Gemstone", stackMax: 100, value: 70, sheet: "gemstones", iconIndex: 6, color: "#b579ff" },
  pink_gemstone: { name: "Pink Gemstone", stackMax: 100, value: 70, sheet: "gemstones", iconIndex: 7, color: "#ff88c8" },
  orange_gemstone: { name: "Orange Gemstone", stackMax: 100, value: 70, sheet: "gemstones", iconIndex: 8, color: "#ff9f1c" },
  turquoise_gemstone: { name: "Turquoise Gemstone", stackMax: 100, value: 70, sheet: "gemstones", iconIndex: 9, color: "#36d7c9" },
  diamond: { name: "Diamond", stackMax: 100, value: 140, sheet: "gemstones", iconIndex: 10, color: "#d9fbff" },
};

export const GEMSTONE_RESOURCE_IDS = [
  "red_gemstone",
  "yellow_gemstone",
  "green_gemstone",
  "blue_gemstone",
];

export const RESOURCE_MERGE_RECIPES = [
  { inputs: { rock_piece: 5 }, output: "stone_brick", count: 1 },
  { inputs: { iron_piece: 3 }, output: "iron_bar", count: 1, requiresFire: true },
  { inputs: { wood_piece: 2 }, output: "coal", count: 1, requiresFire: true },
  { inputs: { wood_piece: 10 }, output: "wood_plank", count: 1 },
  { inputs: { crystal_piece: 50 }, output: "crystal", count: 1 },
  { inputs: { red_gemstone: 1, blue_gemstone: 1, green_gemstone: 1 }, output: "purple_gemstone", count: 1 },
  { inputs: { red_gemstone: 1, yellow_gemstone: 1, blue_gemstone: 1 }, output: "pink_gemstone", count: 1 },
  { inputs: { red_gemstone: 1, yellow_gemstone: 1, green_gemstone: 1 }, output: "orange_gemstone", count: 1 },
  { inputs: { blue_gemstone: 1, green_gemstone: 1, yellow_gemstone: 1 }, output: "turquoise_gemstone", count: 1 },
];

// Object-typer der kan ødelægges med melee.
//
// damageStages: Hvor mange melee-slag objectet altid kræver, uanset hero damage.
// hp bruges kun til HP-bar procenten og sættes ned stage-for-stage.
// particleColor: Farve på puf/fragment-effekten når det rammes/ødelægges.
// loot: Almindelige resource drops. chance 1 betyder altid.
// rareLoot: Sjældnere drops. Der rulles på hver entry, så flere rare drops kan
//   principielt falde samtidig, men lave chance-værdier holder det sjældent.
export const DESTRUCTIBLE_OBJECTS = {
  pine: {
    hp: 35,
    damageStages: 3,
    particleColor: "#b88454",
    loot: [{ resource: "wood_piece", min: 2, max: 5, chance: 1 }],
    rareLoot: [
      { resource: "coal", min: 1, max: 2, chance: 0.12 },
      { resource: "wood_plank", min: 1, max: 1, chance: 0.04 },
    ],
  },
  "old-oak": {
    hp: 48,
    damageStages: 3,
    particleColor: "#9f6f42",
    loot: [{ resource: "wood_piece", min: 3, max: 7, chance: 1 }],
    rareLoot: [
      { resource: "coal", min: 1, max: 2, chance: 0.14 },
      { resource: "wood_plank", min: 1, max: 1, chance: 0.06 },
    ],
  },
  boulder: {
    hp: 45,
    damageStages: 3,
    particleColor: "#9a9488",
    loot: [{ resource: "rock_piece", min: 2, max: 5, chance: 1 }],
    rareLoot: [
      { resource: "iron_piece", min: 1, max: 2, chance: 0.13 },
      { resource: "coal", min: 1, max: 2, chance: 0.1 },
      { resource: "stone_brick", min: 1, max: 1, chance: 0.04 },
      { resource: "diamond", min: 1, max: 1, chance: 0.001 },
    ],
  },
  stone: {
    hp: 38,
    damageStages: 3,
    particleColor: "#9a9488",
    loot: [{ resource: "rock_piece", min: 1, max: 4, chance: 1 }],
    rareLoot: [
      { resource: "iron_piece", min: 1, max: 1, chance: 0.1 },
      { resource: "coal", min: 1, max: 1, chance: 0.09 },
      { resource: "stone_brick", min: 1, max: 1, chance: 0.035 },
      { resource: "diamond", min: 1, max: 1, chance: 0.0008 },
    ],
  },
  rubble: {
    hp: 32,
    damageStages: 3,
    particleColor: "#9a9488",
    loot: [{ resource: "rock_piece", min: 1, max: 3, chance: 1 }],
    rareLoot: [
      { resource: "iron_piece", min: 1, max: 1, chance: 0.08 },
      { resource: "coal", min: 1, max: 1, chance: 0.08 },
      { resource: "stone_brick", min: 1, max: 1, chance: 0.03 },
      { resource: "diamond", min: 1, max: 1, chance: 0.0006 },
    ],
  },
  ruin: {
    hp: 64,
    damageStages: 3,
    particleColor: "#9a9488",
    loot: [{ resource: "rock_piece", min: 4, max: 10, chance: 1 }],
    rareLoot: [
      { resource: "stone_brick", min: 1, max: 2, chance: 0.26 },
      { resource: "wood_plank", min: 1, max: 1, chance: 0.035 },
    ],
    // Very rare: random red-quality (legendary) equipment items.
    itemLoot: [
      { rarity: "legendary", chance: 0.0035, tries: 120 },
    ],
  },
  pillar: {
    hp: 52,
    damageStages: 3,
    particleColor: "#9a9488",
    loot: [{ resource: "stone_brick", min: 1, max: 2, chance: 1 }],
    rareLoot: [],
  },
  crystal: {
    hp: 55,
    damageStages: 3,
    particleColor: "#7fdcff",
    loot: [{ resource: "crystal_piece", min: 4, max: 9, chance: 1 }],
    rareLoot: [
      { resource: "crystal", min: 1, max: 1, chance: 0.08 },
      { resource: "red_gemstone", min: 1, max: 1, chance: 0.025 },
      { resource: "yellow_gemstone", min: 1, max: 1, chance: 0.025 },
      { resource: "green_gemstone", min: 1, max: 1, chance: 0.025 },
      { resource: "blue_gemstone", min: 1, max: 1, chance: 0.025 },
      { resource: "black_gemstone", min: 1, max: 1, chance: 0.001 },
      { resource: "white_gemstone", min: 1, max: 1, chance: 0.001 },
    ],
  },
  building: {
    hp: 70,
    damageStages: 3,
    particleColor: "#c99b5d",
    loot: [
      { resource: "junk", min: 2, max: 6, chance: 1 },
      { resource: "wood_piece", min: 1, max: 5, chance: 0.45 },
      { resource: "rock_piece", min: 1, max: 4, chance: 0.34 },
      { resource: "iron_piece", min: 1, max: 2, chance: 0.12 },
      { resource: "crystal_piece", min: 1, max: 4, chance: 0.06 },
      { resource: "meat", min: 1, max: 2, chance: 0.05 },
      { resource: "fruit", min: 1, max: 2, chance: 0.05 },
      { resource: "coal", min: 1, max: 2, chance: 0.05 },
      { resource: "wood_plank", min: 1, max: 1, chance: 0.035 },
      { resource: "stone_brick", min: 1, max: 1, chance: 0.03 },
      { resource: "iron_bar", min: 1, max: 1, chance: 0.018 },
      { resource: "crystal", min: 1, max: 1, chance: 0.012 },
    ],
    rareLoot: [
      { resource: "red_gemstone", min: 1, max: 1, chance: 0.004 },
      { resource: "yellow_gemstone", min: 1, max: 1, chance: 0.004 },
      { resource: "green_gemstone", min: 1, max: 1, chance: 0.004 },
      { resource: "blue_gemstone", min: 1, max: 1, chance: 0.004 },
      { resource: "black_gemstone", min: 1, max: 1, chance: 0.0007 },
      { resource: "white_gemstone", min: 1, max: 1, chance: 0.0007 },
      { resource: "diamond", min: 1, max: 1, chance: 0.00045 },
    ],
  },
  object_woodboxes_ground: {
    hp: 52,
    damageStages: 3,
    particleColor: "#c99b5d",
    loot: [
      { resource: "junk", min: 1, max: 3, chance: 1 },
      { resource: "wood_piece", min: 1, max: 4, chance: 0.10 },
      { resource: "wood_plank", min: 1, max: 1, chance: 0.05 },
    ],
    rareLoot: [
      { resource: "diamond", min: 1, max: 1, chance: 0.001 },
    ],
  },
  object_shelfs: {
    hp: 52,
    damageStages: 3,
    particleColor: "#c99b5d",
    loot: [
      { resource: "health", min: 1, max: 3, chance: 0.1 },
      { resource: "paper", min: 1, max: 4, chance: 0.1 },
      { resource: "wood_plank", min: 1, max: 4, chance: 0.1 },
    ],
    rareLoot: [
      { resource: "diamond", min: 1, max: 1, chance: 0.005 },
    ],
  },
};

export const DESTROYED_ITEM_RESOURCE_DROPS = {
  poor: {
    guaranteed: [{ resource: "junk", min: 1, max: 2 }],
    rare: [{ resource: "iron_piece", min: 1, max: 1, chance: 0.02 }],
  },
  normal: {
    guaranteed: [{ resource: "junk", min: 1, max: 3 }],
    rare: [{ resource: "iron_piece", min: 1, max: 1, chance: 0.04 }],
  },
  upgraded: {
    guaranteed: [{ resource: "junk", min: 2, max: 4 }],
    rare: [{ resource: "iron_piece", min: 1, max: 2, chance: 0.08 }],
  },
  rare: {
    guaranteed: [{ resource: "junk", min: 3, max: 6 }],
    rare: [{ resource: "iron_piece", min: 1, max: 2, chance: 0.14 }],
  },
  epic: {
    guaranteed: [{ resource: "junk", min: 4, max: 8 }, { resource: "iron_piece", min: 1, max: 2 }],
    rare: [
      { resource: "red_gemstone", min: 1, max: 1, chance: 0.035 },
      { resource: "yellow_gemstone", min: 1, max: 1, chance: 0.035 },
      { resource: "green_gemstone", min: 1, max: 1, chance: 0.035 },
      { resource: "blue_gemstone", min: 1, max: 1, chance: 0.035 },
      { resource: "diamond", min: 1, max: 1, chance: 0.004 },
    ],
  },
  legendary: {
    guaranteed: [{ resource: "junk", min: 6, max: 10 }, { resource: "iron_piece", min: 2, max: 4 }],
    rare: [
      { resource: "red_gemstone", min: 1, max: 1, chance: 0.08 },
      { resource: "yellow_gemstone", min: 1, max: 1, chance: 0.08 },
      { resource: "green_gemstone", min: 1, max: 1, chance: 0.08 },
      { resource: "blue_gemstone", min: 1, max: 1, chance: 0.08 },
      { resource: "diamond", min: 1, max: 1, chance: 0.012 },
    ],
  },
  unique: {
    guaranteed: [{ resource: "junk", min: 8, max: 12 }, { resource: "iron_piece", min: 3, max: 5 }],
    rare: [
      { resource: "red_gemstone", min: 1, max: 2, chance: 0.1 },
      { resource: "yellow_gemstone", min: 1, max: 2, chance: 0.1 },
      { resource: "green_gemstone", min: 1, max: 2, chance: 0.1 },
      { resource: "blue_gemstone", min: 1, max: 2, chance: 0.1 },
      { resource: "diamond", min: 1, max: 1, chance: 0.02 },
    ],
  },
};
