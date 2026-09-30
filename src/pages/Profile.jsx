import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldCheck, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import ScoreBanner from '../components/ScoreBanner';
import { useTilt } from '../hooks/useTilt';

const ALL_SECTIONS = [
  'All Sections',
  'A1','A2','B1','B2','C1','C2','D1','D2','E1','E2',
  'F1','F2','G1','G2','H1','H2','I1','I2','J1','J2',
  'K1','K2','L1','L2','M1','M2','N1','N2','O1','O2',
  'P1','P2','Q1','Q2','R1','R2','S1','S2','T1','T2'
];

function FacultyProfileView({ profile }) {
  const { updateProfileState } = useAuth();
  const [currentSection, setCurrentSection] = useState(
    profile?.section
      ? (profile.section.toLowerCase().includes('all')
          ? 'All Sections'
          : profile.section.replace(/^section\s*/i, ''))
      : 'All Sections'
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSectionChange = async (newSec) => {
    setCurrentSection(newSec);
    setSaving(true);
    setSaved(false);
    try {
      const storedVal = newSec === 'All Sections' ? 'All' : `Section ${newSec}`;
      const { error } = await supabase
        .from('profiles')
        .update({ section: storedVal, updated_at: new Date().toISOString() })
        .eq('id', profile.id);

      if (!error) {
        if (updateProfileState) {
          updateProfileState({ section: storedVal });
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.warn('Failed to update faculty section:', err);
    } finally {
      setSaving(false);
    }
  };
  const name = profile?.name || profile?.full_name || 'Faculty Member';
  const email = profile?.email || '';
  const department = profile?.department || 'Department Coordinator';
  const empId = profile?.reg_no || 'FAC-SRMIST';
  const initials =
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join('') || 'F';

  return (
    <div className="page-content w-full p-4 sm:p-6 lg:p-7 min-w-0 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1
          style={{
            fontSize: '22px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          Faculty Profile
        </h1>
        <p
          style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            margin: '4px 0 0 0',
          }}
        >
          SRMIST institutional placement coordinator credentials
        </p>
      </div>

      <div
        className="p-6 rounded-[var(--radius-lg)] border space-y-6"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl shrink-0 border"
            style={{
              backgroundColor: 'var(--green-light)',
              color: 'var(--green-text)',
              borderColor: 'var(--green-border)',
            }}
          >
            {initials}
          </div>

          <div className="text-center sm:text-left flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
              <h2 className="text-xl font-bold m-0 truncate" style={{ color: 'var(--text-primary)' }}>
                {name}
              </h2>
              <span
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold self-center sm:self-auto border"
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: 'var(--green-text)',
                  borderColor: 'var(--green-border)',
                }}
              >
                <ShieldCheck size={13} />
                Faculty Coordinator
              </span>
            </div>

            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              {email}
            </p>

            <div
              className="p-4 rounded-[var(--radius)] border text-xs"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              <p className="m-0 font-medium leading-relaxed">
                You are a faculty coordinator. Your account manages student placement verification.
              </p>
            </div>
          </div>
        </div>

        {/* Identity Details */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t text-xs"
          style={{ borderColor: 'var(--border)' }}
        >
          <div
            className="p-3.5 rounded border"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border)',
            }}
          >
            <span className="text-[11px] block" style={{ color: 'var(--text-muted)' }}>
              Employee / Registration ID
            </span>
            <span className="font-mono font-bold text-sm mt-0.5 block" style={{ color: 'var(--text-primary)' }}>
              {empId}
            </span>
          </div>

          <div
            className="p-3.5 rounded border"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border)',
            }}
          >
            <span className="text-[11px] block" style={{ color: 'var(--text-muted)' }}>
              Department
            </span>
            <span className="font-bold text-sm mt-0.5 block" style={{ color: 'var(--text-primary)' }}>
              {department}
            </span>
          </div>

          <div
            className="p-3.5 rounded border"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border)',
            }}
          >
            <span className="text-[11px] block" style={{ color: 'var(--text-muted)' }}>
              Institution
            </span>
            <span className="font-bold text-sm mt-0.5 block" style={{ color: 'var(--text-primary)' }}>
              SRM Institute of Science and Technology
            </span>
          </div>

          <div
            className="p-3.5 rounded border"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border)',
            }}
          >
            <span className="text-[11px] block" style={{ color: 'var(--text-muted)' }}>
              Campus
            </span>
            <span className="font-bold text-sm mt-0.5 block" style={{ color: 'var(--text-primary)' }}>
              Kattankulathur (KTR)
            </span>
          </div>

          <div
            className="p-3.5 rounded border sm:col-span-2"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] block" style={{ color: 'var(--text-muted)' }}>
                Assigned Coordinating Section
              </span>
              {saving && (
                <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                  <Loader2 size={10} className="animate-spin" /> Saving...
                </span>
              )}
              {saved && (
                <span className="text-[10px] text-[var(--green-text)] flex items-center gap-1">
                  <Check size={10} /> Saved
                </span>
              )}
            </div>
            <select
              value={currentSection}
              onChange={(e) => handleSectionChange(e.target.value)}
              className="w-full text-xs font-semibold px-2 py-1.5 rounded border outline-none"
              style={{
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border)',
              }}
            >
              {ALL_SECTIONS.map((sec) => (
                <option key={sec} value={sec}>
                  {sec === 'All Sections' ? '🌐 All Sections (Institution-wide)' : `Section ${sec}`}
                </option>
              ))}
            </select>
            <p className="text-[10px] mt-1.5 mb-0" style={{ color: 'var(--text-muted)' }}>
              Controls which students and submissions appear in your Pending Queue and Student Roster.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Profile({
  user = {},
  scoreResult = {},
}) {
  const [searchParams] = useSearchParams();
  const { profile: authProfile, user: authUser } = useAuth();
  const profile = authProfile || user || {};

  if (profile?.role === 'faculty') {
    return <FacultyProfileView profile={profile} />;
  }

  const isOnboarding = searchParams.get('onboarding') === 'true';


  const verifiedMarks = scoreResult?.totalVerifiedScore ?? 0;
  const pendingMarks = scoreResult?.totalPendingScore ?? 0;
  const unclaimedMarks = Math.max(0, 100 - verifiedMarks - pendingMarks);

  const rawFullName = profile.full_name || profile.name || user.full_name || user.name || authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || '';
  const name = rawFullName && rawFullName !== 'Student' && rawFullName !== 'User'
    ? rawFullName
    : (user.name && user.name !== 'Student' && user.name !== 'User' ? user.name : 'Student');
  const regNo = profile.reg_no || profile.regNo || user.regNo || user.reg_no || authUser?.user_metadata?.reg_no || '—';
  const email = profile.email || user.email || authUser?.email || '';
  const department = profile.department || user.department || authUser?.user_metadata?.department || 'CSE';
  const section = profile.section || user.section || authUser?.user_metadata?.section || '—';
  const batch = profile.batch || profile.batch_year || user.batch || user.batch_year || '2024–2028';
  const tenthVal = profile.tenth_pct ?? profile.tenthPct ?? user.tenthPct ?? user.tenth_pct;
  const twelfthVal = profile.twelfth_pct ?? profile.twelfthPct ?? user.twelfthPct ?? user.twelfth_pct;
  const cgpaVal = profile.cgpa ?? user.cgpa;

  const cgpa = cgpaVal !== undefined && cgpaVal !== null && Number(cgpaVal) > 0 ? `${Number(cgpaVal).toFixed(2)} / 10.0` : '—';
  const tenthPct = tenthVal !== undefined && tenthVal !== null && Number(tenthVal) > 0 ? `${Number(tenthVal).toFixed(1)}%` : '—';
  const twelfthPct = twelfthVal !== undefined && twelfthVal !== null && Number(twelfthVal) > 0 ? `${Number(twelfthVal).toFixed(1)}%` : '—';
  const advisor = profile.advisor || user.advisor || 'Faculty Placement Coordinator';

  const cgpaTilt = useTilt({ maxTilt: 5 });
  const tenthTilt = useTilt({ maxTilt: 5 });
  const twelfthTilt = useTilt({ maxTilt: 5 });

  return (
    <div className="page-content w-full p-4 sm:p-6 lg:p-7 min-w-0">
      {/* Onboarding Welcome Banner */}
      {isOnboarding && (
        <div
          style={{
            background: 'var(--green-light)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '20px',
            color: 'var(--green-text)',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <span>👋</span>
          <span>Welcome to rankd! Complete your profile below so your placement metrics calculate correctly.</span>
        </div>
      )}

      {/* 1. Score Banner */}
      <ScoreBanner
        score={verifiedMarks}
        verified={verifiedMarks}
        pending={pendingMarks}
        unclaimed={unclaimedMarks}
        maxScore={100}
      />

      {/* 2. Profile Details Grid */}
      <div className="profile-grid grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Identity Card */}
        <div
          className="profile-card p-6 border flex flex-col items-center text-center"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border)',
            borderRadius: 'var(--radius-lg, 16px)',
          }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl mb-4 border"
            style={{
              backgroundColor: 'var(--green-light)',
              color: 'var(--green-text)',
              borderColor: 'var(--green-border)',
            }}
          >
            {name[0]?.toUpperCase() || 'S'}
          </div>

          <h2 className="text-xl font-bold m-0" style={{ color: 'var(--text-primary)' }}>
            {name}
          </h2>
          <p className="text-xs mt-1 mb-4" style={{ color: 'var(--text-muted)' }}>
            {email}
          </p>

          <span
            className="status-badge mb-6"
            style={{
              backgroundColor: 'var(--green-light)',
              color: 'var(--green-text)',
              border: '1px solid var(--green-border)',
              padding: '4px 12px',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            Institutional Verified Student
          </span>

          <div className="w-full border-t pt-4 space-y-3 text-left text-xs" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--text-muted)' }}>Register Number:</span>
              <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{regNo}</span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--text-muted)' }}>Department:</span>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{department}</span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--text-muted)' }}>Section:</span>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{section}</span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--text-muted)' }}>Graduating Batch:</span>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{batch}</span>
            </div>
          </div>
        </div>

        {/* Center & Right: Academic Credentials & Ledger */}
        <div className="lg:col-span-2 space-y-6">
          {/* Academic Records */}
          <div
            className="profile-card p-6 border"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border)',
              borderRadius: 'var(--radius-lg, 16px)',
            }}
          >
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>
              Verified Academic Records
            </h3>
            <div className="academic-stats-grid grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div
                ref={cgpaTilt.ref}
                onMouseMove={cgpaTilt.onMouseMove}
                onMouseLeave={cgpaTilt.onMouseLeave}
                onMouseEnter={cgpaTilt.onMouseEnter}
                className="academic-stat-card tilt-card p-4 rounded-[var(--radius)] border text-center"
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}
              >
                <div className="tilt-gloss" aria-hidden="true" />
                <span className="text-xs block" style={{ color: 'var(--text-muted)' }}>Current CGPA</span>
                <span className="text-xl font-bold mt-1 block" style={{ color: 'var(--green-text)' }}>{cgpa}</span>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>SRMIST Registrar Verified</span>
              </div>
              <div
                ref={tenthTilt.ref}
                onMouseMove={tenthTilt.onMouseMove}
                onMouseLeave={tenthTilt.onMouseLeave}
                onMouseEnter={tenthTilt.onMouseEnter}
                className="academic-stat-card tilt-card p-4 rounded-[var(--radius)] border text-center"
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}
              >
                <div className="tilt-gloss" aria-hidden="true" />
                <span className="text-xs block" style={{ color: 'var(--text-muted)' }}>10th Standard</span>
                <span className="text-xl font-bold mt-1 block" style={{ color: 'var(--text-primary)' }}>{tenthPct}</span>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Board Certified</span>
              </div>
              <div
                ref={twelfthTilt.ref}
                onMouseMove={twelfthTilt.onMouseMove}
                onMouseLeave={twelfthTilt.onMouseLeave}
                onMouseEnter={twelfthTilt.onMouseEnter}
                className="academic-stat-card tilt-card p-4 rounded-[var(--radius)] border text-center"
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}
              >
                <div className="tilt-gloss" aria-hidden="true" />
                <span className="text-xs block" style={{ color: 'var(--text-muted)' }}>12th Standard</span>
                <span className="text-xl font-bold mt-1 block" style={{ color: 'var(--text-primary)' }}>{twelfthPct}</span>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Higher Secondary</span>
              </div>
            </div>
          </div>

          {/* Institutional Advisor & Placement Cell */}
          <div
            className="p-6 border"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border)',
              borderRadius: 'var(--radius-lg, 16px)',
            }}
          >
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
              Institutional Placement Cell
            </h3>
            <div className="space-y-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <p className="m-0">
                <strong style={{ color: 'var(--text-primary)' }}>Academic Advisor:</strong> {advisor}
              </p>
              <p className="m-0">
                <strong style={{ color: 'var(--text-primary)' }}>Campus:</strong> SRM Institute of Science and Technology, Kattankulathur (KTR)
              </p>
              <p className="m-0">
                <strong style={{ color: 'var(--text-primary)' }}>Status:</strong> Active candidate enrolled in placement evaluation
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
