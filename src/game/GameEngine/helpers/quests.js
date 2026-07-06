import {
  createId,
  QUEST_CONFIG,
  QUEST_BOARD_CONFIG,
  QUEST_DEFS,
  QUEST_ITEM_DEFS,
  QUEST_NPCS,
  RESOURCE_DEFS,
  withItemFlags,
  withItemIcon
} from "../dependencies.js";
import { resourceCount } from "./items.js";

const QUEST_DEF_BY_ID = new Map(
  Object.values(QUEST_DEFS)
    .filter((def) => def && typeof def === "object" && def.id)
    .map((def) => [String(def.id), def]),
);

function normalizeQuestBoardState(rawBoard) {
  const raw = rawBoard && typeof rawBoard === "object" && !Array.isArray(rawBoard) ? rawBoard : {};
  const availableQuestIds = Array.isArray(raw.availableQuestIds)
    ? raw.availableQuestIds.map(String).filter(Boolean)
    : [];
  const completedCooldowns = raw.completedCooldowns && typeof raw.completedCooldowns === "object" && !Array.isArray(raw.completedCooldowns)
    ? Object.fromEntries(
      Object.entries(raw.completedCooldowns)
        .map(([questId, value]) => [String(questId), Math.max(0, Math.floor(Number(value) || 0))])
        .filter(([questId]) => Boolean(questId)),
    )
    : {};
  return {
    availableQuestIds: [...new Set(availableQuestIds)],
    completedCooldowns,
  };
}

export function normalizeQuestBoards(rawBoards = {}) {
  const boards = {};
  for (const boardId of Object.keys(QUEST_BOARD_CONFIG ?? {})) {
    boards[boardId] = normalizeQuestBoardState(rawBoards?.[boardId]);
  }
  return boards;
}

export function resolveQuestDefById(questId) {
  if (!questId) return null;
  const id = String(questId);
  return QUEST_DEF_BY_ID.get(id) ?? QUEST_DEFS[id] ?? null;
}

export function resolveQuestRewards(quest = {}, def = resolveQuestDefById(quest?.questId)) {
  const configured = def?.rewards && typeof def.rewards === "object" ? def.rewards : {};
  const saved = quest?.rewards && typeof quest.rewards === "object" ? quest.rewards : {};
  const configuredCityProgress = configured.cityProgress && typeof configured.cityProgress === "object"
    ? configured.cityProgress
    : null;
  const savedCityProgress = saved.cityProgress && typeof saved.cityProgress === "object"
    ? saved.cityProgress
    : null;
  const cityProgress = def ? configuredCityProgress : savedCityProgress;
  return {
    ...configured,
    ...saved,
    ...(cityProgress ? { cityProgress: { ...cityProgress } } : {}),
    ...(!cityProgress && def ? { cityProgress: undefined } : {}),
  };
}

function normalizeNpcIdList(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value === null || value === undefined) return [];
  const single = String(value);
  return single ? [single] : [];
}

function uniqueNpcIds(ids) {
  return [...new Set((ids ?? []).map(String).filter(Boolean))];
}

export function getQuestStartNpcIds(quest) {
  if (!quest || typeof quest !== "object") return [];
  const explicit = uniqueNpcIds([
    ...normalizeNpcIdList(quest.startNpcIds),
    ...normalizeNpcIdList(quest.giverNpcIds),
    ...normalizeNpcIdList(quest.startNpcId),
  ]);
  if (explicit.length > 0) return explicit;
  const legacy = uniqueNpcIds([
    ...normalizeNpcIdList(quest.npcIds),
    ...normalizeNpcIdList(quest.npcId),
  ]);
  return legacy;
}

export function getQuestTurnInNpcIds(quest) {
  if (!quest || typeof quest !== "object") return [];
  const explicit = uniqueNpcIds([
    ...normalizeNpcIdList(quest.turnInNpcIds),
    ...normalizeNpcIdList(quest.completeNpcIds),
    ...normalizeNpcIdList(quest.turnInNpcId),
  ]);
  if (explicit.length > 0) return explicit;
  const legacy = uniqueNpcIds([
    ...normalizeNpcIdList(quest.npcIds),
    ...normalizeNpcIdList(quest.npcId),
  ]);
  return legacy;
}

export function questHasSteps(quest) {
  return Array.isArray(quest?.steps) && quest.steps.length > 0;
}

export function actionTargetGroupsForQuest(quest) {
  const target = quest?.target ?? {};
  const rawGroups = Array.isArray(target.groups) && target.groups.length
    ? target.groups
    : target.questTargetKey
      ? [{ questTargetKey: target.questTargetKey, label: target.label }]
      : [];
  const seen = new Set();
  return rawGroups
    .map((group) => ({
      questTargetKey: String(group?.questTargetKey ?? "").trim(),
      label: String(group?.label ?? target.label ?? "maal repareret"),
    }))
    .filter((group) => group.questTargetKey && !seen.has(group.questTargetKey) && seen.add(group.questTargetKey));
}

// Step quests expose only the active step through the legacy quest fields.
export function currentQuestStep(quest) {
  if (!questHasSteps(quest)) return null;
  const currentId = String(quest.progress?.currentStepId ?? quest.currentStepId ?? "");
  return quest.steps.find((step) => String(step?.id ?? "") === currentId) ?? quest.steps[0] ?? null;
}

function stepOrQuest(quest) {
  return currentQuestStep(quest) ?? quest;
}

export function canNpcStartQuest(quest, npcId) {
  if (!quest || !npcId) return false;
  const source = String(quest.source ?? "npc");
  if (source === "readable") return false;
  return getQuestStartNpcIds(quest).includes(String(npcId));
}

export function canNpcTurnInQuest(quest, npcId) {
  if (!quest || !npcId) return false;
  return getQuestTurnInNpcIds(stepOrQuest(quest)).includes(String(npcId));
}

export function normalizeMonsterType(entry) {
  if (!entry) return null;
  if (typeof entry === "string") return entry;
  if (typeof entry === "object") {
    if (entry.type) return String(entry.type);
    if (entry.id) return String(entry.id);
    if (entry.name) return String(entry.name);
  }
  return null;
}

export function makeQuestItem(questItemId, questInstanceId) {
  const def = QUEST_ITEM_DEFS[questItemId];
  if (!def) return null;
  const stackMax = questItemStackMax(questItemId);
  const stackable = questItemCanStack(questItemId);
  return withItemIcon(withItemFlags({
    id: createId(),
    name: def.name,
    baseName: def.name,
    questItemId,
    questInstanceId,
    rarity: "unique",
    rarityLabel: "Quest",
    rarityColor: "#ffcf5a",
    slot: "quest",
    mode: "quest",
    level: 1,
    damageMin: 0,
    damageMax: 0,
    range: 0,
    cooldown: 0,
    armor: 0,
    maxHp: 0,
    maxMana: 0,
    speed: 0,
    magic: 0,
    iconUrl: def.iconUrl ?? QUEST_CONFIG.questItemIconPlaceholder,
    count: stackable ? 1 : undefined,
    stackMax: stackable ? stackMax : undefined,
    value: 0,
  }, {
    quest: true,
    questBound: true,
    stackable,
  }));
}

export function questItemCanStack(questItemId) {
  const def = QUEST_ITEM_DEFS[questItemId];
  return Boolean(def?.stackable) && questItemStackMax(questItemId) > 1;
}

export function questItemStackMax(questItemId) {
  const def = QUEST_ITEM_DEFS[questItemId];
  return Math.max(1, Math.floor(Number(def?.stackMax) || 1));
}

export function questItemStacksByQuestInstance(questItemId) {
  const def = QUEST_ITEM_DEFS[questItemId];
  return Boolean(def?.stackByQuestInstance);
}

export function questItemsCanStack(incoming, target) {
  if (!incoming || !target) return false;
  if (incoming.mode !== "quest" || target.mode !== "quest") return false;
  if (String(incoming.questItemId ?? "") !== String(target.questItemId ?? "")) return false;
  if (!questItemCanStack(incoming.questItemId)) return false;
  if (questItemStacksByQuestInstance(incoming.questItemId)) {
    const incomingInstance = incoming.questInstanceId == null ? "" : String(incoming.questInstanceId);
    const targetInstance = target.questInstanceId == null ? "" : String(target.questInstanceId);
    if (incomingInstance !== targetInstance) return false;
  }
  return Math.max(1, Math.floor(Number(target.count) || 1)) < questItemStackMax(target.questItemId);
}

export function questItemTargetsForQuest(quest) {
  const activeStep = currentQuestStep(quest);
  const defTarget = activeStep ? {} : resolveQuestDefById(quest?.questId)?.target ?? {};
  const target = quest?.target ?? {};
  const targets = [];
  const questItems = Array.isArray(defTarget.questItems)
    ? defTarget.questItems
    : Array.isArray(target.questItems)
      ? target.questItems
      : [];
  if (questItems.length) {
    targets.push(
      ...questItems
        .filter((entry) => entry?.questItemId)
        .map((entry) => ({
          questItemId: entry.questItemId,
          count: entry.count ?? 1,
          source: entry.source,
          dropChance: entry.dropChance,
          regionIds: entry.regionIds,
          dropRegionIds: entry.dropRegionIds,
          monsterTypes: entry.monsterTypes,
          sourceObjectId: entry.sourceObjectId,
          sourceObjectIds: entry.sourceObjectIds,
          sourceTags: entry.sourceTags,
          sourceObjectTags: entry.sourceObjectTags,
        })),
    );
  }

  const questItemId = defTarget.questItemId ?? target.questItemId;
  if (questItemId) {
    targets.push({
      questItemId,
      count: target.count ?? defTarget.count ?? 1,
      source: target.source ?? defTarget.source,
      dropChance: target.dropChance ?? defTarget.dropChance,
      regionIds: target.regionIds ?? defTarget.regionIds,
      dropRegionIds: target.dropRegionIds ?? defTarget.dropRegionIds,
      monsterTypes: target.monsterTypes ?? defTarget.monsterTypes,
      sourceObjectId: target.sourceObjectId ?? defTarget.sourceObjectId,
      sourceObjectIds: target.sourceObjectIds ?? defTarget.sourceObjectIds,
      sourceTags: target.sourceTags ?? defTarget.sourceTags,
      sourceObjectTags: target.sourceObjectTags ?? defTarget.sourceObjectTags,
    });
  }
  return targets;
}

export function questItemCount(items, questInstanceId, questItemId) {
  const requiresInstance = questItemStacksByQuestInstance(questItemId);
  return (items ?? []).reduce((sum, item) => (
    item?.mode === "quest"
    && String(item.questItemId) === String(questItemId)
    && (!requiresInstance || item.questInstanceId == null || String(item.questInstanceId) === String(questInstanceId))
      ? sum + Math.max(1, Math.floor(Number(item.count) || 1))
      : sum
  ), 0);
}

export function questConsumesQuestItem(quest, item) {
  if (!item || item.mode !== "quest") return false;
  // allow quest items that are bound to this quest instance OR global (null/undefined)
  if (questItemStacksByQuestInstance(item.questItemId) && !(item.questInstanceId == null || String(item.questInstanceId) === String(quest?.id))) return false;
  return questItemTargetsForQuest(quest).some((target) => String(target.questItemId) === String(item.questItemId));
}

function withoutQuestDisplayText(source = {}) {
  const {
    story: _story,
    acceptText: _acceptText,
    turnInText: _turnInText,
    ...rest
  } = source;
  return rest;
}

export function questSavePayload(quest) {
  const payload = withoutQuestDisplayText(quest);
  return {
    ...payload,
    progress: { ...(quest?.progress ?? {}) },
    steps: Array.isArray(quest?.steps)
      ? quest.steps.map((step) => withoutQuestDisplayText(step))
      : quest?.steps,
  };
}

export function makeQuestInstance(def, npcId, context = {}) {
  const steps = Array.isArray(def.steps) ? def.steps.map((step) => ({ ...step })) : undefined;
  const firstStep = steps?.[0] ?? null;
  const firstStepId = firstStep?.id ? String(firstStep.id) : "";
  const activeDef = firstStep ?? def;
  const startNpcIds = getQuestStartNpcIds(activeDef).length ? getQuestStartNpcIds(activeDef) : getQuestStartNpcIds(def);
  const turnInNpcIds = getQuestTurnInNpcIds(activeDef).length ? getQuestTurnInNpcIds(activeDef) : getQuestTurnInNpcIds(def);
  const startNpcId = String(context.startNpcId ?? npcId ?? startNpcIds[0] ?? turnInNpcIds[0] ?? "");
  const turnInNpcId = String(context.turnInNpcId ?? turnInNpcIds[0] ?? startNpcId);
  const npc = QUEST_NPCS[startNpcId];
  const uid = createId();
  const regionIds = Array.isArray(activeDef?.regionIds)
    ? activeDef.regionIds.map(String)
    : Array.isArray(def?.regionIds)
      ? def.regionIds.map(String)
      : ["city"];
  const source = context.source ? String(context.source) : String(def.source ?? "npc");
  const sourceLabel = context.sourceLabel
    ? String(context.sourceLabel)
    : source === "readable"
      ? `Readable: ${context.readableTitle ?? "Ukendt tekst"}`
      : undefined;
  const sourceFields = {
    source,
    sourceLabel,
    sourceReadableId: context.readableId ? String(context.readableId) : undefined,
  };
  if (def.id === "vengeance") {
    const monster = normalizeMonsterType(context.monster) ?? "monstre";
    const count = Math.max(1, Math.floor(Number(context.count) || def.target.countMin || 5));
    return {
      id: `${def.id}:${monster}:${context.regionSeed}:${context.regionIndex}:${uid}`,
      questId: def.id,
      npcId: startNpcId,
      startNpcId,
      turnInNpcId,
      startNpcIds,
      turnInNpcIds,
      title: def.titleTemplate.replace("{monster}", monster),
      repeatable: true,
      kind: def.kind,
      category: def.category,
      cooldownMapRuns: def.cooldownMapRuns,
      type: def.type,
      regionIds,
      story: def.storyTemplate.replace("{npcName}", npc?.name ?? "En questgiver").replace("{monster}", monster),
      acceptText: def.acceptTextTemplate.replace("{count}", count).replace("{monster}", monster),
      turnInText: def.turnInTextTemplate,
      target: { monster, count, allowElite: true },
      progress: { kills: 0 },
      rewards: { ...def.rewards },
      ...sourceFields,
    };
  }

  return {
    id: `${def.id}:${context.regionSeed}:${context.regionIndex}:${uid}`,
    questId: def.id,
    npcId: startNpcId,
    startNpcId,
    turnInNpcId,
    startNpcIds,
    turnInNpcIds,
    title: def.title,
    repeatable: Boolean(def.repeatable),
    kind: def.kind,
    category: def.category,
    cooldownMapRuns: def.cooldownMapRuns,
    hideActiveInCity: Boolean(def.hideActiveInCity),
    type: activeDef.type ?? def.type,
    regionIds,
    story: activeDef.story ?? def.story,
    acceptText: activeDef.acceptText ?? def.acceptText,
    turnInText: activeDef.turnInText ?? def.turnInText,
    target: { ...(activeDef.target ?? def.target) },
      progress: steps?.length > 0
      ? {
        currentStepId: firstStepId,
        completedStepIds: [],
        revealedStepIds: [firstStepId].filter(Boolean),
        stepProgress: firstStepId ? { [firstStepId]: {} } : {},
      }
      : def.type === "collect_quest_item"
        ? { items: 0 }
        : def.type === "clear_map"
          ? { kills: 0, total: null, cleared: false }
          : def.type === "action_targets"
            ? { done: 0, total: null, targets: {} }
          : def.type === "region_object_count"
            ? { [String(def.target?.progressField ?? "count")]: 0 }
          : def.type === "talk_to_npc"
            ? { talked: false }
            : {},
    steps,
    completeWhen: def.completeWhen ? { ...def.completeWhen } : undefined,
    onStart: def.onStart ? { ...def.onStart } : undefined,
    onComplete: def.onComplete ? { ...def.onComplete } : undefined,
    autoComplete: Boolean(def.autoComplete),
    rewards: { ...(activeDef.rewards ?? def.rewards) },
    ...sourceFields,
  };
}

export function isQuestComplete(quest, inventory = []) {
  if (quest?.progress?.complete === true) return true;
  if (Array.isArray(quest.steps) && quest.steps.length > 0) {
    const step = currentQuestStep(quest);
    if (!step) return false;
    const currentStepId = String(step.id ?? "");
    if ((quest.progress?.completedStepIds ?? []).map(String).includes(currentStepId)) return true;
    const stepQuest = {
      ...quest,
      steps: undefined,
      type: step.type ?? quest.type,
      target: { ...(step.target ?? quest.target ?? {}) },
      progress: quest.progress?.stepProgress?.[currentStepId] ?? quest.progress ?? {},
    };
    return isQuestComplete(stepQuest, inventory);
  }
  if (quest.type === "clear_map") {
    return quest.progress?.cleared === true;
  }
  if (quest.type === "action_targets") {
    if (quest.progress?.complete === true) return true;
    const total = Math.max(0, Math.floor(Number(quest.progress?.total) || 0));
    const done = Math.max(0, Math.floor(Number(quest.progress?.done) || 0));
    return quest.progress?.total !== null && quest.progress?.total !== undefined && total > 0 && done >= total;
  }
  if (quest.type === "region_object_count") {
    const field = String(quest.target?.progressField ?? "count");
    return Math.max(0, Math.floor(Number(quest.progress?.[field]) || 0)) >= Math.max(1, Math.floor(Number(quest.target?.count) || 1));
  }
  if (quest.type === "kill_monsters") {
    return Math.max(0, Math.floor(Number(quest.progress?.kills) || 0)) >= Math.max(1, Math.floor(Number(quest.target?.count) || 1));
  }
  if (quest.type === "talk_to_npc") {
    return quest.progress?.talked === true;
  }
  if (quest.type === "collect_quest_item") {
    let hasAnyRequirement = false;
    // legacy quest that uses quest items dropped/picked up
    const questItemTargets = questItemTargetsForQuest(quest);
    if (questItemTargets.length > 0) {
      hasAnyRequirement = true;
      if (!questItemTargets.every((target) => (
        questItemCount(inventory, quest.id, target.questItemId) >= Math.max(1, Math.floor(Number(target.count) || 1))
      ))) return false;
    }
    // resource-based or specific-item requirements: evaluate against current inventory
    const inv = Array.isArray(inventory) ? inventory : (quest._cachedInventory || []);
    inventory = inv;
    // resources
    if (Array.isArray(quest.target?.resources) && quest.target.resources.length > 0) {
      hasAnyRequirement = true;
      if (!quest.target.resources.every((r) => resourceCount(inventory, r.resource) >= (r.count ?? 1))) return false;
    }
    // specific items
    if (Array.isArray(quest.target?.items) && quest.target.items.length > 0) {
      hasAnyRequirement = true;
      for (const req of quest.target.items) {
        let needed = Math.max(1, Math.floor(Number(req.count) || 1));
        for (const item of inventory) {
          if (needed <= 0) break;
          if (!item) continue;
          let match = true;
          if (req.templateId) match = match && (String(item.uniqueId) === String(req.templateId) || String(item.namedId) === String(req.templateId));
          if (req.namePrefix) match = match && String(item.name || "").startsWith(`${req.namePrefix} `);
          if (req.baseName) match = match && String(item.baseName || "") === String(req.baseName);
          if (req.rarity) match = match && String(item.rarity || "") === String(req.rarity);
          if (match) needed -= 1;
        }
        if (needed > 0) return false;
      }
    }
    if (Array.isArray(quest.target?.killObjectives) && quest.target.killObjectives.length > 0) {
      hasAnyRequirement = true;
      const killCounts = quest.progress?.killObjectives ?? {};
      const allDone = quest.target.killObjectives.every((objective) => {
        const key = String(objective?.id ?? objective?.key ?? objective?.monsterType ?? objective?.monster ?? "kill");
        const needed = Math.max(1, Math.floor(Number(objective?.count) || 1));
        const current = Math.max(0, Math.floor(Number(killCounts[key]) || 0));
        return current >= needed;
      });
      if (!allDone) return false;
    }
    return hasAnyRequirement;
  }
  return false;
}

export function questSnapshot(quest, inventory = []) {
  if (!quest) return null;
  const step = currentQuestStep(quest);
  const startNpcId = String(quest.startNpcId ?? step?.startNpcIds?.[0] ?? quest.npcId ?? "");
  const turnInNpcId = String(quest.turnInNpcId ?? getQuestTurnInNpcIds(step ?? quest)[0] ?? startNpcId);
  const startNpc = QUEST_NPCS[startNpcId];
  const turnInNpc = QUEST_NPCS[turnInNpcId];
  // prefer provided inventory, otherwise fallback to cached inventory on quest
  const inv = Array.isArray(inventory) && inventory.length ? inventory : (quest._cachedInventory || []);
  const complete = isQuestComplete(quest, inv);
  return {
    ...quest,
    startNpcId,
    turnInNpcId,
    startNpcName: startNpc?.name ?? startNpcId,
    startNpcTitle: startNpc?.title ?? "Questgiver",
    startNpcImageUrl: startNpc?.imageUrl,
    turnInNpcName: turnInNpc?.name ?? turnInNpcId,
    turnInNpcTitle: turnInNpc?.title ?? "Questgiver",
    turnInNpcImageUrl: turnInNpc?.imageUrl,
    npcName: turnInNpc?.name ?? turnInNpcId,
    npcTitle: turnInNpc?.title ?? "Questgiver",
    npcImageUrl: turnInNpc?.imageUrl,
    source: quest.source ?? "npc",
    sourceLabel: quest.sourceLabel,
    sourceReadableId: quest.sourceReadableId,
    complete,
    progressText: questProgressText(quest, inv),
    visibleSteps: visibleQuestSteps(quest),
    currentStepId: quest.progress?.currentStepId ?? null,
    currentStepTitle: step?.title ?? null,
  };
}

export function visibleQuestSteps(quest) {
  if (!Array.isArray(quest?.steps) || quest.steps.length <= 0) return [];
  const completed = new Set((quest.progress?.completedStepIds ?? []).map(String));
  const revealed = new Set((quest.progress?.revealedStepIds ?? []).map(String));
  return quest.steps
    .filter((step) => completed.has(String(step.id)) || revealed.has(String(step.id)))
    .map((step) => ({
      id: String(step.id),
      title: step.title ?? step.id,
      completed: completed.has(String(step.id)),
      current: String(quest.progress?.currentStepId ?? "") === String(step.id),
    }));
}

export function questProgressText(quest, inventory = []) {
  if (Array.isArray(quest.steps) && quest.steps.length > 0) {
    const current = visibleQuestSteps(quest).find((step) => !step.completed);
    const step = currentQuestStep(quest);
    if (current && step) {
      const detail = questProgressText({
        ...quest,
        steps: undefined,
        type: step.type ?? quest.type,
        target: { ...(step.target ?? quest.target ?? {}) },
        progress: quest.progress?.stepProgress?.[String(step.id ?? "")] ?? quest.progress ?? {},
      }, inventory);
      return detail ? `${current.title}: ${detail}` : current.title;
    }
    return quest.progress?.complete ? "Klar" : "";
  }
  if (quest.type === "clear_map") {
    if (quest.progress?.cleared) return "Ryddet – klar til indlevering";
    const kills = Math.max(0, Math.floor(Number(quest.progress?.kills) || 0));
    const total = quest.progress?.total ?? "?";
    const label = quest.target?.label ?? resolveQuestDefById(quest.questId)?.target?.label ?? "monstre";
    return `${kills} / ${total} ${label}`;
  }
  if (quest.type === "action_targets") {
    const groups = actionTargetGroupsForQuest(quest);
    if (groups.length > 1) {
      return groups.map((group) => {
        const progress = quest.progress?.targets?.[group.questTargetKey] ?? {};
        const done = Math.max(0, Math.floor(Number(progress.done) || 0));
        const total = progress.total ?? "?";
        return `${done} / ${total} ${group.label}`;
      }).join(", ");
    }
    const done = Math.max(0, Math.floor(Number(quest.progress?.done) || 0));
    const total = quest.progress?.total ?? "?";
    return `${done} / ${total} ${quest.target?.label ?? "maal repareret"}`;
  }
  if (quest.type === "region_object_count") {
    const field = String(quest.target?.progressField ?? "count");
    const done = Math.max(0, Math.floor(Number(quest.progress?.[field]) || 0));
    const total = Math.max(1, Math.floor(Number(quest.target?.count) || 1));
    return `${done} / ${total} ${quest.target?.label ?? "placed"}`;
  }
  if (quest.type === "kill_monsters") {
    return `${Math.max(0, Math.floor(Number(quest.progress?.kills) || 0))} / ${Math.max(1, Math.floor(Number(quest.target?.count) || 1))} ${quest.target?.monster ?? "kills"}`;
  }
  if (quest.type === "talk_to_npc") {
    if (quest.progress?.talked) return "Klar";
    const targetNpcIds = Array.isArray(quest.target?.targetNpcIds)
      ? quest.target.targetNpcIds
      : quest.target?.targetNpcId
        ? [quest.target.targetNpcId]
        : [];
    const names = targetNpcIds.map((npcId) => QUEST_NPCS[npcId]?.name ?? npcId).join(", ");
    return quest.target?.text ?? (names ? `Tal med ${names}` : "Tal med den rette NPC");
  }
  if (quest.type === "collect_quest_item") {
    // legacy quest item progress
    const parts = [];
    for (const target of questItemTargetsForQuest(quest)) {
      const item = QUEST_ITEM_DEFS[target.questItemId];
      parts.push(`${questItemCount(inventory, quest.id, target.questItemId)} / ${Math.max(1, Math.floor(Number(target.count) || 1))} ${item?.name ?? target.questItemId}`);
    }
    // resources
    if (Array.isArray(quest.target?.resources) && quest.target.resources.length > 0) {
      parts.push(...quest.target.resources.map((r) => {
        const resourceId = String(r.resource ?? r.resourceId ?? "");
        const resourceName = RESOURCE_DEFS[resourceId]?.name ?? resourceId;
        return `${resourceCount(inventory, resourceId)} / ${r.count ?? 1} ${resourceName}`;
      }));
    }
    // specific items
    if (Array.isArray(quest.target?.items) && quest.target.items.length > 0) {
      parts.push(...quest.target.items.map((req) => {
        // count matching items in inventory
        let have = 0;
        for (const item of inventory) {
          let match = true;
          if (req.templateId) match = match && (String(item.uniqueId) === String(req.templateId) || String(item.namedId) === String(req.templateId));
          if (req.namePrefix) match = match && String(item.name || "").startsWith(`${req.namePrefix} `);
          if (req.baseName) match = match && String(item.baseName || "") === String(req.baseName);
          if (req.rarity) match = match && String(item.rarity || "") === String(req.rarity);
          if (match) have += 1;
        }
        return `${have} / ${req.count ?? 1} ${req.templateId ?? req.namePrefix ?? req.baseName ?? "item"}`;
      }));
    }
    if (Array.isArray(quest.target?.killObjectives) && quest.target.killObjectives.length > 0) {
      const killCounts = quest.progress?.killObjectives ?? {};
      parts.push(...quest.target.killObjectives.map((objective) => {
        const key = String(objective?.id ?? objective?.key ?? objective?.monsterType ?? objective?.monster ?? "kill");
        const label = objective?.label
          ?? (Array.isArray(objective?.monsterTypes) && objective.monsterTypes.length > 0
            ? objective.monsterTypes.join("/")
            : objective?.monsterType ?? objective?.monster ?? key);
        const needed = Math.max(1, Math.floor(Number(objective?.count) || 1));
        const current = Math.max(0, Math.floor(Number(killCounts[key]) || 0));
        return `${current} / ${needed} ${label}`;
      }));
    }
    return parts.join(", ");
  }
  return "";
}

export function normalizeSavedQuestState(saved) {
  const rawActive = Array.isArray(saved?.active)
    ? saved.active
      .filter((quest) => quest && typeof quest === "object" && quest.id && quest.questId && quest.npcId)
      .map((quest) => {
        const def = resolveQuestDefById(quest.questId);
        const defStartNpcIds = getQuestStartNpcIds(def);
        const defTurnInNpcIds = getQuestTurnInNpcIds(def);
        const startNpcId = String(quest.startNpcId ?? quest.npcId ?? defStartNpcIds[0] ?? defTurnInNpcIds[0] ?? "");
        const turnInNpcId = String(quest.turnInNpcId ?? defTurnInNpcIds[0] ?? startNpcId);
        const base = {
          ...quest,
          id: String(quest.id),
          questId: String(quest.questId),
          npcId: startNpcId,
          startNpcId,
          turnInNpcId,
          startNpcIds: getQuestStartNpcIds(quest).length > 0 ? getQuestStartNpcIds(quest) : defStartNpcIds,
          turnInNpcIds: getQuestTurnInNpcIds(quest).length > 0 ? getQuestTurnInNpcIds(quest) : defTurnInNpcIds,
          type: String(quest.type ?? def?.type ?? ""),
          repeatable: Boolean(quest.repeatable),
          turnInText: String(def?.turnInText ?? quest.turnInText ?? ""),
          target: { ...(quest.target ?? {}) },
          progress: { ...(quest.progress ?? {}) },
          rewards: resolveQuestRewards(quest, def),
          steps: Array.isArray(def?.steps)
            ? def.steps.map((step) => ({ ...step }))
            : Array.isArray(quest.steps)
              ? quest.steps.map((step) => ({ ...step }))
              : undefined,
          completeWhen: quest.completeWhen ?? def?.completeWhen,
          onStart: quest.onStart ?? def?.onStart,
          onComplete: quest.onComplete ?? def?.onComplete,
          autoComplete: Boolean(quest.autoComplete ?? def?.autoComplete),
          source: String(quest.source ?? def?.source ?? "npc"),
          kind: quest.kind ?? def?.kind,
          category: quest.category ?? def?.category,
          cooldownMapRuns: quest.cooldownMapRuns ?? def?.cooldownMapRuns,
          sourceLabel: quest.sourceLabel ? String(quest.sourceLabel) : undefined,
          sourceReadableId: quest.sourceReadableId ? String(quest.sourceReadableId) : undefined,
          regionIds: Array.isArray(quest.regionIds)
            ? quest.regionIds.map(String)
            : Array.isArray(def?.regionIds)
              ? def.regionIds.map(String)
              : ["city"],
        };

        // Always coerce basic text fields to strings
        base.title = String(def?.title ?? quest.title ?? quest.questId);
        base.story = String(def?.story ?? quest.story ?? "");
        base.acceptText = String(def?.acceptText ?? quest.acceptText ?? "");

        if (Array.isArray(base.steps) && base.steps.length > 0) {
          const completed = Array.isArray(base.progress.completedStepIds) ? base.progress.completedStepIds.map(String) : [];
          const revealed = Array.isArray(base.progress.revealedStepIds) ? base.progress.revealedStepIds.map(String) : [];
          let currentStepId = String(base.progress.currentStepId ?? base.currentStepId ?? "");
          if (!revealed.length) {
            const first = base.steps.find((step) => step?.revealed) ?? base.steps[0];
            if (first?.id) revealed.push(String(first.id));
          }
          if (!currentStepId) {
            currentStepId = base.steps.find((step) => !completed.includes(String(step?.id ?? "")))?.id
              ?? base.steps[base.steps.length - 1]?.id
              ?? "";
          }
          const activeStep = base.steps.find((step) => String(step?.id ?? "") === String(currentStepId)) ?? base.steps[0];
          const activeStartNpcIds = getQuestStartNpcIds(activeStep).length ? getQuestStartNpcIds(activeStep) : defStartNpcIds;
          const activeTurnInNpcIds = getQuestTurnInNpcIds(activeStep).length ? getQuestTurnInNpcIds(activeStep) : defTurnInNpcIds;
          base.startNpcIds = activeStartNpcIds;
          base.turnInNpcIds = activeTurnInNpcIds;
          base.startNpcId = activeStartNpcIds[0] ?? base.startNpcId;
          base.npcId = base.startNpcId;
          base.turnInNpcId = activeTurnInNpcIds[0] ?? base.turnInNpcId;
          base.type = String(activeStep?.type ?? base.type ?? "");
          base.regionIds = Array.isArray(activeStep?.regionIds) ? activeStep.regionIds.map(String) : base.regionIds;
          base.story = String(activeStep?.story ?? base.story ?? "");
          base.acceptText = String(activeStep?.acceptText ?? base.acceptText ?? "");
          base.turnInText = String(activeStep?.turnInText ?? base.turnInText ?? "");
          base.target = { ...(activeStep?.target ?? base.target ?? {}) };
          base.rewards = { ...(activeStep?.rewards ?? base.rewards ?? {}) };
          base.progress = {
            ...base.progress,
            currentStepId: String(currentStepId),
            completedStepIds: [...new Set(completed)],
            revealedStepIds: [...new Set(revealed)],
            stepProgress: base.progress.stepProgress && typeof base.progress.stepProgress === "object"
              ? { ...base.progress.stepProgress }
              : {},
          };
        }

        // Backfill missing collect_quest_item target fields from QUEST_DEFS.
        // This keeps old saves compatible when new constraints (for example
        // dropRegionIds) are added to quest targets in config.
        if (base.type === "collect_quest_item" && def?.target && typeof def.target === "object") {
          const savedTarget = base.target && typeof base.target === "object" ? base.target : {};
          const defTarget = def.target;
          const mergedTarget = { ...savedTarget };

          const scalarKeys = ["questItemId", "count", "source", "dropChance", "regionId", "dropRegionIds", "sourceObjectId", "sourceObjectIds", "sourceTags", "sourceObjectTags"];
          for (const key of scalarKeys) {
            if (mergedTarget[key] === undefined && defTarget[key] !== undefined) {
              mergedTarget[key] = defTarget[key];
            }
          }

          if (defTarget.dropRegionIds !== undefined) {
            mergedTarget.dropRegionIds = Array.isArray(defTarget.dropRegionIds)
              ? defTarget.dropRegionIds.map(String)
              : defTarget.dropRegionIds;
          }

          if (mergedTarget.regionIds === undefined && defTarget.regionIds !== undefined) {
            mergedTarget.regionIds = Array.isArray(defTarget.regionIds)
              ? defTarget.regionIds.map(String)
              : defTarget.regionIds;
          }

          if (!Array.isArray(mergedTarget.questItems) && Array.isArray(defTarget.questItems)) {
            mergedTarget.questItems = defTarget.questItems.map((entry) => ({ ...entry }));
          }

          base.target = mergedTarget;
        }

        if (base.type === "action_targets" && def?.target && typeof def.target === "object") {
          base.target = {
            ...def.target,
            ...(base.target ?? {}),
            ...(Array.isArray(def.target.groups) ? { groups: def.target.groups.map((group) => ({ ...group })) } : {}),
          };
          base.completeWhen = base.completeWhen ?? def?.completeWhen;
        }

        // Ensure monster target is normalized (handles older saves where monster may be an object)
        if (base.target && base.target.monster) {
          const normalized = Array.isArray(base.target.monster)
            ? base.target.monster.map((entry) => normalizeMonsterType(entry) || String(entry))
            : (normalizeMonsterType(base.target.monster) || String(base.target.monster));
          base.target = { ...base.target, monster: normalized };

          // If this quest definition uses templates, rebuild title/story/acceptText from templates
          const npc = QUEST_NPCS[base.npcId];
          if (def) {
            const monsterText = Array.isArray(normalized) ? normalized.join(", ") : normalized;
            if (def.titleTemplate) base.title = String(def.titleTemplate.replace("{monster}", monsterText));
            if (def.storyTemplate) base.story = String((def.storyTemplate || "").replace("{npcName}", npc?.name ?? "En questgiver").replace("{monster}", monsterText));
            if (def.acceptTextTemplate) base.acceptText = String((def.acceptTextTemplate || "").replace("{count}", String(base.target?.count ?? "")).replace("{monster}", monsterText));
            if (def.turnInTextTemplate) base.turnInText = String(def.turnInTextTemplate.replace("{count}", String(base.target?.count ?? "")).replace("{monster}", monsterText));
          }
        }

        return base;
      })
    : [];
  return {
    active: rawActive,
    completed: Array.isArray(saved?.completed) ? saved.completed.map(String) : [],
    questBoards: normalizeQuestBoards(saved?.questBoards),
    cityOfferRolls: saved?.cityOfferRolls && typeof saved.cityOfferRolls === "object"
      ? Object.fromEntries(
        Object.entries(saved.cityOfferRolls)
          .map(([key, value]) => [String(key), Number(value)])
          .filter(([, value]) => Number.isFinite(value)),
      )
      : {},
    wildernessNpc: null,
    cityFade: [],
  };
}
