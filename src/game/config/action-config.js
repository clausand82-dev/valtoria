export const ACTION_CONFIG = {
  inspect_random_ruin: {
    id: "inspect_random_ruin",
    type: "inspect",
    label: "Undersoeg ruin",
    text: "Ruinen er aeldgammel og daekket af maerkelige tegn.",
    once: false,
  },

  read_demon_notes: {
    id: "read_demon_notes",
    type: "read",
    label: "Laes noter",
    readableId: "demon_notes_compiled",
    once: true,
    setFlags: ["read.demon_notes_compiled"],
  },

  collect_sealed_note: {
    id: "collect_sealed_note",
    type: "collect",
    label: "Tag note",
    rewards: {
      items: { note: 1 },
    },
    removeTarget: true,
    once: true,
    setFlags: ["item.note.collected"],
  },

  harvest_rare_pink_flower: {
    id: "harvest_rare_pink_flower",
    type: "harvest",
    label: "Pluk blomst",
    rewards: {
      resources: { rare_pink_flower: 1 },
    },
    removeTarget: true,
    once: true,
  },

  clear_old_barrier: {
    id: "clear_old_barrier",
    type: "destroy",
    label: "Ryd barriere",
    costs: {
      resources: { wood_piece: 2 },
    },
    removeTarget: true,
    setFlags: ["barrier.old.cleared"],
    once: true,
  },

  open_weathered_chest: {
    id: "open_weathered_chest",
    type: "open",
    label: "Aaben",
    setFlags: ["chest.weathered.opened"],
    once: true,
  },

  open_map_chest: {
    id: "open_map_chest",
    type: "open",
    label: "Aaben kiste",
    prompt: "open chest",
    chestLoot: true,
  },

  activate_old_rune: {
    id: "activate_old_rune",
    type: "activate",
    label: "Aktiver",
    text: "Runen summer kort og falmer derefter.",
    addCounters: { "rune.old.activations": 1 },
    setFlags: ["rune.old.activated"],
    once: true,
  },

  reveal_small_cache: {
    id: "reveal_small_cache",
    type: "reveal",
    label: "Undersoeg",
    text: "Du finder spor efter et skjult depot.",
    setFlags: ["cache.small.revealed"],
    once: true,
  },

  cleanse_minor_shrine: {
    id: "cleanse_minor_shrine",
    type: "cleanse",
    label: "Rens",
    costs: {
      resources: { rare_pink_flower: 1 },
    },
    worldEnergy: { lydra: 2, netdra: -1 },
    setFlags: ["shrine.minor.cleansed"],
    once: true,
  },

  repair_old_planks: {
    id: "repair_old_planks",
    type: "repair",
    label: "Reparer",
    costs: {
      resources: { wood_piece: 2, rock_piece: 1 },
    },
    setFlags: ["planks.old.repaired"],
    once: true,
  },

  repair_village_house: {
    id: "repair_village_house",
    type: "repair",
    label: "Reparer hus",
    prompt: "Reparer huset",
    costs: {
      resources: { wood_piece: 2},
    },
    replaceTargetWith: "object_house_mainland",
    replaceTargetDestructible: false,
    once: true,
  },

  repair_smithy_furnace: {
    id: "repair_smithy_furnace",
    type: "repair",
    label: "Reparer furnace",
    prompt: "Reparer furnace",
    requires: { questActive: "blacksmith_repair_smithy" },
    costs: {
      resources: { iron_plates: 4, iron_chains: 2 },
    },
    replaceTargetWith: "object_furnace",
    replaceTargetDestructible: false,
    once: true,
  },

  repair_smithy_anvil: {
    id: "repair_smithy_anvil",
    type: "repair",
    label: "Reparer anvil",
    prompt: "Reparer anvil",
    requires: { questActive: "blacksmith_repair_smithy" },
    costs: {
      resources: { iron_plates: 3, iron_chains: 1 },
    },
    replaceTargetWith: "object_anvil",
    replaceTargetDestructible: false,
    once: true,
  },

  repair_smithy_bellow: {
    id: "repair_smithy_bellow",
    type: "repair",
    label: "Reparer bellow",
    prompt: "Reparer bellow",
    requires: { questActive: "blacksmith_repair_smithy" },
    costs: {
      resources: { iron_plates: 2, iron_chains: 2 },
    },
    replaceTargetWith: "object_bellow",
    replaceTargetDestructible: false,
    once: true,
  },

  inspect_blacksmith_wife: {
    id: "inspect_blacksmith_wife",
    type: "inspect",
    label: "Undersoeg",
    text: "Kvinden er doed. De dybe bidemaerker og oedelagte knogler peger ikke paa edderkopper eller ulve, men paa et enormt vildsvin.",
    requires: { questActive: "blacksmith_find_wife" },
    once: true,
  },

  bury_village_dead: {
    id: "bury_village_dead",
    type: "cleanse",
    label: "Begrav landsbyboer",
    prompt: "Begrav den doede landsbyboer",
    requires: { questActive: "mayor_repair_village_houses" },    
    replaceFoliageWith: "object/object_gravestone.png",
    replaceFoliageSize: 0.7,
    once: true,
  },

  offer_flower_to_shrine: {
    id: "offer_flower_to_shrine",
    type: "offer",
    label: "Giv offer",
    costs: {
      resources: { rare_pink_flower: 1 },
      gold: 10,
    },
    rewards: {
      resources: { magic_essence: 1 },
    },
    setFlags: ["shrine.flower.offered"],
    once: true,
  },

  enter_generic_cave01: {
    id: "enter_generic_cave01",
    type: "enterSubregion",
    label: "Gaa ind",
    targetSubregionId: "cave01_lvl1",
    instanceScope: "sourceObject",
    persistence: "whileRootRegionActive",
  },

  enter_blacksmith_boar_cave_lvl1: {
    id: "enter_blacksmith_boar_cave_lvl1",
    type: "enterSubregion",
    label: "Gaa ind i grotten",
    targetSubregionId: "blacksmith_boar_cave_lvl1",
    instanceScope: "sourceObject",
    persistence: "whileRootRegionActive",
    requires: { questActive: "blacksmith_boar_hunt" },
  },

  enter_blacksmith_boar_cave_lvl2: {
    id: "enter_blacksmith_boar_cave_lvl2",
    type: "enterSubregion",
    label: "Gaa gennem revnen",
    targetSubregionId: "blacksmith_boar_cave_lvl2",
    instanceScope: "sourceObject",
    persistence: "whileRootRegionActive",
    requires: { questActive: "blacksmith_boar_hunt" },
  },

  enter_blacksmith_boar_cave_lvl3: {
    id: "enter_blacksmith_boar_cave_lvl3",
    type: "enterSubregion",
    label: "Gaa dybere",
    targetSubregionId: "blacksmith_boar_cave_lvl3",
    instanceScope: "sourceObject",
    persistence: "whileRootRegionActive",
    requires: { questActive: "blacksmith_boar_hunt" },
  },

  enter_cave01_lvl2: {
    id: "enter_cave01_lvl2",
    type: "enterSubregion",
    label: "Gaa dybere",
    targetSubregionId: "cave01_lvl2",
    instanceScope: "sourceObject",
    persistence: "whileRootRegionActive",
  },

  exit_subregion: {
    id: "exit_subregion",
    type: "exitSubregion",
    label: "Gaa tilbage",
  },

  inspect_inn_crack: {
    id: "inspect_inn_crack",
    type: "inspect",
    label: "Undersoeg revnen",
    text: "Revnen er frisk, og spind traekker ned i moerket under kroen.",
    requires: {
      questStepActive: { questId: "check_inn_infestation", stepId: "inspect_cellar" },
      notFlag: "inn_crack_found",
    },
    blockedBy: {
      flag: "inn_crack_destroyed",
    },
    setFlags: ["inn_crack_found"],
  },

  enter_inn_crack_cave: {
    id: "enter_inn_crack_cave",
    type: "enterSubregion",
    label: "Gaa ned gennem revnen",
    targetSubregionId: "inn_crack_cave",
    instanceScope: "sourceObject",
    persistence: "whileRootRegionActive",
    requires: {
      questStepActive: { questId: "check_inn_infestation", stepId: "enter_crack" },
      notFlag: "inn_crack_cave_cleared",
    },
    setFlags: ["inn_crack_entered"],
  },

  destroy_inn_crack: {
    id: "destroy_inn_crack",
    type: "destroy",
    label: "Oedelaeg revnen",
    prompt: "Oedelaeg revnen",
    requires: {
      questStepCompleted: { questId: "check_inn_infestation", stepId: "clear_crack_cave" },
      notFlag: "inn_crack_destroyed",
    },
    setFlags: ["inn_crack_destroyed"],
    removeTarget: true,
    questAdvance: {
      questId: "check_inn_infestation",
      stepId: "seal_crack",
    },
    once: true,
  },

  talk_test_wanderer: {
    id: "talk_test_wanderer",
    type: "talk",
    label: "Tal",
    text: "Den fremmede nikker og siger: 'Pas paa i moerket.'",
    once: true,
  },

  talk_lost_miner: {
    id: "talk_lost_miner",
    type: "talk",
    label: "Tal",
    text: "Minearbejderen holder lampen taet ind til kroppen. 'Der er noget laengere inde.'",
    once: false,
  },

  summon_wolf_boss: {
    id: "summon_wolf_boss",
    type: "summon",
    allowStub: true,
    label: "Tilkald",
    spawn: [{ monsterId: "wolf_boss", count: 1 }],
    setFlags: ["summoned.wolf_boss"],
    once: true,
  },

  start_lost_note_quest: {
    id: "start_lost_note_quest",
    type: "questStart",
    allowStub: true,
    label: "Tag imod opgave",
    questId: "lost_note",
    once: true,
  },

  deliver_ring_to_noble: {
    id: "deliver_ring_to_noble",
    type: "questAdvance",
    allowStub: true,
    label: "Aflever ring",
    questId: "noble_ring",
    stepId: "deliver_ring",
    costs: {
      items: { ring: 1 },
    },
    rewards: {
      items: { unsigned_document: 1 },
    },
    setFlags: ["noble.received_ring"],
    once: true,
  },
};
