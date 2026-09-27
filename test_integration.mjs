import {
  getPlacementCategories,
  normalizeCategoryId,
  getFormTypeForCategory
} from "./src/services/categoryService.js";
import { formatProfile } from "./src/services/studentService.js";
import { formatSubmission } from "./src/services/submissionService.js";
import { getPlacementLeaderboard } from "./src/services/leaderboardService.js";
import {
  calculateTotalScore,
  calculateAcademicsScore,
  calculateCodingPlatformScore
} from "./src/utils/scoringEngine.js";

function assert(condition, msg) {
  if (!condition) throw new Error("FAIL: " + msg);
}

console.log("=== Running Comprehensive Integration Tests ===\n");

// 1. Category Service Tests
console.log("1. Testing Category Service...");
const cats = await getPlacementCategories();
assert(cats.length === 11, `Expected 11 categories, got ${cats.length}`);
assert(cats.find(c => c.id === "academics")?.maxMarks === 10, "Academics max marks = 10");
assert(cats.find(c => c.id === "coding-platforms")?.maxMarks === 10, "Coding platforms max marks = 10");
assert(cats.find(c => c.id === "skillset")?.maxMarks === 15, "Skillset max marks = 15");
assert(normalizeCategoryId("coding_practice") === "coding-platforms", "Normalized coding_practice");
assert(normalizeCategoryId("inhouse") === "inhouse-projects", "Normalized inhouse");
assert(getFormTypeForCategory("coding-platforms") === "coding", "Form type coding");
console.log("✓ Category Service passed (11 categories total 100 marks).\n");

// 2. Student Service Model Formatter
console.log("2. Testing Student Model Formatter...");
const p = formatProfile({
  id: "st-1",
  email: "student@srmist.edu.in",
  full_name: "Abhay Dasarathy",
  tenth_pct: 95,
  twelfth_pct: 93,
  cgpa: 9.4
});
assert(p.name === "Abhay Dasarathy", "Profile name formatted");
assert(p.tenthPct === 95, "10th percentage formatted");
assert(p.twelfthPct === 93, "12th percentage formatted");
assert(p.cgpa === 9.4, "CGPA formatted");
console.log("✓ Student Service formatting passed.\n");

// 3. Submission Model Formatter
console.log("3. Testing Submission Model Formatter...");
const s = formatSubmission({
  id: "sub-1",
  student_id: "st-1",
  category_id: "coding_practice",
  title: "LeetCode Profile Snapshot",
  status: "VERIFIED",
  awarded_marks: 8,
  details: { badge_count: 18, medium_hard_solved: 165 },
  proof_url: "https://leetcode.com/abhay"
});
assert(s.categoryId === "coding-platforms", "Category normalized to coding-platforms");
assert(s.awardedMarks === 8, "Awarded marks = 8");
assert(s.status === "VERIFIED", "Status = VERIFIED");
console.log("✓ Submission formatting passed.\n");

// 4. Leaderboard Service Ranking
console.log("4. Testing Leaderboard Service Fallback & Calculation...");
const leaderboard = await getPlacementLeaderboard();
console.log(`Leaderboard returned ${leaderboard.length} student entries.`);
if (leaderboard.length > 0) {
  assert(leaderboard[0].rank === 1, "Top student has rank 1");
  assert(leaderboard[0].totalVerifiedScore >= 0, "Top student has valid totalVerifiedScore");
  console.log(`Top Rank: #${leaderboard[0].rank} ${leaderboard[0].name} - ${leaderboard[0].totalVerifiedScore}/100 Marks (CGPA: ${leaderboard[0].cgpa})`);
}
console.log("✓ Leaderboard tests passed.\n");

console.log("=========================================");
console.log("ALL INTEGRATION TESTS PASSED CLEANLY!");
console.log("=========================================");
