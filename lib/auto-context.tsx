"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface UserProfile {
  coach_name?: string;
  team_name?: string;
  team_id?: number | string;
  role?: string;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
    metadata?: { coachName?: string; teamId?: number | string; teamName?: string }
  ) => Promise<{ error: AuthError | null; user: User | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const extractProfileFromUser = (currentUser: User | null): UserProfile | null => {
    if (!currentUser) return null;
    const meta = currentUser.user_metadata || {};
    return {
      coach_name: meta.coach_name || meta.coachName || currentUser.email?.split('@')[0] || 'Coach',
      team_name: meta.team_name || meta.teamName || '',
      team_id: meta.team_id || meta.teamId || '',
      role: meta.role || 'Player'
    };
  };

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn("Error fetching Supabase session:", error);
        }
        if (isMounted) {
          setSession(initialSession);
          setUser(initialSession?.user || null);
          setProfile(extractProfileFromUser(initialSession?.user || null));
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Auth init exception:", err);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (isMounted) {
        setSession(currentSession);
        setUser(currentSession?.user || null);
        setProfile(extractProfileFromUser(currentSession?.user || null));
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signInWithPassword = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });

      if (error) {
        return { error };
      }

      setSession(data.session);
      setUser(data.user);
      setProfile(extractProfileFromUser(data.user));
      return { error: null };
    } catch (err: any) {
      return { error: err as AuthError };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    metadata?: { coachName?: string; teamId?: number | string; teamName?: string }
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            coach_name: metadata?.coachName?.trim() || email.split('@')[0],
            team_id: metadata?.teamId || null,
            team_name: metadata?.teamName || null,
            role: 'Player'
          }
        }
      });

      if (error) {
        return { error, user: null };
      }

      if (data.session) {
        setSession(data.session);
        setUser(data.user);
        setProfile(extractProfileFromUser(data.user));
      }

      return { error: null, user: data.user };
    } catch (err: any) {
      return { error: err as AuthError, user: null };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Sign out error:", err);
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined
      });
      return { error };
    } catch (err: any) {
      return { error: err as AuthError };
    }
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    isLoading,
    isLoggedIn: Boolean(user),
    signInWithPassword,
    signUp,
    signOut,
    resetPassword
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
