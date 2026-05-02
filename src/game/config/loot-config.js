import { GEMSTONE_RESOURCE_IDS } from "./resource-config.js";

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

// Chance (0–1) of a unique item dropping per source type.
export const UNIQUE_DROP_CHANCES = {
  monster: 0.0015,
  chest: 0.08,
};

export const DEFAULT_LOOT_PROFILE = {
  goldChance: 0.55,
  goldMult: 1,
  weights: { health: 4, mana: 2, weapon: 8, armor: 8, none: 68 },
};

export const LOOT_PROFILES = {
  Spider: {
    goldChance: 0.42,
    goldMult: 0.75,
    weights: { health: 28, mana: 10, weapon: 2, armor: 2, none: 40 },
  },
  Skeleton: {
    goldChance: 0.65,
    goldMult: 1,
    weights: { weapon: 31, armor: 31, health: 3, mana: 3, none: 32 },
  },
  Demon: {
    goldChance: 0.72,
    goldMult: 1.15,
    weights: { health: 28, armor: 24, weapon: 4, mana: 2, none: 42 },
  },
  Ghost: {
    goldChance: 0.95,
    goldMult: 3.8,
    weights: { mana: 34, health: 2, weapon: 2, armor: 2, none: 60 },
  },
  Snake: {
    goldChance: 0.16,
    goldMult: 0.7,
    weights: { health: 4, mana: 4, weapon: 3, armor: 3, none: 86 },
  },
  Wolf: {
    goldChance: 0.22,
    goldMult: 0.7,
    weights: { health: 4, mana: 4, weapon: 4, armor: 4, none: 84 },
  },
  Scorpion: {
    goldChance: 0.7,
    goldMult: 1,
    weights: { all: 18, health: 12, mana: 12, weapon: 14, armor: 14, none: 30 },
  },
};

// Resource drops can be defined per monster type here.
// `default` applies to all mobs unless the monster sets:
// - inheritDefaultLoot: false      -> do not inherit default loot such as meat/fruit
// - inheritDefaultRareLoot: false  -> do not inherit default rareLoot such as gemstones
export const MONSTER_RESOURCE_DROPS = {
  default: {
    loot: [
      { resource: "meat", min: 1, max: 2, chance: 0.18 },
      { resource: "fruit", min: 1, max: 2, chance: 0.12 },
      { resource: "paper", min: 1, max: 2, chance: 0.12 },
      { resource: "scroll", min: 1, max: 2, chance: 0.12 },
    ],
    rareLoot: GEMSTONE_RESOURCE_IDS.map((resource) => ({
      resource,
      min: 1,
      max: 1,
      chance: 0.0025,
    })),
  },
  Demon: {
    inheritDefaultLoot: false,
    loot: [
      { resource: "coal", min: 1, max: 3, chance: 0.2 },
    ],
  },
  Ghost: {
    inheritDefaultLoot: false,
    loot: [
      { resource: "crystal_piece", min: 1, max: 2, chance: 0.16 },
    ],
  },
};
