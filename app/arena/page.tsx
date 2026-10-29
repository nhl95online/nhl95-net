"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Gamepad2,
  Play,
  RotateCcw,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Trophy,
  Search,
  Tv,
  Cpu,
  Volume2,
  VolumeX,
  Maximize2,
  Sliders,
  FileCode,
  ShieldCheck,
  Lock,
  Layers,
  HardDrive,
  Zap,
  ChevronRight,
  Radio,
  Users,
  Eye,
  FolderOpen,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import {
  OFFICIAL_LEAGUE_ROMS,
  HISTORICAL_NHL_ROMS,
  MISC_ROMS,
  SUPABASE_ROMS_URL,
  getRomImageUrl
} from '@/app/roms/roms_data';
import { useCoachAuth } from '@/lib/coach-auth';
import { supabase } from '@/lib/supabase';
import {
  AVAILABLE_SEASONS,
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

function buildArenaCatalog(): ArenaRomItem[] {
  const items: ArenaRomItem[] = [];

  // 1. Official League ROMs (put Active ROMs first, then latest seasons)
  const sortedLeague = [...OFFICIAL_LEAGUE_ROMS].sort((a, b) => {
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;
    if (a.leagueCode === b.leagueCode) return b.seasonNumber - a.seasonNumber;
    return a.league.localeCompare(b.league);
  });

  for (const rom of sortedLeague) {
    let defaultSeasonConfigId = '40'; // W18 default
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
        `${rom.id.toUpperCase()}.bin`,
        `${rom.id.toLowerCase()}.bin`,
        `${rom.id.toUpperCase()}.zip`,
        `${rom.id.toLowerCase()}.zip`,
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
      fileCandidates: [`${rom.year}.bin`, `${rom.year}.zip`, rom.fileName],
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
      fileCandidates: [`${cleanTitle}.bin`, `${cleanTitle}.zip`, rom.fileName],
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

// Ensure any exported save state has the 32-byte RetroArch "RASTATE" header
function ensureRetroArchHeader(raw: Uint8Array): Uint8Array {
  const hasRaHeader =
    raw.length > 32 &&
    raw[0] === 0x52 && // R
    raw[1] === 0x41 && // A
    raw[2] === 0x53 && // S
    raw[3] === 0x54 && // T
    raw[4] === 0x41 && // A
    raw[5] === 0x54 && // T
    raw[6] === 0x45;   // E

  if (hasRaHeader) return raw;

  const out = new Uint8Array(raw.length + 32);
  // Write "RASTATE" + version 1 header
  const magic = [0x52, 0x41, 0x53, 0x54, 0x41, 0x54, 0x45, 0x01];
  for (let i = 0; i < magic.length; i++) {
    out[i] = magic[i];
  }
  out.set(raw, 32);
  return out;
}

// Build isolated HTML document for the EmulatorJS Genesis Plus GX iframe
function buildEmulatorIframeHtml(romUrl: string, gameTitle: string): string {
  const safeTitle = gameTitle.replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const safeUrl = romUrl.replace(/"/g, '&quot;');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #050608;
      overflow: hidden;
      font-family: monospace;
    }
    #game-container {
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  <div id="game-container"></div>
  <script>
    window.EJS_player = "#game-container";
    window.EJS_core = "segaMD";
    window.EJS_gameName = "${safeTitle}";
    window.EJS_gameUrl = "${safeUrl}";
    window.EJS_pathtodata = "https://cdn.emulatorjs.org/stable/data/";
    window.EJS_color = "#f59e0b";
    window.EJS_backgroundColor = "#050608";
    window.EJS_startOnLoaded = true;
    window.EJS_defaultControls = {
      0: {
        0: { value: "x", value2: "BUTTON_1" },     // B (Pass / Switch Player)
        1: { value: "z", value2: "BUTTON_3" },     // A (Dump / Line Change)
        2: { value: "shift", value2: "SELECT" },   // Mode
        3: { value: "enter", value2: "START" },    // Start
        4: { value: "up arrow", value2: "DPAD_UP" },
        5: { value: "down arrow", value2: "DPAD_DOWN" },
        6: { value: "left arrow", value2: "DPAD_LEFT" },
        7: { value: "right arrow", value2: "DPAD_RIGHT" },
        8: { value: "c", value2: "BUTTON_2" },     // C (Shoot / Check / Speed Burst)
        9: { value: "s", value2: "BUTTON_4" },     // Y
        10: { value: "a", value2: "LEFT_TOP_SHOULDER" },  // X
        11: { value: "d", value2: "RIGHT_TOP_SHOULDER" }  // Z
      },
      1: {}
    };

    window.EJS_onGameStart = function() {
      window.parent.postMessage({ type: "NHL95_EJS_STARTED" }, "*");
    };

    window.EJS_onSaveState = function(data) {
      if (data && data.state) {
        window.parent.postMessage({ type: "NHL95_EJS_SAVESTATE", state: data.state }, "*");
      }
    };
  </script>
  <script src="https://cdn.emulatorjs.org/stable/data/loader.js"></script>
</body>
</html>`;
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
  // Map standard gamepad + keyboard to Genesis buttons for visual feedback
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
            <Gamepad2 className="w-4 h-4" /> Sega Genesis 6-Button Diagnostic & Controller Setup
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
        {/* Visual Sega Genesis Controller Diagram */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center bg-[#0d1017] border border-neutral-800 rounded-lg p-6 relative">
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-3">
            SEGA MEGA DRIVE / GENESIS 16-BIT PAD
          </div>

          {/* Controller Shell */}
          <div className="w-full max-w-[440px] bg-gradient-to-b from-neutral-800 to-neutral-900 border-2 border-neutral-600 rounded-[48px] p-6 sm:p-8 shadow-2xl flex items-center justify-between gap-4 relative">
            {/* D-PAD */}
            <div className="relative w-28 h-28 bg-neutral-950 rounded-full border border-neutral-700 flex items-center justify-center shrink-0">
              {/* Up */}
              <div className={`absolute top-2 w-8 h-8 rounded-t flex items-center justify-center text-[10px] font-mono font-black border transition-all ${
                isUp ? 'bg-amber-400 text-black border-white scale-105 shadow-[0_0_12px_#f59e0b]' : 'bg-neutral-800 text-neutral-400 border-neutral-700'
              }`}>▲</div>
              {/* Down */}
              <div className={`absolute bottom-2 w-8 h-8 rounded-b flex items-center justify-center text-[10px] font-mono font-black border transition-all ${
                isDown ? 'bg-amber-400 text-black border-white scale-105 shadow-[0_0_12px_#f59e0b]' : 'bg-neutral-800 text-neutral-400 border-neutral-700'
              }`}>▼</div>
              {/* Left */}
              <div className={`absolute left-2 w-8 h-8 rounded-l flex items-center justify-center text-[10px] font-mono font-black border transition-all ${
                isLeft ? 'bg-amber-400 text-black border-white scale-105 shadow-[0_0_12px_#f59e0b]' : 'bg-neutral-800 text-neutral-400 border-neutral-700'
              }`}>◀</div>
              {/* Right */}
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

            {/* 6 Action Buttons (X Y Z top row, A B C bottom row) */}
            <div className="flex flex-col gap-2.5 shrink-0">
              {/* Top Row: X Y Z */}
              <div className="flex items-center gap-2 justify-end">
                {[
                  { label: 'X', active: isX },
                  { label: 'Y', active: isY },
                  { label: 'Z', active: isZ },
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
              {/* Bottom Row: A B C */}
              <div className="flex items-center gap-2 justify-end">
                {[
                  { label: 'A', active: isA, desc: 'Dump' },
                  { label: 'B', active: isB, desc: 'Pass' },
                  { label: 'C', active: isC, desc: 'Shoot' },
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

          {/* Active Raw Gamepad Readout */}
          {gamepadInfo && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-[10px] font-mono text-slate-400">
              <span>Active Buttons:</span>
              {gamepadButtons.map((pressed, idx) =>
                pressed ? (
                  <span key={idx} className="bg-emerald-500 text-black font-black px-1.5 py-0.5 rounded">
                    B{idx}
                  </span>
                ) : null
              )}
              {!gamepadButtons.some(Boolean) && <span className="text-slate-600">None pressed</span>}
            </div>
          )}
        </div>

        {/* NHL '95 Controls Reference Table */}
        <div className="lg:col-span-5 bg-neutral-900 border border-neutral-800 rounded-lg p-4">
          <div className="text-xs font-mono font-black uppercase text-amber-400 mb-3 border-b border-neutral-800 pb-2">
            NHL &apos;95 Action & Button Mapping
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
              <div className="col-span-6 text-slate-200 font-sans">Shoot / One-Timer / Body Check / Speed Burst</div>
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
          <div className="mt-3 p-2.5 bg-black/60 border border-neutral-800 rounded text-[11px] text-slate-400 font-sans leading-relaxed">
            💡 <strong className="text-white">Custom Remapping:</strong> You can also click the <strong className="text-amber-400">Gamepad Icon</strong> inside the bottom toolbar of the emulator window to customize bindings for Player 1 & Player 2.
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
  const initialRomParam = searchParams.get('rom') || 'w18';

  const { isLoggedIn, currentCoach, openLoginModal } = useCoachAuth();
  const catalog = useMemo(() => buildArenaCatalog(), []);

  // Selected ROM state
  const [selectedRomId, setSelectedRomId] = useState<string>(() => {
    const found = catalog.find(r => r.id.toLowerCase() === initialRomParam.toLowerCase());
    return found ? found.id : catalog[0].id;
  });

  // Update selected ROM if query param changes
  useEffect(() => {
    const param = searchParams.get('rom');
    if (param) {
      const found = catalog.find(r => r.id.toLowerCase() === param.toLowerCase());
      if (found) {
        setSelectedRomId(found.id);
      }
    }
  }, [searchParams, catalog]);

  const selectedRom = useMemo(
    () => catalog.find(r => r.id === selectedRomId) || catalog[0],
    [catalog, selectedRomId]
  );

  // Arena Sub-navigation Tab ('ice' | 'vault' | 'controller' | 'boxscore')
  const [activeArenaTab, setActiveArenaTab] = useState<'ice' | 'vault' | 'controller' | 'boxscore'>('ice');

  // Emulator loading & runtime state
  const [isLaunching, setIsLaunching] = useState<boolean>(false);
  const [emulatorRunning, setEmulatorRunning] = useState<boolean>(false);
  const [resolvedRomUrl, setResolvedRomUrl] = useState<string | null>(null);
  const [resolvedRomFileName, setResolvedRomFileName] = useState<string>('');
  const [romLoadError, setRomLoadError] = useState<string | null>(null);
  const [localRomObjectUrl, setLocalRomObjectUrl] = useState<string | null>(null);
  const [localRomTitle, setLocalRomTitle] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const localRomInputRef = useRef<HTMLInputElement | null>(null);
  const loadStateInputRef = useRef<HTMLInputElement | null>(null);

  // Vault Browser filters
  const [vaultCategory, setVaultCategory] = useState<'all' | 'league' | 'nhl-history' | 'misc'>('all');
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

  // Sync default season parser config when ROM changes
  useEffect(() => {
    if (selectedRom?.defaultSeasonConfigId) {
      setSelectedSeasonConfigId(selectedRom.defaultSeasonConfigId);
    }
  }, [selectedRom]);

  // Fetch teams from Supabase for logos/names in RetroBoxscore
  useEffect(() => {
    async function loadTeams() {
      const { data } = await supabase
        .from('league_teams')
        .select('*, league_coaches(coach_name)');
      if (data) setDbTeams(data);
    }
    loadTeams();
  }, []);

  // Probe Supabase `roms` storage bucket for the selected ROM's candidate filenames
  const launchRomFromVault = useCallback(async (rom: ArenaRomItem) => {
    setIsLaunching(true);
    setEmulatorRunning(false);
    setRomLoadError(null);
    setLocalRomObjectUrl(null);
    setLocalRomTitle(null);

    if (rom.customDownloadUrl) {
      setResolvedRomUrl(rom.customDownloadUrl);
      setResolvedRomFileName(rom.fileCandidates[0] || `${rom.id}.bin`);
      setIsLaunching(false);
      return;
    }

    let matchedUrl: string | null = null;
    let matchedFile = rom.fileCandidates[0];

    for (const candidate of rom.fileCandidates) {
      if (!candidate) continue;
      const checkUrl = `${SUPABASE_ROMS_URL}/${encodeURIComponent(candidate)}`;
      try {
        const res = await fetch(checkUrl, { method: 'HEAD' });
        if (res.ok) {
          matchedUrl = checkUrl;
          matchedFile = candidate;
          break;
        }
      } catch {
        // continue checking next candidate
      }
    }

    if (matchedUrl) {
      setResolvedRomUrl(matchedUrl);
      setResolvedRomFileName(matchedFile);
    } else {
      setResolvedRomUrl(null);
      setRomLoadError(
        `"${rom.title}" (${rom.fileCandidates.join(' / ')}) was not found in the cloud ROMs bucket yet. You can load a local .bin/.zip ROM file from your computer or switch to an active League ROM like W18!`
      );
    }
    setIsLaunching(false);
  }, []);

  // Automatically resolve ROM when selectedRom changes
  useEffect(() => {
    if (selectedRom) {
      launchRomFromVault(selectedRom);
    }
  }, [selectedRom, launchRomFromVault]);

  // Listen for postMessage events from the EmulatorJS iframe
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

  // Re-parse if user switches Season Config dropdown while a state is already loaded
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

  // Download the captured .state file to user's computer (ready for /upload or RetroArch)
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

  // Load a local ROM file (.bin / .md / .gen / .zip) from user's disk into the Arena
  const handleLocalRomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (localRomObjectUrl) URL.revokeObjectURL(localRomObjectUrl);
    const objUrl = URL.createObjectURL(file);
    setLocalRomObjectUrl(objUrl);
    setLocalRomTitle(file.name);
    setRomLoadError(null);
    setEmulatorRunning(false);
    setActiveArenaTab('ice');
  };

  // Upload & Parse an external .state file (and optionally load it into the running emulator!)
  const handleStateFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, loadIntoEmulator = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buf = new Uint8Array(await file.arrayBuffer());
    parseAndDisplayStateBuffer(buf, file.name);

    if (loadIntoEmulator) {
      try {
        const iframeWin = iframeRef.current?.contentWindow as any;
        const ejs = iframeWin?.EJS_emulator;
        if (ejs?.gameManager?.loadState) {
          // Strip 32-byte RASTATE header if raw genesis_plus_gx expects raw state, or try raw
          ejs.gameManager.loadState(buf);
          setActiveArenaTab('ice');
        }
      } catch (err) {
        console.warn('Could not inject state into running emulator:', err);
      }
    } else {
      setActiveArenaTab('boxscore');
    }
    e.target.value = '';
  };

  // Filtered ROM catalog for the Vault Selector
  const filteredCatalog = useMemo(() => {
    return catalog.filter(item => {
      const matchesCat = vaultCategory === 'all' || item.category === vaultCategory;
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
  }, [catalog, vaultCategory, vaultSearch]);

  const activeRomUrl = localRomObjectUrl || resolvedRomUrl;
  const activeRomTitle = localRomTitle || selectedRom.title;

  const iframeSrcDoc = useMemo(() => {
    if (!activeRomUrl) return null;
    return buildEmulatorIframeHtml(activeRomUrl, activeRomTitle);
  }, [activeRomUrl, activeRomTitle]);

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
        onChange={e => handleStateFileUpload(e, false)}
        className="hidden"
      />

      {/* ===================================================================== */}
      {/* 1. KING OF 94 STYLE ARENA HEADER BANNER                               */}
      {/* ===================================================================== */}
      <div className="bg-[#0d1b2a] border-2 border-black text-white shadow-[4px_4px_0px_rgba(0,0,0,1)] mb-5 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 bg-gradient-to-r from-[#09131f] via-[#112236] to-[#09131f]">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Arena Pixel Crest */}
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
                  95 TV • BROWSER EMULATOR
                </span>
                <span>•</span>
                <span>{catalog.length} Playable ROMs in Vault</span>
                <span>•</span>
                <span>1-Click Live Boxscore Capture</span>
              </div>
            </div>
          </div>

          {/* Right Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
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
              title="Extract live save state from the running game and generate an official NHL95 Retro Boxscore"
            >
              <Zap className="w-3.5 h-3.5 fill-black" />
              <span>1-Click Boxscore</span>
            </button>
          </div>
        </div>

        {/* Sub-Navigation Bar (Like King of 94's Arena / Locker Room / Controller / Help tabs) */}
        <div className="bg-[#f8f5ee] text-black px-4 py-2 flex items-center justify-between flex-wrap gap-2 border-t border-black font-mono text-xs">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
            {[
              { id: 'ice', label: '🏒 Arena Ice (Play)', badge: emulatorRunning ? 'LIVE' : undefined },
              { id: 'vault', label: `📚 ROM Vault (${catalog.length})` },
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
            <span>Core: <strong>Genesis Plus GX (60fps)</strong></span>
            <span>•</span>
            <Link href="/roms" className="text-amber-800 hover:underline font-bold">
              Full ROM Repository &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. MAIN TWO-COLUMN ARENA LAYOUT (JUMBOTRON LEFT + COACH CARD RIGHT)   */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT / CENTER COLUMN (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-5">
          {/* KINGS OF THE ARENA / ACTIVE LEAGUES STRIP */}
          <div className="bg-white border-2 border-black p-3 shadow-[3px_3px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2.5 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
              <span>FEATURED ARENA BUILDS — INSTANT PLAY</span>
              <button
                onClick={() => setActiveArenaTab('vault')}
                className="text-amber-700 hover:underline cursor-pointer font-bold"
              >
                Browse All {catalog.length} ROMs &rarr;
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {catalog.slice(0, 4).map(rom => {
                const isSelected = rom.id === selectedRom.id && !localRomObjectUrl;
                return (
                  <button
                    key={rom.id}
                    onClick={() => {
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
                      {rom.isActive && (
                        <span className="text-[8px] font-mono font-bold text-emerald-500 uppercase">● Active</span>
                      )}
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

          {/* PREGAME / LIVE SCOREBOARD JUMBOTRON */}
          <div className="bg-neutral-950 border-2 border-black text-white p-3 sm:p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase text-slate-400 mb-2 px-1">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${emulatorRunning ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                <strong className="text-white">95 TV ARENA FEED</strong> — {emulatorRunning ? 'MATCH IN PROGRESS' : 'READY WHEN YOUR GAME STARTS'}
              </span>
              <span className="text-amber-400 font-bold">{resolvedRomFileName || 'SEGA GENESIS 16-BIT'}</span>
            </div>

            {/* Classic Scoreboard Strip */}
            <div className="grid grid-cols-12 border-2 border-neutral-700 bg-black p-2.5 sm:p-3 items-center gap-2">
              <div className="col-span-4 sm:col-span-5 flex items-center gap-2.5 border-r border-neutral-800 pr-2">
                <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/40 flex items-center justify-center font-mono text-xs font-black text-amber-400 shrink-0">
                  {selectedRom.id.slice(0, 3).toUpperCase()}
                </div>
                <div className="truncate">
                  <div className="text-[9px] font-mono uppercase text-slate-400">LOADED CARTRIDGE</div>
                  <div className="text-xs sm:text-sm font-black uppercase font-mono text-white truncate">
                    {activeRomTitle}
                  </div>
                </div>
              </div>

              <div className="col-span-4 sm:col-span-2 text-center">
                <div className="text-[8px] font-mono uppercase tracking-widest text-amber-400">NHL &apos;95 ARENA</div>
                <div className="text-xs sm:text-sm font-black font-mono uppercase text-emerald-400">
                  {emulatorRunning ? 'ON ICE' : 'PREGAME'}
                </div>
              </div>

              <div className="col-span-4 sm:col-span-5 flex items-center justify-end gap-2.5 border-l border-neutral-800 pl-2 text-right">
                <div className="truncate">
                  <div className="text-[9px] font-mono uppercase text-slate-400">COACH AT THE BENCH</div>
                  <div className="text-xs sm:text-sm font-black uppercase font-mono text-cyan-300 truncate">
                    {isLoggedIn && currentCoach ? currentCoach.coach_name : 'GUEST COACH'}
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
              {isLaunching ? (
                <div className="aspect-[4/3] w-full flex flex-col items-center justify-center bg-[#07090e] text-white p-6 text-center">
                  <RefreshCw className="w-10 h-10 text-amber-400 animate-spin mb-3" />
                  <div className="font-mono text-sm font-black uppercase tracking-wider">
                    Connecting to NHL &apos;95 ROM Vault...
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-1">
                    Probing {selectedRom.title}
                  </div>
                </div>
              ) : romLoadError && !activeRomUrl ? (
                <div className="aspect-[4/3] w-full flex flex-col items-center justify-center bg-[#07090e] text-white p-6 sm:p-10 text-center">
                  <AlertTriangle className="w-12 h-12 text-amber-400 mb-3" />
                  <h3 className="text-lg font-black uppercase font-serif text-white mb-2">
                    ROM Cartridge Not Found in Cloud Bucket
                  </h3>
                  <p className="text-xs text-slate-300 max-w-md mb-6 leading-relaxed">
                    {romLoadError}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={() => setSelectedRomId('w18')}
                      className="bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-black uppercase px-4 py-2.5 rounded-xs cursor-pointer transition"
                    >
                      Launch Active W18 Official ROM
                    </button>
                    <button
                      onClick={() => localRomInputRef.current?.click()}
                      className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 font-mono text-xs font-bold uppercase px-4 py-2.5 rounded-xs cursor-pointer transition"
                    >
                      Load Local .BIN / .ZIP File
                    </button>
                  </div>
                </div>
              ) : (
                <div className="aspect-[4/3] w-full bg-black relative">
                  {iframeSrcDoc && (
                    <iframe
                      ref={iframeRef}
                      key={activeRomUrl || 'empty'}
                      srcDoc={iframeSrcDoc}
                      title={`NHL 95 Emulator - ${activeRomTitle}`}
                      className="w-full h-full border-0"
                      allow="autoplay; fullscreen; gamepad"
                    />
                  )}
                </div>
              )}

              {/* Bottom Emulator Control Bar */}
              <div className="bg-neutral-900 border-t-2 border-black px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-white">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-amber-500 text-black font-black px-2 py-0.5 text-[10px] uppercase rounded-xs">
                    SEGA GENESIS
                  </span>
                  <span className="text-slate-300 text-[11px] truncate max-w-[240px] sm:max-w-xs">
                    {activeRomTitle}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
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
          {/* TAB 2: ROM VAULT SELECTOR (ALL LEAGUE, HISTORICAL & MISC ROMS)    */}
          {/* ================================================================= */}
          {activeArenaTab === 'vault' && (
            <div className="bg-white border-2 border-black p-4 sm:p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black pb-3 mb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-black uppercase font-serif">
                    Select Cartridge From the NHL &apos;95 Vault ({catalog.length} ROMs)
                  </h2>
                  <p className="text-xs text-slate-600">
                    Click any Official League build, Historical NHL Season (1909–Present), or Misc Mashup to boot it immediately on the Arena ice.
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

              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-1.5 flex-wrap font-mono text-xs">
                  {[
                    { id: 'all', label: `All (${catalog.length})` },
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

                <div className="relative min-w-[220px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={vaultSearch}
                    onChange={e => setVaultSearch(e.target.value)}
                    placeholder="Search W18, 1994, Original 6, NBA..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-black rounded-xs font-sans focus:outline-none"
                  />
                </div>
              </div>

              {/* ROM Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[560px] overflow-y-auto pr-1">
                {filteredCatalog.map(item => {
                  const isCurrent = item.id === selectedRom.id && !localRomObjectUrl;
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
                          <span className="font-mono text-[10px] font-bold text-slate-500">
                            {item.year}
                          </span>
                        </div>
                        <h4 className="font-serif text-xs font-black uppercase text-black leading-snug mb-1">
                          {item.title}
                        </h4>
                        {item.rulesSummary && (
                          <div className="text-[9px] font-mono text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded mb-1.5 truncate">
                            {item.rulesSummary}
                          </div>
                        )}
                        <p className="text-[10px] text-slate-600 line-clamp-2 mb-3">
                          {item.description}
                        </p>
                      </div>

                      <button
                        onClick={() => {
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
                        <span>{isCurrent ? 'Currently on Ice — Return' : 'Load Cartridge on Ice'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 3: CONTROLLER SETUP & INTERACTIVE TESTER                      */}
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
          {/* TAB 4: 1-CLICK BOXSCORE & SAVE STATE ANALYZER LAB                 */}
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

              {/* Season Roster Mapping Selector & Actions */}
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
                    Play a period or match on the Arena Ice and click <strong>&ldquo;1-Click Boxscore&rdquo;</strong> at any time, or upload an existing <code className="font-mono">.state</code> file from your computer to preview the official WN95HL boxscore.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* RIGHT SIDEBAR (4 cols on lg) — KING OF 94 STYLE PLAYER CARD & STEPS */}
        {/* =================================================================== */}
        <div className="lg:col-span-4 space-y-5">
          {/* COACH PROFILE CARD (Inspired by King of 94's right-hand player card) */}
          <div className="bg-white border-2 border-black p-4 sm:p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-3.5 pb-3.5 border-b border-slate-200">
              <div className="w-14 h-14 rounded-xs bg-neutral-900 border-2 border-black flex items-center justify-center text-amber-400 font-serif font-black text-xl shrink-0 shadow-xs">
                {isLoggedIn && currentCoach ? currentCoach.coach_name.slice(0, 2).toUpperCase() : '95'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
                  {isLoggedIn ? 'VERIFIED LEAGUE COACH' : 'ARENA VISITOR'}
                </div>
                <div className="text-lg font-black font-serif uppercase truncate text-black">
                  {isLoggedIn && currentCoach ? currentCoach.coach_name : 'Guest Skater'}
                </div>
                <div className="text-xs font-mono text-emerald-700 font-bold flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Online in Arena</span>
                </div>
              </div>
            </div>

            {/* Controller Detection Readout */}
            <div className="py-3 border-b border-slate-200 text-xs">
              <div className="font-mono text-[10px] uppercase text-slate-500 font-bold mb-1">
                ACTIVE INPUT DEVICE
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-slate-800 truncate">
                  {gamepadInfo ? `🎮 ${gamepadInfo}` : '⌨️ Keyboard — No USB controller detected'}
                </span>
              </div>
            </div>

            {/* Action Buttons Grid (Just like King of 94's View Profile / Controller Setup / Test Controller) */}
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

              <button
                onClick={handleCaptureLiveBoxscore}
                className="py-2 px-3 bg-amber-100 hover:bg-amber-500 text-amber-950 border border-amber-400 font-black uppercase rounded-xs cursor-pointer transition"
              >
                Live Boxscore
              </button>
            </div>
          </div>

          {/* PRE-GAME: 3 EASY STEPS (Inspired by King of 94's "3 EASY STEPS" panel) */}
          <div className="bg-[#f8f4e8] border-2 border-black p-4 sm:p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
            <div className="text-[10px] font-mono font-black uppercase tracking-widest text-blue-800">
              PRE-GAME GUIDE
            </div>
            <h3 className="text-xl font-black uppercase font-serif tracking-tight text-black mb-4">
              3 Easy Steps
            </h3>

            {/* Step 1 */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 bg-blue-800 text-white font-mono text-xs font-black flex items-center justify-center rounded-xs">
                  1
                </span>
                <span className="font-bold text-xs uppercase font-mono">Choose How &amp; What to Play</span>
              </div>
              <div className="space-y-2 pl-8">
                <button
                  onClick={() => setActiveArenaTab('vault')}
                  className="w-full text-left p-2.5 bg-white hover:bg-amber-50 border border-slate-300 rounded-xs cursor-pointer transition block"
                >
                  <div className="font-bold text-xs text-black flex items-center justify-between">
                    <span>Browse All {catalog.length} Vault ROMs</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    W18, O01 Original Six, 1909–2026 NHL, or Misc Mods
                  </div>
                </button>

                <button
                  onClick={() => localRomInputRef.current?.click()}
                  className="w-full text-left p-2.5 bg-white hover:bg-amber-50 border border-slate-300 rounded-xs cursor-pointer transition block"
                >
                  <div className="font-bold text-xs text-black flex items-center justify-between">
                    <span>Load Custom Local ROM (.bin/.zip)</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Test your own custom roster edits right in the browser
                  </div>
                </button>
              </div>
            </div>

            {/* Step 2 */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
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
                  <div className="font-bold text-xs text-black flex items-center justify-between">
                    <span>Open Interactive Gamepad Tester</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Works automatically with Xbox, PlayStation, 8BitDo &amp; USB Sega controllers
                  </div>
                </button>
              </div>
            </div>

            {/* Step 3 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 bg-blue-800 text-white font-mono text-xs font-black flex items-center justify-center rounded-xs">
                  3
                </span>
                <span className="font-bold text-xs uppercase font-mono">Capture Boxscore / Save State</span>
              </div>
              <div className="pl-8">
                <button
                  onClick={handleCaptureLiveBoxscore}
                  className="w-full text-left p-2.5 bg-white hover:bg-emerald-50 border border-slate-300 rounded-xs cursor-pointer transition block"
                >
                  <div className="font-bold text-xs text-emerald-900 flex items-center justify-between">
                    <span>1-Click Live Boxscore Extraction</span>
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Instantly reads Genesis RAM to generate the full WN95HL boxscore &amp; downloadable <code className="font-mono">.state</code> file
                  </div>
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
