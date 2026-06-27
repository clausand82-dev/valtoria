import React, { useEffect, useState } from "react";
import { RESOURCE_DEFS } from "../../game/config/resource-config.js";
import { MAP_REGION_SETS } from "../../game/config/map-region-config.js";
import { QUEST_ITEM_DEFS } from "../../game/config/quest-config.js";
import { QUEST_NPCS } from "../../game/config/npc-config.js";
import { resolveQuestDefById } from "../../game/GameEngine/helpers/quests.js";
import { FACTIONS } from "../../game/config/faction-config.js";
import { deriveIconKey, iconUrlFromKey } from "../../game/item-system.js";
import { ITEM_STANDARD_ICON_URL } from "../ui/icons.jsx";
import { MONSTER_STATS, monsterSpriteId } from "../../game/config/monster-config.js";
import { NAMED_ITEM_TEMPLATES } from "../../game/config/item-config.js";

function normalizeQuestRegions(quest) {
  const target = quest?.target ?? {};
  if ((quest?.type === "clear_map" || quest?.type === "action_targets") && target.regionId) return [String(target.regionId)];

  const regions = new Set();
  if (Array.isArray(target.dropRegionIds)) {
    for (const regionId of target.dropRegionIds) regions.add(String(regionId));
  }
  for (const entry of target.questItems ?? []) {
    if (Array.isArray(entry?.dropRegionIds)) {
      for (const regionId of entry.dropRegionIds) regions.add(String(regionId));
    }
  }
  if (regions.size) return [...regions];

  const explicit = Array.isArray(quest?.regionIds)
    ? quest.regionIds.map(String).filter((regionId) => regionId !== "city")
    : [];
  if (explicit.length) return explicit;
  return [];
}

function getRegionLabel(regionId) {
  // Search all map region sets for a matching region id
  for (const regions of Object.values(MAP_REGION_SETS)) {
    const region = regions.find((r) => r?.id === regionId);
    if (region?.label) return region.label;
  }
  return regionId; // Fallback to id if no label found
}

function monsterSpriteSheetFromType(typeName) {
  if (MONSTER_STATS[typeName]?.spriteUrl) return MONSTER_STATS[typeName].spriteUrl;
  const id = monsterSpriteId(typeName);
  return `/assets/generated/mobs/${id}_animated_sheet.png`;
}

function QuestMonsterSprite({ monsterType }) {
  const canvasRef = React.useRef(null);
  
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const image = new Image();
    image.onload = () => {
      // Extract frame 0 from 4-col x 3-row sheet
      const cellW = image.naturalWidth / 4;
      const cellH = image.naturalHeight / 3;
      
      // Draw frame 0 to canvas
      ctx.drawImage(image, 0, 0, cellW, cellH, 0, 0, canvas.width, canvas.height);
      
    };
    image.src = monsterSpriteSheetFromType(monsterType);
  }, [monsterType]);
  
  return <canvas ref={canvasRef} className="quest-monster-mini" width={22} height={22} />;
}

function collectQuestTargets(quest) {
  const target = quest?.target ?? {};
  const rows = [];
  if (target.questItemId) {
    const def = QUEST_ITEM_DEFS[target.questItemId];
    rows.push({
      key: `quest-item-${target.questItemId}`,
      label: `${target.count ?? 1}x ${def?.name ?? target.questItemId}`,
      iconUrl: def?.iconUrl ?? ITEM_STANDARD_ICON_URL,
    });
  }
  for (const entry of target.questItems ?? []) {
    if (!entry?.questItemId) continue;
    const def = QUEST_ITEM_DEFS[entry.questItemId];
    rows.push({
      key: `quest-item-${entry.questItemId}`,
      label: `${entry.count ?? 1}x ${def?.name ?? entry.questItemId}`,
      iconUrl: def?.iconUrl ?? ITEM_STANDARD_ICON_URL,
    });
  }
  for (const entry of target.resources ?? []) {
    const resourceId = String(entry?.resource ?? "");
    if (!resourceId) continue;
    rows.push({
      key: `resource-${resourceId}`,
      label: `${entry.count ?? 1}x ${RESOURCE_DEFS[resourceId]?.name ?? resourceId}`,
      iconUrl: iconUrlFromKey(deriveIconKey({ mode: "resource", resourceId })),
    });
  }
  for (const entry of target.items ?? []) {
    const name = entry?.templateId ?? entry?.namePrefix ?? entry?.baseName ?? "item";
    rows.push({
      key: `item-${name}`,
      label: `${entry?.count ?? 1}x ${name}`,
      iconUrl: ITEM_STANDARD_ICON_URL,
    });
  }
  return rows;
}

function killQuestMonsters(quest) {
  const target = quest?.target ?? {};
  if (Array.isArray(target.monsters) && target.monsters.length) return target.monsters.map(String);
  if (target.monster && String(target.monster) !== "random") return [String(target.monster)];
  return [];
}

function killQuestCountLabel(quest) {
  const target = quest?.target ?? {};
  if (target.count !== undefined) return `${target.count}`;
  if (target.countMin !== undefined && target.countMax !== undefined) return `${target.countMin}-${target.countMax}`;
  if (target.countMin !== undefined) return `${target.countMin}`;
  if (target.countMax !== undefined) return `${target.countMax}`;
  return "?";
}

function talkQuestTargetLabel(quest) {
  const target = quest?.target ?? {};
  if (target.text) return String(target.text);
  const npcIds = Array.isArray(target.targetNpcIds)
    ? target.targetNpcIds
    : target.targetNpcId
      ? [target.targetNpcId]
      : [];
  const names = npcIds.map((npcId) => QUEST_NPCS[npcId]?.name ?? npcId).filter(Boolean);
  return names.length ? `Tal med ${names.join(", ")}` : "Tal med den rette NPC";
}

function questDisplayRewards(quest) {
  const runtimeRewards = quest?.rewards && typeof quest.rewards === "object" ? quest.rewards : {};
  if (Object.keys(runtimeRewards).length > 0) return runtimeRewards;
  return resolveQuestDefById(quest?.questId ?? quest?.id)?.rewards ?? runtimeRewards;
}

function signedRewardValue(value) {
  const amount = Number(value) || 0;
  return amount > 0 ? `+ ${amount}` : `- ${Math.abs(amount)}`;
}

function QuestRewardList({ quest }) {
  const rewards = questDisplayRewards(quest);
  return (
    <div className="comparison-list">
      {(rewards.xp ?? 0) > 0 && <span className="diff-good">+ XP {rewards.xp}</span>}
      {(rewards.gold ?? 0) > 0 && <span className="diff-good">+ Gold {rewards.gold}</span>}
      {(rewards.lydra ?? 0) > 0 && <span className="diff-good">+ Ly'dra'thot {rewards.lydra}</span>}
      {(rewards.netdra ?? 0) > 0 && <span className="diff-good">+ Net'dra'thot {rewards.netdra}</span>}
      {Object.entries(rewards.factionRep ?? {}).map(([factionId, amount]) => (
        <span className={Number(amount) >= 0 ? "diff-good" : "diff-bad"} key={`faction-${factionId}`}>
          {signedRewardValue(amount)} reputation: {FACTIONS[factionId]?.label ?? factionId}
        </span>
      ))}
      {(rewards.resources ?? []).map((r) => (
        <span className="diff-good" key={`res-${r.resource ?? r.id}`}>+ {r.count}x {r.name ?? RESOURCE_DEFS[r.resource ?? r.id]?.name ?? r.resource ?? r.id}</span>
      ))}
      {(rewards.items ?? []).map((item, index) => (
        <span className="diff-good" key={`reward-item-${item.id ?? index}`}>+ {item.name}</span>
      ))}
      {(Array.isArray(rewards.cityProgress) ? rewards.cityProgress : []).map((entry, index) => (
        <span className="diff-good" key={`reward-city-${entry.type ?? "city"}-${entry.id ?? index}`}>
          + {entry.message ?? entry.label ?? "City progress"}
        </span>
      ))}
      {(rewards.namedItems ?? []).map((item, index) => (
        <span className="diff-good" key={`reward-named-item-${item.namedId ?? index}`}>
          + {NAMED_ITEM_TEMPLATES.find((entry) => entry.id === item.namedId)?.name ?? item.namedId}
        </span>
      ))}
    </div>
  );
}

export function QuestObjectiveMeta({ quest, compact = false }) {
  if (!quest) return null;
  const visibleSteps = Array.isArray(quest.visibleSteps) ? quest.visibleSteps : [];
  const regions = normalizeQuestRegions(quest);
  const collectRows = quest.type === "collect_quest_item" ? collectQuestTargets(quest) : [];
  const killMonsters = quest.type === "kill_monsters" ? killQuestMonsters(quest) : [];
  const clearMapMonsters = quest.type === "clear_map" ? (quest.target?.monsters ?? []).map(String) : [];
  return (
    <div className={`quest-objective-meta ${compact ? "compact" : ""}`}>
      {visibleSteps.length > 0 && (
        <div className="quest-objective-row quest-objective-steps">
          {visibleSteps.map((step) => (
            <span className={`quest-chip quest-step-chip ${step.completed ? "complete" : step.current ? "current" : ""}`} key={step.id}>
              <span aria-hidden="true">{step.completed ? "[x]" : step.current ? "->" : "[ ]"}</span>
              {step.title}
            </span>
          ))}
        </div>
      )}

      {quest.type === "collect_quest_item" && collectRows.length > 0 && (
        <div className="quest-objective-row quest-objective-items">
          {collectRows.map((row) => (
            <span className="quest-chip" key={row.key}>
              {row.iconUrl && <img src={row.iconUrl} alt="" />}
              {row.label}
            </span>
          ))}
        </div>
      )}

      {quest.type === "kill_monsters" && (
        <div className="quest-objective-row quest-objective-kills">
          <span className="quest-chip kill-count">Dræb: {killQuestCountLabel(quest)}</span>
          {killMonsters.length > 0 ? killMonsters.map((monster) => (
            <span className="quest-monster-chip" key={monster}>
              <QuestMonsterSprite monsterType={monster} />
              {monster}
            </span>
          )) : <span className="quest-chip">Regionens monstre</span>}
        </div>
      )}

      {quest.type === "clear_map" && (
        <div className="quest-objective-row quest-objective-kills">
          {clearMapMonsters.map((monster) => (
            <span className="quest-monster-chip" key={monster}>
              <QuestMonsterSprite monsterType={monster} />
              {monster}
            </span>
          ))}
        </div>
      )}

      {quest.type === "talk_to_npc" && (
        <div className="quest-objective-row quest-objective-regions">
          <span className="quest-chip region-chip">{talkQuestTargetLabel(quest)}</span>
        </div>
      )}

      {quest.type === "action_targets" && (
        <div className="quest-objective-row quest-objective-regions">
          {(quest.target?.groups ?? [{ label: quest.target?.label }]).map((group, index) => (
            <span key={group?.questTargetKey ?? index} className="quest-chip region-chip">
              {group?.label ?? "Interager med alle quest-maal"}
            </span>
          ))}
        </div>
      )}

      {(regions.length > 0 || quest.type === "kill_monsters" || quest.target?.dropChance !== undefined) && (
        <div className="quest-objective-row quest-objective-regions">
          <span className="quest-chip region-chip">Regioner: {regions.length ? regions.map(getRegionLabel).join(", ") : "Alle"}</span>
        </div>
      )}
      {quest.source === "readable" && (
        <div className="quest-objective-row quest-objective-regions">
          <span className="quest-chip region-chip">UdlÃ¸ser: {quest.sourceLabel ?? "Readable"}</span>
        </div>
      )}
    </div>
  );
}

export function QuestOfferDialog({ interaction, onDecline, onAcceptQuest, onTurnInQuest, onAbandonQuest }) {
  const npc = QUEST_NPCS[interaction.npcId];
  const offers = interaction.offers ?? [];
  const active = interaction.active ?? [];
  const singleQuest = offers.length + active.length === 1 ? (offers[0] ?? active[0]) : null;
  const [selectedQuest, setSelectedQuest] = useState(() => singleQuest);
  const [confirmAbandonQuest, setConfirmAbandonQuest] = useState(null);
  const completeActive = active.filter((quest) => quest.complete);
  const inProgress = active.filter((quest) => !quest.complete);
  const skipQuestList = Boolean(singleQuest);
  const closeSelectedQuest = () => {
    if (skipQuestList) onDecline?.();
    else setSelectedQuest(null);
  };
  const acceptSelectedQuest = () => {
    if (!selectedQuest) return;
    onAcceptQuest?.(selectedQuest);
  };
  const turnInSelectedQuest = () => {
    if (!selectedQuest) return;
    onTurnInQuest?.(selectedQuest);
  };
  const abandonSelectedQuest = () => {
    if (!confirmAbandonQuest) return;
    onAbandonQuest?.(confirmAbandonQuest);
    setConfirmAbandonQuest(null);
    setSelectedQuest(null);
  };
  const selectedQuestIsOffer = selectedQuest
    ? offers.some((quest) => quest.id === selectedQuest.id)
    : false;
  const selectedQuestIsActive = selectedQuest
    ? active.some((quest) => quest.id === selectedQuest.id)
    : false;
  return (
    <div className="confirm-backdrop" role="presentation">
      {!skipQuestList && <section className="confirm-dialog quest-offer-dialog" role="dialog" aria-modal="true" aria-labelledby="quest-offer-title">
        <div className="quest-offer-header">
          {npc?.imageUrl && <img src={npc.imageUrl} alt="" />}
          <div>
            <h2 id="quest-offer-title">{npc?.name ?? "Questgiver"}</h2>
            <span>{npc?.name ?? "Questgiver"} - {npc?.title ?? "Questgiver"}</span>
          </div>
        </div>
        {completeActive.length > 0 && (
          <>
            <p>Ferdige quests:</p>
            <div className="quest-list">
              {completeActive.map((quest) => (
                <article className="quest-card complete quest-status-ready" key={quest.id}>
                  <header>
                    <b>{quest.title}</b>
                    <span>{quest.progressText}</span>
                  </header>
                  <p>{quest.turnInText}</p>
                  <QuestObjectiveMeta quest={quest} />
                  <button type="button" onClick={() => setSelectedQuest(quest)}>Aaben quest</button>
                </article>
              ))}
            </div>
          </>
        )}
        {offers.length > 0 && (
          <>
            <p>Tilgaengelige quests:</p>
            <div className="quest-list">
              {offers.map((quest) => (
                <article className="quest-card quest-status-offer" key={quest.id}>
                  <header>
                    <b>{quest.title}</b>
                    <span>{quest.progressText}</span>
                  </header>
                  <p>{quest.story}</p>
                  <p>{quest.acceptText}</p>
                  <QuestObjectiveMeta quest={quest} />
                  <button type="button" onClick={() => setSelectedQuest(quest)}>Aaben quest</button>
                </article>
              ))}
            </div>
          </>
        )}
        {inProgress.length > 0 && (
          <>
            <p>Aktive quests:</p>
            <div className="quest-list">
              {inProgress.map((quest) => (
                <article className="quest-card quest-status-active" key={quest.id}>
                  <header>
                    <b>{quest.title}</b>
                    <span>{quest.progressText}</span>
                  </header>
                  <p>{quest.story}</p>
                  <QuestObjectiveMeta quest={quest} />
                  <button type="button" onClick={() => setSelectedQuest(quest)}>Aaben quest</button>
                </article>
              ))}
            </div>
          </>
        )}
        {offers.length === 0 && completeActive.length === 0 && inProgress.length === 0 && (
          <p>Ingen quests tilgaengelige lige nu.</p>
        )}
        <div>
          <button type="button" onClick={onDecline}>Luk</button>
        </div>
      </section>}
      {selectedQuest && (
        <QuestDetailCard
          quest={selectedQuest}
          npc={npc}
          onClose={closeSelectedQuest}
          footer={(
            <>
              <button type="button" onClick={closeSelectedQuest}>{skipQuestList ? "Luk" : "Tilbage"}</button>
              {selectedQuestIsActive && (
                <button type="button" onClick={() => setConfirmAbandonQuest(selectedQuest)}>Opgiv quest</button>
              )}
              {selectedQuest.complete ? (
                <button type="button" onClick={turnInSelectedQuest}>Indlever quest</button>
              ) : selectedQuestIsOffer ? (
                <button type="button" onClick={acceptSelectedQuest}>
                  Tag quest
                </button>
              ) : (
                <button type="button" disabled>Indlever quest</button>
              )}
            </>
          )}
        />
      )}
      {confirmAbandonQuest && (
        <div className="confirm-backdrop" role="presentation">
          <section className="confirm-card" role="dialog" aria-modal="true" aria-label="Opgiv quest">
            <h3>Opgiv {confirmAbandonQuest.title}?</h3>
            <p>Questen fjernes fra aktive quests og kan tages igen hos questgiveren. Quest items for denne quest fjernes fra rygsaekken.</p>
            <div className="confirm-actions">
              <button type="button" onClick={() => setConfirmAbandonQuest(null)}>Annuller</button>
              <button type="button" onClick={abandonSelectedQuest}>Opgiv quest</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export function QuestDetailDialog({ quest, engineRef, onClose, onQuestCompleted, onQuestAbandoned, cityOpen }) {
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  if (!quest) return null;
  const npc = QUEST_NPCS[quest.turnInNpcId ?? quest.npcId];
  const turnIn = async () => {
    const result = engineRef.current?.completeQuest?.(quest.id ?? quest.questId, quest.turnInNpcId ?? quest.npcId);
    if (result?.ok) {
      onQuestCompleted?.(result);
      onClose?.();
    }
  };
  const abandon = () => {
    const abandoned = engineRef.current?.abandonQuest?.(quest.id);
    if (!abandoned) return;
    onQuestAbandoned?.(quest);
    onClose?.();
  };

  return (
    <>
      <QuestDetailCard
        quest={quest}
        npc={npc}
        onClose={onClose}
        footer={(
          <>
            <button type="button" onClick={onClose}>Luk</button>
            <button type="button" onClick={() => setConfirmAbandon(true)}>Opgiv quest</button>
            {cityOpen && (
              <button type="button" disabled={!quest.complete} onClick={turnIn}>Indlever quest</button>
            )}
          </>
        )}
      />
      {confirmAbandon && (
        <div className="confirm-backdrop" role="presentation">
          <section className="confirm-card" role="dialog" aria-modal="true" aria-label="Opgiv quest">
            <h3>Opgiv {quest.title}?</h3>
            <p>Questen fjernes fra aktive quests og kan tages igen hos questgiveren. Quest items for denne quest fjernes fra rygsaekken.</p>
            <div className="confirm-actions">
              <button type="button" onClick={() => setConfirmAbandon(false)}>Annuller</button>
              <button type="button" onClick={abandon}>Opgiv quest</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export function QuestDetailCard({ quest, npc, onClose, footer }) {
  if (!quest) return null;
  return (
    <div className="confirm-backdrop" role="presentation">
      <section className="confirm-dialog quest-offer-dialog quest-parchment-dialog quest-detail-dialog" role="dialog" aria-modal="true" aria-label={quest.title}>
        <div className="quest-offer-header">
          {npc?.imageUrl && <img src={npc.imageUrl} alt="" />}
          <div>
            <h2>{quest.title}</h2>
            <span>{npc?.name ?? "Questgiver"} - {npc?.title ?? ""}</span>
          </div>
        </div>
        <p>{quest.complete ? quest.turnInText : quest.story}</p>
        {quest.progressText && (
          <p className="quest-progress-line">
            <b>Progress:</b> {quest.progressText}
          </p>
        )}
        <QuestObjectiveMeta quest={quest} />
        <QuestRewardList quest={quest} />
        <div>
          {footer}
        </div>
      </section>
    </div>
  );
}

export function QuestOverviewDialog({ activeQuests, completedQuestIds = [], onClose, onToggleTracked, onOpenQuest, onAbandonQuest }) {
  const [tab, setTab] = useState(activeQuests.length > 0 ? "active" : "completed");
  const [selectedQuestId, setSelectedQuestId] = useState(activeQuests[0]?.id ?? null);
  const [confirmAbandonQuest, setConfirmAbandonQuest] = useState(null);

  // Build completed quest objects from IDs
  const completedQuests = completedQuestIds
    .map((questId) => {
      const def = resolveQuestDefById(questId);
      if (!def) return null;
      const npcId = Array.isArray(def.npcIds) ? def.npcIds[0] : def.npcIds ?? def.startNpcIds?.[0] ?? def.turnInNpcIds?.[0] ?? null;
      return {
        ...def,
        id: `completed-${questId}`,
        questId: questId,
        npcId: npcId,
        complete: true,
      };
    })
    .filter(Boolean);

  const displayQuests = tab === "active" ? activeQuests : completedQuests;

  useEffect(() => {
    if (!displayQuests.length) {
      setSelectedQuestId(null);
      return;
    }
    const stillExists = displayQuests.some((quest) => quest.id === selectedQuestId);
    if (!stillExists) setSelectedQuestId(displayQuests[0]?.id);
  }, [displayQuests, selectedQuestId]);

  const selectedQuest = displayQuests.find((quest) => quest.id === selectedQuestId) ?? displayQuests[0] ?? null;
  const selectedNpc = selectedQuest ? QUEST_NPCS[selectedQuest.turnInNpcId ?? selectedQuest.npcId] : null;
  const abandonSelectedQuest = () => {
    if (!confirmAbandonQuest) return;
    onAbandonQuest?.(confirmAbandonQuest);
    setConfirmAbandonQuest(null);
  };

  return (
    <div className="confirm-backdrop" role="presentation">
      <section className="confirm-dialog quest-overview-dialog" role="dialog" aria-modal="true" aria-labelledby="quest-overview-title">
        <header className="quest-overview-head">
          <h2 id="quest-overview-title">Questoversigt</h2>
          {activeQuests.length > 0 && completedQuests.length > 0 && (
            <div className="quest-overview-tabs">
              <button
                type="button"
                className={`quest-tab ${tab === "active" ? "active" : ""}`}
                onClick={() => setTab("active")}
              >
                Aktive ({activeQuests.length})
              </button>
              <button
                type="button"
                className={`quest-tab ${tab === "completed" ? "active" : ""}`}
                onClick={() => setTab("completed")}
              >
                Fuldførte ({completedQuests.length})
              </button>
            </div>
          )}
        </header>

        <div className="quest-overview-body">
          {displayQuests.length <= 0 ? (
            <p>{tab === "active" ? "Ingen aktive quests lige nu." : "Du har ikke fuldført nogen quests endnu."}</p>
          ) : (
            <div className="quest-overview-layout">
              <div className="quest-overview-list">
                {displayQuests.map((quest) => (
                  (() => {
                    const completionPct = questCompletionPercent(quest);
                    return (
                  <article
                    className={`quest-overview-row ${quest.complete ? "complete" : ""} ${selectedQuest?.id === quest.id ? "selected" : ""}`}
                    key={quest.id}
                  >
                    <button type="button" className="quest-open-button" onClick={() => setSelectedQuestId(quest.id)}>
                      <span
                        className="quest-name-bar"
                        style={{
                          "--quest-pct": `${completionPct}%`,
                        }}
                      >
                        <b className="quest-name-label">{quest.title}</b>
                      </span>
                    </button>
                    {tab === "active" && (
                      <label className="quest-track-toggle">
                        <input
                          type="checkbox"
                          checked={quest.tracked !== false}
                          onChange={(event) => onToggleTracked?.(quest.id, event.target.checked)}
                        />
                        Track
                      </label>
                    )}
                  </article>
                    );
                  })()
                ))}
              </div>

              {selectedQuest && (
                <aside className="quest-overview-detail quest-parchment-panel">
                  <header>
                    <div>
                      <b>{selectedQuest.title}</b>
                      <span>{selectedNpc?.name ?? "Questgiver"}{selectedNpc?.title ? ` | ${selectedNpc.title}` : ""}</span>
                    </div>
                    <div>
                      <button type="button" onClick={() => onOpenQuest?.(selectedQuest)}>Aaben quest</button>
                      {tab === "active" && (
                        <button type="button" onClick={() => setConfirmAbandonQuest(selectedQuest)}>Opgiv quest</button>
                      )}
                    </div>
                  </header>
                  <p>{selectedQuest.complete ? selectedQuest.turnInText : selectedQuest.story}</p>
                  {selectedQuest.progressText && (
                    <p className="quest-progress-line">
                      <b>Progress:</b> {selectedQuest.progressText}
                    </p>
                  )}
                  <QuestObjectiveMeta quest={selectedQuest} />
                  <QuestRewardList quest={selectedQuest} />
                </aside>
              )}
            </div>
          )}
        </div>

        <footer className="quest-overview-foot">
          <button type="button" onClick={onClose}>Luk</button>
        </footer>
      </section>
      {confirmAbandonQuest && (
        <section className="confirm-card" role="dialog" aria-modal="true" aria-label="Opgiv quest">
          <h3>Opgiv {confirmAbandonQuest.title}?</h3>
          <p>Questen fjernes fra aktive quests og kan tages igen hos questgiveren. Quest items for denne quest fjernes fra rygsaekken.</p>
          <div className="confirm-actions">
            <button type="button" onClick={() => setConfirmAbandonQuest(null)}>Annuller</button>
            <button type="button" onClick={abandonSelectedQuest}>Opgiv quest</button>
          </div>
        </section>
      )}
    </div>
  );
}

function questCompletionPercent(quest) {
  if (!quest) return 0;
  if (quest.complete) return 100;
  const text = String(quest.progressText ?? "");
  const matches = [...text.matchAll(/(\d+)\s*\/\s*(\d+)/g)];
  if (!matches.length) return 0;
  const ratios = matches
    .map((match) => {
      const current = Number(match[1]);
      const total = Number(match[2]);
      if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) return null;
      return Math.max(0, Math.min(1, current / total));
    })
    .filter((value) => value !== null);
  if (!ratios.length) return 0;
  const avg = ratios.reduce((sum, value) => sum + value, 0) / ratios.length;
  return Math.round(avg * 100);
}
