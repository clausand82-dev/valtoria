import React, { useEffect, useState } from "react";
import { groundTopDownToIsometricTransform } from "../../game/assets.js";

const GAME_TILE_W = 104;
const GAME_TILE_H = 52;
const imageCache = new Map();
// Runtime bakes decals into the terrain canvas before it depth-sorts foliage
// and other world objects. Keep that pass isolated from sprite-height sorting.
const DEPTH_LAYERS = { terrain: -1, ground: 0, alwaysBehind: 0, dynamic: 1, alwaysFront: 2 };

export function entityAssetId(entry) {
  return entry?.id ?? entry?.decayId ?? entry?.type ?? entry?.npcId ?? null;
}

export function buildCatalogPreviewIndex(catalog) {
  const index = new Map();
  for (const asset of catalog) {
    const variant = Math.max(0, Math.floor(Number(asset.variant) || 0));
    index.set(`${asset.layer}:${asset.id}:${variant}`, asset);
    if (!index.has(`${asset.layer}:${asset.id}`)) index.set(`${asset.layer}:${asset.id}`, asset);
    if (asset.fileName) {
      index.set(`${asset.layer}:file:${asset.fileName}:${variant}`, asset);
      if (!index.has(`${asset.layer}:file:${asset.fileName}`)) index.set(`${asset.layer}:file:${asset.fileName}`, asset);
    }
  }
  return index;
}

export function resolveEntityPreviewAsset(index, layer, entry) {
  const id = entityAssetId(entry);
  const variant = Math.max(0, Math.floor(Number(entry?.variant) || 0));
  if (id) return index.get(`${layer}:${id}:${variant}`) ?? index.get(`${layer}:${id}`) ?? null;
  if (entry?.fileName) return index.get(`${layer}:file:${entry.fileName}:${variant}`) ?? index.get(`${layer}:file:${entry.fileName}`) ?? null;
  return null;
}

export function previewImageKey(asset) {
  if (!asset?.previewUrl) return null;
  if (asset.kind === "ground") return `${asset.previewUrl}|ground:${Math.max(1, Number(asset.rows) || 4)}x${Math.max(1, Number(asset.cols) || 4)}:si${Number(asset.sourceInset) || 0}:ef${Number(asset.edgeFeather) || 0}:ta${Number.isFinite(Number(asset.textureAlpha)) ? Number(asset.textureAlpha) : 1}:vs${Number(asset.visualScale) || 1}`;
  return asset.kind === "foliage"
    ? `${asset.previewUrl}|foliage:${Math.max(1, Number(asset.rows) || 8)}x${Math.max(1, Number(asset.cols) || 8)}`
    : asset.previewUrl;
}

function cropGroundFrame(data, imageWidth, rect) {
  let minX = rect.x + rect.w;
  let minY = rect.y + rect.h;
  let maxX = rect.x;
  let maxY = rect.y;
  for (let y = rect.y; y < rect.y + rect.h; y += 1) {
    for (let x = rect.x; x < rect.x + rect.w; x += 1) {
      if (data[(y * imageWidth + x) * 4 + 3] <= 24) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX <= minX || maxY <= minY) return rect;
  const pad = 2;
  const x = Math.max(rect.x, minX - pad);
  const y = Math.max(rect.y, minY - pad);
  const right = Math.min(rect.x + rect.w, maxX + pad + 1);
  const bottom = Math.min(rect.y + rect.h, maxY + pad + 1);
  return { x, y, w: right - x, h: bottom - y };
}

function smoothstep01(t) {
  const n = Math.max(0, Math.min(1, t));
  return n * n * (3 - 2 * n);
}

function hashNoise(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function lerpNumber(a, b, t) {
  return a + (b - a) * t;
}

function valueNoise2d(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const a = hashNoise(ix, iy);
  const b = hashNoise(ix + 1, iy);
  const c = hashNoise(ix, iy + 1);
  const d = hashNoise(ix + 1, iy + 1);
  const tx = smoothstep01(fx);
  const ty = smoothstep01(fy);
  return lerpNumber(lerpNumber(a, b, tx), lerpNumber(c, d, tx), ty);
}

function groundFrames(image, asset) {
  const source = document.createElement("canvas");
  source.width = image.naturalWidth;
  source.height = image.naturalHeight;
  const sourceCtx = source.getContext("2d", { willReadFrequently: true });
  sourceCtx.drawImage(image, 0, 0);
  const pixels = sourceCtx.getImageData(0, 0, source.width, source.height).data;
  const rows = Math.max(1, Number(asset.rows) || 4);
  const cols = Math.max(1, Number(asset.cols) || 4);
  const sourceInset = Number(asset.sourceInset) || 0;
  const edgeFeather = Number(asset.edgeFeather) || 0;
  const textureAlpha = Number.isFinite(Number(asset.textureAlpha)) ? Number(asset.textureAlpha) : 1;
  const visualScale = Number(asset.visualScale) || 1;
  const destW = (GAME_TILE_W + 2) * visualScale;
  const destH = (GAME_TILE_H + 2) * visualScale;
  const width = Math.ceil(destW);
  const height = Math.ceil(destH);
  const frames = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const cellX = Math.round(col * source.width / cols);
      const cellY = Math.round(row * source.height / rows);
      const right = Math.round((col + 1) * source.width / cols);
      const bottom = Math.round((row + 1) * source.height / rows);
      const index = row * cols + col;
      const frame = cropGroundFrame(pixels, source.width, { x: cellX, y: cellY, w: right - cellX, h: bottom - cellY });
      const insetX = Math.floor(frame.w * sourceInset);
      const insetY = Math.floor(frame.h * sourceInset);
      const sourceX = frame.x + insetX;
      const sourceY = frame.y + insetY;
      const sourceW = Math.max(1, frame.w - insetX * 2);
      const sourceH = Math.max(1, frame.h - insetY * 2);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      const transform = groundTopDownToIsometricTransform(sourceW, sourceH, width, height);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.transform(transform.a, transform.b, transform.c, transform.d, transform.e, transform.f);
      ctx.drawImage(source, sourceX, sourceY, sourceW, sourceH, -sourceW / 2, -sourceH / 2, sourceW, sourceH);
      ctx.restore();
      if (edgeFeather > 0 || textureAlpha < 1) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const halfW = width / 2;
        const halfH = height / 2;
        const seed = (index + 1) * 12.9898;
        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            const i = (y * width + x) * 4;
            const nx = Math.abs((x + 0.5 - halfW) / halfW);
            const ny = Math.abs((y + 0.5 - halfH) / halfH);
            const diamondDistance = 1 - nx - ny;
            if (diamondDistance <= 0) {
              data[i + 3] = 0;
              continue;
            }
            const noise = valueNoise2d(x * 0.16 + seed, y * 0.18 - seed) * 0.16 - 0.08;
            const edge = smoothstep01((diamondDistance + noise) / Math.max(0.001, edgeFeather));
            data[i + 3] = Math.floor(data[i + 3] * textureAlpha * Math.max(0, Math.min(1, edge)));
          }
        }
        ctx.putImageData(imageData, 0, 0);
      }
      frames.push({ url: canvas.toDataURL(), width, height, destW, destH });
    }
  }
  return frames;
}

function foliageFrames(image, rows, cols) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const frames = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const cellX = Math.round(col * canvas.width / cols);
      const cellY = Math.round(row * canvas.height / rows);
      const right = Math.round((col + 1) * canvas.width / cols);
      const bottom = Math.round((row + 1) * canvas.height / rows);
      const cellW = right - cellX;
      const cellH = bottom - cellY;
      let minX = right; let minY = bottom; let maxX = -1; let maxY = -1; let count = 0;
      for (let y = cellY; y < bottom; y += 1) for (let x = cellX; x < right; x += 1) {
        if (pixels[(y * canvas.width + x) * 4 + 3] <= 45) continue;
        count += 1;
        minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
      const width = maxX - minX + 1;
      const height = maxY - minY + 1;
      // Mirrors makeFoliageSheet's usable-cell thresholds. Runtime compacts this
      // list, so editor variant N must address usable frame N rather than raw cell N.
      if (count < 80 || width < cellW * 0.08 || height < cellH * 0.06) continue;
      const pad = 5;
      const x = Math.max(cellX, minX - pad);
      const y = Math.max(cellY, minY - pad);
      frames.push({ x, y, w: Math.min(right, maxX + pad + 1) - x, h: Math.min(bottom, maxY + pad + 1) - y });
    }
  }
  return frames;
}

function ensurePreviewImage(asset, notify) {
  const key = previewImageKey(asset);
  if (!key || typeof Image === "undefined") return null;
  const existing = imageCache.get(key);
  if (existing) {
    existing.listeners?.add(notify);
    return existing;
  }
  const entry = { status: "loading", listeners: new Set([notify]) };
  imageCache.set(key, entry);
  const image = new Image();
  image.onload = () => {
    entry.status = "loaded";
    entry.width = image.naturalWidth;
    entry.height = image.naturalHeight;
    entry.url = image.src;
    if (asset.kind === "ground") entry.groundFrames = groundFrames(image, asset);
    if (asset.kind === "foliage") entry.frames = foliageFrames(image, Math.max(1, Number(asset.rows) || 8), Math.max(1, Number(asset.cols) || 8));
    for (const listener of entry.listeners) listener();
  };
  image.onerror = () => {
    if (asset.fallbackPreviewUrl && image.src !== new URL(asset.fallbackPreviewUrl, window.location.href).href) {
      image.src = asset.fallbackPreviewUrl;
      return;
    }
    entry.status = "error";
    for (const listener of entry.listeners) listener();
  };
  image.src = asset.previewUrl;
  return entry;
}

export function useEditorPreviewImages(assets) {
  const [, setVersion] = useState(0);
  const unique = [...new Map(assets.filter((asset) => asset?.previewUrl).map((asset) => [previewImageKey(asset), asset])).values()];
  const key = unique.map(previewImageKey).sort().join("|");
  useEffect(() => {
    const notify = () => setVersion((version) => version + 1);
    for (const asset of unique) ensurePreviewImage(asset, notify);
    return () => {
      for (const asset of unique) imageCache.get(previewImageKey(asset))?.listeners?.delete(notify);
    };
  }, [key]);
  return imageCache;
}

export function previewImageState(imageState, asset) {
  return asset ? imageState.get(previewImageKey(asset)) : null;
}

export function previewSourceFrame(asset, image) {
  if (!asset || !image) return null;
  const variant = Math.max(0, Math.floor(Number(asset.sourceVariant ?? asset.variant) || 0));
  if (asset.kind === "foliage" && image.frames?.length) return image.frames[variant % image.frames.length];
  const rows = Math.max(1, Number(asset.rows) || 1);
  const cols = Math.max(1, Number(asset.cols) || 1);
  const col = variant % cols;
  const row = Math.floor(variant / cols) % rows;
  const x = Math.round(col * image.width / cols);
  const y = Math.round(row * image.height / rows);
  return { x, y, w: Math.round((col + 1) * image.width / cols) - x, h: Math.round((row + 1) * image.height / rows) - y };
}

export function GroundTilePreview({ asset, imageState, x, y, tileW, tileH }) {
  const loaded = previewImageState(imageState, asset);
  const frames = loaded?.status === "loaded" ? loaded.groundFrames : null;
  if (!frames?.length) return null;
  const variant = Math.max(0, Math.floor(Number(asset.sourceVariant ?? asset.variant) || 0));
  const frame = frames[variant % frames.length];
  const runtimeRatio = tileW / GAME_TILE_W;
  const width = frame.destW * runtimeRatio;
  const height = frame.destH * runtimeRatio;
  return <image className="area-editor-ground-preview" href={frame.url} x={x - width / 2} y={y + tileH / 2 - height / 2} width={width} height={height} preserveAspectRatio="none" pointerEvents="none" />;
}

export function WaterTilePreview({ asset, imageState, x, y, tileW, tileH, clipId }) {
  const loaded = previewImageState(imageState, asset);
  if (loaded?.status !== "loaded") return null;
  const frame = previewSourceFrame(asset, loaded);
  if (!frame) return null;
  const points = `0,0 ${tileW / 2},${tileH / 2} 0,${tileH} ${-tileW / 2},${tileH / 2}`;
  return <svg className="area-editor-water-preview" x={x} y={y} width={tileW} height={tileH} viewBox={`${-tileW / 2} 0 ${tileW} ${tileH}`} overflow="visible" pointerEvents="none">
    <defs><clipPath id={clipId} clipPathUnits="userSpaceOnUse"><polygon points={points} /></clipPath></defs>
    <g clipPath={`url(#${clipId})`}>
      <svg x={-tileW / 2} y="0" width={tileW} height={tileH} viewBox={`${frame.x} ${frame.y} ${frame.w} ${frame.h}`} preserveAspectRatio="none" overflow="hidden">
        <image href={loaded.url ?? asset.previewUrl} x="0" y="0" width={loaded.width} height={loaded.height} preserveAspectRatio="none" />
      </svg>
    </g>
  </svg>;
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function finiteNumber(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function decalProjection(asset, entry = {}) {
  return String(entry.projection ?? entry.sourceProjection ?? asset.projection ?? asset.sourceProjection ?? "topdown").trim().toLowerCase() === "iso"
    ? "iso"
    : "topdown";
}

function decalBlendMode(asset, entry = {}) {
  const mode = String(entry.blendMode ?? entry.compositeOperation ?? asset.blendMode ?? asset.compositeOperation ?? "source-over").trim().toLowerCase();
  return mode === "lighter" ? "plus-lighter" : mode === "source-over" ? "normal" : mode;
}

function decalOpacity(asset, entry = {}, projection = decalProjection(asset, entry)) {
  const configured = Number.isFinite(Number(entry.alpha)) ? Number(entry.alpha) : Number(asset.alpha);
  const runtimeDefault = projection === "iso" ? 1 : 0.42;
  return Math.max(0.08, Math.min(projection === "iso" ? 1 : 0.85, Number.isFinite(configured) ? configured : runtimeDefault));
}

export function previewGeometry(asset, image, tileW, tileH, entry = {}) {
  if (!asset || !image) return null;
  const runtimeRatio = tileW / GAME_TILE_W;
  if (asset.kind === "decal") {
    const size = positiveNumber(entry.size, 0.9);
    const renderScale = positiveNumber(entry.renderScale ?? entry.decayRenderScale, Number(asset.renderScale) || 1);
    const projection = decalProjection(asset, entry);
    const widthScale = finiteNumber(entry.decayWidthScale ?? entry.widthScale, finiteNumber(asset.widthScale, 1));
    const heightScale = finiteNumber(entry.decayHeightScale ?? entry.heightScale, finiteNumber(asset.heightScale, 1));
    // Runtime clamps at 8x4 in canonical 104x52 coordinates, then the editor
    // scales that complete footprint with its independent zoom.
    const runtimeWidth = Math.max(8, GAME_TILE_W * size * renderScale * widthScale);
    const runtimeHeight = Math.max(4, (projection === "iso" ? GAME_TILE_W : GAME_TILE_H) * size * renderScale * heightScale);
    return {
      projection, width: runtimeWidth * runtimeRatio, height: runtimeHeight * runtimeRatio,
      anchorX: finiteNumber(entry.decayAnchorX ?? entry.anchorX, finiteNumber(asset.anchorX, 0.5)),
      anchorY: finiteNumber(entry.decayAnchorY ?? entry.anchorY, finiteNumber(asset.anchorY, 0.5)),
      offsetX: finiteNumber(entry.decayOffsetX ?? entry.offsetX, finiteNumber(asset.offsetX, 0)) * runtimeRatio,
      offsetY: finiteNumber(entry.decayOffsetY ?? entry.offsetY, finiteNumber(asset.offsetY, 0)) * runtimeRatio,
    };
  }
  const frame = previewSourceFrame(asset, image);
  if (!frame) return null;
  if (asset.previewHeight) {
    const height = Number(asset.previewHeight) * runtimeRatio;
    return { width: height * frame.w / frame.h, height, anchorX: 0.5, anchorY: Number(asset.anchorY) || 1, offsetX: 0, offsetY: (Number(asset.offsetY) || 0) * runtimeRatio };
  }
  let entityScale = 1;
  if (asset.kind === "foliage") {
    const fixedScale = positiveNumber(entry.scale, null);
    const size = fixedScale ?? positiveNumber(entry.size, 0.72);
    const visualScale = fixedScale ? 1 : positiveNumber(entry.visualScale, 1);
    entityScale = size * visualScale;
  } else if (asset.kind === "object") {
    entityScale = positiveNumber(entry.size, Number(asset.runtimeDefaultSize) || 1) * positiveNumber(entry.visualScale, 1);
  } else if (asset.kind === "chest") {
    entityScale = positiveNumber(entry.size, 1) * positiveNumber(entry.visualScale, 1);
  } else if (asset.kind === "monster") {
    entityScale = positiveNumber(entry.visualScale, 1);
  }
  const runtimeSpriteScale = (Number(asset.previewScale) || 1) * entityScale;
  const scale = runtimeSpriteScale * runtimeRatio;
  const runtimeOffsetY = ["object", "chest"].includes(asset.kind)
    ? 12 + 24 * runtimeSpriteScale
    : Number(asset.offsetY) || 0;
  return { width: frame.w * scale, height: frame.h * scale, anchorX: Number(asset.anchorX) || 0.5, anchorY: Number(asset.anchorY) || 1, offsetX: 0, offsetY: runtimeOffsetY * runtimeRatio };
}

export function previewDepth(asset, entry, baseY, geometry) {
  const layer = DEPTH_LAYERS[entry?.depthMode ?? asset?.depthMode] ?? 1;
  const sortAnchor = Number(entry?.sortAnchor?.y ?? asset?.sortAnchor?.y);
  const anchorY = Number.isFinite(sortAnchor) ? sortAnchor : 1;
  const top = baseY + (geometry?.offsetY ?? 0) - (geometry?.height ?? 0) * (geometry?.anchorY ?? 1);
  return { layer, value: top + (geometry?.height ?? 0) * anchorY + (Number(entry?.depthOffset ?? asset?.depthOffset) || 0) };
}

export function SvgSpriteFrame({ asset, image, x, y, width, height, opacity = 1, transform, className, clipPath }) {
  const frame = previewSourceFrame(asset, image);
  if (frame) return <svg className={className} x={x} y={y} width={width} height={height} viewBox={`${frame.x} ${frame.y} ${frame.w} ${frame.h}`} preserveAspectRatio="none" opacity={opacity} transform={transform} clipPath={clipPath} overflow="hidden">
    <image href={image.url ?? asset.previewUrl} x="0" y="0" width={image.width} height={image.height} preserveAspectRatio="none" />
  </svg>;
  const rows = Math.max(1, Number(asset?.rows) || 1);
  const cols = Math.max(1, Number(asset?.cols) || 1);
  const variant = Math.max(0, Number(asset?.sourceVariant ?? asset?.variant) || 0);
  return <svg className={className} x={x} y={y} width={width} height={height} viewBox={`${variant % cols} ${Math.floor(variant / cols) % rows} 1 1`} preserveAspectRatio="none" opacity={opacity} transform={transform} clipPath={clipPath} overflow="hidden">
    <image href={asset.previewUrl} x="0" y="0" width={cols} height={rows} preserveAspectRatio="none" />
  </svg>;
}

export function ProjectedSpriteFrame({ asset, image, x, y, width, height, opacity = 1, transform, style }) {
  const frame = previewSourceFrame(asset, image);
  const rows = Math.max(1, Number(asset?.rows) || 1);
  const cols = Math.max(1, Number(asset?.cols) || 1);
  const variant = Math.max(0, Number(asset?.sourceVariant ?? asset?.variant) || 0);
  const sourceFrame = frame ?? { x: variant % cols, y: Math.floor(variant / cols) % rows, w: 1, h: 1 };
  const imageW = frame ? image.width : cols;
  const imageH = frame ? image.height : rows;
  const projection = groundTopDownToIsometricTransform(sourceFrame.w, sourceFrame.h, width, height);
  return <g transform={transform} opacity={opacity} style={style}><svg x={x} y={y} width={width} height={height} viewBox={`0 0 ${width} ${height}`} overflow="visible">
    <g transform={`matrix(${projection.a} ${projection.b} ${projection.c} ${projection.d} ${projection.e} ${projection.f})`}>
      <svg x={-sourceFrame.w / 2} y={-sourceFrame.h / 2} width={sourceFrame.w} height={sourceFrame.h} viewBox={`${sourceFrame.x} ${sourceFrame.y} ${sourceFrame.w} ${sourceFrame.h}`} preserveAspectRatio="none" overflow="hidden">
        <image href={image?.url ?? asset.previewUrl} x="0" y="0" width={imageW} height={imageH} preserveAspectRatio="none" />
      </svg>
    </g>
  </svg></g>;
}

function FallbackMarker({ layer, x, y, selected, label }) {
  const colors = { decals: "#9f6f5f", foliage: "#5ea66f", objects: "#d49b56", monsters: "#c75c65", npcs: "#65a7d8", chests: "#e3c45f" };
  return <g className="area-editor-preview-fallback"><circle cx={x} cy={y} r={selected ? 16 : 12} fill={colors[layer] ?? "#899"} stroke={selected ? "#fff2a8" : "#0a0d0e"} strokeWidth={selected ? 4 : 2} /><text x={x} y={y + 4} textAnchor="middle" fill="#fff" fontSize="9" fontWeight="800">{label}</text></g>;
}

export function EditorEntityPreview({ asset, entry, layer, baseX, baseY, tileW, tileH, selected, imageState, previewKey }) {
  const loaded = previewImageState(imageState, asset);
  if (loaded?.status !== "loaded") return <FallbackMarker layer={layer} x={baseX} y={baseY} selected={selected} label={layer.slice(0, 1).toUpperCase()} />;
  const geometry = previewGeometry(asset, loaded, tileW, tileH, entry);
  if (!geometry) return <FallbackMarker layer={layer} x={baseX} y={baseY} selected={selected} label={layer.slice(0, 1).toUpperCase()} />;
  const x = baseX + geometry.offsetX - geometry.width * geometry.anchorX;
  const y = baseY + geometry.offsetY - geometry.height * geometry.anchorY;
  const rotation = finiteNumber(entry?.rotation, finiteNumber(asset?.rotation, 0)) * 180 / Math.PI;
  const transform = `${entry?.flip ? `translate(${2 * (baseX + geometry.offsetX)} 0) scale(-1 1)` : ""}${rotation ? ` rotate(${rotation} ${baseX + geometry.offsetX} ${baseY + geometry.offsetY})` : ""}`.trim() || undefined;
  const projection = asset.kind === "decal" ? geometry.projection : null;
  const opacity = asset.kind === "decal"
    ? decalOpacity(asset, entry, projection)
    : Number.isFinite(Number(entry?.alpha)) ? Number(entry.alpha) : Number.isFinite(Number(asset.alpha)) ? Number(asset.alpha) : 1;
  const blendStyle = asset.kind === "decal" ? { mixBlendMode: decalBlendMode(asset, entry) } : undefined;
  return <g className={`area-editor-entity-preview area-editor-entity-preview-${layer}`} data-preview-key={previewKey} pointerEvents="none">
    {asset.kind !== "decal" && <ellipse cx={baseX} cy={baseY + Math.max(2, tileW * 5 / 64)} rx={Math.max(5, Math.min(geometry.width * 0.2, tileW * 0.375))} ry={Math.max(2, Math.min(geometry.width * 0.06, tileH * 0.25))} fill="rgba(0,0,0,0.28)" />}
    {asset.kind === "decal" && projection !== "iso"
      ? <ProjectedSpriteFrame asset={asset} image={loaded} x={x} y={y} width={geometry.width} height={geometry.height} opacity={opacity} transform={transform} style={blendStyle} />
      : <g style={blendStyle}><SvgSpriteFrame asset={asset} image={loaded} x={x} y={y} width={geometry.width} height={geometry.height} opacity={opacity} transform={transform} /></g>}
    {selected && <ellipse cx={baseX} cy={baseY} rx={Math.max(16, tileW * 0.28)} ry={Math.max(8, tileH * 0.28)} fill="none" stroke="#fff2a8" strokeWidth={3} />}
  </g>;
}

export function AssetCatalog({ assets, selectedKey, onSelect }) {
  const imageState = useEditorPreviewImages(assets);
  return <div className="area-editor-catalog">{assets.map((asset) => {
    const loaded = previewImageState(imageState, asset);
    const frame = loaded?.status === "loaded" ? previewSourceFrame(asset, loaded) : null;
    return <button type="button" key={asset.key} className={selectedKey === asset.key ? "active" : ""} onClick={() => onSelect(asset)}>
      {frame ? <span className="area-editor-frame-preview"><svg viewBox={`${frame.x} ${frame.y} ${frame.w} ${frame.h}`} preserveAspectRatio="xMidYMid meet"><image href={loaded.url ?? asset.previewUrl} x="0" y="0" width={loaded.width} height={loaded.height} /></svg></span> : <span className="area-editor-frame-preview">?</span>}
      <small>{asset.label}</small><em>{asset.variantCount} variant{asset.variantCount === 1 ? "" : "s"}</em>
    </button>;
  })}</div>;
}
