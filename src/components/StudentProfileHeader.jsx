import React from "react";
import { calculateTotalScore } from "../utils/scoringEngine";

export default function StudentProfileHeader({ user, onOpenProfile }) {
  // Compute scores with scoring engine
  const scoreResult = calculateTotalScore(user || {});
  const verifiedScore = scoreResult?.totalVerifiedScore ?? 0;
  const pendingScore = scoreResult?.totalPendingScore ?? 0;
  const totalScore = Math.min(100, Number((verifiedScore + pendingScore).toFixed(2)));

  // Placement status based on verified score
  const isVerified = verifiedScore > 0;
  const placementStatus = isVerified ? "Placement Active" : "Registered";

  const name = user?.name || user?.full_name || "Student";
  const regNo = user?.regNo || user?.reg_no || "—";
  const department = user?.department || "CSE";
  const section = user?.section || "—";
  const batch = user?.batch || user?.batch_year || "2022 - 2026";

  return (
    <section className="mb-5">
      <div 
        className="border rounded-xl p-4 sm:p-5 shadow-sm transition-colors"
        style={{ 
          backgroundColor: 'var(--bg-card)', 
          borderColor: 'var(--border-color)' 
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Metadata Block */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>
                {name}
              </h1>
              <span 
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full border"
                style={{ 
                  backgroundColor: 'var(--bg-elevated)', 
                  borderColor: 'var(--border-color)', 
                  color: isVerified ? 'var(--color-verified)' : 'var(--text-secondary)' 
                }}
              >
                {placementStatus}
              </span>
              {onOpenProfile && (
                <button 
                  onClick={onOpenProfile}
                  className="text-[11px] font-medium px-2 py-0.5 rounded border hover:opacity-80 transition-opacity cursor-pointer"
                  style={{ 
                    backgroundColor: 'var(--bg-elevated)', 
                    borderColor: 'var(--border-color)', 
                    color: 'var(--text-secondary)' 
                  }}
                >
                  Edit Profile
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{regNo}</span>
              <span>•</span>
              <span>{department}</span>
              <span>•</span>
              <span>{section}</span>
              <span>•</span>
              <span>Batch {batch}</span>
              {user?.cgpa && (
                <>
                  <span>•</span>
                  <span>CGPA: <strong style={{ color: 'var(--text-primary)' }}>{user.cgpa}</strong></span>
                </>
              )}
            </div>
          </div>

          {/* Compact Score Pill & Progress Strip */}
          <div 
            className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 rounded-xl border shrink-0"
            style={{ 
              backgroundColor: 'var(--bg-elevated)', 
              borderColor: 'var(--border-color)' 
            }}
          >
            {/* Score Numerical */}
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black tabular-nums tracking-tight" style={{ color: 'var(--text-primary)' }}>
                {verifiedScore}
              </span>
              <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                / 100 Marks
              </span>
            </div>

            <div className="h-6 w-px hidden sm:block" style={{ backgroundColor: 'var(--border-color)' }} />

            {/* Micro Breakdown & Bar */}
            <div className="w-full sm:w-44 space-y-1.5">
              <div 
                className="h-2 w-full rounded-full overflow-hidden flex border"
                style={{ backgroundColor: 'var(--bg-page)', borderColor: 'var(--border-color)' }}
              >
                <div 
                  style={{ width: `${verifiedScore}%`, backgroundColor: 'var(--color-verified)' }} 
                  className="h-full transition-all duration-300"
                  title={`Verified: ${verifiedScore} Marks`}
                />
                <div 
                  style={{ width: `${pendingScore}%`, backgroundColor: 'var(--color-pending)' }} 
                  className="h-full transition-all duration-300"
                  title={`Pending: ${pendingScore} Marks`}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span style={{ color: 'var(--color-verified)' }}>{verifiedScore}m Verified</span>
                {pendingScore > 0 && (
                  <span style={{ color: 'var(--color-pending)' }}>+{pendingScore}m Pending</span>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
