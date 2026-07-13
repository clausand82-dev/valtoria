export function mergePrefabRegistries(...registries) {
  const merged = {};
  const owners = new Map();
  const keyOwners = new Map();
  for (let registryIndex = 0; registryIndex < registries.length; registryIndex += 1) {
    for (const [key, prefab] of Object.entries(registries[registryIndex] ?? {})) {
      const id = String(prefab?.id ?? key).trim();
      if (prefab?.id !== undefined && id !== key) {
        throw new Error(`Prefab registry key "${key}" must exactly match prefab id "${id}"`);
      }
      if (keyOwners.has(key)) {
        throw new Error(`Duplicate prefab registry key "${key}" in registries ${keyOwners.get(key)} and ${registryIndex}`);
      }
      if (owners.has(id)) {
        throw new Error(`Duplicate prefab id "${id}" in registries at keys "${owners.get(id)}" and "${key}"`);
      }
      keyOwners.set(key, registryIndex);
      owners.set(id, key);
      merged[key] = prefab;
    }
  }
  return merged;
}
