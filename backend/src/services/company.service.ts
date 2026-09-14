import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { normalizeText } from './normalize.js';

/** Legal-suffix tokens (EN/DE/FR/NL/ES/IT/Nordic/CEE) stripped for company matching. */
const LEGAL_SUFFIXES = new Set([
  'inc', 'llc', 'llp', 'ltd', 'limited', 'plc', 'corp', 'corporation', 'co', 'company',
  'gmbh', 'ag', 'kg', 'eeg',
  'sa', 'sas', 'sarl', 'snc',
  'srl', 'spa', 'spa', 'scarl',
  'bv', 'nv', 'cv', 'stichting',
  'oy', 'oyj', 'ab',
  'as', 'ou', 'oü',
  'sro', 'spol', 'doo', 'd.o.o.', 'dd', 'ad', 'jsc',
  'holding', 'holdings', 'group', 'grupo', 'ltda', 'saic', 'pte',
]);

function stripDottedSuffixes(s: string): string {
  return s
    .replace(/\bs\.r\.o\./g, ' sro ')
    .replace(/\bd\.o\.o\./g, ' doo ')
    .replace(/\bs\.p\.a\./g, ' spa ')
    .replace(/\bs\.a\./g, ' sa ')
    .replace(/\bg\.m\.b\.h\./g, ' gmbh ')
    .replace(/\bs\.p\.z\s*o\.o\./g, ' ');
}

/** Normalize a raw company name into a stable matching key (e.g. "ABC Incorporated" → "abc"). */
export function normalizeCompanyName(raw: string | null | undefined): string {
  if (!raw) return 'unknown';
  const tokens = stripDottedSuffixes(raw)
    .toLowerCase()
    .replace(/['`’]/g, '')
    .split(/[\s.,\-–—/()&\\]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => !LEGAL_SUFFIXES.has(t) && t !== 'the');
  return tokens.join('') || 'unknown';
}

/** Display name: trimmed original, single-spaced. */
export function cleanDisplayName(raw: string | null | undefined): string {
  return (raw ?? 'Unknown').replace(/\s+/g, ' ').trim() || 'Unknown';
}

/**
 * Resolve a raw company name to a Company row (auto-creating when needed).
 * Matching is done on the normalized key; display aliases are accumulated.
 */
export async function resolveCompany(rawName: string, country?: string | null): Promise<{ id: string; name: string; normalizedName: string }> {
  const display = cleanDisplayName(rawName);
  const normalized = normalizeCompanyName(rawName);

  let company = await prisma.company.findUnique({ where: { normalizedName: normalized } });

  // Race guard for concurrent ingestion workers.
  if (!company) {
    try {
      company = await prisma.company.create({
        data: { name: display, normalizedName: normalized, country: country ?? null },
      });
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === 'P2002') {
        company = await prisma.company.findUnique({ where: { normalizedName: normalized } });
      } else {
        throw err;
      }
    }
  }

  if (company) {
    const needsAlias =
      display.toLowerCase() !== company.name.toLowerCase() && !company.aliases.includes(display);
    const needsCountry = !company.country && !!country;
    if (needsAlias || needsCountry) {
      company = await prisma.company.update({
        where: { id: company.id },
        data: {
          ...(needsAlias ? { aliases: { push: display } } : {}),
          ...(needsCountry ? { country: country ?? null } : {}),
        },
      });
    }
    return { id: company.id, name: company.name, normalizedName: company.normalizedName };
  }

  logger.warn({ rawName, normalized }, 'Company resolution failed');
  throw new Error(`Could not resolve or create company for "${rawName}"`);
}