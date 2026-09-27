-- Migration: Relax student_submissions_awarded_marks_check to allow up to 100
ALTER TABLE public.student_submissions
  DROP CONSTRAINT IF EXISTS student_submissions_awarded_marks_check;

ALTER TABLE public.student_submissions
  ADD CONSTRAINT student_submissions_awarded_marks_check
    CHECK (awarded_marks >= 0 AND awarded_marks <= 100);
