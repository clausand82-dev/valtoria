import { MAP_LAYOUTS } from "../config/map-layout-config.js";
import { DEBUG_MAP_PREFABS, MAP_PREFABS } from "../config/map-prefab-config.js";
import { worldEntryAllowed } from "../world-state.js";
import { normalizePrefabContent } from "./prefabs/prefab-normalization.js";
import { buildPrefabGroundOverrideMap, prefabGroundEntries } from "./prefabs/prefab-ground-overrides.js";
import { transformedPrefabSize, transformPrefabEntries } from "./prefabs/prefab-transforms.js";

export { normalizePrefabContent } from "./prefabs/prefab-normalization.js";

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
  region.prefabGroundOverrides = new Map();

  const rules = regionConfig?.prefabRules;
  const conditionContext = regionConfig?.__conditionContext ?? {};
  const worldState = conditionContext.worldState;
  const pool = (Array.isArray(rules?.pool) ? rules.pool : []).filter((entry) => (
    worldEntryAllowed(entry, worldState, {
      ...conditionContext,
      regionId: regionConfig?.id,
      regionConfig,
    })
  ));
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
    const size = transformedPrefabSize(prefab, rotation);
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

  region.prefabGroundOverrides = buildPrefabGroundOverrideMap(region.prefabInstances);

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
  const size = options.size ?? transformedPrefabSize(prefab, options.rotation ?? 0);
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
  const size = transformedPrefabSize(prefab, rotation);
  const content = normalizePrefabContent(prefab);
  const transformItems = (items = []) => transformPrefabEntries(items, prefab, rotation, mirrored);

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
    ground: prefabGroundEntries(prefab, rotation, mirrored),
  };
}

function boundsOverlap(a, b) {
  if (!a || !b) return false;
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
