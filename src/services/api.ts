import { CONFIG } from '../config';
import { getSupabaseClient } from '../lib/SupabaseClient';


// 🔥 SAFE AUTH HANDLER (no breaking)
export function handleAuthFailSafe() {
  console.warn("Auth failed → clearing session");
  window.dispatchEvent(new CustomEvent('auth:unauthorized'));
}

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

let _supabaseToken: string | null = null;

export function setSupabaseToken(token: string | null) {
  _supabaseToken = token;

  if (typeof window === 'undefined') return;

  if (token) {
    window.localStorage.setItem('agtech-worker-supabase-token', token);
  } else {
    window.localStorage.removeItem('agtech-worker-supabase-token');
  }
}

async function safeFetch<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    console.error("API crash:", e);
    return null;
  }
}

async function safeQuery<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (e) {
    console.error("DB error:", e);
    return null;
  }
}
function unwrapSafe<T>(res: any): T | null {
  if (!res) return null;
  if (res.data) return res.data;
  return res;
}
// ─── Auth Token (for Worker calls) ───────────────────────────────────────────

async function getAuthToken(): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getSession();

    if (!error && data.session?.access_token) {
      const token = data.session.access_token;
      setSupabaseToken(token);
      return token;
    }

    if (_supabaseToken) return _supabaseToken;
    return typeof window !== 'undefined'
      ? window.localStorage.getItem('agtech-worker-supabase-token')
      : null;
  } catch (error) {
    console.error('Token error:', error);
    if (_supabaseToken) return _supabaseToken;
    return typeof window !== 'undefined'
      ? window.localStorage.getItem('agtech-worker-supabase-token')
      : null;
  }
}

async function hasNativeSupabaseSession(): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getSession();
    return !error && !!data.session?.access_token;
  } catch {
    return false;
  }
}

// ─── Worker Helpers ───────────────────────────────────────────────────────────

function handle401() {
  // Clear token on auth failure
  setSupabaseToken(null);
  window.dispatchEvent(new CustomEvent('auth:unauthorized'));
}

async function workerGet<T>(path: string, retryCount = 0): Promise<T | null> {
  const MAX_RETRIES = 1;
  
  try {
    const token = await getAuthToken();
    if (!token) { 
      console.warn('No auth token for:', path); 
      return null; 
    }

    const res = await fetch(`${CONFIG.WORKER_URL}${path}`, {
      method: 'GET',
      headers: { 
        Authorization: `Bearer ${token}`, 
        'Content-Type': 'application/json', 
        'X-Client-Host': window.location.host 
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
  handleAuthFailSafe();
}
      if (res.status === 401) {
  setSupabaseToken(null);

  const supabase = getSupabaseClient();
  await supabase.auth.refreshSession();

  if (retryCount < MAX_RETRIES) {
    return workerGet<T>(path, retryCount + 1);
  }

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

async function workerPost<T>(path: string, body: Record<string, unknown> = {}, retryCount = 0): Promise<T | { success: false; error: string }> {
  const MAX_RETRIES = 1;
  
  try {
    const token = await getAuthToken();
    if (!token) return { success: false, error: 'Not authenticated' };

    const res = await fetch(`${CONFIG.WORKER_URL}${path}`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`, 
        'Content-Type': 'application/json', 
        'X-Client-Host': window.location.host 
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      if (res.status === 401) {
  _supabaseToken = null;

  // 🔥 force refresh session
  const supabase = getSupabaseClient();
  await supabase.auth.refreshSession();

  if (retryCount < MAX_RETRIES) {
    return workerPost<T>(path, body, retryCount + 1);
  }

  handle401();
}
      
      const text = await res.text();
      let errorMsg = `HTTP ${res.status}`;
      try { 
        errorMsg = JSON.parse(text)?.error ?? errorMsg; 
      } catch { 
        // not JSON 
      }
      return { success: false, error: errorMsg };
    }
    return res.json();
  } catch (error: unknown) {
    console.error('Worker POST error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ─── Date Utilities ───────────────────────────────────────────────────────────

function getTodayIST(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

export function getWeekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const year = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - year.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function daysAgoISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Leaderboard Helper ───────────────────────────────────────────────────────

async function buildLeaderboard(
  scoreField: string,
  filterField?: string,
  filterValue?: string
): Promise<{ user_id: string; score: number; rank: number; name: string; profile_image: string | null }[]> {
  const db = getSupabaseClient(); 
  let query = db.from('leaderboard').select(`user_id, ${scoreField}`).order(scoreField, { ascending: false }).limit(100);
  if (filterField && filterValue) query = query.eq(filterField, filterValue);

  const { data, error } = await query;
  if (error) throw error;

  const leaderboardRows = (data ?? []) as Array<Record<string, any>>;
  const userIds = leaderboardRows.map((row) => row.user_id);
  let users: { user_id: string; name: string; profile_image: string | null }[] = [];

  if (userIds.length > 0) {
    const { data: userData } = await db.from('user_profiles').select('user_id, name, profile_image').in('user_id', userIds);
    users = userData ?? [];
  }

  return leaderboardRows.map((item, idx) => ({
    user_id: item.user_id,
    score: Number(item[scoreField] ?? 0),
    rank: idx + 1,
    name: users.find(u => u.user_id === item.user_id)?.name || item.user_id,
    profile_image: users.find(u => u.user_id === item.user_id)?.profile_image ?? null,
  }));
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const API = {
  async getUserProfile(uid: string) {
    if (!(await hasNativeSupabaseSession())) {
      return (await workerGet<any>('/api/user/profile')) ?? { success: false };
    }
    try {
      const db = getSupabaseClient(); // ✅ Fixed
      const result = await safeQuery(async () => await db.from('user_profiles').select('*').eq('user_id', uid).maybeSingle());
      const data = unwrapSafe<any>(result);
      if (data) return { success: true, ...data };
    } catch { /* fallback */ }
    return (await workerGet<any>('/api/user/profile')) ?? { success: false };
  },

  async getUserStats(uid: string) {
    if (!(await hasNativeSupabaseSession())) {
      return (await workerGet<any>('/api/user/stats')) ?? { success: false, points: 0, stamps: 0 };
    }
    try {
      const db = getSupabaseClient(); // ✅ Fixed
      const result = await safeQuery(async () => await db.from('user_profiles').select('points, stamps').eq('user_id', uid).maybeSingle());
      const data = unwrapSafe<any>(result);
      if (data) return { success: true, points: data.points ?? 0, stamps: data.stamps ?? 0 };
    } catch { /* fallback */ }
    return (await workerGet<any>('/api/user/stats')) ?? { success: false, points: 0, stamps: 0 };
  },

  async getDashboardStats(uid: string): Promise<DashboardStats | null> {
    if (!(await hasNativeSupabaseSession())) {
      return workerGet<DashboardStats>('/api/user/dashboard-stats');
    }
    try {
      const db = getSupabaseClient(); // ✅ Fixed
      const [quiz, purchase, score, referrals] = await Promise.all([
        db.from('quiz_submissions').select('id', { count: 'exact', head: true }).eq('user_id', uid),
        db.from('purchases').select('id', { count: 'exact', head: true }).eq('user_id', uid),
        db.from('leaderboard').select('all_time_score').eq('user_id', uid).maybeSingle(),
        db.from('referrals').select('id', { count: 'exact', head: true }).eq('referrer_id', uid),
      ]);
      return { 
        quizPlayed: quiz.count ?? 0, 
        purchaseCount: purchase.count ?? 0, 
        quizScore: score.data?.all_time_score ?? 0, 
        referralCount: referrals.count ?? 0 
      };
    } catch { 
      return workerGet<DashboardStats>('/api/user/dashboard-stats');
    }
  },
  async getNotifications(): Promise<Notification[]> {
    if (!(await hasNativeSupabaseSession())) {
      const res = await workerGet<{ success: boolean; notifications: Notification[] }>('/api/user/notifications');
      return res?.notifications ?? [];
    }
    try {
      const db = getSupabaseClient();
      const { data, error } = await db.from('notifications').select('*').order('created_at', { ascending: false }).limit(10);
      if (!error && data) return data;
    } catch { /* fallback */ }
    const res = await workerGet<{ success: boolean; notifications: Notification[] }>('/api/user/notifications');
    return res?.notifications ?? [];
  },

  async getSpinStatus(uid: string) {
    if (!(await hasNativeSupabaseSession())) {
      return workerGet<any>('/api/user/spin-status');
    }
    try {
      const today = getTodayIST();
      const week  = getWeekKey();
      const db    = getSupabaseClient();

      // ✅ Super spin alag query — week se check (spin_date se nahi)
      // Daily spins (free, quiz) — aaj ki date se check
      const [{ data: streakData }, { data: dailySpins }, { data: superSpin }] = await Promise.all([
        db.from('streak_records').select('streak,last_date').eq('user_id', uid).maybeSingle(),
        db.from('spin_records').select('type,points').eq('user_id', uid).eq('spin_date', today).in('type', ['free', 'quiz']),
        // ✅ Super spin — week filter (worker bhi yahi karta hai)
        db.from('spin_records').select('points').eq('user_id', uid).eq('type', 'super').eq('week', week).maybeSingle(),
      ]);

      const free = dailySpins?.find((s: any) => s.type === 'free');
      const quiz = dailySpins?.find((s: any) => s.type === 'quiz');

      return {
        success: true,
        streak: streakData?.streak ?? 0,
        streak_claimed: streakData?.last_date === today,
        free_spin_done:  !!free,      free_spin_points:  free?.points  ?? 0,
        quiz_spin_done:  !!quiz,      quiz_spin_points:  quiz?.points  ?? 0,
        super_spin_done: !!superSpin, super_spin_points: superSpin?.points ?? 0,
      };
    } catch { /* fallback */ }
    return workerGet<any>('/api/user/spin-status');
  },

  async getQuizQuestions(uid: string) {
    if (!(await hasNativeSupabaseSession())) {
      return (await workerGet<any>('/api/user/earn')) ?? { success: false, earn: [] };
    }
    try {
      const today = getTodayIST();
      const db = getSupabaseClient();

      const { data: existing } = await db
        .from('quiz_submissions')
        .select('score,answers,questions')
        .eq('user_id', uid)
        .eq('quiz_date', today)
        .maybeSingle();

      if (existing) {
        const questionIds = Array.isArray(existing.questions) ? existing.questions : [];
        const { data: submittedQuestions } = await db
          .from('quiz_questions')
          .select('qid,question,option_a,option_b,option_c,option_d,prepare_link,correct_option')
          .in('qid', questionIds);

        return {
          success: true,
          submitted: true,
          score: existing.score ?? 0,
          selections: existing.answers ?? {},
          earn: submittedQuestions ?? [],
          correctAnswers: (submittedQuestions ?? []).map((q: any) => ({
            qid: q.qid,
            correct_option: q.correct_option,
          })),
        };
      }

      const recentSince = daysAgoISO(7);
      const { data: recentSubmissions } = await db
        .from('quiz_submissions')
        .select('questions')
        .eq('user_id', uid)
        .gte('quiz_date', recentSince);

      const usedQids = new Set(
        (recentSubmissions ?? []).flatMap((row: any) =>
          Array.isArray(row.questions) ? row.questions : []
        )
      );

      const { data: allQuestions } = await db
        .from('quiz_questions')
        .select('qid,question,option_a,option_b,option_c,option_d,prepare_link')
        .eq('active', true);

      const questionPool = allQuestions ?? [];
      const freshPool = questionPool.filter((q: any) => !usedQids.has(q.qid));
      const selectablePool = freshPool.length >= 5 ? freshPool : questionPool;
      const selectedQuestions = shuffleArray(selectablePool).slice(0, Math.min(5, selectablePool.length));

      return { success: true, submitted: false, earn: selectedQuestions, score: 0 };
    } catch (error) {
      console.error('Quiz Fetch Error:', error);
      return (await workerGet<any>('/api/user/earn')) ?? { success: false, earn: [] };
    }
  },

  async getSuperQuestions(uid: string) {
    if (!(await hasNativeSupabaseSession())) {
      return (await workerGet<any>('/api/user/super-questions')) ?? { success: false, questions: [] };
    }
    try {
      const week = getWeekKey();
      const db = getSupabaseClient();
      const { data: existing } = await db.from('super_submissions').select('correct_count,answers').eq('user_id', uid).eq('week', week).maybeSingle();
      if (existing) return { success: true, submitted: true, correct_count: existing.correct_count ?? 0, selections: existing.answers, questions: [] };

      const { data: questions } = await db.from('super_questions').select('qid,question,option_a,option_b,option_c,option_d,prepare_link').eq('week', week).eq('active', true);
      return { success: true, submitted: false, questions: questions ?? [] };
    } catch {
      return (await workerGet<any>('/api/user/super-questions')) ?? { success: false, questions: [] };
    }
  },

  getWeeklyLeaderboard: async () => {
    try { const data = await buildLeaderboard('current_week_score', 'week_key', getWeekKey()); return { success: true, data, weekKey: getWeekKey() }; }
    catch { return { success: false, data: [] }; }
  },

  getMonthlyLeaderboard: async () => {
    try {
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const data = await buildLeaderboard('current_month_score', 'month_key', monthKey);
      return { success: true, data, monthKey };
    } catch { return { success: false, data: [] }; }
  },

  getAllTimeLeaderboard: async () => {
    try { const data = await buildLeaderboard('all_time_score'); return { success: true, data }; }
    catch { return { success: false, data: [] }; }
  },

  getUserRanks: async (userId: string) => {
    try {
      const db = getSupabaseClient();
      const { data: user } = await db.from('leaderboard').select('*').eq('user_id', userId).maybeSingle();
      if (!user) return null;

      const [{ count: weeklyRank }, { count: monthlyRank }, { count: allTimeRank }] = await Promise.all([
        db.from('leaderboard').select('user_id', { count: 'exact', head: true }).eq('week_key', user.week_key).gt('current_week_score', user.current_week_score),
        db.from('leaderboard').select('user_id', { count: 'exact', head: true }).eq('month_key', user.month_key).gt('current_month_score', user.current_month_score),
        db.from('leaderboard').select('user_id', { count: 'exact', head: true }).gt('all_time_score', user.all_time_score),
      ]);

      return {
        weekly:  { rank: (weeklyRank  || 0) + 1, score: user.current_week_score },
        monthly: { rank: (monthlyRank || 0) + 1, score: user.current_month_score },
        allTime: { rank: (allTimeRank || 0) + 1, score: user.all_time_score },
      };
    } catch { return null; }
  },

  getQuizAnswers: () => workerGet<any>('/api/user/quiz-answers'),
  getReferralStats: () => workerGet<any>('/api/user/referral-stats'),

  async getRewards(uid?: string) {
    if (uid && !(await hasNativeSupabaseSession())) {
      return (await workerGet<any>('/api/user/rewards')) ?? { success: false, rewards: [], userPoints: 0, userStamps: 0 };
    }
    try {
      const db = getSupabaseClient();
      const [rwResult, uResult] = await Promise.all([
        db.from('rewards').select('*').eq('active', true),
        uid ? db.from('user_profiles').select('points,stamps').eq('user_id', uid).maybeSingle() : Promise.resolve({ data: null, error: null }),
      ]);
      if (!rwResult.error && rwResult.data) {
        const userPts = uResult.data?.points ?? 0;
        const userStamps = uResult.data?.stamps ?? 0;
        return { success: true, rewards: rwResult.data.map((r: any) => ({ ...r, canAfford: userPts >= r.cost_points && userStamps >= r.cost_stamps })), userPoints: userPts, userStamps };
      }
    } catch { /* fallback */ }
    return (await workerGet<any>('/api/user/rewards')) ?? { success: false, rewards: [], userPoints: 0, userStamps: 0 };
  },

  // ✅ Reward catalogue redemption history (reward_claims table)
  async getRedeemHistory(uid: string) {
    if (!(await hasNativeSupabaseSession())) {
      return (await workerGet<any>('/api/user/redeem-history')) ?? { success: true, history: [] };
    }
    try {
      const db = getSupabaseClient();
      const { data, error } = await db.from('reward_claims')
        .select('reward_name, points_used, stamps_used, status, created_at')
        .eq('user_id', uid).order('created_at', { ascending: false }).limit(50);
      if (!error && data) return { success: true, history: data };
    } catch { /* fallback */ }
    return (await workerGet<any>('/api/user/redeem-history')) ?? { success: true, history: [] };
  },

  // ✅ Code/referral redemption history (redeem_history table) — Claim.tsx ke liye
  async getCodeHistory(uid: string) {
    if (!(await hasNativeSupabaseSession())) {
      return (await workerGet<any>('/api/user/code-history')) ?? { success: true, history: [] };
    }
    try {
      const db = getSupabaseClient();
      const { data, error } = await db.from('redeem_history')
        .select('code, reward_type, reward_value, redeemed_at')
        .eq('user_id', uid).order('redeemed_at', { ascending: false }).limit(50);
      if (!error && data) return { success: true, history: data };
    } catch { /* fallback */ }
    return (await workerGet<any>('/api/user/code-history')) ?? { success: true, history: [] };
  },

  async getFullHistory(uid: string) {
    if (!(await hasNativeSupabaseSession())) {
      return (await workerGet<any>('/api/user/full-history')) ?? { success: false, quiz: [], purchases: [], points: [] };
    }
    try {
      const db = getSupabaseClient();
      const [quiz, purchases, points] = await Promise.all([
        db.from('quiz_submissions').select('quiz_date,score,created_at').eq('user_id', uid).order('created_at', { ascending: false }),
        db.from('purchases').select('invoice_id,item,amount,points,stamp,created_at').eq('user_id', uid).order('created_at', { ascending: false }),
        db.from('points_log').select('points,reason,created_at').eq('user_id', uid).order('created_at', { ascending: false }),
      ]);
      if (!quiz.error) return { success: true, quiz: quiz.data ?? [], purchases: purchases.data ?? [], points: points.data ?? [] };
    } catch { /* fallback */ }
    return (await workerGet<any>('/api/user/full-history')) ?? { success: false, quiz: [], purchases: [], points: [] };
  },

  redeemReward:    (rewardId: string)              => workerPost<any>('/api/user/redeem-reward',     { rewardId }),
  redeemCode:      (code: string, week: string)    => workerPost<any>('/api/user/redeem-code',       { code, week }),
  redeemReferral:  (code: string)                  => workerPost<any>('/api/user/redeem-referral',   { code }),
  freeSpin:        (points: number)                => workerPost<any>('/api/user/free-spin',         { points }),
  recordSpin:      (type: string, points: number)  => workerPost<any>('/api/user/record-spin',       { type, points }),
  claimStreak:     ()                              => workerPost<any>('/api/user/claim-streak',      {}),
  submitQuiz:      (selections: unknown)           => workerPost<any>('/api/user/submit-quiz',       { selections }),
  submitSuperQuiz: (selections: unknown)           => workerPost<any>('/api/user/submit-super-quiz', { selections }),
  updateProfile:   (data: Record<string, unknown>) => workerPost<any>('/api/user/update',            data),
};
