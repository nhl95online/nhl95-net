"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, ChevronDown, CheckCircle2, X, ZoomIn, ZoomOut, RotateCcw, Info, Sparkles, Flame, Award,
  Activity, Clock, Shield
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getTeamBannerUrls } from '../standings/page';

function formatDayFractionOrTime(val: any): string {
  if (val === null || val === undefined || val === '') return '0:00';
  const str = String(val).trim();
  if (str.includes(':')) {
    const parts = str.split(':');
    if (parts.length === 3) {
      const m = parseInt(parts[1], 10) + parseInt(parts[0], 10) * 60;
      return `${m}:${parts[2]}`;
    }
    return str;
  }
  const num = parseFloat(str);
  if (isNaN(num)) return '0:00';
  if (num === 0) return '0:00';
  if (num > 100) {
    return formatSecondsToMMSS(num);
  }
  const totalMinutes = num * 24 * 60;
  const mins = Math.floor(totalMinutes);
  const secs = Math.round((totalMinutes - mins) * 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function formatSecondsToMMSS(seconds: number | string): string {
  const s = typeof seconds === 'string' ? parseInt(seconds, 10) : seconds;
  if (isNaN(s) || s <= 0) return '0:00';
  const m = Math.floor(s / 60);
  const remS = s % 60;
  return `${m}:${remS < 10 ? '0' : ''}${remS}`;
}

// ==========================================
// 1. TYPES & DATA HELPERS
// ==========================================

export interface SeriesGameResult {
  game_number: number;
  home_score: number;
  away_score: number;
  home_team_id: number;
  away_team_id: number;
  game_id?: number | string;
  home_stats?: any;
  away_stats?: any;
  game_results?: string;
  game_meta?: any;
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
  id?: number | string;
  playoff_id?: number | string;
  league_id?: number | string;
  season_id?: number | string;
  round_name?: string;
  match_label: string;
  home_team_id?: number;
  away_team_id?: number;
  next_match_id?: number | string | null;
  winner_id?: number | null;
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

  const parentHomeId = match.home_team_id || (match.results && match.results.length > 0 ? match.results[0].home_team_id : null);
  const parentAwayId = match.away_team_id || (match.results && match.results.length > 0 ? match.results[0].away_team_id : null);
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
  const games = match.results || [];

  const homeWonSeries = series.isComplete && series.winner === 'home';
  const awayWonSeries = series.isComplete && series.winner === 'away';

  // Selected game view ('overview' or game_number)
  const [activeView, setActiveView] = useState<number | 'overview'>(() => {
    return games.length > 0 ? games[0].game_number : 'overview';
  });

  // Boxscore tabs for selected game
  const [activeTab, setActiveTab] = useState<'summary' | 'team_stats' | 'skaters' | 'goalies' | 'scoring' | 'penalties'>('summary');

  // Detailed boxscore state
  const [gameBoxscore, setGameBoxscore] = useState<{
    skaters: any[];
    goalies: any[];
    scoring: any[];
    penalties: any[];
    loading: boolean;
  }>({
    skaters: [],
    goalies: [],
    scoring: [],
    penalties: [],
    loading: false
  });

  const selectedGame = useMemo(() => {
    if (activeView === 'overview') return null;
    return games.find(g => g.game_number === activeView) || null;
  }, [activeView, games]);

  // Fetch detailed boxscore for the selected game
  useEffect(() => {
    if (!selectedGame || !selectedGame.game_id) {
      setGameBoxscore({ skaters: [], goalies: [], scoring: [], penalties: [], loading: false });
      return;
    }

    let isMounted = true;
    async function loadBoxscore() {
      setGameBoxscore(prev => ({ ...prev, loading: true }));

      try {
        const gId = selectedGame!.game_id;
        const hId = Number(selectedGame!.home_team_id);
        const aId = Number(selectedGame!.away_team_id);

        // Fetch from playoff tables first
        const [pStatsPlayoff, scoringPlayoff, penaltiesPlayoff] = await Promise.all([
          supabase.from('league_playoff_player_stats_master').select('*').eq('game_id', gId),
          supabase.from('league_playoff_scoring').select('*').eq('game_id', gId).order('period', { ascending: true }),
          supabase.from('league_playoff_penalties').select('*').eq('game_id', gId).order('period', { ascending: true })
        ]);

        let rawPlayers = pStatsPlayoff.data || [];
        let scoringData = scoringPlayoff.data || [];
        let penaltyData = penaltiesPlayoff.data || [];

        // Fallback to regular tables if playoff tables returned empty
        if (rawPlayers.length === 0) {
          const [pStatsReg, scoringReg, penReg] = await Promise.all([
            supabase.from('league_player_stats_master').select('*').eq('game_id', gId),
            supabase.from('league_scoring').select('*').eq('game_id', gId).order('period', { ascending: true }),
            supabase.from('league_penalties').select('*').eq('game_id', gId).order('period', { ascending: true })
          ]);
          rawPlayers = pStatsReg.data || [];
          scoringData = scoringReg.data || [];
          penaltyData = penReg.data || [];
        }

        // Collect player IDs and query player database for names
        const playerIds = Array.from(new Set(
          rawPlayers.map((p: any) => Number(p.player_id)).filter((id: number) => !isNaN(id) && id > 0)
        ));

        let playerDbRows: any[] = [];
        if (playerIds.length > 0) {
          const { data: dbData } = await supabase
            .from('league_player_database')
            .select('player_id, player_name, pos')
            .in('player_id', playerIds);
          playerDbRows = dbData || [];
        }

        const nameMap = new Map<number, string>();
        playerDbRows.forEach((p: any) => {
          if (p.player_id && p.player_name) {
            nameMap.set(Number(p.player_id), String(p.player_name).trim());
          }
        });

        // Harvest names from scoring and penalties
        scoringData.forEach((g: any) => {
          if (g.scorer_id && g.scorer && !String(g.scorer).startsWith('Player #')) {
            nameMap.set(Number(g.scorer_id), String(g.scorer).trim());
          }
          if (g.assist1_id && g.assist1 && g.assist1 !== '--' && !String(g.assist1).startsWith('Player #')) {
            nameMap.set(Number(g.assist1_id), String(g.assist1).trim());
          }
          if (g.assist2_id && g.assist2 && g.assist2 !== '--' && !String(g.assist2).startsWith('Player #')) {
            nameMap.set(Number(g.assist2_id), String(g.assist2).trim());
          }
        });

        penaltyData.forEach((p: any) => {
          if (p.player_id && p.player && !String(p.player).startsWith('Player #')) {
            nameMap.set(Number(p.player_id), String(p.player).trim());
          }
        });

        const skatersList: any[] = [];
        const goaliesList: any[] = [];

        rawPlayers.forEach((p: any) => {
          const pId = Number(p.player_id);
          const isGoalie = p.pos_played === 'G';
          let resolvedName = nameMap.get(pId) || p.player_name || `Player #${pId || (isGoalie ? 'G' : 'F')}`;

          if (isGoalie) {
            const shots = Number(p.shots_against || 0);
            const ga = Number(p.goals_against || 0);
            const saves = Number(p.saves || 0);
            const savePct = shots > 0 ? (saves / shots) : 0;
            const isWin = p.is_win === true || p.is_win === 1;
            const isLoss = p.is_loss === true || p.is_loss === 1;
            const isTie = p.is_tie === true || p.is_tie === 1;
            const isOtl = p.is_otl === true || p.is_otl === 1;

            goaliesList.push({
              ...p,
              name: resolvedName,
              ga,
              saves,
              shots,
              savePct,
              so: ga === 0 && saves > 0 ? 1 : 0,
              decision: isWin ? 'W' : isLoss ? 'L' : isOtl ? 'OTL' : isTie ? 'T' : '-',
              toi: formatSecondsToMMSS(p.toi)
            });
          } else {
            const g = Number(p.goals || 0);
            const a = Number(p.assists || 0);
            skatersList.push({
              ...p,
              name: resolvedName,
              pos: p.pos_played || 'F',
              goals: g,
              assists: a,
              points: g + a,
              sog: Number(p.shots || 0),
              checks: Number(p.checks || 0),
              pim: Number(p.pim || 0),
              ppp: Number(p.pp_points || 0),
              shp: Number(p.sh_points || 0),
              toi: formatSecondsToMMSS(p.toi)
            });
          }
        });

        const scoringList = scoringData.map((goal: any, idx: number) => {
          const scorerId = Number(goal.scorer_id);
          const a1Id = goal.assist1_id ? Number(goal.assist1_id) : null;
          const a2Id = goal.assist2_id ? Number(goal.assist2_id) : null;

          return {
            goalNum: idx + 1,
            period: goal.period,
            time: goal.time,
            team: goal.team || (Number(goal.team_id) === hId ? (home?.abbreviation || 'HOM') : (away?.abbreviation || 'AWY')),
            side: Number(goal.team_id) === hId ? 'Home' : 'Away',
            scorer: nameMap.get(scorerId) || goal.scorer || `Player #${scorerId}`,
            assist1: a1Id ? (nameMap.get(a1Id) || goal.assist1 || `Player #${a1Id}`) : (goal.assist1 || '--'),
            assist2: a2Id ? (nameMap.get(a2Id) || goal.assist2 || `Player #${a2Id}`) : (goal.assist2 || '--'),
            type: goal.way || 'EV'
          };
        });

        const penaltiesList = penaltyData.map((pen: any, idx: number) => {
          const pId = Number(pen.player_id);
          return {
            penNum: idx + 1,
            period: pen.period,
            time: pen.time,
            team: pen.team || (Number(pen.team_id) === hId ? (home?.abbreviation || 'HOM') : (away?.abbreviation || 'AWY')),
            side: Number(pen.team_id) === hId ? 'Home' : 'Away',
            player: nameMap.get(pId) || pen.player || `Player #${pId}`,
            type: pen.penalty_type || 'Penalty'
          };
        });

        if (isMounted) {
          setGameBoxscore({
            skaters: skatersList,
            goalies: goaliesList,
            scoring: scoringList,
            penalties: penaltiesList,
            loading: false
          });
        }
      } catch (err) {
        console.error("Failed fetching playoff boxscore:", err);
        if (isMounted) {
          setGameBoxscore({ skaters: [], goalies: [], scoring: [], penalties: [], loading: false });
        }
      }
    }

    loadBoxscore();
    return () => { isMounted = false; };
  }, [selectedGame]);

  // Parse Stats & Period Metrics
  const homeStatsObj = useMemo(() => {
    if (!selectedGame?.home_stats) return {};
    const raw = selectedGame.home_stats;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }, [selectedGame]);

  const awayStatsObj = useMemo(() => {
    if (!selectedGame?.away_stats) return {};
    const raw = selectedGame.away_stats;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }, [selectedGame]);

  const metaObj = useMemo(() => {
    if (!selectedGame?.game_meta) return {};
    const raw = selectedGame.game_meta;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }, [selectedGame]);

  const isOT = Boolean(metaObj?.is_ot);

  // Period-by-period matrix calculation
  const periodSummary = useMemo(() => {
    if (!selectedGame) return null;
    const h = homeStatsObj;
    const a = awayStatsObj;

    const awayG1 = Number(a.away_1st_goals || 0);
    const awayG2 = Number(a.away_2nd_goals || 0);
    const awayG3 = Number(a.away_3rd_goals || 0);
    const awayGOT = Number(a.away_ot_goals || 0);
    const awayTotalG = selectedGame.away_score ?? Number(a.away_goals || 0);

    const homeG1 = Number(h.home_1st_goals || 0);
    const homeG2 = Number(h.home_2nd_goals || 0);
    const homeG3 = Number(h.home_3rd_goals || 0);
    const homeGOT = Number(h.home_ot_goals || 0);
    const homeTotalG = selectedGame.home_score ?? Number(h.home_goals || 0);

    const awayS1 = Number(a.away_1st_shots || 0);
    const awayS2 = Number(a.away_2nd_shots || 0);
    const awayS3 = Number(a.away_3rd_shots || 0);
    const awaySOT = Number(a.away_ot_shots || 0);
    const awayTotalShots = Number(a.away_shots || (awayS1 + awayS2 + awayS3 + awaySOT));

    const homeS1 = Number(h.home_1st_shots || 0);
    const homeS2 = Number(h.home_2nd_shots || 0);
    const homeS3 = Number(h.home_3rd_shots || 0);
    const homeSOT = Number(h.home_ot_shots || 0);
    const homeTotalShots = Number(h.home_shots || (homeS1 + homeS2 + homeS3 + homeSOT));

    return {
      away: { g1: awayG1, g2: awayG2, g3: awayG3, got: awayGOT, totalG: awayTotalG, totalS: awayTotalShots },
      home: { g1: homeG1, g2: homeG2, g3: homeG3, got: homeGOT, totalG: homeTotalG, totalS: homeTotalShots }
    };
  }, [selectedGame, homeStatsObj, awayStatsObj]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#fbf8f2] border-4 border-black text-black font-serif shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        
        {/* Retro 90s Arcade Pinned Header Bar */}
        <div className="bg-black text-white p-3 border-b-4 border-black flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-600 border border-white animate-pulse" />
            <div>
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest font-sans text-amber-300">
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

        {/* Series Matchup Banner (Compact) */}
        <div className="p-3 border-b-2 border-black bg-[#f2eee3] shrink-0">
          <div className="grid grid-cols-5 items-center gap-2 text-center">
            {/* Home Team */}
            <div className={`col-span-2 flex items-center justify-between p-2 border-2 border-black ${
              homeWonSeries ? 'bg-emerald-100/90 shadow-[3px_3px_0px_#059669]' : 'bg-white shadow-[2px_2px_0px_#000]'
            }`}>
              <div className="flex items-center gap-1.5 min-w-0">
                {match.home_team_seed && (
                  <span className="text-[8px] font-mono font-black bg-black text-white px-1 border border-black shrink-0">
                    #{match.home_team_seed}
                  </span>
                )}
                {home?.banner_url ? (
                  <img 
                    src={home.banner_url} 
                    alt={home.team_name} 
                    className="h-[20px] max-w-[90px] w-auto object-contain shrink-0" 
                  />
                ) : (
                  <span className="text-xs font-black uppercase truncate font-sans">{home?.team_name || 'Home'}</span>
                )}
              </div>
              <div className={`px-2 py-0.5 border-2 border-black font-mono font-black text-lg shrink-0 ${
                homeWonSeries ? 'bg-[#16a34a] text-white' : 'bg-neutral-900 text-white'
              }`}>
                {series.homeWins}
              </div>
            </div>

            {/* VS Status Center */}
            <div className="col-span-1 flex flex-col items-center justify-center">
              <span className="bg-black text-amber-300 border border-black px-1.5 py-0.2 text-[9px] font-mono font-black uppercase">
                {series.statusPill}
              </span>
              <span className="text-[8px] font-mono font-bold uppercase mt-0.5 text-neutral-600">
                {series.isComplete ? 'SERIES FINAL' : `${games.length} PLAYED`}
              </span>
            </div>

            {/* Away Team */}
            <div className={`col-span-2 flex items-center justify-between p-2 border-2 border-black ${
              awayWonSeries ? 'bg-emerald-100/90 shadow-[3px_3px_0px_#059669]' : 'bg-white shadow-[2px_2px_0px_#000]'
            }`}>
              <div className={`px-2 py-0.5 border-2 border-black font-mono font-black text-lg shrink-0 ${
                awayWonSeries ? 'bg-[#16a34a] text-white' : 'bg-neutral-900 text-white'
              }`}>
                {series.awayWins}
              </div>
              <div className="flex items-center gap-1.5 min-w-0 justify-end">
                {away?.banner_url ? (
                  <img 
                    src={away.banner_url} 
                    alt={away.team_name} 
                    className="h-[20px] max-w-[90px] w-auto object-contain shrink-0" 
                  />
                ) : (
                  <span className="text-xs font-black uppercase truncate font-sans">{away?.team_name || 'Away'}</span>
                )}
                {match.away_team_seed && (
                  <span className="text-[8px] font-mono font-black bg-black text-white px-1 border border-black shrink-0">
                    #{match.away_team_seed}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Game Navigation Selector Tabs */}
        <div className="flex items-center gap-1 p-2 bg-[#1e232a] border-b-2 border-black overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveView('overview')}
            className={`px-3 py-1 text-xs font-mono font-black uppercase border transition cursor-pointer shrink-0 ${
              activeView === 'overview'
                ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_6px_#f59e0b]'
                : 'bg-neutral-800 text-neutral-300 border-neutral-600 hover:bg-neutral-700'
            }`}
          >
            🏆 Series Overview
          </button>

          {games.map((g) => {
            const parentHomeId = match.home_team_id;
            const parentAwayId = match.away_team_id;
            const hScore = g.home_team_id === parentHomeId ? g.home_score : g.away_score;
            const aScore = g.away_team_id === parentAwayId ? g.away_score : g.home_score;
            const isSelected = activeView === g.game_number;

            return (
              <button
                key={`tab-g-${g.game_number}`}
                onClick={() => setActiveView(g.game_number)}
                className={`px-3 py-1 text-xs font-mono font-black uppercase border transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? 'bg-[#16a34a] text-white border-emerald-300 shadow-[0_0_8px_#22c55e]'
                    : 'bg-neutral-800 text-neutral-300 border-neutral-600 hover:bg-neutral-700'
                }`}
              >
                <span>G{g.game_number}:</span>
                <span className="font-bold">
                  {home?.abbreviation || 'HOM'} {hScore} - {aScore} {away?.abbreviation || 'AWY'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-[#fbf8f2]">
          
          {/* ========================================================= */}
          {/* VIEW A: SERIES OVERVIEW MATRIX                            */}
          {/* ========================================================= */}
          {activeView === 'overview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b-2 border-black pb-1">
                <h4 className="text-xs font-mono font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-emerald-600 inline-block border border-black shadow-[0_0_4px_#22c55e]" />
                  GAME-BY-GAME SERIES MATRIX
                </h4>
                <span className="text-[10px] font-mono text-neutral-600 uppercase font-bold">
                  Click any game above or below to open its full boxscore
                </span>
              </div>

              {games.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-black/40 text-black/60 font-mono text-xs italic bg-white/60">
                  NO GAMES HAVE BEEN RECORDED FOR THIS SERIES YET.
                </div>
              ) : (
                <div className="space-y-2">
                  {games.map((g) => {
                    const parentHomeId = match.home_team_id;
                    const parentAwayId = match.away_team_id;
                    const homeScore = g.home_team_id === parentHomeId ? g.home_score : g.away_score;
                    const awayScore = g.away_team_id === parentAwayId ? g.away_score : g.home_score;
                    const homeWon = homeScore > awayScore;

                    return (
                      <div
                        key={`overview-g-${g.game_number}`}
                        onClick={() => setActiveView(g.game_number)}
                        className="flex items-center justify-between p-3 border-2 border-black bg-white text-xs font-mono shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:bg-amber-50/70 cursor-pointer transition"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 bg-black text-amber-300 flex items-center justify-center font-bold text-xs border border-black font-mono">
                            G{g.game_number}
                          </span>
                          <span className="font-mono font-black text-black text-sm uppercase">Game {g.game_number}</span>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            {/* Home Score */}
                            <div className={`flex items-center gap-1.5 px-2 py-1 border ${
                              homeWon 
                                ? 'bg-[#16a34a] border-emerald-950 text-white font-black shadow-[0_0_6px_rgba(34,197,94,0.9)]' 
                                : 'bg-neutral-100 border-neutral-400 text-neutral-800 font-bold'
                            }`}>
                              <span className="text-xs font-mono uppercase">{home?.abbreviation || 'HOM'}</span>
                              <span className="text-sm font-black">{homeScore}</span>
                            </div>

                            <span className="text-black/40 font-bold">-</span>

                            {/* Away Score */}
                            <div className={`flex items-center gap-1.5 px-2 py-1 border ${
                              !homeWon 
                                ? 'bg-[#16a34a] border-emerald-950 text-white font-black shadow-[0_0_6px_rgba(34,197,94,0.9)]' 
                                : 'bg-neutral-100 border-neutral-400 text-neutral-800 font-bold'
                            }`}>
                              <span className="text-sm font-black">{awayScore}</span>
                              <span className="text-xs font-mono uppercase">{away?.abbreviation || 'AWY'}</span>
                            </div>
                          </div>

                          <span className="px-2.5 py-1 text-[10px] font-mono font-black uppercase bg-black text-white border border-black">
                            {homeWon ? (home?.abbreviation || 'HOM') : (away?.abbreviation || 'AWY')} WIN
                          </span>

                          <span className="text-[10px] font-mono font-black text-blue-700 underline uppercase">
                            VIEW BOXSCORE →
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW B: FULL DETAILED GAME BOXSCORE                       */}
          {/* ========================================================= */}
          {activeView !== 'overview' && selectedGame && (
            <div className="space-y-4">
              
              {/* Scoreboard Header Box */}
              <div className="bg-black text-white p-4 border-2 border-black shadow-[3px_3px_0px_#000]">
                <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                  {/* Away Team */}
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="text-[9px] uppercase font-mono font-bold text-neutral-400">AWAY</div>
                      <div className="text-xl font-black">{away?.team_name || 'Away Team'}</div>
                      <div className="text-[10px] text-amber-300 font-mono">
                        {periodSummary?.away.totalS || 0} SOG
                      </div>
                    </div>
                    <div className="text-3xl font-black font-mono ml-2 text-amber-400">
                      {selectedGame.away_team_id === match.away_team_id ? selectedGame.away_score : selectedGame.home_score}
                    </div>
                  </div>

                  {/* Center Info */}
                  <div className="text-center px-4 border-y md:border-y-0 md:border-x border-white/20 py-1">
                    <div className="text-xs uppercase font-mono font-black text-amber-400">
                      GAME {selectedGame.game_number} FINAL {isOT ? '(OT)' : ''}
                    </div>
                    <div className="text-sm font-black tracking-tight my-0.5">
                      {away?.abbreviation || 'AWY'} @ {home?.abbreviation || 'HOM'}
                    </div>
                    <div className="text-[10px] text-neutral-300 font-mono flex items-center justify-center gap-2">
                      <span>FO: {homeStatsObj.total_faceoffs || awayStatsObj.total_faceoffs || 0}</span>
                      <span>•</span>
                      <span>Time: 15:00</span>
                    </div>
                  </div>

                  {/* Home Team */}
                  <div className="flex items-center gap-3 flex-row-reverse md:flex-row">
                    <div className="text-3xl font-black font-mono mr-2 text-amber-400">
                      {selectedGame.home_team_id === match.home_team_id ? selectedGame.home_score : selectedGame.away_score}
                    </div>
                    <div className="text-right md:text-left">
                      <div className="text-[9px] uppercase font-mono font-bold text-neutral-400">HOME</div>
                      <div className="text-xl font-black">{home?.team_name || 'Home Team'}</div>
                      <div className="text-[10px] text-amber-300 font-mono">
                        {periodSummary?.home.totalS || 0} SOG
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Period-by-Period Table */}
              {periodSummary && (
                <div className="bg-[#f4f1ea] border-2 border-black p-2.5 overflow-x-auto shadow-[2px_2px_0px_#000]">
                  <table className="w-full text-xs font-mono text-center">
                    <thead>
                      <tr className="border-b border-black/20 text-neutral-600 font-sans uppercase">
                        <th className="text-left font-bold py-1">Team</th>
                        <th>1st</th>
                        <th>2nd</th>
                        <th>3rd</th>
                        {isOT && <th>OT</th>}
                        <th className="font-bold">Total</th>
                        <th className="font-bold">Shots</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-black/10">
                        <td className="text-left font-bold font-sans py-1">{away?.team_name}</td>
                        <td>{periodSummary.away.g1}</td>
                        <td>{periodSummary.away.g2}</td>
                        <td>{periodSummary.away.g3}</td>
                        {isOT && <td>{periodSummary.away.got}</td>}
                        <td className="font-bold bg-amber-100">{periodSummary.away.totalG}</td>
                        <td className="text-neutral-600">{periodSummary.away.totalS}</td>
                      </tr>
                      <tr>
                        <td className="text-left font-bold font-sans py-1">{home?.team_name}</td>
                        <td>{periodSummary.home.g1}</td>
                        <td>{periodSummary.home.g2}</td>
                        <td>{periodSummary.home.g3}</td>
                        {isOT && <td>{periodSummary.home.got}</td>}
                        <td className="font-bold bg-amber-100">{periodSummary.home.totalG}</td>
                        <td className="text-neutral-600">{periodSummary.home.totalS}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Boxscore Sub-Tabs */}
              <div className="flex border-b-2 border-black bg-white overflow-x-auto text-xs font-mono font-bold uppercase">
                {[
                  { id: 'summary', label: 'Summary' },
                  { id: 'team_stats', label: 'Team Stats' },
                  { id: 'skaters', label: `Skaters (${gameBoxscore.skaters.length})` },
                  { id: 'goalies', label: `Goalies (${gameBoxscore.goalies.length})` },
                  { id: 'scoring', label: `Goals (${gameBoxscore.scoring.length})` },
                  { id: 'penalties', label: `Penalties (${gameBoxscore.penalties.length})` }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`px-3.5 py-2 transition whitespace-nowrap border-r border-black/20 cursor-pointer ${
                      activeTab === t.id ? 'bg-black text-white font-black' : 'hover:bg-neutral-100 text-black'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab Contents */}
              {gameBoxscore.loading ? (
                <div className="p-8 text-center text-xs font-mono font-bold uppercase text-neutral-500 animate-pulse bg-white border-2 border-black">
                  Loading detailed player statistics and game logs...
                </div>
              ) : (
                <div className="bg-white border-2 border-black p-4 shadow-[2px_2px_0px_#000]">
                  
                  {/* 1. Summary Tab */}
                  {activeTab === 'summary' && (
                    <div className="space-y-4 text-xs font-mono">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-3 bg-[#faf8f5] border border-black/30">
                          <span className="font-bold text-neutral-700 uppercase font-sans">Powerplay Efficiency:</span>
                          <p className="mt-1">
                            <strong>{away?.abbreviation || 'AWY'}:</strong> {awayStatsObj.away_pp_goals || 0}/{awayStatsObj.away_pp_opps || 0} ({formatDayFractionOrTime(awayStatsObj.away_pp_minutes)} TOI)
                          </p>
                          <p className="mt-1">
                            <strong>{home?.abbreviation || 'HOM'}:</strong> {homeStatsObj.home_pp_goals || 0}/{homeStatsObj.home_pp_opps || 0} ({formatDayFractionOrTime(homeStatsObj.home_pp_minutes)} TOI)
                          </p>
                        </div>
                        <div className="p-3 bg-[#faf8f5] border border-black/30">
                          <span className="font-bold text-neutral-700 uppercase font-sans">Zone Time & Physicality:</span>
                          <p className="mt-1">
                            <strong>Attack Zone:</strong> {formatDayFractionOrTime(awayStatsObj.away_atk)} vs {formatDayFractionOrTime(homeStatsObj.home_atk)}
                          </p>
                          <p className="mt-1">
                            <strong>Body Checks:</strong> {awayStatsObj.away_bodychecks || 0} vs {homeStatsObj.home_bodychecks || 0}
                          </p>
                        </div>
                      </div>

                      {/* Top Performers */}
                      <div>
                        <h4 className="font-black text-xs uppercase border-b border-black pb-1 mb-2 font-sans flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-amber-600" /> Top Performers
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Away Leaders */}
                          <div className="border border-black p-2.5 bg-white">
                            <div className="font-bold text-xs uppercase mb-1.5 text-red-800 font-sans">
                              {away?.team_name} Leaders
                            </div>
                            <div className="space-y-1">
                              {gameBoxscore.skaters
                                .filter(s => Number(s.team_id) === Number(match.away_team_id))
                                .sort((a, b) => b.points - a.points || b.goals - a.goals)
                                .slice(0, 3)
                                .map((s, i) => (
                                  <div key={i} className="flex justify-between py-0.5 border-b border-neutral-100">
                                    <span>{s.name} ({s.pos})</span>
                                    <span className="font-bold">{s.goals}G, {s.assists}A ({s.points} PTS)</span>
                                  </div>
                                ))}
                              {gameBoxscore.skaters.filter(s => Number(s.team_id) === Number(match.away_team_id)).length === 0 && (
                                <p className="text-neutral-400 italic text-[11px]">No skater stats logged.</p>
                              )}
                            </div>
                          </div>

                          {/* Home Leaders */}
                          <div className="border border-black p-2.5 bg-white">
                            <div className="font-bold text-xs uppercase mb-1.5 text-blue-800 font-sans">
                              {home?.team_name} Leaders
                            </div>
                            <div className="space-y-1">
                              {gameBoxscore.skaters
                                .filter(s => Number(s.team_id) === Number(match.home_team_id))
                                .sort((a, b) => b.points - a.points || b.goals - a.goals)
                                .slice(0, 3)
                                .map((s, i) => (
                                  <div key={i} className="flex justify-between py-0.5 border-b border-neutral-100">
                                    <span>{s.name} ({s.pos})</span>
                                    <span className="font-bold">{s.goals}G, {s.assists}A ({s.points} PTS)</span>
                                  </div>
                                ))}
                              {gameBoxscore.skaters.filter(s => Number(s.team_id) === Number(match.home_team_id)).length === 0 && (
                                <p className="text-neutral-400 italic text-[11px]">No skater stats logged.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. Team Stats Tab */}
                  {activeTab === 'team_stats' && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs font-mono">
                        <thead>
                          <tr className="border-b-2 border-black font-sans uppercase text-neutral-600">
                            <th className="text-left py-1.5 font-bold">{away?.team_name}</th>
                            <th className="text-center py-1.5 font-bold text-black">Metric</th>
                            <th className="text-right py-1.5 font-bold">{home?.team_name}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200">
                          {[
                            { label: 'Total Goals', away: selectedGame.away_score, home: selectedGame.home_score },
                            { label: 'Shots on Goal', away: awayStatsObj.away_shots || periodSummary?.away.totalS || 0, home: homeStatsObj.home_shots || periodSummary?.home.totalS || 0 },
                            { label: 'Power Play Goals / Opps', away: `${awayStatsObj.away_pp_goals || 0} / ${awayStatsObj.away_pp_opps || 0}`, home: `${homeStatsObj.home_pp_goals || 0} / ${homeStatsObj.home_pp_opps || 0}` },
                            { label: 'Power Play Time', away: formatDayFractionOrTime(awayStatsObj.away_pp_minutes), home: formatDayFractionOrTime(homeStatsObj.home_pp_minutes) },
                            { label: 'Short Handed Goals', away: awayStatsObj.away_sh_goals || 0, home: homeStatsObj.home_sh_goals || 0 },
                            { label: 'Faceoffs Won', away: awayStatsObj.away_faceoff_won || 0, home: homeStatsObj.home_faceoff_won || 0 },
                            { label: 'Body Checks', away: awayStatsObj.away_bodychecks || 0, home: homeStatsObj.home_bodychecks || 0 },
                            { label: 'Penalties / PIM', away: `${awayStatsObj.away_pen || 0} (${awayStatsObj.away_pim || 0} min)`, home: `${homeStatsObj.home_pen || 0} (${homeStatsObj.home_pim || 0} min)` },
                            { label: 'Attack Zone Time', away: formatDayFractionOrTime(awayStatsObj.away_atk), home: formatDayFractionOrTime(homeStatsObj.home_atk) },
                            { label: 'Pass Comps / Attempts', away: `${awayStatsObj.away_pass_completions || 0} / ${awayStatsObj.away_pass_attempts || 0}`, home: `${homeStatsObj.home_pass_completions || 0} / ${homeStatsObj.home_pass_attempts || 0}` },
                            { label: 'Breakaway Goals / Tries', away: `${awayStatsObj.away_breakaway_goals || 0} / ${awayStatsObj.away_breakaways || 0}`, home: `${homeStatsObj.home_breakaway_goals || 0} / ${homeStatsObj.home_breakaways || 0}` },
                            { label: 'One-Timer Goals / Tries', away: `${awayStatsObj.away_onetimer_goals || 0} / ${awayStatsObj.away_onetimers || 0}`, home: `${homeStatsObj.home_onetimer_goals || 0} / ${homeStatsObj.home_onetimers || 0}` }
                          ].map((m, idx) => (
                            <tr key={idx} className="hover:bg-neutral-50">
                              <td className="py-1.5 text-left font-bold">{m.away}</td>
                              <td className="py-1.5 text-center font-sans text-neutral-700">{m.label}</td>
                              <td className="py-1.5 text-right font-bold">{m.home}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 3. Skaters Tab */}
                  {activeTab === 'skaters' && (
                    <div className="space-y-4">
                      {/* Away Skaters */}
                      <div>
                        <h4 className="font-bold text-xs uppercase border-b-2 border-black pb-1 mb-2 text-red-800 font-sans">
                          {away?.team_name} Skaters
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs font-mono text-center">
                            <thead>
                              <tr className="border-b border-black/20 text-neutral-600 font-sans uppercase">
                                <th className="text-left py-1">Player</th>
                                <th>Pos</th>
                                <th className="font-bold">G</th>
                                <th className="font-bold">A</th>
                                <th className="font-bold">PTS</th>
                                <th>SOG</th>
                                <th>CHK</th>
                                <th>PIM</th>
                                <th>TOI</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200">
                              {gameBoxscore.skaters
                                .filter(s => Number(s.team_id) === Number(match.away_team_id))
                                .map((s, i) => (
                                  <tr key={i} className={s.toi === '0:00' ? 'opacity-40' : 'hover:bg-neutral-50'}>
                                    <td className="text-left font-bold font-sans py-1">{s.name}</td>
                                    <td>{s.pos}</td>
                                    <td className="font-bold">{s.goals}</td>
                                    <td className="font-bold">{s.assists}</td>
                                    <td className="font-bold bg-amber-100">{s.points}</td>
                                    <td>{s.sog}</td>
                                    <td>{s.checks}</td>
                                    <td>{s.pim}</td>
                                    <td>{s.toi}</td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Home Skaters */}
                      <div>
                        <h4 className="font-bold text-xs uppercase border-b-2 border-black pb-1 mb-2 text-blue-800 font-sans">
                          {home?.team_name} Skaters
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs font-mono text-center">
                            <thead>
                              <tr className="border-b border-black/20 text-neutral-600 font-sans uppercase">
                                <th className="text-left py-1">Player</th>
                                <th>Pos</th>
                                <th className="font-bold">G</th>
                                <th className="font-bold">A</th>
                                <th className="font-bold">PTS</th>
                                <th>SOG</th>
                                <th>CHK</th>
                                <th>PIM</th>
                                <th>TOI</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200">
                              {gameBoxscore.skaters
                                .filter(s => Number(s.team_id) === Number(match.home_team_id))
                                .map((s, i) => (
                                  <tr key={i} className={s.toi === '0:00' ? 'opacity-40' : 'hover:bg-neutral-50'}>
                                    <td className="text-left font-bold font-sans py-1">{s.name}</td>
                                    <td>{s.pos}</td>
                                    <td className="font-bold">{s.goals}</td>
                                    <td className="font-bold">{s.assists}</td>
                                    <td className="font-bold bg-amber-100">{s.points}</td>
                                    <td>{s.sog}</td>
                                    <td>{s.checks}</td>
                                    <td>{s.pim}</td>
                                    <td>{s.toi}</td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 4. Goalies Tab */}
                  {activeTab === 'goalies' && (
                    <div className="space-y-4">
                      {/* Away Goalies */}
                      <div>
                        <h4 className="font-bold text-xs uppercase border-b-2 border-black pb-1 mb-2 text-red-800 font-sans">
                          {away?.team_name} Goaltenders
                        </h4>
                        <table className="w-full text-xs font-mono text-center">
                          <thead>
                            <tr className="border-b border-black/20 text-neutral-600 font-sans uppercase">
                              <th className="text-left py-1">Goalie</th>
                              <th>GA</th>
                              <th>Saves</th>
                              <th>Shots</th>
                              <th>SV%</th>
                              <th>SO</th>
                              <th>Dec</th>
                              <th>TOI</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-200">
                            {gameBoxscore.goalies
                              .filter(g => Number(g.team_id) === Number(match.away_team_id))
                              .map((g, i) => (
                                <tr key={i} className="hover:bg-neutral-50">
                                  <td className="text-left font-bold font-sans py-1">{g.name}</td>
                                  <td>{g.ga}</td>
                                  <td className="font-bold">{g.saves}</td>
                                  <td>{g.shots}</td>
                                  <td className="font-bold text-emerald-700">{(g.savePct * 100).toFixed(1)}%</td>
                                  <td>{g.so}</td>
                                  <td className="font-bold">{g.decision}</td>
                                  <td>{g.toi}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Home Goalies */}
                      <div>
                        <h4 className="font-bold text-xs uppercase border-b-2 border-black pb-1 mb-2 text-blue-800 font-sans">
                          {home?.team_name} Goaltenders
                        </h4>
                        <table className="w-full text-xs font-mono text-center">
                          <thead>
                            <tr className="border-b border-black/20 text-neutral-600 font-sans uppercase">
                              <th className="text-left py-1">Goalie</th>
                              <th>GA</th>
                              <th>Saves</th>
                              <th>Shots</th>
                              <th>SV%</th>
                              <th>SO</th>
                              <th>Dec</th>
                              <th>TOI</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-200">
                            {gameBoxscore.goalies
                              .filter(g => Number(g.team_id) === Number(match.home_team_id))
                              .map((g, i) => (
                                <tr key={i} className="hover:bg-neutral-50">
                                  <td className="text-left font-bold font-sans py-1">{g.name}</td>
                                  <td>{g.ga}</td>
                                  <td className="font-bold">{g.saves}</td>
                                  <td>{g.shots}</td>
                                  <td className="font-bold text-emerald-700">{(g.savePct * 100).toFixed(1)}%</td>
                                  <td>{g.so}</td>
                                  <td className="font-bold">{g.decision}</td>
                                  <td>{g.toi}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 5. Scoring Log Tab */}
                  {activeTab === 'scoring' && (
                    <div>
                      <table className="w-full text-xs font-mono">
                        <thead>
                          <tr className="border-b border-black/20 text-neutral-600 font-sans uppercase">
                            <th className="text-left py-1.5">Goal</th>
                            <th>Per</th>
                            <th>Time</th>
                            <th>Team</th>
                            <th className="text-left">Scorer</th>
                            <th className="text-left">Assists</th>
                            <th>Type</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200">
                          {gameBoxscore.scoring.map((s, idx) => (
                            <tr key={idx} className="hover:bg-neutral-50">
                              <td className="py-1.5 font-bold">#{s.goalNum}</td>
                              <td className="text-center">{s.period === 4 ? 'OT' : `P${s.period}`}</td>
                              <td className="text-center">{s.time}</td>
                              <td className="text-center font-bold">{s.team}</td>
                              <td className="text-left font-bold">{s.scorer}</td>
                              <td className="text-left text-neutral-600">
                                {s.assist1 !== '--' ? s.assist1 : 'Unassisted'}
                                {s.assist2 !== '--' ? `, ${s.assist2}` : ''}
                              </td>
                              <td className="text-center font-bold text-amber-700">{s.type}</td>
                            </tr>
                          ))}
                          {gameBoxscore.scoring.length === 0 && (
                            <tr>
                              <td colSpan={7} className="py-6 text-center text-neutral-400 italic">
                                No scoring events recorded for this game.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 6. Penalties Log Tab */}
                  {activeTab === 'penalties' && (
                    <div>
                      <table className="w-full text-xs font-mono">
                        <thead>
                          <tr className="border-b border-black/20 text-neutral-600 font-sans uppercase">
                            <th className="text-left py-1.5">Pen</th>
                            <th>Per</th>
                            <th>Time</th>
                            <th>Team</th>
                            <th className="text-left">Player</th>
                            <th className="text-left">Infraction</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200">
                          {gameBoxscore.penalties.map((p, idx) => (
                            <tr key={idx} className="hover:bg-neutral-50">
                              <td className="py-1.5 font-bold">#{p.penNum}</td>
                              <td className="text-center">{p.period === 4 ? 'OT' : `P${p.period}`}</td>
                              <td className="text-center">{p.time}</td>
                              <td className="text-center font-bold">{p.team}</td>
                              <td className="text-left font-bold">{p.player}</td>
                              <td className="text-left text-neutral-700">{p.type}</td>
                            </tr>
                          ))}
                          {gameBoxscore.penalties.length === 0 && (
                            <tr>
                              <td colSpan={6} className="py-6 text-center text-neutral-400 italic">
                                No penalties recorded for this game.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                </div>
              )}

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#ede6d8] border-t-4 border-black flex justify-between items-center shrink-0">
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
    try {
      // 1. Fetch playoff series matches, all games from league_playoff_gamestats, and team metadata
      const [playoffsRes, gamestatsRes, teamsRes] = await Promise.all([
        supabase
          .from('league_playoffs')
          .select(`
            *, 
            home_team:league_teams!league_playoffs_home_team_id_fkey(team_id, team_name, abbreviation, banner_filename),
            away_team:league_teams!league_playoffs_away_team_id_fkey(team_id, team_name, abbreviation, banner_filename)
          `)
          .eq('league_id', leagueId)
          .order('playoff_id', { ascending: true }),
        supabase
          .from('league_playoff_gamestats')
          .select('*')
          .eq('league_id', leagueId)
          .order('game_id', { ascending: true }),
        supabase
          .from('league_teams')
          .select('team_id, team_name, abbreviation, banner_filename')
          .eq('league_id', leagueId)
      ]);

      if (playoffsRes.error) {
        console.error("⛔ Supabase Playoff Query Error:", playoffsRes.error.message, playoffsRes.error.details);
        return;
      }

      const rawPlayoffs = playoffsRes.data || [];
      const rawGames = gamestatsRes.data || [];
      const allTeams = teamsRes.data || [];

      // Create quick lookup map for team details & banners
      const teamsMap = new Map<number, any>();
      allTeams.forEach((t: any) => teamsMap.set(Number(t.team_id), t));

      const matchesWithBanners = rawPlayoffs.map((match: any) => {
        const pId = match.playoff_id ?? match.id;

        // Group games for this playoff series
        const matchedGames: SeriesGameResult[] = rawGames
          .filter((g: any) => Number(g.playoff_id) === Number(pId))
          .map((g: any) => ({
            game_number: Number(g.game_num ?? g.game_number ?? 1),
            home_score: Number(g.home_score ?? 0),
            away_score: Number(g.away_score ?? 0),
            home_team_id: Number(g.home_team_id),
            away_team_id: Number(g.away_team_id),
            game_id: g.game_id,
            home_stats: g.home_stats,
            away_stats: g.away_stats,
            game_results: g.game_results,
            game_meta: g.game_meta
          }))
          .sort((a: SeriesGameResult, b: SeriesGameResult) => a.game_number - b.game_number);

        // Auto-detect teams from games if league_playoffs row has null home/away teams
        const effectiveHomeTeamId = match.home_team_id || (matchedGames.length > 0 ? matchedGames[0].home_team_id : null);
        const effectiveAwayTeamId = match.away_team_id || (matchedGames.length > 0 ? matchedGames[0].away_team_id : null);

        const resolvedHomeTeam = match.home_team || (effectiveHomeTeamId ? teamsMap.get(Number(effectiveHomeTeamId)) : null);
        const resolvedAwayTeam = match.away_team || (effectiveAwayTeamId ? teamsMap.get(Number(effectiveAwayTeamId)) : null);

        const homeBannerInfo = resolvedHomeTeam ? getTeamBannerUrls({
          team_id: resolvedHomeTeam.team_id,
          team_name: resolvedHomeTeam.team_name,
          abbreviation: resolvedHomeTeam.abbreviation,
          banner_filename: resolvedHomeTeam.banner_filename,
          league_id: leagueId
        }, leagueId) : null;

        const awayBannerInfo = resolvedAwayTeam ? getTeamBannerUrls({
          team_id: resolvedAwayTeam.team_id,
          team_name: resolvedAwayTeam.team_name,
          abbreviation: resolvedAwayTeam.abbreviation,
          banner_filename: resolvedAwayTeam.banner_filename,
          league_id: leagueId
        }, leagueId) : null;

        return {
          ...match,
          playoff_id: pId,
          home_team_id: effectiveHomeTeamId,
          away_team_id: effectiveAwayTeamId,
          home_team: resolvedHomeTeam ? {
            ...resolvedHomeTeam,
            banner_url: homeBannerInfo?.primaryUrl || null,
            fallback_urls: homeBannerInfo?.fallbackUrls || []
          } : null,
          away_team: resolvedAwayTeam ? {
            ...resolvedAwayTeam,
            banner_url: awayBannerInfo?.primaryUrl || null,
            fallback_urls: awayBannerInfo?.fallbackUrls || []
          } : null,
          results: matchedGames
        };
      });

      setMatches(matchesWithBanners);
    } catch (err) {
      console.error("⛔ Error loading playoffs:", err);
    }
  };

  // Helper map linking bracket card labels to playoff_id (1 - 15)
  const LABEL_TO_ID_MAP: Record<string, number> = {
    'quarterfinals1': 1,
    'quarterfinals2': 2,
    'quarterfinals3': 3,
    'quarterfinals4': 4,
    'quarterfinals5': 5,
    'quarterfinals6': 6,
    'quarterfinals7': 7,
    'quarterfinals8': 8,
    'semifinals1': 9,
    'semifinals2': 10,
    'semifinals3': 11,
    'semifinals4': 12,
    'conferencefinals1': 13,
    'conferencefinals2': 14,
    'finals': 15
  };

  const normalizeLabel = (str?: string | null) =>
    (str || '').replace(/[\s\-_]+/g, '').toLowerCase();

  const getMatch = (label: string): PlayoffMatch => {
    const normTarget = normalizeLabel(label);
    const expectedId = LABEL_TO_ID_MAP[normTarget];

    // 1. Primary lookup by expected playoff_id (1-15)
    if (expectedId !== undefined) {
      const byId = matches.find(m => Number(m.playoff_id ?? m.id) === expectedId);
      if (byId) return byId;
    }

    // 2. Flexible lookup by match_label (ignoring spaces and hyphens)
    const byLabel = matches.find(m => normalizeLabel(m.match_label) === normTarget);
    if (byLabel) return byLabel;

    // 3. Flexible lookup by round_name (for Finals or custom names)
    const byRound = matches.find(m => normalizeLabel(m.round_name) === normTarget);
    if (byRound) return byRound;

    return { match_label: label, results: [] };
  };

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