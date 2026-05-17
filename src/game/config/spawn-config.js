// General spawn tuning for generated maps.
//
// map-region-config.js owns what can spawn and how many attempts are made per
// chunk. This file only keeps shared collision and safe-zone tuning.
export const SPAWN_CONFIG = {
  safeCenter: { x: 3.2, y: 3.1 },

  objectSafeRadius: 4.2,
  regionStartClearRadius: 4.2,
  regionEndClearRadius: 3.4,
  foliageSafeRadius: 2.2,
  decalSafeRadius: 2.8,
};

export const OBJECT_SPAWN_TUNING = {
  default: { radius: 0.4, sizeBase: 1, sizeRange: 0, sizeSalt: 0 },
  building: { radius: 1.15, sizeBase: 1.2, sizeRange: 0.32, sizeSalt: 330 },
  ruin: { radius: 0.82, sizeBase: 1.08, sizeRange: 0.28, sizeSalt: 335 },
  firebeacon: { radius: 0.42, sizeBase: 0.88, sizeRange: 0.18, sizeSalt: 338 },
  fireplace: { radius: 0.42, sizeBase: 0.88, sizeRange: 0.18, sizeSalt: 338 },
  "broken-wall": { radius: 0.72, sizeBase: 1.25, sizeRange: 0, sizeSalt: 0 },
  tree: { radius: 0.5, sizeBase: 1.15, sizeRange: 0, sizeSalt: 0 },
  stone: { radius: 0.5, sizeBase: 1.15, sizeRange: 0, sizeSalt: 0 },
  pillar: { radius: 0.5, sizeBase: 1.15, sizeRange: 0, sizeSalt: 0 },
  obelisk: { radius: 0.5, sizeBase: 1.15, sizeRange: 0, sizeSalt: 0 },
  crystal: { radius: 0.34, sizeBase: 0.9, sizeRange: 0, sizeSalt: 0 },
  object_woodboxes_ground: { radius: 0.46, sizeBase: 0.96, sizeRange: 0.22, sizeSalt: 341 },
};
