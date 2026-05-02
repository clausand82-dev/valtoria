const GENERATED_ASSET_PREFIX = "/assets/generated/";
const DEFAULT_GROUND_GRID = 4;
const DEFAULT_FOLIAGE_GRID = 4;
const LEGACY_FOLIAGE_GRID = 8;

function clampInt(value, min, max) {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed)) return null;
  return Math.min(max, Math.max(min, parsed));
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

export function normalizeRegionTileset(tilesetInput) {
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

function normalizeFoliageEntry(entry, defaults = {}) {
  const raw = toSpecObject(entry);
  if (!raw) return null;
  const fileName = normalizeFileName(raw.fileName ?? raw.png ?? raw.src);
  if (!fileName) return null;
  const rows = clampInt(raw.rows, 1, 16) ?? defaults.rows ?? DEFAULT_FOLIAGE_GRID;
  const cols = clampInt(raw.cols, 1, 16) ?? defaults.cols ?? DEFAULT_FOLIAGE_GRID;
  return {
    fileName,
    rows,
    cols,
    variantCount: rows * cols,
    sheetId: buildFoliageSheetId(fileName, rows, cols),
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
    if (seen.has(entry.sheetId)) continue;
    seen.add(entry.sheetId);
    deduped.push(entry);
  }
  return deduped;
}

export function collectRegionAssetOverrides(mapRegionSets) {
  const groundSheets = [];
  const foliageSheets = [];
  const seenGround = new Set();
  const seenFoliage = new Set();

  for (const regions of Object.values(mapRegionSets ?? {})) {
    if (!Array.isArray(regions)) continue;
    for (const region of regions) {
      const tileset = normalizeRegionTileset(region?.tileset);
      if (tileset && !seenGround.has(tileset.sheetId)) {
        seenGround.add(tileset.sheetId);
        groundSheets.push({
          sheetId: tileset.sheetId,
          fileName: tileset.fileName,
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

  return { groundSheets, foliageSheets };
}
