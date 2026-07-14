import assert from "node:assert/strict";

import { isAllowedLocalHostname, isAreaEditorAvailable } from "../src/app/dev-feature-guard.js";
import { createEditorDocument, editorDocumentFingerprint, importHandwrittenPrefab, resizeEditorDocument, resizeImpact, serializeEditorDocument } from "../src/dev/area-editor/editor-document.js";
import { createEditorHistory, commitEditorHistory, redoEditorHistory, undoEditorHistory } from "../src/dev/area-editor/editor-history.js";
import { gridToIsometric, gridToTopDown, isometricToGrid, topDownToGrid } from "../src/dev/area-editor/editor-renderer.js";
import { importPrefabAsCopy, openGeneratedPrefab } from "../src/dev/area-editor/prefab-document-adapter.js";
import { assetFrameStyle, buildAreaEditorAssetCatalog } from "../src/dev/area-editor/asset-catalog.js";
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
});
