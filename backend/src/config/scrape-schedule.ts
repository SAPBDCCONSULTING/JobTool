/**
 * Daily auto-scrape targets for the scheduler orchestrator.
 * Working Europe sites only (from scraper/SITES_STATUS.md) — blocked sites omitted.
 */

export interface LinkedInScanTarget {
  keyword: string;
  location: string;
}

export interface EuropeScanTarget {
  country: string;
  website: string;
  keyword: string;
}

/** Working Europe scrapers — keep in sync with backend/scraper/SITES_STATUS.md */
export const WORKING_EUROPE_SITES: Array<{ country: string; website: string }> = [
  { country: 'Austria', website: 'karriere.at' },
  { country: 'Bosnia and Herzegovina', website: 'mojposao.ba' },
  { country: 'Croatia', website: 'moj-posao.net' },
  { country: 'Cyprus', website: 'cyprusjobs.com' },
  { country: 'Czech Republic', website: 'jobs.cz' },
  { country: 'Denmark', website: 'jobindex.dk' },
  { country: 'Finland', website: 'tyomarkkinatori.fi' },
  { country: 'France', website: 'pole-emploi.fr' },
  { country: 'Hungary', website: 'profession.hu' },
  { country: 'Iceland', website: 'alfred.is' },
  { country: 'Ireland', website: 'jobsireland.ie' },
  { country: 'Kosovo', website: 'kosovajob.com' },
  { country: 'Montenegro', website: 'zaposli.me' },
  { country: 'North Macedonia', website: 'vrabotuvanje.com.mk' },
  { country: 'Norway', website: 'finn.no' },
  { country: 'Portugal', website: 'net-empregos.com' },
  { country: 'Romania', website: 'ejobs.ro' },
  { country: 'Serbia', website: 'infostud.com' },
  { country: 'Slovenia', website: 'mojedelo.com' },
  { country: 'Spain', website: 'infojobs.net' },
  { country: 'Sweden', website: 'arbetsformedlingen.se' },
  { country: 'Switzerland', website: 'jobs.ch' },
  { country: 'United Kingdom', website: 'reed.co.uk' },
];

export function buildLinkedInTargets(
  keyword: string,
  locationsCsv: string,
): LinkedInScanTarget[] {
  return locationsCsv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((location) => ({ keyword, location }));
}

export function buildEuropeTargets(keyword: string): EuropeScanTarget[] {
  return WORKING_EUROPE_SITES.map((site) => ({
    ...site,
    keyword,
  }));
}
