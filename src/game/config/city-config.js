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
    detail: "Provision is below population. Food resource drops are reduced by 50%.",
    solution: "Increase provision or reduce population pressure.",
    conditions: { statBelowPopulation: "provision" },
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
    detail: "Water is below population. Potion drops stop until water recovers.",
    solution: "Increase water production before returning to the wilds.",
    conditions: { statBelowPopulation: "water" },
    modifiers: {
      potionDropMultiplier: 0,
    },
  },
  disease_outbreak: {
    id: "disease_outbreak",
    label: "Disease outbreak",
    iconUrl: "/assets/generated/icon/buff_disease_outbreak.png",
    detail: "Health is too low. Hero max HP is reduced by 25%.",
    solution: "Raise city health above the disease threshold.",
    conditions: { statBelow: { health: CITY_EVENT_RULES.diseaseOutbreakHealthThreshold } },
    modifiers: {
      heroMaxHpMultiplier: 0.75,
    },
  },
  uprising_poorness: {
    id: "uprising_poorness",
    label: "Uprising risk",
    iconUrl: "/assets/generated/icon/buff_uprising_poorness.png",
    detail: "Wealth is low compared to population. Gold drops are reduced by 50%.",
    solution: "Increase wealth relative to population.",
    conditions: { statPopulationRatioBelow: { stat: "wealth", threshold: CITY_EVENT_RULES.uprisingWealthRatioThreshold } },
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
    detail: "Safety is low. City mob spawn chance is increased by 10%.",
    solution: "Raise safety or clear city mobs.",
    conditions: { statBelow: { safety: CITY_EVENT_RULES.lawlessnessSafetyThreshold } },
    modifiers: {
      cityMobSpawnChanceMultiplier: 1.1,
    },
  },
  supply_crisis: {
    id: "supply_crisis",
    label: "Supply crisis",
    iconUrl: "/assets/generated/icon/buff_supply_crisis.png",
    detail: "Supply is low. Repair and crafting costs are increased.",
    solution: "Increase supply through city buildings, addons, or regions.",
    conditions: { statBelow: { supply: CITY_EVENT_RULES.supplyCrisisSupplyThreshold } },
    modifiers: {
      repairCostMultiplier: 1.25,
      craftingCostMultiplier: 1.25,
    },
  },
  trade_collapse: {
    id: "trade_collapse",
    label: "Trade collapse",
    iconUrl: "/assets/generated/icon/buff_trade_collapse.png",
    detail: "Trade is low. Merchant stock and prices are worse.",
    solution: "Increase trade before shopping.",
    conditions: { statBelow: { trade: CITY_EVENT_RULES.tradeCollapseTradeThreshold } },
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
    detail: "Faith is low. Health potions restore 50% less health.",
    solution: "Increase faith. Mana potions are not affected.",
    conditions: { statBelow: { faith: CITY_EVENT_RULES.faithCrisisFaithThreshold } },
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
    positive: true,
    conditions: { statsAtLeast: { wealth: CITY_EVENT_RULES.prosperityWealthThreshold, trade: CITY_EVENT_RULES.prosperityTradeThreshold } },
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
  { id: "population", label: "POPULATION" },
  { id: "housing", label: "HOUSING" },
  { id: "provision", label: "PROVISION" },
  { id: "water", label: "WATER" },
  { id: "supply", label: "SUPPLY" },
  { id: "wealth", label: "WEALTH" },
  { id: "trade", label: "TRADE" },
  { id: "safety", label: "SAFETY", max: 100 },
  { id: "health", label: "HEALTH", max: 100 },
  { id: "defense", classId: "defence", label: "DEFENSE" },
  { id: "popularity", label: "POPULARITY", max: 100 },
  { id: "knowledge", label: "KNOWLEDGE" },
  { id: "culture", label: "CULTURE" },
  { id: "faith", label: "FAITH" },
  { id: "maintenance", label: "MAINTENANCE", max: 100 },
];

export const CITY_CITIZEN_CONDITION_DEFS = [
  { id: "homeless_people", label: "Homeless" },
  { id: "hungry_people", label: "Hungry" },
  { id: "thirsty_people", label: "Thirsty" },
  { id: "sick_people", label: "Sick" },
  { id: "angry_people", label: "Angry" },
];

export const CITY_STAT_ICON_URLS = {
  city_defence: "/assets/generated/icon/icon_citydefence.png",
  defense: "/assets/generated/icon/icon_citydefence.png",
  population: "/assets/generated/icon/icon_population.png",
  housing: "/assets/generated/icon/icon_housing.png",
  provision: "/assets/generated/icon/icon_provision.png",
  water: "/assets/generated/icon/icon_water.png",
  supply: "/assets/generated/icon/icon_provision.png",
  wealth: CITY_MONEY_ICON_URL,
  trade: CITY_MONEY_ICON_URL,
  safety: "/assets/generated/icon/icon_citydefence.png",
  army: "/assets/generated/icon/icon_army.png",
  happiness: "/assets/generated/icon/icon_happiness.png",
  health: "/assets/generated/icon/icon_health.png",
  citizens_health: "/assets/generated/icon/icon_health.png",
  knowledge: "/assets/generated/item/item_book_lore.png",
  culture: "/assets/generated/icon/icon_popularity.png",
  faith: "/assets/generated/house/house_sanctury.png",
  maintenance: "/assets/generated/item/item_tools_repairkit.png",
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
  provision: ["If provision is below population, famine becomes active and health is reduced by 15."],
  water: ["If water is below population, water shortage becomes active and health is reduced by 15."],
  supply: ["General supply can be improved by regions, buildings, and addons."],
  wealth: ["If wealth/population is below 0.5, uprising risk becomes active."],
  trade: ["Trade can feed later wealth and supply logic."],
  safety: ["Base safety is 10 and can be raised by city sources up to 100.", "Each city mob level currently present reduces safety by 2 points.", "Low safety raises fire risk and can trigger lawlessness."],
  health: ["Health is a 0-100 public-health score.", "If health is below 50, disease outbreak becomes active."],
  defense: ["Uses the old army unit power as defense.", "If knowledge is at least population, defense gains +5%."],
  knowledge: ["If knowledge is at least population, defense gains +5%."],
  culture: ["If culture is at least population, popularity gains +10%."],
  faith: ["If faith is at least population, non-unique drop rate bonus is exposed as 5%."],
  maintenance: ["Average durability percent of unlocked city areas and built buildings."],
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
