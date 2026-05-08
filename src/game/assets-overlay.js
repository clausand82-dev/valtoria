import { drawObject } from "./assets.js";
import { getRegionObjectFamily } from "./config/region-object-config.js";

const OVERLAY_TYPES = new Set([
  "house",
  "building",
  "ruin",
  "broken-wall",
  "pillar",
  "obelisk",
  "well",
  "crate",
  "tree",
  "stone",
  "crystal",
  "chest",
  "firebeacon",
  "fireplace",
]);

export function isOverlayType(type) {
  return OVERLAY_TYPES.has(type) || String(type ?? "").startsWith("object_") || getRegionObjectFamily(type) === "tree";
}

export function drawOverlayObject(ctx, object, screen, biome, atlas, time = 0) {
  if (!isOverlayType(object?.type)) return false;
  return drawObject(ctx, object, screen, biome, atlas, time);
}
