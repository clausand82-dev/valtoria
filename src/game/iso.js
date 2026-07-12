import { TILE_H, TILE_W } from "./config/game-constants-config.js";

export function worldToIso(x, y, z = 0) {
  return {
    x: (x - y) * (TILE_W / 2),
    y: (x + y) * (TILE_H / 2) - z,
  };
}

// Uses the same horizontal basis as worldToIso, expressed in isometric tile widths.
// It deliberately excludes camera translation and zoom for stable spatial audio.
export function relativeIsoHorizontalTiles(source, listener) {
  const sourceIso = worldToIso(Number(source?.x) || 0, Number(source?.y) || 0);
  const listenerIso = worldToIso(Number(listener?.x) || 0, Number(listener?.y) || 0);
  return (sourceIso.x - listenerIso.x) / (TILE_W / 2);
}

export function worldToScreen(x, y, z, camera) {
  const iso = worldToIso(x, y, z);
  return {
    x: iso.x + camera.offsetX,
    y: iso.y + camera.offsetY,
  };
}

export function screenToWorld(x, y, camera) {
  const isoX = (x - camera.offsetX) / (TILE_W / 2);
  const isoY = (y - camera.offsetY) / (TILE_H / 2);
  return {
    x: (isoY + isoX) / 2,
    y: (isoY - isoX) / 2,
  };
}

export function screenDirectionToWorld(dx, dy) {
  const isoX = dx / (TILE_W / 2);
  const isoY = dy / (TILE_H / 2);
  return {
    x: (isoY + isoX) / 2,
    y: (isoY - isoX) / 2,
  };
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function normalize(x, y) {
  const len = Math.hypot(x, y);
  if (!len) return { x: 0, y: 0 };
  return { x: x / len, y: y / len };
}

export function visibleScreenPoint(point, width, height, pad = 160) {
  return point.x > -pad && point.y > -pad && point.x < width + pad && point.y < height + pad;
}
