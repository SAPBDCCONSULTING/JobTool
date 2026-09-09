export type AiStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';

export interface Job {
  id: string;
  jobTitle: string;
  companyName: string;
  country: string;
  location?: string | null;
  jobUrl?: string | null;
  companyUrl?: string | null;
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
  /** AI company opportunity score (0–1) */
  opportunityScore?: number | null;
  whyNow?: string | null;
  whatToSell?: string | null;
  signals?: string[];
  intelStatus?: AiStatus | string | null;
}

export type OpportunityStage =
  | 'NEW'
  | 'QUALIFIED'
  | 'NURTURE'
  | 'DISQUALIFIED'
  | 'REVIEWED'
  | 'CONTACTED'
  | 'REPLIED'
  | 'MEETING'
  | 'WON'
  | 'LOST';

export type FeedbackOutcome =
  | 'REVIEWED'
  | 'CONTACTED'
  | 'REPLIED'
  | 'MEETING'
  | 'WON'
  | 'LOST';

export interface FeedbackEvent {
  id: string;
  opportunityId: string;
  outcome: FeedbackOutcome;
  notes: string | null;
  recordedBy: string | null;
  createdAt: string;
  opportunity?: {
    id: string;
    companyName: string;
    country: string;
    score: number;
    rank: number;
    stage: OpportunityStage;
    recommendedOffering: string;
    topDomain: string | null;
  };
}

export interface FeedbackResponse {
  events: FeedbackEvent[];
  summary: Record<string, number>;
  pipeline: Record<string, number>;
}

export interface Opportunity {
  id: string;
  companyName: string;
  country: string;
  stage: OpportunityStage;
  rank: number;
  score: number;
  recommendedOffering: string;
  offeringCode: string | null;
  whyNow: string | null;
  qualificationReason: string | null;
  topDomain: string | null;
  jobCount: number;
  notes: string | null;
  signals: string[];
  whatToSell: string | null;
  avgJobConfidence: number | null;
  latestFeedback?: {
    id: string;
    outcome: FeedbackOutcome;
    notes: string | null;
    recordedBy: string | null;
    createdAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  stageUpdatedAt: string | null;
}

export interface OpportunitiesResponse {
  opportunities: Opportunity[];
  summary: Record<string, number>;
}

export interface Pitch {
  id: string;
  opportunityId: string;
  companyName: string;
  country: string;
  angles: string[];
  emailSubject: string | null;
  emailBody: string | null;
  personalizationNotes: string | null;
  callToAction: string | null;
  /** Emails scraped from related job descriptions */
  contactEmails?: string[];
  aiStatus: AiStatus;
  aiProcessedAt: string | null;
  createdAt: string;
  updatedAt: string;
  opportunity: {
    id: string;
    stage: OpportunityStage;
    score: number;
    rank: number;
    recommendedOffering: string;
    offeringCode: string | null;
    whyNow: string | null;
    topDomain: string | null;
    jobCount: number;
  };
}

export interface PitchesResponse {
  pitches: Pitch[];
  summary: Record<string, number>;
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
  companyIntelDone: number;
  qualifiedOpportunities: number;
  pitchesReady: number;
  countries: CountryStat[];
  domains: DomainStat[];
  recentJobs: RecentJob[];
  feedback?: {
    events: Record<string, number>;
    pipeline: Record<string, number>;
  };
}

export interface JobFilters {
  region?: string;
  country?: string;
  jobWebsite?: string;
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
