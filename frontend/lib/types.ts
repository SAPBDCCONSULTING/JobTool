export type AiStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
export type RunStatus = 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED';
export type LifecycleStatus = 'ACTIVE' | 'INACTIVE';
export type SourceType = 'APIFY' | 'SCRAPER';

export interface Job {
  id: string;
  jobTitle: string;
  companyName: string;
  country: string;
  location?: string | null;
  jobUrl?: string | null;
  companyUrl?: string | null;
  domain?: string | null;
  source?: string | null;
  lifecycleStatus?: LifecycleStatus | null;
  aiStatus: AiStatus;
  relevanceScore: number | null;
  aiReason: string | null;
  searchString: string;
  createdAt: string;
  aiProcessedAt: string | null;
}

export interface JobOccurrence {
  id: string;
  source: string;
  url: string | null;
  location: string | null;
  publishedAt: string | null;
  seenAt: string;
  keyword: string;
}

export interface JobDetail extends Job {
  jobDescription: string;
  company: { id: string; name: string } | null;
  companyUrl: string | null;
  technologies: string[];
  roleCategory: string | null;
  seniority: string | null;
  projectType: string | null;
  outsourcingPotential: number | null;
  summary: string | null;
  occurrences: JobOccurrence[];
}

export interface JobsResponse {
  jobs: Job[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Company {
  id: string;
  companyName: string;
  country: string | null;
  jobCount: number;
  activeJobs: number | null;
  jobs7d: number | null;
  jobs30d: number | null;
  avgRelevance: number | null;
  topDomain: string | null;
  score: number | null;
  likelyInitiative: string | null;
  recommendedServices: string[];
  topTechnologies: string[];
  scoreExplanation: string | null;
  recalculatedAt: string | null;
}

export interface CompaniesResponse {
  companies: Company[];
}

export interface CompanyIntelligence {
  id: string;
  companyId: string;
  activeJobs: number;
  jobs7d: number;
  jobs30d: number;
  topTechnologies: string[];
  notableRoles: string[];
  avgRelevance: number | null;
  avgOutsourcing: number | null;
  likelyInitiative: string | null;
  recommendedServices: string[];
  evidence: string[];
  summary: string | null;
  score: number | null;
  scoreBreakdown: {
    relevance?: { value: number; weight: number };
    volume?: { value: number; weight: number };
    velocity?: { value: number; weight: number };
    outsourcing?: { value: number; weight: number };
  } | null;
  scoreExplanation: string | null;
  formulaVersion: string | null;
  model: string | null;
  recalculatedAt: string;
}

export interface CompanyJob {
  id: string;
  jobTitle: string;
  country: string;
  domain: string | null;
  url: string | null;
  relevanceScore: number | null;
  technologies: string[];
  roleCategory: string | null;
  seniority: string | null;
  projectType: string | null;
  outsourcingPotential: number | null;
  summary: string | null;
  createdAt: string;
  occurrences: number;
}

export interface CompanyDetail {
  company: {
    id: string;
    name: string;
    country: string | null;
    aliases: string[];
    needsRecalc: boolean;
  };
  intelligence: CompanyIntelligence | null;
  jobs: CompanyJob[];
}

export interface OutreachEmail {
  id: string;
  companyId: string;
  subject: string;
  body: string;
  status: 'draft' | 'sent' | 'done';
  model: string | null;
  promptVersion: string | null;
  createdAt: string;
  updatedAt: string;
  company: { id: string; name: string; country: string | null };
}

export interface OutreachResponse {
  emails: OutreachEmail[];
}

export interface CountryStat {
  name: string;
  count: number;
}

export interface DomainStat {
  name: string;
  count: number;
}

export interface RecentJob {
  id: string;
  jobTitle: string;
  companyName: string;
  country: string;
  relevanceScore: number | null;
  aiStatus: AiStatus;
  domain: string | null;
  createdAt: string;
}

export interface StatsResponse {
  totalRaw: number;
  totalClean: number;
  totalProcessed: number;
  relevantJobs: number;
  pendingCount: number;
  countries: CountryStat[];
  domains: DomainStat[];
  recentJobs: RecentJob[];
}

export interface JobFilters {
  region?: string;
  country?: string;
  jobWebsite?: string;
  minRelevance?: number;
  domain?: string;
  companyName?: string;
  aiStatus?: AiStatus;
  source?: string;
  lifecycleStatus?: LifecycleStatus;
  keyword?: string;
  page?: number;
  limit?: number;
}

export interface SearchResult {
  status: 'queued';
  message: string;
  keyword: string;
  location: string;
  runId?: string | null;
}

// ─── Keywords ───────────────────────────────────────────────────
export interface KeywordRunSummary {
  id: string;
  status: RunStatus;
  itemsFetched: number;
  itemsNew: number;
  itemsDup: number;
  itemsFiltered: number;
  itemsFailed: number;
  error: string | null;
  finishedAt: string | null;
}

export interface Keyword {
  id: string;
  term: string;
  category: string;
  location: string | null;
  enabled: boolean;
  scheduleHours: number;
  createdAt: string;
  updatedAt: string;
  runs: KeywordRunSummary[];
}

export interface KeywordsResponse {
  keywords: Keyword[];
}

// ─── Sources ────────────────────────────────────────────────────
export interface SourceRunSummary {
  id: string;
  status: RunStatus;
  runType: string;
  itemsFetched: number;
  itemsNew: number;
  itemsDup: number;
  itemsFiltered: number;
  itemsFailed: number;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface Source {
  id: string;
  name: string;
  type: SourceType;
  country: string | null;
  website: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  runs: SourceRunSummary[];
}

export interface SourcesResponse {
  sources: Source[];
}

// ─── Runs ───────────────────────────────────────────────────────
export interface Run {
  id: string;
  sourceId: string;
  keywordId: string | null;
  runType: string;
  status: RunStatus;
  itemsFetched: number;
  itemsNew: number;
  itemsDup: number;
  itemsFiltered: number;
  itemsFailed: number;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  source: { name: string; type: SourceType; country: string | null; website: string | null };
  keyword: { id: string; term: string } | null;
}

export interface RunsResponse {
  runs: Run[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
