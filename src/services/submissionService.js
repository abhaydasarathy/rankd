import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";
import { normalizeCategoryId } from "./categoryService.js";
import { uploadProofDocument } from "./proofService.js";

/**
 * Normalize certification provider to match database check constraint:
 * ('CISCO', 'CCNA', 'CCNP', 'MCNA', 'MCNP', 'MATLAB', 'REDHAT', 'IBM', 'NPTEL', 'COURSERA', 'PROGRAMMING', 'UDEMY', 'OTHER')
 */
export function normalizeCertProvider(raw = '') {
  const p = (raw || '').toUpperCase().trim();
  if (['CISCO', 'CCNA', 'CCNP', 'MCNA', 'MCNP', 'MATLAB', 'REDHAT', 'IBM'].some((t) => p.includes(t))) {
    if (p.includes('CCNA')) return 'CCNA';
    if (p.includes('CCNP')) return 'CCNP';
    if (p.includes('MCNA')) return 'MCNA';
    if (p.includes('MCNP')) return 'MCNP';
    if (p.includes('MATLAB')) return 'MATLAB';
    if (p.includes('REDHAT')) return 'REDHAT';
    if (p.includes('IBM')) return 'IBM';
    return 'CISCO';
  }
  if (p.includes('NPTEL')) return 'NPTEL';
  if (p.includes('COURSERA')) return 'COURSERA';
  if (p.includes('UDEMY')) return 'UDEMY';
  if (['PYTHON', 'JAVA', 'C++', 'CPP', 'C PROGRAMMING', 'JAVASCRIPT'].some((t) => p.includes(t))) return 'PROGRAMMING';
  return 'OTHER';
}

/**
 * Format raw database submission record to frontend application model
 */
export function formatSubmission(raw) {
  if (!raw) return null;
  let details = raw.details || {};
  if (typeof details === 'string') {
    try {
      details = JSON.parse(details);
    } catch (e) {
      details = {};
    }
  }
  const proofUrl = raw.proof_url || raw.proofUrl || details.proof_url || details.proofUrl || details.publicUrl || (Array.isArray(details.proofDocuments) ? details.proofDocuments[0]?.publicUrl : null) || null;
  return {
    id: raw.id,
    studentId: raw.student_id,
    student_id: raw.student_id,
    categoryId: normalizeCategoryId(raw.category_id),
    category_id: normalizeCategoryId(raw.category_id),
    title: raw.title || "Placement Submission",
    status: raw.status || "PENDING",
    awardedMarks: Number(raw.awarded_marks || 0),
    awarded_marks: Number(raw.awarded_marks || 0),
    details: details,
    proofUrl: proofUrl,
    proof_url: proofUrl,
    submittedAt: raw.created_at,
    verifiedAt: raw.verified_at || raw.updated_at || null,
    verifiedBy: raw.verifier_id || raw.verified_by || null,
    verifierNotes: raw.verifier_notes || null,
    verifier_notes: raw.verifier_notes || null,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    // Included when joined with profiles
    studentName: raw.profiles?.name || raw.profiles?.full_name || raw.student_name || null,
    studentEmail: raw.profiles?.email || raw.student_email || null,
    studentRegNo: raw.profiles?.reg_no || raw.student_reg_no || null,
    studentDepartment: raw.profiles?.department || null,
    studentSection: raw.profiles?.section || null,
  };
}

/**
 * Fetch all submissions for a specific student
 */
export async function getStudentSubmissions(studentId) {
  if (!studentId) return [];

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("student_submissions")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        return data.map(formatSubmission);
      }
    } catch (err) {
      console.warn("Notice: Fetching student submissions from DB fallback:", err);
    }
  }

  return [];
}

/**
 * Fetch all submissions across students (for faculty evaluation)
 */
export async function getAllSubmissions(statusFilter = null) {
  if (isSupabaseConfigured()) {
    try {
      let query = supabase
        .from("student_submissions")
        .select("*, profiles!student_submissions_student_id_fkey (id, name, full_name, email, reg_no, department, section, cgpa)")
        .order("created_at", { ascending: false });

      if (statusFilter && statusFilter !== "ALL") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (!error && Array.isArray(data)) {
        return data.map(formatSubmission);
      }
      if (error) {
        // Fallback query without embedding if foreign key relationship differs
        const { data: rawData } = await supabase.from("student_submissions").select("*");
        if (Array.isArray(rawData)) {
          return rawData.map(formatSubmission);
        }
      }
    } catch (err) {
      console.warn("Notice: Fetching all submissions error:", err);
    }
  }
  return [];
}

/**
 * Upsert pattern: only one active submission per category per student.
 * Cancels existing PENDING submission for category and inserts new PENDING submission.
 */
export async function upsertStudentSubmission({
  studentId, categoryId, title, details, proofUrl, calculatedMarks
}) {
  const normCat = normalizeCategoryId(categoryId);
  // Step 1: Supersede existing PENDING for this category
  try {
    const { error: cancelError } = await supabase
      .from('student_submissions')
      .update({
        status: 'REJECTED',
        verifier_notes: 'Superseded by new submission',
        updated_at: new Date().toISOString()
      })
      .eq('student_id', studentId)
      .eq('category_id', normCat)
      .eq('status', 'PENDING');

    if (cancelError) {
      console.warn('Could not update old pending status to REJECTED, deleting old pending row:', cancelError);
      await supabase
        .from('student_submissions')
        .delete()
        .eq('student_id', studentId)
        .eq('category_id', normCat)
        .eq('status', 'PENDING');
    }
  } catch (cErr) {
    console.warn('Supersede pending error (non-blocking):', cErr);
  }

  const finalDetails = { ...(details || {}) };
  if (calculatedMarks !== undefined && finalDetails.calculated_marks === undefined) {
    finalDetails.calculated_marks = calculatedMarks;
  }

  const marks = calculatedMarks !== undefined ? Number(calculatedMarks) : Number(finalDetails.calculated_marks || 0);

  // Step 2: Insert new PENDING submission
  const { data, error } = await supabase
    .from('student_submissions')
    .insert({
      student_id: studentId,
      category_id: normCat,
      title: title || `${normCat} submission`,
      details: finalDetails,
      proof_url: proofUrl || null,
      awarded_marks: marks || 0,
      status: 'PENDING',           // ALWAYS PENDING — never VERIFIED from student side
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select();

  if (error) throw error;
  if (!data || data.length === 0) throw new Error('Submission insert returned no data');

  persistToCategoryEntity(studentId, data[0].id, normCat, finalDetails, marks).catch(() => {});
  return data[0];
}

/**
 * Create or replace a submission with evidence details and optional proof document
 */
export async function createSubmission({
  studentId,
  categoryId,
  title,
  details = {},
  proofFile = null,
  proofUrl = null,
  awardedMarks = 0,
  status = "PENDING",
}) {
  if (!studentId) throw new Error("Student ID is required to create a submission");
  if (!categoryId) throw new Error("Category ID is required to create a submission");

  const normalizedCat = normalizeCategoryId(categoryId);
  let finalProofUrl = proofUrl;

  // 1. Upload proof file if provided
  if (proofFile) {
    try {
      const uploadRes = await uploadProofDocument(studentId, proofFile);
      if (uploadRes && uploadRes.publicUrl) {
        finalProofUrl = uploadRes.publicUrl;
      }
    } catch (uploadErr) {
      console.warn("Proof upload notice:", uploadErr);
    }
  }

  // 2. Prepare envelope row for student_submissions (ensure PENDING for student inserts)
  const submissionPayload = {
    student_id: studentId,
    category_id: normalizedCat,
    title: title || `${normalizedCat} submission`,
    status: status || "PENDING",
    awarded_marks: Number(awardedMarks || 0),
    proof_url: finalProofUrl,
    details: details,
  };

  let savedSubmission = null;

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("student_submissions")
        .insert([submissionPayload])
        .select();

      if (!error && Array.isArray(data) && data.length > 0) {
        savedSubmission = formatSubmission(data[0]);
      } else if (error) {
        console.warn("Notice: student_submissions insert warning:", error.message);
      }
    } catch (err) {
      console.warn("Notice: student_submissions insert exception:", err.message);
    }

    // 3. Attempt to write to category-specific normalized table if present
    if (savedSubmission && savedSubmission.id) {
      persistToCategoryEntity(studentId, savedSubmission.id, normalizedCat, details, Number(awardedMarks || 0)).catch(
        (entErr) => console.warn("Notice: normalized entity insert optional fallback:", entErr.message)
      );
    }
  }

  if (!savedSubmission) {
    // Local memory model
    savedSubmission = {
      id: `local-sub-${Date.now()}`,
      studentId,
      categoryId: normalizedCat,
      title: title || `${normalizedCat} submission`,
      status: status || "PENDING",
      awardedMarks: Number(awardedMarks || 0),
      proofUrl: finalProofUrl,
      details,
      submittedAt: new Date().toISOString(),
    };
  }

  return savedSubmission;
}

/**
 * Asynchronously persists details to category specific entity tables if available
 */
async function persistToCategoryEntity(studentId, submissionId, categoryId, details, marks) {
  if (!isSupabaseConfigured()) return;

  try {
    switch (categoryId) {
      case "internship":
        await supabase.from("student_internships").insert([{
          student_id: studentId,
          submission_id: submissionId,
          company_name: details.companyName || details.company || "Company",
          company_tier: details.tier || "Small / Mid Co",
          duration_months: Number(details.durationMonths || details.duration || 1),
          is_paid: Boolean(details.isPaid),
          calculated_marks: marks,
        }]);
        break;

      case "skillset":
        await supabase.from("student_certifications").insert([{
          student_id: studentId,
          submission_id: submissionId,
          cert_name: details.certName || details.title || "Certification",
          provider: normalizeCertProvider(details.provider || details.issuer || details.organization || "CISCO"),
          credential_id: details.credentialId || null,
          credential_url: details.credentialUrl || null,
          calculated_marks: marks,
        }]);
        break;

      case "projects":
        await supabase.from("student_projects").insert([{
          student_id: studentId,
          submission_id: submissionId,
          title: details.title || "Project",
          project_type: details.projectType || "WEB",
          github_url: details.githubUrl || null,
          live_url: details.liveUrl || null,
          calculated_marks: marks,
        }]);
        break;

      case "fullstack":
        await supabase.from("student_fullstack").insert([{
          student_id: studentId,
          submission_id: submissionId,
          title: details.name || details.title || "Full Stack Application",
          frontend_tech: details.frontend || "Full Stack Web App",
          backend_tech: details.backend || "API Service",
          database_tech: details.database || "Database",
          github_url: details.githubUrl || details.github_url || details.repoUrl || details.repo_url || null,
          live_url: details.hostedUrl || details.hosted_url || details.liveUrl || details.live_url || null,
          calculated_marks: marks || details.calculated_marks || 5,
        }]);
        break;

      case "hackathons":
        await supabase.from("student_hackathons").insert([{
          student_id: studentId,
          submission_id: submissionId,
          event_name: details.eventName || details.event || "Hackathon",
          prize_placement: details.prize || details.placement || "Participation",
          calculated_marks: marks,
        }]);
        break;

      case "inhouse-projects":
        await supabase.from("student_inhouse_projects").insert([{
          student_id: studentId,
          submission_id: submissionId,
          title: details.title || "In-House R&D Project",
          faculty_mentor: details.facultyMentor || details.mentor || "Faculty Mentor",
          calculated_marks: marks || 4,
        }]);
        break;

      case "membership":
        await supabase.from("student_memberships").insert([{
          student_id: studentId,
          submission_id: submissionId,
          organization: details.organization || "IEEE",
          membership_id: details.membershipId || null,
          calculated_marks: marks || 2,
        }]);
        break;

      case "assessments":
        await supabase.from("student_assessments").insert([{
          student_id: studentId,
          submission_id: submissionId,
          assessment_type: details.assessmentType || "SHL",
          raw_score: Number(details.rawScore || details.score || 0),
          calculated_marks: marks,
        }]);
        break;

      default:
        break;
    }
  } catch (err) {
    // Non-fatal if specific table schema is not yet deployed
  }
}

/**
 * Delete a submission (for students recalling pending submissions)
 */
export async function deleteSubmission(submissionId, studentId) {
  if (!submissionId) return false;

  if (isSupabaseConfigured()) {
    try {
      let query = supabase.from("student_submissions").delete().eq("id", submissionId);
      if (studentId) {
        query = query.eq("student_id", studentId);
      }
      const { error } = await query;
      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Failed to delete submission:", err);
      return false;
    }
  }
  return true;
}
