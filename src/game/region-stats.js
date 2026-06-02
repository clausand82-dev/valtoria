function increment(bucket, rawKey, amount = 1) {
  const key = String(rawKey ?? "").trim();
  if (!key) return;
  bucket[key] = (bucket[key] ?? 0) + amount;
}

function incrementTags(bucket, tags) {
  for (const tag of Array.isArray(tags) ? tags : []) increment(bucket, tag);
}

function resourceDropId(drop) {
  return drop?.resource ?? drop?.resourceId ?? drop?.id ?? drop?.type;
}

function createStats(includeTiles) {
  return {
    generatedAt: Date.now(),
    includeTiles,
    region: null,
    chunks: { total: 0 },
    objects: {
      total: 0,
      removed: 0,
      destructible: 0,
      interactable: 0,
      byObjectDefId: {},
      byType: {},
      byActionId: {},
      byDefaultActionId: {},
      byQuestTargetKey: {},
      byCompletedQuestTargetKey: {},
      byTag: {},
    },
    monsters: {
      total: 0,
      alive: 0,
      dead: 0,
      byType: {},
      bySpeciesId: {},
      byFactionId: {},
      byQuestTargetKey: {},
      byTag: {},
    },
    foliage: {
      total: 0,
      harvestable: 0,
      withResourceDrops: 0,
      byId: {},
      byDefId: {},
      byType: {},
      byActionId: {},
      byQuestTargetKey: {},
      byCompletedQuestTargetKey: {},
      byResourceDrop: {},
    },
    decals: {
      total: 0,
      byId: {},
      byDefId: {},
      byType: {},
    },
    chests: {
      total: 0,
      byLootTableId: {},
    },
    resources: {
      possibleDrops: 0,
      byResourceDrop: {},
    },
    tiles: includeTiles ? {
      total: 0,
      walkable: 0,
      blocked: 0,
      water: 0,
      path: 0,
      byId: {},
      byType: {},
    } : null,
  };
}

function collectMonsters(engine, chunks) {
  if (engine?.monsters instanceof Map) return [...engine.monsters.values()];
  const byId = new Map();
  for (const chunk of chunks) {
    for (const monster of Array.isArray(chunk?.monsters) ? chunk.monsters : []) {
      byId.set(monster?.id ?? monster, monster);
    }
  }
  return [...byId.values()];
}

function recordResources(stats, drops) {
  for (const drop of Array.isArray(drops) ? drops : []) {
    const id = resourceDropId(drop);
    if (!id) continue;
    stats.resources.possibleDrops += 1;
    increment(stats.resources.byResourceDrop, id);
  }
}

function isChest(object) {
  return object?.actionId === "open_map_chest"
    || object?.defaultActionId === "open_map_chest"
    || /chest/i.test(String(object?.objectDefId ?? object?.type ?? ""));
}

export function buildRegionStats(engine, options = {}) {
  const includeTiles = options.includeTiles === true;
  const stats = createStats(includeTiles);
  if (options.ensureFullRegionGenerated !== false) engine?.ensureFullRegionGenerated?.();

  const chunks = engine?.chunks instanceof Map ? [...engine.chunks.values()] : [];
  const region = engine?.region;
  stats.region = region ? {
    id: region.mapRegion?.id ?? null,
    label: region.mapRegion?.label ?? null,
    areaMapId: region.mapRegion?.areaMapId ?? null,
    index: region.index ?? null,
    seed: region.seed ?? null,
    activeMapRegion: Boolean(engine?.activeMapRegion),
  } : null;
  stats.chunks.total = chunks.length;

  for (const chunk of chunks) {
    for (const object of Array.isArray(chunk?.objects) ? chunk.objects : []) {
      if (object?.removed) {
        stats.objects.removed += 1;
        continue;
      }
      if (object?.type === "foliage") {
        const foliageId = object.foliageSheet ?? object.foliageDefId ?? object.objectDefId ?? object.type;
        const drops = Array.isArray(object.resourceDrops) ? object.resourceDrops : [];
        stats.foliage.total += 1;
        if (!object.foliageLooted && drops.length) stats.foliage.harvestable += 1;
        if (drops.length) stats.foliage.withResourceDrops += 1;
        increment(stats.foliage.byId, foliageId);
        increment(stats.foliage.byDefId, foliageId);
        increment(stats.foliage.byType, object.type);
        increment(stats.foliage.byActionId, object.actionId);
        increment(stats.foliage.byQuestTargetKey, object.questTargetKey);
        increment(stats.foliage.byCompletedQuestTargetKey, object.completedQuestTargetKey);
        for (const drop of drops) increment(stats.foliage.byResourceDrop, resourceDropId(drop));
        recordResources(stats, drops);
        continue;
      }

      stats.objects.total += 1;
      if (object?.destructible) stats.objects.destructible += 1;
      if (object?.actionId || object?.defaultActionId) stats.objects.interactable += 1;
      increment(stats.objects.byObjectDefId, object?.objectDefId);
      increment(stats.objects.byType, object?.type);
      increment(stats.objects.byActionId, object?.actionId);
      increment(stats.objects.byDefaultActionId, object?.defaultActionId);
      increment(stats.objects.byQuestTargetKey, object?.questTargetKey);
      increment(stats.objects.byCompletedQuestTargetKey, object?.completedQuestTargetKey);
      incrementTags(stats.objects.byTag, object?.tags);
      recordResources(stats, object?.resourceDrops);

      if (isChest(object)) {
        stats.chests.total += 1;
        increment(stats.chests.byLootTableId, object?.lootTableId ?? object?.chestLootTableId);
      }
    }

    for (const decal of Array.isArray(chunk?.decals) ? chunk.decals : []) {
      const decalId = decal?.decaySheetId ?? decal?.decalDefId ?? decal?.type;
      stats.decals.total += 1;
      increment(stats.decals.byId, decalId);
      increment(stats.decals.byDefId, decalId);
      increment(stats.decals.byType, decal?.type);
    }

    if (stats.tiles) {
      for (const tile of Array.isArray(chunk?.tiles) ? chunk.tiles : []) {
        const tileId = tile?.water ? (tile.waterSheetId ?? "water") : (tile?.groundSheetId ?? "ground");
        const tileType = tile?.water ? "water" : tile?.path ? "path" : "ground";
        stats.tiles.total += 1;
        stats.tiles[tile?.water ? "blocked" : "walkable"] += 1;
        if (tile?.water) stats.tiles.water += 1;
        if (tile?.path) stats.tiles.path += 1;
        increment(stats.tiles.byId, tileId);
        increment(stats.tiles.byType, tileType);
      }
    }
  }

  for (const monster of collectMonsters(engine, chunks)) {
    if (!monster) continue;
    stats.monsters.total += 1;
    stats.monsters[monster.dead || Number(monster.hp) <= 0 ? "dead" : "alive"] += 1;
    increment(stats.monsters.byType, monster.typeName ?? monster.type);
    increment(stats.monsters.bySpeciesId, monster.speciesId);
    increment(stats.monsters.byFactionId, monster.factionId);
    increment(stats.monsters.byQuestTargetKey, monster.questTargetKey);
    incrementTags(stats.monsters.byTag, monster.tags);
  }

  return stats;
}
