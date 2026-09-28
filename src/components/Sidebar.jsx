import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BarChart3, User, Trophy, X, Clock, Users } from 'lucide-react';
import { RankdSymbol } from './RankdLogo';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { normalizeSection, isSameSection, getFacultyPendingSubmissions } from '../services';

export default function Sidebar({
  onOpenProfile,
  isMobileOpen = false,
  onCloseMobile,
  onExpandChange,
  pendingCount = 0,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();
  const currentPath = location.pathname;

  const { user, profile } = useAuth();
  const role = profile?.role || 'student';
  const isFaculty = role === 'faculty';

  // Live pending count subscription for faculty
  const [facultyLivePending, setFacultyLivePending] = useState(0);

  useEffect(() => {
    if (role !== 'faculty' || !user?.id) return;

    let isMounted = true;

    const fetchCount = async () => {
      try {
        const pendingList = await getFacultyPendingSubmissions(user.id);
        if (isMounted) {
          setFacultyLivePending(Array.isArray(pendingList) ? pendingList.length : 0);
        }
      } catch (err) {
        console.warn('Faculty pending count error:', err);
        if (isMounted) setFacultyLivePending(0);
      }
    };

    fetchCount();

    const channelId = `sidebar-faculty-count-${user.id}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'student_submissions' },
        fetchCount
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'faculty_student_mappings' },
        fetchCount
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [role, user?.id, profile?.section]);

  const effectivePendingCount = isFaculty ? facultyLivePending : pendingCount;

  // Micro-interaction: Live pulse when pending count increases
  const prevCountRef = useRef(null);
  const [isCounterPulsing, setIsCounterPulsing] = useState(false);

  useEffect(() => {
    if (prevCountRef.current !== null && effectivePendingCount > prevCountRef.current) {
      setIsCounterPulsing(true);
      const timer = setTimeout(() => setIsCounterPulsing(false), 220);
      return () => clearTimeout(timer);
    }
    prevCountRef.current = effectivePendingCount;
  }, [effectivePendingCount]);

  const navItems = isFaculty
    ? [
        { id: 'pending', path: '/faculty/pending', label: 'Pending Queue', icon: Clock },
        { id: 'students', path: '/faculty/students', label: 'My Students', icon: Users },
        { id: 'leaderboard', path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
        { id: 'profile', path: '/profile', label: 'My Profile', icon: User },
      ]
    : [
        { id: 'overview', path: '/overview', label: 'Overview', icon: Home },
        { id: 'metrics', path: '/my-metrics', label: 'My Metrics', icon: BarChart3 },
        { id: 'profile', path: '/profile', label: 'Profile', icon: User },
        { id: 'leaderboard', path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
      ];

  const handleMouseEnter = () => {
    setIsExpanded(true);
    onExpandChange?.(true);
  };

  const handleMouseLeave = () => {
    setIsExpanded(false);
    onExpandChange?.(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-xs transition-opacity"
          aria-hidden="true"
        />
      )}

      <aside
        className={`sidebar select-none ${isExpanded ? 'sidebar--expanded' : 'sidebar--rail'} ${
          isMobileOpen ? 'translate-x-0 !w-[224px]' : '-translate-x-full md:translate-x-0'
        }`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label="Sidebar Navigation"
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Top Branding Section */}
          <div
            className="flex items-center justify-between border-b shrink-0 h-[56px]"
            style={{
              padding: isExpanded ? '0 18px' : '0 12px',
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div
                className="flex items-center justify-center shrink-0"
                style={{ width: isExpanded ? '28px' : '40px' }}
                title="rankd — know your place."
              >
                <RankdSymbol size={24} />
              </div>
              <div className="sidebar-logo-text flex flex-col min-w-0 overflow-hidden">
                <span
                  className="font-bold tracking-tight leading-tight"
                  style={{ fontSize: '17px', color: 'var(--text-primary)' }}
                >
                  rankd
                </span>
                <span
                  className="tracking-normal leading-normal whitespace-nowrap"
                  style={{ fontSize: '11px', color: 'var(--text-muted)' }}
                >
                  {isFaculty ? 'faculty portal' : 'know your place.'}
                </span>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={onCloseMobile}
              className="md:hidden p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>
          </div>

          {/* Section Label: MAIN */}
          {isExpanded && (
            <div
              className="sidebar-label"
              style={{
                fontSize: '10px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                padding: '18px 20px 8px',
                fontWeight: 600,
              }}
            >
              {isFaculty ? 'FACULTY LEDGER' : 'MAIN'}
            </div>
          )}

          {/* Nav Items */}
          <nav
            className="flex flex-col flex-1"
            style={{ paddingTop: isExpanded ? '4px' : '16px' }}
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                currentPath === item.path ||
                (!isFaculty && item.path === '/overview' && (currentPath === '/' || currentPath === '')) ||
                (isFaculty && item.path === '/faculty/pending' && (currentPath === '/' || currentPath === '' || currentPath === '/faculty'));

              const isCounterItem = (!isFaculty && item.id === 'overview') || (isFaculty && item.id === 'pending');

              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => {
                    if (onCloseMobile) onCloseMobile();
                  }}
                  title={!isExpanded ? item.label : undefined}
                  className={`nav-item relative ${isActive ? 'active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <div className="nav-icon shrink-0">
                    <Icon size={18} />
                  </div>

                  {/* Rail state dot if counter > 0 */}
                  {isCounterItem && effectivePendingCount > 0 && !isExpanded && (
                    <span
                      className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                        isCounterPulsing ? 'counter-pulse-active' : ''
                      }`}
                      style={{ backgroundColor: 'var(--amber-bar)' }}
                    />
                  )}

                  {isExpanded && (
                    <div className="flex items-center justify-between flex-1 min-w-0 pr-1">
                      <span className="sidebar-label truncate">{item.label}</span>
                      {isCounterItem && effectivePendingCount > 0 && (
                        <span
                          className={`nav-pending-badge ${
                            isCounterPulsing ? 'counter-pulse-active' : ''
                          }`}
                        >
                          {effectivePendingCount}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Campus Info (Only in expanded state) */}
        <div
          className="border-t shrink-0"
          style={{
            borderColor: 'var(--border)',
            padding: isExpanded ? '14px 16px' : '14px 0',
          }}
        >
          {isExpanded ? (
            <div
              className="sidebar-label"
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                lineHeight: '1.35',
              }}
            >
              <p style={{ margin: 0 }}>SRM Institute of</p>
              <p style={{ margin: 0 }}>Science and Technology</p>
              <p style={{ margin: '2px 0 0 0', fontWeight: 600, color: 'var(--text-secondary)' }}>
                KTR Campus
              </p>
            </div>
          ) : (
            <div className="w-full flex items-center justify-center" title="SRMIST KTR Campus">
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.05em',
                }}
              >
                KTR
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
