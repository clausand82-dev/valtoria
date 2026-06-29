import { TILE_H, TILE_W } from "../../config/game-constants-config.js";
import { isRegionTilePlayable } from "../../world.js";

export const TILE_EDGE_WALL_SIDE_ORDER = ["back", "left"];

export function hasPlayableTileAt(region, x, y) {
  return region ? isRegionTilePlayable(region, x, y) : true;
}

export function getTileWallEdges(tile, region, config) {
  if (!tile || !region || !config?.enabled) return [];
  return TILE_EDGE_WALL_SIDE_ORDER.filter((side) => {
    const sideConfig = config.sides?.[side];
    if (!sideConfig) return false;
    return !hasPlayableTileAt(
      region,
      tile.x + Number(sideConfig.neighbourDx || 0),
      tile.y + Number(sideConfig.neighbourDy || 0),
    );
  });
}

export function getTileEdgeWallAnchors(side, sx, sy, overlapPx = 0) {
  const edge = side === "left"
    ? { startX: sx - TILE_W / 2, startY: sy + TILE_H / 2, endX: sx, endY: sy }
    : { startX: sx, startY: sy, endX: sx + TILE_W / 2, endY: sy + TILE_H / 2 };
  const dx = edge.endX - edge.startX;
  const dy = edge.endY - edge.startY;
  const length = Math.max(1, Math.hypot(dx, dy));
  const overlap = Math.max(0, Number(overlapPx) || 0);
  const extendX = (dx / length) * overlap;
  const extendY = (dy / length) * overlap;
  return {
    startX: Math.round(edge.startX - extendX),
    startY: Math.round(edge.startY - extendY),
    endX: Math.round(edge.endX + extendX),
    endY: Math.round(edge.endY + extendY),
  };
}

export function getTileEdgeWallRenderHeight(wallImage, config) {
  const configuredHeight = Number(config?.renderHeight);
  if (Number.isFinite(configuredHeight) && configuredHeight > 0) return Math.round(configuredHeight);
  const imageWidth = Number(wallImage?.naturalWidth || wallImage?.width) || 0;
  const imageHeight = Number(wallImage?.naturalHeight || wallImage?.height) || 0;
  if (imageWidth <= 0 || imageHeight <= 0) return 0;
  const edgeLength = Math.hypot(TILE_W / 2, TILE_H / 2) + Math.max(0, Number(config?.overlapPx) || 0) * 2;
  return Math.max(1, Math.round(edgeLength * (imageHeight / imageWidth)));
}

export function drawTileEdgeWall(ctx, wallImage, side, sx, sy, config, debug = false) {
  const imageWidth = Number(wallImage?.naturalWidth || wallImage?.width) || 0;
  const imageHeight = Number(wallImage?.naturalHeight || wallImage?.height) || 0;
  if (!ctx || imageWidth <= 0 || imageHeight <= 0) return;

  const sideConfig = config?.sides?.[side];
  if (!sideConfig) return;
  const anchors = getTileEdgeWallAnchors(side, Math.round(sx), Math.round(sy), config.overlapPx);
  const wallHeight = getTileEdgeWallRenderHeight(wallImage, config);
  const yOffset = Math.round(Number(config.yOffset) || 0);
  const edgeDx = anchors.endX - anchors.startX;
  const edgeDy = anchors.endY - anchors.startY;

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.transform(
    edgeDx / imageWidth,
    edgeDy / imageWidth,
    0,
    wallHeight / imageHeight,
    anchors.startX,
    anchors.startY - wallHeight + yOffset,
  );
  // The configured wall PNG is one seamless texture, not a frame sheet. Its live image
  // dimensions drive this affine projection onto each vertical isometric face.
  if (sideConfig.mirror) {
    ctx.translate(imageWidth, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(wallImage, 0, 0);
  ctx.restore();

  if (debug) drawTileEdgeWallDebug(ctx, side, anchors, yOffset, sideConfig.debugColor);
}

function drawTileEdgeWallDebug(ctx, side, anchors, yOffset, color = "#ffffff") {
  const startY = anchors.startY + yOffset;
  const endY = anchors.endY + yOffset;
  const midX = Math.round((anchors.startX + anchors.endX) / 2);
  const midY = Math.round((startY + endY) / 2);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(anchors.startX, startY);
  ctx.lineTo(anchors.endX, endY);
  ctx.stroke();
  ctx.font = "bold 10px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(side === "back" ? "B" : "L", midX, midY - 2);
  ctx.restore();
}

export function tileEdgeWallDebugEnabled(config) {
  return Boolean(config?.debug || (typeof window !== "undefined" && window.VALTORIA_DEBUG_WALL_EDGES === true));
}

export function tileEdgeWallCacheKey(wallImage, config, debug = false) {
  const imageWidth = Number(wallImage?.naturalWidth || wallImage?.width) || 0;
  const imageHeight = Number(wallImage?.naturalHeight || wallImage?.height) || 0;
  const sideKey = TILE_EDGE_WALL_SIDE_ORDER.map((side) => {
    const value = config?.sides?.[side] ?? {};
    return `${side}:${value.neighbourDx ?? 0},${value.neighbourDy ?? 0},${value.mirror ? 1 : 0}`;
  }).join("|");
  return [
    config?.enabled ? 1 : 0,
    config?.fileName ?? "",
    config?.overlapPx ?? 0,
    config?.yOffset ?? 0,
    config?.renderHeight ?? "image",
    imageWidth,
    imageHeight,
    debug ? 1 : 0,
    sideKey,
  ].join(":");
}
