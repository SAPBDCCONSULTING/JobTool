export type AiStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';

export interface Job {
  id: string;
  jobTitle: string;
  companyName: string;
  country: string;
  location?: string | null;
  domain?: string | null;
  aiStatus: AiStatus;
  confidence: number | null;
  aiReason: string | null;
  searchString: string;
  createdAt: string;
  aiProcessedAt: string | null;
}

export interface JobsResponse {
  jobs: Job[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Company {
  companyName: string;
  country: string;
  jobCount: number;
  avgConfidence: number | null;
  topDomain: string | null;
}

export interface CompaniesResponse {
  companies: Company[];
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
  confidence: number | null;
  aiStatus: AiStatus;
  domain: string | null;
  createdAt: string;
}

export interface StatsResponse {
  totalRaw: number;
  totalClean: number;
  totalProcessed: number;
  highConfidence: number;
  pendingCount: number;
  countries: CountryStat[];
  domains: DomainStat[];
  recentJobs: RecentJob[];
}

export interface JobFilters {
  country?: string;
  minConfidence?: number;
  domain?: string;
  companyName?: string;
  aiStatus?: AiStatus;
  page?: number;
  limit?: number;
}

export interface SearchResult {
  status: 'queued';
  message: string;
  keyword: string;
  location: string;
}
