"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, ChevronDown, CheckCircle2, X, ZoomIn, ZoomOut, RotateCcw, Info
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
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
// 2. CLEAN & COMPACT NEWSPAPER MATCHUP CARD
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

  return (
    <div 
      onClick={() => onSelect && onSelect(match, label)}
      className={`border-2 border-black p-1 bg-[#fdfaf5] w-[160px] font-serif shadow-[2px_2px_0px_rgba(0,0,0,0.2)] select-none shrink-0 mx-auto transition-all hover:shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 cursor-pointer ${
        isChampionship ? 'ring-2 ring-black/40 bg-[#fffdf9]' : ''
      }`}
    >
      {/* Match Label Header Strip */}
      <div className="text-[7.5px] font-black border-b border-black mb-1 text-center uppercase tracking-widest flex justify-between px-1 items-center bg-black text-white py-0.5">
        <span className="truncate max-w-[105px]">{label}</span>
        <span className="text-[6.5px] font-mono opacity-90">
          {series.isComplete ? series.statusPill : `BO${series.seriesLength}`}
        </span>
      </div>

      <div className="flex flex-col items-center w-full">
        
        {/* 1. HOME TEAM LINE (TOP) */}
        <div className="w-full flex items-center justify-center min-h-[22px] mb-0.5 px-0.5">
          <div className="flex items-center justify-center gap-1 w-full">
            {homeSeed && <span className="opacity-60 text-[8px] font-sans font-bold shrink-0">({homeSeed})</span>}
            {homeBanner && !homeImgFailed ? (
              <img
                src={homeBanner}
                alt={homeName}
                className="h-[18px] max-w-[100px] w-auto object-contain block filter contrast-125"
                style={{ maxHeight: '18px', maxWidth: '100px', height: '18px', width: 'auto', objectFit: 'contain' }}
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
              <span className="text-[9.5px] font-black truncate uppercase tracking-tight text-center w-full font-sans">{homeName}</span>
            )}
          </div>
        </div>

        {/* 2. THE SCOREBOARD SANDWICH */}
        <div className="flex flex-col gap-0.5 border-y border-black/25 py-0.5 w-full bg-black/[0.015]">
          
          {/* Top Team Row */}
          <div className="flex items-center w-full px-1">
            <span className="text-[8.5px] font-sans font-black tracking-tight w-[28px] text-left shrink-0 opacity-80 uppercase">
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
                      className="text-[7.5px] font-mono font-bold w-[13px] h-[13px] flex items-center justify-center border border-black/30 bg-white rounded-none text-black/40"
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
                    className={`text-[7.5px] font-mono font-bold w-[13px] h-[13px] flex items-center justify-center border border-black/40 bg-white rounded-none ${
                      isWinner ? 'text-emerald-700 font-black bg-emerald-50' : 'text-black'
                    }`}
                  >
                    {hasScore ? topTeamScore : '-'}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Team Row */}
          <div className="flex items-center w-full px-1 mt-0.5">
            <span className="text-[8.5px] font-sans font-black tracking-tight w-[28px] text-left shrink-0 opacity-80 uppercase">
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
                      className="text-[7.5px] font-mono font-bold w-[13px] h-[13px] flex items-center justify-center border border-black/30 bg-white rounded-none text-black/40"
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
                    className={`text-[7.5px] font-mono font-bold w-[13px] h-[13px] flex items-center justify-center border border-black/40 bg-white rounded-none ${
                      isWinner ? 'text-emerald-700 font-black bg-emerald-50' : 'text-black'
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
        <div className="w-full flex items-center justify-center min-h-[22px] mt-0.5 px-0.5">
          <div className="flex items-center justify-center gap-1 w-full">
            {awaySeed && <span className="opacity-60 text-[8px] font-sans font-bold shrink-0">({awaySeed})</span>}
            {awayBanner && !awayImgFailed ? (
              <img
                src={awayBanner}
                alt={awayName}
                className="h-[18px] max-w-[100px] w-auto object-contain block filter contrast-125"
                style={{ maxHeight: '18px', maxWidth: '100px', height: '18px', width: 'auto', objectFit: 'contain' }}
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
              <span className="text-[9.5px] font-black truncate uppercase tracking-tight text-center w-full font-sans">{awayName}</span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

// ==========================================
// 3. EDITORIAL NEWSPAPER BOXSCORE MODAL
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#fbf8f2] border-4 border-black text-black font-serif shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        
        {/* Newspaper Modal Masthead */}
        <div className="bg-black text-white p-3 border-b-2 border-black flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest font-sans">
              Official Playoff Series Boxscore
            </h3>
            <p className="text-[10px] text-neutral-300 font-serif italic">
              {label} • Best of {series.seriesLength} Series Report
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-2 py-0.5 bg-neutral-800 hover:bg-red-700 text-white text-xs font-sans font-bold uppercase transition cursor-pointer border border-white/20"
          >
            ✕ Close
          </button>
        </div>

        {/* Versus Matchup News Clipping */}
        <div className="p-4 border-b-2 border-black bg-[#fdfaf5]">
          <div className="grid grid-cols-5 items-center gap-3 text-center">
            
            {/* Home Team */}
            <div className={`col-span-2 flex flex-col items-center p-2.5 border-2 border-black ${
              homeWonSeries ? 'bg-amber-100/60 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white'
            }`}>
              {match.home_team_seed && (
                <span className="text-[8.5px] font-sans font-black uppercase text-black/60 mb-0.5">
                  Seed ({match.home_team_seed})
                </span>
              )}
              {home?.banner_url ? (
                <img 
                  src={home.banner_url} 
                  alt={home.team_name} 
                  className="h-[20px] max-w-[100px] w-auto object-contain my-0.5" 
                  style={{ maxHeight: '20px', maxWidth: '100px', height: '20px', width: 'auto', objectFit: 'contain' }}
                />
              ) : (
                <span className="text-xs font-black uppercase tracking-tight my-0.5">{home?.team_name || 'Home Team'}</span>
              )}
              <span className="text-xl font-mono font-black mt-0.5">
                {series.homeWins}
              </span>
              {homeWonSeries && (
                <span className="text-[8.5px] font-sans font-black uppercase tracking-widest text-emerald-800 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700" /> Winner
                </span>
              )}
            </div>

            {/* VS Status Center */}
            <div className="col-span-1 flex flex-col items-center justify-center">
              <span className="text-xs font-black tracking-widest uppercase font-sans">VS</span>
              <div className="my-1 px-1.5 py-0.5 bg-black text-white text-[8px] font-sans font-black uppercase">
                {series.statusPill}
              </div>
              <span className="text-[8.5px] text-black/60 font-sans uppercase">
                {series.isComplete ? 'Final' : `${series.games.length} Played`}
              </span>
            </div>

            {/* Away Team */}
            <div className={`col-span-2 flex flex-col items-center p-2.5 border-2 border-black ${
              awayWonSeries ? 'bg-amber-100/60 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white'
            }`}>
              {match.away_team_seed && (
                <span className="text-[8.5px] font-sans font-black uppercase text-black/60 mb-0.5">
                  Seed ({match.away_team_seed})
                </span>
              )}
              {away?.banner_url ? (
                <img 
                  src={away.banner_url} 
                  alt={away.team_name} 
                  className="h-[20px] max-w-[100px] w-auto object-contain my-0.5" 
                  style={{ maxHeight: '20px', maxWidth: '100px', height: '20px', width: 'auto', objectFit: 'contain' }}
                />
              ) : (
                <span className="text-xs font-black uppercase tracking-tight my-0.5">{away?.team_name || 'Away Team'}</span>
              )}
              <span className="text-xl font-mono font-black mt-0.5">
                {series.awayWins}
              </span>
              {awayWonSeries && (
                <span className="text-[8.5px] font-sans font-black uppercase tracking-widest text-emerald-800 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700" /> Winner
                </span>
              )}
            </div>

          </div>
        </div>

        {/* Game By Game Ledger */}
        <div className="p-4">
          <h4 className="text-[11px] font-sans font-black uppercase tracking-wider text-black border-b border-black pb-1 mb-2.5">
            Game-By-Game Scores
          </h4>

          {series.games.length === 0 ? (
            <div className="p-3 text-center border border-dashed border-black/40 text-black/60 text-xs italic">
              No games have been recorded for this series yet.
            </div>
          ) : (
            <div className="space-y-1">
              {series.games.map((g) => {
                const parentHomeId = match.home_team_id;
                const parentAwayId = match.away_team_id;
                const homeScore = g.home_team_id === parentHomeId ? g.home_score : g.away_score;
                const awayScore = g.away_team_id === parentAwayId ? g.away_score : g.home_score;
                const homeWon = homeScore > awayScore;

                return (
                  <div
                    key={`modal-g-${g.game_number}`}
                    className="flex items-center justify-between p-1.5 border border-black bg-white text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 bg-black text-white flex items-center justify-center font-bold text-[9px]">
                        {g.game_number}
                      </span>
                      <span className="font-sans font-bold text-black/80 text-[11px]">Game {g.game_number}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-black ${homeWon ? 'text-emerald-700 font-extrabold' : 'text-black/80'}`}>
                          {home?.abbreviation || 'HOM'} {homeScore}
                        </span>
                        <span className="text-black/40">-</span>
                        <span className={`font-black ${!homeWon ? 'text-emerald-700 font-extrabold' : 'text-black/80'}`}>
                          {awayScore} {away?.abbreviation || 'AWY'}
                        </span>
                      </div>

                      <span className={`px-1.5 py-0.2 text-[8.5px] font-sans font-black uppercase ${
                        homeWon ? 'bg-emerald-100 text-emerald-900 border border-emerald-700' : 'bg-neutral-100 text-neutral-900 border border-black'
                      }`}>
                        {homeWon ? (home?.abbreviation || 'HOM') : (away?.abbreviation || 'AWY')} Win
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-2.5 bg-[#ede6d8] border-t-2 border-black flex justify-end items-center">
          <button
            onClick={onClose}
            className="px-3 py-1 bg-black text-white font-sans text-xs font-black hover:bg-red-700 transition cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase"
          >
            Return to Bracket
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
          1. CLEAN NEWSPAPER MASTHEAD HEADER
      ========================================== */}
      <header className="border-b-4 border-black pb-3 mb-5 text-center max-w-[1440px] mx-auto px-4">
        <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter">
          The Playoff Magic
        </h1>
        <p className="text-xs uppercase tracking-widest font-sans font-bold text-neutral-600 mt-1">
          Official Tournament Bracket & Series Results
        </p>
      </header>

      {/* Mobile Swipe Notice */}
      <div className="md:hidden max-w-[1440px] mx-auto px-2 mb-2">
        <div className="flex items-center justify-between text-[10px] font-sans font-bold text-black/60 px-3 py-1.5 bg-[#ebd9c0]/50 border border-black/15 rounded-xs uppercase tracking-wider">
          <span>↔ Swipe sideways to explore playoff bracket</span>
          <span className="font-mono text-emerald-800 font-black">Bracket Mode</span>
        </div>
      </div>

      {/* Main scrolling viewport container */}
      <div className="w-full overflow-x-auto pb-8 scrollbar-thin px-2">

        {/* Clean Dropdown & Controls Toolbar */}
        <div className="w-full max-w-[1440px] mx-auto flex flex-wrap items-center justify-between mb-3 gap-2 px-1">
          
          {/* Season / Edition Selector */}
          {seasons.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-sans font-black uppercase tracking-wider opacity-70">
                Edition:
              </span>
              <div className="relative">
                <select
                  value={selectedLeagueId}
                  onChange={(e) => setSelectedLeagueId(e.target.value)}
                  className="border-2 border-black bg-[#fdfaf5] font-sans font-black text-xs px-3 py-1 uppercase tracking-wide cursor-pointer focus:outline-none shadow-[2px_2px_0px_rgba(0,0,0,1)] rounded-none pr-7 appearance-none"
                >
                  {seasons.map((s) => (
                    <option key={s.league_id} value={s.league_id} className="bg-[#fdfaf5] font-black text-black">
                      {s.league_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-black absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Desktop Zoom Controls */}
          <div className="flex items-center gap-1 bg-[#fdfaf5] border-2 border-black p-0.5 shadow-[2px_2px_0px_rgba(0,0,0,1)] text-xs">
            <button
              onClick={() => setZoomLevel(prev => Math.max(60, prev - 10))}
              title="Zoom Out"
              className="p-1 hover:bg-neutral-200 text-black transition cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono font-black px-1.5">
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(125, prev + 10))}
              title="Zoom In"
              className="p-1 hover:bg-neutral-200 text-black transition cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(100)}
              title="Reset Zoom"
              className="p-1 hover:bg-neutral-200 text-black transition cursor-pointer border-l border-black/20"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* ==========================================
            2. UNIFORM 7-COLUMN BRACKET CANVAS
        ========================================== */}
        <div 
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          className="min-w-[1260px] max-w-[1440px] mx-auto transition-transform duration-200"
        >
          
          {/* Column Header Titles */}
          <div className="grid grid-cols-7 gap-1 mb-1 px-1 text-center font-sans font-black text-[8px] uppercase tracking-widest text-black/70">
            <div>Quarter Finals</div>
            <div>Semi Finals</div>
            <div>Conf. Finals</div>
            <div className="text-black font-black">{cupMeta.title} Finals</div>
            <div>Conf. Finals</div>
            <div>Semi Finals</div>
            <div>Quarter Finals</div>
          </div>

          {/* Canvas Row Layout */}
          <div className="grid grid-cols-7 bg-[#fbf7f0] py-6 px-2 border-y-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,0.15)] items-stretch">
            
            {/* ==================== LEFT BRACKET SIDE ==================== */}

            {/* 1. LEFT QUARTER FINALS (4 Matches) */}
            <div className="grid grid-rows-4 h-[640px] text-center items-center">
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
            <div className="grid grid-rows-2 h-[640px] text-center items-center">
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
            <div className="flex flex-col justify-center h-[640px] text-center items-center">
              <MatchupCard
                match={getMatch('Conference Finals - 1')}
                label="Conference Finals - 1"
                onSelect={(m, l) => handleCardSelect(m, l)}
              />
            </div>

            {/* ==================== THE MAIN EVENT & TROPHY ==================== */}

            {/* 4. CHAMPIONSHIP TITLE MATCH & DYNAMIC SUPABASE TROPHY */}
            <div className="relative flex flex-col justify-center items-center h-[640px] bg-black/[0.015] px-1 text-center border-x border-black/10">
              
              {/* Trophy Section - Positioned comfortably at the top */}
              <div className="absolute top-4 left-0 right-0 flex flex-col items-center pointer-events-none">
                {championData ? (
                  <div className="flex flex-col items-center animate-in fade-in duration-300 max-w-[155px] pointer-events-auto">
                    
                    {/* Trophy Image with subtle shimmer */}
                    {cupMeta.trophyUrl && (
                      <div className="relative overflow-hidden mb-1 group">
                        <img
                          src={cupMeta.trophyUrl}
                          alt={cupMeta.title}
                          className="h-[80px] w-auto max-h-[80px] object-contain block filter drop-shadow-[0_3px_5px_rgba(0,0,0,0.15)]"
                          style={{ maxHeight: '80px', width: 'auto' }}
                        />
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2.5s_infinite] skew-x-12" />
                      </div>
                    )}

                    <div className="text-[8.5px] font-sans font-black tracking-widest uppercase text-emerald-800 mb-0.5">
                      {cupMeta.title} WINNER
                    </div>

                    {/* Champion Team Banner */}
                    {championData.team?.banner_url ? (
                      <img
                        src={championData.team.banner_url}
                        alt={championData.team.team_name}
                        className="h-[20px] max-w-[120px] object-contain block filter contrast-125 border border-black/20 p-0.5 bg-white shadow-2xs"
                        style={{ maxHeight: '20px', maxWidth: '120px', width: 'auto' }}
                      />
                    ) : (
                      <span className="text-[11px] font-black uppercase tracking-tight font-sans">{championData.team?.team_name}</span>
                    )}
                    <span className="text-[7.5px] font-mono font-bold uppercase text-black/70 mt-0.5">
                      Finals Victory ({championData.score})
                    </span>
                  </div>
                ) : (
                  /* Silhouette Placeholder before final champion is declared */
                  <div className="flex flex-col items-center opacity-30 max-w-[155px]">
                    {cupMeta.trophyUrl && (
                      <img
                        src={cupMeta.trophyUrl}
                        alt={cupMeta.title}
                        className="h-[80px] w-auto max-h-[80px] object-contain block grayscale brightness-50 mb-1"
                        style={{ maxHeight: '80px', width: 'auto' }}
                      />
                    )}
                    <div className="text-[8.5px] font-sans font-black tracking-widest uppercase mb-0.5">
                      {cupMeta.title}
                    </div>
                    <div className="h-[20px] w-[75px] border border-dashed border-black/40 bg-black/[0.02]" />
                  </div>
                )}
              </div>

              {/* Title Match Box - Positioned with ample breathing room */}
              <div className="z-10 mt-28">
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
            <div className="flex flex-col justify-center h-[640px] text-center items-center">
              <MatchupCard
                match={getMatch('Conference Finals - 2')}
                label="Conference Finals - 2"
                onSelect={(m, l) => handleCardSelect(m, l)}
              />
            </div>

            {/* 6. RIGHT SEMI FINALS (2 Matches) */}
            <div className="grid grid-rows-2 h-[640px] text-center items-center">
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
            <div className="grid grid-rows-4 h-[640px] text-center items-center">
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

        {/* Clean Footer Note */}
        <div className="min-w-[1260px] max-w-[1440px] mx-auto mt-4 px-1 flex items-center justify-between text-[11px] font-sans text-black/60">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-black/70" />
            <span>Click on any matchup to view the full game-by-game boxscore modal.</span>
          </div>
          <div className="flex items-center gap-3 font-mono font-bold text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-600 inline-block" /> Winning Game
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-white border border-black/40 inline-block" /> Scheduled / Loss
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