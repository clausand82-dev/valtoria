import { DURABILITY_DEFAULT } from "./durability-config.js";
import { CITY_BUILDINGS } from "./city-buildings-config.js";

export function getCityBuildingConfig(buildingId) {
  const id = String(buildingId ?? "");
  return CITY_BUILDINGS.find((building) => building.id === id) ?? null;
}

export function getCityBuildingStateForId(progress = {}, buildingId) {
  const building = getCityBuildingConfig(buildingId);
  if (!building?.id) return { level: 0, paid: {}, durability: DURABILITY_DEFAULT, addons: [] };
  const saved = progress?.[building.id] ?? {};
  const prebuiltAddons = (building.addons ?? [])
    .filter((addon) => addon.prebuilt)
    .map((addon) => addon.id);
  const savedAddons = Array.isArray(saved.addons) ? saved.addons : [];
  return {
    ...saved,
    level: building.prebuilt ? Math.max(1, saved.level ?? 0) : (saved.level ?? 0),
    paid: saved.paid ?? {},
    durability: saved.durability ?? DURABILITY_DEFAULT,
    addons: [...new Set([...prebuiltAddons, ...savedAddons])],
  };
}

export function hasCityBuilding(progress = {}, buildingId) {
  return getCityBuildingStateForId(progress, buildingId).level > 0;
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

export function cityRequirementContext(progress = {}) {
  return {
    hasBuilding: (buildingId) => hasCityBuilding(progress, buildingId),
    hasAddon: (addonId) => hasCityAddon(progress, addonId),
    buildingName: (buildingId) => cityBuildingName(buildingId),
    addonName: (addonId) => cityAddonName(addonId),
  };
}
