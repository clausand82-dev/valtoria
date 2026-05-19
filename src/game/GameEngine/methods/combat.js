import {
  chunkCoords,
  createId,
  MONSTER_STATS,
  clamp,
  distance,
  lerp,
  normalize,
  worldToScreen,
  POPULARITY_CONFIG,
  DESTRUCTIBLE_OBJECT_ATTACK_RANGE,
  SPELL_DEFS
} from "../dependencies.js";
import {
  monsterPopularityDelta,
  housePopularityDelta,
  normalizeReadableBonuses,
  incrementStatMap,
  isDestructibleObject,
  getDestructibleDef,
  destructibleObjectScreenHit
} from "../helpers.js";
import { skillTreeBonuses } from "../../config/skill-tree-config.js";
import { socketBonusesForItem } from "../../config/socket-config.js";
import {
  ITEM_DURABILITY_WEAPON_PER_ATTACK,
  ITEM_DURABILITY_ARMOR_PER_HIT,
  ITEM_DURABILITY_PENALTY_THRESHOLD,
  ITEM_DURABILITY_DEATH_MIN_PCT,
  ITEM_DURABILITY_DEATH_MAX_PCT,
  ITEM_DURABILITY_DEATH_THRESHOLD,
  ITEM_GOLD_DEATH_LOSS_MAX,
} from "../../config/durability-config.js";

function spellParticleVisuals(spell = {}) {
  const particles = spell.particles ?? {};
  const visuals = spell.visuals ?? {};
  return {
    cast: particles.cast ?? (visuals.castEffect ? { type: visuals.castEffect } : null),
    trail: particles.trail ?? (visuals.projectileEffect ? { type: visuals.projectileEffect } : null),
    impact: particles.impact ?? (visuals.impactEffect ? { type: visuals.impactEffect } : null),
    area: particles.area ?? (visuals.areaEffect ? { type: visuals.areaEffect } : null),
    status: particles.status ?? (visuals.statusEffect ? { type: visuals.statusEffect } : null),
    projectileTexture: particles.projectileTexture ?? visuals.projectileTexture ?? null,
    projectileTextureSize: particles.projectileTextureSize ?? visuals.projectileTextureSize ?? null,
    rotateProjectileTexture: particles.rotateProjectileTexture ?? visuals.rotateProjectileTexture ?? false,
    projectileTextureRotationOffset: particles.projectileTextureRotationOffset ?? visuals.projectileTextureRotationOffset ?? 0,
    beam: particles.beam ?? visuals.beam ?? false,
    beamWidth: particles.beamWidth ?? visuals.beamWidth ?? null,
  };
}

function randomIntInRange(value, fallbackMin = 1, fallbackMax = fallbackMin) {
  if (Array.isArray(value)) {
    const min = Math.floor(Number(value[0]) || fallbackMin);
    const max = Math.max(min, Math.floor(Number(value[1]) || value[0] || fallbackMax));
    return min + Math.floor(Math.random() * (max - min + 1));
  }
  if (value && typeof value === "object") {
    const min = Math.floor(Number(value.min) || fallbackMin);
    const max = Math.max(min, Math.floor(Number(value.max) || fallbackMax));
    return min + Math.floor(Math.random() * (max - min + 1));
  }
  const fixed = Math.floor(Number(value));
  return Number.isFinite(fixed) && fixed > 0 ? fixed : fallbackMin;
}

function targetPointInSpellRange(caster, x, y, range) {
  const n = normalize(x - caster.x, y - caster.y);
  if (!n.x && !n.y) return null;
  const distanceToTarget = Math.hypot(x - caster.x, y - caster.y);
  const clampedDistance = Math.min(Math.max(0.1, Number(range) || distanceToTarget), distanceToTarget);
  return {
    x: caster.x + n.x * clampedDistance,
    y: caster.y + n.y * clampedDistance,
    direction: n,
  };
}

export const combatMethods = {
  updateMonsters(dt) {
    this.processStatusEffects(this.player, dt, true);
    for (const monster of this.nearbyMonsters(2)) {
      if (monster.dead) continue;
      this.processStatusEffects(monster, dt, false);
      this.scaleMonsterToHeroLevel(monster);
      monster.attackCooldown = Math.max(0, monster.attackCooldown - dt);
      monster.spellCooldown = Math.max(0, (Number(monster.spellCooldown) || 0) - dt);
      monster.attackAnim = Math.max(0, monster.attackAnim - dt);
      monster.hurt = Math.max(0, monster.hurt - dt);
      const beforeX = monster.x;
      const beforeY = monster.y;
      const d = distance(this.player, monster);
      if (d < monster.aggro) {
        this.updateMonsterMinions(monster, dt);
        const n = normalize(this.player.x - monster.x, this.player.y - monster.y);
        monster.facingX = n.x || monster.facingX;
        monster.facingY = n.y || monster.facingY;
        const spellId = monster.spells?.[0];
        const spell = SPELL_DEFS[spellId];
        if (spell && d <= spell.range && monster.spellCooldown <= 0) {
          this.castMonsterSpell(monster, spellId);
        } else if (this.tryMonsterLeapAttack(monster, d, n)) {
          // Leap attack state is applied inside tryMonsterLeapAttack.
        } else if (d > monster.range + this.player.radius) {
          this.moveEntity(monster, n.x * monster.speed * this.statusSpeedMultiplier(monster) * dt, n.y * monster.speed * this.statusSpeedMultiplier(monster) * dt);
        } else if (monster.attackCooldown <= 0) {
          monster.attackCooldown = this.rollMonsterAttackCooldown(monster);
          monster.attackAnim = 0.24;
          const critical = Math.random() < (Number(monster.critChance) || 0);
          this.applyMonsterMeleeHit(monster, critical);
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
        this.moveEntity(monster, monster.vx * this.statusSpeedMultiplier(monster) * dt, monster.vy * this.statusSpeedMultiplier(monster) * dt);
        monster.vx *= Math.pow(0.04, dt);
        monster.vy *= Math.pow(0.04, dt);
      }
      monster.moving = Math.hypot(monster.x - beforeX, monster.y - beforeY) > 0.002;
      const rawSpeed = dt > 0 ? Math.hypot(monster.x - beforeX, monster.y - beforeY) / dt : 0;
      monster.moveSpeed = lerp(monster.moveSpeed || 0, rawSpeed, monster.moving ? 0.42 : 0.15);
      if (monster.moveSpeed > 0.02) monster.gait += dt * (6.4 + monster.moveSpeed * 2.1);
      if (monster.moving && Math.random() < (this.footstepDustChance?.(0.035) ?? 0.035)) this.addDust(monster.x, monster.y, 1);
    }
  },

  rollMonsterAttackCooldown(monster) {
    const config = monster.attackCooldownConfig;
    if (config) {
      const min = Math.max(0.2, Number(config.min) || 0.85);
      const max = Math.max(min, Number(config.max) || min);
      return min + Math.random() * (max - min);
    }
    return 0.85 + Math.random() * 0.6;
  },

  tryMonsterLeapAttack(monster, distanceToPlayer, direction) {
    const config = monster.leapAttack;
    if (!config || monster.attackCooldown > 0) return false;
    const minRange = Math.max(0.2, Number(config.minRange) || 1.2);
    const maxRange = Math.max(minRange, Number(config.maxRange) || 3);
    if (distanceToPlayer < minRange || distanceToPlayer > maxRange) return false;
    const speed = Math.max(monster.speed, Number(config.speed) || monster.speed * 3.5);
    monster.vx += direction.x * speed;
    monster.vy += direction.y * speed;
    monster.attackCooldown = Math.max(0.8, Number(config.cooldown) || 2.4);
    monster.attackAnim = 0.24;
    this.addParticles(monster.x, monster.y, monster.color, 10, 0.12);
    return true;
  },

  applyMonsterMeleeHit(monster, critical = false) {
    const amount = critical ? monster.damage * (Number(monster.critDamage) || 1.5) : monster.damage;
    this.damagePlayer(amount, monster, critical);
    this.applyMonsterOnHitStatus(monster, this.player);
    this.applyMonsterMeleeAreaDamage(monster);
  },

  applyMonsterOnHitStatus(monster, target) {
    const effect = monster.onHitStatus;
    if (!effect || !target) return;
    const chance = clamp(Number(effect.chance ?? 1), 0, 1);
    if (chance <= 0 || Math.random() > chance) return;
    target.statusEffects = Array.isArray(target.statusEffects) ? target.statusEffects : [];
    if (effect.type === "root") {
      const min = Math.max(0.1, Number(effect.minDuration) || Number(effect.duration) || 0.5);
      const max = Math.max(min, Number(effect.maxDuration) || min);
      target.statusEffects.push({
        type: "root",
        duration: min + Math.random() * (max - min),
        color: effect.color ?? "#d7d4c7",
      });
      this.addFloater(target.x, target.y, "Root", effect.color ?? "#d7d4c7", 0.7);
      return;
    }
    if (effect.type === "dot") {
      target.statusEffects.push({
        type: "dot",
        damage: Math.max(1, Math.floor(Number(effect.damage) || 1)),
        duration: Math.max(0.2, Number(effect.duration) || 3),
        tick: Math.max(0.2, Number(effect.tick) || 1),
        color: effect.color ?? monster.color,
      });
      if (effect.label) this.addFloater(target.x, target.y, effect.label, effect.color ?? monster.color, 0.65);
    }
  },

  applyMonsterMeleeAreaDamage(monster) {
    const effect = monster.meleeAreaDamage;
    if (!effect) return;
    const radius = Math.max(0.1, Number(effect.radius) || 0);
    if (radius <= 0) return;
    if (effect.visibleOnly && !this.isPointVisible(this.player)) return;
    if (Math.hypot(this.player.x - monster.x, this.player.y - monster.y) > radius + this.player.radius) return;
    const damage = Math.max(1, Math.floor(monster.damage * (Number(effect.damageMult) || 0.5)));
    this.damagePlayer(damage, { typeName: `${monster.typeName} shockwave` }, false);
    this.spawnGroundPulseEffect(monster.x, monster.y, radius, {
      color: effect.color ?? "#d8c091",
      durationMs: 420,
      shake: Number(effect.shake) || 0,
    });
  },

  updateMonsterMinions(monster, dt) {
    const config = monster.minions;
    if (!monster.haveMinion || !config || monster.isMinion || monster.dead) return;
    monster.minionCooldown = Math.max(0, (Number(monster.minionCooldown) || 0) - dt);
    if (monster.minionCooldown > 0) return;

    const maxActive = Math.max(1, Math.floor(Number(config.maxActive) || 1));
    const active = [...this.monsters.values()]
      .filter((entry) => entry.minionOwnerId === monster.id && !entry.dead).length;
    if (active >= maxActive) return;

    const countConfig = config.spawnCount;
    const rolledCount = Array.isArray(countConfig)
      ? Math.floor((Number(countConfig[0]) || 1) + Math.random() * (Math.max(Number(countConfig[0]) || 1, Number(countConfig[1]) || Number(countConfig[0]) || 1) - (Number(countConfig[0]) || 1) + 1))
      : Math.max(1, Math.floor(Number(countConfig) || 1));
    const spawnCount = Math.min(maxActive - active, rolledCount);
    let spawned = 0;
    for (let i = 0; i < spawnCount; i += 1) {
      if (this.spawnMonsterMinion(monster, config, i)) spawned += 1;
    }
    monster.minionCooldown = Math.max(1, Number(config.cooldown) || 8) + Math.random() * 0.8;
    if (spawned > 0) this.addParticles(monster.x, monster.y, monster.color, 14, 0.1);
  },

  spawnMonsterMinion(owner, config, index = 0) {
    const minionType = config.typeName || owner.typeName;
    const base = MONSTER_STATS[minionType];
    if (!base) return false;
    const scale = Math.max(0.1, Number(config.scale) || 0.45);
    const statsMult = config.statsMult ?? {};
    const angle = Math.random() * Math.PI * 2 + index * 0.9;
    const dist = owner.radius + 0.45 + Math.random() * 0.45;
    let x = owner.x + Math.cos(angle) * dist;
    let y = owner.y + Math.sin(angle) * dist;
    const radius = Math.max(0.08, owner.radius * scale);

    for (let tries = 0; tries < 8 && this.isBlocked(x, y, radius); tries += 1) {
      const a = Math.random() * Math.PI * 2;
      x = owner.x + Math.cos(a) * (owner.radius + 0.5 + Math.random() * 0.75);
      y = owner.y + Math.sin(a) * (owner.radius + 0.5 + Math.random() * 0.75);
    }
    if (this.isBlocked(x, y, radius)) return false;

    const hp = Math.max(1, Math.floor(owner.maxHp * (Number(statsMult.hp) || 0.25)));
    const speedBase = minionType === owner.typeName ? owner.speed : base.speed * (1 + Math.min(0.32, owner.level * 0.025));
    const speed = Math.max(0.2, speedBase * (Number(statsMult.speed) || 1));
    const minion = {
      id: createId(),
      typeName: minionType,
      x,
      y,
      vx: 0,
      vy: 0,
      radius: Math.max(0.08, base.radius * scale),
      baseLevel: owner.baseLevel,
      level: owner.level,
      lootLevel: owner.lootLevel,
      maxHp: minionType === owner.typeName ? hp : Math.max(1, Math.floor(base.hp * (1 + owner.level * 0.12) * (Number(statsMult.hp) || 1))),
      hp: minionType === owner.typeName ? hp : Math.max(1, Math.floor(base.hp * (1 + owner.level * 0.12) * (Number(statsMult.hp) || 1))),
      damage: minionType === owner.typeName
        ? Math.max(1, Math.floor(owner.damage * (Number(statsMult.damage) || 0.3)))
        : Math.max(1, Math.floor(base.damage * (1 + owner.level * 0.1) * (Number(statsMult.damage) || 1))),
      speed,
      baseSpeed: speed,
      range: minionType === owner.typeName ? Math.max(0.18, owner.range * 0.8) : base.range,
      magic: minionType === owner.typeName ? Math.max(0, Math.floor((Number(owner.magic) || 0) * (Number(statsMult.magic) || 0.25))) : Math.floor(Number(base.magic) || 0),
      critChance: minionType === owner.typeName ? Math.max(0, (Number(owner.critChance) || 0) * 0.5) : Number(base.critChance) || 0,
      critDamage: minionType === owner.typeName ? Number(owner.critDamage) || 1.5 : Number(base.critDamage) || 1.5,
      blockChance: Number(base.blockChance) || 0,
      dodgeChance: minionType === owner.typeName ? Math.max(0, (Number(owner.dodgeChance) || 0) * 0.5) : Number(base.dodgeChance) || 0,
      spells: [],
      spellCooldown: 999,
      statusEffects: [],
      allowElite: false,
      isBoss: false,
      boss: null,
      noLoot: Boolean(base.noLoot),
      despawnOnDeath: Boolean(base.despawnOnDeath),
      onHitStatus: base.onHitStatus ? { ...base.onHitStatus } : null,
      leapAttack: base.leapAttack ? { ...base.leapAttack } : null,
      attackCooldownConfig: base.attackCooldown ? { ...base.attackCooldown } : null,
      meleeAreaDamage: base.meleeAreaDamage ? { ...base.meleeAreaDamage } : null,
      shadow: base.shadow ? { ...base.shadow } : null,
      haveMinion: false,
      minions: false,
      minionCooldown: 0,
      isMinion: true,
      minionOwnerId: owner.id,
      aggro: owner.aggro,
      attackCooldown: 0.35 + Math.random() * 0.5,
      color: owner.color,
      xp: Math.max(0, Math.floor(owner.xp * (Number(statsMult.xp) || 0.05))),
      animSeed: Math.random() * Math.PI * 2,
      breathSpeed: 1.6 + Math.random() * 1.4,
      visualScale: (owner.visualScale || 1) * scale,
      facingX: owner.facingX || 1,
      facingY: owner.facingY || 0,
      moving: false,
      gait: Math.random() * Math.PI * 2,
      moveSpeed: 0,
      attackAnim: 0,
      dead: false,
      hurt: 0,
    };

    const { cx, cy } = chunkCoords(x, y);
    const chunk = this.getChunk(cx, cy);
    chunk.monsters.push(minion);
    this.monsters.set(minion.id, minion);
    return true;
  },

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = this.projectiles[i];
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      projectile.life -= dt;
      this.addParticles(projectile.x, projectile.y, projectile.color, projectile.type === "burst" ? 1 : 0, 0.04);

      const expired = projectile.life <= 0;
      let remove = expired || (!projectile.ignoreBlocking && this.isBlocked(projectile.x, projectile.y, 0.12));
      if (!remove) {
        for (const monster of this.nearbyMonsters(2)) {
          if (monster.dead || projectile.owner === "monster") continue;
          if (projectile.noCollision) continue;
          if (Math.hypot(monster.x - projectile.x, monster.y - projectile.y) <= monster.radius + projectile.radius) {
            this.applySpellImpact(projectile, projectile.x, projectile.y, monster);
            remove = true;
            break;
          }
        }
        if (!remove && !projectile.noCollision && projectile.owner === "monster" && Math.hypot(this.player.x - projectile.x, this.player.y - projectile.y) <= this.player.radius + projectile.radius) {
          this.applySpellImpact(projectile, projectile.x, projectile.y, this.player);
          remove = true;
        }
      }
      if (expired && projectile.explodeOnEnd) {
        this.applySpellImpact(projectile, projectile.x, projectile.y, null);
      }
      if (remove) {
        this.particleEngine?.removeEmittersByOwner(projectile.id);
        this.projectiles.splice(i, 1);
      }
    }
  },

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
      const { damage } = this.rollPlayerDamage(stats);
      this.damageObject(target, damage);
      this.drainWeaponDurability();
      this.camera.shake = Math.max(this.camera.shake, 3);
      this.player.attackTargetId = null;
      this.player.attackObjectId = null;
      return;
    }

    if (stats.mode === "melee") {
      this.player.stats.meleeAttacks += 1;
      const { damage, critical } = this.rollPlayerDamage(stats);
      this.damageMonster(target, damage, "melee", critical);
      this.triggerWeaponOnHitEffects({
        weapon: this.player.equipment?.weapon,
        player: this.player,
        target,
        sourceType: "melee",
        stats,
      });
      this.drainWeaponDurability();
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
      owner: "player",
      spellId: stats.mode,
      x: this.player.x + n.x * 0.42,
      y: this.player.y + n.y * 0.42,
      vx: n.x * speed,
      vy: n.y * speed,
      radius: stats.mode === "magic" ? 0.18 : 0.1,
      ...this.rollPlayerDamage(stats, stats.mode === "magic" ? Math.floor(stats.magic * 0.45) : 0),
      life: stats.range / speed,
      color,
    });
    this.drainWeaponDurability();
  },

  triggerWeaponOnHitEffects(context = {}) {
    const effects = context.weapon?.effects?.onHit;
    if (!Array.isArray(effects) || effects.length === 0) return;
    for (const effect of effects) {
      if (!effect || typeof effect !== "object") continue;
      const chance = clamp(Number(effect.chance ?? 1), 0, 1);
      if (chance <= 0 || Math.random() > chance) continue;
      if (effect.type === "areaDamage") {
        this.applyWeaponAreaDamageEffect(effect, context);
      }
    }
  },

  applyWeaponAreaDamageEffect(effect, context = {}) {
    const radius = Math.max(0, Number(effect.radius) || 0);
    if (radius <= 0) return;
    const center = this.weaponEffectCenter(effect, context);
    if (!center) return;
    const stats = context.stats ?? this.calcStats();
    const scaleStat = effect.damageScale ? Number(stats[effect.damageScale]) || 0 : 0;
    const damage = Math.max(1, Math.floor((Number(effect.damage) || 0) + scaleStat * (Number(effect.damageScaleAmount) || 0)));
    const damageType = String(effect.damageType || "magic");
    const damaged = new Set();

    for (const monster of this.nearbyMonsters(2)) {
      if (monster.dead || damaged.has(monster.id)) continue;
      if (Math.hypot(monster.x - center.x, monster.y - center.y) > radius + monster.radius) continue;
      damaged.add(monster.id);
      this.damageMonster(monster, damage, damageType, false);
    }

    if (effect.visual === "expandingEnergyRing") {
      this.spawnExpandingEnergyRingEffect(center.x, center.y, radius, {
        color: effect.color,
        durationMs: effect.durationMs,
      });
    } else {
      this.addParticles(center.x, center.y, effect.color ?? "#8feaff", 18, 0.08);
    }
  },

  weaponEffectCenter(effect, context = {}) {
    if (effect.center === "player") return context.player ?? this.player;
    if (context.target) return context.target;
    return context.player ?? this.player;
  },

  castSpellAt(x, y, spellId = null) {
    const stats = this.calcStats();
    const selectedSpellId = spellId ?? this.player.activeSpellId ?? this.player.unlockedSpells?.[0];
    const spell = SPELL_DEFS[selectedSpellId];
    if (!spell) {
      this.addToast("Ingen spellbook er aktiveret i Arcane Archive");
      return;
    }
    const manaCost = Math.max(0, Math.floor(Number(spell.manaCost) || 0));
    if (this.player.mana < manaCost || this.player.spellCooldown > 0 || this.player.hp <= 0) return;
    const n = normalize(x - this.player.x, y - this.player.y);
    if (!n.x && !n.y) return;
    this.player.mana -= manaCost;
    this.player.stats.spellsCast += 1;
    this.player.spellCooldown = spell.cooldown;
    this.player.castAnim = 0.38;
    this.setFacing(n.x, n.y);
    const visuals = spellParticleVisuals(spell);
    if (visuals.cast?.type) {
      this.particleEngine?.emitOneShot(visuals.cast.type, this.player.x, this.player.y, {
        ...visuals.cast,
        layer: visuals.cast.layer ?? "effects",
      });
    }
    if (spell.castMode === "skyfall") {
      this.launchSpellSkyfall({ spell, caster: this.player, owner: "player", x, y, stats });
    } else {
      this.launchSpellProjectile({ spell, caster: this.player, owner: "player", x, y, stats });
    }
  },

  castMonsterSpell(monster, spellId) {
    const spell = SPELL_DEFS[spellId];
    if (!spell || monster.dead) return;
    const n = normalize(this.player.x - monster.x, this.player.y - monster.y);
    if (!n.x && !n.y) return;
    monster.spellCooldown = spell.cooldown + Math.random() * 0.8;
    monster.attackAnim = 0.24;
    const visuals = spellParticleVisuals(spell);
    if (visuals.cast?.type) {
      this.particleEngine?.emitOneShot(visuals.cast.type, monster.x, monster.y, {
        ...visuals.cast,
        layer: visuals.cast.layer ?? "effects",
      });
    }
    const spellContext = {
      spell,
      caster: monster,
      owner: "monster",
      x: this.player.x,
      y: this.player.y,
      stats: { damageMin: monster.damage, damageMax: monster.damage, magic: monster.magic ?? 0, critChance: monster.critChance ?? 0, critDamage: monster.critDamage ?? 1.5 },
    };
    if (spell.castMode === "skyfall") this.launchSpellSkyfall(spellContext);
    else this.launchSpellProjectile(spellContext);
  },

  launchSpellProjectile({ spell, caster, owner, x, y, stats }) {
    const n = normalize(x - caster.x, y - caster.y);
    const rolled = this.rollPlayerDamage(stats, (spell.hitDamage ?? 0) + (Number(stats.magic) || 0) * (spell.magicScale ?? 0));
    const visuals = spellParticleVisuals(spell);
    const projectile = {
      id: createId(),
      type: spell.id,
      spellId: spell.id,
      owner,
      x: caster.x + n.x * 0.5,
      y: caster.y + n.y * 0.5,
      beamStartX: caster.x + n.x * 0.18,
      beamStartY: caster.y + n.y * 0.18,
      vx: n.x * spell.speed,
      vy: n.y * spell.speed,
      radius: spell.radius ?? 0.22,
      damage: rolled.damage,
      critical: rolled.critical,
      life: spell.range / spell.speed,
      color: spell.color,
      texture: visuals.projectileTexture,
      textureSize: visuals.projectileTextureSize,
      rotateTexture: visuals.rotateProjectileTexture,
      textureRotationOffset: visuals.projectileTextureRotationOffset,
      beam: Boolean(visuals.beam),
      beamWidth: visuals.beamWidth,
      areaRadius: spell.areaRadius ?? 0,
      areaDamage: spell.areaDamage ?? 0,
      dotDamage: spell.dotDamage ?? 0,
      dotDuration: spell.dotDuration ?? 0,
      slowPct: spell.slowPct ?? 0,
      slowDuration: spell.slowDuration ?? 0,
      hazardDuration: spell.hazardDuration ?? 0,
      hazardTick: spell.hazardTick ?? 1,
      explodeOnEnd: Boolean(spell.explodeOnEnd),
      particleVisuals: visuals,
    };
    this.projectiles.push(projectile);
    if (visuals.trail?.type) {
      this.particleEngine?.attachEmitterToProjectile(projectile.id, {
        ...visuals.trail,
        layer: visuals.trail.layer ?? "effects",
        radius: visuals.trail.radius ?? 8,
      });
    }
  },

  launchSpellSkyfall({ spell, caster, owner, x, y, stats }) {
    const center = targetPointInSpellRange(caster, x, y, spell.range);
    if (!center) return;
    const count = randomIntInRange(spell.shardCount, 5, 8);
    const scatterRadius = Math.max(0, Number(spell.shardScatterRadius) || 1.4);
    const fallDistance = Math.max(1, Number(spell.shardFallDistance) || 5);
    const speed = Math.max(1, Number(spell.speed) || 10);
    const visuals = spellParticleVisuals(spell);
    const fallDirection = normalize(1, 0);

    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(Math.random()) * scatterRadius;
      const impactX = center.x + Math.cos(angle) * dist;
      const impactY = center.y + Math.sin(angle) * dist;
      const stagger = i * 0.045;
      const rolled = this.rollPlayerDamage(stats, (spell.hitDamage ?? 0) + (Number(stats.magic) || 0) * (spell.magicScale ?? 0));
      const projectile = {
        id: createId(),
        type: spell.id,
        spellId: spell.id,
        owner,
        x: impactX - fallDirection.x * fallDistance - stagger * speed,
        y: impactY - fallDirection.y * fallDistance,
        vx: fallDirection.x * speed,
        vy: fallDirection.y * speed,
        radius: spell.radius ?? 0.16,
        damage: rolled.damage,
        critical: rolled.critical,
        life: (fallDistance + stagger * speed) / speed,
        color: spell.color,
        texture: visuals.projectileTexture,
        textureSize: visuals.projectileTextureSize,
        rotateTexture: visuals.rotateProjectileTexture,
        textureRotationOffset: visuals.projectileTextureRotationOffset,
        areaRadius: spell.areaRadius ?? 0,
        areaDamage: spell.areaDamage ?? 0,
        dotDamage: spell.dotDamage ?? 0,
        dotDuration: spell.dotDuration ?? 0,
        slowPct: spell.slowPct ?? 0,
        slowDuration: spell.slowDuration ?? 0,
        hazardDuration: spell.hazardDuration ?? 0,
        hazardTick: spell.hazardTick ?? 1,
        explodeOnEnd: true,
        ignoreBlocking: true,
        noCollision: true,
        particleVisuals: visuals,
      };
      this.projectiles.push(projectile);
      if (visuals.trail?.type) {
        this.particleEngine?.attachEmitterToProjectile(projectile.id, {
          ...visuals.trail,
          layer: visuals.trail.layer ?? "effects",
          radius: visuals.trail.radius ?? 8,
        });
      }
    }
  },

  applySpellImpact(projectile, x, y, directTarget = null) {
    const targets = [];
    if (projectile.owner === "player") {
      for (const monster of this.nearbyMonsters(2)) {
        if (monster.dead) continue;
        const direct = directTarget === monster;
        const inArea = projectile.areaRadius > 0 && Math.hypot(monster.x - x, monster.y - y) <= projectile.areaRadius + monster.radius;
        if (direct || inArea) targets.push(monster);
      }
    } else {
      const direct = directTarget === this.player;
      const inArea = projectile.areaRadius > 0 && Math.hypot(this.player.x - x, this.player.y - y) <= projectile.areaRadius + this.player.radius;
      if (direct || inArea) targets.push(this.player);
    }

    for (const target of targets) {
      const direct = target === directTarget;
      const damage = direct
        ? projectile.damage
        : Math.max(1, Math.floor((projectile.areaDamage || projectile.damage * 0.55)));
      if (target === this.player) this.damagePlayer(damage, { typeName: projectile.spellId }, projectile.critical && direct);
      else this.damageMonster(target, damage, "magic", projectile.critical && direct);
      this.applyProjectileStatus(target, projectile);
    }
    const impact = projectile.particleVisuals?.impact;
    if (impact?.type) {
      this.particleEngine?.emitOneShot(impact.type, x, y, {
        ...impact,
        layer: impact.layer ?? "effects",
        oneShotCount: impact.oneShotCount ?? (projectile.areaRadius > 0 ? 30 : 14),
      });
    } else {
      this.addParticles(x, y, projectile.color, projectile.areaRadius > 0 ? 26 : 9, 0.08);
    }
    if (projectile.hazardDuration > 0 && projectile.areaRadius > 0) {
      this.spawnGroundHazard(projectile, x, y);
    }
  },

  spawnGroundHazard(projectile, x, y) {
    const radius = Math.max(0.1, Number(projectile.areaRadius) || 0.1);
    const hazard = {
      id: createId(),
      owner: projectile.owner,
      spellId: projectile.spellId,
      x,
      y,
      radius,
      damage: Math.max(1, Math.floor(Number(projectile.dotDamage || projectile.areaDamage || 1))),
      tickInterval: Math.max(0.2, Number(projectile.hazardTick) || 1),
      tick: 0,
      life: Math.max(0.2, Number(projectile.hazardDuration) || 1),
      maxLife: Math.max(0.2, Number(projectile.hazardDuration) || 1),
      color: projectile.color ?? "#87d65a",
    };
    this.groundHazards ??= [];
    this.groundHazards.push(hazard);
    this.spawnGroundCloudEffect(x, y, radius, hazard.color, hazard.life);
    const area = projectile.particleVisuals?.area;
    if (area?.type) {
      hazard.particleEmitterId = this.particleEngine?.addEmitter({
        ...area,
        x,
        y,
        radius: Math.max(18, radius * 42),
        duration: hazard.life,
        layer: area.layer ?? "belowUnits",
      }, { id: hazard.id, scope: "hazard" });
    }
  },

  updateGroundHazards(dt) {
    if (!Array.isArray(this.groundHazards) || this.groundHazards.length === 0) return;
    for (let i = this.groundHazards.length - 1; i >= 0; i -= 1) {
      const hazard = this.groundHazards[i];
      hazard.life -= dt;
      hazard.tick -= dt;
      if (hazard.tick <= 0) {
        hazard.tick += hazard.tickInterval;
        this.applyGroundHazardTick(hazard);
      }
      if (hazard.life <= 0) {
        if (hazard.particleEmitterId) this.particleEngine?.removeEmitter(hazard.particleEmitterId);
        this.groundHazards.splice(i, 1);
      }
    }
  },

  applyGroundHazardTick(hazard) {
    if (hazard.owner === "player") {
      for (const monster of this.nearbyMonsters(2)) {
        if (monster.dead) continue;
        if (Math.hypot(monster.x - hazard.x, monster.y - hazard.y) > hazard.radius + monster.radius) continue;
        this.damageMonster(monster, hazard.damage, "magic", false);
      }
      return;
    }
    if (Math.hypot(this.player.x - hazard.x, this.player.y - hazard.y) <= hazard.radius + this.player.radius) {
      this.damagePlayer(hazard.damage, { typeName: hazard.spellId ?? "hazard" }, false);
    }
  },

  applyProjectileStatus(target, projectile) {
    if (!target) return;
    target.statusEffects = Array.isArray(target.statusEffects) ? target.statusEffects : [];
    if (projectile.dotDamage > 0 && projectile.dotDuration > 0) {
      target.statusEffects.push({
        type: "dot",
        damage: projectile.dotDamage,
        duration: projectile.dotDuration,
        tick: 1,
        color: projectile.color,
        particle: projectile.particleVisuals?.status ?? null,
      });
    }
    if (projectile.slowPct > 0 && projectile.slowDuration > 0) {
      target.statusEffects.push({
        type: "slow",
        pct: projectile.slowPct,
        duration: projectile.slowDuration,
        particle: projectile.particleVisuals?.status ?? null,
      });
    }
  },

  processStatusEffects(entity, dt, isPlayer = false) {
    if (!Array.isArray(entity.statusEffects) || entity.statusEffects.length === 0) return;
    for (const effect of entity.statusEffects) {
      if (effect.duration > 0 && effect.particle?.type && !effect.particleEmitterId && entity.id) {
        effect.particleEmitterId = this.particleEngine?.attachEmitterToEntity(entity.id, {
          ...effect.particle,
          layer: effect.particle.layer ?? "aboveUnits",
          radius: effect.particle.radius ?? 18,
        });
      }
      effect.duration -= dt;
      if (effect.type === "dot") {
        effect.tick -= dt;
        if (effect.tick <= 0) {
          effect.tick += 1;
          const damage = Math.max(1, Math.floor(Number(effect.damage) || 1));
          if (isPlayer) {
            entity.hp = Math.max(0, entity.hp - damage);
            entity.hurtCooldown = 0.2;
            this.player.stats.damageTaken += damage;
            this.addFloater(entity.x, entity.y, `-${damage}`, effect.color ?? "#87d65a");
            if (entity.hp <= 0) this.player.stats.deaths += 1;
          } else {
            this.damageMonster(entity, damage, "magic", false);
          }
        }
      }
    }
    for (const effect of entity.statusEffects) {
      if (effect.duration > 0) continue;
      if (effect.particleEmitterId) this.particleEngine?.removeEmitter(effect.particleEmitterId);
    }
    entity.statusEffects = entity.statusEffects.filter((effect) => effect.duration > 0);
  },

  statusSpeedMultiplier(entity) {
    const rooted = (entity.statusEffects ?? []).some((effect) => effect.type === "root" && effect.duration > 0);
    if (rooted) return 0;
    const slow = (entity.statusEffects ?? [])
      .filter((effect) => effect.type === "slow" && effect.duration > 0)
      .reduce((max, effect) => Math.max(max, Number(effect.pct) || 0), 0);
    return Math.max(0.25, 1 - slow);
  },

  damagePlayer(amount, source, critical = false) {
    const stats = this.calcStats();
    if (Math.random() < stats.dodgeChance) {
      this.addFloater(this.player.x, this.player.y, "Dodge", "#9ee8a4");
      return;
    }
    const blocked = Math.random() < stats.blockChance;
    const blockedAmount = blocked ? amount * 0.5 : amount;
    const mitigated = Math.max(1, Math.floor(blockedAmount * (100 / (100 + stats.armor * 7))));
    this.player.hp = Math.max(0, this.player.hp - mitigated);
    this.player.stats.damageTaken += mitigated;
    this.player.hurtCooldown = 0.2;
    this.camera.shake = Math.max(this.camera.shake, 4);
    this.addFloater(this.player.x, this.player.y, blocked ? `Block -${mitigated}` : critical ? `CRIT -${mitigated}` : `-${mitigated}`, "#ff7272");
    this.addParticles(this.player.x, this.player.y, "#cc3c3c", 9, 0.1);
    this.drainArmorDurability();
    if (this.player.hp <= 0) {
      this.player.stats.deaths += 1;
      this.applyDeathDurabilityLoss();
      this.addToast(`Faldt mod ${source.typeName}`);
    }
      if (this.player.hp <= 0) {
        const xp = Math.max(0, Number(this.player.xp) || 0);
        const nextXp = Math.max(1, this.xpForNextLevel());
        const xpPct = xp / nextXp;
        this.lastDeath = { id: ++this.deathSerial, xpPct };
      }
  },

  damageMonster(monster, amount, sourceType, critical = false) {
    this.markMobSeen?.(monster?.typeName);
    if (Math.random() < (Number(monster.dodgeChance) || 0)) {
      this.addFloater(monster.x, monster.y, "Dodge", "#9ee8a4");
      return;
    }
    const blocked = Math.random() < (Number(monster.blockChance) || 0);
    const damage = Math.max(1, Math.floor(blocked ? amount * 0.5 : amount));
    const beforeHp = Math.max(0, Math.floor(Number(monster.hp) || 0));
    monster.hp = Math.max(0, monster.hp - damage);
    this.player.stats.damageDealt += Math.min(beforeHp, damage);
    monster.hurt = 0.18;
    this.addFloater(monster.x, monster.y, blocked ? `Block -${damage}` : critical ? `CRIT -${damage}` : `-${damage}`, critical ? "#ffdf5f" : sourceType === "magic" ? "#9de9ff" : "#f1d08d");
    const stats = this.calcStats();
    if (stats.lifeSteal > 0 && damage > 0) {
      const heal = Math.max(1, Math.floor(damage * stats.lifeSteal));
      this.player.hp = Math.min(stats.maxHp, this.player.hp + heal);
    }
    if (monster.hp <= 0) this.killMonster(monster);
  },

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
  },

  destroyObject(object, def) {
    const { cx, cy } = chunkCoords(object.x, object.y);
    const chunk = this.getChunk(cx, cy);
    const index = chunk.objects.findIndex((entry) => entry.id === object.id);
    if (index < 0) return;
    this.particleEngine?.removeEmittersByOwner(object.id);
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
  },

  killMonster(monster) {
    if (monster.dead) return;
    monster.dead = true;
    this.recordMonsterKill(monster);
    if (monster.elite) {
      // Elite killed — game UI already shows effects, no debug toast needed
    }
    const xp = this.modifiedXp?.(monster.xp) ?? monster.xp;
    this.player.xp += xp;
    if (!monster.isMinion) this.applyQuestKill(monster);
    this.addFloater(monster.x, monster.y, `+${xp} xp`, "#e0aa3f", 0.95);
    if (!monster.isMinion) this.changePopularity(monsterPopularityDelta(monster, this.player.level), monster.x, monster.y);
    this.addParticles(monster.x, monster.y, monster.color, 24, 0.16);
    if (!monster.isMinion && !monster.noLoot && !monster.despawnOnDeath) this.dropLoot(monster);
    if (!monster.isMinion) this.despawnMonsterMinions(monster.id);
    if (monster.despawnOnDeath) {
      this.addFloater(monster.x, monster.y, "Forsvinder", monster.color, 0.95);
      this.addParticles(monster.x, monster.y, monster.color, 36, 0.18);
    }
    this.levelUpIfNeeded();
  },

  despawnMonsterMinions(ownerId) {
    for (const minion of this.monsters.values()) {
      if (minion.minionOwnerId !== ownerId || minion.dead) continue;
      minion.dead = true;
      minion.hp = 0;
      this.addParticles(minion.x, minion.y, minion.color, 8, 0.08);
    }
  },

  recordMonsterKill(monster) {
    const typeName = monster?.typeName ?? "Unknown";
    const bucket = monster?.elite ? "elite" : "normal";
    this.player.stats.killsTotal += 1;
    this.player.stats.killsByMonster[typeName] = {
      normal: Math.max(0, Math.floor(Number(this.player.stats.killsByMonster[typeName]?.normal) || 0)) + (bucket === "normal" ? 1 : 0),
      elite: Math.max(0, Math.floor(Number(this.player.stats.killsByMonster[typeName]?.elite) || 0)) + (bucket === "elite" ? 1 : 0),
    };
  },

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
  },

  rollDamage(min, max) {
    return Math.floor(min + Math.random() * (max - min + 1));
  },

  rollPlayerDamage(stats, extra = 0) {
    const base = this.rollDamage(stats.damageMin, stats.damageMax) + Math.max(0, Math.floor(Number(extra) || 0));
    const critical = Math.random() < (Number(stats.critChance) || 0);
    const damage = critical ? Math.floor(base * (Number(stats.critDamage) || 1.5)) : base;
    return { damage: Math.max(1, damage), critical };
  },

  applyStatBonuses(stats, bonuses) {
    stats.maxHp *= 1 + (bonuses.maxHpPct ?? 0);
    stats.maxMana *= 1 + (bonuses.maxManaPct ?? 0);
    stats.armor += bonuses.armorFlat ?? 0;
    stats.damageMin *= 1 + (bonuses.damagePct ?? 0);
    stats.damageMax *= 1 + (bonuses.damagePct ?? 0);
    stats.speed *= 1 + (bonuses.speedPct ?? 0);
    stats.cooldown *= Math.max(0.55, 1 - (bonuses.attackSpeed ?? 0));
    stats.magic += bonuses.magic ?? 0;
    stats.critChance += bonuses.critChance ?? 0;
    stats.critDamage += bonuses.critDamage ?? 0;
    stats.blockChance += bonuses.blockChance ?? 0;
    stats.dodgeChance += bonuses.dodgeChance ?? 0;
    stats.lifeSteal += bonuses.lifeSteal ?? 0;
    stats.magicFind += bonuses.magicFind ?? 0;
    stats.goldFind += bonuses.goldFind ?? 0;
    stats.resourceFind += bonuses.resourceFind ?? 0;
    stats.xpGain += bonuses.xpGain ?? 0;
  },

  calcStats() {
    const readableBonus = normalizeReadableBonuses(this.player.readableBonuses);
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
      critChance: 0,
      critDamage: 1.5,
      blockChance: 0,
      dodgeChance: 0,
      lifeSteal: 0,
      magicFind: 0,
      goldFind: 0,
      resourceFind: 0,
      xpGain: 0,
      mode: "melee",
    };
    const skillBonus = skillTreeBonuses(this.player.skillTree);

    stats.maxHp += readableBonus.maxHp;
    stats.maxMana += readableBonus.maxMana;
    stats.armor += readableBonus.armor;
    stats.damageMin += readableBonus.damageMin;
    stats.damageMax += readableBonus.damageMax;
    stats.range += readableBonus.range;
    stats.speed += readableBonus.speed;
    stats.magic += readableBonus.magic;
    for (const item of Object.values(this.player.equipment)) {
      if (!item) continue;
      // Durability penalty: below threshold stats degrade; at 0 item is unusable
      const dur = Number(item.durability ?? 100);
      if (dur <= 0) continue; // 0% = unusable, skip entirely
      const durMult = dur >= ITEM_DURABILITY_PENALTY_THRESHOLD
        ? 1
        : dur / ITEM_DURABILITY_PENALTY_THRESHOLD;
      const s = (v) => (v || 0) * durMult;
      stats.armor += s(item.armor);
      stats.maxHp += s(item.maxHp);
      stats.maxMana += s(item.maxMana);
      stats.speed += s(item.speed);
      stats.magic += s(item.magic);
      stats.maxHp *= 1 + s(item.maxHpPct);
      stats.maxMana *= 1 + s(item.maxManaPct);
      stats.armor += s(item.armorFlat);
      stats.damageMin *= 1 + s(item.damagePct);
      stats.damageMax *= 1 + s(item.damagePct);
      stats.speed *= 1 + s(item.speedPct);
      stats.cooldown *= Math.max(0.55, 1 - s(item.attackSpeed));
      stats.critChance += s(item.critChance);
      stats.critDamage += s(item.critDamage);
      stats.blockChance += s(item.blockChance);
      stats.dodgeChance += s(item.dodgeChance);
      stats.lifeSteal += s(item.lifeSteal);
      stats.magicFind += s(item.magicFind);
      stats.goldFind += s(item.goldFind);
      stats.resourceFind += s(item.resourceFind);
      stats.xpGain += s(item.xpGain);
      if (item.slot === "weapon") {
        stats.damageMin += s(item.damageMin);
        stats.damageMax += s(item.damageMax);
        stats.range = (item.range || stats.range);
        stats.cooldown = (item.cooldown || stats.cooldown);
        stats.mode = item.mode || stats.mode;
      } else {
        stats.damageMin += s(item.damageMin);
        stats.damageMax += s(item.damageMax);
      }
      this.applyStatBonuses(stats, socketBonusesForItem(item));
    }

    this.applyStatBonuses(stats, skillBonus);
    stats.maxHp = Math.floor(stats.maxHp);
    stats.maxMana = Math.floor(stats.maxMana);
    stats.damageMin = Math.max(1, Math.floor(stats.damageMin));
    stats.damageMax = Math.max(stats.damageMin + 1, Math.floor(stats.damageMax));
    stats.armor = Math.max(0, Math.floor(stats.armor));
    stats.critChance = clamp(stats.critChance, 0, 0.75);
    stats.critDamage = Math.max(1, stats.critDamage);
    stats.blockChance = clamp(stats.blockChance, 0, 0.55);
    stats.dodgeChance = clamp(stats.dodgeChance, 0, 0.55);
    stats.lifeSteal = clamp(stats.lifeSteal, 0, 0.25);
    return stats;
  },

  // ─── Item durability helpers ─────────────────────────────────────────────────

  drainWeaponDurability() {
    const weapon = this.player.equipment?.weapon;
    if (!weapon) return;
    const before = Number(weapon.durability ?? 100);
    weapon.durability = Math.max(0, parseFloat((before - ITEM_DURABILITY_WEAPON_PER_ATTACK).toFixed(2)));
    if (before > 0 && weapon.durability === 0) {
      this.addToast(`${weapon.name} er brudt! Reparer det hos smeden.`);
      this.publishSnapshot();
    }
  },

  drainArmorDurability() {
    let changed = false;
    for (const [slotId, item] of Object.entries(this.player.equipment ?? {})) {
      if (!item || slotId === "weapon") continue;
      const before = Number(item.durability ?? 100);
      item.durability = Math.max(0, parseFloat((before - ITEM_DURABILITY_ARMOR_PER_HIT).toFixed(2)));
      if (before > 0 && item.durability === 0) {
        this.addToast(`${item.name} er brudt! Reparer det hos smeden.`);
        changed = true;
      }
    }
    if (changed) this.publishSnapshot();
  },

  applyDeathDurabilityLoss() {
    const lossMin = ITEM_DURABILITY_DEATH_MIN_PCT;
    const lossMax = ITEM_DURABILITY_DEATH_MAX_PCT;
    for (const item of Object.values(this.player.equipment ?? {})) {
      if (!item) continue;
      const dur = Number(item.durability ?? 100);
      if (dur <= ITEM_DURABILITY_DEATH_THRESHOLD) continue; // already low
      const loss = lossMin + Math.random() * (lossMax - lossMin);
      item.durability = Math.max(0, parseFloat((dur - loss).toFixed(2)));
    }
    // Gold loss: 0–5% of current gold
    const goldLoss = Math.floor(this.player.gold * Math.random() * ITEM_GOLD_DEATH_LOSS_MAX);
    if (goldLoss > 0) {
      this.player.gold = Math.max(0, this.player.gold - goldLoss);
      this.addToast(`Mistede ${goldLoss} guld ved dødsfald`);
    }
    this.publishSnapshot();
  },

  xpForNextLevel() {
    return Math.floor(80 + this.player.level * this.player.level * 42);
  },

  nearestMonster(maxRange) {
    let best = null;
    let bestD = maxRange;
    for (const monster of this.nearbyMonsters(2)) {
      if (monster.dead) continue;
      if (!this.isPointVisible(monster)) continue;
      const d = distance(this.player, monster);
      if (d < bestD) {
        best = monster;
        bestD = d;
      }
    }
    return best;
  },

  nearestDestructibleObject(maxRange) {
    let best = null;
    let bestD = maxRange;
    for (const chunk of this.nearbyChunks(1)) {
      for (const object of chunk.objects) {
        if (!isDestructibleObject(object)) continue;
        if (!this.isPointVisible(object)) continue;
        const d = distance(this.player, object);
        if (d < bestD) {
          best = object;
          bestD = d;
        }
      }
    }
    return best;
  },

  findObjectById(id) {
    if (!id) return null;
    for (const chunk of this.nearbyChunks(2)) {
      const object = chunk.objects.find((entry) => entry.id === id);
      if (object) return object;
    }
    return null;
  },

  monsterAtScreen(x, y) {
    let best = null;
    let bestD = 999;
    for (const monster of this.nearbyMonsters(2)) {
      if (monster.dead) continue;
      if (!this.isPointVisible(monster)) continue;
      const screen = worldToScreen(monster.x, monster.y, 0, this.camera);
      const d = Math.hypot(screen.x - x, screen.y - 30 - y);
      if (d < 34 + monster.radius * 28 && d < bestD) {
        best = monster;
        bestD = d;
      }
    }
    return best;
  },

  objectAtScreen(x, y) {
    let best = null;
    let bestD = 999;
    for (const chunk of this.nearbyChunks(2)) {
      for (const object of chunk.objects) {
        if (!isDestructibleObject(object)) continue;
        if (!this.isPointVisible(object)) continue;
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
  },

  questgiverAtScreen(x, y) {
    const questgiver = this.questState.wildernessNpc;
    if (!questgiver) return null;
    if (!this.isPointVisible(questgiver)) return null;
    const screen = worldToScreen(questgiver.x, questgiver.y, 0, this.camera);
    const d = Math.hypot(screen.x - x, screen.y - 34 - y);
    return d < 42 ? questgiver : null;
  }
};
