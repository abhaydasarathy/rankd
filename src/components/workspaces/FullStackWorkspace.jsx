import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Layers,
  CheckCircle2,
  ExternalLink,
  Globe,
  Loader2,
  AlertCircle,
  Edit3,
  Clock,
  Sparkles,
  Check,
} from 'lucide-react';
import GithubIcon from './GithubIcon';
import MetricWorkspaceShell from './MetricWorkspaceShell';
import URLField from './URLField';
import { calculateFsdScore, calculateFsdProjectMarks } from '../../utils/scoringEngine';

function formatUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const clean = url.trim();
  if (!clean) return '';
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    return `https://${clean}`;
  }
  return clean;
}

export default function FullStackWorkspace({
  isOpen,
  onClose,
  studentProfile,
  submissions = [],
  verifiedScore = 0,
  scoreResult,
  onSubmitProof,
  showToast,
}) {
  const fsdSubs = useMemo(() => {
    return (submissions || []).filter(
      (s) => s.category_id === 'fullstack' || s.categoryId === 'fullstack'
    );
  }, [submissions]);

  const verifiedSub = useMemo(() => {
    return fsdSubs.find((s) => s.status === 'VERIFIED' || s.status === 'Verified');
  }, [fsdSubs]);

  const pendingSub = useMemo(() => {
    return fsdSubs.find((s) => s.status === 'PENDING' || s.status === 'Pending');
  }, [fsdSubs]);

  const rejectedSub = useMemo(() => {
    return fsdSubs.find((s) => s.status === 'REJECTED' || s.status === 'Rejected');
  }, [fsdSubs]);

  const lifecycleStatus = useMemo(() => {
    if (pendingSub) return 'PENDING';
    if (verifiedSub || verifiedScore > 0) return 'VERIFIED';
    if (rejectedSub) return 'REJECTED';
    return 'UNCLAIMED';
  }, [verifiedSub, pendingSub, rejectedSub, verifiedScore]);

  const [isUpdateMode, setIsUpdateMode] = useState(false);

  // Form Fields: Only Name, Short Description (optional), Hosted URL, and GitHub Repo
  const [name, setName] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [hostedUrl, setHostedUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [showRubricInfo, setShowRubricInfo] = useState(false);

  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setIsUpdateMode(false);
      setFormError('');

      const activeSub = verifiedSub || pendingSub || rejectedSub;
      const d = activeSub?.details || {};

      if (d.name || d.title || activeSub?.title) {
        setName(d.name || d.title || activeSub.title || '');
        setShortDescription(d.shortDescription || d.short_description || d.description || '');
        setHostedUrl(d.hostedUrl || d.hosted_url || d.liveUrl || d.live_url || '');
        setGithubUrl(d.githubUrl || d.github_url || d.repoUrl || d.repo_url || '');
      } else {
        setName('');
        setShortDescription('');
        setHostedUrl('');
        setGithubUrl('');
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, verifiedSub, pendingSub, rejectedSub]);

  // Dynamic non-hardcoded marks calculation based on provided evidence
  const projectedMarks = useMemo(() => {
    return calculateFsdProjectMarks({
      name,
      hostedUrl: formatUrl(hostedUrl),
      githubUrl: formatUrl(githubUrl),
      description: shortDescription,
    });
  }, [name, hostedUrl, githubUrl, shortDescription]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setFormError('Please enter the application name.');
      return;
    }

    const normHosted = formatUrl(hostedUrl);
    const normRepo = formatUrl(githubUrl);

    if (!normHosted && !normRepo) {
      setFormError('Please enter at least a Hosted URL or a GitHub Repository URL.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    const calcMarks = calculateFsdProjectMarks({
      name: cleanName,
      hostedUrl: normHosted,
      githubUrl: normRepo,
      description: shortDescription.trim(),
    });

    try {
      const payload = {
        title: `${cleanName} (Full Stack Experience)`,
        details: {
          name: cleanName,
          title: cleanName,
          description: shortDescription.trim(),
          shortDescription: shortDescription.trim(),
          short_description: shortDescription.trim(),
          hostedUrl: normHosted,
          hosted_url: normHosted,
          liveUrl: normHosted,
          live_url: normHosted,
          githubUrl: normRepo,
          github_url: normRepo,
          repoUrl: normRepo,
          repo_url: normRepo,
          calculated_marks: calcMarks,
          frontend: 'Full Stack Web App',
          backend: 'Cloud API Service',
          database: 'Database',
        },
        proof_url: normHosted || normRepo || null,
        proofUrl: normHosted || normRepo || null,
        awarded_marks: calcMarks,
        status: 'PENDING',
      };

      await onSubmitProof('fullstack', payload);
      showToast?.('Full Stack App Submitted', `${cleanName} submitted for faculty evaluation (${calcMarks}m claimed).`, 'success');
      setIsUpdateMode(false);
    } catch (err) {
      console.error('Full stack submission error:', err);
      setFormError(err.message || 'Failed to submit full stack application.');
      showToast?.('Submission Error', err.message || 'Failed to submit full stack claim.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const activeSub = pendingSub || verifiedSub || rejectedSub;
  let activeDetails = activeSub?.details || {};
  if (typeof activeDetails === 'string') {
    try { activeDetails = JSON.parse(activeDetails); } catch (e) { activeDetails = {}; }
  }

  const hasValidDetails = Boolean(
    activeDetails.name || activeDetails.title || activeDetails.hostedUrl || activeDetails.githubUrl
  );

  const isReadOnly = (lifecycleStatus === 'VERIFIED' || lifecycleStatus === 'PENDING') && !isUpdateMode && hasValidDetails;

  const activeMarks =
    lifecycleStatus === 'VERIFIED'
      ? verifiedSub?.awarded_marks ?? verifiedScore ?? activeDetails.calculated_marks ?? 5
      : pendingSub?.details?.calculated_marks ?? pendingSub?.awarded_marks ?? 5;

  return (
    <MetricWorkspaceShell
      isOpen={isOpen}
      onClose={onClose}
      categoryTitle="FULL STACK DEVELOPER EXPERIENCE"
      categoryDescription="Production full-stack web/cloud application architecture contributes up to 5 marks."
      maxMarks={5}
      icon={Layers}
      verifiedScore={verifiedScore}
      lifecycleStatus={lifecycleStatus}
      rejectedNotes={rejectedSub?.verifier_notes}
      pendingClaimedMarks={activeMarks}
      pendingAttachedDetails={
        (activeDetails.name || activeDetails.title) ? (
          <span className="font-semibold text-xs px-2.5 py-0.5 rounded bg-[var(--bg-input)] border" style={{ borderColor: 'var(--border)' }}>
            {activeDetails.name || activeDetails.title}
          </span>
        ) : null
      }
      rubricText="Full Stack Developer Experience: Production web/cloud application with live deployment and source code repository (Up to 5 Marks, Max 1 Project Evaluated)."
      showRubricInfo={showRubricInfo}
      onToggleRubricInfo={() => setShowRubricInfo((prev) => !prev)}
    >
      {/* Read-Only State (Verified OR Pending Verification) */}
      {isReadOnly ? (
        <div className="space-y-6">
          <div
            className="p-5 rounded-[var(--radius-lg)] border space-y-4"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: lifecycleStatus === 'VERIFIED' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(245, 158, 11, 0.25)',
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                {lifecycleStatus === 'VERIFIED' ? (
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                ) : (
                  <Clock size={18} className="shrink-0" style={{ color: 'var(--amber-text)' }} />
                )}
                <div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    {lifecycleStatus === 'VERIFIED'
                      ? 'Verified Full Stack Application Ledger'
                      : 'Full Stack Application In Review Queue'}
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {lifecycleStatus === 'VERIFIED'
                      ? `Verified by departmental placement evaluation committee (+${activeMarks}m awarded).`
                      : 'Your application has been submitted and is in the faculty verification queue.'}
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
                <span>Update Details →</span>
              </button>
            </div>

            {/* Application Overview Card */}
            <div className="p-4 rounded-[var(--radius)] border bg-[var(--bg-card)] space-y-3" style={{ borderColor: 'var(--border)' }}>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                    {activeDetails.name || activeDetails.title || activeSub?.title || 'Full Stack Application'}
                  </h4>
                  {lifecycleStatus === 'PENDING' && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--amber-light)', color: 'var(--amber-text)' }}>
                      Pending (+{activeMarks}m)
                    </span>
                  )}
                  {lifecycleStatus === 'VERIFIED' && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--green-light)', color: 'var(--green-text)' }}>
                      Verified (+{activeMarks}m)
                    </span>
                  )}
                </div>

                {(activeDetails.shortDescription || activeDetails.short_description || activeDetails.description) && (
                  <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {activeDetails.shortDescription || activeDetails.short_description || activeDetails.description}
                  </p>
                )}
              </div>

              {/* Direct Inspectable Links */}
              <div className="flex flex-wrap items-center gap-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                {(activeDetails.hostedUrl || activeDetails.hosted_url || activeDetails.liveUrl || activeDetails.live_url) && (
                  <a
                    href={formatUrl(activeDetails.hostedUrl || activeDetails.hosted_url || activeDetails.liveUrl || activeDetails.live_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-[var(--radius-sm)] border hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--green-text)' }}
                  >
                    <Globe size={13} />
                    <span>Open Hosted URL</span>
                    <ExternalLink size={11} />
                  </a>
                )}

                {(activeDetails.githubUrl || activeDetails.github_url || activeDetails.repoUrl || activeDetails.repo_url) && (
                  <a
                    href={formatUrl(activeDetails.githubUrl || activeDetails.github_url || activeDetails.repoUrl || activeDetails.repo_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-[var(--radius-sm)] border hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  >
                    <GithubIcon size={13} />
                    <span>View GitHub Repo</span>
                    <ExternalLink size={11} style={{ color: 'var(--text-muted)' }} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Edit Mode: Ask only for name, short description(optional), Hosted URL, and github repo */
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-5 rounded-[var(--radius-lg)] border space-y-4" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                  Full Stack Project Details
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Provide your deployed application link and code repository for faculty evaluation.
                </p>
              </div>
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

            <div className="space-y-4">
              {/* 1. Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Application / Project Name <span className="text-emerald-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. AI Placement Automation Platform"
                  className="w-full px-3.5 py-2.5 rounded-[var(--radius)] border text-xs focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              {/* 2. Short description (optional) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Short Description
                  </label>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    (Optional)
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="Briefly describe the key features and purpose of your application..."
                  className="w-full px-3.5 py-2 rounded-[var(--radius)] border text-xs focus:outline-none resize-none"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              {/* 3. Hosted URL & 4. GitHub Repo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <URLField
                  label="Hosted URL"
                  value={hostedUrl}
                  onChange={setHostedUrl}
                  placeholder="https://yourapp.vercel.app"
                  previewLabel="Test Link ↗"
                  icon={Globe}
                  optional={false}
                  helperText="Live deployed production website or cloud application"
                />

                <URLField
                  label="GitHub Repo"
                  value={githubUrl}
                  onChange={setGithubUrl}
                  placeholder="https://github.com/username/project"
                  previewLabel="View Repo ↗"
                  icon={GithubIcon}
                  optional={false}
                  helperText="Public repository containing the application source code"
                />
              </div>
            </div>
          </div>

          {/* Dynamic Marks Allocation Card — Never hardcoded! */}
          <div className="p-4 rounded-[var(--radius)] border bg-[var(--bg-card)] space-y-2.5" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} style={{ color: 'var(--green-text)' }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Dynamic Marks Calculation:
                </span>
              </div>
              <span className="text-base font-bold font-mono" style={{ color: 'var(--green-text)' }}>
                +{projectedMarks.toFixed(1)} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/ 5.0 Marks</span>
              </span>
            </div>

            <div className="text-[11px] space-y-1" style={{ color: 'var(--text-muted)' }}>
              <div className="flex items-center gap-1.5">
                {hostedUrl.trim() && githubUrl.trim() ? (
                  <Check size={12} className="text-emerald-500 shrink-0" />
                ) : (
                  <span className="w-3 h-3 inline-block rounded-full border border-dashed shrink-0" style={{ borderColor: 'var(--border)' }} />
                )}
                <span>Hosted URL + GitHub Repo provided: <strong>5.0 Marks</strong> (Full credit)</span>
              </div>
              <div className="flex items-center gap-1.5">
                {(hostedUrl.trim() && !githubUrl.trim()) || (!hostedUrl.trim() && githubUrl.trim()) ? (
                  <Check size={12} className="text-amber-500 shrink-0" />
                ) : (
                  <span className="w-3 h-3 inline-block rounded-full border border-dashed shrink-0" style={{ borderColor: 'var(--border)' }} />
                )}
                <span>Either Hosted URL or GitHub Repo only: <strong>3.0 Marks</strong></span>
              </div>
            </div>
          </div>

          {formError && (
            <div
              className="p-3 rounded-[var(--radius)] text-xs border flex items-center gap-2"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderColor: 'rgba(239, 68, 68, 0.25)',
                color: '#EF4444',
              }}
            >
              <AlertCircle size={14} className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}

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
                Cancel Edit
              </button>
            ) : <div />}

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-[var(--radius)] text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-all hover:opacity-90 disabled:opacity-50"
              style={{
                backgroundColor: 'var(--green)',
                color: '#000000',
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Submitting Application...</span>
                </>
              ) : (
                <span>Submit Full Stack Claim (+{projectedMarks.toFixed(1)}m)</span>
              )}
            </button>
          </div>
        </form>
      )}
    </MetricWorkspaceShell>
  );
}
