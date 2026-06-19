import { buildRegionStats } from "../../region-stats.js";

function increment(bucket, rawKey) {
  const key = String(rawKey ?? "").trim();
  if (!key) return;
  bucket[key] = (bucket[key] ?? 0) + 1;
}

export const regionStatsMethods = {
  rebuildRegionStats(options = {}) {
    this.currentRegionStats = buildRegionStats(this, options);
    return this.currentRegionStats;
  },

  runtimeDebugStats() {
    const particleEngine = this.particleEngine;
    const emittersByType = {};
    const particlesByType = {};
    const legacyParticlesByType = {};
    for (const emitter of particleEngine?.emitters?.values?.() ?? []) {
      increment(emittersByType, emitter?.config?.type ?? "unknown");
    }
    for (const particle of particleEngine?.particles ?? []) {
      const emitter = particleEngine?.emitters?.get?.(particle?.emitterId);
      increment(particlesByType, emitter?.config?.type ?? particle?.visual ?? particle?.movement ?? "unknown");
    }
    for (const particle of this.particles ?? []) {
      increment(legacyParticlesByType, particle?.type ?? (particle?.configParticle ? "configured" : "legacy"));
    }
    const timings = this.renderTimings ?? {};
    const counts = this.renderDebugCounts ?? {};
    const formatMs = (value) => Number.isFinite(Number(value)) ? Math.round(Number(value) * 10) / 10 : null;
    const visualActivityLevel = this.getVisualActivityLevel?.() ?? "idle";
    return {
      fps: this.lastFrameDt > 0 ? Math.round(1 / this.lastFrameDt) : 0,
      averageFps: Math.max(0, Math.round(Number(this.averageFps) || 0)),
      updateFps: Math.max(0, Math.round(Number(this.updateFps) || 0)),
      renderFps: Math.max(0, Math.round(Number(this.renderFps) || 0)),
      rafCallbacksPerSecond: Math.max(0, Math.round(Number(this.rafCallbacksPerSecond) || 0)),
      skippedRenderFrames: Math.max(0, Math.floor(Number(this.skippedRenderFrames) || 0)),
      renderDirty: Boolean(this.renderDirty),
      visualActivity: visualActivityLevel !== "idle",
      visualActivityLevel,
      visualActivityReasons: [...(this.visualActivityReasons ?? [])],
      ambientRenderFps: Math.max(0, Math.round(Number(this.ambientRenderFps) || 0)),
      lastRenderDirtyReasons: [...(this.lastRenderDirtyReasons ?? [])],
      canvasMegapixels: Math.round((((this.canvas?.width ?? 0) * (this.canvas?.height ?? 0)) / 1000000) * 100) / 100,
      updateFrameCount: Math.max(0, Math.floor(Number(this.updateFrameCount) || 0)),
      renderFrameCount: Math.max(0, Math.floor(Number(this.renderFrameCount) || 0)),
      rafCallbackCount: Math.max(0, Math.floor(Number(this.rafCallbackCount) || 0)),
      frameMs: this.lastFrameDt > 0 ? Math.round(this.lastFrameDt * 10000) / 10 : 0,
      targetFps: Math.max(0, Math.round(Number(this.targetFps) || 0)),
      performanceMode: this.performanceMode ?? "balanced",
      render: {
        totalMs: formatMs(timings.totalMs),
        tilesMs: formatMs(timings.tilesMs),
        objectsMs: formatMs(timings.objectsMs),
        particlesMs: formatMs(timings.particlesMs),
        fogMs: formatMs(timings.fogMs),
        minimapMs: formatMs(timings.minimapMs),
      },
      counts: {
        drawables: counts.drawables ?? 0,
        monsters: counts.monsters ?? this.monsters?.size ?? 0,
        objects: counts.objects ?? 0,
        particles: counts.particles ?? ((particleEngine?.particles?.length ?? 0) + (this.particles?.length ?? 0)),
        cachedTerrainLayers: counts.cachedTerrainLayers ?? this.countCachedTerrainLayers?.() ?? 0,
        terrainLayersCleared: this.terrainLayersCleared ?? counts.terrainLayersCleared ?? 0,
      },
      save: this.lastSaveInfo ? { ...this.lastSaveInfo } : null,
      particles: {
        enabled: particleEngine?.enabled ?? false,
        quality: particleEngine?.quality ?? "unknown",
        active: particleEngine?.particles?.length ?? 0,
        max: Math.max(0, Math.floor(Number(particleEngine?.maxParticles) || 0)),
        emitters: particleEngine?.emitters?.size ?? 0,
        poolCreated: Math.max(0, Math.floor(Number(particleEngine?.pool?.created) || 0)),
        poolFree: particleEngine?.pool?.free?.length ?? 0,
        legacy: this.particles?.length ?? 0,
        byType: particlesByType,
        emittersByType,
        legacyByType: legacyParticlesByType,
      },
      runtime: {
        monsters: this.monsters?.size ?? 0,
        critters: this.critters?.size ?? 0,
        loots: this.loots?.length ?? 0,
        projectiles: this.projectiles?.length ?? 0,
        groundHazards: this.groundHazards?.length ?? 0,
      },
    };
  },
};
