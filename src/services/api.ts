import { CONFIG } from '../config';
import { getSupabase } from '../lib/supabase';

export interface UserProfile {
  user_id: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  profile_image?: string;
  points?: number;
  stamps?: number;
  created_at?: string;
  role?: string;
}

export interface DashboardStats {
  quizPlayed: number;
  purchaseCount: number;
  quizScore: number;
  referralCount: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

// ─── Auth Token ───────────────────────────────────────────────────────────────

async function getAuthToken(): Promise<string | null> {
  try {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
}

// ─── Worker Helpers ───────────────────────────────────────────────────────────

// ✅ 401 handled via custom event — no hard redirect, React lifecycle stays intact
function handle401() {
  window.dispatchEvent(new CustomEvent('auth:unauthorized'));
}

async function workerGet<T>(path: string): Promise<T | null> {
  try {
    const token = await getAuthToken();
    if (!token) {
      console.warn('No auth token available for:', path);
      return null;
    }

    const res = await fetch(`${CONFIG.WORKER_URL}${path}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Client-Host': window.location.host,
      },
      credentials: 'include',
    });

    if (!res.ok) {
      if (res.status === 401) {
        console.error('Auth failed for:', path);
        handle401();
      }
      return null;
    }

    return res.json();
  } catch (error) {
    console.error('Worker GET error:', error);
    return null;
  }
}

async function workerPost<T>(path: string, body: Record<string, unknown> = {}): Promise<T | { success: false; error: string }> {
  try {
    const token = await getAuthToken();
    if (!token) {
      console.warn('No auth token available for POST:', path);
      return { success: false, error: 'Not authenticated' };
    }

    const res = await fetch(`${CONFIG.WORKER_URL}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Client-Host': window.location.host,
      },
      body: JSON.stringify(body),
      credentials: 'include',
    });

    // ✅ Check ok BEFORE parsing — avoids crash on non-JSON error bodies
    if (!res.ok) {
      if (res.status === 401) {
        console.error('Auth failed for POST:', path);
        handle401();
      }
      const text = await res.text();
      let errorMsg = `HTTP ${res.status}`;
      try { errorMsg = JSON.parse(text)?.error ?? errorMsg; } catch { /* not JSON */ }
      return { success: false, error: errorMsg };
    }

    return res.json();
  } catch (error: unknown) {
    console.error('Worker POST error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ─── Date Utilities ───────────────────────────────────────────────────────────

// ✅ Reliable IST date using Intl API
function getTodayIST(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

// ✅ getWeekNumber removed — getWeekKey does the same thing
export function getWeekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const year = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - year.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

// ✅ Fisher-Yates — unbiased shuffle
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Leaderboard Helper (DRY) ─────────────────────────────────────────────────

async function buildLeaderboard(
  scoreField: string,
  filterField?: string,
  filterValue?: string
): Promise<{ user_id: string; score: number; rank: number; name: string; profile_image: string | null }[]> {
  const supabase = getSupabase();
  let query = supabase
    .from('leaderboard')
    .select(`user_id, ${scoreField} as score`)
    .order(scoreField, { ascending: false })
    .limit(100);

  if (filterField && filterValue) {
    query = query.eq(filterField, filterValue);
  }

  const { data, error } = await query;
  if (error) throw error;

  const userIds = (data ?? []).map(d => d.user_id);
  let users: { user_id: string; name: string; profile_image: string | null }[] = [];

  if (userIds.length > 0) {
    const { data: userData } = await supabase
      .from('user_profiles')
      .select('user_id, name, profile_image')
      .in('user_id', userIds);
    users = userData ?? [];
  }

  return (data ?? []).map((item, idx) => ({
    ...item,
    rank: idx + 1,
    name: users.find(u => u.user_id === item.user_id)?.name || item.user_id,
    profile_image: users.find(u => u.user_id === item.user_id)?.profile_image ?? null,
  }));
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const API = {
  async getUserProfile(uid: string) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle();
      if (!error && data) return { success: true, ...data };
    } catch { /* fallback */ }
    return (await workerGet<any>('/api/user/profile')) ?? { success: false };
  },

  async getUserStats(uid: string) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('user_profiles')
        .select('points, stamps')
        .eq('user_id', uid)
        .maybeSingle();
      if (!error && data) return { success: true, points: data.points ?? 0, stamps: data.stamps ?? 0 };
    } catch { /* fallback */ }
    return (await workerGet<any>('/api/user/stats')) ?? { success: false, points: 0, stamps: 0 };
  },

  async getDashboardStats(uid: string): Promise<DashboardStats | null> {
    try {
      const supabase = getSupabase();
      const [quiz, purchase, score, referrals] = await Promise.all([
        supabase.from('quiz_submissions').select('id', { count: 'exact', head: true }).eq('user_id', uid),
        supabase.from('purchases').select('id', { count: 'exact', head: true }).eq('user_id', uid),
        supabase.from('leaderboard').select('all_time_score').eq('user_id', uid).maybeSingle(),
        supabase.from('referrals').select('id', { count: 'exact', head: true }).eq('referrer_id', uid),
      ]);
      return {
        quizPlayed: quiz.count ?? 0,
        purchaseCount: purchase.count ?? 0,
        quizScore: score.data?.all_time_score ?? 0,
        referralCount: referrals.count ?? 0,
      };
    } catch { /* fallback */ }
    return workerGet<DashboardStats>('/api/user/dashboard-stats');
  },

  async getNotifications(): Promise<Notification[]> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (!error && data) return data;
    } catch { /* fallback */ }
    const res = await workerGet<{ success: boolean; notifications: Notification[] }>('/api/user/notifications');
    return res?.notifications ?? [];
  },

  async getSpinStatus(uid: string) {
    try {
      const today = getTodayIST();
      const supabase = getSupabase();
      const [{ data: streakData }, { data: spinData }] = await Promise.all([
        supabase.from('streak_records').select('streak,last_date').eq('user_id', uid).maybeSingle(),
        supabase.from('spin_records').select('type,points').eq('user_id', uid).eq('spin_date', today),
      ]);
      const free = spinData?.find((s: any) => s.type === 'free');
      const quiz = spinData?.find((s: any) => s.type === 'quiz');
      const sup  = spinData?.find((s: any) => s.type === 'super');
      return {
        success: true,
        streak: streakData?.streak ?? 0,
        streak_claimed: streakData?.last_date === today,
        free_spin_done: !!free,  free_spin_points: free?.points ?? 0,
        quiz_spin_done: !!quiz,  quiz_spin_points: quiz?.points ?? 0,
        super_spin_done: !!sup,  super_spin_points: sup?.points ?? 0,
      };
    } catch { /* fallback */ }
    return workerGet<any>('/api/user/spin-status');
  },

  async getQuizQuestions(uid: string) {
    try {
      const today = getTodayIST();
      const supabase = getSupabase();

      const { data: existing } = await supabase
        .from('quiz_submissions')
        .select('score,answers,questions')
        .eq('user_id', uid)
        .eq('quiz_date', today)
        .maybeSingle();

      if (existing) {
        return { success: true, submitted: true, score: existing.score ?? 0, selections: existing.answers, earn: [] };
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateLimit = thirtyDaysAgo.toISOString().split('T')[0];

      const { data: recentQuestions } = await supabase
        .from('user_quiz_progress')
        .select('question_id')
        .eq('user_id', uid)
        .gte('asked_date', dateLimit);

      const usedQids = new Set(recentQuestions?.map(r => r.question_id) || []);

      let query = supabase
        .from('quiz_questions')
        .select('qid,question,option_a,option_b,option_c,option_d,prepare_link')
        .eq('active', true);

      if (usedQids.size > 0) {
        const usedArray = Array.from(usedQids);
        query = query.not('qid', 'in', `(${usedArray.join(',')})`);
      }

      const { data: availableQuestions } = await query;
      let finalQuestions = availableQuestions || [];

      if (finalQuestions.length < 5) {
        const { data: allQuestions } = await supabase
          .from('quiz_questions')
          .select('qid,question,option_a,option_b,option_c,option_d,prepare_link')
          .eq('active', true);
        finalQuestions = allQuestions || [];
      }

      // ✅ Fisher-Yates instead of biased sort
      const selectedQuestions = shuffleArray(finalQuestions).slice(0, 5);

      const progressRecords = selectedQuestions.map(q => ({
        user_id: uid,
        question_id: q.qid,
        asked_date: today,
        answered: false,
      }));

      await supabase.from('user_quiz_progress').insert(progressRecords);

      return { success: true, submitted: false, earn: selectedQuestions, score: 0 };
    } catch (error) {
      console.error('Quiz Fetch Error:', error);
      return (await workerGet<any>('/api/user/earn')) ?? { success: false, earn: [] };
    }
  },

  async getSuperQuestions(uid: string) {
    try {
      const week = getWeekKey();
      const supabase = getSupabase();
      const { data: existing } = await supabase
        .from('super_submissions')
        .select('correct_count,answers')
        .eq('user_id', uid)
        .eq('week', week)
        .maybeSingle();

      if (existing) {
        return { success: true, submitted: true, correct_count: existing.correct_count ?? 0, selections: existing.answers, questions: [] };
      }

      const { data: questions } = await supabase
        .from('super_questions')
        .select('qid,question,option_a,option_b,option_c,option_d,prepare_link')
        .eq('week', week)
        .eq('active', true);

      return { success: true, submitted: false, questions: questions ?? [] };
    } catch (error) {
      return (await workerGet<any>('/api/user/super-questions')) ?? { success: false, questions: [] };
    }
  },

  // ✅ All 3 leaderboards now use shared buildLeaderboard helper
  getWeeklyLeaderboard: async () => {
    try {
      const weekKey = getWeekKey(); // ✅ was duplicating getWeekNumber logic
      const data = await buildLeaderboard('current_week_score', 'week_key', weekKey);
      return { success: true, data, weekKey };
    } catch {
      return { success: false, data: [] };
    }
  },

  getMonthlyLeaderboard: async () => {
    try {
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const data = await buildLeaderboard('current_month_score', 'month_key', monthKey);
      return { success: true, data, monthKey };
    } catch {
      return { success: false, data: [] };
    }
  },

  getAllTimeLeaderboard: async () => {
    try {
      const data = await buildLeaderboard('all_time_score');
      return { success: true, data };
    } catch {
      return { success: false, data: [] };
    }
  },

  getUserRanks: async (userId: string) => {
    try {
      const supabase = getSupabase();

      // ✅ .maybeSingle() instead of .single() — won't throw if no row
      const { data: user } = await supabase
        .from('leaderboard')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!user) return null;

      const [{ count: weeklyRank }, { count: monthlyRank }, { count: allTimeRank }] = await Promise.all([
        supabase.from('leaderboard').select('user_id', { count: 'exact', head: true })
          .eq('week_key', user.week_key).gt('current_week_score', user.current_week_score),
        supabase.from('leaderboard').select('user_id', { count: 'exact', head: true })
          .eq('month_key', user.month_key).gt('current_month_score', user.current_month_score),
        supabase.from('leaderboard').select('user_id', { count: 'exact', head: true })
          .gt('all_time_score', user.all_time_score),
      ]);

      return {
        weekly:  { rank: (weeklyRank  || 0) + 1, score: user.current_week_score },
        monthly: { rank: (monthlyRank || 0) + 1, score: user.current_month_score },
        allTime: { rank: (allTimeRank || 0) + 1, score: user.all_time_score },
      };
    } catch {
      return null;
    }
  },

  getQuizAnswers: async () => workerGet<any>('/api/user/quiz-answers'),

  async getRewards(uid?: string) {
    try {
      const supabase = getSupabase();
      const [rwResult, uResult] = await Promise.all([
        supabase.from('rewards').select('*').eq('active', true),
        uid
          ? supabase.from('user_profiles').select('points,stamps').eq('user_id', uid).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);
      if (!rwResult.error && rwResult.data) {
        const userPts    = uResult.data?.points  ?? 0;
        const userStamps = uResult.data?.stamps ?? 0;
        return {
          success: true,
          rewards: rwResult.data.map((r: any) => ({
            ...r,
            canAfford: userPts >= r.cost_points && userStamps >= r.cost_stamps,
          })),
          userPoints: userPts,
          userStamps,
        };
      }
    } catch { /* fallback */ }
    return (await workerGet<any>('/api/user/rewards')) ?? { success: false, rewards: [], userPoints: 0, userStamps: 0 };
  },

  async getRedeemHistory(uid: string) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('reward_claims')
        .select('reward_name, points_used, stamps_used, status, created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(50);
      if (!error && data) return { success: true, history: data };
    } catch { /* fallback */ }
    return (await workerGet<any>('/api/user/redeem-history')) ?? { success: true, history: [] };
  },

  async getFullHistory(uid: string) {
    try {
      const supabase = getSupabase();
      const [quiz, purchases, points] = await Promise.all([
        supabase.from('quiz_submissions').select('quiz_date,score,created_at').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('purchases').select('invoice_id,item,amount,points,stamp,created_at').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('points_log').select('points,reason,created_at').eq('user_id', uid).order('created_at', { ascending: false }),
      ]);
      if (!quiz.error) return { success: true, quiz: quiz.data ?? [], purchases: purchases.data ?? [], points: points.data ?? [] };
    } catch { /* fallback */ }
    return (await workerGet<any>('/api/user/full-history')) ?? { success: false, quiz: [], purchases: [], points: [] };
  },

  getReferralStats: () => workerGet<any>('/api/user/referral-stats'),

  redeemReward:    (rewardId: string)                => workerPost<any>('/api/user/redeem-reward',   { rewardId }),
  redeemCode:      (code: string, week: string)      => workerPost<any>('/api/user/redeem-code',     { code, week }),
  redeemReferral:  (code: string)                    => workerPost<any>('/api/user/redeem-referral', { code }),
  freeSpin:        (points: number)                  => workerPost<any>('/api/user/free-spin',       { points }),
  recordSpin:      (type: string, points: number)    => workerPost<any>('/api/user/record-spin',     { type, points }),
  claimStreak:     ()                                => workerPost<any>('/api/user/claim-streak',    {}),
  submitQuiz:      (selections: unknown)             => workerPost<any>('/api/user/submit-quiz',     { selections }),
  submitSuperQuiz: (selections: unknown)             => workerPost<any>('/api/user/submit-super-quiz', { selections }),
  updateProfile:   (data: Record<string, unknown>)   => workerPost<any>('/api/user/update',          data),
};