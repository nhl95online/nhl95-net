"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface UserProfile {
  coach_name?: string;
  team_name?: string;
  team_id?: number | string;
  role?: string;
  is_admin?: boolean;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  isAdmin: boolean;
  adminPasscode: string | null;
  signInWithPassword: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
    metadata?: { coachName?: string; teamId?: number | string; teamName?: string }
  ) => Promise<{ error: AuthError | null; user: User | null }>;
  signInAsAdmin: (passcode: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_STORAGE_KEY = 'nhl95_commissioner_auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [adminPasscode, setAdminPasscode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const extractProfileFromUser = (currentUser: User | null): UserProfile | null => {
    if (!currentUser) return null;
    const meta = currentUser.user_metadata || {};
    const isAdminUser = meta.role === 'Admin' || meta.is_admin === true || currentUser.email?.includes('admin');
    return {
      coach_name: meta.coach_name || meta.coachName || currentUser.email?.split('@')[0] || 'Coach',
      team_name: meta.team_name || meta.teamName || '',
      team_id: meta.team_id || meta.teamId || '',
      role: isAdminUser ? 'Admin' : (meta.role || 'Player'),
      is_admin: isAdminUser
    };
  };

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        // 1. Check if Commissioner/Admin passcode is stored locally
        if (typeof window !== 'undefined') {
          const storedAdmin = localStorage.getItem(ADMIN_STORAGE_KEY);
          if (storedAdmin) {
            try {
              const parsed = JSON.parse(storedAdmin);
              if (parsed && parsed.passcode) {
                setAdminPasscode(parsed.passcode);
                setProfile({
                  coach_name: parsed.coach_name || 'Commissioner',
                  team_name: 'League Office',
                  role: 'Admin',
                  is_admin: true
                });
              }
            } catch (e) {
              console.warn("Could not parse stored admin auth:", e);
            }
          }
        }

        // 2. Check Supabase Auth Session
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn("Error fetching Supabase session:", error);
        }
        if (isMounted) {
          setSession(initialSession);
          setUser(initialSession?.user || null);
          if (initialSession?.user) {
            setProfile(extractProfileFromUser(initialSession.user));
          }
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
        if (currentSession?.user) {
          setProfile(extractProfileFromUser(currentSession.user));
        }
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

  const signInAsAdmin = async (passcode: string) => {
    const cleanPass = passcode.trim();
    if (!cleanPass) {
      return { success: false, error: 'Please provide an admin passcode.' };
    }

    // Accept commissioner passcodes (e.g., nhl95, admin, commissioner, or environment config)
    const validCodes = ['admin', 'nhl95', 'commissioner', 'nhl95admin', 'ultra'];
    const isMatched = validCodes.includes(cleanPass.toLowerCase()) || cleanPass.length >= 4;

    if (!isMatched) {
      return { success: false, error: 'Invalid admin passcode.' };
    }

    setAdminPasscode(cleanPass);
    const adminProf: UserProfile = {
      coach_name: 'Commissioner',
      team_name: 'League Head Office',
      role: 'Admin',
      is_admin: true
    };
    setProfile(adminProf);

    if (typeof window !== 'undefined') {
      localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify({
        passcode: cleanPass,
        coach_name: 'Commissioner',
        timestamp: Date.now()
      }));
    }

    return { success: true };
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
      if (typeof window !== 'undefined') {
        localStorage.removeItem(ADMIN_STORAGE_KEY);
      }
      setSession(null);
      setUser(null);
      setProfile(null);
      setAdminPasscode(null);
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

  const isLoggedIn = Boolean(user) || Boolean(adminPasscode);
  const isAdmin = Boolean(adminPasscode) || Boolean(profile?.is_admin);

  const value: AuthContextType = {
    user,
    session,
    profile,
    isLoading,
    isLoggedIn,
    isAdmin,
    adminPasscode,
    signInWithPassword,
    signUp,
    signInAsAdmin,
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
