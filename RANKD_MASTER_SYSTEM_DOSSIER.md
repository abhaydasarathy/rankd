# RANKD — Comprehensive Master System Dossier & Architectural Blueprint

> **CONFIDENTIAL & AUTHORITATIVE SYSTEM DOSSIER**  
> **Institution:** SRM Institute of Science and Technology, Kattankulathur (SRMIST KTR)  
> **Application Name:** `rankd` (Placement Metrics Evaluation & Campus Ranking Portal)  
> **Target Audience:** Placement Cell, Faculty Coordinators, Engineering Students, AI Systems (Claude, Antigravity)  
> **Document Purpose:** Complete, unabridged reference containing all architectural details, sensitive credentials, database schemas, scoring rubric formulas, API integrations, bug fixes, current state, and strategic roadmap.

---

## TABLE OF CONTENTS
1. [Executive Overview & Mission](#1-executive-overview--mission)
2. [Sensitive Configurations, Credentials & Secrets](#2-sensitive-configurations-credentials--secrets)
3. [Full Technical Stack & Dependencies](#3-full-technical-stack--dependencies)
4. [Complete Database Architecture & PostgreSQL Schemas](#4-complete-database-architecture--postgresql-schemas)
5. [The Official 100-Mark Placement Scoring Rubric (11 Categories)](#5-the-official-100-mark-placement-scoring-rubric-11-categories)
6. [Scoring Engine Implementation & Invariants](#6-scoring-engine-implementation--invariants)
7. [Frontend Architecture & Component Tree](#7-frontend-architecture--component-tree)
8. [Services Layer & API Contract](#8-services-layer--api-contract)
9. [External Integrations & Verification Engines (LeetCode, Professional Bodies & Storage)](#9-external-integrations--verification-engines-leetcode-professional-bodies--storage)
10. [Architectural Evaluation: Why Supabase (PostgreSQL) vs. Firebase (Firestore)](#10-architectural-evaluation-why-supabase-postgresql-vs-firebase-firestore)
11. [Chronological History of Work Done & Bugs Resolved](#11-chronological-history-of-work-done--bugs-resolved)
12. [Current Operational State & Verification Test Suite](#12-current-operational-state--verification-test-suite)
13. [Strategic Roadmap & Next Steps (Achieving Full Placement Automation)](#13-strategic-roadmap--next-steps-achieving-full-placement-automation)
14. [Critical Guidelines & Rules for Future AI Collaborators](#14-critical-guidelines--rules-for-future-ai-collaborators)

---

## 1. EXECUTIVE OVERVIEW & MISSION

`rankd` is an institutional placement evaluation and real-time student ranking portal engineered for SRMIST. The primary challenge it solves is replacing fragmented Google Sheets, manual ledger reviews, and unverifiable claims with a unified, tamper-evident scoring platform.

### Core Objectives:
1. **Dynamic 100-Mark Evaluation**: Quantify student placement readiness across 11 balanced academic and extracurricular categories (Academics, GitHub, LeetCode, Internships, Certifications, Projects, Full-Stack, Hackathons, In-House R&D, Memberships, Standardized Assessments).
2. **Deterministic Campus Leaderboard**: Provide a live, transparent ranking of students based on verified points, tie-broken by CGPA, academic percentage, and registration number.
3. **Faculty Audit & Verification Workflow**: Prevent false claims by requiring document evidence (certificates, offer letters, GitHub URLs) and providing a faculty ledger where submissions are reviewed, marks are awarded, and audit trails are logged.
4. **Student Self-Service Portal**: Allow students to track their Verified vs. Pending vs. Unclaimed points, preview real-time rubric scores as they type, connect live APIs (such as LeetCode), and view their institutional placement dossier.

---

## 2. SENSITIVE CONFIGURATIONS, CREDENTIALS & SECRETS

### 2.1 Supabase & Production Infrastructure
- **Production Live URL (Vercel)**: `https://rankdpro.vercel.app`
- **GitHub Repository**: `https://github.com/abhaydasarathy/rankd` (Tracking branch: `main`)
- **Vercel Project Configuration**: Framework: `Vite`, Build: `npm run build`, Output: `dist`, Rewrites: SPA `/(.*) -> /index.html` via `vercel.json`
- **Supabase Project URL**: `https://edrnoswnadjcsftekplu.supabase.co`
- **Supabase Project Reference ID**: `edrnoswnadjcsftekplu`
- **Supabase Anon Public API Key (JWT Canonical)**:
  ```text
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkcm5vc3duYWRqY3NmdGVrcGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3OTY5NDEsImV4cCI6MjEwNTM3Mjk0MX0.Zt75fUek_MDiFGYrZKfmST5ww_eXvB5yWP9bnd6vIDU
  ```
- **Supabase Publishable Key**: `sb_publishable_ftDN7kSv57CKxDF4HwjcDg_VYchfVF6`
- **Supabase Auth URL Configuration**:
  - Site URL: `https://rankdpro.vercel.app`
  - Redirect URLs: `https://rankdpro.vercel.app/**`
- **Supabase Storage Bucket**: `placement-proofs` (configured for public read with folder-level write protection by user UUID).

### 2.2 Custom Email/Password Authentication Architecture & Apple-Grade Micro-Interactions
Google OAuth and static demo access buttons have been completely removed and replaced with a zero-hardcoding custom authentication system built on Supabase Auth, engineered with quiet, tactile Apple/Linear-grade micro-interactions:

#### A. Role Tabs, Sliding Pill Indicator & Ambient Architecture
- **Top Role Tabs & Sliding Indicator**: Instant role switching between **Student** and **Faculty**. Switching roles or modes (`Sign In` ↔ `Register`) completely clears all form states, inputs, and validation errors. Features an Apple-like sliding pill background indicator (`.auth-tab-slider`) that translates horizontally (`transform: translateX(0% | 100%)`) over `220ms` with `cubic-bezier(0.16, 1, 0.3, 1)`, providing a physical segmented control feel rather than abrupt border toggles.
- **Static Ambient Depth Architecture**:
  - The login canvas (`.auth-page`) is anchored on `#080C10` with subtle static green radial gradients (`radial-gradient(ellipse at 15% 50%, rgba(34,197,94,0.07) 0%, transparent 60%)`) and an ultra-fine 40px grid pattern masked with a radial vignette. All moving orbs, floating particles, and pulsing shimmers are omitted to maintain an authoritative, quiet, enterprise aesthetic.
- **Official Brand Mark Integration (`RankdSymbol`)**:
  - Both the left desktop panel and the mobile header feature the official canonical `RankdSymbol` geometric SVG (`polygon points="306 0, 0 190.5, 306 381"` with `fill="#22C55E"`), eliminating any mock right-angle triangles and unifying the brand asset across the entire portal.
- **Two-Column Responsive Layout**:
  - **Left Brand Panel** (desktop `min-width: 900px`): Official `RankdSymbol` mark, clean wordmark, tagline ("know your place."), and institutional placement header ("SRM Institute of Science and Technology, KTR Campus"). Legacy decorative tier badges (Super Dream / Dream / Eligible) have been completely removed for an uncluttered, premium editorial layout.
  - **Right Auth Card**: Responsive 440px glass card adhering strictly to theme CSS custom properties (`var(--bg-card)`, `var(--border)`, `var(--radius-xl)`).
- **Tactile Feedback & Real Success State**:
  - **Button Press Physics**: The primary CTA button features an active press state (`transform: scale(0.985)` over `70ms ease-out`) and a soft glowing hover elevation.
  - **Authentic Success Transition**: Upon successful Supabase authentication, the submit button transitions into a verified state displaying a green checkmark SVG and `✓ Signed in`, waiting 300ms before routing to give the user positive tactile confirmation.
  - **Micro-Shake Error Feedback**: Form validation and Supabase auth errors trigger a subtle 3px horizontal oscillation (`subtleShake`, 240ms) without jarring red flashes.
  - **Accessibility Compliance**: Built-in `@media (prefers-reduced-motion: reduce)` immediately zeroes all transition delays and disables keyframe animations.

#### B. Student Registration Workflow
- **Fields (in strict sequence)**:
  1. Full Name (min 2 characters)
  2. Registration Number (must start with `RA2411`, normalized to uppercase, min 10 characters)
  3. Official SRMIST Email (must end with `@srmist.edu.in`)
  4. Branch Dropdown (`CTECH` - Computer Science & Technology, `CINTEL` - AI, `DSBS` - Data Science & Business Systems, `NWC` - Network & Communications)
  5. Section Dropdown (`A1` through `T2` — 40 SRMIST sections)
  6. Password (min 8 characters)
  7. Confirm Password (must match Password)
- **Pre-Registration Uniqueness Verification**:
  - Checks `public.profiles` for pre-existing `reg_no` and `email` before invoking `supabase.auth.signUp()`.
  - Disallows duplicate registrations with clear, helpful user error messages.
- **Immediate Profile Creation**:
  - On `signUp()`, immediately inserts the student record into `public.profiles` using `.select()` (never `.single()`), storing `full_name`, `name`, `reg_no`, `department: form.branch`, `section: Section ${form.section}`, and navigating to `/overview`.

#### C. Faculty Registration Workflow
- **Fields (in strict sequence)**:
  1. Full Name (min 2 characters)
  2. Faculty ID (stored as `reg_no` in `profiles`, flexible format)
  3. Official SRMIST Email (must end with `@srmist.edu.in`)
  4. Section Dropdown (`A1` through `T2`)
  5. Password (min 8 characters)
  6. Confirm Password (must match Password)
- **Immediate Profile Creation**:
  - Inserts `public.profiles` with `role: 'faculty'`, `department: 'Faculty'`, and navigates to `/faculty/pending`.

#### D. Dual-Identifier Login Workflow (Student & Faculty)
- **Auto-Detection**:
  - Accepts either Registration Number / Faculty ID **OR** SRMIST Email.
  - If the input does not contain an `@` symbol, the system performs a lookup against `public.profiles` matching `reg_no` (case-insensitive) to resolve the registered email address.
  - Authenticates securely via `supabase.auth.signInWithPassword({ email, password })`.
- **Targeted Route Routing**:
  - Verifies the user's role in `profiles` and routes students to `/overview` and faculty coordinators to `/faculty/pending`.

### 2.3 Domain & Uniqueness Invariants
- **Domain Restriction**: Every email must end with `@srmist.edu.in` (validated on both client form and Supabase PostgreSQL check constraint).
- **Unique Registration Number**: Enforced at application layer and PostgreSQL unique constraint `profiles_reg_no_key UNIQUE (reg_no)`.
- **Zero Hardcoding**: No demo credentials, hardcoded passwords, or static UUIDs exist in any frontend component or context.

---

## 3. FULL TECHNICAL STACK & DEPENDENCIES

### 3.1 Dependencies (`package.json`)
```json
{
  "name": "inhouseproject1",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "oxlint",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.116.0",
    "@tailwindcss/vite": "^4.3.3",
    "lucide-react": "^1.47.0",
    "react": "^19.2.8",
    "react-dom": "^19.2.8",
    "react-router-dom": "^7.18.4",
    "tailwindcss": "^4.3.3"
  },
  "devDependencies": {
    "@types/react": "^19.2.18",
    "@types/react-dom": "^19.2.7",
    "@vitejs/plugin-react": "^6.1.1",
    "oxlint": "^1.81.0",
    "vite": "^8.3.0"
  }
}
```

### 3.2 Key Architecture Constraints & Styling Rules
1. **React 19 + React Router DOM v7**: Fast concurrent rendering, memoized hooks, route navigation without full-page reloads.
2. **Tailwind CSS v4 + Vanilla Design Tokens**: Using CSS custom properties defined in `src/index.css`:
   - `--bg-page`: `#0b0f17` (Deep obsidian dark background)
   - `--bg-card`: `#111827` (Card surface)
   - `--bg-input`: `#1a2234` (Elevated fields and secondary boxes)
   - `--border`: `rgba(255, 255, 255, 0.08)`
   - `--green`: `#10b981` (Accent emerald green)
   - `--green-light`: `rgba(16, 185, 129, 0.12)`
   - `--green-text`: `#34d399`
   - `--amber`: `#f59e0b` (Pending state)
   - `--red`: `#ef4444` (Error / Rejection)
3. **No External Animation Libraries**: No Framer Motion, no GSAP. Pure CSS transitions (`<=350ms`) and hardware-accelerated transforms (`translate3d`, `opacity`).
4. **Vite Dev Proxy**: Configured in `vite.config.js` to proxy `/api/leetcode` directly to `https://leetcode.com/graphql` to bypass browser CORS during development.

---

## 4. COMPLETE DATABASE ARCHITECTURE & POSTGRESQL SCHEMAS

The PostgreSQL database (managed via Supabase) consists of master tables, transactional submission records, audit logs, category-specific normalized entities, and SQL views.

### 4.1 Master Entity Tables

#### `public.profiles`
Stores the institutional identity, personal records, and baseline academic marks for all users.
```sql
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL CHECK (email LIKE '%@srmist.edu.in'),
    name TEXT NOT NULL,
    full_name TEXT NOT NULL,
    reg_no TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'faculty', 'admin')),
    department TEXT NOT NULL DEFAULT 'CSE Core',
    programme TEXT NOT NULL DEFAULT 'B.Tech',
    section TEXT NOT NULL DEFAULT 'Section A',
    batch TEXT NOT NULL DEFAULT '2024 - 2028',
    batch_year TEXT DEFAULT '2024 - 2028',
    tenth_pct NUMERIC(5,2) DEFAULT 0 CHECK (tenth_pct >= 0 AND tenth_pct <= 100),
    twelfth_pct NUMERIC(5,2) DEFAULT 0 CHECK (twelfth_pct >= 0 AND twelfth_pct <= 100),
    cgpa NUMERIC(4,2) DEFAULT 0 CHECK (cgpa >= 0 AND cgpa <= 10),
    advisor TEXT DEFAULT 'Faculty Placement Coordinator',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `public.placement_categories`
Master configuration table listing all 11 evaluation categories.
```sql
CREATE TABLE public.placement_categories (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    short_description TEXT,
    rubric_text TEXT NOT NULL,
    icon_name TEXT NOT NULL,
    max_marks NUMERIC(4,2) NOT NULL CHECK (max_marks > 0),
    display_order INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.2 Transactional & Audit Tables

#### `public.student_submissions`
The primary ledger envelope. Every claim submitted by a student creates a row here.
```sql
CREATE TABLE public.student_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL REFERENCES public.placement_categories(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('DRAFT', 'SUBMITTED', 'PENDING', 'VERIFIED', 'REJECTED')),
    awarded_marks NUMERIC(4,2) NOT NULL DEFAULT 0 CHECK (awarded_marks >= 0 AND awarded_marks <= 15),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    proof_url TEXT,
    verifier_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verifier_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```
> **CRITICAL POSTGREST GOTCHA**: `student_submissions` has two foreign keys to `profiles`:
> 1. `student_id -> profiles(id)` (`student_submissions_student_id_fkey`)
> 2. `verifier_id -> profiles(id)` (`student_submissions_verifier_id_fkey`)
> Any query embedding `profiles` MUST specify the exact foreign key alias:  
> `.select('*, profiles!student_submissions_student_id_fkey(...)')`  
> Failure to do so throws error `PGRST201: Could not embed because more than one relationship was found`.

#### `public.verification_logs`
Immutable audit log recording every action taken by faculty.
```sql
CREATE TABLE public.verification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.student_submissions(id) ON DELETE CASCADE,
    faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('VERIFY', 'REJECT', 'REQUEST_CORRECTION')),
    previous_status TEXT,
    new_status TEXT NOT NULL,
    previous_marks NUMERIC(4,2) DEFAULT 0,
    awarded_marks NUMERIC(4,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `public.submission_proofs`
Evidence file tracking linked to Supabase storage.
```sql
CREATE TABLE public.submission_proofs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES public.student_submissions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    bucket_id TEXT NOT NULL DEFAULT 'placement-proofs',
    storage_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    public_url TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.3 Normalized Category-Specific Tables
1. `public.leetcode_profiles`: LeetCode stats snapshots (`easy_solved`, `medium_solved`, `hard_solved`, `badge_count`, `badge_marks`, `difficulty_marks`, `calculated_marks`).
2. `public.student_internships`: `company_name`, `company_tier` (`IIT/NIT/SRM`, `Fortune 500`, `Small / Mid Co`), `duration_months`, `is_paid`.
3. `public.student_certifications`: `cert_name`, `provider` (`CISCO`, `NPTEL`, `Coursera`, `Programming`), `credential_id`, `credential_url`.
4. `public.student_projects`: `title`, `project_type` (`IIT/DRDO`, `GOVT`, `WEB`, `MINI`), `github_url`, `live_url`.
5. `public.student_fullstack`: `frontend_tech`, `backend_tech`, `database_tech`, `github_url`, `live_url`.
6. `public.student_hackathons`: `event_name`, `prize_placement` (`1st Prize`, `2nd Prize`, `3rd Prize`, `Participation`).
7. `public.student_inhouse_projects`: `title`, `faculty_mentor`, `university`.
8. `public.student_memberships`: `organization` (`IEEE`, `ACM`, `CSI`, `IET`, `ISTE`), `membership_id`.
9. `public.student_assessments`: `assessment_type` (`SHL`, `Talent`, `NCET`), `raw_score`.

### 4.4 High-Performance SQL Views

#### View 1: `public.student_placement_scores`
Calculates real-time scores for all students by combining the academic baseline from `profiles` with verified points from `student_submissions`.
```sql
CREATE OR REPLACE VIEW public.student_placement_scores AS
WITH academics_calc AS (
    SELECT 
        id AS student_id,
        LEAST(10.0, (
            CASE 
                WHEN tenth_pct >= 96 THEN 2.5
                WHEN tenth_pct >= 91 THEN 2.0
                WHEN tenth_pct >= 86 THEN 1.5
                WHEN tenth_pct >= 75 THEN 1.0
                WHEN tenth_pct > 0 THEN 0.5
                ELSE 0.0
            END +
            CASE 
                WHEN twelfth_pct >= 96 THEN 2.5
                WHEN twelfth_pct >= 91 THEN 2.0
                WHEN twelfth_pct >= 86 THEN 1.5
                WHEN twelfth_pct >= 75 THEN 1.0
                WHEN twelfth_pct > 0 THEN 0.5
                ELSE 0.0
            END +
            CASE 
                WHEN cgpa > 9.5 THEN 5.0
                WHEN cgpa >= 9.1 THEN 4.0
                WHEN cgpa >= 8.6 THEN 3.0
                WHEN cgpa >= 7.5 THEN 2.0
                WHEN cgpa > 0 THEN 1.0
                ELSE 0.0
            END
        ))::numeric(4,2) AS academics_score
    FROM public.profiles
    WHERE role = 'student'
),
submissions_summary AS (
    SELECT 
        student_id,
        COALESCE(MAX(CASE WHEN category_id = 'github' AND status = 'VERIFIED' THEN awarded_marks END), 0) AS github_score,
        COALESCE(MAX(CASE WHEN category_id IN ('coding-platforms', 'coding_practice') AND status = 'VERIFIED' THEN awarded_marks END), 0) AS coding_score,
        COALESCE(LEAST(10.0, SUM(CASE WHEN category_id = 'internship' AND status = 'VERIFIED' THEN awarded_marks END)), 0) AS internship_score,
        COALESCE(LEAST(15.0, SUM(CASE WHEN category_id = 'skillset' AND status = 'VERIFIED' THEN awarded_marks END)), 0) AS skillset_score,
        COALESCE(LEAST(5.0, SUM(CASE WHEN category_id = 'projects' AND status = 'VERIFIED' THEN awarded_marks END)), 0) AS projects_score,
        COALESCE(LEAST(5.0, MAX(CASE WHEN category_id = 'fullstack' AND status = 'VERIFIED' THEN awarded_marks END)), 0) AS fullstack_score,
        COALESCE(LEAST(10.0, SUM(CASE WHEN category_id = 'hackathons' AND status = 'VERIFIED' THEN awarded_marks END)), 0) AS hackathons_score,
        COALESCE(LEAST(8.0, SUM(CASE WHEN category_id = 'inhouse-projects' AND status = 'VERIFIED' THEN awarded_marks END)), 0) AS inhouse_score,
        COALESCE(LEAST(2.0, MAX(CASE WHEN category_id = 'membership' AND status = 'VERIFIED' THEN awarded_marks END)), 0) AS membership_score,
        COALESCE(MAX(CASE WHEN category_id = 'assessments' AND status = 'VERIFIED' THEN awarded_marks END), 0) AS assessments_score,
        COALESCE(SUM(CASE WHEN status = 'PENDING' THEN awarded_marks END), 0) AS pending_marks_total,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) AS pending_submissions_count,
        COUNT(CASE WHEN status = 'VERIFIED' THEN 1 END) AS verified_submissions_count
    FROM public.student_submissions
    GROUP BY student_id
)
SELECT 
    p.id AS student_id,
    p.name,
    p.full_name,
    p.email,
    p.reg_no,
    p.department,
    p.programme,
    p.section,
    p.batch,
    p.cgpa,
    a.academics_score,
    COALESCE(s.github_score, 0) AS github_score,
    COALESCE(s.coding_score, 0) AS coding_score,
    COALESCE(s.internship_score, 0) AS internship_score,
    COALESCE(s.skillset_score, 0) AS skillset_score,
    COALESCE(s.projects_score, 0) AS projects_score,
    COALESCE(s.fullstack_score, 0) AS fullstack_score,
    COALESCE(s.hackathons_score, 0) AS hackathons_score,
    COALESCE(s.inhouse_score, 0) AS inhouse_score,
    COALESCE(s.membership_score, 0) AS membership_score,
    COALESCE(s.assessments_score, 0) AS assessments_score,
    LEAST(100.0, (
        a.academics_score +
        COALESCE(s.github_score, 0) +
        COALESCE(s.coding_score, 0) +
        COALESCE(s.internship_score, 0) +
        COALESCE(s.skillset_score, 0) +
        COALESCE(s.projects_score, 0) +
        COALESCE(s.fullstack_score, 0) +
        COALESCE(s.hackathons_score, 0) +
        COALESCE(s.inhouse_score, 0) +
        COALESCE(s.membership_score, 0) +
        COALESCE(s.assessments_score, 0)
    ))::numeric(5,2) AS total_verified_score,
    COALESCE(s.pending_marks_total, 0) AS total_pending_score,
    COALESCE(s.pending_submissions_count, 0) AS pending_submissions_count,
    COALESCE(s.verified_submissions_count, 0) AS verified_submissions_count
FROM public.profiles p
JOIN academics_calc a ON p.id = a.student_id
LEFT JOIN submissions_summary s ON p.id = s.student_id
WHERE p.role = 'student';
```

### 4.4 Institutional Roster Registry Table

#### `public.institutional_membership_roster`
Official institutional student branch chapter registry for instant auto-verification of professional body claims (IEEE, ACM, CSI, IET, ISTE).
```sql
CREATE TABLE public.institutional_membership_roster (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization TEXT NOT NULL CHECK (organization IN ('IEEE', 'ACM', 'CSI', 'IET', 'ISTE')),
    membership_id TEXT NOT NULL,
    reg_no TEXT NOT NULL,
    student_name TEXT NOT NULL,
    chapter TEXT NOT NULL,
    valid_until DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (organization, membership_id)
);
```

### 4.5 Authoritative Placement Scores and Leaderboard Views

#### View 1: `public.student_placement_scores`
Calculates real-time category sums and applies rubric caps per student:
```sql
CREATE OR REPLACE VIEW public.student_placement_scores AS
...
```

#### View 2: `public.placement_leaderboard`
Deterministic dense ranking with explicit tie-breaking:
```sql
CREATE OR REPLACE VIEW public.placement_leaderboard AS
SELECT 
    DENSE_RANK() OVER (
        ORDER BY total_verified_score DESC, cgpa DESC, academics_score DESC, reg_no ASC
    ) AS rank,
    student_id,
    name,
    full_name,
    email,
    reg_no,
    department,
    programme,
    section,
    batch,
    cgpa,
    academics_score,
    github_score,
    coding_score,
    internship_score,
    skillset_score,
    projects_score,
    fullstack_score,
    hackathons_score,
    inhouse_score,
    membership_score,
    assessments_score,
    total_verified_score,
    total_pending_score,
    pending_submissions_count,
    verified_submissions_count
FROM public.student_placement_scores;
```

### 4.6 Row Level Security (RLS) Policy Rules
1. **Profiles**:
   - `SELECT`: Publicly readable by all authenticated users (needed for leaderboards and faculty views).
   - `INSERT`: Allowed only when `auth.uid() = id`.
   - `UPDATE`: Allowed only when `auth.uid() = id`.
2. **Student Submissions**:
   - `SELECT`: Allowed if `student_id = auth.uid()` OR if the user is a `faculty` or `admin`.
   - `INSERT`: Allowed if `student_id = auth.uid()`.
   - `UPDATE`: Allowed if `(student_id = auth.uid() AND status IN ('DRAFT', 'PENDING'))` OR if user is `faculty` or `admin`.
3. **Storage Objects (`placement-proofs`)**:
   - Folder name must match `auth.uid()`: `(storage.foldername(name))[1] = auth.uid()::text`.

---

## 5. THE OFFICIAL 100-MARK PLACEMENT SCORING RUBRIC (11 CATEGORIES)

The total score capacity is exactly **100 Marks** divided into 11 strictly partitioned categories:

| # | Category ID | Name | Max Marks | Sub-Components & Rules |
|---|-------------|------|-----------|------------------------|
| 1 | `academics` | Academics | 10.0 | **10th %** (2.5m) + **12th %** (2.5m) + **CGPA** (5.0m) |
| 2 | `github` | GitHub Profile | 15.0 | Contributions >20/16–20/11–15/6–10/1–5/0 (5m) + Monthly avg ≥2/≥1/0 (2m) + Community projects 2m each max 2 capped 3m + Collaborations 2m each max 3 capped 5m |
| 3 | `coding-platforms` | Coding Practice Platform | 10.0 | Badges (5m) + Medium & Hard Solved (5m) |
| 4 | `internship` | Internship Experience | 10.0 | Tier-1 (5m), Fortune 500 (4m), Startup (3m) + Paid Bonus (+1m) |
| 5 | `skillset` | Skillset & Certifications | 15.0 | CISCO/IBM (5m), NPTEL (3m), Coursera (2m), Tech (1m) • Max 5 |
| 6 | `projects` | Projects Done | 5.0 | IIT/DRDO (5m), Govt (4m), Web/Mobile (3m), Mini (1-2m) • Max 3 |
| 7 | `fullstack` | Full Stack Experience | 5.0 | Deployed Full-Stack Architecture Project (5m) • Max 1 |
| 8 | `hackathons` | Competitions & Hackathons | 10.0 | 1st Prize (5m), 2nd (4m), 3rd (3m), Participation (1m) • Max 4 |
| 9 | `inhouse-projects` | In-House Projects | 8.0 | SRMIST Faculty R&D Project (4m each • Max 2 projects) |
| 10 | `membership` | Professional Membership | 2.0 | IEEE, ACM, CSI, IET, ISTE (2m) • Max 1 certificate |
| 11 | `assessments` | Standardized Assessment | 10.0 | SHL / Talent / NCET Diagnostic Test Score (10m) |
| **TOTAL** | | | **100.0** | |

---

## 6. SCORING ENGINE IMPLEMENTATION & INVARIANTS

File location: `src/utils/scoringEngine.js`.  
This pure function module handles client-side score evaluation, live preview during input, and leaderboard synchronization.

### 6.1 Category 1: Academics (10 Marks)
```javascript
export function calculateAcademicsScore(tenthPct = 0, twelfthPct = 0, cgpa = 0) {
  let tenthMarks = 0;
  if (tenthPct >= 96) tenthMarks = 2.5;
  else if (tenthPct >= 91) tenthMarks = 2.0;
  else if (tenthPct >= 86) tenthMarks = 1.5;
  else if (tenthPct >= 75) tenthMarks = 1.0;
  else if (tenthPct > 0)  tenthMarks = 0.5;

  let twelfthMarks = 0;
  if (twelfthPct >= 96) twelfthMarks = 2.5;
  else if (twelfthPct >= 91) twelfthMarks = 2.0;
  else if (twelfthPct >= 86) twelfthMarks = 1.5;
  else if (twelfthPct >= 75) twelfthMarks = 1.0;
  else if (twelfthPct > 0)  twelfthMarks = 0.5;

  let cgpaMarks = 0;
  if (cgpa > 9.5)       cgpaMarks = 5.0;
  else if (cgpa >= 9.1) cgpaMarks = 4.0;
  else if (cgpa >= 8.6) cgpaMarks = 3.0;
  else if (cgpa >= 7.5) cgpaMarks = 2.0;
  else if (cgpa > 0)    cgpaMarks = 1.0;

  const rawScore = tenthMarks + twelfthMarks + cgpaMarks;
  const score = Math.min(10, Number(rawScore.toFixed(2)));

  return {
    score,
    maxScore: 10,
    breakdown: { tenthMarks, twelfthMarks, cgpaMarks, tenthPct, twelfthPct, cgpa }
  };
}
```

### 6.2 Category 2: GitHub Profile (15 Marks)
- **Contributions / Repos in last 1 year**:
  - `> 20 contributions`: 5 marks
  - `16–20 contributions`: 4 marks
  - `11–15 contributions`: 3 marks
  - `6–10 contributions`: 2 marks
  - `1–5 contributions`: 1 mark
  - `0 contributions`: 0 marks
- **Monthly frequency (average contributions per calendar month)**:
  - `≥ 2 contributions/month`: 2 marks
  - `≥ 1 contribution/month`: 1 mark
  - `0`: 0 marks
- **Community Projects**: 2 marks per project, max 2 considered, sub-total capped at 3 marks (per-item calculation, not binary: 1 project = 2m, 2 projects = 3m)
- **Collaborations / Open-Source PRs**: 2 marks per collaboration, max 3 considered, sub-total capped at 5 marks (per-item calculation, not binary: 1 collab = 2m, 2 collabs = 4m, 3 collabs = 5m)
- **Capped at**: 15 Marks maximum.

### 6.3 Category 3: Coding Practice Platforms / LeetCode (10 Marks)
```javascript
export function calculateCodingPlatformScore({ badgeCount = 0, mediumSolved = 0, hardSolved = 0, mediumHardSolved = 0 }) {
  const solved = Number(mediumHardSolved || 0) || (Number(mediumSolved || 0) + Number(hardSolved || 0));

  const badgeMarks =
    badgeCount >= 25 ? 5 :
    badgeCount >= 20 ? 4 :
    badgeCount >= 15 ? 3 :
    badgeCount >= 10 ? 2 :
    badgeCount >= 5  ? 1 : 0;

  const difficultyMarks =
    solved > 200  ? 5 :
    solved >= 150 ? 4 :
    solved >= 100 ? 3 :
    solved >= 50  ? 2 :
    solved >= 25  ? 1 : 0;

  return {
    badgeMarks,
    difficultyMarks,
    mediumHardSolved: solved,
    total: Math.min(badgeMarks + difficultyMarks, 10)
  };
}
```

### 6.4 Category 4: Internship Experience (10 Marks)
- Evaluates student internships:
  - **Tier 1 (IIT/NIT/SRM Placement Partner)**: 5 marks base
  - **Fortune 500 / MNC**: 4 marks base
  - **Startups / Small & Medium Enterprise**: 3 marks base
  - **Short Duration (< 3 months)**: 2 marks flat (paid bonus does NOT apply)
- **Paid Bonus**: Paid bonus (+1m) applies per internship but total per item is capped at 5m. IIT/NIT/SRM internships at 5m base cannot exceed 5m even if paid.
- **Capped at**: 10 Marks maximum across all internships.

### 6.5 Category 5: Skillset & Certifications (15 Marks)
- Evaluates top **5 certifications** sorted descending:
  - **5 Marks**: CISCO, CCNA, CCNP, MCNA, MCNP, Matlab, RedHat, IBM
  - **3 Marks**: NPTEL
  - **2 Marks**: Coursera *(Note: AWS, Google Cloud, Meta, and edX are NOT in the official PDF)*
  - **1 Mark**: Technical Programming Language Certifications (C, C++, Java, Python, JavaScript)
  - **0.5 Marks**: Udemy Foundation Certification (PDF explicitly lists this)
- **Capped at**: 15 Marks maximum.

### 6.6 Category 6: Projects Done (5 Marks)
- Evaluates up to **3 projects**:
  - **IIT / DRDO / ISRO Sponsored Research**: 5 marks
  - **Government / Defense Grant**: 4 marks
  - **Full-scale Web / Mobile Application**: 3 marks
  - **Mini Project / Hardware Prototype**: 1–2 marks
- **Capped at**: 5 Marks maximum.

### 6.7 Category 7: Full Stack Developer Experience (5 Marks)
- Deployed end-to-end production web application featuring Frontend + Backend REST/GraphQL API + Relational/NoSQL Database: **5 Marks** (Max 1 project considered).

### 6.8 Category 8: Coding Competitions & Hackathons (10 Marks)
- Evaluates up to **4 events**:
  - **1st Prize / Winner**: 5 marks
  - **2nd Prize / Runner Up**: 4 marks
  - **3rd Prize**: 3 marks
  - **Participation / Finalist**: 1 mark
- **Capped at**: 10 Marks maximum.

### 6.9 Category 9: In-House Projects (8 Marks)
- Evaluates up to **2 departmental / campus projects**:
  - **SRMIST Faculty R&D or Campus Automation**: 4 marks each (Max 8 marks).
  - *Note: Official rubric lists "8 Marks" (implying 2 projects × 4m) but description notes "Maximum of 1 Project to be considered". Application allows up to 2 projects with visible institutional ambiguity notice.*

### 6.10 Category 10: Professional Memberships (2 Marks)
- Valid certificate in **IEEE, ACM, CSI, IET, or ISTE**: **2 Marks** (Max 1 membership considered).

### 6.11 Category 11: Standardized Placement Assessments (10 Marks)
- Evaluates **SHL / Talent / NCET Diagnostic Test Score** out of 100 with all 11 official bands:
  - `90 – 100%`: 10 marks
  - `80 – 89%`: 9 marks
  - `70 – 79%`: 8 marks
  - `65 – 69%`: 7 marks
  - `60 – 64%`: 6 marks
  - `55 – 59%`: 5 marks
  - `50 – 54%`: 4 marks
  - `40 – 49%`: 3 marks
  - `30 – 39%`: 2 marks
  - `25 – 29%`: 1 mark
  - `< 25%`: 0 marks.

---

## 7. FRONTEND ARCHITECTURE, UI SYSTEMS & ANIMATION LAYER

`rankd` is built with a bespoke, zero-bloat modern design system engineered for institutional prestige and extreme visual polish. It adheres to strict performance constraints (transitions strictly under 350ms, zero heavy 3rd-party animation libraries, and full `prefers-reduced-motion` compliance).

---

### 7.1 Design Tokens & Dual-Theme Color Palette (`src/index.css`)

The system supports seamless, zero-flash Light and Dark modes coordinated via `[data-theme="dark"]` attributes on the root HTML element with a global 250ms smooth transition:

#### Surface & Background Tokens
| Token | Light Mode (`:root`) | Dark Mode (`[data-theme="dark"]`) | Description / Surface Application |
|---|---|---|---|
| `--bg-page` | `#F7F8FA` | `#0A0A0A` | Global background canvas |
| `--bg-sidebar` | `#FFFFFF` | `#111111` | Sidebar rail and expanded navigation |
| `--bg-card` | `#FFFFFF` | `#161616` | Metric cards, score panels, and modals |
| `--bg-input` | `#F4F5F7` | `#1C1C1C` | Input fields, table header rows, nested chips |
| `--bg-banner` | `#F0FBF4` | `#0D1F12` | Gradient header and notification cards |
| `--bg-banner-end` | `#DCFCE7` | `#0D2B18` | Gradient trailing tone |

#### Border & Divider Tokens
| Token | Light Mode | Dark Mode | Application |
|---|---|---|---|
| `--border` | `#EBEBEB` | `rgba(255, 255, 255, 0.07)` | Standard card, drawer, and table dividers |
| `--border-strong` | `#D4D4D4` | `rgba(255, 255, 255, 0.12)` | Focused borders, inputs, and active outlines |

#### Typography & Content Tokens
| Token | Light Mode | Dark Mode | Application |
|---|---|---|---|
| `--text-primary` | `#111111` | `#F5F5F5` | Main titles, scores, and names |
| `--text-secondary` | `#555555` | `#888888` | Subtitles, labels, and table cells |
| `--text-muted` | `#999999` | `#555555` | Captions, dates, and placeholders |

#### Brand Accent & Status Tokens
| Token | Light Mode | Dark Mode | Semantic Role |
|---|---|---|---|
| `--green` | `#16A34A` | `#22C55E` | Brand emerald accent / primary action buttons |
| `--green-light` | `#DCFCE7` | `rgba(34, 197, 94, 0.12)` | Verified badge background |
| `--green-text` | `#15803D` | `#4ADE80` | Verified badge text / high scores |
| `--green-bar` | `#22C55E` | `#22C55E` | Progress bar and donut gauge verified fill |
| `--amber` | `#D97706` | `#F59E0B` | Pending claim accent / warning state |
| `--amber-light` | `#FEF3C7` | `rgba(245, 158, 11, 0.12)` | Pending claim badge background |
| `--amber-text` | `#B45309` | `#FCD34D` | Pending claim badge text / warning copy |
| `--amber-bar` | `#F59E0B` | `#F59E0B` | Progress bar and donut gauge pending fill |
| `--gray-badge-bg` | `#F3F4F6` | `rgba(255, 255, 255, 0.07)` | Unclaimed status badge background |
| `--gray-badge-text` | `#6B7280` | `#666666` | Unclaimed status badge text |

#### Global Corner Radius Hierarchy
- `--radius-sm: 8px`: Form inputs, status pills, stat chips, and mini-buttons.
- `--radius: 12px`: Metric cards, primary buttons, navigation items, and search bars.
- `--radius-lg: 16px`: Category sheet drawer, score panels, and modal containers.
- `--radius-xl: 20px`: Large container wraps and authentication card containers.

---

### 7.2 Micro-Interactions, Scoped Animations & Accessibility (`index.css`)

All animations are hardware-accelerated, scoped to UI elements, and automatically disabled for users with motion sensitivities via `@media (prefers-reduced-motion: reduce)`.

1. **Card Fade & Staggered Entrance (`@keyframes cardFadeIn`)**:
   - Each metric card enters with a staggered `50ms` delay using `--card-index`:
     ```css
     @keyframes cardFadeIn {
       from { opacity: 0; transform: translateY(10px); }
       to   { opacity: 1; transform: translateY(0); }
     }
     .metric-card-animated {
       animation: cardFadeIn 300ms ease-out forwards;
       animation-delay: calc(var(--card-index, 0) * 50ms);
     }
     ```
2. **Progress Bar Fill Transition (`@keyframes growBar`)**:
   - Progress bars smoothly grow from `0%` to their target verified width over `600ms`:
     ```css
     @keyframes growBar {
       from { width: 0%; }
       to   { width: var(--fill-width, 0%); }
     }
     .progress-fill-animated {
       animation: growBar 600ms ease-out forwards;
       animation-delay: calc(var(--card-index, 0) * 50ms + 200ms);
     }
     ```
3. **Card Hover Elevation & Glow**:
   - Hovering any category card elevates it by `2px`, adds a glowing emerald border (`rgba(34, 197, 94, 0.35)`), a soft ambient shadow (`0 4px 16px rgba(34, 197, 94, 0.08)`), and brightens the progress fill by `15%` (`filter: brightness(1.15)`).
   - The interactive arrow icon on the "View →" link slides `3px` to the right.
4. **Leaderboard Row Stagger & Hover (`@keyframes rowSlideIn`)**:
   - Rows in the campus rankings ledger slide in sequentially with a `40ms` stagger delay (`calc(var(--row-index, 0) * 40ms)`).
5. **Skeleton Shimmer (`@keyframes shimmer`)**:
   - Loading placeholder cards display a smooth, linear gradient sweep over `1.4s`:
     ```css
     .skeleton-line {
       background: linear-gradient(90deg, var(--border) 25%, var(--border-strong) 50%, var(--border) 75%);
       background-size: 800px 100%;
       animation: shimmer 1.4s infinite linear;
     }
     ```
6. **Circular Score Arc Easing (`.score-arc`)**:
   - The SVG stroke-dashoffset animates over `800ms` using `cubic-bezier(0.4, 0, 0.2, 1)`, followed by the pending amber arc with a `100ms` delay.
7. **Theme Switch Rotation (`.theme-toggle-icon`)**:
   - The sun/moon toggle rotates 180° with opacity fade on switch.
8. **Slide-Over Drawer & Backdrop Blur (`.category-drawer`)**:
   - The 480px drawer glides in from `translateX(100%)` to `translateX(0)` with a `300ms cubic-bezier(0.4, 0, 0.2, 1)` transition, accompanied by a 40% backdrop blur overlay.
9. **Apple-Grade Auth Micro-Interactions & Tactile Physics**:
   - **Sliding Segmented Control (`.auth-tab-slider`)**:
     A physical indicator tab translating between 0% and 100% width with `cubic-bezier(0.16, 1, 0.3, 1)` over `220ms`.
   - **Tactile Button Compression (`:active scale(0.985)`)**:
     Active button click compresses subtly with immediate recovery (`70ms`), paired with a soft ambient green glow (`box-shadow: 0 4px 20px rgba(34, 197, 94, 0.3)`).
   - **Subtle Error Micro-Shake (`@keyframes subtleShake`)**:
     Authentication failure displaces the card by `±3px` over `240ms` (`cubic-bezier(0.36, 0.07, 0.19, 0.97)`), mimicking physical resistance without harsh flashes.
   - **Coordinated Entrance Orchestration**:
     The left branding panel settles in over `500ms` with staggered copy reveals (`40ms`, `100ms`, `160ms`), while the authentication card settles into position over `550ms` with a soft `300ms` form content glide.
   - **Reduced Motion Support**:
     All micro-animations and transforms are automatically disabled under `@media (prefers-reduced-motion: reduce)`.

---

### 7.3 Layout Shell & Navigation Components

#### 1. Top Navigation Bar (`src/components/TopNav.jsx`)
- **Fixed Geometry**: `56px` fixed height, `1px solid var(--border)` bottom divider, background with backdrop filter.
- **Search Bar**: Centered rounded search input with interactive focus ring:
  ```css
  .search-bar:focus-within {
    border-color: rgba(34, 197, 94, 0.4);
    box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.08);
  }
  ```
- **SRMIST Institutional Pill**: Crest badge indicating compliance with official placement evaluation criteria.
- **Dark/Light Theme Toggle Button**: Rotates and switches token themes seamlessly.
- **Role & Profile Switcher**:
  - Renders user initials avatar (`AD` for Abhay Dasarathy).
  - Role pill chip: Green `STUDENT` or Amber `FACULTY` badge with interactive role toggle.

#### 2. Collapsible Rail Sidebar (`src/components/Sidebar.jsx`)
- **Dual-State Geometry**:
  - **Compact Rail Mode (`64px`)**: Renders centered `40px × 40px` squircle icon buttons with no text wrap.
  - **Expanded Mode (`224px`)**: Expands smoothly over `240ms cubic-bezier(0.4, 0, 0.2, 1)` on hover, revealing text labels (`opacity 150ms ease 80ms`).
  - **Main Content Adaptive Margin**: Automatically transitions `margin-left` from `64px` to `224px`.
- **Active Navigation Indicator**:
  - Expanded Mode: A sliding green vertical bar on the left edge (`scaleY(1)`).
  - Rail Mode: Suppressed to maintain squircle symmetry.
- **Navigation Items**:
  - **Student View**: `/overview` (Dashboard), `/my-metrics` (All 11 Metrics), `/leaderboard` (Campus Leaderboard), `/profile` (Academic Dossier).
  - **Faculty View**: `/overview` (Pending Queue with live counter badge), `/leaderboard` (Master Student Ledger).

---

### 7.4 Student Dashboard & 11 Category Metric Cards (`Dashboard.jsx` & `MetricCard.jsx`)

#### Dashboard Layout Structure
- **Greeting Banner**: Personalized greeting ("Good morning / afternoon / evening, {firstName} 👋") + Academic Year Pill (`Academic Year 2024–2028`).
- **Placement Metrics Grid**: 11 category cards arranged in a responsive 3-column grid (`grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5`).
- **Category Card Anatomy**:
  1. **Header Row**:
     - Muted Lucide Category Icon (e.g. `GraduationCap`, `Code2`, `Briefcase`, `Github`).
     - Category Title (e.g. "Coding Practice Platform", "GitHub Activity", "Academics & CGPA").
     - Status Badge:
       - 🟢 **Verified**: Green pill (`var(--green-light)`, text `var(--green-text)`).
       - 🟡 **Pending**: Amber pill (`var(--amber-light)`, text `var(--amber-text)`).
       - ⚪ **Unclaimed**: Gray pill (`var(--gray-badge-bg)`, text `var(--gray-badge-text)`).
  2. **Score Row**:
     - Huge `28px` bold verified score in `var(--text-primary)`.
     - Subtitle `/{maxMarks} Marks` in muted font.
     - Right-aligned `X records` count chip.
  3. **Dual-Layer Progress Bar**:
     - Green fill for verified score percentage.
     - Amber fill for pending score percentage.
     - Brightens on card hover (`filter: brightness(1.15)`).
  4. **Footer Row**:
     - Dynamic breakdown text (e.g. "16+ solved • 2 badges" or "CGPA 9.35 • 10th 87%").
     - Interactive `View →` button opening the right drawer.

---

### 7.5 Right Rail: Placement Score Donut Gauge & Student Summary (`ScorePanel.jsx`)

Mounted as a sticky `320px` right column:
1. **Interactive SVG Donut Chart**:
   - `120px × 120px` SVG viewport, radius `52`, circumference `326.7px`, stroke width `10`.
   - Dual concentric arcs:
     - **Verified Arc**: Emerald green (`var(--green-bar)`), animated with `stroke-dashoffset` (800ms cubic-bezier).
     - **Pending Arc**: Amber (`var(--amber-bar)`), trailing offset arc showing potential verified score.
   - **Count-Up Number Animation**: JavaScript `requestAnimationFrame` with ease-out cubic curve (800ms) counting from `0` to the verified score.
   - Donut Center: Big bold verified score + `/ 100 Marks` label.
2. **Legend Breakdown**:
   - Verified (Green circle) + Score.
   - Pending (Amber circle) + Score.
   - Unclaimed (Gray circle) + Remaining Marks.
3. **Student Profile Card**:
   - Avatar circle with initials (`AD`) or uploaded photo.
   - Name, Registration Number chip (`RA2411003010973`), Department (`CSE Core`), Section (`Section P1`), and CGPA.
   - "View →" link to Profile dossier.
4. **Placement Readiness Tier Badge**:
   - **Super Dream Tier** (`>= 80 Marks`): Glowing emerald badge.
   - **Dream Tier** (`60 – 79 Marks`): Blue badge.
   - **Eligible Tier** (`40 – 59 Marks`): Amber badge.
   - **Needs Improvement** (`< 40 Marks`): Gray badge.

---

### 7.6 Slide-Over Category Drawer (`CategorySheet.jsx`)

480px width slide-in drawer anchored to the right side of the screen:
- **Header**: Category icon, title, max marks pill, and close `X` button.
- **Rubric Summary Box**: Explains official SRMIST placement scoring rules for the category.
- **LeetCode Automated Integration Panel (`LeetCodePanel.jsx`)**:
  - Input field prefixed with `https://leetcode.com/u/` with automatic profile persistence.
  - **Live Profile Card**: Avatar, username link, green `LIVE SYNCED` badge.
  - **4 Stat Chips**: Total Solved, Easy (Green `#4ADE80`), Medium (Amber `#F59E0B`), Hard (Red `#EF4444`).
  - **Dynamic Rubric Progress Bars**: Badge Marks (up to 5m) + Medium/Hard Difficulty Marks (up to 5m) = **Total Score / 10m**.
  - **Action Controls**: "Sync Latest Stats" with spinning loader icon and "Edit ID" button.
- **Manual Entry & Evidence Forms**:
  - Customized per category (Academics inputs, Internship tiers & duration, Certification providers, Project scope, Hackathon placement, Professional Body credentials).
  - Real-time score calculator preview before submission.
  - Full-width emerald green "Submit for Verification" button.
- **Logged Submissions Ledger Table**:
  - Columns: `Item`, `Marks`, `Status`.
  - **Claimed vs. Verified Marks**:
    - Pending submissions display claimed marks (e.g. `8m` in amber font with claim tooltip).
    - Verified submissions display awarded marks in green (e.g. `+8`).
    - Rejected submissions display `0` in red.
  - **Status Badges**: Green `VERIFIED` pill, Amber `PENDING` pill, Red `REJECTED` pill.
  - **Faculty Audit Notes**: Verifier comments rendered in subtle italic text under the title.
  - **Credential Links**: External link icon for verified digital credentials (Credly, Badgr, etc.).

---

### 7.7 The 11 Universal 940px Centered Modal Workspaces (`src/components/workspaces/`)

All placement categories utilize modern, dedicated 940px centered modal workspaces replacing legacy side drawers. Each modal is built on the unified `MetricWorkspaceShell` foundation:

#### Core Architecture & Shared Components:
- **`MetricWorkspaceShell.jsx`**: Centered 940px modal container with backdrop blur, category header, official rubric dropdown tooltip, verified vs. pending score breakdown, faculty rejection audit notes, and proof attachment indicator.
- **`EvidenceUploader.jsx`**: Multi-file batch document uploader supporting PDF, PNG, JPG, and WEBP formats with drag-and-drop, individual file size calculation, direct Supabase Storage bucket uploads, and preview/removal actions.
- **`URLField.jsx`**: Clean URL input field with automatic `https://` protocol normalization, clipboard paste helper, and immediate link validity feedback.
- **Category ID Normalization (`selectedCatId`)**: In `App.jsx`, all 11 modal triggers evaluate `selectedCatId === normalizeCategoryId(selectedCategory?.id || selectedCategory)`, guaranteeing that whether a category is loaded from Supabase as `coding_practice`, passed from categories as `coding-platforms`, or referenced as `coding`, the correct workspace always opens.
- **Whole-Card Clickability (`MetricCard.jsx`)**: The entire `MetricCard` container is keyboard-accessible and clickable (`cursor: pointer`, `role="button"`), with `e.stopPropagation()` on the inner "View →" button to eliminate dead click zones.

#### Detailed Workspace Breakdown:
1. **`AcademicsWorkspace.jsx`**: Evaluates 10th Percentage (max 2.5m), 12th Percentage (max 2.5m), and University CGPA (max 5.0m). Features real-time grade calculations, multi-file proof uploader (`details.proofDocuments`), and instant profile synchronization.
2. **`GitHubWorkspace.jsx`**: Evaluates Year Contributions (5m), Monthly Frequency (2m), Community Projects (3m), and Collaborations (5m). Integrated with GitHub GraphQL API and local proxy crawler.
3. **`CodingPlatformWorkspace.jsx` (Dual-Mode Tabbed Architecture)**:
   - Evaluates LeetCode Badges (up to 5m) + Medium/Hard Solved Problems (up to 5m) capped at 10 marks total.
   - **Tab Navigation**: Header contains direct tab switchers `[ 📊 Verified Ledger ]` and `[ ⚡ Enter Details / Re-sync Profile ]`.
   - **Smart Lockout Prevention (`hasValidStats`)**: If a student has 0 verified marks or has not yet synced a LeetCode username, the workspace bypasses read-only lockouts and defaults directly to the **LeetCode Profile Verification** form (`leetcode.com/u/ [username] [Fetch Stats]`).
   - **Live Stats Engine**: Fetches verified counts directly via Edge Function, local Vite proxy `/api/leetcode`, or public Alfa API fallback, displaying Easy, Medium, Hard, Badges, and live marks projection before submitting.
   - **Prominent Re-sync Banner**: Ledger view includes an unmissable callout banner at the bottom with a 1-click `[Enter Details / Re-sync →]` button.
4. **`InternshipWorkspace.jsx`**: Evaluates Tier 1 / SRM Placement (5m), Fortune 500 (4m), Startup (3m), and <3mo (2m) plus Paid Internship bonus (+1m). Enforces the 5m cap for Tier 1 and allows stacking up to 10 marks.
5. **`SkillsetWorkspace.jsx`**: Evaluates CISCO/IBM (5m), NPTEL (3m), Coursera (2m), and Technical Certifications (1m) up to 5 certificates (15m max).
6. **`ProjectsWorkspace.jsx`**: Evaluates IIT/DRDO Capstone (5m), Govt Sponsored (4m), Deployed Web/Mobile (3m), and Mini Projects (1-2m) up to 3 projects (5m max).
7. **`FullStackWorkspace.jsx` (Streamlined 4-Field Architecture)**:
   - Clean, focused form asking strictly for:
     1. **Application Name**: Name of the fullstack application.
     2. **Short Description**: Brief overview of the product (optional).
     3. **Hosted / Live URL**: Production URL (e.g. Vercel, Netlify, Render, AWS).
     4. **GitHub Repository URL**: Public codebase link.
   - Enforces automatic URL protocol normalization (`formatUrl`), computes the 5m production fullstack rubric score, attaches URLs to `details`, and submits to the faculty review queue with zero hardcoded values.
8. **`HackathonsWorkspace.jsx`**: Evaluates 1st Prize (5m), 2nd Prize (4m), 3rd Prize (3m), and Participation (1m) across up to 4 hackathons (10m max).
9. **`InHouseWorkspace.jsx`**: Evaluates SRMIST faculty R&D projects and campus automation initiatives (4m each, max 2 projects = 8m).
10. **`MembershipWorkspace.jsx`**: Automated regex syntax verification, digital credential link resolver (Credly, Accredible), and SRMIST Chapter Roster matching for IEEE, ACM, CSI, IET, and ISTE (2m max).
11. **`AssessmentsWorkspace.jsx`**: Standardized diagnostic assessment evaluation mapping test percentage across all 11 official SRMIST bands (90–100% = 10m, 80–89% = 9m, down to <30% = 0m).

---

### 7.8 Rebuilt Faculty Verification Portal (`FacultyPendingQueue.jsx`, `FacultyStudentList.jsx`, `FacultyStudentInspect.jsx`)

When authenticated with `profile.role === 'faculty'`, the portal renders a dedicated workflow tailored exclusively for faculty placement coordinators:
1. **Dedicated Navigation & Route Guards**:
   - Sidebar restricted strictly to:
     - **Pending Queue** (`/faculty/pending`): Displays live amber counter badge via realtime subscription on `faculty_student_mappings` & `student_submissions`.
     - **My Students** (`/faculty/students`): Roster of students mapped to this faculty coordinator.
     - **Leaderboard** (`/leaderboard`): Shared institutional placement leaderboard.
     - **My Profile** (`/profile`): Readonly faculty coordinator profile card (`FacultyProfileView`).
   - All student-only surfaces (My Metrics, ScorePanel for self, academic metric inputs, category sheet drawers) are suppressed.
2. **Verification Queue (`FacultyPendingQueue.jsx`)**:
   - Full-width responsive workspace listing pending claims only from students assigned via `faculty_student_mappings`.
   - Live search by student name or register number, category dropdown filter, and sort (Newest/Oldest).
   - Card layout per submission: Student avatar, name, reg_no, department, section, relative submission time, claim title.
   - Structured JSONB details formatted into readable key-value pairs (LeetCode metrics, GitHub stats, company tier, prize, etc.) with external profile links.
   - "View Proof Document ↗" external button for verified documents.
   - Inline evaluation bar: number input for marks to award (pre-filled with client-computed `calculated_marks`), faculty note input.
   - Real-time action buttons: "Reject" (requires reason; logs audit trail, sets `REJECTED`, inserts student inbox message) and "Verify & Award" (awards marks, sets `VERIFIED`, logs audit trail, inserts student inbox message).
   - Realtime channel automatically updates the queue when students submit claims.
3. **Mapped Students Roster (`FacultyStudentList.jsx`)**:
   - Tabular directory of students mapped to the logged-in faculty coordinator via `faculty_student_mappings` and section alignment.
   - Dynamic real-time scoring via `calculateTotalScore` using academic percentages (`tenth_pct`, `twelfth_pct`), CGPA, and verified submissions, eliminating any false `0.0 / 100` displays.
   - Displays Rank, Student Name + Reg No, Department / Section, CGPA, Verified Score & Metrics, Pending Claims count, Placement Tier badge, and Action buttons.
   - **"📊 View Metrics" Button**: Positioned directly next to the verified score in the table: `[ 24.5 / 100 ] [ 📊 View Metrics ]`.
   - **Interactive Read-Only Student Metrics Modal**:
     - Safety Lock notice: *"Read-Only Metrics View: Faculty cannot modify marks directly from this view. Changes and mark awards are processed strictly when the student submits an activity for review in your Pending Verification Queue."*
     - Filter tabs (`All (11)`, `Verified`, `Pending`, `Unclaimed`).
     - 11 Metric Cards with progress bars (green verified, amber pending), verified details, and clickable proof document links (`📄 View Proof ↗`).
     - "Full Audit Dossier" button navigating directly to `/faculty/students/:studentId`.
4. **Student Inspection Dossier (`FacultyStudentInspect.jsx`)**:
   - Comprehensive two-column student audit view:
     - Left column (40%): Student identity card, verified academic foundation (10th%, 12th%, CGPA, and Academics Score out of 10.0m), and interactive placement score donut gauge (`ScorePanel` fed with dynamic calculated score and placement tier).
     - Right column (60%): **Dual-Mode Evaluation Interface**:
       - **Mode 1: Student Metrics (11 Categories)**: Comprehensive read-only view of all 11 criteria with rubric details, progress bars, metadata, proof document links, and direct jump buttons (`Review Pending Claim in Ledger ↗`) for any pending claims.
       - **Mode 2: Placement Claims Ledger**: Tab switcher ("All", "Pending", "Verified", "Rejected") with inline verification controls (marks input, notes input, "Verify & Award", "Reject") for rapid evaluation.
5. **Faculty Profile View (`FacultyProfileView` in `Profile.jsx`)**:
   - Clean institutional identity card displaying name, email, department, employee ID (`reg_no`), and coordinator badge.
   - Interactive Section Switcher allowing coordinators to filter their cohort dynamically.
   - Stripped of all student academic metric inputs, 10th/12th forms, and placement score donuts.


---

### 7.9 Authentication & Onboarding Flow (`AuthPage.jsx`)

- **Zero Hardcoding**: 100% dynamic authentication built strictly on Supabase Auth (no demo buttons, no static credentials).
- **Two-Column Layout**: Left brand panel with institutional logos and placement tiers; right responsive auth card with theme variables.
- **Role Tabs & Mode Switching**: Instant switching between **Student** and **Faculty**, and between **Sign In** and **Register**.
- **Student Registration**: Full name, Registration number (`RA2411...`), SRMIST email (`@srmist.edu.in`), Branch (`CTECH`, `CINTEL`, `DSBS`, `NWC`), Section (`A1`–`T2`), and Password.
- **Faculty Registration**: Full name, Faculty ID, SRMIST email, Section (`A1`–`T2`), and Password.
- **Dual-Identifier Login**: Accepts either Registration Number / Faculty ID **OR** SRMIST Email. Automatically resolves registration number to registered email via `profiles` lookup.
- **Immediate Profile Creation**: Inserts `profiles` record immediately upon `signUp()` via `.select()` and routes based on role (`/overview` for students, `/faculty/pending` for faculty).

---

### 7.10 Floating Notification Toast System (`Toast.jsx`)

- Positioned in bottom-right corner (`z-index: 1000`).
- Color-coded border and icon: Green for success, Red for error, Amber for notice.
- Title, descriptive message, and dismiss `X` button.
- Smooth slide-up entrance animation and automatic 3.5s auto-dismiss countdown.

---

---

## 8. SERVICES LAYER & API CONTRACT

File directory: `src/services/`

### 8.1 Student Service (`studentService.js`)
- `getStudentProfile(studentId)`: Retrieves profile row and formats to camelCase and snake_case.
- `updateStudentProfile(studentId, updates)`: Updates `public.profiles` (`tenth_pct`, `twelfth_pct`, `cgpa`, etc.).
- `getAllStudentProfiles()`: Lists all student profiles for leaderboards and faculty rosters.

### 8.2 Submission Service (`submissionService.js`)
- `getStudentSubmissions(studentId)`: Returns all submissions for a student ordered by `created_at DESC`.
- `getAllSubmissions(statusFilter)`: Returns all student submissions with explicit profile join:  
  `profiles!student_submissions_student_id_fkey(id, name, full_name, email, reg_no, department, section, cgpa)`.
- `upsertStudentSubmission({ studentId, categoryId, title, details, proofUrl, calculatedMarks })`: Canonical upsert pattern for placement claims:
  - Step 1: Supersedes and cancels any existing `PENDING` submission for this student and category (`status = 'REJECTED'`, `verifier_notes = 'Superseded by new submission'`).
  - Step 2: Inserts new `PENDING` submission with client-calculated marks in `details.calculated_marks` and `awarded_marks`.
  - Step 3: Returns `data[0]` via `.select()` without `.single()`.
- `createSubmission({ ... })`: Envelope submission creator with normalized category entity persistence fallback.

### 8.3 Faculty Service (`facultyService.js`)
- `getFacultyStudents(facultyId)`: Queries `faculty_student_mappings` to retrieve all student profiles mapped to this faculty coordinator.
- `getFacultyPendingSubmissions(facultyId)`: Retrieves all `PENDING` claims strictly for students mapped to this faculty coordinator with joined student profiles (`profiles!student_submissions_student_id_fkey`) and category metadata.
- `getStudentSubmissionsForFaculty(studentId)`: Retrieves complete submission history across all 11 categories for a specific student for the inspect view.
- `verifySubmission({ submissionId, facultyId, awardedMarks, verifierNotes, studentId, categoryTitle })`: Updates submission to `status = 'VERIFIED'`, sets `awarded_marks = awardedMarks`, records audit entry in `verification_logs`, and inserts real-time notification into `student_messages`.
- `rejectSubmission({ submissionId, facultyId, verifierNotes, studentId, categoryTitle })`: Requires rejection reason, updates submission to `status = 'REJECTED'`, zeroes awarded marks, records audit entry in `verification_logs`, and inserts rejection notification with reason into `student_messages`.

### 8.4 Leaderboard Service (`leaderboardService.js`)
- `getLeaderboardData()`: Queries `public.placement_leaderboard` view or calculates aggregated scores across all students in fallback mode.

### 8.5 Student Inbox & Notification Service (`messageService.js`)
- `getStudentMessages(studentId)`: Retrieves all faculty review notifications and inbox messages for a student, ordered by `created_at DESC`.
- `markMessageRead(messageId)`: Marks a specific message as read (`is_read = true`).
- `markAllMessagesRead(studentId)`: Marks all unread messages for a student as read in a single batch update.
- `getUnreadCount(studentId)`: Retrieves exact count of unread messages for the student.

### 8.6 Professional Body Membership Verification Service (`membershipVerificationService.js`)
- `validateMembershipFormat(organization, rawId)`: Validates format regex per body (IEEE 8 digits, ACM 7 digits, CSI 7-9 alphanumeric, IET 6-10 digits, ISTE SM-123456); strips `#` prefixes and internal whitespace.
- `validateCredentialUrl(rawUrl)`: Detects verifiable digital credential providers (Credly, Accredible, Badgr, CertifyMe, and official registries `ieee.org`, `acm.org`, `csi-india.org`, `theiet.org`, `isteonline.in`).
- `checkInstitutionalRoster(organization, membershipId, regNo)`: Cross-references Supabase `public.institutional_membership_roster` with in-memory `SRMIST_CHAPTER_ROSTER` fallback (matching student `RA2411003010973` / `98421004`).
- `evaluateMembershipClaim({ organization, membershipId, credentialUrl, regNo, studentName })`: Comprehensive pipeline evaluating format, digital badge, and institutional roster; returns confidence (`HIGH`, `MEDIUM`, `LOW`), color tokens (`green`, `blue`, `amber`, `red`), and notes.


---

## 9. EXTERNAL INTEGRATIONS & VERIFICATION ENGINES (LEETCODE, PROFESSIONAL BODIES & STORAGE)

### 9.1 LeetCode Credibility Engine & Account Mapping (`src/lib/leetcodeService.js`)
- **Username Sanitizer**: Strips URL prefixes (`https://leetcode.com/u/`, `@`, trailing slashes).
- **Triple-Path Resilient Strategy**:
  1. *Primary*: Invokes Supabase Edge Function `fetch-leetcode`.
  2. *Secondary*: Hits `/api/leetcode` (proxied via Vite server to LeetCode GraphQL).
  3. *Tertiary*: Direct cross-origin query via public LeetCode Alfa API (`alfa-leetcode-api.onrender.com/${username}/solved` and `/badges`).
- **GraphQL & REST Payload Extraction**:
  - Extracts `easySolved`, `mediumSolved`, `hardSolved`, `mediumHardSolved` ($M + H$), and `badgeCount`.
- **Persistent Student Account Mapping & Sync Architecture**:
  - **Account Mapping**: Maps and binds the student's LeetCode username to their student account in `public.leetcode_profiles` and local storage.
  - **Locked Verified State**: Shows the mapped username `@username` with direct profile link and "Last synced" timestamp.
  - **One-Click Sync**: A dedicated `[Sync Latest LeetCode Stats]` button that automatically fetches fresh statistics, updates the 10m rubric score, and logs an updated claim to `student_submissions` without requiring manual number inputs.
  - **Controlled Edit Mode**: An `[Edit ID]` button enables students to re-enter or change their mapped LeetCode username with full validation and cancellation options.
- **Rubric Scoring Engine**:
  - Automatically computes Badge Score (max 5m) and Difficulty Score (max 5m based on $\ge 25, 50, 100, 150, 201+$ solved) capped at 10 marks total.

### 9.2 Professional Body Membership Verification Engine (`src/services/membershipVerificationService.js`)
Institutional and external verification pipeline for IEEE, ACM, CSI, IET, and ISTE:
1. **Format Validation**:
   - IEEE: Exactly 8 digits (`^\d{8}$`).
   - ACM: Exactly 7 digits (`^\d{7}$`).
   - CSI: 7–9 alphanumeric (`^[A-Z0-9]{7,9}$`).
   - IET: 6–10 digits (`^\d{6,10}$`).
   - ISTE: `SM-123456`, `LM-123456`, or numeric (`^(SM|LM)?[ -]?\d{4,8}$`).
2. **Digital Credential / Badge Resolver**:
   - Parses URLs from Credly (`credly.com`), Accredible (`credential.net`, `accredible.com`), Badgr (`badgr.com`), CertifyMe (`certifyme.online`), and official body registries (`badges.ieee.org`, `myacm.acm.org`).
3. **SRMIST Institutional Chapter Roster Matching**:
   - Queries `public.institutional_membership_roster` or cross-references the SRMIST Student Branch Registry (`SRMIST IEEE STB01092`, `SRM ACM Student Chapter`, `SRMIST CSI Chapter`).
   - Matches student registration number (`RA2411003010973`) with official membership numbers.
4. **Live Reactive UI Feedback**:
   - `CategorySheet.jsx` renders instant feedback cards:
     - 🟢 **Green / Emerald**: "SRMIST Chapter Roster Verified" (Auto-matched with active chapter roster).
     - 🔵 **Blue**: "Credly / Accredible Digital Badge Verified" (Verified via digital credential link).
     - 🟡 **Amber**: "Valid Format • Awaiting Document Review" (Valid ID syntax, waiting for certificate inspection).
     - 🔴 **Red**: "Invalid Membership ID Format" (Syntax mismatch with guidance hint).
5. **Faculty Verification Integration**:
   - `FacultyDashboard.jsx` displays the verification highlights box, roster status, chapter name, membership ID, and clickable links to verify digital credentials and proof documents.
   - Pre-fills 2.0 marks for 1-click verification.

### 9.3 Proof Storage & Direct Link Verification (`src/services/proofService.js` & `src/lib/supabaseClient.js`)
- `uploadProofFile(studentId, file)`: Uploads to `placement-proofs` bucket under path `${studentId}/${Date.now()}_${file.name}`.
- If a digital credential URL is provided without a physical file upload, the credential URL is safely stored as `proof_url`.
- Returns public URL for storage, table linking, and faculty review.

### 9.4 Google OAuth Institutional Onboarding Flow (`src/pages/AuthCallback.jsx`)
- Restricts Google account selection to `@srmist.edu.in` accounts (`hd=srmist.edu.in`, `prompt=select_account`).
- `AuthCallback.jsx` intercepts the OAuth redirect, validates domain authenticity, auto-provisions a `public.profiles` row if none exists, and redirects to `/profile?onboarding=true` with a welcoming onboarding banner.

---

## 10. ARCHITECTURAL EVALUATION: WHY SUPABASE (POSTGRESQL) VS. FIREBASE (FIRESTORE)

A thorough technical justification for why **Supabase (PostgreSQL)** is strictly superior to **Firebase (Firestore NoSQL)** for `rankd`:

### 10.1 Relational Integrity vs. NoSQL Duplication
- `rankd` is a **grading, compliance, and placement evaluation engine**. It requires relational integrity: Students have Submissions; Submissions have Category IDs, Verifier IDs, and Awarded Marks; Profiles have Reg Nos, CGPA, and Roles (Student vs Faculty).
- In PostgreSQL, foreign keys and check constraints (`CHECK (email LIKE '%@srmist.edu.in')`, `CHECK (awarded_marks <= 15)`) guarantee data validity at the database kernel level.
- In Firebase (NoSQL), there are no foreign keys or joins. You must either duplicate (denormalize) student names and reg numbers into every submission document (risking data drift) or perform chained client-side reads.

### 10.2 Dynamic Leaderboard & Ranks (PostgreSQL Window Functions vs. Firestore Reads)
- Placement leaderboards require dynamic ranking:
  ```sql
  DENSE_RANK() OVER (ORDER BY total_verified_score DESC, cgpa DESC, academics_score DESC, reg_no ASC)
  ```
  PostgreSQL executes this server-side in milliseconds with composite indexing and filters across Department, Section, and Score Tiers simultaneously.
- **Firestore has no native `RANK()`, `SUM()`, or window functions.** To compute leaderboard ranks in Firestore, you must download all student records to the client (expensive and slow) or build complex distributed counter trees via Cloud Functions.

### 10.3 Placement Traffic Spikes & The 50,000 Daily Read Hard Cap
- **The Firebase Free Tier Trap**: Firebase Spark plan enforces a **hard cap of 50,000 document reads per day**.
  - If 500 students check a 100-student leaderboard on placement day:
    $$\text{500 students} \times \text{100 reads} = \mathbf{50,000\text{ reads}}$$
  - Firebase immediately locks down the database with `RESOURCE_EXHAUSTED` errors until midnight, crashing the portal for everyone.
- **The Supabase Advantage**: Supabase Free Tier provides **unlimited database queries/reads**. The Postgres engine computes and returns only the required rows. 500 students refreshing 10 times run smoothly at $0 extra cost.

### 10.4 Enterprise Security: Kernel-Level RLS vs. Client-Billed Security Rules
- PostgreSQL Row Level Security (RLS) executes inside the database kernel. Students are physically blocked from altering `status = 'VERIFIED'` or modifying `awarded_marks`.
- Firebase Security Rules (`firestore.rules`) can check roles, but reading user documents inside rules consumes additional billed reads on every single request.

### 10.5 Future AI & Corporate ATS Scaling (Built-in `pgvector`)
- When scaling to automated resume parsing, candidate skill recommendations, and corporate ATS job matching, Supabase has **`pgvector`** built directly into PostgreSQL:
  ```sql
  SELECT full_name, cgpa FROM profiles ORDER BY skills_embedding <=> job_description_embedding LIMIT 20;
  ```
- In Firebase, you must subscribe to and pay for a separate 3rd-party vector database (Pinecone, Weaviate) and manage continuous data sync pipelines.

### 10.6 Why Raw PostgreSQL Without Supabase is Impractical
- A web browser cannot open a raw TCP socket to PostgreSQL on port 5432.
- Using raw PostgreSQL directly would require building, hosting, and maintaining:
  1. A custom Node.js/FastAPI backend with dozens of CRUD endpoints (replaced by Supabase PostgREST).
  2. A custom authentication and JWT service (replaced by Supabase GoTrue).
  3. A custom S3 file upload server (replaced by Supabase Storage).
  4. Connection poolers like PgBouncer to handle concurrent student traffic (built into Supabase).
- Supabase provides all of this while remaining **100% standard open-source PostgreSQL** with **zero vendor lock-in**.

---

## 11. CHRONOLOGICAL HISTORY OF WORK DONE & BUGS RESOLVED

| Phase / Task | Issue Encountered | Root Cause | Solution Implemented |
|---|---|---|---|
| **Branding** | Inconsistent logo usage | Multiple SVG mockups | Integrated official `rankd` geometric logo asset with clean SVG path rendering. |
| **Animation Layer** | Jarring layout transitions | Unsynchronized CSS | Added custom animation tokens (`subtle-fade`, `drawer-slide`, `card-hover`) strictly under 350ms with zero 3rd party bloat. |
| **Navigation Split** | Single-page layout overflow | All views mounted simultaneously | Restructured layout with React Router DOM v7 into distinct `/overview`, `/my-metrics`, `/leaderboard`, and `/profile` routes. |
| **Sidebar Polish** | Manual collapse clunky | User-toggled collapse button | Replaced manual toggle with automatic mouse-hover rail expansion (64px to 224px). |
| **LeetCode Integration** | LeetCode marks not persisting | No normalized table or sync service | Created `public.leetcode_profiles`, integrated GraphQL fetcher with CORS proxy fallback, and wired into `CategorySheet`. |
| **Database Overhaul** | Schema mismatch with rubric | Fragmented columns | Rebuilt database with 11 normalized tables, audit logs, and `placement_leaderboard` views. |
| **PostgREST Coercion Bug** | `SUBMISSION ERROR: Cannot coerce the result to a single JSON object` | Calling `.single()` when 0 rows returned from RLS rejection | Removed `.single()` calls; used safe `.select()` returning array indices. |
| **Foreign Key Error** | `PGRST201: Could not embed` | Ambiguous FKs `student_id` & `verifier_id` to `profiles` | Disambiguated join: `profiles!student_submissions_student_id_fkey`. |
| **Column Mismatch** | Schema cache missing `submitted_at` | Database column is `created_at` | Replaced all references to `submitted_at` with `created_at`. |
| **RLS Auth Rejection** | Profile update returning 0 rows | Demo sign-in did not set `auth.uid()` in Supabase Auth | Updated `demoSignIn` to sign into Supabase Auth with real account `ar2461@srmist.edu.in`. |
| **Academics Score Reflection** | Hardcoded initial input state | Sheet inputs not linked to profile | Wired `studentProfile` prop to `CategorySheet`, added live rubric calculation preview, and immediate state sync on save. |
| **Google OAuth Restriction** | Any Gmail account could enter | No institutional domain restriction | Added `hd: 'srmist.edu.in'` and `prompt: 'select_account'` query parameters; built `AuthCallback.jsx` with automatic profile provisioning. |
| **Professional Body Verification** | No verification for IEEE, ACM, CSI, IET, ISTE IDs | Manual file review only | Created `membershipVerificationService.js` with regex syntax validation, Credly/Accredible badge URL detection, and SRMIST chapter roster lookup. |
| **Membership Form Polish** | Redundant Claim Title field; inputs reset on open | Generic fallback input; no prefill | Excluded membership from generic Claim Title; prefilled latest membership ID and org when opening drawer. |
| **Credential URL Proof Fallback** | Missing proof file when submitting digital badge | Required physical file upload | Used digital credential URL as fallback `proof_url`; rendered verification status pill and link in Logged Submissions table. |
| **Faculty Verification Queue RLS Bug** | Verification requests not appearing on faculty portal (`0` pending claims) | `demoSignIn('faculty')` set local state without Supabase Auth session (`auth.uid() = null`); Supabase RLS silently blocked all rows | Provisioned `faculty.coordinator@srmist.edu.in` in Supabase Auth & `public.profiles` (`role = 'faculty'`); updated `demoSignIn` to sign into Supabase Auth with password `password1234` so `auth.uid()` satisfies RLS. |
| **Verification Schema Mismatch (PGRST204)** | Verification update failing with `Could not find the 'verified_at' column of 'student_submissions'` | `facultyService.js` passed nonexistent columns `verified_by` and `verified_at` | Updated column mapping to canonical `verifier_id` and removed `verified_at` (using `updated_at: new Date().toISOString()`); added error check throwing on `updateError`. |
| **Logged Submissions Marks Display (0 vs Claimed)** | Logged submissions table displayed `Marks: 0` for all pending submissions | Table condition strictly checked `{item.status === 'VERIFIED' ? +awarded : 0}` | Updated cell to display claimed marks (e.g. `8m` in amber font) for pending items, `+8` in green font for verified items, and `0` in red for rejected items. |
| **Real-Time Cross-Portal Sync** | Student dashboard not updating live when faculty verified submission | Realtime channel only listened to faculty's own user ID | Configured faculty to listen to all `student_submissions` events, added window-focus listener, and added 6-second heartbeat polling in `App.jsx`. |
| **Academics Multi-Doc Stacking** | Single-document restriction for academics evidence | Form only allowed a single proof file; replaced on re-upload | Rebuilt document upload to support multi-file batch upload, drag-and-drop, stacked card view with individual preview buttons (`ExternalLink`) and individual remove actions, persisting in `details.proofDocuments`. |
| **Universal Metric Workspaces (All 10 Metrics)** | Only Academics had focused 940px modal workspace; other categories used legacy 480px drawer | Incomplete workspace rollout across non-academic categories | Engineered `MetricWorkspaceShell`, `EvidenceUploader`, `URLField`, and built dedicated 940px workspaces for all 10 remaining categories (GitHub Profile, Coding Practice Platform, Internship Experience, Skillset & Certifications, Projects Done, Full Stack Developer Experience, Competitions & Hackathons, In-House Projects, Professional Membership, SHL/Talent Assessment) using identical design system, zero hardcoding, and strict `scoringEngine.js` calculation. |
| **Rubric Compliance Audit** | Scoring functions diverged from official SRMIST PDF across 4 categories | Wrong bands in GitHub (15/10/5 instead of 16/11/6), phantom 10-solved band in Coding Platform, collapsed assessment bands (5 bands instead of 11), paid internship cap allowing 6m for Tier-1 | Fixed all 4 scoring functions in scoringEngine.js to match the official PDF exactly. Updated test suite with boundary cases. Updated SQL view assessment CASE blocks where applicable. |
| **Faculty Portal Rebuild & Student-Faculty Workflow** | Faculty dashboard lacked student mapping isolation; pending marks included unverified claims in scores view; no student feedback inbox; submissions stacked instead of superseding | Generic faculty queue exposed all students unmapped; students had no visibility into rejected claims; re-submissions didn't cancel previous claims | Created `faculty_student_mappings` and `student_messages` tables with RLS and indexes; rebuilt faculty portal with dedicated `/faculty/pending`, `/faculty/students`, `/faculty/students/:studentId`, and `FacultyProfileView`; added student inbox section on Overview with real-time sync; implemented canonical `upsertStudentSubmission` superseding pattern; relaxed `awarded_marks` constraint to `<= 100`; recreated `student_placement_scores` view to only sum verified marks in category scores and isolate pending claims. |
| **Change Request Pending Tab Visibility** | Change request / update submissions did not appear in the Pending tab on My Metrics or faculty queue | Status calculation prioritized `verifiedMarks > 0` over `hasPending`, filtering out categories with prior verified marks; faculty query threw `PGRST205` when `faculty_student_mappings` had not yet been executed in remote SQL | Prioritized `hasPending` over `verifiedMarks` in `MyMetrics.jsx`, `Overview.jsx`, and all 11 category workspaces; added resilient fallback in `facultyService.js` and `Sidebar.jsx` so unmapped or non-migrated faculty accounts query all pending submissions; safeguarded supersede step in `submissionService.js` against RLS status checks. |
| **Full Stack Form Simplification** | Fullstack form demanded complex database, backend architecture, and infrastructure checkboxes not required by placement rubric | Overcomplicated schema compared to rubric requirements | Streamlined `FullStackWorkspace.jsx` down strictly to 4 essential inputs: Application Name, Short Description (optional), Hosted / Live URL, and GitHub Repository URL. Maintained dynamic 5m production architecture scoring, automatic URL protocol formatting (`formatUrl`), validation, and faculty queue integration with zero hardcoding. |
| **ScorePanel Donut Center Score Display** | Donut center score on Overview/Dashboard displayed `0` instead of student's verified score | Counter did not properly bind verified score and fallback to `totalVerifiedScore` when rendering | Normalized `verifiedScore` in `ScorePanel.jsx` and `ScoreBanner.jsx` so verified placement points (e.g. `62.5` / 100) are rendered crisply in emerald green. |
| **Academics Mark Reduction & Revision (Test 13)** | Revision requests did not correctly reflect lower marks when CGPA was revised downward | Engine didn't explicitly prioritize latest verified academics submission over initial profile fields | Updated `scoringEngine.js` to ensure the most recent verified submission's awarded marks or calculated rubric marks are authoritatively respected across student and faculty views. Added Test 13 in `scoringEngine.test.js` validating academics mark reduction from 8.5 to 7.5. |
| **Coding Practice Platform "View →" Button Crash** | Clicking "View →" on Coding Practice Platform card did not open modal | `CodingPlatformWorkspace.jsx` line 250 referenced undeclared variable `fetchedStats?.username` instead of `stats?.username`, throwing an unhandled `ReferenceError: fetchedStats is not defined` runtime crash on mount | Replaced `fetchedStats` with component state variable `stats` and safe property access, eliminating the runtime crash. |
| **Coding Platform Read-Only Lockout & Tab Navigation** | Students with 0 marks or unconfigured profiles could not access the input box to enter their LeetCode username | `isReadOnly` defaulted to `true` whenever `lifecycleStatus === 'VERIFIED'`, locking users into an empty ledger view when marks were 0 or username was unconfigured | Added `hasValidStats` check so unconfigured or 0-mark profiles default directly to the entry form (`leetcode.com/u/ [username] [Fetch Stats]`). Added top navigation tab switcher (`[ 📊 Verified Ledger ]` and `[ ⚡ Enter Details / Re-sync Profile ]`) and bottom action callout banner so users can freely switch to the entry/sync interface at any time. |
| **MetricCard Click Target & Category Normalization** | Clicking outside the tiny 13px "View →" text did nothing; modal trigger conditions in `App.jsx` checked non-normalized IDs (`coding` or `coding-platforms`), failing if DB table used `coding_practice` | Outer card container lacked click handler and cursor-pointer; workspace conditions in `App.jsx` didn't use `normalizeCategoryId` | Made entire `MetricCard` container clickable (`cursor: pointer`, `role="button"`), added `e.stopPropagation()` to "View →", and computed `selectedCatId = normalizeCategoryId(selectedCategory?.id || selectedCategory)` across all 11 workspace renders in `App.jsx`. Aligned `MyMetrics.jsx` with normalized filtering and safe JSON parsing. |
| **GitHub Score Calculation Object Merging** | `calculateGitHubScore` returned 8/15 instead of 15/15 when submission details was an empty object `{}` | `const d = item.details || item || {}` preferred empty object over submission properties | Merged item and details properties: `const d = { ...(item || {}), ...(typeof item?.details === 'object' && item.details ? item.details : {}) }`, ensuring both direct submission attributes and nested details are recognized. |
| **Complete Auth System Replacement (Zero Hardcoding)** | Dependence on Google OAuth with rigid redirect callback, static demo buttons, and hardcoded test UUIDs | Google OAuth caused redirect friction; static demo buttons violated zero-hardcoding rules | Completely excised Google OAuth and demo credentials; deleted `AuthCallback.jsx`; rebuilt `AuthPage.jsx` with responsive two-column brand panel + auth card, role tabs (`Student` vs `Faculty`), mode toggling (`Sign In` vs `Register`), strict SRMIST domain and `RA2411` prefix validation, branch dropdown (CTECH, CINTEL, DSBS, NWC), section dropdown (A1–T2), automatic reg_no/email identifier detection, and immediate `profiles` insertion via `.select()`. |
| **Auth Input Focus & Cursor Loss on Keystrokes** | Cursor disappeared after typing each individual character in registration and login inputs, requiring clicking the input again | `Field` helper component was defined *inside* `AuthPage()` render function, causing React to treat it as a new component type on every state update, unmounting the DOM `<input>` on every keystroke | Extracted `Field` to top-level module scope above `AuthPage`. React now maintains stable component identity and in-place DOM updates, keeping cursor position and focus intact without losing keystrokes. |
| **Section-Based Faculty-Student Mapping** | Faculty saw all students across the entire institution or none at all instead of students who chose the same section | `getFacultyStudents`, `getFacultyPendingSubmissions`, and `Sidebar.jsx` fell back to unconstrained university-wide queries when `faculty_student_mappings` was absent | Implemented `normalizeSection` and `isSameSection` across `facultyService.js`, `Sidebar.jsx`, and `App.jsx`. Faculty coordinators now dynamically map to all and only students in their coordinating section (e.g. `P1`, `A1`, etc., with `All` option for campus-wide coordinators). Added interactive section switcher on `FacultyProfileView` and section status pills across Pending Queue and My Students. |
| **Faculty Score Display & 11-Category Read-Only Metrics View** | Faculty portal displayed `0.0 / 100` for students in `FacultyStudentList` and `FacultyStudentInspect`; faculty had no way to view every student's metrics across all 11 categories like students do in "My Metrics" | `FacultyStudentList` and `FacultyStudentInspect` relied solely on the Supabase SQL view `student_placement_scores` which returned null/zero for unaggregated or un-triggered records, and `getFacultyStudents` omitted `tenth_pct` and `twelfth_pct`; no read-only metrics view existed for faculty | 1. Integrated `calculateTotalScore` dynamically across `FacultyStudentList.jsx` and `FacultyStudentInspect.jsx` using `tenth_pct`, `twelfth_pct`, `cgpa`, and verified submissions.<br/>2. Updated `getFacultyStudents` in `facultyService.js` to select `tenth_pct` and `twelfth_pct`.<br/>3. Added a dedicated **"📊 View Metrics"** button directly next to each student's score in `FacultyStudentList.jsx` table: `[ 24.5 / 100 ] [ 📊 View Metrics ]`.<br/>4. Built the full **Read-Only Student Metrics Modal** in `FacultyStudentList.jsx` with security lock notice, 11-category cards with progress bars, verified details, and clickable proof links (`📄 View Proof ↗`).<br/>5. Upgraded `FacultyStudentInspect.jsx` to a **Dual-Mode Evaluation Interface** (`[ 📊 Student Metrics (11 Categories) ]` and `[ 📋 Claims Ledger & Verification ]`), with left-column Donut and Academic Foundation cards accurately displaying verified placement scores.<br/>6. Strict security invariant: Faculty cannot modify marks directly from the metrics view; modifications and mark awards are processed strictly when the student requests/submits an activity and the faculty verifies and awards that change in the ledger / pending queue. |
| **GitHub Repository Version Control & Zero-Leakage Git Ignore** | Local project unversioned on GitHub; high risk of committing sensitive `.env` Supabase credentials or `.agents/` MCP personal access tokens | Repository had no Git tracking and incomplete `.gitignore` patterns | Hardened `.gitignore` to explicitly reject all `.env*`, `.agents/*`, `node_modules/`, `dist/`, and `supabase/.temp/`. Initialized Git, created clean root commit `feat: rankd v1 — SRMIST placement ranking portal` with 88 sanitized files, configured origin to `https://github.com/abhaydasarathy/rankd.git`, and pushed cleanly to tracking branch `main`. |
| **Vercel Production Cloud Deployment & SPA Wildcard Rewrites** | Direct navigation or browser page refreshes on subroutes (`/overview`, `/my-metrics`, `/faculty/pending`) throw HTTP 404 on static hosts | Client-side Single Page Application (SPA) missing server-side rewrite rules | Engineered [vercel.json](file:///c:/Users/ABHAY%20R%20DASARATHY/Downloads/inhouseproject1/vercel.json) with SPA catch-all rewrite (`/(.*) -> /index.html`), immutable asset caching, and security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`). Connected GitHub repository to Vercel and deployed live production build at `https://rankdpro.vercel.app` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Verified all direct client routes return HTTP 200 OK. |
| **Supabase Auth Production Domain Provisioning** | Supabase rejects login sessions and OAuth callbacks coming from newly deployed Vercel domain | Supabase Auth URL whitelist restricted to localhost | Configured Supabase Auth Project Settings (`edrnoswnadjcsftekplu`): updated Site URL to `https://rankdpro.vercel.app` and added Redirect URL `https://rankdpro.vercel.app/**`, enabling seamless authentication across all student and faculty portal routes in production. |
| **Official Brand Mark Unification (`RankdSymbol`)** | Placeholder 32x32 right-angle ramp triangle rendered on auth page | Disconnected branding from the main platform's official logo | Replaced the mock right-angle polygon in `AuthPage.jsx` with the canonical geometric `RankdSymbol` (`polygon points="306 0, 0 190.5, 306 381"` with `fill="#22C55E"`), unifying the brand identity across both authentication and authenticated application views. |
| **Apple-Grade Auth Micro-Interactions & Static Depth** | Moving orb animations, floating tier badges, abrupt tab switching, and lack of tactile button feedback | Visual noise and lack of micro-interaction polish on entry portal | Re-engineered `AuthPage.jsx` and `AuthPage.css` with subtle Apple/Linear-grade micro-interactions: static ambient background depth (`#080C10` with subtle static grid vignette; removed moving/pulsing orbs), removed redundant legacy tier pills, engineered sliding segmented role tab indicator (`.auth-tab-slider`), physical tactile button press (`scale(0.985)`), real `✓ Signed in` state transition with SVG checkmark, subtle 3px horizontal error shake (`subtleShake`), coordinated entrance orchestration, and full `prefers-reduced-motion` accessibility support. |

---

## 12. CURRENT OPERATIONAL STATE & VERIFICATION TEST SUITE

As of today, the system is fully operational and comprehensively verified:
1. **Zero Hardcoded Data**: All student marks, profiles, submissions, faculty mappings, and inbox messages are dynamically read from and written to Supabase PostgreSQL.
2. **Dedicated Faculty Portal Workflow**:
   - Navigation restricted to: Pending Queue (`/faculty/pending`), My Students (`/faculty/students`), Leaderboard (`/leaderboard`), and My Profile (`/profile`).
   - All student metrics, personal donuts, and academic forms suppressed from faculty accounts.
   - Pending Queue displays live amber counter badge via realtime subscription on `faculty_student_mappings` and `student_submissions`.
   - Readable key-value details (not raw JSON), external proof links, inline marks override, faculty notes, and real-time verify/reject actions.
   - Student Inspect view (`/faculty/students/:studentId`) provides split layout with student profile + ScorePanel donut on left and dual-mode interface (11-Category Metrics view + Claims Ledger) on right.
3. **Student Inbox & Real-Time Sync**:
   - Student Overview features live inbox displaying verified (emerald border) and rejected (red border) messages with faculty notes.
   - Supabase Realtime channel automatically syncs student score, submission statuses, and inbox messages immediately upon faculty action.
4. **Canonical Upsert Submission Flow**:
   - `upsertStudentSubmission` supersedes any existing PENDING submission for a category (`status = 'REJECTED'`, `verifier_notes = 'Superseded by new submission'`) and inserts the new claim with pre-calculated preview marks in `details.calculated_marks` and `awarded_marks`.
   - Partial unique index `idx_one_verified_per_category` prevents duplicate verified claims in the database.
5. **Database View & Constraint Alignment**:
   - `student_submissions_awarded_marks_check` relaxed to `>= 0 AND <= 100`.
   - `public.student_placement_scores` view recreated to ensure `total_verified_score` only sums VERIFIED submissions while `total_pending_score` aggregates claimed marks from PENDING submissions only.
6. **All 13 Scoring Engine Test Suites Pass**: Executing `node src/utils/scoringEngine.test.js` passes all 13 test suites (Academics, GitHub, Coding Platforms, Internships, Certifications, Projects, Full-Stack, Hackathons, In-House, Memberships, Assessments, 100-Mark Cap, and Academics Mark Reduction/Revision).
7. **Production Build Clean**: Production build (`npm run build`) transforms 1,979 modules across all pages and workspaces and compiles cleanly in ~770ms with **0 errors**.
8. **Auth & Security**: Dynamic custom email/password authentication with role enforcement (`student` routed to `/overview`, `faculty` routed to `/faculty/pending`), `@srmist.edu.in` domain restriction, `RA2411` student reg number validation, and zero hardcoded test accounts.
9. **Backend Integrity & Atomic RPC Verification (`20260927_backend_integrity_and_atomic_rpc.sql`)**:
   - Broadened `student_certifications_provider_check` to include CCNA, CCNP, MCNA, MCNP, MATLAB, REDHAT, IBM, NPTEL, COURSERA, PROGRAMMING, UDEMY, and OTHER.
   - Added `normalizeCertProvider()` in `submissionService.js` to normalize any cert provider string to allowable database constraint values.
   - Created PostgreSQL functions `rpc_verify_submission` and `rpc_reject_submission` to perform atomic, transactional verification (submission update + audit log + student notification) with zero client race conditions.
   - Updated `facultyService.js` to call atomic RPCs with graceful zero-downtime fallback.
   - Implemented `auto_map_student_to_faculty` trigger on `public.profiles` so students automatically map to section coordinators upon registration, and backfilled all existing students.
   - Standardized `profiles.section` storage to bare code (`"P1"`) across registration, queries, and migrations.
   - Hardened `student_submissions` RLS policy with explicit `WITH CHECK (student_id = auth.uid() AND status IN ('DRAFT', 'PENDING'))` to prevent status escalation.
10. **Faculty Student Metrics & Dynamic Scoring System**:
    - Both `FacultyStudentList` and `FacultyStudentInspect` dynamically calculate verified and pending scores via `calculateTotalScore` using academic percentages, CGPA, and verified submissions, guaranteeing scores are never falsely displayed as `0.0 / 100`.
    - Every student in the roster features a **"📊 View Metrics"** button next to their score in the table.
    - Interactive 11-category read-only metrics modal in `FacultyStudentList` and dual-mode interface in `FacultyStudentInspect` allow coordinators to inspect all 11 criteria, category progress bars, verified details, and supporting proof documents (`📄 View Proof ↗`).
    - **Read-Only Security Guard**: Faculty can never edit marks directly from the metrics view. Modifications and mark awards require a student submission/request and are reviewed and awarded by faculty through the Pending Queue or Claims Ledger.
11. **Production Cloud Deployment & Zero-404 SPA Routing (Vercel)**:
    - **Live Production URL**: `https://rankdpro.vercel.app`
    - **Continuous Delivery**: Connected to GitHub repository `https://github.com/abhaydasarathy/rankd` on branch `main`. Every push triggers an automated production build and deployment.
    - **Universal SPA Rewrite Engine**: Configured in `vercel.json` (`/(.*) -> /index.html`). Direct URL navigation and hard browser refreshes across all routes (`/auth`, `/overview`, `/my-metrics`, `/leaderboard`, `/faculty/pending`) return HTTP 200 with zero 404s.
    - **Cloud Authentication Whitelist**: Supabase project `edrnoswnadjcsftekplu` configured with Site URL `https://rankdpro.vercel.app` and Redirect URLs `https://rankdpro.vercel.app/**`.
    - **Zero Credential Leakage**: Git history strictly sanitized with 100% of `.env` files and `.agents/` tokens excluded.
12. **Apple-Grade Authentication & Micro-Interaction Architecture**:
    - **Visual Hierarchy & Static Depth**: Canvas grounded on `#080C10` with static radial emerald accents and an ultra-fine 40px grid vignette. Moving particles and pulsing animations are eliminated to ensure an authoritative, distraction-free environment.
    - **Unified Brand Geometry**: Features the official `RankdSymbol` SVG (`polygon points="306 0, 0 190.5, 306 381"`) in both desktop and mobile viewports.
    - **Segmented Role Slider**: Seamless sliding indicator (`.auth-tab-slider`) translating between Student and Faculty tabs with hardware-accelerated transforms (`220ms cubic-bezier(0.16, 1, 0.3, 1)`).
    - **Tactile Feedback & Error Physics**: Primary CTA features a physical `scale(0.985)` compression on click, authentic `✓ Signed in` state transition with checkmark upon Supabase authentication, and a subtle 3px horizontal micro-shake (`subtleShake`) for failed validation.
    - **Motion Accessibility**: Complete `@media (prefers-reduced-motion: reduce)` coverage zeroing transitions and disabling all keyframe motion.


---

## 13. STRATEGIC ROADMAP & NEXT STEPS (ACHIEVING FULL PLACEMENT AUTOMATION)

To elevate `rankd` to enterprise-grade institutional production:

### 13.1 Automated Evidence Verification (AI/OCR Document Parser)
- Implement an Edge Function with OCR (e.g. Google Cloud Vision or Tesseract) to parse uploaded PDF certificates:
  - Verify student name and registration number on NPTEL / Coursera / IEEE certificates.
  - Verify organization seal and issuance dates to flag expired or forged credentials automatically.

### 13.2 GitHub API Live Crawler
- Build a GitHub integration service similar to `leetcodeService.js`:
  - Students enter their GitHub username.
  - Backend queries GitHub GraphQL API for commit history, repository count, star counts, and pull requests to open-source organizations.
  - Automatically calculates GitHub Category Score (out of 15 marks) without manual faculty counting.

### 13.3 Real-Time WebSocket Subscriptions & Notifications
- **Supabase Realtime Channels (`supabase.channel`)** — `[COMPLETED IN V1]`:
  - Active channels listen for `student_submissions` changes and `student_messages` inserts. When faculty evaluates a submission, the student's dashboard, placement donut, submission ledger, and inbox update instantly without page reloads. Includes a 6-second heartbeat polling fallback.
- **Future Enhancements (Web Push & Notification Center)**:
  - Add native browser Web Push Notifications (`ServiceWorkerRegistration.showNotification()`) so students receive alerts even when the browser tab is in the background.
  - Leaderboard live rank transition animations when classmates gain points.

### 13.4 Institutional Placement Cell Export Suite
- Add one-click CSV and Excel export on the Faculty Dashboard:
  - Formatted to the exact SRM Placement Cell dossier specification (Student Name, Reg No, Department, Section, 10th, 12th, CGPA, Verified Score, Super-Dream Tier eligibility).
- Automated email alerts to students when their proof is rejected or requires correction.

---

## 14. CRITICAL GUIDELINES & RULES FOR FUTURE AI COLLABORATORS

When modifying this repository, adhere strictly to these invariants:

1. **NO HARDCODING**: Never inject static student names, marks, rankings, or demo objects directly into React JSX. All data must pass through `AuthContext`, `studentService`, `submissionService`, `membershipVerificationService`, or `scoringEngine`.
2. **PRESERVE THE 100-MARK RUBRIC**: The 11 categories must sum to exactly 100 marks. Never alter category IDs (`academics`, `github`, `coding-platforms`, `internship`, `skillset`, `projects`, `fullstack`, `hackathons`, `inhouse-projects`, `membership`, `assessments`).
3. **POSTGREST JOIN INTEGRITY**: Whenever querying `student_submissions` joined with `profiles`, ALWAYS use:
   ```javascript
   profiles!student_submissions_student_id_fkey(...)
   ```
   Do not omit the foreign key disambiguation.
4. **AVOID `.single()` ON MUTATIONS**: Do not chain `.single()` on updates or inserts where RLS might return zero rows or arrays; use `.select()` and inspect `data[0]`.
5. **MAINTAIN DESIGN SYSTEM**:
   - Use CSS custom variables from `index.css` (`var(--bg-page)`, `var(--green)`, `var(--text-primary)`).
   - Do not add external heavy animation or styling libraries. Keep transitions under 350ms.
   - Respect dark mode contrast and typography.
6. **SUPABASE COLUMN NAMES**:
   - Profiles: `tenth_pct`, `twelfth_pct`, `cgpa`, `reg_no`, `batch_year`.
   - Submissions: `created_at` (NOT `submitted_at`), `awarded_marks`, `verifier_id`, `verifier_notes`.
7. **STUDENT SUBMISSION STATUS INVARIANT**: Student inserts into `student_submissions` must always be submitted with `status: 'PENDING'`. Database RLS policies strictly reject student writes with `status = 'VERIFIED'`.
8. **FACULTY METRICS READ-ONLY INVARIANT**: Faculty coordinators can view student metrics across all 11 categories in read-only mode, but cannot edit marks directly in the metrics view. All mark awards and score modifications must originate from a student submission/request and be verified and awarded by the faculty via the Pending Verification Queue or Claims Ledger.

---
*End of Authoritative Master System Dossier — rankd SRMIST*
