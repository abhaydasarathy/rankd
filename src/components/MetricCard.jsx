import React from 'react';
import { 
  GraduationCap, 
  Code2, 
  Briefcase, 
  Award, 
  FolderGit2, 
  Layers, 
  Trophy, 
  Building2, 
  CheckSquare, 
  ShieldCheck 
} from 'lucide-react';

function GithubIcon({ size = 20, className = 'w-5 h-5 shrink-0', ...props }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
      style={{ width: `${size}px`, height: `${size}px`, flexShrink: 0 }}
      {...props}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

const ICON_MAP = {
  GraduationCap,
  Github: GithubIcon,
  Code2,
  Briefcase,
  Award,
  FolderGit2,
  Layers,
  Trophy,
  Building2,
  CheckSquare,
  ShieldCheck
};

export function SkeletonCard() {
  return (
    <div
      className="metric-card flex flex-col justify-between min-w-0"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 20px',
        minWidth: 0,
        boxSizing: 'border-box',
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <div className="skeleton-line" style={{ width: 120, height: 14 }} />
          <div className="skeleton-line" style={{ width: 60, height: 14 }} />
        </div>
        <div className="skeleton-line" style={{ width: 80, height: 28, margin: '8px 0' }} />
        <div className="skeleton-line" style={{ width: '100%', height: 4, margin: '10px 0' }} />
      </div>
      <div className="skeleton-line" style={{ width: 50, height: 13, marginLeft: 'auto' }} />
    </div>
  );
}

export default function MetricCard({
  category,
  verifiedScore = 0,
  pendingScore = 0,
  categorySubmissions = [],
  onSelectCategory,
  animationIndex = 0,
  isLoading = false,
}) {
  if (isLoading) return <SkeletonCard />;

  const IconComponent = ICON_MAP[category.iconName] || FolderGit2;
  const maxMarks = category.maxMarks || 10;
  const activeSubmissions = categorySubmissions.filter((s) => {
    const st = String(s.status || '').toUpperCase();
    return st !== 'REJECTED';
  });

  const isSingleton = [
    'academics',
    'github',
    'coding-platforms',
    'coding_practice',
    'fullstack',
    'membership',
    'assessments',
  ].includes(category.id);
  const recordCount = isSingleton ? Math.min(1, activeSubmissions.length) : activeSubmissions.length;
  const recordText = `${recordCount} record${recordCount === 1 ? '' : 's'}`;

  const hasVerifiedSub = activeSubmissions.some((s) => {
    const st = String(s.status || '').toUpperCase();
    return st === 'VERIFIED' || st === 'APPROVED';
  });

  const hasPendingSub = activeSubmissions.some((s) => {
    const st = String(s.status || '').toUpperCase();
    return st === 'PENDING' || st === 'SUBMITTED' || st === 'DRAFT';
  });

  // Status computation
  let status = 'unclaimed';
  if (verifiedScore > 0 || hasVerifiedSub) {
    status = 'verified';
  } else if (pendingScore > 0 || hasPendingSub) {
    status = 'pending';
  }

  // Progress Bar Fill
  const verifiedWidth = Math.min(100, (verifiedScore / maxMarks) * 100);
  const pendingWidth = Math.min(
    100 - verifiedWidth,
    pendingScore > 0 ? (pendingScore / maxMarks) * 100 : (status === 'pending' ? 12 : 0)
  );

  return (
    <div
      className="metric-card metric-card-animated metric-card-hover flex flex-col justify-between min-w-0"
      onClick={() => onSelectCategory && onSelectCategory(category)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectCategory && onSelectCategory(category);
        }
      }}
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 20px',
        minWidth: 0,
        boxSizing: 'border-box',
        cursor: 'pointer',
        '--card-index': animationIndex,
      }}
    >
      <div className="min-w-0">
        {/* Row 1: Icon + Name + Status Badge */}
        <div className="flex items-center justify-between gap-2 mb-3 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-5 h-5 shrink-0 flex items-center justify-center">
              <IconComponent size={20} style={{ color: 'var(--text-muted)' }} />
            </div>
            <h3
              className="truncate"
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: 0,
              }}
              title={category.title}
            >
              {category.title}
            </h3>
          </div>

          {status === 'verified' && (
            <span
              className="shrink-0"
              style={{
                backgroundColor: 'var(--green-light)',
                color: 'var(--green-text)',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              Verified
            </span>
          )}
          {status === 'pending' && (
            <span
              className="shrink-0"
              style={{
                backgroundColor: 'var(--amber-light)',
                color: 'var(--amber-text)',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              Pending
            </span>
          )}
          {status === 'unclaimed' && (
            <span
              className="shrink-0"
              style={{
                backgroundColor: 'var(--gray-badge-bg)',
                color: 'var(--gray-badge-text)',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              Unclaimed
            </span>
          )}
        </div>

        {/* Row 2: Score Number + Max Marks + Unclaimed Illustration / Record Count */}
        <div className="flex items-center justify-between mt-2 min-h-[36px]">
          <div className="flex items-baseline">
            <span
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: verifiedScore > 0 ? 'var(--text-primary)' : (pendingScore > 0 ? 'var(--amber-text)' : 'var(--text-primary)'),
                lineHeight: 1,
              }}
            >
              {verifiedScore > 0 ? verifiedScore : (pendingScore > 0 ? pendingScore : verifiedScore)}
            </span>
            <span
              style={{
                fontSize: '13px',
                color: 'var(--text-muted)',
                marginLeft: '4px',
              }}
            >
              /{maxMarks} Marks
            </span>
            {verifiedScore === 0 && pendingScore > 0 && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--amber-text)',
                  marginLeft: '6px',
                }}
              >
                (pending)
              </span>
            )}
          </div>

          {/* Genuine Unclaimed Category Empty-State Illustration */}
          {status === 'unclaimed' && recordCount === 0 && verifiedScore === 0 && pendingScore === 0 ? (
            <div
              className="flex items-center justify-center select-none pointer-events-none"
              style={{
                opacity: 0.22,
                color: 'var(--text-muted)',
              }}
              title={`No submissions recorded for ${category.title}`}
              aria-hidden="true"
            >
              <IconComponent size={28} strokeWidth={1.5} />
            </div>
          ) : (
            <span
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
              }}
            >
              {recordText}
            </span>
          )}
        </div>

        {/* Row 3: Dual-Fill Sequential Progress Bar */}
        <div
          style={{
            height: '4px',
            borderRadius: '2px',
            backgroundColor: 'var(--border)',
            margin: '10px 0',
            overflow: 'hidden',
            display: 'flex',
          }}
        >
          {verifiedWidth > 0 && (
            <div
              className="progress-fill progress-fill-animated shrink-0"
              style={{
                width: `${verifiedWidth}%`,
                backgroundColor: 'var(--green-bar)',
                '--fill-width': `${verifiedWidth}%`,
                '--card-index': animationIndex,
              }}
            />
          )}
          {pendingWidth > 0 && (
            <div
              className={`progress-fill shrink-0 ${
                verifiedWidth > 0 ? 'progress-fill-pending-animated' : 'progress-fill-pending-solo'
              }`}
              style={{
                width: `${pendingWidth}%`,
                backgroundColor: 'var(--amber-bar)',
                '--pending-fill-width': `${pendingWidth}%`,
                '--card-index': animationIndex,
              }}
            />
          )}
        </div>
      </div>

      {/* Row 4: View Link Right-Aligned */}
      <div className="text-right pt-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectCategory && onSelectCategory(category);
          }}
          className="cursor-pointer hover:underline transition-all"
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--green)',
            background: 'none',
            border: 'none',
            padding: 0,
          }}
        >
          <span>View </span>
          <span className="view-link-arrow">→</span>
        </button>
      </div>
    </div>
  );
}
