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

/** Hierarchy: Region → Europe → Country → Job Website (from Job Sites sheet) */
export const REGIONS: RegionNode[] = [
  {
    name: 'Europe',
    countries: [
      {
        name: 'Albania',
        websites: [{ name: 'duapune.com', url: 'https://www.duapune.com' }],
      },
      {
        name: 'Austria',
        websites: [{ name: 'karriere.at', url: 'https://www.karriere.at' }],
      },
      {
        name: 'Belgium',
        websites: [{ name: 'vdab.be', url: 'https://www.vdab.be' }],
      },
      {
        name: 'Bosnia and Herzegovina',
        websites: [{ name: 'mojposao.ba', url: 'https://www.mojposao.ba' }],
      },
      {
        name: 'Bulgaria',
        websites: [{ name: 'jobs.bg', url: 'https://www.jobs.bg' }],
      },
      {
        name: 'Croatia',
        websites: [{ name: 'moj-posao.net', url: 'https://www.moj-posao.net' }],
      },
      {
        name: 'Cyprus',
        websites: [{ name: 'cyprusjobs.com', url: 'https://www.cyprusjobs.com' }],
      },
      {
        name: 'Czech Republic',
        websites: [{ name: 'jobs.cz', url: 'https://www.jobs.cz' }],
      },
      {
        name: 'Denmark',
        websites: [{ name: 'jobindex.dk', url: 'https://www.jobindex.dk' }],
      },
      {
        name: 'Estonia',
        websites: [{ name: 'cv.ee', url: 'https://www.cv.ee' }],
      },
      {
        name: 'Finland',
        websites: [
          { name: 'tyomarkkinatori.fi', url: 'https://tyomarkkinatori.fi' },
          { name: 'te-palvelut.fi', url: 'https://www.te-palvelut.fi' },
        ],
      },
      {
        name: 'France',
        websites: [{ name: 'pole-emploi.fr', url: 'https://www.pole-emploi.fr' }],
      },
      {
        name: 'Germany',
        websites: [{ name: 'stepstone.de', url: 'https://www.stepstone.de' }],
      },
      {
        name: 'Greece',
        websites: [{ name: 'kariera.gr', url: 'https://www.kariera.gr' }],
      },
      {
        name: 'Hungary',
        websites: [{ name: 'profession.hu', url: 'https://www.profession.hu' }],
      },
      {
        name: 'Iceland',
        websites: [{ name: 'alfred.is', url: 'https://www.alfred.is' }],
      },
      {
        name: 'Ireland',
        websites: [
          { name: 'jobs.ie', url: 'https://www.jobs.ie' },
          { name: 'jobsireland.ie', url: 'https://www.jobsireland.ie' },
        ],
      },
      {
        name: 'Italy',
        websites: [{ name: 'infojobs.it', url: 'https://www.infojobs.it' }],
      },
      {
        name: 'Kosovo',
        websites: [{ name: 'kosovajob.com', url: 'https://www.kosovajob.com' }],
      },
      {
        name: 'Latvia',
        websites: [{ name: 'cv.lv', url: 'https://www.cv.lv' }],
      },
      {
        name: 'Lithuania',
        websites: [{ name: 'cvbankas.lt', url: 'https://www.cvbankas.lt' }],
      },
      {
        name: 'Luxembourg',
        websites: [{ name: 'jobs.lu', url: 'https://www.jobs.lu' }],
      },
      {
        name: 'Malta',
        websites: [{ name: 'keepmeposted.com.mt', url: 'https://www.keepmeposted.com.mt' }],
      },
      {
        name: 'Montenegro',
        websites: [{ name: 'zaposli.me', url: 'https://www.zaposli.me' }],
      },
      {
        name: 'North Macedonia',
        websites: [{ name: 'vrabotuvanje.com.mk', url: 'https://www.vrabotuvanje.com.mk' }],
      },
      {
        name: 'Norway',
        websites: [{ name: 'finn.no', url: 'https://www.finn.no' }],
      },
      {
        name: 'Poland',
        websites: [{ name: 'pracuj.pl', url: 'https://www.pracuj.pl' }],
      },
      {
        name: 'Portugal',
        websites: [{ name: 'net-empregos.com', url: 'https://www.net-empregos.com' }],
      },
      {
        name: 'Romania',
        websites: [{ name: 'ejobs.ro', url: 'https://www.ejobs.ro' }],
      },
      {
        name: 'Serbia',
        websites: [{ name: 'infostud.com', url: 'https://www.infostud.com' }],
      },
      {
        name: 'Slovakia',
        websites: [{ name: 'profesia.sk', url: 'https://www.profesia.sk' }],
      },
      {
        name: 'Slovenia',
        websites: [{ name: 'mojedelo.com', url: 'https://www.mojedelo.com' }],
      },
      {
        name: 'Spain',
        websites: [{ name: 'infojobs.net', url: 'https://www.infojobs.net' }],
      },
      {
        name: 'Sweden',
        websites: [{ name: 'arbetsformedlingen.se', url: 'https://www.arbetsformedlingen.se' }],
      },
      {
        name: 'Switzerland',
        websites: [{ name: 'jobs.ch', url: 'https://www.jobs.ch' }],
      },
      {
        name: 'The Netherlands',
        websites: [{ name: 'nationalevacaturebank.nl', url: 'https://www.nationalevacaturebank.nl' }],
      },
      {
        name: 'Ukraine',
        websites: [{ name: 'robota.ua', url: 'https://www.robota.ua' }],
      },
      {
        name: 'United Kingdom',
        websites: [{ name: 'reed.co.uk', url: 'https://www.reed.co.uk' }],
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
