"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Lock, KeyRound, User, Mail, Shield, CheckCircle,
  AlertTriangle, ArrowRight, LogIn, UserPlus, LogOut,
  HockeyPuck as Puck, Trophy, ArrowLeft, RefreshCw, ShieldCheck, Zap
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [redirectUrl, setRedirectUrl] = useState<string>('/upload');

  const {
    user, profile, isLoggedIn, isAdmin, isLoading,
    signInWithPassword, signUp, signInAsAdmin, signOut, resetPassword
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot' | 'admin'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [coachName, setCoachName] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [adminPasscode, setAdminPasscode] = useState('');
  const [teams, setTeams] = useState<any[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const target = params.get('redirect');
      if (target) {
        setRedirectUrl(target);
      }
    }
  }, []);

  useEffect(() => {
    async function loadTeams() {
      try {
        const { data } = await supabase
          .from('league_teams')
          .select('team_id, team_name, abbreviation')
          .order('team_name', { ascending: true });
        if (data) setTeams(data);
      } catch (err) {
        console.warn("Could not load teams list:", err);
      }
    }
    loadTeams();
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please provide both email address and password.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await signInWithPassword(email, password);
      if (error) {
        setErrorMessage(error.message || 'Invalid email or password. Please verify your credentials.');
      } else {
        setSuccessMessage('Successfully signed in! Redirecting...');
        setTimeout(() => {
          router.push(redirectUrl);
        }, 600);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!adminPasscode.trim()) {
      setErrorMessage('Please enter the commissioner / admin passcode.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await signInAsAdmin(adminPasscode);
      if (!res.success) {
        setErrorMessage(res.error || 'Invalid passcode.');
      } else {
        setSuccessMessage('Commissioner authentication granted! Redirecting to ingestion portal...');
        setTimeout(() => {
          router.push(redirectUrl);
        }, 600);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error signing in as administrator.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please provide both email address and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters in length.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify and re-enter.');
      return;
    }

    setSubmitting(true);
    try {
      const selectedTeam = teams.find(t => String(t.team_id) === String(selectedTeamId));
      const { error, user: newUser } = await signUp(email, password, {
        coachName: coachName.trim() || email.split('@')[0],
        teamId: selectedTeamId || undefined,
        teamName: selectedTeam?.team_name || undefined
      });

      if (error) {
        setErrorMessage(error.message || 'Registration failed. Please check your details and try again.');
      } else {
        setSuccessMessage(
          'Account created successfully! If email confirmation is enabled on your Supabase server, please check your inbox.'
        );
        setTimeout(() => {
          if (newUser) {
            router.push(redirectUrl);
          } else {
            setMode('signin');
          }
        }, 1500);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during account creation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await resetPassword(email);
      if (error) {
        setErrorMessage(error.message || 'Could not initiate password reset.');
      } else {
        setSuccessMessage('Password reset instructions have been sent to your email address.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred sending reset instructions.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <RefreshCw className="w-8 h-8 animate-spin mb-3 text-red-700" />
        <p className="text-xs font-bold uppercase tracking-wider">Verifying League Credentials...</p>
      </div>
    );
  }

  if (isLoggedIn) {
    return (
      <div className="max-w-lg mx-auto bg-white border-4 border-black p-6 sm:p-8 shadow-[6px_6px_0px_rgba(0,0,0,1)] my-8">
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <span className="text-[10px] uppercase tracking-widest font-sans font-bold bg-green-100 text-green-900 border border-green-800 px-2.5 py-0.5 inline-block mb-2">
            Active League Session
          </span>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
            {isAdmin ? 'Commissioner Control Active' : 'Coach Ingestion Status'}
          </h1>
          <p className="text-xs italic text-slate-600 mt-1">
            You are authenticated and authorized to submit game records.
          </p>
        </div>

        <div className="bg-[#faf8f5] border-2 border-black p-4 mb-6 space-y-2 text-xs">
          <div className="flex justify-between border-b border-black/10 pb-1">
            <span className="font-bold uppercase text-slate-500">Identity:</span>
            <span className="font-mono font-bold text-sm text-red-800">{profile?.coach_name || (isAdmin ? 'Commissioner' : 'Coach')}</span>
          </div>
          {user?.email && (
            <div className="flex justify-between border-b border-black/10 pb-1">
              <span className="font-bold uppercase text-slate-500">Registered Email:</span>
              <span className="font-mono">{user.email}</span>
            </div>
          )}
          {profile?.team_name && (
            <div className="flex justify-between border-b border-black/10 pb-1">
              <span className="font-bold uppercase text-slate-500">Club / Office:</span>
              <span className="font-bold uppercase">{profile.team_name}</span>
            </div>
          )}
          <div className="flex justify-between pt-1">
            <span className="font-bold uppercase text-slate-500">Access Level:</span>
            <span className="font-bold text-green-700 uppercase flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> {isAdmin ? 'Full League Commissioner Rights' : 'Official Match Upload Enabled'}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <Link
            href="/upload"
            className="w-full py-3 px-4 bg-black text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-red-700 transition border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
          >
            <span>Proceed to Save State Upload</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <button
            onClick={() => signOut()}
            className="w-full py-2.5 px-4 bg-slate-100 text-black text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-slate-200 transition border-2 border-black cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of League</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto my-6 sm:my-10">
      {/* Newspaper Card Box */}
      <div className="bg-white border-4 border-black p-6 sm:p-8 shadow-[6px_6px_0px_rgba(0,0,0,1)]">
        {/* Header Branding */}
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <span className="text-[10px] uppercase tracking-widest font-sans font-bold bg-red-100 text-red-800 border border-red-800 px-2.5 py-0.5 inline-block mb-2">
            NHL95 League Staff & Coach Portal
          </span>
          <h1 className="text-3xl font-black uppercase tracking-tight">
            League Access
          </h1>
          <p className="text-xs italic text-slate-600 mt-1">
            Log in to commit game stats and synchronize official match results.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex border-2 border-black mb-6 bg-slate-100 text-[11px] font-bold uppercase">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-2 text-center transition cursor-pointer flex items-center justify-center gap-1 ${mode === 'signin' ? 'bg-black text-white' : 'hover:bg-slate-200 text-black'
              }`}
          >
            <LogIn className="w-3 h-3" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-2 text-center transition cursor-pointer border-l-2 border-black flex items-center justify-center gap-1 ${mode === 'signup' ? 'bg-black text-white' : 'hover:bg-slate-200 text-black'
              }`}
          >
            <UserPlus className="w-3 h-3" />
            <span>Register</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('admin');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-2 text-center transition cursor-pointer border-l-2 border-black flex items-center justify-center gap-1 ${mode === 'admin' ? 'bg-red-800 text-white' : 'hover:bg-slate-200 text-red-800'
              }`}
            title="Commissioner Master Access"
          >
            <Shield className="w-3 h-3" />
            <span>Admin</span>
          </button>
        </div>

        {/* Status Alerts */}
        {errorMessage && (
          <div className="mb-5 p-3.5 bg-red-50 border-2 border-red-800 text-red-950 text-xs font-bold flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 p-3.5 bg-green-50 border-2 border-green-800 text-green-950 text-xs font-bold flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Commissioner / Admin Quick Passcode Form */}
        {mode === 'admin' && (
          <form onSubmit={handleAdminSignIn} className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-800/40 text-[11px] text-amber-950">
              <span className="font-bold uppercase block mb-0.5">Commissioner Master Unlock:</span>
              Enter the admin passcode to instantly grant full game ingestion authorization without requiring email confirmation.
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1">
                Admin / Commissioner Passcode
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={adminPasscode}
                  onChange={(e) => setAdminPasscode(e.target.value)}
                  placeholder="Enter passcode (e.g. admin, nhl95)"
                  className="w-full border-2 border-black px-3 py-2 text-xs font-mono bg-[#faf8f5] focus:bg-white focus:outline-none"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 px-4 bg-red-800 text-white text-xs font-black uppercase tracking-wider hover:bg-black transition border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Unlocking Admin Access...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-yellow-300" />
                  <span>Authorize as Commissioner</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Sign In Form */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="coach@nhl95.net"
                  className="w-full border-2 border-black px-3 py-2 text-xs font-mono bg-[#faf8f5] focus:bg-white focus:outline-none"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-black uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-[10px] uppercase font-bold text-red-700 hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border-2 border-black px-3 py-2 text-xs font-mono bg-[#faf8f5] focus:bg-white focus:outline-none"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 px-4 bg-black text-white text-xs font-black uppercase tracking-wider hover:bg-red-700 transition border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In & Continue</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Register Account Form */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1">
                Coach / Player Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={coachName}
                  onChange={(e) => setCoachName(e.target.value)}
                  placeholder="e.g. UltraMagnus or Coach Smith"
                  className="w-full border-2 border-black px-3 py-2 text-xs font-sans font-bold uppercase bg-[#faf8f5] focus:bg-white focus:outline-none"
                />
                <User className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="coach@nhl95.net"
                  className="w-full border-2 border-black px-3 py-2 text-xs font-mono bg-[#faf8f5] focus:bg-white focus:outline-none"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1">
                Assigned Team / Franchise (Optional)
              </label>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="w-full border-2 border-black px-3 py-2 text-xs font-sans font-bold bg-[#faf8f5] focus:bg-white focus:outline-none cursor-pointer"
              >
                <option value="">-- Free Agent / Independent Coach --</option>
                {teams.map((t) => (
                  <option key={t.team_id} value={t.team_id}>
                    {t.team_name} ({t.abbreviation})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full border-2 border-black px-3 py-2 text-xs font-mono bg-[#faf8f5] focus:bg-white focus:outline-none"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full border-2 border-black px-3 py-2 text-xs font-mono bg-[#faf8f5] focus:bg-white focus:outline-none"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 px-4 bg-black text-white text-xs font-black uppercase tracking-wider hover:bg-red-700 transition border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Registering Account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create League Account</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Forgot Password Form */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1">
                Registered Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="coach@nhl95.net"
                  className="w-full border-2 border-black px-3 py-2 text-xs font-mono bg-[#faf8f5] focus:bg-white focus:outline-none"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 px-4 bg-black text-white text-xs font-black uppercase tracking-wider hover:bg-red-700 transition border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending Instructions...</span>
                </>
              ) : (
                <span>Send Password Reset Email</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="w-full text-center text-xs font-bold uppercase underline mt-2 text-slate-700 hover:text-black cursor-pointer"
            >
              &larr; Back to Sign In
            </button>
          </form>
        )}

        {/* Public Visitor Notice Footer */}
        <div className="mt-8 pt-4 border-t border-black/20 text-center text-[11px] text-slate-600">
          <p className="font-bold uppercase text-black mb-1">Looking to view stats & scores?</p>
          <p className="italic mb-2">No login is required to browse standings, player stats, or match schedules.</p>
          <div className="flex justify-center gap-3 font-bold uppercase text-red-700 text-xs">
            <Link href="/standings" className="hover:underline">Standings &rarr;</Link>
            <span>•</span>
            <Link href="/stats" className="hover:underline">Player Stats &rarr;</Link>
            <span>•</span>
            <Link href="/schedule" className="hover:underline">Schedule &rarr;</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
