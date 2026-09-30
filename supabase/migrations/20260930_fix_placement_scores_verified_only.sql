-- ============================================================================
-- MIGRATION: 20260930_fix_placement_scores_verified_only.sql
-- rankd — Fix Critical Scoring Bug: Pending Marks Being Added to Verified Score
-- Project Ref: edrnoswnadjcsftekplu
--
-- 1. Recreate public.student_placement_scores view with strict VERIFIED-only filtering.
--    Pending marks are aggregated separately into total_pending_score and NEVER added to total_verified_score.
-- 2. Recreate public.placement_leaderboard view inheriting verified-only scores.
-- 3. Diagnostics and integrity verification.
-- ============================================================================

-- ============================================================================
-- STEP 1: Recreate public.student_placement_scores View
-- ============================================================================
CREATE OR REPLACE VIEW public.student_placement_scores WITH (security_invoker = false) AS
WITH academics_calc AS (
  SELECT
    id AS student_id,
    LEAST(10.0, (
      CASE
        WHEN tenth_pct >= 96 THEN 2.5
        WHEN tenth_pct >= 91 THEN 2.0
        WHEN tenth_pct >= 86 THEN 1.5
        WHEN tenth_pct >= 75 THEN 1.0
        WHEN tenth_pct > 0  THEN 0.5
        ELSE 0.0
      END +
      CASE
        WHEN twelfth_pct >= 96 THEN 2.5
        WHEN twelfth_pct >= 91 THEN 2.0
        WHEN twelfth_pct >= 86 THEN 1.5
        WHEN twelfth_pct >= 75 THEN 1.0
        WHEN twelfth_pct > 0  THEN 0.5
        ELSE 0.0
      END +
      CASE
        WHEN cgpa > 9.5  THEN 5.0
        WHEN cgpa >= 9.1 THEN 4.0
        WHEN cgpa >= 8.6 THEN 3.0
        WHEN cgpa >= 7.5 THEN 2.0
        WHEN cgpa > 0    THEN 1.0
        ELSE 0.0
      END
    ))::numeric(4,2) AS academics_score
  FROM public.profiles
  WHERE role = 'student'
),
verified_only AS (
  -- This CTE contains ONLY VERIFIED submissions
  -- PENDING, REJECTED, DRAFT submissions are completely excluded here
  SELECT
    student_id,
    category_id,
    awarded_marks,
    status
  FROM public.student_submissions
  WHERE status = 'VERIFIED'   -- THE CRITICAL FILTER — only VERIFIED here
),
submissions_summary AS (
  SELECT
    student_id,
    -- GitHub: singleton, take highest verified (max 15m)
    LEAST(15.0, COALESCE(MAX(CASE WHEN category_id = 'github' THEN awarded_marks END), 0)) AS github_score,
    -- Coding Platforms: singleton, take highest verified (max 10m)
    LEAST(10.0, COALESCE(MAX(CASE WHEN category_id IN ('coding-platforms','coding_practice','coding','leetcode') THEN awarded_marks END), 0)) AS coding_score,
    -- Internship: stackable, sum all verified (max 10m)
    LEAST(10.0, COALESCE(SUM(CASE WHEN category_id = 'internship' THEN awarded_marks END), 0)) AS internship_score,
    -- Skillset: stackable, sum all verified (max 15m)
    LEAST(15.0, COALESCE(SUM(CASE WHEN category_id = 'skillset' THEN awarded_marks END), 0)) AS skillset_score,
    -- Projects: stackable, sum all verified (max 5m)
    LEAST(5.0, COALESCE(SUM(CASE WHEN category_id = 'projects' THEN awarded_marks END), 0)) AS projects_score,
    -- Full Stack: singleton (max 5m)
    LEAST(5.0, COALESCE(MAX(CASE WHEN category_id = 'fullstack' THEN awarded_marks END), 0)) AS fullstack_score,
    -- Hackathons: stackable, sum all verified (max 10m)
    LEAST(10.0, COALESCE(SUM(CASE WHEN category_id = 'hackathons' THEN awarded_marks END), 0)) AS hackathons_score,
    -- In-House Projects: stackable, sum all verified (max 8m)
    LEAST(8.0, COALESCE(SUM(CASE WHEN category_id IN ('inhouse-projects','inhouse_projects') THEN awarded_marks END), 0)) AS inhouse_score,
    -- Membership: singleton (max 2m)
    LEAST(2.0, COALESCE(MAX(CASE WHEN category_id = 'membership' THEN awarded_marks END), 0)) AS membership_score,
    -- Assessments: singleton (max 10m)
    LEAST(10.0, COALESCE(MAX(CASE WHEN category_id = 'assessments' THEN awarded_marks END), 0)) AS assessments_score
  FROM verified_only
  GROUP BY student_id
),
pending_summary AS (
  -- Pending marks tracked SEPARATELY — never mixed into verified score
  SELECT
    student_id,
    COALESCE(SUM(COALESCE((details->>'calculated_marks')::numeric, awarded_marks)), 0) AS pending_marks_total,
    COUNT(*) AS pending_submissions_count
  FROM public.student_submissions
  WHERE status = 'PENDING'   -- ONLY PENDING here
  GROUP BY student_id
),
verified_count AS (
  SELECT
    student_id,
    COUNT(*) AS verified_submissions_count
  FROM public.student_submissions
  WHERE status = 'VERIFIED'
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
  COALESCE(s.github_score, 0)      AS github_score,
  COALESCE(s.coding_score, 0)      AS coding_score,
  COALESCE(s.internship_score, 0)  AS internship_score,
  COALESCE(s.skillset_score, 0)    AS skillset_score,
  COALESCE(s.projects_score, 0)    AS projects_score,
  COALESCE(s.fullstack_score, 0)   AS fullstack_score,
  COALESCE(s.hackathons_score, 0)  AS hackathons_score,
  COALESCE(s.inhouse_score, 0)     AS inhouse_score,
  COALESCE(s.membership_score, 0)  AS membership_score,
  COALESCE(s.assessments_score, 0) AS assessments_score,
  -- TOTAL VERIFIED SCORE: sum of all category scores, strictly capped at 100
  -- academics comes from profiles, all others from VERIFIED submissions only
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
    -- NOTE: pending_marks_total is NEVER added here
  ))::numeric(5,2) AS total_verified_score,
  -- Pending shown separately for display purposes only
  COALESCE(pend.pending_marks_total, 0)       AS total_pending_score,
  COALESCE(pend.pending_submissions_count, 0) AS pending_submissions_count,
  COALESCE(vc.verified_submissions_count, 0)  AS verified_submissions_count
FROM public.profiles p
JOIN  academics_calc a   ON a.student_id = p.id
LEFT JOIN submissions_summary s   ON s.student_id = p.id
LEFT JOIN pending_summary pend    ON pend.student_id = p.id
LEFT JOIN verified_count vc       ON vc.student_id = p.id
WHERE p.role = 'student';

-- ============================================================================
-- STEP 2: Recreate public.placement_leaderboard View
-- ============================================================================
CREATE OR REPLACE VIEW public.placement_leaderboard WITH (security_invoker = false) AS
SELECT
  DENSE_RANK() OVER (
    ORDER BY total_verified_score DESC, cgpa DESC, academics_score DESC, reg_no ASC
  ) AS rank,
  student_id, name, full_name, email, reg_no,
  department, programme, section, batch, cgpa,
  academics_score, github_score, coding_score,
  internship_score, skillset_score, projects_score,
  fullstack_score, hackathons_score, inhouse_score,
  membership_score, assessments_score,
  total_verified_score,
  total_pending_score,
  pending_submissions_count,
  verified_submissions_count
FROM public.student_placement_scores;

-- ============================================================================
-- STEP 3: Cleanup Duplicate VERIFIED Submissions (Singleton Categories Only)
-- Note: Stackable categories (skillset, internship, hackathons, projects, inhouse-projects)
-- intentionally permit multiple verified activities up to category point caps.
-- ============================================================================
WITH singleton_ranked AS (
  SELECT 
    id,
    student_id,
    category_id,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY student_id, category_id
      ORDER BY created_at DESC
    ) AS rn
  FROM public.student_submissions
  WHERE status = 'VERIFIED'
    AND category_id IN ('academics', 'github', 'coding-platforms', 'coding_practice', 'coding', 'leetcode', 'fullstack', 'membership', 'assessments')
)
UPDATE public.student_submissions
SET 
  status = 'REJECTED',
  verifier_notes = 'Duplicate verified singleton submission — superseded by more recent verification',
  updated_at = now()
WHERE id IN (
  SELECT id FROM singleton_ranked WHERE rn > 1
);

-- ============================================================================
-- STEP 4: Verification Queries
-- ============================================================================
-- 1. Inspect verified-only scores across all students
SELECT 
  full_name,
  reg_no,
  academics_score,
  github_score,
  internship_score,
  skillset_score,
  fullstack_score,
  total_verified_score,
  total_pending_score
FROM public.student_placement_scores
ORDER BY total_verified_score DESC;

-- 2. Inspect leaderboard dense ranks
SELECT rank, full_name, reg_no, total_verified_score, total_pending_score
FROM public.placement_leaderboard
ORDER BY rank;
