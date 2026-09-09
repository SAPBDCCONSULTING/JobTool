'use client';

import { useState } from 'react';
import { triggerCountryScrape } from '@/lib/api';
import { REGIONS, isCountryFullyBlocked, getWebsiteBlockReason } from '@/lib/regions';
import { SectionTitleWithInfo, SECTION_INFO } from '@/components/ui/SectionInfoButton';

interface ModalState {
  country: string;
  website: string;
  websiteUrl: string;
}

export default function SourcesPage() {
  const [modal, setModal] = useState<ModalState | null>(null);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleCountryClick = (country: string, websiteName: string, websiteUrl: string) => {
    setModal({ country, website: websiteName, websiteUrl });
    setKeyword('');
  };

  const handleScrape = async () => {
    if (!modal || !keyword.trim()) return;
    setLoading(true);
    try {
      const res = await triggerCountryScrape(modal.country, modal.websiteUrl, keyword.trim());
      setToast(res.message);
      setTimeout(() => setToast(null), 6000);
      setModal(null);
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Scrape failed');
      setTimeout(() => setToast(null), 6000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full">
      <div
        className="px-8 py-6 border-b border-slate-200/60"
        style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)' }}
      >
        <SectionTitleWithInfo
          title="Sources"
          label="Sources"
          content={SECTION_INFO.sources}
        />
        <p className="text-indigo-200 text-sm mt-0.5">
          Country-specific job websites — click a country to scrape jobs
          <span className="ml-2 text-red-200">· Red = blocked / closed</span>
        </p>
      </div>

      <div className="px-8 py-7">
        {toast && (
          <div className="mb-6 flex items-start gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-sm font-medium shadow-sm">
            <svg className="flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {toast}
            <button onClick={() => setToast(null)} className="ml-auto text-emerald-600 hover:text-emerald-800">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {REGIONS.map((region) => (
          <div key={region.name} className="mb-8">
            <h2 className="text-lg font-bold text-slate-800 mb-4">{region.name}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {region.countries.map((country) => {
                const blocked = isCountryFullyBlocked(country);
                const site = country.websites[0];
                const reason = site ? getWebsiteBlockReason(site.name) : null;
                return (
                  <button
                    key={country.name}
                    onClick={() =>
                      handleCountryClick(
                        country.name,
                        country.websites[0].name,
                        country.websites[0].url,
                      )
                    }
                    title={blocked && reason ? `Blocked: ${reason}` : undefined}
                    className={`group rounded-xl p-4 text-left transition-all cursor-pointer border ${
                      blocked
                        ? 'bg-red-50 border-red-200 hover:border-red-300 hover:shadow-md'
                        : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'
                    }`}
                  >
                    <div
                      className={`font-medium text-sm transition-colors ${
                        blocked
                          ? 'text-red-700 group-hover:text-red-800'
                          : 'text-slate-800 group-hover:text-indigo-700'
                      }`}
                    >
                      {country.name}
                    </div>
                    <div className={`text-xs mt-1 truncate ${blocked ? 'text-red-500' : 'text-slate-500'}`}>
                      {country.websites.map((w) => w.name).join(', ')}
                    </div>
                    {blocked && reason && (
                      <div className="text-[10px] text-red-400 mt-1.5 line-clamp-1">{reason}</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Keyword Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
            <h3 className="text-lg font-bold text-slate-800 mb-1">
              Scrape {modal.country}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Source: {modal.website}
            </p>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Search keyword
            </label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
              placeholder="e.g. SAP, Cloud Engineer, Data Analyst"
              autoFocus
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
            />
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleScrape}
                disabled={loading || !keyword.trim()}
                className="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Scraping…
                  </>
                ) : (
                  'Scrape Jobs'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
