import React, { createContext, useContext, useState, useEffect } from 'react';
import { CONFIG } from '../config';
import { API, UserProfile } from '../services/api';
import { getSupabase } from '../lib/supabase';

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

  // Fetch user profile from Supabase using user_id
  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
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

      if (data) {
        return data as UserProfile;
      }
      return null;
    } catch (err) {
      console.error('Fetch profile error:', err);
      return null;
    }
  };

  const checkAuth = async () => {
    try {
      // First check auth status from worker
      const response = await fetch(`${CONFIG.WORKER_URL}/api/auth/status`, {
        credentials: "include",
        headers: { 
          "X-Client-Host": window.location.host,
          "Content-Type": "application/json"
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.authenticated && data.user_id) {
          // Fetch full profile from Supabase using user_id
          const profile = await fetchUserProfile(data.user_id);
          
          if (profile) {
            setUser({
              user_id: data.user_id,
              role: data.role || 'user',
              name: profile.name || data.user_id,
              email: profile.email || '',
              phone: profile.phone || '',
              address: profile.address || '',
              profile_image: profile.profile_image || '',
              points: profile.points || 0,
              stamps: profile.stamps || 0,
              created_at: profile.created_at || '',
            });
          } else {
            // If no profile found, set basic user info
            setUser({
              user_id: data.user_id,
              role: data.role || 'user',
              name: data.user_id,
              email: '',
              phone: '',
              address: '',
              profile_image: '',
              points: 0,
              stamps: 0,
              created_at: '',
            });
          }
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Auth check error:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user?.user_id) {
      const profile = await fetchUserProfile(user.user_id);
      if (profile) {
        setUser(prev => prev ? { ...prev, ...profile } : null);
      }
    }
  };

  const login = () => {
    window.location.href = `${CONFIG.MAIN_SITE}#login`;
  };

  const logout = async () => {
    try {
      // Logout from Supabase
      const supabase = getSupabase();
      await supabase.auth.signOut();
      
      // Logout from worker
      await fetch(`${CONFIG.WORKER_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Host': window.location.host
        }
      });
      
      setUser(null);
      window.location.href = CONFIG.MAIN_SITE;
    } catch (err) {
      console.error("Logout error:", err);
      window.location.href = CONFIG.MAIN_SITE;
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshProfile }}>
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