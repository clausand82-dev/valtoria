import {
  MONSTER_STATS,
  MONSTER_SHEETS,
  chunkCoords,
  createId,
  clamp,
  lerp,
  normalize,
  visibleScreenPoint,
  worldToScreen,
  monsterSpriteId,
  isRegionPointPlayable
} from "../dependencies.js";
import { AMBIENT_CRITTER_DEFAULTS } from "../../config/performance-config.js";

const CRITTER_WARNED_MOB_IDS = new Set();

function hashText(text, salt = 0) {
  let hash = 2166136261 ^ salt;
  const input = String(text ?? "");
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRand(seed, salt = 0) {
  let n = Math.imul((Number(seed) || 0) ^ salt, 374761393);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function randomIntFromRange(value, seed, salt, fallbackMin = 0, fallbackMax = fallbackMin) {
  const min = Math.max(0, Math.floor(Number(value?.min) || fallbackMin));
  const max = Math.max(min, Math.floor(Number(value?.max) || fallbackMax));
  return min + Math.floor(seededRand(seed, salt) * (max - min + 1));
}

function resolveCritterMobType(mobId) {
  const requested = String(mobId ?? "").trim();
  if (!requested) return null;
  if (MONSTER_STATS[requested]) return requested;

  const requestedKey = requested.toLowerCase().replace(/[\s_-]+/g, "");
  for (const typeName of Object.keys(MONSTER_STATS)) {
    const typeKey = typeName.toLowerCase().replace(/[\s_-]+/g, "");
    const spriteKey = monsterSpriteId(typeName).toLowerCase().replace(/[\s_-]+/g, "");
    if (typeKey === requestedKey || spriteKey === requestedKey) return typeName;
  }
  return null;
}

function hasMonsterSheet(typeName) {
  const spriteId = monsterSpriteId(typeName);
  return MONSTER_SHEETS.some((entry) => entry.id === spriteId);
}

function clampScale(value) {
  const scale = Number(value);
  if (!Number.isFinite(scale) || scale <= 0) return 0.35;
  return clamp(scale, 0.08, 0.8);
}

function mergeCritterDefaults(regionDefaults = {}, engine = null) {
  const defaults = {
    ...AMBIENT_CRITTER_DEFAULTS,
    ...(regionDefaults && typeof regionDefaults === "object" ? regionDefaults : {}),
  };
  if (engine?.lowPowerMode || engine?.performanceMode === "cool") {
    defaults.maxAlivePerRegion = Math.max(0, Math.floor((Number(defaults.maxAlivePerRegion) || 0) * 0.45));
    defaults.maxPerType = Math.max(0, Math.floor((Number(defaults.maxPerType) || 0) * 0.55));
  }
  return defaults;
}

function pointInsideRegion(region, x, y, radius) {
  return isRegionPointPlayable(region, x, y, radius);
}

export const critterMethods = {
  resetCritterRuntime() {
    this.critters = new Map();
    this.critterStats = {
      alive: 0,
      rendered: 0,
      updated: 0,
      killed: 0,
      drawCalls: 0,
    };
  },

  ambientCrittersDisabled() {
    if (this.disableAmbientCritters) return true;
    const defaults = mergeCritterDefaults(this.region?.mapRegion?.ambientCritterDefaults, this);
    return defaults.enabled === false || defaults.maxAlivePerRegion <= 0;
  },

  spawnAmbientCritters() {
    this.resetCritterRuntime();
    if (!this.region?.mapRegion || this.ambientCrittersDisabled()) return;

    const entries = Array.isArray(this.region.mapRegion.ambientCritters)
      ? this.region.mapRegion.ambientCritters
      : [];
    if (!entries.length) return;

    const defaults = mergeCritterDefaults(this.region.mapRegion.ambientCritterDefaults, this);
    const maxAlive = Math.max(0, Math.floor(Number(defaults.maxAlivePerRegion) || 0));
    const maxPerType = Math.max(0, Math.floor(Number(defaults.maxPerType) || 0));
    if (maxAlive <= 0 || maxPerType <= 0) return;

    const seedBase = hashText(`${this.region.seed}:${this.region.mapRegion.id}:critters`, 41017);
    let alive = 0;
    const perType = new Map();

    for (let entryIndex = 0; entryIndex < entries.length && alive < maxAlive; entryIndex += 1) {
      const entry = entries[entryIndex];
      if (!entry || typeof entry !== "object" || entry.enabled === false) continue;
      const mobId = entry.mobId ?? entry.sourceMobId;
      const typeName = resolveCritterMobType(mobId);
      if (!typeName || !hasMonsterSheet(typeName)) {
        const warnKey = String(mobId ?? entry.id ?? entryIndex);
        if (!CRITTER_WARNED_MOB_IDS.has(warnKey)) {
          CRITTER_WARNED_MOB_IDS.add(warnKey);
          console.warn(`[ambientCritters] Missing mob asset for '${warnKey}', skipping critter entry.`);
        }
        continue;
      }

      const id = String(entry.id ?? `ambient_${typeName}`).trim() || `ambient_${typeName}`;
      const wanted = randomIntFromRange(entry.count, seedBase, 1000 + entryIndex * 97, 0, 0);
      const typeAlive = perType.get(id) ?? 0;
      const allowed = Math.min(wanted, maxAlive - alive, maxPerType - typeAlive);
      if (allowed <= 0) continue;

      for (let i = 0; i < allowed; i += 1) {
        const critter = this.createAmbientCritter(entry, typeName, entryIndex, i, seedBase);
        if (!critter) continue;
        this.critters.set(critter.id, critter);
        alive += 1;
        perType.set(id, (perType.get(id) ?? 0) + 1);
        if (alive >= maxAlive) break;
      }
    }

    if (this.critterStats) this.critterStats.alive = this.critters.size;
  },

  createAmbientCritter(entry, typeName, entryIndex, localIndex, seedBase) {
    const base = MONSTER_STATS[typeName];
    if (!base) return null;
    const scale = clampScale(entry.scale);
    const radius = Math.max(0.035, (Number(base.radius) || 0.18) * Math.max(0.25, scale));
    const salt = 2000 + entryIndex * 331 + localIndex * 37;
    let x = 0;
    let y = 0;

    for (let tries = 0; tries < 48; tries += 1) {
      x = 1 + seededRand(seedBase, salt + tries * 11) * Math.max(1, this.region.width - 2);
      y = 1 + seededRand(seedBase, salt + tries * 13) * Math.max(1, this.region.height - 2);
      if (Math.hypot(x - this.region.start.x, y - this.region.start.y) < 5) continue;
      if (Math.hypot(x - this.region.end.x, y - this.region.end.y) < 3) continue;
      if (this.isBlocked(x, y, radius)) continue;
      if (!pointInsideRegion(this.region, x, y, radius)) continue;
      break;
    }
    if (this.isBlocked(x, y, radius) || !pointInsideRegion(this.region, x, y, radius)) return null;

    const hp = Math.max(1, Math.floor(Number(entry.hp) || 1));
    const behavior = entry.behavior === "flee" ? "flee" : "wander";
    const speed = Math.max(0.25, Number(entry.speed) || (behavior === "flee" ? 2.7 : 1.25));
    const animSeed = seededRand(seedBase, salt + 71) * Math.PI * 2;
    return {
      id: createId(),
      type: "critter",
      runtimeType: "critter",
      typeName,
      sourceMobId: entry.sourceMobId ?? entry.mobId ?? typeName,
      critterId: entry.id ?? `ambient_${typeName}`,
      x,
      y,
      vx: 0,
      vy: 0,
      radius,
      maxHp: hp,
      hp,
      speed,
      baseSpeed: speed,
      behavior,
      fleeDistance: Math.max(0, Number(entry.fleeDistance) || 120) / 32,
      canTakeAreaDamage: entry.canTakeAreaDamage !== false,
      collision: false,
      hostile: false,
      canBeTargeted: false,
      givesXp: false,
      dropsLoot: false,
      persist: false,
      noHealthBar: true,
      dead: false,
      deathTimer: 0,
      hurt: 0,
      moving: false,
      facingX: seededRand(seedBase, salt + 83) > 0.5 ? 1 : -1,
      facingY: 0,
      gait: animSeed,
      moveSpeed: 0,
      attackAnim: 0,
      animSeed,
      breathSpeed: 1.5 + seededRand(seedBase, salt + 91) * 1.1,
      visualScale: scale,
      wanderTimer: seededRand(seedBase, salt + 101) * 1.8,
      pauseTimer: seededRand(seedBase, salt + 107) * 1.2,
      chunkKey: `${chunkCoords(x, y).cx},${chunkCoords(x, y).cy}`,
    };
  },

  nearbyCritters() {
    return [...(this.critters?.values?.() ?? [])];
  },

  isCritterOnScreen(critter, margin = 170) {
    const screen = worldToScreen(critter.x, critter.y, 0, this.camera);
    return visibleScreenPoint(screen, this.width, this.height, margin);
  },

  updateCritters(dt) {
    const critters = this.critters;
    if (!critters || critters.size === 0) return;
    const defaults = mergeCritterDefaults(this.region?.mapRegion?.ambientCritterDefaults, this);
    let alive = 0;
    let updated = 0;

    for (const critter of critters.values()) {
      if (critter.dead) {
        critter.deathTimer = (Number(critter.deathTimer) || 0) + dt;
        if (critter.deathTimer > 0.18) critters.delete(critter.id);
        continue;
      }
      alive += 1;
      critter.hurt = Math.max(0, critter.hurt - dt);

      if (defaults.offscreenUpdate === false && !this.isCritterOnScreen(critter, 240)) {
        continue;
      }

      updated += 1;
      const beforeX = critter.x;
      const beforeY = critter.y;
      let moveX = 0;
      let moveY = 0;

      const dx = critter.x - this.player.x;
      const dy = critter.y - this.player.y;
      const fleeDistance = Math.max(0.1, Number(critter.fleeDistance) || 3.75);
      const distSq = dx * dx + dy * dy;
      if (critter.behavior === "flee" && distSq < fleeDistance * fleeDistance) {
        const n = normalize(dx, dy);
        moveX = n.x * critter.speed * dt;
        moveY = n.y * critter.speed * dt;
      } else {
        critter.pauseTimer = Math.max(0, (Number(critter.pauseTimer) || 0) - dt);
        critter.wanderTimer = Math.max(0, (Number(critter.wanderTimer) || 0) - dt);
        if (critter.pauseTimer <= 0 && critter.wanderTimer <= 0) {
          const a = Math.random() * Math.PI * 2;
          critter.vx = Math.cos(a) * critter.speed * 0.42;
          critter.vy = Math.sin(a) * critter.speed * 0.42;
          critter.wanderTimer = 0.45 + Math.random() * 0.85;
          critter.pauseTimer = critter.wanderTimer + 0.5 + Math.random() * 1.4;
        }
        if (critter.wanderTimer > 0) {
          moveX = critter.vx * dt;
          moveY = critter.vy * dt;
        }
      }

      this.moveEntity(critter, moveX, moveY);
      const movedX = critter.x - beforeX;
      const movedY = critter.y - beforeY;
      if (Math.abs(movedX) < Math.abs(moveX) * 0.35) critter.vx = 0;
      if (Math.abs(movedY) < Math.abs(moveY) * 0.35) critter.vy = 0;
      const n = normalize(movedX, movedY);
      critter.facingX = n.x || critter.facingX;
      critter.facingY = n.y || critter.facingY;
      critter.moving = Math.hypot(movedX, movedY) > 0.001;
      const rawSpeed = dt > 0 ? Math.hypot(movedX, movedY) / dt : 0;
      critter.moveSpeed = lerp(critter.moveSpeed || 0, rawSpeed, critter.moving ? 0.45 : 0.16);
      if (critter.moveSpeed > 0.01) critter.gait += dt * (6.4 + critter.moveSpeed * 2);
    }

    if (this.critterStats) {
      this.critterStats.alive = alive;
      this.critterStats.updated = updated;
    }
  },

  damageCritter(critter, amount, sourceType = "magic", critical = false) {
    if (!critter || critter.dead) return;
    const damage = Math.max(1, Math.floor(Number(amount) || 0));
    critter.hp = Math.max(0, (Number(critter.hp) || 0) - damage);
    critter.hurt = 0.18;
    this.addFloater(critter.x, critter.y, critical ? `CRIT -${damage}` : `-${damage}`, sourceType === "magic" ? "#9de9ff" : "#f1d08d", 0.55);
    if (critter.hp > 0) return;
    critter.dead = true;
    critter.deathTimer = 0;
    this.critterStats ??= {};
    this.critterStats.killed = Math.max(0, Math.floor(Number(this.critterStats.killed) || 0)) + 1;
    this.addParticles(critter.x, critter.y, "#b8a58f", 5, 0.04);
  },

  critterCounterSnapshot() {
    const critters = [...(this.critters?.values?.() ?? [])];
    const alive = critters.filter((critter) => !critter.dead).length;
    return {
      total: critters.length,
      alive,
      rendered: Math.max(0, Math.floor(Number(this.critterStats?.rendered) || 0)),
      updated: Math.max(0, Math.floor(Number(this.critterStats?.updated) || 0)),
      killed: Math.max(0, Math.floor(Number(this.critterStats?.killed) || 0)),
      drawCalls: Math.max(0, Math.floor(Number(this.critterStats?.drawCalls) || 0)),
    };
  },
};
