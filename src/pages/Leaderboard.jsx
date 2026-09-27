import React, { useState, useMemo } from 'react';
import { Trophy, Search, Medal, Award, Star, ExternalLink, X } from 'lucide-react';
import { calculateTotalScore } from '../utils/scoringEngine';

export default function Leaderboard({
  studentsList = [],
  currentStudent = null,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [inspectStudent, setInspectStudent] = useState(null);

  // Compute student scores and ranks using scoringEngine
  const rankedStudents = useMemo(() => {
    return (studentsList || [])
      .map((student) => {
        const scoreResult = calculateTotalScore(student);
        const verifiedScore = scoreResult?.totalVerifiedScore ?? 0;
        const pendingScore = scoreResult?.totalPendingScore ?? 0;
        const pendingCount = (student.submissions || []).filter(
          (s) => s.status === 'PENDING' || s.status === 'Pending'
        ).length;

        let status = 'unclaimed';
        if (verifiedScore > 0 && pendingCount === 0) {
          status = 'verified';
        } else if (pendingCount > 0) {
          status = 'pending';
        }

        return {
          ...student,
          calculatedVerifiedScore: verifiedScore,
          calculatedPendingScore: pendingScore,
          computedStatus: status,
        };
      })
      .sort((a, b) => b.calculatedVerifiedScore - a.calculatedVerifiedScore);
  }, [studentsList]);

  // Extract unique departments
  const departments = useMemo(() => {
    const s = new Set();
    studentsList.forEach((st) => {
      if (st.department) s.add(st.department);
    });
    return Array.from(s);
  }, [studentsList]);

  // Filter students
  const filteredStudents = useMemo(() => {
    return rankedStudents.filter((st) => {
      const name = st.name || st.full_name || '';
      const reg = st.regNo || st.reg_no || '';

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!name.toLowerCase().includes(q) && !reg.toLowerCase().includes(q)) {
          return false;
        }
      }

      if (deptFilter !== 'all' && st.department !== deptFilter) {
        return false;
      }

      return true;
    });
  }, [rankedStudents, searchQuery, deptFilter]);

  // Top 3 Podium Students
  const top1 = rankedStudents[0];
  const top2 = rankedStudents[1];
  const top3 = rankedStudents[2];

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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs w-44"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="border px-3 py-1.5 text-xs outline-none cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top 3 Podium Cards (Rank 2 first 150ms, Rank 1 center 0ms hero, Rank 3 right 300ms) */}
      {rankedStudents.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-7 items-end">
          {/* Rank 2 (Silver) */}
          {top2 && (
            <div
              className="p-5 border flex flex-col items-center text-center transition-transform hover:-translate-y-0.5"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border)',
                borderRadius: 'var(--radius-lg, 16px)',
                animation: 'rowSlideIn 300ms ease-out forwards',
                animationDelay: '150ms',
                order: 1,
              }}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: 'rgba(148, 163, 184, 0.15)' }}>
                <Medal size={20} className="text-slate-400" />
              </div>
              <span className="rank-number rank-2 text-sm font-semibold text-slate-300">#2 Silver</span>
              <h3 className="font-semibold text-sm mt-1 mb-0.5" style={{ color: 'var(--text-primary)' }}>
                {top2.name || top2.full_name}
              </h3>
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {top2.department} • {top2.regNo || top2.reg_no}
              </span>
              <div className="mt-3 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {top2.calculatedVerifiedScore} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/ 100</span>
              </div>
            </div>
          )}

          {/* Rank 1 (Gold - Hero center, larger, green accent) */}
          {top1 && (
            <div
              className="p-6 border flex flex-col items-center text-center relative transition-transform hover:-translate-y-0.5 shadow-md"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'rgba(34, 197, 94, 0.3)',
                borderRadius: 'var(--radius-xl, 20px)',
                animation: 'rowSlideIn 300ms ease-out forwards',
                animationDelay: '0ms',
                order: 2,
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
                {top1.name || top1.full_name}
              </h3>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {top1.department} • {top1.regNo || top1.reg_no}
              </span>
              <div className="mt-3 text-2xl font-black" style={{ color: 'var(--green-text)' }}>
                {top1.calculatedVerifiedScore} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/ 100</span>
              </div>
            </div>
          )}

          {/* Rank 3 (Bronze) */}
          {top3 && (
            <div
              className="p-5 border flex flex-col items-center text-center transition-transform hover:-translate-y-0.5"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border)',
                borderRadius: 'var(--radius-lg, 16px)',
                animation: 'rowSlideIn 300ms ease-out forwards',
                animationDelay: '300ms',
                order: 3,
              }}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: 'rgba(205, 124, 74, 0.15)' }}>
                <Award size={20} style={{ color: '#CD7C4A' }} />
              </div>
              <span className="rank-number rank-3 text-sm font-semibold text-amber-600">#3 Bronze</span>
              <h3 className="font-semibold text-sm mt-1 mb-0.5" style={{ color: 'var(--text-primary)' }}>
                {top3.name || top3.full_name}
              </h3>
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {top3.department} • {top3.regNo || top3.reg_no}
              </span>
              <div className="mt-3 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {top3.calculatedVerifiedScore} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/ 100</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard Table */}
      <div
        className="overflow-hidden border"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border)',
          borderRadius: 'var(--radius-lg, 16px)',
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
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
                <th className="py-3 px-4 font-semibold w-36">Score Progress</th>
                <th className="py-3 px-4 font-semibold text-right w-24">Score</th>
                <th className="py-3 px-4 font-semibold text-right w-24">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((st, index) => {
                  const rank = index + 1;
                  const rankClass =
                    rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-other';
                  const scorePercent = Math.min(st.calculatedVerifiedScore, 100);
                  const isCurrent = currentStudent && (currentStudent.id === st.id || currentStudent.regNo === st.regNo);

                  return (
                    <tr
                      key={st.id || index}
                      className="leaderboard-row"
                      style={{
                        '--row-index': index,
                        borderBottom: '1px solid var(--border)',
                        backgroundColor: isCurrent ? 'var(--sidebar-active-bg)' : undefined,
                      }}
                      onClick={() => setInspectStudent(st)}
                    >
                      {/* Rank */}
                      <td className="py-3.5 px-4 text-center">
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
                            {(st.name || st.full_name || 'S')[0].toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold block" style={{ color: 'var(--text-primary)' }}>
                              {st.name || st.full_name}
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
                          {st.regNo || st.reg_no || 'RA2411003010000'}
                        </div>
                      </td>

                      {/* Thin Score Bar (100px width, 3px height) */}
                      <td className="py-3.5 px-4">
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
                          {st.calculatedVerifiedScore}
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
                              st.computedStatus === 'verified'
                                ? 'var(--green-light)'
                                : st.computedStatus === 'pending'
                                ? 'var(--amber-light)'
                                : 'var(--gray-badge-bg)',
                            color:
                              st.computedStatus === 'verified'
                                ? 'var(--green-text)'
                                : st.computedStatus === 'pending'
                                ? 'var(--amber-text)'
                                : 'var(--gray-badge-text)',
                            padding: '2px 8px',
                            fontSize: '11px',
                            fontWeight: 500,
                          }}
                        >
                          {st.computedStatus === 'verified'
                            ? 'Verified'
                            : st.computedStatus === 'pending'
                            ? 'Pending'
                            : 'Unclaimed'}
                        </span>
                      </td>
                    </tr>
                  );
                })
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className="w-full max-w-lg rounded-[var(--radius-lg, 16px)] border shadow-2xl p-6"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            <div className="flex items-start justify-between border-b pb-4 mb-4" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h3 className="font-semibold text-base m-0" style={{ color: 'var(--text-primary)' }}>
                  {inspectStudent.name || inspectStudent.full_name}
                </h3>
                <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {inspectStudent.department} • {inspectStudent.regNo || inspectStudent.reg_no} • CGPA: {inspectStudent.cgpa || 8.5}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectStudent(null)}
                className="p-1 rounded cursor-pointer hover:opacity-75"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-[var(--radius)] border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Institutional Placement Score:</span>
                <span className="text-lg font-bold" style={{ color: 'var(--green-text)' }}>
                  {inspectStudent.calculatedVerifiedScore} / 100
                </span>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Evidence Submissions ({inspectStudent.submissions?.length || 0})
                </h4>
                <div className="max-h-56 overflow-y-auto space-y-2">
                  {(inspectStudent.submissions || []).map((sub, idx) => (
                    <div
                      key={sub.id || idx}
                      className="p-2.5 rounded-[var(--radius)] border flex items-center justify-between gap-2"
                      style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}
                    >
                      <div>
                        <div className="font-medium text-xs" style={{ color: 'var(--text-primary)' }}>{sub.title || 'Claim'}</div>
                        <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Category: {sub.category_id || sub.categoryId}</div>
                      </div>
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: sub.status === 'VERIFIED' ? 'var(--green-light)' : 'var(--amber-light)',
                          color: sub.status === 'VERIFIED' ? 'var(--green-text)' : 'var(--amber-text)',
                          padding: '2px 8px',
                          fontSize: '10px',
                        }}
                      >
                        {sub.status || 'PENDING'}
                      </span>
                    </div>
                  ))}
                  {(!inspectStudent.submissions || inspectStudent.submissions.length === 0) && (
                    <div className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
                      No verified submissions attached yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
