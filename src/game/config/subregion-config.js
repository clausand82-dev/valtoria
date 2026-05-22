export const SUBREGION_CONFIG = {
  cave01_lvl1: {
    id: "cave01_lvl1",
    label: "Gammel grotte",
    kind: "cave",
    generator: "mapRegion",
    mapSize: "small",
    width: 48,
    height: 48,
    persistence: "whileRootRegionActive",
    tileset: [
      { fileName: "tileset/tileset_rock.png", weight: 1, lockedVariant: 2 },
    ],
    objects: [
      // TODO: replace placeholder ruin/stone objects with cave entrance assets when they exist.
      { id: "object_ruin_normal", weight: 1, actionId: "exit_subregion", placementRole: "entryArea", blocking: false },
      { id: "object_pillar_stone", weight: 1, actionId: "enter_cave01_lvl2", placementRole: "farFromEntry", blocking: false },
      { id: "object_stone_cluster", weight: 7 },
      { id: "object_pillar_stone", weight: 2 },
      { id: "object_ruin_normal", weight: 1 },
    ],
    foliageSets: [
      { fileName: "foilage/foilage_boneparts.png", weight: 2 },
      { fileName: "foilage/foilage_plants_mainland.png", weight: 1, scale: 0.7 },
    ],
    mobs: ["Skeleton", "Ghost", { type: "MiniSpider", weight: 2 }],
    foliage: [],
    monsters: [],
    chests: [],
    prefabRules: {},
    spawnCounts: {
      objects: 6,
      foliage: 4,
      decals: 6,
      monsters: { min: 1, max: 2 },
    },
  },

  cave01_lvl2: {
    id: "cave01_lvl2",
    label: "Gammel grotte - dybet",
    kind: "cave",
    generator: "mapRegion",
    mapSize: "small",
    width: 48,
    height: 48,
    persistence: "whileRootRegionActive",
    tileset: [
      { fileName: "tileset/tileset_rock.png", weight: 1, lockedVariant: 3 },
    ],
    objects: [
      // TODO: replace placeholder ruin with cave exit asset when it exists.
      { id: "object_ruin_normal", weight: 1, actionId: "exit_subregion", placementRole: "entryArea", blocking: false },
      { id: "object_stone_cluster", weight: 8 },
      { id: "object_pillar_stone", weight: 3 },
      { id: "object_ruin_normal", weight: 2 },
    ],
    foliageSets: [
      { fileName: "foilage/foilage_boneparts.png", weight: 3 },
    ],
    mobs: ["Skeleton", "Ghost", { type: "Spider", weight: 1.5 }],
    foliage: [],
    monsters: [],
    chests: [],
    prefabRules: {},
    spawnCounts: {
      objects: 5,
      foliage: 3,
      decals: 8,
      monsters: { min: 1, max: 2 },
    },
  },
};
