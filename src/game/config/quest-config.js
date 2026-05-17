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
    spawnChance: 0.40,
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
  find_annelises_redroses: {
    id: "find_annelises_redroses",
    title: "Find Annelises røde roser",
    repeatable: false,
    npcIds: ["lady"],
    regionIds: ["city"],
    demands: { completedQuests: ["lost_watch"] },
    spawnChance: 1,
    type: "collect_quest_item",
    target: { resources: [ { resource: "red_rose", count: 12 } ] },
    story: "Annelise har brug for dine tjenester. Hendes forlovede gav hende 12 røde roser, men de er forsvundet under en tur uden for byen. Kan du finde dem tilbage?",
    acceptText: "Find 12 røde roser og bring dem tilbage til Annelise.",
    turnInText: "Oh, mine roser! Tak, du har gjort mig en stor tjeneste. Tag dette som tak.",
    rewards: { xp: 520, gold: 120 },
  },

  annelise_note_for_innkeeper: {
    id: "annelise_note_for_innkeeper",
    title: "Annelises Note",
    repeatable: false,
    startNpcIds: ["lady"],
    turnInNpcIds: ["innkeeper"],
    regionIds: ["city"],
    spawnChance: 1,
    type: "collect_quest_item",
    target: {
      questItems: [
        { questItemId: "note", count: 1, source: "giver" },
      ],
    },
    story: "Annelise rækker dig en forseglet note og beder dig bringe den sikkert til kroejeren.",
    acceptText: "Tag noten til Innkeeper. Han venter pa beskeden.",
    turnInText: "Godt, noten er fremme. Jeg sender noget videre til Noble.",
    rewards: { xp: 220, gold: 40, questItems: [{ questItemId: "ring", count: 1 }] },
  },

  innkeeper_ring_for_noble: {
    id: "innkeeper_ring_for_noble",
    title: "Ring Til Noble",
    repeatable: false,
    startNpcIds: ["innkeeper"],
    turnInNpcIds: ["noble"],
    regionIds: ["city"],
    demands: { completedQuests: ["annelise_note_for_innkeeper"] },
    spawnChance: 1,
    type: "collect_quest_item",
    target: {
      questItems: [
        { questItemId: "ring", count: 1, source: "giver" },
      ],
    },
    story: "Innkeeper giver dig en signetring, som kun Noble ma modtage personligt.",
    acceptText: "Aflever ringen til Noble i byen.",
    turnInText: "Perfekt. Nu kan jeg aabne vejen til Elvbaekken.",
    rewards: { xp: 320, gold: 90 },
  },

  noble_wolf_document_hunt: {
    id: "noble_wolf_document_hunt",
    title: "Dokumentet I Elvbaekken",
    repeatable: false,
    startNpcIds: ["noble"],
    turnInNpcIds: ["noble"],
    regionIds: ["city"],
    demands: { completedQuests: ["innkeeper_ring_for_noble"] },
    spawnChance: 1,
    type: "collect_quest_item",
    target: {
      questItems: [
        {
          questItemId: "unsigned_document",
          count: 1,
          source: "monster",
          dropChance: 1,
          monsterTypes: ["WolfFenris"],
          regionIds: ["river-creek"],
        },
      ],
      killObjectives: [
        {
          id: "river_creek_wolves",
          label: "Almindelige ulve",
          count: 10,
          monsterTypes: ["Wolf", "WolfCub"],
          regionIds: ["river-creek"],
        },
        {
          id: "river_creek_wolf_boss",
          label: "Ulveboss",
          count: 1,
          monsterTypes: ["WolfFenris"],
          regionIds: ["river-creek"],
        },
      ],
    },
    story: "Noble har aabnet Elvbaekken. En ulv har slugt et vigtigt ikke-underskrevet dokument, og flokken skal samtidig holdes nede.",
    acceptText: "Hent dokumentet fra ulvebossen i Elvbaekken, og ryd ulveflokken.",
    turnInText: "Dokumentet er i sikkerhed. Jeg underskriver det nu.",
    rewards: { xp: 900, gold: 260, questItems: [{ questItemId: "signed_document", count: 1 }] },
  },

  noble_signed_document_delivery: {
    id: "noble_signed_document_delivery",
    title: "Det Underskrevne Dokument",
    repeatable: false,
    startNpcIds: ["noble"],
    turnInNpcIds: ["lady", "merchant"],
    regionIds: ["city"],
    demands: { completedQuests: ["noble_wolf_document_hunt"] },
    spawnChance: 1,
    type: "collect_quest_item",
    target: {
      questItems: [
        { questItemId: "signed_document", count: 1, source: "reward" },
      ],
    },
    story: "Noble overdrager det underskrevne dokument til dig. Bring det tilbage til Annelise eller Elis.",
    acceptText: "Rejs tilbage til Annelise eller Elis med dokumentet.",
    turnInText: "Dokumentet er modtaget. Questlinjen er fuldfoert.",
    rewards: { xp: 720, gold: 320, resources: [{ resource: "yellow_gemstone", count: 1 }] },
  },

  find_annelises_rarepinkflowers: {
    id: "find_annelises_rarepinkflowers",
    title: "Annelise: Sjældne lilla blomster",
    repeatable: false,
    npcIds: ["lady"],
    regionIds: ["city"],
    demands: { completedQuests: ["find_annelises_redroses"], level: 5 },
    spawnChance: 1,
    type: "collect_quest_item",
    target: { resources: [ { resource: "rare_pink_flower", count: 24 } ] },
    story: "Annelise har besluttet at finde noget helt særligt — 24 sjældne lilla blomster til en særlig ceremoni. Hun har allerede fået hjælp med sine røde roser. Kan du samle dem?",
    acceptText: "Jeg behøver 24 sjældne lilla blomster. Kan du hente dem?",
    turnInText: "Disse er perfekte — du har min dybeste tak. Modtag denne belønning for din indsats.",
    rewards: { xp: 1000, gold: 200 },
  },

  annelise_spider_task: {
    id: "annelise_spider_task",
    title: "Annelise: Dræb 100 edderkopper",
    repeatable: false,
    npcIds: ["lady"],
    regionIds: ["city"],
    demands: { requiresActiveQuests: ["vitlias_kings_relics"] },
    spawnChance: 1,
    type: "kill_monsters",
    target: { count: 100, monster: ["MiniSpider", "MediumSpider", "LargeSpider", "Spider"], allowElite: true },
    story: "Annelise har en frygt for edderkopper. Hun beder dig dræbe 100 edderkopper i området. Når du har gjort det, vil hun belønne dig med noget særligt.",
    acceptText: "Dræb 100 edderkopper for mig, og jeg vil overveje at give dig noget værdifuldt.",
    turnInText: "Du gjorde det... disse kryb var ikke sjove. Her er scepteret, som jeg har holdt tilbage indtil nu.",
    rewards: { xp: 800, questItems: [{ questItemId: "king_scepter", count: 1 }] },
  },

  himus_sell_king_orb: {
    id: "himus_sell_king_orb",
    title: "Himus: Byt 5 guldbarre for en orb",
    repeatable: false,
    npcIds: ["soldier"],
    regionIds: ["city"],
    demands: { requiresActiveQuests: ["vitlias_kings_relics"] },
    spawnChance: 1,
    type: "collect_quest_item",
    target: { resources: [ { resource: "gold_bar", count: 5 } ] },
    story: "Himus vil gerne se din støtte for et lille stykke magi. Giv ham 5 guldbarre, og han vil sælge dig noget sjældent.",
    acceptText: "Giv mig 5 guldbarre, så skal jeg se, hvad jeg kan gøre.",
    turnInText: "Tak. Her er orb'en som aftalt.",
    rewards: { xp: 300, questItems: [{ questItemId: "king_orb", count: 1 }] },
  },

  sam_tylion_lion_gold_idols: {
    id: "sam_tylion_lion_gold_idols",
    title: "Sam Tylions forsvundne idols",
    repeatable: false,
    source: "readable",
    npcIds: ["soldier"],
    regionIds: ["city"],
    type: "collect_quest_item",
    target: { questItemId: "lion_gold_idol", count: 24, source: "monster", dropChance: 0.007 },
    story: "Noten beskriver Sam Tylions forsvundne kasse med sjældne lion gold idols. Væsner har spredt dem over alle regioner, og Himus kan hjælpe med at sende dem tilbage til familien.",
    acceptText: "Find alle 24 lion gold idols, som væsnerne har spredt, og aflever dem til Himus i byen.",
    turnInText: "Det er alle 24. Sam skylder dig mere end en tak, og jeg skal nok få dem sikkert tilbage til ham.",
    rewards: { xp: 900, gold: 240 },
  },

  vitlias_kings_relics: {
    id: "vitlias_kings_relics",
    title: "Vitlias: Kongens relikvier",
    repeatable: false,
    npcIds: ["wiseman"],
    regionIds: ["city"],
    spawnChance: 1,
    type: "collect_quest_item",
    target: {
      questItems: [
        { questItemId: "king_crown", count: 1, source: "elite", dropChance: 0.05, dropRegionIds: ["barn"] },
        { questItemId: "king_scepter", count: 1, source: "reward" },
        { questItemId: "king_orb", count: 1, source: "reward" },
      ],
    },
    story: "Vitlias søger kongelige relikvier til sine studier. Find kronen (fra et elite-skelet i laden), scepteret (få det fra Annelise når hun går med til det), og orb'en (køb eller byt med Himus).",
    acceptText: "Find kongens tre relikvier og bring dem til mig.",
    turnInText: "Perfekt. Disse relikvier vil kaste lys over vores historie. Tak.",
    rewards: { xp: 1200, gold: 500 },
  },

  sail_to_tornvalhed: {
    id: "sail_to_tornvalhed",
    title: "Sail to Tornvalhed",
    repeatable: false,
    npcIds: ["captain"],
    regionIds: ["city"],
    demands: { level: 50 },
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
