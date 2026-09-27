import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";
import { getAllStudentProfiles } from "./studentService.js";
import { getAllSubmissions } from "./submissionService.js";
import { calculateTotalScore } from "../utils/scoringEngine.js";

/**
 * Fetch leaderboard ranking. Uses database view `placement_leaderboard` if available,
 * with reliable dynamic calculation fallback using real DB profiles & submissions.
 */
export async function getPlacementLeaderboard() {
  // 1. Try querying the authoritative view
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("placement_leaderboard")
        .select("*")
        .order("rank", { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((row) => ({
          rank: Number(row.rank),
          id: row.student_id,
          studentId: row.student_id,
          name: row.name || row.full_name || "SRM Student",
          fullName: row.full_name || row.name || "SRM Student",
          email: row.email,
          regNo: row.reg_no || "RA2411003010000",
          department: row.department || "CSE Core",
          programme: row.programme || "B.Tech",
          section: row.section || "Section A",
          batch: row.batch || "2024 - 2028",
          cgpa: Number(row.cgpa || 0),
          totalVerifiedScore: Number(row.total_verified_score || 0),
          totalPendingScore: Number(row.total_pending_score || 0),
          scores: {
            academics: Number(row.academics_score || 0),
            github: Number(row.github_score || 0),
            coding: Number(row.coding_score || 0),
            internship: Number(row.internship_score || 0),
            skillset: Number(row.skillset_score || 0),
            projects: Number(row.projects_score || 0),
            fullstack: Number(row.fullstack_score || 0),
            hackathons: Number(row.hackathons_score || 0),
            inhouse: Number(row.inhouse_score || 0),
            membership: Number(row.membership_score || 0),
            assessments: Number(row.assessments_score || 0),
          },
          pendingCount: Number(row.pending_submissions_count || 0),
          verifiedCount: Number(row.verified_submissions_count || 0),
        }));
      }
    } catch (viewErr) {
      console.warn("Notice: placement_leaderboard view query fallback to calculated scores:", viewErr.message);
    }
  }

  // 2. Authoritative calculation from real DB profiles and submissions
  const [profiles, allSubmissions] = await Promise.all([
    getAllStudentProfiles(),
    getAllSubmissions(),
  ]);

  if (!profiles || profiles.length === 0) {
    return [];
  }

  // Calculate scores for each real student
  const scoredStudents = profiles.map((student) => {
    const studentSubs = allSubmissions.filter((s) => s.studentId === student.id);
    const scoreSummary = calculateTotalScore({
      tenthPct: student.tenthPct,
      twelfthPct: student.twelfthPct,
      cgpa: student.cgpa,
      submissions: studentSubs,
    });

    return {
      id: student.id,
      studentId: student.id,
      name: student.name,
      fullName: student.fullName,
      email: student.email,
      regNo: student.regNo,
      department: student.department,
      programme: student.programme,
      section: student.section,
      batch: student.batch,
      cgpa: student.cgpa,
      totalVerifiedScore: scoreSummary.totalVerifiedScore,
      totalPendingScore: scoreSummary.totalPendingScore,
      scores: {
        academics: scoreSummary.categoryScores.academics.score,
        github: scoreSummary.categoryScores.github.score,
        coding: scoreSummary.categoryScores.coding.score,
        internship: scoreSummary.categoryScores.internship.score,
        skillset: scoreSummary.categoryScores.skillset.score,
        projects: scoreSummary.categoryScores.projects.score,
        fullstack: scoreSummary.categoryScores.fullstack.score,
        hackathons: scoreSummary.categoryScores.hackathons.score,
        inhouse: scoreSummary.categoryScores.inhouse.score,
        membership: scoreSummary.categoryScores.membership.score,
        assessments: scoreSummary.categoryScores.assessment.score,
      },
      categoryScores: scoreSummary.categoryScores,
      submissions: studentSubs,
      pendingCount: studentSubs.filter((s) => s.status === "PENDING").length,
      verifiedCount: studentSubs.filter((s) => s.status === "VERIFIED").length,
    };
  });

  // Sort descending by total score, then cgpa, then reg_no
  scoredStudents.sort((a, b) => {
    if (b.totalVerifiedScore !== a.totalVerifiedScore) {
      return b.totalVerifiedScore - a.totalVerifiedScore;
    }
    if (b.cgpa !== a.cgpa) {
      return b.cgpa - a.cgpa;
    }
    return (a.regNo || "").localeCompare(b.regNo || "");
  });

  // Assign dense rank
  let currentRank = 1;
  return scoredStudents.map((st, idx, arr) => {
    if (idx > 0) {
      const prev = arr[idx - 1];
      if (prev.totalVerifiedScore !== st.totalVerifiedScore || prev.cgpa !== st.cgpa) {
        currentRank = idx + 1;
      }
    }
    return {
      ...st,
      rank: currentRank,
    };
  });
}
