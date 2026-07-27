import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, KeyRound, ShieldAlert, Maximize, AlertCircle, 
  CheckCircle, ArrowRight, UserCheck, Lock 
} from 'lucide-react';
import { getAllExams, getExamById } from '../services/storageService';
import { validatePasscode, getCurrentPasscodeState } from '../services/passcodeService';

export default function StudentAuth({ onStartExam, initialExamId }) {
  const [exams, setExams] = useState(() => getAllExams());
  const [selectedExamId, setSelectedExamId] = useState(initialExamId || (exams[0]?.id || ''));
  
  const [studentName, setStudentName] = useState('');
  const [registerNo, setRegisterNo] = useState('');
  const [passcode, setPasscode] = useState('');
  
  const [agreed, setAgreed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const activeExam = getExamById(selectedExamId);

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
      setErrorMsg('Selected exam course was not found.');
      return;
    }

    // Validate Passcode against 1-minute rotating passcode engine or static override
    const isValidDynamic = validatePasscode(activeExam.id, passcode);
    const isValidStatic = activeExam.staticPasscode && passcode.trim() === activeExam.staticPasscode.trim();

    if (!isValidDynamic && !isValidStatic) {
      setErrorMsg('Invalid or expired passcode! Passcodes refresh every 1 minute. Please request the current 1-minute code from your instructor.');
      return;
    }

    if (!agreed) {
      setErrorMsg('You must review and agree to the Security & Anti-Cheat Proctoring Rules.');
      return;
    }

    // Pass validated credentials to launch proctored exam!
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
    <div className="max-w-xl mx-auto px-4 py-12 animate-fade-in no-select">
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 glow-indigo space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 mb-2">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Student Exam Authentication
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Enter your student details and the 1-minute live exam passcode provided by your course instructor.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Exam Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Select Course / Assignment Exam
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl glass-input text-sm font-medium"
            >
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title} ({e.topic})
                </option>
              ))}
            </select>
          </div>

          {/* Student Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Student Full Name
            </label>
            <div className="relative">
              <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
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

          {/* College Register Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              College Register / Roll Number
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                placeholder="e.g. 2026REG001"
                value={registerNo}
                onChange={(e) => setRegisterNo(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm font-mono tracking-wider font-semibold uppercase"
              />
            </div>
            <span className="text-[11px] text-indigo-400 mt-1 block">
              ✨ Used by AI to synthesize your personal unique question set.
            </span>
          </div>

          {/* 1-Minute Passcode */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                1-Minute Live Exam Passcode
              </label>
              <span className="text-[11px] text-amber-400 font-medium">
                ⏱️ Passcode rotates every 60s
              </span>
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                maxLength={8}
                placeholder="Enter 6-digit code"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm font-mono tracking-widest font-bold"
              />
            </div>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Security & Anti-Cheat Rules Checklist */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2 uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Proctoring Lockdown Rules
            </h4>
            <ul className="text-xs text-slate-400 space-y-1.5 pl-5 list-disc">
              <li>Full screen mode will be enforced throughout the test.</li>
              <li>Switching tabs, minimizing, or split-screen will log a violation.</li>
              <li>Exceeding 2 warnings will automatically close & submit exam.</li>
              <li>Copy/Paste, Right-Click, and PrintScreen shortcuts are disabled.</li>
            </ul>

            <label className="flex items-center gap-2.5 pt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-semibold text-slate-200">
                I understand and agree to the proctoring rules
              </span>
            </label>
          </div>

          {/* Launch Exam Button */}
          <button
            type="submit"
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
          >
            <Maximize className="w-4.5 h-4.5" />
            Enable Fullscreen & Begin Exam
          </button>

        </form>

      </div>
    </div>
  );
}
