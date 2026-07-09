// Quest definitions are split by source. Keep objects in the existing quest shape.
export const INN_QUESTS = {

mage_sunforged: {
    id: "mage_sunforged",
    source: "inn",
    kind: "rumor",
    category: "rumor",
    title: "Sunforged Sword",
    demands: { completedQuests: ["check_inn_infestation"] },
    repeatable: false,
    regionIds: ["city"],
    npcIds: ["mage"],
    spawnChance: 0.06,
    type: "collect_quest_item",
    // Require a weapon with the name prefix "Sunforged" (any rarity)
    target: { items: [ { namePrefix: "Sunforged", baseName: "Sword", count: 1 } ] },
    story: "Darium needs a Sunforged Sword for a ritual. Find a sword with the right name and bring it to him.",
    acceptText: "Find a Sunforged Sword and bring it to me.",
    turnInText: "This will help the ritual. Thank you.",
    rewards: { xp: 420, gold: 140, resources: [{ resource: "blue_gemstone", count: 1 }], lydra: 5, factionRep: { village_outskirt: 2 } },

  i18n: { da: { title: "Sunforged Sword", story: "Darium har brug for et Sunforged Sword til et ritual. Find et svard med det rigtige navn og bring det til ham.", acceptText: "Find et Sunforged Sword og tag det til mig.", turnInText: "Dette vil hjælpe ritualet. Tak." } },
},
sam_tylion_lion_gold_idols: {
    id: "sam_tylion_lion_gold_idols",
    source: "inn",
    kind: "rumor",
    category: "mystery",
    title: "Sam Tylion's Lost Idols",
    demands: { completedQuests: ["check_inn_infestation"] },
    repeatable: false,
        npcIds: ["soldier"],
    regionIds: ["city"],
    type: "collect_quest_item",
    target: { questItemId: "lion_gold_idol", count: 24, source: "monster", dropChance: 0.007 },
    story: "The note describes Sam Tylion's missing chest of rare lion gold idols. Creatures scattered them across the regions, and Himus can return them to the family.",
    acceptText: "Find all 24 lion gold idols scattered by creatures and deliver them to Himus in the city.",
    turnInText: "All 24 are here. Sam owes you more than thanks, and I will return them safely to him.",
    rewards: { xp: 900, gold: 240, lydra: 5, factionRep: { village_outskirt: 5 } },

  i18n: { da: { title: "Sam Tylions forsvundne idols", story: "Noten beskriver Sam Tylions forsvundne kasse med sjældne lion gold idols. Væsner har spredt dem over alle regioner, og Himus kan hjælpe med at sende dem tilbage til familien.", acceptText: "Find alle 24 lion gold idols, som væsnerne har spredt, og aflever dem til Himus i byen.", turnInText: "Det er alle 24. Sam skylder dig mere end en tak, og jeg skal nok få dem sikkert tilbage til ham." } },
},
};
