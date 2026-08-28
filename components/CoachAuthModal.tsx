"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useCoachAuth } from '@/lib/coach-auth';
import { 
  Lock, ShieldCheck, UserCheck, X, KeyRound, Eye, EyeOff, 
  AlertCircle, CheckCircle2, RotateCcw, User, Mail, Sparkles, ChevronDown
} from 'lucide-react';

function normalize(s: string | number | undefined | null): string {
  if (!s) return '';
  return String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
}

export default function CoachAuthModal() {
  const {
    isLoggedIn,
    currentCoach,
    coachesList,
    isLoginModalOpen,
    closeLoginModal,
    login,
    logout,
    updatePin,
    loginContext,
    refreshCoaches
  } = useCoachAuth();

  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [identifier, setIdentifier] = useState<string>(''); // Coach Email or Coach Name
  const [passkey, setPasskey] = useState<string>(''); // Coach PIN or master passkey
  const [showPasskey, setShowPasskey] = useState<boolean>(false);

  // Reset PIN form states
  const [resetIdentifier, setResetIdentifier] = useState<string>('');
  const [authKey, setAuthKey] = useState<string>(''); // Current PIN or master passkey
  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [showNewPin, setShowNewPin] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Reset modal states on open
  useEffect(() => {
    if (isLoginModalOpen) {
      setError(null);
      setSuccessMessage(null);
      setPasskey('');
      setAuthKey('');
      setNewPin('');
      setConfirmPin('');
      setMode('login');

      if (currentCoach) {
        setIdentifier(currentCoach.email || currentCoach.coach_name);
        setResetIdentifier(currentCoach.email || currentCoach.coach_name);
      } else {
        setIdentifier('');
        setResetIdentifier('');
      }

      refreshCoaches();
    }
  }, [isLoginModalOpen, currentCoach, refreshCoaches]);

  // Real-time match against coachesList with flexible normalized matching (e.g. UltraMagnus vs Ultra Magnus)
  const matchedLoginCoach = useMemo(() => {
    const clean = identifier.trim().toLowerCase();
    const norm = normalize(clean);
    if (!clean && !norm) return null;

    return coachesList.find(c => 
      (c.email && c.email.trim().toLowerCase() === clean) ||
      c.coach_name.trim().toLowerCase() === clean || 
      String(c.coach_id) === clean ||
      (norm && normalize(c.coach_name) === norm) ||
      (norm && c.email && normalize(c.email) === norm) ||
      (norm && c.email && normalize(c.email.split('@')[0]) === norm)
    );
  }, [identifier, coachesList]);

  const matchedResetCoach = useMemo(() => {
    const clean = resetIdentifier.trim().toLowerCase();
    const norm = normalize(clean);
    if (!clean && !norm) return null;

    return coachesList.find(c => 
      (c.email && c.email.trim().toLowerCase() === clean) ||
      c.coach_name.trim().toLowerCase() === clean || 
      String(c.coach_id) === clean ||
      (norm && normalize(c.coach_name) === norm) ||
      (norm && c.email && normalize(c.email) === norm)
    );
  }, [resetIdentifier, coachesList]);

  if (!isLoginModalOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = identifier.trim();
    if (!cleanId) {
      setError("Please enter your coach name or email.");
      return;
    }
    if (!passkey.trim()) {
      setError("Please enter your coach PIN.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await login(cleanId, passkey);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || "Authentication failed. Check your name/email and PIN.");
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = resetIdentifier.trim();
    if (!cleanId) {
      setError("Please enter your coach name or email.");
      return;
    }
    if (!authKey.trim()) {
      setError("Please enter your current PIN or the master league passkey.");
      return;
    }
    if (!newPin.trim()) {
      setError("Please enter a new PIN.");
      return;
    }
    if (newPin.trim() !== confirmPin.trim()) {
      setError("The new PIN and confirmation PIN do not match.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    const result = await updatePin(cleanId, authKey.trim(), newPin.trim());
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || "Failed to reset PIN. Check your authorization.");
    } else {
      setSuccessMessage("✅ PIN successfully updated! You can now log in with your new PIN.");
      setPasskey(newPin.trim());
      setIdentifier(cleanId);
      setTimeout(() => {
        setMode('login');
        setSuccessMessage(null);
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-[#fdfaf5] text-black w-full max-w-md border-4 border-black p-5 sm:p-6 shadow-[8px_8px_0px_rgba(0,0,0,1)] relative font-serif">
        
        {/* Close Button */}
        <button
          onClick={closeLoginModal}
          className="absolute top-3 right-3 text-black hover:bg-red-600 hover:text-white border-2 border-black p-1 transition cursor-pointer"
          aria-label="Close Modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="border-b-2 border-black pb-3 mb-4 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-yellow-100 border-2 border-black mb-2 shadow-xs">
            {mode === 'reset' ? <RotateCcw className="w-6 h-6 text-black" /> : <Lock className="w-6 h-6 text-black" />}
          </div>
          <span className="block text-[10px] uppercase tracking-widest font-mono font-bold text-red-800 bg-red-100 px-2 py-0.5 border border-red-800 w-max mx-auto mb-1">
            Gazette League Security
          </span>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
            {mode === 'reset' ? 'Reset / Set Coach PIN' : 'Coach Verification'}
          </h2>
          <p className="text-xs text-slate-700 font-sans mt-1">
            {mode === 'reset' ? (
              <span>Update your personal coach PIN in league records.</span>
            ) : loginContext ? (
              <span>Authentication required to access <strong>{loginContext}</strong></span>
            ) : (
              <span>Sign in with your coach name/email and PIN to manage uploads & draft picks.</span>
            )}
          </p>
        </div>

        {/* Datalist for coach name & email suggestions */}
        <datalist id="coach-identity-list">
          {coachesList.map((c) => (
            <React.Fragment key={c.coach_id}>
              <option value={c.coach_name}>
                {c.email ? `${c.coach_name} • ${c.email}` : c.coach_name}
              </option>
              {c.email && (
                <option value={c.email}>
                  {c.coach_name} (Email)
                </option>
              )}
            </React.Fragment>
          ))}
        </datalist>

        {/* Already Logged In Prompt */}
        {isLoggedIn && currentCoach && mode === 'login' ? (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50 border-2 border-emerald-800 text-emerald-950 flex items-center justify-between text-xs font-bold uppercase font-sans">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <span className="block text-[10px] text-emerald-800">Currently Logged In:</span>
                  <span className="text-sm font-black">{currentCoach.coach_name}</span>
                  {currentCoach.email && (
                    <span className="block text-[10px] text-emerald-700 lowercase font-mono">{currentCoach.email}</span>
                  )}
                </div>
              </div>
              <span className="text-[10px] font-mono bg-emerald-200 text-emerald-900 px-2 py-0.5 border border-emerald-600 font-bold shrink-0">
                ID #{currentCoach.coach_id}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeLoginModal}
                  className="flex-1 bg-black text-white py-2 px-4 text-xs font-black uppercase border-2 border-black hover:bg-neutral-800 transition cursor-pointer shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                >
                  Continue
                </button>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setError(null);
                    setIdentifier('');
                  }}
                  className="bg-red-100 text-red-900 py-2 px-4 text-xs font-bold uppercase border-2 border-red-800 hover:bg-red-800 hover:text-white transition cursor-pointer"
                >
                  Sign Out
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMode('reset');
                  setResetIdentifier(currentCoach.coach_name || currentCoach.email || '');
                  setError(null);
                }}
                className="w-full text-center text-xs font-bold uppercase py-1.5 border border-black/30 hover:bg-neutral-100 transition text-slate-700 cursor-pointer"
              >
                🔑 Change / Reset My PIN
              </button>
            </div>
          </div>
        ) : mode === 'reset' ? (
          /* Reset PIN Form */
          <form onSubmit={handleResetSubmit} className="space-y-3 font-sans text-xs">
            {error && (
              <div className="p-2.5 bg-red-100 border-2 border-red-700 text-red-900 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-2.5 bg-emerald-100 border-2 border-emerald-700 text-emerald-900 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Coach Name or Email Input */}
            <div>
              <label className="block text-[11px] font-black uppercase font-mono mb-1 text-slate-900">
                1. Coach Name or Email:
              </label>
              <div className="relative">
                <input
                  type="text"
                  list="coach-identity-list"
                  value={resetIdentifier}
                  onChange={(e) => setResetIdentifier(e.target.value)}
                  placeholder="Type your coach name or email..."
                  autoComplete="off"
                  className="w-full bg-white border-2 border-black py-2 pl-3 pr-8 text-xs font-bold font-sans focus:outline-none focus:bg-yellow-50"
                />
                {resetIdentifier && (
                  <button
                    type="button"
                    onClick={() => setResetIdentifier('')}
                    className="absolute right-2 top-2 text-slate-500 hover:text-black text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
              {matchedResetCoach ? (
                <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-800 font-mono font-bold">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Found: {matchedResetCoach.coach_name} {matchedResetCoach.email ? `(${matchedResetCoach.email})` : `(ID #${matchedResetCoach.coach_id})`}</span>
                </div>
              ) : (
                <p className="text-[10px] text-slate-500 mt-1 font-serif">
                  Type your coach name or email from the league_coaches table.
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase font-mono mb-1 text-slate-900">
                2. Current PIN or Master League Key:
              </label>
              <input
                type="password"
                value={authKey}
                onChange={(e) => setAuthKey(e.target.value)}
                placeholder="Enter current PIN or master league key..."
                className="w-full bg-white border-2 border-black py-2 px-3 text-xs font-mono font-bold focus:outline-none focus:bg-yellow-50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-black uppercase font-mono mb-1 text-slate-900">
                  3. New PIN:
                </label>
                <div className="relative">
                  <input
                    type={showNewPin ? "text" : "password"}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="New PIN..."
                    className="w-full bg-white border-2 border-black py-2 pl-2 pr-8 text-xs font-mono font-bold focus:outline-none focus:bg-yellow-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPin(!showNewPin)}
                    className="absolute right-2 top-2 text-slate-600 hover:text-black cursor-pointer"
                    tabIndex={-1}
                  >
                    {showNewPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase font-mono mb-1 text-slate-900">
                  4. Confirm PIN:
                </label>
                <input
                  type={showNewPin ? "text" : "password"}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="Repeat new PIN..."
                  className="w-full bg-white border-2 border-black py-2 px-2 text-xs font-mono font-bold focus:outline-none focus:bg-yellow-50"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className="px-3 py-2 bg-neutral-200 hover:bg-neutral-300 text-black font-bold uppercase border border-black transition cursor-pointer text-xs"
              >
                Back to Sign In
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-black text-white hover:bg-neutral-800 py-2.5 px-4 font-black uppercase border-2 border-black transition cursor-pointer text-xs shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-y-0.5 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{isSubmitting ? "Updating..." : "Save New PIN"}</span>
              </button>
            </div>
          </form>
        ) : (
          /* Sign In Form */
          <form onSubmit={handleLoginSubmit} className="space-y-4 font-sans text-xs">
            {error && (
              <div className="p-2.5 bg-red-100 border-2 border-red-700 text-red-900 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Coach Name / Email Input */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-black uppercase font-mono text-slate-900">
                  1. Coach Name or Email:
                </label>
                <span className="text-[9.5px] font-mono text-neutral-500 font-bold">
                  (league_coaches table)
                </span>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-600">
                  {identifier.includes('@') ? <Mail className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>
                <input
                  type="text"
                  list="coach-identity-list"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Type your coach name or email..."
                  autoComplete="off"
                  autoFocus
                  className="w-full bg-white border-2 border-black py-2.5 pl-8 pr-8 text-xs font-bold font-sans focus:outline-none focus:bg-yellow-50 focus:border-black"
                />
                {identifier && (
                  <button
                    type="button"
                    onClick={() => setIdentifier('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-black text-xs font-bold p-1 cursor-pointer"
                    title="Clear"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Real-time matched coach badge */}
              {matchedLoginCoach ? (
                <div className="mt-1.5 flex items-center justify-between gap-1.5 text-[10px] text-emerald-900 font-mono font-bold bg-emerald-50 px-2 py-1 border border-emerald-300">
                  <div className="flex items-center gap-1.5 truncate">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">Coach: <strong>{matchedLoginCoach.coach_name}</strong></span>
                    {matchedLoginCoach.email && (
                      <span className="text-emerald-700 opacity-80 truncate">({matchedLoginCoach.email})</span>
                    )}
                  </div>
                  <span className="text-[9px] bg-emerald-200 text-emerald-950 px-1 py-0 border border-emerald-600 shrink-0">
                    ID #{matchedLoginCoach.coach_id}
                  </span>
                </div>
              ) : (
                <p className="text-[10px] text-slate-500 italic mt-1 font-serif">
                  Type your coach name (e.g. Ultra Magnus) or email. Auto-suggestions will appear as you type.
                </p>
              )}
            </div>

            {/* Coach PIN Input */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-black uppercase font-mono text-slate-900">
                  2. Coach Passkey / PIN:
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('reset');
                    setResetIdentifier(identifier);
                    setError(null);
                  }}
                  className="text-[10px] text-red-800 font-bold uppercase underline hover:text-black cursor-pointer"
                >
                  Forgot / Set PIN?
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPasskey ? "text" : "password"}
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  placeholder="Enter Coach PIN or Master Passkey..."
                  className="w-full bg-white border-2 border-black py-2 pl-3 pr-10 text-xs font-mono font-bold focus:outline-none focus:bg-yellow-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPasskey(!showPasskey)}
                  className="absolute right-2.5 top-2 text-slate-600 hover:text-black cursor-pointer"
                  tabIndex={-1}
                >
                  {showPasskey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 italic mt-1 font-serif">
                Enter your coach PIN or league master passkey.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={closeLoginModal}
                className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-black font-bold uppercase border border-black transition cursor-pointer text-xs"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-black text-white hover:bg-neutral-800 py-2.5 px-4 font-black uppercase border-2 border-black transition cursor-pointer text-xs shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-y-0.5 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{isSubmitting ? "Verifying..." : "Sign In as Coach"}</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
