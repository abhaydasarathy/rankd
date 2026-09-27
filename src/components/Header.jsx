import React from "react";
import { 
  Search, 
  LogOut, 
  User, 
  Sun, 
  Moon, 
  X,
  GraduationCap,
  UserCheck
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

export default function Header({ 
  searchQuery, 
  setSearchQuery, 
  onOpenProfile, 
  currentRole, 
  setCurrentRole 
}) {
  const { theme, toggleTheme } = useTheme();
  const { profile, user, signOut } = useAuth();

  const displayName = profile?.full_name || user?.user_metadata?.full_name || "User";
  const displayRegNo = profile?.reg_no || user?.user_metadata?.reg_no || (profile?.role === "faculty" ? "FACULTY" : "STUDENT");
  const isFaculty = profile?.role === "faculty";

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  return (
    <header 
      className="sticky top-0 z-40 h-14 border-b px-4 lg:px-6 backdrop-blur-md transition-colors"
      style={{ 
        backgroundColor: 'var(--bg-card)', 
        borderColor: 'var(--border-color)',
        color: 'var(--text-primary)'
      }}
    >
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between gap-3 sm:gap-6">
        
        {/* Left: Brand & SRM Badge */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-xs tracking-tighter shadow-sm">
            R
          </div>
          <span className="text-lg font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
            rankd
          </span>
          <span 
            className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border hidden sm:inline-block"
            style={{ 
              backgroundColor: 'var(--bg-elevated)', 
              borderColor: 'var(--border-color)', 
              color: 'var(--text-secondary)' 
            }}
          >
            SRM KTR
          </span>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-sm hidden md:block">
          <div className="relative">
            <Search 
              className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" 
              style={{ color: 'var(--text-secondary)' }} 
            />
            <input
              type="text"
              placeholder="Search placement metrics, categories..."
              value={searchQuery || ""}
              onChange={(e) => setSearchQuery?.(e.target.value)}
              className="w-full h-8 border rounded-lg pl-8 pr-7 text-xs outline-none focus:border-indigo-500 transition-colors"
              style={{ 
                backgroundColor: 'var(--bg-elevated)', 
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery?.("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:opacity-75"
                style={{ color: 'var(--text-secondary)' }}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Controls & User Chip */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* Switcher if user has faculty permissions */}
          {isFaculty && (
            <div 
              className="flex items-center p-0.5 rounded-lg border text-xs"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}
            >
              <button
                onClick={() => setCurrentRole("student")}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  currentRole === "student"
                    ? "bg-indigo-600 text-white"
                    : "hover:opacity-80"
                }`}
                style={currentRole !== "student" ? { color: 'var(--text-secondary)' } : {}}
              >
                <GraduationCap className="w-3 h-3" />
                <span>Student</span>
              </button>
              <button
                onClick={() => setCurrentRole("faculty")}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  currentRole === "faculty"
                    ? "bg-indigo-600 text-white"
                    : "hover:opacity-80"
                }`}
                style={currentRole !== "faculty" ? { color: 'var(--text-secondary)' } : {}}
              >
                <UserCheck className="w-3 h-3" />
                <span>Faculty</span>
              </button>
            </div>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-1.5 rounded-lg border transition-colors hover:bg-slate-500/10 cursor-pointer"
            style={{ 
              backgroundColor: 'var(--bg-elevated)', 
              borderColor: 'var(--border-color)', 
              color: 'var(--text-secondary)' 
            }}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* User Profile Chip */}
          <button 
            onClick={onOpenProfile}
            className="flex items-center gap-2 p-1 rounded-lg border hover:opacity-90 transition-all text-left cursor-pointer"
            style={{ 
              backgroundColor: 'var(--bg-elevated)', 
              borderColor: 'var(--border-color)' 
            }}
          >
            <div 
              className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs uppercase"
              style={{ backgroundColor: 'var(--accent-color)', color: '#FFFFFF' }}
            >
              {displayName.charAt(0) || "U"}
            </div>
            <div className="hidden sm:block pr-1">
              <div className="text-xs font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                {displayName}
              </div>
              <div className="text-[10px] font-mono leading-none" style={{ color: 'var(--text-secondary)' }}>
                {displayRegNo}
              </div>
            </div>
          </button>

          {/* Sign Out */}
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 rounded-lg border hover:border-red-500/50 hover:text-red-400 transition-colors cursor-pointer"
            style={{ 
              backgroundColor: 'var(--bg-elevated)', 
              borderColor: 'var(--border-color)', 
              color: 'var(--text-secondary)' 
            }}
          >
            <LogOut className="w-4 h-4" />
          </button>

        </div>

      </div>
    </header>
  );
}
