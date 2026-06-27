import { buildRegionStats } from "../../region-stats.js";

const PERFORMANCE_HISTORY_MAX_SAMPLES = 120;
const PERFORMANCE_SAMPLE_INTERVAL_MS = 1000;
const APP_NAME = "Valtoria";
const APP_VERSION = "0.2.0";

function increment(bucket, rawKey) {
  const key = String(rawKey ?? "").trim();
  if (!key) return;
  bucket[key] = (bucket[key] ?? 0) + 1;
}

function round(value, decimals = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  const mult = 10 ** decimals;
  return Math.round(numeric * mult) / mult;
}

function formatMs(value) {
  return Number.isFinite(Number(value)) ? Math.round(Number(value) * 10) / 10 : null;
}

function summarizeReasonCounts(samples, key) {
  const counts = {};
  for (const sample of samples) {
    for (const reason of sample[key] ?? []) increment(counts, reason);
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([reason, count]) => ({ reason, count }));
}

function average(samples, getter) {
  if (!samples.length) return 0;
  return round(samples.reduce((sum, sample) => sum + (Number(getter(sample)) || 0), 0) / samples.length, 2);
}

function maxValue(samples, getter) {
  if (!samples.length) return 0;
  return round(Math.max(...samples.map((sample) => Number(getter(sample)) || 0)), 2);
}

function minValue(samples, getter) {
  if (!samples.length) return 0;
  return round(Math.min(...samples.map((sample) => Number(getter(sample)) || 0)), 2);
}

function activitySplit(samples, durationSeconds) {
  const counts = { idle: 0, ambient: 0, active: 0 };
  for (const sample of samples) {
    const level = ["idle", "ambient", "active"].includes(sample.activityLevel) ? sample.activityLevel : "idle";
    counts[level] += 1;
  }
  const total = Math.max(1, samples.length);
  const secondsPerSample = durationSeconds > 0 ? durationSeconds / total : 1;
  return Object.fromEntries(Object.entries(counts).map(([level, count]) => [
    level,
    {
      seconds: round(count * secondsPerSample, 1),
      percent: round((count / total) * 100, 1),
    },
  ]));
}

function summarizeSamples(samples) {
  if (!samples.length) {
    return {
      profileId: "none",
      durationSeconds: 0,
      sampleCount: 0,
    };
  }
  const first = samples[0];
  const last = samples[samples.length - 1];
  const durationSeconds = round(Math.max(0, (last.elapsedMs - first.elapsedMs) / 1000), 1);
  const profileIds = [...new Set(samples.map((sample) => sample.profileId ?? "unknown"))];
  const worstSample = [...samples].sort((a, b) => (
    (Number(b.render?.totalMs) || 0) - (Number(a.render?.totalMs) || 0)
    || (Number(a.renderFps) || 0) - (Number(b.renderFps) || 0)
  ))[0];
  return {
    profileId: profileIds.length === 1 ? profileIds[0] : "mixed",
    profileIds,
    durationSeconds,
    sampleCount: samples.length,
    avgUpdateFps: average(samples, (sample) => sample.updateFps),
    avgRenderFps: average(samples, (sample) => sample.renderFps),
    minRenderFps: minValue(samples, (sample) => sample.renderFps),
    maxRenderFps: maxValue(samples, (sample) => sample.renderFps),
    avgRenderTotalMs: average(samples, (sample) => sample.render?.totalMs),
    maxRenderTotalMs: maxValue(samples, (sample) => sample.render?.totalMs),
    avgFogMs: average(samples, (sample) => sample.render?.fogMs),
    maxFogMs: maxValue(samples, (sample) => sample.render?.fogMs),
    avgParticlesMs: average(samples, (sample) => sample.render?.particlesMs),
    maxParticlesMs: maxValue(samples, (sample) => sample.render?.particlesMs),
    avgObjectsMs: average(samples, (sample) => sample.render?.objectsMs),
    maxObjectsMs: maxValue(samples, (sample) => sample.render?.objectsMs),
    avgCanvasMegapixels: average(samples, (sample) => sample.canvasMegapixels),
    activitySplit: activitySplit(samples, durationSeconds || samples.length),
    topActivityReasons: summarizeReasonCounts(samples, "activityReasons"),
    topVisualDebugReasons: summarizeReasonCounts(samples, "visualDebugReasons"),
    topDirtyReasons: summarizeReasonCounts(samples, "dirtyReasons"),
    worstSample: worstSample ? {
      timestamp: worstSample.timestamp,
      elapsedMs: worstSample.elapsedMs,
      renderTotalMs: worstSample.render?.totalMs ?? null,
      renderFps: worstSample.renderFps,
      activityLevel: worstSample.activityLevel,
      activityReasons: worstSample.activityReasons ?? [],
      visualDebugReasons: worstSample.visualDebugReasons ?? [],
      dirtyReasons: worstSample.dirtyReasons ?? [],
    } : null,
  };
}

export const regionStatsMethods = {
  rebuildRegionStats(options = {}) {
    this.currentRegionStats = buildRegionStats(this, options);
    return this.currentRegionStats;
  },

  performanceResolvedSettings() {
    return {
      targetFps: Math.max(0, Math.round(Number(this.targetFps) || 0)),
      ambientRenderFps: Math.max(0, Math.round(Number(this.ambientRenderFps) || 0)),
      minimapFps: Math.max(0, Math.round(Number(this.minimapFps) || 0)),
      maxDpr: round(this.maxDpr ?? 1, 2),
      fogRenderScale: round(this.fogRenderScale ?? 1, 2),
      particleQuality: this.particleEngine?.quality ?? "unknown",
      maxParticles: Math.max(0, Math.floor(Number(this.particleEngine?.maxParticles) || 0)),
      particlesEnabled: this.particleEngine?.enabled ?? false,
      disableAmbientCritters: Boolean(this.disableAmbientCritters),
      lowPowerMode: Boolean(this.lowPowerMode),
      adaptiveEnabled: Boolean(this.adaptivePerformanceEnabled),
      adaptiveTier: Math.max(0, Math.floor(Number(this.adaptivePerformanceTier) || 0)),
    };
  },

  createPerformanceSample(now = performance.now()) {
    const particleEngine = this.particleEngine;
    const timings = this.renderTimings ?? {};
    const counts = this.renderDebugCounts ?? {};
    const visualActivityLevel = this.getVisualActivityLevel?.() ?? "idle";
    const dirtyReasons = this.renderDirtyReasons?.size ? [...this.renderDirtyReasons] : [];
    const loadedNpcCount = [...(this.chunks?.values?.() ?? [])]
      .reduce((sum, chunk) => sum + (chunk.npcs?.length ?? 0), 0);
    const regionId = this.region?.mapRegion?.id ?? this.activeMapRegion?.regionId ?? this.region?.id ?? null;
    const currentInstance = this.currentExpedition?.currentMapInstanceId
      ? this.currentExpedition?.subregionInstances?.[this.currentExpedition.currentMapInstanceId]
      : null;
    return {
      timestamp: new Date().toISOString(),
      elapsedMs: Math.round(now - (this.performanceStartTime ?? this.lastTime ?? now)),
      profileId: this.performanceMode ?? "balanced",
      isCustomProfile: Boolean(this.isCustomPerformanceProfile),
      settings: this.performanceResolvedSettings(),
      updateFps: Math.max(0, Math.round(Number(this.updateFps) || 0)),
      renderFps: Math.max(0, Math.round(Number(this.renderFps) || 0)),
      rafCallbacksPerSecond: Math.max(0, Math.round(Number(this.rafCallbacksPerSecond) || 0)),
      skippedRenderFrames: Math.max(0, Math.floor(Number(this.skippedRenderFrames) || 0)),
      activityLevel: visualActivityLevel,
      activityReasons: [...(this.visualActivityReasons ?? [])],
      visualDebugReasons: [...(this.visualDebugReasons ?? [])],
      renderDirty: Boolean(this.renderDirty),
      dirtyReasons,
      dirtyReasonDetails: dirtyReasons.map((reason) => ({
        reason,
        ageMs: Math.max(0, Math.round(now - (this.renderDirtyReasonTimes?.get(reason) ?? now))),
      })),
      lastRenderedDirtyReasons: [...(this.lastRenderDirtyReasons ?? [])],
      lastRenderedDirtyReasonDetails: [...(this.lastRenderDirtyReasonDetails ?? [])],
      canvas: {
        width: Math.max(0, Math.floor(Number(this.canvas?.width) || 0)),
        height: Math.max(0, Math.floor(Number(this.canvas?.height) || 0)),
      },
      canvasMegapixels: round(((this.canvas?.width ?? 0) * (this.canvas?.height ?? 0)) / 1000000, 2),
      dpr: round(this.dpr ?? 1, 2),
      render: {
        totalMs: formatMs(timings.totalMs),
        tilesMs: formatMs(timings.tilesMs),
        objectsMs: formatMs(timings.objectsMs),
        particlesMs: formatMs(timings.particlesMs),
        fogMs: formatMs(timings.fogMs),
        minimapMs: formatMs(timings.minimapMs),
        minimapCacheHit: timings.minimapCacheHit ?? null,
        minimapRebuildReason: timings.minimapRebuildReason ?? null,
        minimapStaticMs: formatMs(timings.minimapStaticMs),
        minimapDynamicMs: formatMs(timings.minimapDynamicMs),
        uiMs: formatMs(timings.uiMs),
        overlayMs: formatMs(timings.overlayMs),
      },
      counts: {
        drawables: counts.drawables ?? 0,
        particles: counts.particles ?? ((particleEngine?.particles?.length ?? 0) + (this.particles?.length ?? 0)),
        emitters: particleEngine?.emitters?.size ?? 0,
        monsters: counts.monsters ?? this.monsters?.size ?? 0,
        objects: counts.objects ?? 0,
        npcs: loadedNpcCount,
        loot: this.loots?.length ?? 0,
        projectiles: this.projectiles?.length ?? 0,
        totalMonsters: this.monsterActivityDebug?.totalMonsters ?? this.monsters?.size ?? 0,
        nearbyUpdatedMonsters: this.monsterActivityDebug?.nearbyUpdatedMonsters ?? 0,
        visibleMovingMonsters: this.monsterActivityDebug?.visibleMovingMonsters ?? 0,
        offscreenMovingMonstersIgnored: this.monsterActivityDebug?.offscreenMovingMonstersIgnored ?? 0,
        activeSpellParticles: this.effectDebugCounts?.activeSpellParticles ?? 0,
        activeSpellEmitters: this.effectDebugCounts?.activeSpellEmitters ?? 0,
        cleanupQueueLength: this.spellVisualCleanups?.length ?? 0,
        expiredEffectsRemoved: this.effectDebugCounts?.expiredEffectsRemoved ?? 0,
      },
      regionId,
      subregionId: currentInstance?.subregionId ?? null,
      player: {
        x: round(this.player?.x ?? 0, 1),
        y: round(this.player?.y ?? 0, 1),
        tileX: Math.floor(Number(this.player?.x) || 0),
        tileY: Math.floor(Number(this.player?.y) || 0),
      },
    };
  },

  updatePerformanceHistory(now = performance.now()) {
    this.performanceStartTime ??= now;
    if (now - (this.lastPerformanceSampleTime ?? 0) < (this.performanceSampleIntervalMs ?? PERFORMANCE_SAMPLE_INTERVAL_MS)) return;
    this.lastPerformanceSampleTime = now;
    const sample = this.createPerformanceSample(now);
    this.performanceHistory ??= [];
    this.performanceHistory.push(sample);
    const maxSamples = Math.max(1, Math.floor(Number(this.performanceHistoryMaxSamples) || PERFORMANCE_HISTORY_MAX_SAMPLES));
    while (this.performanceHistory.length > maxSamples) this.performanceHistory.shift();
    this.updateAdaptivePerformance?.(sample);

    if (this.performanceRecording?.active) {
      this.performanceRecording.samples.push(sample);
      const elapsedSeconds = (now - this.performanceRecording.startedAtMs) / 1000;
      this.performanceRecording.remainingSeconds = Math.max(0, this.performanceRecording.durationSeconds - elapsedSeconds);
      if (elapsedSeconds >= this.performanceRecording.durationSeconds) this.stopPerformanceRecording();
    }
  },

  updateAdaptivePerformance(sample) {
    if (!this.adaptivePerformanceEnabled || this.isCustomPerformanceProfile || sample?.activityLevel !== "active") {
      this.adaptiveLowFpsSamples = 0;
      return;
    }
    const target = Math.max(30, Number(this.targetFps) || 50);
    const renderFps = Math.max(0, Number(sample?.renderFps) || 0);
    if (renderFps >= target * 0.8) {
      this.adaptiveLowFpsSamples = 0;
      return;
    }
    this.adaptiveLowFpsSamples = (this.adaptiveLowFpsSamples ?? 0) + 1;
    if (this.adaptiveLowFpsSamples < 5 || (this.adaptivePerformanceTier ?? 0) >= 2) return;
    this.adaptiveLowFpsSamples = 0;
    this.adaptivePerformanceTier = (this.adaptivePerformanceTier ?? 0) + 1;
    if (this.adaptivePerformanceTier === 1) {
      this.maxDpr = Math.min(this.maxDpr ?? 1.25, 1.1);
      this.fogRenderScale = Math.min(this.fogRenderScale ?? 0.45, 0.4);
      this.setParticleQuality?.("medium");
      if (this.particleEngine) this.particleEngine.maxParticles = Math.min(this.particleEngine.maxParticles, 400);
      this.disableAmbientCritters = true;
      this.resetCritterRuntime?.();
    } else {
      this.targetFps = Math.min(this.targetFps ?? 50, 40);
      this.maxDpr = 1;
      this.fogRenderScale = Math.min(this.fogRenderScale ?? 0.4, 0.35);
      this.setParticleQuality?.("low");
      if (this.particleEngine) this.particleEngine.maxParticles = Math.min(this.particleEngine.maxParticles, 300);
    }
    if (this.particleEngine) {
      this.particleEngine.pool.max = this.particleEngine.maxParticles;
      while (this.particleEngine.particles.length > this.particleEngine.maxParticles) {
        const particle = this.particleEngine.particles.pop();
        if (particle) this.particleEngine.pool.release(particle);
      }
    }
    this.fogOverlayCanvas = null;
    this.resize?.();
    this.markRenderDirty?.(`adaptive-performance-tier-${this.adaptivePerformanceTier}`);
  },

  startPerformanceRecording(durationSeconds = 60) {
    const allowed = [30, 60, 120];
    const duration = allowed.includes(Number(durationSeconds)) ? Number(durationSeconds) : 60;
    const now = performance.now();
    this.performanceRecording = {
      active: true,
      durationSeconds: duration,
      startedAtMs: now,
      startedAt: new Date().toISOString(),
      remainingSeconds: duration,
      metadata: this.performanceRecordingMetadata(),
      samples: [],
    };
    this.lastPerformanceRecordingSummary = null;
    this.lastPerformanceSampleTime = now - (this.performanceSampleIntervalMs ?? PERFORMANCE_SAMPLE_INTERVAL_MS);
    this.updatePerformanceHistory(now);
    return this.performanceRecordingStatus();
  },

  stopPerformanceRecording() {
    if (!this.performanceRecording) return this.performanceRecordingStatus();
    this.performanceRecording.active = false;
    this.performanceRecording.endedAt = new Date().toISOString();
    this.performanceRecording.remainingSeconds = 0;
    this.lastPerformanceRecordingSummary = this.getPerformanceRecordingSummary();
    return this.performanceRecordingStatus();
  },

  clearPerformanceRecording() {
    this.performanceRecording = null;
    this.lastPerformanceRecordingSummary = null;
    return this.performanceRecordingStatus();
  },

  getPerformanceRecordingSummary() {
    return summarizeSamples(this.performanceRecording?.samples ?? []);
  },

  performanceHistorySummary(seconds = 60) {
    const samples = this.performanceHistory ?? [];
    if (!samples.length) return null;
    const lastElapsed = samples[samples.length - 1]?.elapsedMs ?? 0;
    return summarizeSamples(samples.filter((sample) => lastElapsed - sample.elapsedMs <= seconds * 1000));
  },

  performanceRecordingMetadata() {
    const screenInfo = typeof window !== "undefined" ? {
      width: window.screen?.width ?? null,
      height: window.screen?.height ?? null,
      innerWidth: window.innerWidth ?? null,
      innerHeight: window.innerHeight ?? null,
    } : {};
    return {
      appName: APP_NAME,
      appVersion: APP_VERSION,
      createdAt: new Date().toISOString(),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      screen: screenInfo,
      devicePixelRatio: typeof window !== "undefined" ? window.devicePixelRatio ?? 1 : 1,
      profileAtStart: this.performanceMode ?? "balanced",
      isCustomProfileAtStart: Boolean(this.isCustomPerformanceProfile),
      resolvedSettingsAtStart: this.performanceResolvedSettings(),
    };
  },

  performanceRecordingStatus() {
    return {
      recording: Boolean(this.performanceRecording?.active),
      durationSeconds: this.performanceRecording?.durationSeconds ?? 0,
      remainingSeconds: Math.max(0, Math.ceil(Number(this.performanceRecording?.remainingSeconds) || 0)),
      samplesCollected: this.performanceRecording?.samples?.length ?? 0,
      summary: this.performanceRecording?.active ? null : this.lastPerformanceRecordingSummary,
    };
  },

  exportPerformanceRecording() {
    const samples = this.performanceRecording?.samples ?? [];
    const summary = this.getPerformanceRecordingSummary();
    return {
      metadata: {
        ...(this.performanceRecording?.metadata ?? this.performanceRecordingMetadata()),
        exportedAt: new Date().toISOString(),
      },
      samples,
      summary,
    };
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
    this.updatePerformanceHistory?.();
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
      visualDebugReasons: [...(this.visualDebugReasons ?? [])],
      ambientRenderFps: Math.max(0, Math.round(Number(this.ambientRenderFps) || 0)),
      lastRenderDirtyReasons: [...(this.lastRenderDirtyReasons ?? [])],
      lastRenderDirtyReasonDetails: [...(this.lastRenderDirtyReasonDetails ?? [])],
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
        minimapCacheHit: timings.minimapCacheHit ?? null,
        minimapRebuildReason: timings.minimapRebuildReason ?? null,
        minimapStaticMs: formatMs(timings.minimapStaticMs),
        minimapDynamicMs: formatMs(timings.minimapDynamicMs),
      },
      counts: {
        drawables: counts.drawables ?? 0,
        monsters: counts.monsters ?? this.monsters?.size ?? 0,
        objects: counts.objects ?? 0,
        particles: counts.particles ?? ((particleEngine?.particles?.length ?? 0) + (this.particles?.length ?? 0)),
        cachedTerrainLayers: counts.cachedTerrainLayers ?? this.countCachedTerrainLayers?.() ?? 0,
        terrainLayersCleared: this.terrainLayersCleared ?? counts.terrainLayersCleared ?? 0,
        totalMonsters: this.monsterActivityDebug?.totalMonsters ?? this.monsters?.size ?? 0,
        nearbyUpdatedMonsters: this.monsterActivityDebug?.nearbyUpdatedMonsters ?? 0,
        visibleMovingMonsters: this.monsterActivityDebug?.visibleMovingMonsters ?? 0,
        offscreenMovingMonstersIgnored: this.monsterActivityDebug?.offscreenMovingMonstersIgnored ?? 0,
        activeSpellParticles: this.effectDebugCounts?.activeSpellParticles ?? 0,
        activeSpellEmitters: this.effectDebugCounts?.activeSpellEmitters ?? 0,
        cleanupQueueLength: this.spellVisualCleanups?.length ?? 0,
        expiredEffectsRemoved: this.effectDebugCounts?.expiredEffectsRemoved ?? 0,
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
      performanceHistory: {
        samples: this.performanceHistory?.length ?? 0,
        last60s: this.performanceHistorySummary?.(60) ?? null,
      },
      performanceRecording: this.performanceRecordingStatus?.() ?? null,
    };
  },
};
