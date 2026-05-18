import { clamp, visibleScreenPoint, worldToScreen } from "../iso.js";

export function renderParticle(ctx, particle, context = {}) {
  const screen = particle.screenSpace
    ? { x: particle.screenX, y: particle.screenY }
    : worldToScreen(particle.x, particle.y, particle.z, context.camera);
  const pad = particle.movement === "screenFlash" ? Math.max(context.width, context.height) : Math.max(90, (particle.sizeNow ?? particle.size ?? 4) + 32);
  if (!visibleScreenPoint(screen, context.width, context.height, pad)) return;

  const alpha = particleAlpha(particle) * (particle.fogAlpha ?? 1);
  if (alpha <= 0.01) return;

  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.globalCompositeOperation = particle.blendMode ?? "source-over";
  if (particle.glow) {
    ctx.shadowBlur = Math.max(4, (particle.sizeNow ?? particle.size ?? 2) * 1.8);
    ctx.shadowColor = particle.color;
  }

  if (particle.movement === "screenFlash") {
    ctx.fillStyle = particle.color;
    ctx.fillRect(0, 0, context.width, context.height);
    ctx.restore();
    return;
  }

  if (particle.textureImage?.complete && particle.textureImage.naturalWidth > 0) {
    renderTexture(ctx, particle, screen);
  } else if (particle.visual === "line") {
    ctx.strokeStyle = particle.color;
    ctx.lineWidth = Math.max(1, Math.min(2.5, (particle.sizeNow ?? particle.size ?? 8) * 0.12));
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(screen.x, screen.y);
    ctx.lineTo(screen.x + (particle.vx ?? -120) * 0.035, screen.y + (particle.lineLength ?? particle.sizeNow ?? 12));
    ctx.stroke();
  } else if (particle.visual === "softCircle" || particle.visual === "softDot") {
    const r = Math.max(0.5, particle.sizeNow ?? particle.size ?? 2);
    const gradient = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, r);
    gradient.addColorStop(0, particle.color);
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, Math.max(0.5, particle.sizeNow ?? particle.size ?? 2), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function renderTexture(ctx, particle, screen) {
  const image = particle.textureImage;
  const frame = particle.frame;
  const size = Math.max(0.5, particle.sizeNow ?? particle.size ?? 4);
  ctx.translate(screen.x, screen.y);
  if (particle.rotation) ctx.rotate(particle.rotation);
  if (frame) {
    ctx.drawImage(image, frame.x, frame.y, frame.w, frame.h, -size * 0.5, -size * 0.5, size, size);
  } else {
    ctx.drawImage(image, -size * 0.5, -size * 0.5, size, size);
  }
}

function particleAlpha(p) {
  const age = p.age ?? 0;
  const life = Math.max(0.001, p.lifetime ?? 1);
  const base = p.startAlpha + (p.endAlpha - p.startAlpha) * clamp(age / life, 0, 1);
  const fadeIn = p.fadeIn > 0 ? clamp(age / p.fadeIn, 0, 1) : 1;
  const fadeOut = p.fadeOut > 0 ? clamp((life - age) / p.fadeOut, 0, 1) : 1;
  return base * fadeIn * fadeOut;
}

