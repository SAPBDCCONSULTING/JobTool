import type {
  StatsResponse,
  JobsResponse,
  CompaniesResponse,
  Job,
  Company,
  JobFilters,
} from '../types';

// ─── Demo Jobs ────────────────────────────────────────────────
const ALL_DEMO_JOBS: Job[] = [
  {
    id: '1',
    jobTitle: 'SAP S/4HANA Lead Consultant',
    companyName: 'Accenture',
    country: 'Saudi Arabia',
    location: 'Riyadh, Saudi Arabia',
    domain: 'SAP',
    aiStatus: 'DONE',
    confidence: 0.95,
    aiReason:
      'Direct SAP S/4HANA implementation role at a major consulting firm, indicating a large enterprise client investment in SAP transformation.',
    searchString: 'sap',
    createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
    aiProcessedAt: new Date(Date.now() - 0.5 * 3600000).toISOString(),
  },
  {
    id: '2',
    jobTitle: 'Cloud Infrastructure Architect (AWS)',
    companyName: 'PwC Middle East',
    country: 'Saudi Arabia',
    location: 'Riyadh, Saudi Arabia',
    domain: 'Cloud',
    aiStatus: 'DONE',
    confidence: 0.91,
    aiReason:
      'Senior AWS architect role signals major cloud infrastructure investment at a leading professional services firm.',
    searchString: 'cloud architect',
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    aiProcessedAt: new Date(Date.now() - 1.5 * 3600000).toISOString(),
  },
  {
    id: '3',
    jobTitle: 'SAP FICO Consultant',
    companyName: 'Deloitte',
    country: 'UAE',
    location: 'Dubai, UAE',
    domain: 'SAP',
    aiStatus: 'DONE',
    confidence: 0.89,
    aiReason:
      'SAP Finance and Controlling consultant role directly indicates a client undergoing SAP financial systems implementation.',
    searchString: 'sap',
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    aiProcessedAt: new Date(Date.now() - 2.5 * 3600000).toISOString(),
  },
  {
    id: '4',
    jobTitle: 'Data Engineering Lead',
    companyName: 'Saudi Aramco',
    country: 'Saudi Arabia',
    location: 'Dhahran, Saudi Arabia',
    domain: 'Data & Analytics',
    aiStatus: 'DONE',
    confidence: 0.88,
    aiReason:
      'Leadership role in data engineering at Saudi Aramco signals major data platform investment at the national oil company.',
    searchString: 'data engineer',
    createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    aiProcessedAt: new Date(Date.now() - 3.5 * 3600000).toISOString(),
  },
  {
    id: '5',
    jobTitle: 'Azure Solutions Architect',
    companyName: 'Microsoft',
    country: 'UAE',
    location: 'Dubai, UAE',
    domain: 'Cloud',
    aiStatus: 'DONE',
    confidence: 0.92,
    aiReason:
      'Azure architect role at Microsoft signals direct cloud transformation projects with enterprise clients in the region.',
    searchString: 'cloud architect',
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    aiProcessedAt: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
  {
    id: '6',
    jobTitle: 'SAP Basis Administrator',
    companyName: 'IBM',
    country: 'Saudi Arabia',
    location: 'Riyadh, Saudi Arabia',
    domain: 'SAP',
    aiStatus: 'DONE',
    confidence: 0.78,
    aiReason:
      'SAP Basis admin role indicates an active SAP environment that requires dedicated infrastructure management.',
    searchString: 'sap',
    createdAt: new Date(Date.now() - 6 * 3600000).toISOString(),
    aiProcessedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: '7',
    jobTitle: 'ERP Project Manager',
    companyName: 'Oracle',
    country: 'Saudi Arabia',
    location: 'Riyadh, Saudi Arabia',
    domain: 'ERP',
    aiStatus: 'DONE',
    confidence: 0.82,
    aiReason:
      'ERP project manager role at Oracle signals an active ERP implementation project with a major enterprise client.',
    searchString: 'erp',
    createdAt: new Date(Date.now() - 7 * 3600000).toISOString(),
    aiProcessedAt: new Date(Date.now() - 6 * 3600000).toISOString(),
  },
  {
    id: '8',
    jobTitle: 'Power BI Developer',
    companyName: 'Capgemini',
    country: 'Saudi Arabia',
    location: 'Jeddah, Saudi Arabia',
    domain: 'Data & Analytics',
    aiStatus: 'DONE',
    confidence: 0.74,
    aiReason:
      'Power BI developer role signals investment in business intelligence and data visualization capabilities.',
    searchString: 'data analytics',
    createdAt: new Date(Date.now() - 8 * 3600000).toISOString(),
    aiProcessedAt: new Date(Date.now() - 7 * 3600000).toISOString(),
  },
  {
    id: '9',
    jobTitle: 'SAP ABAP Developer',
    companyName: 'Tata Consultancy Services',
    country: 'Kuwait',
    location: 'Kuwait City, Kuwait',
    domain: 'SAP',
    aiStatus: 'DONE',
    confidence: 0.83,
    aiReason:
      'SAP ABAP development role indicates ongoing customization and development on an existing SAP landscape.',
    searchString: 'sap',
    createdAt: new Date(Date.now() - 9 * 3600000).toISOString(),
    aiProcessedAt: new Date(Date.now() - 8 * 3600000).toISOString(),
  },
  {
    id: '10',
    jobTitle: 'Data Analytics Manager',
    companyName: 'EY',
    country: 'Saudi Arabia',
    location: 'Riyadh, Saudi Arabia',
    domain: 'Data & Analytics',
    aiStatus: 'DONE',
    confidence: 0.86,
    aiReason:
      'Analytics manager role at EY indicates active client engagements around data strategy and analytics platforms.',
    searchString: 'analytics',
    createdAt: new Date(Date.now() - 10 * 3600000).toISOString(),
    aiProcessedAt: new Date(Date.now() - 9 * 3600000).toISOString(),
  },
  {
    id: '11',
    jobTitle: 'SAP S/4HANA Finance Consultant',
    companyName: 'KPMG',
    country: 'Qatar',
    location: 'Doha, Qatar',
    domain: 'SAP',
    aiStatus: 'DONE',
    confidence: 0.9,
    aiReason:
      'SAP S/4HANA Finance specialization signals a sophisticated finance transformation project with a strategic client.',
    searchString: 'sap',
    createdAt: new Date(Date.now() - 11 * 3600000).toISOString(),
    aiProcessedAt: new Date(Date.now() - 10 * 3600000).toISOString(),
  },
  {
    id: '12',
    jobTitle: 'DevOps Engineer (Azure/AWS)',
    companyName: 'Wipro',
    country: 'UAE',
    location: 'Abu Dhabi, UAE',
    domain: 'Cloud',
    aiStatus: 'DONE',
    confidence: 0.77,
    aiReason:
      'Multi-cloud DevOps role indicates active cloud adoption and CI/CD pipeline investment.',
    searchString: 'devops',
    createdAt: new Date(Date.now() - 12 * 3600000).toISOString(),
    aiProcessedAt: new Date(Date.now() - 11 * 3600000).toISOString(),
  },
  {
    id: '13',
    jobTitle: 'Snowflake Data Architect',
    companyName: 'Saudi National Bank',
    country: 'Saudi Arabia',
    location: 'Riyadh, Saudi Arabia',
    domain: 'Data & Analytics',
    aiStatus: 'DONE',
    confidence: 0.93,
    aiReason:
      "Snowflake architecture role at a major bank is a strong signal of large-scale data platform modernization.",
    searchString: 'data',
    createdAt: new Date(Date.now() - 13 * 3600000).toISOString(),
    aiProcessedAt: new Date(Date.now() - 12 * 3600000).toISOString(),
  },
  {
    id: '14',
    jobTitle: 'SAP CX / Hybris Consultant',
    companyName: 'NTT Data',
    country: 'Saudi Arabia',
    location: 'Riyadh, Saudi Arabia',
    domain: 'SAP',
    aiStatus: 'DONE',
    confidence: 0.8,
    aiReason:
      'SAP CX consultant role indicates investment in customer experience platforms built on SAP ecosystem.',
    searchString: 'sap',
    createdAt: new Date(Date.now() - 14 * 3600000).toISOString(),
    aiProcessedAt: new Date(Date.now() - 13 * 3600000).toISOString(),
  },
  {
    id: '15',
    jobTitle: 'GCP Data Engineer',
    companyName: 'Infosys',
    country: 'Bahrain',
    location: 'Manama, Bahrain',
    domain: 'Cloud',
    aiStatus: 'DONE',
    confidence: 0.85,
    aiReason:
      'Google Cloud data engineering role signals active GCP adoption and data pipeline investment.',
    searchString: 'cloud',
    createdAt: new Date(Date.now() - 15 * 3600000).toISOString(),
    aiProcessedAt: new Date(Date.now() - 14 * 3600000).toISOString(),
  },
  {
    id: '16',
    jobTitle: 'SAP MM/WM Consultant',
    companyName: 'Accenture',
    country: 'Saudi Arabia',
    location: 'Jeddah, Saudi Arabia',
    domain: 'SAP',
    aiStatus: 'PENDING',
    confidence: null,
    aiReason: null,
    searchString: 'sap',
    createdAt: new Date(Date.now() - 0.5 * 3600000).toISOString(),
    aiProcessedAt: null,
  },
  {
    id: '17',
    jobTitle: 'Databricks ML Engineer',
    companyName: 'STC',
    country: 'Saudi Arabia',
    location: 'Riyadh, Saudi Arabia',
    domain: 'Data & Analytics',
    aiStatus: 'PENDING',
    confidence: null,
    aiReason: null,
    searchString: 'data',
    createdAt: new Date(Date.now() - 0.3 * 3600000).toISOString(),
    aiProcessedAt: null,
  },
  {
    id: '18',
    jobTitle: 'Oracle ERP Consultant',
    companyName: 'Deloitte',
    country: 'Saudi Arabia',
    location: 'Riyadh, Saudi Arabia',
    domain: 'ERP',
    aiStatus: 'DONE',
    confidence: 0.81,
    aiReason:
      'Oracle ERP consultant position indicates enterprise resource planning implementation or upgrade project.',
    searchString: 'erp',
    createdAt: new Date(Date.now() - 16 * 3600000).toISOString(),
    aiProcessedAt: new Date(Date.now() - 15 * 3600000).toISOString(),
  },
  {
    id: '19',
    jobTitle: 'SAP Integration Specialist (BTP)',
    companyName: 'PwC Middle East',
    country: 'UAE',
    location: 'Dubai, UAE',
    domain: 'SAP',
    aiStatus: 'DONE',
    confidence: 0.87,
    aiReason:
      'SAP BTP integration specialist role signals active SAP cloud platform adoption and system integration work.',
    searchString: 'sap',
    createdAt: new Date(Date.now() - 17 * 3600000).toISOString(),
    aiProcessedAt: new Date(Date.now() - 16 * 3600000).toISOString(),
  },
  {
    id: '20',
    jobTitle: 'Tableau BI Developer',
    companyName: 'Aramex',
    country: 'UAE',
    location: 'Dubai, UAE',
    domain: 'Data & Analytics',
    aiStatus: 'DONE',
    confidence: 0.72,
    aiReason:
      'Tableau developer role signals investment in self-service BI and data visualization capabilities.',
    searchString: 'analytics',
    createdAt: new Date(Date.now() - 18 * 3600000).toISOString(),
    aiProcessedAt: new Date(Date.now() - 17 * 3600000).toISOString(),
  },
];

// ─── Demo Companies ───────────────────────────────────────────
const ALL_DEMO_COMPANIES: Company[] = [
  { companyName: 'Accenture', country: 'Saudi Arabia', jobCount: 45, avgConfidence: 0.91, topDomain: 'SAP' },
  { companyName: 'Deloitte', country: 'UAE', jobCount: 38, avgConfidence: 0.87, topDomain: 'SAP' },
  { companyName: 'PwC Middle East', country: 'Saudi Arabia', jobCount: 32, avgConfidence: 0.89, topDomain: 'Cloud' },
  { companyName: 'Saudi National Bank', country: 'Saudi Arabia', jobCount: 28, avgConfidence: 0.88, topDomain: 'Data & Analytics' },
  { companyName: 'KPMG', country: 'Qatar', jobCount: 24, avgConfidence: 0.85, topDomain: 'SAP' },
  { companyName: 'IBM', country: 'Saudi Arabia', jobCount: 22, avgConfidence: 0.81, topDomain: 'Cloud' },
  { companyName: 'EY', country: 'Saudi Arabia', jobCount: 19, avgConfidence: 0.83, topDomain: 'Data & Analytics' },
  { companyName: 'Saudi Aramco', country: 'Saudi Arabia', jobCount: 17, avgConfidence: 0.86, topDomain: 'Data & Analytics' },
  { companyName: 'Oracle', country: 'Saudi Arabia', jobCount: 15, avgConfidence: 0.79, topDomain: 'ERP' },
  { companyName: 'Microsoft', country: 'UAE', jobCount: 14, avgConfidence: 0.9, topDomain: 'Cloud' },
  { companyName: 'Capgemini', country: 'Saudi Arabia', jobCount: 12, avgConfidence: 0.77, topDomain: 'Data & Analytics' },
  { companyName: 'Tata Consultancy Services', country: 'Kuwait', jobCount: 11, avgConfidence: 0.8, topDomain: 'SAP' },
  { companyName: 'STC', country: 'Saudi Arabia', jobCount: 9, avgConfidence: 0.76, topDomain: 'Cloud' },
  { companyName: 'Wipro', country: 'UAE', jobCount: 8, avgConfidence: 0.75, topDomain: 'Cloud' },
  { companyName: 'NTT Data', country: 'Saudi Arabia', jobCount: 7, avgConfidence: 0.78, topDomain: 'SAP' },
];

// ─── Demo Stats ───────────────────────────────────────────────
export const demoStats: StatsResponse = {
  totalRaw: 342,
  totalClean: 187,
  totalProcessed: 156,
  highConfidence: 98,
  pendingCount: 31,
  countries: [
    { name: 'Saudi Arabia', count: 112 },
    { name: 'UAE', count: 48 },
    { name: 'Qatar', count: 18 },
    { name: 'Kuwait', count: 9 },
    { name: 'Bahrain', count: 6 },
  ],
  domains: [
    { name: 'SAP', count: 72 },
    { name: 'Cloud', count: 45 },
    { name: 'Data & Analytics', count: 38 },
    { name: 'ERP', count: 32 },
  ],
  recentJobs: ALL_DEMO_JOBS.slice(0, 8).map((j) => ({
    id: j.id,
    jobTitle: j.jobTitle,
    companyName: j.companyName,
    country: j.country,
    confidence: j.confidence,
    aiStatus: j.aiStatus,
    domain: j.domain ?? null,
    createdAt: j.createdAt,
  })),
};

// ─── Demo data helpers ────────────────────────────────────────
export function getDemoJobs(filters: JobFilters): JobsResponse {
  let jobs = [...ALL_DEMO_JOBS];

  if (filters.country) {
    jobs = jobs.filter((j) =>
      j.country.toLowerCase().includes(filters.country!.toLowerCase()),
    );
  }
  if (filters.domain) {
    jobs = jobs.filter((j) =>
      j.domain?.toLowerCase().includes(filters.domain!.toLowerCase()),
    );
  }
  if (filters.companyName) {
    jobs = jobs.filter((j) =>
      j.companyName.toLowerCase().includes(filters.companyName!.toLowerCase()),
    );
  }
  if (filters.aiStatus) {
    jobs = jobs.filter((j) => j.aiStatus === filters.aiStatus);
  }
  if (filters.minConfidence !== undefined) {
    jobs = jobs.filter((j) => (j.confidence ?? 0) >= filters.minConfidence!);
  }

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const total = jobs.length;
  const totalPages = Math.ceil(total / limit);
  const paginatedJobs = jobs.slice((page - 1) * limit, page * limit);

  return { jobs: paginatedJobs, total, page, limit, totalPages };
}

export function getDemoCompanies(): { companies: Company[] } {
  return { companies: ALL_DEMO_COMPANIES };
}
