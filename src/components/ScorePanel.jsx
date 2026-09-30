import React, { useState, useEffect, useRef } from 'react';
import { Building2, User, Calendar, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTiltSubtle } from '../hooks/useTilt';

export default function ScorePanel({
  scoreResult = {},
  onOpenProfile,
  customProfile = null,
  hideProfileCard = false,
}) {
  const { profile: authProfile, user } = useAuth();
  const profile = customProfile || authProfile;

  const verifiedScore = scoreResult?.totalVerifiedScore ?? 0;
  const pendingScore = scoreResult?.totalPendingScore ?? 0;
  const totalScore = Math.min(100, Number((verifiedScore + pendingScore).toFixed(2)));
  const unclaimedScore = Math.max(0, Number((100 - totalScore).toFixed(2)));

  // Donut chart math
  const radius = 52;
  const circumference = 2 * Math.PI * radius; // ~326.726
  const verifiedArc = (verifiedScore / 100) * circumference;
  const pendingArc = (pendingScore / 100) * circumference;
  const greenDasharray = `${verifiedArc} ${circumference - verifiedArc}`;
  const amberDasharray = `${pendingArc} ${circumference - pendingArc}`;
  const amberOffset = -verifiedArc;

  // Animation 1 & 3 — Score count-up on mount & smooth rAF transition on state change
  const [displayScore, setDisplayScore] = useState(verifiedScore);
  const [isArcReady, setIsArcReady] = useState(false);
  const prevScoreRef = useRef(null);
  const currentDisplayScoreRef = useRef(verifiedScore);
  const rAFRef = useRef(null);

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (prefersReduced) {
      if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
      setDisplayScore(verifiedScore);
      currentDisplayScoreRef.current = verifiedScore;
      prevScoreRef.current = verifiedScore;
      setIsArcReady(true);
      return;
    }

    // Trigger stroke-dashoffset transition after initial paint
    setIsArcReady(true);

    const targetVal = Number(verifiedScore) || 0;

    if (prevScoreRef.current !== targetVal) {
      if (rAFRef.current) cancelAnimationFrame(rAFRef.current);

      const startVal = Number(currentDisplayScoreRef.current) || 0;
      prevScoreRef.current = targetVal;

      if (startVal === targetVal) {
        setDisplayScore(targetVal);
        return;
      }

      let start = null;
      const duration = 600;

      const step = (timestamp) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentVal = startVal + (targetVal - startVal) * eased;
        currentDisplayScoreRef.current = currentVal;

        setDisplayScore(
          Number.isInteger(targetVal)
            ? Math.round(currentVal)
            : Number(currentVal.toFixed(1))
        );

        if (progress < 1) {
          rAFRef.current = requestAnimationFrame(step);
        } else {
          setDisplayScore(targetVal);
          currentDisplayScoreRef.current = targetVal;
        }
      };

      rAFRef.current = requestAnimationFrame(step);
    } else {
      setDisplayScore(targetVal);
      currentDisplayScoreRef.current = targetVal;
    }

    return () => {
      if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
    };
  }, [verifiedScore]);

  const renderedScore = (displayScore === 0 && verifiedScore > 0) ? verifiedScore : displayScore;

  const displayName = profile?.name || profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || 'Student';
  const displayRegNo = profile?.reg_no || user?.user_metadata?.reg_no || '—';
  const displayDept = profile?.department || 'CSE';
  const displaySection = profile?.section ? `Section ${profile.section.replace(/^Section\s*/i, '')}` : 'Section A';
  const displayBatch = profile?.batch || profile?.batch_year || '2024–2028';
  const displayCgpa = profile?.cgpa ? `${profile.cgpa} / 10.0` : '—';

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('') || 'U';

  const scoreTilt = useTiltSubtle();

  return (
    <aside
      className="w-full lg:w-[320px] flex flex-col shrink-0 lg:sticky lg:top-[76px] lg:max-h-[calc(100vh-96px)] lg:overflow-y-auto"
      aria-label="Score and Profile Overview"
    >
      {/* Card 1 — Overall Placement Score */}
      <div
        ref={scoreTilt.ref}
        onMouseMove={scoreTilt.onMouseMove}
        onMouseLeave={scoreTilt.onMouseLeave}
        onMouseEnter={scoreTilt.onMouseEnter}
        className="glass-panel-score tilt-card"
        style={{
          padding: '24px',
        }}
      >
        <div className="tilt-gloss" aria-hidden="true" />
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            Overall Placement Score
          </h2>
        </div>

        <div className="flex items-center justify-between gap-4">
          {/* SVG Donut Chart */}
          <div className="relative flex items-center justify-center shrink-0" style={{ width: '120px', height: '120px' }}>
            <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
              {/* Background circle */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="var(--border-strong)"
                strokeWidth="10"
              />
              {/* Green (Verified) Arc */}
              {verifiedScore > 0 && (
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke="var(--green-bar)"
                  strokeWidth="10"
                  strokeDasharray={greenDasharray}
                  strokeDashoffset={isArcReady ? 0 : circumference}
                  strokeLinecap="round"
                  className="score-arc"
                />
              )}
              {/* Amber (Pending) Arc */}
              {pendingScore > 0 && (
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke="var(--amber-bar)"
                  strokeWidth="10"
                  strokeDasharray={amberDasharray}
                  strokeDashoffset={isArcReady ? amberOffset : circumference}
                  strokeLinecap="round"
                  className="score-arc score-arc-pending"
                />
              )}
            </svg>

            {/* Donut Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  lineHeight: 1,
                }}
              >
                {renderedScore}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  color: 'var(--text-muted)',
                  marginTop: '2px',
                }}
              >
                / 100 Marks
              </span>
            </div>
          </div>

          {/* Legend (Right of Donut) */}
          <div className="flex flex-col flex-1" style={{ gap: '10px', fontSize: '13px' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--green-bar)' }} />
                <span style={{ color: 'var(--text-muted)' }}>Verified</span>
              </div>
              <strong style={{ color: 'var(--text-primary)' }}>{verifiedScore}</strong>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--amber-bar)' }} />
                <span style={{ color: 'var(--text-muted)' }}>Pending</span>
              </div>
              <strong style={{ color: 'var(--text-primary)' }}>{pendingScore}</strong>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--border-strong)' }} />
                <span style={{ color: 'var(--text-muted)' }}>Unclaimed</span>
              </div>
              <strong style={{ color: 'var(--text-primary)' }}>{unclaimedScore}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Card 2 — Your Profile */}
      {!hideProfileCard && (
      <div
        className="glass-panel-profile"
        style={{
          marginTop: '14px',
          padding: '18px 20px',
        }}
      >
        {/* Header Row */}
        <div className="flex items-center justify-between mb-3">
          <span
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            Your Profile
          </span>
          <button
            type="button"
            onClick={onOpenProfile}
            className="cursor-pointer hover:underline"
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--green)',
              background: 'none',
              border: 'none',
              padding: 0,
            }}
          >
            View →
          </button>
        </div>

        {/* User Chip Header */}
        <div className="flex items-center gap-3 mb-3">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="w-11 h-11 rounded-full object-cover border"
              style={{ borderColor: 'var(--border)' }}
            />
          ) : (
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm"
              style={{
                backgroundColor: 'var(--green-light)',
                color: 'var(--green-text)',
                border: '1px solid var(--green-border)',
              }}
            >
              {initials}
            </div>
          )}

          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
              {displayName}
            </span>
            <span className="font-mono text-xs truncate" style={{ color: 'var(--text-muted)' }}>
              {displayRegNo}
            </span>
          </div>
        </div>

        {/* Metadata Rows */}
        <div className="flex flex-col" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          <div
            className="flex items-center gap-2.5"
            style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}
          >
            <Building2 size={16} style={{ color: 'var(--text-muted)' }} />
            <span>{displayDept}</span>
          </div>

          <div
            className="flex items-center gap-2.5"
            style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}
          >
            <User size={16} style={{ color: 'var(--text-muted)' }} />
            <span>{displaySection}</span>
          </div>

          <div
            className="flex items-center gap-2.5"
            style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}
          >
            <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
            <span>Batch {displayBatch}</span>
          </div>

          <div
            className="flex items-center gap-2.5"
            style={{ padding: '6px 0' }}
          >
            <Award size={16} style={{ color: 'var(--text-muted)' }} />
            <span>CGPA {displayCgpa}</span>
          </div>
        </div>
      </div>
      )}
    </aside>
  );
}
