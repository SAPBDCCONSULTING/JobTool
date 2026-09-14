import { prisma } from '../lib/prisma.js';
// ─── Source base-URL cache (for resolving relative job links) ────────────────
let cache = null;
const TTL = 5 * 60 * 1000;
export async function getSourceBaseMap() {
    if (cache && Date.now() - cache.loadedAt < TTL)
        return cache.map;
    const sources = await prisma.source.findMany({
        where: { website: { not: null } },
        select: { name: true, website: true },
    });
    const map = new Map();
    for (const s of sources) {
        try {
            map.set(s.name, new URL(s.website).origin);
        }
        catch {
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
export function normalizeJobUrl(url, sourceName, bases) {
    if (!url)
        return null;
    const trimmed = url.trim();
    if (!trimmed)
        return null;
    if (/^https?:\/\//i.test(trimmed))
        return trimmed;
    const base = sourceName ? bases?.get(sourceName) : undefined;
    if (!base)
        return null;
    try {
        return new URL(trimmed, base).toString();
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=url.service.js.map