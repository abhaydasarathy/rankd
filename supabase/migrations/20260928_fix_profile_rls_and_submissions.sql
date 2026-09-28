-- ============================================================================
-- MIGRATION: 20260928_fix_profile_rls_and_submissions.sql
-- rankd — Profile Creation Hardening, Per-Student Data Isolation, Faculty Queue & Leaderboard Sync
-- Run this script in the Supabase SQL Editor (Project Ref: edrnoswnadjcsftekplu)
-- ============================================================================

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

-- INSERT: allow insert when id matches JWT uid (or via service role)
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
-- PART 6: Backfill Faculty-Student Mappings by Section
-- ============================================================================
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
-- PART 7: Verification & Audit Diagnostics
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
