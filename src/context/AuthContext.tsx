// context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase';
import { API } from '../services/api';

interface AuthContextType {
  user: any;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
  login?: () => void;  // ✅ Add optional or implement
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ✅ Use singleton instance
    const supabase = getSupabase();
    
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

const fetchUserProfile = async (supabaseUid: string) => {
  setLoading(true);
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .or(`supabase_uid.eq.${supabaseUid},user_id.eq.${supabaseUid}`)
      .maybeSingle();

    if (data) {
      setUser(data);
    } else {
      // ✅ YAHAN USE HOGA API
      console.warn("Supabase mein profile nahi mili, worker check kar rahe hain...");
      const workerProfile = await API.getDashboardStats(supabaseUid); 
      
      if (workerProfile) {
        setUser(workerProfile);
      } else {
        setUser(null);
      }
    }
  } catch (err) {
    console.error("Auth error:", err);
    setUser(null);
  } finally {
    setLoading(false);
  }
};

  const refreshProfile = async () => {
    if (user?.supabase_uid) {
      await fetchUserProfile(user.supabase_uid);
    }
  };

  const logout = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, refreshProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};