"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Download, 
  HardDrive, 
  ShieldCheck, 
  Check, 
  Copy, 
  ExternalLink, 
  FileArchive, 
  Sparkles, 
  Search, 
  Calendar, 
  Trophy, 
  Gamepad2, 
  Wrench, 
  Filter, 
  Clock, 
  Users, 
  Layers,
  ArrowDown,
  Info,
  Flame,
  Star,
  Maximize2,
  X,
  Image as ImageIcon
} from 'lucide-react';
import { 
  OFFICIAL_LEAGUE_ROMS, 
  HISTORICAL_NHL_ROMS, 
  MISC_ROMS, 
  UTILITY_PACKS_DATA,
  LeagueRom,
  HistoricalNhlRom,
  MiscRom,
  UtilityPack,
  getRomImageUrl,
  getRomDownloadUrl,
  SUPABASE_ROMS_URL
} from './roms_data';

// ============================================================================
// RETRO ROM THUMBNAIL COMPONENT
// ============================================================================
function RomThumbnail({
  imagePath,
  alt,
  eraOrCategory,
  onEnlarge,
  className = "aspect-[16/9]"
}: {
  imagePath?: string;
  alt: string;
  eraOrCategory?: string;
  onEnlarge?: () => void;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const resolvedUrl = getRomImageUrl(imagePath);

  if (resolvedUrl && !imgError) {
    return (
      <div 
        onClick={onEnlarge}
        className={`relative w-full overflow-hidden bg-neutral-950 group/thumb ${onEnlarge ? 'cursor-pointer' : ''} select-none border-b border-black ${className}`}
      >
        <img
          src={resolvedUrl}
          alt={alt}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover object-center group-hover/thumb:scale-105 transition-transform duration-300"
          style={{ imageRendering: 'pixelated' }}
        />
        {/* Retro scanline & subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-40 group-hover/thumb:opacity-20 transition-opacity pointer-events-none" />
        {onEnlarge && (
          <div className="absolute top-2 right-2 opacity-0 group-hover/thumb:opacity-100 transition-opacity bg-black/80 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-1 rounded flex items-center gap-1 shadow-md">
            <Maximize2 className="w-3 h-3 text-amber-400" />
            <span>Enlarge</span>
          </div>
        )}
      </div>
    );
  }

  // Retro Rink / 16-Bit Genesis Fallback Placeholder
  return (
    <div className={`relative w-full overflow-hidden bg-gradient-to-br from-neutral-900 via-slate-900 to-neutral-950 flex flex-col items-center justify-center border-b border-black select-none ${className}`}>
      {/* Retro hockey rink styling */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-red-600/30" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border-2 border-red-500/20 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-red-500/40" />
      </div>
      
      <div className="relative z-10 flex flex-col items-center text-center p-3">
        <Gamepad2 className="w-6 h-6 text-amber-400/70 mb-1" />
        <span className="font-mono text-[9px] font-black uppercase text-slate-400 tracking-wider">
          {eraOrCategory || 'Genesis 16-Bit'}
        </span>
        <span className="font-mono text-[8px] text-slate-500 mt-0.5">
          SEGA MEGADRIVE / GENESIS
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// TABLE ROW THUMBNAIL COMPONENT (WITH ERROR FALLBACK)
// ============================================================================
function TableThumbnail({
  imagePath,
  alt,
  onClick
}: {
  imagePath?: string;
  alt: string;
  onClick?: () => void;
}) {
  const [hasError, setHasError] = useState(false);
  const url = getRomImageUrl(imagePath);

  if (url && !hasError) {
    return (
      <button
        onClick={onClick}
        className="w-10 h-7 rounded border border-black overflow-hidden bg-black inline-block group cursor-pointer hover:border-amber-500 shadow-xs"
        title="Click to view screenshot"
      >
        <img
          src={url}
          alt={alt}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
          style={{ imageRendering: 'pixelated' }}
        />
      </button>
    );
  }

  return (
    <div className="w-10 h-7 rounded border border-slate-300 bg-slate-100 inline-flex items-center justify-center text-[8px] font-mono text-slate-400 font-bold" title="SEGA 16-BIT">
      .BIN
    </div>
  );
}

export default function RomsPage() {
  const [copiedMd5, setCopiedMd5] = useState<string | null>(null);

  // Active section tab
  const [activeSection, setActiveSection] = useState<'all' | 'nhl-history' | 'leagues' | 'misc' | 'utilities'>('all');

  // Active image preview lightbox
  const [activePreview, setActivePreview] = useState<{
    imageUrl: string;
    title: string;
    subtitle?: string;
    badge?: string;
    fileName?: string;
    downloadCandidates?: string[];
    downloadUrl?: string;
  } | null>(null);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Search and filter for historical NHL ROMs
  const [historySearch, setHistorySearch] = useState('');
  const [selectedEra, setSelectedEra] = useState<string>('all');
  const [historyViewMode, setHistoryViewMode] = useState<'grid' | 'table'>('grid');

  // League filter, search, sort & view mode
  const [selectedLeagueFilter, setSelectedLeagueFilter] = useState<string>('all');
  const [leagueSearch, setLeagueSearch] = useState<string>('');
  const [leagueViewMode, setLeagueViewMode] = useState<'grid' | 'table'>('grid');
  const [leagueSortOrder, setLeagueSortOrder] = useState<'latest' | 'oldest'>('latest');

  // Misc category filter
  const [selectedMiscCategory, setSelectedMiscCategory] = useState<string>('all');

  const copyMd5 = (hash: string, id: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedMd5(id);
    setTimeout(() => setCopiedMd5(null), 2500);
  };

  // Filtered Historical NHL ROMs
  const filteredHistoricalRoms = useMemo(() => {
    return HISTORICAL_NHL_ROMS.filter(rom => {
      const matchesEra = selectedEra === 'all' || rom.era === selectedEra;
      const q = historySearch.toLowerCase().trim();
      const matchesSearch = !q || 
        rom.year.toString().includes(q) ||
        rom.seasonLabel.toLowerCase().includes(q) ||
        (rom.champion && rom.champion.toLowerCase().includes(q)) ||
        (rom.runnerUp && rom.runnerUp.toLowerCase().includes(q)) ||
        (rom.notableTeams && rom.notableTeams.some(t => t.toLowerCase().includes(q))) ||
        (rom.modder && rom.modder.toLowerCase().includes(q)) ||
        rom.features.toLowerCase().includes(q);
      return matchesEra && matchesSearch;
    });
  }, [selectedEra, historySearch]);

  // Filtered League ROMs
  const filteredLeagueRoms = useMemo(() => {
    let result = OFFICIAL_LEAGUE_ROMS.filter(rom => {
      const matchesLeague = selectedLeagueFilter === 'all' || rom.leagueCode === selectedLeagueFilter;
      const q = leagueSearch.toLowerCase().trim();
      const matchesSearch = !q ||
        rom.id.toLowerCase().includes(q) ||
        rom.league.toLowerCase().includes(q) ||
        rom.seasonName.toLowerCase().includes(q) ||
        rom.nhlYear.toString().includes(q) ||
        rom.seasonNumber.toString().includes(q) ||
        `season ${rom.seasonNumber}`.includes(q) ||
        (rom.champion && rom.champion.toLowerCase().includes(q)) ||
        (rom.rulesSummary && rom.rulesSummary.toLowerCase().includes(q)) ||
        (rom.badge && rom.badge.toLowerCase().includes(q)) ||
        rom.description.toLowerCase().includes(q);
      return matchesLeague && matchesSearch;
    });

    if (leagueSortOrder === 'oldest') {
      result = [...result].sort((a, b) => {
        if (a.leagueCode === b.leagueCode) {
          return a.seasonNumber - b.seasonNumber;
        }
        return a.league.localeCompare(b.league);
      });
    } else {
      result = [...result].sort((a, b) => {
        if (a.leagueCode === b.leagueCode) {
          return b.seasonNumber - a.seasonNumber;
        }
        return a.league.localeCompare(b.league);
      });
    }

    return result;
  }, [selectedLeagueFilter, leagueSearch, leagueSortOrder]);

  // Filtered Misc ROMs
  const filteredMiscRoms = useMemo(() => {
    return MISC_ROMS.filter(rom => {
      if (selectedMiscCategory === 'all') return true;
      return rom.category === selectedMiscCategory;
    });
  }, [selectedMiscCategory]);

  const handleDownload = async (
    fileNames: string | string[],
    itemTitle: string,
    customDownloadUrl?: string,
    trackId?: string
  ) => {
    if (customDownloadUrl) {
      window.location.href = customDownloadUrl;
      return;
    }

    if (trackId) setDownloadingId(trackId);

    const list = Array.isArray(fileNames) ? fileNames : [fileNames];

    try {
      let targetUrl: string | null = null;
      let matchedName = list[0];

      // Probe candidate filenames in the Supabase `roms` storage bucket
      for (const fName of list) {
        const checkUrl = `${SUPABASE_ROMS_URL}/${encodeURIComponent(fName)}`;
        try {
          const res = await fetch(checkUrl, { method: 'HEAD' });
          if (res.ok) {
            targetUrl = `${checkUrl}?download=${encodeURIComponent(fName)}`;
            matchedName = fName;
            break;
          }
        } catch {
          // ignore network probe error and check next candidate
        }
      }

      if (targetUrl) {
        // Direct download using programmatic anchor trigger
        const a = document.createElement('a');
        a.href = targetUrl;
        a.download = matchedName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        alert(
          `File not found in Supabase Storage.\n\nPlease upload "${list[0]}" into your Supabase "roms" bucket.`
        );
      }
    } catch (err) {
      console.error('Download error:', err);
      window.location.href = `${SUPABASE_ROMS_URL}/${encodeURIComponent(list[0])}?download`;
    } finally {
      if (trackId) setDownloadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-black font-sans pb-20">
      
      {/* ===================================================================== */}
      {/* 1. HERO MASTHEAD & RETRO MASHUP BANNER                                 */}
      {/* ===================================================================== */}
      <div className="bg-[#0b0c10] border-b-4 border-black text-white relative overflow-hidden shadow-md">
        
        {/* Banner Image Showcase */}
        <div className="relative w-full max-w-[1500px] mx-auto overflow-hidden group">
          <div className="relative aspect-[21/9] sm:aspect-[24/9] max-h-[380px] w-full overflow-hidden">
            <img 
              src="/images/roms-hero-banner.jpg" 
              alt="NHL95 Modding & Retro Gaming Mashup" 
              className="w-full h-full object-cover object-center filter saturate-110 contrast-105"
            />
            {/* Retro Synthwave Ambient Gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c10] via-transparent to-black/30 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60 pointer-events-none" />
          </div>

          {/* Floating Hero Badge & Title Overlay */}
          <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-8 right-4 flex flex-col md:flex-row md:items-end justify-between gap-3 pointer-events-none">
            <div className="bg-black/85 backdrop-blur-md p-4 sm:p-5 rounded-lg border border-amber-500/40 shadow-xl max-w-2xl pointer-events-auto">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-mono text-[10px] font-black uppercase px-2.5 py-0.5 rounded tracking-wider shadow-xs">
                  Retro Modding Repository
                </span>
                <span className="bg-amber-400 text-black font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-1">
                  <Flame className="w-3 h-3 text-red-600" /> 1909 — Present
                </span>
                <span className="text-xs font-mono text-slate-300">
                  {HISTORICAL_NHL_ROMS.length + OFFICIAL_LEAGUE_ROMS.length + MISC_ROMS.length}+ Builds Available
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white font-serif drop-shadow-md">
                ROMs & Modded Files
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 font-sans mt-1 leading-relaxed">
                Official tournament editions, century-spanning historical NHL seasons (1909–Present), arcade cross-game mashups, and Netplay packages.
              </p>
            </div>

            <div className="hidden lg:flex items-center gap-2 pointer-events-auto self-end">
              <Link
                href="/setup-guide?tab=netplay"
                className="bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-black uppercase px-4 py-2.5 rounded shadow-lg transition-colors flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" /> Netplay Setup Guide &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Jump Area Nav Tabs */}
        <div className="bg-[#12141a] border-t border-slate-800 px-4 py-2.5">
          <div className="max-w-[1500px] mx-auto flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-400 font-bold uppercase mr-1 text-[11px] flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-amber-400" /> Jump To Area:
              </span>
              <button
                onClick={() => setActiveSection('all')}
                className={`px-3 py-1.5 rounded transition cursor-pointer font-bold uppercase text-[11px] ${
                  activeSection === 'all' 
                    ? 'bg-amber-500 text-black shadow-xs' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                All Areas
              </button>
              <button
                onClick={() => setActiveSection('nhl-history')}
                className={`px-3 py-1.5 rounded transition cursor-pointer font-bold uppercase text-[11px] flex items-center gap-1.5 ${
                  activeSection === 'nhl-history' 
                    ? 'bg-amber-500 text-black shadow-xs' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                🏒 NHL Seasons (1909–Pres) <span className="text-[10px] opacity-75">({HISTORICAL_NHL_ROMS.length})</span>
              </button>
              <button
                onClick={() => setActiveSection('leagues')}
                className={`px-3 py-1.5 rounded transition cursor-pointer font-bold uppercase text-[11px] flex items-center gap-1.5 ${
                  activeSection === 'leagues' 
                    ? 'bg-amber-500 text-black shadow-xs' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                🏆 League ROMs (W, Q, V, G) <span className="text-[10px] opacity-75">({OFFICIAL_LEAGUE_ROMS.length})</span>
              </button>
              <button
                onClick={() => setActiveSection('misc')}
                className={`px-3 py-1.5 rounded transition cursor-pointer font-bold uppercase text-[11px] flex items-center gap-1.5 ${
                  activeSection === 'misc' 
                    ? 'bg-amber-500 text-black shadow-xs' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                🕹️ Misc & Other Games <span className="text-[10px] opacity-75">({MISC_ROMS.length})</span>
              </button>
              <button
                onClick={() => setActiveSection('utilities')}
                className={`px-3 py-1.5 rounded transition cursor-pointer font-bold uppercase text-[11px] flex items-center gap-1.5 ${
                  activeSection === 'utilities' 
                    ? 'bg-amber-500 text-black shadow-xs' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                🛠️ Utilities & Emulators <span className="text-[10px] opacity-75">({UTILITY_PACKS_DATA.length})</span>
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-slate-400 text-[11px]">
              <Info className="w-3.5 h-3.5 text-amber-400" />
              <span>Netplay requires matching MD5 checksums</span>
            </div>
          </div>
        </div>

      </div>

      {/* Main Content Body */}
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 pt-8">

        {/* Netplay Checksum Advisory Card */}
        <div className="border-2 border-black bg-amber-50 p-4 mb-8 shadow-xs rounded-sm">
          <div className="flex items-center gap-2 font-mono font-black text-xs uppercase text-amber-900 mb-1">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" /> Netplay Checksum Integrity Notice
          </div>
          <p className="font-sans text-xs text-slate-800 leading-relaxed">
            Genesis Netplay matches require bit-identical ROM binaries between both players. If you experience unexpected desynchronization during an online match, copy the MD5 checksum below and compare it in RetroArch to ensure exact parity.
          </p>
        </div>

        {/* ===================================================================== */}
        {/* AREA 1: ALL HISTORICAL NHL ROMS (1909 - PRESENT, OVER 100 ROMS)       */}
        {/* ===================================================================== */}
        {(activeSection === 'all' || activeSection === 'nhl-history') && (
          <section id="nhl-history" className="mb-14 scroll-mt-6">
            <div className="border-b-4 border-black pb-3 mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono font-black uppercase text-amber-800 tracking-wider mb-1">
                  <span>🏒 Vault Archive</span>
                  <span>•</span>
                  <span>1909 through 2026</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black font-serif">
                  All Historical NHL Season ROMs
                </h2>
                <p className="text-xs text-slate-600 font-sans mt-0.5">
                  Over a century of hockey history faithfully converted into playable 16-bit Genesis ROMs.
                </p>
              </div>

              {/* Search & Era Filters */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search year, team, modder..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded font-sans focus:outline-none focus:ring-2 focus:ring-black shadow-2xs"
                  />
                  {historySearch && (
                    <button
                      onClick={() => setHistorySearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-black cursor-pointer font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="flex items-center border border-slate-300 bg-white rounded text-xs font-mono">
                  <button
                    onClick={() => setHistoryViewMode('grid')}
                    className={`px-2.5 py-1.5 transition cursor-pointer font-bold uppercase text-[11px] ${
                      historyViewMode === 'grid' ? 'bg-black text-white' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    Cards
                  </button>
                  <button
                    onClick={() => setHistoryViewMode('table')}
                    className={`px-2.5 py-1.5 transition cursor-pointer font-bold uppercase text-[11px] ${
                      historyViewMode === 'table' ? 'bg-black text-white' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    Table
                  </button>
                </div>
              </div>
            </div>

            {/* Era Filter Badges */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-6 scrollbar-thin font-mono text-xs">
              {[
                { id: 'all', label: 'All Eras' },
                { id: 'present-2020s', label: '2020s & Present' },
                { id: 'modern-2010s', label: '2010s' },
                { id: 'modern-2000s', label: '2000s' },
                { id: 'golden-90s', label: '90s Golden Era' },
                { id: 'dynasties-80s', label: '80s Dynasties' },
                { id: 'expansion-70s', label: '70s Expansion' },
                { id: 'original-six', label: 'Original Six (1942-67)' },
                { id: 'pre-war', label: 'Pre-War (1909-41)' }
              ].map(era => (
                <button
                  key={era.id}
                  onClick={() => setSelectedEra(era.id)}
                  className={`px-3 py-1 rounded-full whitespace-nowrap text-[11px] font-bold uppercase transition cursor-pointer ${
                    selectedEra === era.id
                      ? 'bg-black text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-300 hover:border-black'
                  }`}
                >
                  {era.label}
                </button>
              ))}
            </div>

            {/* Historical ROMs Content (Grid or Table) */}
            {filteredHistoricalRoms.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-300 p-8 text-center rounded">
                <p className="text-sm font-mono text-slate-500">No historical seasons match your search query.</p>
                <button
                  onClick={() => { setHistorySearch(''); setSelectedEra('all'); }}
                  className="mt-2 text-xs font-mono font-bold text-amber-700 underline cursor-pointer"
                >
                  Reset all filters
                </button>
              </div>
            ) : historyViewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredHistoricalRoms.map((rom) => (
                  <div
                    key={rom.id}
                    className="border-2 border-black bg-white shadow-[3px_3px_0px_rgba(0,0,0,1)] flex flex-col justify-between hover:translate-y-[-1px] transition-transform overflow-hidden"
                  >
                    <div>
                      {/* ROM Image Preview / Retro Ice Placeholder - Uses year, e.g. 1994.png */}
                      <RomThumbnail
                        imagePath={rom.imageUrl || `${rom.year}.png`}
                        alt={rom.seasonLabel}
                        eraOrCategory={rom.eraLabel}
                        onEnlarge={() => setActivePreview({
                          imageUrl: getRomImageUrl(rom.imageUrl || `${rom.year}.png`)!,
                          title: rom.seasonLabel,
                          subtitle: `${rom.eraLabel} • Mod: ${rom.modder || 'Community'}`,
                          badge: `${rom.year}`,
                          fileName: rom.fileName,
                          downloadCandidates: [`${rom.year}.zip`, `${rom.year}.bin`, rom.fileName],
                          downloadUrl: rom.downloadUrl
                        })}
                      />

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <span className="bg-amber-100 text-amber-900 border border-amber-300 font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded inline-block">
                              {rom.eraLabel}
                            </span>
                            <span className="font-mono text-xs font-black text-slate-500 ml-2">
                              {rom.year}
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-slate-400 font-bold">
                            {rom.fileSize}
                          </span>
                        </div>

                        <h3 className="font-serif text-base font-black uppercase text-black leading-snug mb-1">
                          {rom.seasonLabel}
                        </h3>

                        {rom.champion && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-800 mb-2 font-mono">
                            <Trophy className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span className="font-bold">Champion:</span>
                            <span className="truncate">{rom.champion}</span>
                          </div>
                        )}

                        <p className="text-xs text-slate-600 font-sans leading-relaxed mb-3">
                          {rom.features}
                        </p>

                        {rom.notableTeams && rom.notableTeams.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {rom.notableTeams.map((team, idx) => (
                              <span 
                                key={idx}
                                className="bg-slate-100 text-slate-700 text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-200"
                              >
                                {team}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="px-4 pb-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                      <div className="text-[10px] font-mono text-slate-500 truncate">
                        Mod: <span className="font-bold text-slate-700">{rom.modder || 'Community'}</span>
                      </div>

                      <button
                        onClick={() => handleDownload([`${rom.year}.zip`, `${rom.year}.bin`, rom.fileName], rom.seasonLabel, rom.downloadUrl, rom.id)}
                        className="px-3 py-1.5 bg-black hover:bg-amber-600 text-white font-mono text-xs font-bold uppercase transition-colors flex items-center gap-1.5 rounded cursor-pointer shrink-0"
                      >
                        <Download className="w-3 h-3" /> {downloadingId === rom.id ? 'Connecting...' : 'Download ROM'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border-2 border-black overflow-x-auto shadow-[3px_3px_0px_rgba(0,0,0,1)]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-neutral-900 text-white font-mono uppercase text-[11px] border-b-2 border-black">
                      <th className="p-3 w-16 text-center">Preview</th>
                      <th className="p-3 w-16">Year</th>
                      <th className="p-3">Season & Title</th>
                      <th className="p-3 w-40">Champion</th>
                      <th className="p-3">Features & Summary</th>
                      <th className="p-3 w-32">Modder</th>
                      <th className="p-3 w-28 text-right">Download</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistoricalRoms.map((rom, idx) => (
                      <tr key={rom.id} className={`border-b border-slate-200 hover:bg-amber-50/60 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                        <td className="p-2 text-center">
                          <TableThumbnail
                            imagePath={rom.imageUrl || `${rom.year}.png`}
                            alt={rom.seasonLabel}
                            onClick={() => setActivePreview({
                              imageUrl: getRomImageUrl(rom.imageUrl || `${rom.year}.png`)!,
                              title: rom.seasonLabel,
                              subtitle: `${rom.eraLabel} • ${rom.year}`,
                              badge: `${rom.year}`,
                              fileName: rom.fileName,
                              downloadCandidates: [`${rom.year}.zip`, `${rom.year}.bin`, rom.fileName],
                              downloadUrl: rom.downloadUrl
                            })}
                          />
                        </td>
                        <td className="p-3 font-mono font-black">{rom.year}</td>
                        <td className="p-3 font-bold font-serif text-slate-900">{rom.seasonLabel}</td>
                        <td className="p-3 font-mono text-slate-700">{rom.champion || '—'}</td>
                        <td className="p-3 text-slate-600 max-w-md truncate">{rom.features}</td>
                        <td className="p-3 font-mono text-slate-500 text-[11px]">{rom.modder || 'Community'}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDownload([`${rom.year}.zip`, `${rom.year}.bin`, rom.fileName], rom.seasonLabel, rom.downloadUrl, `table-${rom.id}`)}
                            className="px-2.5 py-1 bg-black hover:bg-amber-600 text-white font-mono text-[10px] font-bold uppercase transition-colors inline-flex items-center gap-1 rounded cursor-pointer"
                          >
                            <Download className="w-3 h-3" /> {downloadingId === `table-${rom.id}` ? '...' : 'Download'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ===================================================================== */}
        {/* AREA 2: OFFICIAL COMMUNITY LEAGUE TOURNAMENT ROMS                     */}
        {/* ===================================================================== */}
        {(activeSection === 'all' || activeSection === 'leagues') && (
          <section id="leagues" className="mb-14 scroll-mt-6">
            <div className="border-b-4 border-black pb-3 mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono font-black uppercase text-amber-800 tracking-wider mb-1">
                  <span>🏆 Official Builds</span>
                  <span>•</span>
                  <span>Netplay Verified</span>
                  <span>•</span>
                  <span>{OFFICIAL_LEAGUE_ROMS.length} Historical Seasons</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black font-serif">
                  Official League Tournament ROMs
                </h2>
                <p className="text-xs text-slate-600 font-sans mt-0.5">
                  The complete historical archives from Season 1 to Active for The W League, The Q, Golden Era, Vintage Grail Cup, and Original Six.
                </p>
              </div>

              {/* Search, Sort, and Cards/Table Controls */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Search Input */}
                <div className="relative min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={leagueSearch}
                    onChange={(e) => setLeagueSearch(e.target.value)}
                    placeholder="Search season, code (e.g. W01), year, champion..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded font-sans focus:outline-none focus:ring-2 focus:ring-black shadow-2xs"
                  />
                  {leagueSearch && (
                    <button
                      onClick={() => setLeagueSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-black cursor-pointer font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Sort Order Toggle */}
                <div className="flex items-center border border-slate-300 bg-white rounded text-xs font-mono">
                  <button
                    onClick={() => setLeagueSortOrder('latest')}
                    className={`px-2.5 py-1.5 transition cursor-pointer font-bold uppercase text-[11px] ${
                      leagueSortOrder === 'latest' ? 'bg-black text-white' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                    title="Sort newest seasons first"
                  >
                    Latest First
                  </button>
                  <button
                    onClick={() => setLeagueSortOrder('oldest')}
                    className={`px-2.5 py-1.5 transition cursor-pointer font-bold uppercase text-[11px] ${
                      leagueSortOrder === 'oldest' ? 'bg-black text-white' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                    title="Sort starting from Season 1"
                  >
                    Season 1 First
                  </button>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center border border-slate-300 bg-white rounded text-xs font-mono">
                  <button
                    onClick={() => setLeagueViewMode('grid')}
                    className={`px-2.5 py-1.5 transition cursor-pointer font-bold uppercase text-[11px] ${
                      leagueViewMode === 'grid' ? 'bg-black text-white' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    Cards
                  </button>
                  <button
                    onClick={() => setLeagueViewMode('table')}
                    className={`px-2.5 py-1.5 transition cursor-pointer font-bold uppercase text-[11px] ${
                      leagueViewMode === 'table' ? 'bg-black text-white' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    Table
                  </button>
                </div>
              </div>
            </div>

            {/* League Code Selector Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-6 scrollbar-thin font-mono text-xs">
              {[
                { id: 'all', label: `All Leagues (${OFFICIAL_LEAGUE_ROMS.length})` },
                { id: 'W', label: `The W League (${OFFICIAL_LEAGUE_ROMS.filter(r => r.leagueCode === 'W').length})` },
                { id: 'Q', label: `The Q League (${OFFICIAL_LEAGUE_ROMS.filter(r => r.leagueCode === 'Q').length})` },
                { id: 'G', label: `Golden Era (${OFFICIAL_LEAGUE_ROMS.filter(r => r.leagueCode === 'G').length})` },
                { id: 'V', label: `Vintage Grail (${OFFICIAL_LEAGUE_ROMS.filter(r => r.leagueCode === 'V').length})` },
                { id: 'O', label: `Original 6 (${OFFICIAL_LEAGUE_ROMS.filter(r => r.leagueCode === 'O').length})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedLeagueFilter(tab.id)}
                  className={`px-3 py-1 rounded-full whitespace-nowrap text-[11px] font-bold uppercase transition cursor-pointer ${
                    selectedLeagueFilter === tab.id
                      ? 'bg-black text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-300 hover:border-black'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* League Content (Cards or Table) */}
            {filteredLeagueRoms.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-300 p-8 text-center rounded">
                <p className="text-sm font-mono text-slate-500">No league tournament seasons match your search query.</p>
                <button
                  onClick={() => { setLeagueSearch(''); setSelectedLeagueFilter('all'); }}
                  className="mt-2 text-xs font-mono font-bold text-amber-700 underline cursor-pointer"
                >
                  Reset all filters
                </button>
              </div>
            ) : leagueViewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredLeagueRoms.map((rom) => (
                  <div
                    key={rom.id}
                    className={`border-2 border-black bg-[#fdfaf5] shadow-[4px_4px_0px_rgba(0,0,0,1)] flex flex-col justify-between relative overflow-hidden ${
                      rom.isActive ? 'ring-2 ring-amber-500' : ''
                    }`}
                  >
                    {rom.isActive && (
                      <div className="absolute top-2 right-4 z-20 bg-amber-500 text-black font-mono text-[9px] font-black uppercase px-2 py-0.5 border border-black shadow-xs">
                        ★ Active Season Tournament Build ★
                      </div>
                    )}

                    <div>
                      {/* Official League Image Preview */}
                      <RomThumbnail
                        imagePath={rom.imageUrl || `${rom.id}.png`}
                        alt={rom.seasonName}
                        eraOrCategory={rom.league}
                        className="aspect-[16/8]"
                        onEnlarge={() => setActivePreview({
                          imageUrl: getRomImageUrl(rom.imageUrl || `${rom.id}.png`)!,
                          title: rom.seasonName,
                          subtitle: `${rom.league} • ${rom.nhlYear} NHL Base`,
                          badge: rom.badge || (rom.isActive ? 'ACTIVE' : rom.id.toUpperCase()),
                          fileName: rom.fileName,
                          downloadCandidates: [`${rom.id}.zip`, `${rom.id}.bin`, rom.fileName],
                          downloadUrl: rom.downloadUrl
                        })}
                      />

                      <div className="p-4">
                        <div className="flex justify-between items-start mb-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="bg-amber-100 text-amber-900 border border-amber-300 font-mono text-[9px] font-black uppercase px-1.5 py-0.5 rounded inline-block">
                              {rom.id.toUpperCase()}
                            </span>
                            <span className="font-mono text-xs font-black text-slate-500">
                              {rom.nhlYear} NHL Base
                            </span>
                          </div>
                          {rom.badge && (
                            <span className="bg-black text-white font-mono text-[9px] font-black uppercase px-1.5 py-0.5">
                              {rom.badge}
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-black uppercase text-black font-serif leading-snug mb-1">
                          {rom.seasonName}
                        </h3>

                        {rom.champion && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-800 mb-2 font-mono bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                            <Trophy className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span className="font-bold text-[11px]">Champion:</span>
                            <span className="truncate text-[11px] font-semibold">{rom.champion}</span>
                          </div>
                        )}

                        {rom.rulesSummary && (
                          <div className="text-[10px] font-mono text-slate-600 bg-neutral-100 px-2 py-1 rounded border border-neutral-200 mb-3">
                            {rom.rulesSummary}
                          </div>
                        )}

                        <p className="font-sans text-xs text-slate-700 leading-relaxed mb-4">
                          {rom.description}
                        </p>

                        <div className="bg-neutral-100 border border-neutral-300 p-2.5 font-mono text-[11px] space-y-1.5 text-slate-800 mb-3 rounded-xs">
                          <div className="truncate text-[10px]"><strong>Binary:</strong> {rom.fileName} ({rom.fileSize})</div>
                          <div className="flex items-center justify-between text-[10px] text-slate-600 pt-1 border-t border-neutral-200">
                            <span className="truncate font-mono"><strong>MD5:</strong> {rom.md5}</span>
                            <button
                              onClick={() => copyMd5(rom.md5, rom.id)}
                              className="ml-2 px-1.5 py-0.5 bg-white border border-black text-[9px] font-bold uppercase hover:bg-black hover:text-white cursor-pointer shrink-0 transition-colors"
                            >
                              {copiedMd5 === rom.id ? 'COPIED!' : 'COPY'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-4 pt-0 border-t-0">
                      <button
                        onClick={() => handleDownload([`${rom.id}.zip`, `${rom.id}.bin`, rom.fileName], rom.seasonName, rom.downloadUrl, rom.id)}
                        className="flex-1 text-center bg-black hover:bg-amber-600 text-white font-mono text-xs font-bold uppercase py-2 transition-colors flex items-center justify-center gap-1.5 rounded-xs cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> {downloadingId === rom.id ? 'Connecting...' : 'Download ROM'}
                      </button>
                      <Link
                        href="/setup-guide?tab=netplay"
                        className="px-3 py-2 border border-black font-mono text-xs font-bold uppercase hover:bg-neutral-100 transition-colors rounded-xs"
                        title="Netplay Connection Guide"
                      >
                        Setup &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* League Table View */
              <div className="bg-white border-2 border-black overflow-x-auto shadow-[3px_3px_0px_rgba(0,0,0,1)]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-neutral-900 text-white font-mono uppercase text-[11px] border-b-2 border-black">
                      <th className="p-3 w-16 text-center">Preview</th>
                      <th className="p-3 w-20">Code</th>
                      <th className="p-3">Season & Title</th>
                      <th className="p-3 w-24">Base Year</th>
                      <th className="p-3">Rules & Structure</th>
                      <th className="p-3 w-44">Champion</th>
                      <th className="p-3 w-24 text-center">Status</th>
                      <th className="p-3 w-28 text-right">Download</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeagueRoms.map((rom, idx) => (
                      <tr key={rom.id} className={`border-b border-slate-200 hover:bg-amber-50/60 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                        <td className="p-2 text-center">
                          <TableThumbnail
                            imagePath={rom.imageUrl || `${rom.id}.png`}
                            alt={rom.seasonName}
                            onClick={() => setActivePreview({
                              imageUrl: getRomImageUrl(rom.imageUrl || `${rom.id}.png`)!,
                              title: rom.seasonName,
                              subtitle: `${rom.league} • ${rom.nhlYear} NHL Base`,
                              badge: rom.badge || rom.id.toUpperCase(),
                              fileName: rom.fileName,
                              downloadCandidates: [`${rom.id}.zip`, `${rom.id}.bin`, rom.fileName],
                              downloadUrl: rom.downloadUrl
                            })}
                          />
                        </td>
                        <td className="p-3 font-mono font-black">
                          <span className="bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded text-[10px]">
                            {rom.id.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 font-bold font-serif text-slate-900">
                          {rom.seasonName}
                          <div className="font-mono text-[10px] text-slate-500 font-normal mt-0.5">{rom.league}</div>
                        </td>
                        <td className="p-3 font-mono font-black text-slate-700">{rom.nhlYear}</td>
                        <td className="p-3 font-mono text-[11px] text-slate-600 max-w-xs">{rom.rulesSummary || 'Standard Netplay'}</td>
                        <td className="p-3 font-mono text-slate-700 text-[11px]">{rom.champion || '—'}</td>
                        <td className="p-3 text-center">
                          {rom.isActive ? (
                            <span className="bg-emerald-600 text-white font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="bg-slate-200 text-slate-700 font-mono text-[9px] font-bold uppercase px-2 py-0.5 rounded">
                              VAULT
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDownload([`${rom.id}.zip`, `${rom.id}.bin`, rom.fileName], rom.seasonName, rom.downloadUrl, `table-${rom.id}`)}
                            className="px-2.5 py-1 bg-black hover:bg-amber-600 text-white font-mono text-[10px] font-bold uppercase transition-colors inline-flex items-center gap-1 rounded cursor-pointer"
                          >
                            <Download className="w-3 h-3" /> {downloadingId === `table-${rom.id}` ? '...' : 'Download'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ===================================================================== */}
        {/* AREA 3: MISC ROMS & OTHER GAMES (THEMED WITH HERO MASHUP ARTWORK)     */}
        {/* ===================================================================== */}
        {(activeSection === 'all' || activeSection === 'misc') && (
          <section id="misc" className="mb-14 scroll-mt-6">
            <div className="border-b-4 border-black pb-3 mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono font-black uppercase text-purple-700 tracking-wider mb-1">
                  <span>🕹️ Arcade & Cross-Sport Mods</span>
                  <span>•</span>
                  <span>Featured Collection</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black font-serif flex items-center gap-2">
                  <Gamepad2 className="w-7 h-7 text-purple-700" /> Misc ROMs & Other Games
                </h2>
                <p className="text-xs text-slate-600 font-sans mt-0.5">
                  Community-created arcade crossovers, basketball conversions, NCAA college hockey, and fighting game mashups.
                </p>
              </div>

              {/* Misc Category Selector */}
              <div className="flex items-center gap-1.5 overflow-x-auto font-mono text-xs">
                {[
                  { id: 'all', label: 'All Misc' },
                  { id: 'Cross-Sport', label: 'Basketball / NBA' },
                  { id: 'Arcade Mashup', label: 'Arcade / Fighting' },
                  { id: 'International', label: 'IIHF World' },
                  { id: 'College', label: 'NCAA College' },
                  { id: 'Pop Culture', label: '16-Bit All-Stars' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedMiscCategory(cat.id)}
                    className={`px-3 py-1 rounded text-[11px] font-bold uppercase transition cursor-pointer ${
                      selectedMiscCategory === cat.id
                        ? 'bg-purple-900 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-300 hover:border-black'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Featured Hero Card For Misc Collection */}
            <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white p-5 sm:p-6 rounded-lg border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] mb-6 flex flex-col md:flex-row items-center gap-6">
              <div className="w-full md:w-1/3 aspect-[16/9] rounded-md overflow-hidden border border-purple-500/50 shadow-md shrink-0">
                <img 
                  src="/images/roms-hero-banner.jpg" 
                  alt="Retro Gaming Mashup Collage" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 text-center md:text-left">
                <span className="bg-purple-600 text-white font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-widest inline-block mb-1">
                  Community Showcase
                </span>
                <h3 className="text-xl sm:text-2xl font-black uppercase font-serif tracking-tight text-white mb-2">
                  Retro Crossovers & Multi-Sport Genesis Hacks
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed font-sans mb-3">
                  The Genesis 16-bit engine has been modded into unexpected masterpieces by passionate modders: from Michael Jordan dunking on frozen ponds in NBA On Ice to Street Fighter Hadouken slapshots and the 32-team IIHF World Championship.
                </p>
                <div className="flex items-center gap-2 font-mono text-[11px] text-purple-300">
                  <span>★ Featuring Michael Jordan, Sonic, Street Fighter, Mortal Kombat, and Mario</span>
                </div>
              </div>
            </div>

            {/* Misc ROMs Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredMiscRoms.map((rom) => (
                <div
                  key={rom.id}
                  className="border-2 border-black bg-white shadow-[3px_3px_0px_rgba(0,0,0,1)] flex flex-col justify-between hover:translate-y-[-1px] transition-transform overflow-hidden"
                >
                  <div>
                    {/* Misc ROM Cover / Screenshot Preview */}
                    <RomThumbnail
                      imagePath={rom.imageUrl || rom.coverImage}
                      alt={rom.title}
                      eraOrCategory={rom.category}
                      className="aspect-[16/9]"
                      onEnlarge={() => {
                        const cleanTitle = rom.title.replace(/[:\/\\?*|<">]/g, '').trim();
                        setActivePreview({
                          imageUrl: getRomImageUrl(rom.imageUrl || rom.coverImage)!,
                          title: rom.title,
                          subtitle: `${rom.platform} • Author: ${rom.author}`,
                          badge: rom.category,
                          fileName: rom.fileName,
                          downloadCandidates: [`${cleanTitle}.zip`, `${cleanTitle}.bin`, rom.fileName],
                          downloadUrl: rom.downloadUrl
                        });
                      }}
                    />

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="bg-purple-100 text-purple-900 border border-purple-300 font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded">
                          {rom.category}
                        </span>
                        <span className="font-mono text-xs text-slate-400 font-bold">
                          {rom.releaseYear}
                        </span>
                      </div>

                      <h4 className="font-serif text-base font-black uppercase text-black leading-snug mb-1">
                        {rom.title}
                      </h4>

                      <div className="text-[11px] font-mono text-slate-500 mb-2">
                        Platform: <span className="text-slate-800 font-bold">{rom.platform}</span>
                      </div>

                      <p className="text-xs text-slate-600 font-sans leading-relaxed mb-3">
                        {rom.description}
                      </p>

                      <div className="flex flex-wrap gap-1 mb-3">
                        {rom.tags.map((tag, i) => (
                          <span key={i} className="bg-slate-100 text-slate-700 text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-200">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="px-4 pb-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                    <div className="text-[10px] font-mono text-slate-500 truncate">
                      Author: <span className="font-bold text-slate-700">{rom.author}</span>
                    </div>

                    <button
                      onClick={() => {
                        const cleanTitle = rom.title.replace(/[:\/\\?*|<">]/g, '').trim();
                        handleDownload([`${cleanTitle}.zip`, `${cleanTitle}.bin`, rom.fileName], rom.title, rom.downloadUrl, rom.id);
                      }}
                      className="px-3 py-1.5 bg-purple-900 hover:bg-black text-white font-mono text-xs font-bold uppercase transition-colors flex items-center gap-1.5 rounded cursor-pointer shrink-0"
                    >
                      <Download className="w-3 h-3" /> {downloadingId === rom.id ? 'Connecting...' : 'Download Mod'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ===================================================================== */}
        {/* AREA 4: UTILITIES, EMULATORS & BROADCAST MEDIA                        */}
        {/* ===================================================================== */}
        {(activeSection === 'all' || activeSection === 'utilities') && (
          <section id="utilities" className="mb-14 scroll-mt-6">
            <div className="border-b-4 border-black pb-3 mb-6">
              <div className="flex items-center gap-2 text-xs font-mono font-black uppercase text-amber-800 tracking-wider mb-1">
                <span>🛠️ Competitive Tooling</span>
                <span>•</span>
                <span>Turnkey Packages</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black font-serif flex items-center gap-2">
                <Wrench className="w-6 h-6 text-amber-700" /> Utility Kits, Overlays & Tools
              </h2>
              <p className="text-xs text-slate-600 font-sans mt-0.5">
                Pre-configured Genesis Plus GX packages, stream scorebugs, arena organ synthesizers, and ROM editor suites.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {UTILITY_PACKS_DATA.map((pack) => (
                <div key={pack.id} className="border-2 border-black bg-white shadow-[3px_3px_0px_rgba(0,0,0,1)] flex flex-col justify-between overflow-hidden">
                  <div>
                    {pack.imageUrl && (
                      <RomThumbnail
                        imagePath={pack.imageUrl}
                        alt={pack.title}
                        eraOrCategory={pack.category}
                        className="aspect-[16/8]"
                        onEnlarge={() => {
                          const cleanTitle = pack.title.replace(/[:\/\\?*|<">]/g, '').trim();
                          setActivePreview({
                            imageUrl: getRomImageUrl(pack.imageUrl)!,
                            title: pack.title,
                            subtitle: pack.desc,
                            badge: pack.category,
                            fileName: pack.fileName,
                            downloadCandidates: [`${cleanTitle}.zip`, pack.fileName],
                            downloadUrl: pack.downloadUrl
                          });
                        }}
                      />
                    )}

                    <div className="p-4">
                      <div className="flex items-center justify-between text-xs font-mono font-black text-amber-800 uppercase mb-2">
                        <span className="flex items-center gap-1">
                          <FileArchive className="w-3.5 h-3.5 text-amber-700" /> {pack.category}
                        </span>
                        <span className="text-slate-500 text-[10px]">{pack.fileSize}</span>
                      </div>

                      <h3 className="font-serif font-black text-sm uppercase mb-2 leading-snug text-black">
                        {pack.title}
                      </h3>
                      <p className="font-sans text-xs text-slate-700 leading-relaxed mb-4">
                        {pack.desc}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    <button
                      onClick={() => {
                        const cleanTitle = pack.title.replace(/[:\/\\?*|<">]/g, '').trim();
                        handleDownload([`${cleanTitle}.zip`, pack.fileName], pack.title, pack.downloadUrl, pack.id);
                      }}
                      className="w-full text-center border border-black bg-white hover:bg-black hover:text-white font-mono text-xs font-bold uppercase py-2 transition-colors rounded-xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> {downloadingId === pack.id ? 'Connecting...' : 'Download Package'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ===================================================================== */}
        {/* 5. COMMUNITY ROM SUBMISSION CALLOUT                                    */}
        {/* ===================================================================== */}
        <div className="border-3 border-black bg-neutral-900 text-white p-6 sm:p-8 rounded shadow-[5px_5px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-2xl">
            <span className="bg-amber-400 text-black font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-widest inline-block mb-1.5">
              Have a Modded ROM to Share?
            </span>
            <h3 className="text-xl sm:text-2xl font-black uppercase font-serif tracking-tight text-white mb-2">
              Contribute To The NHL95 ROM Vault
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
              Are you a ROM hacker or historian who has built an unlisted season, international tournament, or retro sports mashup? Join our Discord server to submit your `.bin` build, changelogs, and custom team center ice banners to be cataloged in the repository.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <a
              href="https://discord.gg/nhl95"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-black uppercase px-5 py-3 rounded transition-colors flex items-center gap-2 shadow-sm"
            >
              <Users className="w-4 h-4" /> Submit ROM on Discord &rarr;
            </a>
            <Link
              href="/setup-guide"
              className="border border-white/40 hover:bg-white/10 text-white font-mono text-xs font-bold uppercase px-4 py-3 rounded transition-colors text-center"
            >
              Setup Guide
            </Link>
          </div>
        </div>

      </div>

      {/* ===================================================================== */}
      {/* 6. FULLSCREEN RETRO IMAGE LIGHTBOX MODAL                              */}
      {/* ===================================================================== */}
      {activePreview && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setActivePreview(null)}
        >
          <div 
            className="bg-neutral-950 border-3 border-amber-500 text-white max-w-4xl w-full rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-900">
              <div className="flex items-center gap-2 flex-wrap">
                {activePreview.badge && (
                  <span className="bg-amber-500 text-black font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded">
                    {activePreview.badge}
                  </span>
                )}
                <h3 className="font-serif text-base sm:text-xl font-black text-white uppercase truncate">
                  {activePreview.title}
                </h3>
              </div>
              <button
                onClick={() => setActivePreview(null)}
                className="p-1.5 hover:bg-neutral-800 rounded text-slate-400 hover:text-white transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {activePreview.subtitle && (
              <div className="px-4 py-1.5 bg-neutral-900/60 border-b border-neutral-800 text-xs font-mono text-slate-400">
                {activePreview.subtitle}
              </div>
            )}

            {/* Modal Image Body */}
            <div className="relative flex-1 bg-black flex items-center justify-center p-4 min-h-[300px] max-h-[60vh] overflow-hidden">
              <img
                src={activePreview.imageUrl}
                alt={activePreview.title}
                className="max-h-full max-w-full object-contain rounded border border-neutral-800 shadow-xl"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-800 bg-neutral-900 flex items-center justify-between flex-wrap gap-3">
              <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                <span>Hosting: <strong className="text-amber-400">Supabase rom-images</strong></span>
              </div>
              <div className="flex items-center gap-2">
                {(activePreview.downloadCandidates || activePreview.fileName) && (
                  <button
                    onClick={() => {
                      const candidates = activePreview.downloadCandidates || (activePreview.fileName ? [activePreview.fileName] : []);
                      handleDownload(candidates, activePreview.title, activePreview.downloadUrl, 'modal');
                    }}
                    className="bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-black uppercase px-4 py-2 rounded flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> {downloadingId === 'modal' ? 'Connecting...' : 'Download ROM'}
                  </button>
                )}
                <button
                  onClick={() => setActivePreview(null)}
                  className="border border-neutral-700 hover:bg-neutral-800 text-slate-300 font-mono text-xs font-bold uppercase px-3 py-2 rounded cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
