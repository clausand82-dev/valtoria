import { PREFAB_CONTENT_LAYERS } from "./prefab-normalization.js";

function location(prefabId, path = "") {
  return `prefab "${prefabId || "(missing id)"}"${path ? `.${path}` : ""}`;
}

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function validatePrefab(prefab, options = {}) {
  const errors = [];
  const prefabId = String(prefab?.id ?? options.registryKey ?? "").trim();
  const add = (path, message) => errors.push(`${location(prefabId, path)} ${message}`);
  if (!isRecord(prefab)) return [`${location(prefabId)} must be an object`];
  if (!String(prefab.id ?? "").trim()) add("id", "is required");
  const w = Number(prefab.w);
  const h = Number(prefab.h);
  if (!Number.isInteger(w) || w <= 0) add("w", "must be a positive integer");
  if (!Number.isInteger(h) || h <= 0) add("h", "must be a positive integer");

  for (const layer of PREFAB_CONTENT_LAYERS) {
    if (prefab[layer] !== undefined && !Array.isArray(prefab[layer])) {
      add(layer, "must be an array");
      continue;
    }
    for (let index = 0; index < (prefab[layer]?.length ?? 0); index += 1) {
      const entry = prefab[layer][index];
      if (!isRecord(entry)) {
        add(`${layer}[${index}]`, "must be an object");
        continue;
      }
      for (const axis of ["x", "y"]) {
        const value = Number(entry[axis]);
        const limit = axis === "x" ? w : h;
        if (!Number.isFinite(value) || value < 0 || value >= limit) add(`${layer}[${index}].${axis}`, `must be within 0..${Math.max(0, limit - 1)}`);
      }
      const runtimeId = layer === "objects" ? entry.id
        : layer === "decals" ? (entry.decayId ?? entry.id)
        : layer === "monsters" ? (entry.type ?? entry.typeName)
        : layer === "npcs" ? (entry.npcId ?? entry.id)
        : null;
      const knownIds = options.knownIds?.[layer];
      if (runtimeId && knownIds instanceof Set && !knownIds.has(String(runtimeId))) add(`${layer}[${index}]`, `references unknown runtime id "${runtimeId}"`);
    }
  }

  if (prefab.tiles !== undefined && !Array.isArray(prefab.tiles)) add("tiles", "must be an array");
  if (Array.isArray(prefab.tiles)) {
    if (!isRecord(prefab.legend)) add("legend", "must be an object when tiles are present");
    if (Number.isInteger(h) && prefab.tiles.length > h) add("tiles", `has ${prefab.tiles.length} rows but height is ${h}`);
    prefab.tiles.forEach((rawRow, y) => {
      if (typeof rawRow !== "string") add(`tiles[${y}]`, "must be a string");
      const row = String(rawRow ?? "");
      if (Number.isInteger(w) && row.length > w) add(`tiles[${y}]`, `has ${row.length} cells but width is ${w}`);
      for (let x = 0; x < row.length; x += 1) {
        const symbol = row[x];
        if (!isRecord(prefab.legend?.[symbol])) add(`tiles[${y}][${x}]`, `uses symbol "${symbol}" without a valid legend entry`);
      }
    });
    for (const [symbol, entry] of Object.entries(prefab.legend ?? {})) {
      if (symbol.length !== 1) add(`legend[${JSON.stringify(symbol)}]`, "key must be one character");
      if (!isRecord(entry)) add(`legend[${JSON.stringify(symbol)}]`, "must be an object");
      else if (entry.type !== "keep" && !["object", "foliage", "decal", "monster", "npc", "npcId", "chest"].some((key) => entry[key])) add(`legend[${JSON.stringify(symbol)}]`, "must define keep or a supported runtime entry");
      else {
        for (const [layer, runtimeId] of [
          ["objects", entry.object],
          ["decals", entry.decayId ?? (entry.decal && entry.decal !== true ? entry.decal : null)],
          ["monsters", entry.monster],
          ["npcs", typeof (entry.npc ?? entry.npcId) === "object" ? (entry.npc ?? entry.npcId)?.npcId ?? (entry.npc ?? entry.npcId)?.id : (entry.npc ?? entry.npcId)],
        ]) {
          const knownIds = options.knownIds?.[layer];
          if (runtimeId && knownIds instanceof Set && !knownIds.has(String(runtimeId))) add(`legend[${JSON.stringify(symbol)}]`, `references unknown ${layer} runtime id "${runtimeId}"`);
        }
      }
    }
  } else if (prefab.legend !== undefined && !isRecord(prefab.legend)) add("legend", "must be an object");

  if (prefab.ground !== undefined) validateGround(prefab.ground, w, h, add);
  if (prefab.editor !== undefined && !isRecord(prefab.editor)) add("editor", "must be an object");
  return errors;
}

function validateGround(ground, w, h, add) {
  if (!isRecord(ground)) {
    add("ground", "must be an object");
    return;
  }
  if (!Array.isArray(ground.palette)) add("ground.palette", "must be an array");
  else ground.palette.forEach((entry, index) => {
    if (!isRecord(entry)) add(`ground.palette[${index}]`, "must be an object");
    else {
      if (!String(entry.fileName ?? "").trim()) add(`ground.palette[${index}].fileName`, "is required");
      if (!Number.isInteger(entry.variant) || entry.variant < 0 || entry.variant >= 16) add(`ground.palette[${index}].variant`, "must be an integer within 0..15");
    }
  });
  if (!Array.isArray(ground.rows)) add("ground.rows", "must be an array");
  else {
    if (Number.isInteger(h) && ground.rows.length > h) add("ground.rows", `has ${ground.rows.length} rows but height is ${h}`);
    ground.rows.forEach((row, y) => {
      if (!Array.isArray(row)) {
        add(`ground.rows[${y}]`, "must be an array");
        return;
      }
      if (Number.isInteger(w) && row.length > w) add(`ground.rows[${y}]`, `has ${row.length} cells but width is ${w}`);
      row.forEach((paletteIndex, x) => {
        if (paletteIndex === null || paletteIndex === undefined) return;
        if (!Number.isInteger(paletteIndex)) add(`ground.rows[${y}][${x}]`, "must be null or an integer palette index");
        else if (!ground.palette?.[paletteIndex]) add(`ground.rows[${y}][${x}]`, `references missing palette index ${paletteIndex}`);
      });
    });
  }
}

export function validatePrefabRegistry(registry, options = {}) {
  const errors = [];
  const seen = new Map();
  for (const [key, prefab] of Object.entries(registry ?? {})) {
    const id = String(prefab?.id ?? "").trim();
    errors.push(...validatePrefab(prefab, { ...options, registryKey: key }));
    if (!id) continue;
    if (seen.has(id)) errors.push(`duplicate prefab id "${id}" in "${seen.get(id)}" and "${key}"`);
    else seen.set(id, key);
  }
  return errors;
}
