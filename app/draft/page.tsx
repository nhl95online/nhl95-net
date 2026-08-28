"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { 
  Trophy, Clock, CheckCircle2, Search, Filter, Sparkles, UserCheck, 
  AlertCircle, ChevronDown, ChevronRight, Layers, ArrowRight, Shield, 
  Flame, ExternalLink, RefreshCw, Send, PlusCircle, HelpCircle, Eye,
  SlidersHorizontal, Check, Award, Calendar, Star, Lock, Unlock, Timer
} from 'lucide-react';
import { useCoachAuth } from '@/lib/coach-auth';
import CoachLockOverlay from '@/components/CoachLockOverlay';

interface SeasonOption {
  leagueId: string;
  seasonBadge: string;
  seasonName: string;
  leagueType: string;
  year: number;
  draftDate?: string | null;
}

interface DraftData {
  id?: string | number;
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
  ratings?: Record<string, any>;
  player_info?: Record<string, any>;
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
  40: { badge: 'W18 (2013)', prefix: 'W', year: 2013, name: 'W League - Season 18 (2013)' }
};

// Helper: Dynamically resolve accurate season badge, prefix, and year for ANY league_id (including 41+, O02, etc.)
const resolveSeasonInfo = (leagueId: number | string, dbLeagueName?: string, dbYear?: number): { badge: string; prefix: string; year: number; name: string } => {
  const numId = Number(leagueId);

  // 1. Check known base map
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
            href={`/players?q=${encodeURIComponent(draftItem.player)}`}
            className="flex-1 bg-gradient-to-r from-amber-400 to-yellow-300 text-black py-1.5 px-2 text-center uppercase font-black hover:brightness-110 border border-black rounded-xs shadow-2xs flex items-center justify-center gap-1"
          >
            <Search className="w-3 h-3" />
            Player Profile
          </Link>
          <Link
            href={`/team`}
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
  const [activeTab, setActiveTab] = useState<'floor' | 'past' | 'capital'>('floor');

  // Core Data
  const [data, setData] = useState<DraftData[]>([]);
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [teamsMap, setTeamsMap] = useState<Map<number, TeamInfo>>(new Map());
  const [dbPlayers, setDbPlayers] = useState<DatabasePlayer[]>([]);
  const [loading, setLoading] = useState(true);

  // Single Draft Selection State
  const [floorLeague, setFloorLeague] = useState<string>('W');
  const [floorLeagueId, setFloorLeagueId] = useState<string>('40'); // Automatically updated to highest available draft
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

  // Countdown timer clock state for draft lock
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

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
        // Fetch all relevant tables in parallel
        const [draftsRes, teamsRes, coachesRes, leaguesRes, seasonsRes] = await Promise.all([
          supabase.from('league_drafts').select('*, league_player_database (*), league_teams (*)'),
          supabase.from('league_teams').select('*'),
          supabase.from('league_coaches').select('*'),
          supabase.from('leagues').select('*'),
          supabase.from('league_seasons').select('*')
        ]);

        const rawDrafts = draftsRes.data || [];
        const rawTeams = teamsRes.data || [];
        const rawCoaches = coachesRes.data || [];
        const rawLeagues = leaguesRes.data || [];
        const rawSeasons = seasonsRes.data || [];

        // Build coaches map (ID -> Name)
        const coachMap = new Map<number, string>();
        rawCoaches.forEach((c: any) => {
          const id = Number(c.coach_id ?? c.id);
          const name = String(c.coach_name ?? c.name ?? `Coach #${id}`).trim();
          coachMap.set(id, name);
        });

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

        // 2. Process leagues table from database (includes draft dates / rules_json)
        rawLeagues.forEach((l: any) => {
          const lId = String(l.league_id !== undefined ? l.league_id : (l.id || l.season_id));
          let draftDate = l.draft_date || l.draft_datetime || l.start_date || null;
          if (l.rules_json) {
            try {
              const r = typeof l.rules_json === 'string' ? JSON.parse(l.rules_json) : l.rules_json;
              draftDate = draftDate || r.draft_date || r.draft_datetime || r.draft_time;
            } catch {}
          }

          const resolved = resolveSeasonInfo(lId, l.league_name || l.name, l.year);
          combinedSeasonMap.set(lId, {
            leagueId: lId,
            seasonBadge: resolved.badge,
            seasonName: resolved.name,
            leagueType: resolved.prefix,
            year: resolved.year,
            draftDate
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

        // Auto-select newest available draft for Draft Floor (e.g. 41 if exists, or 40)
        if (seasonList.length > 0) {
          const newest = seasonList[0];
          setFloorLeague(newest.leagueType);
          setFloorLeagueId(newest.leagueId);
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

            const seasonMeta = combinedSeasonMap.get(resolvedLeagueId) || resolveSeasonInfo(resolvedLeagueId, "", rawYear);
            const teamIdNum = t?.team_id ? Number(t.team_id) : undefined;
            const teamDetails = teamIdNum ? compiledTeamsMap.get(teamIdNum) : undefined;

            return {
              id: d.id || `draft-${resolvedLeagueId}-${d.round}-${d.pick_number}-${index}`,
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
              seasonBadge: seasonMeta.seasonBadge,
              seasonName: seasonMeta.seasonName,
              leagueType: seasonMeta.leagueType,
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

        // Fetch Player Database
        const { data: rawPlayers } = await supabase
          .from('league_player_database')
          .select('*')
          .limit(350);

        if (rawPlayers) {
          const formattedPlayers: DatabasePlayer[] = rawPlayers.map((p: any) => ({
            player_id: p.player_id,
            player_name: p.player_name,
            pos: p.pos || 'F',
            team_default: p.team_default || 'Free Agent',
            ratings: p.ratings,
            player_info: p.player_info,
            ovr: parsePlayerOvr(p.ratings) || 75
          }));
          formattedPlayers.sort((a, b) => b.ovr - a.ovr);
          setDbPlayers(formattedPlayers);
        }
      } catch (err) {
        console.error("Failed to load draft floor:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Filtered Season Options for Draft Floor & Past
  const availableFloorSeasons = useMemo(() => {
    return seasons.filter(s => floorLeague === 'ALL' || s.leagueType === floorLeague);
  }, [seasons, floorLeague]);

  const availablePastSeasons = useMemo(() => {
    return seasons.filter(s => pastLeagueType === 'ALL' || s.leagueType === pastLeagueType);
  }, [seasons, pastLeagueType]);

  const activeFloorSeasonMeta = useMemo(() => {
    return seasons.find(s => s.leagueId === floorLeagueId) || seasons[0];
  }, [seasons, floorLeagueId]);

  const activePastSeasonMeta = useMemo(() => {
    return seasons.find(s => s.leagueId === pastLeagueId) || seasons[0];
  }, [seasons, pastLeagueId]);

  // =========================================================================
  // DRAFT DATE LOCK & COUNTDOWN LOGIC
  // =========================================================================
  const draftLockStatus = useMemo(() => {
    if (!activeFloorSeasonMeta?.draftDate) {
      return { isLocked: false, timeRemaining: null, targetDate: null };
    }

    const targetDate = new Date(activeFloorSeasonMeta.draftDate);
    const targetMs = targetDate.getTime();
    if (isNaN(targetMs)) {
      return { isLocked: false, timeRemaining: null, targetDate: null };
    }

    const diff = targetMs - currentTime;
    if (diff <= 0) {
      return { isLocked: false, timeRemaining: null, targetDate };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    return {
      isLocked: true,
      timeRemaining: { days, hours, minutes, seconds, totalMs: diff },
      targetDate
    };
  }, [activeFloorSeasonMeta, currentTime]);

  // Handle switching League tier on Draft Floor
  const handleFloorLeagueChange = (newLeagueType: string) => {
    setFloorLeague(newLeagueType);
    const matches = seasons.filter(s => newLeagueType === 'ALL' || s.leagueType === newLeagueType);
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

  // Filtered Draft Floor Data (1 Draft at a time)
  const filteredData = useMemo(() => {
    return data.filter(d => {
      if (d.leagueId !== floorLeagueId) return false;

      const isCapitalRow = (!d.player || d.player === "N/A");
      const viewMatch = showCapital ? isCapitalRow : !isCapitalRow;
      if (!viewMatch) return false;
      
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
  }, [data, floorLeagueId, showCapital, searchQuery, selectedRoundFilter]);

  // =========================================================================
  // 1ST OVERALL PICK & ON-THE-CLOCK SELECTION LINKED BY TEAM_ID & COACH_ID
  // =========================================================================

  // Round 1 Pick 1 (First Overall Selection)
  const firstOverallPick = useMemo(() => {
    const singleDraftRows = data.filter(d => d.leagueId === floorLeagueId);
    return singleDraftRows.find(d => d.rd === 1 && d.pk === 1) || null;
  }, [data, floorLeagueId]);

  // Identify Current "On The Clock" Pick Slot
  const nextEmptyPickSlot = useMemo(() => {
    if (overridePickSlot && overridePickSlot.leagueId === floorLeagueId) return overridePickSlot;
    
    const singleDraftRows = data.filter(d => d.leagueId === floorLeagueId);
    const emptySlot = singleDraftRows.find(d => !d.player || d.player === "N/A" || d.player.trim() === "");
    if (emptySlot) return emptySlot;

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
  }, [data, floorLeagueId, overridePickSlot, activeFloorSeasonMeta]);

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
    if (!coachSearch.trim()) return dbPlayers.slice(0, 8);
    const q = coachSearch.toLowerCase().trim();
    return dbPlayers
      .filter(p => p.player_name.toLowerCase().includes(q) || p.pos.toLowerCase().includes(q) || p.team_default.toLowerCase().includes(q))
      .slice(0, 8);
  }, [dbPlayers, coachSearch]);

  // Handle Coach Pick Submission
  const handleSubmitPick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (draftLockStatus.isLocked) {
      alert(`The draft is locked until ${draftLockStatus.targetDate?.toLocaleString()}.`);
      return;
    }
    if (!isLoggedIn) {
      openLoginModal('Draft Submissions');
      return;
    }
    if (!coachSelectedPlayer && !coachSearch.trim()) {
      alert("Please select or enter a player name to submit.");
      return;
    }

    setIsSubmitting(true);
    const chosenPlayerName = coachSelectedPlayer ? coachSelectedPlayer.player_name : coachSearch.trim();
    const chosenPos = coachSelectedPlayer ? coachSelectedPlayer.pos : 'F';
    const chosenOvr = coachSelectedPlayer ? coachSelectedPlayer.ovr : 75;
    const targetSlot = nextEmptyPickSlot;

    try {
      const payload: any = {
        round: targetSlot.rd,
        pick_number: targetSlot.pk,
        year: targetSlot.year,
        league_id: Number(targetSlot.leagueId) || targetSlot.leagueId,
        transaction_type: coachTransactionNote.trim() || "Official Draft Selection",
      };

      if (coachSelectedPlayer?.player_id) {
        payload.player_id = coachSelectedPlayer.player_id;
      }
      if (targetSlot.teamId) {
        payload.team_id = targetSlot.teamId;
      }

      await supabase.from('league_drafts').upsert(payload);

      // Update local state immediately
      const newDraftData: DraftData = {
        ...targetSlot,
        player: chosenPlayerName,
        pos: chosenPos,
        ovr: chosenOvr,
        transaction: coachTransactionNote.trim() || "Official Draft Selection",
        ratings: coachSelectedPlayer?.ratings || null,
        playerInfo: coachSelectedPlayer?.player_info || null,
        isSubmitted: true
      };

      setData(prev => {
        const index = prev.findIndex(d => d.leagueId === targetSlot.leagueId && d.rd === targetSlot.rd && d.pk === targetSlot.pk);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = newDraftData;
          return updated;
        }
        return [newDraftData, ...prev];
      });

      setPodium(newDraftData);
      setSubmitSuccessMessage(`🎉 SELECTION SUBMITTED: ${targetSlot.team} selects ${chosenPlayerName} with Pick #${targetSlot.pk} (Rd ${targetSlot.rd}) for ${targetSlot.seasonBadge}!`);
      setTimeout(() => setSubmitSuccessMessage(null), 6000);

      // Reset form
      setCoachSearch('');
      setCoachSelectedPlayer(null);
      setCoachTransactionNote('');
      setOverridePickSlot(null);
    } catch (err) {
      console.error("Submission failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#f4f1ea] text-black min-h-screen p-3 sm:p-6 lg:p-8 font-serif text-sm">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ========================================================================= */}
        {/* HEADER: Draft Central Command */}
        {/* ========================================================================= */}
        <header className="border-b-4 border-black pb-4 text-center relative bg-[#fdfaf5] p-4 sm:p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] border-2">
          <div className="flex items-center justify-center gap-2 mb-2 flex-wrap">
            <span className="bg-red-800 text-white font-mono text-[10px] sm:text-xs font-black uppercase px-2.5 py-0.5 tracking-widest inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
              Official League Draft Headquarters
            </span>
            <span className="bg-black text-amber-300 font-mono text-[10px] sm:text-xs font-black uppercase px-2.5 py-0.5 tracking-widest border border-amber-300">
              Active: {activeFloorSeasonMeta?.seasonBadge || 'Draft Floor'}
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tighter">
            The Draft Floor
          </h1>
          <p className="text-xs uppercase tracking-widest font-sans font-bold text-gray-700 mt-1 max-w-2xl mx-auto">
            Live War Room, Official Coach Selections, Draft Date Locking & Single Draft Viewport
          </p>

          {/* Navigation Tabs */}
          <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
            <button
              onClick={() => { setActiveTab('floor'); setShowCapital(false); }}
              className={`px-4 py-2 text-xs font-black uppercase border-2 border-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'floor' && !showCapital
                  ? 'bg-black text-white shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                  : 'bg-white text-black hover:bg-neutral-100'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              Draft Floor (Live Central)
            </button>

            <button
              onClick={() => setActiveTab('past')}
              className={`px-4 py-2 text-xs font-black uppercase border-2 border-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'past'
                  ? 'bg-black text-white shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                  : 'bg-white text-black hover:bg-neutral-100'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              Past Drafts Archive
            </button>

            <button
              onClick={() => { setActiveTab('floor'); setShowCapital(true); }}
              className={`px-4 py-2 text-xs font-black uppercase border-2 border-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'floor' && showCapital
                  ? 'bg-black text-white shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                  : 'bg-white text-black hover:bg-neutral-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Draft Capital & Empty Picks
            </button>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* DRAFT LOCKED COUNTDOWN BANNER (WHEN DRAFT IS SCHEDULED IN FUTURE) */}
        {/* ========================================================================= */}
        {draftLockStatus.isLocked && draftLockStatus.timeRemaining && (
          <div className="bg-[#121418] border-4 border-amber-400 text-white p-4 sm:p-5 shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row items-center justify-between gap-4 font-mono">
            <div className="flex items-center gap-3 text-left">
              <div className="w-12 h-12 bg-amber-400 text-black flex items-center justify-center border-2 border-black shrink-0 font-black">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-red-600 text-white text-[9px] font-black uppercase px-2 py-0.5 tracking-wider animate-pulse">
                    DRAFT LOCKED
                  </span>
                  <span className="text-amber-300 text-xs font-black tracking-widest uppercase">
                    {activeFloorSeasonMeta?.seasonBadge} SCHEDULED EVENT
                  </span>
                </div>
                <p className="text-xs text-neutral-300 font-sans mt-0.5">
                  Official draft selections commence on <strong className="text-white">{draftLockStatus.targetDate?.toLocaleString()}</strong>.
                </p>
              </div>
            </div>

            {/* Retro Segmented Digital Timer */}
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

                {/* Coach Pick Form */}
                <form onSubmit={handleSubmitPick} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-black uppercase font-mono mb-1 text-slate-800 flex justify-between items-center">
                      <span>Search & Select Player from Database:</span>
                      {coachSelectedPlayer && (
                        <span className="text-emerald-700 font-bold">
                          ✓ Selected: {coachSelectedPlayer.player_name} ({coachSelectedPlayer.pos}, OVR {coachSelectedPlayer.ovr})
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
                        placeholder={draftLockStatus.isLocked ? "DRAFT IS CURRENTLY LOCKED UNTIL START DATE" : "TYPE PLAYER NAME (e.g. Gretzky, Lemieux, Jagr, Roy)..."}
                        className="w-full bg-white border-2 border-black pl-9 pr-3 py-2 text-xs font-bold uppercase focus:outline-none focus:bg-yellow-50 font-sans disabled:bg-neutral-100 disabled:text-neutral-400"
                      />
                    </div>

                    {/* Autocomplete Quick Results */}
                    {coachSearch.trim() && !coachSelectedPlayer && !draftLockStatus.isLocked && (
                      <div className="mt-1 bg-white border-2 border-black shadow-md max-h-48 overflow-y-auto divide-y divide-black/10">
                        {filteredDbPlayers.length === 0 ? (
                          <div className="p-2.5 text-xs italic text-slate-500">
                            No player matches in database. You can still submit this custom name.
                          </div>
                        ) : (
                          filteredDbPlayers.map((player) => (
                            <button
                              type="button"
                              key={player.player_id}
                              onClick={() => {
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
                              className="w-full text-left p-2 hover:bg-yellow-100 flex items-center justify-between text-xs font-sans transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-bold uppercase text-black">{player.player_name}</span>
                                <span className="text-[10px] font-mono bg-neutral-100 px-1 py-0.5 border border-black/20">{player.pos}</span>
                                <span className="text-[10px] text-slate-500 font-serif italic">{player.team_default}</span>
                              </div>
                              <span className="font-mono font-black text-xs bg-black text-white px-1.5 py-0.5">
                                OVR {player.ovr}
                              </span>
                            </button>
                          ))
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
                        disabled={isSubmitting || draftLockStatus.isLocked || (!coachSelectedPlayer && !coachSearch.trim())}
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
                            Submit Official Pick #{nextEmptyPickSlot.pk}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* TOP RIGHT: THE HOCKEY CARD SPOTLIGHT */}
              <div className="col-span-12 lg:col-span-4 flex flex-col items-center justify-center">
                <div className="w-full text-center mb-1.5">
                  <span className="font-mono text-[10px] font-black uppercase tracking-widest text-slate-600 bg-white px-2 py-0.5 border border-black inline-block">
                    ★ Top-Right Spotlight Deck ★
                  </span>
                </div>
                <HockeyCardSpotlight draftItem={podium} title="DRAFT PROSPECT" />
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
                  {showCapital ? "View Selections" : "View Capital Picks"}
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
                                d.player
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