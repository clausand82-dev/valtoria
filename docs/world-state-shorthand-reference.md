# Valtoria World-State Shorthand Reference

Denne side samler alle shorthand-betingelser, der kan bruges i world-condition systemet (fx i quests, maps, loot, actions).

Implementationen ligger i `src/game/world-state.js` via `worldConditionMet(...)` og `worldEntryAllowed(...)`.

## Hurtig regel

- Brug shorthand til simple checks (en vaerdi pr. key).
- Brug `all` / `any` / `not` / `requires` / `blockedBy` til sammensatte regler.
- Du kan kombinere gammel `demands`-stil og world-state shorthand, men hold en fast konvention i teamet.

## Logiske containere

Disse er ikke "data-checks" i sig selv, men maaden man kombinerer checks paa:

- `requires`: alt herinde skal vaere sandt.
- `conditions`: alias-lignende ekstra betingelser.
- `blockedBy`: hvis sand, saa afvises entry.
- `all`: alle entries skal vaere sande (AND).
- `any`: mindst en entry skal vaere sand (OR).
- `not`: inverterer en betingelse.

## Alle shorthand keys

### Verden og energi

- `worldBalanceLydra`
- `worldBalanceNetdra`
- `corruption`

### Region-state

- `visited`
- `cleared`
- `explored`
- `unlocked`

### Flags, counters, quests

- `flag`
- `notFlag`
- `counter`
- `quest`
- `questActive`
- `questCompleted`

### Quest-step checks

- `questStep`
- `stepCompleted`
- `questStepActive`
- `questCurrentStep`
- `questStepCompleted`
- `questStepRevealed`

### Inventory og stats

- `inventory`
- `cityStorage`
- `cityInventory`
- `cityStat`
- `player`
- `playerStat`
- `factions`
- `factionRep`

### Kill/objekt counters

- `speciesKills`
- `tagKills`
- `destroyedObjectTags`

### Kontekst felter (map/runtime)

- `rootRegionId`
- `rootMapId`
- `rootMapInstanceId`
- `sourceRegionId`
- `sourceMapId`
- `sourceObjectId`
- `sourceObjectRuntimeId`
- `subregionId`
- `subregionKind`
- `subregionDepth`

### Ekstra felter i worldConditionMet

Disse er ogsaa understoettet i `worldConditionMet(...)`:

- `value`
- `stat`

## Sammenligningsformat

Mange numeric checks accepterer baade tal og objektform.

```js
{ counter: { id: "wolvesKilled", min: 10 } }
{ worldBalanceLydra: 30 }           // svarer til min: 30
{ subregionDepth: { gte: 2, lt: 5 } }
```

Stoettede operators i objektform:

- `equals`
- `min`, `max`
- `gte`, `gt`
- `lte`, `lt`

## Praktiske eksempler

### 1) Enkel aktiv quest

```js
{ questActive: "vitlias_kings_relics" }
```

### 2) Skal have fuldfoert en quest

```js
{ questCompleted: "clear_the_inn" }
```

### 3) To aktive quests (AND)

```js
{
  all: [
    { questActive: "quest_a" },
    { questActive: "quest_b" }
  ]
}
```

### 4) Enten-eller (OR)

```js
{
  any: [
    { questCompleted: "path_a_done" },
    { questCompleted: "path_b_done" }
  ]
}
```

### 5) Kraev aktiv quest, men blok hvis finale er taget

```js
{
  requires: { questActive: "vitlias_kings_relics" },
  blockedBy: { questCompleted: "vitlias_finale" }
}
```

### 6) Flag check

```js
{ flag: "region.river-creek.unlocked" }
```

### 7) Flag maa ikke vaere sat

```js
{ notFlag: "event.winter.locked" }
```

### 8) Counter med threshold

```js
{ counter: { id: "speciesKill.Wolf", min: 25 } }
```

### 9) World balance interval

```js
{ worldBalanceNetdra: { min: 10, max: 35 } }
```

### 10) Region corruption

```js
{ corruption: { lte: 20 } }
```

### 11) Inventory krav

```js
{
  inventory: {
    resource: "gold_bar",
    count: 5
  }
}
```

### 12) Potion krav

```js
{
  inventory: {
    potionType: "heal",
    min: 3
  }
}
```

### 13) City storage krav

```js
{
  cityStorage: {
    resource: "wood_plank",
    count: 25
  }
}
```

### 14) Player stat krav

```js
{
  player: {
    level: { gte: 10 }
  }
}
```

### 15) Player stats under player.stats

```js
{
  playerStat: {
    questsCompleted: { gte: 12 }
  }
}
```

### 16) City stats

```js
{
  cityStat: {
    cityLevel: { gte: 4 }
  }
}
```

### 17) Faction reputation

```js
{
  factionRep: {
    village_outskirt: { gte: 15 },
    nethrendor_regime: { lte: -10 }
  }
}
```

### 18) Species kill krav

```js
{
  speciesKills: {
    spider: { gte: 100 }
  }
}
```

### 19) Tag kill krav

```js
{
  tagKills: {
    undead: { gte: 50 }
  }
}
```

### 20) Destroyed object tags

```js
{
  destroyedObjectTags: {
    web: { gte: 20 }
  }
}
```

### 21) Quest-step aktiv

```js
{
  questStepActive: {
    questId: "check_inn_infestation",
    stepId: "seal_crack"
  }
}
```

### 22) Quest-step completed

```js
{
  questStepCompleted: {
    questId: "check_inn_infestation",
    stepId: "clear_crack_cave"
  }
}
```

### 23) Kontekst: kun i bestemt subregion

```js
{
  subregionKind: "dungeon",
  subregionDepth: { gte: 2 }
}
```

### 24) Kompleks sammensat gate

```js
{
  requires: {
    all: [
      { questActive: "vitlias_kings_relics" },
      {
        any: [
          { questCompleted: "annelise_document_chain" },
          { flag: "region.river-creek.unlocked" }
        ]
      },
      { worldBalanceLydra: { min: 20 } }
    ]
  },
  blockedBy: {
    any: [
      { questCompleted: "vitlias_finale" },
      { flag: "event.story.locked" }
    ]
  }
}
```

## Faelder at undgaa

- Skriv ikke samme key to gange i samme objekt. Sidste key vinder i JavaScript.
- `questActive` er bedst til en enkelt quest-id string.
- Til flere aktive quest-krav: brug `all: [{ questActive: ... }, ...]` eller legacy `requiresActiveQuests`.
- Hold en ens stil i teamet for laesbarhed.

## Anbefalet stil i configs

- Enkelt krav: shorthand direkte paa entry.
- Flere krav: brug `requires` + `all`/`any`.
- Negativ logik: brug `blockedBy` eller `not`.
- Brug `demands` til legacy quest checks hvis du vil bevare bagud-kompatibilitet, men foretraek world-state betingelser til ny logik.
