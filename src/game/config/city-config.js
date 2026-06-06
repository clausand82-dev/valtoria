const CITY_MONEY_ICON_URL = "/assets/generated/item/item_gold.png";

export const CITY_EVENT_RULES = {
  famineUnavailablePopulationPct: 25,
  waterShortageUnavailablePopulationPct: 45,
  diseaseOutbreakHealthThreshold: 50,
  uprisingWealthRatioThreshold: 0.5,
  fireRiskWaterShortageBonus: 25,
  fireRiskActiveThreshold: 75,
};

export const CITY_EVENT_DEFS = {
  famine: {
    id: "famine",
    label: "Famine",
    detail: "Provision is below population. Recruitment capacity and later food drops are affected.",
    futureEffect: "hero_food_drops_half",
  },
  water_shortage: {
    id: "water_shortage",
    label: "Water shortage",
    detail: "Water is below population. Recruitment capacity and later potion drops are affected.",
    futureEffect: "no_health_or_mana_potion_drops",
  },
  disease_outbreak: {
    id: "disease_outbreak",
    label: "Disease outbreak",
    detail: "Health is below 50%. Later hero max HP effects can use this.",
    futureEffect: "hero_max_hp_minus_25_pct",
  },
  uprising_poorness: {
    id: "uprising_poorness",
    label: "Uprising risk",
    detail: "Wealth is low compared to population. Later gold drops can be affected.",
    futureEffect: "hero_gold_drops_half",
  },
  fire: {
    id: "fire",
    label: "Fire risk",
    detail: "Low safety, especially with water shortage, raises fire risk.",
  },
};

export const CITY_EVENT_IDS = Object.keys(CITY_EVENT_DEFS);

export const CITY_STAT_ALIASES = {
  defence: "defense",
  cityDefence: "defense",
  city_defence: "defense",
  citizensHealth: "health",
  citizens_health: "health",
  food: "provision",
  army: "defense",
  happiness: "popularity",
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
  safety: ["Starts at 100. Each city mob level currently present reduces safety by 2 points.", "Low safety raises fire risk."],
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