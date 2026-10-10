import { extractInternshipDocument, fileToBase64 } from "./src/services/documentExtractionService.js";
import { formatSubmission, upsertStudentSubmission } from "./src/services/submissionService.js";
import { supabase } from "./src/lib/supabaseClient.js";

const originalFunctions = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(supabase), 'functions').get;

Object.defineProperty(supabase, 'functions', {
  get: () => ({
    invoke: async (fnName, options) => {
      if (fnName === "extract-internship-proof" && options.body?.mimeType !== "application/pdf") {
        return {
          data: {
            data: {
              student_name: "Abhay Dasarathy",
              company_name: "Google",
              internship_role: "Software Engineering Intern",
              start_date: "2024-05-01",
              end_date: "2024-07-31",
              duration_months: 3,
              paid_status: "Paid",
              stipend_if_present: "₹1,00,000/mo",
              certificate_type: "Completion Certificate",
              company_category_if_confident: "Fortune 500",
              confidence: 0.95,
              warnings: []
            }
          },
          error: null
        };
      }
      return originalFunctions.call(supabase).invoke(fnName, options);
    }
  }),
  configurable: true
});

function assert(condition, message) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

console.log("=========================================");
console.log("Testing Document Extraction Layer");
console.log("=========================================\n");

async function runTests() {
  // Test 1: Unsupported PDF format rejection
  console.log("1. Testing document extraction with unsupported PDF format...");
  
  const pdfDocRef = {
    fileName: "Google_Software_Engineering_Internship_Certificate.pdf",
    publicUrl: "https://example.com/proofs/google_internship_cert.pdf",
    mimeType: "application/pdf"
  };

  const studentContext = {
    studentId: "00000000-0000-0000-0000-000000000001",
    studentName: "Abhay Dasarathy"
  };

  const pdfExtraction = await extractInternshipDocument(pdfDocRef, studentContext);

  assert(pdfExtraction.processing_error && pdfExtraction.processing_error.includes("PDF files are not supported"), "Returns clear unsupported-format error");
  assert(pdfExtraction.model_used === "none", "Model used is 'none'");
  
  console.log("✓ Test 1 Passed: PDF input returns clear error.\n");

  // Test 2: Extract structured fields from a mock sample internship certificate (PNG reference)
  console.log("2. Testing document extraction with Google Internship Certificate sample (PNG)...");
  
  const sampleDocRef = {
    fileName: "Google_Software_Engineering_Internship_Certificate.png",
    publicUrl: "https://example.com/proofs/google_internship_cert.png",
    mimeType: "image/png"
  };

  // Reuse studentContext from above

  const extraction = await extractInternshipDocument(sampleDocRef, studentContext);

  console.log("Extracted Structured JSON Result:");
  console.log(JSON.stringify(extraction, null, 2));

  // Verify all 11 required fields are present in structured JSON
  assert(extraction.hasOwnProperty("student_name"), "Field 'student_name' exists");
  assert(extraction.hasOwnProperty("company_name"), "Field 'company_name' exists");
  assert(extraction.hasOwnProperty("internship_role"), "Field 'internship_role' exists");
  assert(extraction.hasOwnProperty("start_date"), "Field 'start_date' exists");
  assert(extraction.hasOwnProperty("end_date"), "Field 'end_date' exists");
  assert(extraction.hasOwnProperty("duration_months"), "Field 'duration_months' exists");
  assert(extraction.hasOwnProperty("paid_status"), "Field 'paid_status' exists");
  assert(extraction.hasOwnProperty("stipend_if_present"), "Field 'stipend_if_present' exists");
  assert(extraction.hasOwnProperty("certificate_type"), "Field 'certificate_type' exists");
  assert(extraction.hasOwnProperty("company_category_if_confident"), "Field 'company_category_if_confident' exists");
  assert(extraction.hasOwnProperty("confidence"), "Field 'confidence' exists");
  assert(typeof extraction.confidence === "number", "Confidence is a numeric score");

  assert(extraction.company_name === "Google", "Extracted company_name = Google");
  assert(extraction.company_category_if_confident === "Fortune 500", "Company category identified as Fortune 500");
  assert(extraction.confidence > 0, "Confidence score is greater than 0");

  console.log("✓ Test 2 Passed: 11 structured fields extracted successfully.\n");

  // Test 3: Error handling for unreadable / null document reference
  console.log("3. Testing safe error recording on invalid / empty document...");
  
  const invalidResult = await extractInternshipDocument(null);
  console.log("Invalid Document Result:");
  console.log(JSON.stringify(invalidResult, null, 2));

  assert(invalidResult.confidence === 0.0, "Confidence is 0.0 for invalid document");
  assert(typeof invalidResult.processing_error === "string", "Processing error is safely recorded as string");
  assert(invalidResult.processing_error.length > 0, "Processing error message is populated");
  console.log("✓ Test 3 Passed: Processing errors recorded safely without throwing unhandled exceptions.\n");

  // Test 4: Upload flow integration with student submission
  console.log("4. Testing upload flow integration with internship submission payload...");

  const submissionPayload = {
    studentId: "st-demo-01",
    categoryId: "internship",
    title: "Google Software Engineering Internship",
    proofUrl: "https://example.com/proofs/google_internship_cert.png",
    details: {
      companyName: "Google",
      tier: "Fortune 500",
      durationMonths: 3,
      isPaid: true
    }
  };

  const formattedSub = formatSubmission({
    id: "sub-test-1",
    student_id: submissionPayload.studentId,
    category_id: submissionPayload.categoryId,
    title: submissionPayload.title,
    status: "PENDING",
    awarded_marks: 5,
    proof_url: submissionPayload.proofUrl,
    details: {
      ...submissionPayload.details,
      document_extraction: extraction
    }
  });

  assert(formattedSub.categoryId === "internship", "Submission category is internship");
  assert(formattedSub.status === "PENDING", "Status remains PENDING (scoring/ranking unchanged)");
  assert(formattedSub.details.document_extraction.company_name === "Google", "Extracted metadata attached to submission details");

  console.log("✓ Test 4 Passed: Upload flow remains fully compatible and attaches structured extraction.\n");

  console.log("=========================================");
  console.log("ALL DOCUMENT EXTRACTION TESTS PASSED!");
  console.log("=========================================");
}

runTests().catch(err => {
  console.error("Test execution error:", err);
  process.exit(1);
});
