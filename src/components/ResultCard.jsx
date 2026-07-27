import React, { useEffect } from 'react';
import { Trophy, CheckCircle, XCircle, ShieldCheck, ShieldAlert, Award, FileText, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function ResultCard({
  submission,
  questions,
  examTitle,
  onDone
}) {
  const {
    studentName,
    registerNo,
    score,
    totalQuestions,
    percentage,
    userAnswers = {},
    violationsCount = 0,
    timeTakenSeconds = 0
  } = submission;

  const isPassed = percentage >= 50;

  useEffect(() => {
    if (isPassed) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [isPassed]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}m ${s}s`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in no-select">
      
      {/* Top Banner */}
      <div className={`glass-card rounded-3xl p-8 border text-center relative overflow-hidden ${
        isPassed
          ? 'border-emerald-500/30 bg-emerald-950/20 glow-emerald'
          : 'border-amber-500/30 bg-amber-950/20 glow-rose'
      }`}>
        <div className="inline-flex p-3 rounded-2xl bg-slate-900 border border-slate-800 mb-4 shadow-xl">
          <Trophy className={`w-10 h-10 ${isPassed ? 'text-emerald-400' : 'text-amber-400'}`} />
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-1">
          {isPassed ? 'Assignment Completed Successfully!' : 'Assignment Completed'}
        </h2>
        <p className="text-sm text-slate-400 max-w-lg mx-auto">
          Exam score summary and step-by-step AI answer explanations for {studentName} ({registerNo}).
        </p>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
            <span className="text-xs text-slate-400 block mb-1">Total Score</span>
            <span className="text-2xl font-black text-white">
              {score} <span className="text-xs font-normal text-slate-400">/ {totalQuestions}</span>
            </span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
            <span className="text-xs text-slate-400 block mb-1">Grade Score</span>
            <span className={`text-2xl font-black ${isPassed ? 'text-emerald-400' : 'text-amber-400'}`}>
              {percentage}%
            </span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
            <span className="text-xs text-slate-400 block mb-1">Time Elapsed</span>
            <span className="text-lg font-bold text-slate-200">
              {formatTime(timeTakenSeconds)}
            </span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
            <span className="text-xs text-slate-400 block mb-1">Proctor Status</span>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              {violationsCount === 0 ? (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Clean Record
                </span>
              ) : (
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  {violationsCount} Flag(s)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Questions & Explanations Detailed Breakdown */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-400" />
          Question Answers & AI Explanations
        </h3>

        {questions.map((q, idx) => {
          const userAns = userAnswers[q.id];
          const isCorrect = userAns === q.answerIndex;
          const optionLabels = ['A', 'B', 'C', 'D'];

          return (
            <div
              key={q.id || idx}
              className={`glass-card rounded-2xl p-6 border transition-all ${
                isCorrect
                  ? 'border-emerald-500/20 bg-slate-900/60'
                  : 'border-rose-500/20 bg-slate-900/60'
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center ${
                    isCorrect ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    Q{idx + 1}
                  </span>
                  <span className="text-sm font-bold text-slate-200">
                    {q.question}
                  </span>
                </div>

                <div className="shrink-0">
                  {isCorrect ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle className="w-3.5 h-3.5" /> Correct (+1)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
                      <XCircle className="w-3.5 h-3.5" /> Incorrect
                    </span>
                  )}
                </div>
              </div>

              {/* Options Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-4">
                {q.options.map((optText, optIdx) => {
                  const isUserSelected = userAns === optIdx;
                  const isCorrectAnswer = q.answerIndex === optIdx;

                  let optClass = 'bg-slate-950/60 border-slate-800 text-slate-400';
                  if (isCorrectAnswer) {
                    optClass = 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200 font-semibold';
                  } else if (isUserSelected && !isCorrectAnswer) {
                    optClass = 'bg-rose-950/40 border-rose-500/50 text-rose-300 font-semibold line-through';
                  }

                  return (
                    <div
                      key={optIdx}
                      className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${optClass}`}
                    >
                      <span className="font-mono font-bold">{optionLabels[optIdx]}.</span>
                      <span className="flex-1">{optText}</span>
                      {isCorrectAnswer && <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      {isUserSelected && !isCorrectAnswer && <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                    </div>
                  );
                })}
              </div>

              {/* AI Explanation Box */}
              {q.explanation && (
                <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-xl p-3.5 text-xs text-indigo-200 leading-relaxed mt-3">
                  <strong className="text-indigo-400 block mb-0.5 font-semibold">
                    💡 AI Explanation:
                  </strong>
                  {q.explanation}
                </div>
              )}

            </div>
          );
        })}
      </div>

      {/* Done Button */}
      <div className="text-center pt-4">
        <button
          onClick={onDone}
          className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 inline-flex items-center gap-2"
        >
          Return to Dashboard <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
