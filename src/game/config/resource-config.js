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
  wood_piece: { name: "Wood Piece", stackMax: 100, value: 1, color: "#b88454" },
  iron_piece: { name: "Iron Piece", stackMax: 100, value: 3, sheet: "resources", iconIndex: 1, color: "#a88f78" },
  rock_piece: { name: "Rock Piece", stackMax: 100, value: 1, sheet: "resources", iconIndex: 2, color: "#9a9488" },
  crystal_piece: { name: "Crystal Piece", stackMax: 100, value: 2, sheet: "resources", iconIndex: 3, color: "#7fdcff" },

  // res_sheet_001, row 2: wood plank, iron bar, crystal, stone brick
  wood_plank: { name: "Wood Plank", stackMax: 50, value: 8, color: "#c99b5d" },
  iron_bar: { name: "Iron Bar", stackMax: 25, value: 12, sheet: "resources", iconIndex: 5, color: "#c2b3a2" },
  crystal: { name: "Crystal", stackMax: 25, value: 18, sheet: "resources", iconIndex: 6, color: "#b6f1ff" },
  stone_brick: { name: "Stone Brick", stackMax: 25, value: 6, sheet: "resources", iconIndex: 7, color: "#b8b0a2" },

  // res_sheet_001, row 3: meat, fruit, coal, junk
  meat: { name: "Meat", stackMax: 100, value: 2, sheet: "resources", iconIndex: 8, color: "#c8786c" },
  fruit: { name: "Fruit", stackMax: 100, value: 2, sheet: "resources", iconIndex: 9, color: "#d5b84e" },
  coal: { name: "Coal", stackMax: 100, value: 2, sheet: "resources", iconIndex: 10, color: "#4d4a48" },
  wheat: { name: "Wheat", stackMax: 100, value: 2, sheet: "resources", iconIndex: 9, color: "#d6b85a", iconUrl: "/assets/generated/item/item_res_wheat.png" },
  paper: { name: "Paper", stackMax: 100, value: 2, sheet: "resources", iconIndex: 8, color: "#f3f4aa" },
  scroll: { name: "Scroll", stackMax: 100, value: 2, sheet: "resources", iconIndex: 9, color: "#ffbb00" },
  junk: { name: "Junk", stackMax: 100, value: 1, sheet: "resources", iconIndex: 11, color: "#8f887d" },
  //gold_ingot: { name: "Gold Ingot", stackMax: 100, value: 1000, sheet: "resources", iconIndex: 5, color: "#f1c657" },
  gold_bar: { name: "Gold Bar", stackMax: 100, value: 1000, sheet: "resources", iconIndex: 5, color: "#f1c657", iconUrl: "/assets/generated/item/item_res_goldbar.png" },
  magic_essence: { name: "Magic Essence", stackMax: 1000, value: 45, sheet: "resources", iconIndex: 6, color: "#9f7dff", iconUrl: "/assets/generated/item/item_res_magicessens.png" },
  food: { name: "Food Barrel", stackMax: 1000, value: 120, sheet: "resources", iconIndex: 8, color: "#d49a58", iconUrl: "/assets/generated/item/item_res_food.png" },
  
  // Plants / forageables
  red_rose: { name: "Rød rose", stackMax: 100, value: 1, sheet: "resources", iconIndex: 12, color: "#ff6b8a", iconUrl: "/assets/generated/item/item_plant_redrose.png" },
  rare_pink_flower: { name: "Sjælden lilla blomst", stackMax: 100, value: 2, sheet: "resources", iconIndex: 13, color: "#c27bd9", iconUrl: "/assets/generated/item/item_plant_rarepinkflower.png" },

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
  { inputs: { coal: 1000 }, output: "diamond", count: 1, station: "research_lab" },
];

// Object-typer der kan ødelægges med melee.
//
// damageStages: Hvor mange melee-slag objectet altid kræver, uanset hero damage.
// hp bruges kun til HP-bar procenten og sættes ned stage-for-stage.
// particleColor: Farve på puf/fragment-effekten når det rammes/ødelægges.
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
