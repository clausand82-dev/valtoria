import { DECAY_SET_DEFS } from "../../config/decay-config.js";
import { MONSTER_DEFS } from "../../config/monster-config.js";
import { QUEST_NPCS } from "../../config/npc-config.js";
import { REGION_OBJECT_DEFS } from "../../config/region-object-config.js";
import { validatePrefab } from "../prefabs/prefab-validation.js";
import { BLUEPRINT_ENTITY_LAYERS, blueprintCellIsPlayable, normalizeAreaBlueprint } from "./blueprint-normalization.js";

export const BLUEPRINT_ID_PATTERN = /^[a-z][a-z0-9_]*$/;

function cellKey(cell) { return `${Math.floor(Number(cell?.x))},${Math.floor(Number(cell?.y))}`; }
function inBounds(doc, cell) { return Number.isInteger(cell?.x) && Number.isInteger(cell?.y) && cell.x >= 0 && cell.y >= 0 && cell.x < doc.w && cell.y < doc.h; }

export function blueprintConnectivity(blueprint) {
  const doc = normalizeAreaBlueprint(blueprint);
  if (!inBounds(doc, doc.start) || !blueprintCellIsPlayable(doc, doc.start.x, doc.start.y)) return { reachable: new Set(), unreachableExits: [...doc.exits] };
  const reachable = new Set([cellKey(doc.start)]); const queue = [{ ...doc.start }];
  while (queue.length) {
    const cell = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = { x: cell.x + dx, y: cell.y + dy }; const key = cellKey(next);
      if (!reachable.has(key) && inBounds(doc, next) && blueprintCellIsPlayable(doc, next.x, next.y)) { reachable.add(key); queue.push(next); }
    }
  }
  return { reachable, unreachableExits: doc.exits.filter((entry) => !reachable.has(cellKey(entry))) };
}

export function validateAreaBlueprint(input, options = {}) {
  const doc = normalizeAreaBlueprint(input); const errors = []; const warnings = [];
  const prefix = `blueprint "${doc.id || "(missing)"}"`;
  if (!doc.id) errors.push(`${prefix}.id is required`); else if (!BLUEPRINT_ID_PATTERN.test(doc.id)) errors.push(`${prefix}.id is invalid`);
  if (!Number.isInteger(Number(input?.w ?? input?.width)) || doc.w < 2) errors.push(`${prefix}.w must be an integer of at least 2`);
  if (!Number.isInteger(Number(input?.h ?? input?.height)) || doc.h < 2) errors.push(`${prefix}.h must be an integer of at least 2`);
  const rawMaskRows = input?.playableMask?.rows ?? input?.mask?.rows ?? input?.playableMask ?? input?.mask;
  for (const [layerName, layer, rawRows] of [["playableMask", doc.playableMask, rawMaskRows], ["ground", doc.ground, input?.ground?.rows], ["water", doc.water, input?.water?.rows]]) {
    if (rawRows === undefined && layerName !== "playableMask") continue;
    if (!Array.isArray(rawRows) || rawRows.length !== doc.h) errors.push(`${prefix}.${layerName}.rows must contain exactly ${doc.h} rows`);
    for (let y = 0; y < doc.h; y += 1) if (!Array.isArray(rawRows?.[y]) || rawRows[y].length !== doc.w) errors.push(`${prefix}.${layerName}.rows[${y}] must contain exactly ${doc.w} cells`);
  }
  for (const layerName of ["ground", "water"]) {
    const layer = doc[layerName];
    for (let y = 0; y < doc.h; y += 1) for (let x = 0; x < doc.w; x += 1) {
      const index = layer.rows[y][x]; if (index !== null && index !== undefined && (!Number.isInteger(index) || index < 0 || !layer.palette[index])) errors.push(`${prefix}.${layerName}.rows[${y}][${x}] references missing palette index ${index}`);
    }
    layer.palette.forEach((entry, index) => { if (!entry?.fileName) errors.push(`${prefix}.${layerName}.palette[${index}].fileName is required`); if (!Number.isInteger(Number(entry?.variant)) || Number(entry.variant) < 0 || Number(entry.variant) >= Math.max(1, Number(entry.variantCount) || 16)) errors.push(`${prefix}.${layerName}.palette[${index}].variant is invalid`); });
  }
  if (!inBounds(doc, doc.start)) errors.push(`${prefix}.start must be one in-bounds cell`); else if (!blueprintCellIsPlayable(doc, doc.start.x, doc.start.y)) errors.push(`${prefix}.start is outside the playable mask`);
  if (!doc.exits.length) errors.push(`${prefix}.exits requires at least one exit`);
  doc.exits.forEach((entry, index) => { if (!inBounds(doc, entry)) errors.push(`${prefix}.exits[${index}] is out of bounds`); else if (!blueprintCellIsPlayable(doc, entry.x, entry.y)) errors.push(`${prefix}.exits[${index}] is outside the playable mask`); });
  if (doc.exits.filter((entry) => entry.primary).length !== 1) errors.push(`${prefix}.exits must contain exactly one primary exit`);
  const connectivity = blueprintConnectivity(doc); if (connectivity.unreachableExits.length) errors.push(`${prefix}.exits contains ${connectivity.unreachableExits.length} exit(s) unreachable from start`);
  const prefabErrors = validatePrefab({ ...doc, id: doc.id, ground: undefined }, { knownIds: options.knownIds ?? { objects: new Set(Object.keys(REGION_OBJECT_DEFS)), decals: new Set(Object.keys(DECAY_SET_DEFS)), monsters: new Set(Object.keys(MONSTER_DEFS)), npcs: new Set(Object.keys(QUEST_NPCS)) } });
  errors.push(...prefabErrors.map((message) => message.replace(/^prefab/, "blueprint")));
  for (const layer of BLUEPRINT_ENTITY_LAYERS) doc[layer].forEach((entry, index) => { if (inBounds(doc, entry) && !blueprintCellIsPlayable(doc, entry.x, entry.y)) warnings.push(`${prefix}.${layer}[${index}] is outside the playable mask and will not spawn`); });
  return { blueprint: doc, errors: [...new Set(errors)], warnings: [...new Set(warnings)], valid: errors.length === 0 };
}
