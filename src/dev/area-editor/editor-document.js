import { PREFAB_CONTENT_LAYERS, normalizePrefabContent } from "../../game/world/prefabs/prefab-normalization.js";
import { normalizePrefabGround } from "../../game/world/prefabs/prefab-ground-overrides.js";

export const EDITOR_SCHEMA_VERSION = 1;
export const EDITOR_LAYERS = Object.freeze(["ground", "decals", "foliage", "objects", "monsters", "npcs", "chests"]);

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
  return { w, h, groundCells, entities, total: groundCells + entities };
}

export function resizeEditorDocument(document, nextW, nextH) {
  const impact = resizeImpact(document, nextW, nextH);
  const next = cloneEditorValue(document);
  next.w = impact.w;
  next.h = impact.h;
  next.ground = normalizeGroundForSize(document.ground, impact.w, impact.h);
  for (const layer of PREFAB_CONTENT_LAYERS) next[layer] = (next[layer] ?? []).filter((entry) => Number(entry.x) < impact.w && Number(entry.y) < impact.h);
  return next;
}

export function editorDocumentFingerprint(document) {
  return JSON.stringify(serializeEditorDocument(document));
}
