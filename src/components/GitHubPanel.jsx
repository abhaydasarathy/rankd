import React, { useState, useMemo } from 'react';
import { Loader2, CheckCircle2, AlertCircle, ExternalLink, GitBranch, FolderGit2, Users } from 'lucide-react';
import { fetchGitHubStats } from '../services/githubService.js';
import { calculateGitHubScore } from '../utils/scoringEngine.js';

function GithubIcon({ size = 16, style, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: `${size}px`, height: `${size}px`, flexShrink: 0, ...style }}
      className={className}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

export default function GitHubPanel({ studentId, onSubmitProof, onSubmitSuccess }) {
  const [username, setUsername] = useState('');
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState('');
  const [fetchedData, setFetchedData] = useState(null);

  const [communityProjects, setCommunityProjects] = useState('0');
  const [collaborations, setCollaborations] = useState('0');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Live calculation of rubric scores
  const preview = useMemo(() => {
    return calculateGitHubScore({
      contributionsLastYear: fetchedData?.totalContributions || fetchedData?.reposLastYear || 0,
      avgMonthlyContributions: fetchedData?.avgMonthlyFrequency || 0,
      communityProjectCount: Number(communityProjects) || 0,
      collaborationCount: Number(collaborations) || 0,
    });
  }, [fetchedData, communityProjects, collaborations]);

  const handleFetch = async (e) => {
    if (e) e.preventDefault();
    if (!username.trim()) {
      setFetchError('Enter a valid GitHub username or profile URL.');
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

  const handleSubmit = async () => {
    if (!fetchedData) {
      setSubmitError('Please fetch your GitHub profile stats first.');
      return;
    }

    const cProjects = Math.max(0, Math.min(2, Number(communityProjects) || 0));
    const collabs = Math.max(0, Math.min(3, Number(collaborations) || 0));

    setSubmitting(true);
    setSubmitError('');

    try {
      const payload = {
        title: `GitHub Profile — @${fetchedData.username} (${preview.total} / 15 Marks)`,
        details: {
          github_username: fetchedData.username,
          profile_url: fetchedData.profileUrl,
          repos_last_year: fetchedData.reposLastYear,
          total_contributions: fetchedData.totalContributions,
          active_months_count: fetchedData.activeMonthsCount,
          avg_monthly_frequency: fetchedData.avgMonthlyFrequency,
          community_projects: cProjects,
          collaborations: collabs,
          repo_marks: preview.repoMarks,
          frequency_marks: preview.frequencyMarks,
          community_marks: preview.communityMarks,
          collab_marks: preview.collabMarks,
          calculated_marks: preview.total,
          fetched_at: fetchedData.fetchedAt,
        },
        proof_url: null, // Evidence upload disabled — re-enable in future update
        proofUrl: null,
        awarded_marks: 0,
        status: 'PENDING',
      };

      if (onSubmitProof) {
        await onSubmitProof('github', payload);
      }
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (err) {
      console.error('GitHub submission error:', err);
      setSubmitError(err.message || 'Failed to submit GitHub profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Step 1: Username Input & Fetch */}
      <div className="p-3.5 rounded-[var(--radius)] border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
            <GithubIcon size={13} style={{ color: 'var(--text-secondary)' }} />
            <span>GitHub Username / Profile URL</span>
          </label>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Step 1 of 3</span>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              github.com/
            </span>
            <input
              type="text"
              placeholder="torvalds"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFetch(e)}
              className="w-full pl-[95px] pr-2.5 py-1.5 text-xs rounded-[var(--radius)] border outline-none font-mono"
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
            className="px-3.5 py-1.5 rounded-[var(--radius)] font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
            style={{
              backgroundColor: 'var(--green)',
              color: '#FFFFFF',
              opacity: fetching || !username.trim() ? 0.6 : 1,
            }}
          >
            {fetching ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Fetching...</span>
              </>
            ) : (
              <span>Fetch Stats</span>
            )}
          </button>
        </div>

        {fetchError && (
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-red-400">
            <AlertCircle size={12} className="shrink-0" />
            <span>{fetchError}</span>
          </div>
        )}
      </div>

      {/* Step 2: Fetched Stats Summary Card */}
      {fetchedData && (
        <div
          className="p-3.5 rounded-[var(--radius)] border flex flex-col gap-2.5 transition-all"
          style={{ backgroundColor: 'rgba(16, 185, 129, 0.04)', borderColor: 'rgba(16, 185, 129, 0.25)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} style={{ color: 'var(--green-text)' }} />
              <div>
                <span className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>
                  @{fetchedData.username}
                </span>
                <span className="text-[10px] ml-1.5" style={{ color: 'var(--text-muted)' }}>
                  Verified Profile Stats
                </span>
              </div>
            </div>
            <a
              href={fetchedData.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-medium hover:underline"
              style={{ color: 'var(--green)' }}
            >
              <span>View GitHub</span>
              <ExternalLink size={11} />
            </a>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 border-t" style={{ borderColor: 'rgba(16, 185, 129, 0.15)' }}>
            <div className="p-2 rounded bg-black/20 text-center">
              <span className="block text-[10px] text-[var(--text-muted)]">Repos (Past 1 Yr)</span>
              <span className="text-sm font-bold font-mono text-[var(--text-primary)]">
                {fetchedData.reposLastYear}
              </span>
              <span className="block text-[9px] text-[var(--green-text)]">
                +{preview.repoMarks}/5m
              </span>
            </div>
            <div className="p-2 rounded bg-black/20 text-center">
              <span className="block text-[10px] text-[var(--text-muted)]">Active Months</span>
              <span className="text-sm font-bold font-mono text-[var(--text-primary)]">
                {fetchedData.activeMonthsCount} / 12
              </span>
              <span className="block text-[9px] text-[var(--text-muted)]">
                Yearly span
              </span>
            </div>
            <div className="p-2 rounded bg-black/20 text-center">
              <span className="block text-[10px] text-[var(--text-muted)]">Monthly Freq</span>
              <span className="text-sm font-bold font-mono text-[var(--text-primary)]">
                {fetchedData.avgMonthlyFrequency}/mo
              </span>
              <span className="block text-[9px] text-[var(--green-text)]">
                +{preview.frequencyMarks}/2m
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Manual Community & Collaboration Inputs */}
      <div className="p-3.5 rounded-[var(--radius)] border space-y-3" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Community & Collaboration (Manual Review)
          </label>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Step 2 of 3</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-medium flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                <FolderGit2 size={12} />
                <span>Community Projects</span>
              </label>
              <span className="text-[10px] font-semibold" style={{ color: 'var(--green-text)' }}>
                +{preview.communityMarks} / 3m
              </span>
            </div>
            <select
              value={communityProjects}
              onChange={(e) => setCommunityProjects(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-[var(--radius)] border outline-none"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              <option value="0">0 projects (0m)</option>
              <option value="1">1 project (2m)</option>
              <option value="2">2 projects (3m max)</option>
            </select>
            <span className="text-[10px] mt-0.5 block" style={{ color: 'var(--text-muted)' }}>
              Max 2 projects • 2m each (capped at 3m)
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-medium flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                <Users size={12} />
                <span>Collaborations</span>
              </label>
              <span className="text-[10px] font-semibold" style={{ color: 'var(--green-text)' }}>
                +{preview.collabMarks} / 5m
              </span>
            </div>
            <select
              value={collaborations}
              onChange={(e) => setCollaborations(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-[var(--radius)] border outline-none"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              <option value="0">0 collaborations (0m)</option>
              <option value="1">1 collaboration (2m)</option>
              <option value="2">2 collaborations (4m)</option>
              <option value="3">3 collaborations (5m max)</option>
            </select>
            <span className="text-[10px] mt-0.5 block" style={{ color: 'var(--text-muted)' }}>
              Max 3 teams • 2m each (capped at 5m)
            </span>
          </div>
        </div>
      </div>

      {/* Step 4: Live Rubric Preview */}
      <div
        className="p-3.5 rounded-[var(--radius)] border"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            GitHub Rubric Calculation
          </span>
          <span className="text-sm font-bold font-mono" style={{ color: 'var(--green-text)' }}>
            {preview.total} <span className="text-xs" style={{ color: 'var(--text-muted)' }}>/ 15 Marks</span>
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
          <div className="p-1.5 rounded bg-white/[0.03] border border-white/[0.05]">
            <span className="block text-[var(--text-muted)]">Repos (&gt;20)</span>
            <span className="font-bold text-[var(--text-primary)]">{preview.repoMarks} / 5m</span>
          </div>
          <div className="p-1.5 rounded bg-white/[0.03] border border-white/[0.05]">
            <span className="block text-[var(--text-muted)]">Freq (&ge;2/mo)</span>
            <span className="font-bold text-[var(--text-primary)]">{preview.frequencyMarks} / 2m</span>
          </div>
          <div className="p-1.5 rounded bg-white/[0.03] border border-white/[0.05]">
            <span className="block text-[var(--text-muted)]">Community</span>
            <span className="font-bold text-[var(--text-primary)]">{preview.communityMarks} / 3m</span>
          </div>
          <div className="p-1.5 rounded bg-white/[0.03] border border-white/[0.05]">
            <span className="block text-[var(--text-muted)]">Collab</span>
            <span className="font-bold text-[var(--text-primary)]">{preview.collabMarks} / 5m</span>
          </div>
        </div>
      </div>

      {submitError && (
        <div className="flex items-center gap-1.5 text-[11px] text-red-400">
          <AlertCircle size={12} className="shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Step 5: Submit for Verification */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || !fetchedData}
        className="w-full py-2.5 px-4 rounded-[var(--radius)] font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
        style={{
          backgroundColor: 'var(--green)',
          color: '#FFFFFF',
          opacity: submitting || !fetchedData ? 0.5 : 1,
        }}
      >
        {submitting ? (
          <>
            <Loader2 size={13} className="animate-spin" />
            <span>Submitting to Faculty Queue...</span>
          </>
        ) : (
          <span>Submit for Faculty Verification</span>
        )}
      </button>
    </div>
  );
}
