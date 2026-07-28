import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, KeyRound, AlertCircle, Maximize, 
  UserCheck, Lock, BookOpen, Loader2, ShieldAlert,
  CheckCircle, ChevronRight
} from 'lucide-react';
import { fetchRemoteExams } from '../services/storageService';
import { validatePasscode } from '../services/passcodeService';

export default function StudentAuth({ onStartExam, initialExamId }) {
  const [exams, setExams] = useState([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [selectedExamId, setSelectedExamId] = useState(initialExamId || '');
  
  const [studentName, setStudentName] = useState('');
  const [registerNo, setRegisterNo] = useState('');
  const [passcode, setPasscode] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const activeExam = exams.find(e => e.id === selectedExamId) || null;

  // Fetch remote exams from Vercel API on load
  useEffect(() => {
    setLoadingExams(true);
    fetchRemoteExams().then(updated => {
      // Filter to only admin-created (non-default) exams
      const filtered = (updated || []).filter(e => e.id && !e.id.startsWith('exam-genai-101') && !e.id.startsWith('exam-py-202'));
      setExams(filtered);
      if (!selectedExamId && filtered.length > 0) {
        setSelectedExamId(filtered[0].id);
      }
    }).finally(() => setLoadingExams(false));
  }, []);

  useEffect(() => {
    if (initialExamId) {
      setSelectedExamId(initialExamId);
    }
  }, [initialExamId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!studentName.trim() || !registerNo.trim()) {
      setErrorMsg('Please enter your Full Name and College Register Number.');
      return;
    }

    if (!activeExam) {
      setErrorMsg('Please select a valid exam course.');
      return;
    }

    const isValidDynamic = validatePasscode(activeExam.id, passcode);
    const isValidStatic = activeExam.staticPasscode && passcode.trim() === activeExam.staticPasscode.trim();

    if (!isValidDynamic && !isValidStatic) {
      setErrorMsg('Invalid or expired passcode. Passcodes rotate every 60 seconds — get the current code from your instructor.');
      return;
    }

    if (!agreed) {
      setErrorMsg('You must read and agree to the proctoring rules before starting.');
      return;
    }

    onStartExam({
      examId: activeExam.id,
      examTitle: activeExam.title,
      topic: activeExam.topic,
      questionCount: activeExam.questionCount,
      difficulty: activeExam.difficulty,
      studentName: studentName.trim(),
      registerNo: registerNo.trim().toUpperCase()
    });
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg animate-fade-in">

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 shadow-2xl shadow-indigo-600/40 mb-4">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Student Portal
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Authenticate to begin your proctored examination
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden">
          
          {/* Loading State */}
          {loadingExams && (
            <div className="flex items-center justify-center gap-3 py-8 text-slate-400 text-sm border-b border-slate-800">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Loading available exams...</span>
            </div>
          )}

          {/* No Exams Available */}
          {!loadingExams && exams.length === 0 && (
            <div className="text-center py-10 px-6 border-b border-slate-800">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-3">
                <BookOpen className="w-6 h-6 text-amber-400" />
              </div>
              <p className="text-sm font-semibold text-slate-200">No Exams Available</p>
              <p className="text-xs text-slate-500 mt-1">Your instructor hasn't published any exams yet. Please check back later.</p>
            </div>
          )}

          {/* Exam Selection */}
          {!loadingExams && exams.length > 0 && (
            <div className="p-4 sm:p-6 border-b border-slate-800 space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                Select Your Exam
              </label>
              <div className="grid gap-2">
                {exams.map(exam => (
                  <button
                    key={exam.id}
                    type="button"
                    onClick={() => setSelectedExamId(exam.id)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                      selectedExamId === exam.id
                        ? 'bg-indigo-600/15 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                        : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/30'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      selectedExamId === exam.id
                        ? 'bg-indigo-600/30 border border-indigo-500/40'
                        : 'bg-slate-800 border border-slate-700'
                    }`}>
                      <BookOpen className={`w-4 h-4 ${selectedExamId === exam.id ? 'text-indigo-400' : 'text-slate-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${selectedExamId === exam.id ? 'text-white' : 'text-slate-300'}`}>
                        {exam.title}
                      </p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {exam.topic} &bull; {exam.questionCount} MCQs &bull; {exam.difficulty}
                      </p>
                    </div>
                    {selectedExamId === exam.id && (
                      <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
                        <CheckCircle className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form */}
          {!loadingExams && exams.length > 0 && (
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">

              {/* Student Name */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dinesh Kingston"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm font-medium"
                  />
                </div>
              </div>

              {/* Register Number */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Register / Roll Number
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2026REG001"
                    value={registerNo}
                    onChange={(e) => setRegisterNo(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm font-mono tracking-wider font-semibold uppercase"
                  />
                </div>
                <p className="text-[11px] text-indigo-400 mt-1.5 ml-1">
                  ✨ Your register number seeds a unique AI question set just for you
                </p>
              </div>

              {/* Passcode */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Exam Passcode
                  </label>
                  <span className="text-[11px] text-amber-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                    Rotates every 60s
                  </span>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    maxLength={8}
                    placeholder="Enter 6-digit passcode"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm font-mono tracking-widest font-bold"
                  />
                </div>
              </div>

              {/* Error Banner */}
              {errorMsg && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/8 border border-rose-500/25 text-rose-300 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Security Rules */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2 uppercase tracking-widest">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  Proctoring Rules
                </h4>
                <ul className="text-xs text-slate-500 space-y-1.5 pl-4 list-disc leading-relaxed">
                  <li>Fullscreen is enforced throughout the test</li>
                  <li>Tab switches, minimizing, or split-screen logs a violation</li>
                  <li>Exceeding 2 warnings will auto-submit the exam</li>
                  <li>Copy, Paste, Right-click & PrintScreen are disabled</li>
                </ul>

                <label className="flex items-center gap-2.5 pt-1 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500 focus:ring-1"
                  />
                  <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">
                    I understand and agree to the proctoring rules
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!activeExam}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm shadow-xl shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <Maximize className="w-4 h-4" />
                Enable Fullscreen &amp; Begin Exam
                <ChevronRight className="w-4 h-4" />
              </button>

            </form>
          )}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-600 mt-4">
          Having trouble? Contact your course instructor for passcode assistance.
        </p>
      </div>
    </div>
  );
}
