import { ACTION_CONFIG } from "../config/action-config.js";
import { READABLE_DEF_BY_ID } from "../config/readable-config.js";
import { QUEST_ITEM_DEFS } from "../config/quest-config.js";
import { RESOURCE_DEFS } from "../config/resource-config.js";
import { applyWorldEnergy } from "../world-energy.js";
import { applyFactionRepEffects } from "../config/faction-config.js";
import {
  incrementWorldCounter,
  normalizeWorldState,
  setWorldFlag,
  worldConditionMet,
} from "../world-state.js";
import {
  consumeResourceInputs,
  inventoryCanAccept,
  makeReadableItem,
  makeResourceItem,
  resourceCount,
} from "../GameEngine/helpers/items.js";
import { makeQuestItem, questItemCanStack } from "../GameEngine/helpers/quests.js";
import { inventoryUnlockedSlotCount } from "../config/game-constants-config.js";

const IMPLEMENTED_TYPES = new Set([
  "inspect",
  "talk",
  "read",
  "collect",
  "harvest",
  "destroy",
  "open",
  "activate",
  "reveal",
  "cleanse",
  "repair",
  "offer",
  "enterSubregion",
  "exitSubregion",
]);

const RESERVED_STUB_TYPES = new Set([
  "summon",
  "questStart",
  "questAdvance",
]);

export function getActionConfig(actionId) {
  return ACTION_CONFIG[String(actionId ?? "")] ?? null;
}

export function actionPromptFor(actionId) {
  const action = getActionConfig(actionId);
  return action?.prompt ?? action?.label ?? null;
}

function normalizeStateMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key]) => String(key ?? "").trim()));
}

export function normalizeActionState(actionState = {}) {
  return {
    completedActions: normalizeStateMap(actionState.completedActions),
    objectStates: normalizeStateMap(actionState.objectStates),
  };
}

function targetCompletionId(target) {
  if (!target) return "unknown";
  if (target.runtimeId) return String(target.runtimeId);
  const type = String(target.objectDefId ?? target.type ?? "target");
  const x = Number.isFinite(Number(target.x)) ? Number(target.x).toFixed(2) : "x";
  const y = Number.isFinite(Number(target.y)) ? Number(target.y).toFixed(2) : "y";
  return `${type}@${x},${y}`;
}

export function actionCompletionKey({ actionId, target, sourceType = "object", context = {} }) {
  const regionId = context.regionId ?? context.region?.mapRegion?.id ?? context.region?.id ?? "region";
  return `${sourceType}:${regionId}:${targetCompletionId(target)}:${actionId}`;
}

function actionContext(engine, extra = {}) {
  const expedition = engine?.currentExpedition;
  return {
    ...extra,
    engine,
    player: extra.player ?? engine?.player,
    inventory: extra.inventory ?? engine?.player?.inventory,
    potions: extra.potions ?? engine?.player?.potions,
    equipment: extra.equipment ?? engine?.player?.equipment,
    questState: extra.questState ?? engine?.questState,
    worldEnergy: extra.worldEnergy ?? engine?.worldEnergy,
    worldState: extra.worldState ?? engine?.worldState,
    region: extra.region ?? engine?.region,
    regionId: extra.regionId ?? engine?.region?.mapRegion?.id ?? engine?.region?.id,
    regionConfig: extra.regionConfig ?? engine?.region?.mapRegion,
    activeMapRegion: extra.activeMapRegion ?? engine?.activeMapRegion,
    rootRegionId: extra.rootRegionId ?? expedition?.rootRegionId,
    rootMapId: extra.rootMapId ?? expedition?.rootMapId,
    rootMapInstanceId: extra.rootMapInstanceId ?? expedition?.rootMapInstanceId,
    sourceMapId: extra.sourceMapId ?? expedition?.currentMapInstanceId,
    sourceObjectId: extra.sourceObjectId ?? extra.target?.objectDefId ?? extra.target?.type,
    sourceObjectRuntimeId: extra.sourceObjectRuntimeId ?? extra.target?.runtimeId ?? extra.target?.id,
    subregionDepth: extra.subregionDepth ?? expedition?.subregionStack?.length ?? 0,
  };
}

export function isActionCompleted(engine, key) {
  engine.actionState = normalizeActionState(engine.actionState);
  return Boolean(engine.actionState.completedActions[key]);
}

function markActionCompleted(engine, key) {
  engine.actionState = normalizeActionState(engine.actionState);
  engine.actionState.completedActions[key] = true;
}

function hasCosts(engine, costs = {}) {
  if (!costs || typeof costs !== "object") return { ok: true };
  const gold = Math.max(0, Math.floor(Number(costs.gold ?? costs.resources?.gold) || 0));
  if (gold > 0 && Math.max(0, Math.floor(Number(engine.player?.gold) || 0)) < gold) {
    return { ok: false, reason: `Kraever ${gold} guld` };
  }
  for (const [resourceId, neededRaw] of Object.entries(costs.resources ?? {})) {
    if (resourceId === "gold") continue;
    const needed = Math.max(0, Math.floor(Number(neededRaw) || 0));
    if (needed > 0 && resourceCount(engine.player?.inventory ?? [], resourceId) < needed) {
      return { ok: false, reason: `Mangler ${needed}x ${RESOURCE_DEFS[resourceId]?.name ?? resourceId}` };
    }
  }
  for (const [itemId, neededRaw] of Object.entries(costs.items ?? {})) {
    const needed = Math.max(0, Math.floor(Number(neededRaw) || 0));
    if (needed > 0 && countMatchingItems(engine.player?.inventory ?? [], itemId) < needed) {
      return { ok: false, reason: `Mangler ${needed}x ${itemLabel(itemId)}` };
    }
  }
  return { ok: true };
}

function countMatchingItems(inventory, itemId) {
  const id = String(itemId ?? "");
  return (inventory ?? []).reduce((sum, item) => sum + (itemMatchesId(item, id) ? Math.max(1, Math.floor(Number(item.count) || 1)) : 0), 0);
}

function itemMatchesId(item, id) {
  if (!item) return false;
  return [
    item.id,
    item.itemId,
    item.questItemId,
    item.readableId,
    item.resourceId,
    item.uniqueId,
    item.namedId,
    item.name,
    item.baseName,
  ].some((value) => String(value ?? "") === id);
}

function itemLabel(itemId) {
  return QUEST_ITEM_DEFS[itemId]?.name
    ?? READABLE_DEF_BY_ID[itemId]?.title
    ?? RESOURCE_DEFS[itemId]?.name
    ?? itemId;
}

function applyCosts(engine, costs = {}) {
  if (!costs || typeof costs !== "object") return false;
  let changed = false;
  const gold = Math.max(0, Math.floor(Number(costs.gold) || 0));
  const resourceGold = Math.max(0, Math.floor(Number(costs.resources?.gold) || 0));
  if (gold > 0 || resourceGold > 0) {
    engine.player.gold = Math.max(0, Math.floor(Number(engine.player.gold) || 0) - gold - resourceGold);
    changed = true;
  }
  if (costs.resources && typeof costs.resources === "object") {
    const resourceCosts = Object.fromEntries(Object.entries(costs.resources).filter(([id]) => id !== "gold"));
    consumeResourceInputs(engine.player.inventory, resourceCosts);
    changed = changed || Object.keys(resourceCosts).length > 0;
  }
  if (costs.items && typeof costs.items === "object") {
    for (const [itemId, neededRaw] of Object.entries(costs.items)) {
      let needed = Math.max(0, Math.floor(Number(neededRaw) || 0));
      for (let i = engine.player.inventory.length - 1; i >= 0 && needed > 0; i -= 1) {
        const item = engine.player.inventory[i];
        if (!itemMatchesId(item, itemId)) continue;
        const stackableQuestItem = item.mode === "quest" && questItemCanStack(item.questItemId);
        if (item.mode === "resource" || ((item.flags?.stackable || stackableQuestItem) && Math.max(1, Math.floor(Number(item.count) || 1)) > 1)) {
          const count = Math.max(1, Math.floor(Number(item.count) || 1));
          const used = Math.min(count, needed);
          item.count = count - used;
          needed -= used;
          if (item.count <= 0) engine.player.inventory.splice(i, 1);
        } else {
          engine.player.inventory.splice(i, 1);
          needed -= 1;
        }
        changed = true;
      }
    }
  }
  return changed;
}

function buildRewardItems(rewards = {}, engine) {
  const items = [];
  for (const [resourceId, countRaw] of Object.entries(rewards.resources ?? {})) {
    if (resourceId === "gold") continue;
    const item = makeResourceItem(resourceId, countRaw);
    if (item) items.push(item);
  }
  for (const [itemId, countRaw] of Object.entries(rewards.items ?? {})) {
    const count = Math.max(1, Math.floor(Number(countRaw) || 1));
    for (let i = 0; i < count; i += 1) {
      const item = QUEST_ITEM_DEFS[itemId]
        ? makeQuestItem(itemId, `action:${Date.now()}`)
        : READABLE_DEF_BY_ID[itemId]
          ? makeReadableItem(itemId)
          : RESOURCE_DEFS[itemId]
            ? makeResourceItem(itemId, 1)
            : null;
      if (item) items.push(item);
      else engine?.addToast?.(`Ukendt reward item: ${itemId}`);
    }
  }
  return items;
}

function canApplyRewards(engine, rewards = {}) {
  const simulated = (engine.player?.inventory ?? []).map((item) => ({ ...item }));
  const maxSlots = inventoryUnlockedSlotCount(engine.player?.level);
  for (const item of buildRewardItems(rewards, engine)) {
    if (!inventoryCanAccept(simulated, item, maxSlots)) return false;
  }
  return true;
}

function applyRewards(engine, rewards = {}) {
  if (!rewards || typeof rewards !== "object") return false;
  let changed = false;
  const gold = Math.max(0, Math.floor(Number(rewards.gold ?? rewards.resources?.gold) || 0));
  if (gold > 0) {
    engine.player.gold = Math.max(0, Math.floor(Number(engine.player.gold) || 0) + gold);
    engine.recordRunGold?.(gold);
    engine.player.stats.goldLooted = Math.max(0, Math.floor(Number(engine.player.stats.goldLooted) || 0) + gold);
    engine.player.stats.goldEarned = Math.max(0, Math.floor(Number(engine.player.stats.goldEarned) || 0) + gold);
    changed = true;
  }
  for (const item of buildRewardItems(rewards, engine)) {
    if (engine.addInventoryItem?.(item)) {
      engine.recordRunItem?.(item);
      changed = true;
    }
  }
  return changed;
}

function applyFlags(engine, action) {
  let changed = false;
  let next = normalizeWorldState(engine.worldState);
  for (const flag of action.setFlags ?? []) {
    next = setWorldFlag(next, flag, true);
    changed = true;
  }
  for (const flag of action.clearFlags ?? []) {
    next = setWorldFlag(next, flag, false);
    changed = true;
  }
  engine.worldState = next;
  return changed;
}

function applyCounters(engine, action) {
  let changed = false;
  let next = normalizeWorldState(engine.worldState);
  for (const [key, amount] of Object.entries(action.addCounters ?? {})) {
    next = incrementWorldCounter(next, key, amount);
    changed = true;
  }
  engine.worldState = next;
  return changed;
}

function applyQuestCounterProgress(engine, action) {
  const config = action.questCounterProgress;
  if (!config?.questId || !config?.counter) return false;
  const quest = (engine.questState?.active ?? []).find((entry) => String(entry.questId) === String(config.questId));
  if (!quest) return false;
  const raw = Math.max(0, Math.floor(Number(engine.worldState?.counters?.[config.counter]) || 0));
  const value = Number.isFinite(Number(config.max)) ? Math.min(Math.max(0, Math.floor(Number(config.max))), raw) : raw;
  const field = String(config.progressField ?? "count");
  if (config.stepId) {
    const stepId = String(config.stepId);
    const current = quest.progress?.stepProgress?.[stepId] ?? {};
    if (Number(current[field]) === value) return false;
    quest.progress = {
      ...(quest.progress ?? {}),
      stepProgress: {
        ...(quest.progress?.stepProgress ?? {}),
        [stepId]: { ...current, [field]: value },
      },
    };
    return true;
  }
  if (Number(quest.progress?.[field]) === value) return false;
  quest.progress = { ...(quest.progress ?? {}), [field]: value };
  return true;
}

function applyWorldEnergyIfAvailable(engine, worldEnergy, target = null) {
  if (!worldEnergy || typeof worldEnergy !== "object") return false;
  const lydra = Number(worldEnergy.lydra) || 0;
  const netdra = Number(worldEnergy.netdra) || 0;
  if (!lydra && !netdra) return false;
  applyWorldEnergy(engine, { lydra, netdra });
  const x = Number.isFinite(Number(target?.x)) ? Number(target.x) : (engine.player?.x ?? 0);
  const y = Number.isFinite(Number(target?.y)) ? Number(target.y) : (engine.player?.y ?? 0);
  if (lydra) engine.addFloater?.(x, y, `${lydra > 0 ? "+" : ""}${lydra} Ly'dra'thot`, "#eaf4ff", 0.95);
  if (netdra) engine.addFloater?.(x, y, `${netdra > 0 ? "+" : ""}${netdra} Net'dra'thot`, "#b8a4ff", 0.95);
  return true;
}

function applyFactionRepIfAvailable(engine, factionRep) {
  if (!factionRep || typeof factionRep !== "object" || Array.isArray(factionRep)) return false;
  const applied = applyFactionRepEffects(engine.player, factionRep);
  return Object.keys(applied).length > 0;
}

function applyQuestAdvance(engine, action) {
  let changed = false;
  if (action.questStepComplete) {
    changed = Boolean(engine.advanceQuestProgress?.(action.questStepComplete)) || changed;
  }
  if (action.questAdvance) {
    changed = Boolean(engine.advanceQuestProgress?.(action.questAdvance)) || changed;
  }
  changed = Boolean(engine.refreshQuestStepProgress?.()) || changed;
  return changed;
}

function applyQuestStart(engine, action) {
  if (!action.questStart) return { ok: true, changed: false };
  const started = engine.startQuestFromAction?.(action.questStart);
  return { ok: Boolean(started), changed: Boolean(started) };
}

function removeOrReplaceTarget(engine, action, target, sourceType) {
  let changed = false;
  if (sourceType !== "object") return changed;
  const targetStateScope = action.targetStateScope ?? "persistent";
  if (action.removeTarget) {
    changed = Boolean(engine.removeActionTargetObject?.(target, { targetStateScope })) || changed;
  }
  if (action.replaceTargetWith) {
    changed = Boolean(engine.replaceActionTargetObject?.(target, action.replaceTargetWith, {
      destructible: action.replaceTargetDestructible,
      targetStateScope,
    })) || changed;
  }
  if (action.replaceFoliageWith) {
    changed = Boolean(engine.replaceActionTargetFoliage?.(target, action.replaceFoliageWith, {
      size: action.replaceFoliageSize,
      targetStateScope,
    })) || changed;
  }
  if (action.spawnObject) {
    changed = Boolean(engine.spawnActionObjectNear?.(target, action.spawnObject)) || changed;
  }
  return changed;
}

function showActionText(engine, action) {
  let text = action.text;
  let title = action.label;
  if (action.readableId) {
    const readable = READABLE_DEF_BY_ID[action.readableId];
    title = readable?.title ?? title;
    text = readable?.story ?? text;
  }
  const clean = String(text ?? "").trim();
  if (!clean) return false;
  const isQuestAction = Boolean(
    action.questId
      || action.questStart
      || action.questAdvance
      || action.questTargetKey
      || action.requires?.questActive
      || action.requires?.questCompleted
      || action.requires?.questStepActive
      || action.requires?.questStepCompleted
      || action.blockedBy?.questActive
      || action.blockedBy?.questCompleted
      || action.blockedBy?.questStepActive
      || action.blockedBy?.questStepCompleted,
  );
  engine.addToast?.(clean, {
    kind: isQuestAction ? "quest_action" : "action",
    title,
    localization: {
      type: "actionText",
      actionId: action.id,
      readableId: action.readableId ?? null,
    },
  });
  engine.addFloater?.(engine.player?.x ?? 0, engine.player?.y ?? 0, title ?? clean, "#f4da96", 1.05);
  return true;
}

function runStub(engine, action) {
  console.warn(`[actions] Action type '${action.type}' is reserved but not implemented yet`, action.id);
  engine.addToast?.("Denne handling er ikke implementeret endnu.");
  return { ok: true, changed: false, message: "not_implemented" };
}

function runImplementedHandler(engine, action, target = null, context = {}) {
  if (action.type === "enterSubregion") {
    return engine.enterSubregionFromAction?.(action, target, context)
      ?? { ok: false, changed: false, reason: "missing_subregion_handler" };
  }
  if (action.type === "exitSubregion") {
    return engine.exitSubregionFromAction?.(action, target, context)
      ?? { ok: false, changed: false, reason: "missing_subregion_handler" };
  }
  if (action.type === "inspect" || action.type === "talk" || action.type === "read" || action.type === "activate" || action.type === "reveal") {
    showActionText(engine, action);
  }
  if (action.type === "open" && action.chestLoot) {
    return engine.openActionChest?.(target, action, context)
      ?? { ok: false, changed: false, reason: "missing_chest_handler" };
  }
  if (action.questStart) {
    console.warn("[actions] questStart field is reserved for a later quest bridge", action.id);
  }
  return { ok: true, changed: false };
}

export function runAction({
  actionId,
  target = null,
  sourceType = "object",
  engine,
  world = null,
  player = null,
  context = {},
} = {}) {
  if (!engine) return { ok: false, reason: "missing_engine" };
  const action = getActionConfig(actionId);
  if (!action) {
    console.warn(`[actions] Unknown actionId: ${actionId}`);
    engine.addToast?.("Ukendt handling");
    return { ok: false, reason: "unknown_action" };
  }

  const ctx = actionContext(engine, { ...context, world, player: player ?? engine.player, target, sourceType });
  if (action.requires && !worldConditionMet(action.requires, engine.worldState, ctx)) {
    engine.addToast?.("Kravene er ikke opfyldt");
    return { ok: false, reason: "requires" };
  }
  if (action.blockedBy && worldConditionMet(action.blockedBy, engine.worldState, ctx)) {
    engine.addToast?.("Handlingen er blokeret");
    return { ok: false, reason: "blocked" };
  }

  const completionKey = actionCompletionKey({ actionId: action.id, target, sourceType, context: ctx });
  if (action.once && isActionCompleted(engine, completionKey)) {
    if (action.type === "read") showActionText(engine, action);
    else engine.addToast?.("Allerede gjort");
    return { ok: false, reason: "completed" };
  }

  const costCheck = hasCosts(engine, action.costs);
  if (!costCheck.ok) {
    engine.addToast?.(costCheck.reason);
    return { ok: false, reason: "costs" };
  }
  if (!canApplyRewards(engine, action.rewards)) {
    engine.addToast?.("Rygsaekken er fuld");
    return { ok: false, reason: "inventory_full" };
  }

  let result;
  if (IMPLEMENTED_TYPES.has(action.type)) result = runImplementedHandler(engine, action, target, ctx);
  else if (RESERVED_STUB_TYPES.has(action.type)) result = runStub(engine, action);
  else {
    console.warn(`[actions] Unimplemented action type '${action.type}' for ${action.id}`);
    engine.addToast?.("Denne handling er ikke implementeret endnu.");
    result = { ok: true, changed: false, message: "unimplemented" };
  }
  if (!result.ok) return result;

  let changed = Boolean(result.changed);
  changed = applyCosts(engine, action.costs) || changed;
  const questStart = applyQuestStart(engine, action);
  if (!questStart.ok) return { ok: false, changed, reason: "quest_start" };
  changed = questStart.changed || changed;
  changed = applyRewards(engine, action.rewards) || changed;
  changed = applyFlags(engine, action) || changed;
  changed = applyCounters(engine, action) || changed;
  changed = applyQuestCounterProgress(engine, action) || changed;
  changed = applyQuestAdvance(engine, action) || changed;
  changed = Boolean(engine.advanceActionTargetQuestProgress?.(target, 1)) || changed;
  changed = applyWorldEnergyIfAvailable(engine, action.worldEnergy, target) || changed;
  changed = applyFactionRepIfAvailable(engine, action.factionRep) || changed;
  changed = removeOrReplaceTarget(engine, action, target, sourceType) || changed;
  if (action.refreshRegionDecorators) {
    engine.markRegionDecoratorPlaced?.(target);
    changed = Boolean(engine.rebuildCountBasedRegionDecorators?.()) || changed;
  }

  if (action.once) {
    markActionCompleted(engine, completionKey);
    changed = true;
  }

  engine.recordRunAction?.(action);

  if (changed) {
    engine.updateNearbyActionTarget?.();
    engine.publishSnapshot?.();
    engine.saveProgress?.();
  }
  return { ok: true, changed, action, completionKey };
}
