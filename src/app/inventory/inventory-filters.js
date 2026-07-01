export const INVENTORY_FILTERS = [
  { id: "all", labelKey: "inventory.filter.all", text: "*", color: "#f5f3ea" },
  { id: "merge", labelKey: "inventory.filter.merge", text: "M", color: "#f1c657" },
  { id: "resource", labelKey: "inventory.filter.resource", text: "R", color: "#8be9ff" },
  { id: "poor", labelKey: "inventory.filter.poor", text: "P", color: "#9a9a9a" },
  { id: "normal", labelKey: "inventory.filter.normal", text: "N", color: "#f5f3ea" },
  { id: "upgraded", labelKey: "inventory.filter.upgraded", text: "U", color: "#58d96d" },
  { id: "rare", labelKey: "inventory.filter.rare", text: "G", color: "#ffd85d" },
  { id: "epic", labelKey: "inventory.filter.epic", text: "E", color: "#b579ff" },
  { id: "legendary", labelKey: "inventory.filter.legendary", text: "L", color: "#ff5757" },
  { id: "unique", labelKey: "inventory.filter.unique", text: "Q", color: "#f1c657" },
];

export function itemMatchesInventoryFilter(item, filter) {
  if (filter === "merge") return Boolean(item.canMerge);
  if (filter === "resource") return item.mode === "resource";
  if (filter === "unique") return item.unique || item.rarity === "unique";
  return item.mode !== "resource" && item.rarity === filter;
}

export function isItemRequiredByActiveQuests(item, activeQuests = []) {
  if (!item || !activeQuests?.length) return false;
  for (const quest of activeQuests) {
    if (quest.type !== "collect_quest_item") continue;
    const target = quest.target ?? {};
    if (target.questItemId && item.mode === "quest" && String(item.questItemId) === String(target.questItemId)) return true;
    if (Array.isArray(target.questItems) && item.mode === "quest") {
      for (const req of target.questItems) {
        if (String(req.questItemId) === String(item.questItemId)) return true;
      }
    }
    if (target.resources && item.mode === "resource") {
      for (const req of target.resources) {
        if (String(req.resource) === String(item.resourceId)) return true;
      }
    }
    if (Array.isArray(target.items)) {
      for (const req of target.items) {
        let match = true;
        if (req.templateId) match = match && (String(item.uniqueId) === String(req.templateId) || String(item.namedId) === String(req.templateId));
        if (req.namePrefix) match = match && String(item.name || "").startsWith(`${req.namePrefix} `);
        if (req.baseName) match = match && String(item.baseName || "") === String(req.baseName);
        if (req.rarity) match = match && String(item.rarity || "") === String(req.rarity);
        if (match) return true;
      }
    }
  }
  return false;
}
