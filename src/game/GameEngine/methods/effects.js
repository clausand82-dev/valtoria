import {
  chunkCoords,
  createId,
  isRegionPointPlayable,
  randomInRange,
  randomIntInRange,
  screenToWorld,
  visibleScreenPoint,
  worldToScreen,
} from "../dependencies.js";

const CONFIG_PARTICLE_MAX = 420;
const WEATHER_PARTICLE_MAX = 320;
const ATTACHED_PARTICLE_SCAN_INTERVAL = 0.12;
const AMBIENT_PARTICLE_INTERVAL = 0.1;
const WEATHER_PARTICLE_INTERVAL = 0.05;

function countConfiguredParticles(particles) {
  return particles.reduce((sum, particle) => sum + (particle.configParticle ? 1 : 0), 0);
}

function particleKey(sourceId, index) {
  return `${sourceId}:${index}`;
}

function particlesForKey(particles, key) {
  let count = 0;
  for (const particle of particles) {
    if (particle.configParticle && particle.sourceKey === key) count += 1;
  }
  return count;
}

function countWeatherParticles(particles) {
  return particles.reduce((sum, particle) => sum + (particle.configParticle && particle.weatherParticle ? 1 : 0), 0);
}

function rollRange(range) {
  return randomInRange(Array.isArray(range) ? range : [range, range]);
}

function resolveAnchorScreen(anchor, heightOffset, camera) {
  return worldToScreen(anchor.x, anchor.y, 0, camera);
}

function isAnchorVisible(engine, anchor, config, pad = 180) {
  if (!config.onlyWhenOnScreen) return true;
  const screen = resolveAnchorScreen(anchor, config.heightOffset, engine.camera);
  return visibleScreenPoint(screen, engine.width, engine.height, pad + config.radius);
}

function getParticleTarget(source, config, key) {
  source.__particleTargets ??= {};
  if (source.__particleTargets[key] !== undefined) return source.__particleTargets[key];
  const count = randomIntInRange(config.count);
  source.__particleTargets[key] = count;
  return count;
}

function spawnConfiguredParticle(engine, anchor, config, sourceKey, options = {}) {
  if (countConfiguredParticles(engine.particles) >= CONFIG_PARTICLE_MAX) return;
  const angle = Math.random() * Math.PI * 2;
  const distance = Math.random() * config.radius;
  const speed = randomInRange(config.speed);
  const ambientScale = options.ambient && config.visual === "softCircle"
    ? Math.max(1, Number(config.ambientScale) || 1.65)
    : 1;
  const size = randomInRange(config.size) * ambientScale;
  const lifetime = randomInRange(config.lifetime);
  const alpha = randomInRange(config.alpha) * (options.ambient ? Math.max(1, Number(config.ambientAlphaScale) || 1.25) : 1);
  const x = anchor.x + Math.cos(angle) * distance / 48;
  const y = anchor.y + Math.sin(angle) * distance / 48;
  const particle = {
    configParticle: true,
    sourceKey,
    renderLayer: options.renderLayer ?? config.renderLayer ?? (options.ambient ? "belowEntities" : "aboveEntities"),
    avoidPlayerRadius: config.avoidPlayerRadius,
    avoidPlayerMinAlpha: config.avoidPlayerMinAlpha,
    movement: config.movement,
    visual: config.visual,
    color: config.color,
    anchorX: anchor.x,
    anchorY: anchor.y,
    x,
    y,
    z: -(config.heightOffset || 0) + Math.random() * 8,
    baseZ: -(config.heightOffset || 0),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    vz: speed,
    wobble: Math.random() * Math.PI * 2,
    r: size,
    alpha,
    life: lifetime,
    maxLife: lifetime,
  };

  if (config.movement === "rise" || config.movement === "riseFade" || config.movement === "floatUp") {
    particle.vz = 8 + speed * 34;
    particle.vx *= 0.35;
    particle.vy *= 0.35;
  } else if (config.movement === "swarm") {
    particle.vx *= 1.6;
    particle.vy *= 1.6;
    particle.z += Math.random() * 16;
  } else if (config.movement === "drift") {
    particle.vx *= 0.45;
    particle.vy *= 0.45;
    particle.z += Math.random() * 18;
  } else if (config.movement === "float") {
    particle.vx *= 0.55;
    particle.vy *= 0.55;
    particle.z += Math.random() * 24;
  }

  engine.particles.push(particle);
}

function spawnScreenParticle(engine, config, sourceKey) {
  if (countConfiguredParticles(engine.particles) >= CONFIG_PARTICLE_MAX) return;
  if (countWeatherParticles(engine.particles) >= WEATHER_PARTICLE_MAX) return;

  const speed = randomInRange(config.speed);
  const size = randomInRange(config.size);
  const lifetime = randomInRange(config.lifetime);
  const alpha = randomInRange(config.alpha);
  const fromTop = config.movement === "fall" || config.movement === "stormFall" || config.movement === "fallDrift";
  const screenX = -80 + Math.random() * (engine.width + 160);
  const screenY = fromTop
    ? -80 + Math.random() * (engine.height + 120)
    : Math.random() * engine.height;
  const diagonal = config.movement === "stormFall" ? -0.48 : config.movement === "fall" ? -0.24 : -0.12;
  const particle = {
    configParticle: true,
    weatherParticle: true,
    screenSpace: true,
    sourceKey,
    renderLayer: config.renderLayer ?? "aboveEntities",
    movement: config.movement,
    visual: config.visual,
    color: config.color,
    screenX,
    screenY,
    screenWidth: engine.width,
    screenHeight: engine.height,
    vx: speed * diagonal,
    vy: speed,
    wobble: Math.random() * Math.PI * 2,
    r: size,
    lineLength: size,
    alpha,
    life: lifetime,
    maxLife: lifetime,
  };
  engine.particles.push(particle);
}

function updateConfiguredParticle(particle, dt) {
  particle.wobble += dt * 2.4;
  if (particle.screenSpace) {
    if (particle.movement === "fallDrift") {
      particle.screenX += (particle.vx + Math.cos(particle.wobble) * 18) * dt;
      particle.screenY += particle.vy * dt;
    } else if (particle.movement === "stormFall") {
      particle.screenX += particle.vx * dt;
      particle.screenY += particle.vy * dt;
    } else if (particle.movement === "fall") {
      particle.screenX += particle.vx * dt;
      particle.screenY += particle.vy * dt;
    } else {
      particle.screenX += Math.cos(particle.wobble) * 10 * dt;
      particle.screenY += particle.vy * dt;
    }
    if (
      particle.screenY > (particle.screenHeight ?? 900) + 120
      || particle.screenX < -180
      || particle.screenX > (particle.screenWidth ?? 1600) + 180
    ) {
      particle.life = 0;
    }
    return;
  }
  if (particle.movement === "swarm") {
    particle.vx += Math.cos(particle.wobble * 2.1) * dt * 0.9;
    particle.vy += Math.sin(particle.wobble * 1.7) * dt * 0.9;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.z += Math.sin(particle.wobble) * dt * 2;
    particle.vx *= Math.pow(0.22, dt);
    particle.vy *= Math.pow(0.22, dt);
    const dx = particle.x - particle.anchorX;
    const dy = particle.y - particle.anchorY;
    const maxWorldRadius = 0.65;
    const dist = Math.hypot(dx, dy);
    if (dist > maxWorldRadius) {
      particle.x = particle.anchorX + (dx / dist) * maxWorldRadius;
      particle.y = particle.anchorY + (dy / dist) * maxWorldRadius;
    }
    return;
  }

  if (particle.movement === "floatUp") {
    particle.x += (particle.vx + Math.cos(particle.wobble) * 0.08) * dt;
    particle.y += (particle.vy + Math.sin(particle.wobble) * 0.08) * dt;
    particle.z += particle.vz * dt;
    return;
  }

  if (particle.movement === "rise" || particle.movement === "riseFade") {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.z += particle.vz * dt;
    particle.vz *= Math.pow(0.74, dt);
    return;
  }

  if (particle.movement === "drift") {
    particle.x += (particle.vx + Math.cos(particle.wobble * 0.7) * 0.04) * dt;
    particle.y += (particle.vy + Math.sin(particle.wobble * 0.9) * 0.04) * dt;
    particle.z += Math.sin(particle.wobble * 0.8) * dt * 1.2;
    return;
  }

  particle.x += (particle.vx + Math.cos(particle.wobble) * 0.05) * dt;
  particle.y += (particle.vy + Math.sin(particle.wobble) * 0.05) * dt;
  particle.z = particle.baseZ + 16 + Math.sin(particle.wobble * 1.4) * 8;
}

export const effectsMethods = {
  updateEffects(dt) {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i];
      if (p.configParticle) {
        updateConfiguredParticle(p, dt);
        p.life -= dt;
        if (p.life <= 0) this.particles.splice(i, 1);
        continue;
      }
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
  },

  updateConfiguredParticles(dt) {
    this.configParticleTimer = Math.max(0, (this.configParticleTimer ?? 0) - dt);
    this.configAmbientParticleTimer = Math.max(0, (this.configAmbientParticleTimer ?? 0) - dt);
    this.configWeatherParticleTimer = Math.max(0, (this.configWeatherParticleTimer ?? 0) - dt);
    if (this.configAmbientParticleTimer <= 0) {
      this.configAmbientParticleTimer = AMBIENT_PARTICLE_INTERVAL;
      this.spawnConfiguredAmbientParticles();
    }
    if (this.configWeatherParticleTimer <= 0) {
      this.configWeatherParticleTimer = WEATHER_PARTICLE_INTERVAL;
      this.spawnWeatherParticles();
    }
    if (this.configParticleTimer > 0) return;
    this.configParticleTimer = ATTACHED_PARTICLE_SCAN_INTERVAL;
    this.spawnAttachedConfiguredParticles();
  },

  updateWeatherEvents(dt) {
    const events = this.region?.mapRegion?.weather?.events ?? [];
    if (!events.length) return;
    for (let index = 0; index < events.length; index += 1) {
      const event = events[index];
      if (event.type !== "lightning_flash") continue;
      const chance = Math.max(0, Number(event.chancePerSecond) || 0) * dt;
      if (Math.random() > chance) continue;
      this.triggerLightningFlash(event);
    }
  },

  triggerLightningFlash(event) {
    const duration = rollRange(event.durationMs) / 1000;
    const alpha = rollRange(event.flashAlpha);
    const bolt = Math.random() < 0.55 ? this.createLightningBolt(duration) : null;
    this.weatherFlash = {
      type: "lightning_flash",
      color: event.flashColor ?? "#dbe9ff",
      alpha,
      life: duration,
      maxLife: duration,
      bolt,
    };
    if (event.sound) {
      // TODO: Hook into a dedicated audio system when thunder assets/runtime exist.
      this.pendingThunder = {
        sound: event.sound,
        delay: rollRange(event.thunderDelayMs) / 1000,
      };
    }
  },

  createLightningBolt(duration) {
    const startX = this.width * (0.15 + Math.random() * 0.7);
    const endY = this.height * (0.26 + Math.random() * 0.36);
    const segments = 5 + Math.floor(Math.random() * 4);
    const points = [];
    for (let i = 0; i <= segments; i += 1) {
      const t = i / segments;
      const x = startX + (Math.random() - 0.5) * (24 + t * 90);
      const y = -20 + t * (endY + 20);
      points.push({ x, y });
    }
    return {
      points,
      life: Math.min(duration, 0.12),
      maxLife: Math.min(duration, 0.12),
    };
  },

  spawnConfiguredAmbientParticles() {
    const configs = this.region?.mapRegion?.ambient?.particles ?? [];
    if (!configs.length) return;
    for (let index = 0; index < configs.length; index += 1) {
      const config = configs[index];
      if (Math.random() > config.chance) continue;
      const density = Math.max(0.01, Number(config.density) || 0.08);
      const key = `ambient:${this.region?.id ?? "world"}:${index}`;
      const target = Math.max(1, Math.min(80, Math.round(density * 120)));
      const missing = target - particlesForKey(this.particles, key);
      if (missing <= 0) continue;

      const spawnBudget = Math.min(4, missing);
      let spawned = 0;
      let attempts = 0;
      while (spawned < spawnBudget && attempts < 16) {
        attempts += 1;
        const screenX = Math.random() * this.width;
        const screenY = Math.random() * this.height;
        const world = screenToWorld(screenX, screenY, this.camera);
        if (!isRegionPointPlayable(this.region, world.x, world.y, 0.1)) continue;
        if (this.fogPointAlpha(world) <= 0.08) continue;
        spawnConfiguredParticle(this, world, config, key, { ambient: true });
        spawned += 1;
      }
    }
  },

  spawnWeatherParticles() {
    const configs = this.region?.mapRegion?.weather?.particles ?? [];
    if (!configs.length) return;
    for (let index = 0; index < configs.length; index += 1) {
      const config = configs[index];
      if (Math.random() > config.chance) continue;
      const key = `weather:${this.region?.id ?? "world"}:${index}`;
      const layer = config.layer ?? "screen";
      if (layer === "world") {
        // TODO: Add named weather areas/world masks later. For now weather world-layer
        // reuses ambient viewport spawning so it stays visual-only and bounded.
        const density = Math.max(0.01, Number(config.density) || 0.08);
        const target = Math.max(1, Math.min(80, Math.round(density * 120)));
        const missing = target - particlesForKey(this.particles, key);
        if (missing <= 0) continue;
        const spawnBudget = Math.min(3, missing);
        for (let spawned = 0, attempts = 0; spawned < spawnBudget && attempts < 14; attempts += 1) {
          const world = screenToWorld(Math.random() * this.width, Math.random() * this.height, this.camera);
          if (!isRegionPointPlayable(this.region, world.x, world.y, 0.1)) continue;
          if (this.fogPointAlpha(world) <= 0.08) continue;
          spawnConfiguredParticle(this, world, config, key, { ambient: true });
          spawned += 1;
        }
        continue;
      }

      const density = Math.max(0.01, Number(config.density) || 0.12);
      const target = Math.max(1, Math.min(WEATHER_PARTICLE_MAX, Math.round(density * WEATHER_PARTICLE_MAX)));
      const missing = target - particlesForKey(this.particles, key);
      if (missing <= 0) continue;
      const spawnBudget = Math.min(12, missing);
      for (let spawned = 0; spawned < spawnBudget; spawned += 1) {
        spawnScreenParticle(this, config, key);
      }
    }
  },

  spawnAttachedConfiguredParticles() {
    for (const chunk of this.nearbyChunks(2)) {
      for (const object of chunk.objects) {
        const configs = object.particles ?? [];
        if (!configs.length || this.fogPointAlpha(object) <= 0.02) continue;
        for (let index = 0; index < configs.length; index += 1) {
          const config = configs[index];
          if (!isAnchorVisible(this, object, config)) continue;
          const key = particleKey(object.id, index);
          const target = getParticleTarget(object, config, key);
          if (particlesForKey(this.particles, key) >= target) continue;
          spawnConfiguredParticle(this, object, config, key);
        }
      }

      for (const decal of chunk.decals) {
        const configs = decal.particles ?? [];
        if (!configs.length || this.fogPointAlpha(decal) <= 0.02) continue;
        for (let index = 0; index < configs.length; index += 1) {
          const config = configs[index];
          if (!isAnchorVisible(this, decal, config, 140)) continue;
          const key = particleKey(decal.id, index);
          const target = getParticleTarget(decal, config, key);
          if (particlesForKey(this.particles, key) >= target) continue;
          spawnConfiguredParticle(this, decal, config, key);
        }
      }
    }
  },

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
  },

  updateWeatherOverlay(dt) {
    if (this.weatherFlash) {
      this.weatherFlash.life -= dt;
      if (this.weatherFlash.bolt) this.weatherFlash.bolt.life -= dt;
      if (this.weatherFlash.life <= 0) this.weatherFlash = null;
    }
    if (this.pendingThunder) {
      this.pendingThunder.delay -= dt;
      if (this.pendingThunder.delay <= 0) {
        // TODO: Play this.pendingThunder.sound when sound assets/system are available.
        this.pendingThunder = null;
      }
    }
  },

  moveEntity(entity, dx, dy) {
    if (dx && !this.isBlocked(entity.x + dx, entity.y, entity.radius)) entity.x += dx;
    if (dy && !this.isBlocked(entity.x, entity.y + dy, entity.radius)) entity.y += dy;
  },

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
  },

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
  },

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
  },

  addFloater(x, y, text, color, life = 0.85) {
    this.floaters.push({ x, y, z: 68, text, color, life, maxLife: life });
  },

  addToast(text) {
    this.toasts.push({ id: createId(), text, life: 2.25 });
    if (this.toasts.length > 4) this.toasts.shift();
    this.publishSnapshot();
  }
};
