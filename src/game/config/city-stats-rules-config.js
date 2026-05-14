// City stat rules.
//
// Primary city stat ids supported by statEffects/statRequirements:
// city_defence, population, housing, provision, water, army, happiness, citizens_health.
//
// Backwards-compatible aliases accepted by the stat system:
// defence -> city_defence
// cityDefence -> city_defence
// citizensHealth -> citizens_health
// food -> provision
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
// Derived citizen condition stats:
// hungry_people = max(0, population - provision)
// homeless_people = max(0, population - housing)
// thirsty_people = max(0, population - water)
// camp_population = max(hungry_people, homeless_people, thirsty_people)
// sick_people / angry_people are weighted pressure values from unmet needs.
// happiness is reduced from base/effects by configured weighted pressure versus population.
export const CITY_STATS_RULES = {
  baseStats: {
    city_defence: 50,
    population: 150,
    housing: 1500,
    provision: 1500,
    water: 5000,
    army: 0,
    happiness: 50,
    citizens_health: 50,
  },
  displayMax: {
    city_defence: 500,
    population: 500,
    housing: 500,
    provision: 500,
    water: 500,
    army: 500,
    happiness: 100,
    citizens_health: 100,
    hungry_people: 500,
    homeless_people: 500,
    thirsty_people: 500,
    sick_people: 500,
    angry_people: 500,
  },
  mapLiberation: {
    defaultPopulationGain: 10,
    repeatRunPct: 0.02,
  },
  farmProvisionRecipes: [
    { resourceId: "meat", cost: 10, provision: 1, label: "Meat" },
    { resourceId: "fruit", cost: 20, provision: 1, label: "Fruit" },
  ],
  // Farm conversion rule used for making food barrels from raw food resources.
  farmFoodBarrelRecipe: {
    // Resource id created by the conversion action.
    outputResourceId: "food",
    // How many output resources are created per conversion.
    outputCount: 1,
    // Allowed input resources the player can spend for this conversion.
    inputOptions: [
      { resourceId: "meat", label: "Meat" },
      { resourceId: "fruit", label: "Fruit" },
      { resourceId: "wheat", label: "Wheat" },
    ],
    // Base input cost before popularity discount is applied.
    baseCost: 10,
    // Lowest possible input cost after all discounts.
    minCost: 10,
    // Popularity value where discounting starts.
    popularityStart: 50,
    // Popularity points required per discount step.
    popularityStep: 10,
    // Input cost reduced for each discount step.
    discountPerStep: 5,
  },
  pressureWeights: {
    sick_people: {
      homeless_people: 3,
      hungry_people: 1,
      thirsty_people: 5,
    },
    angry_people: {
      hungry_people: 3,
      thirsty_people: 1,
      homeless_people: 6,
    },
    happiness: {
      hungry_people: 3,
      homeless_people: 1,
      thirsty_people: 4,
    },
  },
};
