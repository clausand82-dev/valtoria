import assert from "node:assert/strict";

import { mergeBlueprintRegistries } from "../src/game/config/blueprint-registry.js";
import { AREA_BLUEPRINTS } from "../src/game/config/area-blueprint-config.js";
import { createChunk, createProceduralRegion, createRegion, isRegionWaterTile } from "../src/game/world.js";
import { normalizeAreaBlueprint, serializeAreaBlueprint } from "../src/game/world/blueprints/blueprint-normalization.js";
import { applyBlueprintToRegion } from "../src/game/world/blueprints/blueprint-region-builder.js";
import { resolveRegionBlueprint } from "../src/game/world/blueprints/blueprint-resolver.js";
import { blueprintConnectivity, validateAreaBlueprint } from "../src/game/world/blueprints/blueprint-validation.js";
import { applyEditorBrushStroke } from "../src/dev/area-editor/editor-tools.js";
import { createBlueprintEditorDocument } from "../src/dev/area-editor/editor-document.js";
import { commitEditorHistory, createEditorHistory, undoEditorHistory } from "../src/dev/area-editor/editor-history.js";
import { validateAreaEditorLocalRequest, validateGeneratedBlueprint } from "./area-editor-dev-plugin.js";
import { buildRegionConditionPreview } from "../src/dev/area-editor/condition-preview.js";
import { worldEntryAllowed } from "../src/game/world-state.js";

function blueprint(overrides = {}) {
  const w = overrides.w ?? 8; const h = overrides.h ?? 6;
  return createBlueprintEditorDocument({
    id: "test_area", label: "Test area", w, h,
    playableMask: { rows: Array.from({ length: h }, () => Array(w).fill(true)) },
    ground: { palette: [{ fileName: "tileset/tileset_grass.png", variant: 3 }], rows: Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => x === 1 && y === 1 ? 0 : null)) },
    water: { palette: [{ fileName: "tileset/tileset_water.png", variant: 2 }], rows: Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => x === 3 && y === 3 ? 0 : null)) },
    start: { x: 0, y: h - 1 }, exits: [{ id: "primary", x: w - 1, y: 0, primary: true }], reservedCells: [{ x: 2, y: 2 }],
    objects: [{ id: "scarecrow", x: 1, y: 2, customFutureField: { kept: true } }], foliage: [{ id: "mainland", variant: 4, x: 2, y: 1 }], decals: [{ decayId: "decay_spiderweb", variant: 2, x: 3, y: 1 }], monsters: [{ type: "Spawn of Archnogrim", levelOffset: 2, x: 4, y: 2 }], npcs: [{ npcId: "grieving_mother", x: 5, y: 2 }], chests: [{ id: "basic_chest", x: 6, y: 2 }],
    editor: { managed: true, futureMetadata: { survives: true } }, ...overrides,
  });
}

const valid = blueprint();
assert.equal(validateAreaBlueprint(valid).valid, true);
assert.equal(validateAreaBlueprint({ ...valid, water: { palette: [], rows: [[]] } }).valid, false);
assert.throws(() => mergeBlueprintRegistries({ same: { id: "same" } }, { same: { id: "same" } }), /Duplicate blueprint/);

for (const [config, status] of [[{}, "no_candidates"], [{ blueprints: [] }, "empty_candidates"], [{ blueprints: [{ id: "test_area", flag: "never" }] }, "no_condition_match"]]) assert.equal(resolveRegionBlueprint(config, { flags: {} }, {}, { test_area: valid }).status, status);
const ordered = resolveRegionBlueprint({ blueprints: [{ id: "first", cityStat: { cityThreat: { gte: 50 } } }, { id: "second", cityStat: { cityThreat: { gte: 50 } } }] }, {}, { cityStats: { cityThreat: 75 } }, { first: { ...valid, id: "first" }, second: { ...valid, id: "second" } });
assert.equal(ordered.blueprint.id, "first"); assert.equal(ordered.index, 0);
assert.equal(resolveRegionBlueprint({ blueprints: [{ id: "test_area", cityStat: { cityThreat: 100 } }] }, {}, { cityStats: { cityThreat: 100 } }, { test_area: valid }).status, "selected");
assert.equal(resolveRegionBlueprint({ blueprints: [{ id: "test_area", cityStat: { cityThreat: { gte: 50, lt: 100 } } }] }, {}, { cityStats: { cityThreat: 65 } }, { test_area: valid }).status, "selected");
assert.equal(resolveRegionBlueprint({ blueprints: [{ id: "missing" }, { id: "test_area" }] }, {}, {}, { test_area: valid }).status, "unknown_blueprint");
assert.equal(resolveRegionBlueprint({ blueprints: [{ id: "bad" }] }, {}, {}, { bad: { id: "bad", w: 2, h: 2 } }).status, "invalid_blueprint");
assert.equal(resolveRegionBlueprint({ blueprints: [{ id: "bad", flag: "off" }, { id: "test_area" }] }, { flags: {} }, {}, { bad: {}, test_area: valid }).status, "selected");

const proceduralA = createProceduralRegion(3, 456789, null, { id: "plain", mapSize: "small", spawnCounts: {} });
const proceduralB = createRegion(3, 456789, null, { id: "plain", mapSize: "small", spawnCounts: {} });
assert.deepEqual({ width: proceduralB.width, height: proceduralB.height, start: proceduralB.start, end: proceduralB.end, mask: [...proceduralB.mask], layoutId: proceduralB.layoutId }, { width: proceduralA.width, height: proceduralA.height, start: proceduralA.start, end: proceduralA.end, mask: [...proceduralA.mask], layoutId: proceduralA.layoutId });
assert.equal(createRegion(3, 456789, null, { id: "empty", blueprints: [], spawnCounts: {} }).blueprint, undefined);

const built = applyBlueprintToRegion(createProceduralRegion(2, 91, null, { id: "runtime", spawnCounts: { objects: 4, monsters: { min: 2, max: 3 } } }), valid);
assert.equal(built.width, 8); assert.equal(built.height, 6); assert.equal(built.mask.size, 48); assert.equal(built.start.x, 0.5); assert.equal(built.end.x, 7.5); assert.equal(built.prefabInstances.length, 1); assert.equal(built.blueprintWaterOverrides.has("3,3"), true); assert.equal(built.prefabGroundOverrides.has("1,1"), true); assert.equal(built.reservedTiles.has("2,2"), true);
const chunk = createChunk(0, 0, built); assert.equal(chunk.tiles.some((tile) => tile.x === 3 && tile.y === 3 && tile.water), true); assert.equal(chunk.objects.some((entry) => entry.objectDefId === "scarecrow"), true); assert.equal(chunk.monsters.some((entry) => entry.typeName === "Spawn of Archnogrim" && entry.level >= 3), true); assert.equal(chunk.npcs.some((entry) => entry.npcId === "grieving_mother"), true);

const roundTrip = normalizeAreaBlueprint(JSON.parse(JSON.stringify(serializeAreaBlueprint(valid))));
assert.deepEqual(roundTrip.start, valid.start); assert.deepEqual(roundTrip.exits, valid.exits); assert.equal(roundTrip.ground.rows[1][1], 0); assert.equal(roundTrip.water.rows[3][3], 0); assert.equal(roundTrip.objects[0].customFutureField.kept, true); assert.equal(roundTrip.editor.futureMetadata.survives, true);
const unreachable = blueprint({ playableMask: { rows: Array.from({ length: 6 }, (_, y) => Array.from({ length: 8 }, (_, x) => (x < 2 && y > 3) || (x > 5 && y < 2))) } });
assert.equal(blueprintConnectivity(unreachable).unreachableExits.length, 1); assert.equal(validateAreaBlueprint(unreachable).valid, false);

const waterRows = (w, h, cells = []) => {
  const keys = new Set(cells.map(({ x, y }) => `${x},${y}`));
  return Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => keys.has(`${x},${y}`) ? 0 : null));
};
const waterLayer = (w, h, cells) => ({ palette: [{ fileName: "tileset/tileset_water.png", variant: 2 }], rows: waterRows(w, h, cells) });
const startOnWater = blueprint({ water: waterLayer(8, 6, [{ x: 0, y: 5 }]) });
assert.match(validateAreaBlueprint(startOnWater).errors.join("\n"), /start must not be on water/);
const exitOnWater = blueprint({ water: waterLayer(8, 6, [{ x: 7, y: 0 }]) });
assert.match(validateAreaBlueprint(exitOnWater).errors.join("\n"), /exits\[0\] must not be on water/);
const barrierCells = Array.from({ length: 6 }, (_, y) => ({ x: 3, y }));
const blockedByWater = blueprint({ start: { x: 1, y: 2 }, exits: [{ id: "primary", x: 6, y: 2, primary: true }], water: waterLayer(8, 6, barrierCells) });
assert.equal(blueprintConnectivity(blockedByWater).unreachableExits.length, 1);
assert.match(validateAreaBlueprint(blockedByWater).errors.join("\n"), /unreachable from start/);
const routeAroundWater = blueprint({ start: { x: 1, y: 2 }, exits: [{ id: "primary", x: 6, y: 2, primary: true }], water: waterLayer(8, 6, barrierCells.filter(({ y }) => y !== 3)) });
assert.equal(blueprintConnectivity(routeAroundWater).unreachableExits.length, 0);
const connectedWithoutWater = blueprint({ water: { palette: [], rows: waterRows(8, 6) } });
assert.equal(blueprintConnectivity(connectedWithoutWater).unreachableExits.length, 0);

const strokeStart = createBlueprintEditorDocument({ id: "stroke_test", w: 5, h: 5 }); const history = createEditorHistory(strokeStart);
const stroke = applyEditorBrushStroke(strokeStart, { layer: "ground", cells: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }], mode: "paint", asset: { fileName: "tileset/tileset_grass.png", variant: 2 } });
const committed = commitEditorHistory(history, stroke.document); assert.equal(committed.past.length, 1); assert.equal(committed.present.ground.rows[1].filter((cell) => cell !== null).length, 3); assert.deepEqual(undoEditorHistory(committed).present, strokeStart);
const entities = applyEditorBrushStroke(strokeStart, { layer: "objects", cells: [{ x: 1, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }], asset: { template: { id: "scarecrow" } } }); assert.equal(entities.document.objects.length, 2);

const localRequest = (host, origin, remoteAddress = "127.0.0.1") => ({ headers: { host, ...(origin ? { origin } : {}) }, socket: { remoteAddress } });
assert.equal(validateAreaEditorLocalRequest(localRequest("localhost:5173", "http://localhost:5173")), true);
assert.equal(validateAreaEditorLocalRequest(localRequest("[::1]:5173", "http://[::1]:5173", "::1")), true);
for (const request of [localRequest("evil.example:5173"), localRequest("localhost:5173", "http://evil.example:5173"), localRequest("localhost:5173", "http://localhost:9999"), localRequest("localhost:5173", null, "192.168.1.25")]) assert.throws(() => validateAreaEditorLocalRequest(request), (error) => error.statusCode === 403);
assert.equal(validateGeneratedBlueprint(valid).id, "test_area");

AREA_BLUEPRINTS.test_area = valid;
const selectedRuntime = createRegion(4, 321, null, { id: "selected", blueprints: [{ id: "test_area" }], spawnCounts: {} });
delete AREA_BLUEPRINTS.test_area;
assert.equal(selectedRuntime.blueprint.id, "test_area"); assert.equal(selectedRuntime.width, valid.w);

const proceduralWaterConfig = { id: "watery", water: [{ fileName: "tileset/tileset_water.png" }], spawnCounts: { water: 80 } };
const dry = blueprint({ id: "dry_area", water: { palette: [], rows: waterRows(8, 6) } });
let proceduralPhysicalCalls = 0;
const dryRuntime = createRegion(5, 87654, null, { ...proceduralWaterConfig, blueprints: [{ id: "dry_area" }] }, {
  blueprintRegistry: { dry_area: dry },
  proceduralFactory: () => { proceduralPhysicalCalls += 1; throw new Error("selected blueprint invoked procedural physical generation"); },
});
assert.equal(proceduralPhysicalCalls, 0);
assert.equal(createChunk(0, 0, dryRuntime).tiles.some((tile) => tile.water), false);
assert.equal(isRegionWaterTile(dryRuntime, 2, 2), false);
const wet = blueprint({ id: "wet_area", water: waterLayer(8, 6, [{ x: 3, y: 3 }]) });
const wetRuntime = createRegion(5, 87654, null, { ...proceduralWaterConfig, blueprints: [{ id: "wet_area" }] }, { blueprintRegistry: { wet_area: wet } });
assert.equal(createChunk(0, 0, wetRuntime).tiles.some((tile) => tile.x === 3 && tile.y === 3 && tile.water), true);
assert.equal(isRegionWaterTile(wetRuntime, 3, 3), true);
assert.equal(isRegionWaterTile(wetRuntime, 2, 2), false);
const proceduralWater = createProceduralRegion(5, 87654, null, proceduralWaterConfig);
assert.equal(Array.from({ length: proceduralWater.height }, (_, y) => Array.from({ length: proceduralWater.width }, (_, x) => isRegionWaterTile(proceduralWater, x, y))).flat().some(Boolean), true);

const previewRegion = { id: "condition_preview_region", corruptionLevel: 1 };
const corruptionPreview = buildRegionConditionPreview({}, { corruption: "7", activeQuests: "", completedQuests: "", flags: "", cityThreat: "" }, previewRegion);
assert.equal(corruptionPreview.worldState.values["region.condition_preview_region.corruptionLevel"], 7);
assert.equal(worldEntryAllowed({ corruption: { gte: 7 } }, corruptionPreview.worldState, corruptionPreview.context), true);
assert.equal(worldEntryAllowed({ corruption: { gt: 7 } }, corruptionPreview.worldState, corruptionPreview.context), false);

console.log("[area-blueprints] OK", { fallback: true, orderedConditions: true, builder: true, roundTrip: true, waterAwareConnectivity: true, authoritativeBlueprintWater: true, selectedSkipsProceduralPhysical: true, corruptionPreview: true, strokes: true, localApiGuard: true, runtimeSelection: true });
