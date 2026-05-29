import { normalizeParticleConfigs } from "./particle-presets.js";

const DEFAULT_DECAY_GRID = 4;
const DEFAULT_DECAY_PROJECTION = "topdown";
const DECAY_PROJECTIONS = new Set(["topdown", "iso"]);
const DECAY_BLEND_MODES = new Set([
  "source-over",
  "multiply",
  "overlay",
  "soft-light",
  "darken",
  "screen",
  "lighter",
]);

// topdown = source is painted from above and is squeezed into the iso ground footprint.
// iso = source is already painted in iso perspective and must not be squeezed again.

export const DECAY_SET_DEFS = {
  decay_spiderweb: {
    fileName: "decay/decay_spiderweb.png",
    rows: 4,
    cols: 4,
    renderScale: 1,
    projection: "topdown",
  },
  decay_cracks: {
    fileName: "decay/decay_cracks.png",
    rows: 4,
    cols: 4,
    renderScale: 1,
    projection: "topdown",
  },
  decay_dust: {
    fileName: "decay/decay_dust.png",
    rows: 4,
    cols: 4,
    renderScale: 1,
    projection: "topdown",
  },
  decay_blood: {
    fileName: "decay/decay_blood.png",
    rows: 4,
    cols: 4,
    renderScale: 1,
    projection: "topdown",
  },
  decay_field: {
    fileName: "decay/decay_field.png",
    rows: 4,
    cols: 4,
    renderScale: 1,
    projection: "topdown",
  },
  decay_basement: {
    fileName: "decay/decay_basement.png",
    rows: 4,
    cols: 4,
    renderScale: 1,
    projection: "topdown",
  },
    decay_food: {
    fileName: "decay/decay_food.png",
    rows: 4,
    cols: 4,
    renderScale: 1,
    projection: "iso",
    blendMode: "multiply",
  },
};

// Example for a future iso-painted sheet. Keep inactive until the asset exists:
// decay_dust_iso: {
//   fileName: "decay/decay_dust_iso.png",
//   rows: 4,
//   cols: 4,
//   renderScale: 1,
//   projection: "iso",
// },

export function buildDecaySheetId(decayId) {
  return `decay:${String(decayId ?? "").trim().toLowerCase()}`;
}

function parsePositiveInt(value) {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseWeight(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}

export function normalizeDecayProjection(value) {
  const normalized = String(value ?? DEFAULT_DECAY_PROJECTION).trim().toLowerCase();
  return DECAY_PROJECTIONS.has(normalized) ? normalized : DEFAULT_DECAY_PROJECTION;
}

function parseFiniteNumber(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseOptionalFiniteNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDecayBlendMode(value) {
  const normalized = String(value ?? "source-over").trim().toLowerCase();
  return DECAY_BLEND_MODES.has(normalized) ? normalized : "source-over";
}

export function normalizeDecayRenderConfig(def = {}) {
  const projection = normalizeDecayProjection(def.projection ?? def.sourceProjection);
  return {
    renderScale: parseFiniteNumber(def.renderScale, 1),
    projection,
    blendMode: normalizeDecayBlendMode(def.blendMode ?? def.compositeOperation),
    rotation: parseOptionalFiniteNumber(def.rotation),
    randomRotation: def.randomRotation ?? projection === "topdown",
    widthScale: parseFiniteNumber(def.widthScale, 1),
    heightScale: parseFiniteNumber(def.heightScale, 1),
    offsetX: parseFiniteNumber(def.offsetX, 0),
    offsetY: parseFiniteNumber(def.offsetY, 0),
    anchorX: parseFiniteNumber(def.anchorX, 0.5),
    anchorY: parseFiniteNumber(def.anchorY, 0.5),
    alpha: parseOptionalFiniteNumber(def.alpha),
  };
}

function toArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeAxisSelection(raw, max) {
  const values = toArray(raw)
    .map((entry) => parsePositiveInt(entry))
    .filter((entry) => entry !== null)
    .map((entry) => Math.max(1, Math.min(max, entry)));
  if (!values.length) {
    return Array.from({ length: max }, (_, index) => index + 1);
  }
  return [...new Set(values)].sort((a, b) => a - b);
}

function variantsFromAxisSelection(xs, ys, cols) {
  const variants = [];
  for (const y of ys) {
    for (const x of xs) {
      variants.push((y - 1) * cols + (x - 1));
    }
  }
  return variants;
}

function normalizeDecayEntry(entry) {
  if (!entry) return null;
  const id = typeof entry === "string"
    ? String(entry).trim()
    : String(entry.id ?? entry.decayId ?? "").trim();
  if (!id) return null;

  const def = DECAY_SET_DEFS[id];
  if (!def) return null;

  const rows = parsePositiveInt(def.rows) ?? DEFAULT_DECAY_GRID;
  const cols = parsePositiveInt(def.cols) ?? DEFAULT_DECAY_GRID;
  const xs = normalizeAxisSelection(typeof entry === "object" ? entry.x : undefined, cols);
  const ys = normalizeAxisSelection(typeof entry === "object" ? entry.y : undefined, rows);
  const variants = variantsFromAxisSelection(xs, ys, cols);
  if (!variants.length) return null;

  const weight = typeof entry === "object"
    ? parseWeight(entry.weight) || 1
    : 1;

  return {
    id,
    weight,
    fileName: def.fileName,
    rows,
    cols,
    ...normalizeDecayRenderConfig(def),
    sheetId: buildDecaySheetId(id),
    variants,
    particles: normalizeParticleConfigs(typeof entry === "object" ? entry.particles : def.particles),
  };
}

export function normalizeRegionDecaySets(regionConfig = {}) {
  const raw = regionConfig.decay;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const normalized = [];
  for (const entry of list) {
    const parsed = normalizeDecayEntry(entry);
    if (!parsed) continue;
    normalized.push(parsed);
  }
  return normalized;
}
