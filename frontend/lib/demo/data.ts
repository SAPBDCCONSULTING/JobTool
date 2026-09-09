import type {
  StatsResponse,
  JobsResponse,
  CompaniesResponse,
  OpportunitiesResponse,
  PitchesResponse,
  FeedbackResponse,
  Job,
  Company,
  Opportunity,
  Pitch,
  FeedbackEvent,
  FeedbackOutcome,
  OpportunityStage,
  JobFilters,
} from '../types';
import { EUROPE_COUNTRIES } from '../regions';

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
  {
    id: '19',
    jobTitle: 'SAP S/4HANA Consultant',
    companyName: 'Capgemini',
    country: 'Germany',
    location: 'Munich, Germany',
    domain: 'SAP',
    aiStatus: 'DONE',
    confidence: 0.93,
    aiReason: 'SAP S/4HANA role on StepStone indicates active enterprise transformation in Germany.',
    searchString: 'sap',
    createdAt: new Date(Date.now() - 19 * 3600000).toISOString(),
    aiProcessedAt: new Date(Date.now() - 18 * 3600000).toISOString(),
  },
  {
    id: '20',
    jobTitle: 'Cloud Platform Engineer',
    companyName: 'OVHcloud',
    country: 'France',
    location: 'Paris, France',
    domain: 'Cloud',
    aiStatus: 'DONE',
    confidence: 0.86,
    aiReason: 'Cloud platform engineering role signals infrastructure investment in the French market.',
    searchString: 'cloud',
    createdAt: new Date(Date.now() - 20 * 3600000).toISOString(),
    aiProcessedAt: new Date(Date.now() - 19 * 3600000).toISOString(),
  },
  {
    id: '21',
    jobTitle: 'ERP Implementation Manager',
    companyName: 'Accenture',
    country: 'United Kingdom',
    location: 'London, United Kingdom',
    domain: 'ERP',
    aiStatus: 'DONE',
    confidence: 0.9,
    aiReason: 'ERP implementation leadership role sourced via Reed indicates UK enterprise demand.',
    searchString: 'erp',
    createdAt: new Date(Date.now() - 21 * 3600000).toISOString(),
    aiProcessedAt: new Date(Date.now() - 20 * 3600000).toISOString(),
  },
  {
    id: '22',
    jobTitle: 'Data Analytics Lead',
    companyName: 'ING',
    country: 'The Netherlands',
    location: 'Amsterdam, Netherlands',
    domain: 'Data & Analytics',
    aiStatus: 'DONE',
    confidence: 0.84,
    aiReason: 'Analytics leadership at a major bank signals continued data platform investment.',
    searchString: 'analytics',
    createdAt: new Date(Date.now() - 22 * 3600000).toISOString(),
    aiProcessedAt: new Date(Date.now() - 21 * 3600000).toISOString(),
  },
  {
    id: '23',
    jobTitle: 'SAP SuccessFactors Consultant',
    companyName: 'Deloitte',
    country: 'Ireland',
    location: 'Dublin, Ireland',
    domain: 'SAP',
    aiStatus: 'DONE',
    confidence: 0.88,
    aiReason: 'SuccessFactors role on jobs.ie indicates HR transformation hiring in Ireland.',
    searchString: 'sap',
    createdAt: new Date(Date.now() - 23 * 3600000).toISOString(),
    aiProcessedAt: new Date(Date.now() - 22 * 3600000).toISOString(),
  },
  {
    id: '24',
    jobTitle: 'Azure Cloud Architect',
    companyName: 'Microsoft',
    country: 'Poland',
    location: 'Warsaw, Poland',
    domain: 'Cloud',
    aiStatus: 'DONE',
    confidence: 0.91,
    aiReason: 'Azure architect role in Poland signals regional cloud delivery capacity growth.',
    searchString: 'cloud architect',
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    aiProcessedAt: new Date(Date.now() - 23 * 3600000).toISOString(),
  },
  {
    id: '25',
    jobTitle: 'SAP ABAP Developer',
    companyName: 'IBM',
    country: 'Spain',
    location: 'Madrid, Spain',
    domain: 'SAP',
    aiStatus: 'PENDING',
    confidence: null,
    aiReason: null,
    searchString: 'sap',
    createdAt: new Date(Date.now() - 25 * 3600000).toISOString(),
    aiProcessedAt: null,
  },
  {
    id: '26',
    jobTitle: 'Power BI Specialist',
    companyName: 'KPMG',
    country: 'Sweden',
    location: 'Stockholm, Sweden',
    domain: 'Data & Analytics',
    aiStatus: 'DONE',
    confidence: 0.79,
    aiReason: 'Power BI specialist role indicates BI modernization demand in the Nordic market.',
    searchString: 'analytics',
    createdAt: new Date(Date.now() - 26 * 3600000).toISOString(),
    aiProcessedAt: new Date(Date.now() - 25 * 3600000).toISOString(),
  },
];

// ─── Demo Companies ───────────────────────────────────────────
const ALL_DEMO_COMPANIES: Company[] = [
  {
    companyName: 'Accenture',
    country: 'Saudi Arabia',
    jobCount: 45,
    avgConfidence: 0.91,
    topDomain: 'SAP',
    opportunityScore: 0.94,
    whyNow: 'Large cluster of S/4HANA and FICO roles indicates active client transformation programs.',
    whatToSell: 'S/4HANA implementation accelerators and finance transformation co-delivery.',
    signals: ['Multiple S/4HANA leads', 'FICO demand', 'High avg confidence'],
    intelStatus: 'DONE',
  },
  {
    companyName: 'Deloitte',
    country: 'UAE',
    jobCount: 38,
    avgConfidence: 0.87,
    topDomain: 'SAP',
    opportunityScore: 0.9,
    whyNow: 'Sustained SAP consulting hiring in Dubai points to multi-client delivery ramp-up.',
    whatToSell: 'SAP BTP integration and S/4HANA migration partnering.',
    signals: ['SAP consultant surge', 'Regional delivery hub'],
    intelStatus: 'DONE',
  },
  {
    companyName: 'PwC Middle East',
    country: 'Saudi Arabia',
    jobCount: 32,
    avgConfidence: 0.89,
    topDomain: 'Cloud',
    opportunityScore: 0.88,
    whyNow: 'Cloud architect hiring suggests landing-zone and migration programs for enterprise clients.',
    whatToSell: 'AWS/Azure cloud migration factory and FinOps advisory.',
    signals: ['Cloud architects', 'Infrastructure modernisation'],
    intelStatus: 'DONE',
  },
  {
    companyName: 'Saudi National Bank',
    country: 'Saudi Arabia',
    jobCount: 28,
    avgConfidence: 0.88,
    topDomain: 'Data & Analytics',
    opportunityScore: 0.86,
    whyNow: 'Data platform and analytics leadership roles signal a bank-wide data investment cycle.',
    whatToSell: 'Enterprise data platform build + analytics operating model.',
    signals: ['Data engineering lead', 'Analytics hiring'],
    intelStatus: 'DONE',
  },
  {
    companyName: 'KPMG',
    country: 'Qatar',
    jobCount: 24,
    avgConfidence: 0.85,
    topDomain: 'SAP',
    opportunityScore: 0.82,
    whyNow: 'SAP project staffing in Qatar aligns with public-sector ERP programs.',
    whatToSell: 'SAP programme PMO and S/4HANA delivery pods.',
    signals: ['ERP PM roles', 'Consulting ramp'],
    intelStatus: 'DONE',
  },
  {
    companyName: 'IBM',
    country: 'Saudi Arabia',
    jobCount: 22,
    avgConfidence: 0.81,
    topDomain: 'Cloud',
    opportunityScore: 0.8,
    whyNow: 'Cloud and hybrid roles indicate hybrid-cloud delivery for large accounts.',
    whatToSell: 'Hybrid cloud architecture and managed services transition.',
    signals: ['Cloud infrastructure', 'Enterprise accounts'],
    intelStatus: 'DONE',
  },
  {
    companyName: 'EY',
    country: 'Saudi Arabia',
    jobCount: 19,
    avgConfidence: 0.83,
    topDomain: 'Data & Analytics',
    opportunityScore: 0.79,
    whyNow: 'Analytics hiring volume suggests advisory-led data transformation deals.',
    whatToSell: 'Data governance + analytics COE setup.',
    signals: ['Analytics consultants'],
    intelStatus: 'DONE',
  },
  {
    companyName: 'Saudi Aramco',
    country: 'Saudi Arabia',
    jobCount: 17,
    avgConfidence: 0.86,
    topDomain: 'Data & Analytics',
    opportunityScore: 0.91,
    whyNow: 'Direct end-customer data platform hiring is a strong buy-side signal.',
    whatToSell: 'Industrial data platform and OT/IT analytics integration.',
    signals: ['End-customer hiring', 'Data engineering lead'],
    intelStatus: 'DONE',
  },
  {
    companyName: 'Oracle',
    country: 'Saudi Arabia',
    jobCount: 15,
    avgConfidence: 0.79,
    topDomain: 'ERP',
    opportunityScore: 0.74,
    whyNow: 'ERP specialists point to Fusion/ERP cloud expansion with local clients.',
    whatToSell: 'Oracle Cloud ERP implementation and integration.',
    signals: ['ERP specialists'],
    intelStatus: 'DONE',
  },
  {
    companyName: 'Microsoft',
    country: 'UAE',
    jobCount: 14,
    avgConfidence: 0.9,
    topDomain: 'Cloud',
    opportunityScore: 0.87,
    whyNow: 'Azure architect demand reflects partner-led enterprise cloud deals in the region.',
    whatToSell: 'Azure landing zones and migration factory co-sell.',
    signals: ['Azure architects', 'Partner ecosystem'],
    intelStatus: 'DONE',
  },
  {
    companyName: 'Capgemini',
    country: 'Germany',
    jobCount: 12,
    avgConfidence: 0.93,
    topDomain: 'SAP',
    opportunityScore: 0.95,
    whyNow: 'Very high-confidence SAP implementation roles in DACH delivery.',
    whatToSell: 'S/4HANA greenfield / brownfield delivery teams.',
    signals: ['S/4HANA leads', 'High confidence cluster'],
    intelStatus: 'DONE',
  },
  {
    companyName: 'OVHcloud',
    country: 'France',
    jobCount: 9,
    avgConfidence: 0.86,
    topDomain: 'Cloud',
    opportunityScore: 0.78,
    whyNow: 'Cloud product and ops hiring suggests capacity expansion for EU sovereign cloud.',
    whatToSell: 'Cloud migration and managed Kubernetes offerings.',
    signals: ['Cloud ops growth'],
    intelStatus: 'DONE',
  },
  {
    companyName: 'Accenture',
    country: 'United Kingdom',
    jobCount: 11,
    avgConfidence: 0.9,
    topDomain: 'ERP',
    opportunityScore: 0.89,
    whyNow: 'ERP programme roles in UK indicate active transformation pipelines.',
    whatToSell: 'ERP programme assurance and S/4HANA change management.',
    signals: ['ERP PMs'],
    intelStatus: 'DONE',
  },
  {
    companyName: 'ING',
    country: 'The Netherlands',
    jobCount: 8,
    avgConfidence: 0.84,
    topDomain: 'Data & Analytics',
    opportunityScore: 0.81,
    whyNow: 'Banking data roles suggest platform modernisation and AI readiness.',
    whatToSell: 'Data mesh / lakehouse and ML ops enablement.',
    signals: ['Data platform hiring'],
    intelStatus: 'DONE',
  },
  {
    companyName: 'Deloitte',
    country: 'Ireland',
    jobCount: 7,
    avgConfidence: 0.88,
    topDomain: 'SAP',
    opportunityScore: 0.84,
    whyNow: 'SAP consulting growth in Ireland delivery centres.',
    whatToSell: 'SAP AMS transition and enhancement packs.',
    signals: ['SAP consultants'],
    intelStatus: 'DONE',
  },
  {
    companyName: 'Microsoft',
    country: 'Poland',
    jobCount: 10,
    avgConfidence: 0.91,
    topDomain: 'Cloud',
    opportunityScore: 0.88,
    whyNow: 'Strong Azure hiring in Poland engineering hubs.',
    whatToSell: 'Azure application modernisation and security baseline.',
    signals: ['Cloud engineers', 'High confidence'],
    intelStatus: 'DONE',
  },
];

// ─── Demo Opportunities (from company intelligence) ───────────
function demoOpp(
  partial: Omit<Opportunity, 'createdAt' | 'updatedAt' | 'stageUpdatedAt' | 'notes' | 'avgJobConfidence'> & {
    avgJobConfidence?: number | null;
  },
): Opportunity {
  const now = new Date().toISOString();
  return {
    notes: null,
    avgJobConfidence: partial.avgJobConfidence ?? partial.score,
    createdAt: now,
    updatedAt: now,
    stageUpdatedAt: now,
    ...partial,
  };
}

const ALL_DEMO_OPPORTUNITIES: Opportunity[] = [
  demoOpp({
    id: 'opp-1',
    companyName: 'Capgemini',
    country: 'Germany',
    stage: 'QUALIFIED',
    rank: 1,
    score: 0.95,
    recommendedOffering: 'SAP S/4HANA implementation & migration',
    offeringCode: 'S4HANA_IMPLEMENTATION',
    whyNow: 'Very high-confidence SAP implementation roles in DACH delivery.',
    qualificationReason: 'Score 0.95 ≥ 0.7 with 12 classified job(s) — strong buying signal.',
    topDomain: 'SAP',
    jobCount: 12,
    signals: ['S/4HANA leads', 'High confidence cluster'],
    whatToSell: 'S/4HANA greenfield / brownfield delivery teams.',
  }),
  demoOpp({
    id: 'opp-2',
    companyName: 'Accenture',
    country: 'Saudi Arabia',
    stage: 'QUALIFIED',
    rank: 2,
    score: 0.94,
    recommendedOffering: 'SAP S/4HANA implementation & migration',
    offeringCode: 'S4HANA_IMPLEMENTATION',
    whyNow: 'Large cluster of S/4HANA and FICO roles indicates active client transformation programs.',
    qualificationReason: 'Score 0.94 ≥ 0.7 with 45 classified job(s) — strong buying signal.',
    topDomain: 'SAP',
    jobCount: 45,
    signals: ['Multiple S/4HANA leads', 'FICO demand', 'High avg confidence'],
    whatToSell: 'S/4HANA implementation accelerators and finance transformation co-delivery.',
  }),
  demoOpp({
    id: 'opp-3',
    companyName: 'Saudi Aramco',
    country: 'Saudi Arabia',
    stage: 'QUALIFIED',
    rank: 3,
    score: 0.91,
    recommendedOffering: 'Enterprise data platform & analytics',
    offeringCode: 'DATA_PLATFORM',
    whyNow: 'Direct end-customer data platform hiring is a strong buy-side signal.',
    qualificationReason: 'Score 0.91 ≥ 0.7 with 17 classified job(s) — strong buying signal.',
    topDomain: 'Data & Analytics',
    jobCount: 17,
    signals: ['End-customer hiring', 'Data engineering lead'],
    whatToSell: 'Industrial data platform and OT/IT analytics integration.',
  }),
  demoOpp({
    id: 'opp-4',
    companyName: 'Deloitte',
    country: 'UAE',
    stage: 'QUALIFIED',
    rank: 4,
    score: 0.9,
    recommendedOffering: 'SAP BTP / Integration Suite delivery',
    offeringCode: 'SAP_BTP',
    whyNow: 'Sustained SAP consulting hiring in Dubai points to multi-client delivery ramp-up.',
    qualificationReason: 'Score 0.90 ≥ 0.7 with 38 classified job(s) — strong buying signal.',
    topDomain: 'SAP',
    jobCount: 38,
    signals: ['SAP consultant surge', 'Regional delivery hub'],
    whatToSell: 'SAP BTP integration and S/4HANA migration partnering.',
  }),
  demoOpp({
    id: 'opp-5',
    companyName: 'Accenture',
    country: 'United Kingdom',
    stage: 'QUALIFIED',
    rank: 5,
    score: 0.89,
    recommendedOffering: 'ERP transformation programme',
    offeringCode: 'ERP_TRANSFORMATION',
    whyNow: 'ERP programme roles in UK indicate active transformation pipelines.',
    qualificationReason: 'Score 0.89 ≥ 0.7 with 11 classified job(s) — strong buying signal.',
    topDomain: 'ERP',
    jobCount: 11,
    signals: ['ERP PMs'],
    whatToSell: 'ERP programme assurance and S/4HANA change management.',
  }),
  demoOpp({
    id: 'opp-6',
    companyName: 'PwC Middle East',
    country: 'Saudi Arabia',
    stage: 'QUALIFIED',
    rank: 6,
    score: 0.88,
    recommendedOffering: 'Cloud landing zone & migration factory',
    offeringCode: 'CLOUD_MIGRATION',
    whyNow: 'Cloud architect hiring suggests landing-zone and migration programs for enterprise clients.',
    qualificationReason: 'Score 0.88 ≥ 0.7 with 32 classified job(s) — strong buying signal.',
    topDomain: 'Cloud',
    jobCount: 32,
    signals: ['Cloud architects', 'Infrastructure modernisation'],
    whatToSell: 'AWS/Azure cloud migration factory and FinOps advisory.',
  }),
  demoOpp({
    id: 'opp-7',
    companyName: 'Microsoft',
    country: 'Poland',
    stage: 'QUALIFIED',
    rank: 7,
    score: 0.88,
    recommendedOffering: 'Cloud landing zone & migration factory',
    offeringCode: 'CLOUD_MIGRATION',
    whyNow: 'Strong Azure hiring in Poland engineering hubs.',
    qualificationReason: 'Score 0.88 ≥ 0.7 with 10 classified job(s) — strong buying signal.',
    topDomain: 'Cloud',
    jobCount: 10,
    signals: ['Cloud engineers', 'High confidence'],
    whatToSell: 'Azure application modernisation and security baseline.',
  }),
  demoOpp({
    id: 'opp-8',
    companyName: 'KPMG',
    country: 'Qatar',
    stage: 'QUALIFIED',
    rank: 8,
    score: 0.82,
    recommendedOffering: 'SAP consulting & programme delivery',
    offeringCode: 'SAP_CONSULTING',
    whyNow: 'SAP project staffing in Qatar aligns with public-sector ERP programs.',
    qualificationReason: 'Score 0.82 ≥ 0.7 with 24 classified job(s) — strong buying signal.',
    topDomain: 'SAP',
    jobCount: 24,
    signals: ['ERP PM roles', 'Consulting ramp'],
    whatToSell: 'SAP programme PMO and S/4HANA delivery pods.',
  }),
  demoOpp({
    id: 'opp-9',
    companyName: 'ING',
    country: 'The Netherlands',
    stage: 'QUALIFIED',
    rank: 9,
    score: 0.81,
    recommendedOffering: 'Enterprise data platform & analytics',
    offeringCode: 'DATA_PLATFORM',
    whyNow: 'Banking data roles suggest platform modernisation and AI readiness.',
    qualificationReason: 'Score 0.81 ≥ 0.7 with 8 classified job(s) — strong buying signal.',
    topDomain: 'Data & Analytics',
    jobCount: 8,
    signals: ['Data platform hiring'],
    whatToSell: 'Data mesh / lakehouse and ML ops enablement.',
  }),
  demoOpp({
    id: 'opp-10',
    companyName: 'EY',
    country: 'Saudi Arabia',
    stage: 'QUALIFIED',
    rank: 10,
    score: 0.79,
    recommendedOffering: 'Enterprise data platform & analytics',
    offeringCode: 'DATA_PLATFORM',
    whyNow: 'Analytics hiring volume suggests advisory-led data transformation deals.',
    qualificationReason: 'Score 0.79 ≥ 0.7 with 19 classified job(s) — strong buying signal.',
    topDomain: 'Data & Analytics',
    jobCount: 19,
    signals: ['Analytics consultants'],
    whatToSell: 'Data governance + analytics COE setup.',
  }),
  demoOpp({
    id: 'opp-11',
    companyName: 'OVHcloud',
    country: 'France',
    stage: 'NURTURE',
    rank: 11,
    score: 0.62,
    recommendedOffering: 'Cloud landing zone & migration factory',
    offeringCode: 'CLOUD_MIGRATION',
    whyNow: 'Cloud product and ops hiring suggests capacity expansion for EU sovereign cloud.',
    qualificationReason: 'Score 0.62 in nurture band (0.5–0.69) — monitor and warm.',
    topDomain: 'Cloud',
    jobCount: 9,
    signals: ['Cloud ops growth'],
    whatToSell: 'Cloud migration and managed Kubernetes offerings.',
  }),
  demoOpp({
    id: 'opp-12',
    companyName: 'Oracle',
    country: 'Saudi Arabia',
    stage: 'NURTURE',
    rank: 12,
    score: 0.58,
    recommendedOffering: 'Oracle Cloud ERP implementation',
    offeringCode: 'ORACLE_ERP',
    whyNow: 'ERP specialists point to Fusion/ERP cloud expansion with local clients.',
    qualificationReason: 'Score 0.58 in nurture band (0.5–0.69) — monitor and warm.',
    topDomain: 'ERP',
    jobCount: 15,
    signals: ['ERP specialists'],
    whatToSell: 'Oracle Cloud ERP implementation and integration.',
  }),
];

// ─── Demo Pitches ─────────────────────────────────────────────
function pitchFromOpp(
  opp: Opportunity,
  angles: string[],
  subject: string,
  body: string,
  notes: string,
  cta: string,
  contactEmails: string[] = [],
): Pitch {
  const now = new Date().toISOString();
  return {
    id: `pitch-${opp.id}`,
    opportunityId: opp.id,
    companyName: opp.companyName,
    country: opp.country,
    angles,
    emailSubject: subject,
    emailBody: body,
    personalizationNotes: notes,
    callToAction: cta,
    contactEmails,
    aiStatus: 'DONE',
    aiProcessedAt: now,
    createdAt: now,
    updatedAt: now,
    opportunity: {
      id: opp.id,
      stage: opp.stage,
      score: opp.score,
      rank: opp.rank,
      recommendedOffering: opp.recommendedOffering,
      offeringCode: opp.offeringCode,
      whyNow: opp.whyNow,
      topDomain: opp.topDomain,
      jobCount: opp.jobCount,
    },
  };
}

const ALL_DEMO_PITCHES: Pitch[] = ALL_DEMO_OPPORTUNITIES.filter((o) =>
  ['QUALIFIED', 'NURTURE'].includes(o.stage),
)
  .slice(0, 8)
  .map((opp, i) =>
    pitchFromOpp(
      opp,
      [
        `${opp.topDomain || 'Tech'} hiring surge → transformation window`,
        `Lead with ${opp.recommendedOffering.split('&')[0].trim()}`,
        i % 2 === 0 ? 'Peer-level discovery, not product dump' : 'Reference delivery capacity in-region',
      ],
      `${opp.companyName}: quick thought on ${opp.topDomain || 'your transformation'} hiring`,
      `Hi team,\n\nI noticed ${opp.companyName} is actively hiring around ${opp.topDomain || 'enterprise technology'} (${opp.jobCount} relevant roles). ${opp.whyNow || 'That usually signals an active programme.'}\n\nWe help organisations accelerate ${opp.recommendedOffering.toLowerCase()} with senior delivery pods and clear outcomes in the first 90 days.\n\nWould a short 20-minute call next week be useful to compare notes?\n\nBest regards,\n[Your Name]\n[Your Company]`,
      `Personalized using score ${opp.score}, ${opp.jobCount} jobs, and offering ${opp.offeringCode || 'custom'}.`,
      'Book a 20-minute discovery call',
      i % 3 === 0
        ? [`careers@${opp.companyName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'company'}.com`]
        : i % 3 === 1
          ? [`talent@${opp.companyName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'company'}.com`]
          : [],
    ),
  );

// ─── Demo Stats ───────────────────────────────────────────────
export const demoStats: StatsResponse = {
  totalRaw: 342,
  totalClean: 187,
  totalProcessed: 156,
  highConfidence: 98,
  pendingCount: 31,
  companyIntelDone: 42,
  qualifiedOpportunities: 28,
  pitchesReady: 19,
  countries: [
    { name: 'Saudi Arabia', count: 112 },
    { name: 'UAE', count: 48 },
    { name: 'Germany', count: 22 },
    { name: 'United Kingdom', count: 18 },
    { name: 'France', count: 14 },
    { name: 'Poland', count: 12 },
    { name: 'Ireland', count: 9 },
    { name: 'The Netherlands', count: 8 },
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
  feedback: {
    events: { REVIEWED: 4, CONTACTED: 3, REPLIED: 2, MEETING: 1, WON: 1, LOST: 1 },
    pipeline: { REVIEWED: 2, CONTACTED: 2, REPLIED: 1, MEETING: 1, WON: 1, LOST: 1 },
  },
};

// ─── Demo data helpers ────────────────────────────────────────
export function getDemoJobs(filters: JobFilters): JobsResponse {
  let jobs = [...ALL_DEMO_JOBS];

  if (filters.country) {
    jobs = jobs.filter((j) =>
      j.country.toLowerCase().includes(filters.country!.toLowerCase()),
    );
  } else if (filters.region === 'Europe') {
    const europe = new Set(EUROPE_COUNTRIES.map((c) => c.toLowerCase()));
    jobs = jobs.filter((j) => europe.has(j.country.toLowerCase()));
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

export function getDemoOpportunities(filters?: {
  stage?: OpportunityStage;
  country?: string;
  minScore?: number;
}): OpportunitiesResponse {
  let opportunities = [...ALL_DEMO_OPPORTUNITIES];
  if (filters?.stage) {
    opportunities = opportunities.filter((o) => o.stage === filters.stage);
  }
  if (filters?.country) {
    opportunities = opportunities.filter((o) =>
      o.country.toLowerCase().includes(filters.country!.toLowerCase()),
    );
  }
  if (filters?.minScore !== undefined) {
    opportunities = opportunities.filter((o) => o.score >= filters.minScore!);
  }

  const summary: Record<string, number> = {};
  for (const o of ALL_DEMO_OPPORTUNITIES) {
    summary[o.stage] = (summary[o.stage] || 0) + 1;
  }

  return { opportunities, summary };
}

export function getDemoPitches(filters?: {
  status?: string;
  country?: string;
}): PitchesResponse {
  let pitches = [...ALL_DEMO_PITCHES];
  if (filters?.status) {
    pitches = pitches.filter((p) => p.aiStatus === filters.status);
  }
  if (filters?.country) {
    pitches = pitches.filter((p) =>
      p.country.toLowerCase().includes(filters.country!.toLowerCase()),
    );
  }

  const summary: Record<string, number> = {};
  for (const p of ALL_DEMO_PITCHES) {
    summary[p.aiStatus] = (summary[p.aiStatus] || 0) + 1;
  }

  return { pitches, summary };
}

const DEMO_FEEDBACK_OUTCOMES: FeedbackOutcome[] = [
  'REVIEWED',
  'CONTACTED',
  'REPLIED',
  'MEETING',
  'WON',
  'LOST',
];

const ALL_DEMO_FEEDBACK: FeedbackEvent[] = ALL_DEMO_OPPORTUNITIES.slice(0, 6).map((opp, i) => {
  const outcome = DEMO_FEEDBACK_OUTCOMES[i % DEMO_FEEDBACK_OUTCOMES.length];
  return {
    id: `fb-${opp.id}`,
    opportunityId: opp.id,
    outcome,
    notes: i % 2 === 0 ? `Follow-up logged for ${opp.companyName}` : null,
    recordedBy: 'team',
    createdAt: new Date(Date.now() - i * 3600000).toISOString(),
    opportunity: {
      id: opp.id,
      companyName: opp.companyName,
      country: opp.country,
      score: opp.score,
      rank: opp.rank,
      stage: outcome,
      recommendedOffering: opp.recommendedOffering,
      topDomain: opp.topDomain,
    },
  };
});

export function getDemoFeedback(filters?: {
  opportunityId?: string;
  outcome?: FeedbackOutcome;
}): FeedbackResponse {
  let events = [...ALL_DEMO_FEEDBACK];
  if (filters?.opportunityId) {
    events = events.filter((e) => e.opportunityId === filters.opportunityId);
  }
  if (filters?.outcome) {
    events = events.filter((e) => e.outcome === filters.outcome);
  }

  const summary: Record<string, number> = {};
  for (const e of ALL_DEMO_FEEDBACK) {
    summary[e.outcome] = (summary[e.outcome] || 0) + 1;
  }

  const pipeline: Record<string, number> = {};
  for (const e of ALL_DEMO_FEEDBACK) {
    pipeline[e.outcome] = (pipeline[e.outcome] || 0) + 1;
  }

  return { events, summary, pipeline };
}
