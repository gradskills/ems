// A single reference "now", captured once at module load.
// Stable across renders, so React Compiler's purity rule is satisfied and
// all relative-time math in the prototype stays internally consistent.
export const NOW = Date.now();

/** deterministic pseudo-value in [min, max) from a string seed (no Math.random in render) */
export function seededInt(seed: string, min: number, max: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h);
  return min + (Math.abs(h) % Math.max(1, max - min));
}
