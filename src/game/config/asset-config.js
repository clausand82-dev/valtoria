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
  "animated_object/fireplace_normal_01.png",
  "animated_object/fireplace_normal_02.png",
  "animated_object/fireplace_normal_03.png",
  "animated_object/fireplace_normal_04.png",
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
  mainland: { fileName: "tileset/tileset_grass.png", sourceInset: 0.025, edgeFeather: 0.12, textureAlpha: 1, visualScale: 1.18, baseAlpha: 0.18 },
  desert: { fileName: "tileset/tileset_sand.png", sourceInset: 0.025, edgeFeather: 0.12, textureAlpha: 1, visualScale: 1.18, baseAlpha: 0.18 },
  snow: { fileName: "tileset/tileset_snow.png", sourceInset: 0.025, edgeFeather: 0.12, textureAlpha: 1, visualScale: 1.18, baseAlpha: 0.18 },
  rock: { fileName: "tileset/tileset_rock.png", sourceInset: 0.025, edgeFeather: 0.12, textureAlpha: 1, visualScale: 1.18, baseAlpha: 0.18 },
  lava: { fileName: "tileset/tileset_lava.png", sourceInset: 0.025, edgeFeather: 0.12, textureAlpha: 1, visualScale: 1.18, baseAlpha: 0.18 },
  jungle: { fileName: "tileset/tileset_jungle.png", sourceInset: 0.025, edgeFeather: 0.12, textureAlpha: 1, visualScale: 1.18, baseAlpha: 0.18 },
};

export const TREE_SHEETS = {
  // Tree sheets skæres op i 4x4 celler. Hver biodome peger på det tree-sheet,
  // der passer visuelt. Hvis en biodome mangler, falder loaderen tilbage til
  // mainland i assets.js.
  mainland: "object/object_tree_normal.png",
  jungle: "object/object_tree_jungle.png",
  snow: "object/object_tree_snow.png",
  lava: "object/object_tree_dead.png",
  desert: "object/object_tree_sand.png",
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
  mainland: "foilage/foliage_mainland_001.png",
  snow: "foilage/foilage_snow_001.png",
  lava: "foilage/foilage_lava_001.png",
  rock: "foilage/foilage_rock_001.png",
  jungle: "foilage/foilage_jungle_001.png",
  desert: "foilage/foilage_sand_001.png",
  bones: "foilage/foilage_bones_001.png",
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
  firebeacon: {
    // Firebeacon er pt. kun snow. Derfor ligger der kun en snow-entry her, og
    // biome-config.js sørger for at kun snow spawner "firebeacon".
    snow: {
      frameFiles: [
        "animated_object/firebeacon_snow_animated_001.png",
        "animated_object/firebeacon_snow_animated_002.png",
        "animated_object/firebeacon_snow_animated_003.png",
        "animated_object/firebeacon_snow_animated_004.png",
        "animated_object/firebeacon_snow_animated_005.png",
        "animated_object/firebeacon_snow_animated_006.png",
        "animated_object/firebeacon_snow_animated_007.png",
        "animated_object/firebeacon_snow_animated_008.png",
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
