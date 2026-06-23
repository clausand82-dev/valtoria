import { getRegionObjectFamily, resolveRegionObjectDefBySpawnType, resolveRegionObjectDestructibleDef } from "../dependencies.js";

const DEFAULT_DESTRUCTIBLE_DEF = {
  hp: 1,
  damageStages: 1,
  particleColor: "#d8c091",
  lootTables: [],
};

export function isDestructibleObject(object) {
  const def = getDestructibleDef(object);
  return Boolean(def && (object.hp === undefined || object.hp > 0));
}

export function getDestructibleDef(object) {
  if (!object) return null;
  if (object.destructible === false) return null;
  const regionDef = resolveRegionObjectDestructibleDef(object.type);
  if (regionDef) return regionDef;
  return object.destructible ? DEFAULT_DESTRUCTIBLE_DEF : null;
}

export function objectMetadataConfig(object) {
  const def = resolveRegionObjectDefBySpawnType(object?.type);
  const tags = [
    ...(Array.isArray(def?.tags) ? def.tags : []),
    ...(Array.isArray(object?.tags) ? object.tags : []),
  ].map(String).filter(Boolean);
  return {
    tags: [...new Set(tags)],
    factionId: object?.factionId ?? def?.factionId,
    onDestroyed: object?.onDestroyed ?? def?.onDestroyed ?? null,
  };
}

export function destructibleObjectScreenHit(object) {
  const size = Math.max(0.7, Number(object?.size) || 1);
  const baseRadius = 30 + (Number(object?.radius) || 0.4) * 36;
  const family = getRegionObjectFamily(object?.type);
  if (family === "building") return { offsetY: 72 * size, radius: Math.max(baseRadius, 74 * size) };
  if (family === "tree") return { offsetY: 64 * size, radius: Math.max(baseRadius, 68 * size) };
  if (family === "ruin") return { offsetY: 46 * size, radius: Math.max(baseRadius, 58 * size) };
  if (family === "pillar") return { offsetY: 48 * size, radius: Math.max(baseRadius, 48 * size) };
  if (family === "crystal") return { offsetY: 38 * size, radius: Math.max(baseRadius, 42 * size) };
  return { offsetY: 26 * size, radius: Math.max(baseRadius, 42 * size) };
}
