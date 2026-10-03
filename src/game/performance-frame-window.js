// Bounded per-window observations; statistics never affect simulation or quality.
const CAPACITY = 4096;
const SLOW_FRAME_LIMIT = 5;
const METRICS = ["rafIntervalMs", "updateIntervalMs", "renderIntervalMs", "updateMs", "renderMs", "callbackMs"];
const rounded = (value) => Math.round(value * 100) / 100;

function metric() {
  return { values: [], count: 0, sum: 0, max: 0, over50Ms: 0, over100Ms: 0 };
}

function add(bucket, value) {
  if (!Number.isFinite(value) || value < 0) return;
  bucket.count++;
  bucket.sum += value;
  bucket.max = Math.max(bucket.max, value);
  if (value >= 50) bucket.over50Ms++;
  if (value >= 100) bucket.over100Ms++;
  if (bucket.values.length < CAPACITY) bucket.values.push(value);
}

function summarize(bucket) {
  if (!bucket.count) return { count: 0, meanMs: null, p95Ms: null, maxMs: null, over50Ms: 0, over100Ms: 0, percentileTruncated: false };
  const sorted = [...bucket.values].sort((a, b) => a - b);
  return {
    count: bucket.count, meanMs: rounded(bucket.sum / bucket.count),
    p95Ms: rounded(sorted[Math.ceil(sorted.length * 0.95) - 1]), maxMs: rounded(bucket.max),
    over50Ms: bucket.over50Ms, over100Ms: bucket.over100Ms,
    percentileTruncated: bucket.count > CAPACITY,
  };
}

export function resetPerformanceFrameWindow(engine, now, resetIntervals = false) {
  engine.performanceFrameWindow = {
    startedAtMs: now, rafCount: 0, simulationDroppedMs: 0, simulationElapsedMs: 0, simulationAdvancedMs: 0, simulationSubsteps: 0,
    metrics: Object.fromEntries(METRICS.map((name) => [name, metric()])),
    slowRafFrames: [], slowWorkFrames: [],
  };
  if (resetIntervals) {
    engine.performanceFirstRafAt = now;
    engine.performanceLastUpdateAt = null;
    engine.performanceLastRenderAt = null;
    engine.performancePreviousCallback = null;
  }
}

function keepSlowFrame(list, score, makeFrame) {
  if (list.length >= SLOW_FRAME_LIMIT && score <= list[list.length - 1].scoreMs) return;
  list.push({ ...makeFrame(), scoreMs: rounded(score) });
  list.sort((a, b) => b.scoreMs - a.scoreMs);
  list.length = Math.min(list.length, SLOW_FRAME_LIMIT);
}

export function recordPerformanceFrame(engine, now, rafIntervalMs, callbackStartedAt, updateMs = null, renderMs = null) {
  if (engine.performanceFirstRafAt !== null && engine.performanceFirstRafAt !== undefined) {
    rafIntervalMs = Math.min(rafIntervalMs, Math.max(0, now - engine.performanceFirstRafAt));
    engine.performanceFirstRafAt = null;
  }
  if (!engine.performanceFrameWindow) resetPerformanceFrameWindow(engine, now - rafIntervalMs);
  const window = engine.performanceFrameWindow;
  const callbackMs = Math.max(0, performance.now() - callbackStartedAt);
  window.rafCount++;
  if (rafIntervalMs > 0) add(window.metrics.rafIntervalMs, rafIntervalMs);
  add(window.metrics.callbackMs, callbackMs);
  if (updateMs !== null) {
    add(window.metrics.updateMs, updateMs);
    if (engine.performanceLastUpdateAt !== null && engine.performanceLastUpdateAt !== undefined)
      add(window.metrics.updateIntervalMs, now - engine.performanceLastUpdateAt);
    engine.performanceLastUpdateAt = now;
    window.simulationDroppedMs += Math.max(0, (engine.lastFrameDt - engine.lastSimulationDt) * 1000 || 0);
    window.simulationElapsedMs += (engine.lastFrameDt || 0) * 1000;
    window.simulationAdvancedMs += (engine.lastSimulationDt || 0) * 1000;
    window.simulationSubsteps += engine.lastSimulationStepCount ?? 1;
  }
  if (renderMs !== null) {
    add(window.metrics.renderMs, renderMs);
    if (engine.performanceLastRenderAt !== null && engine.performanceLastRenderAt !== undefined)
      add(window.metrics.renderIntervalMs, now - engine.performanceLastRenderAt);
    engine.performanceLastRenderAt = now;
  }
  const makeFrame = () => ({
    elapsedMs: rounded(now - (engine.performanceStartTime ?? window.startedAtMs)),
    rafTimestampMs: rounded(now),
    simulationStepCount: updateMs === null ? 0 : engine.lastSimulationStepCount ?? 1,
    frame: engine.frame, rafIntervalMs: rounded(rafIntervalMs), callbackMs: rounded(callbackMs),
    updateMs: updateMs === null ? null : rounded(updateMs), renderMs: renderMs === null ? null : rounded(renderMs),
    updated: updateMs !== null, rendered: renderMs !== null, paused: Boolean(engine.paused),
    previousCallback: engine.performancePreviousCallback ? { ...engine.performancePreviousCallback } : null,
    regionId: engine.region?.mapRegion?.id ?? engine.region?.id ?? null,
    activityLevel: engine.visualActivityLevel ?? null, activityReasons: [...(engine.visualActivityReasons ?? [])],
    updateCategories: updateMs === null ? null : { ...(engine.updateTimings ?? {}) },
    renderCategories: renderMs === null ? null : {
      tilesMs: engine.renderTimings?.tilesMs ?? null, objectsMs: engine.renderTimings?.objectsMs ?? null,
      particlesMs: engine.renderTimings?.particlesMs ?? null, fogMs: engine.renderTimings?.fogMs ?? null,
    },
    chunksCreated: updateMs === null ? 0 : engine.lastSimulationChunksCreated ?? engine.chunkFrameMetrics?.chunksCreatedThisFrame ?? 0,
  });
  if (rafIntervalMs > 0) keepSlowFrame(window.slowRafFrames, rafIntervalMs, makeFrame);
  keepSlowFrame(window.slowWorkFrames, callbackMs, makeFrame);
  // A delayed callback can follow an expensive *previous* frame. Preserve both.
  engine.performancePreviousCallback ??= {};
  Object.assign(engine.performancePreviousCallback, {
    frame: engine.frame, callbackMs: rounded(callbackMs),
    updateMs: updateMs === null ? null : rounded(updateMs), renderMs: renderMs === null ? null : rounded(renderMs),
  });
}

export function performanceFrameWindowSnapshot(engine, now) {
  const window = engine.performanceFrameWindow;
  if (!window) return null;
  return {
    durationMs: rounded(Math.max(0, now - window.startedAtMs)), rafCount: window.rafCount,
    simulationDroppedMs: rounded(window.simulationDroppedMs),
    simulationElapsedMs: rounded(window.simulationElapsedMs), simulationAdvancedMs: rounded(window.simulationAdvancedMs),
    simulationSubsteps: window.simulationSubsteps,
    ...Object.fromEntries(METRICS.map((name) => [name, summarize(window.metrics[name])])),
    slowRafFrames: window.slowRafFrames.map((frame) => ({ ...frame })),
    slowWorkFrames: window.slowWorkFrames.map((frame) => ({ ...frame })),
  };
}
