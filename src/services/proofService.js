import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

const BUCKET_NAME = "placement-proofs";

/**
 * Uploads a document/proof to Supabase Storage and records metadata
 */
export async function uploadProofDocument(studentId, file, submissionId = null) {
  if (!file) throw new Error("File is required for proof upload");
  if (!studentId) throw new Error("Student ID is required for proof upload");

  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileExt = sanitizedFileName.split(".").pop();
  const uniqueId = Math.random().toString(36).substring(2, 9);
  const storagePath = `${studentId}/${Date.now()}_${uniqueId}.${fileExt}`;

  let publicUrl = "";

  if (isSupabaseConfigured()) {
    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.warn("Storage upload notice:", uploadError.message);
        // Fallback to local blob URL if bucket isn't available
        publicUrl = URL.createObjectURL(file);
      } else {
        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(storagePath);
        publicUrl = urlData.publicUrl;
      }
    } catch (e) {
      console.warn("Proof storage exception:", e);
      publicUrl = URL.createObjectURL(file);
    }
  } else {
    publicUrl = URL.createObjectURL(file);
  }

  // Attempt to record in submission_proofs table if present
  let proofRecordId = null;
  if (isSupabaseConfigured() && publicUrl) {
    try {
      const { data: recordData, error: recordError } = await supabase
        .from("submission_proofs")
        .insert([
          {
            student_id: studentId,
            submission_id: submissionId,
            bucket_id: BUCKET_NAME,
            storage_path: storagePath,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            public_url: publicUrl,
          },
        ])
        .select()
        .maybeSingle();

      if (!recordError && recordData) {
        proofRecordId = recordData.id;
      }
    } catch (tableErr) {
      // If table does not exist or schema is in fallback mode, don't fail the upload
      console.warn("Notice: submission_proofs table insert fallback:", tableErr);
    }
  }

  return {
    id: proofRecordId || `local-proof-${Date.now()}`,
    publicUrl,
    storagePath,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    uploadedAt: new Date().toISOString(),
  };
}

/**
 * Fetch proof documents attached to a submission
 */
export async function getProofsForSubmission(submissionId) {
  if (!submissionId || !isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase
      .from("submission_proofs")
      .select("*")
      .eq("submission_id", submissionId)
      .order("uploaded_at", { ascending: false });

    if (!error && Array.isArray(data)) {
      return data.map((d) => ({
        id: d.id,
        submissionId: d.submission_id,
        studentId: d.student_id,
        storagePath: d.storage_path,
        fileName: d.file_name,
        fileType: d.file_type,
        fileSize: d.file_size,
        publicUrl: d.public_url,
        uploadedAt: d.uploaded_at,
      }));
    }
  } catch (err) {
    console.warn("Notice: getProofsForSubmission error:", err);
  }
  return [];
}
