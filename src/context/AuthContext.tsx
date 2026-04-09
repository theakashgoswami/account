import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CONFIG } from '../config';
import { setSupabaseToken, getSupabase } from '../lib/supabase';

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
  supabase_uid?: string;
  supabase_token?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch(`${CONFIG.WORKER_URL}/api/auth/status`, {
        credentials: 'include',
        headers: { 'X-Client-Host': window.location.host },
      });

      if (!res.ok) throw new Error('Auth check failed');
      const data = await res.json();

      if (!data.authenticated || !data.user_id) {
        setUser(null);
        setLoading(false);
        return;
      }

      // ✅ Set supabase token BEFORE any Supabase queries so RLS works
      setSupabaseToken(data.supabase_token ?? null);

      // Now query Supabase directly with the authenticated client
      const sb = getSupabase();
      const { data: profile, error } = await sb
        .from('user_profiles')
        .select('*')
        .eq('user_id', data.user_id)
        .maybeSingle();

      setUser({
        user_id: data.user_id,
        role: data.role ?? 'user',
        profile_image: data.profile_image ?? null,
        supabase_uid: data.supabase_uid ?? null,
        supabase_token: data.supabase_token ?? null,
        ...(profile && !error ? profile : {}),
      });
    } catch (err) {
      console.error('Auth error:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user?.user_id) return;
    const sb = getSupabase();
    const { data, error } = await sb
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.user_id)
      .maybeSingle();
    if (!error && data) {
      setUser(prev => prev ? { ...prev, ...data } : null);
    }
  }, [user?.user_id]);

  const login = () => {
    window.location.href = `${CONFIG.MAIN_SITE}#login`;
  };

  const logout = async () => {
    try {
      await fetch(`${CONFIG.WORKER_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-Client-Host': window.location.host },
      });
    } catch { /* ignore */ }
    setUser(null);
    setSupabaseToken(null);
    window.location.href = CONFIG.MAIN_SITE;
  };

  useEffect(() => { checkAuth(); }, [checkAuth]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
