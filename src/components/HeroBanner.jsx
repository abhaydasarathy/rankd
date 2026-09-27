import React from "react";
import { 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Target, 
  Mail, 
  GraduationCap,
  ShieldCheck,
  Filter
} from "lucide-react";
import { calculateTotalScore } from "../utils/scoringEngine";

export default function HeroBanner({ user, activeFilter, setActiveFilter, onOpenProfile, categoriesCount }) {
  // Compute calculated scores strictly using the SRM scoring engine
  const scoreResult = calculateTotalScore(user);
  const verifiedScore = scoreResult.totalVerifiedScore;
  const pendingScore = scoreResult.totalPendingScore;
  const totalScore = Math.min(100, verifiedScore + pendingScore);
  const remainingMarks = Math.max(0, 100 - totalScore);

  // Dynamic Tier Eligibility calculation
  let eligibilityTier = "Placement Registered";
  let tierBadgeColor = "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
  if (verifiedScore >= 80) {
    eligibilityTier = "Super Dream (20+ LPA)";
    tierBadgeColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  } else if (verifiedScore >= 60) {
    eligibilityTier = "Dream Tier (10+ LPA)";
    tierBadgeColor = "text-indigo-300 bg-indigo-500/10 border-indigo-500/20";
  } else if (verifiedScore >= 40) {
    eligibilityTier = "Core Eligible (5+ LPA)";
    tierBadgeColor = "text-amber-300 bg-amber-500/10 border-amber-500/20";
  }

  return (
    <section className="mb-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-indigo-950/40 border border-slate-800 p-6 md:p-8 shadow-2xl">
        
        {/* Glow Effects */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Side: Student Info */}
          <div className="lg:col-span-6 space-y-4">
            
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>SRMIST Institutional Evaluation Portal 2025</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">
                  {user.name}
                </h2>
                <button 
                  onClick={onOpenProfile}
                  className="px-2.5 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium border border-slate-700"
                >
                  View Profile
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400 font-medium">
                <span className="flex items-center gap-1.5 text-slate-300 font-semibold bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700/50">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                  {user.department} • <span className="text-indigo-400">{user.section}</span>
                </span>
                <span className="flex items-center gap-1.5 text-slate-300 bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700/50">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {user.email}
                </span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-400">
              <span className="flex items-center gap-1 text-slate-300">
                <Target className="w-3.5 h-3.5 text-indigo-400" />
                Reg No: <strong className="text-slate-200">{user.regNo}</strong>
              </span>
              <span className="text-slate-700">•</span>
              <span>10th: <strong className="text-slate-300">{user.tenthPct}%</strong></span>
              <span className="text-slate-700">•</span>
              <span>12th: <strong className="text-slate-300">{user.twelfthPct}%</strong></span>
              <span className="text-slate-700">•</span>
              <span>Academic CGPA: <strong className="text-emerald-400">{user.cgpa}</strong></span>
            </div>

          </div>

          {/* Right Side: Dynamic Verified Score Display & Progress Bar */}
          <div className="lg:col-span-6 bg-slate-950/70 border border-slate-800/90 rounded-2xl p-5 md:p-6 backdrop-blur-md shadow-xl">
            
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-4">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Official Verified Placement Score
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-indigo-200 to-emerald-400 tracking-tight">
                    {verifiedScore}
                  </span>
                  <span className="text-lg md:text-xl font-bold text-slate-500">
                    / 100 Marks
                  </span>
                </div>
              </div>

              {/* Dynamic Status Badge */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border self-start sm:self-auto ${tierBadgeColor}`}>
                <ShieldCheck className="w-4 h-4" />
                <div className="text-left">
                  <div className="text-[10px] uppercase font-bold tracking-wider">Placement Status</div>
                  <div className="text-[11px] font-semibold">{eligibilityTier}</div>
                </div>
              </div>
            </div>

            {/* Segmented Dual Linear Progress Bar */}
            <div className="space-y-2.5">
              <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex p-0.5 border border-slate-700/60 shadow-inner">
                {/* Verified Portion */}
                <div 
                  style={{ width: `${verifiedScore}%` }} 
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-l-full transition-all duration-500"
                  title={`Verified Score: ${verifiedScore} Marks`}
                ></div>
                {/* Pending Portion */}
                <div 
                  style={{ width: `${pendingScore}%` }} 
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
                  title={`Pending Review: ${pendingScore} Marks`}
                ></div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center justify-between text-xs font-medium pt-1 gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
                  <span className="text-slate-300 font-bold">{verifiedScore} Marks</span>
                  <span className="text-emerald-400 font-semibold">Verified</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400"></span>
                  <span className="text-slate-300 font-bold">{pendingScore} Marks</span>
                  <span className="text-amber-400 font-semibold">Pending Review</span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                  <span>{remainingMarks} Remaining</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Category Filters */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Category Filters:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: "all", label: "All Categories" },
              { key: "verified", label: "Verified" },
              { key: "pending", label: "Pending Review" },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeFilter === f.key
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-950 border border-indigo-500"
                    : "bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-800"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
