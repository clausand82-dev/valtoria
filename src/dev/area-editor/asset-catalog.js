import { GROUND_SHEETS, FOLIAGE_SHEETS } from "../../game/config/asset-config.js";
import { REGION_OBJECT_DEFS } from "../../game/config/region-object-config.js";
import { DECAY_SET_DEFS } from "../../game/config/decay-config.js";
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

export function buildAreaEditorAssetCatalog() {
  const regionConfigs = Object.values(MAP_REGION_SETS).flatMap((entries) => Array.isArray(entries) ? entries : []);
  const groundDefs = new Map(Object.entries(GROUND_SHEETS).map(([id, def]) => [def.fileName, { id, ...def }]));
  for (const region of regionConfigs) {
    const normalized = normalizeRegionTileset(region.tileset);
    for (const entry of Array.isArray(normalized) ? normalized : normalized ? [normalized] : []) groundDefs.set(entry.fileName, { id: entry.fileName, ...entry });
  }
  const ground = [...groundDefs.values()].flatMap((def) => Array.from({ length: def.variantCount ?? 16 }, (_, variant) => ({
    key: `ground:${def.fileName}:${variant}`, layer: "ground", id: def.id, label: `${def.id} ${variant}`, category: "ground", tags: [def.id], fileName: def.fileName, variant, variantCount: def.variantCount ?? 16, rows: 4, cols: 4, sourceInset: def.sourceInset, projection: "isometric", previewUrl: generatedUrl(def.fileName), template: null,
  })));
  const waterDefs = new Map(); for (const region of regionConfigs) for (const entry of normalizeRegionWaterSets(region)) waterDefs.set(entry.fileName, entry);
  const water = [...waterDefs.values()].flatMap((def) => (def.variants?.length ? def.variants : Array.from({ length: def.variantCount ?? 16 }, (_, i) => i)).map((variant) => ({ key: `water:${def.fileName}:${variant}`, layer: "water", id: def.sheetId, label: `${def.fileName} ${variant}`, category: "water", tags: ["water"], fileName: def.fileName, variant, variantCount: def.variantCount ?? 16, rows: 4, cols: 4, previewUrl: generatedUrl(def.fileName), template: null })));
  const foliageDefs = new Map(Object.entries(FOLIAGE_SHEETS).map(([id, value]) => [id, { id, value }]));
  for (const region of regionConfigs) for (const entry of normalizeRegionFoliageSets(region)) foliageDefs.set(entry.sheetId, { id: entry.sheetId, value: entry });
  const foliage = [...foliageDefs.values()].flatMap(({ id, value }) => {
    const fileName = typeof value === "string" ? value : value.fileName;
    const variantCount = typeof value === "string" ? 64 : value.variantCount ?? 64;
    const rows = typeof value === "string" ? 8 : value.rows ?? 8; const cols = typeof value === "string" ? 8 : value.cols ?? 8;
    return Array.from({ length: variantCount }, (_, variant) => ({ key: `foliage:${id}:${variant}`, layer: "foliage", id, label: `${id} ${variant}`, category: "foliage", tags: [id], variant, variantCount, rows, cols, previewUrl: generatedUrl(fileName), template: typeof value === "string" ? { id, variant } : { fileName, rows, cols, variant } }));
  });
  const objects = Object.entries(REGION_OBJECT_DEFS).flatMap(([id, def]) => { const rows = Math.max(1, Number(def.graphics?.rows) || 4); const cols = Math.max(1, Number(def.graphics?.cols) || 4); const variantCount = Math.max(1, Number(def.graphics?.frameCount) || rows * cols); return Array.from({ length: variantCount }, (_, variant) => ({
    key: `objects:${id}:${variant}`, layer: "objects", id, label: `${id} ${variant}`, category: "objects", tags: def.tags ?? [], variant, variantCount, rows, cols, blocking: true, previewUrl: objectPreview(def), template: { id, variant },
  })); });
  const decals = Object.entries(DECAY_SET_DEFS).flatMap(([id, def]) => { const rows = Math.max(1, Number(def.rows) || 4); const cols = Math.max(1, Number(def.cols) || 4); const variantCount = rows * cols; return Array.from({ length: variantCount }, (_, variant) => ({
    key: `decals:${id}:${variant}`, layer: "decals", id, label: `${id} ${variant}`, category: "decals", tags: [def.projection ?? "topdown"], variant, variantCount, rows, cols, projection: def.projection, previewUrl: generatedUrl(def.fileName), template: { decayId: id, variant },
  })); });
  const monsters = Object.entries(MONSTER_DEFS).map(([id, def]) => ({
    key: `monsters:${id}`, layer: "monsters", id, label: id, category: "monsters", tags: def.tags ?? [], variantCount: 1, previewUrl: def.sprite?.url ?? null, template: { type: id, levelOffset: 0 },
  }));
  const npcs = Object.entries(QUEST_NPCS).map(([id, def]) => ({
    key: `npcs:${id}`, layer: "npcs", id, label: `${def.name ?? id}${def.title ? ` — ${def.title}` : ""}`, category: "npcs", tags: [def.title].filter(Boolean), variantCount: 1, previewUrl: def.imageUrl ?? null, template: { npcId: id, facing: "south" },
  }));
  const chests = [{ key: "chests:basic_chest", layer: "chests", id: "basic_chest", label: "Basic chest", category: "chests", tags: ["loot", "container"], variantCount: 1, previewUrl: generatedUrl(REGION_OBJECT_DEFS.object_chests_ground?.graphicsRef), template: { id: "basic_chest", blocking: true } }];
  return [...ground, ...water, ...decals, ...foliage, ...objects, ...monsters, ...npcs, ...chests];
}

export function assetFrameStyle(asset) {
  if (!asset?.previewUrl) return {};
  const rows = Math.max(1, Number(asset.rows) || 1); const cols = Math.max(1, Number(asset.cols) || 1); const variant = Math.max(0, Number(asset.variant) || 0);
  const column = variant % cols; const row = Math.floor(variant / cols) % rows;
  return { backgroundImage: `url("${asset.previewUrl}")`, backgroundSize: `${cols * 100}% ${rows * 100}%`, backgroundPosition: `${cols === 1 ? 0 : column / (cols - 1) * 100}% ${rows === 1 ? 0 : row / (rows - 1) * 100}%` };
}

export function filterAssetCatalog(catalog, { layer, search = "", category = "all" } = {}) {
  const needle = search.trim().toLowerCase();
  return catalog.filter((entry) => (!layer || entry.layer === layer) && (category === "all" || entry.category === category) && (!needle || `${entry.id} ${entry.label} ${(entry.tags ?? []).join(" ")}`.toLowerCase().includes(needle)));
}
