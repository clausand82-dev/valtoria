import React, { useEffect, useRef, useState } from "react";
import {
  AtlasIcon,
  CityStatsTopBar,
  CitySideStats,
  ImageIcon,
  ITEM_MONEY_ICON_URL,
  QUICKBAR_CITY_ICON_URL,
  QUICKBAR_QUEST_ICON_URL,
  QUICKBAR_WILDERNESS_ICON_URL,
  QuestObjectiveMeta,
  ResourceBar,
} from "../index.jsx";

function CooldownClock({ progress }) {
  const pct = Math.max(0, Math.min(1, Number(progress) || 0));
  if (pct <= 0) return null;
  return <span className="quickslot-cooldown" style={{ "--cooldown-pct": pct }} aria-hidden="true" />;
}

function QuickSlot({ slotId, slot, quickActions, cityOpen, engineRef, openPicker, onOpenPicker, onClosePicker }) {
  const hoverTimerRef = useRef(null);
  const closeTimerRef = useRef(null);
  const options = slot.kind === "potion" ? (quickActions.potions ?? []) : (quickActions.spells ?? []);
  const selected = options.find((entry) => String(entry.id) === String(slot.id)) ?? options[0] ?? null;
  const isPotion = slot.kind === "potion";
  const isOpen = openPicker === slotId;
  const count = isPotion ? Math.max(0, Math.floor(Number(selected?.count) || 0)) : 0;
  const spellCooldown = !isPotion && selected?.cooldown
    ? Math.max(0, Number(quickActions.spellCooldown) || 0) / Math.max(0.1, Number(selected.cooldown) || 1)
    : 0;
  const potionCooldown = isPotion
    ? Math.max(0, Number(quickActions.potionCooldown) || 0) / Math.max(0.1, Number(quickActions.potionCooldownMax) || 0.5)
    : 0;
  const disabled = cityOpen || !selected || (isPotion ? count <= 0 : false);
  const title = selected
    ? `${selected.name ?? selected.title}${isPotion ? ` (${count})` : selected.manaCost ? ` (${selected.manaCost} mana)` : ""}`
    : "Empty slot";
  const hoverMs = Math.max(0, Number(quickActions.pickerHoverMs) || 3000);
  const closeMs = Math.max(0, Number(quickActions.pickerCloseMs) || 1800);

  useEffect(() => () => {
    window.clearTimeout(hoverTimerRef.current);
    window.clearTimeout(closeTimerRef.current);
  }, []);

  const clearTimers = () => {
    window.clearTimeout(hoverTimerRef.current);
    window.clearTimeout(closeTimerRef.current);
  };
  const scheduleOpen = () => {
    clearTimers();
    hoverTimerRef.current = window.setTimeout(() => onOpenPicker(slotId), hoverMs);
  };
  const scheduleClose = () => {
    window.clearTimeout(hoverTimerRef.current);
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => onClosePicker(slotId), closeMs);
  };
  const stopQuickbarEvent = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  const renderIcon = (entry) => (
    entry?.iconUrl
      ? <ImageIcon src={entry.iconUrl} />
      : <AtlasIcon frameName={entry?.frameName ?? "orb"} />
  );

  return (
    <span
      className={`quickslot-wrap ${isOpen ? "open" : ""}`}
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className={`quickslot ${isPotion ? "potion-slot" : "spell-slot"} ${(isPotion ? potionCooldown : spellCooldown) > 0 ? "cooling" : ""}`}
        title={cityOpen ? "Ikke tilgaengelig i byen" : title}
        disabled={disabled}
        onClick={(event) => {
          stopQuickbarEvent(event);
          engineRef.current?.activateQuickSlot?.(slotId);
        }}
      >
        {renderIcon(selected)}
        <span className="hotkey-badge">{slotId}</span>
        {isPotion && <b>{count}</b>}
        <CooldownClock progress={isPotion ? potionCooldown : spellCooldown} />
      </button>
      {isOpen && options.length > 0 && (
        <div className="quickslot-picker" role="menu" aria-label={`Choose slot ${slotId}`} onPointerDown={(event) => event.stopPropagation()}>
          {options.map((option) => (
            <button
              type="button"
              className={String(option.id) === String(slot.id) ? "active" : ""}
              key={option.id}
              title={option.name ?? option.title}
              onClick={(event) => {
                stopQuickbarEvent(event);
                engineRef.current?.setQuickSlot?.(slotId, option.id);
                onClosePicker(slotId);
              }}
            >
              {renderIcon(option)}
              {isPotion && <b>{Math.max(0, Math.floor(Number(option.count) || 0))}</b>}
              <span className="quickslot-picker-label">{option.name ?? option.title}</span>
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

export function GameHud({
  cityHudStats,
  cityOpen,
  cityThreatLevel,
  derivedCityStats,
  engineRef,
  hoverMonster,
  hpPct,
  manaPct,
  minimapRef,
  monsterHpPct,
  openWorldMapFromCity,
  player,
  popularityPct,
  setConfirmMapAbandonOpen,
  setCitySettingsOpen,
  setCityStorageOpen,
  setHeroOpen,
  setInventoryOpen,
  setMapOpen,
  setQuestOverviewOpen,
  setViewedQuest,
  snapshot,
  trackedQuests,
  xpPct,
}) {
  const [openPicker, setOpenPicker] = useState(null);
  const questBadgeCount = Math.max(0, (snapshot.quests?.active ?? []).filter((quest) => quest.complete).length);
  const handleOpenPicker = (slotId) => setOpenPicker(slotId);
  const handleClosePicker = (slotId) => setOpenPicker((current) => (current === slotId ? null : current));

  return (
    <>
      <section className="hud hud-left" aria-live="polite">
        {cityOpen ? (
          <>
            <div className="city-left-stack">
              <CitySideStats
                gold={player.gold}
                threatLevel={cityThreatLevel}
                popularity={derivedCityStats.popularity}
                events={derivedCityStats.events}
              />
            </div>
            <CityStatsTopBar stats={cityHudStats} />
          </>
        ) : (
          <>
            <div className="portrait">
              <b>{player.level}</b>
            </div>
            <div className="resource-stack">
              <ResourceBar type="health" value={hpPct} label={`HP ${player.hp} / ${player.maxHp}`} />
              <ResourceBar type="mana" value={manaPct} label={`MANA ${player.mana} / ${player.maxMana}`} />
              <ResourceBar type="xp" value={xpPct} label={`XP ${player.xp} / ${player.nextXp}`} />
              <ResourceBar type="popularity" value={popularityPct} label={`POPULARITY ${Math.round(player.popularity ?? 0)}%`} />
            </div>
          </>
        )}
        {!cityOpen && (
          <div className="stat-chip">
            <span>Guld</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ImageIcon src={ITEM_MONEY_ICON_URL} />
              <b>{player.gold}</b>
            </div>
          </div>
        )}
      </section>

      <section className="hud hud-right">
        <div className="zone-panel">
          <div className="zone-header">
            <b>{cityOpen ? "City" : snapshot.zone.name}</b>
          </div>
          {!cityOpen && (
            <span>
              Weather: {snapshot.zone.weather?.label ?? "No weather"}
            </span>
          )}
        </div>
        {!cityOpen && <canvas ref={minimapRef} className="minimap" width="154" height="154" aria-label="Minimap" />}
      </section>

      {hoverMonster && (
        <section className="monster-hover-card" aria-live="polite">
          <div className="monster-hover-title">
            <span>L{hoverMonster.level}</span>
            <b>{hoverMonster.name}</b>
          </div>
          <ResourceBar type="monster-health" value={monsterHpPct} label={`${hoverMonster.hp} / ${hoverMonster.maxHp}`} />
        </section>
      )}

      {!cityOpen && (
        <section className="combat-card">
          <span>Skade {player.damage}</span>
          <span>Armor {player.armor}</span>
          <span>{player.mode}</span>
          {snapshot.regionRun && snapshot.mobs?.total > 0 && (
            <span>Mobs {snapshot.mobs.killed} / {snapshot.mobs.total}</span>
          )}
        </section>
      )}

      {!cityOpen && trackedQuests.length > 0 && (
        <section className="quest-tracker" aria-label="Aktive quests">
          {trackedQuests.slice(0, 8).map((quest) => (
            <div
              className={`quest-track-row ${quest.complete ? "complete" : ""}`}
              key={quest.id}
              role="button"
              tabIndex={0}
              onClick={() => setViewedQuest(quest)}
              onKeyDown={(e) => { if (e.key === "Enter") setViewedQuest(quest); }}
            >
              <b>{quest.title}</b>
              <span>{quest.progressText}</span>
              <QuestObjectiveMeta quest={quest} compact />
            </div>
          ))}
        </section>
      )}

      {cityOpen ? (
        <section className="city-menu-bar" aria-label="City menu">
          <button type="button" className="city-menu-button" onClick={() => setInventoryOpen((value) => !value)}>
            <ImageIcon src="/assets/generated/icon_backpack.png" />
            <span>Back Pack</span>
          </button>
          <button type="button" className="city-menu-button" onClick={() => setCityStorageOpen(true)}>
            <ImageIcon src="/assets/generated/item/item_chest.png" />
            
            <span>Storage</span>
          </button>
          <button type="button" className="city-menu-button" onClick={() => setQuestOverviewOpen(true)}>
            <ImageIcon src={QUICKBAR_QUEST_ICON_URL} />
            <span>Questlog</span>
            {questBadgeCount > 0 && <b className="city-menu-badge">{questBadgeCount}</b>}
          </button>
          <button type="button" className="city-menu-button" onClick={() => setCitySettingsOpen(true)}>
            <ImageIcon src="/assets/generated/item/item_book_lore.png" />
            <span>Setting</span>
          </button>
          <button type="button" className="city-menu-button" onClick={openWorldMapFromCity}>
            <ImageIcon src="/assets/generated/icon_map.png" />
            <span>World map</span>
          </button>

        </section>
      ) : (
      <section className="skillbar" aria-label="Battle quickbar">
        {["1", "2", "3", "4"].map((slotId) => (
          <QuickSlot
            cityOpen={cityOpen}
            engineRef={engineRef}
            key={slotId}
            onClosePicker={handleClosePicker}
            onOpenPicker={handleOpenPicker}
            openPicker={openPicker}
            quickActions={snapshot.quickActions}
            slot={snapshot.quickActions.slots?.[slotId] ?? { kind: Number(slotId) <= 2 ? "potion" : "spell", id: "" }}
            slotId={slotId}
          />
        ))}
        <button type="button" className="skill" title="Rygsaek" onClick={() => setInventoryOpen((value) => !value)}>
          <ImageIcon src="/assets/generated/icon_backpack.png" />
          <span className="hotkey-badge">I</span>
        </button>
        <button type="button" className="skill" title={cityOpen ? "Minimap er deaktiveret i byen" : "Map"} disabled={cityOpen} onClick={() => setMapOpen(true)}>
          <ImageIcon src="/assets/generated/icon_map.png" />
          <span className="hotkey-badge">M</span>
        </button>
        <button type="button" className="skill" title="Hero" onClick={() => setHeroOpen(true)}>
          <ImageIcon src="/assets/generated/ui_hero.png" />
          <span className="hotkey-badge">C</span>
        </button>
        <button type="button" className="skill" title="Questoversigt" onClick={() => setQuestOverviewOpen(true)}>
          <ImageIcon src={QUICKBAR_QUEST_ICON_URL} />
        </button>
        <button
          type="button"
          className="skill"
          title={snapshot.regionRun ? "Forlad map til byen" : "Aaben world map"}
          onClick={() => {
            if (snapshot.regionRun) {
              setConfirmMapAbandonOpen(true);
              return;
            }
            openWorldMapFromCity();
          }}
        >
          <ImageIcon src={snapshot.regionRun ? QUICKBAR_WILDERNESS_ICON_URL : QUICKBAR_CITY_ICON_URL} />
        </button>
      </section>
      )}
    </>
  );
}
