import assert from "node:assert/strict";
import { loadTileEdgeWallImage } from "../src/game/assets-wall.js";
import { TILE_EDGE_WALLS } from "../src/game/config/tile-edge-wall-config.js";
import {
  getTileEdgeWallAnchors,
  getTileEdgeWallRenderHeight,
  getTileWallEdges,
  hasPlayableTileAt,
  tileEdgeWallCacheKey,
} from "../src/game/GameEngine/helpers/tile-edge-walls.js";

// Rendering is intentionally disabled in the game config. Exercise the edge
// calculation with a test-only enabled copy so this test remains meaningful.
const wallConfig = { ...TILE_EDGE_WALLS, enabled: true };

function regionFromTiles(tiles) {
  return { mask: new Set(tiles.map(([x, y]) => `${x},${y}`)) };
}

const acrossChunkRegion = regionFromTiles([[15, 4], [16, 4], [16, 3]]);
assert.equal(hasPlayableTileAt(acrossChunkRegion, 16, 4), true);
assert.deepEqual(getTileWallEdges({ x: 16, y: 4 }, acrossChunkRegion, wallConfig), []);
assert.deepEqual(getTileWallEdges({ x: 15, y: 4 }, acrossChunkRegion, wallConfig), ["back", "left"]);

const irregularRegion = regionFromTiles([[2, 3], [3, 2], [3, 3], [8, 8]]);
assert.deepEqual(getTileWallEdges({ x: 3, y: 3 }, irregularRegion, wallConfig), []);
assert.deepEqual(getTileWallEdges({ x: 8, y: 8 }, irregularRegion, wallConfig), ["back", "left"]);

const backAnchors = getTileEdgeWallAnchors("back", 100, 80, TILE_EDGE_WALLS.overlapPx);
const leftAnchors = getTileEdgeWallAnchors("left", 100, 80, TILE_EDGE_WALLS.overlapPx);
assert.ok(backAnchors.startX < 100 && backAnchors.endX > 152, "back overlap must extend both endpoints");
assert.ok(leftAnchors.startX < 48 && leftAnchors.endX > 100, "left overlap must extend both endpoints");

const fakeImage = { width: 311, height: 197 };
assert.ok(
  getTileEdgeWallRenderHeight({ width: 1024, height: 2048 }, TILE_EDGE_WALLS) > 100,
  "high wall texture aspect ratio must produce a taller wall",
);
assert.notEqual(
  tileEdgeWallCacheKey(fakeImage, TILE_EDGE_WALLS, false),
  tileEdgeWallCacheKey(fakeImage, TILE_EDGE_WALLS, true),
  "debug changes must invalidate terrain layers",
);

const OriginalImage = globalThis.Image;
const originalWarn = console.warn;
let warning = "";
globalThis.Image = class FailingImage {
  set src(_value) {
    queueMicrotask(() => this.onerror?.());
  }
};
console.warn = (message) => { warning = String(message); };
try {
  const failedImage = await loadTileEdgeWallImage("missing-wall-test.png");
  assert.equal(failedImage, null);
  assert.match(warning, /wall rendering disabled/i);
} finally {
  console.warn = originalWarn;
  if (OriginalImage === undefined) delete globalThis.Image;
  else globalThis.Image = OriginalImage;
}

console.log("[tile-edge-walls] neighbour, chunk-border, overlap, cache and asset-failure tests passed");
