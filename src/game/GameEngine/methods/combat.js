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
        } else if (d > monster.range + this.player.radius) {
          this.moveEntity(monster, n.x * monster.speed * this.statusSpeedMultiplier(monster) * dt, n.y * monster.speed * this.statusSpeedMultiplier(monster) * dt);
        } else if (monster.attackCooldown <= 0) {
          monster.attackCooldown = 0.85 + Math.random() * 0.6;
          monster.attackAnim = 0.24;
          const critical = Math.random() < (Number(monster.critChance) || 0);
          this.damagePlayer(critical ? monster.damage * (Number(monster.critDamage) || 1.5) : monster.damage, monster, critical);
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
      if (monster.moving && Math.random() < 0.035) this.addDust(monster.x, monster.y, 1);
    }
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

    const spawnCount = Math.min(maxActive - active, Math.max(1, Math.floor(Number(config.spawnCount) || 1)));
    let spawned = 0;
    for (let i = 0; i < spawnCount; i += 1) {
      if (this.spawnMonsterMinion(monster, config, i)) spawned += 1;
    }
    monster.minionCooldown = Math.max(1, Number(config.cooldown) || 8) + Math.random() * 0.8;
    if (spawned > 0) this.addParticles(monster.x, monster.y, monster.color, 14, 0.1);
  },

  spawnMonsterMinion(owner, config, index = 0) {
    const base = MONSTER_STATS[owner.typeName];
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
    const speed = Math.max(0.2, owner.speed * (Number(statsMult.speed) || 1));
    const minion = {
      id: createId(),
      typeName: owner.typeName,
      x,
      y,
      vx: 0,
      vy: 0,
      radius,
      baseLevel: owner.baseLevel,
      level: owner.level,
      lootLevel: owner.lootLevel,
      maxHp: hp,
      hp,
      damage: Math.max(1, Math.floor(owner.damage * (Number(statsMult.damage) || 0.3))),
      speed,
      baseSpeed: speed,
      range: Math.max(0.18, owner.range * 0.8),
      magic: Math.max(0, Math.floor((Number(owner.magic) || 0) * (Number(statsMult.magic) || 0.25))),
      critChance: Math.max(0, (Number(owner.critChance) || 0) * 0.5),
      critDamage: Number(owner.critDamage) || 1.5,
      blockChance: 0,
      dodgeChance: Math.max(0, (Number(owner.dodgeChance) || 0) * 0.5),
      spells: [],
      spellCooldown: 999,
      statusEffects: [],
      allowElite: false,
      isBoss: false,
      boss: null,
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
      let remove = expired || this.isBlocked(projectile.x, projectile.y, 0.12);
      if (!remove) {
        for (const monster of this.nearbyMonsters(2)) {
          if (monster.dead || projectile.owner === "monster") continue;
          if (Math.hypot(monster.x - projectile.x, monster.y - projectile.y) <= monster.radius + projectile.radius) {
            this.applySpellImpact(projectile, projectile.x, projectile.y, monster);
            remove = true;
            break;
          }
        }
        if (!remove && projectile.owner === "monster" && Math.hypot(this.player.x - projectile.x, this.player.y - projectile.y) <= this.player.radius + projectile.radius) {
          this.applySpellImpact(projectile, projectile.x, projectile.y, this.player);
          remove = true;
        }
      }
      if (expired && projectile.explodeOnEnd) {
        this.applySpellImpact(projectile, projectile.x, projectile.y, null);
      }
      if (remove) this.projectiles.splice(i, 1);
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
      this.camera.shake = Math.max(this.camera.shake, 3);
      this.player.attackTargetId = null;
      this.player.attackObjectId = null;
      return;
    }

    if (stats.mode === "melee") {
      this.player.stats.meleeAttacks += 1;
      const { damage, critical } = this.rollPlayerDamage(stats);
      this.damageMonster(target, damage, "melee", critical);
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
    this.launchSpellProjectile({ spell, caster: this.player, owner: "player", x, y, stats });
    this.addParticles(this.player.x, this.player.y, spell.color, 16, 0.08);
  },

  castMonsterSpell(monster, spellId) {
    const spell = SPELL_DEFS[spellId];
    if (!spell || monster.dead) return;
    const n = normalize(this.player.x - monster.x, this.player.y - monster.y);
    if (!n.x && !n.y) return;
    monster.spellCooldown = spell.cooldown + Math.random() * 0.8;
    monster.attackAnim = 0.24;
    this.launchSpellProjectile({
      spell,
      caster: monster,
      owner: "monster",
      x: this.player.x,
      y: this.player.y,
      stats: { damageMin: monster.damage, damageMax: monster.damage, magic: monster.magic ?? 0, critChance: monster.critChance ?? 0, critDamage: monster.critDamage ?? 1.5 },
    });
  },

  launchSpellProjectile({ spell, caster, owner, x, y, stats }) {
    const n = normalize(x - caster.x, y - caster.y);
    const rolled = this.rollPlayerDamage(stats, (spell.hitDamage ?? 0) + (Number(stats.magic) || 0) * (spell.magicScale ?? 0));
    this.projectiles.push({
      id: createId(),
      type: spell.id,
      spellId: spell.id,
      owner,
      x: caster.x + n.x * 0.5,
      y: caster.y + n.y * 0.5,
      vx: n.x * spell.speed,
      vy: n.y * spell.speed,
      radius: spell.radius ?? 0.22,
      damage: rolled.damage,
      critical: rolled.critical,
      life: spell.range / spell.speed,
      color: spell.color,
      areaRadius: spell.areaRadius ?? 0,
      areaDamage: spell.areaDamage ?? 0,
      dotDamage: spell.dotDamage ?? 0,
      dotDuration: spell.dotDuration ?? 0,
      slowPct: spell.slowPct ?? 0,
      slowDuration: spell.slowDuration ?? 0,
      explodeOnEnd: Boolean(spell.explodeOnEnd),
    });
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
    this.addParticles(x, y, projectile.color, projectile.areaRadius > 0 ? 26 : 9, 0.08);
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
      });
    }
    if (projectile.slowPct > 0 && projectile.slowDuration > 0) {
      target.statusEffects.push({
        type: "slow",
        pct: projectile.slowPct,
        duration: projectile.slowDuration,
      });
    }
  },

  processStatusEffects(entity, dt, isPlayer = false) {
    if (!Array.isArray(entity.statusEffects) || entity.statusEffects.length === 0) return;
    for (const effect of entity.statusEffects) {
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
    entity.statusEffects = entity.statusEffects.filter((effect) => effect.duration > 0);
  },

  statusSpeedMultiplier(entity) {
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
    if (this.player.hp <= 0) {
      this.player.stats.deaths += 1;
      this.addToast(`Faldt mod ${source.typeName}`);
    }
  },

  damageMonster(monster, amount, sourceType, critical = false) {
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
    if (!monster.isMinion) this.dropLoot(monster);
    if (!monster.isMinion) this.despawnMonsterMinions(monster.id);
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
      stats.armor += item.armor || 0;
      stats.maxHp += item.maxHp || 0;
      stats.maxMana += item.maxMana || 0;
      stats.speed += item.speed || 0;
      stats.magic += item.magic || 0;
      stats.maxHp *= 1 + (item.maxHpPct || 0);
      stats.maxMana *= 1 + (item.maxManaPct || 0);
      stats.armor += item.armorFlat || 0;
      stats.damageMin *= 1 + (item.damagePct || 0);
      stats.damageMax *= 1 + (item.damagePct || 0);
      stats.speed *= 1 + (item.speedPct || 0);
      stats.cooldown *= Math.max(0.55, 1 - (item.attackSpeed || 0));
      stats.critChance += item.critChance || 0;
      stats.critDamage += item.critDamage || 0;
      stats.blockChance += item.blockChance || 0;
      stats.dodgeChance += item.dodgeChance || 0;
      stats.lifeSteal += item.lifeSteal || 0;
      stats.magicFind += item.magicFind || 0;
      stats.goldFind += item.goldFind || 0;
      stats.resourceFind += item.resourceFind || 0;
      stats.xpGain += item.xpGain || 0;
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

  xpForNextLevel() {
    return Math.floor(80 + this.player.level * this.player.level * 42);
  },

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
  },

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
    const screen = worldToScreen(questgiver.x, questgiver.y, 0, this.camera);
    const d = Math.hypot(screen.x - x, screen.y - 34 - y);
    return d < 42 ? questgiver : null;
  }
};
