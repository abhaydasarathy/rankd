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

// Detect placeholder / unfilled template values — fall through to hardcoded project fallbacks
const isPlaceholder = (val) =>
  !val ||
  val.includes("your-project-ref") ||
  val.includes("your-supabase") ||
  val.toLowerCase().includes("placeholder") ||
  val === "YOUR_SUPABASE_ANON_KEY_HERE";

const rawUrl = getEnv("VITE_SUPABASE_URL");
const rawKey = getEnv("VITE_SUPABASE_ANON_KEY");

const FALLBACK_URL = "https://edrnoswnadjcsftekplu.supabase.co";
const FALLBACK_KEY = "sb_publishable_ftDN7kSv57CKxDF4HwjcDg_VYchfVF6";

const supabaseUrl = isPlaceholder(rawUrl) ? FALLBACK_URL : rawUrl;
const supabaseAnonKey = isPlaceholder(rawKey) ? FALLBACK_KEY : rawKey;

// Wrap in try/catch — an invalid URL must never crash the entire app
let _client;
try {
  _client = createClient(supabaseUrl, supabaseAnonKey);
} catch (e) {
  console.warn("[rankd] Supabase init failed, retrying with fallback credentials:", e.message);
  try {
    _client = createClient(FALLBACK_URL, FALLBACK_KEY);
  } catch (e2) {
    console.error("[rankd] Supabase could not be initialised. DB features will be unavailable.");
    // Return a stub so the rest of the app doesn't blow up on import
    _client = { auth: { getSession: async () => ({ data: {}, error: null }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) }, from: () => ({ select: async () => ({ data: [], error: null }), insert: async () => ({ data: null, error: null }), update: async () => ({ data: null, error: null }), eq: () => ({ select: async () => ({ data: [], error: null }) }) }), channel: () => ({ on: () => ({ subscribe: () => {} }) }), removeChannel: () => {}, storage: { from: () => ({ upload: async () => ({ data: null, error: null }), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) } };
  }
}

export const supabase = _client;

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
