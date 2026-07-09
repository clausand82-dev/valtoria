import { normalizePotionId } from "./potion-config.js";

export const ACTION_BAR_CONFIG = {
  pickerHoverMs: 2000,
  pickerCloseMs: 1800,
  slots: {
    "1": { kind: "potion", defaultId: "small_health" },
    "2": { kind: "potion", defaultId: "small_mana" },
    "3": { kind: "spell", defaultId: "ember_spark" },
    "4": { kind: "spell", defaultId: "fireball" },
    "5": { kind: "spell", defaultId: "" },
    "6": { kind: "spell", defaultId: "" },
  },
};

function normalizeQuickSlotId(kind, id) {
  if (kind === "potion") return normalizePotionId(id);
  return String(id ?? "");
}

export function normalizeQuickSlots(raw = {}) {
  const slots = {};
  for (const [slotId, config] of Object.entries(ACTION_BAR_CONFIG.slots)) {
    const rawId = raw?.[slotId]?.id ?? raw?.[slotId] ?? config.defaultId ?? "";
    slots[slotId] = {
      kind: config.kind,
      id: normalizeQuickSlotId(config.kind, rawId) || String(config.defaultId ?? ""),
    };
  }
  return slots;
}
