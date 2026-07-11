// Global allow-only drop restrictions.
// If an id/key appears here, it may ONLY drop in the listed areaMapIds or regionIds.
// If an id/key is NOT listed here, normal drop rules apply.
// Allow-only has FIRST priority — it overrides antiDrops.
//
// Supported keys per entry (match any):
//   resources:   [ "resource_id", ... ]
//   uniques:     [ "unique_id", ... ]
//   named:       [ "named_id", ... ]
//   questItems:  [ "quest_item_id", ... ]
//   potions:     [ "health" | "mana", ... ]      (potionType)
//   items:       [ "baseName" | "slot" | "mode" | "name", ... ]
//   rarities:    [ "poor" | "normal" | "upgraded" | "rare" | "epic" | "legendary", ... ]
//   categories:  [ "weapon" | "armor" | "health" | "mana" | ..., ... ]  (loot roll categories)
//
// Scopes (at least one required):
//   areaMapIds:  [ "nethrendor", "elvindale", ... ]  — all sub-regions of that area map
//   regionIds:   [ "shadow-thicket", "hunters-hut", ... ]  — specific region only
//
// Example:
// {
//   resources: ["spider_venom"],
//   areaMapIds: ["village-outskirts"],
//   regionIds: ["shadow-thicket"],
// },
export const RESTRICTED_DROPS = [
  {
    named: ["nethrendor_soldier_sword", "nethrendor_soldier_bow"],
    areaMapIds: ["nethrendor"],
  },
];

// Chance (0–1) of a unique item dropping per source type. - MÅSKE LAGECY FROM BEFORE LOOT TABLES SYSTEM
export const UNIQUE_DROP_CHANCES = {
  monster: 0.0015,
  chest: 0.08,
};
