import { CITY_AREAS } from "./city-areas-config.js";
import { CITY_BUILDINGS } from "./city-buildings-config.js";
import { DURABILITY_DEFAULT } from "./durability-config.js";
import { QUEST_DEFS } from "./quest-config.js";
import { normalizeWorldState } from "../world-state.js";

// Toggle this to false before live builds, or remove the import from App.jsx.
export const CHEAT_SETTINGS = {
  enabled: true,
  commandName: "valtoriaCheat",
  exposeAlias: "vc",
  defaultDurability: 100,
  questResetFlags: {
    check_inn_infestation: [
      "inn_crack_found",
      "inn_crack_entered",
      "inn_crack_cave_cleared",
      "inn_crack_destroyed",
    ],
  },
};

function clone(value) {
  if (value === null || value === undefined) return value;
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function tokenize(input) {
  if (Array.isArray(input)) return input.map(String);
  return String(input ?? "").match(/"[^"]+"|'[^']+'|\S+/g)?.map((part) => part.replace(/^["']|["']$/g, "")) ?? [];
}

function normalizeCommand(input, args) {
  if (Array.isArray(input)) return input.map(String);
  return [...tokenize(input), ...(args ?? []).map(String)];
}

function commandHelp() {
  return [
    "Valtoria cheats:",
    'valtoriaCheat("help")',
    'valtoriaCheat("resetQuest <questId>")',
    'valtoriaCheat("resetQuest check_inn_infestation")',
    'valtoriaCheat("resetAllQuests")',
    'valtoriaCheat("clearBestiary")',
    'valtoriaCheat("clearCityMobs")',
    'valtoriaCheat("repairCityBuildings")',
    'valtoriaCheat("repairCityAreas")',
    'Alias: vc("help")',
  ].join("\n");
}

function result(ok, message, data = {}) {
  const output = { ok, message, ...data };
  if (ok) console.info(`[cheat] ${message}`, data);
  else console.warn(`[cheat] ${message}`, data);
  return output;
}

function getCityStorageKey(api) {
  return api.getCityStorageKey?.() ?? "valtoria.cityProgress.v1";
}

function loadCityProgress(api) {
  return clone(api.loadCityProgress?.(getCityStorageKey(api)) ?? api.getCityProgress?.() ?? {});
}

function commitCityProgress(api, progress, message) {
  const storageKey = getCityStorageKey(api);
  api.saveCityProgress?.(progress, storageKey);
  api.setCityProgress?.(progress);
  const engine = api.getEngine?.();
  if (engine) {
    engine.cityProgress = progress;
    engine.addToast?.(message);
    engine.publishSnapshot?.();
    engine.saveProgress?.({ force: true });
  }
  api.refreshCity?.();
}

function addStringOrList(target, value) {
  if (Array.isArray(value)) {
    for (const entry of value) addStringOrList(target, entry);
    return;
  }
  const text = String(value ?? "").trim();
  if (text) target.add(text);
}

function collectQuestConditionFlags(target, value) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const entry of value) collectQuestConditionFlags(target, entry);
    return;
  }
  addStringOrList(target, value.flag);
  addStringOrList(target, value.notFlag);
  collectQuestConditionFlags(target, value.conditions);
  collectQuestConditionFlags(target, value.requires);
  collectQuestConditionFlags(target, value.completeWhen);
  collectQuestConditionFlags(target, value.revealWhen);
  collectQuestConditionFlags(target, value.all);
  collectQuestConditionFlags(target, value.any);
  collectQuestConditionFlags(target, value.not);
}

function collectQuestTargetItemIds(target, questDef) {
  const questTarget = questDef?.target ?? {};
  addStringOrList(target, questTarget.questItemId);
  for (const entry of Array.isArray(questTarget.questItems) ? questTarget.questItems : []) {
    addStringOrList(target, entry?.questItemId);
  }
}

function questResetFlagsFor(id) {
  const flags = new Set(CHEAT_SETTINGS.questResetFlags[id] ?? []);
  const def = QUEST_DEFS?.[id] ?? null;
  if (def) {
    collectQuestConditionFlags(flags, def);
    for (const step of Array.isArray(def.steps) ? def.steps : []) collectQuestConditionFlags(flags, step);
  }
  return [...flags];
}

function collectAllQuestResetFlags() {
  const flags = new Set();
  for (const questId of Object.keys(QUEST_DEFS ?? {})) {
    for (const flag of questResetFlagsFor(questId)) flags.add(flag);
  }
  return flags;
}

function isQuestWorldStateKey(key, questFlags) {
  const text = String(key ?? "");
  return text.startsWith("quest.") || questFlags.has(text);
}

function clearBestiary(api) {
  const engine = api.getEngine?.();
  if (!engine) return result(false, "No active game engine.");
  const next = normalizeWorldState(engine.worldState);
  const hadBestiary = Object.prototype.hasOwnProperty.call(next.values, "monsterDiscovery");
  delete next.values.monsterDiscovery;
  engine.worldState = next;
  engine.addToast?.("Cheat: Bestiary ryddet");
  engine.publishSnapshot?.();
  engine.saveProgress?.({ force: true });
  return result(true, "Bestiary cleared.", { changed: hadBestiary });
}

function resetQuest(api, questId) {
  const id = String(questId ?? "").trim();
  if (!id) return result(false, "Missing quest id.");
  const engine = api.getEngine?.();
  if (!engine?.questState) return result(false, "No active game engine.");

  const def = QUEST_DEFS?.[id] ?? null;
  const removedInstanceIds = new Set();
  for (const quest of engine.questState.active ?? []) {
    if (String(quest?.questId) === id && quest?.id) removedInstanceIds.add(String(quest.id));
  }
  const beforeActive = engine.questState.active?.length ?? 0;
  const beforeCompleted = engine.questState.completed?.length ?? 0;
  engine.questState.active = (engine.questState.active ?? []).filter((quest) => String(quest.questId) !== id);
  engine.questState.completed = (engine.questState.completed ?? []).filter((completedId) => String(completedId) !== id);
  if (engine.questState.cityOfferRolls) delete engine.questState.cityOfferRolls[id];
  for (const board of Object.values(engine.questState.questBoards ?? {})) {
    if (board?.completedCooldowns) delete board.completedCooldowns[id];
    if (Array.isArray(board?.availableQuestIds)) {
      board.availableQuestIds = board.availableQuestIds.filter((entry) => String(entry) !== id);
    }
  }

  const flags = questResetFlagsFor(id);
  if (flags.length > 0) {
    engine.worldState = {
      ...(engine.worldState ?? {}),
      flags: { ...(engine.worldState?.flags ?? {}) },
    };
    for (const flag of flags) delete engine.worldState.flags[flag];
  }

  const questItemIds = new Set();
  collectQuestTargetItemIds(questItemIds, def);
  const beforeInventory = engine.player?.inventory?.length ?? 0;
  if (Array.isArray(engine.player?.inventory) && (removedInstanceIds.size > 0 || questItemIds.size > 0)) {
    engine.player.inventory = engine.player.inventory.filter((item) => {
      if (item?.mode !== "quest") return true;
      if (item.questInstanceId != null && removedInstanceIds.has(String(item.questInstanceId))) return false;
      if (questItemIds.size > 0 && questItemIds.has(String(item.questItemId ?? ""))) return false;
      return true;
    });
  }

  engine.addToast?.(`Cheat: quest reset ${id}`);
  engine.publishSnapshot?.();
  engine.saveProgress?.({ force: true });
  return result(true, `Quest reset: ${id}`, {
    knownQuest: Boolean(def),
    removedActive: beforeActive - (engine.questState.active?.length ?? 0),
    removedCompleted: beforeCompleted - (engine.questState.completed?.length ?? 0),
    removedQuestItems: beforeInventory - (engine.player?.inventory?.length ?? 0),
    clearedFlags: flags,
  });
}

function resetAllQuests(api) {
  const engine = api.getEngine?.();
  if (!engine?.questState) return result(false, "No active game engine.");

  const beforeActive = engine.questState.active?.length ?? 0;
  const beforeCompleted = engine.questState.completed?.length ?? 0;
  const beforeInventory = engine.player?.inventory?.length ?? 0;

  engine.questState.active = [];
  engine.questState.completed = [];
  engine.questState.cityOfferRolls = {};
  engine.questState.questBoards = {};
  engine.questState.cityFade = [];
  engine.questState.wildernessNpc = null;
  engine.nearbyQuestgiver = null;

  if (Array.isArray(engine.player?.inventory)) {
    engine.player.inventory = engine.player.inventory.filter((item) => item?.mode !== "quest");
  }

  const questFlags = collectAllQuestResetFlags();
  const normalizedWorldState = normalizeWorldState(engine.worldState);
  const cleared = { flags: 0, counters: 0, values: 0 };
  const nextWorldState = {
    flags: {},
    counters: {},
    values: {},
  };

  for (const [key, value] of Object.entries(normalizedWorldState.flags)) {
    if (isQuestWorldStateKey(key, questFlags)) {
      cleared.flags += 1;
    } else {
      nextWorldState.flags[key] = value;
    }
  }
  for (const [key, value] of Object.entries(normalizedWorldState.counters)) {
    if (isQuestWorldStateKey(key, questFlags)) {
      cleared.counters += 1;
    } else {
      nextWorldState.counters[key] = value;
    }
  }
  for (const [key, value] of Object.entries(normalizedWorldState.values)) {
    if (isQuestWorldStateKey(key, questFlags)) {
      cleared.values += 1;
    } else {
      nextWorldState.values[key] = value;
    }
  }
  engine.worldState = nextWorldState;

  engine.addToast?.("Cheat: alle quests nulstillet");
  engine.prepareRegionQuestgiver?.();
  engine.publishSnapshot?.();
  engine.saveProgress?.({ force: true });
  return result(true, "All quests reset.", {
    removedActive: beforeActive,
    removedCompleted: beforeCompleted,
    removedQuestItems: beforeInventory - (engine.player?.inventory?.length ?? 0),
    clearedWorldState: cleared,
  });
}

function clearCityMobs(api) {
  const progress = loadCityProgress(api);
  const removed = Array.isArray(progress.cityMobs) ? progress.cityMobs.length : 0;
  const next = { ...progress, cityMobs: [] };
  commitCityProgress(api, next, `Cheat: ryddede ${removed} city mobs`);
  return result(true, "City mobs cleared.", { removed });
}

function repairCityBuildings(api) {
  const progress = loadCityProgress(api);
  const durability = Number(CHEAT_SETTINGS.defaultDurability) || DURABILITY_DEFAULT;
  let changed = 0;
  const next = { ...progress };
  for (const building of CITY_BUILDINGS) {
    if (!building?.id) continue;
    const state = next[building.id];
    if (!state || typeof state !== "object" || Array.isArray(state)) continue;
    next[building.id] = { ...state, durability };
    changed += 1;
  }
  commitCityProgress(api, next, `Cheat: ${changed} bygninger repareret`);
  return result(true, "City building durability repaired.", { changed, durability });
}

function repairCityAreas(api) {
  const progress = loadCityProgress(api);
  const durability = Number(CHEAT_SETTINGS.defaultDurability) || DURABILITY_DEFAULT;
  const areas = { ...(progress.areas ?? {}) };
  let changed = 0;
  for (const area of CITY_AREAS) {
    if (!area?.id) continue;
    const state = areas[area.id];
    if (!state || typeof state !== "object" || Array.isArray(state)) continue;
    areas[area.id] = { ...state, durability };
    changed += 1;
  }
  const next = { ...progress, areas };
  commitCityProgress(api, next, `Cheat: ${changed} areas repareret`);
  return result(true, "City area durability repaired.", { changed, durability });
}

export function installValtoriaCheats(api = {}) {
  if (typeof window === "undefined") return false;
  const commandName = CHEAT_SETTINGS.commandName;
  const alias = CHEAT_SETTINGS.exposeAlias;
  if (!CHEAT_SETTINGS.enabled) {
    delete window[commandName];
    if (alias) delete window[alias];
    return false;
  }

  const run = (input = "help", ...args) => {
    const [rawCommand, ...parts] = normalizeCommand(input, args);
    const command = String(rawCommand ?? "help").trim().toLowerCase();
    if (!command || command === "help") return commandHelp();
    if (command === "resetquest" || command === "questreset") return resetQuest(api, parts[0]);
    if (command === "resetallquests" || command === "questsreset" || command === "clearquests") return resetAllQuests(api);
    if (command === "clearbestiary" || command === "resetbestiary") return clearBestiary(api);
    if (command === "clearcitymobs" || command === "citymobsclear") return clearCityMobs(api);
    if (command === "repaircitybuildings" || command === "repairbuildings") return repairCityBuildings(api);
    if (command === "repaircityareas" || command === "repairareas") return repairCityAreas(api);
    return result(false, `Unknown cheat command: ${command}`, { help: commandHelp() });
  };

  window[commandName] = run;
  if (alias) window[alias] = run;
  return true;
}
