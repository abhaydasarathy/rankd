import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { getFacultyPendingSubmissions, verifySubmission, rejectSubmission } from '../../services';
import Toast from '../../components/Toast';
import {
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle,
  XCircle,
  ExternalLink,
  Clock,
  User,
  AlertCircle,
  Loader2,
  FileText,
} from 'lucide-react';

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
      className="submission-details grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs py-3 border-t border-b"
      style={{ borderColor: 'var(--border)' }}
    >
      {entries.map(([key, val]) => (
        <div
          key={key}
          className="detail-row flex items-baseline justify-between gap-2 p-2 rounded"
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

export default function FacultyPendingQueue() {
  const { user, profile } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest'
  const [actionState, setActionState] = useState({}); // { [submissionId]: { marks, note, busy } }
  const [toast, setToast] = useState(null);

  const showToast = (type, message, title = 'Queue Action') => {
    setToast({ title, message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadQueue = async () => {
    if (!user?.id) return;
    try {
      const data = await getFacultyPendingSubmissions(user.id);
      setSubmissions(data || []);
    } catch (err) {
      console.error('Failed to load pending queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [user?.id]);

  // Realtime subscription — refresh queue when submissions change
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('faculty-pending-queue-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_submissions',
        },
        () => {
          loadQueue();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const filtered = submissions.filter((sub) => {
    const studentName = sub.student?.name || sub.student?.full_name || '';
    const regNo = sub.student?.reg_no || '';
    const matchSearch =
      !search ||
      studentName.toLowerCase().includes(search.toLowerCase()) ||
      regNo.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'all' || sub.category_id === categoryFilter;
    return matchSearch && matchCat;
  });

  const sorted = [...filtered].sort((a, b) => {
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();
    return sortBy === 'oldest' ? timeA - timeB : timeB - timeA;
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
        studentId: sub.student_id,
        categoryTitle: sub.category?.title || sub.category_id,
      });
      setSubmissions((prev) => prev.filter((s) => s.id !== sub.id));
      showToast(
        'success',
        `Verified — ${marks}m awarded to ${sub.student?.name || 'student'}.`,
        'Submission Verified'
      );
    } catch (err) {
      showToast('error', err.message || 'Failed to verify submission', 'Action Failed');
    } finally {
      setActionState((prev) => ({ ...prev, [sub.id]: { ...prev[sub.id], busy: false } }));
    }
  }

  async function handleReject(sub) {
    const state = actionState[sub.id] || {};
    const note = state.note || '';
    if (!note.trim()) {
      showToast('error', 'You must provide a rejection reason in the faculty note.', 'Reason Required');
      return;
    }

    setActionState((prev) => ({ ...prev, [sub.id]: { ...prev[sub.id], busy: true } }));
    try {
      await rejectSubmission({
        submissionId: sub.id,
        facultyId: user.id,
        verifierNotes: note,
        studentId: sub.student_id,
        categoryTitle: sub.category?.title || sub.category_id,
      });
      setSubmissions((prev) => prev.filter((s) => s.id !== sub.id));
      showToast(
        'success',
        `Rejected — ${sub.student?.name || 'Student'} has been notified in their inbox.`,
        'Submission Rejected'
      );
    } catch (err) {
      showToast('error', err.message || 'Failed to reject submission', 'Action Failed');
    } finally {
      setActionState((prev) => ({ ...prev, [sub.id]: { ...prev[sub.id], busy: false } }));
    }
  }

  // Extract unique category options for filter
  const categoryOptions = Array.from(
    new Set(submissions.map((s) => s.category_id).filter(Boolean))
  );

  return (
    <div className="page-content w-full p-4 sm:p-6 lg:p-7 min-w-0">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            Verification Queue
          </h1>
          <span
            className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono"
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              color: 'var(--amber-text)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            {submissions.length} Pending
          </span>
        </div>
        <span
          className="px-3 py-1 rounded text-xs font-medium border self-start sm:self-auto flex items-center gap-1.5"
          style={{
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-secondary)',
            borderColor: 'var(--border)',
          }}
        >
          Coordinating: <strong style={{ color: 'var(--text-primary)' }}>{profile?.section || 'All Sections'}</strong>
        </span>
      </div>

      {/* Filter & Search Bar */}
      <div
        className="p-3.5 rounded-[var(--radius-lg)] border mb-6 flex flex-col md:flex-row items-center gap-3"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            placeholder="Search by student name or register number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-[var(--radius)] border outline-none"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-48">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-[var(--radius)] border outline-none cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="all">All Categories</option>
              {categoryOptions.map((catId) => (
                <option key={catId} value={catId}>
                  {catId.replace(/-/g, ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="relative md:w-36">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-[var(--radius)] border outline-none cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 gap-3">
          <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'var(--green)' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Loading verification queue...
          </span>
        </div>
      ) : sorted.length === 0 ? (
        <div
          className="text-center p-12 rounded-[var(--radius-lg)] border"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border)',
          }}
        >
          <CheckCircle size={36} className="mx-auto mb-3" style={{ color: 'var(--green)' }} />
          <h3 className="text-base font-semibold m-0" style={{ color: 'var(--text-primary)' }}>
            All Clear!
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {search || categoryFilter !== 'all'
              ? 'No pending claims match your filters.'
              : 'No pending submissions from your mapped students.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map((sub) => {
            const state = actionState[sub.id] || {};
            const defaultMarks =
              sub.awarded_marks !== undefined && sub.awarded_marks > 0
                ? sub.awarded_marks
                : sub.details?.calculated_marks || 0;
            const currentMarks = state.marks !== undefined ? state.marks : defaultMarks;
            const currentNote = state.note || '';
            const maxMarks = sub.category?.max_marks || 10;
            const isBusy = state.busy || false;

            const studentName = sub.student?.name || sub.student?.full_name || 'SRM Student';
            const studentRegNo = sub.student?.reg_no || '—';
            const studentDept = sub.student?.department || 'CSE';
            const studentSection = sub.student?.section || '';
            const initials =
              studentName
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((n) => n[0].toUpperCase())
                .join('') || 'S';

            const submittedTime = new Date(sub.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={sub.id}
                className="p-5 rounded-[var(--radius-lg)] border transition-all"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border)',
                }}
              >
                {/* Header: Student Profile Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border"
                      style={{
                        backgroundColor: 'var(--green-light)',
                        color: 'var(--green-text)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      {initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                          {studentName}
                        </span>
                        <span className="font-mono text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                          {studentRegNo}
                        </span>
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {studentDept} {studentSection && `• Section ${studentSection.replace(/^Section\s*/i, '')}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="px-2.5 py-1 rounded text-[11px] font-semibold uppercase tracking-wider"
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {sub.category?.title || sub.category_id}
                    </span>
                    <span className="text-[11px] flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                      <Clock size={12} />
                      {submittedTime}
                    </span>
                  </div>
                </div>

                {/* Submission Title */}
                <div className="mb-3">
                  <h4 className="text-xs font-semibold m-0" style={{ color: 'var(--text-secondary)' }}>
                    Claim: {sub.title}
                  </h4>
                </div>

                {/* Readable Key-Value Details */}
                <SubmissionDetails details={sub.details} />

                {/* Stacked Proof Documents with Preview Buttons */}
                {(() => {
                  const docs = extractAllDocuments(sub);
                  if (docs.length === 0) return null;
                  return (
                    <div className="py-3 space-y-2 border-b" style={{ borderColor: 'var(--border)' }}>
                      <span className="text-[11px] font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                        <FileText size={12} />
                        <span>Attached Document Stack ({docs.length}):</span>
                      </span>
                      <div className="space-y-1.5">
                        {docs.map((doc, idx) => (
                          <div
                            key={doc.id || idx}
                            className="p-2.5 rounded border flex items-center justify-between gap-3 text-xs"
                            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText size={14} style={{ color: 'var(--green-text)' }} />
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
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold border hover:underline shrink-0"
                                style={{
                                  backgroundColor: 'var(--bg-card)',
                                  borderColor: 'var(--border)',
                                  color: 'var(--green-text)',
                                }}
                              >
                                <ExternalLink size={11} />
                                <span>Preview Document ↗</span>
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Faculty Evaluation Bar */}
                <div
                  className="mt-4 pt-3.5 border-t flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                    {/* Marks to award */}
                    <div className="flex items-center gap-2 shrink-0">
                      <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                        Marks to award:
                      </label>
                      <div className="flex items-center gap-1">
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
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          / {maxMarks}
                        </span>
                      </div>
                    </div>

                    {/* Faculty Note */}
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Faculty note (required if rejecting)..."
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
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 justify-end">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleReject(sub)}
                      className="px-3 py-1.5 rounded text-xs font-semibold cursor-pointer border transition-colors flex items-center gap-1.5"
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        borderColor: 'rgba(239, 68, 68, 0.4)',
                        color: 'var(--red-text, #EF4444)',
                        opacity: isBusy ? 0.6 : 1,
                      }}
                    >
                      <XCircle size={14} />
                      Reject
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleVerify(sub)}
                      className="px-4 py-1.5 rounded text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 text-white"
                      style={{
                        backgroundColor: 'var(--green)',
                        opacity: isBusy ? 0.6 : 1,
                      }}
                    >
                      {isBusy ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <CheckCircle size={14} />
                      )}
                      Verify & Award {currentMarks}m
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
