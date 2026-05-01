// Spawn-konfiguration for world generation.
//
// Denne fil samler de tal, der bestemmer hvor tæt verden føles: hvor mange
// objects, foliage og decals der placeres, hvor store safe-zones er, og hvordan
// forskellige object-typer får radius/size.
//
// Vigtigt skel:
// - biome-config.js bestemmer HVAD der må spawne i hver biodome.
// - spawn-config.js bestemmer HVOR MEGET og HVOR TÆT ting spawner.
// - asset-config.js bestemmer HVILKE BILLEDFILER der bruges til at tegne dem.
export const SPAWN_CONFIG = {
  // Safe center er startområdet inde i start-chunken. Flere systemer bruger
  // samme punkt, så spillerens start ikke bliver fyldt med træer/sten/dekoration.
  // Koordinaterne er lokale chunk-koordinater, ikke world pixels.
  safeCenter: { x: 3.2, y: 3.1 },

  // Hvor mange større blocking objects der forsøges placeret pr. chunk.
  // Det er forsøg, ikke garanti: objects kan blive droppet, hvis de rammer
  // safe-zones, region start/slut, eller områder udenfor playable region.
  //
  // default bruges for biodomes der ikke har en eksplicit værdi.
  objectCountsByBiome: {
    mainland: 18,
    jungle: 18,
    desert: 12,
    lava: 12,
    default: 15,
  },
  // Holder blocking objects væk fra safeCenter i start-chunken.
  objectSafeRadius: 4.2,

  // Holder objects væk fra regionens start og slut, så indgang/exit ikke bliver
  // blokeret eller visuelt rodet.
  regionStartClearRadius: 4.2,
  regionEndClearRadius: 3.4,

  // Hvor meget foliage/græs/småplanter der forsøges placeret pr. chunk.
  // Høje værdier giver mere liv, men kan gøre terrænet visuelt uroligt.
  // Foliage er non-blocking.
  foliageCountsByBiome: {
    mainland: 42,
    jungle: 56,
    snow: 20,
    desert: 16,
    rock: 22,
    lava: 12,
    default: 28,
  },
  // Holder foliage lidt væk fra startpunktet, men mindre aggressivt end store
  // objects, fordi foliage ikke blocker spilleren.
  foliageSafeRadius: 2.2,

  // Chance for at et foliage-spawn bruger bones-sheetet i stedet for biodomens
  // normale foliage-sheet. 0.14 betyder 14% af foliage-spawns.
  // Sæt til 0 for at fjerne bones helt. Sæt fx til 0.25 for mere bones.
  foliageBonesChance: 0.14,

  // Decals er små jorddetaljer som pebble, crack, bone og rubble. De ligger i
  // chunk.decals i stedet for chunk.objects og blocker ikke spilleren.
  decalCountsByBiome: {
    mainland: 20,
    jungle: 20,
    default: 24,
  },
  // Holder decals væk fra startpunktet, så startområdet læser renere.
  decalSafeRadius: 2.8,
};

export const OBJECT_SPAWN_TUNING = {
  // Tuning pr. object type for collision radius og størrelse ved spawn.
  //
  // radius: Gameplay/collision-radius i world units. Højere radius gør objectet
  //   sværere at gå tæt forbi og øger afstand til andre blocking objects.
  // sizeBase: Grundstørrelse på det spawnede object.
  // sizeRange: Tilfældig ekstra størrelse. Hvis 0, får objectet fast størrelse.
  // sizeSalt: Salt til den deterministiske random-funktion. Brug en stabil,
  //   unik værdi når sizeRange > 0, så eksisterende world generation ikke ændrer
  //   sig unødigt ved små kodeændringer.
  //
  // default bruges hvis en object type ikke har sin egen entry.
  default: { radius: 0.4, sizeBase: 1, sizeRange: 0, sizeSalt: 0 },
  building: { radius: 1.15, sizeBase: 1.2, sizeRange: 0.32, sizeSalt: 330 },
  ruin: { radius: 0.82, sizeBase: 1.08, sizeRange: 0.28, sizeSalt: 335 },
  firebeacon: { radius: 0.42, sizeBase: 0.88, sizeRange: 0.18, sizeSalt: 338 },
  fireplace: { radius: 0.42, sizeBase: 0.88, sizeRange: 0.18, sizeSalt: 338 },
  "broken-wall": { radius: 0.72, sizeBase: 1.25, sizeRange: 0, sizeSalt: 0 },
  "old-oak": { radius: 0.5, sizeBase: 1.15, sizeRange: 0, sizeSalt: 0 },
  pine: { radius: 0.5, sizeBase: 1.15, sizeRange: 0, sizeSalt: 0 },
  pillar: { radius: 0.5, sizeBase: 1.15, sizeRange: 0, sizeSalt: 0 },
  obelisk: { radius: 0.5, sizeBase: 1.15, sizeRange: 0, sizeSalt: 0 },
  crystal: { radius: 0.34, sizeBase: 0.9, sizeRange: 0, sizeSalt: 0 },
};

export const DECAL_SETS_BY_BIOME = {
  // Hvilke decal-typer der kan placeres i hver biodome.
  // Gentagelser øger sandsynligheden. Fx har desert to "pebble", så pebble
  // vælges oftere end bone/crack/rubble.
  //
  // Decal-typerne bliver tegnet af decal-renderingen i assets.js/world render.
  // Hvis du tilføjer en ny type her, skal rendererens decal-kode også kende den.
  mainland: ["pebble", "rubble"],
  desert: ["pebble", "pebble", "bone", "crack", "rubble"],
  snow: ["pebble", "bone", "crack"],
  rock: ["rubble", "rubble", "pebble", "crack", "bone"],
  lava: ["crack", "rubble"],
  jungle: ["rubble", "pebble"],
};
