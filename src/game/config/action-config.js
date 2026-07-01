export const ACTION_CONFIG = {
  inspect_random_ruin: {
    id: "inspect_random_ruin",
    type: "inspect",
    label: "Inspect ruin",
    text: "The ruin is ancient and covered in strange markings.",
    i18n: { da: { label: "Undersøg ruin", text: "Ruinen er ældgammel og dækket af mærkelige tegn." } },
    once: false,
  },

  read_demon_notes: {
    id: "read_demon_notes",
    type: "read",
    label: "Read notes",
    i18n: { da: { label: "Læs noter" } },
    readableId: "demon_notes_compiled",
    once: true,
    setFlags: ["read.demon_notes_compiled"],
  },

  collect_sealed_note: {
    id: "collect_sealed_note",
    type: "collect",
    label: "Take note",
    i18n: { da: { label: "Tag note" } },
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
    label: "Pick flower",
    i18n: { da: { label: "Pluk blomst" } },
    rewards: {
      resources: { rare_pink_flower: 1 },
    },
    removeTarget: true,
    once: true,
  },

  clear_old_barrier: {
    id: "clear_old_barrier",
    type: "destroy",
    label: "Clear barrier",
    i18n: { da: { label: "Ryd barriere" } },
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
    label: "Open",
    i18n: { da: { label: "Åbn" } },
    setFlags: ["chest.weathered.opened"],
    once: true,
  },

  open_map_chest: {
    id: "open_map_chest",
    type: "open",
    label: "Open chest",
    i18n: { da: { label: "Åbn kiste" } },
    prompt: "open chest",
    chestLoot: true,
  },

  activate_old_rune: {
    id: "activate_old_rune",
    type: "activate",
    label: "Activate",
    text: "The rune hums briefly, then fades.",
    i18n: { da: { label: "Aktivér", text: "Runen summer kort og falmer derefter." } },
    addCounters: { "rune.old.activations": 1 },
    setFlags: ["rune.old.activated"],
    once: true,
  },

  reveal_small_cache: {
    id: "reveal_small_cache",
    type: "reveal",
    label: "Inspect",
    text: "You find signs of a hidden cache.",
    i18n: { da: { label: "Undersøg", text: "Du finder spor efter et skjult depot." } },
    setFlags: ["cache.small.revealed"],
    once: true,
  },

  cleanse_minor_shrine: {
    id: "cleanse_minor_shrine",
    type: "cleanse",
    label: "Cleanse",
    i18n: { da: { label: "Rens" } },
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
    label: "Repair",
    i18n: { da: { label: "Reparér" } },
    costs: {
      resources: { wood_piece: 2, rock_piece: 1 },
    },
    setFlags: ["planks.old.repaired"],
    once: true,
  },

  repair_village_house: {
    id: "repair_village_house",
    type: "repair",
    label: "Repair house",
    i18n: { da: { label: "Reparér hus" } },
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
    label: "Repair furnace",
    i18n: { da: { label: "Reparér furnace" } },
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
    label: "Repair anvil",
    i18n: { da: { label: "Reparér anvil" } },
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
    label: "Repair bellows",
    i18n: { da: { label: "Reparér blæsebælg" } },
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
    label: "Inspect",
    text: "The woman is dead. The deep bite marks and shattered bones point not to spiders or wolves, but to an enormous boar.",
    i18n: { da: { label: "Undersøg", text: "Kvinden er død. De dybe bidemærker og ødelagte knogler peger ikke på edderkopper eller ulve, men på et enormt vildsvin." } },
    requires: { questActive: "blacksmith_find_wife" },
    once: true,
  },

  bury_village_dead: {
    id: "bury_village_dead",
    type: "cleanse",
    label: "Bury villager",
    i18n: { da: { label: "Begrav landsbyboer" } },
    prompt: "Begrav den doede landsbyboer",
    requires: { questActive: "mayor_repair_village_houses" },    
    replaceFoliageWith: "object/object_gravestone.png",
    replaceFoliageSize: 0.7,
    once: true,
  },

  offer_flower_to_shrine: {
    id: "offer_flower_to_shrine",
    type: "offer",
    label: "Make offering",
    i18n: { da: { label: "Giv offer" } },
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
    label: "Enter",
    i18n: { da: { label: "Gå ind" } },
    targetSubregionId: "cave01_lvl1",
    instanceScope: "sourceObject",
    persistence: "whileRootRegionActive",
  },

  enter_blacksmith_boar_cave_lvl1: {
    id: "enter_blacksmith_boar_cave_lvl1",
    type: "enterSubregion",
    label: "Enter cave",
    i18n: { da: { label: "Gå ind i grotten" } },
    targetSubregionId: "blacksmith_boar_cave_lvl1",
    instanceScope: "sourceObject",
    persistence: "whileRootRegionActive",
    requires: { questActive: "blacksmith_boar_hunt" },
  },

  enter_blacksmith_boar_cave_lvl2: {
    id: "enter_blacksmith_boar_cave_lvl2",
    type: "enterSubregion",
    label: "Go through the crack",
    i18n: { da: { label: "Gå gennem revnen" } },
    targetSubregionId: "blacksmith_boar_cave_lvl2",
    instanceScope: "sourceObject",
    persistence: "whileRootRegionActive",
    requires: { questActive: "blacksmith_boar_hunt" },
  },

  enter_blacksmith_boar_cave_lvl3: {
    id: "enter_blacksmith_boar_cave_lvl3",
    type: "enterSubregion",
    label: "Go deeper",
    i18n: { da: { label: "Gå dybere" } },
    targetSubregionId: "blacksmith_boar_cave_lvl3",
    instanceScope: "sourceObject",
    persistence: "whileRootRegionActive",
    requires: { questActive: "blacksmith_boar_hunt" },
  },

  enter_cave01_lvl2: {
    id: "enter_cave01_lvl2",
    type: "enterSubregion",
    label: "Go deeper",
    i18n: { da: { label: "Gå dybere" } },
    targetSubregionId: "cave01_lvl2",
    instanceScope: "sourceObject",
    persistence: "whileRootRegionActive",
  },

  enter_the_mine_lvl1: {
    id: "enter_the_mine_lvl1",
    type: "enterSubregion",
    label: "Enter the mine",
    i18n: { da: { label: "Gå ned i minen" } },
    targetSubregionId: "the_mine_lvl1",
    instanceScope: "sourceObject",
    persistence: "whileRootRegionActive",
    requires: {
      any: [
        { questActive: "miri_find_father" },
        { flag: "the_mine_unlocked" },
        { questCompleted: "miri_find_father" },
        { questActive: "rusk_gold_nuggets" },
        { questCompleted: "rusk_gold_nuggets" },
        { questActive: "veldor_clear_the_mine" },
        { questCompleted: "veldor_clear_the_mine" },
      ],
    },
    setFlags: ["the_mine_unlocked"],
  },

  enter_the_mine_lvl2: {
    id: "enter_the_mine_lvl2",
    type: "enterSubregion",
    label: "Go deeper",
    i18n: { da: { label: "Gå dybere" } },
    targetSubregionId: "the_mine_lvl2",
    instanceScope: "sourceObject",
    persistence: "whileRootRegionActive",
  },

  enter_the_mine_lvl3: {
    id: "enter_the_mine_lvl3",
    type: "enterSubregion",
    label: "Go deeper",
    i18n: { da: { label: "Gå dybere" } },
    targetSubregionId: "the_mine_lvl3",
    instanceScope: "sourceObject",
    persistence: "whileRootRegionActive",
  },

  enter_forest_mine_lvl1: {
    id: "enter_forest_mine_lvl1",
    type: "enterSubregion",
    label: "Enter the forest mine",
    i18n: { da: { label: "Gå ind i skovminen" } },
    targetSubregionId: "forest_mine_lvl1",
    instanceScope: "sourceObject",
    persistence: "whileRootRegionActive",
    requires: { questActive: "find_veldors_wife" },
  },

  enter_forest_mine_lvl2: {
    id: "enter_forest_mine_lvl2",
    type: "enterSubregion",
    label: "Go deeper",
    i18n: { da: { label: "Gå dybere" } },
    targetSubregionId: "forest_mine_lvl2",
    instanceScope: "sourceObject",
    persistence: "whileRootRegionActive",
  },

  enter_forest_mine_lvl3: {
    id: "enter_forest_mine_lvl3",
    type: "enterSubregion",
    label: "Go deeper",
    i18n: { da: { label: "Gå dybere" } },
    targetSubregionId: "forest_mine_lvl3",
    instanceScope: "sourceObject",
    persistence: "whileRootRegionActive",
  },

  inspect_veldors_wife_corpse: {
    id: "inspect_veldors_wife_corpse",
    type: "inspect",
    label: "Inspect the body",
    text: "The dead woman wears Veldor's seal on a broken chain. The letter supplied the name, and here lies the truth: Veldor's wife was abandoned in the mine.",
    i18n: { da: { label: "Undersøg liget", text: "Den døde kvinde bærer Veldors segl i en bristet kæde. Brevet gav navnet, og her ligger sandheden: Veldors kone blev efterladt i minen." } },
    requires: { questActive: "find_veldors_wife", notFlag: "veldors_wife_found" },
    setFlags: ["veldors_wife_found"],
    removeTarget: true,
    once: true,
  },

  exit_subregion: {
    id: "exit_subregion",
    type: "exitSubregion",
    label: "Go back",
  i18n: { da: { label: "Gå tilbage" } },
  i18n: { da: { label: "Gå tilbage" } },
  i18n: { da: { label: "Gå tilbage" } },
  },

  inspect_inn_crack: {
    id: "inspect_inn_crack",
    type: "inspect",
    label: "Inspect the crack",
    text: "The crack is fresh, and webs lead down into the darkness beneath the inn.",
    i18n: { da: { label: "Undersøg revnen", text: "Revnen er frisk, og spind trækker ned i mørket under kroen." } },
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
    label: "Climb down through the crack",
    i18n: { da: { label: "Gå ned gennem revnen" } },
    targetSubregionId: "inn_crack_cave",
    instanceScope: "sourceObject",
    persistence: "whileRootRegionActive",
    requires: {
      any: [
        { questStepActive: { questId: "check_inn_infestation", stepId: "enter_crack" } },
        { questStepActive: { questId: "check_inn_infestation", stepId: "clear_crack_cave" } },
      ],
      notFlag: "inn_crack_cave_cleared",
    },
    setFlags: ["inn_crack_entered"],
  },

  destroy_inn_crack: {
    id: "destroy_inn_crack",
    type: "destroy",
    label: "Destroy the crack",
    i18n: { da: { label: "Ødelæg revnen" } },
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
    label: "Talk",
    text: "The stranger nods and says: 'Take care in the dark.'",
    i18n: { da: { label: "Tal", text: "Den fremmede nikker og siger: 'Pas på i mørket.'" } },
    once: true,
  },

  talk_lost_miner: {
    id: "talk_lost_miner",
    type: "talk",
    label: "Talk",
    text: "The miner holds the lamp close. 'There is something farther inside.'",
    i18n: { da: { label: "Tal", text: "Minearbejderen holder lampen tæt ind til kroppen. 'Der er noget længere inde.'" } },
    once: false,
  },

  summon_wolf_boss: {
    id: "summon_wolf_boss",
    type: "summon",
    allowStub: true,
    label: "Summon",
    i18n: { da: { label: "Tilkald" } },
    spawn: [{ monsterId: "wolf_boss", count: 1 }],
    setFlags: ["summoned.wolf_boss"],
    once: true,
  },

  start_lost_note_quest: {
    id: "start_lost_note_quest",
    type: "questStart",
    allowStub: true,
    label: "Accept quest",
    i18n: { da: { label: "Tag imod opgave" } },
    questId: "lost_note",
    once: true,
  },

  deliver_ring_to_noble: {
    id: "deliver_ring_to_noble",
    type: "questAdvance",
    allowStub: true,
    label: "Deliver ring",
    i18n: { da: { label: "Aflever ring" } },
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
