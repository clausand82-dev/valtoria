// Loot table reference:
// - chance rolls an entry directly; weight participates in one weighted roll per table.
// - type "gold" uses chance + goldMult and is affected by player goldFind/city gold modifiers.
// - type "resource" uses id/resourceId + min/max and is affected by player resourceFind plus city resource modifiers.
// - type "potionPool" uses category health/mana/all; potion choice is weighted by POTION_DEFS.dropWeight.
// - type "equipment" can use category weapon/armor/all/none, rarity, tries, minRarity, level, and levelOffset.
// - type "named"/"unique" with itemId/id drops that exact item; without itemId/id it rolls from the named/unique pools.
// - magicFind: true lets player magicFind multiply random named/unique pool chance. It does not affect fixed itemId drops.
// - requires, blockedBy, conditions, sourceRegionId, etc. are evaluated per entry with worldEntryAllowed.
export const LOOT_TABLES = {
  // Material loot
  material_wood: [
    { type: "resource", id: "wood_piece", min: 2, max: 6, chance: 0.45 },
    { type: "resource", id: "wood_plank", min: 1, max: 2, chance: 0.02 },
    { type: "resource", id: "coal", min: 1, max: 2, chance: 0.01 }
  ],
  material_stone: [
    { type: "resource", id: "rock_piece", min: 2, max: 5, chance: 0.45 },
    { type: "resource", id: "iron_piece", min: 1, max: 2, chance: 0.11 },
    { type: "resource", id: "coal", min: 1, max: 2, chance: 0.1 },
    { type: "resource", id: "stone_brick", min: 1, max: 1, chance: 0.04 },
    { type: "resource", id: "diamond", min: 1, max: 1, chance: 0.001 }
  ],
  material_gemstones: [
    { type: "resource", id: "crystal_piece", min: 1, max: 3, chance: 0.008 },
    { type: "resource", id: "crystal", min: 1, max: 1, chance: 0.006 },
    { type: "resource", id: "red_gemstone", min: 1, max: 1, chance: 0.004 },
    { type: "resource", id: "yellow_gemstone", min: 1, max: 1, chance: 0.004 },
    { type: "resource", id: "green_gemstone", min: 1, max: 1, chance: 0.004 },
    { type: "resource", id: "blue_gemstone", min: 1, max: 1, chance: 0.004 },
    { type: "resource", id: "black_gemstone", min: 1, max: 1, chance: 0.0007 },
    { type: "resource", id: "white_gemstone", min: 1, max: 1, chance: 0.0007 },
    { type: "resource", id: "diamond", min: 1, max: 1, chance: 0.00045 },
    { type: "resource", id: "magic_essence", min: 1, max: 1, chance: 0.001 },
  ],
  material_houses: [
    { type: "resource", id: "junk", min: 2, max: 6, chance: 1 },
    { type: "resource", id: "wood_piece", min: 1, max: 5, chance: 0.45 },
    { type: "resource", id: "rock_piece", min: 1, max: 4, chance: 0.34 },
    { type: "resource", id: "iron_piece", min: 1, max: 2, chance: 0.12 },
    { type: "resource", id: "crystal_piece", min: 1, max: 4, chance: 0.06 },
    { type: "resource", id: "meat", min: 1, max: 2, chance: 0.05 },
    { type: "resource", id: "fruit", min: 1, max: 2, chance: 0.05 },
    { type: "resource", id: "coal", min: 1, max: 2, chance: 0.05 },
    { type: "resource", id: "wood_plank", min: 1, max: 1, chance: 0.035 },
    { type: "resource", id: "stone_brick", min: 1, max: 1, chance: 0.03 },
    { type: "resource", id: "iron_bar", min: 1, max: 1, chance: 0.018 },
    { type: "resource", id: "crystal", min: 1, max: 1, chance: 0.012 }
  ],
  material_fruit: [
    { type: "resource", id: "fruit_orange", min: 1, max: 2, chance: 0.03 },
    { type: "resource", id: "fruit_banana", min: 1, max: 2, chance: 0.03 },
    { type: "resource", id: "fruit", min: 1, max: 2, chance: 0.1 }
  ],
  material_paper: [
    { type: "resource", id: "paper", min: 1, max: 2, chance: 0.03 },
    { type: "resource", id: "scroll", min: 1, max: 2, chance: 0.03 },
    { type: "resource", id: "junk", min: 1, max: 2, chance: 0.1 }
  ],
  object_metal_scrap: [
    { type: "resource", id: "iron_piece", min: 1, max: 2, chance: 0.15 },
    { type: "resource", id: "iron_bar", min: 1, max: 2, chance: 0.01 },
    { type: "resource", id: "iron_plates", min: 1, max: 2, chance: 0.01 },
    { type: "resource", id: "iron_chains", min: 1, max: 2, chance: 0.01 }
  ],
  material_magic: [
    { type: "resource", id: "magic_essence", min: 1, max: 1, chance: 0.001 },
    { type: "resource", id: "magicmushroom", min: 1, max: 1, chance: 0.007 }
  ],
  material_bone: [
    { type: "resource", id: "bonedust", min: 1, max: 3, chance: 0.5 }
  ],
  material_plant: [
    { type: "resource", id: "rare_pink_flower", chance: 0.01, min: 1, max: 1 },
    { type: "resource", id: "red_rose", chance: 0.02, min: 1, max: 1 }
  ],
  material_magic_plants: [
    { type: "resource", id: "magicmushroom", chance: 0.007, min: 1, max: 1 }
  ],
  material_animal_small: [
    { type: "resource", id: "hide", min: 1, max: 1, chance: 0.08 },
    { type: "resource", id: "meat", min: 1, max: 1, chance: 0.08 }
  ],
  material_animal_medium: [
    { type: "resource", id: "hide", min: 1, max: 2, chance: 0.24 },
    { type: "resource", id: "meat", min: 1, max: 4, chance: 0.38 }
  ],
  material_humanoid: [
    { type: "resource", id: "scroll", min: 1, max: 2, chance: 0.12 },
    { type: "resource", id: "paper", min: 1, max: 2, chance: 0.12 },
    { type: "resource", id: "junk", min: 1, max: 3, chance: 0.12 },
    { type: "resource", id: "fruit", min: 1, max: 2, chance: 0.08 }
  ],
  object_well_loot: [
    { type: "resource", id: "rock_piece", min: 1, max: 3, chance: 1 },
    { type: "resource", id: "stone_brick", min: 1, max: 1, chance: 0.06 }
  ],
  object_container_food: [
    { type: "potionPool", category: "health", chance: 0.1 },
    { type: "resource", id: "wheat", min: 1, max: 3, chance: 0.65 },
    { type: "resource", id: "paper", min: 1, max: 4, chance: 0.1 },
    { type: "resource", id: "wood_plank", min: 1, max: 4, chance: 0.1 },
    { type: "resource", id: "bonedust", min: 1, max: 1, chance: 0.01 }
  ],
  object_pillar_stone_loot: [
    { type: "resource", id: "stone_brick", min: 1, max: 2, chance: 0.45 }
  ],
  object_ruin_jungle_items: [
    { type: "equipment", rarity: "poor", chance: 0.035, tries: 120 },
    { type: "equipment", rarity: "normal", chance: 0.024, tries: 120 },
    { type: "equipment", rarity: "upgraded", chance: 0.012, tries: 120 },
    { type: "equipment", rarity: "rare", chance: 0.01, tries: 120 },
    { type: "equipment", rarity: "epic", chance: 0.0035, tries: 120 },
    { type: "equipment", rarity: "legendary", chance: 0.0012, tries: 120 }
  ],
  object_container_common: [
    { type: "potionPool", category: "health", chance: 0.2 },
    { type: "resource", id: "wood_piece", min: 2, max: 6, chance: 0.45 },
    { type: "resource", id: "wood_plank", min: 1, max: 2, chance: 0.02 },
    { type: "resource", id: "coal", min: 1, max: 2, chance: 0.01 },
    { type: "resource", id: "rock_piece", min: 2, max: 5, chance: 0.45 },
    { type: "resource", id: "iron_piece", min: 1, max: 2, chance: 0.11 },
    { type: "resource", id: "coal", min: 1, max: 2, chance: 0.1 },
    { type: "resource", id: "stone_brick", min: 1, max: 1, chance: 0.04 },
    { type: "resource", id: "diamond", min: 1, max: 1, chance: 0.001 },
    { type: "resource", id: "junk", min: 1, max: 3, chance: 0.33 },
    { type: "equipment", category: "weapon", minRarity: "poor", chance: 0.01, tries: 120 },
    { type: "equipment", category: "armor", minRarity: "poor", chance: 0.01, tries: 120 },
    { type: "unique", source: "monster", chance: 0.0015, magicFind: true },
    { type: "named", source: "monster", chanceMult: "monster" }
  ],
  object_shelfs_loot: [
    { type: "potionPool", category: "health", chance: 0.1 },
    { type: "resource", id: "paper", min: 1, max: 4, chance: 0.1 },
    { type: "resource", id: "wood_plank", min: 1, max: 4, chance: 0.1 }
  ],
  object_barn_loot: [
    { type: "resource", id: "junk", min: 1, max: 3, chance: 1 },
    { type: "resource", id: "wood_piece", min: 1, max: 4, chance: 0.1 },
    { type: "resource", id: "wood_plank", min: 1, max: 1, chance: 0.05 }
  ],
  object_hay_loot: [
    { type: "resource", id: "wheat", min: 1, max: 3, chance: 0.75 },
    { type: "resource", id: "wood_piece", min: 1, max: 4, chance: 0.1 },
    { type: "resource", id: "wood_plank", min: 1, max: 1, chance: 0.05 }
  ],
  // Gold loot
  gold_low: [
    { type: "gold", chance: 0.45, goldMult: 0.75 }
  ],
  gold_medium: [
    { type: "gold", chance: 0.65, goldMult: 1.15 }
  ],
  gold_high: [
    { type: "gold", chance: 0.72, goldMult: 1.55 }
  ],
  gold_boss: [
    { type: "gold", chance: 0.92, goldMult: 2.4 }
  ],
  gold_treasure: [
    { type: "gold", chance: 0.35, goldMult: 0.35 },
    { type: "gold", chance: 0.22, goldMult: 1.5 },
    { type: "gold", chance: 0.08, goldMult: 5 }
  ],
  gold_bank: [
    { type: "resource", id: "gold_nugget", min: 1, max: 3, chance: 0.07 },
    { type: "resource", id: "gold_bar", min: 1, max: 3, chance: 0.001 }
  ],
  // Monster weighted profiles
  monster_profile_humanoid: [
    { type: "potionPool", category: "health", weight: 8 },
    { type: "potionPool", category: "mana", weight: 5 },
    { type: "equipment", category: "weapon", weight: 15 },
    { type: "equipment", category: "armor", weight: 10 },
    { type: "equipment", category: "none", weight: 62 }
  ],
  // Equipment bonus loot
  equipment_attacker_rare: [
    { type: "equipment", category: "weapon", minRarity: "rare", chance: 0.01, tries: 120 }
  ],
  equipment_defender_rare: [
    { type: "equipment", category: "armor", minRarity: "rare", chance: 0.01, tries: 120 }
  ],
  // Monster special loot
  monster_special_global: [
    { type: "unique", source: "monster", chance: 0.0015, magicFind: true },
    { type: "named", source: "monster", chanceMult: "monster" }
  ],
  special_wolffenris_treasure: [
    {
      type: "unique",
      itemId: "treasure_of_the_fenris",
      chance: 0.01,
      requires: {
        sourceRegionId: {
          in: [
            "forest",
            "life-tree",
            "quiet-tree",
            "waterfall-stream",
            "fishermans-fall",
            "hunter-trail",
            "wild-trails",
            "stone-ring-glade",
            "hunters-hut",
            "elflight-glow",
            "summer-heather"
          ]
        }
      },
      id: "treasure_of_the_fenris"
    }
  ],
  // Readable loot
  readable_arcane_spellbooks: [
    { type: "readable", id: "energy_beam_spellbook", readableId: "energy_beam_spellbook", chance: 0.01 },
    { type: "readable", id: "lightning_spellbook", readableId: "lightning_spellbook", chance: 0.012 }
  ],
  readable_frost_spellbooks: [
    { type: "readable", id: "ice_bolt_spellbook", readableId: "ice_bolt_spellbook", chance: 0.012 },
    { type: "readable", id: "blizzard_spellbook", readableId: "blizzard_spellbook", chance: 0.009 }
  ],
  readable_fire_spellbooks: [
    { type: "readable", id: "explosion_spellbook", readableId: "explosion_spellbook", chance: 0.01 },
    { type: "readable", id: "firerain_spellbook", readableId: "firerain_spellbook", chance: 0.01 }
  ],
  // Other loot
  destroyed_item_poor_scrap: [
    { type: "resource", id: "junk", min: 1, max: 2, chance: 1 },
    { type: "resource", id: "iron_piece", min: 1, max: 1, chance: 0.02 }
  ],
  destroyed_item_normal_scrap: [
    { type: "resource", id: "junk", min: 1, max: 3, chance: 1 },
    { type: "resource", id: "iron_piece", min: 1, max: 1, chance: 0.04 }
  ],
  destroyed_item_upgraded_scrap: [
    { type: "resource", id: "junk", min: 2, max: 4, chance: 1 },
    { type: "resource", id: "iron_piece", min: 1, max: 2, chance: 0.08 }
  ],
  destroyed_item_rare_scrap: [
    { type: "resource", id: "junk", min: 3, max: 6, chance: 1 },
    { type: "resource", id: "iron_piece", min: 1, max: 2, chance: 0.14 }
  ],
  destroyed_item_epic_scrap: [
    { type: "resource", id: "junk", min: 4, max: 8, chance: 1 },
    { type: "resource", id: "iron_piece", min: 1, max: 2, chance: 1 },
    { type: "resource", id: "red_gemstone", min: 1, max: 1, chance: 0.035 },
    { type: "resource", id: "yellow_gemstone", min: 1, max: 1, chance: 0.035 },
    { type: "resource", id: "green_gemstone", min: 1, max: 1, chance: 0.035 },
    { type: "resource", id: "blue_gemstone", min: 1, max: 1, chance: 0.035 },
    { type: "resource", id: "diamond", min: 1, max: 1, chance: 0.004 }
  ],
  destroyed_item_legendary_scrap: [
    { type: "resource", id: "junk", min: 6, max: 10, chance: 1 },
    { type: "resource", id: "iron_piece", min: 2, max: 4, chance: 1 },
    { type: "resource", id: "red_gemstone", min: 1, max: 1, chance: 0.08 },
    { type: "resource", id: "yellow_gemstone", min: 1, max: 1, chance: 0.08 },
    { type: "resource", id: "green_gemstone", min: 1, max: 1, chance: 0.08 },
    { type: "resource", id: "blue_gemstone", min: 1, max: 1, chance: 0.08 },
    { type: "resource", id: "diamond", min: 1, max: 1, chance: 0.012 }
  ],
  destroyed_item_unique_scrap: [
    { type: "resource", id: "junk", min: 8, max: 12, chance: 1 },
    { type: "resource", id: "iron_piece", min: 3, max: 5, chance: 1 },
    { type: "resource", id: "red_gemstone", min: 1, max: 2, chance: 0.1 },
    { type: "resource", id: "yellow_gemstone", min: 1, max: 2, chance: 0.1 },
    { type: "resource", id: "green_gemstone", min: 1, max: 2, chance: 0.1 },
    { type: "resource", id: "blue_gemstone", min: 1, max: 2, chance: 0.1 },
    { type: "resource", id: "diamond", min: 1, max: 1, chance: 0.02 }
  ],
  chest_common: [
    { type: "unique", chance: 0.08, source: "chest" },
    { type: "named", chanceMult: 3, source: "chest" },
    { type: "equipment", category: "all", chance: 1, minRarity: "normal", tries: 12 }
  ],
  chest_bonus_red_rose: [
    { type: "resource", id: "red_rose", chance: 0.05, min: 1, max: 1 }
  ],
  rare_document_wolf_loot: [
    { type: "resource", id: "bonedust", min: 1, max: 1, chance: 1, questItem: true },
    { type: "item", id: "iron_sword", itemId: "iron_sword", chance: 0.08 }
  ],
  foliage_bone_dust_roots: [
    { type: "resource", id: "bonedust", chance: 0.05, min: 1, max: 1 },
    { type: "resource", id: "magic_essence", chance: 0.02, min: 1, max: 1 },
    { type: "resource", id: "rare_pink_flower", chance: 0.01, min: 1, max: 1 }
  ],
  foliage_metal_plates: [
    { type: "resource", id: "iron_plates", chance: 0.25, min: 1, max: 1 }
  ],
  foliage_metal_chains: [
    { type: "resource", id: "iron_chains", chance: 0.2, min: 1, max: 1 }
  ],
  foliage_dead_village_remains: [
    { type: "resource", id: "red_rose", chance: 0.02, min: 1, max: 1 },
    { type: "resource", id: "fruit", chance: 0.01, min: 1, max: 1 },
    { type: "resource", id: "meat", chance: 0.01, min: 1, max: 1 },
    { type: "resource", id: "wheat", chance: 0.01, min: 1, max: 1 }
  ]
};

export function lootTableEntries(tableId) {
  const table = LOOT_TABLES[tableId];
  return Array.isArray(table) ? table : [];
}
