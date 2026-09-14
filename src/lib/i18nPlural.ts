type Translate = (key: string, vars?: Record<string, string | number>) => string;

/**
 * Picks `${baseKey}One` for 1 and `${baseKey}Other` (with {count}) otherwise,
 * so labels read "1 work" / "12 works" instead of "1 works".
 */
export function plural(t: Translate, baseKey: string, count: number): string {
  if (count === 1) return t(`${baseKey}One`);
  return t(`${baseKey}Other`, { count: count.toLocaleString("en-US") });
}
