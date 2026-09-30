import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Trophy, Search, Medal, Award, X, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { fetchLeaderboard } from '../services/leaderboardService';
import { useTilt } from '../hooks/useTilt';

function LeaderboardRow({ st, index, currentStudent, setInspectStudent }) {
  const rank = Number(st.rank) || (index + 1);
  const isTopThree = rank <= 3;
  const tilt = useTilt({ maxTilt: 5 });

  const rankClass =
    rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-other';
  const score = Number(st.total_verified_score ?? st.totalVerifiedScore ?? 0);
  const scorePercent = Math.min(score, 100);

  const isCurrent = currentStudent && (
    (st.student_id && currentStudent.id === st.student_id) ||
    (st.id && currentStudent.id === st.id) ||
    (st.reg_no && (currentStudent.regNo === st.reg_no || currentStudent.reg_no === st.reg_no)) ||
    (st.regNo && (currentStudent.regNo === st.regNo || currentStudent.reg_no === st.regNo))
  );

  const pendingCount = Number(st.pending_submissions_count ?? st.pendingCount ?? 0);
  const computedStatus =
    score > 0 && pendingCount === 0
      ? 'verified'
      : pendingCount > 0
      ? 'pending'
      : score > 0
      ? 'verified'
      : 'unclaimed';

  const displayName = st.full_name || st.name || 'SRM Student';
  const regNo = st.reg_no || st.regNo || 'RA2411003010000';

  return (
    <tr
      ref={isTopThree ? tilt.ref : undefined}
      onMouseMove={isTopThree ? tilt.onMouseMove : undefined}
      onMouseLeave={isTopThree ? tilt.onMouseLeave : undefined}
      onMouseEnter={isTopThree ? tilt.onMouseEnter : undefined}
      className={`leaderboard-row ${isTopThree ? 'tilt-card' : ''}`}
      style={{
        '--row-index': index,
        borderBottom: '1px solid var(--border)',
        backgroundColor: isCurrent ? 'var(--sidebar-active-bg)' : undefined,
        cursor: 'pointer',
      }}
      onClick={() => setInspectStudent(st)}
    >
      {/* Rank */}
      <td className="py-3.5 px-4 text-center">
        {isTopThree && <div className="tilt-gloss" aria-hidden="true" />}
        <span className={`rank-number ${rankClass} ${rank <= 3 ? 'rank-shine-top3' : ''}`}>
          {rank <= 3 ? `#${rank}` : rank}
        </span>
      </td>

      {/* Student Name */}
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0"
            style={{
              backgroundColor: isCurrent ? 'var(--green-light)' : 'var(--bg-input)',
              color: isCurrent ? 'var(--green-text)' : 'var(--text-primary)',
            }}
          >
            {(displayName || 'S')[0].toUpperCase()}
          </div>
          <div>
            <span className="font-semibold block" style={{ color: 'var(--text-primary)' }}>
              {displayName}
              {isCurrent && (
                <span className="ml-1.5 text-[10px] px-1.5 py-0.2 rounded font-medium" style={{ backgroundColor: 'var(--green-light)', color: 'var(--green-text)' }}>
                  You
                </span>
              )}
            </span>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {st.email || 'SRMIST Student'}
            </span>
          </div>
        </div>
      </td>

      {/* Dept & Reg No */}
      <td className="py-3.5 px-4" style={{ color: 'var(--text-secondary)' }}>
        <div>{st.department || 'CSE'} • {st.section || 'Sec A'}</div>
        <div className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {regNo}
        </div>
      </td>

      {/* Thin Score Bar (100px width, 3px height) */}
      <td className="leaderboard-col-progress py-3.5 px-4">
        <div className="flex items-center gap-2">
          <div
            className="overflow-hidden"
            style={{
              width: '100px',
              height: '3px',
              backgroundColor: 'var(--bg-input)',
              borderRadius: '9999px',
            }}
          >
            <div
              style={{
                width: `${scorePercent}%`,
                height: '100%',
                backgroundColor: 'var(--green-bar)',
                transition: 'width 600ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </div>
          <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {scorePercent}%
          </span>
        </div>
      </td>

      {/* Score */}
      <td className="py-3.5 px-4 text-right">
        <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
          {score}
        </span>
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {' '}/ 100
        </span>
      </td>

      {/* Status Badge */}
      <td className="py-3.5 px-4 text-right">
        <span
          className="status-badge"
          style={{
            backgroundColor:
              computedStatus === 'verified'
                ? 'var(--green-light)'
                : computedStatus === 'pending'
                ? 'var(--amber-light)'
                : 'var(--gray-badge-bg)',
            color:
              computedStatus === 'verified'
                ? 'var(--green-text)'
                : computedStatus === 'pending'
                ? 'var(--amber-text)'
                : 'var(--gray-badge-text)',
            padding: '2px 8px',
            fontSize: '11px',
            fontWeight: 500,
          }}
        >
          {computedStatus === 'verified'
            ? 'Verified'
            : computedStatus === 'pending'
            ? 'Pending'
            : 'Unclaimed'}
        </span>
      </td>
    </tr>
  );
}

export default function Leaderboard({
  currentStudent = null,
  studentsList = [],
}) {
  const [allStudents, setAllStudents]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError]               = useState(null);
  const [searchInput, setSearchInput]   = useState('');
  const [search, setSearch]             = useState('');
  const [department, setDepartment]     = useState('All Departments');
  const [lastUpdated, setLastUpdated]   = useState(null);
  const [refreshKey, setRefreshKey]     = useState(0);
  const [inspectStudent, setInspectStudent] = useState(null);

  // ── Debounce search input (150ms for snappy responsiveness) ────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Stable primitives for dependencies to avoid 6-second heartbeat re-fetch jitter
  const currentStudentId = currentStudent?.id || currentStudent?.reg_no || currentStudent?.regNo;
  const currentStudentSubsLen = currentStudent?.submissions?.length ?? 0;
  const studentsListLen = studentsList?.length ?? 0;

  // ── Fetch function — fetches full cohort; filtering is performed in-memory ──
  const loadLeaderboard = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent && allStudents.length === 0) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      const data = await fetchLeaderboard({
        department: null, // Always fetch all departments so dropdown never collapses
        search: '',       // Always fetch all students so search is instant and 60fps
        currentStudent,
        studentsList,
      });
      setAllStudents(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('[Leaderboard] Fetch error:', err);
      setError(err.message || 'Failed to load leaderboard data.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [currentStudentId, currentStudentSubsLen, studentsListLen, refreshKey]);

  // ── Initial & dependency fetch ─────────────────────────────────────────────
  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  // ── Realtime subscription — refetch when ANY submission or profile changes ─
  useEffect(() => {
    const channel = supabase
      .channel('leaderboard-live-updates')
      .on(
        'postgres_changes',
        {
          event: '*',                      // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'student_submissions',    // any verification/rejection triggers this
        },
        (payload) => {
          const newStatus = payload.new?.status;
          const oldStatus = payload.old?.status;
          const scoreRelevant = newStatus === 'VERIFIED' || oldStatus === 'VERIFIED';
          if (scoreRelevant || payload.eventType === 'DELETE') {
            setTimeout(() => {
              setRefreshKey((k) => k + 1);
            }, 300);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',               // academics or CGPA updates change scores
        },
        () => {
          setTimeout(() => {
            setRefreshKey((k) => k + 1);
          }, 300);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ── Extract unique departments from ALL students (Never collapses on filter) ──
  const departments = useMemo(() => {
    const s = new Set(['All Departments']);
    (allStudents || []).forEach((st) => {
      if (st.department) s.add(st.department);
    });
    return Array.from(s);
  }, [allStudents]);

  // ── Instant in-memory cohort filtering for table (0ms latency, zero flicker) ──
  const filteredStudents = useMemo(() => {
    let list = allStudents;
    if (department && department !== 'All Departments') {
      list = list.filter((s) => s.department === department);
    }
    if (search && search.trim() !== '') {
      const term = search.toLowerCase().trim();
      list = list.filter((r) =>
        r.full_name?.toLowerCase().includes(term) ||
        r.name?.toLowerCase().includes(term) ||
        r.reg_no?.toLowerCase().includes(term) ||
        r.regNo?.toLowerCase().includes(term) ||
        r.email?.toLowerCase().includes(term)
      );
    }
    return list;
  }, [allStudents, department, search]);

  // ── Derive podium candidates strictly from department cohort (Never hidden by search) ──
  const podiumStudents = useMemo(() => {
    let list = allStudents;
    if (department && department !== 'All Departments') {
      list = list.filter((s) => s.department === department);
    }
    return list.slice(0, 3);
  }, [allStudents, department]);

  const top1 = podiumStudents[0];
  const top2 = podiumStudents[1];
  const top3 = podiumStudents[2];

  return (
    <div className="page-content w-full p-4 sm:p-6 lg:p-7 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Trophy size={22} className="text-amber-500" />
            <h1
              style={{
                fontSize: '22px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              SRMIST Placement Leaderboard
            </h1>
          </div>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              margin: 0,
            }}
          >
            Verified institutional placement evaluation scores & real-time cohort standings
            {lastUpdated && (
              <span className="ml-2 text-[11px] opacity-60">
                • Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5">
          <div
            className="search-bar flex items-center gap-2 border px-3 py-1.5"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border)',
              borderRadius: 'var(--radius)',
              fontSize: '13px',
            }}
          >
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search student or reg no..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="bg-transparent border-none outline-none text-xs w-44"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>

          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="border px-3 py-1.5 text-xs outline-none cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
            }}
          >
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            title="Refresh Leaderboard"
            className="p-2 border rounded cursor-pointer hover:opacity-80 transition-opacity"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border)',
              color: 'var(--text-muted)',
            }}
          >
            <RefreshCw size={14} className={isRefreshing || loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          className="mb-6 p-3 rounded flex items-center gap-2 text-xs border"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderColor: 'rgba(239, 68, 68, 0.3)',
            color: '#EF4444',
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="ml-auto underline font-medium cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Top 3 Podium Cards (Mobile: Gold on top; Desktop: Silver left, Gold center hero, Bronze right) */}
      {!loading && podiumStudents.length > 0 && (
        <div className="leaderboard-podium grid grid-cols-1 md:grid-cols-3 gap-4 mb-7 items-end">
          {/* Rank 2 (Silver) */}
          {top2 && (
            <div
              className="leaderboard-podium-card order-2 md:order-1 p-5 border flex flex-col items-center text-center transition-transform hover:-translate-y-0.5 cursor-pointer"
              onClick={() => setInspectStudent(top2)}
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border)',
                borderRadius: 'var(--radius-lg, 16px)',
                animation: 'rowSlideIn 300ms ease-out forwards',
                animationDelay: '150ms',
              }}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: 'rgba(148, 163, 184, 0.15)' }}>
                <Medal size={20} className="text-slate-400" />
              </div>
              <span className="rank-number rank-2 text-sm font-semibold text-slate-300">#2 Silver</span>
              <h3 className="font-semibold text-sm mt-1 mb-0.5" style={{ color: 'var(--text-primary)' }}>
                {top2.full_name || top2.name}
              </h3>
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {top2.department} • {top2.reg_no || top2.regNo}
              </span>
              <div className="mt-3 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {Number(top2.total_verified_score ?? top2.totalVerifiedScore ?? 0)} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/ 100</span>
              </div>
            </div>
          )}

          {/* Rank 1 (Gold - Hero center, larger, green accent) */}
          {top1 && (
            <div
              className={`leaderboard-podium-card ${podiumStudents.length === 1 ? 'md:col-start-2' : 'order-1 md:order-2'} p-6 border flex flex-col items-center text-center relative transition-transform hover:-translate-y-0.5 shadow-md cursor-pointer`}
              onClick={() => setInspectStudent(top1)}
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'rgba(34, 197, 94, 0.3)',
                borderRadius: 'var(--radius-xl, 20px)',
                animation: 'rowSlideIn 300ms ease-out forwards',
                animationDelay: '0ms',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
              }}
            >
              <div
                className="absolute -top-3 px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase"
                style={{ backgroundColor: 'var(--green)', color: '#FFFFFF' }}
              >
                Top Candidate
              </div>
              <div className="w-11 h-11 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)' }}>
                <Trophy size={24} className="text-amber-400" />
              </div>
              <span className="rank-number rank-1 text-base font-bold text-amber-400">#1 Gold</span>
              <h3 className="font-bold text-base mt-1 mb-0.5" style={{ color: 'var(--text-primary)' }}>
                {top1.full_name || top1.name}
              </h3>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {top1.department} • {top1.reg_no || top1.regNo}
              </span>
              <div className="mt-3 text-2xl font-black" style={{ color: 'var(--green-text)' }}>
                {Number(top1.total_verified_score ?? top1.totalVerifiedScore ?? 0)} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/ 100</span>
              </div>
            </div>
          )}

          {/* Rank 3 (Bronze) */}
          {top3 && (
            <div
              className="leaderboard-podium-card order-3 md:order-3 p-5 border flex flex-col items-center text-center transition-transform hover:-translate-y-0.5 cursor-pointer"
              onClick={() => setInspectStudent(top3)}
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border)',
                borderRadius: 'var(--radius-lg, 16px)',
                animation: 'rowSlideIn 300ms ease-out forwards',
                animationDelay: '300ms',
              }}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: 'rgba(205, 124, 74, 0.15)' }}>
                <Award size={20} style={{ color: '#CD7C4A' }} />
              </div>
              <span className="rank-number rank-3 text-sm font-semibold text-amber-600">#3 Bronze</span>
              <h3 className="font-semibold text-sm mt-1 mb-0.5" style={{ color: 'var(--text-primary)' }}>
                {top3.full_name || top3.name}
              </h3>
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {top3.department} • {top3.reg_no || top3.regNo}
              </span>
              <div className="mt-3 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {Number(top3.total_verified_score ?? top3.totalVerifiedScore ?? 0)} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/ 100</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard Table */}
      <div
        className="leaderboard-table-wrapper overflow-hidden border"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border)',
          borderRadius: 'var(--radius-lg, 16px)',
        }}
      >
        <div className="overflow-x-auto">
          <table className="leaderboard-table w-full text-left border-collapse text-xs">
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-secondary)',
                }}
              >
                <th className="py-3 px-4 font-semibold w-16 text-center">Rank</th>
                <th className="py-3 px-4 font-semibold">Student</th>
                <th className="py-3 px-4 font-semibold">Department & Reg No</th>
                <th className="leaderboard-col-progress py-3 px-4 font-semibold w-36">Score Progress</th>
                <th className="py-3 px-4 font-semibold text-right w-24">Score</th>
                <th className="py-3 px-4 font-semibold text-right w-24">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && allStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 size={24} className="animate-spin text-green-500" />
                      <span className="text-xs font-medium">Loading placement leaderboard...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length > 0 ? (
                filteredStudents.map((st, index) => (
                  <LeaderboardRow
                    key={st.id || st.student_id || index}
                    st={st}
                    index={index}
                    currentStudent={currentStudent}
                    setInspectStudent={setInspectStudent}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-10" style={{ color: 'var(--text-muted)' }}>
                    No students match the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Student Modal */}
      {inspectStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setInspectStudent(null);
          }}
        >
          <div
            className="w-full max-w-lg rounded-[var(--radius-lg, 16px)] border shadow-2xl p-6 relative"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            <div className="flex items-start justify-between border-b pb-4 mb-4" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h3 className="font-semibold text-base m-0" style={{ color: 'var(--text-primary)' }}>
                  {inspectStudent.full_name || inspectStudent.name}
                </h3>
                <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {inspectStudent.department} • {inspectStudent.reg_no || inspectStudent.regNo} • CGPA: {inspectStudent.cgpa || 0}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectStudent(null)}
                aria-label="Close modal"
                className="p-1 rounded cursor-pointer hover:opacity-75 transition-opacity"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-[var(--radius)] border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Institutional Placement Score:</span>
                <span className="text-lg font-bold" style={{ color: 'var(--green-text)' }}>
                  {Number(inspectStudent.total_verified_score ?? inspectStudent.totalVerifiedScore ?? 0)} / 100
                </span>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Criteria Score Breakdown (11 Categories)
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: 'Academics', score: inspectStudent.academics_score, max: 10 },
                    { label: 'Certifications', score: inspectStudent.skillset_score, max: 15 },
                    { label: 'GitHub Activity', score: inspectStudent.github_score, max: 15 },
                    { label: 'Coding Platforms', score: inspectStudent.coding_score, max: 10 },
                    { label: 'Internships', score: inspectStudent.internship_score, max: 10 },
                    { label: 'Hackathons', score: inspectStudent.hackathons_score, max: 10 },
                    { label: 'Assessments', score: inspectStudent.assessments_score, max: 10 },
                    { label: 'In-House Projects', score: inspectStudent.inhouse_score, max: 8 },
                    { label: 'Tech Projects', score: inspectStudent.projects_score, max: 5 },
                    { label: 'Full Stack App', score: inspectStudent.fullstack_score, max: 5 },
                    { label: 'Memberships', score: inspectStudent.membership_score, max: 2 },
                  ].map((cat) => (
                    <div
                      key={cat.label}
                      className="p-2 rounded border flex items-center justify-between"
                      style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}
                    >
                      <span className="text-[11px] truncate mr-1" style={{ color: 'var(--text-secondary)' }}>
                        {cat.label}
                      </span>
                      <span className="font-semibold text-[11px] shrink-0" style={{ color: 'var(--text-primary)' }}>
                        {Number(typeof cat.score === 'object' ? (cat.score?.score ?? 0) : (cat.score ?? 0))} / {cat.max}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
