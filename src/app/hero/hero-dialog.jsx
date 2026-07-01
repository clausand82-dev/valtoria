import React, { useState } from "react";
import { SPELL_DEFS } from "../../game/config/spell-config.js";
import { QuestObjectiveMeta } from "../quests/quest-dialogs.jsx";
import { useLocalization } from "../../i18n/index.js";
import { localizeQuestField } from "../../i18n/quest-localization.js";

export function HeroDialog({ snapshot, onSelectSpell, onClose }) {
  const { localize, renderTemplate, t } = useLocalization();
  const [tab, setTab] = useState("overview");
  const player = snapshot.player;
  const stats = snapshot.player.stats ?? {};
  const coreStats = [
    { label: "HP", value: `${player.hp} / ${player.maxHp}` },
    { label: "Mana", value: `${player.mana} / ${player.maxMana}` },
    { label: "Level", value: player.level },
    { label: "XP", value: `${player.xp} / ${player.nextXp}` },
    { label: "Gold", value: player.gold },
    { label: "Popularity", value: `${player.popularity}%` },
  ];
  const offenseStats = [
    { label: "Damage", value: player.damage },
    { label: "Mode", value: player.mode },
    { label: "Magic", value: numberStat(player.magic) },
    { label: "Speed", value: decimalStat(player.speed) },
    { label: "Cooldown", value: `${decimalStat(player.cooldown)}s` },
    { label: "Crit chance", value: pct(player.critChance) },
    { label: "Crit damage", value: pct(player.critDamage, { multiplier: true }) },
    { label: "Life steal", value: pct(player.lifeSteal) },
    { label: "Spell bonus", value: signedPct(player.spellDamageBonus) },
    { label: "Direct bonus", value: signedPct(player.directDamageBonus) },
    { label: "Area bonus", value: signedPct(player.areaDamageBonus) },
    { label: "DoT bonus", value: signedPct(player.dotDamageBonus) },
  ];
  const defenseStats = [
    { label: "Armor", value: player.armor },
    { label: "Block chance", value: pct(player.blockChance) },
    { label: "Block amount", value: numberStat(player.blockAmount) },
    { label: "Dodge", value: pct(player.dodgeChance) },
    { label: "All resist", value: resist(player.allResist) },
    { label: "Magic resist", value: resist(player.magicResist) },
    { label: "Physical", value: resist(player.physicalResist) },
    { label: "Fire", value: resist(player.fireResist) },
    { label: "Ice", value: resist(player.iceResist) },
    { label: "Lightning", value: resist(player.lightningResist) },
    { label: "Poison", value: resist(player.poisonResist) },
    { label: "Arcane", value: resist(player.arcaneResist) },
    { label: "Holy", value: resist(player.holyResist) },
    { label: "Shadow", value: resist(player.shadowResist) },
    { label: "Nature", value: resist(player.natureResist) },
  ];
  const utilityStats = [
    { label: "Gold find", value: pct(player.goldFind) },
    { label: "Magic find", value: pct(player.magicFind) },
    { label: "Resource find", value: pct(player.resourceFind) },
    { label: "XP gain", value: pct(player.xpGain) },
    { label: "Skill points", value: player.skillPoints ?? 0 },
    { label: "Class points", value: player.classPoints ?? 0 },
    { label: "Deaths", value: stats.deaths ?? 0 },
  ];
  const elementalDamageStats = [
    { label: "Physical damage", value: signedPct(player.physicalDamageBonus) },
    { label: "Fire damage", value: signedPct(player.fireDamageBonus) },
    { label: "Ice damage", value: signedPct(player.iceDamageBonus) },
    { label: "Lightning damage", value: signedPct(player.lightningDamageBonus) },
    { label: "Poison damage", value: signedPct(player.poisonDamageBonus) },
    { label: "Arcane damage", value: signedPct(player.arcaneDamageBonus) },
    { label: "Holy damage", value: signedPct(player.holyDamageBonus) },
    { label: "Shadow damage", value: signedPct(player.shadowDamageBonus) },
    { label: "Nature damage", value: signedPct(player.natureDamageBonus) },
    { label: "Hazard damage", value: signedPct(player.hazardDamageBonus) },
    { label: "DoT duration", value: signedPct(player.dotDurationBonus) },
    { label: "Status duration", value: signedPct(player.statusDurationBonus) },
  ];
  const monsterRows = Object.entries(stats.killsByMonster ?? {})
    .sort(([a], [b]) => a.localeCompare(b));
  const objectsDestroyed = detailEntries(stats.objectsDestroyedByType);
  const pickedRarity = detailEntries(stats.itemsPickedByRarity);
  const droppedRarity = detailEntries(stats.itemsDroppedByRarity);
  const notPickedRarity = detailEntries(stats.itemsNotPickedByRarity);
  const destroyedRarity = detailEntries(stats.itemsDestroyedByRarity);
  return (
    <div className="confirm-backdrop" role="presentation">
      <section className="hero-dialog" role="dialog" aria-modal="true" aria-label={t("panel.hero.title")}>
        <header>
          <div className="hero-dialog-title">
            <img src="/assets/generated/ui_hero.png" alt="" />
            <div>
              <h2>{t("panel.hero.title")}</h2>
              <span>{player.className ?? "Adventurer"} | {t("ui.level")} {player.level} | {t("ui.xp")} {player.xp} / {player.nextXp}</span>
            </div>
          </div>
          <button type="button" className="city-popup-close" aria-label={t("ui.close")} title={t("ui.close")} onClick={onClose}>X</button>
        </header>
        <div className="hero-tabs" role="tablist" aria-label="Hero tabs">
          {["overview", "combat", "loot", "quests"].map((id) => (
            <button type="button" className={tab === id ? "active" : ""} key={id} onClick={() => setTab(id)}>{id}</button>
          ))}
        </div>
        {tab === "overview" && (
          <div className="hero-overview">
            <section className="hero-profile-panel">
              <div className="hero-portrait-ring">
                <img src="/assets/generated/ui_hero.png" alt="" />
              </div>
              <div className="hero-profile-copy">
                <span>{player.className ?? "Adventurer"}</span>
                <b>Level {player.level}</b>
                <em>{localize(SPELL_DEFS[player.activeSpellId], "title") || player.activeSpellTitle || "No active spell"}</em>
              </div>
              <div className="hero-vital-bars" aria-label="Hero vitals">
                <HeroBar label="HP" value={player.hp} max={player.maxHp} tone="health" />
                <HeroBar label="Mana" value={player.mana} max={player.maxMana} tone="mana" />
                <HeroBar label="XP" value={player.xp} max={player.nextXp} tone="xp" />
              </div>
            </section>
            <HeroStatSection title="Core" stats={coreStats} />
            <HeroStatSection title="Offense" stats={offenseStats} />
            <HeroStatSection title="Defense & resist" stats={defenseStats} />
            <HeroStatSection title="Utility" stats={utilityStats} />
            <HeroStatSection title="Damage bonuses" stats={elementalDamageStats} compact />
          </div>
        )}
        {tab === "overview" && (player.unlockedSpells?.length ?? 0) > 0 && (
          <div className="spell-picker">
            {player.unlockedSpells.map((spellId) => (
              <button
                type="button"
                className={player.activeSpellId === spellId ? "active" : ""}
                key={spellId}
                onClick={() => onSelectSpell?.(spellId)}
              >
                {localize(SPELL_DEFS[spellId], "title") || spellId}
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
                      <b>{localizeQuestField(quest, "title", localize, renderTemplate)}</b>
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

function HeroStatSection({ title, stats, compact = false }) {
  return (
    <section className={`hero-stat-section ${compact ? "compact" : ""}`}>
      <h3>{title}</h3>
      <div className="hero-stat-grid">
        {stats.map((stat) => (
          <HeroStat key={stat.label} label={stat.label} value={stat.value} details={stat.details} />
        ))}
      </div>
    </section>
  );
}

function HeroBar({ label, value, max, tone }) {
  const current = Math.max(0, Number(value) || 0);
  const maximum = Math.max(1, Number(max) || 1);
  const pctValue = Math.max(0, Math.min(100, (current / maximum) * 100));
  return (
    <div className={`hero-vital-bar ${tone}`}>
      <span>{label}</span>
      <b>{Math.round(current)} / {Math.round(maximum)}</b>
      <i style={{ width: `${pctValue}%` }} />
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

function numberStat(value) {
  return Math.round(Number(value) || 0);
}

function decimalStat(value) {
  return (Math.round((Number(value) || 0) * 100) / 100).toFixed(2);
}

function pct(value, options = {}) {
  const raw = Number(value);
  const safe = Number.isFinite(raw) ? raw : 0;
  const amount = options.multiplier ? safe * 100 : safe * 100;
  return `${Math.round(amount)}%`;
}

function signedPct(value) {
  const raw = Number(value);
  const amount = Math.round((Number.isFinite(raw) ? raw : 0) * 100);
  return `${amount > 0 ? "+" : ""}${amount}%`;
}

function resist(value) {
  const raw = Number(value);
  const amount = Math.round(Number.isFinite(raw) ? raw : 0);
  return `${amount > 0 ? "+" : ""}${amount}%`;
}
