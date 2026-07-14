import { PREFAB_CONTENT_LAYERS, normalizePrefabContent } from "../../game/world/prefabs/prefab-normalization.js";
import { normalizePrefabGround } from "../../game/world/prefabs/prefab-ground-overrides.js";
import { normalizeAreaBlueprint, serializeAreaBlueprint } from "../../game/world/blueprints/blueprint-normalization.js";

export const EDITOR_SCHEMA_VERSION = 1;
export const EDITOR_LAYERS = Object.freeze(["ground", "decals", "foliage", "objects", "monsters", "npcs", "chests"]);
export const BLUEPRINT_EDITOR_LAYERS = Object.freeze(["playableMask", "ground", "water", "start", "exits", "decals", "foliage", "objects", "monsters", "npcs", "chests"]);
export function editorLayersForDocument(document) { return document?.documentType === "blueprint" ? BLUEPRINT_EDITOR_LAYERS : EDITOR_LAYERS; }

export function cloneEditorValue(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

export function createEditorDocument(overrides = {}) {
  const w = Math.max(1, Math.floor(Number(overrides.w) || 12));
  const h = Math.max(1, Math.floor(Number(overrides.h) || 10));
  const id = String(overrides.id ?? "new_prefab").trim();
  return {
    ...cloneEditorValue(overrides),
    schemaVersion: EDITOR_SCHEMA_VERSION,
    documentType: "prefab",
    id,
    label: String(overrides.label ?? "New Prefab"),
    w,
    h,
    anchor: overrides.anchor ?? "room",
    rotate: Boolean(overrides.rotate),
    mirror: Boolean(overrides.mirror),
    clearArea: overrides.clearArea !== false,
    avoidStart: Math.max(0, Number(overrides.avoidStart) || 0),
    avoidExit: Math.max(0, Number(overrides.avoidExit) || 0),
    editor: {
      lastView: "isometric",
      zoom: 1,
      panX: 0,
      panY: 0,
      hiddenLayers: [],
      lockedLayers: [],
      ...(cloneEditorValue(overrides.editor) ?? {}),
      managed: true,
    },
    ground: normalizeGroundForSize(overrides.ground, w, h),
    ...Object.fromEntries(PREFAB_CONTENT_LAYERS.map((layer) => [layer, cloneEditorValue(overrides[layer] ?? [])])),
  };
}

export function createBlueprintEditorDocument(overrides = {}) {
  const w = Math.max(2, Math.floor(Number(overrides.w) || 24)); const h = Math.max(2, Math.floor(Number(overrides.h) || 18));
  const base = normalizeAreaBlueprint({
    ...cloneEditorValue(overrides), documentType: "blueprint", schemaVersion: EDITOR_SCHEMA_VERSION,
    id: String(overrides.id ?? "new_blueprint"), label: String(overrides.label ?? "New Full-area Blueprint"), w, h,
    playableMask: overrides.playableMask ?? { rows: Array.from({ length: h }, () => Array(w).fill(true)) },
    ground: overrides.ground ?? { palette: [], rows: Array.from({ length: h }, () => Array(w).fill(null)) },
    water: overrides.water ?? { palette: [], rows: Array.from({ length: h }, () => Array(w).fill(null)) },
    start: overrides.start ?? { x: 1, y: h - 2 }, exits: overrides.exits ?? [{ id: "primary", x: w - 2, y: 1, primary: true }],
    editor: { lastView: "isometric", zoom: 1, panX: 0, panY: 0, hiddenLayers: [], lockedLayers: [], ...(cloneEditorValue(overrides.editor) ?? {}), managed: true },
  });
  return { ...base, editor: { ...base.editor, managed: true } };
}

function normalizeGroundForSize(ground, w, h) {
  const normalized = normalizePrefabGround(ground) ?? { palette: [], rows: [] };
  const rows = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => normalized.rows?.[y]?.[x] ?? null));
  return { ...normalized, palette: (normalized.palette ?? []).filter(Boolean).map((entry) => ({ ...entry })), rows };
}

export function editorDocumentFromGenerated(prefab) {
  return createEditorDocument(prefab);
}

export function importHandwrittenPrefab(prefab, id) {
  const content = normalizePrefabContent(prefab);
  const copy = createEditorDocument({
    ...cloneEditorValue(prefab),
    ...cloneEditorValue(content),
    id,
    label: prefab?.label ? `${prefab.label} (Editor Copy)` : `${prefab?.id ?? "Prefab"} Copy`,
    editor: {
      ...(cloneEditorValue(prefab?.editor) ?? {}),
      managed: true,
      importedFrom: String(prefab?.id ?? ""),
      importedFromHandwritten: true,
    },
  });
  delete copy.tiles;
  delete copy.legend;
  return copy;
}

export function serializeEditorDocument(document) {
  const output = createEditorDocument(document);
  delete output.tiles;
  delete output.legend;
  output.editor = { ...(cloneEditorValue(document.editor) ?? {}), ...output.editor, managed: true };
  return cloneEditorValue(output);
}

export function resizeImpact(document, nextW, nextH) {
  const w = Math.max(1, Math.floor(Number(nextW) || 1));
  const h = Math.max(1, Math.floor(Number(nextH) || 1));
  let groundCells = 0;
  for (let y = 0; y < (document.ground?.rows?.length ?? 0); y += 1) {
    for (let x = 0; x < (document.ground?.rows?.[y]?.length ?? 0); x += 1) {
      if ((x >= w || y >= h) && document.ground.rows[y][x] !== null && document.ground.rows[y][x] !== undefined) groundCells += 1;
    }
  }
  const entities = PREFAB_CONTENT_LAYERS.reduce((count, layer) => count + (document[layer] ?? []).filter((entry) => Number(entry.x) >= w || Number(entry.y) >= h).length, 0);
  let maskCells = 0; let waterCells = 0; let markers = 0;
  if (document.documentType === "blueprint") {
    for (let y = 0; y < document.h; y += 1) for (let x = 0; x < document.w; x += 1) if (x >= w || y >= h) { if (document.playableMask?.rows?.[y]?.[x]) maskCells += 1; if (document.water?.rows?.[y]?.[x] !== null && document.water?.rows?.[y]?.[x] !== undefined) waterCells += 1; }
    markers = [document.start, ...(document.exits ?? [])].filter((entry) => entry && (entry.x >= w || entry.y >= h)).length;
  }
  return { w, h, groundCells, waterCells, maskCells, markers, entities, total: groundCells + waterCells + maskCells + markers + entities };
}

export function resizeEditorDocument(document, nextW, nextH) {
  const impact = resizeImpact(document, nextW, nextH);
  const next = cloneEditorValue(document);
  next.w = impact.w;
  next.h = impact.h;
  next.ground = normalizeGroundForSize(document.ground, impact.w, impact.h);
  if (document.documentType === "blueprint") {
    next.playableMask = { ...next.playableMask, rows: Array.from({ length: impact.h }, (_, y) => Array.from({ length: impact.w }, (_, x) => Boolean(document.playableMask?.rows?.[y]?.[x]))) };
    next.water = { ...next.water, rows: Array.from({ length: impact.h }, (_, y) => Array.from({ length: impact.w }, (_, x) => document.water?.rows?.[y]?.[x] ?? null)) };
    if (next.start && (next.start.x >= impact.w || next.start.y >= impact.h)) next.start = null;
    next.exits = (next.exits ?? []).filter((entry) => entry.x < impact.w && entry.y < impact.h);
  }
  for (const layer of PREFAB_CONTENT_LAYERS) next[layer] = (next[layer] ?? []).filter((entry) => Number(entry.x) < impact.w && Number(entry.y) < impact.h);
  return next;
}

export function editorDocumentFingerprint(document) {
  return JSON.stringify(document?.documentType === "blueprint" ? serializeAreaBlueprint(document) : serializeEditorDocument(document));
}
