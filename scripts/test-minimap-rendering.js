import assert from "node:assert/strict";

class FakeContext {
  constructor(canvas) { this.canvas = canvas; }
  clearRect() {} fillRect() {} drawImage() {} beginPath() {} arc() {} fill() {} stroke() {} save() {} restore() {} translate() {} rotate() {} strokeRect() {}
}
class FakeCanvas {
  constructor(size = 154) { this.width = size; this.height = size; this.ctx = new FakeContext(this); }
  getContext() { return this.ctx; }
}
globalThis.document = { createElement: () => new FakeCanvas() };

const { renderingMethods } = await import("../src/game/GameEngine/methods/rendering.js");
const canvas = new FakeCanvas();
const dynamicCanvas = new FakeCanvas();
const engine = {
  player: { x: 10, y: 10 },
  chunks: new Map([["0,0", { tiles: [{ x: 10, y: 10, edgeMask: false, water: false }] }]]),
  monsters: new Map(), loots: [], region: { start: { x: 10, y: 10 }, end: { x: 12, y: 12 } },
  minimapStaticRevision: 1, minimapFogRevision: 0, minimapStaticRebuildReason: "init", minimapCanvasStates: new WeakMap(),
  minimapDiagnostics: { invalidationReasons: {} }, minimapIntervalMs: 0, renderTimings: {},
  minimapActionTargets: () => [], isPointExplored: () => true, isPointVisible: () => true,
  drawMinimapPoint() {}, drawMinimapActionPoint() {}, drawMinimapFog() { this.fogDrawCalls = (this.fogDrawCalls ?? 0) + 1; },
  minimapDynamicSignature: renderingMethods.minimapDynamicSignature,
  invalidateMinimapStatic: renderingMethods.invalidateMinimapStatic,
  invalidateMinimapFogOverlay: renderingMethods.invalidateMinimapFogOverlay,
};

assert.equal(renderingMethods.renderMinimap.call(engine, canvas, dynamicCanvas), true, "initial minimap render must build a base layer");
assert.equal(engine.minimapDiagnostics.staticRebuilds, 1);
assert.equal(renderingMethods.renderMinimap.call(engine, canvas, dynamicCanvas), false, "unchanged minimap state must be skipped");
assert.equal(engine.minimapDiagnostics.skippedUnchanged, 1);
engine.player.x += 0.5;
assert.equal(renderingMethods.renderMinimap.call(engine, canvas, dynamicCanvas), true, "player movement must redraw the dynamic layer");
assert.equal(engine.minimapDiagnostics.staticRebuilds, 1, "small player movement must not rebuild terrain");
engine.invalidateMinimapFogOverlay("fog-reveal");
assert.equal(renderingMethods.renderMinimap.call(engine, canvas, dynamicCanvas), true, "fog invalidation must redraw without a terrain rebuild");
assert.equal(engine.minimapDiagnostics.staticRebuilds, 1);
engine.invalidateMinimapStatic("region-change");
assert.equal(renderingMethods.renderMinimap.call(engine, canvas, dynamicCanvas), true, "static invalidation must rebuild terrain");
assert.equal(engine.minimapDiagnostics.staticRebuilds, 2);
assert.ok(engine.minimapDiagnostics.dynamicRenders >= 4);

console.log("[minimap-rendering] static, fog, dynamic and unchanged invalidation paths OK");
