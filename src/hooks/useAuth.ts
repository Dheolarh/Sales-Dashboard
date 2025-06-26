import { useState, useEffect } from 'react';
import { supabase, type Admin } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  admin: Admin | null;
  loading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    admin: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setAuthState(prev => ({ ...prev, session, loading: !session }));

      if (session) {
        const { data: adminProfile } = await supabase
          .from('admins')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setAuthState(prev => ({ ...prev, admin: adminProfile as Admin, loading: false }));
      }
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setAuthState(prev => ({ ...prev, session, loading: true }));
        if (session) {
          const { data: adminProfile } = await supabase
            .from('admins')
            .select('*')
            .eq('id', session.user.id)
            .single();
          setAuthState(prev => ({ ...prev, admin: adminProfile as Admin, loading: false }));
        } else {
          setAuthState(prev => ({ ...prev, admin: null, loading: false }));
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Use a more user-friendly error message
      const errorMessage = error.message === 'Invalid login credentials' 
        ? 'Invalid email or password. Please try again.' 
        : error.message;
      setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }));
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    setAuthState(prev => ({...prev, loading: true}));
    await supabase.auth.signOut();
    setAuthState({ session: null, admin: null, loading: false, error: null });
  };

  return {
    ...authState,
    login,
    logout
  };
};