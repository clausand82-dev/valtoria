import {
  MAX_INVENTORY,
  RARITIES,
  createId,
  isRegionPointPlayable,
  itemValue,
  makeItem,
  clamp,
  distance,
  QUEST_CONFIG,
  QUEST_BOARD_CONFIG,
  QUEST_DEFS,
  QUEST_NPCS,
  NAMED_ITEM_TEMPLATES,
  makeNamedItem,
  isPotionItem,
  isResourceItem,
  QUEST_INTERACT_RADIUS,
  GROUND_LOOT_DESPAWN_SECONDS,
  cityRuntimeModifiers
} from "../dependencies.js";
import {
  hashToIndex,
  normalizeMonsterType,
  getQuestStartNpcIds,
  getQuestTurnInNpcIds,
  canNpcStartQuest,
  canNpcTurnInQuest,
  makeQuestItem,
  makeResourceItem,
  resourceCount,
  consumeResourceInputs,
  questItemTargetsForQuest,
  questItemCount,
  questConsumesQuestItem,
  questItemCanStack,
  questItemsCanStack,
  questItemStackMax,
  questItemStacksByQuestInstance,
  inventoryCanAccept,
  makeQuestInstance,
  isQuestComplete,
  questSnapshot,
  resolveQuestDefById,
  resolveQuestRewards,
  normalizeQuestBoards,
  currentQuestStep,
  questHasSteps,
  actionTargetGroupsForQuest,
} from "../helpers.js";
import { applyWorldEnergy } from "../../world-energy.js";
import { applyFactionRepEffects, getFactionRepFrom } from "../../config/faction-config.js";
import { addPlayerStatBonuses, normalizePlayerStatBonuses } from "../../config/player-stat-bonus-config.js";
import { applyCityProgressEffects, cityRequirementContext, normalizeCityProgressEffect } from "../../config/city-state-helpers.js";
import { setWorldFlag, incrementWorldCounter, worldConditionMet, worldEntryAllowed } from "../../world-state.js";

function questStepCompletedFlag(questId, stepId) {
  return `quest.${String(questId ?? "").trim()}.step.${String(stepId ?? "").trim()}.completed`;
}

function questCompletionCounterKeys(quest = {}) {
  const keys = [];
  for (const factionId of Object.keys(quest.rewards?.factionRep ?? {})) {
    keys.push(`questCompleted.faction.${factionId}`);
  }
  for (const regionId of quest.regionIds ?? []) {
    keys.push(`questCompleted.region.${regionId}`);
  }
  if (quest.source) keys.push(`questCompleted.source.${quest.source}`);
  return [...new Set(keys)];
}

function talkTargetNpcIds(target = {}) {
  if (Array.isArray(target.targetNpcIds)) return target.targetNpcIds.map(String).filter(Boolean);
  if (target.targetNpcId) return [String(target.targetNpcId)];
  if (Array.isArray(target.npcIds)) return target.npcIds.map(String).filter(Boolean);
  if (target.npcId) return [String(target.npcId)];
  return [];
}

// Keep the quest instance shaped like a normal quest while the current step changes.
function copyStepRuntimeFields(quest, step, def = null) {
  if (!quest || !step) return quest;
  const fallbackStart = getQuestStartNpcIds(def ?? quest);
  const fallbackTurnIn = getQuestTurnInNpcIds(def ?? quest);
  const startNpcIds = getQuestStartNpcIds(step).length ? getQuestStartNpcIds(step) : fallbackStart;
  const turnInNpcIds = getQuestTurnInNpcIds(step).length ? getQuestTurnInNpcIds(step) : fallbackTurnIn;
  quest.startNpcIds = startNpcIds;
  quest.turnInNpcIds = turnInNpcIds;
  quest.startNpcId = startNpcIds[0] ?? quest.startNpcId ?? quest.npcId;
  quest.npcId = quest.startNpcId;
  quest.turnInNpcId = turnInNpcIds[0] ?? quest.turnInNpcId ?? quest.startNpcId;
  quest.type = step.type ?? quest.type;
  quest.regionIds = Array.isArray(step.regionIds) ? step.regionIds.map(String) : quest.regionIds;
  quest.story = step.story ?? quest.story;
  quest.acceptText = step.acceptText ?? quest.acceptText;
  quest.turnInText = step.turnInText ?? quest.turnInText;
  quest.target = { ...(step.target ?? {}) };
  quest.rewards = { ...(step.rewards ?? {}) };
  return quest;
}

export const questsMethods = {
  advanceQuestProgress(advance = {}) {
    const questId = String(advance.questId ?? advance.id ?? "").trim();
    const stepId = String(advance.stepId ?? advance.step ?? "").trim();
    if (!questId || !stepId) return false;
    const quest = this.questState.active.find((entry) => String(entry.questId) === questId);
    const stepIndex = quest?.steps?.findIndex((step) => String(step?.id ?? "") === stepId) ?? -1;
    const isFinalStep = stepIndex >= 0 && stepIndex === quest.steps.length - 1;
    const alreadyCompleted = (quest?.progress?.completedStepIds ?? []).map(String).includes(stepId);
    if (isFinalStep && !alreadyCompleted) {
      const def = resolveQuestDefById(questId);
      this.grantQuestRewards({ ...quest, rewards: { ...(def?.rewards ?? quest.rewards ?? {}) } });
    }
    return Boolean(this.completeQuestStepById?.(questId, stepId, { grantRewards: false, consumeItems: false }));
  },

  advanceActionTargetQuestProgress(target, amount = 1) {
    const questTargetKey = String(target?.questTargetKey ?? "").trim();
    if (!questTargetKey) return false;
    const regionIds = new Set([
      this.region?.mapRegion?.id,
      this.region?.mapRegion?.__subregionRaw?.id,
      this.region?.mapRegion?.__subregionContext?.subregionId,
    ].map((id) => String(id ?? "").trim()).filter(Boolean));
    const delta = Math.max(0, Math.floor(Number(amount) || 0));
    if (regionIds.size <= 0 || delta <= 0) return false;
    let changed = false;
    for (const quest of this.questState.active) {
      if (quest.type !== "action_targets") continue;
      if (!regionIds.has(String(quest.target?.regionId ?? "").trim())) continue;
      const group = actionTargetGroupsForQuest(quest).find((entry) => entry.questTargetKey === questTargetKey);
      if (!group) continue;
      const targets = { ...(quest.progress?.targets ?? {}) };
      const targetProgress = targets[questTargetKey] ?? {};
      const fallbackTotal = Math.max(1, Math.floor(Number(quest.target?.count) || 1));
      const targetTotal = Math.max(0, Math.floor(Number(targetProgress.total ?? quest.progress?.total ?? fallbackTotal) || 0));
      const targetDone = Math.max(0, Math.floor(Number(targetProgress.done) || 0));
      const nextTargetDone = Math.min(targetTotal, targetDone + delta);
      if (nextTargetDone === targetDone) continue;
      targets[questTargetKey] = { ...targetProgress, done: nextTargetDone };
      const done = Object.values(targets).reduce((sum, entry) => sum + Math.max(0, Math.floor(Number(entry?.done) || 0)), 0);
      const total = Math.max(targetTotal, Math.max(0, Math.floor(Number(quest.progress?.total) || 0)));
      quest.progress = { ...(quest.progress ?? {}), targets, total, done };
      changed = true;
      if (done >= total) this.addToast?.(`${quest.title} ready to turn in`, {
        kind: "quest",
        localization: { type: "questReady", questId: quest.questId ?? quest.id },
      });
    }
    return changed;
  },

  applyQuestStepEffects(effects = {}) {
    if (!effects || typeof effects !== "object") return false;
    let changed = false;
    let next = this.worldState;
    for (const flag of effects.setFlags ?? []) {
      next = setWorldFlag(next, flag, true);
      changed = true;
    }
    for (const flag of effects.clearFlags ?? []) {
      next = setWorldFlag(next, flag, false);
      changed = true;
    }
    for (const [counter, amount] of Object.entries(effects.addCounters ?? {})) {
      next = incrementWorldCounter(next, counter, amount);
      changed = true;
    }
    this.worldState = next;
    if (effects.message) this.addToast?.(String(effects.message));
    if (effects.worldEnergy) {
      applyWorldEnergy(this, effects.worldEnergy);
      changed = true;
    }
    const cityProgressEffect = normalizeCityProgressEffect(effects);
    if (cityProgressEffect) {
      const result = applyCityProgressEffects(this, cityProgressEffect);
      if (result.changed) {
        changed = true;
        if (effects.message) {
          // The explicit message above is the authored quest feedback.
        } else {
          for (const entry of result.summary ?? []) this.addToast?.(entry.message);
        }
      }
    }
    const removeNpcIds = new Set(
      (Array.isArray(effects.removeNpcIds)
        ? effects.removeNpcIds
        : effects.removeNpcIds
          ? [effects.removeNpcIds]
          : []
      )
        .map((id) => String(id ?? "").trim())
        .filter(Boolean)
    );
    if (removeNpcIds.size > 0 && this.chunks instanceof Map) {
      for (const chunk of this.chunks.values()) {
        if (!Array.isArray(chunk?.npcs)) continue;
        const before = chunk.npcs.length;
        chunk.npcs = chunk.npcs.filter((npc) => !removeNpcIds.has(String(npc?.npcId ?? "").trim()));
        if (chunk.npcs.length !== before) changed = true;
      }
      if (this.nearbyQuestgiver && removeNpcIds.has(String(this.nearbyQuestgiver.npcId ?? "").trim())) {
        this.nearbyQuestgiver = null;
        changed = true;
      }
    }
    return changed;
  },

  startQuestCurrentStep(quest) {
    if (!questHasSteps(quest)) return false;
    const def = resolveQuestDefById(quest.questId);
    const step = currentQuestStep(quest);
    if (!step?.id) return false;
    copyStepRuntimeFields(quest, step, def);
    quest.progress = {
      ...(quest.progress ?? {}),
      currentStepId: String(step.id),
      stepProgress: {
        ...(quest.progress?.stepProgress ?? {}),
        [String(step.id)]: quest.progress?.stepProgress?.[String(step.id)] ?? {},
      },
    };
    this.applyQuestStepEffects(step.onStart);
    return this.grantQuestStartItems(quest);
  },

  completeQuestStepById(questId, stepId, options = {}) {
    const quest = this.questState.active.find((entry) => String(entry.questId) === String(questId));
    if (!questHasSteps(quest)) return false;
    const index = quest.steps.findIndex((step) => String(step?.id ?? "") === String(stepId));
    if (index < 0) return false;
    const step = quest.steps[index];
    const completed = new Set((quest.progress?.completedStepIds ?? []).map(String));
    if (completed.has(String(stepId))) return false;

    if (options.grantRewards !== false) this.grantQuestRewards({ ...quest, rewards: step.rewards ?? {} });
    if (options.consumeItems !== false && quest.type === "collect_quest_item") this.consumeQuestItems(quest);
    this.applyQuestStepEffects(step.onComplete);
    this.worldState = setWorldFlag(this.worldState, questStepCompletedFlag(quest.questId, stepId), true);
    completed.add(String(stepId));
    const revealed = new Set((quest.progress?.revealedStepIds ?? []).map(String));
    revealed.add(String(stepId));
    const nextStep = quest.steps[index + 1] ?? null;
    if (nextStep?.id) revealed.add(String(nextStep.id));

    quest.progress = {
      ...(quest.progress ?? {}),
      completedStepIds: [...completed],
      revealedStepIds: [...revealed],
      stepProgress: { ...(quest.progress?.stepProgress ?? {}) },
      currentStepId: nextStep?.id ? String(nextStep.id) : String(stepId),
      complete: !nextStep,
    };

    if (nextStep) {
      copyStepRuntimeFields(quest, nextStep, resolveQuestDefById(quest.questId));
      this.startQuestCurrentStep(quest);
      this.addToast?.(`${quest.title}: ${nextStep.acceptText ?? nextStep.title ?? "naeste trin"}`);
      return true;
    }

    const activeIndex = this.questState.active.findIndex((entry) => entry.id === quest.id);
    if (activeIndex >= 0) this.questState.active.splice(activeIndex, 1);
    if (!quest.repeatable && !this.questState.completed.includes(quest.questId)) {
      this.questState.completed.push(quest.questId);
    }
    if (quest.repeatable && this.questState.cityOfferRolls) delete this.questState.cityOfferRolls[quest.questId];
    if (quest.repeatable) this.applyQuestBoardCompletionCooldown(quest);
    this.cleanupObsoleteCompletedQuestItems();
    this.player.stats.questsCompleted += 1;
    this.questState.cityFade.push({ npcId: String(quest.turnInNpcId ?? quest.npcId), startedAt: Date.now() });
    this.addToast?.(`${quest.title} fuldfoert`);
    this.levelUpIfNeeded();
    return true;
  },

  refreshQuestStepProgress() {
    let changed = false;
    const completedQuestIds = [];
    for (const quest of this.questState.active) {
      if (quest.onStart && quest.progress?.onStartApplied !== true) {
        changed = Boolean(this.applyQuestStepEffects(quest.onStart)) || changed;
        quest.progress = { ...(quest.progress ?? {}), onStartApplied: true };
        changed = true;
      }
      if ((!Array.isArray(quest.steps) || quest.steps.length <= 0) && quest.completeWhen) {
        const context = this.questConditionContext({ quest, questId: quest.questId, questInstanceId: quest.id });
        if (worldConditionMet(quest.completeWhen, this.worldState, context) && quest.progress?.complete !== true) {
          const total = Math.max(1, Math.floor(Number(quest.progress?.total ?? quest.target?.count) || 1));
          quest.progress = { ...(quest.progress ?? {}), total, done: total, complete: true };
          changed = true;
        }
      }
      if (!Array.isArray(quest.steps) || quest.steps.length <= 0) continue;
      const completed = new Set((quest.progress?.completedStepIds ?? []).map(String));
      const revealed = new Set((quest.progress?.revealedStepIds ?? []).map(String));
      if (!revealed.size) {
        const first = quest.steps.find((step) => step?.revealed) ?? quest.steps[0];
        if (first?.id) {
          revealed.add(String(first.id));
          quest.progress = { ...(quest.progress ?? {}), currentStepId: String(first.id) };
          changed = true;
        }
      }
      const context = this.questConditionContext({ quest, questId: quest.questId, questInstanceId: quest.id });
      for (let index = 0; index < quest.steps.length; index += 1) {
        const step = quest.steps[index];
        const stepId = String(step?.id ?? "");
        if (!stepId) continue;
        if (step.revealWhen && worldConditionMet(step.revealWhen, this.worldState, context)) revealed.add(stepId);
        if (index > 0 && completed.has(String(quest.steps[index - 1]?.id ?? ""))) revealed.add(stepId);
        if (completed.has(stepId)) continue;
        if (step.completeWhen && worldConditionMet(step.completeWhen, this.worldState, context)) {
          changed = Boolean(this.completeQuestStepById?.(quest.questId, stepId, { grantRewards: false, consumeItems: false })) || changed;
          for (const completedStepId of quest.progress?.completedStepIds ?? []) completed.add(String(completedStepId));
          for (const revealedStepId of quest.progress?.revealedStepIds ?? []) revealed.add(String(revealedStepId));
          break;
        }
      }
      const completeBySteps = quest.steps.every((step) => completed.has(String(step?.id ?? "")));
      const completeByCondition = quest.completeWhen
        ? worldConditionMet(quest.completeWhen, this.worldState, context)
        : false;
      const complete = completeBySteps || completeByCondition;
      const currentStepId = String(quest.progress?.currentStepId ?? "");
      const nextIncompleteStep = quest.steps.find((step) => !completed.has(String(step?.id ?? "")));
      if (completed.has(currentStepId) && nextIncompleteStep?.id) {
        const nextStepId = String(nextIncompleteStep.id);
        revealed.add(nextStepId);
        copyStepRuntimeFields(quest, nextIncompleteStep, resolveQuestDefById(quest.questId));
        quest.progress = { ...(quest.progress ?? {}), currentStepId: nextStepId };
        changed = true;
      }
      const nextProgress = {
        ...(quest.progress ?? {}),
        completedStepIds: [...completed],
        revealedStepIds: [...revealed],
        complete,
      };
      if (
        complete !== quest.progress?.complete
        || nextProgress.completedStepIds.join("|") !== (quest.progress?.completedStepIds ?? []).map(String).join("|")
        || nextProgress.revealedStepIds.join("|") !== (quest.progress?.revealedStepIds ?? []).map(String).join("|")
      ) {
        quest.progress = nextProgress;
        changed = true;
      }
      if (complete && quest.autoComplete) completedQuestIds.push(quest.id);
    }
    for (const instanceId of completedQuestIds) {
      changed = this.completeQuestDirect(instanceId) || changed;
    }
    return changed;
  },

  completeQuestDirect(instanceId) {
    const index = this.questState.active.findIndex((quest) => quest.id === instanceId);
    if (index < 0) return false;
    const quest = this.questState.active[index];
    if (!isQuestComplete(quest, this.player.inventory)) return false;
    const turnInQuestInfo = questSnapshot(quest, this.player.inventory);
    const rewardSummary = this.grantQuestRewards(quest);
    this.questState.active.splice(index, 1);
    if (!quest.repeatable && !this.questState.completed.includes(quest.questId)) {
      this.questState.completed.push(quest.questId);
    }
    for (const key of questCompletionCounterKeys(quest)) {
      this.worldState = incrementWorldCounter(this.worldState, key, 1);
    }
    this.applyQuestStepEffects(quest.onComplete);
    this.player.stats.questsCompleted += 1;
    this.addToast(`${quest.title} fuldfoert`);
    this.levelUpIfNeeded();
    this.publishSnapshot();
    this.saveProgress({ force: true });
    return { ok: true, questTitle: quest.title, rewards: rewardSummary, questInfo: turnInQuestInfo };
  },

  updateQuestgiver() {
    const questgiver = this.questState.wildernessNpc;
    if (questgiver) {
      const interactions = this.getNpcQuestInteractions(questgiver.npcId, "wilderness");
      if (!interactions.offers.length) {
        this.questState.wildernessNpc = null;
      }
    }
    const candidates = [];
    if (this.questState.wildernessNpc) candidates.push(this.questState.wildernessNpc);
    for (const chunk of this.nearbyChunks(1)) {
      for (const npc of chunk.npcs ?? []) {
        if (!npc || npc.removed || npc.actionRemoved || !npc.npcId) continue;
        const interactions = this.getNpcQuestInteractions(npc.npcId, "wilderness");
        if (!interactions.active.length && !interactions.offers.length) continue;
        candidates.push(npc);
      }
    }
    const nearby = candidates
      .filter((npc) => distance(this.player, npc) <= QUEST_INTERACT_RADIUS + (Number(npc.radius) || 0))
      .sort((a, b) => distance(this.player, a) - distance(this.player, b))[0] ?? null;
    if ((nearby?.id ?? null) !== (this.nearbyQuestgiver?.id ?? null)) {
      this.nearbyQuestgiver = nearby;
      this.publishSnapshot();
    }
  },

  prepareRegionQuestgiver() {
    if (this.questState.wildernessNpc) return;
    const candidates = this.wildernessNpcCandidates();
    if (!candidates.length) return;
    if (!this.hasGuaranteedRegionQuestOffer() && Math.random() > QUEST_CONFIG.wildernessNpcSpawnChance) return;
    const npcId = candidates[Math.floor(Math.random() * candidates.length)];
    if (!npcId) return;
    const position = this.findQuestgiverPosition();
    if (!position) return;
    this.questState.wildernessNpc = {
      id: createId(),
      npcId,
      x: position.x,
      y: position.y,
      radius: 0.34,
      bob: Math.random() * Math.PI * 2,
    };
  },

  questDefinitionCanOffer(def, npcId, scope = "wilderness", contextOverrides = {}) {
    if (!def || !npcId) return false;
    if (def.enabled === false || def.legacy === true) return false;
    if (!this.questGlobalGateAllows(def)) return false;
    const questSource = String(def.source ?? "npc");
    const boardConfig = QUEST_BOARD_CONFIG?.[scope] ?? null;
    if (scope === "readable") {
      // A readable item explicitly names the quest it starts, so keep old readable
      // starts working even if that quest also belongs to a board source.
    } else if (boardConfig) {
      if (questSource !== String(boardConfig.source ?? scope)) return false;
    } else {
      if (questSource === "readable") return false;
      if (questSource !== "npc") return false;
      if (!canNpcStartQuest(def, npcId)) return false;
    }
    if (!def?.repeatable && this.questState.completed.includes(def.id)) return false;
    if (!def?.repeatable && this.questState.active.some((quest) => quest.questId === def.id)) return false;
    if (def?.repeatable && this.questState.active.some((quest) => quest.questId === def.id)) return false;

    const regionIds = Array.isArray(def.regionIds) ? def.regionIds.map(String) : ["city"];
    const hasCityTag = regionIds.includes("city");
    const currentRegionId = String(this.region?.mapRegion?.id ?? "");
    const wildernessRegionIds = regionIds.filter((id) => id !== "city");

    if (scope === "city" || scope === "readable" || boardConfig) {
      if (!hasCityTag) return false;
    } else if (regionIds.length > 0) {
      if (hasCityTag && wildernessRegionIds.length === 0) return false;
      if (!currentRegionId) return false;
      if (!wildernessRegionIds.includes(currentRegionId)) return false;
    }

    const conditionContext = this.questConditionContext(contextOverrides);
    if (!this.questDemandsMet(def.demands, conditionContext)) return false;
    if (!worldEntryAllowed(def, this.worldState, conditionContext)) return false;
    if (scope === "city" && def?.repeatable) {
      if (this.questState.cityOfferRolls?.[def.id] !== npcId) return false;
    }
    if (!boardConfig && !this.offerPassesSpawnChance(def, npcId, scope)) return false;

    if (def.id === "vengeance") {
      return this.monsterTypesForCurrentRegion().some((type) => (
        !this.questState.active.some((quest) => quest.questId === "vengeance" && String(quest.target?.monster) === String(type))
      ));
    }
    return true;
  },

  questGlobalGateAllows(def) {
    const rules = QUEST_CONFIG.globalRules ?? {};
    const gateQuestId = String(rules.hideAllUntilCompleted ?? "").trim();
    if (!gateQuestId) return true;
    if (this.questState.completed.includes(gateQuestId)) return true;
    const exceptions = new Set((rules.exceptions ?? []).map(String));
    exceptions.add(gateQuestId);
    return exceptions.has(String(def?.id ?? ""));
  },

  questRuntimeVisibleUnderGlobalGate(quest) {
    const rules = QUEST_CONFIG.globalRules ?? {};
    const gateQuestId = String(rules.hideAllUntilCompleted ?? "").trim();
    if (!gateQuestId) return true;
    if (this.questState.completed.includes(gateQuestId)) return true;
    const exceptions = new Set((rules.exceptions ?? []).map(String));
    exceptions.add(gateQuestId);
    return exceptions.has(String(quest?.questId ?? quest?.id ?? ""));
  },

  questCompletesByTalkingToNpc(quest, npcId) {
    const targetNpcId = String(npcId ?? "").trim();
    if (!quest || !targetNpcId) return false;
    const step = currentQuestStep(quest);
    const activeType = step?.type ?? quest.type;
    if (activeType !== "talk_to_npc") return false;
    if (isQuestComplete(quest, this.player.inventory)) return false;
    const target = step?.target ?? quest.target ?? {};
    return talkTargetNpcIds(target).includes(targetNpcId);
  },

  questConditionContext(overrides = {}) {
    const cityProgress = this.cityProgress ?? this.cityInventory ?? this.cityStorage ?? {};
    return {
      regionId: this.region?.mapRegion?.id,
      regionConfig: this.region?.mapRegion,
      worldState: this.worldState,
      worldEnergy: this.worldEnergy,
      questState: this.questState,
      player: this.player,
      inventory: this.player?.inventory,
      potions: this.player?.potions,
      equipment: this.player?.equipment,
      cityStats: this.cityStats,
      cityProgress,
      cityInventory: this.cityInventory,
      cityStorage: this.cityStorage ?? this.cityInventory,
      ...cityRequirementContext(cityProgress),
      activeMapRegion: this.activeMapRegion,
      mapReturn: this.mapReturn,
      stats: {
        player: this.player,
        worldState: this.worldState,
      },
      ...overrides,
    };
  },

  monsterTypesForCurrentRegion() {
    const raw = this.region.mapRegion?.mobs?.length
      ? this.region.mapRegion.mobs
      : [];
    return raw.map((entry) => normalizeMonsterType(entry)).filter(Boolean);
  },

  questDemandsMet(demands, context = this.questConditionContext()) {
    if (!demands || typeof demands !== "object") return true;
    const level = Math.max(0, Math.floor(Number(demands.level) || 0));
    if (level > 0 && this.player.level < level) return false;
    if (demands.cityLevel !== undefined && !this.demandNumberMet(context.cityStats?.cityLevel ?? context.cityStats?.level ?? 1, demands.cityLevel)) return false;
    if (demands.unlockedRegionCount !== undefined) {
      const unlockedRegionCount = Object.entries(context.worldState?.flags ?? {}).reduce((count, [key, value]) => (
        value === true && /^region\..+\.unlocked$/.test(key) ? count + 1 : count
      ), 0);
      if (!this.demandNumberMet(unlockedRegionCount, demands.unlockedRegionCount)) return false;
    }

    const factionRepDemands = demands.factionRep && typeof demands.factionRep === "object" && !Array.isArray(demands.factionRep)
      ? demands.factionRep
      : null;
    if (factionRepDemands) {
      for (const [factionId, condition] of Object.entries(factionRepDemands)) {
        const actual = getFactionRepFrom(context.player, factionId);
        if (!this.demandNumberMet(actual, condition)) return false;
      }
    }

    const requiredQuests = Array.isArray(demands.completedQuests)
      ? demands.completedQuests
      : Array.isArray(demands.requiresQuests)
        ? demands.requiresQuests
        : [];
    if (requiredQuests.some((id) => !this.questState.completed.includes(String(id)))) return false;

    const activeRequirements = Array.isArray(demands.requiresActiveQuests) ? demands.requiresActiveQuests : [];
    if (activeRequirements.some((id) => !this.questState.active.some((q) => String(q.questId) === String(id)))) return false;

    const itemDemands = Array.isArray(demands.items) ? demands.items : [];
    for (const req of itemDemands) {
      const needed = Math.max(1, Math.floor(Number(req?.count) || 1));
      if (this.countDemandItems(req) < needed) return false;
    }

    const worldDemands = { ...demands };
    if (factionRepDemands) {
      worldDemands.factionRep = Object.fromEntries(
        Object.entries(factionRepDemands).map(([factionId, condition]) => [
          factionId,
          typeof condition === "number" ? { min: condition } : condition,
        ]),
      );
    }
    if (!worldEntryAllowed(worldDemands, this.worldState, context)) return false;
    return true;
  },

  demandNumberMet(actual, condition) {
    const value = Number(actual);
    if (!Number.isFinite(value)) return false;
    if (typeof condition === "number") return value >= condition;
    if (!condition || typeof condition !== "object" || Array.isArray(condition)) return value >= Number(condition);
    if (condition.equals !== undefined && value !== Number(condition.equals)) return false;
    if (condition.min !== undefined && value < Number(condition.min)) return false;
    if (condition.max !== undefined && value > Number(condition.max)) return false;
    if (condition.gte !== undefined && value < Number(condition.gte)) return false;
    if (condition.gt !== undefined && value <= Number(condition.gt)) return false;
    if (condition.lte !== undefined && value > Number(condition.lte)) return false;
    if (condition.lt !== undefined && value >= Number(condition.lt)) return false;
    return true;
  },

  countDemandItems(req) {
    if (!req || typeof req !== "object") return 0;
    if (req.resourceId || req.resource) return resourceCount(this.player.inventory, String(req.resourceId ?? req.resource));
    if (req.potionType) {
      const type = String(req.potionType);
      const legacy = Math.max(0, Math.floor(Number(this.player.potions?.[type]) || 0));
      const inventoryCount = (this.player.inventory ?? []).reduce((sum, item) => (
        isPotionItem(item) && String(item.potionType ?? "") === type
          ? sum + Math.max(1, Math.floor(Number(item.count) || 1))
          : sum
      ), 0);
      return legacy + inventoryCount;
    }

    let total = 0;
    for (const item of this.player.inventory) {
      if (!item) continue;
      let match = true;
      if (req.mode) match = match && String(item.mode ?? "") === String(req.mode);
      if (req.readableId) match = match && String(item.readableId ?? "") === String(req.readableId);
      if (req.questItemId) match = match && String(item.questItemId ?? "") === String(req.questItemId);
      if (req.uniqueId) match = match && String(item.uniqueId ?? "") === String(req.uniqueId);
      if (req.namedId) match = match && String(item.namedId ?? "") === String(req.namedId);
      if (req.rarity) match = match && String(item.rarity ?? "") === String(req.rarity);
      if (req.baseName) match = match && String(item.baseName ?? "") === String(req.baseName);
      if (req.name) match = match && String(item.name ?? "") === String(req.name);
      if (req.slot) match = match && String(item.slot ?? "") === String(req.slot);
      if (match) {
        if (isResourceItem(item) || isPotionItem(item)) total += Math.max(1, Math.floor(Number(item.count) || 1));
        else total += 1;
      }
    }
    return total;
  },

  offerPassesSpawnChance(def, npcId, scope) {
    if (scope === "readable") return true;
    if (scope === "city") {
      return true;
    }
    const chance = clamp(Number(def?.spawnChance ?? 0.1), 0, 1);
    if (chance >= 1) return true;
    const seed = `${def.id}|${npcId}|${scope}|${this.region.seed}|${this.region.index}`;
    let hash = 2166136261;
    for (let i = 0; i < seed.length; i += 1) {
      hash ^= seed.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const roll = ((hash >>> 0) % 10000) / 10000;
    return roll <= chance;
  },

  buildQuestOffer(def, npcId, context = {}) {
    if (def.id === "vengeance") {
      const monsterTypes = this.monsterTypesForCurrentRegion().filter((type) => (
        !this.questState.active.some((quest) => quest.questId === "vengeance" && String(quest.target?.monster) === String(type))
      ));
      if (!monsterTypes.length) return null;
      const seed = `${def.id}|${npcId}|${this.region.seed}|${this.region.index}`;
      const monster = monsterTypes[hashToIndex(seed, monsterTypes.length)];
      const min = Math.max(1, Math.floor(Number(def.target.countMin) || 1));
      const max = Math.max(min, Math.floor(Number(def.target.countMax) || min));
      const count = min + hashToIndex(`${seed}|count`, max - min + 1);
      return makeQuestInstance(def, npcId, {
        monster,
        count,
        regionSeed: this.region.seed,
        regionIndex: this.region.index,
        ...context,
      });
    }
    return makeQuestInstance(def, npcId, {
      regionSeed: this.region.seed,
      regionIndex: this.region.index,
      ...context,
    });
  },

  collectQuestOffers(npcId, scope = "wilderness") {
    const offers = [];
    for (const def of Object.values(QUEST_DEFS)) {
      if (!this.questDefinitionCanOffer(def, npcId, scope)) continue;
      const offer = this.buildQuestOffer(def, npcId);
      if (offer) offers.push(offer);
    }
    return offers;
  },

  normalizeQuestBoardState() {
    if (!this.questState.questBoards || typeof this.questState.questBoards !== "object") {
      this.questState.questBoards = normalizeQuestBoards(this.questState.questBoards);
    }
    for (const boardId of Object.keys(QUEST_BOARD_CONFIG ?? {})) {
      if (!this.questState.questBoards[boardId]) {
        this.questState.questBoards[boardId] = { availableQuestIds: [], completedCooldowns: {} };
      }
      const board = this.questState.questBoards[boardId];
      board.availableQuestIds = Array.isArray(board.availableQuestIds)
        ? [...new Set(board.availableQuestIds.map(String).filter(Boolean))]
        : [];
      board.completedCooldowns = board.completedCooldowns && typeof board.completedCooldowns === "object"
        ? board.completedCooldowns
        : {};
    }
    return this.questState.questBoards;
  },

  questBoardDef(boardId) {
    return QUEST_BOARD_CONFIG?.[boardId] ?? null;
  },

  questBoardState(boardId) {
    const boards = this.normalizeQuestBoardState();
    const board = boards[boardId] ?? { availableQuestIds: [], completedCooldowns: {} };
    boards[boardId] = board;
    return board;
  },

  questBoardNpcId(def) {
    return getQuestTurnInNpcIds(def)[0] ?? getQuestStartNpcIds(def)[0] ?? "mayor";
  },

  questBoardCooldownRemaining(boardState, questId) {
    return Math.max(0, Math.floor(Number(boardState?.completedCooldowns?.[questId]) || 0));
  },

  questBoardSpawnChancePasses(def) {
    const chance = clamp(Number(def?.spawnChance ?? 1), 0, 1);
    if (chance <= 0) return false;
    return chance >= 1 || Math.random() <= chance;
  },

  questBoardCandidateDefs(boardId, contextOverrides = {}) {
    const config = this.questBoardDef(boardId);
    if (!config) return [];
    const boardState = this.questBoardState(boardId);
    const available = new Set((boardState.availableQuestIds ?? []).map(String));
    return Object.values(QUEST_DEFS).filter((def) => {
      if (!def?.id || String(def.source ?? "npc") !== String(config.source)) return false;
      if (available.has(String(def.id))) return false;
      if (this.questState.active.some((quest) => String(quest.questId) === String(def.id))) return false;
      if (!def.repeatable && this.questState.completed.includes(String(def.id))) return false;
      if (def.repeatable && this.questBoardCooldownRemaining(boardState, def.id) > 0) return false;
      return this.questDefinitionCanOffer(def, this.questBoardNpcId(def), boardId, contextOverrides);
    });
  },

  rollQuestBoard(boardId, contextOverrides = {}) {
    const config = this.questBoardDef(boardId);
    if (!config) return null;
    const modifiers = cityRuntimeModifiers(contextOverrides?.cityStats ?? this.cityStats ?? {});
    if (boardId === "inn" && modifiers.innRumorBoardDisabled) {
      return this.questBoardSnapshot(boardId, contextOverrides);
    }
    const boardState = this.questBoardState(boardId);
    const beforeIds = (boardState.availableQuestIds ?? []).map(String);
    boardState.availableQuestIds = beforeIds.filter((questId) => {
      const def = resolveQuestDefById(questId);
      if (!def || String(def.source ?? "") !== String(config.source)) return false;
      if (this.questState.active.some((quest) => String(quest.questId) === String(questId))) return false;
      if (!def.repeatable && this.questState.completed.includes(String(questId))) return false;
      if (def.repeatable && this.questBoardCooldownRemaining(boardState, questId) > 0) return false;
      return this.questDefinitionCanOffer(def, this.questBoardNpcId(def), boardId, contextOverrides);
    });
    const boardMultiplier = boardId === "inn"
      ? modifiers.innRumorMultiplier ?? 1
      : boardId === "townHall"
        ? modifiers.townHallBoardQuestMultiplier ?? 1
        : 1;
    const minAvailable = Math.max(0, Math.floor((Number(config.minAvailable) || 0) * Math.max(0, Number(boardMultiplier) || 1)));
    const configuredMax = Math.max(Number(config.minAvailable) || 0, Number(config.maxAvailable) || Number(config.minAvailable) || 0);
    const maxAvailable = Math.max(minAvailable, Math.floor(configuredMax * Math.max(0, Number(boardMultiplier) || 1)));
    if (boardState.availableQuestIds.length < minAvailable) {
      const picked = new Set(boardState.availableQuestIds.map(String));
      while (boardState.availableQuestIds.length < maxAvailable) {
        const candidates = this.questBoardCandidateDefs(boardId, contextOverrides)
          .filter((def) => !picked.has(String(def.id)));
        const rolledCandidates = candidates.filter((def) => this.questBoardSpawnChancePasses(def));
        const next = rolledCandidates[Math.floor(Math.random() * rolledCandidates.length)];
        if (!next) break;
        picked.add(String(next.id));
        boardState.availableQuestIds.push(String(next.id));
      }
    }
    const afterIds = (boardState.availableQuestIds ?? []).map(String);
    const changed = beforeIds.length !== afterIds.length || beforeIds.some((id, index) => id !== afterIds[index]);
    if (changed) {
      this.publishSnapshot();
      this.saveProgress({ force: true });
    }
    return this.questBoardSnapshot(boardId, contextOverrides);
  },

  questBoardSnapshot(boardId, contextOverrides = {}) {
    const config = this.questBoardDef(boardId);
    if (!config) return null;
    const boardState = this.questBoardState(boardId);
    const offers = (boardState.availableQuestIds ?? [])
      .map((questId) => resolveQuestDefById(questId))
      .filter((def) => (
        def
        && (!def.repeatable || this.questBoardCooldownRemaining(boardState, def.id) <= 0)
        && this.questDefinitionCanOffer(def, this.questBoardNpcId(def), boardId, contextOverrides)
      ))
      .map((def) => this.buildQuestOffer(def, this.questBoardNpcId(def), {
        source: config.source,
        boardId,
      }))
      .filter(Boolean)
      .map((quest) => questSnapshot(quest, this.player.inventory));
    return {
      id: boardId,
      source: config.source,
      title: config.title ?? boardId,
      subtitle: config.subtitle ?? "",
      emptyText: config.emptyText ?? "Ingen quests tilgaengelige lige nu.",
      availableQuestIds: [...(boardState.availableQuestIds ?? [])],
      cooldowns: { ...(boardState.completedCooldowns ?? {}) },
      offers,
    };
  },

  acceptBoardQuest(boardId, offer, contextOverrides = {}) {
    const config = this.questBoardDef(boardId);
    if (!config || !offer?.questId) return false;
    const modifiers = cityRuntimeModifiers(contextOverrides?.cityStats ?? this.cityStats ?? {});
    if (boardId === "inn" && modifiers.innRumorBoardDisabled) {
      this.addToast("Rumor Board is disabled while the Inn is occupied");
      return false;
    }
    const boardState = this.questBoardState(boardId);
    const questId = String(offer.questId);
    if (!(boardState.availableQuestIds ?? []).map(String).includes(questId)) {
      this.addToast("Quest er ikke laengere paa opslagstavlen");
      this.publishSnapshot();
      return false;
    }
    const def = resolveQuestDefById(questId);
    const npcId = offer.npcId ?? this.questBoardNpcId(def);
    if (!def || !this.questDefinitionCanOffer(def, npcId, boardId, contextOverrides)) {
      this.addToast("Quest er ikke laengere tilgaengelig");
      boardState.availableQuestIds = (boardState.availableQuestIds ?? []).filter((id) => String(id) !== questId);
      this.publishSnapshot();
      this.saveProgress({ force: true });
      return false;
    }
    const accepted = this.acceptQuestOffer({ ...offer, npcId }, boardId);
    if (!accepted) return false;
    boardState.availableQuestIds = (boardState.availableQuestIds ?? []).filter((id) => String(id) !== questId);
    this.publishSnapshot();
    this.saveProgress({ force: true });
    return true;
  },

  advanceQuestBoardCooldowns(amount = 1) {
    const delta = Math.max(1, Math.floor(Number(amount) || 1));
    const boards = this.normalizeQuestBoardState();
    let changed = false;
    for (const board of Object.values(boards)) {
      const cooldowns = board.completedCooldowns ?? {};
      for (const [questId, value] of Object.entries(cooldowns)) {
        const next = Math.max(0, Math.floor(Number(value) || 0) - delta);
        if (next <= 0) delete cooldowns[questId];
        else cooldowns[questId] = next;
        changed = true;
      }
    }
    if (changed) this.saveProgress({ force: true });
  },

  cityRepeatableNpcCandidates(def) {
    if (!def?.repeatable || String(def.source ?? "npc") !== "npc") return [];
    if (!this.questGlobalGateAllows(def)) return [];
    if (this.questState.active.some((quest) => quest.questId === def.id)) return [];

    const regionIds = Array.isArray(def.regionIds) ? def.regionIds.map(String) : ["city"];
    if (!regionIds.includes("city")) return [];
    const conditionContext = this.questConditionContext();
    if (!this.questDemandsMet(def.demands, conditionContext)) return [];
    if (!worldEntryAllowed(def, this.worldState, conditionContext)) return [];

    return getQuestStartNpcIds(def).filter((npcId) => Boolean(QUEST_NPCS[npcId]));
  },

  rollCityRepeatableQuestOffers() {
    const nextRolls = {};
    for (const def of Object.values(QUEST_DEFS)) {
      const candidates = this.cityRepeatableNpcCandidates(def);
      if (!candidates.length) continue;
      const chance = clamp(Number(def.spawnChance ?? 1), 0, 1);
      if (chance <= 0 || Math.random() > chance) continue;
      const npcId = candidates[Math.floor(Math.random() * candidates.length)];
      if (npcId) nextRolls[def.id] = npcId;
    }
    this.questState.cityOfferRolls = nextRolls;
    this.publishSnapshot();
  },

  getNpcQuestInteractions(npcId, scope = "wilderness") {
    return {
      npcId,
      active: this.questState.active.filter((quest) => this.questRuntimeVisibleUnderGlobalGate(quest) && canNpcTurnInQuest(quest, npcId)),
      offers: this.collectQuestOffers(npcId, scope),
    };
  },

  advanceTalkToNpcQuests(npcId) {
    const targetNpcId = String(npcId ?? "").trim();
    if (!targetNpcId) return [];
    const completedResults = [];
    let changed = false;

    for (const quest of [...this.questState.active]) {
      const step = currentQuestStep(quest);
      const activeType = step?.type ?? quest.type;
      if (activeType !== "talk_to_npc") continue;
      const target = step?.target ?? quest.target ?? {};
      const matches = talkTargetNpcIds(target).includes(targetNpcId);
      if (!matches) continue;

      if (questHasSteps(quest) && step?.id) {
        const stepId = String(step.id);
        const progressSource = quest.progress?.stepProgress?.[stepId] ?? {};
        quest.progress = {
          ...(quest.progress ?? {}),
          stepProgress: {
            ...(quest.progress?.stepProgress ?? {}),
            [stepId]: { ...progressSource, talked: true },
          },
        };
        const rewardSummary = this.grantQuestRewards({ ...quest, rewards: step.rewards ?? {} });
        const completed = this.completeQuestStepById(quest.questId, stepId, { grantRewards: false, consumeItems: false });
        if (completed) {
          completedResults.push({
            ok: true,
            questTitle: step.title ?? quest.title,
            rewards: rewardSummary,
            questInfo: questSnapshot(quest, this.player.inventory),
          });
          changed = true;
        }
        continue;
      }

      quest.progress = { ...(quest.progress ?? {}), talked: true };
      const result = this.completeQuestDirect(quest.id);
      if (result?.ok) {
        completedResults.push(result);
        changed = true;
      }
    }

    if (changed) {
      this.publishSnapshot();
      this.saveProgress({ force: true });
    }
    return completedResults;
  },

  wildernessNpcCandidates() {
    return Object.keys(QUEST_NPCS).filter((npcId) => {
      const interactions = this.getNpcQuestInteractions(npcId, "wilderness");
      return interactions.active.length > 0 || interactions.offers.length > 0;
    });
  },

  hasGuaranteedRegionQuestOffer() {
    return Object.values(QUEST_DEFS).some((def) => {
      if (Number(def.spawnChance ?? 0) < 1) return false;
      return getQuestStartNpcIds(def).some((npcId) => this.questDefinitionCanOffer(def, npcId, "wilderness"));
    });
  },

  findQuestgiverPosition() {
    const anchors = [
      { x: this.region.start.x + 5.2, y: this.region.start.y - 1.4 },
      { x: this.region.start.x + 7.4, y: this.region.start.y + 1.5 },
      { x: this.region.start.x + 10.2, y: this.region.start.y - 2.8 },
      { x: this.region.end.x - 6.2, y: this.region.end.y + 3.2 },
      { x: this.region.end.x - 8.5, y: this.region.end.y - 1.8 },
    ];
    for (const anchor of anchors) {
      if (isRegionPointPlayable(this.region, anchor.x, anchor.y, 0.45) && !this.isBlocked(anchor.x, anchor.y, 0.4)) {
        return anchor;
      }
    }
    return null;
  },

  acceptQuestOffer(offer, source = "city") {
    if (!offer?.npcId || !offer?.questId) return false;
    const def = resolveQuestDefById(offer.questId);
    if (!def || !this.questDefinitionCanOffer(def, offer.npcId, source)) {
      this.addToast("Quest er ikke laengere tilgaengelig");
      this.publishSnapshot();
      return false;
    }
    const quest = {
      ...offer,
      id: `${offer.questId}:${createId()}`,
      acceptedAt: Date.now(),
      tracked: offer.tracked !== false,
      progress: { ...(offer.progress ?? {}) },
      target: { ...(offer.target ?? {}) },
      rewards: { ...(offer.rewards ?? {}) },
    };
    if (!questHasSteps(quest) && !this.grantQuestStartItems(quest)) {
      this.publishSnapshot();
      return false;
    }
    this.questState.active.push(quest);
    if (questHasSteps(quest) && !this.startQuestCurrentStep(quest)) {
      this.questState.active = this.questState.active.filter((entry) => entry.id !== quest.id);
      this.publishSnapshot();
      return false;
    }
    if (!questHasSteps(quest) && quest.onStart) {
      this.applyQuestStepEffects(quest.onStart);
      quest.progress = { ...(quest.progress ?? {}), onStartApplied: true };
    }
    this.refreshQuestStepProgress();
    if (source === "wilderness" && this.questState.wildernessNpc?.npcId === offer.npcId) {
      const interactions = this.getNpcQuestInteractions(offer.npcId, "wilderness");
      if (interactions.offers.length <= 0) {
        this.questState.wildernessNpc = null;
        this.nearbyQuestgiver = null;
      }
    }
    this.addToast(source === "readable"
      ? `${quest.title} started from ${quest.sourceLabel ?? "readable"}`
      : `${QUEST_NPCS[quest.npcId]?.name ?? "NPC"}: ${quest.acceptText}`, {
      kind: "quest",
      localization: {
        type: source === "readable" ? "questStartedFromReadable" : "questAccepted",
        questId: quest.questId ?? quest.id,
        npcId: quest.npcId,
        sourceLabel: quest.sourceLabel ?? "readable",
      },
    });
    this.publishSnapshot();
    this.saveProgress({ force: true });
    return true;
  },

  grantQuestStartItems(quest) {
    const giverTargets = questItemTargetsForQuest(quest).filter((target) => {
      const source = String(target?.source ?? "monster");
      return source === "giver" || source === "start";
    });
    if (!giverTargets.length) return true;

    const pendingItems = [];
    for (const target of giverTargets) {
      const count = Math.max(1, Math.floor(Number(target?.count) || 1));
      for (let i = 0; i < count; i += 1) {
        const item = makeQuestItem(target.questItemId, quest.id);
        if (item) pendingItems.push(item);
      }
    }
    if (!pendingItems.length) return true;

    const simulated = this.player.inventory.map((item) => ({ ...item }));
    const maxSlots = this.inventorySlotCapacity?.() ?? MAX_INVENTORY;
    for (const item of pendingItems) {
      if (!inventoryCanAccept(simulated, item, maxSlots)) {
        this.addToast("Rygsaekken er fuld. Lav plads foer questen startes");
        return false;
      }
      simulated.push(item);
    }
    for (const item of pendingItems) this.addInventoryItem(item);
    return true;
  },

  startReadableQuest(item) {
    const questId = item?.readableQuestId;
    if (!questId) return null;
    const def = resolveQuestDefById(questId);
    const npcId = getQuestTurnInNpcIds(def)?.[0] ?? getQuestStartNpcIds(def)?.[0];
    if (!def || !npcId) {
      this.addToast("Readable quest mangler quest eller NPC");
      return null;
    }
    if (!this.questDefinitionCanOffer(def, npcId, "readable")) {
      if (this.questState.completed.includes(def.id)) this.addToast(`${def.title ?? def.id} er allerede afsluttet`);
      else if (this.questState.active.some((quest) => quest.questId === def.id)) this.addToast(`${def.title ?? def.id} er allerede aktiv`);
      return null;
    }
    const offer = this.buildQuestOffer(def, npcId, {
      source: "readable",
      readableId: item.readableId,
      readableTitle: item.name,
    });
    if (!offer) return null;
    const accepted = this.acceptQuestOffer(offer, "readable");
    return accepted ? offer : null;
  },

  startQuestFromAction(start = {}) {
    const questId = String(start.questId ?? start.id ?? "").trim();
    const def = resolveQuestDefById(questId);
    const npcId = String(start.npcId ?? getQuestStartNpcIds(def)?.[0] ?? getQuestTurnInNpcIds(def)?.[0] ?? "");
    if (!def || !npcId || !this.questDefinitionCanOffer(def, npcId, "readable")) return false;
    const offer = this.buildQuestOffer(def, npcId, {
      source: "action",
      sourceLabel: start.sourceLabel ?? "World discovery",
    });
    return Boolean(offer && this.acceptQuestOffer(offer, "readable"));
  },

  setQuestTracked(instanceId, tracked) {
    const quest = this.questState.active.find((entry) => entry.id === instanceId);
    if (!quest) return false;
    quest.tracked = Boolean(tracked);
    this.publishSnapshot();
    return true;
  },

  abandonQuest(instanceId) {
    const index = this.questState.active.findIndex((entry) => String(entry.id) === String(instanceId));
    if (index < 0) return false;
    const quest = this.questState.active[index];
    const targetIds = new Set();
    for (const target of questItemTargetsForQuest(quest)) {
      if (target?.questItemId) targetIds.add(String(target.questItemId));
    }
    for (const step of quest.steps ?? []) {
      for (const entry of step?.target?.questItems ?? []) {
        if (entry?.questItemId) targetIds.add(String(entry.questItemId));
      }
      if (step?.target?.questItemId) targetIds.add(String(step.target.questItemId));
      if (step?.id) this.worldState = setWorldFlag(this.worldState, questStepCompletedFlag(quest.questId, step.id), false);
    }
    this.questState.active.splice(index, 1);
    if (targetIds.size > 0 && Array.isArray(this.player?.inventory)) {
      this.player.inventory = this.player.inventory.filter((item) => {
        if (item?.mode !== "quest") return true;
        if (item.questInstanceId != null && String(item.questInstanceId) === String(quest.id)) return false;
        if (item.questInstanceId == null && targetIds.has(String(item.questItemId))) return false;
        return true;
      });
    }
    this.addToast(`${quest.title} opgivet`);
    this.publishSnapshot();
    this.saveProgress({ force: true });
    return true;
  },

  acceptWildernessQuest(offer) {
    return this.acceptQuestOffer(offer?.quest ? { ...offer.quest, npcId: offer.npcId } : offer, "wilderness");
  },

  declineWildernessQuest() {
    this.addToast("Quest ikke taget");
    this.publishSnapshot();
  },

  applyQuestKill(monster) {
    let changed = false;
    const norm = (value) => String(value ?? "").trim().toLowerCase();
    const killedType = norm(monster?.typeName);
    if (!killedType) return;
    const normalizeMonsterTargetList = (value) => {
      if (Array.isArray(value)) return value.map((entry) => norm(entry)).filter(Boolean);
      if (value === null || value === undefined) return [];
      const raw = String(value);
      if (!raw) return [];
      return raw.includes(",") ? raw.split(",").map((part) => norm(part)).filter(Boolean) : [norm(raw)];
    };
    const currentRegionId = String(this.region?.mapRegion?.id ?? "");
    const killObjectiveTargets = (quest) => (
      Array.isArray(quest?.target?.killObjectives) ? quest.target.killObjectives : []
    );
    for (const quest of this.questState.active) {
      if (quest.type === "collect_quest_item") {
        const objectives = killObjectiveTargets(quest);
        if (objectives.length > 0) {
          let objectiveChanged = false;
          const stepId = questHasSteps(quest) ? String(quest.progress?.currentStepId ?? "") : "";
          const progressSource = stepId ? (quest.progress?.stepProgress?.[stepId] ?? {}) : (quest.progress ?? {});
          const nextKills = { ...(progressSource.killObjectives ?? {}) };
          for (const objective of objectives) {
            const objectiveTypes = Array.isArray(objective?.monsterTypes)
              ? objective.monsterTypes.map((type) => norm(type)).filter(Boolean)
              : normalizeMonsterTargetList(objective?.monsterType ?? objective?.monster ?? objective?.monsters);
            if (objectiveTypes.length > 0 && !objectiveTypes.includes(killedType)) continue;
            const objectiveRegionIds = Array.isArray(objective?.regionIds)
              ? objective.regionIds.map(String)
              : objective?.regionIds
                ? [String(objective.regionIds)]
                : [];
            if (objectiveRegionIds.length > 0 && (!currentRegionId || !objectiveRegionIds.includes(currentRegionId))) continue;
            if (objective?.eliteOnly && !monster?.elite) continue;
            const key = String(objective?.id ?? objective?.key ?? objective?.monsterType ?? objective?.monster ?? "kill");
            const needed = Math.max(1, Math.floor(Number(objective?.count) || 1));
            const current = Math.max(0, Math.floor(Number(nextKills[key]) || 0));
            if (current >= needed) continue;
            nextKills[key] = Math.min(needed, current + 1);
            objectiveChanged = true;
          }
          if (objectiveChanged) {
            if (stepId) {
              quest.progress = {
                ...(quest.progress ?? {}),
                stepProgress: {
                  ...(quest.progress?.stepProgress ?? {}),
                  [stepId]: { ...progressSource, killObjectives: nextKills },
                },
              };
            } else {
              quest.progress = { ...(quest.progress ?? {}), killObjectives: nextKills };
            }
            changed = true;
            if (isQuestComplete(quest, this.player.inventory)) this.addToast(`${quest.title} ready to turn in`, {
              kind: "quest",
              localization: { type: "questReady", questId: quest.questId ?? quest.id },
            });
          }
        }
      }
      if (quest.type === "clear_map") {
        const validTypes = Array.isArray(quest.target?.monsters)
          ? quest.target.monsters.map((type) => norm(type)).filter(Boolean)
          : [];
        if (validTypes.length > 0 && !validTypes.includes(killedType)) continue;
        const kills = Math.max(0, Math.floor(Number(quest.progress?.kills) || 0));
        quest.progress = { ...(quest.progress ?? {}), kills: kills + 1 };
        changed = true;
        continue;
      }
      if (quest.type !== "kill_monsters") continue;
      const targetMonster = quest.target?.monster;
      if (!targetMonster) continue;
      const targetList = normalizeMonsterTargetList(targetMonster);
      const matches = targetList.includes("random") || targetList.includes(killedType);
      if (!matches) continue;
      const needed = Math.max(1, Math.floor(Number(quest.target.count) || 1));
      const current = Math.max(0, Math.floor(Number(quest.progress?.kills) || 0));
      if (current >= needed) continue;
      quest.progress = { ...(quest.progress ?? {}), kills: Math.min(needed, current + 1) };
      changed = true;
      if (quest.progress.kills >= needed) this.addToast(`${quest.title} ready to turn in`, {
        kind: "quest",
        localization: { type: "questReady", questId: quest.questId ?? quest.id },
      });
    }
    if (changed) this.publishSnapshot();
  },

  tryDropQuestTargetLoot({ source = "monster", sourceId = null, sourceTags = [], x = 0, y = 0, sourceObject = null, monster = null } = {}) {
    const sourceKey = String(source ?? "monster");
    const normalizedSourceId = String(sourceId ?? sourceObject?.objectDefId ?? sourceObject?.type ?? "").trim();
    const normalizedSourceTags = new Set((sourceTags ?? []).map((tag) => String(tag ?? "").trim()).filter(Boolean));

    for (const quest of this.questState.active) {
      if (quest.type !== "collect_quest_item") continue;
      const questItemTargets = questItemTargetsForQuest(quest);
      for (const target of questItemTargets) {
        if (!target?.questItemId) continue;
        if (!this.questItemCanDropInCurrentRegion(quest, target)) continue;
        if (!this.questTargetMatchesSource(target, { source: sourceKey, sourceId: normalizedSourceId, sourceTags: normalizedSourceTags, monster })) continue;
        const needed = Math.max(1, Math.floor(Number(target.count) || 1));
        const picked = questItemCount(this.player.inventory, quest.id, target.questItemId);
        if (picked >= needed) continue;
        const activeDropped = questItemCount(this.loots.map((loot) => loot.item), quest.id, target.questItemId);
        if (picked + activeDropped >= needed) continue;
        const [drop] = this.rollLootEntry({
          type: "questItem",
          id: target.questItemId,
          questItemId: target.questItemId,
          questInstanceId: quest.id,
          chance: Number(target.dropChance ?? 0.05),
          questItem: true,
          requires: { questActive: [quest.questId ?? quest.id] },
        }, {
          source: sourceKey,
          quest,
          questId: quest.id,
          conditionContext: this.questConditionContext?.({ source: sourceKey, monster, sourceObject }) ?? {},
        });
        if (!drop?.item) continue;
        this.dropGroundItem(Number(x), Number(y), drop.item, { pickupDelay: 0.25, countAsCollected: true });
        break;
      }
    }
  },

  dropQuestLoot(monster) {
    return this.tryDropQuestTargetLoot({
      source: monster?.elite ? "elite" : "monster",
      x: monster?.x ?? 0,
      y: monster?.y ?? 0,
      monster,
    });
  },

  questItemCanDropInCurrentRegion(quest, target) {
    let rawAllowed = target?.dropRegionIds;
    if (target?.regionIds !== undefined) rawAllowed = target.regionIds;

    // Runtime hard guard: always prefer canonical dropRegionIds from QUEST_DEFS
    // for this questId + questItemId pair over potentially stale quest instance data.
    const def = resolveQuestDefById(quest?.questId);
    const defTarget = def?.target;
    const targetQuestItemId = String(target?.questItemId ?? "");
    if (defTarget && targetQuestItemId) {
      const fromList = Array.isArray(defTarget.questItems)
        ? defTarget.questItems.find((entry) => String(entry?.questItemId ?? "") === targetQuestItemId)
        : null;
      if (fromList?.regionIds !== undefined) {
        rawAllowed = fromList.regionIds;
      } else if (fromList?.dropRegionIds !== undefined) {
        rawAllowed = fromList.dropRegionIds;
      } else if (String(defTarget.questItemId ?? "") === targetQuestItemId) {
        if (defTarget.regionIds !== undefined) rawAllowed = defTarget.regionIds;
        else if (defTarget.dropRegionIds !== undefined) rawAllowed = defTarget.dropRegionIds;
      }
    }

    const allowedRegions = Array.isArray(rawAllowed)
      ? rawAllowed
      : rawAllowed
        ? [rawAllowed]
        : [];
    if (!allowedRegions.length) return true;
    const currentRegionId = this.region?.mapRegion?.id;
    return Boolean(currentRegionId && allowedRegions.map(String).includes(String(currentRegionId)));
  },

  questItemCanDropFromMonster(target, monster) {
    const configured = Array.isArray(target?.monsterTypes)
      ? target.monsterTypes
      : target?.monsterTypes
        ? [target.monsterTypes]
        : [];
    if (!configured.length) return true;
    const killedType = String(monster?.typeName ?? "").trim().toLowerCase();
    if (!killedType) return false;
    const allowed = configured.map((type) => String(type ?? "").trim().toLowerCase()).filter(Boolean);
    return allowed.includes(killedType);
  },

  questItemCanDropFromObject(target, { sourceId, sourceTags } = {}) {
    const configuredIds = [
      ...(Array.isArray(target?.sourceObjectIds) ? target.sourceObjectIds : target?.sourceObjectIds ? [target.sourceObjectIds] : []),
      ...(target?.sourceObjectId ? [target.sourceObjectId] : []),
    ].map((id) => String(id ?? "").trim()).filter(Boolean);
    if (configuredIds.length && (!sourceId || !configuredIds.includes(String(sourceId)))) return false;

    const configuredTags = [
      ...(Array.isArray(target?.sourceObjectTags) ? target.sourceObjectTags : target?.sourceObjectTags ? [target.sourceObjectTags] : []),
      ...(Array.isArray(target?.sourceTags) ? target.sourceTags : target?.sourceTags ? [target.sourceTags] : []),
    ].map((tag) => String(tag ?? "").trim()).filter(Boolean);
    if (!configuredTags.length) return true;
    return configuredTags.some((tag) => sourceTags?.has?.(tag));
  },

  questTargetMatchesSource(target, { source, sourceId, sourceTags, monster } = {}) {
    const targetSource = String(target?.source ?? "monster");
    if (source === "monster" || source === "elite") {
      if (targetSource !== "monster" && targetSource !== "elite") return false;
      if (targetSource === "elite" && !monster?.elite) return false;
      return this.questItemCanDropFromMonster(target, monster);
    }
    if (source === "object") {
      if (targetSource !== "object") return false;
      return this.questItemCanDropFromObject(target, { sourceId, sourceTags });
    }
    return false;
  },

  applyQuestItemPickup(item) {
    const quest = this.questState.active.find((entry) => entry.id === item.questInstanceId);
    if (!quest || quest.type !== "collect_quest_item") return;
    if (isQuestComplete(quest, this.player.inventory)) this.addToast(`${quest.title} ready to turn in`, {
      kind: "quest",
      localization: { type: "questReady", questId: quest.questId ?? quest.id },
    });
  },

  completeQuest(instanceId, npcId = null, options = {}) {
    this.refreshQuestStepProgress?.();
    let index = this.questState.active.findIndex((quest) => quest.id === instanceId);
    if (index < 0) {
      index = this.questState.active.findIndex((quest) => String(quest.questId) === String(instanceId));
    }
    if (index < 0) {
      this.addToast("Quest kunne ikke findes i save-state");
      this.publishSnapshot();
      return false;
    }
    const quest = this.questState.active[index];
    if (npcId && !canNpcTurnInQuest(quest, npcId)) {
      this.addToast("Denne NPC kan ikke modtage questen");
      this.publishSnapshot();
      return false;
    }
    const completionInventory = Array.isArray(options.inventoryOverride)
      ? options.inventoryOverride
      : this.player.inventory;
    const resourcesPrepaid = Boolean(options.resourcesPrepaid);
    if (questHasSteps(quest)) {
      if (!isQuestComplete(quest, completionInventory)) {
        this.addToast(`${currentQuestStep(quest)?.title ?? quest.title} er ikke faerdig endnu`);
        this.publishSnapshot();
        return false;
      }
      if (!this.questRewardsCanFit(quest)) {
        this.addToast("Rygsaekken er fuld. Lav plads foer questen indleveres");
        this.publishSnapshot();
        return false;
      }
      const step = currentQuestStep(quest);
      const turnInInventorySnapshot = (completionInventory ?? []).map((item) => (item && typeof item === "object" ? { ...item } : item));
      const rewardSummary = this.grantQuestRewards(quest);
      if (quest.type === "collect_quest_item") this.consumeQuestItems(quest, { skipResources: resourcesPrepaid });
      const completed = this.completeQuestStepById(quest.questId, step?.id, { grantRewards: false, consumeItems: false });
      this.publishSnapshot();
      this.saveProgress();
      return completed ? {
        ok: true,
        questTitle: step?.title ?? quest.title,
        rewards: rewardSummary,
        questInfo: questSnapshot(quest, turnInInventorySnapshot),
      } : false;
    }
    if (!isQuestComplete(quest, completionInventory)) {
      this.addToast(`${quest.title} er ikke faerdig endnu`);
      this.publishSnapshot();
      return false;
    }
    if (!this.questRewardsCanFit(quest)) {
      this.addToast("Rygsaekken er fuld. Lav plads foer questen indleveres");
      this.publishSnapshot();
      return false;
    }

  const turnInInventorySnapshot = (completionInventory ?? []).map((item) => (item && typeof item === "object" ? { ...item } : item));
    const rewardSummary = this.grantQuestRewards(quest);
    if (quest.type === "collect_quest_item") this.consumeQuestItems(quest, { skipResources: resourcesPrepaid });
    this.questState.active.splice(index, 1);
    if (!quest.repeatable && !this.questState.completed.includes(quest.questId)) {
      this.questState.completed.push(quest.questId);
    }
    for (const key of questCompletionCounterKeys(quest)) {
      this.worldState = incrementWorldCounter(this.worldState, key, 1);
    }
    this.applyQuestStepEffects(quest.onComplete);
    if (quest.repeatable && this.questState.cityOfferRolls) delete this.questState.cityOfferRolls[quest.questId];
    if (quest.repeatable) this.applyQuestBoardCompletionCooldown(quest);
    this.cleanupObsoleteCompletedQuestItems();
    this.player.stats.questsCompleted += 1;
    this.questState.cityFade.push({ npcId: String(quest.turnInNpcId ?? quest.npcId), startedAt: Date.now() });
    this.addToast(`${quest.title} indleveret`);
    this.levelUpIfNeeded();
    this.publishSnapshot();
    this.saveProgress();
    return {
      ok: true,
      questTitle: quest.title,
      rewards: rewardSummary,
      questInfo: questSnapshot(quest, turnInInventorySnapshot),
    };
  },

  applyQuestBoardCompletionCooldown(quest) {
    if (!quest?.repeatable) return;
    const source = String(quest?.source ?? "");
    const boardId = Object.keys(QUEST_BOARD_CONFIG ?? {}).find((id) => String(QUEST_BOARD_CONFIG[id]?.source ?? "") === source);
    if (!boardId) return;
    const def = resolveQuestDefById(quest.questId);
    const cooldown = Math.max(0, Math.floor(Number(def?.cooldownMapRuns ?? def?.cooldownRuns ?? 0) || 0));
    if (cooldown <= 0) return;
    const boardState = this.questBoardState(boardId);
    boardState.completedCooldowns = {
      ...(boardState.completedCooldowns ?? {}),
      [quest.questId]: cooldown,
    };
  },

  cleanupObsoleteCompletedQuestItems() {
    if (!Array.isArray(this.player?.inventory)) return;
    const neededQuestItems = new Set();
    for (const quest of this.questState.active ?? []) {
      for (const target of questItemTargetsForQuest(quest)) {
        if (target?.questItemId) neededQuestItems.add(String(target.questItemId));
      }
    }
    this.player.inventory = this.player.inventory.filter((item) => (
      item?.mode !== "quest"
      || !item.questItemId
      || neededQuestItems.has(String(item.questItemId))
    ));
  },

  grantQuestRewards(quest) {
    const rewards = resolveQuestRewards(quest);
    const baseXp = Math.max(0, Math.floor(Number(rewards.xp) || ((rewards.xpPerKill ?? 0) * (quest.target?.count ?? 0))));
    const xp = this.modifiedXp?.(baseXp) ?? baseXp;
    const baseGold = Math.max(0, Math.floor(Number(rewards.gold) || ((rewards.goldPerKill ?? 0) * (quest.target?.count ?? 0))));
    const gold = Math.max(0, Math.floor(baseGold * (cityRuntimeModifiers(this.cityStats).questGoldRewardMultiplier ?? 1)));
    const summary = {
      xp,
      gold,
      lydra: 0,
      netdra: 0,
      resources: [],
      items: [],
      achievements: [],
      cityProgress: [],
      statBonuses: {},
    };
    if (rewards.lydra || rewards.netdra) {
      applyWorldEnergy(this, { lydra: rewards.lydra, netdra: rewards.netdra });
      summary.lydra = Number(rewards.lydra) || 0;
      summary.netdra = Number(rewards.netdra) || 0;
      if (summary.lydra) this.addFloater(this.player.x, this.player.y, `+${summary.lydra} Ly'dra'thot`, "#eaf4ff", 1);
      if (summary.netdra) this.addFloater(this.player.x, this.player.y, `+${summary.netdra} Net'dra'thot`, "#b8a4ff", 1);
    }
    if (rewards.factionRep && typeof rewards.factionRep === "object") {
      applyFactionRepEffects(this.player, rewards.factionRep);
      summary.factionRep = { ...rewards.factionRep };
    }
    const statBonuses = normalizePlayerStatBonuses(rewards.statBonuses);
    if (Object.keys(statBonuses).length > 0) {
      this.player.questStatBonuses = addPlayerStatBonuses(this.player.questStatBonuses, statBonuses);
      summary.statBonuses = statBonuses;
    }
    if (xp) {
      this.player.xp += xp;
      this.recordRunXp?.(xp);
      this.addFloater(this.player.x, this.player.y, `+${xp} xp`, "#e0aa3f", 1);
    }
    if (gold) {
      this.player.gold += gold;
      this.recordRunGold?.(gold);
      this.player.stats.goldEarned += gold;
      this.addFloater(this.player.x, this.player.y, `+${gold} g`, "#f1c657", 1);
    }
    for (const reward of rewards.resources ?? []) {
      const resource = makeResourceItem(reward.resource, reward.count ?? 1);
      if (resource) {
        this.addInventoryItem(resource);
        this.recordRunItem?.(resource);
        summary.resources.push({
          id: resource.resourceId,
          name: resource.name,
          count: Math.max(1, Math.floor(Number(resource.count) || 1)),
        });
      }
    }
    if (rewards.randomItem) {
      const item = this.rollQuestRewardItem();
      this.addInventoryItem(item);
      this.recordRunItem?.(item);
      summary.items.push({
        id: item.id,
        name: item.name,
        rarity: item.rarity,
      });
    }
    for (const reward of rewards.namedItems ?? []) {
      const definition = NAMED_ITEM_TEMPLATES.find((entry) => entry.id === reward.namedId);
      const item = definition ? makeNamedItem(definition, reward.level ?? this.player.level) : null;
      if (item && this.addInventoryItem(item)) {
        this.recordRunItem?.(item);
        summary.items.push({ id: item.id, name: item.name, rarity: item.rarity });
      }
    }
    summary.achievements = Array.isArray(rewards.achievements) ? [...new Set(rewards.achievements.map(String))] : [];
    // grant quest items if present in rewards
    if (Array.isArray(rewards.questItems) && rewards.questItems.length > 0) {
      for (const q of rewards.questItems) {
        const count = Math.max(1, Math.floor(Number(q.count) || 1));
        for (let i = 0; i < count; i += 1) {
          const qi = makeQuestItem(q.questItemId, null);
          if (qi && this.addInventoryItem(qi)) {
            this.recordRunItem?.(qi);
            summary.items.push({ id: qi.id, name: qi.name, rarity: qi.rarity });
          }
        }
      }
    }
    const cityProgressEffect = normalizeCityProgressEffect(rewards);
    if (cityProgressEffect) {
      const result = applyCityProgressEffects(this, cityProgressEffect);
      summary.cityProgress = result.summary ?? [];
    }
    return summary;
  },

  questRewardsCanFit(quest) {
    const simulated = this.player.inventory
      .filter((item) => !questConsumesQuestItem(quest, item))
      .map((item) => ({ ...item }));
    // simulate consuming quest requirements so rewards fit check is accurate
    if (quest.type === "collect_quest_item") {
      if (Array.isArray(quest.target?.resources) && quest.target.resources.length > 0) {
        const inputs = {};
        for (const r of quest.target.resources) inputs[r.resource] = (inputs[r.resource] || 0) + (r.count ?? 1);
        consumeResourceInputs(simulated, inputs);
      }
      if (Array.isArray(quest.target?.items) && quest.target.items.length > 0) {
        for (const req of quest.target.items) {
          let need = Math.max(1, Math.floor(Number(req.count) || 1));
          for (let i = simulated.length - 1; i >= 0 && need > 0; i -= 1) {
            const it = simulated[i];
            if (!it) continue;
            let match = true;
            if (req.templateId) match = match && (String(it.uniqueId) === String(req.templateId) || String(it.namedId) === String(req.templateId));
            if (req.namePrefix) match = match && String(it.name || "").startsWith(`${req.namePrefix} `);
            if (req.baseName) match = match && String(it.baseName || "") === String(req.baseName);
            if (req.rarity) match = match && String(it.rarity || "") === String(req.rarity);
            if (match) {
              simulated.splice(i, 1);
              need -= 1;
            }
          }
          if (need > 0) return false;
        }
      }
    }
    for (const reward of quest.rewards?.resources ?? []) {
      const resource = makeResourceItem(reward.resource, reward.count ?? 1);
      if (resource && !inventoryCanAccept(simulated, resource, this.inventorySlotCapacity?.() ?? MAX_INVENTORY)) return false;
    }
    const maxSlots = this.inventorySlotCapacity?.() ?? MAX_INVENTORY;
    if (quest.rewards?.randomItem && simulated.length >= maxSlots) return false;
    const namedRewardCount = Array.isArray(quest.rewards?.namedItems) ? quest.rewards.namedItems.length : 0;
    if (namedRewardCount > 0 && simulated.length + namedRewardCount > maxSlots) return false;
    for (const reward of quest.rewards?.questItems ?? []) {
      const count = Math.max(1, Math.floor(Number(reward?.count) || 1));
      for (let i = 0; i < count; i += 1) {
        const item = makeQuestItem(reward.questItemId, null);
        if (!item) continue;
        if (questItemCanStack(item.questItemId)) {
          let remaining = 1;
          const stackMax = questItemStackMax(item.questItemId);
          for (const stack of simulated) {
            if (!questItemsCanStack(item, stack)) continue;
            const current = Math.max(1, Math.floor(Number(stack.count) || 1));
            const moved = Math.min(stackMax - current, remaining);
            if (moved <= 0) continue;
            stack.count = current + moved;
            remaining -= moved;
            if (remaining <= 0) break;
          }
          if (remaining > 0) {
            if (simulated.length >= maxSlots) return false;
            simulated.push({ ...item, count: remaining, stackMax });
          }
          continue;
        }
        if (!inventoryCanAccept(simulated, item, maxSlots)) return false;
        simulated.push(item);
      }
    }
    return true;
  },

  rollQuestRewardItem() {
    const minIndex = RARITIES.findIndex((rarity) => rarity.id === "upgraded");
    for (let i = 0; i < 12; i += 1) {
      const item = makeItem(this.player.level, Math.random());
      const rarityIndex = RARITIES.findIndex((rarity) => rarity.id === item.rarity);
      if (rarityIndex >= minIndex) return item;
    }
    const item = makeItem(this.player.level + 3, Math.random());
    item.rarity = "upgraded";
    item.rarityLabel = "Upgraded";
    item.rarityColor = "#58d96d";
    item.value = itemValue(item);
    return item;
  },

  consumeQuestItems(quest, options = {}) {
    // consume resources or specific items if defined, otherwise fallback to quest items
    if (Array.isArray(quest.target?.resources) && quest.target.resources.length > 0) {
      if (options.skipResources) {
        if (!Array.isArray(quest.target?.items) || quest.target.items.length <= 0) {
          this.addToast("Quest resources used");
          this.publishSnapshot();
          return;
        }
      } else {
      const inputs = {};
      for (const r of quest.target.resources) inputs[r.resource] = (inputs[r.resource] || 0) + (r.count ?? 1);
      consumeResourceInputs(this.player.inventory, inputs);
      this.addToast("Quest resources used");
      this.publishSnapshot();
      if (!Array.isArray(quest.target?.items) || quest.target.items.length <= 0) return;
      }
    }
    if (Array.isArray(quest.target?.items) && quest.target.items.length > 0) {
      for (const req of quest.target.items) {
        let need = Math.max(1, Math.floor(Number(req.count) || 1));
        for (let i = this.player.inventory.length - 1; i >= 0 && need > 0; i -= 1) {
          const it = this.player.inventory[i];
          if (!it) continue;
          let match = true;
          if (req.templateId) match = match && (String(it.uniqueId) === String(req.templateId) || String(it.namedId) === String(req.templateId));
          if (req.namePrefix) match = match && String(it.name || "").startsWith(`${req.namePrefix} `);
          if (req.baseName) match = match && String(it.baseName || "") === String(req.baseName);
          if (req.rarity) match = match && String(it.rarity || "") === String(req.rarity);
          if (match) {
            this.player.inventory.splice(i, 1);
            need -= 1;
          }
        }
      }
      this.addToast("Quest items consumed");
      this.publishSnapshot();
      return;
    }

    // legacy quest items
    for (const target of questItemTargetsForQuest(quest)) {
      const needed = Math.max(1, Math.floor(Number(target.count) || 1));
      let removed = 0;
      for (let i = this.player.inventory.length - 1; i >= 0 && removed < needed; i -= 1) {
        const item = this.player.inventory[i];
        if (!item || item.mode !== "quest") continue;
        if (String(item.questItemId) !== String(target.questItemId)) continue;
        if (questItemStacksByQuestInstance(item.questItemId) && !(item.questInstanceId == null || String(item.questInstanceId) === String(quest.id))) continue;
        if (questItemCanStack(item.questItemId)) {
          const count = Math.max(1, Math.floor(Number(item.count) || 1));
          const used = Math.min(count, needed - removed);
          removed += used;
          const remaining = count - used;
          if (remaining > 0) item.count = remaining;
          else this.player.inventory.splice(i, 1);
        } else {
          removed += 1;
          this.player.inventory.splice(i, 1);
        }
      }
    }
  }
};
