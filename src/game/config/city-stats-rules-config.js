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
    safety: 100,
    health: 100,
    defense: 500,
    popularity: 100,
    knowledge: 500,
    culture: 500,
    faith: 500,
    maintenance: 100,
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
};
