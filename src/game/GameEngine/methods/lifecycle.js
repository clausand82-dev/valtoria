import {
  loadGeneratedAtlas,
  loadAnimationSheets,
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
  AUTOSAVE_INTERVAL_SECONDS,
  DESTRUCTIBLE_OBJECT_ATTACK_RANGE,
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
    this.nextFrameTime = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  },

  stop() {
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
    this.maxDpr = profile.maxDpr;
    this.fogRenderScale = profile.fogRenderScale;
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
      maxDpr: this.maxDpr,
      dpr: this.dpr,
      fogRenderScale: this.fogRenderScale,
      particleQuality: this.particleEngine?.quality,
      maxParticles: this.particleEngine?.maxParticles,
    };
  },

  update(dt) {
    this.time += dt;
    this.ensureWorldAroundPlayer();
    if (this.updateFogOfWar()) this.markRenderDirty("fog");
    const stats = this.calcStats();
    this.player.hp = clamp(this.player.hp, 0, stats.maxHp);
    this.player.mana = clamp(this.player.mana + (4.8 + this.player.level * 0.15) * dt, 0, stats.maxMana);
    this.player.attackCooldown = Math.max(0, this.player.attackCooldown - dt);
    this.player.spellCooldown = Math.max(0, this.player.spellCooldown - dt);
    this.potionCooldown = Math.max(0, this.potionCooldown - dt);
    this.player.hurtCooldown = Math.max(0, this.player.hurtCooldown - dt);
    this.player.attackAnim = Math.max(0, this.player.attackAnim - dt);
    this.player.castAnim = Math.max(0, this.player.castAnim - dt);

    if (this.player.hp <= 0) {
      this.updateDeath(dt, stats);
    } else {
      this.updatePlayer(dt, stats);
      this.updateHeldSpell?.(dt);
      this.updateQuestgiver(dt);
      this.updateNearbyActionTarget();
      this.updateFoliageLoot();
      this.updateMonsters(dt, stats);
      this.updateCritters?.(dt);
      this.updateProjectiles(dt);
      this.updateGroundHazards(dt);
      this.updateSpellVisualCleanups?.(dt);
      this.updateLoot(dt);
    }

    this.updateEffects(dt);
    this.updateAmbient(dt);
    this.updateConfiguredParticles(dt);
    this.updateWeatherEvents(dt);
    this.updateWeatherOverlay(dt);
    this.updateRegionExit(dt);
    this.updateCamera(dt);
    this.autosaveTimer -= dt;
    if (this.autosaveTimer <= 0) {
      this.saveProgress();
      this.autosaveTimer = AUTOSAVE_INTERVAL_SECONDS;
    }
    this.snapshotTimer -= dt;
    if (this.snapshotTimer <= 0) {
      this.publishSnapshot();
      this.snapshotTimer = 0.2;
    }
  },

  markRenderDirty(reason = "unknown") {
    this.renderDirty = true;
    if (this.renderDirtyReasons) this.renderDirtyReasons.add(String(reason || "unknown"));
  },

  clearRenderDirty() {
    this.lastRenderDirtyReasons = this.renderDirtyReasons ? [...this.renderDirtyReasons] : [];
    this.renderDirty = false;
    this.renderDirtyReasons?.clear();
  },

  recordVisualActivity(level = "idle", reasons = []) {
    this.visualActivityLevel = level;
    this.visualActivityReasons = [...new Set(reasons.filter(Boolean))];
    return level;
  },

  visibleLootHasAmbientHover() {
    for (const loot of this.loots ?? []) {
      const screen = worldToScreen(loot.x, loot.y, 0, this.camera);
      if (visibleScreenPoint(screen, this.width, this.height, 180)) return true;
    }
    return false;
  },

  getVisualActivityLevel() {
    const activeReasons = [];
    const ambientReasons = [];
    if (!this.assetsReady) return this.recordVisualActivity("active", ["assets-loading"]);
    const player = this.player;
    if (player?.moving) activeReasons.push("player-moving");
    if (player?.attackAnim > 0) activeReasons.push("player-attack");
    if (player?.castAnim > 0) activeReasons.push("player-cast");
    if (player?.hurtCooldown > 0) activeReasons.push("player-hurt");
    if (player?.deadTimer > 0) activeReasons.push("player-death");

    const camera = this.camera ?? {};
    if (camera.shake > 0) activeReasons.push("camera-shake");
    if (
      Math.abs((camera.offsetX ?? 0) - (camera.targetOffsetX ?? 0)) > 0.25
      || Math.abs((camera.offsetY ?? 0) - (camera.targetOffsetY ?? 0)) > 0.25
    ) activeReasons.push("camera-interpolation");

    for (const monster of this.monsters?.values?.() ?? []) {
      if (monster.dead) continue;
      if (monster.moving || Math.hypot(monster.vx ?? 0, monster.vy ?? 0) > 0.002) activeReasons.push("monster-moving");
      if (monster.attackAnim > 0) activeReasons.push("monster-attack");
      if (monster.hurt > 0) activeReasons.push("monster-hurt");
      if (monster.castAnim > 0) activeReasons.push("monster-cast");
      if (activeReasons.length) break;
    }

    if ((this.projectiles?.length ?? 0) > 0) activeReasons.push("projectiles");
    if ((this.groundHazards?.length ?? 0) > 0) activeReasons.push("ground-hazards");
    if ((this.spellVisualCleanups?.length ?? 0) > 0) activeReasons.push("spell-cleanups");
    if ((this.floaters?.length ?? 0) > 0) activeReasons.push("floaters");
    if (this.weatherFlash) activeReasons.push("screen-weather-flash");
    if (this.subregionTransition) activeReasons.push("region-transition");

    if (activeReasons.length) return this.recordVisualActivity("active", activeReasons);

    if (this.visibleLootHasAmbientHover()) ambientReasons.push("visible-loot-hover");
    if ((this.particleEngine?.particles?.length ?? 0) > 0) ambientReasons.push("particles");
    if ((this.particleEngine?.emitters?.size ?? 0) > 0) ambientReasons.push("particle-emitters");
    if ((this.particles?.length ?? 0) > 0) ambientReasons.push("legacy-particles");
    if ((this.toasts?.length ?? 0) > 0) ambientReasons.push("toasts");
    if (this.pendingThunder) ambientReasons.push("pending-weather-audio");
    if (this.exitPromptOpen) ambientReasons.push("exit-prompt");

    if (ambientReasons.length) return this.recordVisualActivity("ambient", ambientReasons);
    return this.recordVisualActivity("idle", []);
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
    this.camera.shake = Math.max(0, this.camera.shake - dt * 16);
  },

  updatePlayer(dt, stats) {
    const input = this.readMovementInput();
    const beforeX = this.player.x;
    const beforeY = this.player.y;
    let moved = false;
    if (input.x || input.y) {
      const speedMult = this.statusSpeedMultiplier?.(this.player) ?? 1;
      this.moveEntity(this.player, input.x * stats.speed * speedMult * dt, input.y * stats.speed * speedMult * dt);
      this.player.target = null;
      this.setFacing(input.x, input.y);
      moved = true;
    } else if (this.player.target) {
      const dx = this.player.target.x - this.player.x;
      const dy = this.player.target.y - this.player.y;
      const n = normalize(dx, dy);
      if (Math.hypot(dx, dy) > 0.08) {
        const speedMult = this.statusSpeedMultiplier?.(this.player) ?? 1;
        this.moveEntity(this.player, n.x * stats.speed * speedMult * dt, n.y * stats.speed * speedMult * dt);
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

    const attackTarget = this.monsters.get(this.player.attackTargetId);
    if (!attackTarget || attackTarget.dead) {
      this.player.attackTargetId = null;
    } else {
      const d = distance(this.player, attackTarget);
      if (d > stats.range * 0.78) {
        this.player.target = { x: attackTarget.x, y: attackTarget.y };
      }
      if (d <= stats.range + attackTarget.radius && this.player.attackCooldown <= 0) {
        this.primaryAttack(attackTarget);
      }
    }

    const attackObject = this.findObjectById(this.player.attackObjectId);
    if (!attackObject || !isDestructibleObject(attackObject)) {
      this.player.attackObjectId = null;
    } else if (!this.player.attackTargetId) {
      const d = distance(this.player, attackObject);
      if (d > DESTRUCTIBLE_OBJECT_ATTACK_RANGE * 0.78) {
        this.player.target = { x: attackObject.x, y: attackObject.y };
      }
      if (d <= DESTRUCTIBLE_OBJECT_ATTACK_RANGE + attackObject.radius && this.player.attackCooldown <= 0) {
        this.primaryAttack(attackObject);
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
