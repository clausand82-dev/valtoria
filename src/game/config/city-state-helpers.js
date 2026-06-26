import { DURABILITY_DEFAULT } from "./durability-config.js";
import { CITY_BUILDINGS } from "./city-buildings-config.js";
import { CITY_AREAS } from "./city-areas-config.js";
import { shouldRespectPrebuiltCityConfig } from "./cheat-config.js";
import { CITY_STORAGE_KEY } from "../../storage/saveKeys.js";

export function getCityBuildingConfig(buildingId) {
  const id = String(buildingId ?? "");
  return CITY_BUILDINGS.find((building) => building.id === id) ?? null;
}

export function getCityAreaConfig(areaId) {
  const id = String(areaId ?? "");
  return CITY_AREAS.find((area) => area.id === id) ?? null;
}

export function cityConfigEntryOwnedFromStart(entry) {
  return Boolean(entry?.ownedFromStart || (entry?.prebuilt && shouldRespectPrebuiltCityConfig()));
}

export function getCityBuildingStateForId(progress = {}, buildingId) {
  const building = getCityBuildingConfig(buildingId);
  if (!building?.id) return { level: 0, paid: {}, durability: DURABILITY_DEFAULT, addons: [] };
  const saved = progress?.[building.id] ?? {};
  const prebuiltAddons = (building.addons ?? [])
    .filter((addon) => cityConfigEntryOwnedFromStart(addon))
    .map((addon) => addon.id);
  const legacyAddons = Array.isArray(saved.addons) ? saved.addons : [];
  const purchasedAddons = [
    ...(Array.isArray(saved.purchasedAddons) ? saved.purchasedAddons : []),
    ...legacyAddons,
  ];
  return {
    ...saved,
    level: cityConfigEntryOwnedFromStart(building) ? Math.max(1, saved.level ?? 0) : (saved.level ?? 0),
    paid: saved.paid ?? {},
    durability: saved.durability ?? DURABILITY_DEFAULT,
    purchasedAddons: [...new Set(purchasedAddons)],
    addons: [...new Set([...prebuiltAddons, ...purchasedAddons])],
  };
}

export function hasCityBuilding(progress = {}, buildingId) {
  return getCityBuildingStateForId(progress, buildingId).level > 0;
}

export function getCityAreaStateForId(progress = {}, areaId) {
  const area = getCityAreaConfig(areaId);
  if (!area?.id) return { unlocked: false, level: 0, durability: DURABILITY_DEFAULT };
  if (cityConfigEntryOwnedFromStart(area)) {
    const saved = progress?.areas?.[area.id];
    const savedLevel = typeof saved === "object" ? saved.level : 0;
    return {
      ...(typeof saved === "object" ? saved : {}),
      unlocked: true,
      level: Math.max(1, savedLevel ?? 0),
      durability: saved?.durability ?? DURABILITY_DEFAULT,
    };
  }
  const saved = progress?.areas?.[area.id];
  if (saved === true) return { unlocked: true, level: 1, durability: DURABILITY_DEFAULT };
  if (!saved || typeof saved !== "object") return { unlocked: false, level: 0, durability: DURABILITY_DEFAULT };
  const savedLevel = saved.level === undefined ? 1 : Math.max(0, Math.floor(Number(saved.level) || 0));
  return {
    ...saved,
    unlocked: Boolean(saved.unlocked),
    level: saved.unlocked ? savedLevel : 0,
    durability: saved.durability ?? DURABILITY_DEFAULT,
  };
}

export function hasCityArea(progress = {}, areaId) {
  return getCityAreaStateForId(progress, areaId).unlocked;
}

export function hasCityAddon(progress = {}, addonId) {
  const id = String(addonId ?? "");
  if (!id) return false;
  for (const building of CITY_BUILDINGS) {
    const state = getCityBuildingStateForId(progress, building.id);
    if ((state.level ?? 0) <= 0) continue;
    if ((state.addons ?? []).includes(id)) return true;
  }
  return false;
}

export function cityBuildingName(buildingId) {
  return getCityBuildingConfig(buildingId)?.title ?? String(buildingId ?? "");
}

export function cityAddonName(addonId) {
  const id = String(addonId ?? "");
  for (const building of CITY_BUILDINGS) {
    const addon = (building.addons ?? []).find((entry) => entry.id === id);
    if (addon) return addon.title ?? id;
  }
  return id;
}

function normalizeEffectList(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

export function normalizeCityProgressEffect(...sources) {
  const effect = { buildings: [], areas: [], addons: [] };
  for (const source of sources) {
    const raws = source?.cityProgress || source?.cityRewards
      ? [source.cityProgress, source.cityRewards]
      : [source];
    for (const raw of raws) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      effect.buildings.push(...normalizeEffectList(raw.buildings));
      effect.areas.push(...normalizeEffectList(raw.areas));
      effect.addons.push(...normalizeEffectList(raw.addons ?? raw.features));
    }
  }
  return effect.buildings.length || effect.areas.length || effect.addons.length ? effect : null;
}

function clampPct(value, fallback = DURABILITY_DEFAULT) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(100, numeric));
}

function requestedLevel(value, fallback = 1) {
  return Math.max(1, Math.floor(Number(value) || fallback));
}

function summaryEntry(type, id, label, action) {
  const suffix = {
    built: "built",
    upgraded: "upgraded",
    repaired: "repaired",
    unlocked: "unlocked",
  }[action] ?? "updated";
  return { type, id, label, action, message: `${label} ${suffix}` };
}

function warnCityProgress(message, context, warnings) {
  warnings.push({ message, context });
  console.warn?.(`[cityProgress] ${message}`, context);
}

function resolveProgressTarget(engineOrState, options = {}) {
  const isEngine = engineOrState && typeof engineOrState === "object" && (
    "player" in engineOrState
    || typeof engineOrState.publishSnapshot === "function"
    || typeof engineOrState.saveProgress === "function"
  );
  const storageKey = options.storageKey
    ?? engineOrState?.cityStorageKey
    ?? engineOrState?.getCityStorageKey?.()
    ?? CITY_STORAGE_KEY;
  const load = options.loadProgress
    ?? engineOrState?.cityProgressLoader
    ?? (() => ({}));
  const rawProgress = options.progress
    ?? options.getProgress?.()
    ?? engineOrState?.cityProgress
    ?? (isEngine ? load(storageKey) : engineOrState);
  return {
    isEngine,
    storageKey,
    load,
    save: options.saveProgress
      ?? engineOrState?.cityProgressSaver
      ?? (() => false),
    onChange: options.onProgressChange ?? engineOrState?.onCityProgressChange,
    progress: rawProgress && typeof rawProgress === "object" && !Array.isArray(rawProgress) ? rawProgress : {},
  };
}

export function applyCityProgressEffects(engineOrState, cityProgressEffect, options = {}) {
  const effect = normalizeCityProgressEffect(cityProgressEffect);
  const warnings = [];
  const summary = [];
  if (!effect) return { changed: false, progress: resolveProgressTarget(engineOrState, options).progress, summary, warnings };

  const target = resolveProgressTarget(engineOrState, options);
  let progress = target.progress;
  let changed = false;

  for (const entry of effect.buildings) {
    const building = getCityBuildingConfig(entry?.id);
    if (!building) {
      warnCityProgress(`Unknown building id "${String(entry?.id ?? "")}"`, entry, warnings);
      continue;
    }
    const state = getCityBuildingStateForId(progress, building.id);
    const rawState = progress?.[building.id] && typeof progress[building.id] === "object" ? progress[building.id] : {};
    const currentLevel = Math.max(0, Math.floor(Number(state.level) || 0));
    const nextLevel = Math.max(currentLevel, requestedLevel(entry?.level, 1));
    const currentDurability = clampPct(state.durability, DURABILITY_DEFAULT);
    const nextDurability = entry?.durability !== undefined
      ? Math.max(currentDurability, clampPct(entry.durability, DURABILITY_DEFAULT))
      : currentLevel <= 0 && nextLevel > 0 ? Math.max(currentDurability, DURABILITY_DEFAULT) : currentDurability;
    if (nextLevel === currentLevel && nextDurability === currentDurability) continue;
    progress = {
      ...progress,
      [building.id]: {
        ...rawState,
        level: nextLevel,
        durability: nextDurability,
      },
    };
    changed = true;
    summary.push(summaryEntry("building", building.id, building.title ?? building.id, currentLevel <= 0 ? "built" : nextLevel > currentLevel ? "upgraded" : "repaired"));
  }

  for (const entry of effect.areas) {
    const area = getCityAreaConfig(entry?.id);
    if (!area) {
      warnCityProgress(`Unknown area id "${String(entry?.id ?? "")}"`, entry, warnings);
      continue;
    }
    const state = getCityAreaStateForId(progress, area.id);
    const rawAreas = progress?.areas && typeof progress.areas === "object" && !Array.isArray(progress.areas) ? progress.areas : {};
    const rawState = rawAreas[area.id] && typeof rawAreas[area.id] === "object" ? rawAreas[area.id] : {};
    const currentLevel = Math.max(0, Math.floor(Number(state.level) || 0));
    const currentUnlocked = Boolean(state.unlocked);
    const nextLevel = Math.max(currentLevel, requestedLevel(entry?.level, 1));
    const currentDurability = clampPct(state.durability, DURABILITY_DEFAULT);
    const nextDurability = entry?.durability !== undefined
      ? Math.max(currentDurability, clampPct(entry.durability, DURABILITY_DEFAULT))
      : !currentUnlocked ? Math.max(currentDurability, DURABILITY_DEFAULT) : currentDurability;
    if (currentUnlocked && nextLevel === currentLevel && nextDurability === currentDurability) continue;
    progress = {
      ...progress,
      areas: {
        ...rawAreas,
        [area.id]: {
          ...rawState,
          unlocked: true,
          level: nextLevel,
          durability: nextDurability,
        },
      },
    };
    changed = true;
    summary.push(summaryEntry("area", area.id, area.title ?? area.id, currentUnlocked ? nextLevel > currentLevel ? "upgraded" : "repaired" : "unlocked"));
  }

  for (const entry of effect.addons) {
    const building = getCityBuildingConfig(entry?.buildingId);
    if (!building) {
      warnCityProgress(`Unknown addon building id "${String(entry?.buildingId ?? "")}"`, entry, warnings);
      continue;
    }
    const addon = (building.addons ?? []).find((candidate) => String(candidate?.id ?? "") === String(entry?.id ?? ""));
    if (!addon) {
      warnCityProgress(`Unknown addon id "${String(entry?.id ?? "")}" for building "${building.id}"`, entry, warnings);
      continue;
    }
    const state = getCityBuildingStateForId(progress, building.id);
    if ((state.level ?? 0) <= 0 && entry?.requireBuilding === true) {
      warnCityProgress(`Skipped addon "${addon.id}" because "${building.id}" is not built`, entry, warnings);
      continue;
    }
    if ((state.addons ?? []).map(String).includes(String(addon.id))) continue;
    const rawState = progress?.[building.id] && typeof progress[building.id] === "object" ? progress[building.id] : {};
    const purchasedAddons = [...new Set([
      ...(Array.isArray(rawState.purchasedAddons) ? rawState.purchasedAddons : []),
      ...(Array.isArray(rawState.addons) ? rawState.addons : []),
      addon.id,
    ].map(String))];
    progress = {
      ...progress,
      [building.id]: {
        ...rawState,
        level: Math.max(1, Math.floor(Number(state.level) || 0)),
        durability: clampPct(state.durability, DURABILITY_DEFAULT),
        purchasedAddons,
      },
    };
    changed = true;
    summary.push(summaryEntry("addon", addon.id, addon.title ?? addon.id, "unlocked"));
  }

  if (changed) {
    if (target.isEngine) {
      engineOrState.cityProgress = progress;
      engineOrState.cityInventory = progress;
      engineOrState.cityStorage = progress;
    }
    if ((options.persist ?? target.isEngine) !== false) target.save(progress, target.storageKey);
    target.onChange?.(progress);
  }
  return { changed, progress, summary, warnings };
}

export function cityRequirementContext(progress = {}) {
  return {
    hasBuilding: (buildingId) => hasCityBuilding(progress, buildingId),
    hasAddon: (addonId) => hasCityAddon(progress, addonId),
    hasArea: (areaId) => hasCityArea(progress, areaId),
    buildingName: (buildingId) => cityBuildingName(buildingId),
    addonName: (addonId) => cityAddonName(addonId),
  };
}
