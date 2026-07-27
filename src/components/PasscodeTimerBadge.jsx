import React, { useState, useEffect } from 'react';
import { Clock, Copy, Check, RefreshCw, KeyRound } from 'lucide-react';
import { getCurrentPasscodeState } from '../services/passcodeService';

export default function PasscodeTimerBadge({ examId = 'default', compact = false }) {
  const [passcodeState, setPasscodeState] = useState(() => getCurrentPasscodeState(examId));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Refresh every second for real-time countdown
    const interval = setInterval(() => {
      setPasscodeState(getCurrentPasscodeState(examId));
    }, 1000);

    return () => clearInterval(interval);
  }, [examId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(passcodeState.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 bg-indigo-950/60 border border-indigo-500/30 rounded-lg px-3 py-1.5 text-xs text-indigo-200">
        <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
        <span className="font-mono font-bold tracking-widest text-white text-sm">{passcodeState.code}</span>
        <div className="flex items-center gap-1 pl-2 border-l border-indigo-500/20 text-indigo-300">
          <Clock className="w-3 h-3 text-indigo-400 animate-pulse" />
          <span>{passcodeState.secondsRemaining}s</span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-5 border border-indigo-500/20 glow-indigo relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-1">
            <KeyRound className="w-4 h-4 text-indigo-400" />
            1-Minute Dynamic Passcode
          </div>
          <p className="text-xs text-slate-400">
            Rotates automatically every 60 seconds. Share current code with students.
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-all"
          title="Copy current passcode"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied!' : 'Copy Code'}</span>
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between bg-slate-950/80 rounded-xl p-3.5 border border-slate-800">
        <div>
          <span className="text-xs text-slate-400 block mb-0.5">Active Passcode</span>
          <span className="font-mono text-2xl font-extrabold tracking-widest text-indigo-400 drop-shadow">
            {passcodeState.code}
          </span>
        </div>

        {/* Circular Progress Gauge */}
        <div className="flex items-center gap-3">
          <div className="relative w-11 h-11 flex items-center justify-center">
            <svg className="w-11 h-11 -rotate-90 transform" viewBox="0 0 36 36">
              <path
                className="text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-indigo-500 transition-all duration-1000 ease-linear"
                strokeDasharray={`${passcodeState.progressPercentage}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-xs font-bold text-white">
              {passcodeState.secondsRemaining}s
            </span>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-400 block">Auto Refresh</span>
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1 justify-end">
              <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
              Live 60s
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
