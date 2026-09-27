import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CheckSquare,
  CheckCircle2,
  ExternalLink,
  Calendar,
  Loader2,
  AlertCircle,
  FileText,
  TrendingUp,
  Award,
  Edit3,
  Clock,
} from 'lucide-react';
import MetricWorkspaceShell from './MetricWorkspaceShell';
import EvidenceUploader from './EvidenceUploader';
import { calculateAssessmentScore } from '../../utils/scoringEngine';

export default function AssessmentsWorkspace({
  isOpen,
  onClose,
  studentProfile,
  submissions = [],
  verifiedScore = 0,
  scoreResult,
  onSubmitProof,
  showToast,
}) {
  const assessmentSubs = useMemo(() => {
    return (submissions || []).filter(
      (s) => s.category_id === 'assessments' || s.categoryId === 'assessments'
    );
  }, [submissions]);

  const verifiedSub = useMemo(() => {
    return assessmentSubs.find((s) => s.status === 'VERIFIED' || s.status === 'Verified');
  }, [assessmentSubs]);

  const pendingSub = useMemo(() => {
    return assessmentSubs.find((s) => s.status === 'PENDING' || s.status === 'Pending');
  }, [assessmentSubs]);

  const rejectedSub = useMemo(() => {
    return assessmentSubs.find((s) => s.status === 'REJECTED' || s.status === 'Rejected');
  }, [assessmentSubs]);

  const lifecycleStatus = useMemo(() => {
    if (pendingSub) return 'PENDING';
    if (verifiedSub || verifiedScore > 0) return 'VERIFIED';
    if (rejectedSub) return 'REJECTED';
    return 'UNCLAIMED';
  }, [verifiedSub, pendingSub, rejectedSub, verifiedScore]);

  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [assessmentType, setAssessmentType] = useState('SHL');
  const [rawScore, setRawScore] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const [testDate, setTestDate] = useState('');
  const [proofDocuments, setProofDocuments] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [showRubricInfo, setShowRubricInfo] = useState(false);

  const prevIsOpenRef = useRef(false);
  const studentId = studentProfile?.id || studentProfile?.regNo || 'student-demo';

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setIsUpdateMode(false);
      setFormError('');

      const activeSub = verifiedSub || pendingSub || rejectedSub;
      const d = activeSub?.details || {};

      if (d.rawScore || d.score || d.raw_score || activeSub?.title) {
        setAssessmentType(d.assessmentType || 'SHL');
        const sc = d.rawScore ?? d.raw_score ?? d.score ?? '';
        setRawScore(sc !== '' ? String(sc) : '');
        setCandidateId(d.candidateId || '');
        setTestDate(d.testDate || '');
        const docs = Array.isArray(d.proofDocuments) && d.proofDocuments.length > 0
          ? d.proofDocuments
          : Array.isArray(d.documents) && d.documents.length > 0
          ? d.documents
          : Array.isArray(d.files) && d.files.length > 0
          ? d.files
          : activeSub?.proof_url
          ? [{ fileName: d.fileName || 'Assessment_Scorecard.pdf', publicUrl: activeSub.proof_url }]
          : [];
        setProofDocuments(docs);
      } else {
        setAssessmentType('SHL');
        setRawScore('');
        setCandidateId('');
        setTestDate('');
        setProofDocuments([]);
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, verifiedSub, pendingSub, rejectedSub]);

  // Live Score Calculator using scoringEngine
  const liveScore = useMemo(() => {
    const num = parseFloat(rawScore) || 0;
    return calculateAssessmentScore(num);
  }, [rawScore]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const num = parseFloat(rawScore);
    if (isNaN(num) || num < 0 || num > 100) {
      setFormError('Please enter a valid assessment score between 0 and 100.');
      return;
    }
    if (proofDocuments.length === 0) {
      setFormError('Please attach your official diagnostic scorecard or institutional assessment report.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const primaryDocUrl = proofDocuments[0]?.publicUrl || null;

      const payload = {
        title: `${assessmentType} Assessment (${num} / 100)`,
        details: {
          assessmentType,
          rawScore: num,
          score: num,
          raw_score: num,
          candidateId: candidateId.trim(),
          testDate,
          calculated_marks: liveScore.score,
          proofDocuments: proofDocuments.map((d) => ({
            id: d.id,
            fileName: d.fileName,
            fileSize: d.fileSize,
            fileType: d.fileType,
            publicUrl: d.publicUrl,
            uploadedAt: d.uploadedAt,
          })),
        },
        proof_url: primaryDocUrl,
        proofUrl: primaryDocUrl,
        awarded_marks: liveScore.score,
        status: 'PENDING',
      };

      await onSubmitProof('assessments', payload);
      showToast?.('Scorecard Submitted', `${assessmentType} score (${num}%) recorded for verification.`, 'success');
      setIsUpdateMode(false);
    } catch (err) {
      console.error('Assessment submission error:', err);
      setFormError(err.message || 'Failed to submit assessment scorecard.');
      showToast?.('Submission Error', err.message || 'Failed to submit assessment.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const isReadOnly = (lifecycleStatus === 'VERIFIED' || lifecycleStatus === 'PENDING') && !isUpdateMode;
  const isPending = lifecycleStatus === 'PENDING';
  const activeSub = pendingSub || verifiedSub || rejectedSub;
  const activeDetails = activeSub?.details || {};

  return (
    <MetricWorkspaceShell
      isOpen={isOpen}
      onClose={onClose}
      categoryTitle="SHL / TALENT / NCET ASSESSMENT"
      categoryDescription="Standardized institutional placement diagnostic test scores contribute up to 10 marks."
      maxMarks={10}
      icon={CheckSquare}
      verifiedScore={verifiedScore}
      lifecycleStatus={lifecycleStatus}
      rejectedNotes={rejectedSub?.verifier_notes}
      pendingClaimedMarks={pendingSub?.details?.calculated_marks}
      rubricText="90-100% (10m) • 80-89% (9m) • 70-79% (8m) • 65-69% (7m) • 60-64% (6m) • 55-59% (5m) • 50-54% (4m) • 40-49% (3m) • 30-39% (2m) • 25-29% (1m)"
      showRubricInfo={showRubricInfo}
      onToggleRubricInfo={() => setShowRubricInfo((prev) => !prev)}
      pendingAttachedDetails={
        isPending && (activeDetails.assessmentType || activeDetails.score || activeDetails.rawScore) ? (
          <span className="font-semibold text-xs px-2.5 py-0.5 rounded bg-[var(--bg-input)] border" style={{ borderColor: 'var(--border)' }}>
            {activeDetails.assessmentType || 'Diagnostic'} Scorecard ({activeDetails.rawScore || activeDetails.score || 0}%)
            {activeDetails.candidateId ? ` • ID: ${activeDetails.candidateId}` : ''}
          </span>
        ) : null
      }
    >
      {/* Read-Only State (Verified or In Review) */}
      {isReadOnly ? (
        <div className="space-y-6">
          <div
            className="p-5 rounded-[var(--radius-lg)] border space-y-4"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: isPending ? 'rgba(245, 158, 11, 0.35)' : 'rgba(34, 197, 94, 0.25)',
            }}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {isPending ? (
                  <Clock size={18} className="text-amber-500 shrink-0" />
                ) : (
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                )}
                <div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    {isPending ? 'Diagnostic Scorecard In Verification Queue' : 'Verified Diagnostic Scorecard'}
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {isPending
                      ? 'Official score submitted and currently awaiting verification by the career development center.'
                      : 'Official score verified by the career development center.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsUpdateMode(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-[var(--radius)] border cursor-pointer hover:opacity-90 transition-opacity"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border)',
                  color: isPending ? 'var(--amber-text)' : 'var(--green-text)',
                }}
              >
                <Edit3 size={13} />
                <span>{isPending ? 'Request Scorecard Change →' : 'Submit New Scorecard →'}</span>
              </button>
            </div>

            {/* Scorecard Summary Card */}
            <div
              className="p-4 rounded-[var(--radius)] border bg-[var(--bg-card)] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
                  style={{
                    backgroundColor: isPending ? 'rgba(245, 158, 11, 0.15)' : 'var(--green-light)',
                    color: isPending ? 'var(--amber-text)' : 'var(--green-text)',
                  }}
                >
                  <TrendingUp size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                      {activeDetails.assessmentType || 'SHL'} Assessment
                    </h4>
                    <span
                      className="text-xs px-2 py-0.5 rounded font-mono bg-[var(--bg-input)] border"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      {activeDetails.rawScore || activeDetails.score || 0} / 100
                    </span>
                  </div>
                  <span className="text-xs block mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Candidate ID: {activeDetails.candidateId || 'SRM Verified'}
                  </span>
                </div>
              </div>

              {isPending ? (
                <span className="text-xs font-bold font-mono px-3 py-1 rounded-full text-amber-400 bg-amber-500/10 border border-amber-500/20 self-start sm:self-center">
                  +{activeDetails.calculated_marks ?? liveScore.score} / 10 Marks (Under Review)
                </span>
              ) : (
                <span className="text-sm font-bold font-mono px-3 py-1 rounded-full text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 self-start sm:self-center">
                  +{verifiedScore} / 10 Marks
                </span>
              )}
            </div>

            {/* Attached Proof Documents Vault */}
            {proofDocuments.length > 0 && (
              <div className="pt-2 border-t flex flex-wrap items-center gap-2" style={{ borderColor: 'var(--border)' }}>
                <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                  {isPending ? 'Attached Scorecard Documents Vault:' : 'Verified Diagnostic Scorecard Files:'}
                </span>
                {proofDocuments.map((doc, idx) => (
                  <a
                    key={doc.id || idx}
                    href={doc.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded bg-[var(--bg-input)] border hover:opacity-80 transition-opacity"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  >
                    <FileText size={12} style={{ color: isPending ? 'var(--amber-text)' : 'var(--green-text)' }} />
                    <span className="truncate max-w-[150px]">{doc.fileName}</span>
                    <ExternalLink size={10} style={{ color: 'var(--text-muted)' }} />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Edit Mode */
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-5 rounded-[var(--radius-lg)] border space-y-4" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                Diagnostic Test Details
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Enter your test score and attach the official PDF report card for placement committee verification.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Diagnostic Assessment Battery
                </label>
                <select
                  value={assessmentType}
                  onChange={(e) => setAssessmentType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[var(--radius)] border text-xs cursor-pointer focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="SHL">SHL Institutional Diagnostic Battery</option>
                  <option value="Talent">Talent Discovery Diagnostic Assessment</option>
                  <option value="NCET">N.C.E.T National Employability Assessment</option>
                  <option value="CDC Diagnostic">CDC Departmental Mock Diagnostic</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Raw Assessment Score / Percentile (0 to 100) <span className="text-emerald-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={rawScore}
                  onChange={(e) => setRawScore(e.target.value)}
                  placeholder="e.g. 88.5"
                  className="w-full px-3.5 py-2.5 rounded-[var(--radius)] border text-xs font-mono focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Candidate ID / Hall Ticket (Optional)
                </label>
                <input
                  type="text"
                  value={candidateId}
                  onChange={(e) => setCandidateId(e.target.value)}
                  placeholder="e.g. SHL-2024-8192"
                  className="w-full px-3.5 py-2.5 rounded-[var(--radius)] border text-xs focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Test Date (Optional)
                </label>
                <input
                  type="date"
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[var(--radius)] border text-xs focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>

            {/* Evidence Uploader */}
            <EvidenceUploader
              documents={proofDocuments}
              onDocumentsChange={setProofDocuments}
              studentId={studentId}
              title="OFFICIAL ASSESSMENT SCORECARD"
              required={true}
              helperText="Upload official PDF diagnostic scorecard or test completion summary"
            />
          </div>

          {/* Live Score Projection */}
          <div className="p-4 rounded-[var(--radius)] border bg-[var(--bg-card)] flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: 'var(--text-secondary)' }}>
                Official Rubric Marks Projection:
              </span>
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Based on score: {rawScore ? `${rawScore}%` : '0%'}
              </span>
            </div>
            <span className="text-base font-bold font-mono" style={{ color: 'var(--green-text)' }}>
              +{liveScore.score} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/ 10 Marks</span>
            </span>
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
                  <span>Submitting Scorecard...</span>
                </>
              ) : (
                <span>Submit Assessment Record (+{liveScore.score}m)</span>
              )}
            </button>
          </div>
        </form>
      )}
    </MetricWorkspaceShell>
  );
}
