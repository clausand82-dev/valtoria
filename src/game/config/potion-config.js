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
  big_health: {
    id: "big_health",
    type: "health",
    name: "Big Health Potion",
    restorePct: 0.55,
    dropWeight: 12,
    color: "#e34b56",
    iconKey: "potion_health",
    iconUrl: "/assets/generated/item/item_potion_health.png",
  },
  mana: {
    id: "mana",
    type: "mana",
    name: "Mana Potion",
    restorePct: 0.25,
    dropWeight: 44,
    color: "#2d8ed8",
    iconKey: "potion_mana",
    iconUrl: "/assets/generated/item/item_potion_smallmana.png",
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

export function normalizePotionId(value) {
  const id = String(value ?? "").trim();
  if (POTION_DEFS[id]) return id;
  if (id === "health") return "small_health";
  if (id === "mana") return "mana";
  return "";
}

export function potionDefById(value) {
  const id = normalizePotionId(value);
  return id ? POTION_DEFS[id] : null;
}
