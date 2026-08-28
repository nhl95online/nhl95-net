"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface CoachUser {
  coach_id: number;
  coach_name: string;
  discord_tag?: string;
  pin?: string;
}

const STORAGE_KEY = 'nhl95_coach_session';
const DEFAULT_LEAGUE_PASSKEY = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'nhl95';

interface CoachAuthContextType {
  isLoggedIn: boolean;
  currentCoach: CoachUser | null;
  coachesList: CoachUser[];
  isLoading: boolean;
  isLoginModalOpen: boolean;
  openLoginModal: (targetContext?: string) => void;
  closeLoginModal: () => void;
  login: (coachNameOrId: string | number, passkey: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updatePin: (coachIdOrName: number | string, currentPinOrMasterKey: string, newPin: string) => Promise<{ success: boolean; error?: string }>;
  loginContext: string | null;
}

const CoachAuthContext = createContext<CoachAuthContextType | undefined>(undefined);

export function CoachAuthProvider({ children }: { children: React.ReactNode }) {
  const [currentCoach, setCurrentCoach] = useState<CoachUser | null>(null);
  const [coachesList, setCoachesList] = useState<CoachUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [loginContext, setLoginContext] = useState<string | null>(null);

  // 1. Fetch live coaches list from Supabase on mount
  useEffect(() => {
    async function fetchCoaches() {
      try {
        const { data, error } = await supabase
          .from('league_coaches')
          .select('coach_id, coach_name, discord_tag, pin')
          .order('coach_name', { ascending: true });

        if (!error && data && data.length > 0) {
          const list: CoachUser[] = data.map((c: any) => ({
            coach_id: Number(c.coach_id),
            coach_name: c.coach_name || `Coach #${c.coach_id}`,
            discord_tag: c.discord_tag || undefined,
            pin: c.pin || undefined
          }));
          setCoachesList(list);
        }
      } catch (err) {
        console.warn("Could not fetch coaches list, using default roster:", err);
      }
    }

    fetchCoaches();
  }, []);

  // 2. Load stored session from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.coach_id && parsed.coach_name) {
          setCurrentCoach(parsed);
        }
      }
    } catch (e) {
      console.warn("Could not load coach session:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openLoginModal = useCallback((targetContext?: string) => {
    if (targetContext) {
      setLoginContext(targetContext);
    }
    setIsLoginModalOpen(true);
  }, []);

  const closeLoginModal = useCallback(() => {
    setIsLoginModalOpen(false);
    setLoginContext(null);
  }, []);

  const login = useCallback(async (
    coachNameOrId: string | number,
    passkey: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanPass = passkey.trim();
    if (!cleanPass) {
      return { success: false, error: 'Please enter your coach passkey or PIN.' };
    }

    const cleanInput = String(coachNameOrId).trim();
    if (!cleanInput) {
      return { success: false, error: 'Please enter your coach name as registered in the league_coaches table.' };
    }

    // 1. Search in local coaches list (case-insensitive)
    let foundCoach = coachesList.find(c =>
      String(c.coach_id) === cleanInput ||
      c.coach_name.trim().toLowerCase() === cleanInput.toLowerCase()
    );

    // 2. If not found in local list, perform a direct Supabase lookup
    if (!foundCoach) {
      try {
        const { data, error } = await supabase
          .from('league_coaches')
          .select('coach_id, coach_name, discord_tag, pin')
          .ilike('coach_name', cleanInput)
          .limit(1);

        if (!error && data && data.length > 0) {
          const c = data[0];
          foundCoach = {
            coach_id: Number(c.coach_id),
            coach_name: c.coach_name,
            discord_tag: c.discord_tag || undefined,
            pin: c.pin || undefined
          };
          setCoachesList(prev => {
            if (prev.some(p => p.coach_id === foundCoach!.coach_id)) return prev;
            return [...prev, foundCoach!].sort((a, b) => a.coach_name.localeCompare(b.coach_name));
          });
        }
      } catch (err) {
        console.warn("Direct coach lookup query failed:", err);
      }
    }

    if (!foundCoach) {
      return { success: false, error: `Coach "${cleanInput}" was not found in the league_coaches table. Please check spelling.` };
    }

    // 3. Validate passkey against master league key or individual coach PIN
    const isMasterValid = cleanPass.toLowerCase() === DEFAULT_LEAGUE_PASSKEY.toLowerCase();
    const isPinValid = Boolean(foundCoach.pin && cleanPass === foundCoach.pin);

    if (!isMasterValid && !isPinValid) {
      return { success: false, error: 'Invalid passkey or PIN. Please check your credentials.' };
    }

    const sessionData: CoachUser = {
      coach_id: foundCoach.coach_id,
      coach_name: foundCoach.coach_name,
      discord_tag: foundCoach.discord_tag
    };

    setCurrentCoach(sessionData);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
    } catch (e) {
      console.warn("Could not save coach session:", e);
    }

    setIsLoginModalOpen(false);
    setLoginContext(null);
    return { success: true };
  }, [coachesList]);

  const logout = useCallback(() => {
    setCurrentCoach(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn("Could not remove coach session:", e);
    }
  }, []);

  const updatePin = useCallback(async (
    coachIdOrName: number | string,
    currentPinOrMasterKey: string,
    newPin: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      let targetCoachId: number | null = null;

      if (typeof coachIdOrName === 'number') {
        targetCoachId = coachIdOrName;
      } else {
        const cleanInput = String(coachIdOrName).trim();
        const found = coachesList.find(c =>
          String(c.coach_id) === cleanInput ||
          c.coach_name.trim().toLowerCase() === cleanInput.toLowerCase()
        );

        if (found) {
          targetCoachId = found.coach_id;
        } else if (!isNaN(Number(cleanInput)) && Number(cleanInput) > 0) {
          targetCoachId = Number(cleanInput);
        } else {
          // Direct lookup in Supabase
          const { data } = await supabase
            .from('league_coaches')
            .select('coach_id')
            .ilike('coach_name', cleanInput)
            .limit(1);

          if (data && data.length > 0) {
            targetCoachId = Number(data[0].coach_id);
          }
        }
      }

      if (!targetCoachId) {
        return { success: false, error: `Coach "${coachIdOrName}" was not found in the league_coaches table.` };
      }

      const res = await fetch('/api/coach/reset-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachId: targetCoachId, currentPinOrMasterKey, newPin })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to update PIN.' };
      }

      // Update local coachesList state so subsequent logins use new PIN
      setCoachesList(prev => prev.map(c => c.coach_id === targetCoachId ? { ...c, pin: newPin.trim() } : c));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error while resetting PIN.' };
    }
  }, [coachesList]);

  return (
    <CoachAuthContext.Provider
      value={{
        isLoggedIn: Boolean(currentCoach),
        currentCoach,
        coachesList,
        isLoading,
        isLoginModalOpen,
        openLoginModal,
        closeLoginModal,
        login,
        logout,
        updatePin,
        loginContext
      }}
    >
      {children}
    </CoachAuthContext.Provider>
  );
}

export function useCoachAuth() {
  const context = useContext(CoachAuthContext);
  if (!context) {
    throw new Error('useCoachAuth must be used within a CoachAuthProvider');
  }
  return context;
}
