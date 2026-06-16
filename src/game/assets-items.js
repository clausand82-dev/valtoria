import { drawAtlasFrame, drawShadow } from "./assets-ground.js";
import { TILE_H, TILE_W } from "./config/game-constants-config.js";

const customItemImageCache = new Map();
const GOLD_ICON_URL = "/assets/generated/item/item_gold.png";
const ITEM_STANDARD_ICON_URL = "/assets/generated/item/item_standard.png";

const ITEM_FRAME_BY_BASE = {
  Sword: 0,
  Spear: 1,
  Javelin: 1,
  Dagger: 2,
  "Mana Potion": 3,
  "Health Potion": 4,
  Crossbow: 8,
  Bow: 9,
  "Rune Staff": 10,
  "Spell Mask": 11,
  Ring: 6,
  Amulet: 7,
  Gorget: 7,
  Bracelet: 7,
  Helm: 11,
  Chestplate: 11,
  Vambraces: 11,
  Greaves: 11,
  Boots: 11,
  Gloves: 11,
  Pauldrons: 11,
  Cape: 11,
  Belt: 11,
  Relic: 11,
};

const ARMOR_FRAME_BY_BASE = {
  Helm: 0,
  Gorget: 1,
  Chestplate: 2,
  Vambraces: 3,
  Greaves: 4,
  Bracelet: 8,
  Boots: 9,
  Gloves: 10,
  Pauldrons: 5,
  Cape: 6,
  Belt: 7,
  Relic: 11,
};

export function drawLoot(ctx, screen, loot, atlas) {
  if (loot.type === "gold") {
    drawGoldLoot(ctx, screen, loot);
    return;
  }

  if (drawItemLoot(ctx, screen, loot, atlas)) return;
  drawAtlasFrame(ctx, atlas, "gem", screen.x, screen.y + Math.sin(loot.bob) * 4 + 4, {
    scale: 0.24,
  });
}

function drawGoldLoot(ctx, screen, loot) {
  const customImage = getCustomItemImage(GOLD_ICON_URL);
  const bob = Math.sin(loot.bob) * 3;
  const x = screen.x;
  const y = screen.y + bob + 8;
  drawShadow(ctx, x, screen.y + 16, 17, 6, 0.24);

  if (customImage) {
    const scale = 0.18;
    const width = customImage.width * scale;
    const height = customImage.height * scale;
    ctx.save();
    ctx.drawImage(customImage, x - width * 0.5, y - height * 0.72, width, height);
    ctx.restore();
    return;
  }

  // Gold should not rely on sheets. Use a simple coin as temporary fallback.
  ctx.save();
  ctx.fillStyle = "#f1c657";
  ctx.beginPath();
  ctx.ellipse(x, y - 6, 7, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a5c1d";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawItemLoot(ctx, screen, loot, atlas) {
  if (!loot.item) return false;
  const customImage = getCustomItemImage(loot.item?.iconUrl);
  const fallbackImage = getCustomItemImage(ITEM_STANDARD_ICON_URL);
  const useArmorSheet = Object.hasOwn(ARMOR_FRAME_BY_BASE, loot.item?.baseName);
  const useResourceSheet = loot.item?.mode === "resource";
  const cells = (useResourceSheet ? atlas?.resourceSheet?.[loot.item?.iconSheet ?? "resources"] : useArmorSheet ? atlas?.armorSheet : atlas?.itemSheet)?.cells;
  const hasSheetCells = Boolean(cells?.length);
  if (!customImage && !fallbackImage && !hasSheetCells) return false;
  const index = useArmorSheet
    ? ARMOR_FRAME_BY_BASE[loot.item.baseName]
    : useResourceSheet
      ? loot.item.iconIndex ?? 0
    : ITEM_FRAME_BY_BASE[loot.item.baseName] ?? (loot.item.slot === "ring" ? 6 : loot.item.slot === "weapon" ? 0 : 11);
  const cell = hasSheetCells ? cells[Math.abs(index) % cells.length] : null;
  const sprite = customImage ?? fallbackImage ?? cell?.sprite;
  if (!sprite) return false;

  const bob = Math.sin(loot.bob) * 3;
  const scale = loot.item.mode === "resource" ? 0.18 : loot.item.slot === "weapon" ? 0.18 : 0.16;
  const width = sprite.width * scale;
  const height = sprite.height * scale;
  const x = screen.x;
  const y = screen.y + bob + 8;
  const rarityColor = loot.item.rarityColor ?? "#f5f3ea";
  const glowAlpha = loot.item.rarity === "poor" ? 0.14 : loot.item.rarity === "normal" ? 0.16 : 0.28;

  drawShadow(ctx, x, screen.y + 16, 17, 6, 0.24);
  ctx.save();
  ctx.globalAlpha = glowAlpha;
  ctx.fillStyle = rarityColor;
  ctx.beginPath();
  ctx.ellipse(x, screen.y + 8, 30, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = Math.min(0.75, glowAlpha + 0.18);
  ctx.strokeStyle = rarityColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(x, screen.y + 8, 23, 11, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((loot.item.id % 7 - 3) * 0.05);
  ctx.shadowColor = rarityColor;
  ctx.shadowBlur = loot.item.rarity === "poor" ? 4 : loot.item.rarity === "normal" ? 6 : 12;
  ctx.drawImage(sprite, -width * 0.5, -height * 0.72, width, height);
  ctx.restore();
  return true;
}

function getCustomItemImage(iconUrl) {
  if (!iconUrl) return null;
  const cached = customItemImageCache.get(iconUrl);
  if (cached?.loaded) return cached.image;
  if (cached?.failed) return null;
  if (cached) return null;

  const image = new Image();
  image.onload = () => {
    const entry = customItemImageCache.get(iconUrl);
    if (entry) entry.loaded = true;
  };
  image.onerror = () => {
    customItemImageCache.set(iconUrl, { image: null, loaded: false, failed: true });
  };
  image.src = iconUrl;
  customItemImageCache.set(iconUrl, { image, loaded: false, failed: false });
  return null;
}

export function drawProjectile(ctx, screen, projectile, atlas, beamStartScreen = null) {
  const projectileFrame = projectile.type === "magic" || projectile.type === "burst" || projectile.owner ? "orb" : "arrow";
  if (projectile.beam && beamStartScreen) {
    drawEnergyBeam(ctx, beamStartScreen, screen, projectile);
    return;
  }
  const projectileImage = getCustomItemImage(projectile.texture);
  if (projectileImage) {
    const size = Math.max(4, Number(projectile.textureSize) || (projectile.owner ? 28 : 22));
    ctx.save();
    ctx.globalAlpha = projectile.alpha ?? 0.95;
    ctx.shadowColor = projectile.color ?? "#9de9ff";
    ctx.shadowBlur = projectile.glow === false ? 0 : 12;
    ctx.translate(screen.x, screen.y - 8);
    if (projectile.rotateTexture) ctx.rotate(projectileScreenAngle(projectile) + (Number(projectile.textureRotationOffset) || 0));
    ctx.drawImage(projectileImage, -size * 0.5, -size * 0.5, size, size);
    ctx.restore();
    return;
  }
  if (projectile.owner) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = projectile.color ?? "#9de9ff";
    ctx.shadowColor = projectile.color ?? "#9de9ff";
    ctx.shadowBlur = projectile.type === "energy_beam" ? 18 : 10;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y - 8, projectile.type === "energy_beam" ? 5 : 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  drawAtlasFrame(ctx, atlas, projectileFrame, screen.x, screen.y - 8, {
    scale: projectileFrame === "orb" ? 0.18 : 0.16,
  });
}

function projectileScreenAngle(projectile) {
  const vx = Number(projectile.vx) || 0;
  const vy = Number(projectile.vy) || 0;
  const screenDx = (vx - vy) * (TILE_W / 2);
  const screenDy = (vx + vy) * (TILE_H / 2);
  return Math.atan2(screenDy, screenDx);
}

function drawEnergyBeam(ctx, start, end, projectile) {
  const color = projectile.color ?? "#b8a4ff";
  const sx = start.x;
  const sy = start.y - 18;
  const ex = end.x;
  const ey = end.y - 8;
  const width = Math.max(3, Number(projectile.beamWidth) || 7);
  if (projectile.beamStyle === "lightning") {
    drawLightningBeam(ctx, sx, sy, ex, ey, projectile, width);
    return;
  }
  const points = projectile.beamStyle === "lightning"
    ? lightningBeamPoints(sx, sy, ex, ey, projectile)
    : [{ x: sx, y: sy }, { x: ex, y: ey }];
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 22;
  ctx.lineWidth = width * 3.2;
  strokeBeamPath(ctx, points);

  ctx.globalAlpha = 0.72;
  ctx.lineWidth = width;
  strokeBeamPath(ctx, points);

  ctx.globalAlpha = 0.95;
  ctx.strokeStyle = "rgba(255,255,255,0.82)";
  ctx.lineWidth = Math.max(1.2, width * 0.34);
  strokeBeamPath(ctx, points);

  ctx.fillStyle = color;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(ex, ey, width * 0.95, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLightningBeam(ctx, sx, sy, ex, ey, projectile, width) {
  const color = projectile.color ?? "#d8f6ff";
  const points = lightningBeamPoints(sx, sy, ex, ey, projectile);
  const branches = lightningBranches(points, projectile);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "miter";

  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = "#7de7ff";
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.lineWidth = Math.max(3, width * 1.35);
  strokeBeamPath(ctx, points);

  ctx.globalAlpha = 0.82;
  ctx.strokeStyle = color;
  ctx.shadowBlur = 9;
  ctx.lineWidth = Math.max(1.6, width * 0.42);
  strokeBeamPath(ctx, points);

  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.96)";
  ctx.shadowBlur = 4;
  ctx.lineWidth = Math.max(1, width * 0.18);
  strokeBeamPath(ctx, points);

  ctx.strokeStyle = "rgba(216,246,255,0.82)";
  ctx.shadowColor = "#7de7ff";
  ctx.shadowBlur = 6;
  ctx.lineWidth = Math.max(1, width * 0.16);
  for (const branch of branches) strokeBeamPath(ctx, branch);

  ctx.fillStyle = color;
  ctx.globalAlpha = 0.65;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(ex, ey, Math.max(3, width * 0.45), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function strokeBeamPath(ctx, points) {
  if (!points.length) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
}

function lightningBeamPoints(sx, sy, ex, ey, projectile) {
  const segments = Math.max(5, Math.floor(Number(projectile.beamSegments) || 10));
  const jitter = Math.max(0, Number(projectile.beamJitter) || 14);
  const dx = ex - sx;
  const dy = ey - sy;
  const len = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / len;
  const ny = dx / len;
  const seed = Math.floor((Number(projectile.life) || 0) * 90) + String(projectile.id ?? "").length * 17;
  const points = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const endpoint = i === 0 || i === segments;
    const wave = Math.sin((seed + i * 12.9898) * 78.233) * 43758.5453;
    const rand = wave - Math.floor(wave);
    const offset = endpoint ? 0 : (rand - 0.5) * jitter * 2;
    points.push({
      x: sx + dx * t + nx * offset,
      y: sy + dy * t + ny * offset,
    });
  }
  return points;
}

function lightningBranches(points, projectile) {
  const branches = [];
  const seed = Math.floor((Number(projectile.life) || 0) * 130) + String(projectile.id ?? "").length * 31;
  for (let i = 1; i < points.length - 1; i += 2) {
    const start = points[i];
    const prev = points[i - 1];
    const next = points[i + 1];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / len;
    const ny = dx / len;
    const wave = Math.sin((seed + i * 19.19) * 41.73) * 24634.6345;
    const rand = wave - Math.floor(wave);
    if (rand < 0.35) continue;
    const side = rand < 0.68 ? -1 : 1;
    const length = 7 + rand * 18;
    branches.push([
      { x: start.x, y: start.y },
      { x: start.x + nx * side * length + dx * 0.08, y: start.y + ny * side * length + dy * 0.08 },
    ]);
  }
  return branches;
}
