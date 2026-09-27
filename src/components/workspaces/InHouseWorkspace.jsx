import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  Plus,
  Trash2,
  UserCheck,
  Calendar,
  Loader2,
  AlertCircle,
  FileText,
  Building,
  Edit3,
} from 'lucide-react';
import MetricWorkspaceShell from './MetricWorkspaceShell';
import EvidenceUploader from './EvidenceUploader';
import { calculateInhouseScore } from '../../utils/scoringEngine';

export default function InHouseWorkspace({
  isOpen,
  onClose,
  studentProfile,
  submissions = [],
  verifiedScore = 0,
  scoreResult,
  onSubmitProof,
  showToast,
}) {
  const inhouseSubs = useMemo(() => {
    return (submissions || []).filter(
      (s) => s.category_id === 'inhouse-projects' || s.categoryId === 'inhouse-projects'
    );
  }, [submissions]);

  const verifiedSubs = useMemo(() => {
    return inhouseSubs.filter((s) => s.status === 'VERIFIED' || s.status === 'Verified');
  }, [inhouseSubs]);

  const pendingSubs = useMemo(() => {
    return inhouseSubs.filter((s) => s.status === 'PENDING' || s.status === 'Pending');
  }, [inhouseSubs]);

  const rejectedSubs = useMemo(() => {
    return inhouseSubs.filter((s) => s.status === 'REJECTED' || s.status === 'Rejected');
  }, [inhouseSubs]);

  const lifecycleStatus = useMemo(() => {
    if (pendingSubs.length > 0) return 'PENDING';
    if (verifiedSubs.length > 0 || verifiedScore > 0) return 'VERIFIED';
    if (rejectedSubs.length > 0) return 'REJECTED';
    return 'UNCLAIMED';
  }, [verifiedSubs, pendingSubs, rejectedSubs, verifiedScore]);

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [projectTitle, setProjectTitle] = useState('');
  const [facultyMentor, setFacultyMentor] = useState('');
  const [department, setDepartment] = useState('CSE Core');
  const [university, setUniversity] = useState('SRMIST Kattankulathur');
  const [academicYear, setAcademicYear] = useState('2024-2025');
  const [description, setDescription] = useState('');
  const [proofDocuments, setProofDocuments] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [showRubricInfo, setShowRubricInfo] = useState(false);

  const prevIsOpenRef = useRef(false);
  const studentId = studentProfile?.id || studentProfile?.regNo || 'student-demo';

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setShowAddForm(inhouseSubs.length === 0);
      setProjectTitle('');
      setFacultyMentor('');
      setDepartment(studentProfile?.department || 'CSE Core');
      setUniversity('SRMIST Kattankulathur');
      setAcademicYear('2024-2025');
      setDescription('');
      setProofDocuments([]);
      setFormError('');
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, inhouseSubs.length, studentProfile]);

  // Existing records from submissions
  const existingRecords = useMemo(() => {
    return inhouseSubs.map((sub) => {
      const d = sub.details || {};
      const docs = Array.isArray(d.proofDocuments) && d.proofDocuments.length > 0
        ? d.proofDocuments
        : Array.isArray(d.documents) && d.documents.length > 0
        ? d.documents
        : Array.isArray(d.files) && d.files.length > 0
        ? d.files
        : sub.proof_url
        ? [{ fileName: d.fileName || 'InHouse_Report.pdf', publicUrl: sub.proof_url }]
        : [];
      return {
        id: sub.id,
        projectTitle: d.title || sub.title,
        facultyMentor: d.facultyMentor || d.faculty || d.mentor || 'Faculty Guide',
        department: d.department || 'CSE',
        university: d.university || 'SRMIST',
        academicYear: d.academicYear || '',
        description: d.description || '',
        proofDocuments: docs,
        status: sub.status,
        awardedMarks: sub.awarded_marks || sub.awardedMarks || 0,
        calculatedMarks: d.calculated_marks || 4,
        verifierNotes: sub.verifier_notes || '',
        submittedAt: sub.submitted_at || sub.created_at,
      };
    });
  }, [inhouseSubs]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!projectTitle.trim()) {
      setFormError('Please enter the project name.');
      return;
    }
    if (!facultyMentor.trim()) {
      setFormError('Please enter the faculty mentor / guide name.');
      return;
    }
    if (proofDocuments.length === 0) {
      setFormError('Please upload your institutional project report, guide approval, or certificate.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const primaryDocUrl = proofDocuments[0]?.publicUrl || null;

      const payload = {
        title: `${projectTitle.trim()} (under ${facultyMentor.trim()})`,
        details: {
          title: projectTitle.trim(),
          facultyMentor: facultyMentor.trim(),
          faculty: facultyMentor.trim(),
          mentor: facultyMentor.trim(),
          department: department.trim(),
          university: university.trim(),
          academicYear,
          description: description.trim(),
          calculated_marks: 4,
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
        awarded_marks: 4,
        status: 'PENDING',
      };

      await onSubmitProof('inhouse-projects', payload);
      showToast?.('In-House Project Submitted', `${projectTitle} submitted for verification.`, 'success');
      setShowAddForm(false);
      setProjectTitle('');
      setFacultyMentor('');
      setDescription('');
      setProofDocuments([]);
    } catch (err) {
      console.error('In-house project submission error:', err);
      setFormError(err.message || 'Failed to submit in-house project.');
      showToast?.('Submission Error', err.message || 'Failed to submit in-house project.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MetricWorkspaceShell
      isOpen={isOpen}
      onClose={onClose}
      categoryTitle="IN-HOUSE PROJECTS"
      categoryDescription="Departmental lab, campus automation & faculty R&D projects contribute up to 8 marks."
      maxMarks={8}
      icon={Building2}
      verifiedScore={verifiedScore}
      lifecycleStatus={lifecycleStatus}
      rejectedNotes={rejectedSubs[0]?.verifier_notes}
      pendingClaimedMarks={pendingSubs[0]?.details?.calculated_marks}
      rubricText="SRMIST / Partner University Faculty R&D Project: 4 Marks per project • Max 2 Projects Evaluated (8m Capacity)"
      showRubricInfo={showRubricInfo}
      onToggleRubricInfo={() => setShowRubricInfo((prev) => !prev)}
    >
      {/* Rubric Ambiguity Institutional Note */}
      <div className="rubric-ambiguity-note" style={{
        padding: '10px 14px',
        background: 'var(--pending-bg)',
        border: '1px solid var(--amber)',
        borderRadius: 'var(--radius)',
        fontSize: '12px',
        color: 'var(--amber-text)',
        marginBottom: '12px'
      }}>
        ⚠ Note: The official rubric document lists "8 Marks" for this category (implying 2 projects × 4m) 
        but the description states "Maximum of 1 Project to be considered." 
        Currently allowing up to 2 projects pending clarification from the placement cell.
      </div>

      {/* Existing Project Records */}
      {existingRecords.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
              In-House Project Records ({existingRecords.length} of 2)
            </h3>
            {!showAddForm && existingRecords.length < 2 && (
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
                <span>Add Second In-House Project</span>
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
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        {item.projectTitle}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                        <span className="flex items-center gap-1">
                          <UserCheck size={11} style={{ color: 'var(--green-text)' }} />
                          <span>Mentor: {item.facultyMentor}</span>
                        </span>
                        <span>•</span>
                        <span>{item.department}</span>
                        <span>•</span>
                        <span>{item.university}</span>
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

                {item.description && (
                  <p className="text-xs leading-relaxed px-1" style={{ color: 'var(--text-secondary)' }}>
                    {item.description}
                  </p>
                )}

                {/* Attached Proofs with Preview Buttons */}
                {item.proofDocuments.length > 0 && (
                  <div className="pt-2 border-t flex flex-wrap items-center gap-2" style={{ borderColor: 'var(--border)' }}>
                    <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                      Attached Institutional Proofs:
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

      {/* Add Project Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-5 rounded-[var(--radius-lg)] border space-y-4" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                New In-House Project Record
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
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Project Title <span className="text-emerald-500">*</span>
                </label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="e.g. Automated Campus Parking Detection with Computer Vision"
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
                  Faculty Guide / Mentor <span className="text-emerald-500">*</span>
                </label>
                <input
                  type="text"
                  value={facultyMentor}
                  onChange={(e) => setFacultyMentor(e.target.value)}
                  placeholder="e.g. Dr. K. Ramesh, Associate Professor"
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
                  Department / Laboratory
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. CSE Core / AI Research Lab"
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
                  Institution
                </label>
                <input
                  type="text"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  placeholder="SRMIST Kattankulathur"
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
                  Academic Year
                </label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="2024-2025"
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
                  Project Objective & Deliverables
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summarize project scope, laboratory equipment utilized, and technical milestones..."
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
              title="INSTITUTIONAL PROJECT PROOF"
              required={true}
              helperText="Upload Faculty Guide Approval Letter, Project Report, or Departmental Certificate"
            />
          </div>

          {/* Projected Marks */}
          <div className="p-4 rounded-[var(--radius)] border bg-[var(--bg-card)] flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Projected Record Marks:
            </span>
            <span className="text-base font-bold font-mono" style={{ color: 'var(--green-text)' }}>
              +4.0 <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/ 4 Marks (Max 8m across 2 projects)</span>
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
                  <span>Submitting In-House Project...</span>
                </>
              ) : (
                <span>Submit In-House Project Record (+4m)</span>
              )}
            </button>
          </div>
        </form>
      )}
    </MetricWorkspaceShell>
  );
}
