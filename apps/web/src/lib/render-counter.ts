const counters = new WeakMap<object, Map<string, number>>();

/**
 * 1, 2, 3... for the n-th call with the same `key` during one page render. Components of a
 * page render in document order and share one request object (a new one for every page), so
 * this numbers the tables, for instance, of a single post.
 */
export function nextIndex(request: object, key: string): number {
  let perKey = counters.get(request);
  if (!perKey) counters.set(request, (perKey = new Map()));
  const index = (perKey.get(key) ?? 0) + 1;
  perKey.set(key, index);
  return index;
}
