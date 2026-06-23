import { getWorldEnergyState } from "./world-energy.js";
import { getFactionRepFrom } from "./config/faction-config.js";

const EMPTY_WORLD_STATE = Object.freeze({
  flags: Object.freeze({}),
  counters: Object.freeze({}),
  values: Object.freeze({}),
});

const CONDITION_KEYS = new Set([
  "requires",
  "conditions",
  "blockedBy",
  "all",
  "any",
  "not",
  "worldBalanceLydra",
  "worldBalanceNetdra",
  "corruption",
  "visited",
  "cleared",
  "explored",
  "unlocked",
  "flag",
  "notFlag",
  "counter",
  "quest",
  "questActive",
  "questCompleted",
  "questStep",
  "stepCompleted",
  "questStepActive",
  "questStepCompleted",
  "questStepRevealed",
  "questCurrentStep",
  "inventory",
  "cityStat",
  "cityStorage",
  "cityInventory",
  "player",
  "playerStat",
  "factions",
  "factionRep",
  "speciesKills",
  "tagKills",
  "destroyedObjectTags",
  "rootRegionId",
  "rootMapId",
  "rootMapInstanceId",
  "sourceRegionId",
  "sourceMapId",
  "sourceObjectId",
  "sourceObjectRuntimeId",
  "subregionId",
  "subregionKind",
  "subregionDepth",
]);

const MAP_REGION_PATCH_KEYS = {
  mobs: ["id", "type"],
  rareMobs: ["id", "type"],
  ambientCritters: ["id", "mobId", "sourceMobId"],
  objects: ["id", "type"],
  decay: ["id"],
  foliageSet: ["id", "fileName"],
  foliageSets: ["id", "fileName"],
  foilageSet: ["id", "fileName"],
  foilageSets: ["id", "fileName"],
  tileset: ["id", "fileName"],
  water: ["fileName"],
  waterSet: ["fileName"],
  waterSets: ["fileName"],
  prefabRules: ["id"],
  antiDrops: ["id"],
};

const MAP_REGION_SKIP_KEYS = new Set([
  "id",
  "label",
  "labelX",
  "labelY",
  "points",
  "color",
  "targetMapId",
  "areaMapId",
]);

function clone(value) {
  if (value === null || value === undefined) return value;
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function cleanStateBucket(input, valueNormalizer) {
  const result = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) return result;
  for (const [key, value] of Object.entries(input)) {
    const normalizedKey = String(key ?? "").trim();
    if (!normalizedKey) continue;
    const normalizedValue = valueNormalizer(value);
    if (normalizedValue !== undefined) result[normalizedKey] = normalizedValue;
  }
  return result;
}

function normalizeFlagValue(value) {
  return Boolean(value);
}

function normalizeCounterValue(value) {
  const parsed = Math.floor(Number(value) || 0);
  return Math.max(0, parsed);
}

function normalizeValue(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (["string", "number", "boolean"].includes(typeof value)) return value;
  return clone(value);
}

export function normalizeWorldState(worldState = EMPTY_WORLD_STATE) {
  return {
    flags: cleanStateBucket(worldState.flags, normalizeFlagValue),
    counters: cleanStateBucket(worldState.counters, normalizeCounterValue),
    values: cleanStateBucket(worldState.values, normalizeValue),
  };
}

export function regionWorldStateKey(regionId, state) {
  return `region.${String(regionId ?? "").trim()}.${String(state ?? "").trim()}`;
}

export function mobWorldStateKey(mobId, state) {
  return `mob.${String(mobId ?? "").trim()}.${String(state ?? "").trim()}`;
}

export function getMonsterDiscovery(worldState) {
  const value = normalizeWorldState(worldState).values.monsterDiscovery;
  return value && typeof value === "object" && !Array.isArray(value) ? clone(value) : {};
}

function emptyMonsterDiscoveryEntry() {
  return {
    seen: false,
    fought: false,
    killed: false,
    killedNormal: 0,
    killedElite: 0,
    killedBoss: 0,
    maxLevelKilled: 0,
    seenRegions: {},
    lastSeenRegionId: null,
  };
}

function normalizeMonsterDiscoveryEntry(entry) {
  const source = entry && typeof entry === "object" && !Array.isArray(entry) ? entry : {};
  const seenRegions = source.seenRegions && typeof source.seenRegions === "object" && !Array.isArray(source.seenRegions)
    ? Object.fromEntries(Object.entries(source.seenRegions)
      .map(([regionId, count]) => [String(regionId), Math.max(0, Math.floor(Number(count) || 0))])
      .filter(([regionId]) => regionId))
    : {};
  return {
    seen: Boolean(source.seen),
    fought: Boolean(source.fought),
    killed: Boolean(source.killed),
    killedNormal: Math.max(0, Math.floor(Number(source.killedNormal) || 0)),
    killedElite: Math.max(0, Math.floor(Number(source.killedElite) || 0)),
    killedBoss: Math.max(0, Math.floor(Number(source.killedBoss) || 0)),
    maxLevelKilled: Math.max(0, Math.floor(Number(source.maxLevelKilled) || 0)),
    seenRegions,
    lastSeenRegionId: source.lastSeenRegionId ? String(source.lastSeenRegionId) : null,
    lastSeenAt: source.lastSeenAt ?? undefined,
  };
}

function monsterDiscoveryId(monsterOrId) {
  if (!monsterOrId) return "";
  if (typeof monsterOrId === "string") return monsterOrId.trim();
  return String(monsterOrId.typeName ?? monsterOrId.monsterId ?? monsterOrId.id ?? "").trim();
}

function monsterDiscoveryRegionId(context = {}, monster = null) {
  return String(
    context.regionId
    ?? context.regionConfig?.id
    ?? context.activeMapRegion?.regionId
    ?? monster?.regionId
    ?? "",
  ).trim();
}

function updateMonsterDiscovery(worldState, monsterOrId, context, updater) {
  const monsterId = monsterDiscoveryId(monsterOrId);
  if (!monsterId) return normalizeWorldState(worldState);
  const next = normalizeWorldState(worldState);
  const discovery = getMonsterDiscovery(next);
  const entry = normalizeMonsterDiscoveryEntry(discovery[monsterId] ?? emptyMonsterDiscoveryEntry());
  const updated = updater(entry, monsterId);
  discovery[monsterId] = normalizeMonsterDiscoveryEntry(updated);
  next.values.monsterDiscovery = discovery;
  return next;
}

export function recordMonsterSeen(worldState, monsterOrId, context = {}) {
  const monster = monsterOrId && typeof monsterOrId === "object" ? monsterOrId : null;
  const regionId = monsterDiscoveryRegionId(context, monster);
  const timestamp = context.lastSeenAt ?? context.now ?? Date.now?.();
  let changed = false;
  const next = updateMonsterDiscovery(worldState, monsterOrId, context, (entry) => {
    if (!entry.seen) changed = true;
    entry.seen = true;
    if (regionId) {
      const before = Math.max(0, Math.floor(Number(entry.seenRegions[regionId]) || 0));
      const shouldIncrementRegion = context.incrementSeenCount === true || before <= 0;
      entry.seenRegions[regionId] = shouldIncrementRegion ? before + 1 : before;
      entry.lastSeenRegionId = regionId;
      changed = changed || shouldIncrementRegion;
    }
    if (timestamp !== undefined) entry.lastSeenAt = timestamp;
    return entry;
  });
  return { worldState: next, changed };
}

export function recordMonsterFought(worldState, monsterOrId, context = {}) {
  const seenResult = recordMonsterSeen(worldState, monsterOrId, context);
  let changed = seenResult.changed;
  const next = updateMonsterDiscovery(seenResult.worldState, monsterOrId, context, (entry) => {
    if (!entry.fought) changed = true;
    entry.seen = true;
    entry.fought = true;
    return entry;
  });
  return { worldState: next, changed };
}

export function recordMonsterKilled(worldState, monsterOrId, context = {}) {
  const monster = monsterOrId && typeof monsterOrId === "object" ? monsterOrId : {};
  const foughtResult = recordMonsterFought(worldState, monsterOrId, context);
  let changed = true;
  const next = updateMonsterDiscovery(foughtResult.worldState, monsterOrId, context, (entry) => {
    entry.seen = true;
    entry.fought = true;
    entry.killed = true;
    if (monster?.boss || monster?.isBoss || context.boss) {
      entry.killedBoss += 1;
    } else if (monster?.elite || context.elite) {
      entry.killedElite += 1;
    } else {
      entry.killedNormal += 1;
    }
    entry.maxLevelKilled = Math.max(
      entry.maxLevelKilled,
      Math.floor(Number(context.level ?? monster?.lootLevel ?? monster?.level) || 0),
    );
    return entry;
  });
  return { worldState: next, changed };
}

export function questWorldStateKey(questId, state) {
  return `quest.${String(questId ?? "").trim()}.${String(state ?? "").trim()}`;
}

export function getWorldFlag(worldState, key) {
  return Boolean(normalizeWorldState(worldState).flags[String(key ?? "")]);
}

export function setWorldFlag(worldState, key, value = true) {
  const normalizedKey = String(key ?? "").trim();
  if (!normalizedKey) return normalizeWorldState(worldState);
  const next = normalizeWorldState(worldState);
  next.flags[normalizedKey] = Boolean(value);
  return next;
}

export function incrementWorldCounter(worldState, key, amount = 1) {
  const normalizedKey = String(key ?? "").trim();
  if (!normalizedKey) return normalizeWorldState(worldState);
  const delta = Math.floor(Number(amount) || 0);
  const next = normalizeWorldState(worldState);
  next.counters[normalizedKey] = Math.max(0, Math.floor(Number(next.counters[normalizedKey]) || 0) + delta);
  return next;
}

export function setWorldValue(worldState, key, value) {
  const normalizedKey = String(key ?? "").trim();
  if (!normalizedKey) return normalizeWorldState(worldState);
  const next = normalizeWorldState(worldState);
  next.values[normalizedKey] = normalizeValue(value);
  return next;
}

function readPath(source, path) {
  if (!source || typeof source !== "object") return undefined;
  const parts = String(path ?? "").split(".").filter(Boolean);
  let current = source;
  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in current)) return undefined;
    current = current[part];
  }
  return current;
}

export function compareNumber(actual, condition) {
  const value = Number(actual);
  if (!Number.isFinite(value)) return false;
  if (typeof condition === "number") return value === condition;
  if (!condition || typeof condition !== "object" || Array.isArray(condition)) return value === Number(condition);
  if (condition.equals !== undefined && value !== Number(condition.equals)) return false;
  if (condition.min !== undefined && value < Number(condition.min)) return false;
  if (condition.max !== undefined && value > Number(condition.max)) return false;
  if (condition.gte !== undefined && value < Number(condition.gte)) return false;
  if (condition.gt !== undefined && value <= Number(condition.gt)) return false;
  if (condition.lte !== undefined && value > Number(condition.lte)) return false;
  if (condition.lt !== undefined && value >= Number(condition.lt)) return false;
  return true;
}

function compareValue(actual, condition) {
  if (condition.equals !== undefined) return actual === condition.equals;
  if (condition.notEquals !== undefined) return actual !== condition.notEquals;
  if (condition.in !== undefined) return Array.isArray(condition.in) && condition.in.includes(actual);
  if (
    condition.min !== undefined
    || condition.max !== undefined
    || condition.gte !== undefined
    || condition.gt !== undefined
    || condition.lte !== undefined
    || condition.lt !== undefined
  ) {
    return compareNumber(actual, condition);
  }
  return Boolean(actual);
}

function compareContextValue(actual, expected) {
  if (expected && typeof expected === "object" && !Array.isArray(expected)) return compareValue(actual, expected);
  return String(actual ?? "") === String(expected ?? "");
}

function regionKey(context = {}, state) {
  const id = context.regionId ?? context.regionConfig?.id;
  return id ? regionWorldStateKey(id, state) : "";
}

function readWorldScalar(worldState, key) {
  if (!key) return undefined;
  const normalized = normalizeWorldState(worldState);
  if (Object.prototype.hasOwnProperty.call(normalized.values, key)) return normalized.values[key];
  if (Object.prototype.hasOwnProperty.call(normalized.counters, key)) return normalized.counters[key];
  if (Object.prototype.hasOwnProperty.call(normalized.flags, key)) return normalized.flags[key];
  return undefined;
}

function getRegionCorruptionLevel(worldState, context = {}) {
  const key = regionKey(context, "corruptionLevel");
  const worldValue = readWorldScalar(worldState, key);
  if (worldValue !== undefined) {
    const parsed = Number(worldValue);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  const configValue = context.regionConfig?.corruptionLevel;
  if (configValue !== undefined) {
    const parsed = Number(configValue);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  const corruptedKey = regionKey(context, "corrupted");
  if (corruptedKey && Object.prototype.hasOwnProperty.call(normalizeWorldState(worldState).flags, corruptedKey)) {
    return getWorldFlag(worldState, corruptedKey) ? 10 : 0;
  }
  if (typeof context.regionConfig?.corrupted === "boolean") return context.regionConfig.corrupted ? 10 : 0;
  return undefined;
}

function compareBoolean(actual, expected) {
  if (typeof expected !== "boolean") return false;
  return Boolean(actual) === expected;
}

function activeQuestIds(questState = {}) {
  return new Set((Array.isArray(questState.active) ? questState.active : []).map((quest) => String(quest?.questId ?? quest?.id ?? quest)));
}

function completedQuestIds(questState = {}) {
  return new Set((Array.isArray(questState.completed) ? questState.completed : []).map(String));
}

function questIsActive(context, id) {
  return activeQuestIds(context.questState).has(String(id));
}

function questIsCompleted(context, id) {
  return completedQuestIds(context.questState).has(String(id));
}

function questStepMatches(context, requirement) {
  if (!requirement || typeof requirement !== "object") return false;
  const questId = String(requirement.id ?? requirement.questId ?? "").trim();
  const step = String(requirement.step ?? requirement.progress ?? "").trim();
  if (!questId || !step) return false;
  const quest = (Array.isArray(context.questState?.active) ? context.questState.active : [])
    .find((entry) => String(entry?.questId ?? entry?.id ?? "") === questId);
  if (!quest) return false;
  return String(quest.step ?? quest.currentStep ?? quest.progress?.step ?? quest.progress?.currentStep ?? "") === step;
}

function questStepCompleted(context, requirement) {
  const active = Array.isArray(context.questState?.active) ? context.questState.active : [];
  const questId = typeof requirement === "object" && requirement
    ? String(requirement.id ?? requirement.questId ?? context.questId ?? "").trim()
    : String(context.questId ?? "").trim();
  const stepId = typeof requirement === "object" && requirement
    ? String(requirement.stepId ?? requirement.step ?? requirement.id ?? "").trim()
    : String(requirement ?? "").trim();
  if (!stepId) return false;
  const quest = active.find((entry) => (
    questId
      ? String(entry?.questId ?? entry?.id ?? "") === questId
      : String(entry?.id ?? "") === String(context.questInstanceId ?? "")
  )) ?? context.quest;
  const completed = quest?.progress?.completedStepIds;
  return Array.isArray(completed) && completed.map(String).includes(stepId);
}

function questStepRequirement(context, requirement) {
  const questId = typeof requirement === "object" && requirement
    ? String(requirement.questId ?? requirement.id ?? context.questId ?? "").trim()
    : String(context.questId ?? "").trim();
  const stepId = typeof requirement === "object" && requirement
    ? String(requirement.stepId ?? requirement.step ?? "").trim()
    : String(requirement ?? "").trim();
  if (!stepId) return { quest: null, stepId: "" };
  const active = Array.isArray(context.questState?.active) ? context.questState.active : [];
  const quest = active.find((entry) => (
    questId
      ? String(entry?.questId ?? entry?.id ?? "") === questId
      : String(entry?.id ?? "") === String(context.questInstanceId ?? "")
  )) ?? context.quest ?? null;
  return { quest, stepId };
}

function questStepSetHas(quest, key, stepId) {
  const list = quest?.progress?.[key];
  return Array.isArray(list) && list.map(String).includes(String(stepId));
}

function questStepIsActive(context, requirement) {
  const { quest, stepId } = questStepRequirement(context, requirement);
  return Boolean(quest) && String(quest.progress?.currentStepId ?? quest.currentStepId ?? "") === String(stepId);
}

function questStepIsCompleted(context, requirement) {
  const { quest, stepId } = questStepRequirement(context, requirement);
  return Boolean(quest) && questStepSetHas(quest, "completedStepIds", stepId);
}

function questStepCompletedFlagKey(context, requirement) {
  const questId = typeof requirement === "object" && requirement
    ? String(requirement.questId ?? requirement.id ?? context.questId ?? "").trim()
    : String(context.questId ?? "").trim();
  const stepId = typeof requirement === "object" && requirement
    ? String(requirement.stepId ?? requirement.step ?? "").trim()
    : String(requirement ?? "").trim();
  return questId && stepId ? `quest.${questId}.step.${stepId}.completed` : "";
}

function questStepIsRevealed(context, requirement) {
  const { quest, stepId } = questStepRequirement(context, requirement);
  return Boolean(quest) && questStepSetHas(quest, "revealedStepIds", stepId);
}

function toInventoryList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "object") {
    if (Array.isArray(value.items)) return value.items;
    return Object.values(value).flatMap((entry) => {
      if (!entry) return [];
      if (Array.isArray(entry)) return entry;
      if (typeof entry === "object") {
        const looksLikeItem = (
          entry.mode !== undefined
          || entry.uniqueId !== undefined
          || entry.namedId !== undefined
          || entry.questItemId !== undefined
          || entry.resourceId !== undefined
          || entry.readableId !== undefined
        );
        return looksLikeItem ? [entry] : toInventoryList(entry);
      }
      return [];
    });
  }
  return [];
}

function itemCountForRequirement(item, req) {
  if (!item || !req || typeof req !== "object") return 0;
  if (req.resourceId || req.resource) {
    return item.mode === "resource" && String(item.resourceId ?? item.resource ?? "") === String(req.resourceId ?? req.resource)
      ? Math.max(1, Math.floor(Number(item.count) || 1))
      : 0;
  }
  let match = true;
  if (req.mode) match = match && String(item.mode ?? "") === String(req.mode);
  if (req.readableId) match = match && String(item.readableId ?? "") === String(req.readableId);
  if (req.questItemId) match = match && String(item.questItemId ?? "") === String(req.questItemId);
  if (req.uniqueId) match = match && String(item.uniqueId ?? "") === String(req.uniqueId);
  if (req.namedId) match = match && String(item.namedId ?? "") === String(req.namedId);
  if (req.id) match = match && String(item.id ?? item.itemId ?? "") === String(req.id);
  if (req.rarity) match = match && String(item.rarity ?? "") === String(req.rarity);
  if (req.category) match = match && String(item.category ?? item.slot ?? "") === String(req.category);
  if (req.baseName) match = match && String(item.baseName ?? "") === String(req.baseName);
  if (req.name) match = match && String(item.name ?? "") === String(req.name);
  if (req.slot) match = match && String(item.slot ?? "") === String(req.slot);
  if (!match) return 0;
  return item.mode === "resource" || item.mode === "potion" ? Math.max(1, Math.floor(Number(item.count) || 1)) : 1;
}

function countInventoryRequirement(req, context = {}, bucket = "inventory") {
  if (!req || typeof req !== "object") return 0;
  const player = context.player ?? {};
  if (req.potionType) {
    const type = String(req.potionType);
    const potionSource = context.potions ?? player.potions ?? {};
    const directCount = Math.max(0, Math.floor(Number(potionSource[type]) || 0));
    if (directCount > 0) return directCount;
  }
  const source = bucket === "inventory"
    ? (context.inventory ?? player.inventory)
    : (context[bucket] ?? context.cityStorage ?? context.cityInventory);
  return toInventoryList(source).reduce((sum, item) => sum + itemCountForRequirement(item, req), 0);
}

function inventoryRequirementMet(req, context, bucket = "inventory") {
  const needed = Math.max(1, Math.floor(Number(req?.min ?? req?.count ?? 1) || 1));
  return countInventoryRequirement(req, context, bucket) >= needed;
}

function statMapMatches(stats, requirements) {
  if (!stats || typeof stats !== "object" || !requirements || typeof requirements !== "object") return false;
  return Object.entries(requirements).every(([key, condition]) => {
    const actual = readPath(stats, key);
    return compareNumber(actual, condition);
  });
}

function shorthandConditionMet(key, expected, worldState, context) {
  const normalized = normalizeWorldState(worldState);
  switch (key) {
    case "worldBalanceLydra": {
      const state = getWorldEnergyState({ worldEnergy: context.worldEnergy });
      return compareNumber(state.lydraPercent, typeof expected === "number" ? { min: expected } : expected);
    }
    case "worldBalanceNetdra": {
      const state = getWorldEnergyState({ worldEnergy: context.worldEnergy });
      return compareNumber(state.netdraPercent, typeof expected === "number" ? { min: expected } : expected);
    }
    case "corruption":
      return compareNumber(getRegionCorruptionLevel(normalized, context), expected);
    case "visited": {
      const visits = normalized.counters[regionKey(context, "visits")];
      return typeof expected === "number" ? compareNumber(visits, { min: expected }) : compareNumber(visits, expected);
    }
    case "cleared":
    case "explored":
    case "unlocked":
      return compareBoolean(normalized.flags[regionKey(context, key)], expected);
    case "flag":
      return Boolean(normalized.flags[String(expected)]);
    case "notFlag":
      return !Boolean(normalized.flags[String(expected)]);
    case "counter": {
      const id = typeof expected === "string" ? expected : expected?.id ?? expected?.key;
      return Boolean(id) && compareNumber(normalized.counters[String(id)] ?? 0, typeof expected === "object" ? expected : { min: 1 });
    }
    case "quest":
    case "questActive":
      return questIsActive(context, expected);
    case "questCompleted":
      return questIsCompleted(context, expected);
    case "questStep":
      return questStepMatches(context, expected);
    case "stepCompleted":
      return questStepCompleted(context, expected);
    case "questStepActive":
    case "questCurrentStep":
      return questStepIsActive(context, expected);
    case "questStepCompleted":
      return questStepIsCompleted(context, expected) || Boolean(normalized.flags[questStepCompletedFlagKey(context, expected)]);
    case "questStepRevealed":
      return questStepIsRevealed(context, expected);
    case "inventory":
      return inventoryRequirementMet(expected, context, "inventory");
    case "cityStorage":
    case "cityInventory":
      return inventoryRequirementMet(expected, context, key);
    case "cityStat":
      return statMapMatches(context.cityStats, expected);
    case "player":
      return statMapMatches(context.player, expected);
    case "playerStat":
      return statMapMatches(context.player?.stats, expected);
    case "factions":
    case "factionRep":
      if (!expected || typeof expected !== "object" || Array.isArray(expected)) return false;
      return statMapMatches(
        Object.fromEntries(Object.keys(expected ?? {}).map((factionId) => [
          factionId,
          getFactionRepFrom(context.player, factionId),
        ])),
        expected,
      );
    case "speciesKills":
      return statMapMatches(normalized.counters, Object.fromEntries(
        Object.entries(expected ?? {}).map(([speciesId, condition]) => [`speciesKill.${speciesId}`, condition]),
      ));
    case "tagKills":
      return statMapMatches(normalized.counters, Object.fromEntries(
        Object.entries(expected ?? {}).map(([tagId, condition]) => [`tagKill.${tagId}`, condition]),
      ));
    case "destroyedObjectTags":
      return statMapMatches(normalized.counters, Object.fromEntries(
        Object.entries(expected ?? {}).map(([tagId, condition]) => [`destroyedObjectTag.${tagId}`, condition]),
      ));
    case "rootRegionId":
    case "rootMapId":
    case "rootMapInstanceId":
    case "sourceRegionId":
    case "sourceMapId":
    case "sourceObjectId":
    case "sourceObjectRuntimeId":
    case "subregionId":
    case "subregionKind":
      return compareContextValue(context[key], expected);
    case "subregionDepth":
      return compareNumber(context.subregionDepth, expected);
    default:
      return true;
  }
}

export function worldConditionMet(condition, worldState = EMPTY_WORLD_STATE, context = {}) {
  if (!condition) return true;
  if (condition === true) return true;
  if (condition === false) return false;
  if (Array.isArray(condition)) return condition.every((entry) => worldConditionMet(entry, worldState, context));
  if (typeof condition !== "object") return Boolean(condition);

  const normalized = normalizeWorldState(worldState);
  if (Array.isArray(condition.all) && !condition.all.every((entry) => worldConditionMet(entry, normalized, context))) return false;
  if (Array.isArray(condition.any) && !condition.any.some((entry) => worldConditionMet(entry, normalized, context))) return false;
  if (condition.not !== undefined && worldConditionMet(condition.not, normalized, context)) return false;
  if (condition.conditions && !worldConditionMet(condition.conditions, normalized, context)) return false;
  if (condition.requires && !worldConditionMet(condition.requires, normalized, context)) return false;
  if (condition.blockedBy && worldConditionMet(condition.blockedBy, normalized, context)) return false;

  for (const key of CONDITION_KEYS) {
    if (key === "requires" || key === "conditions" || key === "blockedBy") continue;
    if (key === "all" || key === "any" || key === "not") continue;
    if (key === "flag" || key === "notFlag" || key === "counter") continue;
    if (!Object.prototype.hasOwnProperty.call(condition, key)) continue;
    if (!shorthandConditionMet(key, condition[key], normalized, context)) return false;
  }

  if (condition.flag !== undefined) {
    const actual = Boolean(normalized.flags[String(condition.flag)]);
    if (condition.equals !== undefined ? actual !== Boolean(condition.equals) : !actual) return false;
  }
  if (condition.notFlag !== undefined) {
    if (Boolean(normalized.flags[String(condition.notFlag)])) return false;
  }
  if (condition.counter !== undefined) {
    const counterId = typeof condition.counter === "object"
      ? condition.counter.id ?? condition.counter.key
      : condition.counter;
    const counterCondition = typeof condition.counter === "object"
      ? { ...condition.counter, ...condition }
      : condition;
    if (!compareNumber(normalized.counters[String(counterId)] ?? 0, counterCondition)) return false;
  }
  if (condition.value !== undefined) {
    if (!compareValue(normalized.values[String(condition.value)], condition)) return false;
  }
  if (condition.stat !== undefined) {
    if (!compareValue(readPath(context.stats ?? context, condition.stat), condition)) return false;
  }
  return true;
}

function isConditionalValue(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && Array.isArray(value.variants) && Object.prototype.hasOwnProperty.call(value, "value"));
}

function entryAllowed(entry, worldState, context) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return true;
  if (Array.isArray(entry.all) && !entry.all.every((condition) => worldConditionMet(condition, worldState, context))) return false;
  if (Array.isArray(entry.any) && !entry.any.some((condition) => worldConditionMet(condition, worldState, context))) return false;
  if (entry.not !== undefined && worldConditionMet(entry.not, worldState, context)) return false;
  for (const key of CONDITION_KEYS) {
    if (key === "requires" || key === "conditions" || key === "blockedBy") continue;
    if (key === "all" || key === "any" || key === "not") continue;
    if (!Object.prototype.hasOwnProperty.call(entry, key)) continue;
    if (!shorthandConditionMet(key, entry[key], worldState, context)) return false;
  }
  if (entry.conditions && !worldConditionMet(entry.conditions, worldState, context)) return false;
  if (entry.requires && !worldConditionMet(entry.requires, worldState, context)) return false;
  if (entry.blockedBy && worldConditionMet(entry.blockedBy, worldState, context)) return false;
  return true;
}

export function worldEntryAllowed(entry, worldState = EMPTY_WORLD_STATE, context = {}) {
  return entryAllowed(entry, normalizeWorldState(worldState), context);
}

function stripConditionFields(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return entry;
  const rest = {};
  for (const [key, value] of Object.entries(entry)) {
    if (!CONDITION_KEYS.has(key)) rest[key] = value;
  }
  return rest;
}

function matchingVariant(variants = [], worldState, context) {
  return variants.find((variant) => entryAllowed(variant, worldState, context)) ?? null;
}

function mergeKeyFor(entry, mergeKeys = []) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
  for (const key of mergeKeys) {
    const value = entry[key];
    if (value !== undefined && value !== null && String(value).trim()) return `${key}:${String(value)}`;
  }
  return null;
}

function deepMerge(base, patch) {
  if (Array.isArray(base) || Array.isArray(patch)) return clone(patch);
  if (!base || typeof base !== "object" || !patch || typeof patch !== "object") return clone(patch);
  const result = { ...clone(base) };
  for (const [key, value] of Object.entries(patch)) {
    result[key] = key in result ? deepMerge(result[key], value) : clone(value);
  }
  return result;
}

function patchList(baseList, patchListValue, mergeKeys, worldState, context) {
  const result = (Array.isArray(baseList) ? baseList : []).map((entry) => clone(entry));
  for (const rawPatch of Array.isArray(patchListValue) ? patchListValue : []) {
    if (!entryAllowed(rawPatch, worldState, context)) continue;
    const patch = stripConditionFields(rawPatch);
    const key = mergeKeyFor(patch, mergeKeys);
    const index = key ? result.findIndex((entry) => mergeKeyFor(entry, mergeKeys) === key) : -1;
    if (index >= 0) {
      result[index] = deepMerge(result[index], patch);
    } else {
      result.push(clone(patch));
    }
  }
  return result;
}

function patchValue(baseValue, patch, mergeKeys, worldState, context) {
  if (Array.isArray(baseValue) && Array.isArray(patch)) return patchList(baseValue, patch, mergeKeys, worldState, context);
  return deepMerge(baseValue, patch);
}

export function resolveWorldValue(rawValue, worldState = EMPTY_WORLD_STATE, context = {}, options = {}) {
  if (!isConditionalValue(rawValue)) return filterWorldList(rawValue, worldState, context);
  const baseValue = filterWorldList(rawValue.value, worldState, context);
  const variant = matchingVariant(rawValue.variants, worldState, context);
  if (!variant) return baseValue;
  if (Object.prototype.hasOwnProperty.call(variant, "value")) {
    return filterWorldList(variant.value, worldState, context);
  }
  if (Object.prototype.hasOwnProperty.call(variant, "patch")) {
    return patchValue(baseValue, variant.patch, options.mergeKeys ?? [], worldState, context);
  }
  return baseValue;
}

export function filterWorldList(rawValue, worldState = EMPTY_WORLD_STATE, context = {}) {
  if (!Array.isArray(rawValue)) return clone(rawValue);
  return rawValue
    .filter((entry) => entryAllowed(entry, worldState, context))
    .map((entry) => stripConditionFields(resolveWorldValue(entry, worldState, context)));
}

function resolveNestedConditionalLists(value, worldState, context) {
  if (Array.isArray(value)) {
    return value
      .filter((entry) => entryAllowed(entry, worldState, context))
      .map((entry) => resolveNestedConditionalLists(
        stripConditionFields(resolveWorldValue(entry, worldState, context)),
        worldState,
        context,
      ));
  }
  if (!value || typeof value !== "object" || isConditionalValue(value)) return resolveWorldValue(value, worldState, context);
  const result = {};
  for (const [key, child] of Object.entries(value)) {
    result[key] = CONDITION_KEYS.has(key)
      ? clone(child)
      : resolveNestedConditionalLists(child, worldState, context);
  }
  return result;
}

function resolveMapRegionField(key, value, worldState, context) {
  if (MAP_REGION_SKIP_KEYS.has(key)) return clone(value);
  const mergeKeys = MAP_REGION_PATCH_KEYS[key] ?? ["id", "type", "fileName"];
  if (key === "prefabRules" && value && typeof value === "object" && !isConditionalValue(value)) {
    return {
      ...clone(value),
      pool: resolveWorldValue(value.pool, worldState, context, { mergeKeys }),
    };
  }
  const resolved = resolveWorldValue(value, worldState, context, { mergeKeys });
  return resolveNestedConditionalLists(resolved, worldState, context);
}

export function resolveMapRegionConfig(regionConfig, worldState = EMPTY_WORLD_STATE, context = {}) {
  if (!regionConfig || typeof regionConfig !== "object") return regionConfig;
  const resolved = {};
  const baseContext = {
    ...context,
    areaMapId: context.areaMapId ?? regionConfig.areaMapId,
    regionId: context.regionId ?? regionConfig.id,
    regionConfig,
    worldState,
  };
  for (const [key, value] of Object.entries(regionConfig)) {
    resolved[key] = resolveMapRegionField(key, value, worldState, baseContext);
  }
  return resolved;
}

export function withRegionVisitWorldState(worldState, areaMapId, regionConfig, options = {}) {
  if (!regionConfig?.id) return normalizeWorldState(worldState);
  let next = normalizeWorldState(worldState);
  const regionId = regionConfig.id;
  next = setWorldFlag(next, regionWorldStateKey(regionId, "unlocked"), true);
  next = setWorldFlag(next, regionWorldStateKey(regionId, "explored"), true);
  if (typeof options.corrupted === "boolean") {
    next = setWorldFlag(next, regionWorldStateKey(regionId, "corrupted"), options.corrupted);
  }
  next = incrementWorldCounter(next, regionWorldStateKey(regionId, "visits"), 1);
  if (areaMapId) next = setWorldValue(next, regionWorldStateKey(regionId, "areaMapId"), areaMapId);
  return next;
}
