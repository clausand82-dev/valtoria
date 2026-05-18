const EMPTY_WORLD_STATE = Object.freeze({
  flags: Object.freeze({}),
  counters: Object.freeze({}),
  values: Object.freeze({}),
});

const MAP_REGION_PATCH_KEYS = {
  mobs: ["id", "type"],
  objects: ["id", "type"],
  decay: ["id"],
  foliageSet: ["fileName"],
  foliageSets: ["fileName"],
  foilageSet: ["fileName"],
  foilageSets: ["fileName"],
  tileset: ["fileName"],
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

function compareNumber(actual, condition) {
  const value = Number(actual) || 0;
  if (condition.equals !== undefined && value !== Number(condition.equals)) return false;
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
  if (condition.gte !== undefined || condition.gt !== undefined || condition.lte !== undefined || condition.lt !== undefined) {
    return compareNumber(actual, condition);
  }
  return Boolean(actual);
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

  if (condition.flag !== undefined) {
    const actual = Boolean(normalized.flags[String(condition.flag)]);
    return condition.equals !== undefined ? actual === Boolean(condition.equals) : actual;
  }
  if (condition.counter !== undefined) {
    return compareNumber(normalized.counters[String(condition.counter)] ?? 0, condition);
  }
  if (condition.value !== undefined) {
    return compareValue(normalized.values[String(condition.value)], condition);
  }
  if (condition.stat !== undefined) {
    return compareValue(readPath(context.stats ?? context, condition.stat), condition);
  }
  return true;
}

function isConditionalValue(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && Array.isArray(value.variants) && Object.prototype.hasOwnProperty.call(value, "value"));
}

function entryAllowed(entry, worldState, context) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return true;
  if (entry.requires && !worldConditionMet(entry.requires, worldState, context)) return false;
  if (entry.blockedBy && worldConditionMet(entry.blockedBy, worldState, context)) return false;
  return true;
}

function stripConditionFields(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return entry;
  const { requires, blockedBy, ...rest } = entry;
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

function patchList(baseList, patchListValue, mergeKeys) {
  const result = (Array.isArray(baseList) ? baseList : []).map((entry) => clone(entry));
  for (const rawPatch of Array.isArray(patchListValue) ? patchListValue : []) {
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

function patchValue(baseValue, patch, mergeKeys) {
  if (Array.isArray(baseValue) && Array.isArray(patch)) return patchList(baseValue, patch, mergeKeys);
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
    return patchValue(baseValue, variant.patch, options.mergeKeys ?? []);
  }
  return baseValue;
}

export function filterWorldList(rawValue, worldState = EMPTY_WORLD_STATE, context = {}) {
  if (!Array.isArray(rawValue)) return clone(rawValue);
  return rawValue
    .filter((entry) => entryAllowed(entry, worldState, context))
    .map((entry) => stripConditionFields(resolveWorldValue(entry, worldState, context)));
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
  return resolveWorldValue(value, worldState, context, { mergeKeys });
}

export function resolveMapRegionConfig(regionConfig, worldState = EMPTY_WORLD_STATE, context = {}) {
  if (!regionConfig || typeof regionConfig !== "object") return regionConfig;
  const resolved = {};
  const baseContext = {
    ...context,
    areaMapId: context.areaMapId ?? regionConfig.areaMapId,
    regionId: context.regionId ?? regionConfig.id,
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
