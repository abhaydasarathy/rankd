import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Award,
  CheckCircle2,
  ExternalLink,
  Plus,
  Trash2,
  Tag,
  Calendar,
  Loader2,
  AlertCircle,
  FileText,
  BadgeCheck,
  Edit3,
} from 'lucide-react';
import MetricWorkspaceShell from './MetricWorkspaceShell';
import EvidenceUploader from './EvidenceUploader';
import { calculateCertificationScore, getCertificationMarks } from '../../utils/scoringEngine';

export default function SkillsetWorkspace({
  isOpen,
  onClose,
  studentProfile,
  submissions = [],
  verifiedScore = 0,
  scoreResult,
  onSubmitProof,
  showToast,
}) {
  const certSubs = useMemo(() => {
    return (submissions || []).filter(
      (s) => s.category_id === 'skillset' || s.categoryId === 'skillset'
    );
  }, [submissions]);

  const verifiedSubs = useMemo(() => {
    return certSubs.filter((s) => s.status === 'VERIFIED' || s.status === 'Verified');
  }, [certSubs]);

  const pendingSubs = useMemo(() => {
    return certSubs.filter((s) => s.status === 'PENDING' || s.status === 'Pending');
  }, [certSubs]);

  const rejectedSubs = useMemo(() => {
    return certSubs.filter((s) => s.status === 'REJECTED' || s.status === 'Rejected');
  }, [certSubs]);

  const lifecycleStatus = useMemo(() => {
    if (pendingSubs.length > 0) return 'PENDING';
    if (verifiedSubs.length > 0 || verifiedScore > 0) return 'VERIFIED';
    if (rejectedSubs.length > 0) return 'REJECTED';
    return 'UNCLAIMED';
  }, [verifiedSubs, pendingSubs, rejectedSubs, verifiedScore]);

  // Active Tab: 'certifications' | 'skills'
  const [activeTab, setActiveTab] = useState('certifications');

  // Form State for Adding Certification
  const [showAddForm, setShowAddForm] = useState(false);
  const [certName, setCertName] = useState('');
  const [provider, setProvider] = useState('CISCO');
  const [credentialId, setCredentialId] = useState('');
  const [credentialUrl, setCredentialUrl] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [proofDocuments, setProofDocuments] = useState([]);

  // Skills Tag List
  const [skillsList, setSkillsList] = useState([]);
  const [newSkillInput, setNewSkillInput] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [showRubricInfo, setShowRubricInfo] = useState(false);

  const prevIsOpenRef = useRef(false);
  const studentId = studentProfile?.id || studentProfile?.regNo || 'student-demo';

  // Load existing records and skills
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setShowAddForm(certSubs.length === 0);
      setCertName('');
      setProvider('CISCO');
      setCredentialId('');
      setCredentialUrl('');
      setIssueDate('');
      setProofDocuments([]);
      setFormError('');

      // Find skills from existing submission details or student profile
      const priorSkills = certSubs[0]?.details?.skills || studentProfile?.skills || [];
      if (Array.isArray(priorSkills) && priorSkills.length > 0) {
        setSkillsList(priorSkills);
      } else {
        setSkillsList(['Python', 'Data Structures', 'SQL']);
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, certSubs, studentProfile]);

  // Existing records from submissions
  const existingRecords = useMemo(() => {
    return certSubs.map((sub) => {
      const d = sub.details || {};
      const docs = Array.isArray(d.proofDocuments) && d.proofDocuments.length > 0
        ? d.proofDocuments
        : Array.isArray(d.documents) && d.documents.length > 0
        ? d.documents
        : Array.isArray(d.files) && d.files.length > 0
        ? d.files
        : sub.proof_url
        ? [{ fileName: d.fileName || 'Certificate.pdf', publicUrl: sub.proof_url }]
        : [];
      return {
        id: sub.id,
        certName: d.certName || d.title || sub.title,
        provider: d.provider || 'Technical',
        credentialId: d.credentialId || '',
        credentialUrl: d.credentialUrl || '',
        issueDate: d.issueDate || '',
        proofDocuments: docs,
        status: sub.status,
        awardedMarks: sub.awarded_marks || sub.awardedMarks || 0,
        calculatedMarks: d.calculated_marks || 0,
        verifierNotes: sub.verifier_notes || '',
        submittedAt: sub.submitted_at || sub.created_at,
      };
    });
  }, [certSubs]);

  // Live Score Calculator using scoringEngine
  const liveScore = useMemo(() => {
    const list = existingRecords.map((r) => ({
      provider: r.provider,
      title: r.certName,
    }));
    return calculateCertificationScore(list);
  }, [existingRecords]);

  // Projected score for new cert
  const newCertMarks = useMemo(() => {
    return getCertificationMarks(provider);
  }, [provider]);

  const handleAddSkill = (e) => {
    e?.preventDefault();
    if (!newSkillInput.trim()) return;
    const clean = newSkillInput.trim();
    if (!skillsList.includes(clean)) {
      setSkillsList([...skillsList, clean]);
    }
    setNewSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkillsList(skillsList.filter((s) => s !== skillToRemove));
  };

  const handleSubmitCert = async (e) => {
    e?.preventDefault();
    if (!certName.trim()) {
      setFormError('Please enter the certificate or examination title.');
      return;
    }
    if (proofDocuments.length === 0 && !credentialUrl.trim()) {
      setFormError('Please upload your certificate document or provide a verifiable credential link.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const primaryDocUrl = proofDocuments[0]?.publicUrl || null;

      const payload = {
        title: `${certName} (${provider})`,
        details: {
          certName: certName.trim(),
          title: certName.trim(),
          provider,
          credentialId: credentialId.trim(),
          credentialUrl: credentialUrl.trim(),
          issueDate,
          skills: skillsList,
          calculated_marks: newCertMarks,
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
        awarded_marks: newCertMarks,
        status: 'PENDING',
      };

      await onSubmitProof('skillset', payload);
      showToast?.('Certificate Submitted', `${certName} submitted for verification.`, 'success');
      setShowAddForm(false);
      setCertName('');
      setCredentialId('');
      setCredentialUrl('');
      setIssueDate('');
      setProofDocuments([]);
    } catch (err) {
      console.error('Certificate submission error:', err);
      setFormError(err.message || 'Failed to submit certificate.');
      showToast?.('Submission Error', err.message || 'Failed to submit certificate.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MetricWorkspaceShell
      isOpen={isOpen}
      onClose={onClose}
      categoryTitle="SKILLSET & CERTIFICATIONS"
      categoryDescription="Global vendor certifications & professional accreditations contribute up to 15 marks."
      maxMarks={15}
      icon={Award}
      verifiedScore={verifiedScore}
      lifecycleStatus={lifecycleStatus}
      rejectedNotes={rejectedSubs[0]?.verifier_notes}
      pendingClaimedMarks={pendingSubs[0]?.details?.calculated_marks}
      rubricText="Global Vendor (CISCO, CCNA, CCNP, MCNA, MCNP, Matlab, RedHat, IBM): 5m • NPTEL: 3m • Coursera: 2m • Programming (C, C++, Java, Python): 1m • Udemy: 0.5m • Max 5 Certifications (15m Capacity)"
      showRubricInfo={showRubricInfo}
      onToggleRubricInfo={() => setShowRubricInfo((prev) => !prev)}
    >
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <button
          type="button"
          onClick={() => setActiveTab('certifications')}
          className="pb-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer"
          style={{
            borderColor: activeTab === 'certifications' ? 'var(--green)' : 'transparent',
            color: activeTab === 'certifications' ? 'var(--text-primary)' : 'var(--text-muted)',
          }}
        >
          Certifications Vault ({existingRecords.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('skills')}
          className="pb-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer"
          style={{
            borderColor: activeTab === 'skills' ? 'var(--green)' : 'transparent',
            color: activeTab === 'skills' ? 'var(--text-primary)' : 'var(--text-muted)',
          }}
        >
          Technical Skills Profile ({skillsList.length})
        </button>
      </div>

      {/* Tab 1: Certifications Vault */}
      {activeTab === 'certifications' && (
        <div className="space-y-6">
          {existingRecords.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Evaluated Certifications (Max 5 considered)
                </span>
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
                    <span>Add Another Certificate</span>
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
                          <Award size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                              {item.certName}
                            </h4>
                            <span className="text-xs px-2 py-0.5 rounded font-mono bg-[var(--bg-input)] border" style={{ borderColor: 'var(--border)' }}>
                              {item.provider}
                            </span>
                          </div>
                          {item.credentialId && (
                            <span className="text-[11px] block mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              ID: {item.credentialId}
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

                    {/* Links & Documents */}
                    <div className="pt-2 border-t flex flex-wrap items-center gap-3 text-xs" style={{ borderColor: 'var(--border)' }}>
                      {item.credentialUrl && (
                        <a
                          href={item.credentialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold hover:underline"
                          style={{ color: '#60A5FA' }}
                        >
                          <span>Credential Link</span>
                          <ExternalLink size={10} />
                        </a>
                      )}

                      {item.proofDocuments.map((doc, idx) => (
                        <a
                          key={doc.id || idx}
                          href={doc.publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded bg-[var(--bg-input)] border hover:opacity-80 transition-opacity"
                          style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        >
                          <FileText size={11} style={{ color: 'var(--green-text)' }} />
                          <span className="truncate max-w-[140px]">{doc.fileName}</span>
                          <ExternalLink size={9} style={{ color: 'var(--text-muted)' }} />
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Certification Form */}
          {showAddForm && (
            <form onSubmit={handleSubmitCert} className="space-y-6">
              <div className="p-5 rounded-[var(--radius-lg)] border space-y-4" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                    Add Official Certification
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
                      Certification Title <span className="text-emerald-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={certName}
                      onChange={(e) => setCertName(e.target.value)}
                      placeholder="e.g. Cisco CCNA, AWS Solutions Architect, NPTEL Deep Learning"
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
                      Accredited Provider Tier
                    </label>
                    <select
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-[var(--radius)] border text-xs cursor-pointer focus:outline-none"
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <option value="CISCO">Tier 1 (5m): CISCO</option>
                      <option value="CCNA">Tier 1 (5m): CCNA</option>
                      <option value="CCNP">Tier 1 (5m): CCNP</option>
                      <option value="MCNA">Tier 1 (5m): MCNA</option>
                      <option value="MCNP">Tier 1 (5m): MCNP</option>
                      <option value="MATLAB">Tier 1 (5m): Matlab</option>
                      <option value="REDHAT">Tier 1 (5m): RedHat</option>
                      <option value="IBM">Tier 1 (5m): IBM</option>
                      <option value="NPTEL">Tier 2 (3m): NPTEL</option>
                      <option value="Coursera">Tier 3 (2m): Coursera</option>
                      <option value="Programming">Tier 4 (1m): Programming Certification (C, C++, Java, Python, etc.)</option>
                      <option value="Udemy">Tier 5 (0.5m): Udemy</option>
                      <option value="AWS">AWS (Confirm with placement cell — not in official PDF) (0m)</option>
                      <option value="Google Cloud">Google Cloud (Confirm with placement cell — not in official PDF) (0m)</option>
                      <option value="edX">edX (Confirm with placement cell — not in official PDF) (0m)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Credential ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={credentialId}
                      onChange={(e) => setCredentialId(e.target.value)}
                      placeholder="e.g. CERT-9821481"
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
                      Digital Verification URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={credentialUrl}
                      onChange={(e) => setCredentialUrl(e.target.value)}
                      placeholder="https://credly.com/badges/..."
                      className="w-full px-3.5 py-2.5 rounded-[var(--radius)] border text-xs focus:outline-none"
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                </div>

                {/* Evidence Upload */}
                <EvidenceUploader
                  documents={proofDocuments}
                  onDocumentsChange={setProofDocuments}
                  studentId={studentId}
                  title="CERTIFICATE DOCUMENT PROOF"
                  required={!credentialUrl.trim()}
                  helperText="Upload official e-certificate PDF or verification snapshot"
                />
              </div>

              {/* Projected Marks */}
              <div className="p-4 rounded-[var(--radius)] border bg-[var(--bg-card)] flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Projected Certificate Marks:
                </span>
                <span className="text-base font-bold font-mono" style={{ color: 'var(--green-text)' }}>
                  +{newCertMarks} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>Marks</span>
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
                      <span>Submitting Certificate...</span>
                    </>
                  ) : (
                    <span>Submit Certificate (+{newCertMarks}m)</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Tab 2: Technical Skills Profile */}
      {activeTab === 'skills' && (
        <div className="space-y-6">
          <div className="p-5 rounded-[var(--radius-lg)] border space-y-4" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                Student Skillset Profile
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Add your core programming languages, frameworks, and technical domains. No documents required.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newSkillInput}
                onChange={(e) => setNewSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddSkill(e);
                }}
                placeholder="Type a skill (e.g. Next.js, Docker, Kubernetes) and press Enter"
                className="flex-1 px-3.5 py-2.5 rounded-[var(--radius)] border text-xs focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="px-4 py-2.5 rounded-[var(--radius)] text-xs font-semibold cursor-pointer border hover:opacity-90 transition-opacity"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                Add Skill
              </button>
            </div>

            {/* Skills Chips */}
            <div className="flex flex-wrap gap-2 pt-2">
              {skillsList.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <Tag size={11} style={{ color: 'var(--green-text)' }} />
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="p-0.5 rounded-full hover:bg-red-500/20 text-red-400 cursor-pointer ml-1"
                    title="Remove skill"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </MetricWorkspaceShell>
  );
}
