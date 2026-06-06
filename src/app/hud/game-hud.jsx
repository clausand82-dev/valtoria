import React, { useEffect, useRef, useState } from "react";
import { CHEAT_SETTINGS } from "../../game/config/cheat-config.js";
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
import { isRegionDebugShortcut } from "./region-debug-shortcut.js";

function DebugStatsList({ title, values }) {
  const entries = Object.entries(values ?? {})
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (!entries.length) return null;
  return (
    <div className="region-debug-list">
      <b>{title}</b>
      {entries.map(([key, value]) => (
        <span key={key}><code>{key}</code><strong>{value}</strong></span>
      ))}
    </div>
  );
}

function RegionDebugPanel({ liveStats, onClose, onRefresh, stats }) {
  const ms = (value) => Number.isFinite(Number(value)) ? `${value} ms` : "n/a";
  const saveTime = liveStats?.save?.savedAt
    ? new Date(liveStats.save.savedAt).toLocaleTimeString()
    : "n/a";
  const totals = [
    ["Objekter", stats?.objects?.total ?? 0],
    ["Monsters", stats?.monsters?.total ?? 0],
    ["Foliage", stats?.foliage?.total ?? 0],
    ["Decals", stats?.decals?.total ?? 0],
    ["Tiles", stats?.tiles?.total ?? "-"],
  ];
  const liveTotals = [
    ["FPS", `${liveStats?.averageFps ?? 0} / ${liveStats?.targetFps ?? "-"}`],
    ["Frame", ms(liveStats?.frameMs)],
    ["Render", ms(liveStats?.render?.totalMs)],
    ["Tiles", ms(liveStats?.render?.tilesMs)],
    ["Drawables", `${liveStats?.counts?.drawables ?? 0} (${ms(liveStats?.render?.objectsMs)})`],
    ["Fog", ms(liveStats?.render?.fogMs)],
    ["Particle ms", ms(liveStats?.render?.particlesMs)],
    ["Minimap", ms(liveStats?.render?.minimapMs)],
    ["Objects", liveStats?.counts?.objects ?? 0],
    ["Monsters", liveStats?.counts?.monsters ?? 0],
    ["Effects", liveStats?.counts?.particles ?? 0],
    ["Terrain cache", liveStats?.counts?.cachedTerrainLayers ?? 0],
    ["Terrain cleared", liveStats?.counts?.terrainLayersCleared ?? 0],
    ["Save", `${liveStats?.save?.status ?? "n/a"} ${liveStats?.save?.sizeKb ?? "n/a"} KB ${saveTime}`],
    ["Particles", `${liveStats?.particles?.active ?? 0} / ${liveStats?.particles?.max ?? 0}`],
    ["Emitters", liveStats?.particles?.emitters ?? 0],
    ["Legacy particles", liveStats?.particles?.legacy ?? 0],
    ["Projectiles", liveStats?.runtime?.projectiles ?? 0],
    ["Hazards", liveStats?.runtime?.groundHazards ?? 0],
    ["Loot", liveStats?.runtime?.loots ?? 0],
    ["Critters", liveStats?.runtime?.critters ?? 0],
  ];
  return (
    <section className="region-debug-panel" aria-label="Region debug manifest">
      <header>
        <div>
          <b>Region manifest</b>
          <span>{stats?.region?.label ?? stats?.region?.id ?? "Ingen aktiv region"}</span>
        </div>
        <div>
          <button type="button" onClick={onRefresh}>Refresh</button>
          <button type="button" onClick={onClose}>Luk</button>
        </div>
      </header>
      <div className="region-debug-totals">
        {totals.map(([label, value]) => <span key={label}>{label} <b>{value}</b></span>)}
      </div>
      <div className="region-debug-totals region-debug-live">
        {liveTotals.map(([label, value]) => <span key={label}>{label} <b>{value}</b></span>)}
      </div>
      <div className="region-debug-columns">
        <DebugStatsList title="objects.byQuestTargetKey" values={stats?.objects?.byQuestTargetKey} />
        <DebugStatsList title="objects.byCompletedQuestTargetKey" values={stats?.objects?.byCompletedQuestTargetKey} />
        <DebugStatsList title="objects.byObjectDefId" values={stats?.objects?.byObjectDefId} />
        <DebugStatsList title="objects.byActionId" values={stats?.objects?.byActionId} />
        <DebugStatsList title="foliage.byQuestTargetKey" values={stats?.foliage?.byQuestTargetKey} />
        <DebugStatsList title="foliage.byCompletedQuestTargetKey" values={stats?.foliage?.byCompletedQuestTargetKey} />
        <DebugStatsList title="foliage.byActionId" values={stats?.foliage?.byActionId} />
        <DebugStatsList title="monsters.byType" values={stats?.monsters?.byType} />
        <DebugStatsList title="particles.byType (live)" values={liveStats?.particles?.byType} />
        <DebugStatsList title="emitters.byType (live)" values={liveStats?.particles?.emittersByType} />
        <DebugStatsList title="legacyParticles.byType (live)" values={liveStats?.particles?.legacyByType} />
      </div>
    </section>
  );
}

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
  popularityValue,
  setConfirmMapAbandonOpen,
  setCitySettingsOpen,
  setCityStorageOpen,
  setHeroOpen,
  setInventoryOpen,
  setMapOpen,
  setQuestOverviewOpen,
  setToastLogOpen,
  setViewedQuest,
  snapshot,
  trackedQuests,
  xpPct,
}) {
  const [openPicker, setOpenPicker] = useState(null);
  const [regionDebugOpen, setRegionDebugOpen] = useState(false);
  const [regionDebugStats, setRegionDebugStats] = useState(null);
  const [regionDebugLiveStats, setRegionDebugLiveStats] = useState(null);
  const questBadgeCount = Math.max(0, (snapshot.quests?.active ?? []).filter((quest) => quest.complete).length);
  const toastLogCount = Math.max(0, snapshot.toastLog?.length ?? 0);
  const handleOpenPicker = (slotId) => setOpenPicker(slotId);
  const handleClosePicker = (slotId) => setOpenPicker((current) => (current === slotId ? null : current));
  const refreshRegionDebug = () => {
    setRegionDebugStats(engineRef.current?.rebuildRegionStats?.({ includeTiles: true }) ?? null);
  };

  useEffect(() => {
    if (!CHEAT_SETTINGS.enabled) return undefined;
    const handleRegionDebugShortcut = (event) => {
      if (!isRegionDebugShortcut(event, CHEAT_SETTINGS.enabled)) return;
      event.preventDefault();
      setRegionDebugOpen((current) => !current);
    };
    window.addEventListener("keydown", handleRegionDebugShortcut);
    return () => window.removeEventListener("keydown", handleRegionDebugShortcut);
  }, [engineRef]);

  useEffect(() => {
    if (CHEAT_SETTINGS.enabled && regionDebugOpen) refreshRegionDebug();
  }, [engineRef, regionDebugOpen, snapshot.regionStats]);

  useEffect(() => {
    if (!CHEAT_SETTINGS.enabled || !regionDebugOpen) return undefined;
    const refreshLiveStats = () => {
      setRegionDebugLiveStats(engineRef.current?.runtimeDebugStats?.() ?? null);
    };
    refreshLiveStats();
    const intervalId = window.setInterval(refreshLiveStats, 250);
    return () => window.clearInterval(intervalId);
  }, [engineRef, regionDebugOpen]);

  return (
    <>
      <section className="hud hud-left" aria-live="polite">
        {cityOpen ? (
          <>
            <div className="city-left-stack">
              <CitySideStats
                gold={player.gold}
                threatLevel={cityThreatLevel}
                popularity={popularityValue}
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
              <ResourceBar type="popularity" value={popularityPct} label={`POPULARITY ${Math.round(Number(popularityValue) || 0)}%`} />
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

      {CHEAT_SETTINGS.enabled && regionDebugOpen && !cityOpen && (
        <RegionDebugPanel
          liveStats={regionDebugLiveStats}
          onClose={() => setRegionDebugOpen(false)}
          onRefresh={refreshRegionDebug}
          stats={regionDebugStats ?? snapshot.regionStats}
        />
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
          <button type="button" className="city-menu-button" onClick={() => setHeroOpen(true)}>
            <ImageIcon src="/assets/generated/ui_hero.png" />
            <span>Hero</span>
          </button>
          <button type="button" className="city-menu-button" onClick={() => setQuestOverviewOpen(true)}>
            <ImageIcon src={QUICKBAR_QUEST_ICON_URL} />
            <span>Questlog</span>
            {questBadgeCount > 0 && <b className="city-menu-badge">{questBadgeCount}</b>}
          </button>
          <button type="button" className="city-menu-button" onClick={() => setToastLogOpen(true)}>
            <ImageIcon src="/assets/generated/item/item_book_lore.png" />
            <span>Beskeder</span>
            {toastLogCount > 0 && <b className="city-menu-badge">{Math.min(99, toastLogCount)}</b>}
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
        <button type="button" className="skill" title="Beskedlog" onClick={() => setToastLogOpen(true)}>
          <ImageIcon src="/assets/generated/item/item_book_lore.png" />
          {toastLogCount > 0 && <b className="skill-badge">{Math.min(99, toastLogCount)}</b>}
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
