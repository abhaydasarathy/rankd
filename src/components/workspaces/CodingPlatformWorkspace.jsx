import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Code2,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RotateCw,
  AlertCircle,
  ShieldCheck,
  Award,
  BookOpen,
  Edit3,
  Clock,
} from 'lucide-react';
import MetricWorkspaceShell from './MetricWorkspaceShell';
import {
  fetchLeetCodeProfile,
  saveLeetCodeProfile,
  getExistingLeetCodeProfile,
  saveLocalMappedLeetCodeUsername,
  getLocalMappedLeetCodeUsername,
  extractUsername,
} from '../../lib/leetcodeService';
import { calculateCodingPlatformScore } from '../../utils/scoringEngine';

export default function CodingPlatformWorkspace({
  isOpen,
  onClose,
  studentProfile,
  submissions = [],
  verifiedScore = 0,
  scoreResult,
  onSubmitProof,
  showToast,
}) {
  const codingSubmissions = useMemo(() => {
    return (submissions || []).filter(
      (s) =>
        s.category_id === 'coding-platforms' ||
        s.categoryId === 'coding-platforms' ||
        s.category_id === 'coding_practice' ||
        s.categoryId === 'coding_practice'
    );
  }, [submissions]);

  const verifiedSub = useMemo(() => {
    return codingSubmissions.find((s) => s.status === 'VERIFIED' || s.status === 'Verified');
  }, [codingSubmissions]);

  const pendingSub = useMemo(() => {
    return codingSubmissions.find((s) => s.status === 'PENDING' || s.status === 'Pending');
  }, [codingSubmissions]);

  const rejectedSub = useMemo(() => {
    return codingSubmissions.find((s) => s.status === 'REJECTED' || s.status === 'Rejected');
  }, [codingSubmissions]);

  const lifecycleStatus = useMemo(() => {
    if (pendingSub) return 'PENDING';
    if (verifiedSub) return 'VERIFIED';
    if (rejectedSub) return 'REJECTED';
    if (verifiedScore > 0) return 'VERIFIED';
    return 'UNCLAIMED';
  }, [verifiedSub, pendingSub, rejectedSub, verifiedScore]);

  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [username, setUsername] = useState('');
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [stats, setStats] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showRubricInfo, setShowRubricInfo] = useState(false);

  const prevIsOpenRef = useRef(false);
  const studentId = studentProfile?.id || studentProfile?.regNo || 'student-demo';

  // Initialize from existing table or prior submissions
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setIsUpdateMode(false);
      setFetchError('');
      setSubmitError('');

      let isMounted = true;
      async function loadProfile() {
        try {
          const existing = await getExistingLeetCodeProfile(studentId);
          if (isMounted && existing?.profile_username) {
            setUsername(existing.profile_username);
            setStats({
              username: existing.profile_username,
              profileUrl: existing.profile_url || `https://leetcode.com/u/${existing.profile_username}/`,
              easySolved: existing.easy_solved ?? 0,
              mediumSolved: existing.medium_solved ?? 0,
              hardSolved: existing.hard_solved ?? 0,
              mediumHardSolved: existing.medium_hard_solved ?? ((existing.medium_solved ?? 0) + (existing.hard_solved ?? 0)),
              badgeCount: existing.badge_count ?? 0,
              fetchedAt: existing.fetched_at || existing.last_synced_at,
            });
            return;
          }
        } catch (e) {}

        const activeSub = verifiedSub || pendingSub || rejectedSub;
        let details = activeSub?.details || {};
        if (typeof details === 'string') {
          try { details = JSON.parse(details); } catch (e) { details = {}; }
        }

        if (isMounted) {
          if (details.profile_username || details.username || details.stats?.username) {
            const u = details.profile_username || details.username || details.stats?.username;
            setUsername(u);
            setStats({
              username: u,
              profileUrl: details.profile_url || `https://leetcode.com/u/${u}/`,
              easySolved: details.easy_solved ?? details.stats?.easySolved ?? 0,
              mediumSolved: details.medium_solved ?? details.stats?.mediumSolved ?? 0,
              hardSolved: details.hard_solved ?? details.stats?.hardSolved ?? 0,
              mediumHardSolved: details.medium_hard_solved ?? details.stats?.mediumHardSolved ?? ((details.medium_solved ?? 0) + (details.hard_solved ?? 0)),
              badgeCount: details.badge_count ?? details.badges ?? details.stats?.badgeCount ?? 0,
              fetchedAt: details.fetched_at || activeSub?.created_at,
            });
          } else {
            const localU = getLocalMappedLeetCodeUsername(studentId);
            if (localU) {
              setUsername(localU);
            } else {
              setUsername('');
              setStats(null);
            }
          }
        }
      }

      loadProfile();
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, studentId, verifiedSub, pendingSub, rejectedSub]);

  // Live calculation from scoringEngine
  const liveScore = useMemo(() => {
    return calculateCodingPlatformScore({
      badgeCount: stats?.badgeCount || 0,
      mediumHardSolved: stats?.mediumHardSolved || 0,
    });
  }, [stats]);

  const handleFetch = async (e) => {
    e?.preventDefault();
    const clean = extractUsername(username);
    if (!clean) {
      setFetchError('Enter a valid LeetCode username.');
      return;
    }

    setFetching(true);
    setFetchError('');
    setSubmitError('');

    try {
      const data = await fetchLeetCodeProfile(clean);
      setStats(data);
      saveLocalMappedLeetCodeUsername(studentId, data.username);
    } catch (err) {
      console.error('LeetCode fetch error:', err);
      setFetchError(err.message || 'Failed to fetch LeetCode profile statistics.');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!stats) {
      setSubmitError('Please fetch your LeetCode statistics first.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const calc = calculateCodingPlatformScore({
        badgeCount: stats.badgeCount,
        mediumHardSolved: stats.mediumHardSolved,
      });

      // Save snapshot to table
      try {
        await saveLeetCodeProfile({
          studentId,
          profileData: stats,
          calculatedScores: calc,
        });
      } catch (err) {
        console.warn('saveLeetCodeProfile notice:', err?.message);
      }

      const payload = {
        title: `LeetCode — @${stats.username} (${stats.badgeCount} badges, ${stats.mediumHardSolved} M/H solved)`,
        details: {
          platform: 'leetcode',
          profile_username: stats.username,
          username: stats.username,
          profile_url: stats.profileUrl,
          easy_solved: stats.easySolved,
          medium_solved: stats.mediumSolved,
          hard_solved: stats.hardSolved,
          medium_hard_solved: stats.mediumHardSolved,
          badge_count: stats.badgeCount,
          badge_marks: calc.badgeMarks,
          difficulty_marks: calc.difficultyMarks,
          calculated_marks: calc.total,
          fetched_at: stats.fetchedAt,
          last_synced_at: new Date().toISOString(),
        },
        proof_url: null,
        proofUrl: null,
        awarded_marks: calc.total,
        status: 'PENDING',
      };

      await onSubmitProof('coding-platforms', payload);
      showToast?.('Coding Platform Synced', `LeetCode @${stats.username} recorded for verification.`, 'success');
      setIsUpdateMode(false);
    } catch (err) {
      console.error('LeetCode submission error:', err);
      setSubmitError(err.message || 'Failed to submit LeetCode profile.');
      showToast?.('Submission Error', err.message || 'Failed to submit claim.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const hasValidStats = Boolean(
    stats?.username &&
    (verifiedScore > 0 || (stats?.badgeCount > 0 || stats?.mediumHardSolved > 0) || (stats?.easySolved > 0))
  );

  const isReadOnly = (lifecycleStatus === 'VERIFIED' || lifecycleStatus === 'PENDING') && !isUpdateMode && hasValidStats;

  return (
    <MetricWorkspaceShell
      isOpen={isOpen}
      onClose={onClose}
      categoryTitle="CODING PRACTICE PLATFORM"
      categoryDescription="LeetCode live badges and solved questions contribute up to 10 marks."
      maxMarks={10}
      icon={Code2}
      verifiedScore={verifiedScore}
      lifecycleStatus={lifecycleStatus}
      rejectedNotes={rejectedSub?.verifier_notes}
      pendingClaimedMarks={pendingSub?.details?.calculated_marks}
      pendingAttachedDetails={
        stats?.username ? (
          <span className="font-semibold text-xs px-2.5 py-0.5 rounded bg-[var(--bg-input)] border" style={{ borderColor: 'var(--border)' }}>
            @{stats.username} • {stats.badgeCount || 0} badges • {stats.mediumHardSolved || 0} M/H solved
          </span>
        ) : null
      }
      rubricText="Badges: ≥25 (5m), ≥20 (4m), ≥15 (3m), ≥10 (2m), ≥5 (1m) • Medium + Difficult Solved: >200 (5m), ≥150 (4m), ≥100 (3m), ≥50 (2m), ≥25 (1m)"
      showRubricInfo={showRubricInfo}
      onToggleRubricInfo={() => setShowRubricInfo((prev) => !prev)}
    >
      {/* Top Tab Switcher: View Ledger vs Enter / Update Details */}
      {hasValidStats && (
        <div className="flex items-center gap-2 mb-4 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
          <button
            type="button"
            onClick={() => setIsUpdateMode(false)}
            className={`px-3.5 py-1.5 rounded-[var(--radius)] text-xs font-semibold cursor-pointer transition-colors ${
              !isUpdateMode
                ? 'bg-[var(--green-light)] text-[var(--green-text)] border border-[var(--border)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            📊 Verified Ledger
          </button>
          <button
            type="button"
            onClick={() => setIsUpdateMode(true)}
            className={`px-3.5 py-1.5 rounded-[var(--radius)] text-xs font-semibold cursor-pointer transition-colors ${
              isUpdateMode
                ? 'bg-[var(--green-light)] text-[var(--green-text)] border border-[var(--border)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            ⚡ Enter Details / Re-sync Profile
          </button>
        </div>
      )}

      {/* Read-Only State (Verified OR Pending Verification) */}
      {isReadOnly ? (
        <div className="space-y-6">
          <div
            className="p-5 rounded-[var(--radius-lg)] border"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: lifecycleStatus === 'VERIFIED' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(245, 158, 11, 0.25)',
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                {lifecycleStatus === 'VERIFIED' ? (
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                ) : (
                  <Clock size={18} className="shrink-0" style={{ color: 'var(--amber-text)' }} />
                )}
                <div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    {lifecycleStatus === 'VERIFIED'
                      ? 'Verified Coding Platform Ledger'
                      : 'Coding Platform In Verification Queue'}
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {lifecycleStatus === 'VERIFIED'
                      ? 'Verified by departmental placement evaluation committee.'
                      : 'Your LeetCode metrics and badge achievements have been submitted for faculty verification.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsUpdateMode(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-[var(--radius)] border cursor-pointer hover:opacity-90 transition-opacity self-start sm:self-auto"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border)',
                  color: 'var(--green-text)',
                }}
              >
                <Edit3 size={13} />
                <span>Re-sync LeetCode Stats →</span>
              </button>
            </div>

            {/* Profile Overview Card */}
            {stats && (
              <div className="p-4 rounded-[var(--radius)] border bg-[var(--bg-card)] mb-4" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                      style={{ backgroundColor: 'var(--green-light)', color: 'var(--green-text)' }}
                    >
                      <Code2 size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        @{stats.username}
                      </h4>
                      <a
                        href={stats.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs inline-flex items-center gap-1 hover:underline"
                        style={{ color: '#60A5FA' }}
                      >
                        <span>{stats.profileUrl}</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>

                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: 'var(--green-light)', color: 'var(--green-text)' }}
                  >
                    <ShieldCheck size={12} />
                    <span>API Verified</span>
                  </span>
                </div>
              </div>
            )}

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-[var(--radius)] border bg-[var(--bg-card)]" style={{ borderColor: 'var(--border)' }}>
                <span className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Easy Solved</span>
                <span className="text-xl font-bold block" style={{ color: '#10B981' }}>
                  {stats?.easySolved ?? 0}
                </span>
                <span className="text-[11px] font-semibold mt-1 inline-block" style={{ color: 'var(--text-muted)' }}>
                  Foundational
                </span>
              </div>

              <div className="p-3.5 rounded-[var(--radius)] border bg-[var(--bg-card)]" style={{ borderColor: 'var(--border)' }}>
                <span className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Medium Solved</span>
                <span className="text-xl font-bold block" style={{ color: '#F59E0B' }}>
                  {stats?.mediumSolved ?? 0}
                </span>
                <span className="text-[11px] font-semibold mt-1 inline-block" style={{ color: 'var(--text-muted)' }}>
                  Core Placement
                </span>
              </div>

              <div className="p-3.5 rounded-[var(--radius)] border bg-[var(--bg-card)]" style={{ borderColor: 'var(--border)' }}>
                <span className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Hard Solved</span>
                <span className="text-xl font-bold block" style={{ color: '#EF4444' }}>
                  {stats?.hardSolved ?? 0}
                </span>
                <span className="text-[11px] font-semibold mt-1 inline-block" style={{ color: 'var(--text-muted)' }}>
                  Advanced
                </span>
              </div>

              <div className="p-3.5 rounded-[var(--radius)] border bg-[var(--bg-card)]" style={{ borderColor: 'var(--border)' }}>
                <span className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Badges Count</span>
                <span className="text-xl font-bold block" style={{ color: '#60A5FA' }}>
                  {stats?.badgeCount ?? 0}
                </span>
                <span className="text-[11px] font-semibold mt-1 inline-block" style={{ color: 'var(--green-text)' }}>
                  +{liveScore.badgeMarks} / 5 Marks
                </span>
              </div>
            </div>

            {/* Medium + Hard Combined Pill */}
            <div className="mt-4 p-3 rounded-[var(--radius)] border bg-[var(--bg-card)] flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
              <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Medium + Difficult Solved Total:
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                  {stats?.mediumHardSolved ?? 0} questions
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--green-light)', color: 'var(--green-text)' }}>
                  +{liveScore.difficultyMarks} / 5 Marks
                </span>
              </div>
            </div>

            {/* Update / Re-sync Details Callout */}
            <div
              className="mt-4 p-4 rounded-[var(--radius)] border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
            >
              <div>
                <h4 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                  Update or Re-sync Your LeetCode Metrics
                </h4>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  Enter or update your LeetCode username to fetch your latest solved questions and badge marks.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsUpdateMode(true)}
                className="px-3.5 py-2 rounded-[var(--radius)] text-xs font-semibold cursor-pointer shrink-0 inline-flex items-center gap-1.5 transition-all hover:opacity-90"
                style={{ backgroundColor: 'var(--green)', color: '#000000' }}
              >
                <Edit3 size={13} />
                <span>Enter Details / Re-sync →</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Edit / Sync Form Mode */
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-5 rounded-[var(--radius-lg)] border space-y-4" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                LeetCode Profile Verification
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  Direct GraphQL / Proxy Sync
                </span>
                {isUpdateMode && (
                  <button
                    type="button"
                    onClick={() => setIsUpdateMode(false)}
                    className="text-xs font-semibold hover:underline cursor-pointer"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                  leetcode.com/u/
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="your-leetcode-username"
                  className="w-full pl-32 pr-3.5 py-2.5 rounded-[var(--radius)] border text-xs font-mono transition-colors focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <button
                type="button"
                onClick={handleFetch}
                disabled={fetching || !username.trim()}
                className="px-4 py-2.5 rounded-[var(--radius)] text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 shrink-0"
                style={{
                  backgroundColor: 'var(--green)',
                  color: '#000000',
                }}
              >
                {fetching ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Syncing LeetCode...</span>
                  </>
                ) : (
                  <>
                    <RotateCw size={14} />
                    <span>Fetch Stats</span>
                  </>
                )}
              </button>
            </div>

            {fetchError && (
              <div
                className="p-3 rounded-[var(--radius)] text-xs border flex items-center gap-2"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  borderColor: 'rgba(239, 68, 68, 0.25)',
                  color: '#EF4444',
                }}
              >
                <AlertCircle size={14} className="shrink-0" />
                <span>{fetchError}</span>
              </div>
            )}

            {/* Live Fetched Stats Display */}
            {stats && (
              <div className="p-4 rounded-[var(--radius)] border bg-[var(--bg-card)] space-y-3" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Code2 size={18} style={{ color: 'var(--green-text)' }} />
                    <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                      @{stats.username}
                    </span>
                    <a
                      href={stats.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs inline-flex items-center gap-1 hover:underline"
                      style={{ color: '#60A5FA' }}
                    >
                      <ExternalLink size={11} />
                    </a>
                  </div>

                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded"
                    style={{ backgroundColor: 'var(--green-light)', color: 'var(--green-text)' }}
                  >
                    <ShieldCheck size={11} />
                    <span>Synced Successfully</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
                  <div className="p-2.5 rounded border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Easy</div>
                    <div className="font-bold text-sm" style={{ color: '#10B981' }}>{stats.easySolved}</div>
                  </div>
                  <div className="p-2.5 rounded border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Medium</div>
                    <div className="font-bold text-sm" style={{ color: '#F59E0B' }}>{stats.mediumSolved}</div>
                  </div>
                  <div className="p-2.5 rounded border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Hard</div>
                    <div className="font-bold text-sm" style={{ color: '#EF4444' }}>{stats.hardSolved}</div>
                  </div>
                  <div className="p-2.5 rounded border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Badges</div>
                    <div className="font-bold text-sm" style={{ color: '#60A5FA' }}>{stats.badgeCount}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs px-1" style={{ color: 'var(--text-secondary)' }}>
                  <span>Medium + Difficult Solved:</span>
                  <span className="font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                    {stats.mediumHardSolved} questions
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Rubric Marks Projection Simulator */}
          <div className="p-5 rounded-[var(--radius-lg)] border space-y-3" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Official Rubric Marks Projection
              </span>
              <span className="text-base font-bold font-mono" style={{ color: 'var(--green-text)' }}>
                {liveScore.total} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/ 10 Marks</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded border flex items-center justify-between" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
                <div>
                  <span className="text-xs font-bold block" style={{ color: 'var(--text-primary)' }}>LeetCode Badges</span>
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{stats?.badgeCount || 0} badges earned</span>
                </div>
                <span className="font-bold text-sm" style={{ color: 'var(--green-text)' }}>
                  +{liveScore.badgeMarks} / 5m
                </span>
              </div>

              <div className="p-3 rounded border flex items-center justify-between" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
                <div>
                  <span className="text-xs font-bold block" style={{ color: 'var(--text-primary)' }}>Medium / Hard Questions</span>
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{stats?.mediumHardSolved || 0} problems solved</span>
                </div>
                <span className="font-bold text-sm" style={{ color: 'var(--green-text)' }}>
                  +{liveScore.difficultyMarks} / 5m
                </span>
              </div>
            </div>
          </div>

          {submitError && (
            <div
              className="p-3 rounded-[var(--radius)] text-xs border flex items-center gap-2"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderColor: 'rgba(239, 68, 68, 0.25)',
                color: '#EF4444',
              }}
            >
              <AlertCircle size={14} className="shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-2">
            {isUpdateMode ? (
              <button
                type="button"
                onClick={() => setIsUpdateMode(false)}
                className="px-4 py-2.5 rounded-[var(--radius)] text-xs font-semibold border cursor-pointer hover:opacity-80 transition-opacity"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-secondary)',
                }}
              >
                Cancel Re-sync
              </button>
            ) : <div />}

            <button
              type="submit"
              disabled={submitting || !stats}
              className="px-6 py-2.5 rounded-[var(--radius)] text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-all hover:opacity-90 disabled:opacity-50"
              style={{
                backgroundColor: 'var(--green)',
                color: '#000000',
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Submitting Claim...</span>
                </>
              ) : (
                <span>Submit LeetCode Verification Claim ({liveScore.total}m)</span>
              )}
            </button>
          </div>
        </form>
      )}
    </MetricWorkspaceShell>
  );
}
