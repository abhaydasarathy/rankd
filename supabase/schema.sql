-- ==============================================================================
-- SRM Institute of Science and Technology
-- Placement Ranking Portal (rankd) — Canonical PostgreSQL Schema & Migrations
-- Total Placement Rubric Capacity: 100 Marks across 11 Standard Categories
-- ==============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. User Profiles Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
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
    tenth_pct NUMERIC(5,2) DEFAULT 0 CHECK (tenth_pct >= 0 AND tenth_pct <= 100),
    twelfth_pct NUMERIC(5,2) DEFAULT 0 CHECK (twelfth_pct >= 0 AND twelfth_pct <= 100),
    cgpa NUMERIC(4,2) DEFAULT 0 CHECK (cgpa >= 0 AND cgpa <= 10),
    advisor TEXT DEFAULT 'Faculty Placement Coordinator',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 3. Placement Categories Master Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.placement_categories (
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

-- Seed exactly 11 canonical placement categories totaling 100 marks
INSERT INTO public.placement_categories (id, title, short_description, rubric_text, icon_name, max_marks, display_order)
VALUES
    ('academics', 'Academics', '10th, 12th percentage & University CGPA', '10th (2.5m) + 12th (2.5m) + CGPA (5m)', 'GraduationCap', 10.0, 1),
    ('github', 'GitHub Profile', 'Repositories, commit frequency, collaboration & open source', 'Year Repos (5m) + Monthly Freq (2m) + Community (3m) + Collab (5m)', 'Github', 15.0, 2),
    ('coding-platforms', 'Coding Practice Platform', 'LeetCode live statistics, badge count & medium/hard solved problems', 'Badges (5m) + Medium/Hard Solved (5m)', 'Code2', 10.0, 3),
    ('internship', 'Internship Experience', 'Industrial training, stipendiary & institutional internships', 'Tier 1 / SRM Placement (5m), Fortune 500 (4m), Startup (3m), <3mo (2m) + Paid (+1m)', 'Briefcase', 10.0, 4),
    ('skillset', 'Skillset & Certifications', 'Global certifications, NPTEL elite & vendor accreditations', 'CISCO/IBM (5m), NPTEL (3m), Coursera (2m), Technical (1m) • Max 5 Certs', 'Award', 15.0, 5),
    ('projects', 'Projects Done', 'Capstone, sponsored and deployed software/hardware projects', 'IIT/DRDO (5m), Govt (4m), Web/Mobile (3m), Mini (1-2m) • Max 3 Projects', 'FolderGit2', 5.0, 6),
    ('fullstack', 'Full Stack Developer Experience', 'End-to-end full stack web/cloud applications in production', 'Production Full Stack Architecture Project (5m) • Max 1 Project', 'Layers', 5.0, 7),
    ('hackathons', 'Competitions & Hackathons', 'National & international hackathon awards and participation', '1st Prize (5m), 2nd Prize (4m), 3rd Prize (3m), Participation (1m) • Max 4 Events', 'Trophy', 10.0, 8),
    ('inhouse-projects', 'In-House Projects', 'Departmental labs, campus automation & faculty R&D projects', 'SRMIST / Partner University Faculty R&D Project (4m per project • Max 2)', 'Building2', 8.0, 9),
    ('membership', 'Professional Membership', 'Recognized international & national professional bodies', 'Valid Certificate in IEEE, ACM, CSI, IET, ISTE (2m)', 'ShieldCheck', 2.0, 10),
    ('assessments', 'SHL / Talent / NCET Assessment', 'Standardized institutional placement diagnostic test scores', 'Score Mapping: 90-100 (10m), 80-89 (9m), 70-79 (8m), 60-69 (6-7m)...', 'CheckSquare', 10.0, 11)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    short_description = EXCLUDED.short_description,
    rubric_text = EXCLUDED.rubric_text,
    icon_name = EXCLUDED.icon_name,
    max_marks = EXCLUDED.max_marks,
    display_order = EXCLUDED.display_order;

-- ==============================================================================
-- 4. Student Submissions Envelope Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.student_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL REFERENCES public.placement_categories(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('DRAFT', 'SUBMITTED', 'PENDING', 'VERIFIED', 'REJECTED')),
    awarded_marks NUMERIC(4,2) NOT NULL DEFAULT 0 CHECK (awarded_marks >= 0 AND awarded_marks <= 100),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    proof_url TEXT,
    submitted_at TIMESTAMPTZ DEFAULT now(),
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verifier_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verifier_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 5. Submission Proof Documents Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.submission_proofs (
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

-- ==============================================================================
-- 6. Verification Audit Logs Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.verification_logs (
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

-- ==============================================================================
-- 7. Normalized Category-Specific Entities
-- ==============================================================================

-- 7.1 LeetCode / Coding Platform Snapshots
CREATE TABLE IF NOT EXISTS public.leetcode_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    submission_id UUID REFERENCES public.student_submissions(id) ON DELETE SET NULL,
    platform TEXT NOT NULL DEFAULT 'leetcode',
    profile_username TEXT NOT NULL,
    profile_url TEXT NOT NULL,
    easy_solved INTEGER NOT NULL DEFAULT 0 CHECK (easy_solved >= 0),
    medium_solved INTEGER NOT NULL DEFAULT 0 CHECK (medium_solved >= 0),
    hard_solved INTEGER NOT NULL DEFAULT 0 CHECK (hard_solved >= 0),
    medium_hard_solved INTEGER GENERATED ALWAYS AS (medium_solved + hard_solved) STORED,
    badge_count INTEGER NOT NULL DEFAULT 0 CHECK (badge_count >= 0),
    badge_marks INTEGER NOT NULL DEFAULT 0 CHECK (badge_marks >= 0 AND badge_marks <= 5),
    difficulty_marks INTEGER NOT NULL DEFAULT 0 CHECK (difficulty_marks >= 0 AND difficulty_marks <= 5),
    calculated_marks INTEGER NOT NULL DEFAULT 0 CHECK (calculated_marks >= 0 AND calculated_marks <= 10),
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7.2 Student Internships
CREATE TABLE IF NOT EXISTS public.student_internships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    submission_id UUID REFERENCES public.student_submissions(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    company_tier TEXT NOT NULL CHECK (company_tier IN ('IIT/NIT/SRM', 'Fortune 500', 'Small / Mid Co')),
    duration_months NUMERIC(4,1) NOT NULL CHECK (duration_months > 0),
    is_paid BOOLEAN NOT NULL DEFAULT false,
    calculated_marks NUMERIC(4,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7.3 Student Certifications
CREATE TABLE IF NOT EXISTS public.student_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    submission_id UUID REFERENCES public.student_submissions(id) ON DELETE CASCADE,
    cert_name TEXT NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN (
      'CISCO', 'CCNA', 'CCNP', 'MCNA', 'MCNP', 'MATLAB', 'REDHAT', 'IBM',
      'NPTEL', 'COURSERA', 'PROGRAMMING', 'UDEMY', 'OTHER'
    )),
    credential_id TEXT,
    credential_url TEXT,
    calculated_marks NUMERIC(4,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7.4 Student Projects
CREATE TABLE IF NOT EXISTS public.student_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    submission_id UUID REFERENCES public.student_submissions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    project_type TEXT NOT NULL CHECK (project_type IN ('IIT/DRDO', 'GOVT', 'WEB', 'MINI')),
    github_url TEXT,
    live_url TEXT,
    calculated_marks NUMERIC(4,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7.5 Student Full Stack Developer Experience
CREATE TABLE IF NOT EXISTS public.student_fullstack (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    submission_id UUID REFERENCES public.student_submissions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    frontend_tech TEXT NOT NULL,
    backend_tech TEXT NOT NULL,
    database_tech TEXT NOT NULL,
    github_url TEXT,
    live_url TEXT,
    calculated_marks NUMERIC(4,2) NOT NULL DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7.6 Student Hackathons & Competitions
CREATE TABLE IF NOT EXISTS public.student_hackathons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    submission_id UUID REFERENCES public.student_submissions(id) ON DELETE CASCADE,
    event_name TEXT NOT NULL,
    prize_placement TEXT NOT NULL CHECK (prize_placement IN ('1st Prize', '2nd Prize', '3rd Prize', 'Participation')),
    calculated_marks NUMERIC(4,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7.7 Student In-House R&D Projects
CREATE TABLE IF NOT EXISTS public.student_inhouse_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    submission_id UUID REFERENCES public.student_submissions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    faculty_mentor TEXT NOT NULL,
    university TEXT NOT NULL DEFAULT 'SRMIST',
    calculated_marks NUMERIC(4,2) NOT NULL DEFAULT 4,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7.8 Student Professional Memberships
CREATE TABLE IF NOT EXISTS public.student_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    submission_id UUID REFERENCES public.student_submissions(id) ON DELETE CASCADE,
    organization TEXT NOT NULL CHECK (organization IN ('IEEE', 'ACM', 'CSI', 'IET', 'ISTE')),
    membership_id TEXT,
    calculated_marks NUMERIC(4,2) NOT NULL DEFAULT 2,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7.8.1 Institutional Student Branch Active Roster (Auto-Verification Registry)
CREATE TABLE IF NOT EXISTS public.institutional_membership_roster (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization TEXT NOT NULL CHECK (organization IN ('IEEE', 'ACM', 'CSI', 'IET', 'ISTE')),
    membership_id TEXT NOT NULL,
    reg_no TEXT NOT NULL,
    student_name TEXT NOT NULL,
    chapter TEXT NOT NULL DEFAULT 'SRMIST Student Branch',
    valid_until DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '2 years'),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (organization, membership_id)
);

-- 7.9 Student Assessments (SHL / Talent / NCET)
CREATE TABLE IF NOT EXISTS public.student_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    submission_id UUID REFERENCES public.student_submissions(id) ON DELETE CASCADE,
    assessment_type TEXT NOT NULL CHECK (assessment_type IN ('SHL', 'Talent', 'NCET')),
    raw_score NUMERIC(5,2) NOT NULL CHECK (raw_score >= 0 AND raw_score <= 100),
    calculated_marks NUMERIC(4,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 8. Indexes for High-Performance Queries
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department);
CREATE INDEX IF NOT EXISTS idx_profiles_reg_no ON public.profiles(reg_no);

CREATE INDEX IF NOT EXISTS idx_submissions_student ON public.student_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_category ON public.student_submissions(category_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.student_submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_student_cat ON public.student_submissions(student_id, category_id);

CREATE INDEX IF NOT EXISTS idx_proofs_submission ON public.submission_proofs(submission_id);
CREATE INDEX IF NOT EXISTS idx_proofs_student ON public.submission_proofs(student_id);
CREATE INDEX IF NOT EXISTS idx_verification_submission ON public.verification_logs(submission_id);
CREATE INDEX IF NOT EXISTS idx_leetcode_student ON public.leetcode_profiles(student_id);

-- ==============================================================================
-- 9. Authoritative Placement Scores and Leaderboard Views
-- ==============================================================================

-- 9.1 Unified Student Placement Scores View
CREATE OR REPLACE VIEW public.student_placement_scores AS
WITH academics_calc AS (
    SELECT 
        id AS student_id,
        LEAST(10.0, (
            -- 10th % (2.5m)
            CASE 
                WHEN tenth_pct >= 96 THEN 2.5
                WHEN tenth_pct >= 91 THEN 2.0
                WHEN tenth_pct >= 86 THEN 1.5
                WHEN tenth_pct >= 75 THEN 1.0
                WHEN tenth_pct > 0 THEN 0.5
                ELSE 0.0
            END +
            -- 12th % (2.5m)
            CASE 
                WHEN twelfth_pct >= 96 THEN 2.5
                WHEN twelfth_pct >= 91 THEN 2.0
                WHEN twelfth_pct >= 86 THEN 1.5
                WHEN twelfth_pct >= 75 THEN 1.0
                WHEN twelfth_pct > 0 THEN 0.5
                ELSE 0.0
            END +
            -- CGPA (5.0m)
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
        -- Each category: only VERIFIED submissions contribute to the score
        COALESCE(LEAST(15.0, MAX(CASE WHEN category_id = 'github' AND status = 'VERIFIED' THEN awarded_marks END)), 0) AS github_score,
        COALESCE(LEAST(10.0, MAX(CASE WHEN category_id IN ('coding-platforms','coding_practice') AND status = 'VERIFIED' THEN awarded_marks END)), 0) AS coding_score,
        COALESCE(LEAST(10.0, SUM(CASE WHEN category_id = 'internship' AND status = 'VERIFIED' THEN awarded_marks END)), 0) AS internship_score,
        COALESCE(LEAST(15.0, SUM(CASE WHEN category_id = 'skillset' AND status = 'VERIFIED' THEN awarded_marks END)), 0) AS skillset_score,
        COALESCE(LEAST(5.0, SUM(CASE WHEN category_id = 'projects' AND status = 'VERIFIED' THEN awarded_marks END)), 0) AS projects_score,
        COALESCE(LEAST(5.0, MAX(CASE WHEN category_id = 'fullstack' AND status = 'VERIFIED' THEN awarded_marks END)), 0) AS fullstack_score,
        COALESCE(LEAST(10.0, SUM(CASE WHEN category_id = 'hackathons' AND status = 'VERIFIED' THEN awarded_marks END)), 0) AS hackathons_score,
        COALESCE(LEAST(8.0, SUM(CASE WHEN category_id = 'inhouse-projects' AND status = 'VERIFIED' THEN awarded_marks END)), 0) AS inhouse_score,
        COALESCE(LEAST(2.0, MAX(CASE WHEN category_id = 'membership' AND status = 'VERIFIED' THEN awarded_marks END)), 0) AS membership_score,
        COALESCE(LEAST(10.0, MAX(CASE WHEN category_id = 'assessments' AND status = 'VERIFIED' THEN awarded_marks END)), 0) AS assessments_score,
        -- Pending: sum of claimed marks from PENDING submissions only
        COALESCE(SUM(CASE WHEN status = 'PENDING' THEN COALESCE((details->>'calculated_marks')::numeric, awarded_marks) END), 0) AS pending_marks_total,
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

-- 9.2 Authoritative Placement Leaderboard View
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

-- ==============================================================================
-- 10. Row Level Security (RLS) Policies
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leetcode_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_internships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fullstack ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_hackathons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_inhouse_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_assessments ENABLE ROW LEVEL SECURITY;

-- 10.1 Profiles Policies
DROP POLICY IF EXISTS "Allow public read for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

CREATE POLICY "Allow public read for profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 10.2 Categories Policy (Read-only for all)
DROP POLICY IF EXISTS "Public read placement categories" ON public.placement_categories;
CREATE POLICY "Public read placement categories" ON public.placement_categories FOR SELECT USING (true);

-- 10.3 Student Submissions Policies
DROP POLICY IF EXISTS "Select submissions policy" ON public.student_submissions;
DROP POLICY IF EXISTS "Student insert own submissions" ON public.student_submissions;
DROP POLICY IF EXISTS "Update submissions policy" ON public.student_submissions;

CREATE POLICY "Select submissions policy" ON public.student_submissions FOR SELECT USING (
    student_id = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin')
    )
);

CREATE POLICY "Student insert own submissions" ON public.student_submissions FOR INSERT WITH CHECK (
    student_id = auth.uid()
);

CREATE POLICY "Update submissions policy" ON public.student_submissions FOR UPDATE USING (
    (student_id = auth.uid() AND status IN ('DRAFT', 'PENDING'))
    OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin')
    )
);

-- 10.4 Submission Proofs Policies
DROP POLICY IF EXISTS "Select proofs policy" ON public.submission_proofs;
DROP POLICY IF EXISTS "Insert proofs policy" ON public.submission_proofs;

CREATE POLICY "Select proofs policy" ON public.submission_proofs FOR SELECT USING (
    student_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin')
    )
);

CREATE POLICY "Insert proofs policy" ON public.submission_proofs FOR INSERT WITH CHECK (
    student_id = auth.uid()
);

-- 10.5 Verification Logs Policies (Faculty write, student read own)
DROP POLICY IF EXISTS "Select verification logs" ON public.verification_logs;
DROP POLICY IF EXISTS "Faculty insert verification logs" ON public.verification_logs;

CREATE POLICY "Select verification logs" ON public.verification_logs FOR SELECT USING (
    faculty_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.student_submissions s WHERE s.id = submission_id AND s.student_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin')
    )
);

CREATE POLICY "Faculty insert verification logs" ON public.verification_logs FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin')
    )
);

-- 10.6 Category Details Tables RLS Macro
-- LeetCode Profiles
CREATE POLICY "Student read leetcode" ON public.leetcode_profiles FOR SELECT USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin')));
CREATE POLICY "Student insert leetcode" ON public.leetcode_profiles FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Student update leetcode" ON public.leetcode_profiles FOR UPDATE USING (student_id = auth.uid());

-- Generic Helper Macro for other 10 entities
CREATE POLICY "Student read internships" ON public.student_internships FOR SELECT USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin')));
CREATE POLICY "Student write internships" ON public.student_internships FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Student read certs" ON public.student_certifications FOR SELECT USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin')));
CREATE POLICY "Student write certs" ON public.student_certifications FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Student read projects" ON public.student_projects FOR SELECT USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin')));
CREATE POLICY "Student write projects" ON public.student_projects FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Student read fullstack" ON public.student_fullstack FOR SELECT USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin')));
CREATE POLICY "Student write fullstack" ON public.student_fullstack FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Student read hackathons" ON public.student_hackathons FOR SELECT USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin')));
CREATE POLICY "Student write hackathons" ON public.student_hackathons FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Student read inhouse" ON public.student_inhouse_projects FOR SELECT USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin')));
CREATE POLICY "Student write inhouse" ON public.student_inhouse_projects FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Student read memberships" ON public.student_memberships FOR SELECT USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin')));
CREATE POLICY "Student write memberships" ON public.student_memberships FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Student read assessments" ON public.student_assessments FOR SELECT USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin')));
CREATE POLICY "Student write assessments" ON public.student_assessments FOR ALL USING (student_id = auth.uid());

-- ==============================================================================
-- 11. Storage Bucket & Policies Setup
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('placement-proofs', 'placement-proofs', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Students upload proof files" ON storage.objects;
DROP POLICY IF EXISTS "View proof files policy" ON storage.objects;

CREATE POLICY "Students upload proof files"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'placement-proofs' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "View proof files policy"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'placement-proofs'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR EXISTS (
                SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin')
            )
        )
    );

-- ==============================================================================
-- 12. Institutional Membership Roster Table & Policies
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.institutional_membership_roster (
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

ALTER TABLE public.institutional_membership_roster ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read of roster"
    ON public.institutional_membership_roster FOR SELECT
    TO authenticated
    USING (true);

-- ==============================================================================
-- 13. Faculty Student Mappings
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.faculty_student_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (faculty_id, student_id)
);

ALTER TABLE public.faculty_student_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Faculty see their own mappings"
  ON public.faculty_student_mappings FOR SELECT
  USING (
    auth.uid() = faculty_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins manage mappings"
  ON public.faculty_student_mappings FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty','admin')));

CREATE INDEX IF NOT EXISTS idx_fsm_faculty ON public.faculty_student_mappings(faculty_id);
CREATE INDEX IF NOT EXISTS idx_fsm_student ON public.faculty_student_mappings(student_id);

-- ==============================================================================
-- 14. Student Messages / Inbox
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.student_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  faculty_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  submission_id UUID REFERENCES public.student_submissions(id) ON DELETE SET NULL,
  category_id TEXT REFERENCES public.placement_categories(id) ON DELETE SET NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('VERIFIED', 'REJECTED', 'CORRECTION_REQUESTED')),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  faculty_note TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.student_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read own messages"
  ON public.student_messages FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students mark own messages read"
  ON public.student_messages FOR UPDATE
  USING (auth.uid() = student_id);

CREATE POLICY "Faculty insert messages"
  ON public.student_messages FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty','admin'))
  );

CREATE INDEX IF NOT EXISTS idx_messages_student ON public.student_messages(student_id, is_read, created_at DESC);

-- Partial unique index: only one VERIFIED per student per category at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_verified_per_category
  ON public.student_submissions (student_id, category_id)
  WHERE status = 'VERIFIED';

-- ==============================================================================
-- 15. Auto-Map Students to Faculty Trigger
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.auto_map_student_to_faculty()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.faculty_student_mappings (faculty_id, student_id)
  SELECT 
    f.id AS faculty_id,
    NEW.id AS student_id
  FROM public.profiles f
  WHERE 
    f.role = 'faculty'
    AND (
      TRIM(f.section) = 'All'
      OR REPLACE(TRIM(f.section), 'Section ', '') = REPLACE(TRIM(NEW.section), 'Section ', '')
    )
  ON CONFLICT (faculty_id, student_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_map_student ON public.profiles;
CREATE TRIGGER trigger_auto_map_student
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.role = 'student')
  EXECUTE FUNCTION public.auto_map_student_to_faculty();

-- ==============================================================================
-- 16. Atomic Verification & Rejection RPC Functions
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.rpc_verify_submission(
  p_submission_id UUID,
  p_faculty_id UUID,
  p_awarded_marks NUMERIC,
  p_verifier_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_submission public.student_submissions%ROWTYPE;
  v_category   public.placement_categories%ROWTYPE;
  v_faculty    public.profiles%ROWTYPE;
  v_student_id UUID;
  v_cat_id     TEXT;
BEGIN
  -- Gate: caller must be faculty or admin
  SELECT * INTO v_faculty FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin');
  IF NOT FOUND THEN
    SELECT * INTO v_faculty FROM public.profiles WHERE id = p_faculty_id AND role IN ('faculty', 'admin');
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Unauthorized: Only faculty or admin can verify submissions';
    END IF;
  END IF;

  SELECT * INTO v_submission FROM public.student_submissions WHERE id = p_submission_id AND status = 'PENDING';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found or not in PENDING state';
  END IF;

  v_student_id := v_submission.student_id;
  v_cat_id := v_submission.category_id;

  SELECT * INTO v_category FROM public.placement_categories WHERE id = v_cat_id;
  IF FOUND AND p_awarded_marks > v_category.max_marks THEN
    RAISE EXCEPTION 'Awarded marks (%) exceed category maximum (%)', p_awarded_marks, v_category.max_marks;
  END IF;

  -- 1. Update submission atomically
  UPDATE public.student_submissions
  SET
    status = 'VERIFIED',
    awarded_marks = p_awarded_marks,
    verifier_id = p_faculty_id,
    verified_by = p_faculty_id,
    verifier_notes = p_verifier_notes,
    verified_at = now(),
    updated_at = now()
  WHERE id = p_submission_id;

  -- 2. Supersede any older singleton submissions for this category
  IF v_cat_id IN ('academics', 'github', 'coding-platforms', 'coding_practice', 'fullstack', 'membership', 'assessments') THEN
    UPDATE public.student_submissions
    SET
      status = 'REJECTED',
      verifier_notes = 'Superseded by verified submission',
      updated_at = now()
    WHERE student_id = v_student_id
      AND category_id = v_cat_id
      AND id <> p_submission_id
      AND status IN ('VERIFIED', 'PENDING', 'SUBMITTED', 'DRAFT');
  END IF;

  -- 3. Insert audit log
  INSERT INTO public.verification_logs (
    submission_id, faculty_id, action,
    previous_status, new_status,
    previous_marks, awarded_marks, notes
  ) VALUES (
    p_submission_id, p_faculty_id, 'VERIFY',
    'PENDING', 'VERIFIED',
    0, p_awarded_marks, p_verifier_notes
  );

  -- 4. Insert student inbox notification message
  INSERT INTO public.student_messages (
    student_id, faculty_id, submission_id, category_id,
    message_type, subject, body, faculty_note
  ) VALUES (
    v_student_id, p_faculty_id, p_submission_id, v_cat_id,
    'VERIFIED',
    '✓ ' || COALESCE(v_category.title, v_cat_id) || ' verified — ' || p_awarded_marks || ' marks awarded',
    'Your submission for ' || COALESCE(v_category.title, v_cat_id) || ' has been verified by your faculty coordinator. ' || p_awarded_marks || ' marks have been added to your placement score.',
    p_verifier_notes
  );

  RETURN jsonb_build_object('success', true, 'awarded_marks', p_awarded_marks);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_reject_submission(
  p_submission_id UUID,
  p_faculty_id UUID,
  p_rejection_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_submission public.student_submissions%ROWTYPE;
  v_category   public.placement_categories%ROWTYPE;
  v_faculty    public.profiles%ROWTYPE;
  v_student_id UUID;
  v_cat_id     TEXT;
BEGIN
  SELECT * INTO v_faculty FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin');
  IF NOT FOUND THEN
    SELECT * INTO v_faculty FROM public.profiles WHERE id = p_faculty_id AND role IN ('faculty', 'admin');
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Unauthorized: Only faculty or admin can reject submissions';
    END IF;
  END IF;

  IF p_rejection_reason IS NULL OR TRIM(p_rejection_reason) = '' THEN
    RAISE EXCEPTION 'Rejection reason is required';
  END IF;

  SELECT * INTO v_submission FROM public.student_submissions WHERE id = p_submission_id AND status = 'PENDING';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found or not in PENDING state';
  END IF;

  v_student_id := v_submission.student_id;
  v_cat_id := v_submission.category_id;
  SELECT * INTO v_category FROM public.placement_categories WHERE id = v_cat_id;

  UPDATE public.student_submissions
  SET
    status = 'REJECTED',
    awarded_marks = 0,
    verifier_id = p_faculty_id,
    verified_by = p_faculty_id,
    verifier_notes = p_rejection_reason,
    updated_at = now()
  WHERE id = p_submission_id;

  INSERT INTO public.verification_logs (
    submission_id, faculty_id, action,
    previous_status, new_status,
    previous_marks, awarded_marks, notes
  ) VALUES (
    p_submission_id, p_faculty_id, 'REJECT',
    'PENDING', 'REJECTED',
    0, 0, p_rejection_reason
  );

  INSERT INTO public.student_messages (
    student_id, faculty_id, submission_id, category_id,
    message_type, subject, body, faculty_note
  ) VALUES (
    v_student_id, p_faculty_id, p_submission_id, v_cat_id,
    'REJECTED',
    '✗ ' || COALESCE(v_category.title, v_cat_id) || ' submission rejected',
    'Your submission for ' || COALESCE(v_category.title, v_cat_id) || ' was not approved. Please review the faculty note below and resubmit with the correct information.',
    p_rejection_reason
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_verify_submission TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_reject_submission TO authenticated;


