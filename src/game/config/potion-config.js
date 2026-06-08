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
