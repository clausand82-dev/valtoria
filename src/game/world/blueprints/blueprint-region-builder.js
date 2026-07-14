import { buildPrefabGroundOverrideMap, prefabGroundEntries } from "../prefabs/prefab-ground-overrides.js";
import { normalizeAreaBlueprint } from "./blueprint-normalization.js";

function paletteEntries(layer) {
  const result = new Map();
  for (let y = 0; y < layer.rows.length; y += 1) for (let x = 0; x < layer.rows[y].length; x += 1) {
    const entry = layer.palette[layer.rows[y][x]]; if (entry) result.set(`${x},${y}`, { groundSheetId: entry.sheetId ?? `ground-custom:${entry.fileName}`, sheetId: entry.sheetId ?? `ground-custom:${entry.fileName}`, variant: Number(entry.variant) });
  }
  return result;
}

export function applyBlueprintToRegion(baseRegion, input) {
  const blueprint = normalizeAreaBlueprint(input); const primary = blueprint.exits.find((entry) => entry.primary) ?? blueprint.exits[0];
  const instance = { id: blueprint.id, instanceId: `blueprint:${blueprint.id}`, x: 0, y: 0, w: blueprint.w, h: blueprint.h, bounds: { x: 0, y: 0, w: blueprint.w, h: blueprint.h }, rotation: 0, mirrored: false, ground: prefabGroundEntries(blueprint), objects: blueprint.objects, foliage: blueprint.foliage, decals: blueprint.decals, monsters: blueprint.monsters, npcs: blueprint.npcs, chests: blueprint.chests };
  baseRegion.width = blueprint.w; baseRegion.height = blueprint.h;
  baseRegion.start = { x: blueprint.start.x + 0.5, y: blueprint.start.y + 0.5 };
  baseRegion.end = { x: primary.x + 0.5, y: primary.y + 0.5 };
  baseRegion.exits = blueprint.exits.map((entry) => ({ ...entry, x: entry.x + 0.5, y: entry.y + 0.5 }));
  baseRegion.mask = new Set(); for (let y = 0; y < blueprint.h; y += 1) for (let x = 0; x < blueprint.w; x += 1) if (blueprint.playableMask.rows[y][x]) baseRegion.mask.add(`${x},${y}`);
  baseRegion.path = [{ x: baseRegion.start.x, y: baseRegion.start.y, r: 1 }, { x: baseRegion.end.x, y: baseRegion.end.y, r: 1 }]; baseRegion.rooms = [];
  baseRegion.prefabInstances = [instance]; baseRegion.prefabGroundOverrides = buildPrefabGroundOverrideMap([instance]);
  baseRegion.blueprintWaterOverrides = paletteEntries(blueprint.water);
  baseRegion.reservedTiles = new Set(blueprint.reservedCells.map((entry) => `${entry.x},${entry.y}`));
  baseRegion.blueprint = { id: blueprint.id, schemaVersion: blueprint.schemaVersion }; baseRegion.layoutId = `blueprint:${blueprint.id}`; baseRegion.layoutDef = null;
  if (baseRegion.mapRegion) baseRegion.mapRegion.blueprintId = blueprint.id;
  baseRegion.prefabDebug = { attempts: 0, placed: [{ id: blueprint.id, x: 0, y: 0 }], skipped: [] };
  return baseRegion;
}
