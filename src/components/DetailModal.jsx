import React from "react";
import { 
  X, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Upload, 
  Award, 
  Calendar,
  AlertCircle,
  XCircle,
  ExternalLink
} from "lucide-react";

export default function DetailModal({ category, submissions = [], isOpen, onClose, onOpenDrawer, verifiedScore = 0 }) {
  if (!isOpen || !category) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose}></div>

      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">{category.title}</h2>
              <p className="text-xs text-slate-400 font-medium">SRM Rubric Verification History</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Category Rubric Rule</span>
              <p className="text-xs font-semibold text-slate-200">{category.rubricText}</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-emerald-400">{verifiedScore} / {category.maxMarks}</span>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Verified Marks</span>
            </div>
          </div>

          {/* Submitted Items List */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Submitted Verification Evidence ({submissions.length})
            </h3>

            {submissions.length > 0 ? (
              <div className="space-y-3">
                {submissions.map((item) => {
                  const isVerified = item.status === "VERIFIED" || item.status === "Verified";
                  const isRejected = item.status === "REJECTED" || item.status === "Rejected";

                  return (
                    <div 
                      key={item.id}
                      className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                          isVerified ? "bg-emerald-500/10 text-emerald-400" :
                          isRejected ? "bg-rose-500/10 text-rose-400" :
                          "bg-amber-500/10 text-amber-400"
                        }`}>
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-100 mb-1">{item.title}</h4>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mb-1.5">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              {item.created_at || "2024-09-18"}
                            </span>
                          </div>

                          {/* Multi-document stack or single document */}
                          {Array.isArray(item.details?.proofDocuments) && item.details.proofDocuments.length > 0 ? (
                            <div className="space-y-1.5 my-2">
                              <span className="text-[11px] font-semibold text-slate-400 block">
                                Attached Documents ({item.details.proofDocuments.length}):
                              </span>
                              <div className="flex flex-col gap-1.5">
                                {item.details.proofDocuments.map((doc, dIdx) => (
                                  <div key={doc.id || dIdx} className="flex items-center justify-between gap-2 p-1.5 px-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
                                    <span className="truncate max-w-[220px] text-slate-300 font-mono text-[11px]">
                                      {doc.fileName || `Document ${dIdx + 1}`}
                                    </span>
                                    {doc.publicUrl && (
                                      <a
                                        href={doc.publicUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                        <span>Preview</span>
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs mb-1">
                              <span className="font-mono text-indigo-300 text-[11px]">{item.proof_url || "Proof_Document.pdf"}</span>
                              {item.proof_url && (
                                <a
                                  href={item.proof_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Preview</span>
                                </a>
                              )}
                            </div>
                          )}
                          {item.verifierNotes && (
                            <p className="text-[11px] text-slate-400 italic mt-1 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                              Verifier Note: "{item.verifierNotes}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {isVerified && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Verified (+{item.awardedMarks || 0} Pts)
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            Rejected (0 Pts)
                          </span>
                        )}
                        {!isVerified && !isRejected && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Pending Review
                          </span>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl bg-slate-950/50 border border-slate-800">
                <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">No proof files submitted yet</p>
                <p className="text-xs text-slate-500 mt-1">Click "Submit New Proof" below to upload verification documents.</p>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 bg-slate-800"
          >
            Close
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenDrawer(category);
            }}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-950 flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>Submit New Proof</span>
          </button>
        </div>

      </div>
    </div>
  );
}
