import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  GitBranch,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RotateCw,
  AlertCircle,
  FolderGit2,
  Users,
  ShieldCheck,
  Edit3,
  Clock,
} from 'lucide-react';
import GithubIcon from './GithubIcon';
import MetricWorkspaceShell from './MetricWorkspaceShell';
import { fetchGitHubStats } from '../../services/githubService';
import { calculateGitHubScore } from '../../utils/scoringEngine';

export default function GitHubWorkspace({
  isOpen,
  onClose,
  studentProfile,
  submissions = [],
  verifiedScore = 0,
  scoreResult,
  onSubmitProof,
  showToast,
}) {
  const githubSubmissions = useMemo(() => {
    return (submissions || []).filter(
      (s) => s.category_id === 'github' || s.categoryId === 'github'
    );
  }, [submissions]);

  const verifiedSub = useMemo(() => {
    return githubSubmissions.find((s) => s.status === 'VERIFIED' || s.status === 'Verified');
  }, [githubSubmissions]);

  const pendingSub = useMemo(() => {
    return githubSubmissions.find((s) => s.status === 'PENDING' || s.status === 'Pending');
  }, [githubSubmissions]);

  const rejectedSub = useMemo(() => {
    return githubSubmissions.find((s) => s.status === 'REJECTED' || s.status === 'Rejected');
  }, [githubSubmissions]);

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
  const [fetchedData, setFetchedData] = useState(null);

  const [communityProjects, setCommunityProjects] = useState('0');
  const [collaborations, setCollaborations] = useState('0');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showRubricInfo, setShowRubricInfo] = useState(false);

  const prevIsOpenRef = useRef(false);

  // Initialize from previous submission
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setIsUpdateMode(false);
      setFetchError('');
      setSubmitError('');

      const activeSub = verifiedSub || pendingSub || rejectedSub;
      const details = activeSub?.details || {};

      if (details.github_username || details.username) {
        const u = details.github_username || details.username;
        setUsername(u);
        setFetchedData({
          username: u,
          profileUrl: details.profile_url || `https://github.com/${u}`,
          reposLastYear: details.repos_last_year ?? 0,
          totalContributions: details.total_contributions ?? 0,
          activeMonthsCount: details.active_months_count ?? 0,
          avgMonthlyFrequency: details.avg_monthly_frequency ?? 0,
          fetchedAt: details.fetched_at || activeSub?.created_at,
        });
        setCommunityProjects(String(details.community_projects ?? 0));
        setCollaborations(String(details.collaborations ?? 0));
      } else {
        setUsername('');
        setFetchedData(null);
        setCommunityProjects('0');
        setCollaborations('0');
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, verifiedSub, pendingSub, rejectedSub]);

  // Live calculation from scoringEngine
  const liveScore = useMemo(() => {
    return calculateGitHubScore({
      contributionsLastYear: fetchedData?.totalContributions || fetchedData?.reposLastYear || 0,
      avgMonthlyContributions: fetchedData?.avgMonthlyFrequency || 0,
      communityProjectCount: Number(communityProjects) || 0,
      collaborationCount: Number(collaborations) || 0,
    });
  }, [fetchedData, communityProjects, collaborations]);

  const handleFetch = async (e) => {
    e?.preventDefault();
    if (!username.trim()) {
      setFetchError('Enter a valid GitHub username.');
      return;
    }

    setFetching(true);
    setFetchError('');
    setSubmitError('');

    try {
      const data = await fetchGitHubStats(username);
      setFetchedData(data);
    } catch (err) {
      console.error('GitHub fetch error:', err);
      setFetchError(err.message || 'Failed to fetch GitHub profile.');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!fetchedData) {
      setSubmitError('Please connect and fetch your GitHub profile data first.');
      return;
    }

    const cProjects = Math.max(0, Math.min(2, Number(communityProjects) || 0));
    const collabs = Math.max(0, Math.min(3, Number(collaborations) || 0));

    setSubmitting(true);
    setSubmitError('');

    try {
      const payload = {
        title: `GitHub Profile — @${fetchedData.username} (${liveScore.total} / 15 Marks)`,
        details: {
          github_username: fetchedData.username,
          username: fetchedData.username,
          profile_url: fetchedData.profileUrl,
          contributions_last_year: fetchedData.totalContributions || fetchedData.reposLastYear,
          contributionsLastYear: fetchedData.totalContributions || fetchedData.reposLastYear,
          avg_monthly_contributions: fetchedData.avgMonthlyFrequency,
          avgMonthlyContributions: fetchedData.avgMonthlyFrequency,
          community_project_count: cProjects,
          communityProjectCount: cProjects,
          collaboration_count: collabs,
          collaborationCount: collabs,
          repos_last_year: fetchedData.reposLastYear,
          total_contributions: fetchedData.totalContributions,
          active_months_count: fetchedData.activeMonthsCount,
          avg_monthly_frequency: fetchedData.avgMonthlyFrequency,
          community_projects: cProjects,
          collaborations: collabs,
          repo_marks: liveScore.repoMarks,
          frequency_marks: liveScore.frequencyMarks,
          community_marks: liveScore.communityMarks,
          collab_marks: liveScore.collabMarks,
          calculated_marks: liveScore.total,
          fetched_at: fetchedData.fetchedAt,
          last_synced_at: new Date().toISOString(),
        },
        proof_url: null,
        proofUrl: null,
        awarded_marks: liveScore.total,
        status: 'PENDING',
      };

      await onSubmitProof('github', payload);
      showToast?.('GitHub Profile Submitted', `Synced @${fetchedData.username} for faculty review.`, 'success');
      setIsUpdateMode(false);
    } catch (err) {
      console.error('GitHub submission error:', err);
      setSubmitError(err.message || 'Failed to submit GitHub profile.');
      showToast?.('Submission Error', err.message || 'Failed to submit GitHub profile.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const hasValidData = Boolean(
    fetchedData?.username &&
    (verifiedScore > 0 || (fetchedData?.totalContributions > 0) || (fetchedData?.reposLastYear > 0))
  );

  const isReadOnly = (lifecycleStatus === 'VERIFIED' || lifecycleStatus === 'PENDING') && !isUpdateMode && hasValidData;

  return (
    <MetricWorkspaceShell
      isOpen={isOpen}
      onClose={onClose}
      categoryTitle="GITHUB PROFILE"
      categoryDescription="Repositories, commit frequency, collaboration & open source contribute up to 15 marks."
      maxMarks={15}
      icon={GithubIcon}
      verifiedScore={verifiedScore}
      lifecycleStatus={lifecycleStatus}
      rejectedNotes={rejectedSub?.verifier_notes}
      pendingClaimedMarks={pendingSub?.details?.calculated_marks}
      pendingAttachedDetails={
        fetchedData?.username ? (
          <span className="font-semibold text-xs px-2.5 py-0.5 rounded bg-[var(--bg-input)] border" style={{ borderColor: 'var(--border)' }}>
            @{fetchedData.username} • {fetchedData.totalContributions || 0} contribs
          </span>
        ) : null
      }
      rubricText="Contributions (1 yr): >20 (5m), 16-20 (4m), 11-15 (3m), 6-10 (2m), 1-5 (1m) • Monthly Frequency: ≥2/mo (2m), ≥1/mo (1m) • Community Projects: 2m/proj (Max 3m) • Collaborations: 2m/collab (Max 5m)"
      showRubricInfo={showRubricInfo}
      onToggleRubricInfo={() => setShowRubricInfo((prev) => !prev)}
    >
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
                      ? 'Verified GitHub Profile Ledger'
                      : 'GitHub Profile In Verification Queue'}
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {lifecycleStatus === 'VERIFIED'
                      ? 'Verified by departmental placement evaluation committee.'
                      : 'Your GitHub metrics and commit activity have been submitted for faculty verification.'}
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
                <span>Re-sync GitHub Profile →</span>
              </button>
            </div>

            {/* Profile Overview Card */}
            {fetchedData && (
              <div className="p-4 rounded-[var(--radius)] border bg-[var(--bg-card)] mb-4" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                      style={{ backgroundColor: 'var(--green-light)', color: 'var(--green-text)' }}
                    >
                      <GithubIcon size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        @{fetchedData.username}
                      </h4>
                      <a
                        href={fetchedData.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs inline-flex items-center gap-1 hover:underline"
                        style={{ color: '#60A5FA' }}
                      >
                        <span>{fetchedData.profileUrl}</span>
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

            {/* 4 Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-[var(--radius)] border bg-[var(--bg-card)]" style={{ borderColor: 'var(--border)' }}>
                <span className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Contributions (1 yr)</span>
                <span className="text-xl font-bold block" style={{ color: 'var(--text-primary)' }}>
                  {fetchedData?.totalContributions ?? fetchedData?.reposLastYear ?? 0}
                </span>
                <span className="text-[11px] font-semibold mt-1 inline-block" style={{ color: 'var(--green-text)' }}>
                  +{liveScore.repoMarks} / 5 Marks
                </span>
              </div>

              <div className="p-3.5 rounded-[var(--radius)] border bg-[var(--bg-card)]" style={{ borderColor: 'var(--border)' }}>
                <span className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Avg Per Month</span>
                <span className="text-xl font-bold block" style={{ color: 'var(--text-primary)' }}>
                  {fetchedData?.avgMonthlyFrequency ?? 0}/mo
                </span>
                <span className="text-[11px] font-semibold mt-1 inline-block" style={{ color: 'var(--green-text)' }}>
                  +{liveScore.frequencyMarks} / 2 Marks
                </span>
              </div>

              <div className="p-3.5 rounded-[var(--radius)] border bg-[var(--bg-card)]" style={{ borderColor: 'var(--border)' }}>
                <span className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Community Proj</span>
                <span className="text-xl font-bold block" style={{ color: 'var(--text-primary)' }}>
                  {communityProjects}
                </span>
                <span className="text-[11px] font-semibold mt-1 inline-block" style={{ color: 'var(--green-text)' }}>
                  +{liveScore.communityMarks} / 3 Marks
                </span>
              </div>

              <div className="p-3.5 rounded-[var(--radius)] border bg-[var(--bg-card)]" style={{ borderColor: 'var(--border)' }}>
                <span className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Collaborations</span>
                <span className="text-xl font-bold block" style={{ color: 'var(--text-primary)' }}>
                  {collaborations}
                </span>
                <span className="text-[11px] font-semibold mt-1 inline-block" style={{ color: 'var(--green-text)' }}>
                  +{liveScore.collabMarks} / 5 Marks
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Edit / Connection Mode */
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Connect GitHub Profile */}
          <div className="p-5 rounded-[var(--radius-lg)] border space-y-4" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                Step 1: Connect GitHub Profile
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  Real-time API Sync
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
                  github.com/
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="your-username"
                  className="w-full pl-28 pr-3.5 py-2.5 rounded-[var(--radius)] border text-xs font-mono transition-colors focus:outline-none"
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
                    <span>Syncing GitHub...</span>
                  </>
                ) : (
                  <>
                    <RotateCw size={14} />
                    <span>Fetch Live Stats</span>
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

            {/* Fetched Statistics Snapshot Card */}
            {fetchedData && (
              <div className="p-4 rounded-[var(--radius)] border bg-[var(--bg-card)] space-y-3" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <GithubIcon size={18} style={{ color: 'var(--green-text)' }} />
                    <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                      @{fetchedData.username}
                    </span>
                    <a
                      href={fetchedData.profileUrl}
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
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Contributions (1 yr)</div>
                    <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{fetchedData.totalContributions || fetchedData.reposLastYear}</div>
                  </div>
                  <div className="p-2.5 rounded border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Avg Per Month</div>
                    <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{fetchedData.avgMonthlyFrequency}/mo</div>
                  </div>
                  <div className="p-2.5 rounded border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Year Repos</div>
                    <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{fetchedData.reposLastYear}</div>
                  </div>
                  <div className="p-2.5 rounded border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Active Months</div>
                    <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{fetchedData.activeMonthsCount} / 12</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Open Source & Collaborations */}
          <div className="p-5 rounded-[var(--radius-lg)] border space-y-4" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
              Step 2: Community Engagement & Collaborations
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold flex items-center justify-between" style={{ color: 'var(--text-primary)' }}>
                  <span className="flex items-center gap-1.5">
                    <FolderGit2 size={13} style={{ color: 'var(--text-muted)' }} />
                    <span>Community Projects</span>
                  </span>
                  <span className="text-[11px] font-normal" style={{ color: 'var(--text-muted)' }}>
                    Max 2 (+2m each, capped at 3m)
                  </span>
                </label>
                <select
                  value={communityProjects}
                  onChange={(e) => setCommunityProjects(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[var(--radius)] border text-xs cursor-pointer focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="0">0 Community Projects (+0m)</option>
                  <option value="1">1 Community Project (+2m)</option>
                  <option value="2">2+ Community Projects (+3m Max)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold flex items-center justify-between" style={{ color: 'var(--text-primary)' }}>
                  <span className="flex items-center gap-1.5">
                    <Users size={13} style={{ color: 'var(--text-muted)' }} />
                    <span>Collaborations / Open Source PRs</span>
                  </span>
                  <span className="text-[11px] font-normal" style={{ color: 'var(--text-muted)' }}>
                    Max 3 (+2m each, capped at 5m)
                  </span>
                </label>
                <select
                  value={collaborations}
                  onChange={(e) => setCollaborations(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[var(--radius)] border text-xs cursor-pointer focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="0">0 Collaborations (+0m)</option>
                  <option value="1">1 Collaboration (+2m)</option>
                  <option value="2">2 Collaborations (+4m)</option>
                  <option value="3">3+ Collaborations (+5m Max)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Step 3: Live Score Simulator */}
          <div className="p-5 rounded-[var(--radius-lg)] border space-y-3" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Official Rubric Marks Projection
              </span>
              <span className="text-base font-bold font-mono" style={{ color: 'var(--green-text)' }}>
                {liveScore.total} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/ 15 Marks</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
                <span className="text-[10px] block" style={{ color: 'var(--text-muted)' }}>Contributions in last 1 yr</span>
                <span className="font-bold text-xs" style={{ color: 'var(--green-text)' }}>+{liveScore.repoMarks} / 5m</span>
              </div>
              <div className="p-2.5 rounded border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
                <span className="text-[10px] block" style={{ color: 'var(--text-muted)' }}>Avg per month</span>
                <span className="font-bold text-xs" style={{ color: 'var(--green-text)' }}>+{liveScore.frequencyMarks} / 2m</span>
              </div>
              <div className="p-2.5 rounded border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
                <span className="text-[10px] block" style={{ color: 'var(--text-muted)' }}>Community projects (max 2)</span>
                <span className="font-bold text-xs" style={{ color: 'var(--green-text)' }}>+{liveScore.communityMarks} / 3m</span>
              </div>
              <div className="p-2.5 rounded border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
                <span className="text-[10px] block" style={{ color: 'var(--text-muted)' }}>Collaborations (max 3)</span>
                <span className="font-bold text-xs" style={{ color: 'var(--green-text)' }}>+{liveScore.collabMarks} / 5m</span>
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
              disabled={submitting || !fetchedData}
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
                <span>Submit GitHub Verification Claim ({liveScore.total}m)</span>
              )}
            </button>
          </div>
        </form>
      )}
    </MetricWorkspaceShell>
  );
}
