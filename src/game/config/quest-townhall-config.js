import { QUEST_NPCS } from "./npc-config.js";

// Quest definitions are split by source. Keep objects in the existing quest shape.
export const TOWN_HALL_QUESTS = {
//#region vengeance
  vengeance: {
    id: "vengeance",
    source: "townHall",
    kind: "repeatable",
    category: "bounty",
    titleTemplate: "Vengeance upon {monster}",
    demands: { completedQuests: ["check_inn_infestation"] },
    repeatable: true,
    cooldownMapRuns: 3,
    npcIds: ["mage"],
    spawnChance: 0.40,
    type: "kill_monsters",
    target: { countMin: 5, countMax: 20, monster: "random", allowElite: true },
    storyTemplate: "{npcName} has lost people, goods, or peace to {monster}. Clear out the pack so the city can breathe again.",
    acceptTextTemplate: "Slay {count} {monster}. Elites count if you find them.",
    turnInTextTemplate: "They will remember that someone fought back.",
    rewards: { xpPerKill: 22, goldPerKill: 9, randomItem: { minRarity: "upgraded" }, factionRep: { village_outskirt: 2 } },

  i18n: { da: { titleTemplate: "Haevn over {monster}", storyTemplate: "{npcName} har mistet folk, varer eller ro til {monster}. Ryd flokken ud, saa byen kan traekke vejret igen.", acceptTextTemplate: "Faeld {count} {monster}. Elite taeller med, hvis du finder dem.", turnInTextTemplate: "De vil huske, at nogen slog igen." } },
},
//#endregion vengeance
//#region mage_papers
mage_papers: {
    id: "mage_papers",
    source: "townHall",
    kind: "repeatable",
    category: "gather",
    title: "Collect Arcane Pages",
    demands: { completedQuests: ["check_inn_infestation"] },
    repeatable: true,
    cooldownMapRuns: 4,
    npcIds: ["mage"],
    spawnChance: 0.28,
    type: "collect_quest_item",
    target: { resources: [ { resource: "paper", count: 12 } ] },
    story: "Darium needs pages from the reference works to complete his notes. He asks you to gather some paper.",
    acceptText: "Bring me 12 pieces of paper for my notes.",
    turnInText: "My notes are complete thanks to you.",
    rewards: { xp: 90, gold: 45, resources: [{ resource: "yellow_gemstone", count: 1 }], factionRep: { village_outskirt: 2 } },

  i18n: { da: { title: "Saml arkane sider", story: "Darium mangler opslagsvaerkenes sider for at fuldende sine noter. Han sender dig ud for at samle nogle stykker papir.", acceptText: "Bring mig 12 stykker papir til mine noter.", turnInText: "Mine noter er fuldendt takket vaere dig." } },
},
//#endregion mage_papers
//#region farmer_supply
farmer_supply: {
    id: "farmer_supply",
    source: "townHall",
    kind: "repeatable",
    category: "gather",
    title: "Feed the Farm",
    demands: { completedQuests: ["check_inn_infestation"] },
    repeatable: true,
    cooldownMapRuns: 5,
    npcIds: ["farmer"],
    spawnChance: 0.32,
    type: "collect_quest_item",
    target: { resources: [ { resource: "meat", count: 100 }, { resource: "fruit", count: 50 } ] },
    story: "Willis needs supplies for his animals. He asks you to gather meat and fruit for the winter.",
    acceptText: "Gather 100 meat and 50 fruit for the farm.",
    turnInText: "Thank you! The animals will fare much better now.",
    rewards: { xp: 240, gold: 210, resources: [], factionRep: { village_outskirt: 2 } },

  i18n: { da: { title: "Fodr farmen", story: "Willis har brug for forraad til sine dyr. Han beder dig hente kød og frugt til at klare vinteren.", acceptText: "Saml 100 kød og 50 frugt til farmen.", turnInText: "Tak! Dyrene vil klare sig en maengde bedre nu." } },
},
//#endregion farmer_supply
//#region wiseman_scrolls
wiseman_scrolls: {
    id: "wiseman_scrolls",
    source: "townHall",
    kind: "repeatable",
    category: "gather",
    title: "Ancient Scrolls",
    demands: { completedQuests: ["check_inn_infestation"] },
    repeatable: true,
    cooldownMapRuns: 5,
    npcIds: ["wiseman"],
    spawnChance: 0.24,
    type: "collect_quest_item",
    target: { resources: [ { resource: "scroll", count: 10 } ] },
    story: "Vitlias seeks old writings. Find 10 scrolls and bring them to the library.",
    acceptText: "Find 10 scrolls for my library.",
    turnInText: "These will aid my studies. A fine discovery.",
    rewards: { xp: 330, gold: 80, resources: [{ resource: "red_gemstone", count: 1 }], factionRep: { village_outskirt: 2 } },

  i18n: { da: { title: "Gamle skriftruller", story: "Vitlias soeger gamle skrifter. Find 10 scrolls og bring dem til biblioteket.", acceptText: "Find 10 scrolls til mit bibliotek.", turnInText: "Disse vil give indsigt til mine studier. Godt fundet." } },
},
//#endregion wiseman_scrolls
//#region himus_sell_king_orb
himus_sell_king_orb: {
    id: "himus_sell_king_orb",
    source: "townHall",
    kind: "side",
    category: "gather",
    title: "Himus: Trade 5 Gold Bars for an Orb",
    repeatable: false,
    npcIds: ["soldier"],
    regionIds: ["city"],
    demands: { requiresActiveQuests: ["vitlias_kings_relics"] },
    spawnChance: 1,
    type: "collect_quest_item",
    target: { resources: [ { resource: "gold_bar", count: 5 } ] },
    story: "Himus wants a show of support in exchange for a small piece of magic. Give him 5 gold bars, and he will sell you something rare.",
    acceptText: "Give me 5 gold bars, and I will see what I can do.",
    turnInText: "Thank you. Here is the orb, as agreed.",
    rewards: { xp: 300, questItems: [{ questItemId: "king_orb", count: 1 }], factionRep: { village_outskirt: 2 } },

  i18n: { da: { title: "Himus: Byt 5 guldbarre for en orb", story: "Himus vil gerne se din støtte for et lille stykke magi. Giv ham 5 guldbarre, og han vil sælge dig noget sjældent.", acceptText: "Giv mig 5 guldbarre, så skal jeg se, hvad jeg kan gøre.", turnInText: "Tak. Her er orb'en som aftalt." } },
},
//#endregion himus_sell_king_orb
//#region sail_to_tornvalhed
sail_to_tornvalhed: {
    id: "sail_to_tornvalhed",
    source: "townHall",
    kind: "side",
    category: "delivery",
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
    story: "Captain Varlo can take you across the water to Tornvalhed, but the ship needs a rudder, sails, planks, and provisions. He has seen useful wreckage at Fisherman's Fall.",
    acceptText: "Bring me 1 rudder, 2 sails, 25 wood planks, and 10 fruit. Then we can sail for Tornvalhed.",
    turnInText: "That will hold. Tornvalhed is no longer beyond our reach.",
    rewards: { xp: 450, gold: 120, resources: [] },

  i18n: { da: { title: "Sejl til Tornvalhed", story: "Kaptajn Varlo kan faa dig over vandet til Tornvalhed, men skibet mangler et ror, sejl, planker og proviant. Han har set brugbare vragrester ved Fisherman's Fall.", acceptText: "Bring mig 1 ror, 2 sejl, 25 traeplanker og 10 fruit. Saa kan vi sejle mod Tornvalhed.", turnInText: "Det holder. Tornvalhed er ikke laengere uden for raekkevidde." } },
},
//#endregion sail_to_tornvalhed
//#region villager_help_fix_the_house
villager_help_fix_the_house: {
    id: "villager_help_fix_the_house",
    source: "townHall",
    kind: "side",
    category: "village_help",
    title: "Patch the Cold Roof",
    repeatable: false,
    npcIds: ["lady"],
    regionIds: ["city"],
    cooldownMapRuns: 5,
    demands: {
      level: 20,
    },

    spawnChance: 1,

    type: "collect_quest_item",
    target: {
      questItemId: "villager_roof_tile",
      count: 12,
      source: "monster",
      dropChance: 0.22,
      monsterTypes: [ "Village01", "Village02", "Village03", "Village04", "Village05", "Village06", "Peasant", "Wizard", "Knight", "MountainTroll", "GiantTroll", ],
    },

    story:
      "A family in the living quarters is trying to repair their roof before winter. They need sturdy roof tiles before the cold sets in.",
    acceptText:
      "Find 12 roof tiles from humanoid enemies while this request is active.",
    turnInText:
      "These will keep the winter wind out. The family will sleep warmer because of you.",

    rewards: { xp: 1350, gold: 260, lydra: 2, factionRep: { village_outskirt: 2 }, },

    i18n: {
      da: {
        title: "Lap det kolde tag",
        story:
          "En familie i boligområdet forsøger at få repareret deres tag inden vinter. De mangler solide tagsten, før kulden sætter ind.",
        acceptText:
          "Find 12 tagsten fra humanoide fjender, mens opgaven er aktiv.",
        turnInText:
          "De her kan holde vintervinden ude. Familien kommer til at sove varmere på grund af dig.",
      },
    },
  },
  //#endregion villager_help_fix_the_house
  //#region villager_help_collect_hay
  villager_help_collect_hay: {
    id: "villager_help_collect_hay",
    source: "townHall",
    kind: "side",
    category: "village_help",
    title: "Gather the Hay",
    repeatable: false,
    npcIds: ["oneleggedman"],
    regionIds: ["city"],
    cooldownMapRuns: 5,
    demands: { completedQuests: ["the_young_boys_letter"], },

    spawnChance: 1,

    type: "collect_quest_item",
    target: {
      questItemId: "villager_haystack",
      count: 24,
      source: "object",
      sourceObjectIds: ["object_hay"],
      dropChance: 1,
      dropRegionIds: ["northern-fields"],
    },

    story:
      "An old villager from the living quarters can no longer gather hay himself. He asks for help collecting the hay from the northern fields before it is ruined.",
    acceptText:
      "Collect 24 haystacks from the northern fields.",
    turnInText:
      "Twenty-four bundles. That will help more than you know. Thank you for helping an old villager.",

    rewards: { xp: 1100, gold: 180, lydra: 2, factionRep: { village_outskirt: 2 }, },

    i18n: {
      da: {
        title: "Saml høet",
        story:
          "En ældre landsbyboer fra boligområdet kan ikke længere selv samle hø. Han beder om hjælp til at få høet samlet på nordmarken, før det bliver ødelagt.",
        acceptText:
          "Saml 24 høstakke på nordmarken.",
        turnInText:
          "Fireogtyve bundter. Det hjælper mere, end du aner. Tak fordi du hjalp en gammel landsbyboer.",
      },
    },
  },
  //#endregion villager_help_collect_hay
};
