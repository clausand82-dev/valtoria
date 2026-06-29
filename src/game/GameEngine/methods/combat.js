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
  SPELL_DEFS,
  cityRuntimeModifiers
} from "../dependencies.js";
import {
  monsterPopularityDelta,
  normalizeReadableBonuses,
  incrementStatMap,
  isDestructibleObject,
  getDestructibleDef,
  objectMetadataConfig,
  destructibleObjectScreenHit
} from "../helpers.js";
import { skillTreeBonuses } from "../../config/skill-tree-config.js";
import { socketBonusesForItem } from "../../config/socket-config.js";
import { getClassNodeBonuses } from "../../config/class-config.js";
import {
  ITEM_DURABILITY_WEAPON_PER_ATTACK,
  ITEM_DURABILITY_ARMOR_PER_HIT,
  ITEM_DURABILITY_PENALTY_THRESHOLD,
  ITEM_DURABILITY_DEATH_MIN_PCT,
  ITEM_DURABILITY_DEATH_MAX_PCT,
  ITEM_DURABILITY_DEATH_THRESHOLD,
  ITEM_GOLD_DEATH_LOSS_MAX,
} from "../../config/durability-config.js";
import { applyWorldEnergy } from "../../world-energy.js";
import { getWorldFlag, incrementWorldCounter, recordMonsterFought, recordMonsterKilled, setWorldFlag } from "../../world-state.js";
import { addFactionRepOnPlayer, applyFactionRepEffects, getFactionRepFrom, getKnownFactions, setFactionRepOnPlayer } from "../../config/faction-config.js";
import {
  canDamageTargetWithSource,
  targetDamageBonus,
  targetMetadata,
} from "../../combat/target-metadata.js";

const ELEMENTS = ["physical", "fire", "ice", "lightning", "poison", "arcane", "holy", "shadow", "nature"];
const BONUS_STAT_KEYS = [
  "maxHp", "maxMana", "range", "damageMin", "damageMax", "armor", "speed",
  "maxHpPct", "maxManaPct", "armorFlat", "armorPct", "damagePct", "speedPct", "attackSpeed",
  "magic", "critChance", "critDamage", "blockChance", "blockAmount", "dodgeChance",
  "lifeSteal", "magicFind", "goldFind", "resourceFind", "xpGain",
  "physicalResist", "fireResist", "iceResist", "lightningResist", "poisonResist",
  "arcaneResist", "holyResist", "shadowResist", "natureResist", "allResist",
  "magicResist",
  "physicalDamageBonus", "fireDamageBonus", "iceDamageBonus", "lightningDamageBonus",
  "poisonDamageBonus", "arcaneDamageBonus", "holyDamageBonus", "shadowDamageBonus",
  "natureDamageBonus", "spellDamageBonus", "directDamageBonus", "areaDamageBonus",
  "dotDamageBonus", "hazardDamageBonus", "dotDurationBonus", "statusDurationBonus",
];

function safeElement(element, fallback = "physical") {
  const value = String(element ?? fallback).toLowerCase();
  return ELEMENTS.includes(value) ? value : fallback;
}

function resistKeyForElement(element) {
  return `${safeElement(element)}Resist`;
}

function damageBonusKeyForElement(element) {
  return `${safeElement(element)}DamageBonus`;
}

function damageKindBonusKey(damageKind) {
  const kind = String(damageKind ?? "direct");
  return `${kind}DamageBonus`;
}

function damageDebugEnabled() {
  return typeof window !== "undefined" && window.VALTORIA_DEBUG_DAMAGE === true;
}

const EXPLICIT_STAT_BONUS_KEYS = [
  "maxHp", "maxMana", "range", "damageMin", "damageMax", "armor", "speed",
  "maxHpPct", "maxManaPct", "armorFlat", "damagePct", "speedPct", "attackSpeed",
  "magic", "critChance", "critDamage", "blockChance", "dodgeChance", "lifeSteal",
  "magicFind", "goldFind", "resourceFind", "xpGain",
];

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
    beamStyle: particles.beamStyle ?? visuals.beamStyle ?? null,
    beamJitter: particles.beamJitter ?? visuals.beamJitter ?? null,
    beamSegments: particles.beamSegments ?? visuals.beamSegments ?? null,
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
  isStunned(entity) {
    return (entity?.statusEffects ?? []).some((effect) => effect.type === "stun" && effect.duration > 0);
  },

  updateMonsters(dt) {
    this.processStatusEffects(this.player, dt, true);
    const nearby = this.nearbyMonsters(2);
    const nearbyIds = new Set(nearby.map((monster) => monster.id));
    for (const monster of nearby) {
      if (monster.dead) continue;
      if (!monster.bestiarySeenRecorded && this.isPointVisible(monster)) {
        monster.bestiarySeenRecorded = this.recordBestiarySeen?.(monster) || true;
      }
      this.processStatusEffects(monster, dt, false);
      this.scaleMonsterToHeroLevel(monster);
      monster.attackCooldown = Math.max(0, monster.attackCooldown - dt);
      monster.spellCooldown = Math.max(0, (Number(monster.spellCooldown) || 0) - dt);
      monster.attackAnim = Math.max(0, monster.attackAnim - dt);
      monster.hurt = Math.max(0, monster.hurt - dt);
      const beforeX = monster.x;
      const beforeY = monster.y;
      const d = distance(this.player, monster);
      const stunned = this.isStunned(monster);
      if (stunned) {
        monster.vx = 0;
        monster.vy = 0;
      } else if (d < monster.aggro) {
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

      if (!stunned && Math.hypot(monster.vx, monster.vy) > 0.01) {
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
    for (const monster of this.monsters?.values?.() ?? []) {
      if (monster.dead || nearbyIds.has(monster.id)) continue;
      monster.moving = false;
      monster.vx = Math.abs(Number(monster.vx) || 0) < 0.002
        ? 0
        : (Number(monster.vx) || 0) * Math.pow(0.002, dt);
      monster.vy = Math.abs(Number(monster.vy) || 0) < 0.002
        ? 0
        : (Number(monster.vy) || 0) * Math.pow(0.002, dt);
      monster.moveSpeed = Math.max(0, (Number(monster.moveSpeed) || 0) * Math.pow(0.01, dt));
    }
    this.monsterActivityDebug = {
      ...(this.monsterActivityDebug ?? {}),
      totalMonsters: this.monsters?.size ?? 0,
      nearbyUpdatedMonsters: nearby.length,
    };
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
    if (this.isStunned(monster)) return false;
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
    if (this.isStunned(monster)) return;
    const amount = critical ? monster.damage * (Number(monster.critDamage) || 1.5) : monster.damage;
    this.recordBestiaryFought?.(monster);
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
    this.recordBestiaryFought?.(monster);
    this.damagePlayer(damage, { typeName: `${monster.typeName} shockwave` }, false);
    this.spawnGroundPulseEffect(monster.x, monster.y, radius, {
      color: effect.color ?? "#d8c091",
      durationMs: 420,
      shake: Number(effect.shake) || 0,
    });
  },

  updateMonsterMinions(monster, dt) {
    const config = monster.minions;
    if (this.isStunned(monster)) return;
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
      physicalResist: Number(base.physicalResist) || 0,
      fireResist: Number(base.fireResist) || 0,
      iceResist: Number(base.iceResist) || 0,
      lightningResist: Number(base.lightningResist) || 0,
      poisonResist: Number(base.poisonResist) || 0,
      arcaneResist: Number(base.arcaneResist) || 0,
      holyResist: Number(base.holyResist) || 0,
      shadowResist: Number(base.shadowResist) || 0,
      natureResist: Number(base.natureResist) || 0,
      allResist: Number(base.allResist) || 0,
      spells: [],
      killLydra: 0,
      killNetdra: 0,
      eliteKillLydra: 0,
      eliteKillNetdra: 0,
      speciesId: base.speciesId,
      factionId: base.factionId,
      tags: Array.isArray(base.tags) ? [...base.tags] : [],
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
    this.markRenderDirty?.("monster-spawn");
    return true;
  },

  updateProjectiles(dt) {
    const beforeProjectileCount = this.projectiles.length;
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = this.projectiles[i];
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      projectile.life -= dt;
      this.addParticles(projectile.x, projectile.y, projectile.color, projectile.type === "burst" ? 1 : 0, 0.04, {
        spellInstanceId: projectile.spellInstanceId,
      });

      const expired = projectile.life <= 0;
      let remove = expired || (!projectile.ignoreBlocking && this.isBlocked(projectile.x, projectile.y, 0.12));
      if (!remove) {
        for (const monster of this.nearbyMonsters(2)) {
          if (monster.dead || projectile.owner === "monster") continue;
          if (projectile.noCollision) continue;
          if (!canDamageTargetWithSource(projectile.sourceConfig, "spell", this.targetMetadataFor(monster))) continue;
          if (Math.hypot(monster.x - projectile.x, monster.y - projectile.y) <= monster.radius + projectile.radius) {
            this.applySpellImpact(projectile, projectile.x, projectile.y, monster);
            remove = true;
            break;
          }
        }
        if (!remove && projectile.owner === "player" && !projectile.noCollision && Array.isArray(projectile.sourceConfig?.target)) {
          for (const object of this.nearbyDestructibleObjects(1)) {
            if (!canDamageTargetWithSource(projectile.sourceConfig, "spell", this.targetMetadataFor(object))) continue;
            if (Math.hypot(object.x - projectile.x, object.y - projectile.y) <= object.radius + projectile.radius) {
              this.applySpellImpact(projectile, projectile.x, projectile.y, object);
              remove = true;
              break;
            }
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
        this.markRenderDirty?.("projectile-remove");
      }
    }
    if (beforeProjectileCount !== this.projectiles.length) this.markRenderDirty?.("projectiles");
  },

  primaryAttack(target = null) {
    const stats = this.calcStats();
    const weapon = this.player.equipment?.weapon;
    target = target || this.nearestMonster(stats.range + 0.5, weapon) || this.nearestDestructibleObject(DESTRUCTIBLE_OBJECT_ATTACK_RANGE + 0.5, weapon);
    if (!target || target.dead) return;
    const targetIsObject = isDestructibleObject(target);
    if (!canDamageTargetWithSource(weapon, "weapon", this.targetMetadataFor(target))) return;
    const attackRange = targetIsObject ? DESTRUCTIBLE_OBJECT_ATTACK_RANGE : stats.range;
    const d = distance(this.player, target);
    if (d > attackRange + target.radius) return;

    const n = normalize(target.x - this.player.x, target.y - this.player.y);
    this.setFacing(n.x, n.y);
    this.player.attackCooldown = stats.cooldown;
    this.player.attackAnim = 0.24;

    if (targetIsObject) {
      this.player.stats.meleeAttacks += 1;
      const baseDamage = this.rollDamage(stats.damageMin, stats.damageMax);
      const critical = Math.random() < (Number(stats.critChance) || 0);
      const finalDamage = this.calculateDamage({
        caster: this.player,
        casterStats: stats,
        target,
        baseDamage,
        element: "physical",
        damageKind: "direct",
        criticalOverride: critical,
        source: { type: "weapon", id: weapon?.id ?? "weapon" },
        sourceConfig: weapon,
      }).damage;
      this.damageObject(target, finalDamage);
      this.drainWeaponDurability();
      this.camera.shake = Math.max(this.camera.shake, 3);
      this.player.attackTargetId = null;
      this.player.attackObjectId = null;
      return;
    }

    if (stats.mode === "melee") {
      this.player.stats.meleeAttacks += 1;
      const baseDamage = this.rollDamage(stats.damageMin, stats.damageMax);
      const critical = Math.random() < (Number(stats.critChance) || 0);
      const finalDamage = this.calculateDamage({
        caster: this.player,
        casterStats: stats,
        target,
        baseDamage,
        element: "physical",
        damageKind: "direct",
        criticalOverride: critical,
        source: { type: "weapon", id: weapon?.id ?? "weapon" },
        sourceConfig: weapon,
      }).damage;
      this.damageMonster(target, finalDamage, "melee", critical);
      this.triggerWeaponOnHitEffects({
        weapon: this.player.equipment?.weapon,
        player: this.player,
        target,
        sourceType: "melee",
        stats,
        directDamage: finalDamage,
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
    const projectileBaseDamage = this.rollDamage(stats.damageMin, stats.damageMax) + (stats.mode === "magic" ? Math.floor(stats.magic * 0.45) : 0);
    const projectileCritical = Math.random() < (Number(stats.critChance) || 0);
    const projectileDamage = projectileCritical ? Math.floor(projectileBaseDamage * (Number(stats.critDamage) || 1.5)) : projectileBaseDamage;
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
      damage: Math.max(1, projectileDamage),
      critical: projectileCritical,
      life: stats.range / speed,
      color,
      element: stats.mode === "magic" ? "arcane" : "physical",
      baseDamage: projectileBaseDamage,
      sourceConfig: weapon ? { ...weapon } : null,
      hitMagicScale: 0,
      casterStats: { ...stats },
      casterLevel: this.player.level,
    });
    this.markRenderDirty?.("projectile-spawn");
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
      } else if (effect.type === "targetDamage") {
        this.applyWeaponTargetDamageEffect(effect, context);
      }
    }
  },

  applyWeaponTargetDamageEffect(effect, context = {}) {
    const target = context.target;
    if (!target || target.dead) return;
    if (!canDamageTargetWithSource(effect, "weaponEffect", this.targetMetadataFor(target))) return;
    const baseDamage = (Number(effect.damage) || 0) + (Number(context.directDamage) || 0) * (Number(effect.damagePct) || 0);
    if (baseDamage <= 0) return;
    const damage = this.calculateDamage({
      caster: context.player ?? this.player,
      casterStats: context.stats ?? this.calcStats(),
      target,
      baseDamage,
      element: effect.element ?? "physical",
      damageKind: "direct",
      source: { type: "weaponEffect", id: effect.id ?? "weapon_target_effect" },
      sourceConfig: effect,
    }).damage;
    this.damageMonster(target, damage, effect.damageType ?? "magic", false);
    this.addParticles(target.x, target.y, effect.color ?? "#ff7b38", 8, 0.08);
  },

  applyWeaponAreaDamageEffect(effect, context = {}) {
    const radius = Math.max(0, Number(effect.radius) || 0);
    if (radius <= 0) return;
    const center = this.weaponEffectCenter(effect, context);
    if (!center) return;
    const stats = context.stats ?? this.calcStats();
    const damageType = String(effect.damageType || "magic");
    const damaged = new Set();

    for (const monster of this.nearbyMonsters(2)) {
      if (monster.dead || damaged.has(monster.id)) continue;
      if (!canDamageTargetWithSource(effect, "weaponEffect", this.targetMetadataFor(monster))) continue;
      if (Math.hypot(monster.x - center.x, monster.y - center.y) > radius + monster.radius) continue;
      damaged.add(monster.id);
      const scaleStat = effect.damageScale ? Number(stats[effect.damageScale]) || 0 : 0;
      const damage = this.calculateDamage({
        caster: context.player ?? this.player,
        casterStats: stats,
        target: monster,
        baseDamage: (Number(effect.damage) || 0) + scaleStat * (Number(effect.damageScaleAmount) || 0),
        element: effect.element ?? "arcane",
        damageKind: "area",
        source: { type: "weaponEffect", id: effect.id ?? "weapon_effect" },
        sourceConfig: effect,
      }).damage;
      this.damageMonster(monster, damage, damageType, false);
    }

    for (const critter of this.nearbyCritters?.() ?? []) {
      if (critter.dead || critter.canTakeAreaDamage === false || damaged.has(critter.id)) continue;
      if (!canDamageTargetWithSource(effect, "weaponEffect", this.targetMetadataFor(critter))) continue;
      if (Math.hypot(critter.x - center.x, critter.y - center.y) > radius + critter.radius) continue;
      damaged.add(critter.id);
      const scaleStat = effect.damageScale ? Number(stats[effect.damageScale]) || 0 : 0;
      const damage = this.calculateDamage({
        caster: context.player ?? this.player,
        casterStats: stats,
        target: critter,
        baseDamage: (Number(effect.damage) || 0) + scaleStat * (Number(effect.damageScaleAmount) || 0),
        element: effect.element ?? "arcane",
        damageKind: "area",
        source: { type: "weaponEffect", id: effect.id ?? "weapon_effect" },
        sourceConfig: effect,
      }).damage;
      this.damageCritter?.(critter, damage, damageType, false);
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

  getElementResist(targetStats = {}, element = "physical") {
    const key = resistKeyForElement(element);
    const magicResist = safeElement(element) === "physical" ? 0 : Number(targetStats?.magicResist) || 0;
    const resistBeforeClamp = (Number(targetStats?.[key]) || 0) + (Number(targetStats?.allResist) || 0) + magicResist;
    return {
      resistBeforeClamp,
      resistAfterClamp: clamp(resistBeforeClamp, -100, 75),
    };
  },

  applyResist(damage, targetStats = {}, element = "physical") {
    const { resistBeforeClamp, resistAfterClamp } = this.getElementResist(targetStats, element);
    const damageAfterResist = Math.max(1, Math.floor((Number(damage) || 0) * (1 - resistAfterClamp / 100)));
    return { damage: damageAfterResist, resistBeforeClamp, resistAfterClamp };
  },

  statsForDamageTarget(target) {
    if (target === this.player) return this.calcStats();
    return target ?? {};
  },

  calculateDamage({
    caster = this.player,
    casterStats = null,
    target = null,
    targetStats = null,
    baseDamage = 0,
    element = "physical",
    damageKind = "direct",
    magicScale = 0,
    levelScale = 0,
    canCrit = false,
    criticalOverride = null,
    source = "attack",
    sourceConfig = null,
    debug = false,
  } = {}) {
    const stats = casterStats ?? (caster === this.player ? this.calcStats() : caster ?? {});
    const targetFinalStats = targetStats ?? this.statsForDamageTarget(target);
    const sourceType = typeof source === "object" ? source?.type : source;
    const sourceId = typeof source === "object" ? source?.id : source;
    const resolvedElement = safeElement(element, sourceType === "spell" ? "arcane" : "physical");
    const base = Math.max(0, Number(baseDamage) || 0);
    const magicContribution = (Number(stats?.magic) || 0) * (Number(magicScale) || 0);
    const levelContribution = (Number(caster?.level) || 0) * (Number(levelScale) || 0);
    const spellDamageBonus = sourceType === "spell" || sourceType === "magic" ? Number(stats?.spellDamageBonus) || 0 : 0;
    const elementDamageBonus = Number(stats?.[damageBonusKeyForElement(resolvedElement)]) || 0;
    const kindDamageBonus = Number(stats?.[damageKindBonusKey(damageKind)]) || 0;
    const damageBeforeCrit = Math.max(0, base + magicContribution + levelContribution);
    const targetBonus = targetDamageBonus(sourceConfig, this.targetMetadataFor(target));
    const damageBeforeTargetPercent = Math.max(0, damageBeforeCrit + targetBonus.flat);
    const damageBeforeResistRaw = damageBeforeTargetPercent * targetBonus.multiplier * (1 + spellDamageBonus + elementDamageBonus + kindDamageBonus);
    const critical = criticalOverride === null
      ? Boolean(canCrit && Math.random() < (Number(stats?.critChance) || 0))
      : Boolean(criticalOverride);
    const damageBeforeResist = critical
      ? Math.floor(damageBeforeResistRaw * (Number(stats?.critDamage) || 1.5))
      : Math.floor(damageBeforeResistRaw);
    const resisted = this.applyResist(damageBeforeResist, targetFinalStats, resolvedElement);
    const finalDamage = Math.max(1, resisted.damage);

    if (debug || damageDebugEnabled()) {
      console.debug("[Valtoria Damage]", {
        sourceId,
        element: resolvedElement,
        damageKind,
        baseDamage: base,
        magicScale: Number(magicScale) || 0,
        magicContribution,
        levelContribution,
        spellDamageBonus,
        elementDamageBonus,
        kindDamageBonus,
        targetBonusFlat: targetBonus.flat,
        targetBonusMultiplier: targetBonus.multiplier,
        resistBeforeClamp: resisted.resistBeforeClamp,
        resistAfterClamp: resisted.resistAfterClamp,
        damageBeforeResist,
        damageAfterResist: resisted.damage,
        blocked: false,
        blockAmount: 0,
        finalDamage,
      });
    }

    return { damage: finalDamage, critical };
  },

  applyIncomingBlock(amount, targetStats = {}) {
    const blocked = Math.random() < (Number(targetStats.blockChance) || 0);
    if (!blocked) return { damage: Math.max(1, Math.floor(Number(amount) || 1)), blocked, blockAmount: 0 };
    const blockAmount = Math.max(0, Number(targetStats.blockAmount) || 0);
    const reduced = blockAmount > 0 ? (Number(amount) || 0) - blockAmount : (Number(amount) || 0) * 0.5;
    return { damage: Math.max(1, Math.floor(reduced)), blocked, blockAmount };
  },

  castSpellAt(x, y, spellId = null, options = {}) {
    const stats = this.calcStats();
    const selectedSpellId = spellId ?? this.player.activeSpellId ?? this.player.unlockedSpells?.[0];
    const spell = SPELL_DEFS[selectedSpellId];
    if (!spell) {
      this.addToast("Ingen spellbook er aktiveret i Arcane Archive");
      return false;
    }
    const manaCost = Math.max(0, Math.floor(Number(options.manaCost ?? spell.manaCost) || 0));
    const ignoreCooldown = Boolean(options.ignoreCooldown);
    if (this.player.mana < manaCost || (!ignoreCooldown && this.player.spellCooldown > 0) || this.player.hp <= 0) return false;
    const n = normalize(x - this.player.x, y - this.player.y);
    if (!n.x && !n.y) return false;
    this.player.mana -= manaCost;
    this.applySpellWorldEnergy(spell);
    this.player.stats.spellsCast += 1;
    this.player.spellCooldown = Math.max(0, Number(options.cooldown ?? spell.cooldown) || 0);
    this.player.castAnim = 0.38;
    this.setFacing(n.x, n.y);
    const visuals = spellParticleVisuals(spell);
    const spellInstanceId = createId();
    this.scheduleSpellVisualCleanup(spell, spellInstanceId);
    if (visuals.cast?.type) {
      this.particleEngine?.emitOneShot(visuals.cast.type, this.player.x, this.player.y, {
        ...visuals.cast,
        spellInstanceId,
        layer: visuals.cast.layer ?? "effects",
      });
    }
    if (spell.castMode === "skyfall") {
      this.launchSpellSkyfall({ spell, caster: this.player, owner: "player", x, y, stats, spellInstanceId });
    } else {
      this.launchSpellProjectile({ spell, caster: this.player, owner: "player", x, y, stats, spellInstanceId });
    }
    return true;
  },

  spellTargetPointForHold(heldSpell) {
    const spell = SPELL_DEFS[heldSpell?.spellId];
    if (!spell) return null;
    if (heldSpell?.targetMode === "nearest") {
      const target = this.nearestMonster(Number(spell.range) || 7, spell);
      if (target) return { x: target.x, y: target.y };
    }
    return { x: this.pointer.worldX, y: this.pointer.worldY };
  },

  startHeldSpell(spellId = null, targetMode = "pointer") {
    const selectedSpellId = spellId ?? this.player.activeSpellId ?? this.player.unlockedSpells?.[0];
    const spell = SPELL_DEFS[selectedSpellId];
    if (!spell?.channeled) {
      const target = targetMode === "nearest" ? this.nearestMonster(7, spell) : null;
      this.castSpellAt(target ? target.x : this.pointer.worldX, target ? target.y : this.pointer.worldY, selectedSpellId);
      return false;
    }
    this.heldSpell = {
      spellId: selectedSpellId,
      targetMode,
      tick: 0,
    };
    this.tickHeldSpell(0, true);
    return true;
  },

  stopHeldSpell(spellId = null) {
    if (!this.heldSpell) return;
    if (spellId && this.heldSpell.spellId !== spellId) return;
    this.heldSpell = null;
  },

  updateHeldSpell(dt) {
    if (!this.heldSpell) return;
    this.tickHeldSpell(dt, false);
  },

  tickHeldSpell(dt, force = false) {
    const held = this.heldSpell;
    const spell = SPELL_DEFS[held?.spellId];
    if (!held || !spell?.channeled || this.player.hp <= 0) {
      this.heldSpell = null;
      return false;
    }
    const interval = Math.max(0.05, Number(spell.channelInterval) || 0.2);
    held.tick = Math.max(0, (Number(held.tick) || 0) - dt);
    if (!force && held.tick > 0) return false;
    const manaCost = Math.max(0, Math.floor(Number(spell.channelManaCost ?? spell.manaCost) || 0));
    if (this.player.mana < manaCost) {
      this.heldSpell = null;
      return false;
    }
    const point = this.spellTargetPointForHold(held);
    if (!point) {
      this.heldSpell = null;
      return false;
    }
    const cast = this.castSpellAt(point.x, point.y, held.spellId, {
      manaCost,
      cooldown: spell.channelCooldown ?? interval,
    });
    held.tick = interval;
    if (!cast) this.heldSpell = null;
    return cast;
  },

  scheduleSpellVisualCleanup(spell, spellInstanceId) {
    if (!spellInstanceId) return;
    const travelTime = spell.castMode === "skyfall"
      ? (Math.max(1, Number(spell.shardFallDistance) || 5) / Math.max(1, Number(spell.speed) || 10)) + 0.8
      : (Math.max(0.1, Number(spell.range) || 1) / Math.max(0.1, Number(spell.speed) || 1)) + 0.4;
    const hazardTime = Math.max(0, Number(spell.hazardDuration) || 0);
    const particleTail = spell.id === "blizzard" ? 0.15 : 5;
    this.spellVisualCleanups ??= [];
    this.spellVisualCleanups.push({
      spellInstanceId,
      spellId: spell.id,
      life: Math.max(0.5, travelTime + hazardTime + particleTail),
    });
  },

  applySpellWorldEnergy(spell) {
    const netdra = Number(spell?.netdra) || 0;
    const lydra = Number(spell?.lydra) || 0;
    if (!lydra && !netdra) return;
    applyWorldEnergy(this, { lydra, netdra });
  },

  castMonsterSpell(monster, spellId) {
    const spell = SPELL_DEFS[spellId];
    if (!spell || monster.dead) return;
    if (this.isStunned(monster)) return;
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

  launchSpellProjectile({ spell, caster, owner, x, y, stats, spellInstanceId = null }) {
    const n = normalize(x - caster.x, y - caster.y);
    const baseHitDamage = this.rollDamage(stats.damageMin, stats.damageMax) + (Number(spell.hitDamage) || 0);
    const critical = Math.random() < (Number(stats.critChance) || 0);
    const visuals = spellParticleVisuals(spell);
    const projectile = {
      id: createId(),
      type: spell.id,
      spellId: spell.id,
      spellInstanceId,
      sourceConfig: spell,
      owner,
      casterTypeName: caster.typeName ?? null,
      x: caster.x + n.x * 0.5,
      y: caster.y + n.y * 0.5,
      beamStartX: caster.x + n.x * 0.18,
      beamStartY: caster.y + n.y * 0.18,
      vx: n.x * spell.speed,
      vy: n.y * spell.speed,
      radius: spell.radius ?? 0.22,
      damage: Math.max(1, Math.floor(baseHitDamage + (Number(stats.magic) || 0) * (Number(spell.hitMagicScale ?? spell.magicScale) || 0))),
      baseDamage: baseHitDamage,
      hitMagicScale: spell.hitMagicScale ?? spell.magicScale ?? 0,
      areaMagicScale: spell.areaMagicScale ?? 0,
      dotMagicScale: spell.dotMagicScale ?? 0,
      hazardMagicScale: spell.hazardMagicScale ?? spell.dotMagicScale ?? spell.areaMagicScale ?? 0,
      element: spell.element ?? (owner === "player" ? "arcane" : "physical"),
      critical,
      casterStats: { ...stats },
      casterLevel: caster.level,
      life: spell.range / spell.speed,
      color: spell.color,
      texture: visuals.projectileTexture,
      textureSize: visuals.projectileTextureSize,
      rotateTexture: visuals.rotateProjectileTexture,
      textureRotationOffset: visuals.projectileTextureRotationOffset,
      beam: Boolean(visuals.beam),
      beamWidth: visuals.beamWidth,
      beamStyle: visuals.beamStyle,
      beamJitter: visuals.beamJitter,
      beamSegments: visuals.beamSegments,
      areaRadius: spell.areaRadius ?? 0,
      areaDamage: spell.areaDamage ?? 0,
      dotDamage: spell.dotDamage ?? 0,
      dotDuration: spell.dotDuration ?? 0,
      slowPct: spell.slowPct ?? 0,
      slowDuration: spell.slowDuration ?? 0,
      stunDuration: spell.stunDuration ?? 0,
      hazardDuration: spell.hazardDuration ?? 0,
      hazardTick: spell.hazardTick ?? 1,
      explodeOnEnd: Boolean(spell.explodeOnEnd),
      particleVisuals: visuals,
    };
    this.projectiles.push(projectile);
    this.markRenderDirty?.("projectile-spawn");
    if (visuals.trail?.type) {
      this.particleEngine?.attachEmitterToProjectile(projectile.id, {
        ...visuals.trail,
        spellInstanceId,
        layer: visuals.trail.layer ?? "effects",
        radius: visuals.trail.radius ?? 8,
      });
    }
  },

  launchSpellSkyfall({ spell, caster, owner, x, y, stats, spellInstanceId = null }) {
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
      const baseHitDamage = this.rollDamage(stats.damageMin, stats.damageMax) + (Number(spell.hitDamage) || 0);
      const critical = Math.random() < (Number(stats.critChance) || 0);
      const projectile = {
        id: createId(),
        type: spell.id,
        spellId: spell.id,
        spellInstanceId,
        sourceConfig: spell,
        owner,
        casterTypeName: caster.typeName ?? null,
        x: impactX - fallDirection.x * fallDistance - stagger * speed,
        y: impactY - fallDirection.y * fallDistance,
        vx: fallDirection.x * speed,
        vy: fallDirection.y * speed,
        radius: spell.radius ?? 0.16,
        damage: Math.max(1, Math.floor(baseHitDamage + (Number(stats.magic) || 0) * (Number(spell.hitMagicScale ?? spell.magicScale) || 0))),
        baseDamage: baseHitDamage,
        hitMagicScale: spell.hitMagicScale ?? spell.magicScale ?? 0,
        areaMagicScale: spell.areaMagicScale ?? 0,
        dotMagicScale: spell.dotMagicScale ?? 0,
        hazardMagicScale: spell.hazardMagicScale ?? spell.dotMagicScale ?? spell.areaMagicScale ?? 0,
        element: spell.element ?? (owner === "player" ? "arcane" : "physical"),
        critical,
        casterStats: { ...stats },
        casterLevel: caster.level,
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
        stunDuration: spell.stunDuration ?? 0,
        hazardDuration: spell.hazardDuration ?? 0,
        hazardTick: spell.hazardTick ?? 1,
        explodeOnEnd: true,
        ignoreBlocking: true,
        noCollision: true,
        particleVisuals: visuals,
      };
      this.projectiles.push(projectile);
      this.markRenderDirty?.("projectile-spawn");
      if (visuals.trail?.type) {
        this.particleEngine?.attachEmitterToProjectile(projectile.id, {
          ...visuals.trail,
          spellInstanceId,
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
        if ((direct || inArea) && canDamageTargetWithSource(projectile.sourceConfig, "spell", this.targetMetadataFor(monster))) targets.push(monster);
      }
      for (const critter of this.nearbyCritters?.() ?? []) {
        if (critter.dead || critter.canTakeAreaDamage === false) continue;
        const inArea = projectile.areaRadius > 0 && Math.hypot(critter.x - x, critter.y - y) <= projectile.areaRadius + critter.radius;
        if (inArea && canDamageTargetWithSource(projectile.sourceConfig, "spell", this.targetMetadataFor(critter))) targets.push(critter);
      }
      if (Array.isArray(projectile.sourceConfig?.target)) {
        for (const object of this.nearbyDestructibleObjects(2)) {
          const direct = directTarget === object;
          const inArea = projectile.areaRadius > 0 && Math.hypot(object.x - x, object.y - y) <= projectile.areaRadius + object.radius;
          if ((direct || inArea) && canDamageTargetWithSource(projectile.sourceConfig, "spell", this.targetMetadataFor(object))) targets.push(object);
        }
      }
    } else {
      const direct = directTarget === this.player;
      const inArea = projectile.areaRadius > 0 && Math.hypot(this.player.x - x, this.player.y - y) <= projectile.areaRadius + this.player.radius;
      if (direct || inArea) targets.push(this.player);
    }

    for (const target of targets) {
      const direct = target === directTarget;
      const damage = direct
        ? this.calculateDamage({
          caster: { level: projectile.casterLevel },
          casterStats: projectile.casterStats,
          target,
          baseDamage: projectile.baseDamage ?? projectile.damage,
          element: projectile.element,
          damageKind: "direct",
          magicScale: projectile.hitMagicScale ?? 0,
          criticalOverride: projectile.critical,
          source: { type: "spell", id: projectile.spellId ?? "spell" },
          sourceConfig: projectile.sourceConfig,
        }).damage
        : this.calculateDamage({
          caster: { level: projectile.casterLevel },
          casterStats: projectile.casterStats,
          target,
          baseDamage: projectile.areaDamage || (projectile.baseDamage ?? projectile.damage) * 0.55,
          element: projectile.element,
          damageKind: "area",
          magicScale: projectile.areaMagicScale ?? 0,
          source: { type: "spell", id: projectile.spellId ?? "spell" },
          sourceConfig: projectile.sourceConfig,
        }).damage;
      if (target === this.player) {
        if (projectile.casterTypeName) this.recordBestiaryFought?.({ typeName: projectile.casterTypeName });
        this.damagePlayer(damage, { typeName: projectile.casterTypeName ?? projectile.spellId }, projectile.critical && direct);
      } else if (target.runtimeType === "critter" || target.type === "critter") {
        this.damageCritter?.(target, damage, "magic", false);
      } else if (isDestructibleObject(target)) {
        this.damageObject(target, damage);
      } else {
        this.damageMonster(target, damage, "magic", projectile.critical && direct);
      }
      if (!target.dead && !(target.runtimeType === "critter" || target.type === "critter" || isDestructibleObject(target))) this.applyProjectileStatus(target, projectile);
      this.spawnImpactBeamVisual(projectile, target);
    }
    const impact = projectile.particleVisuals?.impact;
    if (impact?.type) {
      this.particleEngine?.emitOneShot(impact.type, x, y, {
        ...impact,
        spellInstanceId: projectile.spellInstanceId,
        layer: impact.layer ?? "effects",
        oneShotCount: impact.oneShotCount ?? (projectile.areaRadius > 0 ? 30 : 14),
      });
    } else {
      this.addParticles(x, y, projectile.color, projectile.areaRadius > 0 ? 26 : 9, 0.08, {
        spellInstanceId: projectile.spellInstanceId,
      });
    }
    if (projectile.hazardDuration > 0 && projectile.areaRadius > 0) {
      this.spawnGroundHazard(projectile, x, y);
    }
  },

  spawnImpactBeamVisual(projectile, target) {
    if (!projectile?.beam || !target) return;
    this.projectiles.push({
      id: createId(),
      type: projectile.type,
      spellId: projectile.spellId,
      spellInstanceId: projectile.spellInstanceId ?? null,
      owner: projectile.owner,
      x: target.x,
      y: target.y,
      vx: 0,
      vy: 0,
      radius: 0,
      life: 0.12,
      color: projectile.color,
      beam: true,
      beamStartX: projectile.beamStartX ?? projectile.x,
      beamStartY: projectile.beamStartY ?? projectile.y,
      beamWidth: projectile.beamWidth,
      beamStyle: projectile.beamStyle,
      beamJitter: projectile.beamJitter,
      beamSegments: projectile.beamSegments,
      noCollision: true,
      ignoreBlocking: true,
      particleVisuals: projectile.particleVisuals,
    });
    this.markRenderDirty?.("projectile-spawn");
  },

  spawnGroundHazard(projectile, x, y) {
    const radius = Math.max(0.1, Number(projectile.areaRadius) || 0.1);
    const hazard = {
      id: createId(),
      owner: projectile.owner,
      spellId: projectile.spellId,
      spellInstanceId: projectile.spellInstanceId ?? null,
      sourceConfig: projectile.sourceConfig ?? null,
      x,
      y,
      radius,
      baseDamage: Math.max(1, Number(projectile.dotDamage || projectile.areaDamage || 1)),
      magicScale: projectile.hazardMagicScale ?? 0,
      element: projectile.element,
      casterStats: projectile.casterStats ? { ...projectile.casterStats } : null,
      casterLevel: projectile.casterLevel,
      tickInterval: Math.max(0.2, Number(projectile.hazardTick) || 1),
      tick: 0,
      life: Math.max(0.2, Number(projectile.hazardDuration) || 1),
      maxLife: Math.max(0.2, Number(projectile.hazardDuration) || 1),
      color: projectile.color ?? "#87d65a",
    };
    this.groundHazards ??= [];
    this.groundHazards.push(hazard);
    if (this.isWorldPointNearViewport?.(x, y, 0, Math.max(180, radius * 96))) this.markRenderDirty?.("hazard-spawn");
    const cloud = this.spawnGroundCloudEffect(x, y, radius, hazard.color, hazard.life, { ownerId: hazard.id, spellInstanceId: hazard.spellInstanceId });
    hazard.groundCloudParticleId = cloud?.id ?? null;
    const area = projectile.particleVisuals?.area;
    if (area?.type) {
      hazard.particleEmitterId = this.particleEngine?.addEmitter({
        ...area,
        spellInstanceId: hazard.spellInstanceId,
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
        const wasVisible = this.isWorldPointNearViewport?.(hazard.x, hazard.y, 0, Math.max(180, (Number(hazard.radius) || 0) * 96));
        if (hazard.particleEmitterId) {
          this.particleEngine?.removeEmitter(hazard.particleEmitterId);
        }
        this.removeHazardLegacyParticles(hazard);
        this.removeHazardAreaParticles(hazard);
        this.groundHazards.splice(i, 1);
        if (wasVisible) this.markRenderDirty?.("hazard-remove");
      }
    }
  },

  updateSpellVisualCleanups(dt) {
    if (!Array.isArray(this.spellVisualCleanups) || this.spellVisualCleanups.length === 0) return;
    for (let i = this.spellVisualCleanups.length - 1; i >= 0; i -= 1) {
      const cleanup = this.spellVisualCleanups[i];
      cleanup.elapsed = (Number(cleanup.elapsed) || 0) + dt;
      cleanup.life -= dt;
      const visualsRemain = this.hasSpellVisualInstance?.(cleanup.spellInstanceId);
      if (cleanup.life > 0 && (cleanup.elapsed < 0.25 || visualsRemain)) continue;
      this.cleanupSpellVisuals(cleanup.spellInstanceId, cleanup.spellId);
      this.spellVisualCleanups.splice(i, 1);
      this.cleanupExpiredEffectsRemoved = (this.cleanupExpiredEffectsRemoved ?? 0) + 1;
    }
    if (this.effectDebugCounts) this.effectDebugCounts.cleanupQueueLength = this.spellVisualCleanups.length;
  },

  hasSpellVisualInstance(spellInstanceId) {
    if (!spellInstanceId) return false;
    if ((this.projectiles ?? []).some((entry) => entry?.spellInstanceId === spellInstanceId)) return true;
    if ((this.groundHazards ?? []).some((entry) => entry?.spellInstanceId === spellInstanceId && (Number(entry.life) || 0) > 0)) return true;
    if ((this.particles ?? []).some((entry) => entry?.spellInstanceId === spellInstanceId && (Number(entry.life) || 0) > 0)) return true;
    if ((this.particleEngine?.particles ?? []).some((entry) => entry?.spellInstanceId === spellInstanceId && (Number(entry.lifetime) || 0) > (Number(entry.age) || 0))) return true;
    for (const emitter of this.particleEngine?.emitters?.values?.() ?? []) {
      if (!emitter?.dead && emitter.config?.spellInstanceId === spellInstanceId) return true;
    }
    return false;
  },

  cleanupSpellVisuals(spellInstanceId, spellId = null) {
    if (!spellInstanceId) return;
    this.particleEngine?.removeEmittersByConfig("spellInstanceId", spellInstanceId);
    this.particleEngine?.fadeParticlesByConfig?.("spellInstanceId", spellInstanceId, 0.55);
    if (spellId === "blizzard") {
      const frostTypes = new Set(["cast_ice", "trail_ice", "impact_ice", "frost_ground", "status_frozen", "hit_sparks"]);
      this.particleEngine?.removeEmittersWhere?.((emitter) => {
        const config = emitter?.config ?? {};
        const colors = Array.isArray(config.colors) ? config.colors : [];
        return frostTypes.has(config.type) || colors.some((color) => String(color).toLowerCase() === "#8bdfff");
      });
      this.particleEngine?.fadeParticlesWhere?.((particle) => String(particle.color ?? "").toLowerCase() === "#8bdfff", 0.55);
    }
    if (Array.isArray(this.particles)) {
      for (const particle of this.particles) {
        if (particle.spellInstanceId !== spellInstanceId && !(spellId === "blizzard" && String(particle.color ?? "").toLowerCase() === "#8bdfff")) continue;
        particle.life = Math.min(Number(particle.life) || 0, 0.55);
      }
    }
    if (Array.isArray(this.groundHazards)) {
      this.groundHazards = this.groundHazards.filter((hazard) => {
        if (hazard.spellInstanceId !== spellInstanceId) return true;
        if (hazard.particleEmitterId) {
          this.particleEngine?.removeEmitter(hazard.particleEmitterId);
        }
        this.removeHazardLegacyParticles(hazard);
        this.removeHazardAreaParticles(hazard);
        return false;
      });
    }
  },

  removeHazardLegacyParticles(hazard) {
    if (!hazard || !Array.isArray(this.particles)) return;
    this.particles = this.particles.filter((particle) => (
      particle.ownerId !== hazard.id
      && particle.id !== hazard.groundCloudParticleId
    ));
  },

  removeHazardAreaParticles(hazard) {
    if (!hazard) return;
    if (hazard.particleEmitterId) this.particleEngine?.removeParticlesByEmitter(hazard.particleEmitterId);
  },

  applyGroundHazardTick(hazard) {
    if (hazard.owner === "player") {
      for (const monster of this.nearbyMonsters(2)) {
        if (monster.dead) continue;
        if (!canDamageTargetWithSource(hazard.sourceConfig, "spell", this.targetMetadataFor(monster))) continue;
        if (Math.hypot(monster.x - hazard.x, monster.y - hazard.y) > hazard.radius + monster.radius) continue;
        const damage = this.calculateDamage({
          caster: { level: hazard.casterLevel },
          casterStats: hazard.casterStats,
          target: monster,
          baseDamage: hazard.baseDamage,
          element: hazard.element,
          damageKind: "hazard",
          magicScale: hazard.magicScale,
          source: { type: "spell", id: hazard.spellId ?? "hazard" },
          sourceConfig: hazard.sourceConfig,
        }).damage;
        this.damageMonster(monster, damage, "magic", false);
      }
      for (const critter of this.nearbyCritters?.() ?? []) {
        if (critter.dead || critter.canTakeAreaDamage === false) continue;
        if (!canDamageTargetWithSource(hazard.sourceConfig, "spell", this.targetMetadataFor(critter))) continue;
        if (Math.hypot(critter.x - hazard.x, critter.y - hazard.y) > hazard.radius + critter.radius) continue;
        const damage = this.calculateDamage({
          caster: { level: hazard.casterLevel },
          casterStats: hazard.casterStats,
          target: critter,
          baseDamage: hazard.baseDamage,
          element: hazard.element,
          damageKind: "hazard",
          magicScale: hazard.magicScale,
          source: { type: "spell", id: hazard.spellId ?? "hazard" },
          sourceConfig: hazard.sourceConfig,
        }).damage;
        this.damageCritter?.(critter, damage, "magic", false);
      }
      if (Array.isArray(hazard.sourceConfig?.target)) {
        for (const object of this.nearbyDestructibleObjects(2)) {
          if (Math.hypot(object.x - hazard.x, object.y - hazard.y) > hazard.radius + object.radius) continue;
          if (!canDamageTargetWithSource(hazard.sourceConfig, "spell", this.targetMetadataFor(object))) continue;
          const damage = this.calculateDamage({
            caster: { level: hazard.casterLevel },
            casterStats: hazard.casterStats,
            target: object,
            baseDamage: hazard.baseDamage,
            element: hazard.element,
            damageKind: "hazard",
            magicScale: hazard.magicScale,
            source: { type: "spell", id: hazard.spellId ?? "hazard" },
            sourceConfig: hazard.sourceConfig,
          }).damage;
          this.damageObject(object, damage);
        }
      }
      return;
    }
    if (Math.hypot(this.player.x - hazard.x, this.player.y - hazard.y) <= hazard.radius + this.player.radius) {
      const damage = this.calculateDamage({
        caster: { level: hazard.casterLevel },
        casterStats: hazard.casterStats,
        target: this.player,
        baseDamage: hazard.baseDamage,
        element: hazard.element,
        damageKind: "hazard",
        magicScale: hazard.magicScale,
        source: { type: "spell", id: hazard.spellId ?? "hazard" },
        sourceConfig: hazard.sourceConfig,
      }).damage;
      this.damagePlayer(damage, { typeName: hazard.spellId ?? "hazard" }, false);
    }
  },

  applyProjectileStatus(target, projectile) {
    if (!target) return;
    target.statusEffects = Array.isArray(target.statusEffects) ? target.statusEffects : [];
    if (projectile.dotDamage > 0 && projectile.dotDuration > 0) {
      target.statusEffects.push({
        type: "dot",
        damage: projectile.dotDamage,
        baseDamage: projectile.dotDamage,
        magicScale: projectile.dotMagicScale ?? 0,
        element: projectile.element,
        sourceId: projectile.spellId,
        sourceConfig: projectile.sourceConfig ?? null,
        casterStats: projectile.casterStats ? { ...projectile.casterStats } : null,
        casterLevel: projectile.casterLevel,
        duration: projectile.dotDuration * (1 + (Number(projectile.casterStats?.dotDurationBonus) || 0)),
        tick: 1,
        color: projectile.color,
        particle: projectile.particleVisuals?.status ?? null,
      });
    }
    if (projectile.slowPct > 0 && projectile.slowDuration > 0) {
      target.statusEffects.push({
        type: "slow",
        pct: projectile.slowPct,
        duration: projectile.slowDuration * (1 + (Number(projectile.casterStats?.statusDurationBonus) || 0)),
        particle: projectile.particleVisuals?.status ?? null,
      });
    }
    if (projectile.stunDuration > 0) {
      target.statusEffects.push({
        type: "stun",
        duration: projectile.stunDuration * (1 + (Number(projectile.casterStats?.statusDurationBonus) || 0)),
        sourceId: projectile.spellId,
        color: projectile.color,
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
          const damage = effect.casterStats
            ? this.calculateDamage({
              caster: { level: effect.casterLevel },
              casterStats: effect.casterStats,
              target: entity,
              baseDamage: effect.baseDamage ?? effect.damage,
              element: effect.element,
              damageKind: "dot",
              magicScale: effect.magicScale,
              source: { type: "spell", id: effect.sourceId ?? "dot" },
              sourceConfig: effect.sourceConfig,
            }).damage
            : Math.max(1, Math.floor(Number(effect.damage) || 1));
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
      } else if (effect.type === "regen" && isPlayer) {
        effect.tick -= dt;
        if (effect.tick <= 0) {
          effect.tick += Math.max(0.1, Number(effect.tickMax) || 1);
          const stats = this.calcStats();
          const hpGain = Math.max(0, Math.floor(stats.maxHp * (Number(effect.healthPct) || 0)));
          const manaGain = Math.max(0, Math.floor(stats.maxMana * (Number(effect.manaPct) || 0)));
          if (hpGain > 0 && entity.hp < stats.maxHp) {
            entity.hp = clamp(entity.hp + hpGain, 0, stats.maxHp);
            this.addFloater(entity.x, entity.y, `+${hpGain}`, effect.color ?? "#58d96d", 0.65);
          }
          if (manaGain > 0 && entity.mana < stats.maxMana) {
            entity.mana = clamp(entity.mana + manaGain, 0, stats.maxMana);
            this.addFloater(entity.x, entity.y, `+${manaGain} mana`, effect.color ?? "#58bfff", 0.65);
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

  clearStatusEffectParticles(entity) {
    if (!Array.isArray(entity?.statusEffects)) return;
    for (const effect of entity.statusEffects) {
      if (!effect.particleEmitterId) continue;
      this.particleEngine?.removeEmitter(effect.particleEmitterId);
      this.particleEngine?.removeParticlesByEmitter(effect.particleEmitterId);
    }
    entity.statusEffects = [];
  },

  statusSpeedMultiplier(entity) {
    if (this.isStunned(entity)) return 0;
    const rooted = (entity.statusEffects ?? []).some((effect) => effect.type === "root" && effect.duration > 0);
    if (rooted) return 0;
    if (entity === this.player && this.calcStats().slowImmune) return 1;
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
    const block = this.applyIncomingBlock(amount, stats);
    const mitigated = Math.max(1, Math.floor(block.damage * (100 / (100 + stats.armor * 7))));
    if (damageDebugEnabled()) console.debug("[Valtoria Damage Block]", { target: "player", blocked: block.blocked, blockAmount: block.blockAmount, damageBeforeBlock: amount, damageAfterBlock: block.damage, finalDamage: mitigated });
    this.player.hp = Math.max(0, this.player.hp - mitigated);
    this.player.stats.damageTaken += mitigated;
    this.player.hurtCooldown = 0.2;
    this.camera.shake = Math.max(this.camera.shake, 4);
    this.addFloater(this.player.x, this.player.y, block.blocked ? `Block -${mitigated}` : critical ? `CRIT -${mitigated}` : `-${mitigated}`, "#ff7272");
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
    if (monster?.runtimeType === "critter" || monster?.type === "critter") {
      this.damageCritter?.(monster, amount, sourceType, critical);
      return;
    }
    this.markMobSeen?.(monster?.typeName);
    if (Math.random() < (Number(monster.dodgeChance) || 0)) {
      this.addFloater(monster.x, monster.y, "Dodge", "#9ee8a4");
      return;
    }
    const block = this.applyIncomingBlock(amount, monster);
    const damage = block.damage;
    if (damageDebugEnabled()) console.debug("[Valtoria Damage Block]", { target: monster?.typeName, blocked: block.blocked, blockAmount: block.blockAmount, damageBeforeBlock: amount, damageAfterBlock: block.damage, finalDamage: damage });
    const beforeHp = Math.max(0, Math.floor(Number(monster.hp) || 0));
    monster.hp = Math.max(0, monster.hp - damage);
    if (damage > 0) this.recordBestiaryFought?.(monster);
    this.player.stats.damageDealt += Math.min(beforeHp, damage);
    if (critical && damage > 0) this.triggerEquipmentDurabilityEvent?.("criticalHit");
    monster.hurt = 0.18;
    this.addFloater(monster.x, monster.y, block.blocked ? `Block -${damage}` : critical ? `CRIT -${damage}` : `-${damage}`, critical ? "#ffdf5f" : sourceType === "magic" ? "#9de9ff" : "#f1d08d");
    const stats = this.calcStats();
    if (stats.lifeSteal > 0 && damage > 0) {
      const heal = Math.max(1, Math.floor(damage * stats.lifeSteal));
      this.player.hp = Math.min(stats.maxHp, this.player.hp + heal);
      this.spawnHeroHealingEffect?.();
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
    const previousHits = Math.max(0, Math.min(stages, Math.floor(Number(object.harvestHits) || 0)));
    object.harvestHits = Math.min(stages, previousHits + 1);
    const remainingStages = Math.max(0, stages - object.harvestHits);
    object.hp = Math.max(0, Math.ceil(object.maxHp * (remainingStages / stages)));
    const popularityDeltaTotal = Number(object.popularityDelta ?? def?.popularityDelta);
    if (Number.isFinite(popularityDeltaTotal) && popularityDeltaTotal !== 0) {
      // Apply popularity changes progressively while damaging an object so impact is visible before full destruction.
      const appliedBefore = Number.isFinite(Number(object.popularityDeltaApplied)) ? Number(object.popularityDeltaApplied) : 0;
      const appliedAfter = (object.harvestHits / stages) * popularityDeltaTotal;
      const stepDelta = appliedAfter - appliedBefore;
      if (Math.abs(stepDelta) > 0.0001) this.changePopularity(stepDelta, object.x, object.y);
      object.popularityDeltaApplied = appliedAfter;
    }
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
    this.spawnObjectBreakDustEffect?.(object.x, object.y);
    this.addParticles(object.x, object.y, def.particleColor ?? "#d8c091", 28, 0.16);
    this.dropLootFromTables(object.x, object.y, def.lootTables ?? [], {
      source: "object",
      object,
      sourceEntity: object,
      conditionContext: this.questConditionContext?.({ source: "object", object }) ?? {},
    });
    this.tryDropQuestTargetLoot?.({
      source: "object",
      sourceId: object.objectDefId ?? object.type,
      sourceTags: objectMetadataConfig(object).tags,
      x: object.x,
      y: object.y,
      sourceObject: object,
    });
    this.applyDestroyRewards(object, def);
    this.applyDestroyedFactionRep(object, def);
    for (const tag of objectMetadataConfig(object).tags) {
      this.worldState = incrementWorldCounter(this.worldState, `destroyedObjectTag.${tag}`, 1);
    }
    const popularityDelta = Number(object.popularityDelta ?? def?.popularityDelta);
    if (Number.isFinite(popularityDelta) && popularityDelta !== 0) {
      // If object was destroyed by any non-standard path, apply any remaining delta not already applied during damage ticks.
      const applied = Number.isFinite(Number(object.popularityDeltaApplied)) ? Number(object.popularityDeltaApplied) : 0;
      const remainingDelta = popularityDelta - applied;
      if (Math.abs(remainingDelta) > 0.0001) this.changePopularity(remainingDelta, object.x, object.y);
    }
  },

  applyDestroyRewards(object, def) {
    const rewards = object.destroyRewards ?? def?.destroyRewards;
    if (!rewards || typeof rewards !== "object") return;
    const lydra = Number(rewards.lydra) || 0;
    const netdra = Number(rewards.netdra) || 0;
    if (!lydra && !netdra) return;
    applyWorldEnergy(this, { lydra, netdra });
    if (lydra) this.addFloater(object.x, object.y, `+${lydra} Ly'dra'thot`, "#eaf4ff", 0.95);
    if (netdra) this.addFloater(object.x, object.y, `+${netdra} Net'dra'thot`, "#b8a4ff", 0.95);
  },

  applyDestroyedFactionRep(object, def) {
    const metaConfig = objectMetadataConfig(object);
    const factionRep = object?.onDestroyed?.factionRep
      ?? metaConfig.onDestroyed?.factionRep
      ?? def?.onDestroyed?.factionRep;
    if (!factionRep || typeof factionRep !== "object") return;
    const objectKey = String(object?.runtimeId ?? object?.id ?? "").trim();
    const appliedKey = objectKey ? `object.${objectKey}.factionRepApplied` : "";
    if (appliedKey && getWorldFlag(this.worldState, appliedKey)) return;
    applyFactionRepEffects(this.player, factionRep);
    if (appliedKey) this.worldState = setWorldFlag(this.worldState, appliedKey, true);
    for (const [factionId, amount] of Object.entries(factionRep)) {
      const delta = Number(amount) || 0;
      if (!delta) continue;
      this.addFloater(object.x, object.y, `${factionId} ${delta > 0 ? "+" : ""}${delta}`, delta > 0 ? "#9ee8a4" : "#ff7272", 0.95);
    }
  },

  killMonster(monster) {
    if (monster.dead) return;
    this.clearStatusEffectParticles(monster);
    monster.dead = true;
    this.markRenderDirty?.("monster-death");
    this.recordBestiaryKilled?.(monster);
    this.recordMonsterKill(monster);
    if (monster.elite) {
      // Elite killed — game UI already shows effects, no debug toast needed
    }
    const xp = this.modifiedXp?.(monster.xp) ?? monster.xp;
    this.player.xp += xp;
    if (!monster.isMinion) this.applyQuestKill(monster);
    if (!monster.isMinion) this.applyCurrentSubregionClear?.();
    this.addFloater(monster.x, monster.y, `+${xp} xp`, "#e0aa3f", 0.95);
    if (!monster.isMinion) this.changePopularity(monsterPopularityDelta(monster, this.player.level), monster.x, monster.y);
    if (!monster.isMinion) this.applyMonsterKillWorldEnergy(monster);
    this.addParticles(monster.x, monster.y, monster.color, 24, 0.16);
    if (!monster.isMinion && !monster.noLoot && !monster.despawnOnDeath) this.dropLoot(monster);
    if (!monster.isMinion) this.despawnMonsterMinions(monster.id);
    if (monster.despawnOnDeath) {
      this.addFloater(monster.x, monster.y, "Forsvinder", monster.color, 0.95);
      this.addParticles(monster.x, monster.y, monster.color, 36, 0.18);
    }
    this.levelUpIfNeeded();
  },

  applyMonsterKillWorldEnergy(monster) {
    const lydra = Number(monster?.killLydra) || 0;
    const netdra = Number(monster?.killNetdra) || 0;
    const eliteLydra = monster?.elite ? Number(monster?.eliteKillLydra) || 0 : 0;
    const eliteNetdra = monster?.elite ? Number(monster?.eliteKillNetdra) || 0 : 0;
    const totalLydra = lydra + eliteLydra;
    const totalNetdra = netdra + eliteNetdra;
    if (!totalLydra && !totalNetdra) return;
    applyWorldEnergy(this, { lydra: totalLydra, netdra: totalNetdra });
    if (totalLydra) this.addFloater(monster.x, monster.y, `+${totalLydra} Ly'dra'thot`, "#eaf4ff", 0.95);
    if (totalNetdra) this.addFloater(monster.x, monster.y, `+${totalNetdra} Net'dra'thot`, "#b8a4ff", 0.95);
  },

  despawnMonsterMinions(ownerId) {
    for (const minion of this.monsters.values()) {
      if (minion.minionOwnerId !== ownerId || minion.dead) continue;
      this.clearStatusEffectParticles(minion);
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
    if (monster?.speciesId) this.worldState = incrementWorldCounter(this.worldState, `speciesKill.${monster.speciesId}`, 1);
    for (const tag of Array.isArray(monster?.tags) ? monster.tags : []) {
      this.worldState = incrementWorldCounter(this.worldState, `tagKill.${tag}`, 1);
    }
  },

  bestiaryContext() {
    return {
      regionId: this.region?.mapRegion?.id ?? this.activeMapRegion?.regionId,
      activeMapRegion: this.activeMapRegion,
    };
  },

  recordBestiaryFought(monster) {
    if (!monster?.typeName || monster.isMinion) return false;
    const result = recordMonsterFought(this.worldState, monster, this.bestiaryContext());
    this.worldState = result.worldState;
    return result.changed;
  },

  recordBestiaryKilled(monster) {
    if (!monster?.typeName || monster.isMinion) return false;
    const result = recordMonsterKilled(this.worldState, monster, this.bestiaryContext());
    this.worldState = result.worldState;
    return result.changed;
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

  getFactionRep(factionId) {
    return getFactionRepFrom(this.player, factionId);
  },

  addFactionRep(factionId, amount) {
    const value = addFactionRepOnPlayer(this.player, factionId, amount);
    this.publishSnapshot?.();
    return value;
  },

  setFactionRep(factionId, value) {
    const next = setFactionRepOnPlayer(this.player, factionId, value);
    this.publishSnapshot?.();
    return next;
  },

  getKnownFactions(options = {}) {
    return getKnownFactions(options);
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
    if (!bonuses || typeof bonuses !== "object") return;
    const n = (key) => Number(bonuses[key]) || 0;
    stats.maxHp += n("maxHp");
    stats.maxMana += n("maxMana");
    stats.armor += n("armor");
    stats.damageMin += n("damageMin");
    stats.damageMax += n("damageMax");
    stats.range += n("range");
    stats.speed += n("speed");
    stats.maxHp *= 1 + n("maxHpPct");
    stats.maxMana *= 1 + n("maxManaPct");
    stats.armor += n("armorFlat");
    stats.armorPct += n("armorPct");
    stats.damageMin *= 1 + n("damagePct");
    stats.damageMax *= 1 + n("damagePct");
    stats.speed *= 1 + n("speedPct");
    stats.cooldown *= Math.max(0.55, 1 - n("attackSpeed"));
    stats.magic += n("magic");
    stats.critChance += n("critChance");
    stats.critDamage += n("critDamage");
    stats.blockChance += n("blockChance");
    stats.dodgeChance += n("dodgeChance");
    stats.lifeSteal += n("lifeSteal");
    stats.magicFind += n("magicFind");
    stats.goldFind += n("goldFind");
    stats.resourceFind += n("resourceFind");
    stats.xpGain += n("xpGain");
    for (const key of BONUS_STAT_KEYS) {
      if (Object.prototype.hasOwnProperty.call(stats, key) || key.endsWith("Resist") || key.endsWith("DamageBonus") || key.endsWith("DurationBonus")) {
        if (!EXPLICIT_STAT_BONUS_KEYS.includes(key)) {
          stats[key] = (stats[key] ?? 0) + (Number(bonuses[key]) || 0);
        }
      }
    }
  },

  calcStats() {
    const readableBonus = normalizeReadableBonuses(this.player.readableBonuses);
    const stats = {
      maxHp: 112 + this.player.level * 8,
      maxMana: 60 + this.player.level * 5,
      armor: 0,
      armorPct: 0,
      damageMin: 5 + this.player.level,
      damageMax: 9 + this.player.level * 2,
      range: 1.15,
      cooldown: 0.58,
      speed: 3.45,
      magic: 5 + this.player.level * 2,
      critChance: 0,
      critDamage: 1.5,
      blockChance: 0,
      blockAmount: 0,
      dodgeChance: 0,
      lifeSteal: 0,
      magicFind: 0,
      goldFind: 0,
      resourceFind: 0,
      xpGain: 0,
      physicalResist: 0,
      fireResist: 0,
      iceResist: 0,
      lightningResist: 0,
      poisonResist: 0,
      arcaneResist: 0,
      holyResist: 0,
      shadowResist: 0,
      natureResist: 0,
      allResist: 0,
      magicResist: 0,
      physicalDamageBonus: 0,
      fireDamageBonus: 0,
      iceDamageBonus: 0,
      lightningDamageBonus: 0,
      poisonDamageBonus: 0,
      arcaneDamageBonus: 0,
      holyDamageBonus: 0,
      shadowDamageBonus: 0,
      natureDamageBonus: 0,
      spellDamageBonus: 0,
      directDamageBonus: 0,
      areaDamageBonus: 0,
      dotDamageBonus: 0,
      hazardDamageBonus: 0,
      dotDurationBonus: 0,
      statusDurationBonus: 0,
      slowImmune: false,
      mode: "melee",
    };
    const skillBonus = skillTreeBonuses(this.player.skillTree);
    const classBonus = getClassNodeBonuses(this.player);

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
      if (item.slowImmune) stats.slowImmune = true;
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
      const genericItemBonuses = {};
      for (const key of BONUS_STAT_KEYS) {
        if (EXPLICIT_STAT_BONUS_KEYS.includes(key)) continue;
        genericItemBonuses[key] = s(item[key]);
      }
      this.applyStatBonuses(stats, genericItemBonuses);
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
    this.applyStatBonuses(stats, classBonus);
    for (const effect of this.player.statusEffects ?? []) {
      if (effect?.type === "statBuff" && effect.duration > 0) {
        this.applyStatBonuses(stats, effect.bonuses);
      }
    }
    stats.maxHp = Math.floor(stats.maxHp * (cityRuntimeModifiers(this.cityStats).heroMaxHpMultiplier ?? 1));
    stats.maxMana = Math.floor(stats.maxMana);
    stats.damageMin = Math.max(1, Math.floor(stats.damageMin));
    stats.damageMax = Math.max(stats.damageMin + 1, Math.floor(stats.damageMax));
    stats.armor *= 1 + stats.armorPct;
    stats.armor = Math.max(0, Math.floor(stats.armor));
    stats.critChance = clamp(stats.critChance, 0, 0.75);
    stats.critDamage = Math.max(1, stats.critDamage);
    stats.blockChance = clamp(stats.blockChance, 0, 0.55);
    stats.blockAmount = Math.max(0, Math.floor(stats.blockAmount));
    stats.dodgeChance = clamp(stats.dodgeChance, 0, 0.55);
    stats.lifeSteal = clamp(stats.lifeSteal, 0, 0.25);
    return stats;
  },

  // ─── Item durability helpers ─────────────────────────────────────────────────

  destroyEquipmentAtZeroDurability(slotId, item) {
    if (!slotId || !item?.destroyWhenDurabilityDepleted || Number(item.durability) > 0) return false;
    if (this.player.equipment?.[slotId] !== item) return false;
    this.player.equipment[slotId] = null;
    this.addToast(`${item.name} forsvandt.`);
    return true;
  },

  drainWeaponDurability() {
    const weapon = this.player.equipment?.weapon;
    if (!weapon) return;
    const before = Number(weapon.durability ?? 100);
    weapon.durability = Math.max(0, parseFloat((before - ITEM_DURABILITY_WEAPON_PER_ATTACK).toFixed(2)));
    if (before > 0 && weapon.durability === 0) {
      if (!this.destroyEquipmentAtZeroDurability("weapon", weapon)) {
        this.addToast(`${weapon.name} er brudt! Reparer det hos smeden.`);
      }
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
        if (!this.destroyEquipmentAtZeroDurability(slotId, item)) {
          this.addToast(`${item.name} er brudt! Reparer det hos smeden.`);
        }
        changed = true;
      }
    }
    if (changed) this.publishSnapshot();
  },

  durabilityEventLoss(item, eventName) {
    const events = item?.durabilityLossOnEvents;
    if (!events || typeof events !== "object") return 0;
    return Math.max(0, Number(events[eventName]) || 0);
  },

  triggerEquipmentDurabilityEvent(eventName) {
    const key = String(eventName ?? "").trim();
    if (!key || !this.player?.equipment) return;
    let changed = false;
    for (const [slotId, item] of Object.entries(this.player.equipment)) {
      if (!item) continue;
      const loss = this.durabilityEventLoss(item, key);
      if (loss <= 0) continue;
      const before = Number(item.durability ?? 100);
      item.durability = Math.max(0, parseFloat((before - loss).toFixed(2)));
      changed = true;
      if (!this.destroyEquipmentAtZeroDurability(slotId, item) && before > 0 && item.durability === 0) {
        this.addToast(`${item.name} er brudt!`);
      }
    }
    if (!changed) return;
    const stats = this.calcStats();
    this.player.hp = clamp(this.player.hp, 1, stats.maxHp);
    this.player.mana = clamp(this.player.mana, 0, stats.maxMana);
    this.publishSnapshot();
  },

  applyDeathDurabilityLoss() {
    const lossMin = ITEM_DURABILITY_DEATH_MIN_PCT;
    const lossMax = ITEM_DURABILITY_DEATH_MAX_PCT;
    for (const [slotId, item] of Object.entries(this.player.equipment ?? {})) {
      if (!item) continue;
      const dur = Number(item.durability ?? 100);
      if (dur <= ITEM_DURABILITY_DEATH_THRESHOLD) continue; // already low
      const loss = lossMin + Math.random() * (lossMax - lossMin);
      item.durability = Math.max(0, parseFloat((dur - loss).toFixed(2)));
      this.destroyEquipmentAtZeroDurability(slotId, item);
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

  nearestMonster(maxRange, sourceConfig = null) {
    let best = null;
    let bestD = maxRange;
    for (const monster of this.nearbyMonsters(2)) {
      if (monster.dead) continue;
      if (sourceConfig && !canDamageTargetWithSource(sourceConfig, "weapon", this.targetMetadataFor(monster))) continue;
      if (!this.isPointVisible(monster)) continue;
      const d = distance(this.player, monster);
      if (d < bestD) {
        best = monster;
        bestD = d;
      }
    }
    return best;
  },

  targetMetadataFor(target) {
    if (target === this.player) return { targetType: "player", id: "player", tags: [] };
    if (isDestructibleObject(target)) {
      const config = objectMetadataConfig(target);
      return targetMetadata({ ...target, ...config }, "object");
    }
    return targetMetadata(target);
  },

  nearbyDestructibleObjects(range = 1) {
    const objects = [];
    for (const chunk of this.nearbyChunks(range)) {
      for (const object of chunk.objects) {
        if (!isDestructibleObject(object)) continue;
        if (!this.isPointVisible(object)) continue;
        objects.push(object);
      }
    }
    return objects;
  },

  nearestDestructibleObject(maxRange, sourceConfig = null) {
    let best = null;
    let bestD = maxRange;
    for (const chunk of this.nearbyChunks(1)) {
      for (const object of chunk.objects) {
        if (!isDestructibleObject(object)) continue;
        if (!canDamageTargetWithSource(sourceConfig, "weapon", this.targetMetadataFor(object))) continue;
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
