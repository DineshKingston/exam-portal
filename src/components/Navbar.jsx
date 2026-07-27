import React from 'react';
import { ShieldCheck, Sparkles, GraduationCap, LogOut } from 'lucide-react';
import { getAdminSettings } from '../services/storageService';

export default function Navbar({ currentRoute, onNavigate, isAdminUnlocked, onAdminLogout }) {
  const settings = getAdminSettings();
  const hasApiKey = !!(settings.opencodeApiKey && settings.opencodeApiKey.trim());
  const isStudentRoute = currentRoute.startsWith('student') || currentRoute.startsWith('exam');

  return (
    <header className="glass-panel sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div 
          onClick={() => onNavigate('admin')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-all duration-300">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base sm:text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                ProctorAI
              </span>
              <span className="text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-widest">
                PRO
              </span>
            </div>
            <span className="text-[10px] sm:text-xs text-slate-400 block -mt-1 font-medium">
              Smart Assessment Platform
            </span>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* API Key Status Pill */}
          {isAdminUnlocked && (
            <div 
              onClick={() => onNavigate('admin', { tab: 'api' })}
              className={`hidden sm:flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border cursor-pointer transition-all ${
                hasApiKey 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' 
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
              }`}
              title={hasApiKey ? 'NVIDIA / AI Key Active' : 'Click to setup AI API Key'}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{hasApiKey ? 'AI Connected' : 'Demo Synthesizer'}</span>
            </div>
          )}

          {/* Student Mode Pill Badge */}
          {isStudentRoute && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
              <GraduationCap className="w-4 h-4 text-indigo-400" />
              <span className="text-xs">Student Portal</span>
            </div>
          )}

          {/* Admin Navigation / Logout */}
          {!isStudentRoute && isAdminUnlocked && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('admin')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all"
              >
                <span>Dashboard</span>
              </button>

              <button
                onClick={onAdminLogout}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
                title="Lock Admin Dashboard"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>

      </div>
    </header>
  );
}
