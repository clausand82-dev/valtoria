import { QUEST_NPCS } from "../game/config/npc-config.js";
import { resolveQuestDefById } from "../game/GameEngine/helpers/quests.js";

const TEMPLATE_FIELDS = Object.freeze({
  title: "titleTemplate",
  story: "storyTemplate",
  acceptText: "acceptTextTemplate",
  turnInText: "turnInTextTemplate",
});

function questDefinition(quest) {
  return resolveQuestDefById(quest?.questId ?? quest?.id);
}

function activeQuestStep(quest, definition) {
  const stepId = quest?.progress?.currentStepId ?? quest?.currentStepId;
  if (!stepId || !Array.isArray(definition?.steps)) return null;
  return definition.steps.find((step) => String(step?.id) === String(stepId)) ?? null;
}

export function localizeQuestField(quest, field, localize, renderTemplate) {
  if (!quest) return "";
  const definition = questDefinition(quest);
  if (!definition) return quest[field] ?? "";

  const step = activeQuestStep(quest, definition);
  const source = step && field !== "title" && step[field] != null ? step : definition;
  const templateField = TEMPLATE_FIELDS[field];
  if (templateField && source?.[templateField] != null) {
    const monster = Array.isArray(quest.target?.monster)
      ? quest.target.monster.join(", ")
      : quest.target?.monster ?? "monsters";
    const npcId = quest.startNpcId ?? quest.npcId ?? definition.startNpcIds?.[0] ?? definition.npcIds?.[0];
    return renderTemplate(localize(source, templateField), {
      count: quest.target?.count ?? "",
      monster,
      npcName: QUEST_NPCS[npcId]?.name ?? "A quest giver",
    });
  }

  return localize(source, field) || quest[field] || "";
}

export function localizeQuestTargetField(target, field, localize) {
  return localize(target, field);
}
