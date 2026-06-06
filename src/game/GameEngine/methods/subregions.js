import { CHUNK_SIZE } from "../../config/game-constants-config.js";
import { OBJECT_SPAWN_TUNING } from "../../config/spawn-config.js";
import {
  getRegionObjectFamily,
  REGION_OBJECT_DEFS,
  resolveRegionObjectVariantCount,
} from "../../config/region-object-config.js";
import { QUEST_NPCS } from "../../config/npc-config.js";
import { SUBREGION_CONFIG } from "../../config/subregion-config.js";
import { normalizeRegionFoliageSets, normalizeRegionTileset } from "../../config/region-asset-config.js";
import { loadAnimationSheets, loadGeneratedAtlas } from "../../assets.js";
import {
  incrementWorldCounter,
  resolveMapRegionConfig,
  setWorldFlag,
  worldConditionMet,
} from "../../world-state.js";
import {
  chunkKey,
  createId,
  createRegion,
  isRegionPointPlayable,
} from "../../world.js";

function clonePlain(value) {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value));
}

function stringHash(value) {
  const text = String(value ?? "");
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function cleanInstanceId(value) {
  return String(value ?? "unknown").replace(/[^a-zA-Z0-9:_@.,-]/g, "_");
}

function makeRootMapInstanceId(engine) {
  const active = engine.activeMapRegion;
  const regionId = active?.regionId ?? engine.region?.mapRegion?.id ?? engine.region?.id ?? "root";
  return `root:${cleanInstanceId(active?.areaMapId ?? "world")}:${cleanInstanceId(regionId)}:${cleanInstanceId(engine.region?.id ?? engine.region?.seed)}`;
}

function normalizeStack(stack) {
  return Array.isArray(stack)
    ? stack
      .filter((entry) => entry && typeof entry === "object")
      .map((entry) => ({
        mapInstanceId: String(entry.mapInstanceId ?? ""),
        sourceObjectRuntimeId: entry.sourceObjectRuntimeId ? String(entry.sourceObjectRuntimeId) : null,
        returnPlayerPosition: {
          x: Number(entry.returnPlayerPosition?.x) || 0,
          y: Number(entry.returnPlayerPosition?.y) || 0,
          facingX: Number(entry.returnPlayerPosition?.facingX) || 0,
          facingY: Number(entry.returnPlayerPosition?.facingY) || 1,
        },
      }))
      .filter((entry) => entry.mapInstanceId)
    : [];
}

function normalizeMapSnapshots(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key, snapshot]) => key && snapshot && typeof snapshot === "object"));
}

function normalizeSubregionInstances(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key, instance]) => key && instance && typeof instance === "object"));
}

export function normalizeCurrentExpedition(value = null) {
  if (!value || typeof value !== "object") return null;
  const rootMapInstanceId = value.rootMapInstanceId ? String(value.rootMapInstanceId) : null;
  return {
    rootRegionId: value.rootRegionId ? String(value.rootRegionId) : null,
    rootMapId: value.rootMapId ? String(value.rootMapId) : null,
    rootMapInstanceId,
    currentMapInstanceId: value.currentMapInstanceId ? String(value.currentMapInstanceId) : rootMapInstanceId,
    subregionStack: normalizeStack(value.subregionStack),
    subregionInstances: normalizeSubregionInstances(value.subregionInstances),
    mapSnapshots: normalizeMapSnapshots(value.mapSnapshots),
    rootMapSnapshot: value.rootMapSnapshot && typeof value.rootMapSnapshot === "object" ? value.rootMapSnapshot : null,
  };
}

function isSubregionMap(engine) {
  const expedition = engine?.currentExpedition;
  if (!expedition?.rootMapInstanceId || !expedition?.currentMapInstanceId) return false;
  if (expedition.currentMapInstanceId === expedition.rootMapInstanceId) return false;
  const regionId = engine?.region?.mapRegion?.id;
  const instance = expedition.subregionInstances?.[expedition.currentMapInstanceId];
  if (instance) return String(instance.subregionId ?? "") === String(regionId ?? "");
  return Boolean(SUBREGION_CONFIG[regionId]);
}

function currentMapInstanceIdFor(expedition) {
  return expedition?.currentMapInstanceId || expedition?.rootMapInstanceId || null;
}

function loadedSubregionId(engine) {
  const regionId = engine?.region?.mapRegion?.id;
  return SUBREGION_CONFIG[regionId] ? String(regionId) : null;
}

function loadedMapInstanceIdFor(engine, expedition) {
  if (!expedition?.rootMapInstanceId) return null;
  const subregionId = loadedSubregionId(engine);
  if (!subregionId) return expedition.rootMapInstanceId;

  const currentId = currentMapInstanceIdFor(expedition);
  const currentInstance = expedition.subregionInstances?.[currentId];
  if (String(currentInstance?.subregionId ?? "") === subregionId) return currentId;

  const loadedRegionRuntimeId = engine?.region?.id ? String(engine.region.id) : null;
  const matches = Object.entries(expedition.subregionInstances ?? {})
    .filter(([, instance]) => String(instance?.subregionId ?? "") === subregionId)
    .sort((a, b) => {
      const aRegionMatch = loadedRegionRuntimeId && String(a[1]?.mapSnapshot?.regionId ?? "") === loadedRegionRuntimeId ? 1 : 0;
      const bRegionMatch = loadedRegionRuntimeId && String(b[1]?.mapSnapshot?.regionId ?? "") === loadedRegionRuntimeId ? 1 : 0;
      if (aRegionMatch !== bRegionMatch) return bRegionMatch - aRegionMatch;
      return Number(b[1]?.updatedAt ?? b[1]?.createdAt ?? 0) - Number(a[1]?.updatedAt ?? a[1]?.createdAt ?? 0);
    });
  return matches[0]?.[0] ?? null;
}

function legacyReturnEntryFor(expedition, currentMapInstanceId) {
  const legacyEntry = expedition?.subregionInstances?.[currentMapInstanceId]?.lastReturnEntry;
  if (!legacyEntry?.mapInstanceId) return null;
  return {
    mapInstanceId: String(legacyEntry.mapInstanceId),
    sourceObjectRuntimeId: legacyEntry.sourceObjectRuntimeId ? String(legacyEntry.sourceObjectRuntimeId) : null,
    returnPlayerPosition: legacyEntry.returnPlayerPosition ? { ...legacyEntry.returnPlayerPosition } : null,
  };
}

function repairLoadedSubregionMapId(engine, expedition) {
  const subregionId = loadedSubregionId(engine);
  if (!subregionId) return null;
  const currentId = currentMapInstanceIdFor(expedition);
  const repairedId = loadedMapInstanceIdFor(engine, expedition);
  if (!repairedId) return null;
  expedition.currentMapInstanceId = repairedId;
  engine.currentMapInstanceId = repairedId;
  if (repairedId !== currentId) {
    console.warn("[subregions] Repaired currentMapInstanceId from loaded subregion map", {
      loadedSubregionId: subregionId,
      repairedId,
      previousId: currentId,
    });
  }
  return repairedId;
}

function transitionLabelFor(regionConfig, fallback = "Subregion") {
  return regionConfig?.label ?? regionConfig?.id ?? fallback;
}

function serializeChunk(chunk) {
  return {
    key: chunk.key,
    cx: chunk.cx,
    cy: chunk.cy,
    x: chunk.x,
    y: chunk.y,
    level: chunk.level,
    tiles: clonePlain(chunk.tiles ?? []),
    edgeTiles: clonePlain(chunk.edgeTiles ?? []),
    decals: clonePlain(chunk.decals ?? []),
    objects: clonePlain(chunk.objects ?? []),
    monsters: clonePlain(chunk.monsters ?? []),
    npcs: clonePlain(chunk.npcs ?? []),
  };
}

function regionTilesetSheetIds(regionConfig) {
  const normalized = normalizeRegionTileset(regionConfig?.tileset);
  const entries = Array.isArray(normalized) ? normalized : (normalized ? [normalized] : []);
  return new Set(entries.map((entry) => entry.sheetId).filter(Boolean));
}

function snapshotTilesMatchConfig(snapshot) {
  const expectedSheetIds = regionTilesetSheetIds(snapshot?.regionConfig);
  if (!expectedSheetIds.size) return true;
  for (const chunk of snapshot?.chunks ?? []) {
    for (const tile of chunk.tiles ?? []) {
      if (tile?.groundSheetId) return expectedSheetIds.has(tile.groundSheetId);
    }
  }
  return false;
}

function subregionSnapshotUsable(snapshot, subregionId) {
  if (!snapshot || typeof snapshot !== "object") return false;
  if (String(snapshot.regionConfig?.id ?? "") !== String(subregionId ?? "")) return false;
  if (!Array.isArray(snapshot.chunks) || !snapshot.chunks.length) return false;
  return snapshotTilesMatchConfig(snapshot);
}

function restoreChunk(snapshot, region) {
  return {
    ...clonePlain(snapshot),
    key: snapshot.key ?? chunkKey(snapshot.cx, snapshot.cy),
    region,
    tiles: clonePlain(snapshot.tiles ?? []),
    edgeTiles: clonePlain(snapshot.edgeTiles ?? []),
    decals: clonePlain(snapshot.decals ?? []),
    objects: clonePlain(snapshot.objects ?? []),
    monsters: clonePlain(snapshot.monsters ?? []),
    npcs: clonePlain(snapshot.npcs ?? []),
  };
}

function regionConfigForSnapshot(region) {
  const config = region?.sourceRegionConfig
    ? clonePlain(region.sourceRegionConfig)
    : region?.mapRegion
      ? clonePlain(region.mapRegion)
      : null;
  if (config && typeof config === "object") {
    delete config.__conditionContext;
    delete config.__subregionContext;
  }
  return config;
}

function ensureRuntimeObjectAssets(region, chunks) {
  const mapRegion = region?.mapRegion;
  if (!mapRegion) return;
  const objects = Array.isArray(mapRegion.objects) ? mapRegion.objects : [];
  const known = new Set(objects.map((entry) => String(entry?.id ?? entry?.objectId ?? "").trim()).filter(Boolean));
  const missing = [];
  for (const chunk of chunks ?? []) {
    for (const object of chunk?.objects ?? []) {
      const objectDefId = String(object?.objectDefId ?? "").trim();
      if (!objectDefId || known.has(objectDefId) || !REGION_OBJECT_DEFS[objectDefId]) continue;
      known.add(objectDefId);
      missing.push({ id: objectDefId, weight: 1 });
    }
  }
  if (!missing.length) return;
  mapRegion.objects = [...objects, ...missing];
  region.sourceRegionConfig = clonePlain(mapRegion);
}

function foliageSetFromSheetId(sheetId) {
  const match = /^foliage-custom:(.*):(\d+)x(\d+)$/i.exec(String(sheetId ?? ""));
  if (!match) return null;
  return {
    fileName: match[1],
    rows: Number(match[2]),
    cols: Number(match[3]),
    weight: 1,
  };
}

function roleFoliageEntries(entries) {
  return (entries ?? [])
    .filter((entry) => entry?.placementRole && (entry.fileName || entry.foliageSet || entry.foilageSet))
    .map((entry) => clonePlain(entry));
}

function mergeFoliageEntries(existing, additions) {
  const merged = [...(Array.isArray(existing) ? existing : [])];
  const sheetIdFor = (entry) => normalizeRegionFoliageSets({ foliageSet: entry })[0]?.sheetId ?? "";
  const seen = new Set(merged.map(sheetIdFor).filter(Boolean));
  for (const entry of additions ?? []) {
    const sheetId = sheetIdFor(entry);
    if (!sheetId || seen.has(sheetId)) continue;
    seen.add(sheetId);
    merged.push(clonePlain(entry));
  }
  return merged;
}

function ensureRuntimeFoliageAssets(region, chunks) {
  const mapRegion = region?.mapRegion;
  if (!mapRegion) return;
  const additions = [];
  const known = new Set((mapRegion.foliage ?? [])
    .map((entry) => normalizeRegionFoliageSets({ foliageSet: entry })[0]?.sheetId ?? "")
    .filter(Boolean));
  for (const chunk of chunks ?? []) {
    for (const object of chunk?.objects ?? []) {
      if (object?.type !== "foliage") continue;
      const sheetId = String(object.foliageSheet ?? "").trim();
      if (!sheetId || known.has(sheetId)) continue;
      const raw = foliageSetFromSheetId(sheetId);
      const normalized = raw ? normalizeRegionFoliageSets({ foliageSet: raw })[0] : null;
      if (!normalized) continue;
      known.add(sheetId);
      additions.push(raw);
    }
  }
  if (!additions.length) return;
  mapRegion.foliage = mergeFoliageEntries(mapRegion.foliage, additions);
  region.sourceRegionConfig = clonePlain(mapRegion);
}

function subregionAsMapRegionConfig(config, context) {
  return {
    ...config,
    label: config.label ?? config.id,
    areaMapId: context.rootMapId ?? "subregion",
    mapSize: config.mapSize ?? "small",
  };
}

function firstSpawnType(objectDefId) {
  const def = REGION_OBJECT_DEFS[objectDefId];
  const spawnTypes = Array.isArray(def?.spawnTypes) ? def.spawnTypes : [];
  return spawnTypes[0]?.type ?? null;
}

function makeRuntimeObject(region, entry, x, y, salt) {
  const objectDefId = entry.id ?? entry.objectDefId;
  const def = REGION_OBJECT_DEFS[objectDefId];
  const type = firstSpawnType(objectDefId);
  if (!def || !type) return null;
  const tuning = OBJECT_SPAWN_TUNING[type]
    ?? OBJECT_SPAWN_TUNING[getRegionObjectFamily(type)]
    ?? OBJECT_SPAWN_TUNING.default;
  return {
    id: createId(),
    runtimeId: `${region.id}:subregion-role:${entry.placementRole ?? "object"}:${salt}:${objectDefId}`,
    objectDefId,
    type,
    x,
    y,
    radius: Number(entry.radius) || tuning.radius,
    size: Number(entry.size) || tuning.sizeBase,
    rotation: Number(entry.rotation) || 0,
    colorShift: 0,
    flip: false,
    treeVariant: Number.isFinite(Number(entry.variant))
      ? Math.max(0, Math.floor(Number(entry.variant)))
      : Math.abs(salt) % resolveRegionObjectVariantCount(type),
    animSeed: salt,
    visualScale: Number(entry.visualScale) || 1,
    blocking: entry.blocking ?? !entry.actionId,
    destructible: false,
    renderBiomeId: def.renderBiomeId ?? null,
    graphicsRef: def.graphicsRef ?? null,
    particles: clonePlain(def.particles ?? []),
    effects: def.effects ? { ...def.effects } : null,
    depthMode: entry.depthMode ?? def.depthMode ?? "dynamic",
    sortAnchor: entry.sortAnchor ? { ...entry.sortAnchor } : def.sortAnchor ? { ...def.sortAnchor } : { x: 0.5, y: 1 },
    depthOffset: Number.isFinite(Number(entry.depthOffset))
      ? Number(entry.depthOffset)
      : Number.isFinite(Number(def.depthOffset))
        ? Number(def.depthOffset)
        : 0,
    tags: Array.isArray(entry.tags) ? [...entry.tags] : Array.isArray(def.tags) ? [...def.tags] : [],
    factionId: entry.factionId ?? def.factionId ?? null,
    onDestroyed: entry.onDestroyed ? { ...entry.onDestroyed } : def.onDestroyed ? { ...def.onDestroyed } : null,
    actionId: entry.actionId ?? null,
    actions: Array.isArray(entry.actions) ? entry.actions.map((item) => ({ ...item })) : null,
    defaultActionId: def.defaultActionId ?? null,
  };
}

function makeRuntimeFoliage(region, entry, x, y, salt) {
  const foliage = normalizeRegionFoliageSets({ foliageSet: entry })[0] ?? null;
  if (!foliage?.sheetId) return null;
  const fixedScale = Number(entry.scale ?? foliage.scale);
  const hasFixedScale = Number.isFinite(fixedScale) && fixedScale > 0;
  const variantCount = Math.max(1, Number(foliage.variantCount) || 16);
  return {
    id: createId(),
    runtimeId: `${region.id}:subregion-role:${entry.placementRole ?? "foliage"}:${salt}:${foliage.sheetId}`,
    type: "foliage",
    x,
    y,
    radius: Number(entry.radius) || 0,
    size: hasFixedScale ? fixedScale : Number(entry.size) || 0.72,
    rotation: Number(entry.rotation) || 0,
    colorShift: 0,
    flip: false,
    foliageVariant: Number.isFinite(Number(entry.cell))
      ? Math.max(0, Math.floor(Number(entry.cell)) - 1)
      : Number.isFinite(Number(entry.variant))
        ? Math.max(0, Math.floor(Number(entry.variant)))
        : Math.abs(salt) % variantCount,
    foliageSheet: foliage.sheetId,
    animSeed: salt,
    visualScale: hasFixedScale ? 1 : Number(entry.visualScale) || 1,
    wind: Number.isFinite(Number(entry.wind)) ? Number(entry.wind) : 0,
    resourceDrops: foliage.resourceDrops ?? [],
    particles: clonePlain(entry.particles ?? foliage.particles ?? []),
    depthMode: entry.depthMode ?? foliage.depthMode ?? "ground",
    sortAnchor: entry.sortAnchor ? { ...entry.sortAnchor } : foliage.sortAnchor ? { ...foliage.sortAnchor } : { x: 0.5, y: 1 },
    depthOffset: Number.isFinite(Number(entry.depthOffset))
      ? Number(entry.depthOffset)
      : Number.isFinite(Number(foliage.depthOffset))
        ? Number(foliage.depthOffset)
        : 0,
    foliageLooted: false,
    blocking: false,
    actionId: entry.actionId ? String(entry.actionId) : foliage.actionId ?? null,
    actions: Array.isArray(entry.actions) ? entry.actions.map((item) => ({ ...item })) : null,
    questTargetKey: entry.questTargetKey ? String(entry.questTargetKey) : foliage.questTargetKey ?? null,
    tags: Array.isArray(entry.tags) ? [...entry.tags] : [],
  };
}

function findValidPointNear(region, origin, minDistance = 0, maxRadius = 8) {
  const base = origin ?? region?.start ?? { x: 2, y: 2 };
  let best = null;
  let bestDistance = Infinity;
  for (let r = 0; r <= maxRadius; r += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      for (let dy = -r; dy <= r; dy += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = Math.max(1, Math.min((region?.width ?? 4) - 2, Math.round(base.x + dx) + 0.5));
        const y = Math.max(1, Math.min((region?.height ?? 4) - 2, Math.round(base.y + dy) + 0.5));
        const distanceFromStart = Math.hypot(x - (region?.start?.x ?? base.x), y - (region?.start?.y ?? base.y));
        if (distanceFromStart < minDistance) continue;
        if (!isRegionPointPlayable(region, x, y, 0.45)) continue;
        const distanceFromBase = Math.hypot(x - base.x, y - base.y);
        if (distanceFromBase < bestDistance) {
          best = { x, y };
          bestDistance = distanceFromBase;
        }
      }
    }
    if (best) return best;
  }
  return { x: region?.start?.x ?? 2, y: region?.start?.y ?? 2 };
}

function findPlayerPointNearObject(region, object) {
  const origin = object ? { x: object.x, y: object.y } : region?.start;
  const minObjectDistance = Math.max(0.95, Number(object?.radius) || 0);
  for (let r = 1; r <= 6; r += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      for (let dy = -r; dy <= r; dy += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = Math.max(1, Math.min((region?.width ?? 4) - 2, Math.round((origin?.x ?? 2) + dx) + 0.5));
        const y = Math.max(1, Math.min((region?.height ?? 4) - 2, Math.round((origin?.y ?? 2) + dy) + 0.5));
        if (Math.hypot(x - (origin?.x ?? x), y - (origin?.y ?? y)) < minObjectDistance) continue;
        if (isRegionPointPlayable(region, x, y, 0.45)) return { x, y };
      }
    }
  }
  return findValidPointNear(region, origin, 0, 6);
}

function chunkForPoint(engine, point) {
  const cx = Math.floor(point.x / CHUNK_SIZE);
  const cy = Math.floor(point.y / CHUNK_SIZE);
  return engine.getChunk(cx, cy);
}

function makeRuntimeNpc(region, entry, x, y, salt) {
  const npcId = String(entry.npcId ?? entry.id ?? "").trim();
  const def = QUEST_NPCS[npcId];
  if (!def) {
    console.warn(`[subregions] Unknown NPC id: ${npcId || "(empty)"}`);
    return null;
  }
  return {
    id: createId(),
    runtimeId: `${region.id}:subregion-npc:${entry.placementRole ?? "fixed"}:${salt}:${npcId}`,
    type: "npc",
    npcId,
    name: def.name,
    title: def.title,
    imageUrl: def.imageUrl,
    x,
    y,
    radius: Number(entry.radius) || 0.45,
    facing: entry.facing ?? "south",
    facingX: 0,
    facingY: 1,
    bob: Math.abs(salt) % 1000,
    actionId: entry.actionId ? String(entry.actionId) : null,
    actions: Array.isArray(entry.actions) ? entry.actions.map((item) => ({ ...item })) : null,
    defaultActionId: def.defaultActionId ? String(def.defaultActionId) : null,
    defaultActions: Array.isArray(def.defaultActions) ? def.defaultActions.map((item) => ({ ...item })) : null,
  };
}

function findObjectByRuntimeId(engine, runtimeId) {
  if (!runtimeId) return null;
  for (const chunk of engine.chunks.values()) {
    const found = chunk.objects?.find((object) => String(object.runtimeId ?? "") === String(runtimeId));
    if (found) return found;
  }
  return null;
}

function placeNearObjectOrPosition(engine, sourceObjectRuntimeId, fallbackPosition) {
  if (
    fallbackPosition
    && isRegionPointPlayable(engine.region, fallbackPosition.x, fallbackPosition.y, 0.45)
  ) {
    engine.player.x = fallbackPosition.x;
    engine.player.y = fallbackPosition.y;
    engine.player.facingX = fallbackPosition.facingX ?? engine.player.facingX;
    engine.player.facingY = fallbackPosition.facingY ?? engine.player.facingY;
    engine.player.target = null;
    engine.player.attackTargetId = null;
    engine.player.attackObjectId = null;
    engine.pointer.worldX = fallbackPosition.x;
    engine.pointer.worldY = fallbackPosition.y;
    engine.updateCamera(1);
    return;
  }
  const object = findObjectByRuntimeId(engine, sourceObjectRuntimeId);
  const origin = object ? { x: object.x, y: object.y } : fallbackPosition;
  const point = object ? findPlayerPointNearObject(engine.region, object) : findValidPointNear(engine.region, origin, 0, 5);
  engine.player.x = point.x;
  engine.player.y = point.y;
  engine.player.facingX = fallbackPosition?.facingX ?? engine.player.facingX;
  engine.player.facingY = fallbackPosition?.facingY ?? engine.player.facingY;
  engine.player.target = null;
  engine.player.attackTargetId = null;
  engine.player.attackObjectId = null;
  engine.pointer.worldX = point.x;
  engine.pointer.worldY = point.y;
  engine.updateCamera(1);
}

function subregionClearKey(instanceId, subregionId, onClear = {}) {
  const explicit = String(onClear.key ?? onClear.id ?? "").trim();
  return explicit || `subregion:${cleanInstanceId(instanceId)}:${cleanInstanceId(subregionId)}:cleared`;
}

function applySubregionOnClear(engine, instanceId) {
  const expedition = engine.currentExpedition;
  const instance = expedition?.subregionInstances?.[instanceId];
  const subregionId = instance?.subregionId ?? loadedSubregionId(engine);
  const raw = SUBREGION_CONFIG[subregionId];
  const onClear = raw?.onClear;
  if (!instance || !raw || !onClear || typeof onClear !== "object") return false;
  if (!engine.allRegionMonstersCleared?.()) return false;
  const key = subregionClearKey(instanceId, subregionId, onClear);
  if (onClear.once !== false && engine.worldState?.flags?.[key]) return false;

  let changed = false;
  let next = engine.worldState;
  if (onClear.once !== false) {
    next = setWorldFlag(next, key, true);
    changed = true;
  }
  for (const flag of onClear.setFlags ?? []) {
    next = setWorldFlag(next, flag, true);
    changed = true;
  }
  for (const flag of onClear.clearFlags ?? []) {
    next = setWorldFlag(next, flag, false);
    changed = true;
  }
  for (const [counter, amount] of Object.entries(onClear.addCounters ?? {})) {
    next = incrementWorldCounter(next, counter, amount);
    changed = true;
  }
  engine.worldState = next;
  if (onClear.questStepComplete) changed = Boolean(engine.advanceQuestProgress?.(onClear.questStepComplete)) || changed;
  if (onClear.questAdvance) changed = Boolean(engine.advanceQuestProgress?.(onClear.questAdvance)) || changed;
  changed = Boolean(engine.refreshQuestStepProgress?.()) || changed;
  if (onClear.message) engine.addToast?.(String(onClear.message));
  return changed;
}

export const subregionMethods = {
  applyCurrentSubregionClear() {
    if (!isSubregionMap(this)) return false;
    const expedition = normalizeCurrentExpedition(this.currentExpedition);
    this.currentExpedition = expedition;
    if (!expedition) return false;
    const currentMapInstanceId = repairLoadedSubregionMapId(this, expedition) ?? currentMapInstanceIdFor(expedition);
    if (!currentMapInstanceId || currentMapInstanceId === expedition?.rootMapInstanceId) return false;
    const changed = applySubregionOnClear(this, currentMapInstanceId);
    if (changed) {
      this.updateNearbyActionTarget?.();
      this.publishSnapshot?.();
      this.saveProgress?.({ force: true });
    }
    return changed;
  },

  setSubregionTransition(active, patch = {}) {
    this.subregionTransition = active ? {
      active: true,
      title: patch.title ?? "Loading subregion",
      label: patch.label ?? "Loading map",
      detail: patch.detail ?? "",
      percent: Math.max(0, Math.min(100, Math.floor(Number(patch.percent) || 0))),
    } : null;
    this.publishSnapshot?.();
  },

  refreshCurrentRegionAssets() {
    const regionConfig = this.region?.mapRegion ?? null;
    return Promise.all([
      loadGeneratedAtlas(regionConfig),
      loadAnimationSheets(regionConfig),
    ]).then(([atlas, animationSheets]) => {
      this.atlas = atlas;
      this.animationSheets = animationSheets;
      for (const chunk of this.chunks?.values?.() ?? []) {
        chunk.terrainLayer = null;
      }
    });
  },

  refreshCurrentRegionAssetsLater() {
    this.refreshCurrentRegionAssets?.().catch((error) => {
      console.warn("[subregions] Failed to refresh subregion assets", error);
    });
  },

  ensureCurrentExpedition() {
    this.currentExpedition = normalizeCurrentExpedition(this.currentExpedition);
    if (this.currentExpedition?.rootMapInstanceId) return this.currentExpedition;
    const rootMapInstanceId = makeRootMapInstanceId(this);
    this.currentExpedition = {
      rootRegionId: this.activeMapRegion?.regionId ?? this.region?.mapRegion?.id ?? this.region?.id ?? null,
      rootMapId: this.activeMapRegion?.areaMapId ?? this.region?.mapRegion?.areaMapId ?? "world",
      rootMapInstanceId,
      currentMapInstanceId: rootMapInstanceId,
      subregionStack: [],
      subregionInstances: {},
      mapSnapshots: {},
      rootMapSnapshot: null,
    };
    return this.currentExpedition;
  },

  captureCurrentMapSnapshot() {
    return {
      capturedAt: Date.now(),
      regionIndex: this.regionIndex,
      regionSeed: this.region?.seed ?? null,
      regionId: this.region?.id ?? null,
      regionConfig: regionConfigForSnapshot(this.region),
      activeMapRegion: this.activeMapRegion ? { ...this.activeMapRegion } : null,
      player: {
        x: this.player.x,
        y: this.player.y,
        facingX: this.player.facingX,
        facingY: this.player.facingY,
      },
      chunks: [...this.chunks.values()].map(serializeChunk),
      loots: clonePlain(this.loots ?? []),
    };
  },

  storeCurrentMapSnapshot(mapInstanceId = null) {
    const expedition = this.ensureCurrentExpedition();
    let id = mapInstanceId ?? currentMapInstanceIdFor(expedition);
    if (!id) return null;
    const loadedId = loadedMapInstanceIdFor(this, expedition);
    if (loadedId && id !== loadedId) {
      console.warn("[subregions] Redirected snapshot save to loaded map slot", {
        requestedId: id,
        loadedId,
        loadedRegionId: this.region?.mapRegion?.id ?? null,
      });
      id = loadedId;
      expedition.currentMapInstanceId = loadedId;
      this.currentMapInstanceId = loadedId;
    }
    const snapshot = this.captureCurrentMapSnapshot();
    expedition.mapSnapshots[id] = snapshot;
    if (id === expedition.rootMapInstanceId) expedition.rootMapSnapshot = snapshot;
    const instance = expedition.subregionInstances[id];
    if (instance) {
      instance.mapSnapshot = snapshot;
      instance.updatedAt = Date.now();
    }
    return snapshot;
  },

  restoreMapSnapshot(snapshot) {
    if (!snapshot) return false;
    const regionConfig = snapshot.regionConfig ?? null;
    this.regionIndex = Math.max(1, Math.floor(Number(snapshot.regionIndex) || this.regionIndex || 1));
    this.activeMapRegion = snapshot.activeMapRegion ? { ...snapshot.activeMapRegion } : null;
    this.region = createRegion(this.regionIndex, Math.floor(Number(snapshot.regionSeed) || Date.now()), null, regionConfig);
    if (regionConfig) this.region.sourceRegionConfig = clonePlain(regionConfig);
    this.resetRegionRuntime();
    this.chunks.clear();
    this.monsters.clear();
    for (const chunkSnapshot of snapshot.chunks ?? []) {
      const chunk = restoreChunk(chunkSnapshot, this.region);
      if (!Array.isArray(chunk.npcs)) chunk.npcs = [];
      this.chunks.set(chunk.key, chunk);
      for (const monster of chunk.monsters ?? []) {
        if (monster?.id) this.monsters.set(monster.id, monster);
      }
    }
    ensureRuntimeObjectAssets(this.region, this.chunks.values());
    ensureRuntimeFoliageAssets(this.region, this.chunks.values());
    this.loots = clonePlain(snapshot.loots ?? []);
    this.exitPromptOpen = false;
    this.exitPromptCooldown = 0;
    this.refreshCurrentRegionAssetsLater?.();
    return true;
  },

  resolveSubregionConfig(subregionId, source = {}) {
    const raw = SUBREGION_CONFIG[subregionId];
    if (!raw) return null;
    const expedition = this.ensureCurrentExpedition();
    const context = {
      rootRegionId: expedition.rootRegionId,
      rootMapId: expedition.rootMapId,
      rootMapInstanceId: expedition.rootMapInstanceId,
      sourceRegionId: source.sourceRegionId ?? this.region?.mapRegion?.id ?? null,
      sourceMapId: source.sourceMapId ?? expedition.currentMapInstanceId,
      sourceObjectId: source.sourceObjectId ?? null,
      sourceObjectRuntimeId: source.sourceObjectRuntimeId ?? null,
      subregionId: raw.id,
      subregionKind: raw.kind,
      subregionDepth: expedition.subregionStack.length + 1,
      worldState: this.worldState,
      worldEnergy: this.worldEnergy,
      questState: this.questState,
      player: this.player,
      inventory: this.player?.inventory,
      activeMapRegion: this.activeMapRegion,
      stats: { player: this.player, worldState: this.worldState },
    };
    return {
      ...resolveMapRegionConfig(subregionAsMapRegionConfig(raw, context), this.worldState, context),
      __subregionRaw: raw,
      __subregionContext: context,
      __conditionContext: context,
    };
  },

  subregionInstanceIdFor(action, target) {
    const expedition = this.ensureCurrentExpedition();
    const subregionId = action.targetSubregionId;
    const scope = action.instanceScope ?? "sourceObject";
    if (scope !== "sourceObject") {
      console.warn(`[subregions] Unsupported instanceScope '${scope}', falling back to sourceObject`);
    }
    const sourceId = target?.runtimeId ?? target?.id ?? `${target?.objectDefId ?? "object"}@${target?.x ?? 0},${target?.y ?? 0}`;
    if (!target?.runtimeId && !target?.id) {
      console.warn("[subregions] Source object is missing runtime id; using fallback instance id", {
        actionId: action?.id ?? null,
        targetSubregionId: subregionId,
        objectDefId: target?.objectDefId ?? target?.type ?? null,
        x: target?.x ?? null,
        y: target?.y ?? null,
      });
    }
    return `${cleanInstanceId(expedition.rootMapInstanceId)}:${cleanInstanceId(sourceId)}:${cleanInstanceId(subregionId)}`;
  },

  placeSubregionRoleObjects(config) {
    const objectRoleEntries = (config.objects ?? []).filter((entry) => entry?.placementRole && entry.id);
    const foliageRoleEntries = roleFoliageEntries(config.foliage);
    const roleEntries = [
      ...objectRoleEntries.map((entry) => ({ ...entry, __roleKind: "object" })),
      ...foliageRoleEntries.map((entry) => ({ ...entry, __roleKind: "foliage" })),
    ];
    roleEntries.forEach((entry, index) => {
      const role = String(entry.placementRole);
      const origin = role === "farFromEntry" ? this.region.end : this.region.start;
      const minDistance = role === "farFromEntry" ? Math.max(8, Math.min(this.region.width, this.region.height) * 0.32) : 0;
      const point = findValidPointNear(this.region, origin, minDistance, Math.max(this.region.width, this.region.height));
      const salt = index + stringHash(`${this.region.id}:${entry.id ?? entry.fileName ?? "foliage"}:${role}`);
      const object = entry.__roleKind === "object"
        ? makeRuntimeObject(this.region, entry, point.x, point.y, salt)
        : makeRuntimeFoliage(this.region, entry, point.x, point.y, salt);
      if (!object) {
        console.warn(`[subregions] Could not place role object '${entry.id ?? entry.fileName ?? "(unknown)"}' in ${config.id}`);
        return;
      }
      chunkForPoint(this, point).objects.push(object);
    });
  },

  placeSubregionNpcs(config) {
    const context = config.__subregionContext ?? {};
    const entries = Array.isArray(config.npcs) ? config.npcs : [];
    entries.forEach((entry, index) => {
      if (!entry || typeof entry !== "object") return;
      if (entry.conditions && !worldConditionMet(entry.conditions, this.worldState, context)) return;
      const role = entry.placementRole ? String(entry.placementRole) : null;
      const origin = Number.isFinite(Number(entry.x)) && Number.isFinite(Number(entry.y))
        ? { x: Number(entry.x), y: Number(entry.y) }
        : role === "farFromEntry"
          ? this.region.end
          : this.region.start;
      const minDistance = role === "farFromEntry" ? Math.max(8, Math.min(this.region.width, this.region.height) * 0.32) : 0;
      const point = Number.isFinite(Number(entry.x)) && Number.isFinite(Number(entry.y))
        ? findValidPointNear(this.region, origin, 0, 3)
        : findValidPointNear(this.region, origin, minDistance, Math.max(this.region.width, this.region.height));
      const npc = makeRuntimeNpc(this.region, entry, point.x, point.y, index + stringHash(`${this.region.id}:${entry.npcId ?? entry.id}:${role ?? "fixed"}`));
      if (!npc) return;
      const chunk = chunkForPoint(this, point);
      if (!Array.isArray(chunk.npcs)) chunk.npcs = [];
      chunk.npcs.push(npc);
    });
  },

  createSubregionInstance(instanceId, subregionConfig, action, target) {
    const expedition = this.ensureCurrentExpedition();
    const seed = stringHash(`${instanceId}:${subregionConfig.id}`);
    this.regionIndex += 1;
    const rootActiveMapRegion = this.activeMapRegion ? { ...this.activeMapRegion } : null;
    const generatorConfig = {
      ...subregionConfig,
      objects: (subregionConfig.objects ?? []).filter((entry) => !entry?.placementRole),
    };
    this.region = createRegion(this.regionIndex, seed, null, generatorConfig);
    this.region.sourceRegionConfig = clonePlain(generatorConfig);
    this.activeMapRegion = rootActiveMapRegion;
    this.resetRegionRuntime();
    this.ensureFullRegionGenerated();
    const runtimeRegionConfig = clonePlain(this.region.mapRegion ?? generatorConfig);
    runtimeRegionConfig.objects = [
      ...(runtimeRegionConfig.objects ?? []),
      ...(subregionConfig.objects ?? []).filter((entry) => entry?.placementRole).map((entry) => clonePlain(entry)),
    ];
    runtimeRegionConfig.foliage = mergeFoliageEntries(
      runtimeRegionConfig.foliage,
      roleFoliageEntries(subregionConfig.foliage),
    );
    this.region.mapRegion = runtimeRegionConfig;
    this.region.sourceRegionConfig = clonePlain(runtimeRegionConfig);
    this.placeSubregionRoleObjects(subregionConfig);
    this.placeSubregionNpcs(subregionConfig);
    const snapshot = this.captureCurrentMapSnapshot();
    const instance = {
      id: instanceId,
      subregionId: subregionConfig.id,
      kind: subregionConfig.kind ?? subregionConfig.__subregionRaw?.kind ?? "subregion",
      sourceRegionId: subregionConfig.__subregionContext?.sourceRegionId ?? expedition.rootRegionId,
      sourceMapId: subregionConfig.__subregionContext?.sourceMapId ?? expedition.currentMapInstanceId,
      sourceObjectId: target?.objectDefId ?? target?.type ?? null,
      sourceObjectRuntimeId: target?.runtimeId ?? target?.id ?? null,
      seed,
      persistence: action.persistence ?? subregionConfig.persistence ?? "whileRootRegionActive",
      mapSnapshot: snapshot,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastReturnEntry: null,
    };
    expedition.subregionInstances[instanceId] = instance;
    expedition.mapSnapshots[instanceId] = snapshot;
    return instance;
  },

  placePlayerAtSubregionEntry() {
    let entryObject = null;
    for (const chunk of this.chunks.values()) {
      entryObject = chunk.objects?.find((object) => object?.actionId === "exit_subregion") ?? entryObject;
      if (entryObject) break;
    }
    const origin = entryObject ? { x: entryObject.x, y: entryObject.y } : this.region?.start;
    const point = entryObject ? findPlayerPointNearObject(this.region, entryObject) : findValidPointNear(this.region, origin, 0, 5);
    this.player.x = point.x;
    this.player.y = point.y;
    this.player.target = null;
    this.player.attackTargetId = null;
    this.player.attackObjectId = null;
    this.pointer.worldX = point.x;
    this.pointer.worldY = point.y;
    this.exitPromptOpen = false;
    this.exitPromptCooldown = 0;
    this.updateCamera(1);
  },

  enterSubregionFromAction(action, target) {
    const subregionId = action?.targetSubregionId;
    if (!subregionId) {
      console.warn("[subregions] enterSubregion missing targetSubregionId", action?.id);
      this.addToast?.("Subregion mangler target");
      return { ok: false, changed: false, reason: "missing_target_subregion" };
    }
    if (!SUBREGION_CONFIG[subregionId]) {
      console.warn(`[subregions] Unknown subregion '${subregionId}'`);
      this.addToast?.("Subregion mangler config");
      return { ok: false, changed: false, reason: "unknown_subregion" };
    }

    const expedition = this.ensureCurrentExpedition();
    const loadedId = loadedMapInstanceIdFor(this, expedition);
    if (loadedId && loadedId !== currentMapInstanceIdFor(expedition)) {
      expedition.currentMapInstanceId = loadedId;
      this.currentMapInstanceId = loadedId;
    }
    if (!loadedSubregionId(this) && currentMapInstanceIdFor(expedition) !== expedition.rootMapInstanceId) {
      console.warn("[subregions] Reset stale subregion map id while loaded map is root", {
        staleId: expedition.currentMapInstanceId,
        rootMapInstanceId: expedition.rootMapInstanceId,
      });
      expedition.currentMapInstanceId = expedition.rootMapInstanceId;
      expedition.subregionStack = [];
      this.currentMapInstanceId = expedition.rootMapInstanceId;
    }
    const previousMapInstanceId = currentMapInstanceIdFor(expedition);
    const previousSnapshot = this.storeCurrentMapSnapshot(previousMapInstanceId);
    if (previousMapInstanceId === expedition.rootMapInstanceId && previousSnapshot) {
      expedition.rootMapSnapshot = previousSnapshot;
    }
    const returnPlayerPosition = {
      x: this.player.x,
      y: this.player.y,
      facingX: this.player.facingX,
      facingY: this.player.facingY,
    };
    const sourceObjectRuntimeId = target?.runtimeId ?? target?.id ?? null;
    if (!sourceObjectRuntimeId) {
      console.warn("[subregions] enterSubregion missing source object runtime id", {
        actionId: action?.id ?? null,
        targetSubregionId: subregionId,
        targetId: target?.objectDefId ?? target?.type ?? null,
      });
    }
    const returnEntry = { mapInstanceId: previousMapInstanceId, sourceObjectRuntimeId, returnPlayerPosition };
    expedition.subregionStack.push(returnEntry);

    const instanceId = this.subregionInstanceIdFor(action, target);
    let instance = expedition.subregionInstances[instanceId];
    const title = transitionLabelFor(SUBREGION_CONFIG[subregionId], "Subregion");
    this.setSubregionTransition?.(true, {
      title: "Loading subregion",
      label: title,
      detail: "Preparing nested map",
      percent: 15,
    });
    expedition.currentMapInstanceId = instanceId;
    this.currentMapInstanceId = instanceId;
    if (instance?.mapSnapshot && subregionSnapshotUsable(instance.mapSnapshot, subregionId)) {
      instance.sourceMapId = previousMapInstanceId;
      instance.sourceObjectId = target?.objectDefId ?? target?.type ?? instance.sourceObjectId ?? null;
      instance.sourceObjectRuntimeId = sourceObjectRuntimeId ?? instance.sourceObjectRuntimeId ?? null;
      instance.lastReturnEntry = { ...returnEntry, returnPlayerPosition: { ...returnPlayerPosition } };
      instance.updatedAt = Date.now();
      this.restoreMapSnapshot(instance.mapSnapshot);
      expedition.currentMapInstanceId = instanceId;
      this.currentMapInstanceId = instanceId;
      this.setSubregionTransition?.(true, { title: "Loading subregion", label: title, detail: "Loading saved map", percent: 60 });
    } else {
      if (instance?.mapSnapshot) {
        console.warn(`[subregions] Discarding invalid subregion snapshot for ${subregionId}; regenerating instance`);
      }
      const config = this.resolveSubregionConfig(subregionId, {
        sourceRegionId: this.region?.mapRegion?.id,
        sourceMapId: previousMapInstanceId,
        sourceObjectId: target?.objectDefId ?? target?.type,
        sourceObjectRuntimeId,
      });
      if (!config) {
        expedition.subregionStack.pop();
        expedition.currentMapInstanceId = previousMapInstanceId;
        this.currentMapInstanceId = previousMapInstanceId;
        this.setSubregionTransition?.(false);
        return { ok: false, changed: false, reason: "resolve_failed" };
      }
      instance = this.createSubregionInstance(instanceId, config, action, target);
      instance.lastReturnEntry = { ...returnEntry, returnPlayerPosition: { ...returnPlayerPosition } };
      expedition.currentMapInstanceId = instanceId;
      this.currentMapInstanceId = instanceId;
      this.setSubregionTransition?.(true, { title: "Loading subregion", label: title, detail: "Generating map", percent: 55 });
    }

    this.placePlayerAtSubregionEntry();
    this.updateNearbyActionTarget?.();
    this.refreshCurrentRegionAssets?.()
      .then(() => {
        this.setSubregionTransition?.(true, { title: "Loading subregion", label: title, detail: "Ready", percent: 100 });
        globalThis.setTimeout(() => this.setSubregionTransition?.(false), 80);
      })
      .catch((error) => {
        console.warn("[subregions] Failed to load subregion assets", error);
        this.setSubregionTransition?.(false);
      });
    this.saveProgress?.({ force: true });
    this.addToast?.(title);
    return { ok: true, changed: false, subregionInstanceId: instanceId };
  },

  exitSubregionFromAction() {
    const expedition = normalizeCurrentExpedition(this.currentExpedition);
    this.currentExpedition = expedition;
    if (!expedition) {
      console.warn("[subregions] exitSubregion called without currentExpedition");
      this.addToast?.("Ingen subregion aktiv");
      return { ok: false, changed: false, reason: "missing_expedition" };
    }
    const currentMapInstanceId = repairLoadedSubregionMapId(this, expedition) ?? currentMapInstanceIdFor(expedition);
    if (!currentMapInstanceId || currentMapInstanceId === expedition.rootMapInstanceId) {
      console.warn("[subregions] exitSubregion called while current map is root", {
        currentMapInstanceId,
        rootMapInstanceId: expedition.rootMapInstanceId,
      });
      this.addToast?.("Du er ikke i en subregion");
      return { ok: false, changed: false, reason: "not_in_subregion" };
    }
    if (!expedition.subregionInstances?.[currentMapInstanceId]) {
      console.warn("[subregions] Current subregion instance cannot be found", {
        currentMapInstanceId,
        rootMapInstanceId: expedition.rootMapInstanceId,
        instanceIds: Object.keys(expedition.subregionInstances ?? {}),
      });
    }
    this.storeCurrentMapSnapshot(currentMapInstanceId);
    const clearChanged = applySubregionOnClear(this, currentMapInstanceId);
    let entry = expedition.subregionStack.pop();
    if (!entry) {
      entry = legacyReturnEntryFor(expedition, currentMapInstanceId);
      if (entry) {
        console.warn("[subregions] Restored return point from legacy instance state; future exits should use subregionStack");
      }
    }
    if (!entry) {
      console.warn("[subregions] exitSubregion missing stack entry", {
        currentMapInstanceId,
        rootMapInstanceId: expedition.rootMapInstanceId,
        subregionInstances: Object.keys(expedition.subregionInstances ?? {}),
      });
      this.addToast?.("Subregion stack mangler returpunkt");
      return { ok: false, changed: false, reason: "missing_stack_entry" };
    }
    if (!entry.sourceObjectRuntimeId) {
      console.warn("[subregions] Return stack entry is missing sourceObjectRuntimeId", {
        currentMapInstanceId,
        returnMapInstanceId: entry.mapInstanceId,
      });
    }
    const previousSnapshot = expedition.mapSnapshots[entry.mapInstanceId]
      ?? (entry.mapInstanceId === expedition.rootMapInstanceId ? expedition.rootMapSnapshot : null);
    if (!previousSnapshot) {
      console.warn(`[subregions] Missing return snapshot '${entry.mapInstanceId}'`, {
        rootMapInstanceId: expedition.rootMapInstanceId,
        currentMapInstanceId,
        stackLength: expedition.subregionStack.length,
        snapshotKeys: Object.keys(expedition.mapSnapshots ?? {}),
      });
      this.addToast?.("Kunne ikke finde kortet tilbage");
      return { ok: false, changed: false, reason: "missing_return_snapshot" };
    }
    this.setSubregionTransition?.(true, {
      title: "Loading subregion",
      label: previousSnapshot.regionConfig?.label ?? "Previous map",
      detail: "Returning",
      percent: 20,
    });
    this.restoreMapSnapshot(previousSnapshot);
    expedition.currentMapInstanceId = entry.mapInstanceId;
    this.currentMapInstanceId = entry.mapInstanceId;
    placeNearObjectOrPosition(this, entry.sourceObjectRuntimeId, entry.returnPlayerPosition);
    this.updateNearbyActionTarget?.();
    this.refreshCurrentRegionAssets?.()
      .then(() => {
        this.setSubregionTransition?.(true, {
          title: "Loading subregion",
          label: previousSnapshot.regionConfig?.label ?? "Previous map",
          detail: "Ready",
          percent: 100,
        });
        globalThis.setTimeout(() => this.setSubregionTransition?.(false), 80);
      })
      .catch((error) => {
        console.warn("[subregions] Failed to load return map assets", error);
        this.setSubregionTransition?.(false);
      });
    this.saveProgress?.({ force: true });
    return { ok: true, changed: clearChanged };
  },

  clearSubregionExpedition(options = {}) {
    if (!this.currentExpedition) return false;
    this.currentExpedition = null;
    this.currentMapInstanceId = null;
    if (options.save) this.saveProgress?.({ force: true });
    return true;
  },

  isInSubregion() {
    return isSubregionMap(this);
  },

  debugSubregionState() {
    const expedition = normalizeCurrentExpedition(this.currentExpedition);
    const currentRegionId = this.region?.mapRegion?.id ?? this.region?.id ?? null;
    const currentMapInstanceId = expedition?.currentMapInstanceId ?? this.currentMapInstanceId ?? null;
    const instanceIds = Object.keys(expedition?.subregionInstances ?? {});
    const snapshotKeys = Object.keys(expedition?.mapSnapshots ?? {});
    const state = {
      currentRegionId,
      currentMapInstanceId,
      loadedSubregionId: loadedSubregionId(this),
      rootRegionId: expedition?.rootRegionId ?? null,
      rootMapId: expedition?.rootMapId ?? null,
      rootMapInstanceId: expedition?.rootMapInstanceId ?? null,
      stackDepth: expedition?.subregionStack?.length ?? 0,
      stack: (expedition?.subregionStack ?? []).map((entry) => ({
        mapInstanceId: entry.mapInstanceId,
        sourceObjectRuntimeId: entry.sourceObjectRuntimeId ?? null,
        hasReturnPlayerPosition: Boolean(entry.returnPlayerPosition),
      })),
      instanceIds,
      currentInstanceExists: Boolean(currentMapInstanceId && expedition?.subregionInstances?.[currentMapInstanceId]),
      hasRootSnapshot: Boolean(expedition?.rootMapSnapshot),
      subregionSnapshotCount: instanceIds.filter((id) => Boolean(expedition?.subregionInstances?.[id]?.mapSnapshot)).length,
      mapSnapshotCount: snapshotKeys.length,
      mapSnapshotIds: snapshotKeys,
    };
    console.info("[subregions] debug state", state);
    return state;
  },
};
