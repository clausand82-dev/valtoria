import { GROUND_SHEETS, FOLIAGE_SHEETS } from "../../game/config/asset-config.js";
import { REGION_OBJECT_DEFS } from "../../game/config/region-object-config.js";
import { DECAY_SET_DEFS } from "../../game/config/decay-config.js";
import { MONSTER_DEFS } from "../../game/config/monster-config.js";
import { QUEST_NPCS } from "../../game/config/npc-config.js";
import { MAP_REGION_SETS } from "../../game/config/map-region-config.js";
import { normalizeRegionFoliageSets, normalizeRegionTileset } from "../../game/config/region-asset-config.js";

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
    key: `ground:${def.fileName}:${variant}`, layer: "ground", id: def.id, label: `${def.id} ${variant}`, category: "ground", tags: [def.id], fileName: def.fileName, variant, variantCount: def.variantCount ?? 16, previewUrl: generatedUrl(def.fileName), template: null,
  })));
  const foliageDefs = new Map(Object.entries(FOLIAGE_SHEETS).map(([id, value]) => [id, { id, value }]));
  for (const region of regionConfigs) for (const entry of normalizeRegionFoliageSets(region)) foliageDefs.set(entry.sheetId, { id: entry.sheetId, value: entry });
  const foliage = [...foliageDefs.values()].map(({ id, value }) => {
    const fileName = typeof value === "string" ? value : value.fileName;
    const variantCount = typeof value === "string" ? 64 : value.variantCount ?? 64;
    return { key: `foliage:${id}`, layer: "foliage", id, label: id, category: "foliage", tags: [id], variantCount, previewUrl: generatedUrl(fileName), template: typeof value === "string" ? { id } : { fileName, rows: value.rows, cols: value.cols } };
  });
  const objects = Object.entries(REGION_OBJECT_DEFS).map(([id, def]) => ({
    key: `objects:${id}`, layer: "objects", id, label: id, category: "objects", tags: def.tags ?? [], variantCount: Math.max(1, Number(def.graphics?.frameCount) || Number(def.graphics?.rows) * Number(def.graphics?.cols) || 16), blocking: true, previewUrl: objectPreview(def), template: { id },
  }));
  const decals = Object.entries(DECAY_SET_DEFS).map(([id, def]) => ({
    key: `decals:${id}`, layer: "decals", id, label: id, category: "decals", tags: [def.projection ?? "topdown"], variantCount: Math.max(1, Number(def.rows) * Number(def.cols) || 16), previewUrl: generatedUrl(def.fileName), template: { decayId: id },
  }));
  const monsters = Object.entries(MONSTER_DEFS).map(([id, def]) => ({
    key: `monsters:${id}`, layer: "monsters", id, label: id, category: "monsters", tags: def.tags ?? [], variantCount: 1, previewUrl: def.sprite?.url ?? null, template: { type: id, levelOffset: 0 },
  }));
  const npcs = Object.entries(QUEST_NPCS).map(([id, def]) => ({
    key: `npcs:${id}`, layer: "npcs", id, label: `${def.name ?? id}${def.title ? ` — ${def.title}` : ""}`, category: "npcs", tags: [def.title].filter(Boolean), variantCount: 1, previewUrl: def.imageUrl ?? null, template: { npcId: id, facing: "south" },
  }));
  const chests = [{ key: "chests:basic_chest", layer: "chests", id: "basic_chest", label: "Basic chest", category: "chests", tags: ["loot", "container"], variantCount: 1, previewUrl: generatedUrl(REGION_OBJECT_DEFS.object_chests_ground?.graphicsRef), template: { id: "basic_chest", blocking: true } }];
  return [...ground, ...decals, ...foliage, ...objects, ...monsters, ...npcs, ...chests];
}

export function filterAssetCatalog(catalog, { layer, search = "", category = "all" } = {}) {
  const needle = search.trim().toLowerCase();
  return catalog.filter((entry) => (!layer || entry.layer === layer) && (category === "all" || entry.category === category) && (!needle || `${entry.id} ${entry.label} ${(entry.tags ?? []).join(" ")}`.toLowerCase().includes(needle)));
}
