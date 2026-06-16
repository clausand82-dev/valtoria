export const POTION_DEFS = {
  small_health: {
    id: "small_health",
    type: "health",
    name: "Small Health Potion",
    restorePct: 0.25,
    dropWeight: 62,
    color: "#c52c38",
    iconKey: "potion_health",
    iconUrl: "/assets/generated/item/item_potion_smallhealth.png",
  },
  medium_health: {
    id: "medium_health",
    type: "health",
    name: "Medium Health Potion",
    restorePct: 0.50,
    dropWeight: 44,
    color: "#c52c38",
    iconKey: "potion_health",
    iconUrl: "/assets/generated/item/item_potion_mediumhealth.png",
  },
  big_health: {
    id: "big_health",
    type: "health",
    name: "Big Health Potion",
    restorePct: 1,
    dropWeight: 5,
    color: "#e34b56",
    iconKey: "potion_health",
    iconUrl: "/assets/generated/item/item_potion_bighealth.png",
  },
  small_mana: {
    id: "small_mana",
    type: "mana",
    name: "Small Mana Potion",
    restorePct: 0.25,
    dropWeight: 44,
    color: "#2d8ed8",
    iconKey: "potion_mana",
    iconUrl: "/assets/generated/item/item_potion_smallmana.png",
  },
  medium_mana: {
    id: "medium_mana",
    type: "mana",
    name: "Medium Mana Potion",
    restorePct: 0.50,
    dropWeight: 30,
    color: "#2d8ed8",
    iconKey: "potion_mana",
    iconUrl: "/assets/generated/item/item_potion_mediummana.png",
  },
  big_mana: {
    id: "big_mana",
    type: "mana",
    name: "Big Mana Potion",
    restorePct: 1,
    dropWeight: 5,
    color: "#2d8ed8",
    iconKey: "potion_mana",
    iconUrl: "/assets/generated/item/item_potion_bigmana.png",
  },
  potion_purple_health_mana_50: {
    id: "potion_purple_health_mana_50",
    type: "hybrid",
    name: "Lilla Forstærkningsdrik",
    rarity: "rare",
    restoreHealthPct: 0.5,
    restoreManaPct: 0.5,
    dropWeight: 8,
    color: "#b579ff",
    iconKey: "potion_mediumrefill",
    iconUrl: "/assets/generated/item/item_potion_mediumrefill.png",
    description: "Genopretter 50% health og 50% mana.",
  },
  potion_orange_regen_health_mana: {
    id: "potion_orange_regen_health_mana",
    type: "regen",
    name: "Orange Regenerationsdrik",
    rarity: "rare",
    durationMs: 180000,
    tickMs: 1000,
    healthRegenPct: 0.02,
    manaRegenPct: 0.02,
    dropWeight: 5,
    color: "#ff9f1c",
    iconKey: "potion_slowrefill",
    iconUrl: "/assets/generated/item/item_potion_slowrefill.png",
    description: "Giver +2% health og +2% mana pr. sekund i 3 minutter.",
  },
  potion_speedbuf: {
    id: "potion_speedbuf",
    type: "buff",
    name: "Speed Buffer",
    rarity: "rare",
    durationMs: 60000,
    speedBuffPct: 0.15,
    dropWeight: 5,
    color: "#1c9fff",
    iconKey: "potion_speedbuf",
    iconUrl: "/assets/generated/item/item_potion_mediumrefill.png",
    description: "Giver +15% speed i 20 sekunder.",
  },
};

export const POTION_IDS = Object.keys(POTION_DEFS);

export const POTION_RECIPE_ACCESS = {
  BACKPACK: "backpack",
  ALCHEMY_BENCH: "alchemy_bench",
};

export const POTION_MERGE_RECIPES = [
  { inputs: { small_health: 2 }, output: "medium_health", count: 1, access: POTION_RECIPE_ACCESS.BACKPACK },
  { inputs: { medium_health: 2 }, output: "big_health", count: 1, access: POTION_RECIPE_ACCESS.BACKPACK },
  { inputs: { small_mana: 2 }, output: "medium_mana", count: 1, access: POTION_RECIPE_ACCESS.BACKPACK },
  { inputs: { medium_mana: 2 }, output: "big_mana", count: 1, access: POTION_RECIPE_ACCESS.BACKPACK },
  { inputs: { medium_health: 1, medium_mana: 1 }, output: "potion_purple_health_mana_50", count: 1, access: POTION_RECIPE_ACCESS.ALCHEMY_BENCH },
  { inputs: { big_health: 1, big_mana: 1, magic_essence: 1 }, output: "potion_orange_regen_health_mana", count: 1, access: POTION_RECIPE_ACCESS.ALCHEMY_BENCH },
  { inputs: { red_rose: 1, rare_pink_flower: 1, magicmushroom: 1 }, output: "potion_speedbuf", count: 10, access: POTION_RECIPE_ACCESS.ALCHEMY_BENCH },
];

export const CITY_TONIC_RECIPE_ACCESS = {
  CITY_TONIC_LAB: "city_tonic_lab",
};

export const CITY_TONIC_RECIPES = [
  {
    id: "bone_medicine",
    title: "Bone Medicine",
    description: "A dense battlefield medicine made from bonedust, magic essence and rare flowers. Permanently strengthens the settlement's defence and health.",
    inputs: {
      bonedust: 100,
      magic_essence: 25,
      rare_pink_flower: 5,
    },
    cityStatEffects: {
      city_defence: 1,
      citizens_health: 1,
    },
    access: CITY_TONIC_RECIPE_ACCESS.CITY_TONIC_LAB,
    repeatable: true,
  },
  {
    id: "arcane_power",
    title: "Arcane Power",
    description: "A concentrated arcane warding mixture that reinforces the settlement's magical defences.",
    inputs: {
      bonedust: 100,
      magic_essence: 50,
      rare_pink_flower: 10,
    },
    cityStatEffects: {
      city_defence: 2,
    },
    access: CITY_TONIC_RECIPE_ACCESS.CITY_TONIC_LAB,
    repeatable: true,
  },
  {
    id: "rare_perfume",
    title: "Rare Perfume",
    description: "A rare and valuable perfume brewed from roses, water and magic essence. Permanently improves trade.",
    inputs: {
      red_rose: 20,
      magic_essence: 5,
      water: 1,
    },
    cityStatEffects: {
      trade: 1,
    },
    access: CITY_TONIC_RECIPE_ACCESS.CITY_TONIC_LAB,
    repeatable: true,
  },
  {
    id: "magic_medicine",
    title: "Magic Medicine",
    description: "A strong restorative medicine brewed from magic mushrooms and magic essence. Permanently improves citizen health.",
    inputs: {
      magicmushroom: 20,
      magic_essence: 10,
    },
    cityStatEffects: {
      citizens_health: 2,
    },
    access: CITY_TONIC_RECIPE_ACCESS.CITY_TONIC_LAB,
    repeatable: true,
  },
  {
    id: "rose_festival_oil",
    title: "Rose Festival Oil",
    description: "A fragrant ceremonial oil used in festivals and public rituals. Permanently improves happiness.",
    inputs: {
      red_rose: 50,
      magic_essence: 5,
      water: 5,
    },
    cityStatEffects: {
      happiness: 2,
    },
    access: CITY_TONIC_RECIPE_ACCESS.CITY_TONIC_LAB,
    repeatable: true,
  },
  {
    id: "guardian_powder",
    title: "Guardian Powder",
    description: "A protective powder spread around gates and walls. Permanently improves defence and citizen health.",
    inputs: {
      bonedust: 150,
      magic_essence: 40,
      magicmushroom: 10,
    },
    cityStatEffects: {
      city_defence: 2,
      citizens_health: 1,
    },
    access: CITY_TONIC_RECIPE_ACCESS.CITY_TONIC_LAB,
    repeatable: true,
  },
  {
    id: "healers_bloom_mix",
    title: "Healer's Bloom Mix",
    description: "A flower-based restorative blend used by healers throughout the settlement.",
    inputs: {
      rare_pink_flower: 15,
      red_rose: 30,
      magic_essence: 10,
      water: 5,
    },
    cityStatEffects: {
      citizens_health: 2,
      happiness: 1,
    },
    access: CITY_TONIC_RECIPE_ACCESS.CITY_TONIC_LAB,
    repeatable: true,
  },
  {
    id: "watchmans_incense",
    title: "Watchman's Incense",
    description: "A sharp incense burned by guards during night watch. Permanently improves defence and morale.",
    inputs: {
      red_rose: 10,
      bonedust: 50,
      magic_essence: 20,
    },
    cityStatEffects: {
      city_defence: 1,
      happiness: 1,
    },
    access: CITY_TONIC_RECIPE_ACCESS.CITY_TONIC_LAB,
    repeatable: true,
  },
];

export function potionRecipeAvailableAt(recipe, station = POTION_RECIPE_ACCESS.BACKPACK) {
  const access = String(recipe?.access ?? POTION_RECIPE_ACCESS.BACKPACK);
  const stationId = String(station ?? POTION_RECIPE_ACCESS.BACKPACK);
  if (stationId === POTION_RECIPE_ACCESS.BACKPACK) return access === POTION_RECIPE_ACCESS.BACKPACK;
  if (stationId === POTION_RECIPE_ACCESS.ALCHEMY_BENCH) {
    return access === POTION_RECIPE_ACCESS.BACKPACK || access === POTION_RECIPE_ACCESS.ALCHEMY_BENCH;
  }
  return false;
}

export function potionRecipesForStation(station = POTION_RECIPE_ACCESS.BACKPACK) {
  return POTION_MERGE_RECIPES.filter((recipe) => potionRecipeAvailableAt(recipe, station));
}

const POTION_ID_ALIASES = {
  health: "small_health",
  mana: "small_mana",
  potion_health: "small_health",
  potion_mana: "small_mana",
  mediumhealth: "medium_health",
  mediummana: "medium_mana",
  bighealth: "big_health",
  bigmana: "big_mana",
};

export function normalizePotionId(value) {
  const id = String(value ?? "").trim();
  const mapped = POTION_ID_ALIASES[id] ?? id;
  if (POTION_DEFS[mapped]) return mapped;
  return "";
}

export function potionDefById(value) {
  const id = normalizePotionId(value);
  return id ? POTION_DEFS[id] : null;
}
