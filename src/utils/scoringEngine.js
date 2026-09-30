/**
 * Official SRM Institute of Science and Technology Placement Ranking Rubric Scoring Engine
 * Total Score Capacity: 100 Marks across 11 Categories.
 */

// 1. ACADEMICS (Max 10 Marks)
export function calculateAcademicsScore(tenthPct = 0, twelfthPct = 0, cgpa = 0) {
  let tenthMarks = 0;
  if (tenthPct >= 96) tenthMarks = 2.5;
  else if (tenthPct >= 91) tenthMarks = 2.0;
  else if (tenthPct >= 86) tenthMarks = 1.5;
  else if (tenthPct >= 75) tenthMarks = 1.0;
  else if (tenthPct > 0) tenthMarks = 0.5;

  let twelfthMarks = 0;
  if (twelfthPct >= 96) twelfthMarks = 2.5;
  else if (twelfthPct >= 91) twelfthMarks = 2.0;
  else if (twelfthPct >= 86) twelfthMarks = 1.5;
  else if (twelfthPct >= 75) twelfthMarks = 1.0;
  else if (twelfthPct > 0) twelfthMarks = 0.5;

  let cgpaMarks = 0;
  if (cgpa > 9.5) cgpaMarks = 5.0;
  else if (cgpa >= 9.1) cgpaMarks = 4.0;
  else if (cgpa >= 8.6) cgpaMarks = 3.0;
  else if (cgpa >= 7.5) cgpaMarks = 2.0;
  else if (cgpa > 0) cgpaMarks = 1.0;

  const rawScore = tenthMarks + twelfthMarks + cgpaMarks;
  const score = Math.min(10, Number(rawScore.toFixed(2)));

  return {
    score,
    maxScore: 10,
    breakdown: {
      tenthMarks,
      twelfthMarks,
      cgpaMarks,
      tenthPct,
      twelfthPct,
      cgpa
    }
  };
}

// 2. GITHUB PROFILE (Max 15 Marks)
export function calculateGitHubScore(input = {}) {
  let contributionsLastYear = 0;
  let avgMonthlyContributions = 0;
  let communityProjectCount = 0;
  let collaborationCount = 0;

  if (Array.isArray(input)) {
    input.forEach(item => {
      const d = { ...(item || {}), ...(typeof item?.details === 'object' && item.details ? item.details : {}) };
      if (d.contributionsLastYear !== undefined) contributionsLastYear = Math.max(contributionsLastYear, Number(d.contributionsLastYear));
      else if (d.contributions_last_year !== undefined) contributionsLastYear = Math.max(contributionsLastYear, Number(d.contributions_last_year));
      else if (d.totalContributions !== undefined) contributionsLastYear = Math.max(contributionsLastYear, Number(d.totalContributions));
      else if (d.total_contributions !== undefined) contributionsLastYear = Math.max(contributionsLastYear, Number(d.total_contributions));
      else if (d.reposLastYear !== undefined) contributionsLastYear = Math.max(contributionsLastYear, Number(d.reposLastYear));
      else if (d.repos_last_year !== undefined) contributionsLastYear = Math.max(contributionsLastYear, Number(d.repos_last_year));

      if (d.avgMonthlyContributions !== undefined) avgMonthlyContributions = Math.max(avgMonthlyContributions, Number(d.avgMonthlyContributions));
      else if (d.avg_monthly_contributions !== undefined) avgMonthlyContributions = Math.max(avgMonthlyContributions, Number(d.avg_monthly_contributions));
      else if (d.avgMonthlyFrequency !== undefined) avgMonthlyContributions = Math.max(avgMonthlyContributions, Number(d.avgMonthlyFrequency));
      else if (d.avg_monthly_frequency !== undefined) avgMonthlyContributions = Math.max(avgMonthlyContributions, Number(d.avg_monthly_frequency));
      else if (d.monthlyFreq !== undefined) avgMonthlyContributions = Math.max(avgMonthlyContributions, Number(d.monthlyFreq));

      if (d.communityProjectCount !== undefined) communityProjectCount = Math.max(communityProjectCount, Number(d.communityProjectCount));
      else if (d.community_project_count !== undefined) communityProjectCount = Math.max(communityProjectCount, Number(d.community_project_count));
      else if (d.communityProjects !== undefined) communityProjectCount = Math.max(communityProjectCount, Number(d.communityProjects));
      else if (d.community_projects !== undefined) communityProjectCount = Math.max(communityProjectCount, Number(d.community_projects));
      else if (item.type === "community_project") communityProjectCount += 1;

      if (d.collaborationCount !== undefined) collaborationCount = Math.max(collaborationCount, Number(d.collaborationCount));
      else if (d.collaboration_count !== undefined) collaborationCount = Math.max(collaborationCount, Number(d.collaboration_count));
      else if (d.collaborations !== undefined) collaborationCount = Math.max(collaborationCount, Number(d.collaborations));
      else if (d.collaborationsCount !== undefined) collaborationCount = Math.max(collaborationCount, Number(d.collaborationsCount));
      else if (item.type === "collaboration") collaborationCount += 1;
    });
  } else if (typeof input === "object" && input !== null) {
    contributionsLastYear = Number(
      input.contributionsLastYear ??
      input.contributions_last_year ??
      input.totalContributions ??
      input.total_contributions ??
      input.reposLastYear ??
      input.repos_last_year ?? 0
    );
    avgMonthlyContributions = Number(
      input.avgMonthlyContributions ??
      input.avg_monthly_contributions ??
      input.avgMonthlyFrequency ??
      input.avg_monthly_frequency ??
      input.monthlyFreq ?? 0
    );
    communityProjectCount = Number(
      input.communityProjectCount ??
      input.community_project_count ??
      input.communityProjects ??
      input.community_projects ?? 0
    );
    collaborationCount = Number(
      input.collaborationCount ??
      input.collaboration_count ??
      input.collaborations ??
      input.collaborationsCount ?? 0
    );
  }

  // Sub-component A: Contributions / Repos in last 1 year — 5 marks
  // Official PDF bands: >20, 16-20, 11-15, 6-10, 1-5, 0
  const repoMarks =
    contributionsLastYear > 20  ? 5 :
    contributionsLastYear >= 16 ? 4 :
    contributionsLastYear >= 11 ? 3 :
    contributionsLastYear >= 6  ? 2 :
    contributionsLastYear >= 1  ? 1 : 0;

  // Sub-component B: Monthly frequency — 2 marks
  // Official PDF: 2 per month = 2m, 1 per month = 1m, 0 = 0m
  const frequencyMarks =
    avgMonthlyContributions >= 2 ? 2 :
    avgMonthlyContributions >= 1 ? 1 : 0;

  // Sub-component C: Community projects — max 2 projects considered, 2m each, sub-total capped at 3m
  // 1 project = 2m, 2 projects = 3m (not 4m — PDF cap)
  const effectiveCommunityProjects = Math.min(communityProjectCount, 2);
  const communityMarks = Math.min(effectiveCommunityProjects * 2, 3);

  // Sub-component D: Collaborations — max 3 considered, 2m each, sub-total capped at 5m
  // 1 collab = 2m, 2 collabs = 4m, 3 collabs = 5m (not 6m — PDF cap)
  const effectiveCollabs = Math.min(collaborationCount, 3);
  const collabMarks = Math.min(effectiveCollabs * 2, 5);

  const total = Math.min(repoMarks + frequencyMarks + communityMarks + collabMarks, 15);

  return {
    repoMarks,
    frequencyMarks,
    communityMarks,
    collabMarks,
    total,
    score: total,
    maxScore: 15,
    breakdown: {
      contributionsLastYear,
      avgMonthlyContributions,
      communityProjectCount: effectiveCommunityProjects,
      collaborationCount: effectiveCollabs,
      yearMarks: repoMarks,
      freqMarks: frequencyMarks,
      reposLastYear: contributionsLastYear,
      avgMonthlyFrequency: avgMonthlyContributions,
      communityProjects: effectiveCommunityProjects,
      collaborations: effectiveCollabs
    }
  };
}

export const calculateGithubScore = calculateGitHubScore;

// 3. CODING PRACTICE PLATFORM (Max 10 Marks)
export function calculateCodingScore(badgesCount = 0, mediumHardSolved = 0) {
  // A. Badges (5 marks)
  let badgeMarks = 0;
  if (badgesCount >= 25) badgeMarks = 5;
  else if (badgesCount >= 20) badgeMarks = 4;
  else if (badgesCount >= 15) badgeMarks = 3;
  else if (badgesCount >= 10) badgeMarks = 2;
  else if (badgesCount >= 5) badgeMarks = 1;

  // B. Medium + Difficult Questions Solved (5 marks)
  let questionMarks = 0;
  if (mediumHardSolved > 200) questionMarks = 5;
  else if (mediumHardSolved >= 150) questionMarks = 4;
  else if (mediumHardSolved >= 100) questionMarks = 3;
  else if (mediumHardSolved >= 50) questionMarks = 2;
  else if (mediumHardSolved >= 25) questionMarks = 1;

  const score = Math.min(10, badgeMarks + questionMarks);

  return {
    score,
    maxScore: 10,
    breakdown: {
      badgeMarks,
      questionMarks,
      badgesCount,
      mediumHardSolved
    }
  };
}

// 4. INTERNSHIP EXPERIENCE (Max 10 Marks)
export function calculateInternshipScore(internships = []) {
  const getItemScore = ({ tier, isPaid, durationMonths, duration }) => {
    const dur = durationMonths !== undefined ? Number(durationMonths) : (duration !== undefined ? Number(duration) : undefined);
    // Duration < 3 months overrides tier — short duration = 2m regardless of company
    if (dur !== undefined && dur < 3) {
      return 2; // Short duration: 2m flat, paid bonus does NOT apply per PDF
    }

    let tierBase = 0;
    const t = (tier || '').toUpperCase();

    if (t.includes('IIT') || t.includes('NIT') || t.includes('SRM')) {
      tierBase = 5; // IIT / NIT / SRM Placement Partner
    } else if (t.includes('FORTUNE') || t.includes('500') || t.includes('MNC')) {
      tierBase = 4; // Fortune 500 / MNC
    } else if (t.includes('SMALL') || t.includes('STARTUP') || t.includes('SME') || t.includes('MID')) {
      tierBase = 3; // Small / Startup
    } else {
      tierBase = 3;
    }

    // Paid bonus: +1 mark, but total per internship cannot exceed 5m
    const paidBonus = isPaid ? 1 : 0;
    return Math.min(tierBase + paidBonus, 5);
  };

  // Sum scores across all internships, total capped at 10m
  const total = internships.reduce((sum, item) => sum + getItemScore(item), 0);

  return {
    total: Math.min(total, 10),
    score: Math.min(total, 10),
    maxScore: 10,
    breakdown: {
      internshipCount: internships.length,
      rawScore: total
    }
  };
}

// 5. SKILLSET & STANDARD CERTIFICATIONS (Max 15 Marks)
export function getCertificationMarks(provider = '') {
  const p = (provider || '').toUpperCase().trim();

  // 5 marks — exactly as listed in official SRMIST PDF
  const tier5 = ['CISCO', 'CCNA', 'CCNP', 'MCNA', 'MCNP', 'MATLAB', 'REDHAT', 'IBM'];
  if (tier5.some(t => p.includes(t))) return 5;

  // 3 marks
  if (p.includes('NPTEL')) return 3;

  // 2 marks — PDF lists Coursera only
  // Note: AWS, Google Cloud, edX, Meta are NOT in the official PDF for 2m tier.
  // If placement cell has verbally confirmed these, add them here with a comment.
  // For now, strictly following the PDF:
  if (p.includes('COURSERA')) return 2;

  // 1 mark — programming language certifications
  const progLangs = ['PYTHON', 'JAVA', 'C++', 'CPP', 'C PROGRAMMING', 'JAVASCRIPT', 'PROGRAMMING'];
  if (progLangs.some(t => p.includes(t))) return 1;

  // 0.5 marks — Udemy (PDF explicitly lists this)
  if (p.includes('UDEMY')) return 0.5;

  return 0;
}

export function calculateSkillsetScore(certifications = []) {
  if (!certifications || certifications.length === 0) {
    return { total: 0, score: 0, maxScore: 15, certBreakdown: [], breakdown: { totalEvaluated: 0, rawScore: 0 } };
  }

  // Only top 5 certifications considered per PDF, sorted by marks descending
  const marksPerCert = certifications.map(c => ({
    name: c.name || c.cert_name || c.title || c.certName || '',
    provider: c.provider || '',
    marks: getCertificationMarks(c.provider || c.title || c.name || '')
  }));

  const top5 = marksPerCert
    .sort((a, b) => b.marks - a.marks)
    .slice(0, 5);

  const total = Math.min(
    top5.reduce((sum, c) => sum + c.marks, 0),
    15
  );

  return {
    total,
    score: total,
    maxScore: 15,
    certBreakdown: top5,
    breakdown: {
      totalEvaluated: top5.length,
      rawScore: total
    }
  };
}

export const calculateCertificationScore = calculateSkillsetScore;

// 6. PROJECTS DONE (Max 5 Marks)
export function calculateProjectsScore(projects = []) {
  // Maximum 3 projects considered
  const eligibleProjects = projects.slice(0, 3);

  let totalScore = 0;
  eligibleProjects.forEach(proj => {
    const type = (proj.projectType || proj.type || "").toUpperCase();
    let projMarks = 1;

    if (type.includes("IIT") || type.includes("NIT") || type.includes("DRDO")) {
      projMarks = 5;
    } else if (type.includes("GOVT") || type.includes("GOVERNMENT")) {
      projMarks = 4;
    } else if (type.includes("MOBILE") || type.includes("WEB")) {
      projMarks = 3;
    } else if (type.includes("MINI_HIGH") || proj.quality === "high") {
      projMarks = 2;
    } else {
      projMarks = 1;
    }

    totalScore += projMarks;
  });

  const score = Math.min(5, totalScore);

  return {
    score,
    maxScore: 5,
    breakdown: {
      totalEvaluated: eligibleProjects.length,
      rawScore: totalScore
    }
  };
}

// 7. FULL STACK DEVELOPER EXPERIENCE (Max 5 Marks)
export function calculateFsdProjectMarks({ name, title, liveUrl, hostedUrl, githubUrl, repoUrl, description } = {}) {
  const projName = (name || title || '').trim();
  if (!projName) return 0;

  const hosted = (hostedUrl || liveUrl || '').trim();
  const repo = (githubUrl || repoUrl || '').trim();

  const hasHosted = Boolean(hosted && (hosted.startsWith('http://') || hosted.startsWith('https://') || hosted.includes('.')));
  const hasRepo = Boolean(repo && (repo.startsWith('http://') || repo.startsWith('https://') || repo.includes('github.com') || repo.includes('gitlab.com') || repo.includes('bitbucket.org') || repo.includes('.')));

  // Both hosted deployed application AND public code repository provided: 5 marks (full credit)
  if (hasHosted && hasRepo) {
    return 5;
  }

  // Deployed live application without public repo, or public repo without live deployment: 3 marks
  if (hasHosted || hasRepo) {
    return 3;
  }

  // Project title and description only (conceptual / unverified without URLs): 1 mark
  return 1;
}

export function calculateFsdScore(fsdProjects = []) {
  if (!fsdProjects || fsdProjects.length === 0) {
    return { score: 0, maxScore: 5, breakdown: { hasFsd: false, calculatedMarks: 0 } };
  }

  // Top/latest project evaluated (Max 1 project per rubric)
  const topProj = fsdProjects[0];
  const d = topProj.details || topProj;

  let score = 0;
  if (topProj.awarded_marks !== undefined && topProj.awarded_marks !== null && !isNaN(topProj.awarded_marks)) {
    score = Number(topProj.awarded_marks);
  } else if (topProj.awardedMarks !== undefined && topProj.awardedMarks !== null && !isNaN(topProj.awardedMarks)) {
    score = Number(topProj.awardedMarks);
  } else if (d.calculated_marks !== undefined && d.calculated_marks !== null && !isNaN(d.calculated_marks)) {
    score = Number(d.calculated_marks);
  } else {
    score = calculateFsdProjectMarks({
      name: d.title || d.name || topProj.title,
      hostedUrl: d.hostedUrl || d.hosted_url || d.liveUrl || d.live_url || topProj.proof_url || topProj.proofUrl,
      githubUrl: d.githubUrl || d.github_url || d.repoUrl || d.repo_url,
      description: d.description || d.short_description || d.shortDescription,
    });
  }

  const finalScore = Math.min(5, Math.max(0, score));

  return {
    score: finalScore,
    maxScore: 5,
    breakdown: {
      hasFsd: true,
      calculatedMarks: finalScore,
      projectName: d.title || d.name || topProj.title || '',
      hasHosted: Boolean(d.hostedUrl || d.hosted_url || d.liveUrl || d.live_url),
      hasRepo: Boolean(d.githubUrl || d.github_url || d.repoUrl || d.repo_url),
    }
  };
}

// 8. CODING COMPETITIONS & HACKATHONS (Max 10 Marks)
export function calculateHackathonScore(hackathons = []) {
  // Maximum 4 hackathons considered
  const eligibleEvents = hackathons.slice(0, 4);

  let totalScore = 0;
  eligibleEvents.forEach(event => {
    const prize = (event.prize || event.placement || "").toUpperCase();
    let eventMarks = 1; // Default participation

    if (prize.includes("1") || prize.includes("FIRST") || prize.includes("WINNER")) {
      eventMarks = 5;
    } else if (prize.includes("2") || prize.includes("SECOND") || prize.includes("RUNNER")) {
      eventMarks = 4;
    } else if (prize.includes("3") || prize.includes("THIRD")) {
      eventMarks = 3;
    } else {
      eventMarks = 1; // Participation
    }

    totalScore += eventMarks;
  });

  const score = Math.min(10, totalScore);

  return {
    score,
    maxScore: 10,
    breakdown: {
      totalEvaluated: eligibleEvents.length,
      rawScore: totalScore
    }
  };
}

// 9. IN-HOUSE PROJECTS (Max 8 Marks)
export function calculateInhouseScore(inhouseProjects = [], maxAllowedProjects = 2) {
  // Each project = 4 marks, max capacity = 8 marks (configured for max 2 projects)
  const eligibleProjects = inhouseProjects.slice(0, maxAllowedProjects);
  const rawScore = eligibleProjects.length * 4;
  const score = Math.min(8, rawScore);

  return {
    score,
    maxScore: 8,
    breakdown: {
      totalEvaluated: eligibleProjects.length,
      maxAllowedProjects,
      rawScore
    }
  };
}

// 10. PROFESSIONAL MEMBERSHIP (Max 2 Marks)
export function calculateMembershipScore(memberships = []) {
  // At least one valid verified membership = 2 marks
  const hasValidMembership = memberships.length > 0;
  const score = hasValidMembership ? 2 : 0;

  return {
    score,
    maxScore: 2,
    breakdown: {
      hasValidMembership,
      count: memberships.length
    }
  };
}

// 11. SHL / TALENT DISCOVERY / N.C.E.T ASSESSMENT (Max 10 Marks)
export function calculateAssessmentScore(rawScore = 0) {
  const score =
    rawScore >= 90 ? 10 :
    rawScore >= 80 ? 9  :
    rawScore >= 70 ? 8  :
    rawScore >= 65 ? 7  :
    rawScore >= 60 ? 6  :
    rawScore >= 55 ? 5  :
    rawScore >= 50 ? 4  :
    rawScore >= 40 ? 3  :
    rawScore >= 30 ? 2  :
    rawScore >= 25 ? 1  : 0;

  return { score, maxScore: 10, rawScore };
}

// Helper for normalized category slug matching
function normCat(catId) {
  if (!catId) return '';
  const lower = String(catId).toLowerCase().trim();
  if (lower === 'coding_practice' || lower === 'coding' || lower === 'coding-platform' || lower === 'coding-platforms') {
    return 'coding-platforms';
  }
  if (lower === 'inhouse' || lower === 'inhouse_projects' || lower === 'inhouseprojects' || lower === 'inhouse-projects') {
    return 'inhouse-projects';
  }
  if (lower === 'memberships' || lower === 'membership') {
    return 'membership';
  }
  if (lower === 'assessment' || lower === 'assessments') {
    return 'assessments';
  }
  return lower;
}

const isVerifiedStatus = (status) => ['VERIFIED', 'APPROVED'].includes(String(status || '').toUpperCase());
const isPendingStatus = (status) => ['PENDING', 'SUBMITTED', 'DRAFT'].includes(String(status || '').toUpperCase());

// CENTRAL TOTAL SCORE CALCULATION
export function calculateTotalScore(studentData) {
  const verifiedSubmissions = studentData.submissions?.filter(s => isVerifiedStatus(s.status)) || [];
  const pendingSubmissions = studentData.submissions?.filter(s => isPendingStatus(s.status)) || [];

  const sortByDateDesc = (a, b) => {
    const dateA = new Date(a.updated_at || a.updatedAt || a.created_at || a.createdAt || 0).getTime();
    const dateB = new Date(b.updated_at || b.updatedAt || b.created_at || b.createdAt || 0).getTime();
    return dateB - dateA;
  };

  // Helper to filter verified category submissions with flattened details, sorted by date descending
  const getVerifiedForCat = (catId) => {
    const target = normCat(catId);
    return verifiedSubmissions
      .filter(s => normCat(s.categoryId || s.category_id) === target)
      .sort(sortByDateDesc)
      .map(s => {
        let d = s.details || {};
        if (typeof d === 'string') {
          try { d = JSON.parse(d); } catch (e) { d = {}; }
        }
        return { ...s, ...d, details: d };
      });
  };

  const getPendingForCat = (catId) => {
    const target = normCat(catId);
    return pendingSubmissions
      .filter(s => normCat(s.categoryId || s.category_id) === target)
      .sort(sortByDateDesc)
      .map(s => {
        let d = s.details || {};
        if (typeof d === 'string') {
          try { d = JSON.parse(d); } catch (e) { d = {}; }
        }
        return { ...s, ...d, details: d };
      });
  };

  // 1. Academics
  let tenth = studentData.tenthPct ?? studentData.tenth_pct ?? 0;
  let twelfth = studentData.twelfthPct ?? studentData.twelfth_pct ?? 0;
  let cgpa = studentData.cgpa ?? 0;

  const verifiedAcad = getVerifiedForCat("academics");
  let academicsResult = calculateAcademicsScore(tenth, twelfth, cgpa);

  if (verifiedAcad.length > 0) {
    // The most recent verified academic submission is authoritative
    const latestVerified = verifiedAcad[0];
    const d = latestVerified.details || latestVerified;
    const vTenth = d.tenthPct ?? d.tenth_pct ?? tenth;
    const vTwelfth = d.twelfthPct ?? d.twelfth_pct ?? twelfth;
    const vCgpa = d.cgpa ?? cgpa;
    const rubricCalc = calculateAcademicsScore(vTenth, vTwelfth, vCgpa);
    
    // If faculty explicitly set awarded_marks, that is authoritative; otherwise use rubric score
    const awarded = (latestVerified.awarded_marks !== undefined && latestVerified.awarded_marks !== null)
      ? Number(latestVerified.awarded_marks)
      : (latestVerified.awardedMarks !== undefined && latestVerified.awardedMarks !== null)
      ? Number(latestVerified.awardedMarks)
      : rubricCalc.score;

    academicsResult = {
      score: Math.min(10, Math.max(0, awarded)),
      maxScore: 10,
      breakdown: rubricCalc.breakdown,
    };
  } else if (!tenth || !twelfth || !cgpa) {
    const acadSubs = (studentData.submissions || []).filter(
      s => s.categoryId === 'academics' || s.category_id === 'academics'
    ).sort(sortByDateDesc);
    if (acadSubs.length > 0) {
      const latest = acadSubs[0];
      const d = latest.details || {};
      if (!tenth) tenth = d.tenthPct ?? d.tenth_pct ?? 0;
      if (!twelfth) twelfth = d.twelfthPct ?? d.twelfth_pct ?? 0;
      if (!cgpa) cgpa = d.cgpa ?? 0;
      academicsResult = calculateAcademicsScore(tenth, twelfth, cgpa);
    }
  }

  // 2. GitHub
  const verifiedGithub = getVerifiedForCat("github");
  let githubResult = calculateGithubScore(verifiedGithub);
  if (verifiedGithub.length > 0) {
    const latestGh = verifiedGithub[0];
    const awarded = (latestGh.awarded_marks !== undefined && latestGh.awarded_marks !== null)
      ? Number(latestGh.awarded_marks)
      : (latestGh.awardedMarks !== undefined && latestGh.awardedMarks !== null)
      ? Number(latestGh.awardedMarks)
      : githubResult.score;
    githubResult = { ...githubResult, score: Math.min(15, Math.max(0, awarded)) };
  }

  // 3. Coding Platforms
  let codingBadges = studentData.codingBadges || 0;
  let codingSolved = studentData.codingSolved || 0;
  let maxAwardedCoding = 0;

  const verifiedCoding = getVerifiedForCat("coding-platforms");

  verifiedCoding.forEach(item => {
    const d = item.details || {};
    const b = Number(d.badge_count ?? d.badgeCount ?? d.badges ?? item.badges ?? item.badge_count ?? item.badgeCount ?? 0);
    const s = Number(d.medium_hard_solved ?? d.mediumHardSolved ?? d.solved ?? ((Number(d.medium_solved ?? d.mediumSolved ?? 0)) + (Number(d.hard_solved ?? d.hardSolved ?? 0))) ?? item.solved ?? item.medium_hard_solved ?? item.mediumHardSolved ?? 0);
    if (b) codingBadges = Math.max(codingBadges, b);
    if (s) codingSolved = Math.max(codingSolved, s);
    const aw = Number(item.awarded_marks ?? item.awardedMarks ?? d.calculated_marks ?? d.calculatedMarks ?? 0);
    if (aw) maxAwardedCoding = Math.max(maxAwardedCoding, aw);
  });

  const leetCalc = calculateCodingPlatformScore({
    badgeCount: codingBadges,
    mediumHardSolved: codingSolved,
  });

  const codingScore = Math.min(10, Math.max(
    calculateCodingScore(codingBadges, codingSolved).score,
    leetCalc.total,
    maxAwardedCoding
  ));

  const codingResult = {
    score: codingScore,
    maxScore: 10,
    breakdown: {
      codingBadges,
      codingSolved,
      badgeMarks: leetCalc.badgeMarks,
      difficultyMarks: leetCalc.difficultyMarks
    }
  };

  // 4. Internship
  let internshipResult = calculateInternshipScore(getVerifiedForCat("internship"));
  const verifiedIntern = getVerifiedForCat("internship");
  if (verifiedIntern.length > 0) {
    const maxInternAwarded = Math.max(...verifiedIntern.map(i => Number(i.awarded_marks || i.awardedMarks || 0)));
    if (maxInternAwarded > internshipResult.score) {
      internshipResult = { ...internshipResult, score: Math.min(10, maxInternAwarded) };
    }
  }

  // 5. Skillset & Certifications
  let certResult = calculateCertificationScore(getVerifiedForCat("skillset"));
  const verifiedCert = getVerifiedForCat("skillset");
  if (verifiedCert.length > 0) {
    const maxCertAwarded = Math.max(...verifiedCert.map(c => Number(c.awarded_marks || c.awardedMarks || 0)));
    if (maxCertAwarded > certResult.score) {
      certResult = { ...certResult, score: Math.min(15, maxCertAwarded) };
    }
  }

  // 6. Projects Done
  let projectsResult = calculateProjectsScore(getVerifiedForCat("projects"));
  const verifiedProjects = getVerifiedForCat("projects");
  if (verifiedProjects.length > 0) {
    const maxProjAwarded = Math.max(...verifiedProjects.map(p => Number(p.awarded_marks || p.awardedMarks || 0)));
    if (maxProjAwarded > projectsResult.score) {
      projectsResult = { ...projectsResult, score: Math.min(5, maxProjAwarded) };
    }
  }

  // 7. Full Stack Experience
  const verifiedFsd = getVerifiedForCat("fullstack");
  let fsdResult = calculateFsdScore(verifiedFsd);
  if (verifiedFsd.length > 0) {
    const latestFsd = verifiedFsd[0];
    const awarded = (latestFsd.awarded_marks !== undefined && latestFsd.awarded_marks !== null)
      ? Number(latestFsd.awarded_marks)
      : (latestFsd.awardedMarks !== undefined && latestFsd.awardedMarks !== null)
      ? Number(latestFsd.awardedMarks)
      : fsdResult.score;
    fsdResult = { ...fsdResult, score: Math.min(5, Math.max(0, awarded)) };
  }

  // 8. Coding Competitions & Hackathons
  let hackathonResult = calculateHackathonScore(getVerifiedForCat("hackathons"));
  const verifiedHackathons = getVerifiedForCat("hackathons");
  if (verifiedHackathons.length > 0) {
    const maxHackAwarded = Math.max(...verifiedHackathons.map(h => Number(h.awarded_marks || h.awardedMarks || 0)));
    if (maxHackAwarded > hackathonResult.score) {
      hackathonResult = { ...hackathonResult, score: Math.min(10, maxHackAwarded) };
    }
  }

  // 9. Inhouse Projects
  let inhouseResult = calculateInhouseScore(getVerifiedForCat("inhouse-projects"));
  const verifiedInhouse = getVerifiedForCat("inhouse-projects");
  if (verifiedInhouse.length > 0) {
    const maxInhouseAwarded = Math.max(...verifiedInhouse.map(i => Number(i.awarded_marks || i.awardedMarks || 0)));
    if (maxInhouseAwarded > inhouseResult.score) {
      inhouseResult = { ...inhouseResult, score: Math.min(8, maxInhouseAwarded) };
    }
  }

  // 10. Memberships
  const membershipSubs = [
    ...getVerifiedForCat("membership"),
    ...getVerifiedForCat("assessments").filter(a => a.type === "membership" || a.category === "membership")
  ].sort(sortByDateDesc);
  let membershipResult = calculateMembershipScore(membershipSubs);
  if (membershipSubs.length > 0) {
    const latestMem = membershipSubs[0];
    const awarded = (latestMem.awarded_marks !== undefined && latestMem.awarded_marks !== null)
      ? Number(latestMem.awarded_marks)
      : (latestMem.awardedMarks !== undefined && latestMem.awardedMarks !== null)
      ? Number(latestMem.awardedMarks)
      : membershipResult.score;
    membershipResult = { ...membershipResult, score: Math.min(2, Math.max(0, awarded)) };
  }

  // 11. Assessments
  let assessmentRaw = studentData.assessmentScore || 0;
  const verifiedAssessments = getVerifiedForCat("assessments");
  let assessmentResult = calculateAssessmentScore(assessmentRaw);
  if (verifiedAssessments.length > 0) {
    const latestAssess = verifiedAssessments[0];
    if (latestAssess.score) assessmentRaw = latestAssess.score;
    if (latestAssess.rawScore) assessmentRaw = latestAssess.rawScore;
    if (latestAssess.raw_score) assessmentRaw = latestAssess.raw_score;
    assessmentResult = calculateAssessmentScore(assessmentRaw);
    const awarded = (latestAssess.awarded_marks !== undefined && latestAssess.awarded_marks !== null)
      ? Number(latestAssess.awarded_marks)
      : (latestAssess.awardedMarks !== undefined && latestAssess.awardedMarks !== null)
      ? Number(latestAssess.awardedMarks)
      : assessmentResult.score;
    assessmentResult = { ...assessmentResult, score: Math.min(10, Math.max(0, awarded)) };
  }

  // Sum verified category scores
  const totalVerifiedScore = Math.min(100, Number((
    academicsResult.score +
    githubResult.score +
    codingResult.score +
    internshipResult.score +
    certResult.score +
    projectsResult.score +
    fsdResult.score +
    hackathonResult.score +
    inhouseResult.score +
    membershipResult.score +
    assessmentResult.score
  ).toFixed(2)));

  // Calculate potential pending scores
  const pendingCodingSubs = getPendingForCat("coding-platforms");
  let pendingCodingScore = 0;
  pendingCodingSubs.forEach(item => {
    const d = item.details || {};
    const b = Number(d.badge_count ?? d.badgeCount ?? d.badges ?? item.badges ?? item.badge_count ?? item.badgeCount ?? 0);
    const s = Number(d.medium_hard_solved ?? d.mediumHardSolved ?? d.solved ?? ((Number(d.medium_solved ?? d.mediumSolved ?? 0)) + (Number(d.hard_solved ?? d.hardSolved ?? 0))) ?? item.solved ?? item.medium_hard_solved ?? item.mediumHardSolved ?? 0);
    const calc = calculateCodingPlatformScore({ badgeCount: b, mediumHardSolved: s });
    const score = Math.max(
      Number(item.awarded_marks ?? item.awardedMarks ?? 0),
      Number(d.calculated_marks ?? d.calculatedMarks ?? 0),
      calc.total,
      calculateCodingScore(b, s).score
    );
    pendingCodingScore = Math.max(pendingCodingScore, score);
  });

  const pendingInternship = calculateInternshipScore(getPendingForCat("internship")).score;
  const pendingCert = calculateCertificationScore(getPendingForCat("skillset")).score;
  const pendingProjects = calculateProjectsScore(getPendingForCat("projects")).score;
  const pendingHackathon = calculateHackathonScore(getPendingForCat("hackathons")).score;
  const pendingInhouse = calculateInhouseScore(getPendingForCat("inhouse-projects")).score;
  const pendingMembership = calculateMembershipScore([
    ...getPendingForCat("membership"),
    ...getPendingForCat("assessments").filter(a => a.type === "membership" || a.category === "membership")
  ]).score;
  const pendingFsdSubs = getPendingForCat("fullstack");
  const pendingFsd = pendingFsdSubs.length > 0 ? calculateFsdScore(pendingFsdSubs).score : 0;

  const totalPendingScore = Math.min(100 - totalVerifiedScore, Number((
    pendingInternship + pendingCert + pendingProjects + pendingHackathon + pendingInhouse + pendingMembership + pendingCodingScore + pendingFsd
  ).toFixed(2)));

  return {
    totalVerifiedScore,
    totalPendingScore,
    tier: getPlacementTier(totalVerifiedScore),
    categoryScores: {
      academics: academicsResult,
      github: githubResult,
      coding: {
        ...codingResult,
        pendingScore: pendingCodingScore
      },
      'coding-platforms': {
        ...codingResult,
        pendingScore: pendingCodingScore
      },
      coding_practice: {
        ...codingResult,
        pendingScore: pendingCodingScore
      },
      internship: internshipResult,
      skillset: certResult,
      projects: projectsResult,
      fullstack: {
        ...fsdResult,
        pendingScore: pendingFsd
      },
      hackathons: hackathonResult,
      inhouse: inhouseResult,
      'inhouse-projects': inhouseResult,
      membership: membershipResult,
      assessment: assessmentResult,
      assessments: assessmentResult,
    }
  };
}

export function getPlacementTier(verifiedScore = 0) {
  return {
    tier: '',
    name: '',
    shortName: '',
    minScore: 0,
    badgeColor: '',
    tag: ''
  };
}

export function calculateCodingPlatformScore({ badgeCount = 0, mediumHardSolved = 0, mediumSolved = 0, hardSolved = 0 } = {}) {
  const mediumHardCount = Number(mediumHardSolved || 0) || (Number(mediumSolved || 0) + Number(hardSolved || 0));
  const badges = Number(badgeCount || 0);

  const badgeMarks =
    badges >= 25 ? 5 :
    badges >= 20 ? 4 :
    badges >= 15 ? 3 :
    badges >= 10 ? 2 :
    badges >= 5  ? 1 : 0;

  const difficultyMarks =
    mediumHardCount > 200  ? 5 :
    mediumHardCount >= 150 ? 4 :
    mediumHardCount >= 100 ? 3 :
    mediumHardCount >= 50  ? 2 :
    mediumHardCount >= 25  ? 1 : 0;

  const total = Math.min(badgeMarks + difficultyMarks, 10);

  return {
    badgeMarks,
    difficultyMarks,
    total,
    score: total
  };
}


