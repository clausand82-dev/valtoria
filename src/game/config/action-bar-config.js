export const ACTION_BAR_CONFIG = {
  pickerHoverMs: 2000,
  pickerCloseMs: 1800,
  slots: {
    "1": { kind: "potion", defaultId: "small_health" },
    "2": { kind: "potion", defaultId: "mana" },
    "3": { kind: "spell", defaultId: "ember_spark" },
    "4": { kind: "spell", defaultId: "fireball" },
  },
};

export function normalizeQuickSlots(raw = {}) {
  const slots = {};
  for (const [slotId, config] of Object.entries(ACTION_BAR_CONFIG.slots)) {
    slots[slotId] = {
      kind: config.kind,
      id: String(raw?.[slotId]?.id ?? raw?.[slotId] ?? config.defaultId ?? ""),
    };
  }
  return slots;
}
