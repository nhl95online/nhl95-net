"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Download, HardDrive, ShieldCheck, Check, Copy, ExternalLink, FileArchive, Music, Cpu, Sparkles } from 'lucide-react';

interface RomItem {
  id: string;
  league: string;
  seasonName: string;
  fileName: string;
  fileSize: string;
  md5: string;
  releaseDate: string;
  description: string;
  downloadUrl?: string;
  badge?: string;
}

const ROM_DOWNLOADS: RomItem[] = [
  {
    id: 'w18',
    league: 'W League',
    seasonName: 'Season 40 (W18)',
    fileName: 'NHL95_Season40_W18_Official.bin',
    fileSize: '2.0 MB',
    md5: 'a4f8e219b678c0024e819fa281b379c1',
    releaseDate: 'Current Active Season',
    description: 'The official current season ROM featuring the 40th anniversary updated rosters, custom franchise ice center logos, and tweaked manual goalie reaction profiles.',
    badge: 'ACTIVE SEASON'
  },
  {
    id: 'o01',
    league: 'Original 6',
    seasonName: 'Season 39 (O01)',
    fileName: 'NHL95_OriginalSix_O01.bin',
    fileSize: '2.0 MB',
    md5: 'd7a1e582c918b4317f229eb914a88f02',
    releaseDate: 'Archival Vault',
    description: 'Vintage Original Six tournament ROM (BOS, CHI, DET, MTL, NYR, TOR) with classic wooden stick physics, vintage sweaters, and authentic goalie masks.',
    badge: 'CLASSIC'
  },
  {
    id: 'q19',
    league: 'The Q',
    seasonName: 'Season 36 (Q19)',
    fileName: 'NHL95_TheQ_Q19_Official.bin',
    fileSize: '2.0 MB',
    md5: '7c32d90a1841e5492d19bc2981a54ee3',
    releaseDate: 'Archival Vault',
    description: 'Premier tier Q League competitive edition with fast-paced skater ratings and high-aggression defense mechanics.'
  },
  {
    id: 'v01',
    league: 'Vintage',
    seasonName: 'Season 20 (V01)',
    fileName: 'NHL95_Vintage_V01_Grail.bin',
    fileSize: '2.0 MB',
    md5: 'e5b29c01824a77d13b610fa728bc991a',
    releaseDate: 'Archival Vault',
    description: 'The Grail Cup vintage league edition featuring 80s legends and classic arena organ audio enhancements.'
  },
  {
    id: 'g01',
    league: 'Golden Era',
    seasonName: 'Season 16 (G01)',
    fileName: 'NHL95_GoldenEra_G01.bin',
    fileSize: '2.0 MB',
    md5: 'f819ac29b710e6648c291ba8192ec405',
    releaseDate: 'Archival Vault',
    description: 'Golden Era showcase ROM celebrating the greatest offensive dynasties and high-scoring showdowns.'
  }
];

const UTILITY_PACKS = [
  {
    title: 'RetroArch NHL95 Pre-Configured Starter Pack',
    fileName: 'RetroArch_NHL95_StarterKit_v2.zip',
    size: '48.5 MB',
    desc: 'Includes optimized Genesis Plus GX core, ultra-low latency audio/video configs, Netplay hotkeys, and 6-button controller profiles.'
  },
  {
    title: 'OBS Broadcast Overlay & Scoreboard Assets',
    fileName: 'NHL95_OBS_StreamOverlays_Pack.zip',
    size: '18.2 MB',
    desc: 'Transparent 16:9 sidebar pillarbox graphics, lower third starting goalies comparison, and intermission period breakdown templates.'
  },
  {
    title: 'Authentic 90s Arena Sound & Organ Pack',
    fileName: 'NHL95_Audio_ArenaMusic_Mod.zip',
    size: '6.4 MB',
    desc: 'High-fidelity crowd cheers, siren horns, and custom synthesizer organ charge tracks.'
  }
];

export default function RomsPage() {
  const [copiedMd5, setCopiedMd5] = useState<string | null>(null);

  const copyMd5 = (hash: string, id: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedMd5(id);
    setTimeout(() => setCopiedMd5(null), 2500);
  };

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-black font-serif p-3 sm:p-6">
      <header className="border-b-4 border-black pb-3 sm:pb-4 mb-6 text-center">
        <span className="bg-black text-white font-mono text-[10px] sm:text-xs font-black uppercase px-2.5 py-0.5 tracking-widest inline-block mb-1">
          League File Repository
        </span>
        <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">ROMs & League Files</h1>
        <p className="text-xs font-bold uppercase italic mt-1 text-slate-700">
          Official Tournament Builds, Genesis Plus GX Core Packs, and Broadcast Media
        </p>
      </header>

      {/* Notice Banner */}
      <div className="border-2 border-black bg-amber-50 p-4 mb-8 shadow-xs">
        <div className="flex items-center gap-2 font-mono font-black text-xs uppercase text-amber-900 mb-1">
          <ShieldCheck className="w-4 h-4 text-amber-700" /> ROM Compatibility & Netplay Integrity
        </div>
        <p className="font-sans text-xs text-slate-800 leading-relaxed">
          Both players in a Netplay match must use identical ROM binary files. A mismatched file checksum (MD5) will result in an immediate desynchronization. If you experience gameplay divergence, re-download the official build below.
        </p>
      </div>

      {/* Official Season ROMs Grid */}
      <div className="mb-10">
        <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-4">
          <h2 className="font-black text-xl uppercase tracking-tight flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-amber-700" /> Official League Tournament ROMs
          </h2>
          <span className="text-xs font-mono text-slate-500 font-bold uppercase">
            {ROM_DOWNLOADS.length} Builds Available
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ROM_DOWNLOADS.map((rom) => (
            <div
              key={rom.id}
              className="border-2 border-black p-4 bg-[#fdfaf5] shadow-[3px_3px_0px_rgba(0,0,0,1)] flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-[10px] font-mono font-black text-amber-800 uppercase tracking-wider block">
                      {rom.league}
                    </span>
                    <h3 className="text-base font-black uppercase text-black leading-snug">
                      {rom.seasonName}
                    </h3>
                  </div>
                  {rom.badge && (
                    <span className="bg-black text-white font-mono text-[9px] font-black uppercase px-2 py-0.5">
                      {rom.badge}
                    </span>
                  )}
                </div>

                <p className="font-sans text-xs text-slate-700 leading-relaxed mb-3">
                  {rom.description}
                </p>

                <div className="bg-neutral-100 border border-neutral-300 p-2.5 font-mono text-[11px] space-y-1 text-slate-800 mb-3">
                  <div className="truncate"><strong>File:</strong> {rom.fileName} ({rom.fileSize})</div>
                  <div className="flex items-center justify-between text-[10px] text-slate-600">
                    <span className="truncate"><strong>MD5:</strong> {rom.md5}</span>
                    <button
                      onClick={() => copyMd5(rom.md5, rom.id)}
                      className="ml-2 px-1.5 py-0.5 bg-white border border-black text-[9px] font-bold uppercase hover:bg-black hover:text-white cursor-pointer shrink-0"
                    >
                      {copiedMd5 === rom.id ? 'COPIED' : 'COPY'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-black/10">
                <a
                  href={`/api/download-rom?id=${rom.id}`}
                  className="flex-1 text-center bg-black hover:bg-amber-600 text-white font-mono text-xs font-bold uppercase py-2 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Download ROM
                </a>
                <Link
                  href="/setup-guide?tab=netplay"
                  className="px-3 py-2 border border-black font-mono text-xs font-bold uppercase hover:bg-neutral-100 transition-colors"
                  title="Netplay Connection Guide"
                >
                  Setup &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Utilities & Broadcast Assets */}
      <div className="mb-8">
        <div className="border-b-2 border-black pb-2 mb-4">
          <h2 className="font-black text-xl uppercase tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-700" /> Utility Kits, Overlays & Sound Packs
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {UTILITY_PACKS.map((pack, idx) => (
            <div key={idx} className="border-2 border-black p-4 bg-white shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-mono font-black text-amber-800 uppercase mb-1">
                  <FileArchive className="w-4 h-4" /> {pack.size}
                </div>
                <h3 className="font-black text-sm uppercase mb-1.5">{pack.title}</h3>
                <p className="font-sans text-xs text-slate-700 leading-relaxed mb-3">
                  {pack.desc}
                </p>
              </div>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  alert(`Downloading ${pack.fileName}... Check Discord #resources channel for direct mirror.`);
                }}
                className="block text-center border border-black font-mono text-xs font-bold uppercase py-1.5 hover:bg-black hover:text-white transition-colors"
              >
                Download Package &darr;
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
