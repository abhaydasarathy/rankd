-- ============================================================================
-- MIGRATION: 20260928_fix_profile_rls_and_submissions.sql
-- rankd — Profile Creation Hardening, Per-Student Data Isolation, Faculty Queue & Leaderboard Sync
-- Project Ref: edrnoswnadjcsftekplu
-- ============================================================================

-- ============================================================================
-- PART 0: Ensure All Required Columns Exist on public.profiles
-- ============================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS programme TEXT DEFAULT 'B.Tech';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS advisor TEXT DEFAULT 'Faculty Placement Coordinator';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS batch_year TEXT DEFAULT '2024 - 2028';

-- ============================================================================
-- PART 1: Drop & Recreate RLS Policies on public.profiles
-- ============================================================================
DROP POLICY IF EXISTS "Allow public read for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_anon" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- SELECT: authenticated users can read all profiles (required for leaderboard and peer views)
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- SELECT: allow anon read (needed for reg_no lookup during login before auth session is set)
CREATE POLICY "profiles_select_anon"
  ON public.profiles FOR SELECT
  TO anon
  USING (true);

-- INSERT: allow insert when id matches JWT uid
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- UPDATE: users can only update their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- PART 2: Recover All Orphaned Auth Users into public.profiles
-- ============================================================================
INSERT INTO public.profiles (
  id, email, name, full_name, reg_no, role,
  department, programme, section, batch, batch_year,
  tenth_pct, twelfth_pct, cgpa
)
SELECT
  au.id,
  au.email,
  -- First name from metadata, fallback to email prefix
  TRIM(SPLIT_PART(
    COALESCE(
      NULLIF(au.raw_user_meta_data->>'full_name', ''),
      NULLIF(au.raw_user_meta_data->>'name', ''),
      SPLIT_PART(au.email, '@', 1)
    ), ' ', 1
  )) AS name,
  -- Full name from metadata, fallback to email prefix
  COALESCE(
    NULLIF(au.raw_user_meta_data->>'full_name', ''),
    NULLIF(au.raw_user_meta_data->>'name', ''),
    SPLIT_PART(au.email, '@', 1)
  ) AS full_name,
  -- Reg number from metadata, fallback to email prefix
  COALESCE(
    NULLIF(au.raw_user_meta_data->>'reg_no', ''),
    UPPER(SPLIT_PART(au.email, '@', 1))
  ) AS reg_no,
  COALESCE(NULLIF(au.raw_user_meta_data->>'role', ''), 'student') AS role,
  COALESCE(NULLIF(au.raw_user_meta_data->>'department', ''), 'CSE Core') AS department,
  'B.Tech' AS programme,
  COALESCE(NULLIF(au.raw_user_meta_data->>'section', ''), 'A1') AS section,
  '2024 - 2028' AS batch,
  '2024 - 2028' AS batch_year,
  0 AS tenth_pct,
  0 AS twelfth_pct,
  0 AS cgpa
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
  AND au.email LIKE '%@srmist.edu.in'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
  name = COALESCE(EXCLUDED.name, public.profiles.name),
  reg_no = COALESCE(EXCLUDED.reg_no, public.profiles.reg_no),
  role = COALESCE(EXCLUDED.role, public.profiles.role),
  programme = COALESCE(EXCLUDED.programme, public.profiles.programme),
  updated_at = NOW();

-- ============================================================================
-- PART 3: Fix Generic Names ("Student", "User", empty) in public.profiles
-- ============================================================================
UPDATE public.profiles p
SET
  name = TRIM(SPLIT_PART(
    COALESCE(
      NULLIF(au.raw_user_meta_data->>'full_name', ''),
      NULLIF(p.full_name, ''),
      SPLIT_PART(p.email, '@', 1)
    ), ' ', 1
  )),
  full_name = COALESCE(
    NULLIF(au.raw_user_meta_data->>'full_name', ''),
    NULLIF(p.full_name, ''),
    SPLIT_PART(p.email, '@', 1)
  )
FROM auth.users au
WHERE au.id = p.id
  AND (
    p.name IN ('Student', 'User', 'Faculty', 'student', 'user', 'faculty', '')
    OR p.name IS NULL
    OR p.full_name IN ('Student', 'User', 'Faculty', 'student', 'user', 'faculty', '')
    OR p.full_name IS NULL
  );

-- For any remaining rows where name is generic but full_name is populated
UPDATE public.profiles
SET name = TRIM(SPLIT_PART(full_name, ' ', 1))
WHERE (name IN ('Student', 'User', 'Faculty', 'student', 'user', 'faculty', '') OR name IS NULL)
  AND full_name IS NOT NULL
  AND full_name NOT IN ('Student', 'User', 'Faculty', '');

-- ============================================================================
-- PART 4: Ensure Correct Student Role Assignment
-- ============================================================================
UPDATE public.profiles
SET role = 'student'
WHERE role NOT IN ('student', 'faculty', 'admin')
   OR (role IS NULL AND email LIKE '%@srmist.edu.in' AND (reg_no LIKE 'RA%' OR email NOT LIKE 'faculty%'));

-- ============================================================================
-- PART 5: Relax awarded_marks Check Constraint (Allow up to 100)
-- ============================================================================
ALTER TABLE public.student_submissions
  DROP CONSTRAINT IF EXISTS student_submissions_awarded_marks_check;

ALTER TABLE public.student_submissions
  ADD CONSTRAINT student_submissions_awarded_marks_check
    CHECK (awarded_marks >= 0 AND awarded_marks <= 100);

-- ============================================================================
-- PART 6: Ensure faculty_student_mappings Table & Populate Section Mappings
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.faculty_student_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (faculty_id, student_id)
);

ALTER TABLE public.faculty_student_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Faculty see their own mappings" ON public.faculty_student_mappings;
CREATE POLICY "Faculty see their own mappings"
  ON public.faculty_student_mappings FOR SELECT
  USING (
    auth.uid() = faculty_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins and faculty manage mappings" ON public.faculty_student_mappings;
CREATE POLICY "Admins and faculty manage mappings"
  ON public.faculty_student_mappings FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty','admin')));

CREATE INDEX IF NOT EXISTS idx_fsm_faculty ON public.faculty_student_mappings(faculty_id);
CREATE INDEX IF NOT EXISTS idx_fsm_student ON public.faculty_student_mappings(student_id);

-- Populate mappings
INSERT INTO public.faculty_student_mappings (faculty_id, student_id)
SELECT 
  f.id AS faculty_id,
  s.id AS student_id
FROM public.profiles s
CROSS JOIN public.profiles f
WHERE 
  s.role = 'student'
  AND f.role = 'faculty'
  AND (
    TRIM(f.section) = 'All'
    OR REPLACE(TRIM(f.section), 'Section ', '') = REPLACE(TRIM(s.section), 'Section ', '')
  )
ON CONFLICT (faculty_id, student_id) DO NOTHING;

-- ============================================================================
-- PART 7: Auto-Map Students to Faculty Trigger
-- ============================================================================
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

-- ============================================================================
-- PART 8: Create / Refresh Leaderboard Views
-- ============================================================================
CREATE OR REPLACE VIEW public.student_placement_scores AS
WITH academics_calc AS (
    SELECT 
        id AS student_id,
        (LEAST(10.0, 
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
    COALESCE(p.programme, 'B.Tech') AS programme,
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

-- ============================================================================
-- PART 9: Verification & Audit Diagnostics
-- ============================================================================
-- 1. Check for remaining orphaned auth users (should return 0 rows)
SELECT au.id, au.email, au.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL AND au.email LIKE '%@srmist.edu.in';

-- 2. Verify all active profiles
SELECT id, email, name, full_name, reg_no, role, section, department
FROM public.profiles
ORDER BY created_at DESC;

-- 3. Verify placement leaderboard shows all students
SELECT rank, reg_no, full_name, section, department, total_verified_score
FROM public.placement_leaderboard
ORDER BY rank;

-- 4. Verify faculty-student mapping counts per faculty
SELECT 
  f.full_name AS faculty,
  f.section AS faculty_section,
  COUNT(fsm.student_id) AS students_mapped
FROM public.faculty_student_mappings fsm
JOIN public.profiles f ON f.id = fsm.faculty_id
GROUP BY f.id, f.full_name, f.section
ORDER BY f.section;
