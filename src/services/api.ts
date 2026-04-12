import { SupabaseClient } from '@supabase/supabase-js';
import { CONFIG } from '../config';
import { getSupabaseClient, getAuthedSupabaseClient } from '../lib/SupabaseClient';

// ─── Auth Fail Handler ────────────────────────────────────────────────────────
export function handleAuthFailSafe() {
  console.warn('Auth failed → clearing session');
  window.dispatchEvent(new CustomEvent('auth:unauthorized'));
}

// ─── Interfaces ───────────────────────────────────────────────────────────────
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

// ─── Token Store ──────────────────────────────────────────────────────────────
// Holds the Supabase JWT issued by the worker's /api/auth/status.
// This token has role="authenticated" and is valid for 1 hour.
// It gets refreshed every time auth/status is polled (every 5 min on visibility change).
let _supabaseToken: string | null = null;

export function setSupabaseToken(token: string | null) {
  _supabaseToken = token;
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('agtech-worker-supabase-token', token);
  } else {
    localStorage.removeItem('agtech-worker-supabase-token');
  }
}

// ─── Core DB Helper ───────────────────────────────────────────────────────────
/**
 * Returns an authenticated Supabase client for direct DB reads.
 *
 * Priority:
 *   1. Native Supabase session (OAuth login path)
 *   2. Worker-issued Supabase token (cookie-auth path)
 *   3. null → caller falls back to workerGet()
 *
 * All reads use this. Writes always go through workerPost().
 */
async function getDB(): Promise<SupabaseClient | null> {
  try {
    // 1. Native session (OAuth users, or future setSession support)
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) return supabase;

    // 2. Worker-issued Supabase token (cookie-auth users)
    const token =
      _supabaseToken ??
      (typeof window !== 'undefined'
        ? localStorage.getItem('agtech-worker-supabase-token')
        : null);
    if (token) return getAuthedSupabaseClient(token);

    return null; // No auth → fall back to worker
  } catch {
    return null;
  }
}

// ─── Worker Helpers (fallback + all writes) ───────────────────────────────────
/**
 * Get auth token for worker Authorization header.
 * Worker accepts both Supabase JWTs and custom JWTs.
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getSession();
    if (!error && data.session?.access_token) {
      return data.session.access_token;
    }
  } catch { /* ignore */ }

  return (
    _supabaseToken ??
    (typeof window !== 'undefined'
      ? localStorage.getItem('agtech-worker-supabase-token')
      : null)
  );
}

async function workerGet<T>(path: string, retryCount = 0): Promise<T | null> {
  const MAX_RETRIES = 1;
  try {
    const token = await getAuthToken();
    if (!token) {
      console.warn('workerGet: no auth token for', path);
      return null;
    }
    const res = await fetch(`${CONFIG.WORKER_URL}${path}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Client-Host': window.location.host,
      },
    });
    if (!res.ok) {
      if (res.status === 401) {
        setSupabaseToken(null);
        const supabase = getSupabaseClient();
        await supabase.auth.refreshSession();
        if (retryCount < MAX_RETRIES) return workerGet<T>(path, retryCount + 1);
        handleAuthFailSafe();
      }
      return null;
    }
    return res.json();
  } catch (err) {
    console.error('workerGet error:', err);
    return null;
  }
}

async function workerPost<T>(
  path: string,
  body: Record<string, unknown> = {},
  retryCount = 0
): Promise<T | { success: false; error: string }> {
  const MAX_RETRIES = 1;
  try {
    const token = await getAuthToken();
    if (!token) return { success: false, error: 'Not authenticated' };

    const res = await fetch(`${CONFIG.WORKER_URL}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Client-Host': window.location.host,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      if (res.status === 401) {
        _supabaseToken = null;
        const supabase = getSupabaseClient();
        await supabase.auth.refreshSession();
        if (retryCount < MAX_RETRIES) return workerPost<T>(path, body, retryCount + 1);
        handleAuthFailSafe();
      }
      const text = await res.text();
      let errorMsg = `HTTP ${res.status}`;
      try { errorMsg = JSON.parse(text)?.error ?? errorMsg; } catch { /* not JSON */ }
      return { success: false, error: errorMsg };
    }
    return res.json();
  } catch (err: unknown) {
    console.error('workerPost error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
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
  const db = await getDB();
  if (!db) return [];

  let query = db
    .from('leaderboard')
    .select(`user_id, ${scoreField}`)
    .order(scoreField, { ascending: false })
    .limit(100);
  if (filterField && filterValue) query = (query as any).eq(filterField, filterValue);

  const { data, error } = await query;
  if (error || !data) return [];

  const leaderboardRows = data as Array<Record<string, any>>;
  const userIds = leaderboardRows.map((row) => row.user_id);
  let users: { user_id: string; name: string; profile_image: string | null }[] = [];

  if (userIds.length > 0) {
    const { data: userData } = await db
      .from('user_profiles')
      .select('user_id, name, profile_image')
      .in('user_id', userIds);
    users = userData ?? [];
  }

  return leaderboardRows.map((item, idx) => ({
    user_id: item.user_id,
    score: Number(item[scoreField] ?? 0),
    rank: idx + 1,
    name: users.find((u) => u.user_id === item.user_id)?.name || item.user_id,
    profile_image: users.find((u) => u.user_id === item.user_id)?.profile_image ?? null,
  }));
}

// ═══════════════════════════════════════════════════════════
// API — All reads → direct Supabase. All writes → worker.
// ═══════════════════════════════════════════════════════════
export const API = {

  // ── User Profile ────────────────────────────────────────
  async getUserProfile(uid: string) {
    const db = await getDB();
    if (!db) return (await workerGet<any>('/api/user/profile')) ?? { success: false };
    const { data, error } = await db
      .from('user_profiles')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle();
    if (!error && data) return { success: true, ...data };
    // Fallback to worker
    return (await workerGet<any>('/api/user/profile')) ?? { success: false };
  },

  async getUserStats(uid: string) {
    const db = await getDB();
    if (!db) return (await workerGet<any>('/api/user/stats')) ?? { success: false, points: 0, stamps: 0 };
    const { data, error } = await db
      .from('user_profiles')
      .select('points, stamps')
      .eq('user_id', uid)
      .maybeSingle();
    if (!error && data) return { success: true, points: data.points ?? 0, stamps: data.stamps ?? 0 };
    return (await workerGet<any>('/api/user/stats')) ?? { success: false, points: 0, stamps: 0 };
  },

  // ── Dashboard Stats ─────────────────────────────────────
  async getDashboardStats(uid: string): Promise<DashboardStats | null> {
    const db = await getDB();
    if (!db) return workerGet<DashboardStats>('/api/user/dashboard-stats');
    try {
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
        referralCount: referrals.count ?? 0,
      };
    } catch {
      return workerGet<DashboardStats>('/api/user/dashboard-stats');
    }
  },

  // ── Notifications ───────────────────────────────────────
  async getNotifications(): Promise<Notification[]> {
    const db = await getDB();
    if (!db) {
      const res = await workerGet<{ success: boolean; notifications: Notification[] }>('/api/user/notifications');
      return res?.notifications ?? [];
    }
    const { data, error } = await db
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (!error && data) return data as Notification[];
    const res = await workerGet<{ success: boolean; notifications: Notification[] }>('/api/user/notifications');
    return res?.notifications ?? [];
  },

  // ── Spin Status ─────────────────────────────────────────
  async getSpinStatus(uid: string) {
    const db = await getDB();
    if (!db) return workerGet<any>('/api/user/spin-status');
    try {
      const today = getTodayIST();
      const week = getWeekKey();

      const [{ data: streakData }, { data: dailySpins }, { data: superSpin }] = await Promise.all([
        db.from('streak_records').select('streak,last_date').eq('user_id', uid).maybeSingle(),
        db.from('spin_records')
          .select('type,points')
          .eq('user_id', uid)
          .eq('spin_date', today)
          .in('type', ['free', 'quiz']),
        db.from('spin_records')
          .select('points')
          .eq('user_id', uid)
          .eq('type', 'super')
          .eq('week', week)
          .maybeSingle(),
      ]);

      const free = dailySpins?.find((s: any) => s.type === 'free');
      const quiz = dailySpins?.find((s: any) => s.type === 'quiz');

      return {
        success: true,
        streak: streakData?.streak ?? 0,
        streak_claimed: streakData?.last_date === today,
        free_spin_done: !!free,     free_spin_points: free?.points ?? 0,
        quiz_spin_done: !!quiz,     quiz_spin_points: quiz?.points ?? 0,
        super_spin_done: !!superSpin, super_spin_points: superSpin?.points ?? 0,
      };
    } catch {
      return workerGet<any>('/api/user/spin-status');
    }
  },

  // ── Quiz Questions ──────────────────────────────────────
  async getQuizQuestions(uid: string) {
    const db = await getDB();
    if (!db) return (await workerGet<any>('/api/user/earn')) ?? { success: false, earn: [] };
    try {
      const today = getTodayIST();

      // Check if already submitted today
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

      // Build fresh question set (exclude last 7 days)
      const { data: recentSubmissions } = await db
        .from('quiz_submissions')
        .select('questions')
        .eq('user_id', uid)
        .gte('quiz_date', daysAgoISO(7));

      const usedQids = new Set(
        (recentSubmissions ?? []).flatMap((row: any) =>
          Array.isArray(row.questions) ? row.questions : []
        )
      );

      const { data: allQuestions } = await db
        .from('quiz_questions')
        .select('qid,question,option_a,option_b,option_c,option_d,prepare_link')
        .eq('active', true);

      const pool = allQuestions ?? [];
      const freshPool = pool.filter((q: any) => !usedQids.has(q.qid));
      const selectablePool = freshPool.length >= 5 ? freshPool : pool;
      const selected = shuffleArray(selectablePool).slice(0, Math.min(5, selectablePool.length));

      return { success: true, submitted: false, earn: selected, score: 0 };
    } catch (err) {
      console.error('getQuizQuestions error:', err);
      return (await workerGet<any>('/api/user/earn')) ?? { success: false, earn: [] };
    }
  },

  // ── Super Quiz Questions ─────────────────────────────────
  async getSuperQuestions(uid: string) {
    const db = await getDB();
    if (!db) return (await workerGet<any>('/api/user/super-questions')) ?? { success: false, questions: [] };
    try {
      const week = getWeekKey();

      const { data: existing } = await db
        .from('super_submissions')
        .select('correct_count,answers')
        .eq('user_id', uid)
        .eq('week', week)
        .maybeSingle();

      if (existing) {
        return {
          success: true,
          submitted: true,
          correct_count: existing.correct_count ?? 0,
          selections: existing.answers,
          questions: [],
        };
      }

      const { data: questions } = await db
        .from('super_questions')
        .select('qid,question,option_a,option_b,option_c,option_d,prepare_link')
        .eq('week', week)
        .eq('active', true);

      return { success: true, submitted: false, questions: questions ?? [] };
    } catch {
      return (await workerGet<any>('/api/user/super-questions')) ?? { success: false, questions: [] };
    }
  },

  // ── Rewards ──────────────────────────────────────────────
  async getRewards(uid?: string) {
    const db = await getDB();
    if (!db) return (await workerGet<any>('/api/user/rewards')) ?? { success: false, rewards: [], userPoints: 0, userStamps: 0 };
    try {
      const [rwResult, uResult] = await Promise.all([
        db.from('rewards').select('*').eq('active', true),
        uid
          ? db.from('user_profiles').select('points,stamps').eq('user_id', uid).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);
      if (!rwResult.error && rwResult.data) {
        const userPts = (uResult as any).data?.points ?? 0;
        const userStamps = (uResult as any).data?.stamps ?? 0;
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

  // ── Redeem History (reward_claims) ───────────────────────
  async getRedeemHistory(uid: string) {
    const db = await getDB();
    if (!db) return (await workerGet<any>('/api/user/redeem-history')) ?? { success: true, history: [] };
    const { data, error } = await db
      .from('reward_claims')
      .select('reward_name, points_used, stamps_used, status, created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error && data) return { success: true, history: data };
    return (await workerGet<any>('/api/user/redeem-history')) ?? { success: true, history: [] };
  },

  // ── Code History (redeem_history) ───────────────────────
  async getCodeHistory(uid: string) {
    const db = await getDB();
    if (!db) return (await workerGet<any>('/api/user/code-history')) ?? { success: true, history: [] };
    const { data, error } = await db
      .from('redeem_history')
      .select('code, reward_type, reward_value, redeemed_at')
      .eq('user_id', uid)
      .order('redeemed_at', { ascending: false })
      .limit(50);
    if (!error && data) return { success: true, history: data };
    return (await workerGet<any>('/api/user/code-history')) ?? { success: true, history: [] };
  },

  // ── Full History ─────────────────────────────────────────
  async getFullHistory(uid: string) {
    const db = await getDB();
    if (!db) return (await workerGet<any>('/api/user/full-history')) ?? { success: false, quiz: [], purchases: [], points: [] };
    try {
      const [quiz, purchases, points] = await Promise.all([
        db.from('quiz_submissions').select('quiz_date,score,created_at').eq('user_id', uid).order('created_at', { ascending: false }),
        db.from('purchases').select('invoice_id,item,amount,points,stamp,created_at').eq('user_id', uid).order('created_at', { ascending: false }),
        db.from('points_log').select('points,reason,created_at').eq('user_id', uid).order('created_at', { ascending: false }),
      ]);
      if (!quiz.error) {
        return {
          success: true,
          quiz: quiz.data ?? [],
          purchases: purchases.data ?? [],
          points: points.data ?? [],
        };
      }
    } catch { /* fallback */ }
    return (await workerGet<any>('/api/user/full-history')) ?? { success: false, quiz: [], purchases: [], points: [] };
  },

  // ── Purchases ───────────────────────────────────────────
  async getUserPurchases(uid: string) {
    const db = await getDB();
    if (!db) return (await workerGet<any>('/api/user/purchases')) ?? { success: true, purchases: [] };
    const { data, error } = await db
      .from('purchases')
      .select('invoice_id,item,amount,points,stamp,created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });
    if (!error && data) return { success: true, purchases: data };
    return (await workerGet<any>('/api/user/purchases')) ?? { success: true, purchases: [] };
  },

  // ── Referral Stats ───────────────────────────────────────
  // Note: no uid param — RLS on referrals table auto-filters by current user
  async getReferralStats() {
    const db = await getDB();
    if (!db) return (await workerGet<any>('/api/user/referral-stats')) ?? { success: false };
    try {
      const { data: referrals, error } = await db
        .from('referrals')
        .select('referred_user_id, created_at')
        .order('created_at', { ascending: false });

      if (error || !referrals) throw error;

      const userIds = referrals.map((r: any) => r.referred_user_id);
      let users: any[] = [];

      if (userIds.length > 0) {
        const { data } = await db
          .from('user_profiles')
          .select('user_id, name, created_at')
          .in('user_id', userIds);
        users = data ?? [];
      }

      return {
        success: true,
        count: referrals.length,
        earnings: referrals.length * 2000, // REFERRAL.referrer constant
        referrals: referrals
          .map((r: any) => {
            const u = users.find((u) => u.user_id === r.referred_user_id);
            return u
              ? { user_id: u.user_id, name: u.name ?? u.user_id, joined_at: u.created_at }
              : null;
          })
          .filter(Boolean),
      };
    } catch {
      return (await workerGet<any>('/api/user/referral-stats')) ?? { success: false };
    }
  },

  // ── Leaderboards ─────────────────────────────────────────
  getWeeklyLeaderboard: async () => {
    try {
      const data = await buildLeaderboard('current_week_score', 'week_key', getWeekKey());
      return { success: true, data, weekKey: getWeekKey() };
    } catch { return { success: false, data: [] }; }
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
    try {
      const data = await buildLeaderboard('all_time_score');
      return { success: true, data };
    } catch { return { success: false, data: [] }; }
  },

  getUserRanks: async (userId: string) => {
    try {
      const db = await getDB();
      if (!db) return null;
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

  // ═══════════════════════════════════════════════════════
  // WRITES — All go through worker (authoritative, atomic)
  // ═══════════════════════════════════════════════════════

  // Auth
  // (login/register/otp handled by main site — not here)

  // Profile write
  updateProfile:   (data: Record<string, unknown>) => workerPost<any>('/api/user/update', data),

  // Spin & streak writes
  freeSpin:    (points: number)               => workerPost<any>('/api/user/free-spin',    { points }),
  recordSpin:  (type: string, points: number) => workerPost<any>('/api/user/record-spin',  { type, points }),
  claimStreak: ()                             => workerPost<any>('/api/user/claim-streak', {}),

  // Quiz writes
  submitQuiz:      (selections: unknown)      => workerPost<any>('/api/user/submit-quiz',       { selections }),
  submitSuperQuiz: (selections: unknown)      => workerPost<any>('/api/user/submit-super-quiz', { selections }),

  // Redeem writes
  redeemReward:   (rewardId: string)             => workerPost<any>('/api/user/redeem-reward',   { rewardId }),
  redeemCode:     (code: string, week: string)   => workerPost<any>('/api/user/redeem-code',     { code, week }),
  redeemReferral: (code: string)                 => workerPost<any>('/api/user/redeem-referral', { code }),

  // Image upload — multipart/form-data with auth header
  async uploadProfileImage(file: File): Promise<{ success: boolean; url?: string; error?: string }> {
    const token = await getAuthToken();
    if (!token) return { success: false, error: 'Not authenticated' };

    const fd = new FormData();
    fd.append('file', file);

    try {
      const res = await fetch(`${CONFIG.WORKER_URL}/api/user/upload-image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // ⚠️ Do NOT set Content-Type here — browser sets it with boundary automatically
        },
        body: fd,
      });
      const data = await res.json();
      return data.success
        ? { success: true, url: data.url }
        : { success: false, error: data.error || 'Upload failed' };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Upload failed' };
    }
  },
};
