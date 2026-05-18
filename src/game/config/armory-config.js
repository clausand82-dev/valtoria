export const ARMORY_POINTS_BY_RARITY = {
  poor: 1,
  normal: 2,
  upgraded: 3,
  rare: 4,
  epic: 6,
  legendary: 8,
  unique: 20,
};

export const ARMORY_POINT_IDS = ["weaponPoints", "armorPoints"];

export function normalizeArmoryPoints(value = {}) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    weaponPoints: Math.max(0, Math.floor(Number(source.weaponPoints) || 0)),
    armorPoints: Math.max(0, Math.floor(Number(source.armorPoints) || 0)),
  };
}

export function isArmoryPointId(resourceId) {
  return ARMORY_POINT_IDS.includes(String(resourceId ?? ""));
}

export function getArmoryPointTarget(item) {
  if (!item || typeof item !== "object") return null;
  if (item.type === "weapon" || item.slot === "weapon") return "weaponPoints";
  if (item.type === "armor" || item.mode === "armor") return "armorPoints";
  return null;
}

export function getArmoryPointValue(item) {
  const rarity = String(item?.rarity ?? "normal");
  return Math.max(0, Math.floor(Number(ARMORY_POINTS_BY_RARITY[rarity]) || 0));
}

export function getArmoryItemQuantity(item) {
  if (!item) return 0;
  return item.flags?.stackable ? Math.max(1, Math.floor(Number(item.count) || 1)) : 1;
}

export function armoryConversionError(item) {
  if (!item) return "Missing item.";
  if (item.canConvertToArmory === false) return "Item cannot be converted to armory points.";
  if (item.locked || item.questBound || item.keyItem || item.storyItem) return "Quest, story, key, or locked items cannot be converted.";
  if (item.mode === "quest" || item.flags?.quest) return "Quest items cannot be converted.";
  const target = getArmoryPointTarget(item);
  if (!target) return "Only weapon and armor items can be converted.";
  const rarity = String(item.rarity ?? "normal");
  if (!Object.hasOwn(ARMORY_POINTS_BY_RARITY, rarity)) return `Unsupported rarity: ${rarity}.`;
  return "";
}

export function canConvertItemToArmory(item) {
  return armoryConversionError(item) === "";
}

export function getArmoryConversion(item, amount = 1) {
  const error = armoryConversionError(item);
  if (error) return { ok: false, error, target: null, amount: 0, pointsPerItem: 0, points: 0 };
  const available = getArmoryItemQuantity(item);
  const requested = Math.max(1, Math.floor(Number(amount) || 1));
  const convertedAmount = Math.min(available, item.flags?.stackable ? requested : 1);
  const pointsPerItem = getArmoryPointValue(item);
  return {
    ok: convertedAmount > 0 && pointsPerItem > 0,
    error: convertedAmount > 0 && pointsPerItem > 0 ? "" : "No armory points produced.",
    target: getArmoryPointTarget(item),
    amount: convertedAmount,
    pointsPerItem,
    points: convertedAmount * pointsPerItem,
  };
}

export function convertItemToArmory(item, amount = 1) {
  return getArmoryConversion(item, amount);
}
