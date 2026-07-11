import { OBJECT_SPAWN_TUNING } from "../../config/spawn-config.js";
import { CHUNK_SIZE } from "../../config/game-constants-config.js";
import {
  getRegionObjectFamily,
  REGION_OBJECT_DEFS,
  resolveRegionObjectDestructibleDef,
  resolveRegionObjectVariantCount,
} from "../../config/region-object-config.js";
import { distance } from "../../iso.js";
import { createId } from "../../world.js";
import { QUEST_NPCS } from "../../config/npc-config.js";
import { worldEntryAllowed } from "../../world-state.js";
import {
  actionPromptFor,
  getActionConfig,
  normalizeActionState,
  runAction,
} from "../../actions/action-runner.js";

const OBJECT_ACTION_INTERACT_RANGE = 1.15;

function addInteractionTiming(engine, key, ms) {
  if (!engine?.interactionTargetTimings) return;
  engine.interactionTargetTimings[key] = (engine.interactionTargetTimings[key] ?? 0) + ms;
  const targetTimings = engine.playerUpdateTimings;
  if (!targetTimings) return;
  const targetKey = ({
    interactionTargetCollectObjectsMs: "playerTargetCandidateCollectionMs",
    interactionTargetCollectLootMs: "playerTargetCandidateCollectionMs",
    interactionTargetCollectMonstersMs: "playerTargetCandidateCollectionMs",
    interactionTargetCollectNpcsMs: "playerTargetCandidateCollectionMs",
    interactionTargetDistanceChecksMs: "playerTargetDistanceChecksMs",
    interactionTargetSortMs: "playerTargetSortMs",
    interactionTargetStateUpdateMs: "playerTargetStateCommitMs",
  })[key];
  if (targetKey) targetTimings[targetKey] = (targetTimings[targetKey] ?? 0) + ms;
}

function addInteractionStateReason(engine, reason) {
  if (!engine?.interactionTargetTimings) return;
  const key = String(reason || "unknown");
  const reasons = engine.interactionTargetTimings.interactionTargetStateReasons ??= {};
  reasons[key] = (reasons[key] ?? 0) + 1;
}

function distanceSq(a, b) {
  const dx = (Number(a?.x) || 0) - (Number(b?.x) || 0);
  const dy = (Number(a?.y) || 0) - (Number(b?.y) || 0);
  return dx * dx + dy * dy;
}

function normalizeRuntimeActionObjectStates(engine) {
  if (!engine.runtimeActionObjectStates || typeof engine.runtimeActionObjectStates !== "object") {
    engine.runtimeActionObjectStates = {};
  }
  return engine.runtimeActionObjectStates;
}

function actionContextForTarget(engine, extra = {}) {
  return {
    region: engine.region,
    regionId: engine.region?.mapRegion?.id ?? engine.region?.id,
    regionConfig: engine.region?.mapRegion,
    worldState: engine.worldState,
    worldEnergy: engine.worldEnergy,
    questState: engine.questState,
    player: engine.player,
    inventory: engine.player?.inventory,
    activeMapRegion: engine.activeMapRegion,
    rootRegionId: engine.currentExpedition?.rootRegionId,
    rootMapId: engine.currentExpedition?.rootMapId,
    rootMapInstanceId: engine.currentExpedition?.rootMapInstanceId,
    sourceMapId: engine.currentExpedition?.currentMapInstanceId,
    sourceObjectId: extra.target?.objectDefId ?? extra.target?.type,
    sourceObjectRuntimeId: extra.target?.runtimeId ?? extra.target?.id,
    subregionDepth: engine.currentExpedition?.subregionStack?.length ?? 0,
    ...extra,
  };
}

function actionEntryMatches(engine, entry, target) {
  if (!entry?.actionId) return false;
  const context = actionContextForTarget(engine, {
    target,
    npcId: target?.npcId,
  });
  if (!worldEntryAllowed(entry, engine.worldState, context)) return false;
  const action = getActionConfig(entry.actionId);
  return !action || worldEntryAllowed(action, engine.worldState, context);
}

function firstActionFromList(engine, actions, target) {
  if (!Array.isArray(actions)) return null;
  const entry = actions.find((candidate) => actionEntryMatches(engine, candidate, target));
  return entry?.actionId ? String(entry.actionId) : null;
}

function allowedDirectActionId(engine, actionId, target) {
  if (!actionId) return null;
  const action = getActionConfig(actionId);
  if (!action) return String(actionId);
  return worldEntryAllowed(action, engine.worldState, actionContextForTarget(engine, { target }))
    ? String(actionId)
    : null;
}

function targetActionId(engine, target) {
  if (!target) return null;
  const npcDef = target.npcId ? QUEST_NPCS[target.npcId] : null;
  return firstActionFromList(engine, target.actions, target)
    ?? allowedDirectActionId(engine, target.actionId, target)
    ?? firstActionFromList(engine, target.defaultActions ?? npcDef?.defaultActions, target)
    ?? allowedDirectActionId(engine, target.defaultActionId ?? npcDef?.defaultActionId, target);
}

function objectStateKey(object) {
  return object?.runtimeId ? String(object.runtimeId) : null;
}

function firstSpawnType(objectDefId) {
  const def = REGION_OBJECT_DEFS[objectDefId];
  const spawnTypes = Array.isArray(def?.spawnTypes) ? def.spawnTypes : [];
  return spawnTypes[0]?.type ?? null;
}

function applyReplacementShape(object, objectDefId, options = {}) {
  const def = REGION_OBJECT_DEFS[objectDefId];
  const type = firstSpawnType(objectDefId);
  if (!def || !type) return false;
  const tuning = OBJECT_SPAWN_TUNING[type]
    ?? OBJECT_SPAWN_TUNING[getRegionObjectFamily(type)]
    ?? OBJECT_SPAWN_TUNING.default;
  object.objectDefId = objectDefId;
  object.type = type;
  object.radius = tuning.radius ?? object.radius;
  object.renderBiomeId = def.renderBiomeId ?? null;
  object.graphicsRef = def.graphicsRef ?? null;
  object.treeVariant = Math.abs(Math.floor(Number(object.treeVariant) || 0)) % resolveRegionObjectVariantCount(type);
  object.defaultActionId = def.defaultActionId ?? null;
  object.actionId = def.defaultActionId ?? null;
  object.actions = null;
  object.questTargetKey = def.questTargetKey ?? null;
  object.completedQuestTargetKey = options.completedQuestTargetKey ?? null;
  object.destructible = typeof options.destructible === "boolean"
    ? options.destructible
    : def.defaultDestructible !== false && Boolean(resolveRegionObjectDestructibleDef(type));
  object.particles = [];
  object.__particleEmitterIds = {};
  object.__attachedEffectsResolved = false;
  delete object.maxHp;
  delete object.hp;
  delete object.harvestHits;
  object.tags = Array.isArray(def.tags) ? [...def.tags] : [];
  object.factionId = def.factionId ?? null;
  object.onDestroyed = def.onDestroyed ? { ...def.onDestroyed } : null;
  return true;
}

function applyFoliageReplacementShape(object, options = {}) {
  if (!object || object.type !== "foliage" || !options.foliageSheet) return false;
  object.foliageSheet = options.foliageSheet;
  object.foliageVariant = Math.max(0, Math.floor(Number(options.foliageVariant) || 0));
  if (Number.isFinite(Number(options.size)) && Number(options.size) > 0) object.size = Number(options.size);
  object.actionId = null;
  object.actions = null;
  object.questTargetKey = null;
  object.completedQuestTargetKey = options.completedQuestTargetKey ?? null;
  object.resourceDrops = [];
  object.foliageLooted = true;
  object.particles = [];
  object.__particleEmitterIds = {};
  object.__attachedEffectsResolved = false;
  return true;
}

export const actionsMethods = {
  updateNearbyActionTarget() {
    const candidates = this.actionTargetsInRange(OBJECT_ACTION_INTERACT_RANGE);
    if (!candidates.length) {
      if (!this.nearbyActionTarget) return;
      const stateStartedAt = performance.now();
      this.nearbyActionTarget = null;
      this.nearbyInteractionMode = "action";
      this.actionTargetCycleId = null;
      this.markRenderDirty?.("action-target");
      addInteractionStateReason(this, "action-target-clear");
      this.markUiOnlySnapshot?.("action-target-clear");
      addInteractionTiming(this, "interactionTargetStateUpdateMs", performance.now() - stateStartedAt);
      return;
    }
    const selectedId = this.actionTargetCycleId;
    const target = candidates.find((entry) => entry.target.runtimeId === selectedId || entry.target.id === selectedId)?.target
      ?? candidates[0].target;
    this.actionTargetCycleId = target.runtimeId ?? target.id ?? null;
    const actionId = targetActionId(this, target);
    const next = target && actionId ? {
      id: target.id,
      runtimeId: target.runtimeId ?? null,
      sourceType: target.sourceType ?? (target.npcId ? "npc" : "object"),
      actionId,
      label: actionPromptFor(actionId) ?? "Interager",
      targetCount: candidates.length,
      targetIndex: Math.max(0, candidates.findIndex((entry) => entry.target === target)) + 1,
    } : null;
    if (
      (next?.id ?? null) === (this.nearbyActionTarget?.id ?? null)
      && (next?.actionId ?? null) === (this.nearbyActionTarget?.actionId ?? null)
      && (next?.targetCount ?? 0) === (this.nearbyActionTarget?.targetCount ?? 0)
      && (next?.targetIndex ?? 0) === (this.nearbyActionTarget?.targetIndex ?? 0)
    ) return;
    if ((next?.id ?? null) !== (this.nearbyActionTarget?.id ?? null)) {
      this.nearbyInteractionMode = "action";
    }
    const stateStartedAt = performance.now();
    this.nearbyActionTarget = next;
    this.markRenderDirty?.("action-target");
    addInteractionStateReason(this, "action-target");
    this.markUiOnlySnapshot?.("action-target");
    addInteractionTiming(this, "interactionTargetStateUpdateMs", performance.now() - stateStartedAt);
  },

  actionTargetsInRange(maxRange = OBJECT_ACTION_INTERACT_RANGE) {
    const candidates = [];
    for (const chunk of this.nearbyChunks(1)) {
      for (const object of chunk.objects) {
        const collectStartedAt = performance.now();
        const valid = object && !object.removed && !object.actionRemoved;
        if (this.playerUpdateTimings) {
          this.playerUpdateTimings.objectsScanned += 1;
          this.playerUpdateTimings.actionTargetsScanned += 1;
          this.playerUpdateTimings.targetCandidateCount += 1;
        }
        addInteractionTiming(this, "interactionTargetCollectObjectsMs", performance.now() - collectStartedAt);
        if (!valid) continue;
        const distanceStartedAt = performance.now();
        const radius = Number(object.radius) || 0;
        if (this.playerUpdateTimings) this.playerUpdateTimings.targetDistanceCheckCount += 1;
        if (distanceSq(this.player, object) > (maxRange + radius) * (maxRange + radius)) {
          addInteractionTiming(this, "interactionTargetDistanceChecksMs", performance.now() - distanceStartedAt);
          continue;
        }
        const d = distance(this.player, object) - radius;
        addInteractionTiming(this, "interactionTargetDistanceChecksMs", performance.now() - distanceStartedAt);
        if (!targetActionId(this, object)) continue;
        if (d <= maxRange) {
          object.sourceType = "object";
          candidates.push({ target: object, distance: d });
        }
      }
      for (const npc of chunk.npcs ?? []) {
        const collectStartedAt = performance.now();
        if (!npc || npc.removed || npc.actionRemoved) continue;
        if (this.playerUpdateTimings) {
          this.playerUpdateTimings.npcsScanned += 1;
          this.playerUpdateTimings.actionTargetsScanned += 1;
          this.playerUpdateTimings.targetCandidateCount += 1;
        }
        addInteractionTiming(this, "interactionTargetCollectNpcsMs", performance.now() - collectStartedAt);
        const distanceStartedAt = performance.now();
        const radius = Number(npc.radius) || 0;
        if (this.playerUpdateTimings) this.playerUpdateTimings.targetDistanceCheckCount += 1;
        if (distanceSq(this.player, npc) > (maxRange + radius) * (maxRange + radius)) {
          addInteractionTiming(this, "interactionTargetDistanceChecksMs", performance.now() - distanceStartedAt);
          continue;
        }
        const d = distance(this.player, npc) - radius;
        addInteractionTiming(this, "interactionTargetDistanceChecksMs", performance.now() - distanceStartedAt);
        if (!targetActionId(this, npc)) continue;
        if (d <= maxRange) {
          npc.sourceType = "npc";
          candidates.push({ target: npc, distance: d });
        }
      }
    }
    const sortStartedAt = performance.now();
    candidates.sort((a, b) => a.distance - b.distance || String(a.target.runtimeId ?? a.target.id).localeCompare(String(b.target.runtimeId ?? b.target.id)));
    addInteractionTiming(this, "interactionTargetSortMs", performance.now() - sortStartedAt);
    return candidates;
  },

  nearestActionTarget(maxRange = OBJECT_ACTION_INTERACT_RANGE) {
    return this.actionTargetsInRange(maxRange)[0]?.target ?? null;
  },

  minimapActionTargets(chunkRange = 3, options = {}) {
    const targets = [];
    const chunks = [];
    if (options.loadedOnly) {
      const centerX = Math.floor(this.player.x / CHUNK_SIZE);
      const centerY = Math.floor(this.player.y / CHUNK_SIZE);
      for (let cy = centerY - chunkRange; cy <= centerY + chunkRange; cy += 1) {
        for (let cx = centerX - chunkRange; cx <= centerX + chunkRange; cx += 1) {
          const chunk = this.chunks?.get?.(`${cx},${cy}`);
          if (chunk) chunks.push(chunk);
        }
      }
    } else {
      chunks.push(...this.nearbyChunks(chunkRange));
    }
    for (const chunk of chunks) {
      for (const object of chunk.objects) {
        if (!object || object.removed || object.actionRemoved) continue;
        if (!targetActionId(this, object)) continue;
        targets.push(object);
      }
    }
    return targets;
  },

  cycleNearbyActionTarget(direction = 1) {
    const candidates = this.actionTargetsInRange(OBJECT_ACTION_INTERACT_RANGE);
    if (candidates.length <= 1) return false;
    const selectedId = this.actionTargetCycleId ?? this.nearbyActionTarget?.runtimeId ?? this.nearbyActionTarget?.id ?? null;
    const currentIndex = Math.max(0, candidates.findIndex((entry) => (
      entry.target.runtimeId === selectedId || entry.target.id === selectedId
    )));
    const nextIndex = (currentIndex + (direction >= 0 ? 1 : -1) + candidates.length) % candidates.length;
    this.actionTargetCycleId = candidates[nextIndex].target.runtimeId ?? candidates[nextIndex].target.id ?? null;
    this.updateNearbyActionTarget();
    return true;
  },

  hasOverlappingActionAndFoliageLoot() {
    return Boolean(
      this.nearbyActionTarget?.id
      && this.nearbyFoliageLoot?.id
      && this.nearbyActionTarget.id === this.nearbyFoliageLoot.id,
    );
  },

  toggleOverlappingActionAndFoliageLoot() {
    if (!this.hasOverlappingActionAndFoliageLoot()) return false;
    this.nearbyInteractionMode = this.nearbyInteractionMode === "loot" ? "action" : "loot";
    this.markRenderDirty?.("interaction-mode");
    this.publishSnapshot();
    return true;
  },

  interactNearbyAction() {
    const snapshotTarget = this.nearbyActionTarget?.id
      ? this.findActionTargetById(this.nearbyActionTarget.id, this.nearbyActionTarget.sourceType)
      : null;
    const target = snapshotTarget ?? this.nearestActionTarget(OBJECT_ACTION_INTERACT_RANGE);
    const actionId = targetActionId(this, target);
    if (!target || !actionId) return false;
    if (distance(this.player, target) - (Number(target.radius) || 0) > OBJECT_ACTION_INTERACT_RANGE) return false;
    const sourceType = target.sourceType ?? (target.npcId ? "npc" : "object");
    return runAction({
      actionId,
      target,
      sourceType,
      engine: this,
      world: this.region,
      player: this.player,
      context: actionContextForTarget(this, { target, sourceType, npcId: target.npcId }),
    }).ok;
  },

  openActionChest(target) {
    if (!target) return { ok: false, changed: false, reason: "missing_target" };
    this.dropChestLoot?.(target);
    if (this.region) this.region.chestOpened = true;
    this.particleEngine?.removeEmittersByOwner(target.id);
    this.removeActionTargetObject(target);
    this.addToast?.("Kisten er aabnet");
    this.markRenderDirty?.("action-object");
    return { ok: true, changed: true };
  },

  findActionTargetById(id, sourceType = null) {
    if (!id) return null;
    if (!sourceType || sourceType === "object") {
      const object = this.findObjectById(id);
      if (object) {
        object.sourceType = "object";
        return object;
      }
    }
    if (!sourceType || sourceType === "npc") {
      for (const chunk of this.nearbyChunks(2)) {
        const npc = (chunk.npcs ?? []).find((entry) => entry.id === id);
        if (npc) {
          npc.sourceType = "npc";
          return npc;
        }
      }
    }
    return null;
  },

  recordActionObjectState(object, patch, options = {}) {
    const key = objectStateKey(object);
    if (!key) return false;

    const scope = options.targetStateScope ?? options.scope ?? "persistent";
    if (scope === "runtime") {
      const runtimeStates = normalizeRuntimeActionObjectStates(this);
      runtimeStates[key] = {
        ...(runtimeStates[key] ?? {}),
        ...patch,
      };
      return true;
    }

    this.actionState = normalizeActionState(this.actionState);
    this.actionState.objectStates[key] = {
      ...(this.actionState.objectStates[key] ?? {}),
      ...patch,
    };
    return true;
  },

  removeActionTargetObject(object, options = {}) {
    if (!object) return false;
    object.removed = true;
    object.actionRemoved = true;
    object.blocking = false;
    this.player.attackObjectId = this.player.attackObjectId === object.id ? null : this.player.attackObjectId;
    this.recordActionObjectState(object, { removed: true }, options);
    for (const chunk of this.nearbyChunks(2)) {
      const index = chunk.objects.findIndex((entry) => entry.id === object.id);
      if (index >= 0) {
        chunk.objects.splice(index, 1);
        chunk.terrainLayer = null;
        break;
      }
    }
    this.markRenderDirty?.("object-remove");
    return true;
  },

  replaceActionTargetObject(object, objectDefId, options = {}) {
    if (!object || !objectDefId) return false;
    const completedQuestTargetKey = object.questTargetKey ?? null;
    this.particleEngine?.removeEmittersByOwner(object.id);
    if (!applyReplacementShape(object, objectDefId, { ...options, completedQuestTargetKey })) {
      console.warn(`[actions] Cannot replace object with unknown object id: ${objectDefId}`);
      this.addToast?.("Replacement object mangler config");
      return false;
    }
    this.recordActionObjectState(
      object,
      {
        replaceWith: objectDefId,
        ...(completedQuestTargetKey ? { completedQuestTargetKey } : {}),
        ...(typeof options.destructible === "boolean" ? { destructible: options.destructible } : {}),
      },
      options,
    );
    this.markRenderDirty?.("object-replace");
    return true;
  },

  replaceActionTargetFoliage(object, fileName, options = {}) {
    if (!object || object.type !== "foliage" || !fileName) return false;
    const foliageSet = (this.region?.mapRegion?.foliageSets ?? []).find((entry) => entry.fileName === fileName);
    if (!foliageSet?.sheetId) {
      console.warn(`[actions] Cannot replace foliage with unloaded sheet: ${fileName}`);
      this.addToast?.("Replacement foliage mangler config");
      return false;
    }
    const completedQuestTargetKey = object.questTargetKey ?? null;
    const replacement = {
      foliageSheet: foliageSet.sheetId,
      foliageVariant: 0,
      size: Number(options.size) > 0 ? Number(options.size) : (foliageSet.scale ?? object.size),
      completedQuestTargetKey,
    };
    this.particleEngine?.removeEmittersByOwner(object.id);
    if (!applyFoliageReplacementShape(object, replacement)) return false;
    this.recordActionObjectState(
      object,
      {
        replaceFoliageWith: fileName,
        ...replacement,
      },
      options,
    );
    this.markRenderDirty?.("object-replace");
    return true;
  },

  spawnActionObjectNear(target, objectDefId) {
    if (!target || !objectDefId) return false;
    const type = firstSpawnType(objectDefId);
    if (!type) {
      console.warn(`[actions] Cannot spawn unknown object id: ${objectDefId}`);
      this.addToast?.("Spawn object mangler config");
      return false;
    }
    const cx = Math.floor(target.x / CHUNK_SIZE);
    const cy = Math.floor(target.y / CHUNK_SIZE);
    const chunk = this.getChunk(cx, cy);
    const def = REGION_OBJECT_DEFS[objectDefId];
    const tuning = OBJECT_SPAWN_TUNING[type]
      ?? OBJECT_SPAWN_TUNING[getRegionObjectFamily(type)]
      ?? OBJECT_SPAWN_TUNING.default;
    const object = {
      id: createId(),
      runtimeId: `action-spawn:${target.runtimeId ?? target.id}:${objectDefId}`,
      objectDefId,
      type,
      x: target.x + 0.35,
      y: target.y + 0.15,
      radius: tuning.radius,
      size: tuning.sizeBase,
      rotation: 0,
      colorShift: 0,
      flip: false,
      treeVariant: 0,
      animSeed: 0,
      visualScale: 1,
      blocking: true,
      destructible: false,
      renderBiomeId: def.renderBiomeId ?? null,
      graphicsRef: def.graphicsRef ?? null,
      particles: [],
      effects: null,
      depthMode: def.depthMode ?? "dynamic",
      sortAnchor: def.sortAnchor ? { ...def.sortAnchor } : { x: 0.5, y: 1 },
      depthOffset: Number.isFinite(Number(def.depthOffset)) ? Number(def.depthOffset) : 0,
      tags: Array.isArray(def.tags) ? [...def.tags] : [],
      factionId: def.factionId ?? null,
      onDestroyed: def.onDestroyed ? { ...def.onDestroyed } : null,
      defaultActionId: def.defaultActionId ?? null,
    };
    chunk.objects.push(object);
    chunk.terrainLayer = null;
    this.markRenderDirty?.("object-spawn");
    return true;
  },

  applySavedActionObjectStates(chunk) {
    this.actionState = normalizeActionState(this.actionState);
    const runtimeStates = normalizeRuntimeActionObjectStates(this);
    const isTransientCityMobMap = String(
      this.activeMapRegion?.regionId ?? this.region?.mapRegion?.id ?? "",
    ).startsWith("citymob:");
    const persistentStates = isTransientCityMobMap ? {} : this.actionState.objectStates;
    const states = {
      ...persistentStates,
      ...runtimeStates,
    };
    if (!chunk || !Array.isArray(chunk.objects) || !Object.keys(states).length) return;
    chunk.objects = chunk.objects.filter((object) => {
      const state = states[object.runtimeId];
      if (!state) return true;
      if (state.removed) {
        this.markRenderDirty?.("saved-object-state");
        return false;
      }
      if (state.replaceWith && applyReplacementShape(object, state.replaceWith, state)) this.markRenderDirty?.("saved-object-state");
      if (state.replaceFoliageWith && applyFoliageReplacementShape(object, state)) this.markRenderDirty?.("saved-object-state");
      return true;
    });
  },
};
