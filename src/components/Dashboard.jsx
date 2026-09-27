import React from 'react';
import { useAuth } from '../context/AuthContext';
import MetricCard from './MetricCard';
import ScorePanel from './ScorePanel';
import { normalizeCategoryId } from '../services';
import { calculateCodingPlatformScore } from '../utils/scoringEngine';

export default function Dashboard({
  categories = [],
  studentSubmissions = [],
  scoreResult = {},
  onSelectCategory,
  onOpenProfile,
  isSidebarCollapsed = false,
  isLoading = false,
}) {
  const { profile, user } = useAuth();

  // Time of day greeting
  const hour = new Date().getHours();
  let timeGreeting = 'Good morning';
  if (hour >= 12 && hour < 17) {
    timeGreeting = 'Good afternoon';
  } else if (hour >= 17) {
    timeGreeting = 'Good evening';
  }

  const fullName = profile?.name || profile?.full_name || user?.user_metadata?.name || 'Student';
  const firstName = fullName.split(' ')[0] || 'Student';
  const batchYear = profile?.batch || profile?.batch_year || '2024–2028';

  return (
    <div
      className="transition-all duration-200"
      style={{
        marginLeft: isSidebarCollapsed ? 'var(--sidebar-collapsed-width, 68px)' : 'var(--sidebar-width)',
        paddingTop: '56px',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-page)',
      }}
    >
      <div className="flex flex-col lg:flex-row items-start gap-6 p-4 sm:p-6 lg:p-7 min-w-0">
        {/* Left / Center Main Column */}
        <div className="flex-1 flex flex-col min-w-0 w-full">
          
          {/* 1. Greeting Row */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1
                style={{
                  fontSize: '22px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                {timeGreeting}, {firstName} 👋
              </h1>
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  margin: '6px 0 0 0',
                }}
              >
                Placement Metrics Evaluation & Ranking Overview
              </p>
            </div>

            {/* Academic Year Pill */}
            <div
              className="shrink-0"
              style={{
                backgroundColor: 'var(--green-light)',
                color: 'var(--green-text)',
                borderRadius: '20px',
                padding: '4px 14px',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              Academic Year {batchYear}
            </div>
          </div>

          {/* 2. Placement Metrics Section */}
          <div style={{ marginTop: '24px' }}>
            {/* Header Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <h2
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    margin: 0,
                  }}
                >
                  Placement Metrics
                </h2>
                <span
                  style={{
                    backgroundColor: 'var(--green-light)',
                    color: 'var(--green-text)',
                    borderRadius: '20px',
                    padding: '2px 10px',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  11 Categories
                </span>
              </div>

              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--green-text)',
                  cursor: 'default',
                }}
              >
                View All →
              </span>
            </div>

            {/* Metric Cards Grid (1 col on mobile, 2 on md, 3 on xl with minmax(0, 1fr)) */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 mt-4">
              {categories.map((cat, index) => {
                const normCatId = normalizeCategoryId(cat.id);
                const catSubmissions = studentSubmissions.filter(
                  (s) => normalizeCategoryId(s.category_id || s.categoryId) === normCatId
                );

                // Map category ID to scoringEngine key
                const catKey =
                  cat.id === 'coding-platforms'
                    ? 'coding'
                    : cat.id === 'inhouse-projects'
                    ? 'inhouse'
                    : cat.id === 'assessments'
                    ? 'assessment'
                    : cat.id;

                const catScoreObj =
                  scoreResult?.categoryScores?.[cat.id] ||
                  scoreResult?.categoryScores?.[normCatId] ||
                  scoreResult?.categoryScores?.[catKey];
                const verifiedMarks = catScoreObj?.score || 0;

                let pendingMarks = 0;
                catSubmissions
                  .filter((s) => {
                    const st = String(s.status || '').toUpperCase();
                    return st === 'PENDING' || st === 'SUBMITTED' || st === 'DRAFT';
                  })
                  .forEach((s) => {
                    let d = s.details || {};
                    if (typeof d === 'string') {
                      try { d = JSON.parse(d); } catch (e) { d = {}; }
                    }
                    const claim = Number(d.calculated_marks ?? d.calculatedMarks ?? s.awarded_marks ?? s.awardedMarks ?? 0);
                    if (claim > 0) {
                      pendingMarks += claim;
                    } else if (normCatId === 'coding-platforms') {
                      const b = Number(d.badge_count ?? d.badgeCount ?? 0);
                      const m = Number(d.medium_hard_solved ?? d.mediumHardSolved ?? 0);
                      const calc = calculateCodingPlatformScore({ badgeCount: b, mediumHardSolved: m });
                      pendingMarks += calc.total > 0 ? calc.total : 0;
                    } else {
                      pendingMarks += normCatId === 'academics' ? 0 : 2;
                    }
                  });
                pendingMarks = Math.min(cat.maxMarks || 10, pendingMarks);

                return (
                  <MetricCard
                    key={cat.id}
                    category={cat}
                    verifiedScore={verifiedMarks}
                    pendingScore={pendingMarks}
                    categorySubmissions={catSubmissions}
                    onSelectCategory={onSelectCategory}
                    animationIndex={index}
                    isLoading={isLoading}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: ScorePanel */}
        <ScorePanel
          scoreResult={scoreResult}
          onOpenProfile={onOpenProfile}
        />
      </div>
    </div>
  );
}
