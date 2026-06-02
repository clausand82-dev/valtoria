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
    return {
      fps: this.lastFrameDt > 0 ? Math.round(1 / this.lastFrameDt) : 0,
      averageFps: Math.max(0, Math.round(Number(this.averageFps) || 0)),
      targetFps: Math.max(0, Math.round(Number(this.targetFps) || 0)),
      performanceMode: this.performanceMode ?? "balanced",
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
