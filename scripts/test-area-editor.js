import assert from "node:assert/strict";

import { isAllowedLocalHostname, isAreaEditorAvailable } from "../src/app/dev-feature-guard.js";
import { createBlueprintEditorDocument, createEditorDocument, editorDocumentFingerprint, importHandwrittenPrefab, resizeEditorDocument, resizeImpact, serializeEditorDocument } from "../src/dev/area-editor/editor-document.js";
import { createEditorHistory, commitEditorHistory, redoEditorHistory, undoEditorHistory } from "../src/dev/area-editor/editor-history.js";
import { buildEditorPlaytest, firstPrefabTestCell } from "../src/dev/area-editor/editor-playtest.js";
import { gridToIsometric, gridToTopDown, isometricToGrid, topDownToGrid } from "../src/dev/area-editor/editor-renderer.js";
import { updateEntity } from "../src/dev/area-editor/editor-tools.js";
import { PREFAB_PROPERTY_SCHEMA, schemaForLayer } from "../src/dev/area-editor/property-schemas.js";
import { importPrefabAsCopy, openGeneratedPrefab } from "../src/dev/area-editor/prefab-document-adapter.js";
import { assetFrameStyle, buildAreaEditorAssetCatalog } from "../src/dev/area-editor/asset-catalog.js";
import { buildAnimationAssetManifest, buildRegionAssetManifest } from "../src/game/assets.js";
import { persistenceMethods } from "../src/game/GameEngine/methods/persistence.js";
import { regionMethods } from "../src/game/GameEngine/methods/region.js";
import { createChunk, createRegion } from "../src/game/world.js";
import { buildGeneratedPrefabIndex, deterministicJson, handwrittenPrefabIdsFromSource, sanitizeEditorPrefabId, serializeGeneratedPrefabModule, validateGeneratedDocument } from "./area-editor-dev-plugin.js";

const created = createEditorDocument({ id: "editor_test", label: "Editor Test", w: 5, h: 4 });
assert.equal(created.schemaVersion, 1);
assert.equal(created.editor.managed, true);
assert.equal(created.ground.rows.length, 4);
assert.equal(created.ground.rows[0].length, 5);

const generated = {
  ...created,
  editor: { ...created.editor, futureEditorMetadata: { preserved: true } },
  objects: [{ id: "object_well", x: 1, y: 1, unknownSupportedProperty: { retained: true } }],
};
const opened = openGeneratedPrefab(generated);
assert.deepEqual(opened.editor.futureEditorMetadata, { preserved: true });
assert.deepEqual(opened.objects[0].unknownSupportedProperty, { retained: true });

const shorthand = {
  id: "legacy_short",
  label: "Legacy Short",
  w: 2,
  h: 2,
  tiles: ["W.", ".S"],
  legend: { W: { object: "object_well", blocking: false }, S: { monster: "Spider", levelOffset: 2 }, ".": { type: "keep" } },
  objects: [{ id: "object_stone_cluster", x: 1, y: 0, custom: "keep" }],
};
const imported = importPrefabAsCopy(shorthand, "legacy_short_editor");
assert.equal(imported.tiles, undefined);
assert.equal(imported.legend, undefined);
assert.equal(imported.objects.length, 2);
assert.equal(imported.monsters.length, 1);
assert.equal(imported.monsters[0].levelOffset, 2);
assert.equal(imported.editor.importedFrom, "legacy_short");
const serialized = serializeEditorDocument(imported);
assert.equal(serialized.tiles, undefined);
assert.equal(serialized.legend, undefined);
assert.equal(serialized.objects.length, 2, "normalized shorthand content must not duplicate during save");
assert.equal(serialized.objects[1].custom, "keep");
assert.equal(editorDocumentFingerprint(serialized), editorDocumentFingerprint(JSON.parse(JSON.stringify(serialized))));

let history = createEditorHistory(created, 3);
history = commitEditorHistory(history, { ...created, label: "One" });
history = commitEditorHistory(history, { ...created, label: "Two" });
history = undoEditorHistory(history);
assert.equal(history.present.label, "One");
history = redoEditorHistory(history);
assert.equal(history.present.label, "Two");

for (const cell of [{ x: 0, y: 0 }, { x: 2, y: 3 }, { x: 7, y: 1 }]) {
  const iso = gridToIsometric(cell.x + 0.25, cell.y + 0.25, { zoom: 1.3, originX: 400, originY: 60 });
  assert.deepEqual(isometricToGrid(iso.x, iso.y, { zoom: 1.3, originX: 400, originY: 60 }), cell);
  const top = gridToTopDown(cell.x + 0.25, cell.y + 0.25, { zoom: 0.8, originX: 30, originY: 40 });
  assert.deepEqual(topDownToGrid(top.x, top.y, { zoom: 0.8, originX: 30, originY: 40 }), cell);
}

const resizeSource = createEditorDocument({
  id: "resize_test", w: 4, h: 4,
  ground: { palette: [{ fileName: "tileset/tileset_grass.png", variant: 1 }], rows: [[null, null, null, null], [null, null, null, null], [null, null, 0, null], [null, null, null, 0]] },
  objects: [{ id: "object_well", x: 3, y: 3 }, { id: "object_well", x: 1, y: 1 }],
});
assert.deepEqual(resizeImpact(resizeSource, 3, 3), { w: 3, h: 3, groundCells: 1, waterCells: 0, maskCells: 0, markers: 0, entities: 1, total: 2 });
const resized = resizeEditorDocument(resizeSource, 3, 3);
assert.equal(resized.objects.length, 1);
assert.equal(resized.ground.rows.length, 3);
assert.equal(resized.ground.rows[2][2], 0);

assert.equal(sanitizeEditorPrefabId("valid_prefab_2"), "valid_prefab_2");
for (const invalid of ["../bad", "bad/name", "bad\\name", "/absolute", "bad%2fpath", "Bad", "2bad", "bad.js"]) assert.throws(() => sanitizeEditorPrefabId(invalid));
assert.throws(() => validateGeneratedDocument({ ...created, id: "invalid/id" }));
const validated = validateGeneratedDocument(generated);
assert.equal(validated.id, "editor_test");
assert.equal(validated.objects[0].unknownSupportedProperty.retained, true);
assert.equal(JSON.parse(deterministicJson(validated)).id, validated.id);
assert.match(serializeGeneratedPrefabModule(validated), /export default/);

const indexSource = buildGeneratedPrefabIndex(["z_prefab", "a_prefab"]);
assert.ok(indexSource.indexOf('import a_prefab from "\.\/a_prefab.js";'.replaceAll("\\", "")) < indexSource.indexOf('import z_prefab from "\.\/z_prefab.js";'.replaceAll("\\", "")));
assert.match(indexSource, /a_prefab,/);
assert.match(indexSource, /z_prefab,/);
assert.throws(() => buildGeneratedPrefabIndex(["bad-id"]));
assert.deepEqual([...handwrittenPrefabIdsFromSource('export const HANDWRITTEN_MAP_PREFABS = {\n  sample: {\n    id: "sample",\n  },\n  mismatch: {\n    id: "other",\n  },\n};')], ["sample"]);

assert.equal(isAllowedLocalHostname("localhost"), true);
assert.equal(isAllowedLocalHostname("127.0.0.1"), true);
assert.equal(isAllowedLocalHostname("0.0.0.0"), false);
assert.equal(isAreaEditorAvailable({ dev: true, hostname: "localhost" }), true);
assert.equal(isAreaEditorAvailable({ dev: false, hostname: "localhost" }), false);
assert.equal(isAreaEditorAvailable({ dev: true, hostname: "valtoria.example" }), false);

const catalog = buildAreaEditorAssetCatalog();
for (const layer of ["ground", "water", "foliage", "decals", "objects"]) assert.ok(catalog.some((entry) => entry.layer === layer && Number.isInteger(entry.variant)), `${layer} must expose visual variant entries`);
const frameStyle = assetFrameStyle(catalog.find((entry) => entry.layer === "ground" && entry.variant === 3));
assert.match(frameStyle.backgroundSize, /400% 400%/);
const groundPreview = catalog.find((entry) => entry.layer === "ground" && entry.variant === 0);
for (const property of ["sourceInset", "edgeFeather", "textureAlpha", "visualScale", "baseAlpha"]) assert.ok(Number.isFinite(Number(groundPreview[property])), `ground preview must carry runtime ${property}`);
const monsterPreview = catalog.find((entry) => entry.layer === "monsters");
assert.equal(monsterPreview.variantCount, 1, "monster catalog must expose one static preview");
assert.ok(monsterPreview.rows > 1 && monsterPreview.cols > 1, "monster preview must retain sheet grid metadata");
assert.equal(monsterPreview.sourceVariant, monsterPreview.row * monsterPreview.cols + monsterPreview.col, "monster preview must select one stable frame");
const monsterFrameStyle = assetFrameStyle(monsterPreview);
assert.match(monsterFrameStyle.backgroundSize, new RegExp(`${monsterPreview.cols * 100}% ${monsterPreview.rows * 100}%`));
const mainlandFoliage = catalog.filter((entry) => entry.layer === "foliage" && entry.id === "mainland");
assert.equal(mainlandFoliage.length, 16, "legacy foliage aliases must mirror the runtime 4x4 fallback sheet");
assert.ok(mainlandFoliage.every((entry) => entry.previewUrl.endsWith("/foilage/foilage_plants_mainland.png")), "legacy mainland foliage must use the live runtime fallback art");
assert.ok(catalog.some((entry) => entry.layer === "objects" && entry.runtimeDefaultSize > 0), "object previews must carry runtime spawn-size tuning");
const bloodDecay = catalog.find((entry) => entry.layer === "decals" && entry.id === "decay_blood");
assert.equal(bloodDecay.projection, "topdown", "top-down decay must use the runtime ground projection path");
assert.equal(bloodDecay.blendMode, "darken", "decay previews must carry the runtime blend mode");
assert.equal(bloodDecay.alpha, 0.42, "top-down prefab decay must use the runtime default alpha");
assert.equal(bloodDecay.depthMode, "terrain", "decay previews must render below runtime world-object layers such as foliage");
const foodDecay = catalog.find((entry) => entry.layer === "decals" && entry.id === "decay_food");
assert.equal(foodDecay.projection, "iso", "iso-painted decay must bypass top-down projection");
assert.equal(foodDecay.blendMode, "multiply", "iso decay must retain runtime compositing");
assert.equal(foodDecay.alpha, 1, "iso decay must retain the runtime default alpha");

const prefabTestSource = createEditorDocument({
  id: "playable_prefab",
  label: "Playable Prefab",
  w: 4,
  h: 3,
  ground: {
    palette: [{ fileName: "tileset/tileset_grass.png", variant: 3, variantCount: 16 }],
    rows: Array.from({ length: 3 }, () => Array(4).fill(0)),
  },
  objects: [{ id: "scarecrow", variant: 6, blocking: false, x: 0, y: 2 }],
  foliage: [{ id: "mainland", variant: 0, x: 1, y: 2 }],
  decals: [{ id: "decay_blood", variant: 0, x: 1, y: 1 }],
  monsters: [{ type: "Spider", x: 2, y: 1 }],
});
const prefabTestFingerprint = editorDocumentFingerprint(prefabTestSource);
assert.deepEqual(firstPrefabTestCell(prefabTestSource, "southwest"), { x: 2, y: 2 }, "prefab test start must use the first unoccupied southwest cell");
const prefabPlaytest = buildEditorPlaytest(prefabTestSource);
assert.equal(prefabPlaytest.kind, "prefab");
assert.equal(prefabPlaytest.ignoreRegionExit, true, "prefabs must not trigger the runtime region-exit rule");
assert.deepEqual(prefabPlaytest.blueprint.start, { x: 2, y: 2 });
assert.equal(prefabPlaytest.blueprint.playableMask.rows.flat().every(Boolean), true);
assert.equal(editorDocumentFingerprint(prefabTestSource), prefabTestFingerprint, "building a playtest must not mutate the editor document");
assert.deepEqual(prefabPlaytest.regionConfig.spawnCounts, { objects: 0, foliage: 0, decals: 0, water: 0, monsters: { min: 0, max: 0 } });

const prefabRegion = createRegion(1, 1234, null, prefabPlaytest.regionConfig, {
  blueprintRegistry: { [prefabPlaytest.blueprint.id]: prefabPlaytest.blueprint },
  proceduralFactory: () => { throw new Error("playable editor tests must resolve through their injected blueprint"); },
});
assert.equal(prefabRegion.blueprintSelection.status, "selected");
assert.equal(prefabRegion.blueprint.id, prefabPlaytest.blueprint.id);
assert.deepEqual(prefabRegion.start, { x: prefabPlaytest.blueprint.start.x + 0.5, y: prefabPlaytest.blueprint.start.y + 0.5 }, "runtime must place the player at the selected editor cell center");
const prefabChunk = createChunk(0, 0, prefabRegion);
assert.equal(prefabChunk.objects.find((entry) => entry.objectDefId === "scarecrow")?.blocking, false, "an explicitly unchecked editor object must be walkable in runtime");

const prefabAssetManifest = buildRegionAssetManifest(prefabPlaytest.assetInput);
assert.ok(prefabAssetManifest.groundSpecs.some((entry) => entry.fileName === "tileset/tileset_grass.png"), "unsaved prefab ground art must be preloaded");
assert.ok(prefabAssetManifest.foliageSpecs.some((entry) => entry.fileName), "unsaved prefab foliage art must be preloaded");
assert.ok(prefabAssetManifest.foliageSpecs.some((entry) => entry.id === "mainland" && entry.fileName === "foilage/foilage_plants_mainland.png" && entry.rows === 4 && entry.cols === 4), "legacy editor foliage aliases must preload the same live fallback sheet used by the preview");
assert.ok(prefabAssetManifest.decayIds.has("decay_blood"), "unsaved prefab decay art must be preloaded");
assert.ok(prefabAssetManifest.objectSheetOverrides.some((entry) => entry.type === "scarecrow" && entry.config.fileName === "object/object_field.png"), "editor tests must preload graphics-backed legacy object types even when they are not part of the object_ runtime registry");
const prefabAnimationManifest = buildAnimationAssetManifest(prefabPlaytest.assetInput);
assert.ok(prefabAnimationManifest.monsterIds.size > 0, "unsaved prefab monster sheets must be preloaded");

const blueprintTestSource = createBlueprintEditorDocument({
  id: "playable_blueprint",
  label: "Playable Blueprint",
  w: 6,
  h: 5,
  start: { x: 1, y: 3 },
  exits: [{ id: "primary", x: 4, y: 1, primary: true }],
});
const blueprintPlaytest = buildEditorPlaytest(blueprintTestSource);
assert.equal(blueprintPlaytest.kind, "blueprint");
assert.equal(blueprintPlaytest.ignoreRegionExit, false, "blueprints must retain the runtime exit rule");
assert.deepEqual(blueprintPlaytest.blueprint.start, blueprintTestSource.start);
assert.deepEqual(blueprintPlaytest.blueprint.exits, blueprintTestSource.exits);

assert.equal(persistenceMethods.loadProgress.call({ persistenceDisabled: true }), false, "editor tests must not load a gameplay save");
assert.equal(persistenceMethods.saveProgress.call({ persistenceDisabled: true }), false, "editor tests must not write a gameplay save");
let exitSnapshotPublished = false;
const ignoredExitEngine = {
  ignoreRegionExit: true,
  exitPromptCooldown: 0,
  exitPromptOpen: true,
  markRenderDirty() {},
  publishSnapshot() { exitSnapshotPublished = true; },
};
regionMethods.updateRegionExit.call(ignoredExitEngine, 0.016);
assert.equal(ignoredExitEngine.exitPromptOpen, false);
assert.equal(exitSnapshotPublished, true, "prefab tests must clear any stale runtime exit prompt");

assert.ok(PREFAB_PROPERTY_SCHEMA.every((field) => field.description), "every prefab property must explain itself");
for (const layer of ["objects", "foliage", "decals", "monsters", "npcs", "chests"]) {
  const entry = prefabTestSource[layer]?.[0] ?? {};
  const fields = schemaForLayer(layer, { entry, document: prefabTestSource, catalog });
  assert.ok(fields.length > 0 && fields.every((field) => field.description), `${layer} properties must all have help text`);
}
const objectFields = schemaForLayer("objects", { entry: { id: "scarecrow" }, document: prefabTestSource, catalog });
assert.equal(objectFields.find((field) => field.key === "blocking")?.defaultValue, true, "blocking must display the runtime default instead of looking unchecked");
assert.ok(objectFields.find((field) => field.key === "id")?.options.some((option) => option.value === "scarecrow"), "object ids must come from runtime config");
assert.deepEqual(objectFields.find((field) => field.key === "spawnDamage")?.options, ["all", "damaged", "destroyed", "damaged_destroyed"]);
const foliageFields = schemaForLayer("foliage", { entry: { fileName: "foilage/foilage_plants_mainland.png" }, document: prefabTestSource, catalog });
assert.equal(foliageFields.find((field) => field.key === "lootTables")?.type, "multiselect", "file-based foliage must expose per-entry loot tables");
assert.ok(foliageFields.find((field) => field.key === "lootTables")?.options.some((option) => option.value === "material_plant"));
const decayFields = schemaForLayer("decals", { entry: { decayId: "decay_blood" }, document: prefabTestSource, catalog });
assert.deepEqual(decayFields.find((field) => field.key === "projection")?.options, ["topdown", "iso"]);
const removableFieldSource = { ...prefabTestSource, objects: [{ ...prefabTestSource.objects[0], actionId: "place_scarecrow" }] };
const fieldRemoved = updateEntity(removableFieldSource, { layer: "objects", index: 0 }, { actionId: undefined });
assert.equal("actionId" in fieldRemoved.objects[0], false, "clearing an optional dropdown must remove its runtime override");

const directImported = importHandwrittenPrefab(shorthand, "legacy_copy_two");
assert.equal(directImported.tiles, undefined);
assert.equal(directImported.legend, undefined);

console.log("[area-editor] OK", {
  documents: true,
  generatedOpen: true,
  shorthandImportDirectArrays: true,
  unknownProperties: true,
  history: true,
  coordinates: true,
  resizing: true,
  apiSafety: true,
  deterministicSources: true,
  registryKeys: true,
  productionGuards: true,
  playableTests: true,
});
