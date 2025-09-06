export function diff<T extends Record<string, unknown>>(prev: T, next: T): Partial<T> {
  const patch: Partial<T> = {};
  const keys = new Set([...Object.keys(prev || {}), ...Object.keys(next || {})]);
  keys.forEach((key) => {
    const a = (prev as Record<string, unknown>)[key];
    const b = (next as Record<string, unknown>)[key];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      (patch as Record<string, unknown>)[key] = b === undefined ? null : b;
    }
  });
  return patch;
}
