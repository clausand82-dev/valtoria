const CITY_MONEY_ICON_URL = "/assets/generated/item/item_gold.png";

export const CITY_EVENT_RULES = {
  famineUnavailablePopulationPct: 25,
  waterShortageUnavailablePopulationPct: 45,
  diseaseOutbreakHealthThreshold: 50,
  uprisingWealthRatioThreshold: 0.5,
  lawlessnessSafetyThreshold: 35,
  supplyCrisisSupplyThreshold: 35,
  tradeCollapseTradeThreshold: 35,
  faithCrisisFaithThreshold: 35,
  prosperityWealthThreshold: 100,
  prosperityTradeThreshold: 100,
  fireRiskWaterShortageBonus: 25,
  fireRiskActiveThreshold: 75,
};

// CITY_EVENT_DEFS reference
//
// Supported condition keys:
// - statBelowPopulation: "provision"
//   Active when cityStats[stat] is lower than cityStats.population.
// - statBelow: { safety: 35, health: 50 }
//   Active when all listed city stats are below their threshold.
// - statsAtLeast: { wealth: 100, trade: 100 }
//   Active when all listed city stats are at least their threshold.
// - statPopulationRatioBelow: { stat: "wealth", threshold: 0.5 }
//   Active when cityStats[stat] / max(1, population) is below threshold.
// - statRatioBelow: { health: 0.75 }
//   Active when cityStats[stat] / configured cityStatNeeds[stat] is below threshold.
// - fireRiskAtLeast: 75
//   Active when computed fire risk is at least this value.
//
// Supported modifier keys currently hooked into gameplay:
// - resourceDropMultiplierById: { meat: 0.5, wheat: 0.5 }
// - goldDropMultiplier
// - potionDropMultiplier
// - heroMaxHpMultiplier
// - cityMobSpawnChanceMultiplier
// - cityDurabilityDegradeChanceMultiplier
// - cityDurabilityDamageMultiplier
// - repairCostMultiplier
// - craftingCostMultiplier
//   Config-ready. Resource crafting has a TODO hook because current recipes use fixed inputs.
// - merchantBuyPriceMultiplier
// - merchantSellPriceMultiplier
// - merchantStockMultiplier
// - healthPotionHealMultiplier
// - questGoldRewardMultiplier
//
// Event fields used by UI:
// - id, label, iconUrl, detail, solution, positive, conditions, modifiers
//
export const CITY_EVENT_DEFS = {
  famine: {
    id: "famine",
    label: "Famine",
    iconUrl: "/assets/generated/icon/buff_famine.png",
    detail: "Provision capacity is too low for the population. Food resource drops are reduced by 50%.",
    solution: "Increase provision or reduce population pressure.",
    i18n: { da: { label: "Hungersnød", detail: "Provision-kapaciteten er for lav til befolkningen. Drops af food-ressourcer reduceres med 50%", solution: "Forøg provision eller reducer presset fra befolkningen." } },
    conditions: { statRatioBelow: { provision: 1 } },
    modifiers: {
      resourceDropMultiplierById: {
        meat: 0.5,
        fruit: 0.5,
        wheat: 0.5,
        food: 0.5,
        fruit_orange: 0.5,
        fruit_banana: 0.5,
      },
    },
  },
  water_shortage: {
    id: "water_shortage",
    label: "Water shortage",
    iconUrl: "/assets/generated/icon/buff_water_shortage.png",
    detail: "Water capacity is too low for the population. Potion drops stop until water recovers.",
    solution: "Increase water production before returning to the wilds.",
    i18n: { da: { label: "Vandmangel", detail: "Vandkapaciteten er for lav til befolkningen. Potion drops stopper, indtil vandforsyningen er genoprettet.", solution: "Forøg vandproduktionen, før du vender tilbage til wilderness." } },
    conditions: { statRatioBelow: { water: 1 } },
    modifiers: {
      potionDropMultiplier: 0,
    },
  },
  disease_outbreak: {
    id: "disease_outbreak",
    label: "Disease outbreak",
    iconUrl: "/assets/generated/icon/buff_disease_outbreak.png",
    detail: "Health capacity is strained. Hero max HP is reduced by 25%.",
    solution: "Raise health capacity relative to population.",
    i18n: { da: { label: "Sygdomsudbrud", detail: "Health-kapaciteten er presset. Heltens maksimale HP reduceres med 25%.", solution: "Forøg health-kapaciteten i forhold til befolkningen." } },
    conditions: { statRatioBelow: { health: 0.75 } },
    modifiers: {
      heroMaxHpMultiplier: 0.75,
    },
  },
  uprising_poorness: {
    id: "uprising_poorness",
    label: "Uprising risk",
    iconUrl: "/assets/generated/icon/buff_uprising_poorness.png",
    detail: "Wealth is low compared to the city's needs. Gold drops are reduced by 50%.",
    solution: "Increase wealth or reduce population pressure.",
    i18n: { da: { label: "Risiko for oprør", detail: "Wealth er lav i forhold til byens behov. Gold drops reduceres med 50%.", solution: "Forøg wealth eller reducer presset fra befolkningen." } },
    conditions: { statRatioBelow: { wealth: 0.75 } },
    modifiers: {
      goldDropMultiplier: 0.5,
    },
  },
  fire: {
    id: "fire",
    label: "Fire risk",
    iconUrl: "/assets/generated/icon/buff_fire.png",
    detail: "Low safety, especially with water shortage, accelerates city durability damage.",
    solution: "Raise safety and solve water shortage.",
    i18n: { da: { label: "Brandfare", detail: "Lav safety, især under vandmangel, øger durability-skader i byen.", solution: "Forøg safety og løs vandmanglen." } },
    conditions: { fireRiskAtLeast: CITY_EVENT_RULES.fireRiskActiveThreshold },
    modifiers: {
      cityDurabilityDegradeChanceMultiplier: 2,
      cityDurabilityDamageMultiplier: 1.5,
    },
  },
  lawlessness: {
    id: "lawlessness",
    label: "Lawlessness",
    iconUrl: "/assets/generated/icon/buff_lawlessness.png",
    detail: "Safety capacity is strained. City mob spawn chance is increased by 25%.",
    solution: "Raise safety or clear city mobs.",
    i18n: { da: { label: "Lovløshed", detail: "Safety-kapaciteten er presset. Chancen for city mob-spawns øges med 25%.", solution: "Forøg safety eller fjern city mobs." } },
    conditions: { statRatioBelow: { safety: 0.75 } },
    modifiers: {
      cityMobSpawnChanceMultiplier: 1.25,
    },
  },
  supply_crisis: {
    id: "supply_crisis",
    label: "Supply crisis",
    iconUrl: "/assets/generated/icon/buff_supply_crisis.png",
    detail: "Supply capacity is strained. Repair and crafting costs are increased.",
    solution: "Increase supply through city buildings, addons, or regions.",
    i18n: { da: { label: "Forsyningskrise", detail: "Supply-kapaciteten er presset. Repair- og crafting-priser stiger.", solution: "Forøg supply gennem bygninger, addons eller regioner." } },
    conditions: { statRatioBelow: { supply: 0.75 } },
    modifiers: {
      repairCostMultiplier: 1.25,
      craftingCostMultiplier: 1.25,
    },
  },
  trade_collapse: {
    id: "trade_collapse",
    label: "Trade collapse",
    iconUrl: "/assets/generated/icon/buff_trade_collapse.png",
    detail: "Trade capacity is strained. Merchant stock and prices are worse.",
    solution: "Increase trade before shopping.",
    i18n: { da: { label: "Handelskollaps", detail: "Trade-kapaciteten er presset. Merchant-udvalg og priser bliver dårligere.", solution: "Forøg trade, før du handler." } },
    conditions: { statRatioBelow: { trade: 0.75 } },
    modifiers: {
      merchantBuyPriceMultiplier: 1.25,
      merchantSellPriceMultiplier: 0.75,
      merchantStockMultiplier: 0.75,
    },
  },
  faith_crisis: {
    id: "faith_crisis",
    label: "Faith crisis",
    iconUrl: "/assets/generated/icon/buff_faith_crisis.png",
    detail: "Faith support is strained. Health potions restore 50% less health.",
    solution: "Increase faith. Mana potions are not affected.",
    i18n: { da: { label: "Troskrise", detail: "Faith er presset. Health potions helbreder 50% mindre.", solution: "Forøg faith. Mana potions påvirkes ikke." } },
    conditions: { statRatioBelow: { faith: 0.75 } },
    modifiers: {
      healthPotionHealMultiplier: 0.5,
    },
  },
  prosperity: {
    id: "prosperity",
    label: "Prosperity",
    iconUrl: "/assets/generated/icon/buff_prosperity.png",
    detail: "Wealth and trade are high. Merchant prices and quest gold rewards improve.",
    solution: "Keep wealth and trade high to preserve this bonus.",
    i18n: { da: { label: "Velstand", detail: "Wealth og trade er høj. Merchant-priser og gold-belønninger fra quests forbedres.", solution: "Hold wealth og trade høj for at bevare bonussen." } },
    positive: true,
    conditions: { statRatioAtLeast: { wealth: 1.5, trade: 1.5 } },
    modifiers: {
      merchantBuyPriceMultiplier: 0.9,
      merchantSellPriceMultiplier: 1.1,
      questGoldRewardMultiplier: 1.1,
    },
  },
};

export const CITY_EVENT_IDS = Object.keys(CITY_EVENT_DEFS);

export const CITY_STATUS_EFFECT_ICON_URLS = {
  potion_orange_regen_health_mana: "/assets/generated/icon/buff_potion_orange_regen_health_mana.png",
  potion_speedbuf: "/assets/generated/item/item_potion_mediumrefill.png",
};

// Durability consequence fields:
// - buildingEfficiencyMultiplier/addonEfficiencyMultiplier scale city stat output.
// - blacksmithRepairCostMultiplier scales Blacksmith item repair gold/junk costs.
// - blacksmithMetalBarInputCostBonus adds extra ore/pieces to metal bar smelting recipes.
// - blacksmithGoldBarCostMultiplier scales the gold price for minting gold bars.
// - blacksmithForgeJunkYieldMultiplier scales junk returned by the Forge Addon.
// - failureChance is reserved for building action failure checks.
// - disabled removes building/addon city stat output.
export const CITY_DURABILITY_CONSEQUENCE_RULES = [
  {
    belowPct: 50,
    buildingEfficiencyMultiplier: 0.75,
    addonEfficiencyMultiplier: 0.75,
    blacksmithRepairCostMultiplier: 1.25,
    blacksmithMetalBarInputCostBonus: 1,
    blacksmithGoldBarCostMultiplier: 1.25,
    blacksmithForgeJunkYieldMultiplier: 0.75,
  },
  {
    belowPct: 25,
    buildingEfficiencyMultiplier: 0.5,
    addonEfficiencyMultiplier: 0.5,
    blacksmithRepairCostMultiplier: 1.5,
    blacksmithMetalBarInputCostBonus: 2,
    blacksmithGoldBarCostMultiplier: 1.5,
    blacksmithForgeJunkYieldMultiplier: 0.5,
    failureChance: 0.15,
  },
  {
    belowPct: 1,
    disabled: true,
  },
];

export const CITY_STAT_ALIASES = {
  defence: "defense",
  cityDefence: "defense",
  city_defence: "defense",
  citizensHealth: "health",
  citizens_health: "health",
  food: "provision",
  army: "defense",
  happiness: "popularity",
  goldFindBonusPct: "gold_find_bonus_pct",
  gold_find_bonus_pct: "gold_find_bonus_pct",
};

export const CITY_STAT_DEFS = [
  { id: "population", label: "POPULATION", /*i18n: { da: { label: "BEFOLKNING" } } */ },
  { id: "housing", label: "HOUSING", /*i18n: { da: { label: "BOLIGER" } } */ },
  { id: "provision", label: "PROVISION", /*i18n: { da: { label: "PROVISION" } } */ },
  { id: "water", label: "WATER", /*i18n: { da: { label: "VAND" } } */ },
  { id: "supply", label: "SUPPLY", /*i18n: { da: { label: "FORSYNING" } } */ },
  { id: "wealth", label: "WEALTH", /*i18n: { da: { label: "VELSTAND" } } */ },
  { id: "trade", label: "TRADE", /*i18n: { da: { label: "HANDEL" } } */ },
  { id: "safety", label: "SAFETY", max: 100, /*i18n: { da: { label: "SIKKERHED" } } */ },
  { id: "health", label: "HEALTH", max: 100, /*i18n: { da: { label: "SUNDHED" } } */ },
  { id: "defense", classId: "defence", label: "DEFENSE", /*i18n: { da: { label: "FORSVAR" } } */ },
  { id: "popularity", label: "POPULARITY", max: 100, /*i18n: { da: { label: "POPULARITET" } } */ },
  { id: "knowledge", label: "KNOWLEDGE", /*i18n: { da: { label: "VIDEN" } } */ },
  { id: "culture", label: "CULTURE", /*i18n: { da: { label: "KULTUR" } } */ },
  { id: "faith", label: "FAITH", /*i18n: { da: { label: "TRO" } } */ },
  { id: "maintenance", label: "MAINTENANCE", max: 100, /*i18n: { da: { label: "VEDLIGEHOLDELSE" } } */ },
];

export const CITY_CITIZEN_CONDITION_DEFS = [
  { id: "homeless_people", label: "Homeless", i18n: { da: { label: "Hjemløse" } } },
  { id: "hungry_people", label: "Hungry", i18n: { da: { label: "Sultne" } } },
  { id: "thirsty_people", label: "Thirsty", i18n: { da: { label: "Tørstige" } } },
  { id: "sick_people", label: "Sick", i18n: { da: { label: "Syge" } } },
  { id: "angry_people", label: "Angry", i18n: { da: { label: "Vrede" } } },
];

export const CITY_STAT_ICON_URLS = {
  city_defence: "/assets/generated/icon/icon_citydefence.png",
  defense: "/assets/generated/icon/icon_citydefence.png",
  population: "/assets/generated/icon/icon_population.png",
  housing: "/assets/generated/icon/icon_housing.png",
  provision: "/assets/generated/icon/icon_provision.png",
  water: "/assets/generated/icon/icon_water.png",
  supply: "/assets/generated/icon/icon_supply.png",
  wealth: "/assets/generated/icon/icon_wealth.png",
  trade: "/assets/generated/icon/icon_trade.png",
  safety: "/assets/generated/icon/icon_army.png",
  army: "/assets/generated/icon/icon_army.png",
  happiness: "/assets/generated/icon/icon_happiness.png",
  health: "/assets/generated/icon/icon_health.png",
  citizens_health: "/assets/generated/icon/icon_health.png",
  knowledge: "/assets/generated/icon/icon_knowledge.png",
  culture: "/assets/generated/icon/icon_culture.png",
  faith: "/assets/generated/icon/icon_faith.png",
  maintenance: "/assets/generated/icon/icon_maintenance.png",
  hungry_people: "/assets/generated/icon/icon_hunger.png",
  homeless_people: "/assets/generated/icon/icon_homeless.png",
  thirsty_people: "/assets/generated/icon/icon_thirst.png",
  sick_people: "/assets/generated/icon/icon_sick.png",
  angry_people: "/assets/generated/icon/icon_angry.png",
  xp: "/assets/generated/icon/icon_xp.png",
  popularity: "/assets/generated/icon/icon_popularity.png",
  gold: CITY_MONEY_ICON_URL,
};

export const CITY_STAT_RULE_TEXT = {
  population: [
    "Controls how many citizens can be used for army recruitment.",
    "Unlocked regions can add current population through their scaled cityStats.population value.",
  ],
  housing: ["If population exceeds housing, later city events can react to overcrowding."],
  provision: ["Provision is compared against population-driven need.", "Low provision can trigger famine and reduce health capacity."],
  water: ["Water is compared against population-driven need.", "Low water can trigger water shortage and reduce health capacity."],
  supply: ["General supply can be improved by regions, buildings, and addons."],
  wealth: ["If wealth/population is below 0.5, uprising risk becomes active."],
  trade: ["Trade can feed later wealth and supply logic."],
  safety: ["Safety is capacity compared against city need.", "City mobs apply temporary config-driven penalties while they remain active.", "Low safety raises fire risk and can trigger lawlessness."],
  health: ["Health is capacity compared against city need.", "Low health ratio can trigger disease outbreak."],
  defense: ["Uses the old army unit power as defense.", "If knowledge is at least population, defense gains +5%."],
  knowledge: ["If knowledge is at least population, defense gains +5%."],
  culture: ["If culture is at least population, popularity gains +10%."],
  faith: ["If faith is at least population, non-unique drop rate bonus is exposed as 5%."],
  maintenance: ["Average durability percent of unlocked city areas and built buildings."],
  i18n: { da: {
    population: ["Styrer hvor mange borgere der kan bruges til rekruttering til hæren.", "Oplåste regioner kan tilføje deres aktuelle population gennem den skalerede cityStats.population-værdi."],
    housing: ["Hvis population overstiger housing, kan senere city events reagere på overbefolkning."],
    provision: ["Provision sammenlignes med det befolkningsbaserede behov.", "Lav provision kan udløse hungersnød og reducere health-kapaciteten."],
    water: ["Water sammenlignes med det befolkningsbaserede behov.", "Lav water kan udløse vandmangel og reducere health-kapaciteten."],
    supply: ["Generel supply kan forbedres af regioner, bygninger og addons."],
    wealth: ["Hvis wealth/population er under 0,5, bliver risikoen for oprør aktiv."],
    trade: ["Trade kan bidrage til senere wealth- og supply-logik."],
    safety: ["Safety er kapacitet sammenlignet med byens behov.", "City mobs giver midlertidige config-styrede straffe, mens de er aktive.", "Lav safety øger brandfaren og kan udløse lovløshed."],
    health: ["Health er kapacitet sammenlignet med byens behov.", "En lav health-ratio kan udløse sygdomsudbrud."],
    defense: ["Bruger den tidligere army unit power som defense.", "Hvis knowledge mindst svarer til population, får defense +5%."],
    knowledge: ["Hvis knowledge mindst svarer til population, får defense +5%."],
    culture: ["Hvis culture mindst svarer til population, får popularity +10%."],
    faith: ["Hvis faith mindst svarer til population, gives en bonus på 5% til non-unique drop rate."],
    maintenance: ["Gennemsnitlig durability-procent for oplåste byområder og byggede bygninger."],
  } },
};

export function cityEventEntries(events = {}, options = {}) {
  const includeRisk = Boolean(options.includeRisk);
  return CITY_EVENT_IDS
    .filter((id) => events?.[id]?.active || (includeRisk && Number(events?.[id]?.risk) > 0))
    .map((id) => ({
      ...CITY_EVENT_DEFS[id],
      ...(events?.[id] ?? {}),
    }));
}

export function cityEventLabel(eventId) {
  return CITY_EVENT_DEFS[eventId]?.label ?? String(eventId ?? "");
}
