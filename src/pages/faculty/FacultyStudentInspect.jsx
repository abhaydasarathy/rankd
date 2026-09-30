import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import {
  getStudentSubmissionsForFaculty,
  verifySubmission,
  rejectSubmission,
} from '../../services';
import ScorePanel from '../../components/ScorePanel';
import Toast from '../../components/Toast';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  ExternalLink,
  Clock,
  Sparkles,
  Loader2,
  FileText,
  AlertCircle,
  BarChart3,
  Lock,
  GraduationCap,
  Code2,
  Briefcase,
  Award,
  FolderGit2,
  Layers,
  Trophy,
  Building2,
  ShieldCheck,
  CheckSquare,
  Eye,
  Check,
} from 'lucide-react';
import { calculateTotalScore } from '../../utils/scoringEngine';
import { PLACEMENT_CATEGORIES } from '../../data/categories';
import { normalizeCategoryId } from '../../services';

function GithubIcon({ size = 18, className = 'w-4 h-4 shrink-0', ...props }) {
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
      style={{ width: `${size}px`, height: `${size}px`, flexShrink: 0 }}
      {...props}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

const ICON_MAP = {
  GraduationCap,
  Github: GithubIcon,
  Code2,
  Briefcase,
  Award,
  FolderGit2,
  Layers,
  Trophy,
  Building2,
  ShieldCheck,
  CheckSquare,
};

function SubmissionDetails({ details }) {
  if (!details || typeof details !== 'object') return null;

  const labelMap = {
    badge_count: 'Badges earned',
    medium_hard_solved: 'Medium + Hard solved',
    calculated_marks: 'Calculated score',
    contributions_last_year: 'Contributions (last year)',
    avg_monthly_contributions: 'Avg monthly contributions',
    community_project_count: 'Community projects',
    collaboration_count: 'Collaborations',
    company_name: 'Company',
    company_tier: 'Company tier',
    duration_months: 'Duration (months)',
    is_paid: 'Paid internship',
    cert_name: 'Certificate name',
    provider: 'Provider',
    project_type: 'Project type',
    projectType: 'Project type',
    prize_placement: 'Prize',
    organization: 'Professional body',
    membership_id: 'Membership ID',
    raw_score: 'Test score',
    rawScore: 'Test score',
    score: 'Test score',
    assessment_type: 'Assessment type',
    assessmentType: 'Assessment type',
    candidate_id: 'Candidate ID',
    candidateId: 'Candidate ID',
    test_date: 'Test date',
    testDate: 'Test date',
    github_username: 'GitHub username',
    profile_url: 'Profile URL',
    credential_id: 'Credential ID',
    faculty_mentor: 'Faculty mentor',
    event_name: 'Event name',
    name: 'Application / Project Name',
    frontend: 'Frontend stack',
    frontend_tech: 'Frontend stack',
    backend: 'Backend stack',
    backend_tech: 'Backend stack',
    database: 'Database',
    database_tech: 'Database',
    db: 'Database',
    auth: 'Authentication',
    deployment: 'Cloud / Hosting',
    techStack: 'Tech Stack',
    tech_stack: 'Tech Stack',
    githubUrl: 'GitHub Repository',
    github_url: 'GitHub Repository',
    liveUrl: 'Hosted URL',
    live_url: 'Hosted URL',
    hostedUrl: 'Hosted URL',
    hosted_url: 'Hosted URL',
    demoUrl: 'Demo URL',
    repoUrl: 'Repository URL',
    repo_url: 'Repository URL',
    shortDescription: 'Short Description',
    short_description: 'Short Description',
    description: 'Description',
  };

  const ignoredKeys = new Set([
    'proofDocuments',
    'documents',
    'files',
    'breakdown',
    'notes',
    'fileSize',
    'fileType',
    'fileName',
    'publicUrl',
    'proof_url',
    'proofUrl',
    'url',
    'calculated_marks',
  ]);

  const urlKeys = new Set([
    'profile_url',
    'githubUrl',
    'github_url',
    'liveUrl',
    'live_url',
    'hostedUrl',
    'hosted_url',
    'demoUrl',
    'repoUrl',
    'repo_url',
    'projectUrl',
  ]);

  const entries = Object.entries(details).filter(([k, v]) => {
    if (v === null || v === undefined || v === '') return false;
    if (ignoredKeys.has(k)) return false;
    if (k.toLowerCase().includes('url') && !urlKeys.has(k)) return false;
    if (typeof v === 'object' && !Array.isArray(v)) return false;
    return true;
  });

  if (entries.length === 0) return null;

  return (
    <div
      className="submission-details grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs py-2 mt-2 border-t"
      style={{ borderColor: 'var(--border)' }}
    >
      {entries.map(([key, val]) => (
        <div
          key={key}
          className="detail-row flex items-baseline justify-between gap-2 p-1.5 rounded"
          style={{ backgroundColor: 'var(--bg-input)' }}
        >
          <span className="detail-label text-[11px] font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>
            {labelMap[key] || key.replace(/_/g, ' ')}
          </span>
          <div className="detail-value font-semibold text-right" style={{ color: 'var(--text-primary)' }}>
            {urlKeys.has(key) ? (
              <a
                href={typeof val === 'string' && val.startsWith('http') ? val : `https://${val}`}
                target="_blank"
                rel="noreferrer"
                className="hover:underline inline-flex items-center gap-1 font-mono text-xs"
                style={{ color: 'var(--green-text)' }}
              >
                <span>{key.toLowerCase().includes('github') || key.toLowerCase().includes('repo') ? 'GitHub Repo ↗' : key.toLowerCase().includes('hosted') || key.toLowerCase().includes('live') || key.toLowerCase().includes('demo') ? 'Hosted App ↗' : key === 'profile_url' ? 'View Profile ↗' : 'Open Link ↗'}</span>
              </a>
            ) : key === 'techStack' || key === 'tech_stack' ? (
              <div className="flex flex-wrap gap-1 justify-end">
                {(Array.isArray(val) ? val : String(val).split(',')).map((t, i) => (
                  <span
                    key={i}
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--bg-card)] border"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    {String(t).trim()}
                  </span>
                ))}
              </div>
            ) : key === 'is_paid' ? (
              val ? 'Yes (+1m)' : 'No'
            ) : Array.isArray(val) ? (
              val.map((item) => (typeof item === 'object' ? item.name || item.title || JSON.stringify(item) : String(item))).join(', ')
            ) : typeof val === 'number' ? (
              val
            ) : (
              String(val)
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function extractAllDocuments(sub) {
  if (!sub) return [];
  const d = sub.details || {};
  if (Array.isArray(d.proofDocuments) && d.proofDocuments.length > 0) {
    return d.proofDocuments.map((doc, idx) => ({
      id: doc.id || `doc-${idx}`,
      fileName: doc.fileName || doc.name || `Proof_Document_${idx + 1}.pdf`,
      fileSize: doc.fileSize || doc.size || 0,
      fileType: doc.fileType || doc.type || 'application/pdf',
      publicUrl: doc.publicUrl || doc.url || sub.proof_url || sub.proofUrl || '',
    }));
  }
  if (Array.isArray(d.documents) && d.documents.length > 0) {
    return d.documents.map((doc, idx) => ({
      id: doc.id || `doc-${idx}`,
      fileName: doc.fileName || doc.name || `Proof_Document_${idx + 1}.pdf`,
      fileSize: doc.fileSize || doc.size || 0,
      fileType: doc.fileType || doc.type || 'application/pdf',
      publicUrl: doc.publicUrl || doc.url || sub.proof_url || sub.proofUrl || '',
    }));
  }
  if (Array.isArray(d.files) && d.files.length > 0) {
    return d.files.map((doc, idx) => ({
      id: doc.id || `doc-${idx}`,
      fileName: doc.fileName || doc.name || `Proof_Document_${idx + 1}.pdf`,
      fileSize: doc.fileSize || doc.size || 0,
      fileType: doc.fileType || doc.type || 'application/pdf',
      publicUrl: doc.publicUrl || doc.url || sub.proof_url || sub.proofUrl || '',
    }));
  }
  const url = sub.proof_url || sub.proofUrl || d.proof_url || d.publicUrl || d.url;
  if (url) {
    return [
      {
        id: 'doc-0',
        fileName: d.fileName || d.name || 'Supporting_Proof_Document.pdf',
        fileSize: d.fileSize || 0,
        fileType: 'application/pdf',
        publicUrl: url,
      },
    ];
  }
  return [];
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return 'Document';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function FacultyStudentInspect() {
  const { studentId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [scoreData, setScoreData] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [activeView, setActiveView] = useState('metrics'); // 'metrics' | 'ledger'
  const [metricTab, setMetricTab] = useState('all'); // 'all' | 'verified' | 'pending' | 'unclaimed'
  const [tab, setTab] = useState('all'); // 'all' | 'pending' | 'verified' | 'rejected'
  const [loading, setLoading] = useState(true);
  const [actionState, setActionState] = useState({});
  const [toast, setToast] = useState(null);

  const showToast = (type, message, title = 'Notification') => {
    setToast({ title, message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadStudentData = useCallback(async () => {
    if (!studentId) return;
    try {
      const [profileRes, scoreRes, subsData] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', studentId).maybeSingle(),
        supabase.from('student_placement_scores').select('*').eq('student_id', studentId).maybeSingle(),
        getStudentSubmissionsForFaculty(studentId),
      ]);

      if (profileRes.data) setStudent(profileRes.data);
      if (scoreRes.data) setScoreData(scoreRes.data);
      setSubmissions(subsData || []);
    } catch (err) {
      console.error('Error fetching student inspect data:', err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadStudentData();
  }, [loadStudentData]);

  // Realtime subscription on submissions for this student
  useEffect(() => {
    if (!studentId) return;
    const channel = supabase
      .channel(`faculty-inspect-${studentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_submissions',
          filter: `student_id=eq.${studentId}`,
        },
        () => {
          loadStudentData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentId, loadStudentData]);

  const filtered = submissions.filter((s) => {
    if (tab === 'all') return true;
    return (s.status || '').toUpperCase() === tab.toUpperCase();
  });

  const handleMarksChange = (subId, val) => {
    setActionState((prev) => ({
      ...prev,
      [subId]: { ...prev[subId], marks: val },
    }));
  };

  const handleNoteChange = (subId, val) => {
    setActionState((prev) => ({
      ...prev,
      [subId]: { ...prev[subId], note: val },
    }));
  };

  async function handleVerify(sub) {
    const state = actionState[sub.id] || {};
    const defaultMarks = sub.awarded_marks || sub.details?.calculated_marks || 0;
    const marks = Number(state.marks !== undefined ? state.marks : defaultMarks);
    const note = state.note || '';
    const maxMarks = sub.category?.max_marks || 100;

    if (isNaN(marks) || marks < 0 || marks > maxMarks) {
      showToast('error', `Marks must be between 0 and ${maxMarks}`, 'Validation Error');
      return;
    }

    setActionState((prev) => ({ ...prev, [sub.id]: { ...prev[sub.id], busy: true } }));
    try {
      await verifySubmission({
        submissionId: sub.id,
        facultyId: user.id,
        awardedMarks: marks,
        verifierNotes: note,
        studentId: studentId,
        categoryTitle: sub.category?.title || sub.category_id,
      });
      showToast('success', `Verified — ${marks}m awarded.`, 'Claim Verified');
      window.dispatchEvent(new CustomEvent('faculty-pending-count-sync'));
      await loadStudentData();
    } catch (err) {
      showToast('error', err.message || 'Failed to verify', 'Action Failed');
    } finally {
      setActionState((prev) => ({ ...prev, [sub.id]: { ...prev[sub.id], busy: false } }));
    }
  }

  async function handleReject(sub) {
    const state = actionState[sub.id] || {};
    const note = state.note || '';
    if (!note.trim()) {
      showToast('error', 'You must provide a rejection reason in the note.', 'Reason Required');
      return;
    }

    setActionState((prev) => ({ ...prev, [sub.id]: { ...prev[sub.id], busy: true } }));
    try {
      await rejectSubmission({
        submissionId: sub.id,
        facultyId: user.id,
        verifierNotes: note,
        studentId: studentId,
        categoryTitle: sub.category?.title || sub.category_id,
      });
      showToast('success', `Rejected — student notified.`, 'Claim Rejected');
      window.dispatchEvent(new CustomEvent('faculty-pending-count-sync'));
      await loadStudentData();
    } catch (err) {
      showToast('error', err.message || 'Failed to reject', 'Action Failed');
    } finally {
      setActionState((prev) => ({ ...prev, [sub.id]: { ...prev[sub.id], busy: false } }));
    }
  }

  const engineResult = useMemo(() => {
    return calculateTotalScore({
      tenthPct: student?.tenth_pct ?? student?.tenthPct,
      twelfthPct: student?.twelfth_pct ?? student?.twelfthPct,
      cgpa: student?.cgpa,
      submissions: submissions || [],
    });
  }, [student, submissions]);

  const verifiedScore = engineResult?.totalVerifiedScore ?? 0;
  const pendingScore = engineResult?.totalPendingScore ?? 0;

  const scoreResult = {
    totalVerifiedScore: verifiedScore,
    totalPendingScore: pendingScore,
    categoryScores: engineResult?.categoryScores || {},
  };

  const studentName = student?.name || student?.full_name || 'SRM Student';

  const categoriesWithScores = useMemo(() => {
    return PLACEMENT_CATEGORIES.map((cat) => {
      const normId = normalizeCategoryId(cat.id);
      const catScoreObj =
        scoreResult.categoryScores[normId] ||
        scoreResult.categoryScores[cat.id] ||
        {};
      const verifiedMarks = Number(catScoreObj.score || 0);
      const pendingMarks = Number(catScoreObj.pendingScore || 0);

      // Submissions under this category
      const catSubmissions = submissions.filter((s) => {
        const sNorm = normalizeCategoryId(s.category_id || s.categoryId);
        return sNorm === normId;
      });

      const hasVerified =
        verifiedMarks > 0 ||
        catSubmissions.some((s) => (s.status || '').toUpperCase() === 'VERIFIED');
      const hasPending =
        pendingMarks > 0 ||
        catSubmissions.some((s) => (s.status || '').toUpperCase() === 'PENDING');

      let status = 'unclaimed';
      if (hasVerified) status = 'verified';
      else if (hasPending) status = 'pending';

      return {
        ...cat,
        normId,
        verifiedMarks,
        pendingMarks,
        catSubmissions,
        status,
      };
    });
  }, [scoreResult, submissions]);

  const filteredCategories = useMemo(() => {
    if (metricTab === 'all') return categoriesWithScores;
    return categoriesWithScores.filter((c) => c.status === metricTab);
  }, [categoriesWithScores, metricTab]);

  return (
    <div className="page-content w-full p-4 sm:p-6 lg:p-7 min-w-0">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Top Back Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/faculty/students')}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold cursor-pointer border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
          style={{
            backgroundColor: 'var(--bg-input)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          <ArrowLeft size={14} />
          Back to My Students
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 gap-3">
          <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'var(--green)' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Loading student dossier...
          </span>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row items-start gap-6 min-w-0">
          {/* Left Column (40%): Student Profile + Score Donut */}
          <div className="w-full lg:w-[360px] shrink-0 space-y-5">
            {/* Score Panel */}
            <ScorePanel
              scoreResult={scoreResult}
              customProfile={student}
              hideProfileCard={false}
            />

            {/* Academic Summary Card */}
            <div
              className="p-5 rounded-[var(--radius-lg)] border space-y-3"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border)',
              }}
            >
              <h3 className="text-xs font-semibold uppercase tracking-wider m-0" style={{ color: 'var(--text-secondary)' }}>
                Academic Foundation
              </h3>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded" style={{ backgroundColor: 'var(--bg-input)' }}>
                  <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>10th Standard</div>
                  <div className="font-bold font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
                    {student?.tenth_pct ? `${Number(student.tenth_pct).toFixed(1)}%` : '—'}
                  </div>
                </div>

                <div className="p-2.5 rounded" style={{ backgroundColor: 'var(--bg-input)' }}>
                  <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>12th Standard</div>
                  <div className="font-bold font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
                    {student?.twelfth_pct ? `${Number(student.twelfth_pct).toFixed(1)}%` : '—'}
                  </div>
                </div>
              </div>

              <div className="pt-2 text-xs flex items-center justify-between border-t" style={{ borderColor: 'var(--border)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Academics Score:</span>
                <span className="font-mono font-bold" style={{ color: 'var(--green-text)' }}>
                  {(scoreResult.categoryScores?.academics?.score ?? Number(scoreData?.academics_score || 0)).toFixed(1)} / 10.0m
                </span>
              </div>
            </div>
          </div>

          {/* Right Column (60%): Dual-Mode Student Metrics & Claims Ledger */}
          <div className="flex-1 w-full space-y-4">
            {/* View Mode Toggle Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div
                className="inline-flex items-center gap-1 p-1 rounded-[var(--radius-lg)] border"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveView('metrics')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius)] text-xs font-semibold cursor-pointer transition-all ${
                    activeView === 'metrics'
                      ? 'shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                  style={{
                    backgroundColor: activeView === 'metrics' ? 'var(--green-light)' : 'transparent',
                    color: activeView === 'metrics' ? 'var(--green-text)' : 'inherit',
                  }}
                >
                  <BarChart3 size={14} />
                  Student Metrics (11 Categories)
                </button>

                <button
                  type="button"
                  onClick={() => setActiveView('ledger')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius)] text-xs font-semibold cursor-pointer transition-all ${
                    activeView === 'ledger'
                      ? 'shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                  style={{
                    backgroundColor: activeView === 'ledger' ? 'var(--green-light)' : 'transparent',
                    color: activeView === 'ledger' ? 'var(--green-text)' : 'inherit',
                  }}
                >
                  <FileText size={14} />
                  Claims Ledger & Verification ({submissions.length})
                </button>
              </div>

              {activeView === 'metrics' ? (
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border"
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                    borderColor: 'rgba(59, 130, 246, 0.2)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <Lock size={12} className="text-blue-500" />
                  <span>Read-Only Metrics View</span>
                </div>
              ) : (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {submissions.filter((s) => (s.status || '').toUpperCase() === 'PENDING').length} claims awaiting review
                </span>
              )}
            </div>

            {/* View Mode 1: 11-Category Student Metrics (Read-Only) */}
            {activeView === 'metrics' && (
              <div className="space-y-4">
                {/* Security / Read-Only Safety Notice */}
                <div
                  className="p-3.5 rounded-[var(--radius-lg)] border text-xs flex items-center gap-2.5"
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                    borderColor: 'rgba(59, 130, 246, 0.25)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <Lock size={15} className="shrink-0 text-blue-500" />
                  <span>
                    <strong>Read-Only Metrics View:</strong> Faculty cannot modify marks directly from this view. Changes and mark awards are processed strictly when the student submits an activity for review in your <strong>Pending Verification Queue</strong>.
                  </span>
                </div>

                {/* Score Summary & Metric Filter Tabs */}
                <div
                  className="p-4 rounded-[var(--radius-lg)] border flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Total Verified:
                    </span>
                    <span className="font-mono text-xl font-bold" style={{ color: 'var(--green-text)' }}>
                      {verifiedScore.toFixed(1)} / 100
                    </span>
                    {pendingScore > 0 && (
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded border border-amber-500/20 bg-amber-500/10" style={{ color: 'var(--amber-text)' }}>
                        +{pendingScore.toFixed(1)}m pending
                      </span>
                    )}
                  </div>

                  {/* Filter Tabs */}
                  <div
                    className="flex items-center gap-1 p-1 rounded-[var(--radius)] border text-xs"
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    {[
                      { id: 'all', label: 'All', count: categoriesWithScores.length },
                      {
                        id: 'verified',
                        label: 'Verified',
                        count: categoriesWithScores.filter((c) => c.status === 'verified').length,
                      },
                      {
                        id: 'pending',
                        label: 'Pending',
                        count: categoriesWithScores.filter((c) => c.status === 'pending').length,
                      },
                      {
                        id: 'unclaimed',
                        label: 'Unclaimed',
                        count: categoriesWithScores.filter((c) => c.status === 'unclaimed').length,
                      },
                    ].map((tabItem) => (
                      <button
                        key={tabItem.id}
                        type="button"
                        onClick={() => setMetricTab(tabItem.id)}
                        className={`px-2.5 py-1 rounded cursor-pointer font-medium transition-all ${
                          metricTab === tabItem.id
                            ? 'font-semibold'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                        style={{
                          backgroundColor: metricTab === tabItem.id ? 'var(--sidebar-active-bg)' : 'transparent',
                          color: metricTab === tabItem.id ? 'var(--sidebar-active-text)' : 'inherit',
                        }}
                      >
                        {tabItem.label} ({tabItem.count})
                      </button>
                    ))}
                  </div>
                </div>

                {/* 11 Metric Cards */}
                <div className="space-y-3">
                  {filteredCategories.map((cat) => {
                    const IconComponent = ICON_MAP[cat.iconName] || Award;
                    const maxMarks = cat.maxMarks || 10;
                    const verified = cat.verifiedMarks || 0;
                    const pending = cat.pendingMarks || 0;
                    const verifiedPct = Math.min(100, (verified / maxMarks) * 100);
                    const pendingPct = Math.min(100 - verifiedPct, (pending / maxMarks) * 100);

                    const isPending = cat.status === 'pending';
                    const isVerified = cat.status === 'verified';

                    return (
                      <div
                        key={cat.id}
                        className="p-4 rounded-[var(--radius-lg)] border space-y-3 transition-all"
                        style={{
                          backgroundColor: 'var(--bg-card)',
                          borderColor: isPending
                            ? 'rgba(245, 158, 11, 0.35)'
                            : isVerified
                            ? 'rgba(16, 185, 129, 0.35)'
                            : 'var(--border)',
                        }}
                      >
                        {/* Card Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
                              style={{
                                backgroundColor: isVerified
                                  ? 'var(--green-light)'
                                  : isPending
                                  ? 'var(--amber-light)'
                                  : 'var(--bg-input)',
                                borderColor: 'var(--border)',
                                color: isVerified
                                  ? 'var(--green-text)'
                                  : isPending
                                  ? 'var(--amber-text)'
                                  : 'var(--text-muted)',
                              }}
                            >
                              <IconComponent size={16} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-xs m-0" style={{ color: 'var(--text-primary)' }}>
                                  {cat.title}
                                </h4>
                                <span
                                  className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
                                  style={{
                                    backgroundColor: isVerified
                                      ? 'var(--green-light)'
                                      : isPending
                                      ? 'var(--amber-light)'
                                      : 'var(--bg-input)',
                                    color: isVerified
                                      ? 'var(--green-text)'
                                      : isPending
                                      ? 'var(--amber-text)'
                                      : 'var(--text-muted)',
                                  }}
                                >
                                  {cat.status}
                                </span>
                              </div>
                              <p className="text-[11px] m-0" style={{ color: 'var(--text-muted)' }}>
                                {cat.rubricText || cat.shortDescription}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="flex items-baseline justify-end gap-1">
                              <span className="font-mono font-bold text-sm" style={{ color: isVerified ? 'var(--green-text)' : isPending ? 'var(--amber-text)' : 'var(--text-muted)' }}>
                                {verified.toFixed(1)}
                              </span>
                              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                / {maxMarks}m
                              </span>
                              {pending > 0 && (
                                <span className="text-[10px] font-semibold" style={{ color: 'var(--amber-text)' }}>
                                  (+{pending.toFixed(1)}m)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div
                          className="h-2 w-full rounded-full overflow-hidden flex"
                          style={{ backgroundColor: 'var(--bg-input)' }}
                        >
                          <div
                            style={{
                              width: `${verifiedPct}%`,
                              backgroundColor: 'var(--green-bar)',
                              transition: 'width 0.3s ease',
                            }}
                          />
                          <div
                            style={{
                              width: `${pendingPct}%`,
                              backgroundColor: 'var(--amber-bar)',
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>

                        {/* Category Details */}
                        {cat.id === 'academics' ? (
                          <div className="p-3 rounded-[var(--radius)] text-xs space-y-2" style={{ backgroundColor: 'var(--bg-input)' }}>
                            <div className="grid grid-cols-3 gap-2 text-center font-mono">
                              <div className="p-2 rounded bg-black/5 dark:bg-white/5">
                                <div className="text-[10px] uppercase font-sans" style={{ color: 'var(--text-muted)' }}>10th Std</div>
                                <div className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>
                                  {student?.tenth_pct ? `${Number(student.tenth_pct).toFixed(1)}%` : '—'}
                                </div>
                              </div>
                              <div className="p-2 rounded bg-black/5 dark:bg-white/5">
                                <div className="text-[10px] uppercase font-sans" style={{ color: 'var(--text-muted)' }}>12th Std</div>
                                <div className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>
                                  {student?.twelfth_pct ? `${Number(student.twelfth_pct).toFixed(1)}%` : '—'}
                                </div>
                              </div>
                              <div className="p-2 rounded bg-black/5 dark:bg-white/5">
                                <div className="text-[10px] uppercase font-sans" style={{ color: 'var(--text-muted)' }}>University CGPA</div>
                                <div className="font-bold text-xs" style={{ color: 'var(--green-text)' }}>
                                  {student?.cgpa ? `${Number(student.cgpa).toFixed(2)}` : '—'}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : cat.catSubmissions.length > 0 ? (
                          <div className="space-y-2">
                            {cat.catSubmissions.map((subItem) => {
                              const isSubPending = (subItem.status || '').toUpperCase() === 'PENDING';
                              const isSubVerified = (subItem.status || '').toUpperCase() === 'VERIFIED';
                              const proofDocs = extractProofDocs(subItem);

                              return (
                                <div
                                  key={subItem.id}
                                  className="p-3 rounded-[var(--radius)] text-xs border space-y-1.5"
                                  style={{
                                    backgroundColor: 'var(--bg-input)',
                                    borderColor: isSubPending
                                      ? 'rgba(245, 158, 11, 0.25)'
                                      : isSubVerified
                                      ? 'rgba(16, 185, 129, 0.25)'
                                      : 'var(--border)',
                                  }}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>
                                      {subItem.title || subItem.details?.cert_name || subItem.details?.name || 'Activity Submission'}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      {isSubVerified && (
                                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded text-emerald-500 bg-emerald-500/10">
                                          ✓ {Number(subItem.awarded_marks || 0).toFixed(1)}m Awarded
                                        </span>
                                      )}
                                      {isSubPending && (
                                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded text-amber-500 bg-amber-500/10">
                                          ⏳ Claimed ({Number(subItem.details?.calculated_marks || 0).toFixed(1)}m)
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Render details metadata */}
                                  <SubmissionDetails details={subItem.details} />

                                  {/* Proof documents */}
                                  {proofDocs.length > 0 && (
                                    <div className="pt-1.5 flex flex-wrap gap-2 items-center border-t" style={{ borderColor: 'var(--border)' }}>
                                      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Proof Document:</span>
                                      {proofDocs.map((doc, docIdx) => (
                                        <a
                                          key={docIdx}
                                          href={doc.publicUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                                          style={{
                                            backgroundColor: 'var(--bg-card)',
                                            borderColor: 'var(--border)',
                                            color: 'var(--text-primary)',
                                          }}
                                        >
                                          <FileText size={11} style={{ color: 'var(--green-text)' }} />
                                          {doc.fileName || 'View Document'}
                                          <ExternalLink size={10} />
                                        </a>
                                      ))}
                                    </div>
                                  )}

                                  {/* If pending, button to jump to ledger to verify */}
                                  {isSubPending && (
                                    <div className="pt-2 flex justify-end">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveView('ledger');
                                          setTab('pending');
                                        }}
                                        className="px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer border inline-flex items-center gap-1.5 text-amber-500 border-amber-500/30 hover:bg-amber-500/10 transition-colors"
                                      >
                                        <Clock size={11} />
                                        Review & Award Claim in Ledger ↗
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-3 rounded text-[11px] italic" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}>
                            No activity or claims logged under this category yet.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* View Mode 2: Placement Claims Ledger & Verification */}
            {activeView === 'ledger' && (
              <div className="space-y-4">
                {/* Header & Tabs */}
                <div
              className="p-4 rounded-[var(--radius-lg)] border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border)',
              }}
            >
              <div>
                <h2 className="text-base font-semibold m-0" style={{ color: 'var(--text-primary)' }}>
                  Placement Claims Ledger
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Evaluation ledger for {studentName} ({submissions.length} total claims)
                </p>
              </div>

              {/* Tab Switcher */}
              <div
                className="flex items-center gap-1 p-1 rounded-[var(--radius)] border shrink-0 text-xs"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border)',
                }}
              >
                {[
                  { id: 'all', label: 'All' },
                  { id: 'pending', label: 'Pending' },
                  { id: 'verified', label: 'Verified' },
                  { id: 'rejected', label: 'Rejected' },
                ].map((t) => {
                  const isActive = tab === t.id;
                  const count =
                    t.id === 'all'
                      ? submissions.length
                      : submissions.filter((s) => (s.status || '').toUpperCase() === t.id.toUpperCase()).length;

                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      className={`px-2.5 py-1 rounded cursor-pointer font-medium transition-all ${
                        isActive
                          ? 'font-semibold'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                      style={{
                        backgroundColor: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                        color: isActive ? 'var(--sidebar-active-text)' : 'inherit',
                      }}
                    >
                      {t.label} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submissions List */}
            {filtered.length === 0 ? (
              <div
                className="text-center p-10 rounded-[var(--radius-lg)] border"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border)',
                }}
              >
                <FileText size={32} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                <p className="text-xs m-0" style={{ color: 'var(--text-muted)' }}>
                  No submissions in this category tab.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((sub) => {
                  const isPending = (sub.status || '').toUpperCase() === 'PENDING';
                  const isVerified = (sub.status || '').toUpperCase() === 'VERIFIED';
                  const isRejected = (sub.status || '').toUpperCase() === 'REJECTED';
                  const state = actionState[sub.id] || {};
                  const isBusy = state.busy || false;

                  const maxMarks = sub.category?.max_marks || 10;
                  const defaultMarks = sub.awarded_marks || sub.details?.calculated_marks || 0;
                  const currentMarks = state.marks !== undefined ? state.marks : defaultMarks;
                  const currentNote = state.note !== undefined ? state.note : (sub.verifier_notes || '');

                  return (
                    <div
                      key={sub.id}
                      className="p-4 rounded-[var(--radius-lg)] border transition-all"
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        borderColor: isPending
                          ? 'rgba(245, 158, 11, 0.4)'
                          : isVerified
                          ? 'rgba(16, 185, 129, 0.4)'
                          : 'var(--border)',
                      }}
                    >
                      {/* Submission Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider"
                            style={{
                              backgroundColor: 'var(--bg-input)',
                              color: 'var(--text-secondary)',
                              border: '1px solid var(--border)',
                            }}
                          >
                            {sub.category?.title || sub.category_id}
                          </span>
                          <span className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>
                            {sub.title}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider"
                            style={{
                              backgroundColor: isVerified
                                ? 'rgba(16, 185, 129, 0.15)'
                                : isPending
                                ? 'rgba(245, 158, 11, 0.15)'
                                : 'rgba(239, 68, 68, 0.15)',
                              color: isVerified
                                ? 'var(--green-text)'
                                : isPending
                                ? 'var(--amber-text)'
                                : 'var(--red-text, #EF4444)',
                            }}
                          >
                            {sub.status}
                          </span>

                          <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                            {new Date(sub.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Details & Proof */}
                      <SubmissionDetails details={sub.details} />

                      {/* Stacked Proof Documents with Preview Buttons */}
                      {(() => {
                        const docs = extractAllDocuments(sub);
                        if (docs.length === 0) return null;
                        return (
                          <div className="pt-2.5 pb-1 space-y-1.5 border-t" style={{ borderColor: 'var(--border)' }}>
                            <span className="text-[11px] font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                              <FileText size={12} />
                              <span>Attached Documents ({docs.length}):</span>
                            </span>
                            <div className="space-y-1.5">
                              {docs.map((doc, idx) => (
                                <div
                                  key={doc.id || idx}
                                  className="p-2 rounded border flex items-center justify-between gap-3 text-xs"
                                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <FileText size={13} style={{ color: 'var(--green-text)' }} />
                                    <span className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                      {doc.fileName}
                                    </span>
                                    {doc.fileSize > 0 && (
                                      <span className="text-[10px] shrink-0" style={{ color: 'var(--text-muted)' }}>
                                        ({formatFileSize(doc.fileSize)})
                                      </span>
                                    )}
                                  </div>
                                  {doc.publicUrl && (
                                    <a
                                      href={doc.publicUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border hover:underline shrink-0"
                                      style={{
                                        backgroundColor: 'var(--bg-card)',
                                        borderColor: 'var(--border)',
                                        color: 'var(--green-text)',
                                      }}
                                    >
                                      <ExternalLink size={10} />
                                      <span>Preview ↗</span>
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Marks and Notes Row */}
                      <div className="mt-3 pt-2 text-xs flex flex-wrap items-center justify-between gap-2 border-t" style={{ borderColor: 'var(--border)' }}>
                        <div className="flex items-center gap-4">
                          <span>
                            <span style={{ color: 'var(--text-muted)' }}>Claimed: </span>
                            <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>
                              {sub.details?.calculated_marks ?? sub.awarded_marks ?? 0}m
                            </strong>
                          </span>

                          <span>
                            <span style={{ color: 'var(--text-muted)' }}>Awarded: </span>
                            <strong
                              className="font-mono font-bold"
                              style={{
                                color: isVerified ? 'var(--green-text)' : 'var(--text-primary)',
                              }}
                            >
                              {sub.awarded_marks ?? 0} / {maxMarks}m
                            </strong>
                          </span>
                        </div>

                        {sub.verifier_notes && !isPending && (
                          <div className="text-[11px] italic" style={{ color: 'var(--text-secondary)' }}>
                            Faculty note: {sub.verifier_notes}
                          </div>
                        )}
                      </div>

                      {/* If PENDING: Inline Faculty Action Controls */}
                      {isPending && (
                        <div
                          className="mt-3 pt-3 border-t flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3"
                          style={{ borderColor: 'var(--border)' }}
                        >
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                            <div className="flex items-center gap-2 shrink-0">
                              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                                Marks:
                              </label>
                              <input
                                type="number"
                                min="0"
                                max={maxMarks}
                                step="0.5"
                                disabled={isBusy}
                                value={currentMarks}
                                onChange={(e) => handleMarksChange(sub.id, e.target.value)}
                                className="w-16 px-2 py-1 text-xs rounded border font-mono font-bold text-center outline-none"
                                style={{
                                  backgroundColor: 'var(--bg-input)',
                                  borderColor: 'var(--border)',
                                  color: 'var(--text-primary)',
                                }}
                              />
                            </div>

                            <input
                              type="text"
                              placeholder="Faculty feedback / reason..."
                              disabled={isBusy}
                              value={currentNote}
                              onChange={(e) => handleNoteChange(sub.id, e.target.value)}
                              className="w-full px-3 py-1 text-xs rounded border outline-none"
                              style={{
                                backgroundColor: 'var(--bg-input)',
                                borderColor: 'var(--border)',
                                color: 'var(--text-primary)',
                              }}
                            />
                          </div>

                          <div className="flex items-center gap-2 shrink-0 justify-end">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleReject(sub)}
                              className="px-3 py-1.5 rounded text-xs font-semibold cursor-pointer border flex items-center gap-1"
                              style={{
                                backgroundColor: 'var(--bg-input)',
                                borderColor: 'rgba(239, 68, 68, 0.4)',
                                color: 'var(--red-text, #EF4444)',
                                opacity: isBusy ? 0.6 : 1,
                              }}
                            >
                              <XCircle size={13} />
                              Reject
                            </button>

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleVerify(sub)}
                              className="px-3.5 py-1.5 rounded text-xs font-semibold cursor-pointer text-white flex items-center gap-1"
                              style={{
                                backgroundColor: 'var(--green)',
                                opacity: isBusy ? 0.6 : 1,
                              }}
                            >
                              {isBusy ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                              Verify & Award
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
