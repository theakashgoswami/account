import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API } from '../services/api';
import { Gift, Star, Ticket, Check, X, Loader2, Trophy, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export const Rewards: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const [rewards, setRewards] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [redeeming, setRedeeming] = useState(false);

  const loadData = async () => {
    if (!user?.user_id) return;
    try {
      const [r, h] = await Promise.all([
        API.getRewards(user.user_id),
        API.getRedeemHistory(user.user_id)
      ]);
      if (r.success) setRewards(r.rewards || []);
      if (h.success) setHistory(h.history || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleRedeem = async () => {
    if (!user?.user_id) return;
    if (!selectedReward || redeeming) return;
    setRedeeming(true);
    try {
      const res = await API.redeemReward(selectedReward.reward_id);
      if (res.success) {
        setSelectedReward(null);
        await Promise.all([loadData(), refreshProfile()]);
      } else {
        alert(res.error || "Redemption failed");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRedeeming(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-zinc-900" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="mb-12 overflow-hidden rounded-[32px] bg-zinc-900/50 p-8 md:p-12 border border-zinc-800 relative">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-400">
            <Gift className="h-3.5 w-3.5" /> REWARDS ZONE
          </span>
          <h1 className="mb-4 text-4xl font-black text-white md:text-6xl">
            Redeem Your <span className="text-indigo-400">Points & Stamps</span>
          </h1>
          <p className="mb-8 max-w-lg text-zinc-500">
            Use Your Stamps wisely, they are rare and valuable! Choose your favorite reward and file a redeem Request.
          </p>

          <div className="flex flex-wrap gap-6">
            <div className="premium-card flex items-center gap-4 bg-zinc-950/50 px-8 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400/10 text-yellow-400">
                <Star className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Available Points</p>
                <p className="text-2xl font-black text-white" id="usePagePoints">{user?.points || 0}</p>
              </div>
            </div>
            <div className="premium-card flex items-center gap-4 bg-zinc-950/50 px-8 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-400/10 text-indigo-400">
                <Ticket className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Available Stamps</p>
                <p className="text-2xl font-black text-white" id="usePageStamps">{user?.stamps || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-10 flex items-center gap-4">
        <div className="h-px flex-1 bg-zinc-800" />
        <h2 className="flex items-center gap-3 text-2xl font-black text-white uppercase tracking-tight">
          <Trophy className="h-6 w-6 text-yellow-400" /> Available Rewards
        </h2>
        <div className="h-px flex-1 bg-zinc-800" />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Rewards Grid */}
        <div className="lg:col-span-2">
          <div className="grid gap-6 md:grid-cols-2">
            {rewards.map((reward) => (
              <motion.div
                key={reward.reward_id}
                whileHover={{ y: -8 }}
                className={cn(
                  "premium-card group p-8",
                  !reward.canAfford && "opacity-60 grayscale-[0.5]"
                )}
              >
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-600/10 text-indigo-400 shadow-inner">
                  <Gift className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-xl font-black text-white">{reward.reward_name}</h3>
                <p className="mb-8 text-sm leading-relaxed text-zinc-500 line-clamp-2">{reward.description}</p>
                
                <div className="mb-8 flex flex-wrap gap-4">
                  {reward.cost_points > 0 && (
                    <div className="flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2 text-sm font-black text-yellow-400">
                      <Star className="h-4 w-4" />
                      {reward.cost_points}
                    </div>
                  )}
                  {reward.cost_stamps > 0 && (
                    <div className="flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2 text-sm font-black text-indigo-400">
                      <Ticket className="h-4 w-4" />
                      {reward.cost_stamps}
                    </div>
                  )}
                </div>

                <button
                  disabled={!reward.canAfford}
                  onClick={() => setSelectedReward(reward)}
                  className={cn(
                    "w-full rounded-2xl py-4 text-sm font-black uppercase tracking-widest transition-all active:scale-95",
                    reward.canAfford 
                      ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_10px_20px_rgba(79,70,229,0.3)]" 
                      : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                  )}
                >
                  {reward.canAfford ? "Redeem Now" : "Locked"}
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* History Sidebar */}
        <div>
          <section className="premium-card p-8">
            <h2 className="mb-8 flex items-center gap-3 text-xl font-black text-white uppercase tracking-tight">
              <History className="h-5 w-5 text-zinc-500" /> History
            </h2>
            <div className="space-y-4">
              {history.length > 0 ? (
                history.map((h, i) => (
                  <div key={i} className="flex items-center gap-4 rounded-2xl bg-zinc-950/50 p-5 border border-zinc-800/50">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-zinc-500">
                      <Check className="h-6 w-6" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <h4 className="truncate text-sm font-black text-white">{h.reward_name}</h4>
                      <p className="text-[10px] font-bold uppercase text-zinc-600">{new Date(h.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        "rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider",
                        h.status === 'completed' ? "bg-emerald-500/10 text-emerald-400" : "bg-yellow-500/10 text-yellow-400"
                      )}>
                        {h.status || 'Done'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center">
                  <History className="mx-auto mb-4 h-12 w-12 text-zinc-800" />
                  <p className="text-sm font-bold text-zinc-600">No history yet</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {selectedReward && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedReward(null)}
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl"
            >
              <div className="mb-6 flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
                  <Gift className="h-10 w-10" />
                </div>
              </div>
              
              <h3 className="mb-2 text-center text-xl font-bold text-white">Confirm Redemption</h3>
              <p className="mb-8 text-center text-zinc-400">
                Are you sure you want to redeem <span className="font-bold text-white">{selectedReward.reward_name}</span>?
              </p>

              <div className="mb-8 rounded-xl bg-zinc-950 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Cost</span>
                  <div className="flex gap-3">
                    {selectedReward.cost_points > 0 && <span className="font-bold text-yellow-400">{selectedReward.cost_points} pts</span>}
                    {selectedReward.cost_stamps > 0 && <span className="font-bold text-indigo-400">{selectedReward.cost_stamps} stamps</span>}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedReward(null)}
                  className="flex-1 rounded-xl bg-zinc-800 py-3 text-sm font-bold text-white transition-colors hover:bg-zinc-700"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleRedeem}
                  disabled={redeeming}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white transition-all hover:bg-indigo-500 active:scale-95 disabled:opacity-50"
                >
                  {redeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : "CONFIRM"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
