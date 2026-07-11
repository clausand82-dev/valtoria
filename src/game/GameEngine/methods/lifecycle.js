import {
  loadGeneratedAtlas,
  loadAnimationSheets,
  loadTileEdgeWallImage,
  EQUIPMENT_SLOTS,
  UNIQUE_ITEMS,
  createEquipment,
  createId,
  makeItem,
  makeUniqueItem,
  clamp,
  distance,
  lerp,
  normalize,
  screenDirectionToWorld,
  visibleScreenPoint,
  worldToIso,
  worldToScreen,
  CHUNK_SIZE,
  AUTOSAVE_INTERVAL_SECONDS,
  DESTRUCTIBLE_OBJECT_ATTACK_RANGE,
  TILE_EDGE_WALLS,
  normalizeQuickSlots
} from "../dependencies.js";
import {
  preventDefault,
  createReadableBonuses,
  createHeroStats,
  isDestructibleObject
} from "../helpers.js";
import { normalizeSkillTree } from "../../config/skill-tree-config.js";
import { DEFAULT_CLASS_ID } from "../../config/class-config.js";
import { normalizeFactionRep } from "../../config/faction-config.js";
import { createAutoLootRules } from "./loot.js";
import { resolvePerformanceProfile } from "../../config/performance-config.js";
import { audioManager } from "../../audio-manager.js";

function playerFootstepSurface(engine) {
  const tileset = String(JSON.stringify(engine.region?.mapRegion?.tileset ?? engine.region?.tileset ?? "")).toLowerCase();
  if (/(wood|plank)/.test(tileset)) return "wood";
  if (/(stone|rock|brick)/.test(tileset)) return "stone";
  return "grass";
}
import { CHEAT_SETTINGS } from "../../config/cheat-config.js";

function makeDevTestInventory() {
  if (!import.meta.env.DEV) return [];
  const pulseBlade = UNIQUE_ITEMS.find((item) => item.id === "blade_of_the_pulse");
  return pulseBlade ? [makeUniqueItem(pulseBlade, 1)] : [];
}

export const lifecycleMethods = {
  createPlayer(options = {}) {
    const empty = Boolean(options.empty);
    const devTestInventory = makeDevTestInventory();
    return {
      id: createId(),
      x: this.region.start.x,
      y: this.region.start.y,
      radius: 0.28,
      target: null,
      attackTargetId: null,
      attackObjectId: null,
      facingX: 1,
      facingY: 0,
      level: 1,
      xp: 0,
      gold: 0,
      popularity: 0,
      factionRep: normalizeFactionRep(),
      hp: 120,
      mana: 64,
      potions: { health: 0, mana: 0 },
      quickSlots: normalizeQuickSlots(),
      readableBonuses: createReadableBonuses(),
      questStatBonuses: {},
      skillTree: normalizeSkillTree(),
      classId: DEFAULT_CLASS_ID,
      classPoints: 0,
      classNodes: [],
      unlockedSpells: ["ember_spark"],
      activeSpellId: "ember_spark",
      autoLoot: createAutoLootRules(),
      statusEffects: [],
      stats: createHeroStats(),
      attackCooldown: 0,
      spellCooldown: 0,
      hurtCooldown: 0,
      attackAnim: 0,
      castAnim: 0,
      moving: false,
      gait: 0,
      moveSpeed: 0,
      deadTimer: 0,
      inventory: empty ? devTestInventory : [makeItem(1, 0.82), makeItem(1, 0.18), ...devTestInventory],
      equipment: empty ? Object.fromEntries(EQUIPMENT_SLOTS.map((slot) => [slot.id, null])) : createEquipment(),
    };
  },

  start() {
    this.resize();
    this.ensureWorldAroundPlayer();
    this.updateFogOfWar(true);
    this.markRenderDirty("start");
    this.publishSnapshot();
    window.addEventListener("resize", this.resize);
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("pointerup", this.handlePointerUp);
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("pointerleave", this.handlePointerLeave);
    this.canvas.addEventListener("contextmenu", preventDefault);
    if (CHEAT_SETTINGS.enabled && typeof window !== "undefined") {
      window.__valtoriaDebugSubregionState = () => this.debugSubregionState?.();
    }
    if (this.atlas) {
      for (const chunk of this.chunks.values()) {
        chunk.terrainLayer = null;
      }
    } else if (!this.deferAssetLoad) {
      loadGeneratedAtlas()
        .then((atlas) => {
          this.atlas = atlas;
          for (const chunk of this.chunks.values()) {
            chunk.terrainLayer = null;
          }
          this.markRenderDirty("atlas-loaded");
        })
        .catch((error) => console.error("Atlas load failed", error));
    }
    if (!this.animationSheets && !this.deferAssetLoad) {
      loadAnimationSheets()
        .then((sheets) => {
          this.animationSheets = sheets;
          this.markRenderDirty("animation-sheets-loaded");
        })
        .catch((error) => console.error("Animation sheet load failed", error));
    }
    if (TILE_EDGE_WALLS.enabled && !this.tileEdgeWallImage) {
      loadTileEdgeWallImage(TILE_EDGE_WALLS.fileName).then((image) => {
        if (!image) return;
        this.tileEdgeWallImage = image;
        for (const chunk of this.chunks.values()) {
          chunk.terrainLayer = null;
        }
        this.markRenderDirty("tile-edge-walls-loaded");
      });
    }
    this.nextFrameTime = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  },

  stop() {
    audioManager.stopAll();
    if (this.pendingAutosaveTimer) {
      clearTimeout(this.pendingAutosaveTimer);
      this.pendingAutosaveTimer = null;
    }
    if (this.pendingSnapshotTimer) {
      if (typeof this.pendingSnapshotClear === "function") this.pendingSnapshotClear(this.pendingSnapshotTimer);
      else clearTimeout(this.pendingSnapshotTimer);
      this.pendingSnapshotTimer = null;
      this.pendingSnapshotClear = null;
    }
    this.saveProgress();
    for (const timerId of this.toastTimers.values()) {
      clearTimeout(timerId);
    }
    this.toastTimers.clear();
    cancelAnimationFrame(this.raf);
    if (this.hiddenLoopTimer) {
      clearTimeout(this.hiddenLoopTimer);
      this.hiddenLoopTimer = null;
    }
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("pointerup", this.handlePointerUp);
    this.canvas.removeEventListener("pointermove", this.handlePointerMove);
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.canvas.removeEventListener("pointerleave", this.handlePointerLeave);
    this.canvas.removeEventListener("contextmenu", preventDefault);
    if (typeof window !== "undefined" && window.__valtoriaDebugSubregionState) {
      delete window.__valtoriaDebugSubregionState;
    }
  },

  resize() {
    this.dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, this.maxDpr ?? 1.5));
    this.width = Math.max(360, window.innerWidth);
    this.height = Math.max(360, window.innerHeight);
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.backdropCanvas = null;
    this.vignetteCanvas = null;
    this.fogOverlayCanvas = null;
    this.updateCamera(1);
    this.markRenderDirty("resize");
  },

  loop(now) {
    this.rafCallbackCount += 1;
    this.renderStatsWindowRafs += 1;
    if (typeof document !== "undefined" && document.hidden) {
      this.lastTime = now;
      if (!this.hiddenLoopTimer) {
        this.hiddenLoopTimer = setTimeout(() => {
          this.hiddenLoopTimer = null;
          this.raf = requestAnimationFrame(this.loop);
        }, 1000);
      }
      return;
    }
    if (this.paused) {
      this.lastTime = now;
      this.nextFrameTime = now;
      if (this.shouldRenderFrame(now)) {
        this.render();
        this.clearRenderDirty();
        this.lastRenderTime = now;
        this.renderFrameCount += 1;
        this.renderStatsWindowRenders += 1;
      }
      this.raf = requestAnimationFrame(this.loop);
      return;
    }
    const minFrameMs = 1000 / (this.targetFps ?? 60);
    this.nextFrameTime ??= now;
    if (now + 0.5 < this.nextFrameTime) {
      this.raf = requestAnimationFrame(this.loop);
      return;
    }
    const dt = Math.min(0.034, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.nextFrameTime += minFrameMs;
    if (now - this.nextFrameTime > minFrameMs) this.nextFrameTime = now + minFrameMs;
    this.lastFrameDt = dt;
    this.fpsWindowTime = (this.fpsWindowTime ?? 0) + dt;
    this.fpsWindowFrames = (this.fpsWindowFrames ?? 0) + 1;
    if (this.fpsWindowTime >= 0.75) {
      this.averageFps = Math.round(this.fpsWindowFrames / this.fpsWindowTime);
      this.fpsWindowTime = 0;
      this.fpsWindowFrames = 0;
    }
    this.frame += 1;
    this.updateFrameCount += 1;
    this.renderStatsWindowUpdates += 1;
    this.update(dt);
    if (this.shouldRenderFrame(now)) {
      this.render();
      this.clearRenderDirty();
      this.lastRenderTime = now;
      this.renderFrameCount += 1;
      this.renderStatsWindowRenders += 1;
    } else {
      this.skippedRenderFrames += 1;
    }
    this.updateRenderDiagnostics(dt);
    this.raf = requestAnimationFrame(this.loop);
  },

  setPaused(paused) {
    this.paused = Boolean(paused);
    this.markRenderDirty(this.paused ? "paused" : "resumed");
    if (!this.paused) this.lastTime = performance.now();
  },

  setPerformanceMode(mode) {
    const profile = resolvePerformanceProfile(mode);
    this.performanceMode = profile.id;
    this.targetFps = profile.targetFps;
    this.ambientRenderFps = Math.max(1, Math.min(30, Number(profile.ambientRenderFps) || 12));
    this.ambientRenderIntervalMs = 1000 / this.ambientRenderFps;
    this.minimapFps = Math.max(1, Math.min(10, Number(profile.minimapFps) || 5));
    this.minimapIntervalMs = 1000 / this.minimapFps;
    this.maxDpr = profile.maxDpr;
    this.fogRenderScale = profile.fogRenderScale;
    this.lowPowerMode = Boolean(profile.lowPowerMode);
    this.disableAmbientCritters = Boolean(profile.disableAmbientCritters);
    this.adaptivePerformanceEnabled = Boolean(profile.adaptive);
    this.adaptivePerformanceTier = 0;
    this.adaptiveLowFpsSamples = 0;
    this.adaptivePerformanceReason = "tier-0";
    if (this.particleEngine) {
      this.particleEngine.quality = profile.particleQuality;
      this.particleEngine.maxParticles = profile.maxParticles;
      while (this.particleEngine.particles.length > profile.maxParticles) {
        const particle = this.particleEngine.particles.pop();
        if (particle) this.particleEngine.pool.release(particle);
      }
    }
    this.nextFrameTime = performance.now();
    this.fogOverlayCanvas = null;
    this.resize();
    this.markRenderDirty("performance-mode");
    if (typeof window !== "undefined") {
      window.localStorage?.setItem?.("valtoria.performanceMode", profile.id);
    }
    return {
      mode: profile.id,
      targetFps: this.targetFps,
      ambientRenderFps: this.ambientRenderFps,
      maxDpr: this.maxDpr,
      dpr: this.dpr,
      fogRenderScale: this.fogRenderScale,
      particleQuality: this.particleEngine?.quality,
      maxParticles: this.particleEngine?.maxParticles,
    };
  },

  update(dt) {
    const updateStartedAt = performance.now();
    const timings = {
      playerMs: 0,
      cameraMs: 0,
      monstersMs: 0,
      projectilesMs: 0,
      groundHazardsMs: 0,
      spellEffectsMs: 0,
      particlesFloatersMs: 0,
      lootMs: 0,
      cleanupMs: 0,
      minimapFogMs: 0,
    };
    const timed = (key, action) => {
      const startedAt = performance.now();
      const result = action();
      timings[key] = (timings[key] ?? 0) + (performance.now() - startedAt);
      return result;
    };
    this.time += dt;
    // A job enqueued while this update is running is deliberately not eligible
    // until the next update.  Existing work keeps the current 2ms budget.
    this.lootProcessingGeneration = (this.lootProcessingGeneration ?? 0) + 1;
    this.lootJobsQueuedThisFrame = 0;
    this.lootJobsEligibleThisFrame = this.pendingLootDrops?.length ?? 0;
    this.lootJobsDeferredBecauseNew = 0;
    // City UI keeps the engine instance alive. Do not regenerate or update the
    // disposed map while no run is active.
    if (this.mapRuntimeDisposed && !this.activeMapRegion) return;
    this.monsterDeathsThisFrame = 0;
    this.monsterDeathTimings = {
      monsterDeathValidationMs: 0, monsterDeathStateMutationMs: 0, monsterDeathAnimationSetupMs: 0,
      monsterDeathCallbacksMs: 0, monsterDeathQuestProgressMs: 0, monsterDeathAchievementProgressMs: 0,
      monsterDeathBestiaryProgressMs: 0, monsterDeathLootJobEnqueueMs: 0, monsterDeathLootPreparationMs: 0,
      monsterDeathCorpseCreationMs: 0, monsterDeathReplacementFoliageMs: 0, monsterDeathSpatialIndexRemovalMs: 0,
      monsterDeathNearbySetRemovalMs: 0, monsterDeathCollisionIndexRemovalMs: 0, monsterDeathTargetCleanupMs: 0,
      monsterDeathEffectsCreationMs: 0, monsterDeathParticlesMs: 0, monsterDeathFloatersMs: 0,
      monsterDeathAudioMs: 0, monsterDeathDirtyMarkMs: 0, monsterDeathSaveDirtyMs: 0,
      monsterDeathEventDispatchMs: 0, monsterDeathTotalMs: 0,
      duplicateDeathCallsIgnored: 0, killedMonsterId: null, killedMonsterType: null, killedMonsterLevel: 0,
      deathSourceType: null, deathSourceId: null, deathSourceSpellId: null,
      lootTablesReferenced: 0, lootJobsQueued: 0, callbacksExecuted: 0, questsChecked: 0,
      monsterDeathCallbackCount: 0, monsterDeathCallbackIds: [], monsterDeathSlowestCallbackId: null,
      monsterDeathSlowestCallbackMs: 0, monsterDeathCallbackTimings: [],
      duplicateCallbackInvocationsIgnored: 0, duplicateDeathEventsIgnored: 0,
      repeatedSaveDirtyMarksCoalesced: 0, repeatedRenderDirtyMarksCoalesced: 0,
      duplicateLootJobsPrevented: 0, duplicateQuestChecksPrevented: 0,
      duplicateBestiaryChecksPrevented: 0, duplicateAchievementChecksPrevented: 0,
      questTargetsMatched: 0, achievementsChecked: 0, bestiaryEntriesChecked: 0,
      spatialIndexesUpdated: 0, corpseObjectsCreated: 0, effectsCreated: 0, particlesCreated: 0,
      listenersNotified: 0,
    };
    this.chunkFrameMetrics = {
      chunksCreatedThisFrame: 0, chunkIdsCreated: [], monstersInsertedIntoIndexes: 0,
      objectsInsertedIntoIndexes: 0, spatialIndexCellsTouched: 0,
      nearbyMonsterSetSizeBefore: 0, nearbyMonsterSetSizeAfter: 0,
      pathfindingCacheInvalidations: 0, visibilityCacheInvalidations: 0,
    };
    this.projectileUpdateTimings = null;
    this.monsterUpdateTimings = {
      monsterCandidateCollectionMs: 0, monsterNearbySetUpdateMs: 0, monsterSpatialIndexInsertMs: 0,
      monsterSpatialIndexRebuildMs: 0, monsterChunkActivationMs: 0, monsterChunkSpawnProcessingMs: 0,
      monsterVisibilityUpdateMs: 0, monsterPathfindingMs: 0, monsterCollisionMs: 0,
      monsterAiMs: 0, monsterAnimationMs: 0, monsterDeathCleanupMs: 0, monsterStateCommitMs: 0,
    };
    this.playerUpdateTimings = {
      playerInputMs: 0, playerMovementMs: 0, playerCollisionMs: 0, playerTargetingMs: 0,
      playerTargetCandidateCollectionMs: 0, playerTargetSpatialQueryMs: 0, playerTargetDistanceChecksMs: 0,
      playerTargetLineOfSightMs: 0, playerTargetConditionEvaluationMs: 0, playerTargetSortMs: 0,
      playerTargetStateComparisonMs: 0, playerTargetStateCommitMs: 0, playerTargetChunkSyncMs: 0,
      targetCandidateCount: 0, targetDistanceCheckCount: 0, targetLineOfSightCheckCount: 0,
      targetConditionCheckCount: 0, objectsScanned: 0, monstersScanned: 0, lootScanned: 0,
      npcsScanned: 0, actionTargetsScanned: 0, selectedTargetType: null, selectedTargetId: null,
      targetingTriggeredBy: null,
      playerCombatMs: 0, playerStatusEffectsMs: 0, playerAnimationMs: 0,
      playerChunkOrRegionUpdateMs: 0, playerDirtyMarkMs: 0,
    };
    this.lootUpdateTimings = {
      lootHoverMs: 0,
      lootPickupMs: 0,
      lootMergeMs: 0,
      lootInventoryMergeMs: 0,
      lootDropCreationMs: 0,
      lootQuestTargetScanMs: 0,
      lootRenderStateMs: 0,
      lootFloaterMs: 0,
      lootToastMs: 0,
      lootSnapshotMs: 0,
      pickedUpItems: 0,
      lootTableRollMs: 0,
      lootConditionEvaluationMs: 0,
      lootUniqueCheckMs: 0,
      lootNamedCheckMs: 0,
      lootQuestDropCheckMs: 0,
      lootObjectCreationMs: 0,
      lootPlacementMs: 0,
      lootDirtyMarkMs: 0,
      lootToastOrFloaterMs: 0,
      lootSaveDirtyMs: 0,
      lootQueuedJobsProcessed: 0,
      lootDropJobsQueued: this.pendingLootDrops?.length ?? 0,
      lootJobsQueuedThisFrame: 0,
      lootJobsEligibleThisFrame: 0,
      lootJobsDeferredBecauseNew: 0,
      lootOldestEligibleJobAgeFrames: 0,
      lootProcessingGeneration: this.lootProcessingGeneration ?? 0,
      lootQueuedFromMonsterDeath: 0,
      lootQueuedFromGroundHazardDeath: 0,
      lootQueuedFromProjectileDeath: 0,
      lootQueuedFromMeleeDeath: 0,
      lootDropJobsDeferred: 0,
      lootDropBudgetHit: false,
      lootDropBudgetMs: 2,
      slowLootTableId: null,
      slowLootEntryId: null,
      slowLootConditionKey: null,
      lootEntriesEvaluated: 0,
      lootTablesRolled: 0,
      nestedLootTablesRolled: 0,
      currentLootJobId: null,
      sourceType: null,
      sourceId: null,
      lootTableId: null,
      tableElapsedMs: 0,
      entryId: null,
      entryElapsedMs: 0,
      conditionKey: null,
      conditionElapsedMs: 0,
      entriesEvaluatedThisFrame: 0,
      entriesRemaining: 0,
      tablesCompletedThisFrame: 0,
      tablesRemaining: 0,
      jobStage: null,
      jobElapsedTotalMs: 0,
      frameLootElapsedMs: 0,
      deferredBecauseBudget: false,
      lootObjectsCreated: 0,
    };
    this.groundHazardUpdateTimings = {
      groundHazardUpdateMs: 0,
      groundHazardCollisionMs: 0,
      groundHazardDamageMs: 0,
      groundHazardDamageApplyMs: 0,
      groundHazardDeathDetectionMs: 0,
      groundHazardDeathStateMs: 0,
      groundHazardDeathCallbacksMs: 0,
      groundHazardLootJobEnqueueMs: 0,
      groundHazardCorpseCreationMs: 0,
      groundHazardDeathEffectsMs: 0,
      groundHazardSpatialRemovalMs: 0,
      groundHazardQuestProgressMs: 0,
      groundHazardKillMs: 0,
      groundHazardLootDropMs: 0,
      groundHazardSpawnEffectsMs: 0,
      groundHazardCleanupMs: 0,
      groundHazardCandidateCount: 0,
      groundHazardAffectedTargetCount: 0,
      groundHazardType: null,
    };
    this.cleanupUpdateTimings = {
      cleanupEffectArraysMs: 0,
      cleanupProjectileArraysMs: 0,
      cleanupFloatersMs: 0,
      cleanupParticlesMs: 0,
      cleanupWorldMs: 0,
      cleanupInteractionTargetsMs: 0,
      cleanupRegionExitMs: 0,
      cleanupAutosaveSnapshotMs: 0,
      autosaveShouldRunMs: 0,
      autosaveSnapshotBuildMs: 0,
      autosaveCloneMs: 0,
      autosaveSerializeMs: 0,
      autosaveStorageWriteMs: 0,
      autosaveTotalMs: 0,
    };
    this.interactionTargetTimings = {
      interactionTargetCollectObjectsMs: 0,
      interactionTargetCollectLootMs: 0,
      interactionTargetCollectMonstersMs: 0,
      interactionTargetCollectNpcsMs: 0,
      interactionTargetDistanceChecksMs: 0,
      interactionTargetSortMs: 0,
      interactionTargetStateUpdateMs: 0,
      interactionTargetStateReasons: {},
    };
    timed("cleanupMs", () => {
      const startedAt = performance.now();
      this.ensureWorldAroundPlayer();
      this.cleanupUpdateTimings.cleanupWorldMs += performance.now() - startedAt;
    });
    timed("minimapFogMs", () => {
      if (this.updateFogOfWar()) this.markRenderDirty("fog");
      this.flushPendingMinimapFogInvalidation?.(false);
    });
    const stats = timed("playerMs", () => {
      const calculated = this.calcStats();
      this.player.hp = clamp(this.player.hp, 0, calculated.maxHp);
      if (this.player.hp > 0 && this.player.deadTimer > 0) {
        this.player.deadTimer = 0;
        this.markRenderDirty("player-death-reset");
      }
      this.player.mana = clamp(this.player.mana + (4.8 + this.player.level * 0.15) * dt, 0, calculated.maxMana);
      this.player.attackCooldown = Math.max(0, this.player.attackCooldown - dt);
      this.player.spellCooldown = Math.max(0, this.player.spellCooldown - dt);
      this.potionCooldown = Math.max(0, this.potionCooldown - dt);
      this.player.hurtCooldown = Math.max(0, this.player.hurtCooldown - dt);
      this.player.attackAnim = Math.max(0, this.player.attackAnim - dt);
      this.player.castAnim = Math.max(0, this.player.castAnim - dt);
      return calculated;
    });

    if (this.player.hp <= 0) {
      timed("playerMs", () => this.updateDeath(dt, stats));
    } else {
      timed("playerMs", () => this.updatePlayer(dt, stats));
      timed("spellEffectsMs", () => this.updateHeldSpell?.(dt));
      timed("cleanupMs", () => {
        const startedAt = performance.now();
        this.updateInteractionTargets?.(dt);
        this.cleanupUpdateTimings.cleanupInteractionTargetsMs += performance.now() - startedAt;
      });
      timed("monstersMs", () => {
        this.updateMonsters(dt, stats);
        this.updateCritters?.(dt);
      });
      timed("projectilesMs", () => this.updateProjectiles(dt));
      timed("groundHazardsMs", () => this.updateGroundHazards(dt));
      timed("spellEffectsMs", () => this.updateSpellVisualCleanups?.(dt));
      timed("lootMs", () => this.updateLoot(dt));
    }

    timed("particlesFloatersMs", () => {
      this.updateEffects(dt);
      this.updateAmbient(dt);
      this.updateConfiguredParticles(dt);
      this.updateWeatherEvents(dt);
      this.updateWeatherOverlay(dt);
    });
    timed("cleanupMs", () => {
      const startedAt = performance.now();
      this.updateRegionExit(dt);
      this.cleanupUpdateTimings.cleanupRegionExitMs += performance.now() - startedAt;
    });
    timed("cameraMs", () => this.updateCamera(dt));
    timed("cleanupMs", () => {
      const startedAt = performance.now();
      const autosaveCheckStartedAt = performance.now();
      this.autosaveTimer -= dt;
      const shouldAutosave = this.autosaveTimer <= 0;
      this.cleanupUpdateTimings.autosaveShouldRunMs += performance.now() - autosaveCheckStartedAt;
      if (shouldAutosave) {
        this.scheduleAutosave?.();
        this.autosaveTimer = AUTOSAVE_INTERVAL_SECONDS;
      }
      this.snapshotTimer -= dt;
      if (this.snapshotTimer <= 0) {
        if (this.shouldSchedulePeriodicSnapshot?.()) this.scheduleSnapshotPublish?.("periodic");
        this.snapshotTimer = 2;
      }
      this.cleanupUpdateTimings.cleanupAutosaveSnapshotMs += performance.now() - startedAt;
    });
    const totalMs = performance.now() - updateStartedAt;
    const categories = {
      player: timings.playerMs,
      camera: timings.cameraMs,
      monsters: timings.monstersMs,
      projectiles: timings.projectilesMs,
      groundHazards: timings.groundHazardsMs,
      spellEffects: timings.spellEffectsMs,
      particlesFloaters: timings.particlesFloatersMs,
      loot: timings.lootMs,
      cleanup: timings.cleanupMs,
      minimapFog: timings.minimapFogMs,
    };
    const [worstCategory, worstCategoryMs] = Object.entries(categories)
      .sort((a, b) => b[1] - a[1])[0] ?? ["none", 0];
    this.updateTimings = {
      totalMs,
      ...categories,
      worstCategory,
      worstCategoryMs,
    };
    this.warnSlowUpdateCategory?.(worstCategory, worstCategoryMs);
    this.warnPerformanceThreshold?.("update.totalMs", totalMs, 8, this.performanceSpikeContext?.());
    this.warnPerformanceThreshold?.("playerTargetingMs", this.playerUpdateTimings?.playerTargetingMs, 2, this.performanceSpikeContext?.());
    this.warnPerformanceThreshold?.("monstersMs", categories.monsters, 3, this.performanceSpikeContext?.());
    this.warnPerformanceThreshold?.("cleanupInteractionTargetsMs", this.cleanupUpdateTimings.cleanupInteractionTargetsMs, 2);
    this.warnPerformanceThreshold?.("cleanupAutosaveSnapshotMs", this.cleanupUpdateTimings.cleanupAutosaveSnapshotMs, 1.5, {
      save: this.lastSaveInfo ? {
        sizeKb: this.lastSaveInfo.sizeKb ?? null,
        reason: this.lastSaveInfo.reason ?? null,
        status: this.lastSaveInfo.status ?? null,
        timings: this.lastSaveInfo.timings ? { ...this.lastSaveInfo.timings } : null,
      } : null,
    });
    this.warnPerformanceThreshold?.("projectilesMs", categories.projectiles, 2, {
      ...(this.performanceSpikeContext?.() ?? {}),
      projectileCount: this.projectiles?.length ?? 0,
      projectileTimings: this.projectileUpdateTimings ? { ...this.projectileUpdateTimings } : null,
      dirtyReasons: this.renderDirtyReasons ? [...this.renderDirtyReasons] : [],
      lastRenderedDirtyReasons: [...(this.lastRenderDirtyReasons ?? [])],
    });
    this.warnPerformanceThreshold?.("lootMs", categories.loot, 2, {
      ...(this.performanceSpikeContext?.() ?? {}),
      lootCount: this.loots?.length ?? 0,
      lootTimings: this.lootUpdateTimings ? { ...this.lootUpdateTimings } : null,
      pickedUpItems: Math.max(0, Math.floor(Number(this.lootUpdateTimings?.pickedUpItems) || 0)),
      saveDirtyReasons: { ...(this.saveDirtyReasons ?? {}) },
      snapshotActualBuildCount: Math.max(0, Math.floor(Number(this.snapshotBuildCount) || 0)),
      dirtyReasons: this.renderDirtyReasons ? [...this.renderDirtyReasons] : [],
      lastRenderedDirtyReasons: [...(this.lastRenderDirtyReasons ?? [])],
      inventory: this.performanceInventoryCounts?.() ?? null,
    });
    this.warnPerformanceThreshold?.("lootDropCreationMs", this.lootUpdateTimings?.lootDropCreationMs, 2, this.performanceSpikeContext?.());
    this.warnPerformanceThreshold?.("projectileImpactMs", this.projectileUpdateTimings?.projectileImpactMs, 2, this.performanceSpikeContext?.());
    this.warnPerformanceThreshold?.("projectileImpactDamageMs", this.projectileUpdateTimings?.projectileImpactDamageMs, 2, {
      ...(this.performanceSpikeContext?.() ?? {}),
      projectileCount: this.projectiles?.length ?? 0,
      projectileImpact: this.projectileUpdateTimings ? { ...this.projectileUpdateTimings } : null,
      dirtyReasons: this.renderDirtyReasons ? [...this.renderDirtyReasons] : [],
    });
    this.warnPerformanceThreshold?.("projectileImpactLootDropMs", this.projectileUpdateTimings?.projectileImpactLootDropMs, 2, this.performanceSpikeContext?.());
    this.warnPerformanceThreshold?.("groundHazardsMs", categories.groundHazards, 2, {
      ...(this.performanceSpikeContext?.() ?? {}),
      groundHazardTimings: this.groundHazardUpdateTimings ? { ...this.groundHazardUpdateTimings } : null,
    });
    this.warnPerformanceThreshold?.("groundHazardDamageMs", this.groundHazardUpdateTimings?.groundHazardDamageMs, 2, {
      ...(this.performanceSpikeContext?.() ?? {}),
      hazardCount: this.groundHazards?.length ?? 0,
      affectedTargetCount: this.groundHazardUpdateTimings?.groundHazardAffectedTargetCount ?? 0,
      candidateCount: this.groundHazardUpdateTimings?.groundHazardCandidateCount ?? 0,
      hazardType: this.groundHazardUpdateTimings?.groundHazardType ?? null,
      regionId: this.region?.mapRegion?.id ?? this.region?.id ?? null,
    });
    this.warnPerformanceThreshold?.("monsterDeathTotalMs", this.monsterDeathTimings?.monsterDeathTotalMs, 2.5, {
      ...(this.performanceSpikeContext?.() ?? {}),
      monsterDeath: this.monsterDeathTimings ? { ...this.monsterDeathTimings } : null,
    });
    this.warnPerformanceThreshold?.("monsterDeathTotalSevereMs", this.monsterDeathTimings?.monsterDeathTotalMs, 5, {
      ...(this.performanceSpikeContext?.() ?? {}),
      monsterDeath: this.monsterDeathTimings ? { ...this.monsterDeathTimings } : null,
    });
    this.updatePerformanceHistory?.();
  },

  updateInteractionTargets(dt = 0) {
    const now = performance.now();
    const player = this.player ?? {};
    const signature = [
      this.region?.mapRegion?.id ?? this.region?.id ?? "",
      Math.floor((Number(player.x) || 0) * 4),
      Math.floor((Number(player.y) || 0) * 4),
      this.loots?.length ?? 0,
      this.questState?.wildernessNpc?.id ?? "",
      this.actionTargetRevision ?? 0,
    ].join("|");
    const force = this.interactionTargetsDirty
      || this.interactionTargetSignature !== signature
      || now - (this.lastInteractionTargetUpdateAt ?? 0) > 250;
    if (!force) return false;
    this.interactionTargetsDirty = false;
    this.interactionTargetSignature = signature;
    this.lastInteractionTargetUpdateAt = now;
    this.updateQuestgiver(dt);
    this.updateNearbyActionTarget();
    this.updateFoliageLoot();
    if (this.playerUpdateTimings) {
      const selected = this.nearbyActionTarget ?? this.nearbyFoliageLoot ?? this.nearbyQuestgiver;
      this.playerUpdateTimings.selectedTargetType = selected?.sourceType ?? (selected?.npcId ? "npc" : selected ? "object" : null);
      this.playerUpdateTimings.selectedTargetId = selected?.runtimeId ?? selected?.id ?? null;
      this.playerUpdateTimings.targetingTriggeredBy = this.interactionTargetsDirty ? "dirty" : "player-position";
    }
    return true;
  },

  scheduleAutosave() {
    if (this.pendingAutosaveTimer) return false;
    this.pendingAutosaveTimer = setTimeout(() => {
      this.pendingAutosaveTimer = null;
      this.saveProgress({ reason: "autosave" });
    }, 0);
    return true;
  },

  scheduleSnapshotPublish(reason = "periodic") {
    const reasonKey = String(reason || "periodic");
    if (reasonKey === "toast" || reasonKey === "toast-expire") {
      // Toasts are represented in the UI snapshot but do not change persisted
      // game state; never rebuild an unchanged snapshot for their lifecycle.
      return false;
    }
    this.pendingSnapshotReasons ??= {};
    this.pendingSnapshotReasons[reasonKey] = (this.pendingSnapshotReasons[reasonKey] ?? 0) + 1;
    if (this.pendingSnapshotTimer) {
      this.snapshotCoalescedCount = (this.snapshotCoalescedCount ?? 0) + 1;
      return true;
    }
    const schedule = (callback) => {
      if (typeof requestIdleCallback === "function") {
        return requestIdleCallback(callback, { timeout: 120 });
      }
      return setTimeout(callback, 0);
    };
    const clearScheduled = (id) => {
      if (typeof cancelIdleCallback === "function") cancelIdleCallback(id);
      else clearTimeout(id);
    };
    this.pendingSnapshotClear = clearScheduled;
    this.pendingSnapshotTimer = schedule(() => {
      this.pendingSnapshotTimer = null;
      this.pendingSnapshotClear = null;
      const requestedReasons = { ...(this.pendingSnapshotReasons ?? {}) };
      const primaryRequestedReason = Object.entries(requestedReasons)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? reasonKey;
      this.pendingSnapshotReasons = {};
      if ((this.persistentStateVersion ?? 0) === (this.snapshotStateVersion ?? -1)) {
        this.snapshotSkippedUnchangedVersion = (this.snapshotSkippedUnchangedVersion ?? 0) + 1;
        this.lastSnapshotInfo = {
          ...(this.lastSnapshotInfo ?? {}), snapshotRequestedReason: primaryRequestedReason,
          snapshotSkippedUnchangedVersion: this.snapshotSkippedUnchangedVersion,
        };
        return;
      }
      const startedAt = performance.now();
      this.publishSnapshot();
      const elapsed = performance.now() - startedAt;
      const reasons = requestedReasons;
      const primaryReason = Object.entries(reasons)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? reasonKey;
      const info = {
        reason: primaryReason,
        reasons,
        snapshotRequestedReason: primaryRequestedReason,
        snapshotActualBuildReason: primaryReason,
        snapshotDirtyReasonsConsumed: { ...(this.saveDirtyReasons ?? {}) },
        persistentStateVersion: this.persistentStateVersion ?? 0,
        snapshotStateVersion: this.persistentStateVersion ?? 0,
        builtAt: Date.now(),
        buildCount: (this.snapshotBuildCount ?? 0) + 1,
        coalescedCount: this.snapshotCoalescedCount ?? 0,
        skippedBecauseUiOnly: this.snapshotSkippedBecauseUiOnly ?? 0,
        autosaveSnapshotBuildMs: elapsed,
        regionId: this.region?.mapRegion?.id ?? this.activeMapRegion?.regionId ?? this.region?.id ?? null,
        playerTile: {
          x: Math.floor(Number(this.player?.x) || 0),
          y: Math.floor(Number(this.player?.y) || 0),
        },
      };
      this.snapshotBuildCount = info.buildCount;
      this.snapshotStateVersion = this.persistentStateVersion ?? 0;
      this.lastSnapshotInfo = info;
      this.warnPerformanceThreshold?.("autosaveSnapshotBuildMs", elapsed, 1.5, {
        snapshot: info,
      });
    });
    return true;
  },

  markSaveDirty(reason = "unknown") {
    const key = String(reason || "unknown");
    if (this.saveDirtyReasons?.[key] && this.monsterDeathTimings) {
      this.monsterDeathTimings.repeatedSaveDirtyMarksCoalesced = (this.monsterDeathTimings.repeatedSaveDirtyMarksCoalesced ?? 0) + 1;
    }
    this.saveDirty = true;
    this.saveDirtyReasons ??= {};
    this.saveDirtyReasons[key] = true;
    this.saveDirtyReasonCounts ??= {};
    this.saveDirtyReasonCounts[key] = (this.saveDirtyReasonCounts[key] ?? 0) + 1;
    this.stateVersion = (this.stateVersion ?? 0) + 1;
    this.persistentStateVersion = (this.persistentStateVersion ?? 0) + 1;
  },

  markUiOnlySnapshot(reason = "ui") {
    const key = String(reason || "ui");
    this.uiDirtyReasons ??= {};
    this.uiDirtyReasons[key] = (this.uiDirtyReasons[key] ?? 0) + 1;
    this.snapshotSkippedBecauseUiOnly = (this.snapshotSkippedBecauseUiOnly ?? 0) + 1;
  },

  periodicSnapshotSignature() {
    const player = this.player ?? {};
    return [
      Math.ceil(Number(player.hp) || 0),
      Math.floor((Number(player.mana) || 0) / 5),
      Math.ceil((Number(player.attackCooldown) || 0) * 4),
      Math.ceil((Number(player.spellCooldown) || 0) * 4),
      Math.ceil((Number(this.potionCooldown) || 0) * 4),
      this.loots?.length ?? 0,
    ].join("|");
  },

  shouldSchedulePeriodicSnapshot() {
    const signature = this.periodicSnapshotSignature?.() ?? "";
    if (signature === this.lastPeriodicSnapshotSignature) return false;
    this.lastPeriodicSnapshotSignature = signature;
    return true;
  },

  performanceInventoryCounts() {
    const inventory = this.player?.inventory ?? [];
    const resources = {};
    let resourceStacks = 0;
    let potionStacks = 0;
    let questItems = 0;
    for (const item of inventory) {
      if (!item) continue;
      if (item.resourceId || item.mode === "resource" || item.slot === "resource") {
        resourceStacks += 1;
        const id = String(item.resourceId ?? item.id ?? "unknown");
        resources[id] = (resources[id] ?? 0) + Math.max(1, Math.floor(Number(item.count) || 1));
      } else if (item.potionId || item.potionType || item.mode === "potion") {
        potionStacks += 1;
      } else if (item.questItemId || item.mode === "quest") {
        questItems += 1;
      }
    }
    return {
      inventorySlots: inventory.length,
      resourceStacks,
      potionStacks,
      questItems,
      resources,
    };
  },

  performanceSpikeContext() {
    return {
      dirtyReasons: this.renderDirtyReasons ? [...this.renderDirtyReasons] : [],
      lastRenderedDirtyReasons: [...(this.lastRenderDirtyReasons ?? [])],
      monsterDeathsThisFrame: Math.max(0, Math.floor(Number(this.monsterDeathsThisFrame) || 0)),
      lootObjectsCreatedThisFrame: Math.max(0, Math.floor(Number(this.lootUpdateTimings?.lootObjectsCreated) || 0)),
      projectileCount: this.projectiles?.length ?? 0,
      hazardCount: this.groundHazards?.length ?? 0,
      activeSpellEffects: (this.effectDebugCounts?.activeSpellParticles ?? 0) + (this.effectDebugCounts?.activeSpellEmitters ?? 0),
      activeParticles: (this.particleEngine?.particles?.length ?? 0) + (this.particles?.length ?? 0),
      lootTimings: this.lootUpdateTimings ? { ...this.lootUpdateTimings } : null,
      projectileTimings: this.projectileUpdateTimings ? { ...this.projectileUpdateTimings } : null,
      groundHazardTimings: this.groundHazardUpdateTimings ? { ...this.groundHazardUpdateTimings } : null,
    };
  },

  warnSlowUpdateCategory(category, ms) {
    const elapsed = Number(ms) || 0;
    if (elapsed <= 5) return;
    this.warnPerformanceThreshold?.(`slow-${category || "unknown"}`, elapsed, 5, {
      category: String(category || "unknown"),
    });
  },

  warnPerformanceThreshold(metric, ms, threshold, extra = {}) {
    const elapsed = Number(ms) || 0;
    if (elapsed <= threshold) return;
    const now = performance.now();
    const key = String(metric || "unknown");
    this.performanceWarnTimes ??= {};
    if (now - (this.performanceWarnTimes[key] ?? 0) < 2000) return;
    this.performanceWarnTimes[key] = now;
    const counts = {
      monsters: this.monsters?.size ?? 0,
      nearbyUpdatedMonsters: this.monsterActivityDebug?.nearbyUpdatedMonsters ?? 0,
      nearbyTotalMonsters: this.monsterActivityDebug?.nearbyTotalMonsters ?? 0,
      projectiles: this.projectiles?.length ?? 0,
      loot: this.loots?.length ?? 0,
      objects: this.renderDebugCounts?.objects ?? 0,
      groundHazards: this.groundHazards?.length ?? 0,
      particles: (this.particleEngine?.particles?.length ?? 0) + (this.particles?.length ?? 0),
      emitters: this.particleEngine?.emitters?.size ?? 0,
      floaters: this.floaters?.length ?? 0,
    };
    console.warn("[performance] Update/render threshold exceeded", {
      metric: key,
      thresholdMs: threshold,
      ms: Math.round(elapsed * 10) / 10,
      counts,
      playerTile: {
        x: Math.floor(Number(this.player?.x) || 0),
        y: Math.floor(Number(this.player?.y) || 0),
      },
      regionId: this.region?.mapRegion?.id ?? this.activeMapRegion?.regionId ?? this.region?.id ?? null,
      activeReasons: [...(this.visualActivityReasons ?? [])],
      ...extra,
      projectile: this.projectileUpdateTimings ? { ...this.projectileUpdateTimings } : null,
      loot: this.lootUpdateTimings ? { ...this.lootUpdateTimings } : null,
      cleanup: this.cleanupUpdateTimings ? { ...this.cleanupUpdateTimings } : null,
      interactionTargets: this.interactionTargetTimings ? { ...this.interactionTargetTimings } : null,
    });
  },

  markRenderDirty(reason = "unknown") {
    this.renderDirty = true;
    const normalizedReason = String(reason || "unknown");
    if (this.renderDirtyReasons?.has(normalizedReason) && this.monsterDeathTimings) {
      this.monsterDeathTimings.repeatedRenderDirtyMarksCoalesced = (this.monsterDeathTimings.repeatedRenderDirtyMarksCoalesced ?? 0) + 1;
    }
    if (this.renderDirtyReasons) this.renderDirtyReasons.add(normalizedReason);
    this.renderDirtyReasonTimes ??= new Map();
    this.renderDirtyReasonTimes.set(normalizedReason, performance.now());
    if (/action|quest|loot|foliage|object|npc|monster-death|chunk|region|map/i.test(normalizedReason)) {
      this.interactionTargetsDirty = true;
    }
    if (/fog/i.test(normalizedReason)) {
      // Fog is a small, dynamic overlay. Never make it wait for the expensive
      // static-map backoff: the player needs newly revealed terrain promptly.
      this.invalidateMinimapFogOverlay?.(normalizedReason);
      return;
    }
    if (/fog|map|region|chunk|object|city|explor|start/i.test(normalizedReason)) {
      this.invalidateMinimapStatic?.(normalizedReason);
    }
  },

  shouldBatchMinimapFogInvalidation() {
    if (!this.fogOfWarActive) return false;
    const tier = Math.max(0, Math.floor(Number(this.adaptivePerformanceTier) || 0));
    if (tier <= 0 && this.visualActivityLevel !== "active") return false;
    const reasons = new Set(this.visualActivityReasons ?? []);
    return tier > 0
      || reasons.has("player-moving")
      || reasons.has("monster-combat-motion")
      || reasons.has("combat-particles")
      || reasons.has("spell-visuals")
      || reasons.has("visible-ground-hazard");
  },

  flushPendingMinimapFogInvalidation(force = false) {
    if (!this.pendingMinimapFogInvalidation) return false;
    const settings = this.adaptiveRuntimeSettings?.() ?? {};
    const baseInterval = Math.max(0, Number(settings.minimapFogRebuildIntervalMs) || 0);
    const interval = baseInterval > 0 ? baseInterval : (this.shouldBatchMinimapFogInvalidation?.() ? 400 : 0);
    const now = performance.now();
    const last = Number(this.lastMinimapFogInvalidationAt) || 0;
    if (!force && interval > 0 && now - last < interval) return false;
    this.pendingMinimapFogInvalidation = false;
    this.pendingMinimapFogInvalidationAt = null;
    this.lastMinimapFogInvalidationAt = now;
    this.invalidateMinimapStatic?.(this.pendingMinimapFogInvalidationReason ?? "fog-batched");
    this.pendingMinimapFogInvalidationReason = null;
    return true;
  },

  clearRenderDirty() {
    this.lastRenderDirtyReasons = this.renderDirtyReasons ? [...this.renderDirtyReasons] : [];
    this.lastRenderDirtyReasonDetails = this.lastRenderDirtyReasons.map((reason) => ({
      reason,
      ageMs: Math.max(0, Math.round(performance.now() - (this.renderDirtyReasonTimes?.get(reason) ?? performance.now()))),
    }));
    this.renderDirty = false;
    this.renderDirtyReasons?.clear();
  },

  recordVisualActivity(level = "idle", reasons = [], debugReasons = []) {
    this.visualActivityLevel = level;
    this.visualActivityReasons = [...new Set(reasons.filter(Boolean))];
    this.visualDebugReasons = [...new Set(debugReasons.filter(Boolean))];
    return level;
  },

  visibleLootHasAmbientHover() {
    for (const loot of this.loots ?? []) {
      const screen = worldToScreen(loot.x, loot.y, 0, this.camera);
      if (visibleScreenPoint(screen, this.width, this.height, 180)) return true;
    }
    return false;
  },

  isWorldPointNearViewport(x, y, z = 0, margin = 180) {
    const screen = worldToScreen(x, y, z, this.camera);
    return visibleScreenPoint(screen, this.width, this.height, margin);
  },

  hasVisibleGroundHazard() {
    for (const hazard of this.groundHazards ?? []) {
      if ((Number(hazard.life) || 0) <= 0) continue;
      const radiusMargin = Math.max(180, (Number(hazard.radius) || 0) * 96);
      if (this.isWorldPointNearViewport(hazard.x, hazard.y, 0, radiusMargin)) return true;
    }
    return false;
  },

  hasVisibleFloater() {
    if (Array.isArray(this.floaters)) {
      const before = this.floaters.length;
      this.floaters = this.floaters.filter((floater) => (Number(floater.life) || 0) > 0);
      if (this.floaters.length !== before) this.markRenderDirty?.("floater-expired");
    }
    for (const floater of this.floaters ?? []) {
      if (!Number.isFinite(Number(floater.x)) || !Number.isFinite(Number(floater.y))) continue;
      if (this.isWorldPointNearViewport(floater.x, floater.y, floater.z ?? 0, 80)) return true;
    }
    return false;
  },

  hasVisibleSpellVisuals() {
    const stats = this.effectVisibilityStats();
    return stats.activeSpellParticles > 0 || stats.activeSpellEmitters > 0;
  },

  effectPointVisible(effect, margin = 220) {
    if (!effect) return false;
    if (effect.screenSpace || effect.config?.area === "screen" || effect.config?.layer === "screenOverlay") return true;
    const x = Number(effect.x ?? effect.config?.x ?? effect.owner?.x);
    const y = Number(effect.y ?? effect.config?.y ?? effect.owner?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    return this.isWorldPointNearViewport(x, y, Number(effect.z) || 0, margin);
  },

  effectCategory(effect, emitter = null) {
    const config = emitter?.config ?? effect?.config ?? {};
    const explicit = effect?.effectCategory ?? config.effectCategory;
    if (explicit) return String(explicit);
    if (effect?.spellInstanceId || config.spellInstanceId) return "spell-effects";
    if (effect?.weatherParticle || config.weatherParticle || config.layer === "weatherOverlay" || config.layer === "screenOverlay") return "weather-particles";
    if (effect?.attachedEffectId || config.attachedEffectId || config.attachTo === "object") return "attached-particles";
    const ownerScope = emitter?.owner?.scope;
    if (ownerScope === "ambient") return "ambient-particles";
    if (ownerScope === "weather") return "weather-particles";
    if (effect?.effectParticle || config.oneShot || config.burst) return "combat-particles";
    return "ambient-particles";
  },

  effectVisibilityStats() {
    if (this.effectVisibilityStatsFrame === this.frame && this.cachedEffectVisibilityStats) return this.cachedEffectVisibilityStats;
    const stats = {
      visibleEngineParticles: 0,
      visibleLegacyParticles: 0,
      visibleEmitters: 0,
      activeSpellParticles: 0,
      activeSpellEmitters: 0,
      visibleEffectCategories: {},
    };
    const addCategory = (category) => {
      stats.visibleEffectCategories[category] = (stats.visibleEffectCategories[category] ?? 0) + 1;
    };
    for (const particle of this.particleEngine?.particles ?? []) {
      if ((Number(particle.lifetime) || 0) <= (Number(particle.age) || 0) || !this.effectPointVisible(particle)) continue;
      stats.visibleEngineParticles += 1;
      if (particle.spellInstanceId) stats.activeSpellParticles += 1;
      addCategory(this.effectCategory(particle, this.particleEngine?.emitters?.get?.(particle.emitterId)));
    }
    for (const particle of this.particles ?? []) {
      if ((Number(particle.life) || 0) <= 0 || !this.effectPointVisible(particle)) continue;
      stats.visibleLegacyParticles += 1;
      if (particle.spellInstanceId) stats.activeSpellParticles += 1;
      addCategory(this.effectCategory(particle));
    }
    for (const emitter of this.particleEngine?.emitters?.values?.() ?? []) {
      if (emitter?.dead) continue;
      const config = emitter?.config ?? {};
      let anchor = emitter.owner ?? null;
      if (config.followTarget === this.player?.id) anchor = this.player;
      else if (config.followTarget) anchor = this.monsters?.get?.(config.followTarget)
        ?? (this.projectiles ?? []).find((entry) => entry.id === config.followTarget)
        ?? anchor;
      const visible = config.area === "map" || this.effectPointVisible(anchor ? { ...anchor, config } : emitter);
      if (!visible) continue;
      stats.visibleEmitters += 1;
      if (config.spellInstanceId) stats.activeSpellEmitters += 1;
      addCategory(this.effectCategory(null, emitter));
    }
    this.effectVisibilityStatsFrame = this.frame;
    this.cachedEffectVisibilityStats = stats;
    this.effectDebugCounts = {
      ...(this.effectDebugCounts ?? {}),
      activeSpellParticles: stats.activeSpellParticles,
      activeSpellEmitters: stats.activeSpellEmitters,
      visibleEffectCategories: { ...stats.visibleEffectCategories },
      cleanupQueueLength: this.spellVisualCleanups?.length ?? 0,
      expiredEffectsRemoved: (this.particleEngine?.expiredRemoved ?? 0)
        + (this.legacyExpiredEffectsRemoved ?? 0)
        + (this.cleanupExpiredEffectsRemoved ?? 0),
    };
    return stats;
  },

  hasVisibleActiveEffects() {
    const stats = this.effectVisibilityStats();
    return stats.visibleEngineParticles > 0
      || stats.visibleLegacyParticles > 0
      || stats.visibleEmitters > 0
      || this.hasVisibleGroundHazard()
      || this.hasVisibleFloater();
  },

  getVisualActivityLevel() {
    const activeReasons = [];
    const ambientReasons = [];
    const debugReasons = [];
    const assetsReady = Boolean(this.atlas && this.animationSheets);
    if (!assetsReady) return this.recordVisualActivity("active", ["assets-loading"]);
    const player = this.player;
    if (player?.moving) activeReasons.push("player-moving");
    if (player?.attackAnim > 0) activeReasons.push("player-attack");
    if (player?.castAnim > 0) activeReasons.push("player-cast");
    if (player?.hurtCooldown > 0) activeReasons.push("player-hurt");
    if (player?.hp <= 0 && player?.deadTimer > 0 && player.deadTimer < 2.05) activeReasons.push("player-death-animation");
    if (player?.hp <= 0 && activeReasons.includes("player-death-animation") === false) debugReasons.push("player-death-overlay-static");

    const camera = this.camera ?? {};
    if (camera.shake > 0) activeReasons.push("camera-shake");
    if (
      Math.abs((camera.offsetX ?? 0) - (camera.targetOffsetX ?? 0)) > 0.5
      || Math.abs((camera.offsetY ?? 0) - (camera.targetOffsetY ?? 0)) > 0.5
    ) activeReasons.push("camera-interpolation");

    let visibleMovingMonsters = 0;
    let visiblePassiveMovingMonsters = 0;
    let visibleCombatMovingMonsters = 0;
    let offscreenMovingMonstersIgnored = 0;
    const activeMonsterMotionReasons = [];
    const ambientMonsterMotionReasons = [];
    for (const monster of this.monsters?.values?.() ?? []) {
      if (monster.dead) continue;
      const moving = monster.moving || Math.hypot(monster.vx ?? 0, monster.vy ?? 0) > 0.002;
      const playerDistance = distance(player, monster);
      const nearPlayer = playerDistance <= CHUNK_SIZE * 2.25;
      const visible = (nearPlayer || this.isWorldPointNearViewport(monster.x, monster.y, 0, 220)) && this.isPointVisible(monster);
      if (moving && visible) {
        visibleMovingMonsters += 1;
        const aggroed = playerDistance < Math.max(0, Number(monster.aggro) || 0);
        const immediateCombat = playerDistance <= Math.max(3.5, (Number(monster.range) || 0) + (Number(player?.radius) || 0) + 1.5);
        if (aggroed || immediateCombat) {
          visibleCombatMovingMonsters += 1;
          activeReasons.push("monster-combat-motion");
          activeMonsterMotionReasons.push(aggroed ? "aggro-pathing" : "immediate-combat-radius");
        } else {
          visiblePassiveMovingMonsters += 1;
          ambientReasons.push("monster-passive-motion");
          ambientMonsterMotionReasons.push("passive-wander");
        }
      } else if (moving) {
        offscreenMovingMonstersIgnored += 1;
      }
      if (!visible) continue;
      if (monster.attackAnim > 0) {
        activeReasons.push("monster-attack");
        activeMonsterMotionReasons.push("attack-animation");
      }
      if (monster.hurt > 0) {
        activeReasons.push("monster-hurt");
        activeMonsterMotionReasons.push("hurt-animation");
      }
      if (monster.castAnim > 0) {
        activeReasons.push("monster-cast");
        activeMonsterMotionReasons.push("cast-animation");
      }
    }
    this.monsterActivityDebug = {
      ...(this.monsterActivityDebug ?? {}),
      totalMonsters: this.monsters?.size ?? 0,
      visibleMovingMonsters,
      visiblePassiveMovingMonsters,
      visibleCombatMovingMonsters,
      offscreenMovingMonstersIgnored,
      activeMonsterMotionReasons: [...new Set(activeMonsterMotionReasons)],
      ambientMonsterMotionReasons: [...new Set(ambientMonsterMotionReasons)],
    };

    if ((this.projectiles ?? []).some((entry) => this.effectPointVisible(entry, 220))) activeReasons.push("projectiles");
    if (this.hasVisibleGroundHazard()) activeReasons.push("visible-ground-hazard");
    else if ((this.groundHazards?.length ?? 0) > 0) debugReasons.push("hidden-ground-hazard");
    if (this.hasVisibleSpellVisuals()) activeReasons.push("spell-visuals");
    const effectStats = this.effectVisibilityStats();
    if ((effectStats.visibleEffectCategories?.["combat-particles"] ?? 0) > 0) activeReasons.push("combat-particles");
    if ((this.spellVisualCleanups?.length ?? 0) > 0) debugReasons.push("spell-cleanup-queue");
    if (this.hasVisibleFloater()) activeReasons.push("visible-floaters");
    if (this.weatherFlash) activeReasons.push("screen-weather-flash");
    if (this.subregionTransition) activeReasons.push("region-transition");

    if (activeReasons.length) return this.recordVisualActivity("active", activeReasons, debugReasons);

    if (this.visibleLootHasAmbientHover()) ambientReasons.push("visible-loot-hover");
    for (const category of ["ambient-particles", "attached-particles", "weather-particles"]) {
      if ((effectStats.visibleEffectCategories?.[category] ?? 0) > 0) ambientReasons.push(category);
    }
    if ((this.toasts?.length ?? 0) > 0) ambientReasons.push("toasts");
    if (this.pendingThunder) ambientReasons.push("pending-weather-audio");
    if (this.exitPromptOpen) ambientReasons.push("exit-prompt");

    if (ambientReasons.length) return this.recordVisualActivity("ambient", ambientReasons, debugReasons);
    return this.recordVisualActivity("idle", [], debugReasons);
  },

  hasVisualActivity() {
    return this.getVisualActivityLevel() !== "idle";
  },

  shouldRenderFrame(now) {
    if (this.renderDirty) return true;
    if (!this.lastRenderTime || this.renderFrameCount <= 0) return true;
    const activityLevel = this.getVisualActivityLevel();
    if (activityLevel === "active") return true;
    if (activityLevel === "ambient") return now - this.lastRenderTime >= (this.ambientRenderIntervalMs ?? 1000 / 12);
    return now - this.lastRenderTime >= (this.maxIdleRenderIntervalMs ?? 1000);
  },

  updateRenderDiagnostics(dt) {
    this.warnPerformanceThreshold?.("minimapMs", this.renderTimings?.minimapMs, 4);
    this.renderStatsWindowTime = (this.renderStatsWindowTime ?? 0) + dt;
    if (this.renderStatsWindowTime < 0.75) return;
    const seconds = this.renderStatsWindowTime;
    this.updateFps = Math.round((this.renderStatsWindowUpdates ?? 0) / seconds);
    this.renderFps = Math.round((this.renderStatsWindowRenders ?? 0) / seconds);
    this.rafCallbacksPerSecond = Math.round((this.renderStatsWindowRafs ?? 0) / seconds);
    this.renderStatsWindowTime = 0;
    this.renderStatsWindowUpdates = 0;
    this.renderStatsWindowRenders = 0;
    this.renderStatsWindowRafs = 0;
  },

  updateDeath(dt, stats) {
    this.player.deadTimer += dt;
    this.player.target = null;
    this.player.attackTargetId = null;
    if (this.player.deadTimer > 2) {
      this.player.deadTimer = 0;
      this.placePlayerAtRegionStart();
      this.player.hp = Math.floor(stats.maxHp * 0.72);
      this.player.mana = Math.floor(stats.maxMana * 0.7);
      this.addToast("Genoplivet ved Stonewake");
    }
  },

  updateCamera(dt) {
    const playerIso = worldToIso(this.player.x, this.player.y, 0);
    this.camera.targetOffsetX = this.width / 2 - playerIso.x;
    this.camera.targetOffsetY = this.height / 2 - playerIso.y + 72;
    const t = 1 - Math.pow(0.001, dt);
    this.camera.offsetX = lerp(this.camera.offsetX, this.camera.targetOffsetX, t);
    this.camera.offsetY = lerp(this.camera.offsetY, this.camera.targetOffsetY, t);
    if (
      Math.abs(this.camera.offsetX - this.camera.targetOffsetX) <= 0.5
      && Math.abs(this.camera.offsetY - this.camera.targetOffsetY) <= 0.5
    ) {
      this.camera.offsetX = this.camera.targetOffsetX;
      this.camera.offsetY = this.camera.targetOffsetY;
    }
    this.camera.shake = Math.max(0, this.camera.shake - dt * 16);
  },

  updatePlayer(dt, stats) {
    const timedPlayer = (key, action) => {
      const startedAt = performance.now();
      const result = action();
      this.playerUpdateTimings[key] = (this.playerUpdateTimings[key] ?? 0) + (performance.now() - startedAt);
      return result;
    };
    const input = timedPlayer("playerInputMs", () => this.readMovementInput());
    const beforeX = this.player.x;
    const beforeY = this.player.y;
    let moved = false;
    if (input.x || input.y) {
      const speedMult = this.statusSpeedMultiplier?.(this.player) ?? 1;
      timedPlayer("playerMovementMs", () => this.moveEntity(this.player, input.x * stats.speed * speedMult * dt, input.y * stats.speed * speedMult * dt));
      this.player.target = null;
      this.setFacing(input.x, input.y);
      moved = true;
    } else if (this.player.target) {
      const dx = this.player.target.x - this.player.x;
      const dy = this.player.target.y - this.player.y;
      const n = normalize(dx, dy);
      if (Math.hypot(dx, dy) > 0.08) {
        const speedMult = this.statusSpeedMultiplier?.(this.player) ?? 1;
        timedPlayer("playerMovementMs", () => this.moveEntity(this.player, n.x * stats.speed * speedMult * dt, n.y * stats.speed * speedMult * dt));
        this.setFacing(n.x, n.y);
        moved = true;
      } else {
        this.player.target = null;
      }
    }
    this.player.moving = moved;
    const travelled = Math.hypot(this.player.x - beforeX, this.player.y - beforeY);
    const rawSpeed = dt > 0 ? travelled / dt : 0;
    this.player.moveSpeed = lerp(this.player.moveSpeed, rawSpeed, moved ? 0.45 : 0.18);
    if (this.player.moveSpeed > 0.02) this.player.gait += dt * (7.5 + this.player.moveSpeed * 2.3);
    if (moved && Math.random() < (this.footstepDustChance?.(0.18) ?? 0.18)) this.addDust(this.player.x, this.player.y, 1);
    if (travelled > 0.001) {
      const gait = input.x || input.y ? "run" : "walk";
      const stride = gait === "run" ? 0.68 : 0.52;
      this.player.footstepDistance = Math.max(0, Number(this.player.footstepDistance) || 0) + travelled;
      if (this.player.footstepDistance >= stride) {
        this.player.footstepDistance -= stride;
        audioManager.playSound(`footstep_${gait}_${playerFootstepSurface(this)}`, { position: this.player, listener: this.player });
      }
    } else {
      this.player.footstepDistance = 0;
    }

    const attackTarget = timedPlayer("playerTargetingMs", () => this.monsters.get(this.player.attackTargetId));
    if (!attackTarget || attackTarget.dead) {
      this.player.attackTargetId = null;
    } else {
      const d = distance(this.player, attackTarget);
      if (d > stats.range * 0.78) {
        this.player.target = { x: attackTarget.x, y: attackTarget.y };
      }
      if (d <= stats.range + attackTarget.radius && this.player.attackCooldown <= 0) {
        timedPlayer("playerCombatMs", () => this.primaryAttack(attackTarget));
      }
    }

    const attackObject = timedPlayer("playerTargetingMs", () => this.findObjectById(this.player.attackObjectId));
    if (!attackObject || !isDestructibleObject(attackObject)) {
      this.player.attackObjectId = null;
    } else if (!this.player.attackTargetId) {
      const d = distance(this.player, attackObject);
      if (d > DESTRUCTIBLE_OBJECT_ATTACK_RANGE * 0.78) {
        this.player.target = { x: attackObject.x, y: attackObject.y };
      }
      if (d <= DESTRUCTIBLE_OBJECT_ATTACK_RANGE + attackObject.radius && this.player.attackCooldown <= 0) {
        timedPlayer("playerCombatMs", () => this.primaryAttack(attackObject));
      }
    }

  },

  readMovementInput() {
    let sx = 0;
    let sy = 0;
    if (this.keys.has("w") || this.keys.has("arrowup")) sy -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) sy += 1;
    if (this.keys.has("a") || this.keys.has("arrowleft")) sx -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) sx += 1;
    if (!sx && !sy) return { x: 0, y: 0 };
    const world = screenDirectionToWorld(sx, sy);
    return normalize(world.x, world.y);
  },

  setFacing(x, y) {
    const n = normalize(x, y);
    this.player.facingX = n.x || this.player.facingX;
    this.player.facingY = n.y || this.player.facingY;
  }
};
