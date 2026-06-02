# Valtoria

Valtoria er en isometrisk action-RPG/browserprototype bygget i **React + Vite** med en custom **Canvas game engine**.

Spillet kombinerer wilderness-runs, kamp, loot, quests, NPC'er, subregions, city-mode og et voksende config-drevet world-system. Projektet er stadig under aktiv udvikling og fungerer både som spilprototype og som fleksibel legeplads for nye RPG-systemer.

## Kort fortalt

Du styrer en helt i Valtoria efter de gamle fortællinger om Lord Kealand, Lady Lirian, Eldiria, Nethrendor, Tornvalhed og Elvindalen. Spillet foregår som et Diablo-lignende isometrisk browser-spil, hvor man bevæger sig ud fra byen, kæmper, samler loot, løser quests og gradvist påvirker verden.

## Teknologi

- React
- Vite
- JavaScript modules
- Custom Canvas-rendering
- LocalStorage-baseret save/persistence
- Config-drevet content-setup

## Installation

```bash
npm install
```

## Start udviklingsserver

```bash
npm run dev
```

Åbn derefter den lokale URL fra terminalen.

Typisk:

```text
http://127.0.0.1:5173
```

eller den port Vite vælger, hvis 5173 allerede er optaget.

## Build

```bash
npm run build
```

## Check

```bash
npm run check
```

`check` kører pt. samme build-flow som `npm run build`.

## Preview af build

```bash
npm run preview
```

## Styring

- **WASD / piletaster**: Bevæg helten
- **Venstreklik**: Gå eller angrib
- **Højreklik / Q**: Brug magi
- **Mellemrum**: Angrib nærmeste monster
- **E**: Interager med nærmeste relevant objekt/NPC/questgiver
- **I / B**: Åbn/luk inventory
- **M**: Åbn/luk map, når man ikke er i city-mode
- **C**: Åbn/luk hero-panel

## Nuværende hovedsystemer

### Game engine

Spillets runtime ligger primært i `src/game/GameEngine`.

Motoren er delt op i metodefiler, blandt andet:

- `combat.js`
- `critters.js`
- `effects.js`
- `input.js`
- `inventory.js`
- `lifecycle.js`
- `loot.js`
- `persistence.js`
- `quests.js`
- `region.js`
- `rendering.js`
- `snapshot.js`
- `subregions.js`

Det gør engine-koden mere opdelt, så nye systemer kan tilføjes uden at alt ender i én stor fil.

### App/UI

React-laget ligger primært i `src/app` og `src/App.jsx`.

Her håndteres blandt andet:

- Startmenu
- Save slots
- Loading screens
- HUD
- Inventory
- Hero panel
- Quest dialogs
- Minimap
- Region map
- City-mode
- City storage/settings
- Quest rewards
- Readable/lore dialogs

### City-mode

Byen fungerer som base mellem wilderness-runs. City-mode håndterer blandt andet:

- Bygninger
- Addons
- City stats
- Popularity
- Storage
- Town Hall quests
- Inn quests
- City mobs/trusselsniveau
- Region map-adgang

Relevante filer ligger blandt andet i:

- `src/app/city.jsx`
- `src/app/city-panels.jsx`
- `src/app/city-systems.jsx`
- `src/game/config/city-buildings-config.js`
- `src/game/config/city-areas-config.js`
- `src/game/config/city-stats-rules-config.js`
- `src/game/config/city-mobs-attack-config.js`
- `src/game/config/city-mobs-battle-config.js`
- `src/game/config/city-army-unit-config.js`
- `src/game/config/city-army-recipe-config.js`
- `src/game/config/city-army-battle-config.js`

### Wilderness / map-runs

Udenfor byen genereres og spilles wilderness-regions med tiles, objects, foliage, prefabs, NPC'er, monsters, loot, weather og exits.

Relevante config-filer:

- `src/game/config/map-region-config.js`
- `src/game/config/map-region/`
- `src/game/config/map-layout-config.js`
- `src/game/config/map-prefab-config.js`
- `src/game/config/region-object-config.js`
- `src/game/config/region-asset-config.js`
- `src/game/config/monster-config.js`
- `src/game/config/spawn-config.js`

### Prefabs

Prefabs bruges til mere håndlavet content inde i procedural maps.

De kan blandt andet indeholde:

- Objects
- Foliage
- Decals
- Monsters
- Chests
- NPC'er
- Action targets
- Subregion entrances

Primær fil:

```text
src/game/config/map-prefab-config.js
```

### Actions / E-interaction

Valtoria har et centralt action-system, hvor objekter og NPC'er kan få `actionId` eller betingede actions.

Primære filer:

- `src/game/config/action-config.js`
- `src/game/actions/action-runner.js`
- `src/game/GameEngine/methods/actions.js`

Eksempler på action-typer:

- `inspect`
- `read`
- `collect`
- `harvest`
- `destroy`
- `open`
- `activate`
- `reveal`
- `cleanse`
- `repair`
- `offer`
- `talk`
- `enterSubregion`
- `exitSubregion`
- `summon`
- `questStart`
- `questAdvance`

### Region manifest / debug

Efter fuld generering af en map-region kan engine bygge et read-only runtime-manifest via
`engine.rebuildRegionStats({ includeTiles })`. Manifestet ligger senest som
`engine.currentRegionStats` og tæller objekter, actions, quest-targets, monsters, foliage,
decals, chests, mulige resource drops og valgfrit tiles.

Når `CHEAT_SETTINGS.enabled` er slået til, åbner og lukker `Ctrl+Shift+D` et kompakt
debug-panel over combat HUD'et. Panelet viser de vigtigste totals samt
`objects.byQuestTargetKey`, `objects.byActionId` og `monsters.byType`. `Refresh` bygger et
nyt snapshot; panelet observerer ikke verden per frame.
Panelet viser desuden lette live-diagnostics for FPS, particles, emitters, particle-typer,
projectiles, hazards, loot og critters. Live-delen opdateres kun, mens panelet er åbent.

Nogle action-typer er fuldt implementeret, mens andre stadig er tidlige/stubbede afhængigt af flowet.

### NPC'er

NPC'er kan placeres via prefabs og subregions. De kan have actions, fx simpel `talk`, og de kan indgå i quest-systemet.

Relevante filer:

- `src/game/config/npc-config.js`
- `src/game/config/quest-npc-config.js`
- `src/game/GameEngine/methods/actions.js`
- `src/game/GameEngine/methods/rendering.js`

### Quests

Quest-systemet er opdelt i flere config-filer, så forskellige quest-kilder kan holdes mere overskuelige.

Relevante filer:

- `src/game/config/quest-config.js`
- `src/game/config/quest-inn-config.js`
- `src/game/config/quest-townhall-config.js`
- `src/game/config/quest-npc-config.js`
- `src/game/GameEngine/methods/quests.js`

Quest-systemet understøtter blandt andet:

- NPC quests
- Inn quests
- Town Hall/repeatable quests
- Quest items
- Turn-in hos NPC'er
- Rewards
- Quest tracking
- Quest dialogs
- Conditions/demands

### Subregions

Subregions bruges til fx huler, kældre, ruiner og andre indre/sideområder inde i et map-run.

Primære filer:

- `src/game/config/subregion-config.js`
- `src/game/GameEngine/methods/subregions.js`

Subregions understøtter blandt andet:

- Entry/exit via actions
- Subregion stack
- Snapshot/persistence under aktivt root-run
- NPC'er i subregions
- Objects/foliage/monsters/chests i subregions

### Loot og items

Loot-systemet håndterer guld, resources, items, rarity, equipment og drops fra monsters/objects/chests/foliage.

Relevante filer:

- `src/game/loot.js`
- `src/game/item-system.js`
- `src/game/config/loot-config.js`
- `src/game/config/item-config.js`
- `src/game/config/equipment-config.js`
- `src/game/config/rarity-config.js`
- `src/game/config/resource-config.js`
- `src/game/GameEngine/methods/loot.js`

### Combat, spells og classes

Kamp-systemet håndterer melee, ranged/magic, monster AI, HP/mana, XP, levels, equipment og spells.

Relevante filer:

- `src/game/GameEngine/methods/combat.js`
- `src/game/config/class-config.js`
- `src/game/config/spell-config.js`
- `src/game/config/action-bar-config.js`
- `src/game/config/equipment-config.js`
- `src/game/config/durability-config.js`

### Critters

Der findes et critter-system til små ambient væsner som billige, ikke-centrale livstegn i maps.

Relevant fil:

```text
src/game/GameEngine/methods/critters.js
```

### Visuals, weather, effects og particles

Spillet bruger en blanding af genererede assets, sheet-baserede sprites, particles, object sockets, attached effects og weather presets.

Relevante filer:

- `src/game/assets.js`
- `src/game/assets-ground.js`
- `src/game/assets-foliage.js`
- `src/game/assets-hero.js`
- `src/game/assets-monster.js`
- `src/game/assets-items.js`
- `src/game/assets-overlay.js`
- `src/game/config/asset-config.js`
- `src/game/config/region-asset-config.js`
- `src/game/config/object-sockets-config.js`
- `src/game/config/socket-config.js`
- `src/game/config/particle-presets.js`
- `src/game/config/weather-presets.js`
- `src/game/particles/ParticleEngine.js`

### World state og conditions

World state bruges til at afgøre, om content skal være aktivt, låst, skjult eller ændret ud fra spillerens tilstand.

Relevante filer:

- `src/game/world-state.js`
- `src/game/world-energy.js`
- `src/game/config/save-persist-config.js`

Conditions bruges på tværs af blandt andet quests, regions, actions, prefabs og unlocks.

### Save/persistence

Save-systemet er LocalStorage-baseret og bruges til blandt andet:

- Save slots
- Player progress
- Inventory
- Equipment
- Quests
- Action state
- Object state
- Current expedition/subregion state
- City progress
- Region corruption
- Last selected region map

Relevante filer:

- `src/storage/saveRepository.js`
- `src/game/GameEngine/methods/persistence.js`
- `src/game/config/save-persist-config.js`

## Vigtig map/config-struktur

De mest centrale gameplay-configs ligger i:

```text
src/game/config/
```

Særligt vigtige filer:

```text
action-config.js
city-buildings-config.js
equipment-config.js
item-config.js
loot-config.js
map-prefab-config.js
map-region-config.js
monster-config.js
npc-config.js
quest-config.js
quest-inn-config.js
quest-townhall-config.js
readable-config.js
region-object-config.js
resource-config.js
save-persist-config.js
spell-config.js
subregion-config.js
weather-presets.js
```

Region-specifikke map-filer ligger i:

```text
src/game/config/map-region/
```

## Assets

Projektets assets ligger primært i:

```text
public/assets/generated/
```

Der bruges blandt andet:

- Hero sheets
- Monster sheets
- Object sheets
- Foliage
- Terrain
- Items
- City/building UI
- Menu artwork
- Region assets

## Udviklingsfilosofi

Valtoria er bygget omkring et config-first workflow:

1. Definér content i config-filer.
2. Lad engine-systemerne læse og afvikle content generisk.
3. Brug prefabs og subregions til håndlavede oplevelser.
4. Brug map-region config til variation og procedural placering.
5. Brug world-state/conditions til at ændre verden over tid.

Målet er, at nye quests, objects, NPC'er, regions, loot tables og interaktioner helst skal kunne tilføjes uden at skrive specialkode hver gang.

## Kendte udviklingsområder

Projektet er stadig under aktiv udvikling. Relevante næste skridt kan være:

- Mere komplet dialogsystem med nodes/options
- Flere main story quests
- Mere brug af eksisterende area maps/regions
- Mere dynamisk city progression
- Flere NPC'er med betingede dialoger/actions
- Flere object interactions
- Mere konsekvens af durability
- Mere udviklet city threat/mob-system
- Atmosphere-system ovenpå eksisterende ambient/weather
- Flere grafiske lag som vægge, jordkanter, decay og overlays
- Mere avanceret loot på object-variant/sheet-frame niveau

## Status

Valtoria er en aktiv prototype. Kode og configs ændrer sig løbende, og README'en bør derfor opdateres, når større systemer bliver tilføjet eller ændret.

## Licens / brug

Dette repository er et personligt spilprojekt. Tilføj en egentlig licensfil, hvis projektet senere skal deles, udgives eller bruges af andre.
