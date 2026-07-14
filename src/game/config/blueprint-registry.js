export function mergeBlueprintRegistries(...registries) {
  const merged = {};
  const owners = new Map();
  for (let registryIndex = 0; registryIndex < registries.length; registryIndex += 1) {
    for (const [key, blueprint] of Object.entries(registries[registryIndex] ?? {})) {
      const id = String(blueprint?.id ?? key).trim();
      if (id !== key) throw new Error(`Blueprint registry key "${key}" must exactly match blueprint id "${id}"`);
      if (owners.has(id)) throw new Error(`Duplicate blueprint id "${id}" in registries ${owners.get(id)} and ${registryIndex}`);
      owners.set(id, registryIndex);
      merged[id] = blueprint;
    }
  }
  return merged;
}
