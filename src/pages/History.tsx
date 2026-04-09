import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API } from '../services/api';
import { History as HistoryIcon, Brain, ShoppingBag, Star, Filter, Search, FileText, Trophy, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

type FilterType = 'all' | 'quiz' | 'purchase' | 'points';

export const History: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!user?.user_id) return;
      try {
        const res = await API.getFullHistory(user.user_id);
        if (res.success) setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const getFilteredActivities = () => {
    if (!data) return [];
    const activities: any[] = [];

    if (filter === 'all' || filter === 'quiz') {
      data.quiz.forEach((q: any) => activities.push({
        type: 'quiz',
        title: 'Quiz Attempt',
        desc: `Week ${q.quiz_date}`,
        points: q.score,
        date: q.created_at || q.quiz_date,
        icon: Brain,
        color: 'text-blue-400',
        bgColor: 'bg-blue-400/10'
      }));
    }

    if (filter === 'all' || filter === 'purchase') {
      data.purchases.forEach((p: any) => activities.push({
        type: 'purchase',
        title: p.item || 'Purchase',
        desc: `₹${p.amount}`,
        points: p.points,
        date: p.created_at,
        icon: ShoppingBag,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-400/10',
        invoiceId: p.invoice_id
      }));
    }

    if (filter === 'all' || filter === 'points') {
      data.points.forEach((p: any) => activities.push({
        type: 'points',
        title: p.points > 0 ? 'Points Earned' : 'Points Used',
        desc: p.reason || 'Points transaction',
        points: p.points,
        date: p.created_at,
        icon: Star,
        color: p.points > 0 ? 'text-yellow-400' : 'text-red-400',
        bgColor: p.points > 0 ? 'bg-yellow-400/10' : 'bg-red-400/10'
      }));
    }

    return activities
      .filter(a => a.title.toLowerCase().includes(search.toLowerCase()) || a.desc.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const activities = getFilteredActivities();

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="h-96 animate-pulse rounded-2xl bg-zinc-900" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-black text-white uppercase tracking-tight">
            <HistoryIcon className="h-8 w-8 text-indigo-400" /> Activity History
          </h1>
          <p className="mt-2 text-zinc-500">Track your progress, purchases, and points transactions.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-400 border border-emerald-500/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Live Updates
        </div>
      </header>

      {/* Stats Grid */}
      <div className="mb-10 grid gap-6 md:grid-cols-4">
        <StatCard label="Quizzes" value={data?.quiz?.length || 0} icon={Brain} color="text-blue-400" />
        <StatCard label="Purchases" value={data?.purchases?.length || 0} icon={ShoppingBag} color="text-emerald-400" />
        <StatCard label="Net Points" value={user?.points || 0} icon={Star} color="text-yellow-400" />
        <StatCard label="Total Score" value={data?.quiz?.reduce((acc: number, q: any) => acc + (q.score || 0), 0) || 0} icon={Trophy} color="text-indigo-400" />
      </div>

      {/* Filters & Search */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {(['all', 'quiz', 'purchase', 'points'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-xl px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all",
                filter === f 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                  : "bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
          <input
            type="text"
            placeholder="Search activities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 py-3 pl-12 pr-4 text-sm text-white placeholder:text-zinc-700 focus:border-indigo-500 focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Table/List */}
      <div className="premium-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/30">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Activity</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Description</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500 text-right">Points</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Date</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {activities.length > 0 ? (
                activities.map((a, i) => (
                  <tr key={i} className="group transition-colors hover:bg-indigo-500/[0.02]">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 group-hover:border-indigo-500/30 transition-colors", a.color)}>
                          <a.icon className="h-5 w-5" />
                        </div>
                        <span className="font-black text-white uppercase tracking-tight text-sm">{a.title}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm font-medium text-zinc-500">{a.desc}</td>
                    <td className="px-8 py-6 text-right">
                      <span className={cn(
                        "font-mono font-black text-base",
                        a.points > 0 ? "text-emerald-400" : a.points < 0 ? "text-red-400" : "text-zinc-600"
                      )}>
                        {a.points > 0 ? `+${a.points}` : a.points}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-sm font-bold text-zinc-600">
                      {new Date(a.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/80">Completed</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-8 py-32 text-center">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-zinc-950 text-zinc-800 border border-zinc-900">
                      <HistoryIcon className="h-10 w-10" />
                    </div>
                    <p className="text-sm font-black uppercase tracking-widest text-zinc-700">No activities found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest text-zinc-600">
        <AlertCircle className="h-3.5 w-3.5" />
        Auto-refreshes every 15 minutes
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number | string; icon: any; color: string }> = ({ label, value, icon: Icon, color }) => (
  <div className="premium-card p-6 flex items-center gap-5">
    <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-950 border border-zinc-800", color)}>
      <Icon className="h-7 w-7" />
    </div>
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{label}</p>
      <p className="text-2xl font-black text-white">{value}</p>
    </div>
  </div>
);
