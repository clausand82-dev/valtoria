import {
  EQUIPMENT_SLOTS,
  itemValue,
  clamp,
  POPULARITY_CONFIG,
  QUEST_NPCS,
  READABLE_DEF_BY_ID,
  SPELL_DEFS,
  isReadableItem,
  isResourceItem
} from "../dependencies.js";
import {
  itemIconIndex,
  itemIconSheet,
  normalizeReadableBonuses,
  readableMergeRecipesFor,
  resourceMergeRecipeFor,
  questSnapshot,
  canNpcTurnInQuest
} from "../helpers.js";
import { normalizeSkillTree, skillTreeAvailablePoints } from "../../config/skill-tree-config.js";
import { getClassConfig, normalizeClassId, normalizeClassNodes } from "../../config/class-config.js";
import { normalizeAutoLootRules } from "./loot.js";
import { normalizeWorldState } from "../../world-state.js";
import { getWorldEnergyState } from "../../world-energy.js";

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

export const snapshotMethods = {
  publishSnapshot() {
    const stats = this.calcStats();
    const chunk = this.currentChunk();
    const hoverMonster = this.hoverMonsterId ? this.monsters.get(this.hoverMonsterId) : null;
    const healthPotions = Math.max(0, Math.floor(Number(this.player.potions?.health) || 0));
    const manaPotions = Math.max(0, Math.floor(Number(this.player.potions?.mana) || 0));
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
        damage: `${stats.damageMin}-${stats.damageMax}`,
        armor: stats.armor,
        mode: stats.mode,
        critChance: stats.critChance,
        critDamage: stats.critDamage,
        blockChance: stats.blockChance,
        dodgeChance: stats.dodgeChance,
        lifeSteal: stats.lifeSteal,
        magicFind: stats.magicFind,
        goldFind: stats.goldFind,
        resourceFind: stats.resourceFind,
        xpGain: stats.xpGain,
        readableBonuses: { ...normalizeReadableBonuses(this.player.readableBonuses) },
        skillTree: normalizeSkillTree(this.player.skillTree),
        skillPoints: skillTreeAvailablePoints(this.player.level, this.player.skillTree),
        classId: normalizeClassId(this.player.classId),
        className: getClassConfig(this.player.classId)?.name ?? "Adventurer",
        classPoints: Math.max(0, Math.floor(Number(this.player.classPoints) || 0)),
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
            : readableCanMerge,
          mergeType: isResourceItem(item) ? "resource" : readableCanMerge ? "readable" : "gear",
          canRead: isReadableItem(item) && item.readableStatus === "readable" && Boolean(String(item.storyText ?? "").trim()),
          canConsume: isReadableItem(item) && item.readableStatus === "consumable",
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
        name: hoverMonster.elite ? `${hoverMonster.elite.label} ${hoverMonster.typeName}` : hoverMonster.typeName,
        level: hoverMonster.level,
        hp: Math.max(0, Math.ceil(hoverMonster.hp)),
        maxHp: hoverMonster.maxHp,
      } : null,
      quickActions: {
        healthPotions,
        manaPotions,
        potionCooldown: this.potionCooldown,
      },
      quests: {
        active: this.questState.active.map((quest) => questSnapshot(quest, this.player.inventory)),
        completed: [...this.questState.completed],
        cityFade: this.questState.cityFade.filter((fade) => Date.now() - fade.startedAt < 1400),
        wildernessNpc: this.questState.wildernessNpc ? {
          npcId: this.questState.wildernessNpc.npcId,
          offers: this.collectQuestOffers(this.questState.wildernessNpc.npcId, "wilderness").map((quest) => questSnapshot(quest, this.player.inventory)),
          active: this.questState.active
            .filter((quest) => canNpcTurnInQuest(quest, this.questState.wildernessNpc.npcId))
            .map((quest) => questSnapshot(quest, this.player.inventory)),
        } : null,
        nearbyQuestgiver: this.nearbyQuestgiver ? {
          id: this.nearbyQuestgiver.id,
          npcId: this.nearbyQuestgiver.npcId,
          offers: this.collectQuestOffers(this.nearbyQuestgiver.npcId, "wilderness").map((quest) => questSnapshot(quest, this.player.inventory)),
          active: this.questState.active
            .filter((quest) => canNpcTurnInQuest(quest, this.nearbyQuestgiver.npcId))
            .map((quest) => questSnapshot(quest, this.player.inventory)),
        } : null,
        cityNpcStates: Object.keys(QUEST_NPCS).map((npcId) => {
          const activeQuests = this.questState.active
            .filter((quest) => canNpcTurnInQuest(quest, npcId))
            .map((quest) => questSnapshot(quest, this.player.inventory));
          const offers = this.collectQuestOffers(npcId, "city").map((quest) => questSnapshot(quest, this.player.inventory));
          const hasComplete = activeQuests.some((quest) => quest.complete);
          return {
            npcId,
            active: activeQuests,
            offers,
            hasComplete,
          };
        }),
      },
      toasts: this.toasts.map((toast) => ({ id: toast.id, text: toast.text })),
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
