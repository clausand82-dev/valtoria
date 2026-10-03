// Browser reports arrive asynchronously. Keep timestamps on the performance.now
// timeline so they can be compared with RAF events, even across sample boundaries.
const LIMIT = 10;
const round = (value) => Math.round((Number(value) || 0) * 100) / 100;
const bucket = () => ({ count: 0, totalDurationMs: 0, maxDurationMs: 0, longest: [] });

function sourceUrl(value) {
  try { const url = new URL(value); return `${url.origin}${url.pathname}`.slice(0, 500); }
  catch { return String(value ?? "").split(/[?#]/)[0].slice(0, 500); }
}

function consume(engine, entries) {
  const state = engine.browserTimingState;
  if (!state) return;
  for (const entry of entries) {
    if (entry.startTime < state.sinceMs || (typeof document !== "undefined" && document.hidden)) continue;
    const target = entry.entryType === "longtask" ? state.longTasks : state.longAnimationFrames;
    target.count++;
    target.totalDurationMs += entry.duration;
    target.maxDurationMs = Math.max(target.maxDurationMs, entry.duration);
    if (target.longest.length >= LIMIT && entry.duration <= target.longest.at(-1).durationMs) continue;
    const detail = {
      startTimeMs: round(entry.startTime), durationMs: round(entry.duration),
      endTimeMs: round(entry.startTime + entry.duration), name: entry.name ?? "",
    };
    if (entry.entryType === "longtask") {
      detail.attribution = Array.from(entry.attribution ?? []).slice(0, 5).map((item) => ({
        name: item.name ?? "", containerType: item.containerType ?? "", containerId: item.containerId ?? "",
        containerSrc: sourceUrl(item.containerSrc),
      }));
    } else {
      Object.assign(detail, {
        blockingDurationMs: round(entry.blockingDuration), renderStartMs: round(entry.renderStart),
        styleAndLayoutStartMs: round(entry.styleAndLayoutStart), firstUIEventTimestampMs: round(entry.firstUIEventTimestamp),
        // Includes style/layout/paint work, not a direct GPU measurement.
        renderingPhaseMs: entry.renderStart > 0 ? round(Math.max(0, entry.startTime + entry.duration - entry.renderStart)) : null,
        scripts: Array.from(entry.scripts ?? []).sort((a, b) => b.duration - a.duration).slice(0, 5).map((script) => ({
          durationMs: round(script.duration), startTimeMs: round(script.startTime),
          invoker: script.invoker ?? script.name ?? "", invokerType: script.invokerType ?? "",
          sourceURL: sourceUrl(script.sourceURL), sourceFunctionName: script.sourceFunctionName ?? "",
          sourceCharPosition: script.sourceCharPosition ?? null,
          forcedStyleAndLayoutDurationMs: round(script.forcedStyleAndLayoutDuration),
          pauseDurationMs: round(script.pauseDuration),
        })),
      });
    }
    target.longest.push(detail);
    target.longest.sort((a, b) => b.durationMs - a.durationMs);
    target.longest.length = Math.min(LIMIT, target.longest.length);
  }
}

function drain(engine) {
  for (const observer of engine.browserTimingState?.observers ?? []) consume(engine, observer.takeRecords());
}

export function resetBrowserTimingWindow(engine, now, resetObservationBoundary = true) {
  const state = engine.browserTimingState;
  if (!state) return;
  // Clear buffered entries at recording/visibility boundaries, but keep entries
  // delivered late in ordinary windows for timestamp-based correlation.
  if (resetObservationBoundary) {
    for (const observer of state.observers) observer.takeRecords();
    state.sinceMs = now;
  }
  state.longTasks = bucket();
  state.longAnimationFrames = bucket();
}

export function startBrowserTimingObservation(engine) {
  stopBrowserTimingObservation(engine);
  const Observer = globalThis.PerformanceObserver;
  const supported = Observer?.supportedEntryTypes ?? [];
  engine.browserTimingState = {
    sinceMs: performance.now(), observers: [], errors: [],
    supported: { longTasks: supported.includes("longtask"), longAnimationFrames: supported.includes("long-animation-frame") },
    longTasks: bucket(), longAnimationFrames: bucket(),
  };
  const observationState = engine.browserTimingState;
  for (const type of ["longtask", "long-animation-frame"]) {
    if (!supported.includes(type)) continue;
    let observer;
    try {
      observer = new Observer((list) => {
        if (engine.browserTimingState === observationState) consume(engine, list.getEntries());
      });
      observer.observe({ type });
      engine.browserTimingState.observers.push(observer);
    } catch (error) {
      observer?.disconnect();
      engine.browserTimingState.supported[type === "longtask" ? "longTasks" : "longAnimationFrames"] = false;
      engine.browserTimingState.errors.push({ type, message: String(error.message ?? error) });
    }
  }
}

export function stopBrowserTimingObservation(engine) {
  drain(engine);
  for (const observer of engine.browserTimingState?.observers ?? []) observer.disconnect();
  if (engine.browserTimingState) engine.browserTimingState.observers = [];
}

export function browserTimingSnapshot(engine) {
  drain(engine);
  const state = engine.browserTimingState;
  const snapshot = (value) => ({ ...value, totalDurationMs: round(value.totalDurationMs),
    maxDurationMs: round(value.maxDurationMs), longest: [...value.longest] });
  return {
    supported: state ? { ...state.supported } : { longTasks: false, longAnimationFrames: false },
    errors: [...(state?.errors ?? [])],
    longTasks: snapshot(state?.longTasks ?? bucket()), longAnimationFrames: snapshot(state?.longAnimationFrames ?? bucket()),
  };
}
