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

function percentileValue(samples, getter, percentile = 0.5) {
  if (!samples.length) return 0;
  const values = samples.map((sample) => Number(getter(sample)) || 0).sort((a, b) => a - b);
  const index = Math.max(0, Math.min(values.length - 1, Math.ceil(percentile * values.length) - 1));
  return round(values[index], 2);
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
    Math.max(Number(b.render?.totalMs) || 0, Number(b.update?.totalMs) || 0) - Math.max(Number(a.render?.totalMs) || 0, Number(a.update?.totalMs) || 0)
    || (Number(a.renderFps) || 0) - (Number(b.renderFps) || 0)
  ))[0];
  return {
    profileId: profileIds.length === 1 ? profileIds[0] : "mixed",
    profileIds,
    durationSeconds,
    sampleCount: samples.length,
    avgUpdateFps: average(samples, (sample) => sample.updateFps),
    medianUpdateFps: percentileValue(samples, (sample) => sample.updateFps, 0.5),
    minUpdateFps: minValue(samples, (sample) => sample.updateFps),
    avgRenderFps: average(samples, (sample) => sample.renderFps),
    medianRenderFps: percentileValue(samples, (sample) => sample.renderFps, 0.5),
    minRenderFps: minValue(samples, (sample) => sample.renderFps),
    maxRenderFps: maxValue(samples, (sample) => sample.renderFps),
    avgUpdateTotalMs: average(samples, (sample) => sample.update?.totalMs),
    maxUpdateTotalMs: maxValue(samples, (sample) => sample.update?.totalMs),
    avgUpdatePlayerMs: average(samples, (sample) => sample.update?.playerMs),
    avgUpdateCameraMs: average(samples, (sample) => sample.update?.cameraMs),
    avgUpdateMonstersMs: average(samples, (sample) => sample.update?.monstersMs),
    avgUpdateProjectilesMs: average(samples, (sample) => sample.update?.projectilesMs),
    avgProjectileMovementMs: average(samples, (sample) => sample.update?.projectiles?.projectileMovementMs),
    avgProjectileCollisionMonstersMs: average(samples, (sample) => sample.update?.projectiles?.projectileCollisionMonstersMs),
    avgProjectileCollisionObjectsMs: average(samples, (sample) => sample.update?.projectiles?.projectileCollisionObjectsMs),
    avgProjectileCollisionTerrainMs: average(samples, (sample) => sample.update?.projectiles?.projectileCollisionTerrainMs),
    avgProjectileRemovalMs: average(samples, (sample) => sample.update?.projectiles?.projectileRemovalMs),
    avgProjectileSpawnMs: average(samples, (sample) => sample.update?.projectiles?.projectileSpawnMs),
    avgProjectileImpactMs: average(samples, (sample) => sample.update?.projectiles?.projectileImpactMs),
    avgProjectileImpactDamageMs: average(samples, (sample) => sample.update?.projectiles?.projectileImpactDamageMs),
    avgProjectileImpactKillMs: average(samples, (sample) => sample.update?.projectiles?.projectileImpactKillMs),
    avgProjectileImpactSpawnEffectsMs: average(samples, (sample) => sample.update?.projectiles?.projectileImpactSpawnEffectsMs),
    avgProjectileImpactHazardSpawnMs: average(samples, (sample) => sample.update?.projectiles?.projectileImpactHazardSpawnMs),
    avgProjectileImpactLootDropMs: average(samples, (sample) => sample.update?.projectiles?.projectileImpactLootDropMs),
    avgUpdateGroundHazardsMs: average(samples, (sample) => sample.update?.groundHazardsMs),
    avgUpdateSpellEffectsMs: average(samples, (sample) => sample.update?.spellEffectsMs),
    avgUpdateParticlesFloatersMs: average(samples, (sample) => sample.update?.particlesFloatersMs),
    avgUpdateLootMs: average(samples, (sample) => sample.update?.lootMs),
    avgLootHoverMs: average(samples, (sample) => sample.update?.loot?.lootHoverMs),
    avgLootPickupMs: average(samples, (sample) => sample.update?.loot?.lootPickupMs),
    avgLootMergeMs: average(samples, (sample) => sample.update?.loot?.lootMergeMs),
    avgLootInventoryMergeMs: average(samples, (sample) => sample.update?.loot?.lootInventoryMergeMs),
    avgLootQuestTargetScanMs: average(samples, (sample) => sample.update?.loot?.lootQuestTargetScanMs),
    avgLootDropCreationMs: average(samples, (sample) => sample.update?.loot?.lootDropCreationMs),
    avgLootRenderStateMs: average(samples, (sample) => sample.update?.loot?.lootRenderStateMs),
    avgLootFloaterMs: average(samples, (sample) => sample.update?.loot?.lootFloaterMs),
    avgLootToastMs: average(samples, (sample) => sample.update?.loot?.lootToastMs),
    avgLootSnapshotMs: average(samples, (sample) => sample.update?.loot?.lootSnapshotMs),
    avgLootTableRollMs: average(samples, (sample) => sample.update?.loot?.lootTableRollMs),
    avgLootConditionEvaluationMs: average(samples, (sample) => sample.update?.loot?.lootConditionEvaluationMs),
    avgLootUniqueCheckMs: average(samples, (sample) => sample.update?.loot?.lootUniqueCheckMs),
    avgLootNamedCheckMs: average(samples, (sample) => sample.update?.loot?.lootNamedCheckMs),
    avgLootQuestDropCheckMs: average(samples, (sample) => sample.update?.loot?.lootQuestDropCheckMs),
    avgLootObjectCreationMs: average(samples, (sample) => sample.update?.loot?.lootObjectCreationMs),
    avgLootPlacementMs: average(samples, (sample) => sample.update?.loot?.lootPlacementMs),
    avgLootDirtyMarkMs: average(samples, (sample) => sample.update?.loot?.lootDirtyMarkMs),
    avgLootToastOrFloaterMs: average(samples, (sample) => sample.update?.loot?.lootToastOrFloaterMs),
    avgLootSaveDirtyMs: average(samples, (sample) => sample.update?.loot?.lootSaveDirtyMs),
    avgUpdateCleanupMs: average(samples, (sample) => sample.update?.cleanupMs),
    avgCleanupEffectArraysMs: average(samples, (sample) => sample.update?.cleanupDetails?.cleanupEffectArraysMs),
    avgCleanupProjectileArraysMs: average(samples, (sample) => sample.update?.cleanupDetails?.cleanupProjectileArraysMs),
    avgCleanupFloatersMs: average(samples, (sample) => sample.update?.cleanupDetails?.cleanupFloatersMs),
    avgCleanupParticlesMs: average(samples, (sample) => sample.update?.cleanupDetails?.cleanupParticlesMs),
    avgCleanupWorldMs: average(samples, (sample) => sample.update?.cleanupDetails?.cleanupWorldMs),
    avgCleanupInteractionTargetsMs: average(samples, (sample) => sample.update?.cleanupDetails?.cleanupInteractionTargetsMs),
    avgInteractionTargetCollectObjectsMs: average(samples, (sample) => sample.update?.cleanupDetails?.interactionTargets?.interactionTargetCollectObjectsMs),
    avgInteractionTargetCollectLootMs: average(samples, (sample) => sample.update?.cleanupDetails?.interactionTargets?.interactionTargetCollectLootMs),
    avgInteractionTargetCollectMonstersMs: average(samples, (sample) => sample.update?.cleanupDetails?.interactionTargets?.interactionTargetCollectMonstersMs),
    avgInteractionTargetCollectNpcsMs: average(samples, (sample) => sample.update?.cleanupDetails?.interactionTargets?.interactionTargetCollectNpcsMs),
    avgInteractionTargetDistanceChecksMs: average(samples, (sample) => sample.update?.cleanupDetails?.interactionTargets?.interactionTargetDistanceChecksMs),
    avgInteractionTargetSortMs: average(samples, (sample) => sample.update?.cleanupDetails?.interactionTargets?.interactionTargetSortMs),
    avgInteractionTargetStateUpdateMs: average(samples, (sample) => sample.update?.cleanupDetails?.interactionTargets?.interactionTargetStateUpdateMs),
    avgCleanupRegionExitMs: average(samples, (sample) => sample.update?.cleanupDetails?.cleanupRegionExitMs),
    avgCleanupAutosaveSnapshotMs: average(samples, (sample) => sample.update?.cleanupDetails?.cleanupAutosaveSnapshotMs),
    avgAutosaveShouldRunMs: average(samples, (sample) => sample.update?.cleanupDetails?.autosave?.autosaveShouldRunMs),
    avgAutosaveSnapshotBuildMs: average(samples, (sample) => sample.snapshot?.timings?.autosaveSnapshotBuildMs ?? sample.update?.cleanupDetails?.autosave?.autosaveSnapshotBuildMs),
    avgAutosaveCloneMs: average(samples, (sample) => sample.update?.cleanupDetails?.autosave?.autosaveCloneMs),
    avgAutosaveSerializeMs: average(samples, (sample) => sample.update?.cleanupDetails?.autosave?.autosaveSerializeMs),
    avgAutosaveStorageWriteMs: average(samples, (sample) => sample.update?.cleanupDetails?.autosave?.autosaveStorageWriteMs),
    avgAutosaveTotalMs: average(samples, (sample) => sample.update?.cleanupDetails?.autosave?.autosaveTotalMs),
    avgUpdateMinimapFogMs: average(samples, (sample) => sample.update?.minimapFogMs),
    avgRenderTotalMs: average(samples, (sample) => sample.render?.totalMs),
    maxRenderTotalMs: maxValue(samples, (sample) => sample.render?.totalMs),
    avgFogMs: average(samples, (sample) => sample.render?.fogMs),
    maxFogMs: maxValue(samples, (sample) => sample.render?.fogMs),
    avgParticlesMs: average(samples, (sample) => sample.render?.particlesMs),
    maxParticlesMs: maxValue(samples, (sample) => sample.render?.particlesMs),
    avgObjectsMs: average(samples, (sample) => sample.render?.objectsMs),
    maxObjectsMs: maxValue(samples, (sample) => sample.render?.objectsMs),
    avgMinimapMs: average(samples, (sample) => sample.render?.minimapMs),
    medianMinimapMs: percentileValue(samples, (sample) => sample.render?.minimapMs, 0.5),
    p90MinimapMs: percentileValue(samples, (sample) => sample.render?.minimapMs, 0.9),
    maxMinimapMs: maxValue(samples, (sample) => sample.render?.minimapMs),
    avgVisiblePassiveMovingMonsters: average(samples, (sample) => sample.counts?.visiblePassiveMovingMonsters),
    maxVisiblePassiveMovingMonsters: maxValue(samples, (sample) => sample.counts?.visiblePassiveMovingMonsters),
    avgVisibleCombatMovingMonsters: average(samples, (sample) => sample.counts?.visibleCombatMovingMonsters),
    maxVisibleCombatMovingMonsters: maxValue(samples, (sample) => sample.counts?.visibleCombatMovingMonsters),
    avgCanvasMegapixels: average(samples, (sample) => sample.canvasMegapixels),
    activitySplit: activitySplit(samples, durationSeconds || samples.length),
    topActivityReasons: summarizeReasonCounts(samples, "activityReasons"),
    topVisualDebugReasons: summarizeReasonCounts(samples, "visualDebugReasons"),
    topDirtyReasons: summarizeReasonCounts(samples, "dirtyReasons"),
    worstSample: worstSample ? {
      timestamp: worstSample.timestamp,
      elapsedMs: worstSample.elapsedMs,
      updateTotalMs: worstSample.update?.totalMs ?? null,
      updateWorstCategory: worstSample.update?.worstCategory ?? null,
      updateWorstCategoryMs: worstSample.update?.worstCategoryMs ?? null,
      updateProjectiles: worstSample.update?.projectiles ?? null,
      updateLoot: worstSample.update?.loot ?? null,
      updateCleanupDetails: worstSample.update?.cleanupDetails ?? null,
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
      adaptiveReason: this.adaptivePerformanceReason ?? "tier-0",
    };
  },

  adaptiveRuntimeSettings() {
    const tier = Math.max(0, Math.floor(Number(this.adaptivePerformanceTier) || 0));
    return {
      tier,
      particleEmissionScale: tier >= 3 ? 0.42 : tier >= 2 ? 0.58 : tier >= 1 ? 0.75 : 1,
      spellVisualScale: tier >= 3 ? 0.45 : tier >= 2 ? 0.62 : tier >= 1 ? 0.8 : 1,
      floaterLifeScale: tier >= 3 ? 0.6 : tier >= 2 ? 0.72 : tier >= 1 ? 0.85 : 1,
      maxFloaters: tier >= 3 ? 14 : tier >= 2 ? 20 : tier >= 1 ? 28 : 999,
      footstepDustScale: tier >= 3 ? 0.25 : tier >= 2 ? 0.4 : tier >= 1 ? 0.65 : 1,
      passiveMonsterWanderScale: tier >= 3 ? 0.12 : tier >= 2 ? 0.25 : tier >= 1 ? 0.5 : 1,
      nearbyMonsterUpdateBudget: tier >= 3 ? 28 : tier >= 2 ? 36 : tier >= 1 ? 44 : Infinity,
      minimapFogRebuildIntervalMs: tier >= 3 ? 1000 : tier >= 2 ? 750 : tier >= 1 ? 450 : 0,
    };
  },

  createPerformanceSample(now = performance.now()) {
    const particleEngine = this.particleEngine;
    const timings = this.renderTimings ?? {};
    const updateTimings = this.updateTimings ?? {};
    const projectileTimings = this.projectileUpdateTimings ?? {};
    const playerTimings = this.playerUpdateTimings ?? {};
    const lootTimings = this.lootUpdateTimings ?? {};
    const cleanupTimings = this.cleanupUpdateTimings ?? {};
    const interactionTargetTimings = this.interactionTargetTimings ?? {};
    const groundHazardTimings = this.groundHazardUpdateTimings ?? {};
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
      update: {
        totalMs: formatMs(updateTimings.totalMs),
        playerMs: formatMs(updateTimings.player),
        player: {
          playerInputMs: formatMs(playerTimings.playerInputMs),
          playerMovementMs: formatMs(playerTimings.playerMovementMs),
          playerCollisionMs: formatMs(playerTimings.playerCollisionMs),
          playerTargetingMs: formatMs(playerTimings.playerTargetingMs),
          playerTargetCandidateCollectionMs: formatMs(playerTimings.playerTargetCandidateCollectionMs),
          playerTargetSpatialQueryMs: formatMs(playerTimings.playerTargetSpatialQueryMs),
          playerTargetDistanceChecksMs: formatMs(playerTimings.playerTargetDistanceChecksMs),
          playerTargetLineOfSightMs: formatMs(playerTimings.playerTargetLineOfSightMs),
          playerTargetConditionEvaluationMs: formatMs(playerTimings.playerTargetConditionEvaluationMs),
          playerTargetSortMs: formatMs(playerTimings.playerTargetSortMs),
          playerTargetStateComparisonMs: formatMs(playerTimings.playerTargetStateComparisonMs),
          playerTargetStateCommitMs: formatMs(playerTimings.playerTargetStateCommitMs),
          playerTargetChunkSyncMs: formatMs(playerTimings.playerTargetChunkSyncMs),
          targetCandidateCount: playerTimings.targetCandidateCount ?? 0,
          targetDistanceCheckCount: playerTimings.targetDistanceCheckCount ?? 0,
          targetLineOfSightCheckCount: playerTimings.targetLineOfSightCheckCount ?? 0,
          targetConditionCheckCount: playerTimings.targetConditionCheckCount ?? 0,
          objectsScanned: playerTimings.objectsScanned ?? 0, monstersScanned: playerTimings.monstersScanned ?? 0,
          lootScanned: playerTimings.lootScanned ?? 0, npcsScanned: playerTimings.npcsScanned ?? 0,
          actionTargetsScanned: playerTimings.actionTargetsScanned ?? 0,
          selectedTargetType: playerTimings.selectedTargetType ?? null,
          selectedTargetId: playerTimings.selectedTargetId ?? null,
          targetingTriggeredBy: playerTimings.targetingTriggeredBy ?? null,
          playerCombatMs: formatMs(playerTimings.playerCombatMs),
          playerStatusEffectsMs: formatMs(playerTimings.playerStatusEffectsMs),
          playerAnimationMs: formatMs(playerTimings.playerAnimationMs),
          playerChunkOrRegionUpdateMs: formatMs(playerTimings.playerChunkOrRegionUpdateMs),
          playerDirtyMarkMs: formatMs(playerTimings.playerDirtyMarkMs),
        },
        cameraMs: formatMs(updateTimings.camera),
        monstersMs: formatMs(updateTimings.monsters),
        monsterTimings: { ...(this.monsterUpdateTimings ?? {}) },
        chunkCreation: { ...(this.chunkFrameMetrics ?? {}) },
        projectilesMs: formatMs(updateTimings.projectiles),
        groundHazardsMs: formatMs(updateTimings.groundHazards),
        spellEffectsMs: formatMs(updateTimings.spellEffects),
        particlesFloatersMs: formatMs(updateTimings.particlesFloaters),
        lootMs: formatMs(updateTimings.loot),
        cleanupMs: formatMs(updateTimings.cleanup),
        minimapFogMs: formatMs(updateTimings.minimapFog),
        worstCategory: updateTimings.worstCategory ?? "none",
        worstCategoryMs: formatMs(updateTimings.worstCategoryMs),
        projectiles: {
          projectileMovementMs: formatMs(projectileTimings.projectileMovementMs),
          projectileCollisionMonstersMs: formatMs(projectileTimings.projectileCollisionMonstersMs),
          projectileCollisionObjectsMs: formatMs(projectileTimings.projectileCollisionObjectsMs),
          projectileCollisionTerrainMs: formatMs(projectileTimings.projectileCollisionTerrainMs),
          projectileRemovalMs: formatMs(projectileTimings.projectileRemovalMs),
          projectileSpawnMs: formatMs(projectileTimings.projectileSpawnMs),
          projectileImpactMs: formatMs(projectileTimings.projectileImpactMs),
          projectileImpactDamageMs: formatMs(projectileTimings.projectileImpactDamageMs),
          projectileImpactTargetCollectionMs: formatMs(projectileTimings.projectileImpactTargetCollectionMs),
          projectileImpactDamageApplyMs: formatMs(projectileTimings.projectileImpactDamageApplyMs),
          projectileImpactAoEMs: formatMs(projectileTimings.projectileImpactAoEMs),
          projectileImpactStatusEffectMs: formatMs(projectileTimings.projectileImpactStatusEffectMs),
          projectileImpactDeathHandlingMs: formatMs(projectileTimings.projectileImpactDeathHandlingMs),
          projectileImpactKillMs: formatMs(projectileTimings.projectileImpactKillMs),
          projectileImpactSpawnEffectsMs: formatMs(projectileTimings.projectileImpactSpawnEffectsMs),
          projectileImpactHazardSpawnMs: formatMs(projectileTimings.projectileImpactHazardSpawnMs),
          projectileImpactLootDropMs: formatMs(projectileTimings.projectileImpactLootDropMs),
          projectileImpactDirtyMs: formatMs(projectileTimings.projectileImpactDirtyMs),
          projectileCandidatesMonsters: projectileTimings.projectileCandidatesMonsters ?? 0,
          projectileCandidatesObjects: projectileTimings.projectileCandidatesObjects ?? 0,
          projectileImpactCandidateCount: projectileTimings.projectileImpactCandidateCount ?? 0,
          projectileImpactAffectedTargetCount: projectileTimings.projectileImpactAffectedTargetCount ?? 0,
          projectileImpactSpellId: projectileTimings.projectileImpactSpellId ?? null,
          projectileImpactAoERadius: projectileTimings.projectileImpactAoERadius ?? 0,
        },
        loot: {
          lootHoverMs: formatMs(lootTimings.lootHoverMs),
          lootPickupMs: formatMs(lootTimings.lootPickupMs),
          lootMergeMs: formatMs(lootTimings.lootMergeMs),
          lootInventoryMergeMs: formatMs(lootTimings.lootInventoryMergeMs),
          lootDropCreationMs: formatMs(lootTimings.lootDropCreationMs),
          lootQuestTargetScanMs: formatMs(lootTimings.lootQuestTargetScanMs),
          lootRenderStateMs: formatMs(lootTimings.lootRenderStateMs),
          lootFloaterMs: formatMs(lootTimings.lootFloaterMs),
          lootToastMs: formatMs(lootTimings.lootToastMs),
          lootSnapshotMs: formatMs(lootTimings.lootSnapshotMs),
          pickedUpItems: Math.max(0, Math.floor(Number(lootTimings.pickedUpItems) || 0)),
          lootTableRollMs: formatMs(lootTimings.lootTableRollMs),
          lootConditionEvaluationMs: formatMs(lootTimings.lootConditionEvaluationMs),
          lootUniqueCheckMs: formatMs(lootTimings.lootUniqueCheckMs),
          lootNamedCheckMs: formatMs(lootTimings.lootNamedCheckMs),
          lootQuestDropCheckMs: formatMs(lootTimings.lootQuestDropCheckMs),
          lootObjectCreationMs: formatMs(lootTimings.lootObjectCreationMs),
          lootPlacementMs: formatMs(lootTimings.lootPlacementMs),
          lootDirtyMarkMs: formatMs(lootTimings.lootDirtyMarkMs),
          lootToastOrFloaterMs: formatMs(lootTimings.lootToastOrFloaterMs),
          lootSaveDirtyMs: formatMs(lootTimings.lootSaveDirtyMs),
          lootQueuedJobsProcessed: Math.max(0, Math.floor(Number(lootTimings.lootQueuedJobsProcessed) || 0)),
          lootDropJobsQueued: Math.max(0, Math.floor(Number(lootTimings.lootDropJobsQueued) || 0)),
          lootDropJobsDeferred: Math.max(0, Math.floor(Number(lootTimings.lootDropJobsDeferred) || 0)),
          lootDropBudgetHit: Boolean(lootTimings.lootDropBudgetHit),
          lootDropBudgetMs: formatMs(lootTimings.lootDropBudgetMs),
          slowLootTableId: lootTimings.slowLootTableId ?? null,
          slowLootEntryId: lootTimings.slowLootEntryId ?? null,
          slowLootConditionKey: lootTimings.slowLootConditionKey ?? null,
          lootEntriesEvaluated: Math.max(0, Math.floor(Number(lootTimings.lootEntriesEvaluated) || 0)),
          lootTablesRolled: Math.max(0, Math.floor(Number(lootTimings.lootTablesRolled) || 0)),
          nestedLootTablesRolled: Math.max(0, Math.floor(Number(lootTimings.nestedLootTablesRolled) || 0)),
          lootObjectsCreated: Math.max(0, Math.floor(Number(lootTimings.lootObjectsCreated) || 0)),
        },
        groundHazards: {
          groundHazardUpdateMs: formatMs(groundHazardTimings.groundHazardUpdateMs),
          groundHazardCollisionMs: formatMs(groundHazardTimings.groundHazardCollisionMs),
          groundHazardDamageMs: formatMs(groundHazardTimings.groundHazardDamageMs),
          groundHazardDamageApplyMs: formatMs(groundHazardTimings.groundHazardDamageApplyMs),
          groundHazardDeathDetectionMs: formatMs(groundHazardTimings.groundHazardDeathDetectionMs),
          groundHazardDeathStateMs: formatMs(groundHazardTimings.groundHazardDeathStateMs),
          groundHazardDeathCallbacksMs: formatMs(groundHazardTimings.groundHazardDeathCallbacksMs),
          groundHazardLootJobEnqueueMs: formatMs(groundHazardTimings.groundHazardLootJobEnqueueMs),
          groundHazardCorpseCreationMs: formatMs(groundHazardTimings.groundHazardCorpseCreationMs),
          groundHazardDeathEffectsMs: formatMs(groundHazardTimings.groundHazardDeathEffectsMs),
          groundHazardSpatialRemovalMs: formatMs(groundHazardTimings.groundHazardSpatialRemovalMs),
          groundHazardQuestProgressMs: formatMs(groundHazardTimings.groundHazardQuestProgressMs),
          groundHazardKillMs: formatMs(groundHazardTimings.groundHazardKillMs),
          groundHazardLootDropMs: formatMs(groundHazardTimings.groundHazardLootDropMs),
          groundHazardSpawnEffectsMs: formatMs(groundHazardTimings.groundHazardSpawnEffectsMs),
          groundHazardCleanupMs: formatMs(groundHazardTimings.groundHazardCleanupMs),
          groundHazardCandidateCount: groundHazardTimings.groundHazardCandidateCount ?? 0,
          groundHazardAffectedTargetCount: groundHazardTimings.groundHazardAffectedTargetCount ?? 0,
          groundHazardType: groundHazardTimings.groundHazardType ?? null,
        },
        monsterDeath: { ...(this.monsterDeathTimings ?? {}) },
        cleanupDetails: {
          cleanupEffectArraysMs: formatMs(cleanupTimings.cleanupEffectArraysMs),
          cleanupProjectileArraysMs: formatMs(cleanupTimings.cleanupProjectileArraysMs),
          cleanupFloatersMs: formatMs(cleanupTimings.cleanupFloatersMs),
          cleanupParticlesMs: formatMs(cleanupTimings.cleanupParticlesMs),
          cleanupWorldMs: formatMs(cleanupTimings.cleanupWorldMs),
          cleanupInteractionTargetsMs: formatMs(cleanupTimings.cleanupInteractionTargetsMs),
          interactionTargets: {
            interactionTargetCollectObjectsMs: formatMs(interactionTargetTimings.interactionTargetCollectObjectsMs),
            interactionTargetCollectLootMs: formatMs(interactionTargetTimings.interactionTargetCollectLootMs),
            interactionTargetCollectMonstersMs: formatMs(interactionTargetTimings.interactionTargetCollectMonstersMs),
            interactionTargetCollectNpcsMs: formatMs(interactionTargetTimings.interactionTargetCollectNpcsMs),
            interactionTargetDistanceChecksMs: formatMs(interactionTargetTimings.interactionTargetDistanceChecksMs),
            interactionTargetSortMs: formatMs(interactionTargetTimings.interactionTargetSortMs),
            interactionTargetStateUpdateMs: formatMs(interactionTargetTimings.interactionTargetStateUpdateMs),
            interactionTargetStateReasons: { ...(interactionTargetTimings.interactionTargetStateReasons ?? {}) },
          },
          cleanupRegionExitMs: formatMs(cleanupTimings.cleanupRegionExitMs),
          cleanupAutosaveSnapshotMs: formatMs(cleanupTimings.cleanupAutosaveSnapshotMs),
          autosave: {
            autosaveShouldRunMs: formatMs(cleanupTimings.autosaveShouldRunMs),
            autosaveSnapshotBuildMs: formatMs(cleanupTimings.autosaveSnapshotBuildMs),
            autosaveCloneMs: formatMs(cleanupTimings.autosaveCloneMs),
            autosaveSerializeMs: formatMs(cleanupTimings.autosaveSerializeMs),
            autosaveStorageWriteMs: formatMs(cleanupTimings.autosaveStorageWriteMs),
            autosaveTotalMs: formatMs(cleanupTimings.autosaveTotalMs),
          },
        },
      },
      render: {
        totalMs: formatMs(timings.totalMs),
        tilesMs: formatMs(timings.tilesMs),
        objectsMs: formatMs(timings.objectsMs),
        particlesMs: formatMs(timings.particlesMs),
        fogMs: formatMs(timings.fogMs),
        minimapMs: formatMs(timings.minimapMs),
        minimapWorkThisFrameMs: formatMs(timings.minimapWorkThisFrameMs ?? timings.minimapMs),
        lastMinimapRebuildMs: formatMs(timings.lastMinimapRebuildMs ?? timings.minimapMs),
        minimapIncludedInRenderTotal: Boolean(timings.minimapIncludedInRenderTotal),
        minimapRebuiltThisFrame: Boolean(timings.minimapRebuiltThisFrame),
        minimapCacheHit: timings.minimapCacheHit ?? null,
        minimapRebuildReason: timings.minimapRebuildReason ?? null,
        minimapStaticMs: formatMs(timings.minimapStaticMs),
        minimapDynamicMs: formatMs(timings.minimapDynamicMs),
        minimapClearMs: formatMs(timings.minimapClearMs),
        minimapBlitStaticMs: formatMs(timings.minimapBlitStaticMs),
        minimapFogOverlayMs: formatMs(timings.minimapFogOverlayMs),
        minimapDynamicMarkersMs: formatMs(timings.minimapDynamicMarkersMs),
        minimapScaleCopyMs: formatMs(timings.minimapScaleCopyMs),
        minimapTotalDrawMs: formatMs(timings.minimapTotalDrawMs),
        minimapBudgetBackoff: Boolean(timings.minimapBudgetBackoff),
        minimapDiagnostics: {
          ...(this.minimapDiagnostics ?? {}),
          invalidationReasons: { ...(this.minimapDiagnostics?.invalidationReasons ?? {}) },
        },
        terrainLayerDiagnostics: { ...(this.terrainLayerDiagnostics ?? {}) },
        uiMs: formatMs(timings.uiMs),
        overlayMs: formatMs(timings.overlayMs),
      },
      snapshot: this.lastSnapshotInfo ? {
        reason: this.lastSnapshotInfo.reason ?? null,
        reasons: { ...(this.lastSnapshotInfo.reasons ?? {}) },
        builtAt: this.lastSnapshotInfo.builtAt ?? null,
        ageMs: Math.max(0, Math.round(Date.now() - (this.lastSnapshotInfo.builtAt ?? Date.now()))),
        buildCount: Math.max(0, Math.floor(Number(this.lastSnapshotInfo.buildCount) || 0)),
        actualBuildCount: Math.max(0, Math.floor(Number(this.snapshotBuildCount) || 0)),
        coalescedCount: Math.max(0, Math.floor(Number(this.snapshotCoalescedCount) || 0)),
        skippedBecauseUiOnly: Math.max(0, Math.floor(Number(this.snapshotSkippedBecauseUiOnly) || 0)),
        builtSinceLastSample: this.lastSnapshotInfo.builtAt !== this.lastPerformanceSampleSnapshotBuiltAt,
        timings: {
          autosaveSnapshotBuildMs: formatMs(this.lastSnapshotInfo.autosaveSnapshotBuildMs),
        },
      } : null,
      dirtyState: {
        saveDirty: Boolean(this.saveDirty),
        saveDirtyReasons: { ...(this.saveDirtyReasons ?? {}) },
        saveDirtyReasonCountsCumulative: { ...(this.saveDirtyReasonCounts ?? {}) },
        uiDirtyReasonCountsCumulative: { ...(this.uiDirtyReasons ?? {}) },
        saveDiagnostics: {
          ...(this.saveDiagnostics ?? {}),
          reasonCounts: { ...(this.saveDiagnostics?.reasonCounts ?? {}) },
          forcedReasonCounts: { ...(this.saveDiagnostics?.forcedReasonCounts ?? {}) },
        },
      },
      save: this.lastSaveInfo ? { ...this.lastSaveInfo } : null,
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
        nearbyTotalMonsters: this.monsterActivityDebug?.nearbyTotalMonsters ?? this.monsterActivityDebug?.nearbyUpdatedMonsters ?? 0,
        visibleMovingMonsters: this.monsterActivityDebug?.visibleMovingMonsters ?? 0,
        visiblePassiveMovingMonsters: this.monsterActivityDebug?.visiblePassiveMovingMonsters ?? 0,
        visibleCombatMovingMonsters: this.monsterActivityDebug?.visibleCombatMovingMonsters ?? 0,
        offscreenMovingMonstersIgnored: this.monsterActivityDebug?.offscreenMovingMonstersIgnored ?? 0,
        activeMonsterMotionReasons: [...(this.monsterActivityDebug?.activeMonsterMotionReasons ?? [])],
        ambientMonsterMotionReasons: [...(this.monsterActivityDebug?.ambientMonsterMotionReasons ?? [])],
        activeSpellParticles: this.effectDebugCounts?.activeSpellParticles ?? 0,
        activeSpellEmitters: this.effectDebugCounts?.activeSpellEmitters ?? 0,
        cleanupQueueLength: this.spellVisualCleanups?.length ?? 0,
        expiredEffectsRemoved: this.effectDebugCounts?.expiredEffectsRemoved ?? 0,
        visibleEffectCategories: { ...(this.effectDebugCounts?.visibleEffectCategories ?? {}) },
        effectDirtyCategoryCounts: { ...(this.effectDirtyCategoryCounts ?? {}) },
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
    this.lastPerformanceSampleSnapshotBuiltAt = this.lastSnapshotInfo?.builtAt ?? null;
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
      if (!this.adaptivePerformanceEnabled) this.adaptivePerformanceReason = "disabled";
      return;
    }
    const target = Math.max(30, Number(this.targetFps) || 50);
    const targetFrameMs = 1000 / target;
    const updateFps = Math.max(0, Number(sample?.updateFps) || 0);
    const renderFps = Math.max(0, Number(sample?.renderFps) || 0);
    const updateMs = Math.max(0, Number(sample?.update?.totalMs) || 0);
    const renderMs = Math.max(0, Number(sample?.render?.totalMs) || 0);
    const lowRenderFps = renderFps > 0 && renderFps < target * 0.8;
    const lowUpdateFps = updateFps > 0 && updateFps < target * 0.9;
    const highUpdateCost = updateMs > Math.max(7.5, targetFrameMs * 0.42);
    const highCombinedCost = updateMs + renderMs > targetFrameMs * 0.62;
    const pressureReasons = [
      lowRenderFps ? "low-render-fps" : "",
      lowUpdateFps ? "low-update-fps" : "",
      highUpdateCost ? "high-update-cost" : "",
      highCombinedCost ? "high-frame-cost" : "",
    ].filter(Boolean);
    if (!pressureReasons.length) {
      this.adaptiveLowFpsSamples = 0;
      if ((this.adaptivePerformanceTier ?? 0) <= 0) this.adaptivePerformanceReason = "tier-0";
      return;
    }
    this.adaptiveLowFpsSamples = (this.adaptiveLowFpsSamples ?? 0) + 1;
    this.adaptivePerformanceReason = `${pressureReasons.join("+")} ${this.adaptiveLowFpsSamples}/5`;
    if (this.adaptiveLowFpsSamples < 5 || (this.adaptivePerformanceTier ?? 0) >= 3) return;
    this.adaptiveLowFpsSamples = 0;
    this.adaptivePerformanceTier = (this.adaptivePerformanceTier ?? 0) + 1;
    this.adaptivePerformanceReason = `${pressureReasons.join("+")} -> tier ${this.adaptivePerformanceTier}`;
    if (this.adaptivePerformanceTier === 1) {
      this.fogRenderScale = Math.min(this.fogRenderScale ?? 0.45, 0.4);
      this.setParticleQuality?.("medium");
      if (this.particleEngine) this.particleEngine.maxParticles = Math.min(this.particleEngine.maxParticles, 400);
      this.disableAmbientCritters = true;
      this.resetCritterRuntime?.();
    } else if (this.adaptivePerformanceTier === 2) {
      this.maxDpr = 1;
      this.fogRenderScale = Math.min(this.fogRenderScale ?? 0.4, 0.35);
      this.setParticleQuality?.("low");
      if (this.particleEngine) this.particleEngine.maxParticles = Math.min(this.particleEngine.maxParticles, 300);
    } else {
      this.targetFps = Math.min(this.targetFps ?? 50, 40);
      this.maxDpr = 1;
      this.fogRenderScale = Math.min(this.fogRenderScale ?? 0.35, 0.32);
      this.setParticleQuality?.("low");
      if (this.particleEngine) this.particleEngine.maxParticles = Math.min(this.particleEngine.maxParticles, 220);
    }
    if (this.particleEngine) {
      this.particleEngine.pool.max = this.particleEngine.maxParticles;
      while (this.particleEngine.particles.length > this.particleEngine.maxParticles) {
        const particle = this.particleEngine.particles.pop();
        if (particle) this.particleEngine.pool.release(particle);
      }
    }
    this.fogOverlayCanvas = null;
    this.flushPendingMinimapFogInvalidation?.(true);
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
    const updateTimings = this.updateTimings ?? {};
    const projectileTimings = this.projectileUpdateTimings ?? {};
    const lootTimings = this.lootUpdateTimings ?? {};
    const cleanupTimings = this.cleanupUpdateTimings ?? {};
    const interactionTargetTimings = this.interactionTargetTimings ?? {};
    const groundHazardTimings = this.groundHazardUpdateTimings ?? {};
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
      adaptive: {
        enabled: Boolean(this.adaptivePerformanceEnabled),
        tier: Math.max(0, Math.floor(Number(this.adaptivePerformanceTier) || 0)),
        reason: this.adaptivePerformanceReason ?? "tier-0",
      },
      update: {
        totalMs: formatMs(updateTimings.totalMs),
        playerMs: formatMs(updateTimings.player),
        cameraMs: formatMs(updateTimings.camera),
        monstersMs: formatMs(updateTimings.monsters),
        projectilesMs: formatMs(updateTimings.projectiles),
        groundHazardsMs: formatMs(updateTimings.groundHazards),
        spellEffectsMs: formatMs(updateTimings.spellEffects),
        particlesFloatersMs: formatMs(updateTimings.particlesFloaters),
        lootMs: formatMs(updateTimings.loot),
        cleanupMs: formatMs(updateTimings.cleanup),
        minimapFogMs: formatMs(updateTimings.minimapFog),
        worstCategory: updateTimings.worstCategory ?? "none",
        worstCategoryMs: formatMs(updateTimings.worstCategoryMs),
        projectiles: {
          projectileMovementMs: formatMs(projectileTimings.projectileMovementMs),
          projectileCollisionMonstersMs: formatMs(projectileTimings.projectileCollisionMonstersMs),
          projectileCollisionObjectsMs: formatMs(projectileTimings.projectileCollisionObjectsMs),
          projectileCollisionTerrainMs: formatMs(projectileTimings.projectileCollisionTerrainMs),
          projectileRemovalMs: formatMs(projectileTimings.projectileRemovalMs),
          projectileSpawnMs: formatMs(projectileTimings.projectileSpawnMs),
          projectileImpactMs: formatMs(projectileTimings.projectileImpactMs),
          projectileImpactDamageMs: formatMs(projectileTimings.projectileImpactDamageMs),
          projectileImpactKillMs: formatMs(projectileTimings.projectileImpactKillMs),
          projectileImpactSpawnEffectsMs: formatMs(projectileTimings.projectileImpactSpawnEffectsMs),
          projectileImpactHazardSpawnMs: formatMs(projectileTimings.projectileImpactHazardSpawnMs),
          projectileImpactLootDropMs: formatMs(projectileTimings.projectileImpactLootDropMs),
          projectileImpactDirtyMs: formatMs(projectileTimings.projectileImpactDirtyMs),
          projectileCandidatesMonsters: projectileTimings.projectileCandidatesMonsters ?? 0,
          projectileCandidatesObjects: projectileTimings.projectileCandidatesObjects ?? 0,
        },
        loot: {
          lootHoverMs: formatMs(lootTimings.lootHoverMs),
          lootPickupMs: formatMs(lootTimings.lootPickupMs),
          lootMergeMs: formatMs(lootTimings.lootMergeMs),
          lootInventoryMergeMs: formatMs(lootTimings.lootInventoryMergeMs),
          lootDropCreationMs: formatMs(lootTimings.lootDropCreationMs),
          lootQuestTargetScanMs: formatMs(lootTimings.lootQuestTargetScanMs),
          lootRenderStateMs: formatMs(lootTimings.lootRenderStateMs),
          lootFloaterMs: formatMs(lootTimings.lootFloaterMs),
          lootToastMs: formatMs(lootTimings.lootToastMs),
          lootSnapshotMs: formatMs(lootTimings.lootSnapshotMs),
          pickedUpItems: Math.max(0, Math.floor(Number(lootTimings.pickedUpItems) || 0)),
          lootTableRollMs: formatMs(lootTimings.lootTableRollMs),
          lootConditionEvaluationMs: formatMs(lootTimings.lootConditionEvaluationMs),
          lootUniqueCheckMs: formatMs(lootTimings.lootUniqueCheckMs),
          lootNamedCheckMs: formatMs(lootTimings.lootNamedCheckMs),
          lootQuestDropCheckMs: formatMs(lootTimings.lootQuestDropCheckMs),
          lootObjectCreationMs: formatMs(lootTimings.lootObjectCreationMs),
          lootPlacementMs: formatMs(lootTimings.lootPlacementMs),
          lootDirtyMarkMs: formatMs(lootTimings.lootDirtyMarkMs),
          lootToastOrFloaterMs: formatMs(lootTimings.lootToastOrFloaterMs),
          lootSaveDirtyMs: formatMs(lootTimings.lootSaveDirtyMs),
          lootQueuedJobsProcessed: Math.max(0, Math.floor(Number(lootTimings.lootQueuedJobsProcessed) || 0)),
          lootObjectsCreated: Math.max(0, Math.floor(Number(lootTimings.lootObjectsCreated) || 0)),
        },
        groundHazards: {
          groundHazardUpdateMs: formatMs(groundHazardTimings.groundHazardUpdateMs),
          groundHazardCollisionMs: formatMs(groundHazardTimings.groundHazardCollisionMs),
          groundHazardDamageMs: formatMs(groundHazardTimings.groundHazardDamageMs),
          groundHazardKillMs: formatMs(groundHazardTimings.groundHazardKillMs),
          groundHazardLootDropMs: formatMs(groundHazardTimings.groundHazardLootDropMs),
          groundHazardSpawnEffectsMs: formatMs(groundHazardTimings.groundHazardSpawnEffectsMs),
          groundHazardCleanupMs: formatMs(groundHazardTimings.groundHazardCleanupMs),
        },
        monsterDeath: { ...(this.monsterDeathTimings ?? {}) },
        cleanupDetails: {
          cleanupEffectArraysMs: formatMs(cleanupTimings.cleanupEffectArraysMs),
          cleanupProjectileArraysMs: formatMs(cleanupTimings.cleanupProjectileArraysMs),
          cleanupFloatersMs: formatMs(cleanupTimings.cleanupFloatersMs),
          cleanupParticlesMs: formatMs(cleanupTimings.cleanupParticlesMs),
          cleanupWorldMs: formatMs(cleanupTimings.cleanupWorldMs),
          cleanupInteractionTargetsMs: formatMs(cleanupTimings.cleanupInteractionTargetsMs),
          interactionTargets: {
            interactionTargetCollectObjectsMs: formatMs(interactionTargetTimings.interactionTargetCollectObjectsMs),
            interactionTargetCollectLootMs: formatMs(interactionTargetTimings.interactionTargetCollectLootMs),
            interactionTargetCollectMonstersMs: formatMs(interactionTargetTimings.interactionTargetCollectMonstersMs),
            interactionTargetCollectNpcsMs: formatMs(interactionTargetTimings.interactionTargetCollectNpcsMs),
            interactionTargetDistanceChecksMs: formatMs(interactionTargetTimings.interactionTargetDistanceChecksMs),
            interactionTargetSortMs: formatMs(interactionTargetTimings.interactionTargetSortMs),
            interactionTargetStateUpdateMs: formatMs(interactionTargetTimings.interactionTargetStateUpdateMs),
            interactionTargetStateReasons: { ...(interactionTargetTimings.interactionTargetStateReasons ?? {}) },
          },
          cleanupRegionExitMs: formatMs(cleanupTimings.cleanupRegionExitMs),
          cleanupAutosaveSnapshotMs: formatMs(cleanupTimings.cleanupAutosaveSnapshotMs),
          autosave: {
            autosaveShouldRunMs: formatMs(cleanupTimings.autosaveShouldRunMs),
            autosaveSnapshotBuildMs: formatMs(cleanupTimings.autosaveSnapshotBuildMs),
            autosaveCloneMs: formatMs(cleanupTimings.autosaveCloneMs),
            autosaveSerializeMs: formatMs(cleanupTimings.autosaveSerializeMs),
            autosaveStorageWriteMs: formatMs(cleanupTimings.autosaveStorageWriteMs),
            autosaveTotalMs: formatMs(cleanupTimings.autosaveTotalMs),
          },
        },
      },
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
        minimapClearMs: formatMs(timings.minimapClearMs),
        minimapBlitStaticMs: formatMs(timings.minimapBlitStaticMs),
        minimapFogOverlayMs: formatMs(timings.minimapFogOverlayMs),
        minimapDynamicMarkersMs: formatMs(timings.minimapDynamicMarkersMs),
        minimapScaleCopyMs: formatMs(timings.minimapScaleCopyMs),
        minimapTotalDrawMs: formatMs(timings.minimapTotalDrawMs),
        minimapBudgetBackoff: Boolean(timings.minimapBudgetBackoff),
        minimapDiagnostics: {
          ...(this.minimapDiagnostics ?? {}),
          invalidationReasons: { ...(this.minimapDiagnostics?.invalidationReasons ?? {}) },
        },
        terrainLayerDiagnostics: { ...(this.terrainLayerDiagnostics ?? {}) },
      },
      snapshot: this.lastSnapshotInfo ? {
        reason: this.lastSnapshotInfo.reason ?? null,
        reasons: { ...(this.lastSnapshotInfo.reasons ?? {}) },
        builtAt: this.lastSnapshotInfo.builtAt ?? null,
        ageMs: Math.max(0, Math.round(Date.now() - (this.lastSnapshotInfo.builtAt ?? Date.now()))),
        buildCount: Math.max(0, Math.floor(Number(this.lastSnapshotInfo.buildCount) || 0)),
        actualBuildCount: Math.max(0, Math.floor(Number(this.snapshotBuildCount) || 0)),
        coalescedCount: Math.max(0, Math.floor(Number(this.snapshotCoalescedCount) || 0)),
        skippedBecauseUiOnly: Math.max(0, Math.floor(Number(this.snapshotSkippedBecauseUiOnly) || 0)),
        timings: {
          autosaveSnapshotBuildMs: formatMs(this.lastSnapshotInfo.autosaveSnapshotBuildMs),
        },
      } : null,
      dirtyState: {
        saveDirty: Boolean(this.saveDirty),
        saveDirtyReasons: { ...(this.saveDirtyReasons ?? {}) },
        saveDirtyReasonCountsCumulative: { ...(this.saveDirtyReasonCounts ?? {}) },
        uiDirtyReasonCountsCumulative: { ...(this.uiDirtyReasons ?? {}) },
        saveDiagnostics: {
          ...(this.saveDiagnostics ?? {}),
          reasonCounts: { ...(this.saveDiagnostics?.reasonCounts ?? {}) },
          forcedReasonCounts: { ...(this.saveDiagnostics?.forcedReasonCounts ?? {}) },
        },
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
        nearbyTotalMonsters: this.monsterActivityDebug?.nearbyTotalMonsters ?? this.monsterActivityDebug?.nearbyUpdatedMonsters ?? 0,
        visibleMovingMonsters: this.monsterActivityDebug?.visibleMovingMonsters ?? 0,
        visiblePassiveMovingMonsters: this.monsterActivityDebug?.visiblePassiveMovingMonsters ?? 0,
        visibleCombatMovingMonsters: this.monsterActivityDebug?.visibleCombatMovingMonsters ?? 0,
        offscreenMovingMonstersIgnored: this.monsterActivityDebug?.offscreenMovingMonstersIgnored ?? 0,
        activeMonsterMotionReasons: [...(this.monsterActivityDebug?.activeMonsterMotionReasons ?? [])],
        ambientMonsterMotionReasons: [...(this.monsterActivityDebug?.ambientMonsterMotionReasons ?? [])],
        activeSpellParticles: this.effectDebugCounts?.activeSpellParticles ?? 0,
        activeSpellEmitters: this.effectDebugCounts?.activeSpellEmitters ?? 0,
        cleanupQueueLength: this.spellVisualCleanups?.length ?? 0,
        expiredEffectsRemoved: this.effectDebugCounts?.expiredEffectsRemoved ?? 0,
        visibleEffectCategories: { ...(this.effectDebugCounts?.visibleEffectCategories ?? {}) },
        effectDirtyCategoryCounts: { ...(this.effectDirtyCategoryCounts ?? {}) },
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
