import { REGION_OBJECT_DECORATORS } from "./config/region-object-decorator-config.js";
import { REGION_OBJECT_DEFS } from "./config/region-object-config.js";
import { chunkCoords, createId, isRegionPointPlayable } from "./world.js";

function questActive(engine, questId) {
  return (engine.questState?.active ?? []).some((quest) => String(quest.questId) === String(questId));
}

function activeQuest(engine, questId) {
  return (engine.questState?.active ?? []).find((quest) => String(quest.questId) === String(questId)) ?? null;
}

function questCompleted(engine, questId) {
  return (engine.questState?.completed ?? []).map(String).includes(String(questId));
}

function decoratorCounts(engine, config) {
  const total = Math.max(0, Math.floor(Number(config.total) || 0));
  if (questCompleted(engine, config.completedQuestId)) return { placed: total, ghosts: 0 };
  if (!questActive(engine, config.activeQuestId)) return { placed: 0, ghosts: 0 };
  const quest = activeQuest(engine, config.activeQuestId);
  if (config.activeQuestStepId && String(quest?.progress?.currentStepId ?? "") !== String(config.activeQuestStepId)) {
    return { placed: 0, ghosts: 0 };
  }
  const progressSource = config.progressStepId
    ? quest?.progress?.stepProgress?.[config.progressStepId]
    : quest?.progress;
  const progressValue = progressSource?.[config.progressField ?? "count"];
  const counterValue = engine.worldState?.counters?.[config.progressCounter];
  const placed = Math.min(total, Math.max(0, Math.floor(Number(progressValue ?? counterValue) || 0)));
  return { placed, ghosts: total - placed };
}

function candidatePositions(engine, config) {
  const placement = config.placement ?? {};
  const candidates = [];
  for (const chunk of engine.chunks.values()) {
    for (const tile of chunk.tiles ?? []) {
      if (placement.avoidWater !== false && tile.water) continue;
      if (placement.avoidSpawnOnRoads && tile.path) continue;
      const x = tile.x + 0.5;
      const y = tile.y + 0.5;
      if (!isRegionPointPlayable(engine.region, x, y, 0.3)) continue;
      if (placement.avoidExistingObjects !== false && (chunk.objects ?? []).some((object) => (
        !object.removed && Math.hypot(object.x - x, object.y - y) < (Number(object.radius) || 0.35) + 0.55
      ))) continue;
      candidates.push({ x, y });
    }
  }
  // Random per generated region, but stable for this runtime placement plan.
  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const selected = [];
  const minDistance = Math.max(0, Number(placement.minDistanceBetween) || 0);
  for (const candidate of candidates) {
    if (selected.every((position) => Math.hypot(position.x - candidate.x, position.y - candidate.y) >= minDistance)) {
      selected.push(candidate);
      if (selected.length >= config.total) break;
    }
  }
  return selected;
}

function runtimeObject(config, objectId, position, index) {
  const def = REGION_OBJECT_DEFS[objectId];
  const type = def?.spawnTypes?.[0]?.type ?? objectId;
  return {
    id: createId(),
    runtimeId: `region-decorator:${config.id}:${index}`,
    regionDecoratorId: config.id,
    regionDecoratorIndex: index,
    objectDefId: objectId,
    type,
    x: position.x,
    y: position.y,
    radius: 0.32,
    size: 1,
    rotation: 0,
    colorShift: 0,
    flip: false,
    variant: 0,
    treeVariant: 0,
    frameIndex: 0,
    graphicsFileName: "object/object_field.png",
    animSeed: Math.random() * Math.PI * 2,
    visualScale: 1,
    blocking: false,
    destructible: false,
    renderBiomeId: def?.renderBiomeId ?? "mainland",
    graphicsRef: def?.graphicsRef ?? "object/object_field.png",
    depthMode: def?.depthMode ?? "dynamic",
    sortAnchor: def?.sortAnchor ? { ...def.sortAnchor } : { x: 0.5, y: 0.95 },
    depthOffset: 0,
    tags: Array.isArray(def?.tags) ? [...def.tags] : ["object", "decoration"],
    actionId: objectId === config.ghostObjectId ? (config.ghostActionId ?? def?.defaultActionId ?? null) : null,
    defaultActionId: objectId === config.ghostObjectId ? (config.ghostActionId ?? def?.defaultActionId ?? null) : null,
    alpha: objectId === config.ghostObjectId ? 0.48 : 1,
    ghost: objectId === config.ghostObjectId,
    effects: objectId === config.ghostObjectId ? { glow: true, tint: "#9fe7ff" } : null,
  };
}

export function rebuildCountBasedRegionDecorators(engine) {
  const regionId = engine.region?.mapRegion?.id ?? engine.activeMapRegion?.regionId;
  const configs = REGION_OBJECT_DECORATORS.filter((config) => String(config.regionId) === String(regionId));
  if (!configs.length || !engine.chunks?.size) return false;
  let changed = false;
  for (const config of configs) {
    for (const chunk of engine.chunks.values()) {
      const before = chunk.objects?.length ?? 0;
      chunk.objects = (chunk.objects ?? []).filter((object) => object.regionDecoratorId !== config.id);
      changed = changed || chunk.objects.length !== before;
    }
    const counts = decoratorCounts(engine, config);
    const needed = counts.placed + counts.ghosts;
    if (!needed) continue;
    const positions = candidatePositions(engine, config).slice(0, needed);
    if (positions.length < needed && import.meta.env?.DEV) {
      console.warn(`[region-decorators] ${config.id} found ${positions.length}/${needed} valid positions`);
    }
    positions.forEach((position, index) => {
      const objectId = index < counts.placed ? config.placedObjectId : config.ghostObjectId;
      const { cx, cy } = chunkCoords(position.x, position.y);
      const chunk = engine.getChunk(cx, cy);
      chunk.objects.push(runtimeObject(config, objectId, position, index));
      changed = true;
    });
    engine.regionDecoratorPlans ??= new Map();
    engine.regionDecoratorPlans.set(config.id, { positions, ...counts });
  }
  if (changed) engine.markRenderDirty?.("region-decorators");
  return changed;
}
