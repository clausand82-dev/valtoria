import { GROUND_SHEETS } from "../../game/config/asset-config.js";
import { OBJECT_SHEETS } from "../../game/config/asset-config.js";
import { REGION_OBJECT_DEFS, REGION_OBJECT_SHEETS } from "../../game/config/region-object-config.js";
import { PREFAB_CONTENT_LAYERS } from "../../game/world/prefabs/prefab-normalization.js";
import { normalizeAreaBlueprint, serializeAreaBlueprint } from "../../game/world/blueprints/blueprint-normalization.js";
import { EDITOR_FOLIAGE_ALIAS_FILES } from "./asset-catalog.js";
import { editorDocumentToRuntimePrefab } from "./prefab-document-adapter.js";

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function testId(document) {
  const suffix = String(document?.id ?? "document").toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "") || "document";
  return `editor_test_${suffix}`;
}

function occupiedPrefabCells(prefab) {
  const occupied = new Set();
  for (const layer of PREFAB_CONTENT_LAYERS) {
    for (const entry of prefab?.[layer] ?? []) {
      const x = Math.floor(Number(entry?.x));
      const y = Math.floor(Number(entry?.y));
      if (Number.isInteger(x) && Number.isInteger(y)) occupied.add(`${x},${y}`);
    }
  }
  return occupied;
}

export function firstPrefabTestCell(prefab, corner = "southwest", excluded = new Set()) {
  const w = Math.max(1, Math.floor(Number(prefab?.w) || 1));
  const h = Math.max(1, Math.floor(Number(prefab?.h) || 1));
  const occupied = occupiedPrefabCells(prefab);
  const ys = corner.includes("south")
    ? Array.from({ length: h }, (_, index) => h - 1 - index)
    : Array.from({ length: h }, (_, index) => index);
  const xs = corner.includes("west")
    ? Array.from({ length: w }, (_, index) => index)
    : Array.from({ length: w }, (_, index) => w - 1 - index);
  for (const y of ys) for (const x of xs) {
    const key = `${x},${y}`;
    if (!occupied.has(key) && !excluded.has(key)) return { x, y };
  }
  for (const y of ys) for (const x of xs) {
    const key = `${x},${y}`;
    if (!excluded.has(key)) return { x, y };
  }
  return { x: 0, y: Math.max(0, h - 1) };
}

function prefabAsTestBlueprint(document) {
  const prefab = editorDocumentToRuntimePrefab(document);
  const start = firstPrefabTestCell(prefab, "southwest");
  const exit = firstPrefabTestCell(prefab, "northeast", new Set([`${start.x},${start.y}`]));
  const w = Math.max(1, Math.floor(Number(prefab.w) || 1));
  const h = Math.max(1, Math.floor(Number(prefab.h) || 1));
  return normalizeAreaBlueprint({
    ...clone(prefab),
    id: testId(document),
    label: `${prefab.label ?? prefab.id} - prefab test`,
    w,
    h,
    playableMask: { rows: Array.from({ length: h }, () => Array(w).fill(true)) },
    water: { palette: [], rows: Array.from({ length: h }, () => Array(w).fill(null)) },
    start,
    // The builder requires an end anchor, but prefab tests deliberately ignore
    // automatic region-exit proximity and leave through the test toolbar.
    exits: [{ id: "test_only", ...exit, primary: true }],
    reservedCells: [],
  });
}

function blueprintForTest(document) {
  return normalizeAreaBlueprint({ ...serializeAreaBlueprint(document), id: testId(document) });
}

function fallbackTileset(blueprint) {
  const placed = (blueprint.ground?.palette ?? []).find((entry) => entry?.fileName);
  if (placed) return { ...placed };
  const mainland = GROUND_SHEETS.mainland;
  return typeof mainland === "string" ? mainland : { ...mainland };
}

function playtestFoliageSpecs(blueprint) {
  const specs = new Map();
  for (const entry of blueprint.foliage ?? []) {
    const id = String(entry?.id ?? "").trim();
    const fileName = EDITOR_FOLIAGE_ALIAS_FILES[id];
    if (!id || !fileName) continue;
    specs.set(id, { id, fileName, rows: 4, cols: 4 });
  }
  return [...specs.values()];
}

function objectGraphicsConfig(def) {
  const graphics = def?.graphics ?? {};
  const frameFiles = Array.isArray(graphics.frameFiles) ? graphics.frameFiles.filter(Boolean) : [];
  if (frameFiles.length) {
    return {
      frameFiles,
      animated: Boolean(graphics.animated),
      normalizeAnimation: graphics.normalizeAnimation,
      renderScale: Number.isFinite(Number(graphics.renderScale)) ? Number(graphics.renderScale) : 1,
    };
  }
  const files = (Array.isArray(graphics.files) ? graphics.files : [graphics.fileName ?? def?.graphicsRef])
    .map((entry) => String(entry ?? "").split(" (")[0].trim())
    .filter((entry) => /\.png$/i.test(entry));
  if (!files.length) return null;
  return {
    fileName: files[0],
    ...(files.length > 1 ? { files } : {}),
    rows: Math.max(1, Math.floor(Number(graphics.rows) || 4)),
    cols: Math.max(1, Math.floor(Number(graphics.cols) || 4)),
    frameCount: Number.isFinite(Number(graphics.frameCount)) ? Math.max(1, Math.floor(Number(graphics.frameCount))) : undefined,
    animated: Boolean(graphics.animated),
    normalizeAnimation: graphics.normalizeAnimation,
    renderScale: Number.isFinite(Number(graphics.renderScale)) ? Number(graphics.renderScale) : 1,
  };
}

function playtestObjectSheetSpecs(blueprint) {
  const specs = new Map();
  for (const entry of blueprint.objects ?? []) {
    const def = REGION_OBJECT_DEFS[entry?.id];
    const type = String(def?.spawnTypes?.[0]?.type ?? "").trim();
    if (!type || OBJECT_SHEETS[type] || REGION_OBJECT_SHEETS[type] || specs.has(type)) continue;
    const config = objectGraphicsConfig(def);
    if (config) specs.set(type, { type, biomeId: def.renderBiomeId ?? "default", config });
  }
  return [...specs.values()];
}

export function buildEditorPlaytest(document) {
  if (!document) throw new Error("A document is required for editor playtest.");
  const kind = document.documentType === "blueprint" ? "blueprint" : "prefab";
  const blueprint = kind === "blueprint" ? blueprintForTest(document) : prefabAsTestBlueprint(document);
  const regionConfig = {
    id: blueprint.id,
    label: `Editor test: ${document.label ?? document.id}`,
    areaMapId: "area_editor_test",
    mapSize: "small",
    tileset: fallbackTileset(blueprint),
    blueprints: [{ id: blueprint.id }],
    spawnCounts: { objects: 0, foliage: 0, decals: 0, water: 0, monsters: { min: 0, max: 0 } },
    mobs: [],
    ambientCritters: [],
    rareMobs: [],
    audio: {},
    __worldStateResolved: true,
    __conditionContext: { development: true, worldState: { flags: {}, values: {}, counters: {} } },
  };
  return {
    kind,
    label: document.label ?? document.id ?? "Editor test",
    documentId: document.id,
    blueprint,
    regionConfig,
    ignoreRegionExit: kind === "prefab",
    assetInput: {
      regionConfig,
      additionalPrefabs: [blueprint],
      additionalFoliageSpecs: playtestFoliageSpecs(blueprint),
      additionalObjectSheetSpecs: playtestObjectSheetSpecs(blueprint),
    },
  };
}
