import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Award,
  Loader2,
  AlertCircle,
  FileText,
  Calendar,
  CreditCard,
  Edit3,
  Clock,
} from 'lucide-react';
import MetricWorkspaceShell from './MetricWorkspaceShell';
import EvidenceUploader from './EvidenceUploader';
import { evaluateMembershipClaim, validateMembershipFormat } from '../../services';
import { calculateMembershipScore } from '../../utils/scoringEngine';

export default function MembershipWorkspace({
  isOpen,
  onClose,
  studentProfile,
  submissions = [],
  verifiedScore = 0,
  scoreResult,
  onSubmitProof,
  showToast,
}) {
  const membershipSubs = useMemo(() => {
    return (submissions || []).filter(
      (s) => s.category_id === 'membership' || s.categoryId === 'membership'
    );
  }, [submissions]);

  const verifiedSub = useMemo(() => {
    return membershipSubs.find((s) => s.status === 'VERIFIED' || s.status === 'Verified');
  }, [membershipSubs]);

  const pendingSub = useMemo(() => {
    return membershipSubs.find((s) => s.status === 'PENDING' || s.status === 'Pending');
  }, [membershipSubs]);

  const rejectedSub = useMemo(() => {
    return membershipSubs.find((s) => s.status === 'REJECTED' || s.status === 'Rejected');
  }, [membershipSubs]);

  const lifecycleStatus = useMemo(() => {
    if (pendingSub) return 'PENDING';
    if (verifiedSub || verifiedScore > 0) return 'VERIFIED';
    if (rejectedSub) return 'REJECTED';
    return 'UNCLAIMED';
  }, [verifiedSub, pendingSub, rejectedSub, verifiedScore]);

  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [organization, setOrganization] = useState('IEEE');
  const [chapter, setChapter] = useState('SRMIST Student Branch');
  const [membershipId, setMembershipId] = useState('');
  const [credentialUrl, setCredentialUrl] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [proofDocuments, setProofDocuments] = useState([]);

  const [evalResult, setEvalResult] = useState(null);
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

      if (d.organization || d.org || activeSub?.title) {
        setOrganization(d.organization || d.org || 'IEEE');
        setChapter(d.chapter || 'SRMIST Student Branch');
        setMembershipId(d.membershipId || d.membership_id || '');
        setCredentialUrl(d.credentialUrl || d.credential_url || '');
        setValidUntil(d.validUntil || '');
        const docs = Array.isArray(d.proofDocuments) && d.proofDocuments.length > 0
          ? d.proofDocuments
          : Array.isArray(d.documents) && d.documents.length > 0
          ? d.documents
          : Array.isArray(d.files) && d.files.length > 0
          ? d.files
          : activeSub?.proof_url
          ? [{ fileName: d.fileName || 'Membership_Certificate.pdf', publicUrl: activeSub.proof_url }]
          : [];
        setProofDocuments(docs);
      } else {
        setOrganization('IEEE');
        setChapter('SRMIST Student Branch');
        setMembershipId('');
        setCredentialUrl('');
        setValidUntil('');
        setProofDocuments([]);
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, verifiedSub, pendingSub, rejectedSub]);

  // Live evaluation of student branch roster
  useEffect(() => {
    if (!isOpen) return;
    let isSubscribed = true;
    evaluateMembershipClaim({
      organization,
      membershipId,
      credentialUrl,
      regNo: studentProfile?.reg_no || studentProfile?.regNo,
      studentName: studentProfile?.name || studentProfile?.fullName,
    }).then((res) => {
      if (isSubscribed) setEvalResult(res);
    });
    return () => {
      isSubscribed = false;
    };
  }, [isOpen, organization, membershipId, credentialUrl, studentProfile]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!membershipId.trim() && !credentialUrl.trim() && proofDocuments.length === 0) {
      setFormError('Please provide your Membership ID, credential link, or upload your certificate/card.');
      return;
    }

    if (membershipId.trim() && validateMembershipFormat) {
      const check = validateMembershipFormat(organization, membershipId.trim());
      if (!check.isValid && !credentialUrl.trim() && proofDocuments.length === 0) {
        setFormError(check.message);
        return;
      }
    }

    setSubmitting(true);
    setFormError('');

    try {
      const primaryDocUrl = proofDocuments[0]?.publicUrl || null;

      const payload = {
        title: `${organization} Member (ID: ${membershipId.trim() || 'Active'})`,
        details: {
          org: organization,
          organization,
          chapter: chapter.trim(),
          membershipId: membershipId.trim(),
          membership_id: membershipId.trim(),
          credentialUrl: credentialUrl.trim(),
          credential_url: credentialUrl.trim(),
          validUntil,
          calculated_marks: 2,
          systemVerification: evalResult,
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
        awarded_marks: 2,
        status: 'PENDING',
      };

      await onSubmitProof('membership', payload);
      showToast?.('Membership Submitted', `${organization} membership recorded for verification.`, 'success');
      setIsUpdateMode(false);
    } catch (err) {
      console.error('Membership submission error:', err);
      setFormError(err.message || 'Failed to submit membership.');
      showToast?.('Submission Error', err.message || 'Failed to submit membership.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const isReadOnly = (lifecycleStatus === 'VERIFIED' || lifecycleStatus === 'PENDING') && !isUpdateMode;
  const activeSub = pendingSub || verifiedSub || rejectedSub;
  const activeDetails = activeSub?.details || {};

  return (
    <MetricWorkspaceShell
      isOpen={isOpen}
      onClose={onClose}
      categoryTitle="PROFESSIONAL MEMBERSHIP"
      categoryDescription="Recognized international & national professional bodies contribute up to 2 marks."
      maxMarks={2}
      icon={ShieldCheck}
      verifiedScore={verifiedScore}
      lifecycleStatus={lifecycleStatus}
      rejectedNotes={rejectedSub?.verifier_notes}
      pendingClaimedMarks={pendingSub?.details?.calculated_marks || 2}
      pendingAttachedDetails={
        activeDetails.organization ? (
          <span className="font-semibold text-xs px-2.5 py-0.5 rounded bg-[var(--bg-input)] border" style={{ borderColor: 'var(--border)' }}>
            {activeDetails.organization} • {activeDetails.membershipId ? `ID: ${activeDetails.membershipId}` : 'Member'}
          </span>
        ) : null
      }
      rubricText="Active Membership in recognized professional bodies (IEEE, ACM, CSI, IET, ISTE) with valid certificate/card: 2 Marks"
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
              <div className="flex items-center gap-2">
                {lifecycleStatus === 'VERIFIED' ? (
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                ) : (
                  <Clock size={18} className="shrink-0" style={{ color: 'var(--amber-text)' }} />
                )}
                <div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    {lifecycleStatus === 'VERIFIED'
                      ? 'Verified Professional Membership'
                      : 'Membership Claim In Verification Queue'}
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {lifecycleStatus === 'VERIFIED'
                      ? 'Verified by departmental placement evaluation committee (+2 Marks).'
                      : 'Your membership credential and attached documents are awaiting faculty review.'}
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
                <span>Update Membership →</span>
              </button>
            </div>

            {/* Membership Card */}
            <div className="p-4 rounded-[var(--radius)] border bg-[var(--bg-card)] flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
                  style={{ backgroundColor: 'var(--green-light)', color: 'var(--green-text)' }}
                >
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                      {activeDetails.organization || 'IEEE'} Member
                    </h4>
                    <span className="text-xs px-2 py-0.5 rounded font-mono bg-[var(--bg-input)] border" style={{ borderColor: 'var(--border)' }}>
                      {activeDetails.membershipId ? `ID: ${activeDetails.membershipId}` : 'Verified'}
                    </span>
                  </div>
                  <span className="text-xs block mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Chapter: {activeDetails.chapter || 'SRMIST Student Branch'}
                  </span>
                </div>
              </div>

              <span className="text-xs font-semibold px-3 py-1 rounded-full text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 self-start sm:self-center">
                ✓ Full Marks Awarded (+2m)
              </span>
            </div>

            {/* Proof Documents Vault */}
            {proofDocuments.length > 0 && (
              <div className="pt-2 border-t flex flex-wrap items-center gap-2" style={{ borderColor: 'var(--border)' }}>
                <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                  Attached Membership Proofs:
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
                    <FileText size={12} style={{ color: 'var(--green-text)' }} />
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
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                  Membership Information
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Select your recognized technical society and enter your membership credential.
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Professional Body / Society
                </label>
                <select
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[var(--radius)] border text-xs cursor-pointer focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="IEEE">IEEE — Institute of Electrical and Electronics Engineers</option>
                  <option value="ACM">ACM — Association for Computing Machinery</option>
                  <option value="CSI">CSI — Computer Society of India</option>
                  <option value="IET">IET — Institution of Engineering and Technology</option>
                  <option value="ISTE">ISTE — Indian Society for Technical Education</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Student Chapter / Section
                </label>
                <input
                  type="text"
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  placeholder="e.g. SRMIST Student Branch"
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
                  Membership ID / Number
                </label>
                <input
                  type="text"
                  value={membershipId}
                  onChange={(e) => setMembershipId(e.target.value)}
                  placeholder="e.g. 98234120"
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
                  Digital Credential URL (Optional)
                </label>
                <input
                  type="url"
                  value={credentialUrl}
                  onChange={(e) => setCredentialUrl(e.target.value)}
                  placeholder="https://ieee.org/verify/..."
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
              title="MEMBERSHIP CARD / CERTIFICATE PROOF"
              required={!credentialUrl.trim() && !membershipId.trim()}
              helperText="Upload official e-card, membership receipt, or confirmation certificate"
            />
          </div>

          {/* Projected Marks */}
          <div className="p-4 rounded-[var(--radius)] border bg-[var(--bg-card)] flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Official Rubric Marks Allocation:
            </span>
            <span className="text-base font-bold font-mono" style={{ color: 'var(--green-text)' }}>
              +2.0 <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/ 2 Marks</span>
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
                  <span>Submitting Membership...</span>
                </>
              ) : (
                <span>Submit Membership Record (+2m)</span>
              )}
            </button>
          </div>
        </form>
      )}
    </MetricWorkspaceShell>
  );
}
