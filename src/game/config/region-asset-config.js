import { RESOURCE_DEFS } from "./resource-config.js";
import { normalizeParticleConfigs } from "./particle-presets.js";

const GENERATED_ASSET_PREFIX = "/assets/generated/";
const DEFAULT_GROUND_GRID = 4;
const DEFAULT_WATER_GRID = 4;

const DEFAULT_FOLIAGE_GRID = 4;
const LEGACY_FOLIAGE_GRID = 8;

function clampInt(value, min, max) {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed)) return null;
  return Math.min(max, Math.max(min, parsed));
}

function clampNumber(value, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeDepthMode(value, fallback = "ground") {
  const mode = String(value ?? fallback).trim();
  return ["ground", "dynamic", "alwaysBehind", "alwaysFront"].includes(mode) ? mode : fallback;
}

function normalizeSortAnchor(value) {
  if (!value || typeof value !== "object") return null;
  const x = clampNumber(value.x, 0, 1);
  const y = clampNumber(value.y, 0, 1);
  if (x === null && y === null) return null;
  return {
    x: x ?? 0.5,
    y: y ?? 1,
  };
}

function normalizeFileName(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (raw.startsWith(GENERATED_ASSET_PREFIX)) {
    return raw.slice(GENERATED_ASSET_PREFIX.length);
  }
  if (raw.startsWith("/")) return raw.slice(1);
  return raw;
}

function toSpecObject(value) {
  if (!value) return null;
  if (typeof value === "string") return { fileName: value };
  if (typeof value === "object") return value;
  return null;
}

function buildGroundSheetId(fileName) {
  return `ground-custom:${String(fileName).toLowerCase()}`;
}

function buildWaterSheetId(fileName) {
  return `water-custom:${String(fileName).toLowerCase()}`;
}

function buildFoliageSheetId(fileName, rows, cols) {
  return `foliage-custom:${String(fileName).toLowerCase()}:${rows}x${cols}`;
}

function resolveLockedTileVariant(tileset, grid = DEFAULT_GROUND_GRID) {
  if (!tileset) return null;
  const x = clampInt(tileset.x, 1, grid);
  const y = clampInt(tileset.y, 1, grid);
  if (!x || !y) return null;
  return (y - 1) * grid + (x - 1);
}

function normalizeAxisSelection(value, grid = DEFAULT_WATER_GRID) {
  const values = toArray(value)
    .map((entry) => clampInt(entry, 1, grid))
    .filter(Boolean);
  return values.length ? [...new Set(values)] : null;
}

function variantsFromAxisSelection(xSelection, ySelection, grid = DEFAULT_WATER_GRID) {
  const xs = xSelection?.length ? xSelection : Array.from({ length: grid }, (_, index) => index + 1);
  const ys = ySelection?.length ? ySelection : Array.from({ length: grid }, (_, index) => index + 1);
  const variants = [];
  for (const y of ys) {
    for (const x of xs) {
      variants.push((y - 1) * grid + (x - 1));
    }
  }
  return variants;
}

function normalizeResourceDropEntry(resourceId, value) {
  const raw = value && typeof value === "object" && !Array.isArray(value)
    ? value
    : { chance: value };
  const id = String(raw.resource ?? raw.resourceId ?? resourceId ?? "").trim();
  if (!id || !RESOURCE_DEFS[id]) return null;

  const chance = clampNumber(raw.chance ?? raw.dropChance ?? 1, 0, 1);
  if (!chance) return null;

  const min = clampInt(raw.min ?? raw.count ?? raw.amount ?? 1, 1, 9999) ?? 1;
  const max = clampInt(raw.max ?? raw.count ?? raw.amount ?? min, min, 9999) ?? min;
  return { resource: id, chance, min, max };
}

function normalizeResourceDrops(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeResourceDropEntry(null, entry))
      .filter(Boolean);
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([resourceId, entry]) => normalizeResourceDropEntry(resourceId, entry))
      .filter(Boolean);
  }
  return [];
}

function normalizeRegionTilesetEntry(tilesetInput) {
  const raw = toSpecObject(tilesetInput);
  if (!raw) return null;
  const fileName = normalizeFileName(raw.fileName ?? raw.png ?? raw.src);
  if (!fileName) return null;
  const lockedVariant = resolveLockedTileVariant(raw, DEFAULT_GROUND_GRID);
  return {
    fileName,
    sheetId: buildGroundSheetId(fileName),
    x: clampInt(raw.x, 1, DEFAULT_GROUND_GRID),
    y: clampInt(raw.y, 1, DEFAULT_GROUND_GRID),
    lockedVariant,
    variantCount: DEFAULT_GROUND_GRID * DEFAULT_GROUND_GRID,
  };
}

export function normalizeRegionTileset(tilesetInput) {
  if (!tilesetInput) return null;
  if (Array.isArray(tilesetInput)) {
    const entries = tilesetInput.map((t) => normalizeRegionTilesetEntry(t)).filter(Boolean);
    return entries.length ? entries : null;
  }
  return normalizeRegionTilesetEntry(tilesetInput);
}

function normalizeWaterEntry(entry) {
  const raw = toSpecObject(entry);
  if (!raw) return null;
  const fileName = normalizeFileName(raw.fileName ?? raw.png ?? raw.src);
  if (!fileName) return null;
  const parsedWeight = Number(raw.weight);
  const weight = Number.isFinite(parsedWeight) ? Math.max(0, parsedWeight) : 1;
  const x = normalizeAxisSelection(raw.x, DEFAULT_WATER_GRID);
  const y = normalizeAxisSelection(raw.y, DEFAULT_WATER_GRID);
  return {
    fileName,
    weight,
    sheetId: buildWaterSheetId(fileName),
    x,
    y,
    variants: variantsFromAxisSelection(x, y, DEFAULT_WATER_GRID),
    variantCount: DEFAULT_WATER_GRID * DEFAULT_WATER_GRID,
  };
}

export function normalizeRegionWaterSets(regionConfig = {}) {
  const explicit = toArray(regionConfig.water ?? regionConfig.waterSets ?? regionConfig.waterSet);
  const normalized = explicit
    .map((entry) => normalizeWaterEntry(entry))
    .filter(Boolean);
  const deduped = [];
  const seen = new Set();
  for (const entry of normalized) {
    const key = `${entry.sheetId}|${entry.weight}|${JSON.stringify(entry.x)}|${JSON.stringify(entry.y)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(entry);
  }
  return deduped;
}

function normalizeFoliageEntry(entry, defaults = {}) {
  const raw = toSpecObject(entry);
  if (!raw) return null;
  const fileName = normalizeFileName(raw.fileName ?? raw.png ?? raw.src);
  if (!fileName) return null;
  const rows = clampInt(raw.rows, 1, 16) ?? defaults.rows ?? DEFAULT_FOLIAGE_GRID;
  const cols = clampInt(raw.cols, 1, 16) ?? defaults.cols ?? DEFAULT_FOLIAGE_GRID;
  const parsedWeight = Number(raw.weight);
  const weight = Number.isFinite(parsedWeight) ? Math.max(0, parsedWeight) : 1;
  const parsedScale = Number(raw.scale);
  const scale = Number.isFinite(parsedScale) && parsedScale > 0 ? parsedScale : null;
  return {
    fileName,
    weight,
    scale,
    rows,
    cols,
    variantCount: rows * cols,
    sheetId: buildFoliageSheetId(fileName, rows, cols),
    resourceDrops: normalizeResourceDrops(raw.resourceDrops ?? raw.resourceDrop),
    particles: normalizeParticleConfigs(raw.particles),
    depthMode: normalizeDepthMode(raw.depthMode, "ground"),
    sortAnchor: normalizeSortAnchor(raw.sortAnchor),
    depthOffset: Number.isFinite(Number(raw.depthOffset)) ? Number(raw.depthOffset) : 0,
  };
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function normalizeRegionFoliageSets(regionConfig = {}) {
  const explicit = toArray(
    regionConfig.foliageSets
    ?? regionConfig.foliageSet
    ?? regionConfig.foilageSets
    ?? regionConfig.foilageSet,
  );
  const defaults = regionConfig.foliageGrid === "legacy-8x8"
    ? { rows: LEGACY_FOLIAGE_GRID, cols: LEGACY_FOLIAGE_GRID }
    : { rows: DEFAULT_FOLIAGE_GRID, cols: DEFAULT_FOLIAGE_GRID };

  const normalized = explicit
    .map((entry) => normalizeFoliageEntry(entry, defaults))
    .filter(Boolean);

  const deduped = [];
  const seen = new Set();
  for (const entry of normalized) {
    const key = `${entry.sheetId}|${entry.weight}|${entry.scale ?? ""}|${JSON.stringify(entry.resourceDrops)}|${JSON.stringify(entry.particles)}|${entry.depthMode}|${JSON.stringify(entry.sortAnchor)}|${entry.depthOffset}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(entry);
  }
  return deduped;
}

export function collectRegionAssetOverrides(mapRegionSets) {
  const groundSheets = [];
  const waterSheets = [];
  const foliageSheets = [];
  const seenGround = new Set();
  const seenWater = new Set();
  const seenFoliage = new Set();

  for (const regions of Object.values(mapRegionSets ?? {})) {
    if (!Array.isArray(regions)) continue;
    for (const region of regions) {
      const tileset = normalizeRegionTileset(region?.tileset);
      const tiles = Array.isArray(tileset) ? tileset : (tileset ? [tileset] : []);
      for (const t of tiles) {
        if (!t || seenGround.has(t.sheetId)) continue;
        seenGround.add(t.sheetId);
        groundSheets.push({
          sheetId: t.sheetId,
          fileName: t.fileName,
        });
      }

      const waterSets = normalizeRegionWaterSets(region ?? {});
      for (const set of waterSets) {
        if (seenWater.has(set.sheetId)) continue;
        seenWater.add(set.sheetId);
        waterSheets.push({
          sheetId: set.sheetId,
          fileName: set.fileName,
        });
      }

      const sets = normalizeRegionFoliageSets(region ?? {});
      for (const set of sets) {
        if (seenFoliage.has(set.sheetId)) continue;
        seenFoliage.add(set.sheetId);
        foliageSheets.push({
          sheetId: set.sheetId,
          fileName: set.fileName,
          rows: set.rows,
          cols: set.cols,
        });
      }
    }
  }

  return { groundSheets, waterSheets, foliageSheets };
}
