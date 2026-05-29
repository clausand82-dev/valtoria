import {
  CHUNK_SIZE,
  TILE_H,
  TILE_W,
  drawShadow,
  QUEST_NPCS
} from "../dependencies.js";

const npcImageCache = new Map();

export function drawRegionMarkerIfInChunk(ctx, chunk, point, type, originX, originY) {
  const tileX = Math.floor(point.x);
  const tileY = Math.floor(point.y);
  if (tileX < chunk.x || tileY < chunk.y || tileX >= chunk.x + CHUNK_SIZE || tileY >= chunk.y + CHUNK_SIZE) return;
  const tx = point.x - chunk.x;
  const ty = point.y - chunk.y;
  const x = originX + (tx - ty) * (TILE_W / 2);
  const y = originY + (tx + ty) * (TILE_H / 2) + TILE_H * 0.52;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = type === "exit" ? 0.96 : 0.45;
  ctx.strokeStyle = type === "exit" ? "#f4da96" : "#8bdfff";
  ctx.lineWidth = type === "exit" ? 4 : 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, type === "exit" ? 31 : 25, type === "exit" ? 15 : 12, 0, 0, Math.PI * 2);
  ctx.stroke();
  if (type === "exit") {
    ctx.fillStyle = "rgba(244, 218, 150, 0.24)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 36, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f4da96";
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(8, -7);
    ctx.lineTo(-8, -7);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function drawQuestgiver(ctx, screen, questgiver, time) {
  const npc = QUEST_NPCS[questgiver.npcId];
  const image = getNpcImage(npc?.imageUrl);
  const bob = Math.sin(time * 3.2 + questgiver.bob) * 3;
  drawShadow(ctx, screen.x, screen.y + 13, 19, 7, 0.26);

  if (image) {
    const height = 96;
    const width = height * (image.naturalWidth / image.naturalHeight);
    ctx.save();
    ctx.drawImage(image, screen.x - width * 0.5, screen.y - height + 16 + bob, width, height);
    ctx.restore();
  } else {
    ctx.save();
    ctx.fillStyle = "#d6c18a";
    ctx.beginPath();
    ctx.arc(screen.x, screen.y - 34 + bob, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawQuestMarkerPip(ctx, screen.x, screen.y - 82 + bob, time + questgiver.bob);
}

export function drawQuestMarkerPip(ctx, x, y, time) {
  const pulse = 0.9 + Math.sin(time * 5) * 0.1;
  ctx.save();
  ctx.shadowColor = "#ffd94a";
  ctx.shadowBlur = 10;
  ctx.strokeStyle = "#4a2b05";
  ctx.lineCap = "round";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x, y - 15 * pulse);
  ctx.lineTo(x, y - 2);
  ctx.stroke();
  ctx.fillStyle = "#4a2b05";
  ctx.beginPath();
  ctx.arc(x, y + 8, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffd94a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y - 15 * pulse);
  ctx.lineTo(x, y - 2);
  ctx.stroke();
  ctx.fillStyle = "#ffd94a";
  ctx.beginPath();
  ctx.arc(x, y + 8, 2.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function getNpcImage(url) {
  if (!url) return null;
  const cached = npcImageCache.get(url);
  if (cached?.loaded) return cached.image;
  if (cached) return null;
  const image = new Image();
  image.onload = () => {
    const entry = npcImageCache.get(url);
    if (entry) entry.loaded = true;
  };
  image.onerror = () => npcImageCache.delete(url);
  image.src = url;
  npcImageCache.set(url, { image, loaded: false });
  return null;
}

function finiteNumber(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function decayProjection(decal, sheet) {
  const raw = String(
    decal.decayProjection
      ?? decal.projection
      ?? decal.sourceProjection
      ?? sheet?.projection
      ?? sheet?.sourceProjection
      ?? "topdown",
  ).trim().toLowerCase();
  return raw === "iso" ? "iso" : "topdown";
}

function decalBlendMode(decal, sheet) {
  return String(
    decal.decayBlendMode
      ?? decal.blendMode
      ?? decal.compositeOperation
      ?? sheet?.blendMode
      ?? sheet?.compositeOperation
      ?? "source-over",
  ).trim() || "source-over";
}

export function getTerrainDecalRenderSize({ decal, sheet, TILE_W: tileW = TILE_W, TILE_H: tileH = TILE_H }) {
  const baseSize = finiteNumber(decal.size, 1);
  const renderScale = finiteNumber(decal.decayRenderScale, finiteNumber(sheet?.renderScale, 1));
  const scale = baseSize * renderScale;
  const projection = decayProjection(decal, sheet);
  const widthScale = finiteNumber(decal.decayWidthScale ?? decal.widthScale, finiteNumber(sheet?.widthScale, 1));
  const heightScale = finiteNumber(decal.decayHeightScale ?? decal.heightScale, finiteNumber(sheet?.heightScale, 1));

  return {
    projection,
    width: Math.max(8, tileW * scale * widthScale),
    height: Math.max(4, (projection === "iso" ? tileW : tileH) * scale * heightScale),
  };
}

export function drawTerrainDecal(ctx, decal, x, y, atlas) {
  const s = decal.size;

  if (decal.decaySheetId && atlas?.decaySheets?.[decal.decaySheetId]) {
    const sheet = atlas.decaySheets[decal.decaySheetId];
    const cells = sheet?.cells ?? [];
    const variant = Number.isInteger(decal.decayVariant)
      ? decal.decayVariant
      : 0;
    const cell = cells[(Math.abs(variant) % Math.max(1, cells.length))] ?? cells[0];
    if (cell) {
      const source = sheet.canvas;
      const { width, height } = getTerrainDecalRenderSize({ decal, sheet, TILE_W, TILE_H });
      const offsetX = finiteNumber(decal.decayOffsetX ?? decal.offsetX, finiteNumber(sheet.offsetX, 0));
      const offsetY = finiteNumber(decal.decayOffsetY ?? decal.offsetY, finiteNumber(sheet.offsetY, 0));
      const anchorX = finiteNumber(decal.decayAnchorX ?? decal.anchorX, finiteNumber(sheet.anchorX, 0.5));
      const anchorY = finiteNumber(decal.decayAnchorY ?? decal.anchorY, finiteNumber(sheet.anchorY, 0.5));
      const projection = decayProjection(decal, sheet);
      const maxAlpha = projection === "iso" ? 1 : 0.85;
      const configuredIsoAlpha = finiteNumber(sheet.alpha, 1);
      const rawAlpha = projection === "iso" && decal.decayAlphaExplicit !== true
        ? configuredIsoAlpha
        : finiteNumber(decal.alpha, 0.34);
      const alpha = Math.max(0.08, Math.min(maxAlpha, rawAlpha));
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(decal.rotation || 0);
      ctx.globalAlpha *= alpha;
      ctx.globalCompositeOperation = decalBlendMode(decal, sheet);
      ctx.drawImage(
        source,
        cell.x,
        cell.y,
        cell.w,
        cell.h,
        offsetX - width * anchorX,
        offsetY - height * anchorY,
        width,
        height,
      );
      ctx.restore();
      return;
    }
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(decal.rotation);
  switch (decal.type) {
    case "flower":
      ctx.fillStyle = decal.color > 0.5 ? "rgba(222, 110, 142, 0.75)" : "rgba(238, 205, 83, 0.72)";
      for (let i = 0; i < 5; i += 1) {
        ctx.rotate((Math.PI * 2) / 5);
        ctx.beginPath();
        ctx.ellipse(4 * s, 0, 4 * s, 2 * s, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#eedb73";
      ctx.beginPath();
      ctx.arc(0, 0, 2 * s, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "mushroom":
      ctx.fillStyle = "#d9c6a0";
      ctx.fillRect(-1.5 * s, -5 * s, 3 * s, 8 * s);
      ctx.fillStyle = decal.color > 0.5 ? "#c84f44" : "#b97b37";
      ctx.beginPath();
      ctx.ellipse(0, -6 * s, 7 * s, 4 * s, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      break;
    case "bone":
      ctx.strokeStyle = "rgba(224, 213, 190, 0.72)";
      ctx.lineWidth = 3 * s;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-9 * s, 0);
      ctx.lineTo(9 * s, 0);
      ctx.stroke();
      break;
    case "plank":
      ctx.fillStyle = "rgba(112, 74, 43, 0.58)";
      ctx.fillRect(-14 * s, -3 * s, 28 * s, 6 * s);
      break;
    case "barrel":
      ctx.fillStyle = "rgba(102, 66, 38, 0.62)";
      ctx.beginPath();
      ctx.ellipse(0, 0, 8 * s, 6 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "crack":
      ctx.strokeStyle = "rgba(0,0,0,0.24)";
      ctx.lineWidth = 1.2 * s;
      ctx.beginPath();
      ctx.moveTo(-12 * s, -2 * s);
      ctx.lineTo(-2 * s, 2 * s);
      ctx.lineTo(5 * s, -3 * s);
      ctx.lineTo(13 * s, 1 * s);
      ctx.stroke();
      break;
    case "debris":
    case "pebble":
      ctx.fillStyle = "rgba(190, 184, 166, 0.42)";
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.ellipse((i * 6 - 6) * s, (i % 2) * 4 * s, (3 + i) * s, 2.4 * s, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case "lantern":
      ctx.fillStyle = "rgba(255, 176, 70, 0.45)";
      ctx.beginPath();
      ctx.ellipse(0, 0, 9 * s, 6 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    default:
      ctx.strokeStyle = "rgba(128, 170, 89, 0.52)";
      ctx.lineWidth = 2 * s;
      ctx.lineCap = "round";
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo((Math.cos(i * 1.7) * 9) * s, (-4 - Math.sin(i * 1.4) * 6) * s);
        ctx.stroke();
      }
      break;
  }
  ctx.restore();
}
