import React from "react";
import {
  AtlasIcon,
  CityStatsTopBar,
  CitySideStats,
  ImageIcon,
  InventoryIcon,
  ITEM_MONEY_ICON_URL,
  QUICKBAR_ATTACK_ICON_URL,
  QUICKBAR_CITY_ICON_URL,
  QUICKBAR_HEALTH_POTION_ICON_URL,
  QUICKBAR_MANA_POTION_ICON_URL,
  QUICKBAR_QUEST_ICON_URL,
  QUICKBAR_WILDERNESS_ICON_URL,
  QuestObjectiveMeta,
  ResourceBar,
} from "../index.jsx";

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
  const questBadgeCount = Math.max(0, (snapshot.quests?.active ?? []).filter((quest) => quest.complete).length);

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
        <span title={cityOpen ? "Ikke tilgaengelig i byen" : undefined}>
          <button
            type="button"
            className="quick-potion"
            title="Health potion"
            disabled={cityOpen || !snapshot.quickActions.healthPotions || snapshot.quickActions.potionCooldown > 0}
            onClick={() => engineRef.current?.usePotion("health")}
          >
            <InventoryIcon iconIndex={4} iconSheet="items" iconUrl={QUICKBAR_HEALTH_POTION_ICON_URL} />
            <span className="hotkey-badge">1</span>
            <b>{snapshot.quickActions.healthPotions}</b>
          </button>
        </span>
        <span title={cityOpen ? "Ikke tilgaengelig i byen" : undefined}>
          <button
            type="button"
            className="quick-potion"
            title="Mana potion"
            disabled={cityOpen || !snapshot.quickActions.manaPotions || snapshot.quickActions.potionCooldown > 0}
            onClick={() => engineRef.current?.usePotion("mana")}
          >
            <InventoryIcon iconIndex={3} iconSheet="items" iconUrl={QUICKBAR_MANA_POTION_ICON_URL} />
            <span className="hotkey-badge">2</span>
            <b>{snapshot.quickActions.manaPotions}</b>
          </button>
        </span>
        <span title={cityOpen ? "Ikke tilgaengelig i byen" : undefined}>
          <button type="button" className="skill active" title="Angrib" disabled={cityOpen} onClick={() => engineRef.current?.primaryAttack()}>
            <InventoryIcon iconIndex={0} iconSheet="items" iconUrl={QUICKBAR_ATTACK_ICON_URL} />
          </button>
        </span>
        <span title={cityOpen ? "Ikke tilgaengelig i byen" : undefined}>
          <button
            type="button"
            className="skill"
            title="Kast magi"
            disabled={cityOpen}
            onClick={() => {
              const engine = engineRef.current;
              if (engine) engine.castSpellAt(engine.pointer.worldX, engine.pointer.worldY);
            }}
          >
            <AtlasIcon frameName="orb" />
          </button>
        </span>
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
