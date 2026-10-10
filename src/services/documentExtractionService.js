import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";
import { calculateInternshipScore } from "../utils/scoringEngine.js";

/**
 * Converts a File or Blob object to Base64 string
 */
export async function fileToBase64(file) {
  if (!file) return null;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        const base64Str = result.split(",")[1] || result;
        resolve(base64Str);
      } else {
        resolve(null);
      }
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Client-side document extraction service that communicates with the server-side
 * secure document processing Edge Function (`extract-internship-proof`).
 * 
 * Extracts structured facts:
 * - student_name
 * - company_name
 * - internship_role
 * - start_date
 * - end_date
 * - duration_months
 * - paid_status ("Paid" | "Unpaid" | "Unknown")
 * - stipend_if_present
 * - certificate_type
 * - company_category_if_confident
 * - confidence (0.0 to 1.0)
 * - warnings (array of anomaly strings)
 * 
 * Handles errors safely without generating fabricated values.
 */
export async function extractInternshipDocument(documentRef, studentContext = {}) {
  const timestamp = new Date().toISOString();

  if (!documentRef) {
    return createErrorResult("No document reference or link provided", timestamp, studentContext);
  }

  let fileBase64 = null;
  let documentUrl = null;
  let driveUrl = null;
  let fileName = "internship_certificate";
  let mimeType = ""; // Start empty to force dynamic resolution

  try {
    // 1. Determine input reference format (File, URL, Drive link, base64)
    if (documentRef instanceof File || documentRef instanceof Blob) {
      fileName = documentRef.name || fileName;
      mimeType = documentRef.type;
      fileBase64 = await fileToBase64(documentRef);
    } else if (typeof documentRef === "string") {
      const str = documentRef.trim();
      fileName = str.split("/").pop().split("?")[0] || fileName;
      if (str.includes("drive.google.com") || str.includes("docs.google.com")) {
        driveUrl = str;
      } else if (str.startsWith("http://") || str.startsWith("https://") || str.startsWith("blob:")) {
        documentUrl = str;
      } else if (str.startsWith("data:")) {
        const parts = str.split(",");
        mimeType = parts[0].match(/:(.*?);/)?.[1] || mimeType;
        fileBase64 = parts[1];
      }
    } else if (typeof documentRef === "object") {
      const u = documentRef.publicUrl || documentRef.url || documentRef.documentUrl || documentRef.driveUrl || "";
      if (u.includes("drive.google.com") || u.includes("docs.google.com")) {
        driveUrl = u;
      } else if (u.startsWith("http://") || u.startsWith("https://") || u.startsWith("blob:")) {
        documentUrl = u;
      }
      fileName = documentRef.fileName || documentRef.name || fileName;
      mimeType = documentRef.fileType || documentRef.mimeType || mimeType;
      if (documentRef.file instanceof File || documentRef.file instanceof Blob) {
        fileBase64 = await fileToBase64(documentRef.file);
      }
    }

    // Attempt to infer MIME type from filename if still missing
    if (!mimeType && fileName) {
      const nameLower = fileName.toLowerCase();
      if (nameLower.endsWith(".jpg") || nameLower.endsWith(".jpeg")) {
        mimeType = "image/jpeg";
      } else if (nameLower.endsWith(".png")) {
        mimeType = "image/png";
      } else if (nameLower.endsWith(".pdf")) {
        mimeType = "application/pdf";
      }
    }

    // Final fallback: only guess PDF if it's NOT a drive URL and still totally unknown
    // (Drive URLs will be dynamically resolved by the Edge Function based on Google's headers)
    if (!mimeType && !driveUrl) {
      mimeType = "application/pdf";
    }

    // Reject direct upload PDFs immediately
    if (!driveUrl && mimeType === 'application/pdf') {
      return createErrorResult("PDF files are not supported. Please upload your certificate as JPG or PNG.", timestamp, studentContext);
    }

    // 2. Call server-side secure Edge Function if Supabase is configured
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.functions.invoke("extract-internship-proof", {
          body: {
            documentUrl,
            driveUrl,
            fileBase64,
            mimeType,
            fileName,
            studentContext,
          },
        });

        if (!error && data && data.data) {
          return normalizeExtractionResult(data.data, timestamp, studentContext);
        }

        if (error) {
          console.warn("Notice: Edge function extract-internship-proof returned error:", error.message);
          return createErrorResult(error.message || "Failed to process document on server", timestamp, studentContext);
        }
      } catch (edgeErr) {
        console.warn("Notice: Edge function invocation exception:", edgeErr);
        return createErrorResult(edgeErr.message || "Failed to invoke document extraction edge function", timestamp, studentContext);
      }
    }

    // 3. Fallback when Supabase Edge Function unconfigured: return un-fabricated error result to prevent false marks
    return createErrorResult("Supabase backend edge functions unconfigured for AI processing", timestamp, studentContext);

  } catch (err) {
    const errorMsg = err.message || "Failed to process document reference";
    console.warn("Document extraction exception safely recorded:", errorMsg);
    return createErrorResult(errorMsg, timestamp, studentContext);
  }
}

/**
 * Normalizes extracted fields to strictly adhere to required schema
 */
function normalizeExtractionResult(raw, timestamp, studentContext = {}) {
  const studentName = raw.student_name || studentContext.name || studentContext.studentName || studentContext.full_name || null;
  const dur = raw.duration_months !== null && raw.duration_months !== undefined ? Number(raw.duration_months) : null;
  const conf = raw.confidence !== null && raw.confidence !== undefined ? Number(raw.confidence) : 0.0;
  const warnings = Array.isArray(raw.warnings) ? raw.warnings : [];

  const paidStatus = ["Paid", "Unpaid", "Unknown"].includes(raw.paid_status) ? raw.paid_status : "Unknown";

  return {
    student_name: studentName,
    company_name: raw.company_name || null,
    internship_role: raw.internship_role || null,
    start_date: raw.start_date || null,
    end_date: raw.end_date || null,
    duration_months: Number.isNaN(dur) ? null : dur,
    paid_status: paidStatus,
    stipend_if_present: raw.stipend_if_present || null,
    certificate_type: raw.certificate_type || "Internship Certificate",
    company_category_if_confident: raw.company_category_if_confident || null,
    confidence: Math.min(1.0, Math.max(0.0, Number(conf.toFixed(2)))),
    warnings: warnings,
    processing_error: raw.processing_error || null,
    model_used: raw.model_used || "gemini-1.5-flash",
    extracted_at: raw.extracted_at || timestamp,
  };
}

/**
 * Creates default error JSON when document processing fails or is invalid
 */
function createErrorResult(errorMsg, timestamp, studentContext = {}) {
  return {
    student_name: studentContext.name || studentContext.studentName || studentContext.full_name || null,
    company_name: null,
    internship_role: null,
    start_date: null,
    end_date: null,
    duration_months: null,
    paid_status: "Unknown",
    stipend_if_present: null,
    certificate_type: null,
    company_category_if_confident: null,
    confidence: 0.0,
    warnings: [errorMsg],
    processing_error: errorMsg,
    model_used: "none",
    extracted_at: timestamp,
  };
}

/**
 * Maps extracted facts to the EXISTING RANKD scoring engine inputs
 */
export function mapFactsToScoringParams(extractedFacts, userInputs = {}) {
  const facts = extractedFacts || {};
  const hasExtractedFacts = Object.keys(facts).length > 0;

  const companyName = userInputs.companyName || userInputs.company || facts.company_name || "Internship Organization";

  // Tier classification mapping
  let tier;
  if (hasExtractedFacts) {
    if (facts.company_category_if_confident) {
      const cat = String(facts.company_category_if_confident).toUpperCase();
      if (cat.includes("IIT") || cat.includes("NIT") || cat.includes("SRM")) tier = "IIT/NIT/SRM";
      else if (cat.includes("FORTUNE") || cat.includes("500") || cat.includes("MNC")) tier = "Fortune 500";
      else if (cat.includes("SMALL") || cat.includes("STARTUP") || cat.includes("MID")) tier = "Small / Mid Co";
    } else if (facts.company_name) {
      const comp = String(facts.company_name).toUpperCase();
      if (["GOOGLE", "MICROSOFT", "AMAZON", "CISCO", "IBM", "META", "APPLE", "TCS", "INFOSYS", "WIPRO", "COGNIZANT", "ACCENTURE", "PAYPAL", "ADOBE"].some(b => comp.includes(b))) {
        tier = "Fortune 500";
      } else if (["ZOHO", "SRM", "IIT", "NIT"].some(b => comp.includes(b))) {
        tier = "IIT/NIT/SRM";
      }
    }
  } else {
    tier = userInputs.tier;
  }

  if (!tier && facts.warnings) {
    if (!facts.warnings.some(w => w.includes("Company category could not be confidently determined"))) {
      facts.warnings.push("Company category could not be confidently determined; conservative fallback score applied.");
    }
  }

  // Duration mapping
  let durationMonths;
  if (hasExtractedFacts) {
    durationMonths = facts.duration_months;
  } else {
    durationMonths = userInputs.durationMonths || userInputs.duration;
  }

  if (durationMonths !== undefined && durationMonths !== null && durationMonths !== "") {
    durationMonths = Number(durationMonths);
    if (isNaN(durationMonths)) {
      durationMonths = null;
    }
  } else {
    durationMonths = null;
  }

  if (durationMonths === null && facts.warnings) {
    if (!facts.warnings.some(w => w.includes("duration could not be determined"))) {
      facts.warnings.push("AI warning: Internship duration could not be determined.");
    }
  }

  // Paid status mapping
  let isPaid;
  if (hasExtractedFacts) {
    if (facts.paid_status === "Paid") {
      isPaid = true;
    } else if (facts.paid_status === "Unpaid") {
      isPaid = false;
    } else {
      isPaid = "Unknown";
    }
  } else {
    if (userInputs.isPaid !== undefined) {
      isPaid = userInputs.isPaid;
    } else {
      isPaid = "Unknown";
    }
  }

  return { companyName, tier, durationMonths, isPaid };
}

/**
 * Evaluates internship extraction using EXISTING RANKD scoring engine
 * and returns calculated marks + automatic verification payload.
 */
export function evaluateAndAutoScoreInternship(extractedFacts, userInputs = {}) {
  const scoringParams = mapFactsToScoringParams(extractedFacts, userInputs);

  const confidence = extractedFacts?.confidence || 0;
  const isInvalid = confidence < 0.3 || extractedFacts?.processing_error || (extractedFacts?.warnings && extractedFacts.warnings.some(w => w.toLowerCase().includes("invalid") || w.toLowerCase().includes("non-internship")));

  // Pass into EXISTING RANKD scoring logic
  let scoreResult = calculateInternshipScore([scoringParams]);
  let calculatedMarks = scoreResult.total;

  if (isInvalid) {
    calculatedMarks = 0;
    if (extractedFacts) {
      extractedFacts.confidence = 0;
    }
  }

  const isSuccess = Boolean(!isInvalid && extractedFacts && extractedFacts.confidence > 0);

  return {
    calculatedMarks,
    scoringParams,
    // Successful AI extraction = AUTOMATIC VERIFICATION ('VERIFIED')
    // Invalid = 'REJECTED' (do not require faculty approval)
    // Otherwise = 'PENDING'
    status: isSuccess ? "VERIFIED" : (isInvalid ? "REJECTED" : "PENDING"),
    isAutoVerified: isSuccess,
    isInvalid,
    hasLowConfidence: Boolean(isSuccess && (extractedFacts.confidence < 0.70 || (extractedFacts.warnings && extractedFacts.warnings.length > 0))),
  };
}
