import React from 'react';
import { X, Building2, User, Calendar, Award, ShieldCheck } from 'lucide-react';

export default function ProfileModal({ user, scoreResult, isOpen, onClose }) {
  if (!isOpen || !user) return null;

  const verifiedMarks = scoreResult?.totalVerifiedScore ?? 0;
  const pendingMarks = scoreResult?.totalPendingScore ?? 0;
  const totalMarks = Math.min(100, Number((verifiedMarks + pendingMarks).toFixed(2)));

  const name = user.name || user.full_name || 'Student';
  const regNo = user.regNo || user.reg_no || '—';
  const email = user.email || '—';
  const department = user.department || 'CSE';
  const section = user.section || 'Section A';
  const batch = user.batch || user.batch_year || '2024–2028';
  const cgpa = user.cgpa ? `${user.cgpa} / 10.0` : '—';
  const advisor = user.advisor || 'Faculty Placement Coordinator';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="glass-modal relative w-full max-w-lg rounded-[var(--radius-xl)] overflow-hidden z-10 animate-in zoom-in-95 duration-200"
        style={{
          color: 'var(--text-primary)',
        }}
      >
        {/* Top Header */}
        <div
          className="p-5 border-b flex items-center justify-between"
          style={{
            backgroundColor: 'var(--bg-input)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="flex items-center gap-2">
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
              }}
            >
              SRMIST Placement Dossier
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded cursor-pointer hover:opacity-75"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Profile Card Body */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  margin: 0,
                }}
              >
                {name}
              </h2>
              <p
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--green-text)',
                  margin: '4px 0 0 0',
                }}
              >
                {department} • {section}
              </p>
            </div>

            <div
              className="flex items-center gap-1.5"
              style={{
                backgroundColor: 'var(--green-light)',
                color: 'var(--green-text)',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              <ShieldCheck size={14} />
              <span>Verified Portal</span>
            </div>
          </div>

          {/* Details Grid */}
          <div
            className="grid grid-cols-2 gap-3 p-4 rounded-[var(--radius)] border text-xs"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border)',
            }}
          >
            <div>
              <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>Register Number</span>
              <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{regNo}</span>
            </div>
            <div>
              <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>Email Address</span>
              <span className="font-bold truncate block" style={{ color: 'var(--text-primary)' }}>{email}</span>
            </div>
            <div>
              <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>Batch Year</span>
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{batch}</span>
            </div>
            <div>
              <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>CGPA</span>
              <span className="font-bold" style={{ color: 'var(--green-text)' }}>{cgpa}</span>
            </div>
            <div>
              <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>10th Percentage</span>
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                {user.tenthPct || user.tenth_pct ? `${user.tenthPct || user.tenth_pct}%` : '—'}
              </span>
            </div>
            <div>
              <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>12th Percentage</span>
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                {user.twelfthPct || user.twelfth_pct ? `${user.twelfthPct || user.twelfth_pct}%` : '—'}
              </span>
            </div>
            <div className="col-span-2 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
              <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>Placement Coordinator</span>
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{advisor}</span>
            </div>
          </div>

          {/* Score Highlight Box */}
          <div
            className="p-4 rounded-[var(--radius)] border flex items-center justify-between"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border)',
            }}
          >
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                Total Score
              </span>
              <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {totalMarks} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/ 100 Marks</span>
              </span>
            </div>
            <div className="text-right text-xs font-semibold space-y-0.5">
              <div style={{ color: 'var(--green-text)' }}>{verifiedMarks} Verified</div>
              {pendingMarks > 0 && <div style={{ color: 'var(--amber-text)' }}>{pendingMarks} Pending</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
