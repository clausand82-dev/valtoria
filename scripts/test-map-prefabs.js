import assert from "node:assert/strict";

import { GENERATED_MAP_PREFABS } from "../src/game/config/generated-prefabs/index.js";
import { HANDWRITTEN_MAP_PREFABS, MAP_PREFABS } from "../src/game/config/map-prefab-config.js";
import { mergePrefabRegistries } from "../src/game/config/prefab-registry.js";
import {
  normalizePrefabContent,
  normalizePrefabDocument,
  resolvePrefabMonsterLevel,
} from "../src/game/world/prefabs/prefab-normalization.js";
import {
  applyPrefabGroundOverride,
  buildPrefabGroundOverrideMap,
  collectPrefabGroundSpecs,
  prefabGroundEntries,
  prefabGroundOverrideAt,
} from "../src/game/world/prefabs/prefab-ground-overrides.js";
import { transformPrefabPoint, transformedPrefabSize } from "../src/game/world/prefabs/prefab-transforms.js";
import { validatePrefab, validatePrefabRegistry } from "../src/game/world/prefabs/prefab-validation.js";

const directObject = {
  id: "object_well",
  x: 1,
  y: 2,
  blocking: false,
  actionId: "enter_the_mine_lvl1",
  actions: [{ actionId: "inspect_random_ruin" }],
  customRuntimeProperty: { retained: true },
};
const directPrefab = {
  id: "direct_test",
  w: 4,
  h: 4,
  objects: [directObject],
  foliage: [{ fileName: "foilage/foilage_plants_mainland.png", x: 2, y: 1, cell: 3 }],
  decals: [{ decayId: "decay_dust", x: 0, y: 0, alpha: 0.5 }],
  monsters: [{ type: "Wolf", x: 3, y: 3, levelOffset: 2 }],
  npcs: [{ npcId: "wiseman", x: 1, y: 1, facing: "north" }],
  chests: [{ id: "basic_chest", x: 2, y: 2, blocking: true }],
};
const directContent = normalizePrefabContent(directPrefab);
assert.deepEqual(directContent.objects, directPrefab.objects);
assert.deepEqual(directContent.foliage, directPrefab.foliage);
assert.deepEqual(directContent.decals, directPrefab.decals);
assert.deepEqual(directContent.monsters, directPrefab.monsters);
assert.deepEqual(directContent.npcs, directPrefab.npcs);
assert.deepEqual(directContent.chests, directPrefab.chests);
assert.equal(directContent.objects[0], directObject, "direct entries retain their existing identity and properties");

const legendPrefab = {
  id: "legend_test",
  w: 3,
  h: 2,
  tiles: ["W.S", ".nc"],
  legend: {
    ".": { type: "keep" },
    W: { object: "object_well", blocking: false, actionId: "enter_the_mine_lvl1" },
    S: { monster: "Spider", levelOffset: 3 },
    n: { npc: "wiseman", facing: "south" },
    c: { chest: "basic_chest", blocking: true },
  },
};
const legendContent = normalizePrefabContent(legendPrefab);
assert.deepEqual(legendContent.objects[0], {
  x: 0,
  y: 0,
  id: "object_well",
  blocking: false,
  destructible: undefined,
  size: undefined,
  radius: undefined,
  rotation: undefined,
  visualScale: undefined,
  variant: undefined,
  variantCount: undefined,
  spawnDamage: undefined,
  spawnTags: undefined,
  avoidSpawnTags: undefined,
  spawnAvoidRadius: undefined,
  foregroundFade: undefined,
  foregroundFadeAlpha: undefined,
  actionId: "enter_the_mine_lvl1",
  actions: undefined,
  questTargetKey: undefined,
});
assert.deepEqual(legendContent.monsters[0], { x: 2, y: 0, levelOffset: 3, type: "Spider" });
assert.deepEqual(legendContent.npcs[0], { x: 1, y: 1, facing: "south", npcId: "wiseman", actionId: undefined, actions: undefined, conditions: undefined });
assert.deepEqual(legendContent.chests[0], { x: 2, y: 1, blocking: true, id: "basic_chest" });

for (const [key, prefab] of Object.entries(GENERATED_MAP_PREFABS)) assert.equal(key, prefab.id);
assert.equal(Object.keys(MAP_PREFABS).length, Object.keys(HANDWRITTEN_MAP_PREFABS).length + Object.keys(GENERATED_MAP_PREFABS).length);
assert.deepEqual(mergePrefabRegistries(HANDWRITTEN_MAP_PREFABS, {}), HANDWRITTEN_MAP_PREFABS, "an empty generated registry remains supported");
const generated = { editor_house: { id: "editor_house", w: 1, h: 1 } };
const merged = mergePrefabRegistries({ handwritten: { id: "handwritten", w: 1, h: 1 } }, generated);
assert.deepEqual(Object.keys(merged), ["handwritten", "editor_house"]);
assert.throws(
  () => mergePrefabRegistries({ duplicate: { id: "duplicate" } }, { duplicate: { id: "duplicate" } }),
  /Duplicate prefab registry key "duplicate"/,
);
assert.throws(
  () => mergePrefabRegistries({ same_key: { id: "first" } }, { same_key: { id: "second" } }),
  /must exactly match prefab id/,
);

const groundPrefab = {
  id: "ground_test",
  w: 2,
  h: 3,
  ground: {
    palette: [
      { fileName: "tileset/tileset_grass.png", variant: 3 },
      { fileName: "tileset/tileset_field.png", variant: 8 },
    ],
    rows: [[0, null], [null, 1], [1, null]],
  },
};
const expectedFirstPoint = new Map([
  [0, { x: 0, y: 0 }],
  [90, { x: 2, y: 0 }],
  [180, { x: 1, y: 2 }],
  [270, { x: 0, y: 1 }],
]);
for (const rotation of [0, 90, 180, 270]) {
  assert.deepEqual(transformedPrefabSize(groundPrefab, rotation), rotation === 90 || rotation === 270 ? { w: 3, h: 2 } : { w: 2, h: 3 });
  const entries = prefabGroundEntries(groundPrefab, rotation, false);
  assert.deepEqual({ x: entries[0].x, y: entries[0].y }, expectedFirstPoint.get(rotation));
  assert.equal(entries[0].variant, 3);
}
assert.deepEqual(transformPrefabPoint(0, 0, 2, 3, 0, true), { x: 1, y: 0 });
assert.deepEqual(
  prefabGroundEntries(groundPrefab, 0, true).map(({ x, y }) => ({ x, y })),
  [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 2 }],
);

const instance = {
  id: groundPrefab.id,
  instanceId: "ground_test:0:10,20",
  x: 10,
  y: 20,
  ground: prefabGroundEntries(groundPrefab),
};
const overrideRegion = { prefabGroundOverrides: buildPrefabGroundOverrideMap([instance]) };
assert.deepEqual(prefabGroundOverrideAt(overrideRegion, 10, 20), {
  groundSheetId: "ground-custom:tileset/tileset_grass.png",
  variant: 3,
  prefabId: "ground_test",
  prefabInstanceId: "ground_test:0:10,20",
});
assert.equal(prefabGroundOverrideAt(overrideRegion, 11, 20), null, "null cells retain procedural ground");
const proceduralTile = { groundSheetId: "procedural", variant: 11 };
assert.equal(applyPrefabGroundOverride(proceduralTile, null), proceduralTile);
assert.deepEqual(proceduralTile, { groundSheetId: "procedural", variant: 11 });
assert.deepEqual(applyPrefabGroundOverride({ groundSheetId: "procedural", variant: 11 }, prefabGroundOverrideAt(overrideRegion, 10, 20)), {
  groundSheetId: "ground-custom:tileset/tileset_grass.png",
  variant: 3,
  prefabGroundOverride: true,
});
assert.deepEqual(prefabGroundEntries({ id: "legacy", w: 2, h: 2 }, 90, true), [], "prefabs without ground stay on the old path");
assert.equal(collectPrefabGroundSpecs([groundPrefab]).length, 2);

const editorPrefab = {
  ...directPrefab,
  schemaVersion: 1,
  editor: { managed: true, lastView: "isometric", zoom: 1, hiddenLayers: [], futureSetting: { retained: true } },
};
assert.deepEqual(normalizePrefabContent(editorPrefab), directContent, "editor metadata cannot affect runtime content");
assert.deepEqual(normalizePrefabDocument(editorPrefab).editor.futureSetting, { retained: true });
assert.deepEqual(normalizePrefabDocument(editorPrefab).objects[0].customRuntimeProperty, { retained: true });

assert.equal(resolvePrefabMonsterLevel(5, {}), 5);
assert.equal(resolvePrefabMonsterLevel(5, { levelOffset: 2 }), 7);
assert.equal(resolvePrefabMonsterLevel(2, { levelOffset: -9 }), 1);
assert.equal(resolvePrefabMonsterLevel(5, { levelOffset: "invalid" }), 5);

assert.deepEqual(validatePrefab(groundPrefab), []);
assert.ok(validatePrefab({ id: "bad", w: 2, h: 2, objects: [{ id: "missing", x: 2, y: 0 }] }, { knownIds: { objects: new Set(["known"]) } }).some((error) => error.includes('prefab "bad".objects[0].x')));
assert.ok(validatePrefab({ id: "bad_ground", w: 1, h: 1, ground: { palette: [{ fileName: "x.png", variant: 16 }], rows: [[2]] } }).some((error) => error.includes("ground.palette[0].variant")));
assert.ok(validatePrefabRegistry({ one: { id: "same", w: 1, h: 1 }, two: { id: "same", w: 1, h: 1 } }).some((error) => error.includes('duplicate prefab id "same"')));

console.log("[map-prefabs] OK", {
  directArrays: true,
  legend: true,
  registries: true,
  groundTransforms: true,
  metadataIsolation: true,
  validation: true,
  monsterLevelOffset: true,
});
