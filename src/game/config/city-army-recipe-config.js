export const CITY_ARMY_TRAINING_RECIPES = [
  {
    id: "train_peasant",
    addonId: "melee_training",
    unitId: "peasant",
    count: 1,
    cost: { junk: 1, gold: 25, weaponPoints: 1, armorPoints: 1 },
  },
  {
    id: "train_sword_soldier",
    addonId: "melee_training",
    unitId: "sword_soldier",
    count: 1,
    cost: { iron_piece: 1, coal: 1, junk: 2, meat: 1, gold: 100 },
  },
  {
    id: "train_spear_soldier",
    addonId: "melee_training",
    unitId: "spear_soldier",
    count: 1,
    cost: { iron_piece: 1, crystal_piece: 1, junk: 1, wood_piece: 1, meat: 1, gold: 100 },
  },
  {
    id: "train_archer_soldier",
    addonId: "ranged_training",
    unitId: "archer_soldier",
    count: 1,
    cost: { wood_piece: 2, hide: 1, junk: 2, fruit: 1, gold: 100 },
  },
  {
    id: "train_crossbow_soldier",
    addonId: "ranged_training",
    unitId: "crossbow_soldier",
    count: 1,
    cost: { iron_piece: 1, hide: 1, junk: 3, wood_piece: 1, fruit: 1, gold: 100 },
  },
    {
    id: "train_james_gray",
    addonId: "melee_training",
    unitId: "james_gray",
    count: 10,
    cost: { gold: 1 },
  },
];

export function armyTrainingRecipesForAddon(addonId) {
  return CITY_ARMY_TRAINING_RECIPES.filter((recipe) => recipe.addonId === addonId);
}
