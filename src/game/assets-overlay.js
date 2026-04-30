import { drawObject } from "./assets.js";

const OVERLAY_TYPES = new Set([
  "house",
  "broken-wall",
  "pillar",
  "obelisk",
  "well",
  "crate",
  "boulder",
  "stone",
  "rubble",
  "crystal",
]);

export function isOverlayType(type) {
  return OVERLAY_TYPES.has(type);
}

export function drawOverlayObject(ctx, object, screen, biome, atlas, time = 0) {
  if (!isOverlayType(object?.type)) return false;
  return drawObject(ctx, object, screen, biome, atlas, time);
}
