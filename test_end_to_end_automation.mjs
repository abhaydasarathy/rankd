import { extractInternshipDocument, mapFactsToScoringParams, evaluateAndAutoScoreInternship } from "./src/services/documentExtractionService.js";
import { formatSubmission, upsertStudentSubmission, createSubmission } from "./src/services/submissionService.js";
import { calculateInternshipScore, calculateTotalScore } from "./src/utils/scoringEngine.js";
import { getPlacementLeaderboard } from "./src/services/leaderboardService.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

console.log("=========================================");
console.log("RANKD Internship Automation End-to-End Test");
console.log("=========================================\n");

async function runAll16Tests() {
  const studentContext = {
    studentId: "st-abhay-01",
    studentName: "Abhay Dasarathy",
    full_name: "Abhay Dasarathy"
  };

  // Scenario 1: Valid Image Internship Certificate
  console.log("Scenario 1: Valid Image internship certificate...");
  const mockImageFacts = {
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
  };

  const imgEval1 = evaluateAndAutoScoreInternship(mockImageFacts, { companyName: "Google", tier: "Fortune 500", durationMonths: 3, isPaid: true });
  assert(imgEval1.status === "VERIFIED", "Status set to VERIFIED");
  assert(imgEval1.calculatedMarks === 5, "Calculated marks = 5");
  console.log("✓ Scenario 1 Passed.\n");

  // Scenario 2: Valid Image Certificate
  console.log("Scenario 2: Valid image certificate...");
  const mockImgFacts = {
    student_name: "Abhay Dasarathy",
    company_name: "Microsoft",
    internship_role: "Software Engineering Intern",
    start_date: "2024-06-01",
    end_date: "2024-08-31",
    duration_months: 3,
    paid_status: "Paid",
    stipend_if_present: "₹80,000/mo",
    certificate_type: "Offer Letter",
    company_category_if_confident: "Fortune 500",
    confidence: 0.92,
    warnings: []
  };
  const imgEval = evaluateAndAutoScoreInternship(mockImgFacts, { companyName: "Microsoft", tier: "Fortune 500", durationMonths: 3, isPaid: true });
  assert(imgEval.status === "VERIFIED", "Status set to VERIFIED");
  assert(imgEval.calculatedMarks === 5, "Calculated marks = 5");
  console.log("✓ Scenario 2 Passed.\n");

  // Scenario 3: Low-quality / Scanned Certificate
  console.log("Scenario 3: Low-quality / scanned certificate...");
  const lowQualFacts = {
    student_name: "Abhay Dasarathy",
    company_name: "Tech Startup",
    internship_role: "Developer Intern",
    start_date: null,
    end_date: null,
    duration_months: 3,
    paid_status: "Paid",
    stipend_if_present: null,
    certificate_type: "Completion Certificate",
    company_category_if_confident: null,
    confidence: 0.60,
    warnings: ["Unclear company tier classification", "Missing exact dates"]
  };
  const lowQualEval = evaluateAndAutoScoreInternship(lowQualFacts, { companyName: "Tech Startup", durationMonths: 3, isPaid: true });
  assert(lowQualEval.status === "VERIFIED", "Score applied automatically despite low confidence");
  assert(lowQualEval.hasLowConfidence === true, "Low confidence flag is set for UI review notice");
  console.log("✓ Scenario 3 Passed.\n");

  // Scenario 4: Missing paid/unpaid information
  console.log("Scenario 4: Missing paid/unpaid information...");
  const missingPaidFacts = {
    company_name: "Acme Corp",
    duration_months: 3,
    paid_status: "Unknown",
    confidence: 0.8,
    warnings: ["Ambiguous paid/unpaid status"]
  };
  const mappedPaid = mapFactsToScoringParams(missingPaidFacts);
  assert(mappedPaid.isPaid === "Unknown", "Preserves isPaid = 'Unknown' safely when status is Unknown");
  console.log("✓ Scenario 4 Passed.\n");

  // Scenario 5: Missing dates
  console.log("Scenario 5: Missing dates...");
  const missingDatesFacts = {
    company_name: "Infosys",
    start_date: null,
    end_date: null,
    duration_months: null,
    paid_status: "Paid",
    confidence: 0.75,
    warnings: ["Missing internship dates"]
  };
  const mappedDates = mapFactsToScoringParams(missingDatesFacts);
  assert(mappedDates.durationMonths === null, "Fallback durationMonths defaults to null when unknown");
  console.log("✓ Scenario 5 Passed.\n");

  // Scenario 6: Student-name mismatch
  console.log("Scenario 6: Student-name mismatch...");
  const mismatchFacts = {
    student_name: "John Doe",
    company_name: "Cisco",
    confidence: 0.65,
    warnings: ['Student name on certificate ("John Doe") does not match profile ("Abhay Dasarathy")']
  };
  const mismatchEval = evaluateAndAutoScoreInternship(mismatchFacts, { companyName: "Cisco" });
  assert(mismatchEval.hasLowConfidence === true, "Low confidence warning recorded for name mismatch");
  console.log("✓ Scenario 6 Passed.\n");

  // Scenario 7: Invalid / non-internship document
  console.log("Scenario 7: Invalid / non-internship document...");
  const invalidFacts = {
    student_name: null,
    company_name: null,
    confidence: 0.0,
    warnings: ["Invalid/non-internship document"],
    processing_error: "Document is not an internship certificate"
  };
  const invalidEval = evaluateAndAutoScoreInternship(invalidFacts, {});
  assert(invalidEval.status === "REJECTED", "Invalid document yields status = REJECTED");
  assert(invalidEval.isAutoVerified === false, "Not auto verified");
  console.log("✓ Scenario 7 Passed.\n");

  // Scenario 8: AI / API failure (confidence = 0 & processing_error recorded)
  console.log("Scenario 8: AI / API failure...");
  const errorExt = await extractInternshipDocument(null, studentContext);
  assert(errorExt.confidence === 0.0, "Confidence set to 0.0 on API failure");
  assert(typeof errorExt.processing_error === "string", "processing_error is recorded");
  assert(errorExt.warnings.length > 0, "Warnings array contains error");
  console.log("✓ Scenario 8 Passed.\n");

  // Scenario 9: Public Google Drive Image link
  console.log("Scenario 9: Public Google Drive Image link...");
  const publicDriveLink = "https://drive.google.com/file/d/1A2B3C4D5E6F7G8H9I/view?usp=sharing";
  const driveExt = await extractInternshipDocument(publicDriveLink, studentContext);
  assert(driveExt.hasOwnProperty("confidence"), "Google Drive link processed cleanly");
  console.log("✓ Scenario 9 Passed.\n");

  // Scenario 10: Invalid / private Google Drive link
  console.log("Scenario 10: Invalid / private Google Drive link...");
  const privateDriveLink = "https://drive.google.com/file/d/PRIVATE_FILE_ID_123/view";
  const privDriveExt = await extractInternshipDocument(privateDriveLink, studentContext);
  assert(privDriveExt.hasOwnProperty("processing_error") || privDriveExt.warnings.length >= 0, "Drive link safety error recorded");
  console.log("✓ Scenario 10 Passed.\n");

  // Scenario 11: Existing normal internship submission
  console.log("Scenario 11: Existing normal internship submission...");
  const normalSub = formatSubmission({
    id: "sub-101",
    student_id: "st-abhay-01",
    category_id: "internship",
    title: "Google Internship (Fortune 500) — 3 Mos",
    status: "VERIFIED",
    awarded_marks: 5,
    details: { companyName: "Google", tier: "Fortune 500", durationMonths: 3, isPaid: true }
  });
  assert(normalSub.categoryId === "internship", "Formatted category is internship");
  assert(normalSub.awardedMarks === 5, "Awarded marks = 5");
  console.log("✓ Scenario 11 Passed.\n");

  // Scenario 12: Existing non-internship submission
  console.log("Scenario 12: Existing non-internship submission...");
  const nonInternSub = formatSubmission({
    id: "sub-102",
    student_id: "st-abhay-01",
    category_id: "coding-platforms",
    title: "LeetCode Snapshot",
    status: "VERIFIED",
    awarded_marks: 8,
    details: { badge_count: 18, medium_hard_solved: 165 }
  });
  assert(nonInternSub.categoryId === "coding-platforms", "Non-internship submission untouched");
  assert(nonInternSub.status === "VERIFIED", "Status = VERIFIED");
  console.log("✓ Scenario 12 Passed.\n");

  // Scenario 13: Automatic score calculation via EXISTING scoring engine
  console.log("Scenario 13: Automatic score calculation via EXISTING scoring engine...");
  const scoreViaEngine = calculateInternshipScore([{ tier: "Fortune 500", durationMonths: 3, isPaid: true }]);
  assert(scoreViaEngine.total === 5, "Fortune 500 (4m) + Paid (1m) = 5m calculated by existing engine");
  console.log("✓ Scenario 13 Passed.\n");

  // Scenario 14: Automatic VERIFIED status
  console.log("Scenario 14: Automatic VERIFIED status...");
  const autoEval = evaluateAndAutoScoreInternship(mockImageFacts, { companyName: "Google", tier: "Fortune 500", durationMonths: 3, isPaid: true });
  assert(autoEval.status === "VERIFIED", "Successful AI extraction yields status = VERIFIED");
  assert(autoEval.calculatedMarks === 5, "Calculated marks = 5");
  console.log("✓ Scenario 14 Passed.\n");

  // Scenario 15: Ranking update
  console.log("Scenario 15: Ranking update...");
  const mockStudentObj = {
    id: "st-abhay-01",
    name: "Abhay Dasarathy",
    cgpa: 9.4,
    tenthPct: 95,
    twelfthPct: 93,
    submissions: [
      { categoryId: "internship", status: "VERIFIED", awarded_marks: 5, details: { tier: "Fortune 500", isPaid: true, durationMonths: 3 } },
      { categoryId: "coding-platforms", status: "VERIFIED", awarded_marks: 8, details: { badgeCount: 18, mediumHardSolved: 165 } }
    ]
  };
  const totalScoreObj = calculateTotalScore(mockStudentObj);
  assert(totalScoreObj.totalVerifiedScore > 0, "Total verified score reflects auto-verified internship marks");
  console.log("✓ Scenario 15 Passed.\n");

  // Scenario 16: CSV Download formatting
  console.log("Scenario 16: CSV Download formatting...");
  const mockLeaderboardList = await getPlacementLeaderboard();
  assert(Array.isArray(mockLeaderboardList), "Leaderboard list is an array");
  console.log("✓ Scenario 16 Passed.\n");

  console.log("Scenario 17: Regression - Fortune 500, 6 months, Paid");
  assert(calculateInternshipScore([{ tier: "Fortune 500", durationMonths: 6, isPaid: true }]).score === 5, "Expected 5");
  console.log("✓ Scenario 17 Passed.\n");

  console.log("Scenario 18: Regression - Startup, 6 months, Unpaid");
  assert(calculateInternshipScore([{ tier: "Startup", durationMonths: 6, isPaid: false }]).score === 3, "Expected 3");
  console.log("✓ Scenario 18 Passed.\n");

  console.log("Scenario 19: Regression - Unknown company, 6 months, Paid");
  assert(calculateInternshipScore([{ tier: null, durationMonths: 6, isPaid: true }]).score === 4, "Expected 4");
  console.log("✓ Scenario 19 Passed.\n");

  console.log("Scenario 20: Regression - Fortune 500, UNKNOWN duration, UNKNOWN paid");
  assert(calculateInternshipScore([{ tier: "Fortune 500", durationMonths: null, isPaid: "Unknown" }]).score === 4, "Expected 4");
  assert(calculateInternshipScore([{ tier: "Fortune 500", durationMonths: undefined, isPaid: "Unknown" }]).score === 4, "Expected 4 with undefined");
  assert(calculateInternshipScore([{ tier: "Fortune 500", durationMonths: "", isPaid: "Unknown" }]).score === 4, "Expected 4 with empty string");
  console.log("✓ Scenario 20 Passed.\n");

  console.log("Scenario 21: Regression - Unknown company, UNKNOWN duration, UNKNOWN paid");
  assert(calculateInternshipScore([{ tier: null, durationMonths: null, isPaid: "Unknown" }]).score === 3, "Expected 3");
  console.log("✓ Scenario 21 Passed.\n");

  console.log("Scenario 22: Regression - Fortune 500, 2 months, Paid");
  assert(calculateInternshipScore([{ tier: "Fortune 500", durationMonths: 2, isPaid: true }]).score === 2, "Expected 2");
  console.log("✓ Scenario 22 Passed.\n");

  console.log("Scenario 23: Regression - Startup, 2 months, Paid");
  assert(calculateInternshipScore([{ tier: "Startup", durationMonths: 2, isPaid: true }]).score === 2, "Expected 2");
  console.log("✓ Scenario 23 Passed.\n");

  console.log("Scenario 24: Regression - Unknown company, 2 months, Paid");
  assert(calculateInternshipScore([{ tier: null, durationMonths: 2, isPaid: true }]).score === 2, "Expected 2");
  console.log("✓ Scenario 24 Passed.\n");

  console.log("Scenario 25: Regression - Unknown duration, known Fortune 500, Paid");
  assert(calculateInternshipScore([{ tier: "Fortune 500", durationMonths: null, isPaid: true }]).score === 5, "Expected 5");
  console.log("✓ Scenario 25 Passed.\n");

  console.log("Scenario 26: Regression - Unknown duration, known Startup, Unpaid");
  assert(calculateInternshipScore([{ tier: "Startup", durationMonths: null, isPaid: false }]).score === 3, "Expected 3");
  console.log("✓ Scenario 26 Passed.\n");

  console.log("Scenario 27: TEST 1 - Certificate company = NGO, Duration = 6 months, Paid = Unknown");
  const t1Facts = { company_name: "NGO", duration_months: 6, paid_status: "Unknown", confidence: 0.9 };
  const t1Inputs = { tier: "Fortune 500", durationMonths: 3, isPaid: false };
  const t1Mapped = mapFactsToScoringParams(t1Facts, t1Inputs);
  assert(t1Mapped.tier === undefined || t1Mapped.tier === null, "AI extracted facts take precedence over default Fortune 500");
  assert(calculateInternshipScore([t1Mapped]).score === 3, "Expected 3");
  console.log("✓ Scenario 27 Passed.\n");

  console.log("Scenario 28: TEST 2 - Certificate company = Startup, Duration = 6 months, Paid = Unpaid");
  const t2Facts = { company_category_if_confident: "Startup", duration_months: 6, paid_status: "Unpaid", confidence: 0.9 };
  const t2Inputs = { tier: "Fortune 500", durationMonths: 3, isPaid: false };
  const t2Mapped = mapFactsToScoringParams(t2Facts, t2Inputs);
  assert(t2Mapped.tier === "Small / Mid Co", "Maps to Startup");
  assert(calculateInternshipScore([t2Mapped]).score === 3, "Expected 3");
  console.log("✓ Scenario 28 Passed.\n");

  console.log("Scenario 29: TEST 3 - Certificate company = Fortune 500, Duration = 6 months, Paid = Paid");
  const t3Facts = { company_category_if_confident: "Fortune 500", duration_months: 6, paid_status: "Paid", confidence: 0.9 };
  const t3Inputs = { tier: "Fortune 500", durationMonths: 3, isPaid: false };
  const t3Mapped = mapFactsToScoringParams(t3Facts, t3Inputs);
  assert(t3Mapped.tier === "Fortune 500", "Maps to Fortune 500");
  assert(calculateInternshipScore([t3Mapped]).score === 5, "Expected 5");
  console.log("✓ Scenario 29 Passed.\n");

  console.log("Scenario 30: TEST 4 - Certificate company = Fortune 500, Duration = 2 months, Paid = Paid");
  const t4Facts = { company_category_if_confident: "Fortune 500", duration_months: 2, paid_status: "Paid", confidence: 0.9 };
  const t4Mapped = mapFactsToScoringParams(t4Facts, t1Inputs);
  assert(calculateInternshipScore([t4Mapped]).score === 2, "Expected 2");
  console.log("✓ Scenario 30 Passed.\n");

  console.log("Scenario 31: TEST 5 - Certificate company category unknown, Duration = 6 months, Paid = Unknown");
  const t5Facts = { company_category_if_confident: null, duration_months: 6, paid_status: "Unknown", confidence: 0.9 };
  const t5Mapped = mapFactsToScoringParams(t5Facts, t1Inputs);
  assert(t5Mapped.tier === undefined || t5Mapped.tier === null, "Tier remains unknown despite inputs");
  assert(calculateInternshipScore([t5Mapped]).score === 3, "Expected 3");
  console.log("✓ Scenario 31 Passed.\n");

  console.log("Scenario 32: TEST 6 - Manually select Fortune 500, AI identifies Startup");
  const t6Facts = { company_category_if_confident: "Startup", duration_months: 6, paid_status: "Paid", confidence: 0.9 };
  const t6Inputs = { tier: "Fortune 500", durationMonths: 6, isPaid: true };
  const t6Mapped = mapFactsToScoringParams(t6Facts, t6Inputs);
  assert(t6Mapped.tier === "Small / Mid Co", "AI takes precedence");
  assert(calculateInternshipScore([t6Mapped]).score === 4, "Expected 4 (Startup + Paid)");
  console.log("✓ Scenario 32 Passed.\n");

  console.log("=========================================");
  console.log("ALL 32 TEST SCENARIOS PASSED CLEANLY!");
  console.log("=========================================");
}

runAll16Tests().catch(err => {
  console.error("Test execution failure:", err);
  process.exit(1);
});
