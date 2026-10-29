"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Gamepad2,
  Play,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Trophy,
  Search,
  Tv,
  FileCode,
  Lock,
  Zap,
  ChevronRight,
  Users,
  FolderOpen,
  RefreshCw,
  MessageSquare,
  Radio,
  CloudUpload,
  Swords,
  X,
  Send
} from 'lucide-react';
import {
  OFFICIAL_LEAGUE_ROMS,
  HISTORICAL_NHL_ROMS,
  MISC_ROMS,
  SUPABASE_ROMS_URL
} from '@/app/roms/roms_data';
import { useCoachAuth } from '@/lib/coach-auth';
import { supabase } from '@/lib/supabase';
import {
  AVAILABLE_SEASONS,
  DEFAULT_TEAM_CODES,
  getSeasonConfig,
  ParsedGame
} from '@/lib/seasons';
import { parseSaveStateBuffer } from '@/lib/parsers/savestate';
import RetroBoxscore from '@/components/RetroBoxscore';

// ============================================================================
// UNIFIED ARENA ROM ITEM TYPE
// ============================================================================
export interface ArenaRomItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'league' | 'nhl-history' | 'misc';
  categoryBadge: string;
  year: number | string;
  leagueCode?: string;
  rulesSummary?: string;
  description: string;
  imageCandidates: string[];
  fileCandidates: string[];
  customDownloadUrl?: string;
  isActive?: boolean;
  defaultSeasonConfigId?: string;
}

// Live Presence Player in the Locker Room Lobby
export interface LobbyPresencePlayer {
  peerId: string;
  coachId?: number;
  coachName: string;
  isVerified: boolean;
  status: 'available' | 'away' | 'in_game';
  preferredRomId: string;
  preferredRomLabel: string;
  roomId?: string;
  role?: 'solo' | 'host' | 'guest';
  opponentName?: string;
  homeTeam?: string;
  awayTeam?: string;
  homeScore?: number;
  awayScore?: number;
  updatedAt: number;
}

// Incoming Match Invite
export interface MatchInvite {
  id: string;
  fromPeerId: string;
  fromCoachName: string;
  toPeerId: string;
  romId: string;
  romTitle: string;
  roomId: string;
  sentAt: number;
}

// Chat Message in Locker Room
export interface LobbyChatMessage {
  id: string;
  senderName: string;
  text: string;
  toPeerId?: string;
  timestamp: string;
}

function buildArenaCatalog(): ArenaRomItem[] {
  const items: ArenaRomItem[] = [];

  // 1. Official League ROMs
  const sortedLeague = [...OFFICIAL_LEAGUE_ROMS].sort((a, b) => {
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;
    if (a.leagueCode === b.leagueCode) return b.seasonNumber - a.seasonNumber;
    return a.league.localeCompare(b.league);
  });

  for (const rom of sortedLeague) {
    let defaultSeasonConfigId = '40';
    if (rom.id.toLowerCase() === 'w17') defaultSeasonConfigId = '38';
    else if (rom.id.toLowerCase() === 'o01' || rom.leagueCode === 'O') defaultSeasonConfigId = '39';

    items.push({
      id: rom.id,
      title: `${rom.id.toUpperCase()} — ${rom.seasonName}`,
      subtitle: `${rom.league} • ${rom.nhlYear} Base`,
      category: 'league',
      categoryBadge: rom.badge || rom.id.toUpperCase(),
      year: rom.nhlYear,
      leagueCode: rom.leagueCode,
      rulesSummary: rom.rulesSummary,
      description: rom.description,
      imageCandidates: [
        rom.imageUrl || `${rom.id.toUpperCase()}.png`,
        `${rom.id.toUpperCase()}.png`,
        `${rom.id.toLowerCase()}.png`
      ],
      fileCandidates: [
        `${rom.id.toUpperCase()}.zip`,
        `${rom.id.toLowerCase()}.zip`,
        `${rom.id.toUpperCase()}.bin`,
        `${rom.id.toLowerCase()}.bin`,
        `${rom.id.toUpperCase()}p.bin`,
        `${rom.id.toLowerCase()}p.bin`,
        rom.fileName
      ],
      customDownloadUrl: rom.downloadUrl,
      isActive: rom.isActive,
      defaultSeasonConfigId
    });
  }

  // 2. Historical NHL ROMs (1909 - Present)
  for (const rom of HISTORICAL_NHL_ROMS) {
    items.push({
      id: rom.id,
      title: rom.seasonLabel,
      subtitle: `${rom.eraLabel} • ${rom.year}`,
      category: 'nhl-history',
      categoryBadge: `${rom.year} NHL`,
      year: rom.year,
      rulesSummary: rom.champion ? `Champion: ${rom.champion}` : rom.eraLabel,
      description: rom.features,
      imageCandidates: [rom.imageUrl || `${rom.year}.png`, `${rom.year}.png`],
      fileCandidates: [`${rom.year}.zip`, `${rom.year}.bin`, rom.fileName],
      customDownloadUrl: rom.downloadUrl,
      defaultSeasonConfigId: '40'
    });
  }

  // 3. Misc & Crossover ROMs
  for (const rom of MISC_ROMS) {
    const cleanTitle = rom.title.replace(/[:\/\\?*|<">]/g, '').trim();
    items.push({
      id: rom.id,
      title: rom.title,
      subtitle: `${rom.category} • By ${rom.author}`,
      category: 'misc',
      categoryBadge: rom.category,
      year: rom.releaseYear,
      rulesSummary: `${rom.platform} • ${rom.tags.slice(0, 3).join(' • ')}`,
      description: rom.description,
      imageCandidates: [rom.imageUrl || rom.coverImage || ''],
      fileCandidates: [`${cleanTitle}.zip`, `${cleanTitle}.bin`, rom.fileName],
      customDownloadUrl: rom.downloadUrl,
      defaultSeasonConfigId: '40'
    });
  }

  return items;
}

const W_LEAGUE_COACH_MAP: Record<string, { coach_id: number; coach_name: string; city: string }> = {
  AUT: { coach_id: 2, coach_name: 'Autobahn', city: 'AUTOBAHN' },
  BAR: { coach_id: 65, coach_name: 'Dasri', city: 'BARRIE' },
  BAY: { coach_id: 49, coach_name: 'Jer_33', city: 'BAYTOWN' },
  BFC: { coach_id: 58, coach_name: 'Krav1', city: 'BETTY FORD' },
  DHG: { coach_id: 67, coach_name: 'vancecookcobxin', city: 'DEVIN HILL' },
  GRH: { coach_id: 25, coach_name: 'Moses Bogart', city: 'GRAND RIVER' },
  HAM: { coach_id: 37, coach_name: 'Derek Sutton', city: 'HAMILTON' },
  HIG: { coach_id: 9, coach_name: 'wolf_of_highland', city: 'HIGHLAND' },
  ING: { coach_id: 50, coach_name: 'Don Don', city: 'INGLEWOOD' },
  ITA: { coach_id: 14, coach_name: 'Marcus Vick EBC', city: 'ITALY' },
  KAR: { coach_id: 39, coach_name: 'MattyA', city: 'KAROLINA' },
  MHA: { coach_id: 54, coach_name: 'red', city: 'MARYHILL' },
  MHT: { coach_id: 13, coach_name: 'segathon', city: 'MINHATTRICK' },
  MGG: { coach_id: 12, coach_name: 'gaelicgopher', city: 'MINNESOTA' },
  NBK: { coach_id: 26, coach_name: 'Unholy Grail', city: 'NORTH BAY' },
  OCW: { coach_id: 51, coach_name: 'MNYoda84', city: 'ORANGE COUNTY' },
  PIT: { coach_id: 17, coach_name: 'Adolf Oliver Nipples', city: 'PITTSBURGH' },
  PRO: { coach_id: 30, coach_name: 'Lloyd10Xmas', city: 'PROVIDENCE' },
  RIC: { coach_id: 19, coach_name: 'bclinton_666', city: 'RICHFIELD' },
  ROC: { coach_id: 66, coach_name: 'The Villain CTJ', city: 'ROCKFORD' },
  SHS: { coach_id: 60, coach_name: 'marylandmike.', city: 'SOUTH HILLS' },
  SVF: { coach_id: 20, coach_name: 'Chalkitup7777', city: 'SUGAR VALLEY' },
  SUM: { coach_id: 21, coach_name: 'Pink Elephants', city: 'SUMTER' },
  TAI: { coach_id: 28, coach_name: 'NathanMB', city: 'TAIPEI' },
  TEG: { coach_id: 24, coach_name: 'Ticklepuss', city: 'TEGUCIGALPA' },
  TBP: { coach_id: 29, coach_name: 'shawnbell', city: 'THUNDER BAY' },
  VHV: { coach_id: 15, coach_name: 'UltraMagnus', city: 'VALHALLA' },
  WDY: { coach_id: 63, coach_name: 'NewJerseyKiller', city: 'WOODLYNNE' },
  ETI: { coach_id: 18, coach_name: 'LHX', city: 'EASTER ISLAND' }
};

function ensureRetroArchHeader(raw: Uint8Array): Uint8Array {
  const hasRaHeader =
    raw.length > 32 &&
    raw[0] === 0x52 &&
    raw[1] === 0x41 &&
    raw[2] === 0x53 &&
    raw[3] === 0x54 &&
    raw[4] === 0x41 &&
    raw[5] === 0x54 &&
    raw[6] === 0x45;

  if (hasRaHeader) return raw;

  const out = new Uint8Array(raw.length + 32);
  const magic = [0x52, 0x41, 0x53, 0x54, 0x41, 0x54, 0x45, 0x01];
  for (let i = 0; i < magic.length; i++) {
    out[i] = magic[i];
  }
  out.set(raw, 32);
  return out;
}

// Check if a catalog ROM item matches any filename currently in the Supabase `roms` bucket
function findMatchingBucketFile(rom: ArenaRomItem, bucketFiles: string[]): string | null {
  if (!bucketFiles || bucketFiles.length === 0) return null;
  const lowerMap = new Map<string, string>();
  for (const f of bucketFiles) {
    lowerMap.set(f.toLowerCase(), f);
  }
  for (const cand of rom.fileCandidates) {
    if (!cand) continue;
    const match = lowerMap.get(cand.toLowerCase());
    if (match) return match;
  }
  const prefix = rom.id.toLowerCase();
  for (const f of bucketFiles) {
    if (f.toLowerCase().startsWith(prefix) && /\.(zip|bin|md|gen|smd)$/i.test(f)) {
      return f;
    }
  }
  return null;
}

// ============================================================================
// INTERACTIVE CONTROLLER TESTER & KEYBOARD MAPPING COMPONENT
// ============================================================================
function ControllerTesterPanel({
  activeKeys,
  gamepadInfo,
  gamepadButtons,
  gamepadAxes
}: {
  activeKeys: Set<string>;
  gamepadInfo: string | null;
  gamepadButtons: boolean[];
  gamepadAxes: number[];
}) {
  const isUp = activeKeys.has('ArrowUp') || gamepadButtons[12] || (gamepadAxes[1] !== undefined && gamepadAxes[1] < -0.4);
  const isDown = activeKeys.has('ArrowDown') || gamepadButtons[13] || (gamepadAxes[1] !== undefined && gamepadAxes[1] > 0.4);
  const isLeft = activeKeys.has('ArrowLeft') || gamepadButtons[14] || (gamepadAxes[0] !== undefined && gamepadAxes[0] < -0.4);
  const isRight = activeKeys.has('ArrowRight') || gamepadButtons[15] || (gamepadAxes[0] !== undefined && gamepadAxes[0] > 0.4);

  const isA = activeKeys.has('z') || activeKeys.has('Z') || gamepadButtons[2];
  const isB = activeKeys.has('x') || activeKeys.has('X') || gamepadButtons[0];
  const isC = activeKeys.has('c') || activeKeys.has('C') || gamepadButtons[1];
  const isX = activeKeys.has('a') || activeKeys.has('A') || gamepadButtons[4];
  const isY = activeKeys.has('s') || activeKeys.has('S') || gamepadButtons[3];
  const isZ = activeKeys.has('d') || activeKeys.has('D') || gamepadButtons[5];
  const isStart = activeKeys.has('Enter') || gamepadButtons[9];
  const isMode = activeKeys.has('Shift') || gamepadButtons[8];

  return (
    <div className="bg-neutral-950 text-white border-2 border-black p-4 sm:p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-neutral-800 pb-4 mb-5">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-mono text-xs uppercase font-black">
            <Gamepad2 className="w-4 h-4" /> Sega Genesis 6-Button Diagnostic &amp; Controller Setup
          </div>
          <p className="text-xs text-slate-400 font-sans mt-1">
            Press buttons on your USB/Bluetooth controller or keyboard below to verify responsiveness before dropping the puck.
          </p>
        </div>
        <div className={`px-3 py-1.5 rounded border font-mono text-xs font-bold flex items-center gap-2 ${
          gamepadInfo
            ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300'
            : 'bg-amber-950/80 border-amber-500/60 text-amber-300'
        }`}>
          <span className={`w-2 h-2 rounded-full ${gamepadInfo ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span>{gamepadInfo ? `Gamepad Ready: ${gamepadInfo}` : 'Keyboard Mode (Press any controller button to wake USB pad)'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-7 flex flex-col items-center justify-center bg-[#0d1017] border border-neutral-800 rounded-lg p-6 relative">
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-3">
            SEGA MEGA DRIVE / GENESIS 16-BIT PAD
          </div>

          <div className="w-full max-w-[440px] bg-gradient-to-b from-neutral-800 to-neutral-900 border-2 border-neutral-600 rounded-[48px] p-6 sm:p-8 shadow-2xl flex items-center justify-between gap-4 relative">
            {/* D-PAD */}
            <div className="relative w-28 h-28 bg-neutral-950 rounded-full border border-neutral-700 flex items-center justify-center shrink-0">
              <div className={`absolute top-2 w-8 h-8 rounded-t flex items-center justify-center text-[10px] font-mono font-black border transition-all ${
                isUp ? 'bg-amber-400 text-black border-white scale-105 shadow-[0_0_12px_#f59e0b]' : 'bg-neutral-800 text-neutral-400 border-neutral-700'
              }`}>▲</div>
              <div className={`absolute bottom-2 w-8 h-8 rounded-b flex items-center justify-center text-[10px] font-mono font-black border transition-all ${
                isDown ? 'bg-amber-400 text-black border-white scale-105 shadow-[0_0_12px_#f59e0b]' : 'bg-neutral-800 text-neutral-400 border-neutral-700'
              }`}>▼</div>
              <div className={`absolute left-2 w-8 h-8 rounded-l flex items-center justify-center text-[10px] font-mono font-black border transition-all ${
                isLeft ? 'bg-amber-400 text-black border-white scale-105 shadow-[0_0_12px_#f59e0b]' : 'bg-neutral-800 text-neutral-400 border-neutral-700'
              }`}>◀</div>
              <div className={`absolute right-2 w-8 h-8 rounded-r flex items-center justify-center text-[10px] font-mono font-black border transition-all ${
                isRight ? 'bg-amber-400 text-black border-white scale-105 shadow-[0_0_12px_#f59e0b]' : 'bg-neutral-800 text-neutral-400 border-neutral-700'
              }`}>▶</div>
              <div className="w-6 h-6 rounded-full bg-neutral-900 border border-neutral-800" />
            </div>

            {/* Center Start / Mode */}
            <div className="flex flex-col items-center gap-2">
              <div className="text-[9px] font-mono font-black tracking-widest text-red-500">16-BIT</div>
              <div className={`px-3 py-1 rounded-full text-[9px] font-mono font-black uppercase border transition-all ${
                isMode ? 'bg-cyan-400 text-black border-white shadow-[0_0_10px_#22d3ee]' : 'bg-neutral-950 text-neutral-400 border-neutral-700'
              }`}>
                MODE
              </div>
              <div className={`px-3.5 py-1.5 rounded-full text-[10px] font-mono font-black uppercase border transition-all ${
                isStart ? 'bg-red-500 text-white border-white shadow-[0_0_12px_#ef4444]' : 'bg-red-950/70 text-red-300 border-red-800'
              }`}>
                START
              </div>
            </div>

            {/* 6 Action Buttons */}
            <div className="flex flex-col gap-2.5 shrink-0">
              <div className="flex items-center gap-2 justify-end">
                {[
                  { label: 'X', active: isX },
                  { label: 'Y', active: isY },
                  { label: 'Z', active: isZ }
                ].map(btn => (
                  <div
                    key={btn.label}
                    className={`w-8 h-8 rounded-full font-mono text-xs font-black flex items-center justify-center border transition-all ${
                      btn.active
                        ? 'bg-cyan-400 text-black border-white scale-110 shadow-[0_0_12px_#22d3ee]'
                        : 'bg-neutral-900 text-neutral-400 border-neutral-700'
                    }`}
                  >
                    {btn.label}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 justify-end">
                {[
                  { label: 'A', active: isA },
                  { label: 'B', active: isB },
                  { label: 'C', active: isC }
                ].map(btn => (
                  <div
                    key={btn.label}
                    className={`w-10 h-10 rounded-full font-mono text-sm font-black flex items-center justify-center border-2 transition-all ${
                      btn.active
                        ? 'bg-amber-400 text-black border-white scale-110 shadow-[0_0_15px_#f59e0b]'
                        : 'bg-neutral-950 text-white border-neutral-600'
                    }`}
                  >
                    {btn.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 bg-neutral-900 border border-neutral-800 rounded-lg p-4">
          <div className="text-xs font-mono font-black uppercase text-amber-400 mb-3 border-b border-neutral-800 pb-2">
            NHL &apos;95 Action &amp; Button Mapping
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="grid grid-cols-12 text-[10px] text-slate-400 uppercase pb-1 border-b border-neutral-800">
              <div className="col-span-3">Genesis</div>
              <div className="col-span-3">Keyboard</div>
              <div className="col-span-6">On-Ice Function</div>
            </div>
            <div className="grid grid-cols-12 items-center py-1 border-b border-neutral-800/60">
              <div className="col-span-3 font-black text-amber-400">B Button</div>
              <div className="col-span-3"><kbd className="bg-black px-1.5 py-0.5 rounded border border-neutral-700">X</kbd></div>
              <div className="col-span-6 text-slate-200 font-sans">Pass / Switch Player / Poke</div>
            </div>
            <div className="grid grid-cols-12 items-center py-1 border-b border-neutral-800/60">
              <div className="col-span-3 font-black text-amber-400">C Button</div>
              <div className="col-span-3"><kbd className="bg-black px-1.5 py-0.5 rounded border border-neutral-700">C</kbd></div>
              <div className="col-span-6 text-slate-200 font-sans">Shoot / One-Timer / Check / Speed Burst</div>
            </div>
            <div className="grid grid-cols-12 items-center py-1 border-b border-neutral-800/60">
              <div className="col-span-3 font-black text-amber-400">A Button</div>
              <div className="col-span-3"><kbd className="bg-black px-1.5 py-0.5 rounded border border-neutral-700">Z</kbd></div>
              <div className="col-span-6 text-slate-200 font-sans">Flip Puck / Dump / Line Change / Manual Goalie</div>
            </div>
            <div className="grid grid-cols-12 items-center py-1 border-b border-neutral-800/60">
              <div className="col-span-3 font-black text-red-400">START</div>
              <div className="col-span-3"><kbd className="bg-black px-1.5 py-0.5 rounded border border-neutral-700">Enter</kbd></div>
              <div className="col-span-6 text-slate-200 font-sans">Start Game / Pause / Instant Replay</div>
            </div>
            <div className="grid grid-cols-12 items-center py-1">
              <div className="col-span-3 font-black text-cyan-400">D-PAD</div>
              <div className="col-span-3"><kbd className="bg-black px-1.5 py-0.5 rounded border border-neutral-700">Arrows</kbd></div>
              <div className="col-span-6 text-slate-200 font-sans">Skate / Aim Shot / Deek</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN ARENA CONTENT COMPONENT
// ============================================================================
function ArenaContent() {
  const searchParams = useSearchParams();
  // Default to w16 (which is in the cloud "roms" bucket as W16.zip!) unless ?rom= is passed
  const initialRomParam = searchParams.get('rom') || 'w16';

  const { isLoggedIn, currentCoach, openLoginModal } = useCoachAuth();
  const catalog = useMemo(() => buildArenaCatalog(), []);

  // Unique Peer Session ID for Supabase Realtime Lobby & P2P Matchmaking
  const [myPeerId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('nhl95_arena_peer_id');
      if (saved) return saved;
      const generated = 'peer_' + Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem('nhl95_arena_peer_id', generated);
      return generated;
    }
    return 'peer_server';
  });

  // Cloud "roms" bucket file list fetched from /api/arena-roms
  const [bucketFiles, setBucketFiles] = useState<string[]>([
    'W16.zip', 'W15.zip', 'W14.zip', 'W13.zip', 'W12.zip', 'W11.zip',
    'W10.zip', 'W09.zip', 'W08.zip', 'W07.zip', 'W06.zip', 'W05.zip',
    'W04.zip', 'W03.zip', 'W02.zip', 'W01.zip', '1909.zip'
  ]);
  const [isUploadingToBucket, setIsUploadingToBucket] = useState(false);

  const refreshBucketFiles = useCallback(async () => {
    try {
      const res = await fetch('/api/arena-roms');
      const data = await res.json();
      if (data && Array.isArray(data.files) && data.files.length > 0) {
        setBucketFiles(data.files);
      }
    } catch {
      // keep fallback list
    }
  }, []);

  useEffect(() => {
    refreshBucketFiles();
  }, [refreshBucketFiles]);

  // Selected ROM state
  const [selectedRomId, setSelectedRomId] = useState<string>(() => {
    const found = catalog.find(r => r.id.toLowerCase() === initialRomParam.toLowerCase());
    return found ? found.id : 'w16';
  });

  useEffect(() => {
    const param = searchParams.get('rom');
    if (param) {
      const found = catalog.find(r => r.id.toLowerCase() === param.toLowerCase());
      if (found) setSelectedRomId(found.id);
    }
  }, [searchParams, catalog]);

  const selectedRom = useMemo(
    () => catalog.find(r => r.id === selectedRomId) || catalog[0],
    [catalog, selectedRomId]
  );

  // Arena Sub-navigation Tab ('ice' | 'lobby' | 'vault' | 'controller' | 'boxscore')
  const [activeArenaTab, setActiveArenaTab] = useState<'ice' | 'lobby' | 'vault' | 'controller' | 'boxscore'>('ice');

  // Emulator loading & runtime state
  const [emulatorRunning, setEmulatorRunning] = useState<boolean>(false);
  const [resolvedRomUrl, setResolvedRomUrl] = useState<string | null>(null);
  const [resolvedRomFileName, setResolvedRomFileName] = useState<string>('');
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [localRomObjectUrl, setLocalRomObjectUrl] = useState<string | null>(null);
  const [localRomTitle, setLocalRomTitle] = useState<string | null>(null);
  const [localRomRawFile, setLocalRomRawFile] = useState<File | null>(null);

  // Online Head-to-Head Netplay State
  const [netplayRole, setNetplayRole] = useState<'solo' | 'host' | 'guest'>('solo');
  const [netplayRoomId, setNetplayRoomId] = useState<string>('');
  const [netplayOpponentName, setNetplayOpponentName] = useState<string>('');
  const [myLobbyStatus, setMyLobbyStatus] = useState<'available' | 'away'>('available');
  const [onlinePlayers, setOnlinePlayers] = useState<LobbyPresencePlayer[]>([]);
  const [incomingInvite, setIncomingInvite] = useState<MatchInvite | null>(null);
  const [sentInviteNotice, setSentInviteNotice] = useState<string | null>(null);
  const [liveTelemetry, setLiveTelemetry] = useState<{
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
  } | null>(null);

  // Locker Room Chat State
  const [chatMessages, setChatMessages] = useState<LobbyChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);

  const lobbyChannelRef = useRef<any>(null);
  const roomChannelRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const localRomInputRef = useRef<HTMLInputElement | null>(null);
  const loadStateInputRef = useRef<HTMLInputElement | null>(null);

  // Vault Browser filters
  const [vaultCategory, setVaultCategory] = useState<'all' | 'cloud' | 'league' | 'nhl-history' | 'misc'>('all');
  const [vaultSearch, setVaultSearch] = useState<string>('');

  // Controller & Keyboard Live State
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [gamepadInfo, setGamepadInfo] = useState<string | null>(null);
  const [gamepadButtons, setGamepadButtons] = useState<boolean[]>([]);
  const [gamepadAxes, setGamepadAxes] = useState<number[]>([]);

  // Boxscore & Save State Parser Lab State
  const [selectedSeasonConfigId, setSelectedSeasonConfigId] = useState<string>('40');
  const [capturedStateBytes, setCapturedStateBytes] = useState<Uint8Array | null>(null);
  const [capturedFileName, setCapturedFileName] = useState<string>('');
  const [parsedGame, setParsedGame] = useState<ParsedGame | null>(null);
  const [parseStatusMessage, setParseStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [dbTeams, setDbTeams] = useState<any[]>([]);

  const myDisplayName = useMemo(() => {
    if (isLoggedIn && currentCoach?.coach_name) return currentCoach.coach_name;
    return `Skater_${myPeerId.slice(-4).toUpperCase()}`;
  }, [isLoggedIn, currentCoach, myPeerId]);

  useEffect(() => {
    if (selectedRom?.defaultSeasonConfigId) {
      setSelectedSeasonConfigId(selectedRom.defaultSeasonConfigId);
    }
  }, [selectedRom]);

  useEffect(() => {
    async function loadTeams() {
      const { data } = await supabase
        .from('league_teams')
        .select('*, league_coaches(coach_name)');
      if (data) setDbTeams(data);
    }
    loadTeams();
  }, []);

  // Resolve the selected ROM against the Supabase `roms` bucket (with automatic fallback to W16.zip if not uploaded yet)
  useEffect(() => {
    if (!selectedRom) return;
    setEmulatorRunning(false);
    setFallbackNotice(null);

    if (selectedRom.customDownloadUrl) {
      setResolvedRomUrl(selectedRom.customDownloadUrl);
      setResolvedRomFileName(selectedRom.fileCandidates[0] || `${selectedRom.id}.bin`);
      return;
    }

    const matchedFile = findMatchingBucketFile(selectedRom, bucketFiles);
    if (matchedFile) {
      setResolvedRomUrl(`${SUPABASE_ROMS_URL}/${encodeURIComponent(matchedFile)}`);
      setResolvedRomFileName(matchedFile);
      setFallbackNotice(null);
    } else {
      // Automatically boot W16.zip from the "roms" bucket so the game ALWAYS loads & plays immediately!
      const fallbackFile = bucketFiles.find(f => f.toUpperCase() === 'W16.ZIP') || bucketFiles[0] || 'W16.zip';
      setResolvedRomUrl(`${SUPABASE_ROMS_URL}/${encodeURIComponent(fallbackFile)}`);
      setResolvedRomFileName(fallbackFile);
      setFallbackNotice(
        `Note: "${selectedRom.id.toUpperCase()}" isn't uploaded to the cloud "roms" bucket yet, so we automatically booted ${fallbackFile} from the "roms" bucket! You can also click "Load Local ROM" to play or upload ${selectedRom.id.toUpperCase()} from your computer.`
      );
    }
  }, [selectedRom, bucketFiles]);

  // ==========================================================================
  // SUPABASE REALTIME LOCKER ROOM PRESENCE & MATCHMAKING CHANNEL
  // ==========================================================================
  const myPresencePayload = useMemo<LobbyPresencePlayer>(() => {
    return {
      peerId: myPeerId,
      coachId: currentCoach?.coach_id,
      coachName: myDisplayName,
      isVerified: Boolean(isLoggedIn && currentCoach),
      status: emulatorRunning || netplayRole !== 'solo' ? 'in_game' : myLobbyStatus,
      preferredRomId: selectedRom.id,
      preferredRomLabel: selectedRom.id.toUpperCase(),
      roomId: netplayRoomId || undefined,
      role: netplayRole,
      opponentName: netplayOpponentName || (emulatorRunning ? 'CPU' : undefined),
      homeTeam: liveTelemetry?.homeTeam,
      awayTeam: liveTelemetry?.awayTeam,
      homeScore: liveTelemetry?.homeScore,
      awayScore: liveTelemetry?.awayScore,
      updatedAt: Date.now()
    };
  }, [
    myPeerId,
    currentCoach,
    myDisplayName,
    isLoggedIn,
    emulatorRunning,
    netplayRole,
    myLobbyStatus,
    selectedRom.id,
    netplayRoomId,
    netplayOpponentName,
    liveTelemetry
  ]);

  useEffect(() => {
    const channel = supabase.channel('nhl95-arena-lobby', {
      config: {
        presence: { key: myPeerId },
        broadcast: { self: false, ack: false }
      }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const players: LobbyPresencePlayer[] = [];
        Object.values(state).forEach((entries: any) => {
          if (Array.isArray(entries) && entries.length > 0) {
            players.push(entries[0] as LobbyPresencePlayer);
          }
        });
        players.sort((a, b) => {
          if (a.peerId === myPeerId) return -1;
          if (b.peerId === myPeerId) return 1;
          if (a.status === 'available' && b.status !== 'available') return -1;
          if (a.status !== 'available' && b.status === 'available') return 1;
          return a.coachName.localeCompare(b.coachName);
        });
        setOnlinePlayers(players);
      })
      .on('broadcast', { event: 'match-invite' }, ({ payload }) => {
        if (!payload) return;
        const invite = payload as MatchInvite;
        if (invite.toPeerId === myPeerId) {
          setIncomingInvite(invite);
        }
      })
      .on('broadcast', { event: 'match-accepted' }, ({ payload }) => {
        if (!payload) return;
        if (payload.hostPeerId === myPeerId && payload.roomId) {
          setSentInviteNotice(null);
          setNetplayOpponentName(payload.guestCoachName || 'Player 2');
          setNetplayRoomId(payload.roomId);
          setNetplayRole('host');
          setActiveArenaTab('ice');
        }
      })
      .on('broadcast', { event: 'lobby-chat' }, ({ payload }) => {
        if (!payload) return;
        setChatMessages(prev => [...prev.slice(-49), payload as LobbyChatMessage]);
      })
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          await channel.track(myPresencePayload);
        }
      });

    lobbyChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      lobbyChannelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myPeerId]);

  // Keep presence updated when status, ROM, or live telemetry changes
  useEffect(() => {
    if (lobbyChannelRef.current) {
      lobbyChannelRef.current.track(myPresencePayload).catch(() => {});
    }
  }, [myPresencePayload]);

  // ==========================================================================
  // SUPABASE REALTIME NETPLAY ROOM SIGNALING CHANNEL (HOST <-> GUEST)
  // ==========================================================================
  useEffect(() => {
    if (!netplayRoomId || netplayRole === 'solo') {
      if (roomChannelRef.current) {
        supabase.removeChannel(roomChannelRef.current);
        roomChannelRef.current = null;
      }
      return;
    }

    const roomChan = supabase.channel(`arena-room-${netplayRoomId}`, {
      config: { broadcast: { self: false, ack: false } }
    });

    roomChan
      .on('broadcast', { event: 'netplay-signal' }, ({ payload }) => {
        if (!payload) return;
        const iframeWin = iframeRef.current?.contentWindow;
        if (iframeWin) {
          iframeWin.postMessage({
            type: 'NHL95_NETPLAY_SIGNAL_IN',
            signal: payload
          }, '*');
        }
      })
      .subscribe();

    roomChannelRef.current = roomChan;

    return () => {
      supabase.removeChannel(roomChan);
      roomChannelRef.current = null;
    };
  }, [netplayRoomId, netplayRole]);

  // Challenge an online opponent in the Locker Room
  const handleChallengePlayer = (target: LobbyPresencePlayer) => {
    const newRoomId = `room_${myPeerId.slice(-4)}_${Date.now().toString(36)}`;
    const invite: MatchInvite = {
      id: newRoomId,
      fromPeerId: myPeerId,
      fromCoachName: myDisplayName,
      toPeerId: target.peerId,
      romId: selectedRom.id,
      romTitle: selectedRom.title,
      roomId: newRoomId,
      sentAt: Date.now()
    };

    lobbyChannelRef.current?.send({
      type: 'broadcast',
      event: 'match-invite',
      payload: invite
    });

    setNetplayRoomId(newRoomId);
    setNetplayRole('host');
    setNetplayOpponentName(target.coachName);
    setSentInviteNotice(`Challenge sent to ${target.coachName}! Hosting Match Room (${selectedRom.id.toUpperCase()})...`);
    setActiveArenaTab('ice');
  };

  // Host an Open Match Room that any coach in the Locker Room can join with 1 click
  const handleHostOpenRoom = () => {
    const newRoomId = `open_${myPeerId.slice(-4)}_${Date.now().toString(36)}`;
    setNetplayRoomId(newRoomId);
    setNetplayRole('host');
    setNetplayOpponentName('Waiting for Opponent...');
    setSentInviteNotice('Open Match Room Created! Any player in the Locker Room can click "Join Game" to drop in as Player 2.');
    setActiveArenaTab('ice');
  };

  // Accept an incoming challenge or join an Open Match Room as Player 2 (Guest)
  const handleJoinMatchRoom = (hostPeerId: string, hostName: string, roomId: string, romId: string) => {
    const foundRom = catalog.find(r => r.id.toLowerCase() === romId.toLowerCase());
    if (foundRom) setSelectedRomId(foundRom.id);

    lobbyChannelRef.current?.send({
      type: 'broadcast',
      event: 'match-accepted',
      payload: {
        hostPeerId,
        guestPeerId: myPeerId,
        guestCoachName: myDisplayName,
        roomId
      }
    });

    setIncomingInvite(null);
    setNetplayOpponentName(hostName);
    setNetplayRoomId(roomId);
    setNetplayRole('guest');
    setActiveArenaTab('ice');
  };

  const handleLeaveNetplayRoom = () => {
    setNetplayRole('solo');
    setNetplayRoomId('');
    setNetplayOpponentName('');
    setSentInviteNotice(null);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msg: LobbyChatMessage = {
      id: Math.random().toString(36).slice(2),
      senderName: myDisplayName,
      text: chatInput.trim().slice(0, 280),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev.slice(-49), msg]);
    lobbyChannelRef.current?.send({
      type: 'broadcast',
      event: 'lobby-chat',
      payload: msg
    });
    setChatInput('');
  };

  // Listen for postMessage events from `/emulator.html`
  const parseAndDisplayStateBuffer = useCallback(
    (rawBytes: Uint8Array, sourceLabel: string) => {
      try {
        const normalizedBytes = ensureRetroArchHeader(rawBytes);
        setCapturedStateBytes(normalizedBytes);
        setCapturedFileName(sourceLabel);

        const seasonCfg = getSeasonConfig(selectedSeasonConfigId);
        const game = parseSaveStateBuffer(normalizedBytes, seasonCfg);
        setParsedGame(game);
        setParseStatusMessage({
          type: 'success',
          text: `Parsed ${game.awayTeam.teamCode} (${game.awayTeam.goals}) @ ${game.homeTeam.teamCode} (${game.homeTeam.goals}) from ${sourceLabel}!`
        });
      } catch (err: any) {
        setParseStatusMessage({
          type: 'error',
          text: err?.message || 'Could not parse save state bytes. Make sure you are inside an active or completed NHL 95 game.'
        });
      }
    },
    [selectedSeasonConfigId]
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'NHL95_EJS_STARTED') {
        setEmulatorRunning(true);
      } else if (event.data.type === 'NHL95_EJS_SAVESTATE' && event.data.state) {
        const stateArr =
          event.data.state instanceof Uint8Array
            ? event.data.state
            : new Uint8Array(event.data.state);
        parseAndDisplayStateBuffer(
          stateArr,
          `${selectedRom.id.toUpperCase()}_live_${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.state`
        );
      } else if (event.data.type === 'NHL95_NETPLAY_SIGNAL' && event.data.signal) {
        roomChannelRef.current?.send({
          type: 'broadcast',
          event: 'netplay-signal',
          payload: event.data.signal
        });
      } else if (event.data.type === 'NHL95_LIVE_TELEMETRY') {
        const hCode = DEFAULT_TEAM_CODES[event.data.homeTeamByte] || 'HOME';
        const aCode = DEFAULT_TEAM_CODES[event.data.awayTeamByte] || 'AWAY';
        setLiveTelemetry({
          homeTeam: hCode,
          awayTeam: aCode,
          homeScore: Number(event.data.homeGoals) || 0,
          awayScore: Number(event.data.awayGoals) || 0
        });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [parseAndDisplayStateBuffer, selectedRom]);

  // Poll Gamepad & Keyboard for Controller Tester and Header Status Pill
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setActiveKeys(prev => {
        const next = new Set(prev);
        next.add(e.key);
        return next;
      });
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      setActiveKeys(prev => {
        const next = new Set(prev);
        next.delete(e.key);
        return next;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let animId: number;
    const pollGamepads = () => {
      if (typeof navigator !== 'undefined' && navigator.getGamepads) {
        const pads = navigator.getGamepads();
        const activePad = Array.from(pads).find(Boolean);
        if (activePad) {
          setGamepadInfo(activePad.id);
          setGamepadButtons(activePad.buttons.map(b => b.pressed));
          setGamepadAxes([...activePad.axes]);
        } else {
          setGamepadInfo(null);
          setGamepadButtons([]);
          setGamepadAxes([]);
        }
      }
      animId = requestAnimationFrame(pollGamepads);
    };
    animId = requestAnimationFrame(pollGamepads);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animId);
    };
  }, []);

  // Re-parse if user switches Season Config dropdown
  useEffect(() => {
    if (capturedStateBytes && capturedFileName) {
      try {
        const seasonCfg = getSeasonConfig(selectedSeasonConfigId);
        const game = parseSaveStateBuffer(capturedStateBytes, seasonCfg);
        setParsedGame(game);
      } catch {
        // ignore
      }
    }
  }, [selectedSeasonConfigId, capturedStateBytes, capturedFileName]);

  // 1-Click Capture Save State directly from EmulatorJS instance inside the iframe
  const handleCaptureLiveBoxscore = () => {
    try {
      const iframeWin = iframeRef.current?.contentWindow as any;
      const ejs = iframeWin?.EJS_emulator;
      if (!ejs || !ejs.gameManager) {
        setParseStatusMessage({
          type: 'error',
          text: 'Emulator is still booting or not active yet. Start a game on the ice first, then click Capture Boxscore!'
        });
        setActiveArenaTab('boxscore');
        return;
      }

      const rawState: Uint8Array = ejs.gameManager.getState();
      if (!rawState || rawState.length < 52000) {
        setParseStatusMessage({
          type: 'error',
          text: `Save state buffer appears incomplete (${rawState?.length || 0} bytes). Wait until the game has booted into a match.`
        });
        setActiveArenaTab('boxscore');
        return;
      }

      const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, '');
      const fileName = `${selectedRom.id.toUpperCase()}_arena_${stamp}.state`;
      parseAndDisplayStateBuffer(rawState, fileName);
      setActiveArenaTab('boxscore');
    } catch (err: any) {
      setParseStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to capture live state from the emulator.'
      });
      setActiveArenaTab('boxscore');
    }
  };

  const handleDownloadCapturedState = () => {
    if (!capturedStateBytes) return;
    const blob = new Blob([new Uint8Array(capturedStateBytes)], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = capturedFileName || `${selectedRom.id.toUpperCase()}.state`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLocalRomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (localRomObjectUrl) URL.revokeObjectURL(localRomObjectUrl);
    if (typeof window !== 'undefined') {
      (window as any).__NHL95_LOCAL_FILE = file;
    }
    const objUrl = URL.createObjectURL(file);
    setLocalRomRawFile(file);
    setLocalRomObjectUrl(objUrl);
    setLocalRomTitle(file.name);
    setResolvedRomFileName(file.name);
    setFallbackNotice(null);
    setEmulatorRunning(false);
    setActiveArenaTab('ice');
    e.target.value = '';
  };

  // Upload the currently loaded local ROM file directly into the Supabase `roms` bucket!
  const handleSaveLocalRomToCloudBucket = async () => {
    if (!localRomRawFile) return;
    setIsUploadingToBucket(true);
    try {
      const ext = localRomRawFile.name.endsWith('.zip') ? '.zip' : '.bin';
      const targetName = `${selectedRom.id.toUpperCase()}${ext}`;
      const formData = new FormData();
      formData.append('file', localRomRawFile);
      formData.append('targetName', targetName);

      const res = await fetch('/api/arena-roms', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        await refreshBucketFiles();
        alert(`Uploaded ${targetName} to the cloud "roms" bucket! Every coach can now play ${selectedRom.id.toUpperCase()} online.`);
      } else {
        alert(`Could not upload to roms bucket: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Upload failed: ${err?.message}`);
    } finally {
      setIsUploadingToBucket(false);
    }
  };

  const handleStateFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buf = new Uint8Array(await file.arrayBuffer());
    parseAndDisplayStateBuffer(buf, file.name);
    setActiveArenaTab('boxscore');
    e.target.value = '';
  };

  const filteredCatalog = useMemo(() => {
    return catalog.filter(item => {
      const inCloud = Boolean(findMatchingBucketFile(item, bucketFiles));
      const matchesCat =
        vaultCategory === 'all' ||
        (vaultCategory === 'cloud' && inCloud) ||
        item.category === vaultCategory;
      const q = vaultSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.id.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        String(item.year).includes(q);
      return matchesCat && matchesSearch;
    });
  }, [catalog, bucketFiles, vaultCategory, vaultSearch]);

  // Featured ROMs that are ready in the Cloud `roms` bucket right now
  const cloudReadyFeaturedRoms = useMemo(() => {
    const ready = catalog.filter(r => Boolean(findMatchingBucketFile(r, bucketFiles)));
    return ready.length >= 4 ? ready.slice(0, 4) : catalog.slice(0, 4);
  }, [catalog, bucketFiles]);

  // Games currently in progress (from online presence)
  const gamesInProgress = useMemo(() => {
    return onlinePlayers.filter(
      p => (p.status === 'in_game' || p.role === 'host') && p.role !== 'guest'
    );
  }, [onlinePlayers]);

  const availableOpponentsCount = useMemo(() => {
    return onlinePlayers.filter(p => p.status === 'available').length;
  }, [onlinePlayers]);

  const activeRomUrl = localRomObjectUrl || resolvedRomUrl;
  const activeRomTitle = localRomTitle || selectedRom.title;

  const emulatorIframeSrc = useMemo(() => {
    if (!activeRomUrl) return null;
    const fileLabel = localRomTitle || resolvedRomFileName || `${selectedRom.id.toUpperCase()}.zip`;
    return `/emulator.html?romUrl=${encodeURIComponent(activeRomUrl)}&title=${encodeURIComponent(fileLabel)}&role=${netplayRole}&roomId=${encodeURIComponent(netplayRoomId)}`;
  }, [activeRomUrl, localRomTitle, resolvedRomFileName, selectedRom.id, netplayRole, netplayRoomId]);

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-black font-sans pb-16">
      {/* Hidden File Inputs */}
      <input
        ref={localRomInputRef}
        type="file"
        accept=".bin,.md,.gen,.smd,.zip,.7z"
        onChange={handleLocalRomUpload}
        className="hidden"
      />
      <input
        ref={loadStateInputRef}
        type="file"
        accept=".state,.sav,.state1,.state2,.state3,.state4,.state5"
        onChange={handleStateFileUpload}
        className="hidden"
      />

      {/* INCOMING MATCH CHALLENGE MODAL */}
      {incomingInvite && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-neutral-950 border-4 border-amber-400 text-white max-w-md w-full p-6 shadow-2xl rounded-xs animate-bounce-once">
            <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-black uppercase mb-2">
              <Swords className="w-5 h-5" /> Incoming Head-to-Head Challenge!
            </div>
            <h3 className="text-xl font-black font-serif uppercase text-white mb-2">
              {incomingInvite.fromCoachName} Wants to Play!
            </h3>
            <p className="text-xs text-slate-300 font-mono mb-5">
              Cartridge: <strong className="text-amber-300">{incomingInvite.romTitle}</strong>
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  handleJoinMatchRoom(
                    incomingInvite.fromPeerId,
                    incomingInvite.fromCoachName,
                    incomingInvite.roomId,
                    incomingInvite.romId
                  )
                }
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-mono text-xs font-black uppercase rounded-xs cursor-pointer"
              >
                🏒 Accept &amp; Join Game
              </button>
              <button
                onClick={() => setIncomingInvite(null)}
                className="py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-slate-300 font-mono text-xs font-bold uppercase rounded-xs cursor-pointer"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 1. KING OF 94 STYLE ARENA HEADER BANNER                               */}
      {/* ===================================================================== */}
      <div className="bg-[#0d1b2a] border-2 border-black text-white shadow-[4px_4px_0px_rgba(0,0,0,1)] mb-5 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 bg-gradient-to-r from-[#09131f] via-[#112236] to-[#09131f]">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="bg-black border-2 border-cyan-400 px-3.5 py-2 rounded-xs shadow-[0_0_15px_rgba(34,211,238,0.25)] flex items-center gap-2.5">
              <Tv className="w-6 h-6 text-cyan-400" />
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-300 font-black leading-none">
                  KING OF 95
                </div>
                <div className="text-xl sm:text-2xl font-black tracking-tighter uppercase font-serif text-white leading-none mt-0.5">
                  ARENA
                </div>
              </div>
            </div>

            <div className="hidden sm:block h-10 w-[2px] bg-slate-700" />

            <div>
              <div className="text-base sm:text-xl font-black uppercase tracking-tight text-white font-serif">
                A Place to Drop the Puck{' '}
                <span className="text-amber-400">&amp; Hang Out With Buds</span>
              </div>
              <div className="text-xs text-slate-300 font-mono flex items-center gap-2 flex-wrap mt-0.5">
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded text-[10px] font-bold">
                  🟢 {onlinePlayers.length || 1} ONLINE IN LOCKER ROOM
                </span>
                <span>•</span>
                <span>{bucketFiles.length} Cloud ROMs Ready in &ldquo;roms&rdquo; Bucket</span>
                <span>•</span>
                <span>P2P Online Multiplayer</span>
              </div>
            </div>
          </div>

          {/* Right Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleHostOpenRoom}
              className="bg-blue-600 hover:bg-blue-500 text-white border border-blue-400 px-3 py-1.5 text-xs font-mono font-black uppercase rounded-xs flex items-center gap-1.5 cursor-pointer transition shadow-xs"
              title="Open a 2-Player Online Match Room so another coach can join your game"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Host 2P Online Game</span>
            </button>
            <button
              onClick={() => localRomInputRef.current?.click()}
              className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-xs flex items-center gap-1.5 cursor-pointer transition"
              title="Play a local .bin, .md, or .zip ROM file from your computer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Load Local ROM</span>
            </button>
            <button
              onClick={handleCaptureLiveBoxscore}
              className="bg-amber-500 hover:bg-amber-400 text-black border border-black px-3.5 py-1.5 text-xs font-mono font-black uppercase rounded-xs flex items-center gap-1.5 cursor-pointer transition shadow-xs"
            >
              <Zap className="w-3.5 h-3.5 fill-black" />
              <span>1-Click Boxscore</span>
            </button>
          </div>
        </div>

        {/* Sub-Navigation Bar */}
        <div className="bg-[#f8f5ee] text-black px-4 py-2 flex items-center justify-between flex-wrap gap-2 border-t border-black font-mono text-xs">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
            {[
              { id: 'ice', label: '🏒 Arena Ice', badge: netplayRole !== 'solo' ? '2P NETPLAY' : emulatorRunning ? 'LIVE' : undefined },
              { id: 'lobby', label: '🥊 Locker Room Lobby (VS)', badge: `${onlinePlayers.length || 1} ONLINE` },
              { id: 'vault', label: `📚 ROM Vault (${bucketFiles.length} Cloud)` },
              { id: 'controller', label: '🕹️ Controller Setup & Test', badge: gamepadInfo ? 'PAD READY' : undefined },
              { id: 'boxscore', label: '📊 1-Click Boxscore Lab', badge: parsedGame ? 'PARSED' : undefined }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveArenaTab(tab.id as any)}
                className={`px-3 py-1.5 font-bold uppercase text-xs transition cursor-pointer flex items-center gap-1.5 rounded-xs ${
                  activeArenaTab === tab.id
                    ? 'bg-black text-amber-400 border-b-2 border-amber-500 shadow-2xs'
                    : 'text-slate-700 hover:bg-black/5'
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.2 rounded font-black">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3 text-[11px] text-slate-600">
            <span>Bucket: <strong>roms ({bucketFiles.length} files)</strong></span>
            <span>•</span>
            <Link href="/roms" className="text-amber-800 hover:underline font-bold">
              Full ROM Repository &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. KING OF 94 STYLE "GAMES IN PROGRESS" & "PICK AN OPPONENT" LOBBY    */}
      {/* ===================================================================== */}
      <div className="mb-6 space-y-5">
        {/* GAMES IN PROGRESS PANEL (Just like King of 94 screenshot) */}
        <div className="bg-white border-2 border-black rounded-xs shadow-[3px_3px_0px_rgba(0,0,0,1)] overflow-hidden">
          <div className="px-4 py-3 bg-[#f8fafc] border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-slate-900 font-sans">
                Games in progress
              </h2>
              <span className="bg-blue-100 text-blue-800 font-mono text-xs font-black px-2 py-0.5 rounded-full">
                {gamesInProgress.length}
              </span>
              <span className="text-[11px] text-slate-500 hidden sm:inline ml-2">
                Live scores update about every 15–20 seconds.
              </span>
            </div>
            <button
              onClick={handleHostOpenRoom}
              className="text-xs font-mono font-bold text-blue-700 hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>+ Host Open 2P Game</span>
            </button>
          </div>

          <div className="divide-y divide-slate-200">
            {gamesInProgress.length === 0 ? (
              <div className="px-4 py-4 text-xs text-slate-500 font-sans flex items-center justify-between flex-wrap gap-2">
                <span>No live matches on the ice right now. Start a game below or host a 2-Player room!</span>
                <button
                  onClick={handleHostOpenRoom}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-mono text-[11px] font-bold uppercase rounded cursor-pointer"
                >
                  Open 2P Match Room
                </button>
              </div>
            ) : (
              gamesInProgress.map(g => {
                const isWaitingForP2 = g.role === 'host' && (!g.opponentName || g.opponentName.includes('Waiting'));
                return (
                  <div key={g.peerId} className="px-4 py-3 flex items-center justify-between flex-wrap gap-4 hover:bg-slate-50">
                    <div className="flex items-center gap-3 min-w-[180px]">
                      <span className="bg-neutral-900 text-amber-400 font-mono text-[10px] font-black uppercase px-2 py-1 rounded">
                        NHL &apos;95 • {g.preferredRomLabel}
                      </span>
                      <div>
                        <div className="font-bold text-sm text-slate-900 flex items-center gap-1">
                          <span>{g.coachName}</span>
                          {g.isVerified && <span className="text-blue-600 text-xs">✔</span>}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 uppercase">
                          {g.homeTeam || 'HOME'} • HOST
                        </div>
                      </div>
                    </div>

                    {/* Center Score / Status */}
                    <div className="text-center font-mono">
                      {g.homeScore !== undefined && g.awayScore !== undefined ? (
                        <div>
                          <div className="text-lg font-black text-slate-900">
                            {g.homeScore} &ndash; {g.awayScore}
                          </div>
                          <div className="text-[10px] text-emerald-700 font-bold uppercase">LIVE ON ICE</div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-sm font-black text-slate-400">&mdash; &ndash; &mdash;</div>
                          <div className="text-[10px] text-slate-500 uppercase">
                            {isWaitingForP2 ? 'OPEN LOBBY' : 'LINEUP / PREGAME'}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Opponent & Join Button */}
                    <div className="flex items-center gap-3 min-w-[200px] justify-end">
                      <div className="text-right">
                        <div className="font-bold text-sm text-slate-900">
                          {g.opponentName || 'CPU'}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 uppercase">
                          {g.awayTeam || 'AWAY'}
                        </div>
                      </div>

                      {g.roomId && g.peerId !== myPeerId ? (
                        <button
                          onClick={() => handleJoinMatchRoom(g.peerId, g.coachName, g.roomId!, g.preferredRomId)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-sans text-xs font-bold rounded cursor-pointer shadow-2xs"
                        >
                          Join Game
                        </button>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-400">
                          {g.peerId === myPeerId ? 'Your Match' : 'On Ice'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. MAIN TWO-COLUMN ARENA LAYOUT (JUMBOTRON LEFT + COACH CARD RIGHT)   */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT / CENTER COLUMN (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-5">
          {/* CLOUD-READY FEATURED ARENA BUILDS STRIP */}
          <div className="bg-white border-2 border-black p-3 shadow-[3px_3px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2.5 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
              <span>INSTANT PLAY — CLOUD &ldquo;ROMS&rdquo; BUCKET CARTRIDGES</span>
              <button
                onClick={() => setActiveArenaTab('vault')}
                className="text-amber-700 hover:underline cursor-pointer font-bold"
              >
                Browse All {catalog.length} ROMs ({bucketFiles.length} in Cloud) &rarr;
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {cloudReadyFeaturedRoms.map(rom => {
                const isSelected = rom.id === selectedRom.id && !localRomObjectUrl;
                return (
                  <button
                    key={rom.id}
                    onClick={() => {
                      if (typeof window !== 'undefined') (window as any).__NHL95_LOCAL_FILE = null;
                      setLocalRomObjectUrl(null);
                      setLocalRomTitle(null);
                      setSelectedRomId(rom.id);
                      setActiveArenaTab('ice');
                    }}
                    className={`p-2 text-left border transition cursor-pointer rounded-xs flex flex-col justify-between ${
                      isSelected
                        ? 'bg-neutral-950 text-white border-black ring-2 ring-amber-500'
                        : 'bg-[#faf8f5] hover:bg-amber-50/70 text-black border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 w-full mb-1">
                      <span className={`font-mono text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                        isSelected ? 'bg-amber-500 text-black' : 'bg-black text-white'
                      }`}>
                        {rom.id.toUpperCase()}
                      </span>
                      <span className="text-[8px] font-mono font-bold text-emerald-500 uppercase">● Ready</span>
                    </div>
                    <div className="font-serif text-xs font-black uppercase truncate w-full">
                      {rom.title.replace(`${rom.id.toUpperCase()} — `, '')}
                    </div>
                    <div className={`text-[9px] font-mono truncate mt-0.5 ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                      {rom.subtitle}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* NETPLAY BANNER IF IN 2-PLAYER ROOM */}
          {(netplayRole !== 'solo' || sentInviteNotice) && (
            <div className="bg-blue-950 border-2 border-blue-400 text-white p-3.5 rounded-xs flex items-center justify-between flex-wrap gap-3 shadow-md">
              <div className="flex items-center gap-2.5">
                <Radio className="w-5 h-5 text-cyan-400 animate-pulse shrink-0" />
                <div>
                  <div className="text-xs font-mono font-black uppercase text-cyan-300">
                    {netplayRole === 'host'
                      ? `Hosting 2-Player Online Match (${netplayOpponentName || 'Waiting for Player 2'})`
                      : `Connected as Player 2 vs ${netplayOpponentName}`}
                  </div>
                  <div className="text-[11px] text-slate-300">
                    {sentInviteNotice || 'Your controller inputs and 60fps video feed are synced live.'}
                  </div>
                </div>
              </div>
              <button
                onClick={handleLeaveNetplayRoom}
                className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white font-mono text-[10px] font-black uppercase rounded-xs cursor-pointer"
              >
                Leave 2P Room
              </button>
            </div>
          )}

          {/* FALLBACK NOTICE IF SELECTED ROM WAS NOT YET IN CLOUD BUCKET */}
          {fallbackNotice && !localRomObjectUrl && (
            <div className="bg-amber-50 border-2 border-amber-500 text-amber-950 p-3 text-xs flex items-center justify-between flex-wrap gap-2">
              <span>{fallbackNotice}</span>
              <button
                onClick={() => localRomInputRef.current?.click()}
                className="px-2.5 py-1 bg-black text-amber-400 font-mono text-[10px] font-bold uppercase rounded-xs cursor-pointer shrink-0"
              >
                Load Local .BIN/.ZIP
              </button>
            </div>
          )}

          {/* OPTION TO UPLOAD LOCAL ROM TO CLOUD BUCKET */}
          {localRomRawFile && (
            <div className="bg-emerald-950 border-2 border-emerald-500 text-white p-3 text-xs flex items-center justify-between flex-wrap gap-2">
              <div className="font-mono">
                Playing local file: <strong className="text-amber-300">{localRomRawFile.name}</strong>
              </div>
              <button
                onClick={handleSaveLocalRomToCloudBucket}
                disabled={isUploadingToBucket}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-mono text-[10px] font-black uppercase rounded-xs cursor-pointer flex items-center gap-1"
              >
                <CloudUpload className="w-3.5 h-3.5" />
                <span>{isUploadingToBucket ? 'Uploading to roms bucket...' : `Save to Cloud "roms" Bucket as ${selectedRom.id.toUpperCase()}`}</span>
              </button>
            </div>
          )}

          {/* PREGAME / LIVE SCOREBOARD JUMBOTRON */}
          <div className="bg-neutral-950 border-2 border-black text-white p-3 sm:p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase text-slate-400 mb-2 px-1">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${emulatorRunning ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                <strong className="text-white">95 TV ARENA FEED</strong> — {emulatorRunning ? 'MATCH IN PROGRESS' : 'READY WHEN YOUR GAME STARTS'}
              </span>
              <span className="text-amber-400 font-bold">BUCKET FILE: {resolvedRomFileName || 'W16.ZIP'}</span>
            </div>

            <div className="grid grid-cols-12 border-2 border-neutral-700 bg-black p-2.5 sm:p-3 items-center gap-2">
              <div className="col-span-4 sm:col-span-5 flex items-center gap-2.5 border-r border-neutral-800 pr-2">
                <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/40 flex items-center justify-center font-mono text-xs font-black text-amber-400 shrink-0">
                  {resolvedRomFileName ? resolvedRomFileName.replace(/\.(zip|bin)$/i, '').slice(0, 4).toUpperCase() : 'W16'}
                </div>
                <div className="truncate">
                  <div className="text-[9px] font-mono uppercase text-slate-400">ACTIVE CARTRIDGE</div>
                  <div className="text-xs sm:text-sm font-black uppercase font-mono text-white truncate">
                    {localRomTitle || resolvedRomFileName || activeRomTitle}
                  </div>
                </div>
              </div>

              <div className="col-span-4 sm:col-span-2 text-center">
                <div className="text-[8px] font-mono uppercase tracking-widest text-amber-400">
                  {netplayRole === 'solo' ? 'SOLO / CPU' : '2P ONLINE'}
                </div>
                <div className="text-xs sm:text-sm font-black font-mono uppercase text-emerald-400">
                  {liveTelemetry ? `${liveTelemetry.homeScore} - ${liveTelemetry.awayScore}` : emulatorRunning ? 'ON ICE' : 'PREGAME'}
                </div>
              </div>

              <div className="col-span-4 sm:col-span-5 flex items-center justify-end gap-2.5 border-l border-neutral-800 pl-2 text-right">
                <div className="truncate">
                  <div className="text-[9px] font-mono uppercase text-slate-400">
                    {netplayOpponentName ? `VS ${netplayOpponentName}` : 'COACH AT THE BENCH'}
                  </div>
                  <div className="text-xs sm:text-sm font-black uppercase font-mono text-cyan-300 truncate">
                    {myDisplayName}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* TAB 1: ARENA ICE (LIVE EMULATORJS CANVAS)                         */}
          {/* ================================================================= */}
          <div className={activeArenaTab === 'ice' ? 'block' : 'hidden'}>
            <div className="bg-black border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] relative overflow-hidden">
              <div className="aspect-[4/3] w-full bg-black relative">
                {emulatorIframeSrc && (
                  <iframe
                    ref={iframeRef}
                    key={emulatorIframeSrc}
                    src={emulatorIframeSrc}
                    title={`NHL 95 Emulator - ${activeRomTitle}`}
                    className="w-full h-full border-0"
                    allow="autoplay; fullscreen; gamepad"
                  />
                )}
              </div>

              <div className="bg-neutral-900 border-t-2 border-black px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-white">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-amber-500 text-black font-black px-2 py-0.5 text-[10px] uppercase rounded-xs">
                    SEGA GENESIS
                  </span>
                  <span className="text-slate-300 text-[11px] truncate max-w-[240px] sm:max-w-xs">
                    {resolvedRomFileName || activeRomTitle}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setActiveArenaTab('lobby')}
                    className="bg-blue-700 hover:bg-blue-600 text-white px-2.5 py-1 text-[11px] font-bold uppercase rounded-xs cursor-pointer flex items-center gap-1"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Pick an Opponent ({onlinePlayers.length || 1})</span>
                  </button>
                  <button
                    onClick={() => setActiveArenaTab('controller')}
                    className="bg-neutral-800 hover:bg-neutral-700 text-slate-200 border border-neutral-600 px-2.5 py-1 text-[11px] font-bold uppercase rounded-xs cursor-pointer flex items-center gap-1"
                  >
                    <Gamepad2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Test Controller</span>
                  </button>
                  <button
                    onClick={handleCaptureLiveBoxscore}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 text-[11px] font-black uppercase rounded-xs cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Capture Live Boxscore</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* TAB 2: PICK AN OPPONENT — LOCKER ROOM LOBBY (KING OF 94 STYLE)    */}
          {/* ================================================================= */}
          {activeArenaTab === 'lobby' && (
            <div className="bg-white border-2 border-black p-4 sm:p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              <div className="border-b border-slate-200 pb-4 mb-4">
                <h2 className="text-xl font-black text-slate-900 font-sans">
                  Pick an opponent
                </h2>
                <p className="text-xs font-bold text-slate-700 mt-1">
                  {onlinePlayers.length || 1} human player{onlinePlayers.length === 1 ? '' : 's'} online &bull;{' '}
                  {availableOpponentsCount} available human opponent{availableOpponentsCount === 1 ? '' : 's'} &bull;{' '}
                  CPU always available
                </p>

                {/* "I'm open to play" bar (matches King of 94 screenshot) */}
                <div className="mt-4 flex items-center gap-3 flex-wrap text-xs">
                  <span className="text-slate-600 font-medium">I&apos;m open to play:</span>
                  {['w16', 'w15', 'w01', 'nhl-1909-10'].map(romKey => {
                    const active = selectedRomId === romKey;
                    return (
                      <button
                        key={romKey}
                        onClick={() => setSelectedRomId(romKey)}
                        className={`px-2.5 py-1 rounded border font-mono text-[11px] font-black uppercase cursor-pointer transition ${
                          active
                            ? 'bg-neutral-900 text-amber-400 border-black'
                            : 'bg-slate-100 text-slate-700 border-slate-300 hover:border-black'
                        }`}
                      >
                        {romKey === 'nhl-1909-10' ? '1909 NHA' : romKey.toUpperCase()} +
                      </button>
                    );
                  })}

                  <select
                    value={myLobbyStatus}
                    onChange={e => setMyLobbyStatus(e.target.value as 'available' | 'away')}
                    className="ml-auto px-3 py-1.5 rounded-full border border-slate-300 bg-white text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="available">🟢 Online (Available to play)</option>
                    <option value="away">⚪ Away</option>
                  </select>
                </div>

                <p className="text-[11px] text-slate-500 mt-2">
                  Choose <strong>Play</strong> to challenge a live coach head-to-head, or click <strong>Play CPU</strong> below to play solo.
                </p>
              </div>

              {/* Online Human Players Rows */}
              <div className="divide-y divide-slate-200 border-t border-b border-slate-200">
                {onlinePlayers.map(player => {
                  const isMe = player.peerId === myPeerId;
                  const isAvailable = player.status === 'available';
                  return (
                    <div
                      key={player.peerId}
                      className="py-3.5 px-2 flex items-center justify-between flex-wrap gap-3 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            player.status === 'available'
                              ? 'bg-emerald-500'
                              : player.status === 'in_game'
                              ? 'bg-amber-500 animate-pulse'
                              : 'bg-slate-400'
                          }`}
                        />
                        <div className="w-9 h-9 rounded bg-neutral-900 text-amber-400 font-serif font-black text-xs flex items-center justify-center border border-black shrink-0">
                          {player.coachName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-slate-900">
                              {player.coachName}
                            </span>
                            {player.isVerified && (
                              <span className="bg-blue-600 text-white text-[9px] px-1 py-0.2 rounded font-bold" title="Verified League Coach">
                                ✔
                              </span>
                            )}
                            {isMe && (
                              <span className="text-[10px] font-mono bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-bold">
                                YOU
                              </span>
                            )}
                            <span className="text-xs text-slate-500 ml-1">
                              {player.status === 'available'
                                ? 'Available to play'
                                : player.status === 'in_game'
                                ? 'In Game'
                                : 'Away'}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">
                            Ready for: <strong>{player.preferredRomLabel}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 hidden sm:inline mr-2">
                          Jump in &rarr; <strong className="font-mono text-black">{player.preferredRomLabel}</strong>
                        </span>

                        {!isMe ? (
                          <>
                            {player.roomId ? (
                              <button
                                onClick={() =>
                                  handleJoinMatchRoom(player.peerId, player.coachName, player.roomId!, player.preferredRomId)
                                }
                                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-xs font-bold rounded cursor-pointer"
                              >
                                Join Game
                              </button>
                            ) : (
                              <button
                                onClick={() => handleChallengePlayer(player)}
                                disabled={!isAvailable}
                                className={`px-4 py-1.5 font-sans text-xs font-bold rounded cursor-pointer transition ${
                                  isAvailable
                                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                                    : 'bg-blue-200 text-white cursor-not-allowed'
                                }`}
                              >
                                Play
                              </button>
                            )}
                            <button
                              onClick={() => setIsChatOpen(true)}
                              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-sans text-xs font-bold rounded cursor-pointer"
                            >
                              Chat
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={handleHostOpenRoom}
                            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-mono text-xs font-bold rounded cursor-pointer"
                          >
                            Host 2P Room
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* CPU ROW (Always available — just like King of 94 screenshot) */}
                <div className="py-3.5 px-2 bg-blue-50/50 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <div className="w-9 h-9 rounded bg-blue-900 text-white font-mono font-black text-xs flex items-center justify-center border border-black shrink-0">
                      CPU
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">CPU</span>
                        <span className="bg-blue-100 text-blue-800 border border-blue-300 text-[10px] font-bold px-2 py-0.2 rounded-full">
                          Original Genesis AI
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Original game CPU &bull; all {bucketFiles.length} cloud ROMs &bull; always available
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 hidden sm:inline">
                      Jump in &rarr; <strong className="font-mono text-black">{selectedRom.id.toUpperCase()}</strong>
                    </span>
                    <button
                      onClick={() => {
                        handleLeaveNetplayRoom();
                        setActiveArenaTab('ice');
                      }}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-sans text-xs font-bold rounded cursor-pointer shadow-2xs"
                    >
                      Play CPU
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Lobby Footer Buttons (Refresh Players / Locker Room Chat) */}
              <div className="mt-4 flex items-center justify-between flex-wrap gap-3 text-xs">
                <button
                  onClick={refreshBucketFiles}
                  className="px-4 py-2 border border-slate-300 hover:border-black bg-white text-slate-800 font-bold rounded cursor-pointer"
                >
                  Refresh players
                </button>
                <button
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  className="px-4 py-2 border border-slate-300 hover:border-black bg-white text-slate-800 font-bold rounded cursor-pointer flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                  <span>Locker Room Chat ({chatMessages.length})</span>
                </button>
                <div className="text-slate-500">
                  You: <strong>{myLobbyStatus}</strong> &bull; {myDisplayName}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 3: ROM VAULT SELECTOR (SHOWING ALL CLOUD "ROMS" BUCKET FILES) */}
          {/* ================================================================= */}
          {activeArenaTab === 'vault' && (
            <div className="bg-white border-2 border-black p-4 sm:p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black pb-3 mb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-black uppercase font-serif">
                    NHL &apos;95 ROM Vault ({bucketFiles.length} Ready in Cloud &ldquo;roms&rdquo; Bucket)
                  </h2>
                  <p className="text-xs text-slate-600">
                    ROMs marked with <span className="text-emerald-700 font-bold">● IN CLOUD BUCKET</span> stream directly from your Supabase <code className="font-mono">roms</code> bucket.
                  </p>
                </div>
                <button
                  onClick={() => localRomInputRef.current?.click()}
                  className="bg-black hover:bg-amber-600 text-white font-mono text-xs font-bold uppercase px-3 py-2 rounded-xs cursor-pointer flex items-center gap-1.5 shrink-0 self-start"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Play Local .BIN/.ZIP</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-1.5 flex-wrap font-mono text-xs">
                  {[
                    { id: 'cloud', label: `🟢 In Cloud "roms" Bucket (${bucketFiles.length})` },
                    { id: 'all', label: `All Catalog (${catalog.length})` },
                    { id: 'league', label: `Official Leagues (${OFFICIAL_LEAGUE_ROMS.length})` },
                    { id: 'nhl-history', label: `NHL History (${HISTORICAL_NHL_ROMS.length})` },
                    { id: 'misc', label: `Arcade & Misc (${MISC_ROMS.length})` }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setVaultCategory(tab.id as any)}
                      className={`px-3 py-1.5 rounded-xs font-bold uppercase text-[11px] cursor-pointer transition ${
                        vaultCategory === tab.id
                          ? 'bg-black text-amber-400'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="relative min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={vaultSearch}
                    onChange={e => setVaultSearch(e.target.value)}
                    placeholder="Search W16, W01, 1909..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-black rounded-xs font-sans focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[560px] overflow-y-auto pr-1">
                {filteredCatalog.map(item => {
                  const isCurrent = item.id === selectedRom.id && !localRomObjectUrl;
                  const cloudFile = findMatchingBucketFile(item, bucketFiles);
                  return (
                    <div
                      key={item.id}
                      className={`border-2 p-3 flex flex-col justify-between rounded-xs transition ${
                        isCurrent
                          ? 'border-black bg-amber-50 ring-2 ring-amber-500'
                          : 'border-black/80 bg-[#faf8f5] hover:bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="bg-black text-amber-400 font-mono text-[9px] font-black uppercase px-1.5 py-0.5 rounded-xs">
                            {item.categoryBadge}
                          </span>
                          {cloudFile ? (
                            <span className="font-mono text-[9px] font-black text-emerald-700 bg-emerald-100 border border-emerald-300 px-1.5 py-0.2 rounded">
                              ● {cloudFile}
                            </span>
                          ) : (
                            <span className="font-mono text-[9px] text-slate-400">
                              Local File
                            </span>
                          )}
                        </div>
                        <h4 className="font-serif text-xs font-black uppercase text-black leading-snug mb-1">
                          {item.title}
                        </h4>
                        <p className="text-[10px] text-slate-600 line-clamp-2 mb-3">
                          {item.description}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          if (typeof window !== 'undefined') (window as any).__NHL95_LOCAL_FILE = null;
                          setLocalRomObjectUrl(null);
                          setLocalRomTitle(null);
                          setSelectedRomId(item.id);
                          setActiveArenaTab('ice');
                        }}
                        className={`w-full py-1.5 font-mono text-[10px] font-black uppercase rounded-xs cursor-pointer flex items-center justify-center gap-1 transition ${
                          isCurrent
                            ? 'bg-emerald-700 text-white'
                            : 'bg-black hover:bg-amber-500 hover:text-black text-white'
                        }`}
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>{isCurrent ? 'Currently on Ice' : 'Load Cartridge on Ice'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 4: CONTROLLER SETUP & INTERACTIVE TESTER                      */}
          {/* ================================================================= */}
          {activeArenaTab === 'controller' && (
            <ControllerTesterPanel
              activeKeys={activeKeys}
              gamepadInfo={gamepadInfo}
              gamepadButtons={gamepadButtons}
              gamepadAxes={gamepadAxes}
            />
          )}

          {/* ================================================================= */}
          {/* TAB 5: 1-CLICK BOXSCORE & SAVE STATE ANALYZER LAB                 */}
          {/* ================================================================= */}
          {activeArenaTab === 'boxscore' && (
            <div className="bg-white border-2 border-black p-4 sm:p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)] space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b-2 border-black pb-3">
                <div>
                  <div className="text-[10px] font-mono font-black uppercase text-amber-700 tracking-wider">
                    DIRECT GENESIS RAM EXTRACTION
                  </div>
                  <h2 className="text-lg sm:text-xl font-black uppercase font-serif">
                    1-Click Live Boxscore &amp; Save State Lab
                  </h2>
                  <p className="text-xs text-slate-600">
                    Capture the live memory state straight from the browser emulator (or drop any <code className="font-mono bg-slate-100 px-1">.state</code> file) to inspect full boxscore stats.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleCaptureLiveBoxscore}
                    className="bg-amber-500 hover:bg-amber-400 text-black border border-black font-mono text-xs font-black uppercase px-3.5 py-2 rounded-xs cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Zap className="w-3.5 h-3.5 fill-black" />
                    <span>Capture From Emulator Now</span>
                  </button>
                  <button
                    onClick={() => loadStateInputRef.current?.click()}
                    className="bg-black hover:bg-neutral-800 text-white font-mono text-xs font-bold uppercase px-3.5 py-2 rounded-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Test .State File</span>
                  </button>
                </div>
              </div>

              <div className="bg-[#faf8f5] border border-black/30 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="text-xs font-mono font-bold uppercase text-slate-700">
                    Roster Config for Player Names:
                  </label>
                  <select
                    value={selectedSeasonConfigId}
                    onChange={e => setSelectedSeasonConfigId(e.target.value)}
                    className="bg-white border border-black px-2.5 py-1 text-xs font-mono font-bold rounded-xs"
                  >
                    {AVAILABLE_SEASONS.map(s => (
                      <option key={String(s.seasonId)} value={String(s.seasonId)}>
                        {s.seasonName} (Season {s.seasonId})
                      </option>
                    ))}
                  </select>
                </div>

                {capturedStateBytes && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handleDownloadCapturedState}
                      className="bg-emerald-700 hover:bg-emerald-600 text-white font-mono text-xs font-bold uppercase px-3 py-1.5 rounded-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .State ({Math.round(capturedStateBytes.length / 1024)} KB)</span>
                    </button>
                    <Link
                      href="/upload"
                      className="bg-black hover:bg-neutral-800 text-amber-400 font-mono text-xs font-bold uppercase px-3 py-1.5 rounded-xs flex items-center gap-1.5"
                    >
                      <span>Official League Upload &rarr;</span>
                    </Link>
                  </div>
                )}
              </div>

              {parseStatusMessage && (
                <div
                  className={`p-3 border text-xs font-mono flex items-center gap-2 ${
                    parseStatusMessage.type === 'success'
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-900'
                      : parseStatusMessage.type === 'error'
                      ? 'bg-red-50 border-red-600 text-red-900'
                      : 'bg-amber-50 border-amber-600 text-amber-900'
                  }`}
                >
                  {parseStatusMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{parseStatusMessage.text}</span>
                </div>
              )}

              {parsedGame ? (
                <ArenaRetroBoxscorePreview game={parsedGame} dbTeams={dbTeams} />
              ) : (
                <div className="border-2 border-dashed border-slate-300 p-8 text-center rounded-xs bg-[#faf8f5]">
                  <FileCode className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <div className="font-serif text-sm font-black uppercase text-slate-800">
                    No Game State Captured Yet
                  </div>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Play a period or match on the Arena Ice and click <strong>&ldquo;1-Click Boxscore&rdquo;</strong> at any time, or upload an existing <code className="font-mono">.state</code> file from your computer.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* RIGHT SIDEBAR (4 cols on lg) — COACH CARD, OPPONENT LIST & CHAT     */}
        {/* =================================================================== */}
        <div className="lg:col-span-4 space-y-5">
          {/* COACH PROFILE CARD */}
          <div className="bg-white border-2 border-black p-4 sm:p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-3.5 pb-3.5 border-b border-slate-200">
              <div className="w-14 h-14 rounded-xs bg-neutral-900 border-2 border-black flex items-center justify-center text-amber-400 font-serif font-black text-xl shrink-0 shadow-xs">
                {myDisplayName.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
                  {isLoggedIn ? 'VERIFIED LEAGUE COACH' : 'ARENA VISITOR'}
                </div>
                <div className="text-lg font-black font-serif uppercase truncate text-black">
                  {myDisplayName}
                </div>
                <div className="text-xs font-mono text-emerald-700 font-bold flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{myLobbyStatus === 'available' ? 'Available to Play' : 'Away'}</span>
                </div>
              </div>
            </div>

            <div className="py-3 border-b border-slate-200 text-xs">
              <div className="font-mono text-[10px] uppercase text-slate-500 font-bold mb-1">
                ACTIVE INPUT DEVICE
              </div>
              <div className="font-mono font-bold text-slate-800 truncate">
                {gamepadInfo ? `🎮 ${gamepadInfo}` : '⌨️ Keyboard — No USB controller detected'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-3.5 font-mono text-xs">
              {!isLoggedIn ? (
                <button
                  onClick={() => openLoginModal('Sign in to represent your franchise in the NHL95 Online Arena')}
                  className="col-span-2 py-2 px-3 bg-blue-700 hover:bg-blue-600 text-white font-bold uppercase rounded-xs cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Coach Sign In</span>
                </button>
              ) : (
                <Link
                  href="/managers"
                  className="py-2 px-3 bg-blue-700 hover:bg-blue-600 text-white font-bold uppercase rounded-xs flex items-center justify-center gap-1.5 text-center"
                >
                  <span>Coach Profile</span>
                </Link>
              )}

              <button
                onClick={() => setActiveArenaTab('lobby')}
                className="py-2 px-3 bg-emerald-700 hover:bg-emerald-600 text-white font-bold uppercase rounded-xs cursor-pointer transition"
              >
                Find Player ({onlinePlayers.length || 1})
              </button>

              <button
                onClick={() => setActiveArenaTab('controller')}
                className="py-2 px-3 bg-slate-100 hover:bg-black hover:text-white text-black border border-slate-300 font-bold uppercase rounded-xs cursor-pointer transition"
              >
                Test Controller
              </button>

              <button
                onClick={() => setActiveArenaTab('vault')}
                className="py-2 px-3 bg-slate-100 hover:bg-black hover:text-white text-black border border-slate-300 font-bold uppercase rounded-xs cursor-pointer transition"
              >
                Switch ROM
              </button>
            </div>
          </div>

          {/* LIVE LOCKER ROOM CHAT & QUICK OPPONENT PICKER */}
          <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-3">
              <div className="font-mono text-xs font-black uppercase text-black flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-700" />
                <span>Locker Room ({onlinePlayers.length || 1} Online)</span>
              </div>
              <button
                onClick={handleHostOpenRoom}
                className="text-[10px] font-mono font-black uppercase bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded cursor-pointer"
              >
                + Host 2P Game
              </button>
            </div>

            {/* Compact Online Players List */}
            <div className="space-y-2 max-h-48 overflow-y-auto mb-3 pr-1">
              {onlinePlayers.map(p => {
                const isMe = p.peerId === myPeerId;
                return (
                  <div
                    key={p.peerId}
                    className="flex items-center justify-between gap-2 p-2 bg-[#faf8f5] border border-slate-200 rounded-xs text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          p.status === 'available' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      />
                      <span className="font-bold truncate">{p.coachName}</span>
                      <span className="text-[10px] font-mono text-slate-500">({p.preferredRomLabel})</span>
                    </div>
                    {!isMe ? (
                      p.roomId ? (
                        <button
                          onClick={() => handleJoinMatchRoom(p.peerId, p.coachName, p.roomId!, p.preferredRomId)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] font-black uppercase rounded cursor-pointer shrink-0"
                        >
                          Join
                        </button>
                      ) : (
                        <button
                          onClick={() => handleChallengePlayer(p)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-mono text-[10px] font-black uppercase rounded cursor-pointer shrink-0"
                        >
                          Play
                        </button>
                      )
                    ) : (
                      <span className="text-[10px] font-mono text-slate-400">You</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Locker Room Chat Box */}
            <div className="border-t border-slate-200 pt-3">
              <div className="text-[10px] font-mono uppercase text-slate-500 font-bold mb-2">
                LOCKER ROOM CHAT
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded p-2.5 h-36 overflow-y-auto space-y-1.5 text-xs mb-2">
                {chatMessages.length === 0 ? (
                  <div className="text-slate-400 text-[11px] text-center py-8">
                    Say hello or ask who&apos;s ready for a game!
                  </div>
                ) : (
                  chatMessages.map(m => (
                    <div key={m.id} className="leading-snug">
                      <span className="font-bold text-blue-900">{m.senderName}: </span>
                      <span className="text-slate-800">{m.text}</span>
                      <span className="text-[9px] text-slate-400 ml-1.5 font-mono">{m.timestamp}</span>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={handleSendChat} className="flex gap-1.5">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Say hello in the Locker Room..."
                  maxLength={280}
                  className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded-xs focus:outline-none focus:border-black"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-black hover:bg-amber-500 hover:text-black text-white font-mono text-xs font-bold uppercase rounded-xs cursor-pointer flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                </button>
              </form>
            </div>
          </div>

          {/* PRE-GAME: 3 EASY STEPS */}
          <div className="bg-[#f8f4e8] border-2 border-black p-4 sm:p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
            <div className="text-[10px] font-mono font-black uppercase tracking-widest text-blue-800">
              PRE-GAME GUIDE
            </div>
            <h3 className="text-xl font-black uppercase font-serif tracking-tight text-black mb-4">
              3 Easy Steps
            </h3>

            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-6 h-6 bg-blue-800 text-white font-mono text-xs font-black flex items-center justify-center rounded-xs">
                  1
                </span>
                <span className="font-bold text-xs uppercase font-mono">Choose How to Play</span>
              </div>
              <div className="space-y-1.5 pl-8">
                <button
                  onClick={() => setActiveArenaTab('lobby')}
                  className="w-full text-left p-2.5 bg-white hover:bg-amber-50 border border-slate-300 rounded-xs cursor-pointer transition block"
                >
                  <div className="font-bold text-xs text-black">Find a player</div>
                  <div className="text-[11px] text-slate-500">Real coaches in the Locker Room Lobby</div>
                </button>
                <button
                  onClick={() => {
                    handleLeaveNetplayRoom();
                    setActiveArenaTab('ice');
                  }}
                  className="w-full text-left p-2.5 bg-white hover:bg-amber-50 border border-slate-300 rounded-xs cursor-pointer transition block"
                >
                  <div className="font-bold text-xs text-black">Play solo</div>
                  <div className="text-[11px] text-slate-500">You vs the Genesis CPU</div>
                </button>
              </div>
            </div>

            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-6 h-6 bg-blue-800 text-white font-mono text-xs font-black flex items-center justify-center rounded-xs">
                  2
                </span>
                <span className="font-bold text-xs uppercase font-mono">Verify Your Controller</span>
              </div>
              <div className="pl-8">
                <button
                  onClick={() => setActiveArenaTab('controller')}
                  className="w-full text-left p-2.5 bg-white hover:bg-amber-50 border border-slate-300 rounded-xs cursor-pointer transition block"
                >
                  <div className="font-bold text-xs text-black">Open Interactive Gamepad Tester</div>
                  <div className="text-[11px] text-slate-500">Works with Xbox, PlayStation, 8BitDo &amp; USB pads</div>
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-6 h-6 bg-blue-800 text-white font-mono text-xs font-black flex items-center justify-center rounded-xs">
                  3
                </span>
                <span className="font-bold text-xs uppercase font-mono">Capture Boxscore</span>
              </div>
              <div className="pl-8">
                <button
                  onClick={handleCaptureLiveBoxscore}
                  className="w-full text-left p-2.5 bg-white hover:bg-emerald-50 border border-slate-300 rounded-xs cursor-pointer transition block"
                >
                  <div className="font-bold text-xs text-emerald-900">1-Click Live Boxscore Extraction</div>
                  <div className="text-[11px] text-slate-500">Reads Genesis RAM into an official WN95HL Boxscore</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// RETRO BOXSCORE PREVIEW WRAPPER FOR THE ARENA
// ============================================================================
function ArenaRetroBoxscorePreview({ game, dbTeams }: { game: ParsedGame; dbTeams: any[] }) {
  const awayCode = (game.awayTeam.teamCode || 'AWAY').toUpperCase();
  const homeCode = (game.homeTeam.teamCode || 'HOME').toUpperCase();

  const findTeam = (code: string) =>
    dbTeams.find(t => (t.abbreviation || '').trim().toUpperCase() === code);

  const awayTeamObj = findTeam(awayCode);
  const homeTeamObj = findTeam(homeCode);

  const awayName = awayTeamObj?.team_name || W_LEAGUE_COACH_MAP[awayCode]?.city || awayCode;
  const homeName = homeTeamObj?.team_name || W_LEAGUE_COACH_MAP[homeCode]?.city || homeCode;

  const totalFaceoffs = (Number(game.awayTeam.faceoffWins) || 0) + (Number(game.homeTeam.faceoffWins) || 0);
  const at = game.awayTeam;
  const ht = game.homeTeam;

  const statRows = [
    { label: 'Shots', away: at.shots, home: ht.shots },
    { label: '1rst Period', away: at.shotsP1, home: ht.shotsP1 },
    { label: '2nd Period', away: at.shotsP2, home: ht.shotsP2 },
    { label: '3rd Period', away: at.shotsP3, home: ht.shotsP3 },
    { label: 'Overtime', away: at.shotsOT || 0, home: ht.shotsOT || 0 },
    { label: 'Shooting %', away: `${Math.round(at.shootingPct * 100)}%`, home: `${Math.round(ht.shootingPct * 100)}%` },
    { label: 'PowerPlay', away: `${at.ppGoals}/${at.ppTries}`, home: `${ht.ppGoals}/${ht.ppTries}` },
    { label: 'PowerPlay Shots', away: at.ppShots, home: ht.ppShots },
    { label: 'Shorthanded G', away: at.shGoals, home: ht.shGoals },
    { label: 'Breakaways', away: `${at.breakawayGoals}/${at.breakawayTries}`, home: `${ht.breakawayGoals}/${ht.breakawayTries}` },
    { label: 'One-Timers', away: `${at.oneTimerGoals}/${at.oneTimerTries}`, home: `${ht.oneTimerGoals}/${ht.oneTimerTries}` },
    { label: 'Penalty Shots', away: `${at.penaltyShotGoals}/${at.penaltyShotTries}`, home: `${ht.penaltyShotGoals}/${ht.penaltyShotTries}` },
    { label: 'Faceoffs', away: `${at.faceoffWins}/${totalFaceoffs}`, home: `${ht.faceoffWins}/${totalFaceoffs}` },
    { label: 'Body Checks', away: at.checks, home: ht.checks },
    { label: 'Penalties', away: at.penalties, home: ht.penalties },
    { label: 'Attack Zone', away: at.attackZoneTime, home: ht.attackZoneTime }
  ];

  const mapGoalies = (arr: any[]) =>
    (arr || []).map((g: any) => ({
      name: g.name,
      goals: g.goals || 0,
      assists: g.assists || 0,
      so: g.so ?? (g.ga === 0 && g.shots > 0 ? 1 : 0),
      ga: g.ga,
      saves: g.saves,
      shots: g.shots,
      savePct: typeof g.savePct === 'number' ? g.savePct : 0,
      toi: g.toi || '15:00'
    }));

  const mapSkaters = (arr: any[]) =>
    (arr || []).map((s: any) => ({
      name: s.name,
      goals: s.goals,
      assists: s.assists,
      points: s.points,
      sog: s.sog,
      checks: s.checks,
      pim: s.pim,
      ppp: s.ppp,
      shp: s.shp,
      toi: s.toi || '15:00'
    }));

  return (
    <RetroBoxscore
      away={{
        code: awayCode,
        name: awayName,
        logoUrl: awayTeamObj?.logo_url || null,
        score: at.goals,
        goalies: mapGoalies(game.awayGoalies),
        skaters: mapSkaters(game.awaySkaters)
      }}
      home={{
        code: homeCode,
        name: homeName,
        logoUrl: homeTeamObj?.logo_url || null,
        score: ht.goals,
        goalies: mapGoalies(game.homeGoalies),
        skaters: mapSkaters(game.homeSkaters)
      }}
      periods={{
        away: { p1: at.goalsP1, p2: at.goalsP2, p3: at.goalsP3, ot: at.goalsOT || 0, total: at.goals },
        home: { p1: ht.goalsP1, p2: ht.goalsP2, p3: ht.goalsP3, ot: ht.goalsOT || 0, total: ht.goals }
      }}
      statRows={statRows}
      goals={(game.goals || []).map((g: any) => ({
        period: g.period,
        time: g.time,
        team: g.team,
        scorer: g.scorer,
        assist1: g.assist1,
        assist2: g.assist2,
        type: g.status || g.type
      }))}
      penalties={(game.penalties || []).map(p => ({
        period: p.period,
        time: p.time,
        team: p.team,
        player: p.player,
        type: p.type
      }))}
    />
  );
}

export default function ArenaPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center font-mono text-sm uppercase">
          Loading NHL &apos;95 Online Arena...
        </div>
      }
    >
      <ArenaContent />
    </Suspense>
  );
}
