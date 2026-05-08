import { drawFoliageSprite, drawObject } from "./assets.js";

const FOLIAGE_TYPES = new Set([
  "foliage",
  "tree",
]);

export function isFoliageType(type) {
  return FOLIAGE_TYPES.has(type);
}

export function drawFoliageObject(ctx, object, screen, biome, atlas, time = 0) {
  if (!isFoliageType(object?.type)) return false;
  if (object.type === "foliage") return drawFoliageSprite(ctx, object, screen, biome, atlas, time);
  return drawObject(ctx, object, screen, biome, atlas, time);
}
