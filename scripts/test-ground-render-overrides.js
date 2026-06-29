import assert from "node:assert/strict";

import {
  buildRegionAssetManifest,
  customGroundSpec,
  groundTopDownToIsometricTransform,
} from "../src/game/assets.js";
import { buildCityMobBattleRegion, CITY_MOB_BATTLE_PROFILES } from "../src/game/config/city-mobs-battle-config.js";
import {
  collectRegionAssetOverrides,
  DEFAULT_CUSTOM_GROUND_RENDER,
  groundTilesetDiagnostics,
  normalizeRegionTileset,
  resolveLockedTilesetVariant,
} from "../src/game/config/region-asset-config.js";
import { createChunk, createRegion, resolveGroundTileVariant } from "../src/game/world.js";

const fileName = "tileset/tileset_bricktiles.png";

function transformPoint(transform, x, y) {
  return {
    x: transform.a * x + transform.c * y + transform.e,
    y: transform.b * x + transform.d * y + transform.f,
  };
}

const isoTransform = groundTopDownToIsometricTransform(400, 400, 104, 52);
assert.deepEqual(transformPoint(isoTransform, -200, -200), { x: 52, y: 0 });
assert.deepEqual(transformPoint(isoTransform, 200, -200), { x: 104, y: 26 });
assert.deepEqual(transformPoint(isoTransform, -200, 200), { x: 0, y: 26 });
assert.deepEqual(transformPoint(isoTransform, 200, 200), { x: 52, y: 52 });

const legacy = normalizeRegionTileset({ fileName });
assert.deepEqual({
  sourceInset: legacy.sourceInset,
  edgeFeather: legacy.edgeFeather,
  textureAlpha: legacy.textureAlpha,
  visualScale: legacy.visualScale,
  baseAlpha: legacy.baseAlpha,
}, DEFAULT_CUSTOM_GROUND_RENDER);
assert.equal(legacy.sheetId, `ground-custom:${fileName}`);
assert.equal(legacy.lockedVariant, null);
assert.equal(resolveLockedTilesetVariant({ x: 1, y: 1 }), 0);
assert.equal(resolveLockedTilesetVariant({ x: 2, y: 1 }), 1);
assert.equal(resolveLockedTilesetVariant({ x: 4, y: 1 }), 3);
assert.equal(resolveLockedTilesetVariant({ x: 1, y: 2 }), 4);
assert.equal(resolveLockedTilesetVariant({ x: 4, y: 4 }), 15);
assert.equal(resolveLockedTilesetVariant({ x: 99, y: 99 }), 15);
assert.equal(resolveLockedTilesetVariant({ x: 1 }), null);

const hardFloor = normalizeRegionTileset({
  fileName,
  x: 1,
  y: 1,
  visualScale: 1,
  sourceInset: 0,
  edgeFeather: 0,
  textureAlpha: 0.9,
  baseAlpha: 0,
});
assert.equal(hardFloor.lockedVariant, 0);
assert.deepEqual({
  sourceInset: hardFloor.sourceInset,
  edgeFeather: hardFloor.edgeFeather,
  textureAlpha: hardFloor.textureAlpha,
  visualScale: hardFloor.visualScale,
  baseAlpha: hardFloor.baseAlpha,
}, { sourceInset: 0, edgeFeather: 0, textureAlpha: 0.9, visualScale: 1, baseAlpha: 0 });
assert.notEqual(hardFloor.sheetId, legacy.sheetId);
assert.equal(normalizeRegionTileset({ fileName, x: 4, y: 4 }).lockedVariant, 15);

const lockedDefault = normalizeRegionTileset({ fileName, x: 1, y: 1 });
assert.equal(lockedDefault.sheetId, legacy.sheetId, "selection must reuse the same rendered sheet");
assert.deepEqual(
  groundTilesetDiagnostics({ fileName, x: 1, y: 1 })[0],
  {
    fileName,
    x: 1,
    y: 1,
    lockedVariant: 0,
    variantCount: 16,
    sheetId: legacy.sheetId,
    renderSettings: DEFAULT_CUSTOM_GROUND_RENDER,
  },
);
assert.equal(resolveGroundTileVariant(lockedDefault, 13), 0);
assert.equal(resolveGroundTileVariant(normalizeRegionTileset({ fileName, x: 2, y: 1 }), 13), 1);
assert.equal(resolveGroundTileVariant(normalizeRegionTileset({ fileName, x: 4, y: 4 }), 3), 15);
assert.equal(resolveGroundTileVariant(legacy, 13), 13);

const clamped = normalizeRegionTileset({
  fileName,
  sourceInset: 2,
  edgeFeather: -1,
  textureAlpha: 4,
  visualScale: 0.1,
  baseAlpha: -2,
});
assert.deepEqual({
  sourceInset: clamped.sourceInset,
  edgeFeather: clamped.edgeFeather,
  textureAlpha: clamped.textureAlpha,
  visualScale: clamped.visualScale,
  baseAlpha: clamped.baseAlpha,
}, { sourceInset: 0.25, edgeFeather: 0, textureAlpha: 1, visualScale: 0.5, baseAlpha: 0 });

const overrides = collectRegionAssetOverrides({
  one: [{ id: "soft", tileset: [{ fileName }] }],
  two: [{ id: "hard", tileset: [{ fileName, visualScale: 1, sourceInset: 0, edgeFeather: 0, baseAlpha: 0 }] }],
});
assert.equal(overrides.groundSheets.length, 2);
assert.notEqual(overrides.groundSheets[0].sheetId, overrides.groundSheets[1].sheetId);

const manifest = buildRegionAssetManifest({
  id: "hard-floor-test",
  tileset: [{ fileName, x: 1, y: 1, visualScale: 1, sourceInset: 0, edgeFeather: 0, textureAlpha: 0.9, baseAlpha: 0 }],
});
assert.deepEqual(manifest.groundSpecs[0], customGroundSpec(hardFloor.sheetId, fileName, hardFloor));

const unlockedManifest = buildRegionAssetManifest({ id: "unlocked", tileset: [{ fileName }] });
const lockedManifest = buildRegionAssetManifest({ id: "locked", tileset: [{ fileName, x: 1, y: 1 }] });
for (const key of ["biomeId", "fileName", "sourceInset", "edgeFeather", "textureAlpha", "visualScale", "baseAlpha", "renderSettings"]) {
  assert.deepEqual(lockedManifest.groundSpecs[0][key], unlockedManifest.groundSpecs[0][key], `${key} must match for locked and unlocked sheets`);
}
assert.deepEqual(lockedManifest.groundSpecs[0].selection, { x: 1, y: 1, lockedVariant: 0, variantCount: 16 });

const randomRegion = createRegion(1, 123, null, {
  id: "random-ground-test",
  mapSize: "small",
  tileset: [{ fileName }],
  spawnCounts: { objects: 0, foliage: 0, decals: 0, monsters: { min: 0, max: 0 }, water: 0 },
});
const randomTiles = createChunk(1, 1, randomRegion).tiles;
assert.ok(randomTiles.length > 0);
assert.ok(randomTiles.every((tile) => tile.variant >= 0 && tile.variant <= 15));
assert.ok(new Set(randomTiles.map((tile) => tile.variant)).size > 1, "unlocked tiles must remain randomized");

function variantsFor(tileset, seed = 234) {
  const region = createRegion(1, seed, null, {
    id: "locked-ground-test",
    mapSize: "small",
    tileset,
    spawnCounts: { objects: 0, foliage: 0, decals: 0, monsters: { min: 0, max: 0 }, water: 0 },
  });
  const chunk = createChunk(1, 1, region);
  return { region, tiles: chunk.tiles };
}

for (const testcase of [
  { x: 1, y: 1, expected: 0 },
  { x: 2, y: 1, expected: 1 },
  { x: 4, y: 4, expected: 15 },
]) {
  const result = variantsFor([{ fileName, x: testcase.x, y: testcase.y, weight: 1 }]);
  assert.ok(result.tiles.length > 0);
  assert.ok(result.tiles.every((tile) => tile.variant === testcase.expected));
  assert.ok(result.tiles.every((tile) => tile.groundSheetId === legacy.sheetId));
}

const mixed = variantsFor([1, 2, 3, 4].map((x) => ({ fileName, x, y: 1, weight: 1 })), 345);
const mixedVariants = new Set(mixed.tiles.map((tile) => tile.variant));
assert.ok(mixedVariants.size > 1);
assert.ok([...mixedVariants].every((variant) => variant >= 0 && variant <= 3));
assert.ok(mixed.tiles.every((tile) => tile.groundSheetId === legacy.sheetId));

const bankProfile = CITY_MOB_BATTLE_PROFILES.find((profile) => profile.id === "city-bank-vault");
const bankBattle = buildCityMobBattleRegion(bankProfile, {
  areaId: "city-close-north",
  mobType: "Wolf",
  mapSize: "small",
  occupiedBuildingId: "bank",
});
const bankRegion = createRegion(2, 456, null, bankBattle);
const bankTileset = bankRegion.mapRegion.tileset[0];
assert.equal(bankTileset.lockedVariant, 0);
assert.deepEqual({
  sourceInset: bankTileset.sourceInset,
  edgeFeather: bankTileset.edgeFeather,
  visualScale: bankTileset.visualScale,
  baseAlpha: bankTileset.baseAlpha,
}, {
  sourceInset: 0,
  edgeFeather: 0,
  visualScale: 1,
  baseAlpha: 0,
});

console.log("[ground-render-overrides] OK", {
  legacyDefaults: true,
  topDownIsometricTransform: true,
  hardFloorOverrides: true,
  lockedVariants: true,
  lockedUsesFullSheet: true,
  mixedLockedVariants: true,
  randomVariants: true,
  distinctCacheIds: true,
  manifestPropagation: true,
  cityBattle: true,
});
