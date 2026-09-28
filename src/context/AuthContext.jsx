import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId, currentUser = null) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching profile:', error.message);
      }
      
      if (data) {
        // Normalize name & batch properties without generic fallbacks
        const fullName = data.full_name || data.name || currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name || '';
        const firstName = data.name && data.name !== 'Student' && data.name !== 'User'
          ? data.name
          : (fullName ? fullName.split(' ')[0] : 'User');

        const normalized = {
          ...data,
          name: firstName,
          full_name: fullName || firstName,
          batch: data.batch || data.batch_year || '2024–2028',
          batch_year: data.batch_year || data.batch || '2024–2028',
        };
        setProfile(normalized);
        return normalized;
      }

      if (!data && currentUser) {
        // Self-heal: profile row missing in public.profiles. Insert it from auth user metadata.
        const meta = currentUser.user_metadata || {};
        const rawFullName = meta.full_name || meta.name || currentUser.email?.split('@')[0] || '';
        const fullName = rawFullName.trim();
        const firstName = fullName.split(' ')[0] || fullName || 'User';
        const regNo = (meta.reg_no || '').toUpperCase().trim();
        const role = meta.role || 'student';

        const healPayload = {
          id: userId,
          email: currentUser.email,
          name: firstName,
          full_name: fullName || firstName,
          reg_no: regNo || (role === 'student' ? 'RA2411003010979' : 'FAC-COORD'),
          role: role,
          department: role === 'student' ? (meta.department || 'CSE Core') : 'Faculty',
          section: meta.section ? String(meta.section).replace(/^Section\s*/i, '') : 'P1',
          batch: '2024 - 2028',
          batch_year: '2024 - 2028',
        };

        try {
          const { data: healedData, error: healErr } = await supabase
            .from('profiles')
            .insert(healPayload)
            .select();

          if (!healErr && healedData && healedData[0]) {
            const normalized = {
              ...healedData[0],
              name: healedData[0].name || firstName,
              full_name: healedData[0].full_name || fullName,
              batch: healedData[0].batch || '2024–2028',
              batch_year: healedData[0].batch_year || '2024–2028',
            };
            setProfile(normalized);
            return normalized;
          }
        } catch (hErr) {
          console.warn('Profile self-healing notice:', hErr);
        }

        const fallbackProfile = {
          id: userId,
          email: currentUser.email,
          name: firstName,
          full_name: fullName || firstName,
          reg_no: regNo,
          role: role,
          department: meta.department || 'CSE Core',
          programme: role === 'student' ? 'B.Tech' : 'Faculty',
          section: meta.section || 'P1',
          batch: '2024–2028',
          batch_year: '2024–2028',
        };
        setProfile(fallbackProfile);
        return fallbackProfile;
      }

      return null;
    } catch (err) {
      console.warn('Profile fetch exception:', err);
      return null;
    }
  }, []);

  const handleAuthenticatedUser = useCallback(async (currentUser) => {
    if (!currentUser) {
      setUser(null);
      setProfile(null);
      return;
    }

    setUser(currentUser);
    await fetchProfile(currentUser.id, currentUser);
  }, [fetchProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      if (currentUser) {
        await handleAuthenticatedUser(currentUser);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      const currentUser = session?.user ?? null;
      if (currentUser) {
        await handleAuthenticatedUser(currentUser);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [handleAuthenticatedUser]);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user?.id) {
      return await fetchProfile(user.id);
    }
    return null;
  };

  const updateProfileState = useCallback((updates) => {
    setProfile((prev) => {
      if (!prev) return updates;
      return { ...prev, ...updates };
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signOut,
        refreshProfile,
        updateProfileState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
