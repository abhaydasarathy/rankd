-- ============================================================================
-- Migration: 20260927_backend_integrity_and_atomic_rpc.sql
-- Description: Backend Integrity Fixes, Atomic Verification RPC, Auto Faculty
--              Mapping, Schema Constraints Audit, and RLS Protections.
-- Project Ref: edrnoswnadjcsftekplu
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FIX 1: Broaden Certification Provider Constraint
-- ----------------------------------------------------------------------------
ALTER TABLE public.student_certifications
  DROP CONSTRAINT IF EXISTS student_certifications_provider_check;

ALTER TABLE public.student_certifications
  ADD CONSTRAINT student_certifications_provider_check
    CHECK (provider IN (
      'CISCO', 'CCNA', 'CCNP', 'MCNA', 'MCNP', 'MATLAB', 'REDHAT', 'IBM',
      'NPTEL',
      'COURSERA',
      'PROGRAMMING',
      'UDEMY',
      'OTHER'
    ));

-- ----------------------------------------------------------------------------
-- FIX 2: Canonicalize Category IDs in Submissions & Delete Aliases
-- ----------------------------------------------------------------------------
UPDATE public.student_submissions
  SET category_id = 'coding-platforms'
  WHERE category_id IN ('coding_practice', 'coding', 'leetcode', 'coding_platforms');

UPDATE public.student_submissions
  SET category_id = 'inhouse-projects'
  WHERE category_id IN ('inhouse_projects', 'inhouse', 'in-house-projects');

DELETE FROM public.placement_categories 
WHERE id IN ('coding_practice', 'coding', 'leetcode', 'coding_platforms', 'inhouse_projects', 'inhouse', 'in-house-projects');

-- ----------------------------------------------------------------------------
-- FIX 3: Clean up Phantom Academics Submissions
-- (Academics scores are calculated dynamically from profiles table attributes)
-- ----------------------------------------------------------------------------
DELETE FROM public.student_submissions 
WHERE category_id = 'academics';

-- ----------------------------------------------------------------------------
-- FIX 4: Automatic Faculty-Student Mapping Trigger & Backfill
-- ----------------------------------------------------------------------------
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

-- Backfill mappings for all existing students & faculty
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

-- ----------------------------------------------------------------------------
-- FIX 5 & 9: Column Normalization & Atomic Verification RPC Functions
-- ----------------------------------------------------------------------------
-- Ensure both verifier_id and verified_by and verified_at exist
ALTER TABLE public.student_submissions
  ADD COLUMN IF NOT EXISTS verifier_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verifier_notes TEXT;

-- Atomic Verification RPC
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

  -- Fetch the submission
  SELECT * INTO v_submission FROM public.student_submissions WHERE id = p_submission_id AND status = 'PENDING';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found or not in PENDING state';
  END IF;

  v_student_id := v_submission.student_id;
  v_cat_id := v_submission.category_id;

  -- Fetch category for max marks cap check
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

-- Atomic Rejection RPC
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
  -- Gate: caller must be faculty or admin
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

  -- 1. Update submission atomically
  UPDATE public.student_submissions
  SET
    status = 'REJECTED',
    awarded_marks = 0,
    verifier_id = p_faculty_id,
    verified_by = p_faculty_id,
    verifier_notes = p_rejection_reason,
    updated_at = now()
  WHERE id = p_submission_id;

  -- 2. Insert audit log
  INSERT INTO public.verification_logs (
    submission_id, faculty_id, action,
    previous_status, new_status,
    previous_marks, awarded_marks, notes
  ) VALUES (
    p_submission_id, p_faculty_id, 'REJECT',
    'PENDING', 'REJECTED',
    0, 0, p_rejection_reason
  );

  -- 3. Insert student inbox notification message
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

-- ----------------------------------------------------------------------------
-- FIX 6: Normalize Section Strings in Profiles
-- ----------------------------------------------------------------------------
UPDATE public.profiles
SET section = REPLACE(TRIM(section), 'Section ', '')
WHERE section LIKE 'Section %';

-- ----------------------------------------------------------------------------
-- FIX 7: Upsert All 11 Canonical Placement Categories
-- ----------------------------------------------------------------------------
INSERT INTO public.placement_categories (id, title, short_description, rubric_text, icon_name, max_marks, display_order) VALUES
('academics',        'Academics',                    '10th, 12th & CGPA',            '10th (2.5m) + 12th (2.5m) + CGPA (5m)',                                    'GraduationCap', 10, 1),
('github',           'GitHub Profile',               'Contributions & repos',         'Repos (5m) + Frequency (2m) + Community (3m) + Collabs (5m)',               'Github',        15, 2),
('coding-platforms', 'Coding Practice Platform',     'Badges & problems solved',      'Badges (5m) + Medium+Hard solved (5m)',                                     'Code2',         10, 3),
('internship',       'Internship Experience',        'Work experience',               'IIT/NIT/SRM (5m), Fortune 500 (4m), Startup (3m), <3mo (2m), Paid (+1m)',   'Briefcase',     10, 4),
('skillset',         'Skillset & Certifications',    'Professional certifications',   'CISCO/IBM (5m), NPTEL (3m), Coursera (2m), Programming (1m), Udemy (0.5m)', 'Award',         15, 5),
('projects',         'Projects Done',                'Academic & personal projects',  'IIT/DRDO (5m), Govt (4m), Web/Mobile (3m), Mini (1-2m) — max 3',           'FolderOpen',    5,  6),
('fullstack',        'Full Stack Developer Exp.',    'End-to-end project',            'One production FSD project = 5m',                                           'Layers',        5,  7),
('hackathons',       'Competitions & Hackathons',    'Competition prizes',            '1st (5m), 2nd (4m), 3rd (3m), Participation (1m) — max 4',                 'Trophy',        10, 8),
('inhouse-projects', 'In-House Projects',            'SRMIST R&D projects',          'Faculty R&D project (4m each) — max 2',                                     'FlaskConical',  8,  9),
('membership',       'Professional Membership',      'IEEE, ACM, CSI, IET, ISTE',    'Valid certificate for any recognized body = 2m',                            'Users',         2,  10),
('assessments',      'SHL / Talent / NCET',         'Standardized assessment score', '90-100→10m, 80-89→9m, 70-79→8m, 65-69→7m, 60-64→6m, 55-59→5m, 50-54→4m, 40-49→3m, 30-39→2m, 25-29→1m', 'BarChart2', 10, 11)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  max_marks = EXCLUDED.max_marks,
  display_order = EXCLUDED.display_order,
  rubric_text = EXCLUDED.rubric_text,
  updated_at = now();

-- ----------------------------------------------------------------------------
-- FIX 8: Prevent Students from Self-Verifying Submissions via RLS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Update submissions policy" ON public.student_submissions;
DROP POLICY IF EXISTS "Students can update own pending submissions" ON public.student_submissions;
DROP POLICY IF EXISTS "Students update own pending submissions" ON public.student_submissions;
DROP POLICY IF EXISTS "Faculty update submissions" ON public.student_submissions;

-- Students may only edit their own submissions while in DRAFT or PENDING,
-- and the WITH CHECK constraint strictly guarantees status cannot be set to VERIFIED.
CREATE POLICY "Students update own pending submissions"
  ON public.student_submissions
  FOR UPDATE
  USING (
    student_id = auth.uid()
    AND status IN ('DRAFT', 'PENDING')
  )
  WITH CHECK (
    student_id = auth.uid()
    AND status IN ('DRAFT', 'PENDING')
  );

-- Faculty and admins can update submissions directly or via RPC
CREATE POLICY "Faculty update submissions"
  ON public.student_submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin')
    )
  );

-- Ensure partial unique index covers verified submissions
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_verified_per_category
  ON public.student_submissions (student_id, category_id)
  WHERE status = 'VERIFIED';
