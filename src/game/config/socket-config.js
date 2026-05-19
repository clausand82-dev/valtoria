export const MAX_ITEM_SOCKETS = 3;

export const GEM_SOCKET_BONUSES = {
  red_gemstone: { label: "Red Gemstone", bonuses: { damagePct: 0.03, fireDamageBonus: 0.04, fireResist: 5 } },
  blue_gemstone: { label: "Blue Gemstone", bonuses: { maxManaPct: 0.04, magic: 1, iceDamageBonus: 0.04, iceResist: 5 } },
  green_gemstone: { label: "Green Gemstone", bonuses: { speedPct: 0.01, dodgeChance: 0.01, poisonDamageBonus: 0.04, dotDamageBonus: 0.03, poisonResist: 5 } },
  yellow_gemstone: { label: "Yellow Gemstone", bonuses: { goldFind: 0.04, lightningDamageBonus: 0.04, lightningResist: 5 } },
  purple_gemstone: { label: "Purple Gemstone", bonuses: { critDamage: 0.08, arcaneDamageBonus: 0.05, arcaneResist: 5 } },
  orange_gemstone: { label: "Orange Gemstone", bonuses: { critChance: 0.01, areaDamageBonus: 0.035, fireDamageBonus: 0.025 } },
  pink_gemstone: { label: "Pink Gemstone", bonuses: { lifeSteal: 0.006, holyResist: 5 } },
  black_gemstone: { label: "Black Gemstone", bonuses: { damagePct: 0.05, critChance: 0.012, shadowDamageBonus: 0.04, shadowResist: 5 } },
  white_gemstone: { label: "White Gemstone", bonuses: { xpGain: 0.04, magicFind: 0.03, allResist: 2, spellDamageBonus: 0.03 } },
};

export function normalizeSockets(sockets) {
  if (!Array.isArray(sockets)) return [];
  return sockets.slice(0, MAX_ITEM_SOCKETS).map((socket) => {
    if (!socket) return null;
    const resourceId = typeof socket === "string" ? socket : socket.resourceId;
    if (!GEM_SOCKET_BONUSES[resourceId]) return null;
    return { resourceId };
  });
}

export function itemCanHaveSockets(item) {
  return Boolean(item && !item.unique && !item.named && (item.slot === "weapon" || item.mode === "armor" || item.slot === "offhand"));
}

export function socketBonusesForItem(item) {
  const bonuses = {};
  for (const socket of normalizeSockets(item?.sockets)) {
    const socketBonuses = GEM_SOCKET_BONUSES[socket?.resourceId]?.bonuses ?? {};
    for (const [key, value] of Object.entries(socketBonuses)) {
      bonuses[key] = (bonuses[key] ?? 0) + value;
    }
  }
  return bonuses;
}
