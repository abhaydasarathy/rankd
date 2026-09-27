import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  ExternalLink,
  RotateCw,
  Edit3,
  Loader2,
  Code2
} from 'lucide-react';
// Evidence upload disabled — re-enable in future update
import { calculateAcademicsScore, calculateCodingPlatformScore, calculateFsdProjectMarks } from '../utils/scoringEngine';
import { evaluateMembershipClaim, MEMBERSHIP_FORMAT_RULES, upsertStudentSubmission } from '../services';
import { 
  fetchLeetCodeProfile, 
  saveLeetCodeProfile, 
  getExistingLeetCodeProfile, 
  saveLocalMappedLeetCodeUsername, 
  getLocalMappedLeetCodeUsername,
  extractUsername 
} from '../lib/leetcodeService';
import GitHubPanel from './GitHubPanel';

// Automated LeetCode fetch, mapping & sync component for Coding Practice Platform
function CodingPlatformForm({ studentId, submissions = [], onSubmitProof, onSubmitSuccess }) {
  const [mappedUsername, setMappedUsername] = useState('');
  const [inputUsername, setInputUsername] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Live profile data and calculated marks
  const [stats, setStats] = useState(null);
  const [scores, setScores] = useState(null);

  // Initialize and load mapped username or existing profile
  useEffect(() => {
    let isSubscribed = true;

    async function loadInitial() {
      // 1. Try leetcode_profiles table / snapshot
      try {
        const existing = await getExistingLeetCodeProfile(studentId);
        if (isSubscribed && existing?.profile_username) {
          setMappedUsername(existing.profile_username);
          setInputUsername(existing.profile_username);
          if (existing.medium_solved !== undefined || existing.badge_count !== undefined) {
            const loadedStats = {
              username: existing.profile_username,
              profileUrl: existing.profile_url || `https://leetcode.com/u/${existing.profile_username}/`,
              easySolved: existing.easy_solved ?? 0,
              mediumSolved: existing.medium_solved ?? 0,
              hardSolved: existing.hard_solved ?? 0,
              mediumHardSolved: existing.medium_hard_solved ?? ((existing.medium_solved ?? 0) + (existing.hard_solved ?? 0)),
              badgeCount: existing.badge_count ?? 0,
              fetchedAt: existing.fetched_at || existing.last_synced_at,
            };
            setStats(loadedStats);
            setScores(
              calculateCodingPlatformScore({
                badgeCount: loadedStats.badgeCount,
                mediumHardSolved: loadedStats.mediumHardSolved,
              })
            );
          }
          setIsEditing(false);
          return;
        }
      } catch (e) {}

      // 2. Check submissions prop for prior coding-platforms claim
      const prevSub = (submissions || []).find(
        (s) => (s.category_id === 'coding-platforms' || s.categoryId === 'coding-platforms') && (s.details?.profile_username || s.details?.username)
      );
      if (isSubscribed && prevSub?.details) {
        const u = prevSub.details.profile_username || prevSub.details.username;
        if (u) {
          setMappedUsername(u);
          setInputUsername(u);
          saveLocalMappedLeetCodeUsername(studentId, u);
          setStats({
            username: u,
            profileUrl: prevSub.details.profile_url || `https://leetcode.com/u/${u}/`,
            easySolved: prevSub.details.easy_solved ?? 0,
            mediumSolved: prevSub.details.medium_solved ?? 0,
            hardSolved: prevSub.details.hard_solved ?? 0,
            mediumHardSolved: prevSub.details.medium_hard_solved ?? ((prevSub.details.medium_solved ?? 0) + (prevSub.details.hard_solved ?? 0)),
            badgeCount: prevSub.details.badge_count ?? prevSub.details.badges ?? 0,
            fetchedAt: prevSub.details.fetched_at || prevSub.created_at,
          });
          setScores(calculateCodingPlatformScore(prevSub.details));
          setIsEditing(false);
          return;
        }
      }

      // 3. Check local storage mapped username
      const localU = getLocalMappedLeetCodeUsername(studentId);
      if (isSubscribed) {
        if (localU) {
          setMappedUsername(localU);
          setInputUsername(localU);
          setIsEditing(false);
        } else {
          setIsEditing(true);
        }
      }
    }

    if (studentId) {
      loadInitial();
    }

    return () => {
      isSubscribed = false;
    };
  }, [studentId, submissions]);

  // Main sync & fetch handler
  async function handleSync(usernameToSync) {
    const raw = usernameToSync || mappedUsername || inputUsername;
    const clean = extractUsername(raw);

    if (!clean) {
      setError('Please enter a valid LeetCode username.');
      return;
    }

    setSyncing(true);
    setError('');
    setSuccessMsg('');

    try {
      const data = await fetchLeetCodeProfile(clean);
      const calc = calculateCodingPlatformScore({
        badgeCount: data.badgeCount,
        mediumHardSolved: data.mediumHardSolved,
      });

      setStats(data);
      setScores(calc);
      setMappedUsername(data.username);
      setInputUsername(data.username);
      setIsEditing(false);

      // Persist mapped ID to local storage & leetcode_profiles table
      saveLocalMappedLeetCodeUsername(studentId, data.username);
      try {
        await saveLeetCodeProfile({
          studentId,
          profileData: data,
          calculatedScores: calc,
        });
      } catch (err) {
        console.warn('saveLeetCodeProfile notice:', err?.message);
      }

      // Submit verified LeetCode claim for faculty ledger
      const payload = {
        title: `LeetCode — @${data.username} (${data.badgeCount} badges, ${data.mediumHardSolved} M/H solved)`,
        details: {
          platform: 'leetcode',
          profile_username: data.username,
          profile_url: data.profileUrl,
          easy_solved: data.easySolved,
          medium_solved: data.mediumSolved,
          hard_solved: data.hardSolved,
          medium_hard_solved: data.mediumHardSolved,
          badge_count: data.badgeCount,
          badge_marks: calc.badgeMarks,
          difficulty_marks: calc.difficultyMarks,
          calculated_marks: calc.total,
          fetched_at: data.fetchedAt,
          last_synced_at: new Date().toISOString(),
        },
        proofUrl: null, // Evidence upload disabled — re-enable in future update
        proof_url: null,
        awardedMarks: 0, // faculty awards this on verification
        awarded_marks: 0,
        status: 'PENDING',
      };

      if (onSubmitProof) {
        await onSubmitProof('coding-platforms', payload);
      } else {
        await upsertStudentSubmission({
          studentId,
          categoryId: 'coding-platforms',
          title: payload.title,
          details: payload.details,
          proofUrl: payload.proof_url || null,
          calculatedMarks: calc.total,
        });
      }

      setSuccessMsg(`✓ Successfully synced @${data.username} from LeetCode!`);
      onSubmitSuccess?.();
    } catch (err) {
      console.error('LeetCode sync error:', err);
      setError(err.message || 'Failed to sync LeetCode statistics. Check username and try again.');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-4 pt-2 text-xs">
      <div className="flex items-center justify-between">
        <h3
          style={{
            fontSize: '12px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-secondary)',
            margin: 0,
          }}
        >
          LeetCode Verification & Sync
        </h3>
        <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
          Max: 10 Marks
        </span>
      </div>

      {/* Account Mapping State */}
      {mappedUsername && !isEditing ? (
        <div
          className="p-3.5 rounded-[var(--radius)] border space-y-3"
          style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: 'var(--green-text)' }}
              >
                <Code2 size={15} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Mapped Account:
                  </span>
                  <a
                    href={`https://leetcode.com/u/${mappedUsername}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs font-bold hover:underline flex items-center gap-1"
                    style={{ color: '#60A5FA' }}
                  >
                    <span>@{mappedUsername}</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {stats?.fetchedAt ? `Last synced ${new Date(stats.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Mapped to your profile'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setInputUsername(mappedUsername);
                setIsEditing(true);
                setError('');
                setSuccessMsg('');
              }}
              className="px-2.5 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium border cursor-pointer hover:opacity-80 flex items-center gap-1"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border)',
                color: 'var(--text-secondary)',
              }}
              title="Change your mapped LeetCode ID"
            >
              <Edit3 size={11} />
              <span>Edit ID</span>
            </button>
          </div>

          {/* Primary Sync Button */}
          <button
            type="button"
            onClick={() => handleSync(mappedUsername)}
            disabled={syncing}
            className="w-full py-2.5 px-4 rounded-[var(--radius)] font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs text-white"
            style={{
              backgroundColor: 'var(--green)',
              opacity: syncing ? 0.7 : 1,
            }}
          >
            <RotateCw size={13} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Fetching Live LeetCode Stats...' : 'Sync Latest LeetCode Stats'}</span>
          </button>
        </div>
      ) : (
        /* Edit or Initial Input Box */
        <div
          className="p-3.5 rounded-[var(--radius)] border space-y-3"
          style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}
        >
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              LeetCode Username or Profile URL
            </label>
            <p className="text-[10px] m-0 mb-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Your LeetCode ID will be saved and mapped to your student profile to ensure authentic metrics.
            </p>
            <div className="relative">
              <span
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono select-none"
                style={{ color: 'var(--text-muted)' }}
              >
                leetcode.com/u/
              </span>
              <input
                type="text"
                placeholder="username"
                value={inputUsername}
                onChange={(e) => setInputUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSync(inputUsername)}
                className="w-full pl-[105px] pr-2.5 py-1.5 text-xs rounded-[var(--radius)] border outline-none font-mono"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {mappedUsername && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setError('');
                }}
                className="px-3 py-2 rounded-[var(--radius)] text-xs font-medium border cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-muted)',
                }}
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSync(inputUsername)}
              disabled={syncing || !inputUsername.trim()}
              className="flex-1 py-2 px-3 rounded-[var(--radius)] font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 text-white"
              style={{
                backgroundColor: 'var(--green)',
                opacity: syncing || !inputUsername.trim() ? 0.6 : 1,
              }}
            >
              <RotateCw size={13} className={syncing ? 'animate-spin' : ''} />
              <span>{syncing ? 'Mapping & Fetching...' : mappedUsername ? 'Save New ID & Sync' : 'Map ID & Fetch Stats'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Feedback alerts */}
      {error && (
        <div
          className="p-2.5 rounded text-xs border flex items-center gap-2 animate-in fade-in"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            borderColor: 'rgba(239, 68, 68, 0.25)',
            color: '#EF4444',
          }}
        >
          <AlertCircle size={13} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div
          className="p-2.5 rounded text-xs border flex items-center gap-2 animate-in fade-in"
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            borderColor: 'rgba(16, 185, 129, 0.25)',
            color: 'var(--green-text)',
          }}
        >
          <CheckCircle2 size={13} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Verified Stats Display */}
      {stats && (
        <div
          className="p-3.5 rounded-[var(--radius)] border space-y-3 animate-in fade-in"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Verified LeetCode Statistics:
            </span>
            <span
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded"
              style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: 'var(--green-text)' }}
            >
              <ShieldCheck size={11} />
              <span>API Verified</span>
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center font-mono">
            <div className="p-2 rounded border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
              <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Easy</div>
              <div className="font-bold text-xs" style={{ color: '#10B981' }}>{stats.easySolved ?? 0}</div>
            </div>
            <div className="p-2 rounded border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
              <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Medium</div>
              <div className="font-bold text-xs" style={{ color: '#F59E0B' }}>{stats.mediumSolved ?? 0}</div>
            </div>
            <div className="p-2 rounded border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
              <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Hard</div>
              <div className="font-bold text-xs" style={{ color: '#EF4444' }}>{stats.hardSolved ?? 0}</div>
            </div>
            <div className="p-2 rounded border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
              <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Badges</div>
              <div className="font-bold text-xs" style={{ color: '#60A5FA' }}>{stats.badgeCount ?? 0}</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] px-1" style={{ color: 'var(--text-secondary)' }}>
            <span>Medium + Hard Solved:</span>
            <b className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>
              {stats.mediumHardSolved ?? ((stats.mediumSolved || 0) + (stats.hardSolved || 0))} questions
            </b>
          </div>
        </div>
      )}

      {/* Rubric Score Breakdown Card */}
      {scores && (
        <div
          className="p-3.5 rounded-[var(--radius)] border space-y-2.5 animate-in fade-in"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              Rubric Calculation Preview
            </span>
            <span className="font-mono text-xs font-bold" style={{ color: 'var(--green-text)' }}>
              {scores.total} / 10 Marks
            </span>
          </div>

          {/* Badges score bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              <span>Badge Score (Max 5m)</span>
              <span className="font-mono font-semibold">{scores.badgeMarks} / 5m</span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(scores.badgeMarks / 5) * 100}%`,
                  backgroundColor: 'var(--green-bar)',
                }}
              />
            </div>
          </div>

          {/* Difficulty score bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              <span>Difficulty Score (Medium + Hard, Max 5m)</span>
              <span className="font-mono font-semibold">{scores.difficultyMarks} / 5m</span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(scores.difficultyMarks / 5) * 100}%`,
                  backgroundColor: 'var(--amber-bar)',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CategorySheet({
  category,
  submissions = [],
  verifiedScore = 0,
  isOpen,
  onClose,
  onSubmitProof,
  studentId,
  studentProfile = null,
}) {
  const [submissionTitle, setSubmissionTitle] = useState('');
  const [comments, setComments] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Micro-interaction 1: Verified badge pulse tracking on real state change (PENDING -> VERIFIED)
  const [pulsingSubmissionIds, setPulsingSubmissionIds] = useState(new Set());
  const prevSubmissionsRef = useRef(null);
  const [isHeaderBadgePulsing, setIsHeaderBadgePulsing] = useState(false);
  const prevOverallStatusRef = useRef(null);

  // Category specific fields
  const [tenthPct, setTenthPct] = useState('');
  const [twelfthPct, setTwelfthPct] = useState('');
  const [cgpa, setCgpa] = useState('');

  const [companyName, setCompanyName] = useState('');
  const [internshipTier, setInternshipTier] = useState('Fortune 500');
  const [durationMonths, setDurationMonths] = useState('3');
  const [isPaid, setIsPaid] = useState(false);

  const [certProvider, setCertProvider] = useState('CISCO');
  const [certName, setCertName] = useState('');

  const [projectType, setProjectType] = useState('WEB');

  const [frontendTech, setFrontendTech] = useState('React');
  const [backendTech, setBackendTech] = useState('Node.js / Express');
  const [databaseTech, setDatabaseTech] = useState('PostgreSQL');
  const [fsdDescription, setFsdDescription] = useState('');
  const [fsdHostedUrl, setFsdHostedUrl] = useState('');
  const [fsdGithubUrl, setFsdGithubUrl] = useState('');

  const [prizePlacement, setPrizePlacement] = useState('1st Prize');

  const [facultyMentor, setFacultyMentor] = useState('');
  const [universityName, setUniversityName] = useState('SRMIST');

  const [membershipOrg, setMembershipOrg] = useState('IEEE');
  const [membershipId, setMembershipId] = useState('');
  const [membershipUrl, setMembershipUrl] = useState('');
  const [membershipEval, setMembershipEval] = useState(null);

  const [assessmentType, setAssessmentType] = useState('SHL');
  const [rawAssessmentScore, setRawAssessmentScore] = useState('88');

  // Animation 7: Drawer slide-in & exit states
  const [isClosing, setIsClosing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setIsMounted(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isClosing]);

  const isDrawerOpen = isMounted && isOpen && !isClosing;

  useEffect(() => {
    if (category) {
      setSubmissionTitle('');
      setComments('');
      setUploadError('');
      setIsSubmitting(false);
      setSubmitSuccess(false);
      setCompanyName('');
      setCertName('');
      setFacultyMentor('');
      setMembershipId('');
      setMembershipUrl('');
      setMembershipEval(null);

      if (category.id === 'academics' && studentProfile) {
        const t = studentProfile.tenthPct ?? studentProfile.tenth_pct;
        const tw = studentProfile.twelfthPct ?? studentProfile.twelfth_pct;
        const c = studentProfile.cgpa;

        setTenthPct(t !== undefined && t !== null && Number(t) > 0 ? String(t) : '');
        setTwelfthPct(tw !== undefined && tw !== null && Number(tw) > 0 ? String(tw) : '');
        setCgpa(c !== undefined && c !== null && Number(c) > 0 ? String(c) : '');
      }

      if (category.id === 'membership') {
        const memSub = submissions.find(
          (s) => s.category_id === 'membership' || s.categoryId === 'membership'
        );
        if (memSub?.details) {
          const d = memSub.details;
          if (d.org || d.organization) setMembershipOrg(d.org || d.organization);
          if (d.membershipId || d.membership_id) setMembershipId(d.membershipId || d.membership_id);
          if (d.credentialUrl || d.credential_url) setMembershipUrl(d.credentialUrl || d.credential_url);
        }
      }
    }
  }, [category, studentProfile, submissions]);

  // Live evaluation for Professional Membership credentials & chapter roster
  useEffect(() => {
    if (category?.id === 'membership') {
      let isSubscribed = true;
      evaluateMembershipClaim({
        organization: membershipOrg,
        membershipId,
        credentialUrl: membershipUrl,
        regNo: studentProfile?.reg_no || studentProfile?.regNo,
        studentName: studentProfile?.name || studentProfile?.fullName,
      }).then((result) => {
        if (isSubscribed) {
          setMembershipEval(result);
        }
      });
      return () => {
        isSubscribed = false;
      };
    }
  }, [category?.id, membershipOrg, membershipId, membershipUrl, studentProfile]);

  // Live score calculation for Academics form
  const liveAcademics = useMemo(() => {
    if (category?.id !== 'academics') return null;
    const t = parseFloat(tenthPct) || 0;
    const tw = parseFloat(twelfthPct) || 0;
    const c = parseFloat(cgpa) || 0;
    return calculateAcademicsScore(t, tw, c);
  }, [category?.id, tenthPct, twelfthPct, cgpa]);

  const maxMarks = category?.maxMarks || 10;
  const hasVerified = verifiedScore > 0;
  const hasPending = (submissions || []).some(
    (s) => s.status === 'PENDING' || s.status === 'Pending'
  );

  // Micro-interaction 1: Detect real submission status transition: PENDING -> VERIFIED
  useEffect(() => {
    if (prevSubmissionsRef.current !== null) {
      const newlyVerified = new Set();
      (submissions || []).forEach((sub) => {
        const prevStatus = (prevSubmissionsRef.current[sub.id] || '').toUpperCase();
        const currStatus = (sub.status || '').toUpperCase();
        if (prevStatus && prevStatus !== 'VERIFIED' && currStatus === 'VERIFIED') {
          newlyVerified.add(sub.id);
        }
      });

      if (newlyVerified.size > 0) {
        setPulsingSubmissionIds(newlyVerified);
        const timer = setTimeout(() => {
          setPulsingSubmissionIds(new Set());
        }, 450);
        return () => clearTimeout(timer);
      }
    }

    const map = {};
    (submissions || []).forEach((sub) => {
      map[sub.id] = (sub.status || '').toUpperCase();
    });
    prevSubmissionsRef.current = map;
  }, [submissions]);

  // Detect category overall status transition to VERIFIED
  useEffect(() => {
    const currentStatus = hasVerified ? 'VERIFIED' : hasPending ? 'PENDING' : 'UNCLAIMED';
    if (prevOverallStatusRef.current !== null) {
      if (prevOverallStatusRef.current !== 'VERIFIED' && currentStatus === 'VERIFIED') {
        setIsHeaderBadgePulsing(true);
        const timer = setTimeout(() => {
          setIsHeaderBadgePulsing(false);
        }, 450);
        return () => clearTimeout(timer);
      }
    }
    prevOverallStatusRef.current = currentStatus;
  }, [hasVerified, hasPending]);

  if (!isOpen || !category) return null;

  const isCodingPlatform = category.id === 'coding-platforms';
  const isGitHub = category.id === 'github';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (category.id === 'internship' && !companyName.trim()) {
      setUploadError('Company name is required.');
      return;
    }
    if (category.id === 'skillset' && !certName.trim()) {
      setUploadError('Certification / Course name is required.');
      return;
    }
    if (category.id === 'membership') {
      if (!membershipId.trim() && !membershipUrl.trim()) {
        setUploadError('Please enter your Membership ID or Digital Credential URL.');
        return;
      }
      const formatCheck = validateMembershipFormat(membershipOrg, membershipId);
      if (!formatCheck.isValid && !membershipUrl.trim()) {
        setUploadError(formatCheck.message);
        return;
      }
    }

    setIsSubmitting(true);
    setUploadError('');

    try {
      // Evidence upload disabled — re-enable in future update
      const proofDocUrl = null;

      let title = submissionTitle || `${category.title} Submission`;
      let detailsObj = {};

      switch (category.id) {
        case 'academics': {
          const t = parseFloat(tenthPct) || 0;
          const tw = parseFloat(twelfthPct) || 0;
          const c = parseFloat(cgpa) || 0;
          const calc = calculateAcademicsScore(t, tw, c);
          title = `Academics (10th: ${t}%, 12th: ${tw}%, CGPA: ${c})`;
          detailsObj = {
            tenthPct: t,
            twelfthPct: tw,
            cgpa: c,
            tenth_pct: t,
            twelfth_pct: tw,
            calculated_marks: calc.score,
          };
          break;
        }
        case 'github':
          title = 'GitHub Activity Claim';
          detailsObj = {};
          break;
        case 'coding-platforms':
          title = 'Coding Platform Claim';
          detailsObj = {};
          break;
        case 'internship':
          title = `${companyName} (${internshipTier}) - ${durationMonths} Mos`;
          detailsObj = {
            company: companyName,
            companyName: companyName,
            tier: internshipTier,
            duration: Number(durationMonths),
            durationMonths: Number(durationMonths),
            isPaid,
          };
          break;
        case 'skillset':
          title = `${certName} (${certProvider})`;
          detailsObj = {
            provider: certProvider,
            name: certName,
            certName: certName,
            title: certName,
          };
          break;
        case 'projects':
          title = `${submissionTitle || 'Project'} (${projectType})`;
          detailsObj = {
            title: submissionTitle || 'Project',
            projectType,
            type: projectType,
          };
          break;
        case 'fullstack':
          title = `${submissionTitle || 'Full Stack App'} (Full Stack Experience)`;
          const fsdMarks = calculateFsdProjectMarks({
            name: submissionTitle,
            hostedUrl: fsdHostedUrl,
            githubUrl: fsdGithubUrl,
            description: fsdDescription,
          });
          detailsObj = {
            name: submissionTitle || 'Full Stack App',
            title: submissionTitle || 'Full Stack App',
            description: fsdDescription.trim(),
            shortDescription: fsdDescription.trim(),
            short_description: fsdDescription.trim(),
            hostedUrl: fsdHostedUrl.trim(),
            hosted_url: fsdHostedUrl.trim(),
            liveUrl: fsdHostedUrl.trim(),
            live_url: fsdHostedUrl.trim(),
            githubUrl: fsdGithubUrl.trim(),
            github_url: fsdGithubUrl.trim(),
            repoUrl: fsdGithubUrl.trim(),
            repo_url: fsdGithubUrl.trim(),
            calculated_marks: fsdMarks,
            frontend: 'Full Stack Web App',
            backend: 'API Service',
            database: 'Database',
          };
          break;
        case 'hackathons':
          title = `${submissionTitle || 'Hackathon'} (${prizePlacement})`;
          detailsObj = {
            title: submissionTitle || 'Hackathon',
            prize: prizePlacement,
            placement: prizePlacement,
          };
          break;
        case 'inhouse-projects':
          title = `${submissionTitle || 'In-House Project'} under ${facultyMentor || 'SRM Faculty'}`;
          detailsObj = {
            title: submissionTitle || 'In-House Project',
            faculty: facultyMentor,
            mentor: facultyMentor,
            facultyMentor: facultyMentor,
            university: universityName,
          };
          break;
        case 'membership': {
          const evalResult = await evaluateMembershipClaim({
            organization: membershipOrg,
            membershipId,
            credentialUrl: membershipUrl,
            regNo: studentProfile?.reg_no || studentProfile?.regNo,
            studentName: studentProfile?.name || studentProfile?.fullName,
          });

          title = `${membershipOrg} Member (ID: ${membershipId || 'Active'})`;
          detailsObj = {
            org: membershipOrg,
            organization: membershipOrg,
            membershipId: (membershipId || '').trim(),
            membership_id: (membershipId || '').trim(),
            credentialUrl: (membershipUrl || '').trim(),
            credential_url: (membershipUrl || '').trim(),
            calculated_marks: 2,
            systemVerification: evalResult,
          };
          break;
        }
        case 'assessments':
          title = `${assessmentType} Assessment (${rawAssessmentScore} / 100)`;
          detailsObj = {
            rawScore: Number(rawAssessmentScore),
            score: Number(rawAssessmentScore),
            raw_score: Number(rawAssessmentScore),
            assessmentType,
          };
          break;
        default:
          title = submissionTitle || `${category.title} Claim`;
          detailsObj = {};
      }

      const newSubmission = {
        title,
        details: detailsObj,
        proof_url: null, // Evidence upload disabled — re-enable in future update
        proofUrl: null,
        category_id: category.id,
      };

      await onSubmitProof(category.id, newSubmission);
      setSubmitSuccess(true);
      setTimeout(() => {
        handleClose();
        setSubmitSuccess(false);
      }, 1500);
    } catch (err) {
      console.error(err);
      setUploadError('Failed to process submission. Please retry.');
      setSubmitSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
      {/* Backdrop */}
      <div
        className={`drawer-backdrop fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity ${isDrawerOpen ? 'open' : ''}`}
        onClick={handleClose}
      />

      {/* Drawer Container (width: 480px) */}
      <div
        className={`category-drawer glass-category-drawer relative w-full max-w-[480px] h-full flex flex-col overflow-y-auto z-10 ${
          isDrawerOpen ? 'open' : ''
        }`}
        style={{
          color: 'var(--text-primary)',
        }}
      >
        <div className="drawer-content flex flex-col flex-1">
        {/* Drawer Header (Stagger 1: 0ms delay) */}
        <div
          className="drawer-stagger-1 glass-drawer-header p-6 flex items-start justify-between gap-4 sticky top-0 z-10"
        >
          <div>
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: '0 0 6px 0',
              }}
            >
              {category.title}
            </h2>

            {/* Large Score Display with Inline Badge (Stagger 2: 80ms delay) */}
            <div className="drawer-stagger-2 flex items-center gap-3">
              <span
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  lineHeight: 1,
                }}
              >
                {verifiedScore} <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>/ {maxMarks}</span>
              </span>

              {hasVerified && !hasPending && (
                <span
                  className={`status-badge ${isHeaderBadgePulsing ? 'badge-pulse-verified' : ''}`}
                  style={{
                    backgroundColor: 'var(--green-light)',
                    color: 'var(--green-text)',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: 500,
                  }}
                >
                  Verified
                </span>
              )}
              {hasPending && (
                <span
                  className="status-badge"
                  style={{
                    backgroundColor: 'var(--amber-light)',
                    color: 'var(--amber-text)',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: 500,
                  }}
                >
                  Pending Review
                </span>
              )}
              {!hasVerified && !hasPending && (
                <span
                  className="status-badge"
                  style={{
                    backgroundColor: 'var(--gray-badge-bg)',
                    color: 'var(--gray-badge-text)',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: 500,
                  }}
                >
                  Unclaimed
                </span>
              )}
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '6px 0 0 0' }}>
              {category.rubricText}
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded cursor-pointer hover:opacity-75 transition-opacity"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Body Content */}
        <div className="p-6 space-y-6 flex-1 text-xs">
          
          {/* Submissions Breakdown Table (Stagger 3: 160ms delay) */}
          <div className="drawer-stagger-3">
            <h3
              style={{
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-secondary)',
                marginBottom: '10px',
              }}
            >
              Logged Submissions ({submissions.length})
            </h3>

            {submissions.length > 0 ? (
              <div
                className="rounded-[var(--radius)] overflow-hidden border"
                style={{ borderColor: 'var(--border)' }}
              >
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-input)' }}>
                      <th className="py-2 px-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Item</th>
                      <th className="py-2 px-3 text-center font-semibold w-16" style={{ color: 'var(--text-secondary)' }}>Marks</th>
                      <th className="py-2 px-3 text-right font-semibold w-24" style={{ color: 'var(--text-secondary)' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((item, idx) => (
                      <tr
                        key={item.id || idx}
                        style={{
                          borderBottom: idx < submissions.length - 1 ? '1px solid var(--border)' : 'none',
                        }}
                      >
                        <td className="py-2.5 px-3">
                          <span className="font-semibold block" style={{ color: 'var(--text-primary)' }}>
                            {item.title}
                          </span>
                          {item.details?.systemVerification && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded"
                                style={{
                                  backgroundColor:
                                    item.details.systemVerification.badgeType === 'green'
                                      ? 'rgba(16, 185, 129, 0.12)'
                                      : item.details.systemVerification.badgeType === 'blue'
                                      ? 'rgba(59, 130, 246, 0.12)'
                                      : item.details.systemVerification.badgeType === 'red'
                                      ? 'rgba(239, 68, 68, 0.12)'
                                      : 'rgba(245, 158, 11, 0.12)',
                                  color:
                                    item.details.systemVerification.badgeType === 'green'
                                      ? 'var(--green-text)'
                                      : item.details.systemVerification.badgeType === 'blue'
                                      ? '#60A5FA'
                                      : item.details.systemVerification.badgeType === 'red'
                                      ? '#EF4444'
                                      : 'var(--amber-text)',
                                }}
                              >
                                <ShieldCheck size={11} />
                                <span>{item.details.systemVerification.badgeText}</span>
                              </span>
                              {(item.details.credentialUrl || item.details.credential_url) && (
                                <a
                                  href={item.details.credentialUrl || item.details.credential_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-0.5 text-[10px] hover:underline"
                                  style={{ color: '#60A5FA' }}
                                >
                                  <ExternalLink size={10} />
                                  <span>Credential</span>
                                </a>
                              )}
                            </div>
                          )}
                          {item.verifier_notes && (
                            <span className="text-[10px] italic block mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              Note: {item.verifier_notes}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                          {(item.status === 'VERIFIED' || item.status === 'Verified') ? (
                            <span style={{ color: 'var(--green-text)' }}>
                              +{item.awarded_marks || item.awardedMarks || item.details?.calculated_marks || 0}
                            </span>
                          ) : (item.status === 'REJECTED' || item.status === 'Rejected') ? (
                            <span style={{ color: '#EF4444' }}>0</span>
                          ) : (
                            <span style={{ color: 'var(--amber-text)' }} title="Claimed marks pending faculty evaluation">
                              {Number(item.details?.calculated_marks ?? item.awarded_marks ?? item.awardedMarks ?? 0)}m
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={pulsingSubmissionIds.has(item.id) ? 'badge-pulse-verified' : ''}
                            style={{
                              backgroundColor:
                                item.status === 'VERIFIED' || item.status === 'Verified'
                                  ? 'var(--green-light)'
                                  : item.status === 'REJECTED' || item.status === 'Rejected'
                                  ? 'rgba(239, 68, 68, 0.1)'
                                  : 'var(--amber-light)',
                              color:
                                item.status === 'VERIFIED' || item.status === 'Verified'
                                  ? 'var(--green-text)'
                                  : item.status === 'REJECTED' || item.status === 'Rejected'
                                  ? '#EF4444'
                                  : 'var(--amber-text)',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              fontSize: '10px',
                              fontWeight: 500,
                            }}
                          >
                            {item.status || 'PENDING'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div
                className="p-4 rounded-[var(--radius)] text-center border"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-muted)',
                }}
              >
                No claims submitted yet for this category.
              </div>
            )}
          </div>

          {/* Coding Platform Form, GitHub Panel, or Generic Submission Form (Stagger 4: 240ms delay) */}
          <div className="drawer-stagger-4">
            {isCodingPlatform ? (
              <CodingPlatformForm
                studentId={studentId}
                submissions={submissions}
                onSubmitProof={onSubmitProof}
                onSubmitSuccess={handleClose}
              />
            ) : isGitHub ? (
              <GitHubPanel
                studentId={studentId}
                onSubmitProof={onSubmitProof}
                onSubmitSuccess={handleClose}
              />
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <h3
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-secondary)',
                  margin: 0,
                }}
              >
                Submit New Evidence
              </h3>

              {uploadError && (
                <div
                  className="p-2.5 rounded text-xs border flex items-center gap-2"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    borderColor: 'rgba(239, 68, 68, 0.25)',
                    color: '#EF4444',
                  }}
                >
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Category Specific Input Fields */}
              {category.id === 'academics' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                        10th Mark (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="e.g. 95.0"
                        value={tenthPct}
                        onChange={(e) => setTenthPct(e.target.value)}
                        className="w-full px-2.5 py-2 text-xs rounded-[var(--radius)] border outline-none font-medium"
                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                      <span className="text-[10px] block mt-1" style={{ color: 'var(--green-text)', fontWeight: 500 }}>
                        +{liveAcademics?.breakdown?.tenthMarks || 0} / 2.5m
                      </span>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                        12th Mark (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="e.g. 92.0"
                        value={twelfthPct}
                        onChange={(e) => setTwelfthPct(e.target.value)}
                        className="w-full px-2.5 py-2 text-xs rounded-[var(--radius)] border outline-none font-medium"
                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                      <span className="text-[10px] block mt-1" style={{ color: 'var(--green-text)', fontWeight: 500 }}>
                        +{liveAcademics?.breakdown?.twelfthMarks || 0} / 2.5m
                      </span>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                        Current CGPA
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        placeholder="e.g. 9.25"
                        value={cgpa}
                        onChange={(e) => setCgpa(e.target.value)}
                        className="w-full px-2.5 py-2 text-xs rounded-[var(--radius)] border outline-none font-medium"
                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                      <span className="text-[10px] block mt-1" style={{ color: 'var(--green-text)', fontWeight: 500 }}>
                        +{liveAcademics?.breakdown?.cgpaMarks || 0} / 5.0m
                      </span>
                    </div>
                  </div>

                  {/* Live Rubric Score Summary Card with Smooth Width & Number Transition */}
                  <div
                    className="p-3 rounded-[var(--radius)] border space-y-2"
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold block" style={{ color: 'var(--text-primary)' }}>
                          Calculated Rubric Score
                        </span>
                        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          10th ({liveAcademics?.breakdown?.tenthMarks || 0}m) + 12th ({liveAcademics?.breakdown?.twelfthMarks || 0}m) + CGPA ({liveAcademics?.breakdown?.cgpaMarks || 0}m)
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-bold transition-all duration-200" style={{ color: 'var(--green-text)' }}>
                          {liveAcademics?.score || 0}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}> / 10 Marks</span>
                      </div>
                    </div>

                    {/* Subtle live score progress preview bar */}
                    <div
                      style={{
                        height: '4px',
                        borderRadius: '2px',
                        backgroundColor: 'var(--border)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(100, ((liveAcademics?.score || 0) / 10) * 100)}%`,
                          height: '100%',
                          backgroundColor: 'var(--green-bar)',
                          borderRadius: '2px',
                          transition: 'width 250ms cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}



            {category.id === 'internship' && (
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Company / Org Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cisco Systems, Google, FinTech Corp"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-[var(--radius)] border outline-none"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Company Tier</label>
                    <select
                      value={internshipTier}
                      onChange={(e) => setInternshipTier(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-[var(--radius)] border outline-none"
                      style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    >
                      <option value="Fortune 500">Fortune 500 (4m)</option>
                      <option value="IIT/NIT/SRM">IIT / NIT / SRM Placement (5m)</option>
                      <option value="Small / Mid Co">Startup / Small Co (3m)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Duration (Months)</label>
                    <input
                      type="number"
                      value={durationMonths}
                      onChange={(e) => setDurationMonths(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-[var(--radius)] border outline-none"
                      style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={isPaid}
                    onChange={(e) => setIsPaid(e.target.checked)}
                    className="accent-green-600 rounded"
                  />
                  <span style={{ color: 'var(--text-secondary)' }}>Stipend / Paid Internship (+1 Mark)</span>
                </label>
              </div>
            )}

            {category.id === 'skillset' && (
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Certificate Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AWS Solutions Architect, CCNA"
                    value={certName}
                    onChange={(e) => setCertName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-[var(--radius)] border outline-none"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Accreditation Body</label>
                  <select
                    value={certProvider}
                    onChange={(e) => setCertProvider(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-[var(--radius)] border outline-none"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  >
                    <option value="CISCO">CISCO / IBM (5m)</option>
                    <option value="NPTEL">NPTEL Elite (3m)</option>
                    <option value="Coursera">Coursera / Google (2m)</option>
                    <option value="Programming">Technical Programming (1m)</option>
                  </select>
                </div>
              </div>
            )}

            {category.id === 'projects' && (
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Project Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Distributed Consensus Engine"
                    value={submissionTitle}
                    onChange={(e) => setSubmissionTitle(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-[var(--radius)] border outline-none"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Project Scope</label>
                  <select
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-[var(--radius)] border outline-none"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  >
                    <option value="IIT/DRDO">IIT / DRDO / ISRO Sponsored (5m)</option>
                    <option value="GOVT">Govt Agency / Industry Sponsored (4m)</option>
                    <option value="WEB">Web / Mobile Production Application (3m)</option>
                    <option value="MINI">Course Mini Project (1-2m)</option>
                  </select>
                </div>
              </div>
            )}

            {category.id === 'fullstack' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Application / Project Name <span className="text-emerald-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AI Placement Automation Platform"
                    value={submissionTitle}
                    onChange={(e) => setSubmissionTitle(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-[var(--radius)] border outline-none"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Short Description</label>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>(Optional)</span>
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Brief description of application features..."
                    value={fsdDescription}
                    onChange={(e) => setFsdDescription(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-[var(--radius)] border outline-none resize-none"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Hosted URL</label>
                  <input
                    type="url"
                    placeholder="https://yourapp.vercel.app"
                    value={fsdHostedUrl}
                    onChange={(e) => setFsdHostedUrl(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-[var(--radius)] border outline-none font-mono"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>GitHub Repo</label>
                  <input
                    type="url"
                    placeholder="https://github.com/username/project"
                    value={fsdGithubUrl}
                    onChange={(e) => setFsdGithubUrl(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-[var(--radius)] border outline-none font-mono"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
            )}

            {category.id === 'hackathons' && (
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Hackathon / Competition Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Smart India Hackathon 2024"
                    value={submissionTitle}
                    onChange={(e) => setSubmissionTitle(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-[var(--radius)] border outline-none"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Placement Result</label>
                  <select
                    value={prizePlacement}
                    onChange={(e) => setPrizePlacement(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-[var(--radius)] border outline-none"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  >
                    <option value="1st Prize">1st Prize Winner (5m)</option>
                    <option value="2nd Prize">2nd Prize Winner (4m)</option>
                    <option value="3rd Prize">3rd Prize Winner (3m)</option>
                    <option value="Participation">Finalist / Participation (1m)</option>
                  </select>
                </div>
              </div>
            )}

            {category.id === 'inhouse-projects' && (
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>In-House R&D Project Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Campus Placement Automation Engine"
                    value={submissionTitle}
                    onChange={(e) => setSubmissionTitle(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-[var(--radius)] border outline-none"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Faculty Mentor Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. K. R. Venkatesh"
                    value={facultyMentor}
                    onChange={(e) => setFacultyMentor(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-[var(--radius)] border outline-none"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
            )}

            {category.id === 'membership' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Professional Body
                  </label>
                  <select
                    value={membershipOrg}
                    onChange={(e) => setMembershipOrg(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-[var(--radius)] border outline-none"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  >
                    <option value="IEEE">IEEE (Institute of Electrical and Electronics Engineers) • 2m</option>
                    <option value="ACM">ACM (Association for Computing Machinery) • 2m</option>
                    <option value="CSI">CSI (Computer Society of India) • 2m</option>
                    <option value="IET">IET (Institution of Engineering and Technology) • 2m</option>
                    <option value="ISTE">ISTE (Indian Society for Technical Education) • 2m</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      Membership ID / Roll Number
                    </label>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {MEMBERSHIP_FORMAT_RULES[membershipOrg]?.hint}
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder={MEMBERSHIP_FORMAT_RULES[membershipOrg]?.placeholder || "e.g. 98421004"}
                    value={membershipId}
                    onChange={(e) => setMembershipId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-[var(--radius)] border outline-none font-mono"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Digital Credential / Badge Link (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="e.g. https://www.credly.com/badges/... or https://badges.ieee.org/..."
                    value={membershipUrl}
                    onChange={(e) => setMembershipUrl(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-[var(--radius)] border outline-none font-mono text-[11px]"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>

                {/* Real-time Verification Feedback Card */}
                {membershipEval && (membershipId.trim() || membershipUrl.trim()) && (
                  <div
                    className="p-3 rounded-[var(--radius)] border flex flex-col gap-1.5 transition-all"
                    style={{
                      backgroundColor:
                        membershipEval.badgeType === 'green'
                          ? 'rgba(16, 185, 129, 0.08)'
                          : membershipEval.badgeType === 'blue'
                          ? 'rgba(59, 130, 246, 0.08)'
                          : membershipEval.badgeType === 'red'
                          ? 'rgba(239, 68, 68, 0.08)'
                          : 'rgba(245, 158, 11, 0.08)',
                      borderColor:
                        membershipEval.badgeType === 'green'
                          ? 'rgba(16, 185, 129, 0.25)'
                          : membershipEval.badgeType === 'blue'
                          ? 'rgba(59, 130, 246, 0.25)'
                          : membershipEval.badgeType === 'red'
                          ? 'rgba(239, 68, 68, 0.25)'
                          : 'rgba(245, 158, 11, 0.25)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck
                          size={14}
                          style={{
                            color:
                              membershipEval.badgeType === 'green'
                                ? 'var(--green-text)'
                                : membershipEval.badgeType === 'blue'
                                ? '#60A5FA'
                                : membershipEval.badgeType === 'red'
                                ? '#EF4444'
                                : 'var(--amber-text)',
                          }}
                        />
                        <span
                          className="text-xs font-semibold"
                          style={{
                            color:
                              membershipEval.badgeType === 'green'
                                ? 'var(--green-text)'
                                : membershipEval.badgeType === 'blue'
                                ? '#60A5FA'
                                : membershipEval.badgeType === 'red'
                                ? '#EF4444'
                                : 'var(--amber-text)',
                          }}
                        >
                          {membershipEval.badgeText}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        Rubric: 2.0m
                      </span>
                    </div>

                    <p className="text-[11px] m-0 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {membershipEval.verificationNotes}
                    </p>
                  </div>
                )}
              </div>
            )}

            {category.id === 'assessments' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Test Provider</label>
                  <select
                    value={assessmentType}
                    onChange={(e) => setAssessmentType(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-[var(--radius)] border outline-none"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  >
                    <option value="SHL">SHL Diagnostic</option>
                    <option value="Talent">Talent Assessment</option>
                    <option value="NCET">NCET Placement Test</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Raw Score / 100</label>
                  <input
                    type="number"
                    max="100"
                    value={rawAssessmentScore}
                    onChange={(e) => setRawAssessmentScore(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-[var(--radius)] border outline-none"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
            )}

            {/* General Submission Title if not set */}
            {!['academics', 'projects', 'fullstack', 'hackathons', 'inhouse-projects', 'internship', 'skillset', 'membership', 'coding-platforms', 'coding_practice'].includes(category.id) && (
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Claim Title</label>
                <input
                  type="text"
                  placeholder="e.g. Certificate or Evidence Claim"
                  value={submissionTitle}
                  onChange={(e) => setSubmissionTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-[var(--radius)] border outline-none"
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
            )}

            {/* Evidence upload disabled — re-enable in future update */}

            {/* Context Notes */}
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Context Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Reference links, verification notes, or registration IDs..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-[var(--radius)] border outline-none resize-none"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* Submit Button: full width, background: var(--green), white text */}
            <button
              type="submit"
              disabled={isSubmitting || submitSuccess}
              className="w-full font-semibold text-xs tracking-wide transition-all cursor-pointer disabled:opacity-75 flex items-center justify-center gap-2"
              style={{
                backgroundColor: submitSuccess ? 'var(--green-bar)' : 'var(--green)',
                color: '#FFFFFF',
                borderRadius: 'var(--radius)',
                padding: '11px',
                border: 'none',
                transform: submitSuccess ? 'scale(1.02)' : 'none',
              }}
            >
              {submitSuccess ? (
                <>
                  <CheckCircle2 size={16} className="text-white" />
                  <span>✓ Submitted</span>
                </>
              ) : isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin text-white" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>
                    {category.id === 'academics'
                      ? 'Update Academics & Calculate Score'
                      : 'Submit for Verification'}
                  </span>
                </>
              )}
            </button>
          </form>
          )}
          </div>
        </div>
      </div>
    </div>
  </div>
);
}
