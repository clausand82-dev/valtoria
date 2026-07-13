/*
City mob battle map profiles.

These profiles are used only when a mob group on the city map is attacked.
They intentionally do not define mapSize; city mob level rules in
city-mobs-attack-config.js still decide the battle map size.

Asset fields use the same formats as map-region-config.js:
- tileset
- foliageSet / foliageSets
- objects
- decay
- weights
- antiDrops
- audio (the same musicProfile/ambience structure as map-region-config.js)

Target fields:
- buildingIds: exact occupiedBuildingId matches (highest priority)
- areaIds: exact occupiedAreaId matches
- spawnZoneIds: original outer/spawn areaId fallback

Entry conditions inside array-form tileset/foliageSet/objects/decay/mobs use the
normal map-region resolver, including requires/conditions/blockedBy and direct
shorthand tags. Conditional whole-field { value, variants } configs are passed
through for visual asset fields; city battle mobs/spawnCounts are builder-owned.
Top-level profile conditions are not used when selecting a battle profile.
*/

export const CITY_MOB_BATTLE_PROFILES = [
  {
    id: "city-nw-ruins",
    label: "City NW Ruins",
    audio: { musicProfile: "ruined_outpost" },
    spawnZoneIds: ["NW_SPAWN_BORDER", "NW_SPAWN_CORNER", "NW_SPAWN_BRIDGE", "NW_SPAWN_CLOSE"],
    tileset: [
      { fileName: "tileset/tileset_debris.png" },
      { fileName: "tileset/tileset_rock.png" },
    ],
    foliageSet: [
      { fileName: "foilage/foilage_deadvillages.png", weight: 1, scale: 1.5, actionId: "bury_city_mob_dead", lootTables: ["material_humanoid"] },
      { fileName: "foilage/foilage_deadpeasents.png", weight: 2, scale: 1.5, actionId: "bury_city_mob_dead", lootTables: ["material_humanoid","monster_profile_humanoid"] },
      { fileName: "foilage/foilage_deadsoldiers.png", weight: 3, scale: 1.5, actionId: "bury_city_mob_dead", lootTables: ["material_humanoid","monster_profile_humanoid","monster_special_global"] },
      { fileName: "foilage/foilage_boneparts.png", weight: 12, scale: 0.45 },
      { fileName: "foilage/foilage_garbage_001.png", weight: 15, scale: 0.75 },
      { fileName: "object/object_gravestone.png", weight: 0, scale: 0.7 },
    ],
    objects: [
      { id: "object_tree_mainland", weight: 6, destructible: true },
      { id: "object_fallentree", weight: 4, destructible: true },
      { id: "object_pillar_stone", weight: 1, destructible: true },
      { id: "object_pillar_wood", weight: 1, destructible: true },
      { id: "object_tree_lava", weight: 1, destructible: true },
      { id: "object_wagons", weight: 1, destructible: true },
    ],
    decay: [
      { id: "decay_blood", weight: 8 },
      { id: "decay_cracks", weight: 6 },
      { id: "decay_dust", weight: 6 },
    ],
    weights: { foilage: 8 },
    mobs: ["Skeleton", "Ghost", "Demon"],
  },
  {
    id: "city-sw-fields",
    label: "City SW Fields",
    audio: { musicProfile: "village_troubled" },
    spawnZoneIds: ["SW_SPAWN_BORDER", "SW_SPAWN_BRIDGE", "SW_SPAWN_CLOSE", "W_SPAWN_EDGE"],
    tileset: [
      { fileName: "tileset/tileset_field.png" },
      { fileName: "tileset/tileset_grass.png" },
      { fileName: "tileset/tileset_debris.png" },
    ],
    foliageSet: [
      { fileName: "foilage/foilage_field.png" },
      { fileName: "foilage/foilage_bones.png", scale: 0.5 },
      { fileName: "foilage/foilage_deadanimal_small.png", scale: 0.5, particles: { type: "flies", chance: 0.75, count: [4, 10], radius: 24, heightOffset: -14, onlyWhenOnScreen: true } },
    ],
    objects: [
      { id: "object_field", weight: 8, destructible: true },
      { id: "object_hay", weight: 6, destructible: true },
      { id: "object_sacks_ground", weight: 2, destructible: true },
    ],
    decay: [
      { id: "decay_field", weight: 10 },
      { id: "decay_blood", weight: 4 },
      { id: "decay_cracks", weight: 2 },
    ],
    weights: { foilage: 9 },
    mobs: ["Wolf", "Wild Boar", "Skeleton"],
  },
  {
    id: "city-ne-flooded-road",
    label: "City NE Flooded Road",
    audio: { musicProfile: "riverlands" },
    spawnZoneIds: ["NE_SPAWN_BORDER_UPPER", "NE_SPAWN_BORDER_LOWER", "NE_SPAWN_BRIDGE", "NE_SPAWN_CLOSE"],
    tileset: [
      { fileName: "tileset/tileset_swamp.png" },
      { fileName: "tileset/tileset_debris.png" },
    ],
    foliageSet: [
      { fileName: "foilage/foilage_roots.png" },
      { fileName: "foilage/foilage_mushrooms.png", scale: 0.65 },
      { fileName: "foilage/foilage_bones_001.png", scale: 0.45 },
      { fileName: "foilage/foilage_plants_mainland.png", scale: 0.45 },
    ],
    objects: [
      { id: "object_tree_lava", weight: 5, destructible: true },
      { id: "object_wagons", weight: 2, destructible: true },
      { id: "object_barrels_ground", weight: 3, destructible: true },
      { id: "object_treestumps", weight: 5, destructible: true },
    ],
    decay: [
      { id: "decay_spiderweb", weight: 7 },
      { id: "decay_dust", weight: 5 },
      { id: "decay_blood", weight: 3 },
    ],
    weights: { water: 2, foilage: 8 },
    mobs: ["Spider", "Snake", "Ghost"],
  },
  {
    id: "city-se-broken-stones",
    label: "City SE Broken Stones",
    audio: { musicProfile: "rocky_highlands" },
    spawnZoneIds: ["SE_SPAWN_BORDER", "SE_SPAWN_CORNER", "SE_SPAWN_BRIDGE", "SE_SPAWN_CLOSE"],
    tileset: [
      { fileName: "tileset/tileset_rock.png" },
      //{ fileName: "tileset/tileset_debriswithblood.png" },
    ],
    foliageSet: [
      { fileName: "foilage/foilage_smallstone.png" },
      { fileName: "foilage/foilage_plants_stone.png", scale: 0.55 },
      { fileName: "foilage/foilage_boneparts.png", scale: 0.45 },
    ],
    objects: [
      { id: "object_stone_cluster", weight: 8, destructible: true },
      { id: "object_pillar_stone", weight: 2, destructible: true },
      { id: "object_woodboxes_ground", weight: 2, destructible: true },
    ],
    decay: [
      { id: "decay_cracks", weight: 10 },
      { id: "decay_blood", weight: 5 },
      { id: "decay_dust", weight: 3 },
    ],
    weights: { foilage: 7 },
    mobs: ["Demon", "Skeleton", "Scorpion"],
  },
  {
    id: "city-bank-vault",
    label: "Occupied Bank Vault",
    audio: { musicProfile: "cellar" },
    buildingIds: ["bank"],
    tileset: [{
      fileName: "tileset/tileset_bricktiles.png",
      //x: 1,
      //y: 1,
      weight: 3,
      //visualScale: 1,
      //sourceInset: 0,
      //edgeFeather: 0,
      //baseAlpha: 0,
    }],
    foliageSet: [
      { fileName: "foilage/foilage_basement.png", weight: 2, scale: 0.8 },
      //{ fileName: "foilage/foilage_metalchains.png", weight: 5, scale: 0.7 },
      //{ fileName: "foilage/foilage_metalparts.png", weight: 3, scale: 0.65 },
      { fileName: "foilage/foilage_oldmaps.png", weight: 2, scale: 0.8, cityStat: { "ratios.wealth": { max: 0.25 } } },
      { fileName: "foilage/foilage_deadanimal_small.png", scale: 0.5, particles: { type: "flies", chance: 0.75, count: [4, 10], radius: 24, heightOffset: -14, onlyWhenOnScreen: true }, cityStat: { "ratios.wealth": { max: 0.25 } } },
      { fileName: "foilage/foilage_bank_money.png", weight: 12, scale: 0.75, lootTables: ["gold_bank"], cityStat: { "ratios.wealth": { min: 0.50 } } },
      { fileName: "foilage/foilage_bank_crystal.png", weight: 8, scale: 0.75, lootTables: ["material_gemstones"], cityStat: { "ratios.wealth": { min: 0.95 } } },
      { fileName: "foilage/foilage_shattered_paper.png", weight: 20, scale: 0.75, lootTables: ["material_paper"] },
    ],
    objects: [
      //{ id: "object_metalchest", weight: 12, destructible: true },
      { id: "object_chests_ground", weight: 8, destructible: true },
      { id: "object_shelfs", weight: 7, destructible: true },
      { id: "object_woodboxes_ground", weight: 4, destructible: true },
      { id: "object_sacks_ground", variant: 2, weight: 3, destructible: true },
      { id: "object_vault", weight: 3, destructible: false, cityStat: { "ratios.wealth": { min: 0.75 } } },
    ],
    decay: [{ id: "decay_dust", weight: 10 }, { id: "decay_cracks", weight: 6 }, { id: "decay_spiderweb", weight: 3 }],
    spawnCounts: { objects: 24, foliage: 78, decals: 18 },
    mobs: ["Knight", "Skeleton", "Spider"],
  },
  {
    id: "city-inn-taproom",
    label: "Occupied Inn",
    audio: { musicProfile: "village_troubled" },
    buildingIds: ["inn"],
    tileset: [{ fileName: "tileset/tileset_brickstone_02.png", x:1, y:1,weight: 4 }, { fileName: "tileset/tileset_brickstone_01.png", x: 1, y: 1,weight: 1 }],
    foliageSet: [
      { fileName: "foilage/foilage_barnitems.png", weight: 2, scale: 0.8 },
      { fileName: "foilage/foilage_food.png", weight: 6, scale: 0.7 },
      { fileName: "foilage/foilage_garbage_001.png", weight: 3, scale: 0.65 },
      { fileName: "foilage/foilage_village_items_broken.png", weight: 3, scale: 0.65 },
      { fileName: "foilage/foilage_village_items.png", weight: 1, scale: 0.65 },
      { fileName: "foilage/foilage_bottles.png", weight: 6, scale: 0.5 },
      { fileName: "foilage/foilage_glass.png", weight: 5, scale: 0.4 },
      { fileName: "foilage/foilage_beermugs_standing.png", weight: 4, scale: 0.4 },
      { fileName: "foilage/foilage_beermugs_tipped.png", weight: 4, scale: 0.4 },
    ],
    objects: [
      { id: "object_table", weight: 4, destructible: true },
      { id: "object_standing_table", weight: 14, destructible: true, spawnDamage: "damaged" },
      { id: "object_chair", weight: 12, destructible: true },
      { id: "object_barrels_ground", weight: 12, destructible: true },
      { id: "object_shelfs", weight: 8, destructible: true },
      { id: "object_sacks_ground", weight: 6, destructible: true },
      { id: "object_woodboxes_ground", weight: 3, destructible: true },
    ],
    decay: [{ id: "decay_food", weight: 9 }, { id: "decay_dust", weight: 7 }, { id: "decay_blood", weight: 3 }, { id: "decay_spiderweb", weight: 2 }],
    spawnCounts: { objects: 42, foliage: 28, decals: 28 },
    mobs: ["Peasant", "Skeleton", "Wolf"],
  },
  {
    id: "city-merchant-shop",
    label: "Occupied Merchant Shop",
    audio: { musicProfile: "village_troubled" },
    buildingIds: ["merchant"],
    tileset: [{ fileName: "tileset/tileset_bricktiles.png", weight: 3 }, { fileName: "tileset/tileset_woodplank.png", weight: 1 }],
    foliageSet: [{ fileName: "foilage/foilage_food.png", weight: 6, scale: 0.7 }, { fileName: "foilage/foilage_village_items_broken.png", weight: 5, scale: 0.7 }, { fileName: "foilage/foilage_garbage_001.png", weight: 2 }],
    objects: [{ id: "object_marketstalls", weight: 10, destructible: true }, { id: "object_fruitbaskets", weight: 8, destructible: true }, { id: "object_sacks_ground", weight: 6, destructible: true }, { id: "object_woodboxes_ground", weight: 5, destructible: true }, { id: "object_barrels_ground", weight: 3, destructible: true }],
    decay: [{ id: "decay_food", weight: 8 }, { id: "decay_dust", weight: 5 }, { id: "decay_cracks", weight: 3 }],
    spawnCounts: { objects: 24, foliage: 18, decals: 16 },
    mobs: ["Peasant", "Knight", "Wolf"],
  },
  {
    id: "city-blacksmith-forge",
    label: "Occupied Blacksmith",
    audio: { musicProfile: "dungeon_danger" },
    buildingIds: ["blacksmith"],
    tileset: [{ fileName: "tileset/tileset_bricktiles.png", weight: 3 }, { fileName: "tileset/tileset_debris.png", weight: 2 }],
    foliageSet: [{ fileName: "foilage/foilage_metalplates.png", weight: 9, scale: 0.7 }, { fileName: "foilage/foilage_metalchains.png", weight: 7, scale: 0.7 }, { fileName: "foilage/foilage_metalparts.png", weight: 6, scale: 0.65 }],
    objects: [{ id: "object_fireplace_mainland", weight: 5, destructible: false }, { id: "object_metalchest", weight: 5, destructible: true }, { id: "object_woodboxes_ground", weight: 5, destructible: true }, { id: "object_barrels_ground", weight: 4, destructible: true }, { id: "object_pillar_stone", weight: 2, destructible: true }],
    decay: [{ id: "decay_dust", weight: 9 }, { id: "decay_cracks", weight: 8 }, { id: "decay_blood", weight: 3 }],
    spawnCounts: { objects: 22, foliage: 22, decals: 18 },
    mobs: ["Knight", "Demon", "Skeleton"],
  },
  {
    id: "city-town-hall-chambers",
    label: "Occupied Town Hall",
    audio: { musicProfile: "village_troubled" },
    buildingIds: ["town_hall"],
    tileset: [{ fileName: "tileset/tileset_bricktiles.png", weight: 4 }, { fileName: "tileset/tileset_woodplank.png", weight: 1 }],
    foliageSet: [{ fileName: "foilage/foilage_village_items_broken.png", weight: 7, scale: 0.75 }, { fileName: "foilage/foilage_cityplant.png", weight: 3, scale: 0.7 }, { fileName: "foilage/foilage_garbage_001.png", weight: 2 }],
    objects: [{ id: "object_pillar_stone", weight: 10, destructible: true }, { id: "object_shelfs", weight: 5, destructible: true }, { id: "object_woodboxes_ground", weight: 3, destructible: true }],
    decay: [{ id: "decay_cracks", weight: 8 }, { id: "decay_dust", weight: 7 }, { id: "decay_blood", weight: 2 }],
    spawnCounts: { objects: 20, foliage: 16, decals: 18 },
    mobs: ["Peasant", "Knight", "Skeleton"],
  },
  {
    id: "city-sanctuary-nave",
    label: "Occupied Sanctuary",
    audio: { musicProfile: "ancient_shrine" },
    buildingIds: ["sanctuary"],
    tileset: [{ fileName: "tileset/tileset_bricktiles.png", weight: 4 }, { fileName: "tileset/tileset_rock.png", weight: 1 }],
    foliageSet: [{ fileName: "foilage/foilage_boneparts.png", weight: 6, scale: 0.55 }, { fileName: "foilage/foilage_bones.png", weight: 4, scale: 0.55 }, { fileName: "foilage/foilage_cityplant.png", weight: 2, scale: 0.7 }],
    objects: [{ id: "object_pillar_stone", weight: 10, destructible: true }, { id: "object_bones", weight: 3, destructible: true }, { id: "object_shelfs", weight: 2, destructible: true }],
    decay: [{ id: "decay_cracks", weight: 8 }, { id: "decay_blood", weight: 6 }, { id: "decay_dust", weight: 4 }],
    spawnCounts: { objects: 20, foliage: 18, decals: 20 },
    mobs: ["Demon", "Skeleton", "Ghost"],
  },
  {
    id: "city-barracks-yard",
    label: "Occupied Barracks",
    audio: { musicProfile: "dungeon_danger" },
    buildingIds: ["barracks"],
    tileset: [{ fileName: "tileset/tileset_bricktiles.png", weight: 3 }, { fileName: "tileset/tileset_debris.png", weight: 2 }],
    foliageSet: [{ fileName: "foilage/foilage_metalplates.png", weight: 7, scale: 0.7 }, { fileName: "foilage/foilage_metalchains.png", weight: 6, scale: 0.7 }, { fileName: "foilage/foilage_village_debris.png", weight: 3, scale: 0.7 }],
    objects: [{ id: "object_metalchest", weight: 7, destructible: true }, { id: "object_woodboxes_ground", weight: 6, destructible: true }, { id: "object_barrels_ground", weight: 5, destructible: true }, { id: "object_pillar_stone", weight: 3, destructible: true }],
    decay: [{ id: "decay_cracks", weight: 8 }, { id: "decay_dust", weight: 6 }, { id: "decay_blood", weight: 5 }],
    spawnCounts: { objects: 23, foliage: 20, decals: 18 },
    mobs: ["Knight", "Peasant", "Skeleton"],
  },
  {
    id: "city-armory-store",
    label: "Occupied Armory",
    audio: { musicProfile: "dungeon_danger" },
    buildingIds: ["armory"],
    tileset: [{ fileName: "tileset/tileset_bricktiles.png", weight: 3 }, { fileName: "tileset/tileset_woodplank.png", weight: 1 }],
    foliageSet: [{ fileName: "foilage/foilage_metalplates.png", weight: 10, scale: 0.7 }, { fileName: "foilage/foilage_metalchains.png", weight: 8, scale: 0.7 }, { fileName: "foilage/foilage_metalparts.png", weight: 7, scale: 0.65 }],
    objects: [{ id: "object_metalchest", weight: 10, destructible: true }, { id: "object_shelfs", weight: 8, destructible: true }, { id: "object_woodboxes_ground", weight: 4, destructible: true }, { id: "object_barrels_ground", weight: 2, destructible: true }],
    decay: [{ id: "decay_dust", weight: 8 }, { id: "decay_cracks", weight: 6 }, { id: "decay_blood", weight: 3 }],
    spawnCounts: { objects: 24, foliage: 22, decals: 16 },
    mobs: ["Knight", "Skeleton", "Demon"],
  },
  {
    id: "city-area-market",
    label: "Raided Market Area",
    audio: { musicProfile: "village_troubled" },
    areaIds: ["market"],
    tileset: [{ fileName: "tileset/tileset_bricktiles.png", weight: 3 }, { fileName: "tileset/tileset_debris.png", weight: 1 }],
    foliageSet: [{ fileName: "foilage/foilage_food.png", weight: 7 }, { fileName: "foilage/foilage_cityplant.png", weight: 3 }, { fileName: "foilage/foilage_village_debris.png", weight: 4 }],
    objects: [{ id: "object_marketstalls", weight: 9, destructible: true }, { id: "object_destroyed_marketstalls", weight: 5, destructible: true }, { id: "object_fruitbaskets", weight: 6, destructible: true }, { id: "object_wagons", weight: 3, destructible: true }],
    decay: [{ id: "decay_food", weight: 8 }, { id: "decay_cracks", weight: 5 }, { id: "decay_dust", weight: 4 }],
    mobs: ["Peasant", "Wolf", "Knight"],
  },
  {
    id: "city-area-mystic-quarter",
    label: "Raided Mystic Quarter",
    audio: { musicProfile: "ancient_shrine" },
    areaIds: ["mystic_quarter"],
    tileset: [{ fileName: "tileset/tileset_bricktiles.png", weight: 3 }, { fileName: "tileset/tileset_rock.png", weight: 1 }],
    foliageSet: [{ fileName: "foilage/foilage_cityplant.png", weight: 5 }, { fileName: "foilage/foilage_roots.png", weight: 4 }, { fileName: "foilage/foilage_boneparts.png", weight: 3, scale: 0.5 }],
    objects: [{ id: "object_pillar_stone", weight: 9, destructible: true }, { id: "object_caves", weight: 1, destructible: false }],
    decay: [{ id: "decay_cracks", weight: 8 }, { id: "decay_blood", weight: 4 }, { id: "decay_spiderweb", weight: 3 }],
    mobs: ["Demon", "Ghost", "Skeleton"],
  },
  {
    id: "city-area-crafting-quarter",
    label: "Raided Crafting Quarter",
    audio: { musicProfile: "dungeon_danger" },
    areaIds: ["crafting_quarter"],
    tileset: [{ fileName: "tileset/tileset_bricktiles.png", weight: 3 }, { fileName: "tileset/tileset_debris.png", weight: 2 }],
    foliageSet: [{ fileName: "foilage/foilage_metalparts.png", weight: 8 }, { fileName: "foilage/foilage_metalplates.png", weight: 7 }, { fileName: "foilage/foilage_metalchains.png", weight: 5 }],
    objects: [{ id: "object_fireplace_mainland", weight: 4, destructible: false }, { id: "object_woodboxes_ground", weight: 6, destructible: true }, { id: "object_barrels_ground", weight: 5, destructible: true }, { id: "object_metalchest", weight: 3, destructible: true }],
    decay: [{ id: "decay_dust", weight: 9 }, { id: "decay_cracks", weight: 7 }, { id: "decay_blood", weight: 3 }],
    mobs: ["Knight", "Skeleton", "Demon"],
  },
  {
    id: "city-area-town-center",
    label: "Raided Town Center",
    audio: { musicProfile: "village_troubled" },
    areaIds: ["town_center"],
    tileset: [{ fileName: "tileset/tileset_bricktiles.png", weight: 4 }],
    foliageSet: [{ fileName: "foilage/foilage_cityplant.png", weight: 5 }, { fileName: "foilage/foilage_village_items_broken.png", weight: 4 }, { fileName: "foilage/foilage_garbage_001.png", weight: 2 }],
    objects: [{ id: "object_pillar_stone", weight: 9, destructible: true }, { id: "object_wagons", weight: 2, destructible: true }, { id: "object_woodboxes_ground", weight: 3, destructible: true }],
    decay: [{ id: "decay_cracks", weight: 8 }, { id: "decay_dust", weight: 5 }, { id: "decay_blood", weight: 3 }],
    mobs: ["Peasant", "Knight", "Skeleton"],
  },
  {
    id: "city-area-training-grounds",
    label: "Raided Training Grounds",
    audio: { musicProfile: "dungeon_danger" },
    areaIds: ["training_grounds"],
    tileset: [{ fileName: "tileset/tileset_debris.png", weight: 2 }, { fileName: "tileset/tileset_bricktiles.png", weight: 2 }],
    foliageSet: [{ fileName: "foilage/foilage_metalparts.png", weight: 6 }, { fileName: "foilage/foilage_metalplates.png", weight: 5 }, { fileName: "foilage/foilage_village_debris.png", weight: 3 }],
    objects: [{ id: "object_woodboxes_ground", weight: 7, destructible: true }, { id: "object_barrels_ground", weight: 6, destructible: true }, { id: "object_metalchest", weight: 4, destructible: true }, { id: "object_pillar_stone", weight: 2, destructible: true }],
    decay: [{ id: "decay_cracks", weight: 7 }, { id: "decay_dust", weight: 5 }, { id: "decay_blood", weight: 5 }],
    mobs: ["Knight", "Peasant", "Skeleton"],
  },
  {
    id: "city-area-housing",
    label: "Raided Housing Area",
    audio: { musicProfile: "village_troubled" },
    areaIds: ["housing_area"],
    tileset: [{ fileName: "tileset/tileset_woodplank.png", weight: 2 }, { fileName: "tileset/tileset_bricktiles.png", weight: 2 }],
    foliageSet: [{ fileName: "foilage/foilage_village_items_broken.png", weight: 7 }, { fileName: "foilage/foilage_food.png", weight: 4 }, { fileName: "foilage/foilage_garbage_001.png", weight: 3 }],
    objects: [{ id: "object_house_mainland", weight: 4, destructible: false }, { id: "object_shelfs", weight: 4, destructible: true }, { id: "object_barrels_ground", weight: 4, destructible: true }, { id: "object_woodboxes_ground", weight: 4, destructible: true }],
    decay: [{ id: "decay_dust", weight: 7 }, { id: "decay_food", weight: 4 }, { id: "decay_blood", weight: 3 }],
    mobs: ["Peasant", "Wolf", "Skeleton"],
  },
  {
    id: "city-area-park",
    label: "Raided Park",
    audio: { musicProfile: "forest_dark" },
    areaIds: ["park"],
    tileset: [{ fileName: "tileset/tileset_grass.png", weight: 3 }, { fileName: "tileset/tileset_bricktiles.png", weight: 1 }],
    foliageSet: [{ fileName: "foilage/foilage_cityplant.png", weight: 8 }, { fileName: "foilage/foilage_plants_mainland.png", weight: 6 }, { fileName: "foilage/foilage_roots.png", weight: 3 }],
    objects: [{ id: "object_tree_mainland", weight: 7, destructible: true }, { id: "object_well", weight: 2, destructible: false }, { id: "object_pillar_stone", weight: 2, destructible: false }, { id: "object_barrels_ground", weight: 2, destructible: true }],
    decay: [{ id: "decay_field", weight: 7 }, { id: "decay_cracks", weight: 4 }, { id: "decay_blood", weight: 3 }],
    mobs: ["Wolf", "Spider", "Skeleton"],
  },
  {
    id: "city-area-education",
    label: "Raided Education Area",
    audio: { musicProfile: "ancient_shrine" },
    areaIds: ["education_area"],
    tileset: [{ fileName: "tileset/tileset_bricktiles.png", weight: 3 }, { fileName: "tileset/tileset_woodplank.png", weight: 1 }],
    foliageSet: [{ fileName: "foilage/foilage_village_items_broken.png", weight: 6 }, { fileName: "foilage/foilage_cityplant.png", weight: 3 }, { fileName: "foilage/foilage_garbage_001.png", weight: 2 }],
    objects: [{ id: "object_shelfs", weight: 10, destructible: true }, { id: "object_pillar_stone", weight: 5, destructible: true }, { id: "object_woodboxes_ground", weight: 4, destructible: true }],
    decay: [{ id: "decay_dust", weight: 9 }, { id: "decay_cracks", weight: 5 }, { id: "decay_spiderweb", weight: 3 }],
    mobs: ["Skeleton", "Ghost", "Demon"],
  },
  {
    id: "city-area-empty-district",
    label: "Raided Empty District",
    audio: { musicProfile: "ruined_outpost" },
    areaIds: ["empty_district_1"],
    tileset: [{ fileName: "tileset/tileset_debris.png", weight: 3 }, { fileName: "tileset/tileset_bricktiles.png", weight: 1 }],
    foliageSet: [{ fileName: "foilage/foilage_deadvillages.png", weight: 7, scale: 1.2 }, { fileName: "foilage/foilage_village_debris.png", weight: 5 }, { fileName: "foilage/foilage_garbage_001.png", weight: 3 }],
    objects: [{ id: "object_ruin_normal", weight: 7, destructible: true }, { id: "object_woodboxes_ground", weight: 5, destructible: true }, { id: "object_barrels_ground", weight: 4, destructible: true }, { id: "object_pillar_stone", weight: 3, destructible: true }],
    decay: [{ id: "decay_cracks", weight: 10 }, { id: "decay_dust", weight: 7 }, { id: "decay_blood", weight: 3 }],
    mobs: ["Skeleton", "Spider", "Demon"],
  },
];

const CITY_MOB_BASE_SPAWN_COUNTS_BY_MAP_SIZE = {
  small: { objects: 12, foliage: 20, decals: 16, monsters: { min: 3, max: 6 }, water: 0 },
  medium: { objects: 15, foliage: 28, decals: 24, monsters: { min: 4, max: 9 }, water: 0 },
  large: { objects: 20, foliage: 36, decals: 30, monsters: { min: 6, max: 12 }, water: 0 },
  giga: { objects: 26, foliage: 46, decals: 36, monsters: { min: 8, max: 14 }, water: 0 },
};

function normalizeCount(value, fallback) {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, parsed);
}

function buildCityMobSpawnCounts(profile = {}, mapSize = "small") {
  const sizeKey = String(mapSize || "small").toLowerCase();
  const base = CITY_MOB_BASE_SPAWN_COUNTS_BY_MAP_SIZE[sizeKey] ?? CITY_MOB_BASE_SPAWN_COUNTS_BY_MAP_SIZE.small;
  const input = (profile.spawnCounts && typeof profile.spawnCounts === "object") ? profile.spawnCounts : {};
  const monsterInput = (input.monsters && typeof input.monsters === "object") ? input.monsters : {};
  const legacyWeights = (profile.weights && typeof profile.weights === "object") ? profile.weights : {};
  const weightedFoliage = legacyWeights.foilage === undefined
    ? base.foliage
    : Math.round(base.foliage * Math.min(2.4, Math.max(0, Number(legacyWeights.foilage) || 0) / 8));

  return {
    objects: normalizeCount(input.objects, base.objects),
    foliage: normalizeCount(input.foliage ?? input.foilage, weightedFoliage),
    decals: normalizeCount(input.decals ?? input.decay, base.decals),
    monsters: {
      min: normalizeCount(monsterInput.min, base.monsters.min),
      max: normalizeCount(monsterInput.max, base.monsters.max),
    },
    water: normalizeCount(input.water, normalizeCount(legacyWeights.water, base.water)),
  };
}

function normalizeMobEntries(mobs = []) {
  if (!Array.isArray(mobs)) return [];
  return mobs
    .map((mob) => (
      typeof mob === "string"
        ? { type: mob, weight: 1 }
        : {
          ...mob,
          type: String(mob?.type ?? "").trim(),
          weight: Math.max(0, Number(mob?.weight) || 1),
        }
    ))
    .filter((mob) => mob.type);
}

export function profileMatchesCitySpawnZone(profile, areaId) {
  const areaIds = Array.isArray(profile?.spawnZoneIds)
    ? profile.spawnZoneIds
    : Array.isArray(profile?.spawnZones)
      ? profile.spawnZones
      : [profile?.spawnZoneId ?? profile?.spawnZone].filter(Boolean);
  return areaIds.map(String).includes(String(areaId));
}

export function cityMobBattleProfilesForArea(areaId) {
  return CITY_MOB_BATTLE_PROFILES.filter((profile) => profileMatchesCitySpawnZone(profile, areaId));
}

function profileMatchesTargetIds(profile, key, targetId) {
  if (!targetId) return false;
  const ids = Array.isArray(profile?.[key]) ? profile[key] : [];
  return ids.map(String).includes(String(targetId));
}

export function cityMobBattleProfilesForTarget({ buildingId = null, areaId = null, spawnZoneId = null } = {}) {
  const buildingProfiles = CITY_MOB_BATTLE_PROFILES.filter((profile) => profileMatchesTargetIds(profile, "buildingIds", buildingId));
  if (buildingProfiles.length > 0) return buildingProfiles;
  const areaProfiles = CITY_MOB_BATTLE_PROFILES.filter((profile) => profileMatchesTargetIds(profile, "areaIds", areaId));
  if (areaProfiles.length > 0) return areaProfiles;
  return cityMobBattleProfilesForArea(spawnZoneId);
}

export function buildCityMobBattleRegion(profile, { areaId, mobType, mapSize, occupiedAreaId = null, occupiedBuildingId = null }) {
  if (!profile?.id || !mobType) return null;
  const spawnCounts = buildCityMobSpawnCounts(profile, mapSize);
  const extraMobs = normalizeMobEntries(profile.mobs)
    .filter((mob) => mob.type.toLowerCase() !== String(mobType).toLowerCase());
  const extraTotal = extraMobs.reduce((sum, mob) => sum + mob.weight, 0);
  const weightedExtraMobs = extraTotal > 0
    ? extraMobs.map((mob) => ({ ...mob, weight: (mob.weight / extraTotal) * 10 }))
    : [];

  return {
    ...profile,
    id: `citymob:${profile.id}`,
    label: profile.label ?? profile.id,
    citySpawnZoneId: areaId,
    cityOccupiedAreaId: occupiedAreaId,
    cityOccupiedBuildingId: occupiedBuildingId,
    mapSize,
    spawnCounts,
    mobs: [
      { type: String(mobType), weight: 90 },
      ...weightedExtraMobs,
    ],
  };
}
