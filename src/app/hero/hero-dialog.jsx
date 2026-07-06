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
    { label: "HP", value: `${player.hp} / ${player.maxHp}`, help: t("hero.stat.hp.help") },
    { label: "Mana", value: `${player.mana} / ${player.maxMana}`, help: t("hero.stat.mana.help") },
    { label: "Level", value: player.level, help: t("hero.stat.level.help") },
    { label: "XP", value: `${player.xp} / ${player.nextXp}`, help: t("hero.stat.xp.help") },
    { label: "Gold", value: player.gold, help: t("hero.stat.gold.help") },
    { label: "Popularity", value: `${player.popularity}%`, help: t("hero.stat.popularity.help") },
  ];
  const offenseStats = [
    { label: "Damage", value: player.damage, help: t("hero.stat.damage.help") },
    { label: "Mode", value: player.mode, help: t("hero.stat.mode.help") },
    { label: "Magic", value: numberStat(player.magic), help: t("hero.stat.magic.help") },
    { label: "Speed", value: decimalStat(player.speed), help: t("hero.stat.speed.help") },
    { label: "Cooldown", value: `${decimalStat(player.cooldown)}s`, help: t("hero.stat.cooldown.help") },
    { label: "Crit chance", value: pct(player.critChance), help: t("hero.stat.critChance.help") },
    { label: "Crit damage", value: pct(player.critDamage, { multiplier: true }), help: t("hero.stat.critDamage.help") },
    { label: "Life steal", value: pct(player.lifeSteal), help: t("hero.stat.lifeSteal.help") },
    { label: "Spell bonus", value: signedPct(player.spellDamageBonus), help: t("hero.stat.spellBonus.help") },
    { label: "Direct bonus", value: signedPct(player.directDamageBonus), help: t("hero.stat.directBonus.help") },
    { label: "Area bonus", value: signedPct(player.areaDamageBonus), help: t("hero.stat.areaBonus.help") },
    { label: "DoT bonus", value: signedPct(player.dotDamageBonus), help: t("hero.stat.dotBonus.help") },
  ];
  const defenseStats = [
    { label: "Armor", value: player.armor, help: t("hero.stat.armor.help") },
    { label: "Block chance", value: pct(player.blockChance), help: t("hero.stat.blockChance.help") },
    { label: "Block amount", value: numberStat(player.blockAmount), help: t("hero.stat.blockAmount.help") },
    { label: "Dodge", value: pct(player.dodgeChance), help: t("hero.stat.dodge.help") },
    { label: "All resist", value: resist(player.allResist), help: t("hero.stat.allResist.help") },
    { label: "Magic resist", value: resist(player.magicResist), help: t("hero.stat.magicResist.help") },
    { label: "Physical", value: resist(player.physicalResist), help: t("hero.stat.physicalResist.help") },
    { label: "Fire", value: resist(player.fireResist), help: t("hero.stat.fireResist.help") },
    { label: "Ice", value: resist(player.iceResist), help: t("hero.stat.iceResist.help") },
    { label: "Lightning", value: resist(player.lightningResist), help: t("hero.stat.lightningResist.help") },
    { label: "Poison", value: resist(player.poisonResist), help: t("hero.stat.poisonResist.help") },
    { label: "Arcane", value: resist(player.arcaneResist), help: t("hero.stat.arcaneResist.help") },
    { label: "Holy", value: resist(player.holyResist), help: t("hero.stat.holyResist.help") },
    { label: "Shadow", value: resist(player.shadowResist), help: t("hero.stat.shadowResist.help") },
    { label: "Nature", value: resist(player.natureResist), help: t("hero.stat.natureResist.help") },
  ];
  const utilityStats = [
    { label: "Gold find", value: pct(player.goldFind), help: t("hero.stat.goldFind.help") },
    { label: "Magic find", value: pct(player.magicFind), help: t("hero.stat.magicFind.help") },
    { label: "Resource find", value: pct(player.resourceFind), help: t("hero.stat.resourceFind.help") },
    { label: "XP gain", value: pct(player.xpGain), help: t("hero.stat.xpGain.help") },
    { label: "Skill points", value: player.skillPoints ?? 0, help: t("hero.stat.skillPoints.help") },
    { label: "Class points", value: player.classPoints ?? 0, help: t("hero.stat.classPoints.help") },
    { label: "Deaths", value: stats.deaths ?? 0, help: t("hero.stat.deaths.help") },
  ];
  const elementalDamageStats = [
    { label: "Physical damage", value: signedPct(player.physicalDamageBonus), help: t("hero.stat.physicalDamage.help") },
    { label: "Fire damage", value: signedPct(player.fireDamageBonus), help: t("hero.stat.fireDamage.help") },
    { label: "Ice damage", value: signedPct(player.iceDamageBonus), help: t("hero.stat.iceDamage.help") },
    { label: "Lightning damage", value: signedPct(player.lightningDamageBonus), help: t("hero.stat.lightningDamage.help") },
    { label: "Poison damage", value: signedPct(player.poisonDamageBonus), help: t("hero.stat.poisonDamage.help") },
    { label: "Arcane damage", value: signedPct(player.arcaneDamageBonus), help: t("hero.stat.arcaneDamage.help") },
    { label: "Holy damage", value: signedPct(player.holyDamageBonus), help: t("hero.stat.holyDamage.help") },
    { label: "Shadow damage", value: signedPct(player.shadowDamageBonus), help: t("hero.stat.shadowDamage.help") },
    { label: "Nature damage", value: signedPct(player.natureDamageBonus), help: t("hero.stat.natureDamage.help") },
    { label: "Hazard damage", value: signedPct(player.hazardDamageBonus), help: t("hero.stat.hazardDamage.help") },
    { label: "DoT duration", value: signedPct(player.dotDurationBonus), help: t("hero.stat.dotDuration.help") },
    { label: "Status duration", value: signedPct(player.statusDurationBonus), help: t("hero.stat.statusDuration.help") },
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
                <HeroBar label="HP" value={player.hp} max={player.maxHp} tone="health" help={t("hero.stat.hp.help")} />
                <HeroBar label="Mana" value={player.mana} max={player.maxMana} tone="mana" help={t("hero.stat.mana.help")} />
                <HeroBar label="XP" value={player.xp} max={player.nextXp} tone="xp" help={t("hero.stat.xp.help")} />
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
          <div className="hero-combat">
            <div className="hero-stat-grid">
              <HeroStat label="Damage dealt" value={stats.damageDealt ?? 0} help={t("hero.stat.damageDealt.help")} />
              <HeroStat label="Damage taken" value={stats.damageTaken ?? 0} help={t("hero.stat.damageTaken.help")} />
              <HeroStat label="Kills total" value={stats.killsTotal ?? 0} help={t("hero.stat.killsTotal.help")} />
              <HeroStat label="Melee attacks" value={stats.meleeAttacks ?? 0} help={t("hero.stat.meleeAttacks.help")} />
              <HeroStat label="Ranged attacks" value={stats.rangedAttacks ?? 0} help={t("hero.stat.rangedAttacks.help")} />
              <HeroStat label="Spell projectiles" value={stats.spellProjectiles ?? 0} help={t("hero.stat.spellProjectiles.help")} />
              <HeroStat label="Spells cast" value={stats.spellsCast ?? 0} help={t("hero.stat.spellsCast.help")} />
            </div>
            <HeroDetailSection
              title={`Objects destroyed: ${stats.objectsDestroyed ?? 0}`}
              empty="Ingen objekter ødelagt endnu"
              rows={objectsDestroyed}
              help={t("hero.stat.objectsDestroyed.help")}
              columns
            />
            <HeroDetailSection
              title="Kills by monster"
              empty="Ingen kills endnu"
              rows={monsterRows.map(([name, value]) => `${name}: ${value.normal ?? 0} normal | ${value.elite ?? 0} elite`)}
              columns
            />
          </div>
        )}
        {tab === "loot" && (
          <div className="hero-stat-grid">
            <HeroStat label="Gold earned" value={stats.goldEarned ?? 0} help={t("hero.stat.goldEarned.help")} />
            <HeroStat label="Gold looted" value={stats.goldLooted ?? 0} help={t("hero.stat.goldLooted.help")} />
            <HeroStat label="Items dropped" value={stats.itemsDropped ?? 0} details={droppedRarity} help={t("hero.stat.itemsDropped.help")} />
            <HeroStat label="Items picked" value={stats.itemsPicked ?? 0} details={pickedRarity} help={t("hero.stat.itemsPicked.help")} />
            <HeroStat label="Items not picked" value={stats.itemsNotPicked ?? 0} details={notPickedRarity} help={t("hero.stat.itemsNotPicked.help")} />
            <HeroStat label="Items destroyed" value={stats.itemsDestroyed ?? 0} details={destroyedRarity} help={t("hero.stat.itemsDestroyed.help")} />
            <HeroStat label="Resources picked" value={stats.resourcesPicked ?? 0} help={t("hero.stat.resourcesPicked.help")} />
            <HeroStat label="Health potions" value={stats.healthPotionsUsed ?? 0} help={t("hero.stat.healthPotions.help")} />
            <HeroStat label="Mana potions" value={stats.manaPotionsUsed ?? 0} help={t("hero.stat.manaPotions.help")} />
          </div>
        )}
        {tab === "quests" && (
          <div className="hero-quests">
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
          </div>
        )}
      </section>
    </div>
  );
}

function HeroStat({ label, value, details = [], help }) {
  return (
    <div className="hero-stat" title={help}>
      <span>{label}</span>
      <b>{value}</b>
      {details.length > 0 && <em>{details.join(" | ")}</em>}
    </div>
  );
}

function HeroStatSection({ title, stats, compact = false }) {
  return (
    <section className={`hero-stat-section ${compact ? "compact" : ""}`}>
      <h3>{title}</h3>
      <div className="hero-stat-grid">
        {stats.map((stat) => (
          <HeroStat key={stat.label} label={stat.label} value={stat.value} details={stat.details} help={stat.help} />
        ))}
      </div>
    </section>
  );
}

function HeroBar({ label, value, max, tone, help }) {
  const current = Math.max(0, Number(value) || 0);
  const maximum = Math.max(1, Number(max) || 1);
  const pctValue = Math.max(0, Math.min(100, (current / maximum) * 100));
  return (
    <div className={`hero-vital-bar ${tone}`} title={help}>
      <span>{label}</span>
      <b>{Math.round(current)} / {Math.round(maximum)}</b>
      <i style={{ width: `${pctValue}%` }} />
    </div>
  );
}

function HeroDetailSection({ title, rows, empty, help, columns = false }) {
  return (
    <section className="hero-quest-section" title={help}>
      <h3>{title}</h3>
      {rows.length ? (
        <div className={`hero-detail-grid ${columns ? "columns" : ""}`}>
          {rows.map((row) => <p key={row}>{row}</p>)}
        </div>
      ) : <p>{empty}</p>}
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
