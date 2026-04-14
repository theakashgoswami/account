import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { CONFIG } from '../config';
import { getSupabaseClient, getAuthedSupabaseClient } from '../lib/SupabaseClient';
import { setSupabaseToken, UserProfile } from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Re-check on visibility change at most once every 5 minutes
const AUTH_RECHECK_INTERVAL_MS = 5 * 60 * 1000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]       = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAbortRef    = useRef<AbortController | null>(null);
  const lastAuthCheckRef   = useRef<number>(0);

  // ─── Fetch profile directly from Supabase ──────────────────────────────────
  // Uses the worker-issued Supabase JWT (or native session) — no extra worker hop.
  const fetchUserProfile = useCallback(
    async (userId: string, supabaseToken?: string): Promise<UserProfile | null> => {
      try {
        // Prefer an explicit token if provided (worker-issued Supabase JWT)
        const db = supabaseToken
          ? getAuthedSupabaseClient(supabaseToken)
          : getSupabaseClient();

        const { data, error } = await db
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          console.error('Profile fetch error:', error.message);
          return null;
        }
        return (data as UserProfile) ?? null;
      } catch (err) {
        console.error('fetchUserProfile crash:', err);
        return null;
      }
    },
    []
  );

  // ─── Auth check — hits worker once to verify cookie + get Supabase JWT ─────
  // After the first call, the Supabase JWT is stored in memory/localStorage
  // and all subsequent data reads go directly to Supabase (via api.ts → getDB()).
  const checkAuth = useCallback(
    async (signal?: AbortSignal, { force = false } = {}) => {
      const now = Date.now();
      if (!force && now - lastAuthCheckRef.current < AUTH_RECHECK_INTERVAL_MS) return;

      try {
        const res = await fetch(`${CONFIG.WORKER_URL}/api/auth/status`, {
          credentials: 'include',
          signal,
          headers: {
            'X-Client-Host': window.location.host,
            'Content-Type': 'application/json',
          },
        });

        if (signal?.aborted) return;
        lastAuthCheckRef.current = Date.now();

        if (!res.ok) {
          setSupabaseToken(null);
          setUser(null);
          return;
        }

        const data = await res.json();

        if (!data.authenticated || !data.user_id) {
          setSupabaseToken(null);
          setUser(null);
          return;
        }

        // Store Supabase JWT — this enables all subsequent reads to bypass the worker
        if (data.supabase_token) setSupabaseToken(data.supabase_token);

        // Fetch full profile directly from Supabase (zero extra worker cost)
        const profile = await fetchUserProfile(data.user_id, data.supabase_token ?? undefined);

        if (signal?.aborted) return;

        setUser({
          user_id:       data.user_id,
          role:          data.role || 'user',
          name:          profile?.name          || data.user_id,
          email:         profile?.email         || '',
          phone:         profile?.phone         || '',
          address:       profile?.address       || '',
          profile_image: profile?.profile_image || data.profile_image || '',
          points:        profile?.points        ?? 0,
          stamps:        profile?.stamps        ?? 0,
          created_at:    profile?.created_at    || '',
        });
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        console.error('Auth check error:', err);
        setUser(null);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [fetchUserProfile]
  );

  // ─── Refresh profile in-place (no auth re-check) ──────────────────────────
  const refreshProfile = useCallback(async () => {
    setUser(currentUser => {
      if (!currentUser?.user_id) return currentUser;

      refreshAbortRef.current?.abort();
      refreshAbortRef.current = new AbortController();

      fetchUserProfile(currentUser.user_id).then(profile => {
        if (profile && !refreshAbortRef.current?.signal.aborted) {
          setUser(prev => (prev ? { ...prev, ...profile } : null));
        }
      });

      return currentUser; // Return current state synchronously; async update follows
    });
  }, [fetchUserProfile]);

  // ─── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    // Clear client-side state immediately so UI feels instant
    setSupabaseToken(null);
    lastAuthCheckRef.current = 0;
    setUser(null);

    // Clear all localStorage tokens
    [
      'sb-auth-token', 'supabase.auth.token',
      'agtech-auth', 'agtech-worker-supabase-token',
    ].forEach(k => { try { localStorage.removeItem(k); } catch (_) {} });
    try { sessionStorage.clear(); } catch (_) {}

    // Clear cookie client-side (belt-and-suspenders)
    const exp = 'Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = `auth_token=; expires=${exp}; path=/; domain=.agtechscript.in; Secure; SameSite=None`;
    document.cookie = `auth_token=; expires=${exp}; path=/; domain=${window.location.hostname}; Secure; SameSite=None`;
    document.cookie = `auth_token=; expires=${exp}; path=/`;

    // Sign out Supabase native session (OAuth users) — non-critical, fire-and-forget
    try {
      const supabase = getSupabaseClient();
      supabase.auth.signOut({ scope: 'global' }).catch(() => {});
    } catch (_) {}

    // Redirect to the worker's /logout page — this is served from api.agtechscript.in
    // which is the SAME domain the HttpOnly cookie was set on, guaranteeing it gets cleared.
    // The page also calls /api/auth/logout before redirecting to main site login.
    const returnTo = encodeURIComponent(`${CONFIG.MAIN_SITE}#login`);
    window.location.href = `${CONFIG.WORKER_URL}/logout?redirect=${returnTo}`;
  }, []);

  // ─── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    checkAuth(controller.signal, { force: true });
    return () => controller.abort();
  }, [checkAuth]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') checkAuth(); // cooldown guards the worker call
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [checkAuth]);

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
