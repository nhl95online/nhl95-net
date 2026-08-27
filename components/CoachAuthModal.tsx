"use client";

import React, { useState, useEffect } from 'react';
import { useCoachAuth } from '@/lib/coach-auth';
import { Lock, ShieldCheck, UserCheck, X, KeyRound, Eye, EyeOff, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';

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
    loginContext
  } = useCoachAuth();

  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [selectedCoachId, setSelectedCoachId] = useState<string>('');
  const [passkey, setPasskey] = useState<string>('');
  const [showPasskey, setShowPasskey] = useState<boolean>(false);

  // Reset PIN form states
  const [authKey, setAuthKey] = useState<string>(''); // Current PIN or master passkey
  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [showNewPin, setShowNewPin] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Set default coach selection when modal opens
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
        setSelectedCoachId(String(currentCoach.coach_id));
      } else if (coachesList.length > 0) {
        setSelectedCoachId(String(coachesList[0].coach_id));
      }
    }
  }, [isLoginModalOpen, currentCoach, coachesList]);

  if (!isLoginModalOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoachId) {
      setError("Please select your coach name.");
      return;
    }
    if (!passkey.trim()) {
      setError("Please enter your coach passkey or PIN.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await login(selectedCoachId, passkey);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || "Authentication failed. Check your passkey.");
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoachId) {
      setError("Please select your coach profile.");
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

    const result = await updatePin(Number(selectedCoachId), authKey.trim(), newPin.trim());
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || "Failed to reset PIN. Check your authorization.");
    } else {
      setSuccessMessage("✅ PIN successfully updated! You can now log in with your new PIN.");
      setPasskey(newPin.trim());
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
              <span>Sign in to manage team save state uploads and draft selections.</span>
            )}
          </p>
        </div>

        {/* Already Logged In Prompt */}
        {isLoggedIn && currentCoach && mode === 'login' ? (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50 border-2 border-emerald-800 text-emerald-950 flex items-center justify-between text-xs font-bold uppercase font-sans">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <span className="block text-[10px] text-emerald-800">Currently Logged In:</span>
                  <span className="text-sm font-black">{currentCoach.coach_name}</span>
                </div>
              </div>
              <span className="text-[10px] font-mono bg-emerald-200 text-emerald-900 px-2 py-0.5 border border-emerald-600 font-bold">
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
                  setSelectedCoachId(String(currentCoach.coach_id));
                  setError(null);
                }}
                className="w-full text-center text-xs font-bold uppercase py-1.5 border border-black/30 hover:bg-neutral-100 transition text-slate-700"
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

            <div>
              <label className="block text-[11px] font-black uppercase font-mono mb-1 text-slate-900">
                1. Select Coach:
              </label>
              <select
                value={selectedCoachId}
                onChange={(e) => setSelectedCoachId(e.target.value)}
                className="w-full bg-white border-2 border-black p-2 text-xs font-bold font-sans cursor-pointer focus:outline-none focus:bg-yellow-50"
              >
                {coachesList.map((c) => (
                  <option key={c.coach_id} value={c.coach_id}>
                    {c.coach_name} (Coach #{c.coach_id})
                  </option>
                ))}
              </select>
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

            <div>
              <label className="block text-[11px] font-black uppercase font-mono mb-1 text-slate-900">
                1. Select Coach Profile:
              </label>
              <select
                value={selectedCoachId}
                onChange={(e) => setSelectedCoachId(e.target.value)}
                className="w-full bg-white border-2 border-black p-2 text-xs font-bold font-sans cursor-pointer focus:outline-none focus:bg-yellow-50"
              >
                {coachesList.length === 0 ? (
                  <option value="">Loading coaches from database...</option>
                ) : (
                  coachesList.map((c) => (
                    <option key={c.coach_id} value={c.coach_id}>
                      {c.coach_name} (Coach #{c.coach_id})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-black uppercase font-mono text-slate-900">
                  2. Coach Passkey / PIN:
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('reset');
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
                  placeholder="Enter Coach Passkey or PIN..."
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
