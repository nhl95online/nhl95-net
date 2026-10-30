"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { 
  Trophy, Clock, CheckCircle2, Search, Filter, Sparkles, UserCheck, 
  AlertCircle, ChevronDown, ChevronRight, Layers, ArrowRight, Shield, 
  Flame, ExternalLink, RefreshCw, Send, PlusCircle, HelpCircle, Eye,
  SlidersHorizontal, Check, Award, Calendar, Star, Lock, Unlock, Timer,
  Users, MessageSquare
} from 'lucide-react';
import { useCoachAuth } from '@/lib/coach-auth';
import CoachLockOverlay from '@/components/CoachLockOverlay';
import {
  W_LEAGUE_GOALIES,
  W_LEAGUE_SKATERS,
  O_LEAGUE_GOALIES,
  O_LEAGUE_SKATERS
} from '@/lib/seasons';

interface SeasonOption {
  leagueId: string;
  seasonBadge: string;
  seasonName: string;
  leagueType: string;
  year: number;
  draftDate?: string | null;
  status?: string | null;
  draftStarted?: boolean;
}

interface DraftData {
  id?: string | number;
  draftId?: number;
  team: string;
  teamId?: string | number;
  coachId?: string | number | null;
  coachName?: string | null;
  rd: number;
  pk: number;
  player: string;
  playerId?: string | number;
  pos: string | null;
  ovr: number | null;
  transaction: string;
  logo: string;
  year: number;
  leagueId: string;
  seasonBadge: string;
  seasonName: string;
  leagueType: string;
  ratings?: Record<string, any>;
  playerInfo?: Record<string, any>;
  isSubmitted?: boolean;
}

interface DatabasePlayer {
  player_id: number | string;
  player_name: string;
  pos: string;
  team_default: string;
  orig_nhl_team?: string;
  rookie?: boolean;
  isFreeAgent?: boolean;
  prospectType?: 'ROOKIE' | 'FREE AGENT';
  ratings?: Record<string, any>;
  player_info?: Record<string, any>;
  star_rating?: number | null;
  ovr: number;
}

interface TeamInfo {
  team_id: number;
  team_name: string;
  abbreviation: string;
  logo_url: string | null;
  league_id: number;
  coach_id?: number | null;
  coach_name?: string | null;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://prdfunbzqsvqlyiwmuqp.supabase.co';
const PORTRAIT_BUCKET = "nhl%20players";

const LEAGUE_LOGOS: Record<string, { name: string; logoUrl: string; fallbackUrl?: string }> = {
  W: {
    name: 'W League',
    logoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/WN95HL.png',
    fallbackUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/WN95HL.png'
  },
  Q: {
    name: 'The Q',
    logoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/TheQ.png',
    fallbackUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/TheQ.png'
  },
  O: {
    name: 'Original 6',
    logoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/Original%206.png',
    fallbackUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Original%206.png'
  },
  V: {
    name: 'Vintage',
    logoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/Vintage.png',
    fallbackUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Vintage.png'
  },
  G: {
    name: 'Golden Era',
    logoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/Golden%20Era.png',
    fallbackUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Golden%20Era.png'
  }
};

// Known accurate base seasons mapping
export const KNOWN_LEAGUE_SEASON_MAP: Record<number | string, { badge: string; prefix: string; year: number; name: string }> = {
  1: { badge: 'W01 (1995)', prefix: 'W', year: 1995, name: 'W League - Season 1 (1995)' },
  2: { badge: 'W02 (1996)', prefix: 'W', year: 1996, name: 'W League - Season 2 (1996)' },
  3: { badge: 'W03 (1997)', prefix: 'W', year: 1997, name: 'W League - Season 3 (1997)' },
  4: { badge: 'W04 (1998)', prefix: 'W', year: 1998, name: 'W League - Season 4 (1998)' },
  5: { badge: 'Q01 (1995)', prefix: 'Q', year: 1995, name: 'The Q - Season 1 (1995)' },
  6: { badge: 'W05 (1999)', prefix: 'W', year: 1999, name: 'W League - Season 5 (1999)' },
  7: { badge: 'Q02 (1996)', prefix: 'Q', year: 1996, name: 'The Q - Season 2 (1996)' },
  8: { badge: 'Q03 (1996)', prefix: 'Q', year: 1996, name: 'The Q - Season 3 (1996)' },
  9: { badge: 'W06 (2000)', prefix: 'W', year: 2000, name: 'W League - Season 6 (2000)' },
  10: { badge: 'Q04 (1997)', prefix: 'Q', year: 1997, name: 'The Q - Season 4 (1997)' },
  11: { badge: 'W07 (2001)', prefix: 'W', year: 2001, name: 'W League - Season 7 (2001)' },
  12: { badge: 'Q05 (1997)', prefix: 'Q', year: 1997, name: 'The Q - Season 5 (1997)' },
  13: { badge: 'Q06 (1997)', prefix: 'Q', year: 1997, name: 'The Q - Season 6 (1997)' },
  14: { badge: 'W08 (2002)', prefix: 'W', year: 2002, name: 'W League - Season 8 (2002)' },
  15: { badge: 'Q07 (1997)', prefix: 'Q', year: 1997, name: 'The Q - Season 7 (1997)' },
  16: { badge: 'G01 (1980)', prefix: 'G', year: 1980, name: 'Golden Era (1980)' },
  17: { badge: 'Q08 (1998)', prefix: 'Q', year: 1998, name: 'The Q - Season 8 (1998)' },
  18: { badge: 'W09 (2003)', prefix: 'W', year: 2003, name: 'W League - Season 9 (2003)' },
  19: { badge: 'Q09 (1998)', prefix: 'Q', year: 1998, name: 'The Q - Season 9 (1998)' },
  20: { badge: 'V01 (1917)', prefix: 'V', year: 1917, name: 'Vintage (1917)' },
  21: { badge: 'Q10 (1998)', prefix: 'Q', year: 1998, name: 'The Q - Season 10 (1998)' },
  22: { badge: 'W10 (2004)', prefix: 'W', year: 2004, name: 'W League - Season 10 (2004)' },
  23: { badge: 'Q11 (1998)', prefix: 'Q', year: 1998, name: 'The Q - Season 11 (1998)' },
  24: { badge: 'W11 (2005)', prefix: 'W', year: 2005, name: 'W League - Season 11 (2005)' },
  25: { badge: 'Q12 (1998)', prefix: 'Q', year: 1998, name: 'The Q - Season 12 (1998)' },
  26: { badge: 'Q13 (1998)', prefix: 'Q', year: 1998, name: 'The Q - Season 13 (1998)' },
  27: { badge: 'Q14 (1998)', prefix: 'Q', year: 1998, name: 'The Q - Season 14 (1998)' },
  28: { badge: 'W12 (2006)', prefix: 'W', year: 2006, name: 'W League - Season 12 (2006)' },
  29: { badge: 'Q15 (1998)', prefix: 'Q', year: 1998, name: 'The Q - Season 15 (1998)' },
  30: { badge: 'Q16 (1998)', prefix: 'Q', year: 1998, name: 'The Q - Season 16 (1998)' },
  31: { badge: 'W13 (2007)', prefix: 'W', year: 2007, name: 'W League - Season 13 (2007)' },
  32: { badge: 'Q17 (1998)', prefix: 'Q', year: 1998, name: 'The Q - Season 17 (1998)' },
  33: { badge: 'W14 (2008)', prefix: 'W', year: 2008, name: 'W League - Season 14 (2008)' },
  34: { badge: 'Q18 (1998)', prefix: 'Q', year: 1998, name: 'The Q - Season 18 (1998)' },
  35: { badge: 'W15 (2009)', prefix: 'W', year: 2009, name: 'W League - Season 15 (2009)' },
  36: { badge: 'Q19 (1998)', prefix: 'Q', year: 1998, name: 'The Q - Season 19 (1998)' },
  37: { badge: 'W16 (2010)', prefix: 'W', year: 2010, name: 'W League - Season 16 (2010)' },
  38: { badge: 'W17 (2012)', prefix: 'W', year: 2012, name: 'W League - Season 17 (2012)' },
  39: { badge: 'O01 (1927)', prefix: 'O', year: 1927, name: 'Original 6 (1927)' },
  40: { badge: 'W18 (2013)', prefix: 'W', year: 2013, name: 'W League - Season 18 (2013)' },
  41: { badge: 'W19 (2014)', prefix: 'W', year: 2014, name: 'W League - Season 19 (2014)' },
  42: { badge: 'W20 (2015)', prefix: 'W', year: 2015, name: 'W League - Season 20 (2015)' },
  43: { badge: 'W21 (2016)', prefix: 'W', year: 2016, name: 'W League - Season 21 (2016)' },
  44: { badge: 'W22 (2017)', prefix: 'W', year: 2017, name: 'W League - Season 22 (2017)' },
  45: { badge: 'W23 (2018)', prefix: 'W', year: 2018, name: 'W League - Season 23 (2018)' },
  46: { badge: 'W24 (2019)', prefix: 'W', year: 2019, name: 'W League - Season 24 (2019)' },
  47: { badge: 'W25 (2020)', prefix: 'W', year: 2020, name: 'W League - Season 25 (2020)' },
  48: { badge: 'W26 (2021)', prefix: 'W', year: 2021, name: 'W League - Season 26 (2021)' },
  49: { badge: 'W27 (2022)', prefix: 'W', year: 2022, name: 'W League - Season 27 (2022)' },
  50: { badge: 'W28 (2023)', prefix: 'W', year: 2023, name: 'W League - Season 28 (2023)' },
  51: { badge: 'W29 (2024)', prefix: 'W', year: 2024, name: 'W League - Season 29 (2024)' },
  52: { badge: 'W30 (2025)', prefix: 'W', year: 2025, name: 'W League - Season 30 (2025)' },
  53: { badge: 'W31 (2026)', prefix: 'W', year: 2026, name: 'W League - Season 31 (2026)' },
  54: { badge: 'O02 (1928)', prefix: 'O', year: 1928, name: 'Original 6 - Season 2 (1928)' },
  55: { badge: 'O03 (1929)', prefix: 'O', year: 1929, name: 'Original 6 - Season 3 (1929)' },
  56: { badge: 'O04 (1930)', prefix: 'O', year: 1930, name: 'Original 6 - Season 4 (1930)' }
};

// Helper: Dynamically resolve accurate season badge, prefix, and year for ANY league_id (including 41+, O02, etc.)
const resolveSeasonInfo = (leagueId: number | string, dbLeagueName?: string, dbYear?: number): { badge: string; prefix: string; year: number; name: string } => {
  const numId = Number(leagueId);

  // 1. If dbLeagueName explicitly gives an O-league or custom level (e.g. "O02", "O03"), prioritize it
  if (dbLeagueName && /^O0*[2-9]/i.test(dbLeagueName.trim())) {
    const codeMatch = dbLeagueName.trim().match(/^O0*(\d+)/i);
    const sNum = codeMatch ? parseInt(codeMatch[1], 10) : 2;
    const yr = dbYear || (1926 + sNum);
    return {
      badge: `O${String(sNum).padStart(2, '0')} (${yr})`,
      prefix: 'O',
      year: yr,
      name: `Original 6 - Season ${sNum} (${yr})`
    };
  }

  // 2. Check known base map
  if (!isNaN(numId) && KNOWN_LEAGUE_SEASON_MAP[numId]) {
    const known = KNOWN_LEAGUE_SEASON_MAP[numId];
    if (dbLeagueName && dbLeagueName.includes('(') && /^[A-Z]+\d+/i.test(dbLeagueName.trim())) {
      return { ...known, badge: dbLeagueName.trim() };
    }
    return known;
  }

  // 2. Parse from dynamic dbLeagueName if provided (e.g. "W19", "O02", "W19 (2025)", "Original 6 - Season 2")
  let prefix = 'W';
  let seasonNumber = numId || 1;
  let year = dbYear || new Date().getFullYear();

  if (dbLeagueName) {
    const trimmed = dbLeagueName.trim();
    // Check if starts with a code like W19, O02, Q20, V02, G02
    const codeMatch = trimmed.match(/^([A-Za-z]+)\s*0*(\d+)/);
    if (codeMatch) {
      prefix = codeMatch[1].toUpperCase();
      seasonNumber = parseInt(codeMatch[2], 10);
    } else if (trimmed.toUpperCase().includes('ORIGINAL')) {
      prefix = 'O';
    } else if (trimmed.toUpperCase().includes('VINTAGE')) {
      prefix = 'V';
    } else if (trimmed.toUpperCase().includes('GOLDEN')) {
      prefix = 'G';
    } else if (trimmed.toUpperCase().includes('THE Q') || trimmed.toUpperCase().startsWith('Q')) {
      prefix = 'Q';
    }

    const yrMatch = trimmed.match(/\b(19\d\d|20\d\d)\b/);
    if (yrMatch) year = parseInt(yrMatch[1], 10);
  } else if (!isNaN(numId) && numId > 40) {
    // Dynamic formula for upcoming W-League seasons beyond 40 (e.g. 41 -> W19, 42 -> W20)
    prefix = 'W';
    seasonNumber = numId - 22; // 40 is W18 -> 41 is W19
    year = 2013 + (numId - 40);
  }

  const badge = `${prefix}${String(seasonNumber).padStart(2, '0')} (${year})`;
  const name = dbLeagueName || `${prefix === 'O' ? 'Original 6' : prefix === 'Q' ? 'The Q' : 'W League'} - Season ${seasonNumber} (${year})`;

  return { badge, prefix, year, name };
};

const parsePlayerOvr = (ratings: any): number | null => {
  if (!ratings) return null;
  try {
    const r = typeof ratings === 'string' ? JSON.parse(ratings) : ratings;
    const candidates = [r?.Ovr, r?.OVR, r?.OVERALL, r?.overall, r?.Overall, r?.ovr];
    for (const c of candidates) {
      const n = Number(c);
      if (!isNaN(n) && n > 0) return n;
    }
    return null;
  } catch {
    return null;
  }
};

// Player Portrait Component
const PlayerPortrait = ({ name, className = "w-20 h-20" }: { name: string; className?: string }) => {
  const filename = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
  const [imgSrc, setImgSrc] = useState(`${SUPABASE_URL}/storage/v1/object/public/${PORTRAIT_BUCKET}/${filename}.png`);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!name || name === 'N/A') {
      setHasError(true);
      return;
    }
    setHasError(false);
    setImgSrc(`${SUPABASE_URL}/storage/v1/object/public/${PORTRAIT_BUCKET}/${filename}.png`);
  }, [name, filename]);

  if (hasError || !name || name === 'N/A') {
    return (
      <div className={`${className} bg-neutral-900 border border-neutral-700 flex flex-col items-center justify-center text-neutral-400 shrink-0 font-sans shadow-inner`}>
        <UserCheck className="w-10 h-10 opacity-40 text-neutral-400" />
        <span className="text-[8px] uppercase font-bold tracking-wider mt-1 opacity-70">No Portrait</span>
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={name}
      className={`${className} object-cover bg-neutral-900 shrink-0`}
      onError={() => {
        if (imgSrc.endsWith('.png')) {
          setImgSrc(`${SUPABASE_URL}/storage/v1/object/public/${PORTRAIT_BUCKET}/${filename}.jpg`);
        } else {
          setHasError(true);
        }
      }}
    />
  );
};

// =========================================================================
// HOCKEY CARD SPOTLIGHT COMPONENT
// =========================================================================
function HockeyCardSpotlight({ draftItem, title = "OFFICIAL DRAFT CARD" }: { draftItem: DraftData | null; title?: string }) {
  if (!draftItem) {
    return (
      <div className="w-full max-w-[340px] mx-auto bg-gradient-to-b from-[#1c1f26] to-[#121418] text-white p-3.5 border-[3px] border-black rounded-xl shadow-[8px_8px_0px_rgba(0,0,0,1)] ring-1 ring-amber-400/30 text-center font-sans">
        <div className="border-2 border-dashed border-neutral-600/80 rounded-lg p-6 flex flex-col items-center justify-center min-h-[360px]">
          <Star className="w-10 h-10 text-amber-400/50 mb-3 animate-pulse" />
          <div className="text-xs font-black uppercase tracking-wider text-neutral-200 font-mono">
            ★ SPOTLIGHT CARD DECK ★
          </div>
          <p className="text-[11px] text-neutral-400 mt-1.5 italic max-w-[200px]">
            Click any pick on the draft floor to view their official hockey trading card!
          </p>
        </div>
      </div>
    );
  }

  const ratings = draftItem.ratings || {};
  const ovr = draftItem.ovr || 75;

  return (
    <div className="w-full max-w-[340px] mx-auto relative group">
      {/* 3D Trading Card Frame */}
      <div className="relative bg-gradient-to-b from-[#181a20] via-[#222630] to-[#0f1116] text-white p-3 sm:p-3.5 border-[3px] border-black rounded-xl shadow-[8px_8px_0px_rgba(0,0,0,1)] ring-1 ring-amber-400/60 overflow-hidden transition-all duration-200 hover:shadow-[10px_10px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5">
        
        {/* Holographic Header Foil Bar */}
        <div className="flex items-center justify-between border-b border-amber-400/40 pb-1.5 mb-2 font-mono text-[9px] uppercase tracking-wider">
          <div className="flex items-center gap-1.5 text-amber-300 font-black truncate">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">{draftItem.seasonBadge}</span>
          </div>
          <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-black font-black px-2 py-0.5 rounded-xs font-sans tracking-tight text-[8px] shrink-0 border border-black/40 shadow-xs">
            {title}
          </span>
        </div>

        {/* Main Framed Photo Box */}
        <div className="relative bg-gradient-to-t from-black via-neutral-900 to-neutral-800 border-2 border-amber-400/70 rounded-md p-1 mb-2.5 overflow-hidden shadow-inner">
          
          {/* Top Left Foil Badge: Draft Round & Overall Pick */}
          <div className="absolute top-2 left-2 z-20 bg-black/85 backdrop-blur-xs border border-amber-400/90 px-2 py-0.5 rounded-xs text-[9px] font-mono font-black uppercase text-amber-300 shadow-md flex items-center gap-1">
            <span>RD {draftItem.rd}</span>
            <span className="text-white/40">&bull;</span>
            <span className="text-white">PK #{draftItem.pk}</span>
          </div>

          {/* Top Right Gold Foil OVR Star Badge */}
          {draftItem.ovr && (
            <div className="absolute top-2 right-2 z-20 bg-gradient-to-b from-amber-300 via-amber-400 to-yellow-500 text-black border-2 border-black rounded-md px-2 py-0.5 text-center shadow-lg font-mono">
              <div className="text-[7px] font-black uppercase tracking-tighter leading-none text-black/80">OVR</div>
              <div className="text-base font-black leading-none">{draftItem.ovr}</div>
            </div>
          )}

          {/* Player Portrait */}
          <div className="relative w-full h-44 sm:h-48 flex items-center justify-center overflow-hidden rounded bg-neutral-950">
            <PlayerPortrait name={draftItem.player} className="w-full h-full object-cover" />
            
            {/* Vignette Shadow Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/25 pointer-events-none" />

            {/* Bottom Left Team Logo Foil Coin */}
            {draftItem.logo && (
              <div className="absolute bottom-2 left-2 z-20 w-10 h-10 bg-white/95 border-2 border-black rounded-full p-1 shadow-lg flex items-center justify-center ring-1 ring-amber-400">
                <img src={draftItem.logo} alt={draftItem.team} className="max-h-full max-w-full object-contain" />
              </div>
            )}

            {/* Position Ribbon on Photo */}
            {draftItem.pos && (
              <div className="absolute bottom-2 right-2 z-20 bg-black/90 border border-amber-400/80 text-amber-300 font-mono font-black text-[10px] px-2 py-0.5 rounded uppercase tracking-wider shadow-sm">
                POS: {draftItem.pos}
              </div>
            )}
          </div>
        </div>

        {/* Card Nameplate & Team Plate */}
        <div className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 border-2 border-amber-400/60 rounded p-2.5 mb-2 shadow-xs">
          <div className="text-[9px] font-mono uppercase font-bold text-amber-400 truncate tracking-wider">
            {draftItem.team}
          </div>
          <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white leading-tight truncate">
            {draftItem.player}
          </h2>
          <div className="text-[10px] font-sans text-neutral-300 truncate mt-0.5">
            <span className="text-neutral-400 font-bold">Pick Note:</span> {draftItem.transaction || 'Original Selection'}
          </div>
        </div>

        {/* Card Reverse / Scouting Attributes Matrix */}
        <div className="bg-black/70 border border-neutral-700/80 rounded p-2 mb-2 font-mono">
          <div className="flex justify-between items-center text-[8px] uppercase tracking-widest text-neutral-400 border-b border-neutral-800 pb-1 mb-1.5">
            <span className="flex items-center gap-1">
              <Star className="w-2.5 h-2.5 text-amber-400" />
              Scouting Ratings
            </span>
            <span className="text-amber-400 font-bold">1 - 6 Scale</span>
          </div>

          <div className="grid grid-cols-2 gap-x-2.5 gap-y-1">
            <CardAttribute label="AGI" value={ratings.Agility || Math.round(ovr / 16)} />
            <CardAttribute label="SPD" value={ratings.Speed || Math.round(ovr / 16)} />
            <CardAttribute label="PWR" value={ratings['Shot Power'] || ratings.Power || Math.round(ovr / 17)} />
            <CardAttribute label="ACC" value={ratings['Shot Accuracy'] || ratings.Accuracy || Math.round(ovr / 17)} />
            <CardAttribute label="PAS" value={ratings.Passing || Math.round(ovr / 16)} />
            <CardAttribute label="DEF" value={ratings.Defense || Math.round(ovr / 17)} />
          </div>
        </div>

        {/* Card Quick Action Links */}
        <div className="flex items-center justify-between gap-1.5 text-[10px] font-sans font-bold pt-0.5">
          <Link
            href={
              draftItem.player && draftItem.player !== 'N/A'
                ? `/players?q=${encodeURIComponent(draftItem.player)}${draftItem.playerId ? `&id=${encodeURIComponent(String(draftItem.playerId))}` : ''}`
                : '/players'
            }
            className="flex-1 bg-gradient-to-r from-amber-400 to-yellow-300 text-black py-1.5 px-2 text-center uppercase font-black hover:brightness-110 border border-black rounded-xs shadow-2xs flex items-center justify-center gap-1"
          >
            <Search className="w-3 h-3" />
            Player Profile
          </Link>
          <Link
            href={draftItem.teamId ? `/team/${draftItem.teamId}` : `/team`}
            className="flex-1 bg-neutral-800 text-white py-1.5 px-2 text-center uppercase font-bold hover:bg-neutral-700 border border-neutral-600 rounded-xs flex items-center justify-center gap-1"
          >
            <Shield className="w-3 h-3" />
            Team File
          </Link>
        </div>

      </div>
    </div>
  );
}

function CardAttribute({ label, value }: { label: string; value: any }) {
  const max = 6;
  const num = Math.max(1, Math.min(6, Math.round(Number(value) || 3)));
  const getColor = (v: number) => (v <= 2 ? "#ef4444" : v <= 4 ? "#f59e0b" : "#22c55e");

  return (
    <div className="flex items-center justify-between text-[9px] gap-1">
      <span className="text-neutral-400 font-bold w-7">{label}</span>
      <div className="flex gap-0.5 flex-1 max-w-[55px] bg-neutral-900 border border-neutral-700 p-0.5 rounded-2xs">
        {[...Array(max)].map((_, i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-3xs"
            style={{ backgroundColor: i < num ? getColor(num) : '#333333' }}
          />
        ))}
      </div>
      <span className="font-bold text-white w-3 text-right">{num}</span>
    </div>
  );
}

// =========================================================================
// MAIN DRAFT PAGE (Dynamic Discovery, Date Lock & Coach Turn Engine)
// =========================================================================
export default function DraftPage() {
  const { isLoggedIn, currentCoach, openLoginModal } = useCoachAuth();
  
  // Top-Level Mode: 'floor' (Draft Central), 'past' (Past Drafts Archive), 'capital' (Draft Capital)
  const [activeTab, setActiveTab] = useState<'floor' | 'past' | 'capital' | 'prospects'>('floor');

  // Core Data
  const [data, setData] = useState<DraftData[]>([]);
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [teamsMap, setTeamsMap] = useState<Map<number, TeamInfo>>(new Map());
  const [coachHandlesMap, setCoachHandlesMap] = useState<Map<number, string>>(new Map());
  const [standingsRows, setStandingsRows] = useState<any[]>([]);
  // Prospect pool for the active draft (Rookies + Free Agents not on a team from the previous season)
  const [rookiePool, setRookiePool] = useState<DatabasePlayer[]>([]);
  const [rookiePoolLoading, setRookiePoolLoading] = useState(false);
  const [rookieYearOverride, setRookieYearOverride] = useState<number | null>(null);
  const [prospectSearch, setProspectSearch] = useState('');
  const [prospectPos, setProspectPos] = useState<string>('ALL');
  const [prospectStatus, setProspectStatus] = useState<'ALL' | 'AVAILABLE' | 'DRAFTED'>('ALL');
  const [prospectTypeFilter, setProspectTypeFilter] = useState<'ALL' | 'ROOKIE' | 'FREE_AGENT'>('ALL');

  // Draft order generator (draft rounds worst -> best, waiver rounds best -> worst)
  const [draftRoundsInput, setDraftRoundsInput] = useState(2);
  const [waiverRoundsInput, setWaiverRoundsInput] = useState(3);
  const [isGeneratingOrder, setIsGeneratingOrder] = useState(false);
  const [tradesRows, setTradesRows] = useState<any[]>([]);
  const [pickOwnerOverrides, setPickOwnerOverrides] = useState<Record<string, number>>({});
  const [capitalLeagueId, setCapitalLeagueId] = useState<string>('41');
  const [isUploadingCapital, setIsUploadingCapital] = useState(false);
  const [loading, setLoading] = useState(true);

  // Single Draft Selection State
  const [floorLeague, setFloorLeague] = useState<string>('W');
  const [floorLeagueId, setFloorLeagueId] = useState<string>('41'); // Defaults to upcoming W19 (2014) draft
  const [showCapital, setShowCapital] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoundFilter, setSelectedRoundFilter] = useState<'ALL' | '1' | '2' | '3' | '4+'>('ALL');
  const [podium, setPodium] = useState<DraftData | null>(null);

  // Past Single Draft Selection State
  const [pastLeagueType, setPastLeagueType] = useState<string>('W');
  const [pastLeagueId, setPastLeagueId] = useState<string>('1');
  const [pastSearchQuery, setPastSearchQuery] = useState<string>('');

  // Coach Submission Desk State
  const [coachSearch, setCoachSearch] = useState('');
  const [coachSelectedPlayer, setCoachSelectedPlayer] = useState<DatabasePlayer | null>(null);
  const [coachTransactionNote, setCoachTransactionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState<string | null>(null);
  const [overridePickSlot, setOverridePickSlot] = useState<DraftData | null>(null);

  // Countdown timer clock state for draft lock & per-pick clock window (Rd 1 = 10m, Rd 2+ = 5m)
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [pickClockStartMs, setPickClockStartMs] = useState<number>(Date.now());
  const [isPickClockPaused, setIsPickClockPaused] = useState<boolean>(false);
  const [pausedRemainingMs, setPausedRemainingMs] = useState<number | null>(null);

  // Interval ticker for live countdown
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 1. Dynamic Load of Drafts, New League IDs (41+, O02), Teams, Coaches, and Player DB
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch all relevant tables in parallel (paginate league_drafts past Supabase's 1000-row default limit)
        const [
          draftsPage1Res,
          draftsPage2Res,
          draftsPage3Res,
          teamsRes,
          coachesRes,
          leaguesRes,
          seasonsRes,
          standingsRes,
          tradesRes,
          statsRes,
          schedRes
        ] = await Promise.all([
          supabase
            .from('league_drafts')
            .select('*, league_player_database (*), league_teams (*)')
            .order('draft_id', { ascending: true })
            .range(0, 999),
          supabase
            .from('league_drafts')
            .select('*, league_player_database (*), league_teams (*)')
            .order('draft_id', { ascending: true })
            .range(1000, 1999),
          supabase
            .from('league_drafts')
            .select('*, league_player_database (*), league_teams (*)')
            .order('draft_id', { ascending: true })
            .range(2000, 2999),
          supabase.from('league_teams').select('*'),
          supabase.from('league_coaches').select('*'),
          supabase.from('leagues').select('*'),
          supabase.from('league_seasons').select('*'),
          supabase.from('league_standings').select('season_id, team_id, pts, w, gd, gf'),
          supabase.from('league_trades').select('*'),
          supabase.from('league_gamestats').select('game_id, home_score, away_score, game_meta, league_id, home_team_id, away_team_id, home_stats, away_stats'),
          supabase.from('league_schedule').select('game_id, home_score, away_score, game_meta, league_id, home_team_id, away_team_id, played')
        ]);

        const rawDrafts = [
          ...(draftsPage1Res.data || []),
          ...(draftsPage2Res.data || []),
          ...(draftsPage3Res.data || [])
        ];
        const rawTeams = teamsRes.data || [];
        const rawCoaches = coachesRes.data || [];
        const rawLeagues = leaguesRes.data || [];
        const rawSeasons = seasonsRes.data || [];
        const rawStandings = standingsRes.data || [];
        const rawStats = statsRes.data || [];
        const rawSched = schedRes.data || [];
        setTradesRows(tradesRes.data || []);

        // Compute live standings from league_gamestats & league_schedule (same formula as /standings), falling back to league_standings
        const liveBySeasonTeam = new Map<string, { season_id: number; team_id: number; gp: number; w: number; pts: number; gf: number; ga: number; gd: number }>();
        const ensureRec = (sId: number, tId: number) => {
          const key = `${sId}-${tId}`;
          let r = liveBySeasonTeam.get(key);
          if (!r) {
            r = { season_id: sId, team_id: tId, gp: 0, w: 0, pts: 0, gf: 0, ga: 0, gd: 0 };
            liveBySeasonTeam.set(key, r);
          }
          return r;
        };
        const resolveSeasonTeam = (rawId: any, sId: number): number | null => {
          const num = Number(rawId);
          if (!num || num === 999 || num === 0 || num === 68) return null;
          const direct = rawTeams.find((t: any) => Number(t.team_id) === num && Number(t.league_id) === sId);
          if (direct) return Number(direct.team_id);
          const matchTeam = rawTeams.find((t: any) => Number(t.team_id) === num || Number(t.coach_id) === num);
          if (matchTeam) {
            const seasonMatch = rawTeams.find((t: any) =>
              Number(t.league_id) === sId &&
              (
                (t.abbreviation && t.abbreviation.trim().toUpperCase() === (matchTeam.abbreviation || '').trim().toUpperCase()) ||
                (t.team_name && t.team_name.trim().toUpperCase() === (matchTeam.team_name || '').trim().toUpperCase()) ||
                (Number(t.coach_id) > 0 && Number(t.coach_id) === Number(matchTeam.coach_id))
              )
            );
            if (seasonMatch) return Number(seasonMatch.team_id);
          }
          return num;
        };
        const applyGameToStandings = (sId: number, rawHId: any, rawAId: any, homeScore: number, awayScore: number, gameMeta: any, statsObj?: any) => {
          if (!sId) return;
          const hId = resolveSeasonTeam(rawHId, sId);
          const aId = resolveSeasonTeam(rawAId, sId);
          if (!hId || !aId || hId === aId) return;
          let isOT = false;
          let isTie = false;
          if (gameMeta) {
            try {
              const meta = typeof gameMeta === 'string' ? JSON.parse(gameMeta) : gameMeta;
              isOT = meta.is_ot === true || meta.is_ot === 'true' || meta.is_ot === 1 || meta.is_ot === '1' || meta.isOT === true || meta.isOT === 'true' || meta.isOT === 1;
              isTie = meta.is_tie === true || meta.is_tie === 'true' || meta.is_tie === 1 || meta.is_tie === '1';
            } catch {
              const lowStr = String(gameMeta || '').toLowerCase();
              isOT = lowStr.includes('"is_ot":true') || lowStr.includes('"is_ot":"true"') || lowStr.includes('"is_ot":1') || lowStr.includes('"isot":true') || lowStr.includes('"isot":"true"');
              isTie = lowStr.includes('"is_tie":true') || lowStr.includes('"is_tie":"true"') || lowStr.includes('"is_tie":1');
            }
          }
          if (!isOT && statsObj) {
            try {
              const hStats = typeof statsObj.home_stats === 'string' ? JSON.parse(statsObj.home_stats) : statsObj.home_stats;
              const aStats = typeof statsObj.away_stats === 'string' ? JSON.parse(statsObj.away_stats) : statsObj.away_stats;
              if (Number(hStats?.home_ot_goals) > 0 || Number(aStats?.away_ot_goals) > 0 || Number(hStats?.home_ot_shots) > 0 || Number(aStats?.away_ot_shots) > 0) {
                isOT = true;
              }
            } catch {}
          }
          if (homeScore === awayScore && !isOT) isTie = true;
          const hRec = ensureRec(sId, hId);
          const aRec = ensureRec(sId, aId);
          hRec.gp += 1;
          aRec.gp += 1;
          hRec.gf += homeScore;
          hRec.ga += awayScore;
          hRec.gd = hRec.gf - hRec.ga;
          aRec.gf += awayScore;
          aRec.ga += homeScore;
          aRec.gd = aRec.gf - aRec.ga;
          if (isTie) {
            hRec.pts += 1;
            aRec.pts += 1;
          } else if (homeScore > awayScore) {
            hRec.w += 1;
            hRec.pts += 2;
            if (isOT) aRec.pts += 1;
          } else if (awayScore > homeScore) {
            aRec.w += 1;
            aRec.pts += 2;
            if (isOT) hRec.pts += 1;
          }
        };
        const seenGameIds = new Set<string>();
        rawStats.forEach((st: any) => {
          seenGameIds.add(`${st.league_id}-${String(st.game_id).trim()}`);
          applyGameToStandings(Number(st.league_id), st.home_team_id, st.away_team_id, Number(st.home_score) || 0, Number(st.away_score) || 0, st.game_meta, st);
        });
        rawSched.forEach((gm: any) => {
          const gKey = `${gm.league_id}-${String(gm.game_id).trim()}`;
          const rawPlayed = String(gm.played || '').trim().toLowerCase();
          const isPlayed = rawPlayed === 'true' || rawPlayed === '1' || rawPlayed === 'y';
          if (isPlayed && !seenGameIds.has(gKey) && gm.game_meta) {
            applyGameToStandings(Number(gm.league_id), gm.home_team_id, gm.away_team_id, Number(gm.home_score) || 0, Number(gm.away_score) || 0, gm.game_meta, gm);
          }
        });
        const seasonsWithLive = new Set<number>();
        liveBySeasonTeam.forEach(r => {
          if (r.gp > 0) seasonsWithLive.add(r.season_id);
        });
        const mergedStandings = [
          ...rawStandings.filter((s: any) => !seasonsWithLive.has(Number(s.season_id))),
          ...Array.from(liveBySeasonTeam.values())
        ];
        setStandingsRows(mergedStandings);

        // Build coaches map (ID -> Name & Discord Handle/ID)
        const coachMap = new Map<number, string>();
        const handlesMap = new Map<number, string>();
        rawCoaches.forEach((c: any) => {
          const id = Number(c.coach_id ?? c.id);
          const name = String(c.coach_name ?? c.name ?? `Coach #${id}`).trim();
          coachMap.set(id, name);
          const dHandle = String(c.discord_id ?? c.discord_handle ?? '').trim();
          if (dHandle) handlesMap.set(id, dHandle);
        });
        setCoachHandlesMap(handlesMap);

        // Build teams map with coach linkage
        const compiledTeamsMap = new Map<number, TeamInfo>();
        rawTeams.forEach((t: any) => {
          const tId = Number(t.team_id);
          const cId = t.coach_id ? Number(t.coach_id) : null;
          const cName = t.coach_name || (cId && coachMap.get(cId)) || null;

          compiledTeamsMap.set(tId, {
            team_id: tId,
            team_name: t.team_name || `Team #${tId}`,
            abbreviation: t.abbreviation || 'TM',
            logo_url: t.logo_url || null,
            league_id: Number(t.league_id) || 1,
            coach_id: cId,
            coach_name: cName
          });
        });
        setTeamsMap(compiledTeamsMap);

        const combinedSeasonMap = new Map<string, SeasonOption>();

        // 1. Populate Known League Seasons
        Object.entries(KNOWN_LEAGUE_SEASON_MAP).forEach(([lId, meta]) => {
          combinedSeasonMap.set(String(lId), {
            leagueId: String(lId),
            seasonBadge: meta.badge,
            seasonName: meta.name,
            leagueType: meta.prefix,
            year: meta.year
          });
        });

        // 2. Process leagues table from database (includes draft dates / rules_json / league_level)
        rawLeagues.forEach((l: any) => {
          const lId = String(l.league_id !== undefined ? l.league_id : (l.id || l.season_id));
          let draftDate = l.draft_date || l.draft_datetime || l.start_date || null;
          let draftStarted = false;
          if (l.rules_json) {
            try {
              const r = typeof l.rules_json === 'string' ? JSON.parse(l.rules_json) : l.rules_json;
              draftDate = draftDate || r.draft_date || r.draft_datetime || r.draft_time;
              draftStarted = r.draft_started === true || String(r.draft_started).toLowerCase() === 'true';
            } catch {}
          }

          const rawName = l.league_level || l.league_name || l.name;
          const rawYr = l.nhl_year || l.year;
          const resolved = resolveSeasonInfo(lId, rawName, rawYr);

          // If a DB row defines O02/O03/O04 under a custom league_id, remove the placeholder ID (54/55/56) to avoid duplicates
          for (const [k, v] of combinedSeasonMap.entries()) {
            if (k !== lId && v.seasonBadge === resolved.badge) {
              combinedSeasonMap.delete(k);
            }
          }

          combinedSeasonMap.set(lId, {
            leagueId: lId,
            seasonBadge: resolved.badge,
            seasonName: resolved.name,
            leagueType: resolved.prefix,
            year: resolved.year,
            draftDate,
            status: l.status || null,
            draftStarted
          });
        });

        // 3. Process league_seasons table from database
        rawSeasons.forEach((s: any) => {
          const sId = String(s.league_id !== undefined ? s.league_id : s.id);
          let draftDate = s.draft_date || s.draft_datetime || s.start_date || null;
          const resolved = resolveSeasonInfo(sId, s.season_name, s.year);
          if (!combinedSeasonMap.has(sId) || draftDate) {
            combinedSeasonMap.set(sId, {
              leagueId: sId,
              seasonBadge: resolved.badge,
              seasonName: resolved.name,
              leagueType: resolved.prefix,
              year: resolved.year,
              draftDate: draftDate || combinedSeasonMap.get(sId)?.draftDate
            });
          }
        });

        // 4. AUTO-DISCOVER ANY NEW LEAGUE_ID BEYOND 40 DIRECTLY FROM LEAGUE_DRAFTS (e.g. 41 for W19, O02, etc.)
        rawDrafts.forEach((d: any) => {
          if (d.league_id) {
            const lId = String(d.league_id);
            if (!combinedSeasonMap.has(lId)) {
              const resolved = resolveSeasonInfo(lId, "", Number(d.year));
              combinedSeasonMap.set(lId, {
                leagueId: lId,
                seasonBadge: resolved.badge,
                seasonName: resolved.name,
                leagueType: resolved.prefix,
                year: resolved.year,
                draftDate: d.draft_date || d.draft_datetime || null
              });
            }
          }
        });

        // Sort seasons by year / leagueId descending (highest/newest first)
        const seasonList = Array.from(combinedSeasonMap.values()).sort((a, b) => {
          if (b.year !== a.year) return b.year - a.year;
          return Number(b.leagueId) - Number(a.leagueId);
        });
        setSeasons(seasonList);

        // Auto-select upcoming W19 (41) draft by default, or newest available draft
        if (seasonList.length > 0) {
          const w19 = seasonList.find(s => s.leagueId === '41') || seasonList[0];
          setFloorLeague(w19.leagueType);
          setFloorLeagueId(w19.leagueId);
        }

        const w01 = seasonList.find(s => s.leagueId === '1') || seasonList[seasonList.length - 1];
        if (w01) {
          setPastLeagueType(w01.leagueType);
          setPastLeagueId(w01.leagueId);
        }

        // Parse Draft Records
        if (rawDrafts.length > 0) {
          const parsedDrafts: DraftData[] = rawDrafts.map((d: any, index: number) => {
            const p = d.league_player_database;
            const t = d.league_teams;
            const ovr = parsePlayerOvr(p?.ratings);

            const pName = p?.player_name || "";
            const isFilled = pName && pName !== "N/A" && pName !== "-";
            const rawYear = Number(d.year) || 1995;

            let resolvedLeagueId = String(d.league_id || t?.league_id || "");
            if (!resolvedLeagueId || resolvedLeagueId === "0" || !combinedSeasonMap.has(resolvedLeagueId)) {
              const teamAbbr = String(t?.abbreviation || "").toUpperCase();
              const isO6 = ['BOS', 'CHI', 'DET', 'DTC', 'MTL', 'NYR', 'TOR'].includes(teamAbbr) || rawYear === 1927;
              
              if (isO6 || rawYear === 1927) resolvedLeagueId = "39";
              else if (rawYear === 1917) resolvedLeagueId = "20";
              else if (rawYear === 1980) resolvedLeagueId = "16";
              else if (rawYear === 2013) resolvedLeagueId = "40";
              else {
                const match = seasonList.find(s => s.year === rawYear);
                resolvedLeagueId = match ? match.leagueId : "1";
              }
            }

            const seasonMeta: any = combinedSeasonMap.get(resolvedLeagueId) || resolveSeasonInfo(resolvedLeagueId, "", rawYear);
            const rawTeamId = d.team_id ?? t?.team_id;
            const teamIdNum = rawTeamId !== undefined && rawTeamId !== null ? Number(rawTeamId) : undefined;
            const teamDetails = teamIdNum ? compiledTeamsMap.get(teamIdNum) : undefined;

            return {
              id: d.id || `draft-${resolvedLeagueId}-${d.round}-${d.pick_number}-${index}`,
              draftId: d.draft_id !== undefined && d.draft_id !== null ? Number(d.draft_id) : undefined,
              team: teamDetails?.team_name || t?.team_name || "Unknown Team",
              teamId: teamIdNum,
              coachId: teamDetails?.coach_id || t?.coach_id || null,
              coachName: teamDetails?.coach_name || t?.coach_name || null,
              rd: Number(d.round) || 1,
              pk: Number(d.pick_number) || (index + 1),
              player: isFilled ? pName : "N/A",
              playerId: p?.player_id,
              pos: p?.pos || (isFilled ? "F" : null),
              ovr: ovr,
              transaction: d.transaction_type || (isFilled ? "Original Selection" : "Open Capital Slot"),
              logo: teamDetails?.logo_url || t?.logo_url || "",
              year: seasonMeta.year,
              leagueId: resolvedLeagueId,
              seasonBadge: seasonMeta.seasonBadge || seasonMeta.badge,
              seasonName: seasonMeta.seasonName || seasonMeta.name,
              leagueType: seasonMeta.leagueType || seasonMeta.prefix,
              ratings: p?.ratings || null,
              playerInfo: p?.player_info || null
            };
          });

          // Sort drafts by league_id descending, then round, then pick
          parsedDrafts.sort((a, b) => {
            if (b.year !== a.year) return b.year - a.year;
            if (Number(b.leagueId) !== Number(a.leagueId)) return Number(b.leagueId) - Number(a.leagueId);
            if (a.rd !== b.rd) return a.rd - b.rd;
            return a.pk - b.pk;
          });

          setData(parsedDrafts);

          // Spotlight default: Pick #1
          const activeDraftPicks = parsedDrafts.filter(d => d.leagueId === seasonList[0]?.leagueId && d.player && d.player !== "N/A");
          if (activeDraftPicks.length > 0) {
            setPodium(activeDraftPicks[0]);
          } else {
            const firstValid = parsedDrafts.find(d => d.player && d.player !== "N/A");
            if (firstValid) setPodium(firstValid);
          }
        }

      } catch (err) {
        console.error("Failed to load draft floor:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Track which leagues have draft rows and which still have open pick slots
  const { completedDraftLeagues, openDraftLeagues } = useMemo(() => {
    const withRows = new Set<string>();
    const withFilled = new Set<string>();
    const open = new Set<string>();
    data.forEach(d => {
      withRows.add(d.leagueId);
      const isEmpty = !d.player || d.player === 'N/A' || d.player.trim() === '';
      if (isEmpty) {
        open.add(d.leagueId);
      } else {
        withFilled.add(d.leagueId);
      }
    });
    const completed = new Set<string>();
    withRows.forEach(lId => {
      const numId = Number(lId);
      const isHistoricalArchiveSeason = numId <= 38 && !['16', '20', '36', '39'].includes(String(lId));
      if (!open.has(lId) || (isHistoricalArchiveSeason && withFilled.has(lId))) {
        completed.add(lId);
      }
    });
    return { completedDraftLeagues: completed, openDraftLeagues: open };
  }, [data]);

  // Parse traded future draft picks from league_trades (chronological by 'trade id')
  // Key: `${year}-${round}-${ORIG_TEAM_ABBR}` -> Value: `${CURRENT_OWNER_ABBR}`
  const tradedPickOwnersByAbbr = useMemo(() => {
    const map = new Map<string, { currentOwnerAbbr: string; origAbbr: string; year: number; round: number; tradeId: any }>();
    const sortedTrades = [...tradesRows].sort((a, b) => (Number(a['trade id']) || 0) - (Number(b['trade id']) || 0));

    const processSide = (senderAbbrRaw: any, receiverAbbrRaw: any, assetsStrRaw: any, tradeId: any) => {
      const sender = String(senderAbbrRaw || '').trim().toUpperCase();
      const receiver = String(receiverAbbrRaw || '').trim().toUpperCase();
      const assetsStr = String(assetsStrRaw || '');
      if (!sender || !receiver || !assetsStr || assetsStr === 'NULL') return;

      const items = assetsStr.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
      items.forEach(item => {
        const lower = item.toLowerCase();
        const isPick =
          lower.includes('rdpk') ||
          lower.includes('round') ||
          lower.includes('pick') ||
          /\b(19\d\d|20\d\d)\s+(1st|2nd|3rd|4th|5th)\b/i.test(item);
        if (!isPick) return;

        const yrMatch = item.match(/\b(19\d\d|20\d\d)\b/);
        if (!yrMatch) return;
        const yr = parseInt(yrMatch[1], 10);

        let rd = 0;
        if (lower.includes('1st')) rd = 1;
        else if (lower.includes('2nd')) rd = 2;
        else if (lower.includes('3rd')) rd = 3;
        else if (lower.includes('4th')) rd = 4;
        else if (lower.includes('5th')) rd = 5;
        if (!rd) return;

        // Check if pick originated from another team: e.g. "(fromSAS)" or "(from BOS)"
        let origAbbr = sender;
        const fromMatch = item.match(/from\s*([A-Za-z]{2,4})/i);
        if (fromMatch) {
          origAbbr = fromMatch[1].toUpperCase();
        } else {
          // Or if sender had previously acquired a pick in that (yr, rd) and didn't specify, check if sender owns their own pick first
          const ownKey = `${yr}-${rd}-${sender}`;
          const existingOwn = map.get(ownKey);
          if (existingOwn && existingOwn.currentOwnerAbbr !== sender) {
            // Sender already traded their own pick; check if they hold another team's pick for this (yr, rd)
            for (const [, val] of map.entries()) {
              if (val.year === yr && val.round === rd && val.currentOwnerAbbr === sender) {
                origAbbr = val.origAbbr;
                break;
              }
            }
          }
        }

        const key = `${yr}-${rd}-${origAbbr}`;
        map.set(key, {
          currentOwnerAbbr: receiver,
          origAbbr,
          year: yr,
          round: rd,
          tradeId
        });
      });
    };

    sortedTrades.forEach(t => {
      processSide(t.team, t.team_1, t.trade, t['trade id']);
      processSide(t.team_1, t.team, t.trade_1, t['trade id']);
    });

    return map;
  }, [tradesRows]);

  // Filtered Season Options for Draft Floor & Past
  const availableFloorSeasons = useMemo(() => {
    const isPastArchiveSeason = (s: SeasonOption) => {
      const numId = Number(s.leagueId);
      if (completedDraftLeagues.has(s.leagueId)) return true;
      if (s.leagueType === 'W' && numId <= 40) return true;
      if (s.leagueType === 'O' && numId === 39) return true;
      if (s.leagueType === 'Q' && numId < 36) return true;
      return false;
    };
    const upcoming = seasons
      .filter(s => !isPastArchiveSeason(s) && (floorLeague === 'ALL' || s.leagueType === floorLeague))
      .sort((a, b) => Number(a.leagueId) - Number(b.leagueId));
    return upcoming.length > 0
      ? upcoming
      : seasons.filter(s => floorLeague === 'ALL' || s.leagueType === floorLeague);
  }, [seasons, floorLeague, completedDraftLeagues]);

  const availablePastSeasons = useMemo(() => {
    return seasons.filter(s => pastLeagueType === 'ALL' || s.leagueType === pastLeagueType);
  }, [seasons, pastLeagueType]);

  // Drafts that are live: upcoming/current drafts (e.g. W19 = 41, O02 = 54, or future seasons when opened)
  // Historical archive seasons (W01-W18, O01, and Q01-Q18) are excluded so they never clutter Live Drafts.
  const activeDrafts = useMemo(() => {
    return seasons
      .filter(s => {
        if (completedDraftLeagues.has(s.leagueId)) return false;
        const numId = Number(s.leagueId);
        // W01-W18 (<=40 in W), O01 (39 in O), and Q01-Q18 (<36 in Q) are completed seasons whose drafts belong in Past Drafts
        if (s.leagueType === 'W' && numId <= 40) return false;
        if (s.leagueType === 'O' && numId === 39) return false;
        if (s.leagueType === 'Q' && numId < 36) return false;
        const isO02 = s.seasonBadge.startsWith('O02') || s.leagueId === '54';
        return (
          s.leagueId === '41' ||
          isO02 ||
          String(s.status || '').toLowerCase() === 'active' ||
          (numId >= 41 && openDraftLeagues.has(s.leagueId))
        );
      })
      .sort((a, b) => Number(a.leagueId) - Number(b.leagueId));
  }, [seasons, completedDraftLeagues, openDraftLeagues]);

  useEffect(() => {
    if (completedDraftLeagues.has(floorLeagueId) && activeDrafts.length > 0) {
      setFloorLeague(activeDrafts[0].leagueType);
      setFloorLeagueId(activeDrafts[0].leagueId);
    }
    if (!completedDraftLeagues.has(pastLeagueId) && completedDraftLeagues.size > 0) {
      const newestCompleted = seasons.find(s => completedDraftLeagues.has(s.leagueId));
      if (newestCompleted) {
        setPastLeagueType(newestCompleted.leagueType);
        setPastLeagueId(newestCompleted.leagueId);
      }
    }
  }, [completedDraftLeagues, activeDrafts, floorLeagueId, pastLeagueId, seasons]);

  const switchToDraft = (s: SeasonOption) => {
    setFloorLeague(s.leagueType);
    setFloorLeagueId(s.leagueId);
    setOverridePickSlot(null);
    setCoachSelectedPlayer(null);
    setCoachSearch('');
    setActiveTab(prev => (prev === 'past' ? 'floor' : prev));
  };

  const activeFloorSeasonMeta = useMemo(() => {
    return seasons.find(s => s.leagueId === floorLeagueId) || seasons[0];
  }, [seasons, floorLeagueId]);

  const activePastSeasonMeta = useMemo(() => {
    return seasons.find(s => s.leagueId === pastLeagueId) || seasons[0];
  }, [seasons, pastLeagueId]);

  // =========================================================================
  // ROOKIE & FREE AGENT PROSPECT POOL
  // Includes:
  //   1. All Rookies (rookie = true) from rookieClassYear
  //   2. All Players in rookieClassYear who are NOT on a team from the previous season, pegged as Free Agents
  // =========================================================================
  const rookieClassYear = rookieYearOverride ?? (activeFloorSeasonMeta?.year || 2014);

  useEffect(() => {
    setRookieYearOverride(null);
  }, [floorLeagueId]);

  useEffect(() => {
    let cancelled = false;

    const normalizeProspectName = (name: string) =>
      String(name || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

    const normalizeWithFirstNameAlias = (name: string) => {
      const cleaned = String(name || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase()
        .replace(/[.'’-]/g, ' ')
        .replace(/\s+/g, ' ');
      const parts = cleaned.split(' ').filter(Boolean);
      if (parts.length < 2) return normalizeProspectName(name);
      const firstMap: Record<string, string> = {
        alexander: 'alex',
        michael: 'mike',
        matthew: 'matt',
        christopher: 'chris',
        nicholas: 'nick',
        niklas: 'nicklas',
        daniel: 'dan',
        steven: 'steve',
        stephen: 'steve',
        anthony: 'tony',
        thomas: 'tom',
        william: 'bill',
        robert: 'bob',
        edward: 'ed',
        joseph: 'joe',
        zachary: 'zach',
        bradley: 'brad',
        patrick: 'pat',
        samuel: 'sam',
        benjamin: 'ben',
        jonathan: 'jon',
        evgeny: 'evgeni'
      };
      const first = firstMap[parts[0]] || parts[0];
      return `${first}${parts.slice(1).join('')}`.replace(/[^a-z0-9]/g, '');
    };

    // Resolve the previous season's league_id for this draft class year
    const resolvePrevLeagueIdForYear = (yr: number): number => {
      const targetPrefix =
        yr >= 1920 && yr <= 1945
          ? 'O'
          : yr < 1920
            ? 'V'
            : rookieYearOverride === null && activeFloorSeasonMeta?.leagueType
              ? activeFloorSeasonMeta.leagueType
              : 'W';

      let bestLeagueId = targetPrefix === 'O' ? 39 : 40;
      let bestYear = -1;

      Object.entries(KNOWN_LEAGUE_SEASON_MAP).forEach(([idStr, meta]) => {
        const lid = Number(idStr);
        if (meta.prefix === targetPrefix && meta.year < yr) {
          if (meta.year > bestYear || (meta.year === bestYear && lid > bestLeagueId)) {
            bestYear = meta.year;
            bestLeagueId = lid;
          }
        }
      });

      seasons.forEach(s => {
        const lid = Number(s.leagueId);
        if (!isNaN(lid) && s.leagueType === targetPrefix && s.year < yr) {
          if (s.year > bestYear || (s.year === bestYear && lid > bestLeagueId)) {
            bestYear = s.year;
            bestLeagueId = lid;
          }
        }
      });

      return bestLeagueId;
    };

    async function loadRookies() {
      setRookiePoolLoading(true);
      const prevLeagueId = resolvePrevLeagueIdForYear(Number(rookieClassYear));

      const [page1Res, page2Res, prevRostersRes, prevStatsRes, prevDraftsRes] = await Promise.all([
        supabase
          .from('league_player_database')
          .select('player_id, player_name, pos, team_default, rookie, star_rating, ratings, player_info')
          .filter('player_info->>source_year', 'eq', String(rookieClassYear))
          .range(0, 999),
        supabase
          .from('league_player_database')
          .select('player_id, player_name, pos, team_default, rookie, star_rating, ratings, player_info')
          .filter('player_info->>source_year', 'eq', String(rookieClassYear))
          .range(1000, 1999),
        supabase
          .from('league_rosters')
          .select('player_id, player_name, team_id')
          .eq('league_id', prevLeagueId)
          .then(r => r, () => ({ data: null, error: null })),
        supabase
          .from('api_stats_with_names')
          .select('player_id, player_name')
          .eq('league_id', prevLeagueId)
          .then(r => r, () => ({ data: null, error: null })),
        supabase
          .from('league_drafts')
          .select('player_id, league_player_database(player_name)')
          .eq('league_id', prevLeagueId)
          .then(r => r, () => ({ data: null, error: null }))
      ]);

      if (cancelled) return;
      if (page1Res.error) {
        console.error('Failed to load prospect pool:', page1Res.error.message);
      }

      const rawRows = [...(page1Res.data || []), ...(page2Res.data || [])];

      // Build lookup sets of players who were on a team in the previous season
      const prevRosterNamesSet = new Set<string>();
      const prevRosterAliasSet = new Set<string>();
      const prevRosterIdsSet = new Set<string>();

      const addRosteredPlayer = (name?: string | null, id?: string | number | null) => {
        if (id !== undefined && id !== null && String(id) !== '0' && String(id) !== '1') {
          prevRosterIdsSet.add(String(id));
        }
        const trimmed = String(name || '').trim();
        if (!trimmed || trimmed === '--' || trimmed.toUpperCase() === 'N/A') return;
        const norm = normalizeProspectName(trimmed);
        if (norm) prevRosterNamesSet.add(norm);
        const alias = normalizeWithFirstNameAlias(trimmed);
        if (alias) prevRosterAliasSet.add(alias);
      };

      // 1. Static season rosters for W18 (Season 40) / W17 (Season 38) and O01 (Season 39)
      if (prevLeagueId === 40 || prevLeagueId === 38) {
        Object.values(W_LEAGUE_GOALIES || {}).forEach(list => (list || []).forEach(n => addRosteredPlayer(n)));
        Object.values(W_LEAGUE_SKATERS || {}).forEach(list => (list || []).forEach(n => addRosteredPlayer(n)));
      } else if (prevLeagueId === 39) {
        Object.values(O_LEAGUE_GOALIES || {}).forEach(list => (list || []).forEach(n => addRosteredPlayer(n)));
        Object.values(O_LEAGUE_SKATERS || {}).forEach(list => (list || []).forEach(n => addRosteredPlayer(n)));
      }

      // 2. Database league_rosters for the previous season
      (prevRostersRes.data || []).forEach((r: any) => {
        if (Number(r.team_id) > 0) {
          addRosteredPlayer(r.player_name, r.player_id);
        }
      });

      // 3. Database api_stats_with_names & league_drafts for the previous season
      (prevStatsRes.data || []).forEach((s: any) => {
        addRosteredPlayer(s.player_name, s.player_id);
      });
      (prevDraftsRes.data || []).forEach((d: any) => {
        const dName = Array.isArray(d.league_player_database)
          ? d.league_player_database[0]?.player_name
          : d.league_player_database?.player_name;
        addRosteredPlayer(dName, d.player_id);
      });

      // Filter & classify players in rookieClassYear:
      // - Exclude players already on a team from the previous season
      // - Keep Rookies (rookie === true) as ROOKIE
      // - Keep unrostered veterans (rookie !== true and not on a previous-season team) and peg them as FREE AGENT
      const dedupedByNormName = new Map<string, DatabasePlayer>();

      rawRows.forEach((p: any) => {
        const pName = String(p.player_name || '').trim();
        if (!pName || pName.toUpperCase() === 'N/A') return;

        const norm = normalizeProspectName(pName);
        const alias = normalizeWithFirstNameAlias(pName);
        const pIdStr = String(p.player_id);

        const isOnPrevSeasonTeam =
          prevRosterIdsSet.has(pIdStr) ||
          prevRosterNamesSet.has(norm) ||
          prevRosterAliasSet.has(alias);

        // Exclude anyone who was on a team in the previous season
        if (isOnPrevSeasonTeam) return;

        const isRookie = p.rookie === true || String(p.rookie).toLowerCase() === 'true';
        const isFreeAgent = !isRookie;
        const origTeam = p.player_info?.source_team || p.team_default || '';
        const ovr = parsePlayerOvr(p.ratings) || 0;

        const candidate: DatabasePlayer = {
          player_id: p.player_id,
          player_name: pName,
          pos: p.pos || 'F',
          team_default: isFreeAgent ? 'Free Agent' : (origTeam || 'Rookie'),
          orig_nhl_team: origTeam,
          rookie: isRookie,
          isFreeAgent,
          prospectType: isFreeAgent ? 'FREE AGENT' : 'ROOKIE',
          ratings: p.ratings,
          player_info: p.player_info,
          star_rating: p.star_rating,
          ovr
        };

        const existing = dedupedByNormName.get(norm);
        if (!existing || candidate.ovr > existing.ovr || (candidate.rookie && !existing.rookie)) {
          dedupedByNormName.set(norm, candidate);
        }
      });

      const pool = Array.from(dedupedByNormName.values());
      pool.sort((a, b) => b.ovr - a.ovr || a.player_name.localeCompare(b.player_name));
      setRookiePool(pool);
      setRookiePoolLoading(false);
    }
    loadRookies();
    return () => { cancelled = true; };
  }, [rookieClassYear, activeFloorSeasonMeta?.leagueType, rookieYearOverride, seasons]);

  // Rookies & Free Agents already selected in the active draft (player_id -> pick, plus normalized name match)
  const draftedPlayerMap = useMemo(() => {
    const map = new Map<string, DraftData>();
    const byNormName = new Map<string, DraftData>();
    const norm = (s: string) =>
      String(s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

    data.forEach(d => {
      if (d.leagueId !== floorLeagueId) return;
      if (!d.player || d.player === 'N/A' || d.player.trim() === '') return;
      if (d.playerId !== undefined && d.playerId !== null) {
        map.set(String(d.playerId), d);
      }
      const n = norm(d.player);
      if (n) byNormName.set(n, d);
    });

    // Also map any rookiePool entry whose normalized name matches a drafted player
    rookiePool.forEach(p => {
      const idKey = String(p.player_id);
      if (!map.has(idKey)) {
        const match = byNormName.get(norm(p.player_name));
        if (match) map.set(idKey, match);
      }
    });

    return map;
  }, [data, floorLeagueId, rookiePool]);

  const availableRookies = useMemo(
    () => rookiePool.filter(p => !draftedPlayerMap.has(String(p.player_id))),
    [rookiePool, draftedPlayerMap]
  );

  const rookieCountInPool = useMemo(
    () => rookiePool.filter(p => !p.isFreeAgent).length,
    [rookiePool]
  );

  const freeAgentCountInPool = useMemo(
    () => rookiePool.filter(p => p.isFreeAgent).length,
    [rookiePool]
  );

  const prospectPositions = useMemo(
    () => ['ALL', ...Array.from(new Set(rookiePool.map(p => p.pos))).sort()],
    [rookiePool]
  );

  const prospectRows = useMemo(() => {
    const q = prospectSearch.toLowerCase().trim();
    return rookiePool.filter(p => {
      const drafted = draftedPlayerMap.has(String(p.player_id));
      if (prospectStatus === 'AVAILABLE' && drafted) return false;
      if (prospectStatus === 'DRAFTED' && !drafted) return false;
      if (prospectTypeFilter === 'ROOKIE' && p.isFreeAgent) return false;
      if (prospectTypeFilter === 'FREE_AGENT' && !p.isFreeAgent) return false;
      if (prospectPos !== 'ALL' && p.pos !== prospectPos) return false;
      if (q) {
        const hay = `${p.player_name} ${p.pos} ${p.team_default} ${p.orig_nhl_team || ''} ${p.prospectType || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rookiePool, draftedPlayerMap, prospectSearch, prospectPos, prospectStatus, prospectTypeFilter]);

  // =========================================================================
  // DRAFT START BUTTON LOCK & COUNTDOWN LOGIC
  // A draft only starts when UltraMagnus clicks the Start Draft button for that specific leagueId.
  // =========================================================================
  // Exclusive check for Coach UltraMagnus's profile ONLY (allows starting/stopping drafts & making proxy selections)
  const isUltraMagnusAdmin = useMemo(() => {
    if (!isLoggedIn || !currentCoach) return false;
    const normName = String(currentCoach.coach_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const normEmail = String(currentCoach.email || '').toLowerCase().trim();
    return (
      Number(currentCoach.coach_id) === 15 ||
      normName === 'ultramagnus' ||
      normEmail === 'wn95hl@gmail.com'
    );
  }, [isLoggedIn, currentCoach]);

  const [isTogglingDraftStatus, setIsTogglingDraftStatus] = useState(false);

  // =========================================================================
  // LIVE DRAFT WAR ROOM PRESENCE (ONLINE COACHES COUNT) & REALTIME CHAT
  // =========================================================================
  const [myDraftPeerId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.sessionStorage.getItem('nhl95_draft_peer_id');
      if (saved) return saved;
      const generated = `draft_${Math.random().toString(36).slice(2, 10)}`;
      window.sessionStorage.setItem('nhl95_draft_peer_id', generated);
      return generated;
    }
    return `draft_${Math.random().toString(36).slice(2, 10)}`;
  });

  const [onlineDraftPresence, setOnlineDraftPresence] = useState<
    Array<{
      peerId: string;
      coachId?: number | null;
      coachName: string;
      isLoggedIn: boolean;
      activeDraft?: string;
      updatedAt: number;
    }>
  >([]);

  const [draftChatMessages, setDraftChatMessages] = useState<
    Array<{
      id: string;
      sender: string;
      text: string;
      draftBadge?: string;
      isSystem?: boolean;
      sentAt: number;
    }>
  >(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem('nhl95_draft_war_room_chat_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed.slice(-60);
        }
      } catch {}
    }
    return [];
  });
  const [draftChatInput, setDraftChatInput] = useState('');
  const draftChannelRef = useRef<any>(null);
  const draftChatEndRef = useRef<HTMLDivElement | null>(null);

  const myDraftPresencePayload = useMemo(() => {
    return {
      peerId: myDraftPeerId,
      coachId: currentCoach?.coach_id ?? null,
      coachName: isLoggedIn && currentCoach?.coach_name ? currentCoach.coach_name : 'Guest Scout',
      isLoggedIn: Boolean(isLoggedIn && currentCoach),
      activeDraft: activeFloorSeasonMeta?.seasonBadge || 'O02 (1928)',
      updatedAt: Date.now()
    };
  }, [myDraftPeerId, currentCoach, isLoggedIn, activeFloorSeasonMeta?.seasonBadge]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('nhl95_draft_war_room_chat_v1', JSON.stringify(draftChatMessages.slice(-60)));
      } catch {}
    }
  }, [draftChatMessages]);

  useEffect(() => {
    const channel = supabase.channel('nhl95-draft-war-room', {
      config: {
        presence: { key: myDraftPeerId },
        broadcast: { self: false, ack: false }
      }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const list: Array<{
          peerId: string;
          coachId?: number | null;
          coachName: string;
          isLoggedIn: boolean;
          activeDraft?: string;
          updatedAt: number;
        }> = [];
        Object.values(state).forEach((entries: any) => {
          if (Array.isArray(entries) && entries.length > 0) {
            list.push(entries[0]);
          }
        });
        // Deduplicate logged-in coaches by coachName (keeping self first)
        const seenCoaches = new Set<string>();
        const deduped = list.filter(entry => {
          if (entry.isLoggedIn && entry.coachName) {
            const key = entry.coachName.trim().toLowerCase();
            if (seenCoaches.has(key)) return false;
            seenCoaches.add(key);
          }
          return true;
        });
        deduped.sort((a, b) => {
          if (a.peerId === myDraftPeerId) return -1;
          if (b.peerId === myDraftPeerId) return 1;
          if (a.isLoggedIn && !b.isLoggedIn) return -1;
          if (!a.isLoggedIn && b.isLoggedIn) return 1;
          return a.coachName.localeCompare(b.coachName);
        });
        setOnlineDraftPresence(deduped);
      })
      .on('broadcast', { event: 'draft-chat' }, ({ payload }) => {
        if (!payload) return;
        setDraftChatMessages(prev => {
          if (prev.some(m => m.id === payload.id)) return prev;
          return [...prev.slice(-59), payload];
        });
      })
      .on('broadcast', { event: 'draft-pick-made' }, ({ payload }) => {
        if (!payload || !payload.newDraftRow) return;
        const incoming: DraftData = payload.newDraftRow;
        setData(prev => {
          const exists = prev.some(
            d => String(d.leagueId) === String(incoming.leagueId) && Number(d.pk) === Number(incoming.pk)
          );
          if (exists) {
            return prev.map(d =>
              String(d.leagueId) === String(incoming.leagueId) && Number(d.pk) === Number(incoming.pk)
                ? incoming
                : d
            );
          }
          return [incoming, ...prev];
        });
      })
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          await channel.track(myDraftPresencePayload);
        }
      });

    draftChannelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      draftChannelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myDraftPeerId]);

  useEffect(() => {
    if (draftChannelRef.current) {
      draftChannelRef.current.track(myDraftPresencePayload).catch(() => {});
    }
  }, [myDraftPresencePayload]);

  const loggedInDraftCoaches = useMemo(() => {
    const list = onlineDraftPresence.filter(p => p.isLoggedIn);
    if (isLoggedIn && currentCoach?.coach_name) {
      const hasSelf = list.some(
        p => p.coachName.trim().toLowerCase() === currentCoach.coach_name.trim().toLowerCase()
      );
      if (!hasSelf) {
        return [
          {
            peerId: myDraftPeerId,
            coachId: currentCoach.coach_id,
            coachName: currentCoach.coach_name,
            isLoggedIn: true,
            activeDraft: activeFloorSeasonMeta?.seasonBadge || 'O02 (1928)',
            updatedAt: Date.now()
          },
          ...list
        ];
      }
    }
    return list;
  }, [onlineDraftPresence, isLoggedIn, currentCoach, myDraftPeerId, activeFloorSeasonMeta?.seasonBadge]);

  const handleSendDraftChat = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draftChatInput.trim();
    if (!trimmed) return;
    const senderName = isLoggedIn && currentCoach?.coach_name ? currentCoach.coach_name : 'Guest Scout';
    const msg = {
      id: `dchat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      sender: senderName,
      text: trimmed,
      draftBadge: activeFloorSeasonMeta?.seasonBadge || 'Draft',
      isSystem: false,
      sentAt: Date.now()
    };
    setDraftChatMessages(prev => [...prev.slice(-59), msg]);
    setDraftChatInput('');
    draftChannelRef.current?.send({
      type: 'broadcast',
      event: 'draft-chat',
      payload: msg
    });
  };

  const activeDiscordChannelLabel = useMemo(() => {
    const badgeUpper = (activeFloorSeasonMeta?.seasonBadge || '').toUpperCase();
    const isO6 =
      (activeFloorSeasonMeta?.leagueType || '').toUpperCase() === 'O' ||
      badgeUpper.startsWith('O') ||
      Number(floorLeagueId) === 39 ||
      (Number(floorLeagueId) >= 54 && Number(floorLeagueId) <= 70);
    return isO6 ? 'Original 6 - Draft (#draft)' : 'The W - Draft (#draft-official)';
  }, [activeFloorSeasonMeta, floorLeagueId]);

  const [isPushingDiscordPick, setIsPushingDiscordPick] = useState(false);

  const handlePushPickToDiscord = async (pick: DraftData) => {
    if (!pick || !pick.player || pick.player === 'N/A') return;
    setIsPushingDiscordPick(true);
    try {
      const nextSlotAfterPick = projectedFloorRows.find(
        r =>
          (r.rd > pick.rd || (r.rd === pick.rd && r.pk > pick.pk)) &&
          (!r.player || r.player === 'N/A')
      );
      const discordNotification = {
        playerName: pick.player,
        pos: pick.pos,
        ovr: pick.ovr,
        teamName: pick.team,
        coachName: pick.coachName || null,
        logoUrl: pick.logo || null,
        round: pick.rd,
        pickNumber: pick.pk,
        seasonBadge: pick.seasonBadge || activeFloorSeasonMeta?.seasonBadge,
        leagueType: pick.leagueType || activeFloorSeasonMeta?.leagueType || floorLeague,
        leagueId: Number(pick.leagueId || floorLeagueId),
        transactionType: pick.transaction || 'Drafted',
        nextOnClock: nextSlotAfterPick
          ? {
              team: nextSlotAfterPick.team,
              teamId: nextSlotAfterPick.teamId,
              coachId: nextSlotAfterPick.coachId || null,
              coachName: nextSlotAfterPick.coachName || null,
              discordHandle:
                nextSlotAfterPick.coachId && coachHandlesMap.get(Number(nextSlotAfterPick.coachId))
                  ? coachHandlesMap.get(Number(nextSlotAfterPick.coachId))
                  : null,
              rd: nextSlotAfterPick.rd,
              pk: nextSlotAfterPick.pk,
              clockWindowMinutes: Number(nextSlotAfterPick.rd) === 1 ? 10 : 5
            }
          : null
      };

      const res = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'announce_pick',
          discordNotification
        })
      });
      const json = await res.json();
      const dRes = json?.discordResult;
      if (dRes?.posted) {
        setSubmitSuccessMessage(`📢 Pushed Pick #${pick.pk} (${pick.player} → ${pick.team}) to Discord: ${dRes.channelLabel}!`);
        setTimeout(() => setSubmitSuccessMessage(null), 5000);
      } else {
        setSubmitSuccessMessage(
          `📢 Pick #${pick.pk} (${pick.player}) queued for ${dRes?.channelLabel || activeDiscordChannelLabel} (Note: ensure DigitalHockeyOnline bot has the 'BOTS' role in Original 6 - Golden Era -> #draft).`
        );
        setTimeout(() => setSubmitSuccessMessage(null), 8000);
      }
    } catch (err: any) {
      alert(`Could not push pick to Discord: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsPushingDiscordPick(false);
    }
  };

  const handleToggleDraftStart = async (targetLeagueId: string, startNow: boolean) => {
    if (!isUltraMagnusAdmin) return;
    setIsTogglingDraftStatus(true);
    try {
      const res = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_draft_status',
          leagueId: Number(targetLeagueId),
          draftStarted: startNow
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update draft status');

      setSeasons(prev =>
        prev.map(s => (s.leagueId === String(targetLeagueId) ? { ...s, draftStarted: startNow } : s))
      );

      if (startNow) {
        setPickClockStartMs(Date.now());
        setIsPickClockPaused(false);
        setPausedRemainingMs(null);
      }
    } catch (err: any) {
      alert(`Could not update draft status: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsTogglingDraftStatus(false);
    }
  };

  const draftLockStatus = useMemo(() => {
    const isStarted = Boolean(activeFloorSeasonMeta?.draftStarted);

    if (isStarted) {
      return { isLocked: false, reason: 'STARTED' as const, timeRemaining: null, targetDate: null };
    }

    if (activeFloorSeasonMeta?.draftDate) {
      const targetDate = new Date(activeFloorSeasonMeta.draftDate);
      const targetMs = targetDate.getTime();
      if (!isNaN(targetMs)) {
        const diff = targetMs - currentTime;
        if (diff > 0) {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
          const minutes = Math.floor((diff / (1000 * 60)) % 60);
          const seconds = Math.floor((diff / 1000) % 60);
          return {
            isLocked: true,
            reason: 'NOT_STARTED' as const,
            timeRemaining: { days, hours, minutes, seconds, totalMs: diff },
            targetDate
          };
        }
      }
    }

    // Even without a scheduled date, the draft stays locked until UltraMagnus clicks Start Draft
    return {
      isLocked: true,
      reason: 'NOT_STARTED' as const,
      timeRemaining: null,
      targetDate: null
    };
  }, [activeFloorSeasonMeta, currentTime]);

  // Handle switching League tier on Draft Floor
  const handleFloorLeagueChange = (newLeagueType: string) => {
    setFloorLeague(newLeagueType);
    if (newLeagueType === 'W' || newLeagueType === 'ALL') {
      const w19 = seasons.find(s => s.leagueId === '41');
      if (w19) {
        setFloorLeagueId(w19.leagueId);
        return;
      }
    }
    if (newLeagueType === 'O') {
      const o02 = seasons.find(s => s.seasonBadge.startsWith('O02') || s.leagueId === '54');
      if (o02) {
        setFloorLeagueId(o02.leagueId);
        return;
      }
    }
    const matches = seasons
      .filter(s => newLeagueType === 'ALL' || s.leagueType === newLeagueType)
      .sort((a, b) => Number(a.leagueId) - Number(b.leagueId));
    if (matches.length > 0) {
      setFloorLeagueId(matches[0].leagueId);
    }
  };

  const handlePastLeagueChange = (newLeagueType: string) => {
    setPastLeagueType(newLeagueType);
    const matches = seasons.filter(s => newLeagueType === 'ALL' || s.leagueType === newLeagueType);
    if (matches.length > 0) {
      setPastLeagueId(matches[0].leagueId);
    }
  };

  // Sync Podium Spotlight when switching Single Drafts
  useEffect(() => {
    if (data.length === 0) return;

    if (activeTab === 'floor') {
      const currentDraftPicks = data.filter(d => d.leagueId === floorLeagueId && d.player && d.player !== 'N/A');
      if (currentDraftPicks.length > 0) {
        if (!podium || podium.leagueId !== floorLeagueId) {
          setPodium(currentDraftPicks[0]);
        }
      }
    } else if (activeTab === 'past') {
      const currentPastPicks = data.filter(d => d.leagueId === pastLeagueId && d.player && d.player !== 'N/A');
      if (currentPastPicks.length > 0) {
        if (!podium || podium.leagueId !== pastLeagueId) {
          setPodium(currentPastPicks[0]);
        }
      }
    }
  }, [floorLeagueId, pastLeagueId, activeTab, data]);

  // Helper to compute projected draft/capital slots (including traded picks from league_trades & manual overrides) for any leagueId
  const buildDraftSlotsForLeague = React.useCallback((targetLeagueId: string): Array<DraftData & { origTeamId?: number; origTeamAbbr?: string; origTeamName?: string }> => {
    if (teamsMap.size === 0) return [];
    const leagueIdNum = Number(targetLeagueId);
    const meta: any = seasons.find(s => s.leagueId === targetLeagueId) || resolveSeasonInfo(targetLeagueId);
    const targetType = meta?.leagueType || meta?.prefix || 'W';

    let sourceLeagueId = leagueIdNum;
    let teamIds = Array.from(teamsMap.values())
      .filter(t => t.league_id === sourceLeagueId)
      .map(t => t.team_id);

    if (teamIds.length === 0) {
      const prevSeasons = seasons
        .filter(s => s.leagueType === targetType && Number(s.leagueId) < leagueIdNum)
        .sort((a, b) => Number(b.leagueId) - Number(a.leagueId));
      for (const ps of prevSeasons) {
        const candidateIds = Array.from(teamsMap.values())
          .filter(t => t.league_id === Number(ps.leagueId))
          .map(t => t.team_id);
        if (candidateIds.length > 0) {
          sourceLeagueId = Number(ps.leagueId);
          teamIds = candidateIds;
          break;
        }
      }
    }

    if (teamIds.length === 0 && targetType === 'O') {
      const o6Abbrs = new Set(['BOS', 'CHI', 'DET', 'DTC', 'MTL', 'NYR', 'TOR']);
      const o6Teams = Array.from(teamsMap.values()).filter(
        t => t.league_id === 39 || o6Abbrs.has((t.abbreviation || '').trim().toUpperCase())
      );
      if (o6Teams.length > 0) {
        sourceLeagueId = 39;
        teamIds = o6Teams.map(t => t.team_id);
      }
    }

    if (teamIds.length === 0) return [];

    const activeLeagueTeams = teamIds.map(id => teamsMap.get(id)).filter(Boolean) as TeamInfo[];
    const teamByAbbr = new Map<string, TeamInfo>();
    activeLeagueTeams.forEach(t => {
      if (t.abbreviation) teamByAbbr.set(t.abbreviation.trim().toUpperCase(), t);
    });

    let seasonStandings = standingsRows.filter(s => Number(s.season_id) === leagueIdNum);
    if (seasonStandings.length === 0 && sourceLeagueId !== leagueIdNum) {
      seasonStandings = standingsRows.filter(s => Number(s.season_id) === sourceLeagueId);
    }
    const standingByTeam = new Map<number, any>(seasonStandings.map((s: any) => [Number(s.team_id), s]));
    const num = (v: any) => Number(v) || 0;

    const bestFirst = [...teamIds].sort((a, b) => {
      const sa = standingByTeam.get(a);
      const sb = standingByTeam.get(b);
      return (
        (num(sb?.pts) - num(sa?.pts)) ||
        (num(sb?.w) - num(sa?.w)) ||
        (num(sb?.gd) - num(sa?.gd)) ||
        (num(sb?.gf) - num(sa?.gf)) ||
        (a - b)
      );
    });
    const worstFirst = [...bestFirst].reverse();

    const draftRounds = Math.max(1, Math.floor(Number(draftRoundsInput)) || 2);
    const waiverRounds = Math.max(0, Math.floor(Number(waiverRoundsInput)) || 3);
    const slotYear = meta?.year || 2014;
    const sBadge = (meta as any)?.seasonBadge || (meta as any)?.badge || `Season ${targetLeagueId}`;
    const sName = (meta as any)?.seasonName || (meta as any)?.name || `Season ${targetLeagueId}`;

    const out: Array<DraftData & { origTeamId?: number; origTeamAbbr?: string; origTeamName?: string }> = [];
    let pk = 1;
    for (let rd = 1; rd <= draftRounds + waiverRounds; rd++) {
      const isWaiver = rd > draftRounds;
      (isWaiver ? bestFirst : worstFirst).forEach(origId => {
        const origTeam = teamsMap.get(origId);
        const origAbbr = (origTeam?.abbreviation || '').trim().toUpperCase();
        let ownerTeam = origTeam;
        let txNote = isWaiver ? 'Waiver Slot' : 'Draft Slot';

        if (!isWaiver) {
          const overrideKey = `${slotYear}-${rd}-${origId}`;
          if (pickOwnerOverrides[overrideKey]) {
            const overTeam = teamsMap.get(pickOwnerOverrides[overrideKey]);
            if (overTeam) {
              ownerTeam = overTeam;
              if (overTeam.team_id !== origId) {
                txNote = `Traded from ${origAbbr || origTeam?.team_name}`;
              }
            }
          } else if (origAbbr) {
            const tradeMatch = tradedPickOwnersByAbbr.get(`${slotYear}-${rd}-${origAbbr}`);
            if (tradeMatch && tradeMatch.currentOwnerAbbr !== origAbbr) {
              const matchedOwner = teamByAbbr.get(tradeMatch.currentOwnerAbbr);
              if (matchedOwner) {
                ownerTeam = matchedOwner;
                txNote = `Traded from ${origAbbr}`;
              }
            }
          }
        }

        out.push({
          id: `proj-${targetLeagueId}-${rd}-${pk}`,
          team: ownerTeam?.team_name || `Team #${origId}`,
          teamId: ownerTeam?.team_id ?? origId,
          coachId: ownerTeam?.coach_id || null,
          coachName: ownerTeam?.coach_name || null,
          origTeamId: origId,
          origTeamAbbr: origAbbr,
          origTeamName: origTeam?.team_name,
          rd,
          pk: pk++,
          player: 'N/A',
          pos: null,
          ovr: null,
          transaction: txNote,
          logo: ownerTeam?.logo_url || '',
          year: slotYear,
          leagueId: targetLeagueId,
          seasonBadge: sBadge,
          seasonName: sName,
          leagueType: targetType
        });
      });
    }
    return out;
  }, [teamsMap, seasons, standingsRows, draftRoundsInput, waiverRoundsInput, pickOwnerOverrides, tradedPickOwnersByAbbr]);

  // Auto-computed draft order (from standings & teams of the active/previous season) merged with any persisted DB rows for this draft
  const projectedFloorRows = useMemo<DraftData[]>(() => {
    const existingForLeague = data.filter(d => d.leagueId === floorLeagueId);
    const builtSlots = buildDraftSlotsForLeague(floorLeagueId);
    if (existingForLeague.length === 0) return builtSlots;
    if (existingForLeague.length >= builtSlots.length) return existingForLeague;
    const byPk = new Map<number, DraftData>();
    existingForLeague.forEach(row => byPk.set(row.pk, row));
    const merged = builtSlots.map(slot => byPk.get(slot.pk) || slot);
    existingForLeague.forEach(row => {
      if (!builtSlots.some(s => s.pk === row.pk)) {
        merged.push(row);
      }
    });
    return merged.sort((a, b) => a.pk - b.pk);
  }, [data, floorLeagueId, buildDraftSlotsForLeague]);

  // Selected picks already made in the active draft on the floor
  const selectedPicksForFloor = useMemo<DraftData[]>(() => {
    return projectedFloorRows.filter(d => d.player && d.player !== 'N/A' && d.player.trim() !== '');
  }, [projectedFloorRows]);

  // Filtered Draft Floor Data (1 Draft at a time)
  // Always keeps selected picks visible alongside open slots by default (or filters to Selected Picks Only when toggled)
  const filteredData = useMemo(() => {
    return projectedFloorRows.filter(d => {
      const isCapitalRow = !d.player || d.player === "N/A" || d.player.trim() === "";
      if (showCapital && isCapitalRow) return false;
      
      if (searchQuery.trim()) {
        const search = searchQuery.toLowerCase().trim();
        const matchSearch = 
          d.team.toLowerCase().includes(search) || 
          d.player.toLowerCase().includes(search) ||
          (d.coachName && d.coachName.toLowerCase().includes(search)) ||
          (d.pos && d.pos.toLowerCase().includes(search)) ||
          d.pk.toString().includes(search);
        if (!matchSearch) return false;
      }

      if (selectedRoundFilter === '1') return d.rd === 1;
      if (selectedRoundFilter === '2') return d.rd === 2;
      if (selectedRoundFilter === '3') return d.rd === 3;
      if (selectedRoundFilter === '4+') return d.rd >= 4;

      return true;
    });
  }, [projectedFloorRows, showCapital, searchQuery, selectedRoundFilter]);

  // =========================================================================
  // 1ST OVERALL PICK & ON-THE-CLOCK SELECTION LINKED BY TEAM_ID & COACH_ID
  // =========================================================================

  // Round 1 Pick 1 (First Overall Selection)
  const firstOverallPick = useMemo(() => {
    return projectedFloorRows.find(d => d.rd === 1 && d.pk === 1) || null;
  }, [projectedFloorRows]);

  // Identify Current "On The Clock" Pick Slot
  const nextEmptyPickSlot = useMemo(() => {
    if (overridePickSlot && overridePickSlot.leagueId === floorLeagueId) return overridePickSlot;
    
    const emptySlot = projectedFloorRows.find(d => !d.player || d.player === "N/A" || d.player.trim() === "");
    if (emptySlot) return emptySlot;
    const singleDraftRows = projectedFloorRows;

    const currentMeta = activeFloorSeasonMeta;
    const maxPick = singleDraftRows.reduce((max, d) => Math.max(max, d.pk), 0);
    const roundNumber = Math.floor(maxPick / 16) + 1;

    return {
      team: "Team On Clock",
      rd: roundNumber,
      pk: maxPick + 1,
      player: "N/A",
      pos: null,
      ovr: null,
      transaction: "Upcoming Selection",
      logo: "",
      year: currentMeta?.year || 2013,
      leagueId: floorLeagueId,
      seasonBadge: currentMeta?.seasonBadge || `Season ${floorLeagueId}`,
      seasonName: currentMeta?.seasonName || `Season ${floorLeagueId}`,
      leagueType: currentMeta?.leagueType || 'W'
    } as DraftData;
  }, [projectedFloorRows, floorLeagueId, overridePickSlot, activeFloorSeasonMeta]);

  // Keep Spotlight Card synced to active draft class (either first pick made, or #1 available prospect for the team on the clock)
  useEffect(() => {
    if (activeTab !== 'floor') return;
    const currentDraftPicks = data.filter(d => d.leagueId === floorLeagueId && d.player && d.player !== 'N/A');
    if (currentDraftPicks.length > 0) {
      if (!podium || podium.leagueId !== floorLeagueId) {
        setPodium(currentDraftPicks[0]);
      }
      return;
    }
    if (availableRookies.length > 0 && (!podium || podium.leagueId !== floorLeagueId || podium.player === 'N/A')) {
      const topProspect = availableRookies[0];
      setPodium({
        team: nextEmptyPickSlot.team,
        teamId: nextEmptyPickSlot.teamId,
        coachId: nextEmptyPickSlot.coachId,
        coachName: nextEmptyPickSlot.coachName,
        rd: nextEmptyPickSlot.rd,
        pk: nextEmptyPickSlot.pk,
        player: topProspect.player_name,
        playerId: topProspect.player_id,
        pos: topProspect.pos,
        ovr: topProspect.ovr,
        transaction: 'Top Available Prospect',
        logo: nextEmptyPickSlot.logo,
        year: nextEmptyPickSlot.year,
        leagueId: floorLeagueId,
        seasonBadge: nextEmptyPickSlot.seasonBadge,
        seasonName: nextEmptyPickSlot.seasonName,
        leagueType: nextEmptyPickSlot.leagueType,
        ratings: topProspect.ratings,
        playerInfo: topProspect.player_info
      });
    }
  }, [activeTab, floorLeagueId, data, availableRookies, nextEmptyPickSlot, podium]);

  // =========================================================================
  // PICK CLOCK WINDOW ENGINE (Round 1 = 10 Min Window, Round 2+ = 5 Min Window)
  // =========================================================================
  const pickWindowMinutes = useMemo(() => {
    return Number(nextEmptyPickSlot?.rd) === 1 ? 10 : 5;
  }, [nextEmptyPickSlot?.rd]);

  const pickWindowTotalMs = pickWindowMinutes * 60 * 1000;
  const pickClockStorageKey = `nhl95_draft_clock_${floorLeagueId}_${nextEmptyPickSlot?.rd || 1}_${nextEmptyPickSlot?.pk || 1}`;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(pickClockStorageKey);
    if (saved) {
      const parsed = Number(saved);
      if (!isNaN(parsed) && parsed > 0) {
        setPickClockStartMs(parsed);
        setIsPickClockPaused(false);
        setPausedRemainingMs(null);
        return;
      }
    }
    const now = Date.now();
    window.localStorage.setItem(pickClockStorageKey, String(now));
    setPickClockStartMs(now);
    setIsPickClockPaused(false);
    setPausedRemainingMs(null);
  }, [pickClockStorageKey]);

  const pickClockRemainingMs = useMemo(() => {
    if (isPickClockPaused && pausedRemainingMs !== null) {
      return Math.max(0, pausedRemainingMs);
    }
    const elapsed = Math.max(0, currentTime - pickClockStartMs);
    return Math.max(0, pickWindowTotalMs - elapsed);
  }, [currentTime, pickClockStartMs, pickWindowTotalMs, isPickClockPaused, pausedRemainingMs]);

  const pickClockMinutesStr = String(Math.floor(pickClockRemainingMs / 60000)).padStart(2, '0');
  const pickClockSecondsStr = String(Math.floor((pickClockRemainingMs % 60000) / 1000)).padStart(2, '0');
  const pickClockPct = Math.max(0, Math.min(100, (pickClockRemainingMs / pickWindowTotalMs) * 100));
  const isPickClockExpired = pickClockRemainingMs <= 0;

  const resetPickClock = () => {
    const now = Date.now();
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(pickClockStorageKey, String(now));
    }
    setPickClockStartMs(now);
    setIsPickClockPaused(false);
    setPausedRemainingMs(null);
  };

  const togglePickClockPause = () => {
    if (isPickClockPaused) {
      const remaining = pausedRemainingMs ?? pickWindowTotalMs;
      const newStart = Date.now() - (pickWindowTotalMs - remaining);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(pickClockStorageKey, String(newStart));
      }
      setPickClockStartMs(newStart);
      setIsPickClockPaused(false);
      setPausedRemainingMs(null);
    } else {
      const elapsed = Math.max(0, Date.now() - pickClockStartMs);
      setPausedRemainingMs(Math.max(0, pickWindowTotalMs - elapsed));
      setIsPickClockPaused(true);
    }
  };

  // Check if Currently Logged-in Coach is On The Clock
  const isCurrentCoachOnClock = useMemo(() => {
    if (!isLoggedIn || !currentCoach) return false;
    if (!nextEmptyPickSlot) return false;

    // Check by coach_id match
    if (nextEmptyPickSlot.coachId && Number(nextEmptyPickSlot.coachId) === Number(currentCoach.coach_id)) {
      return true;
    }
    // Check by coach_name match
    if (nextEmptyPickSlot.coachName && nextEmptyPickSlot.coachName.trim().toLowerCase() === currentCoach.coach_name.trim().toLowerCase()) {
      return true;
    }

    return false;
  }, [isLoggedIn, currentCoach, nextEmptyPickSlot]);

  // Past Drafts Filtered Records
  const pastDraftsData = useMemo(() => {
    return data.filter(d => {
      if (d.leagueId !== pastLeagueId) return false;
      if (!d.player || d.player === "N/A") return false;

      if (pastSearchQuery.trim()) {
        const q = pastSearchQuery.toLowerCase().trim();
        const matches = 
          d.player.toLowerCase().includes(q) ||
          d.team.toLowerCase().includes(q) ||
          (d.coachName && d.coachName.toLowerCase().includes(q)) ||
          (d.pos && d.pos.toLowerCase().includes(q)) ||
          d.pk.toString().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [data, pastLeagueId, pastSearchQuery]);

  const pastDraftStats = useMemo(() => {
    if (pastDraftsData.length === 0) {
      return { count: 0, avgOvr: 0, topPick: null, topPosition: 'N/A' };
    }
    const withOvr = pastDraftsData.filter(d => d.ovr !== null && d.ovr > 0);
    const avg = withOvr.length > 0 
      ? Math.round(withOvr.reduce((acc, d) => acc + (d.ovr || 0), 0) / withOvr.length) 
      : 0;

    const topPick = [...pastDraftsData].sort((a, b) => (b.ovr || 0) - (a.ovr || 0))[0];

    const posCounts: Record<string, number> = {};
    pastDraftsData.forEach(d => {
      if (d.pos) posCounts[d.pos] = (posCounts[d.pos] || 0) + 1;
    });
    let topPos = 'F';
    let maxPosCount = 0;
    Object.entries(posCounts).forEach(([pos, cnt]) => {
      if (cnt > maxPosCount) {
        maxPosCount = cnt;
        topPos = pos;
      }
    });

    return {
      count: pastDraftsData.length,
      avgOvr: avg,
      topPick,
      topPosition: topPos
    };
  }, [pastDraftsData]);

  const filteredDbPlayers = useMemo(() => {
    if (!coachSearch.trim()) return availableRookies.slice(0, 10);
    const q = coachSearch.toLowerCase().trim();
    return availableRookies
      .filter(
        p =>
          p.player_name.toLowerCase().includes(q) ||
          p.pos.toLowerCase().includes(q) ||
          p.team_default.toLowerCase().includes(q) ||
          (p.orig_nhl_team || '').toLowerCase().includes(q) ||
          (p.prospectType || '').toLowerCase().includes(q)
      )
      .slice(0, 14);
  }, [availableRookies, coachSearch]);

  // Only the coach that owns the pick on the clock — OR Coach UltraMagnus (acting on behalf of a coach unable to pick) — may submit it.
  // (If the franchise has no linked coach, any signed-in coach may submit.)
  const slotHasCoach = !!(nextEmptyPickSlot.coachId || nextEmptyPickSlot.coachName);
  const coachMayPickNow = isLoggedIn && !!currentCoach && (!slotHasCoach || isCurrentCoachOnClock || isUltraMagnusAdmin);

  // Handle Coach Pick Submission: fills the pre-generated slot in league_drafts
  const handleSubmitPick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (draftLockStatus.isLocked) {
      alert(
        draftLockStatus.targetDate
          ? `The ${activeFloorSeasonMeta?.seasonBadge} draft is locked until ${draftLockStatus.targetDate.toLocaleString()} (or until started by the Commissioner).`
          : `The ${activeFloorSeasonMeta?.seasonBadge} draft is currently on standby and has not been started yet.`
      );
      return;
    }
    if (!isLoggedIn) {
      openLoginModal('Draft Submissions');
      return;
    }

    const targetSlot = nextEmptyPickSlot;
    if (!coachMayPickNow) {
      alert(`It is ${targetSlot.team}'s pick${targetSlot.coachName ? ` (Coach ${targetSlot.coachName})` : ''}. Only that coach can submit it.`);
      return;
    }
    if (!coachSelectedPlayer) {
      alert('Please select a rookie from the prospect pool.');
      return;
    }

    setIsSubmitting(true);
    try {
      const player = coachSelectedPlayer;

      // Make sure nobody else has already taken this rookie in this draft
      const { data: taken, error: takenErr } = await supabase
        .from('league_drafts')
        .select('draft_id')
        .eq('league_id', Number(targetSlot.leagueId))
        .eq('player_id', player.player_id)
        .limit(1);
      if (takenErr) throw takenErr;
      if (taken && taken.length > 0) {
        alert(`${player.player_name} has already been selected in this draft. Please choose another player.`);
        return;
      }

      const isWaiverPick = (targetSlot.transaction || '').toLowerCase().startsWith('waiver');
      const transaction = coachTransactionNote.trim() || (isWaiverPick ? 'Waiver' : 'Drafted');

      // Find the next empty slot on the clock after this pick
      const nextSlotAfterThis = projectedFloorRows.find(
        r =>
          (r.rd > targetSlot.rd || (r.rd === targetSlot.rd && r.pk > targetSlot.pk)) &&
          (!r.player || r.player === 'N/A')
      );

      const discordNotification = {
        playerName: player.player_name,
        pos: player.pos,
        ovr: player.ovr,
        teamName: targetSlot.team,
        coachName: targetSlot.coachName || currentCoach?.coach_name || null,
        logoUrl: targetSlot.logo || null,
        round: targetSlot.rd,
        pickNumber: targetSlot.pk,
        seasonBadge: targetSlot.seasonBadge,
        leagueType: targetSlot.leagueType || floorLeague,
        leagueId: Number(targetSlot.leagueId || floorLeagueId),
        transactionType: transaction,
        nextOnClock: nextSlotAfterThis
          ? {
              team: nextSlotAfterThis.team,
              teamId: nextSlotAfterThis.teamId,
              coachId: nextSlotAfterThis.coachId || null,
              coachName: nextSlotAfterThis.coachName || null,
              discordHandle:
                nextSlotAfterThis.coachId && coachHandlesMap.get(Number(nextSlotAfterThis.coachId))
                  ? coachHandlesMap.get(Number(nextSlotAfterThis.coachId))
                  : null,
              rd: nextSlotAfterThis.rd,
              pk: nextSlotAfterThis.pk,
              clockWindowMinutes: Number(nextSlotAfterThis.rd) === 1 ? 10 : 5
            }
          : null
      };

      let savedDraftId = targetSlot.draftId;
      if (savedDraftId) {
        const res = await fetch('/api/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'submit_pick',
            draftId: savedDraftId,
            updatePayload: { player_id: player.player_id, transaction_type: transaction },
            discordNotification
          })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to update pick');
        const updated = json.data;
        if (!updated || updated.length === 0) {
          alert('This pick was already filled (or the database refused the update). Refresh the page and try again.');
          return;
        }
      } else {
        // Materialize the projected draft order in league_drafts with this pick filled
        const rowsToInsert = projectedFloorRows.map(slot => ({
          league_id: Number(slot.leagueId),
          team_id: slot.teamId,
          player_id: slot.rd === targetSlot.rd && slot.pk === targetSlot.pk ? player.player_id : null,
          round: slot.rd,
          pick_number: slot.pk,
          year: slot.year,
          transaction_type: slot.rd === targetSlot.rd && slot.pk === targetSlot.pk ? transaction : slot.transaction
        }));
        const res = await fetch('/api/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'submit_pick',
            rowsToInsert,
            discordNotification
          })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to insert draft order & pick');
        const insertedAll = json.data;
        const builtAll: DraftData[] = (insertedAll || []).map((d: any) => {
          const t = teamsMap.get(Number(d.team_id));
          const isThisPick = Number(d.round) === targetSlot.rd && Number(d.pick_number) === targetSlot.pk;
          return {
            id: `draft-${d.draft_id}`,
            draftId: Number(d.draft_id),
            team: t?.team_name || targetSlot.team,
            teamId: Number(d.team_id),
            coachId: t?.coach_id || null,
            coachName: t?.coach_name || null,
            rd: Number(d.round),
            pk: Number(d.pick_number),
            player: isThisPick ? player.player_name : 'N/A',
            playerId: isThisPick ? player.player_id : undefined,
            pos: isThisPick ? player.pos : null,
            ovr: isThisPick ? player.ovr : null,
            transaction: d.transaction_type,
            logo: t?.logo_url || '',
            year: Number(d.year),
            leagueId: floorLeagueId,
            seasonBadge: targetSlot.seasonBadge,
            seasonName: targetSlot.seasonName,
            leagueType: targetSlot.leagueType,
            ratings: isThisPick ? (player.ratings || undefined) : undefined,
            playerInfo: isThisPick ? (player.player_info || undefined) : undefined,
            isSubmitted: isThisPick
          };
        });
        builtAll.sort((a, b) => a.rd - b.rd || a.pk - b.pk);
        const chosenRow = builtAll.find(b => b.rd === targetSlot.rd && b.pk === targetSlot.pk);
        savedDraftId = chosenRow?.draftId;
        setData(prev => [...builtAll, ...prev.filter(d => d.leagueId !== floorLeagueId)]);
      }

      const newDraftData: DraftData = {
        ...targetSlot,
        draftId: savedDraftId,
        player: player.player_name,
        playerId: player.player_id,
        pos: player.pos,
        ovr: player.ovr,
        transaction,
        ratings: player.ratings || undefined,
        playerInfo: player.player_info || undefined,
        isSubmitted: true
      };

      if (targetSlot.draftId) {
        setData(prev => prev.map(d => (d.draftId === targetSlot.draftId ? newDraftData : d)));
      }

      // Broadcast live pick to all coaches in the Draft War Room & post system alert in Draft Chat
      const sysChatMsg = {
        id: `dchat_pick_${Date.now()}_${targetSlot.pk}`,
        sender: 'WAR ROOM WIRE',
        text: `🚨 PICK #${targetSlot.pk} (Rd ${targetSlot.rd}): ${targetSlot.team}${
          targetSlot.coachName ? ` (${targetSlot.coachName})` : ''
        } selects ${player.player_name} (${player.pos}, OVR ${player.ovr})!`,
        draftBadge: targetSlot.seasonBadge,
        isSystem: true,
        sentAt: Date.now()
      };
      setDraftChatMessages(prev => [...prev.slice(-59), sysChatMsg]);
      draftChannelRef.current?.send({
        type: 'broadcast',
        event: 'draft-chat',
        payload: sysChatMsg
      });
      draftChannelRef.current?.send({
        type: 'broadcast',
        event: 'draft-pick-made',
        payload: { newDraftRow: newDraftData }
      });

      setPodium(newDraftData);
      setSubmitSuccessMessage(
        `🎉 SELECTION SUBMITTED: ${targetSlot.team} selects ${player.player_name} with Pick #${targetSlot.pk} (Rd ${targetSlot.rd}) for ${targetSlot.seasonBadge} • Pushed to ${activeDiscordChannelLabel}!`
      );
      setTimeout(() => setSubmitSuccessMessage(null), 6000);

      // Reset form
      setCoachSearch('');
      setCoachSelectedPlayer(null);
      setCoachTransactionNote('');
      setOverridePickSlot(null);
    } catch (err: any) {
      console.error('Submission failed:', err);
      alert(`Could not save the pick: ${err?.message || 'unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Send a prospect from the Prospects tab into the selection desk
  const selectProspectForPick = (player: DatabasePlayer) => {
    setCoachSelectedPlayer(player);
    setCoachSearch(player.player_name);
    setPodium({
      team: nextEmptyPickSlot.team,
      teamId: nextEmptyPickSlot.teamId,
      coachId: nextEmptyPickSlot.coachId,
      coachName: nextEmptyPickSlot.coachName,
      rd: nextEmptyPickSlot.rd,
      pk: nextEmptyPickSlot.pk,
      player: player.player_name,
      playerId: player.player_id,
      pos: player.pos,
      ovr: player.ovr,
      transaction: 'Coach Selection Preview',
      logo: nextEmptyPickSlot.logo,
      year: nextEmptyPickSlot.year,
      leagueId: nextEmptyPickSlot.leagueId,
      seasonBadge: nextEmptyPickSlot.seasonBadge,
      seasonName: nextEmptyPickSlot.seasonName,
      leagueType: nextEmptyPickSlot.leagueType,
      ratings: player.ratings,
      playerInfo: player.player_info
    });
    setActiveTab('floor');
    setShowCapital(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Generate the pick order (empty slots, with traded pick ownership applied) for the active draft in league_drafts.
  const handleGenerateDraftOrder = async () => {
    if (!isLoggedIn) {
      openLoginModal('Draft Order Setup');
      return;
    }

    const leagueIdNum = Number(floorLeagueId);
    const meta = activeFloorSeasonMeta;
    const draftRounds = Math.max(1, Math.floor(Number(draftRoundsInput)) || 1);
    const waiverRounds = Math.max(0, Math.floor(Number(waiverRoundsInput)) || 0);

    const existing = data.filter(d => d.leagueId === floorLeagueId);
    if (existing.some(d => d.player && d.player !== 'N/A')) {
      alert('Picks have already been made in this draft, so the order cannot be regenerated.');
      return;
    }

    const confirmed = window.confirm(
      `Create the ${meta?.seasonBadge} draft order?\n\n` +
      `${draftRounds} draft round(s) (worst record first, with traded picks applied) + ${waiverRounds} waiver round(s) (best record first).` +
      (existing.length > 0 ? '\n\nExisting EMPTY pick slots for this draft will be replaced.' : '')
    );
    if (!confirmed) return;

    setIsGeneratingOrder(true);
    try {
      const slots = buildDraftSlotsForLeague(floorLeagueId);
      if (slots.length === 0) {
        throw new Error('No teams were found for this league.');
      }

      const rows = slots.map(slot => ({
        league_id: leagueIdNum,
        team_id: slot.teamId,
        player_id: null,
        round: slot.rd,
        pick_number: slot.pk,
        year: slot.year,
        transaction_type: slot.transaction
      }));

      const res = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_order',
          leagueId: leagueIdNum,
          rows,
          hasExisting: existing.length > 0
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to generate draft order');
      const inserted = json.data;

      const built: DraftData[] = (inserted || []).map((d: any) => {
        const t = teamsMap.get(Number(d.team_id));
        return {
          id: `draft-${d.draft_id}`,
          draftId: Number(d.draft_id),
          team: t?.team_name || 'Unknown Team',
          teamId: Number(d.team_id),
          coachId: t?.coach_id || null,
          coachName: t?.coach_name || null,
          rd: Number(d.round),
          pk: Number(d.pick_number),
          player: 'N/A',
          pos: null,
          ovr: null,
          transaction: d.transaction_type,
          logo: t?.logo_url || '',
          year: Number(d.year) || meta?.year || 2014,
          leagueId: floorLeagueId,
          seasonBadge: meta?.seasonBadge || `Season ${floorLeagueId}`,
          seasonName: meta?.seasonName || `Season ${floorLeagueId}`,
          leagueType: meta?.leagueType || 'W'
        } as DraftData;
      });
      built.sort((a, b) => a.rd - b.rd || a.pk - b.pk);

      setData(prev => [...built, ...prev.filter(d => d.leagueId !== floorLeagueId)]);
      setOverridePickSlot(null);
      setSubmitSuccessMessage(`📋 DRAFT ORDER CREATED: ${built.length} picks for ${meta?.seasonBadge} (including traded picks).`);
      setTimeout(() => setSubmitSuccessMessage(null), 6000);
    } catch (err: any) {
      console.error('Draft order generation failed:', err);
      alert(`Could not create the draft order: ${err?.message || 'unknown error'}`);
    } finally {
      setIsGeneratingOrder(false);
    }
  };

  // Upload / Sync Draft Capital (including traded future picks) for one or more future seasons to league_drafts
  const handleUploadDraftCapital = async (targetLeagueIds: string[]) => {
    if (!isLoggedIn) {
      openLoginModal('Upload Draft Capital');
      return;
    }
    const labels = targetLeagueIds.map(id => seasons.find(s => s.leagueId === id)?.seasonBadge || resolveSeasonInfo(id).badge).join(', ');
    const confirmed = window.confirm(
      `Upload & sync future Draft Capital (including traded picks) to the database for:\n${labels}?`
    );
    if (!confirmed) return;

    setIsUploadingCapital(true);
    try {
      const batches: Array<{ leagueId: number; rows: any[]; hasExisting: boolean }> = [];
      for (const lId of targetLeagueIds) {
        const existing = data.filter(d => d.leagueId === lId);
        if (existing.some(d => d.player && d.player !== 'N/A')) {
          continue; // Do not overwrite drafts that already have selected players
        }
        const slots = buildDraftSlotsForLeague(lId);
        if (slots.length === 0) continue;
        const leagueIdNum = Number(lId);
        const rows = slots.map(slot => ({
          league_id: leagueIdNum,
          team_id: slot.teamId,
          player_id: null,
          round: slot.rd,
          pick_number: slot.pk,
          year: slot.year,
          transaction_type: slot.transaction
        }));
        batches.push({ leagueId: leagueIdNum, rows, hasExisting: existing.length > 0 });
      }

      if (batches.length === 0) {
        alert('No eligible draft capital slots to upload.');
        return;
      }

      const res = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload_capital',
          batches
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to upload draft capital');

      let totalUploaded = 0;
      const allNewDraftData: DraftData[] = [];
      const replacedLeagueIds = new Set<string>();
      const results = json.results || {};

      for (const [lId, inserted] of Object.entries(results)) {
        const meta = seasons.find(s => s.leagueId === lId) || resolveSeasonInfo(lId);
        const sBadge = (meta as any)?.seasonBadge || (meta as any)?.badge || `Season ${lId}`;
        const sName = (meta as any)?.seasonName || (meta as any)?.name || `Season ${lId}`;
        const sType = (meta as any)?.leagueType || (meta as any)?.prefix || 'W';

        const built: DraftData[] = ((inserted as any[]) || []).map((d: any) => {
          const t = teamsMap.get(Number(d.team_id));
          return {
            id: `draft-${d.draft_id}`,
            draftId: Number(d.draft_id),
            team: t?.team_name || 'Unknown Team',
            teamId: Number(d.team_id),
            coachId: t?.coach_id || null,
            coachName: t?.coach_name || null,
            rd: Number(d.round),
            pk: Number(d.pick_number),
            player: 'N/A',
            pos: null,
            ovr: null,
            transaction: d.transaction_type,
            logo: t?.logo_url || '',
            year: Number(d.year) || meta?.year || 2014,
            leagueId: lId,
            seasonBadge: sBadge,
            seasonName: sName,
            leagueType: sType
          } as DraftData;
        });
        built.sort((a, b) => a.rd - b.rd || a.pk - b.pk);
        allNewDraftData.push(...built);
        replacedLeagueIds.add(lId);
        totalUploaded += built.length;
      }

      if (replacedLeagueIds.size > 0) {
        setData(prev => [...allNewDraftData, ...prev.filter(d => !replacedLeagueIds.has(d.leagueId))]);
      }
      setSubmitSuccessMessage(`✅ DRAFT CAPITAL UPLOADED: ${totalUploaded} pick slots synced to league_drafts for ${labels}.`);
      setTimeout(() => setSubmitSuccessMessage(null), 6000);
    } catch (err: any) {
      console.error('Upload draft capital failed:', err);
      alert(`Could not upload draft capital: ${err?.message || 'unknown error'}`);
    } finally {
      setIsUploadingCapital(false);
    }
  };

  return (
    <div className="bg-[#f4f1ea] text-black min-h-screen p-3 sm:p-6 lg:p-8 font-serif text-sm">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* ========================================================================= */}
        {/* CLEAN TOP HEADER: Title on Left, Action Buttons & Live Drafts Off to Right */}
        {/* ========================================================================= */}
        <header className="bg-[#fdfaf5] border-2 border-black border-b-4 px-4 sm:px-6 py-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left: Title & Active Draft Badge */}
          <div className="text-left space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight leading-none">
                The Draft Floor
              </h1>
              <span className="bg-black text-amber-300 font-mono text-[10px] sm:text-xs font-black uppercase px-2.5 py-0.5 tracking-widest border border-black">
                Active: {activeFloorSeasonMeta?.seasonBadge || 'W19 (2014)'}
              </span>
              <span className="bg-emerald-900 text-emerald-200 font-mono text-[10px] sm:text-xs font-black uppercase px-2.5 py-0.5 border border-black inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {loggedInDraftCoaches.length} Coach{loggedInDraftCoaches.length === 1 ? '' : 'es'} Logged In
              </span>
              <span className="bg-indigo-950 text-indigo-200 font-mono text-[10px] font-black uppercase px-2 py-0.5 border border-black">
                📡 Discord: {activeDiscordChannelLabel}
              </span>
            </div>
            <p className="text-[11px] uppercase tracking-wider font-sans font-bold text-neutral-600">
              Official War Room, Rookie Prospects & Franchise Future Draft Capital
            </p>
            {loggedInDraftCoaches.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[10px] font-mono font-black uppercase text-slate-600">
                  Online Coaches:
                </span>
                {loggedInDraftCoaches.map((c) => (
                  <span
                    key={`hdr-coach-${c.peerId}-${c.coachName}`}
                    className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-950 border border-black px-2 py-0.5 text-[10px] font-mono font-black uppercase"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    {c.coachName}
                    {c.activeDraft ? <span className="text-emerald-700 font-normal">({c.activeDraft.split(' ')[0]})</span> : null}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right: Navigation Buttons & Concurrent Live Draft Switcher */}
          <div className="flex flex-col lg:items-end gap-2">
            <div className="flex items-center lg:justify-end gap-1.5 flex-wrap">
              <button
                onClick={() => { setActiveTab('floor'); setShowCapital(false); }}
                className={`px-3 py-1.5 text-xs font-black uppercase border-2 border-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'floor' && !showCapital
                    ? 'bg-black text-white shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                    : 'bg-white text-black hover:bg-neutral-100'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                Draft Floor
              </button>

              <button
                onClick={() => { setActiveTab('prospects'); setShowCapital(false); }}
                className={`px-3 py-1.5 text-xs font-black uppercase border-2 border-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'prospects'
                    ? 'bg-black text-white shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                    : 'bg-white text-black hover:bg-neutral-100'
                }`}
              >
                <Star className="w-3.5 h-3.5" />
                Draft Prospects
              </button>

              <button
                onClick={() => { setActiveTab('capital'); setShowCapital(false); }}
                className={`px-3 py-1.5 text-xs font-black uppercase border-2 border-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'capital'
                    ? 'bg-black text-white shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                    : 'bg-white text-black hover:bg-neutral-100'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Draft Capital
              </button>

              <button
                onClick={() => { setActiveTab('past'); setShowCapital(false); }}
                className={`px-3 py-1.5 text-xs font-black uppercase border-2 border-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'past'
                    ? 'bg-black text-white shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                    : 'bg-white text-black hover:bg-neutral-100'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                Past Drafts
              </button>
            </div>

            {activeDrafts.length > 1 && (
              <div className="flex items-center lg:justify-end gap-1.5 flex-wrap font-mono">
                <span className="text-[10px] font-black uppercase text-slate-600">Upcoming &amp; Live Drafts:</span>
                {activeDrafts.map(s => {
                  const isCurrent = s.leagueId === floorLeagueId;
                  return (
                    <button
                      key={s.leagueId}
                      onClick={() => switchToDraft(s)}
                      className={`px-2 py-0.5 text-[11px] font-black uppercase border border-black cursor-pointer transition-all flex items-center gap-1 ${
                        isCurrent ? 'bg-amber-300 text-black font-black' : 'bg-white text-black hover:bg-yellow-100'
                      }`}
                    >
                      <span>{s.seasonBadge}</span>
                      <span
                        className={`text-[9px] px-1 py-0 border border-black ${
                          s.draftStarted ? 'bg-emerald-600 text-white' : 'bg-neutral-200 text-neutral-700'
                        }`}
                      >
                        {s.draftStarted ? 'LIVE' : 'STANDBY'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </header>

        {/* ========================================================================= */}
        {/* DRAFT LOCKED / NOT STARTED BANNER (EACH DRAFT STARTS INDEPENDENTLY) */}
        {/* ========================================================================= */}
        {draftLockStatus.isLocked && (
          <div className="bg-[#121418] border-4 border-amber-400 text-white p-4 sm:p-5 shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row items-center justify-between gap-4 font-mono">
            <div className="flex items-center gap-3 text-left">
              <div className="w-12 h-12 bg-amber-400 text-black flex items-center justify-center border-2 border-black shrink-0 font-black">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-red-600 text-white text-[9px] font-black uppercase px-2 py-0.5 tracking-wider animate-pulse">
                    DRAFT STANDBY (NOT STARTED)
                  </span>
                  <span className="text-amber-300 text-xs font-black tracking-widest uppercase">
                    {activeFloorSeasonMeta?.seasonBadge}
                  </span>
                </div>
                <p className="text-xs text-neutral-300 font-sans mt-0.5">
                  {draftLockStatus.targetDate ? (
                    <>
                      Scheduled for <strong className="text-white">{draftLockStatus.targetDate.toLocaleString()}</strong>. Picks unlock as soon as the Commissioner starts this draft.
                    </>
                  ) : (
                    <>
                      Picks for <strong className="text-white">{activeFloorSeasonMeta?.seasonBadge}</strong> are currently locked on standby until the Commissioner clicks <strong className="text-amber-300">Start Draft</strong>. (Each draft starts independently.)
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap shrink-0">
              {draftLockStatus.timeRemaining && (
                <div className="flex items-center gap-2 bg-black/80 border-2 border-neutral-700 p-2 text-center shrink-0">
                  <div className="px-2">
                    <div className="text-xl sm:text-2xl font-black text-amber-300">{draftLockStatus.timeRemaining.days}</div>
                    <div className="text-[8px] uppercase text-neutral-400 font-bold">Days</div>
                  </div>
                  <span className="text-amber-300 font-black">:</span>
                  <div className="px-2">
                    <div className="text-xl sm:text-2xl font-black text-amber-300">{String(draftLockStatus.timeRemaining.hours).padStart(2, '0')}</div>
                    <div className="text-[8px] uppercase text-neutral-400 font-bold">Hours</div>
                  </div>
                  <span className="text-amber-300 font-black">:</span>
                  <div className="px-2">
                    <div className="text-xl sm:text-2xl font-black text-amber-300">{String(draftLockStatus.timeRemaining.minutes).padStart(2, '0')}</div>
                    <div className="text-[8px] uppercase text-neutral-400 font-bold">Mins</div>
                  </div>
                  <span className="text-amber-300 font-black">:</span>
                  <div className="px-2">
                    <div className="text-xl sm:text-2xl font-black text-emerald-400">{String(draftLockStatus.timeRemaining.seconds).padStart(2, '0')}</div>
                    <div className="text-[8px] uppercase text-neutral-400 font-bold">Secs</div>
                  </div>
                </div>
              )}

              {isUltraMagnusAdmin && (
                <button
                  type="button"
                  disabled={isTogglingDraftStatus}
                  onClick={() => handleToggleDraftStart(floorLeagueId, true)}
                  className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-black uppercase text-xs px-4 py-3 border-2 border-black shadow-[3px_3px_0px_#000] cursor-pointer flex items-center gap-2 transition-all"
                >
                  <Unlock className="w-4 h-4 text-black shrink-0" />
                  <span>
                    {isTogglingDraftStatus
                      ? 'Starting Draft...'
                      : `▶ START ${activeFloorSeasonMeta?.seasonBadge} DRAFT`}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Success Alert Toast */}
        {submitSuccessMessage && (
          <div className="bg-emerald-100 border-2 border-emerald-800 text-emerald-950 p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] flex items-center justify-between gap-3 animate-bounce">
            <div className="flex items-center gap-2 font-bold text-xs sm:text-sm uppercase font-sans">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
              <span>{submitSuccessMessage}</span>
            </div>
            <button
              onClick={() => setSubmitSuccessMessage(null)}
              className="text-xs font-bold uppercase bg-emerald-800 text-white px-2 py-1 hover:bg-emerald-900 border border-black cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: LIVE DRAFT FLOOR (Strictly 1 Draft Viewport) */}
        {/* ========================================================================= */}
        {activeTab === 'floor' && (
          <div className="space-y-6">
            
            {/* 1ST OVERALL SELECTION SHOWCASE BAR */}
            {firstOverallPick && (
              <div className="bg-[#fff9e6] border-3 border-black p-3.5 shadow-[4px_4px_0px_#d97706,4px_4px_0px_1px_#000] flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
                <div className="flex items-center gap-3">
                  <div className="bg-amber-400 text-black font-black px-2.5 py-1 text-xs border-2 border-black shadow-xs flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-black" />
                    <span>1ST OVERALL PICK</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {firstOverallPick.logo && (
                      <img src={firstOverallPick.logo} alt="" className="w-6 h-6 object-contain" />
                    )}
                    <span className="font-sans font-black text-sm uppercase text-black">
                      {firstOverallPick.team}
                    </span>
                    {firstOverallPick.coachName && (
                      <span className="text-[11px] font-sans font-bold text-slate-700 bg-neutral-200/80 px-2 py-0.5 border border-black/30">
                        Coach: {firstOverallPick.coachName}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-xs font-bold font-sans">
                  {firstOverallPick.player && firstOverallPick.player !== "N/A" ? (
                    <span className="bg-emerald-600 text-white px-2.5 py-1 border border-emerald-900 shadow-2xs font-mono font-black">
                      ✓ SELECTED: {firstOverallPick.player} {firstOverallPick.ovr ? `(OVR ${firstOverallPick.ovr})` : ''}
                    </span>
                  ) : (
                    <span className="bg-black text-amber-300 px-2.5 py-1 border border-black font-mono font-black">
                      ★ ON THE CLOCK FOR #1 OVERALL ★
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* TOP HERO SECTION: Coach Desk on Left, Hockey Card Spotlight on Top Right */}
            <div className="grid grid-cols-12 gap-5 items-start">
              
              {/* TOP LEFT: COACH SELECTION DESK ("ON THE CLOCK") */}
              <div className="col-span-12 lg:col-span-8 bg-[#fdfaf5] border-2 border-black p-4 sm:p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)] relative overflow-hidden">
                {!isLoggedIn && (
                  <CoachLockOverlay
                    title="COACH SIGN-IN REQUIRED"
                    description="Official draft selections and roster additions require coach verification. Spectators may freely view the draft board, capital picks, and trading cards below."
                    buttonText="Sign In to Submit Picks"
                    loginContext="Draft Submissions"
                  />
                )}

                {/* Personalized "YOU ARE ON THE CLOCK" Alert Banner */}
                {isCurrentCoachOnClock && !draftLockStatus.isLocked && (
                  <div className="bg-emerald-600 border-2 border-black text-white p-2.5 mb-3 font-mono font-black text-xs uppercase flex items-center justify-between shadow-[2px_2px_0px_#000] animate-pulse">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>🚨 COACH {currentCoach?.coach_name}, YOU ARE CURRENTLY ON THE CLOCK!</span>
                    </div>
                    <span className="bg-black text-white px-2 py-0.5 border border-white text-[10px]">
                      PICK #{nextEmptyPickSlot.pk}
                    </span>
                  </div>
                )}

                {/* Exclusive UltraMagnus Commissioner & Proxy Selection Control (Visible ONLY to UltraMagnus's profile) */}
                {isUltraMagnusAdmin && (
                  <div className="bg-amber-300 border-2 border-black text-black p-2.5 mb-3 font-mono text-xs flex flex-col gap-2 shadow-[2px_2px_0px_#000]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-black uppercase">
                        <Shield className="w-4 h-4 text-black shrink-0" />
                        <span>
                          👑 ULTRAMAGNUS COMMISSIONER CONTROLS ({activeFloorSeasonMeta?.seasonBadge})
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {activeFloorSeasonMeta?.draftStarted ? (
                          <button
                            type="button"
                            disabled={isTogglingDraftStatus}
                            onClick={() => handleToggleDraftStart(floorLeagueId, false)}
                            className="bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white border-2 border-black px-3 py-1 text-[11px] font-black uppercase cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>
                              {isTogglingDraftStatus
                                ? 'Updating...'
                                : `⏸ PAUSE / STOP ${activeFloorSeasonMeta?.seasonBadge} DRAFT`}
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isTogglingDraftStatus}
                            onClick={() => handleToggleDraftStart(floorLeagueId, true)}
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white border-2 border-black px-3 py-1 text-[11px] font-black uppercase cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            <span>
                              {isTogglingDraftStatus
                                ? 'Starting...'
                                : `▶ START ${activeFloorSeasonMeta?.seasonBadge} DRAFT`}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>

                    {!draftLockStatus.isLocked && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-black/30 pt-2">
                        <span className="text-[11px] font-bold uppercase">
                          Proxy Pick Access (submit for any coach unable to pick):
                        </span>
                        <select
                          value={`${nextEmptyPickSlot.rd}-${nextEmptyPickSlot.pk}`}
                          onChange={(e) => {
                            const [rStr, pStr] = e.target.value.split('-');
                            const chosen = projectedFloorRows.find(
                              s => s.rd === Number(rStr) && s.pk === Number(pStr)
                            );
                            setOverridePickSlot(chosen || null);
                          }}
                          className="bg-black text-amber-300 border border-black px-2 py-1 text-[11px] font-black uppercase cursor-pointer"
                          title="Select any open pick slot to draft on behalf of that coach"
                        >
                          {projectedFloorRows
                            .filter(s => !s.player || s.player === 'N/A' || s.player.trim() === '')
                            .map(s => (
                              <option key={`${s.rd}-${s.pk}`} value={`${s.rd}-${s.pk}`}>
                                Rd {s.rd} • Pick #{s.pk} — {s.team} ({s.coachName || 'No Coach'})
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-black pb-3 mb-4 gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="w-3 h-3 bg-red-600 rounded-full animate-ping"></span>
                    <h2 className="text-base sm:text-lg font-black uppercase tracking-tight flex items-center gap-2">
                      <Clock className="w-4 h-4 text-red-700" />
                      Coach War Room &bull; Selection Desk
                    </h2>
                    {isLoggedIn && currentCoach && (
                      <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 border border-emerald-600 uppercase flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Coach: {currentCoach.coach_name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 font-mono text-xs font-bold bg-yellow-100 px-2.5 py-1 border border-black">
                    <span>On The Clock:</span>
                    <span className="font-black text-red-800 uppercase">
                      Pick #{nextEmptyPickSlot.pk} (Rd {nextEmptyPickSlot.rd})
                    </span>
                  </div>
                </div>

                {/* Per-Pick Clock Window Banner (Round 1 = 10 Mins, Round 2+ = 5 Mins) */}
                {!draftLockStatus.isLocked && (
                  <div className="bg-[#121418] text-white border-2 border-black p-3 mb-4 shadow-[3px_3px_0px_rgba(0,0,0,1)] font-mono">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 text-[10px] font-black uppercase border border-black ${
                          isPickClockExpired
                            ? 'bg-red-600 text-white animate-pulse'
                            : Number(nextEmptyPickSlot.rd) === 1
                              ? 'bg-amber-400 text-black'
                              : 'bg-sky-400 text-black'
                        }`}>
                          <Timer className="w-3 h-3 inline-block mr-1 -mt-0.5" />
                          ROUND {nextEmptyPickSlot.rd} CLOCK &bull; {pickWindowMinutes}:00 WINDOW
                        </span>
                        <span className="text-[10px] font-bold text-neutral-300 bg-neutral-800 px-2 py-0.5 border border-neutral-600 uppercase">
                          RD 1: 10 MIN &bull; RD 2: 5 MIN
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className={`text-lg sm:text-xl font-black px-2.5 py-0.5 border border-neutral-600 bg-black tracking-wider ${
                          isPickClockExpired
                            ? 'text-red-500 animate-pulse'
                            : pickClockRemainingMs <= 60000
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                        }`}>
                          {isPickClockExpired ? '00:00 (TIME UP)' : `${pickClockMinutesStr}:${pickClockSecondsStr}`}
                        </div>
                        <button
                          type="button"
                          onClick={togglePickClockPause}
                          className="text-[10px] font-black uppercase bg-neutral-800 hover:bg-neutral-700 text-white px-2 py-1 border border-neutral-600 cursor-pointer"
                        >
                          {isPickClockPaused ? 'Resume' : 'Pause'}
                        </button>
                        <button
                          type="button"
                          onClick={resetPickClock}
                          className="text-[10px] font-black uppercase bg-amber-400 hover:bg-amber-300 text-black px-2 py-1 border border-black cursor-pointer"
                        >
                          Reset {pickWindowMinutes}:00
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-neutral-800 mt-2 overflow-hidden border border-neutral-700">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isPickClockExpired
                            ? 'bg-red-600'
                            : pickClockRemainingMs <= 60000
                              ? 'bg-amber-400'
                              : 'bg-emerald-400'
                        }`}
                        style={{ width: `${pickClockPct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Team On Clock Showcase with Coach Assignment */}
                <div className="bg-white border-2 border-black p-3 mb-4 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    {nextEmptyPickSlot.logo ? (
                      <img
                        src={nextEmptyPickSlot.logo}
                        alt={nextEmptyPickSlot.team}
                        className="w-10 h-10 object-contain border border-black/20 p-1 bg-neutral-50"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-black text-white font-mono font-black text-xs flex items-center justify-center border border-black">
                        #{nextEmptyPickSlot.pk}
                      </div>
                    )}
                    <div>
                      <div className="text-[10px] font-mono uppercase font-bold text-slate-500 flex items-center gap-1.5">
                        <span>Franchise On The Clock</span>
                        {nextEmptyPickSlot.coachName && (
                          <span className="bg-neutral-200 text-black px-1.5 py-0 border border-black/20 font-bold">
                            Coach: {nextEmptyPickSlot.coachName}
                          </span>
                        )}
                      </div>
                      <div className="text-sm sm:text-base font-black uppercase text-black">
                        {nextEmptyPickSlot.team}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-mono uppercase font-black bg-yellow-100 text-black px-2.5 py-1 border-2 border-black shadow-xs">
                      {nextEmptyPickSlot.seasonBadge}
                    </span>
                    {overridePickSlot && (
                      <button
                        onClick={() => setOverridePickSlot(null)}
                        className="block text-[10px] text-red-800 font-bold uppercase underline mt-1 cursor-pointer"
                      >
                        Reset to Auto Pick Slot
                      </button>
                    )}
                  </div>
                </div>

                {/* Draft completion notice (or fallback only if 0 slots exist at all) */}
                {!loading &&
                  (projectedFloorRows.length === 0 ||
                    !projectedFloorRows.some(d => !d.player || d.player === 'N/A' || d.player.trim() === '')) && (
                  <div className="bg-amber-50 border-2 border-black p-3 mb-4 text-xs font-sans space-y-2">
                    {projectedFloorRows.length > 0 ? (
                      <div className="font-black uppercase font-mono text-emerald-800">
                        ✓ Draft complete &mdash; no open picks remain for {activeFloorSeasonMeta?.seasonBadge}.
                      </div>
                    ) : (
                      <>
                        <div className="font-black uppercase font-mono">
                          No draft order yet for {activeFloorSeasonMeta?.seasonBadge}.
                        </div>
                        <p className="text-[11px] text-slate-700">
                          Creates the empty pick slots in the draft table from the current standings.
                          Draft rounds go worst record first; waiver rounds run in reverse (best record first).
                        </p>
                        <div className="flex items-end gap-3 flex-wrap font-mono">
                          <label className="text-[10px] font-black uppercase">
                            Draft Rounds
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={draftRoundsInput}
                              onChange={(e) => setDraftRoundsInput(Number(e.target.value))}
                              className="block w-20 mt-0.5 bg-white border-2 border-black px-2 py-1 text-xs font-bold"
                            />
                          </label>
                          <label className="text-[10px] font-black uppercase">
                            Waiver Rounds
                            <input
                              type="number"
                              min={0}
                              max={10}
                              value={waiverRoundsInput}
                              onChange={(e) => setWaiverRoundsInput(Number(e.target.value))}
                              className="block w-20 mt-0.5 bg-white border-2 border-black px-2 py-1 text-xs font-bold"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={handleGenerateDraftOrder}
                            disabled={isGeneratingOrder}
                            className="bg-black text-white hover:bg-neutral-800 disabled:opacity-40 border-2 border-black px-3 py-1.5 text-xs font-black uppercase cursor-pointer flex items-center gap-1.5"
                          >
                            {isGeneratingOrder ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
                            {isLoggedIn ? 'Generate Draft Order' : 'Sign In to Generate Order'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Coach Pick Form */}
                <form onSubmit={handleSubmitPick} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-black uppercase font-mono mb-1 text-slate-800 flex justify-between items-center flex-wrap gap-1">
                      <span>
                        Search & Select Prospect ({rookieClassYear} Rookies & Free Agents • {availableRookies.length} available):
                      </span>
                      {coachSelectedPlayer && (
                        <span className="text-emerald-700 font-bold">
                          ✓ Selected: {coachSelectedPlayer.player_name} ({coachSelectedPlayer.pos}, {coachSelectedPlayer.isFreeAgent ? 'FREE AGENT' : 'ROOKIE'}, OVR {coachSelectedPlayer.ovr})
                        </span>
                      )}
                    </label>

                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
                      <input
                        type="text"
                        value={coachSearch}
                        onChange={(e) => {
                          setCoachSearch(e.target.value);
                          if (coachSelectedPlayer && e.target.value !== coachSelectedPlayer.player_name) {
                            setCoachSelectedPlayer(null);
                          }
                        }}
                        disabled={draftLockStatus.isLocked}
                        placeholder={draftLockStatus.isLocked ? "DRAFT IS CURRENTLY LOCKED UNTIL START DATE" : "TYPE A ROOKIE OR FREE AGENT NAME, POSITION, OR 'FREE AGENT'..."}
                        className="w-full bg-white border-2 border-black pl-9 pr-3 py-2 text-xs font-bold uppercase focus:outline-none focus:bg-yellow-50 font-sans disabled:bg-neutral-100 disabled:text-neutral-400"
                      />
                    </div>

                    {/* Autocomplete Quick Results */}
                    {coachSearch.trim() && !coachSelectedPlayer && !draftLockStatus.isLocked && (
                      <div className="mt-1 bg-white border-2 border-black shadow-md max-h-48 overflow-y-auto divide-y divide-black/10">
                        {filteredDbPlayers.length === 0 ? (
                          <div className="p-2.5 text-xs italic text-slate-500">
                            No rookies or free agents match your search.
                          </div>
                        ) : (
                          filteredDbPlayers.map((player) => {
                            const pickedBy = draftedPlayerMap.get(String(player.player_id));
                            return (
                              <button
                                type="button"
                                key={player.player_id}
                                onClick={() => {
                                  if (pickedBy) {
                                    setPodium(pickedBy);
                                    return;
                                  }
                                  setCoachSelectedPlayer(player);
                                  setCoachSearch(player.player_name);
                                  setPodium({
                                    team: nextEmptyPickSlot.team,
                                    teamId: nextEmptyPickSlot.teamId,
                                    coachId: nextEmptyPickSlot.coachId,
                                    coachName: nextEmptyPickSlot.coachName,
                                    rd: nextEmptyPickSlot.rd,
                                    pk: nextEmptyPickSlot.pk,
                                    player: player.player_name,
                                    playerId: player.player_id,
                                    pos: player.pos,
                                    ovr: player.ovr,
                                    transaction: "Coach Selection Preview",
                                    logo: nextEmptyPickSlot.logo,
                                    year: nextEmptyPickSlot.year,
                                    leagueId: nextEmptyPickSlot.leagueId,
                                    seasonBadge: nextEmptyPickSlot.seasonBadge,
                                    seasonName: nextEmptyPickSlot.seasonName,
                                    leagueType: nextEmptyPickSlot.leagueType,
                                    ratings: player.ratings,
                                    playerInfo: player.player_info
                                  });
                                }}
                                className={`w-full text-left p-2 flex items-center justify-between text-xs font-sans transition-colors cursor-pointer ${
                                  pickedBy ? 'bg-emerald-50 hover:bg-emerald-100' : 'hover:bg-yellow-100'
                                }`}
                              >
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold uppercase text-black">{player.player_name}</span>
                                  <span className="text-[10px] font-mono bg-neutral-100 px-1 py-0.5 border border-black/20">{player.pos}</span>
                                  <span
                                    className={`text-[9px] font-mono font-black uppercase px-1.5 py-0.5 border border-black ${
                                      player.isFreeAgent
                                        ? 'bg-emerald-200 text-emerald-950'
                                        : 'bg-amber-300 text-black'
                                    }`}
                                  >
                                    {player.isFreeAgent ? 'FREE AGENT' : 'ROOKIE'}
                                  </span>
                                  {pickedBy ? (
                                    <span className="text-[10px] font-mono font-black uppercase bg-emerald-700 text-white px-1.5 py-0.5 border border-black">
                                      ✓ PICKED BY {pickedBy.team}{pickedBy.coachName ? ` (${pickedBy.coachName})` : ''} &bull; Rd {pickedBy.rd}, Pk #{pickedBy.pk}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-500 font-serif italic">
                                      {player.isFreeAgent
                                        ? `Free Agent${player.orig_nhl_team ? ` (${player.orig_nhl_team})` : ''}`
                                        : player.team_default}
                                    </span>
                                  )}
                                </div>
                                <span className="font-mono font-black text-xs bg-black text-white px-1.5 py-0.5 shrink-0">
                                  OVR {player.ovr}
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {/* Transaction Notes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase font-mono mb-1 text-slate-800">
                        Transaction / Pick Context (Optional):
                      </label>
                      <input
                        type="text"
                        value={coachTransactionNote}
                        onChange={(e) => setCoachTransactionNote(e.target.value)}
                        disabled={draftLockStatus.isLocked}
                        placeholder="e.g. Original Pick, Trade from DET..."
                        className="w-full bg-white border-2 border-black px-3 py-1.5 text-xs font-sans uppercase focus:outline-none disabled:bg-neutral-100"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="submit"
                        disabled={isSubmitting || draftLockStatus.isLocked || !coachSelectedPlayer || !nextEmptyPickSlot.teamId || !coachMayPickNow}
                        className="w-full bg-black text-white hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed border-2 border-black py-2 px-4 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5"
                      >
                        {draftLockStatus.isLocked ? (
                          <>
                            <Lock className="w-3.5 h-3.5 text-amber-400" />
                            Draft Locked Until Start Date
                          </>
                        ) : isSubmitting ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Recording Selection...
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            {!nextEmptyPickSlot.teamId
                              ? 'No Open Pick Slot'
                              : !coachMayPickNow && isLoggedIn
                                ? `Waiting on ${nextEmptyPickSlot.team}`
                                : isUltraMagnusAdmin && !isCurrentCoachOnClock
                                  ? `Submit Pick #${nextEmptyPickSlot.pk} for ${nextEmptyPickSlot.team}`
                                  : `Submit Official Pick #${nextEmptyPickSlot.pk}`}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>

                {/* SELECTED PICKS IN THIS DRAFT (Always visible in Draft Area to show who picked whom) */}
                {selectedPicksForFloor.length > 0 && (
                  <div className="mt-4 pt-3 border-t-2 border-black">
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                      <span className="font-mono text-[10px] font-black uppercase tracking-wider bg-emerald-800 text-white px-2 py-0.5 border border-black">
                        ✓ Selected Picks in {activeFloorSeasonMeta?.seasonBadge} ({selectedPicksForFloor.length})
                      </span>
                      <button
                        type="button"
                        disabled={isPushingDiscordPick}
                        onClick={() => handlePushPickToDiscord(selectedPicksForFloor[selectedPicksForFloor.length - 1])}
                        className="bg-indigo-900 hover:bg-indigo-800 disabled:opacity-50 text-white font-mono text-[10px] font-black uppercase px-2.5 py-0.5 border border-black cursor-pointer flex items-center gap-1"
                        title={`Push latest pick to ${activeDiscordChannelLabel}`}
                      >
                        <Send className="w-3 h-3 text-amber-300" />
                        <span>
                          {isPushingDiscordPick
                            ? 'Pushing to Discord...'
                            : `📢 Push Pick #${selectedPicksForFloor[selectedPicksForFloor.length - 1].pk} to ${activeDiscordChannelLabel}`}
                        </span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                      {selectedPicksForFloor.map((pick) => (
                        <div
                          key={`selected-summary-${pick.leagueId}-${pick.rd}-${pick.pk}`}
                          onClick={() => setPodium(pick)}
                          className="flex items-center justify-between gap-2 bg-emerald-50 hover:bg-emerald-100 border border-black px-2.5 py-1.5 text-left transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-[10px] font-black bg-black text-amber-300 px-1.5 py-0.5 shrink-0">
                              Rd {pick.rd} &bull; #{pick.pk}
                            </span>
                            {pick.logo && <img src={pick.logo} className="w-4 h-4 object-contain shrink-0" alt="" />}
                            <div className="min-w-0">
                              <div className="text-xs font-black uppercase text-black truncate">
                                {pick.player}{' '}
                                {pick.pos ? <span className="text-[10px] font-mono text-slate-600">({pick.pos}{pick.ovr ? `, OVR ${pick.ovr}` : ''})</span> : null}
                              </div>
                              <div className="text-[10px] font-mono font-bold uppercase text-emerald-900 truncate">
                                Picked by {pick.team}{pick.coachName ? ` (${pick.coachName})` : ''}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={isPushingDiscordPick}
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePushPickToDiscord(pick);
                            }}
                            className="text-[9px] font-mono font-black uppercase bg-indigo-950 hover:bg-indigo-800 text-amber-300 px-1.5 py-0.5 border border-black shrink-0 cursor-pointer"
                            title={`Push Pick #${pick.pk} to ${activeDiscordChannelLabel}`}
                          >
                            📢 Discord
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* TOP RIGHT: TOP AVAILABLE PLAYERS FOR THIS DRAFT */}
              <div className="col-span-12 lg:col-span-4 flex flex-col">
                <div className="bg-[#fdfaf5] border-2 border-black p-3.5 sm:p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] flex flex-col h-full">
                  <div className="flex items-center justify-between gap-2 border-b-2 border-black pb-2.5 mb-2.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />
                        <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-black">
                          Top Available Players
                        </h3>
                      </div>
                      <p className="text-[10px] font-mono font-bold uppercase text-slate-600 mt-0.5">
                        {activeFloorSeasonMeta?.seasonBadge} &bull; {rookieClassYear} Pool &bull; {availableRookies.length} Available
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('prospects')}
                      className="bg-black text-amber-300 hover:bg-neutral-800 px-2 py-1 text-[10px] font-mono font-black uppercase border border-black cursor-pointer shrink-0"
                    >
                      Full Board ({rookiePool.length}) &rarr;
                    </button>
                  </div>

                  {/* Quick Type & Position Filters for Top Available */}
                  <div className="flex flex-wrap items-center gap-1 mb-2.5">
                    {([
                      { key: 'ALL', label: 'All' },
                      { key: 'ROOKIE', label: 'Rookies' },
                      { key: 'FREE_AGENT', label: 'Free Agents' }
                    ] as const).map(t => (
                      <button
                        key={`top-avail-type-${t.key}`}
                        type="button"
                        onClick={() => setProspectTypeFilter(t.key)}
                        className={`px-2 py-0.5 text-[10px] font-mono font-black uppercase border border-black cursor-pointer ${
                          prospectTypeFilter === t.key
                            ? 'bg-black text-white'
                            : 'bg-white text-black hover:bg-neutral-100'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                    <span className="text-slate-400 font-mono text-[10px] mx-0.5">|</span>
                    {prospectPositions.map(pos => (
                      <button
                        key={`top-avail-pos-${pos}`}
                        type="button"
                        onClick={() => setProspectPos(pos)}
                        className={`px-1.5 py-0.5 text-[10px] font-mono font-black uppercase border border-black cursor-pointer ${
                          prospectPos === pos
                            ? 'bg-amber-300 text-black'
                            : 'bg-white text-black hover:bg-neutral-100'
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>

                  {/* Top Available Players List */}
                  <div className="bg-white border-2 border-black divide-y divide-neutral-200 max-h-[420px] overflow-y-auto flex-1">
                    {rookiePoolLoading ? (
                      <div className="p-6 text-center text-xs font-mono font-bold uppercase text-slate-500 italic">
                        Loading {rookieClassYear} top available players...
                      </div>
                    ) : (() => {
                      const topAvail = availableRookies
                        .filter(p => {
                          if (prospectTypeFilter === 'ROOKIE' && p.isFreeAgent) return false;
                          if (prospectTypeFilter === 'FREE_AGENT' && !p.isFreeAgent) return false;
                          if (prospectPos !== 'ALL' && p.pos !== prospectPos) return false;
                          return true;
                        })
                        .slice(0, 25);

                      if (topAvail.length === 0) {
                        return (
                          <div className="p-6 text-center text-xs font-mono font-bold uppercase text-slate-500 italic">
                            No available players match this filter.
                          </div>
                        );
                      }

                      return topAvail.map((player, idx) => {
                        const isSelectedInDesk = coachSelectedPlayer?.player_id === player.player_id;
                        const canSelectNow = coachMayPickNow && !draftLockStatus.isLocked && !!nextEmptyPickSlot.teamId;
                        return (
                          <div
                            key={`top-avail-${player.player_id}`}
                            onClick={() => {
                              if (!draftLockStatus.isLocked) {
                                setCoachSelectedPlayer(player);
                                setCoachSearch(player.player_name);
                              }
                            }}
                            className={`px-2.5 py-2 flex items-center justify-between gap-2 text-xs transition-colors ${
                              !draftLockStatus.isLocked ? 'cursor-pointer hover:bg-yellow-50' : ''
                            } ${isSelectedInDesk ? 'bg-yellow-100 ring-2 ring-inset ring-black' : ''}`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-[10px] font-black text-slate-500 w-5 text-right shrink-0">
                                #{idx + 1}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Link
                                    href={`/players?q=${encodeURIComponent(player.player_name)}&id=${encodeURIComponent(String(player.player_id))}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="font-black uppercase text-black hover:underline truncate"
                                    title="Open Player Profile"
                                  >
                                    {player.player_name}
                                  </Link>
                                  <span className="text-[9.5px] font-mono font-bold bg-neutral-100 text-black px-1 py-0 border border-black/30">
                                    {player.pos}
                                  </span>
                                  <span
                                    className={`text-[8.5px] font-mono font-black uppercase px-1 py-0 border border-black ${
                                      player.isFreeAgent
                                        ? 'bg-emerald-200 text-emerald-950'
                                        : 'bg-amber-300 text-black'
                                    }`}
                                  >
                                    {player.isFreeAgent ? 'FA' : 'ROOKIE'}
                                  </span>
                                </div>
                                <div className="text-[10px] font-sans text-slate-500 truncate">
                                  {player.isFreeAgent
                                    ? `Free Agent${player.orig_nhl_team ? ` (${player.orig_nhl_team})` : ''}`
                                    : player.team_default}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="font-mono font-black text-[11px] bg-black text-amber-300 px-1.5 py-0.5 border border-black">
                                OVR {player.ovr ?? '-'}
                              </span>
                              {canSelectNow && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCoachSelectedPlayer(player);
                                    setCoachSearch(player.player_name);
                                  }}
                                  className={`px-2 py-0.5 text-[10px] font-mono font-black uppercase border border-black cursor-pointer ${
                                    isSelectedInDesk
                                      ? 'bg-emerald-700 text-white'
                                      : 'bg-red-800 hover:bg-red-900 text-white'
                                  }`}
                                >
                                  {isSelectedInDesk ? '✓ Ready' : 'Select'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* LIVE DRAFT WAR ROOM CHAT & ONLINE COACHES ROSTER */}
            <div className="bg-[#fdfaf5] border-2 border-black p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Left 4 cols: Coaches Logged In / Online in War Room */}
                <div className="lg:col-span-4 bg-white border-2 border-black p-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 border-b-2 border-black pb-2 mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-emerald-700" />
                        <span className="font-mono text-xs font-black uppercase text-black">
                          Coaches Logged In
                        </span>
                      </div>
                      <span className="bg-emerald-800 text-white font-mono text-[10px] font-black uppercase px-2 py-0.5 border border-black inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                        {loggedInDraftCoaches.length} Online
                      </span>
                    </div>

                    {loggedInDraftCoaches.length === 0 ? (
                      <div className="text-xs italic text-slate-500 py-4 text-center">
                        No coaches currently signed in on the Draft Floor.
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {loggedInDraftCoaches.map((c) => {
                          const isMe =
                            isLoggedIn &&
                            currentCoach?.coach_name &&
                            c.coachName.trim().toLowerCase() === currentCoach.coach_name.trim().toLowerCase();
                          return (
                            <div
                              key={`warroom-coach-${c.peerId}-${c.coachName}`}
                              className="flex items-center justify-between gap-2 bg-emerald-50/80 border border-black px-2.5 py-1.5 text-xs font-mono"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse shrink-0" />
                                <span className="font-black uppercase text-black truncate">
                                  {c.coachName}
                                </span>
                                {isMe && (
                                  <span className="text-[9px] font-black uppercase bg-black text-amber-300 px-1 py-0">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] font-bold uppercase text-slate-600 shrink-0">
                                {c.activeDraft || activeFloorSeasonMeta?.seasonBadge}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-neutral-300 flex items-center justify-between text-[10px] font-mono font-bold uppercase text-slate-600">
                    <span>Total Visitors in War Room: { Math.max(onlineDraftPresence.length, loggedInDraftCoaches.length) }</span>
                    <span>Discord: {activeDiscordChannelLabel}</span>
                  </div>
                </div>

                {/* Right 8 cols: Live Draft War Room Chat */}
                <div className="lg:col-span-8 bg-white border-2 border-black p-3 flex flex-col">
                  <div className="flex items-center justify-between gap-2 border-b-2 border-black pb-2 mb-2.5 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-amber-600" />
                      <span className="font-mono text-xs font-black uppercase text-black">
                        Live Draft War Room Chat
                      </span>
                      <span className="text-[10px] font-mono font-bold uppercase bg-yellow-100 text-black px-2 py-0.5 border border-black">
                        {activeFloorSeasonMeta?.seasonBadge}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-500">
                      Real-time coach chat &amp; live pick wire
                    </span>
                  </div>

                  <div className="flex-1 bg-[#fdfaf5] border border-black/30 p-2.5 h-44 max-h-44 overflow-y-auto space-y-1.5 font-sans text-xs mb-2.5">
                    {draftChatMessages.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-slate-400 italic text-xs">
                        No messages in the Draft War Room yet. Say hello or talk draft strategy!
                      </div>
                    ) : (
                      draftChatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`px-2.5 py-1.5 border ${
                            msg.isSystem
                              ? 'bg-amber-100 border-black font-mono font-black text-black'
                              : 'bg-white border-neutral-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black uppercase text-black">{msg.sender}</span>
                              {msg.draftBadge && (
                                <span className="bg-neutral-200 text-black px-1 py-0 border border-black/20 text-[9px] font-bold uppercase">
                                  {msg.draftBadge}
                                </span>
                              )}
                            </div>
                            <span className="text-slate-400">
                              {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="text-xs text-slate-900 mt-0.5 break-words">{msg.text}</div>
                        </div>
                      ))
                    )}
                    <div ref={draftChatEndRef} />
                  </div>

                  <form onSubmit={handleSendDraftChat} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={draftChatInput}
                      onChange={(e) => setDraftChatInput(e.target.value)}
                      placeholder={
                        isLoggedIn && currentCoach
                          ? `Message Draft War Room as Coach ${currentCoach.coach_name}...`
                          : 'Sign in or type a message to the Draft War Room...'
                      }
                      className="flex-1 bg-white border-2 border-black px-3 py-1.5 text-xs font-sans focus:outline-none focus:bg-yellow-50"
                    />
                    <button
                      type="submit"
                      disabled={!draftChatInput.trim()}
                      className="bg-black hover:bg-neutral-800 disabled:opacity-40 text-amber-300 font-mono text-xs font-black uppercase px-4 py-1.5 border-2 border-black cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* SINGLE DRAFT BOARD (STRICTLY 1 DRAFT AT A TIME) */}
            <div className="bg-[#fdfaf5] border-2 border-black p-4 sm:p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)] space-y-4">
              
              {/* Single Draft Selector Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b-2 border-black pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-black uppercase text-slate-800">
                    Draft Scope:
                  </span>
                  
                  {/* League Tier selector */}
                  <select
                    value={floorLeague}
                    onChange={(e) => handleFloorLeagueChange(e.target.value)}
                    className="bg-white text-black px-3 py-1.5 text-xs font-black uppercase border-2 border-black cursor-pointer shadow-xs"
                  >
                    <option value="ALL">ALL LEAGUES</option>
                    <option value="W">W LEAGUE</option>
                    <option value="Q">THE Q</option>
                    <option value="O">ORIGINAL 6</option>
                    <option value="V">VINTAGE</option>
                    <option value="G">GOLDEN ERA</option>
                  </select>

                  {/* Single Draft Selector Dropdown (Includes newly discovered 41+, O02, etc.) */}
                  <select
                    value={floorLeagueId}
                    onChange={(e) => setFloorLeagueId(e.target.value)}
                    className="bg-yellow-100 text-black px-3 py-1.5 text-xs font-black uppercase border-2 border-black cursor-pointer shadow-xs ring-1 ring-black"
                  >
                    {availableFloorSeasons.map((s) => (
                      <option key={s.leagueId} value={s.leagueId}>
                        {s.seasonBadge} {s.draftDate ? `(📅 Draft: ${new Date(s.draftDate).toLocaleDateString()})` : ''}
                      </option>
                    ))}
                  </select>

                  {/* Active Draft Tag */}
                  <span className="font-mono text-[10px] bg-black text-white font-black uppercase px-2 py-1 border border-black hidden md:inline-block">
                    Viewing: {activeFloorSeasonMeta?.seasonBadge}
                  </span>
                </div>

                <button
                  onClick={() => setShowCapital(!showCapital)}
                  className="bg-neutral-900 text-white px-3 py-1.5 text-xs font-bold uppercase hover:bg-neutral-800 border-2 border-black shrink-0 cursor-pointer shadow-xs"
                >
                  {showCapital
                    ? "Show All Slots (Selected + Open)"
                    : `Selected Picks Only (${selectedPicksForFloor.length})`}
                </button>
              </div>

              {/* Round Filters & Search Bar */}
              <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-xs font-black uppercase mr-1">Rounds:</span>
                  {(['ALL', '1', '2', '3', '4+'] as const).map((rd) => (
                    <button
                      key={rd}
                      onClick={() => setSelectedRoundFilter(rd)}
                      className={`px-2.5 py-1 text-xs font-black uppercase border border-black cursor-pointer transition-colors ${
                        selectedRoundFilter === rd
                          ? 'bg-black text-white shadow-xs'
                          : 'bg-white text-black hover:bg-neutral-100'
                      }`}
                    >
                      {rd === 'ALL' ? 'All Rounds' : `Rd ${rd}`}
                    </button>
                  ))}
                </div>

                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-neutral-400" />
                  <input
                    placeholder="SEARCH THIS DRAFT..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-white text-black pl-8 pr-3 py-1 text-xs font-bold uppercase w-full focus:outline-none border-2 border-black font-sans"
                  />
                </div>
              </div>

              {/* Main Draft Board Table (Single Draft) */}
              <div className="bg-white border-2 border-black overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                  <thead>
                    <tr className="bg-black text-white text-[10px] uppercase tracking-wider">
                      <th className="py-2.5 px-3">SEASON / DRAFT</th>
                      <th className="py-2.5 px-3">TEAM & COACH</th>
                      <th className="py-2.5 px-3 text-center">RD</th>
                      <th className="py-2.5 px-3 text-center">PK</th>
                      <th className="py-2.5 px-3">PLAYER</th>
                      <th className="py-2.5 px-3 text-center">POS</th>
                      <th className="py-2.5 px-3 text-center">OVR</th>
                      <th className="py-2.5 px-3">TRANSACTION</th>
                      <th className="py-2.5 px-3 text-center">CARD SPOTLIGHT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center italic text-gray-500 font-bold uppercase">
                          Loading draft records...
                        </td>
                      </tr>
                    ) : filteredData.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center italic text-gray-500 font-bold uppercase">
                          No draft records found for {activeFloorSeasonMeta?.seasonBadge}.
                        </td>
                      </tr>
                    ) : (
                      filteredData.map((d, i) => {
                        const isPodiumActive = podium?.player === d.player && podium?.pk === d.pk && podium?.leagueId === d.leagueId;
                        const isEmptyPick = !d.player || d.player === 'N/A';

                        return (
                          <tr
                            key={`${d.leagueId}-${d.rd}-${d.pk}-${i}`}
                            onClick={() => {
                              setPodium(d);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={`cursor-pointer hover:bg-yellow-50 transition-colors ${
                              isPodiumActive
                                ? 'bg-yellow-100 font-bold ring-2 ring-inset ring-black'
                                : !isEmptyPick
                                  ? 'bg-emerald-50/70'
                                  : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="font-mono font-bold bg-neutral-100 text-black px-1.5 py-0.5 border border-black text-[10px] uppercase">
                                {d.seasonBadge}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 flex items-center gap-2 font-bold uppercase">
                              {d.logo && <img src={d.logo} className="w-5 h-5 object-contain" alt="" />}
                              <div>
                                <div className="truncate max-w-[140px] text-black">{d.team}</div>
                                {d.coachName && (
                                  <div className="text-[9.5px] text-slate-500 font-mono font-bold lowercase">
                                    coach: {d.coachName}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono">{d.rd}</td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold">#{d.pk}</td>
                            <td className="py-2.5 px-3 font-bold uppercase">
                              {isEmptyPick ? (
                                <span className="text-slate-400 italic text-[11px] font-mono">
                                  [OPEN CAPITAL SLOT]
                                </span>
                              ) : (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-black font-black">{d.player}</span>
                                  <span className="inline-flex items-center gap-1 text-[9.5px] font-mono font-black uppercase text-emerald-900 bg-emerald-200/80 px-1.5 py-0.5 border border-black w-fit">
                                    ✓ Picked by {d.team}{d.coachName ? ` (${d.coachName})` : ''}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono">
                              {d.pos ? (
                                <span className="bg-neutral-100 text-black px-1.5 py-0.5 text-[10px] font-bold border border-black/20">
                                  {d.pos}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold">
                              {d.ovr ? (
                                <span className="font-black text-black">
                                  {d.ovr}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-gray-600 font-sans text-[11px]">
                              {d.transaction || 'Original Selection'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {isEmptyPick ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOverridePickSlot(d);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                  className="bg-red-800 text-white hover:bg-red-900 px-2 py-0.5 text-[10px] font-black uppercase border border-black cursor-pointer shadow-2xs"
                                >
                                  Pick Here
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPodium(d);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                  className="text-[10px] font-black uppercase bg-black text-white hover:bg-neutral-800 px-2 py-0.5 border border-black cursor-pointer flex items-center gap-1 mx-auto"
                                >
                                  <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                                  Card
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: DRAFT PROSPECTS (Rookie class + Free Agents not on previous season teams) */}
        {/* ========================================================================= */}
        {activeTab === 'prospects' && (
          <div className="space-y-4">
            <div className="bg-[#fdfaf5] border-2 border-black p-4 sm:p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)] space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b-2 border-black pb-3">
                <div>
                  <h2 className="text-base sm:text-lg font-black uppercase tracking-tight flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500" />
                    Draft Prospects &bull; {rookieClassYear} Rookies &amp; Free Agents
                  </h2>
                  <p className="text-[11px] font-mono font-bold uppercase text-slate-600 mt-0.5">
                    Draft: {activeFloorSeasonMeta?.seasonBadge} &bull; {rookiePool.length} total ({rookieCountInPool} rookies, {freeAgentCountInPool} free agents) &bull;{' '}
                    {availableRookies.length} available &bull; {rookiePool.length - availableRookies.length} drafted
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs font-black uppercase">
                  <span>Upcoming Classes:</span>
                  {[
                    { yr: 2014, label: '2014 (W19)' },
                    { yr: 2015, label: '2015 (W20)' },
                    { yr: 2016, label: '2016 (W21)' },
                    { yr: 2017, label: '2017 (W22)' },
                    { yr: 1928, label: '1928 (O02)' },
                    { yr: 1929, label: '1929 (O03)' },
                    { yr: 1930, label: '1930 (O04)' }
                  ].map(({ yr, label }) => (
                    <button
                      key={yr}
                      onClick={() => setRookieYearOverride(yr)}
                      className={`px-2 py-1 text-[11px] font-black border border-black cursor-pointer transition-colors ${
                        rookieClassYear === yr
                          ? 'bg-amber-300 text-black'
                          : 'bg-white text-black hover:bg-neutral-100'
                      }`}
                      title={`View ${label} Rookie & Free Agent Class`}
                    >
                      {label}
                    </button>
                  ))}
                  <select
                    value={rookieClassYear}
                    onChange={(e) => setRookieYearOverride(Number(e.target.value))}
                    className="bg-yellow-100 text-black px-2.5 py-1 text-xs font-black border-2 border-black cursor-pointer ml-1"
                  >
                    {Array.from(
                      new Set([
                        activeFloorSeasonMeta?.year || 2014,
                        1927, 1928, 1929, 1930, 1931, 1932,
                        ...Array.from({ length: 14 }, (_, i) => 2013 + i) // 2013 through 2026
                      ])
                    )
                      .sort((a, b) => a - b)
                      .map(y => (
                        <option key={y} value={y}>
                          {y} Class {y >= 2014 ? `(W${19 + (y - 2014)})` : y >= 1927 && y <= 1942 ? `(O${String(y - 1926).padStart(2, '0')})` : ''}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-xs font-black uppercase mr-1">Type:</span>
                  {([
                    { key: 'ALL', label: `All (${rookiePool.length})` },
                    { key: 'ROOKIE', label: `Rookies (${rookieCountInPool})` },
                    { key: 'FREE_AGENT', label: `Free Agents (${freeAgentCountInPool})` }
                  ] as const).map(t => (
                    <button
                      key={t.key}
                      onClick={() => setProspectTypeFilter(t.key)}
                      className={`px-2.5 py-1 text-xs font-black uppercase border border-black cursor-pointer transition-colors ${
                        prospectTypeFilter === t.key ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}

                  <span className="font-mono text-xs font-black uppercase ml-3 mr-1">Show:</span>
                  {(['AVAILABLE', 'DRAFTED', 'ALL'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setProspectStatus(s)}
                      className={`px-2.5 py-1 text-xs font-black uppercase border border-black cursor-pointer transition-colors ${
                        prospectStatus === s ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
                      }`}
                    >
                      {s === 'ALL' ? 'All' : s === 'AVAILABLE' ? 'Available' : 'Drafted'}
                    </button>
                  ))}
                  <span className="font-mono text-xs font-black uppercase ml-3 mr-1">Pos:</span>
                  {prospectPositions.map(pos => (
                    <button
                      key={pos}
                      onClick={() => setProspectPos(pos)}
                      className={`px-2.5 py-1 text-xs font-black uppercase border border-black cursor-pointer transition-colors ${
                        prospectPos === pos ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>

                <div className="relative flex-1 lg:max-w-xs">
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-neutral-400" />
                  <input
                    placeholder="SEARCH ROOKIES OR FREE AGENTS..."
                    value={prospectSearch}
                    onChange={(e) => setProspectSearch(e.target.value)}
                    className="bg-white text-black pl-8 pr-3 py-1 text-xs font-bold uppercase w-full focus:outline-none border-2 border-black font-sans"
                  />
                </div>
              </div>

              {/* On-the-clock hint */}
              {nextEmptyPickSlot.teamId && (
                <div className="bg-black text-amber-300 font-mono text-[11px] font-black uppercase px-3 py-1.5 flex items-center justify-between gap-2 flex-wrap">
                  <span>On the clock: {nextEmptyPickSlot.team} &bull; Pick #{nextEmptyPickSlot.pk} (Rd {nextEmptyPickSlot.rd})</span>
                  <span className="text-white/80">
                    {coachMayPickNow && !draftLockStatus.isLocked
                      ? 'Click SELECT on a rookie or free agent to draft him'
                      : draftLockStatus.isLocked
                        ? 'Draft is locked until its start date'
                        : isLoggedIn ? `Waiting on ${nextEmptyPickSlot.coachName || nextEmptyPickSlot.team}` : 'Sign in to draft'}
                  </span>
                </div>
              )}

              <div className="bg-white border-2 border-black overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[750px]">
                  <thead>
                    <tr className="bg-black text-white text-[10px] uppercase tracking-wider">
                      <th className="py-2.5 px-3 text-center">#</th>
                      <th className="py-2.5 px-3">PLAYER</th>
                      <th className="py-2.5 px-3 text-center">TYPE</th>
                      <th className="py-2.5 px-3 text-center">POS</th>
                      <th className="py-2.5 px-3 text-center">OVR</th>
                      <th className="py-2.5 px-3 text-center">STARS</th>
                      <th className="py-2.5 px-3">FROM / DESIGNATION</th>
                      <th className="py-2.5 px-3">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {rookiePoolLoading ? (
                      <tr>
                        <td colSpan={8} className="py-10 text-center italic text-gray-500 font-bold uppercase">
                          Loading {rookieClassYear} rookies &amp; free agents...
                        </td>
                      </tr>
                    ) : prospectRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center italic text-gray-500 font-bold uppercase">
                          No prospects or free agents found for these filters.
                        </td>
                      </tr>
                    ) : (
                      prospectRows.map((p, i) => {
                        const pickedBy = draftedPlayerMap.get(String(p.player_id));
                        const canSelect = !pickedBy && coachMayPickNow && !draftLockStatus.isLocked && !!nextEmptyPickSlot.teamId;
                        return (
                          <tr key={p.player_id} className={pickedBy ? 'opacity-60 bg-neutral-50' : 'hover:bg-yellow-50'}>
                            <td className="py-2 px-3 text-center font-mono text-slate-500">{i + 1}</td>
                            <td className="py-2 px-3 font-bold uppercase text-black">
                              <Link
                                href={`/players?q=${encodeURIComponent(p.player_name)}&id=${encodeURIComponent(String(p.player_id))}`}
                                className="hover:underline flex items-center gap-1.5"
                                title="Open in Player Database"
                              >
                                <span>{p.player_name}</span>
                                <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                              </Link>
                            </td>
                            <td className="py-2 px-3 text-center font-mono">
                              <span
                                className={`px-1.5 py-0.5 text-[9.5px] font-black uppercase border border-black inline-block ${
                                  p.isFreeAgent
                                    ? 'bg-emerald-200 text-emerald-950'
                                    : 'bg-amber-300 text-black'
                                }`}
                              >
                                {p.isFreeAgent ? 'FREE AGENT' : 'ROOKIE'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center font-mono">
                              <span className="bg-neutral-100 text-black px-1.5 py-0.5 text-[10px] font-bold border border-black/20">{p.pos}</span>
                            </td>
                            <td className="py-2 px-3 text-center font-mono font-black">{p.ovr || '-'}</td>
                            <td className="py-2 px-3 text-center font-mono">{p.star_rating ?? '-'}</td>
                            <td className="py-2 px-3 text-gray-700 font-sans text-[11px]">
                              {p.isFreeAgent ? (
                                <span className="font-bold text-emerald-800">
                                  Free Agent{p.orig_nhl_team ? ` (${p.orig_nhl_team})` : ''}
                                </span>
                              ) : (
                                <>
                                  {p.team_default}
                                  {(p.player_info as any)?.source_league ? ` (${(p.player_info as any).source_league})` : ''}
                                </>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                {pickedBy ? (
                                  <span className="font-mono text-[10px] font-black uppercase text-red-800 bg-red-50 px-1.5 py-0.5 border border-red-800/40">
                                    ✓ Picked by {pickedBy.team}{pickedBy.coachName ? ` (${pickedBy.coachName})` : ''} &bull; Rd {pickedBy.rd}, Pk #{pickedBy.pk}
                                  </span>
                                ) : canSelect ? (
                                  <button
                                    onClick={() => selectProspectForPick(p)}
                                    className="bg-red-800 text-white hover:bg-red-900 px-2 py-0.5 text-[10px] font-black uppercase border border-black cursor-pointer"
                                  >
                                    Select
                                  </button>
                                ) : (
                                  <span className="font-mono text-[10px] font-black uppercase text-emerald-700">Available</span>
                                )}
                                <Link
                                  href={`/players?q=${encodeURIComponent(p.player_name)}&id=${encodeURIComponent(String(p.player_id))}`}
                                  className="bg-amber-300 hover:bg-amber-400 text-black px-2 py-0.5 text-[10px] font-black uppercase border border-black inline-flex items-center gap-1"
                                >
                                  Profile
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: DRAFT CAPITAL (Active Franchises Future Picks, Traded Picks & Upload) */}
        {/* ========================================================================= */}
        {activeTab === 'capital' && (() => {
          const capSlots = buildDraftSlotsForLeague(capitalLeagueId);
          const capMeta = seasons.find(s => s.leagueId === capitalLeagueId) || resolveSeasonInfo(capitalLeagueId);
          const capBadge = (capMeta as any)?.seasonBadge || (capMeta as any)?.badge || `Season ${capitalLeagueId}`;
          const capYear = capMeta?.year || 2014;

          // Active teams in this league tier
          const uniqueOrigTeamIds = Array.from(new Set(capSlots.map(s => s.origTeamId ?? s.teamId).filter(Boolean))) as number[];
          const activeFranchises = uniqueOrigTeamIds
            .map(id => teamsMap.get(id))
            .filter(Boolean)
            .sort((a, b) => (a!.team_name || '').localeCompare(b!.team_name || '')) as TeamInfo[];

          // 3-year future horizon for W League (W19 2014 - W21 2016) or Original 6 (O02 1928 - O04 1930)
          const isO6Capital = (capMeta as any)?.leagueType === 'O' || (capMeta as any)?.prefix === 'O';
          const horizonLeagueIds = isO6Capital ? ['54', '55', '56'] : ['41', '42', '43'];
          const horizonSlotsByLeague = horizonLeagueIds.map(lId => ({
            leagueId: lId,
            badge: resolveSeasonInfo(lId).badge,
            year: resolveSeasonInfo(lId).year,
            slots: buildDraftSlotsForLeague(lId).filter(s => s.rd <= 2)
          }));

          const tradedSlotsCount = capSlots.filter(s => s.origTeamId && s.teamId && s.origTeamId !== s.teamId).length;
          const dbSavedCount = data.filter(d => d.leagueId === capitalLeagueId).length;

          return (
            <div className="space-y-5">
              {/* Top Control Bar: Select Future Draft & Upload Capital to Database */}
              <div className="bg-[#fdfaf5] border-2 border-black p-4 sm:p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)] space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b-2 border-black pb-3">
                  <div>
                    <h2 className="text-base sm:text-lg font-black uppercase tracking-tight flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-600" />
                      Active Franchise Draft Capital &bull; {capBadge}
                    </h2>
                    <p className="text-[11px] font-mono font-bold uppercase text-slate-600 mt-0.5">
                      {activeFranchises.length} Active Franchises &bull; {capSlots.length} Total Slots &bull;{' '}
                      {tradedSlotsCount} Traded Pick(s) Applied &bull;{' '}
                      {dbSavedCount > 0 ? `${dbSavedCount} Slots Saved in DB` : 'Projected (Ready to Upload)'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleUploadDraftCapital([capitalLeagueId])}
                      disabled={isUploadingCapital}
                      className="bg-black text-amber-300 hover:bg-neutral-800 disabled:opacity-50 px-3.5 py-2 text-xs font-black uppercase border-2 border-black cursor-pointer flex items-center gap-1.5 shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      {isUploadingCapital ? 'Uploading...' : `Upload ${capBadge} Capital to DB`}
                    </button>
                    <button
                      onClick={() => handleUploadDraftCapital(['41', '42', '43'])}
                      disabled={isUploadingCapital}
                      className="bg-emerald-800 text-white hover:bg-emerald-900 disabled:opacity-50 px-3.5 py-2 text-xs font-black uppercase border-2 border-black cursor-pointer flex items-center gap-1.5 shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Upload W19–W21 Capital
                    </button>
                    <button
                      onClick={() => handleUploadDraftCapital(['54', '55', '56'])}
                      disabled={isUploadingCapital}
                      className="bg-blue-900 text-white hover:bg-blue-950 disabled:opacity-50 px-3.5 py-2 text-xs font-black uppercase border-2 border-black cursor-pointer flex items-center gap-1.5 shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Upload O02–O04 Capital
                    </button>
                  </div>
                </div>

                {/* Future Season Selector Pills */}
                <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs font-black uppercase">
                  <span className="text-slate-700 mr-1">Select Draft Season:</span>
                  {['41', '42', '43', '44', '45', '54', '55', '56', '36', '20', '16'].map(lId => {
                    const info = seasons.find(s => s.leagueId === lId) || resolveSeasonInfo(lId);
                    const badge = (info as any)?.seasonBadge || (info as any)?.badge;
                    const isSelected = capitalLeagueId === lId;
                    return (
                      <button
                        key={lId}
                        onClick={() => setCapitalLeagueId(lId)}
                        className={`px-2.5 py-1 text-xs font-black uppercase border border-black cursor-pointer transition-colors ${
                          isSelected ? 'bg-amber-300 text-black font-black' : 'bg-white text-black hover:bg-neutral-100'
                        }`}
                      >
                        {badge}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 1: Active Teams 3-Year Future Draft Capital Portfolio */}
              <div className="bg-[#fdfaf5] border-2 border-black p-4 sm:p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/20 pb-2">
                  <h3 className="font-mono text-xs font-black uppercase tracking-wider">
                    Active Franchises Future Pick Portfolio ({isO6Capital ? 'O02 1928 • O03 1929 • O04 1930' : 'W19 2014 • W20 2015 • W21 2016'})
                  </h3>
                  <span className="text-[10px] font-mono font-bold text-slate-600 uppercase">
                    Automatically synced with confirmed trades in league_trades
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {activeFranchises.map(team => {
                    // Collect picks owned by this team and picks traded away across 2014-2016
                    const ownedPicks: Array<{ year: number; badge: string; rd: number; pk: number; viaAbbr?: string }> = [];
                    const tradedAwayPicks: Array<{ year: number; rd: number; toAbbr: string }> = [];

                    horizonSlotsByLeague.forEach(h => {
                      h.slots.forEach(s => {
                        if (Number(s.teamId) === team.team_id) {
                          const isVia = s.origTeamId && s.origTeamId !== team.team_id;
                          ownedPicks.push({
                            year: h.year,
                            badge: h.badge.split(' ')[0],
                            rd: s.rd,
                            pk: s.pk,
                            viaAbbr: isVia ? s.origTeamAbbr : undefined
                          });
                        } else if (Number(s.origTeamId) === team.team_id && Number(s.teamId) !== team.team_id) {
                          const destTeam = teamsMap.get(Number(s.teamId));
                          tradedAwayPicks.push({
                            year: h.year,
                            rd: s.rd,
                            toAbbr: destTeam?.abbreviation || s.team
                          });
                        }
                      });
                    });

                    return (
                      <div key={team.team_id} className="bg-white border-2 border-black p-3 flex flex-col justify-between shadow-2xs">
                        <div>
                          <div className="flex items-center gap-2.5 border-b border-black/15 pb-2 mb-2">
                            {team.logo_url ? (
                              <img src={team.logo_url} alt={team.team_name} className="w-9 h-9 object-contain border border-black p-0.5 bg-[#fdfaf5] shrink-0" />
                            ) : (
                              <div className="w-9 h-9 bg-neutral-100 border border-black flex items-center justify-center font-mono font-black text-xs shrink-0">
                                {team.abbreviation}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="font-black text-xs uppercase truncate text-black">{team.team_name}</div>
                              <div className="text-[10px] font-mono text-slate-600 truncate">
                                {team.abbreviation} &bull; Coach: {team.coach_name || 'TBD'}
                              </div>
                            </div>
                            <span className="bg-black text-amber-300 font-mono text-[10px] font-black px-1.5 py-0.5 shrink-0">
                              {ownedPicks.length} Picks
                            </span>
                          </div>

                          <div className="space-y-1">
                            {ownedPicks.map((pk, idx) => (
                              <div
                                key={idx}
                                className={`px-2 py-1 text-[10px] font-mono font-bold border flex items-center justify-between ${
                                  pk.viaAbbr
                                    ? 'bg-amber-100 border-amber-600 text-amber-950 font-black'
                                    : 'bg-neutral-50 border-black/20 text-black'
                                }`}
                              >
                                <span>
                                  {pk.year} ({pk.badge}) &bull; Rd {pk.rd} (#{pk.pk})
                                </span>
                                {pk.viaAbbr ? (
                                  <span className="bg-black text-amber-300 px-1 py-0 text-[9px] uppercase">
                                    via {pk.viaAbbr}
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-slate-500 uppercase">Own</span>
                                )}
                              </div>
                            ))}
                            {tradedAwayPicks.map((tp, idx) => (
                              <div
                                key={`tr-${idx}`}
                                className="px-2 py-0.5 text-[9.5px] font-mono text-red-800 bg-red-50/70 border border-red-200 flex items-center justify-between line-through opacity-80"
                              >
                                <span>{tp.year} &bull; Rd {tp.rd}</span>
                                <span className="no-underline font-bold">→ {tp.toAbbr}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Pick Slot Ownership & Traded Pick Reassignment Table */}
              <div className="bg-[#fdfaf5] border-2 border-black p-4 sm:p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-mono text-xs font-black uppercase tracking-wider">
                      {capBadge} Draft Slot Order &amp; Traded Pick Ownership ({capSlots.length} Slots)
                    </h3>
                    <p className="text-[10px] font-sans text-slate-600">
                      Rounds 1–{draftRoundsInput} use reverse standings (Worst → Best); Rounds {draftRoundsInput + 1}+ are Waiver rounds (Best → Worst). Use the Owner dropdown to assign any traded pick before uploading.
                    </p>
                  </div>
                </div>

                <div className="bg-white border-2 border-black overflow-x-auto max-h-[540px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs min-w-[720px]">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-black text-white text-[10px] uppercase tracking-wider font-mono">
                        <th className="py-2.5 px-3 text-center">RD</th>
                        <th className="py-2.5 px-3 text-center">PICK</th>
                        <th className="py-2.5 px-3">ORIGINAL FRANCHISE (STANDINGS SEED)</th>
                        <th className="py-2.5 px-3">CURRENT PICK OWNER (ASSIGN TRADED PICK)</th>
                        <th className="py-2.5 px-3">COACH ON CLOCK</th>
                        <th className="py-2.5 px-3">CAPITAL STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {capSlots.map(slot => {
                        const origId = slot.origTeamId ?? slot.teamId ?? 0;
                        const origTeam = teamsMap.get(Number(origId));
                        const isTraded = Number(slot.teamId) !== Number(origId);
                        const isWaiver = slot.rd > draftRoundsInput;

                        return (
                          <tr key={slot.id} className={isTraded ? 'bg-amber-50/70 font-bold' : 'hover:bg-neutral-50'}>
                            <td className="py-2 px-3 text-center font-mono font-bold">Rd {slot.rd}</td>
                            <td className="py-2 px-3 text-center font-mono font-black">#{slot.pk}</td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                {origTeam?.logo_url && <img src={origTeam.logo_url} className="w-5 h-5 object-contain" alt="" />}
                                <span className="font-bold uppercase text-slate-800">
                                  {origTeam?.team_name || slot.origTeamName} ({origTeam?.abbreviation || slot.origTeamAbbr})
                                </span>
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                {slot.logo && <img src={slot.logo} className="w-5 h-5 object-contain" alt="" />}
                                {!isWaiver ? (
                                  <select
                                    value={slot.teamId}
                                    onChange={(e) => {
                                      const newTeamId = Number(e.target.value);
                                      setPickOwnerOverrides(prev => ({
                                        ...prev,
                                        [`${capYear}-${slot.rd}-${origId}`]: newTeamId
                                      }));
                                    }}
                                    className={`border border-black px-2 py-1 text-xs font-black uppercase cursor-pointer ${
                                      isTraded ? 'bg-amber-200 text-black' : 'bg-white text-black'
                                    }`}
                                  >
                                    {activeFranchises.map(tf => (
                                      <option key={tf.team_id} value={tf.team_id}>
                                        {tf.team_name} ({tf.abbreviation})
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="font-bold uppercase text-black">{slot.team}</span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-700">
                              {slot.coachName || 'TBD'}
                            </td>
                            <td className="py-2 px-3">
                              {isTraded ? (
                                <span className="bg-amber-300 text-black border border-black px-2 py-0.5 font-mono text-[10px] font-black uppercase">
                                  {slot.transaction}
                                </span>
                              ) : (
                                <span className="bg-neutral-100 text-slate-700 border border-black/20 px-2 py-0.5 font-mono text-[10px] font-bold uppercase">
                                  {slot.transaction}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ========================================================================= */}
        {/* TAB 2: PAST DRAFTS ARCHIVE (Strictly 1 Draft Viewport) */}
        {/* ========================================================================= */}
        {activeTab === 'past' && (
          <div className="space-y-6">
            
            {/* TOP HERO: Past Selector & Metrics on Left, Legend Hockey Card on Top Right */}
            <div className="grid grid-cols-12 gap-5 items-start">
              
              {/* LEFT: Toolbar & Class Metrics */}
              <div className="col-span-12 lg:col-span-8 space-y-4">
                
                {/* League & Season Selector Toolbar */}
                <div className="bg-[#fdfaf5] border-2 border-black p-4 sm:p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)] space-y-4">
                  <div>
                    <h3 className="text-xs font-mono font-black uppercase tracking-wider text-slate-700 mb-2">
                      1. Select League Tier:
                    </h3>

                    {/* League Filter Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handlePastLeagueChange('ALL')}
                        className={`px-3 py-1.5 text-xs font-black uppercase border-2 border-black transition-all cursor-pointer ${
                          pastLeagueType === 'ALL'
                            ? 'bg-black text-white shadow-xs'
                            : 'bg-white text-black hover:bg-neutral-100'
                        }`}
                      >
                        All Leagues
                      </button>

                      {(['W', 'Q', 'O', 'V', 'G'] as const).map((type) => {
                        const conf = LEAGUE_LOGOS[type];
                        const isSelected = pastLeagueType === type;

                        return (
                          <button
                            key={type}
                            onClick={() => handlePastLeagueChange(type)}
                            className={`px-3 py-1 text-xs font-black uppercase border-2 flex items-center gap-1.5 transition-all h-9 cursor-pointer ${
                              isSelected
                                ? 'bg-yellow-100 border-black shadow-xs ring-1 ring-black text-black'
                                : 'bg-white border-black/40 opacity-75 hover:opacity-100 hover:border-black text-slate-800'
                            }`}
                            title={conf.name}
                          >
                            {conf.logoUrl ? (
                              <img
                                src={conf.logoUrl}
                                alt={conf.name}
                                className="h-5 w-auto max-w-[50px] object-contain"
                                onError={(e) => {
                                  if (conf.fallbackUrl && e.currentTarget.src !== conf.fallbackUrl) {
                                    e.currentTarget.src = conf.fallbackUrl;
                                  }
                                }}
                              />
                            ) : (
                              <span>{type}</span>
                            )}
                            <span className="text-[11px] font-bold">{conf.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Single Historical Draft Selector Dropdown & Search */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-black/20">
                    <div>
                      <label className="block text-[11px] font-black uppercase font-mono mb-1 text-slate-800">
                        2. Select Historical Draft (1 At A Time):
                      </label>
                      <select
                        value={pastLeagueId}
                        onChange={(e) => setPastLeagueId(e.target.value)}
                        className="w-full bg-yellow-100 border-2 border-black px-3 py-2 text-xs font-black uppercase focus:outline-none cursor-pointer shadow-xs ring-1 ring-black"
                      >
                        {availablePastSeasons.map((s) => (
                          <option key={s.leagueId} value={s.leagueId}>
                            {s.seasonBadge}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase font-mono mb-1 text-slate-800">
                        3. Search Inside {activePastSeasonMeta?.seasonBadge}:
                      </label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-neutral-400" />
                        <input
                          type="text"
                          value={pastSearchQuery}
                          onChange={(e) => setPastSearchQuery(e.target.value)}
                          placeholder="SEARCH PLAYER, FRANCHISE, COACH..."
                          className="w-full bg-white border-2 border-black pl-8 pr-3 py-1.5 text-xs font-bold uppercase focus:outline-none font-sans"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Historical Archive Stats Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[#fdfaf5] border-2 border-black p-3 text-center shadow-xs">
                    <div className="text-[10px] font-mono uppercase font-bold text-slate-500">Class Selections</div>
                    <div className="text-xl font-black font-mono text-black">{pastDraftStats.count}</div>
                  </div>

                  <div className="bg-[#fdfaf5] border-2 border-black p-3 text-center shadow-xs">
                    <div className="text-[10px] font-mono uppercase font-bold text-slate-500">Average Class OVR</div>
                    <div className="text-xl font-black font-mono text-emerald-800">{pastDraftStats.avgOvr || '-'}</div>
                  </div>

                  <div className="bg-[#fdfaf5] border-2 border-black p-3 text-center shadow-xs">
                    <div className="text-[10px] font-mono uppercase font-bold text-slate-500">Top Rated Pick</div>
                    <div className="text-xs font-black uppercase truncate text-black">
                      {pastDraftStats.topPick?.player || 'N/A'} {pastDraftStats.topPick?.ovr ? `(${pastDraftStats.topPick.ovr})` : ''}
                    </div>
                  </div>

                  <div className="bg-[#fdfaf5] border-2 border-black p-3 text-center shadow-xs">
                    <div className="text-[10px] font-mono uppercase font-bold text-slate-500">Most Drafted Pos</div>
                    <div className="text-xl font-black font-mono text-blue-900">{pastDraftStats.topPosition}</div>
                  </div>
                </div>
              </div>

              {/* TOP RIGHT: LEGEND HOCKEY CARD SPOTLIGHT */}
              <div className="col-span-12 lg:col-span-4 flex flex-col items-center justify-center">
                <div className="w-full text-center mb-1.5">
                  <span className="font-mono text-[10px] font-black uppercase tracking-widest text-slate-600 bg-white px-2 py-0.5 border border-black inline-block">
                    ★ Past Legend Hockey Card ★
                  </span>
                </div>
                <HockeyCardSpotlight draftItem={podium} title="HISTORIC ROOKIE" />
              </div>
            </div>

            {/* Past Drafts Table */}
            <div className="bg-[#fdfaf5] border-2 border-black p-4 sm:p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-mono text-xs font-black uppercase tracking-wider">
                  Historical Ledger &bull; {activePastSeasonMeta?.seasonBadge} ({pastDraftsData.length} Picks)
                </h3>
                <span className="text-[10px] text-slate-500 font-sans">
                  Click any legend to spotlight on their trading card
                </span>
              </div>

              <div className="bg-white border-2 border-black overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                  <thead>
                    <tr className="bg-black text-white text-[10px] uppercase tracking-wider">
                      <th className="py-2.5 px-3">SEASON / DRAFT</th>
                      <th className="py-2.5 px-3">TEAM & COACH</th>
                      <th className="py-2.5 px-3 text-center">RD</th>
                      <th className="py-2.5 px-3 text-center">PK</th>
                      <th className="py-2.5 px-3">PLAYER</th>
                      <th className="py-2.5 px-3 text-center">POS</th>
                      <th className="py-2.5 px-3 text-center">OVR</th>
                      <th className="py-2.5 px-3">TRANSACTION</th>
                      <th className="py-2.5 px-3 text-center">CARD SPOTLIGHT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pastDraftsData.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center italic text-gray-500 font-bold uppercase">
                          No past draft records found for {activePastSeasonMeta?.seasonBadge}.
                        </td>
                      </tr>
                    ) : (
                      pastDraftsData.map((d, i) => {
                        const isPodiumActive = podium?.player === d.player && podium?.pk === d.pk && podium?.leagueId === d.leagueId;

                        return (
                          <tr
                            key={`past-${d.leagueId}-${d.rd}-${d.pk}-${i}`}
                            onClick={() => {
                              setPodium(d);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={`cursor-pointer hover:bg-yellow-50 transition-colors ${
                              isPodiumActive ? 'bg-yellow-100 font-bold ring-2 ring-inset ring-black' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="font-mono font-bold bg-neutral-100 text-black px-1.5 py-0.5 border border-black text-[10px] uppercase">
                                {d.seasonBadge}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 flex items-center gap-2 font-bold uppercase">
                              {d.logo && <img src={d.logo} className="w-5 h-5 object-contain" alt="" />}
                              <div>
                                <span className="text-black">{d.team}</span>
                                {d.coachName && (
                                  <span className="block text-[9.5px] text-slate-500 font-mono lowercase">
                                    coach: {d.coachName}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono">{d.rd}</td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold">#{d.pk}</td>
                            <td className="py-2.5 px-3 font-bold uppercase text-black">{d.player}</td>
                            <td className="py-2.5 px-3 text-center font-mono">
                              <span className="bg-neutral-100 text-black px-1.5 py-0.5 text-[10px] font-bold border border-black/20">
                                {d.pos || 'F'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold">
                              {d.ovr ?? '-'}
                            </td>
                            <td className="py-2.5 px-3 text-gray-600 font-sans text-[11px]">
                              {d.transaction || 'Original Selection'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPodium(d);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="text-[10px] font-black uppercase bg-black text-white hover:bg-neutral-800 px-2 py-0.5 border border-black cursor-pointer flex items-center gap-1 mx-auto"
                              >
                                <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                                Card
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}