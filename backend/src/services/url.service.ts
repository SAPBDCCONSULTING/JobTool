import { prisma } from '../lib/prisma.js';

// ─── Source base-URL cache (for resolving relative job links) ────────────────
let cache: { map: Map<string, string>; loadedAt: number } | null = null;
const TTL = 5 * 60 * 1000;

export async function getSourceBaseMap(): Promise<Map<string, string>> {
  if (cache && Date.now() - cache.loadedAt < TTL) return cache.map;
  const sources = await prisma.source.findMany({
    where: { website: { not: null } },
    select: { name: true, website: true },
  });
  const map = new Map<string, string>();
  for (const s of sources) {
    try {
      map.set(s.name, new URL(s.website!).origin);
    } catch {
      // ignore malformed website entries
    }
  }
  cache = { map, loadedAt: Date.now() };
  return map;
}

/**
 * Normalize a job URL: make relative URLs (e.g. "/job/12345") absolute
 * against the source site's origin. Returns null when unresolvable.
 */
export function normalizeJobUrl(
  url: string | null | undefined,
  sourceName?: string | null,
  bases?: Map<string, string>,
): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const base = sourceName ? bases?.get(sourceName) : undefined;
  if (!base) return null;
  try {
    return new URL(trimmed, base).toString();
  } catch {
    return null;
  }
}
