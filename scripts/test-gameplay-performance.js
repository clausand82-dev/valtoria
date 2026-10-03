import assert from "node:assert/strict";
import { getBlockingObjects } from "../src/game/blocking-object-index.js";
import { lifecycleMethods } from "../src/game/GameEngine/methods/lifecycle.js";
import { renderingMethods } from "../src/game/GameEngine/methods/rendering.js";
import { effectsMethods } from "../src/game/GameEngine/methods/effects.js";
import { inputMethods } from "../src/game/GameEngine/methods/input.js";
import { snapshotMethods } from "../src/game/GameEngine/methods/snapshot.js";
import { worldConditionMet, worldEntryAllowed, withWorldStateReadScope, setWorldFlag } from "../src/game/world-state.js";
import { createRegion, createChunk, chunkCoords, isRegionPointPlayable } from "../src/game/world.js";
import { clearDamageRenderCache, drawImageMaybeDamaged } from "../src/game/assets.js";
import { regionStatsMethods } from "../src/game/GameEngine/methods/region-stats.js";
import { recordPerformanceFrame, resetPerformanceFrameWindow, performanceFrameWindowSnapshot } from "../src/game/performance-frame-window.js";
import { startBrowserTimingObservation, stopBrowserTimingObservation, resetBrowserTimingWindow, browserTimingSnapshot } from "../src/game/performance-browser-timing.js";

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

// Quality changes after rendering must never publish a cleared canvas.
globalThis.window = { innerWidth: 800, innerHeight: 600, devicePixelRatio: 1.5 };
const resizeCanvas = new Canvas();
let bitmapClears = 0, preservedFrames = 0;
for (const dimension of ["width", "height"]) {
  let value = dimension === "width" ? 1200 : 900;
  Object.defineProperty(resizeCanvas, dimension, {
    get: () => value,
    set(next) { value = next; bitmapClears++; },
  });
}
resizeCanvas.ctx.drawImage = () => { preservedFrames++; };
const resizing = {
  canvas: resizeCanvas, ctx: resizeCanvas.ctx, width: 800, height: 600,
  dpr: 1.5, maxDpr: 1.5, renderFrameCount: 1,
  updateCamera() {}, markRenderDirty() { this.dirty = true; },
};
lifecycleMethods.resize.call(resizing);
assert.equal(bitmapClears, 0, "unchanged dimensions must not clear the completed frame");
resizing.maxDpr = 1;
lifecycleMethods.resize.call(resizing);
assert.equal(bitmapClears, 2);
assert.equal(preservedFrames, 1, "DPR changes must restore the old frame before returning");
assert.equal(resizing.dirty, true, "the next render must rebuild at the new resolution");
assert.equal(resizeCanvas.width, 800);
assert.equal(resizeCanvas.height, 600);
lifecycleMethods.resize.call(resizing);
assert.equal(bitmapClears, 2);
delete globalThis.window;

const hoverMob = { id: "hover", typeName: "Rat", level: 1, hp: 4.2, maxHp: 10, x: 1, y: 1, radius: 0.3 };
let lookups = 0, seenCalls = 0, fullBuilds = 0, publications = [];
const previousSnapshot = { snapshotContentToken: {}, player: { hp: 10 }, quests: {}, inventory: [], hoverMonster: null };
const hovering = Object.assign({
  canvas: { getBoundingClientRect: () => ({ left: 0, top: 0 }) },
  pointer: {}, camera: { x: 0, y: 0 }, player: { x: 0, y: 0 },
  monsters: new Map([[hoverMob.id, hoverMob]]), lastPublishedSnapshot: previousSnapshot,
  monsterAtScreen() { lookups++; return hoverMob; },
  markMobSeen() { seenCalls++; }, markRenderDirty() {},
  calcStats: () => ({ range: 0 }),
  onSnapshot(value) { publications.push(value); },
}, inputMethods, snapshotMethods);
hovering.publishSnapshot = () => { fullBuilds++; };
hovering.handlePointerDown({ clientX: 20, clientY: 30, button: 0 });
assert.equal(fullBuilds, 0, "hovering/clicking must not rebuild full quest and inventory snapshots");
assert.equal(lookups, 1, "a click reuses its pointer hit test");
assert.equal(seenCalls, 1, "a click must not record the same discovery twice");
assert.equal(publications.length, 1);
assert.equal(publications[0].hoverMonster.hp, 5);
for (const key of ["snapshotContentToken", "player", "quests", "inventory"]) {
  assert.equal(publications[0][key], previousSnapshot[key], `hover preserves ${key} identity`);
}
assert.equal(hovering.player.attackTargetId, hoverMob.id);
assert.deepEqual(hovering.player.target, { x: 1, y: 1 });
hovering.handlePointerLeave();
assert.equal(publications.at(-1).hoverMonster, null);
hovering.lastPublishedSnapshot = null;
hovering.publishHoverSnapshot();
assert.equal(fullBuilds, 1, "the initial publication still builds a complete snapshot");
hoverMob.dead = true;
hovering.hoverMonsterId = hoverMob.id;
assert.equal(hovering.hoverMonsterSnapshot(), null);

let stateCopies = 0;
const originalStructuredClone = globalThis.structuredClone;
globalThis.structuredClone = (value) => { stateCopies++; return originalStructuredClone(value); };
const conditionalState = {
  flags: { unlocked: true }, counters: { visits: 4.9 },
  values: { history: { value: 3 } },
};
const condition = { all: [{ flag: "unlocked" }, { counter: "visits", min: 4 }], not: { flag: "blocked" } };
const expectedCondition = worldConditionMet(condition, conditionalState);
stateCopies = 0;
for (let index = 0; index < 50; index++) {
  worldConditionMet(condition, conditionalState);
  worldEntryAllowed({ conditions: condition }, conditionalState);
}
const unscopedCopies = stateCopies;
stateCopies = 0;
withWorldStateReadScope(conditionalState, () => {
  for (let index = 0; index < 50; index++) {
    assert.equal(worldConditionMet(condition, conditionalState), expectedCondition);
    assert.equal(worldEntryAllowed({ conditions: condition }, conditionalState), true);
  }
  withWorldStateReadScope(conditionalState, () => {
    assert.equal(worldEntryAllowed({ conditions: { counter: "visits", min: 4 } }, conditionalState), true);
  });
  const changedState = setWorldFlag(conditionalState, "unlocked", false);
  assert.equal(changedState.flags.unlocked, false, "write helpers must still make independent normalized copies");
});
assert.equal(stateCopies, 2, "all condition reads share one copy; a write makes its own copy");
assert.ok(unscopedCopies > 200, "the fixture must exercise repeated nested normalization");
conditionalState.flags.unlocked = false;
withWorldStateReadScope(conditionalState, () => {
  assert.equal(worldConditionMet(condition, conditionalState), false, "new calculations see in-place changes");
});
assert.throws(() => withWorldStateReadScope(conditionalState, () => {
  worldConditionMet(condition, conditionalState);
  throw new Error("scope test");
}), /scope test/);
conditionalState.flags.unlocked = true;
assert.equal(worldConditionMet(condition, conditionalState), true, "exceptions must release the read scope");
globalThis.structuredClone = originalStructuredClone;

const completeSnapshots = [];
const publishing = Object.assign({
  player: { level: 1, hp: 10, mana: 4, stats: { killsByMonster: {} }, inventory: [], equipment: {} },
  region: { index: 1, seed: 7341 }, worldState: { flags: {}, counters: {}, values: {} },
  questState: { active: [], completed: [], cityFade: [] }, toasts: [], monsters: new Map(),
  calcStats: () => ({ maxHp: 10, maxMana: 10 }), currentChunk: () => ({}), xpForNextLevel: () => 100,
  collectQuestOffers: () => [], onSnapshot(value) { completeSnapshots.push(value); },
}, snapshotMethods);
publishing.publishSnapshot();
const firstContentToken = completeSnapshots[0].snapshotContentToken;
publishing.publishHoverSnapshot();
assert.equal(completeSnapshots[1].snapshotContentToken, firstContentToken);
publishing.player.mana = 2;
publishing.publishSnapshot();
assert.notEqual(completeSnapshots[2].snapshotContentToken, firstContentToken);
assert.equal(completeSnapshots[2].player.mana, 2, "full publication still refreshes combat state");

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
assert.equal(slow.lastSimulationDt, 0.05);
assert.equal(slow.lastSimulationStepCount, 2);
assert.ok(Math.abs(slow.simulationSeconds - 1.5) < 1e-9, "20 FPS must advance a full second per wall second");
assert.equal(performanceFrameWindowSnapshot(slow, 1500).simulationDroppedMs, 0);
for (const interval of [40, 80, 125]) {
  const timed = loopEngine();
  timed.loop(interval);
  assert.ok(Math.abs(timed.simulationSeconds - interval / 1000) < 1e-9);
  assert.ok(timed.lastSimulationStepCount <= 4);
}
const stalled = loopEngine();
stalled.loop(5000);
assert.equal(stalled.lastSimulationStepCount, 4);
assert.ok(Math.abs(stalled.simulationSeconds - 0.136) < 1e-9, "catch-up must be bounded after severe stalls");
assert.equal(performanceFrameWindowSnapshot(stalled, 5000).simulationDroppedMs, 4864);
const transitioned = loopEngine();
transitioned.region = {};
transitioned.update = (dt) => { transitioned.simulationSeconds = dt; transitioned.region = {}; };
transitioned.loop(100);
assert.equal(transitioned.lastSimulationStepCount, 1, "map transitions stop catch-up in the old world");
function movementEngine() {
  const engine = loopEngine();
  engine.player = { x: 0, y: 0, radius: 0.28 };
  engine.cooldown = 1;
  engine.isBlocked = effectsMethods.isBlocked;
  const collisionChunk = { objects: [{ x: 1, y: 0, radius: 0.3, blocking: true }] };
  engine.getChunk = () => collisionChunk;
  engine.update = (dt) => {
    assert.ok(dt <= 0.034);
    effectsMethods.moveEntity.call(engine, engine.player, 5 * dt, 0);
    engine.cooldown = Math.max(0, engine.cooldown - dt);
  };
  return engine;
}
const lowMotion = movementEngine(), referenceMotion = movementEngine();
for (let now = 50; now <= 1000; now += 50) lowMotion.loop(now);
for (let now = 25; now <= 1000; now += 25) referenceMotion.loop(now);
assert.deepEqual(lowMotion.player, referenceMotion.player, "20 FPS substeps preserve the same collision result as 40 FPS");
assert.ok(lowMotion.player.x < 1 - 0.3 - 0.28, "movement must not tunnel through the blocking object");
assert.ok(lowMotion.cooldown < 1e-9, "cooldowns follow real time at 20 FPS");
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

// A slow frame between one-second samples must survive in the exported window.
const realPerformance = globalThis.performance;
let testClock = 0;
globalThis.performance = { now: () => testClock };
try {
  const recorded = Object.assign(loopEngine(50), regionStatsMethods, {
    player: { x: 0, y: 0 }, chunks: new Map(), region: { id: "recording-test" },
    performanceStartTime: 0, getVisualActivityLevel: () => "active",
    update() {
      const cost = testClock === 200 ? 80 : 2;
      testClock += cost;
      this.updateTimings = { totalMs: cost, player: cost, worstCategory: "player" };
      this.updatePerformanceHistory(); // must not publish a partial callback
    },
    render() {
      const cost = testClock === 280 ? 40 : 3;
      testClock += cost;
      this.renderTimings = { totalMs: cost, objectsMs: cost };
    },
  });
  recorded.startPerformanceRecording(30);
  for (let now = 20; now <= 200; now += 20) { testClock = now; recorded.loop(now); }
  for (let now = 340; now <= 1020; now += 20) { testClock = now; recorded.loop(now); }
  const exported = recorded.exportPerformanceRecording();
  const measured = exported.samples.find((sample) => sample.frameWindow?.rafCount > 0);
  assert.equal(measured.frameWindow.updateMs.maxMs, 80);
  assert.equal(measured.frameWindow.renderMs.maxMs, 40);
  assert.equal(measured.frameWindow.rafIntervalMs.maxMs, 140);
  assert.equal(measured.frameWindow.updateMs.p95Ms, 2, "rare spike is retained by max even when below the P95 rank");
  assert.equal(measured.update.totalMs, 2, "the legacy last-frame reading alone misses the spike");
  assert.equal(measured.frameWindow.slowRafFrames[0].previousCallback.callbackMs, 120);
  assert.equal(measured.frameWindow.slowWorkFrames[0].updateCategories.player, 80);
  assert.equal(exported.summary.frameWindows.maxUpdateMs, 80);
  assert.equal(exported.summary.worstSample.frameWindow.updateMs.maxMs, 80);
  assert.equal(exported.metadata.performanceSchemaVersion, 3);
  assert.equal(measured.frameWindow.slowWorkFrames.length, 5);
  const priorCallbacks = exported.summary.frameWindows.recordedCallbacks;
  const pendingCallbacks = recorded.performanceFrameWindow.rafCount;
  testClock = 1040;
  recorded.loop(1040);
  recorded.stopPerformanceRecording();
  assert.equal(recorded.exportPerformanceRecording().summary.frameWindows.recordedCallbacks, priorCallbacks + pendingCallbacks + 1,
    "stop must retain a partial window exactly once");
  recorded.stopPerformanceRecording();
  assert.equal(recorded.exportPerformanceRecording().summary.frameWindows.recordedCallbacks, priorCallbacks + pendingCallbacks + 1);
  recorded.startPerformanceRecording(30);
  assert.equal(recorded.exportPerformanceRecording().summary.frameWindows.recordedCallbacks, 0,
    "a new recording must exclude prior observations");
  testClock = 32000;
  recorded.loop(32000);
  assert.equal(recorded.performanceRecording.active, false, "duration auto-stop must not recurse");
  assert.equal(recorded.exportPerformanceRecording().summary.frameWindows.recordedCallbacks, 1);

  const bounded = { frame: 0 };
  resetPerformanceFrameWindow(bounded, 0, true);
  for (let i = 1; i <= 5000; i++) {
    testClock = i;
    recordPerformanceFrame(bounded, i, i === 5000 ? 120 : 1, testClock);
  }
  const stats = performanceFrameWindowSnapshot(bounded, 5000);
  assert.equal(stats.rafIntervalMs.count, 5000);
  assert.equal(stats.rafIntervalMs.maxMs, 120, "bounded storage must still retain maxima after overflow");
  assert.equal(stats.rafIntervalMs.percentileTruncated, true);
  assert.equal(bounded.performanceFrameWindow.metrics.rafIntervalMs.values.length, 4096);
  assert.equal(stats.updateMs.count, 0, "skipped updates must not reuse old timing values");
  assert.equal(stats.renderMs.count, 0);
  resetPerformanceFrameWindow(bounded, 5000, true);
  assert.equal(performanceFrameWindowSnapshot(bounded, 5000).rafCount, 0);
} finally {
  globalThis.performance = realPerformance;
}

// Test observer delivery, queue draining, unsupported browsers and cleanup.
const originalObserver = globalThis.PerformanceObserver;
const observers = [];
class TestObserver {
  static supportedEntryTypes = ["longtask", "long-animation-frame"];
  constructor(callback) { this.callback = callback; this.entries = []; observers.push(this); }
  observe(options) { this.type = options.type; }
  takeRecords() { const entries = this.entries; this.entries = []; return entries; }
  disconnect() { this.disconnected = true; }
}
globalThis.PerformanceObserver = TestObserver;
try {
  const browserEngine = loopEngine();
  startBrowserTimingObservation(browserEngine);
  resetBrowserTimingWindow(browserEngine, 0);
  const task = { entryType: "longtask", startTime: 100, duration: 90, name: "self", attribution: [{ containerType: "window" }] };
  observers[0].entries.push(task);
  observers[1].callback({ getEntries: () => [{
    entryType: "long-animation-frame", startTime: 100, duration: 125, renderStart: 170,
    blockingDuration: 50, styleAndLayoutStart: 180,
    scripts: [{ duration: 60, sourceURL: "http://localhost/app.js?private=ignored", sourceFunctionName: "renderUI", forcedStyleAndLayoutDuration: 12 }],
  }] });
  const timing = browserTimingSnapshot(browserEngine);
  assert.equal(timing.longTasks.count, 1, "snapshot drains queued records");
  assert.equal(browserTimingSnapshot(browserEngine).longTasks.count, 1, "draining must not duplicate events");
  assert.equal(timing.longAnimationFrames.longest[0].renderingPhaseMs, 55);
  assert.equal(timing.longAnimationFrames.longest[0].scripts[0].sourceURL, "http://localhost/app.js");
  assert.equal(timing.longAnimationFrames.longest[0].scripts[0].forcedStyleAndLayoutDurationMs, 12);
  resetBrowserTimingWindow(browserEngine, 1000, false);
  observers[0].callback({ getEntries: () => [task] });
  assert.equal(browserTimingSnapshot(browserEngine).longTasks.count, 1, "late delivery retains timestamps from the prior ordinary window");
  resetBrowserTimingWindow(browserEngine, 1000);
  observers[0].callback({ getEntries: () => [task] });
  assert.equal(browserTimingSnapshot(browserEngine).longTasks.count, 0, "recording/visibility boundaries reject old entries");
  for (let i = 0; i < 100; i++) observers[0].entries.push({ ...task, startTime: 1100 + i, duration: 50 + i });
  const many = browserTimingSnapshot(browserEngine);
  assert.equal(many.longTasks.count, 100);
  assert.equal(many.longTasks.longest.length, 10);
  assert.equal(many.longTasks.maxDurationMs, 149);
  stopBrowserTimingObservation(browserEngine);
  assert.ok(observers.every((observer) => observer.disconnected));
  delete globalThis.PerformanceObserver;
  startBrowserTimingObservation(browserEngine);
  assert.deepEqual(browserTimingSnapshot(browserEngine).supported, { longTasks: false, longAnimationFrames: false });
} finally {
  if (originalObserver === undefined) delete globalThis.PerformanceObserver;
  else globalThis.PerformanceObserver = originalObserver;
}

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
console.log(`[gameplay-performance] frame timing, catch-up/collision, canvas resize preservation, hover/full snapshots, condition reads (${unscopedCopies} copies -> 1), terrain, damage cache and fog OK`);
