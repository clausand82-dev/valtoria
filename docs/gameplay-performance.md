# Gameplay performance verification — 2026-10-02

Baseline: commit `7ad72d9` in `clausand82-dev/valtoria`. Measurements compare that
checkout with the working changes using `scripts/measure-gameplay-performance.js`.

## Changes

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
