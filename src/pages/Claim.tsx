import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API, getWeekKey } from '../services/api'; // ✅ getWeekKey import — no duplicate logic
import { Gift, Star, Ticket, History, Loader2, CheckCircle2, AlertCircle, Send, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export const Claim: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ getCodeHistory — fetches redeem_history table (code, reward_type, reward_value)
  const loadHistory = async () => {
    if (!user?.user_id) return;
    try {
      const res = await API.getCodeHistory(user.user_id);
      if (res.success) setHistory(res.history || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [user]);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || redeeming) return;

    setRedeeming(true);
    setMessage(null);

    try {
      const isReferral = /^AG\d+$/i.test(code.trim());
      const res = isReferral
        ? await API.redeemReferral(code.trim())
        : await API.redeemCode(code.trim(), getWeekKey()); // ✅ shared getWeekKey — consistent with rest of app

      if (res.success) {
        setMessage({
          type: 'success',
          text: res.message || `Successfully redeemed! You got ${res.reward_value} ${res.reward_type}.`
        });
        setCode('');
        await Promise.all([loadHistory(), refreshProfile()]);
      } else {
        setMessage({ type: 'error', text: res.error || 'Invalid or expired code.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="mb-12 overflow-hidden rounded-[32px] bg-zinc-900/50 p-8 md:p-12 border border-zinc-800 relative">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-400">
            <Zap className="h-3.5 w-3.5" /> Instant Rewards
          </span>
          <h1 className="mb-4 text-4xl font-black text-white md:text-6xl">
            Redeem <span className="text-emerald-400">Secret Codes</span>
          </h1>
          <p className="mb-8 max-w-lg text-zinc-500">
            Enter referral codes or special event codes to unlock instant points and stamps.
          </p>

          <div className="premium-card inline-flex items-center gap-4 bg-zinc-950/50 px-8 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400/10 text-yellow-400">
              <Star className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Current Balance</p>
              <p className="text-2xl font-black text-white">{user?.points || 0} pts</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Claim Form */}
        <div className="lg:col-span-2">
          <div className="premium-card p-8">
            <form onSubmit={handleRedeem} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Enter Secret Code</label>
                <div className="relative">
                  <Ticket className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-600" />
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="E.G. WELCOME2024"
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 py-4 pl-12 pr-4 font-mono text-lg font-black tracking-widest text-white placeholder:text-zinc-800 focus:border-emerald-500 focus:outline-none transition-all"
                  />
                </div>
                <p className="text-[10px] font-medium text-zinc-600">Codes are case-insensitive and usually 8-12 characters long.</p>
              </div>

              <AnimatePresence>
                {message && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl p-5 text-sm font-bold",
                      message.type === 'success'
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                    )}
                  >
                    {message.type === 'success' ? <CheckCircle2 className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
                    {message.text}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={redeeming || !code.trim()}
                className="w-full flex items-center justify-center gap-3 rounded-2xl bg-emerald-600 py-5 text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-emerald-500 shadow-[0_10px_20px_rgba(16,185,129,0.3)] active:scale-95 disabled:opacity-50"
              >
                {redeeming ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Zap className="h-5 w-5" /> Redeem Code</>}
              </button>
            </form>
          </div>

          {/* Info Cards */}
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="premium-card p-6 border-l-4 border-l-indigo-500">
              <h4 className="mb-2 text-sm font-black text-white uppercase tracking-tight">Referral Codes</h4>
              <p className="text-xs leading-relaxed text-zinc-500">Use a friend's code to get a 1000 point bonus instantly. Can only be used once per account.</p>
            </div>
            <div className="premium-card p-6 border-l-4 border-l-yellow-500">
              <h4 className="mb-2 text-sm font-black text-white uppercase tracking-tight">Event Codes</h4>
              <p className="text-xs leading-relaxed text-zinc-500">Watch our social media for limited-time codes that give stamps and massive point boosts!</p>
            </div>
          </div>
        </div>

        {/* History */}
        <div>
          <div className="premium-card p-8">
            <h2 className="mb-8 flex items-center gap-3 text-xl font-black text-white uppercase tracking-tight">
              <History className="h-5 w-5 text-zinc-500" /> Recent Claims
            </h2>
            <div className="space-y-4">
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-zinc-900" />)}
                </div>
              ) : history.length > 0 ? (
                history.map((h, i) => (
                  <div key={i} className="flex items-center gap-4 rounded-2xl bg-zinc-950/50 p-5 border border-zinc-800/50">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-emerald-400">
                      <Zap className="h-6 w-6" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      {/* ✅ redeem_history table fields: code, reward_type, redeemed_at */}
                      <h4 className="truncate font-mono text-sm font-black text-white">{h.code}</h4>
                      <p className="text-[10px] font-bold uppercase text-zinc-600">
                        {new Date(h.redeemed_at).toLocaleDateString()} · {h.reward_type}
                      </p>
                    </div>
                    <div className="text-right">
                      {/* ✅ reward_value from redeem_history */}
                      <p className="text-sm font-black text-emerald-400">+{h.reward_value}</p>
                      <p className="text-[10px] font-bold uppercase text-zinc-600">{h.reward_type}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center">
                  <Ticket className="mx-auto mb-4 h-12 w-12 text-zinc-800" />
                  <p className="text-sm font-bold text-zinc-600">No claims yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};