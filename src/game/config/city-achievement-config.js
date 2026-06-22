// City achievements are Library Hall of Deeds entries.
// Schema: id, title, description, category, imageUrl/iconUrl, levels[] { tier, condition, effects }, optional hidden.
const VILLAGE_OUTSKIRT_REGION_IDS = [
  "path-to-hunter-hut",
  "lookout-post",
  "old-shrine",
  "paths-into-elvindale",
  "southern-fields",
  "river-creek",
  "trail-to-inner-elvindale",
  "market-square",
  "well",
  "inn-of-the-good-oak",
  "barn",
  "mill",
  "hunter-trail-to-the-forest",
  "smithy",
  "northern-fields",
  "village",
  "the-forest",
];

const allVillageOutskirtRegionsUnlocked = {
  all: VILLAGE_OUTSKIRT_REGION_IDS.map((regionId) => ({ flag: `region.${regionId}.unlocked` })),
};

export const CITY_ACHIEVEMENTS = [
  {
    id: "monster_slayer",
    title: "Monster Slayer",
    imageUrl: "/assets/generated/achievement/monsterslayer.png",
    description: "Dræb monstre i Valtorias vildmarker.",
    category: "combat",
    levels: [
      { tier: "bronze", condition: { player: { "stats.killsTotal": { min: 100 } } } },
      { tier: "silver", condition: { player: { "stats.killsTotal": { min: 1000 } } } },
      { tier: "gold", condition: { player: { "stats.killsTotal": { min: 10000 } } } },
    ],
  },
  {
    id: "defender_of_the_city",
    title: "Defender of the City",
    imageUrl: "/assets/generated/achievement/defenderofthecity.png",
    description: "Rens landsbyen for borgmesteren.",
    category: "quests",
    levels: [{ tier: "gold", condition: { questCompleted: "mayor_cleanse_village" } }],
  },
  {
    id: "village_outskirt_defender",
    title: "Village Outskirt Defender",
    imageUrl: "/assets/generated/achievement/villageoutskirtdefender.png",
    description: "Aabn alle regioner i Village Outskirt.",
    category: "exploration",
    levels: [{ tier: "gold", condition: allVillageOutskirtRegionsUnlocked, effects: { cityStats: { defense: 100, trade: 50 } } }],
  },
  {
    id: "spiders_bane",
    title: "Spider's Bane",
    imageUrl: "/assets/generated/achievement/spidersbane.png",
    description: "Ryd edderkopperne ud af kroens kælder.",
    category: "bosses",
    levels: [{ tier: "gold", condition: { questCompleted: "clear_the_inn" } }],
  },
  {
    id: "fenris_bane",
    title: "Fenris Bane",
    imageUrl: "/assets/generated/achievement/fenrisbane.png",
    description: "Fæld Fenris-ulven i Elvbaekken.",
    category: "bosses",
    levels: [{ tier: "gold", condition: { any: [{ questCompleted: "annelise_document_chain" }, { tagKills: { wolf: { min: 1 } } }] } }],
  },
  {
    id: "bone_collector",
    title: "Bone Collector",
    imageUrl: "/assets/generated/achievement/bonecollector.png",
    description: "Saml bonedust gennem hele spillet.",
    category: "collection",
    levels: [
      { tier: "bronze", condition: { counter: { id: "resourceCollected.bonedust", min: 100 } } },
      { tier: "silver", condition: { counter: { id: "resourceCollected.bonedust", min: 1000 } } },
      { tier: "gold", condition: { counter: { id: "resourceCollected.bonedust", min: 10000 } } },
    ],
  },
  {
    id: "savior_of_village_outskirt",
    title: "Savior of Village Outskirt",
    imageUrl: "/assets/generated/achievement/saviorofvillageoutskirt.png",
    description: "Fuldfør opgaver for Village Outskirt.",
    category: "quests",
    levels: [
      // TODO: Add reputation effects here if/when city-stat achievements can safely target faction reputation.
      { tier: "bronze", condition: { counter: { id: "questCompleted.faction.village_outskirt", min: 10 } } },
      { tier: "silver", condition: { counter: { id: "questCompleted.faction.village_outskirt", min: 25 } } },
      { tier: "gold", condition: { counter: { id: "questCompleted.faction.village_outskirt", min: 50 } } },
    ],
  },
];
