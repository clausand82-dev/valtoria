// CPU/operation benchmark only. The no-op canvas does not measure browser FPS/GPU work.
// Run against the same revision's source tree, or pass a baseline checkout as argv[2].
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const root = resolve(process.argv[2] ?? ".");
const load = (file) => import(pathToFileURL(resolve(root, file)));
const { createRegion, createChunk, chunkCoords, isRegionPointPlayable } = await load("src/game/world.js");
const { MAP_REGION_SETS } = await load("src/game/config/map-region-config.js");
const { renderingMethods } = await load("src/game/GameEngine/methods/rendering.js");
const { effectsMethods } = await load("src/game/GameEngine/methods/effects.js");
const { worldToIso } = await load("src/game/iso.js");
const assets = await load("src/game/assets.js");
let canvasAllocations = 0;
class Context {
  constructor(canvas) { this.canvas = canvas; }
  save() {} restore() {} beginPath() {} moveTo() {} lineTo() {} closePath() {}
  clip() {} fill() {} stroke() {} fillRect() {} clearRect() {} drawImage() {}
  setTransform() {} translate() {} rotate() {} scale() {} ellipse() {} arc() {}
}
class Canvas {
  constructor() { canvasAllocations++; this.width = 0; this.height = 0; this.ctx = new Context(this); }
  getContext() { return this.ctx; }
}
globalThis.document = { createElement: () => new Canvas() };
const config = Object.values(MAP_REGION_SETS).flat().find((entry) => entry.id === "inn-of-the-good-oak");
if (!config) throw new Error("Inn scene not found");
const region = createRegion(1, 7341, null, config);
const iso = worldToIso(region.start.x, region.start.y);
let objectVisits = 0;
const uninstrumentedObjects = new WeakMap();
const engine = {
  region, player: { ...region.start }, width: 1920, height: 1080, dpr: 1,
  camera: { offsetX: 960 - iso.x, offsetY: 540 - iso.y + 72 },
  tileEdgeWallImage: null, atlas: null, frame: 1, chunks: new Map(),
  isInSubregion: () => false,
  getChunk(cx, cy) {
    const key = `${cx},${cy}`;
    if (!this.chunks.has(key)) {
      const chunk = createChunk(cx, cy, region);
      // Count visits to the blocking predicate, including nonblocking objects.
      chunk.objects = chunk.objects.map((object) => {
        const proxy = new Proxy(object, {
          get(target, key, receiver) {
            if (key === "blocking") objectVisits++;
            return Reflect.get(target, key, receiver);
          },
        });
        uninstrumentedObjects.set(proxy, object);
        return proxy;
      });
      this.chunks.set(key, chunk);
    }
    return this.chunks.get(key);
  },
  getTerrainLayer: renderingMethods.getTerrainLayer,
};
let terrainDraws = 0;
renderingMethods.drawTiles.call(engine, { drawImage() { terrainDraws++; } });
const terrainCanvases = canvasAllocations;
const { cx, cy } = chunkCoords(region.start.x, region.start.y);
for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 2; x <= cx + 2; x++) engine.getChunk(x, y);
const queries = [];
for (let y = -3; y <= 3; y += 0.5) for (let x = -3; x <= 3; x += 0.5) {
  const point = { x: region.start.x + x, y: region.start.y + y };
  if (isRegionPointPlayable(region, point.x, point.y, 0.28)) queries.push(point);
}
const query = (point) => effectsMethods.isBlocked.call(engine, point.x, point.y, 0.28);
for (const point of queries) query(point); // warm indexes and chunks
objectVisits = 0;
const results = queries.map(query);
const visitsPerQuery = objectVisits / queries.length;
// Timings use normal runtime objects, without the visit-counting proxy overhead.
for (const chunk of engine.chunks.values())
  chunk.objects = chunk.objects.map((object) => uninstrumentedObjects.get(object) ?? object);
for (let repeat = 0; repeat < 20; repeat++) for (const point of queries) query(point);
const timings = [];
for (let sample = 0; sample < 30; sample++) {
  const start = performance.now();
  for (let repeat = 0; repeat < 20; repeat++) for (const point of queries) query(point);
  timings.push((performance.now() - start) / (20 * queries.length));
}
timings.sort((a, b) => a - b);
const image = { width: 64, height: 64 };
const damaged = { type: "rock", hp: 80, maxHp: 100 };
const output = new Context({});
let fogGradients = 0;
const fogEngine = {
  fogOfWarActive: true, player: { x: 0, y: 0 }, region: {}, dpr: 1,
  fogExploredPoints: Array.from({ length: 1000 }, (_, i) => ({ x: i < 5 ? i : i * 100, y: 0, radius: 8 })),
  drawMinimapRevealGradient() { fogGradients++; },
};
const minimapContext = new Context({ width: 154, height: 154 });
renderingMethods.drawMinimapFog.call(fogEngine, minimapContext, 77, 3);
renderingMethods.drawMinimapFog.call(fogEngine, minimapContext, 77, 3);
canvasAllocations = 0;
if (assets.drawImageMaybeDamaged) {
  for (let frame = 0; frame < 60; frame++)
    assets.drawImageMaybeDamaged(output, image, 0, 0, 64, 64, 0, 0, 64, 64, damaged);
}
console.log(JSON.stringify({
  scene: config.id, seed: 7341, viewport: [1920, 1080], dpr: 1,
  assets: "fallback/no-op canvas (not browser rendering)",
  terrainDraws, terrainCanvases, queries: queries.length,
  collisionVisitsPerQuery: Number(visitsPerQuery.toFixed(2)),
  collisionQueryMedianMs: Number(timings[15].toFixed(5)),
  collisionQueryP95Ms: Number(timings[28].toFixed(5)),
  blockedQueries: results.filter(Boolean).length,
  damageCanvasesFor60Draws: canvasAllocations,
  minimapFogGradientsForTwoIdenticalDraws: fogGradients,
}, null, 2));
