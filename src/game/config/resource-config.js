// Resource- og harvesting-konfiguration.
//
// RESOURCE_DEFS beskriver items der ikke er normalt udstyr, men materialer.
// De kan stackes i inventory og kan senere bruges til crafting, bybygning eller
// merge/forarbejdning.
//
// rarityColor er bevidst samme lyseblaa farve for alle resources, fordi UI'et
// flere steder bruger rarityColor til tekst/glow. Det adskiller resources fra
// mana-farven og fra almindeligt udstyr.
export const RESOURCE_RARITY_COLOR = "#8be9ff";

export const RESOURCE_DEFS = {
  wood_piece: { name: "Wood Piece", i18n: { da: { name: "Traestykke" } }, stackMax: 100, value: 1, color: "#b88454", iconUrl: "/assets/generated/item/item_res_woodpieces.png" },
  iron_piece: { name: "Iron Piece", i18n: { da: { name: "Jernstykke" } }, stackMax: 100, value: 3, color: "#a88f78", iconUrl: "/assets/generated/item/item_res_ironore.png" },
  rock_piece: { name: "Rock Piece", i18n: { da: { name: "Stenstykke" } }, stackMax: 100, value: 1, color: "#9a9488", iconUrl: "/assets/generated/item/item_res_stonepiece.png" },
  crystal_piece: { name: "Crystal Piece", i18n: { da: { name: "Krystalstykke" } }, stackMax: 100, value: 2, color: "#7fdcff", iconUrl: "/assets/generated/item/item_res_crystalpiece.png" },
  wood_plank: { name: "Wood Plank", i18n: { da: { name: "Traeplanke" } }, stackMax: 50, value: 8, color: "#c99b5d", iconUrl: "/assets/generated/item/item_res_woodplank.png" },
  iron_bar: { name: "Iron Bar", i18n: { da: { name: "Jernbarre" } }, stackMax: 25, value: 12, color: "#c2b3a2", iconUrl: "/assets/generated/item/item_res_ironbar.png" },
  crystal: { name: "Crystal", i18n: { da: { name: "Krystal" } }, stackMax: 25, value: 18, color: "#b6f1ff", iconUrl: "/assets/generated/item/item_res_crystal.png" },
  stone_brick: { name: "Stone Brick", i18n: { da: { name: "Stenblok" } }, stackMax: 25, value: 6, color: "#b8b0a2", iconUrl: "/assets/generated/item/item_res_stonebrick.png" },
  iron_plates: { name: "Iron Plates", i18n: { da: { name: "Jernplader" } }, stackMax: 25, value: 12, color: "#00d9ff", iconUrl: "/assets/generated/item/item_res_ironplates.png" },
  iron_chains: { name: "Iron Chains", i18n: { da: { name: "Jernkaeder" } }, stackMax: 25, value: 12, color: "#0051ff", iconUrl: "/assets/generated/item/item_res_ironchain.png" },
  meat: { name: "Meat", i18n: { da: { name: "Kod" } }, stackMax: 100, value: 2, color: "#c8786c", iconUrl: "/assets/generated/item/item_res_rawmeat.png" },
  fruit: { name: "Fruit", i18n: { da: { name: "Frugt" } }, stackMax: 100, value: 2, color: "#d5b84e", iconUrl: "/assets/generated/item/item_res_fruit.png" },
  coal: { name: "Coal", i18n: { da: { name: "Kul" } }, stackMax: 100, value: 2, color: "#4d4a48", iconUrl: "/assets/generated/item/item_res_coal.png" },
  wheat: { name: "Wheat", i18n: { da: { name: "Hvede" } }, stackMax: 100, value: 2, color: "#d6b85a", iconUrl: "/assets/generated/item/item_res_wheat.png" },
  paper: { name: "Paper", i18n: { da: { name: "Papir", description: "Genbrugspapir lavet af gamle noter og boeger." } }, stackMax: 1000, value: 2, color: "#f3f4aa", iconUrl: "/assets/generated/item/item_res_paper.png", description: "Recycled paper made from old notes and books." },
  scroll: { name: "Scroll", i18n: { da: { name: "Rulle", description: "En tom rulle fremstillet af papir." } }, stackMax: 100, value: 2, color: "#ffbb00", iconUrl: "/assets/generated/item/item_res_scroll.png", description: "A blank scroll crafted from paper." },
  junk: { name: "Junk", i18n: { da: { name: "Skrammel" } }, stackMax: 100, value: 1, color: "#8f887d", iconUrl: "/assets/generated/item/item_res_junk.png" },
  //gold_ingot: { name: "Gold Ingot", stackMax: 100, value: 1000, color: "#f1c657" },
  gold_bar: { name: "Gold Bar", i18n: { da: { name: "Guldbarre" } }, stackMax: 100, value: 1000, color: "#f1c657", iconUrl: "/assets/generated/item/item_res_goldbar.png" },
  magic_essence: { name: "Magic Essence", i18n: { da: { name: "Magisk essens" } }, stackMax: 1000, value: 45, color: "#9f7dff", iconUrl: "/assets/generated/item/item_res_magicessence.png" },
  food: { name: "Food Barrel", i18n: { da: { name: "Madtoende" } }, stackMax: 100, value: 120, color: "#d49a58", iconUrl: "/assets/generated/item/item_res_food.png" },
  ale: { name: "Ale", i18n: { da: { name: "Oel" } }, stackMax: 1000, value: 150, color: "#dca64f", iconUrl: "/assets/generated/item/item_quest_barrel.png" },
  hide: { name: "Hide", i18n: { da: { name: "Skind" } }, stackMax: 100, value: 4, color: "#a87a50", iconUrl: "/assets/generated/item/item_res_hide.png" },
  bonedust: { name: "Bone Dust", i18n: { da: { name: "Benstoev" } }, stackMax: 1000, value: 3, color: "#c9c0a6", iconUrl: "/assets/generated/item/item_res_bonedust.png" },
  gold_nugget: { name: "Gold Nugget", i18n: { da: { name: "Guldklump" } }, stackMax: 10, value: 10, color: "#ffbf00", iconUrl: "/assets/generated/item/item_quest_goldnugget.png" },
  
  // Plants / forageables
  red_rose: { name: "Red Rose", i18n: { da: { name: "Roed rose" } }, stackMax: 100, value: 1, color: "#ff6b8a", iconUrl: "/assets/generated/item/item_plant_redrose.png" },
  rare_pink_flower: { name: "Rare Purple Flower", i18n: { da: { name: "Sjaelden lilla blomst" } }, stackMax: 100, value: 2, color: "#c27bd9", iconUrl: "/assets/generated/item/item_plant_rarepinkflower.png" },
  magicmushroom: { name: "Magic Mushroom", i18n: { da: { name: "Magisk svamp", description: "En svamp fra Valtorias fugtige skove. Bruges som ressource." } }, stackMax: 100, value: 2, color: "#c99f7a", iconUrl: "/assets/generated/item/item_res_magicmushroom.png", description: "A mushroom from Valtoria's humid forests. Used as a resource." },
  fruit_orange: { name: "Orange", i18n: { da: { name: "Appelsin" } }, stackMax: 100, value: 3, color: "#c9c0a6", iconUrl: "/assets/generated/item/item_quest_orange.png" },
  fruit_banana: { name: "Banana", i18n: { da: { name: "Banan" } }, stackMax: 100, value: 3, color: "#c9c0a6", iconUrl: "/assets/generated/item/item_quest_banana.png" },
  red_gemstone: { name: "Red Gemstone", i18n: { da: { name: "Roed aedelsten" } }, stackMax: 100, value: 28, color: "#ff6b5f", iconUrl: "/assets/generated/item/item_res_redgemstone.png" },
  yellow_gemstone: { name: "Yellow Gemstone", i18n: { da: { name: "Gul aedelsten" } }, stackMax: 100, value: 28, color: "#ffd85d", iconUrl: "/assets/generated/item/item_res_yellowgemstone.png" },
  green_gemstone: { name: "Green Gemstone", i18n: { da: { name: "Groen aedelsten" } }, stackMax: 100, value: 28, color: "#58d96d", iconUrl: "/assets/generated/item/item_res_greengemstone.png" },
  blue_gemstone: { name: "Blue Gemstone", i18n: { da: { name: "Blaa aedelsten" } }, stackMax: 100, value: 28, color: "#58bfff", iconUrl: "/assets/generated/item/item_res_bluegemstone.png" },
  black_gemstone: { name: "Black Gemstone", i18n: { da: { name: "Sort aedelsten" } }, stackMax: 100, value: 80, color: "#303030", iconUrl: "/assets/generated/item/item_res_blackgemstone.png" },
  white_gemstone: { name: "White Gemstone", i18n: { da: { name: "Hvid aedelsten" } }, stackMax: 100, value: 80, color: "#f2f4ef", iconUrl: "/assets/generated/item/item_res_whitegemstone.png" },
  purple_gemstone: { name: "Purple Gemstone", i18n: { da: { name: "Lilla aedelsten" } }, stackMax: 100, value: 70, color: "#b579ff", iconUrl: "/assets/generated/item/item_res_purplegemstone.png" },
  pink_gemstone: { name: "Pink Gemstone", i18n: { da: { name: "Lyseroed aedelsten" } }, stackMax: 100, value: 70, color: "#ff88c8", iconUrl: "/assets/generated/item/item_res_pinkgemstone.png" },
  orange_gemstone: { name: "Orange Gemstone", i18n: { da: { name: "Orange aedelsten" } }, stackMax: 100, value: 70, color: "#ff9f1c", iconUrl: "/assets/generated/item/item_res_orangegemstone.png" },
  turquoise_gemstone: { name: "Turquoise Gemstone", i18n: { da: { name: "Turkis aedelsten" } }, stackMax: 100, value: 70, color: "#36d7c9", iconUrl: "/assets/generated/item/item_res_turquoisegemstone.png" },
  diamond: { name: "Diamond", i18n: { da: { name: "Diamant" } }, stackMax: 100, value: 140, color: "#d9fbff", iconUrl: "/assets/generated/item/item_res_diamond.png" },
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
  { inputs: { red_gemstone: 1, blue_gemstone: 1, green_gemstone: 1 }, output: "purple_gemstone", count: 1, station: "research_lab" },
  { inputs: { red_gemstone: 1, yellow_gemstone: 1, blue_gemstone: 1 }, output: "pink_gemstone", count: 1, station: "research_lab" },
  { inputs: { red_gemstone: 1, yellow_gemstone: 1, green_gemstone: 1 }, output: "orange_gemstone", count: 1, station: "research_lab" },
  { inputs: { blue_gemstone: 1, green_gemstone: 1, yellow_gemstone: 1 }, output: "turquoise_gemstone", count: 1 },
  { inputs: { coal: 1000 }, output: "diamond", count: 1, station: "research_lab" },
];
