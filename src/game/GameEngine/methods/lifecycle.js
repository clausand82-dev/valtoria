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
  worldToIso,
  AUTOSAVE_INTERVAL_SECONDS,
  DESTRUCTIBLE_OBJECT_ATTACK_RANGE
} from "../dependencies.js";
import {
  preventDefault,
  createReadableBonuses,
  createHeroStats,
  isDestructibleObject
} from "../helpers.js";
import { normalizeSkillTree } from "../../config/skill-tree-config.js";
import { createAutoLootRules } from "./loot.js";

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
      hp: 120,
      mana: 64,
      potions: { health: 0, mana: 0 },
      readableBonuses: createReadableBonuses(),
      skillTree: normalizeSkillTree(),
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
    this.publishSnapshot();
    window.addEventListener("resize", this.resize);
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("pointerup", this.handlePointerUp);
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("pointerleave", this.handlePointerLeave);
    this.canvas.addEventListener("contextmenu", preventDefault);
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
        })
        .catch((error) => console.error("Atlas load failed", error));
    }
    if (!this.animationSheets && !this.deferAssetLoad) {
      loadAnimationSheets()
        .then((sheets) => {
          this.animationSheets = sheets;
        })
        .catch((error) => console.error("Animation sheet load failed", error));
    }
    this.raf = requestAnimationFrame(this.loop);
  },

  stop() {
    this.saveProgress();
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("pointerup", this.handlePointerUp);
    this.canvas.removeEventListener("pointermove", this.handlePointerMove);
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.canvas.removeEventListener("pointerleave", this.handlePointerLeave);
    this.canvas.removeEventListener("contextmenu", preventDefault);
  },

  resize() {
    this.dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    this.width = Math.max(360, window.innerWidth);
    this.height = Math.max(360, window.innerHeight);
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.updateCamera(1);
  },

  loop(now) {
    if (this.paused) {
      this.lastTime = now;
      this.raf = requestAnimationFrame(this.loop);
      return;
    }
    const dt = Math.min(0.034, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.frame += 1;
    this.update(dt);
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  },

  setPaused(paused) {
    this.paused = Boolean(paused);
    if (!this.paused) this.lastTime = performance.now();
  },

  update(dt) {
    this.time += dt;
    this.ensureWorldAroundPlayer();
    this.updateFogOfWar();
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
      this.updateQuestgiver(dt);
      this.updateFoliageLoot();
      this.updateChests(dt);
      this.updateMonsters(dt, stats);
      this.updateProjectiles(dt);
      this.updateGroundHazards(dt);
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
