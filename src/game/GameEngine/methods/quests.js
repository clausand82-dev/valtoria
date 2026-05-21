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
  QUEST_DEFS,
  QUEST_NPCS,
  isPotionItem,
  isResourceItem,
  QUEST_INTERACT_RADIUS,
  GROUND_LOOT_DESPAWN_SECONDS
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
  inventoryCanAccept,
  makeQuestInstance,
  isQuestComplete,
  resolveQuestDefById,
} from "../helpers.js";
import { applyWorldEnergy } from "../../world-energy.js";
import { worldConditionMet } from "../../world-state.js";

export const questsMethods = {
  updateQuestgiver() {
    const questgiver = this.questState.wildernessNpc;
    if (questgiver) {
      const interactions = this.getNpcQuestInteractions(questgiver.npcId, "wilderness");
      if (!interactions.offers.length) {
        this.questState.wildernessNpc = null;
        this.nearbyQuestgiver = null;
        this.publishSnapshot();
        return;
      }
    }
    const nearby = questgiver && distance(this.player, questgiver) <= QUEST_INTERACT_RADIUS
      ? questgiver
      : null;
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

  questDefinitionCanOffer(def, npcId, scope = "wilderness") {
    if (!def || !npcId) return false;
    const questSource = String(def.source ?? "npc");
    if (scope === "readable") {
      if (questSource !== "readable") return false;
    } else {
      if (questSource === "readable") return false;
      if (!canNpcStartQuest(def, npcId)) return false;
    }
    if (!def?.repeatable && this.questState.completed.includes(def.id)) return false;
    if (!def?.repeatable && this.questState.active.some((quest) => quest.questId === def.id)) return false;
    if (def?.repeatable && this.questState.active.some((quest) => quest.questId === def.id)) return false;

    const regionIds = Array.isArray(def.regionIds) ? def.regionIds.map(String) : ["city"];
    const hasCityTag = regionIds.includes("city");
    const currentRegionId = String(this.region?.mapRegion?.id ?? "");
    const wildernessRegionIds = regionIds.filter((id) => id !== "city");

    if (scope === "city" || scope === "readable") {
      if (!hasCityTag) return false;
    } else if (regionIds.length > 0) {
      if (hasCityTag && wildernessRegionIds.length === 0) return false;
      if (!currentRegionId) return false;
      if (!wildernessRegionIds.includes(currentRegionId)) return false;
    }

    if (!this.questDemandsMet(def.demands)) return false;
    if (def.requires && !worldConditionMet(def.requires, this.worldState, this.questConditionContext())) return false;
    if (def.blockedBy && worldConditionMet(def.blockedBy, this.worldState, this.questConditionContext())) return false;
    if (scope === "city" && def?.repeatable) {
      if (this.questState.cityOfferRolls?.[def.id] !== npcId) return false;
    }
    if (!this.offerPassesSpawnChance(def, npcId, scope)) return false;

    if (def.id === "vengeance") {
      return this.monsterTypesForCurrentRegion().some((type) => (
        !this.questState.active.some((quest) => quest.questId === "vengeance" && String(quest.target?.monster) === String(type))
      ));
    }
    return true;
  },

  questConditionContext() {
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
      cityInventory: this.cityInventory,
      cityStorage: this.cityStorage ?? this.cityInventory,
      activeMapRegion: this.activeMapRegion,
      mapReturn: this.mapReturn,
      stats: {
        player: this.player,
        worldState: this.worldState,
      },
    };
  },

  monsterTypesForCurrentRegion() {
    const raw = this.region.mapRegion?.mobs?.length
      ? this.region.mapRegion.mobs
      : [];
    return raw.map((entry) => normalizeMonsterType(entry)).filter(Boolean);
  },

  questDemandsMet(demands) {
    if (!demands || typeof demands !== "object") return true;
    const level = Math.max(0, Math.floor(Number(demands.level) || 0));
    if (level > 0 && this.player.level < level) return false;

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
    if (!worldConditionMet(demands, this.worldState, this.questConditionContext())) return false;
    return true;
  },

  countDemandItems(req) {
    if (!req || typeof req !== "object") return 0;
    if (req.resourceId || req.resource) return resourceCount(this.player.inventory, String(req.resourceId ?? req.resource));
    if (req.potionType) {
      const type = String(req.potionType);
      return Math.max(0, Math.floor(Number(this.player.potions?.[type]) || 0));
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

  cityRepeatableNpcCandidates(def) {
    if (!def?.repeatable || String(def.source ?? "npc") === "readable") return [];
    if (this.questState.active.some((quest) => quest.questId === def.id)) return [];

    const regionIds = Array.isArray(def.regionIds) ? def.regionIds.map(String) : ["city"];
    if (!regionIds.includes("city")) return [];
    if (!this.questDemandsMet(def.demands)) return [];

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
      active: this.questState.active.filter((quest) => canNpcTurnInQuest(quest, npcId)),
      offers: this.collectQuestOffers(npcId, scope),
    };
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
    if (!this.grantQuestStartItems(quest)) {
      this.publishSnapshot();
      return false;
    }
    this.questState.active.push(quest);
    if (source === "wilderness" && this.questState.wildernessNpc?.npcId === offer.npcId) {
      const interactions = this.getNpcQuestInteractions(offer.npcId, "wilderness");
      if (interactions.offers.length <= 0) {
        this.questState.wildernessNpc = null;
        this.nearbyQuestgiver = null;
      }
    }
    this.addToast(source === "readable"
      ? `${quest.title} startet fra ${quest.sourceLabel ?? "readable"}`
      : `${QUEST_NPCS[quest.npcId]?.name ?? "NPC"}: ${quest.acceptText}`);
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
    for (const item of pendingItems) {
      if (!inventoryCanAccept(simulated, item)) {
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

  setQuestTracked(instanceId, tracked) {
    const quest = this.questState.active.find((entry) => entry.id === instanceId);
    if (!quest) return false;
    quest.tracked = Boolean(tracked);
    this.publishSnapshot();
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
          const nextKills = { ...(quest.progress?.killObjectives ?? {}) };
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
            quest.progress = { ...(quest.progress ?? {}), killObjectives: nextKills };
            changed = true;
            if (isQuestComplete(quest, this.player.inventory)) this.addToast(`${quest.title} klar til indlevering`);
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
      if (quest.progress.kills >= needed) this.addToast(`${quest.title} klar til indlevering`);
    }
    if (changed) this.publishSnapshot();
  },

  dropQuestLoot(monster) {
    
    for (const quest of this.questState.active) {
      if (quest.type !== "collect_quest_item") continue;
      const questItemTargets = questItemTargetsForQuest(quest);
      for (const target of questItemTargets) {
        if (!target?.questItemId) continue;
        if (!this.questItemCanDropInCurrentRegion(quest, target)) continue;
        if (!this.questItemCanDropFromMonster(target, monster)) continue;
        const needed = Math.max(1, Math.floor(Number(target.count) || 1));
        const picked = questItemCount(this.player.inventory, quest.id, target.questItemId);
        if (picked >= needed) continue;
        const activeDropped = questItemCount(this.loots.map((loot) => loot.item), quest.id, target.questItemId);
        if (picked + activeDropped >= needed) continue;
        // Only allow quest item drops when the target source is explicitly a monster drop
        // or an elite drop. Other sources (rewards, vendor, etc.) should not drop from monsters.
        const source = target.source ?? "monster";
        if (source !== "monster" && source !== "elite") continue;
        if (source === "elite" && !monster.elite) continue;
        const dropChance = Number(target.dropChance ?? 0.05);
      const roll = Math.random();
      // Debug/logging for specific rare quest item to help troubleshooting
      
        if (roll > dropChance) continue;
        const item = makeQuestItem(target.questItemId, quest.id);
        if (!item) continue;
        this.loots.push({
          id: createId(),
          type: "item",
          item,
          x: monster.x + (Math.random() - 0.5) * 0.7,
          y: monster.y + (Math.random() - 0.5) * 0.7,
          bob: Math.random() * Math.PI * 2,
          pickupDelay: 0.25,
          despawn: GROUND_LOOT_DESPAWN_SECONDS,
        });
        this.trackItemDropped(item);
        break;
      }
    }
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

  applyQuestItemPickup(item) {
    const quest = this.questState.active.find((entry) => entry.id === item.questInstanceId);
    if (!quest || quest.type !== "collect_quest_item") return;
    if (isQuestComplete(quest, this.player.inventory)) this.addToast(`${quest.title} klar til indlevering`);
  },

  completeQuest(instanceId, npcId = null) {
    const index = this.questState.active.findIndex((quest) => quest.id === instanceId);
    if (index < 0) return false;
    const quest = this.questState.active[index];
    if (npcId && !canNpcTurnInQuest(quest, npcId)) {
      this.addToast("Denne NPC kan ikke modtage questen");
      this.publishSnapshot();
      return false;
    }
    if (!isQuestComplete(quest, this.player.inventory)) {
      this.addToast(`${quest.title} er ikke faerdig endnu`);
      this.publishSnapshot();
      return false;
    }
    if (!this.questRewardsCanFit(quest)) {
      this.addToast("Rygsaekken er fuld. Lav plads foer questen indleveres");
      this.publishSnapshot();
      return false;
    }

    const rewardSummary = this.grantQuestRewards(quest);
    if (quest.type === "collect_quest_item") this.consumeQuestItems(quest);
    this.questState.active.splice(index, 1);
    if (!quest.repeatable && !this.questState.completed.includes(quest.questId)) {
      this.questState.completed.push(quest.questId);
    }
    if (quest.repeatable && this.questState.cityOfferRolls) delete this.questState.cityOfferRolls[quest.questId];
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
      questInfo: {
        id: quest.id,
        questId: quest.questId,
        title: quest.title,
        type: quest.type,
        regionIds: Array.isArray(quest.regionIds) ? [...quest.regionIds] : [],
        target: { ...(quest.target ?? {}) },
      },
    };
  },

  cleanupObsoleteCompletedQuestItems() {
    if (!Array.isArray(this.player?.inventory)) return;
    if (!this.questState?.completed?.includes("innkeeper_ring_for_noble")) return;
    const activeRingQuest = (this.questState.active ?? []).some((quest) => (
      questItemTargetsForQuest(quest).some((target) => String(target.questItemId) === "ring")
    ));
    if (activeRingQuest) return;
    this.player.inventory = this.player.inventory.filter((item) => !(
      item?.mode === "quest"
      && String(item.questItemId ?? "") === "ring"
    ));
  },

  grantQuestRewards(quest) {
    const rewards = quest.rewards ?? {};
    const baseXp = Math.max(0, Math.floor(Number(rewards.xp) || ((rewards.xpPerKill ?? 0) * (quest.target?.count ?? 0))));
    const xp = this.modifiedXp?.(baseXp) ?? baseXp;
    const gold = Math.max(0, Math.floor(Number(rewards.gold) || ((rewards.goldPerKill ?? 0) * (quest.target?.count ?? 0))));
    const summary = {
      xp,
      gold,
      lydra: 0,
      netdra: 0,
      resources: [],
      items: [],
    };
    if (rewards.lydra || rewards.netdra) {
      applyWorldEnergy(this, { lydra: rewards.lydra, netdra: rewards.netdra });
      summary.lydra = Number(rewards.lydra) || 0;
      summary.netdra = Number(rewards.netdra) || 0;
      if (summary.lydra) this.addFloater(this.player.x, this.player.y, `+${summary.lydra} Ly'dra'thot`, "#eaf4ff", 1);
      if (summary.netdra) this.addFloater(this.player.x, this.player.y, `+${summary.netdra} Net'dra'thot`, "#b8a4ff", 1);
    }
    if (xp) {
      this.player.xp += xp;
      this.addFloater(this.player.x, this.player.y, `+${xp} xp`, "#e0aa3f", 1);
    }
    if (gold) {
      this.player.gold += gold;
      this.player.stats.goldEarned += gold;
      this.addFloater(this.player.x, this.player.y, `+${gold} g`, "#f1c657", 1);
    }
    for (const reward of rewards.resources ?? []) {
      const resource = makeResourceItem(reward.resource, reward.count ?? 1);
      if (resource) {
        this.addInventoryItem(resource);
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
      summary.items.push({
        id: item.id,
        name: item.name,
        rarity: item.rarity,
      });
    }
    // grant quest items if present in rewards
    if (Array.isArray(rewards.questItems) && rewards.questItems.length > 0) {
      for (const q of rewards.questItems) {
        const count = Math.max(1, Math.floor(Number(q.count) || 1));
        for (let i = 0; i < count; i += 1) {
          const qi = makeQuestItem(q.questItemId, null);
          if (qi && this.addInventoryItem(qi)) {
            summary.items.push({ id: qi.id, name: qi.name, rarity: qi.rarity });
          }
        }
      }
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
      if (resource && !inventoryCanAccept(simulated, resource)) return false;
    }
    if (quest.rewards?.randomItem && simulated.length >= MAX_INVENTORY) return false;
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

  consumeQuestItems(quest) {
    // consume resources or specific items if defined, otherwise fallback to quest items
    if (Array.isArray(quest.target?.resources) && quest.target.resources.length > 0) {
      const inputs = {};
      for (const r of quest.target.resources) inputs[r.resource] = (inputs[r.resource] || 0) + (r.count ?? 1);
      consumeResourceInputs(this.player.inventory, inputs);
      this.addToast("Quest resources used");
      this.publishSnapshot();
      return;
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
      this.player.inventory = this.player.inventory.filter((item) => {
        // keep item if it's not a matching quest item for this quest
        if (removed >= needed) return true;
        if (!item || item.mode !== "quest") return true;
        if (String(item.questItemId) !== String(target.questItemId)) return true;
        // only remove if item is bound to this quest instance OR it's a global quest item (null/undefined)
        if (!(item.questInstanceId == null || String(item.questInstanceId) === String(quest.id))) return true;
        // remove this item
        removed += 1;
        return false;
      });
    }
  }
};
