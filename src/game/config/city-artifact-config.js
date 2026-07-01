import { normalizeWorldState, setWorldFlag } from "../world-state.js";

// City artifacts are one-time monument purchases.
// Schema: id, title, description, buildingId, imageUrl/iconUrl, cost { gold/resources/items }, effects { cityStats, worldEnergy }, flagsOnBuilt, unlock/conditions.
export const CITY_ARTIFACTS = [
  {
    id: "statue_lord_kealand",
    title: "Grand Statue of Lord Kealand",
    description: "A monument to Lord Kealand's fallen weapon and the strength inherited by the city.",
    i18n: { da: { title: "Stor statue af Lord Kealand", description: "Et monument over Lord Kealands faldne våben og den styrke, byen arvede." } },
    buildingId: "town_hall",
    iconUrl: "/assets/generated/artifact/statue_lordkealand.png",
    cost: {
      gold: 8000,
      resources: { stone_brick: 300, wood_plank: 160 },
      items: [{ uniqueId: "lordkealand_sword", count: 1, label: "Lord Kealand's Sword", i18n: { da: { label: "Lord Kealands sværd" } } }],
    },
    effects: { cityStats: { culture: 100 }, worldEnergy: { lydra: 25 } },
  },
  {
    id: "statue_lady_lirian",
    title: "Grand Statue of Lady Lirian",
    description: "A radiant monument to Lady Lirian's courage and magical legacy.",
    i18n: { da: { title: "Stor statue af Lady Lirian", description: "Et lyst monument over Lady Lirians mod og magiske arv." } },
    buildingId: "town_hall",
    iconUrl: "/assets/generated/artifact/statue_ladylirian.png",
    cost: {
      gold: 8000,
      resources: { stone_brick: 300, wood_plank: 160 },
      items: [{ uniqueId: "ladylirian_sword", count: 1, label: "Lady Lirian's Sword", i18n: { da: { label: "Lady Lirians sværd" } } }],
    },
    effects: { cityStats: { culture: 100 }, worldEnergy: { lydra: 25 } },
  },
  {
    id: "statue_mayor",
    title: "Grand Statue of the Mayor",
    description: "An official statue honoring the city's reconstruction and the office of the mayor.",
    i18n: { da: { title: "Stor statue af borgmesteren", description: "En officiel statue for byens genopbygning og borgmesterens embede." } },
    buildingId: "town_hall",
    iconUrl: "/assets/generated/artifact/statue_mayor.png",
    cost: {
      gold: 2500,
      resources: { stone_brick: 120, wood_plank: 60 },
      items: [{ questItemId: "mayor_chain", count: 1, label: "Borgmesterkaede", i18n: { da: { label: "Borgmesterkæde" } } }],
    },
    effects: { cityStats: { culture: 25 }, worldEnergy: { lydra: 5 } },
  },
  {
    id: "painting_mayor",
    title: "Portrait of the Mayor",
    description: "A modest portrait for the town hall.",
    i18n: { da: { title: "Maleri af borgmesteren", description: "Et beskedent portræt til rådhusets sal." } },
    buildingId: "town_hall",
    iconUrl: "/assets/generated/artifact/painting_mayor.png",
    cost: {
      resources: { wood_plank: 35, red_rose: 15, rare_pink_flower: 5, hide: 8 },
    },
    effects: { cityStats: { culture: 5 }, worldEnergy: { lydra: 2 } },
  },
  {
    id: "rebuilt_village_memorial_well",
    title: "Rebuilt Village Memorial Well",
    description: "A peaceful well square commemorating the village's fall and reconstruction.",
    i18n: { da: { title: "Mindebrønd for Den Genopbyggede Landsby", description: "En fredelig brøndplads til minde om landsbyens fald og genopbygning." } },
    buildingId: "town_hall",
    iconUrl: "/assets/generated/artifact/well_rebuildvillage.png",
    cost: {
      gold: 1800,
      resources: { stone_brick: 80, wood_plank: 35, red_rose: 12 },
    },
    effects: { cityStats: { culture: 15, health: 5 } },
  },
  {
    id: "elvindale_banner",
    title: "Banner of Elvindale",
    description: "A banner woven with the colors and stories of Elvindale.",
    i18n: { da: { title: "Elvindalens banner", description: "Et banner vævet med Elvindalens farver og historier." } },
    buildingId: "town_hall",
    iconUrl: "/assets/generated/artifact/banner_elvindale.png",
    cost: {
      gold: 2600,
      resources: { hide: 30, red_rose: 18, paper: 12, wood_plank: 25 },
    },
    effects: { cityStats: { culture: 25, knowledge: 10 }, worldEnergy: { lydra: 5 } },
  },
  {
    id: "foldrik_friendship_totem",
    title: "Foldrik's Friendship Totem",
    description: "A warmly carved totem celebrating friendship, city life, and good trade.",
    i18n: { da: { title: "Foldriks venskabstotem", description: "Et varmt udskåret totem for venskab, byliv og gode handler." } },
    buildingId: "town_hall",
    iconUrl: "/assets/generated/artifact/totem_friendoffoldrik.png",
    cost: {
      gold: 1600,
      resources: { wood_plank: 70, hide: 12, fruit: 20 },
    },
    effects: { cityStats: { culture: 10, popularity: 10, trade: 5 } },
  },
  {
    id: "life_tree_seed_altar",
    title: "Life Tree Seed Altar",
    description: "A small altar built around a sacred seed carrying the Life Tree's power.",
    i18n: { da: { title: "Livstræets frøalter", description: "Et lille alter bygget omkring et helligt frø fra livstræets kraft." } },
    buildingId: "town_hall",
    iconUrl: "/assets/generated/artifact/alter_lifetreeseed.png",
    cost: {
      gold: 3200,
      resources: { stone_brick: 90, rare_pink_flower: 12, red_rose: 30, bonedust: 40 },
    },
    effects: { cityStats: { faith: 25, culture: 10 }, worldEnergy: { lydra: 10 } },
  },
  {
    id: "fallen_villagers_tablet",
    title: "Tablet of the Fallen Villagers",
    description: "A tablet naming the citizens lost during the village's darkest days.",
    i18n: { da: { title: "Tavle over faldne landsbyboere", description: "En navnetavle for de borgere, der gik tabt under landsbyens mørke dage." } },
    buildingId: "town_hall",
    iconUrl: "/assets/generated/artifact/memorialstone_fallenheroes.png",
    cost: {
      gold: 2200,
      resources: { stone_brick: 95, iron_bar: 8, red_rose: 18 },
    },
    effects: { cityStats: { culture: 20, safety: 5 } },
  },
  {
    id: "tornvalhed_journey_ship_model",
    title: "Model Ship of the Voyage to Tornvalhed",
    description: "A detailed model of the ship that carried the city's hopes toward Tornvalhed.",
    i18n: { da: { title: "Skibsmodel af rejsen mod Tornvalhed", description: "En detaljeret model af skibet, der bar byens håb mod Tornvalhed." } },
    buildingId: "town_hall",
    iconUrl: "/assets/generated/artifact/model_destinyship.png",
    cost: {
      gold: 2400,
      resources: { wood_plank: 90, iron_chains: 8, hide: 10 },
    },
    effects: { cityStats: { trade: 20, culture: 10 } },
  },
  {
    id: "glimmergoat_painting",
    title: "Painting of the Glimmergoat",
    description: "A cheerful painting of the Glimmergoat, beloved by children and scholars.",
    i18n: { da: { title: "Maleri af Glimmergeden", description: "Et muntert maleri af Glimmergeden, elsket af børn og lærde." } },
    buildingId: "town_hall",
    iconUrl: "/assets/generated/artifact/painting_glimmergoat.png",
    cost: {
      gold: 1400,
      resources: { wood_plank: 28, rare_pink_flower: 6, red_rose: 16, hide: 6 },
    },
    effects: { cityStats: { culture: 15, knowledge: 5 } },
  },
    {
    id: "lifetree_painting",
    title: "Painting of the Life Tree",
    description: "A beautiful painting of the Life Tree, symbolizing the power and wisdom of life.",
    i18n: { da: { title: "Maleri af Livstræet", description: "Et smukt maleri af Livstræet, som symboliserer livets kraft og visdom." } },
    buildingId: "town_hall",
    iconUrl: "/assets/generated/artifact/painting_treeoflife.png",
    cost: {
      gold: 1400,
      resources: { wood_plank: 28, rare_pink_flower: 6, red_rose: 16, hide: 6 },
    },
    effects: { cityStats: { culture: 15, knowledge: 5 } },
  },
  {
    id: "treasure_of_the_fenris",
    title: "Treasure of the Fenris",
    description: "An ancient Fenris treasure rebuilt as a city relic that guides the hero toward more gold.",
    i18n: { da: { title: "Fenris' skat", description: "En ældgammel Fenris-skat, genopbygget som et byrelikvie, der leder helten mod mere gold." } },
    buildingId: "town_hall",
    iconUrl: "/assets/generated/item/item_treasure_of_the_fenris.png",
    cost: {
      resources: { stone_brick: 50, wood_piece: 20 },
      items: [{ uniqueId: "treasure_of_the_fenris", count: 1, label: "Treasure of the Fenris", i18n: { da: { label: "Fenris' skat" } } }],
    },
    effects: { cityStats: { gold_find_bonus_pct: 1 } },
    flagsOnBuilt: ["fenris_treasure_restored"],
  },
  {
    id: "village_outskirt_war_banner",
    title: "Village Outskirt War Banner",
    description: "A worn war banner from the battles around Village Outskirt.",
    i18n: { da: { title: "Krigsbanner fra Village Outskirt", description: "Et slidt krigsbanner fra kampene omkring Village Outskirt." } },
    buildingId: "town_hall",
    iconUrl: "/assets/generated/artifact/banner_war.png",
    cost: {
      gold: 2800,
      resources: { hide: 35, iron_bar: 10, wood_plank: 35, red_rose: 10 },
    },
    effects: { cityStats: { defense: 25, culture: 10 } },
  },
];

export function getArtifactBuiltFlag(artifactId) {
  return `artifact.${String(artifactId ?? "").trim()}.built`;
}

function artifactFlagsOnBuilt(artifact) {
  if (!artifact || !Array.isArray(artifact.flagsOnBuilt)) return [];
  return artifact.flagsOnBuilt.map((flag) => String(flag ?? "").trim()).filter(Boolean);
}

export function setArtifactBuiltFlags(worldState, artifactOrId) {
  const artifact = typeof artifactOrId === "string"
    ? CITY_ARTIFACTS.find((entry) => String(entry.id) === String(artifactOrId))
    : artifactOrId;
  const artifactId = String(artifact?.id ?? artifactOrId ?? "").trim();
  if (!artifactId) return { worldState: normalizeWorldState(worldState), changed: false };

  let next = normalizeWorldState(worldState);
  let changed = false;
  for (const flag of [getArtifactBuiltFlag(artifactId), ...artifactFlagsOnBuilt(artifact)]) {
    if (!flag || next.flags[flag]) continue;
    next = setWorldFlag(next, flag, true);
    changed = true;
  }
  return { worldState: next, changed };
}

export function syncArtifactBuiltFlags(cityProgress = {}, worldState = {}) {
  const boughtIds = Array.isArray(cityProgress?.artifacts?.boughtIds)
    ? cityProgress.artifacts.boughtIds.map(String).filter(Boolean)
    : [];
  let next = normalizeWorldState(worldState);
  let changed = false;
  for (const artifactId of boughtIds) {
    const result = setArtifactBuiltFlags(next, artifactId);
    next = result.worldState;
    changed = changed || result.changed;
  }
  return { worldState: next, changed };
}
