import assert from "node:assert/strict";

class FakeContext {
  constructor(canvas) { this.canvas = canvas; }
  save() {} restore() {} beginPath() {} moveTo() {} lineTo() {} closePath() {} clip() {} fill() {} fillRect() {} drawImage() {}
}
class FakeCanvas {
  constructor() { this.width = 0; this.height = 0; this.context = new FakeContext(this); }
  getContext() { return this.context; }
}
globalThis.document = { createElement: () => new FakeCanvas() };

const { renderingMethods } = await import("../src/game/GameEngine/methods/rendering.js");
const chunk = {
  x: 0,
  y: 0,
  tiles: [
    { x: 2, y: 0, groundSheetId: "mainland", variant: 0, water: false },
    { x: 0, y: 0, groundSheetId: "mainland", variant: 0, water: false },
    { x: 0, y: 1, groundSheetId: "mainland", variant: 0, water: false },
  ],
  decals: [],
  region: null,
};
const engine = {
  tileEdgeWallImage: null,
  atlas: null,
  terrainLayerDiagnostics: {},
  isInSubregion: () => false,
  markRenderDirty() {},
};

renderingMethods.getTerrainLayer.call(engine, chunk);
assert.deepEqual(chunk.terrainDrawTiles.map((tile) => [tile.x, tile.y]), [[0, 0], [0, 1], [2, 0]]);
assert.equal(engine.terrainLayerDiagnostics.tileOrderBuilds, 1);
assert.equal(engine.terrainLayerDiagnostics.builds, 1);

chunk.terrainLayer = null;
renderingMethods.getTerrainLayer.call(engine, chunk);
assert.equal(engine.terrainLayerDiagnostics.tileOrderBuilds, 1, "terrain ordering must survive a layer rebuild");
assert.equal(engine.terrainLayerDiagnostics.builds, 2);

console.log("[terrain-layer-cache] cached tile order survives terrain-layer rebuilds");
