import {
  BIOMES,
  CHUNK_SIZE,
  TILE_H,
  TILE_W,
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
  visibleScreenPoint,
  worldToScreen,
  TERRAIN_LAYER_PAD_TOP,
  TERRAIN_LAYER_PAD_BOTTOM
} from "../dependencies.js";
import {
  hasDifferentBiomeNeighbor,
  drawRegionMarkerIfInChunk,
  drawQuestgiver,
  isDestructibleObject,
  drawTerrainDecal
} from "../helpers.js";

export const renderingMethods = {
  get assetsReady() {
    return this.atlas !== null && this.animationSheets !== null;
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
    this.drawTiles(ctx);
    this.drawWorldObjects(ctx);
    this.drawParticles(ctx);
    this.drawFloaters(ctx);
    this.drawVignette(ctx);
    ctx.restore();
  },

  drawBackdrop(ctx) {
    const chunk = this.currentChunk();
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, "#0a0d10");
    gradient.addColorStop(1, "#151711");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = chunk.biome.fog;
    ctx.fillRect(0, 0, this.width, this.height);
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
    const biomeByTile = new Map(chunk.tiles.map((tile) => [`${tile.x},${tile.y}`, tile.biomeId]));
    for (const tile of tiles) {
      const tx = tile.x - chunk.x;
      const ty = tile.y - chunk.y;
      const x = originX + (tx - ty) * (TILE_W / 2);
      const y = originY + (tx + ty) * (TILE_H / 2);
      const biome = BIOMES[tile.biomeId] ?? chunk.biome;
      const transitionTile = hasDifferentBiomeNeighbor(tile, biomeByTile);
      drawGroundTile(ctx, this.atlas, tile.biomeId, tile.variant, x, y, {
        groundSheetId: tile.groundSheetId,
        water: tile.water,
        waterVariant: tile.waterVariant,
        baseColor: biome.tile[0],
        baseAlpha: tile.water ? 1 : transitionTile ? 0.08 : undefined,
        edgeFeather: transitionTile ? 0.18 : undefined,
        visualScale: transitionTile ? 1.24 : undefined,
        path: !tile.water && tile.path,
        pathColor: biome.path,
      });
    }

    if (chunk.region) {
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
        const screen = worldToScreen(object.x, object.y, 0, this.camera);
        if (visibleScreenPoint(screen, this.width, this.height, 180)) {
          drawables.push({
            type: "object",
            object,
            biome: BIOMES[object.renderBiomeId] ?? chunk.biome,
            screen,
            layer: object.type === "foliage" ? 0 : 1,
            depth: object.x + object.y + 0.1,
          });
        }
      }
    }

    for (const loot of this.loots) {
      const screen = worldToScreen(loot.x, loot.y, 0, this.camera);
      if (visibleScreenPoint(screen, this.width, this.height, 130)) {
        drawables.push({ type: "loot", loot, screen, layer: 1, depth: loot.x + loot.y + 0.15 });
      }
    }

    for (const projectile of this.projectiles) {
      const screen = worldToScreen(projectile.x, projectile.y, 0, this.camera);
      if (visibleScreenPoint(screen, this.width, this.height, 130)) {
        drawables.push({ type: "projectile", projectile, screen, layer: 1, depth: projectile.x + projectile.y + 0.2 });
      }
    }

    for (const monster of this.nearbyMonsters(2)) {
      if (monster.dead) continue;
      const screen = worldToScreen(monster.x, monster.y, 0, this.camera);
      if (visibleScreenPoint(screen, this.width, this.height, 170)) {
        drawables.push({ type: "monster", monster, screen, layer: 1, depth: monster.x + monster.y + 0.35 });
      }
    }

    const questgiver = this.questState.wildernessNpc;
    if (questgiver) {
      const screen = worldToScreen(questgiver.x, questgiver.y, 0, this.camera);
      if (visibleScreenPoint(screen, this.width, this.height, 170)) {
        drawables.push({ type: "questgiver", questgiver, screen, layer: 1, depth: questgiver.x + questgiver.y + 0.32 });
      }
    }

    const heroScreen = worldToScreen(this.player.x, this.player.y, 0, this.camera);
    drawables.push({ type: "hero", screen: heroScreen, layer: 1, depth: this.player.x + this.player.y + 0.35 });
    drawables.sort((a, b) => a.layer - b.layer || a.depth - b.depth);

    const stats = this.calcStats();
    for (const item of drawables) {
      if (item.type === "object") {
        const drawn = drawFoliageObject(ctx, item.object, item.screen, item.biome, this.atlas, this.time)
          || drawOverlayObject(ctx, item.object, item.screen, item.biome, this.atlas, this.time);
        if (!drawn) drawObject(ctx, item.object, item.screen, item.biome, this.atlas, this.time);
        this.drawObjectHealthBar(ctx, item.object, item.screen);
      }
      if (item.type === "loot") drawLoot(ctx, item.screen, item.loot, this.atlas);
      if (item.type === "projectile") drawProjectile(ctx, item.screen, item.projectile, this.atlas);
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

  drawParticles(ctx) {
    for (const p of this.particles) {
      const screen = worldToScreen(p.x, p.y, p.z, this.camera);
      if (!visibleScreenPoint(screen, this.width, this.height, 90)) continue;
      ctx.save();
      ctx.globalAlpha = clamp(p.life / 0.55, 0, 1);
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
      const screen = worldToScreen(f.x, f.y, f.z, this.camera);
      ctx.globalAlpha = clamp(f.life / f.maxLife, 0, 1);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,0.75)";
      ctx.strokeText(f.text, screen.x, screen.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, screen.x, screen.y);
    }
    ctx.restore();
  },

  drawVignette(ctx) {
    const gradient = ctx.createRadialGradient(
      this.width / 2,
      this.height / 2,
      Math.min(this.width, this.height) * 0.18,
      this.width / 2,
      this.height / 2,
      Math.max(this.width, this.height) * 0.76,
    );
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(0,0,0,0.48)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
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
          const biome = BIOMES[tile.biomeId] ?? chunk.biome;
          ctx.fillStyle = tile.edgeMask ? "rgba(245, 239, 227, 0.22)" : biome.tile[0];
          ctx.fillRect(Math.floor(px), Math.floor(py), Math.ceil(scale) + 1, Math.ceil(scale) + 1);
        }
      }
    }
    this.drawMinimapPoint(ctx, this.region.start, center, scale, "#8bdfff", 3);
    this.drawMinimapPoint(ctx, this.region.end, center, scale, "#f4da96", 3.4);
    for (const monster of this.monsters.values()) {
      if (monster.dead) continue;
      const x = center + (monster.x - this.player.x) * scale;
      const y = center + (monster.y - this.player.y) * scale;
      if (x >= 0 && y >= 0 && x <= size && y <= size) {
        ctx.fillStyle = "#d8313d";
        ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
      }
    }
    for (const loot of this.loots) {
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
