// City stat rules.
//
// Primary city stat ids supported by statEffects/statRequirements:
// population, housing, provision, water, supply, wealth, trade, safety, health,
// defense, popularity, knowledge, culture, faith, maintenance.
//
// Backwards-compatible aliases accepted by the stat system:
// city_defence/defence/cityDefence/army -> defense
// citizensHealth/citizens_health -> health
// food -> provision
// happiness -> popularity
//
// Formula:
// final primary stat =
//   baseStats[id]
//   + permanent bonuses stored in city progress
//   + unlocked area statEffects
//   + reached area level statEffects
//   + owned building statEffects
//   + reached building level statEffects
//   + bought addon statEffects
//
// statRequirements use the same ids and mean:
// current calculated city stat must be at least the configured value.
// Example: statRequirements: { population: 100, water: 50 }
//
export const CITY_STATS_RULES = {
  baseStats: {
    population: 10,
    housing: 10,
    provision: 10,
    water: 10,
    supply: 10,
    wealth: 10,
    trade: 10,
    safety: 10,
    health: 10,
    defense: 10,
    popularity: 10,
    knowledge: 10,
    culture: 10,
    faith: 10,
    maintenance: 100,
  },
  displayMax: {
    population: 500,
    housing: 500,
    provision: 500,
    water: 500,
    supply: 500,
    wealth: 500,
    trade: 500,
    safety: 500,
    health: 500,
    defense: 500,
    popularity: 100,
    knowledge: 500,
    culture: 500,
    faith: 500,
    maintenance: 100,
  },
  balance: {
    needsPerPopulation: {
      housing: 1,
      provision: 1,
      water: 1,
      health: 1,
      safety: 1,
      defense: 0.8,
      supply: 0.6,
      wealth: 0.5,
      trade: 0.5,
      faith: 0.25,
      culture: 0.25,
      knowledge: 0.25,
    },
    flatNeeds: {
      popularity: 50,
      maintenance: 75,
    },
    thresholds: {
      good: 1,
      strained: 0.75,
      critical: 0.5,
      collapse: 0.25,
    },
    statusLabels: {
      good: "Good",
      strained: "Strained",
      critical: "Critical",
      collapse: "Collapse risk",
    },
    actionHints: {
      housing: "Build or upgrade housing capacity.",
      provision: "Improve farms, food stores, or food donations.",
      water: "Improve wells and water sources.",
      health: "Improve health, water, provision, or emergency recovery.",
      safety: "Raise safety, clear city mobs, or strengthen defenses.",
      defense: "Train army units, build walls, towers, or barracks.",
      supply: "Improve supply buildings, regions, or policies.",
      wealth: "Improve trade, market output, or treasury support.",
      trade: "Improve market, roads, and trade-focused regions.",
      faith: "Support the sanctuary and faith sources.",
      culture: "Invest in culture and civic buildings.",
      knowledge: "Invest in research, library, and knowledge sources.",
      popularity: "Raise public support through quests, inn, sanctuary, or relief.",
      maintenance: "Repair city areas and buildings.",
    },
    i18n: { da: {
      statusLabels: { good: "God", strained: "Presset", critical: "Kritisk", collapse: "Risiko for kollaps" },
      actionHints: {
        housing: "Byg eller opgradér boligkapacitet.", provision: "Forbedr farms, food storage eller food-donationer.",
        water: "Forbedr brønde og vandkilder.", health: "Forbedr health, water, provision eller akut recovery.",
        safety: "Forøg safety, fjern city mobs eller styrk forsvaret.", defense: "Træn hærenheder eller byg mure, tårne og barracks.",
        supply: "Forbedr supply-bygninger, regioner eller policies.", wealth: "Forbedr trade, markedets output eller støtte til statskassen.",
        trade: "Forbedr marked, veje og trade-fokuserede regioner.", faith: "Støt Sanctuary og faith-kilder.",
        culture: "Investér i culture og bybygninger.", knowledge: "Investér i forskning, Library og knowledge-kilder.",
        popularity: "Forøg offentlig støtte gennem quests, Inn, Sanctuary eller nødhjælp.", maintenance: "Reparér byområder og bygninger.",
      },
    } },
  },
  farmProvisionRecipes: [
    { resourceId: "meat", cost: 10, provision: 1, label: "Meat", i18n: { da: { label: "Kød" } } },
    { resourceId: "fruit", cost: 20, provision: 1, label: "Fruit", i18n: { da: { label: "Frugt" } } },
  ],
  sanctuaryDonationTrades: [
    { id: "gold_bar_wealth", resourceId: "gold_bar", cost: 1, label: "Fund the Treasury", i18n: { da: { label: "Finansiér statskassen" } }, effects: { wealth: 5 } },
    { id: "gold_bar_trade", resourceId: "gold_bar", cost: 1, label: "Sponsor Trade", i18n: { da: { label: "Støt handel" } }, effects: { trade: 2 } },
    { id: "gold_bar_popularity", resourceId: "gold_bar", cost: 1, label: "Public Offering", i18n: { da: { label: "Offentlig ofring" } }, effects: { popularity: 5 } },
    { id: "food_provision", resourceId: "food", cost: 1, label: "Feed the Needy", i18n: { da: { label: "Bespis de trængende" } }, effects: { provision: 10 } },
    { id: "food_trade", resourceId: "food", cost: 1, label: "Support Markets", i18n: { da: { label: "Støt markederne" } }, effects: { trade: 5 } },
    { id: "food_popularity", resourceId: "food", cost: 1, label: "Festival Meals", i18n: { da: { label: "Festmåltider" } }, effects: { popularity: 5 } },
    { id: "small_mana_potion_faith", itemType: "potion", potionId: "small_mana", cost: 25, label: "Bless the Wards", i18n: { da: { label: "Velsign skjoldene" } }, effects: { faith: 1 } },
    { id: "medium_mana_potion_faith", itemType: "potion", potionId: "medium_mana", cost: 15, label: "Bless the Wards", i18n: { da: { label: "Velsign skjoldene" } }, effects: { faith: 1, culture: 1 } },
    { id: "big_mana_potion_faith", itemType: "potion", potionId: "big_mana", cost: 5, label: "Bless the Wards", i18n: { da: { label: "Velsign skjoldene" } }, effects: { faith: 2, culture: 1 } },
    { id: "small_health_potion_relief", itemType: "potion", potionId: "small_health", cost: 25, label: "Public Relief", i18n: { da: { label: "Offentlig nødhjælp" } }, effects: { popularity: 1 } },
    { id: "medium_health_potion_relief", itemType: "potion", potionId: "medium_health", cost: 15, label: "Public Relief", i18n: { da: { label: "Offentlig nødhjælp" } }, effects: { popularity: 1, faith: 1 } },
    { id: "big_health_potion_relief", itemType: "potion", potionId: "big_health", cost: 5, label: "Public Relief", i18n: { da: { label: "Offentlig nødhjælp" } }, effects: { popularity: 2, faith: 1 } },
  ],
  farmAleRecipe: {
    outputResourceId: "ale",
    outputCount: 1,
    inputs: { wheat: 15, wood_plank: 1 },
    statCosts: { water: 2 },
  },
  innAleTrades: [
    { id: "sell_ale", resourceId: "ale", cost: 1, label: "Serve Ale", i18n: { da: { label: "Servér ale" } }, effects: { popularity: 5, water: 1 } },
  ],
  // Farm conversion rule used for making food barrels from raw food resources.
  farmFoodBarrelRecipe: {
    // Resource id created by the conversion action.
    outputResourceId: "food",
    // How many output resources are created per conversion.
    outputCount: 1,
    // Allowed input resources the player can spend for this conversion.
    inputOptions: [
      { resourceId: "meat", label: "Meat", i18n: { da: { label: "Kød" } } },
      { resourceId: "fruit", label: "Fruit", i18n: { da: { label: "Frugt" } } },
      { resourceId: "wheat", label: "Wheat", i18n: { da: { label: "Hvede" } } },
      { resourceId: "fruit_orange", label: "Orange", i18n: { da: { label: "Appelsin" } }, baseCost: 10, minCost: 5 },
      { resourceId: "fruit_banana", label: "Banana", i18n: { da: { label: "Banan" } }, baseCost: 10, minCost: 5 },
    ],
    // Default base input cost before popularity discount is applied. Can be overridden per input option.
    baseCost: 50,
    // Default lowest possible input cost after all discounts. Can be overridden per input option.
    minCost: 25,
    // Popularity value where discounting starts.
    popularityStart: 50,
    // Popularity points required per discount step.
    popularityStep: 10,
    // Input cost reduced for each discount step.
    discountPerStep: 5,
  },
};

export function calculateCityStatNeeds(cityStats = {}) {
  const balance = CITY_STATS_RULES.balance ?? {};
  const population = Math.max(0, Math.floor(Number(cityStats.population) || 0));
  const needs = {};
  for (const [statId, perPopulation] of Object.entries(balance.needsPerPopulation ?? {})) {
    needs[statId] = Math.max(1, Math.ceil(population * (Number(perPopulation) || 0)));
  }
  for (const [statId, amount] of Object.entries(balance.flatNeeds ?? {})) {
    needs[statId] = Math.max(1, Math.ceil(Number(amount) || 0));
  }
  return needs;
}

export function cityStatRatio(cityStats = {}, statId, needs = calculateCityStatNeeds(cityStats)) {
  const need = Math.max(1, Math.floor(Number(needs?.[statId]) || 0));
  if (!need) return null;
  const value = Math.max(0, Math.floor(Number(cityStats?.[statId]) || 0));
  return value / need;
}

export function calculateCityStatRatios(cityStats = {}, needs = calculateCityStatNeeds(cityStats)) {
  return Object.fromEntries(Object.keys(needs).map((statId) => [statId, cityStatRatio(cityStats, statId, needs)]));
}

export function cityStatStatusForRatio(ratio) {
  const thresholds = CITY_STATS_RULES.balance?.thresholds ?? {};
  const value = Number(ratio);
  if (!Number.isFinite(value)) return null;
  if (value >= (Number(thresholds.good) || 1)) return "good";
  if (value >= (Number(thresholds.strained) || 0.75)) return "strained";
  if (value >= (Number(thresholds.critical) || 0.5)) return "critical";
  return "collapse";
}

export function calculateCityStatStatuses(ratios = {}) {
  return Object.fromEntries(Object.entries(ratios).map(([statId, ratio]) => [statId, cityStatStatusForRatio(ratio)]));
}

export function debugCityStatBalanceScenarios(baseStats = CITY_STATS_RULES.baseStats, populations = [10, 50, 100, 200, 500, 1000]) {
  const rows = populations.map((population) => {
    const stats = { ...(baseStats ?? {}), population };
    const needs = calculateCityStatNeeds(stats);
    const ratios = calculateCityStatRatios(stats, needs);
    const statuses = calculateCityStatStatuses(ratios);
    return {
      population,
      needs,
      ratios: Object.fromEntries(Object.entries(ratios).map(([statId, ratio]) => [statId, Number(ratio.toFixed(2))])),
      statuses,
    };
  });
  if (typeof console !== "undefined" && typeof console.table === "function") {
    console.table(rows.map((row) => ({
      population: row.population,
      housingNeed: row.needs.housing,
      provisionNeed: row.needs.provision,
      waterNeed: row.needs.water,
      healthNeed: row.needs.health,
      safetyNeed: row.needs.safety,
      defenseNeed: row.needs.defense,
      housing: row.statuses.housing,
      provision: row.statuses.provision,
      water: row.statuses.water,
      health: row.statuses.health,
      safety: row.statuses.safety,
      defense: row.statuses.defense,
    })));
  }
  return rows;
}
