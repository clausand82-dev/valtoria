// Asset-konfiguration for genererede spritesheets og billedfiler.
//
// Denne fil handler kun om hvilke filer rendereren skal loade for hver kategori.
// Den bestemmer ikke i sig selv, om et object spawner i en biodome. Det styres i
// biome-config.js. Eksempel: Hvis "fireplace" ikke står i snow objects, loader
// spillet stadig fireplace-assets, men snow vil ikke naturligt spawne dem.

// Normal fireplace består af fire separate frames. Listen genbruges for alle
// biodomes der bruger samme normal-fireplace animation, så filnavne kun skal
// ændres ét sted.
const FIREPLACE_NORMAL_FRAMES = [
  "fireplace_normal_01.png",
  "fireplace_normal_02.png",
  "fireplace_normal_03.png",
  "fireplace_normal_04.png",
];

export const GROUND_SHEETS = {
  // Ground sheets skæres op i 4x4 tiles i assets.js.
  //
  // fileName: PNG i public/assets/generated.
  // sourceInset: Hvor meget af hver tilekant der ignoreres ved sampling/crop.
  //   Højere værdi kan skjule beskidte kanter, men kan også klippe for meget.
  // edgeFeather: Blødgør kanten, så tiles blender mindre hårdt mod hinanden.
  // textureAlpha: Hvor kraftigt billedteksturen tegnes oven på base-farven.
  // visualScale: Visuel opskalering af ground-texturen. 1.18 gør at den fylder
  //   lidt mere end selve isometric tile-fladen.
  // baseAlpha: Hvor meget fallback/base-farven blandes ind under teksturen.
  mainland: { fileName: "grass_test.png", sourceInset: 0.025, edgeFeather: 0.12, textureAlpha: 1, visualScale: 1.18, baseAlpha: 0.18 },
  desert: { fileName: "sand_test.png", sourceInset: 0.025, edgeFeather: 0.12, textureAlpha: 1, visualScale: 1.18, baseAlpha: 0.18 },
  snow: { fileName: "snow_test.png", sourceInset: 0.025, edgeFeather: 0.12, textureAlpha: 1, visualScale: 1.18, baseAlpha: 0.18 },
  rock: { fileName: "rock_test.png", sourceInset: 0.025, edgeFeather: 0.12, textureAlpha: 1, visualScale: 1.18, baseAlpha: 0.18 },
  lava: { fileName: "lava_test.png", sourceInset: 0.025, edgeFeather: 0.12, textureAlpha: 1, visualScale: 1.18, baseAlpha: 0.18 },
  jungle: { fileName: "jungle_test.png", sourceInset: 0.025, edgeFeather: 0.12, textureAlpha: 1, visualScale: 1.18, baseAlpha: 0.18 },
};

export const TREE_SHEETS = {
  // Tree sheets skæres op i 4x4 celler. Hver biodome peger på det tree-sheet,
  // der passer visuelt. Hvis en biodome mangler, falder loaderen tilbage til
  // mainland i assets.js.
  mainland: "tree_normal_sheet.png",
  jungle: "tree_jungle_sheet.png",
  snow: "tree_snow_sheet.png",
  lava: "tree_dead_sheet.png",
  desert: "tree_sand_sheet.png",
};

export const FOLIAGE_SHEETS = {
  // Foliage sheets skæres op i 8x8 celler.
  //
  // Nøglerne "mainland", "snow", "lava", "rock", "jungle" og "desert" skal
  // matche biome id'er. "bones" er et ekstra fælles sheet, som spawn-config.js
  // kan blande ind i alle biodomes via foliageBonesChance.
  //
  // Bemærk stavningen: flere filer hedder "foilage_*" i assets-mappen. Ret kun
  // filnavnene her, hvis de faktiske PNG-filer bliver omdøbt.
  mainland: "foliage_mainland_001.png",
  snow: "foilage_snow_001.png",
  lava: "foilage_lava_001.png",
  rock: "foilage_rock_001.png",
  jungle: "foilage_jungle_001.png",
  desert: "foilage_sand_001.png",
  bones: "foilage_bones_001.png",
};

export const OBJECT_SHEETS = {
  // Object sheets er for større world objects som building, ruin, chest,
  // firebeacon og fireplace.
  //
  // Struktur:
  // objectType: {
  //   biomeId: { fileName, rows, cols, ... }
  // }
  //
  // Hvis et object spawner i en biodome, bør der enten være en asset-entry for
  // den biodome eller en mainland fallback. For object sheets bruger draw-koden
  // normalt biome-specifik entry først og derefter mainland.
  //
  // rows/cols: Grid-størrelse i spritesheetet.
  // frameCount: Bruges når et animated sheet ikke fylder hele grid'et.
  // animated: true betyder at draw-koden vælger frames over tid.
  // frameFiles: Bruges når animationen ligger som separate PNG-filer i stedet
  // for et samlet spritesheet.
  // keyEdgeBlack/keyEdgeHalo: Ekstra baggrundsrensning for assets med mørke
  // eller farvede kanter.
  // renderScale: Finjusterer hvor stort objectet tegnes uden at ændre spawn size.
  building: {
    mainland: { fileName: "building_normal_sheet.png", rows: 4, cols: 4 },
    snow: { fileName: "building_snow_sheet.png", rows: 4, cols: 4 },
  },
  ruin: {
    mainland: { fileName: "ruin_normal_sheet.png", rows: 4, cols: 4 },
    jungle: { fileName: "ruin_jungle_sheet.png", rows: 4, cols: 4 },
    desert: { fileName: "ruin_sand_sheet.png", rows: 4, cols: 4 },
    snow: { fileName: "ruin_snow_sheet.png", rows: 4, cols: 4 },
  },
  crystal: {
    lava: { fileName: "crystal_normal_sheet.png", rows: 4, cols: 4 },
    rock: { fileName: "crystal_normal_sheet.png", rows: 4, cols: 4 },
    snow: { fileName: "crystal_snow_sheet.png", rows: 4, cols: 4 },
  },
  chest: {
    mainland: { fileName: "chest_normal_animated_sheet.png", rows: 2, cols: 4, frameCount: 6, animated: true },
    jungle: { fileName: "chest_normal_animated_sheet.png", rows: 2, cols: 4, frameCount: 6, animated: true },
    snow: { fileName: "chest_snow_animated_sheet.png", rows: 2, cols: 4, frameCount: 6, animated: true },
  },
  firebeacon: {
    // Firebeacon er pt. kun snow. Derfor ligger der kun en snow-entry her, og
    // biome-config.js sørger for at kun snow spawner "firebeacon".
    snow: {
      frameFiles: [
        "firebeacon_snow_animated_001.png",
        "firebeacon_snow_animated_002.png",
        "firebeacon_snow_animated_003.png",
        "firebeacon_snow_animated_004.png",
        "firebeacon_snow_animated_005.png",
        "firebeacon_snow_animated_006.png",
        "firebeacon_snow_animated_007.png",
        "firebeacon_snow_animated_008.png",
      ],
      animated: true,
      keyEdgeBlack: true,
      keyEdgeHalo: true,
      renderScale: 0.29,
    },
  },
  fireplace: {
    // Normal fireplace bruges i mainland, jungle og rock.
    // Snow bruger firebeacon i stedet, og lava/desert spawner ingen af dem.
    mainland: { frameFiles: FIREPLACE_NORMAL_FRAMES, animated: true },
    jungle: { frameFiles: FIREPLACE_NORMAL_FRAMES, animated: true },
    rock: { frameFiles: FIREPLACE_NORMAL_FRAMES, animated: true },
  },
};
