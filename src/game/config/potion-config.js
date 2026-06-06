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
};

export const POTION_IDS = Object.keys(POTION_DEFS);

export const POTION_MERGE_RECIPES = [
  { inputs: { small_health: 2 }, output: "medium_health", count: 1 },
  { inputs: { medium_health: 2 }, output: "big_health", count: 1 },
  { inputs: { small_mana: 2 }, output: "medium_mana", count: 1 },
  { inputs: { medium_mana: 2 }, output: "big_mana", count: 1 },
  { inputs: { medium_health: 1, medium_mana:1 }, output: "potion_purple_health_mana_50", count: 1 },
  { inputs: { big_health: 1, big_mana:1, magic_essence: 1}, output: "potion_orange_regen_health_mana", count: 1 },
];

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
