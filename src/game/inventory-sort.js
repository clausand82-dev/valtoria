const RARITY_ORDER = [
  "poor",
  "normal",
  "upgraded",
  "rare",
  "epic",
  "legendary",
  "unique",
];

export const INVENTORY_SORT_OPTIONS = [
  { id: "name", label: "Alfabetisk" },
  { id: "rarity", label: "Rarity" },
  { id: "level", label: "Level" },
  { id: "value", label: "Vaerdi" },
  { id: "durability", label: "Durability" },
];

function itemName(item) {
  return String(item?.name ?? item?.baseName ?? "").trim();
}

function descendingNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function durabilityValue(item) {
  if (!item || item.durability === undefined || item.durability === null) return -1;
  return descendingNumber(item.durability, -1);
}

function compareItems(left, right, sortId) {
  if (sortId === "rarity") {
    const result = RARITY_ORDER.indexOf(String(right?.rarity ?? ""))
      - RARITY_ORDER.indexOf(String(left?.rarity ?? ""));
    if (result !== 0) return result;
  }
  if (sortId === "level") {
    const result = descendingNumber(right?.level) - descendingNumber(left?.level);
    if (result !== 0) return result;
  }
  if (sortId === "value") {
    const result = descendingNumber(right?.value) - descendingNumber(left?.value);
    if (result !== 0) return result;
  }
  if (sortId === "durability") {
    const result = durabilityValue(right) - durabilityValue(left);
    if (result !== 0) return result;
  }
  return itemName(left).localeCompare(itemName(right), "da", { sensitivity: "base" });
}

export function sortInventorySlots(items = [], sortId = "name") {
  const sortedItems = items
    .filter(Boolean)
    .map((item, originalIndex) => ({ item, originalIndex }))
    .sort((left, right) => (
      compareItems(left.item, right.item, sortId)
      || left.originalIndex - right.originalIndex
    ))
    .map(({ item }) => item);
  return [...sortedItems, ...Array(Math.max(0, items.length - sortedItems.length)).fill(null)];
}
