import { ACTION_CONFIG } from "../src/game/config/action-config.js";
import { MAP_PREFABS } from "../src/game/config/map-prefab-config.js";
import { MAP_REGION_SETS } from "../src/game/config/map-region-config.js";
import { SUBREGION_CONFIG } from "../src/game/config/subregion-config.js";
import { QUEST_DEFS, QUEST_ITEM_DEFS } from "../src/game/config/quest-config.js";
import { QUEST_NPCS } from "../src/game/config/npc-config.js";
import { REGION_OBJECT_DEFS } from "../src/game/config/region-object-config.js";
import { RESOURCE_DEFS } from "../src/game/config/resource-config.js";
import { UNIQUE_ITEMS, NAMED_ITEM_TEMPLATES } from "../src/game/config/item-config.js";
import { READABLE_ITEM_DEFS } from "../src/game/config/readable-config.js";
import { RARITIES } from "../src/game/config/rarity-config.js";
import { LOOT_TABLES } from "../src/game/config/loot-tables-config.js";
import { MONSTER_DEFS } from "../src/game/config/monster-config.js";
import { CITY_ACHIEVEMENTS } from "../src/game/config/city-achievement-config.js";
import { validateBeastLocalization } from "../src/i18n/beast/monster-localization.js";

const RESERVED_ACTION_TYPES = new Set(["questStart", "questAdvance", "summon"]);
const RUNTIME_LOOT_TABLE_REFS = new Set([
  "chest_common",
  "chest_bonus_red_rose",
  "destroyed_item_poor_scrap",
  "destroyed_item_normal_scrap",
  "destroyed_item_upgraded_scrap",
  "destroyed_item_rare_scrap",
  "destroyed_item_epic_scrap",
  "destroyed_item_legendary_scrap",
  "destroyed_item_unique_scrap",
  "gold_treasure",
]);

const errors = [];
const warnings = [];

function idOf(value, fallback = "") {
  return String(value?.id ?? fallback ?? "").trim();
}

function addError(message) {
  errors.push(message);
  console.error(`[validate] ERROR ${message}`);
}

function addWarning(message) {
  warnings.push(message);
  console.log(`[validate] WARNING ${message}`);
}

function entriesOf(record) {
  return Object.entries(record ?? {}).filter(([, value]) => value && typeof value === "object");
}

function checkDuplicateIds(label, record) {
  const seen = new Map();
  for (const [key, value] of entriesOf(record)) {
    const id = idOf(value, key);
    if (!id) {
      addError(`${label} "${key}" is missing id`);
      continue;
    }
    if (id !== key) addWarning(`${label} key "${key}" has mismatched id "${id}"`);
    if (seen.has(id)) addError(`duplicate ${label} id "${id}" in "${seen.get(id)}" and "${key}"`);
    else seen.set(id, key);
  }
  return seen;
}

function visitActionRefs(value, owner, visit) {
  if (!value || typeof value !== "object") return;
  if (typeof value.actionId === "string") visit(value.actionId, owner);
  if (Array.isArray(value.actions)) {
    value.actions.forEach((entry, index) => {
      if (entry?.actionId) visit(String(entry.actionId), `${owner}.actions[${index}]`);
    });
  }
}

function checkActionRef(actionId, owner, actionIds) {
  if (!actionIds.has(actionId)) addError(`unknown actionId "${actionId}" used by ${owner}`);
}

function collectRegionEntries() {
  const regions = [];
  for (const [setId, regionList] of Object.entries(MAP_REGION_SETS ?? {})) {
    if (!Array.isArray(regionList)) continue;
    regionList.forEach((region, index) => {
      if (region && typeof region === "object") regions.push({ setId, index, region });
    });
  }
  return regions;
}

function checkQuestRef(questId, owner, questIds) {
  if (!questId) return;
  if (!questIds.has(String(questId))) addError(`unknown quest id "${questId}" referenced by ${owner}`);
}

function visitQuestRefs(value, owner, questIds) {
  if (!value || typeof value !== "object") return;
  const singleKeys = [
    "quest",
    "questId",
    "questActive",
    "questCompleted",
    "requiresQuest",
    "unlockQuest",
  ];
  for (const key of singleKeys) {
    if (typeof value[key] === "string") checkQuestRef(value[key], `${owner}.${key}`, questIds);
  }
  for (const key of ["completedQuests", "requiresQuests", "unlockQuests", "unlocks"]) {
    if (Array.isArray(value[key])) {
      value[key].forEach((questId, index) => checkQuestRef(questId, `${owner}.${key}[${index}]`, questIds));
    }
  }
  for (const key of ["questStepActive", "questStepCompleted", "questAdvance", "questStepComplete", "blockedBy", "requires", "demands"]) {
    if (value[key] && typeof value[key] === "object") visitQuestRefs(value[key], `${owner}.${key}`, questIds);
  }
}

function checkResourceMap(map, owner, resourceIds) {
  if (!map || typeof map !== "object" || Array.isArray(map)) return;
  for (const resourceId of Object.keys(map)) {
    if (!resourceIds.has(resourceId)) addError(`unknown resource id "${resourceId}" referenced by ${owner}`);
  }
}

function checkLootRefs(value, owner, resourceIds, questItemIds, namedItemIds, uniqueItemIds) {
  if (!value || typeof value !== "object") return;
  checkResourceMap(value.resources, `${owner}.resources`, resourceIds);
  checkResourceMap(value.resourceDrop, `${owner}.resourceDrop`, resourceIds);
  if (value.questItemId && !questItemIds.has(String(value.questItemId))) {
    addError(`unknown quest item id "${value.questItemId}" referenced by ${owner}.questItemId`);
  }
  if (Array.isArray(value.namedItems)) {
    value.namedItems.forEach((entry, index) => {
      const namedId = entry?.namedId ?? entry?.id;
      if (namedId && !namedItemIds.has(String(namedId))) addError(`unknown named item id "${namedId}" referenced by ${owner}.namedItems[${index}]`);
    });
  }
  if (Array.isArray(value.uniques)) {
    value.uniques.forEach((entry, index) => {
      const uniqueId = entry?.uniqueId ?? entry?.id;
      if (uniqueId && !uniqueItemIds.has(String(uniqueId))) addError(`unknown unique item id "${uniqueId}" referenced by ${owner}.uniques[${index}]`);
    });
  }
}

function normalizeLootTableRefs(value) {
  if (value === undefined || value === null || value === "") return [];
  return Array.isArray(value) ? value : [value];
}

function checkLootTableRefs(value, owner, lootTableIds, usedLootTableIds) {
  if (!value || typeof value !== "object") return;
  for (const [field, refs] of Object.entries({ lootTable: value.lootTable, lootTables: value.lootTables, instanceLootTables: value.instanceLootTables })) {
    const seen = new Set();
    normalizeLootTableRefs(refs).forEach((tableId, index) => {
      const normalized = String(tableId ?? "").trim();
      if (!normalized) return;
      if (seen.has(normalized)) addError(`duplicate lootTable "${normalized}" referenced by ${owner}.${field}`);
      seen.add(normalized);
      if (!lootTableIds.has(normalized)) addError(`unknown lootTable "${normalized}" referenced by ${owner}.${field}${Array.isArray(refs) ? `[${index}]` : ""}`);
      else usedLootTableIds.add(normalized);
    });
  }
}

function checkLootTableEntry(tableId, entry, index, resourceIds, questItemIds, namedItemIds, uniqueItemIds, readableIds, rarityIds) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    addError(`lootTable "${tableId}" entry[${index}] must be an object`);
    return;
  }
  const owner = `lootTable "${tableId}" entry[${index}]`;
  const type = String(entry.type ?? "").trim();
  if (type === "resource") {
    const resourceId = entry.id ?? entry.resourceId ?? entry.resource;
    if (!resourceIds.has(String(resourceId))) addError(`unknown resource id "${resourceId}" referenced by ${owner}`);
  }
  if (type === "readable") {
    const readableId = entry.readableId ?? entry.id;
    if (!readableIds.has(String(readableId))) addError(`unknown readable id "${readableId}" referenced by ${owner}`);
  }
  if (type === "questItem") {
    const questItemId = entry.questItemId ?? entry.id;
    if (!questItemIds.has(String(questItemId))) addError(`unknown quest item id "${questItemId}" referenced by ${owner}`);
  }
  if (type === "named") {
    const namedId = entry.itemId ?? entry.id;
    if (namedId && !namedItemIds.has(String(namedId))) addError(`unknown named item id "${namedId}" referenced by ${owner}`);
  }
  if (type === "unique") {
    const uniqueId = entry.itemId ?? entry.id;
    if (uniqueId && !uniqueItemIds.has(String(uniqueId))) addError(`unknown unique item id "${uniqueId}" referenced by ${owner}`);
  }
  if (type === "equipment") {
    for (const field of ["rarity", "minRarity"]) {
      if (entry[field] && !rarityIds.has(String(entry[field]))) addError(`unknown rarity id "${entry[field]}" referenced by ${owner}.${field}`);
    }
  }
}

function checkPrefabRefs(prefabIds) {
  for (const { setId, index, region } of collectRegionEntries()) {
    const owner = `region "${region?.id ?? `${setId}[${index}]`}"`;
    const pool = region?.prefabRules?.pool;
    if (Array.isArray(pool)) {
      pool.forEach((entry, poolIndex) => {
        const prefabId = typeof entry === "string" ? entry : entry?.id;
        if (prefabId && !prefabIds.has(String(prefabId))) {
          addError(`unknown prefab id "${prefabId}" referenced by ${owner}.prefabRules.pool[${poolIndex}]`);
        }
      });
    }
  }
}

function main() {
  validateBeastLocalization({ warn: addWarning });
  const actionIds = checkDuplicateIds("action", ACTION_CONFIG);
  const questIds = checkDuplicateIds("quest", QUEST_DEFS);
  const npcIds = checkDuplicateIds("NPC", QUEST_NPCS);
  const prefabIds = checkDuplicateIds("prefab", MAP_PREFABS);
  const subregionIds = checkDuplicateIds("subregion", SUBREGION_CONFIG);
  const regionIds = new Map();
  const resourceIds = new Set(Object.keys(RESOURCE_DEFS ?? {}));
  const questItemIds = new Set(Object.keys(QUEST_ITEM_DEFS ?? {}));
  const namedItemIds = new Set((NAMED_ITEM_TEMPLATES ?? []).map((item) => String(item.id)).filter(Boolean));
  const uniqueItemIds = new Set((UNIQUE_ITEMS ?? []).map((item) => String(item.id)).filter(Boolean));
  const readableIds = new Set((READABLE_ITEM_DEFS ?? []).map((item) => String(item.id)).filter(Boolean));
  const rarityIds = new Set((RARITIES ?? []).map((rarity) => String(rarity.id)).filter(Boolean));
  const lootTableIds = new Set(Object.keys(LOOT_TABLES ?? {}));
  const achievementIds = new Set((CITY_ACHIEVEMENTS ?? []).map((achievement) => String(achievement.id)).filter(Boolean));
  const usedLootTableIds = new Set([...RUNTIME_LOOT_TABLE_REFS].filter((tableId) => lootTableIds.has(tableId)));

  for (const [tableId, entries] of Object.entries(LOOT_TABLES ?? {})) {
    if (!Array.isArray(entries)) addError(`lootTable "${tableId}" must be an array`);
    else if (!entries.length) addError(`lootTable "${tableId}" is empty`);
    else entries.forEach((entry, index) => checkLootTableEntry(tableId, entry, index, resourceIds, questItemIds, namedItemIds, uniqueItemIds, readableIds, rarityIds));
  }

  for (const { setId, index, region } of collectRegionEntries()) {
    const id = idOf(region);
    if (!id) addError(`region ${setId}[${index}] is missing id`);
    else if (regionIds.has(id)) addError(`duplicate region id "${id}" in ${regionIds.get(id)} and ${setId}[${index}]`);
    else regionIds.set(id, `${setId}[${index}]`);

    for (const [listKey, entries] of Object.entries({ objects: region.objects, foliage: region.foliageSet ?? region.foliageSets ?? region.foliage, npcs: region.npcs })) {
      if (!Array.isArray(entries)) continue;
      entries.forEach((entry, entryIndex) => {
        const owner = `region "${id || `${setId}[${index}]`}".${listKey}[${entryIndex}]`;
        visitActionRefs(entry, owner, (actionId, refOwner) => checkActionRef(actionId, refOwner, actionIds));
        visitQuestRefs(entry, owner, questIds);
        checkLootRefs(entry, owner, resourceIds, questItemIds, namedItemIds, uniqueItemIds);
        checkLootTableRefs(entry, owner, lootTableIds, usedLootTableIds);
        if (entry?.npcId && !npcIds.has(String(entry.npcId))) addError(`unknown NPC id "${entry.npcId}" used by ${owner}`);
      });
    }

    if (Array.isArray(region.rareMobs)) {
      region.rareMobs.forEach((entry, entryIndex) => {
        checkLootTableRefs(entry, `region "${id || `${setId}[${index}]`}".rareMobs[${entryIndex}]`, lootTableIds, usedLootTableIds);
      });
    }
  }

  for (const [actionId, action] of entriesOf(ACTION_CONFIG)) {
    const isReservedAction = RESERVED_ACTION_TYPES.has(action.type);
    const reservedAllowed = Boolean(action.allowStub || action.devOnly || action.testOnly);
    if (isReservedAction && !reservedAllowed) {
      addError(`action "${actionId}" uses reserved type "${action.type}" without allowStub/devOnly/testOnly`);
    } else if (isReservedAction) {
      addWarning(`action "${actionId}" uses reserved type "${action.type}"`);
    }
    if (isReservedAction && reservedAllowed) continue;
    visitQuestRefs(action, `action "${actionId}"`, questIds);
    checkLootRefs(action.costs, `action "${actionId}".costs`, resourceIds, questItemIds, namedItemIds, uniqueItemIds);
    checkLootRefs(action.rewards, `action "${actionId}".rewards`, resourceIds, questItemIds, namedItemIds, uniqueItemIds);
    if (action.targetSubregionId && !subregionIds.has(String(action.targetSubregionId))) {
      addError(`unknown subregion id "${action.targetSubregionId}" referenced by action "${actionId}"`);
    }
  }

  for (const [prefabId, prefab] of entriesOf(MAP_PREFABS)) {
    for (const [listKey, entries] of Object.entries({ objects: prefab.objects, npcs: prefab.npcs })) {
      if (!Array.isArray(entries)) continue;
      entries.forEach((entry, index) => {
        const owner = `prefab "${prefabId}".${listKey}[${index}]`;
        visitActionRefs(entry, owner, (actionId, refOwner) => checkActionRef(actionId, refOwner, actionIds));
        visitQuestRefs(entry, owner, questIds);
        checkLootTableRefs(entry, owner, lootTableIds, usedLootTableIds);
        if (entry?.npcId && !npcIds.has(String(entry.npcId))) addError(`unknown NPC id "${entry.npcId}" used by ${owner}`);
      });
    }
  }

  for (const [subregionId, subregion] of entriesOf(SUBREGION_CONFIG)) {
    for (const [listKey, entries] of Object.entries({ objects: subregion.objects, npcs: subregion.npcs })) {
      if (!Array.isArray(entries)) continue;
      entries.forEach((entry, index) => {
        const owner = `subregion "${subregionId}".${listKey}[${index}]`;
        visitActionRefs(entry, owner, (actionId, refOwner) => checkActionRef(actionId, refOwner, actionIds));
        visitQuestRefs(entry, owner, questIds);
        checkLootTableRefs(entry, owner, lootTableIds, usedLootTableIds);
        if (entry?.npcId && !npcIds.has(String(entry.npcId))) addError(`unknown NPC id "${entry.npcId}" used by ${owner}`);
      });
    }
    visitQuestRefs(subregion.onClear, `subregion "${subregionId}".onClear`, questIds);
  }

  for (const [questId, quest] of entriesOf(QUEST_DEFS)) {
    visitQuestRefs(quest, `quest "${questId}"`, questIds);
    for (const key of ["npcIds", "startNpcIds", "giverNpcIds", "turnInNpcIds", "completeNpcIds"]) {
      if (!Array.isArray(quest[key])) continue;
      quest[key].forEach((npcId, index) => {
        if (!npcIds.has(String(npcId))) addError(`unknown NPC id "${npcId}" referenced by quest "${questId}".${key}[${index}]`);
      });
    }
    for (const [owner, rewards] of [
      [`quest "${questId}".rewards`, quest.rewards],
      ...(quest.steps ?? []).map((step) => [`quest "${questId}" step "${step?.id ?? "?"}".rewards`, step?.rewards]),
    ]) {
      for (const achievementId of rewards?.achievements ?? []) {
        if (!achievementIds.has(String(achievementId))) addError(`unknown achievement id "${achievementId}" referenced by ${owner}`);
      }
    }
  }

  checkPrefabRefs(prefabIds);

  for (const [objectId, def] of entriesOf(REGION_OBJECT_DEFS)) {
    if (def.defaultActionId) checkActionRef(String(def.defaultActionId), `region object "${objectId}".defaultActionId`, actionIds);
    checkLootRefs(def.destructible?.loot, `region object "${objectId}".destructible.loot`, resourceIds, questItemIds, namedItemIds, uniqueItemIds);
    checkLootTableRefs(def, `region object "${objectId}"`, lootTableIds, usedLootTableIds);
    checkLootTableRefs(def.destructible, `region object "${objectId}".destructible`, lootTableIds, usedLootTableIds);
  }

  for (const [monsterId, def] of entriesOf(MONSTER_DEFS)) {
    checkLootTableRefs(def, `monster "${monsterId}"`, lootTableIds, usedLootTableIds);
  }

  for (const tableId of lootTableIds) {
    if (!usedLootTableIds.has(tableId)) addWarning(`lootTable "${tableId}" is not referenced by config or known runtime defaults`);
  }

  const summary = `${actionIds.size} actions, ${questIds.size} quests, ${npcIds.size} npcs, ${regionIds.size} regions, ${prefabIds.size} prefabs, ${subregionIds.size} subregions, ${lootTableIds.size} lootTables checked`;
  if (errors.length) {
    console.error(`[validate] FAILED: ${errors.length} errors, ${warnings.length} warnings; ${summary}`);
    process.exit(1);
  }
  console.log(`[validate] OK: ${summary}; ${warnings.length} warnings`);
}

main();
