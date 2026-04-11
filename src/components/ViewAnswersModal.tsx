import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, XCircle, HelpCircle, ExternalLink, Eye, BookOpen } from 'lucide-react';
import { cn } from '../lib/utils';

interface QuestionAnswer {
  qid: number;
  question: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  prepare_link?: string;
}

interface ViewAnswersModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: QuestionAnswer[];
  score: number;
  totalQuestions: number;
}

export const ViewAnswersModal: React.FC<ViewAnswersModalProps> = ({
  isOpen,
  onClose,
  questions,
  score,
  totalQuestions
}) => {
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionAnswer | null>(null);

  useEffect(() => {
    if (isOpen && questions.length > 0) {
      setSelectedQuestion(questions[0]);
    }
  }, [isOpen, questions]);

  const getOptionLabel = (index: number) => {
    return String.fromCharCode(65 + index);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-3 z-50 overflow-hidden rounded-2xl bg-zinc-950 shadow-2xl md:inset-auto md:left-1/2 md:top-1/2 md:h-[90vh] md:w-[95vw] md:max-w-6xl md:-translate-x-1/2 md:-translate-y-1/2"
          >
            {/* Header */}
            <div className="border-b border-zinc-800 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-indigo-500/20 p-2">
                    <BookOpen className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">Quiz Answers Review</h2>
                    <p className="text-sm text-zinc-500">
                      Score: <span className="font-black text-yellow-400">{score}</span> / {totalQuestions}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-full p-2 hover:bg-zinc-800 transition-colors"
                >
                  <X className="h-5 w-5 text-zinc-500" />
                </button>
              </div>
            </div>

            <div className="flex h-[calc(100%-92px)] flex-col md:h-[calc(90vh-80px)] md:flex-row">
              {/* Question List Sidebar */}
              <div className="max-h-64 w-full overflow-y-auto border-b border-zinc-800 md:max-h-none md:w-80 md:border-b-0 md:border-r">
                <div className="p-4">
                  <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-600">
                    Questions ({questions.length})
                  </p>
                  <div className="space-y-2">
                    {questions.map((q, idx) => (
                      <button
                        key={q.qid}
                        onClick={() => setSelectedQuestion(q)}
                        className={cn(
                          'w-full rounded-xl p-3 text-left transition-all',
                          selectedQuestion?.qid === q.qid
                            ? 'bg-indigo-500/20 border border-indigo-500/30'
                            : 'hover:bg-zinc-900 border border-transparent'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-zinc-500">Q{idx + 1}</span>
                            {q.is_correct ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                          <span className="text-[10px] font-black uppercase text-zinc-600">
                            Your: {q.user_answer}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-medium text-white line-clamp-2">
                          {q.question}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Question Details */}
              {selectedQuestion && (
                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                  <div className="mb-6">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-black text-zinc-500">
                        Question {questions.findIndex(q => q.qid === selectedQuestion.qid) + 1}
                      </span>
                      {selectedQuestion.is_correct ? (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-black text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> Correct
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-3 py-1 text-xs font-black text-red-400">
                          <XCircle className="h-3 w-3" /> Incorrect
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-black text-white leading-relaxed">
                      {selectedQuestion.question}
                    </h3>
                  </div>

                  {/* Options */}
                  <div className="mb-8 space-y-3">
                    {['option_a', 'option_b', 'option_c', 'option_d'].map((opt, idx) => {
                      const optionValue = selectedQuestion[opt as keyof QuestionAnswer] as string;
                      const optionLetter = getOptionLabel(idx);
                      const isUserAnswer = selectedQuestion.user_answer === optionLetter;
                      const isCorrectAnswer = selectedQuestion.correct_answer === optionLetter;
                      
                      let bgColor = 'bg-zinc-900';
                      if (isCorrectAnswer) bgColor = 'bg-emerald-500/20 border-emerald-500/50';
                      if (isUserAnswer && !isCorrectAnswer) bgColor = 'bg-red-500/20 border-red-500/50';
                      
                      return (
                        <div
                          key={opt}
                          className={cn(
                            'rounded-xl border p-4 transition-all',
                            bgColor,
                            isCorrectAnswer ? 'border-emerald-500/50' : isUserAnswer ? 'border-red-500/50' : 'border-zinc-800'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black',
                              isCorrectAnswer ? 'bg-emerald-500 text-white' : isUserAnswer ? 'bg-red-500 text-white' : 'bg-zinc-800 text-zinc-500'
                            )}>
                              {optionLetter}
                            </div>
                            <div className="flex-1">
                              <p className={cn(
                                'text-sm',
                                isCorrectAnswer ? 'text-white font-medium' : 'text-zinc-400'
                              )}>
                                {optionValue}
                              </p>
                            </div>
                            {isUserAnswer && (
                              <div className="shrink-0">
                                {isCorrectAnswer ? (
                                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-red-500" />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Help Link */}
                  {selectedQuestion.prepare_link && (
                    <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-4">
                      <div className="flex items-start gap-3">
                        <HelpCircle className="h-5 w-5 text-indigo-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-black text-indigo-400 mb-1">Learn More</p>
                          <a
                            href={selectedQuestion.prepare_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-indigo-300 hover:text-indigo-200 transition-colors"
                          >
                            Read explanation <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="mt-8 flex justify-between gap-4">
                    <button
                      onClick={() => {
                        const currentIndex = questions.findIndex(q => q.qid === selectedQuestion.qid);
                        if (currentIndex > 0) setSelectedQuestion(questions[currentIndex - 1]);
                      }}
                      disabled={questions.findIndex(q => q.qid === selectedQuestion.qid) === 0}
                      className="rounded-xl bg-zinc-900 px-6 py-3 text-xs font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => {
                        const currentIndex = questions.findIndex(q => q.qid === selectedQuestion.qid);
                        if (currentIndex < questions.length - 1) setSelectedQuestion(questions[currentIndex + 1]);
                      }}
                      disabled={questions.findIndex(q => q.qid === selectedQuestion.qid) === questions.length - 1}
                      className="rounded-xl bg-indigo-600 px-6 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
