import { supabase } from '../lib/supabaseClient.js';
import { PLACEMENT_CATEGORIES } from '../data/categories.js';

const CATEGORY_MAP = PLACEMENT_CATEGORIES.reduce((acc, cat) => {
  acc[cat.id] = {
    id: cat.id,
    title: cat.title,
    max_marks: cat.maxMarks,
    icon_name: cat.iconName,
  };
  return acc;
}, {});

export function getCategoryInfo(categoryId) {
  if (!categoryId) return { id: 'general', title: 'General Claim', max_marks: 10, icon_name: 'FileText' };
  const normalized = categoryId.toLowerCase().trim();
  return (
    CATEGORY_MAP[normalized] ||
    CATEGORY_MAP[normalized.replace(/_/g, '-')] ||
    CATEGORY_MAP[normalized.replace(/-/g, '_')] || {
      id: categoryId,
      title: categoryId.replace(/[-_]/g, ' ').toUpperCase(),
      max_marks: 10,
      icon_name: 'FileText',
    }
  );
}

// Normalize section string (e.g. "Section A1" -> "A1")
export function normalizeSection(sec) {
  if (!sec) return '';
  return sec.toString().replace(/^section\s*/i, '').trim().toUpperCase();
}

// Compare two sections for equality (handles "Section A1" vs "A1", and "All" for all sections)
export function isSameSection(secA, secB) {
  const normA = normalizeSection(secA);
  const normB = normalizeSection(secB);
  if (!normA || !normB) return false;
  if (normA === 'ALL' || normB === 'ALL') return true;
  return normA === normB;
}

// Get all students mapped to this faculty member (by matching section or explicit mapping)
export async function getFacultyStudents(facultyId) {
  if (!facultyId) return [];

  // 1. Fetch faculty profile to determine their section
  let facultySection = null;
  try {
    const { data: facProf } = await supabase
      .from('profiles')
      .select('id, section')
      .eq('id', facultyId)
      .maybeSingle();

    if (facProf) {
      facultySection = facProf.section;
    }
  } catch (err) {
    console.warn('Notice: Error fetching faculty profile:', err);
  }

  const facNorm = normalizeSection(facultySection);

  // 2. Fetch explicit mappings from faculty_student_mappings
  const mappedStudentMap = new Map();
  try {
    const { data, error } = await supabase
      .from('faculty_student_mappings')
      .select(`
        student:student_id (
          id, name, full_name, email, reg_no, department, section, batch, cgpa, avatar_url, tenth_pct, twelfth_pct
        )
      `)
      .eq('faculty_id', facultyId);

    if (!error && data && data.length > 0) {
      data.forEach((row) => {
        if (row.student && row.student.id) {
          mappedStudentMap.set(row.student.id, row.student);
        }
      });
    }
  } catch (err) {
    // faculty_student_mappings table may not exist
  }

  // 3. Fetch student profiles
  const { data: allStudents, error: allErr } = await supabase
    .from('profiles')
    .select('id, name, full_name, email, reg_no, department, section, batch, cgpa, avatar_url, tenth_pct, twelfth_pct')
    .eq('role', 'student')
    .order('name', { ascending: true });

  if (allErr) {
    console.error('getFacultyStudents fallback error:', allErr);
    return Array.from(mappedStudentMap.values());
  }

  // If faculty has 'ALL' or unassigned section, return all students
  if (!facNorm || facNorm === 'ALL') {
    (allStudents || []).forEach((st) => {
      if (!mappedStudentMap.has(st.id)) {
        mappedStudentMap.set(st.id, st);
      }
    });
    return Array.from(mappedStudentMap.values());
  }

  // Otherwise union explicit mappings with students belonging to the same section
  (allStudents || []).forEach((st) => {
    if (isSameSection(st.section, facNorm)) {
      if (!mappedStudentMap.has(st.id)) {
        mappedStudentMap.set(st.id, st);
      }
    }
  });

  return Array.from(mappedStudentMap.values());
}

// Get all PENDING submissions for students mapped to this faculty (by section or explicit mapping)
export async function getFacultyPendingSubmissions(facultyId) {
  if (!facultyId) return [];

  // 1. Fetch faculty profile to determine their section
  let facultySection = null;
  try {
    const { data: facProf } = await supabase
      .from('profiles')
      .select('id, section')
      .eq('id', facultyId)
      .maybeSingle();

    if (facProf) {
      facultySection = facProf.section;
    }
  } catch (err) {
    console.warn('Notice: Error fetching faculty profile:', err);
  }

  const facNorm = normalizeSection(facultySection);

  // 2. Collect explicit mappings
  const studentIdSet = new Set();
  try {
    const { data: mappings, error: mapErr } = await supabase
      .from('faculty_student_mappings')
      .select('student_id')
      .eq('faculty_id', facultyId);

    if (!mapErr && mappings && mappings.length > 0) {
      mappings.forEach((m) => {
        if (m.student_id) studentIdSet.add(m.student_id);
      });
    }
  } catch (err) {
    // faculty_student_mappings table may not exist
  }

  // 3. If faculty coordinates a section, also include students from that section
  if (facNorm && facNorm !== 'ALL') {
    const { data: sectionStudents } = await supabase
      .from('profiles')
      .select('id, section')
      .eq('role', 'student');

    (sectionStudents || []).forEach((st) => {
      if (isSameSection(st.section, facNorm)) {
        studentIdSet.add(st.id);
      }
    });

    // If faculty coordinates a section and no students are mapped/found in that section,
    // return an empty queue rather than leaking other sections' submissions!
    if (studentIdSet.size === 0) {
      return [];
    }
  }

  let query = supabase
    .from('student_submissions')
    .select(`
      *,
      student:profiles!student_submissions_student_id_fkey(
        id, name, full_name, email, reg_no, department, section, cgpa
      )
    `)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false });

  // If section-restricted or explicitly mapped, filter submissions
  if (studentIdSet.size > 0) {
    query = query.in('student_id', Array.from(studentIdSet));
  }

  const { data, error } = await query;
  if (error) {
    console.error('getFacultyPendingSubmissions query error, falling back to flat query:', error);
    // Flat query fallback without foreign key join in case schema differs
    let flatQuery = supabase
      .from('student_submissions')
      .select('*')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });

    if (studentIdSet.size > 0) {
      flatQuery = flatQuery.in('student_id', Array.from(studentIdSet));
    }

    const { data: flatData, error: flatErr } = await flatQuery;
    if (flatErr) {
      console.error('getFacultyPendingSubmissions flat query error:', flatErr);
      throw error;
    }

    const uniqueStudentIds = Array.from(new Set((flatData || []).map((s) => s.student_id).filter(Boolean)));
    let profileMap = {};
    if (uniqueStudentIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, full_name, email, reg_no, department, section, cgpa')
        .in('id', uniqueStudentIds);

      if (profiles) {
        profileMap = profiles.reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {});
      }
    }

    return (flatData || []).map((sub) => ({
      ...sub,
      category: getCategoryInfo(sub.category_id),
      student: profileMap[sub.student_id] || {
        id: sub.student_id,
        name: 'Student',
        full_name: 'Student',
        email: '',
        reg_no: 'REG-PENDING',
        department: 'SRMIST',
      },
    }));
  }

  return (data || []).map((sub) => ({
    ...sub,
    category: getCategoryInfo(sub.category_id),
    student: sub.student || {
      id: sub.student_id,
      name: 'Student',
      full_name: 'Student',
      email: '',
      reg_no: 'REG-PENDING',
      department: 'SRMIST',
    },
  }));
}

// Get all submissions (any status) for a specific student — for the faculty inspect view
export async function getStudentSubmissionsForFaculty(studentId) {
  if (!studentId) return [];

  const { data, error } = await supabase
    .from('student_submissions')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getStudentSubmissionsForFaculty error:', error);
    throw error;
  }
  return (data || []).map((sub) => ({
    ...sub,
    category: getCategoryInfo(sub.category_id),
  }));
}

// Verify a submission — atomic PostgreSQL RPC with graceful fallback
export async function verifySubmission({
  submissionId,
  facultyId,
  awardedMarks,
  verifierNotes,
  studentId,
  categoryTitle,
}) {
  if (!submissionId) throw new Error('Submission ID is required for verification.');

  // Attempt atomic PostgreSQL RPC first
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('rpc_verify_submission', {
      p_submission_id: submissionId,
      p_faculty_id: facultyId,
      p_awarded_marks: Number(awardedMarks || 0),
      p_verifier_notes: verifierNotes || null,
    });

    if (!rpcErr) {
      return rpcData;
    }
    console.warn('Notice: rpc_verify_submission failed, falling back to direct write:', rpcErr.message);
  } catch (rpcEx) {
    console.warn('Notice: rpc_verify_submission exception, falling back to direct write:', rpcEx);
  }

  // Fallback direct writes (ensures backward compatibility if RPC is pending SQL run)
  let finalStudentId = studentId;
  let finalCategoryTitle = categoryTitle;
  let categoryId = null;
  let subDetails = null;

  const { data: subData } = await supabase
    .from('student_submissions')
    .select('student_id, category_id, details')
    .eq('id', submissionId)
    .maybeSingle();

  if (subData) {
    finalStudentId = finalStudentId || subData.student_id;
    categoryId = subData.category_id;
    subDetails = subData.details || {};
    finalCategoryTitle = finalCategoryTitle || getCategoryInfo(subData.category_id)?.title || subData.category_id || 'Submission';
  }

  // 1. Update the submission
  const updatePayload = {
    status: 'VERIFIED',
    awarded_marks: Number(awardedMarks || 0),
    verifier_id: facultyId || null,
    verifier_notes: verifierNotes || null,
    updated_at: new Date().toISOString(),
  };

  const { error: updateErr } = await supabase
    .from('student_submissions')
    .update(updatePayload)
    .eq('id', submissionId);

  if (updateErr) throw updateErr;

  // 2. If it is a singleton category, supersede older records for this student
  const SINGLETON_CATEGORIES = [
    'academics',
    'github',
    'coding-platforms',
    'coding_practice',
    'fullstack',
    'membership',
    'assessments',
  ];

  if (categoryId && finalStudentId && SINGLETON_CATEGORIES.includes(categoryId)) {
    try {
      await supabase
        .from('student_submissions')
        .update({
          status: 'REJECTED',
          verifier_notes: 'Superseded by verified update',
          updated_at: new Date().toISOString(),
        })
        .eq('student_id', finalStudentId)
        .eq('category_id', categoryId)
        .neq('id', submissionId)
        .in('status', ['VERIFIED', 'PENDING', 'SUBMITTED', 'DRAFT']);
    } catch (sErr) {
      console.warn('Notice: Error superseding older singleton submissions:', sErr.message);
    }
  }

  // 3. For academics, keep profiles table in lockstep with the verified submission
  if (categoryId === 'academics' && finalStudentId && subDetails) {
    try {
      const d = subDetails;
      const numCgpa = d.cgpa !== undefined ? Number(d.cgpa) : undefined;
      const numTenth = (d.tenth_pct !== undefined ? Number(d.tenth_pct) : (d.tenthPct !== undefined ? Number(d.tenthPct) : undefined));
      const numTwelfth = (d.twelfth_pct !== undefined ? Number(d.twelfth_pct) : (d.twelfthPct !== undefined ? Number(d.twelfthPct) : undefined));

      const profileUpdates = { updated_at: new Date().toISOString() };
      if (numCgpa !== undefined && !isNaN(numCgpa)) profileUpdates.cgpa = numCgpa;
      if (numTenth !== undefined && !isNaN(numTenth)) profileUpdates.tenth_pct = numTenth;
      if (numTwelfth !== undefined && !isNaN(numTwelfth)) profileUpdates.twelfth_pct = numTwelfth;

      if (Object.keys(profileUpdates).length > 1) {
        await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', finalStudentId);
      }
    } catch (pErr) {
      console.warn('Notice: Error syncing academics profile:', pErr.message);
    }
  }

  // 4. Log to verification_logs (safely in try/catch)
  try {
    const { error: logErr } = await supabase.from('verification_logs').insert({
      submission_id: submissionId,
      faculty_id: facultyId,
      action: 'VERIFY',
      new_status: 'VERIFIED',
      awarded_marks: Number(awardedMarks || 0),
      notes: verifierNotes || null,
    });
    if (logErr) console.warn('verification_logs notice:', logErr.message);
  } catch (err) {
    console.warn('verification_logs exception notice:', err.message);
  }

  // 5. Send student inbox message (safely in try/catch)
  if (finalStudentId) {
    try {
      const { error: msgErr } = await supabase.from('student_messages').insert({
        student_id: finalStudentId,
        faculty_id: facultyId || null,
        submission_id: submissionId,
        message_type: 'VERIFIED',
        subject: `✓ ${finalCategoryTitle || 'Claim'} verified — ${awardedMarks} marks awarded`,
        body: `Your submission for ${finalCategoryTitle || 'this category'} has been verified. ${awardedMarks} marks have been added to your placement score.`,
        faculty_note: verifierNotes || null,
      });
      if (msgErr) console.warn('student_messages notice:', msgErr.message);
    } catch (err) {
      console.warn('student_messages exception notice:', err.message);
    }
  }
}

// Reject a submission — atomic PostgreSQL RPC with graceful fallback
export async function rejectSubmission({
  submissionId,
  facultyId,
  rejectionReason,
  verifierNotes,
  studentId,
  categoryTitle,
}) {
  if (!submissionId) throw new Error('Submission ID is required for rejection.');
  const finalReason = (rejectionReason || verifierNotes || '').trim();
  if (!finalReason) throw new Error('A rejection reason is required.');

  // Attempt atomic PostgreSQL RPC first
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('rpc_reject_submission', {
      p_submission_id: submissionId,
      p_faculty_id: facultyId,
      p_rejection_reason: finalReason,
    });

    if (!rpcErr) {
      return rpcData;
    }
    console.warn('Notice: rpc_reject_submission failed, falling back to direct write:', rpcErr.message);
  } catch (rpcEx) {
    console.warn('Notice: rpc_reject_submission exception, falling back to direct write:', rpcEx);
  }

  // Fallback direct writes
  let finalStudentId = studentId;
  let finalCategoryTitle = categoryTitle;

  if (!finalStudentId || !finalCategoryTitle) {
    const { data: subData } = await supabase
      .from('student_submissions')
      .select('student_id, category_id')
      .eq('id', submissionId)
      .maybeSingle();

    if (subData) {
      finalStudentId = finalStudentId || subData.student_id;
      finalCategoryTitle = finalCategoryTitle || getCategoryInfo(subData.category_id)?.title || subData.category_id || 'Submission';
    }
  }

  const { error: updateErr } = await supabase
    .from('student_submissions')
    .update({
      status: 'REJECTED',
      awarded_marks: 0,
      verifier_id: facultyId || null,
      verifier_notes: finalReason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', submissionId);

  if (updateErr) throw updateErr;

  try {
    const { error: logErr } = await supabase.from('verification_logs').insert({
      submission_id: submissionId,
      faculty_id: facultyId,
      action: 'REJECT',
      new_status: 'REJECTED',
      awarded_marks: 0,
      notes: finalReason,
    });
    if (logErr) console.warn('verification_logs notice:', logErr.message);
  } catch (err) {
    console.warn('verification_logs exception notice:', err.message);
  }

  if (finalStudentId) {
    try {
      const { error: msgErr } = await supabase.from('student_messages').insert({
        student_id: finalStudentId,
        faculty_id: facultyId || null,
        submission_id: submissionId,
        message_type: 'REJECTED',
        subject: `✗ ${finalCategoryTitle || 'Claim'} submission rejected`,
        body: `Your submission for ${finalCategoryTitle || 'this category'} was not accepted. Please review the faculty note and resubmit with corrected information.`,
        faculty_note: finalReason,
      });
      if (msgErr) console.warn('student_messages notice:', msgErr.message);
    } catch (err) {
      console.warn('student_messages exception notice:', err.message);
    }
  }
}

// Get audit history for a submission
export async function getVerificationLogs(submissionId) {
  if (!submissionId) return [];

  try {
    const { data, error } = await supabase
      .from('verification_logs')
      .select('*')
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      return data;
    }
  } catch (err) {
    console.warn('Notice: getVerificationLogs error:', err);
  }
  return [];
}
