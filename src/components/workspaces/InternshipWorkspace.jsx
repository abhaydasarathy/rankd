import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Briefcase,
  CheckCircle2,
  ExternalLink,
  Plus,
  Trash2,
  Building,
  Calendar,
  DollarSign,
  Loader2,
  AlertCircle,
  FileText,
  Clock,
  Edit3,
} from 'lucide-react';
import MetricWorkspaceShell from './MetricWorkspaceShell';
import EvidenceUploader from './EvidenceUploader';
import { calculateInternshipScore } from '../../utils/scoringEngine';

export default function InternshipWorkspace({
  isOpen,
  onClose,
  studentProfile,
  submissions = [],
  verifiedScore = 0,
  scoreResult,
  onSubmitProof,
  showToast,
}) {
  const internshipSubs = useMemo(() => {
    return (submissions || []).filter(
      (s) => s.category_id === 'internship' || s.categoryId === 'internship'
    );
  }, [submissions]);

  const verifiedSubs = useMemo(() => {
    return internshipSubs.filter((s) => s.status === 'VERIFIED' || s.status === 'Verified');
  }, [internshipSubs]);

  const pendingSubs = useMemo(() => {
    return internshipSubs.filter((s) => s.status === 'PENDING' || s.status === 'Pending');
  }, [internshipSubs]);

  const rejectedSubs = useMemo(() => {
    return internshipSubs.filter((s) => s.status === 'REJECTED' || s.status === 'Rejected');
  }, [internshipSubs]);

  const lifecycleStatus = useMemo(() => {
    if (pendingSubs.length > 0) return 'PENDING';
    if (verifiedSubs.length > 0 || verifiedScore > 0) return 'VERIFIED';
    if (rejectedSubs.length > 0) return 'REJECTED';
    return 'UNCLAIMED';
  }, [verifiedSubs, pendingSubs, rejectedSubs, verifiedScore]);

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('');
  const [tier, setTier] = useState('Fortune 500');
  const [durationMonths, setDurationMonths] = useState('3');
  const [isPaid, setIsPaid] = useState(false);
  const [description, setDescription] = useState('');
  const [proofDocuments, setProofDocuments] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [showRubricInfo, setShowRubricInfo] = useState(false);

  const prevIsOpenRef = useRef(false);
  const studentId = studentProfile?.id || studentProfile?.regNo || 'student-demo';

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setShowAddForm(internshipSubs.length === 0);
      setCompanyName('');
      setRole('');
      setTier('Fortune 500');
      setDurationMonths('3');
      setIsPaid(false);
      setDescription('');
      setProofDocuments([]);
      setFormError('');
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, internshipSubs.length]);

  // Extract all existing records from submissions
  const existingRecords = useMemo(() => {
    return internshipSubs.map((sub) => {
      const d = sub.details || {};
      const docs = Array.isArray(d.proofDocuments) && d.proofDocuments.length > 0
        ? d.proofDocuments
        : Array.isArray(d.documents) && d.documents.length > 0
        ? d.documents
        : Array.isArray(d.files) && d.files.length > 0
        ? d.files
        : sub.proof_url
        ? [{ fileName: d.fileName || 'Internship_Certificate.pdf', publicUrl: sub.proof_url }]
        : [];
      return {
        id: sub.id,
        companyName: d.companyName || d.company || sub.title,
        role: d.role || 'Intern',
        tier: d.tier || 'Standard',
        durationMonths: Number(d.durationMonths || d.duration || 1),
        isPaid: Boolean(d.isPaid),
        description: d.description || '',
        proofDocuments: docs,
        status: sub.status,
        awardedMarks: sub.awarded_marks || sub.awardedMarks || 0,
        calculatedMarks: d.calculated_marks || 0,
        verifierNotes: sub.verifier_notes || '',
        submittedAt: sub.submitted_at || sub.created_at,
      };
    });
  }, [internshipSubs]);

  // Live calculation for the new record
  const currentItemScore = useMemo(() => {
    const dur = Number(durationMonths) || 0;
    return calculateInternshipScore([{ tier, isPaid, durationMonths: dur }]).total;
  }, [durationMonths, tier, isPaid]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!companyName.trim()) {
      setFormError('Please enter the organization / company name.');
      return;
    }
    if (proofDocuments.length === 0) {
      setFormError('Please attach at least one verification document (offer letter or internship certificate).');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const dur = Number(durationMonths) || 1;
      const primaryDocUrl = proofDocuments[0]?.publicUrl || null;

      const payload = {
        title: `${companyName} (${tier}) — ${dur} Mo${dur > 1 ? 's' : ''}`,
        details: {
          companyName: companyName.trim(),
          company: companyName.trim(),
          role: role.trim() || 'Intern',
          tier,
          durationMonths: dur,
          duration: dur,
          isPaid,
          description: description.trim(),
          calculated_marks: currentItemScore,
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
        awarded_marks: currentItemScore,
        status: 'PENDING',
      };

      await onSubmitProof('internship', payload);
      showToast?.('Internship Submitted', `${companyName} record added for review.`, 'success');
      setShowAddForm(false);
      setCompanyName('');
      setRole('');
      setDescription('');
      setProofDocuments([]);
    } catch (err) {
      console.error('Internship submission error:', err);
      setFormError(err.message || 'Failed to submit internship record.');
      showToast?.('Submission Error', err.message || 'Failed to submit internship.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MetricWorkspaceShell
      isOpen={isOpen}
      onClose={onClose}
      categoryTitle="INTERNSHIP EXPERIENCE"
      categoryDescription="Tier 1/SRM placement, Fortune 500, startup & paid internships contribute up to 10 marks."
      maxMarks={10}
      icon={Briefcase}
      verifiedScore={verifiedScore}
      lifecycleStatus={lifecycleStatus}
      rejectedNotes={rejectedSubs[0]?.verifier_notes}
      pendingClaimedMarks={pendingSubs[0]?.details?.calculated_marks}
      rubricText="Duration ≥3 Mo: IIT/NIT/SRM (5m), Fortune 500 (4m), Startup/Small Co (3m) • Duration <3 Mo (2m) • Paid Internship Bonus: +1m (capped at 5m per internship) • Max Capacity: 10 Marks"
      showRubricInfo={showRubricInfo}
      onToggleRubricInfo={() => setShowRubricInfo((prev) => !prev)}
    >
      {/* Existing Internship Records Stack */}
      {existingRecords.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
              Internship History ({existingRecords.length})
            </h3>
            {!showAddForm && (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-[var(--radius)] border cursor-pointer hover:opacity-90 transition-opacity"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border)',
                  color: 'var(--green-text)',
                }}
              >
                <Plus size={13} />
                <span>Add Another Internship</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {existingRecords.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-[var(--radius-lg)] border bg-[var(--bg-card)] space-y-3"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: 'var(--green-light)', color: 'var(--green-text)' }}
                    >
                      <Briefcase size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                          {item.companyName}
                        </h4>
                        <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                          • {item.role}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                        <span className="px-2 py-0.5 rounded bg-[var(--bg-input)] border" style={{ borderColor: 'var(--border)' }}>
                          {item.tier}
                        </span>
                        <span>{item.durationMonths} Months</span>
                        {item.isPaid && (
                          <span className="px-2 py-0.5 rounded font-semibold text-emerald-400 bg-emerald-500/10">
                            Paid (+1m)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === 'VERIFIED' && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                        ✓ Verified (+{item.awardedMarks || item.calculatedMarks}m)
                      </span>
                    )}
                    {item.status === 'PENDING' && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-amber-400 bg-amber-500/10 border border-amber-500/20">
                        Pending Review (+{item.calculatedMarks}m)
                      </span>
                    )}
                    {item.status === 'REJECTED' && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-red-400 bg-red-500/10 border border-red-500/20">
                        Changes Requested
                      </span>
                    )}
                  </div>
                </div>

                {item.description && (
                  <p className="text-xs leading-relaxed px-1" style={{ color: 'var(--text-secondary)' }}>
                    {item.description}
                  </p>
                )}

                {/* Stacked Proof Documents with Preview Buttons */}
                {item.proofDocuments.length > 0 && (
                  <div className="pt-2 border-t flex flex-wrap items-center gap-2" style={{ borderColor: 'var(--border)' }}>
                    <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                      Attached Proofs ({item.proofDocuments.length}):
                    </span>
                    {item.proofDocuments.map((doc, idx) => (
                      <a
                        key={doc.id || idx}
                        href={doc.publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded bg-[var(--bg-input)] border hover:opacity-80 transition-opacity"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      >
                        <FileText size={12} style={{ color: 'var(--green-text)' }} />
                        <span className="truncate max-w-[160px]">{doc.fileName}</span>
                        <ExternalLink size={10} style={{ color: 'var(--text-muted)' }} />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Internship Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          <div className="p-5 rounded-[var(--radius-lg)] border space-y-4" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                New Internship Record
              </h3>
              {existingRecords.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs font-semibold hover:underline"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Cancel
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Company / Organization Name <span className="text-emerald-500">*</span>
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Microsoft, Zoho, Cisco"
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
                  Role / Domain
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Software Engineering Intern"
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
                  Company Tier & Categorization
                </label>
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[var(--radius)] border text-xs cursor-pointer focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="IIT/NIT/SRM">Tier 1: IIT / NIT / SRM Placement Cell (5m)</option>
                  <option value="Fortune 500">Tier 2: Fortune 500 / Global Enterprise (4m)</option>
                  <option value="Small / Mid Co">Tier 3: Startup / Small to Mid Company (3m)</option>
                  <option value="< 3 Months">Tier 4: Short-term / Foundation (&lt;3 Months) (2m)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Duration (Months)
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[var(--radius)] border text-xs focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>

            {/* Paid Internship Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                id="isPaidCheck"
                type="checkbox"
                checked={isPaid}
                onChange={(e) => setIsPaid(e.target.checked)}
                className="w-4 h-4 rounded border cursor-pointer accent-emerald-500"
              />
              <label htmlFor="isPaidCheck" className="text-xs font-semibold cursor-pointer" style={{ color: 'var(--text-primary)' }}>
                Stipendiary / Paid Internship <span className="font-normal text-[11px]" style={{ color: 'var(--green-text)' }}>(+1 Mark Stipend Bonus)</span>
              </label>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                Description & Key Contributions
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe your responsibilities, technologies used, and outcomes..."
                className="w-full px-3.5 py-2 rounded-[var(--radius)] border text-xs focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* Evidence Uploader */}
            <EvidenceUploader
              documents={proofDocuments}
              onDocumentsChange={setProofDocuments}
              studentId={studentId}
              title="INTERNSHIP PROOF DOCUMENTS"
              required={true}
              helperText="Attach Offer Letter, Completion Certificate, or Experience Letter (Max 10MB each)"
            />
          </div>

          {/* Live Simulator Pill */}
          <div className="p-4 rounded-[var(--radius)] border bg-[var(--bg-card)] flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Projected Record Marks:
            </span>
            <span className="text-base font-bold font-mono" style={{ color: 'var(--green-text)' }}>
              +{currentItemScore} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/ 10 Marks</span>
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

          <div className="flex items-center justify-end gap-3 pt-2">
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
                  <span>Submitting Internship...</span>
                </>
              ) : (
                <span>Submit Internship Record (+{currentItemScore}m)</span>
              )}
            </button>
          </div>
        </form>
      )}
    </MetricWorkspaceShell>
  );
}
