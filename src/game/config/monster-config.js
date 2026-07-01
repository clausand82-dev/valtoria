export const DEFAULT_MONSTER_WORLD_ENERGY = {
  killLydra: 0,
  killNetdra: 0.05,
  eliteKillLydra: 0,
  eliteKillNetdra: 0.15,
  bossKillLydra: 0,
  bossKillNetdra: 1
};

export const DEFAULT_MONSTER_SEQUENCES_3X4 = [{ name: "idle", row: 0, frames: 4 }, { name: "walk", row: 1, frames: 4 }, { name: "attack", row: 2, frames: 4 }];

const monsterSprite = (sprite) => ({
  ...sprite,
  rows: sprite.rows ?? 3,
  cols: sprite.cols ?? 4,
  sequences: sprite.sequences ?? DEFAULT_MONSTER_SEQUENCES_3X4
});

export const BOSS_TINT = { color: "#d8313d", tintAlpha: 0.34 };

export const MONSTER_DEFS = {
  Fallen: {
    sprite: monsterSprite({
      id: "demon", url: "/assets/generated/mobs/demon_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.58, shadowW: 34, shadowH: 11, shadowAlpha: 0.38, yOffset: 46
    }),
    speciesId: "demon",
    tags: ["demon", "medium"],
    stats: { hp: 35, damage: 7, speed: 1.62, range: 0.52, radius: 0.26, color: "#b84d43", xp: 12 },
    lootTables: ["gold_low", "material_humanoid", "readable_fire_spellbooks", "material_gemstones", "equipment_attacker_rare"]
  },
  "Thorn Husk": {
    sprite: monsterSprite({
      id: "demon", url: "/assets/generated/mobs/demon_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.58, shadowW: 34, shadowH: 11, shadowAlpha: 0.38, yOffset: 46
    }),
    speciesId: "plant",
    tags: ["plant", "medium"],
    stats: { hp: 58, damage: 9, speed: 1.22, range: 0.58, radius: 0.34, color: "#667848", xp: 19 },
    lootTables: ["gold_low", "material_humanoid", "readable_fire_spellbooks", "material_gemstones", "equipment_attacker_rare"]
  },
  "Mire Brute": {
    sprite: monsterSprite({
      id: "demon", url: "/assets/generated/mobs/demon_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.58, shadowW: 34, shadowH: 11, shadowAlpha: 0.38, yOffset: 46
    }),
    speciesId: "plant",
    tags: ["plant", "large"],
    stats: { hp: 92, damage: 14, speed: 0.9, range: 0.66, radius: 0.43, color: "#706344", xp: 30 },
    lootTables: ["gold_low", "material_humanoid", "readable_fire_spellbooks", "material_gemstones", "equipment_attacker_rare"]
  },
  Hollow: {
    sprite: monsterSprite({
      id: "ghost", url: "/assets/generated/mobs/ghost_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.4, shadowW: 26, shadowH: 8, shadowAlpha: 0.22, yOffset: 38
    }),
    speciesId: "spirit",
    tags: ["spirit", "medium"],
    stats: { hp: 42, damage: 8, speed: 1.7, range: 0.52, radius: 0.27, color: "#798391", xp: 15 },
    lootTables: ["gold_medium", "material_humanoid", "readable_arcane_spellbooks", "material_magic", "equipment_defender_rare"]
  },
  "Shard Crawler": {
    sprite: monsterSprite({
      id: "ghost", url: "/assets/generated/mobs/ghost_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.4, shadowW: 26, shadowH: 8, shadowAlpha: 0.22, yOffset: 38
    }),
    speciesId: "spirit",
    tags: ["spirit", "medium"],
    stats: { hp: 66, damage: 12, speed: 1.36, range: 0.6, radius: 0.32, color: "#758996", xp: 24, iceResist: 25, fireResist: -15 },
    lootTables: ["gold_medium", "material_humanoid", "readable_arcane_spellbooks", "material_magic", "equipment_defender_rare"]
  },
  "Deep Guard": {
    sprite: monsterSprite({
      id: "skeleton", url: "/assets/generated/mobs/skeleton_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.44, shadowW: 34, shadowH: 11, shadowAlpha: 0.38, yOffset: 46
    }),
    speciesId: "undead",
    tags: ["undead", "large"],
    stats: { hp: 118, damage: 18, speed: 0.86, range: 0.76, radius: 0.45, color: "#9a8e80", xp: 39 },
    lootTables: ["gold_low", "material_humanoid", "readable_frost_spellbooks", "material_gemstones", "equipment_attacker_rare"]
  },
  Raider: {
    sprite: monsterSprite({
      id: "demon", url: "/assets/generated/mobs/demon_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.58, shadowW: 34, shadowH: 11, shadowAlpha: 0.38, yOffset: 46
    }),
    speciesId: "human",
    tags: ["humanoid", "human", "medium"],
    stats: { hp: 50, damage: 10, speed: 1.72, range: 0.58, radius: 0.28, color: "#a45f3f", xp: 17 },
    lootTables: ["gold_low", "material_humanoid", "readable_fire_spellbooks", "material_gemstones", "equipment_attacker_rare"]
  },
  Ashbound: {
    sprite: monsterSprite({
      id: "demon", url: "/assets/generated/mobs/demon_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.58, shadowW: 34, shadowH: 11, shadowAlpha: 0.38, yOffset: 46
    }),
    speciesId: "demon",
    tags: ["demon", "medium"],
    stats: { hp: 76, damage: 14, speed: 1.18, range: 0.64, radius: 0.35, color: "#925758", xp: 26 },
    lootTables: ["gold_low", "material_humanoid", "readable_fire_spellbooks", "material_gemstones", "equipment_attacker_rare"]
  },
  "Gate Warden": {
    sprite: monsterSprite({
      id: "skeleton", url: "/assets/generated/mobs/skeleton_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.44, shadowW: 34, shadowH: 11, shadowAlpha: 0.38, yOffset: 46
    }),
    speciesId: "undead",
    tags: ["undead", "large"],
    stats: { hp: 134, damage: 20, speed: 0.78, range: 0.82, radius: 0.48, color: "#aa8849", xp: 44 },
    lootTables: ["gold_low", "material_humanoid", "readable_frost_spellbooks", "material_gemstones", "equipment_attacker_rare"]
  },
  "Bone Warden": {
    sprite: monsterSprite({
      id: "skeleton", url: "/assets/generated/mobs/skeleton_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.44, shadowW: 34, shadowH: 11, shadowAlpha: 0.38, yOffset: 46
    }),
    speciesId: "undead",
    tags: ["undead", "medium"],
    stats: { hp: 80, damage: 18, speed: 1.38, range: 0.6, radius: 0.32, color: "#c8bda7", xp: 22 },
    lootTables: ["gold_low", "material_humanoid", "readable_frost_spellbooks", "material_gemstones", "equipment_attacker_rare"]
  },
  Knight: {
    sprite: monsterSprite({
      id: "knight", url: "/assets/generated/mobs/knight_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.44, shadowW: 34, shadowH: 11, shadowAlpha: 0.38, yOffset: 46
    }),
    speciesId: "human",
    tags: ["humanoid", "human", "medium"],
    stats: { hp: 96, damage: 17, speed: 1.18, range: 0.68, radius: 0.34, color: "#b8a06f", xp: 34, blockChance: 0.1 },
    popularity: { change: 0.9 },
    lootTables: ["gold_medium", "material_humanoid", "monster_profile_humanoid", "equipment_defender_rare", "monster_special_global"]
  },
  "Wild Boar": {
    sprite: monsterSprite({
      id: "wildboar", url: "/assets/generated/mobs/wildboar_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.42, shadowW: 32, shadowH: 10, shadowAlpha: 0.36, yOffset: 34
    }),
    speciesId: "boar",
    tags: ["beast", "wildlife", "medium"],
    stats: { hp: 76, damage: 15, speed: 1.82, range: 0.56, radius: 0.34, color: "#8a5e3d", xp: 28 },
    popularity: { change: -0.15 },
    lootTables: ["gold_low", "material_animal_medium"]
  },
  "Blacksmiths Bane": {
    sprite: monsterSprite({
      id: "wildboar", url: "/assets/generated/mobs/wildboar_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.42, shadowW: 32, shadowH: 10, shadowAlpha: 0.36, yOffset: 34
    }),
    speciesId: "boar",
    tags: ["beast", "wildlife", "large", "boss"],
    isBoss: true,
    allowElite: false,
    stats: { hp: 420, damage: 32, speed: 3.15, range: 0.72, radius: 0.5, color: "#b32626", xp: 180, critChance: 0.12, critDamage: 1.5 },
    popularity: { change: -0.5 },
    attackCooldown: { min: 0.55, max: 0.9 },
    leapAttack: { minRange: 1.35, maxRange: 3.8, speed: 11, cooldown: 2.2 },
    lootTables: ["gold_low", "material_animal_medium", "equipment_defender_rare", "material_gemstones"]
  },
  Bear: {
    sprite: monsterSprite({
      id: "bear", url: "/assets/generated/mobs/bear_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.62, shadowW: 44, shadowH: 14, shadowAlpha: 0.4, yOffset: 46
    }),
    speciesId: "bear",
    tags: ["beast", "wildlife", "large"],
    stats: { hp: 132, damage: 22, speed: 1.14, range: 0.72, radius: 0.45, color: "#8a6244", xp: 42, blockChance: 0.08 },
    popularity: { change: -0.2 },
    attackCooldown: { min: 1.05, max: 1.55 },
    lootTables: ["gold_low", "material_animal_medium"]
  },
  Icebear: {
    sprite: monsterSprite({
      id: "icebear", url: "/assets/generated/mobs/icebear_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.66, shadowW: 48, shadowH: 15, shadowAlpha: 0.42, yOffset: 48
    }),
    speciesId: "bear",
    tags: ["beast", "wildlife", "large"],
    stats: { hp: 158, damage: 24, speed: 1.08, range: 0.76, radius: 0.48, color: "#d8edf2", xp: 50, blockChance: 0.1, iceResist: 35, fireResist: -20 },
    popularity: { change: -0.15 },
    attackCooldown: { min: 1.1, max: 1.65 },
    lootTables: ["gold_low", "material_animal_medium"]
  },
  Lion: {
    sprite: monsterSprite({
      id: "lion", url: "/assets/generated/mobs/lion_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.56, shadowW: 42, shadowH: 13, shadowAlpha: 0.38, yOffset: 42
    }),
    speciesId: "lion",
    tags: ["beast", "wildlife", "medium"],
    stats: { hp: 96, damage: 20, speed: 2.04, range: 0.62, radius: 0.38, color: "#c6924d", xp: 38, critChance: 0.08, critDamage: 1.45 },
    popularity: { change: -0.22 },
    leapAttack: { minRange: 1.45, maxRange: 3.2, speed: 9, cooldown: 3.2 },
    lootTables: ["gold_low", "material_animal_medium"]
  },
  Rat: {
    sprite: monsterSprite({
      id: "rat", url: "/assets/generated/mobs/rat_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.24, shadowW: 16, shadowH: 5, shadowAlpha: 0.3, shadowY: 9, yOffset: 20
    }),
    speciesId: "rat",
    tags: ["beast", "wildlife", "small"],
    stats: { hp: 18, damage: 6, speed: 2.28, range: 0.34, radius: 0.18, color: "#7b6b5e", xp: 7 },
    popularity: { change: 0.08 },
    library: {
      title: "Skovrotte",
      text: "En aggressiv lille skabning, der ofte angriber fra krat, kaeldre og forladte bygninger.",
      strengths: ["Hurtig", "Angriber ofte i flok"],
      weaknesses: ["Lavt liv", "Saarbar mod ild"],
      habitatText: "Ses ofte i fugtige skove, kaeldre og ruiner."
    },
    lootTables: ["gold_low", "material_animal_small"]
  },
  SickRat: {
    sprite: monsterSprite({
      id: "sickrat", url: "/assets/generated/mobs/sickrat_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.26, shadowW: 18, shadowH: 6, shadowAlpha: 0.32, shadowY: 10, yOffset: 21
    }),
    speciesId: "rat",
    tags: ["beast", "wildlife", "small", "poison"],
    stats: { hp: 24, damage: 7, speed: 2.08, range: 0.36, radius: 0.19, color: "#7d8f55", xp: 10, poisonResist: 35 },
    popularity: { change: 0.18 },
    onHitStatus: { type: "dot", chance: 0.35, damage: 2, duration: 3, tick: 1, color: "#8fca4a", label: "Sickness" },
    lootTables: ["gold_low"]
  },
  Village01: {
    sprite: monsterSprite({
      id: "village01", url: "/assets/generated/mobs/village01_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.35, shadowW: 32, shadowH: 10, shadowAlpha: 0.34, yOffset: 44
    }),
    speciesId: "human",
    tags: ["humanoid", "human", "medium"],
    stats: { hp: 68, damage: 13, speed: 1.35, range: 0.58, radius: 0.3, color: "#927458", xp: 24 },
    popularity: { change: 0.35 },
    lootTables: ["gold_low", "monster_profile_humanoid", "monster_special_global", "material_gemstones"]
  },
  Village02: {
    sprite: monsterSprite({
      id: "village02", url: "/assets/generated/mobs/village02_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.35, shadowW: 32, shadowH: 10, shadowAlpha: 0.34, yOffset: 44
    }),
    speciesId: "human",
    tags: ["humanoid", "human", "medium"],
    stats: { hp: 74, damage: 14, speed: 1.28, range: 0.6, radius: 0.31, color: "#7b6b55", xp: 26 },
    popularity: { change: 0.4 },
    lootTables: ["gold_low", "monster_profile_humanoid", "monster_special_global", "material_gemstones"]
  },
  Peasant: {
    sprite: monsterSprite({
      id: "village02", url: "/assets/generated/mobs/village02_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.35, shadowW: 32, shadowH: 10, shadowAlpha: 0.34, yOffset: 44
    }),
    speciesId: "human",
    tags: ["humanoid", "human", "medium"],
    stats: { hp: 60, damage: 11, speed: 1.35, range: 0.58, radius: 0.3, color: "#8a7657", xp: 20 },
    popularity: { change: 0.3 },
    lootTables: ["gold_low", "monster_profile_humanoid", "monster_special_global"]
  },
  Village03: {
    sprite: monsterSprite({
      id: "village03", url: "/assets/generated/mobs/village03_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.35, shadowW: 32, shadowH: 10, shadowAlpha: 0.34, yOffset: 44
    }),
    speciesId: "human",
    tags: ["humanoid", "human", "medium"],
    stats: { hp: 70, damage: 13, speed: 1.32, range: 0.58, radius: 0.3, color: "#8d7258", xp: 25 },
    popularity: { change: 0.35 },
    lootTables: ["gold_low", "monster_profile_humanoid", "monster_special_global", "material_gemstones"]
  },
  Village04: {
    sprite: monsterSprite({
      id: "village04", url: "/assets/generated/mobs/village04_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.35, shadowW: 32, shadowH: 10, shadowAlpha: 0.34, yOffset: 44
    }),
    speciesId: "human",
    tags: ["humanoid", "human", "medium"],
    stats: { hp: 72, damage: 14, speed: 1.3, range: 0.6, radius: 0.31, color: "#806952", xp: 26 },
    popularity: { change: 0.38 },
    lootTables: ["gold_low", "monster_profile_humanoid", "monster_special_global", "material_gemstones"]
  },
  Village05: {
    sprite: monsterSprite({
      id: "village05", url: "/assets/generated/mobs/village05_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.35, shadowW: 32, shadowH: 10, shadowAlpha: 0.34, yOffset: 44
    }),
    speciesId: "human",
    tags: ["humanoid", "human", "medium"],
    stats: { hp: 69, damage: 13, speed: 1.36, range: 0.58, radius: 0.3, color: "#95785d", xp: 25 },
    popularity: { change: 0.36 },
    lootTables: ["gold_low", "monster_profile_humanoid", "monster_special_global", "material_gemstones"]
  },
  Village06: {
    sprite: monsterSprite({
      id: "village06", url: "/assets/generated/mobs/village06_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.35, shadowW: 32, shadowH: 10, shadowAlpha: 0.34, yOffset: 44
    }),
    speciesId: "human",
    tags: ["humanoid", "human", "medium"],
    stats: { hp: 75, damage: 14, speed: 1.26, range: 0.6, radius: 0.31, color: "#74654f", xp: 27 },
    popularity: { change: 0.4 },
    lootTables: ["gold_low", "monster_profile_humanoid", "monster_special_global", "material_gemstones"]
  },
  Wizard: {
    sprite: monsterSprite({
      id: "wizard", url: "/assets/generated/mobs/wizard_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.4, shadowW: 30, shadowH: 10, shadowAlpha: 0.32, yOffset: 46
    }),
    speciesId: "human",
    tags: ["humanoid", "human", "medium", "arcane"],
    stats: { hp: 64, damage: 16, speed: 1.12, range: 3.4, radius: 0.3, color: "#6f68c7", xp: 32, magic: 1.1 },
    spells: ["fireball", "energy_beam"],
    popularity: { change: 0.6 },
    lootTables: ["gold_low", "monster_profile_humanoid", "monster_special_global", "material_gemstones", "material_magic"]
  },
  "Spawn of Hydra": {
    sprite: monsterSprite({
      id: "hydra", url: "/assets/generated/mobs/hydra_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.62, shadowW: 42, shadowH: 14, shadowAlpha: 0.4, yOffset: 50
    }),
    speciesId: "hydra",
    tags: ["beast", "wildlife", "large", "poison"],
    stats: { hp: 118, damage: 17, speed: 1.08, range: 4.4, radius: 0.42, color: "#67b957", xp: 42, magic: 10, spells: ["poison_cloud"] },
    popularity: { change: 1.25 },
    lootTables: ["gold_low", "material_animal_medium", "monster_special_global", "material_gemstones", "material_magic"]
  },
  Hellhound: {
    sprite: monsterSprite({
      id: "hellhound", url: "/assets/generated/mobs/hellhound_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.52, shadowW: 34, shadowH: 11, shadowAlpha: 0.38, yOffset: 40
    }),
    speciesId: "demon",
    tags: ["demon", "beast", "medium"],
    stats: { hp: 94, damage: 18, speed: 2.45, range: 0.58, radius: 0.33, color: "#b9482f", xp: 34, blockChance: 0.18, fireResist: 30, iceResist: -20 },
    popularity: { change: 0.9 },
    lootTables: ["gold_low", "material_animal_medium", "material_gemstones", "material_magic"]
  },
  Flesheater: {
    sprite: monsterSprite({
      id: "flesheater", url: "/assets/generated/mobs/flesheater_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.56, shadowW: 40, shadowH: 13, shadowAlpha: 0.36, yOffset: 45
    }),
    speciesId: "plant",
    tags: ["plant", "large", "poison"],
    stats: { hp: 168, damage: 46, speed: 0.34, range: 1.35, radius: 0.44, color: "#6b9f42", xp: 46, poisonResist: 25 },
    popularity: { change: 0.75 },
    haveMinion: true,
    minions: {
      typeName: "Flesheater Young",
      cooldown: 7,
      maxActive: 8,
      spawnCount: [3, 5],
      scale: 1,
      statsMult: { hp: 1, damage: 1, speed: 1, xp: 1, magic: 1 }
    },
    lootTables: ["gold_low", "material_plant"]
  },
  "Flesheater Young": {
    sprite: monsterSprite({
      id: "flesheater_young", url: "/assets/generated/mobs/flesheater_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.24, shadowW: 18, shadowH: 6, shadowAlpha: 0.32, yOffset: 20
    }),
    speciesId: "plant",
    tags: ["plant", "small"],
    stats: { hp: 24, damage: 12, speed: 2.55, range: 0.35, radius: 0.18, color: "#8dba4d", xp: 6 },
    allowElite: false,
    lootTables: ["gold_low"]
  },
  "Spawn of Archnogrim": {
    sprite: monsterSprite({
      id: "archnogrim", url: "/assets/generated/mobs/archnogrim_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.5, shadowW: 36, shadowH: 12, shadowAlpha: 0.38, yOffset: 44
    }),
    speciesId: "spider",
    tags: ["spider", "beast", "wildlife", "large"],
    stats: { hp: 104, damage: 20, speed: 1.48, range: 0.68, radius: 0.36, color: "#7b607d", xp: 38 },
    popularity: { change: 1 },
    onHitStatus: { type: "root", chance: 0.25, minDuration: 0.5, maxDuration: 1.5, color: "#d7d4c7" },
    leapAttack: { minRange: 1.25, maxRange: 3, speed: 8.5, cooldown: 2.4 },
    lootTables: ["gold_medium", "monster_profile_humanoid", "equipment_attacker_rare", "equipment_defender_rare", "monster_special_global", "material_houses", "material_humanoid"]
  },
  "Infernus Minion": {
    sprite: monsterSprite({
      id: "infernus", url: "/assets/generated/mobs/infernus_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.54, shadowW: 36, shadowH: 12, shadowAlpha: 0.4, yOffset: 48
    }),
    speciesId: "demon",
    tags: ["demon", "medium", "fire"],
    stats: { hp: 90, damage: 16, speed: 1.16, range: 4.2, radius: 0.35, color: "#e56d35", xp: 36, magic: 9, spells: ["fireball"] },
    popularity: { change: 1.15 },
    onHitStatus: { type: "dot", chance: 1, damage: 5, duration: 3.5, tick: 1, color: "#ff7b38", label: "Burn" },
    lootTables: ["gold_medium", "equipment_attacker_rare", "readable_fire_spellbooks", "material_humanoid"]
  },
  Shadowdragon: {
    sprite: monsterSprite({
      id: "shadowdragon", url: "/assets/generated/mobs/shadowdragon_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.88, shadowW: 58, shadowH: 18, shadowAlpha: 0.44, yOffset: 62
    }),
    speciesId: "dragon",
    tags: ["dragon", "boss", "large"],
    stats: { hp: 520, damage: 36, speed: 1, range: 0.9, radius: 0.72, color: "#363046", xp: 0, critChance: 0.08, critDamage: 1.75 },
    allowElite: false,
    isBoss: true,
    noLoot: true,
    despawnOnDeath: true,
    specialSpawn: {
      chance: 0.018,
      salt: 1107,
      mapSize: { exclude: ["small"] },
      uniquePerRegion: true
    },
    popularity: { change: 0 },
    onHitStatus: { type: "dot", chance: 1, damage: 7, duration: 4, tick: 1, color: "#b53c5f", label: "Bleed" }
  },
  MountainTroll: {
    sprite: monsterSprite({
      id: "mountaintroll", url: "/assets/generated/mobs/mountaintroll_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.78, shadowW: 54, shadowH: 17, shadowAlpha: 0.42, yOffset: 64
    }),
    speciesId: "troll",
    tags: ["humanoid", "troll", "large"],
    stats: { hp: 320, damage: 42, speed: 0.62, range: 0.86, radius: 0.62, color: "#8d846f", xp: 72, blockChance: 0.12 },
    popularity: { change: 1.6 },
    attackCooldown: { min: 1.45, max: 2.1 },
    lootTables: ["gold_high", "material_humanoid", "monster_profile_humanoid", "monster_special_global"]
  },
  GiantTroll: {
    sprite: monsterSprite({
      id: "gianttroll", url: "/assets/generated/mobs/gianttroll_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.96, shadowW: 68, shadowH: 21, shadowAlpha: 0.46, yOffset: 78
    }),
    speciesId: "troll",
    tags: ["humanoid", "troll", "large"],
    stats: { hp: 540, damage: 46, speed: 0.5, range: 1.05, radius: 0.82, color: "#746b5c", xp: 110, blockChance: 0.16 },
    popularity: { change: 2.1 },
    attackCooldown: { min: 1.75, max: 2.5 },
    meleeAreaDamage: { radius: 3.2, damageMult: 0.72, visibleOnly: true, color: "#d8c091", shake: 10 },
    lootTables: ["gold_high", "material_humanoid", "monster_profile_humanoid", "monster_special_global"]
  },
  "Rune Shade": {
    sprite: monsterSprite({
      id: "ghost", url: "/assets/generated/mobs/ghost_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.4, shadowW: 26, shadowH: 8, shadowAlpha: 0.22, yOffset: 38
    }),
    speciesId: "spirit",
    tags: ["spirit", "medium"],
    stats: { hp: 78, damage: 16, speed: 1.48, range: 3.4, radius: 0.3, color: "#7468c7", xp: 31 },
    lootTables: ["gold_medium", "material_humanoid", "readable_arcane_spellbooks", "material_magic", "equipment_defender_rare"]
  },
  "Iron Revenant": {
    sprite: monsterSprite({
      id: "skeleton", url: "/assets/generated/mobs/skeleton_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.44, shadowW: 34, shadowH: 11, shadowAlpha: 0.38, yOffset: 46
    }),
    speciesId: "undead",
    tags: ["undead", "large"],
    stats: { hp: 150, damage: 22, speed: 0.72, range: 0.84, radius: 0.5, color: "#85888f", xp: 49 },
    lootTables: ["gold_low", "material_humanoid", "readable_frost_spellbooks", "material_gemstones", "equipment_attacker_rare"]
  },
  Demon: {
    sprite: monsterSprite({
      id: "demon", url: "/assets/generated/mobs/demon_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.58, shadowW: 34, shadowH: 11, shadowAlpha: 0.38, yOffset: 46
    }),
    speciesId: "demon",
    tags: ["demon", "medium"],
    stats: { hp: 86, damage: 16, speed: 1.16, range: 0.66, radius: 0.38, color: "#925758", xp: 30, magic: 7, critChance: 0.04, spells: ["fireball"] },
    popularity: { change: 1.7 },
    lootTables: ["gold_low", "material_humanoid", "readable_fire_spellbooks", "material_gemstones", "equipment_attacker_rare"]
  },
  Ghost: {
    sprite: monsterSprite({
      id: "ghost", url: "/assets/generated/mobs/ghost_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.4, shadowW: 26, shadowH: 8, shadowAlpha: 0.22, yOffset: 38
    }),
    speciesId: "spirit",
    tags: ["spirit", "medium"],
    stats: { hp: 66, damage: 15, speed: 1.5, range: 3.4, radius: 0.3, color: "#7468c7", xp: 32, magic: 9, dodgeChance: 0.08, spells: ["energy_beam"] },
    popularity: { change: 1.35 },
    lootTables: ["gold_medium", "material_humanoid", "readable_arcane_spellbooks", "material_magic", "equipment_defender_rare", "monster_profile_humanoid", "monster_special_global"]
  },
  Skeleton: {
    sprite: monsterSprite({
      id: "skeleton", url: "/assets/generated/mobs/skeleton_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.44, shadowW: 34, shadowH: 11, shadowAlpha: 0.38, yOffset: 46
    }),
    speciesId: "undead",
    tags: ["undead", "medium"],
    stats: { hp: 72, damage: 13, speed: 1.32, range: 0.62, radius: 0.32, color: "#c8bda7", xp: 26, magic: 5, blockChance: 0.06, spells: ["poison_cloud"] },
    popularity: { change: 1.2 },
    lootTables: ["gold_low", "material_humanoid", "readable_frost_spellbooks", "material_gemstones", "equipment_attacker_rare", "monster_profile_humanoid", "monster_special_global"]
  },
  Scorpion: {
    sprite: monsterSprite({
      id: "scorpion", url: "/assets/generated/mobs/scorpion_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.44, shadowW: 28, shadowH: 9, shadowAlpha: 0.34, yOffset: 38
    }),
    speciesId: "scorpion",
    tags: ["beast", "wildlife", "medium", "poison"],
    stats: { hp: 64, damage: 13, speed: 1.28, range: 0.62, radius: 0.32, color: "#b46b38", xp: 24 },
    lootTables: ["gold_low", "material_bone", "material_stone", "material_gemstones", "material_humanoid"]
  },
  Snake: {
    sprite: monsterSprite({
      id: "snake", url: "/assets/generated/mobs/snake_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.42, shadowW: 26, shadowH: 8, shadowAlpha: 0.3, yOffset: 37
    }),
    speciesId: "snake",
    tags: ["beast", "wildlife", "medium", "poison"],
    stats: { hp: 46, damage: 11, speed: 1.72, range: 0.58, radius: 0.26, color: "#6f9a45", xp: 19 },
    popularity: { change: -0.3 },
    lootTables: ["gold_low", "material_animal_medium"]
  },
  Spider: {
    sprite: monsterSprite({
      id: "spider", url: "/assets/generated/mobs/spider_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.43, shadowW: 30, shadowH: 10, shadowAlpha: 0.34, shadowY: 17, yOffset: 38
    }),
    speciesId: "spider",
    tags: ["spider", "beast", "wildlife", "medium"],
    stats: { hp: 58, damage: 12, speed: 1.5, range: 0.6, radius: 0.3, color: "#6d5b83", xp: 22, spells: ["web_slow"] },
    popularity: { change: 0.85 },
    library: {
      title: "Edderkop",
      text: "En taetbygget kryber, der bruger net og trange passager til at saenke sit bytte.",
      strengths: ["Kan saenke fjender", "Farlig i grupper"],
      weaknesses: ["Begraenset raekkevidde", "Saarbar naar den holdes i bevaegelse"],
      habitatText: "Traeffes i grotter, lader, ruiner og fugtige underjordiske steder."
    },
    lootTables: ["gold_low", "material_bone"]
  },
  MiniSpider: {
    sprite: monsterSprite({
      id: "minispider", url: "/assets/generated/mobs/spider_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.1, shadowW: 7, shadowH: 2, shadowAlpha: 0.34, shadowY: 4, yOffset: 9
    }),
    speciesId: "spider",
    tags: ["spider", "beast", "wildlife", "small"],
    stats: { hp: 12, damage: 24, speed: 2.5, range: 0.2, radius: 0.3, color: "#6d5b83", xp: 10 },
    allowElite: false,
    lootTables: ["gold_low", "material_bone"]
  },
  MediumSpider: {
    sprite: monsterSprite({
      id: "mediumspider", url: "/assets/generated/mobs/spider_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.2, shadowW: 14, shadowH: 5, shadowAlpha: 0.34, shadowY: 8, yOffset: 18
    }),
    speciesId: "spider",
    tags: ["spider", "beast", "wildlife", "medium"],
    stats: { hp: 36, damage: 18, speed: 2, range: 0.4, radius: 0.3, color: "#6d5b83", xp: 16, spells: ["web_slow"] },
    lootTables: ["gold_low", "material_bone"]
  },
  LargeSpider: {
    sprite: monsterSprite({
      id: "largespider", url: "/assets/generated/mobs/spider_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.55, shadowW: 38, shadowH: 13, shadowAlpha: 0.34, shadowY: 22, yOffset: 49
    }),
    speciesId: "spider",
    tags: ["spider", "beast", "wildlife", "large"],
    stats: { hp: 72, damage: 24, speed: 1.5, range: 0.6, radius: 0.3, color: "#6d5b83", xp: 32, spells: ["web_slow"] },
    lootTables: ["gold_low", "material_bone"]
  },
  MotherSpider: {
    sprite: monsterSprite({
      id: "motherspider", url: "/assets/generated/mobs/spider_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.75, shadowW: 38, shadowH: 13, shadowAlpha: 0.34, shadowY: 22, yOffset: 49
    }),
    speciesId: "spider",
    tags: ["spider", "beast", "wildlife", "boss", "large"],
    stats: { hp: 220, damage: 36, speed: 1.2, range: 0.8, radius: 0.4, color: "#6d5b83", xp: 48, spells: ["web_slow", "poison_cloud"] },
    allowElite: false,
    isBoss: true,
    haveMinion: true,
    minions: {
      cooldown: 8,
      maxActive: 4,
      spawnCount: 2,
      scale: 0.42,
      statsMult: { hp: 0.22, damage: 0.28, speed: 1.22, xp: 0.08, magic: 0.25 }
    },
    lootTables: ["gold_boss", "material_bone", "material_gemstones", "material_humanoid", "monster_special_global"]
  },
  WolfCub: {
    sprite: monsterSprite({
      id: "wolf_cub", url: "/assets/generated/mobs/wolf_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.3, shadowW: 32, shadowH: 10, shadowAlpha: 0.36, yOffset: 39
    }),
    speciesId: "wolf",
    tags: ["beast", "wildlife", "small"],
    stats: { hp: 52, damage: 14, speed: 2, range: 0.12, radius: 0.34, color: "#8b8f93", xp: 28 },
    popularity: { change: -0.35 },
    library: {
      title: "Ulv",
      text: "En aarvaagen jaeger, der presser byttedyr med hurtige udfald og vedholdende forfoelgelse.",
      strengths: ["Hurtig", "God til at lukke afstand"],
      weaknesses: ["Middel modstandskraft", "Let at holde paa afstand med kontrol"],
      habitatText: "Findes i skovkanter, bakker og urolige landsbyomraader."
    },
    lootTables: ["gold_low", "material_bone", "material_animal_small", "special_wolffenris_treasure"]
  },
  Wolf: {
    sprite: monsterSprite({
      id: "wolf", url: "/assets/generated/mobs/wolf_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.48, shadowW: 32, shadowH: 10, shadowAlpha: 0.36, yOffset: 39
    }),
    speciesId: "wolf",
    tags: ["beast", "wildlife", "medium"],
    stats: { hp: 72, damage: 14, speed: 1.86, range: 0.64, radius: 0.34, color: "#8b8f93", xp: 28 },
    popularity: { change: -0.35 },
    lootTables: ["gold_low", "material_bone", "material_animal_medium", "special_wolffenris_treasure"]
  },
  WolfFenris: {
    sprite: monsterSprite({
      id: "wolf_fenris", url: "/assets/generated/mobs/wolf_animated_sheet.png",
      rows: 3, cols: 4, sequences: DEFAULT_MONSTER_SEQUENCES_3X4,
      scale: 0.95, shadowW: 32, shadowH: 10, shadowAlpha: 0.36, yOffset: 39
    }),
    speciesId: "wolf",
    tags: ["beast", "wildlife", "boss", "large"],
    stats: { hp: 220, damage: 30, speed: 1.25, range: 0.64, radius: 0.34, color: "#8b8f93", xp: 28 },
    popularity: { change: -0.35 },
    allowElite: false,
    isBoss: true,
    haveMinion: true,
    minions: {
      cooldown: 8,
      maxActive: 4,
      spawnCount: 2,
      scale: 0.42,
      statsMult: { hp: 0.22, damage: 0.28, speed: 1.22, xp: 0.08, magic: 0.25 }
    },
    lootTables: ["gold_boss", "special_wolffenris_treasure", "material_animal_medium", "material_humanoid"]
  }
};

const MONSTER_CATALOG_IDS = {
  Fallen: "fallen", "Thorn Husk": "thorn_husk", "Mire Brute": "mire_brute",
  Hollow: "hollow", "Shard Crawler": "shard_crawler", "Deep Guard": "deep_guard",
  Raider: "raider", Ashbound: "ashbound", "Gate Warden": "gate_warden",
  "Bone Warden": "bone_warden", Knight: "knight", "Wild Boar": "wild_boar",
  "Blacksmiths Bane": "blacksmiths_bane", Bear: "bear", Icebear: "icebear",
  Lion: "lion", Rat: "rat", SickRat: "sick_rat", Village01: "village_01",
  Village02: "village_02", Peasant: "peasant", Village03: "village_03",
  Village04: "village_04", Village05: "village_05", Village06: "village_06",
  Wizard: "wizard", "Spawn of Hydra": "spawn_of_hydra", Hellhound: "hellhound",
  Flesheater: "flesheater", "Flesheater Young": "flesheater_young",
  "Spawn of Archnogrim": "spawn_of_archnogrim", "Infernus Minion": "infernus_minion",
  Shadowdragon: "shadowdragon", MountainTroll: "mountain_troll", GiantTroll: "giant_troll",
  "Rune Shade": "rune_shade", "Iron Revenant": "iron_revenant", Demon: "demon",
  Ghost: "ghost", Skeleton: "skeleton", Scorpion: "scorpion", Snake: "snake",
  Spider: "spider", MiniSpider: "mini_spider", MediumSpider: "medium_spider",
  LargeSpider: "large_spider", MotherSpider: "mother_spider", WolfCub: "wolf_cub",
  Wolf: "wolf", WolfFenris: "wolf_fenris",
};

for (const [typeName, def] of Object.entries(MONSTER_DEFS)) {
  def.catalogId = MONSTER_CATALOG_IDS[typeName];
}

const dedupeMonsterSprites = (monsters) => {
  const sprites = new Map();
  for (const monster of monsters) {
    const sprite = monster.sprite;
    if (sprite?.id && !sprites.has(sprite.id)) sprites.set(sprite.id, sprite);
  }
  return [...sprites.values()];
};

export const MONSTER_SHEETS = dedupeMonsterSprites(Object.values(MONSTER_DEFS));

function inferMonsterFaction(type, def = {}) {
  if (def.factionId) return def.factionId;
  const speciesId = String(def.speciesId ?? "").trim();
  if ((def.tags ?? []).includes("wildlife")) return "wilds";
  if (["spider", "rat", "wolf", "boar"].includes(speciesId)) return "wilds";
  if (["demon", "undead"].includes(speciesId)) return "corrupted_wilds";
  if (speciesId === "troll") return "tornvalhed_trolls";
  return undefined;
}

const DEFAULT_MINION_CONFIG = {
  cooldown: 8,
  maxActive: 3,
  spawnCount: 1,
  scale: 0.45,
  statsMult: { hp: 0.25, damage: 0.3, speed: 1.1, xp: 0.05, magic: 0.25 },
};

function normalizedMinionConfig(def) {
  if (!def.haveMinion && !def.minions) return false;
  const custom = typeof def.minions === "object" ? def.minions : {};
  return {
    ...DEFAULT_MINION_CONFIG,
    ...custom,
    statsMult: {
      ...DEFAULT_MINION_CONFIG.statsMult,
      ...(custom.statsMult ?? {}),
    },
  };
}

export const MONSTER_STATS = Object.fromEntries(
  Object.entries(MONSTER_DEFS).map(([type, def]) => {
    const isBoss = Boolean(def.isBoss);
    const killLydra = def.killLydra ?? (isBoss ? DEFAULT_MONSTER_WORLD_ENERGY.bossKillLydra : DEFAULT_MONSTER_WORLD_ENERGY.killLydra);
    const killNetdra = def.killNetdra ?? (isBoss ? DEFAULT_MONSTER_WORLD_ENERGY.bossKillNetdra : DEFAULT_MONSTER_WORLD_ENERGY.killNetdra);
    return [
      type,
      {
        ...def.stats,
        killLydra: Math.max(0, Number(killLydra) || 0),
        killNetdra: Math.max(0, Number(killNetdra) || 0),
        eliteKillLydra: Math.max(0, Number(def.eliteKillLydra ?? DEFAULT_MONSTER_WORLD_ENERGY.eliteKillLydra) || 0),
        eliteKillNetdra: Math.max(0, Number(def.eliteKillNetdra ?? DEFAULT_MONSTER_WORLD_ENERGY.eliteKillNetdra) || 0),
        speciesId: def.speciesId,
        factionId: inferMonsterFaction(type, def),
        tags: Array.isArray(def.tags) ? [...def.tags] : [],
        allowElite: def.allowElite !== false,
        isBoss,
        noLoot: Boolean(def.noLoot),
        despawnOnDeath: Boolean(def.despawnOnDeath),
        specialSpawn: def.specialSpawn ? { ...def.specialSpawn } : null,
        haveMinion: Boolean(def.haveMinion || def.minions),
        minions: normalizedMinionConfig(def),
        onHitStatus: def.onHitStatus ? { ...def.onHitStatus } : null,
        leapAttack: def.leapAttack ? { ...def.leapAttack } : null,
        attackCooldown: def.attackCooldown ? { ...def.attackCooldown } : null,
        meleeAreaDamage: def.meleeAreaDamage ? { ...def.meleeAreaDamage } : null,
        shadow: def.shadow ? { ...def.shadow } : def.stats?.shadow ? { ...def.stats.shadow } : null,
        sprite: def.sprite?.id,
        spriteUrl: def.sprite?.url ?? null,
        lootTables: Array.isArray(def.lootTables) ? [...def.lootTables] : [],
      },
    ];
  })
);

export const MONSTER_POPULARITY_RULES = Object.fromEntries(
  Object.entries(MONSTER_DEFS)
    .filter(([, def]) => def.popularity)
    .map(([type, def]) => [type, def.popularity])
);

export function monsterSpriteId(typeName) {
  if (MONSTER_DEFS[typeName]?.sprite?.id) return MONSTER_DEFS[typeName].sprite.id;
  if (typeName?.includes("Bone") || typeName?.includes("Warden")) return "skeleton";
  if (typeName?.includes("Shade")) return "ghost";
  return "demon";
}
