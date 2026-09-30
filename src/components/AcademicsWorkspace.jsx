import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  GraduationCap,
  ArrowLeft,
  X,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Trash2,
  Loader2,
  Sparkles,
  Lock,
  Edit3,
  Clock,
} from 'lucide-react';
import { calculateAcademicsScore } from '../utils/scoringEngine';
import { uploadProofDocument } from '../services/proofService';

export default function AcademicsWorkspace({
  isOpen,
  onClose,
  studentProfile,
  submissions = [],
  verifiedScore = 0,
  scoreResult,
  onSubmitProof,
  showToast
}) {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  }, [isClosing, onClose]);

  // 1. Initial State Extraction (Syncs with both Profile and existing Submissions)
  const academicSubmissions = useMemo(() => {
    return (submissions || []).filter(
      (s) => s.category_id === 'academics' || s.categoryId === 'academics'
    );
  }, [submissions]);

  // Find verified, pending, and rejected submissions
  const verifiedSubmission = useMemo(() => {
    return academicSubmissions.find(
      (s) => s.status === 'VERIFIED' || s.status === 'Verified'
    );
  }, [academicSubmissions]);

  const pendingSubmission = useMemo(() => {
    return academicSubmissions.find(
      (s) => s.status === 'PENDING' || s.status === 'Pending'
    );
  }, [academicSubmissions]);

  const rejectedSubmission = useMemo(() => {
    return academicSubmissions.find(
      (s) => s.status === 'REJECTED' || s.status === 'Rejected'
    );
  }, [academicSubmissions]);

  // Overall lifecycle status: 'VERIFIED' | 'PENDING' | 'REJECTED' | 'UNCLAIMED'
  const lifecycleStatus = useMemo(() => {
    if (pendingSubmission) return 'PENDING';
    if (verifiedSubmission) return 'VERIFIED';
    if (rejectedSubmission) return 'REJECTED';
    if (verifiedScore > 0) return 'VERIFIED';
    return 'UNCLAIMED';
  }, [verifiedSubmission, pendingSubmission, rejectedSubmission, verifiedScore]);

  // If already verified, allow student to toggle "Update Academic Information" mode
  const [isUpdateMode, setIsUpdateMode] = useState(false);

  // Form Fields
  const [tenthPct, setTenthPct] = useState('');
  const [twelfthPct, setTwelfthPct] = useState('');
  const [cgpa, setCgpa] = useState('');
  const [notes, setNotes] = useState('');

  // Proof Documents State (Multiple Document Stack Support)
  const [proofDocuments, setProofDocuments] = useState([]);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [uploadError, setUploadError] = useState('');

  // Backward-compatibility helpers
  const uploadedProofUrl = proofDocuments[0]?.publicUrl || '';
  const uploadedProofMeta = proofDocuments[0]
    ? { fileName: proofDocuments[0].fileName, fileSize: proofDocuments[0].fileSize }
    : null;

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showRubricInfo, setShowRubricInfo] = useState(false);

  // Track modal open transitions so background syncs and window focus events do not wipe in-progress input
  const prevIsOpenRef = useRef(false);

  // Helper to extract documents from submission
  const extractDocumentsFromSub = (activeSub) => {
    if (!activeSub) return [];
    const subDetails = activeSub?.details || {};
    if (Array.isArray(subDetails.proofDocuments) && subDetails.proofDocuments.length > 0) {
      return subDetails.proofDocuments.map((doc, idx) => ({
        id: doc.id || `doc-${idx}`,
        fileName: doc.fileName || doc.name || `Academic_Proof_${idx + 1}.pdf`,
        fileSize: doc.fileSize || doc.size || 0,
        fileType: doc.fileType || doc.type || 'application/pdf',
        publicUrl: doc.publicUrl || doc.url || activeSub.proof_url || activeSub.proofUrl || '',
        uploadedAt: doc.uploadedAt || activeSub.created_at || new Date().toISOString(),
      }));
    }
    if (Array.isArray(subDetails.documents) && subDetails.documents.length > 0) {
      return subDetails.documents.map((doc, idx) => ({
        id: doc.id || `doc-${idx}`,
        fileName: doc.fileName || doc.name || `Academic_Proof_${idx + 1}.pdf`,
        fileSize: doc.fileSize || doc.size || 0,
        fileType: doc.fileType || doc.type || 'application/pdf',
        publicUrl: doc.publicUrl || doc.url || activeSub.proof_url || activeSub.proofUrl || '',
        uploadedAt: doc.uploadedAt || activeSub.created_at || new Date().toISOString(),
      }));
    }
    if (Array.isArray(subDetails.files) && subDetails.files.length > 0) {
      return subDetails.files.map((doc, idx) => ({
        id: doc.id || `doc-${idx}`,
        fileName: doc.fileName || doc.name || `Academic_Proof_${idx + 1}.pdf`,
        fileSize: doc.fileSize || doc.size || 0,
        fileType: doc.fileType || doc.type || 'application/pdf',
        publicUrl: doc.publicUrl || doc.url || activeSub.proof_url || activeSub.proofUrl || '',
        uploadedAt: doc.uploadedAt || activeSub.created_at || new Date().toISOString(),
      }));
    }
    const url = activeSub?.proof_url || activeSub?.proofUrl || subDetails.proof_url || subDetails.publicUrl || subDetails.url;
    if (url) {
      return [
        {
          id: 'doc-initial-0',
          fileName: subDetails.fileName || subDetails.name || 'Academic_Proof_Document.pdf',
          fileSize: subDetails.fileSize || 0,
          fileType: 'application/pdf',
          publicUrl: url,
          uploadedAt: activeSub?.created_at || new Date().toISOString(),
        },
      ];
    }
    return [];
  };

  const pendingDocs = useMemo(() => extractDocumentsFromSub(pendingSubmission), [pendingSubmission]);
  const verifiedDocs = useMemo(() => extractDocumentsFromSub(verifiedSubmission), [verifiedSubmission]);
  const activeDocs = useMemo(() => {
    if (pendingDocs.length > 0) return pendingDocs;
    if (verifiedDocs.length > 0) return verifiedDocs;
    return extractDocumentsFromSub(rejectedSubmission);
  }, [pendingDocs, verifiedDocs, rejectedSubmission]);

  // Initialize values when opened or active submission updates
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setIsUpdateMode(false);
      setIsSubmitting(false);
      setSubmitSuccess(false);
      setUploadError('');
      setUploadStatusText('');

      const activeSub = pendingSubmission || verifiedSubmission || rejectedSubmission;
      const subDetails = activeSub?.details || {};

      const initialTenth =
        subDetails.tenthPct ?? subDetails.tenth_pct ??
        studentProfile?.tenthPct ?? studentProfile?.tenth_pct ?? '';
      const initialTwelfth =
        subDetails.twelfthPct ?? subDetails.twelfth_pct ??
        studentProfile?.twelfthPct ?? studentProfile?.twelfth_pct ?? '';
      const initialCgpa =
        subDetails.cgpa ?? studentProfile?.cgpa ?? '';

      setTenthPct(initialTenth !== '' && Number(initialTenth) > 0 ? String(initialTenth) : '');
      setTwelfthPct(initialTwelfth !== '' && Number(initialTwelfth) > 0 ? String(initialTwelfth) : '');
      setCgpa(initialCgpa !== '' && Number(initialCgpa) > 0 ? String(initialCgpa) : '');

      setProofDocuments(extractDocumentsFromSub(activeSub));
      setNotes(subDetails.notes || subDetails.comments || '');
    }

    prevIsOpenRef.current = isOpen;
  }, [isOpen, pendingSubmission, verifiedSubmission, rejectedSubmission, studentProfile]);

  // Keep proofDocuments in sync when not in the middle of editing
  useEffect(() => {
    if (isOpen && !isUpdateMode && activeDocs.length > 0 && proofDocuments.length === 0) {
      setProofDocuments(activeDocs);
    }
  }, [isOpen, isUpdateMode, activeDocs, proofDocuments.length]);

  // Handle explicit cancellation of update mode (restores verified state)
  const handleCancelEdit = () => {
    setIsUpdateMode(false);
    setUploadError('');
    setUploadStatusText('');

    const activeSub = verifiedSubmission || pendingSubmission || rejectedSubmission;
    const subDetails = activeSub?.details || {};

    const initialTenth =
      subDetails.tenthPct ?? subDetails.tenth_pct ??
      studentProfile?.tenthPct ?? studentProfile?.tenth_pct ?? '';
    const initialTwelfth =
      subDetails.twelfthPct ?? subDetails.twelfth_pct ??
      studentProfile?.twelfthPct ?? studentProfile?.twelfth_pct ?? '';
    const initialCgpa =
      subDetails.cgpa ?? studentProfile?.cgpa ?? '';

    setTenthPct(initialTenth !== '' && Number(initialTenth) > 0 ? String(initialTenth) : '');
    setTwelfthPct(initialTwelfth !== '' && Number(initialTwelfth) > 0 ? String(initialTwelfth) : '');
    setCgpa(initialCgpa !== '' && Number(initialCgpa) > 0 ? String(initialCgpa) : '');

    setProofDocuments(extractDocumentsFromSub(activeSub));
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // 2. Real-time Live Calculation using Authoritative scoringEngine.js
  const liveScore = useMemo(() => {
    const t = parseFloat(tenthPct) || 0;
    const tw = parseFloat(twelfthPct) || 0;
    const c = parseFloat(cgpa) || 0;
    return calculateAcademicsScore(t, tw, c);
  }, [tenthPct, twelfthPct, cgpa]);

  // Field validation
  const validationErrors = useMemo(() => {
    const errors = {};
    if (tenthPct !== '') {
      const num = parseFloat(tenthPct);
      if (isNaN(num) || num < 0 || num > 100) {
        errors.tenthPct = 'Enter a valid percentage between 0 and 100.';
      }
    }
    if (twelfthPct !== '') {
      const num = parseFloat(twelfthPct);
      if (isNaN(num) || num < 0 || num > 100) {
        errors.twelfthPct = 'Enter a valid percentage between 0 and 100.';
      }
    }
    if (cgpa !== '') {
      const num = parseFloat(cgpa);
      if (isNaN(num) || num < 0 || num > 10) {
        errors.cgpa = 'Enter a valid CGPA between 0.0 and 10.0.';
      }
    }
    return errors;
  }, [tenthPct, twelfthPct, cgpa]);

  const hasAllRequiredFields =
    tenthPct.trim() !== '' &&
    twelfthPct.trim() !== '' &&
    cgpa.trim() !== '' &&
    Object.keys(validationErrors).length === 0;

  const hasProof = proofDocuments.length > 0;

  // 3. Drag and Drop Multiple File Upload
  const fileInputRef = useRef(null);

  const handleFilesUpload = async (filesList) => {
    if (!filesList || filesList.length === 0) return;
    const files = Array.from(filesList);

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const validFiles = [];
    const errorMessages = [];

    for (const file of files) {
      const nameLower = (file.name || '').toLowerCase();
      const hasValidExt =
        nameLower.endsWith('.pdf') ||
        nameLower.endsWith('.jpg') ||
        nameLower.endsWith('.jpeg') ||
        nameLower.endsWith('.png');
      const hasValidMime =
        allowedTypes.includes(file.type) ||
        file.type === '' ||
        file.type.startsWith('image/') ||
        file.type === 'application/pdf';

      if (!hasValidExt && !hasValidMime) {
        errorMessages.push(`"${file.name}": Only PDF, JPG, or PNG files are supported.`);
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        errorMessages.push(`"${file.name}": Exceeds the 10 MB limit.`);
        continue;
      }

      validFiles.push(file);
    }

    if (errorMessages.length > 0) {
      setUploadError(errorMessages.join(' '));
    } else {
      setUploadError('');
    }

    if (validFiles.length === 0) return;

    setIsUploadingProof(true);
    setUploadStatusText(`Uploading ${validFiles.length} document${validFiles.length > 1 ? 's' : ''}...`);

    const studentId = studentProfile?.id || studentProfile?.regNo || studentProfile?.reg_no || 'student-demo';
    const newDocs = [];

    for (const file of validFiles) {
      try {
        const result = await uploadProofDocument(studentId, file);
        if (result && result.publicUrl) {
          newDocs.push({
            id: result.id || `doc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            fileName: result.fileName || file.name,
            fileSize: result.fileSize || file.size,
            fileType: result.fileType || file.type || 'application/pdf',
            publicUrl: result.publicUrl,
            storagePath: result.storagePath || '',
            uploadedAt: result.uploadedAt || new Date().toISOString(),
          });
        } else {
          const localUrl = URL.createObjectURL(file);
          newDocs.push({
            id: `local-doc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type || 'application/pdf',
            publicUrl: localUrl,
            storagePath: '',
            uploadedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.warn('Upload error, retaining file locally:', err);
        const localUrl = URL.createObjectURL(file);
        newDocs.push({
          id: `local-doc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || 'application/pdf',
          publicUrl: localUrl,
          storagePath: '',
          uploadedAt: new Date().toISOString(),
        });
      }
    }

    setProofDocuments((prev) => [...prev, ...newDocs]);
    setIsUploadingProof(false);
    setUploadStatusText('');

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveDocument = (docId) => {
    setProofDocuments((prev) => prev.filter((d) => d.id !== docId));
  };

  // 4. Form Submission Handler
  const handleSubmit = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!hasAllRequiredFields) {
      showToast?.('Incomplete Fields', 'Please complete all academic values with valid numbers.', 'error');
      return;
    }

    if (!hasProof) {
      showToast?.('Proof Required', 'Please attach your supporting marksheet(s) / transcript for faculty verification.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const t = parseFloat(tenthPct) || 0;
      const tw = parseFloat(twelfthPct) || 0;
      const c = parseFloat(cgpa) || 0;
      const calc = calculateAcademicsScore(t, tw, c);

      const primaryUrl = proofDocuments[0]?.publicUrl || '';
      const docCount = proofDocuments.length;
      const docSummary =
        docCount === 1
          ? proofDocuments[0].fileName
          : `${docCount} Documents Attached (${proofDocuments.map((d) => d.fileName).join(', ')})`;

      const submissionPayload = {
        title: `Academics (10th: ${t}%, 12th: ${tw}%, CGPA: ${c})`,
        proof_url: primaryUrl,
        proofUrl: primaryUrl,
        status: 'PENDING',
        details: {
          tenthPct: t,
          twelfthPct: tw,
          cgpa: c,
          tenth_pct: t,
          twelfth_pct: tw,
          calculated_marks: calc.score,
          breakdown: calc.breakdown,
          notes: notes.trim(),
          fileName: docSummary,
          fileSize: proofDocuments.reduce((sum, d) => sum + (d.fileSize || 0), 0),
          proofDocuments: proofDocuments.map((d) => ({
            id: d.id,
            fileName: d.fileName,
            fileSize: d.fileSize,
            fileType: d.fileType,
            publicUrl: d.publicUrl,
            uploadedAt: d.uploadedAt,
          })),
          documents: proofDocuments.map((d) => ({
            id: d.id,
            fileName: d.fileName,
            fileSize: d.fileSize,
            fileType: d.fileType,
            publicUrl: d.publicUrl,
            uploadedAt: d.uploadedAt,
          })),
        },
      };

      await onSubmitProof('academics', submissionPayload);

      setSubmitSuccess(true);
      setTimeout(() => {
        setIsSubmitting(false);
        setSubmitSuccess(false);
        setIsUpdateMode(false);
        onClose();
      }, 1400);
    } catch (err) {
      setIsSubmitting(false);
      showToast?.('Submission Error', err.message || 'Failed to submit academic details.', 'error');
    }
  };

  if (!isOpen) return null;

  // Format bytes helper
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 KB';
    if (typeof bytes === 'string') {
      if (bytes.includes('KB') || bytes.includes('MB') || bytes.includes('Bytes') || bytes.includes('B')) {
        return bytes;
      }
      bytes = Number(bytes) || 0;
      if (bytes === 0) return '0 KB';
    }
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + (sizes[i] || 'KB');
  };

  // Check if we should render the read-only view (verified or pending review)
  const isReadOnly = (lifecycleStatus === 'VERIFIED' || lifecycleStatus === 'PENDING') && !isUpdateMode;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 lg:p-7 overflow-y-auto ${
        isClosing ? 'workspace-backdrop-exit' : 'workspace-backdrop-enter'
      }`}
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="academics-workspace-title"
      onClick={(e) => {
        // Only close if clicking outside the modal dialog card
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      {/* Click outside backdrop */}
      <div className="fixed inset-0 -z-10" onClick={handleClose} aria-hidden="true" />

      {/* Main Spacious Focused Workspace Container (940px max width) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative z-10 w-full max-w-[940px] my-auto rounded-[var(--radius-xl)] flex flex-col overflow-hidden shadow-2xl ${
          isClosing ? 'workspace-exit workspace-panel-exit' : 'workspace-enter workspace-panel-enter'
        }`}
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
          maxHeight: '92vh',
        }}
      >
        {/* Workspace Sticky Header */}
        <div
          className="sticky top-0 z-20 flex items-center justify-between px-6 sm:px-8 py-4 border-b"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border)',
          }}
        >
          {/* Back Navigation Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="inline-flex items-center gap-2 text-xs font-semibold hover:opacity-80 transition-opacity cursor-pointer px-2.5 py-1.5 rounded-[var(--radius-sm)] border"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border)',
              color: 'var(--text-secondary)',
            }}
          >
            <ArrowLeft size={14} />
            <span>Back to My Metrics</span>
          </button>

          {/* Close Icon Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            aria-label="Close Academics workspace"
            className="p-1.5 rounded-full hover:opacity-75 transition-opacity cursor-pointer border"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border)',
              color: 'var(--text-muted)',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Workspace Body */}
        <div className="overflow-y-auto px-6 sm:px-8 lg:px-9 py-6 sm:py-8 space-y-7">
          
          {/* 1. Header Banner & Title Row */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'var(--green-light)', color: 'var(--green-text)' }}
                >
                  <GraduationCap size={18} />
                </div>
                <h1
                  id="academics-workspace-title"
                  className="text-xl sm:text-2xl font-bold tracking-tight"
                  style={{ color: 'var(--text-primary)' }}
                >
                  ACADEMICS
                </h1>
              </div>
              <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                Academic performance contributes up to <strong>10 marks</strong> toward your official SRMIST placement score.
              </p>
            </div>

            {/* Score & Status Panel (Top Right) */}
            <div className="flex items-center sm:items-end flex-col gap-1.5 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Current Score:
                </span>
                <span
                  className="text-lg font-bold px-2.5 py-0.5 rounded-[var(--radius-sm)] border"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border)',
                    color: verifiedScore > 0 ? 'var(--green-text)' : 'var(--text-primary)',
                  }}
                >
                  {verifiedScore} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/ 10</span>
                </span>
              </div>

              {/* Dynamic Status Badge */}
              <div>
                {lifecycleStatus === 'VERIFIED' && (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
                    style={{
                      backgroundColor: 'var(--green-light)',
                      borderColor: 'rgba(34, 197, 94, 0.3)',
                      color: 'var(--green-text)',
                    }}
                  >
                    <CheckCircle2 size={12} />
                    <span>✓ Verified</span>
                  </span>
                )}
                {lifecycleStatus === 'PENDING' && (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
                    style={{
                      backgroundColor: 'var(--amber-light)',
                      borderColor: 'rgba(245, 158, 11, 0.3)',
                      color: 'var(--amber-text)',
                    }}
                  >
                    <AlertTriangle size={12} />
                    <span>Pending Verification</span>
                  </span>
                )}
                {lifecycleStatus === 'REJECTED' && (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.12)',
                      borderColor: 'rgba(239, 68, 68, 0.25)',
                      color: '#EF4444',
                    }}
                  >
                    <AlertCircle size={12} />
                    <span>Changes Requested</span>
                  </span>
                )}
                {lifecycleStatus === 'UNCLAIMED' && (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
                    style={{
                      backgroundColor: 'var(--gray-badge-bg)',
                      borderColor: 'var(--border)',
                      color: 'var(--gray-badge-text)',
                    }}
                  >
                    <span>Not Started</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 2. Changes Requested Notice (Shown if Faculty Rejected) */}
          {lifecycleStatus === 'REJECTED' && rejectedSubmission?.verifier_notes && (
            <div
              className="p-4 rounded-[var(--radius)] border flex items-start gap-3"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.06)',
                borderColor: 'rgba(239, 68, 68, 0.2)',
              }}
            >
              <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">
                  Faculty Reviewer Note: Changes Requested
                </h4>
                <p className="text-xs" style={{ color: 'var(--text-primary)' }}>
                  "{rejectedSubmission.verifier_notes}"
                </p>
                <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Please correct your academic percentages/CGPA or upload the requested documents below and resubmit.
                </p>
              </div>
            </div>
          )}

          {/* 3. Pending Verification Notice */}
          {lifecycleStatus === 'PENDING' && (
            <div
              className="p-4 rounded-[var(--radius)] border flex items-start gap-3"
              style={{
                backgroundColor: 'var(--amber-light)',
                borderColor: 'rgba(245, 158, 11, 0.25)',
              }}
            >
              <AlertTriangle size={18} className="shrink-0 mt-0.5" style={{ color: 'var(--amber-text)' }} />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--amber-text)' }}>
                  Submission In Faculty Verification Queue
                </h4>
                <p className="text-xs" style={{ color: 'var(--text-primary)' }}>
                  Your academic records have been submitted and are awaiting evaluation by your department placement faculty coordinator.
                </p>
                {pendingSubmission?.details && (
                  <div className="space-y-2 mt-2">
                    <div className="flex flex-wrap items-center gap-4 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      <span>10th: <strong>{pendingSubmission.details.tenthPct}%</strong></span>
                      <span>12th: <strong>{pendingSubmission.details.twelfthPct}%</strong></span>
                      <span>CGPA: <strong>{pendingSubmission.details.cgpa}</strong></span>
                      <span className="font-bold" style={{ color: 'var(--amber-text)' }}>
                        Claimed: +{pendingSubmission.details.calculated_marks || pendingSubmission.awarded_marks || 0}m
                      </span>
                    </div>

                    {(() => {
                      const docsToShow = pendingDocs.length > 0 ? pendingDocs : proofDocuments;
                      if (docsToShow.length === 0) return null;
                      return (
                        <div className="pt-2.5 border-t space-y-2" style={{ borderColor: 'rgba(245, 158, 11, 0.25)' }}>
                          <span className="text-[11px] font-semibold flex items-center gap-1.5" style={{ color: 'var(--amber-text)' }}>
                            <FileText size={12} />
                            <span>Attached Document Stack ({docsToShow.length}):</span>
                          </span>
                          <div className="space-y-1.5">
                            {docsToShow.map((doc, idx) => (
                              <div
                                key={doc.id || idx}
                                className="p-2.5 rounded border flex items-center justify-between gap-3 text-xs bg-[var(--bg-card)]"
                                style={{ borderColor: 'rgba(245, 158, 11, 0.3)' }}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText size={14} style={{ color: 'var(--amber-text)' }} />
                                  <span className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                    {doc.fileName || `Academic_Document_${idx + 1}.pdf`}
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
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold border hover:opacity-80 shrink-0"
                                    style={{
                                      backgroundColor: 'var(--bg-input)',
                                      borderColor: 'rgba(245, 158, 11, 0.3)',
                                      color: 'var(--amber-text)',
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
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. Read-Only State (If already verified or pending review, and not updating) */}
          {isReadOnly ? (
            <div className="space-y-6">
              <div
                className="p-5 rounded-[var(--radius-lg)] border"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: lifecycleStatus === 'VERIFIED' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(245, 158, 11, 0.25)',
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    {lifecycleStatus === 'VERIFIED' ? (
                      <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                    ) : (
                      <Clock size={18} className="shrink-0" style={{ color: 'var(--amber-text)' }} />
                    )}
                    <div>
                      <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        {lifecycleStatus === 'VERIFIED'
                          ? 'Official Verified Academic Ledger'
                          : 'Academic Information In Verification Queue'}
                      </h3>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {lifecycleStatus === 'VERIFIED'
                          ? 'Verified by departmental placement evaluation committee.'
                          : 'Your academic percentages and attached proof documents have been recorded for faculty review.'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsUpdateMode(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-[var(--radius)] border cursor-pointer hover:opacity-90 transition-opacity self-start sm:self-auto"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border)',
                      color: 'var(--green-text)',
                    }}
                  >
                    <Edit3 size={13} />
                    <span>Update Academic Information →</span>
                  </button>
                </div>

                {/* Verified 3 Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-[var(--radius)] border bg-[var(--bg-card)]" style={{ borderColor: 'var(--border)' }}>
                    <span className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>10th Standard</span>
                    <span className="text-2xl font-bold block" style={{ color: 'var(--text-primary)' }}>
                      {tenthPct || '—'}%
                    </span>
                    <span className="text-xs font-semibold mt-1 inline-block" style={{ color: 'var(--green-text)' }}>
                      +{liveScore.breakdown.tenthMarks} / 2.5 Marks
                    </span>
                  </div>

                  <div className="p-4 rounded-[var(--radius)] border bg-[var(--bg-card)]" style={{ borderColor: 'var(--border)' }}>
                    <span className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>12th / Diploma</span>
                    <span className="text-2xl font-bold block" style={{ color: 'var(--text-primary)' }}>
                      {twelfthPct || '—'}%
                    </span>
                    <span className="text-xs font-semibold mt-1 inline-block" style={{ color: 'var(--green-text)' }}>
                      +{liveScore.breakdown.twelfthMarks} / 2.5 Marks
                    </span>
                  </div>

                  <div className="p-4 rounded-[var(--radius)] border bg-[var(--bg-card)]" style={{ borderColor: 'var(--border)' }}>
                    <span className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>College CGPA</span>
                    <span className="text-2xl font-bold block" style={{ color: 'var(--text-primary)' }}>
                      {cgpa || '—'} <span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}>/ 10</span>
                    </span>
                    <span className="text-xs font-semibold mt-1 inline-block" style={{ color: 'var(--green-text)' }}>
                      +{liveScore.breakdown.cgpaMarks} / 5.0 Marks
                    </span>
                  </div>
                </div>

                {/* Verified Proof Documents Stack with Preview Buttons */}
                {(() => {
                  const verifiedDocs = extractDocumentsFromSub(verifiedSubmission);
                  const docsToShow = verifiedDocs.length > 0 ? verifiedDocs : activeDocs.length > 0 ? activeDocs : proofDocuments;
                  if (docsToShow.length === 0) return null;
                  return (
                    <div className="mt-4 pt-4 border-t space-y-2.5" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                          Verified Supporting Documents Stack ({docsToShow.length})
                        </span>
                        <span className="text-[11px] font-semibold" style={{ color: 'var(--green-text)' }}>
                          Official Records Vault
                        </span>
                      </div>

                      <div className="space-y-2">
                        {docsToShow.map((doc, idx) => (
                        <div
                          key={doc.id || idx}
                          className="p-3 rounded-[var(--radius)] border flex items-center justify-between gap-3 bg-[var(--bg-card)]"
                          style={{ borderColor: 'var(--border)' }}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                              style={{ backgroundColor: 'var(--green-light)', color: 'var(--green-text)' }}
                            >
                              <FileText size={15} />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold truncate block" style={{ color: 'var(--text-primary)' }}>
                                {doc.fileName || `Academic_Proof_Document_${idx + 1}.pdf`}
                              </span>
                              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                {formatFileSize(doc.fileSize)} • Document #{idx + 1}
                              </span>
                            </div>
                          </div>

                          <a
                            href={doc.publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-[var(--radius-sm)] border hover:opacity-80 transition-opacity shrink-0"
                            style={{
                              backgroundColor: 'var(--bg-input)',
                              borderColor: 'var(--border)',
                              color: 'var(--green-text)',
                            }}
                          >
                            <ExternalLink size={12} />
                            <span>Preview</span>
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              </div>
            </div>
          ) : (
            /* 5. Editable Academic Details Form */
            <form onSubmit={handleSubmit} className="space-y-7">
              {/* Section Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                    ACADEMIC DETAILS
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Enter your academic percentages and cumulative GPA below.
                  </p>
                </div>
                {isUpdateMode && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelEdit();
                    }}
                    className="text-xs font-medium hover:underline cursor-pointer"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              {/* 3-Column Spacious Grid on Desktop */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Field 1: 10th Percentage */}
                <div
                  className="p-5 sm:p-6 rounded-[var(--radius-lg)] border transition-all"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: validationErrors.tenthPct ? '#EF4444' : 'var(--border)',
                  }}
                >
                  <label
                    htmlFor="academic-10th-input"
                    className="block text-xs font-semibold mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    10th Percentage
                  </label>

                  <div className="relative flex items-center">
                    <input
                      id="academic-10th-input"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="e.g. 94.2"
                      value={tenthPct}
                      onChange={(e) => setTenthPct(e.target.value)}
                      className="w-full text-2xl font-bold bg-transparent outline-none pr-8 py-1"
                      style={{ color: 'var(--text-primary)' }}
                    />
                    <span className="absolute right-1 text-sm font-semibold pointer-events-none" style={{ color: 'var(--text-muted)' }}>
                      %
                    </span>
                  </div>

                  {/* Attached Live Rubric Tag */}
                  <div className="mt-3 pt-2.5 border-t flex items-center justify-between text-xs" style={{ borderColor: 'var(--border)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Awarded Marks</span>
                    <span className="font-bold font-mono" style={{ color: liveScore.breakdown.tenthMarks > 0 ? 'var(--green-text)' : 'var(--text-muted)' }}>
                      +{liveScore.breakdown.tenthMarks} / 2.5m
                    </span>
                  </div>

                  {validationErrors.tenthPct && (
                    <span className="text-[11px] text-red-500 block mt-1.5">
                      {validationErrors.tenthPct}
                    </span>
                  )}
                </div>

                {/* Field 2: 12th Percentage / Diploma */}
                <div
                  className="p-5 sm:p-6 rounded-[var(--radius-lg)] border transition-all"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: validationErrors.twelfthPct ? '#EF4444' : 'var(--border)',
                  }}
                >
                  <label
                    htmlFor="academic-12th-input"
                    className="block text-xs font-semibold mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    12th / Diploma Percentage
                  </label>

                  <div className="relative flex items-center">
                    <input
                      id="academic-12th-input"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="e.g. 89.0"
                      value={twelfthPct}
                      onChange={(e) => setTwelfthPct(e.target.value)}
                      className="w-full text-2xl font-bold bg-transparent outline-none pr-8 py-1"
                      style={{ color: 'var(--text-primary)' }}
                    />
                    <span className="absolute right-1 text-sm font-semibold pointer-events-none" style={{ color: 'var(--text-muted)' }}>
                      %
                    </span>
                  </div>

                  {/* Attached Live Rubric Tag */}
                  <div className="mt-3 pt-2.5 border-t flex items-center justify-between text-xs" style={{ borderColor: 'var(--border)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Awarded Marks</span>
                    <span className="font-bold font-mono" style={{ color: liveScore.breakdown.twelfthMarks > 0 ? 'var(--green-text)' : 'var(--text-muted)' }}>
                      +{liveScore.breakdown.twelfthMarks} / 2.5m
                    </span>
                  </div>

                  {validationErrors.twelfthPct && (
                    <span className="text-[11px] text-red-500 block mt-1.5">
                      {validationErrors.twelfthPct}
                    </span>
                  )}
                </div>

                {/* Field 3: College CGPA */}
                <div
                  className="p-5 sm:p-6 rounded-[var(--radius-lg)] border transition-all"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: validationErrors.cgpa ? '#EF4444' : 'var(--border)',
                  }}
                >
                  <label
                    htmlFor="academic-cgpa-input"
                    className="block text-xs font-semibold mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Current College CGPA
                  </label>

                  <div className="relative flex items-center">
                    <input
                      id="academic-cgpa-input"
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      placeholder="e.g. 9.35"
                      value={cgpa}
                      onChange={(e) => setCgpa(e.target.value)}
                      className="w-full text-2xl font-bold bg-transparent outline-none pr-12 py-1"
                      style={{ color: 'var(--text-primary)' }}
                    />
                    <span className="absolute right-1 text-xs font-semibold pointer-events-none" style={{ color: 'var(--text-muted)' }}>
                      / 10
                    </span>
                  </div>

                  {/* Attached Live Rubric Tag */}
                  <div className="mt-3 pt-2.5 border-t flex items-center justify-between text-xs" style={{ borderColor: 'var(--border)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Awarded Marks</span>
                    <span className="font-bold font-mono" style={{ color: liveScore.breakdown.cgpaMarks > 0 ? 'var(--green-text)' : 'var(--text-muted)' }}>
                      +{liveScore.breakdown.cgpaMarks} / 5.0m
                    </span>
                  </div>

                  {validationErrors.cgpa && (
                    <span className="text-[11px] text-red-500 block mt-1.5">
                      {validationErrors.cgpa}
                    </span>
                  )}
                </div>
              </div>

              {/* 6. Live Calculated Score Preview Card */}
              <div
                className="p-5 sm:p-6 rounded-[var(--radius-lg)] border space-y-3"
                style={{
                  backgroundColor: 'var(--glass-bg-score-card, var(--bg-card))',
                  borderColor: 'var(--border)',
                  boxShadow: 'var(--glass-shadow-card)',
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      CALCULATED SCORE
                    </span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-2xl sm:text-3xl font-extrabold font-mono" style={{ color: 'var(--green-text)' }}>
                        {liveScore.score}
                      </span>
                      <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                        / 10.0 Marks Total
                      </span>
                    </div>
                  </div>

                  {/* Itemized Score Badges */}
                  <div className="flex items-center gap-3 text-xs font-medium">
                    <div className="px-2.5 py-1 rounded bg-[var(--bg-input)] border" style={{ borderColor: 'var(--border)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>10th: </span>
                      <strong style={{ color: 'var(--text-primary)' }}>{liveScore.breakdown.tenthMarks}</strong>
                      <span style={{ color: 'var(--text-muted)' }}> / 2.5</span>
                    </div>
                    <div className="px-2.5 py-1 rounded bg-[var(--bg-input)] border" style={{ borderColor: 'var(--border)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>12th: </span>
                      <strong style={{ color: 'var(--text-primary)' }}>{liveScore.breakdown.twelfthMarks}</strong>
                      <span style={{ color: 'var(--text-muted)' }}> / 2.5</span>
                    </div>
                    <div className="px-2.5 py-1 rounded bg-[var(--bg-input)] border" style={{ borderColor: 'var(--border)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>CGPA: </span>
                      <strong style={{ color: 'var(--text-primary)' }}>{liveScore.breakdown.cgpaMarks}</strong>
                      <span style={{ color: 'var(--text-muted)' }}> / 5.0</span>
                    </div>
                  </div>
                </div>

                {/* Smooth Animated Progress Bar */}
                <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-input)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-300 ease-out"
                    style={{
                      width: `${Math.min(100, (liveScore.score / 10) * 100)}%`,
                      backgroundColor: 'var(--green-bar)',
                    }}
                  />
                </div>
              </div>

              {/* 7. Rubric Transparency ("How is this calculated?") */}
              <div className="rounded-[var(--radius)] border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                <button
                  type="button"
                  onClick={() => setShowRubricInfo(!showRubricInfo)}
                  className="w-full px-4 py-3 text-left flex items-center justify-between text-xs font-semibold cursor-pointer hover:bg-[var(--bg-input)] transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <div className="flex items-center gap-2">
                    <HelpCircle size={14} style={{ color: 'var(--green-text)' }} />
                    <span>How is this calculated? Placement Rubric Thresholds</span>
                  </div>
                  {showRubricInfo ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showRubricInfo && (
                  <div className="p-4 border-t text-xs space-y-4" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* 10th Rubric */}
                      <div className="p-3 rounded bg-[var(--bg-card)] border" style={{ borderColor: 'var(--border)' }}>
                        <h4 className="font-bold mb-2" style={{ color: 'var(--text-primary)' }}>10th Standard (Max 2.5m)</h4>
                        <ul className="space-y-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                          <li className="flex justify-between"><span>≥ 96%</span><strong>2.5 Marks</strong></li>
                          <li className="flex justify-between"><span>91% – 95.9%</span><strong>2.0 Marks</strong></li>
                          <li className="flex justify-between"><span>86% – 90.9%</span><strong>1.5 Marks</strong></li>
                          <li className="flex justify-between"><span>75% – 85.9%</span><strong>1.0 Mark</strong></li>
                          <li className="flex justify-between"><span>&lt; 75%</span><strong>0.5 Mark</strong></li>
                        </ul>
                      </div>

                      {/* 12th Rubric */}
                      <div className="p-3 rounded bg-[var(--bg-card)] border" style={{ borderColor: 'var(--border)' }}>
                        <h4 className="font-bold mb-2" style={{ color: 'var(--text-primary)' }}>12th / Diploma (Max 2.5m)</h4>
                        <ul className="space-y-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                          <li className="flex justify-between"><span>≥ 96%</span><strong>2.5 Marks</strong></li>
                          <li className="flex justify-between"><span>91% – 95.9%</span><strong>2.0 Marks</strong></li>
                          <li className="flex justify-between"><span>86% – 90.9%</span><strong>1.5 Marks</strong></li>
                          <li className="flex justify-between"><span>75% – 85.9%</span><strong>1.0 Mark</strong></li>
                          <li className="flex justify-between"><span>&lt; 75%</span><strong>0.5 Mark</strong></li>
                        </ul>
                      </div>

                      {/* CGPA Rubric */}
                      <div className="p-3 rounded bg-[var(--bg-card)] border" style={{ borderColor: 'var(--border)' }}>
                        <h4 className="font-bold mb-2" style={{ color: 'var(--text-primary)' }}>University CGPA (Max 5.0m)</h4>
                        <ul className="space-y-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                          <li className="flex justify-between"><span>&gt; 9.50</span><strong>5.0 Marks</strong></li>
                          <li className="flex justify-between"><span>9.10 – 9.50</span><strong>4.0 Marks</strong></li>
                          <li className="flex justify-between"><span>8.60 – 9.09</span><strong>3.0 Marks</strong></li>
                          <li className="flex justify-between"><span>7.50 – 8.59</span><strong>2.0 Marks</strong></li>
                          <li className="flex justify-between"><span>&lt; 7.50</span><strong>1.0 Mark</strong></li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 8. Supporting Evidence Drag & Drop Upload */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                      SUPPORTING EVIDENCE
                    </h3>
                    {proofDocuments.length > 0 ? (
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: 'var(--green-light)', color: 'var(--green-text)' }}
                      >
                        {proofDocuments.length} document{proofDocuments.length > 1 ? 's' : ''} attached
                      </span>
                    ) : (
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: 'var(--green-light)', color: 'var(--green-text)' }}
                      >
                        Required for verification
                      </span>
                    )}
                  </div>
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    PDF, JPG, PNG (Max 10 MB per file)
                  </span>
                </div>

                {/* Hidden File Input with multiple attribute */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    e.stopPropagation();
                    if (e.target.files && e.target.files.length > 0) {
                      handleFilesUpload(e.target.files);
                    }
                  }}
                  className="hidden"
                />

                {/* If documents attached, render properly stacked document cards with individual Preview buttons */}
                {proofDocuments.length > 0 && (
                  <div className="space-y-2.5">
                    {proofDocuments.map((doc, idx) => (
                      <div
                        key={doc.id || idx}
                        className="p-3.5 sm:p-4 rounded-[var(--radius-lg)] border flex items-center justify-between gap-3 transition-all hover:border-[var(--green)]/40"
                        style={{
                          backgroundColor: 'var(--bg-input)',
                          borderColor: 'rgba(34, 197, 94, 0.3)',
                        }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: 'var(--green-light)', color: 'var(--green-text)' }}
                          >
                            <FileText size={18} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold truncate block" style={{ color: 'var(--text-primary)' }}>
                                {doc.fileName || 'Academic_Proof_Document.pdf'}
                              </span>
                              <span
                                className="text-[10px] font-semibold px-1.5 py-0.2 rounded shrink-0"
                                style={{ backgroundColor: 'var(--green-light)', color: 'var(--green-text)' }}
                              >
                                Ready
                              </span>
                            </div>
                            <span className="text-[11px] block mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {formatFileSize(doc.fileSize)} • Document #{idx + 1}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={doc.publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs font-semibold px-2.5 py-1.5 rounded-[var(--radius-sm)] border inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
                            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                          >
                            <ExternalLink size={12} />
                            <span>Preview</span>
                          </a>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveDocument(doc.id);
                            }}
                            className="text-xs font-semibold px-2.5 py-1.5 rounded-[var(--radius-sm)] border text-red-500 hover:bg-red-500/10 cursor-pointer inline-flex items-center gap-1 transition-colors"
                            style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}
                            title="Remove this document"
                          >
                            <Trash2 size={12} />
                            <span className="hidden sm:inline">Remove</span>
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Compact Add Another Document Dropzone */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                          handleFilesUpload(e.dataTransfer.files);
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="p-3.5 rounded-[var(--radius-lg)] border-2 border-dashed flex items-center justify-center gap-2 text-center cursor-pointer hover:border-[var(--green)] hover:bg-[var(--bg-input)] transition-all"
                      style={{
                        borderColor: 'var(--border-strong)',
                        backgroundColor: 'var(--bg-card)',
                      }}
                    >
                      {isUploadingProof ? (
                        <div className="flex items-center gap-2">
                          <Loader2 size={16} className="animate-spin text-emerald-500" />
                          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {uploadStatusText || 'Attaching document...'}
                          </span>
                        </div>
                      ) : (
                        <>
                          <UploadCloud size={16} style={{ color: 'var(--green-text)' }} />
                          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                            + Attach another marksheet or certificate <span className="font-normal text-[11px]" style={{ color: 'var(--text-muted)' }}>(Drag & drop or Browse)</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* If 0 documents attached, render the primary full-size dropzone */}
                {proofDocuments.length === 0 && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        handleFilesUpload(e.dataTransfer.files);
                      }
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="p-8 rounded-[var(--radius-lg)] border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer hover:border-[var(--green)] hover:bg-[var(--bg-input)] transition-all"
                    style={{
                      borderColor: uploadError ? '#EF4444' : 'var(--border-strong)',
                      backgroundColor: 'var(--bg-input)',
                    }}
                  >
                    {isUploadingProof ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 size={28} className="animate-spin text-emerald-500" />
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {uploadStatusText || 'Uploading proofs to secure placement vault...'}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                          style={{ backgroundColor: 'var(--bg-card)', color: 'var(--green-text)' }}
                        >
                          <UploadCloud size={24} />
                        </div>
                        <h4 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                          Upload your academic proofs
                        </h4>
                        <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                          Drag & drop multiple files or <span className="underline font-semibold" style={{ color: 'var(--green-text)' }}>Browse files</span>
                        </p>
                        <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                          Attach 10th, 12th/Diploma, and University grade sheets (PDF • JPG • PNG)
                        </span>
                      </>
                    )}
                  </div>
                )}

                {uploadError && (
                  <span className="text-xs text-red-500 block">
                    {uploadError}
                  </span>
                )}
              </div>

              {/* 9. Additional Notes (Optional) */}
              <div className="space-y-1.5">
                <label
                  htmlFor="academic-notes-textarea"
                  className="block text-xs font-semibold"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  ADDITIONAL NOTES <span className="font-normal" style={{ color: 'var(--text-muted)' }}>(Optional)</span>
                </label>
                <textarea
                  id="academic-notes-textarea"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. 5th semester provisional grade sheet attached; awaiting 6th semester hardcopy."
                  className="w-full text-xs p-3 rounded-[var(--radius)] border outline-none resize-none"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              {/* 10. Submission Footer */}
              <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderColor: 'var(--border)' }}>
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {!hasAllRequiredFields
                    ? 'Enter 10th %, 12th %, and CGPA to calculate score.'
                    : !hasProof
                    ? 'Please attach proof to enable verification submission.'
                    : `${proofDocuments.length} document${proofDocuments.length > 1 ? 's' : ''} attached. Ready for submission.`}
                </span>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClose();
                    }}
                    className="flex-1 sm:flex-none text-xs font-semibold px-4 py-2.5 rounded-[var(--radius)] border cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || submitSuccess || !hasAllRequiredFields || !hasProof}
                    className="flex-1 sm:flex-none text-xs font-semibold px-6 py-2.5 rounded-[var(--radius)] text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-sm"
                    style={{
                      backgroundColor: submitSuccess ? 'var(--green-bar)' : 'var(--green)',
                      transform: submitSuccess ? 'scale(1.02)' : 'none',
                    }}
                  >
                    {submitSuccess ? (
                      <>
                        <CheckCircle2 size={15} />
                        <span>✓ Submitted</span>
                      </>
                    ) : isSubmitting ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={15} />
                        <span>Submit for Verification →</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
