import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { CITY_ACHIEVEMENTS } from "../src/game/config/city-achievement-config.js";
import { NAMED_ITEM_TEMPLATES } from "../src/game/config/item-config.js";
import { ACTION_CONFIG } from "../src/game/config/action-config.js";
import { MAP_PREFABS } from "../src/game/config/map-prefab-config.js";
import { MONSTER_DEFS } from "../src/game/config/monster-config.js";
import { QUEST_DEFS, QUEST_ITEM_DEFS } from "../src/game/config/quest-config.js";
import { SAVE_PERSIST_CONFIG } from "../src/game/config/save-persist-config.js";
import { createVillageOutskirtsMapRegions } from "../src/game/config/map-region/village-outskirts.js";
import { questsMethods } from "../src/game/GameEngine/methods/quests.js";
import { makeQuestInstance, questSavePayload } from "../src/game/GameEngine/helpers/quests.js";
import { makeQuestItem } from "../src/game/GameEngine/helpers/quests.js";

const ids = [
  "help_hunter_kill_wolfs",
  "help_hunter_kill_boars",
  "help_hunter_find_bow",
  "help_hunter_find_weddingring",
  "help_hunter_find_flower",
];
const quests = ids.map((id) => QUEST_DEFS[id]);

assert(quests.every(Boolean), "all five hunter quests must exist");
assert(quests.every((quest) => quest.repeatable === false), "hunter quests must be non-repeatable");
assert(quests.every((quest) => quest.npcIds?.includes("hunter")), "hunter must offer and receive every quest");

const expectedGates = [
  [null, 5],
  ["help_hunter_kill_wolfs", 7],
  ["help_hunter_kill_boars", 9],
  ["help_hunter_find_bow", 9],
  ["help_hunter_find_weddingring", 9],
];
expectedGates.forEach(([previousQuest, regionCount], index) => {
  if (previousQuest) assert.deepEqual(quests[index].demands.completedQuests, [previousQuest]);
  else assert.equal(quests[index].demands.completedQuests, undefined);
  assert.equal(quests[index].demands.unlockedRegionCount.min, regionCount);
});

function demandEngine(completed = []) {
  return {
    player: { level: 99, inventory: [] },
    questState: { completed, active: [] },
    demandNumberMet: questsMethods.demandNumberMet,
    countDemandItems: questsMethods.countDemandItems,
  };
}

function worldWithUnlockedRegions(count) {
  return {
    flags: Object.fromEntries(Array.from({ length: count }, (_, index) => [`region.test-${index}.unlocked`, true])),
    counters: {},
    values: {},
  };
}

expectedGates.forEach(([previousQuest, regionCount], index) => {
  const engine = demandEngine([previousQuest]);
  const demands = quests[index].demands;
  assert.equal(questsMethods.questDemandsMet.call(engine, demands, { worldState: worldWithUnlockedRegions(regionCount), player: engine.player }), true);
  assert.equal(questsMethods.questDemandsMet.call(engine, demands, { worldState: worldWithUnlockedRegions(regionCount - 1), player: engine.player }), false);
  if (previousQuest) {
    const missingPrevious = demandEngine([]);
    assert.equal(questsMethods.questDemandsMet.call(missingPrevious, demands, { worldState: worldWithUnlockedRegions(regionCount), player: missingPrevious.player }), false);
  }
});

const matchEngine = {
  questItemCanDropFromMonster: questsMethods.questItemCanDropFromMonster,
  questItemCanDropFromObject: questsMethods.questItemCanDropFromObject,
};
const monsterCanDrop = (target, typeName) => questsMethods.questTargetMatchesSource.call(matchEngine, target, {
  source: "monster",
  monster: { typeName },
});

assert(monsterCanDrop(QUEST_DEFS.help_hunter_kill_wolfs.target, "Wolf"));
assert(!monsterCanDrop(QUEST_DEFS.help_hunter_kill_wolfs.target, "Wild Boar"));
assert(monsterCanDrop(QUEST_DEFS.help_hunter_kill_boars.target, "Wild Boar"));
assert(!monsterCanDrop(QUEST_DEFS.help_hunter_kill_boars.target, "Wolf"));

const bowTarget = QUEST_DEFS.help_hunter_find_bow.target;
for (const typeName of ["Skeleton", "Deep Guard", "Gate Warden", "Bone Warden", "Iron Revenant", "Village01", "Village02", "Village03", "Village04", "Village05", "Village06", "Demon", "Ghost"]) {
  assert(MONSTER_DEFS[typeName], `${typeName} must be a real monster definition`);
  assert(monsterCanDrop(bowTarget, typeName), `${typeName} must be able to drop the hunter bow`);
}
assert(!monsterCanDrop(bowTarget, "Wild Boar"));

const ringTarget = QUEST_DEFS.help_hunter_find_weddingring.target;
assert(monsterCanDrop(ringTarget, "Wolf"));
assert(!monsterCanDrop(ringTarget, "Wild Boar"), "the wedding ring must never drop from boars");
assert.deepEqual(QUEST_DEFS.help_hunter_find_bow.rewards.achievements, ["hunter_friend_lvl_1"]);
assert.deepEqual(QUEST_DEFS.help_hunter_find_weddingring.rewards.achievements, ["hunter_friend_lvl_2"]);

const flowerQuest = QUEST_DEFS.help_hunter_find_flower;
assert.equal(flowerQuest.type, "quest_chain");
assert.deepEqual(flowerQuest.steps.map((step) => step.id), ["bring_red_roses", "bring_rare_flowers", "find_sacred_flower"]);
assert.deepEqual(flowerQuest.steps[0].target.resources, [{ resource: "red_rose", count: 12 }]);
assert.deepEqual(flowerQuest.steps[1].target.resources, [{ resource: "rare_pink_flower", count: 12 }]);
assert.equal(flowerQuest.steps[2].target.questItemId, "quest_hunters_love_flower");
assert(flowerQuest.steps[2].onStart.setFlags.includes("region.old-shrine.unlocked"));
assert(flowerQuest.steps[2].onComplete.setFlags.includes("region.path-to-hunter-hut.unlocked"));
assert(flowerQuest.steps[2].onComplete.setFlags.includes("region.hunter-trail-to-the-forest.unlocked"));
assert(flowerQuest.steps[2].rewards.namedItems.some((reward) => reward.namedId === "hunters_bow"));
assert.deepEqual(flowerQuest.steps[2].rewards.achievements, ["hunter_friend_lvl_3"]);
const effectEngine = { worldState: { flags: {}, counters: {}, values: {} }, chunks: new Map() };
assert(questsMethods.applyQuestStepEffects.call(effectEngine, flowerQuest.steps[2].onStart));
assert.equal(effectEngine.worldState.flags["region.old-shrine.unlocked"], true);
assert(questsMethods.applyQuestStepEffects.call(effectEngine, flowerQuest.steps[2].onComplete));
assert.equal(effectEngine.worldState.flags["region.path-to-hunter-hut.unlocked"], true);
assert.equal(effectEngine.worldState.flags["region.hunter-trail-to-the-forest.unlocked"], true);

const flowerInstance = makeQuestInstance(flowerQuest, "hunter", { regionSeed: 1, regionIndex: 1 });
flowerInstance.progress = {
  ...flowerInstance.progress,
  currentStepId: "bring_rare_flowers",
  completedStepIds: ["bring_red_roses"],
  revealedStepIds: ["bring_red_roses", "bring_rare_flowers"],
};
const savedFlowerInstance = JSON.parse(JSON.stringify(questSavePayload(flowerInstance)));
assert.equal(savedFlowerInstance.progress.currentStepId, "bring_rare_flowers");
assert.deepEqual(savedFlowerInstance.progress.completedStepIds, ["bring_red_roses"]);
assert.equal(savedFlowerInstance.steps.length, 3);
assert.equal(SAVE_PERSIST_CONFIG.quests.active, true);
assert.equal(SAVE_PERSIST_CONFIG.quests.completed, true);
assert.equal(SAVE_PERSIST_CONFIG.worldState, true);
assert.equal(SAVE_PERSIST_CONFIG.cityProgress.achievements, true);

const achievementById = Object.fromEntries(CITY_ACHIEVEMENTS.map((achievement) => [achievement.id, achievement]));
for (const [level, questId] of [[1, "help_hunter_find_bow"], [2, "help_hunter_find_weddingring"], [3, "help_hunter_find_flower"]]) {
  const achievement = achievementById[`hunter_friend_lvl_${level}`];
  assert(achievement, `hunter friend level ${level} achievement must exist`);
  assert.equal(achievement.levels.length, 1);
  assert.equal(achievement.levels[0].condition.questCompleted, questId);
}

for (const itemId of ["hunter_wolf_tail", "hunter_boar_tusk", "quest_hunters_bow", "quest_hunters_wedding_ring", "quest_hunters_love_flower"]) {
  assert(QUEST_ITEM_DEFS[itemId], `${itemId} must exist`);
}
for (const namedId of ["hunters_wolf_cape", "hunters_boar_tusk_necklace", "hunters_bow"]) {
  const count = NAMED_ITEM_TEMPLATES.filter((item) => item.id === namedId).length;
  assert.equal(count, 1, `${namedId} must be a unique named item definition`);
}

const hunterNamedRewards = [
  ["help_hunter_kill_boars", QUEST_DEFS.help_hunter_kill_boars.rewards, "hunters_wolf_cape"],
  ["help_hunter_find_bow", QUEST_DEFS.help_hunter_find_bow.rewards, "hunters_boar_tusk_necklace"],
  ["help_hunter_find_flower", flowerQuest.steps[2].rewards, "hunters_bow"],
];
for (const [questId, rewards, namedId] of hunterNamedRewards) {
  assert.deepEqual(rewards.namedItems, [{ namedId }], `${questId} must use its exact named-item definition id`);
}

function rewardEngine() {
  return {
    player: { level: 20, x: 0, y: 0, xp: 0, gold: 0, stats: { goldEarned: 0 }, inventory: [] },
    cityStats: {},
    addInventoryItem(item) { this.player.inventory.push(item); return true; },
    addFloater() {},
    recordRunItem() {},
    recordRunXp() {},
    recordRunGold() {},
  };
}

for (const [questId, rewards, namedId] of hunterNamedRewards) {
  const engine = rewardEngine();
  const summary = questsMethods.grantQuestRewards.call(engine, { rewards: { namedItems: rewards.namedItems } });
  assert.equal(summary.items.length, 1, `${questId} must grant its named item`);
  const granted = engine.player.inventory[0];
  assert.equal(granted.namedId, namedId, `${questId} must add ${namedId} to inventory`);
  // Inventory is the source for both published snapshots and the persisted player.inventory payload.
  assert.equal(SAVE_PERSIST_CONFIG.player.inventory, true, `${questId} named item inventory must be persisted`);
}

// A second click after a successful turn-in must not re-grant the boar quest cape.
const boarInstance = makeQuestInstance(QUEST_DEFS.help_hunter_kill_boars, "hunter");
const boarEngine = {
  ...rewardEngine(),
  questState: { active: [boarInstance], completed: [], cityFade: [] },
  worldState: { flags: {}, counters: {}, values: {} },
  refreshQuestStepProgress() {},
  questRewardsCanFit() { return true; },
  grantQuestRewards: questsMethods.grantQuestRewards,
  consumeQuestItems() {},
  applyQuestStepEffects() {},
  cleanupObsoleteCompletedQuestItems() {},
  levelUpIfNeeded() {},
  addToast() {},
  publishSnapshot() {},
  saveProgress() {},
};
boarEngine.player.inventory.push(makeQuestItem("hunter_boar_tusk", boarInstance.id));
boarEngine.player.inventory[0].count = 9;
const originalWarn = console.warn;
console.warn = () => {};
let firstCompletion;
let secondCompletion;
try {
  firstCompletion = questsMethods.completeQuest.call(boarEngine, boarInstance.id, "hunter");
  secondCompletion = questsMethods.completeQuest.call(boarEngine, boarInstance.id, "hunter");
} finally {
  console.warn = originalWarn;
}
assert.equal(firstCompletion.ok, true);
assert.equal(secondCompletion, false, "a completed Hunter quest cannot be completed twice");
assert.equal(boarEngine.player.inventory.filter((item) => item.namedId === "hunters_wolf_cape").length, 1);
assert.equal(QUEST_ITEM_DEFS.quest_hunters_bow.iconUrl, NAMED_ITEM_TEMPLATES.find((item) => item.id === "hunters_bow").iconUrl);

const flowerAction = ACTION_CONFIG.collect_hunters_love_flower;
assert.equal(flowerAction.requires.questStepActive.questId, "help_hunter_find_flower");
assert.equal(flowerAction.requires.questStepActive.stepId, "find_sacred_flower");
assert.equal(flowerAction.removeTarget, true);

const regions = createVillageOutskirtsMapRegions((definition) => definition)["village-outskirts"];
const oldShrine = regions.find((region) => region.id === "old-shrine");
const flowerSpawn = oldShrine.prefabRules.pool.find((entry) => entry.id === "hunter_sacred_flower_site");
assert(flowerSpawn?.required, "the sacred flower spawn must be required to avoid a softlock");
assert.equal(flowerSpawn.max, 1);
assert.equal(flowerSpawn.questStepActive.stepId, "find_sacred_flower");
const flowerPrefab = MAP_PREFABS.hunter_sacred_flower_site;
assert.equal(flowerPrefab.foliage.length, 1);
assert.equal(flowerPrefab.foliage[0].actionId, "collect_hunters_love_flower");
assert.equal(flowerPrefab.foliage[0].rows, 1);
assert.equal(flowerPrefab.foliage[0].cols, 1);

for (const item of [
  ...Object.values(QUEST_ITEM_DEFS).filter((entry) => entry.iconUrl?.includes("hunter") || entry.iconUrl?.includes("wolf") || entry.iconUrl?.includes("boar") || entry.iconUrl?.includes("loveflower")),
  ...NAMED_ITEM_TEMPLATES.filter((entry) => entry.id.startsWith("hunters_")),
]) {
  const relative = item.iconUrl.replace(/^\/assets\/generated\//, "");
  await access(fileURLToPath(new URL(`../public/assets/generated/${relative}`, import.meta.url)));
}

console.log("[test-hunter-questline] OK");
