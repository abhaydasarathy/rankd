import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MetricCard from '../components/MetricCard';
import ScorePanel from '../components/ScorePanel';
import { supabase } from '../lib/supabaseClient';
import {
  getStudentMessages,
  markMessageRead,
  markAllMessagesRead,
  normalizeCategoryId,
} from '../services';
import { calculateCodingPlatformScore } from '../utils/scoringEngine';

export default function Overview({
  categories = [],
  studentSubmissions = [],
  scoreResult = {},
  onSelectCategory,
  onOpenProfile,
  onRefreshData,
  isLoading = false,
}) {
  const { profile, user } = useAuth();
  const navigate = useNavigate();

  // Student Inbox state
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id || profile?.role === 'faculty') return;
    getStudentMessages(user.id).then((msgs) => {
      setMessages(msgs || []);
      setUnreadCount((msgs || []).filter((m) => !m.is_read).length);
    });
  }, [user?.id, profile?.role]);

  // Realtime subscription for student submissions & inbox messages
  useEffect(() => {
    if (!user?.id || profile?.role === 'faculty') return;

    const channel = supabase
      .channel(`student-${user.id}-overview-realtime`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'student_submissions',
          filter: `student_id=eq.${user.id}`,
        },
        () => {
          onRefreshData?.();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'student_messages',
          filter: `student_id=eq.${user.id}`,
        },
        () => {
          getStudentMessages(user.id).then((msgs) => {
            setMessages(msgs || []);
            setUnreadCount((msgs || []).filter((m) => !m.is_read).length);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, profile?.role, onRefreshData]);


  // Time of day greeting
  const hour = new Date().getHours();
  let timeGreeting = 'Good morning';
  if (hour >= 12 && hour < 17) {
    timeGreeting = 'Good afternoon';
  } else if (hour >= 17) {
    timeGreeting = 'Good evening';
  }

  const fullName = profile?.name || profile?.full_name || user?.user_metadata?.name || 'Student';
  const firstName = fullName.split(' ')[0] || 'Student';
  const batchYear = profile?.batch || profile?.batch_year || '2024–2028';

  // Helper to determine category verification status
  const getCategoryStatus = (cat) => {
    const catSubmissions = studentSubmissions.filter(
      (s) => s.category_id === cat.id || s.categoryId === cat.id
    );
    const catKey =
      cat.id === 'coding-platforms'
        ? 'coding'
        : cat.id === 'inhouse-projects'
        ? 'inhouse'
        : cat.id === 'assessments'
        ? 'assessment'
        : cat.id;
    const verifiedScore = scoreResult?.categoryScores?.[catKey]?.score || 0;
    const hasPending = catSubmissions.some(
      (s) => (s.status || '').toUpperCase() === 'PENDING'
    );
    if (hasPending) return 'PENDING';
    if (verifiedScore > 0) return 'VERIFIED';
    return 'UNCLAIMED';
  };

  // Show only first 4, sorted by status priority (VERIFIED -> PENDING -> UNCLAIMED)
  const priorityOrder = { VERIFIED: 0, PENDING: 1, UNCLAIMED: 2 };
  const previewCategories = [...categories]
    .sort((a, b) => priorityOrder[getCategoryStatus(a)] - priorityOrder[getCategoryStatus(b)])
    .slice(0, 4);

  return (
    <div className="page-content min-w-0 w-full">
      <div className="flex flex-col lg:flex-row items-start gap-6 p-4 sm:p-6 lg:p-7 min-w-0">
        {/* Left / Center Main Column */}
        <div className="flex-1 flex flex-col min-w-0 w-full">
          
          {/* 1. Greeting Row */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1
                style={{
                  fontSize: '22px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                {timeGreeting}, {firstName} 👋
              </h1>
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  margin: '6px 0 0 0',
                }}
              >
                Placement Metrics Evaluation & Ranking Overview
              </p>
            </div>

            {/* Academic Year Pill */}
            <div
              className="shrink-0"
              style={{
                backgroundColor: 'var(--green-light)',
                color: 'var(--green-text)',
                border: '1px solid var(--green-border)',
                borderRadius: '20px',
                padding: '4px 14px',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              Academic Year {batchYear}
            </div>
          </div>

          {/* Student Inbox Section */}
          {profile?.role !== 'faculty' && (
            <div className="student-inbox" style={{ marginTop: '20px' }}>
              <div className="inbox-header">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    Inbox
                  </span>
                  {unreadCount > 0 && <span className="unread-badge">{unreadCount} new</span>}
                </div>
                {messages.length > 0 && (
                  <button
                    type="button"
                    className="inbox-mark-all"
                    onClick={() =>
                      markAllMessagesRead(user.id).then(() =>
                        setMessages((m) => m.map((x) => ({ ...x, is_read: true })))
                      )
                    }
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {messages.length === 0 ? (
                <div className="inbox-empty">
                  <span>No messages yet — your faculty feedback will appear here when claims are reviewed.</span>
                </div>
              ) : (
                <div className="inbox-list">
                  {messages.slice(0, 5).map((msg) => (
                    <div
                      key={msg.id}
                      className={`inbox-item ${!msg.is_read ? 'inbox-item--unread' : ''} ${
                        msg.message_type === 'VERIFIED'
                          ? 'inbox-item--verified'
                          : msg.message_type === 'REJECTED'
                          ? 'inbox-item--rejected'
                          : ''
                      }`}
                      onClick={() =>
                        markMessageRead(msg.id).then(() =>
                          setMessages((m) =>
                            m.map((x) => (x.id === msg.id ? { ...x, is_read: true } : x))
                          )
                        )
                      }
                    >
                      <span className="inbox-icon">
                        {msg.message_type === 'VERIFIED' ? '✓' : '✗'}
                      </span>
                      <div className="inbox-content">
                        <div className="inbox-subject">{msg.subject}</div>
                        {msg.faculty_note && (
                          <div className="inbox-note">Faculty note: {msg.faculty_note}</div>
                        )}
                        <div className="inbox-time">
                          {new Date(msg.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. Placement Metrics Section */}
          <div style={{ marginTop: '24px' }}>
            {/* Header Row */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <h2
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    margin: 0,
                  }}
                >
                  Placement Metrics
                </h2>
                <span
                  style={{
                    backgroundColor: 'var(--green-light)',
                    color: 'var(--green-text)',
                    border: '1px solid var(--green-border)',
                    borderRadius: '20px',
                    padding: '2px 10px',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  Top 4 Highlights
                </span>
              </div>

              <button
                type="button"
                onClick={() => navigate('/my-metrics')}
                className="hover:underline cursor-pointer border-none bg-transparent"
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--green-text)',
                }}
              >
                View All ({categories.length}) →
              </button>
            </div>

            {/* 4 Cards Grid (2 columns on tablet/desktop) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {previewCategories.map((cat, index) => {
                const normCatId = normalizeCategoryId(cat.id);
                const catSubmissions = studentSubmissions.filter(
                  (s) => normalizeCategoryId(s.category_id || s.categoryId) === normCatId
                );

                const catKey =
                  cat.id === 'coding-platforms'
                    ? 'coding'
                    : cat.id === 'inhouse-projects'
                    ? 'inhouse'
                    : cat.id === 'assessments'
                    ? 'assessment'
                    : cat.id;

                const catScoreObj =
                  scoreResult?.categoryScores?.[cat.id] ||
                  scoreResult?.categoryScores?.[normCatId] ||
                  scoreResult?.categoryScores?.[catKey];
                const verifiedMarks = catScoreObj?.score || 0;

                let pendingMarks = 0;
                catSubmissions
                  .filter((s) => {
                    const st = String(s.status || '').toUpperCase();
                    return st === 'PENDING' || st === 'SUBMITTED' || st === 'DRAFT';
                  })
                  .forEach((s) => {
                    let d = s.details || {};
                    if (typeof d === 'string') {
                      try { d = JSON.parse(d); } catch (e) { d = {}; }
                    }
                    const claim = Number(d.calculated_marks ?? d.calculatedMarks ?? s.awarded_marks ?? s.awardedMarks ?? 0);
                    if (claim > 0) {
                      pendingMarks += claim;
                    } else if (normCatId === 'coding-platforms') {
                      const b = Number(d.badge_count ?? d.badgeCount ?? 0);
                      const m = Number(d.medium_hard_solved ?? d.mediumHardSolved ?? 0);
                      const calc = calculateCodingPlatformScore({ badgeCount: b, mediumHardSolved: m });
                      pendingMarks += calc.total > 0 ? calc.total : 0;
                    } else {
                      pendingMarks += normCatId === 'academics' ? 0 : 2;
                    }
                  });
                pendingMarks = Math.min(cat.maxMarks || 10, pendingMarks);

                return (
                  <MetricCard
                    key={cat.id}
                    category={cat}
                    verifiedScore={verifiedMarks}
                    pendingScore={pendingMarks}
                    categorySubmissions={catSubmissions}
                    onSelectCategory={onSelectCategory}
                    animationIndex={index}
                    isLoading={isLoading}
                  />
                );
              })}
            </div>

            {/* View All Metrics Button */}
            <button
              type="button"
              className="view-all-btn"
              onClick={() => navigate('/my-metrics')}
            >
              View All Metrics →
            </button>
          </div>
        </div>

        {/* Right Column: ScorePanel */}
        <ScorePanel
          scoreResult={scoreResult}
          onOpenProfile={() => navigate('/profile')}
        />
      </div>
    </div>
  );
}
