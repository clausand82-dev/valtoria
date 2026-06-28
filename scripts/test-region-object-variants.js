import assert from "node:assert/strict";

import { resolveObjectSpriteFrameIndex } from "../src/game/assets.js";
import { buildCityMobBattleRegion, CITY_MOB_BATTLE_PROFILES } from "../src/game/config/city-mobs-battle-config.js";
import { normalizeRegionObjects } from "../src/game/config/region-object-config.js";
import { normalizePrefabContent } from "../src/game/world/map-prefab-placement.js";
import { createChunk, createRegion } from "../src/game/world.js";

function regionObjects(region, objectDefId) {
  const objects = [];
  const chunkSize = 16;
  for (let cy = 0; cy < Math.ceil(region.height / chunkSize); cy += 1) {
    for (let cx = 0; cx < Math.ceil(region.width / chunkSize); cx += 1) {
      objects.push(...createChunk(cx, cy, region).objects.filter((object) => object.objectDefId === objectDefId));
    }
  }
  return objects;
}

function fixedVariantRegion(config, seed = 123) {
  return createRegion(1, seed, null, {
    id: "variant-test",
    mapSize: "small",
    objects: config,
    spawnCounts: { objects: 10, foliage: 0, decals: 0, monsters: { min: 0, max: 0 }, water: 0 },
  });
}

const normalized = normalizeRegionObjects({
  objects: [
    { id: "object_house_mainland", weight: 2, variant: 5 },
    { id: "object_bones", weight: 1 },
  ],
});
assert.equal(normalized[0].variant, 5, "normalization must preserve a fixed variant");
assert.equal(normalized[1].variant, null, "an omitted variant must remain random");

const regularRegion = fixedVariantRegion([{ id: "object_house_mainland", weight: 1, variant: 5 }]);
const regularObjects = regionObjects(regularRegion, "object_house_mainland");
assert.ok(regularObjects.length > 0, "regular test region must spawn objects");
assert.ok(regularObjects.every((object) => object.variant === 5 && object.treeVariant === 5 && object.frameIndex === 5));

const randomRegion = fixedVariantRegion([{ id: "object_house_mainland", weight: 1 }], 321);
const randomObjects = regionObjects(randomRegion, "object_house_mainland");
assert.ok(randomObjects.length > 0, "random test region must spawn objects");
assert.ok(randomObjects.every((object) => object.variant === null), "legacy objects must not become fixed to cell zero");

const innProfile = CITY_MOB_BATTLE_PROFILES.find((profile) => profile.id === "city-inn-taproom");
assert.ok(innProfile, "Inn city battle profile must exist");
const cityBattleConfig = buildCityMobBattleRegion({
  ...innProfile,
  objects: [{ id: "object_house_mainland", weight: 1, variant: 5 }],
  spawnCounts: { objects: 10, foliage: 0, decals: 0, monsters: { min: 0, max: 0 }, water: 0 },
}, {
  areaId: "city-close-west",
  mobType: "Wolf",
  mapSize: "small",
  occupiedBuildingId: "inn",
});
const cityRegion = createRegion(2, 456, null, cityBattleConfig);
const cityObjects = regionObjects(cityRegion, "object_house_mainland");
assert.ok(cityObjects.length > 0, "city battle test region must spawn objects");
assert.ok(cityObjects.every((object) => object.variant === 5 && object.treeVariant === 5));

const prefab = normalizePrefabContent({
  objects: [{ id: "object_house_mainland", x: 1, y: 1, variant: 5 }],
});
assert.equal(prefab.objects[0].variant, 5, "manual prefab objects must preserve variant");

const animatedSheet = { animated: true, cells: Array.from({ length: 16 }, () => ({})) };
assert.equal(resolveObjectSpriteFrameIndex({ variant: 5, treeVariant: 5, animSeed: 0 }, animatedSheet, 0), 5);
assert.equal(resolveObjectSpriteFrameIndex({ variant: 5, treeVariant: 5, animSeed: 0 }, animatedSheet, 10), 5);
assert.notEqual(
  resolveObjectSpriteFrameIndex({ variant: null, treeVariant: 5, animSeed: 0 }, animatedSheet, 0),
  resolveObjectSpriteFrameIndex({ variant: null, treeVariant: 5, animSeed: 0 }, animatedSheet, 1),
  "animated objects without a fixed variant must keep animating",
);

console.log("[region-object-variants] OK", {
  normalization: true,
  regularRegion: true,
  legacyRandom: true,
  cityBattleRegion: true,
  prefab: true,
  animatedFixedCell: true,
});
