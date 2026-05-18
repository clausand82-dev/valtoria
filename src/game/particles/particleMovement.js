export function applyParticleMovement(p, dt) {
  p.seed += dt;
  p.vy += (p.gravity ?? 0) * dt;
  p.vx += (p.wind ?? 0) * dt;
  switch (p.movement) {
    case "rise":
      p.z += Math.abs(p.speed) * dt;
      break;
    case "fall":
      if (p.screenSpace) {
        p.screenX += p.vx * dt;
        p.screenY += p.vy * dt;
      } else {
        p.z -= Math.abs(p.speed) * dt;
      }
      break;
    case "riseWobble":
      p.x += (p.vx + Math.cos(p.seed * 2.1) * 0.08) * dt;
      p.y += (p.vy + Math.sin(p.seed * 1.7) * 0.08) * dt;
      p.z += Math.abs(p.speed) * dt;
      break;
    case "drift":
      drift(p, dt, 18);
      break;
    case "buzz":
      p.vx += Math.cos(p.seed * 8.1) * dt * 34;
      p.vy += Math.sin(p.seed * 6.7) * dt * 34;
      p.x += p.vx * dt / 48;
      p.y += p.vy * dt / 48;
      p.vx *= Math.pow(0.22, dt);
      p.vy *= Math.pow(0.22, dt);
      constrainToAnchor(p);
      break;
    case "spark":
    case "burst":
      p.x += p.vx * dt / 48;
      p.y += p.vy * dt / 48;
      p.z += p.vz * dt;
      p.vz -= 90 * dt;
      break;
    case "orbit":
      p.orbitAngle += p.orbitSpeed * dt;
      p.x = p.anchorX + Math.cos(p.orbitAngle) * p.orbitRadius / 48;
      p.y = p.anchorY + Math.sin(p.orbitAngle) * p.orbitRadius / 48;
      p.z += Math.sin(p.seed * 2.2) * dt * 8;
      break;
    case "staticFade":
      drift(p, dt, 5);
      break;
    case "projectileTrail":
      p.x += p.vx * dt / 48;
      p.y += p.vy * dt / 48;
      p.z += p.vz * dt;
      break;
    case "screenFlash":
      break;
    default:
      p.x += p.vx * dt / 48;
      p.y += p.vy * dt / 48;
      p.z += p.vz * dt;
      break;
  }
}

function drift(p, dt, scale) {
  if (p.screenSpace) {
    p.screenX += (p.vx + Math.cos(p.seed * 1.3) * scale) * dt;
    p.screenY += (p.vy + Math.sin(p.seed * 0.9) * scale) * dt;
    return;
  }
  p.x += (p.vx + Math.cos(p.seed * 1.3) * scale * 0.01) * dt;
  p.y += (p.vy + Math.sin(p.seed * 0.9) * scale * 0.01) * dt;
  p.z += Math.sin(p.seed * 1.1) * dt * scale * 0.1;
}

function constrainToAnchor(p) {
  const dx = p.x - p.anchorX;
  const dy = p.y - p.anchorY;
  const max = Math.max(0.15, (p.radius ?? 18) / 48);
  const dist = Math.hypot(dx, dy);
  if (dist <= max) return;
  p.x = p.anchorX + (dx / dist) * max;
  p.y = p.anchorY + (dy / dist) * max;
}

