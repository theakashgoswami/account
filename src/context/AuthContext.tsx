import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { CONFIG } from '../config';
import { UserProfile } from '../services/api';
import { getSupabase } from '../lib/supabase';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAbortRef = useRef<AbortController | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // fetchUserProfile — DO NOT use setSession (empty refresh_token silently
  // rejected by Supabase JS client → falls back to anon → RLS blocks).
  // Instead: pass token directly as Bearer header in a plain fetch call.
  // ─────────────────────────────────────────────────────────────────────────
  const fetchUserProfile = useCallback(
    async (userId: string, accessToken?: string): Promise<UserProfile | null> => {
      try {
        if (accessToken) {
          // ✅ Direct REST — guaranteed to carry the right JWT
          const res = await fetch(
            `${CONFIG.SUPABASE_URL}/rest/v1/user_profiles?select=*&user_id=eq.${userId}`,
            {
              headers: {
                apikey: CONFIG.SUPABASE_ANON_KEY,
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (!res.ok) {
            console.error('Profile fetch failed — status:', res.status);
            return null;
          }

          const rows = await res.json();
          return (rows[0] as UserProfile) ?? null;
        }

        // Fallback for refreshProfile (no token available there)
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          console.error('Supabase fetch error:', error);
          return null;
        }

        return (data as UserProfile) ?? null;
      } catch (err) {
        console.error('Fetch profile error:', err);
        return null;
      }
    },
    []
  );

  // ✅ Accepts AbortSignal to cancel stale requests
  const checkAuth = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await fetch(`${CONFIG.WORKER_URL}/api/auth/status`, {
          credentials: 'include',
          signal,
          headers: {
            'X-Client-Host': window.location.host,
            'Content-Type': 'application/json',
          },
        });

        if (signal?.aborted) return;

        if (response.ok) {
          const data = await response.json();

          if (data.authenticated && data.user_id) {
            // ✅ Token directly pass — no setSession needed
            const profile = await fetchUserProfile(data.user_id, data.supabase_token ?? undefined);

            if (signal?.aborted) return;

            setUser({
              user_id: data.user_id,
              role: data.role || 'user',
              name: profile?.name || data.user_id,
              email: profile?.email || '',
              phone: profile?.phone || '',
              address: profile?.address || '',
              profile_image: profile?.profile_image || data.profile_image || '',
              points: profile?.points || 0,
              stamps: profile?.stamps || 0,
              created_at: profile?.created_at || '',
            });
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
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

  // ✅ Race condition fix — cancels previous call if called again quickly
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

      return currentUser;
    });
  }, [fetchUserProfile]);

  const logout = useCallback(async () => {
    try {
      const supabase = getSupabase();
      await Promise.allSettled([
        supabase.auth.signOut(),
        fetch(`${CONFIG.WORKER_URL}/api/auth/logout`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-Client-Host': window.location.host,
          },
        }),
      ]);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      window.location.href = CONFIG.MAIN_SITE;
    }
  }, []);

  // Initial auth check with cleanup
  useEffect(() => {
    const controller = new AbortController();
    checkAuth(controller.signal);
    return () => controller.abort();
  }, [checkAuth]);

  // Re-check when user comes back to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkAuth();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [checkAuth]);

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};