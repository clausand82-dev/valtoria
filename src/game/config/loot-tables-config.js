export const LOOT_TABLES = {
  object_wood_material: [
    { type: "resource", id: "wood_piece", min: 2, max: 6, chance: 0.45 },
    { type: "resource", id: "wood_plank", min: 1, max: 2, chance: 0.02 },
    { type: "resource", id: "coal", min: 1, max: 2, chance: 0.01 }
  ],
  object_stone_material: [
    { type: "resource", id: "rock_piece", min: 2, max: 5, chance: 0.45 },
    { type: "resource", id: "iron_piece", min: 1, max: 2, chance: 0.11 },
    { type: "resource", id: "coal", min: 1, max: 2, chance: 0.1 },
    { type: "resource", id: "stone_brick", min: 1, max: 1, chance: 0.04 },
    { type: "resource", id: "diamond", min: 1, max: 1, chance: 0.001 }
  ],
  object_rare_gemstones: [
    { type: "resource", id: "red_gemstone", min: 1, max: 1, chance: 0.004 },
    { type: "resource", id: "yellow_gemstone", min: 1, max: 1, chance: 0.004 },
    { type: "resource", id: "green_gemstone", min: 1, max: 1, chance: 0.004 },
    { type: "resource", id: "blue_gemstone", min: 1, max: 1, chance: 0.004 },
    { type: "resource", id: "black_gemstone", min: 1, max: 1, chance: 0.0007 },
    { type: "resource", id: "white_gemstone", min: 1, max: 1, chance: 0.0007 },
    { type: "resource", id: "diamond", min: 1, max: 1, chance: 0.00045 }
  ],
  object_house_scrap: [
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
  object_fruit_baskets: [
    { type: "resource", id: "fruit_orange", min: 1, max: 2, chance: 0.03 },
    { type: "resource", id: "fruit_banana", min: 1, max: 2, chance: 0.03 },
    { type: "resource", id: "fruit", min: 1, max: 2, chance: 0.1 }
  ],
  object_metal_scrap: [
    { type: "resource", id: "iron_piece", min: 1, max: 2, chance: 0.15 },
    { type: "resource", id: "iron_bar", min: 1, max: 2, chance: 0.01 },
    { type: "resource", id: "iron_plates", min: 1, max: 2, chance: 0.01 },
    { type: "resource", id: "iron_chains", min: 1, max: 2, chance: 0.01 }
  ],
  monster_default_profile: [
    { type: "gold", chance: 0.55, goldMult: 1 },
    { type: "potionPool", category: "health", weight: 4 },
    { type: "potionPool", category: "mana", weight: 2 },
    { type: "equipment", category: "weapon", weight: 8 },
    { type: "equipment", category: "armor", weight: 8 },
    { type: "equipment", category: "none", weight: 68 }
  ],
  monster_default_special_items: [
    { type: "unique", source: "monster", chance: 0.0015, magicFind: true },
    { type: "named", source: "monster", chanceMult: "monster" }
  ],
  monster_default_resources: [
    { type: "resource", id: "fruit", min: 1, max: 2, chance: 0.12 },
    { type: "resource", id: "paper", min: 1, max: 2, chance: 0.12 },
    { type: "resource", id: "scroll", min: 1, max: 2, chance: 0.12 },
    { type: "resource", id: "magicmushroom", min: 1, max: 2, chance: 0.007 },
    { type: "resource", id: "red_rose", min: 1, max: 1, chance: 0.02 },
    { type: "resource", id: "rare_pink_flower", min: 1, max: 1, chance: 0.001 }
  ],
  monster_default_rare_gems: [
    { type: "resource", id: "red_gemstone", min: 1, max: 1, chance: 0.0025 },
    { type: "resource", id: "yellow_gemstone", min: 1, max: 1, chance: 0.0025 },
    { type: "resource", id: "green_gemstone", min: 1, max: 1, chance: 0.0025 },
    { type: "resource", id: "blue_gemstone", min: 1, max: 1, chance: 0.0025 },
    { type: "resource", id: "magic_essence", min: 1, max: 1, chance: 0.001 }
  ],
  monster_knight_profile: [
    { type: "gold", chance: 0.72, goldMult: 1.2 },
    { type: "potionPool", category: "health", weight: 6 },
    { type: "potionPool", category: "mana", weight: 4 },
    { type: "equipment", category: "weapon", weight: 28 },
    { type: "equipment", category: "armor", weight: 28 },
    { type: "equipment", category: "none", weight: 34 }
  ],
  monster_wild_boar_profile: [
    { type: "gold", chance: 0.18, goldMult: 0.65 },
    { type: "potionPool", category: "health", weight: 8 },
    { type: "potionPool", category: "mana", weight: 2 },
    { type: "equipment", category: "weapon", weight: 3 },
    { type: "equipment", category: "armor", weight: 3 },
    { type: "equipment", category: "none", weight: 84 }
  ],
  monster_wild_boar_resources: [
    { type: "resource", id: "meat", min: 1, max: 2, chance: 0.32 },
    { type: "resource", id: "hide", min: 1, max: 1, chance: 0.12 }
  ],
  monster_blacksmiths_bane_profile: [
    { type: "gold", chance: 0.92, goldMult: 2.1 },
    { type: "potionPool", category: "health", weight: 8 },
    { type: "potionPool", category: "mana", weight: 5 },
    { type: "equipment", category: "weapon", weight: 24 },
    { type: "equipment", category: "armor", weight: 24 },
    { type: "equipment", category: "none", weight: 39 }
  ],
  monster_blacksmiths_bane_resources: [
    { type: "resource", id: "meat", min: 3, max: 6, chance: 0.82 },
    { type: "resource", id: "hide", min: 2, max: 4, chance: 0.55 }
  ],
  monster_bear_profile: [
    { type: "gold", chance: 0.18, goldMult: 0.65 },
    { type: "potionPool", category: "health", weight: 8 },
    { type: "potionPool", category: "mana", weight: 2 },
    { type: "equipment", category: "weapon", weight: 3 },
    { type: "equipment", category: "armor", weight: 3 },
    { type: "equipment", category: "none", weight: 84 }
  ],
  monster_bear_resources: [
    { type: "resource", id: "meat", min: 2, max: 4, chance: 0.42 },
    { type: "resource", id: "hide", min: 1, max: 2, chance: 0.24 }
  ],
  monster_icebear_profile: [
    { type: "gold", chance: 0.22, goldMult: 0.8 },
    { type: "potionPool", category: "health", weight: 8 },
    { type: "potionPool", category: "mana", weight: 4 },
    { type: "equipment", category: "weapon", weight: 5 },
    { type: "equipment", category: "armor", weight: 5 },
    { type: "equipment", category: "none", weight: 78 }
  ],
  monster_icebear_resources: [
    { type: "resource", id: "meat", min: 2, max: 4, chance: 0.38 },
    { type: "resource", id: "hide", min: 1, max: 2, chance: 0.28 },
    { type: "resource", id: "crystal_piece", min: 1, max: 2, chance: 0.08 }
  ],
  monster_lion_profile: [
    { type: "gold", chance: 0.18, goldMult: 0.65 },
    { type: "potionPool", category: "health", weight: 8 },
    { type: "potionPool", category: "mana", weight: 2 },
    { type: "equipment", category: "weapon", weight: 3 },
    { type: "equipment", category: "armor", weight: 3 },
    { type: "equipment", category: "none", weight: 84 }
  ],
  monster_lion_resources: [
    { type: "resource", id: "meat", min: 1, max: 3, chance: 0.34 },
    { type: "resource", id: "hide", min: 1, max: 1, chance: 0.18 }
  ],
  monster_rat_profile: [
    { type: "gold", chance: 0.08, goldMult: 0.35 },
    { type: "potionPool", category: "health", weight: 3 },
    { type: "potionPool", category: "mana", weight: 2 },
    { type: "equipment", category: "weapon", weight: 1 },
    { type: "equipment", category: "armor", weight: 1 },
    { type: "equipment", category: "none", weight: 93 }
  ],
  monster_rat_resources: [
    { type: "resource", id: "meat", min: 1, max: 1, chance: 0.05 },
    { type: "resource", id: "junk", min: 1, max: 1, chance: 0.12 }
  ],
  monster_sickrat_profile: [
    { type: "gold", chance: 0.08, goldMult: 0.35 },
    { type: "potionPool", category: "health", weight: 3 },
    { type: "potionPool", category: "mana", weight: 2 },
    { type: "equipment", category: "weapon", weight: 1 },
    { type: "equipment", category: "armor", weight: 1 },
    { type: "equipment", category: "none", weight: 93 }
  ],
  monster_sickrat_resources: [
    { type: "resource", id: "junk", min: 1, max: 2, chance: 0.18 },
    { type: "resource", id: "bonedust", min: 1, max: 1, chance: 0.08 }
  ],
  monster_village01_profile: [
    { type: "gold", chance: 0.45, goldMult: 0.85 },
    { type: "potionPool", category: "health", weight: 8 },
    { type: "potionPool", category: "mana", weight: 4 },
    { type: "equipment", category: "weapon", weight: 10 },
    { type: "equipment", category: "armor", weight: 8 },
    { type: "equipment", category: "none", weight: 70 }
  ],
  monster_village02_profile: [
    { type: "gold", chance: 0.5, goldMult: 0.9 },
    { type: "potionPool", category: "health", weight: 8 },
    { type: "potionPool", category: "mana", weight: 4 },
    { type: "equipment", category: "weapon", weight: 12 },
    { type: "equipment", category: "armor", weight: 10 },
    { type: "equipment", category: "none", weight: 66 }
  ],
  monster_village03_profile: [
    { type: "gold", chance: 0.46, goldMult: 0.86 },
    { type: "potionPool", category: "health", weight: 8 },
    { type: "potionPool", category: "mana", weight: 4 },
    { type: "equipment", category: "weapon", weight: 10 },
    { type: "equipment", category: "armor", weight: 9 },
    { type: "equipment", category: "none", weight: 69 }
  ],
  monster_village04_profile: [
    { type: "gold", chance: 0.48, goldMult: 0.88 },
    { type: "potionPool", category: "health", weight: 8 },
    { type: "potionPool", category: "mana", weight: 4 },
    { type: "equipment", category: "weapon", weight: 11 },
    { type: "equipment", category: "armor", weight: 10 },
    { type: "equipment", category: "none", weight: 67 }
  ],
  monster_village05_profile: [
    { type: "gold", chance: 0.47, goldMult: 0.87 },
    { type: "potionPool", category: "health", weight: 8 },
    { type: "potionPool", category: "mana", weight: 4 },
    { type: "equipment", category: "weapon", weight: 10 },
    { type: "equipment", category: "armor", weight: 9 },
    { type: "equipment", category: "none", weight: 69 }
  ],
  monster_village06_profile: [
    { type: "gold", chance: 0.5, goldMult: 0.9 },
    { type: "potionPool", category: "health", weight: 8 },
    { type: "potionPool", category: "mana", weight: 4 },
    { type: "equipment", category: "weapon", weight: 12 },
    { type: "equipment", category: "armor", weight: 10 },
    { type: "equipment", category: "none", weight: 66 }
  ],
  monster_wizard_profile: [
    { type: "gold", chance: 0.62, goldMult: 1.05 },
    { type: "potionPool", category: "health", weight: 4 },
    { type: "potionPool", category: "mana", weight: 24 },
    { type: "equipment", category: "weapon", weight: 8 },
    { type: "equipment", category: "armor", weight: 6 },
    { type: "equipment", category: "none", weight: 58 }
  ],
  monster_wizard_resources: [
    { type: "resource", id: "magic_essence", min: 1, max: 1, chance: 0.04 },
    { type: "resource", id: "scroll", min: 1, max: 2, chance: 0.14 }
  ],
  monster_spawn_of_hydra_profile: [
    { type: "gold", chance: 0.52, goldMult: 1.05 },
    { type: "potionPool", category: "health", weight: 8 },
    { type: "potionPool", category: "mana", weight: 18 },
    { type: "equipment", category: "weapon", weight: 8 },
    { type: "equipment", category: "armor", weight: 8 },
    { type: "equipment", category: "none", weight: 58 }
  ],
  monster_spawn_of_hydra_resources: [
    { type: "resource", id: "magic_essence", min: 1, max: 1, chance: 0.05 },
    { type: "resource", id: "green_gemstone", min: 1, max: 1, chance: 0.01 }
  ],
  monster_hellhound_profile: [
    { type: "gold", chance: 0.5, goldMult: 0.95 },
    { type: "potionPool", category: "health", weight: 10 },
    { type: "potionPool", category: "mana", weight: 2 },
    { type: "equipment", category: "weapon", weight: 12 },
    { type: "equipment", category: "armor", weight: 14 },
    { type: "equipment", category: "none", weight: 62 }
  ],
  monster_hellhound_resources: [
    { type: "resource", id: "hide", min: 1, max: 2, chance: 0.18 },
    { type: "resource", id: "coal", min: 1, max: 2, chance: 0.12 }
  ],
  monster_flesheater_profile: [
    { type: "gold", chance: 0.25, goldMult: 0.7 },
    { type: "potionPool", category: "health", weight: 16 },
    { type: "potionPool", category: "mana", weight: 8 },
    { type: "equipment", category: "weapon", weight: 4 },
    { type: "equipment", category: "armor", weight: 4 },
    { type: "equipment", category: "none", weight: 68 }
  ],
  monster_flesheater_resources: [
    { type: "resource", id: "fruit", min: 1, max: 2, chance: 0.18 },
    { type: "resource", id: "magic_essence", min: 1, max: 1, chance: 0.025 }
  ],
  monster_flesheater_young_profile: [
    { type: "gold", chance: 0.08, goldMult: 0.25 },
    { type: "potionPool", category: "health", weight: 3 },
    { type: "potionPool", category: "mana", weight: 1 },
    { type: "equipment", category: "none", weight: 96 }
  ],
  monster_spawn_of_archnogrim_profile: [
    { type: "gold", chance: 0.48, goldMult: 1 },
    { type: "potionPool", category: "health", weight: 7 },
    { type: "potionPool", category: "mana", weight: 5 },
    { type: "equipment", category: "weapon", weight: 14 },
    { type: "equipment", category: "armor", weight: 14 },
    { type: "equipment", category: "none", weight: 60 }
  ],
  monster_infernus_minion_profile: [
    { type: "gold", chance: 0.54, goldMult: 1.05 },
    { type: "potionPool", category: "health", weight: 6 },
    { type: "potionPool", category: "mana", weight: 16 },
    { type: "equipment", category: "weapon", weight: 8 },
    { type: "equipment", category: "armor", weight: 10 },
    { type: "equipment", category: "none", weight: 60 }
  ],
  monster_infernus_minion_resources: [
    { type: "resource", id: "coal", min: 1, max: 3, chance: 0.22 },
    { type: "resource", id: "magic_essence", min: 1, max: 1, chance: 0.035 }
  ],
  monster_bjergtroll_profile: [
    { type: "gold", chance: 0.7, goldMult: 1.35 },
    { type: "potionPool", category: "health", weight: 8 },
    { type: "potionPool", category: "mana", weight: 2 },
    { type: "equipment", category: "weapon", weight: 24 },
    { type: "equipment", category: "armor", weight: 28 },
    { type: "equipment", category: "none", weight: 38 }
  ],
  monster_bjergtroll_resources: [
    { type: "resource", id: "rock_piece", min: 2, max: 4, chance: 0.3 },
    { type: "resource", id: "iron_piece", min: 1, max: 2, chance: 0.1 }
  ],
  monster_gigantisktroll_profile: [
    { type: "gold", chance: 0.76, goldMult: 1.55 },
    { type: "potionPool", category: "health", weight: 8 },
    { type: "potionPool", category: "mana", weight: 2 },
    { type: "equipment", category: "weapon", weight: 26 },
    { type: "equipment", category: "armor", weight: 30 },
    { type: "equipment", category: "none", weight: 34 }
  ],
  monster_gigantisktroll_resources: [
    { type: "resource", id: "rock_piece", min: 3, max: 6, chance: 0.36 },
    { type: "resource", id: "iron_piece", min: 1, max: 3, chance: 0.16 }
  ],
  monster_demon_profile: [
    { type: "gold", chance: 0.72, goldMult: 1.15 },
    { type: "potionPool", category: "health", weight: 28 },
    { type: "equipment", category: "armor", weight: 24 },
    { type: "equipment", category: "weapon", weight: 4 },
    { type: "potionPool", category: "mana", weight: 2 },
    { type: "equipment", category: "none", weight: 42 }
  ],
  monster_demon_resources: [
    { type: "resource", id: "coal", min: 1, max: 3, chance: 0.2 }
  ],
  monster_ghost_profile: [
    { type: "gold", chance: 0.95, goldMult: 3.8 },
    { type: "potionPool", category: "mana", weight: 34 },
    { type: "potionPool", category: "health", weight: 2 },
    { type: "equipment", category: "weapon", weight: 2 },
    { type: "equipment", category: "armor", weight: 2 },
    { type: "equipment", category: "none", weight: 60 }
  ],
  monster_ghost_resources: [
    { type: "resource", id: "crystal_piece", min: 1, max: 2, chance: 0.16 }
  ],
  monster_skeleton_profile: [
    { type: "gold", chance: 0.65, goldMult: 1 },
    { type: "equipment", category: "weapon", weight: 31 },
    { type: "equipment", category: "armor", weight: 31 },
    { type: "potionPool", category: "health", weight: 3 },
    { type: "potionPool", category: "mana", weight: 3 },
    { type: "equipment", category: "none", weight: 32 }
  ],
  monster_scorpion_profile: [
    { type: "gold", chance: 0.7, goldMult: 1 },
    { type: "equipment", category: "all", weight: 18 },
    { type: "potionPool", category: "health", weight: 12 },
    { type: "potionPool", category: "mana", weight: 12 },
    { type: "equipment", category: "weapon", weight: 14 },
    { type: "equipment", category: "armor", weight: 14 },
    { type: "equipment", category: "none", weight: 30 }
  ],
  monster_snake_profile: [
    { type: "gold", chance: 0.16, goldMult: 0.7 },
    { type: "potionPool", category: "health", weight: 4 },
    { type: "potionPool", category: "mana", weight: 4 },
    { type: "equipment", category: "weapon", weight: 3 },
    { type: "equipment", category: "armor", weight: 3 },
    { type: "equipment", category: "none", weight: 86 }
  ],
  monster_snake_resources: [
    { type: "resource", id: "hide", min: 1, max: 1, chance: 0.06 }
  ],
  monster_spider_profile: [
    { type: "gold", chance: 0.42, goldMult: 0.75 },
    { type: "potionPool", category: "health", weight: 10 },
    { type: "potionPool", category: "mana", weight: 10 },
    { type: "equipment", category: "weapon", weight: 2 },
    { type: "equipment", category: "armor", weight: 2 },
    { type: "equipment", category: "none", weight: 40 }
  ],
  monster_minispider_profile: [
    { type: "gold", chance: 0.42, goldMult: 0.75 },
    { type: "potionPool", category: "health", weight: 5 },
    { type: "potionPool", category: "mana", weight: 10 },
    { type: "equipment", category: "weapon", weight: 2 },
    { type: "equipment", category: "armor", weight: 2 },
    { type: "equipment", category: "none", weight: 40 }
  ],
  monster_mediumspider_profile: [
    { type: "gold", chance: 0.42, goldMult: 0.75 },
    { type: "potionPool", category: "health", weight: 5 },
    { type: "potionPool", category: "mana", weight: 10 },
    { type: "equipment", category: "weapon", weight: 2 },
    { type: "equipment", category: "armor", weight: 2 },
    { type: "equipment", category: "none", weight: 40 }
  ],
  monster_largespider_profile: [
    { type: "gold", chance: 0.42, goldMult: 0.75 },
    { type: "potionPool", category: "health", weight: 5 },
    { type: "potionPool", category: "mana", weight: 5 },
    { type: "equipment", category: "weapon", weight: 10 },
    { type: "equipment", category: "armor", weight: 10 },
    { type: "equipment", category: "none", weight: 25 }
  ],
  monster_motherspider_profile: [
    { type: "gold", chance: 0.42, goldMult: 0.75 },
    { type: "potionPool", category: "health", weight: 5 },
    { type: "potionPool", category: "mana", weight: 5 },
    { type: "equipment", category: "weapon", weight: 25 },
    { type: "equipment", category: "armor", weight: 25 },
    { type: "equipment", category: "none", weight: 25 }
  ],
  monster_wolfcub_profile: [
    { type: "gold", chance: 0.22, goldMult: 0.7 },
    { type: "potionPool", category: "health", weight: 4 },
    { type: "potionPool", category: "mana", weight: 4 },
    { type: "equipment", category: "weapon", weight: 4 },
    { type: "equipment", category: "armor", weight: 4 },
    { type: "equipment", category: "none", weight: 84 }
  ],
  monster_wolfcub_resources: [
    { type: "resource", id: "hide", min: 1, max: 2, chance: 0.16 },
    { type: "resource", id: "meat", min: 1, max: 2, chance: 0.06 }
  ],
  monster_wolfcub_configured: [
    { type: "unique", itemId: "treasure_of_the_fenris", chance: 0.001, requires: { sourceRegionId: { in: ["forest", "life-tree", "quiet-tree", "waterfall-stream", "fishermans-fall", "hunter-trail", "wild-trails", "stone-ring-glade", "hunters-hut", "elflight-glow", "summer-heather"] } }, id: "treasure_of_the_fenris" }
  ],
  monster_wolf_profile: [
    { type: "gold", chance: 0.22, goldMult: 0.7 },
    { type: "potionPool", category: "health", weight: 4 },
    { type: "potionPool", category: "mana", weight: 4 },
    { type: "equipment", category: "weapon", weight: 4 },
    { type: "equipment", category: "armor", weight: 4 },
    { type: "equipment", category: "none", weight: 84 }
  ],
  monster_wolf_resources: [
    { type: "resource", id: "hide", min: 1, max: 2, chance: 0.16 },
    { type: "resource", id: "meat", min: 1, max: 2, chance: 0.06 }
  ],
  monster_wolf_configured: [
    { type: "unique", itemId: "treasure_of_the_fenris", chance: 0.001, requires: { sourceRegionId: { in: ["forest", "life-tree", "quiet-tree", "waterfall-stream", "fishermans-fall", "hunter-trail", "wild-trails", "stone-ring-glade", "hunters-hut", "elflight-glow", "summer-heather"] } }, id: "treasure_of_the_fenris" }
  ],
  monster_wolffenris_profile: [
    { type: "gold", chance: 0.22, goldMult: 0.7 },
    { type: "potionPool", category: "health", weight: 4 },
    { type: "potionPool", category: "mana", weight: 4 },
    { type: "equipment", category: "weapon", weight: 4 },
    { type: "equipment", category: "armor", weight: 4 },
    { type: "equipment", category: "none", weight: 2 }
  ],
  monster_wolffenris_resources: [
    { type: "resource", id: "hide", min: 1, max: 2, chance: 0.16 },
    { type: "resource", id: "meat", min: 1, max: 2, chance: 0.06 }
  ],
  monster_wolffenris_configured: [
    { type: "unique", itemId: "treasure_of_the_fenris", chance: 0.01, requires: { sourceRegionId: { in: ["forest", "life-tree", "quiet-tree", "waterfall-stream", "fishermans-fall", "hunter-trail", "wild-trails", "stone-ring-glade", "hunters-hut", "elflight-glow", "summer-heather"] } }, id: "treasure_of_the_fenris" }
  ],
  monster_demon_readables: [
    { type: "readable", id: "demon_note_1", readableId: "demon_note_1", chance: 0.055 },
    { type: "readable", id: "demon_note_2", readableId: "demon_note_2", chance: 0.045 },
    { type: "readable", id: "demon_note_3", readableId: "demon_note_3", chance: 0.035 },
    { type: "readable", id: "explosion_spellbook", readableId: "explosion_spellbook", chance: 0.01 },
    { type: "readable", id: "firerain_spell_fragment_1", readableId: "firerain_spell_fragment_1", chance: 0.018 },
    { type: "readable", id: "firerain_spell_fragment_2", readableId: "firerain_spell_fragment_2", chance: 0.014 },
    { type: "readable", id: "firerain_spellbook", readableId: "firerain_spellbook", chance: 0.01 }
  ],
  monster_gate_warden_readables: [
    { type: "readable", id: "demon_note_1", readableId: "demon_note_1", chance: 0.055 },
    { type: "readable", id: "demon_note_2", readableId: "demon_note_2", chance: 0.045 },
    { type: "readable", id: "demon_note_3", readableId: "demon_note_3", chance: 0.035 },
    { type: "readable", id: "explosion_spellbook", readableId: "explosion_spellbook", chance: 0.012 },
    { type: "readable", id: "firerain_spell_fragment_1", readableId: "firerain_spell_fragment_1", chance: 0.02 },
    { type: "readable", id: "firerain_spellbook", readableId: "firerain_spellbook", chance: 0.012 }
  ],
  monster_ghost_readables: [
    { type: "readable", id: "ember_spell_fragment_1", readableId: "ember_spell_fragment_1", chance: 0.02 },
    { type: "readable", id: "ember_spell_fragment_2", readableId: "ember_spell_fragment_2", chance: 0.015 },
    { type: "readable", id: "blizzard_spellbook", readableId: "blizzard_spellbook", chance: 0.009 },
    { type: "readable", id: "firerain_spell_fragment_2", readableId: "firerain_spell_fragment_2", chance: 0.016 },
    { type: "readable", id: "energy_beam_spellbook", readableId: "energy_beam_spellbook", chance: 0.01 },
    { type: "readable", id: "firerain_spellbook", readableId: "firerain_spellbook", chance: 0.01 }
  ],
  monster_rune_shade_readables: [
    { type: "readable", id: "ember_spell_fragment_1", readableId: "ember_spell_fragment_1", chance: 0.02 },
    { type: "readable", id: "ember_spell_fragment_2", readableId: "ember_spell_fragment_2", chance: 0.015 },
    { type: "readable", id: "ice_bolt_spellbook", readableId: "ice_bolt_spellbook", chance: 0.012 },
    { type: "readable", id: "blizzard_spellbook", readableId: "blizzard_spellbook", chance: 0.012 },
    { type: "readable", id: "energy_beam_spellbook", readableId: "energy_beam_spellbook", chance: 0.014 },
    { type: "readable", id: "lightning_spellbook", readableId: "lightning_spellbook", chance: 0.014 }
  ],
  monster_spider_readables: [
    { type: "readable", id: "ice_bolt_spellbook", readableId: "ice_bolt_spellbook", chance: 0.012 }
  ],
  monster_motherspider_readables: [
    { type: "readable", id: "blizzard_spellbook", readableId: "blizzard_spellbook", chance: 0.012 }
  ],
  monster_skeleton_readables: [
    { type: "readable", id: "poison_cloud_spellbook", readableId: "poison_cloud_spellbook", chance: 0.01 },
    { type: "readable", id: "lord_kealands_missing_daughter", readableId: "lord_kealands_missing_daughter", chance: 0.01 }
  ],
  monster_snake_readables: [
    { type: "readable", id: "poison_cloud_spellbook", readableId: "poison_cloud_spellbook", chance: 0.012 },
    { type: "readable", id: "lord_kealands_missing_daughter", readableId: "lord_kealands_missing_daughter", chance: 0.012 }
  ],
  monster_wizard_readables: [
    { type: "readable", id: "lightning_spellbook", readableId: "lightning_spellbook", chance: 0.012 }
  ],
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
  chest_unique_named: [
    { type: "unique", chance: 0.08, source: "chest" },
    { type: "named", chanceMult: 3, source: "chest" }
  ],
  chest_common: [
    { type: "equipment", category: "all", chance: 1, minRarity: "normal", tries: 12 }
  ],
  chest_bonus_red_rose: [
    { type: "resource", id: "red_rose", chance: 0.05, min: 1, max: 1 }
  ],
  rare_document_wolf_loot: [
    { type: "resource", id: "bonedust", min: 1, max: 1, chance: 1, questItem: true },
    { type: "item", id: "iron_sword", itemId: "iron_sword", chance: 0.08 }
  ],
  object_object_pillar_stone_loot: [
    { type: "resource", id: "stone_brick", min: 1, max: 2, chance: 0.45 }
  ],
  object_object_ruin_normal_items: [
    { type: "equipment", rarity: "legendary", chance: 0.0035, tries: 120 }
  ],
  object_object_ruin_snow_items: [
    { type: "equipment", rarity: "legendary", chance: 0.0035, tries: 120 }
  ],
  object_object_ruin_sand_items: [
    { type: "equipment", rarity: "legendary", chance: 0.0035, tries: 120 }
  ],
  object_object_ruin_jungle_items: [
    { type: "equipment", rarity: "poor", chance: 0.035, tries: 120 },
    { type: "equipment", rarity: "normal", chance: 0.024, tries: 120 },
    { type: "equipment", rarity: "upgraded", chance: 0.012, tries: 120 },
    { type: "equipment", rarity: "rare", chance: 0.01, tries: 120 },
    { type: "equipment", rarity: "epic", chance: 0.0035, tries: 120 },
    { type: "equipment", rarity: "legendary", chance: 0.0012, tries: 120 }
  ],
  object_object_woodboxes_ground_loot: [
    { type: "resource", id: "wood_piece", min: 2, max: 6, chance: 0.45 },
    { type: "resource", id: "wood_plank", min: 1, max: 2, chance: 0.02 },
    { type: "resource", id: "coal", min: 1, max: 2, chance: 0.01 },
    { type: "resource", id: "rock_piece", min: 2, max: 5, chance: 0.45 },
    { type: "resource", id: "iron_piece", min: 1, max: 2, chance: 0.11 },
    { type: "resource", id: "coal", min: 1, max: 2, chance: 0.1 },
    { type: "resource", id: "stone_brick", min: 1, max: 1, chance: 0.04 },
    { type: "resource", id: "diamond", min: 1, max: 1, chance: 0.001 },
    { type: "resource", id: "junk", min: 1, max: 3, chance: 0.33 }
  ],
  object_object_shelfs_loot: [
    { type: "resource", id: "health", min: 1, max: 3, chance: 0.1 },
    { type: "resource", id: "paper", min: 1, max: 4, chance: 0.1 },
    { type: "resource", id: "wood_plank", min: 1, max: 4, chance: 0.1 }
  ],
  object_object_shelfs_rare: [
    { type: "resource", id: "diamond", min: 1, max: 1, chance: 0.005 }
  ],
  object_object_barn_loot: [
    { type: "resource", id: "junk", min: 1, max: 3, chance: 1 },
    { type: "resource", id: "wood_piece", min: 1, max: 4, chance: 0.1 },
    { type: "resource", id: "wood_plank", min: 1, max: 1, chance: 0.05 }
  ],
  object_object_barn_rare: [
    { type: "resource", id: "diamond", min: 1, max: 1, chance: 0.001 }
  ],
  object_object_well_loot: [
    { type: "resource", id: "rock_piece", min: 1, max: 3, chance: 1 }
  ],
  object_object_well_rare: [
    { type: "resource", id: "stone_brick", min: 1, max: 1, chance: 0.06 }
  ],
  object_object_sacks_ground_loot: [
    { type: "resource", id: "health", min: 1, max: 3, chance: 0.1 },
    { type: "resource", id: "wheat", min: 1, max: 3, chance: 0.65 },
    { type: "resource", id: "paper", min: 1, max: 4, chance: 0.1 },
    { type: "resource", id: "wood_plank", min: 1, max: 4, chance: 0.1 }
  ],
  object_object_sacks_ground_rare: [
    { type: "resource", id: "diamond", min: 1, max: 1, chance: 0.005 }
  ],
  object_object_barrels_ground_loot: [
    { type: "resource", id: "health", min: 1, max: 3, chance: 0.1 },
    { type: "resource", id: "wheat", min: 1, max: 3, chance: 0.65 },
    { type: "resource", id: "paper", min: 1, max: 4, chance: 0.1 },
    { type: "resource", id: "wood_plank", min: 1, max: 4, chance: 0.1 }
  ],
  object_object_barrels_ground_rare: [
    { type: "resource", id: "bonedust", min: 1, max: 1, chance: 0.01 }
  ],
  object_object_hay_loot: [
    { type: "resource", id: "wheat", min: 1, max: 3, chance: 0.75 },
    { type: "resource", id: "wood_piece", min: 1, max: 4, chance: 0.1 },
    { type: "resource", id: "wood_plank", min: 1, max: 1, chance: 0.05 }
  ],
  object_object_hay_rare: [
    { type: "resource", id: "diamond", min: 1, max: 1, chance: 0.001 }
  ],
  object_object_bones_loot: [
    { type: "resource", id: "bonedust", min: 1, max: 3, chance: 0.5 }
  ],
  object_object_bones_rare: [
    { type: "resource", id: "magic_essence", min: 1, max: 1, chance: 0.01 }
  ],
  object_object_treestumps_loot: [
    { type: "resource", id: "bonedust", min: 1, max: 3, chance: 0.5 }
  ],
  object_object_treestumps_rare: [
    { type: "resource", id: "magic_essence", min: 1, max: 1, chance: 0.01 }
  ],
  object_object_talltree_medium_loot: [
    { type: "resource", id: "bonedust", min: 1, max: 3, chance: 0.5 }
  ],
  object_object_talltree_medium_rare: [
    { type: "resource", id: "magic_essence", min: 1, max: 1, chance: 0.01 }
  ],
  object_object_talltree_big_loot: [
    { type: "resource", id: "bonedust", min: 1, max: 3, chance: 0.5 }
  ],
  object_object_talltree_big_rare: [
    { type: "resource", id: "magic_essence", min: 1, max: 1, chance: 0.01 }
  ],
  object_object_fruitbaskets_rare: [
    { type: "resource", id: "magic_essence", min: 1, max: 1, chance: 0.001 }
  ],
  object_object_marketstalls_loot: [
    { type: "resource", id: "fruit_orange", min: 1, max: 2, chance: 0.03 },
    { type: "resource", id: "fruit_banana", min: 1, max: 2, chance: 0.03 },
    { type: "resource", id: "fruit", min: 1, max: 2, chance: 0.1 },
    { type: "resource", id: "wood_piece", min: 2, max: 6, chance: 0.45 },
    { type: "resource", id: "wood_plank", min: 1, max: 2, chance: 0.02 },
    { type: "resource", id: "coal", min: 1, max: 2, chance: 0.01 }
  ],
  object_object_marketstalls_rare: [
    { type: "resource", id: "magic_essence", min: 1, max: 1, chance: 0.001 }
  ],
  object_object_destroyed_marketstalls_loot: [
    { type: "resource", id: "wood_piece", min: 2, max: 6, chance: 0.45 },
    { type: "resource", id: "wood_plank", min: 1, max: 2, chance: 0.02 },
    { type: "resource", id: "coal", min: 1, max: 2, chance: 0.01 },
    { type: "resource", id: "junk", min: 1, max: 3, chance: 0.35 }
  ],
  object_object_destroyed_marketstalls_rare: [
    { type: "resource", id: "magic_essence", min: 1, max: 1, chance: 0.001 }
  ],
  object_object_wagons_rare: [
    { type: "resource", id: "magic_essence", min: 1, max: 1, chance: 0.001 }
  ],
  object_object_metalchest_rare: [
    { type: "resource", id: "magic_essence", min: 1, max: 1, chance: 0.001 }
  ],
  object_object_furnace_rare: [
    { type: "resource", id: "magic_essence", min: 1, max: 1, chance: 0.001 }
  ],
  object_object_anvil_rare: [
    { type: "resource", id: "magic_essence", min: 1, max: 1, chance: 0.001 }
  ],
  object_object_bellow_rare: [
    { type: "resource", id: "magic_essence", min: 1, max: 1, chance: 0.001 }
  ],
  foliage_mainland_magic_plants: [
    { type: "resource", id: "magic_essence", chance: 0.05, min: 1, max: 1 },
    { type: "resource", id: "wood_piece", chance: 0.02, min: 1, max: 1 },
    { type: "resource", id: "rare_pink_flower", chance: 0.01, min: 1, max: 1 },
    { type: "resource", id: "fruit_orange", chance: 0.03, min: 1, max: 1 },
    { type: "resource", id: "fruit_banana", chance: 0.03, min: 1, max: 1 }
  ],
  foliage_basement_scrub: [
    { type: "resource", id: "magic_essence", chance: 0.05, min: 1, max: 1 },
    { type: "resource", id: "wood_piece", chance: 0.02, min: 1, max: 1 },
    { type: "resource", id: "rare_pink_flower", chance: 0.01, min: 1, max: 1 }
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
  foliage_rose_orchard: [
    { type: "resource", id: "red_rose", chance: 0.02, min: 1, max: 1 },
    { type: "resource", id: "fruit_orange", chance: 0.03, min: 1, max: 1 },
    { type: "resource", id: "fruit_banana", chance: 0.03, min: 1, max: 1 }
  ],
  foliage_mainland_fruit_plants: [
    { type: "resource", id: "fruit_orange", chance: 0.03, min: 1, max: 1 },
    { type: "resource", id: "fruit_banana", chance: 0.03, min: 1, max: 1 }
  ],
  foliage_village_cityplants: [
    { type: "resource", id: "red_rose", chance: 0.02, min: 1, max: 1 },
    { type: "resource", id: "fruit", chance: 0.01, min: 1, max: 1 },
    { type: "resource", id: "meat", chance: 0.01, min: 1, max: 1 },
    { type: "resource", id: "wheat", chance: 0.01, min: 1, max: 1 },
    { type: "resource", id: "fruit_orange", chance: 0.03, min: 1, max: 1 },
    { type: "resource", id: "fruit_banana", chance: 0.03, min: 1, max: 1 }
  ],
  foliage_food_fruit: [
    { type: "resource", id: "fruit_orange", chance: 0.03, min: 1, max: 1 },
    { type: "resource", id: "fruit_banana", chance: 0.03, min: 1, max: 1 },
    { type: "resource", id: "fruit", chance: 0.1, min: 1, max: 1 }
  ],
  foliage_field_wheat_fruit: [
    { type: "resource", id: "wheat", chance: 0.02, min: 1, max: 1 },
    { type: "resource", id: "fruit_orange", chance: 0.03, min: 1, max: 1 },
    { type: "resource", id: "fruit_banana", chance: 0.03, min: 1, max: 1 }
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
