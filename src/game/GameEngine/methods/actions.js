import { OBJECT_SPAWN_TUNING } from "../../config/spawn-config.js";
import { CHUNK_SIZE } from "../../config/game-constants-config.js";
import {
  getRegionObjectFamily,
  REGION_OBJECT_DEFS,
  resolveRegionObjectVariantCount,
} from "../../config/region-object-config.js";
import { distance } from "../../iso.js";
import { createId } from "../../world.js";
import {
  actionPromptFor,
  normalizeActionState,
  runAction,
} from "../../actions/action-runner.js";

const OBJECT_ACTION_INTERACT_RANGE = 1.15;

function targetActionId(target) {
  return target?.actionId ?? target?.defaultActionId ?? null;
}

function objectStateKey(object) {
  return object?.runtimeId ? String(object.runtimeId) : null;
}

function firstSpawnType(objectDefId) {
  const def = REGION_OBJECT_DEFS[objectDefId];
  const spawnTypes = Array.isArray(def?.spawnTypes) ? def.spawnTypes : [];
  return spawnTypes[0]?.type ?? null;
}

function applyReplacementShape(object, objectDefId) {
  const def = REGION_OBJECT_DEFS[objectDefId];
  const type = firstSpawnType(objectDefId);
  if (!def || !type) return false;
  const tuning = OBJECT_SPAWN_TUNING[type]
    ?? OBJECT_SPAWN_TUNING[getRegionObjectFamily(type)]
    ?? OBJECT_SPAWN_TUNING.default;
  object.objectDefId = objectDefId;
  object.type = type;
  object.radius = tuning.radius ?? object.radius;
  object.size = tuning.sizeBase ?? object.size;
  object.renderBiomeId = def.renderBiomeId ?? null;
  object.graphicsRef = def.graphicsRef ?? null;
  object.treeVariant = Math.abs(Math.floor(Number(object.treeVariant) || 0)) % resolveRegionObjectVariantCount(type);
  object.defaultActionId = def.defaultActionId ?? null;
  return true;
}

export const actionsMethods = {
  updateNearbyActionTarget() {
    const target = this.nearestActionTarget(OBJECT_ACTION_INTERACT_RANGE);
    const actionId = targetActionId(target);
    const next = target && actionId ? {
      id: target.id,
      runtimeId: target.runtimeId ?? null,
      actionId,
      label: actionPromptFor(actionId) ?? "Interager",
    } : null;
    if (
      (next?.id ?? null) === (this.nearbyActionTarget?.id ?? null)
      && (next?.actionId ?? null) === (this.nearbyActionTarget?.actionId ?? null)
    ) return;
    this.nearbyActionTarget = next;
    this.publishSnapshot();
  },

  nearestActionTarget(maxRange = OBJECT_ACTION_INTERACT_RANGE) {
    let best = null;
    let bestD = maxRange;
    for (const chunk of this.nearbyChunks(1)) {
      for (const object of chunk.objects) {
        if (!object || object.removed || object.actionRemoved) continue;
        if (!targetActionId(object)) continue;
        const d = distance(this.player, object) - (Number(object.radius) || 0);
        if (d < bestD) {
          best = object;
          bestD = d;
        }
      }
    }
    return best;
  },

  interactNearbyAction() {
    const snapshotTarget = this.nearbyActionTarget?.id ? this.findObjectById(this.nearbyActionTarget.id) : null;
    const target = snapshotTarget ?? this.nearestActionTarget(OBJECT_ACTION_INTERACT_RANGE);
    const actionId = targetActionId(target);
    if (!target || !actionId) return false;
    if (distance(this.player, target) - (Number(target.radius) || 0) > OBJECT_ACTION_INTERACT_RANGE) return false;
    return runAction({
      actionId,
      target,
      sourceType: "object",
      engine: this,
      world: this.region,
      player: this.player,
      context: {
        region: this.region,
        regionId: this.region?.mapRegion?.id ?? this.region?.id,
        regionConfig: this.region?.mapRegion,
      },
    }).ok;
  },

  recordActionObjectState(object, patch) {
    const key = objectStateKey(object);
    if (!key) return false;
    this.actionState = normalizeActionState(this.actionState);
    this.actionState.objectStates[key] = {
      ...(this.actionState.objectStates[key] ?? {}),
      ...patch,
    };
    return true;
  },

  removeActionTargetObject(object) {
    if (!object) return false;
    object.removed = true;
    object.actionRemoved = true;
    object.blocking = false;
    this.player.attackObjectId = this.player.attackObjectId === object.id ? null : this.player.attackObjectId;
    this.recordActionObjectState(object, { removed: true });
    for (const chunk of this.nearbyChunks(2)) {
      const index = chunk.objects.findIndex((entry) => entry.id === object.id);
      if (index >= 0) {
        chunk.objects.splice(index, 1);
        break;
      }
    }
    return true;
  },

  replaceActionTargetObject(object, objectDefId) {
    if (!object || !objectDefId) return false;
    if (!applyReplacementShape(object, objectDefId)) {
      console.warn(`[actions] Cannot replace object with unknown object id: ${objectDefId}`);
      this.addToast?.("Replacement object mangler config");
      return false;
    }
    this.recordActionObjectState(object, { replaceWith: objectDefId });
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
      defaultActionId: def.defaultActionId ?? null,
    };
    chunk.objects.push(object);
    return true;
  },

  applySavedActionObjectStates(chunk) {
    this.actionState = normalizeActionState(this.actionState);
    const states = this.actionState.objectStates;
    if (!chunk || !Array.isArray(chunk.objects) || !Object.keys(states).length) return;
    chunk.objects = chunk.objects.filter((object) => {
      const state = states[object.runtimeId];
      if (!state) return true;
      if (state.removed) return false;
      if (state.replaceWith) applyReplacementShape(object, state.replaceWith);
      return true;
    });
  },
};
