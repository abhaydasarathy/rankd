import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './components/AuthPage';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import Overview from './pages/Overview';
import MyMetrics from './pages/MyMetrics';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import FacultyPendingQueue from './pages/faculty/FacultyPendingQueue';
import FacultyStudentList from './pages/faculty/FacultyStudentList';
import FacultyStudentInspect from './pages/faculty/FacultyStudentInspect';
import CategorySheet from './components/CategorySheet';
import AcademicsWorkspace from './components/AcademicsWorkspace';
import {
  GitHubWorkspace,
  CodingPlatformWorkspace,
  InternshipWorkspace,
  SkillsetWorkspace,
  ProjectsWorkspace,
  FullStackWorkspace,
  HackathonsWorkspace,
  InHouseWorkspace,
  MembershipWorkspace,
  AssessmentsWorkspace,
} from './components/workspaces';
import ProfileModal from './components/ProfileModal';
import Toast from './components/Toast';

import { PLACEMENT_CATEGORIES } from './data/categories';
import { calculateTotalScore } from './utils/scoringEngine';
import {
  getPlacementCategories,
  getStudentSubmissions,
  getAllStudentProfiles,
  getAllSubmissions,
  upsertStudentSubmission,
  updateStudentProfile,
  verifySubmission,
  rejectSubmission,
  normalizeCategoryId,
  normalizeSection,
  isSameSection,
} from './services';
import { Loader2 } from 'lucide-react';
import { supabase } from './lib/supabaseClient';


function PortalShell() {
  const { user, profile, loading: authLoading, updateProfileState, refreshProfile } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState(PLACEMENT_CATEGORIES);

  // Sidebar hover-expand state (rail: 64px, expanded: 224px)
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Live Supabase data
  const [studentSubmissions, setStudentSubmissions] = useState([]);
  const [facultyStudents, setFacultyStudents] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Category Drawer & Modals
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const selectedCatId = useMemo(() => {
    if (!selectedCategory) return null;
    return normalizeCategoryId(selectedCategory?.id || selectedCategory);
  }, [selectedCategory]);

  // Toast System
  const [toast, setToast] = useState(null);

  const showToast = useCallback((title, message, type = 'success') => {
    setToast({ title, message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  // Fetch placement categories from DB or fallback
  useEffect(() => {
    getPlacementCategories().then((cats) => {
      if (cats && cats.length > 0) {
        setCategories(cats);
      }
    });
  }, []);

  // Fetch current student submissions
  const loadStudentSubmissions = useCallback(async (studentId) => {
    if (!studentId) return;
    try {
      const data = await getStudentSubmissions(studentId);
      setStudentSubmissions(data || []);
    } catch (err) {
      console.warn('Submissions query notice:', err);
    }
  }, []);

  // Fetch all students and submissions for faculty view / leaderboard
  const loadFacultyData = useCallback(async () => {
    try {
      const [studentProfiles, allSubmissions] = await Promise.all([
        getAllStudentProfiles(),
        getAllSubmissions(),
      ]);

      const joined = (studentProfiles || []).map((st) => {
        const subs = (allSubmissions || []).filter((s) => s.studentId === st.id);
        return {
          id: st.id,
          name: st.name || st.fullName || 'Student',
          full_name: st.fullName || st.name || 'Student',
          email: st.email,
          regNo: st.regNo,
          reg_no: st.regNo,
          department: st.department,
          section: st.section,
          batch: st.batch || '2024–2028',
          batch_year: st.batch || '2024–2028',
          cgpa: st.cgpa || 0,
          tenthPct: st.tenthPct || 0,
          twelfthPct: st.twelfthPct || 0,
          advisor: st.advisor,
          submissions: subs.map((s) => ({
            id: s.id,
            categoryId: s.categoryId,
            category_id: s.categoryId,
            title: s.title,
            details: s.details || {},
            proof_url: s.proofUrl,
            status: s.status,
            awardedMarks: s.awardedMarks || 0,
            awarded_marks: s.awardedMarks || 0,
            verifier_notes: s.verifierNotes || '',
            created_at: s.created_at || s.createdAt || null,
            createdAt: s.createdAt || s.created_at || null,
            updated_at: s.updated_at || s.updatedAt || null,
            updatedAt: s.updatedAt || s.updated_at || null,
          })),
        };
      });

      // Ensure any submissions from students not yet in studentProfiles are not dropped from faculty queue
      const existingStudentIds = new Set((studentProfiles || []).map((p) => p.id));
      const orphanedSubs = (allSubmissions || []).filter((s) => s.studentId && !existingStudentIds.has(s.studentId));
      if (orphanedSubs.length > 0) {
        const orphanMap = {};
        orphanedSubs.forEach((s) => {
          if (!orphanMap[s.studentId]) {
            orphanMap[s.studentId] = {
              id: s.studentId,
              name: s.studentName || 'SRM Student',
              full_name: s.studentName || 'SRM Student',
              email: s.studentEmail || '',
              regNo: s.studentRegNo || 'RA2411003010000',
              reg_no: s.studentRegNo || 'RA2411003010000',
              department: s.studentDepartment || 'CSE',
              section: s.studentSection || 'Section A',
              batch: '2024–2028',
              batch_year: '2024–2028',
              cgpa: 0,
              tenthPct: 0,
              twelfthPct: 0,
              submissions: [],
            };
          }
          orphanMap[s.studentId].submissions.push({
            id: s.id,
            categoryId: s.categoryId,
            category_id: s.categoryId,
            title: s.title,
            details: s.details || {},
            proof_url: s.proofUrl,
            status: s.status,
            awardedMarks: s.awardedMarks || 0,
            awarded_marks: s.awardedMarks || 0,
            verifier_notes: s.verifierNotes || '',
            created_at: s.created_at || s.createdAt || null,
            createdAt: s.createdAt || s.created_at || null,
            updated_at: s.updated_at || s.updatedAt || null,
            updatedAt: s.updatedAt || s.updated_at || null,
          });
        });
        Object.values(orphanMap).forEach((o) => joined.push(o));
      }

      setFacultyStudents(joined);
    } catch (err) {
      console.warn('Faculty data exception:', err);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    const promises = [loadStudentSubmissions(user.id), loadFacultyData()];
    Promise.all(promises).finally(() => setDataLoading(false));
  }, [user, loadStudentSubmissions, loadFacultyData]);

  // Realtime subscription on student_submissions for instant live updates across student & faculty
  useEffect(() => {
    const studentId = profile?.id || user?.id;
    if (!studentId) return;

    const isFaculty = profile?.role === 'faculty' || user?.user_metadata?.role === 'faculty';

    // Faculty listens to all submissions; students listen to their own submissions
    const channelConfig = isFaculty
      ? { event: '*', schema: 'public', table: 'student_submissions' }
      : { event: '*', schema: 'public', table: 'student_submissions', filter: `student_id=eq.${studentId}` };

    const channel = supabase
      .channel(`submissions_rt_${studentId}_${Date.now()}`)
      .on('postgres_changes', channelConfig, async () => {
        await Promise.all([
          loadStudentSubmissions(studentId),
          refreshProfile?.(),
          loadFacultyData(),
        ]);
      })
      .subscribe();

    // Window focus & periodic heartbeat sync (every 6s) to ensure 100% data consistency
    const handleSync = () => {
      loadStudentSubmissions(studentId);
      loadFacultyData();
    };
    window.addEventListener('focus', handleSync);
    const syncTimer = setInterval(handleSync, 6000);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', handleSync);
      clearInterval(syncTimer);
    };
  }, [profile?.id, profile?.role, user?.id, user?.user_metadata?.role, loadStudentSubmissions, refreshProfile, loadFacultyData]);

  // Current active student profile with submissions attached for scoring
  const currentStudent = useMemo(() => {
    return {
      id: profile?.id || user?.id,
      name: profile?.name || profile?.full_name || user?.user_metadata?.name || 'Student',
      email: profile?.email || user?.email,
      regNo: profile?.reg_no || profile?.regNo || user?.user_metadata?.reg_no || '',
      reg_no: profile?.reg_no || profile?.regNo || user?.user_metadata?.reg_no || '',
      department: profile?.department || 'CSE',
      section: profile?.section || 'Section A',
      batch: profile?.batch || profile?.batch_year || '2024–2028',
      cgpa: profile?.cgpa ?? 0,
      tenthPct: profile?.tenth_pct ?? profile?.tenthPct ?? 0,
      twelfthPct: profile?.twelfth_pct ?? profile?.twelfthPct ?? 0,
      advisor: profile?.advisor || 'Faculty Placement Coordinator',
      submissions: studentSubmissions.map((s) => ({
        id: s.id,
        categoryId: s.category_id || s.categoryId,
        category_id: s.category_id || s.categoryId,
        title: s.title,
        details: s.details || {},
        proof_url: s.proof_url || s.proofUrl,
        status: s.status,
        awardedMarks: s.awarded_marks || s.awardedMarks || 0,
        awarded_marks: s.awarded_marks || s.awardedMarks || 0,
        verifier_notes: s.verifier_notes || s.verifierNotes || '',
        created_at: s.created_at || s.createdAt || null,
        createdAt: s.createdAt || s.created_at || null,
        updated_at: s.updated_at || s.updatedAt || null,
        updatedAt: s.updatedAt || s.updated_at || null,
      })),
    };
  }, [profile, user, studentSubmissions]);

  // Scoring engine calculation
  const scoreResult = useMemo(() => {
    return calculateTotalScore(currentStudent);
  }, [currentStudent]);

  // Handle proof submission
  const handleSubmitProof = async (categoryId, newSubmission) => {
    try {
      if (categoryId === 'academics' && newSubmission.details) {
        const { tenthPct, twelfthPct, cgpa } = newSubmission.details;
        const numTenth = Number(tenthPct);
        const numTwelfth = Number(twelfthPct);
        const numCgpa = Number(cgpa);

        await updateStudentProfile(currentStudent.id, {
          tenthPct: numTenth,
          twelfthPct: numTwelfth,
          cgpa: numCgpa,
        });

        if (updateProfileState) {
          updateProfileState({
            tenth_pct: numTenth,
            twelfth_pct: numTwelfth,
            cgpa: numCgpa,
            tenthPct: numTenth,
            twelfthPct: numTwelfth,
          });
        }
      }

      const calcMarks =
        newSubmission.details?.calculated_marks !== undefined
          ? Number(newSubmission.details.calculated_marks)
          : newSubmission.awarded_marks !== undefined
          ? Number(newSubmission.awarded_marks)
          : 0;

      const submissionDetails = {
        ...(newSubmission.details || {}),
        calculated_marks: calcMarks,
      };

      await upsertStudentSubmission({
        studentId: currentStudent.id,
        categoryId: categoryId,
        title: newSubmission.title,
        details: submissionDetails,
        proofUrl: newSubmission.proof_url || newSubmission.proofUrl || null,
        calculatedMarks: calcMarks,
      });

      showToast('Marks Saved', `${newSubmission.title || 'Submission'} saved successfully.`, 'success');
      await Promise.all([
        refreshProfile?.(),
        loadStudentSubmissions(currentStudent.id),
        loadFacultyData(),
      ]);
    } catch (err) {
      console.error('Submission error:', err);
      showToast('Submission Error', err.message || 'Failed to submit proof.', 'error');
    }
  };

  // Handle faculty verification
  const handleVerifySubmission = async (studentId, submissionId, status, notes, awardedMarks = 0) => {
    try {
      if (status === 'VERIFIED') {
        await verifySubmission({
          submissionId,
          facultyId: user?.id,
          awardedMarks,
          verifierNotes: notes,
        });
      } else {
        await rejectSubmission({
          submissionId,
          facultyId: user?.id,
          verifierNotes: notes,
        });
      }
      await Promise.all([
        loadFacultyData(),
        studentId ? loadStudentSubmissions(studentId) : Promise.resolve(),
      ]);
      showToast('Ledger Updated', `Status set to ${status}.`, 'success');
    } catch (err) {
      console.error('Verification error:', err);
      showToast('Update Error', err.message || 'Failed to update verification status.', 'error');
      throw err;
    }
  };

  // Filter categories by search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter((cat) => {
      return (
        cat.title.toLowerCase().includes(q) ||
        cat.shortDescription?.toLowerCase().includes(q) ||
        cat.rubricText?.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, categories]);

  const isFacultyRole = profile?.role === 'faculty';

  const facultyPendingCount = useMemo(() => {
    if (!isFacultyRole) return 0;
    const facSec = normalizeSection(profile?.section);
    let count = 0;
    (facultyStudents || []).forEach((st) => {
      if (!facSec || facSec === 'ALL' || isSameSection(st.section, facSec)) {
        (st.submissions || []).forEach((sub) => {
          if ((sub.status || '').toUpperCase() === 'PENDING') count++;
        });
      }
    });
    return count;
  }, [isFacultyRole, facultyStudents, profile?.section]);

  const location = useLocation();

  if (authLoading) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center gap-3"
        style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)' }}
      >
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--green)' }} />
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Loading rankd portal...
        </span>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div 
      className="min-h-screen w-full relative"
      style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)' }}
    >
      {/* 1. Collapsible & Responsive Left Sidebar (Rail 64px / Hover 224px) */}
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onExpandChange={setIsSidebarExpanded}
        pendingCount={isFacultyRole ? facultyPendingCount : 0}
      />

      {/* 2. Fixed Top Navigation Bar (56px) */}
      <TopNav
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isSidebarExpanded={isSidebarExpanded}
        onToggleMobileMenu={() => setIsMobileMenuOpen(true)}
      />

      {/* 3. Main Content Area with Dynamic Margin & Page Transition */}
      <main
        className="main-content min-h-screen"
        style={{
          paddingTop: '56px',
          marginLeft: isSidebarExpanded ? '224px' : '64px',
          transition: 'margin-left 240ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Routes>
          {isFacultyRole ? (
            <>
              <Route path="/faculty/pending" element={<FacultyPendingQueue />} />
              <Route path="/faculty/students" element={<FacultyStudentList />} />
              <Route path="/faculty/students/:studentId" element={<FacultyStudentInspect />} />
              <Route
                path="/leaderboard"
                element={
                  <Leaderboard
                    studentsList={facultyStudents}
                    currentStudent={currentStudent}
                  />
                }
              />
              <Route
                path="/profile"
                element={
                  <Profile
                    user={currentStudent}
                    scoreResult={scoreResult}
                  />
                }
              />
              <Route path="*" element={<Navigate to="/faculty/pending" replace />} />
            </>
          ) : (
            <>
              <Route path="/" element={<Navigate to="/overview" replace />} />
              <Route path="/faculty" element={<Navigate to="/overview" replace />} />
              <Route
                path="/overview"
                element={
                  <Overview
                    categories={filteredCategories}
                    studentSubmissions={currentStudent.submissions}
                    scoreResult={scoreResult}
                    onSelectCategory={setSelectedCategory}
                    onRefreshData={() => {
                      refreshProfile?.();
                      loadStudentSubmissions(currentStudent.id);
                    }}
                    isLoading={dataLoading}
                  />
                }
              />
              <Route
                path="/my-metrics"
                element={
                  <MyMetrics
                    categories={filteredCategories}
                    studentSubmissions={currentStudent.submissions}
                    scoreResult={scoreResult}
                    onSelectCategory={setSelectedCategory}
                    onRefreshData={() => {
                      refreshProfile?.();
                      loadStudentSubmissions(currentStudent.id);
                    }}
                    isLoading={dataLoading}
                  />
                }
              />
              <Route
                path="/profile"
                element={
                  <Profile
                    user={currentStudent}
                    scoreResult={scoreResult}
                  />
                }
              />
              <Route
                path="/leaderboard"
                element={
                  <Leaderboard
                    studentsList={facultyStudents}
                    currentStudent={currentStudent}
                  />
                }
              />
              <Route path="*" element={<Navigate to="/overview" replace />} />
            </>
          )}
        </Routes>
      </main>

      {/* 4a. Academics Focused Workspace (940px Centered Modal) */}
      {Boolean(selectedCategory) && selectedCatId === 'academics' && (
        <AcademicsWorkspace
          isOpen={Boolean(selectedCategory)}
          onClose={() => setSelectedCategory(null)}
          studentProfile={currentStudent}
          submissions={currentStudent.submissions.filter(
            (s) => normalizeCategoryId(s.category_id || s.categoryId) === 'academics'
          )}
          verifiedScore={scoreResult?.categoryScores?.academics?.score || 0}
          scoreResult={scoreResult}
          onSubmitProof={handleSubmitProof}
          showToast={showToast}
        />
      )}

      {/* 4b. GitHub Profile Workspace */}
      {Boolean(selectedCategory) && selectedCatId === 'github' && (
        <GitHubWorkspace
          isOpen={Boolean(selectedCategory)}
          onClose={() => setSelectedCategory(null)}
          studentProfile={currentStudent}
          submissions={currentStudent.submissions.filter(
            (s) => normalizeCategoryId(s.category_id || s.categoryId) === 'github'
          )}
          verifiedScore={scoreResult?.categoryScores?.github?.score || 0}
          scoreResult={scoreResult}
          onSubmitProof={handleSubmitProof}
          showToast={showToast}
        />
      )}

      {/* 4c. Coding Practice Platform Workspace */}
      {Boolean(selectedCategory) && selectedCatId === 'coding-platforms' && (
        <CodingPlatformWorkspace
          isOpen={Boolean(selectedCategory)}
          onClose={() => setSelectedCategory(null)}
          studentProfile={currentStudent}
          submissions={currentStudent.submissions.filter(
            (s) => normalizeCategoryId(s.category_id || s.categoryId) === 'coding-platforms'
          )}
          verifiedScore={scoreResult?.categoryScores?.['coding-platforms']?.score ?? scoreResult?.categoryScores?.coding?.score ?? 0}
          scoreResult={scoreResult}
          onSubmitProof={handleSubmitProof}
          showToast={showToast}
        />
      )}

      {/* 4d. Internship Experience Workspace */}
      {Boolean(selectedCategory) && selectedCatId === 'internship' && (
        <InternshipWorkspace
          isOpen={Boolean(selectedCategory)}
          onClose={() => setSelectedCategory(null)}
          studentProfile={currentStudent}
          submissions={currentStudent.submissions.filter(
            (s) => normalizeCategoryId(s.category_id || s.categoryId) === 'internship'
          )}
          verifiedScore={scoreResult?.categoryScores?.internship?.score || 0}
          scoreResult={scoreResult}
          onSubmitProof={handleSubmitProof}
          showToast={showToast}
        />
      )}

      {/* 4e. Skillset & Certifications Workspace */}
      {Boolean(selectedCategory) && selectedCatId === 'skillset' && (
        <SkillsetWorkspace
          isOpen={Boolean(selectedCategory)}
          onClose={() => setSelectedCategory(null)}
          studentProfile={currentStudent}
          submissions={currentStudent.submissions.filter(
            (s) => normalizeCategoryId(s.category_id || s.categoryId) === 'skillset'
          )}
          verifiedScore={scoreResult?.categoryScores?.skillset?.score || 0}
          scoreResult={scoreResult}
          onSubmitProof={handleSubmitProof}
          showToast={showToast}
        />
      )}

      {/* 4f. Projects Done Workspace */}
      {Boolean(selectedCategory) && selectedCatId === 'projects' && (
        <ProjectsWorkspace
          isOpen={Boolean(selectedCategory)}
          onClose={() => setSelectedCategory(null)}
          studentProfile={currentStudent}
          submissions={currentStudent.submissions.filter(
            (s) => normalizeCategoryId(s.category_id || s.categoryId) === 'projects'
          )}
          verifiedScore={scoreResult?.categoryScores?.projects?.score || 0}
          scoreResult={scoreResult}
          onSubmitProof={handleSubmitProof}
          showToast={showToast}
        />
      )}

      {/* 4g. Full Stack Developer Experience Workspace */}
      {Boolean(selectedCategory) && selectedCatId === 'fullstack' && (
        <FullStackWorkspace
          isOpen={Boolean(selectedCategory)}
          onClose={() => setSelectedCategory(null)}
          studentProfile={currentStudent}
          submissions={currentStudent.submissions.filter(
            (s) => normalizeCategoryId(s.category_id || s.categoryId) === 'fullstack'
          )}
          verifiedScore={scoreResult?.categoryScores?.fullstack?.score || 0}
          scoreResult={scoreResult}
          onSubmitProof={handleSubmitProof}
          showToast={showToast}
        />
      )}

      {/* 4h. Competitions & Hackathons Workspace */}
      {Boolean(selectedCategory) && selectedCatId === 'hackathons' && (
        <HackathonsWorkspace
          isOpen={Boolean(selectedCategory)}
          onClose={() => setSelectedCategory(null)}
          studentProfile={currentStudent}
          submissions={currentStudent.submissions.filter(
            (s) => normalizeCategoryId(s.category_id || s.categoryId) === 'hackathons'
          )}
          verifiedScore={scoreResult?.categoryScores?.hackathons?.score || 0}
          scoreResult={scoreResult}
          onSubmitProof={handleSubmitProof}
          showToast={showToast}
        />
      )}

      {/* 4i. In-House Projects Workspace */}
      {Boolean(selectedCategory) && selectedCatId === 'inhouse-projects' && (
        <InHouseWorkspace
          isOpen={Boolean(selectedCategory)}
          onClose={() => setSelectedCategory(null)}
          studentProfile={currentStudent}
          submissions={currentStudent.submissions.filter(
            (s) => normalizeCategoryId(s.category_id || s.categoryId) === 'inhouse-projects'
          )}
          verifiedScore={scoreResult?.categoryScores?.['inhouse-projects']?.score ?? scoreResult?.categoryScores?.inhouse?.score ?? 0}
          scoreResult={scoreResult}
          onSubmitProof={handleSubmitProof}
          showToast={showToast}
        />
      )}

      {/* 4j. Professional Membership Workspace */}
      {Boolean(selectedCategory) && selectedCatId === 'membership' && (
        <MembershipWorkspace
          isOpen={Boolean(selectedCategory)}
          onClose={() => setSelectedCategory(null)}
          studentProfile={currentStudent}
          submissions={currentStudent.submissions.filter(
            (s) => normalizeCategoryId(s.category_id || s.categoryId) === 'membership'
          )}
          verifiedScore={scoreResult?.categoryScores?.membership?.score || 0}
          scoreResult={scoreResult}
          onSubmitProof={handleSubmitProof}
          showToast={showToast}
        />
      )}

      {/* 4k. SHL / Talent / NCET Assessment Workspace */}
      {Boolean(selectedCategory) && selectedCatId === 'assessments' && (
        <AssessmentsWorkspace
          isOpen={Boolean(selectedCategory)}
          onClose={() => setSelectedCategory(null)}
          studentProfile={currentStudent}
          submissions={currentStudent.submissions.filter(
            (s) => normalizeCategoryId(s.category_id || s.categoryId) === 'assessments'
          )}
          verifiedScore={scoreResult?.categoryScores?.assessments?.score ?? scoreResult?.categoryScores?.assessment?.score ?? 0}
          scoreResult={scoreResult}
          onSubmitProof={handleSubmitProof}
          showToast={showToast}
        />
      )}

      {/* 5. Profile Modal */}
      <ProfileModal
        user={currentStudent}
        scoreResult={scoreResult}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      {/* 6. Toast Notifications */}
      {toast && (
        <Toast
          toast={toast}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <PortalShell />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
