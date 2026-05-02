import {
  BIOMES,
  CHUNK_SIZE,
  EQUIPMENT_SLOTS,
  MAX_INVENTORY,
  NAMED_ITEM_TEMPLATES,
  PREFIXES,
  RARITIES,
  TILE_H,
  TILE_W,
  UNIQUE_ITEMS,
  WORLD_SEED,
} from "./data.js";
import {
  drawGroundTile,
  drawShadow,
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
import {
  DESTRUCTIBLE_OBJECTS,
  DESTROYED_ITEM_RESOURCE_DROPS,
  RESOURCE_DEFS,
  RESOURCE_MERGE_RECIPES,
  RESOURCE_RARITY_COLOR,
} from "./config/resource-config.js";
import { POPULARITY_CONFIG } from "./config/popularity-config.js";
import { ELITE_VARIANTS, ELITE_NO_VARIANT_WEIGHT } from "./config/elite-config.js";
import { QUEST_CONFIG, QUEST_DEFS, QUEST_ITEM_DEFS, QUEST_NPCS } from "./config/quest-config.js";
import { UNIQUE_DROP_CHANCES, RESTRICTED_DROPS } from "./config/loot-config.js";
import { monsterLootProfile, monsterResourceDrops, rollLootCategory } from "./loot.js";
import {
  deriveIconKey,
  iconUrlFromKey,
  canMergeItem,
  isPotionItem,
  isQuestItem,
  isResourceItem,
  withItemFlags,
  withItemIcon,
} from "./item-system.js";

const TERRAIN_LAYER_PAD_TOP = 56;
const TERRAIN_LAYER_PAD_BOTTOM = 88;
const SAVE_VERSION = 1;
const SAVE_STORAGE_KEY = `runebound-depths-save-v${SAVE_VERSION}`;
const AUTOSAVE_INTERVAL_SECONDS = 1.5;
const MAX_POTION_STACK = 10;
const MAX_ELITE_MONSTERS_PER_REGION = 6;
const QUEST_INTERACT_RADIUS = 0.92;
const DESTRUCTIBLE_OBJECT_ATTACK_RANGE = 1.15;
const GROUND_LOOT_DESPAWN_SECONDS = 300;

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
    this.activeMapRegion = null;
    this.mapReturn = null;
    this.mapReturnSerial = 0;
    this.exitPromptOpen = false;
    this.exitPromptCooldown = 0;
    this.camera = { offsetX: 0, offsetY: 0, targetOffsetX: 0, targetOffsetY: 0, shake: 0 };
    this.pointer = { x: 0, y: 0, worldX: this.region.start.x, worldY: this.region.start.y, down: false };
    this.hoverMonsterId = null;
    this.nearbyQuestgiver = null;
    this.nearbyQuestgiver = null;
    this.inputLocked = false;
    this.paused = false;
    this.player = this.createPlayer();
    this.regionStartPlayerLevel = this.player.level;
    this.eliteMonsterCount = 0;
    this.questState = {
      active: [],
      completed: [],
      wildernessNpc: null,
      cityFade: [],
    };
    this.loadProgress();
    this.prepareRegionQuestgiver();
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
  }

  setPaused(paused) {
    this.paused = Boolean(paused);
    if (!this.paused) this.lastTime = performance.now();
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
      this.updateQuestgiver(dt);
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

  }

  updateQuestgiver() {
    const questgiver = this.questState.wildernessNpc;
    const nearby = questgiver && distance(this.player, questgiver) <= QUEST_INTERACT_RADIUS
      ? questgiver
      : null;
    if ((nearby?.id ?? null) !== (this.nearbyQuestgiver?.id ?? null)) {
      this.nearbyQuestgiver = nearby;
      this.publishSnapshot();
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
      if (Number.isFinite(Number(loot.despawn))) {
        loot.despawn -= dt;
        if (loot.despawn <= 0) {
          this.handleLootDespawn(loot);
          this.loots.splice(i, 1);
          continue;
        }
      }
      loot.pickupDelay = Math.max(0, (loot.pickupDelay || 0) - dt);
      if (loot.pickupDelay > 0) continue;
      if (distance(this.player, loot) < 0.62) {
        if (loot.type === "gold") {
          this.player.gold += loot.amount;
          this.player.stats.goldLooted += loot.amount;
          this.player.stats.goldEarned += loot.amount;
          this.addFloater(loot.x, loot.y, `+${loot.amount} g`, "#f1c657");
          this.addToast(`+${loot.amount} guld`);
          this.loots.splice(i, 1);
        } else if (isPotionItem(loot.item)) {
          const before = Math.max(0, Math.floor(Number(this.player.potions?.[loot.item.potionType]) || 0));
          if (this.addPotionLoot(loot.item)) {
            const after = Math.max(0, Math.floor(Number(this.player.potions?.[loot.item.potionType]) || 0));
            const picked = Math.max(1, after - before);
            this.trackItemPicked(loot.item);
            this.addFloater(loot.x, loot.y, loot.item.name, loot.item.rarityColor, 1.05);
            this.addToast(pickupStatusText(loot.item, picked));
            this.loots.splice(i, 1);
            this.publishSnapshot();
          } else if (!loot.warned) {
            loot.warned = true;
            this.addToast("Potion stack er fuld");
          }
        } else if (isQuestItem(loot.item) && this.addInventoryItem(loot.item)) {
          this.player.stats.itemsPicked += 1;
          this.trackItemPicked(loot.item);
          this.applyQuestItemPickup(loot.item);
          this.addFloater(loot.x, loot.y, loot.item.name, loot.item.rarityColor, 1.05);
          this.addToast(pickupStatusText(loot.item, 1));
          this.loots.splice(i, 1);
          this.publishSnapshot();
        } else if (!isPotionItem(loot.item) && this.addInventoryItem(loot.item)) {
          const picked = isResourceItem(loot.item) ? Math.max(1, Math.floor(Number(loot.item.count) || 1)) : 1;
          if (isResourceItem(loot.item)) this.player.stats.resourcesPicked += picked;
          else {
            this.player.stats.itemsPicked += 1;
            this.trackItemPicked(loot.item);
          }
          this.addFloater(loot.x, loot.y, loot.item.name, loot.item.rarityColor, 1.05);
          this.addToast(pickupStatusText(loot.item, picked));
          this.loots.splice(i, 1);
          this.publishSnapshot();
        } else if (!loot.warned) {
          loot.warned = true;
          this.addToast(isPotionItem(loot.item) ? "Potion stack er fuld" : "Rygsaekken er fuld");
        }
      }
    }
  }

  handleLootDespawn(loot) {
    if (isQuestItem(loot.item) && this.questState.active) {
      const quest = this.questState.active.find((entry) => entry.id === loot.item.questInstanceId);
      if (quest?.type === "collect_quest_item") {
        quest.progress = { ...(quest.progress ?? {}), droppedItems: Math.max(0, Math.floor(Number(quest.progress?.droppedItems) || 0) - 1) };
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
      chance: UNIQUE_DROP_CHANCES.chest,
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

    if (!item || this.isDropBlocked(item)) return;

    this.loots.push({
      id: createId(),
      type: "item",
      item,
      x: chest.x + 0.16,
      y: chest.y - 0.16,
      bob: Math.random() * Math.PI * 2,
      pickupDelay: 0.35,
      despawn: GROUND_LOOT_DESPAWN_SECONDS,
    });
    this.trackItemDropped(item);
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
    if (this.activeMapRegion) {
      this.returnToAreaMap();
      return;
    }
    this.regionIndex += 1;
    this.region = createRegion(this.regionIndex);
    this.resetRegionRuntime();
    this.placePlayerAtRegionStart();
    this.ensureWorldAroundPlayer();
    this.prepareRegionQuestgiver();
    this.addToast(`Rejst til ${this.region.biome.name}`);
    this.publishSnapshot();
  }

  startMapRegion(areaMapId, regionConfig) {
    if (!areaMapId || !regionConfig?.id) return false;
    this.regionIndex += 1;
    const seed = Math.floor(Math.random() * 1000000000);
    this.activeMapRegion = {
      areaMapId,
      regionId: regionConfig.id,
      label: regionConfig.label ?? regionConfig.id,
    };
    this.mapReturn = null;
    this.region = createRegion(this.regionIndex, seed, regionConfig.biodome, {
      ...regionConfig,
      areaMapId,
    });
    this.resetRegionRuntime();
    this.placePlayerAtRegionStart();
    this.ensureFullRegionGenerated();
    this.ensureWorldAroundPlayer();
    this.prepareRegionQuestgiver();
    // Set total spawned count for active clear_map quests targeting this region
    for (const quest of this.questState.active) {
      if (quest.type !== "clear_map") continue;
      if (quest.target?.regionId !== regionConfig.id) continue;
      const validTypes = quest.target?.monsters ?? [];
      const total = [...this.monsters.values()].filter((m) => validTypes.includes(m.typeName)).length;
      quest.progress = { ...(quest.progress ?? {}), total, kills: 0, cleared: false };
    }
    this.addToast(`${this.activeMapRegion.label} startet. Find den gyldne exit mod nordoest.`);
    this.publishSnapshot();
    return true;
  }

  returnToAreaMap() {
    const active = this.activeMapRegion;
    const cleared = this.allRegionMonstersCleared();
    // Mark any active clear_map quest for this region as cleared if all monsters are dead
    if (cleared) {
      for (const quest of this.questState.active) {
        if (quest.type !== "clear_map") continue;
        if (quest.target?.regionId !== active.regionId) continue;
        if (!quest.progress?.cleared) {
          quest.progress = { ...(quest.progress ?? {}), cleared: true };
          this.addToast(`${quest.title} klar til indlevering`);
        }
      }
    }
    this.mapReturn = {
      id: ++this.mapReturnSerial,
      areaMapId: active.areaMapId,
      regionId: active.regionId,
      label: active.label,
      cleared,
    };
    this.activeMapRegion = null;
    this.exitPromptOpen = false;
    this.exitPromptCooldown = 0;
    this.player.target = null;
    this.player.attackTargetId = null;
    this.player.attackObjectId = null;
    this.addToast(cleared ? `${active.label} befriet` : `${active.label} er stadig corrupted`);
    this.publishSnapshot();
  }

  resetRegionRuntime() {
    this.chunks.clear();
    this.monsters.clear();
    // Before clearing loots, run despawn handling so quest drop counts are adjusted
    for (const loot of this.loots) {
      try { this.handleLootDespawn(loot); } catch (e) { /* best-effort */ }
    }
    this.loots = [];
    this.projectiles = [];
    this.particles = [];
    this.floaters = [];
    this.hoverMonsterId = null;
    this.nearbyQuestgiver = null;
    this.regionStartPlayerLevel = this.player.level;
    this.eliteMonsterCount = 0;
    this.questState.wildernessNpc = null;
    this.exitPromptOpen = false;
    this.exitPromptCooldown = 0;
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

  ensureFullRegionGenerated() {
    if (!this.region) return;
    const min = chunkCoords(0, 0);
    const max = chunkCoords(this.region.width - 0.001, this.region.height - 0.001);
    for (let cy = min.cy; cy <= max.cy; cy += 1) {
      for (let cx = min.cx; cx <= max.cx; cx += 1) {
        this.getChunk(cx, cy);
      }
    }
  }

  allRegionMonstersCleared() {
    this.ensureFullRegionGenerated();
    for (const monster of this.monsters.values()) {
      if (!monster.dead) return false;
    }
    return true;
  }

  primaryAttack(target = null) {
    const stats = this.calcStats();
    target = target || this.nearestMonster(stats.range + 0.5) || this.nearestDestructibleObject(DESTRUCTIBLE_OBJECT_ATTACK_RANGE + 0.5);
    if (!target || target.dead) return;
    const targetIsObject = isDestructibleObject(target);
    const attackRange = targetIsObject ? DESTRUCTIBLE_OBJECT_ATTACK_RANGE : stats.range;
    const d = distance(this.player, target);
    if (d > attackRange + target.radius) return;

    const n = normalize(target.x - this.player.x, target.y - this.player.y);
    this.setFacing(n.x, n.y);
    this.player.attackCooldown = stats.cooldown;
    this.player.attackAnim = 0.24;

    if (targetIsObject) {
      this.player.stats.meleeAttacks += 1;
      const damage = this.rollDamage(stats.damageMin, stats.damageMax);
      this.damageObject(target, damage);
      this.camera.shake = Math.max(this.camera.shake, 3);
      this.player.attackTargetId = null;
      this.player.attackObjectId = null;
      return;
    }

    if (stats.mode === "melee") {
      this.player.stats.meleeAttacks += 1;
      const damage = this.rollDamage(stats.damageMin, stats.damageMax);
      this.damageMonster(target, damage, "melee");
      this.addParticles(target.x, target.y, "#f1d08d", 14, 0.1);
      this.camera.shake = Math.max(this.camera.shake, 3);
      this.player.attackTargetId = null;
      this.player.attackObjectId = null;
      return;
    }

    const speed = stats.mode === "magic" ? 9.6 : 11.8;
    if (stats.mode === "magic") this.player.stats.spellProjectiles += 1;
    if (stats.mode === "ranged") this.player.stats.rangedAttacks += 1;
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
    this.player.stats.spellsCast += 1;
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
    this.player.stats.damageTaken += mitigated;
    this.player.hurtCooldown = 0.2;
    this.camera.shake = Math.max(this.camera.shake, 4);
    this.addFloater(this.player.x, this.player.y, `-${mitigated}`, "#ff7272");
    this.addParticles(this.player.x, this.player.y, "#cc3c3c", 9, 0.1);
    if (this.player.hp <= 0) {
      this.player.stats.deaths += 1;
      this.addToast(`Faldt mod ${source.typeName}`);
    }
  }

  damageMonster(monster, amount, sourceType) {
    const damage = Math.max(1, Math.floor(amount));
    const beforeHp = Math.max(0, Math.floor(Number(monster.hp) || 0));
    monster.hp = Math.max(0, monster.hp - damage);
    this.player.stats.damageDealt += Math.min(beforeHp, damage);
    monster.hurt = 0.18;
    this.addFloater(monster.x, monster.y, `-${damage}`, sourceType === "magic" ? "#9de9ff" : "#f1d08d");
    if (monster.hp <= 0) this.killMonster(monster);
  }

  damageObject(object, amount) {
    const def = getDestructibleDef(object);
    if (!def) return;
    if (!Number.isFinite(Number(object.maxHp))) {
      object.maxHp = def.hp;
      object.hp = def.hp;
    }
    const stages = Math.max(1, Math.floor(Number(def.damageStages) || 3));
    object.harvestHits = Math.min(stages, Math.floor(Number(object.harvestHits) || 0) + 1);
    const remainingStages = Math.max(0, stages - object.harvestHits);
    object.hp = Math.max(0, Math.ceil(object.maxHp * (remainingStages / stages)));
    object.hurt = 0.18;
    this.addFloater(object.x, object.y, `-${object.harvestHits}/${stages}`, "#f1d08d", 0.72);
    this.addParticles(object.x, object.y, def.particleColor ?? "#d8c091", 8, 0.08);
    if (object.harvestHits >= stages || object.hp <= 0) this.destroyObject(object, def);
  }

  destroyObject(object, def) {
    const { cx, cy } = chunkCoords(object.x, object.y);
    const chunk = this.getChunk(cx, cy);
    const index = chunk.objects.findIndex((entry) => entry.id === object.id);
    if (index < 0) return;
    chunk.objects.splice(index, 1);
    this.player.stats.objectsDestroyed += 1;
    incrementStatMap(this.player.stats.objectsDestroyedByType, object.type);
    this.player.attackObjectId = null;
    this.player.target = null;
    this.addParticles(object.x, object.y, def.particleColor ?? "#d8c091", 28, 0.16);
    this.dropResourceLoot(object.x, object.y, [...(def.loot ?? []), ...(def.rareLoot ?? [])]);
    this.dropObjectItemLoot(object.x, object.y, def.itemLoot ?? []);
    if (object.type === "building") {
      this.changePopularity(housePopularityDelta(this.region.index), object.x, object.y);
    }
  }

  killMonster(monster) {
    if (monster.dead) return;
    monster.dead = true;
    this.recordMonsterKill(monster);
    if (monster.elite) {
      // Elite killed — game UI already shows effects, no debug toast needed
    }
    this.player.xp += monster.xp;
    this.applyQuestKill(monster);
    this.addFloater(monster.x, monster.y, `+${monster.xp} xp`, "#e0aa3f", 0.95);
    this.changePopularity(monsterPopularityDelta(monster, this.player.level), monster.x, monster.y);
    this.addParticles(monster.x, monster.y, monster.color, 24, 0.16);
    this.dropLoot(monster);
    this.levelUpIfNeeded();
  }

  recordMonsterKill(monster) {
    const typeName = monster?.typeName ?? "Unknown";
    const bucket = monster?.elite ? "elite" : "normal";
    this.player.stats.killsTotal += 1;
    this.player.stats.killsByMonster[typeName] = {
      normal: Math.max(0, Math.floor(Number(this.player.stats.killsByMonster[typeName]?.normal) || 0)) + (bucket === "normal" ? 1 : 0),
      elite: Math.max(0, Math.floor(Number(this.player.stats.killsByMonster[typeName]?.elite) || 0)) + (bucket === "elite" ? 1 : 0),
    };
  }

  changePopularity(amount, x = this.player.x, y = this.player.y) {
    const delta = Number(amount) || 0;
    if (!delta) return;
    const before = clamp(Number(this.player.popularity) || 0, POPULARITY_CONFIG.min, POPULARITY_CONFIG.max);
    const after = clamp(before + delta, POPULARITY_CONFIG.min, POPULARITY_CONFIG.max);
    const actual = after - before;
    this.player.popularity = after;
    if (Math.abs(actual) < 0.05) return;
    const decimals = Math.abs(actual) >= 10 || Number.isInteger(actual) ? 0 : 1;
    const text = `${actual > 0 ? "+" : ""}${actual.toFixed(decimals)} pop`;
    this.addFloater(x, y, text, actual > 0 ? "#8be9ff" : "#ff7272", 0.95);
  }

  dropLoot(monster) {
    const profile = monsterLootProfile(monster.typeName);
    const lootLevel = monster.lootLevel ?? monster.level;
    this.dropResourceLoot(monster.x, monster.y, monsterResourceDrops(monster));
    this.dropQuestLoot(monster);
    if (Math.random() < profile.goldChance) {
      const gold = Math.floor((4 + Math.random() * 9) * (1 + lootLevel * 0.28) * profile.goldMult);
      this.loots.push({
        id: createId(),
        type: "gold",
        amount: gold,
        x: monster.x + (Math.random() - 0.5) * 0.5,
        y: monster.y + (Math.random() - 0.5) * 0.5,
        bob: Math.random() * Math.PI * 2,
        despawn: GROUND_LOOT_DESPAWN_SECONDS,
      });
    }

    const unique = rollUniqueItem(lootLevel, {
      source: "monster",
      biomeId: this.region.biomeId,
      chance: UNIQUE_DROP_CHANCES.monster,
    });
    if (unique && !this.isDropBlocked(unique)) {
      this.loots.push({
        id: createId(),
        type: "item",
        item: unique,
        x: monster.x + (Math.random() - 0.5) * 0.7,
        y: monster.y + (Math.random() - 0.5) * 0.7,
        bob: Math.random() * Math.PI * 2,
        despawn: GROUND_LOOT_DESPAWN_SECONDS,
      });
      this.trackItemDropped(unique);
    }

    const named = rollNamedItem(lootLevel, {
      source: "monster",
      biomeId: this.region.biomeId,
      chanceMult: namedItemChanceMultiplier(monster),
    });
    if (named && !this.isDropBlocked(named)) {
      this.loots.push({
        id: createId(),
        type: "item",
        item: named,
        x: monster.x + (Math.random() - 0.5) * 0.7,
        y: monster.y + (Math.random() - 0.5) * 0.7,
        bob: Math.random() * Math.PI * 2,
        despawn: GROUND_LOOT_DESPAWN_SECONDS,
      });
      this.trackItemDropped(named);
    }

    const category = rollLootCategory(profile.weights);
    if (!category || category === "none") return;
    if (this.isDropCategoryBlocked(category)) return;

    const item = category === "health" || category === "mana"
      ? makePotion(category, lootLevel)
      : makeItem(lootLevel, category === "weapon" ? 0.1 : category === "armor" ? 0.9 : Math.random());
    if (this.isDropBlocked(item)) return;
    this.loots.push({
      id: createId(),
      type: "item",
      item,
      x: monster.x + (Math.random() - 0.5) * 0.7,
      y: monster.y + (Math.random() - 0.5) * 0.7,
      bob: Math.random() * Math.PI * 2,
      despawn: GROUND_LOOT_DESPAWN_SECONDS,
    });
    this.trackItemDropped(item);

    if (category === "all" && Math.random() < clamp(0.08 + monster.level * 0.01, 0.08, 0.24)) {
      const potion = makePotion(Math.random() < 0.5 ? "health" : "mana", lootLevel);
      if (this.isDropBlocked(potion)) return;
      this.loots.push({
        id: createId(),
        type: "item",
        item: potion,
        x: monster.x + (Math.random() - 0.5) * 0.85,
        y: monster.y + (Math.random() - 0.5) * 0.85,
        bob: Math.random() * Math.PI * 2,
        despawn: GROUND_LOOT_DESPAWN_SECONDS,
      });
      this.trackItemDropped(potion);
    }
  }

  dropResourceLoot(x, y, entries = []) {
    for (const entry of entries) {
      if (!entry?.resource || Math.random() > (entry.chance ?? 1)) continue;
      const amount = randomInt(entry.min ?? 1, entry.max ?? entry.min ?? 1);
      const item = makeResourceItem(entry.resource, amount);
      if (!item || this.isDropBlocked(item)) continue;
      this.loots.push({
        id: createId(),
        type: "item",
        item,
        x: x + (Math.random() - 0.5) * 0.65,
        y: y + (Math.random() - 0.5) * 0.65,
        bob: Math.random() * Math.PI * 2,
        pickupDelay: 0.35,
        despawn: GROUND_LOOT_DESPAWN_SECONDS,
      });
      this.trackItemDropped(item);
    }
  }

  dropObjectItemLoot(x, y, entries = []) {
    for (const entry of entries) {
      if (!entry || Math.random() > (entry.chance ?? 0)) continue;
      const rarity = String(entry.rarity ?? "legendary");
      const tries = Math.max(1, Math.floor(Number(entry.tries) || 60));
      const levelOffset = Math.floor(Number(entry.levelOffset) || 0);
      const level = Math.max(1, this.player.level + levelOffset);
      const item = rollItemOfRarity(level, rarity, tries);
      if (!item || this.isDropBlocked(item)) continue;
      this.loots.push({
        id: createId(),
        type: "item",
        item,
        x: x + (Math.random() - 0.5) * 0.65,
        y: y + (Math.random() - 0.5) * 0.65,
        bob: Math.random() * Math.PI * 2,
        pickupDelay: 0.35,
        despawn: GROUND_LOOT_DESPAWN_SECONDS,
      });
      this.trackItemDropped(item);
    }
  }

  // Returns true if the drop is restricted to other regions and must NOT drop here.
  // Allow-only has first priority over antiDrops.
  isDropRestricted(item) {
    if (!item || !RESTRICTED_DROPS.length) return false;
    const areaMapId = this.region?.mapRegion?.areaMapId ?? null;
    const regionId = this.region?.mapRegion?.id ?? null;

    const itemKeys = new Set([
      item.name,
      item.baseName,
      item.mode,
      item.slot,
    ].filter(Boolean).map(String));

    for (const rule of RESTRICTED_DROPS) {
      let matches = false;
      if (rule.resources?.length && isResourceItem(item)) matches = rule.resources.map(String).includes(String(item.resourceId));
      if (!matches && rule.uniques?.length && item.uniqueId) matches = rule.uniques.map(String).includes(String(item.uniqueId));
      if (!matches && rule.named?.length && item.namedId) matches = rule.named.map(String).includes(String(item.namedId));
      if (!matches && rule.questItems?.length && item.questItemId) matches = rule.questItems.map(String).includes(String(item.questItemId));
      if (!matches && rule.potions?.length && isPotionItem(item) && item.potionType) matches = rule.potions.map(String).includes(String(item.potionType));
      if (!matches && rule.rarities?.length && item.rarity) matches = rule.rarities.map(String).includes(String(item.rarity));
      if (!matches && rule.items?.length) matches = rule.items.map(String).some((key) => itemKeys.has(key));

      if (!matches) continue;

      // Item is restricted — check if current region is in the allowed scopes
      const allowedByArea = rule.areaMapIds?.length && areaMapId && rule.areaMapIds.map(String).includes(String(areaMapId));
      const allowedByRegion = rule.regionIds?.length && regionId && rule.regionIds.map(String).includes(String(regionId));
      if (allowedByArea || allowedByRegion) return false; // allowed here
      return true; // restricted elsewhere
    }
    return false;
  }

  isDropCategoryBlocked(category) {
    if (!category) return false;
    // Allow-only check for categories
    if (RESTRICTED_DROPS.some((rule) => rule.categories?.length && rule.categories.map(String).includes(String(category)))) {
      const areaMapId = this.region?.mapRegion?.areaMapId ?? null;
      const regionId = this.region?.mapRegion?.id ?? null;
      for (const rule of RESTRICTED_DROPS) {
        if (!rule.categories?.map(String).includes(String(category))) continue;
        const allowedByArea = rule.areaMapIds?.length && areaMapId && rule.areaMapIds.map(String).includes(String(areaMapId));
        const allowedByRegion = rule.regionIds?.length && regionId && rule.regionIds.map(String).includes(String(regionId));
        if (allowedByArea || allowedByRegion) return false;
        return true;
      }
    }
    const antiDrops = this.region?.mapRegion?.antiDrops;
    return Boolean(antiDrops?.categories?.includes(category));
  }

  isDropBlocked(item) {
    if (!item) return false;

    // Allow-only check: first priority, overrides antiDrops
    if (this.isDropRestricted(item)) return true;

    const antiDrops = this.region?.mapRegion?.antiDrops;
    if (!antiDrops) return false;

    // Broad type exclusions
    if (antiDrops.allResources && isResourceItem(item)) return true;
    if (antiDrops.allPotions && isPotionItem(item)) return true;
    if (antiDrops.allQuestItems && isQuestItem(item)) return true;
    if (antiDrops.allUniques && item.uniqueId) return true;
    if (antiDrops.allNamed && item.namedId) return true;
    if (antiDrops.allItems && item.rarity && !isResourceItem(item) && !isPotionItem(item) && !isQuestItem(item)) return true;

    // Rarity exclusion: block the listed rarity and everything above it
    if (antiDrops.rarities?.length && item.rarity) {
      const lowestBlockedIndex = antiDrops.rarities.reduce((min, id) => {
        const idx = RARITIES.findIndex((r) => r.id === id);
        return idx >= 0 && idx < min ? idx : min;
      }, Infinity);
      const itemIndex = RARITIES.findIndex((r) => r.id === item.rarity);
      if (itemIndex >= lowestBlockedIndex) return true;
    }

    const itemKeys = [
      item.id,
      item.name,
      item.baseName,
      item.mode,
      item.slot,
      item.potionType,
      item.uniqueId,
      item.namedId,
      item.questItemId,
    ].filter(Boolean).map(String);

    const resources = new Set((antiDrops.resources ?? []).map(String));
    if (isResourceItem(item) && resources.has(String(item.resourceId))) return true;

    const uniques = new Set((antiDrops.uniques ?? []).map(String));
    if (item.uniqueId && uniques.has(String(item.uniqueId))) return true;

    const named = new Set((antiDrops.named ?? []).map(String));
    if (item.namedId && named.has(String(item.namedId))) return true;

    const items = new Set((antiDrops.items ?? []).map(String));
    return itemKeys.some((key) => items.has(key));
  }

  prepareRegionQuestgiver() {
    if (this.questState.wildernessNpc) return;
    if (!this.hasGuaranteedRegionQuestOffer() && Math.random() > QUEST_CONFIG.wildernessNpcSpawnChance) return;
    const quest = this.rollQuestOffer();
    if (!quest) return;
    const position = this.findQuestgiverPosition();
    if (!position) return;
    this.questState.wildernessNpc = {
      id: createId(),
      npcId: quest.npcId,
      quest,
      x: position.x,
      y: position.y,
      radius: 0.34,
      bob: Math.random() * Math.PI * 2,
    };
  }

  rollQuestOffer() {
    const candidates = [];
    for (const def of Object.values(QUEST_DEFS)) {
      if (!this.questDefinitionCanSpawn(def)) continue;
      candidates.push(def);
    }
    if (!candidates.length) return null;
    const currentRegionId = this.region?.mapRegion?.id;
    const priority = candidates.filter((def) => (
      currentRegionId
      && (def.regionIds ?? []).map(String).includes(String(currentRegionId))
      && Number(def.spawnChance ?? 0) >= 1
    ));
    const pool = priority.length ? priority : candidates;

    for (let tries = 0; tries < 8; tries += 1) {
      const def = pool[Math.floor(Math.random() * pool.length)];
      if (Math.random() > (def.spawnChance ?? 0.1)) continue;
      const npcId = def.npcIds[Math.floor(Math.random() * def.npcIds.length)];
      if (!QUEST_NPCS[npcId]) continue;
      if (this.questState.active.some((quest) => quest.npcId === npcId)) continue;
      if (def.id === "vengeance") {
        const monsterTypes = (this.region.mapRegion?.mobs?.length ? this.region.mapRegion.mobs : this.region.biome.monsters ?? []).filter((type) => (
          !this.questState.active.some((quest) => quest.questId === "vengeance" && quest.target?.monster === type)
        ));
        if (!monsterTypes.length) continue;
        const monster = monsterTypes[Math.floor(Math.random() * monsterTypes.length)];
        const count = randomInt(def.target.countMin, def.target.countMax);
        return makeQuestInstance(def, npcId, {
          monster,
          count,
          regionSeed: this.region.seed,
          regionIndex: this.region.index,
        });
      }
      return makeQuestInstance(def, npcId, {
        regionSeed: this.region.seed,
        regionIndex: this.region.index,
      });
    }
    return null;
  }

  questDefinitionCanSpawn(def) {
    if (!def?.repeatable && this.questState.completed.includes(def.id)) return false;
    if (!def?.repeatable && this.questState.active.some((quest) => quest.questId === def.id)) return false;
    if ((def.npcIds ?? []).every((npcId) => this.questState.active.some((quest) => quest.npcId === npcId))) return false;
    if (Array.isArray(def.regionIds) && def.regionIds.length > 0) {
      const currentRegionId = this.region?.mapRegion?.id;
      if (!currentRegionId || !def.regionIds.map(String).includes(String(currentRegionId))) return false;
    }
    if (def.id === "vengeance") {
      return (this.region.biome.monsters ?? []).some((type) => (
        !this.questState.active.some((quest) => quest.questId === "vengeance" && quest.target?.monster === type)
      ));
    }
    return true;
  }

  hasGuaranteedRegionQuestOffer() {
    const currentRegionId = this.region?.mapRegion?.id;
    if (!currentRegionId) return false;
    return Object.values(QUEST_DEFS).some((def) => (
      this.questDefinitionCanSpawn(def)
      && (def.regionIds ?? []).map(String).includes(String(currentRegionId))
      && Number(def.spawnChance ?? 0) >= 1
    ));
  }

  findQuestgiverPosition() {
    const anchors = [
      { x: this.region.start.x + 5.2, y: this.region.start.y - 1.4 },
      { x: this.region.start.x + 7.4, y: this.region.start.y + 1.5 },
      { x: this.region.start.x + 10.2, y: this.region.start.y - 2.8 },
      { x: this.region.end.x - 6.2, y: this.region.end.y + 3.2 },
      { x: this.region.end.x - 8.5, y: this.region.end.y - 1.8 },
    ];
    for (const anchor of anchors) {
      if (isRegionPointPlayable(this.region, anchor.x, anchor.y, 0.45) && !this.isBlocked(anchor.x, anchor.y, 0.4)) {
        return anchor;
      }
    }
    return null;
  }

  acceptWildernessQuest(questgiver) {
    if (!questgiver?.quest) return;
    if (this.questState.active.some((quest) => quest.npcId === questgiver.npcId)) {
      this.addToast(`${QUEST_NPCS[questgiver.npcId]?.name ?? "NPC"} har allerede en aktiv quest`);
      this.publishSnapshot();
      return;
    }
    const quest = {
      ...questgiver.quest,
      acceptedAt: Date.now(),
      progress: { ...(questgiver.quest.progress ?? {}) },
    };
    this.questState.active.push(quest);
    this.questState.wildernessNpc = null;
    this.nearbyQuestgiver = null;
    this.addToast(`${QUEST_NPCS[quest.npcId]?.name ?? "NPC"}: ${quest.acceptText}`);
    this.addToast(`${QUEST_NPCS[quest.npcId]?.name ?? "NPC"} kan findes i byen, naar questen skal indleveres`);
    this.publishSnapshot();
  }

  declineWildernessQuest() {
    this.addToast("Quest ikke taget");
    this.publishSnapshot();
  }

  applyQuestKill(monster) {
    let changed = false;
    for (const quest of this.questState.active) {
      if (quest.type === "clear_map") {
        const validTypes = quest.target?.monsters ?? [];
        if (!validTypes.includes(monster.typeName)) continue;
        const kills = Math.max(0, Math.floor(Number(quest.progress?.kills) || 0));
        quest.progress = { ...(quest.progress ?? {}), kills: kills + 1 };
        changed = true;
        continue;
      }
      if (quest.type !== "kill_monsters") continue;
      if (quest.target?.monster !== monster.typeName) continue;
      const needed = Math.max(1, Math.floor(Number(quest.target.count) || 1));
      const current = Math.max(0, Math.floor(Number(quest.progress?.kills) || 0));
      if (current >= needed) continue;
      quest.progress = { ...(quest.progress ?? {}), kills: Math.min(needed, current + 1) };
      changed = true;
      if (quest.progress.kills >= needed) this.addToast(`${quest.title} klar til indlevering`);
    }
    if (changed) this.publishSnapshot();
  }

  dropQuestLoot(monster) {
    
    for (const quest of this.questState.active) {
      if (quest.type !== "collect_quest_item") continue;
      const questItemTargets = questItemTargetsForQuest(quest);
      for (const target of questItemTargets) {
        if (!target?.questItemId) continue;
        if (!this.questItemCanDropInCurrentRegion(target)) continue;
        const needed = Math.max(1, Math.floor(Number(target.count) || 1));
        const picked = questItemCount(this.player.inventory, quest.id, target.questItemId);
        if (picked >= needed) continue;
        const activeDropped = questItemCount(this.loots.map((loot) => loot.item), quest.id, target.questItemId);
        if (picked + activeDropped >= needed) continue;
        if (target.source === "elite" && !monster.elite) continue;
        const dropChance = Number(target.dropChance ?? 0.05);
      const roll = Math.random();
      // Debug/logging for specific rare quest item to help troubleshooting
      
        if (roll > dropChance) continue;
        const item = makeQuestItem(target.questItemId, quest.id);
        if (!item) continue;
        this.loots.push({
          id: createId(),
          type: "item",
          item,
          x: monster.x + (Math.random() - 0.5) * 0.7,
          y: monster.y + (Math.random() - 0.5) * 0.7,
          bob: Math.random() * Math.PI * 2,
          pickupDelay: 0.25,
          despawn: GROUND_LOOT_DESPAWN_SECONDS,
        });
        this.trackItemDropped(item);
        break;
      }
    }
  }

  questItemCanDropInCurrentRegion(target) {
    const allowedRegions = target?.dropRegionIds ?? [];
    if (!allowedRegions.length) return true;
    const currentRegionId = this.region?.mapRegion?.id;
    return Boolean(currentRegionId && allowedRegions.map(String).includes(String(currentRegionId)));
  }

  applyQuestItemPickup(item) {
    const quest = this.questState.active.find((entry) => entry.id === item.questInstanceId);
    if (!quest || quest.type !== "collect_quest_item") return;
    if (isQuestComplete(quest, this.player.inventory)) this.addToast(`${quest.title} klar til indlevering`);
  }

  completeQuest(instanceId) {
    const index = this.questState.active.findIndex((quest) => quest.id === instanceId);
    if (index < 0) return false;
    const quest = this.questState.active[index];
    if (!isQuestComplete(quest, this.player.inventory)) {
      this.addToast(`${quest.title} er ikke faerdig endnu`);
      this.publishSnapshot();
      return false;
    }
    if (!this.questRewardsCanFit(quest)) {
      this.addToast("Rygsaekken er fuld. Lav plads foer questen indleveres");
      this.publishSnapshot();
      return false;
    }

    const rewardSummary = this.grantQuestRewards(quest);
    if (quest.type === "collect_quest_item") this.consumeQuestItems(quest);
    this.questState.active.splice(index, 1);
    if (!quest.repeatable && !this.questState.completed.includes(quest.questId)) {
      this.questState.completed.push(quest.questId);
    }
    this.player.stats.questsCompleted += 1;
    this.questState.cityFade.push({ npcId: quest.npcId, startedAt: Date.now() });
    this.addToast(`${quest.title} indleveret`);
    this.levelUpIfNeeded();
    this.publishSnapshot();
    this.saveProgress();
    return {
      ok: true,
      questTitle: quest.title,
      rewards: rewardSummary,
    };
  }

  grantQuestRewards(quest) {
    const rewards = quest.rewards ?? {};
    const xp = Math.max(0, Math.floor(Number(rewards.xp) || ((rewards.xpPerKill ?? 0) * (quest.target?.count ?? 0))));
    const gold = Math.max(0, Math.floor(Number(rewards.gold) || ((rewards.goldPerKill ?? 0) * (quest.target?.count ?? 0))));
    const summary = {
      xp,
      gold,
      resources: [],
      items: [],
    };
    if (xp) {
      this.player.xp += xp;
      this.addFloater(this.player.x, this.player.y, `+${xp} xp`, "#e0aa3f", 1);
    }
    if (gold) {
      this.player.gold += gold;
      this.player.stats.goldEarned += gold;
      this.addFloater(this.player.x, this.player.y, `+${gold} g`, "#f1c657", 1);
    }
    for (const reward of rewards.resources ?? []) {
      const resource = makeResourceItem(reward.resource, reward.count ?? 1);
      if (resource) {
        this.addInventoryItem(resource);
        summary.resources.push({
          id: resource.resourceId,
          name: resource.name,
          count: Math.max(1, Math.floor(Number(resource.count) || 1)),
        });
      }
    }
    if (rewards.randomItem) {
      const item = this.rollQuestRewardItem();
      this.addInventoryItem(item);
      summary.items.push({
        id: item.id,
        name: item.name,
        rarity: item.rarity,
      });
    }
    return summary;
  }

  questRewardsCanFit(quest) {
    const simulated = this.player.inventory
      .filter((item) => !questConsumesQuestItem(quest, item))
      .map((item) => ({ ...item }));
    // simulate consuming quest requirements so rewards fit check is accurate
    if (quest.type === "collect_quest_item") {
      if (Array.isArray(quest.target?.resources) && quest.target.resources.length > 0) {
        const inputs = {};
        for (const r of quest.target.resources) inputs[r.resource] = (inputs[r.resource] || 0) + (r.count ?? 1);
        consumeResourceInputs(simulated, inputs);
      }
      if (Array.isArray(quest.target?.items) && quest.target.items.length > 0) {
        for (const req of quest.target.items) {
          let need = Math.max(1, Math.floor(Number(req.count) || 1));
          for (let i = simulated.length - 1; i >= 0 && need > 0; i -= 1) {
            const it = simulated[i];
            if (!it) continue;
            let match = true;
            if (req.templateId) match = match && (String(it.uniqueId) === String(req.templateId) || String(it.namedId) === String(req.templateId));
            if (req.namePrefix) match = match && String(it.name || "").startsWith(`${req.namePrefix} `);
            if (req.baseName) match = match && String(it.baseName || "") === String(req.baseName);
            if (req.rarity) match = match && String(it.rarity || "") === String(req.rarity);
            if (match) {
              simulated.splice(i, 1);
              need -= 1;
            }
          }
          if (need > 0) return false;
        }
      }
    }
    for (const reward of quest.rewards?.resources ?? []) {
      const resource = makeResourceItem(reward.resource, reward.count ?? 1);
      if (resource && !inventoryCanAccept(simulated, resource)) return false;
    }
    if (quest.rewards?.randomItem && simulated.length >= MAX_INVENTORY) return false;
    return true;
  }

  rollQuestRewardItem() {
    const minIndex = RARITIES.findIndex((rarity) => rarity.id === "upgraded");
    for (let i = 0; i < 12; i += 1) {
      const item = makeItem(this.player.level, Math.random());
      const rarityIndex = RARITIES.findIndex((rarity) => rarity.id === item.rarity);
      if (rarityIndex >= minIndex) return item;
    }
    const item = makeItem(this.player.level + 3, Math.random());
    item.rarity = "upgraded";
    item.rarityLabel = "Upgraded";
    item.rarityColor = "#58d96d";
    item.value = itemValue(item);
    return item;
  }

  consumeQuestItems(quest) {
    // consume resources or specific items if defined, otherwise fallback to quest items
    if (Array.isArray(quest.target?.resources) && quest.target.resources.length > 0) {
      const inputs = {};
      for (const r of quest.target.resources) inputs[r.resource] = (inputs[r.resource] || 0) + (r.count ?? 1);
      consumeResourceInputs(this.player.inventory, inputs);
      this.addToast("Quest resources used");
      this.publishSnapshot();
      return;
    }
    if (Array.isArray(quest.target?.items) && quest.target.items.length > 0) {
      for (const req of quest.target.items) {
        let need = Math.max(1, Math.floor(Number(req.count) || 1));
        for (let i = this.player.inventory.length - 1; i >= 0 && need > 0; i -= 1) {
          const it = this.player.inventory[i];
          if (!it) continue;
          let match = true;
          if (req.templateId) match = match && (String(it.uniqueId) === String(req.templateId) || String(it.namedId) === String(req.templateId));
          if (req.namePrefix) match = match && String(it.name || "").startsWith(`${req.namePrefix} `);
          if (req.baseName) match = match && String(it.baseName || "") === String(req.baseName);
          if (req.rarity) match = match && String(it.rarity || "") === String(req.rarity);
          if (match) {
            this.player.inventory.splice(i, 1);
            need -= 1;
          }
        }
      }
      this.addToast("Quest items consumed");
      this.publishSnapshot();
      return;
    }

    // legacy quest items
    for (const target of questItemTargetsForQuest(quest)) {
      const needed = Math.max(1, Math.floor(Number(target.count) || 1));
      let removed = 0;
      this.player.inventory = this.player.inventory.filter((item) => {
        if (removed >= needed || item.mode !== "quest" || item.questItemId !== target.questItemId || item.questInstanceId !== quest.id) return true;
        removed += 1;
        return false;
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
    if (isResourceItem(item)) return;
    if (isPotionItem(item)) {
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
    const count = Math.max(0, Math.floor(Number(this.player.potions?.[type]) || 0));
    if (count <= 0) return;

    const stats = this.calcStats();
    const pct = 0.25;
    if (type === "health") {
      this.player.hp = clamp(this.player.hp + stats.maxHp * pct, 0, stats.maxHp);
      this.addFloater(this.player.x, this.player.y, `+${Math.floor(stats.maxHp * pct)} liv`, "#58d96d", 0.95);
    } else {
      this.player.mana = clamp(this.player.mana + stats.maxMana * pct, 0, stats.maxMana);
      this.addFloater(this.player.x, this.player.y, `+${Math.floor(stats.maxMana * pct)} mana`, "#58bfff", 0.95);
    }
    this.player.potions[type] = Math.max(0, count - 1);
    if (type === "health") this.player.stats.healthPotionsUsed += 1;
    if (type === "mana") this.player.stats.manaPotionsUsed += 1;
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
      despawn: GROUND_LOOT_DESPAWN_SECONDS,
    });
    this.addToast(`Droppet: ${item.name}`);
    this.publishSnapshot();
  }

  takeInventoryItem(index) {
    const item = this.player.inventory[index];
    if (!item) return null;
    this.player.inventory.splice(index, 1);
    this.publishSnapshot();
    return item;
  }

  returnInventoryItem(item) {
    const accepted = this.addInventoryItem(item);
    if (accepted) this.publishSnapshot();
    return accepted;
  }

  consumeResource(resourceId, amount) {
    const count = Math.max(0, Math.floor(Number(amount) || 0));
    if (!resourceId || count <= 0) return 0;
    const available = resourceCount(this.player.inventory, resourceId);
    const used = Math.min(available, count);
    if (used <= 0) return 0;
    consumeResourceInputs(this.player.inventory, { [resourceId]: used });
    this.addToast(`Used ${used}x ${RESOURCE_DEFS[resourceId]?.name ?? resourceId}`);
    this.publishSnapshot();
    return used;
  }

  consumeGold(amount) {
    const count = Math.max(0, Math.floor(Number(amount) || 0));
    if (count <= 0) return 0;
    const used = Math.min(Math.max(0, Math.floor(Number(this.player.gold) || 0)), count);
    if (used <= 0) return 0;
    this.player.gold -= used;
    this.addToast(`Used ${used} gold`);
    this.publishSnapshot();
    return used;
  }

  destroyInventoryItem(index, force = false) {
    const item = this.player.inventory[index];
    if (!item) return;
    if (item.rarity === "legendary" && !force) {
      this.addToast("Bekraeft destroy af roedt udstyr");
      return;
    }
    this.player.inventory.splice(index, 1);
    if (!isResourceItem(item)) {
      this.player.stats.itemsDestroyed += 1;
      incrementStatMap(this.player.stats.itemsDestroyedByRarity, itemRarityBucket(item));
    }
    this.dropDestroyedItemResources(item);
    this.addToast(`Destrueret: ${item.name}`);
    this.publishSnapshot();
  }

  dropDestroyedItemResources(item) {
    const profile = DESTROYED_ITEM_RESOURCE_DROPS[item.unique ? "unique" : item.rarity] ?? DESTROYED_ITEM_RESOURCE_DROPS.normal;
    const entries = [
      ...(profile.guaranteed ?? []).map((entry) => ({ ...entry, chance: 1 })),
      ...(profile.rare ?? []),
    ];
    for (const entry of entries) {
      if (Math.random() > (entry.chance ?? 1)) continue;
      const resource = makeResourceItem(entry.resource, randomInt(entry.min ?? 1, entry.max ?? entry.min ?? 1));
      if (!resource) continue;
      if (this.addInventoryItem(resource)) continue;
      this.loots.push({
        id: createId(),
        type: "item",
        item: resource,
        x: this.player.x + this.player.facingX * 0.72 + (Math.random() - 0.5) * 0.35,
        y: this.player.y + this.player.facingY * 0.72 + (Math.random() - 0.5) * 0.35,
        bob: Math.random() * Math.PI * 2,
        pickupDelay: 0.75,
        despawn: GROUND_LOOT_DESPAWN_SECONDS,
      });
      this.trackItemDropped(resource);
    }
  }

  trackItemDropped(item) {
    if (!item || isResourceItem(item)) return;
    this.player.stats.itemsDropped += 1;
    this.player.stats.itemsNotPicked += 1;
    incrementStatMap(this.player.stats.itemsDroppedByRarity, itemRarityBucket(item));
    incrementStatMap(this.player.stats.itemsNotPickedByRarity, itemRarityBucket(item));
  }

  trackItemPicked(item) {
    if (!item || isResourceItem(item)) return;
    incrementStatMap(this.player.stats.itemsPickedByRarity, itemRarityBucket(item));
    this.player.stats.itemsNotPicked = Math.max(0, this.player.stats.itemsNotPicked - 1);
    decrementStatMap(this.player.stats.itemsNotPickedByRarity, itemRarityBucket(item));
  }

  mergeInventoryItem(index) {
    const item = this.player.inventory[index];
    if (!item) return null;
    if (isResourceItem(item)) {
      const recipes = resourceMergeRecipesFor(item, this.player.inventory).filter((recipe) => !recipe.requiresFire || this.isNearFireSource());
      if (recipes.length > 1) {
        return {
          type: "resource-choice",
          index,
          itemId: item.id,
          options: recipes.map((recipe) => resourceMergeOption(recipe)),
        };
      }
      const recipe = recipes[0] ?? resourceMergeRecipeFor(item, this.player.inventory);
      if (!recipe) {
        this.addToast("Ikke nok resources til merge");
        return null;
      }
      if (recipe.requiresFire && !this.isNearFireSource()) {
        this.addToast("Kraever fire eller fire beacon");
        return null;
      }
      return this.mergeInventoryResourceWithRecipe(index, recipe.output);
    }
    const currentRarityIndex = RARITIES.findIndex((rarity) => rarity.id === item.rarity);
    const nextRarity = RARITIES[currentRarityIndex + 1];
    if (currentRarityIndex < 0 || !nextRarity) {
      this.addToast("Kan ikke merges hoejere");
      return null;
    }

    const matches = [];
    for (let i = 0; i < this.player.inventory.length; i += 1) {
      if (itemsCanMerge(item, this.player.inventory[i])) matches.push(i);
      if (matches.length >= 3) break;
    }

    if (matches.length < 3) {
      this.addToast("Kraever 3 ens items");
      return null;
    }

    const merged = this.makeMergedItem(matches.map((matchIndex) => this.player.inventory[matchIndex]), nextRarity);
    for (const matchIndex of matches.slice().sort((a, b) => b - a)) {
      this.player.inventory.splice(matchIndex, 1);
    }
    this.player.inventory.push(merged);
    this.addToast(`Merged: ${merged.name}`);
    this.publishSnapshot();
    return null;
  }

  mergeInventoryResourceWithRecipe(index, outputResourceId) {
    const item = this.player.inventory[index];
    if (!item || !isResourceItem(item)) return false;
    const recipe = resourceMergeRecipesFor(item, this.player.inventory).find((entry) => entry.output === outputResourceId);
    if (!recipe) {
      this.addToast("Ikke nok resources til merge");
      return false;
    }
    if (recipe.requiresFire && !this.isNearFireSource()) {
      this.addToast("Kraever fire eller fire beacon");
      return false;
    }
    const output = makeResourceItem(recipe.output, recipe.count ?? 1);
    if (!output) return false;
    if (!resourceOutputCanFitAfterMerge(this.player.inventory, recipe, output)) {
      this.addToast("Rygsaekken er fuld");
      return false;
    }
    consumeResourceInputs(this.player.inventory, recipe.inputs);
    if (!this.addInventoryItem(output)) {
      this.addToast("Rygsaekken er fuld");
      return false;
    }
    this.addToast(`Merged: ${output.name}`);
    this.publishSnapshot();
    return true;
  }

  isNearFireSource() {
    for (const chunk of this.nearbyChunks(1)) {
      for (const object of chunk.objects) {
        if (object.type !== "fireplace" && object.type !== "firebeacon") continue;
        if (distance(this.player, object) <= this.player.radius + object.radius + 1.2) return true;
      }
    }
    return false;
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

  addPotionLoot(item) {
    const type = item?.potionType;
    if (type !== "health" && type !== "mana") return false;
    if (!this.player.potions) this.player.potions = { health: 0, mana: 0 };
    const current = Math.max(0, Math.floor(Number(this.player.potions[type]) || 0));
    if (current >= MAX_POTION_STACK) return false;
    this.player.potions[type] = Math.min(MAX_POTION_STACK, current + Math.max(1, Math.floor(Number(item.count) || 1)));
    return true;
  }

  addInventoryItem(item) {
    if (!item) return false;
    if (isResourceItem(item)) {
      let remaining = Math.max(1, Math.floor(Number(item.count) || 1));
      const stackMax = resourceStackMax(item.resourceId);
      for (const stack of this.player.inventory) {
        if (stack.mode !== "resource" || stack.resourceId !== item.resourceId) continue;
        const current = Math.max(1, Math.floor(Number(stack.count) || 1));
        const room = stackMax - current;
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
        const count = Math.min(stackMax, remaining);
        this.player.inventory.push({ ...item, id: createId(), count });
        remaining -= count;
      }
      return true;
    }
    if (isPotionItem(item)) {
      return this.addPotionLoot(item);
    }
    if (this.player.inventory.length >= MAX_INVENTORY) return false;
    this.player.inventory.push(item);
    return true;
  }

  compactPotionStacks() {
    const equipment = this.player.inventory.filter((item) => !isPotionItem(item));
    const potions = this.player.inventory.filter((item) => isPotionItem(item));
    this.player.inventory = equipment;
    for (const potion of potions) {
      this.addPotionLoot(potion);
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

  nearestDestructibleObject(maxRange) {
    let best = null;
    let bestD = maxRange;
    for (const chunk of this.nearbyChunks(1)) {
      for (const object of chunk.objects) {
        if (!isDestructibleObject(object)) continue;
        const d = distance(this.player, object);
        if (d < bestD) {
          best = object;
          bestD = d;
        }
      }
    }
    return best;
  }

  findObjectById(id) {
    if (!id) return null;
    for (const chunk of this.nearbyChunks(2)) {
      const object = chunk.objects.find((entry) => entry.id === id);
      if (object) return object;
    }
    return null;
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

  objectAtScreen(x, y) {
    let best = null;
    let bestD = 999;
    for (const chunk of this.nearbyChunks(2)) {
      for (const object of chunk.objects) {
        if (!isDestructibleObject(object)) continue;
        const screen = worldToScreen(object.x, object.y, 0, this.camera);
        const hit = destructibleObjectScreenHit(object);
        const d = Math.hypot(screen.x - x, screen.y - hit.offsetY - y);
        if (d < hit.radius && d < bestD) {
          best = object;
          bestD = d;
        }
      }
    }
    return best;
  }

  questgiverAtScreen(x, y) {
    const questgiver = this.questState.wildernessNpc;
    if (!questgiver) return null;
    const screen = worldToScreen(questgiver.x, questgiver.y, 0, this.camera);
    const d = Math.hypot(screen.x - x, screen.y - 34 - y);
    return d < 42 ? questgiver : null;
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
    const savedResourceId = normalizeResourceId(item.resourceId);
    const normalized = {
      id,
      name: String(item.name ?? "Unknown"),
      baseName: String(item.baseName ?? item.name ?? "Unknown"),
      rarity: String(item.rarity ?? "normal"),
      rarityLabel: String(item.rarityLabel ?? "Normal"),
      rarityColor: String(item.rarityColor ?? "#f5f3ea"),
      unique: Boolean(item.unique || item.uniqueId),
      uniqueId: item.uniqueId ? String(item.uniqueId) : undefined,
      named: Boolean(item.named || item.namedId),
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
      resourceId: savedResourceId,
      questItemId: item.questItemId ? String(item.questItemId) : undefined,
      questInstanceId: item.questInstanceId ? String(item.questInstanceId) : undefined,
      iconIndex: Number.isFinite(Number(item.iconIndex)) ? Math.floor(Number(item.iconIndex)) : undefined,
      stackMax: isResourceItem(item) ? resourceStackMax(savedResourceId) : undefined,
      count: isPotionItem(item)
        ? clamp(Math.floor(Number(item.count) || 1), 1, MAX_POTION_STACK)
        : isResourceItem(item)
          ? clamp(Math.floor(Number(item.count) || 1), 1, resourceStackMax(savedResourceId))
          : undefined,
    };
    if (isResourceItem(normalized)) {
      const def = RESOURCE_DEFS[normalized.resourceId];
      normalized.name = def?.name ?? normalized.name;
      normalized.baseName = def?.name ?? normalized.baseName;
      normalized.rarityLabel = "Resource";
      normalized.rarityColor = RESOURCE_RARITY_COLOR;
      normalized.resourceColor = def?.color;
      normalized.iconIndex = def?.iconIndex ?? normalized.iconIndex;
      normalized.iconSheet = def?.sheet ?? normalized.iconSheet;
      normalized.stackMax = def?.stackMax ?? normalized.stackMax;
      normalized.iconUrl = def?.iconUrl ?? iconUrlFromKey(deriveIconKey(normalized));
    }
    if (isQuestItem(normalized)) {
      const def = QUEST_ITEM_DEFS[normalized.questItemId];
      normalized.name = def?.name ?? normalized.name;
      normalized.baseName = def?.name ?? normalized.baseName;
      normalized.rarity = "unique";
      normalized.rarityLabel = "Quest";
      normalized.rarityColor = "#ffcf5a";
      normalized.slot = "quest";
      normalized.iconUrl = def?.iconUrl ?? normalized.iconUrl;
    }
    if (normalized.uniqueId) {
      const def = UNIQUE_ITEMS.find((entry) => entry.id === normalized.uniqueId);
      // Always re-derive from definition — never trust the saved iconUrl for unique items.
      normalized.iconUrl = def?.iconUrl || iconUrlFromKey(deriveIconKey({ uniqueId: normalized.uniqueId }));
    } else if (normalized.namedId) {
      const def = NAMED_ITEM_TEMPLATES.find((entry) => entry.id === normalized.namedId);
      // Named items: use definition iconUrl if set, else fall through to baseName mapping.
      normalized.iconUrl = def?.iconUrl || undefined;
    } else if (!isResourceItem(normalized) && !isQuestItem(normalized)) {
      // Generic gear: clear stale saved iconUrl so baseName mapping takes over.
      normalized.iconUrl = undefined;
    }
    normalized.value = Math.max(1, Math.floor(Number(item.value) || itemValue(normalized)));
    return withItemIcon(withItemFlags(normalized));
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
    this.player.popularity = clamp(Number(savedPlayer.popularity) || 0, POPULARITY_CONFIG.min, POPULARITY_CONFIG.max);
    this.player.hp = Math.max(0, Number(savedPlayer.hp) || this.player.hp);
    this.player.mana = Math.max(0, Number(savedPlayer.mana) || this.player.mana);
    this.player.potions = {
      health: clamp(Math.floor(Number(savedPlayer.potions?.health) || 0), 0, MAX_POTION_STACK),
      mana: clamp(Math.floor(Number(savedPlayer.potions?.mana) || 0), 0, MAX_POTION_STACK),
    };
    this.player.stats = normalizeHeroStats(savedPlayer.stats);
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

    this.questState = normalizeSavedQuestState(payload.quests);

    if (Array.isArray(savedPlayer.inventory)) {
      const normalizedInventory = savedPlayer.inventory
        .map((item) => this.normalizeSavedItem(item))
        .filter(Boolean);
      for (const item of normalizedInventory) {
        if (isPotionItem(item)) this.addPotionLoot(item);
      }
      this.player.inventory = normalizedInventory
        .filter((item) => !isPotionItem(item))
        .slice(0, MAX_INVENTORY);
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
      // If we're replacing active loots during load, ensure any existing loots
      // are processed as despawn so quest dropped counters stay consistent.
      for (const loot of this.loots) {
        try { this.handleLootDespawn(loot); } catch (e) {}
      }
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
        popularity: this.player.popularity,
        potions: { ...this.player.potions },
        stats: { ...this.player.stats, killsByMonster: { ...this.player.stats.killsByMonster } },
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
      quests: {
        active: this.questState.active.map((quest) => ({ ...quest, progress: { ...(quest.progress ?? {}) } })),
        completed: [...this.questState.completed],
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
        groundSheetId: tile.groundSheetId,
        water: tile.water,
        waterVariant: tile.waterVariant,
        baseColor: biome.tile[0],
        baseAlpha: tile.water ? 1 : transitionTile ? 0.08 : undefined,
        edgeFeather: transitionTile ? 0.18 : undefined,
        visualScale: transitionTile ? 1.24 : undefined,
        path: !tile.water && tile.path,
        pathColor: biome.path,
      });
    }

    if (chunk.region) {
      drawRegionMarkerIfInChunk(ctx, chunk, chunk.region.start, "start", originX, originY);
      drawRegionMarkerIfInChunk(ctx, chunk, chunk.region.end, "exit", originX, originY);
    }

    if (chunk.region) {
      const halfW = TILE_W * 0.5 + 1;
      const halfH = TILE_H * 0.5 + 1;
      ctx.save();
      ctx.beginPath();
      for (const tile of tiles) {
        const tx = tile.x - chunk.x;
        const ty = tile.y - chunk.y;
        const x = originX + (tx - ty) * (TILE_W / 2);
        const y = originY + (tx + ty) * (TILE_H / 2);
        const centerY = y + TILE_H * 0.5;
        ctx.moveTo(x, centerY - halfH);
        ctx.lineTo(x + halfW, centerY);
        ctx.lineTo(x, centerY + halfH);
        ctx.lineTo(x - halfW, centerY);
        ctx.closePath();
      }
      ctx.clip();
    }

    for (const decal of chunk.decals) {
      const tx = decal.x - chunk.x;
      const ty = decal.y - chunk.y;
      const x = originX + (tx - ty) * (TILE_W / 2);
      const y = originY + (tx + ty) * (TILE_H / 2) + TILE_H * 0.52;
      drawTerrainDecal(ctx, decal, x, y, this.atlas);
    }

    if (chunk.region) {
      ctx.restore();
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
            biome: BIOMES[object.renderBiomeId] ?? chunk.biome,
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

    const questgiver = this.questState.wildernessNpc;
    if (questgiver) {
      const screen = worldToScreen(questgiver.x, questgiver.y, 0, this.camera);
      if (visibleScreenPoint(screen, this.width, this.height, 170)) {
        drawables.push({ type: "questgiver", questgiver, screen, layer: 1, depth: questgiver.x + questgiver.y + 0.32 });
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
        this.drawObjectHealthBar(ctx, item.object, item.screen);
      }
      if (item.type === "loot") drawLoot(ctx, item.screen, item.loot, this.atlas);
      if (item.type === "projectile") drawProjectile(ctx, item.screen, item.projectile, this.atlas);
      if (item.type === "questgiver") drawQuestgiver(ctx, item.screen, item.questgiver, this.time);
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

  drawObjectHealthBar(ctx, object, screen) {
    if (!isDestructibleObject(object) || !object.maxHp || object.hp >= object.maxHp) return;
    const pct = clamp(object.hp / object.maxHp, 0, 1);
    const width = Math.max(24, Math.min(48, 28 + object.radius * 26));
    const yOffset = object.type === "pine" || object.type === "old-oak"
      ? 92 * (object.size ?? 1)
      : object.type === "crystal"
        ? 72 * (object.size ?? 1)
        : object.type === "building"
          ? 110 * (object.size ?? 1)
          : 42 * (object.size ?? 1);
    const x = screen.x - width / 2;
    const y = screen.y - yOffset;
    ctx.save();
    ctx.fillStyle = "rgba(20, 18, 15, 0.58)";
    ctx.fillRect(x, y, width, 5);
    ctx.fillStyle = pct > 0.5 ? "#58d96d" : pct > 0.25 ? "#ffd85d" : "#ff7272";
    ctx.fillRect(x, y, width * pct, 5);
    ctx.strokeStyle = "rgba(255, 245, 220, 0.45)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 0.5, y - 0.5, width + 1, 6);
    ctx.restore();
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

  setInputLocked(locked) {
    this.inputLocked = Boolean(locked);
    if (!this.inputLocked) return;
    this.keys.clear();
    this.pointer.down = false;
    this.player.target = null;
    this.player.attackTargetId = null;
    this.player.attackObjectId = null;
  }

  handlePointerMove(event) {
    if (this.inputLocked) return;
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
    if (this.inputLocked) return;
    if (!this.hoverMonsterId) return;
    this.hoverMonsterId = null;
    this.publishSnapshot();
  }

  handlePointerDown(event) {
    if (this.inputLocked) return;
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
      this.player.attackObjectId = null;
      const stats = this.calcStats();
      if (distance(this.player, monster) <= stats.range + monster.radius) {
        this.primaryAttack(monster);
      } else {
        this.player.target = { x: monster.x, y: monster.y };
      }
      return;
    }
    const object = this.objectAtScreen(this.pointer.x, this.pointer.y);
    if (object) {
      this.player.attackTargetId = null;
      this.player.attackObjectId = object.id;
      if (distance(this.player, object) <= DESTRUCTIBLE_OBJECT_ATTACK_RANGE + object.radius) {
        this.primaryAttack(object);
      } else {
        this.player.target = { x: object.x, y: object.y };
      }
      return;
    }
    const questgiver = this.questgiverAtScreen(this.pointer.x, this.pointer.y);
    if (questgiver) {
      this.player.attackTargetId = null;
      this.player.attackObjectId = null;
      this.player.target = { x: questgiver.x, y: questgiver.y };
      return;
    }
    this.player.attackTargetId = null;
    this.player.attackObjectId = null;
    this.player.target = { x: this.pointer.worldX, y: this.pointer.worldY };
  }

  handlePointerUp() {
    if (this.inputLocked) return;
    this.pointer.down = false;
  }

  handleKeyDown(event) {
    if (this.inputLocked) return;
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
    if (key === "e" && this.nearbyQuestgiver) {
      event.preventDefault();
      this.publishSnapshot();
    }
  }

  handleKeyUp(event) {
    if (this.inputLocked) return;
    this.keys.delete(event.key.toLowerCase());
  }

  itemSummary(item) {
    const parts = [];
    if (isResourceItem(item)) {
      parts.push(`Resource stack ${item.count ?? 1} / ${resourceStackMax(item.resourceId)}`);
    } else if (isQuestItem(item)) {
      parts.push("Quest item");
    } else if (isPotionItem(item)) {
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
    const healthPotions = Math.max(0, Math.floor(Number(this.player.potions?.health) || 0));
    const manaPotions = Math.max(0, Math.floor(Number(this.player.potions?.mana) || 0));
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
        popularity: Math.round(clamp(Number(this.player.popularity) || 0, POPULARITY_CONFIG.min, POPULARITY_CONFIG.max)),
        damage: `${stats.damageMin}-${stats.damageMax}`,
        armor: stats.armor,
        mode: stats.mode,
        stats: { ...this.player.stats, killsByMonster: { ...this.player.stats.killsByMonster } },
      },
      zone: {
        name: chunk.biome.name,
        level: this.region.index,
        seed: this.region.seed,
      },
      region: {
        name: this.region.mapRegion?.label ?? this.region.biome.name,
        index: this.region.index,
        seed: this.region.seed,
        areaMapId: this.region.mapRegion?.areaMapId ?? null,
        regionId: this.region.mapRegion?.id ?? null,
      },
      regionRun: this.activeMapRegion ? { ...this.activeMapRegion } : null,
      mobs: this.monsterCounterSnapshot(),
      mapReturn: this.mapReturn ? { ...this.mapReturn } : null,
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
          canMerge: isResourceItem(item)
            ? Boolean(resourceMergeRecipeFor(item, this.player.inventory))
            : canMergeItem(item) && !isPotionItem(item) && mergeCount >= 3 && rarityIndex >= 0 && rarityIndex < RARITIES.length - 1,
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
      quests: {
        active: this.questState.active.map((quest) => questSnapshot(quest, this.player.inventory)),
        completed: [...this.questState.completed],
        cityFade: this.questState.cityFade.filter((fade) => Date.now() - fade.startedAt < 1400),
        wildernessNpc: this.questState.wildernessNpc ? {
          npcId: this.questState.wildernessNpc.npcId,
          quest: questSnapshot(this.questState.wildernessNpc.quest, this.player.inventory),
        } : null,
        nearbyQuestgiver: this.nearbyQuestgiver ? {
          id: this.nearbyQuestgiver.id,
          npcId: this.nearbyQuestgiver.npcId,
          quest: questSnapshot(this.nearbyQuestgiver.quest, this.player.inventory),
        } : null,
      },
      toasts: this.toasts.map((toast) => ({ id: toast.id, text: toast.text })),
    });
  }

  monsterCounterSnapshot() {
    const monsters = [...this.monsters.values()];
    const total = monsters.length;
    const alive = monsters.filter((monster) => !monster.dead).length;
    return {
      total,
      alive,
      killed: Math.max(0, total - alive),
    };
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
  ctx.globalAlpha = type === "exit" ? 0.96 : 0.45;
  ctx.strokeStyle = type === "exit" ? "#f4da96" : "#8bdfff";
  ctx.lineWidth = type === "exit" ? 4 : 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, type === "exit" ? 31 : 25, type === "exit" ? 15 : 12, 0, 0, Math.PI * 2);
  ctx.stroke();
  if (type === "exit") {
    ctx.fillStyle = "rgba(244, 218, 150, 0.24)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 36, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f4da96";
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(8, -7);
    ctx.lineTo(-8, -7);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function rollItemOfRarity(level, rarityId, tries = 60) {
  const wanted = RARITIES.find((entry) => entry.id === rarityId);
  if (!wanted) return null;

  for (let i = 0; i < tries; i += 1) {
    const item = makeItem(level, Math.random());
    if (item.rarity === rarityId) return item;
  }

  // Fallback: force rarity to guarantee drop quality for configured object loot.
  const fallback = makeItem(level, Math.random());
  fallback.rarity = wanted.id;
  fallback.rarityLabel = wanted.label;
  fallback.rarityColor = wanted.color;
  const prefixes = PREFIXES[wanted.id] ?? [];
  if (prefixes.length > 0 && fallback.baseName) {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    fallback.name = `${prefix} ${fallback.baseName}`;
  }
  fallback.value = itemValue(fallback);
  return fallback;
}

function preventDefault(event) {
  event.preventDefault();
}

function rollEliteVariant() {
  const entries = [
    { variant: null, weight: ELITE_NO_VARIANT_WEIGHT },
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

function monsterPopularityDelta(monster, playerLevel) {
  const rule = POPULARITY_CONFIG.monsterRules[monster?.typeName];
  const base = Number(rule?.change ?? POPULARITY_CONFIG.defaultMonsterChange) || 0;
  if (!base) return 0;
  const levelDelta = Math.floor(Number(monster?.level) || 1) - Math.floor(Number(playerLevel) || 1);
  const levelMultiplier = clamp(
    1 + levelDelta * POPULARITY_CONFIG.monsterLevelScalePerLevel,
    POPULARITY_CONFIG.minMonsterLevelMultiplier,
    POPULARITY_CONFIG.maxMonsterLevelMultiplier,
  );
  const eliteMultiplier = monster?.elite
    ? 1 + eliteVariantLevelPct(monster.elite) * POPULARITY_CONFIG.eliteMultiplier
    : 1;
  return base * levelMultiplier * eliteMultiplier;
}

function housePopularityDelta(regionLevel) {
  const house = POPULARITY_CONFIG.houseDestroy;
  const level = Math.max(1, Math.floor(Number(regionLevel) || 1));
  return house.baseCost * (1 + (level - 1) * house.regionLevelScale);
}

function itemsCanMerge(a, b) {
  if (!a || !b) return false;
  if (isPotionItem(a) || isPotionItem(b)) return false;
  if (isResourceItem(a) || isResourceItem(b)) return false;
  if (!canMergeItem(a) || !canMergeItem(b)) return false;
  if (a.unique || b.unique || a.named || b.named) return false;
  return a.baseName === b.baseName
    && a.rarity === b.rarity
    && a.slot === b.slot
    && a.mode === b.mode;
}

function itemIconIndex(item) {
  if (isResourceItem(item)) return item.iconIndex ?? RESOURCE_DEFS[item.resourceId]?.iconIndex ?? 0;
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
  if (isQuestItem(item)) return "items";
  if (isResourceItem(item)) return RESOURCE_DEFS[item.resourceId]?.sheet ?? "resources";
  const armorBases = new Set(["Helm", "Gorget", "Chestplate", "Vambraces", "Greaves", "Bracelet", "Boots", "Gloves"]);
  return armorBases.has(item?.baseName) ? "armor" : "items";
}

function makeQuestItem(questItemId, questInstanceId) {
  const def = QUEST_ITEM_DEFS[questItemId];
  if (!def) return null;
  return withItemIcon(withItemFlags({
    id: createId(),
    name: def.name,
    baseName: def.name,
    questItemId,
    questInstanceId,
    rarity: "unique",
    rarityLabel: "Quest",
    rarityColor: "#ffcf5a",
    slot: "quest",
    mode: "quest",
    level: 1,
    damageMin: 0,
    damageMax: 0,
    range: 0,
    cooldown: 0,
    armor: 0,
    maxHp: 0,
    maxMana: 0,
    speed: 0,
    magic: 0,
    iconUrl: def.iconUrl ?? QUEST_CONFIG.questItemIconPlaceholder,
    value: 0,
  }));
}

function makeResourceItem(resourceId, count = 1) {
  const def = RESOURCE_DEFS[resourceId];
  if (!def) return null;
  return withItemIcon(withItemFlags({
    id: createId(),
    name: def.name,
    baseName: def.name,
    resourceId,
    rarity: "normal",
    rarityLabel: "Resource",
    rarityColor: RESOURCE_RARITY_COLOR,
    resourceColor: def.color,
    slot: "resource",
    mode: "resource",
    level: 1,
    count: clamp(Math.floor(Number(count) || 1), 1, def.stackMax),
    stackMax: def.stackMax,
    iconIndex: def.iconIndex,
    iconSheet: def.sheet ?? "resources",
    value: def.value,
  }));
}

function pickupStatusText(item, count = 1) {
  const amount = Math.max(1, Math.floor(Number(count) || 1));
  return `+${amount}x ${item?.name ?? "Item"}`;
}

function resourceMergeRecipeFor(item, inventory) {
  if (!item?.resourceId) return null;
  return resourceMergeRecipesFor(item, inventory)[0] ?? null;
}

function resourceMergeRecipesFor(item, inventory) {
  if (!item?.resourceId) return [];
  return RESOURCE_MERGE_RECIPES.filter((recipe) => (
    Object.hasOwn(recipe.inputs, item.resourceId)
    && hasResourceInputs(inventory, recipe.inputs)
  ));
}

function resourceMergeOption(recipe) {
  const output = RESOURCE_DEFS[recipe.output];
  const previewItem = withItemIcon({
    mode: "resource",
    resourceId: recipe.output,
    name: output?.name ?? recipe.output,
  });
  return {
    output: recipe.output,
    name: output?.name ?? recipe.output,
    count: recipe.count ?? 1,
    iconIndex: output?.iconIndex ?? 0,
    iconSheet: output?.sheet ?? "resources",
    iconUrl: output?.iconUrl ?? previewItem.iconUrl,
    inputs: recipe.inputs,
  };
}

function hasResourceInputs(inventory, inputs) {
  return Object.entries(inputs).every(([resourceId, needed]) => resourceCount(inventory, resourceId) >= needed);
}

function resourceCount(inventory, resourceId) {
  return inventory.reduce((sum, item) => (
    isResourceItem(item) && item.resourceId === resourceId
      ? sum + Math.max(1, Math.floor(Number(item.count) || 1))
      : sum
  ), 0);
}

function consumeResourceInputs(inventory, inputs) {
  for (const [resourceId, neededRaw] of Object.entries(inputs)) {
    let needed = Math.max(0, Math.floor(Number(neededRaw) || 0));
    for (let i = inventory.length - 1; i >= 0 && needed > 0; i -= 1) {
      const item = inventory[i];
      if (!isResourceItem(item) || item.resourceId !== resourceId) continue;
      const count = Math.max(1, Math.floor(Number(item.count) || 1));
      const used = Math.min(count, needed);
      item.count = count - used;
      needed -= used;
      if (item.count <= 0) inventory.splice(i, 1);
    }
  }
}

function resourceOutputCanFitAfterMerge(inventory, recipe, output) {
  const outputMax = resourceStackMax(output.resourceId);
  if (inventory.some((item) => (
    isResourceItem(item)
    && item.resourceId === output.resourceId
    && Math.max(1, Math.floor(Number(item.count) || 1)) < outputMax
  ))) return true;

  let freedSlots = 0;
  for (const [resourceId, neededRaw] of Object.entries(recipe.inputs)) {
    let needed = Math.max(0, Math.floor(Number(neededRaw) || 0));
    for (const item of inventory) {
      if (!isResourceItem(item) || item.resourceId !== resourceId || needed <= 0) continue;
      const count = Math.max(1, Math.floor(Number(item.count) || 1));
      const used = Math.min(count, needed);
      if (count - used <= 0) freedSlots += 1;
      needed -= used;
    }
  }
  return inventory.length - freedSlots < MAX_INVENTORY;
}

function resourceStackMax(resourceId) {
  return RESOURCE_DEFS[resourceId]?.stackMax ?? 99;
}

function normalizeResourceId(resourceId) {
  const id = resourceId ? String(resourceId) : undefined;
  if (id === "iron_ore") return "iron_piece";
  if (id === "small_rock") return "stone_brick";
  return id;
}

function randomInt(min, max) {
  const lo = Math.floor(Number(min) || 1);
  const hi = Math.max(lo, Math.floor(Number(max) || lo));
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

function createHeroStats() {
  return {
    damageDealt: 0,
    damageTaken: 0,
    killsTotal: 0,
    killsByMonster: {},
    meleeAttacks: 0,
    rangedAttacks: 0,
    spellProjectiles: 0,
    spellsCast: 0,
    questsCompleted: 0,
    goldEarned: 0,
    goldLooted: 0,
    itemsPicked: 0,
    resourcesPicked: 0,
    healthPotionsUsed: 0,
    manaPotionsUsed: 0,
    deaths: 0,
    objectsDestroyed: 0,
    objectsDestroyedByType: {},
    itemsDropped: 0,
    itemsDroppedByRarity: {},
    itemsNotPicked: 0,
    itemsNotPickedByRarity: {},
    itemsPickedByRarity: {},
    itemsDestroyed: 0,
    itemsDestroyedByRarity: {},
  };
}

function normalizeHeroStats(stats) {
  const base = createHeroStats();
  if (!stats || typeof stats !== "object") return base;
  const killsByMonster = {};
  if (stats.killsByMonster && typeof stats.killsByMonster === "object") {
    for (const [name, value] of Object.entries(stats.killsByMonster)) {
      killsByMonster[name] = {
        normal: Math.max(0, Math.floor(Number(value?.normal) || 0)),
        elite: Math.max(0, Math.floor(Number(value?.elite) || 0)),
      };
    }
  }
  const mapKeys = [
    "objectsDestroyedByType",
    "itemsDroppedByRarity",
    "itemsNotPickedByRarity",
    "itemsPickedByRarity",
    "itemsDestroyedByRarity",
  ];
  const statMaps = Object.fromEntries(mapKeys.map((key) => [key, normalizeStatMap(stats[key])]));
  return {
    ...base,
    ...Object.fromEntries(Object.keys(base)
      .filter((key) => key !== "killsByMonster")
      .map((key) => [key, Math.max(0, Math.floor(Number(stats[key]) || 0))])),
    killsByMonster,
    ...statMaps,
  };
}

function normalizeStatMap(record) {
  if (!record || typeof record !== "object") return {};
  return Object.fromEntries(Object.entries(record)
    .map(([key, value]) => [key, Math.max(0, Math.floor(Number(value) || 0))])
    .filter(([, value]) => value > 0));
}

function incrementStatMap(record, key, amount = 1) {
  if (!record || !key) return;
  record[key] = Math.max(0, Math.floor(Number(record[key]) || 0)) + Math.max(1, Math.floor(Number(amount) || 1));
}

function decrementStatMap(record, key, amount = 1) {
  if (!record || !key) return;
  const next = Math.max(0, Math.floor(Number(record[key]) || 0) - Math.max(1, Math.floor(Number(amount) || 1)));
  if (next > 0) record[key] = next;
  else delete record[key];
}

function itemRarityBucket(item) {
  if (item?.mode === "quest") return "quest";
  return item?.rarity ?? "normal";
}

function questItemTargetsForQuest(quest) {
  const targets = [];
  if (Array.isArray(quest?.target?.questItems)) {
    targets.push(...quest.target.questItems.filter((target) => target?.questItemId));
  }
  if (quest?.target?.questItemId) {
    targets.push({
      questItemId: quest.target.questItemId,
      count: quest.target.count ?? 1,
      source: quest.target.source,
      dropChance: quest.target.dropChance,
      dropRegionIds: quest.target.dropRegionIds,
    });
  }
  return targets;
}

function questItemCount(items, questInstanceId, questItemId) {
  return (items ?? []).reduce((sum, item) => (
    item?.mode === "quest"
    && String(item.questInstanceId) === String(questInstanceId)
    && String(item.questItemId) === String(questItemId)
      ? sum + 1
      : sum
  ), 0);
}

function questConsumesQuestItem(quest, item) {
  if (!item || item.mode !== "quest" || String(item.questInstanceId) !== String(quest?.id)) return false;
  return questItemTargetsForQuest(quest).some((target) => String(target.questItemId) === String(item.questItemId));
}

function inventoryCanAccept(inventory, item) {
  if (!item) return true;
  if (item.mode !== "resource") return inventory.length < MAX_INVENTORY;
  let remaining = Math.max(1, Math.floor(Number(item.count) || 1));
  const stackMax = resourceStackMax(item.resourceId);
  for (const stack of inventory) {
    if (stack.mode !== "resource" || stack.resourceId !== item.resourceId) continue;
    const room = stackMax - Math.max(1, Math.floor(Number(stack.count) || 1));
    const moved = Math.min(room, remaining);
    remaining -= moved;
    stack.count = Math.max(1, Math.floor(Number(stack.count) || 1)) + moved;
    if (remaining <= 0) return true;
  }
  while (remaining > 0) {
    if (inventory.length >= MAX_INVENTORY) return false;
    const count = Math.min(stackMax, remaining);
    inventory.push({ ...item, count });
    remaining -= count;
  }
  return true;
}

function makeQuestInstance(def, npcId, context = {}) {
  const npc = QUEST_NPCS[npcId];
  if (def.id === "vengeance") {
    const monster = context.monster ?? "monstre";
    const count = Math.max(1, Math.floor(Number(context.count) || def.target.countMin || 5));
    return {
      id: `${def.id}:${monster}:${context.regionSeed}:${context.regionIndex}`,
      questId: def.id,
      npcId,
      title: def.titleTemplate.replace("{monster}", monster),
      repeatable: true,
      type: def.type,
      story: def.storyTemplate.replace("{npcName}", npc?.name ?? "En questgiver").replace("{monster}", monster),
      acceptText: def.acceptTextTemplate.replace("{count}", count).replace("{monster}", monster),
      turnInText: def.turnInTextTemplate,
      target: { monster, count, allowElite: true },
      progress: { kills: 0 },
      rewards: { ...def.rewards },
    };
  }

  return {
    id: `${def.id}:${context.regionSeed}:${context.regionIndex}`,
    questId: def.id,
    npcId,
    title: def.title,
    repeatable: Boolean(def.repeatable),
    type: def.type,
    story: def.story,
    acceptText: def.acceptText,
    turnInText: def.turnInText,
    target: { ...def.target },
    progress: def.type === "collect_quest_item" ? { items: 0 } : def.type === "clear_map" ? { kills: 0, total: null, cleared: false } : {},
    rewards: { ...def.rewards },
  };
}

function isQuestComplete(quest, inventory = []) {
  if (quest.type === "clear_map") {
    return quest.progress?.cleared === true;
  }
  if (quest.type === "kill_monsters") {
    return Math.max(0, Math.floor(Number(quest.progress?.kills) || 0)) >= Math.max(1, Math.floor(Number(quest.target?.count) || 1));
  }
  if (quest.type === "collect_quest_item") {
    // legacy quest that uses quest items dropped/picked up
    const questItemTargets = questItemTargetsForQuest(quest);
    if (questItemTargets.length > 0) {
      if (!questItemTargets.every((target) => (
        questItemCount(inventory, quest.id, target.questItemId) >= Math.max(1, Math.floor(Number(target.count) || 1))
      ))) return false;
    }
    // resource-based or specific-item requirements: evaluate against current inventory
    const inv = Array.isArray(inventory) ? inventory : (quest._cachedInventory || []);
    inventory = inv;
    // resources
    if (Array.isArray(quest.target?.resources) && quest.target.resources.length > 0) {
      if (!quest.target.resources.every((r) => resourceCount(inventory, r.resource) >= (r.count ?? 1))) return false;
    }
    // specific items
    if (Array.isArray(quest.target?.items) && quest.target.items.length > 0) {
      for (const req of quest.target.items) {
        let needed = Math.max(1, Math.floor(Number(req.count) || 1));
        for (const item of inventory) {
          if (needed <= 0) break;
          if (!item) continue;
          let match = true;
          if (req.templateId) match = match && (String(item.uniqueId) === String(req.templateId) || String(item.namedId) === String(req.templateId));
          if (req.namePrefix) match = match && String(item.name || "").startsWith(`${req.namePrefix} `);
          if (req.baseName) match = match && String(item.baseName || "") === String(req.baseName);
          if (req.rarity) match = match && String(item.rarity || "") === String(req.rarity);
          if (match) needed -= 1;
        }
        if (needed > 0) return false;
      }
      return true;
    }
    return questItemTargets.length > 0 || (Array.isArray(quest.target?.resources) && quest.target.resources.length > 0);
  }
  return false;
}

function questSnapshot(quest, inventory = []) {
  if (!quest) return null;
  const npc = QUEST_NPCS[quest.npcId];
  // prefer provided inventory, otherwise fallback to cached inventory on quest
  const inv = Array.isArray(inventory) && inventory.length ? inventory : (quest._cachedInventory || []);
  const complete = isQuestComplete(quest, inv);
  return {
    ...quest,
    npcName: npc?.name ?? quest.npcId,
    npcTitle: npc?.title ?? "Questgiver",
    npcImageUrl: npc?.imageUrl,
    complete,
    progressText: questProgressText(quest, inv),
  };
}

function questProgressText(quest, inventory = []) {
  if (quest.type === "clear_map") {
    if (quest.progress?.cleared) return "Ryddet – klar til indlevering";
    const kills = Math.max(0, Math.floor(Number(quest.progress?.kills) || 0));
    const total = quest.progress?.total ?? "?";
    return `${kills} / ${total} edderkopper`;
  }
  if (quest.type === "kill_monsters") {
    return `${Math.max(0, Math.floor(Number(quest.progress?.kills) || 0))} / ${Math.max(1, Math.floor(Number(quest.target?.count) || 1))} ${quest.target?.monster ?? "kills"}`;
  }
  if (quest.type === "collect_quest_item") {
    // legacy quest item progress
    const parts = [];
    for (const target of questItemTargetsForQuest(quest)) {
      const item = QUEST_ITEM_DEFS[target.questItemId];
      parts.push(`${questItemCount(inventory, quest.id, target.questItemId)} / ${Math.max(1, Math.floor(Number(target.count) || 1))} ${item?.name ?? target.questItemId}`);
    }
    // resources
    if (Array.isArray(quest.target?.resources) && quest.target.resources.length > 0) {
      parts.push(...quest.target.resources.map((r) => `${resourceCount(inventory, r.resource)} / ${r.count ?? 1} ${r.resource}`));
    }
    // specific items
    if (Array.isArray(quest.target?.items) && quest.target.items.length > 0) {
      parts.push(...quest.target.items.map((req) => {
        // count matching items in inventory
        let have = 0;
        for (const item of inventory) {
          let match = true;
          if (req.templateId) match = match && (String(item.uniqueId) === String(req.templateId) || String(item.namedId) === String(req.templateId));
          if (req.namePrefix) match = match && String(item.name || "").startsWith(`${req.namePrefix} `);
          if (req.baseName) match = match && String(item.baseName || "") === String(req.baseName);
          if (req.rarity) match = match && String(item.rarity || "") === String(req.rarity);
          if (match) have += 1;
        }
        return `${have} / ${req.count ?? 1} ${req.templateId ?? req.namePrefix ?? req.baseName ?? "item"}`;
      }));
    }
    return parts.join(", ");
  }
  return "";
}

function normalizeSavedQuestState(saved) {
  const rawActive = Array.isArray(saved?.active)
    ? saved.active
      .filter((quest) => quest && typeof quest === "object" && quest.id && quest.questId && quest.npcId)
      .map((quest) => ({
        ...quest,
        id: String(quest.id),
        questId: String(quest.questId),
        npcId: String(quest.npcId),
        title: String(quest.title ?? quest.questId),
        type: String(quest.type ?? QUEST_DEFS[quest.questId]?.type ?? ""),
        repeatable: Boolean(quest.repeatable),
        story: String(quest.story ?? ""),
        acceptText: String(quest.acceptText ?? ""),
        turnInText: String(quest.turnInText ?? ""),
        target: { ...(quest.target ?? {}) },
        progress: { ...(quest.progress ?? {}) },
        rewards: { ...(quest.rewards ?? {}) },
      }))
    : [];
  const seenNpcs = new Set();
  const active = rawActive.filter((quest) => {
    if (seenNpcs.has(quest.npcId)) return false;
    seenNpcs.add(quest.npcId);
    return true;
  });
  return {
    active,
    completed: Array.isArray(saved?.completed) ? saved.completed.map(String) : [],
    wildernessNpc: null,
    cityFade: [],
  };
}

const npcImageCache = new Map();

function drawQuestgiver(ctx, screen, questgiver, time) {
  const npc = QUEST_NPCS[questgiver.npcId];
  const image = getNpcImage(npc?.imageUrl);
  const bob = Math.sin(time * 3.2 + questgiver.bob) * 3;
  drawShadow(ctx, screen.x, screen.y + 13, 19, 7, 0.26);

  if (image) {
    const height = 96;
    const width = height * (image.naturalWidth / image.naturalHeight);
    ctx.save();
    ctx.drawImage(image, screen.x - width * 0.5, screen.y - height + 16 + bob, width, height);
    ctx.restore();
  } else {
    ctx.save();
    ctx.fillStyle = "#d6c18a";
    ctx.beginPath();
    ctx.arc(screen.x, screen.y - 34 + bob, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawQuestMarkerPip(ctx, screen.x, screen.y - 82 + bob, time + questgiver.bob);
}

function drawQuestMarkerPip(ctx, x, y, time) {
  const pulse = 0.9 + Math.sin(time * 5) * 0.1;
  ctx.save();
  ctx.shadowColor = "#ffd94a";
  ctx.shadowBlur = 10;
  ctx.strokeStyle = "#4a2b05";
  ctx.lineCap = "round";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x, y - 15 * pulse);
  ctx.lineTo(x, y - 2);
  ctx.stroke();
  ctx.fillStyle = "#4a2b05";
  ctx.beginPath();
  ctx.arc(x, y + 8, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffd94a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y - 15 * pulse);
  ctx.lineTo(x, y - 2);
  ctx.stroke();
  ctx.fillStyle = "#ffd94a";
  ctx.beginPath();
  ctx.arc(x, y + 8, 2.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function getNpcImage(url) {
  if (!url) return null;
  const cached = npcImageCache.get(url);
  if (cached?.loaded) return cached.image;
  if (cached) return null;
  const image = new Image();
  image.onload = () => {
    const entry = npcImageCache.get(url);
    if (entry) entry.loaded = true;
  };
  image.onerror = () => npcImageCache.delete(url);
  image.src = url;
  npcImageCache.set(url, { image, loaded: false });
  return null;
}

function isDestructibleObject(object) {
  const def = getDestructibleDef(object);
  return Boolean(def && (object.hp === undefined || object.hp > 0));
}

function getDestructibleDef(object) {
  if (!object) return null;
  if (object.destructible === false) return null;
  if (object.destructibleProfile && DESTRUCTIBLE_OBJECTS[object.destructibleProfile]) {
    return DESTRUCTIBLE_OBJECTS[object.destructibleProfile];
  }
  return DESTRUCTIBLE_OBJECTS[object.type] ?? null;
}

function destructibleObjectScreenHit(object) {
  const size = Math.max(0.7, Number(object?.size) || 1);
  const baseRadius = 30 + (Number(object?.radius) || 0.4) * 36;
  if (object.type === "building") return { offsetY: 72 * size, radius: Math.max(baseRadius, 74 * size) };
  if (object.type === "pine" || object.type === "old-oak") return { offsetY: 64 * size, radius: Math.max(baseRadius, 68 * size) };
  if (object.type === "ruin") return { offsetY: 46 * size, radius: Math.max(baseRadius, 58 * size) };
  if (object.type === "pillar") return { offsetY: 48 * size, radius: Math.max(baseRadius, 48 * size) };
  if (object.type === "crystal") return { offsetY: 38 * size, radius: Math.max(baseRadius, 42 * size) };
  return { offsetY: 26 * size, radius: Math.max(baseRadius, 42 * size) };
}

function drawTerrainDecal(ctx, decal, x, y, atlas) {
  const s = decal.size;

  if (decal.decaySheetId && atlas?.decaySheets?.[decal.decaySheetId]) {
    const sheet = atlas.decaySheets[decal.decaySheetId];
    const cells = sheet?.cells ?? [];
    const variant = Number.isInteger(decal.decayVariant)
      ? decal.decayVariant
      : 0;
    const cell = cells[(Math.abs(variant) % Math.max(1, cells.length))] ?? cells[0];
    if (cell) {
      const source = sheet.canvas;
      const scale = s * (Number(decal.decayRenderScale) || Number(sheet.renderScale) || 1);
      const width = Math.max(8, TILE_W * scale);
      const height = Math.max(4, TILE_H * scale);
      const alpha = Math.max(0.08, Math.min(0.85, Number(decal.alpha) || 0.34));
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(decal.rotation || 0);
      ctx.globalAlpha *= alpha;
      ctx.drawImage(
        source,
        cell.x,
        cell.y,
        cell.w,
        cell.h,
        -width * 0.5,
        -height * 0.5,
        width,
        height,
      );
      ctx.restore();
      return;
    }
  }

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
