import { CITY_AREAS } from "./city-areas-config.js";
import { CITY_BUILDINGS } from "./city-buildings-config.js";
import { DURABILITY_DEFAULT } from "./durability-config.js";
import { NAMED_ITEM_TEMPLATES, UNIQUE_ITEMS } from "./item-config.js";
import { POTION_DEFS } from "./potion-config.js";
import { QUEST_DEFS, QUEST_ITEM_DEFS } from "./quest-config.js";
import { RARITIES } from "./rarity-config.js";
import { READABLE_ITEM_DEFS } from "./readable-config.js";
import { RESOURCE_DEFS } from "./resource-config.js";
import { makeItem, makeNamedItem, makePotion, makeUniqueItem } from "../world.js";
import { makeReadableItem, makeResourceItem, rollItemOfRarity } from "../GameEngine/helpers/items.js";
import { makeQuestItem } from "../GameEngine/helpers/quests.js";
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
    'valtoriaCheat("give <resource|potion|quest|readable|named|unique|gear> <id|rarity|random> [count] [level]")',
    'valtoriaCheat("give resource wood_piece 50")',
    'valtoriaCheat("give potion small_health 10")',
    'valtoriaCheat("give gear rare 3 25")',
    'valtoriaCheat("give gear random_weapon 1 25")',
    'valtoriaCheat("resetQuest <questId>")',
    'valtoriaCheat("resetQuest check_inn_infestation")',
    'valtoriaCheat("resetAllQuests")',
    'valtoriaCheat("clearBestiary")',
    'valtoriaCheat("clearCityMobs")',
    'valtoriaCheat("clearCity alladdons")',
    'valtoriaCheat("clearCity allbuildings")',
    'valtoriaCheat("clearCity allareas")',
    'valtoriaCheat("clearCity all")',
    'valtoriaCheat("clearCity <buildingId|areaId|addonId>")',
    'valtoriaCheat("repairCityBuildings")',
    'valtoriaCheat("repairCityAreas")',
    'Alias: vc("help")',
  ].join("\n");
}

function normalizeGiveType(type) {
  const value = String(type ?? "").trim().toLowerCase();
  if (["resource", "resources", "res", "material", "materials"].includes(value)) return "resource";
  if (["potion", "potions", "pot", "pots", "consumable", "consumables"].includes(value)) return "potion";
  if (["quest", "questitem", "quest_item", "questitems", "quest_items"].includes(value)) return "quest";
  if (["readable", "readables", "book", "books", "note", "notes"].includes(value)) return "readable";
  if (["named", "nameditem", "named_item"].includes(value)) return "named";
  if (["unique", "uniqueitem", "unique_item"].includes(value)) return "unique";
  if (["gear", "item", "items", "equipment", "random"].includes(value)) return "gear";
  return value;
}

function clampCheatCount(value, fallback = 1) {
  const count = Math.floor(Number(value) || fallback);
  return Math.max(1, Math.min(9999, count));
}

function clampCheatLevel(value, fallback = 1) {
  const level = Math.floor(Number(value) || fallback);
  return Math.max(1, Math.min(999, level));
}

function titleForDef(def, fallback) {
  return String(def?.name ?? def?.title ?? def?.label ?? fallback ?? "").trim() || String(fallback ?? "");
}

function sortGiveOptions(options) {
  return options.sort((a, b) => {
    const group = String(a.group ?? "").localeCompare(String(b.group ?? ""), "da");
    if (group) return group;
    return String(a.label ?? "").localeCompare(String(b.label ?? ""), "da");
  });
}

export function cheatGiveOptions() {
  const options = [
    { type: "gear", id: "random", group: "Gear", label: "Gear: Random (random)", countable: true, levelable: true },
    { type: "gear", id: "random_weapon", group: "Gear", label: "Gear: Random weapon (random_weapon)", countable: true, levelable: true },
    { type: "gear", id: "random_armor", group: "Gear", label: "Gear: Random armor (random_armor)", countable: true, levelable: true },
    ...RARITIES.map((rarity) => ({
      type: "gear",
      id: rarity.id,
      group: "Gear",
      label: `Gear: ${rarity.label ?? rarity.id} (${rarity.id})`,
      countable: true,
      levelable: true,
    })),
    ...Object.entries(RESOURCE_DEFS ?? {}).map(([id, def]) => ({
      type: "resource",
      id,
      group: "Resources",
      label: `Resource: ${titleForDef(def, id)} (${id})`,
      countable: true,
      levelable: false,
    })),
    ...Object.entries(POTION_DEFS ?? {}).map(([id, def]) => ({
      type: "potion",
      id,
      group: "Potions",
      label: `Potion: ${titleForDef(def, id)} (${id})`,
      countable: true,
      levelable: true,
    })),
    ...Object.entries(QUEST_ITEM_DEFS ?? {}).map(([id, def]) => ({
      type: "quest",
      id,
      group: "Quest items",
      label: `Quest item: ${titleForDef(def, id)} (${id})`,
      countable: true,
      levelable: false,
    })),
    ...READABLE_ITEM_DEFS.map((def) => ({
      type: "readable",
      id: def.id,
      group: "Readables",
      label: `Readable: ${titleForDef(def, def.id)} (${def.id})`,
      countable: true,
      levelable: false,
    })),
    ...NAMED_ITEM_TEMPLATES.map((def) => ({
      type: "named",
      id: def.id,
      group: "Named items",
      label: `Named: ${titleForDef(def, def.id)} (${def.id})`,
      countable: true,
      levelable: true,
    })),
    ...UNIQUE_ITEMS.map((def) => ({
      type: "unique",
      id: def.id,
      group: "Unique items",
      label: `Unique: ${titleForDef(def, def.id)} (${def.id})`,
      countable: true,
      levelable: true,
    })),
  ].filter((entry) => entry.id);
  return sortGiveOptions(options);
}

function giveItemFactory(type, id, level) {
  if (type === "resource") {
    if (!RESOURCE_DEFS[id]) return null;
    return (count) => {
      const item = makeResourceItem(id, 1);
      return item ? { ...item, count } : null;
    };
  }
  if (type === "potion") {
    if (!POTION_DEFS[id]) return null;
    return (count) => ({ ...makePotion(id, level), count });
  }
  if (type === "quest") {
    if (!QUEST_ITEM_DEFS[id]) return null;
    return () => makeQuestItem(id);
  }
  if (type === "readable") {
    if (!READABLE_ITEM_DEFS.some((entry) => String(entry.id) === id)) return null;
    return () => makeReadableItem(id);
  }
  if (type === "named") {
    const def = NAMED_ITEM_TEMPLATES.find((entry) => String(entry.id) === id);
    return def ? () => makeNamedItem(def, level) : null;
  }
  if (type === "unique") {
    const def = UNIQUE_ITEMS.find((entry) => String(entry.id) === id);
    return def ? () => makeUniqueItem(def, level) : null;
  }
  if (type === "gear") {
    const rarity = RARITIES.find((entry) => String(entry.id) === id);
    if (id === "random") return () => makeItem(level);
    if (id === "random_weapon") return () => makeItem(level, 0);
    if (id === "random_armor") return () => makeItem(level, 1);
    return rarity ? () => rollItemOfRarity(level, rarity.id) : null;
  }
  return null;
}

function giveCheat(api, rawType, rawId, rawCount, rawLevel) {
  const engine = api.getEngine?.();
  if (!engine?.player?.inventory || typeof engine.addInventoryItem !== "function") return result(false, "No active game engine.");
  const type = normalizeGiveType(rawType);
  const id = String(rawId ?? "").trim();
  if (!type || !id) {
    return result(false, "Missing give type or id.", {
      examples: ["give resource wood_piece 50", "give potion small_health 10", "give gear rare 3 25"],
    });
  }

  const count = clampCheatCount(rawCount);
  const level = clampCheatLevel(rawLevel, engine.player?.level ?? 1);
  const factory = giveItemFactory(type, id, level);
  if (!factory) {
    return result(false, `Unknown give item: ${type} ${id}`, {
      examples: cheatGiveOptions().slice(0, 12).map((option) => `give ${option.type} ${option.id}`),
    });
  }

  let added = 0;
  const stackable = type === "resource" || type === "potion";
  if (stackable) {
    const item = factory(count);
    if (item && engine.addInventoryItem(item)) added = count;
    else added = Math.max(0, count - Math.max(1, Math.floor(Number(item?.count) || count)));
  } else {
    for (let i = 0; i < count; i += 1) {
      const item = factory(1);
      if (!item || !engine.addInventoryItem(item)) break;
      added += 1;
    }
  }

  if (added <= 0) return result(false, `Inventory full; could not give ${type} ${id}.`, { type, id, requested: count });
  engine.addToast?.(`Cheat: gav ${added}x ${id}`);
  engine.publishSnapshot?.();
  engine.saveProgress?.({ force: true });
  return result(true, `Gave ${added}x ${type} ${id}.`, {
    type,
    id,
    requested: count,
    added,
    level,
    partial: added < count,
  });
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

function cityAddonIds() {
  const entries = new Map();
  for (const building of CITY_BUILDINGS) {
    for (const addon of building.addons ?? []) {
      if (addon?.id) entries.set(String(addon.id), { addon, building });
    }
  }
  return entries;
}

function clearAddonFromProgress(progress, addonId = null) {
  let changed = 0;
  const wantedId = addonId ? String(addonId) : null;
  const next = { ...progress };
  for (const building of CITY_BUILDINGS) {
    if (!building?.id) continue;
    const state = next[building.id];
    if (!state || typeof state !== "object" || Array.isArray(state)) continue;
    const purchased = Array.isArray(state.purchasedAddons) ? state.purchasedAddons.map(String) : [];
    const legacy = Array.isArray(state.addons) ? state.addons.map(String) : [];
    const nextPurchased = wantedId ? purchased.filter((id) => id !== wantedId) : [];
    const nextLegacy = wantedId ? legacy.filter((id) => id !== wantedId) : [];
    if (nextPurchased.length !== purchased.length || nextLegacy.length !== legacy.length || (!wantedId && (purchased.length > 0 || legacy.length > 0))) {
      changed += Math.max(1, purchased.length - nextPurchased.length + legacy.length - nextLegacy.length);
      next[building.id] = {
        ...state,
        purchasedAddons: nextPurchased,
      };
      delete next[building.id].addons;
    }
  }
  return { progress: next, changed };
}

function clearCityProgressTarget(api, rawTarget = "all") {
  const target = String(rawTarget ?? "all").trim();
  if (!target) return result(false, "Missing city clear target.");

  const normalizedTarget = target.toLowerCase();
  const progress = loadCityProgress(api);
  const buildingIds = new Set(CITY_BUILDINGS.map((building) => String(building.id)));
  const areaIds = new Set(CITY_AREAS.map((area) => String(area.id)));
  const addonEntries = cityAddonIds();
  let next = { ...progress };
  const removed = { areas: 0, buildings: 0, addons: 0 };

  const clearBuildings = () => {
    for (const buildingId of buildingIds) {
      if (Object.prototype.hasOwnProperty.call(next, buildingId)) {
        delete next[buildingId];
        removed.buildings += 1;
      }
    }
  };

  const clearAreas = () => {
    const areas = { ...(next.areas ?? {}) };
    for (const areaId of areaIds) {
      if (Object.prototype.hasOwnProperty.call(areas, areaId)) {
        delete areas[areaId];
        removed.areas += 1;
      }
    }
    next.areas = areas;
  };

  if (["alladdon", "alladdons", "addons"].includes(normalizedTarget)) {
    const cleared = clearAddonFromProgress(next);
    next = cleared.progress;
    removed.addons = cleared.changed;
  } else if (["allbuilding", "allbuildings", "buildings"].includes(normalizedTarget)) {
    clearBuildings();
  } else if (["allarea", "allareas", "areas", "all"].includes(normalizedTarget)) {
    clearAreas();
    clearBuildings();
  } else if (buildingIds.has(target)) {
    if (Object.prototype.hasOwnProperty.call(next, target)) {
      delete next[target];
      removed.buildings = 1;
    }
  } else if (areaIds.has(target)) {
    const areas = { ...(next.areas ?? {}) };
    if (Object.prototype.hasOwnProperty.call(areas, target)) {
      delete areas[target];
      removed.areas = 1;
    }
    next.areas = areas;
  } else if (addonEntries.has(target)) {
    const cleared = clearAddonFromProgress(next, target);
    next = cleared.progress;
    removed.addons = cleared.changed;
  } else {
    return result(false, `Unknown city clear target: ${target}`, {
      examples: ["alladdons", "allbuildings", "allareas", "all", "barracks", "melee_training"],
    });
  }

  commitCityProgress(api, next, `Cheat: city progress ryddet (${target})`);
  return result(true, `City progress cleared: ${target}`, {
    removed,
    note: "Config prebuilt buildings/addons still apply at runtime.",
  });
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
    if (command === "give" || command === "giveitem" || command === "item") return giveCheat(api, parts[0], parts[1], parts[2], parts[3]);
    if (command === "resetquest" || command === "questreset") return resetQuest(api, parts[0]);
    if (command === "resetallquests" || command === "questsreset" || command === "clearquests") return resetAllQuests(api);
    if (command === "clearbestiary" || command === "resetbestiary") return clearBestiary(api);
    if (command === "clearcitymobs" || command === "citymobsclear") return clearCityMobs(api);
    if (command === "clearcity" || command === "resetcity" || command === "cityclear") return clearCityProgressTarget(api, parts[0] ?? "all");
    if (command === "repaircitybuildings" || command === "repairbuildings") return repairCityBuildings(api);
    if (command === "repaircityareas" || command === "repairareas") return repairCityAreas(api);
    return result(false, `Unknown cheat command: ${command}`, { help: commandHelp() });
  };

  window[commandName] = run;
  if (alias) window[alias] = run;
  return true;
}
