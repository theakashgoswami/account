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

// ── helpers ─────────────────────────────────────────────────────────
async function workerGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${CONFIG.WORKER_URL}${path}`, {
      credentials: 'include',
      headers: { 'X-Client-Host': window.location.host },
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

async function workerPost<T>(path: string, body: any = {}): Promise<{ success: boolean; error?: string } & T> {
  try {
    const res = await fetch(`${CONFIG.WORKER_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Host': window.location.host,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || `HTTP ${res.status}`, ...data };
    return data;
  } catch (e: any) {
    return { success: false, error: e.message } as any;
  }
}

// ── API ──────────────────────────────────────────────────────────────
export const API = {

  // ── READ (Supabase direct — always query by user_id) ────────────

  async getUserProfile(uid: string) {
    try {
      const { data, error } = await getSupabase()
        .from('user_profiles')
        .select('*')
        .eq('user_id', uid)   // ← user_id, NOT supabase_uid
        .maybeSingle();
      if (!error && data) return { success: true, ...data };
    } catch { /* fallback */ }
    return (await workerGet<any>('/api/user/profile')) ?? { success: false };
  },

  async getUserStats(uid: string) {
    try {
      const { data, error } = await getSupabase()
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
      const sb = getSupabase();
      const [quiz, purchase, score, referrals] = await Promise.all([
        sb.from('quiz_submissions').select('id', { count: 'exact', head: true }).eq('user_id', uid),
        sb.from('purchases').select('id', { count: 'exact', head: true }).eq('user_id', uid),
        sb.from('leaderboard').select('score').eq('user_id', uid).maybeSingle(),
        sb.from('referrals').select('id', { count: 'exact', head: true }).eq('referrer_id', uid),
      ]);
      return {
        quizPlayed:    quiz.count      ?? 0,
        purchaseCount: purchase.count  ?? 0,
        quizScore:     score.data?.score ?? 0,
        referralCount: referrals.count ?? 0,
      };
    } catch { /* fallback */ }
    return workerGet<DashboardStats>('/api/user/dashboard-stats');
  },

  async getNotifications(): Promise<Notification[]> {
    try {
      const { data, error } = await getSupabase()
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (!error && data) return data;
    } catch { /* fallback */ }
    const res = await workerGet<{ success: boolean; notifications: Notification[] }>('/api/user/notifications');
    return res?.notifications ?? [];
  },

  async getSpinStatus(uid: string) {
    try {
      const today = getTodayIST();
      const sb = getSupabase();
      const [{ data: streakData }, { data: spinData }] = await Promise.all([
        sb.from('streak_records').select('streak,last_date').eq('user_id', uid).maybeSingle(),
        sb.from('spin_records').select('type,points').eq('user_id', uid).eq('spin_date', today),
      ]);
      const free  = spinData?.find((s: any) => s.type === 'free');
      const quiz  = spinData?.find((s: any) => s.type === 'quiz');
      const sup   = spinData?.find((s: any) => s.type === 'super');
      return {
        success: true,
        streak:            streakData?.streak ?? 0,
        streak_claimed:    streakData?.last_date === today,
        free_spin_done:    !!free,  free_spin_points:  free?.points  ?? 0,
        quiz_spin_done:    !!quiz,  quiz_spin_points:  quiz?.points  ?? 0,
        super_spin_done:   !!sup,   super_spin_points: sup?.points   ?? 0,
      };
    } catch { /* fallback */ }
    return workerGet<any>('/api/user/spin-status');
  },

  async getQuizQuestions(uid: string) {
    try {
      const today = getTodayIST();
      const sb = getSupabase();
      const { data: existing } = await sb
        .from('quiz_submissions')
        .select('score,answers,questions')
        .eq('user_id', uid)
        .eq('quiz_date', today)
        .maybeSingle();
      if (existing) {
        return { success: true, submitted: true, score: existing.score ?? 0, selections: existing.answers, earn: [] };
      }
      const { data: allQ } = await sb
        .from('quiz_questions')
        .select('qid,question,option_a,option_b,option_c,option_d,prepare_link')
        .eq('active', true);
      if (allQ && allQ.length >= 5) {
        return { success: true, submitted: false, earn: [...allQ].sort(() => Math.random() - .5).slice(0, 5), score: 0 };
      }
    } catch { /* fallback */ }
    return workerGet<any>('/api/user/earn');
  },

  async getSuperQuestions(uid: string) {
    try {
      const week = getWeekKey();
      const sb = getSupabase();
      const { data: existing } = await sb
        .from('super_submissions')
        .select('correct_count,answers')
        .eq('user_id', uid)
        .eq('week', week)
        .maybeSingle();
      if (existing) return { success: true, submitted: true, correct_count: existing.correct_count ?? 0, selections: existing.answers, questions: [] };
      const { data: questions } = await sb
        .from('super_questions')
        .select('qid,question,option_a,option_b,option_c,option_d,prepare_link')
        .eq('week', week).eq('active', true);
      return { success: true, submitted: false, questions: questions ?? [] };
    } catch { /* fallback */ }
    return workerGet<any>('/api/user/super-questions');
  },

  async getRewards(uid?: string) {
    try {
      const sb = getSupabase();
      const [rwResult, uResult] = await Promise.all([
        sb.from('rewards').select('*').eq('active', true),
        uid ? sb.from('user_profiles').select('points,stamps').eq('user_id', uid).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
      ]);
      if (!rwResult.error && rwResult.data) {
        const userPts = uResult.data?.points ?? 0;
        const userStamps = uResult.data?.stamps ?? 0;
        return {
          success: true,
          rewards: rwResult.data.map((r: any) => ({
            ...r, canAfford: userPts >= r.cost_points && userStamps >= r.cost_stamps,
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
      const { data, error } = await getSupabase()
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
      const sb = getSupabase();
      const [quiz, purchases, points] = await Promise.all([
        sb.from('quiz_submissions').select('quiz_date,score,created_at').eq('user_id', uid).order('created_at', { ascending: false }),
        sb.from('purchases').select('invoice_id,item,amount,points,stamp,created_at').eq('user_id', uid).order('created_at', { ascending: false }),
        sb.from('points_log').select('points,reason,created_at').eq('user_id', uid).order('created_at', { ascending: false }),
      ]);
      if (!quiz.error) return { success: true, quiz: quiz.data ?? [], purchases: purchases.data ?? [], points: points.data ?? [] };
    } catch { /* fallback */ }
    return (await workerGet<any>('/api/user/full-history')) ?? { success: false, quiz: [], purchases: [], points: [] };
  },

  async getLeaderboard() {
    try {
      const { data, error } = await getSupabase()
        .from('leaderboard')
        .select('user_id, score')
        .order('score', { ascending: false })
        .limit(10);
      if (!error && data) return data;
    } catch { /* fallback */ }
    return [];
  },

  async getReferralStats() {
    return workerGet<any>('/api/user/referral-stats');
  },

  // ── WRITE (always worker, cookie-based auth) ─────────────────────

  async redeemReward(rewardId: string)            { return workerPost<any>('/api/user/redeem-reward', { rewardId }); },
  async redeemCode(code: string, week: string)    { return workerPost<any>('/api/user/redeem-code', { code, week }); },
  async redeemReferral(code: string)              { return workerPost<any>('/api/user/redeem-referral', { code }); },
  async freeSpin(points: number)                  { return workerPost<any>('/api/user/free-spin', { points }); },
  async recordSpin(type: string, points: number)  { return workerPost<any>('/api/user/record-spin', { type, points }); },
  async claimStreak()                             { return workerPost<any>('/api/user/claim-streak', {}); },
  async submitQuiz(selections: any)               { return workerPost<any>('/api/user/submit-quiz', { selections }); },
  async submitSuperQuiz(selections: any)          { return workerPost<any>('/api/user/submit-super-quiz', { selections }); },
  async updateProfile(data: any)                  { return workerPost<any>('/api/user/update', data); },
};

// ── date helpers ─────────────────────────────────────────────────────
function getTodayIST(): string {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    .toISOString().slice(0, 10);
}

export function getWeekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const year = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - year.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
