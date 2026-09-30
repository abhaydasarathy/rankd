import { supabase } from "../lib/supabaseClient.js";

/**
 * Fetch authoritative institutional leaderboard ranking from public.placement_leaderboard.
 * The database view handles all score aggregation, caps, and tie-breaking via DENSE_RANK().
 *
 * @param {Object} options
 * @param {string|null} options.department - Optional department filter ('CSE Core', 'CTECH', etc.)
 * @param {string} options.search - Optional search string for full_name, reg_no, or email
 * @returns {Promise<Array>} Array of ranked student objects
 */
export async function fetchLeaderboard({ department = null, search = '' } = {}) {
  let query = supabase
    .from('placement_leaderboard') // MUST be this view — not student_submissions
    .select(`
      rank,
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
    `)
    .order('total_verified_score', { ascending: false })
    .order('cgpa', { ascending: false })
    .order('academics_score', { ascending: false })
    .order('reg_no', { ascending: true });

  if (department && department !== 'All Departments' && department !== 'all' && department !== '') {
    query = query.eq('department', department);
  }

  if (search && search.trim() !== '') {
    const term = search.trim();
    query = query.or(
      `full_name.ilike.%${term}%,reg_no.ilike.%${term}%,email.ilike.%${term}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row) => ({
    ...row,
    rank: Number(row.rank),
    id: row.student_id,
    studentId: row.student_id,
    name: row.name || row.full_name || "SRM Student",
    fullName: row.full_name || row.name || "SRM Student",
    regNo: row.reg_no || "RA2411003010000",
    cgpa: Number(row.cgpa || 0),
    totalVerifiedScore: Number(row.total_verified_score || 0),
    totalPendingScore: Number(row.total_pending_score || 0),
    pendingCount: Number(row.pending_submissions_count || 0),
    verifiedCount: Number(row.verified_submissions_count || 0),
  }));
}

// Backward-compatible alias
export const getPlacementLeaderboard = fetchLeaderboard;
