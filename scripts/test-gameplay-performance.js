import assert from "node:assert/strict";
import { getBlockingObjects } from "../src/game/blocking-object-index.js";
import { lifecycleMethods } from "../src/game/GameEngine/methods/lifecycle.js";
import { renderingMethods } from "../src/game/GameEngine/methods/rendering.js";
import { effectsMethods } from "../src/game/GameEngine/methods/effects.js";
import { createRegion, createChunk, chunkCoords, isRegionPointPlayable } from "../src/game/world.js";
import { clearDamageRenderCache, drawImageMaybeDamaged } from "../src/game/assets.js";

let allocations = 0;
class Context {
  constructor(canvas) { this.canvas = canvas; }
  save() {} restore() {} beginPath() {} moveTo() {} lineTo() {} closePath() {}
  clip() {} fill() {} stroke() {} fillRect() {} clearRect() {} drawImage() {}
  setTransform() {} translate() {} rotate() {} ellipse() {}
}
class Canvas {
  constructor() { allocations++; this.width = 0; this.height = 0; this.ctx = new Context(this); }
  getContext() { return this.ctx; }
}
globalThis.document = { hidden: false, createElement: () => new Canvas() };
globalThis.requestAnimationFrame = () => 1;

function loopEngine(targetFps = 60) {
  const engine = Object.assign({
    targetFps, lastTime: 0, nextFrameTime: 0, frame: 0,
    rafCallbackCount: 0, renderFrameCount: 0, updateFrameCount: 0, skippedRenderFrames: 0,
    update(dt) { assert.ok(dt <= 0.034); this.simulationSeconds = (this.simulationSeconds ?? 0) + dt; },
    render() {}, clearRenderDirty() {}, shouldRenderFrame: () => true,
  }, lifecycleMethods);
  // The real update/render need world state; exercise the real scheduling only.
  engine.update = (dt) => { assert.ok(dt <= 0.034); engine.simulationSeconds = (engine.simulationSeconds ?? 0) + dt; };
  engine.render = () => {};
  engine.clearRenderDirty = () => {};
  engine.shouldRenderFrame = () => true;
  engine.resetFrameDiagnostics(0);
  return engine;
}
const slow = loopEngine();
for (let now = 50; now <= 1500; now += 50) slow.loop(now);
assert.equal(slow.averageFps, 20);
assert.equal(slow.updateFps, 20);
assert.equal(slow.renderFps, 20);
assert.equal(slow.rafCallbacksPerSecond, 20);
assert.equal(slow.lastFrameDt, 0.05, "frame-time diagnostics must report the full 50 ms");
assert.equal(slow.lastSimulationDt, 0.034);
assert.ok(Math.abs(slow.simulationSeconds - 30 * 0.034) < 1e-9);
const capped = loopEngine(20);
capped.nextFrameTime = 50;
for (let now = 10; now <= 1500; now += 10) capped.loop(now);
assert.equal(capped.updateFps, 20);
assert.equal(capped.renderFps, 20);
assert.equal(capped.rafCallbacksPerSecond, 100);
capped.paused = true;
for (let now = 1510; now <= 2250; now += 10) capped.loop(now);
assert.equal(capped.updateFps, 0);
assert.equal(capped.renderFps, 100);
document.hidden = true;
capped.loop(60000);
clearTimeout(capped.hiddenLoopTimer);
capped.hiddenLoopTimer = null;
document.hidden = false;
capped.paused = false;
capped.loop(120000);
for (let now = 120010; now <= 120750; now += 10) capped.loop(now);
assert.ok(Math.abs(capped.updateFps - 20) <= 1, "resumed window has at most one boundary callback");
for (let now = 120760; now <= 121500; now += 10) capped.loop(now);
assert.equal(capped.updateFps, 20, "hidden time must not enter resumed rates");

const terrainEngine = { tileEdgeWallImage: null, atlas: null, isInSubregion: () => false };
const empty = { x: 0, y: 0, tiles: [], decals: [], region: null };
let before = allocations;
for (let frame = 0; frame < 10; frame++) assert.equal(renderingMethods.getTerrainLayer.call(terrainEngine, empty), null);
assert.equal(allocations, before, "empty layers allocate no canvas");
empty.tiles.push({ x: 0, y: 0, variant: 0 });
assert.ok(renderingMethods.getTerrainLayer.call(terrainEngine, empty)?.canvas);
empty.tiles.length = 0;
assert.equal(renderingMethods.getTerrainLayer.call(terrainEngine, empty), null);
empty.region = { start: { x: 0, y: 0 }, end: { x: 100, y: 100 } };
assert.ok(renderingMethods.getTerrainLayer.call(terrainEngine, empty)?.canvas, "markers count without tiles");
empty.terrainLayer = null;
empty.region.start.x = 100;
empty.decals.push({ x: 0, y: 0 });
assert.equal(renderingMethods.getTerrainLayer.call(terrainEngine, empty), null, "decals clipped to no tiles are empty");
empty.region = null;
empty.decals[0] = { x: 0, y: 0, type: "plank", size: 1, rotation: 0 };
assert.ok(renderingMethods.getTerrainLayer.call(terrainEngine, empty)?.canvas, "unclipped decals count as content");
empty.decals = [];
empty.tiles = [{ x: 0, y: 0, variant: 0 }];
renderingMethods.getTerrainLayer.call(terrainEngine, empty);
empty.tiles = [{ x: 1, y: 0, variant: 0 }];
renderingMethods.getTerrainLayer.call(terrainEngine, empty);
assert.equal(empty.terrainDrawTiles[0].x, 1, "replacement tile arrays invalidate cached ordering");

const blocker = { blocking: true, x: 1, y: 2, radius: 0.5 };
const decoration = { blocking: false };
const chunk = { objects: [blocker, decoration] };
const originalJson = JSON.stringify(chunk);
const indexed = getBlockingObjects(chunk);
assert.deepEqual(indexed, [blocker]);
assert.equal(JSON.stringify(chunk), originalJson, "index metadata must not alter serialized data");
assert.equal(getBlockingObjects(chunk), indexed, "unchanged queries reuse the index");
decoration.blocking = true;
assert.deepEqual(getBlockingObjects(chunk), [blocker, decoration]);
blocker.x = 4;
assert.equal(getBlockingObjects(chunk)[0].x, 4, "positions stay live");
chunk.objects.splice(0, 1);
assert.deepEqual(getBlockingObjects(chunk), [decoration]);
chunk.objects[0] = blocker;
assert.deepEqual(getBlockingObjects(chunk), [blocker]);
chunk.objects = JSON.parse(originalJson).objects;
assert.equal(getBlockingObjects(chunk).length, 1, "load/replacement creates subscriptions");
chunk.objects[0].blocking = false;
assert.equal(getBlockingObjects(chunk).length, 0);
chunk.objects.push(blocker);
assert.deepEqual(getBlockingObjects(chunk), [blocker]);
const destination = { objects: [] };
getBlockingObjects(destination);
destination.objects.push(chunk.objects.pop());
assert.equal(getBlockingObjects(chunk).length, 0);
assert.deepEqual(getBlockingObjects(destination), [blocker], "moving between chunks updates both indexes");
destination.objects.length = 0;
assert.equal(getBlockingObjects(destination).length, 0);

// Compare the complete original predicate, including region/water boundaries.
const region = createRegion(1, 7341, null, { id: "collision-regression", mapSize: "small", spawnCounts: { objects: 24 } });
const chunks = new Map();
const collisionEngine = { region, getChunk(cx, cy) {
  const key = `${cx},${cy}`;
  if (!chunks.has(key)) chunks.set(key, createChunk(cx, cy, region));
  return chunks.get(key);
} };
const originalBlocked = (x, y, radius) => {
  if (!isRegionPointPlayable(region, x, y, radius)) return true;
  const { cx, cy } = chunkCoords(x, y);
  for (let yy = cy - 1; yy <= cy + 1; yy++) for (let xx = cx - 1; xx <= cx + 1; xx++)
    for (const object of collisionEngine.getChunk(xx, yy).objects)
      if (object.blocking && Math.hypot(object.x - x, object.y - y) < object.radius + radius) return true;
  return false;
};
for (let y = -8; y <= 8; y++) for (let x = -8; x <= 8; x++) {
  const px = region.start.x + x, py = region.start.y + y;
  assert.equal(effectsMethods.isBlocked.call(collisionEngine, px, py, 0.28), originalBlocked(px, py, 0.28));
}
for (const entry of [...chunks.values()]) for (const object of entry.objects) {
  if (!object.blocking) continue;
  assert.equal(effectsMethods.isBlocked.call(collisionEngine, object.x, object.y, 0.28), true);
}

clearDamageRenderCache();
const image = { width: 64, height: 64 };
const output = new Context({});
const damaged = { type: "rock", hp: 80, maxHp: 100 };
const drawDamage = (object = damaged, source = image, sx = 0, size = 64) =>
  drawImageMaybeDamaged(output, source, sx, 0, 32, 32, 10, 20, size, size, object);
before = allocations;
for (let frame = 0; frame < 60; frame++) drawDamage();
assert.equal(allocations - before, 1);
drawDamage({ ...damaged, hp: 70 });
assert.equal(allocations - before, 1, "same damage stage reuses the composite");
drawDamage({ ...damaged, hp: 50 });
drawDamage(damaged, image, 32);
drawDamage(damaged, { ...image });
drawDamage(damaged, image, 0, 65);
drawDamage({ ...damaged, type: "tree" });
assert.equal(allocations - before, 6, "stage/frame/image/size/type invalidate composites");
drawDamage({ ...damaged, hp: 100 });
assert.equal(allocations - before, 6, "undamaged and alternate-sheet draws allocate nothing");
clearDamageRenderCache();
drawDamage();
assert.equal(allocations - before, 7);
for (let frame = 0; frame < 129; frame++) drawDamage(damaged, image, frame);
before = allocations;
drawDamage();
assert.equal(allocations - before, 1, "least-recently-used composites are evicted");
clearDamageRenderCache();
drawDamage(damaged, image, 0, 2100);
before = allocations;
drawDamage(damaged, image, 0, 2100);
assert.equal(allocations - before, 1, "oversized composites are not retained");
clearDamageRenderCache();
drawDamage(damaged, image, 0, 1600);
drawDamage(damaged, image, 32, 1600);
before = allocations;
drawDamage(damaged, image, 0, 1600);
assert.equal(allocations - before, 1, "byte budget evicts composites before the entry limit");

const fog = {
  fogOfWarActive: true, player: { x: 0, y: 0 }, camera: { offsetX: 0, offsetY: 0 },
  region: {}, dpr: 1, width: 1920, height: 1080, fogRenderScale: 0.5,
  fogExploredPoints: [{ x: 1, y: 1, radius: 8 }, { x: 10000, y: 10000, radius: 8 }],
  drawMinimapRevealGradient() { this.reveals = (this.reveals ?? 0) + 1; },
  drawFogRevealGradient() { this.worldReveals = (this.worldReveals ?? 0) + 1; },
};
const minimap = new Context({ width: 154, height: 154 });
renderingMethods.drawMinimapFog.call(fog, minimap, 77, 3);
assert.equal(fog.reveals, 2, "only onscreen stamp and dynamic vision are drawn");
renderingMethods.drawMinimapFog.call(fog, minimap, 77, 3);
assert.equal(fog.reveals, 2, "unchanged overlay is reused");
fog.player.x += 0.01;
renderingMethods.drawMinimapFog.call(fog, minimap, 77, 3);
assert.equal(fog.reveals, 4, "subtile motion preserves dynamic vision");
renderingMethods.drawFogOfWar.call(fog, output);
const worldReveals = fog.worldReveals;
renderingMethods.drawFogOfWar.call(fog, output);
assert.equal(fog.worldReveals, worldReveals);
for (const mutate of [
  () => fog.camera.offsetX++, () => fog.width++, () => fog.camera.zoom = 2,
  () => fog.dpr = 2, () => fog.player.y += 0.01,
  () => fog.fogExploredPoints.push({ x: 0, y: 0, radius: 8 }),
  () => fog.region = {}, () => fog.fogExploredPoints = [...fog.fogExploredPoints],
  () => fog.currentMapInstanceId = "another-map-instance",
  () => fog.fogRenderScale = 0.75,
]) {
  const previous = fog.worldReveals;
  mutate();
  renderingMethods.drawFogOfWar.call(fog, output);
  assert.ok(fog.worldReveals > previous, "changed fog inputs rebuild the overlay");
}
console.log("[gameplay-performance] elapsed FPS, empty terrain, collision mutations, bounded damage cache and fog invalidation OK");
