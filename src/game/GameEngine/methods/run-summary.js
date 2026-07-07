import { REGION_OBJECT_DEFS } from "../../config/region-object-config.js";
import { ACTION_CONFIG } from "../../config/action-config.js";
import { worldEntryAllowed } from "../../world-state.js";

function positiveInt(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

function questSnapshot(quests = []) {
  return Object.fromEntries(quests.map((quest) => [String(quest.id), {
    title: quest.title ?? quest.questId ?? "Quest",
    progress: structuredClone(quest.progress ?? {}),
  }]));
}

function numericProgress(value, prefix = "", result = {}) {
  if (!value || typeof value !== "object") return result;
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof child === "number" && Number.isFinite(child)) result[path] = child;
    else if (typeof child === "boolean") result[path] = child ? 1 : 0;
    else if (child && typeof child === "object") numericProgress(child, path, result);
  }
  return result;
}

function actionCategory(action) {
  const type = String(action?.type ?? "action");
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function addRunItem(target, item, amount) {
  const label = item.name ?? item.baseName ?? item.questItemId ?? item.resourceId ?? "Unknown item";
  const key = `${label}|${item.rarity ?? "normal"}|${item.namedId ?? ""}|${item.uniqueId ?? ""}`;
  const current = target[key] ?? {
    label,
    count: 0,
    item: {
      name: item.name,
      baseName: item.baseName,
      resourceId: item.resourceId,
      questItemId: item.questItemId,
      potionId: item.potionId,
      potionType: item.potionType,
      readableId: item.readableId,
      namedId: item.namedId,
      uniqueId: item.uniqueId,
      i18n: item.i18n,
    },
    rarity: item.uniqueId ? "unique" : (item.rarity ?? "normal"),
    named: Boolean(item.named || item.namedId),
    unique: Boolean(item.unique || item.uniqueId),
  };
  current.count += amount;
  target[key] = current;
}

function availableAction(engine, object, def) {
  const candidates = [
    ...(Array.isArray(object.actions) ? object.actions : []),
    object.actionId ? { actionId: object.actionId } : null,
    ...(Array.isArray(object.defaultActions) ? object.defaultActions : []),
    (object.defaultActionId ?? def?.defaultActionId) ? { actionId: object.defaultActionId ?? def.defaultActionId } : null,
  ].filter(Boolean);
  const context = {
    region: engine.region,
    regionId: engine.region?.mapRegion?.id ?? engine.region?.id,
    regionConfig: engine.region?.mapRegion,
    worldState: engine.worldState,
    worldEnergy: engine.worldEnergy,
    questState: engine.questState,
    player: engine.player,
    inventory: engine.player?.inventory,
    activeMapRegion: engine.activeMapRegion,
    target: object,
    sourceObjectId: object.objectDefId ?? object.type,
    sourceObjectRuntimeId: object.runtimeId ?? object.id,
  };
  return candidates.find((entry) => {
    if (!entry.actionId || !worldEntryAllowed(entry, engine.worldState, context)) return false;
    const action = ACTION_CONFIG[entry.actionId];
    return !action || worldEntryAllowed(action, engine.worldState, context);
  })?.actionId ?? null;
}

export const runSummaryMethods = {
  beginRunSummary(active) {
    const objects = [...this.chunks.values()].flatMap((chunk) => [...(chunk.objects ?? []), ...(chunk.foliage ?? [])]);
    const actions = {};
    let destructibleAvailable = 0;
    for (const object of objects) {
      const def = REGION_OBJECT_DEFS[object.objectDefId ?? object.type];
      if (object.destructible || def?.destructible || def?.defaultDestructible) destructibleAvailable += 1;
      const actionId = availableAction(this, object, def);
      if (!actionId) continue;
      const action = ACTION_CONFIG[actionId];
      const label = actionCategory(action);
      actions[label] = { completed: 0, available: positiveInt(actions[label]?.available) + 1 };
    }
    const monsters = [...this.monsters.values()].filter((monster) => !monster.isMinion);
    this.currentRunSummary = {
      regionId: active.regionId,
      regionLabel: active.label,
      regionI18n: this.region?.mapRegion?.i18n,
      startedAt: Date.now(),
      worldEnergyStart: {
        lydra: Number(this.worldEnergy?.lydra) || 0,
        netdra: Number(this.worldEnergy?.netdra) || 0,
      },
      xpGained: 0,
      goldGained: 0,
      resources: {},
      itemsCollected: {},
      questItems: {},
      kills: {},
      monstersSpawned: monsters.length,
      objectsDestroyed: 0,
      objectsAvailable: destructibleAvailable,
      actions,
      questStart: questSnapshot(this.questState?.active),
    };
  },

  recordRunXp(amount) {
    if (this.currentRunSummary) this.currentRunSummary.xpGained += positiveInt(amount);
  },

  recordRunGold(amount) {
    if (this.currentRunSummary) this.currentRunSummary.goldGained += positiveInt(amount);
  },

  recordRunItem(item, count = null) {
    const run = this.currentRunSummary;
    if (!run || !item) return;
    const amount = positiveInt(count ?? item.count ?? 1) || 1;
    if (item.mode === "quest" || item.questItemId) {
      addRunItem(run.questItems, item, amount);
    } else if (item.mode === "resource" || item.resourceId) {
      addRunItem(run.resources, item, amount);
    } else {
      addRunItem(run.itemsCollected, item, amount);
    }
  },

  recordRunKill(monster) {
    if (!this.currentRunSummary || monster?.isMinion) return;
    const label = monster?.typeName ?? monster?.name ?? "Unknown enemy";
    this.currentRunSummary.kills[label] = positiveInt(this.currentRunSummary.kills[label]) + 1;
  },

  recordRunObjectDestroyed() {
    if (this.currentRunSummary) this.currentRunSummary.objectsDestroyed += 1;
  },

  recordRunAction(action) {
    if (!this.currentRunSummary || !action) return;
    const label = actionCategory(action);
    const entry = this.currentRunSummary.actions[label] ?? { completed: 0, available: 0 };
    entry.completed += 1;
    this.currentRunSummary.actions[label] = entry;
  },

  finishRunSummary({ active, mobCounts, cleared, abandoned, reachedExit }) {
    const run = this.currentRunSummary ?? { regionId: active.regionId, regionLabel: active.label, startedAt: Date.now() };
    const beforeQuests = run.questStart ?? {};
    const questProgress = [];
    for (const quest of this.questState?.active ?? []) {
      const before = numericProgress(beforeQuests[String(quest.id)]?.progress ?? {});
      const after = numericProgress(quest.progress ?? {});
      const gained = Object.entries(after).reduce((sum, [key, value]) => sum + Math.max(0, value - (before[key] ?? value)), 0);
      if (gained > 0) questProgress.push({ title: quest.title ?? quest.questId ?? "Quest", questId: quest.questId, gained });
    }
    const actions = Object.entries(run.actions ?? {}).map(([label, value]) => ({ label, ...value }));
    const actionsCompleted = actions.reduce((sum, entry) => sum + positiveInt(entry.completed), 0);
    const actionsAvailable = actions.reduce((sum, entry) => sum + positiveInt(entry.available), 0);
    const itemsLeftBehind = {};
    for (const loot of this.loots ?? []) {
      const item = loot?.item;
      if (!item || item.mode === "resource" || item.resourceId || item.mode === "quest" || item.questItemId) continue;
      addRunItem(itemsLeftBehind, item, positiveInt(item.count) || 1);
    }
    const lydraGained = Math.max(0, (Number(this.worldEnergy?.lydra) || 0) - (Number(run.worldEnergyStart?.lydra) || 0));
    const netdraGained = Math.max(0, (Number(this.worldEnergy?.netdra) || 0) - (Number(run.worldEnergyStart?.netdra) || 0));
    const summary = {
      ...run,
      endedAt: Date.now(),
      outcome: abandoned ? "Early Exit" : cleared ? "Completed" : "Returned",
      earlyExit: Boolean(abandoned),
      regionCleared: Boolean(cleared),
      reachedExit: Boolean(reachedExit),
      monstersSpawned: positiveInt(run.monstersSpawned ?? mobCounts.total),
      remainingMobs: positiveInt(mobCounts.alive),
      actions,
      actionsCompleted,
      actionsAvailable,
      questProgress,
      itemsLeftBehind,
      lydraGained,
      netdraGained,
      runtimeCleared: Boolean(abandoned),
    };
    this.currentRunSummary = null;
    return summary;
  },
};
