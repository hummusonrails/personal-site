// Flood guard for the public analytics beacon (pages/api/p.ts).

// Per-instance flood guard: at most 300 hits per address per 10 minutes, far
// above what one person browsing produces. In memory so a hit costs one write.
const LIMIT = 300;
const WINDOW_MS = 10 * 60_000;
const seen = new Map<string, { n: number; start: number }>();

export function allowedBeacon(ip: string, now: number) {
  const cur = seen.get(ip);
  if (!cur || now - cur.start > WINDOW_MS) {
    if (seen.size > 10_000) seen.clear();
    seen.set(ip, { n: 1, start: now });
    return true;
  }
  cur.n += 1;
  return cur.n <= LIMIT;
}

/** Test helper: forget every address. */
export function resetBeaconLimits() {
  seen.clear();
}
