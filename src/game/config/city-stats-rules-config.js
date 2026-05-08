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
    population: 50,
    housing: 50,
    provision: 50,
    water: 50,
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
