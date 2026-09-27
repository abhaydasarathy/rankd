import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FolderGit2,
  CheckCircle2,
  ExternalLink,
  Plus,
  Trash2,
  Globe,
  Loader2,
  AlertCircle,
  Code2,
  Tag,
  Edit3,
  FileText,
} from 'lucide-react';
import GithubIcon from './GithubIcon';
import MetricWorkspaceShell from './MetricWorkspaceShell';
import URLField from './URLField';
import EvidenceUploader from './EvidenceUploader';
import { calculateProjectsScore } from '../../utils/scoringEngine';

export default function ProjectsWorkspace({
  isOpen,
  onClose,
  studentProfile,
  submissions = [],
  verifiedScore = 0,
  scoreResult,
  onSubmitProof,
  showToast,
}) {
  const projectSubs = useMemo(() => {
    return (submissions || []).filter(
      (s) => s.category_id === 'projects' || s.categoryId === 'projects'
    );
  }, [submissions]);

  const verifiedSubs = useMemo(() => {
    return projectSubs.filter((s) => s.status === 'VERIFIED' || s.status === 'Verified');
  }, [projectSubs]);

  const pendingSubs = useMemo(() => {
    return projectSubs.filter((s) => s.status === 'PENDING' || s.status === 'Pending');
  }, [projectSubs]);

  const rejectedSubs = useMemo(() => {
    return projectSubs.filter((s) => s.status === 'REJECTED' || s.status === 'Rejected');
  }, [projectSubs]);

  const lifecycleStatus = useMemo(() => {
    if (pendingSubs.length > 0) return 'PENDING';
    if (verifiedSubs.length > 0 || verifiedScore > 0) return 'VERIFIED';
    if (rejectedSubs.length > 0) return 'REJECTED';
    return 'UNCLAIMED';
  }, [verifiedSubs, pendingSubs, rejectedSubs, verifiedScore]);

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [projectType, setProjectType] = useState('WEB');
  const [description, setDescription] = useState('');
  const [techStack, setTechStack] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [proofDocuments, setProofDocuments] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [showRubricInfo, setShowRubricInfo] = useState(false);

  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setShowAddForm(projectSubs.length === 0);
      setTitle('');
      setProjectType('WEB');
      setDescription('');
      setTechStack('');
      setGithubUrl('');
      setLiveUrl('');
      setDemoUrl('');
      setProofDocuments([]);
      setFormError('');
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, projectSubs.length]);

  // Format existing records
  const existingRecords = useMemo(() => {
    return projectSubs.map((sub) => {
      const d = sub.details || {};
      const docs = Array.isArray(d.proofDocuments) && d.proofDocuments.length > 0
        ? d.proofDocuments
        : Array.isArray(d.documents) && d.documents.length > 0
        ? d.documents
        : Array.isArray(d.files) && d.files.length > 0
        ? d.files
        : sub.proof_url
        ? [{ fileName: d.fileName || 'Project_Report.pdf', publicUrl: sub.proof_url }]
        : [];
      return {
        id: sub.id,
        title: d.title || sub.title,
        projectType: d.projectType || d.type || 'WEB',
        description: d.description || '',
        techStack: d.techStack || d.technologies || d.tech || d.stack || '',
        githubUrl: d.githubUrl || d.github_url || '',
        liveUrl: d.liveUrl || d.live_url || '',
        demoUrl: d.demoUrl || d.demo_url || '',
        proofDocuments: docs,
        status: sub.status,
        awardedMarks: sub.awarded_marks || sub.awardedMarks || 0,
        calculatedMarks: d.calculated_marks || 0,
        verifierNotes: sub.verifier_notes || '',
        submittedAt: sub.submitted_at || sub.created_at,
      };
    });
  }, [projectSubs]);

  // Score projection for new project
  const newProjectMarks = useMemo(() => {
    const t = projectType.toUpperCase();
    if (t.includes('IIT') || t.includes('NIT') || t.includes('DRDO')) return 5;
    if (t.includes('GOVT') || t.includes('GOVERNMENT')) return 4;
    if (t.includes('WEB') || t.includes('MOBILE')) return 3;
    if (t.includes('MINI_HIGH')) return 2;
    return 1;
  }, [projectType]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!title.trim()) {
      setFormError('Please enter the project title.');
      return;
    }
    if (!description.trim()) {
      setFormError('Please enter a brief description of the project.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const primaryUrl = proofDocuments[0]?.publicUrl || null;
      const payload = {
        title: `${title.trim()} (${projectType})`,
        details: {
          title: title.trim(),
          projectType,
          type: projectType,
          description: description.trim(),
          techStack: techStack.trim(),
          githubUrl: githubUrl.trim(),
          liveUrl: liveUrl.trim(),
          demoUrl: demoUrl.trim(),
          calculated_marks: newProjectMarks,
          proofDocuments: proofDocuments.map((d) => ({
            id: d.id,
            fileName: d.fileName,
            fileSize: d.fileSize,
            fileType: d.fileType,
            publicUrl: d.publicUrl,
            uploadedAt: d.uploadedAt,
          })),
        },
        proof_url: primaryUrl,
        proofUrl: primaryUrl,
        awarded_marks: newProjectMarks,
        status: 'PENDING',
      };

      await onSubmitProof('projects', payload);
      showToast?.('Project Submitted', `${title} submitted for faculty inspection.`, 'success');
      setShowAddForm(false);
      setTitle('');
      setDescription('');
      setTechStack('');
      setGithubUrl('');
      setLiveUrl('');
      setDemoUrl('');
      setProofDocuments([]);
    } catch (err) {
      console.error('Project submission error:', err);
      setFormError(err.message || 'Failed to submit project.');
      showToast?.('Submission Error', err.message || 'Failed to submit project.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MetricWorkspaceShell
      isOpen={isOpen}
      onClose={onClose}
      categoryTitle="PROJECTS DONE"
      categoryDescription="Capstone, sponsored, deployed & mini projects contribute up to 5 marks."
      maxMarks={5}
      icon={FolderGit2}
      verifiedScore={verifiedScore}
      lifecycleStatus={lifecycleStatus}
      rejectedNotes={rejectedSubs[0]?.verifier_notes}
      pendingClaimedMarks={pendingSubs[0]?.details?.calculated_marks}
      rubricText="IIT / NIT / DRDO Sponsored (5m) • Government / Institutional (4m) • Web / Mobile App (3m) • High-Quality Mini Project (2m) • Standard Mini Project (1m) • Max 3 Projects Evaluated (5m Capacity)"
      showRubricInfo={showRubricInfo}
      onToggleRubricInfo={() => setShowRubricInfo((prev) => !prev)}
    >
      {/* Existing Project Records */}
      {existingRecords.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
              Submitted Projects ({existingRecords.length})
            </h3>
            {!showAddForm && existingRecords.length < 3 && (
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
                <span>Add Another Project</span>
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
                      <FolderGit2 size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                          {item.title}
                        </h4>
                        <span className="text-xs px-2 py-0.5 rounded font-mono bg-[var(--bg-input)] border" style={{ borderColor: 'var(--border)' }}>
                          {item.projectType}
                        </span>
                      </div>
                      {item.techStack && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>Tech:</span>
                          {item.techStack.split(',').map((tech, tIdx) => (
                            <span
                              key={tIdx}
                              className="px-2 py-0.5 rounded text-[10px] font-mono font-medium border"
                              style={{
                                backgroundColor: 'var(--bg-input)',
                                borderColor: 'var(--border)',
                                color: 'var(--green-text)',
                              }}
                            >
                              {tech.trim()}
                            </span>
                          ))}
                        </div>
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
                        Pending Inspection (+{item.calculatedMarks}m)
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

                {/* Attached Proof Documents Stack */}
                {item.proofDocuments && item.proofDocuments.length > 0 && (
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

                {/* Inspectable Project URLs */}
                {(item.githubUrl || item.liveUrl || item.demoUrl) && (
                  <div className="pt-2 border-t flex flex-wrap items-center gap-2.5" style={{ borderColor: 'var(--border)' }}>
                    {item.githubUrl && (
                      <a
                        href={item.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-[var(--radius-sm)] border hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      >
                        <GithubIcon size={13} />
                        <span>View Repository</span>
                        <ExternalLink size={11} style={{ color: 'var(--text-muted)' }} />
                      </a>
                    )}

                    {item.liveUrl && (
                      <a
                        href={item.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-[var(--radius-sm)] border hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--green-text)' }}
                      >
                        <Globe size={13} />
                        <span>Open Live App</span>
                        <ExternalLink size={11} />
                      </a>
                    )}

                    {item.demoUrl && (
                      <a
                        href={item.demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-[var(--radius-sm)] border hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: '#60A5FA' }}
                      >
                        <span>Demo / Video</span>
                        <ExternalLink size={11} />
                      </a>
                    )}
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
                New Project Record
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
                  Project Name / Title <span className="text-emerald-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Distributed Task Scheduler, SRM Portal"
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
                  Project Scope & Tier
                </label>
                <select
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[var(--radius)] border text-xs cursor-pointer focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="IIT/DRDO">Tier 1: IIT / NIT / DRDO Sponsored (5 Marks)</option>
                  <option value="GOVT">Tier 2: Government / Institutional Project (4 Marks)</option>
                  <option value="WEB">Tier 3: Web / Mobile Application (3 Marks)</option>
                  <option value="MINI_HIGH">Tier 4: Mini Project (High Quality / Deployed) (2 Marks)</option>
                  <option value="MINI">Tier 5: Standard Mini / Coursework Project (1 Mark)</option>
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Technologies Used
                </label>
                <input
                  type="text"
                  value={techStack}
                  onChange={(e) => setTechStack(e.target.value)}
                  placeholder="e.g. React, Node.js, PostgreSQL, Docker, AWS"
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
                  Project Summary & Architecture <span className="text-emerald-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the system architecture, core functionality, problem solved, and key achievements..."
                  className="w-full px-3.5 py-2 rounded-[var(--radius)] border text-xs focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>

            {/* Inspectable Project URLs */}
            <div className="pt-2 border-t space-y-3" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                  Direct Inspection Links
                </h4>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Provide repository or live deployment URLs for faculty evaluation. No document upload required.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <URLField
                  label="GitHub Repository"
                  value={githubUrl}
                  onChange={setGithubUrl}
                  placeholder="https://github.com/username/project"
                  previewLabel="View Repository ↗"
                  icon={GithubIcon}
                  optional={true}
                />

                <URLField
                  label="Hosted / Live Website"
                  value={liveUrl}
                  onChange={setLiveUrl}
                  placeholder="https://myproject.vercel.app"
                  previewLabel="Open Live App ↗"
                  icon={Globe}
                  optional={true}
                />
              </div>
            </div>

            {/* Supporting Evidence Upload */}
            <EvidenceUploader
              documents={proofDocuments}
              onDocumentsChange={setProofDocuments}
              studentId={studentProfile?.id || studentProfile?.regNo || 'student-demo'}
              title="PROJECT REPORT / CODE ARTIFACTS"
              required={false}
              helperText="Attach Project Synopsis, Architecture Diagram, or Sponsored Letter (Optional, Max 10MB each)"
            />
          </div>

          {/* Projected Marks */}
          <div className="p-4 rounded-[var(--radius)] border bg-[var(--bg-card)] flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Projected Record Marks:
            </span>
            <span className="text-base font-bold font-mono" style={{ color: 'var(--green-text)' }}>
              +{newProjectMarks} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/ 5 Marks</span>
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
                  <span>Submitting Project...</span>
                </>
              ) : (
                <span>Submit Project Record (+{newProjectMarks}m)</span>
              )}
            </button>
          </div>
        </form>
      )}
    </MetricWorkspaceShell>
  );
}
