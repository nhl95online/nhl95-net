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

export function AuthProvider({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export function useAuth(): AuthContextType {
  return {
    user: null,
    session: null,
    profile: null,
    isLoading: false,
    isLoggedIn: false,
    isAdmin: false,
    adminPasscode: null,
    signInWithPassword: async () => ({ error: null }),
    signUp: async () => ({ error: null, user: null }),
    signInAsAdmin: async () => ({ success: true }),
    signOut: async () => { },
    resetPassword: async () => ({ error: null })
  };
}
