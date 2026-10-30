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
// COACH CONTROLLER CONFIGURATION & PRESETS
// ============================================================================
export interface CoachControllerConfig {
  presetName: string;
  preferredPadIndex?: number | null;
  updatedAt?: number;
  keyboard: {
    b: string;
    a: string;
    c: string;
    x: string;
    y: string;
    z: string;
    start: string;
    mode: string;
    up: string;
    down: string;
    left: string;
    right: string;
  };
  gamepad: {
    b: number;
    c: number;
    a: number;
    y: number;
    x: number;
    z: number;
    mode: number;
    start: number;
    up: number;
    down: number;
    left: number;
    right: number;
    deadzone: number;
    useAnalogStick: boolean;
  };
}

export const DEFAULT_CONTROLLER_CONFIG: CoachControllerConfig = {
  presetName: 'Standard Xbox / PS / 8BitDo',
  keyboard: {
    b: 'x',
    a: 'z',
    c: 'c',
    x: 'a',
    y: 's',
    z: 'd',
    start: 'Enter',
    mode: 'Shift',
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight'
  },
  gamepad: {
    b: 0,
    c: 1,
    a: 2,
    y: 3,
    x: 4,
    z: 5,
    mode: 8,
    start: 9,
    up: 12,
    down: 13,
    left: 14,
    right: 15,
    deadzone: 0.4,
    useAnalogStick: true
  }
};

export const CONTROLLER_PRESETS: Record<string, CoachControllerConfig> = {
  'Standard Xbox / PS / 8BitDo': DEFAULT_CONTROLLER_CONFIG,
  'Sega Genesis 6-Button USB': {
    presetName: 'Sega Genesis 6-Button USB',
    keyboard: { ...DEFAULT_CONTROLLER_CONFIG.keyboard },
    gamepad: {
      b: 1,
      c: 2,
      a: 0,
      y: 4,
      x: 3,
      z: 5,
      mode: 8,
      start: 9,
      up: 12,
      down: 13,
      left: 14,
      right: 15,
      deadzone: 0.35,
      useAnalogStick: true
    }
  },
  'SNES / Classic Layout': {
    presetName: 'SNES / Classic Layout',
    keyboard: { ...DEFAULT_CONTROLLER_CONFIG.keyboard },
    gamepad: {
      b: 2,
      c: 0,
      a: 3,
      y: 1,
      x: 4,
      z: 5,
      mode: 8,
      start: 9,
      up: 12,
      down: 13,
      left: 14,
      right: 15,
      deadzone: 0.4,
      useAnalogStick: true
    }
  },
  'WASD + JKL Keyboard': {
    presetName: 'WASD + JKL Keyboard',
    keyboard: {
      b: 'k',
      a: 'j',
      c: 'l',
      x: 'u',
      y: 'i',
      z: 'o',
      start: 'Enter',
      mode: 'Shift',
      up: 'w',
      down: 's',
      left: 'a',
      right: 'd'
    },
    gamepad: { ...DEFAULT_CONTROLLER_CONFIG.gamepad }
  }
};

type GenesisControlKey = keyof CoachControllerConfig['keyboard'];

const GENESIS_BUTTON_ROWS: Array<{
  key: GenesisControlKey;
  label: string;
  color: string;
  desc: string;
}> = [
  { key: 'b', label: 'B Button', color: 'text-amber-400', desc: 'Pass / Switch Player / Poke Check' },
  { key: 'c', label: 'C Button', color: 'text-amber-400', desc: 'Shoot / One-Timer / Body Check / Speed Burst' },
  { key: 'a', label: 'A Button', color: 'text-amber-400', desc: 'Flip Puck / Dump / Line Change / Manual Goalie' },
  { key: 'start', label: 'START', color: 'text-red-400', desc: 'Start Game / Pause / Instant Replay' },
  { key: 'mode', label: 'MODE', color: 'text-cyan-400', desc: 'Mode / Select Button' },
  { key: 'x', label: 'X Button', color: 'text-cyan-300', desc: '6-Button X (Line Change / Extra)' },
  { key: 'y', label: 'Y Button', color: 'text-cyan-300', desc: '6-Button Y (Line Change / Extra)' },
  { key: 'z', label: 'Z Button', color: 'text-cyan-300', desc: '6-Button Z (Line Change / Extra)' },
  { key: 'up', label: 'D-Pad UP', color: 'text-emerald-400', desc: 'Skate Up / Aim Top Shelf' },
  { key: 'down', label: 'D-Pad DOWN', color: 'text-emerald-400', desc: 'Skate Down / Aim Five-Hole' },
  { key: 'left', label: 'D-Pad LEFT', color: 'text-emerald-400', desc: 'Skate Left / Aim Left Corner' },
  { key: 'right', label: 'D-Pad RIGHT', color: 'text-emerald-400', desc: 'Skate Right / Aim Right Corner' }
];

function isConfiguredKeyActive(activeKeys: Set<string>, keyName: string): boolean {
  if (!keyName) return false;
  if (activeKeys.has(keyName)) return true;
  if (keyName.length === 1) {
    return activeKeys.has(keyName.toLowerCase()) || activeKeys.has(keyName.toUpperCase());
  }
  return false;
}

export interface ConnectedGamepadSlot {
  portIndex: number;
  id: string;
  buttons: boolean[];
  axes: number[];
}

// ============================================================================
// INTERACTIVE CONTROLLER TESTER, REMAPPING & COACH CLOUD SAVE COMPONENT
// ============================================================================
function ControllerTesterPanel({
  activeKeys,
  gamepadInfo,
  gamepadButtons,
  gamepadAxes,
  allGamepads,
  fourPlayerMode,
  onToggleFourPlayerMode,
  controllerConfig,
  onChangeConfig,
  onSaveCoachConfig,
  isSavingConfig,
  saveConfigBanner,
  isLoggedIn,
  coachName,
  onOpenLogin,
  onReturnToGame
}: {
  activeKeys: Set<string>;
  gamepadInfo: string | null;
  gamepadButtons: boolean[];
  gamepadAxes: number[];
  allGamepads: ConnectedGamepadSlot[];
  fourPlayerMode: boolean;
  onToggleFourPlayerMode: (val: boolean) => void;
  controllerConfig: CoachControllerConfig;
  onChangeConfig: (next: CoachControllerConfig) => void;
  onSaveCoachConfig: () => void;
  isSavingConfig: boolean;
  saveConfigBanner: { type: 'success' | 'error' | 'info'; text: string } | null;
  isLoggedIn: boolean;
  coachName: string;
  onOpenLogin: () => void;
  onReturnToGame: () => void;
}) {
  const [listeningTarget, setListeningTarget] = useState<{
    type: 'keyboard' | 'gamepad';
    control: GenesisControlKey;
  } | null>(null);
  const [inspectedPort, setInspectedPort] = useState<number>(0); // 0 = P1, 1 = P2, 2 = P3, 3 = P4

  const selectedPad = allGamepads.find(p => p.portIndex === inspectedPort);
  const activeBtns = selectedPad ? selectedPad.buttons : inspectedPort === 0 ? gamepadButtons : [];
  const activeAx = selectedPad ? selectedPad.axes : inspectedPort === 0 ? gamepadAxes : [];
  const includeKeyboard = inspectedPort === 0;

  const kb = controllerConfig.keyboard;
  const gp = controllerConfig.gamepad;
  const dz = gp.deadzone ?? 0.4;
  const useAnalog = gp.useAnalogStick !== false;

  // Listen for keyboard press when remapping a keyboard key
  useEffect(() => {
    if (!listeningTarget || listeningTarget.type !== 'keyboard') return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') {
        setListeningTarget(null);
        return;
      }
      const normalizedKey = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      onChangeConfig({
        ...controllerConfig,
        presetName: 'Custom Coach Mapping',
        keyboard: {
          ...controllerConfig.keyboard,
          [listeningTarget.control]: normalizedKey
        }
      });
      setListeningTarget(null);
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [listeningTarget, controllerConfig, onChangeConfig]);

  // Listen for USB/Bluetooth gamepad button press when remapping a controller button
  // Record which buttons were already held when listening started so held/noisy buttons never auto-trigger
  const initialPressedButtonsRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!listeningTarget || listeningTarget.type !== 'gamepad') {
      initialPressedButtonsRef.current.clear();
      return;
    }
    const initiallyHeld = new Set<number>();
    activeBtns.forEach((isDown, idx) => {
      if (isDown) initiallyHeld.add(idx);
    });
    initialPressedButtonsRef.current = initiallyHeld;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listeningTarget]);

  useEffect(() => {
    if (!listeningTarget || listeningTarget.type !== 'gamepad') return;
    // Release any button from initialPressedButtonsRef once it is released
    activeBtns.forEach((isDown, idx) => {
      if (!isDown && initialPressedButtonsRef.current.has(idx)) {
        initialPressedButtonsRef.current.delete(idx);
      }
    });
    const pressedIdx = activeBtns.findIndex(
      (isDown, idx) => Boolean(isDown) && !initialPressedButtonsRef.current.has(idx)
    );
    if (pressedIdx !== -1) {
      onChangeConfig({
        ...controllerConfig,
        presetName: 'Custom Coach Mapping',
        updatedAt: Date.now(),
        gamepad: {
          ...controllerConfig.gamepad,
          [listeningTarget.control]: pressedIdx
        }
      });
      setListeningTarget(null);
    }
  }, [listeningTarget, activeBtns, controllerConfig, onChangeConfig]);

  const isUp =
    (includeKeyboard && isConfiguredKeyActive(activeKeys, kb.up)) ||
    Boolean(activeBtns[gp.up]) ||
    (useAnalog && activeAx[1] !== undefined && activeAx[1] < -dz);
  const isDown =
    (includeKeyboard && isConfiguredKeyActive(activeKeys, kb.down)) ||
    Boolean(activeBtns[gp.down]) ||
    (useAnalog && activeAx[1] !== undefined && activeAx[1] > dz);
  const isLeft =
    (includeKeyboard && isConfiguredKeyActive(activeKeys, kb.left)) ||
    Boolean(activeBtns[gp.left]) ||
    (useAnalog && activeAx[0] !== undefined && activeAx[0] < -dz);
  const isRight =
    (includeKeyboard && isConfiguredKeyActive(activeKeys, kb.right)) ||
    Boolean(activeBtns[gp.right]) ||
    (useAnalog && activeAx[0] !== undefined && activeAx[0] > dz);

  const isA = (includeKeyboard && isConfiguredKeyActive(activeKeys, kb.a)) || Boolean(activeBtns[gp.a]);
  const isB = (includeKeyboard && isConfiguredKeyActive(activeKeys, kb.b)) || Boolean(activeBtns[gp.b]);
  const isC = (includeKeyboard && isConfiguredKeyActive(activeKeys, kb.c)) || Boolean(activeBtns[gp.c]);
  const isX = (includeKeyboard && isConfiguredKeyActive(activeKeys, kb.x)) || Boolean(activeBtns[gp.x]);
  const isY = (includeKeyboard && isConfiguredKeyActive(activeKeys, kb.y)) || Boolean(activeBtns[gp.y]);
  const isZ = (includeKeyboard && isConfiguredKeyActive(activeKeys, kb.z)) || Boolean(activeBtns[gp.z]);
  const isStart = (includeKeyboard && isConfiguredKeyActive(activeKeys, kb.start)) || Boolean(activeBtns[gp.start]);
  const isMode = (includeKeyboard && isConfiguredKeyActive(activeKeys, kb.mode)) || Boolean(activeBtns[gp.mode]);

  return (
    <div className="bg-neutral-950 text-white border-2 border-black p-4 sm:p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] space-y-5">
      {/* Header Bar with Return to Game + Coach Cloud Save */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-mono text-xs uppercase font-black">
            <Gamepad2 className="w-4 h-4" /> Sega Genesis 6-Button Diagnostic &amp; Coach Controller Settings
          </div>
          <p className="text-xs text-slate-400 font-sans mt-1">
            Test your controller live, click any button below to remap your Keyboard or USB Gamepad, and save your setup to your Coach Profile.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onReturnToGame}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-black uppercase px-3.5 py-2 rounded-xs cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Return to Game</span>
          </button>

          {isLoggedIn ? (
            <button
              onClick={onSaveCoachConfig}
              disabled={isSavingConfig}
              className="bg-amber-400 hover:bg-amber-300 text-black font-mono text-xs font-black uppercase px-4 py-2 rounded-xs cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <CloudUpload className="w-4 h-4" />
              <span>{isSavingConfig ? 'Saving...' : `Save Controller Settings (${coachName})`}</span>
            </button>
          ) : (
            <button
              onClick={onOpenLogin}
              className="bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-black uppercase px-4 py-2 rounded-xs cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Sign In as Coach to Save Controller Settings</span>
            </button>
          )}
        </div>
      </div>

      {/* Save Status Notification Banner */}
      {saveConfigBanner && (
        <div
          className={`p-3 rounded border font-mono text-xs flex items-center justify-between gap-2 ${
            saveConfigBanner.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300'
              : saveConfigBanner.type === 'error'
              ? 'bg-red-950/90 border-red-500 text-red-300'
              : 'bg-blue-950/90 border-blue-500 text-blue-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{saveConfigBanner.text}</span>
          </div>
          {isLoggedIn && (
            <span className="text-[10px] uppercase px-2 py-0.5 bg-black/50 rounded border border-white/10">
              Coach Profile: {coachName}
            </span>
          )}
        </div>
      )}

      {/* Active Input Status & Quick Preset Bar */}
      <div className="bg-[#0d1017] border border-neutral-800 rounded p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className={`px-3 py-1.5 rounded border font-mono text-xs font-bold flex items-center gap-2 ${
          gamepadInfo
            ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300'
            : 'bg-amber-950/80 border-amber-500/60 text-amber-300'
        }`}>
          <span className={`w-2 h-2 rounded-full ${gamepadInfo ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span>{gamepadInfo ? `Gamepad Ready: ${gamepadInfo}` : 'Keyboard Mode (Press any controller button to wake USB pad)'}</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Quick Presets:</span>
          {Object.keys(CONTROLLER_PRESETS).map(presetKey => (
            <button
              key={presetKey}
              onClick={() => onChangeConfig(CONTROLLER_PRESETS[presetKey])}
              className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase border cursor-pointer transition ${
                controllerConfig.presetName === presetKey
                  ? 'bg-amber-400 text-black border-amber-300 font-black'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-slate-300 border-neutral-700'
              }`}
            >
              {presetKey}
            </button>
          ))}
          <button
            onClick={() => onChangeConfig(DEFAULT_CONTROLLER_CONFIG)}
            className="px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase bg-neutral-900 hover:bg-red-950 text-red-300 border border-red-900/60 cursor-pointer"
          >
            Reset Default
          </button>
        </div>
      </div>

      {/* 4-PLAYER (2-ON-2 EA 4-WAY PLAY) CONTROLLER PORT HUB */}
      <div className="bg-[#0d1017] border border-neutral-800 rounded p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-2.5">
          <div>
            <div className="text-xs font-mono font-black uppercase text-cyan-400 flex items-center gap-2">
              <Users className="w-4 h-4" /> 4-Player (2-on-2 EA 4-Way Play) Controller Ports
            </div>
            <p className="text-[11px] text-slate-400">
              Supports up to 4 simultaneous controllers (local USB/Bluetooth pads + online netplay coaches for 2-on-2 matches). Click any port to test it below.
            </p>
          </div>
          <label className="flex items-center gap-2 font-mono text-xs font-bold text-amber-300 bg-neutral-900 border border-neutral-700 px-3 py-1.5 rounded cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={fourPlayerMode}
              onChange={e => onToggleFourPlayerMode(e.target.checked)}
              className="accent-amber-400"
            />
            <span>EA 4-Way Play (2v2 Multitap) Enabled</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {[0, 1, 2, 3].map(portIdx => {
            const padSlot = allGamepads.find(p => p.portIndex === portIdx);
            const isSelected = inspectedPort === portIdx;
            return (
              <button
                key={portIdx}
                type="button"
                onClick={() => setInspectedPort(portIdx)}
                className={`p-3 rounded border text-left font-mono transition cursor-pointer ${
                  isSelected
                    ? 'bg-neutral-900 border-amber-400 ring-1 ring-amber-400'
                    : 'bg-neutral-950/80 hover:bg-neutral-900 border-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black uppercase text-amber-400">
                    Port {portIdx + 1} (P{portIdx + 1})
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      padSlot
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                        : portIdx === 0
                        ? 'bg-blue-950 text-blue-300 border border-blue-700'
                        : 'bg-neutral-900 text-slate-500 border border-neutral-800'
                    }`}
                  >
                    {padSlot ? '🎮 USB Pad' : portIdx === 0 ? '⌨️ Keyboard' : 'Open / Online'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-300 truncate">
                  {padSlot
                    ? padSlot.id
                    : portIdx === 0
                    ? 'Keyboard + Primary Pad'
                    : `Plug in Controller #${portIdx + 1} or Join Online as P${portIdx + 1}`}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Visual 6-Button Pad + Analog Settings */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center bg-[#0d1017] border border-neutral-800 rounded-lg p-6 relative space-y-5">
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
            TESTING PORT {inspectedPort + 1} (PLAYER {inspectedPort + 1}) • {controllerConfig.presetName.toUpperCase()}
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

          {/* Analog Stick & Sensitivity Options */}
          <div className="w-full bg-neutral-900/90 border border-neutral-800 rounded p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAnalog}
                  onChange={e =>
                    onChangeConfig({
                      ...controllerConfig,
                      gamepad: { ...gp, useAnalogStick: e.target.checked }
                    })
                  }
                  className="accent-amber-400"
                />
                <span>Enable Left Analog Stick for Skating</span>
              </label>
              <span className="text-[11px] font-mono text-amber-400 font-bold">
                Deadzone: {Math.round(dz * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-slate-400">Sensitive (15%)</span>
              <input
                type="range"
                min={0.15}
                max={0.75}
                step={0.05}
                value={dz}
                onChange={e =>
                  onChangeConfig({
                    ...controllerConfig,
                    gamepad: { ...gp, deadzone: parseFloat(e.target.value) }
                  })
                }
                className="flex-1 accent-amber-400 cursor-pointer"
              />
              <span className="text-[10px] font-mono text-slate-400">Firm (75%)</span>
            </div>
          </div>
        </div>

        {/* Right: Interactive Button Remapping Table */}
        <div className="lg:col-span-6 bg-neutral-900 border border-neutral-800 rounded-lg p-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5 mb-3">
            <div>
              <div className="text-xs font-mono font-black uppercase text-amber-400">
                Interactive Button Remapping
              </div>
              <div className="text-[11px] text-slate-400">
                Click any Keyboard or USB Pad slot below, then press the key or button you want to assign.
              </div>
            </div>
            {listeningTarget && (
              <button
                onClick={() => setListeningTarget(null)}
                className="px-2.5 py-1 bg-red-600 text-white font-mono text-[10px] font-black uppercase rounded animate-pulse cursor-pointer"
              >
                Cancel Listening
              </button>
            )}
          </div>

          <div className="space-y-1.5 text-xs font-mono max-h-[380px] overflow-y-auto pr-1">
            <div className="grid grid-cols-12 text-[10px] text-slate-400 uppercase pb-1 border-b border-neutral-800">
              <div className="col-span-3">Genesis</div>
              <div className="col-span-3">Keyboard</div>
              <div className="col-span-3">USB Pad</div>
              <div className="col-span-3">Function</div>
            </div>

            {GENESIS_BUTTON_ROWS.map(row => {
              const isListeningKb =
                listeningTarget?.type === 'keyboard' && listeningTarget.control === row.key;
              const isListeningGp =
                listeningTarget?.type === 'gamepad' && listeningTarget.control === row.key;
              const currentKey = kb[row.key];
              const currentGpBtn = gp[row.key];

              return (
                <div
                  key={row.key}
                  className="grid grid-cols-12 items-center py-1.5 border-b border-neutral-800/60 gap-1"
                >
                  <div className={`col-span-3 font-black ${row.color}`}>{row.label}</div>

                  <div className="col-span-3">
                    <button
                      type="button"
                      onClick={() =>
                        setListeningTarget(
                          isListeningKb ? null : { type: 'keyboard', control: row.key }
                        )
                      }
                      className={`px-2 py-1 rounded border text-[11px] font-mono font-bold cursor-pointer transition ${
                        isListeningKb
                          ? 'bg-amber-400 text-black border-white animate-pulse'
                          : 'bg-black hover:bg-neutral-800 text-white border-neutral-700'
                      }`}
                      title="Click then press any keyboard key"
                    >
                      {isListeningKb ? 'Press Key...' : currentKey.toUpperCase()}
                    </button>
                  </div>

                  <div className="col-span-3">
                    <button
                      type="button"
                      onClick={() =>
                        setListeningTarget(
                          isListeningGp ? null : { type: 'gamepad', control: row.key }
                        )
                      }
                      className={`px-2 py-1 rounded border text-[11px] font-mono font-bold cursor-pointer transition ${
                        isListeningGp
                          ? 'bg-emerald-400 text-black border-white animate-pulse'
                          : 'bg-neutral-950 hover:bg-neutral-800 text-emerald-300 border-emerald-800/70'
                      }`}
                      title="Click then press any button on your USB/Bluetooth controller"
                    >
                      {isListeningGp ? 'Press Pad...' : `Btn ${currentGpBtn}`}
                    </button>
                  </div>

                  <div className="col-span-3 text-[11px] text-slate-300 font-sans truncate" title={row.desc}>
                    {row.desc}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] text-slate-400">
              {isLoggedIn
                ? `Signed in as Coach ${coachName} — click Save to store these mappings to your account.`
                : 'Sign in as a Coach to save your custom controller mappings across all devices.'}
            </span>
            {isLoggedIn ? (
              <button
                onClick={onSaveCoachConfig}
                disabled={isSavingConfig}
                className="bg-amber-400 hover:bg-amber-300 text-black font-mono text-xs font-black uppercase px-3.5 py-1.5 rounded-xs cursor-pointer flex items-center gap-1.5"
              >
                <CloudUpload className="w-3.5 h-3.5" />
                <span>{isSavingConfig ? 'Saving...' : `Save for ${coachName}`}</span>
              </button>
            ) : (
              <button
                onClick={onOpenLogin}
                className="bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-black uppercase px-3.5 py-1.5 rounded-xs cursor-pointer flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Coach Sign In</span>
              </button>
            )}
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

  // Selected Bucket File / ROM state
  const [selectedRomId, setSelectedRomId] = useState<string>(() => {
    const found = catalog.find(r => r.id.toLowerCase() === initialRomParam.toLowerCase());
    return found ? found.id : 'w16';
  });

  useEffect(() => {
    const param = searchParams.get('rom');
    if (param) {
      const cleanParam = param.replace(/\.(zip|bin)$/i, '').toLowerCase();
      const found = catalog.find(
        r =>
          r.id.toLowerCase() === cleanParam ||
          (cleanParam === '1909' && r.id === 'nhl-1909-10')
      );
      if (found) setSelectedRomId(found.id);
    }
  }, [searchParams, catalog]);

  const selectedRom = useMemo(
    () => catalog.find(r => r.id === selectedRomId) || catalog[0],
    [catalog, selectedRomId]
  );

  // Build exact list of ROMs as they are in the Supabase "roms" bucket (`1909.zip`, `W01.zip`..`W16.zip`, etc.)
  const bucketRomItems = useMemo(() => {
    return bucketFiles.map(fileName => {
      const base = fileName.replace(/\.(zip|bin|md|gen|smd)$/i, '');
      const matchedCatalog =
        catalog.find(r => {
          const m = findMatchingBucketFile(r, [fileName]);
          return m !== null;
        }) ||
        catalog.find(
          r =>
            r.id.toLowerCase() === base.toLowerCase() ||
            (base === '1909' && r.id === 'nhl-1909-10')
        );

      return {
        fileName,
        base,
        romId: matchedCatalog ? matchedCatalog.id : base.toLowerCase(),
        title: matchedCatalog ? matchedCatalog.title : `${base.toUpperCase()} Cartridge`,
        subtitle: matchedCatalog ? matchedCatalog.subtitle : 'Supabase "roms" Bucket',
        description: matchedCatalog
          ? matchedCatalog.description
          : `Official ${fileName} archive from the Supabase "roms" bucket.`,
        badge: fileName
      };
    });
  }, [bucketFiles, catalog]);

  // Arena Sub-navigation Tab ('ice' | 'lobby' | 'records' | 'vault' | 'controller' | 'boxscore')
  const [activeArenaTab, setActiveArenaTab] = useState<'ice' | 'lobby' | 'records' | 'vault' | 'controller' | 'boxscore'>('ice');

  // Adaptive AI CPU & All-Time Arena Records State
  const [arenaRecordsData, setArenaRecordsData] = useState<{
    aiModel: any;
    coachLeaderboard: any[];
    allTimeRecords: any;
    recentArenaMatches: any[];
    totalGamesAnalyzed: number;
  } | null>(null);
  const [isLoadingRecords, setIsLoadingRecords] = useState<boolean>(false);
  const [isRecordingArenaMatch, setIsRecordingArenaMatch] = useState<boolean>(false);
  const [coachSearchFilter, setCoachSearchFilter] = useState<string>('');
  const [coachSortField, setCoachSortField] = useState<
    'points' | 'wins' | 'goalsFor' | 'winPct' | 'gpg' | 'checks' | 'oneTimerGoals' | 'shutouts'
  >('points');
  const [aiBotPort2Takeover, setAiBotPort2Takeover] = useState<boolean>(false);
  const [liveAiTelemetry, setLiveAiTelemetry] = useState<{
    detectedPlaystyle: string;
    activeCounter: string;
    oneTimerInputCombos: number;
    rushBurstCount: number;
    eastWestCrosses: number;
    homeOneTimerTries: number;
    homeBreakawayTries: number;
    homeChecks: number;
    weights: {
      oneTimerDefense: number;
      breakawayTrap: number;
      forecheckAggression: number;
      faceoffCounter: number;
      slotLockdown: number;
    };
  } | null>(null);
  const lastAiLearnTickAtRef = useRef<number>(0);
  const lastRecordedMatchSigRef = useRef<string>('');

  // Emulator loading & runtime state (does NOT auto-start until user selects a ROM or clicks Play)
  const [hasLaunchedGame, setHasLaunchedGame] = useState<boolean>(false);
  const [emulatorRunning, setEmulatorRunning] = useState<boolean>(false);
  const [resolvedRomUrl, setResolvedRomUrl] = useState<string | null>(null);
  const [resolvedRomFileName, setResolvedRomFileName] = useState<string>('');
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [localRomObjectUrl, setLocalRomObjectUrl] = useState<string | null>(null);
  const [localRomTitle, setLocalRomTitle] = useState<string | null>(null);
  const [localRomRawFile, setLocalRomRawFile] = useState<File | null>(null);

  // Online Head-to-Head & 2-on-2 (4-Player) Netplay State
  const [netplayRole, setNetplayRole] = useState<'solo' | 'host' | 'guest'>('solo');
  const [netplaySlot, setNetplaySlot] = useState<number>(1); // 1 = Player 2, 2 = Player 3, 3 = Player 4
  const [fourPlayerMode, setFourPlayerMode] = useState<boolean>(true); // EA 4-Way Play 2v2 Multitap
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
  const iceContainerRef = useRef<HTMLDivElement | null>(null);
  const localRomInputRef = useRef<HTMLInputElement | null>(null);
  const loadStateInputRef = useRef<HTMLInputElement | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestStateRef = useRef<Uint8Array | null>(null);
  const pendingStateResolversRef = useRef<Array<(bytes: Uint8Array | null) => void>>([]);

  // Vault Browser filters — default to 'cloud' so the user sees the exact files in the "roms" bucket first
  const [vaultCategory, setVaultCategory] = useState<'all' | 'cloud' | 'league' | 'nhl-history' | 'misc'>('cloud');
  const [vaultSearch, setVaultSearch] = useState<string>('');

  // Controller & Keyboard Live State + 4-Player Gamepad Slots + Coach Saved Controller Profile
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [gamepadInfo, setGamepadInfo] = useState<string | null>(null);
  const [gamepadButtons, setGamepadButtons] = useState<boolean[]>([]);
  const [gamepadAxes, setGamepadAxes] = useState<number[]>([]);
  const [allGamepads, setAllGamepads] = useState<ConnectedGamepadSlot[]>([]);
  const [controllerConfig, setControllerConfig] = useState<CoachControllerConfig>(DEFAULT_CONTROLLER_CONFIG);
  const [isSavingControllerConfig, setIsSavingControllerConfig] = useState<boolean>(false);
  const [controllerSaveBanner, setControllerSaveBanner] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const pushControllerConfigToIframe = useCallback((cfg: CoachControllerConfig) => {
    if (typeof window !== 'undefined') {
      (window as any).__NHL95_CONTROLLER_CONFIG = cfg;
      try {
        localStorage.setItem('nhl95_controller_config_active', JSON.stringify(cfg));
      } catch {}
    }
    try {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'NHL95_CONTROLLER_CONFIG_UPDATE',
          config: cfg
        },
        '*'
      );
    } catch {
      // ignore
    }
  }, []);

  // Sync active controller config to window & running emulator iframe
  useEffect(() => {
    pushControllerConfigToIframe(controllerConfig);
  }, [controllerConfig, pushControllerConfigToIframe]);

  // Auto-load coach's saved controller settings when signed in (without overwriting newer local changes!)
  useEffect(() => {
    if (!isLoggedIn || !currentCoach?.coach_id) {
      try {
        const guestLocal =
          localStorage.getItem('nhl95_controller_config_guest') ||
          localStorage.getItem('nhl95_controller_config_active');
        if (guestLocal) {
          const parsed = JSON.parse(guestLocal);
          if (parsed && parsed.keyboard && parsed.gamepad) {
            setControllerConfig(parsed);
          }
        }
      } catch {}
      return;
    }

    const coachId = currentCoach.coach_id;
    const localKey = `nhl95_controller_config_${coachId}`;
    let localParsed: CoachControllerConfig | null = null;

    // Load instant local cache first
    try {
      const cached = localStorage.getItem(localKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.keyboard && parsed.gamepad) {
          localParsed = parsed;
          setControllerConfig(parsed);
        }
      }
    } catch {}

    // Fetch cloud-saved controller settings from Supabase for this coach (cache-busted)
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/coach/controller-settings?coachId=${encodeURIComponent(String(coachId))}&t=${Date.now()}`,
          { cache: 'no-store' }
        );
        const data = await res.json();
        if (!cancelled && data?.config && data.config.keyboard && data.config.gamepad) {
          const cloudCfg: CoachControllerConfig = data.config;
          const localTime = Number(localParsed?.updatedAt || 0);
          const cloudTime = Number(cloudCfg.updatedAt || (data.updatedAt ? Date.parse(data.updatedAt) : 0) || 0);

          // Only apply cloud config if local cache is empty or older than cloud config
          if (!localParsed || cloudTime >= localTime) {
            setControllerConfig(cloudCfg);
            try {
              localStorage.setItem(localKey, JSON.stringify(cloudCfg));
              localStorage.setItem('nhl95_controller_config_active', JSON.stringify(cloudCfg));
            } catch {}
            setControllerSaveBanner({
              type: 'info',
              text: `Loaded saved controller settings for Coach ${currentCoach.coach_name} (${cloudCfg.presetName || 'Custom'}).`
            });
          } else if (localParsed && localTime > cloudTime) {
            // Local config is newer than cloud — push local config up to cloud so it never reverts!
            fetch('/api/coach/controller-settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                coachId,
                coachName: currentCoach.coach_name,
                config: localParsed
              })
            }).catch(() => {});
          }
        }
      } catch {
        // keep cached or default
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, currentCoach?.coach_id, currentCoach?.coach_name]);

  const handleUpdateControllerConfig = useCallback(
    (next: CoachControllerConfig) => {
      const stamped: CoachControllerConfig = {
        ...next,
        updatedAt: Date.now()
      };
      setControllerConfig(stamped);
      try {
        localStorage.setItem('nhl95_controller_config_active', JSON.stringify(stamped));
        const key =
          isLoggedIn && currentCoach?.coach_id
            ? `nhl95_controller_config_${currentCoach.coach_id}`
            : 'nhl95_controller_config_guest';
        localStorage.setItem(key, JSON.stringify(stamped));
      } catch {}

      // Auto-save to cloud profile when logged in so changes never revert if coach forgets to click Save
      if (isLoggedIn && currentCoach?.coach_id) {
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        const cId = currentCoach.coach_id;
        const cName = currentCoach.coach_name;
        autoSaveTimerRef.current = setTimeout(async () => {
          try {
            const res = await fetch('/api/coach/controller-settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                coachId: cId,
                coachName: cName,
                config: stamped
              })
            });
            if (res.ok) {
              setControllerSaveBanner({
                type: 'success',
                text: `Auto-saved controller settings (${stamped.presetName}) for Coach ${cName}.`
              });
            }
          } catch {}
        }, 450);
      }
    },
    [isLoggedIn, currentCoach?.coach_id, currentCoach?.coach_name]
  );

  const handleSaveCoachControllerConfig = useCallback(async () => {
    if (!isLoggedIn || !currentCoach?.coach_id) {
      openLoginModal('Sign in as a Coach to save your controller settings to your profile');
      return;
    }

    setIsSavingControllerConfig(true);
    setControllerSaveBanner(null);
    try {
      const stamped: CoachControllerConfig = {
        ...controllerConfig,
        updatedAt: Date.now()
      };
      setControllerConfig(stamped);
      const localKey = `nhl95_controller_config_${currentCoach.coach_id}`;
      localStorage.setItem(localKey, JSON.stringify(stamped));
      localStorage.setItem('nhl95_controller_config_active', JSON.stringify(stamped));

      const res = await fetch('/api/coach/controller-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coachId: currentCoach.coach_id,
          coachName: currentCoach.coach_name,
          config: stamped
        })
      });
      const data = await res.json();
      if (!res.ok || data?.error) {
        throw new Error(data?.error || 'Could not save controller settings to cloud');
      }

      setControllerSaveBanner({
        type: 'success',
        text: `Saved controller settings (${stamped.presetName}) to Coach ${currentCoach.coach_name}'s profile!`
      });
    } catch (err: any) {
      setControllerSaveBanner({
        type: 'error',
        text: err?.message || 'Saved locally, but cloud sync failed.'
      });
    } finally {
      setIsSavingControllerConfig(false);
    }
  }, [isLoggedIn, currentCoach, controllerConfig, openLoginModal]);

  // Boxscore & Save State Parser Lab State
  const [selectedSeasonConfigId, setSelectedSeasonConfigId] = useState<string>('40');
  const [capturedStateBytes, setCapturedStateBytes] = useState<Uint8Array | null>(null);
  const [capturedFileName, setCapturedFileName] = useState<string>('');
  const [parsedGame, setParsedGame] = useState<ParsedGame | null>(null);
  const [parseStatusMessage, setParseStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isSendingToDiscord, setIsSendingToDiscord] = useState<boolean>(false);
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

  // Load All-Time Arena Records, Coach Leaderboard & Adaptive AI Brain from /api/arena-records
  const refreshArenaRecords = useCallback(async () => {
    setIsLoadingRecords(true);
    try {
      const res = await fetch(`/api/arena-records?t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data) {
        setArenaRecordsData(data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingRecords(false);
    }
  }, []);

  useEffect(() => {
    refreshArenaRecords();
  }, [refreshArenaRecords]);

  // Sync the Adaptive 95-AI Neural CPU weights & Bot takeover state into the emulator iframe
  const pushAiConfigToIframe = useCallback(
    (botOverride?: boolean) => {
      const aiModel = arenaRecordsData?.aiModel;
      const myProfile = aiModel?.coachProfiles?.[myDisplayName];
      const weights = myProfile?.counterWeights || aiModel?.weights || {
        oneTimerDefense: 0.55,
        breakawayTrap: 0.55,
        forecheckAggression: 0.55,
        faceoffCounter: 0.55,
        slotLockdown: 0.55
      };
      const takeover = typeof botOverride === 'boolean' ? botOverride : aiBotPort2Takeover;
      try {
        iframeRef.current?.contentWindow?.postMessage(
          {
            type: 'NHL95_AI_CONFIG_UPDATE',
            aiConfig: {
              enabled: netplayRole === 'solo',
              botPort2Takeover: takeover,
              generation: aiModel?.generation || 1,
              eloRating: aiModel?.eloRating || 1500,
              activeStrategy: myProfile?.aiCounterStrategy || 'Adaptive Balanced',
              weights
            }
          },
          '*'
        );
      } catch {}
    },
    [arenaRecordsData?.aiModel, myDisplayName, aiBotPort2Takeover, netplayRole]
  );

  useEffect(() => {
    pushAiConfigToIframe(aiBotPort2Takeover);
  }, [aiBotPort2Takeover, pushAiConfigToIframe]);

  // Record a parsed game to /api/arena-records to update Coach Records, All-Time Arena Records & train the AI CPU
  const recordParsedGameToArenaRecords = useCallback(
    async (game: ParsedGame, manualTrigger = false) => {
      try {
        const homeGoals = Number(game.homeTeam?.goals) || 0;
        const awayGoals = Number(game.awayTeam?.goals) || 0;
        const totalShots = (Number(game.homeTeam?.shots) || 0) + (Number(game.awayTeam?.shots) || 0);
        if (homeGoals === 0 && awayGoals === 0 && totalShots === 0) return;

        const homeCode = (game.homeTeam?.teamCode || 'HOME').toUpperCase();
        const awayCode = (game.awayTeam?.teamCode || 'AWAY').toUpperCase();
        const sig = `${selectedRom.id}_${homeCode}_${awayCode}_${homeGoals}_${awayGoals}_${totalShots}`;
        if (!manualTrigger && lastRecordedMatchSigRef.current === sig) return;
        lastRecordedMatchSigRef.current = sig;

        setIsRecordingArenaMatch(true);
        const homeWCoach = W_LEAGUE_COACH_MAP[homeCode]?.coach_name;
        const awayWCoach = W_LEAGUE_COACH_MAP[awayCode]?.coach_name;

        const isVsAi = netplayRole === 'solo';
        const homeCoachName =
          netplayRole === 'guest'
            ? netplayOpponentName || homeWCoach || myDisplayName
            : myDisplayName || homeWCoach || 'Home Coach';
        const awayCoachName = isVsAi
          ? '95-AI Neural CPU'
          : netplayRole === 'guest'
          ? myDisplayName
          : netplayOpponentName || awayWCoach || 'Away Coach';

        const res = await fetch('/api/arena-records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'record-match',
            romId: selectedRom.id.toUpperCase(),
            seasonLabel: `Arena (${selectedRom.id.toUpperCase()})`,
            isVsAi,
            homeCoach: homeCoachName,
            awayCoach: awayCoachName,
            homeTeam: homeCode,
            awayTeam: awayCode,
            homeGoals,
            awayGoals,
            isOvertime:
              (Number(game.homeTeam?.goalsOT) || 0) > 0 ||
              (Number(game.awayTeam?.goalsOT) || 0) > 0 ||
              (Number(game.homeTeam?.shotsOT) || 0) > 0 ||
              (Number(game.awayTeam?.shotsOT) || 0) > 0,
            homeShots: Number(game.homeTeam?.shots) || 0,
            awayShots: Number(game.awayTeam?.shots) || 0,
            homeChecks: Number(game.homeTeam?.checks) || 0,
            awayChecks: Number(game.awayTeam?.checks) || 0,
            homeOneTimerGoals: Number(game.homeTeam?.oneTimerGoals) || 0,
            homeOneTimerTries: Number(game.homeTeam?.oneTimerTries) || 0,
            awayOneTimerGoals: Number(game.awayTeam?.oneTimerGoals) || 0,
            awayOneTimerTries: Number(game.awayTeam?.oneTimerTries) || 0,
            homeBreakawayGoals: Number(game.homeTeam?.breakawayGoals) || 0,
            homeBreakawayTries: Number(game.homeTeam?.breakawayTries) || 0,
            awayBreakawayGoals: Number(game.awayTeam?.breakawayGoals) || 0,
            awayBreakawayTries: Number(game.awayTeam?.breakawayTries) || 0,
            homeFaceoffs: Number(game.homeTeam?.faceoffWins) || 0,
            awayFaceoffs: Number(game.awayTeam?.faceoffWins) || 0,
            homeAttackZoneSec: (() => {
              const p = String(game.homeTeam?.attackZoneTime || '0:00').split(':');
              return p.length === 2 ? (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0) : 0;
            })(),
            awayAttackZoneSec: (() => {
              const p = String(game.awayTeam?.attackZoneTime || '0:00').split(':');
              return p.length === 2 ? (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0) : 0;
            })(),
            homePassPct:
              (Number(game.homeTeam?.passTries) || 0) > 0
                ? Math.round(((Number(game.homeTeam?.passComps) || 0) / Number(game.homeTeam?.passTries)) * 100)
                : 0,
            awayPassPct:
              (Number(game.awayTeam?.passTries) || 0) > 0
                ? Math.round(((Number(game.awayTeam?.passComps) || 0) / Number(game.awayTeam?.passTries)) * 100)
                : 0,
            goals: (game.goals || []).map((g: any) => ({
              period: Number(g.period) || 1,
              time: String(g.time || '0:00'),
              seconds: typeof g.seconds === 'number' ? g.seconds : 0,
              team: String(g.team || ''),
              scorer: String(g.scorer || '')
            }))
          })
        });
        const data = await res.json();
        if (res.ok && data?.success) {
          await refreshArenaRecords();
          if (manualTrigger) {
            setParseStatusMessage({
              type: 'success',
              text: `Recorded official Arena match (${awayCode} ${awayGoals} @ ${homeCode} ${homeGoals}) & trained 95-AI Neural CPU (Gen ${data.aiModel?.generation || 1})!`
            });
          }
        }
      } catch {
        // ignore
      } finally {
        setIsRecordingArenaMatch(false);
      }
    },
    [selectedRom.id, netplayRole, netplayOpponentName, myDisplayName, refreshArenaRecords]
  );

  // Resolve the selected ROM against the Supabase `roms` bucket and stream extracted .bin via /api/arena-rom-stream
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
      const cleanBase = matchedFile.replace(/\.(zip|bin|md|gen|smd)$/i, '');
      setResolvedRomUrl(
        `/api/arena-rom-stream/${encodeURIComponent(cleanBase)}.bin?bucketFile=${encodeURIComponent(matchedFile)}`
      );
      setResolvedRomFileName(matchedFile);
      setFallbackNotice(null);
    } else {
      const fallbackFile = bucketFiles.find(f => f.toUpperCase() === 'W16.ZIP') || bucketFiles[0] || 'W16.zip';
      const cleanBase = fallbackFile.replace(/\.(zip|bin|md|gen|smd)$/i, '');
      setResolvedRomUrl(
        `/api/arena-rom-stream/${encodeURIComponent(cleanBase)}.bin?bucketFile=${encodeURIComponent(fallbackFile)}`
      );
      setResolvedRomFileName(fallbackFile);
      setFallbackNotice(
        `Note: "${selectedRom.id.toUpperCase()}" isn't uploaded to the cloud "roms" bucket yet (selected fallback: ${fallbackFile}). Click "Load Local ROM" if you have ${selectedRom.id.toUpperCase()} on your computer.`
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
          setHasLaunchedGame(true);
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
    setHasLaunchedGame(true);
    setActiveArenaTab('ice');
  };

  // Host an Open Match Room (1v1 or 2v2 4-Player) that any coach in the Locker Room can join with 1 click
  const handleHostOpenRoom = (isTwoOnTwo = false) => {
    const newRoomId = `${isTwoOnTwo ? '2v2' : 'open'}_${myPeerId.slice(-4)}_${Date.now().toString(36)}`;
    if (isTwoOnTwo) setFourPlayerMode(true);
    setNetplayRoomId(newRoomId);
    setNetplayRole('host');
    setNetplayOpponentName(isTwoOnTwo ? '2v2 Room (Waiting for P2, P3, P4)' : 'Waiting for Opponent...');
    setSentInviteNotice(
      isTwoOnTwo
        ? '2v2 (4-Player) Match Room Created! Up to 3 coaches in the Locker Room can click Join P2, P3, or P4 to play 2-on-2!'
        : 'Open Match Room Created! Any player in the Locker Room can click "Join Game" to drop in as Player 2, 3, or 4.'
    );
    setHasLaunchedGame(true);
    setActiveArenaTab('ice');
  };

  // Accept an incoming challenge or join an Open Match Room as Player 2, 3, or 4 (Guest)
  const handleJoinMatchRoom = (
    hostPeerId: string,
    hostName: string,
    roomId: string,
    romId: string,
    slot = 1
  ) => {
    const foundRom = catalog.find(r => r.id.toLowerCase() === romId.toLowerCase());
    if (foundRom) setSelectedRomId(foundRom.id);

    lobbyChannelRef.current?.send({
      type: 'broadcast',
      event: 'match-accepted',
      payload: {
        hostPeerId,
        guestPeerId: myPeerId,
        guestCoachName: `${myDisplayName} (P${slot + 1})`,
        roomId,
        slot
      }
    });

    setIncomingInvite(null);
    setSentInviteNotice(null);
    setNetplayOpponentName(hostName);
    setNetplayRoomId(roomId);
    setNetplaySlot(slot);
    setNetplayRole('guest');
    setHasLaunchedGame(true);
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
        latestStateRef.current = normalizedBytes;
        setCapturedStateBytes(normalizedBytes);
        setCapturedFileName(sourceLabel);

        const seasonCfg = getSeasonConfig(selectedSeasonConfigId);
        const game = parseSaveStateBuffer(normalizedBytes, seasonCfg);
        setParsedGame(game);
        setParseStatusMessage({
          type: 'success',
          text: `Parsed ${game.awayTeam.teamCode} (${game.awayTeam.goals}) @ ${game.homeTeam.teamCode} (${game.homeTeam.goals}) from ${sourceLabel}!`
        });
        recordParsedGameToArenaRecords(game, false);
      } catch (err: any) {
        setParseStatusMessage({
          type: 'error',
          text: err?.message || 'Could not parse save state bytes. Make sure you are inside an active or completed NHL 95 game.'
        });
      }
    },
    [selectedSeasonConfigId, recordParsedGameToArenaRecords]
  );

  // Toggle Fullscreen for both Host and Guest Coaches
  const handleToggleFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return;
    const doc = document as any;
    const fsEl = doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement;
    if (fsEl) {
      const exit = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen;
      if (exit) {
        try { exit.call(doc); } catch {}
      }
      return;
    }
    const container = iceContainerRef.current as any;
    if (container) {
      const req = container.requestFullscreen || container.webkitRequestFullscreen || container.mozRequestFullScreen;
      if (req) {
        try {
          req.call(container);
          return;
        } catch {}
      }
    }
    try {
      iframeRef.current?.contentWindow?.postMessage({ type: 'NHL95_TOGGLE_FULLSCREEN' }, '*');
    } catch {}
  }, []);

  // Helper to obtain the freshest Save State bytes for EITHER Host OR Guest Coach!
  const obtainLatestSaveStateBytes = useCallback(async (): Promise<Uint8Array | null> => {
    try {
      const iframeWin = iframeRef.current?.contentWindow as any;
      const ejs = iframeWin?.EJS_emulator;
      if (ejs && ejs.gameManager && typeof ejs.gameManager.getState === 'function') {
        const liveRaw: Uint8Array = ejs.gameManager.getState();
        if (liveRaw && liveRaw.length >= 52000) {
          const normalized = ensureRetroArchHeader(liveRaw);
          latestStateRef.current = normalized;
          setCapturedStateBytes(normalized);
          const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, '');
          setCapturedFileName(`${selectedRom.id.toUpperCase()}_arena_${stamp}.state`);
          // Also sync to any connected Guests in the room
          try {
            iframeWin.postMessage({ type: 'NHL95_CAPTURE_AND_SYNC_STATE', reason: 'host-capture' }, '*');
          } catch {}
          return normalized;
        }
      }
    } catch {}

    // If Guest in an online Netplay Room, request an instant state snapshot from the Host (with 1.8s timeout fallback to cached state)
    if (netplayRole === 'guest') {
      const freshFromHost = await new Promise<Uint8Array | null>(resolve => {
        let settled = false;
        const timer = setTimeout(() => {
          if (!settled) {
            settled = true;
            resolve(null);
          }
        }, 1800);

        pendingStateResolversRef.current.push((bytes: Uint8Array | null) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve(bytes);
          }
        });

        try {
          iframeRef.current?.contentWindow?.postMessage(
            { type: 'NHL95_REQUEST_HOST_SAVESTATE', reason: 'guest-demand' },
            '*'
          );
        } catch {}
        try {
          roomChannelRef.current?.send({
            type: 'broadcast',
            event: 'netplay-signal',
            payload: { kind: 'request-savestate', guestId: myPeerId, reason: 'guest-demand' }
          });
        } catch {}
      });

      if (freshFromHost && freshFromHost.length >= 52000) {
        return freshFromHost;
      }
    }

    return latestStateRef.current || capturedStateBytes;
  }, [netplayRole, myPeerId, selectedRom.id, capturedStateBytes]);

  // 1-Click Capture Save State directly from EmulatorJS (Host) OR Synced Stream (Guest)
  const handleCaptureLiveBoxscore = useCallback(async () => {
    try {
      const stateBytes = await obtainLatestSaveStateBytes();
      if (!stateBytes || stateBytes.length < 52000) {
        setParseStatusMessage({
          type: 'error',
          text: 'Emulator is still booting or no active game state found yet. Start a game on the ice first, then click Capture Boxscore!'
        });
        setActiveArenaTab('boxscore');
        return;
      }

      const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, '');
      const fileName = `${selectedRom.id.toUpperCase()}_arena_${stamp}.state`;
      parseAndDisplayStateBuffer(stateBytes, fileName);
      setActiveArenaTab('boxscore');
    } catch (err: any) {
      setParseStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to capture live state from the match.'
      });
      setActiveArenaTab('boxscore');
    }
  }, [obtainLatestSaveStateBytes, parseAndDisplayStateBuffer, selectedRom.id]);

  const handleDownloadCapturedState = () => {
    const bytes = capturedStateBytes || latestStateRef.current;
    if (!bytes) return;
    const blob = new Blob([new Uint8Array(bytes)], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = capturedFileName || `${selectedRom.id.toUpperCase()}.state`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 1-Click Send Save State directly to the Discord Save State Channel (Works for BOTH Host & Guest Coaches!)
  const handleSendStateToDiscord = useCallback(async () => {
    setIsSendingToDiscord(true);
    try {
      const stateBytesToSend = await obtainLatestSaveStateBytes();
      const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, '');
      const fileNameToSend = capturedFileName || `${selectedRom.id.toUpperCase()}_arena_${stamp}.state`;

      if (!stateBytesToSend || stateBytesToSend.length < 52000) {
        setParseStatusMessage({
          type: 'error',
          text: 'No active game state found! Play a game on the Arena Ice (or load a .state file) before sending to Discord.'
        });
        setActiveArenaTab('boxscore');
        return;
      }

      setCapturedStateBytes(stateBytesToSend);
      setCapturedFileName(fileNameToSend);

      let scoreSummary = '';
      try {
        const seasonCfg = getSeasonConfig(selectedSeasonConfigId);
        const g = parseSaveStateBuffer(stateBytesToSend, seasonCfg);
        setParsedGame(g);
        scoreSummary = `${g.awayTeam.teamCode} ${g.awayTeam.goals} @ ${g.homeTeam.teamCode} ${g.homeTeam.goals}`;
        recordParsedGameToArenaRecords(g, false);
      } catch {
        // continue sending raw state even if roster config parse fails
      }

      const finalName = fileNameToSend || `${selectedRom.id.toUpperCase()}_arena.state`;
      const formData = new FormData();
      formData.append(
        'file',
        new Blob([new Uint8Array(stateBytesToSend)], { type: 'application/octet-stream' }),
        finalName
      );
      formData.append('fileName', finalName);
      formData.append('coachName', myDisplayName);
      formData.append('romLabel', resolvedRomFileName || selectedRom.id.toUpperCase());
      formData.append('scoreSummary', scoreSummary);
      formData.append('seasonId', selectedSeasonConfigId);

      const res = await fetch('/api/arena-discord-state', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setParseStatusMessage({
          type: 'success',
          text: `Sent ${finalName} (${scoreSummary || 'Save State'}) to Discord ${data.channelName || 'save-state channel'}!`
        });
      } else {
        setParseStatusMessage({
          type: 'error',
          text: data.error || 'Could not send save state to Discord.'
        });
      }
      setActiveArenaTab('boxscore');
    } catch (err: any) {
      setParseStatusMessage({
        type: 'error',
        text: err?.message || 'Error sending save state to Discord.'
      });
      setActiveArenaTab('boxscore');
    } finally {
      setIsSendingToDiscord(false);
    }
  }, [
    obtainLatestSaveStateBytes,
    capturedFileName,
    selectedRom.id,
    selectedSeasonConfigId,
    myDisplayName,
    resolvedRomFileName,
    recordParsedGameToArenaRecords
  ]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'NHL95_EJS_STARTED') {
        setEmulatorRunning(true);
        pushControllerConfigToIframe(controllerConfig);
        pushAiConfigToIframe();
      } else if (event.data.type === 'NHL95_GUEST_SLOT_CHANGED' && typeof event.data.slot === 'number') {
        setNetplaySlot(event.data.slot);
      } else if (
        (event.data.type === 'NHL95_EJS_SAVESTATE' ||
          event.data.type === 'NHL95_HOST_SAVESTATE_SYNCED' ||
          event.data.type === 'NHL95_GUEST_SAVESTATE_SYNCED') &&
        event.data.state
      ) {
        const stateArr =
          event.data.state instanceof Uint8Array
            ? event.data.state
            : new Uint8Array(event.data.state);
        const normalized = ensureRetroArchHeader(stateArr);
        latestStateRef.current = normalized;
        setCapturedStateBytes(normalized);
        const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, '');
        const label = `${selectedRom.id.toUpperCase()}_live_${stamp}.state`;
        setCapturedFileName(label);

        if (pendingStateResolversRef.current.length > 0) {
          const resolvers = [...pendingStateResolversRef.current];
          pendingStateResolversRef.current = [];
          resolvers.forEach(fn => fn(normalized));
        }

        if (event.data.type === 'NHL95_EJS_SAVESTATE' || event.data.reason === 'host-saved') {
          parseAndDisplayStateBuffer(normalized, label);
        }
      } else if (event.data.type === 'NHL95_GUEST_TRIGGER_DISCORD_STATE') {
        handleSendStateToDiscord();
      } else if (event.data.type === 'NHL95_GUEST_TRIGGER_BOXSCORE') {
        handleCaptureLiveBoxscore();
      } else if (event.data.type === 'NHL95_PARENT_FULLSCREEN_FALLBACK') {
        handleToggleFullscreen();
      } else if (event.data.type === 'NHL95_NETPLAY_SIGNAL' && event.data.signal) {
        roomChannelRef.current?.send({
          type: 'broadcast',
          event: 'netplay-signal',
          payload: event.data.signal
        });
      } else if (event.data.type === 'NHL95_AI_TELEMETRY') {
        setLiveAiTelemetry({
          detectedPlaystyle: event.data.detectedPlaystyle || 'Balanced Attack',
          activeCounter: event.data.activeCounter || 'Hybrid Slot & Rush Defense',
          oneTimerInputCombos: Number(event.data.oneTimerInputCombos) || 0,
          rushBurstCount: Number(event.data.rushBurstCount) || 0,
          eastWestCrosses: Number(event.data.eastWestCrosses) || 0,
          homeOneTimerTries: Number(event.data.homeOneTimerTries) || 0,
          homeBreakawayTries: Number(event.data.homeBreakawayTries) || 0,
          homeChecks: Number(event.data.homeChecks) || 0,
          weights: event.data.weights || {
            oneTimerDefense: 0.55,
            breakawayTrap: 0.55,
            forecheckAggression: 0.55,
            faceoffCounter: 0.55,
            slotLockdown: 0.55
          }
        });

        // Periodically persist live AI learning ticks so the 95-AI Neural CPU permanently learns during gameplay
        const now = Date.now();
        const totalActivity =
          (Number(event.data.homeShots) || 0) +
          (Number(event.data.awayShots) || 0) +
          (Number(event.data.oneTimerInputCombos) || 0) +
          (Number(event.data.rushBurstCount) || 0);
        if (totalActivity > 2 && now - lastAiLearnTickAtRef.current > 25000) {
          lastAiLearnTickAtRef.current = now;
          fetch('/api/arena-records', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'ai-learn-tick',
              coachName: myDisplayName,
              homeOneTimers: Number(event.data.homeOneTimerTries) || Number(event.data.oneTimerInputCombos) || 0,
              homeBreakaways: Number(event.data.homeBreakawayTries) || 0,
              homeChecks: Number(event.data.homeChecks) || 0,
              homeShots: Number(event.data.homeShots) || 0,
              homeAttackZone: Number(event.data.homeAttackZone) || 0,
              awayAttackZone: Number(event.data.awayAttackZone) || 0,
              homeGoals: Number(event.data.homeGoals) || 0,
              awayGoals: Number(event.data.awayGoals) || 0
            })
          }).catch(() => {});
        }
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
  }, [
    parseAndDisplayStateBuffer,
    selectedRom,
    controllerConfig,
    pushControllerConfigToIframe,
    pushAiConfigToIframe,
    myDisplayName,
    handleSendStateToDiscord,
    handleCaptureLiveBoxscore,
    handleToggleFullscreen
  ]);

  // Only run 60Hz gamepad/keyboard React state polling when on the 'controller' setup tab!
  // On the 'ice' tab, avoid 60fps parent React re-renders so the emulator & WebRTC stream run at a locked 60 FPS!
  useEffect(() => {
    const updateConnectedSummaryOnly = () => {
      if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
      const pads = Array.from(navigator.getGamepads()).filter(Boolean) as Gamepad[];
      const nextInfo =
        pads.length > 0
          ? pads.length > 1
            ? `${pads.length} Controllers Connected (${pads[0].id})`
            : pads[0].id
          : null;
      setGamepadInfo(prev => (prev === nextInfo ? prev : nextInfo));
    };

    if (activeArenaTab !== 'controller') {
      updateConnectedSummaryOnly();
      const slowTimer = setInterval(updateConnectedSummaryOnly, 1500);
      window.addEventListener('gamepadconnected', updateConnectedSummaryOnly);
      window.addEventListener('gamepaddisconnected', updateConnectedSummaryOnly);
      return () => {
        clearInterval(slowTimer);
        window.removeEventListener('gamepadconnected', updateConnectedSummaryOnly);
        window.removeEventListener('gamepaddisconnected', updateConnectedSummaryOnly);
      };
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      setActiveKeys(prev => {
        if (prev.has(e.key)) return prev;
        const next = new Set(prev);
        next.add(e.key);
        return next;
      });
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      setActiveKeys(prev => {
        if (!prev.has(e.key)) return prev;
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
        const connected: ConnectedGamepadSlot[] = [];
        let slotCounter = 0;
        for (let i = 0; i < pads.length && slotCounter < 4; i++) {
          const p = pads[i];
          if (p) {
            connected.push({
              portIndex: slotCounter,
              id: p.id,
              buttons: p.buttons.map(b => b.pressed),
              axes: [...p.axes]
            });
            slotCounter++;
          }
        }
        setAllGamepads(connected);

        if (connected.length > 0) {
          const primary = connected[0];
          setGamepadInfo(
            connected.length > 1
              ? `${connected.length} Controllers Connected (${primary.id})`
              : primary.id
          );
          setGamepadButtons(primary.buttons);
          setGamepadAxes(primary.axes);
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
  }, [activeArenaTab]);

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
    setHasLaunchedGame(true);
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
    if (!activeRomUrl || !hasLaunchedGame) return null;
    const fileLabel = localRomTitle || resolvedRomFileName || `${selectedRom.id.toUpperCase()}.zip`;
    return `/emulator.html?romUrl=${encodeURIComponent(activeRomUrl)}&title=${encodeURIComponent(fileLabel)}&role=${netplayRole}&roomId=${encodeURIComponent(netplayRoomId)}&slot=${netplaySlot}&guestId=${encodeURIComponent(myPeerId)}&fourPlayer=${fourPlayerMode ? '1' : '0'}&autoStart=1`;
  }, [activeRomUrl, hasLaunchedGame, localRomTitle, resolvedRomFileName, selectedRom.id, netplayRole, netplayRoomId, netplaySlot, myPeerId, fourPlayerMode]);

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
                  DARKSIDE OF 95
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
            {activeArenaTab !== 'ice' && (
              <button
                onClick={() => setActiveArenaTab('ice')}
                className="bg-emerald-500 hover:bg-emerald-400 text-black border border-black px-3.5 py-1.5 text-xs font-mono font-black uppercase rounded-xs flex items-center gap-1.5 cursor-pointer transition shadow-xs"
              >
                <Play className="w-3.5 h-3.5 fill-black" />
                <span>Return to Game</span>
              </button>
            )}
            <button
              onClick={() => handleHostOpenRoom(false)}
              className="bg-blue-600 hover:bg-blue-500 text-white border border-blue-400 px-3 py-1.5 text-xs font-mono font-black uppercase rounded-xs flex items-center gap-1.5 cursor-pointer transition shadow-xs"
              title="Open a 1v1 (2-Player) Online Match Room"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Host 1v1 (2P)</span>
            </button>
            <button
              onClick={() => handleHostOpenRoom(true)}
              className="bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-300 px-3 py-1.5 text-xs font-mono font-black uppercase rounded-xs flex items-center gap-1.5 cursor-pointer transition shadow-xs"
              title="Open a 2-on-2 (4-Player EA 4-Way Play) Online Match Room"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Host 2v2 (4P)</span>
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
              onClick={handleSendStateToDiscord}
              disabled={isSendingToDiscord}
              className="bg-[#5865F2] hover:bg-[#4752C4] text-white border border-indigo-300 px-3.5 py-1.5 text-xs font-mono font-black uppercase rounded-xs flex items-center gap-1.5 cursor-pointer transition shadow-xs"
              title="Capture and send the live .state file directly to the Discord Save State channel"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSendingToDiscord ? 'Sending to Discord...' : 'Send .State to Discord'}</span>
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
              {
                id: 'records',
                label: '🏆 Records & AI Brain',
                badge: arenaRecordsData?.aiModel ? `AI GEN ${arenaRecordsData.aiModel.generation}` : 'ALL-TIME'
              },
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
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleHostOpenRoom(false)}
                className="text-xs font-mono font-bold text-blue-700 hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>+ Host 1v1 (2P)</span>
              </button>
              <button
                onClick={() => handleHostOpenRoom(true)}
                className="text-xs font-mono font-bold text-cyan-700 hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>+ Host 2v2 (4P)</span>
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-200">
            {gamesInProgress.length === 0 ? (
              <div className="px-4 py-4 text-xs text-slate-500 font-sans flex items-center justify-between flex-wrap gap-2">
                <span>No live matches on the ice right now. Start a game below or host a 1v1 (2P) or 2v2 (4-Player) room!</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleHostOpenRoom(false)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-mono text-[11px] font-bold uppercase rounded cursor-pointer"
                  >
                    Open 1v1 Room
                  </button>
                  <button
                    onClick={() => handleHostOpenRoom(true)}
                    className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-[11px] font-bold uppercase rounded cursor-pointer"
                  >
                    Open 2v2 (4P) Room
                  </button>
                </div>
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
                          {g.homeTeam || 'HOME'} • HOST (P1)
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
                            {isWaitingForP2 ? 'OPEN 1v1 / 2v2 LOBBY' : 'LINEUP / PREGAME'}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Opponent & Join Port Buttons (P2, P3, P4 for 2v2!) */}
                    <div className="flex items-center gap-2 min-w-[200px] justify-end flex-wrap">
                      <div className="text-right mr-1">
                        <div className="font-bold text-sm text-slate-900">
                          {g.opponentName || 'CPU'}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 uppercase">
                          {g.awayTeam || 'AWAY'}
                        </div>
                      </div>

                      {g.roomId && g.peerId !== myPeerId ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleJoinMatchRoom(g.peerId, g.coachName, g.roomId!, g.preferredRomId, 1)}
                            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-mono text-[11px] font-black uppercase rounded cursor-pointer shadow-2xs"
                            title="Join as Player 2"
                          >
                            Join P2
                          </button>
                          <button
                            onClick={() => handleJoinMatchRoom(g.peerId, g.coachName, g.roomId!, g.preferredRomId, 2)}
                            className="px-2 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white font-mono text-[11px] font-black uppercase rounded cursor-pointer shadow-2xs"
                            title="Join as Player 3 (2-on-2)"
                          >
                            P3
                          </button>
                          <button
                            onClick={() => handleJoinMatchRoom(g.peerId, g.coachName, g.roomId!, g.preferredRomId, 3)}
                            className="px-2 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white font-mono text-[11px] font-black uppercase rounded cursor-pointer shadow-2xs"
                            title="Join as Player 4 (2-on-2)"
                          >
                            P4
                          </button>
                        </div>
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
          {/* CLOUD-READY "ROMS" BUCKET CARTRIDGES STRIP (ALL FILES IN SUPABASE "roms" BUCKET) */}
          <div className="bg-white border-2 border-black p-3 shadow-[3px_3px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2.5 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
              <span>SELECT A ROM FROM SUPABASE &ldquo;ROMS&rdquo; BUCKET ({bucketRomItems.length} FILES)</span>
              <button
                onClick={() => setActiveArenaTab('vault')}
                className="text-amber-700 hover:underline cursor-pointer font-bold"
              >
                Open Full Vault ({bucketFiles.length} in Bucket) &rarr;
              </button>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {bucketRomItems.map(item => {
                const isSelected = item.romId === selectedRom.id && !localRomObjectUrl;
                return (
                  <button
                    key={item.fileName}
                    onClick={() => {
                      if (typeof window !== 'undefined') (window as any).__NHL95_LOCAL_FILE = null;
                      setLocalRomObjectUrl(null);
                      setLocalRomTitle(null);
                      setSelectedRomId(item.romId);
                      setHasLaunchedGame(false);
                      setEmulatorRunning(false);
                      setActiveArenaTab('ice');
                    }}
                    title={`${item.fileName} — ${item.title}`}
                    className={`px-2.5 py-1.5 border transition cursor-pointer rounded-xs flex items-center gap-1.5 font-mono text-xs font-black ${
                      isSelected
                        ? 'bg-neutral-950 text-amber-400 border-black ring-2 ring-amber-500'
                        : 'bg-[#faf8f5] hover:bg-amber-50 text-black border-slate-300 hover:border-black'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected && hasLaunchedGame ? 'bg-emerald-400 animate-ping' : 'bg-emerald-500'}`} />
                    <span>{item.fileName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* NETPLAY BANNER IF IN 1v1 OR 2v2 ROOM */}
          {(netplayRole !== 'solo' || sentInviteNotice) && (
            <div className="bg-blue-950 border-2 border-blue-400 text-white p-3.5 rounded-xs flex items-center justify-between flex-wrap gap-3 shadow-md">
              <div className="flex items-center gap-2.5">
                <Radio className="w-5 h-5 text-cyan-400 animate-pulse shrink-0" />
                <div>
                  <div className="text-xs font-mono font-black uppercase text-cyan-300">
                    {netplayRole === 'host'
                      ? `Hosting Online Match Room — P1 Host (${netplayOpponentName || 'Open for P2 / P3 / P4'})`
                      : `Connected as Player ${netplaySlot + 1} (Port ${netplaySlot + 1}) vs ${netplayOpponentName}`}
                  </div>
                  <div className="text-[11px] text-slate-300">
                    {sentInviteNotice || 'Up to 4 players (P1, P2, P3, P4) can play 2-on-2 via EA 4-Way Play!'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {netplayRole === 'guest' && (
                  <div className="flex items-center gap-1 bg-black/50 border border-blue-400/50 px-2 py-1 rounded text-[10px] font-mono">
                    <span className="text-slate-300 mr-1">PORT:</span>
                    {[1, 2, 3].map(s => (
                      <button
                        key={s}
                        onClick={() => {
                          setNetplaySlot(s);
                          iframeRef.current?.contentWindow?.postMessage(
                            { type: 'NHL95_SET_SLOT', slot: s },
                            '*'
                          );
                        }}
                        className={`px-1.5 py-0.5 rounded font-black cursor-pointer ${
                          netplaySlot === s
                            ? 'bg-amber-400 text-black'
                            : 'bg-blue-900 text-slate-200 hover:bg-blue-800'
                        }`}
                      >
                        P{s + 1}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={handleLeaveNetplayRoom}
                  className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white font-mono text-[10px] font-black uppercase rounded-xs cursor-pointer"
                >
                  Leave Room
                </button>
              </div>
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
          {/* TAB 1: ARENA ICE (PRE-GAME SELECTOR OR LIVE EMULATORJS CANVAS)    */}
          {/* ================================================================= */}
          <div className={activeArenaTab === 'ice' ? 'block' : 'hidden'}>
            <div
              ref={iceContainerRef}
              className="bg-black border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] relative overflow-hidden flex flex-col"
            >
              <div className="aspect-[4/3] w-full flex-1 bg-black relative">
                {emulatorIframeSrc ? (
                  <iframe
                    ref={iframeRef}
                    key={emulatorIframeSrc}
                    src={emulatorIframeSrc}
                    onLoad={() => pushControllerConfigToIframe(controllerConfig)}
                    title={`NHL 95 Emulator - ${activeRomTitle}`}
                    className="w-full h-full border-0"
                    allow="autoplay; fullscreen; gamepad"
                    allowFullScreen
                  />
                ) : (
                  /* PRE-GAME SELECTION SCREEN (NO AUTO-START) */
                  <div className="w-full h-full bg-gradient-to-b from-[#0b1320] via-[#060a10] to-black text-white p-5 sm:p-8 flex flex-col justify-between overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3 gap-2">
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-black">
                          DARKSIDE OF 95 • THE CLASSIC COLLECTION
                        </div>
                        <div className="text-lg sm:text-2xl font-black font-serif uppercase tracking-tight text-white">
                          Select Your ROM Cartridge &amp; How to Play
                        </div>
                      </div>
                      <span className="border border-slate-600 text-slate-300 font-mono text-[10px] uppercase px-2.5 py-1 rounded-xs shrink-0">
                        SEGA GENESIS
                      </span>
                    </div>

                    {/* Bucket ROM Selector Grid Inside the Screen */}
                    <div className="my-4">
                      <div className="text-[11px] font-mono uppercase text-slate-400 font-bold mb-2 flex items-center justify-between">
                        <span>1. Choose a ROM from your &ldquo;roms&rdquo; Bucket ({bucketRomItems.length} Available):</span>
                        <span className="text-amber-400">Selected: {localRomTitle || resolvedRomFileName || 'W16.zip'}</span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 max-h-44 overflow-y-auto pr-1">
                        {bucketRomItems.map(item => {
                          const active = item.romId === selectedRom.id && !localRomObjectUrl;
                          return (
                            <button
                              key={item.fileName}
                              onClick={() => {
                                if (typeof window !== 'undefined') (window as any).__NHL95_LOCAL_FILE = null;
                                setLocalRomObjectUrl(null);
                                setLocalRomTitle(null);
                                setSelectedRomId(item.romId);
                              }}
                              className={`p-2 rounded-xs border text-left font-mono transition cursor-pointer ${
                                active
                                  ? 'bg-amber-500 text-black border-amber-300 font-black shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                                  : 'bg-slate-900/90 hover:bg-slate-800 text-white border-slate-700'
                              }`}
                            >
                              <div className="text-xs font-black truncate">{item.fileName}</div>
                              <div className={`text-[9px] truncate ${active ? 'text-black/80 font-bold' : 'text-slate-400'}`}>
                                {item.base === '1909' ? '1909 NHA' : `Season ${item.base.toUpperCase()}`}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Selected ROM Summary & Launch Buttons */}
                    <div className="bg-slate-900/90 border border-slate-700 p-4 rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="text-[10px] font-mono uppercase text-emerald-400 font-bold">
                          READY ON DECK • {localRomTitle || resolvedRomFileName}
                        </div>
                        <div className="text-base sm:text-lg font-black font-serif uppercase text-white">
                          {activeRomTitle}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          {selectedRom.subtitle}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 flex-wrap">
                        <button
                          onClick={() => {
                            setNetplayRole('solo');
                            setHasLaunchedGame(true);
                          }}
                          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-black uppercase rounded-xs cursor-pointer flex items-center gap-1.5 shadow-md transition"
                        >
                          <Play className="w-4 h-4 fill-black" />
                          <span>Start Solo vs CPU</span>
                        </button>
                        <button
                          onClick={() => handleHostOpenRoom(false)}
                          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-black uppercase rounded-xs cursor-pointer flex items-center gap-1.5 shadow-md transition"
                        >
                          <Users className="w-4 h-4" />
                          <span>Host 1v1 (2P)</span>
                        </button>
                        <button
                          onClick={() => handleHostOpenRoom(true)}
                          className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-black uppercase rounded-xs cursor-pointer flex items-center gap-1.5 shadow-md transition"
                        >
                          <Users className="w-4 h-4" />
                          <span>Host 2v2 (4P)</span>
                        </button>
                      </div>
                    </div>
                  </div>
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
                  {hasLaunchedGame && (
                    <button
                      onClick={() => {
                        setHasLaunchedGame(false);
                        setEmulatorRunning(false);
                      }}
                      className="bg-red-700 hover:bg-red-600 text-white px-2.5 py-1 text-[11px] font-bold uppercase rounded-xs cursor-pointer"
                    >
                      Change ROM / Stop Game
                    </button>
                  )}
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
                    onClick={handleToggleFullscreen}
                    className="bg-amber-500 hover:bg-amber-400 text-black px-3 py-1 text-[11px] font-black uppercase rounded-xs cursor-pointer flex items-center gap-1 shadow-xs"
                    title="Toggle Fullscreen for Host or Joining Coach (ESC to exit)"
                  >
                    <Tv className="w-3.5 h-3.5" />
                    <span>Fullscreen</span>
                  </button>
                  <button
                    onClick={handleSendStateToDiscord}
                    disabled={isSendingToDiscord}
                    className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-3 py-1 text-[11px] font-black uppercase rounded-xs cursor-pointer flex items-center gap-1 shadow-xs"
                    title="Send the live .state file directly to the Discord Save State channel (works for both Host and Guest coaches!)"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSendingToDiscord ? 'Sending...' : 'Send .State to Discord'}</span>
                  </button>
                  <button
                    onClick={handleCaptureLiveBoxscore}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 text-[11px] font-black uppercase rounded-xs cursor-pointer flex items-center gap-1 shadow-xs"
                    title="Capture live boxscore from the match (works for both Host and Guest coaches!)"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Capture Live Boxscore</span>
                  </button>
                </div>
              </div>
            </div>

            {/* LIVE 95-AI NEURAL CPU TELEMETRY & ADAPTATION BAR (WHEN PLAYING VS AI) */}
            {netplayRole === 'solo' && (
              <div className="mt-3 bg-gradient-to-r from-[#091322] via-[#111e34] to-[#091322] border-2 border-black text-white p-3.5 shadow-[3px_3px_0px_rgba(0,0,0,1)]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-mono text-xs font-black flex flex-col items-center justify-center shrink-0">
                      <span>95-AI</span>
                      <span className="text-[8px] text-amber-300">
                        GEN {arenaRecordsData?.aiModel?.generation || 1}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-black uppercase text-cyan-300">
                          🧠 95-AI Neural CPU (Adaptive Learning Engine)
                        </span>
                        <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 px-1.5 py-0.2 rounded font-mono text-[10px] font-bold">
                          ELO {arenaRecordsData?.aiModel?.eloRating || 1520}
                        </span>
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded font-mono text-[10px] font-bold">
                          {liveAiTelemetry
                            ? `Counter: ${liveAiTelemetry.activeCounter}`
                            : arenaRecordsData?.aiModel?.coachProfiles?.[myDisplayName]?.aiCounterStrategy ||
                              'Learning Coach Tendencies...'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300 font-mono mt-0.5">
                        {liveAiTelemetry ? (
                          <span>
                            Detected Style: <strong className="text-amber-300">{liveAiTelemetry.detectedPlaystyle}</strong>{' '}
                            &bull; 1T Combos: <strong>{liveAiTelemetry.oneTimerInputCombos}</strong> &bull; Rush Bursts:{' '}
                            <strong>{liveAiTelemetry.rushBurstCount}</strong> &bull; Cross-Ice:{' '}
                            <strong>{liveAiTelemetry.eastWestCrosses}</strong>
                          </span>
                        ) : (
                          <span>
                            Scouts your Pass&rarr;Shot one-timer cadence, rush bursts &amp; zone cycle in real time to adapt defense &amp; counter-attacks.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <label
                      className="flex items-center gap-1.5 bg-black/60 border border-cyan-500/50 px-2.5 py-1.5 rounded text-[10px] font-mono font-bold text-cyan-200 cursor-pointer"
                      title="When enabled during gameplay, the 95-AI Neural Bot directly drives Port 2 with 60Hz adaptive controller inputs!"
                    >
                      <input
                        type="checkbox"
                        checked={aiBotPort2Takeover}
                        onChange={e => setAiBotPort2Takeover(e.target.checked)}
                        className="accent-amber-400"
                      />
                      <span>P2 Neural Bot Driver</span>
                    </label>
                    <button
                      onClick={() => setActiveArenaTab('records')}
                      className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-black font-mono text-[10px] font-black uppercase rounded-xs cursor-pointer flex items-center gap-1"
                    >
                      <Trophy className="w-3 h-3" />
                      <span>Records &amp; AI Lab</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ================================================================= */}
          {/* TAB 2: PICK AN OPPONENT — LOCKER ROOM LOBBY (KING OF 94 STYLE)    */}
          {/* ================================================================= */}
          {activeArenaTab === 'lobby' && (
            <div className="bg-white border-2 border-black p-4 sm:p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              <div className="border-b border-slate-200 pb-4 mb-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 font-sans">
                      Pick an opponent
                    </h2>
                    <p className="text-xs font-bold text-slate-700 mt-1">
                      {onlinePlayers.length || 1} human player{onlinePlayers.length === 1 ? '' : 's'} online &bull;{' '}
                      {availableOpponentsCount} available human opponent{availableOpponentsCount === 1 ? '' : 's'} &bull;{' '}
                      95-AI Neural CPU always available
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveArenaTab('ice')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white border-2 border-black font-mono text-xs font-black uppercase rounded-xs cursor-pointer flex items-center gap-1.5 shadow-[2px_2px_0px_rgba(0,0,0,1)] transition"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Return to Game</span>
                  </button>
                </div>

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
                  Choose <strong>Play</strong> to challenge a live coach head-to-head, or click <strong>Play 95-AI CPU</strong> below to play against the adaptive learning AI.
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
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() =>
                                    handleJoinMatchRoom(player.peerId, player.coachName, player.roomId!, player.preferredRomId, 1)
                                  }
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-xs font-bold rounded cursor-pointer"
                                >
                                  Join P2
                                </button>
                                <button
                                  onClick={() =>
                                    handleJoinMatchRoom(player.peerId, player.coachName, player.roomId!, player.preferredRomId, 2)
                                  }
                                  className="px-2.5 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white font-mono text-xs font-bold rounded cursor-pointer"
                                  title="Join as Player 3 (2-on-2)"
                                >
                                  P3
                                </button>
                                <button
                                  onClick={() =>
                                    handleJoinMatchRoom(player.peerId, player.coachName, player.roomId!, player.preferredRomId, 3)
                                  }
                                  className="px-2.5 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white font-mono text-xs font-bold rounded cursor-pointer"
                                  title="Join as Player 4 (2-on-2)"
                                >
                                  P4
                                </button>
                              </div>
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
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleHostOpenRoom(false)}
                              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-mono text-xs font-bold rounded cursor-pointer"
                            >
                              Host 1v1
                            </button>
                            <button
                              onClick={() => handleHostOpenRoom(true)}
                              className="px-3 py-1.5 bg-cyan-900 hover:bg-cyan-800 text-cyan-300 font-mono text-xs font-bold rounded cursor-pointer"
                            >
                              Host 2v2
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* ADAPTIVE LEARNING 95-AI NEURAL CPU ROW */}
                <div className="py-4 px-3 bg-gradient-to-r from-slate-900 via-[#0f1d33] to-slate-900 text-white flex items-center justify-between flex-wrap gap-3 rounded-xs my-1">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
                    <div className="w-10 h-10 rounded bg-cyan-500/20 text-cyan-300 font-mono font-black text-xs flex flex-col items-center justify-center border border-cyan-400 shrink-0">
                      <span>95-AI</span>
                      <span className="text-[8px] text-amber-300">
                        G{arenaRecordsData?.aiModel?.generation || 1}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-sm text-white">🧠 95-AI Neural CPU</span>
                        <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 text-[10px] font-mono font-bold px-2 py-0.2 rounded-full">
                          Adaptive Learning AI &bull; ELO {arenaRecordsData?.aiModel?.eloRating || 1520}
                        </span>
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-400/50 text-[10px] font-mono font-bold px-2 py-0.2 rounded-full">
                          {arenaRecordsData?.aiModel?.totalGamesLearned || arenaRecordsData?.totalGamesAnalyzed || 0} Games Learned
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300 mt-0.5 font-mono">
                        Scouting Report ({myDisplayName}):{' '}
                        <strong className="text-amber-300">
                          {arenaRecordsData?.aiModel?.coachProfiles?.[myDisplayName]?.preferredTactic || 'Adaptive All-Around'}
                        </strong>{' '}
                        &rarr; Active AI Counter:{' '}
                        <strong className="text-emerald-300">
                          {arenaRecordsData?.aiModel?.coachProfiles?.[myDisplayName]?.aiCounterStrategy || 'Hybrid Slot & Rush Defense'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setActiveArenaTab('records')}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 font-mono text-xs font-bold rounded cursor-pointer"
                    >
                      AI Brain &amp; Records
                    </button>
                    <button
                      onClick={() => {
                        handleLeaveNetplayRoom();
                        setHasLaunchedGame(true);
                        setActiveArenaTab('ice');
                      }}
                      className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-black font-mono text-xs font-black uppercase rounded cursor-pointer shadow-2xs"
                    >
                      Play 95-AI CPU
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Lobby Footer Buttons (Return to Game / Refresh Players / Locker Room Chat) */}
              <div className="mt-4 flex items-center justify-between flex-wrap gap-3 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setActiveArenaTab('ice')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded cursor-pointer flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Return to Game</span>
                  </button>
                  <button
                    onClick={refreshBucketFiles}
                    className="px-4 py-2 border border-slate-300 hover:border-black bg-white text-slate-800 font-bold rounded cursor-pointer"
                  >
                    Refresh players
                  </button>
                </div>
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
          {/* TAB 2B: ALL-TIME ARENA RECORDS, COACH TRACKER & ADAPTIVE AI BRAIN */}
          {/* ================================================================= */}
          {(activeArenaTab === 'records' || activeArenaTab === 'lobby' || activeArenaTab === 'ice') && (
            <div className="space-y-6">
              {/* 1. ADAPTIVE 95-AI NEURAL CPU BRAIN LAB */}
              <div className="bg-neutral-950 border-2 border-black text-white p-4 sm:p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-neutral-800 pb-4 mb-4">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-black">
                      NEURAL TELEMETRY &amp; REINFORCEMENT ENGINE
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black uppercase font-serif text-white">
                      🧠 95-AI Neural CPU — Adaptive Learning Lab
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Learns from every official league &amp; Arena game plus real-time 60Hz controller inputs to counter each coach&apos;s favorite tactics.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={refreshArenaRecords}
                      disabled={isLoadingRecords}
                      className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-slate-200 border border-neutral-600 font-mono text-xs font-bold uppercase rounded-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRecords ? 'animate-spin' : ''}`} />
                      <span>Refresh Records</span>
                    </button>
                    <button
                      onClick={() => {
                        handleLeaveNetplayRoom();
                        setHasLaunchedGame(true);
                        setActiveArenaTab('ice');
                      }}
                      className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-black font-mono text-xs font-black uppercase rounded-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-black" />
                      <span>Challenge 95-AI Now</span>
                    </button>
                  </div>
                </div>

                {/* AI Summary Metrics Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 font-mono">
                  <div className="bg-[#0d131f] border border-cyan-500/40 p-3 rounded-xs">
                    <div className="text-[10px] uppercase text-cyan-400 font-bold">NEURAL GENERATION</div>
                    <div className="text-xl font-black text-white mt-0.5">
                      GEN {arenaRecordsData?.aiModel?.generation || 1}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {arenaRecordsData?.totalGamesAnalyzed || 0} Total Games Analyzed
                    </div>
                  </div>
                  <div className="bg-[#0d131f] border border-amber-500/40 p-3 rounded-xs">
                    <div className="text-[10px] uppercase text-amber-400 font-bold">AI ELO RATING</div>
                    <div className="text-xl font-black text-amber-300 mt-0.5">
                      {arenaRecordsData?.aiModel?.eloRating || 1520}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Record: {arenaRecordsData?.aiModel?.aiWins || 0}W - {arenaRecordsData?.aiModel?.aiLosses || 0}L -{' '}
                      {arenaRecordsData?.aiModel?.aiTies || 0}T
                    </div>
                  </div>
                  <div className="bg-[#0d131f] border border-emerald-500/40 p-3 rounded-xs">
                    <div className="text-[10px] uppercase text-emerald-400 font-bold">SCOUTING DOSSIERS</div>
                    <div className="text-xl font-black text-emerald-300 mt-0.5">
                      {Object.keys(arenaRecordsData?.aiModel?.coachProfiles || {}).length ||
                        arenaRecordsData?.coachLeaderboard?.length ||
                        0}{' '}
                      Coaches
                    </div>
                    <div className="text-[10px] text-slate-400">Individual Playstyle Profiles</div>
                  </div>
                  <div className="bg-[#0d131f] border border-purple-500/40 p-3 rounded-xs">
                    <div className="text-[10px] uppercase text-purple-300 font-bold">YOUR ACTIVE COUNTER</div>
                    <div className="text-xs font-black text-white mt-1 truncate">
                      {liveAiTelemetry?.activeCounter ||
                        arenaRecordsData?.aiModel?.coachProfiles?.[myDisplayName]?.aiCounterStrategy ||
                        'Hybrid Slot & Rush Defense'}
                    </div>
                    <div className="text-[10px] text-amber-300 truncate mt-0.5">
                      Style:{' '}
                      {liveAiTelemetry?.detectedPlaystyle ||
                        arenaRecordsData?.aiModel?.coachProfiles?.[myDisplayName]?.preferredTactic ||
                        'Balanced Attack'}
                    </div>
                  </div>
                </div>

                {/* Neural Weights Bars */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-[#090d14] border border-neutral-800 p-3.5 rounded-xs font-mono text-xs">
                  {[
                    {
                      label: '1-Timer Pass Intercept',
                      val:
                        liveAiTelemetry?.weights?.oneTimerDefense ??
                        arenaRecordsData?.aiModel?.coachProfiles?.[myDisplayName]?.counterWeights?.oneTimerDefense ??
                        arenaRecordsData?.aiModel?.weights?.oneTimerDefense ??
                        0.62,
                      color: 'bg-amber-400'
                    },
                    {
                      label: '1-3-1 Breakaway Trap',
                      val:
                        liveAiTelemetry?.weights?.breakawayTrap ??
                        arenaRecordsData?.aiModel?.coachProfiles?.[myDisplayName]?.counterWeights?.breakawayTrap ??
                        arenaRecordsData?.aiModel?.weights?.breakawayTrap ??
                        0.6,
                      color: 'bg-cyan-400'
                    },
                    {
                      label: 'Forecheck Aggression',
                      val:
                        liveAiTelemetry?.weights?.forecheckAggression ??
                        arenaRecordsData?.aiModel?.coachProfiles?.[myDisplayName]?.counterWeights?.forecheckAggression ??
                        arenaRecordsData?.aiModel?.weights?.forecheckAggression ??
                        0.58,
                      color: 'bg-red-400'
                    },
                    {
                      label: 'Faceoff Draw Timing',
                      val:
                        liveAiTelemetry?.weights?.faceoffCounter ??
                        arenaRecordsData?.aiModel?.coachProfiles?.[myDisplayName]?.counterWeights?.faceoffCounter ??
                        arenaRecordsData?.aiModel?.weights?.faceoffCounter ??
                        0.57,
                      color: 'bg-emerald-400'
                    },
                    {
                      label: 'High-Slot Lockdown',
                      val:
                        liveAiTelemetry?.weights?.slotLockdown ??
                        arenaRecordsData?.aiModel?.coachProfiles?.[myDisplayName]?.counterWeights?.slotLockdown ??
                        arenaRecordsData?.aiModel?.weights?.slotLockdown ??
                        0.64,
                      color: 'bg-purple-400'
                    }
                  ].map(wItem => {
                    const pct = Math.min(99, Math.max(25, Math.round(Number(wItem.val) * 100)));
                    return (
                      <div key={wItem.label} className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-300 truncate">{wItem.label}</span>
                          <span className="text-white font-black">{pct}%</span>
                        </div>
                        <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                          <div className={`h-full ${wItem.color}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. ALL-TIME ARENA RECORDS HALL OF FAME (MOST GOALS, FASTEST GOALS, MOST WINS, ETC.) */}
              <div className="bg-white border-2 border-black p-4 sm:p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4 flex-wrap gap-2">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-amber-700 font-black">
                      ALL-TIME ARENA &amp; LEAGUE BOOK OF RECORDS
                    </div>
                    <h3 className="text-lg sm:text-xl font-black uppercase font-serif text-black flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-amber-500" />
                      <span>All-Time Arena Records (Fastest Goals, Most Wins, Single-Game Highs)</span>
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-600 font-bold">
                    Automatically updated from every game &amp; save state
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    arenaRecordsData?.allTimeRecords?.mostWinsCareer,
                    arenaRecordsData?.allTimeRecords?.mostGoalsCareer,
                    arenaRecordsData?.allTimeRecords?.mostGoalsSingleGame,
                    arenaRecordsData?.allTimeRecords?.mostCombinedGoalsGame,
                    arenaRecordsData?.allTimeRecords?.fastestGoal,
                    arenaRecordsData?.allTimeRecords?.fastestTwoGoals,
                    arenaRecordsData?.allTimeRecords?.fastestThreeGoals,
                    arenaRecordsData?.allTimeRecords?.fastestOvertimeGoal,
                    arenaRecordsData?.allTimeRecords?.mostChecksSingleGame,
                    arenaRecordsData?.allTimeRecords?.mostOneTimersSingleGame,
                    arenaRecordsData?.allTimeRecords?.biggestBlowout,
                    arenaRecordsData?.allTimeRecords?.mostShutoutsCareer
                  ]
                    .filter(Boolean)
                    .map((rec: any, idx: number) => (
                      <div
                        key={idx}
                        className="border-2 border-black bg-[#faf8f5] p-3.5 rounded-xs flex flex-col justify-between shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-[10px] font-mono font-black uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-xs">
                              {rec.category}
                            </span>
                            {rec.seasonLabel && (
                              <span className="text-[9px] font-mono text-slate-500 font-bold">
                                {rec.seasonLabel}
                              </span>
                            )}
                          </div>
                          <div className="text-xl font-black font-mono text-black my-1">
                            {rec.valueLabel}
                          </div>
                          <div className="text-xs font-bold text-blue-900 font-sans">
                            🏆 {rec.holderCoach}
                            {rec.holderTeam ? ` (${rec.holderTeam})` : ''}
                          </div>
                        </div>
                        <div className="text-[11px] font-mono text-slate-600 mt-2 pt-1.5 border-t border-slate-200">
                          {rec.detail}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* 3. ALL COACHES CAREER RECORD TRACKING TABLE */}
              <div className="bg-white border-2 border-black p-4 sm:p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b-2 border-black pb-3 mb-4">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-blue-800 font-black">
                      OFFICIAL COACH RECORD TRACKING
                    </div>
                    <h3 className="text-lg sm:text-xl font-black uppercase font-serif text-black">
                      All Coaches Record Leaderboard ({arenaRecordsData?.coachLeaderboard?.length || 0} Coaches)
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={coachSearchFilter}
                        onChange={e => setCoachSearchFilter(e.target.value)}
                        placeholder="Search coach or team..."
                        className="pl-8 pr-3 py-1.5 text-xs bg-white border border-black rounded-xs font-mono"
                      />
                    </div>
                    <select
                      value={coachSortField}
                      onChange={e => setCoachSortField(e.target.value as any)}
                      className="px-2.5 py-1.5 text-xs bg-neutral-900 text-amber-400 border border-black font-mono font-bold rounded-xs cursor-pointer"
                    >
                      <option value="points">Sort: Points (PTS)</option>
                      <option value="wins">Sort: Most Wins (W)</option>
                      <option value="goalsFor">Sort: Most Goals (GF)</option>
                      <option value="winPct">Sort: Win %</option>
                      <option value="gpg">Sort: Goals Per Game (GPG)</option>
                      <option value="checks">Sort: Body Checks</option>
                      <option value="oneTimerGoals">Sort: One-Timer Goals</option>
                      <option value="shutouts">Sort: Shutouts (SO)</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[540px] overflow-y-auto border border-black">
                  <table className="w-full text-left border-collapse font-mono text-xs">
                    <thead className="bg-neutral-950 text-amber-400 sticky top-0 z-10 text-[10px] uppercase">
                      <tr>
                        <th className="py-2.5 px-2.5 border-b border-neutral-800">#</th>
                        <th className="py-2.5 px-2.5 border-b border-neutral-800">Coach</th>
                        <th className="py-2.5 px-2 border-b border-neutral-800 text-center">GP</th>
                        <th className="py-2.5 px-2 border-b border-neutral-800 text-center">W-L-T-OTL</th>
                        <th className="py-2.5 px-2 border-b border-neutral-800 text-center">PTS</th>
                        <th className="py-2.5 px-2 border-b border-neutral-800 text-center">WIN%</th>
                        <th className="py-2.5 px-2 border-b border-neutral-800 text-center">GF</th>
                        <th className="py-2.5 px-2 border-b border-neutral-800 text-center">GA</th>
                        <th className="py-2.5 px-2 border-b border-neutral-800 text-center">DIFF</th>
                        <th className="py-2.5 px-2 border-b border-neutral-800 text-center">GPG</th>
                        <th className="py-2.5 px-2 border-b border-neutral-800 text-center">SH%</th>
                        <th className="py-2.5 px-2 border-b border-neutral-800 text-center">CHK</th>
                        <th className="py-2.5 px-2 border-b border-neutral-800 text-center">1T G</th>
                        <th className="py-2.5 px-2 border-b border-neutral-800 text-center">SO</th>
                        <th className="py-2.5 px-2.5 border-b border-neutral-800 text-center">Fastest G</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(arenaRecordsData?.coachLeaderboard || [])
                        .filter((c: any) => {
                          const q = coachSearchFilter.trim().toLowerCase();
                          if (!q) return true;
                          return (
                            c.coachName.toLowerCase().includes(q) ||
                            (c.favoriteTeam || '').toLowerCase().includes(q)
                          );
                        })
                        .slice()
                        .sort((a: any, b: any) => (Number(b[coachSortField]) || 0) - (Number(a[coachSortField]) || 0))
                        .map((c: any, idx: number) => {
                          const isMe = c.coachName.toLowerCase() === myDisplayName.toLowerCase();
                          const diff = (Number(c.goalsFor) || 0) - (Number(c.goalsAgainst) || 0);
                          return (
                            <tr
                              key={c.coachKey || c.coachName}
                              className={
                                isMe
                                  ? 'bg-amber-100/90 font-black'
                                  : idx % 2 === 0
                                  ? 'bg-white hover:bg-slate-50'
                                  : 'bg-[#faf8f5] hover:bg-slate-50'
                              }
                            >
                              <td className="py-2 px-2.5 font-black text-slate-500">{idx + 1}</td>
                              <td className="py-2 px-2.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900">{c.coachName}</span>
                                  {c.favoriteTeam && (
                                    <span className="text-[10px] bg-neutral-900 text-amber-400 px-1.5 py-0.2 rounded font-bold">
                                      {c.favoriteTeam}
                                    </span>
                                  )}
                                  {isMe && (
                                    <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-black">
                                      YOU
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-2 text-center font-bold">{c.gp}</td>
                              <td className="py-2 px-2 text-center font-bold text-slate-800">
                                {c.wins}-{c.losses}-{c.ties}-{c.otl || 0}
                              </td>
                              <td className="py-2 px-2 text-center font-black text-blue-900">{c.points}</td>
                              <td className="py-2 px-2 text-center">{c.winPct}%</td>
                              <td className="py-2 px-2 text-center font-bold text-emerald-800">{c.goalsFor}</td>
                              <td className="py-2 px-2 text-center text-slate-600">{c.goalsAgainst}</td>
                              <td
                                className={`py-2 px-2 text-center font-bold ${
                                  diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-red-700' : 'text-slate-500'
                                }`}
                              >
                                {diff > 0 ? `+${diff}` : diff}
                              </td>
                              <td className="py-2 px-2 text-center">{c.gpg}</td>
                              <td className="py-2 px-2 text-center">{c.shootingPct}%</td>
                              <td className="py-2 px-2 text-center">{c.checks}</td>
                              <td className="py-2 px-2 text-center">{c.oneTimerGoals}</td>
                              <td className="py-2 px-2 text-center font-bold">{c.shutouts}</td>
                              <td className="py-2 px-2.5 text-center text-[11px] text-amber-900 font-bold">
                                {c.fastestGoalLabel || '—'}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
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
                          setHasLaunchedGame(true);
                          setActiveArenaTab('ice');
                        }}
                        className={`w-full py-1.5 font-mono text-[10px] font-black uppercase rounded-xs cursor-pointer flex items-center justify-center gap-1 transition ${
                          isCurrent && hasLaunchedGame
                            ? 'bg-emerald-700 text-white'
                            : 'bg-black hover:bg-amber-500 hover:text-black text-white'
                        }`}
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>{isCurrent && hasLaunchedGame ? 'Currently on Ice' : 'Play This ROM on Ice'}</span>
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
              allGamepads={allGamepads}
              fourPlayerMode={fourPlayerMode}
              onToggleFourPlayerMode={setFourPlayerMode}
              controllerConfig={controllerConfig}
              onChangeConfig={handleUpdateControllerConfig}
              onSaveCoachConfig={handleSaveCoachControllerConfig}
              isSavingConfig={isSavingControllerConfig}
              saveConfigBanner={controllerSaveBanner}
              isLoggedIn={isLoggedIn}
              coachName={myDisplayName}
              onOpenLogin={() =>
                openLoginModal('Sign in as a Coach to save your controller settings to your profile')
              }
              onReturnToGame={() => setActiveArenaTab('ice')}
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
                    onClick={() => setActiveArenaTab('ice')}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-black uppercase px-3.5 py-2 rounded-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Return to Game</span>
                  </button>
                  <button
                    onClick={handleSendStateToDiscord}
                    disabled={isSendingToDiscord}
                    className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-mono text-xs font-black uppercase px-3.5 py-2 rounded-xs cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSendingToDiscord ? 'Sending to Discord...' : 'Send .State to Discord'}</span>
                  </button>
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
                    {parsedGame && (
                      <button
                        onClick={() => recordParsedGameToArenaRecords(parsedGame, true)}
                        disabled={isRecordingArenaMatch}
                        className="bg-amber-400 hover:bg-amber-300 text-black border border-black font-mono text-xs font-black uppercase px-3 py-1.5 rounded-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Trophy className="w-3.5 h-3.5" />
                        <span>
                          {isRecordingArenaMatch
                            ? 'Recording & Training AI...'
                            : 'Record Match & Train 95-AI'}
                        </span>
                      </button>
                    )}
                    <button
                      onClick={handleSendStateToDiscord}
                      disabled={isSendingToDiscord}
                      className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-mono text-xs font-black uppercase px-3 py-1.5 rounded-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSendingToDiscord ? 'Sending...' : 'Send to Discord Save-State Channel'}</span>
                    </button>
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

            {/* COACH RECORD SNAPSHOT & ALL-TIME HIGHLIGHTS */}
            {(() => {
              const myRec = (arenaRecordsData?.coachLeaderboard || []).find(
                (c: any) => c.coachName.toLowerCase() === myDisplayName.toLowerCase()
              );
              return (
                <div className="py-3 border-b border-slate-200 font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase text-slate-500 font-black flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5 text-amber-600" />
                      <span>COACH CAREER RECORD</span>
                    </span>
                    <button
                      onClick={() => setActiveArenaTab('records')}
                      className="text-[10px] text-blue-700 hover:underline font-bold cursor-pointer"
                    >
                      All-Time Records &rarr;
                    </button>
                  </div>
                  {myRec ? (
                    <div className="grid grid-cols-4 gap-1.5 bg-[#faf8f5] border border-slate-200 p-2 rounded-xs text-center">
                      <div>
                        <div className="text-[9px] text-slate-500">W-L-T</div>
                        <div className="font-black text-slate-900">
                          {myRec.wins}-{myRec.losses}-{myRec.ties}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-500">PTS</div>
                        <div className="font-black text-blue-900">{myRec.points}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-500">WIN%</div>
                        <div className="font-black text-emerald-800">{myRec.winPct}%</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-500">GOALS</div>
                        <div className="font-black text-amber-800">{myRec.goalsFor}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 bg-[#faf8f5] border border-slate-200 p-2 rounded-xs">
                      Play a match on the ice or sign in to track your W-L-T, Points, Goals &amp; Fastest Goals!
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="py-3 border-b border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase text-slate-500 font-bold">
                  ACTIVE INPUT DEVICE
                </span>
                <span className="font-mono text-[9px] uppercase bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded font-bold">
                  {controllerConfig.presetName}
                </span>
              </div>
              <div className="font-mono font-bold text-slate-800 truncate">
                {gamepadInfo ? `🎮 ${gamepadInfo}` : '⌨️ Keyboard — No USB controller detected'}
              </div>
              {isLoggedIn && (
                <button
                  onClick={handleSaveCoachControllerConfig}
                  disabled={isSavingControllerConfig}
                  className="w-full mt-1 py-1.5 px-2.5 bg-amber-400 hover:bg-amber-300 text-black border border-black font-mono text-[10px] font-black uppercase rounded-xs cursor-pointer flex items-center justify-center gap-1.5 transition"
                >
                  <CloudUpload className="w-3.5 h-3.5" />
                  <span>
                    {isSavingControllerConfig
                      ? 'Saving Controller...'
                      : `Save Controller Settings (${myDisplayName})`}
                  </span>
                </button>
              )}
              {controllerSaveBanner && (
                <div className="text-[10px] font-mono text-emerald-700 font-bold">
                  ✓ {controllerSaveBanner.text}
                </div>
              )}
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
                onClick={() => setActiveArenaTab('records')}
                className="py-2 px-3 bg-amber-500 hover:bg-amber-400 text-black border border-black font-black uppercase rounded-xs cursor-pointer transition flex items-center justify-center gap-1"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Records &amp; AI</span>
              </button>

              <button
                onClick={() => setActiveArenaTab('controller')}
                className="py-2 px-3 bg-slate-100 hover:bg-black hover:text-white text-black border border-slate-300 font-bold uppercase rounded-xs cursor-pointer transition"
              >
                Controller Setup
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
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleHostOpenRoom(false)}
                  className="text-[10px] font-mono font-black uppercase bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded cursor-pointer"
                >
                  + 1v1
                </button>
                <button
                  onClick={() => handleHostOpenRoom(true)}
                  className="text-[10px] font-mono font-black uppercase bg-cyan-600 hover:bg-cyan-500 text-white px-2 py-1 rounded cursor-pointer"
                >
                  + 2v2
                </button>
              </div>
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
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleJoinMatchRoom(p.peerId, p.coachName, p.roomId!, p.preferredRomId, 1)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] font-black uppercase rounded cursor-pointer"
                          >
                            P2
                          </button>
                          <button
                            onClick={() => handleJoinMatchRoom(p.peerId, p.coachName, p.roomId!, p.preferredRomId, 2)}
                            className="px-2 py-1 bg-cyan-700 hover:bg-cyan-600 text-white font-mono text-[10px] font-black uppercase rounded cursor-pointer"
                          >
                            P3
                          </button>
                          <button
                            onClick={() => handleJoinMatchRoom(p.peerId, p.coachName, p.roomId!, p.preferredRomId, 3)}
                            className="px-2 py-1 bg-cyan-700 hover:bg-cyan-600 text-white font-mono text-[10px] font-black uppercase rounded cursor-pointer"
                          >
                            P4
                          </button>
                        </div>
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
                    setHasLaunchedGame(true);
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
