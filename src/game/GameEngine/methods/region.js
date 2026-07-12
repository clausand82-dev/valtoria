import {
  MONSTER_STATS,
  BOSS_TINT,
  chunkCoords,
  chunkKey,
  createChunk,
  createRegion,
  clamp,
  distance,
  MAX_ELITE_MONSTERS_PER_REGION
} from "../dependencies.js";
import { actionTargetGroupsForQuest, rollEliteVariant, eliteVariantLevelPct } from "../helpers.js";
import { MAP_ABANDON_RESET_CONFIG } from "../../config/map-abandon-reset-config.js";
import { audioManager } from "../../audio-manager.js";
import {
  mobWorldStateKey,
  normalizeWorldState,
  recordMonsterSeen,
  resolveMapRegionConfig,
  setWorldFlag,
  withRegionVisitWorldState,
  regionWorldStateKey,
  worldEntryAllowed,
} from "../../world-state.js";
import { addHiddenEncounterPrefabs, lockHiddenEncountersForRegion } from "../../config/hidden-encounter-config.js";
import { normalizeWorldEnergy } from "../../world-energy.js";
import { markRegionDecoratorPlaced, rebuildCountBasedRegionDecorators } from "../../region-object-decorators.js";

function cloneAbandonValue(value) {
  if (value === null || value === undefined) return value;
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function captureAbandonState(engine) {
  return {
    player: {
      position: {
        x: engine.player.x,
        y: engine.player.y,
        facingX: engine.player.facingX,
        facingY: engine.player.facingY,
      },
      levelAndXp: {
        level: engine.player.level,
        xp: engine.player.xp,
      },
      economy: {
        gold: engine.player.gold,
        popularity: engine.player.popularity,
      },
      vitalsAndCooldowns: {
        hp: engine.player.hp,
        mana: engine.player.mana,
        attackCooldown: engine.player.attackCooldown,
        spellCooldown: engine.player.spellCooldown,
        hurtCooldown: engine.player.hurtCooldown,
        attackAnim: engine.player.attackAnim,
        castAnim: engine.player.castAnim,
        gait: engine.player.gait,
        moveSpeed: engine.player.moveSpeed,
        deadTimer: engine.player.deadTimer,
      },
      potions: cloneAbandonValue(engine.player.potions),
      readableBonuses: cloneAbandonValue(engine.player.readableBonuses),
      questStatBonuses: cloneAbandonValue(engine.player.questStatBonuses),
      skillTree: cloneAbandonValue(engine.player.skillTree),
      spells: {
        unlockedSpells: cloneAbandonValue(engine.player.unlockedSpells),
        activeSpellId: engine.player.activeSpellId,
      },
      stats: cloneAbandonValue(engine.player.stats),
      inventory: cloneAbandonValue(engine.player.inventory),
      equipment: cloneAbandonValue(engine.player.equipment),
    },
    quests: {
      active: cloneAbandonValue(engine.questState.active),
      completed: cloneAbandonValue(engine.questState.completed),
    },
    world: {
      worldEnergy: normalizeWorldEnergy(engine.worldEnergy),
      worldState: normalizeWorldState(engine.worldState),
    },
  };
}

function restoreKeptAbandonState(engine, currentState, config = MAP_ABANDON_RESET_CONFIG) {
  const playerCfg = config.player ?? {};
  const questCfg = config.quests ?? {};
  const worldCfg = config.world ?? {};
  const currentPlayer = currentState.player;
  if (playerCfg.position === false) Object.assign(engine.player, currentPlayer.position);
  if (playerCfg.levelAndXp === false) Object.assign(engine.player, currentPlayer.levelAndXp);
  if (playerCfg.economy === false) Object.assign(engine.player, currentPlayer.economy);
  if (playerCfg.vitalsAndCooldowns === false) Object.assign(engine.player, currentPlayer.vitalsAndCooldowns);
  if (playerCfg.potions === false) engine.player.potions = cloneAbandonValue(currentPlayer.potions);
  if (playerCfg.readableBonuses === false) engine.player.readableBonuses = cloneAbandonValue(currentPlayer.readableBonuses);
  if (playerCfg.questStatBonuses === false) engine.player.questStatBonuses = cloneAbandonValue(currentPlayer.questStatBonuses);
  if (playerCfg.skillTree === false) engine.player.skillTree = cloneAbandonValue(currentPlayer.skillTree);
  if (playerCfg.spells === false) {
    engine.player.unlockedSpells = cloneAbandonValue(currentPlayer.spells.unlockedSpells);
    engine.player.activeSpellId = currentPlayer.spells.activeSpellId;
  }
  if (playerCfg.stats === false) engine.player.stats = cloneAbandonValue(currentPlayer.stats);
  if (playerCfg.inventory === false) engine.player.inventory = cloneAbandonValue(currentPlayer.inventory);
  if (playerCfg.equipment === false) engine.player.equipment = cloneAbandonValue(currentPlayer.equipment);
  if (questCfg.active === false) engine.questState.active = cloneAbandonValue(currentState.quests.active);
  if (questCfg.completed === false) engine.questState.completed = cloneAbandonValue(currentState.quests.completed);
  if (worldCfg.worldEnergy === false) engine.worldEnergy = normalizeWorldEnergy(currentState.world?.worldEnergy);
  if (worldCfg.worldState === false) engine.worldState = normalizeWorldState(currentState.world?.worldState);
}

export const regionMethods = {
  updateRegionExit(dt) {
    this.exitPromptCooldown = Math.max(0, this.exitPromptCooldown - dt);
    if (this.isInSubregion?.()) {
      if (this.exitPromptOpen) {
        this.exitPromptOpen = false;
        this.markRenderDirty?.("exit-prompt");
        this.publishSnapshot();
      }
      return;
    }
    if (this.exitPromptOpen || this.exitPromptCooldown > 0) return;
    if (distance(this.player, this.region.end) < 0.78) {
      this.exitPromptOpen = true;
      this.player.target = null;
      this.markRenderDirty?.("exit-prompt");
      this.publishSnapshot();
    }
  },

  dismissExitPrompt() {
    this.exitPromptOpen = false;
    this.exitPromptCooldown = 1.2;
    this.markRenderDirty?.("exit-prompt");
    this.publishSnapshot();
  },

  travelToNextRegion() {
    if (this.isInSubregion?.()) {
      this.exitSubregionFromAction?.();
      return;
    }
    if (this.activeMapRegion) {
      this.returnToAreaMap();
      return;
    }
    this.clearSubregionExpedition?.();
    this.regionIndex += 1;
    this.region = createRegion(this.regionIndex);
    this.resetRegionRuntime();
    this.placePlayerAtRegionStart();
    this.ensureWorldAroundPlayer();
    this.spawnAmbientCritters?.();
    this.updateFogOfWar(true);
    this.prepareRegionQuestgiver();
    this.addToast(`Rejst til ${this.region.mapRegion?.label ?? "regionen"}`);
    this.markRenderDirty?.("region-change");
    this.publishSnapshot();
  },

  startMapRegion(areaMapId, regionConfig) {
    if (!areaMapId || !regionConfig?.id) return false;
    this.clearSubregionExpedition?.();
    const preparedRegionConfig = regionConfig.__worldStateResolved
      ? regionConfig
      : this.prepareMapRegionConfig(areaMapId, regionConfig, { markVisit: true });
    if (!preparedRegionConfig?.id) return false;
    this.saveProgress({ force: true });
    this.regionIndex += 1;
    const seed = Math.floor(Math.random() * 1000000000);
    this.activeMapRegion = {
      areaMapId,
      regionId: preparedRegionConfig.id,
      label: preparedRegionConfig.label ?? preparedRegionConfig.id,
    };
    this.activeMapRegion.mapSize = preparedRegionConfig.mapSize ?? "medium";
    this.mapReturn = null;
    this.region = createRegion(this.regionIndex, seed, null, {
      ...preparedRegionConfig,
      areaMapId,
    });
    const weatherId = String(preparedRegionConfig.weather?.id ?? "");
    const weatherAmbience = ["rain", "light_rain", "heavy_rain", "thunderstorm"].includes(weatherId) ? ["rain_ambience"] : [];
    audioManager.setRegionAudio({ ...(preparedRegionConfig.audio ?? {}), ambience: [...(preparedRegionConfig.audio?.ambience ?? []), ...weatherAmbience] });
    // Bounded to the entered region config; no world or live-monster scan is performed.
    audioManager.preloadRegion(preparedRegionConfig);
    this.resetRegionRuntime();
    this.placePlayerAtRegionStart();
    this.ensureFullRegionGenerated();
    this.rebuildCountBasedRegionDecorators();
    this.ensureWorldAroundPlayer();
    this.spawnAmbientCritters?.();
    this.updateFogOfWar(true);
    this.prepareRegionQuestgiver();
    // Set total spawned count for active clear_map quests targeting this region
    for (const quest of this.questState.active) {
      if (quest.type !== "clear_map" && quest.type !== "clear_map_and_action_targets") continue;
      const clearTarget = quest.type === "clear_map_and_action_targets" ? (quest.target?.clearMap ?? {}) : quest.target;
      if ((clearTarget?.regionId ?? quest.target?.regionId) !== preparedRegionConfig.id) continue;
      const validTypes = clearTarget?.monsters ?? [];
      const total = [...this.monsters.values()].filter((m) => validTypes.includes(m.typeName)).length;
      quest.progress = { ...(quest.progress ?? {}), total, killTotal: total, kills: 0, cleared: false };
    }
    // Dynamic action targets are only known after every chunk in this run exists.
    for (const quest of this.questState.active) {
      if (quest.type !== "action_targets" && quest.type !== "clear_map_and_action_targets") continue;
      if (quest.target?.regionId !== preparedRegionConfig.id) continue;
      const groups = actionTargetGroupsForQuest(quest);
      if (!groups.length) continue;
      const targets = Object.fromEntries(groups.map((group) => {
        const total = [...this.chunks.values()].reduce((sum, chunk) => (
          sum
          + (chunk.objects ?? []).filter((object) => !object?.removed && object?.questTargetKey === group.questTargetKey).length
          + (chunk.foliage ?? []).filter((object) => !object?.removed && object?.questTargetKey === group.questTargetKey).length
        ), 0);
        return [group.questTargetKey, { done: 0, total }];
      }));
      const total = Object.values(targets).reduce((sum, target) => sum + target.total, 0);
      // These targets belong to the newly generated run. Do not carry repaired
      // houses or buried villagers forward from an earlier run.
      quest.progress = { ...(quest.progress ?? {}), targets, targetTotal: total, targetDone: 0, total, done: 0 };
    }
    this.rebuildRegionStats?.({ ensureFullRegionGenerated: false });
    this.beginRunSummary?.(this.activeMapRegion);
    this.addToast(`${this.activeMapRegion.label} startet. Find den gyldne exit mod nordoest.`);
    this.markRenderDirty?.("region-change");
    this.publishSnapshot();
    return true;
  },

  prepareMapRegionConfig(areaMapId, regionConfig, options = {}) {
    if (!regionConfig?.id) return regionConfig;
    const currentWorldState = normalizeWorldState(this.worldState);
    this.worldState = options.markVisit === false
      ? currentWorldState
      : withRegionVisitWorldState(currentWorldState, areaMapId, regionConfig, { corrupted: options.corrupted });
    if (options.markVisit !== false) {
      const lock = lockHiddenEncountersForRegion(this.worldState, regionConfig.id, {
        regionId: regionConfig.id,
        regionConfig,
        questState: this.questState,
        player: this.player,
        inventory: this.player?.inventory,
      });
      this.worldState = lock.worldState;
    }
    if (options.markVisit !== false) this.saveProgress({ force: true });
    const conditionContext = {
        areaMapId,
        regionId: regionConfig.id,
        regionConfig,
        worldState: this.worldState,
        worldEnergy: this.worldEnergy,
        questState: this.questState,
        player: this.player,
        inventory: this.player?.inventory,
        potions: this.player?.potions,
        equipment: this.player?.equipment,
        cityStats: options.cityStats ?? this.cityStats,
        cityInventory: options.cityInventory ?? this.cityInventory,
        cityStorage: options.cityStorage ?? this.cityStorage ?? options.cityInventory ?? this.cityInventory,
        activeMapRegion: this.activeMapRegion,
        mapReturn: this.mapReturn,
        stats: {
          player: this.player,
          worldState: this.worldState,
        },
      };
    const encounterRegionConfig = addHiddenEncounterPrefabs(regionConfig, this.worldState, conditionContext);
    return {
      ...resolveMapRegionConfig(encounterRegionConfig, this.worldState, conditionContext),
      __worldStateResolved: true,
      __conditionContext: conditionContext,
    };
  },

  markMobSeen(typeName) {
    const id = String(typeName ?? "").trim();
    if (!id) return false;
    const key = mobWorldStateKey(id, "seen");
    let changed = false;
    if (!this.worldState?.flags?.[key]) {
      this.worldState = setWorldFlag(this.worldState, key, true);
      changed = true;
    }
    const result = recordMonsterSeen(this.worldState, id, {
      regionId: this.region?.mapRegion?.id ?? this.activeMapRegion?.regionId,
      activeMapRegion: this.activeMapRegion,
      incrementSeenCount: false,
    });
    this.worldState = result.worldState;
    return changed || result.changed;
  },

  recordBestiarySeen(monster) {
    if (!monster?.typeName || monster.isMinion) return false;
    const result = recordMonsterSeen(this.worldState, monster, {
      regionId: this.region?.mapRegion?.id ?? this.activeMapRegion?.regionId,
      activeMapRegion: this.activeMapRegion,
      incrementSeenCount: true,
    });
    this.worldState = result.worldState;
    return result.changed;
  },

  returnToAreaMap() {
    const active = this.activeMapRegion;
    if (!active) return;
    this.clearSubregionExpedition?.();
    const mobCounts = this.monsterCounterSnapshot();
    const cleared = this.allRegionMonstersCleared();
    // Mark clear_map quests complete per quest target, not by requiring all region monsters to be dead.
    for (const quest of this.questState.active) {
      if (quest.type !== "clear_map") continue;
      if (quest.target?.regionId !== active.regionId) continue;
      const validTypes = Array.isArray(quest.target?.monsters)
        ? quest.target.monsters.map((type) => String(type ?? "").trim()).filter(Boolean)
        : [];
      const remaining = [...this.monsters.values()].filter((monster) => {
        if (monster.isMinion || monster.dead) return false;
        if (!validTypes.length) return true;
        return validTypes.includes(String(monster.typeName ?? ""));
      }).length;
      if (remaining <= 0 && !quest.progress?.cleared) {
        quest.progress = { ...(quest.progress ?? {}), cleared: true };
        this.addToast(`${quest.title} ready to turn in`, {
          kind: "quest",
          localization: { type: "questReady", questId: quest.questId ?? quest.id },
        });
      }
    }
    const runSummary = this.finishRunSummary?.({ active, mobCounts, cleared, abandoned: false, reachedExit: true });
    this.mapReturn = {
      id: ++this.mapReturnSerial,
      areaMapId: active.areaMapId,
      regionId: active.regionId,
      label: active.label,
      cleared,
      totalMobs: mobCounts.total,
      killedMobs: mobCounts.killed,
      remainingMobs: mobCounts.alive,
      reachedExit: true,
      playerDied: false,
      abandoned: false,
      runSummary,
    };
    this.mapReturn.mapSize = active.mapSize ?? "medium";
    if (active.cityMobId) this.mapReturn.cityMobId = active.cityMobId;
    if (active.cityMobType) this.mapReturn.cityMobType = active.cityMobType;
    if (active.cityMobLevel) this.mapReturn.cityMobLevel = active.cityMobLevel;
    this.worldState = setWorldFlag(this.worldState, regionWorldStateKey(active.regionId, "cleared"), cleared);
    this.worldState = setWorldFlag(this.worldState, regionWorldStateKey(active.regionId, "corrupted"), !cleared);
    this.activeMapRegion = null;
    audioManager.setRegionAudio(null);
    this.exitPromptOpen = false;
    this.exitPromptCooldown = 0;
    this.player.target = null;
    this.player.attackTargetId = null;
    this.player.attackObjectId = null;
    this.addToast(cleared ? `${active.label} befriet. Tilbage i byen.` : `${active.label} er stadig corrupted. Tilbage i byen.`);
    this.cleanupMapRuntimeAfterReturn();
    this.saveProgress({ force: true });
    this.markRenderDirty?.("region-change");
    this.publishSnapshot();
  },

  abandonMapRegionToWorldMap() {
    const active = this.activeMapRegion;
    if (!active) return false;
    this.clearSubregionExpedition?.();
    const mobCounts = this.monsterCounterSnapshot();
    const runSummary = this.finishRunSummary?.({ active, mobCounts, cleared: false, abandoned: true, reachedExit: false });
    const currentState = captureAbandonState(this);
    // Roll back to the forced save taken when the map run started.
    this.loadProgress();
    restoreKeptAbandonState(this, currentState);
    this.clearSubregionExpedition?.();
    this.activeMapRegion = null;
    audioManager.setRegionAudio(null);
    this.exitPromptOpen = false;
    this.exitPromptCooldown = 0;
    this.player.target = null;
    this.player.attackTargetId = null;
    this.player.attackObjectId = null;
    this.mapReturn = {
      id: ++this.mapReturnSerial,
      areaMapId: active.areaMapId,
      regionId: active.regionId,
      label: active.label,
      cleared: false,
      abandoned: true,
      totalMobs: mobCounts.total,
      killedMobs: mobCounts.killed,
      remainingMobs: mobCounts.alive,
      reachedExit: false,
      playerDied: false,
      runSummary,
    };
    this.mapReturn.mapSize = active.mapSize ?? "medium";
    if (active.cityMobId) this.mapReturn.cityMobId = active.cityMobId;
    if (active.cityMobType) this.mapReturn.cityMobType = active.cityMobType;
    if (active.cityMobLevel) this.mapReturn.cityMobLevel = active.cityMobLevel;
    this.addToast(`${active.label} forladt. Progression blev nulstillet, og du er tilbage i byen.`);
    this.cleanupMapRuntimeAfterReturn();
    this.saveProgress({ force: true });
    this.markRenderDirty?.("region-change");
    this.publishSnapshot();
    return true;
  },

  cleanupMapRuntimeAfterReturn() {
    const clearedCounts = import.meta.env.DEV ? {
      chunks: this.chunks?.size ?? 0,
      monsters: this.monsters?.size ?? 0,
      critters: this.critters?.size ?? 0,
      loot: this.loots?.length ?? 0,
      projectiles: this.projectiles?.length ?? 0,
      hazards: this.groundHazards?.length ?? 0,
      particles: (this.particles?.length ?? 0) + (this.particleEngine?.particles?.length ?? 0),
    } : null;

    // resetRegionRuntime owns the transient chunk/combat/fog/interaction state.
    // Run it before saving because loot despawn bookkeeping may update quest state.
    this.resetRegionRuntime();
    this.particleEngine?.clearAll?.();
    this.runtimeActionObjectStates = {};
    this.heldSpell = null;
    this.nearbyInteractionMode = "action";
    this.player.moving = false;
    this.mapRuntimeDisposed = true;

    if (clearedCounts) console.debug("[map-runtime] Cleared after city return", clearedCounts);
  },

  resetRegionRuntime() {
    this.mapRuntimeDisposed = false;
    this.currentRegionStats = null;
    this.regionDecoratorPlans = new Map();
    this.chunks.clear();
    this.monsters.clear();
    this.resetCritterRuntime?.();
    // Before clearing loots, run despawn handling so quest drop counts are adjusted
    for (const loot of this.loots) {
      try { this.handleLootDespawn(loot); } catch (e) { /* best-effort */ }
    }
    this.loots = [];
    this.projectiles = [];
    this.groundHazards = [];
    this.spellVisualCleanups = [];
    this.particles = [];
    this.particleEngine?.clearMapEmitters();
    this.__ambientParticleEmitters = new Map();
    this.__weatherParticleEmitters = new Map();
    this.floaters = [];
    this.hoverMonsterId = null;
    this.nearbyQuestgiver = null;
    this.nearbyFoliageLoot = null;
    this.nearbyActionTarget = null;
    this.fogExploredTiles = new Set();
    this.fogVisibleTiles = new Set();
    this.fogExploredPoints = [];
    this.fogExploredPointKeys = new Set();
    this.fogLastReveal = { x: null, y: null, regionId: null };
    this.regionStartPlayerLevel = this.player.level;
    this.eliteMonsterCount = 0;
    if (this.region) this.region.__spawnedBossTypes = new Set();
    this.questState.wildernessNpc = null;
    this.exitPromptOpen = false;
    this.exitPromptCooldown = 0;
    this.fogOverlayCanvas = null;
    this.fogMinimapOverlayCanvas = null;
    this.markRenderDirty?.("region-reset");
  },

  placePlayerAtRegionStart() {
    this.player.x = this.region.start.x;
    this.player.y = this.region.start.y;
    this.player.target = null;
    this.player.attackTargetId = null;
    this.pointer.worldX = this.player.x;
    this.pointer.worldY = this.player.y;
    this.updateCamera(1);
    this.markRenderDirty?.("player-position");
  },

  ensureFullRegionGenerated() {
    if (!this.region) return;
    const min = chunkCoords(0, 0);
    const max = chunkCoords(this.region.width - 0.001, this.region.height - 0.001);
    for (let cy = min.cy; cy <= max.cy; cy += 1) {
      for (let cx = min.cx; cx <= max.cx; cx += 1) {
        this.getChunk(cx, cy);
      }
    }
  },

  rebuildCountBasedRegionDecorators() {
    return rebuildCountBasedRegionDecorators(this);
  },

  markRegionDecoratorPlaced(target) {
    return markRegionDecoratorPlaced(this, target);
  },

  allRegionMonstersCleared() {
    this.ensureFullRegionGenerated();
    for (const monster of this.monsters.values()) {
      if (monster.isMinion) continue;
      if (!monster.dead) return false;
    }
    return true;
  },

  ensureWorldAroundPlayer() {
    const { cx, cy } = chunkCoords(this.player.x, this.player.y);
    for (let y = cy - 2; y <= cy + 2; y += 1) {
      for (let x = cx - 2; x <= cx + 2; x += 1) {
        this.getChunk(x, y);
      }
    }
  },

  nearbyChunks(range = 2) {
    const chunks = [];
    const { cx, cy } = chunkCoords(this.player.x, this.player.y);
    for (let y = cy - range; y <= cy + range; y += 1) {
      for (let x = cx - range; x <= cx + range; x += 1) {
        chunks.push(this.getChunk(x, y));
      }
    }
    return chunks;
  },

  nearbyMonsters(range = 2) {
    const monsters = [];
    for (const chunk of this.nearbyChunks(range)) {
      monsters.push(...chunk.monsters);
    }
    return monsters;
  },

  getChunk(cx, cy) {
    const key = chunkKey(cx, cy);
    if (!this.chunks.has(key)) {
      const nearbyBefore = this.monsters?.size ?? 0;
      const chunk = createChunk(cx, cy, this.region);
      this.applySavedActionObjectStates?.(chunk);
      this.chunks.set(key, chunk);
      this.markRenderDirty?.("chunk-created");
      for (const monster of chunk.monsters) {
        this.scaleMonsterToHeroLevel(monster);
        this.assignEliteVariant(monster);
        this.monsters.set(monster.id, monster);
      }
      const metrics = this.chunkFrameMetrics;
      if (metrics) {
        metrics.chunksCreatedThisFrame += 1;
        metrics.chunkIdsCreated.push(key);
        metrics.monstersInsertedIntoIndexes += chunk.monsters?.length ?? 0;
        metrics.objectsInsertedIntoIndexes += chunk.objects?.length ?? 0;
        metrics.nearbyMonsterSetSizeBefore = nearbyBefore;
        metrics.nearbyMonsterSetSizeAfter = this.monsters?.size ?? nearbyBefore;
      }
    }
    return this.chunks.get(key);
  },

  scaleMonsterToHeroLevel(monster) {
    const heroLevel = Math.max(1, Math.floor(this.player.level || this.regionStartPlayerLevel || 1));
    const currentLevel = Math.max(1, Math.floor(Number(monster.level) || 1));
    const runawayElite = monster.elite && (!Number.isFinite(Number(monster.maxHp)) || currentLevel > heroLevel * 4);
    const naturalLevel = runawayElite
      ? Math.max(1, Math.floor(heroLevel * 0.82))
      : Math.max(1, Math.floor(Number(monster.baseLevel) || currentLevel));
    monster.baseLevel = naturalLevel;

    const baseTargetLevel = Math.max(naturalLevel, Math.floor(heroLevel * 0.82));
    const eliteLevelPct = eliteVariantLevelPct(monster.elite);
    const eliteBonusLevel = eliteLevelPct > 0 ? Math.max(1, Math.floor(heroLevel * eliteLevelPct)) : 0;
    const targetLevel = baseTargetLevel + eliteBonusLevel;
    if (runawayElite) {
      this.resetMonsterToLevel(monster, targetLevel);
      return;
    }

    const levelBoost = targetLevel - currentLevel;
    if (levelBoost <= 0) {
      monster.lootLevel = monster.level;
      return;
    }

    const hpPct = monster.maxHp > 0 ? clamp(monster.hp / monster.maxHp, 0.01, 1) : 1;
    monster.level = targetLevel;
    monster.lootLevel = targetLevel;
    monster.maxHp = Math.floor(monster.maxHp * (1 + levelBoost * 0.2));
    monster.hp = Math.max(1, Math.floor(monster.maxHp * hpPct));
    monster.damage = Math.floor(monster.damage * (1 + levelBoost * 0.17));
    monster.speed *= 1 + Math.min(0.2, levelBoost * 0.012);
    monster.xp = Math.floor(monster.xp * (1 + levelBoost * 0.12));
  },

  resetMonsterToLevel(monster, level) {
    const base = MONSTER_STATS[monster.typeName];
    if (!base) return;
    const hpPct = Number.isFinite(Number(monster.maxHp)) && monster.maxHp > 0
      ? clamp(monster.hp / monster.maxHp, 0.01, 1)
      : 1;
    monster.level = level;
    monster.lootLevel = level;
    monster.maxHp = Math.floor(base.hp * (1 + level * 0.18));
    monster.hp = Math.max(1, Math.floor(monster.maxHp * hpPct));
    monster.damage = Math.floor(base.damage * (1 + level * 0.16));
    monster.speed = base.speed * (1 + Math.min(0.32, level * 0.025));
    monster.baseSpeed = monster.speed;
    monster.magic = Math.floor(Number(base.magic) || 0);
    monster.critChance = Number(base.critChance) || 0;
    monster.critDamage = Number(base.critDamage) || 1.5;
    monster.blockChance = Number(base.blockChance) || 0;
    monster.dodgeChance = Number(base.dodgeChance) || 0;
    monster.spells = [...(base.spells ?? [])];
    monster.killLydra = Math.max(0, Number(base.killLydra) || 0);
    monster.killNetdra = Math.max(0, Number(base.killNetdra) || 0);
    monster.eliteKillLydra = Math.max(0, Number(base.eliteKillLydra) || 0);
    monster.eliteKillNetdra = Math.max(0, Number(base.eliteKillNetdra) || 0);
    monster.speciesId = base.speciesId;
    monster.audioProfile = base.audioProfile ?? null;
    monster.audio = base.audio ? { ...base.audio } : null;
    monster.factionId = base.factionId;
    monster.tags = Array.isArray(base.tags) ? [...base.tags] : [];
    monster.spellCooldown = Math.max(0, Number(monster.spellCooldown) || 0);
    monster.statusEffects = Array.isArray(monster.statusEffects) ? monster.statusEffects : [];
    monster.allowElite = base.allowElite !== false;
    monster.isBoss = Boolean(base.isBoss);
    monster.boss = base.isBoss ? { ...BOSS_TINT } : null;
    monster.noLoot = Boolean(base.noLoot);
    monster.despawnOnDeath = Boolean(base.despawnOnDeath);
    monster.onHitStatus = base.onHitStatus ? { ...base.onHitStatus } : null;
    monster.leapAttack = base.leapAttack ? { ...base.leapAttack } : null;
    monster.attackCooldownConfig = base.attackCooldown ? { ...base.attackCooldown } : null;
    monster.meleeAreaDamage = base.meleeAreaDamage ? { ...base.meleeAreaDamage } : null;
    monster.shadow = base.shadow ? { ...base.shadow } : null;
    monster.haveMinion = Boolean(base.haveMinion);
    monster.minions = base.minions ?? false;
    monster.minionCooldown = Math.max(0, Number(monster.minionCooldown) || 0);
    monster.isMinion = Boolean(monster.isMinion);
    monster.xp = Math.floor(base.xp * (1 + level * 0.15));
  },

  assignEliteVariant(monster) {
    if (monster.allowElite === false || monster.isBoss || monster.isMinion) return;
    const eliteSpawns = this.region?.mapRegion?.eliteSpawns;
    if (eliteSpawns && !worldEntryAllowed(
      eliteSpawns,
      this.worldState,
      this.questConditionContext?.({
        source: "elite_spawn",
        sourceRegionId: this.region?.mapRegion?.id,
        monster,
      }) ?? {},
    )) return;
    if (this.eliteMonsterCount >= MAX_ELITE_MONSTERS_PER_REGION) return;
    const variant = rollEliteVariant();
    if (!variant) return;

    this.eliteMonsterCount += 1;
    const bonusLevel = Math.max(1, Math.floor(this.regionStartPlayerLevel * variant.levelPct));
    monster.elite = {
      id: variant.id,
      label: variant.label,
      color: variant.color,
      tintAlpha: variant.tintAlpha,
      levelPct: variant.levelPct,
    };
    monster.level += bonusLevel;
    monster.lootLevel = monster.level;
    monster.maxHp = Math.floor(monster.maxHp * (1 + bonusLevel * 0.18));
    monster.hp = monster.maxHp;
    monster.damage = Math.floor(monster.damage * (1 + bonusLevel * 0.16));
    monster.speed *= 1 + Math.min(0.18, bonusLevel * 0.015);
    monster.xp = Math.floor(monster.xp * (1.2 + variant.levelPct));
    monster.visualScale = (monster.visualScale || 1) * variant.sizeMult;
  }
};
