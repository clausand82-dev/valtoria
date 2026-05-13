import React, { useState } from "react";
import { SPELL_DEFS } from "../../game/config/spell-config.js";
import { QuestObjectiveMeta } from "../quests/quest-dialogs.jsx";

export function HeroDialog({ snapshot, onSelectSpell, onClose }) {
  const [tab, setTab] = useState("overview");
  const stats = snapshot.player.stats ?? {};
  const monsterRows = Object.entries(stats.killsByMonster ?? {})
    .sort(([a], [b]) => a.localeCompare(b));
  const objectsDestroyed = detailEntries(stats.objectsDestroyedByType);
  const pickedRarity = detailEntries(stats.itemsPickedByRarity);
  const droppedRarity = detailEntries(stats.itemsDroppedByRarity);
  const notPickedRarity = detailEntries(stats.itemsNotPickedByRarity);
  const destroyedRarity = detailEntries(stats.itemsDestroyedByRarity);
  return (
    <div className="confirm-backdrop" role="presentation">
      <section className="hero-dialog" role="dialog" aria-modal="true" aria-label="Hero">
        <header>
          <div className="hero-dialog-title">
            <img src="/assets/generated/ui_hero.png" alt="" />
            <div>
              <h2>Hero</h2>
              <span>Level {snapshot.player.level} | XP {snapshot.player.xp} / {snapshot.player.nextXp}</span>
            </div>
          </div>
          <button type="button" className="city-popup-close" onClick={onClose}>X</button>
        </header>
        <div className="hero-tabs" role="tablist" aria-label="Hero tabs">
          {["overview", "combat", "loot", "quests"].map((id) => (
            <button type="button" className={tab === id ? "active" : ""} key={id} onClick={() => setTab(id)}>{id}</button>
          ))}
        </div>
        {tab === "overview" && (
          <div className="hero-stat-grid">
            <HeroStat label="HP" value={`${snapshot.player.hp} / ${snapshot.player.maxHp}`} />
            <HeroStat label="Mana" value={`${snapshot.player.mana} / ${snapshot.player.maxMana}`} />
            <HeroStat label="Gold" value={snapshot.player.gold} />
            <HeroStat label="Popularity" value={`${snapshot.player.popularity}%`} />
            <HeroStat label="Damage" value={snapshot.player.damage} />
            <HeroStat label="Armor" value={snapshot.player.armor} />
            <HeroStat label="Mode" value={snapshot.player.mode} />
            <HeroStat label="Active spell" value={snapshot.player.activeSpellTitle ?? "None"} />
            <HeroStat label="Skill points" value={snapshot.player.skillPoints ?? 0} />
            <HeroStat label="Crit" value={`${Math.round((snapshot.player.critChance ?? 0) * 100)}% / ${Math.round((snapshot.player.critDamage ?? 1.5) * 100)}%`} />
            <HeroStat label="Block" value={`${Math.round((snapshot.player.blockChance ?? 0) * 100)}%`} />
            <HeroStat label="Find" value={`G ${Math.round((snapshot.player.goldFind ?? 0) * 100)}% / M ${Math.round((snapshot.player.magicFind ?? 0) * 100)}%`} />
            <HeroStat label="Deaths" value={stats.deaths ?? 0} />
          </div>
        )}
        {tab === "overview" && (snapshot.player.unlockedSpells?.length ?? 0) > 0 && (
          <div className="spell-picker">
            {snapshot.player.unlockedSpells.map((spellId) => (
              <button
                type="button"
                className={snapshot.player.activeSpellId === spellId ? "active" : ""}
                key={spellId}
                onClick={() => onSelectSpell?.(spellId)}
              >
                {SPELL_DEFS[spellId]?.title ?? spellId}
              </button>
            ))}
          </div>
        )}
        {tab === "combat" && (
          <>
            <div className="hero-stat-grid">
              <HeroStat label="Damage dealt" value={stats.damageDealt ?? 0} />
              <HeroStat label="Damage taken" value={stats.damageTaken ?? 0} />
              <HeroStat label="Kills total" value={stats.killsTotal ?? 0} />
              <HeroStat label="Melee attacks" value={stats.meleeAttacks ?? 0} />
              <HeroStat label="Ranged attacks" value={stats.rangedAttacks ?? 0} />
              <HeroStat label="Spell projectiles" value={stats.spellProjectiles ?? 0} />
              <HeroStat label="Spells cast" value={stats.spellsCast ?? 0} />
              <HeroStat label="Objects destroyed" value={stats.objectsDestroyed ?? 0} details={objectsDestroyed} />
            </div>
            <HeroDetailSection title="Kills by monster" empty="Ingen kills endnu" rows={monsterRows.map(([name, value]) => `${name}: ${value.normal ?? 0} normal | ${value.elite ?? 0} elite`)} />
          </>
        )}
        {tab === "loot" && (
          <div className="hero-stat-grid">
            <HeroStat label="Gold earned" value={stats.goldEarned ?? 0} />
            <HeroStat label="Gold looted" value={stats.goldLooted ?? 0} />
            <HeroStat label="Items dropped" value={stats.itemsDropped ?? 0} details={droppedRarity} />
            <HeroStat label="Items picked" value={stats.itemsPicked ?? 0} details={pickedRarity} />
            <HeroStat label="Items not picked" value={stats.itemsNotPicked ?? 0} details={notPickedRarity} />
            <HeroStat label="Items destroyed" value={stats.itemsDestroyed ?? 0} details={destroyedRarity} />
            <HeroStat label="Resources picked" value={stats.resourcesPicked ?? 0} />
            <HeroStat label="Health potions" value={stats.healthPotionsUsed ?? 0} />
            <HeroStat label="Mana potions" value={stats.manaPotionsUsed ?? 0} />
          </div>
        )}
        {tab === "quests" && (
          <section className="hero-quest-section">
            <h3>{`Quests completed: ${stats.questsCompleted ?? 0}`}</h3>
            {(snapshot.quests?.active ?? []).length > 0 ? (
              <div className="quest-list hero-quest-list">
                {(snapshot.quests?.active ?? []).map((quest) => (
                  <article className={`quest-card ${quest.complete ? "complete" : ""}`} key={quest.id}>
                    <header>
                      <b>{quest.title}</b>
                      <span>{quest.progressText}</span>
                    </header>
                    <QuestObjectiveMeta quest={quest} compact />
                  </article>
                ))}
              </div>
            ) : <p>Ingen aktive quests</p>}
          </section>
        )}
      </section>
    </div>
  );
}

function HeroStat({ label, value, details = [] }) {
  return (
    <div className="hero-stat" title={details.length ? details.join("\n") : undefined}>
      <span>{label}</span>
      <b>{value}</b>
      {details.length > 0 && <em>{details.slice(0, 2).join(" | ")}</em>}
    </div>
  );
}

function HeroDetailSection({ title, rows, empty }) {
  return (
    <section className="hero-quest-section">
      <h3>{title}</h3>
      {rows.length ? rows.map((row) => <p key={row}>{row}</p>) : <p>{empty}</p>}
    </section>
  );
}

function detailEntries(record = {}) {
  return Object.entries(record)
    .filter(([, value]) => Number(value) > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}: ${value}`);
}
