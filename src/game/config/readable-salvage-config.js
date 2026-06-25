import { READABLE_DEF_BY_ID, READABLE_ITEM_DEFS } from "./readable-config.js";

export const READABLE_SALVAGE_CONFIG = {
  defaultPaperValue: 1,
  outputItemId: "paper",
  exclude: {
    questItems: true,
    uniqueItems: true,
    storyItems: true,
    lockedItems: true,
  },
  overrides: {
    // readableId: paper amount
  },
  craftRecipes: [
    {
      id: "paper_to_scroll",
      input: { itemId: "paper", count: 20 },
      output: { itemId: "scroll", count: 1 },
      label: "Craft Scroll",
      description: "Use 20 paper to craft 1 scroll.",
    },
  ],
};

function collectReadableIds(value, ids = new Set()) {
  if (!value || typeof value !== "object") return ids;
  if (Array.isArray(value)) {
    for (const entry of value) collectReadableIds(entry, ids);
    return ids;
  }
  if (value.readableId) ids.add(String(value.readableId));
  for (const entry of Object.values(value)) collectReadableIds(entry, ids);
  return ids;
}

export function questReadableIds(questDefs = {}) {
  const ids = new Set();
  for (const quest of Object.values(questDefs ?? {})) {
    collectReadableIds(quest?.target, ids);
    collectReadableIds(quest?.demands, ids);
    collectReadableIds(quest?.conditions, ids);
    collectReadableIds(quest?.requirements, ids);
    collectReadableIds(quest?.unlock, ids);
    if (String(quest?.source ?? "") === "readable" && quest.sourceReadableId) {
      ids.add(String(quest.sourceReadableId));
    }
  }
  return ids;
}

export function readableDefForItem(item) {
  return item?.readableId ? READABLE_DEF_BY_ID[item.readableId] : null;
}

export function readableSpellUnlockForItem(item) {
  const def = readableDefForItem(item);
  if (def?.spellUnlock) return String(def.spellUnlock);
  const readableId = String(item?.readableId ?? "");
  if (!readableId) return "";
  const parent = READABLE_ITEM_DEFS.find((entry) => (
    entry.spellUnlock
    && Array.isArray(entry.parts)
    && entry.parts.map(String).includes(readableId)
  ));
  return parent?.spellUnlock ? String(parent.spellUnlock) : "";
}

export function getReadablePaperValue(item, config = READABLE_SALVAGE_CONFIG) {
  const def = readableDefForItem(item);
  const readableId = String(item?.readableId ?? "");
  const override = config.overrides?.[readableId];
  const configured = item?.salvage?.count ?? item?.salvagePaperValue ?? def?.salvage?.count ?? def?.salvagePaperValue ?? override;
  return Math.max(1, Math.floor(Number(configured ?? config.defaultPaperValue) || 1));
}

export function canSalvageReadable(item, options = {}) {
  if (!item || item.mode !== "readable") return false;
  const config = options.config ?? READABLE_SALVAGE_CONFIG;
  const def = readableDefForItem(item);
  const spellUnlock = readableSpellUnlockForItem(item);
  const unlockedSpells = new Set((options.unlockedSpells ?? []).map(String));
  const spellAlreadyUnlocked = spellUnlock && unlockedSpells.has(spellUnlock);
  const allowSalvage = item.allowSalvage === true || def?.allowSalvage === true || spellAlreadyUnlocked;
  if (item.noSalvage === true || def?.noSalvage === true) return false;
  if (config.exclude?.lockedItems && (item.locked || item.lockedForCityUse || def?.locked || def?.lockedForCityUse)) return false;
  if (config.exclude?.questItems && (item.questItemId || item.questId || item.readableQuestId || def?.questId || def?.readableQuestId)) {
    return allowSalvage;
  }
  if (config.exclude?.uniqueItems && (item.unique || def?.unique || item.rarity === "unique" || def?.rarity === "unique")) {
    return allowSalvage;
  }
  if (config.exclude?.storyItems && (item.storyItem || def?.storyItem || item.storyUnique || def?.storyUnique || def?.spellUnlock || def?.consumable)) {
    return allowSalvage;
  }
  const readableId = String(item.readableId ?? "");
  const questIds = options.questReadableIds ?? questReadableIds(options.questDefs ?? {});
  if (readableId && questIds.has(readableId)) return allowSalvage;
  return true;
}
