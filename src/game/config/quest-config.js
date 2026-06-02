import { QUEST_NPCS } from "./npc-config.js";

export { QUEST_NPCS };

export const QUEST_ITEM_DEFS = {
  note: {
    name: "Forseglet note",
    iconUrl: "/assets/generated/item/item_quest_document.png",
    placeholderColor: "#d7cfac",
  },
  ring: {
    name: "Signetring",
    iconUrl: "/assets/generated/item/item_quest_silverring.png",
    placeholderColor: "#d8bb63",
  },
  unsigned_document: {
    name: "Ikke underskrevet dokument",
    iconUrl: "/assets/generated/item/item_quest_letter.png",
    placeholderColor: "#d5d1bd",
  },
  signed_document: {
    name: "Underskrevet dokument",
    iconUrl: "/assets/generated/item/item_quest_letter.png",
    placeholderColor: "#e3d4aa",
  },
  lost_mug: {
    name: "Forsvundet krus",
    iconUrl: "/assets/generated/item/item_quest_mug.png",
    placeholderColor: "#c4d9e0",
  },
  lost_beer: {
    name: "Forsvundet øl",
    iconUrl: "/assets/generated/item/item_quest_barrel.png",
    placeholderColor: "#f2c94c",
  }, 
  lost_anvil: {
    name: "Forsvunden anvil",
    iconUrl: "/assets/generated/item/item_quest_blacksmithanvil.png",
    placeholderColor: "#d0a05c",
  },
  lost_hammer: {
    name: "Forsvunden hammer",
    iconUrl: "/assets/generated/item/item_quest_blacksmithhammer.png",
    placeholderColor: "#8f93a1",
  },
  noble_watch: {
    name: "Turanios' forsvundne ur",
    iconUrl: "/assets/generated/item/item_quest_noblewatch.png",
    placeholderColor: "#d7bd67",
  },
  tornvalhed_rudder: {
    name: "Ror til Tornvalhed",
    iconUrl: "/assets/generated/item/item_quest_rudder.png",
    placeholderColor: "#b88454",
  },
  tornvalhed_sail: {
    name: "Sejl til Tornvalhed",
    iconUrl: "/assets/generated/item/item_quest_sail.png",
    placeholderColor: "#f3f4aa",
  },
  king_crown: {
    name: "Kongekrone",
    iconUrl: "/assets/generated/item/item_quest_kingscrone.png",
    placeholderColor: "#e6d8b0",
  },
  king_scepter: {
    name: "Kongescepter",
    iconUrl: "/assets/generated/item/item_quest_kingsscepter.png",
    placeholderColor: "#d6b7ff",
  },
  king_orb: {
    name: "Konge Orb",
    iconUrl: "/assets/generated/item/item_quest_kingsorb.png",
    placeholderColor: "#cfe6ff",
  },
  lion_gold_idol: {
    name: "Lion Gold Idol",
    iconUrl: "/assets/generated/item/item_goldidol.png",
    placeholderColor: "#d7bd67",
  },
};

/*
QUEST_DEFS guide:

Quest ids:
- Use a stable id key and matching id value. Prefer English kebab-case for new story gates, for example "sail-to-tornvalhed".
- Non-repeatable quests are saved as completed by quest id, so changing an id resets that quest's completion state.

Top-level quest fields:
- id: Stable quest id.
- title: Display title.
- titleTemplate: Repeatable/template title. Used by "vengeance"; supports placeholders like {monster}.
- repeatable: false means the quest can only be completed once. true means it can appear again.
- source: Optional. "npc" (default) means NPCs can offer it. "readable" means a readable item starts it.
- npcIds: Legacy NPC field. Backward-compatible fallback where the same NPC ids are both start and turn-in NPCs.
- startNpcIds / giverNpcIds: Optional array of QUEST_NPCS ids that can offer/start the quest.
- turnInNpcIds / completeNpcIds: Optional array of QUEST_NPCS ids that can receive/complete the quest.
- regionIds: Optional array of tags for where a quest can be offered.
  - "city" only: quest can only be offered in city.
  - "city" + region ids: quest can be offered in city and in the listed wilderness regions.
  - region ids without "city": quest can only be offered in those wilderness regions.
  - Omit to default to "city".
- spawnChance: For repeatable city quests, chance that the quest appears in town. For wilderness quests, chance when rolling a wilderness quest. 1 means guaranteed if valid.
- type: Supported values are "collect_quest_item", "kill_monsters", "clear_map", "action_targets", and "talk_to_npc".
- demands: Optional gate requirements before quest can be offered.
  Supported fields:
  - level: Minimum player level.
  - completedQuests or requiresQuests: Array of quest ids that must already be completed.
  - items: Array of required inventory checks. Supported filters include count, resourceId/resource, potionType,
    readableId, questItemId, uniqueId, namedId, mode, rarity, baseName, name, slot.
  All listed demand checks must be satisfied.
- story: Text shown in the quest dialog before completion.
- storyTemplate: Template version used by repeatable quests such as "vengeance"; supports {npcName} and {monster}.
- acceptText: Text shown when accepting the quest.
- acceptTextTemplate: Template version; supports placeholders such as {count} and {monster}.
- turnInText: Text shown when the quest is ready to hand in.
- turnInTextTemplate: Template version for repeatable quests.

NPC behavior:
- A quest with regionIds appears according to the city/wilderness rules above.
- If a valid region-limited quest has spawnChance: 1, it bypasses the global wilderness NPC spawn chance.
- An NPC can have multiple active quests at the same time.

Target shapes for collect_quest_item:
- target.questItemId: Legacy single quest item requirement.
  Example: { questItemId: "lost_anvil", count: 1, source: "monster", dropChance: 0.11 }
- target.questItems: Multiple quest item requirements in one quest.
  Example:
  questItems: [
    { questItemId: "tornvalhed_rudder", count: 1, source: "monster", dropChance: 0.08, dropRegionIds: ["fishermans-fall"] },
    { questItemId: "tornvalhed_sail", count: 2, source: "monster", dropChance: 0.14, dropRegionIds: ["fishermans-fall"] },
  ]
- target.resources: Resource requirements consumed on turn-in.
  Example: [{ resource: "wood_plank", count: 25 }, { resource: "fruit", count: 10 }]
- target.items: Specific equipment/item requirements consumed on turn-in.
  Supported filters: templateId, namePrefix, baseName, rarity, count.
  Example: [{ namePrefix: "Sunforged", baseName: "Sword", count: 1 }]

Quest item drop fields:
- questItemId: Key from QUEST_ITEM_DEFS.
- count: Number required.
- source: Drop source category, not monster type.
  Supported values:
  - "monster": Any normal or elite monster can drop it.
  - "elite": Only elite monsters can drop it.
  - "giver" / "start": The quest item is given immediately when the quest is accepted.
- dropChance: Chance per eligible monster kill.
- dropRegionIds or regionIds: Optional array of region ids where the item can drop. Omit for global quest-item drops.
- monsterTypes: Optional array of monster type names allowed to drop this quest item.

Kill objectives inside collect quests:
- target.killObjectives: Optional array of kill requirements that are checked together with item/resource requirements.
  Supported fields per objective:
  - id or key: Stable progress key.
  - label: Optional display label.
  - count: Required kills.
  - monsterTypes / monsterType / monster / monsters: Monster filters.
  - regionIds: Optional region filter.
  - eliteOnly: true means only elite kills count.

Target shape for kill_monsters:
- target.countMin / target.countMax: Random kill count range.
- target.monster: "random" lets the engine pick from current region mobs.
- target.allowElite: true means elite variants count too.

Target shape for talk_to_npc:
- target.targetNpcId or target.targetNpcIds: NPC id(s) that complete the objective when spoken to.
- target.text: Optional objective text shown in quest UI.

Rewards:
- rewards.xp: Flat XP.
- rewards.gold: Flat gold.
- rewards.lydra / rewards.netdra: Adds raw world energy points on quest turn-in.
  Example: rewards: { xp: 100, gold: 25, lydra: 3, netdra: 0.5 }
- rewards.resources: Resource rewards, for example [{ resource: "red_gemstone", count: 1 }].
- rewards.randomItem: Gives a random equipment item. Current support uses { minRarity: "upgraded" } as a hint.
- rewards.namedItems: Gives named equipment rewards, for example [{ namedId: "devils_judge" }].
- rewards.xpPerKill / rewards.goldPerKill: Used by kill quests to scale reward from target.count.

World energy conditions:
- requires / blockedBy can use worldBalanceLydra and worldBalanceNetdra as percentage checks.
- demands can also use shorthand condition fields directly alongside old demand fields.
  Example: demands: { completedQuests: ["clear_the_inn"], worldBalanceLydra: 30 }
- worldBalanceLydra: 30 means at least 30% Ly'dra'thot.
- worldBalanceNetdra: { min: 10, max: 20 } means 10-20% Net'dra'thot.
- Use lydra/netdra for raw reward points. Use worldBalanceLydra/worldBalanceNetdra only for percentage requirements.

Important behavior:
- collect_quest_item requirements are consumed when the quest is handed in.
- Quest items are inventory items with mode "quest" and only count for the quest instance that spawned them.
- Resource requirements use RESOURCE_DEFS ids.
- Item requirements match normal equipment/items in inventory and are removed on turn-in.
- Completed non-repeatable quest ids can be used by map unlocks in map-region-config.js.
*/
import { NPC_QUESTS } from "./quest-npc-config.js";
import { TOWN_HALL_QUESTS } from "./quest-townhall-config.js";
import { INN_QUESTS } from "./quest-inn-config.js";

export const QUEST_DEFS = {
  ...NPC_QUESTS,
  ...TOWN_HALL_QUESTS,
  ...INN_QUESTS,
};

export const QUEST_GLOBAL_RULES = {
  hideAllUntilCompleted: "mayor_intro_to_valtoria",
  exceptions: ["mayor_intro_to_valtoria"],
};

export const QUEST_BOARD_CONFIG = {
  townHall: {
    id: "townHall",
    source: "townHall",
    title: "Town Hall Board",
    subtitle: "Official requests",
    emptyText: "Ingen byopgaver er tilgaengelige lige nu.",
    minAvailable: 3,
    maxAvailable: 5,
  },
  inn: {
    id: "inn",
    source: "inn",
    title: "Kroens rygter",
    subtitle: "Rygter og sladder",
    emptyText: "Ingen rygter er klar til dig lige nu.",
    minAvailable: 2,
    maxAvailable: 4,
  },
};

export const QUEST_CONFIG = {
  boards: QUEST_BOARD_CONFIG,
  globalRules: QUEST_GLOBAL_RULES,
  wildernessNpcSpawnChance: 0.42,
  questItemIconPlaceholder: "/assets/generated/item/item_lost_anvil.png",
};
