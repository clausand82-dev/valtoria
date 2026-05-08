import { MONSTER_POPULARITY_RULES } from "./monster-config.js";

// Popularity er en procent-stat fra 0 til 100.
//
// Tanken er, at popularity senere kan bruges til konsekvenser som priser,
// adgang til byer/NPC'er, fjendtlige vagter eller andre sociale systemer.
// Derfor ligger tallene her i config i stedet for direkte i combat-koden.
//
// monsterRules:
// - Positive tal giver popularity ved kill.
// - Negative tal koster popularity ved kill.
// - Mobs der ikke staar paa listen giver/koster 0, indtil du selv tilfoejer dem.
//
// Skalering:
// - Mob level over player level giver lidt mere effekt.
// - Mob level under player level giver mindre effekt.
// - Elite mobs ganger effekten op. Det gaelder baade plus og minus.
//
// houseDestroy:
// - At smadre huse er bevidst dyrt i forhold til et almindeligt mob kill.
// - Region level skalerer straffen lidt op, saa huse i senere omraader betyder mere.
export const POPULARITY_CONFIG = {
  min: 0,
  max: 100,

  defaultMonsterChange: 0,
  monsterRules: MONSTER_POPULARITY_RULES,

  monsterLevelScalePerLevel: 0.08,
  minMonsterLevelMultiplier: 0.45,
  maxMonsterLevelMultiplier: 1.8,
  eliteMultiplier: 1.35,

  houseDestroy: {
    baseCost: -5,
    regionLevelScale: 0.25,
  },
};
