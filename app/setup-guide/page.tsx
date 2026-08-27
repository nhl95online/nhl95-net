"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Compass,
  Gamepad2,
  Globe,
  Save,
  Radio,
  Clapperboard,
  CheckCircle2,
  AlertTriangle,
  Download,
  ExternalLink,
  Copy,
  Check,
  Monitor,
  Cpu,
  Wifi,
  ShieldCheck,
  Tv
} from 'lucide-react';

type TabId = 'overview' | 'retroarch' | 'netplay' | 'rom' | 'streaming' | 'overlays';

interface TabItem {
  id: TabId;
  label: string;
  icon: string;
  lucideIcon: any;
}

const TABS: TabItem[] = [
  { id: 'overview', label: 'OVERVIEW', icon: '🗺️', lucideIcon: Compass },
  { id: 'retroarch', label: 'RETROARCH SETUP', icon: '🕹️', lucideIcon: Gamepad2 },
  { id: 'netplay', label: 'NETPLAY & FIREWALL', icon: '🌐', lucideIcon: Globe },
  { id: 'rom', label: 'ROM & TESTING', icon: '💾', lucideIcon: Save },
  { id: 'streaming', label: 'STREAMING (TWITCH)', icon: '📡', lucideIcon: Radio },
  { id: 'overlays', label: 'STREAM OVERLAYS', icon: '🎬', lucideIcon: Clapperboard },
];

function SetupGuideContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabId) || 'overview';
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabId;
    if (tabParam && TABS.some(t => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2500);
  };

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-black font-serif -mx-2 sm:-mx-4 md:-mx-6 -mt-3 sm:-mt-6">
      {/* Top Banner Header */}
      <div className="bg-[#121624] text-white border-b-4 border-black px-4 sm:px-8 py-6 text-center">
        <div className="max-w-5xl mx-auto">
          <span className="bg-amber-500 text-black font-mono text-[10px] sm:text-xs font-black uppercase px-2.5 py-1 tracking-widest inline-block mb-2 shadow-xs">
            Official Technical Manual & Netplay Protocol
          </span>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight text-amber-400 font-serif">
            NHL95 League Setup Guide
          </h1>
          <p className="text-xs sm:text-sm font-mono text-slate-300 uppercase tracking-widest mt-2">
            RetroArch • Genesis Plus GX • Port 55435 • 60 FPS Netplay • OBS Broadcast
          </p>
        </div>
      </div>

      {/* Styled Pixel/Arcade Sub-Navigation Bar matching reference image */}
      <div className="sticky top-[108px] sm:top-[128px] md:top-[136px] z-40 bg-[#0c101d] border-t-2 border-b-2 border-amber-500 shadow-md">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex items-center overflow-x-auto no-scrollbar py-1 sm:py-1.5 gap-1 sm:gap-2 justify-start md:justify-center">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-mono font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 cursor-pointer rounded-none border-b-2 ${
                    isActive
                      ? 'text-amber-400 bg-amber-500/15 border-amber-400 shadow-[inset_0_-2px_0_rgba(245,158,11,1)]'
                      : 'text-slate-400 border-transparent hover:text-slate-100 hover:bg-white/5'
                  }`}
                >
                  <span className="text-base leading-none select-none">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
        
        {/* ======================================================== */}
        {/* TAB 1: OVERVIEW */}
        {/* ======================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="border-4 border-black bg-white p-4 sm:p-8 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-2 border-black pb-4 mb-6 gap-3">
                <div>
                  <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight">
                    Welcome to the NHL95 Netplay League
                  </h2>
                  <p className="text-xs sm:text-sm font-sans font-bold text-slate-700 mt-1 uppercase tracking-wider">
                    Everything you need to configure your emulator, connect with opponents, and play live league hockey.
                  </p>
                </div>
                <Link
                  href="/roms"
                  className="bg-black hover:bg-amber-600 text-white font-mono font-bold text-xs uppercase px-4 py-2 transition-colors shrink-0 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Download League ROMs
                </Link>
              </div>

              {/* 4-Step Quick Roadmap */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="border-2 border-black p-4 bg-[#fdfaf5]">
                  <div className="font-mono text-2xl font-black text-amber-600 mb-1">01</div>
                  <h3 className="font-black text-sm uppercase mb-1">Install RetroArch</h3>
                  <p className="font-sans text-xs text-slate-700">
                    Download RetroArch 64-bit and install the official Genesis Plus GX core for perfect 60 FPS Netplay.
                  </p>
                </div>
                <div className="border-2 border-black p-4 bg-[#fdfaf5]">
                  <div className="font-mono text-2xl font-black text-amber-600 mb-1">02</div>
                  <h3 className="font-black text-sm uppercase mb-1">Map 6-Button Pad</h3>
                  <p className="font-sans text-xs text-slate-700">
                    Configure your controller with dedicated Manual Goalie toggles (Y button) and Speed Burst (A button).
                  </p>
                </div>
                <div className="border-2 border-black p-4 bg-[#fdfaf5]">
                  <div className="font-mono text-2xl font-black text-amber-600 mb-1">03</div>
                  <h3 className="font-black text-sm uppercase mb-1">Open Port 55435</h3>
                  <p className="font-sans text-xs text-slate-700">
                    Allow RetroArch through Windows Firewall and forward UDP port 55435 on your home router.
                  </p>
                </div>
                <div className="border-2 border-black p-4 bg-[#fdfaf5]">
                  <div className="font-mono text-2xl font-black text-amber-600 mb-1">04</div>
                  <h3 className="font-black text-sm uppercase mb-1">Play on Discord</h3>
                  <p className="font-sans text-xs text-slate-700">
                    Drop your IP or invite in the #match-making channel, report scores, and upload save-state files.
                  </p>
                </div>
              </div>

              {/* Core System Standards Grid */}
              <h3 className="font-black text-lg uppercase border-b border-black pb-2 mb-4">
                League Hardware & Software Standards
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
                <div className="border border-neutral-300 p-3 bg-neutral-50">
                  <div className="font-bold uppercase text-slate-900 mb-1 flex items-center gap-1.5 font-mono">
                    <Monitor className="w-4 h-4 text-amber-600" /> Platform & OS
                  </div>
                  <p className="text-slate-700">
                    Windows 10/11, macOS, Linux, Steam Deck. Must be capable of rendering sustained 60.000 FPS without frame drops.
                  </p>
                </div>
                <div className="border border-neutral-300 p-3 bg-neutral-50">
                  <div className="font-bold uppercase text-slate-900 mb-1 flex items-center gap-1.5 font-mono">
                    <Wifi className="w-4 h-4 text-amber-600" /> Network Connection
                  </div>
                  <p className="text-slate-700">
                    Direct Ethernet (LAN) cable strictly recommended. Wi-Fi packet jitter causes severe Netplay frame lag.
                  </p>
                </div>
                <div className="border border-neutral-300 p-3 bg-neutral-50">
                  <div className="font-bold uppercase text-slate-900 mb-1 flex items-center gap-1.5 font-mono">
                    <Gamepad2 className="w-4 h-4 text-amber-600" /> Controller Setup
                  </div>
                  <p className="text-slate-700">
                    USB Sega Genesis 6-button controller (Retro-Bit), 8BitDo, Xbox, or PlayStation controller.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: RETROARCH SETUP */}
        {/* ======================================================== */}
        {activeTab === 'retroarch' && (
          <div className="space-y-6">
            <div className="border-4 border-black bg-white p-4 sm:p-8 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight border-b-2 border-black pb-3 mb-6">
                Step-by-Step RetroArch Configuration
              </h2>

              <div className="space-y-8">
                {/* Step 1 */}
                <div className="border-l-4 border-amber-500 pl-4">
                  <span className="font-mono text-xs font-black text-amber-700 uppercase tracking-widest">
                    STEP 1: INSTALL RETROARCH
                  </span>
                  <h3 className="text-lg font-black uppercase mt-0.5 mb-2">Download Clean RetroArch Build</h3>
                  <p className="font-sans text-xs text-slate-700 mb-3 leading-relaxed">
                    Download the standard 64-bit installer for Windows (or your OS) from the official RetroArch website.
                  </p>
                  <a
                    href="https://www.retroarch.com/?page=platforms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-mono text-xs font-bold bg-black text-white px-3 py-1.5 hover:bg-neutral-800"
                  >
                    RetroArch Download Portal <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Step 2 */}
                <div className="border-l-4 border-amber-500 pl-4">
                  <span className="font-mono text-xs font-black text-amber-700 uppercase tracking-widest">
                    STEP 2: INSTALL THE CORE
                  </span>
                  <h3 className="text-lg font-black uppercase mt-0.5 mb-2">Genesis Plus GX Core</h3>
                  <p className="font-sans text-xs text-slate-700 leading-relaxed mb-2">
                    Open RetroArch and navigate to:
                  </p>
                  <div className="bg-neutral-900 text-amber-400 p-3 font-mono text-xs mb-2">
                    Main Menu &rarr; Online Updater &rarr; Core Downloader &rarr; Sega - MS/MD/CD/32X (Genesis Plus GX)
                  </div>
                  <p className="font-sans text-xs text-slate-600 italic">
                    Note: Both players MUST use the exact same core version to avoid Netplay desynchronization.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="border-l-4 border-amber-500 pl-4">
                  <span className="font-mono text-xs font-black text-amber-700 uppercase tracking-widest">
                    STEP 3: 6-BUTTON CONTROLLER BINDINGS
                  </span>
                  <h3 className="text-lg font-black uppercase mt-0.5 mb-2">Official League Button Mapping</h3>
                  <p className="font-sans text-xs text-slate-700 mb-3">
                    Navigate to <code className="bg-neutral-100 px-1 font-mono font-bold">Settings &rarr; Input &rarr; Retropad Binds &rarr; Port 1 Controls</code> and set device type to <strong>6-Button Genesis Pad</strong>:
                  </p>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-sans border border-black text-left">
                      <thead className="bg-black text-white uppercase font-mono text-[11px]">
                        <tr>
                          <th className="p-2">Genesis Button</th>
                          <th className="p-2">In-Game Hockey Function</th>
                          <th className="p-2">Modern Gamepad Equivalent (Xbox / PS)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        <tr className="bg-white">
                          <td className="p-2 font-mono font-black text-red-700">B Button</td>
                          <td className="p-2 font-bold">Shoot / Poke Check / Hook</td>
                          <td className="p-2 font-mono">X (Xbox) / Square (PS)</td>
                        </tr>
                        <tr className="bg-neutral-50">
                          <td className="p-2 font-mono font-black text-blue-700">C Button</td>
                          <td className="p-2 font-bold">Pass / Switch Player / Body Check</td>
                          <td className="p-2 font-mono">A (Xbox) / Cross (PS)</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="p-2 font-mono font-black text-green-700">A Button</td>
                          <td className="p-2 font-bold">Speed Burst (Turbo) / Line Change</td>
                          <td className="p-2 font-mono">B (Xbox) / Circle (PS)</td>
                        </tr>
                        <tr className="bg-amber-50">
                          <td className="p-2 font-mono font-black text-amber-800">Y Button</td>
                          <td className="p-2 font-black text-amber-900">Manual Goalie Toggle (Crucial!)</td>
                          <td className="p-2 font-mono">Y (Xbox) / Triangle (PS)</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="p-2 font-mono font-bold">Start Button</td>
                          <td className="p-2">Pause / Game Menu</td>
                          <td className="p-2 font-mono">Menu / Options</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="border-l-4 border-amber-500 pl-4">
                  <span className="font-mono text-xs font-black text-amber-700 uppercase tracking-widest">
                    STEP 4: LOW LATENCY TUNING
                  </span>
                  <h3 className="text-lg font-black uppercase mt-0.5 mb-2">Zero-Lag Video & Audio Settings</h3>
                  <ul className="list-disc pl-5 font-sans text-xs text-slate-700 space-y-1.5">
                    <li><strong>Settings &rarr; Video &rarr; Synchronization:</strong> Turn <span className="font-mono font-bold text-green-700">VSync ON</span> and set Hard GPU Sync to <span className="font-mono font-bold">0 frames</span>.</li>
                    <li><strong>Settings &rarr; Audio &rarr; Output:</strong> Use <strong>WASAPI</strong> (Windows) or <strong>CoreAudio</strong> (Mac) with Latency buffer set to <span className="font-mono font-bold">64 ms</span>.</li>
                    <li><strong>Settings &rarr; Latency:</strong> Frame Delay set to <span className="font-mono font-bold">0 ms</span> or <span className="font-mono font-bold">1 ms</span>.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: NETPLAY & FIREWALL */}
        {/* ======================================================== */}
        {activeTab === 'netplay' && (
          <div className="space-y-6">
            <div className="border-4 border-black bg-white p-4 sm:p-8 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight border-b-2 border-black pb-3 mb-6">
                Netplay Connection & Firewall Protocol
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Host Guide */}
                <div className="border-2 border-black p-4 bg-[#fdfaf5]">
                  <div className="flex items-center gap-2 font-mono font-black text-sm uppercase text-red-900 border-b border-black/20 pb-2 mb-3">
                    <Radio className="w-4 h-4" /> HOSTING A GAME
                  </div>
                  <ol className="list-decimal pl-5 font-sans text-xs text-slate-800 space-y-2">
                    <li>Load the official season ROM with the Genesis Plus GX core.</li>
                    <li>Open Quick Menu (<code className="bg-black/10 px-1 font-mono font-bold">F1</code> key).</li>
                    <li>Select <strong>Netplay &rarr; Host &rarr; Start Netplay Host</strong>.</li>
                    <li>Share your Public IP with your opponent in Discord.</li>
                    <li>Ensure <span className="font-bold text-amber-800">Netplay Delay Frames</span> is set to <span className="font-mono font-bold">0</span> (or 1 for cross-country).</li>
                  </ol>
                </div>

                {/* Client Guide */}
                <div className="border-2 border-black p-4 bg-[#fdfaf5]">
                  <div className="flex items-center gap-2 font-mono font-black text-sm uppercase text-blue-900 border-b border-black/20 pb-2 mb-3">
                    <Globe className="w-4 h-4" /> JOINING A HOST
                  </div>
                  <ol className="list-decimal pl-5 font-sans text-xs text-slate-800 space-y-2">
                    <li>Ensure you have the exact same ROM and core version loaded.</li>
                    <li>Go to <strong>Main Menu &rarr; Netplay &rarr; Connect to Netplay Host</strong>.</li>
                    <li>Enter the Host's Public IP address and Port <code className="bg-black/10 px-1 font-mono font-bold">55435</code>.</li>
                    <li>Press Connect to drop into Player 2 slot.</li>
                    <li>Perform a test faceoff to confirm zero audio crackle and fluid inputs.</li>
                  </ol>
                </div>
              </div>

              {/* Port 55435 Card */}
              <div className="border-2 border-amber-600 bg-amber-50/50 p-4 sm:p-6 mb-6">
                <div className="flex items-center gap-2 font-mono text-sm font-black text-amber-900 uppercase mb-2">
                  <ShieldCheck className="w-5 h-5 text-amber-700" /> Default UDP Port 55435 Configuration
                </div>
                <p className="font-sans text-xs text-slate-800 leading-relaxed mb-3">
                  RetroArch Netplay requires <strong>UDP Port 55435</strong> to be opened on your home internet router (Port Forwarding), and allowed through Windows Defender Firewall.
                </p>
                <div className="bg-neutral-900 text-amber-300 p-3 font-mono text-xs flex justify-between items-center">
                  <span>Port: 55435 | Protocol: UDP | App: retroarch.exe</span>
                  <button
                    onClick={() => copyToClipboard("55435", "port")}
                    className="flex items-center gap-1 text-[11px] bg-amber-500 text-black px-2 py-0.5 font-bold hover:bg-amber-400"
                  >
                    {copiedText === 'port' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedText === 'port' ? 'COPIED' : 'COPY'}
                  </button>
                </div>
              </div>

              {/* Windows Firewall Checklist */}
              <h3 className="font-black text-base uppercase mb-2">Windows Firewall Quick Fix</h3>
              <p className="font-sans text-xs text-slate-700 mb-3">
                If opponent cannot connect to your host, ensure both Private and Public network boxes are checked in Windows Defender:
              </p>
              <div className="bg-neutral-100 border border-neutral-300 p-3 font-mono text-xs text-neutral-800">
                Control Panel &rarr; Windows Defender Firewall &rarr; Allow an app or feature through Windows Defender Firewall &rarr; Check "RetroArch" for both Private and Public.
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: ROM & TESTING */}
        {/* ======================================================== */}
        {activeTab === 'rom' && (
          <div className="space-y-6">
            <div className="border-4 border-black bg-white p-4 sm:p-8 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-black pb-3 mb-6 gap-2">
                <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight">
                  Official League ROMs & Validation
                </h2>
                <Link
                  href="/roms"
                  className="font-mono text-xs font-bold bg-black text-white px-3 py-1.5 hover:bg-neutral-800"
                >
                  View All ROM Downloads &rarr;
                </Link>
              </div>

              <p className="font-sans text-xs text-slate-700 mb-6 leading-relaxed">
                League games must be played on the official modified NHL95 ROM corresponding to the active season. Modified ROMs include updated team rosters, authentic player ratings, customized ice colors, and enhanced goalie AI.
              </p>

              {/* Pre-Match Testing Checklist */}
              <div className="border-2 border-black bg-[#fdfaf5] p-4 sm:p-6 mb-6">
                <h3 className="font-black text-base uppercase mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Pre-Flight Checklist Before League Matches
                </h3>
                <div className="space-y-2.5 font-sans text-xs text-slate-800">
                  <div className="flex items-start gap-2">
                    <span className="font-mono font-bold text-black bg-neutral-200 px-1.5 py-0.5 text-[10px]">1</span>
                    <span>Verify locked <strong>60.000 FPS</strong> with zero dropped frames during gameplay.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-mono font-bold text-black bg-neutral-200 px-1.5 py-0.5 text-[10px]">2</span>
                    <span>Confirm <strong>Period Length is set to 5 Minutes</strong> in the main game options.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-mono font-bold text-black bg-neutral-200 px-1.5 py-0.5 text-[10px]">3</span>
                    <span>Ensure <strong>Penalties: ON</strong> and <strong>Offsides: ON</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-mono font-bold text-black bg-neutral-200 px-1.5 py-0.5 text-[10px]">4</span>
                    <span>Ensure <strong>Line Changes: MANUAL</strong> (or per specific league tier rules).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-mono font-bold text-black bg-neutral-200 px-1.5 py-0.5 text-[10px]">5</span>
                    <span>Save state creation during live gameplay is strictly prohibited; only final game state saves are allowed for stats upload.</span>
                  </div>
                </div>
              </div>

              {/* Checksum Verification Box */}
              <h3 className="font-black text-base uppercase mb-2">ROM Integrity Checksum Hashes</h3>
              <p className="font-sans text-xs text-slate-700 mb-3">
                If you experience instant desync upon puck drop, you and your opponent are running different ROM revisions. Verify matching MD5 checksums:
              </p>
              <div className="space-y-2 font-mono text-xs">
                <div className="p-2.5 bg-neutral-100 border border-neutral-300 flex justify-between items-center">
                  <span>W18 Season 40 Official ROM: <strong>W18_NHL95_v1.0.bin</strong></span>
                  <span className="text-[10px] text-neutral-500 font-bold">MD5: a4f8e219b678c...</span>
                </div>
                <div className="p-2.5 bg-neutral-100 border border-neutral-300 flex justify-between items-center">
                  <span>Q19 The Q Official ROM: <strong>Q19_TheQ_Release.bin</strong></span>
                  <span className="text-[10px] text-neutral-500 font-bold">MD5: 7c32d90a1841e...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: STREAMING (TWITCH) */}
        {/* ======================================================== */}
        {activeTab === 'streaming' && (
          <div className="space-y-6">
            <div className="border-4 border-black bg-white p-4 sm:p-8 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight border-b-2 border-black pb-3 mb-6">
                Twitch & OBS Studio Broadcast Configuration
              </h2>

              <p className="font-sans text-xs text-slate-700 mb-6 leading-relaxed">
                League exhibition matches, playoff series, and championship showdowns are frequently broadcast live on Twitch with live chat reactions and commentary. Follow these OBS Studio recommendations for high-quality retro streams.
              </p>

              {/* OBS Settings Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="border-2 border-black p-4 bg-[#fdfaf5]">
                  <h3 className="font-black text-sm uppercase mb-2 flex items-center gap-1.5 font-mono">
                    <Tv className="w-4 h-4 text-purple-700" /> OBS Video Output Settings
                  </h3>
                  <ul className="font-sans text-xs space-y-2 text-slate-800">
                    <li><strong>Base Canvas:</strong> 1920x1080 (16:9)</li>
                    <li><strong>Output Resolution:</strong> 1920x1080 @ 60 FPS</li>
                    <li><strong>Downscale Filter:</strong> Lanczos (36 samples)</li>
                    <li><strong>Rate Control:</strong> CBR (Constant Bitrate)</li>
                    <li><strong>Bitrate:</strong> 6,000 Kbps (or 4,500 Kbps for 720p60)</li>
                    <li><strong>Keyframe Interval:</strong> 2 seconds</li>
                  </ul>
                </div>

                <div className="border-2 border-black p-4 bg-[#fdfaf5]">
                  <h3 className="font-black text-sm uppercase mb-2 flex items-center gap-1.5 font-mono">
                    <Radio className="w-4 h-4 text-purple-700" /> Twitch Category & Tags
                  </h3>
                  <ul className="font-sans text-xs space-y-2 text-slate-800">
                    <li><strong>Category:</strong> <code className="font-mono bg-black/10 px-1 font-bold">NHL '95</code></li>
                    <li><strong>Stream Title Template:</strong> <code className="font-mono text-[11px] bg-black/10 px-1">NHL95 League S40: [AWAY] @ [HOME] (Game 1)</code></li>
                    <li><strong>Tags:</strong> #RetroGaming, #SegaGenesis, #Esports, #NHL95</li>
                    <li><strong>Discord Webhook:</strong> Post stream link in #highlights to alert league managers!</li>
                  </ul>
                </div>
              </div>

              {/* Capturing RetroArch */}
              <h3 className="font-black text-base uppercase mb-2">Adding RetroArch Window in OBS</h3>
              <div className="bg-neutral-100 border border-neutral-300 p-4 font-sans text-xs text-slate-800 space-y-1.5">
                <p>1. In OBS Sources, click <strong>+ &rarr; Game Capture</strong>.</p>
                <p>2. Set Mode to <strong>Capture specific window</strong>.</p>
                <p>3. Select Window: <code className="bg-white px-1 font-mono font-bold">[retroarch.exe]: RetroArch</code>.</p>
                <p>4. Check <strong>Allow Transparency</strong> and set Hook Rate to <strong>Normal</strong>.</p>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 6: STREAM OVERLAYS */}
        {/* ======================================================== */}
        {activeTab === 'overlays' && (
          <div className="space-y-6">
            <div className="border-4 border-black bg-white p-4 sm:p-8 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight border-b-2 border-black pb-3 mb-6">
                Official Broadcast Overlays & CRT Filters
              </h2>

              <p className="font-sans text-xs text-slate-700 mb-6 leading-relaxed">
                Because Sega Genesis renders in a classic 4:3 aspect ratio, our broadcast templates allow you to fill modern 16:9 widescreen streams with live team stats, player headshots, and retro scoreboard bugs.
              </p>

              {/* Overlay Assets Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <div className="border-2 border-black p-4 bg-[#fdfaf5]">
                  <div className="font-mono text-xs font-black text-amber-700 mb-1">GRAPHIC ASSET 01</div>
                  <h3 className="font-black text-sm uppercase mb-1">16:9 Sidebar Scoreboard</h3>
                  <p className="font-sans text-xs text-slate-700 mb-3">
                    Left/Right pillarbox artwork featuring vintage NHL95 team logos, coach records, and live period tracker.
                  </p>
                  <span className="text-[10px] font-mono font-bold bg-neutral-200 px-2 py-0.5 text-neutral-800">
                    PNG (1920x1080 Transparent)
                  </span>
                </div>

                <div className="border-2 border-black p-4 bg-[#fdfaf5]">
                  <div className="font-mono text-xs font-black text-amber-700 mb-1">GRAPHIC ASSET 02</div>
                  <h3 className="font-black text-sm uppercase mb-1">Lower Third Matchup Card</h3>
                  <p className="font-sans text-xs text-slate-700 mb-3">
                    Starting goalies comparison overlay, save percentages, and series record banner for pre-game intro.
                  </p>
                  <span className="text-[10px] font-mono font-bold bg-neutral-200 px-2 py-0.5 text-neutral-800">
                    OBS Browser Source Compatible
                  </span>
                </div>

                <div className="border-2 border-black p-4 bg-[#fdfaf5]">
                  <div className="font-mono text-xs font-black text-amber-700 mb-1">GRAPHIC ASSET 03</div>
                  <h3 className="font-black text-sm uppercase mb-1">Intermission Stats Board</h3>
                  <p className="font-sans text-xs text-slate-700 mb-3">
                    Period breakdown card displaying shots on goal, powerplay %, body checks, and attack zone time.
                  </p>
                  <span className="text-[10px] font-mono font-bold bg-neutral-200 px-2 py-0.5 text-neutral-800">
                    PNG / PSD Template
                  </span>
                </div>
              </div>

              {/* Recommended Retro CRT Shaders */}
              <div className="border-2 border-black bg-neutral-900 text-white p-4 sm:p-6">
                <h3 className="text-amber-400 font-black text-sm uppercase mb-2 font-mono flex items-center gap-2">
                  <span>📺</span> Authentic 90s CRT Scanline Shaders for RetroArch
                </h3>
                <p className="font-sans text-xs text-slate-300 mb-3 leading-relaxed">
                  To give your broadcast that authentic 1995 cathode-ray tube television aesthetic without excessive blur, we recommend applying one of these official shader presets:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                  <div className="bg-black/50 border border-neutral-700 p-3">
                    <span className="font-bold text-amber-400 block mb-1">crt-easymode.slangp</span>
                    <span className="text-slate-400 text-[11px]">Low GPU overhead, crisp scanlines, perfect for 60 FPS live streaming.</span>
                  </div>
                  <div className="bg-black/50 border border-neutral-700 p-3">
                    <span className="font-bold text-amber-400 block mb-1">crt-royale-fast.slangp</span>
                    <span className="text-slate-400 text-[11px]">Rich phosphor bloom and aperture grille mask for broadcast quality.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function SetupGuidePage() {
  return (
    <Suspense fallback={<div className="p-12 text-center font-mono font-bold uppercase text-xs">Loading Setup Guide...</div>}>
      <SetupGuideContent />
    </Suspense>
  );
}
