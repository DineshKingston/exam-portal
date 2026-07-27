import React from 'react';
import { AlertTriangle, ShieldAlert, Maximize } from 'lucide-react';

export default function SecurityWarningModal({
  isOpen,
  warningCount,
  maxWarnings,
  details,
  type,
  onReturnToExam
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-fade-in no-select">
      
      <div className="relative w-full max-w-md bg-slate-900 border-2 border-rose-500/80 rounded-2xl p-6 shadow-2xl glow-rose overflow-hidden">
        
        {/* Top Warning Stripe */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 animate-pulse" />

        {/* Icon & Title */}
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-7 h-7 text-rose-400 animate-bounce" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Security Violation Detected!
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-500/30 text-rose-300 border border-rose-500/40">
                Warning {warningCount} of {maxWarnings}
              </span>
              <span className="text-xs text-slate-400 uppercase tracking-wider font-mono">
                {type || 'PROCTOR_ALERT'}
              </span>
            </div>
          </div>
        </div>

        {/* Violation Info */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 mb-5 text-sm text-slate-300">
          <p className="font-semibold text-rose-300 mb-1 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            Rule Violation Details:
          </p>
          <p className="text-slate-400 text-xs leading-relaxed">
            {details || 'Screen change or tab switch attempt detected during active exam.'}
          </p>
        </div>

        {/* Action Callout */}
        <div className="text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-6">
          ⚠️ <strong>Strict Policy:</strong> Navigating away or exiting full screen again will result in automatic exam closure and submission to course instructor.
        </div>

        {/* Re-enter Button */}
        <button
          onClick={onReturnToExam}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-indigo-600 to-rose-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
        >
          <Maximize className="w-4 h-4" />
          Re-Enter Fullscreen & Resume Test
        </button>

      </div>
    </div>
  );
}
