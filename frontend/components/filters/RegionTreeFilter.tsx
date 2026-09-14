'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { REGIONS, type RegionSelection } from '@/lib/regions';
import { triggerCountryScrape, fetchScrapeStatus, type ScrapeStatusResponse } from '@/lib/api';

interface RegionTreeFilterProps {
  selection: RegionSelection;
  onChange: (selection: RegionSelection) => void;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className={`flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function RegionTreeFilter({ selection, onChange }: RegionTreeFilterProps) {
  const [query, setQuery] = useState('');
  const [openRegions, setOpenRegions] = useState<Record<string, boolean>>({ Europe: true });
  const [openCountries, setOpenCountries] = useState<Record<string, boolean>>({});
  const [scrapeTarget, setScrapeTarget] = useState<{ country: string; websiteUrl: string } | null>(null);
  const [scrapeKeyword, setScrapeKeyword] = useState('');
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState<string | null>(null);
  const [scrapeStatus, setScrapeStatus] = useState<ScrapeStatusResponse | null>(null);
  const [activeScrape, setActiveScrape] = useState<{ country: string; website: string } | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!activeScrape) { stopPolling(); return; }
    const poll = async () => {
      try {
        const s = await fetchScrapeStatus(activeScrape.country, activeScrape.website);
        setScrapeStatus(s);
        if (s.phase === 'done' || s.phase === 'error' || s.phase === 'idle') {
          setTimeout(() => { setActiveScrape(null); setScrapeStatus(null); }, 8000);
          stopPolling();
        }
      } catch { /* ignore */ }
    };
    poll();
    pollRef.current = setInterval(poll, 3000);
    return stopPolling;
  }, [activeScrape, stopPolling]);

  const handleScrape = async () => {
    if (!scrapeTarget || !scrapeKeyword.trim()) return;
    setScrapeLoading(true);
    try {
      await triggerCountryScrape(scrapeTarget.country, scrapeTarget.websiteUrl, scrapeKeyword.trim());
      setActiveScrape({ country: scrapeTarget.country, website: scrapeTarget.websiteUrl });
      setScrapeStatus({ phase: 'scraping', message: `Scraping "${scrapeKeyword.trim()}"…` });
      setScrapeTarget(null);
      setScrapeKeyword('');
    } catch (err) {
      setScrapeMsg(err instanceof Error ? err.message : 'Scrape failed');
      setTimeout(() => setScrapeMsg(null), 5000);
    } finally {
      setScrapeLoading(false);
    }
  };

  const filteredRegions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return REGIONS;

    return REGIONS.map((region) => ({
      ...region,
      countries: region.countries.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.websites.some((w) => w.name.toLowerCase().includes(q)),
      ),
    })).filter((r) => r.countries.length > 0);
  }, [query]);

  const isRegionActive = (region: string) =>
    (selection.level === 'region' ||
      selection.level === 'country' ||
      selection.level === 'website') &&
    selection.region === region;

  const isCountryActive = (country: string) =>
    (selection.level === 'country' || selection.level === 'website') &&
    selection.country === country;

  const isWebsiteActive = (website: string) =>
    selection.level === 'website' && selection.website === website;

  const toggleRegion = (name: string) => {
    setOpenRegions((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const toggleCountry = (name: string) => {
    setOpenCountries((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const breadcrumb =
    selection.level === 'all'
      ? 'All regions'
      : selection.level === 'region'
        ? selection.region
        : selection.level === 'country'
          ? `${selection.region} › ${selection.country}`
          : `${selection.region} › ${selection.country} › ${selection.website}`;

  return (
    <aside className="w-[280px] flex-shrink-0 flex flex-col bg-white border-r border-slate-200 h-full min-h-0">
      <div className="px-4 pt-5 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              Location
            </p>
            <h2 className="text-sm font-semibold text-slate-800 mt-0.5">Region filter</h2>
          </div>
          {selection.level !== 'all' && (
            <button
              type="button"
              onClick={() => onChange({ level: 'all' })}
              className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700"
            >
              Clear
            </button>
          )}
        </div>

        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search country or site…"
            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
          />
        </div>

        <p className="mt-2.5 text-[11px] text-slate-500 truncate" title={breadcrumb}>
          {breadcrumb}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        <button
          type="button"
          onClick={() => onChange({ level: 'all' })}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
            selection.level === 'all'
              ? 'bg-indigo-50 text-indigo-700 font-semibold'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          All regions
        </button>

        <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Region → Europe → Country → Site
        </p>

        {filteredRegions.map((region) => {
          const regionOpen = query ? true : !!openRegions[region.name];
          const regionActive = isRegionActive(region.name);

          return (
            <div key={region.name} className="select-none">
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => toggleRegion(region.name)}
                  className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label={regionOpen ? 'Collapse' : 'Expand'}
                >
                  <Chevron open={regionOpen} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpenRegions((prev) => ({ ...prev, [region.name]: true }));
                    onChange({ level: 'region', region: region.name });
                  }}
                  className={`flex-1 text-left px-2 py-1.5 rounded-lg text-sm transition-colors ${
                    selection.level === 'region' && selection.region === region.name
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : regionActive
                        ? 'text-indigo-600 font-medium'
                        : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                    />
                    {region.name}
                    <span className="text-[10px] font-normal text-slate-400">
                      {region.countries.length}
                    </span>
                  </span>
                </button>
              </div>

              {regionOpen && (
                <div className="ml-3 border-l border-slate-100 pl-1 space-y-0.5 mt-0.5">
                  {region.countries.map((country) => {
                    const countryKey = `${region.name}:${country.name}`;
                    const countryOpen = query
                      ? true
                      : !!openCountries[countryKey] || isCountryActive(country.name);
                    const countryActive = isCountryActive(country.name);

                    return (
                      <div key={countryKey}>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => toggleCountry(countryKey)}
                            className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            aria-label={countryOpen ? 'Collapse' : 'Expand'}
                          >
                            <Chevron open={countryOpen} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenCountries((prev) => ({ ...prev, [countryKey]: true }));
                              onChange({
                                level: 'country',
                                region: region.name,
                                country: country.name,
                              });
                            }}
                            className={`flex-1 text-left px-2 py-1.5 rounded-lg text-[13px] transition-colors ${
                              selection.level === 'country' &&
                              selection.country === country.name
                                ? 'bg-indigo-50 text-indigo-700 font-semibold'
                                : countryActive
                                  ? 'text-indigo-600 font-medium'
                                  : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {country.name}
                          </button>
                        </div>

                        {countryOpen && (
                          <div className="ml-4 border-l border-slate-100 pl-2 space-y-0.5 mt-0.5 mb-1">
                            {country.websites.map((site) => {
                              const active = isWebsiteActive(site.name);
                              const isScrapeTarget =
                                scrapeTarget?.country === country.name &&
                                scrapeTarget?.websiteUrl === site.url;
                              return (
                                <div key={site.url}>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onChange({
                                          level: 'website',
                                          region: region.name,
                                          country: country.name,
                                          website: site.name,
                                        })
                                      }
                                      className={`flex-1 text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                                        active
                                          ? 'bg-violet-50 text-violet-700 font-semibold'
                                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                      }`}
                                      title={site.url}
                                    >
                                      <span className="inline-flex items-center gap-1.5 min-w-0">
                                        <svg
                                          width="11"
                                          height="11"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          className="flex-shrink-0 opacity-70"
                                        >
                                          <circle cx="12" cy="12" r="10" />
                                          <path d="M2 12h20" />
                                          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                        </svg>
                                        <span className="truncate">{site.name}</span>
                                      </span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (isScrapeTarget) {
                                          setScrapeTarget(null);
                                        } else {
                                          setScrapeTarget({ country: country.name, websiteUrl: site.url });
                                          setScrapeKeyword('');
                                        }
                                      }}
                                      className="px-1.5 py-1 rounded-md text-[10px] font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors flex-shrink-0"
                                      title="Scrape this website"
                                    >
                                      ⚡
                                    </button>
                                  </div>
                                  {isScrapeTarget && (
                                    <div className="ml-2 mt-1 mb-2 flex items-center gap-1">
                                      <input
                                        type="text"
                                        value={scrapeKeyword}
                                        onChange={(e) => setScrapeKeyword(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
                                        placeholder="Keyword…"
                                        autoFocus
                                        className="flex-1 min-w-0 px-2 py-1 text-[11px] rounded-md border border-slate-200 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                                      />
                                      <button
                                        type="button"
                                        onClick={handleScrape}
                                        disabled={scrapeLoading || !scrapeKeyword.trim()}
                                        className="px-2 py-1 rounded-md text-[10px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 flex-shrink-0"
                                      >
                                        {scrapeLoading ? '…' : 'Go'}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {filteredRegions.length === 0 && (
          <p className="px-3 py-6 text-xs text-slate-400 text-center">No matches found</p>
        )}
      </div>

      {(scrapeStatus || scrapeMsg) && (
        <div className="px-3 py-2.5 border-t border-slate-100 bg-slate-50">
          {scrapeStatus && scrapeStatus.phase !== 'idle' && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                {(scrapeStatus.phase === 'scraping' || scrapeStatus.phase === 'processing' || scrapeStatus.phase === 'classifying') && (
                  <svg className="w-3 h-3 animate-spin text-indigo-600" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                )}
                {scrapeStatus.phase === 'done' && <span className="text-emerald-600 text-xs">✓</span>}
                {scrapeStatus.phase === 'error' && <span className="text-red-600 text-xs">✗</span>}
                <span className={`text-[11px] font-medium ${
                  scrapeStatus.phase === 'done' ? 'text-emerald-700' :
                  scrapeStatus.phase === 'error' ? 'text-red-700' : 'text-indigo-700'
                }`}>
                  {scrapeStatus.message}
                </span>
              </div>
              {(scrapeStatus.phase === 'scraping' || scrapeStatus.phase === 'processing' || scrapeStatus.phase === 'classifying') && (
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${
                    scrapeStatus.phase === 'scraping' ? 'w-1/4 bg-indigo-400 animate-pulse' :
                    scrapeStatus.phase === 'processing' ? 'w-2/4 bg-indigo-500' : 'w-3/4 bg-violet-500'
                  }`} />
                </div>
              )}
              {scrapeStatus.itemsFound !== undefined && scrapeStatus.itemsFound > 0 && (
                <p className="text-[10px] text-slate-500">
                  {scrapeStatus.itemsFound} jobs found
                  {scrapeStatus.itemsProcessed ? ` · ${scrapeStatus.itemsProcessed} processed` : ''}
                </p>
              )}
            </div>
          )}
          {scrapeMsg && !scrapeStatus && (
            <p className="text-[11px] text-emerald-700 font-medium">{scrapeMsg}</p>
          )}
        </div>
      )}
    </aside>
  );
}
