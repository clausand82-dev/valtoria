const DEFAULT_DECAY_GRID = 4;

export const DECAY_SET_DEFS = {
  decay_spiderweb: {
    fileName: "decay/decay_spiderweb.png",
    rows: 4,
    cols: 4,
    renderScale: 1,
  },
  decay_cracks: {
    fileName: "decay/decay_cracks.png",
    rows: 4,
    cols: 4,
    renderScale: 1,
  },
  decay_dust: {
    fileName: "decay/decay_dust.png",
    rows: 4,
    cols: 4,
    renderScale: 1,
  },
    decay_field: {
    fileName: "decay/decay_field.png",
    rows: 4,
    cols: 4,
    renderScale: 1,
  },
    decay_basement: {
    fileName: "decay/decay_basement.png",
    rows: 4,
    cols: 4,
    renderScale: 1,
  },
};

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
    renderScale: Number.isFinite(Number(def.renderScale)) ? Number(def.renderScale) : 1,
    sheetId: buildDecaySheetId(id),
    variants,
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
