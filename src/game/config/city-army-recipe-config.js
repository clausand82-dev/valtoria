export const CITY_ARMY_TRAINING_RECIPES = [
  {
    id: "train_sword_soldier",
    addonId: "melee_training",
    unitId: "sword_soldier",
    count: 1,
    cost: { iron_bar: 1, coal: 1, junk: 2, food: 1, gold_bar: 1 },
  },
  {
    id: "train_spear_soldier",
    addonId: "melee_training",
    unitId: "spear_soldier",
    count: 1,
    cost: { iron_bar: 1, crystal: 1, junk: 1, wood_plank: 1, food: 1, gold_bar: 1 },
  },
  {
    id: "train_archer_soldier",
    addonId: "ranged_training",
    unitId: "archer_soldier",
    count: 1,
    cost: { wood_plank: 2, hide: 1, junk: 2, food: 1, gold_bar: 1 },
  },
  {
    id: "train_crossbow_soldier",
    addonId: "ranged_training",
    unitId: "crossbow_soldier",
    count: 1,
    cost: { iron_bar: 1, hide: 1, junk: 3, wood_plank: 1, food: 1, gold_bar: 1 },
  },
];

export function armyTrainingRecipesForAddon(addonId) {
  return CITY_ARMY_TRAINING_RECIPES.filter((recipe) => recipe.addonId === addonId);
}
