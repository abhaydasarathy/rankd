import React, { useEffect } from 'react';
import {
  ArrowLeft,
  X,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function MetricWorkspaceShell({
  isOpen,
  onClose,
  categoryTitle,
  categoryDescription,
  maxMarks = 10,
  icon: Icon,
  verifiedScore = 0,
  lifecycleStatus = 'UNCLAIMED', // 'VERIFIED' | 'PENDING' | 'REJECTED' | 'UNCLAIMED'
  rejectedNotes = '',
  pendingClaimedMarks = null,
  pendingAttachedDetails = null,
  rubricText = '',
  showRubricInfo = false,
  onToggleRubricInfo,
  children,
}) {
  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 lg:p-7 overflow-y-auto"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="metric-workspace-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Click outside backdrop */}
      <div className="fixed inset-0 -z-10" onClick={onClose} aria-hidden="true" />

      {/* Main Spacious Focused Workspace Container (940px max width) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-[940px] my-auto rounded-[var(--radius-xl)] flex flex-col overflow-hidden shadow-2xl transition-all"
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
              onClose();
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
              onClose();
            }}
            aria-label="Close workspace"
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
          <div
            className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-2 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'var(--green-light)', color: 'var(--green-text)' }}
                >
                  {Icon && <Icon size={18} />}
                </div>
                <h1
                  id="metric-workspace-title"
                  className="text-xl sm:text-2xl font-bold tracking-tight uppercase"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {categoryTitle}
                </h1>
              </div>
              <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                {categoryDescription || `Contributes up to ${maxMarks} marks toward your official SRMIST placement score.`}
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
                  {verifiedScore} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/ {maxMarks}</span>
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
          {lifecycleStatus === 'REJECTED' && rejectedNotes && (
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
                  "{rejectedNotes}"
                </p>
                <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Please update your information or upload the requested documents below and resubmit.
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
              <div className="flex-1">
                <h4 className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--amber-text)' }}>
                  Submission In Faculty Verification Queue
                </h4>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Your submission has been safely recorded and is awaiting verification by the placement evaluation committee.
                </p>

                <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs">
                  {pendingClaimedMarks !== null && pendingClaimedMarks !== undefined && (
                    <span className="font-bold" style={{ color: 'var(--amber-text)' }}>
                      Claimed: +{pendingClaimedMarks}m
                    </span>
                  )}
                  {React.isValidElement(pendingAttachedDetails) ? (
                    pendingAttachedDetails
                  ) : typeof pendingAttachedDetails === 'object' && pendingAttachedDetails !== null ? (
                    <span className="font-semibold text-xs px-2.5 py-0.5 rounded bg-[var(--bg-input)] border" style={{ borderColor: 'var(--border)' }}>
                      {pendingAttachedDetails.title || ''}
                    </span>
                  ) : pendingAttachedDetails ? (
                    <span>{String(pendingAttachedDetails)}</span>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {/* Rubric Accordion Helper (Optional) */}
          {rubricText && (
            <div
              className="rounded-[var(--radius)] border overflow-hidden"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border)',
              }}
            >
              <button
                type="button"
                onClick={onToggleRubricInfo}
                className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer hover:opacity-90 transition-opacity"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle size={15} style={{ color: 'var(--green-text)' }} />
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                    SRMIST Placement Evaluation Rubric & Marking Criteria
                  </span>
                </div>
                {showRubricInfo ? (
                  <ChevronUp size={15} style={{ color: 'var(--text-muted)' }} />
                ) : (
                  <ChevronDown size={15} style={{ color: 'var(--text-muted)' }} />
                )}
              </button>

              {showRubricInfo && (
                <div
                  className="px-4 pb-4 pt-1 border-t text-xs leading-relaxed"
                  style={{
                    borderColor: 'var(--border)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <p className="font-mono text-[11px] p-2.5 rounded bg-[var(--bg-card)] border" style={{ borderColor: 'var(--border)' }}>
                    {rubricText}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Category-Specific Workspace Content */}
          {children}
        </div>
      </div>
    </div>
  );
}
