import React from 'react';
import { Bookmark, CheckCircle2, Circle } from 'lucide-react';

export default function QuestionCard({
  question,
  currentIndex,
  totalQuestions,
  selectedAnswer,
  isBookmarked,
  onSelectOption,
  onToggleBookmark,
  onNext,
  onPrev
}) {
  if (!question) return null;

  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-6 border border-slate-800 shadow-xl relative overflow-hidden no-select">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-800 mb-5">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-600/20 text-indigo-400 font-extrabold text-xs sm:text-sm flex items-center justify-center border border-indigo-500/30">
            {currentIndex + 1}
          </span>
          <span className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Q {currentIndex + 1} of {totalQuestions}
          </span>
        </div>

        {/* Bookmark / Flag */}
        <button
          onClick={() => onToggleBookmark(question.id)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all ${
            isBookmarked
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-400 text-amber-400' : ''}`} />
          <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
        </button>
      </div>

      {/* Question Text */}
      <h3 className="text-base sm:text-lg font-semibold text-slate-100 mb-5 leading-relaxed">
        {question.question}
      </h3>

      {/* Options List */}
      <div className="space-y-2.5 sm:space-y-3 mb-6 sm:mb-8">
        {question.options.map((optText, optIdx) => {
          const isSelected = selectedAnswer === optIdx;
          const label = optionLabels[optIdx] || (optIdx + 1);

          return (
            <div
              key={optIdx}
              onClick={() => onSelectOption(optIdx)}
              className={`group flex items-start gap-3 p-3.5 sm:p-4 rounded-xl cursor-pointer border min-h-[48px] active:scale-[0.99] transition-all ${
                isSelected
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10 glow-indigo'
                  : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
              }`}
            >
              <div
                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-white'
                }`}
              >
                {label}
              </div>

              <span className="text-xs sm:text-sm font-medium pt-0.5 leading-snug flex-1">
                {optText}
              </span>

              <div className="shrink-0 pt-0.5">
                {isSelected ? (
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
                ) : (
                  <Circle className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 group-hover:text-slate-500" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Card Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
        <button
          onClick={onPrev}
          disabled={currentIndex === 0}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          ← Prev
        </button>

        <button
          onClick={onNext}
          className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all hover:scale-105"
        >
          {currentIndex === totalQuestions - 1 ? 'Finish & Review' : 'Next →'}
        </button>
      </div>

    </div>
  );
}
