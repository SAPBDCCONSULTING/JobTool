Below is a consolidated **Product Requirements Document (PRD)** for the system we have discussed. I have intentionally resolved the earlier ambiguities around **raw records vs occurrences vs canonical jobs, normalization, deduplication, AI processing, scheduling, and company scoring** so the architecture has one consistent source of truth.

# Product Requirements Document

# SAP Hiring Intelligence & Opportunity Discovery Platform

**Version:** 1.0
**Status:** Draft for Architecture & Development
**Primary Goal:** Convert job-market hiring data into prioritized company-level sales opportunities.

---

# 1. Product Overview

## 1.1 Problem

Companies hiring for multiple SAP-related roles may be experiencing:

* SAP implementation projects
* S/4HANA migrations
* SAP transformations
* ERP modernization
* Integration projects
* SAP capability expansion
* Temporary resource shortages
* Managed services requirements

Today, identifying these opportunities requires manually:

1. Searching multiple job boards.
2. Reviewing hundreds or thousands of job postings.
3. Removing duplicate jobs.
4. Determining whether jobs are genuinely SAP-related.
5. Grouping jobs by company.
6. Understanding what the combined hiring activity indicates.
7. Identifying high-potential companies.
8. Researching what service to pitch.
9. Drafting personalized outreach.

The platform will automate this workflow.

---

# 2. Product Vision

The platform should not primarily behave as a job search engine.

It should behave as a:

> **Hiring Intelligence and Opportunity Discovery Platform.**

The primary output is not:

> "Here are 500 SAP jobs."

The primary output is:

> "Here are the companies showing the strongest SAP hiring signals, what those signals likely mean, and how we may be able to sell services to them."

The core transformation is:

```text
Job Data
    ↓
Unique Jobs
    ↓
Hiring Signals
    ↓
Company Intelligence
    ↓
Opportunity Ranking
    ↓
Recommended Service
    ↓
Sales Outreach
```

---

# 3. Primary Users

## 3.1 Sales / Business Development User

Primary user.

Needs to:

* View high-potential companies.
* Understand why a company was scored highly.
* View associated job postings.
* Understand likely initiatives.
* Identify possible services to pitch.
* Generate outreach drafts.

---

## 3.2 Administrator

Needs to:

* Create campaigns.
* Configure keywords.
* Configure sources.
* Configure exclusion rules.
* Configure scoring rules.
* Monitor ingestion runs.
* Review potential duplicates.
* Correct company resolution.
* Monitor AI processing.

---

## 3.3 Future User: Analyst

May need to:

* Investigate companies.
* Review historical hiring activity.
* Review trends.
* Validate AI recommendations.
* Correct inaccurate classifications.

---

# 4. Core Concepts and Definitions

This section is important because these concepts must not be mixed.

---

## 4.1 Raw Job Record

A raw job record is exactly what a source returns.

Example:

```text
Source: LinkedIn

Title:
SAP S4 HANA Consultant

Company:
ABC Incorporated

Location:
NYC
```

The raw record is stored for:

* Auditability.
* Debugging.
* Reprocessing.
* Source tracking.

A raw record is **not considered a unique job**.

---

## 4.2 Job Occurrence

A job occurrence means:

> We observed a job posting on a specific source.

Example:

```text
Occurrence 1:
Indeed

Occurrence 2:
LinkedIn

Occurrence 3:
Company Website
```

All three may represent the same real-world job.

Each occurrence belongs to one source.

---

## 4.3 Canonical Job

A canonical job represents:

> One unique real-world job opening as determined by the platform.

Example:

```text
Canonical Job #100

Company:
ABC Corporation

Title:
SAP S/4HANA Consultant

Location:
New York
```

Multiple occurrences can point to one canonical job.

```text
Indeed ────────┐
LinkedIn ──────┼── Canonical Job #100
Company Site ──┘
```

---

## 4.4 Company

A company represents the normalized organization associated with one or more canonical jobs.

Example:

```text
ABC
ABC Inc.
ABC Incorporated
ABC Corporation
```

May all resolve to:

```text
ABC Corporation
Company ID: 50
```

---

## 4.5 Job Analysis

Job analysis is the deterministic and AI-generated intelligence associated with a canonical job.

Examples:

* SAP relevance.
* SAP technologies.
* Role category.
* Seniority.
* Project type.
* Outsourcing potential.

---

## 4.6 Company Intelligence

Company intelligence is derived from all relevant canonical jobs associated with a company.

Examples:

* Number of active SAP jobs.
* Hiring velocity.
* Technology distribution.
* Functional vs technical hiring.
* Likely initiative.
* Recommended services.

---

# 5. High-Level System Flow

The complete system flow is:

```text
CAMPAIGN
    ↓
SCHEDULER
    ↓
JOB SOURCES
    ↓
RAW JOB RECORDS
    ↓
SOURCE IDENTITY CHECK
    ↓
NORMALIZATION
    ↓
JOB OCCURRENCE
    ↓
COMPANY RESOLUTION
    ↓
CANONICAL DUPLICATE DETECTION
    ↓
CANONICAL JOB
    ↓
DETERMINISTIC QUALIFICATION
    ↓
AI JOB ANALYSIS
    ↓
COMPANY MARKED FOR RECALCULATION
    ↓
COMPANY METRICS
    ↓
COMPANY AI INTELLIGENCE
    ↓
COMPANY OPPORTUNITY SCORE
    ↓
DASHBOARD
    ↓
PITCH GENERATION
```

---

# 6. Functional Requirements

# FR-1: Campaign Management

The platform must allow users to create and manage campaigns.

A campaign defines what the platform should search for.

### Campaign fields

```text
Campaign Name
Description
Status
Keywords
Locations
Countries
Sources
Schedule
Excluded Keywords
Excluded Companies
```

Example:

```text
Campaign:
SAP Opportunities - USA

Keywords:
SAP
S/4HANA
SAP FICO
SAP BTP
SAP Integration

Country:
USA

Schedule:
Every 6 hours
```

---

## Campaign Statuses

```text
DRAFT
ACTIVE
PAUSED
ARCHIVED
```

Only active campaigns should be processed by the scheduler.

---

# FR-2: Job Source Management

The system must support multiple ingestion sources.

Examples:

* Apify actors.
* Job APIs.
* Company career pages.
* Other supported job providers.

Every source must have a unique identifier.

Example:

```text
linkedin
indeed
company_career_site
apify_actor_1
```

The system must preserve source-specific metadata.

---

# FR-3: Scheduled Data Collection

The scheduler will trigger campaigns based on their configured frequency.

## MVP Default

```text
Every 6 hours
```

Example:

```text
00:00
06:00
12:00
18:00
```

This should be configurable per campaign in the future.

---

## Scheduler Responsibility

The scheduler only decides:

> Which campaign/source combination should run now?

It should not perform:

* AI analysis.
* Deduplication.
* Scoring.

It should create processing work for workers.

---

# FR-4: Source Run Tracking

Every fetch execution must create a source run.

The system must record:

```text
Campaign
Source
Start Time
End Time
Status
Records Fetched
Errors
```

Statuses:

```text
QUEUED
RUNNING
COMPLETED
PARTIALLY_COMPLETED
FAILED
```

---

# FR-5: Raw Data Storage

Every fetched job record must be stored before processing.

The platform must store:

```text
Source
Source Job ID
Source URL
Raw Payload
Fetched Time
Source Run ID
```

Raw data must not be overwritten.

A new fetch may create a new raw record even if the source job was previously observed.

This preserves history.

---

# 7. Data Model

The following data model is the recommended MVP architecture.

---

# 7.1 `campaigns`

```text
id

name
description

status

schedule_expression

created_at
updated_at
```

---

# 7.2 `campaign_keywords`

```text
id

campaign_id

keyword
keyword_type

created_at
```

Keyword types:

```text
INCLUDE
EXCLUDE
```

---

# 7.3 `campaign_sources`

```text
id

campaign_id

source

configuration

is_active
```

---

# 7.4 `source_runs`

```text
id

campaign_id
campaign_source_id

status

started_at
completed_at

records_fetched
records_processed
records_failed

error_details
```

---

# 7.5 `raw_jobs`

Purpose:

> Immutable ingestion history.

Fields:

```text
id

source_run_id

source
source_job_id
source_url

raw_payload

fetched_at
created_at
```

The raw payload should generally be stored as JSON/JSONB.

---

# 7.6 `companies`

Purpose:

> Represents the canonical organization.

Fields:

```text
id

canonical_name
normalized_name

domain
website

linkedin_url

created_at
updated_at
```

---

# 7.7 `company_aliases`

This table is recommended.

It solves company-name variation.

Example:

```text
ABC Inc.
ABC Incorporated
ABC Corp.
```

All may map to:

```text
Company #50
ABC Corporation
```

Fields:

```text
id

company_id

alias
normalized_alias

source

created_at
```

---

# 7.8 `job_occurrences`

Purpose:

> Represents one job posting observed on one source.

Fields:

```text
id

raw_job_id

source
source_job_id
source_url

company_id

source_title
source_company_name
source_location
source_description

normalized_title
normalized_company_name
normalized_location

content_hash

canonical_job_id

first_seen_at
last_seen_at

status

created_at
updated_at
```

Important relationship:

```text
One Occurrence
       ↓
One Canonical Job
```

A canonical job can have many occurrences.

---

# 7.9 `canonical_jobs`

Purpose:

> Represents one unique real-world job.

Fields:

```text
id

company_id

canonical_title
normalized_title

canonical_location
normalized_location

canonical_description

first_seen_at
last_seen_at

status

qualification_status

created_at
updated_at
```

Recommended statuses:

```text
ACTIVE
STALE
INACTIVE
ARCHIVED
```

---

# 7.10 `job_analysis`

Purpose:

> Stores deterministic and AI intelligence for canonical jobs.

Fields:

```text
id

canonical_job_id

analysis_version

relevance_score
confidence_score

technologies

role_category
seniority

project_type

outsourcing_potential

analysis_summary

status

created_at
```

The latest successful analysis is considered current.

Previous analysis records should remain available.

---

# 7.11 `company_metrics`

Purpose:

> Stores calculated numerical company signals.

Fields:

```text
company_id

active_relevant_jobs

jobs_last_7_days
jobs_last_30_days

hiring_velocity

technology_distribution

functional_roles_count
technical_roles_count

updated_at
```

---

# 7.12 `company_analysis`

Purpose:

> Stores AI-generated company intelligence.

Fields:

```text
id

company_id

analysis_version

likely_initiative

initiative_confidence

recommended_services

opportunity_summary

evidence

created_at
```

---

# 7.13 `company_scores`

Purpose:

> Stores opportunity scoring.

Fields:

```text
id

company_id

score

relevance_component
volume_component
velocity_component
project_component
outsourcing_component

score_version

created_at
```

---

# 8. Source-Level Identity Resolution

Before expensive processing, the platform must determine whether the source posting has been seen previously.

The unique identity is:

```text
source + source_job_id
```

Example:

```text
LinkedIn + 12345
```

This should have a database unique constraint.

Conceptually:

```sql
UNIQUE(source, source_job_id)
```

---

## Case A: Already Seen

The system finds:

```text
source = LinkedIn
source_job_id = 12345
```

Then it:

1. Retrieves the existing occurrence.
2. Calculates the new content hash.
3. Compares the new hash with the latest occurrence state.

If unchanged:

```text
Update last_seen_at
Stop processing
```

No normalization, AI analysis, or company scoring is required again.

---

## Case B: Same Source ID but Changed

If:

```text
Same Source ID
Different Content Hash
```

Then:

1. Store the new raw record.
2. Update occurrence fields.
3. Determine whether meaningful canonical fields changed.
4. Re-run duplicate/canonical evaluation if required.
5. Mark job analysis stale if meaningful information changed.
6. Queue re-analysis.

---

## Case C: New Source Job ID

Proceed through the full normalization and canonical matching pipeline.

---

# 9. Normalization

Normalization must be deterministic and repeatable.

AI should not be required for basic normalization.

---

# 9.1 Text Normalization

Apply:

```text
Lowercase
Whitespace normalization
Punctuation normalization
Unicode normalization
Common abbreviation normalization
```

Example:

```text
SAP S4 HANA Consultant
```

becomes:

```text
sap s4hana consultant
```

---

# 9.2 Title Normalization

The system should maintain a title/technology alias dictionary.

Example:

```text
S4 HANA
S/4 HANA
S4HANA
S/4HANA
```

should normalize to:

```text
s4hana
```

Example:

```text
Sr.
Senior
Sr
```

should normalize to:

```text
senior
```

The system should store both:

```text
Original Title
Normalized Comparison Title
```

The original title must never be lost.

---

# 9.3 Company Normalization

Basic normalization:

```text
ABC Inc.
ABC Incorporated
ABC Corporation
```

can produce a comparison key:

```text
abc
```

Common legal suffixes may be removed for comparison:

```text
inc
incorporated
corp
corporation
llc
ltd
limited
```

However:

> Removing legal suffixes must not automatically merge companies.

Company resolution should use additional evidence where available:

1. Company domain.
2. Official website.
3. LinkedIn company URL.
4. Existing aliases.
5. Normalized name.
6. Location/context.

---

# 9.4 Location Normalization

Example:

```text
NYC
New York City
New York, NY
```

should resolve where possible to structured fields:

```text
city: New York
state: NY
country: US
```

The original location string should also be retained.

---

# 9.5 Description Normalization

For comparison:

* Remove excessive whitespace.
* Normalize Unicode.
* Remove irrelevant markup.
* Normalize formatting.

The system should not aggressively rewrite the description.

A normalized comparison representation may be generated separately.

---

# 10. Content Hashing

The system should generate a hash from meaningful normalized fields.

Example:

```text
normalized_title
normalized_location
normalized_description
```

Conceptually:

```text
SHA256(
  normalized_title
  +
  normalized_location
  +
  normalized_description
)
```

Purpose:

> Efficiently detect whether the same source job materially changed.

Important:

The hash is not the primary cross-source duplicate mechanism.

Two sources may format the same job differently.

The hash primarily helps with:

```text
Same source job
Has content changed?
```

---

# 11. Company Resolution Flow

The system must resolve a normalized company reference before job-level canonical duplicate matching.

The flow:

```text
Incoming Company Name
        ↓
Normalize
        ↓
Domain Available?
        │
   YES ─┼── Match Company by Domain
        │
   NO
        ↓
Match Existing Alias
        ↓
Exact Normalized Name Match
        ↓
Candidate Company Similarity Match
        ↓
Ambiguous?
        │
   YES ── Review Queue / AI-assisted resolution
        │
   NO
        ↓
Create Company
```

The company ID should then be attached to the job occurrence.

---

# 12. Cross-Source Job Deduplication

This determines:

> Does this occurrence represent an existing canonical job?

---

## 12.1 Candidate Generation

The system must not compare a new occurrence against every job in the database.

Candidate retrieval should use indexed filters.

Recommended initial candidate criteria:

```text
Same company_id

AND

Similar/relevant location

AND

Active or recently seen canonical jobs
```

A configurable time window should be used.

Recommended initial window:

```text
Active jobs
+
Jobs last seen within 90 days
```

This window may be adjusted based on job lifecycle data.

---

# 12.2 Candidate Comparison

For each candidate, calculate signals such as:

```text
Company Match
Title Similarity
Location Similarity
Description Similarity
Posting Date Proximity
Source Metadata Similarity
```

A weighted score can be calculated.

Example conceptual formula:

```text
Duplicate Score =

30% Company
25% Title
15% Location
30% Description
```

These weights must be configurable/versioned.

---

# 12.3 Duplicate Decision Thresholds

Recommended initial thresholds:

```text
95–100
Auto Match

80–94
Potential Match

Below 80
New Canonical Job
```

For potential matches, the MVP can use one of two approaches:

### Option A

Create a new canonical job conservatively.

### Option B — Recommended

Create a review status:

```text
POTENTIAL_DUPLICATE
```

and allow human review.

The recommended architecture should preserve the ability to implement Option B.

---

# 12.4 Auto-Match Result

If an occurrence matches an existing canonical job:

```text
Do not create another canonical job.
```

Instead:

```text
Link job_occurrence.canonical_job_id
```

Update:

```text
canonical_job.last_seen_at
```

Potentially update canonical fields if the new source is considered higher quality.

---

# 12.5 No Match Result

If no candidate is sufficiently similar:

```text
Create new canonical_job.
```

Then link:

```text
job_occurrence
    ↓
canonical_job
```

---

# 13. Canonical Field Selection

When multiple sources provide different values, the platform must define which value becomes canonical.

Recommended source priority:

```text
Official Company Career Site
        ↓
Direct Job Board
        ↓
Aggregator
        ↓
Other Sources
```

Example:

```text
LinkedIn:
SAP S4 Consultant

Company Website:
Senior SAP S/4HANA Consultant
```

The canonical job may prefer the company website value.

The system should store:

```text
field_source
```

or maintain provenance for important canonical fields.

---

# 14. Deterministic Qualification

Only canonical jobs should enter qualification.

Initial deterministic rules may include:

### Include

```text
Contains required SAP terms
Matches campaign geography
Within allowed age
```

### Exclude

```text
Irrelevant SAP meaning
Internships if excluded
Recruitment agencies if excluded
Competitors if excluded
Unsupported countries
```

The result should be:

```text
QUALIFIED
REJECTED
REVIEW_REQUIRED
```

Rejected jobs should not proceed to expensive AI analysis unless explicitly reprocessed.

---

# 15. Job AI Analysis

AI analysis should run only when:

1. A new canonical job is created and qualifies.
2. A canonical job materially changes.
3. The analysis version changes and reprocessing is requested.

AI must not be called merely because the same job is observed again.

---

## Job AI Input

The model receives structured data such as:

```text
Title
Company
Location
Description
Campaign Context
Target Services
```

---

## Required Output

The output should be structured JSON containing:

```text
relevance_score

confidence

technologies

role_category

seniority

project_type

project_confidence

outsourcing_potential

summary
```

All AI outputs must be validated against a schema.

---

# 16. Job Score vs Company Score

These must remain separate.

---

## Job Score

Answers:

> How relevant is this individual job?

Example:

```text
92/100
```

---

## Company Score

Answers:

> How strong is this company as a sales opportunity?

Example:

```text
93/100
```

A company should not simply use the average job score.

Company scoring must consider company-level patterns.

---

# 17. Company Recalculation

Whenever a relevant canonical job is created or materially updated:

```text
Company is marked dirty.
```

Example:

```text
company_id = 50
needs_recalculation = true
```

Multiple job updates should not trigger repeated company calculations.

---

## Debounce Requirement

Recommended MVP:

```text
10-minute debounce window
```

Example:

```text
06:00 Job A
06:02 Job B
06:04 Job C
```

Instead of calculating three times:

```text
06:00
06:02
06:04
```

calculate once after the activity batch.

---

# 18. Company Metrics

Company metrics should be deterministic calculations.

Examples:

```text
Active Relevant Jobs

Jobs Last 7 Days

Jobs Last 30 Days

Technology Distribution

Functional Role Count

Technical Role Count

Hiring Velocity

Recent Hiring Growth
```

Company metrics must use:

```text
All relevant active historical canonical jobs
```

not only jobs discovered during the latest scheduler run.

---

# 19. Company AI Analysis

Company AI should receive aggregated data, not thousands of raw job descriptions unnecessarily.

Example input:

```text
Company:
ABC Corporation

Active Relevant Jobs:
8

Jobs Last 30 Days:
6

Technology Breakdown:
S/4HANA: 3
FICO: 2
BTP: 2
Integration: 1

Recent Roles:
...
```

The AI should infer:

```text
Likely Initiative

Initiative Confidence

Opportunity Summary

Potential Business Need

Recommended Services

Supporting Evidence
```

---

# 20. Company AI Recalculation Rules

Company AI should not run for every small update.

It should run when:

* Company analysis does not exist.
* Significant new jobs are discovered.
* New technology categories appear.
* Job volume changes materially.
* A significant role appears.
* Existing company analysis becomes stale.
* Manual refresh is requested.

Examples of significant roles:

```text
SAP Program Director
SAP Transformation Lead
S/4HANA Migration Lead
SAP Enterprise Architect
```

The exact rules should be configurable.

---

# 21. Company Opportunity Score

The final score should be deterministic and explainable.

Recommended components:

```text
Job Relevance
Hiring Volume
Hiring Velocity
Project Signal
Outsourcing Potential
```

Example:

```text
25% Job Relevance
20% Hiring Volume
20% Hiring Velocity
20% Project Signal
15% Outsourcing Potential
```

The formula must be versioned.

---

## Example

```text
ABC Corporation

Job Relevance:
90

Hiring Volume:
80

Hiring Velocity:
90

Project Signal:
95

Outsourcing Potential:
85
```

Result:

```text
Opportunity Score:
89
```

The dashboard must show:

> Why did this company receive this score?

---

# 22. Explainability Requirement

Every important score should have supporting evidence.

Example:

```text
Opportunity Score: 93

Why:

• 8 active SAP roles
• 6 posted in the last 30 days
• S/4HANA transformation roles detected
• Functional and technical hiring
• Integration and architecture requirements
```

The system must avoid unexplained black-box scores.

---

# 23. Job Lifecycle Management

Jobs should not immediately become inactive because they disappear from one fetch.

Recommended states:

```text
ACTIVE
STALE
INACTIVE
ARCHIVED
```

---

## Active

Recently observed.

---

## Stale

Not observed for a configured number of expected source runs.

---

## Inactive

Not observed for a longer threshold.

---

## Important Rule

If a job has multiple occurrences:

```text
LinkedIn
Indeed
Company Website
```

the canonical job should remain active if it is still observed on at least one valid occurrence.

---

# 24. Recommended Lifecycle Logic

Example:

```text
Seen today
→ ACTIVE

Not seen for 14 days
→ STALE

Not seen for 30 days
→ INACTIVE
```

These should be configurable.

The exact lifecycle may eventually differ by source reliability.

---

# 25. Company-Level Historical Intelligence

The platform should preserve historical job discovery information.

This enables trends such as:

```text
January:
2 active SAP jobs

February:
4

March:
7

April:
12
```

The system can derive:

```text
Hiring acceleration
Hiring slowdown
New technology adoption
Transformation signals
```

Historical analysis is a major differentiator of the product.

---

# 26. Dashboard Requirements

The primary dashboard should be company-first.

Default view:

```text
Companies ranked by Opportunity Score
```

Each company card/list row should display:

```text
Company Name

Opportunity Score

Confidence

Active Relevant Jobs

Recent Hiring Activity

Likely Initiative

Recommended Service

Last Updated
```

---

# 27. Company Detail Page

A company detail page should include:

## Overview

```text
Opportunity Score
Confidence
Likely Initiative
Recommended Services
```

---

## Why This Company

Explain the evidence.

---

## Job Activity

Show:

```text
Active Jobs
Recent Jobs
Historical Jobs
```

---

## Hiring Trends

Examples:

```text
7-day
30-day
90-day
```

---

## Technology Breakdown

Example:

```text
S/4HANA
FICO
BTP
Integration
ABAP
```

---

## Individual Jobs

Each canonical job should be expandable.

The user should be able to see:

```text
Canonical Job
Source Occurrences
Original URLs
AI Analysis
Scores
```

---

# 28. Job Explorer

The system should also provide a job-level explorer.

Filters:

```text
Company
Technology
Country
Location
Role
Score
Date
Status
Source
```

Users should be able to navigate:

```text
Job
    ↓
Company
```

and:

```text
Company
    ↓
All Associated Jobs
```

---

# 29. Filtering Requirements

The company dashboard should support:

```text
Minimum Opportunity Score

Country

Technology

Likely Initiative

Active Jobs Count

Jobs Last 30 Days

Hiring Velocity

Confidence
```

The job explorer should support:

```text
Relevance Score

Technology

Role Category

Location

Company

Job Status

Date Range

Source
```

---

# 30. Pitch Generation

The user should be able to generate a sales pitch for a company.

Input should include:

```text
Company Intelligence

Relevant Jobs

Likely Initiative

Recommended Service

User's Company Services

Tone

Target Persona
```

---

## Required Pitch Types

The MVP may support:

```text
Cold Email

LinkedIn Message

Short Personalized Outreach
```

---

## Pitch Generation Rule

The AI must not claim facts that cannot be supported by available data.

For example, avoid:

> "We know you are implementing SAP next month."

Instead:

> "Based on your recent hiring across S/4HANA and integration..."

This protects the credibility of outreach.

---

# 31. Pitch Approval

Generated pitches should be drafts.

The user must be able to:

```text
Edit
Regenerate
Copy
Save
```

The system should not automatically send emails in the MVP.

---

# 32. Processing Architecture

Recommended processing architecture:

```text
Scheduler
    ↓
Fetch Queue
    ↓
Source Workers
    ↓
Raw Storage
    ↓
Normalization Queue
    ↓
Normalization Workers
    ↓
Deduplication Queue
    ↓
Canonicalization Workers
    ↓
Qualification Queue
    ↓
AI Analysis Queue
    ↓
Company Aggregation Queue
```

Recommended technology:

```text
PostgreSQL
Redis
BullMQ
Node.js / TypeScript
```

---

# 33. Queue Requirements

Processing must be asynchronous.

The API/UI should not wait for:

```text
Apify Fetch
AI Analysis
Company Scoring
```

Workers should handle these independently.

---

# 34. Idempotency

Every processing stage must be safe to retry.

Example:

A worker crashes after:

```text
Raw Job Stored
```

Retrying should not create inconsistent duplicate data.

Unique keys and idempotency keys should be used.

Important constraints:

```text
Unique source occurrence identity
Unique source + source_job_id
```

Processing should be transaction-safe where possible.

---

# 35. Error Handling

Failures should not stop an entire campaign.

Example:

```text
1000 jobs fetched

20 fail normalization
```

Result:

```text
980 continue processing
20 marked failed
```

The failed records should be retryable.

---

# 36. Processing Status Tracking

Each job occurrence should have processing status information.

Example:

```text
RECEIVED
NORMALIZED
COMPANY_RESOLVED
DEDUP_CHECKED
CANONICALIZED
QUALIFIED
REJECTED
AI_ANALYZED
FAILED
```

This should make debugging straightforward.

---

# 37. Reprocessing

The system must support reprocessing because logic will improve.

Examples:

```text
Normalization logic improved.

Duplicate thresholds changed.

New AI model introduced.

New scoring formula introduced.
```

The platform must support reprocessing historical data without losing raw source history.

This is the primary reason raw data is retained.

---

# 38. Versioning

The following should be versioned:

```text
Normalization Version

Duplicate Algorithm Version

Qualification Rule Version

AI Prompt Version

AI Model Version

Job Analysis Version

Company Analysis Version

Scoring Formula Version
```

This enables comparison of old vs new results.

---

# 39. Data Retention

Recommended:

### Raw data

Retain indefinitely initially, subject to storage policy.

### Canonical jobs

Retain indefinitely for historical intelligence.

### Occurrences

Retain indefinitely.

### AI analysis

Retain historical versions.

Historical retention is important because hiring trends are a product feature.

---

# 40. MVP Scope

The MVP should include:

## Discovery

* Campaigns.
* Keywords.
* Multiple sources.
* Scheduled fetching.

## Data Processing

* Raw storage.
* Source identity matching.
* Normalization.
* Company resolution.
* Cross-source deduplication.
* Canonical jobs.

## Intelligence

* Deterministic filtering.
* Job AI analysis.
* Company aggregation.
* Company scoring.
* Company AI analysis.

## Product

* Company-first dashboard.
* Company detail page.
* Job explorer.
* Filtering.
* Pitch generation.

---

# 41. Explicitly Out of Scope for MVP

To prevent scope creep:

```text
Automatic email sending

CRM synchronization

Full contact enrichment

Automatic prospect sequencing

Complex multi-user permissions

Automatic AI-based scraping decisions

Fully autonomous outreach

Predictive revenue forecasting
```

These can be added later.

---

# 42. Recommended MVP Processing Frequency

| Process                     | Frequency                       |
| --------------------------- | ------------------------------- |
| Scheduler                   | Every 6 hours                   |
| Source Fetch                | Triggered by scheduler          |
| Raw Storage                 | Immediate                       |
| Source Identity Check       | Immediate                       |
| Normalization               | Immediate / async               |
| Duplicate Matching          | Immediate / async               |
| Deterministic Qualification | Immediate                       |
| Job AI Analysis             | Only new/changed canonical jobs |
| Company Aggregation         | Debounced ~10 minutes           |
| Company AI                  | Significant changes / stale     |
| Lifecycle Check             | Daily                           |
| Trend Calculation           | Daily                           |

---

# 43. Complete Example

At 6:00 AM:

```text
Scheduler starts.
```

At 6:01 AM:

```text
Apify returns:

1000 records.
```

The system stores:

```text
1000 raw_jobs.
```

Source identity check finds:

```text
700 previously seen source jobs.
```

For these:

```text
Update last_seen_at.

If content unchanged:
Stop.
```

Remaining:

```text
300 new/changed source occurrences.
```

Normalize them.

Cross-source duplicate matching finds:

```text
200 belong to existing canonical jobs.
```

They are linked to those canonical jobs.

Remaining:

```text
100 new canonical jobs.
```

Qualification:

```text
40 rejected.

60 qualified.
```

AI:

```text
60 jobs analyzed.
```

Those jobs affect:

```text
25 companies.
```

The companies are marked for recalculation.

After the debounce period:

```text
Company metrics are recalculated.
```

Companies with meaningful changes receive updated AI intelligence.

Then:

```text
Opportunity scores are recalculated.
```

The dashboard now displays the updated company ranking.

---

# 44. Final System Architecture

```text
                           ┌───────────────┐
                           │   CAMPAIGNS   │
                           └───────┬───────┘
                                   │
                                   ▼
                           ┌───────────────┐
                           │   SCHEDULER   │
                           └───────┬───────┘
                                   │
                                   ▼
                           ┌───────────────┐
                           │ JOB SOURCES   │
                           │ API / APIFY   │
                           └───────┬───────┘
                                   │
                                   ▼
                           ┌───────────────┐
                           │  SOURCE RUN   │
                           └───────┬───────┘
                                   │
                                   ▼
                           ┌───────────────┐
                           │   RAW JOBS    │
                           └───────┬───────┘
                                   │
                                   ▼
                         ┌─────────────────────┐
                         │ SOURCE IDENTITY     │
                         │ source + job_id     │
                         └──────────┬──────────┘
                                    │
                         New / Changed Only
                                    │
                                    ▼
                           ┌───────────────┐
                           │ NORMALIZATION │
                           └───────┬───────┘
                                   │
                                   ▼
                           ┌───────────────┐
                           │ COMPANY       │
                           │ RESOLUTION    │
                           └───────┬───────┘
                                   │
                                   ▼
                           ┌───────────────┐
                           │ JOB           │
                           │ OCCURRENCE    │
                           └───────┬───────┘
                                   │
                                   ▼
                         ┌─────────────────────┐
                         │ CANONICAL DUPLICATE │
                         │ DETECTION           │
                         └──────────┬──────────┘
                                    │
                   ┌────────────────┴───────────────┐
                   │                                │
                   ▼                                ▼
            Existing Job                      New Job
                   │                                │
                   └────────────────┬───────────────┘
                                    │
                                    ▼
                           ┌───────────────┐
                           │ CANONICAL JOB │
                           └───────┬───────┘
                                   │
                                   ▼
                           ┌───────────────┐
                           │ RULE FILTER   │
                           └───────┬───────┘
                                   │
                                   ▼
                           ┌───────────────┐
                           │ AI JOB        │
                           │ ANALYSIS      │
                           └───────┬───────┘
                                   │
                                   ▼
                           ┌───────────────┐
                           │ COMPANY DIRTY │
                           └───────┬───────┘
                                   │
                                   ▼
                           ┌───────────────┐
                           │ DEBOUNCE      │
                           └───────┬───────┘
                                   │
                                   ▼
                           ┌───────────────┐
                           │ COMPANY       │
                           │ METRICS       │
                           └───────┬───────┘
                                   │
                                   ▼
                           ┌───────────────┐
                           │ COMPANY AI    │
                           │ INTELLIGENCE  │
                           └───────┬───────┘
                                   │
                                   ▼
                           ┌───────────────┐
                           │ OPPORTUNITY   │
                           │ SCORE         │
                           └───────┬───────┘
                                   │
                                   ▼
                           ┌───────────────┐
                           │ DASHBOARD +   │
                           │ PITCH         │
                           └───────────────┘
```

---

# 45. The Most Important Architectural Rules

These are the rules I would give directly to the development team.

### Rule 1

**Raw data is never assumed to be unique.**

---

### Rule 2

**A source posting is represented by a job occurrence.**

---

### Rule 3

**Multiple occurrences may belong to one canonical job.**

---

### Rule 4

**Only canonical jobs are used for company intelligence.**

This prevents duplicate LinkedIn/Indeed/company-site postings from artificially increasing a company's hiring score.

---

### Rule 5

**Deduplication happens before expensive AI processing.**

---

### Rule 6

**The same source job is not reprocessed if its meaningful content has not changed.**

---

### Rule 7

**New occurrences are compared against relevant historical canonical jobs, not only today's data.**

---

### Rule 8

**Candidate generation must happen before fuzzy duplicate comparison.**

Never compare every new job with every job in the database.

---

### Rule 9

**Company metrics use historical active canonical jobs.**

Not just the latest scheduler run.

---

### Rule 10

**AI scores and deterministic scores must be explainable and versioned.**

---

### Rule 11

**Company-level scoring is separate from job-level scoring.**

---

### Rule 12

**Raw data and historical processing data must be retained so the system can be reprocessed as algorithms improve.**

---

This PRD gives you a consistent foundation to move into the next phase: **database schema/ERD, API design, queue architecture, scoring algorithms, and UI requirements**.
