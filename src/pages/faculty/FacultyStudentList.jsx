import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { getFacultyStudents, normalizeCategoryId } from '../../services';
import {
  Search,
  Eye,
  Users,
  Loader2,
  Award,
  Sparkles,
  BarChart3,
  X,
  ExternalLink,
  FileText,
  CheckCircle2,
  Clock,
  Lock,
  GraduationCap,
  Code2,
  Briefcase,
  FolderGit2,
  Layers,
  Trophy,
  Building2,
  ShieldCheck,
  CheckSquare,
  AlertCircle,
} from 'lucide-react';
import { calculateTotalScore } from '../../utils/scoringEngine';
import { PLACEMENT_CATEGORIES } from '../../data/categories';

function GithubIcon({ size = 18, className = 'w-4 h-4 shrink-0', ...props }) {
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

const CATEGORY_ICONS = {
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
  ShieldCheck,
};

export default function FacultyStudentList() {
  const { user, profile } = useAuth();
  const [students, setStudents] = useState([]);
  const [scores, setScores] = useState({}); // studentId -> { total_verified_score, total_pending_score, calculated, submissions }
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStudentForMetrics, setSelectedStudentForMetrics] = useState(null);
  const [metricsFilter, setMetricsFilter] = useState('all'); // 'all' | 'verified' | 'pending' | 'unclaimed'
  const navigate = useNavigate();

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const studs = await getFacultyStudents(user.id);
      setStudents(studs || []);

      if (studs && studs.length > 0) {
        const studentIds = studs.map((s) => s.id).filter(Boolean);

        // 1. Fetch DB placement scores view
        const { data: viewData } = await supabase
          .from('student_placement_scores')
          .select('*')
          .in('student_id', studentIds);

        // 2. Fetch all student submissions to compute reliable real-time score
        const { data: subsData } = await supabase
          .from('student_submissions')
          .select('*')
          .in('student_id', studentIds);

        const subsByStudent = {};
        (subsData || []).forEach((s) => {
          if (!subsByStudent[s.student_id]) subsByStudent[s.student_id] = [];
          subsByStudent[s.student_id].push(s);
        });

        const viewMap = {};
        (viewData || []).forEach((r) => {
          viewMap[r.student_id] = r;
        });

        const scoreMap = {};
        studs.forEach((st) => {
          const studentSubs = subsByStudent[st.id] || [];
          const calculated = calculateTotalScore({
            tenthPct: Number(st.tenth_pct ?? st.tenthPct ?? 0),
            twelfthPct: Number(st.twelfth_pct ?? st.twelfthPct ?? 0),
            cgpa: Number(st.cgpa ?? 0),
            submissions: studentSubs,
          });

          const vRow = viewMap[st.id];
          const verifiedScore = calculated?.totalVerifiedScore ?? 0;
          const pendingScore = calculated?.totalPendingScore ?? 0;

          scoreMap[st.id] = {
            ...(vRow || {}),
            total_verified_score: verifiedScore,
            total_pending_score: pendingScore,
            calculated,
            submissions: studentSubs,
          };
        });

        setScores(scoreMap);
      }
    } catch (err) {
      console.error('Failed to load faculty students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const filtered = students.filter((s) => {
    const name = s.name || s.full_name || '';
    const regNo = s.reg_no || '';
    return (
      !search ||
      name.toLowerCase().includes(search.toLowerCase()) ||
      regNo.toLowerCase().includes(search.toLowerCase())
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    const scoreA = Number(scores[a.id]?.total_verified_score || 0);
    const scoreB = Number(scores[b.id]?.total_verified_score || 0);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return Number(b.cgpa || 0) - Number(a.cgpa || 0);
  });

  // Selected student score data for the metrics modal
  const activeStudentScoreData = selectedStudentForMetrics
    ? scores[selectedStudentForMetrics.id] || {}
    : {};
  const activeVerified = Number(activeStudentScoreData.total_verified_score || 0);
  const activePending = Number(activeStudentScoreData.total_pending_score || 0);
  const activeUnclaimed = Math.max(0, 100 - activeVerified - activePending);

  return (
    <div className="page-content w-full p-4 sm:p-6 lg:p-7 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            My Students
          </h1>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              margin: '4px 0 0 0',
            }}
          >
            Assigned student roster and real-time placement readiness status ({students.length} students mapped)
          </p>
        </div>
        <span
          className="px-3 py-1 rounded text-xs font-medium border self-start sm:self-auto flex items-center gap-1.5"
          style={{
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-secondary)',
            borderColor: 'var(--border)',
          }}
        >
          Coordinating: <strong style={{ color: 'var(--text-primary)' }}>{profile?.section || 'All Sections'}</strong>
        </span>
      </div>

      {/* Search Bar */}
      <div
        className="p-3.5 rounded-[var(--radius-lg)] border mb-6 flex items-center gap-3"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            placeholder="Search by student name or register number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-[var(--radius)] border outline-none"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </div>

      {/* Table Card */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 gap-3">
          <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'var(--green)' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Loading student roster...
          </span>
        </div>
      ) : sorted.length === 0 ? (
        <div
          className="text-center p-12 rounded-[var(--radius-lg)] border"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border)',
          }}
        >
          <Users size={36} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <h3 className="text-base font-semibold m-0" style={{ color: 'var(--text-primary)' }}>
            No Students Found
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {search
              ? 'No mapped students matched your search query.'
              : 'You do not have any students assigned yet. Contact placement admin.'}
          </p>
        </div>
      ) : (
        <div
          className="rounded-[var(--radius-lg)] border overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr
                  className="border-b uppercase font-semibold text-[11px] tracking-wider"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <th className="py-3 px-4 w-12 text-center">Rank</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Dept / Section</th>
                  <th className="py-3 px-4 text-center">CGPA</th>
                  <th className="py-3 px-4 text-right">Verified Score & Metrics</th>
                  <th className="py-3 px-4 text-right">Pending Claims</th>
                  <th className="py-3 px-4 text-right">Evaluation</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {sorted.map((st, index) => {
                  const studentScore = scores[st.id] || {};
                  const verifiedScore = Number(studentScore.total_verified_score || 0);
                  const pendingScore = Number(studentScore.total_pending_score || 0);

                  const studentName = st.name || st.full_name || 'Student';
                  const initials =
                    studentName
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((n) => n[0].toUpperCase())
                      .join('') || 'S';

                  return (
                    <tr
                      key={st.id}
                      className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      {/* Rank */}
                      <td className="py-3 px-4 text-center font-mono font-bold" style={{ color: 'var(--text-muted)' }}>
                        #{index + 1}
                      </td>

                      {/* Name + Reg No */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border"
                            style={{
                              backgroundColor: 'var(--green-light)',
                              color: 'var(--green-text)',
                              borderColor: 'var(--border)',
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                              {studentName}
                            </div>
                            <div className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
                              {st.reg_no || '—'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Dept / Section */}
                      <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>
                        <div>{st.department || 'CSE Core'}</div>
                        <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {st.section ? `Section ${st.section.replace(/^Section\s*/i, '')}` : '—'}
                        </div>
                      </td>

                      {/* CGPA */}
                      <td className="py-3 px-4 text-center font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {st.cgpa ? Number(st.cgpa).toFixed(2) : '—'}
                      </td>

                      {/* Verified Score WITH Button next to it to view metrics */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <div className="text-right">
                            <span className="font-mono font-bold text-sm" style={{ color: 'var(--green-text)' }}>
                              {verifiedScore.toFixed(1)}
                            </span>
                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                              {' '}
                              / 100
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedStudentForMetrics(st)}
                            className="px-2.5 py-1 rounded text-xs font-semibold cursor-pointer border inline-flex items-center gap-1.5 transition-all hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
                            style={{
                              backgroundColor: 'var(--bg-input)',
                              borderColor: 'var(--border)',
                              color: 'var(--text-primary)',
                            }}
                            title={`View ${studentName}'s Metrics (Read-Only)`}
                          >
                            <BarChart3 size={13} style={{ color: 'var(--green-text)' }} />
                            <span>View Metrics</span>
                          </button>
                        </div>
                      </td>

                      {/* Pending Score */}
                      <td className="py-3 px-4 text-right font-mono">
                        {pendingScore > 0 ? (
                          <span
                            className="px-2 py-0.5 rounded text-[11px] font-semibold"
                            style={{
                              backgroundColor: 'rgba(245, 158, 11, 0.15)',
                              color: 'var(--amber-text)',
                            }}
                          >
                            +{pendingScore.toFixed(1)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => navigate(`/faculty/students/${st.id}`)}
                          className="px-2.5 py-1 rounded text-xs font-semibold cursor-pointer border inline-flex items-center gap-1 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                          style={{
                            backgroundColor: 'var(--bg-input)',
                            borderColor: 'var(--border)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          <Eye size={12} style={{ color: 'var(--green-text)' }} />
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* READ-ONLY STUDENT METRICS MODAL (Like "My Metrics" for Teachers)        */}
      {/* Direct modifications locked — changes occur only via Student Submissions*/}
      {/* ====================================================================== */}
      {selectedStudentForMetrics && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSelectedStudentForMetrics(null)}
        >
          <div
            className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-[var(--radius-xl)] border shadow-2xl overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className="p-5 border-b flex items-start justify-between gap-4 shrink-0"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border)',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border"
                  style={{
                    backgroundColor: 'var(--green-light)',
                    color: 'var(--green-text)',
                    borderColor: 'var(--border)',
                  }}
                >
                  {(selectedStudentForMetrics.name || selectedStudentForMetrics.full_name || 'S')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold m-0" style={{ color: 'var(--text-primary)' }}>
                      {selectedStudentForMetrics.full_name || selectedStudentForMetrics.name}
                    </h2>
                  </div>
                  <div className="text-xs font-mono flex items-center gap-2 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    <span>{selectedStudentForMetrics.reg_no || 'Reg No Pending'}</span>
                    <span>•</span>
                    <span>{selectedStudentForMetrics.department || 'CSE'}</span>
                    <span>•</span>
                    <span>{selectedStudentForMetrics.section ? `Section ${selectedStudentForMetrics.section.replace(/^Section\s*/i, '')}` : 'Section A'}</span>
                    <span>•</span>
                    <span style={{ color: 'var(--text-primary)' }}>CGPA: {Number(selectedStudentForMetrics.cgpa || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const stId = selectedStudentForMetrics.id;
                    setSelectedStudentForMetrics(null);
                    navigate(`/faculty/students/${stId}`);
                  }}
                  className="px-3 py-1.5 rounded text-xs font-semibold cursor-pointer border inline-flex items-center gap-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <Eye size={13} style={{ color: 'var(--green-text)' }} />
                  Full Audit Dossier
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStudentForMetrics(null)}
                  className="p-1.5 rounded-[var(--radius)] hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Read-Only Safety Notice */}
            <div
              className="px-5 py-2.5 text-xs flex items-center gap-2 border-b"
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                borderColor: 'rgba(59, 130, 246, 0.2)',
                color: 'var(--text-secondary)',
              }}
            >
              <Lock size={14} className="shrink-0 text-blue-500" />
              <span>
                <strong>Read-Only Metrics View:</strong> Faculty cannot modify marks directly from this view. Changes and mark awards are processed strictly when the student submits an activity for review in your <strong>Pending Verification Queue</strong>.
              </span>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-5 overflow-y-auto space-y-6">
              {/* Score Summary Card (Like ScoreBanner) */}
              <div
                className="p-4 sm:p-5 rounded-[var(--radius-lg)] border flex flex-col md:flex-row items-center justify-between gap-5"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border)',
                }}
              >
                <div className="flex items-center gap-6 w-full md:w-auto">
                  <div>
                    <span className="text-[11px] font-semibold tracking-wider uppercase block" style={{ color: 'var(--text-muted)' }}>
                      Total Verified Score
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="font-mono text-3xl font-bold" style={{ color: 'var(--green-text)' }}>
                        {activeVerified.toFixed(1)}
                      </span>
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                        / 100 Marks
                      </span>
                    </div>
                  </div>

                  <div className="h-10 w-[1px] bg-[var(--border)] hidden sm:block" />

                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--green-bar)' }} />
                        <span style={{ color: 'var(--text-secondary)' }}>Verified</span>
                      </div>
                      <span className="font-bold block mt-0.5" style={{ color: 'var(--green-text)' }}>
                        {activeVerified.toFixed(1)}m
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--amber-bar)' }} />
                        <span style={{ color: 'var(--text-secondary)' }}>Pending</span>
                      </div>
                      <span className="font-bold block mt-0.5" style={{ color: 'var(--amber-text)' }}>
                        +{activePending.toFixed(1)}m
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-neutral-600" />
                        <span style={{ color: 'var(--text-secondary)' }}>Unclaimed</span>
                      </div>
                      <span className="font-bold block mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {activeUnclaimed.toFixed(1)}m
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress bar preview */}
                <div className="w-full md:w-56 space-y-1.5">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span style={{ color: 'var(--text-muted)' }}>Completion</span>
                    <span style={{ color: 'var(--text-primary)' }}>{Math.round(activeVerified)}%</span>
                  </div>
                  <div
                    className="w-full h-2 rounded-full overflow-hidden flex"
                    style={{ backgroundColor: 'var(--bg-card)' }}
                  >
                    <div style={{ width: `${Math.min(activeVerified, 100)}%`, backgroundColor: 'var(--green-bar)' }} />
                    <div style={{ width: `${Math.min(activePending, 100 - activeVerified)}%`, backgroundColor: 'var(--amber-bar)' }} />
                  </div>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold m-0" style={{ color: 'var(--text-primary)' }}>
                  11 Placement Rubric Criteria
                </h3>
                <div
                  className="flex items-center gap-1 p-1 rounded-[var(--radius)] border"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border)',
                  }}
                >
                  {['all', 'verified', 'pending', 'unclaimed'].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setMetricsFilter(f)}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                        metricsFilter === f
                          ? 'font-bold shadow-sm'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                      style={{
                        backgroundColor: metricsFilter === f ? 'var(--sidebar-active-bg)' : 'transparent',
                        color: metricsFilter === f ? 'var(--sidebar-active-text)' : 'inherit',
                      }}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* 11 Metric Cards Grid (Styled like MyMetrics) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {PLACEMENT_CATEGORIES.map((cat, idx) => {
                  const normCatId = normalizeCategoryId(cat.id);
                  const catSubmissions = (activeStudentScoreData.submissions || []).filter(
                    (s) => normalizeCategoryId(s.category_id || s.categoryId) === normCatId
                  );

                  // Extract verified & pending marks
                  const catKey =
                    cat.id === 'coding-platforms'
                      ? 'coding'
                      : cat.id === 'inhouse-projects'
                      ? 'inhouse'
                      : cat.id === 'assessments'
                      ? 'assessment'
                      : cat.id;

                  const catScoreObj =
                    activeStudentScoreData.calculated?.categoryScores?.[cat.id] ||
                    activeStudentScoreData.calculated?.categoryScores?.[normCatId] ||
                    activeStudentScoreData.calculated?.categoryScores?.[catKey];

                  const verifiedMarks = Number(catScoreObj?.score || 0);

                  let pendingMarks = 0;
                  catSubmissions
                    .filter((s) => ['PENDING', 'SUBMITTED', 'DRAFT'].includes(String(s.status || '').toUpperCase()))
                    .forEach((s) => {
                      let d = s.details || {};
                      if (typeof d === 'string') {
                        try { d = JSON.parse(d); } catch (e) { d = {}; }
                      }
                      const claim = Number(d.calculated_marks ?? d.calculatedMarks ?? s.awarded_marks ?? 0);
                      pendingMarks += claim > 0 ? claim : 2;
                    });
                  pendingMarks = Math.min(cat.maxMarks, pendingMarks);

                  const isVerified = verifiedMarks > 0;
                  const hasPending = pendingMarks > 0;

                  // Filter check
                  if (metricsFilter === 'verified' && !isVerified) return null;
                  if (metricsFilter === 'pending' && !hasPending) return null;
                  if (metricsFilter === 'unclaimed' && (isVerified || hasPending)) return null;

                  const IconComponent = CATEGORY_ICONS[cat.iconName] || Award;
                  const verifiedWidth = Math.min(Math.round((verifiedMarks / cat.maxMarks) * 100), 100);
                  const pendingWidth = Math.min(Math.round((pendingMarks / cat.maxMarks) * 100), 100 - verifiedWidth);

                  // Primary active submission
                  const primarySub = catSubmissions.find((s) => s.status === 'VERIFIED') || catSubmissions[0];
                  let subDetails = primarySub?.details || {};
                  if (typeof subDetails === 'string') {
                    try { subDetails = JSON.parse(subDetails); } catch (e) { subDetails = {}; }
                  }

                  const proofUrl =
                    primarySub?.proof_url ||
                    primarySub?.proofUrl ||
                    subDetails?.proof_url ||
                    subDetails?.proofUrl ||
                    subDetails?.publicUrl;

                  return (
                    <div
                      key={cat.id}
                      className="p-4 rounded-[var(--radius-lg)] border flex flex-col justify-between transition-all"
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      <div>
                        {/* Top: Icon + Title + Status */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded flex items-center justify-center shrink-0 border"
                              style={{
                                backgroundColor: isVerified
                                  ? 'var(--green-light)'
                                  : hasPending
                                  ? 'rgba(245, 158, 11, 0.1)'
                                  : 'var(--bg-input)',
                                borderColor: 'var(--border)',
                                color: isVerified
                                  ? 'var(--green-text)'
                                  : hasPending
                                  ? 'var(--amber-text)'
                                  : 'var(--text-muted)',
                              }}
                            >
                              <IconComponent size={15} />
                            </div>
                            <div>
                              <div className="font-semibold text-xs leading-tight" style={{ color: 'var(--text-primary)' }}>
                                {cat.title}
                              </div>
                              <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                Max: {cat.maxMarks}m
                              </div>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-semibold border shrink-0"
                            style={{
                              backgroundColor: isVerified
                                ? 'var(--green-light)'
                                : hasPending
                                ? 'rgba(245, 158, 11, 0.15)'
                                : 'var(--bg-input)',
                              color: isVerified
                                ? 'var(--green-text)'
                                : hasPending
                                ? 'var(--amber-text)'
                                : 'var(--text-muted)',
                              borderColor: isVerified
                                ? 'var(--green-bar)'
                                : hasPending
                                ? 'var(--amber-bar)'
                                : 'var(--border)',
                            }}
                          >
                            {isVerified ? 'VERIFIED' : hasPending ? 'PENDING' : 'UNCLAIMED'}
                          </span>
                        </div>

                        {/* Marks & Progress Bar */}
                        <div className="my-2.5">
                          <div className="flex justify-between items-baseline text-[11px] font-mono mb-1">
                            <span className="font-bold" style={{ color: isVerified ? 'var(--green-text)' : 'var(--text-secondary)' }}>
                              {verifiedMarks.toFixed(1)} / {cat.maxMarks}m
                            </span>
                            {pendingMarks > 0 && (
                              <span className="text-[10px] font-semibold" style={{ color: 'var(--amber-text)' }}>
                                +{pendingMarks.toFixed(1)}m review
                              </span>
                            )}
                          </div>
                          <div
                            className="w-full h-1.5 rounded-full overflow-hidden flex"
                            style={{ backgroundColor: 'var(--bg-input)' }}
                          >
                            <div style={{ width: `${verifiedWidth}%`, backgroundColor: 'var(--green-bar)' }} />
                            <div style={{ width: `${pendingWidth}%`, backgroundColor: 'var(--amber-bar)' }} />
                          </div>
                        </div>

                        {/* Category Evidence / Key Metadata Preview */}
                        <div
                          className="p-2 rounded text-[11px] space-y-1 mb-2"
                          style={{
                            backgroundColor: 'var(--bg-input)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {cat.id === 'academics' ? (
                            <div className="grid grid-cols-3 gap-1 text-center font-mono">
                              <div>
                                <span className="text-[9px] block text-[var(--text-muted)]">10th</span>
                                <span className="font-semibold text-[var(--text-primary)]">
                                  {Number(selectedStudentForMetrics.tenth_pct ?? selectedStudentForMetrics.tenthPct ?? 0)}%
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] block text-[var(--text-muted)]">12th</span>
                                <span className="font-semibold text-[var(--text-primary)]">
                                  {Number(selectedStudentForMetrics.twelfth_pct ?? selectedStudentForMetrics.twelfthPct ?? 0)}%
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] block text-[var(--text-muted)]">CGPA</span>
                                <span className="font-semibold text-[var(--text-primary)]">
                                  {Number(selectedStudentForMetrics.cgpa ?? 0).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          ) : primarySub ? (
                            <div>
                              <div className="font-semibold text-[var(--text-primary)] truncate">
                                {primarySub.title || 'Submission Details'}
                              </div>
                              {subDetails.company_name && (
                                <div className="text-[10px] text-[var(--text-muted)]">Company: {subDetails.company_name}</div>
                              )}
                              {subDetails.cert_name && (
                                <div className="text-[10px] text-[var(--text-muted)]">Cert: {subDetails.cert_name} ({subDetails.provider || ''})</div>
                              )}
                              {subDetails.event_name && (
                                <div className="text-[10px] text-[var(--text-muted)]">Event: {subDetails.event_name}</div>
                              )}
                            </div>
                          ) : (
                            <div className="text-[10px] italic text-[var(--text-muted)]">
                              No submissions logged for this category yet.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Proof File Link (Read-Only) */}
                      <div className="pt-1 flex items-center justify-between text-[11px] border-t" style={{ borderColor: 'var(--border)' }}>
                        {proofUrl ? (
                          <a
                            href={proofUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-semibold hover:underline"
                            style={{ color: 'var(--green-text)' }}
                          >
                            <FileText size={12} />
                            <span>View Proof ↗</span>
                          </a>
                        ) : (
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            No proof attached
                          </span>
                        )}

                        <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                          Read-Only
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div
              className="p-4 border-t flex items-center justify-between text-xs shrink-0"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border)',
                color: 'var(--text-muted)',
              }}
            >
              <span>
                To evaluate or award marks, open the <strong>Pending Queue</strong> when submissions arrive.
              </span>
              <button
                type="button"
                onClick={() => setSelectedStudentForMetrics(null)}
                className="px-4 py-1.5 rounded text-xs font-semibold cursor-pointer border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
