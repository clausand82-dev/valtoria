import { randomInRange } from "./particleConfigUtils.js";

export class ParticleEmitter {
  constructor(id, config, owner = null) {
    this.id = id;
    this.config = config;
    this.owner = owner;
    this.age = 0;
    this.spawnCarry = 0;
    this.dead = false;
    this.burstDone = false;
  }

  update(dt, engine, context) {
    if (this.dead || this.config.enabled === false) return;
    this.age += dt;
    if (this.config.duration > 0 && this.age >= this.config.duration) {
      this.dead = true;
      return;
    }
    const anchor = engine.resolveEmitterAnchor(this, context);
    if (!anchor && this.config.area !== "screen" && this.config.area !== "map") {
      this.dead = true;
      return;
    }
    if (this.config.oneShot || this.config.burst) {
      if (!this.burstDone) {
        engine.spawnFromEmitter(this, this.config.oneShotCount, anchor, context);
        this.burstDone = true;
      }
      this.dead = true;
      return;
    }
    const rate = this.config.spawnRate * Math.max(0, this.config.intensity ?? 1);
    this.spawnCarry += rate * dt;
    const count = Math.min(16, Math.floor(this.spawnCarry));
    if (count <= 0) return;
    this.spawnCarry -= count;
    engine.spawnFromEmitter(this, count, anchor, context);
  }

  activeParticleCount(particles) {
    let count = 0;
    for (const particle of particles) if (particle.emitterId === this.id) count += 1;
    return count;
  }
}
