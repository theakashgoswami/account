import React, { useEffect, useState } from 'react';
import { Trophy, Medal, User, RefreshCw, Crown, Calendar, TrendingUp, Award, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { API } from '../services/api';

type Timeframe = 'weekly' | 'monthly' | 'all';

interface LeaderboardProps {
  onClose?: () => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ onClose }) => {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<Timeframe>('weekly');
  const [currentPeriod, setCurrentPeriod] = useState<string>('');

  const loadLeaderboard = async () => {
    setLoading(true);
    let res;
    if (timeframe === 'weekly') {
      res = await API.getWeeklyLeaderboard();
      if (res.success && res.weekKey) setCurrentPeriod(res.weekKey);
    } else if (timeframe === 'monthly') {
      res = await API.getMonthlyLeaderboard();
      if (res.success && res.monthKey) setCurrentPeriod(res.monthKey);
    } else {
      res = await API.getAllTimeLeaderboard();
      setCurrentPeriod('All Time');
    }
    
    if (res?.success) {
      setLeaderboard(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLeaderboard();
  }, [timeframe]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-black text-zinc-600">#{rank}</span>;
  };

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'from-yellow-500/10 to-transparent';
    if (rank === 2) return 'from-gray-500/10 to-transparent';
    if (rank === 3) return 'from-amber-600/10 to-transparent';
    return '';
  };

  const timeframeOptions = [
    { key: 'weekly' as Timeframe, label: 'This Week', icon: Calendar, desc: 'Points earned this week' },
    { key: 'monthly' as Timeframe, label: 'This Month', icon: TrendingUp, desc: 'Points earned this month' },
    { key: 'all' as Timeframe, label: 'All Time', icon: Award, desc: 'Total points earned' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md overflow-y-auto">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-indigo-500/20 p-3">
              <Trophy className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Leaderboard</h1>
              <p className="text-xs text-zinc-500">Compete and climb the ranks</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-full p-2 hover:bg-zinc-800 transition-colors"
            >
              <X className="h-5 w-5 text-zinc-500" />
            </button>
          )}
        </div>

        {/* Timeframe Selector */}
        <div className="mb-8 flex justify-center gap-2 flex-wrap">
          {timeframeOptions.map(t => (
            <button
              key={t.key}
              onClick={() => setTimeframe(t.key)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-2xl px-6 py-3 transition-all',
                timeframe === t.key
                  ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.5)]'
                  : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
              )}
            >
              <t.icon className="h-5 w-5" />
              <span className="text-xs font-black uppercase tracking-widest">{t.label}</span>
              <span className="text-[8px] opacity-70">{t.desc}</span>
            </button>
          ))}
        </div>

        {/* Info Banner */}
        <div className="mb-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 p-4 text-center">
          <p className="text-sm text-zinc-400">
            {timeframe === 'weekly' && `📅 Week of ${currentPeriod} — Resets every Monday`}
            {timeframe === 'monthly' && `📅 Month of ${currentPeriod} — Resets every 1st`}
            {timeframe === 'all' && `🏆 All-time rankings — Total points since joining`}
          </p>
        </div>

        {/* Top 3 Cards */}
        {!loading && leaderboard.length >= 3 && (
          <div className="mb-12 grid gap-4 md:grid-cols-3">
            {/* 2nd Place */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="order-2 md:order-1"
            >
              <div className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 text-center relative overflow-hidden">
                <div className="absolute -top-10 -right-10 text-8xl opacity-10">🥈</div>
                <div className="mb-3 text-5xl">🥈</div>
                <div className="mb-2 text-3xl font-black text-white">#{leaderboard[1]?.rank}</div>
                {leaderboard[1]?.profile_image ? (
                  <img src={leaderboard[1].profile_image} alt="" className="mx-auto mb-4 h-20 w-20 rounded-full border-2 border-gray-400 object-cover" />
                ) : (
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-500/20 border-2 border-gray-400">
                    <User className="h-10 w-10 text-gray-400" />
                  </div>
                )}
                <h3 className="text-xl font-black text-white">{leaderboard[1]?.name || leaderboard[1]?.user_id}</h3>
                <div className="mt-2 text-2xl font-black text-yellow-400">{leaderboard[1]?.score} pts</div>
              </div>
            </motion.div>

            {/* 1st Place */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0 }}
              className="order-1 md:order-2 -mt-6 md:-mt-8"
            >
              <div className="rounded-2xl border border-yellow-500/50 bg-gradient-to-b from-yellow-500/10 to-zinc-950 p-6 text-center relative overflow-hidden shadow-[0_0_30px_rgba(234,179,8,0.3)]">
                <div className="absolute -top-10 -right-10 text-8xl opacity-10">👑</div>
                <div className="mb-3 text-6xl">👑</div>
                <div className="mb-2 text-4xl font-black text-yellow-400">#{leaderboard[0]?.rank}</div>
                {leaderboard[0]?.profile_image ? (
                  <img src={leaderboard[0].profile_image} alt="" className="mx-auto mb-4 h-24 w-24 rounded-full border-4 border-yellow-500 object-cover" />
                ) : (
                  <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-yellow-500/20 border-4 border-yellow-500">
                    <User className="h-12 w-12 text-yellow-400" />
                  </div>
                )}
                <h3 className="text-2xl font-black text-white">{leaderboard[0]?.name || leaderboard[0]?.user_id}</h3>
                <div className="mt-2 text-3xl font-black text-yellow-400">{leaderboard[0]?.score} pts</div>
                <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-yellow-500/20 px-3 py-1">
                  <Crown className="h-3 w-3 text-yellow-400" />
                  <span className="text-[8px] font-black uppercase text-yellow-400">Champion</span>
                </div>
              </div>
            </motion.div>

            {/* 3rd Place */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="order-3"
            >
              <div className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 text-center relative overflow-hidden">
                <div className="absolute -top-10 -right-10 text-8xl opacity-10">🥉</div>
                <div className="mb-3 text-5xl">🥉</div>
                <div className="mb-2 text-3xl font-black text-white">#{leaderboard[2]?.rank}</div>
                {leaderboard[2]?.profile_image ? (
                  <img src={leaderboard[2].profile_image} alt="" className="mx-auto mb-4 h-20 w-20 rounded-full border-2 border-amber-600 object-cover" />
                ) : (
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-600/20 border-2 border-amber-600">
                    <User className="h-10 w-10 text-amber-400" />
                  </div>
                )}
                <h3 className="text-xl font-black text-white">{leaderboard[2]?.name || leaderboard[2]?.user_id}</h3>
                <div className="mt-2 text-2xl font-black text-yellow-400">{leaderboard[2]?.score} pts</div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Leaderboard List */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden">
          <div className="border-b border-zinc-800 bg-zinc-900/50 p-4">
            <div className="grid grid-cols-12 gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">
              <div className="col-span-2 text-center">Rank</div>
              <div className="col-span-7">User</div>
              <div className="col-span-3 text-right">Points</div>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-indigo-400" />
              <p className="mt-4 text-zinc-600">Loading leaderboard...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="p-12 text-center">
              <Trophy className="mx-auto h-12 w-12 text-zinc-700" />
              <p className="mt-4 text-zinc-600">No data available for this period</p>
              <p className="text-sm text-zinc-700">Play quizzes and earn points to appear here!</p>
            </div>
          ) : (
            <AnimatePresence>
              {leaderboard.map((user) => (
                <motion.div
                  key={user.user_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: user.rank * 0.01 }}
                  className={cn(
                    'grid grid-cols-12 gap-2 border-b border-zinc-800/50 p-4 transition-all',
                    user.rank <= 3 && 'bg-gradient-to-r',
                    getRankBg(user.rank)
                  )}
                >
                  <div className="col-span-2 flex items-center justify-center">
                    {getRankIcon(user.rank)}
                  </div>
                  <div className="col-span-7 flex items-center gap-3">
                    {user.profile_image ? (
                      <img 
                        src={user.profile_image} 
                        alt="" 
                        className="h-8 w-8 rounded-full object-cover"
                        onError={(e) => (e.currentTarget.src = '/default-avatar.png')}
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800">
                        <User className="h-4 w-4 text-zinc-600" />
                      </div>
                    )}
                    <span className="font-black text-white">{user.name}</span>
                  </div>
                  <div className="col-span-3 flex items-center justify-end">
                    <span className="text-xl font-black text-yellow-400">{user.score}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Refresh Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={loadLeaderboard}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 text-xs font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
};