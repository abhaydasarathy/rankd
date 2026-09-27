import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Trophy,
  CheckCircle2,
  ExternalLink,
  Plus,
  Trash2,
  Calendar,
  Users,
  Award,
  Loader2,
  AlertCircle,
  FileText,
  Edit3,
} from 'lucide-react';
import MetricWorkspaceShell from './MetricWorkspaceShell';
import EvidenceUploader from './EvidenceUploader';
import { calculateHackathonScore } from '../../utils/scoringEngine';

export default function HackathonsWorkspace({
  isOpen,
  onClose,
  studentProfile,
  submissions = [],
  verifiedScore = 0,
  scoreResult,
  onSubmitProof,
  showToast,
}) {
  const hackathonSubs = useMemo(() => {
    return (submissions || []).filter(
      (s) => s.category_id === 'hackathons' || s.categoryId === 'hackathons'
    );
  }, [submissions]);

  const verifiedSubs = useMemo(() => {
    return hackathonSubs.filter((s) => s.status === 'VERIFIED' || s.status === 'Verified');
  }, [hackathonSubs]);

  const pendingSubs = useMemo(() => {
    return hackathonSubs.filter((s) => s.status === 'PENDING' || s.status === 'Pending');
  }, [hackathonSubs]);

  const rejectedSubs = useMemo(() => {
    return hackathonSubs.filter((s) => s.status === 'REJECTED' || s.status === 'Rejected');
  }, [hackathonSubs]);

  const lifecycleStatus = useMemo(() => {
    if (pendingSubs.length > 0) return 'PENDING';
    if (verifiedSubs.length > 0 || verifiedScore > 0) return 'VERIFIED';
    if (rejectedSubs.length > 0) return 'REJECTED';
    return 'UNCLAIMED';
  }, [verifiedSubs, pendingSubs, rejectedSubs, verifiedScore]);

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [eventName, setEventName] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [placement, setPlacement] = useState('1st Prize');
  const [eventDate, setEventDate] = useState('');
  const [teamSize, setTeamSize] = useState('4');
  const [projectTitle, setProjectTitle] = useState('');
  const [description, setDescription] = useState('');
  const [proofDocuments, setProofDocuments] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [showRubricInfo, setShowRubricInfo] = useState(false);

  const prevIsOpenRef = useRef(false);
  const studentId = studentProfile?.id || studentProfile?.regNo || 'student-demo';

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setShowAddForm(hackathonSubs.length === 0);
      setEventName('');
      setOrganizer('');
      setPlacement('1st Prize');
      setEventDate('');
      setTeamSize('4');
      setProjectTitle('');
      setDescription('');
      setProofDocuments([]);
      setFormError('');
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, hackathonSubs.length]);

  // Existing records from submissions
  const existingRecords = useMemo(() => {
    return hackathonSubs.map((sub) => {
      const d = sub.details || {};
      const docs = Array.isArray(d.proofDocuments) && d.proofDocuments.length > 0
        ? d.proofDocuments
        : Array.isArray(d.documents) && d.documents.length > 0
        ? d.documents
        : Array.isArray(d.files) && d.files.length > 0
        ? d.files
        : sub.proof_url
        ? [{ fileName: d.fileName || 'Award_Certificate.pdf', publicUrl: sub.proof_url }]
        : [];
      return {
        id: sub.id,
        eventName: d.eventName || d.event || sub.title,
        organizer: d.organizer || '',
        placement: d.prize || d.placement || 'Participation',
        eventDate: d.eventDate || '',
        projectTitle: d.projectTitle || '',
        proofDocuments: docs,
        status: sub.status,
        awardedMarks: sub.awarded_marks || sub.awardedMarks || 0,
        calculatedMarks: d.calculated_marks || 0,
        verifierNotes: sub.verifier_notes || '',
        submittedAt: sub.submitted_at || sub.created_at,
      };
    });
  }, [hackathonSubs]);

  // Projected marks for current placement
  const newEventMarks = useMemo(() => {
    const p = placement.toUpperCase();
    if (p.includes('1') || p.includes('FIRST') || p.includes('WINNER')) return 5;
    if (p.includes('2') || p.includes('SECOND') || p.includes('RUNNER')) return 4;
    if (p.includes('3') || p.includes('THIRD')) return 3;
    return 1;
  }, [placement]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!eventName.trim()) {
      setFormError('Please enter the hackathon / competition name.');
      return;
    }
    if (proofDocuments.length === 0) {
      setFormError('Please attach your winner, finalist, or participation certificate.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const primaryDocUrl = proofDocuments[0]?.publicUrl || null;

      const payload = {
        title: `${eventName.trim()} (${placement})`,
        details: {
          eventName: eventName.trim(),
          event: eventName.trim(),
          organizer: organizer.trim(),
          prize: placement,
          placement: placement,
          eventDate,
          teamSize: Number(teamSize) || 1,
          projectTitle: projectTitle.trim(),
          description: description.trim(),
          calculated_marks: newEventMarks,
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
        awarded_marks: newEventMarks,
        status: 'PENDING',
      };

      await onSubmitProof('hackathons', payload);
      showToast?.('Hackathon Submitted', `${eventName} recorded for verification.`, 'success');
      setShowAddForm(false);
      setEventName('');
      setOrganizer('');
      setProjectTitle('');
      setDescription('');
      setProofDocuments([]);
    } catch (err) {
      console.error('Hackathon submission error:', err);
      setFormError(err.message || 'Failed to submit hackathon record.');
      showToast?.('Submission Error', err.message || 'Failed to submit hackathon record.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MetricWorkspaceShell
      isOpen={isOpen}
      onClose={onClose}
      categoryTitle="COMPETITIONS & HACKATHONS"
      categoryDescription="National & international hackathon awards and participation contribute up to 10 marks."
      maxMarks={10}
      icon={Trophy}
      verifiedScore={verifiedScore}
      lifecycleStatus={lifecycleStatus}
      rejectedNotes={rejectedSubs[0]?.verifier_notes}
      pendingClaimedMarks={pendingSubs[0]?.details?.calculated_marks}
      rubricText="1st Prize / Winner: 5m • 2nd Prize / Runner Up: 4m • 3rd Prize: 3m • Finalist / Participation: 1m • Max 4 Events Evaluated (10m Capacity)"
      showRubricInfo={showRubricInfo}
      onToggleRubricInfo={() => setShowRubricInfo((prev) => !prev)}
    >
      {/* Existing Hackathon Records */}
      {existingRecords.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
              Competition History ({existingRecords.length})
            </h3>
            {!showAddForm && existingRecords.length < 4 && (
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
                <span>Add Another Event</span>
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
                      <Trophy size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                          {item.eventName}
                        </h4>
                        <span className="text-xs px-2 py-0.5 rounded font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                          {item.placement}
                        </span>
                      </div>
                      {item.organizer && (
                        <span className="text-[11px] block mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          Organizer: {item.organizer}
                        </span>
                      )}
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
                        Pending Verification (+{item.calculatedMarks}m)
                      </span>
                    )}
                    {item.status === 'REJECTED' && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-red-400 bg-red-500/10 border border-red-500/20">
                        Changes Requested
                      </span>
                    )}
                  </div>
                </div>

                {/* Attached Proofs with Preview Buttons */}
                {item.proofDocuments.length > 0 && (
                  <div className="pt-2 border-t flex flex-wrap items-center gap-2" style={{ borderColor: 'var(--border)' }}>
                    <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                      Official Certificate Proofs:
                    </span>
                    {item.proofDocuments.map((doc, idx) => (
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
            ))}
          </div>
        </div>
      )}

      {/* Add Hackathon Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-5 rounded-[var(--radius-lg)] border space-y-4" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                New Hackathon / Competition Record
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
                  Event / Hackathon Name <span className="text-emerald-500">*</span>
                </label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="e.g. Smart India Hackathon, SRM Hack'24"
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
                  Award / Placement Tier
                </label>
                <select
                  value={placement}
                  onChange={(e) => setPlacement(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[var(--radius)] border text-xs cursor-pointer focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="1st Prize">1st Prize / Winner (5 Marks)</option>
                  <option value="2nd Prize">2nd Prize / Runner Up (4 Marks)</option>
                  <option value="3rd Prize">3rd Prize / 2nd Runner Up (3 Marks)</option>
                  <option value="Participation">Finalist / Official Participation (1 Mark)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Organizing Institution / Company
                </label>
                <input
                  type="text"
                  value={organizer}
                  onChange={(e) => setOrganizer(e.target.value)}
                  placeholder="e.g. AICTE, Google, Major League Hacking"
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
                  Team Size
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[var(--radius)] border text-xs focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Winning Solution / Project Summary
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your hackathon solution, track, problem solved, and key features..."
                  className="w-full px-3.5 py-2 rounded-[var(--radius)] border text-xs focus:outline-none"
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
              title="OFFICIAL CERTIFICATE EVIDENCE"
              required={true}
              helperText="Upload official winner, runner-up, or participation certificate PDF/image"
            />
          </div>

          {/* Projected Marks */}
          <div className="p-4 rounded-[var(--radius)] border bg-[var(--bg-card)] flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Projected Event Marks:
            </span>
            <span className="text-base font-bold font-mono" style={{ color: 'var(--green-text)' }}>
              +{newEventMarks} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/ 10 Marks</span>
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
                  <span>Submitting Hackathon...</span>
                </>
              ) : (
                <span>Submit Hackathon Record (+{newEventMarks}m)</span>
              )}
            </button>
          </div>
        </form>
      )}
    </MetricWorkspaceShell>
  );
}
