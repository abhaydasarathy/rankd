-- ============================================================================
-- Migration: 20260924_faculty_portal_rebuild.sql
-- Description: Complete Faculty Portal Rebuild + Student-Faculty Workflow
-- 1A: faculty_student_mappings table + RLS + seed
-- 1B: student_messages table + RLS
-- 1C: partial unique index idx_one_verified_per_category
-- 1D: awarded_marks check constraint <= 100
-- 1E: student_placement_scores view recreation
-- ============================================================================

-- 1A: Faculty-Student mapping table
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

DROP POLICY IF EXISTS "Admins manage mappings" ON public.faculty_student_mappings;
CREATE POLICY "Admins manage mappings"
  ON public.faculty_student_mappings FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty','admin')));

CREATE INDEX IF NOT EXISTS idx_fsm_faculty ON public.faculty_student_mappings(faculty_id);
CREATE INDEX IF NOT EXISTS idx_fsm_student ON public.faculty_student_mappings(student_id);

-- Map existing test accounts — faculty sees the test student
INSERT INTO public.faculty_student_mappings (faculty_id, student_id)
VALUES (
  'abd96f64-ad9b-4938-a8f6-751ddecf9815',
  '87e6cc14-a071-4db1-9b54-4cbd6bdbc2b1'
) ON CONFLICT DO NOTHING;

-- 1B: Student inbox / faculty feedback messages table
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

DROP POLICY IF EXISTS "Students read own messages" ON public.student_messages;
CREATE POLICY "Students read own messages"
  ON public.student_messages FOR SELECT
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students mark own messages read" ON public.student_messages;
CREATE POLICY "Students mark own messages read"
  ON public.student_messages FOR UPDATE
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Faculty insert messages" ON public.student_messages;
CREATE POLICY "Faculty insert messages"
  ON public.student_messages FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty','admin'))
  );

CREATE INDEX IF NOT EXISTS idx_messages_student ON public.student_messages(student_id, is_read, created_at DESC);

-- 1C: Partial unique index: only one VERIFIED per student per category at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_verified_per_category
  ON public.student_submissions (student_id, category_id)
  WHERE status = 'VERIFIED';

-- 1D: Fix: awarded_marks constraint to 100
ALTER TABLE public.student_submissions
  DROP CONSTRAINT IF EXISTS student_submissions_awarded_marks_check;
ALTER TABLE public.student_submissions
  ADD CONSTRAINT student_submissions_awarded_marks_check
    CHECK (awarded_marks >= 0 AND awarded_marks <= 100);

-- 1E: Recreate student_placement_scores view with corrected pending/verified logic
CREATE OR REPLACE VIEW public.student_placement_scores AS
WITH academics_calc AS (
  SELECT
    id AS student_id,
    LEAST(10.0, (
      CASE WHEN tenth_pct >= 96 THEN 2.5 WHEN tenth_pct >= 91 THEN 2.0
           WHEN tenth_pct >= 86 THEN 1.5 WHEN tenth_pct >= 75 THEN 1.0
           WHEN tenth_pct > 0 THEN 0.5 ELSE 0.0 END +
      CASE WHEN twelfth_pct >= 96 THEN 2.5 WHEN twelfth_pct >= 91 THEN 2.0
           WHEN twelfth_pct >= 86 THEN 1.5 WHEN twelfth_pct >= 75 THEN 1.0
           WHEN twelfth_pct > 0 THEN 0.5 ELSE 0.0 END +
      CASE WHEN cgpa > 9.5 THEN 5.0 WHEN cgpa >= 9.1 THEN 4.0
           WHEN cgpa >= 8.6 THEN 3.0 WHEN cgpa >= 7.5 THEN 2.0
           WHEN cgpa > 0 THEN 1.0 ELSE 0.0 END
    ))::numeric(4,2) AS academics_score
  FROM public.profiles WHERE role = 'student'
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
  p.id AS student_id, p.name, p.full_name, p.email, p.reg_no,
  p.department, p.programme, p.section, p.batch, p.cgpa,
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
    COALESCE(s.github_score,0) + COALESCE(s.coding_score,0) +
    COALESCE(s.internship_score,0) + COALESCE(s.skillset_score,0) +
    COALESCE(s.projects_score,0) + COALESCE(s.fullstack_score,0) +
    COALESCE(s.hackathons_score,0) + COALESCE(s.inhouse_score,0) +
    COALESCE(s.membership_score,0) + COALESCE(s.assessments_score,0)
  ))::numeric(5,2) AS total_verified_score,
  COALESCE(s.pending_marks_total, 0) AS total_pending_score,
  COALESCE(s.pending_submissions_count, 0) AS pending_submissions_count,
  COALESCE(s.verified_submissions_count, 0) AS verified_submissions_count
FROM public.profiles p
JOIN academics_calc a ON p.id = a.student_id
LEFT JOIN submissions_summary s ON p.id = s.student_id
WHERE p.role = 'student';
