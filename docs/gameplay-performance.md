# Gameplay performance verification — 2026-10-02

## Recording frame spikes

### Follow-up: click stalls and brief blank frames

The `17-05-53-004Z` recording contains only 29.4 ms of discarded simulation
time over approximately 60.9 seconds. Catch-up therefore addresses the earlier
slowdown, but RAF delivery still stalls up to 152.8 ms. Browser LoAF entries
attribute 65–76 ms to `CANVAS.onpointerdown` / `handlePointerDown`, followed by
approximately 62–64 ms of React work. The maximum measured synchronous game-loop
callback is 15.4 ms; its update/render timings alone do not explain these stalls.

Hover changes now publish only the hovered monster, retaining the last complete
snapshot's inventory, quest and player references. A fresh per-publication object
token lets React retain city calculations for hover-only changes, including
across engine/session replacement. Full snapshots still refresh all data.
Pointer-down reuses its pointer-move monster hit test and discovery call.

Full snapshots (including spell-cast snapshots) and city stat calculations share
one normalized world-state copy within each synchronous read-only calculation.
Nested condition checks previously cloned that state repeatedly. The regression
fixture reduces 100 nested condition queries from 450 copies to one with equal
results. The scope ends in `finally`, retains nothing between calculations, and
does not alter normalization used by write helpers. Tests verify subsequent
in-place changes, nested scopes, writes and exception cleanup. This is an
operation-count result, not a measured browser FPS improvement.

Adaptive quality changes call `resize()` after rendering. Previously even an
unchanged size reassigned canvas dimensions, clearing the displayed bitmap.
Unchanged sizes now return without clearing. Actual viewport/DPR changes retain
a temporary copy of the completed frame, restore it at the new size synchronously,
and mark rendering dirty. This fixes that identified blank-frame path; the user's
reported blink still requires visual confirmation in the browser. Regression
tests cover unchanged sizes, DPR changes, frame restoration and invalidation.

The recording format now includes `metadata.performanceSchemaVersion: 3` and
`samples[].frameWindow`. Each window measures every completed visible RAF
callback, including capped/paused callbacks, and records count, mean, P95,
maximum and counts at/above 50/100 ms for RAF/update/render intervals and actual
update/render/callback CPU work. Skipped work contributes no stale timing.
`simulationDroppedMs` measures time omitted beyond the bounded catch-up budget;
`simulationAdvancedMs` and `simulationSubsteps` report how much was simulated.

Each window retains its five slowest RAF intervals and five slowest callbacks,
with update/render categories, activity, region, chunk creation and preceding
callback timings. `summary.frameWindows` reports window maxima and the ten
slowest events of each kind. Summary P95 fields explicitly mean the maximum
window P95, not a percentile of the entire recording. `worstSample` now considers
window spikes. Existing category samples remain latest-frame readings.

Sampling runs after completed callbacks. Starting a recording clears earlier
observations; stopping retains the partial final window. Hidden-tab resets
exclude background gaps. Stored percentile observations are capped at 4096 per
metric/window, with an explicit truncation flag; maxima/counts still include all
observations. Callback CPU excludes recording aggregation, GPU execution and
other event-loop tasks; those can still cause RAF delays without high measured
update/render CPU.

The regression suite simulates an 80 ms update plus 40 ms render between normal
one-second samples: the exported maximum preserves both costs and the following
140 ms RAF interval, even though the latest update snapshot is only 2 ms. It
also checks P95, bounded storage, partial stop, restart and automatic stop.

## Bounded simulation catch-up and browser diagnostics

Simulation now advances the elapsed time using at most four equal substeps of
at most 34 ms each. A 50 ms frame runs two 25 ms updates, so stable 20 FPS advances
one full simulation second per wall second. Catch-up is capped at 136 ms per
callback; excess time after severe stalls is intentionally discarded and
reported. No accumulated backlog is carried into future frames. Pauses, hidden
tabs and region transitions do not trigger an unbounded catch-up. Rendering and
update-FPS counters remain per callback; simulation-step counts are separate.
Frame-local caches are invalidated per substep, and update category totals are
summed for callbacks containing multiple updates.

Regression tests compare real collision movement at 20 FPS/two 25 ms substeps
with 40 FPS/one 25 ms step, verify blocking objects are not crossed, and verify
cooldowns advance a full second. Tests cover 40/80/125 ms frames, a five-second
stall (four steps, 136 ms advanced), and stopping catch-up on map transitions.

`samples[].browserTiming` and `summary.browserTiming` now record feature-detected
Long Tasks and Long Animation Frames using PerformanceObserver. Bounded lists
include performance-timeline timestamps, script source/function/invoker,
blocking duration, render-phase duration and forced style/layout costs. The
observer queue is drained before snapshots, late delivery keeps its original
timestamps, and recording/visibility boundaries exclude old events. Unsupported
APIs and registration errors are explicitly reported. Observers disconnect at
engine shutdown. The debug panel shows 60-second lost simulation time, maximum
RAF interval and browser-event counts. API behavior is documented by
[Chrome's Long Animation Frames guide](https://developer.chrome.com/docs/web-platform/long-animation-frames)
and the [Long Tasks specification](https://www.w3.org/TR/longtasks-1/).

These are browser-reported main-thread/rendering observations, not direct GPU
or GC profiling. The session still exposes no browser for visual validation;
browser-observer behavior is tested with mocked asynchronous reports, queued
records, bounded event retention and unsupported APIs. New gameplay recordings
are required to verify the perceived improvement and identify remaining pauses.

Baseline: commit `7ad72d9` in `clausand82-dev/valtoria`. Measurements compare that
checkout with the working changes using `scripts/measure-gameplay-performance.js`.

## Initial optimization changes (before bounded catch-up)

- FPS windows use elapsed RAF time and separate update/render/RAF counters. Skipped
  and paused callbacks contribute real time; hidden intervals reset the window.
  Instantaneous FPS and frame milliseconds also use actual time. Simulation still
  caps each update at 34 ms; no catch-up or movement-speed change was introduced.
- Empty terrain layers allocate/draw no canvas. Tile/decal lengths and region
  markers determine emptiness in constant time. Region decals remain clipped to
  tiles. Array replacement/length changes, atlas changes and wall settings
  invalidate layers; tile ordering remains reusable across ordinary rebuilds.
- Each chunk maintains a runtime blocking-object index. Array mutation/replacement
  and blocking-status setters mark it dirty; the next query rebuilds it once.
  Unchanged queries reuse the list. Positions/radii stay live references. Chunk
  creation initializes tracking, and restored chunks initialize on first access.
  The original precise distance and region/water predicates are unchanged.
  Metadata lives in WeakMaps, outside serialized saves and subregion snapshots.
- Damaged sprite composites use an LRU cache capped at 128 entries and 16 MiB of
  estimated RGBA pixels. Keys include source identity/frame, raster dimensions,
  object type and existing damage stage. Offscreen smoothing and alternate damage
  sheets retain their original behavior. Map resets and asset refreshes clear it.
- Minimap fog culls offscreen reveal circles, including their full radius. World
  and minimap overlays reuse their viewport-sized canvas when inputs match. Keys
  cover region/map instance, immutable exploration stamps/revision, player
  position, camera offsets, viewport, scale, DPR, zoom and fog configuration.
  Fractional player movement still rebuilds the dynamic view. No world-sized
  bitmap or additional spatial fog index was added.

Autosave frequency and particle behavior were not changed.

## Measurements

Inn of the Good Oak, seed 7341, start-position camera, 1920×1080, DPR 1; identical
fallback assets and a no-op Canvas context on both revisions. This is an
operation/Node CPU benchmark, **not a browser frame-time or FPS measurement**.
There is no GPU quality profile in this harness. It cannot establish gains for
the browser's balanced/high/low graphics profiles.

| Operation | Before | After |
| --- | ---: | ---: |
| Terrain canvases allocated / layers drawn | 15 / 15 | 5 / 5 |
| Mean collision object visits, 150 playable queries near start | 114 | 14 |
| Damage canvases, 60 identical damaged sprite draws | 60 | 1 |
| Minimap gradients, 1,000 stamps and two identical draws | 2,002 | 6 |

Collision CPU measurements exclude visit-counting proxies and canvas work. Each
run uses 30 timed batches of 20 repetitions over the same 150 queries after
warm-up. In the final run, median/P95 milliseconds per query were
**0.03538/0.03634 before** and **0.03599/0.04019 after**. Earlier runs varied around
0.039 ms per query. There is **no demonstrated collision CPU-time improvement**
in this start-position sample despite the reduction in object visits. All 150
sampled positions were unblocked on both revisions; the regression suite also
checks blocking positions and equivalence with the complete original predicate.

A deterministic scheduling regression supplies frames 50 ms apart: update,
render and RAF diagnostics report 20 Hz and 50 ms/frame while simulation remains
34 ms/update. This verifies measurement correctness, not a gameplay speed gain.

Expected benefits are fewer large canvas allocations/blits, less candidate work
in object-heavy collision queries, and less repeated damage/fog composition.
Actual browser gains remain unmeasured.

## Validation and limits

`npm run check` covers config validation, all existing suites, the new
`test:gameplay-performance` suite, production build and production editor guard.
The regression suite checks real elapsed FPS, capped/paused scheduling, hidden
tab resume, terrain content additions/replacements, collision mutations and
predicate equivalence, damage cache reuse/invalidation/entry and byte limits,
and fog culling/invalidation. Existing save tests still verify critical flushes.

The Vite server starts successfully, but the session exposes no available
browser (`cua.listBrowsers()` returned an empty list). Consequently visual
movement, combat, destruction, exploration, zoom and map-switch verification,
real frame times, update/render browser timings and browser profiling remain
outstanding. Existing config and bundle-size warnings are unrelated to these
changes. User edits in `history.md` were preserved.

Run the operation benchmark with:

```sh
node scripts/measure-gameplay-performance.js
node scripts/measure-gameplay-performance.js <baseline-checkout>
```

For this historical baseline only, expose its existing private
`drawImageMaybeDamaged` function by appending `export { drawImageMaybeDamaged };`
to the **temporary baseline checkout's** `src/game/assets.js`; otherwise the
benchmark skips the damage measurement. The function's implementation is not
changed. The temporary checkout used for this comparison was removed afterward.
