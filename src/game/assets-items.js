import { drawAtlasFrame, drawShadow } from "./assets-ground.js";

const customItemImageCache = new Map();

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
};

export function drawLoot(ctx, screen, loot, atlas) {
  if (loot.type === "gold") {
    drawAtlasFrame(ctx, atlas, "gold", screen.x, screen.y + Math.sin(loot.bob) * 4 + 4, {
      scale: 0.28,
    });
    return;
  }

  if (drawItemLoot(ctx, screen, loot, atlas)) return;
  drawAtlasFrame(ctx, atlas, "gem", screen.x, screen.y + Math.sin(loot.bob) * 4 + 4, {
    scale: 0.24,
  });
}

function drawItemLoot(ctx, screen, loot, atlas) {
  const customImage = getCustomItemImage(loot.item?.iconUrl);
  const useArmorSheet = Object.hasOwn(ARMOR_FRAME_BY_BASE, loot.item?.baseName);
  const cells = (useArmorSheet ? atlas?.armorSheet : atlas?.itemSheet)?.cells;
  if (!customImage && (!cells?.length || !loot.item)) return false;
  const index = useArmorSheet
    ? ARMOR_FRAME_BY_BASE[loot.item.baseName]
    : ITEM_FRAME_BY_BASE[loot.item.baseName] ?? (loot.item.slot === "ring" ? 6 : loot.item.slot === "weapon" ? 0 : 11);
  const cell = cells[Math.abs(index) % cells.length];
  const sprite = customImage ?? cell?.sprite;
  if (!sprite) return false;

  const bob = Math.sin(loot.bob) * 3;
  const scale = loot.item.slot === "weapon" ? 0.18 : 0.16;
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
  if (cached) return null;

  const image = new Image();
  image.onload = () => {
    const entry = customItemImageCache.get(iconUrl);
    if (entry) entry.loaded = true;
  };
  image.onerror = () => {
    customItemImageCache.delete(iconUrl);
  };
  image.src = iconUrl;
  customItemImageCache.set(iconUrl, { image, loaded: false });
  return null;
}

export function drawProjectile(ctx, screen, projectile, atlas) {
  const projectileFrame = projectile.type === "magic" || projectile.type === "burst" ? "orb" : "arrow";
  drawAtlasFrame(ctx, atlas, projectileFrame, screen.x, screen.y - 8, {
    scale: projectileFrame === "orb" ? 0.18 : 0.16,
  });
}
