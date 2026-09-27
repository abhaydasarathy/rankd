import { createClient } from "@supabase/supabase-js";

// Read environment variables from .env (compatible with Vite & Node)
const getEnv = (key) => {
  try {
    if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
    if (typeof process !== "undefined" && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {}
  return "";
};

const supabaseUrl = getEnv("VITE_SUPABASE_URL") || "https://edrnoswnadjcsftekplu.supabase.co";
const supabaseAnonKey = getEnv("VITE_SUPABASE_ANON_KEY") || "sb_publishable_ftDN7kSv57CKxDF4HwjcDg_VYchfVF6";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey && supabaseAnonKey !== "YOUR_SUPABASE_ANON_KEY_HERE"
    ? supabaseAnonKey
    : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder_key"
);

/**
 * Check if active live Supabase key is configured
 */
export function isSupabaseConfigured() {
  return Boolean(
    supabaseAnonKey && 
    supabaseAnonKey !== "YOUR_SUPABASE_ANON_KEY_HERE" &&
    !supabaseAnonKey.includes("placeholder")
  );
}

/**
 * Google OAuth Sign-in restricted to @srmist.edu.in domain
 */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      queryParams: {
        hd: "srmist.edu.in",      // restricts Google picker to @srmist.edu.in only
        prompt: "select_account",  // always show account picker
      },
      redirectTo: window.location.origin + "/auth/callback",
    },
  });
  if (error) throw error;
  return data;
}

/**
 * Upload proof document to Supabase Storage bucket 'placement-proofs'
 */
export async function uploadProofFile(userId, file) {
  try {
    if (!isSupabaseConfigured()) {
      return { path: `local/${file.name}`, url: URL.createObjectURL(file), name: file.name };
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('placement-proofs')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (error) {
      console.warn("Supabase storage notice:", error.message);
      return { path: fileName, url: URL.createObjectURL(file), name: file.name };
    }

    const { data: publicUrlData } = supabase.storage
      .from('placement-proofs')
      .getPublicUrl(fileName);

    return { path: data.path, url: publicUrlData.publicUrl, name: file.name };
  } catch (e) {
    console.warn("Upload exception:", e);
    return { path: `local/${file.name}`, url: URL.createObjectURL(file), name: file.name };
  }
}

/**
 * Fetch Profiles from Supabase PostgreSQL
 */
export async function fetchProfilesFromSupabase() {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) {
    console.warn("Supabase fetch profiles error:", error.message);
    return null;
  }
  return data;
}

/**
 * Fetch Student Submissions from Supabase PostgreSQL
 */
export async function fetchSubmissionsFromSupabase() {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase.from('student_submissions').select('*');
  if (error) {
    console.warn("Supabase fetch submissions error:", error.message);
    return null;
  }
  return data;
}

/**
 * Insert Submission to Supabase PostgreSQL
 */
export async function insertSubmissionToSupabase(submission) {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase.from('student_submissions').insert([{
    student_id: submission.studentId,
    category_id: submission.categoryId,
    title: submission.title,
    details: submission.details || {},
    proof_url: submission.proof_url,
    status: submission.status || 'PENDING',
    awarded_marks: submission.awardedMarks || 0
  }]).select();

  if (error) {
    console.warn("Supabase insert submission error:", error.message);
  }
  return data;
}

/**
 * Update Verification Status in Supabase PostgreSQL
 */
export async function updateSubmissionStatusInSupabase(submissionId, status, awardedMarks, verifierNotes) {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from('student_submissions')
    .update({
      status,
      awarded_marks: awardedMarks,
      verifier_notes: verifierNotes,
      updated_at: new Date().toISOString()
    })
    .eq('id', submissionId)
    .select();

  if (error) {
    console.warn("Supabase update status error:", error.message);
  }
  return data;
}
