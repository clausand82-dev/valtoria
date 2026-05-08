import { QUEST_NPCS } from "./npc-config.js";

export { QUEST_NPCS };

export const QUEST_ITEM_DEFS = {
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
- npcIds: Array of QUEST_NPCS ids that can offer this quest.
- regionIds: Optional array of tags for where a quest can be offered.
  - "city" only: quest can only be offered in city.
  - "city" + region ids: quest can be offered in city and in the listed wilderness regions.
  - region ids without "city": quest can only be offered in those wilderness regions.
  - Omit for no region restriction in wilderness.
- spawnChance: Chance for this quest to be selected when rolling a wilderness quest. 1 means guaranteed if it is valid.
- type: Supported values are "collect_quest_item" and "kill_monsters".
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
  Specific monster-type restrictions such as only "Wolf" or only "Skeleton" are not implemented yet.
- dropChance: Chance per eligible monster kill.
- dropRegionIds: Optional array of region ids where the item can drop. Omit for global quest-item drops.

Target shape for kill_monsters:
- target.countMin / target.countMax: Random kill count range.
- target.monster: "random" lets the engine pick from current region mobs.
- target.allowElite: true means elite variants count too.

Rewards:
- rewards.xp: Flat XP.
- rewards.gold: Flat gold.
- rewards.resources: Resource rewards, for example [{ resource: "red_gemstone", count: 1 }].
- rewards.randomItem: Gives a random equipment item. Current support uses { minRarity: "upgraded" } as a hint.
- rewards.xpPerKill / rewards.goldPerKill: Used by kill quests to scale reward from target.count.

Important behavior:
- collect_quest_item requirements are consumed when the quest is handed in.
- Quest items are inventory items with mode "quest" and only count for the quest instance that spawned them.
- Resource requirements use RESOURCE_DEFS ids.
- Item requirements match normal equipment/items in inventory and are removed on turn-in.
- Completed non-repeatable quest ids can be used by map unlocks in map-region-config.js.
*/
export const QUEST_DEFS = {
  clear_the_inn: {
    id: "clear_the_inn",
    title: "Edderkopper i Kroen",
    repeatable: false,
    npcIds: ["innkeeper"],
    regionIds: ["city"],
    spawnChance: 1,
    type: "clear_map",
    target: {
      regionId: "inn-of-the-good-oak",
      monsters: ["Spider", "MiniSpider", "MediumSpider", "LargeSpider"],
    },
    story: "Oliver tørrer af bordet og sukker tungt. 'Kroen er fuld af edderkopper – i kælderen, bag skabene, i loftet. Gæsterne tør ikke sove, og jeg kan ikke drive forretning sådan her. Ryd dem ud, alle sammen.'",
    acceptText: "Dræb alle edderkopper i kroen og kom tilbage, når det er gjort.",
    turnInText: "Endelig. Jeg har allerede sat øllet frem. Tak, eventyrer.",
    rewards: { xp: 320, gold: 150, resources: [{ resource: "green_gemstone", count: 1 }] },
  },
    kill_mother_spider: {
    id: "kill_mother_spider",
    title: "Edderkopper i Kroen",
    repeatable: false,
    npcIds: ["innkeeper"],
    regionIds: ["city"],
    demands: { completedQuests: ["clear_the_inn"] },
    spawnChance: 1,
    type: "clear_map",
    target: {
      regionId: "inn-of-the-good-oak",
      monsters: ["MotherSpider"],
    },
    story: "Der er en stor grim djævel af en edderkop nede i kælderen. Dræb den. Den er der ikke altid, så måske du skal besøge kælderen flere gange.",
    acceptText: "Dræb Moder edderkoppen i kælderen og kom tilbage, når det er gjort.",
    turnInText: "Endelig. Nu tør jeg bruge min kælder igen. Tak, eventyrer.",
    rewards: { xp: 320, gold: 150, resources: [{ resource: "green_gemstone", count: 1 }] },
  },
    find_my_mug: {
    id: "find_my_mug",
    title: "Find Mit Krus",
    repeatable: false,
    npcIds: ["innkeeper"],
    regionIds: ["city"],
    spawnChance: 1,
    type: "collect_quest_item",
    target: { questItemId: "lost_mug", count: 1, source: "monster", dropChance: 0.11, dropRegionIds: ["inn-of-the-good-oak"]  },
    story: "Jeg mangler mit ynglingskrus - når du nu er i i kælderen, så find lige mit krus for mig også",
    acceptText: "Find mit krus i kælderen og kom tilbage, når det er gjort.",
    turnInText: "Tusind tusind tak, det er mit yndlingskrus. Jeg har allerede sat øllet frem. Tak, eventyrer.",
    rewards: { xp: 500},
  },
  find_the_beer: {
    id: "find_the_beer",
    title: "Find Øllet",
    repeatable: false,
    npcIds: ["innkeeper"],
    regionIds: ["city"],
    demands: { completedQuests: ["clear_the_inn"] },
    spawnChance: 1,
    type: "collect_quest_item",
    target: { questItemId: "lost_beer", count: 5, source: "monster", dropChance: 0.11, dropRegionIds: ["inn-of-the-good-oak"] },
    story: "Jeg mangler mit øl til gæsterne - de fordømte edderkopper har nok gemt det et sted i kælderen. Hvis du er dernede, så find det for mig.",
    acceptText: "Find mit øl i kælderen og kom tilbage, når det er gjort.",
    turnInText: "Tak, eventyrer. Så er der øl til alle!",
    rewards: { xp: 500},
  },

  lost_anvil: {
    id: "lost_anvil",
    title: "Den forsvundne anvil",
    repeatable: false,
    npcIds: ["blacksmith"],
    regionIds: ["city"],
    demands: { completedQuests: ["find_the_beer"] },
    spawnChance: 1,
    type: "collect_quest_item",
    target: { questItemId: "lost_anvil", count: 1, source: "monster", dropChance: 0.11, dropRegionIds: ["barn"] },
    story: "Traver havde gemt sin gamle anvil i et rejsebur, mens han undersoegte en malmsti. Baesterne rev vognen op og sloebte metallet vaek som et blankt trofae. Find den, foer smedjen mister sit bedste arbejde.",
    acceptText: "Find min gamle anvil. Jeg kan ikke smede ordentligt uden den.",
    turnInText: "Der er ridser i kanten, men det er min. Smedjen kan arbejde igen.",
    rewards: { xp: 180, gold: 90, resources: [{ resource: "orange_gemstone", count: 1 }] },
  },
  lost_hammer: {
    id: "lost_hammer",
    title: "Den forsvundne hammer",
    repeatable: false,
    npcIds: ["blacksmith"],
    regionIds: ["city"],
    demands: { completedQuests: ["lost_anvil"] },
    spawnChance: 1,
    type: "collect_quest_item",
    target: { questItemId: "lost_hammer", count: 1, source: "monster", dropChance: 0.1, dropRegionIds: ["barn"] },
    story: "Traver mistede sin runemarkerede hammer, da en flok monstre overfaldt hans forsyningskurv. Hammeren kan stadig kalde varme frem i metallet, og den maa ikke ende hos de forkerte.",
    acceptText: "Min hammer er borte. Finder du den, betaler jeg dig med mere end tak.",
    turnInText: "Haandtaget kender stadig min haand. Godt arbejde.",
    rewards: { xp: 190, gold: 95, resources: [{ resource: "purple_gemstone", count: 1 }] },
  },
  vengeance: {
    id: "vengeance",
    titleTemplate: "Haevn over {monster}",
    repeatable: true,
    npcIds: Object.keys(QUEST_NPCS),
    spawnChance: 0.56,
    type: "kill_monsters",
    target: { countMin: 5, countMax: 20, monster: "random", allowElite: true },
    storyTemplate: "{npcName} har mistet folk, varer eller ro til {monster}. Ryd flokken ud, saa byen kan traekke vejret igen.",
    acceptTextTemplate: "Faeld {count} {monster}. Elite taeller med, hvis du finder dem.",
    turnInTextTemplate: "De vil huske, at nogen slog igen.",
    rewards: { xpPerKill: 22, goldPerKill: 9, randomItem: { minRarity: "upgraded" } },
  },
  lost_watch: {
    id: "lost_watch",
    title: "Det forsvundne ur",
    repeatable: false,
    npcIds: ["noble"],
    spawnChance: 0.18,
    regionIds: ["city"],
    demands: { completedQuests: ["lost_hammer"] },
    type: "collect_quest_item",
    target: { questItemId: "noble_watch", count: 1, source: "elite", dropChance: 0.28 },
    story: "Turanios' familieur blev taget under en kaotisk flugt gennem oede stier. Uret er ikke bare guld; det indeholder navne paa slaegten, og elitebaesterne samler paa den slags skinnende trofaeer.",
    acceptText: "Mit ur er uvurderligt. Find det i oedemarken, og jeg betaler i erfaring, ikke smaamoenter.",
    turnInText: "Min slaegts tikken er vendt tilbage. Det skal huskes.",
    rewards: { xp: 520, gold: 0, resources: [] },
  },
  mage_sunforged: {
    id: "mage_sunforged",
    title: "Sunforged Sword",
    repeatable: false,
    regionIds: ["city"],
    npcIds: ["mage"],
    spawnChance: 0.06,
    type: "collect_quest_item",
    // Require a weapon with the name prefix "Sunforged" (any rarity)
    target: { items: [ { namePrefix: "Sunforged", baseName: "Sword", count: 1 } ] },
    story: "Darium har brug for et Sunforged Sword til et ritual. Find et svard med det rigtige navn og bring det til ham.",
    acceptText: "Find et Sunforged Sword og tag det til mig.",
    turnInText: "Dette vil hjælpe ritualet. Tak.",
    rewards: { xp: 420, gold: 140, resources: [{ resource: "blue_gemstone", count: 1 }] },
  },
  mage_papers: {
    id: "mage_papers",
    title: "Collect Arcane Pages",
    repeatable: true,
    npcIds: ["mage"],
    spawnChance: 0.28,
    type: "collect_quest_item",
    target: { resources: [ { resource: "paper", count: 12 } ] },
    story: "Darium mangler opslagsvaerkenes sider for at fuldende sine noter. Han sender dig ud for at samle nogle stykker papir.",
    acceptText: "Bring mig 12 stykker papir til mine noter.",
    turnInText: "Mine noter er fuldendt takket vaere dig.",
    rewards: { xp: 90, gold: 45, resources: [{ resource: "yellow_gemstone", count: 1 }] },
  },
  farmer_supply: {
    id: "farmer_supply",
    title: "Feed the Farm",
    repeatable: true,
    npcIds: ["farmer"],
    spawnChance: 0.32,
    type: "collect_quest_item",
    target: { resources: [ { resource: "meat", count: 100 }, { resource: "fruit", count: 50 } ] },
    story: "Willis har brug for forraad til sine dyr. Han beder dig hente kød og frugt til at klare vinteren.",
    acceptText: "Saml 100 kød og 50 frugt til farmen.",
    turnInText: "Tak! Dyrene vil klare sig en maengde bedre nu.",
    rewards: { xp: 240, gold: 210, resources: [] },
  },
  wiseman_scrolls: {
    id: "wiseman_scrolls",
    title: "Ancient Scrolls",
    repeatable: true,
    npcIds: ["wiseman"],
    spawnChance: 0.24,
    type: "collect_quest_item",
    target: { resources: [ { resource: "scroll", count: 10 } ] },
    story: "Vitlias soeger gamle skrifter. Find 10 scrolls og bring dem til biblioteket.",
    acceptText: "Find 10 scrolls til mit bibliotek.",
    turnInText: "Disse vil give indsigt til mine studier. Godt fundet.",
    rewards: { xp: 330, gold: 80, resources: [{ resource: "red_gemstone", count: 1 }] },
  },

  sail_to_tornvalhed: {
    id: "sail_to_tornvalhed",
    title: "Sail to Tornvalhed",
    repeatable: false,
    npcIds: ["captain"],
    regionIds: ["to-the-drowned-city"],
    spawnChance: 1,
    type: "collect_quest_item",
    target: {
      questItems: [
        { questItemId: "tornvalhed_rudder", count: 1, source: "monster", dropChance: 0.02, dropRegionIds: ["fishermans-fall"] },
        { questItemId: "tornvalhed_sail", count: 2, source: "monster", dropChance: 0.2, dropRegionIds: ["fishermans-fall"] },
      ],
      resources: [
        { resource: "wood_plank", count: 25 },
        { resource: "fruit", count: 10 },
      ],
    },
    story: "Kaptajn Varlo kan faa dig over vandet til Tornvalhed, men skibet mangler et ror, sejl, planker og proviant. Han har set brugbare vragrester ved Fisherman's Fall.",
    acceptText: "Bring mig 1 ror, 2 sejl, 25 traeplanker og 10 fruit. Saa kan vi sejle mod Tornvalhed.",
    turnInText: "Det holder. Tornvalhed er ikke laengere uden for raekkevidde.",
    rewards: { xp: 450, gold: 120, resources: [] },
  },
};

export const QUEST_CONFIG = {
  wildernessNpcSpawnChance: 0.42,
  questItemIconPlaceholder: "/assets/generated/item/item_lost_anvil.png",
};
