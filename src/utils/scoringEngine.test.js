import {
  calculateAcademicsScore,
  calculateGitHubScore,
  calculateGithubScore,
  calculateCodingScore,
  calculateCodingPlatformScore,
  calculateInternshipScore,
  calculateSkillsetScore,
  calculateCertificationScore,
  getCertificationMarks,
  calculateProjectsScore,
  calculateFsdScore,
  calculateHackathonScore,
  calculateInhouseScore,
  calculateMembershipScore,
  calculateAssessmentScore,
  calculateTotalScore
} from "./scoringEngine.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

console.log("Starting Scoring Engine Rubric Verification Suite...\n");

// 1. Academics (10 Marks)
console.log("Test 1: Academics Scoring...");
const acad1 = calculateAcademicsScore(98, 97, 9.8);
assert(acad1.score === 10, `Expected 10, got ${acad1.score}`);
const acad2 = calculateAcademicsScore(92, 92, 9.2);
assert(acad2.score === 8, `Expected 8 (2+2+4), got ${acad2.score}`);
const acad3 = calculateAcademicsScore(88, 87, 8.8);
assert(acad3.score === 6, `Expected 6 (1.5+1.5+3), got ${acad3.score}`);
const acad4 = calculateAcademicsScore(78, 76, 7.6);
assert(acad4.score === 4, `Expected 4 (1+1+2), got ${acad4.score}`);
const acad5 = calculateAcademicsScore(70, 70, 7.0);
assert(acad5.score === 2, `Expected 2 (0.5+0.5+1), got ${acad5.score}`);
console.log("✓ Academics tests passed.");

// 2. GitHub (15 Marks)
console.log("Test 2: GitHub Scoring...");
const ghDirect = calculateGithubScore({
  contributionsLastYear: 25,
  avgMonthlyContributions: 2.5,
  communityProjectCount: 2,
  collaborationCount: 3
});
assert(ghDirect.score === 15, `Expected 15, got ${ghDirect.score}`);

const ghFull = calculateGithubScore([
  { contributionsLastYear: 25, avgMonthlyContributions: 3 },
  { type: "community_project" },
  { type: "community_project" },
  { type: "collaboration" },
  { type: "collaboration" },
  { type: "collaboration" }
]);
assert(ghFull.score === 15, `Expected 15, got ${ghFull.score}`);
const ghZero = calculateGithubScore({});
assert(ghZero.score === 0, `Expected 0, got ${ghZero.score}`);

// GitHub — corrected boundary tests per official PDF
assert(calculateGitHubScore({ contributionsLastYear: 15, avgMonthlyContributions: 0, communityProjectCount: 0, collaborationCount: 0 }).repoMarks === 3, "15 contribs = 3m");
assert(calculateGitHubScore({ contributionsLastYear: 16, avgMonthlyContributions: 0, communityProjectCount: 0, collaborationCount: 0 }).repoMarks === 4, "16 contribs = 4m");
assert(calculateGitHubScore({ contributionsLastYear: 20, avgMonthlyContributions: 0, communityProjectCount: 0, collaborationCount: 0 }).repoMarks === 4, "20 contribs = 4m");
assert(calculateGitHubScore({ contributionsLastYear: 21, avgMonthlyContributions: 0, communityProjectCount: 0, collaborationCount: 0 }).repoMarks === 5, "21 contribs = 5m");
assert(calculateGitHubScore({ contributionsLastYear: 0, avgMonthlyContributions: 0, communityProjectCount: 1, collaborationCount: 0 }).communityMarks === 2, "1 community proj = 2m");
assert(calculateGitHubScore({ contributionsLastYear: 0, avgMonthlyContributions: 0, communityProjectCount: 2, collaborationCount: 0 }).communityMarks === 3, "2 community projs = 3m capped");
assert(calculateGitHubScore({ contributionsLastYear: 0, avgMonthlyContributions: 0, communityProjectCount: 0, collaborationCount: 1 }).collabMarks === 2, "1 collab = 2m");
assert(calculateGitHubScore({ contributionsLastYear: 0, avgMonthlyContributions: 0, communityProjectCount: 0, collaborationCount: 3 }).collabMarks === 5, "3 collabs = 5m capped");
console.log("✓ GitHub tests passed.");

// 3. Coding Platform / LeetCode (10 Marks)
console.log("Test 3: Coding Platform Scoring...");
// Badges: 0, 4 -> 0; 5 -> 1; 10 -> 2; 15 -> 3; 20 -> 4; 25 -> 5
assert(calculateCodingPlatformScore({ badgeCount: 0, mediumHardSolved: 0 }).badgeMarks === 0, "0 badges = 0");
assert(calculateCodingPlatformScore({ badgeCount: 4, mediumHardSolved: 0 }).badgeMarks === 0, "4 badges = 0");
assert(calculateCodingPlatformScore({ badgeCount: 5, mediumHardSolved: 0 }).badgeMarks === 1, "5 badges = 1");
assert(calculateCodingPlatformScore({ badgeCount: 14, mediumHardSolved: 0 }).badgeMarks === 2, "14 badges = 2");
assert(calculateCodingPlatformScore({ badgeCount: 15, mediumHardSolved: 0 }).badgeMarks === 3, "15 badges = 3");
assert(calculateCodingPlatformScore({ badgeCount: 20, mediumHardSolved: 0 }).badgeMarks === 4, "20 badges = 4");
assert(calculateCodingPlatformScore({ badgeCount: 25, mediumHardSolved: 0 }).badgeMarks === 5, "25 badges = 5");
assert(calculateCodingPlatformScore({ badgeCount: 30, mediumHardSolved: 0 }).badgeMarks === 5, "30 badges = 5");

// Difficulty: 0->0, 10->0, 24->0, 25->1, 49->1, 50->2, 99->2, 100->3, 149->3, 150->4, 200->4, 201->5
assert(calculateCodingPlatformScore({ badgeCount: 0, mediumHardSolved: 10 }).total === 0, "10 solved = 0m");
assert(calculateCodingPlatformScore({ badgeCount: 0, mediumHardSolved: 24 }).total === 0, "24 solved = 0m");
assert(calculateCodingPlatformScore({ badgeCount: 0, mediumHardSolved: 25 }).total === 1, "25 solved = 1m");
assert(calculateCodingPlatformScore({ badgeCount: 0, mediumHardSolved: 49 }).difficultyMarks === 1, "49 solved = 1");
assert(calculateCodingPlatformScore({ badgeCount: 0, mediumHardSolved: 50 }).difficultyMarks === 2, "50 solved = 2");
assert(calculateCodingPlatformScore({ badgeCount: 0, mediumHardSolved: 99 }).difficultyMarks === 2, "99 solved = 2");
assert(calculateCodingPlatformScore({ badgeCount: 0, mediumHardSolved: 100 }).difficultyMarks === 3, "100 solved = 3");
assert(calculateCodingPlatformScore({ badgeCount: 0, mediumHardSolved: 149 }).difficultyMarks === 3, "149 solved = 3");
assert(calculateCodingPlatformScore({ badgeCount: 0, mediumHardSolved: 150 }).difficultyMarks === 4, "150 solved = 4");
assert(calculateCodingPlatformScore({ badgeCount: 0, mediumHardSolved: 200 }).difficultyMarks === 4, "200 solved = 4");
assert(calculateCodingPlatformScore({ badgeCount: 0, mediumHardSolved: 201 }).difficultyMarks === 5, "201 solved = 5");

const codingMax = calculateCodingPlatformScore({ badgeCount: 25, mediumHardSolved: 205 });
assert(codingMax.total === 10, `Expected 10, got ${codingMax.total}`);
console.log("✓ Coding Platform tests passed.");

// 4. Internship (10 Marks)
console.log("Test 4: Internship Scoring...");
// Paid bonus must not push Tier-1 above 5m
const tier1Paid = calculateInternshipScore([{ tier: 'IIT_NIT', isPaid: true, durationMonths: 6 }]);
assert(tier1Paid.total === 5, `Expected 5 for paid IIT/NIT, got ${tier1Paid.total}`);
const fortune500Paid = calculateInternshipScore([{ tier: 'FORTUNE_500', isPaid: true, durationMonths: 4 }]);
assert(fortune500Paid.total === 5, `Expected 5 for paid Fortune 500 (4+1), got ${fortune500Paid.total}`);

const internMax = calculateInternshipScore([
  { durationMonths: 6, tier: "SRM Placement", isPaid: true }, // 5 (capped)
  { durationMonths: 6, tier: "IIT/NIT", isPaid: false }      // 5
]);
assert(internMax.total === 10, `Expected 10, got ${internMax.total}`);
const internSmall = calculateInternshipScore([
  { durationMonths: 2, tier: "Startup", isPaid: false } // <3 months = 2
]);
assert(internSmall.total === 2, `Expected 2, got ${internSmall.total}`);
console.log("✓ Internship tests passed.");

// 5. Skillset & Certifications (15 Marks)
console.log("Test 5: Skillset / Certifications Scoring...");
assert(getCertificationMarks('CCNA') === 5, "CCNA = 5m");
assert(getCertificationMarks('MATLAB') === 5, "MATLAB = 5m");
assert(getCertificationMarks('RedHat') === 5, "RedHat = 5m");
assert(getCertificationMarks('IBM') === 5, "IBM = 5m");
assert(getCertificationMarks('NPTEL') === 3, "NPTEL = 3m");
assert(getCertificationMarks('Coursera') === 2, "Coursera = 2m");
assert(getCertificationMarks('Java') === 1, "Java = 1m");
assert(getCertificationMarks('Python') === 1, "Python = 1m");
assert(getCertificationMarks('Udemy') === 0.5, "Udemy = 0.5m");
assert(getCertificationMarks('Unknown Platform') === 0, "Unknown = 0m");

const certMax = calculateSkillsetScore([
  { provider: "CISCO CCNA" },  // 5
  { provider: "IBM Cloud" },   // 5
  { provider: "NPTEL Elite" }, // 3
  { provider: "Coursera Deep Learning" }, // 2
  { provider: "Java Dev" }     // 1
]);
assert(certMax.total === 15, `Expected 15 (5+5+3+2+1), got ${certMax.total}`);
console.log("✓ Skillset tests passed.");

// 6. Projects Done (5 Marks)
console.log("Test 6: Projects Done Scoring...");
const projMax = calculateProjectsScore([
  { projectType: "IIT/DRDO" } // 5
]);
assert(projMax.score === 5, `Expected 5, got ${projMax.score}`);
const projWeb = calculateProjectsScore([
  { projectType: "WEB" }, // 3
  { projectType: "MINI_HIGH" } // 2
]);
assert(projWeb.score === 5, `Expected 5 (3+2), got ${projWeb.score}`);
console.log("✓ Projects tests passed.");

// 7. Full Stack Developer Experience (5 Marks)
console.log("Test 7: Full Stack Scoring...");
// Complete full stack project (Hosted URL + GitHub repo) = 5 marks
assert(calculateFsdScore([{ title: "E-Commerce App", hostedUrl: "https://shop.vercel.app", githubUrl: "https://github.com/user/shop" }]).score === 5, "Hosted + Repo = 5m");
// Hosted URL only = 3 marks
assert(calculateFsdScore([{ title: "E-Commerce App", hostedUrl: "https://shop.vercel.app" }]).score === 3, "Hosted only = 3m");
// GitHub repo only = 3 marks
assert(calculateFsdScore([{ title: "E-Commerce App", githubUrl: "https://github.com/user/shop" }]).score === 3, "Repo only = 3m");
// Conceptual only (neither URL) = 1 mark
assert(calculateFsdScore([{ title: "E-Commerce App" }]).score === 1, "Conceptual = 1m");
// Empty = 0 marks
assert(calculateFsdScore([]).score === 0, "0 FSD projects = 0m");
// Faculty explicitly awarded marks (e.g. 4m)
assert(calculateFsdScore([{ title: "E-Commerce App", awarded_marks: 4 }]).score === 4, "Faculty awarded 4m respected");
console.log("✓ Full Stack tests passed.");

// 8. Competitions & Hackathons (10 Marks)
console.log("Test 8: Hackathons Scoring...");
const hackMax = calculateHackathonScore([
  { prize: "1st Prize" }, // 5
  { prize: "2nd Prize" }, // 4
  { prize: "Participation" } // 1
]);
assert(hackMax.score === 10, `Expected 10 (5+4+1), got ${hackMax.score}`);
console.log("✓ Hackathons tests passed.");

// 9. In-House Projects (8 Marks)
console.log("Test 9: In-House Projects Scoring...");
const inhouseMax = calculateInhouseScore([
  { title: "Campus Map" }, // 4
  { title: "Lab Automation" }, // 4
  { title: "Extra Project" } // ignored (max 2)
]);
assert(inhouseMax.score === 8, `Expected 8 (4*2), got ${inhouseMax.score}`);
console.log("✓ In-House tests passed.");

// 10. Professional Membership (2 Marks)
console.log("Test 10: Professional Membership Scoring...");
assert(calculateMembershipScore([{ organization: "IEEE" }]).score === 2, "Valid membership = 2");
assert(calculateMembershipScore([]).score === 0, "No membership = 0");
console.log("✓ Membership tests passed.");

// 11. Assessments (10 Marks — All 11 Bands)
console.log("Test 11: Assessments Scoring (All 11 Bands)...");
assert(calculateAssessmentScore(95).score === 10, "95 -> 10m");
assert(calculateAssessmentScore(90).score === 10, "90 -> 10m");
assert(calculateAssessmentScore(89).score === 9, "89 -> 9m");
assert(calculateAssessmentScore(80).score === 9, "80 -> 9m");
assert(calculateAssessmentScore(75).score === 8, "75 -> 8m");
assert(calculateAssessmentScore(70).score === 8, "70 -> 8m");
assert(calculateAssessmentScore(69).score === 7, "69 -> 7m (65-69 band)");
assert(calculateAssessmentScore(65).score === 7, "65 -> 7m");
assert(calculateAssessmentScore(64).score === 6, "64 -> 6m");
assert(calculateAssessmentScore(60).score === 6, "60 -> 6m");
assert(calculateAssessmentScore(59).score === 5, "59 -> 5m");
assert(calculateAssessmentScore(55).score === 5, "55 -> 5m");
assert(calculateAssessmentScore(54).score === 4, "54 -> 4m");
assert(calculateAssessmentScore(50).score === 4, "50 -> 4m");
assert(calculateAssessmentScore(49).score === 3, "49 -> 3m");
assert(calculateAssessmentScore(40).score === 3, "40 -> 3m");
assert(calculateAssessmentScore(39).score === 2, "39 -> 2m");
assert(calculateAssessmentScore(30).score === 2, "30 -> 2m");
assert(calculateAssessmentScore(29).score === 1, "29 -> 1m");
assert(calculateAssessmentScore(25).score === 1, "25 -> 1m");
assert(calculateAssessmentScore(24).score === 0, "24 -> 0m");
assert(calculateAssessmentScore(0).score === 0, "0 -> 0m");
console.log("✓ Assessments all 11 bands passed.");

// TOTAL SCORE 100 Marks Cap
console.log("Test 12: Total 100 Marks Aggregation & Cap...");
const totalPerf = calculateTotalScore({
  tenthPct: 98,
  twelfthPct: 98,
  cgpa: 9.8,
  codingBadges: 25,
  codingSolved: 210,
  assessmentScore: 95,
  submissions: [
    { categoryId: "github", status: "VERIFIED", contributionsLastYear: 25, avgMonthlyContributions: 3 },
    { categoryId: "github", status: "VERIFIED", type: "community_project" },
    { categoryId: "github", status: "VERIFIED", type: "community_project" },
    { categoryId: "github", status: "VERIFIED", type: "collaboration" },
    { categoryId: "github", status: "VERIFIED", type: "collaboration" },
    { categoryId: "github", status: "VERIFIED", type: "collaboration" },
    { categoryId: "internship", status: "VERIFIED", durationMonths: 6, tier: "SRM Placement", isPaid: true },
    { categoryId: "internship", status: "VERIFIED", durationMonths: 6, tier: "IIT/NIT", isPaid: false },
    { categoryId: "skillset", status: "VERIFIED", provider: "CISCO" },
    { categoryId: "skillset", status: "VERIFIED", provider: "IBM" },
    { categoryId: "skillset", status: "VERIFIED", provider: "NPTEL" },
    { categoryId: "skillset", status: "VERIFIED", provider: "COURSERA" },
    { categoryId: "projects", status: "VERIFIED", projectType: "IIT/DRDO" },
    { categoryId: "fullstack", status: "VERIFIED", title: "Cloud Portal", hostedUrl: "https://cloud.app", githubUrl: "https://github.com/cloud/portal", awarded_marks: 5 },
    { categoryId: "hackathons", status: "VERIFIED", prize: "1st Prize" },
    { categoryId: "hackathons", status: "VERIFIED", prize: "2nd Prize" },
    { categoryId: "hackathons", status: "VERIFIED", prize: "Participation" },
    { categoryId: "inhouse-projects", status: "VERIFIED", title: "Project A" },
    { categoryId: "inhouse-projects", status: "VERIFIED", title: "Project B" },
    { categoryId: "membership", status: "VERIFIED", organization: "IEEE" }
  ]
});

console.log("Total Verified Score:", totalPerf.totalVerifiedScore);
assert(totalPerf.totalVerifiedScore === 100, `Expected 100 marks cap, got ${totalPerf.totalVerifiedScore}`);
console.log("✓ Total Score Cap & Aggregation tests passed.");

// 13. Single-claim category mark reduction/revision
console.log("Test 13: Academics Mark Reduction / Revision...");
const studentWithReduction = calculateTotalScore({
  tenthPct: 94.2,
  twelfthPct: 89,
  cgpa: 9.1,
  submissions: [
    {
      categoryId: "academics",
      status: "VERIFIED",
      awardedMarks: 7.5,
      awarded_marks: 7.5,
      created_at: "2026-09-24T14:32:53.000Z",
      updated_at: "2026-09-24T14:33:16.000Z",
      details: { tenthPct: 94.2, twelfthPct: 89, cgpa: 9.1, calculated_marks: 7.5 }
    },
    {
      categoryId: "academics",
      status: "VERIFIED",
      awardedMarks: 8.5,
      awarded_marks: 8.5,
      created_at: "2026-09-24T14:32:21.000Z",
      updated_at: "2026-09-24T14:32:32.000Z",
      details: { tenthPct: 94.2, twelfthPct: 89, cgpa: 9.91, calculated_marks: 8.5 }
    }
  ]
});
assert(studentWithReduction.categoryScores.academics.score === 7.5, `Expected 7.5, got ${studentWithReduction.categoryScores.academics.score}`);
console.log("✓ Academics reduction from 8.5 to 7.5 correctly respected latest verified submission.");

console.log("\n========================================");
console.log("ALL 13 SCORING ENGINE TEST SUITES PASSED!");
console.log("========================================");

