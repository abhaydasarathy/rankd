import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import ScoreBanner from '../components/ScoreBanner';
import MetricCard from '../components/MetricCard';
import { normalizeCategoryId } from '../services';
import { calculateCodingPlatformScore } from '../utils/scoringEngine';

export default function MyMetrics({
  categories = [],
  studentSubmissions = [],
  scoreResult = {},
  onSelectCategory,
  onRefreshData,
  isLoading = false,
}) {
  const { user } = useAuth();
  const [filter, setFilter] = useState('all'); // 'all' | 'verified' | 'pending' | 'unclaimed'

  // Realtime subscription so student metrics update instantly when faculty verifies/rejects
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`student-${user.id}-metrics-realtime`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'student_submissions',
          filter: `student_id=eq.${user.id}`,
        },
        () => {
          onRefreshData?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, onRefreshData]);


  const totalVerifiedScore = scoreResult?.totalVerifiedScore || 0;
  const totalPendingScore = scoreResult?.totalPendingScore || 0;
  const totalUnclaimedScore = Math.max(0, 100 - totalVerifiedScore - totalPendingScore);

  // Compute category statuses and scores
  const categoryData = useMemo(() => {
    return categories.map((cat) => {
      const normCatId = normalizeCategoryId(cat.id);
      const catSubmissions = studentSubmissions.filter(
        (s) => normalizeCategoryId(s.category_id || s.categoryId) === normCatId
      );

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

      const hasPending =
        pendingMarks > 0 ||
        catSubmissions.some((s) => {
          const st = String(s.status || '').toUpperCase();
          return st === 'PENDING' || st === 'SUBMITTED' || st === 'DRAFT';
        });
      const isVerified =
        verifiedMarks > 0 ||
        catSubmissions.some((s) => {
          const st = String(s.status || '').toUpperCase();
          return st === 'VERIFIED' || st === 'APPROVED';
        });

      let status = 'unclaimed';
      if (hasPending) {
        status = 'pending';
      } else if (isVerified) {
        status = 'verified';
      }

      return {
        cat,
        catSubmissions,
        verifiedMarks,
        pendingMarks,
        hasPending,
        isVerified,
        status,
      };
    });
  }, [categories, studentSubmissions, scoreResult]);

  // Filter categories
  const filteredCategories = useMemo(() => {
    if (filter === 'all') return categoryData;
    if (filter === 'pending') {
      return categoryData.filter((item) => item.hasPending || item.status === 'pending');
    }
    if (filter === 'verified') {
      return categoryData.filter((item) => item.isVerified || item.status === 'verified');
    }
    if (filter === 'unclaimed') {
      return categoryData.filter((item) => !item.hasPending && !item.isVerified);
    }
    return categoryData;
  }, [categoryData, filter]);

  return (
    <div className="page-content my-metrics-page w-full p-4 sm:p-6 lg:p-7 min-w-0">
      {/* 1. Score Banner at Top */}
      <ScoreBanner
        score={totalVerifiedScore}
        verified={totalVerifiedScore}
        pending={totalPendingScore}
        unclaimed={totalUnclaimedScore}
        maxScore={100}
      />

      {/* 2. Page Header & Filter Tabs */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            My Metrics
          </h1>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              margin: '4px 0 0 0',
            }}
          >
            Detailed rubric breakdown across all 11 criteria ({filteredCategories.length} showing)
          </p>
        </div>

        {/* Filter Tabs */}
        <div
          className="filter-tabs flex items-center gap-1 p-1 rounded-[var(--radius)] border shrink-0"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border)',
          }}
        >
          {['all', 'verified', 'pending', 'unclaimed'].map((f) => {
            const isActive = filter === f;
            const count =
              f === 'all'
                ? categoryData.length
                : f === 'verified'
                ? categoryData.filter((c) => c.isVerified || c.status === 'verified').length
                : f === 'pending'
                ? categoryData.filter((c) => c.hasPending || c.status === 'pending').length
                : categoryData.filter((c) => !c.hasPending && !c.isVerified).length;
            const label = f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1);
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium cursor-pointer transition-all ${
                  isActive
                    ? 'font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                style={{
                  backgroundColor: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                  color: isActive ? 'var(--sidebar-active-text)' : 'inherit',
                  border: isActive ? '1px solid var(--green-border)' : '1px solid transparent',
                }}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Full-Width Metrics Grid (3 columns on xl desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
        {filteredCategories.map(({ cat, catSubmissions, verifiedMarks, pendingMarks }, index) => (
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
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div
          className="py-12 text-center rounded-[var(--radius)] border"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border)',
            color: 'var(--text-muted)',
            fontSize: '14px',
          }}
        >
          No metrics found for status "{filter}".
        </div>
      )}
    </div>
  );
}
