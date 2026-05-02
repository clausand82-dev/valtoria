const TREE_OBJECT_BY_BIOME = {
  snow: "object_tree_snow",
  desert: "object_tree_sand",
  sand: "object_tree_sand",
  jungle: "object_tree_jungle",
  rock: "object_tree_rock",
  lava: "object_tree_lava",
  mainland: "object_tree_mainland",
};

/*
Region object definition guide

Fields used on each object in REGION_OBJECT_DEFS:
- spawnTypes: Runtime types that can be spawned for this object id.
  Example: [{ type: "object_woodboxes_ground", weight: 1 }]
- legacyWeightKey: Only used by the legacy weight fallback mapping.
- defaultDestructible: Default destructible flag if region override is not set.
- destructibleProfile: Optional profile key in resource-config.
- renderBiomeId: Optional visual biome override when rendering.
- graphicsRef: PNG reference text. For new object_* sheet generation this should
  contain a real file name like "my_object.png".
- graphics: Optional explicit graphics config.
  - { mode: "sheet", fileName, rows, cols, renderScale }
  - { mode: "frames", frameFiles: [...], animated: true, ... }

How to tell old vs new system here:
- New defs-driven sheet path: spawnTypes has exactly one type starting with
  "object_". See inferSheetObjectType() below.
- Old path: spawnTypes uses non-object types (for example "firebeacon"), and
  the visual sheet is still provided by OBJECT_SHEETS in asset-config.js.

Example if firebeacon is moved to new system later:
object_firebeacon_snow: {
  spawnTypes: [{ type: "object_firebeacon_snow", weight: 1 }],
  defaultDestructible: false,
  renderBiomeId: "snow",
  graphicsRef: "firebeacon_snow_animated_001.png",
  graphics: {
    mode: "frames",
    frameFiles: [
      "firebeacon_snow_animated_001.png",
      "firebeacon_snow_animated_002.png",
      "firebeacon_snow_animated_003.png",
      "firebeacon_snow_animated_004.png",
      "firebeacon_snow_animated_005.png",
      "firebeacon_snow_animated_006.png",
      "firebeacon_snow_animated_007.png",
      "firebeacon_snow_animated_008.png",
    ],
    animated: true,
    keyEdgeBlack: true,
    keyEdgeHalo: true,
    renderScale: 0.29,
  },
}
*/

export const REGION_OBJECT_DEFS = {
  object_tree_mainland: {
    spawnTypes: [
      { type: "pine", weight: 58 },
      { type: "old-oak", weight: 42 },
    ],
    legacyWeightKey: "tree",
    defaultDestructible: true,
    renderBiomeId: "mainland",
    graphicsRef: "tree_normal_sheet.png (tree sheet)",
  },
  object_tree_snow: {
    spawnTypes: [
      { type: "pine", weight: 58 },
      { type: "old-oak", weight: 42 },
    ],
    legacyWeightKey: "tree",
    defaultDestructible: true,
    renderBiomeId: "snow",
    graphicsRef: "tree_snow_sheet.png (tree sheet)",
  },
  object_tree_sand: {
    spawnTypes: [
      { type: "pine", weight: 58 },
      { type: "old-oak", weight: 42 },
    ],
    legacyWeightKey: "tree",
    defaultDestructible: true,
    renderBiomeId: "desert",
    graphicsRef: "tree_sand_sheet.png (tree sheet)",
  },
  object_tree_jungle: {
    spawnTypes: [
      { type: "pine", weight: 58 },
      { type: "old-oak", weight: 42 },
    ],
    legacyWeightKey: "tree",
    defaultDestructible: true,
    renderBiomeId: "jungle",
    graphicsRef: "tree_jungle_sheet.png (tree sheet)",
  },
  object_tree_rock: {
    spawnTypes: [
      { type: "pine", weight: 58 },
      { type: "old-oak", weight: 42 },
    ],
    legacyWeightKey: "tree",
    defaultDestructible: true,
    renderBiomeId: "rock",
    graphicsRef: "tree_dead_sheet.png (tree sheet)",
  },
  object_tree_lava: {
    spawnTypes: [
      { type: "pine", weight: 58 },
      { type: "old-oak", weight: 42 },
    ],
    legacyWeightKey: "tree",
    defaultDestructible: true,
    renderBiomeId: "lava",
    graphicsRef: "tree_dead_sheet.png (tree sheet)",
  },
  object_house_mainland: {
    spawnTypes: [{ type: "building", weight: 1 }],
    legacyWeightKey: "house",
    defaultDestructible: true,
    destructibleProfile: "building",
    renderBiomeId: "mainland",
    graphicsRef: "building_normal_sheet.png (4x4)",
  },
  object_pillar_stone: {
    spawnTypes: [{ type: "pillar", weight: 1 }],
    legacyWeightKey: "pillar",
    defaultDestructible: true,
    destructibleProfile: "pillar",
    renderBiomeId: "mainland",
    graphicsRef: "atlas frame: pillar",
  },
  object_stone_cluster: {
    spawnTypes: [
      { type: "boulder", weight: 58 },
      { type: "stone", weight: 42 },
    ],
    legacyWeightKey: "rock",
    defaultDestructible: true,
    renderBiomeId: "mainland",
    graphicsRef: "atlas frame: boulder",
  },
  object_ruin_mainland: {
    spawnTypes: [{ type: "ruin", weight: 1 }],
    legacyWeightKey: "ruin",
    defaultDestructible: true,
    destructibleProfile: "ruin",
    renderBiomeId: "mainland",
    graphicsRef: "ruin_normal_sheet.png (4x4)",
  },
  object_fireplace_mainland: {
    spawnTypes: [{ type: "fireplace", weight: 1 }],
    legacyWeightKey: "fireplace",
    defaultDestructible: false,
    renderBiomeId: "mainland",
    graphicsRef: "fireplace_normal_01..04.png (animated)",
  },
  object_firebeacon_snow: {
    // Legacy runtime type: still uses "firebeacon" (old OBJECT_SHEETS path).
    spawnTypes: [{ type: "firebeacon", weight: 1 }],
    legacyWeightKey: "firebeacon",
    defaultDestructible: false,
    renderBiomeId: "snow",
    graphicsRef: "firebeacon_snow_animated_001..008.png (animated)",
  },
  object_woodboxes_ground: {
    spawnTypes: [{ type: "object_woodboxes_ground", weight: 1 }],
    defaultDestructible: true,
    destructibleProfile: "object_woodboxes_ground",
    renderBiomeId: "mainland",
    graphicsRef: "object/object_woodboxes_ground.png",
  },
    object_shelfs: {
    spawnTypes: [{ type: "object_shelfs", weight: 1 }],
    defaultDestructible: true,
    destructibleProfile: "object_shelfs",
    renderBiomeId: "mainland",
    graphicsRef: "object/object_shelfs.png",
  },
  object_field: {
    spawnTypes: [{ type: "object_field", weight: 1 }],
    defaultDestructible: true,
    destructibleProfile: "object_field",
    renderBiomeId: "mainland",
    graphicsRef: "object/object_field.png",
  },
  object_barn: {
    spawnTypes: [{ type: "object_barn", weight: 1 }],
    defaultDestructible: true,
    destructibleProfile: "object_barn",
    renderBiomeId: "mainland",
    graphicsRef: "object/object_barn.png",
  },
};

function extractPngFileName(graphicsRef) {
  const raw = String(graphicsRef ?? "").trim();
  if (!raw) return null;
  // Allow optional subfolder paths such as "object/object_woodboxes_ground.png".
  const match = raw.match(/([a-z0-9_./-]+\.png)/i);
  return match ? match[1] : null;
}

function normalizeGraphicsConfig(def) {
  const graphics = def?.graphics;
  if (!graphics || typeof graphics !== "object") return null;

  const mode = String(graphics.mode ?? "sheet").trim().toLowerCase();
  if (mode === "frames") {
    const rawFiles = Array.isArray(graphics.frameFiles) ? graphics.frameFiles : [];
    const frameFiles = rawFiles
      .map((file) => String(file ?? "").trim())
      .filter((file) => /\.png$/i.test(file));
    if (!frameFiles.length) return null;
    return {
      frameFiles,
      animated: graphics.animated !== false,
      keyEdgeBlack: graphics.keyEdgeBlack,
      keyEdgeHalo: graphics.keyEdgeHalo,
      blackThreshold: graphics.blackThreshold,
      renderScale: Number.isFinite(Number(graphics.renderScale)) ? Number(graphics.renderScale) : 1,
      normalizeAnimation: graphics.normalizeAnimation,
    };
  }

  const fileName = String(graphics.fileName ?? "").trim();
  if (!/\.png$/i.test(fileName)) return null;
  return {
    fileName,
    rows: Number.isFinite(Number(graphics.rows)) ? Math.max(1, Math.floor(Number(graphics.rows))) : 4,
    cols: Number.isFinite(Number(graphics.cols)) ? Math.max(1, Math.floor(Number(graphics.cols))) : 4,
    frameCount: Number.isFinite(Number(graphics.frameCount)) ? Math.max(1, Math.floor(Number(graphics.frameCount))) : undefined,
    animated: graphics.animated,
    renderScale: Number.isFinite(Number(graphics.renderScale)) ? Number(graphics.renderScale) : 1,
  };
}

function inferSheetObjectType(def) {
  const spawnTypes = Array.isArray(def?.spawnTypes) ? def.spawnTypes : [];
  if (spawnTypes.length !== 1) return null;
  const type = String(spawnTypes[0]?.type ?? "").trim();
  // New system marker: only types prefixed with "object_" are auto-built
  // into REGION_OBJECT_SHEETS from REGION_OBJECT_DEFS.
  if (!type || !type.startsWith("object_")) return null;
  return type;
}

function buildRegionObjectSheets(definitions) {
  const sheets = {};
  for (const def of Object.values(definitions ?? {})) {
    const type = inferSheetObjectType(def);
    if (!type) continue;

    const explicitGraphics = normalizeGraphicsConfig(def);
    if (explicitGraphics) {
      sheets[type] = { default: explicitGraphics };
      continue;
    }

    const fileName = extractPngFileName(def?.graphicsRef);
    if (!fileName) continue;
    sheets[type] = {
      default: {
        fileName,
        rows: 4,
        cols: 4,
        renderScale: Number.isFinite(Number(def?.sheetRenderScale)) ? Number(def.sheetRenderScale) : 1,
      },
    };
  }
  return sheets;
}

export const REGION_OBJECT_SHEETS = buildRegionObjectSheets(REGION_OBJECT_DEFS);

function getTreeObjectIdForBiome(biomeId) {
  return TREE_OBJECT_BY_BIOME[biomeId] ?? TREE_OBJECT_BY_BIOME.mainland;
}

function parseWeight(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}

function normalizeSpawnTypes(def) {
  const list = Array.isArray(def?.spawnTypes) ? def.spawnTypes : [];
  const normalized = [];
  for (const entry of list) {
    const type = String(entry?.type ?? "").trim();
    if (!type) continue;
    const weight = parseWeight(entry?.weight) || 1;
    normalized.push({ type, weight });
  }
  return normalized;
}

function buildObjectEntry(objectId, weight, destructible = null) {
  const def = REGION_OBJECT_DEFS[objectId];
  if (!def) return null;
  const resolvedWeight = parseWeight(weight);
  if (resolvedWeight <= 0) return null;
  const spawnTypes = normalizeSpawnTypes(def);
  if (!spawnTypes.length) return null;
  return {
    id: objectId,
    weight: resolvedWeight,
    spawnTypes,
    destructible,
    defaultDestructible: def.defaultDestructible !== false,
    destructibleProfile: def.destructibleProfile ?? null,
    renderBiomeId: def.renderBiomeId ?? null,
    graphicsRef: def.graphicsRef ?? null,
  };
}

function legacyObjectIdForWeightKey(weightKey, biomeId) {
  switch (weightKey) {
    case "tree":
      return getTreeObjectIdForBiome(biomeId);
    case "house":
      return "object_house_mainland";
    case "rock":
      return "object_stone_cluster";
    case "ruin":
      return "object_ruin_mainland";
    case "pillar":
      return "object_pillar_stone";
    case "fireplace":
      return "object_fireplace_mainland";
    case "firebeacon":
      return "object_firebeacon_snow";
    default:
      return null;
  }
}

export function legacyRegionObjectsFromWeights(weights = {}, biomeId = "mainland") {
  const keys = ["tree", "house", "rock", "ruin", "pillar", "fireplace", "firebeacon"];
  const entries = [];
  for (const key of keys) {
    const objectId = legacyObjectIdForWeightKey(key, biomeId);
    if (!objectId) continue;
    const weight = parseWeight(weights[key]);
    const entry = buildObjectEntry(objectId, weight, null);
    if (entry) entries.push(entry);
  }
  return entries;
}

export function normalizeRegionObjects(regionConfig = {}, biomeId = "mainland") {
  const raw = regionConfig.objects;
  if (!Array.isArray(raw) || !raw.length) return [];
  const entries = [];
  for (const entry of raw) {
    if (typeof entry === "string") {
      const normalized = buildObjectEntry(entry, 1, null);
      if (normalized) entries.push(normalized);
      continue;
    }
    if (!entry || typeof entry !== "object") continue;
    const objectId = String(entry.id ?? entry.objectId ?? "").trim();
    if (!objectId) continue;
    const destructible = typeof entry.destructible === "boolean" ? entry.destructible : null;
    const weight = parseWeight(entry.weight) || 1;
    const normalized = buildObjectEntry(objectId, weight, destructible);
    if (normalized) entries.push(normalized);
  }

  // Fallback to biome-specific tree entry if someone passes empty object list by mistake.
  if (!entries.length && Array.isArray(raw)) {
    const treeFallback = buildObjectEntry(getTreeObjectIdForBiome(biomeId), 1, null);
    if (treeFallback) return [treeFallback];
  }
  return entries;
}

export function pickObjectSpawnType(objectEntry, randValue = Math.random()) {
  const spawnTypes = objectEntry?.spawnTypes ?? [];
  if (!spawnTypes.length) return null;
  const total = spawnTypes.reduce((sum, item) => sum + item.weight, 0);
  if (total <= 0) return spawnTypes[0].type;
  let cursor = Math.max(0, Math.min(1, randValue)) * total;
  for (const item of spawnTypes) {
    cursor -= item.weight;
    if (cursor <= 0) return item.type;
  }
  return spawnTypes[spawnTypes.length - 1].type;
}
