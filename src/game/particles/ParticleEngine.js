import { createId } from "../world.js";
import { clamp, screenDirectionToWorld, screenToWorld, visibleScreenPoint, worldToScreen } from "../iso.js";
import { ParticleEmitter } from "./ParticleEmitter.js";
import { ParticlePool } from "./ParticlePool.js";
import { applyParticleMovement } from "./particleMovement.js";
import { normalizeParticleConfig, normalizeParticleConfigs, randomInRange } from "./particleConfigUtils.js";
import { renderParticle } from "./particleRenderers.js";

export class ParticleEngine {
  constructor(options = {}) {
    this.maxParticles = Math.max(64, Number(options.maxParticles) || 900);
    this.quality = options.quality ?? "high";
    this.enabled = options.enabled !== false;
    this.pool = new ParticlePool(this.maxParticles);
    this.emitters = new Map();
    this.particles = [];
    this.textures = new Map();
    this.ownerEmitters = new Map();
  }

  addEmitter(rawConfig, owner = null) {
    const config = normalizeParticleConfig(rawConfig);
    if (!config || !config.enabled) return null;
    const id = createId();
    const emitter = new ParticleEmitter(id, config, owner);
    this.emitters.set(id, emitter);
    if (owner?.id || owner?.ownerId) {
      const ownerId = String(owner.id ?? owner.ownerId);
      this.ownerEmitters.set(ownerId, [...(this.ownerEmitters.get(ownerId) ?? []), id]);
    }
    this.preloadConfigTextures(config);
    return id;
  }

  removeEmitter(id) {
    const emitter = this.emitters.get(id);
    if (emitter) emitter.dead = true;
  }

  removeEmittersByOwner(ownerId) {
    const ids = this.ownerEmitters.get(String(ownerId)) ?? [];
    for (const id of ids) this.removeEmitter(id);
    this.ownerEmitters.delete(String(ownerId));
  }

  removeParticlesByEmitter(emitterId) {
    if (!emitterId) return;
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const particle = this.particles[i];
      if (particle.emitterId !== emitterId) continue;
      this.particles.splice(i, 1);
      this.pool.release(particle);
    }
  }

  removeParticlesInWorldCircle(x, y, radius, predicate = null) {
    const centerX = Number(x);
    const centerY = Number(y);
    const maxRadius = Math.max(0, Number(radius) || 0);
    if (!Number.isFinite(centerX) || !Number.isFinite(centerY) || maxRadius <= 0) return;
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const particle = this.particles[i];
      if (particle.screenSpace) continue;
      if (predicate && !predicate(particle)) continue;
      if (Math.hypot((Number(particle.x) || 0) - centerX, (Number(particle.y) || 0) - centerY) > maxRadius) continue;
      this.particles.splice(i, 1);
      this.pool.release(particle);
    }
  }

  removeEmittersByConfig(key, value) {
    for (const emitter of this.emitters.values()) {
      if (emitter.config?.[key] === value) emitter.dead = true;
    }
  }

  removeEmittersWhere(predicate) {
    if (typeof predicate !== "function") return;
    for (const emitter of this.emitters.values()) {
      if (predicate(emitter)) emitter.dead = true;
    }
  }

  removeParticlesByConfig(key, value) {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const particle = this.particles[i];
      if (particle[key] !== value) continue;
      this.particles.splice(i, 1);
      this.pool.release(particle);
    }
  }

  removeParticlesWhere(predicate) {
    if (typeof predicate !== "function") return;
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const particle = this.particles[i];
      if (!predicate(particle)) continue;
      this.particles.splice(i, 1);
      this.pool.release(particle);
    }
  }

  fadeParticlesByConfig(key, value, fadeTime = 0.5) {
    this.fadeParticlesWhere((particle) => particle[key] === value, fadeTime);
  }

  fadeParticlesWhere(predicate, fadeTime = 0.5) {
    if (typeof predicate !== "function") return;
    const cap = Math.max(0.05, Number(fadeTime) || 0.5);
    for (const particle of this.particles) {
      if (!predicate(particle)) continue;
      const remaining = Math.max(0, (Number(particle.lifetime) || 0) - (Number(particle.age) || 0));
      if (remaining > cap) particle.lifetime = (Number(particle.age) || 0) + cap;
    }
  }

  emitOneShot(type, x, y, options = {}) {
    return this.addEmitter({ ...options, type, x, y, oneShot: true, burst: true, duration: 0.01 }, options.owner ?? null);
  }

  attachEmitterToEntity(entityId, config) {
    return this.addEmitter({ ...config, followTarget: entityId, attachTo: "entity" }, { id: entityId, scope: "entity" });
  }

  attachEmitterToProjectile(projectileId, config) {
    return this.addEmitter({ ...config, followTarget: projectileId, attachTo: "projectile" }, { id: projectileId, scope: "projectile" });
  }

  clearMapEmitters() {
    for (const emitter of this.emitters.values()) {
      if (emitter.config.area !== "screen" && emitter.config.layer !== "screenOverlay") emitter.dead = true;
    }
  }

  clearAll() {
    this.emitters.clear();
    this.ownerEmitters.clear();
    for (const particle of this.particles) this.pool.release(particle);
    this.particles = [];
  }

  update(dt, context = {}) {
    if (!this.enabled) return;
    this.lastExpiredRemoved = 0;
    for (const emitter of this.emitters.values()) emitter.update(dt, this, context);
    for (const [id, emitter] of this.emitters) {
      if (!emitter.dead) continue;
      this.emitters.delete(id);
      for (const [ownerId, ids] of this.ownerEmitters) {
        const nextIds = ids.filter((entryId) => entryId !== id);
        if (nextIds.length) this.ownerEmitters.set(ownerId, nextIds);
        else this.ownerEmitters.delete(ownerId);
      }
      this.lastExpiredRemoved += 1;
    }
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const particle = this.particles[i];
      const invalidPosition = particle.screenSpace
        ? !Number.isFinite(Number(particle.screenX)) || !Number.isFinite(Number(particle.screenY))
        : !Number.isFinite(Number(particle.x)) || !Number.isFinite(Number(particle.y));
      if (invalidPosition || !Number.isFinite(Number(particle.age)) || !Number.isFinite(Number(particle.lifetime))) {
        this.particles.splice(i, 1);
        this.pool.release(particle);
        this.lastExpiredRemoved += 1;
        continue;
      }
      particle.age += dt;
      particle.rotation += particle.rotationSpeed * dt;
      particle.sizeNow = particle.startSize + (particle.endSize - particle.startSize) * clamp(particle.age / particle.lifetime, 0, 1);
      applyParticleMovement(particle, dt);
      if (particle.age >= particle.lifetime || this.isScreenParticleOut(particle, context)) {
        this.particles.splice(i, 1);
        this.pool.release(particle);
        this.lastExpiredRemoved += 1;
      }
    }
    this.expiredRemoved = (this.expiredRemoved ?? 0) + this.lastExpiredRemoved;
  }

  render(ctx, layer, context = {}) {
    if (!this.enabled) return;
    for (const particle of this.particles) {
      if (particle.layer !== layer) continue;
      particle.fogAlpha = particle.screenSpace ? 1 : (context.fogPointAlpha?.(particle) ?? 1);
      renderParticle(ctx, particle, context);
    }
    if (context.debugParticles) this.renderDebug(ctx, layer, context);
  }

  spawnFromEmitter(emitter, count, anchor, context) {
    const config = emitter.config;
    const active = emitter.activeParticleCount(this.particles);
    const quality = this.qualityMultiplier();
    const adaptive = context.adaptiveSettings ?? {};
    const category = config.effectCategory ?? "";
    const adaptiveScale = category === "spell-effects" || config.spellInstanceId
      ? Math.max(0.05, Math.min(1, Number(adaptive.spellVisualScale) || 1))
      : Math.max(0.05, Math.min(1, Number(adaptive.particleEmissionScale) || 1));
    const scaledRequested = count * quality * adaptiveScale;
    const requestedBudget = Math.floor(scaledRequested) + (Math.random() < scaledRequested % 1 ? 1 : 0);
    const emitterMax = Math.max(1, Math.floor(config.maxParticles * quality));
    const budget = Math.min(
      requestedBudget,
      Math.max(0, emitterMax - active),
      Math.max(0, Math.floor(this.maxParticles * quality * adaptiveScale) - this.particles.length),
    );
    if (budget <= 0) return;
    if (config.onlyWhenOnScreen && anchor && !this.isAnchorVisible(anchor, config, context)) return;
    for (let i = 0; i < budget; i += 1) {
      const data = this.createParticleData(emitter, anchor, context);
      const particle = this.pool.acquire(data);
      if (particle) this.particles.push(particle);
    }
  }

  createParticleData(emitter, anchor, context) {
    const c = emitter.config;
    const point = this.pickSpawnPoint(c, anchor, context);
    const angle = Math.random() * Math.PI * 2;
    const speed = randomInRange(c.speed);
    const startSize = randomInRange(c.size);
    const texture = this.pickTexture(c);
    const lifetime = randomInRange(c.lifetime);
    return {
      emitterId: emitter.id,
      spellInstanceId: c.spellInstanceId ?? emitter.owner?.spellInstanceId ?? null,
      effectCategory: c.effectCategory ?? null,
      layer: c.layer,
      movement: c.movement,
      visual: c.visual,
      screenSpace: c.area === "screen" || c.layer === "weatherOverlay" || c.layer === "screenOverlay",
      x: point.x,
      y: point.y,
      z: point.z ?? 0,
      screenX: point.screenX,
      screenY: point.screenY,
      anchorX: anchor?.x ?? point.x,
      anchorY: anchor?.y ?? point.y,
      vx: Math.cos(angle) * speed * c.velocityScale + (c.wind || 0),
      vy: Math.sin(angle) * speed * c.velocityScale + (c.movement === "fall" ? speed : 0),
      vz: c.movement === "burst" || c.movement === "spark" ? Math.sin(angle) * speed * 0.8 : speed,
      speed,
      gravity: c.gravity,
      wind: c.wind,
      radius: c.radius,
      age: 0,
      lifetime,
      startSize,
      endSize: randomInRange(c.endSize),
      sizeNow: startSize,
      startAlpha: randomInRange(c.alpha),
      endAlpha: randomInRange(c.endAlpha),
      fadeIn: c.fadeIn,
      fadeOut: c.fadeOut,
      color: c.colors[Math.floor(Math.random() * c.colors.length)] ?? "#ffffff",
      glow: c.glow,
      blendMode: c.blendMode,
      textureImage: texture,
      frame: this.pickSpritesheetFrame(c, texture),
      rotation: c.rotation === false ? 0 : Math.random() * Math.PI * 2,
      rotationSpeed: c.rotation === false ? 0 : randomInRange(c.rotationSpeed),
      seed: Math.random() * Math.PI * 2,
      orbitAngle: Math.random() * Math.PI * 2,
      orbitRadius: Math.random() * Math.max(2, c.radius),
      orbitSpeed: (Math.random() < 0.5 ? -1 : 1) * (0.8 + Math.random() * 1.4),
      lineLength: randomInRange(c.size),
    };
  }

  pickSpawnPoint(config, anchor, context) {
    if (config.area === "screen" || config.layer === "weatherOverlay" || config.layer === "screenOverlay") {
      return {
        x: 0,
        y: 0,
        z: 0,
        screenX: -120 + Math.random() * ((context.width ?? 1280) + 240),
        screenY: config.movement === "fall" ? -120 + Math.random() * 180 : Math.random() * (context.height ?? 720),
      };
    }
    if (config.area === "map") {
      const screenX = Math.random() * (context.width ?? 1280);
      const screenY = Math.random() * (context.height ?? 720);
      const world = screenToWorld(screenX, screenY, context.camera);
      return { x: world.x, y: world.y, z: config.offsetY };
    }
    const base = anchor ?? { x: Number(config.x) || 0, y: Number(config.y) || 0 };
    const screenOffsetX = Number(config.screenOffsetX);
    const screenOffsetY = Number(config.screenOffsetY);
    if (Number.isFinite(screenOffsetX) || Number.isFinite(screenOffsetY)) {
      const screenDelta = screenDirectionToWorld(Number.isFinite(screenOffsetX) ? screenOffsetX : 0, 0);
      const angle = Math.random() * Math.PI * 2;
      const r = config.area === "point" ? Math.random() * config.radius : Math.sqrt(Math.random()) * config.radius;
      return {
        x: base.x + screenDelta.x + Math.cos(angle) * r / 48,
        y: base.y + screenDelta.y + Math.sin(angle) * r / 48,
        z: -(Number.isFinite(screenOffsetY) ? screenOffsetY : 0) + Math.random() * 8,
      };
    }
    const angle = Math.random() * Math.PI * 2;
    const r = config.area === "point" ? Math.random() * config.radius : Math.sqrt(Math.random()) * config.radius;
    const x = base.x + config.offsetX / 48 + Math.cos(angle) * r / 48;
    const y = base.y + Math.sin(angle) * r / 48;
    const z = -config.offsetY + Math.random() * 8;
    return { x, y, z };
  }

  resolveEmitterAnchor(emitter, context) {
    const c = emitter.config;
    const followed = this.resolveFollowTarget(c, context);
    if (followed) return followed;
    if (Number.isFinite(Number(c.x)) && Number.isFinite(Number(c.y))) return { x: Number(c.x), y: Number(c.y) };
    if (emitter.owner && Number.isFinite(Number(emitter.owner.x)) && Number.isFinite(Number(emitter.owner.y))) return emitter.owner;
    return null;
  }

  resolveFollowTarget(config, context) {
    const id = config.followTarget ?? config.entityId ?? config.projectileId;
    if (!id) return null;
    if (config.attachTo === "projectile" || config.projectileId) return context.projectiles?.find((entry) => entry.id === id) ?? null;
    if (config.attachTo === "object") return context.objectById?.get?.(id) ?? context.nearbyObjects?.().find((entry) => entry.id === id) ?? null;
    if (context.player?.id === id) return context.player.deadTimer > 0 || context.player.hp <= 0 ? null : context.player;
    const entity = context.monsters?.get?.(id) ?? context.nearbyMonsters?.().find((entry) => entry.id === id) ?? null;
    return entity?.dead || entity?.hp <= 0 ? null : entity;
  }

  isAnchorVisible(anchor, config, context) {
    if (!anchor || !context.camera) return true;
    const screen = worldToScreen(anchor.x, anchor.y, 0, context.camera);
    return visibleScreenPoint(screen, context.width, context.height, 180 + config.radius);
  }

  isScreenParticleOut(particle, context) {
    if (!particle.screenSpace) return false;
    return particle.screenY > (context.height ?? 720) + 180 || particle.screenX < -260 || particle.screenX > (context.width ?? 1280) + 260;
  }

  preloadConfigTextures(config) {
    for (const path of texturePaths(config)) this.getTexture(path);
  }

  pickTexture(config) {
    const paths = texturePaths(config);
    if (!paths.length) return null;
    return this.getTexture(paths[Math.floor(Math.random() * paths.length)]);
  }

  getTexture(path) {
    if (!path) return null;
    if (this.textures.has(path)) return this.textures.get(path);
    if (typeof Image === "undefined") return null;
    const image = new Image();
    image.src = path;
    this.textures.set(path, image);
    return image;
  }

  pickSpritesheetFrame(config, image) {
    if (!config.spritesheet || !image) return null;
    const cols = Math.max(1, Math.floor(Number(config.spritesheet.cols) || 1));
    const rows = Math.max(1, Math.floor(Number(config.spritesheet.rows) || 1));
    const frameCount = Math.max(1, Math.floor(Number(config.spritesheet.frames) || cols * rows));
    const index = Math.floor(Math.random() * frameCount);
    const w = Number(config.spritesheet.frameWidth) || (image.naturalWidth ? image.naturalWidth / cols : 0);
    const h = Number(config.spritesheet.frameHeight) || (image.naturalHeight ? image.naturalHeight / rows : 0);
    if (!w || !h) return null;
    return { x: (index % cols) * w, y: Math.floor(index / cols) * h, w, h };
  }

  renderDebug(ctx, layer, context) {
    if (layer !== "screenOverlay") return;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(8, 8, 172, 44);
    ctx.fillStyle = "#d8e7ff";
    ctx.font = "12px monospace";
    ctx.fillText(`Emitters: ${this.emitters.size}`, 16, 26);
    ctx.fillText(`Particles: ${this.particles.length}/${this.maxParticles}`, 16, 42);
    ctx.restore();
  }

  qualityMultiplier() {
    if (this.quality === "low") return 0.38;
    if (this.quality === "medium") return 0.68;
    return 1;
  }
}

function texturePaths(config) {
  const paths = [];
  if (config.texture) paths.push(config.texture);
  if (Array.isArray(config.textures)) paths.push(...config.textures);
  return paths;
}
