// Samlet biodome-konfiguration.
//
// Denne fil styrer de store forskelle mellem biodomes: navn, vægt i world
// generation, farver, hvilke world objects der kan spawne, og hvilke monstre
// der hører til. Hvis du senere vil ændre "hvad der findes i snow/rock/jungle",
// er det normalt her du skal starte.
//
// Felt-guide:
// - id: Intern nøgle. Skal matche objektets nøgle, fx "snow". Bruges i saves,
//   world generation og asset lookups. Undgå at omdøbe id'er i et eksisterende spil.
// - name: Navnet spilleren ser i UI/toasts.
// - weight: Hvor ofte biodomen vælges i world generation. Højere tal betyder
//   mere almindelig. Det er relativt: mainland 10 og jungle 2 betyder, at
//   mainland er ca. fem gange mere sandsynlig end jungle i biome-valget.
// - groundSheet: Historisk/semantisk reference til ground art. Den faktiske
//   render-loader bruger asset-config.js, men feltet er stadig nyttigt som
//   dokumentation og til kode der spørger biodomen direkte.
// - fog: Transparent farve lagt over chunk/rendering for stemning.
// - tile: Fallback/underfarver til ground tiles og minimap-lignende rendering.
// - path: Farve til lette path/noise-markeringer i terrænet.
// - accent: UI/effekt-farve der passer til biodomen.
// - objects: Hvilke world objects må spawne naturligt i biodomen. Dette styrer
//   om fx "fireplace" eller "firebeacon" overhovedet kan dukke op.
// - monsters: Monster-typer der må spawne naturligt i biodomen.
export const BIOMES = {
  mainland: {
    id: "mainland",
    name: "Mainland",
    weight: 10,
    groundSheet: "tileset_grass.png",
    fog: "rgba(46, 82, 45, 0.18)",
    tile: ["#4b5d31", "#526338", "#3f4e2c", "#5c6a3d"],
    path: "rgba(118, 91, 50, 0.28)",
    accent: "#8ba65d",
    // Normal fireplace hører til mainland, jungle og rock.
    // Firebeacon hører ikke til mainland.
    objects: ["tree", "stone", "building", "ruin", "fireplace"],
    monsters: ["Wolf", "Spider"],
  },
  desert: {
    id: "desert",
    name: "Sunscar Desert",
    weight: 7,
    groundSheet: "tileset_sand.png",
    fog: "rgba(116, 84, 42, 0.17)",
    tile: ["#b58b4e", "#c49a5d", "#9e7441", "#d3ad73"],
    path: "rgba(93, 62, 35, 0.22)",
    accent: "#d8b66e",
    objects: ["tree", "stone", "pillar", "ruin"],
    monsters: ["Snake", "Demon", "Scorpion"],
  },
  snow: {
    id: "snow",
    name: "Frostfall Expanse",
    weight: 7,
    groundSheet: "tileset_snow.png",
    fog: "rgba(171, 207, 226, 0.16)",
    tile: ["#c9d7d8", "#dce8e8", "#aebfc2", "#eef4f2"],
    path: "rgba(107, 114, 112, 0.22)",
    accent: "#bfe3f2",
    // Snow bruger kun firebeacon_snow som ild/lys-object.
    // Normal fireplace skal ikke være i snow.
    objects: ["tree", "stone", "pillar", "building", "ruin", "crystal", "firebeacon"],
    monsters: ["Skeleton"],
  },
  rock: {
    id: "rock",
    name: "Greyfang Highlands",
    weight: 5,
    groundSheet: "tileset_rock.png",
    fog: "rgba(80, 82, 78, 0.2)",
    tile: ["#62675e", "#74766d", "#4f564f", "#858272"],
    path: "rgba(74, 65, 49, 0.2)",
    accent: "#bdb48f",
    // Rock bruger normal fireplace, men ingen firebeacon.
    objects: ["stone", "pillar", "crystal", "fireplace"],
    monsters: ["Ghost", "Skeleton"],
  },
  lava: {
    id: "lava",
    name: "Cinderflow",
    weight: 3,
    groundSheet: "tileset_lava.png",
    fog: "rgba(139, 48, 25, 0.22)",
    tile: ["#6f392c", "#8b4230", "#3d3430", "#c36532"],
    path: "rgba(39, 30, 27, 0.2)",
    accent: "#ff8a42",
    objects: ["tree", "stone", "crystal", "pillar"],
    monsters: ["Demon", "Ghost", "Scorpion", "Skeleton"],
  },
  jungle: {
    id: "jungle",
    name: "Vinewake Jungle",
    weight: 2,
    groundSheet: "tileset_jungle.png",
    fog: "rgba(26, 94, 56, 0.18)",
    tile: ["#2f7b45", "#3f8f4f", "#246338", "#5d9a46"],
    path: "rgba(74, 61, 37, 0.23)",
    accent: "#6fc15d",
    // Jungle bruger normal fireplace, men ingen firebeacon.
    objects: ["tree", "stone", "ruin", "fireplace"],
    monsters: ["Wolf", "Spider", "Ghost"],
  },
};

// Rækkefølgen kommer fra objektet ovenfor. World generation bruger listen til
// at bygge biome fields, så nye biodomes skal tilføjes i BIOMES for at komme med.
export const BIOME_IDS = Object.keys(BIOMES);
