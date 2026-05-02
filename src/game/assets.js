import { TILE_H, TILE_W } from "./data.js";

import {
  FOLIAGE_SHEETS,
  GROUND_SHEETS,
  OBJECT_SHEETS,
  TREE_SHEETS,
} from "./config/asset-config.js";
import { buildDecaySheetId, DECAY_SET_DEFS } from "./config/decay-config.js";
import { REGION_OBJECT_SHEETS } from "./config/region-object-config.js";
import { MAP_REGION_SETS } from "./config/map-region-config.js";
import { collectRegionAssetOverrides } from "./config/region-asset-config.js";

export const ATLAS_FRAMES = {
  grassTile: { x: 8, y: 24, w: 296, h: 174 },
  pathTile: { x: 326, y: 42, w: 286, h: 164 },
  caveTile: { x: 642, y: 12, w: 292, h: 205 },
  ruinsTile: { x: 956, y: 28, w: 276, h: 166 },
  house: { x: 0, y: 230, w: 360, h: 390 },
  pine: { x: 305, y: 210, w: 270, h: 390 },
  oldOak: { x: 485, y: 220, w: 500, h: 390 },
  boulder: { x: 925, y: 275, w: 329, h: 310 },
  brokenWall: { x: 0, y: 555, w: 330, h: 300 },
  pillar: { x: 295, y: 545, w: 270, h: 305 },
  crystal: { x: 495, y: 535, w: 285, h: 305 },
  well: { x: 735, y: 545, w: 295, h: 300 },
  crate: { x: 990, y: 560, w: 264, h: 245 },
  hero: { x: 20, y: 846, w: 214, h: 202 },
  demon: { x: 278, y: 842, w: 250, h: 210 },
  skeleton: { x: 546, y: 842, w: 166, h: 214 },
  ghost: { x: 746, y: 850, w: 218, h: 180 },
  gold: { x: 978, y: 912, w: 258, h: 122 },
  gem: { x: 82, y: 1102, w: 160, h: 136 },
  arrow: { x: 372, y: 1114, w: 260, h: 88 },
  orb: { x: 724, y: 1076, w: 258, h: 116 },
};

const HERO_SHEET = {
  url: "/assets/generated/hero-animated-sheet.png",
  rows: 4,
  cols: 8,
};

// Per-monster sheet configurations.
// Each entry describes one monster type's sprite sheet.
// sequences: array of { name, row, frames } â€” maps state names to sheet rows.
// scale, shadowW, shadowH, shadowAlpha, yOffset: visual tuning per monster.
const MONSTER_SHEETS = [
  {
    id: "demon",
    url: "/assets/generated/mobs/demon_animated_sheet.png",
    rows: 3,
    cols: 4,
    sequences: [
      { name: "idle",   row: 0, frames: 4 },
      { name: "walk",   row: 1, frames: 4 },
      { name: "attack", row: 2, frames: 4 },
    ],
    scale: 0.58,
    shadowW: 34, shadowH: 11, shadowAlpha: 0.38,
    yOffset: 46,
  },
  {
    id: "skeleton",
    url: "/assets/generated/mobs/skeleton_animated_sheet.png",
    rows: 3,
    cols: 4,
    sequences: [
      { name: "idle",   row: 0, frames: 4 },
      { name: "walk",   row: 1, frames: 4 },
      { name: "attack", row: 2, frames: 4 },
    ],
    scale: 0.44,
    shadowW: 34, shadowH: 11, shadowAlpha: 0.38,
    yOffset: 46,
  },
  {
    id: "ghost",
    url: "/assets/generated/mobs/ghost_animated_sheet.png",
    rows: 3,
    cols: 4,
    sequences: [
      { name: "idle",   row: 0, frames: 4 },
      { name: "walk",   row: 1, frames: 4 },
      { name: "attack", row: 2, frames: 4 },
    ],
    scale: 0.4,
    shadowW: 26, shadowH: 8, shadowAlpha: 0.22,
    yOffset: 38,
  },
  {
    id: "scorpion",
    url: "/assets/generated/mobs/scorpion_animated_sheet.png",
    rows: 3,
    cols: 4,
    sequences: [
      { name: "idle",   row: 0, frames: 4 },
      { name: "walk",   row: 1, frames: 4 },
      { name: "attack", row: 2, frames: 4 },
    ],
    scale: 0.44,
    shadowW: 28, shadowH: 9, shadowAlpha: 0.34,
    yOffset: 38,
  },
  {
    id: "snake",
    url: "/assets/generated/mobs/snake_animated_sheet.png",
    rows: 3,
    cols: 4,
    sequences: [
      { name: "idle",   row: 0, frames: 4 },
      { name: "walk",   row: 1, frames: 4 },
      { name: "attack", row: 2, frames: 4 },
    ],
    scale: 0.42,
    shadowW: 26, shadowH: 8, shadowAlpha: 0.3,
    yOffset: 37,
  },
  {
    id: "spider",
    url: "/assets/generated/mobs/spider_animated_sheet.png",
    rows: 3,
    cols: 4,
    sequences: [
      { name: "idle",   row: 0, frames: 4 },
      { name: "walk",   row: 1, frames: 4 },
      { name: "attack", row: 2, frames: 4 },
    ],
    scale: 0.43,
    shadowW: 30, shadowH: 10, shadowAlpha: 0.34, shadowY: 17,
    yOffset: 38,
  },
    {
    id: "minispider",
    url: "/assets/generated/mobs/spider_animated_sheet.png",
    rows: 3,
    cols: 4,
    sequences: [
      { name: "idle",   row: 0, frames: 4 },
      { name: "walk",   row: 1, frames: 4 },
      { name: "attack", row: 2, frames: 4 },
    ],
    scale: 0.10,
    shadowW: 7, shadowH: 2, shadowAlpha: 0.34, shadowY: 4,
    yOffset: 9,
  },
  {
    id: "mediumspider",
    url: "/assets/generated/mobs/spider_animated_sheet.png",
    rows: 3,
    cols: 4,
    sequences: [
      { name: "idle",   row: 0, frames: 4 },
      { name: "walk",   row: 1, frames: 4 },
      { name: "attack", row: 2, frames: 4 },
    ],
    scale: 0.20,
    shadowW: 14, shadowH: 5, shadowAlpha: 0.34, shadowY: 8,
    yOffset: 18,
  },
  {
    id: "largespider",
    url: "/assets/generated/mobs/spider_animated_sheet.png",
    rows: 3,
    cols: 4,
    sequences: [
      { name: "idle",   row: 0, frames: 4 },
      { name: "walk",   row: 1, frames: 4 },
      { name: "attack", row: 2, frames: 4 },
    ],
    scale: 0.55,
    shadowW: 38, shadowH: 13, shadowAlpha: 0.34, shadowY: 22,
    yOffset: 49,
  },
  {
    id: "wolf",
    url: "/assets/generated/mobs/wolf_animated_sheet.png",
    rows: 3,
    cols: 4,
    sequences: [
      { name: "idle",   row: 0, frames: 4 },
      { name: "walk",   row: 1, frames: 4 },
      { name: "attack", row: 2, frames: 4 },
    ],
    scale: 0.48,
    shadowW: 32, shadowH: 10, shadowAlpha: 0.36,
    yOffset: 39,
  },
];

const OBJECT_FRAME = {
  house: "house",
  pine: "pine",
  "old-oak": "oldOak",
  boulder: "boulder",
  stone: "boulder",
  rubble: "boulder",
  "broken-wall": "brokenWall",
  pillar: "pillar",
  obelisk: "pillar",
  crystal: "crystal",
  well: "well",
  crate: "crate",
};

export function loadGeneratedAtlas() {
  return Promise.all([
    loadChromaImage("/assets/generated/runebound-atlas-source.png"),
    loadGroundSheets(),
    loadTreeSheets(),
    loadWaterSheet(),
    loadFoliageSheet(),
    loadDecaySheets(),
    loadItemSheet(),
    loadResourceSheet(),
    loadArmorSheet(),
    loadObjectSheets(),
  ]).then(([
    canvas,
    groundSheets,
    treeSheets,
    waterSheet,
    foliageSheet,
    decaySheets,
    itemSheet,
    resourceSheet,
    armorSheet,
    objectSheets,
  ]) => ({
    canvas,
    frames: ATLAS_FRAMES,
    sprites: makeAtlasSprites(canvas, ATLAS_FRAMES),
    groundSheets,
    treeSheets,
    waterSheet,
    foliageSheet,
    decaySheets,
    itemSheet,
    resourceSheet,
    armorSheet,
    objectSheets,
  }));
}

export function loadAnimationSheets() {
  // Deduplicate URLs so shared sheets (skeleton+ghost) are only loaded once.
  const urlMap = new Map();
  for (const cfg of MONSTER_SHEETS) {
    if (!urlMap.has(cfg.url)) urlMap.set(cfg.url, loadChromaImage(cfg.url));
  }

  return Promise.all([
    loadChromaImage(HERO_SHEET.url),
    loadChromaImage("/assets/generated/hero_cast_sheet.png"),
    ...urlMap.values(),
  ]).then(([heroCanvas, heroCastCanvas, ...monsterCanvases]) => {
    const urlToCanvas = new Map();
    let i = 0;
    for (const url of urlMap.keys()) urlToCanvas.set(url, monsterCanvases[i++]);

    const monsters = {};
    for (const cfg of MONSTER_SHEETS) {
      const canvas = urlToCanvas.get(cfg.url);
      monsters[cfg.id] = {
        sheet: makeAnimationSheet(canvas, cfg.rows, cfg.cols, "monsters"),
        cfg,
      };
    }

    return {
      hero: makeAnimationSheet(heroCanvas, HERO_SHEET.rows, HERO_SHEET.cols, "hero"),
      heroCast: makeAnimationSheet(heroCastCanvas, 1, 8, "hero"),
      monsters,
    };
  });
}

function loadChromaImage(src, options = {}) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(image, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const keyGreen = g > 145 && g > r * 1.55 && g > b * 1.55;
        if (keyGreen) {
          const strength = Math.min(1, (g - Math.max(r, b) - 45) / 95);
          data[i + 3] = Math.max(0, Math.floor(data[i + 3] * (1 - strength)));
          data[i + 1] = Math.min(data[i + 1], Math.max(r, b) + 30);
        }
      }

      ctx.putImageData(imageData, 0, 0);
      if (options.keyEdgeBlack) {
        removeEdgeBlackBackground(canvas, options.blackThreshold ?? 24);
      }
      if (options.keyEdgeHalo) {
        removeEdgeHalo(canvas);
      }
      resolve(canvas);
    };
    image.onerror = () => reject(new Error(`Image load failed: ${src}`));
    image.src = src;
  });
}

function removeEdgeBlackBackground(canvas, threshold = 24) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  const { width, height } = canvas;
  const visited = new Uint8Array(width * height);
  const queue = [];

  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const index = y * width + x;
    if (visited[index]) return;
    const dataIndex = index * 4;
    const isBlack = data[dataIndex + 3] > 0
      && data[dataIndex] <= threshold
      && data[dataIndex + 1] <= threshold
      && data[dataIndex + 2] <= threshold;
    if (!isBlack) return;
    visited[index] = 1;
    queue.push(index);
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  for (let i = 0; i < queue.length; i += 1) {
    const index = queue[i];
    const x = index % width;
    const y = Math.floor(index / width);
    data[index * 4 + 3] = 0;
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  ctx.putImageData(imageData, 0, 0);
}

function removeEdgeHalo(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  const { width, height } = canvas;
  const remove = [];

  const isTransparent = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return true;
    return data[(y * width + x) * 4 + 3] < 16;
  };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const alpha = data[index + 3];
      if (alpha < 16) continue;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const greenCyanHalo = r < 125 && g > 95 && b > 65 && g > r * 1.18 && b > r * 1.04;
      if (!greenCyanHalo) continue;
      if (
        isTransparent(x + 1, y)
        || isTransparent(x - 1, y)
        || isTransparent(x, y + 1)
        || isTransparent(x, y - 1)
        || isTransparent(x + 1, y + 1)
        || isTransparent(x - 1, y - 1)
        || isTransparent(x + 1, y - 1)
        || isTransparent(x - 1, y + 1)
      ) {
        remove.push(index);
      }
    }
  }

  for (const index of remove) {
    data[index + 3] = 0;
  }

  ctx.putImageData(imageData, 0, 0);
}

function loadRawImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);
      resolve(canvas);
    };
    image.onerror = () => reject(new Error(`Image load failed: ${src}`));
    image.src = src;
  });
}

function loadGroundSheets() {
  const regionAssetOverrides = collectRegionAssetOverrides(MAP_REGION_SETS);
  const customGroundSpecs = regionAssetOverrides.groundSheets.map((entry) => ({
    biomeId: entry.sheetId,
    fileName: entry.fileName,
    sourceInset: 0.025,
    edgeFeather: 0.12,
    textureAlpha: 1,
    visualScale: 1.18,
    baseAlpha: 0.18,
  }));
  const biomeGroundSpecs = Object.entries(GROUND_SHEETS).map(([biomeId, config]) => ({
    biomeId,
    fileName: typeof config === "string" ? config : config.fileName,
    sourceInset: typeof config === "string" ? 0 : config.sourceInset ?? 0,
    edgeFeather: typeof config === "string" ? 0 : config.edgeFeather ?? 0,
    textureAlpha: typeof config === "string" ? 1 : config.textureAlpha ?? 1,
    visualScale: typeof config === "string" ? 1 : config.visualScale ?? 1,
    baseAlpha: typeof config === "string" ? 1 : config.baseAlpha ?? 1,
  }));

  return Promise.all(
    [...biomeGroundSpecs, ...customGroundSpecs].map((spec) => {
      return loadGroundImage(`/assets/generated/${spec.fileName}`).then((canvas) => [spec.biomeId, makeGroundSheet(canvas, {
        sourceInset: spec.sourceInset,
        edgeFeather: spec.edgeFeather,
        textureAlpha: spec.textureAlpha,
        visualScale: spec.visualScale,
        baseAlpha: spec.baseAlpha,
      })])
        .catch((error) => {
          console.warn(`Ground sheet load failed for ${spec.biomeId}: ${spec.fileName}`, error);
          return [spec.biomeId, null];
        });
    }),
  ).then((entries) => {
    const sheets = Object.fromEntries(entries);
    if (!sheets.mainland) throw new Error("Required mainland ground sheet failed to load");
    for (const [id, sheet] of Object.entries(sheets)) {
      if (!sheet) sheets[id] = sheets.mainland;
    }
    return sheets;
  });
}

function loadWaterSheet() {
  return loadRawImage("/assets/generated/tileset/tileset_water.png")
    .then((canvas) => makeTileSheet(canvas, 4, 4))
    .catch((error) => {
      console.warn("Water sheet load failed: tileset/tileset_water.png", error);
      return null;
    });
}

function loadTreeSheets() {
  const urlMap = new Map();
  for (const fileName of new Set(Object.values(TREE_SHEETS))) {
    urlMap.set(fileName, loadChromaImage(`/assets/generated/${fileName}`).then(makeTreeSheet));
  }

  return Promise.all(
    Object.entries(TREE_SHEETS).map(([biomeId, fileName]) => (
      urlMap.get(fileName)
        .then((sheet) => [biomeId, sheet])
        .catch((error) => {
          console.warn(`Tree sheet load failed for ${biomeId}: ${fileName}`, error);
          return [biomeId, null];
        })
    )),
  ).then((entries) => {
    const sheets = Object.fromEntries(entries);
    const fallback = sheets.mainland;
    for (const [id, sheet] of Object.entries(sheets)) {
      if (!sheet) sheets[id] = fallback;
    }
    return sheets;
  });
}

function normalizeFoliageSheetSpec(id, config, defaultGrid = 8) {
  if (typeof config === "string") {
    return {
      id,
      fileName: config,
      rows: defaultGrid,
      cols: defaultGrid,
    };
  }
  return {
    id,
    fileName: config?.fileName,
    rows: Number(config?.rows) > 0 ? Math.floor(Number(config.rows)) : defaultGrid,
    cols: Number(config?.cols) > 0 ? Math.floor(Number(config.cols)) : defaultGrid,
  };
}

function loadFoliageSheet() {
  const regionAssetOverrides = collectRegionAssetOverrides(MAP_REGION_SETS);
  const biomeSpecs = Object.entries(FOLIAGE_SHEETS).map(([id, config]) => normalizeFoliageSheetSpec(id, config, 8));
  const customSpecs = regionAssetOverrides.foliageSheets.map((entry) => ({
    id: entry.sheetId,
    fileName: entry.fileName,
    rows: entry.rows,
    cols: entry.cols,
  }));

  return Promise.all(
    [...biomeSpecs, ...customSpecs].map((spec) => (
      loadChromaImage(`/assets/generated/${spec.fileName}`)
        .then((canvas) => makeFoliageSheet(canvas, { rows: spec.rows, cols: spec.cols }))
        .then((sheet) => [spec.id, sheet])
        .catch((error) => {
          console.warn(`Foliage sheet load failed for ${spec.id}: ${spec.fileName}`, error);
          return [spec.id, null];
        })
    )),
  ).then((entries) => {
    const sheets = Object.fromEntries(entries);
    const fallback = sheets.mainland ?? Object.values(sheets).find(Boolean) ?? null;
    for (const id of Object.keys(FOLIAGE_SHEETS)) {
      if (!sheets[id]) sheets[id] = fallback;
    }
    return {
      sheets,
      cells: fallback?.cells ?? [],
    };
  });
}

function loadItemSheet() {
  return Promise.resolve(null);
}

function loadResourceSheet() {
  return Promise.resolve({
    resources: null,
    gemstones: null,
  });
}

function loadArmorSheet() {
  return Promise.resolve(null);
}

function loadDecaySheets() {
  const entries = Object.entries(DECAY_SET_DEFS ?? {});
  if (!entries.length) return Promise.resolve({});

  return Promise.all(entries.map(([id, def]) => {
    const rows = Math.max(1, Math.floor(Number(def?.rows) || 4));
    const cols = Math.max(1, Math.floor(Number(def?.cols) || 4));
    const sheetId = buildDecaySheetId(id);
    return loadChromaImage(`/assets/generated/${def.fileName}`)
      .then((canvas) => [sheetId, {
        ...makeTileSheet(canvas, rows, cols),
        renderScale: Number.isFinite(Number(def?.renderScale)) ? Number(def.renderScale) : 1,
      }])
      .catch((error) => {
        console.warn(`Decay sheet load failed: ${id} (${def.fileName})`, error);
        return [sheetId, null];
      });
  })).then((loaded) => {
    const sheets = {};
    for (const [sheetId, sheet] of loaded) {
      if (sheet) sheets[sheetId] = sheet;
    }
    return sheets;
  });
}

function loadObjectSheets() {
  const mergedObjectSheets = {
    ...OBJECT_SHEETS,
    ...REGION_OBJECT_SHEETS,
  };
  const urlMap = new Map();
  for (const biomeSheets of Object.values(mergedObjectSheets)) {
    for (const config of Object.values(biomeSheets)) {
      const key = getObjectSheetConfigKey(config);
      if (!urlMap.has(key)) {
        urlMap.set(key, loadObjectSheetConfig(config));
      }
    }
  }

  const entries = [];
  for (const [type, biomeSheets] of Object.entries(mergedObjectSheets)) {
    for (const [biomeId, config] of Object.entries(biomeSheets)) {
      const key = getObjectSheetConfigKey(config);
      entries.push(
        urlMap.get(key).then((sheet) => [type, biomeId, sheet, config]),
      );
    }
  }

  return Promise.all(entries).then((loaded) => {
    const sheets = {};
    for (const [type, biomeId, sheet, config] of loaded) {
      if (!sheets[type]) sheets[type] = {};
      if (sheet) {
        sheets[type][biomeId] = {
          ...sheet,
          animated: config.animated ?? false,
          frameOffsets: config.frameOffsets,
          renderScale: config.renderScale,
        };
      }
    }
    return sheets;
  });
}

function getObjectSheetConfigKey(config) {
  if (config.frameFiles) {
    return `frames:${config.frameFiles.join("|")}`;
  }
  return `${config.fileName}:${config.rows}x${config.cols}`;
}

function loadObjectSheetConfig(config) {
  if (config.frameFiles) {
    return Promise.all(config.frameFiles.map((fileName) => loadChromaImage(`/assets/generated/${fileName}`, {
      keyEdgeBlack: config.keyEdgeBlack ?? false,
      keyEdgeHalo: config.keyEdgeHalo ?? false,
      blackThreshold: config.blackThreshold,
    })))
      .then((frames) => makeObjectFrameSheet(frames, {
        animated: config.animated ?? false,
        normalizeAnimation: config.normalizeAnimation ?? true,
      }))
      .catch((error) => {
        console.warn(`Object frame sequence load failed: ${config.frameFiles.join(", ")}`, error);
        return null;
      });
  }

  return loadChromaImage(`/assets/generated/${config.fileName}`)
    .then((canvas) => makeObjectSheet(canvas, config.rows, config.cols, {
      animated: config.animated ?? false,
      frameCount: config.frameCount,
      normalizeAnimation: config.normalizeAnimation ?? true,
    }))
    .catch((error) => {
      console.warn(`Object sheet load failed: ${config.fileName}`, error);
      return null;
    });
}

function loadGroundImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(image, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const neonKey = g > 185 && r < 80 && b < 90 && g > r * 2.5 && g > b * 2.2;
        if (neonKey) data[i + 3] = 0;
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas);
    };
    image.onerror = () => reject(new Error(`Image load failed: ${src}`));
    image.src = src;
  });
}

function makeGroundSheet(canvas, options = {}) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const rows = 4;
  const cols = 4;
  const frames = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = Math.round((col * canvas.width) / cols);
      const y = Math.round((row * canvas.height) / rows);
      const nextX = Math.round(((col + 1) * canvas.width) / cols);
      const nextY = Math.round(((row + 1) * canvas.height) / rows);
      frames.push({
        ...cropGroundFrame(imageData.data, canvas.width, {
        x,
        y,
        w: nextX - x,
        h: nextY - y,
        }),
        index: row * cols + col,
      });
    }
  }
  return {
    canvas,
    frames,
    rows,
    cols,
    sourceInset: options.sourceInset ?? 0,
    edgeFeather: options.edgeFeather ?? 0,
    textureAlpha: options.textureAlpha ?? 1,
    visualScale: options.visualScale ?? 1,
    baseAlpha: options.baseAlpha ?? 1,
    tileCache: new Map(),
  };
}

function makeTreeSheet(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const rows = 4;
  const cols = 4;
  const cells = [];
  const cellW = canvas.width / cols;
  const cellH = canvas.height / rows;
  const edgeMargin = Math.round(Math.min(cellW, cellH) * 0.035);
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = Math.round((col * canvas.width) / cols);
      const y = Math.round((row * canvas.height) / rows);
      const nextX = Math.round(((col + 1) * canvas.width) / cols);
      const nextY = Math.round(((row + 1) * canvas.height) / rows);
      const rect = {
        x,
        y,
        w: nextX - x,
        h: nextY - y,
      };
      const bounds = alphaBoundsFromImageData(imageData.data, canvas.width, rect);
      if (!isUsableTreeCell(bounds, rect, edgeMargin)) continue;

      const sprite = isolateSprite(canvas, {
        x,
        y,
        w: nextX - x,
        h: nextY - y,
      }, {
        minArea: 220,
        // Keep only the main connected tree component.
        // This prevents tiny detached scraps from the source sheet
        // from hovering over units in front of/behind the tree.
        keepNearby: false,
      });
      cells.push({
        sprite: normalizeTreeSprite(sprite),
        index: row * cols + col,
      });
    }
  }
  return { canvas, rows, cols, cells };
}

function makeFoliageSheet(canvas, options = {}) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const rows = Math.max(1, Math.floor(Number(options.rows) || 8));
  const cols = Math.max(1, Math.floor(Number(options.cols) || 8));
  const gridScale = Math.min(rows, cols) / 8;
  const renderScale = Number.isFinite(Number(options.renderScale))
    ? Number(options.renderScale)
    : Math.max(0.35, Math.min(1, gridScale));
  const cells = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = Math.round((col * canvas.width) / cols);
      const y = Math.round((row * canvas.height) / rows);
      const nextX = Math.round(((col + 1) * canvas.width) / cols);
      const nextY = Math.round(((row + 1) * canvas.height) / rows);
      const rect = {
        x,
        y,
        w: nextX - x,
        h: nextY - y,
      };
      const bounds = alphaBoundsFromImageData(imageData.data, canvas.width, rect);
      if (!isUsableFoliageCell(bounds, rect)) continue;
      cells.push({
        sprite: isolateSprite(canvas, rect, {
          minArea: 24,
          keepNearby: true,
          nearbyRadiusMult: 1.25,
          nearbyRatio: 0.012,
        }),
        index: row * cols + col,
      });
    }
  }

  return { canvas, rows, cols, cells, renderScale };
}

function makeItemSheet(canvas, rows, cols) {
  const cells = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = Math.round((col * canvas.width) / cols);
      const y = Math.round((row * canvas.height) / rows);
      const nextX = Math.round(((col + 1) * canvas.width) / cols);
      const nextY = Math.round(((row + 1) * canvas.height) / rows);
      cells.push({
        sprite: isolateSprite(canvas, {
          x,
          y,
          w: nextX - x,
          h: nextY - y,
        }, {
          minArea: 80,
          keepNearby: true,
          nearbyRadiusMult: 1.1,
          nearbyRatio: 0.02,
        }),
        index: row * cols + col,
      });
    }
  }

  return { canvas, rows, cols, cells };
}

function makeTileSheet(canvas, rows, cols) {
  const cells = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = Math.round((col * canvas.width) / cols);
      const y = Math.round((row * canvas.height) / rows);
      const nextX = Math.round(((col + 1) * canvas.width) / cols);
      const nextY = Math.round(((row + 1) * canvas.height) / rows);
      cells.push({
        x,
        y,
        w: nextX - x,
        h: nextY - y,
        index: row * cols + col,
      });
    }
  }
  return { canvas, rows, cols, cells };
}

function makeObjectSheet(canvas, rows, cols, options = {}) {
  const cells = [];
  const frameCount = options.frameCount ?? rows * cols;
  const samplePadX = 8;
  const samplePadTop = 16;
  const samplePadBottom = 8;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (cells.length >= frameCount) break;
      const x = Math.round((col * canvas.width) / cols);
      const y = Math.round((row * canvas.height) / rows);
      const nextX = Math.round(((col + 1) * canvas.width) / cols);
      const nextY = Math.round(((row + 1) * canvas.height) / rows);
      if (options.animated) {
        const sprite = document.createElement("canvas");
        sprite.width = nextX - x;
        sprite.height = nextY - y;
        const ctx = sprite.getContext("2d");
        ctx.drawImage(canvas, x, y, sprite.width, sprite.height, 0, 0, sprite.width, sprite.height);
        cells.push({
          sprite,
          index: row * cols + col,
        });
        continue;
      }

      const cellW = nextX - x;
      const cellH = nextY - y;
      const sampleX = Math.max(0, x - samplePadX);
      const sampleY = Math.max(0, y - samplePadTop);
      const sampleW = Math.min(canvas.width - sampleX, cellW + samplePadX * 2);
      const sampleH = Math.min(canvas.height - sampleY, cellH + samplePadTop + samplePadBottom);
      const sprite = isolateSprite(canvas, {
        x: sampleX,
        y: sampleY,
        w: sampleW,
        h: sampleH,
      }, {
        minArea: 120,
        keepNearby: false,
        focusX: x + cellW * 0.5 - sampleX,
        focusY: y + cellH * 0.78 - sampleY,
        focus2X: x + cellW * 0.5 - sampleX,
        focus2Y: y + cellH * 0.9 - sampleY,
      });
      cells.push({
        sprite: normalizeObjectSprite(sprite),
        index: row * cols + col,
      });
    }
    if (cells.length >= frameCount) break;
  }

  if (options.animated && options.normalizeAnimation !== false) normalizeRawObjectAnimationCells(cells);
  return { canvas, rows, cols, cells };
}

function makeObjectFrameSheet(frames, options = {}) {
  const rows = 1;
  const cols = frames.length;
  const cellW = Math.max(...frames.map((frame) => frame.width));
  const cellH = Math.max(...frames.map((frame) => frame.height));
  const canvas = document.createElement("canvas");
  canvas.width = cellW * cols;
  canvas.height = cellH;
  const ctx = canvas.getContext("2d");
  const cells = frames.map((frame, index) => {
    const sprite = document.createElement("canvas");
    sprite.width = cellW;
    sprite.height = cellH;
    const sctx = sprite.getContext("2d");
    const x = Math.round((cellW - frame.width) * 0.5);
    const y = cellH - frame.height;
    sctx.drawImage(frame, x, y);
    ctx.drawImage(sprite, index * cellW, 0);
    return { sprite, index };
  });

  if (options.animated && options.normalizeAnimation !== false) normalizeRawObjectAnimationCells(cells);
  return { canvas, rows, cols, cells };
}

function normalizeRawObjectAnimationCells(cells) {
  if (!cells.length) return;
  const pad = 8;
  const frameData = cells.map((cell) => ({
    cell,
    anchor: detectObjectBaseAnchorFromCanvas(cell.sprite),
  }));
  let maxLeft = 0;
  let maxRight = 0;
  let maxTop = 0;
  let maxBottom = 0;

  for (const { cell, anchor } of frameData) {
    maxLeft = Math.max(maxLeft, anchor.x);
    maxRight = Math.max(maxRight, cell.sprite.width - anchor.x);
    maxTop = Math.max(maxTop, anchor.y);
    maxBottom = Math.max(maxBottom, cell.sprite.height - anchor.y);
  }

  const halfW = Math.ceil(Math.max(maxLeft, maxRight)) + pad;
  const width = halfW * 2;
  const height = Math.ceil(maxTop + maxBottom) + pad * 2;
  const target = { x: halfW, y: Math.ceil(maxTop) + pad };

  for (const { cell, anchor } of frameData) {
    const normalized = document.createElement("canvas");
    normalized.width = width;
    normalized.height = height;
    const ctx = normalized.getContext("2d");
    ctx.drawImage(cell.sprite, target.x - anchor.x, target.y - anchor.y);
    cell.sprite = normalized;
  }
}

function detectObjectBaseAnchorFromCanvas(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let startY = Math.floor(canvas.height * 0.58);
  const xs = [];
  let maxY = -1;

  for (let y = startY; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const alpha = data[(y * canvas.width + x) * 4 + 3];
      if (alpha <= 80) continue;
      maxY = Math.max(maxY, y);
    }
  }

  if (maxY < 0) {
    startY = 0;
    for (let y = startY; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        const alpha = data[(y * canvas.width + x) * 4 + 3];
        if (alpha <= 80) continue;
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxY < 0) return { x: canvas.width / 2, y: canvas.height };

  const bandTop = Math.max(startY, maxY - Math.max(10, Math.floor(canvas.height * 0.08)));
  for (let y = bandTop; y <= maxY; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const alpha = data[(y * canvas.width + x) * 4 + 3];
      if (alpha > 80) xs.push(x);
    }
  }

  if (xs.length < 16) {
    return { x: canvas.width / 2, y: canvas.height };
  }

  return {
    x: trimmedMean(xs, 0.2, 0.8),
    y: maxY,
  };
}

function normalizeObjectAnimationCells(cells) {
  if (!cells.length) return;
  const padX = 10;
  const padTop = 10;
  const padBottom = 4;
  let maxContentWidth = 0;
  let maxContentHeight = 0;
  const frameData = [];

  for (const cell of cells) {
    const ctx = cell.sprite.getContext("2d", { willReadFrequently: true });
    const { data } = ctx.getImageData(0, 0, cell.sprite.width, cell.sprite.height);
    const bounds = alphaBoundsFromCanvasData(data, cell.sprite.width, cell.sprite.height);
    frameData.push({ cell, bounds });
    maxContentWidth = Math.max(maxContentWidth, bounds.w);
    maxContentHeight = Math.max(maxContentHeight, bounds.h);
  }

  const width = maxContentWidth + padX * 2;
  const height = maxContentHeight + padTop + padBottom;
  for (const { cell, bounds } of frameData) {
    const normalized = document.createElement("canvas");
    normalized.width = width;
    normalized.height = height;
    const ctx = normalized.getContext("2d");
    ctx.drawImage(
      cell.sprite,
      bounds.x,
      bounds.y,
      bounds.w,
      bounds.h,
      padX,
      height - padBottom - maxContentHeight,
      maxContentWidth,
      maxContentHeight,
    );
    cell.sprite = normalized;
  }
}

function normalizeObjectSprite(sprite) {
  const padX = 18;
  const padTop = 20;
  const padBottom = 8;
  const canvas = document.createElement("canvas");
  canvas.width = sprite.width + padX * 2;
  canvas.height = sprite.height + padTop + padBottom;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(sprite, padX, padTop);
  return canvas;
}

function normalizeTreeSprite(sprite) {
  const padX = 28;
  const padTop = 34;
  const padBottom = 12;
  const canvas = document.createElement("canvas");
  canvas.width = sprite.width + padX * 2;
  canvas.height = sprite.height + padTop + padBottom;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(sprite, padX, padTop);
  return canvas;
}

function isValidTreeSprite(sprite, cellW, cellH) {
  return sprite.width > cellW * 0.22 && sprite.height > cellH * 0.38;
}

function alphaBoundsFromImageData(data, imageWidth, rect) {
  let minX = rect.w;
  let minY = rect.h;
  let maxX = -1;
  let maxY = -1;
  let count = 0;
  for (let y = rect.y; y < rect.y + rect.h; y += 1) {
    for (let x = rect.x; x < rect.x + rect.w; x += 1) {
      if (data[(y * imageWidth + x) * 4 + 3] <= 45) continue;
      const lx = x - rect.x;
      const ly = y - rect.y;
      count += 1;
      if (lx < minX) minX = lx;
      if (ly < minY) minY = ly;
      if (lx > maxX) maxX = lx;
      if (ly > maxY) maxY = ly;
    }
  }
  if (maxX < 0) return null;
  return {
    x: minX,
    y: minY,
    w: maxX - minX + 1,
    h: maxY - minY + 1,
    count,
    touchesLeft: minX <= 0,
    touchesTop: minY <= 0,
    touchesRight: maxX >= rect.w - 1,
  };
}

function isUsableTreeCell(bounds, rect, edgeMargin) {
  if (!bounds) return false;
  if (bounds.count < 1800) return false;
  if (bounds.w < rect.w * 0.22 || bounds.h < rect.h * 0.5) return false;
  if (bounds.x < edgeMargin || bounds.y < edgeMargin || bounds.x + bounds.w > rect.w - edgeMargin) return false;
  return true;
}

function isUsableFoliageCell(bounds, rect) {
  if (!bounds) return false;
  if (bounds.count < 80) return false;
  if (bounds.w < rect.w * 0.08 || bounds.h < rect.h * 0.06) return false;
  return true;
}

function cropGroundFrame(data, imageWidth, rect) {
  let minX = rect.x + rect.w;
  let minY = rect.y + rect.h;
  let maxX = rect.x;
  let maxY = rect.y;

  for (let y = rect.y; y < rect.y + rect.h; y += 1) {
    for (let x = rect.x; x < rect.x + rect.w; x += 1) {
      if (data[(y * imageWidth + x) * 4 + 3] <= 24) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX <= minX || maxY <= minY) return rect;
  const pad = 2;
  const x = Math.max(rect.x, minX - pad);
  const y = Math.max(rect.y, minY - pad);
  const right = Math.min(rect.x + rect.w, maxX + pad + 1);
  const bottom = Math.min(rect.y + rect.h, maxY + pad + 1);
  return {
    x,
    y,
    w: right - x,
    h: bottom - y,
  };
}

function drawSheetFrame(ctx, sheet, row, col, x, y, options = {}) {
  if (!sheet?.canvas) return false;
  const cell = sheet.cells?.[row]?.[col];
  const useRawCell = options.rawCell;
  const source = useRawCell ? sheet.canvas : (cell?.sprite ?? sheet.canvas);
  const anchor = options.stabilize ? options.anchor ?? cell?.anchor ?? sheet.anchors?.[row] : null;
  const sx = useRawCell ? (cell ? cell.x : col * sheet.cellW) : (cell?.sprite ? 0 : (cell ? cell.x : col * sheet.cellW));
  const sy = useRawCell ? (cell ? cell.y : row * sheet.cellH) : (cell?.sprite ? 0 : (cell ? cell.y : row * sheet.cellH));
  const sw = useRawCell ? cell?.w ?? sheet.cellW : (cell?.sprite ? cell.sprite.width : cell?.w ?? sheet.cellW);
  const sh = useRawCell ? cell?.h ?? sheet.cellH : (cell?.sprite ? cell.sprite.height : cell?.h ?? sheet.cellH);
  const scale = options.scale ?? 1;
  const width = (options.width ?? sw) * scale;
  const height = (options.height ?? sh) * scale;
  const anchorX = options.anchorX ?? 0.5;
  const anchorY = options.anchorY ?? 1;
  const dx = anchor ? -(anchor.x - (useRawCell ? 0 : cell?.spriteOffsetX ?? 0)) * scale : -width * anchorX;
  const dy = anchor ? -(anchor.y - (useRawCell ? 0 : cell?.spriteOffsetY ?? 0)) * scale : -height * anchorY;
  ctx.save();
  ctx.translate(x, y);
  if (options.rotation) ctx.rotate(options.rotation);
  ctx.scale((options.flipX ? -1 : 1) * (options.scaleX ?? 1), options.scaleY ?? 1);
  if (options.alpha !== undefined) ctx.globalAlpha *= options.alpha;
  ctx.drawImage(source, sx, sy, sw, sh, dx, dy, width, height);
  ctx.restore();
  return true;
}

function makeAnimationSheet(canvas, rows, cols, mode) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const cells = [];
  for (let row = 0; row < rows; row += 1) {
    cells[row] = [];
    for (let col = 0; col < cols; col += 1) {
      const x = Math.round((col * canvas.width) / cols);
      const y = Math.round((row * canvas.height) / rows);
      const nextX = Math.round(((col + 1) * canvas.width) / cols);
      const nextY = Math.round(((row + 1) * canvas.height) / rows);
      cells[row][col] = {
        x,
        y,
        w: nextX - x,
        h: nextY - y,
      };

      // Hero and monster cells: x/y/w/h only at this stage.
      // Full sprite extraction and normalization is done per-row in the passes below.
    }
  }

  if (mode === "hero" && rows === 1) {
    // Dedicated cast sheet: keep extraction deterministic.
    // Do NOT use isolateSprite here because variable crop bounds across frames
    // can create vertical drift even with stabilized anchors.
    const normPad = 14;
    const sequenceAnchors = cells.map(() => [null, null, null]);

    for (let row = 0; row < rows; row += 1) {
      const frameData = [];

      // Pass 1 -------------------------------------------------------
      for (let col = 0; col < cols; col += 1) {
        const cell = cells[row][col];
        const { x, y, w: cw, h: ch } = cell;
        const footInCell = detectCellFeetCenter(imageData.data, canvas.width, x, y, cw, ch);
        const sprite = document.createElement("canvas");
        sprite.width = cw;
        sprite.height = ch;
        const sctx = sprite.getContext("2d");
        sctx.drawImage(canvas, x, y, cw, ch, 0, 0, cw, ch);
        frameData[col] = { sprite, footX: footInCell.x, footY: footInCell.y };
      }

      // Pass 2 -------------------------------------------------------
      const footXVals = frameData.map((f) => f.footX).sort((a, b) => a - b);
      const footYVals = frameData.map((f) => f.footY).sort((a, b) => a - b);
      const medianX = footXVals[Math.floor(footXVals.length / 2)];
      const medianY = footYVals[Math.floor(footYVals.length / 2)];
      for (const fd of frameData) {
        fd.footX = medianX;
        fd.footY = medianY;
      }
      let maxLeft = 0;
      let maxRight = 0;
      let maxTop = 0;
      let maxBottom = 0;
      for (const { sprite, footX, footY } of frameData) {
        maxLeft = Math.max(maxLeft, footX);
        maxRight = Math.max(maxRight, sprite.width - footX);
        maxTop = Math.max(maxTop, footY);
        maxBottom = Math.max(maxBottom, sprite.height - footY);
      }
      const halfW = Math.ceil(Math.max(maxLeft, maxRight)) + normPad;
      const normW = halfW * 2;
      const normH = Math.ceil(maxTop + maxBottom) + normPad * 2;
      const drawAnchorX = halfW;
      const drawAnchorY = Math.ceil(maxTop) + normPad;
      const drawAnchor = { x: drawAnchorX, y: drawAnchorY };

      // Pass 3 -------------------------------------------------------
      for (let col = 0; col < cols; col += 1) {
        const cell = cells[row][col];
        const { sprite, footX, footY } = frameData[col];
        const norm = document.createElement("canvas");
        norm.width = normW;
        norm.height = normH;
        const nctx = norm.getContext("2d");
        nctx.drawImage(sprite, drawAnchorX - footX, drawAnchorY - footY);
        cell.sprite = norm;
        cell.spriteOffsetX = 0;
        cell.spriteOffsetY = 0;
        cell.anchor = drawAnchor;
      }

      sequenceAnchors[row][0] = drawAnchor;
      sequenceAnchors[row][1] = drawAnchor;
      sequenceAnchors[row][2] = drawAnchor;
    }

    return {
      canvas,
      rows,
      cols,
      cellW: canvas.width / cols,
      cellH: canvas.height / rows,
      cells,
      anchors: cells.map(() => null),
      sequenceAnchors,
    };
  }

  if (mode === "hero") {
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const cell = cells[row][col];
        const { x, y, w: cellW, h: cellH } = cell;
        const footInCell = detectCellFeetCenter(imageData.data, canvas.width, x, y, cellW, cellH);
        const isMeleeRow = row === 2;
        const isCastRow = row === 3;
        const padX = isMeleeRow || isCastRow ? 8 : 34;
        const padY = 14;
        const sprite = isolateSprite(canvas, {
          x: Math.max(0, x - padX),
          y: Math.max(0, y - padY),
          w: Math.min(canvas.width - Math.max(0, x - padX), cellW + padX * 2),
          h: Math.min(canvas.height - Math.max(0, y - padY), cellH + padY * 2),
        }, {
          minArea: 120,
          // Keep only the primary connected hero silhouette per frame.
          // Detached scraps can otherwise overlap the hero as floating strips.
          keepNearby: false,
        });
        cell.sprite = sprite;
        cell.spriteOffsetX = sprite.sourceCropX - x;
        cell.spriteOffsetY = sprite.sourceCropY - y;
        cell.rawAnchor = {
          x: footInCell.x,
          y: footInCell.y,
        };
        cell.anchor = {
          x: footInCell.x - cell.spriteOffsetX,
          y: footInCell.y - cell.spriteOffsetY,
        };
      }
    }

    if (cells[0]?.length && cells[3]?.length) {
      const idleRawYs = cells[0].map((c) => c.rawAnchor?.y ?? 0).sort((a, b) => a - b);
      const idleMedianRawY = idleRawYs[Math.floor(idleRawYs.length / 2)];
      for (const cell of cells[3]) {
        cell.rawAnchor.y = idleMedianRawY;
        cell.anchor.y = idleMedianRawY - cell.spriteOffsetY;
      }
    }

    const sequenceAnchors = normalizeAnimationSequences(cells, mode);
    return {
      canvas,
      rows,
      cols,
      cellW: canvas.width / cols,
      cellH: canvas.height / rows,
      cells,
      anchors: cells.map(() => null),
      sequenceAnchors,
    };
  }

  {
    // Monsters: use isolateSprite for clean per-frame sprites (removes bleed
    // from adjacent cells) but derive the anchor from the original canvas foot
    // position so it stays stable across frames regardless of wing shape.
    const imgData = imageData.data;
    const iw = canvas.width;
    const spritePad = 8;
    const normPad = 14;
    const sequenceAnchors = cells.map(() => [null, null, null]);

    for (let row = 0; row < rows; row += 1) {
      // Pass 1: isolate sprite + stable foot anchor per frame.
      const frameData = [];
      for (let col = 0; col < cols; col += 1) {
        const cell = cells[row][col];
        const { x, y, w: cw, h: ch } = cell;

        // Detect foot from original canvas (central-band scan, not affected by wings).
        const footInCell = detectCellFeetCenter(imgData, iw, x, y, cw, ch);

        // isolateSprite removes disconnected fragments from adjacent cells.
        const sprite = isolateSprite(canvas, {
          x: Math.max(0, x - spritePad),
          y: Math.max(0, y - spritePad),
          w: Math.min(canvas.width - Math.max(0, x - spritePad), cw + spritePad * 2),
          h: Math.min(canvas.height - Math.max(0, y - spritePad), ch + spritePad * 2),
        }, { minArea: 90, keepNearby: true });

        // Convert foot from cell-local to sprite-local coordinates.
        const footInSprite = {
          x: Math.max(0, Math.min(sprite.width - 1, (x + footInCell.x) - sprite.sourceCropX)),
          y: Math.max(0, Math.min(sprite.height - 1, (y + footInCell.y) - sprite.sourceCropY)),
        };

        frameData[col] = { sprite, foot: footInSprite };
      }

      // Pass 2: symmetric extents so the foot anchor is at a fixed position
      // in every baked frame, and flipX stays perfectly symmetric.
      // Use the MEDIAN foot-X across all frames to suppress per-frame drift.
      const footXValues = frameData.map(f => f.foot.x);
      footXValues.sort((a, b) => a - b);
      const medianFootX = footXValues[Math.floor(footXValues.length / 2)];
      // Override each frame's foot.x with the stable median.
      for (const fd of frameData) fd.foot.x = medianFootX;
      let maxLeft = 0;
      let maxRight = 0;
      let maxTop = 0;
      let maxBottom = 0;
      for (const { sprite, foot } of frameData) {
        maxLeft = Math.max(maxLeft, foot.x);
        maxRight = Math.max(maxRight, sprite.width - foot.x);
        maxTop = Math.max(maxTop, foot.y);
        maxBottom = Math.max(maxBottom, sprite.height - foot.y);
      }
      const halfW = Math.ceil(Math.max(maxLeft, maxRight)) + normPad;
      const normW = halfW * 2;
      const normH = Math.ceil(maxTop + maxBottom) + normPad * 2;
      const drawAnchorX = halfW;
      const drawAnchorY = Math.ceil(maxTop) + normPad;
      const drawAnchor = { x: drawAnchorX, y: drawAnchorY };

      // Pass 3: bake each cleaned sprite with foot at fixed anchor position.
      for (let col = 0; col < cols; col += 1) {
        const cell = cells[row][col];
        const { sprite, foot } = frameData[col];
        const norm = document.createElement("canvas");
        norm.width = normW;
        norm.height = normH;
        const nctx = norm.getContext("2d");
        nctx.drawImage(sprite, drawAnchorX - foot.x, drawAnchorY - foot.y);
        cell.sprite = norm;
        cell.spriteOffsetX = 0;
        cell.spriteOffsetY = 0;
        cell.anchor = drawAnchor;
      }

      sequenceAnchors[row][0] = drawAnchor;
      sequenceAnchors[row][1] = drawAnchor;
      sequenceAnchors[row][2] = drawAnchor;
    }

    return {
      canvas,
      rows,
      cols,
      cellW: canvas.width / cols,
      cellH: canvas.height / rows,
      cells,
      anchors: cells.map(() => null),
      sequenceAnchors,
    };
  }

  const sequenceAnchors = normalizeAnimationSequences(cells, mode);

  return {
    canvas,
    rows,
    cols,
    cellW: canvas.width / cols,
    cellH: canvas.height / rows,
    cells,
    anchors: cells.map(() => null),
    sequenceAnchors,
  };
}

function normalizeAnimationSequences(cells, mode) {
  const anchors = cells.map(() => []);
  if (mode === "hero") {
    // Stabilize row anchors so one outlier frame cannot cause visible jumps.
    const stabilizeHeroRow = (rowIndex, lockY, lockX) => {
      if (!cells[rowIndex]?.length) return;
      const xs = cells[rowIndex].map((cell) => cell.anchor?.x ?? cell.sprite.width / 2).sort((a, b) => a - b);
      const ys = cells[rowIndex].map((cell) => cell.anchor?.y ?? cell.sprite.height * 0.88).sort((a, b) => a - b);
      const medianX = lockX ?? xs[Math.floor(xs.length / 2)];
      const medianY = lockY ?? ys[Math.floor(ys.length / 2)];
      for (const cell of cells[rowIndex]) {
        if (!cell.anchor) cell.anchor = { x: medianX, y: medianY };
        cell.anchor.x = medianX;
        cell.anchor.y = medianY;
      }
      return { medianX, medianY };
    };

    // Single-row sheet (dedicated cast sheet): only stabilize X per row.
    // Each frame's anchor.y is correct from detectCellFeetCenter (clean cells,
    // no bleed). Overriding with median would break per-frame foot alignment.
    if (cells.length === 1) {
      const xs = cells[0].map((cell) => cell.anchor?.x ?? cell.sprite.width / 2).sort((a, b) => a - b);
      const medianX = xs[Math.floor(xs.length / 2)];
      for (const cell of cells[0]) {
        if (!cell.anchor) cell.anchor = { x: medianX, y: cell.sprite.height * 0.88 };
        else cell.anchor.x = medianX;
      }
    } else {
      const idleAnchor = stabilizeHeroRow(0); // idle
      stabilizeHeroRow(1, idleAnchor?.medianY); // walk: Y locked to idle, own X
      stabilizeHeroRow(2, idleAnchor?.medianY, idleAnchor?.medianX); // melee: lock both X and Y to idle
      // Cast row: only lock X to idle median
      if (cells[3]?.length) {
        for (const cell of cells[3]) {
          if (!cell.anchor) cell.anchor = { x: idleAnchor.medianX, y: cell.sprite.height * 0.88 };
          else cell.anchor.x = idleAnchor.medianX;
        }
      }
    }

    // Normalize ALL rows together with a single global anchor so the character
    // position stays consistent when switching between idle / walk / attack / cast.
    const pad = 10;
    let left = 0;
    let right = 0;
    let top = 0;
    let bottom = 0;
    for (const row of cells) {
      for (const cell of row) {
        const anchor = cell.anchor || { x: cell.sprite.width / 2, y: cell.sprite.height * 0.55 };
        left = Math.max(left, anchor.x);
        right = Math.max(right, cell.sprite.width - anchor.x);
        top = Math.max(top, anchor.y);
        bottom = Math.max(bottom, cell.sprite.height - anchor.y);
      }
    }
    const halfWidth = Math.ceil(Math.max(left, right) + pad);
    const width = Math.max(2, halfWidth * 2);
    const height = Math.max(2, Math.ceil(top + bottom + pad * 2));
    const targetX = halfWidth;
    const targetY = Math.ceil(top + pad);
      // drawAnchor must point to where the foot is placed in the baked canvas (= targetY),
      // NOT to height-2. Using height-2 causes a hop when cast frames (with taller spell
      // sprites) push top/height higher, shifting the rendered foot position for all frames.
      const drawAnchor = { x: halfWidth, y: targetY };
    for (let row = 0; row < cells.length; row += 1) {
      for (const cell of cells[row]) {
        const anchor = cell.anchor || { x: cell.sprite.width / 2, y: cell.sprite.height * 0.55 };
        const normalized = document.createElement("canvas");
        normalized.width = width;
        normalized.height = height;
        const nctx = normalized.getContext("2d");
        nctx.drawImage(cell.sprite, targetX - anchor.x, targetY - anchor.y);
        cell.sprite = normalized;
        cell.spriteOffsetX = 0;
        cell.spriteOffsetY = 0;
        cell.anchor = drawAnchor;
      }
      anchors[row][0] = drawAnchor;
    }
    return anchors;
  }

  // Monsters: normalize each sub-sequence (idle 0-3, walk 4-7, attack 8-11)
  // independently but with a shared canvas size per row so that switching
  // between idle / walk / attack doesn't cause position jumps.
  for (let row = 0; row < cells.length; row += 1) {
    // Compute global extents across all sub-sequences (idle/walk/attack) so
    // one shared anchor is used for the whole row â€” no jumps when switching state.
    const pad = 10;
    let left = 0;
    let right = 0;
    let top = 0;
    let bottom = 0;
    for (const cell of cells[row]) {
      const anchor = cell.anchor || { x: cell.sprite.width / 2, y: cell.sprite.height * 0.55 };
      left = Math.max(left, anchor.x);
      right = Math.max(right, cell.sprite.width - anchor.x);
      top = Math.max(top, anchor.y);
      bottom = Math.max(bottom, cell.sprite.height - anchor.y);
    }
    const halfWidth = Math.ceil(Math.max(left, right) + pad);
    const width = Math.max(2, halfWidth * 2);
    const height = Math.max(2, Math.ceil(top + bottom + pad * 2));
    const targetX = halfWidth;
    const targetY = Math.ceil(top + pad);
    const drawAnchor = { x: halfWidth, y: height - 2 };
    for (const cell of cells[row]) {
      const anchor = cell.anchor || { x: cell.sprite.width / 2, y: cell.sprite.height * 0.55 };
      const normalized = document.createElement("canvas");
      normalized.width = width;
      normalized.height = height;
      const nctx = normalized.getContext("2d");
      nctx.drawImage(cell.sprite, targetX - anchor.x, targetY - anchor.y);
      cell.sprite = normalized;
      cell.spriteOffsetX = 0;
      cell.spriteOffsetY = 0;
      cell.anchor = drawAnchor;
    }
    anchors[row][0] = drawAnchor;
    anchors[row][1] = drawAnchor;
    anchors[row][2] = drawAnchor;
  }
  return anchors;
}

function normalizeSequence(sequenceCells) {
  const pad = 10;
  let left = 0;
  let right = 0;
  let top = 0;
  let bottom = 0;

  for (const cell of sequenceCells) {
    const anchor = cell.anchor || { x: cell.sprite.width / 2, y: cell.sprite.height * 0.55 };
    left = Math.max(left, anchor.x);
    right = Math.max(right, cell.sprite.width - anchor.x);
    top = Math.max(top, anchor.y);
    bottom = Math.max(bottom, cell.sprite.height - anchor.y);
  }

  const halfWidth = Math.ceil(Math.max(left, right) + pad);
  const width = Math.max(2, halfWidth * 2);
  const height = Math.max(2, Math.ceil(top + bottom + pad * 2));
  const target = { x: halfWidth, y: Math.ceil(top + pad) };
  const drawAnchor = { x: halfWidth, y: height - 2 };

  for (const cell of sequenceCells) {
    const anchor = cell.anchor || { x: cell.sprite.width / 2, y: cell.sprite.height * 0.55 };
    const normalized = document.createElement("canvas");
    normalized.width = width;
    normalized.height = height;
    const ctx = normalized.getContext("2d");
    ctx.drawImage(cell.sprite, target.x - anchor.x, target.y - anchor.y);
    cell.sprite = normalized;
    cell.spriteOffsetX = 0;
    cell.spriteOffsetY = 0;
    cell.anchor = drawAnchor;
  }

  return drawAnchor;
}

function makeAtlasSprites(canvas, frames) {
  const objectKeys = new Set([
    "house",
    "pine",
    "oldOak",
    "boulder",
    "brokenWall",
    "pillar",
    "crystal",
    "well",
    "crate",
    "hero",
    "demon",
    "skeleton",
    "ghost",
    "gold",
    "gem",
    "arrow",
    "orb",
  ]);
  const sprites = {};
  for (const [key, frame] of Object.entries(frames)) {
    if (!objectKeys.has(key)) continue;
    sprites[key] = isolateSprite(canvas, frame, {
      minArea: key === "arrow" || key === "orb" ? 20 : 80,
      // Keep only the primary connected sprite component.
      // Detached atlas scraps can otherwise appear as floating green strips.
      keepNearby: false,
    });
  }
  return sprites;
}

function isolateSprite(sourceCanvas, rect, options = {}) {
  const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  const sx = Math.max(0, Math.floor(rect.x));
  const sy = Math.max(0, Math.floor(rect.y));
  const sw = Math.min(sourceCanvas.width - sx, Math.ceil(rect.w));
  const sh = Math.min(sourceCanvas.height - sy, Math.ceil(rect.h));
  const sourceData = sourceCtx.getImageData(sx, sy, sw, sh);
  const mask = makeMainComponentMask(sourceData.data, sw, sh, options);
  const bounds = boundsFromMask(mask, sw, sh);
  const pad = 5;
  const outX = Math.max(0, bounds.x - pad);
  const outY = Math.max(0, bounds.y - pad);
  const outW = Math.min(sw - outX, bounds.w + pad * 2);
  const outH = Math.min(sh - outY, bounds.h + pad * 2);
  const out = document.createElement("canvas");
  out.width = Math.max(1, outW);
  out.height = Math.max(1, outH);
  const outCtx = out.getContext("2d");
  const outData = outCtx.createImageData(out.width, out.height);

  for (let y = 0; y < out.height; y += 1) {
    for (let x = 0; x < out.width; x += 1) {
      const srcX = outX + x;
      const srcY = outY + y;
      const srcIndex = (srcY * sw + srcX) * 4;
      const dstIndex = (y * out.width + x) * 4;
      if (mask[srcY * sw + srcX]) {
        outData.data[dstIndex] = sourceData.data[srcIndex];
        outData.data[dstIndex + 1] = sourceData.data[srcIndex + 1];
        outData.data[dstIndex + 2] = sourceData.data[srcIndex + 2];
        outData.data[dstIndex + 3] = sourceData.data[srcIndex + 3];
      }
    }
  }

  outCtx.putImageData(outData, 0, 0);
  out.sourceCropX = sx + outX;
  out.sourceCropY = sy + outY;
  return out;
}

function makeMainComponentMask(data, width, height, options) {
  const alphaMask = new Uint8Array(width * height);
  for (let i = 0; i < alphaMask.length; i += 1) {
    alphaMask[i] = data[i * 4 + 3] > 45 ? 1 : 0;
  }

  const visited = new Uint8Array(width * height);
  const components = [];
  const queue = [];
  const minArea = options.minArea ?? 60;
  const focusPoints = [];
  if (Number.isFinite(options.focusX) && Number.isFinite(options.focusY)) {
    focusPoints.push({
      x: Math.max(0, Math.min(width - 1, Math.floor(options.focusX))),
      y: Math.max(0, Math.min(height - 1, Math.floor(options.focusY))),
    });
  }
  if (Number.isFinite(options.focus2X) && Number.isFinite(options.focus2Y)) {
    focusPoints.push({
      x: Math.max(0, Math.min(width - 1, Math.floor(options.focus2X))),
      y: Math.max(0, Math.min(height - 1, Math.floor(options.focus2Y))),
    });
  }
  const focusIndexSet = new Set(focusPoints.map((p) => p.y * width + p.x));

  for (let start = 0; start < alphaMask.length; start += 1) {
    if (!alphaMask[start] || visited[start]) continue;
    let head = 0;
    queue.length = 0;
    queue.push(start);
    visited[start] = 1;
    let area = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let touchesFocus = false;
    const pixels = [];

    while (head < queue.length) {
      const index = queue[head];
      head += 1;
      pixels.push(index);
      area += 1;
      const x = index % width;
      const y = Math.floor(index / width);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (focusIndexSet.size && focusIndexSet.has(index)) touchesFocus = true;

      const neighbors = [index - 1, index + 1, index - width, index + width];
      for (const next of neighbors) {
        if (next < 0 || next >= alphaMask.length || visited[next] || !alphaMask[next]) continue;
        const nx = next % width;
        if ((next === index - 1 && nx > x) || (next === index + 1 && nx < x)) continue;
        visited[next] = 1;
        queue.push(next);
      }
    }

    if (area >= minArea) components.push({ area, minX, minY, maxX, maxY, pixels, touchesFocus });
  }

  if (!components.length) return alphaMask;
  const focused = focusIndexSet.size ? components.filter((c) => c.touchesFocus) : [];
  const mainCandidates = focused.length ? focused : components;
  mainCandidates.sort((a, b) => b.area - a.area);
  const main = mainCandidates[0];
  const keep = new Uint8Array(width * height);
  const mainCx = (main.minX + main.maxX) / 2;
  const mainCy = (main.minY + main.maxY) / 2;
  const radiusMult = options.nearbyRadiusMult ?? 0.7;
  const nearbyRatio = options.nearbyRatio ?? 0.06;
  const mainRadius = Math.max(main.maxX - main.minX, main.maxY - main.minY) * radiusMult;

  for (const component of components) {
    const cx = (component.minX + component.maxX) / 2;
    const cy = (component.minY + component.maxY) / 2;
    const nearby = Math.hypot(cx - mainCx, cy - mainCy) < mainRadius;
    const meaningful = component.area > main.area * nearbyRatio;
    if (component === main || (options.keepNearby && nearby && meaningful)) {
      for (const pixel of component.pixels) keep[pixel] = 1;
    }
  }

  return keep;
}

function boundsFromMask(mask, width, height) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[y * width + x]) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX <= minX || maxY <= minY) return { x: 0, y: 0, w: width, h: height };
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

// Remove pixel blobs that are not connected to the main body.
// Runs connected-component analysis on the canvas and erases any component
// that is both small (< 5% of largest) AND far from the canvas centre.
function removeIsolatedFragments(ctx, w, h) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const alpha = new Uint8Array(w * h);
  for (let i = 0; i < alpha.length; i += 1) alpha[i] = data[i * 4 + 3] > 45 ? 1 : 0;

  const visited = new Uint8Array(w * h);
  const components = [];
  const queue = [];

  for (let start = 0; start < alpha.length; start += 1) {
    if (!alpha[start] || visited[start]) continue;
    let head = 0;
    queue.length = 0;
    queue.push(start);
    visited[start] = 1;
    let sumX = 0;
    let sumY = 0;
    while (head < queue.length) {
      const idx = queue[head++];
      const px = idx % w;
      const py = Math.floor(idx / w);
      sumX += px;
      sumY += py;
      for (const next of [idx - 1, idx + 1, idx - w, idx + w]) {
        if (next < 0 || next >= alpha.length || visited[next] || !alpha[next]) continue;
        const nx = next % w;
        if ((next === idx - 1 && nx > px) || (next === idx + 1 && nx < px)) continue;
        visited[next] = 1;
        queue.push(next);
      }
    }
    const pixels = queue.slice(0, queue.length);
    components.push({ pixels, cx: sumX / pixels.length, cy: sumY / pixels.length });
  }

  if (components.length <= 1) return;
  const largest = components.reduce((a, b) => a.pixels.length > b.pixels.length ? a : b);
  const threshold = largest.pixels.length * 0.05;
  const maxDist = Math.max(w, h) * 0.55;

  for (const comp of components) {
    if (comp === largest) continue;
    if (comp.pixels.length >= threshold) continue;
    // Only erase if it's far from the largest component's centroid.
    const dist = Math.hypot(comp.cx - largest.cx, comp.cy - largest.cy);
    if (dist < maxDist) continue;
    for (const idx of comp.pixels) data[idx * 4 + 3] = 0;
  }

  ctx.putImageData(imageData, 0, 0);
}

// Detect foot position from the original full canvas using only the central
// 50% of the cell width. This excludes wing tips and swinging tails which
// extend to the sides, so the detected X stays stable across animation frames.
function detectCellFeetCenter(data, imageWidth, cellX, cellY, cellW, cellH) {
  const marginX = Math.floor(cellW * 0.25); // ignore outer 25% on each side
  const scanLeft = cellX + marginX;
  const scanRight = cellX + cellW - marginX;

  // Scan upward from cell bottom to find the lowest row with visible pixels
  // in the central column. Stop after collecting 6 rows above the first hit.
  let foundY = -1;
  const xs = [];

  for (let y = cellY + cellH - 1; y >= cellY; y -= 1) {
    for (let x = scanLeft; x < scanRight; x += 1) {
      if (data[(y * imageWidth + x) * 4 + 3] > 60) {
        xs.push(x - cellX);
        if (foundY < 0) foundY = y;
      }
    }
    if (foundY >= 0 && foundY - y >= 5) break;
  }

  if (xs.length < 4) {
    // Fallback: use cell centre
    return { x: cellW * 0.5, y: cellH * 0.88 };
  }

  xs.sort((a, b) => a - b);
  const q1 = Math.floor(xs.length * 0.25);
  const q3 = Math.max(q1 + 1, Math.floor(xs.length * 0.75));
  let sum = 0;
  for (let i = q1; i < q3; i += 1) sum += xs[i];
  return { x: sum / (q3 - q1), y: foundY - cellY };
}

function detectFootAnchorFromCanvas(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const bottomBand = Math.max(14, Math.floor(canvas.height * 0.18));
  const startY = Math.max(0, canvas.height - bottomBand);
  const xs = [];
  let maxY = canvas.height - 1;

  for (let y = startY; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      if (data[(y * canvas.width + x) * 4 + 3] > 60) {
        xs.push(x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (xs.length < 8) {
    return { x: canvas.width / 2, y: canvas.height };
  }

  xs.sort((a, b) => a - b);
  const start = Math.floor(xs.length * 0.25);
  const end = Math.max(start + 1, Math.floor(xs.length * 0.75));
  let sum = 0;
  for (let i = start; i < end; i += 1) sum += xs[i];
  return { x: sum / (end - start), y: maxY };
}

function detectBodyAnchorFromCanvas(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const bounds = alphaBoundsFromCanvasData(data, canvas.width, canvas.height);
  const minY = bounds.y + bounds.h * 0.18;
  const maxY = bounds.y + bounds.h * 0.82;
  const xs = [];
  const ys = [];

  for (let y = Math.floor(minY); y <= Math.floor(maxY); y += 1) {
    for (let x = bounds.x; x < bounds.x + bounds.w; x += 1) {
      const index = (y * canvas.width + x) * 4;
      if (data[index + 3] <= 70) continue;
      xs.push(x);
      ys.push(y);
    }
  }

  if (xs.length < 20) {
    return { x: canvas.width / 2, y: canvas.height * 0.58 };
  }

  return {
    x: trimmedMean(xs, 0.34, 0.66),
    y: trimmedMean(ys, 0.3, 0.7),
  };
}

function alphaBoundsFromCanvasData(data, width, height) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] <= 45) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX <= minX || maxY <= minY) return { x: 0, y: 0, w: width, h: height };
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function trimmedMean(values, low, high) {
  const sorted = values.slice().sort((a, b) => a - b);
  const start = Math.floor(sorted.length * low);
  const end = Math.max(start + 1, Math.floor(sorted.length * high));
  let sum = 0;
  for (let i = start; i < end; i += 1) sum += sorted[i];
  return sum / (end - start);
}

function detectFootAnchor(data, imageWidth, cell) {
  const b = cell.bounds;
  const bottom = b.y + b.h;
  const bandTop = Math.max(b.y, bottom - Math.max(14, Math.floor(b.h * 0.16)));
  const xs = [];
  let maxY = b.y;

  for (let y = cell.y + bandTop; y < cell.y + bottom; y += 1) {
    for (let x = cell.x + b.x; x < cell.x + b.x + b.w; x += 1) {
      const alpha = data[(y * imageWidth + x) * 4 + 3];
      if (alpha > 60) {
        xs.push(x - cell.x);
        maxY = Math.max(maxY, y - cell.y);
      }
    }
  }

  if (xs.length < 10) {
    return {
      x: b.x + b.w / 2,
      y: bottom,
    };
  }

  xs.sort((a, bValue) => a - bValue);
  const start = Math.floor(xs.length * 0.28);
  const end = Math.max(start + 1, Math.floor(xs.length * 0.72));
  let sum = 0;
  for (let i = start; i < end; i += 1) sum += xs[i];
  return {
    x: sum / (end - start),
    y: maxY,
  };
}

function scanAlphaBounds(data, imageWidth, x0, y0, x1, y1) {
  let minX = x1;
  let minY = y1;
  let maxX = x0;
  let maxY = y0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const alpha = data[(y * imageWidth + x) * 4 + 3];
      if (alpha > 45) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX <= minX || maxY <= minY) return { x: 0, y: 0, w: x1 - x0, h: y1 - y0 };
  const pad = 3;
  return {
    x: Math.max(0, minX - x0 - pad),
    y: Math.max(0, minY - y0 - pad),
    w: Math.min(x1 - x0, maxX - minX + 1 + pad * 2),
    h: Math.min(y1 - y0, maxY - minY + 1 + pad * 2),
  };
}

export function drawAtlasFrame(ctx, atlas, key, x, y, options = {}) {
  const frame = atlas?.frames?.[key];
  const sprite = atlas?.sprites?.[key];
  if (!frame && !sprite) return false;
  const scale = options.scale ?? 1;
  const sourceW = sprite?.width ?? frame.w;
  const sourceH = sprite?.height ?? frame.h;
  const width = options.width ?? sourceW * scale;
  const height = options.height ?? sourceH * scale;
  const anchorX = options.anchorX ?? 0.5;
  const anchorY = options.anchorY ?? 1;
  const dx = -width * anchorX + (options.offsetX ?? 0);
  const dy = -height * anchorY + (options.offsetY ?? 0);
  ctx.save();
  ctx.translate(x, y);
  if (options.rotation) ctx.rotate(options.rotation);
  ctx.scale((options.flipX ? -1 : 1) * (options.scaleX ?? 1), options.scaleY ?? 1);
  if (options.alpha !== undefined) ctx.globalAlpha *= options.alpha;
  if (options.blur) ctx.filter = `blur(${options.blur}px)`;
  if (sprite) {
    drawImageMaybeDamaged(ctx, sprite, 0, 0, sprite.width, sprite.height, dx, dy, width, height, options.damageObject);
  } else {
    drawImageMaybeDamaged(ctx, atlas.canvas, frame.x, frame.y, frame.w, frame.h, dx, dy, width, height, options.damageObject);
  }
  ctx.restore();
  return true;
}

export function drawGroundTile(ctx, atlas, biomeId, variant, x, y, options = {}) {
  if (options.water) {
    return drawWaterTile(ctx, atlas, options.waterVariant ?? variant, x, y, options);
  }

  const sheets = atlas?.groundSheets;
  const sheet = sheets?.[options.groundSheetId] ?? sheets?.[biomeId] ?? sheets?.mainland;
  if (!sheet) {
    return drawAtlasFrame(ctx, atlas, "grassTile", x, y + 82, {
      width: TILE_W * 1.14,
      height: 86,
      anchorY: 1,
    });
  }

  const frame = sheet.frames[Math.abs(Math.floor(variant ?? 0)) % sheet.frames.length];
  const halfW = TILE_W * 0.5 + 1;
  const halfH = TILE_H * 0.5 + 1;
  const centerY = y + TILE_H * 0.5;

  drawGroundBase(ctx, x, centerY, halfW, halfH, options.baseColor ?? "#4f8f36", options.baseAlpha ?? sheet.baseAlpha ?? 1);
  drawGroundTexture(ctx, sheet, frame, x, centerY, halfW, halfH, options);

  if (options.path) {
    drawGroundPathOverlay(ctx, x, centerY, halfW, halfH, options.pathColor ?? "rgba(112, 86, 48, 0.24)");
  }

  return true;
}

function drawWaterTile(ctx, atlas, variant, x, y, options = {}) {
  const sheet = atlas?.waterSheet;
  const frame = sheet?.cells?.[Math.abs(Math.floor(variant ?? 0)) % sheet.cells.length];
  const halfW = TILE_W * 0.5 + 1;
  const halfH = TILE_H * 0.5 + 1;
  const centerY = y + TILE_H * 0.5;

  drawGroundBase(ctx, x, centerY, halfW, halfH, options.baseColor ?? "#1f5f7f", options.baseAlpha ?? 1);
  if (!sheet || !frame) {
    drawGroundBase(ctx, x, centerY, halfW * 0.94, halfH * 0.88, "#2c86a3", 0.9);
    return true;
  }

  ctx.save();
  traceGroundDiamond(ctx, x, centerY, halfW, halfH);
  ctx.clip();
  ctx.drawImage(
    sheet.canvas,
    frame.x,
    frame.y,
    frame.w,
    frame.h,
    x - halfW,
    centerY - halfH,
    halfW * 2,
    halfH * 2,
  );
  ctx.restore();
  return true;
}

function drawGroundBase(ctx, x, centerY, halfW, halfH, color, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color;
  traceGroundDiamond(ctx, x, centerY, halfW, halfH);
  ctx.fill();
  ctx.restore();
}

function drawGroundTexture(ctx, sheet, frame, x, centerY, halfW, halfH, options = {}) {
  const visualScale = options.visualScale ?? sheet.visualScale ?? 1;
  const destW = halfW * 2 * visualScale;
  const destH = halfH * 2 * visualScale;
  const destX = x - destW / 2;
  const destY = centerY - destH / 2;
  const sprite = getGroundTileSprite(sheet, frame, Math.ceil(destW), Math.ceil(destH), {
    edgeFeather: options.edgeFeather,
    textureAlpha: options.textureAlpha,
  });

  ctx.save();
  ctx.drawImage(sprite, destX, destY, destW, destH);
  ctx.restore();
}

function getGroundTileSprite(sheet, frame, width, height, options = {}) {
  const feather = options.edgeFeather ?? sheet.edgeFeather ?? 0;
  const alpha = options.textureAlpha ?? sheet.textureAlpha ?? 1;
  const cacheKey = `${frame.index ?? 0}:${width}x${height}:f${feather}:a${alpha}`;
  const cached = sheet.tileCache?.get(cacheKey);
  if (cached) return cached;

  const insetX = Math.floor(frame.w * (sheet.sourceInset ?? 0));
  const insetY = Math.floor(frame.h * (sheet.sourceInset ?? 0));
  const sourceX = frame.x + insetX;
  const sourceY = frame.y + insetY;
  const sourceW = Math.max(1, frame.w - insetX * 2);
  const sourceH = Math.max(1, frame.h - insetY * 2);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const tctx = canvas.getContext("2d", { willReadFrequently: true });
  tctx.drawImage(sheet.canvas, sourceX, sourceY, sourceW, sourceH, 0, 0, width, height);

  if (feather > 0 || alpha < 1) {
    const imageData = tctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const halfW = width / 2;
    const halfH = height / 2;
    const seed = ((frame.index ?? 0) + 1) * 12.9898;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = (y * width + x) * 4;
        const nx = Math.abs((x + 0.5 - halfW) / halfW);
        const ny = Math.abs((y + 0.5 - halfH) / halfH);
        const diamondDistance = 1 - nx - ny;
        if (diamondDistance <= 0) {
          data[i + 3] = 0;
          continue;
        }
        const noise = valueNoise2d(x * 0.16 + seed, y * 0.18 - seed) * 0.16 - 0.08;
        const edge = smoothstep01((diamondDistance + noise) / Math.max(0.001, feather));
        const organic = Math.max(0, Math.min(1, edge));
        data[i + 3] = Math.floor(data[i + 3] * alpha * organic);
      }
    }
    tctx.putImageData(imageData, 0, 0);
  }

  sheet.tileCache?.set(cacheKey, canvas);
  return canvas;
}

function smoothstep01(t) {
  const n = Math.max(0, Math.min(1, t));
  return n * n * (3 - 2 * n);
}

function valueNoise2d(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const a = hashNoise(ix, iy);
  const b = hashNoise(ix + 1, iy);
  const c = hashNoise(ix, iy + 1);
  const d = hashNoise(ix + 1, iy + 1);
  const tx = smoothstep01(fx);
  const ty = smoothstep01(fy);
  return lerpNumber(lerpNumber(a, b, tx), lerpNumber(c, d, tx), ty);
}

function hashNoise(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function lerpNumber(a, b, t) {
  return a + (b - a) * t;
}

function drawGroundPathOverlay(ctx, x, centerY, halfW, halfH, color) {
  ctx.save();
  ctx.fillStyle = color;
  traceGroundDiamond(ctx, x, centerY, halfW * 0.78, halfH * 0.68);
  ctx.fill();
  ctx.restore();
}

function traceGroundDiamond(ctx, x, centerY, halfW, halfH) {
  ctx.beginPath();
  ctx.moveTo(x, centerY - halfH);
  ctx.lineTo(x + halfW, centerY);
  ctx.lineTo(x, centerY + halfH);
  ctx.lineTo(x - halfW, centerY);
  ctx.closePath();
}

export function drawShadow(ctx, x, y, width, height, alpha = 0.32) {
  ctx.save();
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y, width, height, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawObject(ctx, object, screen, biome, atlas, time = 0) {
  if (object.type === "pine" || object.type === "old-oak") {
    return drawTreeObject(ctx, object, screen, biome, atlas, time);
  }

  if (atlas?.objectSheets?.[object.type]
    || object.type === "building"
    || object.type === "ruin"
    || object.type === "crystal"
    || object.type === "chest"
    || object.type === "firebeacon"
    || object.type === "fireplace") {
    return drawSheetObject(ctx, object, screen, biome, atlas, time);
  }

  const frame = OBJECT_FRAME[object.type];
  if (!frame) return;
  const baseScale = object.type === "house" ? 0.56 : object.type === "old-oak" ? 0.44 : object.type === "pine" ? 0.5 : 0.58;
  const scale = baseScale * object.size * (object.visualScale ?? 1);
  const offsetY = object.type === "house" ? 10 : object.type === "pine" || object.type === "old-oak" ? 14 : 6;
  const wind = object.type === "pine" || object.type === "old-oak" ? Math.sin(time * 1.2 + object.animSeed) * 0.018 : 0;
  const glow = object.type === "crystal" ? 0.95 + Math.sin(time * 3 + object.animSeed) * 0.05 : 1;
  if (drawAtlasFrame(ctx, atlas, frame, screen.x, screen.y + offsetY, {
    scale,
    flipX: object.flip,
    rotation: wind,
    scaleX: glow,
    scaleY: object.type === "crystal" ? 1 + Math.sin(time * 3 + object.animSeed) * 0.025 : 1,
    damageObject: object,
  })) {
    if (object.type === "crystal") {
      ctx.save();
      ctx.globalAlpha = 0.18 + Math.sin(time * 3 + object.animSeed) * 0.05;
      ctx.fillStyle = "#7fdcff";
      ctx.beginPath();
      ctx.ellipse(screen.x, screen.y - 40, 52 * object.size, 70 * object.size, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

function drawSheetObject(ctx, object, screen, biome, atlas, time = 0) {
  const sheetsByBiome = atlas?.objectSheets?.[object.type];
  const sheet = sheetsByBiome?.[biome?.id]
    ?? sheetsByBiome?.default
    ?? sheetsByBiome?.mainland;
  const cells = sheet?.cells;
  if (!cells?.length) return false;

  const animFrame = object.type === "chest" && object.opening
    ? (object.openTime ?? 0) * 6
    : time * 6 + (object.animSeed ?? 0);
  const rawFrameIndex = Math.floor(animFrame);
  const frameT = animFrame - rawFrameIndex;
  const frameIndex = object.type === "chest" && !object.opening
    ? 0
    : sheet.animated
      ? (object.type === "chest" ? Math.min(rawFrameIndex, cells.length - 1) : rawFrameIndex % cells.length)
    : Math.abs(Math.floor(object.treeVariant ?? 0)) % cells.length;
  const cell = cells[frameIndex];
  const sprite = cell?.sprite;
  if (!sprite) return false;
  const frameOffset = sheet.frameOffsets?.[frameIndex] ?? { x: 0, y: 0 };

  const baseScale = object.type === "building" ? 0.58
    : object.type === "ruin" ? 0.54
    : object.type === "crystal" ? 0.46
    : object.type === "chest" ? 0.28
    : object.type === "firebeacon" ? 0.44
    : 0.4;
  const scale = baseScale * object.size * (object.visualScale ?? 1) * (sheet.renderScale ?? 1);
  const width = sprite.width * scale;
  const height = sprite.height * scale;
  const bob = object.type === "crystal" ? Math.sin(time * 2.6 + object.animSeed) * 1.2 : 0;
  const glow = object.type === "crystal" ? 0.92 + Math.sin(time * 3 + object.animSeed) * 0.04 : 1;

  if (object.type === "crystal" || object.type === "chest" || object.type === "firebeacon" || object.type === "fireplace") {
    drawShadow(ctx, screen.x, screen.y + 12, width * 0.18, Math.max(6, width * 0.055), 0.22);
  }

  ctx.save();
  ctx.translate(screen.x, screen.y + 12 + bob);
  ctx.scale(object.flip ? -1 : 1, 1);
  ctx.globalAlpha *= object.alpha ?? 1;
  if (object.type === "crystal") {
    ctx.globalAlpha *= glow;
  }
  const drawX = -width * 0.5 + frameOffset.x * scale;
  const drawY = -height + 24 * scale + frameOffset.y * scale;
  drawImageMaybeDamaged(ctx, sprite, 0, 0, sprite.width, sprite.height, drawX, drawY, width, height, object);
  ctx.restore();

  if (object.type === "chest" && object.opening) {
    drawChestVanishEffect(ctx, screen, object, frameIndex, frameT, cells.length, time, {
      x: screen.x + drawX,
      y: screen.y + 12 + bob + drawY,
      width,
      height,
    });
  }

  if (object.type === "crystal") {
    ctx.save();
    ctx.globalAlpha = 0.12 + Math.sin(time * 3 + object.animSeed) * 0.035;
    ctx.fillStyle = biome?.id === "snow" ? "#bfe3f2" : "#7fdcff";
    ctx.beginPath();
    ctx.ellipse(screen.x, screen.y - 26, 38 * object.size, 52 * object.size, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  return true;
}

function drawChestVanishEffect(ctx, screen, object, frameIndex, frameT, frameCount, time, rect) {
  if (frameCount < 2 || frameIndex < frameCount - 2) return;

  const progress = Math.min(1, Math.max(0, (frameIndex - (frameCount - 2) + frameT) / 2));
  const pulse = Math.sin(progress * Math.PI);
  const sparkleAlpha = Math.max(0, 1 - progress) * 0.65 + pulse * 0.28;
  const scale = object.size * (object.visualScale ?? 1);
  const cx = rect.x + rect.width * 0.5;
  const cy = rect.y + rect.height * 0.48;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, 62 * scale);
  glow.addColorStop(0, `rgba(255, 236, 144, ${0.42 * pulse})`);
  glow.addColorStop(0.42, `rgba(255, 154, 50, ${0.18 * pulse})`);
  glow.addColorStop(1, "rgba(255, 154, 50, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 70 * scale, 48 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(255, 238, 158, ${0.32 * pulse})`;
  ctx.lineWidth = Math.max(1, 2 * scale);
  ctx.beginPath();
  ctx.ellipse(cx, cy + 6 * scale, 28 * scale * (1 + progress * 0.45), 9 * scale * (1 + progress * 0.3), 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = `rgba(255, 246, 184, ${sparkleAlpha})`;
  for (let i = 0; i < 8; i += 1) {
    const angle = i * 2.399 + object.animSeed;
    const drift = progress * (18 + (i % 3) * 6);
    const flicker = 0.72 + Math.sin(time * 9 + i * 1.7) * 0.28;
    const x = cx + Math.cos(angle) * (16 + drift) * scale;
    const y = cy + Math.sin(angle) * (10 + drift * 0.55) * scale - progress * 16 * scale;
    const r = Math.max(1.2, (2.4 + (i % 2)) * flicker * scale);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawDamageCracks(ctx, object, x, y, width, height) {
  if (!object?.maxHp || object.hp >= object.maxHp) return;
  const missing = Math.max(0, Math.min(1, 1 - object.hp / object.maxHp));
  const stage = missing > 0.72 ? 3 : missing > 0.42 ? 2 : 1;
  const tree = object.type === "pine" || object.type === "old-oak";
  const region = tree
    ? { x: x + width * 0.36, y: y + height * 0.5, w: width * 0.28, h: height * 0.42 }
    : { x: x + width * 0.16, y: y + height * 0.18, w: width * 0.68, h: height * 0.68 };

  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  ctx.globalAlpha = 0.38 + stage * 0.12;
  ctx.strokeStyle = object.type === "crystal" ? "rgba(18, 54, 72, 0.9)" : "rgba(34, 24, 17, 0.86)";
  ctx.lineWidth = Math.max(1.1, Math.min(width, height) * 0.018);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const cx = region.x + region.w * 0.5;
  const cy = region.y + region.h * 0.45;
  drawCrackLine(ctx, [
    [cx, region.y + region.h * 0.06],
    [cx - region.w * 0.1, cy],
    [cx + region.w * 0.05, region.y + region.h * 0.88],
  ]);
  if (stage >= 2) {
    drawCrackLine(ctx, [
      [cx - region.w * 0.08, cy],
      [region.x + region.w * 0.18, region.y + region.h * 0.36],
      [region.x + region.w * 0.04, region.y + region.h * 0.58],
    ]);
  }
  if (stage >= 3) {
    drawCrackLine(ctx, [
      [cx + region.w * 0.04, cy + region.h * 0.08],
      [region.x + region.w * 0.78, region.y + region.h * 0.34],
      [region.x + region.w * 0.92, region.y + region.h * 0.52],
    ]);
  }
  ctx.restore();
}

function drawImageMaybeDamaged(ctx, image, sx, sy, sw, sh, dx, dy, dw, dh, object) {
  if (!object?.maxHp || object.hp >= object.maxHp) {
    ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
    return;
  }

  const temp = document.createElement("canvas");
  temp.width = Math.max(1, Math.ceil(dw));
  temp.height = Math.max(1, Math.ceil(dh));
  const tctx = temp.getContext("2d");
  tctx.drawImage(image, sx, sy, sw, sh, 0, 0, temp.width, temp.height);
  drawDamageCracks(tctx, object, 0, 0, temp.width, temp.height);
  ctx.drawImage(temp, dx, dy, dw, dh);
}

function drawCrackLine(ctx, points) {
  ctx.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

export function drawFoliageSprite(ctx, object, screen, biome, atlas, time = 0) {
  const sheetId = object.foliageSheet ?? biome?.id ?? "mainland";
  const sheet = atlas?.foliageSheet?.sheets?.[sheetId]
    ?? atlas?.foliageSheet?.sheets?.mainland
    ?? atlas?.foliageSheet;
  const cells = sheet?.cells;
  if (!cells?.length) return false;
  const variant = object.foliageVariant ?? object.treeVariant ?? 0;
  const cell = cells[Math.abs(Math.floor(variant)) % cells.length];
  const sprite = cell?.sprite;
  if (!sprite) return false;

  const sheetScale = Number(sheet?.renderScale) || 1;
  const scale = 0.38 * object.size * (object.visualScale ?? 1) * sheetScale;
  const width = sprite.width * scale;
  const height = sprite.height * scale;
  const bob = Math.sin(time * 1.15 + object.animSeed) * (object.wind ?? 0) * 2;

  ctx.save();
  ctx.translate(screen.x, screen.y + 12 + bob);
  ctx.rotate(object.rotation ?? 0);
  ctx.scale(object.flip ? -1 : 1, 1);
  ctx.globalAlpha *= object.alpha ?? 1;
  ctx.drawImage(sprite, -width * 0.5, -height * 0.74, width, height);
  ctx.restore();
  return true;
}

function drawTreeObject(ctx, object, screen, biome, atlas, time = 0) {
  const sheet = atlas?.treeSheets?.[biome?.id] ?? atlas?.treeSheets?.mainland;
  const cells = sheet?.cells;
  if (!cells?.length) return false;

  const variant = object.treeVariant ?? Math.floor((object.colorShift ?? 0) * cells.length);
  const cell = cells[Math.abs(variant) % cells.length];
  const sprite = cell?.sprite;
  if (!sprite) return false;

  const baseScale = object.type === "old-oak" ? 0.48 : 0.54;
  const scale = baseScale * object.size * (object.visualScale ?? 1);
  const width = sprite.width * scale;
  const height = sprite.height * scale;
  const wind = Math.sin(time * 1.2 + object.animSeed) * 0.014;
  const dx = -width * 0.5;
  const dy = -height + 28 * scale;

  ctx.save();
  ctx.translate(screen.x, screen.y + 14);
  ctx.rotate(wind);
  ctx.scale(object.flip ? -1 : 1, 1);
  drawImageMaybeDamaged(ctx, sprite, 0, 0, sprite.width, sprite.height, dx, dy, width, height, object);
  ctx.restore();
  return true;
}
