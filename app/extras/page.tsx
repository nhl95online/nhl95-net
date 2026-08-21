"use client";

import React from 'react';
import Link from 'next/link';
import { HardDrive, Users, Clapperboard } from 'lucide-react';

export default function ExtrasPage() {
  return (
    <div className="min-h-screen bg-[#f4f1ea] text-black font-serif p-3 sm:p-6">
      <header className="border-b-4 border-black pb-3 sm:pb-4 mb-6 text-center">
        <span className="bg-black text-white font-mono text-[10px] sm:text-xs font-black uppercase px-2.5 py-0.5 tracking-widest inline-block mb-1">
          NHL95 League Vault
        </span>
        <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">League Extras & Resources</h1>
        <p className="text-xs font-bold uppercase italic mt-1 text-slate-700">
          Tournament ROMs, Front Office Staff Directory, Broadcast Overlays & Utilities
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {/* 1. ROMs & Files */}
        <div className="border-2 border-black p-6 bg-[#fdfaf5] shadow-[4px_4px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-amber-500 text-black flex items-center justify-center mb-4 border border-black">
              <HardDrive className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black uppercase mb-2">ROMs & Files</h2>
            <p className="font-sans text-xs text-slate-700 leading-relaxed mb-4">
              Download official tournament ROM binaries for W League, The Q, Original 6, Vintage, and Golden Era, plus sound packs and savestates.
            </p>
          </div>
          <Link
            href="/roms"
            className="block text-center bg-black hover:bg-amber-600 text-white font-mono text-xs font-bold uppercase py-2.5 transition-colors"
          >
            Access ROM Vault &rarr;
          </Link>
        </div>

        {/* 2. Managers Directory */}
        <div className="border-2 border-black p-6 bg-[#fdfaf5] shadow-[4px_4px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-blue-600 text-white flex items-center justify-center mb-4 border border-black">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black uppercase mb-2">Managers Directory</h2>
            <p className="font-sans text-xs text-slate-700 leading-relaxed mb-4">
              Front office rosters, registered head coaches, discord handles, and franchise assignments across all historical seasons.
            </p>
          </div>
          <Link
            href="/managers"
            className="block text-center bg-black hover:bg-blue-700 text-white font-mono text-xs font-bold uppercase py-2.5 transition-colors"
          >
            View Front Office &rarr;
          </Link>
        </div>

        {/* 3. Stream Overlays & Broadcast Tools */}
        <div className="border-2 border-black p-6 bg-[#fdfaf5] shadow-[4px_4px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-purple-600 text-white flex items-center justify-center mb-4 border border-black">
              <Clapperboard className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black uppercase mb-2">Stream Tools & Overlays</h2>
            <p className="font-sans text-xs text-slate-700 leading-relaxed mb-4">
              Broadcast scoreboard overlays, OBS studio templates, CRT scanline shader presets, and Twitch streaming configurations.
            </p>
          </div>
          <Link
            href="/setup-guide?tab=overlays"
            className="block text-center bg-black hover:bg-purple-700 text-white font-mono text-xs font-bold uppercase py-2.5 transition-colors"
          >
            Launch Stream Kit &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}