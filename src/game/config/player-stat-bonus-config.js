export const PLAYER_STAT_BONUS_KEYS = [
  "maxHp", "maxMana", "range", "damageMin", "damageMax", "armor", "speed",
  "maxHpPct", "maxManaPct", "armorFlat", "armorPct", "damagePct", "speedPct", "attackSpeed",
  "magic", "critChance", "critDamage", "blockChance", "blockAmount", "dodgeChance",
  "lifeSteal", "magicFind", "goldFind", "resourceFind", "xpGain",
  "physicalResist", "fireResist", "iceResist", "lightningResist", "poisonResist",
  "arcaneResist", "holyResist", "shadowResist", "natureResist", "allResist", "magicResist",
  "physicalDamageBonus", "fireDamageBonus", "iceDamageBonus", "lightningDamageBonus",
  "poisonDamageBonus", "arcaneDamageBonus", "holyDamageBonus", "shadowDamageBonus",
  "natureDamageBonus", "spellDamageBonus", "directDamageBonus", "areaDamageBonus",
  "dotDamageBonus", "hazardDamageBonus", "dotDurationBonus", "statusDurationBonus",
];

const PLAYER_STAT_BONUS_KEY_SET = new Set(PLAYER_STAT_BONUS_KEYS);

export function normalizePlayerStatBonuses(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const normalized = {};
  for (const [key, rawAmount] of Object.entries(value)) {
    if (!PLAYER_STAT_BONUS_KEY_SET.has(key)) continue;
    const amount = Number(rawAmount);
    if (!Number.isFinite(amount) || amount === 0) continue;
    normalized[key] = amount;
  }
  return normalized;
}

export function addPlayerStatBonuses(current = {}, delta = {}) {
  const next = { ...normalizePlayerStatBonuses(current) };
  for (const [key, amount] of Object.entries(normalizePlayerStatBonuses(delta))) {
    const total = (Number(next[key]) || 0) + amount;
    if (total === 0) delete next[key];
    else next[key] = Number(total.toFixed(6));
  }
  return next;
}
