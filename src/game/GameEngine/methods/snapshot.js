import {
  EQUIPMENT_SLOTS,
  itemValue,
  clamp,
  POPULARITY_CONFIG,
  QUEST_BOARD_CONFIG,
  QUEST_NPCS,
  READABLE_DEF_BY_ID,
  SPELL_DEFS,
  POTION_IDS,
  POTION_DEFS,
  ACTION_BAR_CONFIG,
  normalizeQuickSlots,
  normalizePotionId,
  isPotionItem,
  isReadableItem,
  isResourceItem
} from "../dependencies.js";
import {
  itemIconIndex,
  itemIconSheet,
  normalizeReadableBonuses,
  readableMergeRecipesFor,
  potionMergeRecipeFor,
  resourceMergeRecipeFor,
  questSnapshot,
  canNpcTurnInQuest
} from "../helpers.js";
import { normalizeSkillTree, skillTreeAvailablePoints } from "../../config/skill-tree-config.js";
import { classPointsAvailable, getClassConfig, normalizeClassId, normalizeClassNodes } from "../../config/class-config.js";
import { normalizeAutoLootRules } from "./loot.js";
import { normalizeWorldState } from "../../world-state.js";
import { getWorldEnergyState } from "../../world-energy.js";
import { normalizeFactionRep } from "../../config/faction-config.js";

function recipeRequiresResearchLab(recipe) {
  if (recipe?.station === "research_lab") return true;
  const ids = [...Object.keys(recipe?.inputs ?? {}), recipe?.output].map(String);
  return ids.some((id) => id === "diamond" || id.includes("gemstone"));
}

function snapshotIconUrl(item) {
  if (isReadableItem(item)) {
    const def = READABLE_DEF_BY_ID[item.readableId];
    if (def?.iconUrl) return def.iconUrl;
  }
  return item.iconUrl;
}

function statusEffectSnapshot(effect = {}) {
  const seconds = Math.max(0, Number(effect.duration) || 0);
  const sourceDef = effect.sourceId ? POTION_DEFS[normalizePotionId(effect.sourceId)] ?? SPELL_DEFS[effect.sourceId] : null;
  const pct = (value) => `${Math.round((Number(value) || 0) * 100)}%`;
  const pctBonusKeys = new Set([
    "armorPct",
    "damagePct",
    "speedPct",
    "attackSpeed",
    "critChance",
    "dodgeChance",
    "lifeSteal",
    "magicFind",
    "goldFind",
    "resourceFind",
    "xpGain",
  ]);
  if (effect.type === "statBuff") {
    const bonuses = Object.entries(effect.bonuses ?? {})
      .map(([key, value]) => {
        const numericValue = Number(value) || 0;
        const label = pctBonusKeys.has(key) ? pct(numericValue) : String(Math.round(numericValue));
        return `${key} ${numericValue > 0 ? "+" : ""}${label}`;
      })
      .join(", ");
    return {
      id: effect.sourceId ?? effect.type ?? "statBuff",
      sourceId: effect.sourceId ?? null,
      type: "buff",
      label: sourceDef?.name ?? sourceDef?.title ?? "Stat buff",
      effect: bonuses || "Temporary stat bonus",
      remainingSeconds: seconds,
      solution: "Wait for the buff to expire.",
      color: effect.color ?? sourceDef?.color ?? "#f4da96",
    };
  }
  if (effect.type === "regen") {
    const parts = [];
    if (effect.healthPct) parts.push(`Health regen ${pct(effect.healthPct)}/s`);
    if (effect.manaPct) parts.push(`Mana regen ${pct(effect.manaPct)}/s`);
    return {
      id: effect.sourceId ?? effect.type ?? "regen",
      sourceId: effect.sourceId ?? null,
      type: "buff",
      label: sourceDef?.name ?? "Regeneration",
      effect: parts.join(" | ") || "Regeneration",
      remainingSeconds: seconds,
      solution: "Wait for the buff to expire.",
      color: effect.color ?? sourceDef?.color ?? "#ff9f1c",
    };
  }
  if (effect.type === "dot") {
    return {
      id: effect.sourceId ?? effect.type ?? "dot",
      sourceId: effect.sourceId ?? null,
      type: "debuff",
      label: sourceDef?.title ?? sourceDef?.name ?? "Damage over time",
      effect: `${Math.max(1, Math.floor(Number(effect.damage ?? effect.baseDamage) || 1))} damage per tick`,
      remainingSeconds: seconds,
      solution: "Survive until it expires.",
      color: effect.color ?? "#d15757",
    };
  }
  if (effect.type === "slow") {
    return {
      id: effect.sourceId ?? effect.type ?? "slow",
      sourceId: effect.sourceId ?? null,
      type: "debuff",
      label: "Slow",
      effect: `Move speed -${pct(effect.pct)}`,
      remainingSeconds: seconds,
      solution: "Wait for it to expire.",
      color: effect.color ?? "#58bfff",
    };
  }
  if (effect.type === "stun") {
    return {
      id: effect.sourceId ?? effect.type ?? "stun",
      sourceId: effect.sourceId ?? null,
      type: "debuff",
      label: "Stunned",
      effect: "Movement and attacks disabled",
      remainingSeconds: seconds,
      solution: "Wait for it to expire.",
      color: effect.color ?? "#d8f6ff",
    };
  }
  if (effect.type === "root") {
    return {
      id: effect.sourceId ?? effect.type ?? "root",
      sourceId: effect.sourceId ?? null,
      type: "debuff",
      label: "Root",
      effect: "Movement disabled",
      remainingSeconds: seconds,
      solution: "Wait for it to expire.",
      color: effect.color ?? "#d7d4c7",
    };
  }
  return {
    id: effect.sourceId ?? effect.type ?? "effect",
    sourceId: effect.sourceId ?? null,
    type: "effect",
    label: String(effect.type ?? "Effect"),
    effect: "Temporary effect",
    remainingSeconds: seconds,
    solution: "Wait for it to expire.",
    color: effect.color ?? "#f4da96",
  };
}

export const snapshotMethods = {
  publishSnapshot() {
    const stats = this.calcStats();
    const chunk = this.currentChunk();
    const hoverMonster = this.hoverMonsterId ? this.monsters.get(this.hoverMonsterId) : null;
    const potionCounts = Object.fromEntries(POTION_IDS.map((potionId) => [
      potionId,
      (this.player.inventory ?? []).reduce((sum, item) => (
        isPotionItem(item) && normalizePotionId(item.potionId ?? item.potionType) === potionId
          ? sum + Math.max(1, Math.floor(Number(item.count) || 1))
          : sum
      ), 0),
    ]));
    const quickSlots = normalizeQuickSlots(this.player.quickSlots);
    this.onSnapshot({
      player: {
        level: this.player.level,
        hp: Math.ceil(this.player.hp),
        maxHp: stats.maxHp,
        mana: Math.floor(this.player.mana),
        maxMana: stats.maxMana,
        xp: this.player.xp,
        nextXp: this.xpForNextLevel(),
        gold: this.player.gold,
        popularity: Math.round(clamp(Number(this.player.popularity) || 0, POPULARITY_CONFIG.min, POPULARITY_CONFIG.max)),
        factionRep: normalizeFactionRep(this.player.factionRep),
        damage: `${stats.damageMin}-${stats.damageMax}`,
        armor: stats.armor,
        magic: stats.magic,
        speed: stats.speed,
        cooldown: stats.cooldown,
        mode: stats.mode,
        critChance: stats.critChance,
        critDamage: stats.critDamage,
        blockChance: stats.blockChance,
        blockAmount: stats.blockAmount,
        dodgeChance: stats.dodgeChance,
        lifeSteal: stats.lifeSteal,
        magicFind: stats.magicFind,
        goldFind: stats.goldFind,
        resourceFind: stats.resourceFind,
        xpGain: stats.xpGain,
        statusEffects: (this.player.statusEffects ?? [])
          .filter((effect) => Number(effect?.duration) > 0)
          .map(statusEffectSnapshot),
        physicalResist: stats.physicalResist,
        fireResist: stats.fireResist,
        iceResist: stats.iceResist,
        lightningResist: stats.lightningResist,
        poisonResist: stats.poisonResist,
        arcaneResist: stats.arcaneResist,
        holyResist: stats.holyResist,
        shadowResist: stats.shadowResist,
        natureResist: stats.natureResist,
        allResist: stats.allResist,
        magicResist: stats.magicResist,
        physicalDamageBonus: stats.physicalDamageBonus,
        fireDamageBonus: stats.fireDamageBonus,
        iceDamageBonus: stats.iceDamageBonus,
        lightningDamageBonus: stats.lightningDamageBonus,
        poisonDamageBonus: stats.poisonDamageBonus,
        arcaneDamageBonus: stats.arcaneDamageBonus,
        holyDamageBonus: stats.holyDamageBonus,
        shadowDamageBonus: stats.shadowDamageBonus,
        natureDamageBonus: stats.natureDamageBonus,
        spellDamageBonus: stats.spellDamageBonus,
        directDamageBonus: stats.directDamageBonus,
        areaDamageBonus: stats.areaDamageBonus,
        dotDamageBonus: stats.dotDamageBonus,
        hazardDamageBonus: stats.hazardDamageBonus,
        dotDurationBonus: stats.dotDurationBonus,
        statusDurationBonus: stats.statusDurationBonus,
        readableBonuses: { ...normalizeReadableBonuses(this.player.readableBonuses) },
        questStatBonuses: { ...(this.player.questStatBonuses ?? {}) },
        skillTree: normalizeSkillTree(this.player.skillTree),
        skillPoints: skillTreeAvailablePoints(this.player.level, this.player.skillTree),
        classId: normalizeClassId(this.player.classId),
        className: getClassConfig(this.player.classId)?.name ?? "Adventurer",
        classPoints: classPointsAvailable(this.player),
        classNodes: normalizeClassNodes(this.player.classNodes),
        unlockedSpells: [...(this.player.unlockedSpells ?? [])],
        activeSpellId: this.player.activeSpellId ?? null,
        activeSpellTitle: SPELL_DEFS[this.player.activeSpellId]?.title ?? null,
        stats: { ...this.player.stats, killsByMonster: { ...this.player.stats.killsByMonster } },
      },
      zone: {
        name: this.region.mapRegion?.label ?? "Region",
        level: this.region.index,
        seed: this.region.seed,
        weather: this.region.mapRegion?.weather
          ? {
            id: this.region.mapRegion.weather.id ?? "none",
            label: this.region.mapRegion.weather.label ?? "No weather",
          }
          : { id: "none", label: "No weather" },
      },
      region: {
        name: this.region.mapRegion?.label ?? "Region",
        index: this.region.index,
        seed: this.region.seed,
        areaMapId: this.region.mapRegion?.areaMapId ?? null,
        regionId: this.region.mapRegion?.id ?? null,
        weather: this.region.mapRegion?.weather
          ? {
            id: this.region.mapRegion.weather.id ?? "none",
            label: this.region.mapRegion.weather.label ?? "No weather",
          }
          : { id: "none", label: "No weather" },
      },
      regionRun: this.activeMapRegion ? { ...this.activeMapRegion } : null,
      regionStats: this.currentRegionStats,
      subregionTransition: this.subregionTransition ? { ...this.subregionTransition } : null,
      currentExpedition: this.currentExpedition ? {
        rootRegionId: this.currentExpedition.rootRegionId ?? null,
        rootMapId: this.currentExpedition.rootMapId ?? null,
        rootMapInstanceId: this.currentExpedition.rootMapInstanceId ?? null,
        currentMapInstanceId: this.currentExpedition.currentMapInstanceId ?? null,
        subregionDepth: this.currentExpedition.subregionStack?.length ?? 0,
        subregionInstanceCount: Object.keys(this.currentExpedition.subregionInstances ?? {}).length,
      } : null,
      worldState: normalizeWorldState(this.worldState),
      worldEnergy: getWorldEnergyState(this),
      mobs: this.monsterCounterSnapshot(),
      critters: this.critterCounterSnapshot?.() ?? { total: 0, alive: 0, rendered: 0, updated: 0, killed: 0, drawCalls: 0 },
      mapReturn: this.mapReturn ? { ...this.mapReturn } : null,
      lastDeath: this.lastDeath ? { ...this.lastDeath } : null,
      exitPrompt: this.exitPromptOpen,
      nearbyFoliageLoot: this.nearbyFoliageLoot ? {
        id: this.nearbyFoliageLoot.id,
        label: this.nearbyFoliageLoot.label,
        resources: this.nearbyFoliageLoot.resources.map((entry) => ({ ...entry })),
      } : null,
      nearbyActionTarget: this.nearbyActionTarget ? { ...this.nearbyActionTarget } : null,
      inventory: this.player.inventory.map((item, index) => {
        const resourceMergeRecipe = isResourceItem(item)
          ? resourceMergeRecipeFor(item, this.player.inventory)
          : null;
        const potionMergeRecipe = isPotionItem(item)
          ? potionMergeRecipeFor(item, this.player.inventory)
          : null;
        const readableCanMerge = isReadableItem(item)
          && item.readableStatus === "mergeable"
          && readableMergeRecipesFor(item, this.player.inventory).length > 0;
        return {
          ...item,
          value: item.value ?? itemValue(item),
          iconIndex: itemIconIndex(item),
          iconSheet: itemIconSheet(item),
          iconUrl: snapshotIconUrl(item),
          index,
          mergeCount: 0,
          canMerge: isResourceItem(item)
            ? Boolean(resourceMergeRecipe && !recipeRequiresResearchLab(resourceMergeRecipe))
            : isPotionItem(item)
              ? Boolean(potionMergeRecipe)
              : readableCanMerge,
          mergeType: isResourceItem(item) ? "resource" : isPotionItem(item) ? "potion" : readableCanMerge ? "readable" : "gear",
          canRead: isReadableItem(item) && item.readableStatus === "readable" && Boolean(String(item.storyText ?? "").trim()),
          canConsume: isPotionItem(item) || (isReadableItem(item) && item.readableStatus === "consumable"),
          summary: this.itemSummary(item),
        };
      }),
      equipment: EQUIPMENT_SLOTS.map((slot) => {
        const item = this.player.equipment[slot.id];
        return {
          ...slot,
          item: item ? { ...item, summary: this.itemSummary(item), iconIndex: itemIconIndex(item), iconSheet: itemIconSheet(item), iconUrl: snapshotIconUrl(item) } : null,
        };
      }),
      autoLoot: normalizeAutoLootRules(this.player.autoLoot),
      hoverMonster: hoverMonster && !hoverMonster.dead ? {
        id: hoverMonster.id,
        name: hoverMonster.elite
          ? `${hoverMonster.elite.label} ${hoverMonster.displayName ?? hoverMonster.typeName}`
          : (hoverMonster.displayName ?? hoverMonster.typeName),
        level: hoverMonster.level,
        hp: Math.max(0, Math.ceil(hoverMonster.hp)),
        maxHp: hoverMonster.maxHp,
      } : null,
      quickActions: {
        healthPotions: potionCounts.small_health ?? 0,
        manaPotions: potionCounts.mana ?? 0,
        potionCooldown: this.potionCooldown,
        potionCooldownMax: 0.5,
        spellCooldown: this.player.spellCooldown,
        slots: quickSlots,
        pickerHoverMs: ACTION_BAR_CONFIG.pickerHoverMs,
        pickerCloseMs: ACTION_BAR_CONFIG.pickerCloseMs,
        potions: POTION_IDS.map((potionId) => ({
          ...POTION_DEFS[potionId],
          count: potionCounts[potionId] ?? 0,
        })),
        spells: (this.player.unlockedSpells ?? []).map((spellId) => ({
          id: spellId,
          title: SPELL_DEFS[spellId]?.title ?? spellId,
          color: SPELL_DEFS[spellId]?.color,
          cooldown: SPELL_DEFS[spellId]?.cooldown ?? 0,
          manaCost: SPELL_DEFS[spellId]?.manaCost ?? 0,
          channeled: Boolean(SPELL_DEFS[spellId]?.channeled),
          frameName: SPELL_DEFS[spellId]?.hudFrame ?? "orb",
          iconUrl: SPELL_DEFS[spellId]?.hudIconUrl ?? SPELL_DEFS[spellId]?.visuals?.projectileTexture ?? null,
        })),
      },
      quests: {
        active: this.questState.active
          .filter((quest) => this.questRuntimeVisibleUnderGlobalGate?.(quest) ?? true)
          .map((quest) => questSnapshot(quest, this.player.inventory)),
        completed: [...this.questState.completed],
        boards: Object.fromEntries(
          Object.keys(QUEST_BOARD_CONFIG ?? {}).map((boardId) => [boardId, this.questBoardSnapshot?.(boardId) ?? null]),
        ),
        cityFade: this.questState.cityFade.filter((fade) => Date.now() - fade.startedAt < 1400),
        wildernessNpc: this.questState.wildernessNpc ? {
          npcId: this.questState.wildernessNpc.npcId,
          offers: this.collectQuestOffers(this.questState.wildernessNpc.npcId, "wilderness").map((quest) => questSnapshot(quest, this.player.inventory)),
          active: this.questState.active
            .filter((quest) => (this.questRuntimeVisibleUnderGlobalGate?.(quest) ?? true) && canNpcTurnInQuest(quest, this.questState.wildernessNpc.npcId))
            .map((quest) => questSnapshot(quest, this.player.inventory)),
        } : null,
        nearbyQuestgiver: this.nearbyQuestgiver ? {
          id: this.nearbyQuestgiver.id,
          npcId: this.nearbyQuestgiver.npcId,
          offers: this.collectQuestOffers(this.nearbyQuestgiver.npcId, "wilderness").map((quest) => questSnapshot(quest, this.player.inventory)),
          active: this.questState.active
            .filter((quest) => (this.questRuntimeVisibleUnderGlobalGate?.(quest) ?? true) && canNpcTurnInQuest(quest, this.nearbyQuestgiver.npcId))
            .map((quest) => questSnapshot(quest, this.player.inventory)),
        } : null,
        cityNpcStates: Object.keys(QUEST_NPCS).map((npcId) => {
          const activeQuests = this.questState.active
            .filter((quest) => (
              !quest.hideActiveInCity
              && (this.questRuntimeVisibleUnderGlobalGate?.(quest) ?? true)
              && canNpcTurnInQuest(quest, npcId)
            ))
            .map((quest) => questSnapshot(quest, this.player.inventory));
          const offers = this.collectQuestOffers(npcId, "city").map((quest) => questSnapshot(quest, this.player.inventory));
          const hasComplete = activeQuests.some((quest) => quest.complete)
            || this.questState.active.some((quest) => (
              !quest.hideActiveInCity
              && (this.questRuntimeVisibleUnderGlobalGate?.(quest) ?? true)
              && canNpcTurnInQuest(quest, npcId)
              && this.questCompletesByTalkingToNpc?.(quest, npcId)
            ));
          return {
            npcId,
            active: activeQuests,
            offers,
            hasComplete,
          };
        }),
      },
      toasts: this.toasts.map((toast) => ({ id: toast.id, text: toast.text, title: toast.title ?? "", kind: toast.kind ?? "info", important: Boolean(toast.important) })),
      toastLog: (this.toastLog ?? []).map((toast) => ({
        id: toast.id,
        text: toast.text,
        title: toast.title ?? "",
        kind: toast.kind ?? "info",
        important: Boolean(toast.important),
        createdAt: toast.createdAt ?? null,
      })),
    });
  },

  monsterCounterSnapshot() {
    const monsters = [...this.monsters.values()];
    const total = monsters.length;
    const alive = monsters.filter((monster) => !monster.dead).length;
    return {
      total,
      alive,
      killed: Math.max(0, total - alive),
    };
  }
};
