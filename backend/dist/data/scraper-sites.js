/**
 * European country job sites supported by the Playwright scrapers
 * (backend/scraper/sites). Matches SITES_STATUS.md:
 * working sites are seeded enabled; anti-bot/closed sites are seeded
 * disabled (visible in the Sources UI, but not scheduled).
 */
export const SCRAPER_SITES = [
    // ── Working ──────────────────────────────────────────────
    { name: 'karriere.at', country: 'Austria', website: 'https://www.karriere.at', enabled: true },
    { name: 'mojposao.ba', country: 'Bosnia and Herzegovina', website: 'https://www.mojposao.ba', enabled: true },
    { name: 'moj-posao.net', country: 'Croatia', website: 'https://www.moj-posao.net', enabled: true },
    { name: 'cyprusjobs.com', country: 'Cyprus', website: 'https://www.cyprusjobs.com', enabled: true },
    { name: 'jobs.cz', country: 'Czech Republic', website: 'https://www.jobs.cz', enabled: true },
    { name: 'jobindex.dk', country: 'Denmark', website: 'https://www.jobindex.dk', enabled: true },
    { name: 'tyomarkkinatori.fi', country: 'Finland', website: 'https://tyomarkkinatori.fi', enabled: true },
    { name: 'pole-emploi.fr', country: 'France', website: 'https://www.pole-emploi.fr', enabled: true },
    { name: 'profession.hu', country: 'Hungary', website: 'https://www.profession.hu', enabled: true },
    { name: 'alfred.is', country: 'Iceland', website: 'https://www.alfred.is', enabled: true },
    { name: 'jobsireland.ie', country: 'Ireland', website: 'https://www.jobsireland.ie', enabled: true },
    { name: 'kosovajob.com', country: 'Kosovo', website: 'https://www.kosovajob.com', enabled: true },
    { name: 'zaposli.me', country: 'Montenegro', website: 'https://www.zaposli.me', enabled: true },
    { name: 'vrabotuvanje.com.mk', country: 'North Macedonia', website: 'https://www.vrabotuvanje.com.mk', enabled: true },
    { name: 'finn.no', country: 'Norway', website: 'https://www.finn.no', enabled: true },
    { name: 'net-empregos.com', country: 'Portugal', website: 'https://www.net-empregos.com', enabled: true },
    { name: 'ejobs.ro', country: 'Romania', website: 'https://www.ejobs.ro', enabled: true },
    { name: 'infostud.com', country: 'Serbia', website: 'https://www.infostud.com', enabled: true },
    { name: 'mojedelo.com', country: 'Slovenia', website: 'https://www.mojedelo.com', enabled: true },
    { name: 'infojobs.net', country: 'Spain', website: 'https://www.infojobs.net', enabled: true },
    { name: 'arbetsformedlingen.se', country: 'Sweden', website: 'https://www.arbetsformedlingen.se', enabled: true },
    { name: 'jobs.ch', country: 'Switzerland', website: 'https://www.jobs.ch', enabled: true },
    { name: 'reed.co.uk', country: 'United Kingdom', website: 'https://www.reed.co.uk', enabled: true },
    // ── Anti-bot / closed (disabled but shown in Sources UI) ─
    { name: 'duapune.com', country: 'Albania', website: 'https://www.duapune.com', enabled: false },
    { name: 'vdab.be', country: 'Belgium', website: 'https://www.vdab.be', enabled: false },
    { name: 'jobs.bg', country: 'Bulgaria', website: 'https://www.jobs.bg', enabled: false },
    { name: 'cv.ee', country: 'Estonia', website: 'https://www.cv.ee', enabled: false },
    { name: 'stepstone.de', country: 'Germany', website: 'https://www.stepstone.de', enabled: false },
    { name: 'kariera.gr', country: 'Greece', website: 'https://www.kariera.gr', enabled: false },
    { name: 'jobs.ie', country: 'Ireland', website: 'https://www.jobs.ie', enabled: false },
    { name: 'infojobs.it', country: 'Italy', website: 'https://www.infojobs.it', enabled: false },
    { name: 'cv.lv', country: 'Latvia', website: 'https://www.cv.lv', enabled: false },
    { name: 'cvbankas.lt', country: 'Lithuania', website: 'https://www.cvbankas.lt', enabled: false },
    { name: 'jobs.lu', country: 'Luxembourg', website: 'https://www.jobs.lu', enabled: false },
    { name: 'keepmeposted.com.mt', country: 'Malta', website: 'https://www.keepmeposted.com.mt', enabled: false },
    { name: 'pracuj.pl', country: 'Poland', website: 'https://www.pracuj.pl', enabled: false },
    { name: 'profesia.sk', country: 'Slovakia', website: 'https://www.profesia.sk', enabled: false },
    { name: 'nationalevacaturebank.nl', country: 'The Netherlands', website: 'https://www.nationalevacaturebank.nl', enabled: false },
    { name: 'robota.ua', country: 'Ukraine', website: 'https://www.robota.ua', enabled: false },
];
/** The LinkedIn source (Apify actor) is always present. */
export const LINKEDIN_SOURCE = {
    name: 'linkedin-apify',
    type: 'APIFY',
    country: null,
    website: null,
    enabled: true,
};
//# sourceMappingURL=scraper-sites.js.map