
export function preventDefault(event) {
  event.preventDefault();
}

export function hashToIndex(seed, modulo) {
  const max = Math.max(1, Math.floor(Number(modulo) || 1));
  let hash = 2166136261;
  const text = String(seed ?? "");
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % max;
}

export function randomInt(min, max) {
  const lo = Math.floor(Number(min) || 1);
  const hi = Math.max(lo, Math.floor(Number(max) || lo));
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}
