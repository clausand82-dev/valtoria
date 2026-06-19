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
import { REGION_OBJECT_DEFS } from "../../config/region-object-config.js";
import { resolveAttachedObjectParticleConfigs } from "../../objects/object-attached-effects.js";

const CONFIG_PARTICLE_MAX = 420;
const WEATHER_PARTICLE_MAX = 320;
const ATTACHED_PARTICLE_SCAN_INTERVAL = 0.12;
const AMBIENT_PARTICLE_INTERVAL = 0.1;
const WEATHER_PARTICLE_INTERVAL = 0.05;

function particleContext(engine) {
  const nearbyObjects = engine.nearbyChunks(2).flatMap((chunk) => chunk.objects ?? []);
  return {
    width: engine.width,
    height: engine.height,
    camera: engine.camera,
    player: engine.player,
    projectiles: engine.projectiles,
    monsters: engine.monsters,
    nearbyMonsters: () => engine.nearbyMonsters(2),
    nearbyObjects: () => nearbyObjects,
    objectById: new Map(nearbyObjects.map((object) => [object.id, object])),
    fogPointAlpha: (point) => engine.fogPointAlpha(point),
  };
}

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

function ensureRuntimeAttachedObjectEffects(object) {
  if (object.__attachedEffectsResolved) return;
  object.__attachedEffectsResolved = true;
  const objectDef = REGION_OBJECT_DEFS[object.objectDefId] ?? REGION_OBJECT_DEFS[object.type];
  if (!objectDef?.attachedEffects?.length) return;
  const existing = object.particles ?? [];
  const hasAttached = existing.some((particle) => particle?.attachedEffectId);
  if (hasAttached) return;
  const attached = resolveAttachedObjectParticleConfigs({
    objectDef,
    runtimeObject: object,
    regionObjectConfig: object,
  });
  if (!attached.length) return;
  object.particles = [...existing, ...attached];
}

function getSheetObjectBaseScale(type) {
  return type === "building" ? 0.58
    : type === "ruin" ? 0.54
      : type === "crystal" ? 0.46
        : type === "chest" ? 0.28
          : type === "firebeacon" ? 0.44
            : 0.4;
}

function objectSheetFor(engine, object) {
  const sheetsByBiome = engine.atlas?.objectSheets?.[object.type];
  return sheetsByBiome?.[object.renderBiomeId]
    ?? sheetsByBiome?.default
    ?? sheetsByBiome?.mainland
    ?? null;
}

function refinedAttachedParticleConfig(engine, object, config) {
  if (!config?.attachedEffectId) return config;
  const sheet = objectSheetFor(engine, object);
  const cells = sheet?.cells;
  if (!cells?.length) return config;
  const frameIndex = Math.abs(Math.floor(object.treeVariant ?? 0)) % cells.length;
  const sprite = cells[frameIndex]?.sprite;
  if (!sprite) return config;
  const sourceX = Number(config.socketSourceX);
  const sourceY = Number(config.socketSourceY);
  const cropX = Number(sprite.sourceCropX);
  const cropY = Number(sprite.sourceCropY);
  if (!Number.isFinite(sourceX) || !Number.isFinite(sourceY) || !Number.isFinite(cropX) || !Number.isFinite(cropY)) return config;

  const scale = getSheetObjectBaseScale(object.type)
    * (Number(object.size) || 1)
    * (Number(object.visualScale) || 1)
    * (Number(sheet.renderScale) || 1);
  const frameOffset = sheet.frameOffsets?.[frameIndex] ?? { x: 0, y: 0 };
  const width = sprite.width * scale;
  const height = sprite.height * scale;
  const localX = sourceX - cropX;
  const localY = sourceY - cropY;
  const drawX = -width * 0.5 + (Number(frameOffset.x) || 0) * scale;
  const drawY = -height + 24 * scale + (Number(frameOffset.y) || 0) * scale;
  const screenOffsetX = drawX + localX * scale;
  const screenOffsetY = 12 + drawY + localY * scale;
  return {
    ...config,
    screenOffsetX: object.flip ? -screenOffsetX : screenOffsetX,
    screenOffsetY,
  };
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
  } else if (config.movement === "fallDrift") {
    particle.vx = Math.cos(angle) * speed / 320;
    particle.vy = Math.sin(angle) * speed / 320;
    particle.vz = -(6 + speed * 0.16);
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

  if (particle.movement === "fallDrift") {
    particle.x += (particle.vx + Math.cos(particle.wobble * 1.2) * 0.045) * dt;
    particle.y += (particle.vy + Math.sin(particle.wobble * 0.9) * 0.045) * dt;
    particle.z += particle.vz * dt;
    particle.vz *= Math.pow(0.96, dt);
    if (particle.z <= 0) particle.life = 0;
    return;
  }

  particle.x += (particle.vx + Math.cos(particle.wobble) * 0.05) * dt;
  particle.y += (particle.vy + Math.sin(particle.wobble) * 0.05) * dt;
  particle.z = particle.baseZ + 16 + Math.sin(particle.wobble * 1.4) * 8;
}

export const effectsMethods = {
  clearToastTimer(toastId) {
    const timerId = this.toastTimers?.get(toastId);
    if (timerId) clearTimeout(timerId);
    this.toastTimers?.delete(toastId);
  },

  clearToastLog() {
    for (const toast of this.toasts ?? []) {
      if (toast?.id) this.clearToastTimer(toast.id);
    }
    this.toasts = [];
    this.toastLog = [];
    this.markRenderDirty?.("toast-clear");
    this.publishSnapshot();
  },

  updateEffects(dt) {
    const beforeLegacyParticles = this.particles.length;
    const beforeEngineParticles = this.particleEngine?.particles?.length ?? 0;
    const beforeFloaters = this.floaters.length;
    const beforeToasts = this.toasts.length;
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i];
      if (p.effectParticle) {
        p.age += dt;
        p.life -= dt;
        if (p.life <= 0) this.particles.splice(i, 1);
        continue;
      }
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
      const toast = this.toasts[i];
      toast.life -= dt;
      if (toast.life <= 0) {
        this.clearToastTimer(toast.id);
        this.toasts.splice(i, 1);
      }
    }
    this.particleEngine?.update(dt, particleContext(this));
    if (
      beforeLegacyParticles !== this.particles.length
      || beforeEngineParticles !== (this.particleEngine?.particles?.length ?? 0)
      || beforeFloaters !== this.floaters.length
      || beforeToasts !== this.toasts.length
    ) {
      this.markRenderDirty?.("effects");
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
    this.particleEngine?.emitOneShot("lightning_flash", 0, 0, {
      layer: "screenOverlay",
      area: "screen",
      colors: [event.flashColor ?? "#dbe9ff"],
      alpha: event.flashAlpha ?? [0.35, 0.75],
      lifetime: [duration, duration],
    });
    this.markRenderDirty?.("weather-overlay");
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
      const key = `ambient:${this.region?.id ?? "world"}:${index}`;
      this.__ambientParticleEmitters ??= new Map();
      if (this.__ambientParticleEmitters.get(key)) continue;
      const density = Math.max(0.01, Number(config.density) || 0.08);
      const emitterId = this.particleEngine?.addEmitter({
        ...config,
        area: config.area === "screen" ? "screen" : "map",
        layer: config.layer ?? config.renderLayer ?? "aboveGround",
        intensity: config.intensity ?? Math.max(0.25, density / 0.14),
        maxParticles: config.maxParticles ?? Math.max(8, Math.min(80, Math.round(density * 150))),
      }, { id: key, scope: "ambient" });
      if (emitterId) this.__ambientParticleEmitters.set(key, emitterId);
      if (emitterId) this.markRenderDirty?.("ambient-particles");
    }
  },

  spawnWeatherParticles() {
    const configs = this.region?.mapRegion?.weather?.particles ?? [];
    if (!configs.length) return;
    for (let index = 0; index < configs.length; index += 1) {
      const config = configs[index];
      if (Math.random() > config.chance) continue;
      const key = `weather:${this.region?.id ?? "world"}:${index}`;
      this.__weatherParticleEmitters ??= new Map();
      if (this.__weatherParticleEmitters.get(key)) continue;
      const density = Math.max(0.01, Number(config.density) || 0.12);
      const layer = config.layer === "world" ? "aboveGround" : (config.layer ?? "weatherOverlay");
      const emitterId = this.particleEngine?.addEmitter({
        ...config,
        area: layer === "aboveGround" ? "map" : "screen",
        layer,
        intensity: config.intensity ?? Math.max(0.25, density / 0.35),
        maxParticles: config.maxParticles ?? Math.max(12, Math.min(WEATHER_PARTICLE_MAX, Math.round(density * WEATHER_PARTICLE_MAX))),
      }, { id: key, scope: "weather" });
      if (emitterId) this.__weatherParticleEmitters.set(key, emitterId);
      if (emitterId) this.markRenderDirty?.("weather-particles");
    }
  },

  spawnAttachedConfiguredParticles() {
    const nearbyObjectIds = new Set();
    for (const chunk of this.nearbyChunks(2)) {
      for (const object of chunk.objects) {
        nearbyObjectIds.add(object.id);
        ensureRuntimeAttachedObjectEffects(object);
        const configs = object.particles ?? [];
        if (!configs.length || this.fogPointAlpha(object) <= 0.02) continue;
        for (let index = 0; index < configs.length; index += 1) {
          const config = configs[index];
          if (!isAnchorVisible(this, object, config)) continue;
          const key = particleKey(object.id, index);
          object.__particleEmitterIds ??= {};
          if (object.__particleEmitterIds[key] && this.particleEngine?.emitters.has(object.__particleEmitterIds[key])) continue;
          const emitterConfig = refinedAttachedParticleConfig(this, object, config);
          object.__particleEmitterIds[key] = this.particleEngine?.addEmitter({
            ...emitterConfig,
            x: object.x,
            y: object.y,
            followTarget: object.id,
            attachTo: "object",
            layer: emitterConfig.layer ?? emitterConfig.renderLayer ?? "aboveObjects",
            maxParticles: emitterConfig.maxParticles ?? Math.max(4, randomIntInRange(emitterConfig.count) || 8),
          }, object);
          if (object.__particleEmitterIds[key]) this.markRenderDirty?.("attached-particles");
        }
      }

      for (const decal of chunk.decals) {
        const configs = decal.particles ?? [];
        if (!configs.length || this.fogPointAlpha(decal) <= 0.02) continue;
        for (let index = 0; index < configs.length; index += 1) {
          const config = configs[index];
          if (!isAnchorVisible(this, decal, config, 140)) continue;
          const key = particleKey(decal.id, index);
          decal.__particleEmitterIds ??= {};
          if (decal.__particleEmitterIds[key] && this.particleEngine?.emitters.has(decal.__particleEmitterIds[key])) continue;
          decal.__particleEmitterIds[key] = this.particleEngine?.addEmitter({
            ...config,
            x: decal.x,
            y: decal.y,
            followTarget: decal.id,
            attachTo: "object",
            layer: config.layer ?? config.renderLayer ?? "aboveGround",
            maxParticles: config.maxParticles ?? Math.max(4, randomIntInRange(config.count) || 8),
          }, decal);
          if (decal.__particleEmitterIds[key]) this.markRenderDirty?.("attached-particles");
        }
      }
    }
    this.particleEngine?.removeEmittersWhere((emitter) => (
      emitter.config?.attachTo === "object"
      && emitter.config?.followTarget
      && !nearbyObjectIds.has(emitter.config.followTarget)
    ));
  },

  updateAmbient(dt) {
    // Legacy biome ambient particles are disabled. Region-specific ambience is
    // driven by map-region-config ambient/weather particle configs.
  },

  setParticlesEnabled(enabled) {
    if (!this.particleEngine) return;
    this.particleEngine.enabled = Boolean(enabled);
    if (!this.particleEngine.enabled) this.particleEngine.clearAll();
    this.markRenderDirty?.("particles-enabled");
  },

  toggleParticles() {
    this.setParticlesEnabled(!this.particleEngine?.enabled);
    return this.particleEngine?.enabled ?? false;
  },

  setParticleQuality(quality = "high") {
    if (!this.particleEngine) return;
    this.particleEngine.quality = ["low", "medium", "high"].includes(quality) ? quality : "high";
    this.markRenderDirty?.("particle-quality");
  },

  particleDebugStats() {
    let nearbyHouses = 0;
    let housesWithAttachedConfigs = 0;
    let attachedConfigs = 0;
    for (const chunk of this.nearbyChunks(2)) {
      for (const object of chunk.objects ?? []) {
        if (object.type !== "object_house_mainland") continue;
        nearbyHouses += 1;
        ensureRuntimeAttachedObjectEffects(object);
        const count = (object.particles ?? []).filter((particle) => particle?.attachedEffectId).length;
        if (count > 0) housesWithAttachedConfigs += 1;
        attachedConfigs += count;
      }
    }
    let attachedEmitters = 0;
    for (const emitter of this.particleEngine?.emitters.values?.() ?? []) {
      if (emitter.config?.attachedEffectId) attachedEmitters += 1;
    }
    let attachedParticles = 0;
    for (const particle of this.particleEngine?.particles ?? []) {
      const emitter = this.particleEngine?.emitters.get(particle.emitterId);
      if (emitter?.config?.attachedEffectId) attachedParticles += 1;
    }
    return {
      enabled: this.particleEngine?.enabled ?? false,
      performanceMode: this.performanceMode ?? "balanced",
      quality: this.particleEngine?.quality ?? "high",
      fps: this.lastFrameDt > 0 ? Math.round(1 / this.lastFrameDt) : 0,
      averageFps: this.averageFps ?? 0,
      updateFps: this.updateFps ?? 0,
      renderFps: this.renderFps ?? 0,
      rafCallbacksPerSecond: this.rafCallbacksPerSecond ?? 0,
      skippedRenderFrames: this.skippedRenderFrames ?? 0,
      renderDirty: Boolean(this.renderDirty),
      visualActivity: (this.getVisualActivityLevel?.() ?? "idle") !== "idle",
      visualActivityLevel: this.visualActivityLevel ?? "idle",
      visualActivityReasons: [...(this.visualActivityReasons ?? [])],
      ambientRenderFps: this.ambientRenderFps ?? 0,
      lastRenderDirtyReasons: [...(this.lastRenderDirtyReasons ?? [])],
      canvasMegapixels: Math.round((((this.canvas?.width ?? 0) * (this.canvas?.height ?? 0)) / 1000000) * 100) / 100,
      targetFps: this.targetFps ?? 60,
      dpr: this.dpr ?? 1,
      fogRenderScale: this.fogRenderScale ?? 1,
      fogExploredPoints: this.fogExploredPoints?.length ?? 0,
      emitters: this.particleEngine?.emitters.size ?? 0,
      particles: this.particleEngine?.particles.length ?? 0,
      nearbyHouses,
      housesWithAttachedConfigs,
      attachedConfigs,
      attachedEmitters,
      attachedParticles,
    };
  },

  updateWeatherOverlay(dt) {
    if (this.weatherFlash) {
      this.weatherFlash.life -= dt;
      if (this.weatherFlash.bolt) this.weatherFlash.bolt.life -= dt;
      if (this.weatherFlash.life <= 0) {
        this.weatherFlash = null;
        this.markRenderDirty?.("weather-overlay");
      }
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

  addParticles(x, y, color, count, upward = 0.08, options = {}) {
    const particleCount = Math.floor(Number(count) || 0);
    if (particleCount <= 0) return;
    this.particleEngine?.emitOneShot("hit_sparks", x, y, {
      spellInstanceId: options.spellInstanceId ?? null,
      colors: [color],
      oneShotCount: particleCount,
      speed: [24, 120],
      size: [2, 5],
      lifetime: [0.25, 0.85],
      layer: "effects",
      gravity: upward > 0.12 ? -8 : 0,
    });
    this.markRenderDirty?.("particles");
  },

  addDust(x, y, count = 1) {
    const dustConfig = this.region?.mapRegion?.ambient?.footstepDust ?? {};
    const configuredCount = dustConfig.oneShotCount ?? randomIntInRange(dustConfig.count ?? [count, count]);
    this.particleEngine?.emitOneShot(dustConfig.type ?? "dust_motes", x, y, {
      ...dustConfig,
      oneShotCount: Math.max(1, Math.floor(Number(configuredCount) || count || 1)),
      layer: dustConfig.layer ?? dustConfig.renderLayer ?? "belowUnits",
      lifetime: dustConfig.lifetime ?? [0.32, 0.7],
      size: dustConfig.size ?? [2, 6],
      alpha: dustConfig.alpha ?? [0.12, 0.35],
    });
    this.markRenderDirty?.("dust");
  },

  spawnHeroHealingEffect() {
    this.particleEngine?.emitOneShot("hero_healing_beam", this.player.x, this.player.y, {
      oneShotCount: 1,
      layer: "belowUnits",
      radius: 2,
      offsetY: 0,
      speed: [0, 0],
      size: [28, 38],
      endSize: [82, 112],
      alpha: [0.26, 0.42],
      endAlpha: [0, 0],
      lifetime: [0.42, 0.62],
      fadeIn: 0.18,
      fadeOut: 0.34,
      rotationSpeed: [-0.35, 0.35],
      blendMode: "lighter",
    });
    this.markRenderDirty?.("healing-effect");
  },

  spawnObjectBreakDustEffect(x, y) {
    this.particleEngine?.emitOneShot("object_break_cold_mist", x, y, {
      oneShotCount: 2,
      layer: "effects",
      radius: 18,
      offsetY: 10,
      speed: [1, 7],
      alpha: [0.04, 0.1],
      endAlpha: [0, 0],
      blendMode: "source-over",
      glow: false,
    });
    this.markRenderDirty?.("object-break-effect");
  },

  footstepDustChance(fallback = 0.18) {
    const dustConfig = this.region?.mapRegion?.ambient?.footstepDust ?? {};
    const configured = Number(dustConfig.stepChance ?? dustConfig.chancePerStep);
    return Number.isFinite(configured) ? Math.max(0, Math.min(1, configured)) : fallback;
  },

  spawnExpandingEnergyRingEffect(x, y, radius, options = {}) {
    const duration = Math.max(0.05, (Number(options.durationMs) || 350) / 1000);
    this.particles.push({
      effectParticle: true,
      visual: "expandingEnergyRing",
      renderLayer: "aboveEntities",
      x,
      y,
      z: 2,
      radiusWorld: Math.max(0.05, Number(radius) || 0.05),
      color: options.color ?? "#8feaff",
      age: 0,
      life: duration,
      maxLife: duration,
    });
    this.markRenderDirty?.("spell-effect");
  },

  spawnGroundCloudEffect(x, y, radius, color, duration, options = {}) {
    const particle = {
      effectParticle: true,
      id: options.id ?? createId(),
      ownerId: options.ownerId ?? null,
      spellInstanceId: options.spellInstanceId ?? null,
      visual: "groundCloud",
      renderLayer: "belowEntities",
      x,
      y,
      z: 1,
      radiusWorld: Math.max(0.05, Number(radius) || 0.05),
      color: color ?? "#87d65a",
      age: 0,
      life: Math.max(0.2, Number(duration) || 1),
      maxLife: Math.max(0.2, Number(duration) || 1),
    };
    this.particles.push(particle);
    this.markRenderDirty?.("spell-effect");
    return particle;
  },

  spawnGroundPulseEffect(x, y, radius, options = {}) {
    this.particles.push({
      effectParticle: true,
      visual: "groundPulse",
      renderLayer: "belowEntities",
      x,
      y,
      z: 1,
      radiusWorld: Math.max(0.05, Number(radius) || 0.05),
      color: options.color ?? "#d8c091",
      age: 0,
      life: Math.max(0.05, (Number(options.durationMs) || 350) / 1000),
      maxLife: Math.max(0.05, (Number(options.durationMs) || 350) / 1000),
    });
    this.camera.shake = Math.max(this.camera.shake, Number(options.shake) || 0);
    this.markRenderDirty?.("spell-effect");
  },

  addFloater(x, y, text, color, life = 0.85) {
    this.floaters.push({ x, y, z: 68, text, color, life, maxLife: life });
    this.markRenderDirty?.("floater");
  },

  addToast(text, options = {}) {
    const opts = options && typeof options === "object" ? options : {};
    const id = createId();
    const life = 2.25;
    const createdAt = Date.now();
    const textValue = String(text ?? "");
    const questTitles = new Set((this.questState?.active ?? []).map((quest) => String(quest?.title ?? "").trim()).filter(Boolean));
    const requestedKind = String(opts.kind ?? "");
    const isQuestToast = requestedKind.startsWith("quest")
      || /\bquest\b/i.test(textValue)
      || [...questTitles].some((title) => textValue.includes(title));
    const toast = {
      id,
      text: textValue,
      title: opts.title ? String(opts.title) : "",
      kind: isQuestToast ? (requestedKind || "quest") : (requestedKind || "info"),
      life,
      createdAt,
      expiresAt: createdAt + (life * 1000),
    };
    this.toasts.push(toast);
    this.toastLog = [toast, ...(this.toastLog ?? [])].slice(0, 80);
    if (this.toasts.length > 4) {
      const removedToast = this.toasts.shift();
      if (removedToast) this.clearToastTimer(removedToast.id);
    }
    this.toastTimers?.set(id, setTimeout(() => {
      this.clearToastTimer(id);
      this.toasts = this.toasts.filter((entry) => entry.id !== id);
      this.markRenderDirty?.("toast-expire");
      this.publishSnapshot();
    }, life * 1000));
    this.markRenderDirty?.("toast");
    this.publishSnapshot();
  }
};
