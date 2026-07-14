import { normalizePrefabContent } from "../prefabs/prefab-normalization.js";
import { normalizePrefabGround } from "../prefabs/prefab-ground-overrides.js";

export const BLUEPRINT_SCHEMA_VERSION = 1;
export const BLUEPRINT_ENTITY_LAYERS = Object.freeze(["objects", "foliage", "decals", "monsters", "npcs", "chests"]);

const clone = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));

function normalizeRows(rows, w, h, fallback = null) {
  return Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => clone(rows?.[y]?.[x] ?? fallback)));
}

export function normalizeAreaBlueprint(input = {}) {
  const w = Math.max(1, Math.floor(Number(input.w ?? input.width) || 1));
  const h = Math.max(1, Math.floor(Number(input.h ?? input.height) || 1));
  const content = normalizePrefabContent(input);
  const ground = normalizePrefabGround(input.ground) ?? { palette: [], rows: [] };
  const water = input.water && typeof input.water === "object" && !Array.isArray(input.water) ? input.water : {};
  const maskRows = input.playableMask?.rows ?? input.mask?.rows ?? input.playableMask ?? input.mask;
  const normalized = {
    ...clone(input),
    documentType: "blueprint",
    schemaVersion: Math.max(1, Math.floor(Number(input.schemaVersion) || BLUEPRINT_SCHEMA_VERSION)),
    id: String(input.id ?? "").trim(),
    label: String(input.label ?? input.id ?? "Blueprint"),
    w,
    h,
    editor: { ...(clone(input.editor) ?? {}), managed: input.editor?.managed === true },
    playableMask: { ...(clone(input.playableMask) ?? {}), rows: normalizeRows(maskRows, w, h, false).map((row) => row.map(Boolean)) },
    ground: { ...ground, palette: (ground.palette ?? []).map((entry) => entry ? { ...entry } : entry), rows: normalizeRows(ground.rows, w, h) },
    water: { ...clone(water), palette: (water.palette ?? []).map((entry) => entry ? { ...entry } : entry), rows: normalizeRows(water.rows, w, h) },
    start: input.start ? { x: Number(input.start.x), y: Number(input.start.y) } : null,
    exits: Array.isArray(input.exits) ? input.exits.map((entry, index) => ({ ...clone(entry), id: String(entry?.id ?? (index === 0 ? "primary" : `exit_${index + 1}`)), x: Number(entry?.x), y: Number(entry?.y), primary: index === 0 || entry?.primary === true })) : [],
    reservedCells: Array.isArray(input.reservedCells) ? input.reservedCells.map((entry) => ({ x: Number(entry?.x), y: Number(entry?.y) })) : [],
    ...Object.fromEntries(BLUEPRINT_ENTITY_LAYERS.map((layer) => [layer, clone(content[layer] ?? [])])),
    prefabs: Array.isArray(input.prefabs) ? clone(input.prefabs) : [],
  };
  delete normalized.tiles;
  delete normalized.legend;
  delete normalized.mask;
  return normalized;
}

export function serializeAreaBlueprint(input) {
  const normalized = normalizeAreaBlueprint(input);
  normalized.editor = { ...(clone(input?.editor) ?? {}), ...normalized.editor, managed: true };
  return clone(normalized);
}

export function blueprintCellIsPlayable(blueprint, x, y) {
  return blueprint?.playableMask?.rows?.[y]?.[x] === true;
}
