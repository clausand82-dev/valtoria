import {
  BIOMES,
  CHUNK_SIZE,
  EQUIPMENT_SLOTS,
  MAX_INVENTORY,
  PREFIXES,
  RARITIES,
  TILE_H,
  TILE_W,
  WORLD_SEED,
} from "./data.js";
import {
  drawGroundTile,
  loadGeneratedAtlas,
} from "./assets-ground.js";
import { drawHero } from "./assets-hero.js";
import { drawMonster } from "./assets-monster.js";
import { drawFoliageObject } from "./assets-foliage.js";
import { drawOverlayObject } from "./assets-overlay.js";
import { loadAnimationSheets, drawObject } from "./assets.js";
import { drawLoot, drawProjectile } from "./assets-items.js";
import {
  chunkCoords,
  chunkKey,
  createChunk,
  createEquipment,
  createId,
  createRegion,
  ensureNextId,
  isRegionPointPlayable,
  itemValue,
  makeItem,
  makePotion,
  rollNamedItem,
  rollUniqueItem,
} from "./world.js";
import {
  clamp,
  distance,
  lerp,
  normalize,
  screenDirectionToWorld,
  screenToWorld,
  visibleScreenPoint,
  worldToIso,
  worldToScreen,
} from "./iso.js";

const TERRAIN_LAYER_PAD_TOP = 56;
const TERRAIN_LAYER_PAD_BOTTOM = 88;
const SAVE_VERSION = 1;
const SAVE_STORAGE_KEY = `runebound-depths-save-v${SAVE_VERSION}`;
const AUTOSAVE_INTERVAL_SECONDS = 1.5;
const MAX_POTION_STACK = 5;
const MAX_ELITE_MONSTERS_PER_REGION = 6;

export class GameEngine {
  constructor(canvas, onSnapshot) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.onSnapshot = onSnapshot;
    this.width = 1;
    this.height = 1;
    this.dpr = 1;
    this.lastTime = performance.now();
    this.time = 0;
    this.frame = 0;
    this.raf = 0;
    this.keys = new Set();
    this.chunks = new Map();
    this.monsters = new Map();
    this.loots = [];
    this.projectiles = [];
    this.particles = [];
    this.floaters = [];
    this.toasts = [];
    this.potionCooldown = 0;
    this.regionIndex = 1;
    this.region = createRegion(this.regionIndex);
    this.exitPromptOpen = false;
    this.exitPromptCooldown = 0;
    this.camera = { offsetX: 0, offsetY: 0, targetOffsetX: 0, targetOffsetY: 0, shake: 0 };
    this.pointer = { x: 0, y: 0, worldX: this.region.start.x, worldY: this.region.start.y, down: false };
    this.hoverMonsterId = null;
    this.player = this.createPlayer();
    this.regionStartPlayerLevel = this.player.level;
    this.eliteMonsterCount = 0;
    this.loadProgress();
    this.regionStartPlayerLevel = this.player.level;
    if (!isRegionPointPlayable(this.region, this.player.x, this.player.y, this.player.radius)) {
      this.placePlayerAtRegionStart();
    }
    this.pointer.worldX = this.player.x;
    this.pointer.worldY = this.player.y;
    this.snapshotTimer = 0;
    this.autosaveTimer = AUTOSAVE_INTERVAL_SECONDS;
    this.ambientTimer = 0;
    this.atlas = null;
    this.animationSheets = null;

    this.resize = this.resize.bind(this);
    this.loop = this.loop.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerLeave = this.handlePointerLeave.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
  }

  createPlayer() {
    return {
      id: createId(),
      x: this.region.start.x,
      y: this.region.start.y,
      radius: 0.28,
      target: null,
      attackTargetId: null,
      facingX: 1,
      facingY: 0,
      level: 1,
      xp: 0,
      gold: 0,
      hp: 120,
      mana: 64,
      attackCooldown: 0,
      spellCooldown: 0,
      hurtCooldown: 0,
      attackAnim: 0,
      castAnim: 0,
      moving: false,
      gait: 0,
      moveSpeed: 0,
      deadTimer: 0,
      inventory: [makeItem(1, 0.82), makeItem(1, 0.18)],
      equipment: createEquipment(),
    };
  }

  start() {
    this.resize();
    this.ensureWorldAroundPlayer();
    this.publishSnapshot();
    window.addEventListener("resize", this.resize);
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("pointerup", this.handlePointerUp);
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("pointerleave", this.handlePointerLeave);
    this.canvas.addEventListener("contextmenu", preventDefault);
    loadGeneratedAtlas()
      .then((atlas) => {
        this.atlas = atlas;
        for (const chunk of this.chunks.values()) {
          chunk.terrainLayer = null;
        }
      })
      .catch((error) => console.error("Atlas load failed", error));
    loadAnimationSheets()
      .then((sheets) => {
        this.animationSheets = sheets;
      })
      .catch((error) => console.error("Animation sheet load failed", error));
    this.raf = requestAnimationFrame(this.loop);
  }

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
  }

  resize() {
    this.dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    this.width = Math.max(360, window.innerWidth);
    this.height = Math.max(360, window.innerHeight);
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.updateCamera(1);
  }

  loop(now) {
    const dt = Math.min(0.034, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.frame += 1;
    this.update(dt);
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  }

  update(dt) {
    this.time += dt;
    this.ensureWorldAroundPlayer();
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
      this.updateChests(dt);
      this.updateMonsters(dt, stats);
      this.updateProjectiles(dt);
      this.updateLoot(dt);
    }

    this.updateEffects(dt);
    this.updateAmbient(dt);
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
  }

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
  }

  updateCamera(dt) {
    const playerIso = worldToIso(this.player.x, this.player.y, 0);
    this.camera.targetOffsetX = this.width / 2 - playerIso.x;
    this.camera.targetOffsetY = this.height / 2 - playerIso.y + 72;
    const t = 1 - Math.pow(0.001, dt);
    this.camera.offsetX = lerp(this.camera.offsetX, this.camera.targetOffsetX, t);
    this.camera.offsetY = lerp(this.camera.offsetY, this.camera.targetOffsetY, t);
    this.camera.shake = Math.max(0, this.camera.shake - dt * 16);
  }

  updatePlayer(dt, stats) {
    const input = this.readMovementInput();
    const beforeX = this.player.x;
    const beforeY = this.player.y;
    let moved = false;
    if (input.x || input.y) {
      this.moveEntity(this.player, input.x * stats.speed * dt, input.y * stats.speed * dt);
      this.player.target = null;
      this.setFacing(input.x, input.y);
      moved = true;
    } else if (this.player.target) {
      const dx = this.player.target.x - this.player.x;
      const dy = this.player.target.y - this.player.y;
      const n = normalize(dx, dy);
      if (Math.hypot(dx, dy) > 0.08) {
        this.moveEntity(this.player, n.x * stats.speed * dt, n.y * stats.speed * dt);
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
    if (moved && Math.random() < 0.18) this.addDust(this.player.x, this.player.y, 1);

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

    if (this.pointer.down && this.player.attackCooldown <= 0) {
      const pointedMonster = this.monsterAtScreen(this.pointer.x, this.pointer.y);
      if (pointedMonster) {
        this.player.attackTargetId = pointedMonster.id;
        if (distance(this.player, pointedMonster) <= stats.range + pointedMonster.radius) {
          this.primaryAttack(pointedMonster);
        }
      }
    }
  }

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
  }

  setFacing(x, y) {
    const n = normalize(x, y);
    this.player.facingX = n.x || this.player.facingX;
    this.player.facingY = n.y || this.player.facingY;
  }

  updateMonsters(dt) {
    for (const monster of this.nearbyMonsters(2)) {
      if (monster.dead) continue;
      this.scaleMonsterToHeroLevel(monster);
      monster.attackCooldown = Math.max(0, monster.attackCooldown - dt);
      monster.attackAnim = Math.max(0, monster.attackAnim - dt);
      monster.hurt = Math.max(0, monster.hurt - dt);
      const beforeX = monster.x;
      const beforeY = monster.y;
      const d = distance(this.player, monster);
      if (d < monster.aggro) {
        const n = normalize(this.player.x - monster.x, this.player.y - monster.y);
        monster.facingX = n.x || monster.facingX;
        monster.facingY = n.y || monster.facingY;
        if (d > monster.range + this.player.radius) {
          this.moveEntity(monster, n.x * monster.speed * dt, n.y * monster.speed * dt);
        } else if (monster.attackCooldown <= 0) {
          monster.attackCooldown = 0.85 + Math.random() * 0.6;
          monster.attackAnim = 0.24;
          this.damagePlayer(monster.damage, monster);
        }
      } else if (Math.random() < 0.004) {
        const a = Math.random() * Math.PI * 2;
        monster.vx = Math.cos(a) * monster.speed * 0.28;
        monster.vy = Math.sin(a) * monster.speed * 0.28;
      }

      if (Math.hypot(monster.vx, monster.vy) > 0.01) {
        const n = normalize(monster.vx, monster.vy);
        monster.facingX = n.x || monster.facingX;
        monster.facingY = n.y || monster.facingY;
        this.moveEntity(monster, monster.vx * dt, monster.vy * dt);
        monster.vx *= Math.pow(0.04, dt);
        monster.vy *= Math.pow(0.04, dt);
      }
      monster.moving = Math.hypot(monster.x - beforeX, monster.y - beforeY) > 0.002;
      const rawSpeed = dt > 0 ? Math.hypot(monster.x - beforeX, monster.y - beforeY) / dt : 0;
      monster.moveSpeed = lerp(monster.moveSpeed || 0, rawSpeed, monster.moving ? 0.42 : 0.15);
      if (monster.moveSpeed > 0.02) monster.gait += dt * (6.4 + monster.moveSpeed * 2.1);
      if (monster.moving && Math.random() < 0.035) this.addDust(monster.x, monster.y, 1);
    }
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = this.projectiles[i];
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      projectile.life -= dt;
      this.addParticles(projectile.x, projectile.y, projectile.color, projectile.type === "burst" ? 1 : 0, 0.04);

      let remove = projectile.life <= 0 || this.isBlocked(projectile.x, projectile.y, 0.12);
      if (!remove) {
        for (const monster of this.nearbyMonsters(2)) {
          if (monster.dead) continue;
          if (Math.hypot(monster.x - projectile.x, monster.y - projectile.y) <= monster.radius + projectile.radius) {
            if (projectile.splash) {
              for (const other of this.nearbyMonsters(2)) {
                if (!other.dead && Math.hypot(other.x - projectile.x, other.y - projectile.y) <= projectile.splash + other.radius) {
                  this.damageMonster(other, projectile.damage * (other === monster ? 1 : 0.62), "magic");
                }
              }
              this.addParticles(projectile.x, projectile.y, projectile.color, 26, 0.08);
            } else {
              this.damageMonster(monster, projectile.damage, projectile.type);
              this.addParticles(monster.x, monster.y, projectile.color, 9, 0.08);
            }
            remove = true;
            break;
          }
        }
      }
      if (remove) this.projectiles.splice(i, 1);
    }
  }

  updateLoot(dt) {
    for (let i = this.loots.length - 1; i >= 0; i -= 1) {
      const loot = this.loots[i];
      loot.bob += dt * 4.5;
      loot.pickupDelay = Math.max(0, (loot.pickupDelay ?? 0) - dt);
      if (loot.pickupDelay > 0) continue;
      if (distance(this.player, loot) < 0.62) {
        if (loot.type === "gold") {
          this.player.gold += loot.amount;
          this.addFloater(loot.x, loot.y, `+${loot.amount} g`, "#f1c657");
          this.loots.splice(i, 1);
        } else if (this.addInventoryItem(loot.item)) {
          this.addFloater(loot.x, loot.y, loot.item.name, loot.item.rarityColor, 1.05);
          this.addToast(loot.item.name);
          this.loots.splice(i, 1);
          this.publishSnapshot();
        } else if (!loot.warned) {
          loot.warned = true;
          this.addToast("Rygsaekken er fuld");
        }
      }
    }
  }

  updateChests(dt) {
    const animationSeconds = 6 / 6;
    for (const chunk of this.nearbyChunks(1)) {
      for (let i = chunk.objects.length - 1; i >= 0; i -= 1) {
        const object = chunk.objects[i];
        if (object.type !== "chest") continue;

        if (object.opening) {
          object.openTime = (object.openTime ?? 0) + dt;
          if (object.openTime >= animationSeconds) {
            this.dropChestLoot(object);
            this.region.chestOpened = true;
            chunk.objects.splice(i, 1);
          }
          continue;
        }

        if (distance(this.player, object) <= this.player.radius + object.radius + 0.45) {
          object.opening = true;
          object.openTime = 0;
          object.blocking = false;
          this.player.target = null;
        }
      }
    }
  }

  dropChestLoot(chest) {
    let item = rollUniqueItem(Math.max(1, this.player.level), {
      source: "chest",
      biomeId: this.region.biomeId,
      chance: 0.08,
    }) ?? rollNamedItem(Math.max(1, this.player.level), {
      source: "chest",
      biomeId: this.region.biomeId,
      chanceMult: 3,
    });

    for (let i = 0; i < 12; i += 1) {
      if (item) break;
      const candidate = makeItem(Math.max(1, this.player.level), Math.random());
      if (candidate.rarity !== "poor") {
        item = candidate;
        break;
      }
      item = candidate;
    }

    if (item?.rarity === "poor") {
      const poorPrefix = PREFIXES.poor.find((prefix) => item.name.startsWith(`${prefix} `));
      if (poorPrefix) {
        item.name = item.name.replace(`${poorPrefix} `, `${PREFIXES.normal[Math.floor(Math.random() * PREFIXES.normal.length)]} `);
      }
      item.rarity = "normal";
      item.rarityLabel = "Normal";
      item.rarityColor = "#f5f3ea";
      item.value = itemValue(item);
    }

    this.loots.push({
      id: createId(),
      type: "item",
      item,
      x: chest.x + 0.16,
      y: chest.y - 0.16,
      bob: Math.random() * Math.PI * 2,
      pickupDelay: 0.35,
    });
    this.addParticles(chest.x, chest.y, "#ffd85d", 18, 0.12);
    this.addFloater(chest.x, chest.y, item.name, item.rarityColor, 1.05);
  }

  updateEffects(dt) {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vx *= Math.pow(0.04, dt);
      p.vy *= Math.pow(0.04, dt);
      p.vz -= 2.8 * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.floaters.length - 1; i >= 0; i -= 1) {
      const f = this.floaters[i];
      f.z += 34 * dt;
      f.life -= dt;
      if (f.life <= 0) this.floaters.splice(i, 1);
    }

    for (let i = this.toasts.length - 1; i >= 0; i -= 1) {
      this.toasts[i].life -= dt;
      if (this.toasts[i].life <= 0) this.toasts.splice(i, 1);
    }
  }

  updateAmbient(dt) {
    this.ambientTimer -= dt;
    if (this.ambientTimer > 0) return;
    this.ambientTimer = 0.08;
    const chunk = this.currentChunk();
    if (Math.random() > 0.45) return;

    const angle = Math.random() * Math.PI * 2;
    const radius = 3 + Math.random() * 8;
    const x = this.player.x + Math.cos(angle) * radius;
    const y = this.player.y + Math.sin(angle) * radius;
    const cold = chunk.biome.id === "snow";
    const hot = chunk.biome.id === "lava";
    const jungle = chunk.biome.id === "jungle";
    const color = cold
      ? "rgba(170, 226, 255, 0.34)"
      : hot
        ? "rgba(255, 105, 42, 0.34)"
        : jungle
          ? "rgba(112, 210, 90, 0.28)"
          : "rgba(214, 184, 94, 0.28)";
    this.particles.push({
      x,
      y,
      z: 28 + Math.random() * 70,
      vx: (Math.random() - 0.5) * (cold ? 0.25 : 0.45),
      vy: (Math.random() - 0.5) * (cold ? 0.25 : 0.45),
      vz: cold ? Math.random() * 0.25 : 0.1 + Math.random() * 0.45,
      r: cold || hot ? 1.5 + Math.random() * 2.5 : 1 + Math.random() * 2,
      color,
      life: 1.2 + Math.random() * 1.8,
    });
  }

  moveEntity(entity, dx, dy) {
    if (dx && !this.isBlocked(entity.x + dx, entity.y, entity.radius)) entity.x += dx;
    if (dy && !this.isBlocked(entity.x, entity.y + dy, entity.radius)) entity.y += dy;
  }

  isBlocked(x, y, radius) {
    if (!isRegionPointPlayable(this.region, x, y, radius)) return true;
    const { cx, cy } = chunkCoords(x, y);
    for (let yy = cy - 1; yy <= cy + 1; yy += 1) {
      for (let xx = cx - 1; xx <= cx + 1; xx += 1) {
        const chunk = this.getChunk(xx, yy);
        for (const object of chunk.objects) {
          if (object.blocking && Math.hypot(object.x - x, object.y - y) < object.radius + radius) return true;
        }
      }
    }
    return false;
  }

  updateRegionExit(dt) {
    this.exitPromptCooldown = Math.max(0, this.exitPromptCooldown - dt);
    if (this.exitPromptOpen || this.exitPromptCooldown > 0) return;
    if (distance(this.player, this.region.end) < 0.78) {
      this.exitPromptOpen = true;
      this.player.target = null;
      this.publishSnapshot();
    }
  }

  dismissExitPrompt() {
    this.exitPromptOpen = false;
    this.exitPromptCooldown = 1.2;
    this.publishSnapshot();
  }

  travelToNextRegion() {
    this.regionIndex += 1;
    this.region = createRegion(this.regionIndex);
    this.chunks.clear();
    this.monsters.clear();
    this.loots = [];
    this.projectiles = [];
    this.particles = [];
    this.floaters = [];
    this.hoverMonsterId = null;
    this.regionStartPlayerLevel = this.player.level;
    this.eliteMonsterCount = 0;
    this.exitPromptOpen = false;
    this.exitPromptCooldown = 0;
    this.placePlayerAtRegionStart();
    this.ensureWorldAroundPlayer();
    this.addToast(`Rejst til ${this.region.biome.name}`);
    this.publishSnapshot();
  }

  placePlayerAtRegionStart() {
    this.player.x = this.region.start.x;
    this.player.y = this.region.start.y;
    this.player.target = null;
    this.player.attackTargetId = null;
    this.pointer.worldX = this.player.x;
    this.pointer.worldY = this.player.y;
    this.updateCamera(1);
  }

  primaryAttack(target = null) {
    const stats = this.calcStats();
    target = target || this.nearestMonster(stats.range + 0.5);
    if (!target || target.dead) return;
    const d = distance(this.player, target);
    if (d > stats.range + target.radius) return;

    const n = normalize(target.x - this.player.x, target.y - this.player.y);
    this.setFacing(n.x, n.y);
    this.player.attackCooldown = stats.cooldown;
    this.player.attackAnim = 0.24;

    if (stats.mode === "melee") {
      const damage = this.rollDamage(stats.damageMin, stats.damageMax);
      this.damageMonster(target, damage, "melee");
      this.addParticles(target.x, target.y, "#f1d08d", 14, 0.1);
      this.camera.shake = Math.max(this.camera.shake, 3);
      return;
    }

    const speed = stats.mode === "magic" ? 9.6 : 11.8;
    const color = stats.mode === "magic" ? "#8bdfff" : "#e4c27a";
    this.projectiles.push({
      id: createId(),
      type: stats.mode,
      x: this.player.x + n.x * 0.42,
      y: this.player.y + n.y * 0.42,
      vx: n.x * speed,
      vy: n.y * speed,
      radius: stats.mode === "magic" ? 0.18 : 0.1,
      damage: this.rollDamage(stats.damageMin, stats.damageMax) + (stats.mode === "magic" ? Math.floor(stats.magic * 0.45) : 0),
      life: stats.range / speed,
      color,
    });
  }

  castSpellAt(x, y) {
    const stats = this.calcStats();
    if (this.player.mana < 18 || this.player.spellCooldown > 0 || this.player.hp <= 0) return;
    const n = normalize(x - this.player.x, y - this.player.y);
    if (!n.x && !n.y) return;
    this.player.mana -= 18;
    this.player.spellCooldown = 1.05;
    this.player.castAnim = 0.38;
    this.setFacing(n.x, n.y);
    this.projectiles.push({
      id: createId(),
      type: "burst",
      x: this.player.x + n.x * 0.5,
      y: this.player.y + n.y * 0.5,
      vx: n.x * 8.7,
      vy: n.y * 8.7,
      radius: 0.24,
      damage: this.rollDamage(stats.damageMin, stats.damageMax) + stats.magic * 2,
      life: 0.58,
      color: "#9de9ff",
      splash: 1.35,
    });
    this.addParticles(this.player.x, this.player.y, "#8bdfff", 16, 0.08);
  }

  damagePlayer(amount, source) {
    const stats = this.calcStats();
    const mitigated = Math.max(1, Math.floor(amount * (100 / (100 + stats.armor * 7))));
    this.player.hp = Math.max(0, this.player.hp - mitigated);
    this.player.hurtCooldown = 0.2;
    this.camera.shake = Math.max(this.camera.shake, 4);
    this.addFloater(this.player.x, this.player.y, `-${mitigated}`, "#ff7272");
    this.addParticles(this.player.x, this.player.y, "#cc3c3c", 9, 0.1);
    if (this.player.hp <= 0) {
      this.addToast(`Faldt mod ${source.typeName}`);
    }
  }

  damageMonster(monster, amount, sourceType) {
    const damage = Math.max(1, Math.floor(amount));
    monster.hp = Math.max(0, monster.hp - damage);
    monster.hurt = 0.18;
    this.addFloater(monster.x, monster.y, `-${damage}`, sourceType === "magic" ? "#9de9ff" : "#f1d08d");
    if (monster.hp <= 0) this.killMonster(monster);
  }

  killMonster(monster) {
    if (monster.dead) return;
    monster.dead = true;
    this.player.xp += monster.xp;
    this.addFloater(monster.x, monster.y, `+${monster.xp} xp`, "#e0aa3f", 0.95);
    this.addParticles(monster.x, monster.y, monster.color, 24, 0.16);
    this.dropLoot(monster);
    this.levelUpIfNeeded();
  }

  dropLoot(monster) {
    const profile = monsterLootProfile(monster.typeName);
    const lootLevel = monster.lootLevel ?? monster.level;
    if (Math.random() < profile.goldChance) {
      const gold = Math.floor((4 + Math.random() * 9) * (1 + lootLevel * 0.28) * profile.goldMult);
      this.loots.push({
        id: createId(),
        type: "gold",
        amount: gold,
        x: monster.x + (Math.random() - 0.5) * 0.5,
        y: monster.y + (Math.random() - 0.5) * 0.5,
        bob: Math.random() * Math.PI * 2,
      });
    }

    const unique = rollUniqueItem(lootLevel, {
      source: "monster",
      biomeId: this.region.biomeId,
      chance: 0.0015,
    });
    if (unique) {
      this.loots.push({
        id: createId(),
        type: "item",
        item: unique,
        x: monster.x + (Math.random() - 0.5) * 0.7,
        y: monster.y + (Math.random() - 0.5) * 0.7,
        bob: Math.random() * Math.PI * 2,
      });
    }

    const named = rollNamedItem(lootLevel, {
      source: "monster",
      biomeId: this.region.biomeId,
      chanceMult: namedItemChanceMultiplier(monster),
    });
    if (named) {
      this.loots.push({
        id: createId(),
        type: "item",
        item: named,
        x: monster.x + (Math.random() - 0.5) * 0.7,
        y: monster.y + (Math.random() - 0.5) * 0.7,
        bob: Math.random() * Math.PI * 2,
      });
    }

    const category = rollLootCategory(profile.weights);
    if (!category || category === "none") return;

    const item = category === "health" || category === "mana"
      ? makePotion(category, lootLevel)
      : makeItem(lootLevel, category === "weapon" ? 0.1 : category === "armor" ? 0.9 : Math.random());
    this.loots.push({
      id: createId(),
      type: "item",
      item,
      x: monster.x + (Math.random() - 0.5) * 0.7,
      y: monster.y + (Math.random() - 0.5) * 0.7,
      bob: Math.random() * Math.PI * 2,
    });

    if (category === "all" && Math.random() < clamp(0.08 + monster.level * 0.01, 0.08, 0.24)) {
      const potion = makePotion(Math.random() < 0.5 ? "health" : "mana", lootLevel);
      this.loots.push({
        id: createId(),
        type: "item",
        item: potion,
        x: monster.x + (Math.random() - 0.5) * 0.85,
        y: monster.y + (Math.random() - 0.5) * 0.85,
        bob: Math.random() * Math.PI * 2,
      });
    }
  }

  levelUpIfNeeded() {
    let needed = this.xpForNextLevel();
    while (this.player.xp >= needed) {
      this.player.xp -= needed;
      this.player.level += 1;
      const stats = this.calcStats();
      this.player.hp = stats.maxHp;
      this.player.mana = stats.maxMana;
      this.addFloater(this.player.x, this.player.y, `Level ${this.player.level}`, "#f4da96", 1.2);
      this.addToast(`Level ${this.player.level}`);
      needed = this.xpForNextLevel();
    }
    this.publishSnapshot();
  }

  equipItem(index) {
    const item = this.player.inventory[index];
    if (!item) return;
    if (item.mode === "potion") {
      this.usePotion(item.potionType, index);
      return;
    }
    let slotId = item.slot;
    if (slotId === "ring") {
      slotId = !this.player.equipment.ring1 ? "ring1" : !this.player.equipment.ring2 ? "ring2" : "ring1";
    }

    const old = this.player.equipment[slotId];
    this.player.equipment[slotId] = item;
    this.player.inventory.splice(index, 1);
    if (old) this.addInventoryItem(old);

    const stats = this.calcStats();
    this.player.hp = clamp(this.player.hp, 1, stats.maxHp);
    this.player.mana = clamp(this.player.mana, 0, stats.maxMana);
    this.addToast(`Udstyret: ${item.name}`);
    this.publishSnapshot();
  }

  usePotion(type, preferredIndex = -1) {
    if (this.potionCooldown > 0) return;
    const index = preferredIndex >= 0
      ? preferredIndex
      : this.player.inventory.findIndex((item) => item.mode === "potion" && item.potionType === type);
    const item = this.player.inventory[index];
    if (!item || item.mode !== "potion" || item.potionType !== type) return;

    const stats = this.calcStats();
    const pct = Number(item.restorePct) || 0.25;
    if (type === "health") {
      this.player.hp = clamp(this.player.hp + stats.maxHp * pct, 0, stats.maxHp);
      this.addFloater(this.player.x, this.player.y, `+${Math.floor(stats.maxHp * pct)} liv`, "#58d96d", 0.95);
    } else {
      this.player.mana = clamp(this.player.mana + stats.maxMana * pct, 0, stats.maxMana);
      this.addFloater(this.player.x, this.player.y, `+${Math.floor(stats.maxMana * pct)} mana`, "#58bfff", 0.95);
    }
    item.count = Math.max(0, Math.floor(Number(item.count) || 1) - 1);
    if (item.count <= 0) this.player.inventory.splice(index, 1);
    this.potionCooldown = 0.5;
    this.publishSnapshot();
  }

  dropInventoryItem(index) {
    const item = this.player.inventory[index];
    if (!item) return;
    this.player.inventory.splice(index, 1);
    this.loots.push({
      id: createId(),
      type: "item",
      item,
      x: this.player.x + this.player.facingX * 0.75 + (Math.random() - 0.5) * 0.22,
      y: this.player.y + this.player.facingY * 0.75 + (Math.random() - 0.5) * 0.22,
      bob: Math.random() * Math.PI * 2,
      pickupDelay: 0.9,
    });
    this.addToast(`Droppet: ${item.name}`);
    this.publishSnapshot();
  }

  destroyInventoryItem(index, force = false) {
    const item = this.player.inventory[index];
    if (!item) return;
    if (item.rarity === "legendary" && !force) {
      this.addToast("Bekraeft destroy af roedt udstyr");
      return;
    }
    this.player.inventory.splice(index, 1);
    this.addToast(`Destrueret: ${item.name}`);
    this.publishSnapshot();
  }

  mergeInventoryItem(index) {
    const item = this.player.inventory[index];
    if (!item) return;
    const currentRarityIndex = RARITIES.findIndex((rarity) => rarity.id === item.rarity);
    const nextRarity = RARITIES[currentRarityIndex + 1];
    if (currentRarityIndex < 0 || !nextRarity) {
      this.addToast("Kan ikke merges hoejere");
      return;
    }

    const matches = [];
    for (let i = 0; i < this.player.inventory.length; i += 1) {
      if (itemsCanMerge(item, this.player.inventory[i])) matches.push(i);
      if (matches.length >= 3) break;
    }

    if (matches.length < 3) {
      this.addToast("Kraever 3 ens items");
      return;
    }

    const merged = this.makeMergedItem(matches.map((matchIndex) => this.player.inventory[matchIndex]), nextRarity);
    for (const matchIndex of matches.slice().sort((a, b) => b - a)) {
      this.player.inventory.splice(matchIndex, 1);
    }
    this.player.inventory.push(merged);
    this.addToast(`Merged: ${merged.name}`);
    this.publishSnapshot();
  }

  makeMergedItem(items, rarity) {
    const base = items[0];
    const currentRarity = RARITIES.find((entry) => entry.id === base.rarity) ?? RARITIES[1];
    const ratio = rarity.mult / currentRarity.mult;
    const prefix = PREFIXES[rarity.id]?.[0] ?? rarity.label;
  const merged = {
    ...base,
    id: createId(),
    name: `${prefix} ${base.baseName}`,
    level: Math.max(...items.map((item) => Math.max(1, Math.floor(Number(item.level) || 1)))),
    rarity: rarity.id,
    rarityLabel: rarity.label,
    rarityColor: rarity.color,
      damageMin: Math.max(base.damageMin ? base.damageMin + 1 : 0, Math.floor((base.damageMin || 0) * ratio)),
      damageMax: Math.max(base.damageMax ? base.damageMax + 1 : 0, Math.floor((base.damageMax || 0) * ratio)),
      armor: Math.floor((base.armor || 0) * ratio),
      maxHp: Math.floor((base.maxHp || 0) * ratio),
      maxMana: Math.floor((base.maxMana || 0) * ratio),
      speed: Number(((base.speed || 0) * Math.min(1.8, ratio)).toFixed(2)),
      magic: Math.floor((base.magic || 0) * ratio),
      range: Number((base.range || 0).toFixed(2)),
      cooldown: base.cooldown ? Math.max(0.28, Number((base.cooldown * 0.97).toFixed(2))) : 0,
    };
    merged.value = itemValue(merged);
    return merged;
  }

  addInventoryItem(item) {
    if (!item) return false;
    if (item.mode === "potion") {
      let remaining = Math.max(1, Math.floor(Number(item.count) || 1));
      for (const stack of this.player.inventory) {
        if (stack.mode !== "potion" || stack.potionType !== item.potionType) continue;
        const current = Math.max(1, Math.floor(Number(stack.count) || 1));
        const room = MAX_POTION_STACK - current;
        if (room <= 0) continue;
        const moved = Math.min(room, remaining);
        stack.count = current + moved;
        remaining -= moved;
        if (remaining <= 0) return true;
      }
      while (remaining > 0) {
        if (this.player.inventory.length >= MAX_INVENTORY) {
          item.count = remaining;
          return false;
        }
        const count = Math.min(MAX_POTION_STACK, remaining);
        this.player.inventory.push({ ...item, id: createId(), count });
        remaining -= count;
      }
      return true;
    }
    if (this.player.inventory.length >= MAX_INVENTORY) return false;
    this.player.inventory.push(item);
    return true;
  }

  compactPotionStacks() {
    const equipment = this.player.inventory.filter((item) => item.mode !== "potion");
    const potions = this.player.inventory.filter((item) => item.mode === "potion");
    this.player.inventory = equipment;
    for (const potion of potions) {
      this.addInventoryItem(potion);
    }
  }

  rollDamage(min, max) {
    return Math.floor(min + Math.random() * (max - min + 1));
  }

  calcStats() {
    const stats = {
      maxHp: 112 + this.player.level * 8,
      maxMana: 60 + this.player.level * 5,
      armor: 0,
      damageMin: 5 + this.player.level,
      damageMax: 9 + this.player.level * 2,
      range: 1.15,
      cooldown: 0.58,
      speed: 3.45,
      magic: 5 + this.player.level * 2,
      mode: "melee",
    };

    for (const item of Object.values(this.player.equipment)) {
      if (!item) continue;
      stats.armor += item.armor || 0;
      stats.maxHp += item.maxHp || 0;
      stats.maxMana += item.maxMana || 0;
      stats.speed += item.speed || 0;
      stats.magic += item.magic || 0;
      if (item.slot === "weapon") {
        stats.damageMin += item.damageMin || 0;
        stats.damageMax += item.damageMax || 0;
        stats.range = item.range || stats.range;
        stats.cooldown = item.cooldown || stats.cooldown;
        stats.mode = item.mode || stats.mode;
      } else {
        stats.damageMin += item.damageMin || 0;
        stats.damageMax += item.damageMax || 0;
      }
    }

    stats.maxHp = Math.floor(stats.maxHp);
    stats.maxMana = Math.floor(stats.maxMana);
    stats.damageMin = Math.max(1, Math.floor(stats.damageMin));
    stats.damageMax = Math.max(stats.damageMin + 1, Math.floor(stats.damageMax));
    return stats;
  }

  xpForNextLevel() {
    return Math.floor(80 + this.player.level * this.player.level * 42);
  }

  nearestMonster(maxRange) {
    let best = null;
    let bestD = maxRange;
    for (const monster of this.nearbyMonsters(2)) {
      if (monster.dead) continue;
      const d = distance(this.player, monster);
      if (d < bestD) {
        best = monster;
        bestD = d;
      }
    }
    return best;
  }

  monsterAtScreen(x, y) {
    let best = null;
    let bestD = 999;
    for (const monster of this.nearbyMonsters(2)) {
      if (monster.dead) continue;
      const screen = worldToScreen(monster.x, monster.y, 0, this.camera);
      const d = Math.hypot(screen.x - x, screen.y - 30 - y);
      if (d < 34 + monster.radius * 28 && d < bestD) {
        best = monster;
        bestD = d;
      }
    }
    return best;
  }

  addParticles(x, y, color, count, upward = 0.08) {
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2.4;
      this.particles.push({
        x,
        y,
        z: 10 + Math.random() * 18,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        vz: upward * 90 + Math.random() * 1.6,
        r: 2 + Math.random() * 3,
        color,
        life: 0.25 + Math.random() * 0.6,
      });
    }
  }

  addDust(x, y, count = 1) {
    for (let i = 0; i < count; i += 1) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.35,
        y: y + (Math.random() - 0.5) * 0.35,
        z: 5 + Math.random() * 5,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        vz: 0.35 + Math.random() * 0.4,
        r: 2 + Math.random() * 4,
        color: "rgba(174, 148, 105, 0.55)",
        life: 0.32 + Math.random() * 0.28,
      });
    }
  }

  addFloater(x, y, text, color, life = 0.85) {
    this.floaters.push({ x, y, z: 68, text, color, life, maxLife: life });
  }

  addToast(text) {
    this.toasts.push({ id: createId(), text, life: 2.25 });
    if (this.toasts.length > 4) this.toasts.shift();
    this.publishSnapshot();
  }

  readSavePayload() {
    try {
      const raw = localStorage.getItem(SAVE_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== SAVE_VERSION) return null;
      if (parsed.seed !== WORLD_SEED) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  normalizeSavedItem(item) {
    if (!item || typeof item !== "object") return null;
    const id = Number(item.id);
    if (!Number.isFinite(id)) return null;
    const normalized = {
      id,
      name: String(item.name ?? "Unknown"),
      baseName: String(item.baseName ?? item.name ?? "Unknown"),
      rarity: String(item.rarity ?? "normal"),
      rarityLabel: String(item.rarityLabel ?? "Normal"),
      rarityColor: String(item.rarityColor ?? "#f5f3ea"),
      unique: Boolean(item.unique),
      uniqueId: item.uniqueId ? String(item.uniqueId) : undefined,
      named: Boolean(item.named),
      namedId: item.namedId ? String(item.namedId) : undefined,
      iconUrl: item.iconUrl ? String(item.iconUrl) : undefined,
      slot: String(item.slot ?? "weapon"),
      mode: String(item.mode ?? "melee"),
      level: Math.max(1, Math.floor(Number(item.level) || 1)),
      damageMin: Math.floor(Number(item.damageMin) || 0),
      damageMax: Math.floor(Number(item.damageMax) || 0),
      range: Number(item.range) || 0,
      cooldown: Number(item.cooldown) || 0,
      armor: Math.floor(Number(item.armor) || 0),
      maxHp: Math.floor(Number(item.maxHp) || 0),
      maxMana: Math.floor(Number(item.maxMana) || 0),
      speed: Number(item.speed) || 0,
      magic: Math.floor(Number(item.magic) || 0),
      potionType: item.potionType ? String(item.potionType) : undefined,
      restorePct: Number(item.restorePct) || undefined,
      count: item.mode === "potion" ? clamp(Math.floor(Number(item.count) || 1), 1, MAX_POTION_STACK) : undefined,
    };
    normalized.value = Math.max(1, Math.floor(Number(item.value) || itemValue(normalized)));
    return normalized;
  }

  loadProgress() {
    const payload = this.readSavePayload();
    if (!payload) return;

    const savedPlayer = payload.player;
    if (!savedPlayer || typeof savedPlayer !== "object") return;

    this.player.x = Number.isFinite(Number(savedPlayer.x)) ? Number(savedPlayer.x) : this.region.start.x;
    this.player.y = Number.isFinite(Number(savedPlayer.y)) ? Number(savedPlayer.y) : this.region.start.y;
    this.player.facingX = Number.isFinite(Number(savedPlayer.facingX)) ? Number(savedPlayer.facingX) : this.player.facingX;
    this.player.facingY = Number.isFinite(Number(savedPlayer.facingY)) ? Number(savedPlayer.facingY) : this.player.facingY;
    this.player.level = Math.max(1, Math.floor(Number(savedPlayer.level) || this.player.level));
    this.player.xp = Math.max(0, Math.floor(Number(savedPlayer.xp) || 0));
    this.player.gold = Math.max(0, Math.floor(Number(savedPlayer.gold) || 0));
    this.player.hp = Math.max(0, Number(savedPlayer.hp) || this.player.hp);
    this.player.mana = Math.max(0, Number(savedPlayer.mana) || this.player.mana);
    this.player.attackCooldown = Math.max(0, Number(savedPlayer.attackCooldown) || 0);
    this.player.spellCooldown = Math.max(0, Number(savedPlayer.spellCooldown) || 0);
    this.player.hurtCooldown = Math.max(0, Number(savedPlayer.hurtCooldown) || 0);
    this.player.attackAnim = Math.max(0, Number(savedPlayer.attackAnim) || 0);
    this.player.castAnim = Math.max(0, Number(savedPlayer.castAnim) || 0);
    this.player.gait = Number(savedPlayer.gait) || 0;
    this.player.moveSpeed = Math.max(0, Number(savedPlayer.moveSpeed) || 0);
    this.player.deadTimer = Math.max(0, Number(savedPlayer.deadTimer) || 0);
    this.player.moving = false;
    this.player.target = null;
    this.player.attackTargetId = null;

    if (Array.isArray(savedPlayer.inventory)) {
      this.player.inventory = savedPlayer.inventory
        .map((item) => this.normalizeSavedItem(item))
        .filter(Boolean)
        .slice(0, MAX_INVENTORY);
      this.compactPotionStacks();
    }

    const nextEquipment = createEquipment();
    const savedEquipment = savedPlayer.equipment;
    if (savedEquipment && typeof savedEquipment === "object") {
      for (const slot of EQUIPMENT_SLOTS) {
        const normalized = this.normalizeSavedItem(savedEquipment[slot.id]);
        nextEquipment[slot.id] = normalized || nextEquipment[slot.id] || null;
      }
    }
    this.player.equipment = nextEquipment;

    if (Array.isArray(payload.loots)) {
      this.loots = [];
    }

    let maxSeenId = Math.floor(Number(this.player.id) || 0);
    for (const item of this.player.inventory) {
      maxSeenId = Math.max(maxSeenId, Math.floor(Number(item.id) || 0));
    }
    for (const item of Object.values(this.player.equipment)) {
      if (!item) continue;
      maxSeenId = Math.max(maxSeenId, Math.floor(Number(item.id) || 0));
    }
    for (const loot of this.loots) {
      maxSeenId = Math.max(maxSeenId, Math.floor(Number(loot.id) || 0));
      if (loot.type === "item" && loot.item) {
        maxSeenId = Math.max(maxSeenId, Math.floor(Number(loot.item.id) || 0));
      }
    }
    if (maxSeenId > 0) ensureNextId(maxSeenId);

    this.addToast("Progression indlaest");
  }

  saveProgress() {
    const payload = {
      version: SAVE_VERSION,
      seed: WORLD_SEED,
      savedAt: Date.now(),
      player: {
        id: this.player.id,
        x: this.player.x,
        y: this.player.y,
        facingX: this.player.facingX,
        facingY: this.player.facingY,
        level: this.player.level,
        xp: this.player.xp,
        gold: this.player.gold,
        hp: this.player.hp,
        mana: this.player.mana,
        attackCooldown: this.player.attackCooldown,
        spellCooldown: this.player.spellCooldown,
        hurtCooldown: this.player.hurtCooldown,
        attackAnim: this.player.attackAnim,
        castAnim: this.player.castAnim,
        gait: this.player.gait,
        moveSpeed: this.player.moveSpeed,
        deadTimer: this.player.deadTimer,
        inventory: this.player.inventory.map((item) => ({ ...item })),
        equipment: Object.fromEntries(
          EQUIPMENT_SLOTS.map((slot) => [slot.id, this.player.equipment[slot.id] ? { ...this.player.equipment[slot.id] } : null]),
        ),
      },
      loots: [],
    };

    try {
      localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore quota or storage-denied errors.
    }
  }

  ensureWorldAroundPlayer() {
    const { cx, cy } = chunkCoords(this.player.x, this.player.y);
    for (let y = cy - 2; y <= cy + 2; y += 1) {
      for (let x = cx - 2; x <= cx + 2; x += 1) {
        this.getChunk(x, y);
      }
    }
  }

  nearbyChunks(range = 2) {
    const chunks = [];
    const { cx, cy } = chunkCoords(this.player.x, this.player.y);
    for (let y = cy - range; y <= cy + range; y += 1) {
      for (let x = cx - range; x <= cx + range; x += 1) {
        chunks.push(this.getChunk(x, y));
      }
    }
    return chunks;
  }

  nearbyMonsters(range = 2) {
    const monsters = [];
    for (const chunk of this.nearbyChunks(range)) {
      monsters.push(...chunk.monsters);
    }
    return monsters;
  }

  getChunk(cx, cy) {
    const key = chunkKey(cx, cy);
    if (!this.chunks.has(key)) {
      const chunk = createChunk(cx, cy, this.region);
      this.chunks.set(key, chunk);
      for (const monster of chunk.monsters) {
        this.scaleMonsterToHeroLevel(monster);
        this.assignEliteVariant(monster);
        this.monsters.set(monster.id, monster);
      }
    }
    return this.chunks.get(key);
  }

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
  }

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
    monster.xp = Math.floor(base.xp * (1 + level * 0.15));
  }

  assignEliteVariant(monster) {
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

  get assetsReady() {
    return this.atlas !== null && this.animationSheets !== null;
  }

  drawLoadingScreen(ctx) {
    ctx.clearRect(0, 0, this.width, this.height);
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, "#0a0d10");
    gradient.addColorStop(1, "#151711");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
    const cx = this.width / 2;
    const cy = this.height / 2;
    const r = 24;
    const t = this.time * 3;
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#c8a35b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, t, t + 1.4);
    ctx.stroke();
    ctx.fillStyle = "rgba(200,163,91,0.85)";
    ctx.font = "600 14px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Loading...", cx, cy + r + 22);
  }

  render() {
    const ctx = this.ctx;
    if (!this.assetsReady) {
      this.drawLoadingScreen(ctx);
      return;
    }
    const shakeX = this.camera.shake ? (Math.random() - 0.5) * this.camera.shake : 0;
    const shakeY = this.camera.shake ? (Math.random() - 0.5) * this.camera.shake : 0;
    ctx.save();
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.translate(shakeX, shakeY);
    this.drawBackdrop(ctx);
    this.drawTiles(ctx);
    this.drawWorldObjects(ctx);
    this.drawParticles(ctx);
    this.drawFloaters(ctx);
    this.drawVignette(ctx);
    ctx.restore();
  }

  drawBackdrop(ctx) {
    const chunk = this.currentChunk();
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, "#0a0d10");
    gradient.addColorStop(1, "#151711");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = chunk.biome.fog;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  drawTiles(ctx) {
    const { cx, cy } = chunkCoords(this.player.x, this.player.y);
    const originX = (CHUNK_SIZE * TILE_W) / 2 + TILE_W / 2;
    const originY = TERRAIN_LAYER_PAD_TOP;
    const layerWidth = CHUNK_SIZE * TILE_W + TILE_W;
    const layerHeight = CHUNK_SIZE * TILE_H + TILE_H + TERRAIN_LAYER_PAD_TOP + TERRAIN_LAYER_PAD_BOTTOM;
    for (let yy = cy - 2; yy <= cy + 2; yy += 1) {
      for (let xx = cx - 2; xx <= cx + 2; xx += 1) {
        const chunk = this.getChunk(xx, yy);
        const origin = worldToScreen(chunk.x, chunk.y, 0, this.camera);
        const x = origin.x - originX;
        const y = origin.y - originY;
        if (x > this.width + 160 || y > this.height + 160 || x + layerWidth < -160 || y + layerHeight < -160) continue;
        const layer = this.getTerrainLayer(chunk);
        ctx.drawImage(layer.canvas, x, y);
      }
    }
  }

  getTerrainLayer(chunk) {
    if (chunk.terrainLayer) return chunk.terrainLayer;

    const originX = (CHUNK_SIZE * TILE_W) / 2 + TILE_W / 2;
    const originY = TERRAIN_LAYER_PAD_TOP;
    const width = CHUNK_SIZE * TILE_W + TILE_W;
    const height = CHUNK_SIZE * TILE_H + TILE_H + TERRAIN_LAYER_PAD_TOP + TERRAIN_LAYER_PAD_BOTTOM;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    const tiles = [...chunk.tiles].sort((a, b) => (a.x + a.y) - (b.x + b.y) || a.x - b.x);
    const biomeByTile = new Map(chunk.tiles.map((tile) => [`${tile.x},${tile.y}`, tile.biomeId]));
    for (const tile of tiles) {
      const tx = tile.x - chunk.x;
      const ty = tile.y - chunk.y;
      const x = originX + (tx - ty) * (TILE_W / 2);
      const y = originY + (tx + ty) * (TILE_H / 2);
      const biome = BIOMES[tile.biomeId] ?? chunk.biome;
      const transitionTile = hasDifferentBiomeNeighbor(tile, biomeByTile);
      drawGroundTile(ctx, this.atlas, tile.biomeId, tile.variant, x, y, {
        baseColor: biome.tile[0],
        baseAlpha: transitionTile ? 0.08 : undefined,
        edgeFeather: transitionTile ? 0.18 : undefined,
        visualScale: transitionTile ? 1.24 : undefined,
        path: tile.path,
        pathColor: biome.path,
      });
    }

    if (chunk.region) {
      drawRegionMarkerIfInChunk(ctx, chunk, chunk.region.start, "start", originX, originY);
      drawRegionMarkerIfInChunk(ctx, chunk, chunk.region.end, "exit", originX, originY);
    }

    for (const decal of chunk.decals) {
      const tx = decal.x - chunk.x;
      const ty = decal.y - chunk.y;
      const x = originX + (tx - ty) * (TILE_W / 2);
      const y = originY + (tx + ty) * (TILE_H / 2) + TILE_H * 0.52;
      drawTerrainDecal(ctx, decal, x, y);
    }

    chunk.terrainLayer = { canvas, originX, originY, width, height };
    return chunk.terrainLayer;
  }

  drawWorldObjects(ctx) {
    const drawables = [];
    for (const chunk of this.nearbyChunks(2)) {
      for (const object of chunk.objects) {
        const screen = worldToScreen(object.x, object.y, 0, this.camera);
        if (visibleScreenPoint(screen, this.width, this.height, 180)) {
          drawables.push({
            type: "object",
            object,
            biome: chunk.biome,
            screen,
            layer: object.type === "foliage" ? 0 : 1,
            depth: object.x + object.y + 0.1,
          });
        }
      }
    }

    for (const loot of this.loots) {
      const screen = worldToScreen(loot.x, loot.y, 0, this.camera);
      if (visibleScreenPoint(screen, this.width, this.height, 130)) {
        drawables.push({ type: "loot", loot, screen, layer: 1, depth: loot.x + loot.y + 0.15 });
      }
    }

    for (const projectile of this.projectiles) {
      const screen = worldToScreen(projectile.x, projectile.y, 0, this.camera);
      if (visibleScreenPoint(screen, this.width, this.height, 130)) {
        drawables.push({ type: "projectile", projectile, screen, layer: 1, depth: projectile.x + projectile.y + 0.2 });
      }
    }

    for (const monster of this.nearbyMonsters(2)) {
      if (monster.dead) continue;
      const screen = worldToScreen(monster.x, monster.y, 0, this.camera);
      if (visibleScreenPoint(screen, this.width, this.height, 170)) {
        drawables.push({ type: "monster", monster, screen, layer: 1, depth: monster.x + monster.y + 0.35 });
      }
    }

    const heroScreen = worldToScreen(this.player.x, this.player.y, 0, this.camera);
    drawables.push({ type: "hero", screen: heroScreen, layer: 1, depth: this.player.x + this.player.y + 0.35 });
    drawables.sort((a, b) => a.layer - b.layer || a.depth - b.depth);

    const stats = this.calcStats();
    for (const item of drawables) {
      if (item.type === "object") {
        const drawn = drawFoliageObject(ctx, item.object, item.screen, item.biome, this.atlas, this.time)
          || drawOverlayObject(ctx, item.object, item.screen, item.biome, this.atlas, this.time);
        if (!drawn) drawObject(ctx, item.object, item.screen, item.biome, this.atlas, this.time);
      }
      if (item.type === "loot") drawLoot(ctx, item.screen, item.loot, this.atlas);
      if (item.type === "projectile") drawProjectile(ctx, item.screen, item.projectile, this.atlas);
      if (item.type === "monster") drawMonster(ctx, item.screen, item.monster, this.atlas, this.time, this.animationSheets);
      if (item.type === "hero") {
        drawHero(ctx, item.screen, {
          hurtCooldown: this.player.hurtCooldown,
          facingX: this.player.facingX,
          facingY: this.player.facingY,
          moving: this.player.moving,
          gait: this.player.gait,
          moveSpeed: this.player.moveSpeed,
          time: this.time,
          attackAnim: this.player.attackAnim,
          castAnim: this.player.castAnim,
          weaponMode: stats.mode,
          weaponColor: stats.mode === "magic" ? "#9de9ff" : stats.mode === "ranged" ? "#e4c27a" : "#d9d3ca",
        }, this.atlas, this.animationSheets);
      }
    }
  }

  drawParticles(ctx) {
    for (const p of this.particles) {
      const screen = worldToScreen(p.x, p.y, p.z, this.camera);
      if (!visibleScreenPoint(screen, this.width, this.height, 90)) continue;
      ctx.save();
      ctx.globalAlpha = clamp(p.life / 0.55, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawFloaters(ctx) {
    ctx.save();
    ctx.font = "700 13px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const f of this.floaters) {
      const screen = worldToScreen(f.x, f.y, f.z, this.camera);
      ctx.globalAlpha = clamp(f.life / f.maxLife, 0, 1);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,0.75)";
      ctx.strokeText(f.text, screen.x, screen.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, screen.x, screen.y);
    }
    ctx.restore();
  }

  drawVignette(ctx) {
    const gradient = ctx.createRadialGradient(
      this.width / 2,
      this.height / 2,
      Math.min(this.width, this.height) * 0.18,
      this.width / 2,
      this.height / 2,
      Math.max(this.width, this.height) * 0.76,
    );
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(0,0,0,0.48)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  renderMinimap(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const size = canvas.width;
    const center = size / 2;
    const scale = 5.2;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "rgba(8,10,12,0.92)";
    ctx.fillRect(0, 0, size, size);
    const { cx, cy } = chunkCoords(this.player.x, this.player.y);
    for (let yy = cy - 3; yy <= cy + 3; yy += 1) {
      for (let xx = cx - 3; xx <= cx + 3; xx += 1) {
        const chunk = this.getChunk(xx, yy);
        for (const tile of chunk.tiles) {
          const px = center + (tile.x - this.player.x) * scale;
          const py = center + (tile.y - this.player.y) * scale;
          const biome = BIOMES[tile.biomeId] ?? chunk.biome;
          ctx.fillStyle = tile.edgeMask ? "rgba(245, 239, 227, 0.22)" : biome.tile[0];
          ctx.fillRect(Math.floor(px), Math.floor(py), Math.ceil(scale) + 1, Math.ceil(scale) + 1);
        }
      }
    }
    this.drawMinimapPoint(ctx, this.region.start, center, scale, "#8bdfff", 3);
    this.drawMinimapPoint(ctx, this.region.end, center, scale, "#f4da96", 3.4);
    for (const monster of this.monsters.values()) {
      if (monster.dead) continue;
      const x = center + (monster.x - this.player.x) * scale;
      const y = center + (monster.y - this.player.y) * scale;
      if (x >= 0 && y >= 0 && x <= size && y <= size) {
        ctx.fillStyle = "#d8313d";
        ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
      }
    }
    for (const loot of this.loots) {
      const x = center + (loot.x - this.player.x) * scale;
      const y = center + (loot.y - this.player.y) * scale;
      if (x >= 0 && y >= 0 && x <= size && y <= size) {
        ctx.fillStyle = loot.type === "gold" ? "#f1c657" : loot.item.rarityColor;
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }
    ctx.fillStyle = "#f5f3ea";
    ctx.beginPath();
    ctx.arc(center, center, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  drawMinimapPoint(ctx, point, center, scale, color, radius) {
    const x = center + (point.x - this.player.x) * scale;
    const y = center + (point.y - this.player.y) * scale;
    if (x < 0 || y < 0 || x > ctx.canvas.width || y > ctx.canvas.height) return;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  currentChunk() {
    const { cx, cy } = chunkCoords(this.player.x, this.player.y);
    return this.getChunk(cx, cy);
  }

  handlePointerMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = event.clientX - rect.left;
    this.pointer.y = event.clientY - rect.top;
    const world = screenToWorld(this.pointer.x, this.pointer.y, this.camera);
    this.pointer.worldX = world.x;
    this.pointer.worldY = world.y;
    const hovered = this.monsterAtScreen(this.pointer.x, this.pointer.y);
    const hoverMonsterId = hovered?.id ?? null;
    if (hoverMonsterId !== this.hoverMonsterId) {
      this.hoverMonsterId = hoverMonsterId;
      this.publishSnapshot();
    }
  }

  handlePointerLeave() {
    if (!this.hoverMonsterId) return;
    this.hoverMonsterId = null;
    this.publishSnapshot();
  }

  handlePointerDown(event) {
    this.handlePointerMove(event);
    if (event.button === 2) {
      event.preventDefault();
      this.castSpellAt(this.pointer.worldX, this.pointer.worldY);
      return;
    }
    this.pointer.down = true;
    const monster = this.monsterAtScreen(this.pointer.x, this.pointer.y);
    if (monster) {
      this.player.attackTargetId = monster.id;
      const stats = this.calcStats();
      if (distance(this.player, monster) <= stats.range + monster.radius) {
        this.primaryAttack(monster);
      } else {
        this.player.target = { x: monster.x, y: monster.y };
      }
      return;
    }
    this.player.attackTargetId = null;
    this.player.target = { x: this.pointer.worldX, y: this.pointer.worldY };
  }

  handlePointerUp() {
    this.pointer.down = false;
  }

  handleKeyDown(event) {
    const key = event.key.toLowerCase();
    this.keys.add(key);
    if (key === " ") {
      event.preventDefault();
      this.primaryAttack();
    }
    if (key === "1") {
      event.preventDefault();
      this.usePotion("health");
    }
    if (key === "2") {
      event.preventDefault();
      this.usePotion("mana");
    }
    if (key === "q") {
      const target = this.nearestMonster(7);
      this.castSpellAt(target ? target.x : this.pointer.worldX, target ? target.y : this.pointer.worldY);
    }
  }

  handleKeyUp(event) {
    this.keys.delete(event.key.toLowerCase());
  }

  itemSummary(item) {
    const parts = [];
    if (item.mode === "potion") {
      parts.push(item.potionType === "health" ? "Giver 25% liv" : "Giver 25% mana");
    } else if (item.slot === "weapon") {
      parts.push(`${item.damageMin}-${item.damageMax} skade`);
      parts.push(`${item.range} range`);
      parts.push(item.mode);
    } else {
      if (item.armor) parts.push(`+${item.armor} armor`);
      if (item.damageMin || item.damageMax) parts.push(`+${item.damageMin}-${item.damageMax} skade`);
      if (item.maxHp) parts.push(`+${item.maxHp} liv`);
      if (item.maxMana) parts.push(`+${item.maxMana} mana`);
      if (item.magic) parts.push(`+${item.magic} magi`);
      if (item.speed) parts.push(`+${item.speed.toFixed(2)} fart`);
    }
    parts.push(`${item.value ?? itemValue(item)} g`);
    return parts.join(" | ");
  }

  publishSnapshot() {
    const stats = this.calcStats();
    const chunk = this.currentChunk();
    const hoverMonster = this.hoverMonsterId ? this.monsters.get(this.hoverMonsterId) : null;
    const healthPotions = this.player.inventory
      .filter((item) => item.mode === "potion" && item.potionType === "health")
      .reduce((sum, item) => sum + Math.max(1, Math.floor(Number(item.count) || 1)), 0);
    const manaPotions = this.player.inventory
      .filter((item) => item.mode === "potion" && item.potionType === "mana")
      .reduce((sum, item) => sum + Math.max(1, Math.floor(Number(item.count) || 1)), 0);
    this.onSnapshot({
      player: {
        level: this.player.level,
        hp: Math.ceil(this.player.hp),
        maxHp: stats.maxHp,
        mana: Math.floor(this.player.mana),
        maxMana: stats.maxMana,
        xp: this.player.xp,
        nextXp: this.xpForNextLevel(),
        gold: this.player.gold,
        damage: `${stats.damageMin}-${stats.damageMax}`,
        armor: stats.armor,
        mode: stats.mode,
      },
      zone: {
        name: chunk.biome.name,
        level: this.region.index,
        seed: this.region.seed,
      },
      region: {
        name: this.region.biome.name,
        index: this.region.index,
        seed: this.region.seed,
      },
      exitPrompt: this.exitPromptOpen,
      inventory: this.player.inventory.map((item, index) => {
        const rarityIndex = RARITIES.findIndex((rarity) => rarity.id === item.rarity);
        const mergeCount = this.player.inventory.filter((other) => itemsCanMerge(item, other)).length;
        return {
          ...item,
          value: item.value ?? itemValue(item),
          iconIndex: itemIconIndex(item),
          iconSheet: itemIconSheet(item),
          index,
          mergeCount,
          canMerge: item.mode !== "potion" && mergeCount >= 3 && rarityIndex >= 0 && rarityIndex < RARITIES.length - 1,
          summary: this.itemSummary(item),
        };
      }),
      equipment: EQUIPMENT_SLOTS.map((slot) => {
        const item = this.player.equipment[slot.id];
        return {
          ...slot,
          item: item ? { ...item, summary: this.itemSummary(item), iconIndex: itemIconIndex(item), iconSheet: itemIconSheet(item) } : null,
        };
      }),
      hoverMonster: hoverMonster && !hoverMonster.dead ? {
        id: hoverMonster.id,
        name: hoverMonster.elite ? `${hoverMonster.elite.label} ${hoverMonster.typeName}` : hoverMonster.typeName,
        level: hoverMonster.level,
        hp: Math.max(0, Math.ceil(hoverMonster.hp)),
        maxHp: hoverMonster.maxHp,
      } : null,
      quickActions: {
        healthPotions,
        manaPotions,
        potionCooldown: this.potionCooldown,
      },
      toasts: this.toasts.map((toast) => ({ id: toast.id, text: toast.text })),
    });
  }
}

function hasDifferentBiomeNeighbor(tile, biomeByTile) {
  const neighbors = [
    `${tile.x + 1},${tile.y}`,
    `${tile.x - 1},${tile.y}`,
    `${tile.x},${tile.y + 1}`,
    `${tile.x},${tile.y - 1}`,
  ];
  return neighbors.some((key) => {
    const biomeId = biomeByTile.get(key);
    return biomeId && biomeId !== tile.biomeId;
  });
}

function drawRegionMarkerIfInChunk(ctx, chunk, point, type, originX, originY) {
  const tileX = Math.floor(point.x);
  const tileY = Math.floor(point.y);
  if (tileX < chunk.x || tileY < chunk.y || tileX >= chunk.x + CHUNK_SIZE || tileY >= chunk.y + CHUNK_SIZE) return;
  const tx = point.x - chunk.x;
  const ty = point.y - chunk.y;
  const x = originX + (tx - ty) * (TILE_W / 2);
  const y = originY + (tx + ty) * (TILE_H / 2) + TILE_H * 0.52;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = type === "exit" ? 0.82 : 0.45;
  ctx.strokeStyle = type === "exit" ? "#f4da96" : "#8bdfff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, 25, 12, 0, 0, Math.PI * 2);
  ctx.stroke();
  if (type === "exit") {
    ctx.fillStyle = "rgba(244, 218, 150, 0.16)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 30, 15, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function preventDefault(event) {
  event.preventDefault();
}

const LOOT_PROFILES = {
  Spider: {
    goldChance: 0.42,
    goldMult: 0.75,
    weights: { health: 28, mana: 28, weapon: 2, armor: 2, none: 40 },
  },
  Skeleton: {
    goldChance: 0.65,
    goldMult: 1,
    weights: { weapon: 31, armor: 31, health: 3, mana: 3, none: 32 },
  },
  Demon: {
    goldChance: 0.72,
    goldMult: 1.15,
    weights: { health: 28, armor: 24, weapon: 4, mana: 2, none: 42 },
  },
  Ghost: {
    goldChance: 0.95,
    goldMult: 3.8,
    weights: { mana: 34, health: 2, weapon: 2, armor: 2, none: 60 },
  },
  Snake: {
    goldChance: 0.16,
    goldMult: 0.7,
    weights: { health: 4, mana: 4, weapon: 3, armor: 3, none: 86 },
  },
  Wolf: {
    goldChance: 0.22,
    goldMult: 0.7,
    weights: { health: 4, mana: 4, weapon: 4, armor: 4, none: 84 },
  },
  Scorpion: {
    goldChance: 0.7,
    goldMult: 1,
    weights: { all: 18, health: 12, mana: 12, weapon: 14, armor: 14, none: 30 },
  },
};

const ELITE_VARIANTS = [
  null,
  { id: "enforced", label: "Enforced", weight: 4, levelPct: 0.25, color: "#58d96d", tintAlpha: 0.22, sizeMult: 1.025 },
  { id: "rage", label: "Rage", weight: 3, levelPct: 0.5, color: "#ffd85d", tintAlpha: 0.24, sizeMult: 1.045 },
  { id: "lieutenant", label: "Loejtnant", weight: 2, levelPct: 1, color: "#b579ff", tintAlpha: 0.26, sizeMult: 1.065 },
];

function rollEliteVariant() {
  const entries = [
    { variant: null, weight: 10 },
    ...ELITE_VARIANTS.filter(Boolean).map((variant) => ({ variant, weight: variant.weight })),
  ];
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry.variant;
  }
  return null;
}

function eliteVariantLevelPct(elite) {
  if (!elite) return 0;
  if (Number.isFinite(Number(elite.levelPct))) return Number(elite.levelPct);
  return ELITE_VARIANTS.find((variant) => variant?.id === elite.id)?.levelPct ?? 0;
}

function namedItemChanceMultiplier(monster) {
  const levelPct = eliteVariantLevelPct(monster?.elite);
  if (levelPct >= 1) return 8;
  if (levelPct >= 0.5) return 4;
  if (levelPct > 0) return 2.25;
  return 1;
}

function monsterLootProfile(typeName) {
  return LOOT_PROFILES[typeName] ?? {
    goldChance: 0.55,
    goldMult: 1,
    weights: { health: 8, mana: 8, weapon: 8, armor: 8, none: 68 },
  };
}

function rollLootCategory(weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [category, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return category;
  }
  return "none";
}

function itemsCanMerge(a, b) {
  if (!a || !b) return false;
  if (a.mode === "potion" || b.mode === "potion") return false;
  if (a.unique || b.unique || a.named || b.named) return false;
  return a.baseName === b.baseName
    && a.rarity === b.rarity
    && a.slot === b.slot
    && a.mode === b.mode;
}

function itemIconIndex(item) {
  if (itemIconSheet(item) === "armor") {
    const armorMap = {
      Helm: 0,
      Gorget: 1,
      Chestplate: 2,
      Vambraces: 3,
      Greaves: 4,
      Bracelet: 8,
      Boots: 9,
      Gloves: 10,
    };
    return armorMap[item?.baseName] ?? 2;
  }

  const map = {
    Sword: 0,
    Spear: 1,
    Javelin: 1,
    Dagger: 2,
    "Mana Potion": 3,
    "Health Potion": 4,
    Crossbow: 8,
    Bow: 9,
    "Rune Staff": 10,
    "Spell Mask": 11,
    Ring: 6,
    Amulet: 7,
    Gorget: 7,
    Bracelet: 7,
    Helm: 11,
    Chestplate: 11,
    Vambraces: 11,
    Greaves: 11,
    Boots: 11,
    Gloves: 11,
  };
  return map[item?.baseName] ?? (item?.slot === "ring" ? 6 : item?.slot === "weapon" ? 0 : 11);
}

function itemIconSheet(item) {
  const armorBases = new Set(["Helm", "Gorget", "Chestplate", "Vambraces", "Greaves", "Bracelet", "Boots", "Gloves"]);
  return armorBases.has(item?.baseName) ? "armor" : "items";
}

function drawTerrainDecal(ctx, decal, x, y) {
  const s = decal.size;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(decal.rotation);
  switch (decal.type) {
    case "flower":
      ctx.fillStyle = decal.color > 0.5 ? "rgba(222, 110, 142, 0.75)" : "rgba(238, 205, 83, 0.72)";
      for (let i = 0; i < 5; i += 1) {
        ctx.rotate((Math.PI * 2) / 5);
        ctx.beginPath();
        ctx.ellipse(4 * s, 0, 4 * s, 2 * s, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#eedb73";
      ctx.beginPath();
      ctx.arc(0, 0, 2 * s, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "mushroom":
      ctx.fillStyle = "#d9c6a0";
      ctx.fillRect(-1.5 * s, -5 * s, 3 * s, 8 * s);
      ctx.fillStyle = decal.color > 0.5 ? "#c84f44" : "#b97b37";
      ctx.beginPath();
      ctx.ellipse(0, -6 * s, 7 * s, 4 * s, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      break;
    case "bone":
      ctx.strokeStyle = "rgba(224, 213, 190, 0.72)";
      ctx.lineWidth = 3 * s;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-9 * s, 0);
      ctx.lineTo(9 * s, 0);
      ctx.stroke();
      break;
    case "plank":
      ctx.fillStyle = "rgba(112, 74, 43, 0.58)";
      ctx.fillRect(-14 * s, -3 * s, 28 * s, 6 * s);
      break;
    case "barrel":
      ctx.fillStyle = "rgba(102, 66, 38, 0.62)";
      ctx.beginPath();
      ctx.ellipse(0, 0, 8 * s, 6 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "crack":
      ctx.strokeStyle = "rgba(0,0,0,0.24)";
      ctx.lineWidth = 1.2 * s;
      ctx.beginPath();
      ctx.moveTo(-12 * s, -2 * s);
      ctx.lineTo(-2 * s, 2 * s);
      ctx.lineTo(5 * s, -3 * s);
      ctx.lineTo(13 * s, 1 * s);
      ctx.stroke();
      break;
    case "rubble":
    case "pebble":
      ctx.fillStyle = "rgba(190, 184, 166, 0.42)";
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.ellipse((i * 6 - 6) * s, (i % 2) * 4 * s, (3 + i) * s, 2.4 * s, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case "lantern":
      ctx.fillStyle = "rgba(255, 176, 70, 0.45)";
      ctx.beginPath();
      ctx.ellipse(0, 0, 9 * s, 6 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    default:
      ctx.strokeStyle = "rgba(128, 170, 89, 0.52)";
      ctx.lineWidth = 2 * s;
      ctx.lineCap = "round";
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo((Math.cos(i * 1.7) * 9) * s, (-4 - Math.sin(i * 1.4) * 6) * s);
        ctx.stroke();
      }
      break;
  }
  ctx.restore();
}
