import { MAP_LAYOUTS } from "../config/map-layout-config.js";
import { DEBUG_MAP_PREFABS, MAP_PREFABS } from "../config/map-prefab-config.js";

export function chooseWeighted(rng, pool = []) {
  const entries = Array.isArray(pool)
    ? pool.filter((entry) => entry && Math.max(0, Number(entry.weight) || 0) > 0)
    : [];
  if (!entries.length) return null;
  const total = entries.reduce((sum, entry) => sum + Math.max(0, Number(entry.weight) || 0), 0);
  let cursor = rng() * total;
  for (const entry of entries) {
    cursor -= Math.max(0, Number(entry.weight) || 0);
    if (cursor <= 0) return entry;
  }
  return entries[entries.length - 1];
}

export function chooseLayoutForRegion(regionConfig, rng) {
  const selected = chooseWeighted(rng, regionConfig?.layout?.pool);
  if (!selected?.id) return null;
  const layout = MAP_LAYOUTS[selected.id];
  if (!layout) {
    console.warn(`[map-layout] Unknown layout id: ${selected.id}`);
    return null;
  }
  return layout;
}

export function isReservedTile(region, x, y) {
  return Boolean(region?.reservedTiles?.has(`${Math.floor(x)},${Math.floor(y)}`));
}

export function placeRegionPrefabs(region, regionConfig, rng, options = {}) {
  if (!region) return [];
  if (!region.reservedTiles) region.reservedTiles = new Set();
  region.prefabInstances = [];

  const rules = regionConfig?.prefabRules;
  const pool = Array.isArray(rules?.pool) ? rules.pool : [];
  if (!rules || !pool.length) {
    region.prefabDebug = { attempts: 0, placed: [], skipped: [] };
    return region.prefabInstances;
  }

  const maxTotal = Math.max(0, Math.floor(Number(rules.maxTotal) || 0));
  if (maxTotal <= 0) return region.prefabInstances;

  const minDistance = Math.max(0, Number(rules.minDistanceBetweenPrefabs) || 0);
  const counts = new Map();
  const skipped = [];
  let attempts = 0;
  const maxAttempts = Math.max(maxTotal * 12, pool.length * 6);

  while (region.prefabInstances.length < maxTotal && attempts < maxAttempts) {
    attempts += 1;
    // Required entries are attempted before weighted ambient prefabs. This is
    // reusable for quest-critical entrances and one-off hidden encounters.
    const requiredEntry = pool.find((entry) => entry?.required === true && (counts.get(entry.id) ?? 0) < Math.max(1, Number(entry.max) || 1));
    const poolEntry = requiredEntry ?? chooseWeighted(() => rng(10000 + attempts * 17), pool);
    const prefab = MAP_PREFABS[poolEntry?.id];
    if (!prefab) {
      skipped.push({ id: poolEntry?.id ?? null, reason: "unknown_prefab" });
      continue;
    }
    if (!isValidPrefab(prefab)) {
      skipped.push({ id: prefab.id, reason: "invalid_prefab" });
      continue;
    }
    const currentCount = counts.get(prefab.id) ?? 0;
    const maxForPrefab = Math.max(0, Math.floor(Number(poolEntry.max) || maxTotal));
    if (currentCount >= maxForPrefab) {
      skipped.push({ id: prefab.id, reason: "max_reached" });
      continue;
    }

    const rotation = prefab.rotate ? [0, 90, 180, 270][Math.floor(rng(11000 + attempts * 19) * 4)] : 0;
    const mirrored = Boolean(prefab.mirror && rng(12000 + attempts * 23) >= 0.5);
    const size = transformedSize(prefab, rotation);
    const candidates = findPrefabAnchorCandidates(region, prefab, rules, size);
    if (!candidates.length) {
      skipped.push({ id: prefab.id, reason: "no_anchor_candidates" });
      continue;
    }

    const startIndex = Math.floor(rng(13000 + attempts * 29) * candidates.length);
    let placed = false;
    const candidateLimit = pool.length <= 1 ? candidates.length : Math.min(candidates.length, 16);
    for (let offset = 0; offset < candidateLimit; offset += 1) {
      const candidate = candidates[(startIndex + offset) % candidates.length];
      const x = Math.floor(candidate.x);
      const y = Math.floor(candidate.y);
      const result = canPlacePrefab(region, prefab, x, y, {
        ...options,
        minDistance,
        rotation,
        size,
      });
      if (!result.ok) {
        if (offset === 0) skipped.push({ id: prefab.id, reason: result.reason });
        continue;
      }
      const instance = buildPrefabInstance(prefab, x, y, rotation, mirrored, region.prefabInstances.length);
      region.prefabInstances.push(instance);
      reservePrefabTiles(region, instance);
      counts.set(prefab.id, currentCount + 1);
      placed = true;
      break;
    }
    if (!placed) skipped.push({ id: prefab.id, reason: "blocked" });
  }

  region.prefabDebug = {
    attempts,
    placed: region.prefabInstances.map((entry) => ({ id: entry.id, x: entry.x, y: entry.y })),
    skipped,
  };
  if (DEBUG_MAP_PREFABS) {
    console.info("[map-prefabs]", {
      region: regionConfig?.id ?? region.id,
      layoutId: region.layoutId,
      attempts,
      placed: region.prefabDebug.placed,
      skipped,
    });
  }
  return region.prefabInstances;
}

export function prefabInstancesForChunk(region, chunkBounds) {
  const instances = Array.isArray(region?.prefabInstances) ? region.prefabInstances : [];
  return instances.filter((instance) => boundsOverlap(instance.bounds, chunkBounds));
}

export function normalizePrefabContent(prefab) {
  const fromLegend = prefabContentFromLegend(prefab);
  return {
    objects: [...fromLegend.objects, ...(Array.isArray(prefab?.objects) ? prefab.objects : [])],
    foliage: [...fromLegend.foliage, ...(Array.isArray(prefab?.foliage) ? prefab.foliage : [])],
    decals: [...fromLegend.decals, ...(Array.isArray(prefab?.decals) ? prefab.decals : [])],
    monsters: [...fromLegend.monsters, ...(Array.isArray(prefab?.monsters) ? prefab.monsters : [])],
    chests: [...fromLegend.chests, ...(Array.isArray(prefab?.chests) ? prefab.chests : [])],
    npcs: [...fromLegend.npcs, ...(Array.isArray(prefab?.npcs) ? prefab.npcs : [])],
  };
}

function isValidPrefab(prefab) {
  return Boolean(
    prefab
    && prefab.id
    && Math.floor(Number(prefab.w)) > 0
    && Math.floor(Number(prefab.h)) > 0
  );
}

function findPrefabAnchorCandidates(region, prefab, rules, size) {
  const allowedAnchors = new Set(Array.isArray(rules?.anchors) && rules.anchors.length ? rules.anchors : [prefab.anchor ?? "room"]);
  const preferredAnchor = prefab.anchor ?? "room";
  const anchors = allowedAnchors.has(preferredAnchor)
    ? [preferredAnchor, ...[...allowedAnchors].filter((anchor) => anchor !== preferredAnchor)]
    : [...allowedAnchors];
  const candidates = [];

  for (const anchor of anchors) {
    if (anchor === "room" || anchor === "clearing") {
      for (const room of region.rooms ?? []) {
        candidates.push({
          x: Math.round(room.x - size.w / 2),
          y: Math.round(room.y - size.h / 2),
          anchor,
        });
      }
    }
    if (anchor === "pathSide") {
      const path = region.path ?? [];
      for (let i = 2; i < path.length - 2; i += 2) {
        const prev = path[i - 1];
        const next = path[i + 1];
        const dx = next.x - prev.x;
        const dy = next.y - prev.y;
        const len = Math.hypot(dx, dy) || 1;
        const side = i % 4 === 0 ? 1 : -1;
        const offset = 4.5 * side;
        candidates.push({
          x: Math.round(path[i].x + (-dy / len) * offset - size.w / 2),
          y: Math.round(path[i].y + (dx / len) * offset - size.h / 2),
          anchor,
        });
      }
    }
  }

  return candidates.filter((candidate, index, list) => (
    candidate.x >= 1
    && candidate.y >= 1
    && candidate.x + size.w < region.width - 1
    && candidate.y + size.h < region.height - 1
    && list.findIndex((entry) => entry.x === candidate.x && entry.y === candidate.y) === index
  ));
}

function canPlacePrefab(region, prefab, x, y, options = {}) {
  const size = options.size ?? transformedSize(prefab, options.rotation ?? 0);
  const avoidStart = Math.max(0, Number(prefab.avoidStart) || 0);
  const avoidExit = Math.max(0, Number(prefab.avoidExit) || 0);
  const center = { x: x + size.w / 2, y: y + size.h / 2 };
  if (Math.hypot(center.x - region.start.x, center.y - region.start.y) < avoidStart) {
    return { ok: false, reason: "avoid_start" };
  }
  if (Math.hypot(center.x - region.end.x, center.y - region.end.y) < avoidExit) {
    return { ok: false, reason: "avoid_exit" };
  }
  for (const instance of region.prefabInstances ?? []) {
    const other = { x: instance.x + instance.w / 2, y: instance.y + instance.h / 2 };
    if (Math.hypot(center.x - other.x, center.y - other.y) < options.minDistance) {
      return { ok: false, reason: "too_close" };
    }
    if (boundsOverlap({ x, y, w: size.w, h: size.h }, instance.bounds)) {
      return { ok: false, reason: "overlap" };
    }
  }
  for (let ty = y; ty < y + size.h; ty += 1) {
    for (let tx = x; tx < x + size.w; tx += 1) {
      if (isReservedTile(region, tx, ty)) return { ok: false, reason: "reserved" };
      if (!prefab.clearArea && options.isPointPlayable && !options.isPointPlayable(region, tx + 0.5, ty + 0.5, 0.2)) {
        return { ok: false, reason: "not_playable" };
      }
    }
  }
  return { ok: true };
}

function reservePrefabTiles(region, instance) {
  if (!region.reservedTiles) region.reservedTiles = new Set();
  if (!region.mask) region.mask = new Set();
  const bounds = instance.bounds;
  for (let y = bounds.y; y < bounds.y + bounds.h; y += 1) {
    for (let x = bounds.x; x < bounds.x + bounds.w; x += 1) {
      region.reservedTiles.add(`${x},${y}`);
      if (instance.clearArea) region.mask.add(`${x},${y}`);
    }
  }
}

function buildPrefabInstance(prefab, x, y, rotation, mirrored, index) {
  const size = transformedSize(prefab, rotation);
  const content = normalizePrefabContent(prefab);
  const transformItems = (items = []) => items.map((item) => {
    const local = transformLocalPoint(Number(item.x) || 0, Number(item.y) || 0, prefab.w, prefab.h, rotation, mirrored);
    return { ...item, x: local.x, y: local.y };
  });

  return {
    id: prefab.id,
    label: prefab.label ?? prefab.id,
    instanceId: `${prefab.id}:${index}:${x},${y}`,
    x,
    y,
    w: size.w,
    h: size.h,
    rotation,
    mirrored,
    bounds: { x, y, w: size.w, h: size.h },
    clearArea: Boolean(prefab.clearArea),
    objects: transformItems(content.objects),
    foliage: transformItems(content.foliage),
    decals: transformItems(content.decals),
    monsters: transformItems(content.monsters),
    chests: transformItems(content.chests),
    npcs: transformItems(content.npcs),
  };
}

function prefabContentFromLegend(prefab) {
  const result = { objects: [], foliage: [], decals: [], monsters: [], chests: [], npcs: [] };
  const tiles = Array.isArray(prefab?.tiles) ? prefab.tiles : [];
  const legend = prefab?.legend && typeof prefab.legend === "object" ? prefab.legend : null;
  if (!tiles.length || !legend) return result;

  for (let y = 0; y < tiles.length; y += 1) {
    const row = String(tiles[y] ?? "");
    for (let x = 0; x < row.length; x += 1) {
      const entry = legend[row[x]];
      if (!entry || entry.type === "keep") continue;
      addLegendEntry(result, entry, x, y);
    }
  }
  return result;
}

function addLegendEntry(result, entry, x, y) {
  const base = { x, y };
  if (entry.object) {
    result.objects.push({
      ...base,
      id: entry.object,
      blocking: entry.blocking,
      destructible: entry.destructible,
      size: entry.size,
      radius: entry.radius,
      rotation: entry.rotation,
      visualScale: entry.visualScale,
      variant: entry.variant,
      variantCount: entry.variantCount,
      spawnDamage: entry.spawnDamage ?? entry.damageState ?? entry.damageSpawn,
      spawnTags: entry.spawnTags,
      avoidSpawnTags: entry.avoidSpawnTags,
      spawnAvoidRadius: entry.spawnAvoidRadius,
      foregroundFade: entry.foregroundFade,
      foregroundFadeAlpha: entry.foregroundFadeAlpha,
      actionId: entry.actionId,
      actions: entry.actions,
      questTargetKey: entry.questTargetKey,
    });
  }
  if (entry.foliage) {
    const foliage = typeof entry.foliage === "object" && entry.foliage !== null
      ? entry.foliage
      : { id: entry.foliage };
    result.foliage.push({
      ...base,
      ...foliage,
      id: foliage.id,
      variant: entry.variant ?? foliage.variant,
      cell: entry.cell ?? foliage.cell,
      size: entry.size ?? foliage.size,
      scale: entry.scale ?? foliage.scale,
      rotation: entry.rotation ?? foliage.rotation,
      visualScale: entry.visualScale ?? foliage.visualScale,
    });
  }
  if (entry.decal) {
    result.decals.push({
      ...base,
      type: entry.decal,
      decayId: entry.decayId,
      variant: entry.variant,
      cell: entry.cell,
      size: entry.size,
      rotation: entry.rotation,
      alpha: entry.alpha,
      renderScale: entry.renderScale,
      particles: entry.particles,
    });
  }
  if (entry.monster) {
    result.monsters.push({
      ...base,
      type: entry.monster,
      levelOffset: entry.levelOffset,
    });
  }
  if (entry.chest) {
    result.chests.push({
      ...base,
      id: entry.chest,
      blocking: entry.blocking,
    });
  }
  if (entry.npc || entry.npcId) {
    const npc = typeof (entry.npc ?? entry.npcId) === "object" && (entry.npc ?? entry.npcId) !== null
      ? (entry.npc ?? entry.npcId)
      : { npcId: entry.npc ?? entry.npcId };
    result.npcs.push({
      ...base,
      ...npc,
      npcId: npc.npcId ?? npc.id,
      facing: entry.facing ?? npc.facing,
      actionId: entry.actionId ?? npc.actionId,
      actions: entry.actions ?? npc.actions,
      conditions: entry.conditions ?? npc.conditions,
    });
  }
}

function transformedSize(prefab, rotation) {
  const w = Math.floor(Number(prefab.w)) || 1;
  const h = Math.floor(Number(prefab.h)) || 1;
  return rotation === 90 || rotation === 270 ? { w: h, h: w } : { w, h };
}

function transformLocalPoint(x, y, w, h, rotation, mirrored) {
  let px = mirrored ? w - 1 - x : x;
  let py = y;
  if (rotation === 90) return { x: h - 1 - py, y: px };
  if (rotation === 180) return { x: w - 1 - px, y: h - 1 - py };
  if (rotation === 270) return { x: py, y: w - 1 - px };
  return { x: px, y: py };
}

function boundsOverlap(a, b) {
  if (!a || !b) return false;
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
