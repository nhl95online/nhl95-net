"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, ChevronDown, CheckCircle2, X, ZoomIn, ZoomOut, RotateCcw, Info, Sparkles, Flame, Award
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getTeamBannerUrls } from '../standings/page';

// ==========================================
// 1. TYPES & DATA HELPERS
// ==========================================

export interface SeriesGameResult {
  game_number: number;
  home_score: number;
  away_score: number;
  home_team_id: number;
  away_team_id: number;
}

export interface PlayoffTeam {
  team_id: number;
  team_name: string;
  abbreviation: string;
  banner_filename?: string;
  banner_url?: string | null;
  fallback_urls?: string[];
}

export interface PlayoffMatch {
  id?: number;
  league_id?: number | string;
  season_id?: number | string;
  match_label: string;
  home_team_id?: number;
  away_team_id?: number;
  home_team_seed?: number | string;
  away_team_seed?: number | string;
  series_length?: number;
  home_team?: PlayoffTeam | null;
  away_team?: PlayoffTeam | null;
  results?: SeriesGameResult[];
}

// Calculate series wins, winner, and status
export const getSeriesDetails = (match: PlayoffMatch | null | undefined) => {
  if (!match) {
    return {
      homeWins: 0,
      awayWins: 0,
      winsNeeded: 3,
      isComplete: false,
      winner: null as 'home' | 'away' | null,
      leader: null as 'home' | 'away' | 'tied' | null,
      statusPill: 'BO5',
      seriesLength: 5,
      games: [] as SeriesGameResult[]
    };
  }

  const parentHomeId = match.home_team_id;
  const parentAwayId = match.away_team_id;
  const seriesLength = match.series_length || 5;
  const winsNeeded = Math.ceil(seriesLength / 2);
  const games = match.results || [];

  let homeWins = 0;
  let awayWins = 0;

  games.forEach((game) => {
    const topTeamScore = game.home_team_id === parentHomeId ? game.home_score : game.away_score;
    const bottomTeamScore = game.away_team_id === parentAwayId ? game.away_score : game.home_score;

    if (topTeamScore !== undefined && topTeamScore !== null && bottomTeamScore !== undefined && bottomTeamScore !== null) {
      if (topTeamScore > bottomTeamScore) homeWins++;
      else if (bottomTeamScore > topTeamScore) awayWins++;
    }
  });

  const isComplete = homeWins >= winsNeeded || awayWins >= winsNeeded;
  const winner: 'home' | 'away' | null = homeWins >= winsNeeded ? 'home' : (awayWins >= winsNeeded ? 'away' : null);
  
  let leader: 'home' | 'away' | 'tied' | null = null;
  if (homeWins > awayWins) leader = 'home';
  else if (awayWins > homeWins) leader = 'away';
  else if (homeWins === awayWins && homeWins > 0) leader = 'tied';

  let statusPill = `BO${seriesLength}`;

  if (isComplete) {
    const winnerName = winner === 'home' 
      ? (match.home_team?.abbreviation || 'HOM') 
      : (match.away_team?.abbreviation || 'AWY');
    const winningScore = Math.max(homeWins, awayWins);
    const losingScore = Math.min(homeWins, awayWins);
    statusPill = `${winnerName} ${winningScore}-${losingScore}`;
  } else if (homeWins > 0 || awayWins > 0) {
    if (homeWins === awayWins) {
      statusPill = `TIED ${homeWins}-${awayWins}`;
    } else {
      const leaderName = leader === 'home' 
        ? (match.home_team?.abbreviation || 'HOM') 
        : (match.away_team?.abbreviation || 'AWY');
      const leaderScore = Math.max(homeWins, awayWins);
      const trailerScore = Math.min(homeWins, awayWins);
      statusPill = `${leaderName} ${leaderScore}-${trailerScore}`;
    }
  }

  return {
    homeWins,
    awayWins,
    winsNeeded,
    isComplete,
    winner,
    leader,
    statusPill,
    seriesLength,
    games
  };
};

// ==========================================
// 2. RETRO ARCADE MATCHUP CARD
// ==========================================

const MatchupCard = ({
  match = {} as PlayoffMatch,
  label,
  onSelect,
  isChampionship = false
}: {
  match?: PlayoffMatch;
  label: string;
  onSelect?: (match: PlayoffMatch, label: string) => void;
  isChampionship?: boolean;
}) => {
  const series = getSeriesDetails(match);
  const parentHomeId = match?.home_team_id;
  const parentAwayId = match?.away_team_id;

  const homeName = match?.home_team?.team_name || "TBD";
  const awayName = match?.away_team?.team_name || "TBD";

  const homeAbbr = match?.home_team?.abbreviation || (match?.home_team ? "HOM" : "TBD");
  const awayAbbr = match?.away_team?.abbreviation || (match?.away_team ? "AWY" : "TBD");

  const homeBanner = match?.home_team?.banner_url;
  const awayBanner = match?.away_team?.banner_url;

  const homeSeed = match?.home_team_seed !== null && match?.home_team_seed !== undefined ? match.home_team_seed : "";
  const awaySeed = match?.away_team_seed !== null && match?.away_team_seed !== undefined ? match.away_team_seed : "";

  const games = match?.results || [];

  const [homeImgFailed, setHomeImgFailed] = useState(false);
  const [awayImgFailed, setAwayImgFailed] = useState(false);

  const isHomeSeriesWinner = series.isComplete && series.winner === 'home';
  const isAwaySeriesWinner = series.isComplete && series.winner === 'away';

  return (
    <div 
      onClick={() => onSelect && onSelect(match, label)}
      className={`group relative p-1.5 w-[164px] select-none shrink-0 mx-auto transition-all cursor-pointer ${
        isChampionship 
          ? 'bg-[#fff9e6] border-[3px] border-black shadow-[4px_4px_0px_#d97706,4px_4px_0px_1px_#000] hover:shadow-[5px_5px_0px_#b45309,5px_5px_0px_1px_#000] hover:-translate-y-0.5' 
          : 'bg-[#fdfbf7] border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0'
      }`}
    >
      {/* Retro 90s Corner Accent for Championship */}
      {isChampionship && (
        <div className="absolute -top-2 -right-2 bg-amber-400 text-black border-2 border-black px-1 py-0.2 text-[6.5px] font-black uppercase font-mono tracking-tighter shadow-[1px_1px_0px_#000] z-20 flex items-center gap-0.5">
          <Sparkles className="w-2 h-2 text-black" /> FINALS
        </div>
      )}

      {/* Match Label Header Strip (Retro 90s Arcade Header) */}
      <div className={`text-[8px] font-black border border-black mb-1 text-center uppercase tracking-wider flex justify-between px-1.5 items-center py-0.5 ${
        isChampionship ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-black' : 'bg-black text-white'
      }`}>
        <span className="truncate max-w-[100px] font-sans">{label}</span>
        <span className={`text-[7px] font-mono font-black px-1 py-0.2 border ${
          isChampionship 
            ? 'bg-black text-amber-300 border-black' 
            : series.isComplete 
              ? 'bg-emerald-600 text-white border-emerald-400 [text-shadow:0_0_4px_#fff]' 
              : 'bg-neutral-800 text-neutral-200 border-neutral-600'
        }`}>
          {series.isComplete ? series.statusPill : `BO${series.seriesLength}`}
        </span>
      </div>

      <div className="flex flex-col items-center w-full">
        
        {/* 1. HOME TEAM LINE (TOP) */}
        <div className={`w-full flex items-center justify-between min-h-[22px] mb-0.5 px-1 border border-black/20 ${
          isHomeSeriesWinner ? 'bg-emerald-50/80 border-emerald-600' : 'bg-white/70'
        }`}>
          <div className="flex items-center gap-1 w-full justify-start overflow-hidden">
            {homeSeed && (
              <span className="bg-black text-white text-[7px] font-mono font-black px-0.5 py-0 shrink-0 border border-black">
                {homeSeed}
              </span>
            )}
            {homeBanner && !homeImgFailed ? (
              <img
                src={homeBanner}
                alt={homeName}
                className="h-[18px] max-w-[105px] w-auto object-contain block filter contrast-125"
                style={{ maxHeight: '18px', maxWidth: '105px', height: '18px', width: 'auto', objectFit: 'contain' }}
                onError={(e) => {
                  const target = e.currentTarget;
                  const fallbacks: string[] = match?.home_team?.fallback_urls || [];
                  const triedList = (target.dataset.tried || '').split('|');
                  const nextUrl = fallbacks.find((url: string) => url && !triedList.includes(url) && url !== target.src);

                  if (nextUrl) {
                    target.dataset.tried = `${target.dataset.tried || ''}|${nextUrl}`;
                    target.src = nextUrl;
                  } else {
                    setHomeImgFailed(true);
                  }
                }}
              />
            ) : (
              <span className="text-[9px] font-black truncate uppercase tracking-tight text-left w-full font-sans text-black">
                {homeName}
              </span>
            )}
          </div>
          {isHomeSeriesWinner && (
            <span className="text-[7px] font-mono font-black bg-emerald-600 text-white px-1 ml-1 shrink-0 uppercase border border-black [text-shadow:0_0_3px_#fff]">
              WIN
            </span>
          )}
        </div>

        {/* 2. RETRO SCOREBOARD MATRIX (GREEN BOX + GLOWING WHITE TEXT FOR WINNERS) */}
        <div className="flex flex-col gap-0.5 border-2 border-black p-0.5 w-full bg-[#1e232a] shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
          
          {/* Top Team Row */}
          <div className="flex items-center w-full px-0.5">
            <span className="text-[8.5px] font-mono font-black tracking-wider w-[32px] text-left shrink-0 uppercase text-amber-300">
              {homeAbbr}
            </span>
            <div className="flex gap-0.5 justify-end flex-1">
              {Array.from({ length: series.seriesLength }).map((_, index) => {
                const targetGameNumber = index + 1;
                const gameResult = games.find(g => g.game_number === targetGameNumber);

                if (!gameResult) {
                  return (
                    <div 
                      key={`home-g-${index}`} 
                      className="text-[8px] font-mono font-bold w-[14px] h-[14px] flex items-center justify-center border border-neutral-700 bg-neutral-900/90 text-neutral-600 rounded-none"
                    >
                      -
                    </div>
                  );
                }

                const topTeamScore = gameResult.home_team_id === parentHomeId ? gameResult.home_score : gameResult.away_score;
                const bottomTeamScore = gameResult.away_team_id === parentAwayId ? gameResult.away_score : gameResult.home_score;

                const hasScore = topTeamScore !== undefined && topTeamScore !== null;
                const isWinner = hasScore && topTeamScore > (bottomTeamScore || 0);

                return (
                  <div
                    key={`home-g-${index}`}
                    className={`text-[8.5px] font-mono font-black w-[14px] h-[14px] flex items-center justify-center border rounded-none transition-all ${
                      isWinner 
                        ? 'bg-[#16a34a] border-emerald-300 text-white shadow-[0_0_6px_rgba(34,197,94,0.9)] [text-shadow:0_0_5px_#ffffff,0_0_9px_rgba(255,255,255,0.9)] drop-shadow-[0_0_4px_#ffffff]' 
                        : 'bg-[#2b323d] border-neutral-700 text-neutral-300'
                    }`}
                  >
                    {hasScore ? topTeamScore : '-'}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Team Row */}
          <div className="flex items-center w-full px-0.5">
            <span className="text-[8.5px] font-mono font-black tracking-wider w-[32px] text-left shrink-0 uppercase text-amber-300">
              {awayAbbr}
            </span>
            <div className="flex gap-0.5 justify-end flex-1">
              {Array.from({ length: series.seriesLength }).map((_, index) => {
                const targetGameNumber = index + 1;
                const gameResult = games.find(g => g.game_number === targetGameNumber);

                if (!gameResult) {
                  return (
                    <div 
                      key={`away-g-${index}`} 
                      className="text-[8px] font-mono font-bold w-[14px] h-[14px] flex items-center justify-center border border-neutral-700 bg-neutral-900/90 text-neutral-600 rounded-none"
                    >
                      -
                    </div>
                  );
                }

                const topTeamScore = gameResult.home_team_id === parentHomeId ? gameResult.home_score : gameResult.away_score;
                const bottomTeamScore = gameResult.away_team_id === parentAwayId ? gameResult.away_score : gameResult.home_score;

                const hasScore = bottomTeamScore !== undefined && bottomTeamScore !== null;
                const isWinner = hasScore && bottomTeamScore > (topTeamScore || 0);

                return (
                  <div
                    key={`away-g-${index}`}
                    className={`text-[8.5px] font-mono font-black w-[14px] h-[14px] flex items-center justify-center border rounded-none transition-all ${
                      isWinner 
                        ? 'bg-[#16a34a] border-emerald-300 text-white shadow-[0_0_6px_rgba(34,197,94,0.9)] [text-shadow:0_0_5px_#ffffff,0_0_9px_rgba(255,255,255,0.9)] drop-shadow-[0_0_4px_#ffffff]' 
                        : 'bg-[#2b323d] border-neutral-700 text-neutral-300'
                    }`}
                  >
                    {hasScore ? bottomTeamScore : '-'}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* 3. AWAY TEAM LINE (BOTTOM) */}
        <div className={`w-full flex items-center justify-between min-h-[22px] mt-0.5 px-1 border border-black/20 ${
          isAwaySeriesWinner ? 'bg-emerald-50/80 border-emerald-600' : 'bg-white/70'
        }`}>
          <div className="flex items-center gap-1 w-full justify-start overflow-hidden">
            {awaySeed && (
              <span className="bg-black text-white text-[7px] font-mono font-black px-0.5 py-0 shrink-0 border border-black">
                {awaySeed}
              </span>
            )}
            {awayBanner && !awayImgFailed ? (
              <img
                src={awayBanner}
                alt={awayName}
                className="h-[18px] max-w-[105px] w-auto object-contain block filter contrast-125"
                style={{ maxHeight: '18px', maxWidth: '105px', height: '18px', width: 'auto', objectFit: 'contain' }}
                onError={(e) => {
                  const target = e.currentTarget;
                  const fallbacks: string[] = match?.away_team?.fallback_urls || [];
                  const triedList = (target.dataset.tried || '').split('|');
                  const nextUrl = fallbacks.find((url: string) => url && !triedList.includes(url) && url !== target.src);

                  if (nextUrl) {
                    target.dataset.tried = `${target.dataset.tried || ''}|${nextUrl}`;
                    target.src = nextUrl;
                  } else {
                    setAwayImgFailed(true);
                  }
                }}
              />
            ) : (
              <span className="text-[9px] font-black truncate uppercase tracking-tight text-left w-full font-sans text-black">
                {awayName}
              </span>
            )}
          </div>
          {isAwaySeriesWinner && (
            <span className="text-[7px] font-mono font-black bg-emerald-600 text-white px-1 ml-1 shrink-0 uppercase border border-black [text-shadow:0_0_3px_#fff]">
              WIN
            </span>
          )}
        </div>

      </div>
    </div>
  );
};

// ==========================================
// 3. RETRO SEGA / EA SPORTS BOXSCORE MODAL
// ==========================================

const SeriesModal = ({
  match,
  label,
  onClose
}: {
  match: PlayoffMatch | null;
  label: string;
  onClose: () => void;
}) => {
  if (!match) return null;

  const series = getSeriesDetails(match);
  const home = match.home_team;
  const away = match.away_team;

  const homeWonSeries = series.isComplete && series.winner === 'home';
  const awayWonSeries = series.isComplete && series.winner === 'away';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#fbf8f2] border-4 border-black text-black font-serif shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        
        {/* Retro 90s Arcade Header Bar */}
        <div className="bg-black text-white p-3 border-b-4 border-black flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-600 border border-white animate-pulse" />
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest font-sans text-amber-300">
                ★ OFFICIAL PLAYOFF SERIES BOXSCORE ★
              </h3>
              <p className="text-[10px] text-neutral-300 font-mono">
                {label} // BEST OF {series.seriesLength} TOURNAMENT REPORT
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-mono font-black uppercase transition cursor-pointer border-2 border-white shadow-[2px_2px_0px_#000]"
          >
            ✕ ESC
          </button>
        </div>

        {/* Versus Matchup Arcade Clipping */}
        <div className="p-4 border-b-4 border-black bg-[#f2eee3]">
          <div className="grid grid-cols-5 items-center gap-3 text-center">
            
            {/* Home Team Card */}
            <div className={`col-span-2 flex flex-col items-center p-3 border-2 border-black transition-all ${
              homeWonSeries 
                ? 'bg-emerald-100/90 shadow-[4px_4px_0px_0px_#059669,4px_4px_0px_1px_#000]' 
                : 'bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
            }`}>
              {match.home_team_seed && (
                <span className="text-[8px] font-mono font-black uppercase text-black/70 mb-0.5 bg-neutral-200 px-1 border border-black/30">
                  SEED #{match.home_team_seed}
                </span>
              )}
              {home?.banner_url ? (
                <img 
                  src={home.banner_url} 
                  alt={home.team_name} 
                  className="h-[24px] max-w-[110px] w-auto object-contain my-1" 
                  style={{ maxHeight: '24px', maxWidth: '110px', height: '24px', width: 'auto', objectFit: 'contain' }}
                />
              ) : (
                <span className="text-xs font-black uppercase tracking-tight my-1 font-sans">{home?.team_name || 'Home Team'}</span>
              )}
              
              {/* Home Series Score Box */}
              <div className={`mt-1.5 px-3 py-0.5 border-2 border-black font-mono font-black text-2xl ${
                homeWonSeries 
                  ? 'bg-[#16a34a] text-white border-emerald-950 shadow-[0_0_8px_rgba(34,197,94,0.9)] [text-shadow:0_0_6px_#ffffff,0_0_10px_#ffffff] drop-shadow-[0_0_4px_#ffffff]' 
                  : 'bg-neutral-900 text-neutral-100'
              }`}>
                {series.homeWins}
              </div>

              {homeWonSeries && (
                <span className="text-[8.5px] font-mono font-black uppercase tracking-widest text-emerald-800 bg-emerald-200 border border-emerald-700 px-1.5 py-0.5 mt-1.5 flex items-center gap-1 shadow-2xs">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700" /> SERIES WINNER
                </span>
              )}
            </div>

            {/* VS Status Center */}
            <div className="col-span-1 flex flex-col items-center justify-center">
              <div className="bg-black text-amber-300 border-2 border-black px-2 py-0.5 text-xs font-mono font-black uppercase shadow-[2px_2px_0px_#000]">
                VS
              </div>
              <div className="my-1.5 px-2 py-0.5 bg-neutral-900 text-white text-[8.5px] font-mono font-black uppercase border border-neutral-700">
                {series.statusPill}
              </div>
              <span className="text-[8px] text-black font-mono font-bold uppercase bg-amber-200 border border-black/40 px-1">
                {series.isComplete ? 'FINAL' : `${series.games.length} PLAYED`}
              </span>
            </div>

            {/* Away Team Card */}
            <div className={`col-span-2 flex flex-col items-center p-3 border-2 border-black transition-all ${
              awayWonSeries 
                ? 'bg-emerald-100/90 shadow-[4px_4px_0px_0px_#059669,4px_4px_0px_1px_#000]' 
                : 'bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
            }`}>
              {match.away_team_seed && (
                <span className="text-[8px] font-mono font-black uppercase text-black/70 mb-0.5 bg-neutral-200 px-1 border border-black/30">
                  SEED #{match.away_team_seed}
                </span>
              )}
              {away?.banner_url ? (
                <img 
                  src={away.banner_url} 
                  alt={away.team_name} 
                  className="h-[24px] max-w-[110px] w-auto object-contain my-1" 
                  style={{ maxHeight: '24px', maxWidth: '110px', height: '24px', width: 'auto', objectFit: 'contain' }}
                />
              ) : (
                <span className="text-xs font-black uppercase tracking-tight my-1 font-sans">{away?.team_name || 'Away Team'}</span>
              )}
              
              {/* Away Series Score Box */}
              <div className={`mt-1.5 px-3 py-0.5 border-2 border-black font-mono font-black text-2xl ${
                awayWonSeries 
                  ? 'bg-[#16a34a] text-white border-emerald-950 shadow-[0_0_8px_rgba(34,197,94,0.9)] [text-shadow:0_0_6px_#ffffff,0_0_10px_#ffffff] drop-shadow-[0_0_4px_#ffffff]' 
                  : 'bg-neutral-900 text-neutral-100'
              }`}>
                {series.awayWins}
              </div>

              {awayWonSeries && (
                <span className="text-[8.5px] font-mono font-black uppercase tracking-widest text-emerald-800 bg-emerald-200 border border-emerald-700 px-1.5 py-0.5 mt-1.5 flex items-center gap-1 shadow-2xs">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700" /> SERIES WINNER
                </span>
              )}
            </div>

          </div>
        </div>

        {/* Game By Game Ledger */}
        <div className="p-4 bg-[#fbf8f2]">
          <div className="flex items-center justify-between border-b-2 border-black pb-1 mb-2.5">
            <h4 className="text-[11px] font-mono font-black uppercase tracking-wider text-black flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-600 inline-block border border-black shadow-[0_0_4px_#22c55e]" />
              GAME-BY-GAME SCORE MATRIX
            </h4>
            <span className="text-[8.5px] font-mono text-neutral-600 uppercase font-bold">
              Green Box = Winner Score
            </span>
          </div>

          {series.games.length === 0 ? (
            <div className="p-4 text-center border-2 border-dashed border-black/40 text-black/60 font-mono text-xs italic bg-white/60">
              NO GAMES HAVE BEEN RECORDED FOR THIS SERIES YET.
            </div>
          ) : (
            <div className="space-y-1.5">
              {series.games.map((g) => {
                const parentHomeId = match.home_team_id;
                const parentAwayId = match.away_team_id;
                const homeScore = g.home_team_id === parentHomeId ? g.home_score : g.away_score;
                const awayScore = g.away_team_id === parentAwayId ? g.away_score : g.home_score;
                const homeWon = homeScore > awayScore;

                return (
                  <div
                    key={`modal-g-${g.game_number}`}
                    className="flex items-center justify-between p-2 border-2 border-black bg-white text-xs font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.8)]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 bg-black text-amber-300 flex items-center justify-center font-bold text-[10px] border border-black font-mono">
                        G{g.game_number}
                      </span>
                      <span className="font-mono font-black text-black text-[11px] uppercase">Game {g.game_number}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        
                        {/* Home Game Score Box */}
                        <div className={`flex items-center gap-1 px-1.5 py-0.5 border ${
                          homeWon 
                            ? 'bg-[#16a34a] border-emerald-950 text-white font-black shadow-[0_0_6px_rgba(34,197,94,0.9)] [text-shadow:0_0_5px_#ffffff] drop-shadow-[0_0_3px_#ffffff]' 
                            : 'bg-neutral-100 border-neutral-400 text-neutral-800 font-bold'
                        }`}>
                          <span className="text-[10px] font-mono uppercase">{home?.abbreviation || 'HOM'}</span>
                          <span className="text-xs font-black">{homeScore}</span>
                        </div>

                        <span className="text-black/40 font-bold">-</span>

                        {/* Away Game Score Box */}
                        <div className={`flex items-center gap-1 px-1.5 py-0.5 border ${
                          !homeWon 
                            ? 'bg-[#16a34a] border-emerald-950 text-white font-black shadow-[0_0_6px_rgba(34,197,94,0.9)] [text-shadow:0_0_5px_#ffffff] drop-shadow-[0_0_3px_#ffffff]' 
                            : 'bg-neutral-100 border-neutral-400 text-neutral-800 font-bold'
                        }`}>
                          <span className="text-xs font-black">{awayScore}</span>
                          <span className="text-[10px] font-mono uppercase">{away?.abbreviation || 'AWY'}</span>
                        </div>

                      </div>

                      {/* Win Badge */}
                      <span className="px-2 py-0.5 text-[8.5px] font-mono font-black uppercase bg-black text-white border border-black">
                        {homeWon ? (home?.abbreviation || 'HOM') : (away?.abbreviation || 'AWY')} WIN
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#ede6d8] border-t-4 border-black flex justify-between items-center">
          <div className="flex items-center gap-1.5 text-[9px] font-mono text-neutral-700">
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>NHL95 DIGITAL PLAYOFF ENGINE</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-black text-white font-mono text-xs font-black hover:bg-neutral-800 transition cursor-pointer border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] uppercase"
          >
            RETURN TO BRACKET
          </button>
        </div>

      </div>
    </div>
  );
};

// ==========================================
// 4. MAIN PLAYOFF BRACKET PAGE
// ==========================================

export default function PlayoffBracket() {
  const [matches, setMatches] = useState<PlayoffMatch[]>([]);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | string>('');
  
  // Selected series for modal breakdown
  const [selectedSeries, setSelectedSeries] = useState<{ match: PlayoffMatch; label: string } | null>(null);

  // Zoom level state for large bracket exploration
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // 1. Fetch available leagues directly through the playoff entries to find valid active options
  useEffect(() => {
    const fetchSeasons = async () => {
      const { data, error } = await supabase
        .from('league_playoffs')
        .select(`
          league_id,
          leagues:league_id (
            league_name
          )
        `);

      if (error) {
        console.error("⛔ Error fetching bracket configurations:", error.message);
        return;
      }

      if (data) {
        const uniqueMap = new Map();
        data.forEach((row: any) => {
          if (row.league_id) {
            const rawLeagues = row.leagues;
            const targetName = Array.isArray(rawLeagues)
              ? rawLeagues[0]?.league_name
              : rawLeagues?.league_name;

            const labelName = targetName || `W0${row.league_id}`;
            uniqueMap.set(row.league_id, labelName);
          }
        });

        const list = Array.from(uniqueMap.entries()).map(([id, name]: any) => ({
          league_id: id,
          league_name: name
        })).sort((a, b) => Number(b.league_id) - Number(a.league_id));

        setSeasons(list);
        if (list.length > 0) {
          setSelectedLeagueId(list[0].league_id);
        }
      }
    };

    fetchSeasons();
  }, []);

  // 2. Refresh bracket whenever selector shifts options
  useEffect(() => {
    if (selectedLeagueId) {
      fetchPlayoffs(selectedLeagueId);
    }
  }, [selectedLeagueId]);

  const fetchPlayoffs = async (leagueId: number | string) => {
    const { data, error } = await supabase
      .from('league_playoffs')
      .select(`
        *, 
        home_team:league_teams!league_playoffs_home_team_id_fkey(team_id, team_name, abbreviation, banner_filename),
        away_team:league_teams!league_playoffs_away_team_id_fkey(team_id, team_name, abbreviation, banner_filename),
        results:league_playoff_results(game_number, home_score, away_score, home_team_id, away_team_id)
      `)
      .eq('league_id', leagueId);

    if (error) {
      console.error("⛔ Supabase Playoff Query Error:", error.message, error.details);
      return;
    }

    if (data) {
      const matchesWithBanners = data.map((match: any) => {
        const homeBannerInfo = getTeamBannerUrls({
          team_id: match.home_team?.team_id,
          team_name: match.home_team?.team_name,
          abbreviation: match.home_team?.abbreviation,
          banner_filename: match.home_team?.banner_filename,
          league_id: leagueId
        }, leagueId);

        const awayBannerInfo = getTeamBannerUrls({
          team_id: match.away_team?.team_id,
          team_name: match.away_team?.team_name,
          abbreviation: match.away_team?.abbreviation,
          banner_filename: match.away_team?.banner_filename,
          league_id: leagueId
        }, leagueId);

        return {
          ...match,
          home_team: match.home_team ? {
            ...match.home_team,
            banner_url: homeBannerInfo.primaryUrl,
            fallback_urls: homeBannerInfo.fallbackUrls
          } : null,
          away_team: match.away_team ? {
            ...match.away_team,
            banner_url: awayBannerInfo.primaryUrl,
            fallback_urls: awayBannerInfo.fallbackUrls
          } : null
        };
      });
      setMatches(matchesWithBanners);
    }
  };

  const getMatch = (label: string): PlayoffMatch => 
    matches.find(m => m.match_label === label) || { match_label: label, results: [] };

  // Helper function to extract and calculate champion details
  const getChampionDetails = () => {
    const finalsMatch = getMatch('Finals');
    if (!finalsMatch || !finalsMatch.results || finalsMatch.results.length === 0) return null;

    const series = getSeriesDetails(finalsMatch);
    if (!series.isComplete) return null;

    if (series.winner === 'home') {
      return {
        team: finalsMatch.home_team,
        score: `${series.homeWins}-${series.awayWins}`,
        opponent: finalsMatch.away_team
      };
    } else if (series.winner === 'away') {
      return {
        team: finalsMatch.away_team,
        score: `${series.awayWins}-${series.homeWins}`,
        opponent: finalsMatch.home_team
      };
    }

    return null;
  };

  // Inspects the league_name prefix to correctly map the award image and trophy titles
  const getCupMetadata = () => {
    const currentLeague = seasons.find(s => String(s.league_id) === String(selectedLeagueId));
    const databaseLeagueName = currentLeague?.league_name || "";
    const firstLetter = databaseLeagueName.trim().toUpperCase()[0];

    let filename = "default_trophy.png";
    let title = "CHAMPIONSHIP";

    if (firstLetter === 'W') {
      filename = "brule_cup.png";
      title = "BRULE CUP";
    } else if (firstLetter === 'Q') {
      filename = "q_cup.png";
      title = "Q CUP";
    } else if (firstLetter === 'V') {
      filename = "grail_cup.png";
      title = "GRAIL CUP";
    }

    const { data } = supabase.storage.from('awards').getPublicUrl(filename);

    return {
      title,
      trophyUrl: data?.publicUrl || null
    };
  };

  const championData = getChampionDetails();
  const cupMeta = getCupMetadata();

  const handleCardSelect = (match: PlayoffMatch, label: string) => {
    setSelectedSeries({ match, label });
  };

  return (
    <div className="min-h-screen w-full bg-[#f4f1ea] text-black font-serif pb-12 overflow-x-hidden">
      
      {/* ==========================================
          1. RETRO 90S SEGA GENESIS MASTHEAD HEADER
      ========================================== */}
      <header className="border-b-4 border-black pb-4 mb-5 text-center max-w-[1440px] mx-auto px-4">
        
        {/* Retro Header Top Badge */}
        <div className="inline-flex items-center gap-2 bg-black text-amber-300 font-mono text-[9px] sm:text-[10px] font-black uppercase px-3 py-1 border-2 border-black shadow-[2px_2px_0px_#d97706] mb-2 tracking-widest">
          <Flame className="w-3.5 h-3.5 text-red-500 animate-pulse" />
          <span>SEGA GENESIS 16-BIT PLAYOFF ENGINE</span>
          <Flame className="w-3.5 h-3.5 text-red-500 animate-pulse" />
        </div>

        <h1 className="text-3xl md:text-5xl lg:text-6xl font-black uppercase italic tracking-tighter text-black drop-shadow-[2px_2px_0px_rgba(0,0,0,0.15)]">
          The Playoff Bracket
        </h1>
        
        <div className="flex items-center justify-center gap-2 mt-1.5">
          <span className="h-[2px] w-8 sm:w-16 bg-black" />
          <p className="text-[10px] sm:text-xs uppercase tracking-widest font-mono font-black text-neutral-800">
            OFFICIAL TOURNAMENT BRACKET & SERIES RESULTS
          </p>
          <span className="h-[2px] w-8 sm:w-16 bg-black" />
        </div>
      </header>

      {/* Mobile Swipe Notice */}
      <div className="md:hidden max-w-[1440px] mx-auto px-2 mb-3">
        <div className="flex items-center justify-between text-[10px] font-mono font-black text-black px-3 py-2 bg-amber-100 border-2 border-black shadow-[2px_2px_0px_#000] uppercase tracking-wider">
          <span>↔ SWIPE SIDEWAYS TO EXPLORE BRACKET</span>
          <span className="bg-black text-emerald-400 px-1.5 py-0.5 border border-emerald-400">16-BIT MODE</span>
        </div>
      </div>

      {/* Main scrolling viewport container */}
      <div className="w-full overflow-x-auto pb-8 scrollbar-thin px-2">

        {/* Retro Controls & Season Selector Toolbar */}
        <div className="w-full max-w-[1440px] mx-auto flex flex-wrap items-center justify-between mb-4 gap-2 px-1">
          
          {/* Season / Edition Selector */}
          {seasons.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-black uppercase tracking-wider bg-black text-white px-2 py-1 border border-black">
                LEAGUE EDITION:
              </span>
              <div className="relative">
                <select
                  value={selectedLeagueId}
                  onChange={(e) => setSelectedLeagueId(e.target.value)}
                  className="border-2 border-black bg-[#fdfaf5] font-mono font-black text-xs px-3 py-1 uppercase tracking-wide cursor-pointer focus:outline-none shadow-[3px_3px_0px_#000] rounded-none pr-8 appearance-none"
                >
                  {seasons.map((s) => (
                    <option key={s.league_id} value={s.league_id} className="bg-[#fdfaf5] font-black text-black">
                      {s.league_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-black absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Retro Zoom & Legend Quick Bar */}
          <div className="flex items-center gap-2">
            
            {/* Desktop Zoom Controls */}
            <div className="flex items-center bg-[#fdfaf5] border-2 border-black shadow-[3px_3px_0px_#000] text-xs">
              <button
                onClick={() => setZoomLevel(prev => Math.max(60, prev - 10))}
                title="Zoom Out"
                className="p-1.5 hover:bg-neutral-200 text-black transition cursor-pointer font-mono font-bold"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono font-black px-2 border-x border-black bg-neutral-100">
                {zoomLevel}%
              </span>
              <button
                onClick={() => setZoomLevel(prev => Math.min(125, prev + 10))}
                title="Zoom In"
                className="p-1.5 hover:bg-neutral-200 text-black transition cursor-pointer font-mono font-bold"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomLevel(100)}
                title="Reset Zoom"
                className="p-1.5 hover:bg-neutral-200 text-black transition cursor-pointer border-l border-black bg-amber-50"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* ==========================================
            2. UNIFORM 7-COLUMN RETRO BRACKET CANVAS
        ========================================== */}
        <div 
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          className="min-w-[1260px] max-w-[1440px] mx-auto transition-transform duration-200"
        >
          
          {/* Column Header Titles (Retro Segmented Plates) */}
          <div className="grid grid-cols-7 gap-2 mb-2 px-1 text-center font-mono font-black text-[9px] uppercase tracking-widest">
            <div className="bg-black text-neutral-200 py-1 border-2 border-black shadow-[2px_2px_0px_#000]">Quarter Finals</div>
            <div className="bg-black text-neutral-200 py-1 border-2 border-black shadow-[2px_2px_0px_#000]">Semi Finals</div>
            <div className="bg-black text-neutral-200 py-1 border-2 border-black shadow-[2px_2px_0px_#000]">Conf. Finals</div>
            <div className="bg-amber-400 text-black py-1 border-2 border-black shadow-[2px_2px_0px_#000] font-black">
              ★ {cupMeta.title} FINALS ★
            </div>
            <div className="bg-black text-neutral-200 py-1 border-2 border-black shadow-[2px_2px_0px_#000]">Conf. Finals</div>
            <div className="bg-black text-neutral-200 py-1 border-2 border-black shadow-[2px_2px_0px_#000]">Semi Finals</div>
            <div className="bg-black text-neutral-200 py-1 border-2 border-black shadow-[2px_2px_0px_#000]">Quarter Finals</div>
          </div>

          {/* Canvas Row Layout */}
          <div className="grid grid-cols-7 bg-[#f6f2e8] py-6 px-2 border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,1)] items-stretch">
            
            {/* ==================== LEFT BRACKET SIDE ==================== */}

            {/* 1. LEFT QUARTER FINALS (4 Matches) */}
            <div className="grid grid-rows-4 h-[650px] text-center items-center">
              {['Quarter Finals - 1', 'Quarter Finals - 2', 'Quarter Finals - 3', 'Quarter Finals - 4'].map((label) => (
                <div key={label} className="flex items-center justify-center">
                  <MatchupCard
                    match={getMatch(label)}
                    label={label}
                    onSelect={(m, l) => handleCardSelect(m, l)}
                  />
                </div>
              ))}
            </div>

            {/* 2. LEFT SEMI FINALS (2 Matches) */}
            <div className="grid grid-rows-2 h-[650px] text-center items-center">
              <div className="flex items-center justify-center h-full">
                <MatchupCard
                  match={getMatch('Semi Finals - 1')}
                  label="Semi Finals - 1"
                  onSelect={(m, l) => handleCardSelect(m, l)}
                />
              </div>
              <div className="flex items-center justify-center h-full">
                <MatchupCard
                  match={getMatch('Semi Finals - 2')}
                  label="Semi Finals - 2"
                  onSelect={(m, l) => handleCardSelect(m, l)}
                />
              </div>
            </div>

            {/* 3. LEFT CONFERENCE FINALS (1 Match) */}
            <div className="flex flex-col justify-center h-[650px] text-center items-center">
              <MatchupCard
                match={getMatch('Conference Finals - 1')}
                label="Conference Finals - 1"
                onSelect={(m, l) => handleCardSelect(m, l)}
              />
            </div>

            {/* ==================== THE MAIN EVENT & TROPHY ==================== */}

            {/* 4. CHAMPIONSHIP TITLE MATCH & DYNAMIC SUPABASE TROPHY */}
            <div className="relative flex flex-col justify-center items-center h-[650px] bg-black/[0.025] px-1 text-center border-x-2 border-black/20">
              
              {/* Retro Trophy Showcase Pedestal */}
              <div className="absolute top-2 left-0 right-0 flex flex-col items-center pointer-events-none">
                {championData ? (
                  <div className="flex flex-col items-center animate-in fade-in duration-300 max-w-[160px] pointer-events-auto bg-amber-50/90 border-2 border-black p-2 shadow-[4px_4px_0px_#d97706,4px_4px_0px_1px_#000]">
                    
                    {/* Trophy Image with retro shimmer */}
                    {cupMeta.trophyUrl && (
                      <div className="relative overflow-hidden mb-1 group">
                        <img
                          src={cupMeta.trophyUrl}
                          alt={cupMeta.title}
                          className="h-[75px] w-auto max-h-[75px] object-contain block filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.25)]"
                          style={{ maxHeight: '75px', width: 'auto' }}
                        />
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full animate-[shimmer_2s_infinite] skew-x-12" />
                      </div>
                    )}

                    <div className="text-[8px] font-mono font-black tracking-widest uppercase bg-black text-amber-300 px-1.5 py-0.5 border border-black mb-1">
                      ★ {cupMeta.title} WINNER ★
                    </div>

                    {/* Champion Team Banner */}
                    {championData.team?.banner_url ? (
                      <img
                        src={championData.team.banner_url}
                        alt={championData.team.team_name}
                        className="h-[22px] max-w-[125px] object-contain block filter contrast-125 border-2 border-black p-0.5 bg-white shadow-xs"
                        style={{ maxHeight: '22px', maxWidth: '125px', width: 'auto' }}
                      />
                    ) : (
                      <span className="text-[11px] font-black uppercase tracking-tight font-sans">{championData.team?.team_name}</span>
                    )}
                    
                    <span className="text-[7.5px] font-mono font-black uppercase bg-emerald-600 text-white px-1.5 py-0.2 mt-1 border border-emerald-900 shadow-[0_0_4px_#22c55e] [text-shadow:0_0_3px_#fff]">
                      SERIES VICTORY ({championData.score})
                    </span>
                  </div>
                ) : (
                  /* Silhouette Placeholder before final champion is declared */
                  <div className="flex flex-col items-center opacity-40 max-w-[155px] bg-white/40 border-2 border-dashed border-black/40 p-2">
                    {cupMeta.trophyUrl && (
                      <img
                        src={cupMeta.trophyUrl}
                        alt={cupMeta.title}
                        className="h-[75px] w-auto max-h-[75px] object-contain block grayscale brightness-50 mb-1"
                        style={{ maxHeight: '75px', width: 'auto' }}
                      />
                    )}
                    <div className="text-[8px] font-mono font-black tracking-widest uppercase bg-black text-white px-1.5 py-0.2 mb-1">
                      {cupMeta.title}
                    </div>
                    <div className="h-[20px] w-[80px] border border-black/40 bg-black/[0.04] flex items-center justify-center text-[7.5px] font-mono font-bold text-black/60">
                      TBD CHAMPION
                    </div>
                  </div>
                )}
              </div>

              {/* Title Match Box */}
              <div className="z-10 mt-36">
                <MatchupCard
                  match={getMatch('Finals')}
                  label="TITLE MATCH"
                  isChampionship={true}
                  onSelect={(m, l) => handleCardSelect(m, l)}
                />
              </div>
            </div>

            {/* ==================== RIGHT BRACKET SIDE ==================== */}

            {/* 5. RIGHT CONFERENCE FINALS (1 Match) */}
            <div className="flex flex-col justify-center h-[650px] text-center items-center">
              <MatchupCard
                match={getMatch('Conference Finals - 2')}
                label="Conference Finals - 2"
                onSelect={(m, l) => handleCardSelect(m, l)}
              />
            </div>

            {/* 6. RIGHT SEMI FINALS (2 Matches) */}
            <div className="grid grid-rows-2 h-[650px] text-center items-center">
              <div className="flex items-center justify-center h-full">
                <MatchupCard
                  match={getMatch('Semi Finals - 3')}
                  label="Semi Finals - 3"
                  onSelect={(m, l) => handleCardSelect(m, l)}
                />
              </div>
              <div className="flex items-center justify-center h-full">
                <MatchupCard
                  match={getMatch('Semi Finals - 4')}
                  label="Semi Finals - 4"
                  onSelect={(m, l) => handleCardSelect(m, l)}
                />
              </div>
            </div>

            {/* 7. RIGHT QUARTER FINALS (4 Matches) */}
            <div className="grid grid-rows-4 h-[650px] text-center items-center">
              {['Quarter Finals - 5', 'Quarter Finals - 6', 'Quarter Finals - 7', 'Quarter Finals - 8'].map((label) => (
                <div key={label} className="flex items-center justify-center">
                  <MatchupCard
                    match={getMatch(label)}
                    label={label}
                    onSelect={(m, l) => handleCardSelect(m, l)}
                  />
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Retro Arcade Footer Note & Legend */}
        <div className="min-w-[1260px] max-w-[1440px] mx-auto mt-4 px-2 py-2 bg-white/70 border-2 border-black shadow-[3px_3px_0px_#000] flex flex-wrap items-center justify-between text-[11px] font-mono text-black gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-black" />
            <span className="font-bold">CLICK ON ANY MATCHUP TO VIEW COMPLETE GAME-BY-GAME BOXSCORES & STATS.</span>
          </div>
          <div className="flex items-center gap-4 font-mono font-black text-[10px]">
            <span className="flex items-center gap-1.5 bg-[#1e232a] text-white px-2 py-0.5 border border-black">
              <span className="w-3.5 h-3.5 bg-[#16a34a] border border-emerald-300 text-white font-black flex items-center justify-center text-[8px] shadow-[0_0_6px_rgba(34,197,94,0.9)] [text-shadow:0_0_4px_#fff] drop-shadow-[0_0_3px_#ffffff]">
                5
              </span>
              <span className="text-emerald-300">WINNING SCORE (GREEN + GLOW)</span>
            </span>
            <span className="flex items-center gap-1.5 bg-[#1e232a] text-neutral-300 px-2 py-0.5 border border-black">
              <span className="w-3.5 h-3.5 bg-[#2b323d] border border-neutral-700 text-neutral-300 font-bold flex items-center justify-center text-[8px]">
                2
              </span>
              <span>LOSS</span>
            </span>
            <span className="flex items-center gap-1.5 bg-[#1e232a] text-neutral-400 px-2 py-0.5 border border-black">
              <span className="w-3.5 h-3.5 bg-neutral-900 border border-neutral-700 text-neutral-600 font-bold flex items-center justify-center text-[8px]">
                -
              </span>
              <span>UNPLAYED</span>
            </span>
          </div>
        </div>

      </div>

      {/* Series Details Modal Popup */}
      {selectedSeries && (
        <SeriesModal
          match={selectedSeries.match}
          label={selectedSeries.label}
          onClose={() => setSelectedSeries(null)}
        />
      )}

    </div>
  );
}