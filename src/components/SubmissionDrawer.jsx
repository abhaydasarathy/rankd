import React, { useState, useEffect } from "react";
import { 
  X, 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  Building, 
  Briefcase, 
  Clock, 
  AlertCircle, 
  Award, 
  Link as LinkIcon, 
  Calendar,
  GraduationCap,
  Code2,
  FolderGit2,
  Layers,
  Trophy,
  ShieldCheck,
  CheckSquare,
  GitBranch
} from "lucide-react";
import { uploadProofFile } from "../lib/supabaseClient";

export default function SubmissionDrawer({ metric, isOpen, onClose, onSubmit, studentId }) {
  // Common Form States
  const [submissionTitle, setSubmissionTitle] = useState("");
  const [comments, setComments] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Category Specific States
  // 1. Academics
  const [tenthPct, setTenthPct] = useState("94.5");
  const [twelfthPct, setTwelfthPct] = useState("92.0");
  const [cgpa, setCgpa] = useState("9.20");

  // 2. GitHub
  const [reposLastYear, setReposLastYear] = useState("24");
  const [monthlyFreq, setMonthlyFreq] = useState("2");
  const [githubType, setGithubType] = useState("profile");

  // 3. Coding Platforms
  const [codingBadges, setCodingBadges] = useState("18");
  const [mediumHardSolved, setMediumHardSolved] = useState("165");

  // 4. Internship
  const [companyName, setCompanyName] = useState("");
  const [internshipTier, setInternshipTier] = useState("Fortune 500");
  const [durationMonths, setDurationMonths] = useState("3");
  const [isPaid, setIsPaid] = useState(false);

  // 5. Skillsets / Certifications
  const [certProvider, setCertProvider] = useState("CISCO");
  const [certName, setCertName] = useState("");

  // 6. Projects Done
  const [projectType, setProjectType] = useState("WEB");

  // 7. Full Stack
  const [frontendTech, setFrontendTech] = useState("React");
  const [backendTech, setBackendTech] = useState("Node.js / Express");
  const [databaseTech, setDatabaseTech] = useState("PostgreSQL");

  // 8. Hackathons
  const [prizePlacement, setPrizePlacement] = useState("1st Prize");

  // 9. In-House
  const [facultyMentor, setFacultyMentor] = useState("");
  const [universityName, setUniversityName] = useState("SRMIST");

  // 10. Memberships
  const [membershipOrg, setMembershipOrg] = useState("IEEE");
  const [membershipId, setMembershipId] = useState("");

  // 11. Assessments
  const [assessmentType, setAssessmentType] = useState("SHL");
  const [rawAssessmentScore, setRawAssessmentScore] = useState("88");

  useEffect(() => {
    if (metric) {
      setSubmissionTitle("");
      setComments("");
      setUploadedFile(null);
      setUploadError("");
      setIsSubmitting(false);
      setCompanyName("");
      setCertName("");
      setFacultyMentor("");
      setMembershipId("");
    }
  }, [metric]);

  if (!isOpen || !metric) return null;

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setUploadedFile(e.dataTransfer.files[0]);
      setUploadError("");
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedFile(e.target.files[0]);
      setUploadError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Validation per category
    if (metric.id === "internship" && !companyName.trim()) {
      setUploadError("Company name is required.");
      return;
    }

    if (metric.id === "skillset" && !certName.trim()) {
      setUploadError("Certification / Course name is required.");
      return;
    }

    setIsSubmitting(true);
    setUploadError("");

    try {
      // Handle file upload via Supabase storage helper
      let proofDocUrl = `${metric.id}_Proof.pdf`;
      if (uploadedFile) {
        const uploadRes = await uploadProofFile(studentId || "student-01", uploadedFile);
        proofDocUrl = uploadRes.name || uploadRes.url;
      }

      // Build submission detail payload according to rubric category
      let title = submissionTitle || `${metric.title} Submission`;
      let detailsObj = {};

      switch (metric.id) {
        case "academics":
          title = `Academics Update (10th: ${tenthPct}%, 12th: ${twelfthPct}%, CGPA: ${cgpa})`;
          detailsObj = { tenthPct: Number(tenthPct), twelfthPct: Number(twelfthPct), cgpa: Number(cgpa) };
          break;

        case "github":
          title = githubType === "community_project" 
            ? `GitHub Community Project: ${submissionTitle || "React Ecosystem Contributor"}` 
            : `GitHub Sync (${reposLastYear} Repos, ${monthlyFreq}/mo)`;
          detailsObj = { reposLastYear: Number(reposLastYear), monthlyFreq: Number(monthlyFreq), type: githubType };
          break;

        case "coding-platforms":
          title = `Coding Platforms (${codingBadges} Badges, ${mediumHardSolved} Med+Hard Solved)`;
          detailsObj = { badges: Number(codingBadges), solved: Number(mediumHardSolved) };
          break;

        case "internship":
          title = `${companyName} (${internshipTier}) - ${durationMonths} Months`;
          detailsObj = { company: companyName, tier: internshipTier, duration: Number(durationMonths), isPaid };
          break;

        case "skillset":
          title = `${certName} (${certProvider})`;
          detailsObj = { provider: certProvider, name: certName };
          break;

        case "projects":
          title = `${submissionTitle || "Software Project"} (${projectType})`;
          detailsObj = { projectType };
          break;

        case "fullstack":
          title = `${submissionTitle || "Full Stack Application"} (${frontendTech} + ${backendTech})`;
          detailsObj = { frontend: frontendTech, backend: backendTech, db: databaseTech };
          break;

        case "hackathons":
          title = `${submissionTitle || "Hackathon"} (${prizePlacement})`;
          detailsObj = { prize: prizePlacement };
          break;

        case "inhouse-projects":
          title = `${submissionTitle || "Inhouse R&D Project"} under ${facultyMentor || "SRM Faculty"}`;
          detailsObj = { faculty: facultyMentor, university: universityName };
          break;

        case "membership":
          title = `${membershipOrg} Active Membership (ID: ${membershipId || "Verified"})`;
          detailsObj = { org: membershipOrg, membershipId };
          break;

        case "assessments":
          title = `${assessmentType} Assessment Score (${rawAssessmentScore} / 100)`;
          detailsObj = { rawScore: Number(rawAssessmentScore), assessmentType };
          break;

        default:
          title = submissionTitle || `${metric.title} Proof`;
          detailsObj = {};
      }

      const newSubmission = {
        id: `sub-${Date.now()}`,
        studentId: studentId || "student-abhay-01",
        categoryId: metric.id,
        title,
        details: detailsObj,
        proof_url: proofDocUrl,
        status: "PENDING", // Always starts as PENDING until verified by Faculty
        awardedMarks: 0,
        verifierNotes: "",
        created_at: new Date().toISOString().split("T")[0]
      };

      onSubmit(metric.id, newSubmission);
      onClose();
    } catch (err) {
      console.error(err);
      setUploadError("Failed to process submission. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      
      <div className="flex-1" onClick={onClose}></div>

      <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full overflow-y-auto animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Update {metric.title}</h2>
              <p className="text-xs text-slate-400 font-medium">SRM Institutional Placement Rubric Verification</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1">
          
          {uploadError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Form Fields Rendered By Category */}
          {metric.id === "academics" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">10th %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tenthPct}
                    onChange={(e) => setTenthPct(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">12th %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={twelfthPct}
                    onChange={(e) => setTwelfthPct(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">Current Academic CGPA</label>
                <input
                  type="number"
                  step="0.01"
                  max="10.0"
                  value={cgpa}
                  onChange={(e) => setCgpa(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100"
                />
              </div>
            </div>
          )}

          {metric.id === "github" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">Submission Type</label>
                <select
                  value={githubType}
                  onChange={(e) => setGithubType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100"
                >
                  <option value="profile">Profile Repos & Frequency Sync</option>
                  <option value="community_project">Community Project (Max 2, 2m each)</option>
                  <option value="collaboration">Collaboration (Max 3, 2m each)</option>
                </select>
              </div>

              {githubType === "profile" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">Repos / Commits (1 yr)</label>
                    <input
                      type="number"
                      value={reposLastYear}
                      onChange={(e) => setReposLastYear(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">Monthly Frequency</label>
                    <input
                      type="number"
                      value={monthlyFreq}
                      onChange={(e) => setMonthlyFreq(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">Project / Repository Title</label>
                  <input
                    type="text"
                    placeholder="e.g. React Core Contributor PR #84"
                    value={submissionTitle}
                    onChange={(e) => setSubmissionTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100"
                  />
                </div>
              )}
            </div>
          )}

          {metric.id === "coding-platforms" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">Badges Count</label>
                  <input
                    type="number"
                    value={codingBadges}
                    onChange={(e) => setCodingBadges(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">Medium + Hard Solved</label>
                  <input
                    type="number"
                    value={mediumHardSolved}
                    onChange={(e) => setMediumHardSolved(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100"
                  />
                </div>
              </div>
            </div>
          )}

          {metric.id === "internship" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                  Company Name <span className="text-indigo-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Google, FinTech Corp"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">Company Tier</label>
                  <select
                    value={internshipTier}
                    onChange={(e) => setInternshipTier(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100"
                  >
                    <option value="IIT/NIT">IIT / NIT (5 Marks)</option>
                    <option value="SRM Placement">SRM Placement Process (5 Marks)</option>
                    <option value="Fortune 500">Fortune 500 Company (4 Marks)</option>
                    <option value="Small Company">Small Company (3 Marks)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">Duration (Months)</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isPaid"
                  checked={isPaid}
                  onChange={(e) => setIsPaid(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                />
                <label htmlFor="isPaid" className="text-xs font-medium text-slate-300">
                  Paid Internship (+1 Mark Bonus)
                </label>
              </div>
            </div>
          )}

          {metric.id === "skillset" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                  Certification Name <span className="text-indigo-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AWS Certified Cloud Practitioner"
                  value={certName}
                  onChange={(e) => setCertName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">Provider Category</label>
                <select
                  value={certProvider}
                  onChange={(e) => setCertProvider(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100"
                >
                  <option value="CISCO">CISCO / CCNA / CCNP / Redhat / IBM (5 Marks)</option>
                  <option value="NPTEL">NPTEL (3 Marks)</option>
                  <option value="COURSERA">Coursera / Meta / Google / AWS (2 Marks)</option>
                  <option value="PROGRAMMING">Programming Certification (C, Java, Python) (1 Mark)</option>
                  <option value="UDEMY">Udemy (0.5 Marks)</option>
                </select>
              </div>
            </div>
          )}

          {metric.id === "projects" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">Project Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI Code Review Engine"
                  value={submissionTitle}
                  onChange={(e) => setSubmissionTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">Project Type Category</label>
                <select
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100"
                >
                  <option value="IIT/NIT/DRDO">IIT / NIT / DRDO Project (5 Marks)</option>
                  <option value="GOVT">Other Government Project (4 Marks)</option>
                  <option value="MOBILE">Mobile Application (3 Marks)</option>
                  <option value="WEB">Web Application (3 Marks)</option>
                  <option value="MINI_HIGH">Mini Project (1 - 2 Marks)</option>
                </select>
              </div>
            </div>
          )}

          {metric.id === "hackathons" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">Event / Hackathon Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Smart India Hackathon 2024"
                  value={submissionTitle}
                  onChange={(e) => setSubmissionTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">Prize / Result Placement</label>
                <select
                  value={prizePlacement}
                  onChange={(e) => setPrizePlacement(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100"
                >
                  <option value="1st Prize">First Prize (5 Marks)</option>
                  <option value="2nd Prize">Second Prize (4 Marks)</option>
                  <option value="3rd Prize">Third Prize (3 Marks)</option>
                  <option value="Participation">Participation (1 Mark)</option>
                </select>
              </div>
            </div>
          )}

          {metric.id === "assessments" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">Assessment Type</label>
                <select
                  value={assessmentType}
                  onChange={(e) => setAssessmentType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100"
                >
                  <option value="SHL">SHL Talent Discovery</option>
                  <option value="AMCAT">AMCAT Assessment</option>
                  <option value="NCET">N.C.E.T Assessment</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">Raw Score (0 - 100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={rawAssessmentScore}
                  onChange={(e) => setRawAssessmentScore(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100"
                />
              </div>
            </div>
          )}

          {/* File Upload Drag and Drop Zone */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Official Proof Document / Certificate Upload
            </label>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                isDragging
                  ? "border-indigo-500 bg-indigo-500/10"
                  : uploadedFile
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "border-slate-800 hover:border-slate-700 bg-slate-950/60"
              }`}
            >
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />

              {uploadedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="w-8 h-8 text-emerald-400" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-200 line-clamp-1">{uploadedFile.name}</p>
                    <p className="text-xs text-slate-400">
                      {(uploadedFile.size / 1024).toFixed(1)} KB • Upload ready
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <UploadCloud className="w-8 h-8 text-indigo-400 mx-auto" />
                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      Drag and drop verification document here
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Supports PDF, PNG, JPG (Max 10 MB)</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Additional Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Context Notes for Verification Faculty
            </label>
            <textarea
              rows="3"
              placeholder="Add any additional details or verification credentials..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all resize-none"
            ></textarea>
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-slate-800 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 bg-slate-800 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-950 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? "Uploading..." : "Submit Proof for Verification"}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
