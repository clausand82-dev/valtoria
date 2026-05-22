import {
  CHUNK_SIZE,
  TILE_H,
  TILE_W,
  MONSTER_SHEETS,
  drawGroundTile,
  drawHero,
  drawMonster,
  drawFoliageObject,
  drawOverlayObject,
  drawObject,
  drawLoot,
  drawProjectile,
  chunkCoords,
  clamp,
  getRegionObjectFamily,
  FOG_OF_WAR_CONFIG,
  visibleScreenPoint,
  worldToScreen,
  monsterSpriteId,
  TERRAIN_LAYER_PAD_TOP,
  TERRAIN_LAYER_PAD_BOTTOM
} from "../dependencies.js";

const TERRAIN_GROUND_COLOR = "#3f6f34";
const TERRAIN_WATER_COLOR = "#1f5f7f";
const TERRAIN_PATH_COLOR = "rgba(112, 86, 48, 0.24)";
import {
  drawRegionMarkerIfInChunk,
  drawQuestgiver,
  isDestructibleObject,
  drawTerrainDecal
} from "../helpers.js";

const DEFAULT_SORT_ANCHOR = { x: 0.5, y: 1 };

function clampSortAnchor(anchor) {
  if (!anchor || typeof anchor !== "object") return DEFAULT_SORT_ANCHOR;
  const x = Number(anchor.x);
  const y = Number(anchor.y);
  return {
    x: Number.isFinite(x) ? clamp(x, 0, 1) : DEFAULT_SORT_ANCHOR.x,
    y: Number.isFinite(y) ? clamp(y, 0, 1) : DEFAULT_SORT_ANCHOR.y,
  };
}

function getRenderableLayer(depthMode, fallback = 1) {
  switch (depthMode) {
    case "ground":
    case "alwaysBehind":
      return 0;
    case "alwaysFront":
      return 2;
    case "dynamic":
      return 1;
    default:
      return fallback;
  }
}

function getSheetObjectBaseScale(type) {
  return type === "building" ? 0.58
    : type === "ruin" ? 0.54
      : type === "crystal" ? 0.46
        : type === "chest" ? 0.28
          : type === "firebeacon" ? 0.44
            : 0.4;
}

function getObjectSheet(atlas, object, biome) {
  const sheetsByBiome = atlas?.objectSheets?.[object.type];
  return sheetsByBiome?.[biome?.id]
    ?? sheetsByBiome?.default
    ?? sheetsByBiome?.mainland
    ?? null;
}

function getObjectSortOffsetY(object, biome, atlas) {
  const anchor = clampSortAnchor(object.sortAnchor);
  const depthOffset = Number.isFinite(Number(object.depthOffset)) ? Number(object.depthOffset) : 0;

  if (object.type === "foliage") {
    const sheetId = object.foliageSheet ?? biome?.id ?? "mainland";
    const sheet = atlas?.foliageSheet?.sheets?.[sheetId]
      ?? atlas?.foliageSheet?.sheets?.mainland
      ?? atlas?.foliageSheet;
    const cells = sheet?.cells;
    const cell = cells?.[Math.abs(Math.floor(object.foliageVariant ?? object.treeVariant ?? 0)) % cells.length];
    const sprite = cell?.sprite;
    if (sprite) {
      const scale = 0.38 * object.size * (object.visualScale ?? 1) * (Number(sheet?.renderScale) || 1);
      const height = sprite.height * scale;
      return 12 - height * 0.74 + height * anchor.y + depthOffset;
    }
    return depthOffset;
  }

  const sheet = getObjectSheet(atlas, object, biome);
  const cells = sheet?.cells;
  const cell = cells?.[Math.abs(Math.floor(object.treeVariant ?? 0)) % cells.length] ?? cells?.[0];
  const sprite = cell?.sprite;
  if (sprite) {
    const scale = getSheetObjectBaseScale(object.type) * object.size * (object.visualScale ?? 1) * (sheet.renderScale ?? 1);
    const height = sprite.height * scale;
    const frameOffset = sheet.frameOffsets?.[Math.abs(Math.floor(object.treeVariant ?? 0)) % cells.length] ?? { y: 0 };
    return 12 - height + 24 * scale + frameOffset.y * scale + height * anchor.y + depthOffset;
  }

  if (getRegionObjectFamily(object.type) === "tree") {
    return 14 + depthOffset;
  }
  return depthOffset;
}

function getObjectDepth(object, screen, biome, atlas) {
  return screen.y + getObjectSortOffsetY(object, biome, atlas);
}

function getMonsterFootOffset(monster) {
  const spriteId = monsterSpriteId(monster?.typeName);
  const cfg = MONSTER_SHEETS.find((entry) => entry.id === spriteId);
  return Number.isFinite(Number(cfg?.yOffset)) ? Number(cfg.yOffset) : 38;
}

function getActorDepth(actor, screen, kind) {
  const explicitOffset = Number(actor?.footOffsetY);
  if (Number.isFinite(explicitOffset)) return screen.y + explicitOffset;
  if (kind === "hero") return screen.y + 30;
  if (kind === "questgiver") return screen.y + 16;
  return screen.y + getMonsterFootOffset(actor);
}

function getRenderableDepth(renderable, atlas) {
  if (renderable.type === "object") return getObjectDepth(renderable.object, renderable.screen, renderable.biome, atlas);
  if (renderable.type === "monster") return getActorDepth(renderable.monster, renderable.screen, "monster");
  if (renderable.type === "hero") return getActorDepth(renderable.actor, renderable.screen, "hero");
  if (renderable.type === "questgiver") return getActorDepth(renderable.questgiver, renderable.screen, "questgiver");
  return renderable.screen?.y ?? 0;
}

function getTypeSortOrder(type) {
  switch (type) {
    case "loot": return 0;
    case "object": return 1;
    case "questgiver": return 2;
    case "monster": return 3;
    case "hero": return 4;
    case "projectile": return 5;
    default: return 9;
  }
}

function foregroundFadeTarget(renderable) {
  return renderable.type === "hero"
    || renderable.type === "monster"
    || renderable.type === "loot"
    || renderable.type === "questgiver";
}

function foregroundFadeAlpha(renderable, drawables) {
  const object = renderable.object;
  if (!object?.foregroundFade) return 1;
  const objectDepth = Number(renderable.depth);
  if (!Number.isFinite(objectDepth)) return 1;
  const visualScale = Math.max(0.5, (Number(object.size) || 1) * (Number(object.visualScale) || 1));
  const rangeX = Math.max(72, Math.min(460, 58 + visualScale * 42));
  const rangeY = Math.max(120, Math.min(760, 96 + visualScale * 68));
  const minAlpha = Number.isFinite(Number(object.foregroundFadeAlpha))
    ? clamp(Number(object.foregroundFadeAlpha), 0.1, 1)
    : 0.42;
  let alpha = 1;

  for (const target of drawables) {
    if (!foregroundFadeTarget(target)) continue;
    if (target.layer !== renderable.layer) continue;
    if (!Number.isFinite(Number(target.depth)) || target.depth >= objectDepth) continue;
    const dx = Math.abs((target.screen?.x ?? 0) - (renderable.screen?.x ?? 0));
    const dy = Math.abs((target.screen?.y ?? 0) - (renderable.screen?.y ?? 0));
    if (dx > rangeX || dy > rangeY) continue;
    const edge = Math.max(dx / rangeX, dy / rangeY);
    const targetAlpha = minAlpha + (1 - minAlpha) * clamp(edge, 0, 1);
    alpha = Math.min(alpha, targetAlpha);
  }

  return alpha;
}

function colorWithAlpha(color, alpha) {
  const value = String(color ?? "").trim();
  const a = clamp(Number(alpha), 0, 1);
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = Number.parseInt(hex[1], 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }
  const rgb = value.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const parts = rgb[1].split(",").map((part) => Number.parseFloat(part.trim()));
    if (parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite)) return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${a})`;
  }
  return `rgba(135, 214, 90, ${a})`;
}

export const renderingMethods = {
  get assetsReady() {
    return this.atlas !== null && this.animationSheets !== null;
  },

  get fogOfWarActive() {
    return Boolean(FOG_OF_WAR_CONFIG.enabled && this.activeMapRegion && this.region?.mapRegion);
  },

  fogTileKey(x, y) {
    return `${Math.floor(x)},${Math.floor(y)}`;
  },

  updateFogOfWar(force = false) {
    if (!this.fogOfWarActive) {
      if (this.fogVisibleTiles?.size) this.fogVisibleTiles.clear();
      return;
    }
    const px = Math.floor(this.player.x);
    const py = Math.floor(this.player.y);
    const regionId = this.region?.id ?? this.region?.mapRegion?.id ?? "";
    if (
      !force
      && this.fogLastReveal?.x === px
      && this.fogLastReveal?.y === py
      && this.fogLastReveal?.regionId === regionId
    ) return;

    const revealRadius = Math.max(1, Number(FOG_OF_WAR_CONFIG.revealRadiusTiles) || 8);
    const visibleRadius = revealRadius + Math.max(
      0,
      Number(FOG_OF_WAR_CONFIG.visiblePaddingTiles) || 0,
      Number(FOG_OF_WAR_CONFIG.entityFadeTiles) || 0,
    );
    const stampSpacing = Math.max(0.25, Number(FOG_OF_WAR_CONFIG.exploreStampSpacingTiles) || 1.2);
    const stampX = Math.floor(this.player.x / stampSpacing);
    const stampY = Math.floor(this.player.y / stampSpacing);
    const stampKey = `${stampX},${stampY}`;
    if (!this.fogExploredPointKeys?.has(stampKey)) {
      this.fogExploredPointKeys.add(stampKey);
      this.fogExploredPoints.push({ x: this.player.x, y: this.player.y, radius: revealRadius });
    }
    const minX = Math.floor(this.player.x - visibleRadius);
    const maxX = Math.ceil(this.player.x + visibleRadius);
    const minY = Math.floor(this.player.y - visibleRadius);
    const maxY = Math.ceil(this.player.y + visibleRadius);
    this.fogVisibleTiles = new Set();
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const d = Math.hypot(x + 0.5 - this.player.x, y + 0.5 - this.player.y);
        if (d > visibleRadius) continue;
        if (!this.region.mask?.has(`${x},${y}`)) continue;
        const key = `${x},${y}`;
        this.fogVisibleTiles.add(key);
        if (d <= revealRadius) this.fogExploredTiles.add(key);
      }
    }
    this.fogLastReveal = { x: px, y: py, regionId };
  },

  isTileVisible(x, y) {
    if (!this.fogOfWarActive) return true;
    return this.fogVisibleTiles?.has(this.fogTileKey(x, y))
      || Math.hypot((x ?? 0) - this.player.x, (y ?? 0) - this.player.y) <= Math.max(1, Number(FOG_OF_WAR_CONFIG.revealRadiusTiles) || 8);
  },

  isTileExplored(x, y) {
    if (!this.fogOfWarActive) return true;
    const key = this.fogTileKey(x, y);
    return this.fogVisibleTiles?.has(key) || this.fogExploredTiles?.has(key);
  },

  isPointVisible(point) {
    if (!this.fogOfWarActive) return true;
    const visibleRadius = Math.max(1, Number(FOG_OF_WAR_CONFIG.revealRadiusTiles) || 8) + Math.max(
      0,
      Number(FOG_OF_WAR_CONFIG.visiblePaddingTiles) || 0,
      Number(FOG_OF_WAR_CONFIG.entityFadeTiles) || 0,
    );
    return Math.hypot((point?.x ?? 0) - this.player.x, (point?.y ?? 0) - this.player.y) <= visibleRadius;
  },

  fogPointAlpha(point) {
    if (!this.fogOfWarActive) return 1;
    if (this.isPointExplored(point)) return 1;
    const revealRadius = Math.max(1, Number(FOG_OF_WAR_CONFIG.revealRadiusTiles) || 8);
    const visiblePadding = Math.max(0.1, Number(FOG_OF_WAR_CONFIG.visiblePaddingTiles) || 1.5);
    const entityFade = Math.max(0.1, Number(FOG_OF_WAR_CONFIG.entityFadeTiles) || visiblePadding);
    const visibleRadius = revealRadius + Math.max(visiblePadding, entityFade);
    const d = Math.hypot((point?.x ?? 0) - this.player.x, (point?.y ?? 0) - this.player.y);
    if (d >= visibleRadius) return 0;
    if (d <= visibleRadius - entityFade) return 1;
    const t = (visibleRadius - d) / entityFade;
    return clamp(t * t * (3 - 2 * t), 0, 1);
  },

  isPointExplored(point) {
    return this.isTileExplored(point?.x ?? 0, point?.y ?? 0);
  },

  drawLoadingScreen(ctx) {
    ctx.clearRect(0, 0, this.width, this.height);
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, "#0a0d10");
    gradient.addColorStop(1, "#151711");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
    const cx = this.width / 2;
    const cy = this.height / 2;
    const r = 24;
    const t = this.time * 3;
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#c8a35b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, t, t + 1.4);
    ctx.stroke();
    ctx.fillStyle = "rgba(200,163,91,0.85)";
    ctx.font = "600 14px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Loading...", cx, cy + r + 22);
  },

  render() {
    const ctx = this.ctx;
    if (!this.assetsReady) {
      this.drawLoadingScreen(ctx);
      return;
    }
    const shakeX = this.camera.shake ? (Math.random() - 0.5) * this.camera.shake : 0;
    const shakeY = this.camera.shake ? (Math.random() - 0.5) * this.camera.shake : 0;
    ctx.save();
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.translate(shakeX, shakeY);
    this.drawBackdrop(ctx);
    this.drawParticles(ctx, "backgroundParticles");
    this.drawTiles(ctx);
    this.drawParticles(ctx, "aboveGround");
    this.drawParticles(ctx, "belowUnits");
    this.drawParticles(ctx, "belowEntities");
    this.drawWorldObjects(ctx);
    this.drawAttachedEffectDebug(ctx);
    this.drawParticles(ctx, "aboveObjects");
    this.drawParticles(ctx, "aboveUnits");
    this.drawParticles(ctx, "effects");
    this.drawParticles(ctx, "aboveEntities");
    this.drawFloaters(ctx);
    this.drawParticles(ctx, "weatherOverlay");
    this.drawWeatherEvents(ctx);
    this.drawFogOfWar(ctx);
    this.drawParticles(ctx, "screenOverlay");
    this.drawVignette(ctx);
    ctx.restore();
  },

  drawBackdrop(ctx) {
    const canvas = this.backdropCanvas ??= document.createElement("canvas");
    const width = Math.ceil(this.width);
    const height = Math.ceil(this.height);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      const bctx = canvas.getContext("2d");
      const gradient = bctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#0a0d10");
      gradient.addColorStop(1, "#151711");
      bctx.fillStyle = gradient;
      bctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(canvas, 0, 0);
  },

  drawTiles(ctx) {
    const { cx, cy } = chunkCoords(this.player.x, this.player.y);
    const originX = (CHUNK_SIZE * TILE_W) / 2 + TILE_W / 2;
    const originY = TERRAIN_LAYER_PAD_TOP;
    const layerWidth = CHUNK_SIZE * TILE_W + TILE_W;
    const layerHeight = CHUNK_SIZE * TILE_H + TILE_H + TERRAIN_LAYER_PAD_TOP + TERRAIN_LAYER_PAD_BOTTOM;
    for (let yy = cy - 2; yy <= cy + 2; yy += 1) {
      for (let xx = cx - 2; xx <= cx + 2; xx += 1) {
        const chunk = this.getChunk(xx, yy);
        const origin = worldToScreen(chunk.x, chunk.y, 0, this.camera);
        const x = origin.x - originX;
        const y = origin.y - originY;
        if (x > this.width + 160 || y > this.height + 160 || x + layerWidth < -160 || y + layerHeight < -160) continue;
        const layer = this.getTerrainLayer(chunk);
        ctx.drawImage(layer.canvas, x, y);
      }
    }
  },

  getTerrainLayer(chunk) {
    if (chunk.terrainLayer) return chunk.terrainLayer;

    const originX = (CHUNK_SIZE * TILE_W) / 2 + TILE_W / 2;
    const originY = TERRAIN_LAYER_PAD_TOP;
    const width = CHUNK_SIZE * TILE_W + TILE_W;
    const height = CHUNK_SIZE * TILE_H + TILE_H + TERRAIN_LAYER_PAD_TOP + TERRAIN_LAYER_PAD_BOTTOM;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    const tiles = [...chunk.tiles].sort((a, b) => (a.x + a.y) - (b.x + b.y) || a.x - b.x);
    for (const tile of tiles) {
      const tx = tile.x - chunk.x;
      const ty = tile.y - chunk.y;
      const x = originX + (tx - ty) * (TILE_W / 2);
      const y = originY + (tx + ty) * (TILE_H / 2);
      drawGroundTile(ctx, this.atlas, tile.groundSheetId, tile.variant, x, y, {
        groundSheetId: tile.groundSheetId,
        water: tile.water,
        waterVariant: tile.waterVariant,
        waterSheetId: tile.waterSheetId,
        baseColor: tile.water ? TERRAIN_WATER_COLOR : TERRAIN_GROUND_COLOR,
        baseAlpha: tile.water ? 1 : undefined,
        path: !tile.water && tile.path,
        pathColor: TERRAIN_PATH_COLOR,
      });
    }

    if (chunk.region && !this.isInSubregion?.()) {
      drawRegionMarkerIfInChunk(ctx, chunk, chunk.region.start, "start", originX, originY);
      drawRegionMarkerIfInChunk(ctx, chunk, chunk.region.end, "exit", originX, originY);
    }

    if (chunk.region) {
      const halfW = TILE_W * 0.5 + 1;
      const halfH = TILE_H * 0.5 + 1;
      ctx.save();
      ctx.beginPath();
      for (const tile of tiles) {
        const tx = tile.x - chunk.x;
        const ty = tile.y - chunk.y;
        const x = originX + (tx - ty) * (TILE_W / 2);
        const y = originY + (tx + ty) * (TILE_H / 2);
        const centerY = y + TILE_H * 0.5;
        ctx.moveTo(x, centerY - halfH);
        ctx.lineTo(x + halfW, centerY);
        ctx.lineTo(x, centerY + halfH);
        ctx.lineTo(x - halfW, centerY);
        ctx.closePath();
      }
      ctx.clip();
    }

    for (const decal of chunk.decals) {
      const tx = decal.x - chunk.x;
      const ty = decal.y - chunk.y;
      const x = originX + (tx - ty) * (TILE_W / 2);
      const y = originY + (tx + ty) * (TILE_H / 2) + TILE_H * 0.52;
      drawTerrainDecal(ctx, decal, x, y, this.atlas);
    }

    if (chunk.region) {
      ctx.restore();
    }

    chunk.terrainLayer = { canvas, originX, originY, width, height };
    return chunk.terrainLayer;
  },

  drawWorldObjects(ctx) {
    const drawables = [];
    for (const chunk of this.nearbyChunks(2)) {
      for (const object of chunk.objects) {
        const alpha = this.fogPointAlpha(object);
        if (alpha <= 0.02) continue;
        const screen = worldToScreen(object.x, object.y, 0, this.camera);
        if (visibleScreenPoint(screen, this.width, this.height, 180)) {
          const depthMode = object.depthMode ?? (object.type === "foliage" ? "ground" : "dynamic");
          drawables.push({
            type: "object",
            object,
            biome: object.renderBiomeId ? { id: object.renderBiomeId } : null,
            screen,
            alpha,
            layer: getRenderableLayer(depthMode, object.type === "foliage" ? 0 : 1),
            depthMode,
          });
        }
      }
    }

    for (const loot of this.loots) {
      const alpha = this.fogPointAlpha(loot);
      if (alpha <= 0.02) continue;
      const screen = worldToScreen(loot.x, loot.y, 0, this.camera);
      if (visibleScreenPoint(screen, this.width, this.height, 130)) {
        drawables.push({ type: "loot", loot, screen, alpha, layer: 1, depth: screen.y + 6 });
      }
    }

    for (const projectile of this.projectiles) {
      const alpha = this.fogPointAlpha(projectile);
      if (alpha <= 0.02) continue;
      const screen = worldToScreen(projectile.x, projectile.y, 0, this.camera);
      if (visibleScreenPoint(screen, this.width, this.height, 130)) {
        const beamStartScreen = projectile.beam
          ? worldToScreen(projectile.beamStartX ?? projectile.x, projectile.beamStartY ?? projectile.y, 0, this.camera)
          : null;
        drawables.push({ type: "projectile", projectile, screen, beamStartScreen, alpha, layer: 1, depth: screen.y + 8 });
      }
    }

    for (const monster of this.nearbyMonsters(2)) {
      if (monster.dead) continue;
      const alpha = this.fogPointAlpha(monster);
      if (alpha <= 0.02) continue;
      const screen = worldToScreen(monster.x, monster.y, 0, this.camera);
      if (visibleScreenPoint(screen, this.width, this.height, 170)) {
        drawables.push({ type: "monster", monster, screen, alpha, layer: 1 });
      }
    }

    const questgiver = this.questState.wildernessNpc;
    const questgiverAlpha = this.fogPointAlpha(questgiver);
    if (questgiver && questgiverAlpha > 0.02) {
      const screen = worldToScreen(questgiver.x, questgiver.y, 0, this.camera);
      if (visibleScreenPoint(screen, this.width, this.height, 170)) {
        drawables.push({ type: "questgiver", questgiver, screen, alpha: questgiverAlpha, layer: 1 });
      }
    }

    const heroScreen = worldToScreen(this.player.x, this.player.y, 0, this.camera);
    drawables.push({ type: "hero", actor: this.player, screen: heroScreen, layer: 1 });
    for (const drawable of drawables) {
      if (!Number.isFinite(Number(drawable.depth))) {
        drawable.depth = getRenderableDepth(drawable, this.atlas);
      }
    }
    for (const drawable of drawables) {
      if (drawable.type === "object") drawable.foregroundAlpha = foregroundFadeAlpha(drawable, drawables);
    }
    drawables.sort((a, b) => a.layer - b.layer || a.depth - b.depth || getTypeSortOrder(a.type) - getTypeSortOrder(b.type));

    const stats = this.calcStats();
    for (const item of drawables) {
      ctx.save();
      ctx.globalAlpha *= (item.alpha ?? 1) * (item.foregroundAlpha ?? 1);
      if (item.type === "object") {
        const drawn = drawFoliageObject(ctx, item.object, item.screen, item.biome, this.atlas, this.time)
          || drawOverlayObject(ctx, item.object, item.screen, item.biome, this.atlas, this.time);
        if (!drawn) drawObject(ctx, item.object, item.screen, item.biome, this.atlas, this.time);
        this.drawObjectHealthBar(ctx, item.object, item.screen);
      }
      if (item.type === "loot") drawLoot(ctx, item.screen, item.loot, this.atlas);
      if (item.type === "projectile") drawProjectile(ctx, item.screen, item.projectile, this.atlas, item.beamStartScreen);
      if (item.type === "questgiver") drawQuestgiver(ctx, item.screen, item.questgiver, this.time);
      if (item.type === "monster") drawMonster(ctx, item.screen, item.monster, this.atlas, this.time, this.animationSheets);
      if (item.type === "hero") {
        drawHero(ctx, item.screen, {
          hurtCooldown: this.player.hurtCooldown,
          facingX: this.player.facingX,
          facingY: this.player.facingY,
          moving: this.player.moving,
          gait: this.player.gait,
          moveSpeed: this.player.moveSpeed,
          time: this.time,
          attackAnim: this.player.attackAnim,
          castAnim: this.player.castAnim,
          weaponMode: stats.mode,
          weaponColor: stats.mode === "magic" ? "#9de9ff" : stats.mode === "ranged" ? "#e4c27a" : "#d9d3ca",
        }, this.atlas, this.animationSheets);
      }
      ctx.restore();
    }
  },

  drawObjectHealthBar(ctx, object, screen) {
    if (!isDestructibleObject(object) || !object.maxHp || object.hp >= object.maxHp) return;
    const pct = clamp(object.hp / object.maxHp, 0, 1);
    const width = Math.max(24, Math.min(48, 28 + object.radius * 26));
    const family = getRegionObjectFamily(object.type);
    const yOffset = family === "tree"
      ? 92 * (object.size ?? 1)
      : family === "crystal"
        ? 72 * (object.size ?? 1)
        : family === "building"
          ? 110 * (object.size ?? 1)
          : 42 * (object.size ?? 1);
    const x = screen.x - width / 2;
    const y = screen.y - yOffset;
    ctx.save();
    ctx.fillStyle = "rgba(20, 18, 15, 0.58)";
    ctx.fillRect(x, y, width, 5);
    ctx.fillStyle = pct > 0.5 ? "#58d96d" : pct > 0.25 ? "#ffd85d" : "#ff7272";
    ctx.fillRect(x, y, width * pct, 5);
    ctx.strokeStyle = "rgba(255, 245, 220, 0.45)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 0.5, y - 0.5, width + 1, 6);
    ctx.restore();
  },

  drawAttachedEffectDebug(ctx) {
    if (typeof window === "undefined" || window.VALTORIA_DEBUG_ATTACHED_EFFECTS !== true) return;
    ctx.save();
    ctx.lineWidth = 2;
    ctx.font = "11px monospace";
    for (const emitter of this.particleEngine?.emitters.values?.() ?? []) {
      const config = emitter.config;
      if (!config?.attachedEffectId || config.attachTo !== "object") continue;
      const object = this.nearbyChunks(2)
        .flatMap((chunk) => chunk.objects ?? [])
        .find((entry) => entry.id === config.followTarget);
      if (!object) continue;
      const screen = worldToScreen(object.x, object.y, -(Number(config.screenOffsetY) || 0), this.camera);
      screen.x += Number(config.screenOffsetX) || 0;
      ctx.strokeStyle = config.type === "chimney_smoke" ? "#73d7ff" : config.type === "lantern_glow" ? "#ffe15a" : "#ff784a";
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath();
      ctx.moveTo(screen.x - 7, screen.y);
      ctx.lineTo(screen.x + 7, screen.y);
      ctx.moveTo(screen.x, screen.y - 7);
      ctx.lineTo(screen.x, screen.y + 7);
      ctx.stroke();
      ctx.fillText(`${config.type}:${config.socketName}`, screen.x + 8, screen.y - 8);
    }
    ctx.restore();
  },

  drawParticles(ctx, layer = "aboveEntities") {
    this.particleEngine?.render(ctx, layer, {
      width: this.width,
      height: this.height,
      camera: this.camera,
      fogPointAlpha: (point) => this.fogPointAlpha(point),
      debugParticles: this.debugParticles,
    });
    for (const p of this.particles) {
      const particleLayer = p.configParticle || p.effectParticle ? (p.renderLayer ?? "aboveEntities") : "aboveEntities";
      if (particleLayer !== layer) continue;
      const fogAlpha = p.screenSpace ? 1 : this.fogPointAlpha(p);
      if (fogAlpha <= 0.02) continue;
      const screen = p.screenSpace
        ? { x: p.screenX, y: p.screenY }
        : worldToScreen(p.x, p.y, p.z, this.camera);
      const effectPad = ["expandingEnergyRing", "groundCloud", "groundPulse"].includes(p.visual)
        ? Math.max(TILE_W, TILE_H) * (p.radiusWorld ?? 0) + 40
        : 0;
      if (!visibleScreenPoint(screen, this.width, this.height, Math.max(90, effectPad, (p.r ?? 0) + 24))) continue;
      ctx.save();
      if (p.visual === "groundCloud" || p.visual === "groundPulse") {
        const progress = p.maxLife ? clamp((p.age ?? 0) / p.maxLife, 0, 1) : 1;
        const alpha = (p.visual === "groundCloud" ? Math.min(progress * 3, 1) * clamp(p.life / 0.45, 0, 1) * 0.42 : (1 - progress) * 0.5) * fogAlpha;
        const radiusWorld = (p.radiusWorld ?? 0) * (p.visual === "groundPulse" ? 0.35 + progress * 0.75 : 1);
        const radiusX = Math.max(2, radiusWorld * TILE_W);
        const radiusY = Math.max(1, radiusWorld * TILE_H);
        ctx.globalAlpha = alpha;
        if (p.visual === "groundCloud") {
          const color = p.color ?? "#87d65a";
          ctx.translate(screen.x, screen.y);
          ctx.scale(1, radiusY / radiusX);
          const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radiusX);
          gradient.addColorStop(0, color);
          gradient.addColorStop(0.35, color);
          gradient.addColorStop(0.72, colorWithAlpha(color, 0.38));
          gradient.addColorStop(1, colorWithAlpha(color, 0));
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(0, 0, radiusX, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.strokeStyle = p.color ?? "#d8c091";
          ctx.lineWidth = Math.max(2, 8 - progress * 5);
          ctx.beginPath();
          ctx.ellipse(screen.x, screen.y, radiusX, radiusY, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
        continue;
      }
      if (p.visual === "expandingEnergyRing") {
        const progress = p.maxLife ? clamp((p.age ?? 0) / p.maxLife, 0, 1) : 1;
        const alpha = (1 - progress) * fogAlpha;
        const radiusWorld = (p.radiusWorld ?? 0) * progress;
        const radiusX = Math.max(2, radiusWorld * TILE_W);
        const radiusY = Math.max(1, radiusWorld * TILE_H);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = p.color ?? "#8feaff";
        ctx.lineWidth = Math.max(1.2, 4 - progress * 2.3);
        ctx.shadowBlur = 12;
        ctx.shadowColor = p.color ?? "#8feaff";
        ctx.beginPath();
        ctx.ellipse(screen.x, screen.y, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = alpha * 0.35;
        ctx.lineWidth = Math.max(3, 9 - progress * 5);
        ctx.stroke();
        ctx.restore();
        continue;
      }
      if (p.configParticle) {
        const agePct = p.maxLife ? 1 - clamp(p.life / p.maxLife, 0, 1) : 0;
        const fadeIn = clamp(agePct * 5, 0, 1);
        const fadeOut = clamp(p.life / Math.max(0.25, p.maxLife * 0.35), 0, 1);
        let playerAvoidAlpha = 1;
        if (p.avoidPlayerRadius > 0) {
          const d = Math.hypot(p.x - this.player.x, p.y - this.player.y);
          const minAlpha = p.avoidPlayerMinAlpha ?? 0.18;
          playerAvoidAlpha = minAlpha + (1 - minAlpha) * clamp(d / p.avoidPlayerRadius, 0, 1);
        }
        ctx.globalAlpha = (p.alpha ?? 1) * fadeIn * fadeOut * fogAlpha * playerAvoidAlpha;
        if (p.visual === "line") {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = Math.max(1, Math.min(2.5, (p.r ?? 8) * 0.12));
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(screen.x, screen.y);
          ctx.lineTo(screen.x + (p.vx ?? -120) * 0.035, screen.y + (p.lineLength ?? p.r ?? 12));
          ctx.stroke();
        } else if (p.visual === "softCircle") {
          const gradient = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, p.r);
          gradient.addColorStop(0, p.color);
          gradient.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(screen.x, screen.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = p.color;
          if (p.visual === "softDot") ctx.shadowBlur = Math.max(3, p.r * 1.8);
          if (p.visual === "softDot") ctx.shadowColor = p.color;
          ctx.beginPath();
          ctx.arc(screen.x, screen.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        continue;
      }
      ctx.globalAlpha = clamp(p.life / 0.55, 0, 1) * fogAlpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  },

  drawFloaters(ctx) {
    ctx.save();
    ctx.font = "700 13px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const f of this.floaters) {
      const fogAlpha = this.fogPointAlpha(f);
      if (fogAlpha <= 0.02) continue;
      const screen = worldToScreen(f.x, f.y, f.z, this.camera);
      ctx.globalAlpha = clamp(f.life / f.maxLife, 0, 1) * fogAlpha;
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,0.75)";
      ctx.strokeText(f.text, screen.x, screen.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, screen.x, screen.y);
    }
    ctx.restore();
  },

  colorWithAlpha,

  drawWeatherEvents(ctx) {
    const flash = this.weatherFlash;
    if (!flash) return;
    const pct = flash.maxLife ? clamp(flash.life / flash.maxLife, 0, 1) : 0;
    const alpha = (flash.alpha ?? 0.5) * pct;
    if (alpha <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = flash.color ?? "#dbe9ff";
    ctx.fillRect(0, 0, this.width, this.height);

    const bolt = flash.bolt;
    if (bolt?.points?.length && bolt.life > 0) {
      const boltPct = bolt.maxLife ? clamp(bolt.life / bolt.maxLife, 0, 1) : pct;
      ctx.globalAlpha = Math.min(1, alpha + 0.35) * boltPct;
      ctx.strokeStyle = flash.color ?? "#dbe9ff";
      ctx.lineWidth = 2.2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(bolt.points[0].x, bolt.points[0].y);
      for (let i = 1; i < bolt.points.length; i += 1) {
        ctx.lineTo(bolt.points[i].x, bolt.points[i].y);
      }
      ctx.stroke();
      ctx.globalAlpha *= 0.42;
      ctx.lineWidth = 6;
      ctx.stroke();
    }
    ctx.restore();
  },

  drawFogOfWar(ctx) {
    if (!this.fogOfWarActive) return;
    const unexploredAlpha = clamp(Number(FOG_OF_WAR_CONFIG.unexploredOverlayAlpha) || 0.96, 0, 1);
    const exploredCutAlpha = unexploredAlpha;
    const visibleCutAlpha = unexploredAlpha;
    const screenTileScale = Math.max(TILE_W, TILE_H) * 0.5;
    const fogEdgeFade = Math.max(4, (Number(FOG_OF_WAR_CONFIG.entityFadeTiles) || 2.8) * screenTileScale);
    const visibleRadius = screenTileScale * (
      (Number(FOG_OF_WAR_CONFIG.revealRadiusTiles) || 8.5)
      + Math.max(
        0,
        Number(FOG_OF_WAR_CONFIG.visiblePaddingTiles) || 0,
        Number(FOG_OF_WAR_CONFIG.entityFadeTiles) || 0,
      )
    );

    const overlay = this.fogOverlayCanvas ??= document.createElement("canvas");
    const renderScale = this.fogRenderScale ?? 0.5;
    const overlayWidth = Math.ceil(this.width * renderScale);
    const overlayHeight = Math.ceil(this.height * renderScale);
    if (overlay.width !== overlayWidth) overlay.width = overlayWidth;
    if (overlay.height !== overlayHeight) overlay.height = overlayHeight;
    const fogCtx = overlay.getContext("2d");
    fogCtx.setTransform(1, 0, 0, 1, 0, 0);
    fogCtx.clearRect(0, 0, overlay.width, overlay.height);
    fogCtx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
    fogCtx.globalCompositeOperation = "source-over";
    fogCtx.fillStyle = `rgba(0, 0, 0, ${unexploredAlpha})`;
    fogCtx.fillRect(0, 0, this.width, this.height);
    fogCtx.globalCompositeOperation = "destination-out";
    for (const point of this.fogExploredPoints ?? []) {
      const screen = worldToScreen(point.x, point.y, 0, this.camera);
      const radius = Math.max(16, screenTileScale * (point.radius ?? FOG_OF_WAR_CONFIG.revealRadiusTiles));
      if (!visibleScreenPoint(screen, this.width, this.height, radius + 80)) continue;
      this.drawFogRevealGradient(fogCtx, screen.x, screen.y, radius, exploredCutAlpha, fogEdgeFade);
    }
    const heroScreen = worldToScreen(this.player.x, this.player.y, 0, this.camera);
    this.drawFogRevealGradient(fogCtx, heroScreen.x, heroScreen.y, visibleRadius, visibleCutAlpha, fogEdgeFade);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(overlay, 0, 0, this.width, this.height);
  },

  drawFogRevealGradient(ctx, x, y, radius, alpha, edgeFadeRadius) {
    if (alpha <= 0 || radius <= 0) return;
    const innerRadius = Math.max(0, radius - Math.max(1, edgeFadeRadius ?? radius * 0.34));
    const gradient = ctx.createRadialGradient(x, y, innerRadius, x, y, radius);
    gradient.addColorStop(0, `rgba(0, 0, 0, ${alpha})`);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  },

  drawVignette(ctx) {
    const canvas = this.vignetteCanvas ??= document.createElement("canvas");
    const width = Math.ceil(this.width);
    const height = Math.ceil(this.height);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      const vctx = canvas.getContext("2d");
      const gradient = vctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.18,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.76,
      );
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(1, "rgba(0,0,0,0.48)");
      vctx.fillStyle = gradient;
      vctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(canvas, 0, 0);
  },

  renderMinimap(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const size = canvas.width;
    const center = size / 2;
    const scale = 5.2;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "rgba(8,10,12,0.92)";
    ctx.fillRect(0, 0, size, size);
    const { cx, cy } = chunkCoords(this.player.x, this.player.y);
    for (let yy = cy - 3; yy <= cy + 3; yy += 1) {
      for (let xx = cx - 3; xx <= cx + 3; xx += 1) {
        const chunk = this.getChunk(xx, yy);
        for (const tile of chunk.tiles) {
          const px = center + (tile.x - this.player.x) * scale;
          const py = center + (tile.y - this.player.y) * scale;
          ctx.globalAlpha = 1;
          ctx.fillStyle = tile.edgeMask
            ? "rgba(245, 239, 227, 0.22)"
            : tile.water
              ? TERRAIN_WATER_COLOR
              : TERRAIN_GROUND_COLOR;
          ctx.fillRect(Math.floor(px), Math.floor(py), Math.ceil(scale) + 1, Math.ceil(scale) + 1);
        }
      }
    }
    this.drawMinimapFog(ctx, center, scale);
    ctx.globalAlpha = 1;
    if (this.isPointExplored(this.region.start)) this.drawMinimapPoint(ctx, this.region.start, center, scale, "#8bdfff", 3);
    if (this.isPointExplored(this.region.end)) this.drawMinimapPoint(ctx, this.region.end, center, scale, "#f4da96", 3.4);
    for (const monster of this.monsters.values()) {
      if (monster.dead) continue;
      if (!this.isPointVisible(monster)) continue;
      const x = center + (monster.x - this.player.x) * scale;
      const y = center + (monster.y - this.player.y) * scale;
      if (x >= 0 && y >= 0 && x <= size && y <= size) {
        ctx.fillStyle = "#d8313d";
        ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
      }
    }
    for (const loot of this.loots) {
      if (!this.isPointVisible(loot)) continue;
      const x = center + (loot.x - this.player.x) * scale;
      const y = center + (loot.y - this.player.y) * scale;
      if (x >= 0 && y >= 0 && x <= size && y <= size) {
        ctx.fillStyle = loot.type === "gold" ? "#f1c657" : loot.item.rarityColor;
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }
    ctx.fillStyle = "#f5f3ea";
    ctx.beginPath();
    ctx.arc(center, center, 4, 0, Math.PI * 2);
    ctx.fill();
  },

  drawMinimapFog(ctx, center, scale) {
    if (!this.fogOfWarActive) return;
    const unexploredAlpha = clamp(Number(FOG_OF_WAR_CONFIG.unexploredOverlayAlpha) || 0.96, 0, 1);
    const exploredCutAlpha = unexploredAlpha;
    const visibleCutAlpha = unexploredAlpha;
    const fogEdgeFade = Math.max(1, (Number(FOG_OF_WAR_CONFIG.entityFadeTiles) || 2.8) * scale);
    const visibleRadius = ((Number(FOG_OF_WAR_CONFIG.revealRadiusTiles) || 8.5)
      + Math.max(
        0,
        Number(FOG_OF_WAR_CONFIG.visiblePaddingTiles) || 0,
        Number(FOG_OF_WAR_CONFIG.entityFadeTiles) || 0,
      )) * scale;

    const overlay = this.fogMinimapOverlayCanvas ??= document.createElement("canvas");
    if (overlay.width !== ctx.canvas.width) overlay.width = ctx.canvas.width;
    if (overlay.height !== ctx.canvas.height) overlay.height = ctx.canvas.height;
    const fogCtx = overlay.getContext("2d");
    fogCtx.clearRect(0, 0, overlay.width, overlay.height);
    fogCtx.globalCompositeOperation = "source-over";
    fogCtx.fillStyle = `rgba(0, 0, 0, ${unexploredAlpha})`;
    fogCtx.fillRect(0, 0, overlay.width, overlay.height);
    fogCtx.globalCompositeOperation = "destination-out";
    for (const point of this.fogExploredPoints ?? []) {
      const x = center + (point.x - this.player.x) * scale;
      const y = center + (point.y - this.player.y) * scale;
      const radius = Math.max(2, (point.radius ?? FOG_OF_WAR_CONFIG.revealRadiusTiles) * scale);
      this.drawMinimapRevealGradient(fogCtx, x, y, radius, exploredCutAlpha, fogEdgeFade);
    }
    this.drawMinimapRevealGradient(fogCtx, center, center, visibleRadius, visibleCutAlpha, fogEdgeFade);
    ctx.drawImage(overlay, 0, 0);
  },

  drawMinimapRevealGradient(ctx, x, y, radius, alpha, edgeFadeRadius) {
    if (alpha <= 0 || radius <= 0) return;
    const innerRadius = Math.max(0, radius - Math.max(1, edgeFadeRadius ?? radius * 0.34));
    const gradient = ctx.createRadialGradient(x, y, innerRadius, x, y, radius);
    gradient.addColorStop(0, `rgba(0, 0, 0, ${alpha})`);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  },

  drawMinimapPoint(ctx, point, center, scale, color, radius) {
    const x = center + (point.x - this.player.x) * scale;
    const y = center + (point.y - this.player.y) * scale;
    if (x < 0 || y < 0 || x > ctx.canvas.width || y > ctx.canvas.height) return;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  },

  currentChunk() {
    const { cx, cy } = chunkCoords(this.player.x, this.player.y);
    return this.getChunk(cx, cy);
  }
};
