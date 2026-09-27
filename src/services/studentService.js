import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

/**
 * Format raw database row to application profile object
 */
export function formatProfile(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    email: raw.email || "",
    name: raw.name || raw.full_name || "SRM Student",
    fullName: raw.full_name || raw.name || "SRM Student",
    regNo: raw.reg_no || "RA2411003010000",
    reg_no: raw.reg_no || "RA2411003010000",
    role: raw.role || "student",
    department: raw.department || "CSE Core",
    programme: raw.programme || "B.Tech",
    section: raw.section || "Section A",
    batch: raw.batch || "2024 - 2028",
    tenthPct: Number(raw.tenth_pct ?? raw.tenthPct ?? 0),
    tenth_pct: Number(raw.tenth_pct ?? raw.tenthPct ?? 0),
    twelfthPct: Number(raw.twelfth_pct ?? raw.twelfthPct ?? 0),
    twelfth_pct: Number(raw.twelfth_pct ?? raw.twelfthPct ?? 0),
    cgpa: Number(raw.cgpa ?? 0),
    advisor: raw.advisor || "Faculty Placement Coordinator",
    avatarUrl: raw.avatar_url || null,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

/**
 * Fetch a student's profile by ID
 */
export async function getStudentProfile(studentId) {
  if (!studentId) return null;

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", studentId)
        .maybeSingle();

      if (!error && data) {
        return formatProfile(data);
      }
    } catch (err) {
      console.warn("Notice: Fetching student profile from DB fallback:", err);
    }
  }

  return null;
}

/**
 * Fetch all student profiles (for ranking / faculty rosters)
 */
export async function getAllStudentProfiles() {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "student")
        .order("cgpa", { ascending: false });

      if (!error && Array.isArray(data)) {
        return data.map(formatProfile);
      }
    } catch (err) {
      console.warn("Notice: Fetching all profiles error:", err);
    }
  }
  return [];
}

/**
 * Update academic records and profile metadata
 */
export async function updateStudentProfile(studentId, updates) {
  if (!studentId) throw new Error("Student ID is required to update profile");

  const dbPayload = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) dbPayload.name = updates.name;
  if (updates.fullName !== undefined) dbPayload.full_name = updates.fullName;
  if (updates.regNo !== undefined) dbPayload.reg_no = updates.regNo;
  if (updates.department !== undefined) dbPayload.department = updates.department;
  if (updates.programme !== undefined) dbPayload.programme = updates.programme;
  if (updates.section !== undefined) dbPayload.section = updates.section;
  if (updates.batch !== undefined) dbPayload.batch = updates.batch;
  if (updates.tenthPct !== undefined) dbPayload.tenth_pct = Number(updates.tenthPct);
  if (updates.tenth_pct !== undefined) dbPayload.tenth_pct = Number(updates.tenth_pct);
  if (updates.twelfthPct !== undefined) dbPayload.twelfth_pct = Number(updates.twelfthPct);
  if (updates.twelfth_pct !== undefined) dbPayload.twelfth_pct = Number(updates.twelfth_pct);
  if (updates.cgpa !== undefined) dbPayload.cgpa = Number(updates.cgpa);
  if (updates.advisor !== undefined) dbPayload.advisor = updates.advisor;
  if (updates.avatarUrl !== undefined) dbPayload.avatar_url = updates.avatarUrl;
  if (updates.avatar_url !== undefined) dbPayload.avatar_url = updates.avatar_url;

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update(dbPayload)
        .eq("id", studentId)
        .select();

      if (!error && Array.isArray(data) && data.length > 0) {
        return formatProfile(data[0]);
      }
      if (error) {
        console.warn("Notice: profiles update error:", error.message);
      }
    } catch (err) {
      console.warn("Notice: profiles update exception:", err.message);
    }
  }

  // Consistent formatted return
  return {
    id: studentId,
    ...updates,
    tenthPct: Number(updates.tenthPct ?? dbPayload.tenth_pct ?? 0),
    twelfthPct: Number(updates.twelfthPct ?? dbPayload.twelfth_pct ?? 0),
    cgpa: Number(updates.cgpa ?? dbPayload.cgpa ?? 0),
    updatedAt: new Date().toISOString(),
  };
}
