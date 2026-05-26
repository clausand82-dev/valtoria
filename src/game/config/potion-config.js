export const POTION_DEFS = {
  small_health: {
    id: "small_health",
    type: "health",
    name: "Small Health Potion",
    restorePct: 0.25,
    color: "#c52c38",
    iconKey: "potion_health",
    iconUrl: "/assets/generated/item/item_potion_health.png",
  },
  big_health: {
    id: "big_health",
    type: "health",
    name: "Big Health Potion",
    restorePct: 0.55,
    color: "#e34b56",
    iconKey: "potion_health",
    iconUrl: "/assets/generated/item/item_potion_health.png",
  },
  mana: {
    id: "mana",
    type: "mana",
    name: "Mana Potion",
    restorePct: 0.25,
    color: "#2d8ed8",
    iconKey: "potion_mana",
    iconUrl: "/assets/generated/item/item_potion_mana.png",
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
