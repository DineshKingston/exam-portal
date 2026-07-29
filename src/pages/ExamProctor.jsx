import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Clock, ShieldCheck, CheckCircle2, Bookmark, AlertTriangle } from 'lucide-react';
import { generateStudentExamQuestions } from '../services/aiService';
import { saveSubmission, getAdminSettings } from '../services/storageService';
import { ProctorManager } from '../services/proctorService';
import { getStudentTelemetryPayload } from '../services/deviceService';
import QuestionCard from '../components/QuestionCard';
import SecurityWarningModal from '../components/SecurityWarningModal';
import ResultCard from '../components/ResultCard';

export default function ExamProctor({ examConfig, onFinish }) {
  const {
    examId,
    examTitle,
    topic,
    questionCount = 10,
    difficulty = 'Medium',
    studentName,
    registerNo
  } = examConfig;

  // View Mode: 'LOADING' | 'EXAM' | 'RESULT'
  const [viewState, setViewState] = useState('LOADING');
  const [questions, setQuestions] = useState([]);
  const [telemetry, setTelemetry] = useState(null);

  // Exam Answers & State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({}); // { [questionId]: optionIdx }
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [submissionResult, setSubmissionResult] = useState(null);

  // Timer State (e.g. 15 mins for 10 MCQs)
  const [secondsRemaining, setSecondsRemaining] = useState(questionCount * 90);
  const startTimeRef = useRef(Date.now());

  // Proctoring Security State
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [lastViolation, setLastViolation] = useState({ warningCount: 0, maxWarnings: 2, details: '', type: '' });
  const proctorRef = useRef(null);

  const settings = getAdminSettings();
  const maxWarningsAllowed = settings.maxWarningsAllowed || 2;

  /* 0. Fetch Telemetry on Load */
  useEffect(() => {
    getStudentTelemetryPayload().then(data => {
      setTelemetry(data);
    });
  }, []);

  /* 1. Fetch AI Questions on Mount */
  useEffect(() => {
    let isMounted = true;

    async function loadQuestions() {
      try {
        const generated = await generateStudentExamQuestions({
          topic,
          questionCount,
          difficulty,
          studentName,
          registerNo,
          examId
        });

        if (isMounted) {
          setQuestions(generated);
          setViewState('EXAM');
        }
      } catch (err) {
        console.error('Failed to generate questions:', err);
      }
    }

    loadQuestions();

    return () => {
      isMounted = false;
    };
  }, [topic, questionCount, difficulty, studentName, registerNo, examId]);

  /* 2. Initialize Proctoring Lockdown when EXAM becomes ACTIVE */
  useEffect(() => {
    if (viewState !== 'EXAM') return;

    // Create Proctor Instance
    const manager = new ProctorManager({
      studentName,
      registerNo,
      examId,
      maxWarnings: maxWarningsAllowed,
      onViolation: (violData) => {
        setLastViolation(violData);
        setWarningModalOpen(true);

        if (violData.isMaxExceeded) {
          // Force Submit Exam immediately due to security violation
          setTimeout(() => {
            handleFinalSubmit(true);
          }, 1200);
        }
      }
    });

    proctorRef.current = manager;
    manager.requestFullscreen();
    manager.startMonitoring();

    // Timer Countdown Interval
    const timerInterval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          handleFinalSubmit(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timerInterval);
      if (proctorRef.current) {
        proctorRef.current.stopMonitoring();
      }
    };
  }, [viewState, studentName, registerNo, examId, maxWarningsAllowed]);

  /* Handlers */
  const handleSelectOption = (optIdx) => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;
    setUserAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optIdx
    }));
  };

  const handleToggleBookmark = (qId) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) {
        next.delete(qId);
      } else {
        next.add(qId);
      }
      return next;
    });
  };

  const handleReturnToFullscreen = async () => {
    setWarningModalOpen(false);
    if (proctorRef.current) {
      await proctorRef.current.requestFullscreen();
    }
  };

  const handleFinalSubmit = async (forcedBySecurity = false) => {
    // Stop proctoring
    if (proctorRef.current) {
      proctorRef.current.stopMonitoring();
    }

    // Grade Exam
    let score = 0;
    questions.forEach((q) => {
      const ans = userAnswers[q.id];
      if (ans === q.answerIndex) {
        score += 1;
      }
    });

    const total = questions.length || 1;
    const percentage = Math.round((score / total) * 100);
    const timeTakenSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);

    // Read violation count directly from ProctorManager (avoids stale React state closure)
    const liveViolations = proctorRef.current?.warningCount ?? lastViolation.warningCount ?? 0;

    // Fetch latest telemetry if not set
    const activeTelemetry = telemetry || await getStudentTelemetryPayload();

    const submissionData = {
      examId,
      examTitle,
      studentName,
      registerNo,
      score,
      totalQuestions: total,
      percentage,
      userAnswers,
      violationsCount: liveViolations,
      forcedBySecurity,
      timeTakenSeconds,
      ipAddress: activeTelemetry.ip || 'Unknown IP',
      deviceType: activeTelemetry.deviceType || 'Desktop',
      os: activeTelemetry.os || 'Unknown OS',
      browser: activeTelemetry.browser || 'Unknown Browser',
      screenResolution: activeTelemetry.screenResolution || '',
      deviceFingerprint: activeTelemetry.deviceFingerprint || ''
    };

    // Save to Database
    const saved = saveSubmission(submissionData);
    setSubmissionResult(saved);
    setViewState('RESULT');
  };

  /* Helper: Format Timer */
  const formatTimer = (totalSecs) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ---------------- VIEW 1: LOADING ----------------
  if (viewState === 'LOADING') {
    return (
      <div className="max-w-md mx-auto py-24 px-4 text-center space-y-6 no-select">
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-ping" />
          <div className="w-20 h-20 rounded-full bg-indigo-600/20 border-2 border-indigo-500 flex items-center justify-center glow-indigo">
            <Sparkles className="w-10 h-10 text-indigo-400 animate-spin" />
          </div>
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-white">
            Generating Unique AI Assessment
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Synthesizing personalized question variants for student <strong>{studentName}</strong> ({registerNo})...
          </p>
        </div>
      </div>
    );
  }

  // ---------------- VIEW 3: RESULT ----------------
  if (viewState === 'RESULT' && submissionResult) {
    return (
      <div className="py-8">
        <ResultCard
          submission={submissionResult}
          questions={questions}
          examTitle={examTitle}
          onDone={onFinish}
        />
      </div>
    );
  }

  // ---------------- VIEW 2: EXAM INTERFACE ----------------
  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(userAnswers).length;

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 no-select relative">
      
      {/* Dynamic Forensic Security Watermark Overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 flex flex-wrap items-center justify-around opacity-[0.06] select-none overflow-hidden rotate-[-25deg]">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="text-xs font-mono font-extrabold text-slate-300 tracking-widest p-8 whitespace-nowrap">
            PROCTOR AI &bull; {studentName} ({registerNo}) &bull; IP: {telemetry?.ip || 'PROTECTED'}
          </div>
        ))}
      </div>
      
      {/* Security Warning Overlay Modal */}
      <SecurityWarningModal
        isOpen={warningModalOpen}
        warningCount={lastViolation.warningCount}
        maxWarnings={lastViolation.maxWarnings}
        details={lastViolation.details}
        type={lastViolation.type}
        onReturnToExam={handleReturnToFullscreen}
      />

      {/* Top Examination Control Bar */}
      <div className="glass-panel rounded-2xl p-3 sm:p-4 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-2 z-30 bg-slate-950/95 backdrop-blur-md shadow-2xl">
        
        {/* Exam Title & Student Info */}
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-widest">
                Live Exam
              </span>
              <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-[200px] sm:max-w-md">
                {examTitle}
              </h2>
            </div>
            <span className="text-[11px] sm:text-xs text-slate-400 block mt-0.5">
              {studentName} ({registerNo})
            </span>
          </div>

          <div className="flex sm:hidden items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Proctored</span>
          </div>
        </div>

        {/* Live Metrics */}
        <div className="flex items-center justify-between sm:justify-end gap-3">
          
          {/* Proctoring Shield Pill (Desktop) */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Proctor Active</span>
          </div>

          {/* Countdown Clock */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs sm:text-sm font-bold text-amber-400 shadow-inner">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 animate-pulse" />
            <span>{formatTimer(secondsRemaining)}</span>
          </div>

          {/* Submit Button */}
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to finish and submit your exam now?')) {
                handleFinalSubmit(false);
              }
            }}
            className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-lg shadow-emerald-600/30 transition-all hover:scale-105"
          >
            Submit Exam
          </button>
        </div>
      </div>

      {/* MOBILE-ONLY HORIZONTAL QUESTION BAR */}
      <div className="block lg:hidden glass-card rounded-xl p-2 border border-slate-800">
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-2 pb-1">
          <span>Question Select ({answeredCount}/{questions.length})</span>
          <span>Tap number to view</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none px-1">
          {questions.map((q, idx) => {
            const isAnswered = userAnswers[q.id] !== undefined;
            const isBookmarked = bookmarkedIds.has(q.id);
            const isCurrent = idx === currentIndex;

            let btnClass = 'bg-slate-900 border-slate-800 text-slate-400';
            if (isCurrent) {
              btnClass = 'bg-indigo-600 border-indigo-500 text-white font-bold ring-2 ring-indigo-500/50';
            } else if (isAnswered) {
              btnClass = 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 font-bold';
            }

            return (
              <button
                key={q.id || idx}
                onClick={() => setCurrentIndex(idx)}
                className={`relative min-w-[36px] h-9 rounded-lg border text-xs font-bold flex items-center justify-center shrink-0 transition-all ${btnClass}`}
              >
                {idx + 1}
                {isBookmarked && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left 3 Columns: Active Question Card */}
        <div className="lg:col-span-3">
          <QuestionCard
            question={currentQuestion}
            currentIndex={currentIndex}
            totalQuestions={questions.length}
            selectedAnswer={userAnswers[currentQuestion?.id]}
            isBookmarked={bookmarkedIds.has(currentQuestion?.id)}
            onSelectOption={handleSelectOption}
            onToggleBookmark={handleToggleBookmark}
            onNext={() => {
              if (currentIndex < questions.length - 1) {
                setCurrentIndex(currentIndex + 1);
              } else {
                if (window.confirm('You have reached the end of the test. Submit now?')) {
                  handleFinalSubmit(false);
                }
              }
            }}
            onPrev={() => {
              if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
            }}
          />
        </div>

        {/* Right 1 Column: Question Navigator Palette (Desktop) */}
        <div className="hidden lg:block space-y-4">
          <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Question Navigator
              </h4>
              <span className="text-xs font-semibold text-slate-400">
                {answeredCount}/{questions.length} Answered
              </span>
            </div>

            {/* Question Buttons Grid */}
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = userAnswers[q.id] !== undefined;
                const isBookmarked = bookmarkedIds.has(q.id);
                const isCurrent = idx === currentIndex;

                let btnClass = 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700';
                if (isCurrent) {
                  btnClass = 'bg-indigo-600 border-indigo-500 text-white font-extrabold shadow-md ring-2 ring-indigo-500/50';
                } else if (isAnswered) {
                  btnClass = 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 font-bold';
                }

                return (
                  <button
                    key={q.id || idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`relative h-10 rounded-xl border text-xs font-semibold flex items-center justify-center transition-all ${btnClass}`}
                  >
                    {idx + 1}
                    {isBookmarked && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="pt-3 border-t border-slate-800/80 space-y-2 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-indigo-600 border border-indigo-500" />
                <span>Current Question</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-amber-400" />
                <span>Bookmarked</span>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
