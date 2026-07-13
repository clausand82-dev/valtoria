import { normalizeRegionTileset } from "../../config/region-asset-config.js";
import { transformPrefabPoint } from "./prefab-transforms.js";

export function normalizePrefabGround(ground) {
  if (!ground || typeof ground !== "object" || Array.isArray(ground)) return null;
  const palette = (Array.isArray(ground.palette) ? ground.palette : []).map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const normalized = normalizeRegionTileset({ ...entry, x: undefined, y: undefined });
    if (!normalized || Array.isArray(normalized)) return null;
    return {
      ...entry,
      fileName: normalized.fileName,
      variant: Number.isInteger(entry.variant) ? entry.variant : Number(entry.variant),
      sheetId: normalized.sheetId,
      variantCount: normalized.variantCount,
      sourceInset: normalized.sourceInset,
      edgeFeather: normalized.edgeFeather,
      textureAlpha: normalized.textureAlpha,
      visualScale: normalized.visualScale,
      baseAlpha: normalized.baseAlpha,
    };
  });
  const rows = Array.isArray(ground.rows)
    ? ground.rows.map((row) => (Array.isArray(row) ? [...row] : row))
    : [];
  return { ...ground, palette, rows };
}

export function prefabGroundEntries(prefab, rotation = 0, mirrored = false) {
  const ground = normalizePrefabGround(prefab?.ground);
  if (!ground) return [];
  const entries = [];
  for (let y = 0; y < ground.rows.length; y += 1) {
    const row = ground.rows[y];
    if (!Array.isArray(row)) continue;
    for (let x = 0; x < row.length; x += 1) {
      const paletteIndex = row[x];
      if (paletteIndex === null || paletteIndex === undefined) continue;
      const paletteEntry = ground.palette[paletteIndex];
      if (!paletteEntry) continue;
      const point = transformPrefabPoint(x, y, prefab.w, prefab.h, rotation, mirrored);
      entries.push({
        x: point.x,
        y: point.y,
        paletteIndex,
        fileName: paletteEntry.fileName,
        groundSheetId: paletteEntry.sheetId,
        variant: paletteEntry.variant,
      });
    }
  }
  return entries;
}

export function collectPrefabGroundSpecs(prefabs = []) {
  const specs = new Map();
  for (const prefab of prefabs) {
    const ground = normalizePrefabGround(prefab?.ground);
    for (const entry of ground?.palette ?? []) {
      if (!entry?.sheetId || specs.has(entry.sheetId)) continue;
      specs.set(entry.sheetId, {
        sheetId: entry.sheetId,
        fileName: entry.fileName,
        sourceInset: entry.sourceInset,
        edgeFeather: entry.edgeFeather,
        textureAlpha: entry.textureAlpha,
        visualScale: entry.visualScale,
        baseAlpha: entry.baseAlpha,
      });
    }
  }
  return [...specs.values()];
}

export function buildPrefabGroundOverrideMap(instances = []) {
  const overrides = new Map();
  for (const instance of instances) {
    for (const entry of instance?.ground ?? []) {
      overrides.set(`${instance.x + entry.x},${instance.y + entry.y}`, {
        groundSheetId: entry.groundSheetId,
        variant: entry.variant,
        prefabId: instance.id,
        prefabInstanceId: instance.instanceId,
      });
    }
  }
  return overrides;
}

export function prefabGroundOverrideAt(region, x, y) {
  return region?.prefabGroundOverrides?.get(`${Math.floor(x)},${Math.floor(y)}`) ?? null;
}

export function applyPrefabGroundOverride(tile, override) {
  if (!override) return tile;
  tile.groundSheetId = override.groundSheetId;
  tile.variant = override.variant;
  tile.prefabGroundOverride = true;
  return tile;
}
