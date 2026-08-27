"use client";

import React from 'react';
import { useCoachAuth } from '@/lib/coach-auth';
import { Lock, ShieldAlert, LogIn, Sparkles } from 'lucide-react';

interface CoachLockOverlayProps {
  title?: string;
  description?: string;
  buttonText?: string;
  loginContext?: string;
  className?: string;
}

export default function CoachLockOverlay({
  title = "COACH ACCESS REQUIRED",
  description = "This action is restricted to verified league coaches. Please sign in to unlock.",
  buttonText = "Sign In as Coach",
  loginContext = "Coach Portal",
  className = ""
}: CoachLockOverlayProps) {
  const { openLoginModal } = useCoachAuth();

  return (
    <div className={`absolute inset-0 z-20 bg-black/85 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center text-white border-2 border-black animate-in fade-in duration-150 ${className}`}>
      {/* Blackout Content Box */}
      <div className="max-w-md w-full bg-[#121418] border-2 border-neutral-700 p-6 shadow-[6px_6px_0px_rgba(0,0,0,0.8)] font-serif">
        
        {/* Pulsing Lock Icon */}
        <div className="relative mx-auto mb-3 w-12 h-12 flex items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-red-600/30 animate-ping"></span>
          <div className="w-12 h-12 bg-red-950 border-2 border-red-500 rounded-full flex items-center justify-center shadow-lg relative">
            <Lock className="w-6 h-6 text-red-400" />
          </div>
        </div>

        {/* Header Badges */}
        <span className="inline-block text-[10px] font-mono font-black uppercase tracking-widest bg-red-800 text-white px-2.5 py-0.5 border border-red-500 mb-2">
          Restricted Zone
        </span>

        <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white mb-2">
          {title}
        </h3>

        <p className="text-xs text-neutral-300 font-sans leading-relaxed mb-5 max-w-sm mx-auto">
          {description}
        </p>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => openLoginModal(loginContext)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase text-xs tracking-wider px-6 py-3 border-2 border-black transition shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer"
        >
          <LogIn className="w-4 h-4 text-black" />
          <span>{buttonText}</span>
        </button>

        <div className="mt-4 pt-3 border-t border-neutral-800 text-[10px] text-neutral-400 font-mono">
          🔒 League Credentials Protected &bull; Session Auto-Persists
        </div>
      </div>
    </div>
  );
}
