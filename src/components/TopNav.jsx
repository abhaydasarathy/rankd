import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sun, Moon, ChevronDown, LogOut, User as UserIcon, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function TopNav({
  searchQuery = '',
  setSearchQuery,
  onOpenProfile,
  isSidebarExpanded = false,
  isSidebarCollapsed = false,
  onToggleMobileMenu,
}) {
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isThemeSwitching, setIsThemeSwitching] = useState(false);

  // Micro-interaction 9: Subtle backdrop blur & opacity elevation on scroll (>10px)
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 10);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleThemeToggle = () => {
    setIsThemeSwitching(true);
    setTimeout(() => {
      toggleTheme();
      setTimeout(() => {
        setIsThemeSwitching(false);
      }, 50);
    }, 150);
  };

  const displayName = profile?.name || profile?.full_name || user?.user_metadata?.name || 'User';
  const displayRegNo = profile?.reg_no || user?.user_metadata?.reg_no || (profile?.role === 'faculty' ? 'FACULTY' : 'STUDENT');
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('') || 'U';

  const sidebarWidth = isSidebarExpanded ? '224px' : '64px';

  return (
    <header
      className={`top-nav-header fixed top-0 right-0 z-20 flex items-center justify-between ${
        isScrolled ? 'top-nav-scrolled' : ''
      }`}
      style={{
        height: '56px',
        left: sidebarWidth,
        backgroundColor: isScrolled ? 'var(--glass-bg-topnav-scrolled)' : 'var(--bg-card)',
        borderBottom: isScrolled ? '1px solid var(--glass-border)' : '1px solid var(--border)',
        padding: '0 24px',
        gap: '16px',
      }}
    >
      {/* Mobile Hamburger Button */}
      {onToggleMobileMenu && (
        <button
          type="button"
          onClick={onToggleMobileMenu}
          aria-label="Open navigation menu"
          className="md:hidden flex items-center justify-center p-2 rounded-[var(--radius)] border cursor-pointer shrink-0"
          style={{
            backgroundColor: 'var(--bg-input)',
            borderColor: 'var(--border)',
            color: 'var(--text-secondary)',
          }}
        >
          <Menu size={18} />
        </button>
      )}

      {/* Search Bar (Center, Flex-grow) */}
      <div className="flex-1 max-w-xl">
        <div
          className="search-bar flex items-center gap-2.5"
          style={{
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '8px 14px',
            fontSize: '13px',
          }}
        >
          <Search size={15} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search metrics, submissions, or resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none outline-none"
            style={{
              color: 'var(--text-primary)',
              fontSize: '13px',
            }}
          />
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Theme Toggle Button */}
        <button
          onClick={handleThemeToggle}
          aria-label="Toggle theme"
          className="flex items-center justify-center cursor-pointer transition-colors border"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-input)',
            borderColor: 'var(--border)',
            color: 'var(--text-secondary)',
          }}
        >
          <div className={`theme-toggle-icon flex items-center justify-center ${isThemeSwitching ? 'switching' : ''}`}>
            {theme === 'dark' ? (
              <Sun size={16} className="text-amber-400" />
            ) : (
              <Moon size={16} style={{ color: 'var(--text-secondary)' }} />
            )}
          </div>
        </button>

        {/* User Chip */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1 rounded-[var(--radius)] cursor-pointer hover:opacity-90 transition-opacity"
            style={{ color: 'var(--text-primary)' }}
          >
            {/* Avatar image with fallback initials */}
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="w-8 h-8 rounded-full object-cover border"
                style={{ borderColor: 'var(--border)' }}
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
                style={{
                  backgroundColor: 'var(--green-light)',
                  color: 'var(--green-text)',
                  border: '1px solid var(--green-border)',
                }}
              >
                {initials}
              </div>
            )}

            <div className="hidden sm:flex flex-col text-left leading-tight">
              <span className="font-semibold text-[13px]" style={{ color: 'var(--text-primary)' }}>
                {displayName}
              </span>
              <span className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {displayRegNo}
              </span>
            </div>

            <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
          </button>

          {/* User Dropdown Menu */}
          {dropdownOpen && (
            <div
              className="glass-dropdown absolute right-0 mt-2 w-48 rounded-[var(--radius)] py-1.5 z-50 animate-in fade-in duration-150"
            >
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  navigate('/profile');
                }}
                className="w-full text-left px-4 py-2 text-xs flex items-center gap-2 hover:opacity-80 cursor-pointer transition-colors"
                style={{ color: 'var(--text-primary)' }}
              >
                <UserIcon size={14} />
                <span>View Profile</span>
              </button>
              <button
                onClick={async () => {
                  setDropdownOpen(false);
                  await signOut();
                }}
                className="w-full text-left px-4 py-2 text-xs flex items-center gap-2 cursor-pointer text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
