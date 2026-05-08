import { chunkCoords, createId, isRegionPointPlayable } from "../dependencies.js";

export const effectsMethods = {
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
