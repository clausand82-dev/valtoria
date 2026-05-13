import React, { useEffect, useRef } from "react";
import { ATLAS_FRAMES } from "../../game/assets.js";
import { deriveIconKey, iconUrlFromKey } from "../../game/item-system.js";

export const QUICKBAR_HEALTH_POTION_ICON_URL = iconUrlFromKey(deriveIconKey({ mode: "potion", potionType: "health" }));
export const QUICKBAR_MANA_POTION_ICON_URL = iconUrlFromKey(deriveIconKey({ mode: "potion", potionType: "mana" }));
export const QUICKBAR_ATTACK_ICON_URL = iconUrlFromKey("common_sword");
export const QUICKBAR_CITY_ICON_URL = "/assets/generated/icon_city.png";
export const QUICKBAR_WILDERNESS_ICON_URL = "/assets/generated/icon_wilderness.png";
export const QUICKBAR_QUEST_ICON_URL = "/assets/generated/item/item_res_scroll.png";
export const ITEM_STANDARD_ICON_URL = "/assets/generated/item/item_standard.png";
export const ITEM_GOLD_ICON_URL = "/assets/generated/item/item_gold.png";
export const ITEM_MONEY_ICON_URL = "/assets/generated/item/item_gold.png";

const iconSheetPromises = new Map();

export function InventoryIcon({ iconIndex, iconSheet = "items", iconUrl = null }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const itemFallbackSource = ITEM_STANDARD_ICON_URL;
    const fallbackSource = (
      iconSheet === "armor"
        ? "/assets/generated/armor001_sheet.png"
        : iconSheet === "resources"
          ? "/assets/generated/res_sheet_001.png"
          : iconSheet === "gemstones"
            ? "/assets/generated/res_sheet_002.png"
          : "/assets/generated/items001_sheet.png"
    );
    const iconFallbackSource = itemFallbackSource;

    const source = iconUrl || fallbackSource;
    if (!iconSheetPromises.has(source)) {
      iconSheetPromises.set(source, new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = source;
      }));
    }

    if (!iconSheetPromises.has(iconFallbackSource)) {
      iconSheetPromises.set(iconFallbackSource, new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = iconFallbackSource;
      }));
    }

    iconSheetPromises.get(source).then((image) => {
      if (cancelled || !canvasRef.current) return;
      if (iconUrl) {
        drawCustomInventoryIcon(canvasRef.current, image);
      } else {
        drawInventoryIcon(canvasRef.current, image, iconIndex, iconSheet);
      }
    }).catch(() => {
      iconSheetPromises.get(iconFallbackSource)?.then((image) => {
        if (cancelled || !canvasRef.current) return;
        drawCustomInventoryIcon(canvasRef.current, image);
      }).catch(() => {});
    });

    return () => {
      cancelled = true;
    };
  }, [iconIndex, iconSheet, iconUrl]);

  return <canvas ref={canvasRef} className="inventory-icon" width="52" height="52" aria-hidden="true" />;
}

export function ImageIcon({ src }) {
  return <img className="hud-image-icon" src={src} alt="" />;
}

export function AtlasIcon({ frameName }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled || !canvasRef.current) return;
      const frame = ATLAS_FRAMES[frameName];
      if (!frame) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const temp = document.createElement("canvas");
      temp.width = frame.w;
      temp.height = frame.h;
      const tctx = temp.getContext("2d", { willReadFrequently: true });
      tctx.drawImage(image, frame.x, frame.y, frame.w, frame.h, 0, 0, frame.w, frame.h);
      const imageData = tctx.getImageData(0, 0, temp.width, temp.height);
      const { data } = imageData;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (g > 135 && g > r * 1.45 && g > b * 1.35) data[i + 3] = 0;
      }
      tctx.putImageData(imageData, 0, 0);
      const bounds = expandBounds(alphaBoundsFromCanvas(temp), temp.width, temp.height, frameName === "orb" ? 18 : 3);
      const scale = Math.min((canvas.width - 6) / bounds.w, (canvas.height - 6) / bounds.h, frameName === "orb" ? 0.34 : Infinity);
      const width = bounds.w * scale;
      const height = bounds.h * scale;
      ctx.drawImage(temp, bounds.x, bounds.y, bounds.w, bounds.h, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
    };
    image.src = "/assets/generated/runebound-atlas-source.png";
    return () => {
      cancelled = true;
    };
  }, [frameName]);
  return <canvas ref={canvasRef} className="inventory-icon" width="52" height="52" aria-hidden="true" />;
}

function alphaBoundsFromCanvas(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      if (data[(y * canvas.width + x) * 4 + 3] <= 20) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX <= minX || maxY <= minY) return { x: 0, y: 0, w: canvas.width, h: canvas.height };
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function expandBounds(bounds, maxW, maxH, pad) {
  const x = Math.max(0, bounds.x - pad);
  const y = Math.max(0, bounds.y - pad);
  const right = Math.min(maxW, bounds.x + bounds.w + pad);
  const bottom = Math.min(maxH, bounds.y + bounds.h + pad);
  return { x, y, w: right - x, h: bottom - y };
}

function drawCustomInventoryIcon(canvas, image) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const scale = Math.min((canvas.width - 8) / image.naturalWidth, (canvas.height - 8) / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
}

function drawInventoryIcon(canvas, image, iconIndex, iconSheet = "items") {
  const ctx = canvas.getContext("2d");
  const cols = 4;
  const rows = 3;
  const col = Math.abs(iconIndex ?? 0) % cols;
  const row = Math.floor(Math.abs(iconIndex ?? 0) / cols) % rows;
  const sx = Math.round((col * image.naturalWidth) / cols);
  const sy = Math.round((row * image.naturalHeight) / rows);
  const nextX = Math.round(((col + 1) * image.naturalWidth) / cols);
  const nextY = Math.round(((row + 1) * image.naturalHeight) / rows);
  const cellW = nextX - sx;
  const cellH = nextY - sy;

  const temp = document.createElement("canvas");
  temp.width = cellW;
  temp.height = cellH;
  const tctx = temp.getContext("2d", { willReadFrequently: true });
  tctx.drawImage(image, sx, sy, cellW, cellH, 0, 0, cellW, cellH);
  const imageData = tctx.getImageData(0, 0, cellW, cellH);
  const data = imageData.data;
  let minX = cellW;
  let minY = cellH;
  let maxX = 0;
  let maxY = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (g > 145 && g > r * 1.55 && g > b * 1.55) data[i + 3] = 0;
    if (data[i + 3] > 45) {
      const p = i / 4;
      const x = p % cellW;
      const y = Math.floor(p / cellW);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  tctx.putImageData(imageData, 0, 0);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (maxX <= minX || maxY <= minY) return;
  const sourceW = maxX - minX + 1;
  const sourceH = maxY - minY + 1;
  const scale = Math.min((canvas.width - 8) / sourceW, (canvas.height - 8) / sourceH);
  const width = sourceW * scale;
  const height = sourceH * scale;
  ctx.drawImage(temp, minX, minY, sourceW, sourceH, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
}
