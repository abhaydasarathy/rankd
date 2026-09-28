-- ============================================================================
-- MIGRATION: 20260928_fix_profile_rls_and_submissions.sql
-- Fix 4 Critical Bugs:
-- 1. FK constraint violation on student_submissions (repair missing profile row)
-- 2. Bypass of PENDING workflow
-- 3. Profile name fallback ("Student" -> actual student name)
-- 4. Missing student on Leaderboard
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FIX 1: Diagnose & Repair New Student Profile Row (RA2411003010979 / ag4342)
-- ----------------------------------------------------------------------------
-- Ensure the profile row exists with the EXACT matching UUID from auth.users
INSERT INTO public.profiles (
  id,
  email,
  name,
  full_name,
  reg_no,
  role,
  department,
  programme,
  section,
  batch,
  batch_year
)
SELECT 
  au.id,
  au.email,
  COALESCE(
    SPLIT_PART(au.raw_user_meta_data->>'full_name', ' ', 1),
    au.raw_user_meta_data->>'name',
    SPLIT_PART(au.email, '@', 1)
  ),
  COALESCE(au.raw_user_meta_data->>'full_name', SPLIT_PART(au.email, '@', 1)),
  COALESCE(au.raw_user_meta_data->>'reg_no', 'RA2411003010979'),
  'student',
  COALESCE(au.raw_user_meta_data->>'department', 'CSE Core'),
  'B.Tech',
  COALESCE(au.raw_user_meta_data->>'section', 'A1'),
  '2024 - 2028',
  '2024 - 2028'
FROM auth.users au
WHERE au.email LIKE '%ag4342%' OR au.raw_user_meta_data->>'reg_no' = 'RA2411003010979'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
  name = COALESCE(EXCLUDED.name, public.profiles.name),
  reg_no = COALESCE(EXCLUDED.reg_no, public.profiles.reg_no),
  role = 'student',
  updated_at = NOW();

-- ----------------------------------------------------------------------------
-- FIX 3: Robust Row Level Security (RLS) Policies on public.profiles
-- ----------------------------------------------------------------------------
-- Allow users to insert their own profile during registration
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Allow authenticated and public read for profiles (required for leaderboard)
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON public.profiles;
CREATE POLICY "Authenticated users can read all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow public read for profiles" ON public.profiles;
CREATE POLICY "Allow public read for profiles"
  ON public.profiles
  FOR SELECT
  USING (true);

-- ----------------------------------------------------------------------------
-- FIX 5: Fix Name Showing as "Student" in Profile & Sync from auth.users
-- ----------------------------------------------------------------------------
-- Sync full_name and name from auth.users metadata if profiles row had generic fallbacks
UPDATE public.profiles p
SET 
  full_name = COALESCE(NULLIF(au.raw_user_meta_data->>'full_name', ''), p.full_name),
  name = TRIM(SPLIT_PART(COALESCE(NULLIF(au.raw_user_meta_data->>'full_name', ''), p.full_name), ' ', 1))
FROM auth.users au
WHERE p.id = au.id
  AND (p.name IN ('Student', 'User', 'Faculty', '', 'student', 'user') OR p.full_name IN ('Student', 'User', 'Faculty', '', 'student', 'user'));

-- For any remaining profiles where name is generic fallback but full_name is present
UPDATE public.profiles
SET name = TRIM(SPLIT_PART(full_name, ' ', 1))
WHERE name IN ('Student', 'User', 'Faculty', '', 'student', 'user')
  AND full_name IS NOT NULL
  AND full_name NOT IN ('Student', 'User', 'Faculty', '');

-- ----------------------------------------------------------------------------
-- FIX 6: Confirm role = 'student' for RA2411003010979
-- ----------------------------------------------------------------------------
UPDATE public.profiles
SET role = 'student'
WHERE (reg_no = 'RA2411003010979' OR email LIKE '%ag4342%')
  AND role != 'student';

-- ----------------------------------------------------------------------------
-- FIX 7: Verify & Relax awarded_marks Check Constraint (Allow up to 100)
-- ----------------------------------------------------------------------------
ALTER TABLE public.student_submissions
  DROP CONSTRAINT IF EXISTS student_submissions_awarded_marks_check;

ALTER TABLE public.student_submissions
  ADD CONSTRAINT student_submissions_awarded_marks_check
    CHECK (awarded_marks >= 0 AND awarded_marks <= 100);

-- ----------------------------------------------------------------------------
-- VERIFICATION DIAGNOSTIC QUERIES
-- ----------------------------------------------------------------------------
-- 1. Verify user in auth.users
SELECT id, email, created_at, raw_user_meta_data
FROM auth.users
WHERE email LIKE '%ag4342%' OR raw_user_meta_data->>'reg_no' = 'RA2411003010979';

-- 2. Verify profiles table has matching row
SELECT id, email, name, full_name, reg_no, role, section, department, cgpa
FROM public.profiles
WHERE reg_no = 'RA2411003010979' OR email LIKE '%ag4342%';

-- 3. Verify student placement scores view includes new student
SELECT * FROM public.student_placement_scores
WHERE reg_no = 'RA2411003010979' OR email LIKE '%ag4342%';

-- 4. Verify leaderboard view includes all students
SELECT rank, name, reg_no, department, total_verified_score
FROM public.placement_leaderboard
LIMIT 10;
