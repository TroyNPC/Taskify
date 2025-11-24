// app/contexts/AuthContext.js  (or wherever your current file is)
import { supabase } from '@/.vscode/supabase'; // keep your existing path if that works in your project
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useContext, useEffect, useState } from 'react';

WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;
    let subscription = null;

    const initializeAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(data?.session ?? null);
        setUser(data?.session?.user ?? null);
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted) {
          setLoading(false);
          setIsInitialized(true);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    // supabase.auth.onAuthStateChange returns an object like { data: { subscription } }
    try {
      const listener = supabase.auth.onAuthStateChange((event, newSession) => {
        console.log('Auth state changed:', event);
        if (!mounted) return;
        setSession(newSession ?? null);
        setUser(newSession?.user ?? null);
        setLoading(false);
      });
      subscription = listener?.data?.subscription ?? null;
    } catch (err) {
      console.warn('Failed to subscribe to auth changes', err);
    }

    return () => {
      mounted = false;
      try {
        subscription?.unsubscribe();
      } catch (e) {
        // ignore
      }
    };
  }, []);

  // Sign in with email/password
  const signIn = async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      // session/user will be set by the onAuthStateChange listener
      return data;
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign up (email + password) and optionally create profile row
  const signUp = async (email, password, fullName) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;

      // If Supabase returns user id immediately, try to upsert a profile
      const userId = data?.user?.id ?? null;
      if (userId && fullName) {
        try {
          // upsert so repeated calls are safe
          await supabase.from('profiles').upsert(
            { id: userId, full_name: fullName },
            { returning: 'minimal' }
          );
        } catch (profileErr) {
          // don't block signup if profile upsert fails; just warn
          console.warn('Profile upsert failed:', profileErr);
        }
      }

      return data;
    } catch (err) {
      console.error('signUp error', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // OAuth sign-in (opens browser)
  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      await supabase.auth.signInWithOAuth({ provider: 'google' });
      // The redirect completes via WebBrowser and onAuthStateChange listener
    } catch (err) {
      console.error('Google signIn error', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInWithFacebook = async () => {
    setLoading(true);
    try {
      await supabase.auth.signInWithOAuth({ provider: 'facebook' });
    } catch (err) {
      console.error('Facebook signIn error', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // Clear local state immediately
      setUser(null);
      setSession(null);
    } catch (err) {
      console.error('signOut error', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    session,
    loading,
    isInitialized,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    signInWithFacebook,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
