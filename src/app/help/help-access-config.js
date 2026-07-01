export const HELP_ACCESS_CONFIG = Object.freeze({
  guideNpcUntilLevel: 20,
  floatingButtonUnlockLevel: 21,
});

export const HELP_GUIDE_NPC = Object.freeze({
  id: "help_guide",
  name: "Guide",
  action: "Talk to the guide",
  imageUrl: "/assets/generated/npc/npc_guide.png",
  topicId: "getting-started",
  cityAreaId: "education_area",
  // Positioned inside the education area, between the Research Lab and Library.
  cityPosition: Object.freeze({ x: 742, y: 330 }),
  i18n: Object.freeze({
    da: Object.freeze({
      name: "Guide",
      action: "Tal med guiden",
    }),
  }),
});

export const FLOATING_HELP_BUTTON = Object.freeze({
  id: "floating_help_button",
  label: "Open help",
  i18n: Object.freeze({
    da: Object.freeze({ label: "Åbn hjælp" }),
  }),
});

// Accepts either the complete snapshot or its player object, matching both UI call sites.
export function getPlayerLevel(gameState) {
  const rawLevel = gameState?.player?.level ?? gameState?.level;
  const level = Math.floor(Number(rawLevel));
  return Number.isFinite(level) && level >= 1 ? level : 1;
}

export function openHelpTopic(topicId = "getting-started") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("valtoria:open-help", { detail: { topicId } }));
}
