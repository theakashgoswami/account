import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { API, getWeekKey } from '../services/api';
import { Brain, Zap, Gift, CheckCircle2, Trophy, RotateCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

// ── Segment configs ──────────────────────────────────────────
const FREE_SEGS = [
  { label: '100', value: 100, color: '#6366f1' },
  { label: '200', value: 200, color: '#8b5cf6' },
  { label: '500', value: 500, color: '#f59e0b' },
  { label: '100', value: 100, color: '#3b82f6' },
  { label: '300', value: 300, color: '#10b981' },
  { label: '200', value: 200, color: '#ec4899' },
  { label: '150', value: 150, color: '#14b8a6' },
  { label: '250', value: 250, color: '#f97316' },
];
const WEIGHTS = [3, 3, 1, 3, 2, 3, 2, 2];

const QUIZ_SEGS = [
  { label: '100', value: 100, color: '#6366f1' },
  { label: '200', value: 200, color: '#8b5cf6' },
  { label: '300', value: 300, color: '#10b981' },
  { label: '400', value: 400, color: '#f59e0b' },
  { label: '500', value: 500, color: '#ef4444' },
  { label: '😅', value: 0, color: '#475569' },
];

const SUPER_SEGS = [
  { label: '300', value: 300, color: '#f59e0b' },
  { label: '500', value: 500, color: '#ef4444' },
  { label: '700', value: 700, color: '#8b5cf6' },
  { label: '400', value: 400, color: '#3b82f6' },
  { label: '1000', value: 1000, color: '#10b981' },
  { label: '😅', value: 0, color: '#475569' },
];

const STREAK_PTS = [50, 75, 100, 150, 200, 250, 500];

// ── Canvas Wheel ─────────────────────────────────────────────
const SpinWheelCanvas: React.FC<{
  segments: { label: string; value: number; color: string; active?: boolean }[];
  spinning: boolean;
  targetIndex: number | null;
  onDone?: () => void;
}> = ({ segments, spinning, targetIndex, onDone }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotRef = useRef(Math.random() * Math.PI * 2);
  const rafRef = useRef<number>(0);

  const draw = useCallback((rot: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width;
    const cx = W / 2, cy = W / 2, r = cx - 6;
    const arc = (2 * Math.PI) / segments.length;
    ctx.clearRect(0, 0, W, W);
    segments.forEach((seg, i) => {
      const sa = rot + i * arc - Math.PI / 2;
      const ea = sa + arc;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, sa, ea); ctx.closePath();
      ctx.fillStyle = seg.active === false ? '#1e293b' : seg.color; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(sa + arc / 2);
      ctx.fillStyle = seg.active === false ? '#475569' : '#fff';
      ctx.font = `bold ${W > 280 ? 12 : 10}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(seg.label, r * 0.65, 4);
      if (seg.value > 0) { ctx.font = `${W > 280 ? 9 : 7}px Arial`; ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillText('pts', r * 0.65, 14); }
      ctx.restore();
    });
    // Center hub
    ctx.beginPath(); ctx.arc(cx, cy, 18, 0, 2 * Math.PI);
    const g = ctx.createRadialGradient(cx, cy - 3, 2, cx, cy, 18);
    g.addColorStop(0, '#fff'); g.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = '#6366f1'; ctx.font = 'bold 7px Arial'; ctx.textAlign = 'center'; ctx.fillText('AG', cx, cy + 2.5);
  }, [segments]);

  useEffect(() => { draw(rotRef.current); }, [draw]);

  useEffect(() => {
    if (!spinning || targetIndex === null) return;
    cancelAnimationFrame(rafRef.current);
    const n = segments.length;
    const arc = (2 * Math.PI) / n;
    const targetRot = -((targetIndex + 0.5) * arc);
    const tNorm = ((targetRot % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const cNorm = ((rotRef.current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    let delta = tNorm - cNorm;
    if (delta <= 0) delta += 2 * Math.PI;
    const total = (5 + Math.floor(Math.random() * 4)) * 2 * Math.PI + delta;
    const duration = 4200 + Math.random() * 800;
    const start = rotRef.current;
    const t0 = performance.now();
    const animate = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      rotRef.current = start + total * eased;
      draw(rotRef.current);
      if (p < 1) { rafRef.current = requestAnimationFrame(animate); }
      else { onDone?.(); }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [spinning, targetIndex, segments, draw, onDone]);

  return (
    <div className="relative mx-auto w-fit">
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10 text-2xl drop-shadow">▼</div>
      <canvas ref={canvasRef} width={280} height={280} className="rounded-full shadow-2xl shadow-indigo-500/20" />
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────
export const Earn: React.FC = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<any>(null);
  const [quiz, setQuiz] = useState<any>({ earn: [], submitted: false });
  const [superQ, setSuperQ] = useState<any>({ questions: [], submitted: false });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'daily' | 'streak' | 'quiz' | 'super'>('daily');

  const loadData = useCallback(async () => {
    if (!user?.user_id) return;
    const [s, q, sq] = await Promise.all([
      API.getSpinStatus(user.user_id),
      API.getQuizQuestions(user.user_id),
      API.getSuperQuestions(user.user_id),
    ]);
    setStatus(s);
    setQuiz(q ?? { earn: [], submitted: false });
    setSuperQ(sq ?? { questions: [], submitted: false });
    setLoading(false);
  }, [user?.user_id]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return (
    <div className="container mx-auto px-4 py-12">
      <div className="h-80 animate-pulse rounded-3xl bg-zinc-900" />
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Weekly bar */}
      <div className="mb-8 overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800">
        <div className="flex justify-between items-center p-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Weekly Score</p>
            <p className="text-4xl font-black text-yellow-400">
              {(status?.quiz_spin_points || 0) + (status?.super_spin_points || 0)} pts
            </p>
          </div>
          <div className="text-right text-sm text-zinc-600 font-bold">Resets Sunday midnight</div>
        </div>
        <div className="grid grid-cols-2 border-t border-zinc-800">
          <div className="border-r border-zinc-800 p-4 text-center">
            <p className="text-[10px] font-black uppercase text-zinc-700">Quiz Spin</p>
            <p className="font-black text-white">{status?.quiz_spin_done ? `${status.quiz_spin_points} pts` : '—'}</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-[10px] font-black uppercase text-zinc-700">Super Spin</p>
            <p className="font-black text-white">{status?.super_spin_done ? `${status.super_spin_points} pts` : '—'}</p>
          </div>
        </div>
      </div>

      <h1 className="mb-6 text-3xl font-black text-white">Earn Points</h1>

      {/* Tabs */}
      <div className="mb-8 flex gap-2 flex-wrap">
        {[
          { key: 'daily', icon: Gift, label: 'Free Spin', badge: status?.free_spin_done ? '✓' : 'Daily' },
          { key: 'streak', icon: RotateCw, label: 'Streak', badge: `Day ${status?.streak || 0}` },
          { key: 'quiz', icon: Brain, label: 'Quiz', badge: quiz?.submitted ? '✓' : '+10/Q' },
          { key: 'super', icon: Zap, label: 'Super Spin', badge: 'Weekly' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={cn(
              'flex min-w-[130px] flex-col items-start gap-2 rounded-2xl border p-4 transition-all',
              tab === t.key
                ? 'border-indigo-500 bg-indigo-500/10 text-white'
                : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700'
            )}
          >
            <div className="flex w-full items-center justify-between">
              <t.icon className={cn('h-5 w-5', tab === t.key ? 'text-indigo-400' : 'text-zinc-600')} />
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-black uppercase', tab === t.key ? 'bg-indigo-500/20 text-indigo-300' : 'bg-zinc-800 text-zinc-600')}>{t.badge}</span>
            </div>
            <span className="text-sm font-black">{t.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'daily' && (
          <motion.div key="daily" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <FreeSpin status={status} onUpdate={s => setStatus(s)} />
          </motion.div>
        )}
        {tab === 'streak' && (
          <motion.div key="streak" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <StreakSection streak={status?.streak ?? 0} claimed={status?.streak_claimed ?? false} onClaimed={loadData} />
          </motion.div>
        )}
        {tab === 'quiz' && (
          <motion.div key="quiz" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <QuizSection
              questions={quiz.earn ?? []}
              submitted={quiz.submitted ?? false}
              spinDone={status?.quiz_spin_done ?? false}
              spinPoints={status?.quiz_spin_points ?? 0}
              onRefresh={loadData}
            />
          </motion.div>
        )}
        {tab === 'super' && (
          <motion.div key="super" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <SuperSection
              questions={superQ.questions ?? []}
              submitted={superQ.submitted ?? false}
              correct={superQ.correct_count ?? 0}
              spinDone={status?.super_spin_done ?? false}
              spinPoints={status?.super_spin_points ?? 0}
              onRefresh={loadData}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Free Spin ─────────────────────────────────────────────────
const FreeSpin: React.FC<{ status: any; onUpdate: (s: any) => void }> = ({ status, onUpdate }) => {
  const [spinning, setSpinning] = useState(false);
  const [targetIdx, setTargetIdx] = useState<number | null>(null);
  const [result, setResult] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  const handleSpin = async () => {
    if (spinning || status?.free_spin_done || done) return;
    const total = WEIGHTS.reduce((a, b) => a + b, 0);
    let rand = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < WEIGHTS.length; i++) { rand -= WEIGHTS[i]; if (rand <= 0) { idx = i; break; } }
    setTargetIdx(idx);
    setSpinning(true);
  };

  const handleDone = async () => {
    const pts = FREE_SEGS[targetIdx!].value;
    const res = await API.freeSpin(pts);
    if (res.success) {
      setResult(pts);
      setDone(true);
      onUpdate({ ...status, free_spin_done: true, free_spin_points: pts });
    }
    setSpinning(false);
  };

  if (status?.free_spin_done || done) {
    const pts = result ?? status?.free_spin_points;
    return (
      <div className="premium-card p-12 text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
          <CheckCircle2 className="h-12 w-12" />
        </div>
        <h2 className="mb-2 text-2xl font-black text-white">Spin Complete! 🎉</h2>
        <p className="text-zinc-400">You won <span className="text-2xl font-black text-emerald-400">+{pts} pts</span> today.</p>
        <p className="mt-4 text-sm text-zinc-700">Come back tomorrow for another free spin!</p>
      </div>
    );
  }

  return (
    <div className="premium-card p-8 text-center">
      <h2 className="mb-8 text-2xl font-black text-white">Daily Fortune Wheel</h2>
      <div className="mb-10 flex justify-center">
        <SpinWheelCanvas segments={FREE_SEGS} spinning={spinning} targetIndex={targetIdx} onDone={handleDone} />
      </div>
      <button
        onClick={handleSpin}
        disabled={spinning}
        className={cn(
          'mx-auto block w-full max-w-xs rounded-2xl py-4 text-lg font-black uppercase tracking-widest transition-all active:scale-95',
          spinning ? 'bg-zinc-800 text-zinc-500' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_10px_30px_rgba(79,70,229,0.4)]'
        )}
      >
        {spinning ? 'Spinning…' : '🎯 Spin Now!'}
      </button>
      <p className="mt-4 text-xs text-zinc-700">Win 100–500 pts daily. Completely free!</p>
    </div>
  );
};

// ── Streak Section ────────────────────────────────────────────
const StreakSection: React.FC<{ streak: number; claimed: boolean; onClaimed: () => void }> = ({ streak, claimed, onClaimed }) => {
  const [claiming, setClaiming] = useState(false);

  const handleClaim = async () => {
    if (claiming || claimed) return;
    setClaiming(true);
    const res = await API.claimStreak();
    if (res.success) onClaimed();
    setClaiming(false);
  };

  return (
    <div className="premium-card p-8">
      <h2 className="mb-8 text-2xl font-black text-white">Daily Streak 🔥</h2>
      <div className="mb-8 flex justify-between gap-2">
        {STREAK_PTS.map((pts, i) => {
          const day = i + 1;
          const done = i < streak;
          const isToday = i === streak && !claimed;
          return (
            <div
              key={day}
              className={cn(
                'flex flex-1 flex-col items-center rounded-2xl border py-4 transition-all',
                done ? 'border-emerald-500 bg-emerald-500/10' :
                isToday ? 'border-indigo-500 bg-indigo-500/10' :
                'border-zinc-800 bg-zinc-950'
              )}
            >
              <span className="text-xl">{done ? '✅' : day === 7 ? '🎁' : isToday ? '🎯' : '⬜'}</span>
              <span className={cn('mt-1 text-[10px] font-black uppercase', done ? 'text-emerald-400' : isToday ? 'text-indigo-400' : 'text-zinc-700')}>D{day}</span>
              <span className="text-[10px] font-bold text-zinc-600">+{pts}</span>
            </div>
          );
        })}
      </div>
      <button
        onClick={handleClaim}
        disabled={claimed || claiming || streak >= 7}
        className={cn(
          'w-full rounded-2xl py-4 text-sm font-black uppercase tracking-widest transition-all active:scale-95',
          claimed ? 'bg-zinc-800 text-zinc-600' :
          'bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_10px_30px_rgba(79,70,229,0.3)]'
        )}
      >
        {claiming ? 'Claiming…' : claimed ? `✅ Day ${streak} Claimed` : `🎯 Claim Day ${streak + 1} (+${STREAK_PTS[streak]} pts)`}
      </button>
    </div>
  );
};

// ── Quiz Section ──────────────────────────────────────────────
const QuizSection: React.FC<{ questions: any[]; submitted: boolean; spinDone: boolean; spinPoints: number; onRefresh: () => void }> = ({ questions, submitted, spinDone, spinPoints, onRefresh }) => {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<any>(null);
  const [showSpin, setShowSpin] = useState(submitted && !spinDone);
  const [spinning, setSpinning] = useState(false);
  const [spinTarget, setSpinTarget] = useState<number | null>(null);
  const [spinResult, setSpinResult] = useState<number | null>(null);

  const correctCount = quizResult ? Object.keys(selections).filter(k => selections[k] === quizResult.answers?.[k]).length : 0;

  const handleSubmit = async () => {
    if (Object.keys(selections).length < questions.length || submitting) return;
    setSubmitting(true);
    const res = await API.submitQuiz(selections);
    if (res.success) {
      const answers: Record<string, string> = {};
      res.correctAnswers?.forEach((q: any) => { answers[String(q.qid)] = q.correct_option; });
      setQuizResult({ ...res, answers });
      setShowSpin(true);
    }
    setSubmitting(false);
  };

  const handleQuizSpin = () => {
    const correct = quizResult
      ? Object.keys(selections).filter(k => selections[k] === quizResult.answers?.[k]).length
      : 0;
    const activeSegs = QUIZ_SEGS.map((s, i) => ({ ...s, active: s.value === 0 ? false : i < correct }));
    const active = activeSegs.map((s, i) => ({ s, i })).filter(({ s }) => s.active);
    if (!active.length) return;
    const pick = active[Math.floor(Math.random() * active.length)];
    setSpinTarget(pick.i);
    setSpinning(true);
  };

  const handleSpinDone = async () => {
    const pts = QUIZ_SEGS[spinTarget!].value;
    const res = await API.recordSpin('quiz', pts);
    if (res.success) { setSpinResult(pts); onRefresh(); }
    setSpinning(false);
  };

  if (spinDone) {
    return (
      <div className="premium-card p-12 text-center">
        <Trophy className="mx-auto mb-6 h-16 w-16 text-yellow-400" />
        <h2 className="mb-2 text-2xl font-black text-white">Quiz + Spin Done!</h2>
        <p className="text-zinc-400">You earned <span className="font-black text-yellow-400">+{spinPoints} pts</span> from the spin.</p>
      </div>
    );
  }

  if (showSpin) {
    const correct = quizResult
      ? Object.keys(selections).filter(k => selections[k] === quizResult.answers?.[k]).length
      : 0;
    const segs = QUIZ_SEGS.map((s, i) => ({ ...s, active: s.value === 0 ? false : i < correct }));
    return (
      <div className="premium-card p-8 text-center">
        <h2 className="mb-2 text-2xl font-black text-white">Quiz done! Now spin 🎰</h2>
        <p className="mb-8 text-zinc-500">{correct}/{questions.length} correct → {correct} active blocks</p>
        <div className="mb-8 flex justify-center">
          <SpinWheelCanvas segments={segs} spinning={spinning} targetIndex={spinTarget} onDone={handleSpinDone} />
        </div>
        <button
          onClick={handleQuizSpin}
          disabled={spinning || correct === 0}
          className={cn(
            'mx-auto block w-full max-w-xs rounded-2xl py-4 text-lg font-black uppercase tracking-widest transition-all active:scale-95',
            spinning || correct === 0 ? 'bg-zinc-800 text-zinc-500' : 'bg-indigo-600 text-white hover:bg-indigo-500'
          )}
        >
          {spinning ? 'Spinning…' : correct > 0 ? '🎰 Spin & Win!' : 'No active blocks 😢'}
        </button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="premium-card p-12 text-center">
        <Brain className="mx-auto mb-6 h-16 w-16 text-indigo-400" />
        <h2 className="mb-2 text-2xl font-black text-white">Already submitted today!</h2>
        <p className="text-zinc-500">Come back tomorrow for a fresh quiz.</p>
      </div>
    );
  }

  return (
    <div className="premium-card p-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-black text-white">Daily Quiz 📝</h2>
        <span className="text-sm font-bold text-zinc-500">{Object.keys(selections).length}/{questions.length} answered</span>
      </div>
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-zinc-900">
        <div
          className="h-full rounded-full bg-indigo-600 transition-all duration-300"
          style={{ width: `${(Object.keys(selections).length / Math.max(questions.length, 1)) * 100}%` }}
        />
      </div>
      <div className="space-y-6">
        {questions.map((q: any, idx: number) => (
          <div key={q.qid} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <div className="mb-3 flex justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Q{idx + 1}</span>
              {q.prepare_link && <a href={q.prepare_link} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:underline">📘 Help</a>}
            </div>
            <h3 className="mb-5 text-base font-black text-white">{q.question}</h3>
            <div className="grid gap-3">
              {['A', 'B', 'C', 'D'].map(opt => (
                <button
                  key={opt}
                  onClick={() => setSelections({ ...selections, [q.qid]: opt })}
                  className={cn(
                    'flex items-center gap-4 rounded-xl border p-4 text-left transition-all active:scale-[0.99]',
                    selections[q.qid] === opt
                      ? 'border-indigo-500 bg-indigo-500/10 text-white'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-white'
                  )}
                >
                  <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-black', selections[q.qid] === opt ? 'border-indigo-400 bg-indigo-400 text-zinc-950' : 'border-zinc-700')}>{opt}</div>
                  {q[`option_${opt.toLowerCase()}`]}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button
          onClick={handleSubmit}
          disabled={submitting || Object.keys(selections).length < questions.length}
          className={cn(
            'w-full rounded-2xl py-4 text-sm font-black uppercase tracking-widest transition-all active:scale-95',
            Object.keys(selections).length < questions.length || submitting
              ? 'bg-zinc-800 text-zinc-600'
              : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_10px_30px_rgba(79,70,229,0.3)]'
          )}
        >
          {submitting ? 'Submitting…' : '📤 Submit Quiz'}
        </button>
      </div>
    </div>
  );
};

// ── Super Spin Section ────────────────────────────────────────
const SuperSection: React.FC<{ questions: any[]; submitted: boolean; correct: number; spinDone: boolean; spinPoints: number; onRefresh: () => void }> = ({ questions, submitted, correct, spinDone, spinPoints, onRefresh }) => {
  const [sels, setSels] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [spinTarget, setSpinTarget] = useState<number | null>(null);
  const [localCorrect, setLocalCorrect] = useState(correct);

  if (!questions.length && !submitted) return (
    <div className="premium-card p-12 text-center">
      <Zap className="mx-auto mb-6 h-16 w-16 text-zinc-700" />
      <h2 className="mb-2 text-2xl font-black text-white">Super Spin Locked</h2>
      <p className="max-w-xs mx-auto text-zinc-500">Weekly super questions are not available yet. Check back soon!</p>
    </div>
  );

  if (spinDone) return (
    <div className="premium-card p-12 text-center">
      <Zap className="mx-auto mb-6 h-16 w-16 text-yellow-400" />
      <h2 className="mb-2 text-2xl font-black text-white">Super Spin Done!</h2>
      <p className="text-zinc-400">You earned <span className="font-black text-yellow-400">+{spinPoints} pts</span> this week!</p>
    </div>
  );

  const submitSuper = async () => {
    if (Object.keys(sels).length < questions.length || submitting) return;
    setSubmitting(true);
    const res = await API.submitSuperQuiz(sels);
    if (res.success) setLocalCorrect(res.correct_count ?? 0);
    setSubmitting(false);
  };

  const doSpin = () => {
    const segs = SUPER_SEGS.map((s, i) => ({ ...s, active: s.value === 0 ? false : i < localCorrect }));
    const active = segs.map((s, i) => ({ s, i })).filter(({ s }) => s.active);
    if (!active.length) return;
    const pick = active[Math.floor(Math.random() * active.length)];
    setSpinTarget(pick.i);
    setSpinning(true);
  };

  const handleSpinDone = async () => {
    const pts = SUPER_SEGS[spinTarget!].value;
    await API.recordSpin('super', pts);
    onRefresh();
    setSpinning(false);
  };

  const showSpin = submitted || Object.keys(sels).length === questions.length && localCorrect > 0;

  if (showSpin && (submitted || localCorrect >= 0)) {
    const segs = SUPER_SEGS.map((s, i) => ({ ...s, active: s.value === 0 ? false : i < localCorrect }));
    return (
      <div className="premium-card p-8 text-center">
        <h2 className="mb-2 text-2xl font-black text-white">⚡ Super Spin!</h2>
        <p className="mb-8 text-zinc-500">{localCorrect}/{questions.length} correct → {localCorrect} active blocks — up to 1000 pts!</p>
        <div className="mb-8 flex justify-center">
          <SpinWheelCanvas segments={segs} spinning={spinning} targetIndex={spinTarget} onDone={handleSpinDone} />
        </div>
        <button
          onClick={doSpin}
          disabled={spinning || localCorrect === 0}
          className={cn(
            'mx-auto block w-full max-w-xs rounded-2xl py-4 text-lg font-black uppercase tracking-widest transition-all active:scale-95',
            spinning || localCorrect === 0 ? 'bg-zinc-800 text-zinc-500' : 'bg-yellow-500 text-zinc-950 hover:bg-yellow-400'
          )}
        >
          {spinning ? 'Spinning…' : localCorrect > 0 ? '⚡ Super Spin!' : 'No active blocks'}
        </button>
      </div>
    );
  }

  return (
    <div className="premium-card p-8">
      <div className="mb-6 flex items-center gap-3">
        <Zap className="h-6 w-6 text-yellow-400" />
        <h2 className="text-2xl font-black text-white">Weekly Super Quiz ⚡</h2>
      </div>
      <div className="space-y-6">
        {questions.map((q: any, idx: number) => (
          <div key={q.qid} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <span className="mb-3 block text-[10px] font-black uppercase tracking-widest text-yellow-600">Q{idx + 1}</span>
            <h3 className="mb-5 text-base font-black text-white">{q.question}</h3>
            <div className="grid gap-3">
              {['A', 'B', 'C', 'D'].map(opt => (
                <button
                  key={opt}
                  onClick={() => setSels({ ...sels, [q.qid]: opt })}
                  className={cn(
                    'flex items-center gap-4 rounded-xl border p-4 text-left transition-all',
                    sels[q.qid] === opt
                      ? 'border-yellow-500 bg-yellow-500/10 text-white'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-white'
                  )}
                >
                  <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-black', sels[q.qid] === opt ? 'border-yellow-400 bg-yellow-400 text-zinc-950' : 'border-zinc-700')}>{opt}</div>
                  {q[`option_${opt.toLowerCase()}`]}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button
          onClick={submitSuper}
          disabled={submitting || Object.keys(sels).length < questions.length}
          className={cn(
            'w-full rounded-2xl py-4 text-sm font-black uppercase tracking-widest transition-all active:scale-95',
            Object.keys(sels).length < questions.length || submitting
              ? 'bg-zinc-800 text-zinc-600'
              : 'bg-yellow-500 text-zinc-950 hover:bg-yellow-400'
          )}
        >
          {submitting ? 'Submitting…' : '⚡ Submit Super Quiz'}
        </button>
      </div>
    </div>
  );
};
