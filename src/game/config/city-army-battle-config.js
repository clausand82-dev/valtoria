export const CITY_ARMY_BATTLE_CONFIG = {
  minWinChance: 0.05,
  maxWinChance: 0.95,
  happinessMorale: {
    minMultiplier: 0.7,
    maxMultiplier: 1.25,
    neutral: 50,
  },
  mobThreatByType: {
    Peasant: 0.7,
    Knight: 1.35,
    Demon: 1.6,
    Skeleton: 1.0,
    Ghost: 1.25,
    Spider: 0.9,
    Snake: 0.9,
    Scorpion: 1.1,
    Wolf: 0.9,
    "Wild Boar": 1.0,
  },
  defaultMobThreat: 1,
  winLossPct: { min: 0.08, max: 0.32 },
  loseLossPct: { min: 0.55, max: 0.95 },
};
