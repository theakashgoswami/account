import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API, DashboardStats, Notification } from '../services/api';
import { Trophy, ShoppingBag, Brain, Users, Bell, Copy, Gift, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [referralStats, setReferralStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user?.user_id) return;
    Promise.all([
      API.getDashboardStats(user.user_id),
      API.getNotifications(),
      API.getReferralStats(),
    ]).then(([s, n, r]) => {
      setStats(s);
      setNotifications(n);
      setReferralStats(r);
    }).finally(() => setLoading(false));
  }, [user?.user_id]);

  const copyReferral = () => {
    if (!user?.user_id) return;
    navigator.clipboard.writeText(user.user_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-6 md:grid-cols-3 mb-6">
          {[1, 2, 3].map(i => <div key={i} className="h-32 animate-pulse rounded-3xl bg-zinc-900" />)}
        </div>
        <div className="h-80 animate-pulse rounded-3xl bg-zinc-900" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Welcome */}
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <h1 className="text-3xl font-black text-white md:text-5xl">
          Welcome back,{' '}
          <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            {user?.name || user?.user_id}
          </span>{' '}
          👋
        </h1>
        <p className="mt-3 text-zinc-500">
          <a href="/earn" className="text-indigo-400 hover:text-indigo-300 transition-colors font-semibold">
            Visit Earn page → 
          </a>{' '}
          spin the wheel, complete quizzes, claim your daily streak and grow your balance.
        </p>
      </motion.header>

      {/* Stats */}
      <div className="mb-10 grid gap-6 md:grid-cols-3">
        <StatCard icon={Brain} label="Quizzes Played" value={stats?.quizPlayed ?? 0} color="text-blue-400" bg="bg-blue-400/10" delay={0} />
        <StatCard icon={Trophy} label="Total Score" value={stats?.quizScore ?? 0} color="text-yellow-400" bg="bg-yellow-400/10" delay={0.05} />
        <StatCard icon={ShoppingBag} label="Purchases" value={stats?.purchaseCount ?? 0} color="text-emerald-400" bg="bg-emerald-400/10" delay={0.1} />
      </div>

      {/* Referral + Notifications */}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Referral mini stats */}
          <div className="grid gap-4 grid-cols-3">
            <div className="premium-card p-5 text-center">
              <p className="text-2xl font-black text-white">{referralStats?.count ?? 0}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Referrals</p>
            </div>
            <div className="premium-card p-5 text-center">
              <p className="text-2xl font-black text-indigo-400">{referralStats?.earnings ?? 0}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Pts Earned</p>
            </div>
            <div className="premium-card p-5 text-center">
              <p className="text-2xl font-black text-yellow-400">{user?.points ?? 0}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Total Pts</p>
            </div>
          </div>

          {/* Main referral card */}
          <section className="premium-card p-8">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30">
                <Gift className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">Invite Friends & Earn!</h2>
                <p className="text-sm text-zinc-500">Get <strong className="text-white">2000 points</strong> per friend who joins</p>
              </div>
            </div>

            {/* Progress */}
            <div className="mb-8 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-zinc-500">Next milestone</span>
                <span className="font-bold text-indigo-400">
                  {(referralStats?.count ?? 0) < 5
                    ? `${5 - (referralStats?.count ?? 0)} more for bonus`
                    : '🏆 Milestone reached!'}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-950">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(((referralStats?.count ?? 0) / 10) * 100, 100)}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-cyan-500 shadow-[0_0_12px_rgba(79,70,229,0.5)]"
                />
              </div>
              <div className="flex justify-between px-1 text-[10px] font-bold text-zinc-700">
                <span>1</span><span>3</span><span>5</span><span>10</span>
              </div>
            </div>

            {/* Code */}
            <div className="mb-6">
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">Your Referral Code</p>
              <div className="flex gap-2">
                <div className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-center">
                  <span className="font-mono text-2xl font-black tracking-[0.2em] text-white">{user?.user_id}</span>
                </div>
                <button
                  onClick={copyReferral}
                  className="flex items-center gap-2 rounded-2xl bg-yellow-500 px-6 font-black text-zinc-950 transition-all hover:bg-yellow-400 active:scale-95"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? 'COPIED!' : 'COPY'}
                </button>
              </div>
            </div>

            {/* Share */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { emoji: '📱', label: 'WhatsApp', color: 'bg-[#25D366]', href: `https://wa.me/?text=${encodeURIComponent(`Join AG TechScript! Code: ${user?.user_id} → https://agtechscript.in`)}` },
                { emoji: '✈️', label: 'Telegram', color: 'bg-[#0088cc]', href: `https://t.me/share/url?url=${encodeURIComponent('https://agtechscript.in')}&text=${encodeURIComponent(`Join AG TechScript! Code: ${user?.user_id}`)}` },
                { emoji: '🐦', label: 'Twitter', color: 'bg-[#1DA1F2]', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Join AG TechScript! Code: ${user?.user_id} https://agtechscript.in`)}` },
                { emoji: '💬', label: 'SMS', color: 'bg-[#6c5ce7]', href: `sms:?body=${encodeURIComponent(`Join AG TechScript! Code: ${user?.user_id} https://agtechscript.in`)}` },
              ].map(btn => (
                <a
                  key={btn.label}
                  href={btn.href}
                  target="_blank"
                  rel="noreferrer"
                  className={cn('flex flex-col items-center gap-1 rounded-2xl py-3 text-[10px] font-black text-white uppercase tracking-wider transition-all hover:opacity-90 active:scale-95', btn.color)}
                >
                  <span className="text-base">{btn.emoji}</span>
                  {btn.label}
                </a>
              ))}
            </div>
          </section>
        </div>

        {/* Notifications */}
        <section className="premium-card p-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-black text-white">Notifications</h2>
            <Bell className="h-5 w-5 text-zinc-600" />
          </div>
          <div className="space-y-3">
            {notifications.length > 0 ? (
              notifications.slice(0, 5).map(n => (
                <div key={n.id} className="rounded-2xl bg-zinc-950 p-4 transition-all hover:bg-zinc-900">
                  <h3 className="mb-1 text-sm font-black text-white">{n.title}</h3>
                  <p className="text-xs text-zinc-500 line-clamp-2">{n.message}</p>
                  <span className="mt-2 block text-[10px] text-zinc-700">
                    {new Date(n.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Zap className="mb-4 h-10 w-10 text-zinc-800" />
                <p className="text-sm font-bold text-zinc-700">No notifications yet</p>
                <p className="text-xs text-zinc-800 mt-1">Earn points to unlock exclusive offers!</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: any; label: string; value: number; color: string; bg: string; delay: number }> = ({ icon: Icon, label, value, color, bg, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    whileHover={{ y: -4 }}
    className="premium-card p-8"
  >
    <div className={cn('mb-4 flex h-12 w-12 items-center justify-center rounded-2xl', bg, color)}>
      <Icon className="h-6 w-6" />
    </div>
    <p className="text-3xl font-black text-white">{value.toLocaleString()}</p>
    <p className="mt-1 text-sm font-medium text-zinc-500">{label}</p>
  </motion.div>
);
