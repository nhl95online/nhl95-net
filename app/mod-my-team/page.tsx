"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useCoachAuth } from '@/lib/coach-auth';
import {
  Palette,
  Send,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Users,
  ArrowLeftRight,
  Shield,
  Sliders,
  Trophy,
  CheckCircle2,
  AlertCircle,
  Layers,
} from 'lucide-react';
import {
  W_LEAGUE_GOALIES,
  W_LEAGUE_SKATERS,
  W_LEAGUE_POSITION_COUNTS,
  O_LEAGUE_GOALIES,
  O_LEAGUE_SKATERS,
  O_LEAGUE_POSITION_COUNTS,
  TEAM_CITY_ALIASES,
  matchTeamFromList,
} from '@/lib/seasons';

type JerseySlotKey =
  | 'helmet'
  | 'jerseyMain'
  | 'shoulders'
  | 'stripe1'
  | 'stripe2'
  | 'pants'
  | 'socksMain'
  | 'socksStripe'
  | 'gloves'
  | 'numbers';

interface JerseyPalette {
  helmet: string;
  jerseyMain: string;
  shoulders: string;
  stripe1: string;
  stripe2: string;
  pants: string;
  socksMain: string;
  socksStripe: string;
  gloves: string;
  numbers: string;
}

const SLOT_METADATA: Array<{ key: JerseySlotKey; label: string; noseOffset: string }> = [
  { key: 'helmet', label: '1. Helmet / Visor Trim', noseOffset: 'Palette +0x02' },
  { key: 'jerseyMain', label: '2. Jersey Base (Torso)', noseOffset: 'Palette +0x04' },
  { key: 'shoulders', label: '3. Shoulder Yoke / Collar', noseOffset: 'Palette +0x06' },
  { key: 'stripe1', label: '4. Arm & Hem Stripe Primary', noseOffset: 'Palette +0x08' },
  { key: 'stripe2', label: '5. Arm & Hem Stripe Trim', noseOffset: 'Palette +0x0A' },
  { key: 'pants', label: '6. Breezers / Pants', noseOffset: 'Palette +0x0C' },
  { key: 'socksMain', label: '7. Socks Base', noseOffset: 'Palette +0x0E' },
  { key: 'socksStripe', label: '8. Socks Stripes', noseOffset: 'Palette +0x10' },
  { key: 'gloves', label: '9. Gloves & Skates', noseOffset: 'Palette +0x12' },
  { key: 'numbers', label: '10. Jersey Numbers / Crest', noseOffset: 'Palette +0x14' },
];

// Convert standard #RRGGBB hex to Sega Genesis 9-Bit BGR ($0BGR where each nibble is 0,2,4,6,8,A,C,E)
function hexToGenesisNose(hex: string): {
  noseHex: string;
  snappedHex: string;
  rLevel: number;
  gLevel: number;
  bLevel: number;
} {
  const clean = (hex || '#000000').replace('#', '').trim();
  const num = parseInt(clean.length === 6 ? clean : '000000', 16) || 0;
  const r8 = (num >> 16) & 0xff;
  const g8 = (num >> 8) & 0xff;
  const b8 = num & 0xff;

  const rLevel = Math.min(7, Math.max(0, Math.round((r8 / 255) * 7)));
  const gLevel = Math.min(7, Math.max(0, Math.round((g8 / 255) * 7)));
  const bLevel = Math.min(7, Math.max(0, Math.round((b8 / 255) * 7)));

  const rNib = (rLevel * 2).toString(16).toUpperCase();
  const gNib = (gLevel * 2).toString(16).toUpperCase();
  const bNib = (bLevel * 2).toString(16).toUpperCase();

  const noseHex = `$0${bNib}${gNib}${rNib}`;
  const to8 = (lvl: number) =>
    Math.round((lvl / 7) * 255)
      .toString(16)
      .padStart(2, '0');
  const snappedHex = `#${to8(rLevel)}${to8(gLevel)}${to8(bLevel)}`;

  return { noseHex, snappedHex, rLevel, gLevel, bLevel };
}

function levelsToHex(rLevel: number, gLevel: number, bLevel: number): string {
  const to8 = (lvl: number) =>
    Math.round((Math.min(7, Math.max(0, lvl)) / 7) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to8(rLevel)}${to8(gLevel)}${to8(bLevel)}`;
}

// Curated authentic team palettes (Home = Light, Away = Dark)
const TEAM_DEFAULT_PALETTES: Record<string, { home: JerseyPalette; away: JerseyPalette }> = {
  BOS: {
    home: { helmet: '#111111', jerseyMain: '#ffffff', shoulders: '#f59e0b', stripe1: '#111111', stripe2: '#f59e0b', pants: '#111111', socksMain: '#ffffff', socksStripe: '#f59e0b', gloves: '#111111', numbers: '#111111' },
    away: { helmet: '#111111', jerseyMain: '#111111', shoulders: '#f59e0b', stripe1: '#f59e0b', stripe2: '#ffffff', pants: '#111111', socksMain: '#111111', socksStripe: '#f59e0b', gloves: '#111111', numbers: '#f59e0b' },
  },
  CHI: {
    home: { helmet: '#ffffff', jerseyMain: '#ffffff', shoulders: '#ffffff', stripe1: '#dc2626', stripe2: '#111111', pants: '#111111', socksMain: '#ffffff', socksStripe: '#dc2626', gloves: '#111111', numbers: '#dc2626' },
    away: { helmet: '#111111', jerseyMain: '#dc2626', shoulders: '#dc2626', stripe1: '#111111', stripe2: '#ffffff', pants: '#111111', socksMain: '#dc2626', socksStripe: '#ffffff', gloves: '#111111', numbers: '#ffffff' },
  },
  DET: {
    home: { helmet: '#ffffff', jerseyMain: '#ffffff', shoulders: '#dc2626', stripe1: '#dc2626', stripe2: '#ffffff', pants: '#dc2626', socksMain: '#ffffff', socksStripe: '#dc2626', gloves: '#dc2626', numbers: '#dc2626' },
    away: { helmet: '#dc2626', jerseyMain: '#dc2626', shoulders: '#dc2626', stripe1: '#ffffff', stripe2: '#dc2626', pants: '#dc2626', socksMain: '#dc2626', socksStripe: '#ffffff', gloves: '#dc2626', numbers: '#ffffff' },
  },
  MTL: {
    home: { helmet: '#ffffff', jerseyMain: '#ffffff', shoulders: '#ffffff', stripe1: '#dc2626', stripe2: '#1d4ed8', pants: '#1d4ed8', socksMain: '#ffffff', socksStripe: '#dc2626', gloves: '#dc2626', numbers: '#1d4ed8' },
    away: { helmet: '#1d4ed8', jerseyMain: '#dc2626', shoulders: '#dc2626', stripe1: '#1d4ed8', stripe2: '#ffffff', pants: '#1d4ed8', socksMain: '#dc2626', socksStripe: '#1d4ed8', gloves: '#dc2626', numbers: '#ffffff' },
  },
  NYR: {
    home: { helmet: '#ffffff', jerseyMain: '#ffffff', shoulders: '#1d4ed8', stripe1: '#dc2626', stripe2: '#1d4ed8', pants: '#dc2626', socksMain: '#ffffff', socksStripe: '#1d4ed8', gloves: '#1d4ed8', numbers: '#dc2626' },
    away: { helmet: '#1d4ed8', jerseyMain: '#1d4ed8', shoulders: '#1d4ed8', stripe1: '#dc2626', stripe2: '#ffffff', pants: '#dc2626', socksMain: '#1d4ed8', socksStripe: '#dc2626', gloves: '#1d4ed8', numbers: '#ffffff' },
  },
  TOR: {
    home: { helmet: '#ffffff', jerseyMain: '#ffffff', shoulders: '#1d4ed8', stripe1: '#1d4ed8', stripe2: '#ffffff', pants: '#1d4ed8', socksMain: '#ffffff', socksStripe: '#1d4ed8', gloves: '#1d4ed8', numbers: '#1d4ed8' },
    away: { helmet: '#1d4ed8', jerseyMain: '#1d4ed8', shoulders: '#ffffff', stripe1: '#ffffff', stripe2: '#1d4ed8', pants: '#1d4ed8', socksMain: '#1d4ed8', socksStripe: '#ffffff', gloves: '#1d4ed8', numbers: '#ffffff' },
  },
};

function generateDefaultPaletteForTeam(abbr: string, name: string): { home: JerseyPalette; away: JerseyPalette } {
  const key = (abbr || '').trim().toUpperCase();
  if (TEAM_DEFAULT_PALETTES[key]) {
    return JSON.parse(JSON.stringify(TEAM_DEFAULT_PALETTES[key]));
  }
  const upper = `${key} ${(name || '').toUpperCase()}`;
  let primary = '#1d4ed8';
  let secondary = '#f59e0b';
  if (upper.includes('SUM') || upper.includes('TAI') || upper.includes('GRH') || upper.includes('BFC')) {
    primary = '#15803d';
    secondary = '#facc15';
  } else if (upper.includes('PIT') || upper.includes('PRO') || upper.includes('SVF') || upper.includes('HAM')) {
    primary = '#111111';
    secondary = '#f59e0b';
  } else if (upper.includes('TBP') || upper.includes('MHT') || upper.includes('AUT') || upper.includes('KAR')) {
    primary = '#b91c1c';
    secondary = '#111111';
  } else if (upper.includes('WDY') || upper.includes('BAR') || upper.includes('BAY') || upper.includes('NBK')) {
    primary = '#0369a1';
    secondary = '#38bdf8';
  } else if (upper.includes('MHA') || upper.includes('ROC') || upper.includes('VHV')) {
    primary = '#6d28d9';
    secondary = '#f59e0b';
  }
  return {
    home: {
      helmet: primary,
      jerseyMain: '#ffffff',
      shoulders: primary,
      stripe1: primary,
      stripe2: secondary,
      pants: primary,
      socksMain: '#ffffff',
      socksStripe: primary,
      gloves: primary,
      numbers: primary,
    },
    away: {
      helmet: primary,
      jerseyMain: primary,
      shoulders: secondary,
      stripe1: '#ffffff',
      stripe2: secondary,
      pants: '#111111',
      socksMain: primary,
      socksStripe: secondary,
      gloves: '#111111',
      numbers: '#ffffff',
    },
  };
}

// 16-bit NHL95 Skater + Jersey SVG Preview Component
function NoseJerseyPreview({
  title,
  palette,
  abbr,
  activeSlot,
  onSelectSlot,
}: {
  title: string;
  palette: JerseyPalette;
  abbr: string;
  activeSlot: JerseySlotKey;
  onSelectSlot: (slot: JerseySlotKey) => void;
}) {
  return (
    <div className="bg-[#12161f] border-2 border-black p-3 text-white font-sans flex flex-col items-center">
      <div className="w-full flex items-center justify-between border-b border-white/15 pb-1.5 mb-2">
        <span className="text-[11px] font-black uppercase tracking-widest text-amber-400">
          {title}
        </span>
        <span className="text-[9px] font-mono text-zinc-400">CLICK PART TO EDIT</span>
      </div>

      <svg
        viewBox="0 0 220 250"
        className="w-44 h-52 sm:w-48 sm:h-56 select-none drop-shadow-[0_4px_6px_rgba(0,0,0,0.7)]"
        style={{ shapeRendering: 'crispEdges' }}
      >
        {/* Ice Rink Oval Shadow */}
        <ellipse cx="110" cy="232" rx="66" ry="11" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" opacity="0.7" />

        {/* 1. Helmet */}
        <g
          onClick={() => onSelectSlot('helmet')}
          className="cursor-pointer hover:opacity-90"
        >
          <rect
            x="88"
            y="12"
            width="44"
            height="24"
            fill={palette.helmet}
            stroke={activeSlot === 'helmet' ? '#facc15' : '#000'}
            strokeWidth={activeSlot === 'helmet' ? '3' : '2'}
          />
          {/* Face / Visor */}
          <rect x="94" y="28" width="32" height="14" fill="#fcd34d" stroke="#000" strokeWidth="1.5" />
          <rect x="98" y="31" width="6" height="4" fill="#111" />
          <rect x="116" y="31" width="6" height="4" fill="#111" />
        </g>

        {/* 3. Shoulder Yoke */}
        <g
          onClick={() => onSelectSlot('shoulders')}
          className="cursor-pointer hover:opacity-90"
        >
          <path
            d="M44 44 H176 L186 64 H34 Z"
            fill={palette.shoulders}
            stroke={activeSlot === 'shoulders' ? '#facc15' : '#000'}
            strokeWidth={activeSlot === 'shoulders' ? '3' : '2'}
          />
          {/* Collar V-neck */}
          <polygon points="96,44 124,44 110,58" fill={palette.stripe1} stroke="#000" strokeWidth="1.5" />
        </g>

        {/* 2. Jersey Base Torso & Sleeves */}
        <g
          onClick={() => onSelectSlot('jerseyMain')}
          className="cursor-pointer hover:opacity-90"
        >
          {/* Left Sleeve */}
          <rect x="26" y="64" width="30" height="54" fill={palette.jerseyMain} stroke="#000" strokeWidth="2" />
          {/* Right Sleeve */}
          <rect x="164" y="64" width="30" height="54" fill={palette.jerseyMain} stroke="#000" strokeWidth="2" />
          {/* Main Torso */}
          <rect
            x="56"
            y="60"
            width="108"
            height="72"
            fill={palette.jerseyMain}
            stroke={activeSlot === 'jerseyMain' ? '#facc15' : '#000'}
            strokeWidth={activeSlot === 'jerseyMain' ? '3' : '2'}
          />
        </g>

        {/* 4. Arm & Waist Stripes Primary */}
        <g
          onClick={() => onSelectSlot('stripe1')}
          className="cursor-pointer hover:opacity-90"
        >
          <rect x="26" y="92" width="30" height="8" fill={palette.stripe1} />
          <rect x="164" y="92" width="30" height="8" fill={palette.stripe1} />
          <rect
            x="56"
            y="112"
            width="108"
            height="10"
            fill={palette.stripe1}
            stroke={activeSlot === 'stripe1' ? '#facc15' : 'none'}
            strokeWidth="2"
          />
        </g>

        {/* 5. Arm & Waist Stripes Secondary */}
        <g
          onClick={() => onSelectSlot('stripe2')}
          className="cursor-pointer hover:opacity-90"
        >
          <rect x="26" y="100" width="30" height="6" fill={palette.stripe2} />
          <rect x="164" y="100" width="30" height="6" fill={palette.stripe2} />
          <rect
            x="56"
            y="122"
            width="108"
            height="8"
            fill={palette.stripe2}
            stroke={activeSlot === 'stripe2' ? '#facc15' : 'none'}
            strokeWidth="2"
          />
        </g>

        {/* 10. Jersey Numbers / Crest */}
        <g
          onClick={() => onSelectSlot('numbers')}
          className="cursor-pointer hover:opacity-90"
        >
          <text
            x="110"
            y="95"
            textAnchor="middle"
            fill={palette.numbers}
            stroke="#000000"
            strokeWidth="1.2"
            fontSize="24"
            fontWeight="900"
            fontFamily="monospace"
          >
            95
          </text>
          <text
            x="110"
            y="108"
            textAnchor="middle"
            fill={palette.numbers}
            fontSize="9"
            fontWeight="900"
            fontFamily="sans-serif"
          >
            {(abbr || 'NHL').slice(0, 4)}
          </text>
        </g>

        {/* 9. Gloves */}
        <g
          onClick={() => onSelectSlot('gloves')}
          className="cursor-pointer hover:opacity-90"
        >
          <rect
            x="24"
            y="118"
            width="32"
            height="20"
            fill={palette.gloves}
            stroke={activeSlot === 'gloves' ? '#facc15' : '#000'}
            strokeWidth="2"
          />
          <rect
            x="164"
            y="118"
            width="32"
            height="20"
            fill={palette.gloves}
            stroke={activeSlot === 'gloves' ? '#facc15' : '#000'}
            strokeWidth="2"
          />
        </g>

        {/* 6. Breezers / Pants */}
        <g
          onClick={() => onSelectSlot('pants')}
          className="cursor-pointer hover:opacity-90"
        >
          <path
            d="M62 132 H158 L154 174 H116 L110 158 L104 174 H66 Z"
            fill={palette.pants}
            stroke={activeSlot === 'pants' ? '#facc15' : '#000'}
            strokeWidth={activeSlot === 'pants' ? '3' : '2'}
          />
        </g>

        {/* 7. Socks Base */}
        <g
          onClick={() => onSelectSlot('socksMain')}
          className="cursor-pointer hover:opacity-90"
        >
          <rect
            x="70"
            y="174"
            width="30"
            height="38"
            fill={palette.socksMain}
            stroke={activeSlot === 'socksMain' ? '#facc15' : '#000'}
            strokeWidth="2"
          />
          <rect
            x="120"
            y="174"
            width="30"
            height="38"
            fill={palette.socksMain}
            stroke={activeSlot === 'socksMain' ? '#facc15' : '#000'}
            strokeWidth="2"
          />
        </g>

        {/* 8. Socks Stripes */}
        <g
          onClick={() => onSelectSlot('socksStripe')}
          className="cursor-pointer hover:opacity-90"
        >
          <rect x="70" y="186" width="30" height="8" fill={palette.socksStripe} />
          <rect x="120" y="186" width="30" height="8" fill={palette.socksStripe} />
          <rect x="70" y="196" width="30" height="5" fill={palette.stripe2} />
          <rect x="120" y="196" width="30" height="5" fill={palette.stripe2} />
        </g>

        {/* 9. Skates */}
        <g
          onClick={() => onSelectSlot('gloves')}
          className="cursor-pointer hover:opacity-90"
        >
          <rect x="66" y="212" width="36" height="12" fill={palette.gloves} stroke="#000" strokeWidth="2" />
          <rect x="64" y="224" width="40" height="4" fill="#cbd5e1" stroke="#000" strokeWidth="1" />
          <rect x="118" y="212" width="36" height="12" fill={palette.gloves} stroke="#000" strokeWidth="2" />
          <rect x="116" y="224" width="40" height="4" fill="#cbd5e1" stroke="#000" strokeWidth="1" />
        </g>
      </svg>
    </div>
  );
}

type LineupSlot = 'LW' | 'C' | 'RW' | 'F4' | 'F5' | 'LD' | 'RD' | 'D3' | 'G1' | 'G2' | 'CUT';

interface ModRosterPlayer {
  id: string;
  name: string;
  pos: 'F' | 'D' | 'G';
  ovr: number;
  wgt: string | number;
  hand: string;
  originTag: string; // 'RETURNING', 'DRAFTED RD 1 #4', 'TRADED FROM SUM', etc.
  originType: 'returning' | 'drafted' | 'traded';
  slot: LineupSlot;
}

const normStr = (s: string) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const parseOvrFromRatings = (ratingsRaw: any): number => {
  if (!ratingsRaw) return 0;
  try {
    const r = typeof ratingsRaw === 'string' ? JSON.parse(ratingsRaw) : ratingsRaw;
    const cands = [r?.Ovr, r?.OVR, r?.OVERALL, r?.overall, r?.Overall, r?.ovr];
    for (const c of cands) {
      const n = Number(c);
      if (!isNaN(n) && n > 0) return n;
    }
  } catch {}
  return 0;
};

export default function ModMyTeamPage() {
  const { isLoggedIn, currentCoach } = useCoachAuth();

  const [selectedLeague, setSelectedLeague] = useState<'W' | 'O'>('W');
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // NOSE Jersey Editor State
  const [activeSide, setActiveSide] = useState<'home' | 'away'>('home');
  const [activeSlot, setActiveSlot] = useState<JerseySlotKey>('jerseyMain');
  const [homePalette, setHomePalette] = useState<JerseyPalette>(() =>
    generateDefaultPaletteForTeam('W', 'Team').home
  );
  const [awayPalette, setAwayPalette] = useState<JerseyPalette>(() =>
    generateDefaultPaletteForTeam('W', 'Team').away
  );
  const [rebrandName, setRebrandName] = useState<string>('');
  const [brandNotes, setBrandNotes] = useState<string>('');

  // Roster, Drafts, Trades & Starting Lineup State
  const [rosterPlayers, setRosterPlayers] = useState<ModRosterPlayer[]>([]);
  const [tradedOutNames, setTradedOutNames] = useState<string[]>([]);
  const [transactionsLog, setTransactionsLog] = useState<string[]>([]);
  const [manualAddName, setManualAddName] = useState<string>('');
  const [manualAddPos, setManualAddPos] = useState<'F' | 'D' | 'G'>('F');

  // Submission State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitBanner, setSubmitBanner] = useState<{ ok: boolean; msg: string } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // 1. Load active teams for W League (W18/W19) or Original 6 (O01/O02)
  useEffect(() => {
    async function fetchTeams() {
      setLoading(true);
      const targetLeagueId = selectedLeague === 'O' ? 39 : 40;
      const [teamsRes, coachesRes] = await Promise.all([
        supabase.from('league_teams').select('*').eq('league_id', targetLeagueId),
        supabase.from('league_coaches').select('*'),
      ]);

      const coachMap = new Map<number, string>();
      (coachesRes.data || []).forEach((c: any) => {
        if (c.coach_id != null && c.coach_name) {
          coachMap.set(Number(c.coach_id), String(c.coach_name).trim());
        }
      });

      const list = (teamsRes.data || [])
        .filter((t: any) => t.team_id && t.team_id !== 999 && t.team_id !== 68)
        .map((t: any) => ({
          team_id: Number(t.team_id),
          team_name: t.team_name || `Team ${t.team_id}`,
          abbreviation: (t.abbreviation || `TM${t.team_id}`).trim().toUpperCase(),
          logo_url: t.logo_url || null,
          coach_id: Number(t.coach_id || 0),
          coach_name: (t.coach_id && coachMap.get(Number(t.coach_id))) || t.coach_name || 'Coach',
        }))
        .sort((a: any, b: any) => a.team_name.localeCompare(b.team_name));

      setTeams(list);
      if (list.length > 0) {
        // Default to logged-in coach's team if found
        const myTeam =
          isLoggedIn && currentCoach
            ? list.find(
                (t: any) =>
                  t.coach_id === Number(currentCoach.coach_id) ||
                  normStr(t.coach_name) === normStr(currentCoach.coach_name)
              )
            : null;
        const pick = myTeam || list[0];
        setSelectedTeamId(String(pick.team_id));
      }
      setLoading(false);
    }

    fetchTeams();
  }, [selectedLeague, isLoggedIn, currentCoach]);

  const currentTeam = useMemo(
    () => teams.find((t) => String(t.team_id) === String(selectedTeamId)) || null,
    [teams, selectedTeamId]
  );

  // 2. When selected team changes: load default NOSE palette AND populate Roster + Drafts + Trades
  useEffect(() => {
    if (!currentTeam) return;
    const def = generateDefaultPaletteForTeam(currentTeam.abbreviation, currentTeam.team_name);
    setHomePalette(def.home);
    setAwayPalette(def.away);
    setRebrandName('');
    setBrandNotes('');
    setSubmitBanner(null);

    loadTeamRosterWithDraftsAndTrades(currentTeam);
  }, [currentTeam, selectedLeague]);

  const autoAssignLineupSlots = (players: Omit<ModRosterPlayer, 'slot'>[]): ModRosterPlayer[] => {
    const forwards = players.filter((p) => p.pos === 'F').sort((a, b) => b.ovr - a.ovr);
    const defensemen = players.filter((p) => p.pos === 'D').sort((a, b) => b.ovr - a.ovr);
    const goalies = players.filter((p) => p.pos === 'G').sort((a, b) => b.ovr - a.ovr);

    const slotMap = new Map<string, LineupSlot>();
    const fSlots: LineupSlot[] = ['LW', 'C', 'RW', 'F4', 'F5'];
    const dSlots: LineupSlot[] = ['LD', 'RD', 'D3'];
    const gSlots: LineupSlot[] = ['G1', 'G2'];

    forwards.forEach((p, idx) => {
      slotMap.set(p.id, fSlots[idx] || 'CUT');
    });
    defensemen.forEach((p, idx) => {
      slotMap.set(p.id, dSlots[idx] || 'CUT');
    });
    goalies.forEach((p, idx) => {
      slotMap.set(p.id, gSlots[idx] || 'CUT');
    });

    const slotOrder: Record<LineupSlot, number> = {
      LW: 1,
      C: 2,
      RW: 3,
      F4: 4,
      F5: 5,
      LD: 6,
      RD: 7,
      D3: 8,
      G1: 9,
      G2: 10,
      CUT: 99,
    };

    return players
      .map((p) => ({
        ...p,
        slot: slotMap.get(p.id) || 'CUT',
      }))
      .sort((a, b) => slotOrder[a.slot] - slotOrder[b.slot] || b.ovr - a.ovr);
  };

  async function loadTeamRosterWithDraftsAndTrades(team: any) {
    const isO6 = selectedLeague === 'O';
    const currentSeasonId = isO6 ? 39 : 40;
    const upcomingDraftLeagueIds = isO6 ? [54, 39] : [41, 40];
    const targetYear = isO6 ? 1928 : 2014;
    const prevYear = isO6 ? 1927 : 2013;

    // Resolve static config code from lib/seasons
    const codes = Object.keys(isO6 ? O_LEAGUE_SKATERS : W_LEAGUE_SKATERS);
    const abbrUpper = (team.abbreviation || '').toUpperCase();
    const nameUpper = (team.team_name || '').toUpperCase();

    let configCode = codes.find((c) => c.toUpperCase() === abbrUpper);
    if (!configCode) {
      for (const code of codes) {
        const matched = matchTeamFromList(code, teams);
        if (matched && Number(matched.team_id) === Number(team.team_id)) {
          configCode = code;
          break;
        }
      }
    }
    if (!configCode) {
      for (const code of codes) {
        const alias = (TEAM_CITY_ALIASES[code] || code).toUpperCase();
        if (nameUpper.includes(alias)) {
          configCode = code;
          break;
        }
      }
    }

    const baseSkaters = configCode
      ? (isO6 ? O_LEAGUE_SKATERS[configCode] : W_LEAGUE_SKATERS[configCode]) || []
      : [];
    const baseGoalies = configCode
      ? (isO6 ? O_LEAGUE_GOALIES[configCode] : W_LEAGUE_GOALIES[configCode]) || []
      : [];
    const posCounts = configCode
      ? (isO6 ? O_LEAGUE_POSITION_COUNTS[configCode] : W_LEAGUE_POSITION_COUNTS[configCode]) || {
          forwards: 5,
          defensemen: 3,
          goalies: 2,
        }
      : { forwards: 5, defensemen: 3, goalies: 2 };

    // Query DB: league_rosters, league_drafts (for upcoming & current season), and league_trades
    const [dbRostersRes, draftsRes, tradesRes] = await Promise.all([
      supabase.from('league_rosters').select('*').eq('team_id', Number(team.team_id)),
      supabase
        .from('league_drafts')
        .select('*, league_player_database(player_name, pos, ratings, player_info)')
        .in('league_id', upcomingDraftLeagueIds)
        .not('player_id', 'is', null),
      supabase.from('league_trades').select('*'),
    ]);

    const dbRosters = dbRostersRes.data || [];
    const allDrafts = draftsRes.data || [];
    const allTrades = tradesRes.data || [];

    // 1. Parse trades affecting this team in the active league
    const acquiredFromTrade: Array<{ name: string; pos: 'F' | 'D' | 'G'; note: string }> = [];
    const tradedAwaySet = new Set<string>();
    const tradedAwayDisplay: string[] = [];
    const txSummary: string[] = [];

    const parseTradeSidePlayers = (tradeStr: string): Array<{ pos: 'F' | 'D' | 'G'; name: string }> => {
      if (!tradeStr) return [];
      return tradeStr
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part && !/rdpk|pick|round|\d{4}/i.test(part))
        .map((part) => {
          const m = part.match(/^(F|D|G|LW|RW|C|LD|RD)\s+(.+)$/i);
          if (m) {
            const pRaw = m[1].toUpperCase();
            const pos: 'F' | 'D' | 'G' = pRaw === 'G' ? 'G' : pRaw.includes('D') ? 'D' : 'F';
            return { pos, name: m[2].trim() };
          }
          return { pos: 'F' as const, name: part };
        });
    };

    allTrades.forEach((tr: any) => {
      const lg = String(tr.lg || '').toUpperCase();
      if (isO6 && !lg.startsWith('O')) return;
      if (!isO6 && !lg.startsWith('W')) return;
      // Only recent seasons (W17/W18/W19 or O01/O02)
      if (!isO6 && !/W1[789]|W20/.test(lg)) return;

      const tA = String(tr.team || '').trim().toUpperCase();
      const tB = String(tr.team_1 || '').trim().toUpperCase();
      if (tA !== abbrUpper && tB !== abbrUpper) return;

      if (tA === abbrUpper) {
        const sent = parseTradeSidePlayers(tr.trade);
        const rec = parseTradeSidePlayers(tr.trade_1);
        sent.forEach((s) => {
          tradedAwaySet.add(normStr(s.name));
          tradedAwayDisplay.push(`${s.name} (to ${tB})`);
        });
        rec.forEach((r) => {
          acquiredFromTrade.push({ name: r.name, pos: r.pos, note: `TRADED FROM ${tB}` });
        });
        txSummary.push(`Trade w/ ${tB}: Acquired ${tr.trade_1 || 'assets'} for ${tr.trade || 'assets'}`);
      } else if (tB === abbrUpper) {
        const sent = parseTradeSidePlayers(tr.trade_1);
        const rec = parseTradeSidePlayers(tr.trade);
        sent.forEach((s) => {
          tradedAwaySet.add(normStr(s.name));
          tradedAwayDisplay.push(`${s.name} (to ${tA})`);
        });
        rec.forEach((r) => {
          acquiredFromTrade.push({ name: r.name, pos: r.pos, note: `TRADED FROM ${tA}` });
        });
        txSummary.push(`Trade w/ ${tA}: Acquired ${tr.trade || 'assets'} for ${tr.trade_1 || 'assets'}`);
      }
    });

    // 2. Parse draft picks made by this team
    const draftedByTeam = allDrafts.filter((d: any) => Number(d.team_id) === Number(team.team_id));
    const draftedEntries: Array<{
      name: string;
      pos: 'F' | 'D' | 'G';
      ovr: number;
      note: string;
    }> = [];

    draftedByTeam.forEach((d: any) => {
      const dbP = Array.isArray(d.league_player_database)
        ? d.league_player_database[0]
        : d.league_player_database;
      const pName = String(dbP?.player_name || d.player_name || '').trim();
      if (!pName || pName === 'N/A') return;
      const rawPos = String(dbP?.pos || 'F').toUpperCase();
      const pos: 'F' | 'D' | 'G' = rawPos === 'G' ? 'G' : rawPos === 'D' ? 'D' : 'F';
      const ovr = parseOvrFromRatings(dbP?.ratings) || 76;
      const rd = Number(d.round || 1);
      const pk = Number(d.pick_number || 1);
      draftedEntries.push({
        name: pName,
        pos,
        ovr,
        note: `DRAFTED RD ${rd}, #${pk}`,
      });
      txSummary.push(`Draft Pick (Rd ${rd}, #${pk}): Selected ${pName} (${pos}, OVR ${ovr})`);
    });

    // 3. Collect all candidate player names to fetch their latest OVR / Weight / Hand from league_player_database
    const candidateItems: Array<{
      name: string;
      defaultPos: 'F' | 'D' | 'G';
      originTag: string;
      originType: 'returning' | 'drafted' | 'traded';
      fallbackOvr?: number;
    }> = [];
    const seen = new Set<string>();

    // Add newly drafted players first
    draftedEntries.forEach((d) => {
      const k = normStr(d.name);
      if (!k || seen.has(k) || tradedAwaySet.has(k)) return;
      seen.add(k);
      candidateItems.push({
        name: d.name,
        defaultPos: d.pos,
        originTag: d.note,
        originType: 'drafted',
        fallbackOvr: d.ovr,
      });
    });

    // Add players acquired via trade
    acquiredFromTrade.forEach((tr) => {
      const k = normStr(tr.name);
      if (!k || seen.has(k)) return;
      seen.add(k);
      candidateItems.push({
        name: tr.name,
        defaultPos: tr.pos,
        originTag: tr.note,
        originType: 'traded',
      });
    });

    // Add returning skaters from static config (excluding anyone traded away)
    baseSkaters.forEach((rawName, idx) => {
      const pName = String(rawName || '').trim();
      if (!pName || pName === '--' || pName === 'N/A') return;
      const k = normStr(pName);
      if (!k || seen.has(k) || tradedAwaySet.has(k)) return;
      seen.add(k);
      const defPos: 'F' | 'D' = idx < (posCounts.forwards || 5) ? 'F' : 'D';
      candidateItems.push({
        name: pName,
        defaultPos: defPos,
        originTag: 'RETURNING ROSTER',
        originType: 'returning',
      });
    });

    // Add returning goalies from static config
    baseGoalies.forEach((rawName) => {
      const pName = String(rawName || '').trim();
      if (!pName || pName === '--' || pName === 'N/A') return;
      const k = normStr(pName);
      if (!k || seen.has(k) || tradedAwaySet.has(k)) return;
      seen.add(k);
      candidateItems.push({
        name: pName,
        defaultPos: 'G',
        originTag: 'RETURNING ROSTER',
        originType: 'returning',
      });
    });

    // Add any additional DB roster rows for this team
    dbRosters.forEach((r: any) => {
      const pName = String(r.player_name || '').trim();
      if (!pName || pName === '--' || pName === 'N/A') return;
      const k = normStr(pName);
      if (!k || seen.has(k) || tradedAwaySet.has(k)) return;
      seen.add(k);
      const rawP = String(r.pos || 'F').toUpperCase();
      const defPos: 'F' | 'D' | 'G' = rawP === 'G' ? 'G' : rawP === 'D' ? 'D' : 'F';
      candidateItems.push({
        name: pName,
        defaultPos: defPos,
        originTag: 'RETURNING ROSTER',
        originType: 'returning',
      });
    });

    // Look up ratings in league_player_database for these names
    const namesList = candidateItems.map((c) => c.name);
    let dbPlayerRows: any[] = [];
    if (namesList.length > 0) {
      const { data: pRows } = await supabase
        .from('league_player_database')
        .select('player_id, player_name, pos, ratings, player_info')
        .in('player_name', namesList);
      dbPlayerRows = pRows || [];
    }

    const builtPlayers: Omit<ModRosterPlayer, 'slot'>[] = candidateItems.map((item, idx) => {
      const matches = dbPlayerRows.filter(
        (r: any) => normStr(r.player_name) === normStr(item.name)
      );
      // Prefer upcoming year (e.g. 2014 / 1928) or current year (2013 / 1927)
      let bestMatch =
        matches.find((m: any) => Number(m.player_info?.source_year) === targetYear) ||
        matches.find((m: any) => Number(m.player_info?.source_year) === prevYear) ||
        matches[0];

      const ovr = parseOvrFromRatings(bestMatch?.ratings) || item.fallbackOvr || 72;
      const dbPos = String(bestMatch?.pos || item.defaultPos).toUpperCase();
      const pos: 'F' | 'D' | 'G' =
        item.defaultPos === 'G' || dbPos === 'G'
          ? 'G'
          : item.defaultPos === 'D' || dbPos === 'D'
          ? 'D'
          : 'F';

      const wgt = bestMatch?.ratings?.Weight || bestMatch?.player_info?.weight || 188;
      const hand =
        bestMatch?.ratings?.Hand === 0 || String(bestMatch?.ratings?.Hand).startsWith('L')
          ? 'L'
          : 'R';

      return {
        id: `${normStr(item.name)}-${idx}`,
        name: item.name,
        pos,
        ovr,
        wgt,
        hand,
        originTag: item.originTag,
        originType: item.originType,
      };
    });

    setRosterPlayers(autoAssignLineupSlots(builtPlayers));
    setTradedOutNames(tradedAwayDisplay);
    setTransactionsLog(txSummary);
  }

  // Active NOSE color editing helpers
  const currentPalette = activeSide === 'home' ? homePalette : awayPalette;
  const activeHex = currentPalette[activeSlot] || '#ffffff';
  const activeNoseInfo = hexToGenesisNose(activeHex);

  const updateActiveSlotColor = (newHex: string) => {
    const snapped = hexToGenesisNose(newHex).snappedHex;
    if (activeSide === 'home') {
      setHomePalette((prev) => ({ ...prev, [activeSlot]: snapped }));
    } else {
      setAwayPalette((prev) => ({ ...prev, [activeSlot]: snapped }));
    }
  };

  const handleSwapHomeAway = () => {
    const temp = { ...homePalette };
    setHomePalette({ ...awayPalette });
    setAwayPalette(temp);
  };

  const handleResetPalette = () => {
    if (!currentTeam) return;
    const def = generateDefaultPaletteForTeam(currentTeam.abbreviation, currentTeam.team_name);
    setHomePalette(def.home);
    setAwayPalette(def.away);
  };

  const handleSlotChange = (playerId: string, newSlot: LineupSlot) => {
    setRosterPlayers((prev) =>
      prev.map((p) => (p.id === playerId ? { ...p, slot: newSlot } : p))
    );
  };

  const handleManualAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualAddName.trim();
    if (!clean) return;
    const newPlayer: ModRosterPlayer = {
      id: `manual-${Date.now()}`,
      name: clean,
      pos: manualAddPos,
      ovr: 75,
      wgt: 188,
      hand: 'L',
      originTag: 'OFFSEASON ACQUISITION',
      originType: 'traded',
      slot: manualAddPos === 'G' ? 'G2' : manualAddPos === 'D' ? 'D3' : 'F5',
    };
    setRosterPlayers((prev) => [...prev, newPlayer]);
    setTransactionsLog((prev) => [`Added Offseason Acquisition: ${clean} (${manualAddPos})`, ...prev]);
    setManualAddName('');
  };

  // Build structured payload for Discord submission & clipboard
  const buildSubmissionPayload = () => {
    const seasonLabel = selectedLeague === 'O' ? 'O02 (1928)' : 'W19 (2014)';
    const formatPal = (pal: JerseyPalette) => {
      const out: Record<string, { hex: string; noseHex: string }> = {};
      (Object.keys(pal) as JerseySlotKey[]).forEach((k) => {
        const info = hexToGenesisNose(pal[k]);
        out[k] = { hex: info.snappedHex, noseHex: info.noseHex };
      });
      return out;
    };

    const findBySlot = (s: LineupSlot) =>
      rosterPlayers
        .filter((p) => p.slot === s)
        .map((p) => `${p.name} (${p.pos}, OVR ${p.ovr})`)
        .join(' / ') || 'OPEN';

    const startingLineup = {
      LW: findBySlot('LW'),
      C: findBySlot('C'),
      RW: findBySlot('RW'),
      LD: findBySlot('LD'),
      RD: findBySlot('RD'),
      G1: findBySlot('G1'),
      G2: findBySlot('G2'),
    };

    const benchPlayers = rosterPlayers
      .filter((p) => ['F4', 'F5', 'D3'].includes(p.slot))
      .map((p) => `[${p.slot}] ${p.name} (${p.pos}, OVR ${p.ovr}) — ${p.originTag}`);

    const cutPlayers = rosterPlayers
      .filter((p) => p.slot === 'CUT')
      .map((p) => `${p.name} (${p.pos}, OVR ${p.ovr})`);

    return {
      leagueType: selectedLeague,
      seasonLabel,
      teamName: currentTeam?.team_name || 'Team',
      teamAbbr: currentTeam?.abbreviation || 'TM',
      coachName:
        (isLoggedIn && currentCoach?.coach_name) || currentTeam?.coach_name || 'Coach',
      logoUrl: currentTeam?.logo_url || null,
      rebrandName: rebrandName.trim(),
      brandNotes: brandNotes.trim(),
      homePalette: formatPal(homePalette),
      awayPalette: formatPal(awayPalette),
      startingLineup,
      benchPlayers,
      cutPlayers,
      transactionsSummary: transactionsLog,
    };
  };

  const handleCopyForDiscord = () => {
    const p = buildSubmissionPayload();
    const homeLines = SLOT_METADATA.map(
      (s) => `  ${s.label.padEnd(28, ' ')}: ${p.homePalette[s.key]?.noseHex} (${p.homePalette[s.key]?.hex})`
    ).join('\n');
    const awayLines = SLOT_METADATA.map(
      (s) => `  ${s.label.padEnd(28, ' ')}: ${p.awayPalette[s.key]?.noseHex} (${p.awayPalette[s.key]?.hex})`
    ).join('\n');

    const text = [
      `🎨 **NHL95 "MOD MY TEAM" NOSE & LINEUP SUBMISSION [${p.seasonLabel}]**`,
      `🏒 **Team:** ${p.teamName} (${p.teamAbbr}) • **Coach:** ${p.coachName}`,
      p.rebrandName ? `✨ **New Brand Identity:** ${p.rebrandName}` : null,
      p.brandNotes ? `📝 **Brand Notes:** ${p.brandNotes}` : null,
      ``,
      `🏠 **HOME JERSEY (NOSE 9-Bit BGR):**`,
      '```',
      homeLines,
      '```',
      `✈️ **AWAY JERSEY (NOSE 9-Bit BGR):**`,
      '```',
      awayLines,
      '```',
      `⭐ **STARTING LINEUP & ROM SLOTS:**`,
      `• **LW:** ${p.startingLineup.LW}`,
      `• **C:** ${p.startingLineup.C}`,
      `• **RW:** ${p.startingLineup.RW}`,
      `• **LD:** ${p.startingLineup.LD}`,
      `• **RD:** ${p.startingLineup.RD}`,
      `• **G1 (Starter):** ${p.startingLineup.G1}`,
      `• **G2 (Backup):** ${p.startingLineup.G2}`,
      `• **Bench (F4/F5/D3):** ${p.benchPlayers.join(' | ') || 'None'}`,
      p.cutPlayers.length > 0 ? `• **Cuts / Waived:** ${p.cutPlayers.join(', ')}` : null,
    ]
      .filter((l) => l !== null)
      .join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSubmitToDiscord = async () => {
    setSubmitting(true);
    setSubmitBanner(null);
    try {
      const payload = buildSubmissionPayload();
      const res = await fetch('/api/mod-my-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data?.posted) {
        setSubmitBanner({
          ok: true,
          msg: `Submitted ${payload.teamName} NOSE Jersey Palette & Starting Lineup directly to Discord (${data.channelName})!`,
        });
      } else {
        handleCopyForDiscord();
        setSubmitBanner({
          ok: false,
          msg: `Copied full NOSE & Starting Lineup sheet to clipboard! (${data?.error || 'Ready to paste in Discord'})`,
        });
      }
    } catch (e: any) {
      handleCopyForDiscord();
      setSubmitBanner({
        ok: false,
        msg: 'Copied NOSE & Starting Lineup sheet to clipboard for Discord!',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Count active 10-man roster compliance (5F, 3D, 2G)
  const activeForwardsCount = rosterPlayers.filter((p) =>
    ['LW', 'C', 'RW', 'F4', 'F5'].includes(p.slot)
  ).length;
  const activeDefenseCount = rosterPlayers.filter((p) =>
    ['LD', 'RD', 'D3'].includes(p.slot)
  ).length;
  const activeGoaliesCount = rosterPlayers.filter((p) =>
    ['G1', 'G2'].includes(p.slot)
  ).length;

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-black font-serif p-2 sm:p-6 md:p-8 pb-20">
      <div className="max-w-7xl mx-auto">
        {/* Masthead */}
        <header className="border-b-4 border-black pb-4 mb-6 text-center">
          <div className="inline-flex items-center gap-2 bg-black text-amber-400 px-3 py-1 text-[10px] sm:text-xs font-sans font-black uppercase tracking-widest mb-2 border border-black">
            <Palette className="w-3.5 h-3.5 text-amber-400" />
            <span>NHL95 NOSE ROM Studio & Offseason Lineup Builder</span>
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tighter">
            Mod My Team
          </h1>
          <p className="text-xs sm:text-sm italic text-neutral-700 mt-1 max-w-2xl mx-auto">
            Customize your club&apos;s 16-bit NHL95 NOSE Home &amp; Away Jersey Palettes, review your updated roster with Offseason Drafts &amp; Trades, set your Starting Lineup, and submit directly to Discord!
          </p>
        </header>

        {/* Top Selector Bar: League, Team, and Submit Actions */}
        <div className="bg-black text-white border-2 border-black p-3 sm:p-4 mb-6 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 font-sans">
          <div className="flex flex-wrap items-center gap-3">
            {/* League Toggle */}
            <div className="flex items-center border border-zinc-700 bg-zinc-900">
              <button
                type="button"
                onClick={() => setSelectedLeague('W')}
                className={`px-3 py-1.5 text-xs font-black uppercase cursor-pointer transition ${
                  selectedLeague === 'W'
                    ? 'bg-amber-400 text-black'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                W League (W19 Prep)
              </button>
              <button
                type="button"
                onClick={() => setSelectedLeague('O')}
                className={`px-3 py-1.5 text-xs font-black uppercase cursor-pointer transition ${
                  selectedLeague === 'O'
                    ? 'bg-amber-400 text-black'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                Original 6 (O02 Prep)
              </button>
            </div>

            {/* Team Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                SELECT CLUB:
              </span>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="bg-zinc-900 text-white border border-zinc-600 px-3 py-1.5 text-xs font-black uppercase outline-none cursor-pointer"
              >
                {teams.map((t) => (
                  <option key={t.team_id} value={t.team_id}>
                    {t.team_name} ({t.abbreviation}) — Coach: {t.coach_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyForDiscord}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied NOSE & Lineup!' : 'Copy Sheet for Discord'}</span>
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmitToDiscord}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black border border-black text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition shadow-sm"
            >
              <Send className="w-4 h-4" />
              <span>
                {submitting ? 'Submitting to Discord...' : 'Submit Brand & Lineup to Discord'}
              </span>
            </button>
          </div>
        </div>

        {submitBanner && (
          <div
            className={`mb-6 p-3 border-2 border-black font-sans text-xs font-black uppercase tracking-wider flex items-center justify-between ${
              submitBanner.ok ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-100 text-black'
            }`}
          >
            <div className="flex items-center gap-2">
              {submitBanner.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-800 shrink-0" />
              )}
              <span>{submitBanner.msg}</span>
            </div>
            <button
              type="button"
              onClick={() => setSubmitBanner(null)}
              className="underline text-[10px] ml-4 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main 2-Column Studio Grid: Left = NOSE Jersey Editor | Right = Roster, Drafts, Trades & Starting Lineup */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN (5 cols): NHL95 NOSE JERSEY & BRAND EDITOR */}
          <section className="lg:col-span-5 bg-[#fdfaf3] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="bg-black text-white px-4 py-2.5 flex items-center justify-between font-sans">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span className="font-black text-xs sm:text-sm uppercase tracking-wider">
                  1. NHL95 NOSE Jersey Palette Editor
                </span>
              </div>
              <span className="text-[10px] font-mono text-amber-400">9-BIT SEGA BGR ($0BGR)</span>
            </div>

            <div className="p-4 space-y-4 font-sans">
              {/* Side-by-Side Live Home & Away 16-Bit Skater Sprites */}
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setActiveSide('home')}
                  className={`cursor-pointer transition ${
                    activeSide === 'home' ? 'ring-2 ring-amber-500' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  <NoseJerseyPreview
                    title="🏠 HOME (LIGHT)"
                    palette={homePalette}
                    abbr={currentTeam?.abbreviation || 'NHL'}
                    activeSlot={activeSlot}
                    onSelectSlot={(s) => {
                      setActiveSide('home');
                      setActiveSlot(s);
                    }}
                  />
                </div>

                <div
                  onClick={() => setActiveSide('away')}
                  className={`cursor-pointer transition ${
                    activeSide === 'away' ? 'ring-2 ring-amber-500' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  <NoseJerseyPreview
                    title="✈️ AWAY (DARK)"
                    palette={awayPalette}
                    abbr={currentTeam?.abbreviation || 'NHL'}
                    activeSlot={activeSlot}
                    onSelectSlot={(s) => {
                      setActiveSide('away');
                      setActiveSlot(s);
                    }}
                  />
                </div>
              </div>

              {/* Quick Uniform Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#ece8de] border border-black p-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveSide('home')}
                    className={`px-2.5 py-1 text-[11px] font-black uppercase cursor-pointer ${
                      activeSide === 'home' ? 'bg-black text-amber-400' : 'bg-white text-black'
                    } border border-black`}
                  >
                    Edit Home
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSide('away')}
                    className={`px-2.5 py-1 text-[11px] font-black uppercase cursor-pointer ${
                      activeSide === 'away' ? 'bg-black text-amber-400' : 'bg-white text-black'
                    } border border-black`}
                  >
                    Edit Away
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleSwapHomeAway}
                    className="px-2 py-1 bg-white hover:bg-black hover:text-white text-black border border-black text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer transition"
                  >
                    <ArrowLeftRight className="w-3 h-3" /> Swap H/A
                  </button>
                  <button
                    type="button"
                    onClick={handleResetPalette}
                    className="px-2 py-1 bg-white hover:bg-red-700 hover:text-white text-black border border-black text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer transition"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                </div>
              </div>

              {/* 10 NOSE Palette Slots Selector Table */}
              <div>
                <div className="text-[11px] font-black uppercase tracking-wider text-neutral-700 mb-1.5">
                  Select NOSE Uniform Slot ({activeSide.toUpperCase()} JERSEY):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {SLOT_METADATA.map((slot) => {
                    const colHex = currentPalette[slot.key];
                    const nose = hexToGenesisNose(colHex);
                    const isSelected = activeSlot === slot.key;
                    return (
                      <button
                        key={slot.key}
                        type="button"
                        onClick={() => setActiveSlot(slot.key)}
                        className={`flex items-center justify-between p-1.5 border text-left cursor-pointer transition ${
                          isSelected
                            ? 'bg-black text-white border-black ring-2 ring-amber-400'
                            : 'bg-white text-black border-black/40 hover:border-black'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-5 h-5 shrink-0 border border-black"
                            style={{ backgroundColor: nose.snappedHex }}
                          />
                          <span className="text-[11px] font-bold truncate">{slot.label}</span>
                        </div>
                        <span
                          className={`text-[10px] font-mono font-black px-1 ${
                            isSelected ? 'text-amber-400' : 'text-neutral-600'
                          }`}
                        >
                          {nose.noseHex}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Slot 9-Bit BGR Sliders & Color Picker */}
              <div className="bg-black text-white p-3 border border-black space-y-2.5">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
                  <div>
                    <div className="text-[10px] text-amber-400 font-black uppercase">
                      ACTIVE SLOT: {SLOT_METADATA.find((s) => s.key === activeSlot)?.label}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-400">
                      NOSE Value: <strong className="text-white">{activeNoseInfo.noseHex}</strong> • Hex:{' '}
                      <strong className="text-white">{activeNoseInfo.snappedHex.toUpperCase()}</strong>
                    </div>
                  </div>
                  <input
                    type="color"
                    value={activeNoseInfo.snappedHex}
                    onChange={(e) => updateActiveSlotColor(e.target.value)}
                    className="w-9 h-8 border border-white cursor-pointer bg-transparent"
                    title="Pick any color (auto-snaps to Genesis 9-bit palette)"
                  />
                </div>

                {/* Genesis 0-7 R, G, B Sliders */}
                <div className="space-y-1.5 text-[11px] font-mono">
                  <div className="flex items-center gap-2">
                    <span className="w-14 text-red-400 font-bold">RED ({activeNoseInfo.rLevel * 2}):</span>
                    <input
                      type="range"
                      min={0}
                      max={7}
                      value={activeNoseInfo.rLevel}
                      onChange={(e) =>
                        updateActiveSlotColor(
                          levelsToHex(Number(e.target.value), activeNoseInfo.gLevel, activeNoseInfo.bLevel)
                        )
                      }
                      className="flex-1 accent-red-500 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-14 text-emerald-400 font-bold">GRN ({activeNoseInfo.gLevel * 2}):</span>
                    <input
                      type="range"
                      min={0}
                      max={7}
                      value={activeNoseInfo.gLevel}
                      onChange={(e) =>
                        updateActiveSlotColor(
                          levelsToHex(activeNoseInfo.rLevel, Number(e.target.value), activeNoseInfo.bLevel)
                        )
                      }
                      className="flex-1 accent-emerald-500 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-14 text-sky-400 font-bold">BLU ({activeNoseInfo.bLevel * 2}):</span>
                    <input
                      type="range"
                      min={0}
                      max={7}
                      value={activeNoseInfo.bLevel}
                      onChange={(e) =>
                        updateActiveSlotColor(
                          levelsToHex(activeNoseInfo.rLevel, activeNoseInfo.gLevel, Number(e.target.value))
                        )
                      }
                      className="flex-1 accent-sky-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Quick Classic NHL95 Swatches */}
                <div className="pt-1 flex flex-wrap gap-1">
                  {[
                    '#ffffff',
                    '#111111',
                    '#dc2626',
                    '#991b1b',
                    '#f59e0b',
                    '#facc15',
                    '#15803d',
                    '#065f46',
                    '#1d4ed8',
                    '#1e3a8a',
                    '#0284c7',
                    '#38bdf8',
                    '#6d28d9',
                    '#db2777',
                    '#ea580c',
                    '#94a3b8',
                  ].map((sw) => (
                    <button
                      key={sw}
                      type="button"
                      onClick={() => updateActiveSlotColor(sw)}
                      className="w-5 h-5 border border-white/40 hover:scale-110 transition cursor-pointer"
                      style={{ backgroundColor: sw }}
                      title={hexToGenesisNose(sw).noseHex}
                    />
                  ))}
                </div>
              </div>

              {/* Optional Offseason Rebrand / Team Brand Notes */}
              <div className="bg-[#f4f1ea] border border-black p-3 space-y-2">
                <div className="text-[11px] font-black uppercase tracking-wider">
                  Offseason Team Brand / Rebrand Notes (Optional):
                </div>
                <input
                  type="text"
                  value={rebrandName}
                  onChange={(e) => setRebrandName(e.target.value)}
                  placeholder="Optional New Team Name / Abbreviation (leave blank if keeping current)"
                  className="w-full bg-white border border-black px-2.5 py-1.5 text-xs font-bold outline-none"
                />
                <textarea
                  rows={2}
                  value={brandNotes}
                  onChange={(e) => setBrandNotes(e.target.value)}
                  placeholder="Center ice logo notes, jersey template style, or special ROM instructions..."
                  className="w-full bg-white border border-black px-2.5 py-1.5 text-xs font-medium outline-none"
                />
              </div>
            </div>
          </section>

          {/* RIGHT COLUMN (7 cols): TEAM ROSTER (WITH DRAFTS & TRADES) & STARTING LINEUP EDITOR */}
          <section className="lg:col-span-7 bg-[#fdfaf3] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="bg-black text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 font-sans">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span className="font-black text-xs sm:text-sm uppercase tracking-wider">
                  2. Updated Offseason Roster &amp; Starting Lineup ({currentTeam?.abbreviation})
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase">
                <span
                  className={`px-2 py-0.5 border ${
                    activeForwardsCount === 5
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                      : 'bg-amber-900 text-amber-200 border-amber-400'
                  }`}
                >
                  F: {activeForwardsCount}/5
                </span>
                <span
                  className={`px-2 py-0.5 border ${
                    activeDefenseCount === 3
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                      : 'bg-amber-900 text-amber-200 border-amber-400'
                  }`}
                >
                  D: {activeDefenseCount}/3
                </span>
                <span
                  className={`px-2 py-0.5 border ${
                    activeGoaliesCount === 2
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                      : 'bg-amber-900 text-amber-200 border-amber-400'
                  }`}
                >
                  G: {activeGoaliesCount}/2
                </span>
              </div>
            </div>

            <div className="p-4 space-y-4 font-sans">
              {/* Visual Starting Lineup Ice Card (LW - C - RW / LD - RD / G1 - G2) */}
              <div className="bg-[#12161f] text-white border-2 border-black p-3">
                <div className="flex items-center justify-between border-b border-white/15 pb-1.5 mb-3">
                  <span className="text-[11px] font-black uppercase tracking-widest text-amber-400">
                    ⭐ ACTIVE STARTING LINEUP PREVIEW (ROM ICE SLOTS)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setRosterPlayers((prev) =>
                        autoAssignLineupSlots(
                          prev.map(({ slot, ...rest }) => rest)
                        )
                      )
                    }
                    className="px-2 py-0.5 bg-amber-400 text-black text-[10px] font-black uppercase cursor-pointer hover:bg-amber-300"
                  >
                    Auto-Optimize by OVR
                  </button>
                </div>

                {/* Starting Forwards Row */}
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {(['LW', 'C', 'RW'] as LineupSlot[]).map((slot) => {
                    const p = rosterPlayers.find((r) => r.slot === slot);
                    return (
                      <div key={slot} className="bg-zinc-900 border border-zinc-700 p-2 text-center">
                        <div className="text-[10px] font-black text-amber-400 uppercase">{slot} STARTER</div>
                        <div className="text-xs font-black truncate mt-0.5">
                          {p ? p.name : '— Empty —'}
                        </div>
                        {p && (
                          <div className="text-[10px] text-emerald-400 font-mono font-bold">
                            OVR {p.ovr} • {p.hand}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Starting Defense + Goalies Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['LD', 'RD', 'G1', 'G2'] as LineupSlot[]).map((slot) => {
                    const p = rosterPlayers.find((r) => r.slot === slot);
                    return (
                      <div key={slot} className="bg-zinc-900 border border-zinc-700 p-2 text-center">
                        <div className="text-[10px] font-black text-sky-400 uppercase">
                          {slot === 'G1' ? 'G1 (STARTER)' : slot === 'G2' ? 'G2 (BACKUP)' : `${slot} STARTER`}
                        </div>
                        <div className="text-xs font-black truncate mt-0.5">
                          {p ? p.name : '— Empty —'}
                        </div>
                        {p && (
                          <div className="text-[10px] text-emerald-400 font-mono font-bold">
                            OVR {p.ovr} • {p.hand}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Offseason Drafts & Trades Auto-Applied Summary */}
              {(transactionsLog.length > 0 || tradedOutNames.length > 0) && (
                <div className="bg-amber-50 border border-black p-3 space-y-1">
                  <div className="text-[11px] font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                    <span>Offseason Draft Picks &amp; Trades Automatically Synced:</span>
                  </div>
                  <ul className="text-[11px] text-neutral-800 space-y-0.5 list-disc list-inside">
                    {transactionsLog.slice(0, 6).map((t, i) => (
                      <li key={i} className="font-medium">
                        {t}
                      </li>
                    ))}
                    {tradedOutNames.length > 0 && (
                      <li className="text-red-800 font-bold">
                        Traded Away (Removed): {tradedOutNames.join(', ')}
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Full Interactive Roster & Lineup Slot Table */}
              <div className="overflow-x-auto border border-black bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-black text-white uppercase text-[10px] font-black tracking-wider">
                      <th className="py-2 px-2.5">LINEUP SLOT</th>
                      <th className="py-2 px-2.5">PLAYER</th>
                      <th className="py-2 px-2 text-center">POS</th>
                      <th className="py-2 px-2 text-center">OVR</th>
                      <th className="py-2 px-2 text-center">HAND / WGT</th>
                      <th className="py-2 px-2.5">ACQUISITION STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/15">
                    {rosterPlayers.map((p) => {
                      const isStarter = ['LW', 'C', 'RW', 'LD', 'RD', 'G1'].includes(p.slot);
                      const isCut = p.slot === 'CUT';
                      return (
                        <tr
                          key={p.id}
                          className={`${
                            isCut
                              ? 'bg-red-50/70 opacity-65'
                              : isStarter
                              ? 'bg-amber-50/50 font-semibold'
                              : 'bg-white'
                          } hover:bg-black/5 transition`}
                        >
                          <td className="py-1.5 px-2.5">
                            <select
                              value={p.slot}
                              onChange={(e) => handleSlotChange(p.id, e.target.value as LineupSlot)}
                              className={`border border-black px-2 py-1 text-[11px] font-black uppercase cursor-pointer outline-none ${
                                isCut
                                  ? 'bg-red-700 text-white'
                                  : isStarter
                                  ? 'bg-black text-amber-400'
                                  : 'bg-zinc-200 text-black'
                              }`}
                            >
                              <optgroup label="Starting Lineup">
                                <option value="LW">LW (Starter)</option>
                                <option value="C">C (Starter)</option>
                                <option value="RW">RW (Starter)</option>
                                <option value="LD">LD (Starter)</option>
                                <option value="RD">RD (Starter)</option>
                                <option value="G1">G1 (Starter)</option>
                              </optgroup>
                              <optgroup label="Active Bench / Backup">
                                <option value="F4">F4 (Bench F)</option>
                                <option value="F5">F5 (Bench F)</option>
                                <option value="D3">D3 (Bench D)</option>
                                <option value="G2">G2 (Backup G)</option>
                              </optgroup>
                              <optgroup label="Offseason Cuts">
                                <option value="CUT">CUT / WAIVE</option>
                              </optgroup>
                            </select>
                          </td>
                          <td className="py-1.5 px-2.5 font-black uppercase text-xs">
                            {p.name}
                          </td>
                          <td className="py-1.5 px-2 text-center font-black">{p.pos}</td>
                          <td className="py-1.5 px-2 text-center">
                            <span
                              className={`inline-block px-1.5 py-0.5 text-[11px] font-black border border-black ${
                                p.ovr >= 80
                                  ? 'bg-emerald-700 text-white'
                                  : p.ovr >= 70
                                  ? 'bg-amber-400 text-black'
                                  : 'bg-zinc-200 text-black'
                              }`}
                            >
                              {p.ovr}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-center text-[11px] font-mono text-neutral-700">
                            {p.hand} • {p.wgt} lbs
                          </td>
                          <td className="py-1.5 px-2.5">
                            <span
                              className={`inline-block text-[10px] font-black uppercase px-2 py-0.5 border ${
                                p.originType === 'drafted'
                                  ? 'bg-emerald-100 text-emerald-900 border-emerald-700'
                                  : p.originType === 'traded'
                                  ? 'bg-sky-100 text-sky-900 border-sky-700'
                                  : 'bg-neutral-100 text-neutral-700 border-neutral-400'
                              }`}
                            >
                              {p.originTag}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Quick Manual Add Player (For Unlogged Trade / Free Agent Pickup) */}
              <form
                onSubmit={handleManualAddPlayer}
                className="bg-[#f4f1ea] border border-black p-3 flex flex-wrap items-center gap-2"
              >
                <span className="text-[11px] font-black uppercase tracking-wider">
                  + Add Unlisted Trade / FA Acquisition:
                </span>
                <input
                  type="text"
                  value={manualAddName}
                  onChange={(e) => setManualAddName(e.target.value)}
                  placeholder="Player Name..."
                  className="bg-white border border-black px-2.5 py-1 text-xs font-bold outline-none flex-1 min-w-[160px]"
                />
                <select
                  value={manualAddPos}
                  onChange={(e) => setManualAddPos(e.target.value as 'F' | 'D' | 'G')}
                  className="bg-white border border-black px-2 py-1 text-xs font-black uppercase outline-none cursor-pointer"
                >
                  <option value="F">Forward (F)</option>
                  <option value="D">Defense (D)</option>
                  <option value="G">Goalie (G)</option>
                </select>
                <button
                  type="submit"
                  className="bg-black text-white px-3 py-1 text-xs font-black uppercase cursor-pointer hover:bg-neutral-800"
                >
                  Add to Roster
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
