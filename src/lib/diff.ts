export function diff<T extends Record<string, any>>(prev: T, next: T): Partial<T> {
  const patch: Partial<T> = {};
  const keys = new Set([...Object.keys(prev || {}), ...Object.keys(next || {})]);
  keys.forEach((key) => {
    const a = (prev as any)[key];
    const b = (next as any)[key];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      (patch as any)[key] = b === undefined ? null : b;
    }
  });
  return patch;
}
