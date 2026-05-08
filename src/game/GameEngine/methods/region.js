import {
  MONSTER_STATS,
  BOSS_TINT,
  chunkCoords,
  chunkKey,
  createChunk,
  createRegion,
  clamp,
  distance,
  MAX_ELITE_MONSTERS_PER_REGION
} from "../dependencies.js";
import { rollEliteVariant, eliteVariantLevelPct } from "../helpers.js";

export const regionMethods = {
  updateRegionExit(dt) {
    this.exitPromptCooldown = Math.max(0, this.exitPromptCooldown - dt);
    if (this.exitPromptOpen || this.exitPromptCooldown > 0) return;
    if (distance(this.player, this.region.end) < 0.78) {
      this.exitPromptOpen = true;
      this.player.target = null;
      this.publishSnapshot();
    }
  },

  dismissExitPrompt() {
    this.exitPromptOpen = false;
    this.exitPromptCooldown = 1.2;
    this.publishSnapshot();
  },

  travelToNextRegion() {
    if (this.activeMapRegion) {
      this.returnToAreaMap();
      return;
    }
    this.regionIndex += 1;
    this.region = createRegion(this.regionIndex);
    this.resetRegionRuntime();
    this.placePlayerAtRegionStart();
    this.ensureWorldAroundPlayer();
    this.prepareRegionQuestgiver();
    this.addToast(`Rejst til ${this.region.mapRegion?.label ?? this.region.biome.name}`);
    this.publishSnapshot();
  },

  startMapRegion(areaMapId, regionConfig) {
    if (!areaMapId || !regionConfig?.id) return false;
    this.saveProgress({ force: true });
    this.regionIndex += 1;
    const seed = Math.floor(Math.random() * 1000000000);
    this.activeMapRegion = {
      areaMapId,
      regionId: regionConfig.id,
      label: regionConfig.label ?? regionConfig.id,
    };
    this.mapReturn = null;
    this.region = createRegion(this.regionIndex, seed, regionConfig.biodome, {
      ...regionConfig,
      areaMapId,
    });
    this.resetRegionRuntime();
    this.placePlayerAtRegionStart();
    this.ensureFullRegionGenerated();
    this.ensureWorldAroundPlayer();
    this.prepareRegionQuestgiver();
    // Set total spawned count for active clear_map quests targeting this region
    for (const quest of this.questState.active) {
      if (quest.type !== "clear_map") continue;
      if (quest.target?.regionId !== regionConfig.id) continue;
      const validTypes = quest.target?.monsters ?? [];
      const total = [...this.monsters.values()].filter((m) => validTypes.includes(m.typeName)).length;
      quest.progress = { ...(quest.progress ?? {}), total, kills: 0, cleared: false };
    }
    this.addToast(`${this.activeMapRegion.label} startet. Find den gyldne exit mod nordoest.`);
    this.publishSnapshot();
    return true;
  },

  returnToAreaMap() {
    const active = this.activeMapRegion;
    if (!active) return;
    const cleared = this.allRegionMonstersCleared();
    // Mark any active clear_map quest for this region as cleared if all monsters are dead
    if (cleared) {
      for (const quest of this.questState.active) {
        if (quest.type !== "clear_map") continue;
        if (quest.target?.regionId !== active.regionId) continue;
        if (!quest.progress?.cleared) {
          quest.progress = { ...(quest.progress ?? {}), cleared: true };
          this.addToast(`${quest.title} klar til indlevering`);
        }
      }
    }
    this.mapReturn = {
      id: ++this.mapReturnSerial,
      areaMapId: active.areaMapId,
      regionId: active.regionId,
      label: active.label,
      cleared,
    };
    this.activeMapRegion = null;
    this.exitPromptOpen = false;
    this.exitPromptCooldown = 0;
    this.player.target = null;
    this.player.attackTargetId = null;
    this.player.attackObjectId = null;
    this.addToast(cleared ? `${active.label} befriet. Tilbage i byen.` : `${active.label} er stadig corrupted. Tilbage i byen.`);
    this.saveProgress({ force: true });
    this.publishSnapshot();
  },

  abandonMapRegionToWorldMap() {
    const active = this.activeMapRegion;
    if (!active) return false;
    // Roll back to the forced save taken when the map run started.
    this.loadProgress();
    this.activeMapRegion = null;
    this.exitPromptOpen = false;
    this.exitPromptCooldown = 0;
    this.player.target = null;
    this.player.attackTargetId = null;
    this.player.attackObjectId = null;
    this.mapReturn = {
      id: ++this.mapReturnSerial,
      areaMapId: active.areaMapId,
      regionId: active.regionId,
      label: active.label,
      cleared: false,
      abandoned: true,
    };
    this.addToast(`${active.label} forladt. Progression blev nulstillet, og du er tilbage i byen.`);
    this.saveProgress({ force: true });
    this.publishSnapshot();
    return true;
  },

  resetRegionRuntime() {
    this.chunks.clear();
    this.monsters.clear();
    // Before clearing loots, run despawn handling so quest drop counts are adjusted
    for (const loot of this.loots) {
      try { this.handleLootDespawn(loot); } catch (e) { /* best-effort */ }
    }
    this.loots = [];
    this.projectiles = [];
    this.particles = [];
    this.floaters = [];
    this.hoverMonsterId = null;
    this.nearbyQuestgiver = null;
    this.regionStartPlayerLevel = this.player.level;
    this.eliteMonsterCount = 0;
    if (this.region) this.region.__spawnedBossTypes = new Set();
    this.questState.wildernessNpc = null;
    this.exitPromptOpen = false;
    this.exitPromptCooldown = 0;
  },

  placePlayerAtRegionStart() {
    this.player.x = this.region.start.x;
    this.player.y = this.region.start.y;
    this.player.target = null;
    this.player.attackTargetId = null;
    this.pointer.worldX = this.player.x;
    this.pointer.worldY = this.player.y;
    this.updateCamera(1);
  },

  ensureFullRegionGenerated() {
    if (!this.region) return;
    const min = chunkCoords(0, 0);
    const max = chunkCoords(this.region.width - 0.001, this.region.height - 0.001);
    for (let cy = min.cy; cy <= max.cy; cy += 1) {
      for (let cx = min.cx; cx <= max.cx; cx += 1) {
        this.getChunk(cx, cy);
      }
    }
  },

  allRegionMonstersCleared() {
    this.ensureFullRegionGenerated();
    for (const monster of this.monsters.values()) {
      if (monster.isMinion) continue;
      if (!monster.dead) return false;
    }
    return true;
  },

  ensureWorldAroundPlayer() {
    const { cx, cy } = chunkCoords(this.player.x, this.player.y);
    for (let y = cy - 2; y <= cy + 2; y += 1) {
      for (let x = cx - 2; x <= cx + 2; x += 1) {
        this.getChunk(x, y);
      }
    }
  },

  nearbyChunks(range = 2) {
    const chunks = [];
    const { cx, cy } = chunkCoords(this.player.x, this.player.y);
    for (let y = cy - range; y <= cy + range; y += 1) {
      for (let x = cx - range; x <= cx + range; x += 1) {
        chunks.push(this.getChunk(x, y));
      }
    }
    return chunks;
  },

  nearbyMonsters(range = 2) {
    const monsters = [];
    for (const chunk of this.nearbyChunks(range)) {
      monsters.push(...chunk.monsters);
    }
    return monsters;
  },

  getChunk(cx, cy) {
    const key = chunkKey(cx, cy);
    if (!this.chunks.has(key)) {
      const chunk = createChunk(cx, cy, this.region);
      this.chunks.set(key, chunk);
      for (const monster of chunk.monsters) {
        this.scaleMonsterToHeroLevel(monster);
        this.assignEliteVariant(monster);
        this.monsters.set(monster.id, monster);
      }
    }
    return this.chunks.get(key);
  },

  scaleMonsterToHeroLevel(monster) {
    const heroLevel = Math.max(1, Math.floor(this.player.level || this.regionStartPlayerLevel || 1));
    const currentLevel = Math.max(1, Math.floor(Number(monster.level) || 1));
    const runawayElite = monster.elite && (!Number.isFinite(Number(monster.maxHp)) || currentLevel > heroLevel * 4);
    const naturalLevel = runawayElite
      ? Math.max(1, Math.floor(heroLevel * 0.82))
      : Math.max(1, Math.floor(Number(monster.baseLevel) || currentLevel));
    monster.baseLevel = naturalLevel;

    const baseTargetLevel = Math.max(naturalLevel, Math.floor(heroLevel * 0.82));
    const eliteLevelPct = eliteVariantLevelPct(monster.elite);
    const eliteBonusLevel = eliteLevelPct > 0 ? Math.max(1, Math.floor(heroLevel * eliteLevelPct)) : 0;
    const targetLevel = baseTargetLevel + eliteBonusLevel;
    if (runawayElite) {
      this.resetMonsterToLevel(monster, targetLevel);
      return;
    }

    const levelBoost = targetLevel - currentLevel;
    if (levelBoost <= 0) {
      monster.lootLevel = monster.level;
      return;
    }

    const hpPct = monster.maxHp > 0 ? clamp(monster.hp / monster.maxHp, 0.01, 1) : 1;
    monster.level = targetLevel;
    monster.lootLevel = targetLevel;
    monster.maxHp = Math.floor(monster.maxHp * (1 + levelBoost * 0.2));
    monster.hp = Math.max(1, Math.floor(monster.maxHp * hpPct));
    monster.damage = Math.floor(monster.damage * (1 + levelBoost * 0.17));
    monster.speed *= 1 + Math.min(0.2, levelBoost * 0.012);
    monster.xp = Math.floor(monster.xp * (1 + levelBoost * 0.12));
  },

  resetMonsterToLevel(monster, level) {
    const base = MONSTER_STATS[monster.typeName];
    if (!base) return;
    const hpPct = Number.isFinite(Number(monster.maxHp)) && monster.maxHp > 0
      ? clamp(monster.hp / monster.maxHp, 0.01, 1)
      : 1;
    monster.level = level;
    monster.lootLevel = level;
    monster.maxHp = Math.floor(base.hp * (1 + level * 0.18));
    monster.hp = Math.max(1, Math.floor(monster.maxHp * hpPct));
    monster.damage = Math.floor(base.damage * (1 + level * 0.16));
    monster.speed = base.speed * (1 + Math.min(0.32, level * 0.025));
    monster.baseSpeed = monster.speed;
    monster.magic = Math.floor(Number(base.magic) || 0);
    monster.critChance = Number(base.critChance) || 0;
    monster.critDamage = Number(base.critDamage) || 1.5;
    monster.blockChance = Number(base.blockChance) || 0;
    monster.dodgeChance = Number(base.dodgeChance) || 0;
    monster.spells = [...(base.spells ?? [])];
    monster.spellCooldown = Math.max(0, Number(monster.spellCooldown) || 0);
    monster.statusEffects = Array.isArray(monster.statusEffects) ? monster.statusEffects : [];
    monster.allowElite = base.allowElite !== false;
    monster.isBoss = Boolean(base.isBoss);
    monster.boss = base.isBoss ? { ...BOSS_TINT } : null;
    monster.haveMinion = Boolean(base.haveMinion);
    monster.minions = base.minions ?? false;
    monster.minionCooldown = Math.max(0, Number(monster.minionCooldown) || 0);
    monster.isMinion = Boolean(monster.isMinion);
    monster.xp = Math.floor(base.xp * (1 + level * 0.15));
  },

  assignEliteVariant(monster) {
    if (monster.allowElite === false || monster.isBoss || monster.isMinion) return;
    if (this.eliteMonsterCount >= MAX_ELITE_MONSTERS_PER_REGION) return;
    const variant = rollEliteVariant();
    if (!variant) return;

    this.eliteMonsterCount += 1;
    const bonusLevel = Math.max(1, Math.floor(this.regionStartPlayerLevel * variant.levelPct));
    monster.elite = {
      id: variant.id,
      label: variant.label,
      color: variant.color,
      tintAlpha: variant.tintAlpha,
      levelPct: variant.levelPct,
    };
    monster.level += bonusLevel;
    monster.lootLevel = monster.level;
    monster.maxHp = Math.floor(monster.maxHp * (1 + bonusLevel * 0.18));
    monster.hp = monster.maxHp;
    monster.damage = Math.floor(monster.damage * (1 + bonusLevel * 0.16));
    monster.speed *= 1 + Math.min(0.18, bonusLevel * 0.015);
    monster.xp = Math.floor(monster.xp * (1.2 + variant.levelPct));
    monster.visualScale = (monster.visualScale || 1) * variant.sizeMult;
  }
};
