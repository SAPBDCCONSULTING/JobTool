export interface JobWebsite {
  name: string;
  url: string;
}

export interface CountryNode {
  name: string;
  websites: JobWebsite[];
}

export interface RegionNode {
  name: string;
  countries: CountryNode[];
}

/**
 * Hierarchy: Region → Country → Job Website.
 * Kept in sync with the backend source catalog (backend/src/data/scraper-sites.ts) —
 * only *enabled* sources appear here (disabled/anti-bot sites are not scrape targets).
 */
export const REGIONS: RegionNode[] = [
  {
    name: 'Europe',
    countries: [
      { name: 'Austria', websites: [{ name: 'karriere.at', url: 'https://www.karriere.at' }] },
      { name: 'Bosnia and Herzegovina', websites: [{ name: 'mojposao.ba', url: 'https://www.mojposao.ba' }] },
      { name: 'Croatia', websites: [{ name: 'moj-posao.net', url: 'https://www.moj-posao.net' }] },
      { name: 'Cyprus', websites: [{ name: 'cyprusjobs.com', url: 'https://www.cyprusjobs.com' }] },
      { name: 'Czech Republic', websites: [{ name: 'jobs.cz', url: 'https://www.jobs.cz' }] },
      { name: 'Denmark', websites: [{ name: 'jobindex.dk', url: 'https://www.jobindex.dk' }] },
      { name: 'Finland', websites: [{ name: 'tyomarkkinatori.fi', url: 'https://tyomarkkinatori.fi' }] },
      { name: 'France', websites: [{ name: 'pole-emploi.fr', url: 'https://www.pole-emploi.fr' }] },
      { name: 'Hungary', websites: [{ name: 'profession.hu', url: 'https://www.profession.hu' }] },
      { name: 'Iceland', websites: [{ name: 'alfred.is', url: 'https://www.alfred.is' }] },
      { name: 'Ireland', websites: [{ name: 'jobsireland.ie', url: 'https://www.jobsireland.ie' }] },
      { name: 'Kosovo', websites: [{ name: 'kosovajob.com', url: 'https://www.kosovajob.com' }] },
      { name: 'Montenegro', websites: [{ name: 'zaposli.me', url: 'https://www.zaposli.me' }] },
      { name: 'North Macedonia', websites: [{ name: 'vrabotuvanje.com.mk', url: 'https://www.vrabotuvanje.com.mk' }] },
      { name: 'Norway', websites: [{ name: 'finn.no', url: 'https://www.finn.no' }] },
      { name: 'Portugal', websites: [{ name: 'net-empregos.com', url: 'https://www.net-empregos.com' }] },
      { name: 'Romania', websites: [{ name: 'ejobs.ro', url: 'https://www.ejobs.ro' }] },
      { name: 'Serbia', websites: [{ name: 'infostud.com', url: 'https://www.infostud.com' }] },
      { name: 'Slovenia', websites: [{ name: 'mojedelo.com', url: 'https://www.mojedelo.com' }] },
      { name: 'Spain', websites: [{ name: 'infojobs.net', url: 'https://www.infojobs.net' }] },
      { name: 'Sweden', websites: [{ name: 'arbetsformedlingen.se', url: 'https://www.arbetsformedlingen.se' }] },
      { name: 'Switzerland', websites: [{ name: 'jobs.ch', url: 'https://www.jobs.ch' }] },
      { name: 'United Kingdom', websites: [{ name: 'reed.co.uk', url: 'https://www.reed.co.uk' }] },
    ],
  },
  {
    name: 'North America',
    countries: [
      {
        name: 'United States',
        websites: [
          { name: 'dice.com', url: 'https://www.dice.com' },
          { name: 'themuse.com', url: 'https://www.themuse.com' },
        ],
      },
    ],
  },
];

export const EUROPE_COUNTRIES = REGIONS.find((r) => r.name === 'Europe')!.countries.map(
  (c) => c.name,
);

export type RegionSelection =
  | { level: 'all' }
  | { level: 'region'; region: string }
  | { level: 'country'; region: string; country: string }
  | { level: 'website'; region: string; country: string; website: string };

