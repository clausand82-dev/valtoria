// Runtime sound definitions. Callers use these stable ids, never asset paths.
export const SOUND_DEFS = Object.freeze({
  //ui_click: { files: ["/audio/sfx/ui/ui_click_01.ogg"], bus: "ui", volume: 0.7, maxVoices: 2 },
  ui_open: { files: ["/audio/sfx/ui/ui_open_01.ogg"], bus: "ui", volume: 0.7, maxVoices: 1 },
  backpack_open: { files: ["/audio/sfx/ui/backpack_open_01.ogg"], bus: "ui", volume: 0.75, maxVoices: 1 },
  map_fold: { files: ["/audio/sfx/ui/map_fold_01.ogg"], bus: "ui", volume: 0.75, maxVoices: 1 },
  item_pickup: { files: ["/audio/sfx/items/item_pickup_01.ogg"], bus: "sfx", volume: 0.8, maxVoices: 3 },
  sword_swing: { files: ["/audio/sfx/combat/sword_swing_01.ogg"], bus: "sfx", volume: 0.72, randomPitch: 0.04, maxVoices: 2 },
  sword_hit_flesh: { files: ["/audio/sfx/combat/sword_hit_flesh_01.ogg"], bus: "sfx", volume: 0.82, randomPitch: 0.04, maxVoices: 3 },
  sword_hit_wood: { files: ["/audio/sfx/combat/sword_hit_wood_01.ogg"], bus: "sfx", volume: 0.82, randomPitch: 0.04, maxVoices: 3 },
  sword_hit_stone: { files: ["/audio/sfx/combat/sword_hit_stone_01.ogg"], bus: "sfx", volume: 0.82, randomPitch: 0.04, maxVoices: 3 },
  player_hurt: { files: ["/audio/sfx/combat/player_hurt_01.ogg"], bus: "sfx", volume: 0.82, maxVoices: 2 },
  ember_hit: { files: ["/audio/sfx/spells/ember_hit_01.ogg"], bus: "sfx", volume: 0.78, maxVoices: 3 },
  fireball_fall: { files: ["/audio/sfx/spells/fireball_fall_01.ogg", "/audio/sfx/spells/fireball_fall_02.ogg"], bus: "sfx", volume: 0.72, maxVoices: 8 },
  fireball_hit: { files: ["/audio/sfx/spells/fireball_hit_01.ogg", "/audio/sfx/spells/fireball_hit_02.ogg", "/audio/sfx/spells/fireball_hit_03.ogg"], bus: "sfx", volume: 0.84, maxVoices: 8 },
  fireball_hit_stone: { files: ["/audio/sfx/spells/fireball_hit_stone_01.ogg"], bus: "sfx", volume: 0.84, maxVoices: 8 },
  fireball_hit_wood: { files: ["/audio/sfx/spells/fireball_hit_wood_01.ogg"], bus: "sfx", volume: 0.84, maxVoices: 8 },
  ice_shard_fall: { files: ["/audio/sfx/spells/ice_shard_fall_01.ogg", "/audio/sfx/spells/ice_shard_fall_02.ogg"], bus: "sfx", volume: 0.7, maxVoices: 10 },
  ice_shard_hit: { files: ["/audio/sfx/spells/ice_shard_hit_01.ogg", "/audio/sfx/spells/ice_shard_hit_02.ogg"], bus: "sfx", volume: 0.8, maxVoices: 10 },
  footstep_walk_grass: { files: ["/audio/sfx/footsteps/footstep_walk_grass_01.ogg"], bus: "sfx", volume: 0.42, maxVoices: 1 },
  footstep_walk_wood: { files: ["/audio/sfx/footsteps/footstep_walk_wood_01.ogg"], bus: "sfx", volume: 0.42, maxVoices: 1 },
  footstep_walk_stone: { files: ["/audio/sfx/footsteps/footstep_walk_stone_01.ogg"], bus: "sfx", volume: 0.42, maxVoices: 1 },
  footstep_run_grass: { files: ["/audio/sfx/footsteps/footstep_run_grass_01.ogg"], bus: "sfx", volume: 0.46, maxVoices: 1 },
  footstep_run_wood: { files: ["/audio/sfx/footsteps/footstep_run_wood_01.ogg"], bus: "sfx", volume: 0.46, maxVoices: 1 },
  footstep_run_stone: { files: ["/audio/sfx/footsteps/footstep_run_stone_01.ogg", "/audio/sfx/footsteps/footstep_run_stone_02.ogg"], bus: "sfx", volume: 0.46, maxVoices: 1 },
  stone_rumble: { files: ["/audio/sfx/world/stone_rumble_01.ogg"], bus: "sfx", volume: 0.8, maxVoices: 2 },
  tree_rumble: { files: ["/audio/sfx/world/tree_rumble_01.ogg", "/audio/sfx/world/tree_rumble_02.ogg", "/audio/sfx/world/tree_rumble_03.ogg", "/audio/sfx/world/tree_rumble_04.ogg"], bus: "sfx", volume: 0.78, maxVoices: 2 },
  building_repair: { files: ["/audio/sfx/city/building_repair_01.ogg"], bus: "ui", volume: 0.8, maxVoices: 2 },
  building_upgrade: { files: ["/audio/sfx/city/building_upgrade_01.ogg"], bus: "ui", volume: 0.82, maxVoices: 2 },
  wolf_aggro: { files: [
    "/audio/sfx/monsters/wolf_aggro_01.ogg",
    "/audio/sfx/monsters/wolf_aggro_02.ogg",
    "/audio/sfx/monsters/wolf_aggro_03.ogg",
    "/audio/sfx/monsters/wolf_aggro_04.ogg",
  ], bus: "sfx", volume: 0.72, maxVoices: 2 },
  wolf_death: { files: [
    "/audio/sfx/monsters/wolf_death_01.ogg",
    "/audio/sfx/monsters/wolf_death_02.ogg",
    "/audio/sfx/monsters/wolf_death_03.ogg",
    "/audio/sfx/monsters/wolf_death_04.ogg",
  ], bus: "sfx", volume: 0.8, maxVoices: 2, durationLimitMs: 900, fadeOutMs: 220 },
  forest_ambience: { files: ["/audio/ambience/forest_ambience_loop_01.mp3"], bus: "ambience", volume: 0.55, loop: true },
});

export const MONSTER_AUDIO_PROFILES = Object.freeze({
  wolf: Object.freeze({ aggro: "wolf_aggro", death: "wolf_death" }),
});

export const SPELL_AUDIO_PROFILES = Object.freeze({
  ember_spark: Object.freeze({ impact: "ember_hit" }),
  fireball: Object.freeze({ launch: "fireball_fall", impact: "fireball_hit", impactByMaterial: { stone: "fireball_hit_stone", wood: "fireball_hit_wood" } }),
  firerain: Object.freeze({ launch: "fireball_fall", impact: "fireball_hit", impactByMaterial: { stone: "fireball_hit_stone", wood: "fireball_hit_wood" } }),
  blizzard: Object.freeze({ launch: "ice_shard_fall", impact: "ice_shard_hit" }),
});
