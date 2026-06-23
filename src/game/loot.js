export function normalizeLootTableRefs(source) {
  const refs = [];
  if (source?.lootTable) refs.push(source.lootTable);
  if (Array.isArray(source?.lootTables)) refs.push(...source.lootTables);
  return [...new Set(refs.map((id) => String(id ?? '').trim()).filter(Boolean))];
}

export function weightedLootEntry(entries, randomValue = Math.random()) {
  const weighted = (Array.isArray(entries) ? entries : [])
    .filter((entry) => entry && Number(entry.weight) > 0);
  const total = weighted.reduce((sum, entry) => sum + Number(entry.weight), 0);
  if (total <= 0) return null;
  let roll = Math.max(0, Math.min(1, randomValue)) * total;
  for (const entry of weighted) {
    roll -= Number(entry.weight);
    if (roll <= 0) return entry;
  }
  return weighted[weighted.length - 1] ?? null;
}
