import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, 
  X, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  ShieldCheck, 
  Clock, 
  Award, 
  Code2, 
  Briefcase, 
  GraduationCap, 
  Layers, 
  Trophy, 
  Building2, 
  CheckSquare, 
  FolderGit2,
  Users,
  ChevronRight,
  Sparkles,
  AlertCircle,
  FileText,
  Globe
} from 'lucide-react';
import { calculateTotalScore } from '../utils/scoringEngine';

// Inline GitHub SVG icon
function GithubIcon({ size = 16, className, style }) {
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
      className={className}
      style={{ width: `${size}px`, height: `${size}px`, flexShrink: 0, ...style }}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

// Canonical category metadata for headers, badges, and max marks
const CATEGORY_META = {
  'coding-platforms': { name: 'Coding Practice Platform', maxMarks: 10, icon: Code2 },
  'github': { name: 'GitHub Activity', maxMarks: 15, icon: GithubIcon },
  'academics': { name: 'Academics & CGPA', maxMarks: 10, icon: GraduationCap },
  'internship': { name: 'Internship Experience', maxMarks: 10, icon: Briefcase },
  'skillset': { name: 'Skillset & Certifications', maxMarks: 10, icon: Award },
  'projects': { name: 'Technical Projects', maxMarks: 10, icon: FolderGit2 },
  'fullstack': { name: 'Full Stack Web & Mobile', maxMarks: 10, icon: Layers },
  'hackathons': { name: 'Hackathons & Competitions', maxMarks: 10, icon: Trophy },
  'inhouse-projects': { name: 'In-House Projects', maxMarks: 10, icon: Building2 },
  'membership': { name: 'Professional Society Membership', maxMarks: 5, icon: ShieldCheck },
  'assessments': { name: 'Diagnostic Assessments', maxMarks: 10, icon: CheckSquare },
};

// Friendly labels for details JSONB keys
const FIELD_LABELS = {
  badge_count: 'Badges Earned',
  badges: 'Badges Earned',
  medium_hard_solved: 'Medium + Hard Solved',
  solved: 'Medium + Hard Solved',
  badge_marks: 'Badge Marks',
  difficulty_marks: 'Difficulty Marks',
  calculated_marks: 'Calculated Score',
  reposLastYear: 'Repos (Past Year)',
  repos_last_year: 'Repos (Past Year)',
  avgMonthlyFrequency: 'Monthly Commit Frequency',
  monthly_frequency: 'Monthly Commit Frequency',
  monthlyFreq: 'Monthly Commit Frequency',
  activeMonths: 'Active Contribution Months',
  active_months: 'Active Contribution Months',
  communityProjects: 'Community Open Source Projects',
  community_projects: 'Community Open Source Projects',
  collaborations: 'Cross-Repo Collaborations',
  username: 'GitHub Username',
  company: 'Company / Organization',
  companyName: 'Company / Organization',
  tier: 'Company Tier',
  duration: 'Duration (Months)',
  durationMonths: 'Duration (Months)',
  isPaid: 'Stipend Paid',
  provider: 'Accreditation Body',
  name: 'Certification Name',
  certName: 'Certification Name',
  projectType: 'Project Scope',
  frontend: 'Frontend Stack',
  backend: 'Backend Stack',
  database: 'Database Stack',
  db: 'Database Stack',
  prize: 'Prize / Placement',
  placement: 'Prize / Placement',
  faculty: 'Faculty Mentor',
  mentor: 'Faculty Mentor',
  facultyMentor: 'Faculty Mentor',
  university: 'University',
  org: 'Professional Society',
  organization: 'Professional Society',
  membershipId: 'Membership ID',
  membership_id: 'Membership ID',
  rawScore: 'Assessment Score (/100)',
  raw_score: 'Assessment Score (/100)',
  score: 'Assessment Score (/100)',
  assessmentType: 'Test Provider',
  tenthPct: '10th Mark (%)',
  tenth_pct: '10th Mark (%)',
  twelfthPct: '12th Mark (%)',
  twelfth_pct: '12th Mark (%)',
  cgpa: 'Current CGPA',
};

// Clean key-value renderer for details JSONB
function SubmissionDetailsList({ details = {}, categoryId }) {
  if (!details || typeof details !== 'object') return null;

  const entries = Object.entries(details).filter(([key, val]) => {
    if (key === 'systemVerification') return false; // rendered separately
    if (val === undefined || val === null || val === '') return false;
    if (typeof val === 'object') return false;
    return true;
  });

  if (entries.length === 0) {
    return (
      <p className="text-[11px] italic m-0" style={{ color: 'var(--text-muted)' }}>
        No additional metadata logged.
      </p>
    );
  }

  const maxMarks = CATEGORY_META[categoryId]?.maxMarks || 10;

  return (
    <div 
      className="p-3 rounded-[var(--radius)] border divide-y text-xs" 
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      {entries.map(([key, val]) => {
        const label = FIELD_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        let displayVal = String(val);
        if (typeof val === 'boolean') {
          displayVal = val ? 'Yes' : 'No';
        }

        const isScoreKey = key === 'calculated_marks';

        return (
          <div key={key} className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0">
            <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
              {label}
            </span>
            <span 
              className={`font-mono text-xs ${isScoreKey ? 'font-bold' : 'font-medium'}`}
              style={{ color: isScoreKey ? 'var(--green-text)' : 'var(--text-primary)' }}
            >
              {isScoreKey ? `${displayVal} / ${maxMarks}` : displayVal}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Single Submission Card in the Grouped Pending Queue
function PendingSubmissionCard({
  submission,
  onVerify,
  onReject,
  isProcessing,
}) {
  const defaultScore = 
    submission.details?.calculated_marks !== undefined 
      ? Number(submission.details.calculated_marks)
      : (submission.awarded_marks || 2);

  const [awardMarks, setAwardMarks] = useState(defaultScore);
  const [note, setNote] = useState('');
  const [showRejectPrompt, setShowRejectPrompt] = useState(false);
  const [rejectReason, setRejectReason] = useState('Rejected: Does not meet rubric criteria.');

  const maxMarks = CATEGORY_META[submission.category_id]?.maxMarks || 10;

  const handleVerifyClick = () => {
    const finalMarks = Number(awardMarks);
    const finalNote = note.trim() || 'Verified according to placement rubric.';
    onVerify(submission.studentId, submission.id, finalMarks, finalNote);
  };

  const handleConfirmReject = () => {
    const finalReason = rejectReason.trim() || 'Rejected: Does not meet rubric criteria.';
    onReject(submission.studentId, submission.id, finalReason);
    setShowRejectPrompt(false);
  };

  return (
    <div
      className="p-4 rounded-[var(--radius-lg)] border shadow-xs transition-all space-y-3"
      style={{
        backgroundColor: 'var(--bg-input)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Student Identification & Claim Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-sm m-0" style={{ color: 'var(--text-primary)' }}>
              {submission.studentName}
            </h4>
            <span
              className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold"
              style={{
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border)',
              }}
            >
              {submission.regNo}
            </span>
          </div>
          <p className="text-[11px] m-0 mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {submission.department} • Section {submission.section}
          </p>
        </div>

        {/* Claim Title Badge */}
        <div className="text-left sm:text-right">
          <span 
            className="inline-block px-2.5 py-1 rounded text-xs font-semibold"
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              color: 'var(--amber-text)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
            }}
          >
            {submission.title || 'Claim'}
          </span>
        </div>
      </div>

      {/* Rubric Ambiguity Note for In-House Projects */}
      {submission.category_id === 'inhouse-projects' && (
        <div className="rubric-ambiguity-note" style={{
          padding: '10px 14px',
          background: 'var(--pending-bg, rgba(245, 158, 11, 0.1))',
          border: '1px solid var(--amber, #F59E0B)',
          borderRadius: 'var(--radius, 8px)',
          fontSize: '12px',
          color: 'var(--amber-text, #F59E0B)',
          marginBottom: '12px'
        }}>
          ⚠ Note: The official rubric document lists "8 Marks" for this category (implying 2 projects × 4m) 
          but the description states "Maximum of 1 Project to be considered." 
          Currently allowing up to 2 projects pending clarification from the placement cell.
        </div>
      )}

      {/* Membership System Verification Banner if applicable */}
      {submission.details?.systemVerification && (
        <div
          className="p-2.5 rounded-[var(--radius)] border flex flex-col gap-1 text-xs"
          style={{
            backgroundColor:
              submission.details.systemVerification.badgeType === 'green'
                ? 'rgba(16, 185, 129, 0.08)'
                : submission.details.systemVerification.badgeType === 'blue'
                ? 'rgba(59, 130, 246, 0.08)'
                : 'rgba(245, 158, 11, 0.08)',
            borderColor:
              submission.details.systemVerification.badgeType === 'green'
                ? 'rgba(16, 185, 129, 0.25)'
                : submission.details.systemVerification.badgeType === 'blue'
                ? 'rgba(59, 130, 246, 0.25)'
                : 'rgba(245, 158, 11, 0.25)',
          }}
        >
          <div className="flex items-center justify-between">
            <span
              className="font-semibold flex items-center gap-1.5"
              style={{
                color:
                  submission.details.systemVerification.badgeType === 'green'
                    ? 'var(--green-text)'
                    : submission.details.systemVerification.badgeType === 'blue'
                    ? '#60A5FA'
                    : 'var(--amber-text)',
              }}
            >
              <ShieldCheck size={14} />
              <span>{submission.details.systemVerification.badgeText}</span>
            </span>
            <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
              ID: {submission.details.membershipId || submission.details.membership_id || 'Roster Match'}
            </span>
          </div>
          <p className="m-0 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            {submission.details.systemVerification.verificationNotes}
          </p>
        </div>
      )}

      {/* External Credential Link if present */}
      {(submission.details?.credentialUrl || submission.details?.credential_url) && (
        <div>
          <a
            href={submission.details.credentialUrl || submission.details.credential_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold hover:underline"
            style={{ color: '#60A5FA' }}
          >
            <ExternalLink size={12} />
            <span>Verify Digital Credential / Badge Link</span>
          </a>
        </div>
      )}

      {/* Attached Evidence Documents with Preview Links */}
      {(() => {
        const docs = Array.isArray(submission.details?.proofDocuments)
          ? submission.details.proofDocuments
          : submission.proof_url
          ? [{ fileName: submission.details?.fileName || 'Proof_Document.pdf', publicUrl: submission.proof_url }]
          : [];
        if (docs.length === 0) return null;
        return (
          <div className="space-y-1.5 pt-1">
            <span className="block text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
              Attached Evidence Documents ({docs.length}):
            </span>
            <div className="flex flex-wrap gap-2">
              {docs.map((doc, idx) => (
                <a
                  key={doc.id || idx}
                  href={doc.publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded bg-[var(--bg-card)] border hover:opacity-80 transition-opacity"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                >
                  <FileText size={12} style={{ color: 'var(--green-text)' }} />
                  <span className="truncate max-w-[170px]">{doc.fileName || `Document #${idx + 1}`}</span>
                  <ExternalLink size={10} style={{ color: 'var(--text-muted)' }} />
                </a>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Inspectable Project URLs */}
      {(() => {
        const gh = submission.details?.githubUrl || submission.details?.github_url;
        const live = submission.details?.liveUrl || submission.details?.live_url;
        const demo = submission.details?.demoUrl || submission.details?.demo_url;
        if (!gh && !live && !demo) return null;
        return (
          <div className="flex flex-wrap gap-2.5 pt-1">
            {gh && (
              <a
                href={gh}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded bg-[var(--bg-card)] border hover:opacity-80 transition-opacity"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                <GithubIcon size={12} />
                <span>GitHub Repository</span>
                <ExternalLink size={10} style={{ color: 'var(--text-muted)' }} />
              </a>
            )}
            {live && (
              <a
                href={live}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded bg-[var(--bg-card)] border hover:opacity-80 transition-opacity"
                style={{ borderColor: 'var(--border)', color: 'var(--green-text)' }}
              >
                <Globe size={12} />
                <span>Hosted Live Project</span>
                <ExternalLink size={10} />
              </a>
            )}
            {demo && (
              <a
                href={demo}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded bg-[var(--bg-card)] border hover:opacity-80 transition-opacity"
                style={{ borderColor: 'var(--border)', color: '#60A5FA' }}
              >
                <span>Demo Video / Doc</span>
                <ExternalLink size={10} />
              </a>
            )}
          </div>
        );
      })()}

      {/* Clean Key-Value Rows from details JSONB */}
      <div>
        <span className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
          Submission Data & Evidence Metrics:
        </span>
        <SubmissionDetailsList details={submission.details} categoryId={submission.category_id} />
      </div>

      {/* Verifier Controls: Inline Marks Override + Notes + Actions */}
      <div className="pt-2 border-t space-y-2.5" style={{ borderColor: 'var(--border)' }}>
        {showRejectPrompt ? (
          <div 
            className="p-3 rounded-[var(--radius)] border space-y-2 animate-in fade-in"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.06)', borderColor: 'rgba(239, 68, 68, 0.25)' }}
          >
            <label className="block text-xs font-semibold text-red-500">
              Reason for Rejection:
            </label>
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Incomplete credentials, not meeting rubric..."
              className="w-full px-2.5 py-1.5 text-xs rounded border outline-none"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowRejectPrompt(false)}
                className="px-3 py-1 rounded text-xs font-medium cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmReject}
                className="px-3.5 py-1 rounded text-xs font-semibold cursor-pointer text-white flex items-center gap-1 bg-red-600 hover:bg-red-700"
              >
                <XCircle size={13} />
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Marks to Award (Max {maxMarks}):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max={maxMarks}
                    step="0.5"
                    value={awardMarks}
                    onChange={(e) => setAwardMarks(e.target.value)}
                    className="w-24 px-2.5 py-1.5 text-xs rounded-[var(--radius)] border outline-none font-mono font-bold"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    (Calc: {defaultScore}m)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Faculty Note (Optional):
                </label>
                <input
                  type="text"
                  placeholder="Verifier comment or criteria note..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-[var(--radius)] border outline-none"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setShowRejectPrompt(true)}
                className="px-3 py-1.5 rounded-[var(--radius)] text-xs font-semibold cursor-pointer border hover:opacity-85 flex items-center gap-1.5 transition-all"
                style={{
                  borderColor: 'rgba(239, 68, 68, 0.35)',
                  color: '#EF4444',
                  backgroundColor: 'transparent',
                }}
              >
                <XCircle size={14} />
                <span>Reject Claim</span>
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={handleVerifyClick}
                className="px-4 py-1.5 rounded-[var(--radius)] text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-all text-white shadow-xs"
                style={{
                  backgroundColor: 'var(--green)',
                  border: 'none',
                }}
              >
                <CheckCircle2 size={14} />
                <span>Verify & Award ({awardMarks}m)</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function FacultyDashboard({
  studentsList = [],
  onVerifySubmission,
  showToast,
  isSidebarCollapsed = false,
}) {
  // Navigation / View modes: 'queue' (Pending claims) vs 'table' (Student ranking ledger)
  const [activeView, setActiveView] = useState('queue');

  // Filters for table view
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [scoreRangeFilter, setScoreRangeFilter] = useState('all');
  const [statusTab, setStatusTab] = useState('all'); // 'all' | 'verified' | 'pending' | 'unclaimed'

  // Selected student for inspection modal
  const [inspectStudent, setInspectStudent] = useState(null);
  const [verifierNotes, setVerifierNotes] = useState({});
  const [customMarks, setCustomMarks] = useState({});

  // Optimistic tracking of verified/rejected submission IDs
  const [dismissedSubmissionIds, setDismissedSubmissionIds] = useState(new Set());
  const [processingSubmissionIds, setProcessingSubmissionIds] = useState(new Set());

  // Rank students dynamically using scoringEngine
  const rankedStudents = useMemo(() => {
    return (studentsList || [])
      .map((student) => {
        const scoreResult = calculateTotalScore(student);
        const submissions = (student.submissions || []).filter(
          (s) => !dismissedSubmissionIds.has(s.id)
        );
        const pendingCount = submissions.filter(
          (s) => s.status === 'PENDING' || s.status === 'Pending'
        ).length;
        const verifiedCount = submissions.filter(
          (s) => s.status === 'VERIFIED' || s.status === 'Verified'
        ).length;

        const verifiedScore = scoreResult?.totalVerifiedScore ?? 0;
        const pendingScore = scoreResult?.totalPendingScore ?? 0;

        let status = 'unclaimed';
        if (verifiedScore > 0 && pendingCount === 0) {
          status = 'verified';
        } else if (pendingCount > 0) {
          status = 'pending';
        }

        return {
          ...student,
          calculatedVerifiedScore: verifiedScore,
          calculatedPendingScore: pendingScore,
          pendingCount,
          verifiedCount,
          computedStatus: status,
        };
      })
      .sort((a, b) => b.calculatedVerifiedScore - a.calculatedVerifiedScore);
  }, [studentsList, dismissedSubmissionIds]);

  // Extract all pending submissions across all students
  const allPendingSubmissions = useMemo(() => {
    const list = [];
    (studentsList || []).forEach((st) => {
      (st.submissions || []).forEach((sub) => {
        if (dismissedSubmissionIds.has(sub.id)) return;
        const isPending = (sub.status || '').toUpperCase() === 'PENDING';
        if (isPending) {
          list.push({
            ...sub,
            studentId: st.id,
            studentName: st.name || st.full_name || 'Student',
            regNo: st.regNo || st.reg_no || '—',
            department: st.department || 'CSE',
            section: st.section || '—',
          });
        }
      });
    });
    return list;
  }, [studentsList, dismissedSubmissionIds]);

  // Group pending submissions by category_id
  const pendingGroupedByCategory = useMemo(() => {
    const groups = {};
    allPendingSubmissions.forEach((sub) => {
      const catId = sub.category_id || sub.categoryId || 'other';
      if (!groups[catId]) {
        groups[catId] = [];
      }
      groups[catId].push(sub);
    });
    return groups;
  }, [allPendingSubmissions]);

  // Extract unique departments & sections for filters
  const departments = useMemo(() => {
    const s = new Set();
    studentsList.forEach((st) => {
      if (st.department) s.add(st.department);
    });
    return Array.from(s);
  }, [studentsList]);

  const sections = useMemo(() => {
    const s = new Set();
    studentsList.forEach((st) => {
      if (st.section) s.add(st.section);
    });
    return Array.from(s);
  }, [studentsList]);

  // Filtered student rows
  const filteredStudents = useMemo(() => {
    return rankedStudents.filter((st) => {
      const name = st.name || st.full_name || '';
      const reg = st.regNo || st.reg_no || '';

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!name.toLowerCase().includes(q) && !reg.toLowerCase().includes(q)) {
          return false;
        }
      }

      if (deptFilter !== 'all' && st.department !== deptFilter) return false;
      if (sectionFilter !== 'all' && st.section !== sectionFilter) return false;

      const score = st.calculatedVerifiedScore;
      if (scoreRangeFilter === 'super_dream' && score < 80) return false;
      if (scoreRangeFilter === 'dream' && (score < 60 || score >= 80)) return false;
      if (scoreRangeFilter === 'eligible' && (score < 40 || score >= 60)) return false;

      if (statusTab === 'verified' && st.computedStatus !== 'verified') return false;
      if (statusTab === 'pending' && st.computedStatus !== 'pending') return false;
      if (statusTab === 'unclaimed' && st.computedStatus !== 'unclaimed') return false;

      return true;
    });
  }, [rankedStudents, searchQuery, deptFilter, sectionFilter, scoreRangeFilter, statusTab]);

  // Verification & Rejection Handlers with instant optimistic update
  const handleVerify = async (studentId, submissionId, awardedMarks = 2, note = 'Verified according to placement rubric.') => {
    setDismissedSubmissionIds((prev) => new Set(prev).add(submissionId));
    setProcessingSubmissionIds((prev) => new Set(prev).add(submissionId));
    try {
      await onVerifySubmission?.(studentId, submissionId, 'VERIFIED', note, awardedMarks);
      showToast?.('Submission Verified', `Awarded ${awardedMarks} marks.`, 'success');
    } catch (err) {
      setDismissedSubmissionIds((prev) => {
        const copy = new Set(prev);
        copy.delete(submissionId);
        return copy;
      });
      showToast?.('Verification Error', err.message || 'Failed to verify.', 'error');
    } finally {
      setProcessingSubmissionIds((prev) => {
        const copy = new Set(prev);
        copy.delete(submissionId);
        return copy;
      });
    }
  };

  const handleReject = async (studentId, submissionId, reason = 'Rejected: Does not meet rubric criteria.') => {
    setDismissedSubmissionIds((prev) => new Set(prev).add(submissionId));
    setProcessingSubmissionIds((prev) => new Set(prev).add(submissionId));
    try {
      await onVerifySubmission?.(studentId, submissionId, 'REJECTED', reason, 0);
      showToast?.('Submission Rejected', 'Status updated to Rejected.', 'error');
    } catch (err) {
      setDismissedSubmissionIds((prev) => {
        const copy = new Set(prev);
        copy.delete(submissionId);
        return copy;
      });
      showToast?.('Rejection Error', err.message || 'Failed to reject.', 'error');
    } finally {
      setProcessingSubmissionIds((prev) => {
        const copy = new Set(prev);
        copy.delete(submissionId);
        return copy;
      });
    }
  };

  const totalPendingCount = allPendingSubmissions.length;

  // Micro-interaction 5: Realtime queue counter pulse when count increases
  const prevPendingCountRef = useRef(null);
  const [isCounterPulsing, setIsCounterPulsing] = useState(false);

  useEffect(() => {
    if (prevPendingCountRef.current !== null) {
      if (totalPendingCount > prevPendingCountRef.current) {
        setIsCounterPulsing(true);
        const timer = setTimeout(() => {
          setIsCounterPulsing(false);
        }, 220);
        return () => clearTimeout(timer);
      }
    }
    prevPendingCountRef.current = totalPendingCount;
  }, [totalPendingCount]);

  return (
    <div
      className="w-full min-w-0"
      style={{
        backgroundColor: 'var(--bg-page)',
      }}
    >
      <div className="p-4 sm:p-6 lg:p-7">
        
        {/* Top Header & Primary Navigation Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1
              style={{
                fontSize: '22px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              Faculty Placement Portal
            </h1>
            <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Evaluate rubric claims, verify student credentials, and review department placement readiness.
            </p>
          </div>

          {/* Primary View Switcher: Pending Queue vs Student Ledger */}
          <div
            className="flex items-center p-1 rounded-[var(--radius)] border self-start md:self-auto"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border)',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveView('queue')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold cursor-pointer transition-all"
              style={{
                backgroundColor: activeView === 'queue' ? 'var(--bg-input)' : 'transparent',
                color: activeView === 'queue' ? 'var(--text-primary)' : 'var(--text-muted)',
                border: activeView === 'queue' ? '1px solid var(--border)' : '1px solid transparent',
              }}
            >
              <Clock size={13} style={{ color: totalPendingCount > 0 ? 'var(--amber-text)' : 'inherit' }} />
              <span>Pending Queue</span>
              {totalPendingCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono transition-transform ${
                    isCounterPulsing ? 'counter-pulse-active' : ''
                  }`}
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.18)',
                    color: 'var(--amber-text)',
                  }}
                >
                  {totalPendingCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveView('table')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold cursor-pointer transition-all"
              style={{
                backgroundColor: activeView === 'table' ? 'var(--bg-input)' : 'transparent',
                color: activeView === 'table' ? 'var(--text-primary)' : 'var(--text-muted)',
                border: activeView === 'table' ? '1px solid var(--border)' : '1px solid transparent',
              }}
            >
              <Users size={13} />
              <span>Student Ledger & Rankings</span>
              <span
                className="px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono"
                style={{
                  backgroundColor: 'var(--border)',
                  color: 'var(--text-secondary)',
                }}
              >
                {rankedStudents.length}
              </span>
            </button>
          </div>
        </div>

        {/* VIEW 1: GROUPED PENDING VERIFICATION QUEUE */}
        {activeView === 'queue' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {totalPendingCount === 0 ? (
              <div
                className="p-12 text-center rounded-[var(--radius-xl)] border space-y-3"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border)',
                }}
              >
                <div 
                  className="w-12 h-12 rounded-full mx-auto flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--green-text)' }}
                >
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="text-base font-semibold m-0" style={{ color: 'var(--text-primary)' }}>
                  All Claims Verified!
                </h3>
                <p className="text-xs max-w-md mx-auto m-0" style={{ color: 'var(--text-muted)' }}>
                  There are currently zero pending placement claims waiting for faculty evaluation. Check back as students log new badges, internships, and project claims.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveView('table')}
                    className="px-4 py-2 rounded-[var(--radius)] text-xs font-semibold cursor-pointer border"
                    style={{
                      borderColor: 'var(--border)',
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    View Student Master Ledger →
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(pendingGroupedByCategory).map(([catId, items]) => {
                  const meta = CATEGORY_META[catId] || { name: catId, maxMarks: 10, icon: Award };
                  const CategoryIcon = meta.icon;

                  return (
                    <div
                      key={catId}
                      className="rounded-[var(--radius-xl)] border overflow-hidden"
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      {/* Category Header with Pending Count & Max Marks */}
                      <div
                        className="px-5 py-3.5 border-b flex items-center justify-between"
                        style={{
                          backgroundColor: 'var(--bg-input)',
                          borderColor: 'var(--border)',
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: 'rgba(16, 185, 129, 0.12)',
                              color: 'var(--green-text)',
                            }}
                          >
                            <CategoryIcon size={15} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold m-0" style={{ color: 'var(--text-primary)' }}>
                              {meta.name}
                            </h3>
                            <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>
                              Rubric Max: {meta.maxMarks} Marks
                            </span>
                          </div>
                        </div>

                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-bold font-mono"
                          style={{
                            backgroundColor: 'rgba(245, 158, 11, 0.12)',
                            color: 'var(--amber-text)',
                            border: '1px solid rgba(245, 158, 11, 0.25)',
                          }}
                        >
                          {items.length} pending
                        </span>
                      </div>

                      {/* Cards Grid for this category */}
                      <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {items.map((sub) => (
                          <PendingSubmissionCard
                            key={sub.id}
                            submission={sub}
                            onVerify={handleVerify}
                            onReject={handleReject}
                            isProcessing={processingSubmissionIds.has(sub.id)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: FULL STUDENT MASTER LEDGER & RANKINGS */}
        {activeView === 'table' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Filter Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-[var(--radius-lg)] border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search Input */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search name or reg no..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 px-3 text-xs rounded-[var(--radius)] border outline-none font-medium"
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)',
                      width: '200px',
                    }}
                  />
                </div>

                {/* Department Dropdown */}
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="h-9 px-2.5 text-xs rounded-[var(--radius)] border outline-none cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="all">All Departments</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>

                {/* Section Dropdown */}
                <select
                  value={sectionFilter}
                  onChange={(e) => setSectionFilter(e.target.value)}
                  className="h-9 px-2.5 text-xs rounded-[var(--radius)] border outline-none cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="all">All Sections</option>
                  {sections.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                {/* Score Range Dropdown */}
                <select
                  value={scoreRangeFilter}
                  onChange={(e) => setScoreRangeFilter(e.target.value)}
                  className="h-9 px-2.5 text-xs rounded-[var(--radius)] border outline-none cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="all">All Score Tiers</option>
                  <option value="super_dream">Super Dream (80+ Marks)</option>
                  <option value="dream">Dream (60–79 Marks)</option>
                  <option value="eligible">Eligible (40–59 Marks)</option>
                </select>
              </div>

              {/* Status Filter Tabs */}
              <div
                className="flex items-center p-0.5 rounded-[var(--radius)] border"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border)',
                }}
              >
                {['all', 'verified', 'pending', 'unclaimed'].map((tab) => {
                  const isActive = statusTab === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setStatusTab(tab)}
                      className="capitalize text-xs font-semibold px-2.5 py-1 rounded-[var(--radius-sm)] transition-all cursor-pointer"
                      style={{
                        backgroundColor: isActive ? 'var(--bg-card)' : 'transparent',
                        color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                        border: isActive ? '1px solid var(--border-strong)' : '1px solid transparent',
                      }}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Table */}
            <div
              className="w-full rounded-[var(--radius-lg)] border overflow-hidden shadow-xs"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border)',
              }}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr
                      style={{
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: 'var(--text-muted)',
                        borderBottom: '1px solid var(--border)',
                        backgroundColor: 'var(--bg-input)',
                      }}
                    >
                      <th style={{ padding: '10px 14px', width: '60px', textAlign: 'center' }}>Rank</th>
                      <th style={{ padding: '10px 14px' }}>Name & Reg No</th>
                      <th style={{ padding: '10px 14px' }}>Department</th>
                      <th style={{ padding: '10px 14px' }}>Section</th>
                      <th style={{ padding: '10px 14px', width: '200px' }}>Score / 100</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map((student, idx) => {
                        const rank = idx + 1;
                        const isTop3 = rank <= 3;
                        const name = student.name || student.full_name || 'Student';
                        const regNo = student.regNo || student.reg_no || '—';
                        const dept = student.department || 'CSE';
                        const sec = student.section || '—';
                        const verifiedScore = student.calculatedVerifiedScore;
                        const pendingScore = student.calculatedPendingScore;
                        const progressWidth = Math.min(100, verifiedScore);
                        const pendingWidth = Math.min(100 - progressWidth, pendingScore);

                        return (
                          <tr
                            key={student.id || idx}
                            onClick={() => setInspectStudent(student)}
                            className="cursor-pointer transition-colors hover:opacity-90"
                            style={{
                              fontSize: '14px',
                              borderBottom: '1px solid var(--border)',
                            }}
                          >
                            {/* Rank */}
                            <td
                              style={{
                                padding: '12px 14px',
                                textAlign: 'center',
                                fontWeight: 700,
                                color: isTop3 ? 'var(--green)' : 'var(--text-muted)',
                                fontFamily: 'monospace',
                              }}
                            >
                              #{rank}
                            </td>

                            {/* Name + Reg No */}
                            <td style={{ padding: '12px 14px' }}>
                              <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                {name}
                              </div>
                              <div className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                                {regNo}
                              </div>
                            </td>

                            {/* Department */}
                            <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                              {dept}
                            </td>

                            {/* Section */}
                            <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                              {sec}
                            </td>

                            {/* Score Column */}
                            <td style={{ padding: '12px 14px' }}>
                              <div className="flex items-baseline gap-1.5 mb-1">
                                <span className="font-bold font-mono" style={{ color: 'var(--text-primary)', fontSize: '15px' }}>
                                  {verifiedScore}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/ 100</span>
                                {pendingScore > 0 && (
                                  <span style={{ fontSize: '10px', color: 'var(--amber-text)', fontWeight: 600 }}>
                                    (+{pendingScore}m pending)
                                  </span>
                                )}
                              </div>
                              {/* Thin progress bar */}
                              <div
                                style={{
                                  height: '4px',
                                  borderRadius: '2px',
                                  backgroundColor: 'var(--border)',
                                  overflow: 'hidden',
                                  display: 'flex',
                                  width: '100%',
                                }}
                              >
                                <div
                                  style={{
                                    width: `${progressWidth}%`,
                                    backgroundColor: 'var(--green-bar)',
                                  }}
                                />
                                <div
                                  style={{
                                    width: `${pendingWidth}%`,
                                    backgroundColor: 'var(--amber-bar)',
                                  }}
                                />
                              </div>
                            </td>

                            {/* Status */}
                            <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                              {student.computedStatus === 'verified' && (
                                <span
                                  className="status-badge"
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
                              {student.computedStatus === 'pending' && (
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
                                  {student.pendingCount} Pending
                                </span>
                              )}
                              {student.computedStatus === 'unclaimed' && (
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
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="text-center py-10"
                          style={{ color: 'var(--text-muted)', fontSize: '13px' }}
                        >
                          No student records matching your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Student Inspection Modal */}
      {inspectStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="absolute inset-0" onClick={() => setInspectStudent(null)} />

          <div
            className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-[var(--radius-xl)] border shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            {/* Modal Header */}
            <div
              className="p-5 border-b flex items-center justify-between"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border)',
              }}
            >
              <div>
                <h3 className="font-bold text-base m-0" style={{ color: 'var(--text-primary)' }}>
                  {inspectStudent.name || inspectStudent.full_name}
                </h3>
                <p className="font-mono text-xs m-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {inspectStudent.regNo || inspectStudent.reg_no} • {inspectStudent.department} ({inspectStudent.section})
                </p>
              </div>

              <button
                type="button"
                onClick={() => setInspectStudent(null)}
                className="p-1 rounded cursor-pointer hover:opacity-75"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: Submissions Ledger */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
                <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Submitted Proofs & Claims ({(inspectStudent.submissions || []).length})
                </span>
                <span className="font-bold text-sm" style={{ color: 'var(--green-text)' }}>
                  {inspectStudent.calculatedVerifiedScore} / 100 Verified
                </span>
              </div>

              {(inspectStudent.submissions || []).length === 0 ? (
                <p className="text-center py-6" style={{ color: 'var(--text-muted)' }}>
                  No submissions logged yet for this student.
                </p>
              ) : (
                (inspectStudent.submissions || []).map((sub) => {
                  const isPending = (sub.status || '').toUpperCase() === 'PENDING';
                  const isVerified = (sub.status || '').toUpperCase() === 'VERIFIED';
                  const isRejected = (sub.status || '').toUpperCase() === 'REJECTED';
                  const isDismissed = dismissedSubmissionIds.has(sub.id);

                  if (isDismissed) return null;

                  return (
                    <div
                      key={sub.id}
                      className="p-3.5 rounded-[var(--radius)] border space-y-2.5"
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-xs m-0" style={{ color: 'var(--text-primary)' }}>
                            {sub.title || 'Claim'}
                          </p>
                          <p className="text-[10px] uppercase tracking-wider font-semibold m-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            Category: {CATEGORY_META[sub.category_id]?.name || sub.category_id}
                          </p>
                        </div>

                        <span
                          className="status-badge"
                          style={{
                            backgroundColor: isVerified
                              ? 'var(--green-light)'
                              : isRejected
                              ? 'rgba(239, 68, 68, 0.1)'
                              : 'var(--amber-light)',
                            color: isVerified
                              ? 'var(--green-text)'
                              : isRejected
                              ? '#EF4444'
                              : 'var(--amber-text)',
                            borderRadius: '4px',
                            padding: '2px 8px',
                            fontSize: '11px',
                            fontWeight: 500,
                          }}
                        >
                          {sub.status || 'PENDING'}
                        </span>
                      </div>

                      {/* Clean Details JSONB rows */}
                      <SubmissionDetailsList details={sub.details} categoryId={sub.category_id} />

                      {/* Verify & Reject Controls if Pending */}
                      {isPending && (
                        <div className="pt-2 border-t space-y-2" style={{ borderColor: 'var(--border)' }}>
                          <input
                            type="text"
                            placeholder="Verifier note (optional)..."
                            value={verifierNotes[sub.id] || ''}
                            onChange={(e) =>
                              setVerifierNotes({ ...verifierNotes, [sub.id]: e.target.value })
                            }
                            className="w-full px-2 py-1 text-xs rounded border outline-none"
                            style={{
                              backgroundColor: 'var(--bg-card)',
                              borderColor: 'var(--border)',
                              color: 'var(--text-primary)',
                            }}
                          />
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <label className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
                                Award Marks:
                              </label>
                              <input
                                type="number"
                                min="0"
                                max={CATEGORY_META[sub.category_id]?.maxMarks || 15}
                                step="0.5"
                                value={
                                  customMarks[sub.id] !== undefined
                                    ? customMarks[sub.id]
                                    : (sub.details?.calculated_marks || sub.awarded_marks || 2)
                                }
                                onChange={(e) =>
                                  setCustomMarks({ ...customMarks, [sub.id]: Number(e.target.value) })
                                }
                                className="w-16 px-2 py-1 text-xs rounded border outline-none font-bold text-center"
                                style={{
                                  backgroundColor: 'var(--bg-card)',
                                  borderColor: 'var(--border)',
                                  color: 'var(--text-primary)',
                                }}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleReject(inspectStudent.id, sub.id)}
                                className="px-3 py-1 rounded text-xs font-semibold cursor-pointer border hover:opacity-80 flex items-center gap-1"
                                style={{
                                  borderColor: 'rgba(239, 68, 68, 0.3)',
                                  color: '#EF4444',
                                  backgroundColor: 'transparent',
                                }}
                              >
                                <XCircle size={14} />
                                <span>Reject</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const markToAward =
                                    customMarks[sub.id] !== undefined
                                      ? customMarks[sub.id]
                                      : (sub.details?.calculated_marks || sub.awarded_marks || 2);
                                  handleVerify(inspectStudent.id, sub.id, markToAward, verifierNotes[sub.id]);
                                }}
                                className="px-3 py-1 rounded text-xs font-semibold cursor-pointer flex items-center gap-1 text-white"
                                style={{
                                  backgroundColor: 'var(--green)',
                                  border: 'none',
                                }}
                              >
                                <CheckCircle2 size={14} />
                                <span>Verify & Award</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
