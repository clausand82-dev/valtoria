import { Particle } from "./Particle.js";

export class ParticlePool {
  constructor(max = 900) {
    this.max = max;
    this.free = [];
    this.created = 0;
  }

  acquire(data) {
    const particle = this.free.pop() ?? (this.created < this.max ? new Particle() : null);
    if (!particle) return null;
    if (!particle.active && this.created < this.max && !particle.__counted) {
      particle.__counted = true;
      this.created += 1;
    }
    return particle.reset(data);
  }

  release(particle) {
    if (!particle) return;
    particle.release();
    if (this.free.length < this.max) this.free.push(particle);
  }
}

