import { GROUND_SHEETS, FOLIAGE_SHEETS } from "../../game/config/asset-config.js";
import { getRegionObjectFamily, REGION_OBJECT_DEFS, REGION_OBJECT_SHEETS } from "../../game/config/region-object-config.js";
import { OBJECT_SPAWN_TUNING } from "../../game/config/spawn-config.js";
import { DECAY_SET_DEFS, normalizeDecayRenderConfig } from "../../game/config/decay-config.js";
import { MONSTER_DEFS } from "../../game/config/monster-config.js";
import { QUEST_NPCS } from "../../game/config/npc-config.js";
import { MAP_REGION_SETS } from "../../game/config/map-region-config.js";
import { normalizeRegionFoliageSets, normalizeRegionTileset, normalizeRegionWaterSets } from "../../game/config/region-asset-config.js";

function generatedUrl(fileName) {
  const clean = String(fileName ?? "").split(" (")[0].replace(/^\/?assets\/generated\//, "");
  return clean ? `/assets/generated/${clean}` : null;
}

function objectPreview(def) {
  return def?.graphics?.files?.[0] ? generatedUrl(def.graphics.files[0])
    : def?.graphics?.fileName ? generatedUrl(def.graphics.fileName)
    : def?.graphicsRef ? generatedUrl(def.graphicsRef)
    : null;
}

// These legacy biome ids are still accepted by prefab runtime. Their original
// *_001 files no longer exist, so runtime falls back to the loaded regional
// 4x4 plant sheets. Resolve that same fallback explicitly for editor previews.
export const EDITOR_FOLIAGE_ALIAS_FILES = {
  mainland: "foilage/foilage_plants_mainland.png",
  snow: "foilage/foilage_plants_snow.png",
  lava: "foilage/foilage_plants_lava.png",
  rock: "foilage/foilage_plants_stone.png",
  jungle: "foilage/foilage_plants_jungle.png",
  desert: "foilage/foilage_plants_sand.png",
  bones: "foilage/foilage_bones.png",
};

function objectSheetConfig(id, def) {
  const runtimeType = def?.spawnTypes?.[0]?.type ?? id;
  return REGION_OBJECT_SHEETS[runtimeType]?.[def?.renderBiomeId]
    ?? REGION_OBJECT_SHEETS[runtimeType]?.default
    ?? REGION_OBJECT_SHEETS[runtimeType]?.mainland
    ?? null;
}

function runtimeObjectBaseScale(type) {
  return type === "building" ? 0.58
    : type === "ruin" ? 0.54
    : type === "crystal" ? 0.46
    : type === "firebeacon" ? 0.44
    : 0.4;
}

function objectPreviewFrames(id, def) {
  const config = objectSheetConfig(id, def);
  if (config?.frameFiles?.length) {
    return config.frameFiles.map((fileName, variant) => ({
      previewUrl: generatedUrl(fileName), rows: 1, cols: 1, variant, sourceVariant: 0,
    }));
  }
  const files = config?.files?.length ? config.files : config?.fileName ? [config.fileName] : [];
  const previewUrls = files.length ? files.map(generatedUrl) : [objectPreview(def)];
  const rows = Math.max(1, Number(config?.rows ?? def?.graphics?.rows) || 4);
  const cols = Math.max(1, Number(config?.cols ?? def?.graphics?.cols) || 4);
  const framesPerFile = Math.max(1, Number(config?.frameCount) || rows * cols);
  const sources = previewUrls.filter(Boolean);
  if (!sources.length) sources.push(null);
  return sources.flatMap((previewUrl, fileIndex) => Array.from({ length: framesPerFile }, (_, sourceVariant) => ({
    previewUrl, rows, cols, variant: fileIndex * framesPerFile + sourceVariant, sourceVariant,
  })));
}

export function staticMonsterFrame(sprite = {}) {
  const rows = Math.max(1, Number(sprite.rows) || 1);
  const cols = Math.max(1, Number(sprite.cols) || 1);
  const idle = sprite.sequences?.find((sequence) => sequence.name === "idle") ?? sprite.sequences?.[0];
  const row = Math.max(0, Math.min(rows - 1, Math.floor(Number(idle?.row) || 0)));
  const col = Math.max(0, Math.min(cols - 1, Math.floor(Number(idle?.colStart) || 0)));
  return { row, col, variant: row * cols + col, rows, cols };
}

export function buildAreaEditorAssetCatalog() {
  const regionConfigs = Object.values(MAP_REGION_SETS).flatMap((entries) => Array.isArray(entries) ? entries : []);
  const groundDefs = new Map(Object.entries(GROUND_SHEETS).map(([id, def]) => [def.fileName, { id, ...def }]));
  for (const region of regionConfigs) {
    const normalized = normalizeRegionTileset(region.tileset);
    for (const entry of Array.isArray(normalized) ? normalized : normalized ? [normalized] : []) groundDefs.set(entry.fileName, { id: entry.fileName, ...entry });
  }
  const ground = [...groundDefs.values()].flatMap((def) => Array.from({ length: def.variantCount ?? 16 }, (_, variant) => ({
    key: `ground:${def.fileName}:${variant}`, layer: "ground", kind: "ground", id: def.id, label: `${def.id} ${variant}`, category: "ground", tags: [def.id], fileName: def.fileName, variant, sourceVariant: variant, variantCount: def.variantCount ?? 16, rows: 4, cols: 4, sourceInset: def.sourceInset, edgeFeather: def.edgeFeather, textureAlpha: def.textureAlpha, visualScale: def.visualScale, baseAlpha: def.baseAlpha, projection: "isometric", previewUrl: generatedUrl(def.fileName), template: null,
  })));
  const waterDefs = new Map();
  for (const region of regionConfigs) for (const entry of normalizeRegionWaterSets(region)) waterDefs.set(entry.fileName, entry);
  const water = [...waterDefs.values()].flatMap((def) => (def.variants?.length ? def.variants : Array.from({ length: def.variantCount ?? 16 }, (_, i) => i)).map((variant) => ({
    key: `water:${def.fileName}:${variant}`, layer: "water", kind: "water", id: def.sheetId, label: `${def.fileName} ${variant}`, category: "water", tags: ["water"], fileName: def.fileName, variant, sourceVariant: variant, variantCount: def.variantCount ?? 16, rows: 4, cols: 4, previewUrl: generatedUrl(def.fileName), template: null,
  })));
  const foliageDefs = new Map(Object.entries(FOLIAGE_SHEETS).map(([id, value]) => [id, { id, value }]));
  const foliageFallbackUrl = generatedUrl(EDITOR_FOLIAGE_ALIAS_FILES.mainland);
  for (const region of regionConfigs) for (const entry of normalizeRegionFoliageSets(region)) foliageDefs.set(entry.sheetId, { id: entry.sheetId, value: entry });
  const foliage = [...foliageDefs.values()].flatMap(({ id, value }) => {
    const legacyAliasFile = typeof value === "string" ? EDITOR_FOLIAGE_ALIAS_FILES[id] : null;
    const fileName = legacyAliasFile ?? (typeof value === "string" ? value : value.fileName);
    const rows = legacyAliasFile ? 4 : typeof value === "string" ? 8 : value.rows ?? 8;
    const cols = legacyAliasFile ? 4 : typeof value === "string" ? 8 : value.cols ?? 8;
    const variantCount = legacyAliasFile ? rows * cols : typeof value === "string" ? 64 : value.variantCount ?? 64;
    const sheetRenderScale = Math.max(0.35, Math.min(1, Math.min(rows, cols) / 8));
    return Array.from({ length: variantCount }, (_, variant) => ({
      key: `foliage:${id}:${variant}`, layer: "foliage", kind: "foliage", id, label: `${id} ${variant}`, category: "foliage", tags: [id], fileName, variant, sourceVariant: variant, variantCount, rows, cols, previewUrl: generatedUrl(fileName), fallbackPreviewUrl: foliageFallbackUrl, previewScale: 0.38 * sheetRenderScale, anchorY: 0.74, offsetY: 12, depthMode: typeof value === "string" ? "ground" : value.depthMode ?? "ground", sortAnchor: typeof value === "string" ? { x: 0.5, y: 1 } : value.sortAnchor ?? { x: 0.5, y: 1 }, depthOffset: Number(value?.depthOffset) || 0, template: typeof value === "string" ? { id, variant } : { fileName, rows, cols, variant },
    }));
  });
  const objects = Object.entries(REGION_OBJECT_DEFS).flatMap(([id, def]) => {
    const frames = objectPreviewFrames(id, def);
    const variantCount = Math.max(1, frames.length);
    const renderScale = Number(objectSheetConfig(id, def)?.renderScale) || 1;
    const runtimeType = def?.spawnTypes?.[0]?.type ?? id;
    const tuning = OBJECT_SPAWN_TUNING[runtimeType] ?? OBJECT_SPAWN_TUNING[getRegionObjectFamily(runtimeType)] ?? OBJECT_SPAWN_TUNING.default;
    return frames.map((frame) => ({
      key: `objects:${id}:${frame.variant}`, layer: "objects", kind: "object", id, label: `${id} ${frame.variant}`, category: "objects", tags: def.tags ?? [], ...frame, variantCount, blocking: true, previewScale: runtimeObjectBaseScale(runtimeType) * renderScale, runtimeDefaultSize: Number(tuning?.sizeBase) || 1, anchorY: 1, offsetY: 12 + 24 * runtimeObjectBaseScale(runtimeType) * renderScale, depthMode: def.depthMode ?? "dynamic", sortAnchor: def.sortAnchor ?? { x: 0.5, y: 1 }, depthOffset: Number(def.depthOffset) || 0, template: { id, variant: frame.variant },
    }));
  });
  const decals = Object.entries(DECAY_SET_DEFS).flatMap(([id, def]) => {
    const rows = Math.max(1, Number(def.rows) || 4);
    const cols = Math.max(1, Number(def.cols) || 4);
    const variantCount = rows * cols;
    const renderConfig = normalizeDecayRenderConfig(def);
    const previewAlpha = renderConfig.alpha ?? (renderConfig.projection === "iso" ? 1 : 0.42);
    return Array.from({ length: variantCount }, (_, variant) => ({
      key: `decals:${id}:${variant}`, layer: "decals", kind: "decal", id, label: `${id} ${variant}`, category: "decals", tags: [renderConfig.projection], variant, sourceVariant: variant, variantCount, rows, cols, ...renderConfig, alpha: previewAlpha, depthMode: "terrain", previewUrl: generatedUrl(def.fileName), template: { decayId: id, variant },
    }));
  });
  const monsters = Object.entries(MONSTER_DEFS).map(([id, def]) => {
    const frame = staticMonsterFrame(def.sprite);
    return {
      key: `monsters:${id}`, layer: "monsters", kind: "monster", id, label: id, category: "monsters", tags: def.tags ?? [], variantCount: 1, previewUrl: def.sprite?.url ?? null, ...frame, sourceVariant: frame.variant, previewScale: Number(def.sprite?.scale) || 1, anchorY: 1, offsetY: Number(def.sprite?.yOffset) || 0, depthMode: "dynamic", sortAnchor: { x: 0.5, y: 1 }, template: { type: id, levelOffset: 0 },
    };
  });
  const npcs = Object.entries(QUEST_NPCS).map(([id, def]) => ({
    key: `npcs:${id}`, layer: "npcs", kind: "npc", id, label: `${def.name ?? id}${def.title ? ` — ${def.title}` : ""}`, category: "npcs", tags: [def.title].filter(Boolean), variantCount: 1, rows: 1, cols: 1, variant: 0, sourceVariant: 0, previewUrl: def.imageUrl ?? null, previewHeight: 96, anchorY: 1, offsetY: 16, depthMode: "dynamic", sortAnchor: { x: 0.5, y: 1 }, template: { npcId: id, facing: "south" },
  }));
  const chestDef = REGION_OBJECT_DEFS.object_chests_ground;
  const chestFrame = objectPreviewFrames("object_chests_ground", chestDef)[0] ?? {};
  const chestRenderScale = Number(objectSheetConfig("object_chests_ground", chestDef)?.renderScale) || 1;
  const chests = [{
    key: "chests:basic_chest", layer: "chests", kind: "chest", id: "basic_chest", label: "Basic chest", category: "chests", tags: ["loot", "container"], variantCount: 1, ...chestFrame, variant: 0, sourceVariant: 0, previewScale: 0.4 * chestRenderScale, anchorY: 1, offsetY: 12 + 24 * 0.4 * chestRenderScale, depthMode: "dynamic", sortAnchor: { x: 0.5, y: 1 }, template: { id: "basic_chest", blocking: true },
  }];
  return [...ground, ...water, ...decals, ...foliage, ...objects, ...monsters, ...npcs, ...chests];
}

export function assetFrameStyle(asset) {
  if (!asset?.previewUrl) return {};
  const rows = Math.max(1, Number(asset.rows) || 1);
  const cols = Math.max(1, Number(asset.cols) || 1);
  const variant = Math.max(0, Number(asset.sourceVariant ?? asset.variant) || 0);
  const column = variant % cols;
  const row = Math.floor(variant / cols) % rows;
  return {
    backgroundImage: `url("${asset.previewUrl}")`,
    backgroundSize: `${cols * 100}% ${rows * 100}%`,
    backgroundPosition: `${cols === 1 ? 0 : column / (cols - 1) * 100}% ${rows === 1 ? 0 : row / (rows - 1) * 100}%`,
  };
}

export function filterAssetCatalog(catalog, { layer, search = "", category = "all" } = {}) {
  const needle = search.trim().toLowerCase();
  return catalog.filter((entry) => (!layer || entry.layer === layer) && (category === "all" || entry.category === category) && (!needle || `${entry.id} ${entry.label} ${(entry.tags ?? []).join(" ")}`.toLowerCase().includes(needle)));
}
