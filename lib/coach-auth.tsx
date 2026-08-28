"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface CoachUser {
  coach_id: number;
  coach_name: string;
  email?: string;
  discord_tag?: string;
  pin?: string;
}

const STORAGE_KEY = 'nhl95_coach_session';
const DEFAULT_LEAGUE_PASSKEY = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'nhl95';

// Helper to normalize strings for flexible matching (removes spaces, hyphens, underscores, dots)
function normalizeIdentifier(str: string | number | undefined | null): string {
  if (str === undefined || str === null) return '';
  return String(str).toLowerCase().replace(/[^a-z0-9]/g, '');
}

interface CoachAuthContextType {
  isLoggedIn: boolean;
  currentCoach: CoachUser | null;
  coachesList: CoachUser[];
  isLoading: boolean;
  isLoginModalOpen: boolean;
  openLoginModal: (targetContext?: string) => void;
  closeLoginModal: () => void;
  login: (emailOrNameOrId: string | number, passkey: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updatePin: (emailOrNameOrId: number | string, currentPinOrMasterKey: string, newPin: string) => Promise<{ success: boolean; error?: string }>;
  loginContext: string | null;
  refreshCoaches: () => Promise<CoachUser[]>;
}

const CoachAuthContext = createContext<CoachAuthContextType | undefined>(undefined);

export function CoachAuthProvider({ children }: { children: React.ReactNode }) {
  const [currentCoach, setCurrentCoach] = useState<CoachUser | null>(null);
  const [coachesList, setCoachesList] = useState<CoachUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [loginContext, setLoginContext] = useState<string | null>(null);

  // Helper to fetch live coaches from Supabase with resilient column extraction
  const fetchCoaches = useCallback(async (): Promise<CoachUser[]> => {
    try {
      // Use select('*') so no query error occurs regardless of exact column names
      const { data, error } = await supabase
        .from('league_coaches')
        .select('*');

      if (error) {
        console.warn("Supabase league_coaches query error:", error.message, error.details);
      }

      if (data && data.length > 0) {
        const list: CoachUser[] = data.map((c: any) => {
          const id = Number(c.coach_id ?? c.id ?? c.coach_num ?? 0);
          const name = String(c.coach_name ?? c.name ?? c.coach ?? c.username ?? `Coach #${id}`).trim();
          const email = c.email ?? c.coach_email ?? c.user_email ?? c.mail ?? undefined;
          const discord = c.discord_tag ?? c.discord ?? c.discord_name ?? undefined;
          const pin = c.pin !== undefined && c.pin !== null 
            ? String(c.pin).trim() 
            : (c.coach_pin !== undefined && c.coach_pin !== null ? String(c.coach_pin).trim() : undefined);

          return {
            coach_id: id,
            coach_name: name,
            email: email ? String(email).trim() : undefined,
            discord_tag: discord ? String(discord).trim() : undefined,
            pin: pin || undefined
          };
        }).sort((a, b) => a.coach_name.localeCompare(b.coach_name));

        setCoachesList(list);
        return list;
      }
    } catch (err) {
      console.warn("Could not fetch coaches list from league_coaches:", err);
    }
    return [];
  }, []);

  // 1. Fetch live coaches list on mount
  useEffect(() => {
    fetchCoaches();
  }, [fetchCoaches]);

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
    // Refresh coach roster on opening modal to guarantee freshest database state
    fetchCoaches();
  }, [fetchCoaches]);

  const closeLoginModal = useCallback(() => {
    setIsLoginModalOpen(false);
    setLoginContext(null);
  }, []);

  // Find coach in list with multi-tier flexible matching
  const findCoachInList = (list: CoachUser[], input: string): CoachUser | undefined => {
    const rawClean = input.trim();
    const lowerClean = rawClean.toLowerCase();
    const normalizedInput = normalizeIdentifier(rawClean);

    // Tier 1: Exact string match (case-insensitive) on email, coach_name, or coach_id
    let found = list.find(c =>
      (c.email && c.email.trim().toLowerCase() === lowerClean) ||
      c.coach_name.trim().toLowerCase() === lowerClean ||
      String(c.coach_id) === rawClean
    );
    if (found) return found;

    // Tier 2: Normalized match (ignores spaces, hyphens, underscores, dots)
    // E.g. "UltraMagnus" matches "Ultra Magnus" or "Ultra_Magnus"
    if (normalizedInput) {
      found = list.find(c =>
        normalizeIdentifier(c.coach_name) === normalizedInput ||
        (c.email && normalizeIdentifier(c.email) === normalizedInput) ||
        (c.email && normalizeIdentifier(c.email.split('@')[0]) === normalizedInput) ||
        (c.discord_tag && normalizeIdentifier(c.discord_tag) === normalizedInput)
      );
      if (found) return found;
    }

    // Tier 3: Partial substring match if unique
    const partialMatches = list.filter(c =>
      c.coach_name.toLowerCase().includes(lowerClean) ||
      (c.email && c.email.toLowerCase().includes(lowerClean))
    );
    if (partialMatches.length === 1) {
      return partialMatches[0];
    }

    return undefined;
  };

  const login = useCallback(async (
    emailOrNameOrId: string | number,
    passkey: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanPass = passkey.trim();
    if (!cleanPass) {
      return { success: false, error: 'Please enter your coach PIN or passkey.' };
    }

    const cleanInput = String(emailOrNameOrId).trim();
    if (!cleanInput) {
      return { success: false, error: 'Please enter your coach email or coach name.' };
    }

    // 1. Try finding in current coachesList
    let currentList = coachesList;
    let foundCoach = findCoachInList(currentList, cleanInput);

    // 2. If not found in memory, refresh live from database directly
    if (!foundCoach) {
      const freshList = await fetchCoaches();
      if (freshList && freshList.length > 0) {
        currentList = freshList;
        foundCoach = findCoachInList(freshList, cleanInput);
      }
    }

    if (!foundCoach) {
      // Create a helpful hint if coaches exist
      const suggestions = currentList.slice(0, 5).map(c => c.coach_name).join(', ');
      const suggestionText = suggestions ? ` (Available coaches: ${suggestions}...)` : '';
      return { 
        success: false, 
        error: `Coach "${cleanInput}" was not found in league_coaches.${suggestionText}` 
      };
    }

    // 3. Validate PIN / passkey against coach's PIN column or master league passkey
    const isMasterValid = cleanPass.toLowerCase() === DEFAULT_LEAGUE_PASSKEY.toLowerCase();
    const isPinValid = Boolean(foundCoach.pin && cleanPass === String(foundCoach.pin).trim());

    if (!isMasterValid && !isPinValid) {
      if (!foundCoach.pin) {
        return { 
          success: false, 
          error: `No PIN is currently set for Coach ${foundCoach.coach_name}. Use the "Forgot / Set PIN?" link below or enter the master passkey.` 
        };
      }
      return { success: false, error: 'Invalid PIN. Please check your PIN or use "Forgot / Set PIN?".' };
    }

    const sessionData: CoachUser = {
      coach_id: foundCoach.coach_id,
      coach_name: foundCoach.coach_name,
      email: foundCoach.email,
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
  }, [coachesList, fetchCoaches]);

  const logout = useCallback(() => {
    setCurrentCoach(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn("Could not remove coach session:", e);
    }
  }, []);

  const updatePin = useCallback(async (
    emailOrNameOrId: number | string,
    currentPinOrMasterKey: string,
    newPin: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanInput = String(emailOrNameOrId).trim();
      let found = findCoachInList(coachesList, cleanInput);

      if (!found) {
        const freshList = await fetchCoaches();
        found = findCoachInList(freshList, cleanInput);
      }

      if (!found && typeof emailOrNameOrId === 'number') {
        found = { coach_id: emailOrNameOrId, coach_name: `Coach #${emailOrNameOrId}` };
      }

      if (!found) {
        return { success: false, error: `Coach "${emailOrNameOrId}" was not found in league_coaches table.` };
      }

      const res = await fetch('/api/coach/reset-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          coachId: found.coach_id, 
          email: found.email || (cleanInput.includes('@') ? cleanInput : undefined),
          coachName: found.coach_name,
          currentPinOrMasterKey, 
          newPin 
        })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to update PIN.' };
      }

      // Update local coachesList state
      setCoachesList(prev => prev.map(c => c.coach_id === found!.coach_id ? { ...c, pin: newPin.trim() } : c));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error while resetting PIN.' };
    }
  }, [coachesList, fetchCoaches]);

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
        loginContext,
        refreshCoaches: fetchCoaches
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
