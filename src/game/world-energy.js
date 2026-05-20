/*
World energy model:
- worldEnergy.lydra and worldEnergy.netdra are raw saved point totals.
- UI balance and conditions are derived from the ratio between those raw totals.
- Use applyWorldEnergy(progress, { lydra, netdra }) from runtime reward/effect flows.
- Use getWorldEnergyState(progress) for UI and percentage balance conditions.
- Defaults/migration for old saves: { lydra: 0, netdra: 100 }.
*/
export const DEFAULT_WORLD_ENERGY = Object.freeze({
  lydra: 0,
  netdra: 100,
});

export function normalizeWorldEnergy(worldEnergy) {
  const source = worldEnergy && typeof worldEnergy === "object" ? worldEnergy : DEFAULT_WORLD_ENERGY;
  return {
    lydra: Math.max(0, Number(source.lydra) || 0),
    netdra: Math.max(0, Number(source.netdra) || 0),
  };
}

export function ensureWorldEnergy(progress) {
  if (!progress || typeof progress !== "object") return normalizeWorldEnergy();
  progress.worldEnergy = normalizeWorldEnergy(progress.worldEnergy);
  return progress.worldEnergy;
}

export function applyWorldEnergy(progress, { lydra = 0, netdra = 0 } = {}) {
  const current = ensureWorldEnergy(progress);
  current.lydra = Math.max(0, current.lydra + (Number(lydra) || 0));
  current.netdra = Math.max(0, current.netdra + (Number(netdra) || 0));
  return current;
}

export function getWorldEnergyState(progress) {
  const { lydra, netdra } = normalizeWorldEnergy(progress?.worldEnergy);
  const total = Math.max(1, lydra + netdra);
  const lydraPercent = Math.round((lydra / total) * 100);
  const netdraPercent = 100 - lydraPercent;
  const balanceValue = Math.round(((netdra - lydra) / total) * 100);
  const dominant = lydraPercent === netdraPercent ? "neutral" : lydraPercent > netdraPercent ? "lydra" : "netdra";
  return {
    lydra,
    netdra,
    lydraPercent,
    netdraPercent,
    balanceValue,
    dominant,
  };
}
