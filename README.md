# Valtoria

Isometrisk Diablo-lignende browserprototype bygget i React + Vite med en custom Canvas-engine.

## Start

```bash
npm install
npm run dev
```

Aabn derefter den lokale URL fra terminalen.

## Build

```bash
npm run build
npm run check
```

## Styring

- WASD eller piletaster: bevaeg karakteren i isometrisk retning
- Venstreklik: gaa eller angrib monster
- Hojreklik eller Q: kast magi
- Mellemrum: angrib naermeste monster
- I eller B: aabn/luk rygsaek

## Indhold

- Isometrisk tile-rendering med dybde, skygger og sortering som i action-RPG'er
- Dynamisk chunk-genereret verden med wilds, grotter, huse og ruiner
- AI-genereret isometrisk atlas i `public/assets/generated/runebound-atlas-source.png`
- AI-genereret helte-animation sheet i `public/assets/generated/hero-animated-sheet.png`
- AI-genereret monster-animation sheet i `public/assets/generated/monsters-animated-sheet.png`
- Runtime chroma-key cleanup af atlas-baggrund, saa sprites tegnes med alpha i Canvas
- Fallback kode-assets til terrain, huse, traeer, sten, soejler, krystaller, monstre, loot og karakter
- Monstre med forskellige niveauer, liv, fart, skade og aggro
- Melee, ranged og magic-vaaben
- Loot med guld og udstyr
- Udstyrsslots: head, neck, chest, arms, legs, rings, amulet, bracelet, feet, hands, weapon, shoulder, cape, belt og relic
- Rarity-farver: poor/graa, normal/hvid, upgraded/groen, good/gul, great/lilla, legendary/roed
- XP, levels, minimap, inventory og auto-pickup
