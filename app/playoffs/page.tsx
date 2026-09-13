"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, ChevronDown, CheckCircle2, X, ZoomIn, ZoomOut, RotateCcw, Info, Sparkles, Flame, Award,
  Activity, Clock, Shield, ChevronRight
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

const getGameOTStatus = (game?: SeriesGameResult): { isOT: boolean; label: string } => {
  if (!game) return { isOT: false, label: '' };
  let isOT = false;
  let label = 'OT';

  if (game.game_meta) {
    try {
      const meta = typeof game.game_meta === 'string' ? JSON.parse(game.game_meta) : game.game_meta;
      if (meta?.is_ot) {
        isOT = true;
        label = meta?.ot_period > 1 ? `${meta.ot_period}OT` : 'OT';
      }
    } catch (e) {
      // ignore
    }
  }

  if (!isOT && game.game_results && typeof game.game_results === 'string') {
    const upper = game.game_results.toUpperCase();
    if (upper.includes('2OT')) {
      isOT = true;
      label = '2OT';
    } else if (upper.includes('3OT')) {
      isOT = true;
      label = '3OT';
    } else if (upper.includes('OT')) {
      isOT = true;
      label = 'OT';
    }
  }

  return { isOT, label };
};

// ==========================================
// 2. MODERN WIKIPEDIA / NHL MATCHUP CARD
// ==========================================

interface ModernMatchupCardProps {
  match?: PlayoffMatch;
  label: string;
  conference?: 'east' | 'west' | 'finals';
  onSelect?: (match: PlayoffMatch, label: string) => void;
  isChampionship?: boolean;
}

const ModernMatchupCard = ({
  match = {} as PlayoffMatch,
  label,
  conference = 'east',
  onSelect,
  isChampionship = false
}: ModernMatchupCardProps) => {
  const series = getSeriesDetails(match);
  const parentHomeId = match?.home_team_id;
  const parentAwayId = match?.away_team_id;

  const homeName = match?.home_team?.team_name || "TBD";
  const awayName = match?.away_team?.team_name || "TBD";

  const homeBanner = match?.home_team?.banner_url;
  const awayBanner = match?.away_team?.banner_url;

  const homeSeed = match?.home_team_seed !== null && match?.home_team_seed !== undefined ? match.home_team_seed : "";
  const awaySeed = match?.away_team_seed !== null && match?.away_team_seed !== undefined ? match.away_team_seed : "";

  const games = match?.results || [];
  const maxDisplayGames = Math.max(series.seriesLength || 5, 5);

  const [homeImgFailed, setHomeImgFailed] = useState(false);
  const [awayImgFailed, setAwayImgFailed] = useState(false);

  const isHomeSeriesWinner = series.isComplete && series.winner === 'home';
  const isAwaySeriesWinner = series.isComplete && series.winner === 'away';

  const seedBgColor = conference === 'west' 
    ? 'bg-[#1e3a8a] text-white' 
    : conference === 'east' 
      ? 'bg-[#831843] text-white'
      : 'bg-neutral-900 text-amber-300';

  const homeRowBg = isHomeSeriesWinner
    ? (conference === 'west' ? 'bg-[#dbeafe]' : conference === 'east' ? 'bg-[#ffe4e6]' : 'bg-amber-100')
    : (conference === 'west' ? 'bg-[#f0f7ff]' : conference === 'east' ? 'bg-[#fff5f5]' : 'bg-white');

  const awayRowBg = isAwaySeriesWinner
    ? (conference === 'west' ? 'bg-[#dbeafe]' : conference === 'east' ? 'bg-[#ffe4e6]' : 'bg-amber-100')
    : (conference === 'west' ? 'bg-[#f0f7ff]' : conference === 'east' ? 'bg-[#fff5f5]' : 'bg-white');

  return (
    <div 
      onClick={() => onSelect && onSelect(match, label)}
      className={`group select-none w-[310px] h-[72px] rounded-xs border transition-all cursor-pointer shadow-xs hover:shadow-md ${
        isChampionship
          ? 'border-amber-600 bg-amber-50/40 ring-1 ring-amber-500/50'
          : 'border-neutral-900 bg-white hover:border-black'
      }`}
    >
      <table className="w-full h-full text-left border-collapse table-fixed">
        <thead>
          <tr className="h-[18px] bg-neutral-100 border-b border-neutral-300 text-[9px] font-sans font-semibold text-neutral-500">
            <th className="w-[28px] p-0 text-center font-mono">#</th>
            <th className="p-0 pl-1.5 truncate">Team</th>
            {Array.from({ length: maxDisplayGames }).map((_, i) => (
              <th key={`hdr-g-${i}`} className="w-[18px] p-0 text-center border-l border-neutral-300 font-mono">
                {i + 1}
              </th>
            ))}
            <th className="w-[26px] p-0 text-center border-l-2 border-neutral-900 font-mono font-bold text-neutral-900">
              W
            </th>
          </tr>
        </thead>
        <tbody>
          {/* Top / Home Team */}
          <tr className={`h-[27px] border-b border-neutral-300 ${homeRowBg} transition-colors`}>
            <td className={`p-0 text-center font-mono font-bold text-[10px] ${seedBgColor}`}>
              {homeSeed || '—'}
            </td>

            <td className="p-0 px-1.5 min-w-0">
              <div className="flex items-center gap-1.5 overflow-hidden">
                {homeBanner && !homeImgFailed ? (
                  <img
                    src={homeBanner}
                    alt={homeName}
                    className="h-3.5 max-w-[38px] w-auto object-contain shrink-0"
                    onError={() => setHomeImgFailed(true)}
                  />
                ) : null}
                <span className={`text-[11px] truncate font-sans leading-none ${isHomeSeriesWinner ? 'font-bold text-neutral-950' : 'font-medium text-neutral-800'}`}>
                  {homeName}
                </span>
              </div>
            </td>

            {Array.from({ length: maxDisplayGames }).map((_, idx) => {
              const gameResult = games.find(g => g.game_number === idx + 1);
              if (!gameResult) {
                return (
                  <td key={`h-cell-${idx}`} className="p-0 text-center border-l border-neutral-300 font-mono text-[10px] text-neutral-400">
                    &nbsp;
                  </td>
                );
              }

              const topScore = gameResult.home_team_id === parentHomeId ? gameResult.home_score : gameResult.away_score;
              const botScore = gameResult.away_team_id === parentAwayId ? gameResult.away_score : gameResult.home_score;
              const hasScore = topScore !== undefined && topScore !== null;
              const wonGame = hasScore && topScore > (botScore ?? -1);
              const ot = getGameOTStatus(gameResult);

              return (
                <td key={`h-cell-${idx}`} className="p-0 text-center border-l border-neutral-300 font-mono text-[11px] leading-tight">
                  <span className={wonGame ? 'font-black text-black' : 'font-normal text-neutral-600'}>
                    {hasScore ? topScore : ''}
                  </span>
                  {ot.isOT && (
                    <div className="text-[6px] font-bold text-red-600 leading-none">
                      {ot.label}
                    </div>
                  )}
                </td>
              );
            })}

            <td className={`p-0 text-center border-l-2 border-neutral-900 font-mono font-black text-xs ${
              isHomeSeriesWinner ? 'bg-neutral-950 text-white' : 'text-neutral-900'
            }`}>
              {series.homeWins}
            </td>
          </tr>

          {/* Bottom / Away Team */}
          <tr className={`h-[27px] ${awayRowBg} transition-colors`}>
            <td className={`p-0 text-center font-mono font-bold text-[10px] ${seedBgColor}`}>
              {awaySeed || '—'}
            </td>

            <td className="p-0 px-1.5 min-w-0">
              <div className="flex items-center gap-1.5 overflow-hidden">
                {awayBanner && !awayImgFailed ? (
                  <img
                    src={awayBanner}
                    alt={awayName}
                    className="h-3.5 max-w-[38px] w-auto object-contain shrink-0"
                    onError={() => setAwayImgFailed(true)}
                  />
                ) : null}
                <span className={`text-[11px] truncate font-sans leading-none ${isAwaySeriesWinner ? 'font-bold text-neutral-950' : 'font-medium text-neutral-800'}`}>
                  {awayName}
                </span>
              </div>
            </td>

            {Array.from({ length: maxDisplayGames }).map((_, idx) => {
              const gameResult = games.find(g => g.game_number === idx + 1);
              if (!gameResult) {
                return (
                  <td key={`a-cell-${idx}`} className="p-0 text-center border-l border-neutral-300 font-mono text-[10px] text-neutral-400">
                    &nbsp;
                  </td>
                );
              }

              const topScore = gameResult.home_team_id === parentHomeId ? gameResult.home_score : gameResult.away_score;
              const botScore = gameResult.away_team_id === parentAwayId ? gameResult.away_score : gameResult.home_score;
              const hasScore = botScore !== undefined && botScore !== null;
              const wonGame = hasScore && botScore > (topScore ?? -1);
              const ot = getGameOTStatus(gameResult);

              return (
                <td key={`a-cell-${idx}`} className="p-0 text-center border-l border-neutral-300 font-mono text-[11px] leading-tight">
                  <span className={wonGame ? 'font-black text-black' : 'font-normal text-neutral-600'}>
                    {hasScore ? botScore : ''}
                  </span>
                  {ot.isOT && (
                    <div className="text-[6px] font-bold text-red-600 leading-none">
                      {ot.label}
                    </div>
                  )}
                </td>
              );
            })}

            <td className={`p-0 text-center border-l-2 border-neutral-900 font-mono font-black text-xs ${
              isAwaySeriesWinner ? 'bg-neutral-950 text-white' : 'text-neutral-900'
            }`}>
              {series.awayWins}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

// ==========================================
// 3. DETAILED BOXSCORE MODAL
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

  const [activeView, setActiveView] = useState<number | 'overview'>(() => {
    return games.length > 0 ? games[0].game_number : 'overview';
  });

  const [activeTab, setActiveTab] = useState<'summary' | 'team_stats' | 'skaters' | 'goalies' | 'scoring' | 'penalties'>('summary');

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

        const [pStatsPlayoff, scoringPlayoff, penaltiesPlayoff] = await Promise.all([
          supabase.from('league_playoff_player_stats_master').select('*').eq('game_id', gId),
          supabase.from('league_playoff_scoring').select('*').eq('game_id', gId).order('period', { ascending: true }),
          supabase.from('league_playoff_penalties').select('*').eq('game_id', gId).order('period', { ascending: true })
        ]);

        let rawPlayers = pStatsPlayoff.data || [];
        let scoringData = scoringPlayoff.data || [];
        let penaltyData = penaltiesPlayoff.data || [];

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white border border-neutral-300 rounded-lg shadow-2xl overflow-hidden font-sans">
        
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider text-white">
                Series Boxscore & Statistics
              </h3>
              <p className="text-xs text-slate-300 font-mono">
                {label} • Best of {series.seriesLength}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className={`flex items-center gap-3 p-2 rounded-md border flex-1 ${
              homeWonSeries ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200'
            }`}>
              {home?.banner_url ? (
                <img src={home.banner_url} alt={home.team_name} className="h-6 w-auto max-w-[80px] object-contain shrink-0" />
              ) : null}
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-900 block truncate">{home?.team_name || 'Home'}</span>
                <span className="text-[10px] text-slate-500 font-mono">Seed #{match.home_team_seed || '—'}</span>
              </div>
              <div className={`text-xl font-black font-mono px-2.5 py-0.5 rounded ${
                homeWonSeries ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-900'
              }`}>
                {series.homeWins}
              </div>
            </div>

            <div className="flex flex-col items-center shrink-0">
              <span className="px-2.5 py-1 rounded bg-slate-900 text-amber-300 font-mono text-xs font-bold">
                {series.statusPill}
              </span>
              <span className="text-[10px] text-slate-500 mt-1 font-mono">
                {series.isComplete ? 'Series Complete' : `${games.length} Played`}
              </span>
            </div>

            <div className={`flex items-center gap-3 p-2 rounded-md border flex-1 justify-end ${
              awayWonSeries ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200'
            }`}>
              <div className={`text-xl font-black font-mono px-2.5 py-0.5 rounded ${
                awayWonSeries ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-900'
              }`}>
                {series.awayWins}
              </div>
              <div className="min-w-0 flex-1 text-right">
                <span className="text-xs font-bold text-slate-900 block truncate">{away?.team_name || 'Away'}</span>
                <span className="text-[10px] text-slate-500 font-mono">Seed #{match.away_team_seed || '—'}</span>
              </div>
              {away?.banner_url ? (
                <img src={away.banner_url} alt={away.team_name} className="h-6 w-auto max-w-[80px] object-contain shrink-0" />
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-2 bg-slate-100 border-b border-slate-200 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveView('overview')}
            className={`px-3 py-1.5 text-xs font-semibold rounded transition cursor-pointer shrink-0 ${
              activeView === 'overview'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            Series Overview
          </button>

          {games.map((g) => {
            const isSelected = activeView === g.game_number;
            const parentHomeId = match.home_team_id;
            const parentAwayId = match.away_team_id;
            const hScore = g.home_team_id === parentHomeId ? g.home_score : g.away_score;
            const aScore = g.away_team_id === parentAwayId ? g.away_score : g.home_score;

            return (
              <button
                key={`tab-g-${g.game_number}`}
                onClick={() => setActiveView(g.game_number)}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                <span>Game {g.game_number}:</span>
                <span className="font-mono font-bold">
                  {home?.abbreviation || 'HOM'} {hScore} - {aScore} {away?.abbreviation || 'AWY'}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-white">
          {activeView === 'overview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="text-sm font-bold text-slate-800">
                  Game-by-Game Series Matrix
                </h4>
                <span className="text-xs text-slate-500">
                  Click any game to open detailed stats
                </span>
              </div>

              {games.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded text-slate-400 text-sm italic">
                  No games have been recorded for this series yet.
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
                        className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50/50 cursor-pointer transition"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-xs font-mono">
                            G{g.game_number}
                          </span>
                          <span className="font-semibold text-slate-900 text-sm">Game {g.game_number}</span>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded font-mono text-xs font-bold ${
                              homeWon ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {home?.abbreviation || 'HOM'} {homeScore}
                            </span>
                            <span className="text-slate-400">-</span>
                            <span className={`px-2 py-0.5 rounded font-mono text-xs font-bold ${
                              !homeWon ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {awayScore} {away?.abbreviation || 'AWY'}
                            </span>
                          </div>

                          <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
                            Boxscore <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeView !== 'overview' && selectedGame && (
            <div className="space-y-4">
              <div className="bg-slate-900 text-white p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="text-[10px] uppercase font-mono text-slate-400">AWAY</div>
                      <div className="text-lg font-bold">{away?.team_name || 'Away'}</div>
                      <div className="text-xs text-amber-300 font-mono">{periodSummary?.away.totalS || 0} SOG</div>
                    </div>
                    <div className="text-3xl font-black font-mono ml-3 text-amber-400">
                      {selectedGame.away_team_id === match.away_team_id ? selectedGame.away_score : selectedGame.home_score}
                    </div>
                  </div>

                  <div className="text-center px-4">
                    <div className="text-xs uppercase font-mono font-bold text-amber-400">
                      Game {selectedGame.game_number} Final {isOT ? '(OT)' : ''}
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-1">
                      FO: {homeStatsObj.total_faceoffs || awayStatsObj.total_faceoffs || 0} • 15:00
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-3xl font-black font-mono mr-3 text-amber-400">
                      {selectedGame.home_team_id === match.home_team_id ? selectedGame.home_score : selectedGame.away_score}
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-mono text-slate-400">HOME</div>
                      <div className="text-lg font-bold">{home?.team_name || 'Home'}</div>
                      <div className="text-xs text-amber-300 font-mono">{periodSummary?.home.totalS || 0} SOG</div>
                    </div>
                  </div>
                </div>
              </div>

              {periodSummary && (
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 overflow-x-auto">
                  <table className="w-full text-xs font-mono text-center">
                    <thead>
                      <tr className="border-b text-slate-500 uppercase font-sans">
                        <th className="text-left py-1">Team</th>
                        <th>1st</th>
                        <th>2nd</th>
                        <th>3rd</th>
                        {isOT && <th>OT</th>}
                        <th className="font-bold">Total</th>
                        <th className="font-bold">Shots</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="text-left font-bold font-sans py-1">{away?.team_name}</td>
                        <td>{periodSummary.away.g1}</td>
                        <td>{periodSummary.away.g2}</td>
                        <td>{periodSummary.away.g3}</td>
                        {isOT && <td>{periodSummary.away.got}</td>}
                        <td className="font-bold bg-amber-50">{periodSummary.away.totalG}</td>
                        <td className="text-slate-600">{periodSummary.away.totalS}</td>
                      </tr>
                      <tr>
                        <td className="text-left font-bold font-sans py-1">{home?.team_name}</td>
                        <td>{periodSummary.home.g1}</td>
                        <td>{periodSummary.home.g2}</td>
                        <td>{periodSummary.home.g3}</td>
                        {isOT && <td>{periodSummary.home.got}</td>}
                        <td className="font-bold bg-amber-50">{periodSummary.home.totalG}</td>
                        <td className="text-slate-600">{periodSummary.home.totalS}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex border-b border-slate-200 gap-1 overflow-x-auto text-xs font-semibold">
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
                    className={`px-3 py-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
                      activeTab === t.id
                        ? 'border-blue-600 text-blue-700 font-bold'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {gameBoxscore.loading ? (
                <div className="p-8 text-center text-xs text-slate-500 animate-pulse">
                  Loading game statistics...
                </div>
              ) : (
                <div className="pt-2">
                  {activeTab === 'summary' && (
                    <div className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-3 bg-slate-50 rounded border border-slate-200">
                          <span className="font-bold text-slate-700 block mb-1">Powerplay Efficiency:</span>
                          <p>
                            <strong>{away?.abbreviation || 'AWY'}:</strong> {awayStatsObj.away_pp_goals || 0}/{awayStatsObj.away_pp_opps || 0} ({formatDayFractionOrTime(awayStatsObj.away_pp_minutes)} TOI)
                          </p>
                          <p className="mt-1">
                            <strong>{home?.abbreviation || 'HOM'}:</strong> {homeStatsObj.home_pp_goals || 0}/{homeStatsObj.home_pp_opps || 0} ({formatDayFractionOrTime(homeStatsObj.home_pp_minutes)} TOI)
                          </p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded border border-slate-200">
                          <span className="font-bold text-slate-700 block mb-1">Zone Time & Physicality:</span>
                          <p>
                            <strong>Attack Zone:</strong> {formatDayFractionOrTime(awayStatsObj.away_atk)} vs {formatDayFractionOrTime(homeStatsObj.home_atk)}
                          </p>
                          <p className="mt-1">
                            <strong>Body Checks:</strong> {awayStatsObj.away_bodychecks || 0} vs {homeStatsObj.home_bodychecks || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'team_stats' && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs font-mono">
                        <thead>
                          <tr className="border-b text-slate-500 uppercase font-sans">
                            <th className="text-left py-1.5">{away?.team_name}</th>
                            <th className="text-center py-1.5 text-slate-900">Metric</th>
                            <th className="text-right py-1.5">{home?.team_name}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {[
                            { label: 'Total Goals', away: selectedGame.away_score, home: selectedGame.home_score },
                            { label: 'Shots on Goal', away: awayStatsObj.away_shots || periodSummary?.away.totalS || 0, home: homeStatsObj.home_shots || periodSummary?.home.totalS || 0 },
                            { label: 'Power Play Goals / Opps', away: `${awayStatsObj.away_pp_goals || 0} / ${awayStatsObj.away_pp_opps || 0}`, home: `${homeStatsObj.home_pp_goals || 0} / ${homeStatsObj.home_pp_opps || 0}` },
                            { label: 'Body Checks', away: awayStatsObj.away_bodychecks || 0, home: homeStatsObj.home_bodychecks || 0 },
                            { label: 'Penalties / PIM', away: `${awayStatsObj.away_pen || 0} (${awayStatsObj.away_pim || 0} min)`, home: `${homeStatsObj.home_pen || 0} (${homeStatsObj.home_pim || 0} min)` },
                            { label: 'Attack Zone Time', away: formatDayFractionOrTime(awayStatsObj.away_atk), home: formatDayFractionOrTime(homeStatsObj.home_atk) }
                          ].map((m, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-1.5 text-left font-bold">{m.away}</td>
                              <td className="py-1.5 text-center font-sans text-slate-600">{m.label}</td>
                              <td className="py-1.5 text-right font-bold">{m.home}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {activeTab === 'skaters' && (
                    <div className="space-y-4">
                      <div>
                        <h5 className="font-bold text-xs uppercase text-slate-700 mb-1">{away?.team_name} Skaters</h5>
                        <table className="w-full text-xs font-mono text-center">
                          <thead>
                            <tr className="border-b text-slate-500 font-sans uppercase">
                              <th className="text-left py-1">Player</th>
                              <th>Pos</th>
                              <th>G</th>
                              <th>A</th>
                              <th>PTS</th>
                              <th>SOG</th>
                              <th>CHK</th>
                              <th>TOI</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {gameBoxscore.skaters.filter(s => Number(s.team_id) === Number(match.away_team_id)).map((s, i) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="text-left font-sans font-medium py-1">{s.name}</td>
                                <td>{s.pos}</td>
                                <td className="font-bold">{s.goals}</td>
                                <td>{s.assists}</td>
                                <td className="font-bold bg-amber-50">{s.points}</td>
                                <td>{s.sog}</td>
                                <td>{s.checks}</td>
                                <td>{s.toi}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div>
                        <h5 className="font-bold text-xs uppercase text-slate-700 mb-1">{home?.team_name} Skaters</h5>
                        <table className="w-full text-xs font-mono text-center">
                          <thead>
                            <tr className="border-b text-slate-500 font-sans uppercase">
                              <th className="text-left py-1">Player</th>
                              <th>Pos</th>
                              <th>G</th>
                              <th>A</th>
                              <th>PTS</th>
                              <th>SOG</th>
                              <th>CHK</th>
                              <th>TOI</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {gameBoxscore.skaters.filter(s => Number(s.team_id) === Number(match.home_team_id)).map((s, i) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="text-left font-sans font-medium py-1">{s.name}</td>
                                <td>{s.pos}</td>
                                <td className="font-bold">{s.goals}</td>
                                <td>{s.assists}</td>
                                <td className="font-bold bg-amber-50">{s.points}</td>
                                <td>{s.sog}</td>
                                <td>{s.checks}</td>
                                <td>{s.toi}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {activeTab === 'goalies' && (
                    <div className="space-y-4">
                      <div>
                        <h5 className="font-bold text-xs uppercase text-slate-700 mb-1">Goalies</h5>
                        <table className="w-full text-xs font-mono text-center">
                          <thead>
                            <tr className="border-b text-slate-500 font-sans uppercase">
                              <th className="text-left py-1">Goalie</th>
                              <th>GA</th>
                              <th>Saves</th>
                              <th>Shots</th>
                              <th>SV%</th>
                              <th>Dec</th>
                              <th>TOI</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {gameBoxscore.goalies.map((g, i) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="text-left font-sans font-medium py-1">{g.name}</td>
                                <td>{g.ga}</td>
                                <td className="font-bold">{g.saves}</td>
                                <td>{g.shots}</td>
                                <td className="font-bold text-emerald-700">{(g.savePct * 100).toFixed(1)}%</td>
                                <td className="font-bold">{g.decision}</td>
                                <td>{g.toi}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {activeTab === 'scoring' && (
                    <div>
                      <table className="w-full text-xs font-mono">
                        <thead>
                          <tr className="border-b text-slate-500 font-sans uppercase">
                            <th className="text-left py-1.5">Goal</th>
                            <th>Per</th>
                            <th>Time</th>
                            <th>Team</th>
                            <th className="text-left">Scorer</th>
                            <th className="text-left">Assists</th>
                            <th>Type</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {gameBoxscore.scoring.map((s, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-1.5 font-bold">#{s.goalNum}</td>
                              <td className="text-center">{s.period === 4 ? 'OT' : `P${s.period}`}</td>
                              <td className="text-center">{s.time}</td>
                              <td className="text-center font-bold">{s.team}</td>
                              <td className="text-left font-bold">{s.scorer}</td>
                              <td className="text-left text-slate-600">
                                {s.assist1 !== '--' ? s.assist1 : 'Unassisted'}
                                {s.assist2 !== '--' ? `, ${s.assist2}` : ''}
                              </td>
                              <td className="text-center font-bold text-amber-700">{s.type}</td>
                            </tr>
                          ))}
                          {gameBoxscore.scoring.length === 0 && (
                            <tr>
                              <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                                No scoring events recorded.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {activeTab === 'penalties' && (
                    <div>
                      <table className="w-full text-xs font-mono">
                        <thead>
                          <tr className="border-b text-slate-500 font-sans uppercase">
                            <th className="text-left py-1.5">#</th>
                            <th>Per</th>
                            <th>Time</th>
                            <th>Team</th>
                            <th className="text-left">Player</th>
                            <th className="text-left">Infraction</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {gameBoxscore.penalties.map((p, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-1.5 font-bold">#{p.penNum}</td>
                              <td className="text-center">{p.period === 4 ? 'OT' : `P${p.period}`}</td>
                              <td className="text-center">{p.time}</td>
                              <td className="text-center font-bold">{p.team}</td>
                              <td className="text-left font-bold">{p.player}</td>
                              <td className="text-left text-slate-700">{p.type}</td>
                            </tr>
                          ))}
                          {gameBoxscore.penalties.length === 0 && (
                            <tr>
                              <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                                No penalties recorded.
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

        <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-between items-center shrink-0">
          <span className="text-xs text-slate-500 font-mono">NHL95 Playoff Series Viewer</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white rounded text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

// ==========================================
// 4. MAIN PLAYOFF BRACKET PAGE COMPONENT
// ==========================================

export default function PlayoffBracket() {
  const [matches, setMatches] = useState<PlayoffMatch[]>([]);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | string>('');
  const [selectedSeries, setSelectedSeries] = useState<{ match: PlayoffMatch; label: string } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

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
        console.error("Error fetching playoff leagues:", error.message);
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

  useEffect(() => {
    if (selectedLeagueId) {
      fetchPlayoffs(selectedLeagueId);
    }
  }, [selectedLeagueId]);

  const fetchPlayoffs = async (leagueId: number | string) => {
    try {
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
        console.error("Playoffs query error:", playoffsRes.error.message);
        return;
      }

      const rawPlayoffs = playoffsRes.data || [];
      const rawGames = gamestatsRes.data || [];
      const allTeams = teamsRes.data || [];

      const teamsMap = new Map<number, any>();
      allTeams.forEach((t: any) => teamsMap.set(Number(t.team_id), t));

      const matchesWithBanners = rawPlayoffs.map((match: any) => {
        const pId = match.playoff_id ?? match.id;

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
      console.error("Error loading playoffs:", err);
    }
  };

  const normalizeLabel = (str?: string | null) =>
    (str || '').replace(/[\s\-_]+/g, '').toLowerCase();

  const getMatch = (searchLabel: string): PlayoffMatch => {
    const targetNorm = normalizeLabel(searchLabel);
    const byLabel = matches.find(m => normalizeLabel(m.match_label) === targetNorm);
    if (byLabel) return byLabel;

    const byRound = matches.find(m => normalizeLabel(m.round_name) === targetNorm);
    if (byRound) return byRound;

    const byPartial = matches.find(m => normalizeLabel(m.match_label).includes(targetNorm) || targetNorm.includes(normalizeLabel(m.match_label)));
    if (byPartial) return byPartial;

    return { match_label: searchLabel, results: [] };
  };

  const matchCount = matches.length;
  const playoffFormat = useMemo<'6-team' | '12-team' | '16-team'>(() => {
    if (matchCount <= 6 && matchCount > 0) return '6-team';
    if (matchCount > 6 && matchCount <= 12) return '12-team';
    return '16-team';
  }, [matchCount]);

  const getChampionDetails = () => {
    const finalsMatch = matches.find(m => normalizeLabel(m.round_name) === 'finals') || getMatch('Finals');
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

  const getCupMetadata = () => {
    const currentLeague = seasons.find(s => String(s.league_id) === String(selectedLeagueId));
    const databaseLeagueName = currentLeague?.league_name || "";
    const firstLetter = databaseLeagueName.trim().toUpperCase()[0];

    let filename = "default_trophy.png";
    let title = "STANLEY CUP";

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

  // Row height in pixels for the unified grid
  const ROW_H = 88;
  const centerY = (row: number) => (row + 0.5) * ROW_H;

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] text-slate-900 font-sans pb-16">
      
      {/* Masthead Header */}
      <header className="bg-white border-b border-slate-200 py-6 mb-6">
        <div className="max-w-[1600px] mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
              <Shield className="w-5 h-5 text-blue-700" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                {cupMeta.title} PLAYOFFS • {playoffFormat.toUpperCase()} BRACKET
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              {cupMeta.title} Playoffs
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Official Tournament Tree & Game-by-Game Series Results
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-center">
            {seasons.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 font-mono">League:</span>
                <div className="relative">
                  <select
                    value={selectedLeagueId}
                    onChange={(e) => setSelectedLeagueId(e.target.value)}
                    className="border border-slate-300 bg-white font-mono font-bold text-xs px-3 py-1.5 rounded pr-8 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  >
                    {seasons.map((s) => (
                      <option key={s.league_id} value={s.league_id}>
                        {s.league_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            )}

            <div className="flex items-center border border-slate-300 rounded bg-white shadow-xs text-xs font-mono">
              <button
                onClick={() => setZoomLevel(prev => Math.max(60, prev - 10))}
                title="Zoom Out"
                className="p-1.5 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="px-2 font-bold text-slate-700 border-x border-slate-200">
                {zoomLevel}%
              </span>
              <button
                onClick={() => setZoomLevel(prev => Math.min(125, prev + 10))}
                title="Zoom In"
                className="p-1.5 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomLevel(100)}
                title="Reset Zoom"
                className="p-1.5 hover:bg-slate-100 text-slate-700 transition cursor-pointer border-l border-slate-200"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Bracket Canvas Container */}
      <div className="w-full overflow-x-auto pb-10 px-4 scrollbar-thin">
        <div 
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          className="w-[1600px] mx-auto transition-transform duration-200"
        >

          {/* ========================================================= */}
          {/* FORMAT A: 16-TEAM BRACKET                                  */}
          {/* ========================================================= */}
          {playoffFormat === '16-team' && (
            <div className="flex bg-white p-6 rounded-lg border border-slate-200 shadow-xs">
              
              {/* ------------------------------------------------------------- */}
              {/* COLUMN 0: VERTICAL CONFERENCE BADGES ON FAR LEFT              */}
              {/* ------------------------------------------------------------- */}
              <div className="w-[36px] flex flex-col shrink-0 mr-3">
                {/* Eastern Conference Vertical Strip (Rows 0 to 6 = 7 rows) */}
                <div style={{ height: ROW_H * 7 }} className="flex items-center justify-center">
                  <div className="w-[32px] h-[580px] bg-[#831843] text-white rounded-lg flex items-center justify-center font-bold tracking-widest uppercase text-xs shadow-xs border border-rose-950 [writing-mode:vertical-rl] rotate-180 select-none">
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-rose-300 shrink-0" />
                      <span>EASTERN CONFERENCE</span>
                    </div>
                  </div>
                </div>

                {/* Row 7: Empty Center Gap */}
                <div style={{ height: ROW_H }} />

                {/* Western Conference Vertical Strip (Rows 8 to 14 = 7 rows) */}
                <div style={{ height: ROW_H * 7 }} className="flex items-center justify-center">
                  <div className="w-[32px] h-[580px] bg-[#1e3a8a] text-white rounded-lg flex items-center justify-center font-bold tracking-widest uppercase text-xs shadow-xs border border-blue-950 [writing-mode:vertical-rl] rotate-180 select-none">
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                      <span>WESTERN CONFERENCE</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* COLUMN 1: QUARTERFINALS (Rows 0, 2, 4, 6, 8, 10, 12, 14)       */}
              {/* ------------------------------------------------------------- */}
              <div className="w-[310px] flex flex-col shrink-0">
                {/* Row 0: QF 1 */}
                <div style={{ height: ROW_H }} className="flex items-center justify-center">
                  <ModernMatchupCard match={getMatch('Quarter Finals 1')} label="Quarter Finals 1" conference="east" onSelect={handleCardSelect} />
                </div>
                {/* Row 1: Space for SF 1 */}
                <div style={{ height: ROW_H }} />
                {/* Row 2: QF 2 */}
                <div style={{ height: ROW_H }} className="flex items-center justify-center">
                  <ModernMatchupCard match={getMatch('Quarter Finals 2')} label="Quarter Finals 2" conference="east" onSelect={handleCardSelect} />
                </div>
                {/* Row 3: Space for East CF */}
                <div style={{ height: ROW_H }} />
                {/* Row 4: QF 3 */}
                <div style={{ height: ROW_H }} className="flex items-center justify-center">
                  <ModernMatchupCard match={getMatch('Quarter Finals 3')} label="Quarter Finals 3" conference="east" onSelect={handleCardSelect} />
                </div>
                {/* Row 5: Space for SF 2 */}
                <div style={{ height: ROW_H }} />
                {/* Row 6: QF 4 */}
                <div style={{ height: ROW_H }} className="flex items-center justify-center">
                  <ModernMatchupCard match={getMatch('Quarter Finals 4')} label="Quarter Finals 4" conference="east" onSelect={handleCardSelect} />
                </div>
                {/* Row 7: Center Spacer */}
                <div style={{ height: ROW_H }} />
                {/* Row 8: QF 5 */}
                <div style={{ height: ROW_H }} className="flex items-center justify-center">
                  <ModernMatchupCard match={getMatch('Quarter Finals 5')} label="Quarter Finals 5" conference="west" onSelect={handleCardSelect} />
                </div>
                {/* Row 9: Space for SF 3 */}
                <div style={{ height: ROW_H }} />
                {/* Row 10: QF 6 */}
                <div style={{ height: ROW_H }} className="flex items-center justify-center">
                  <ModernMatchupCard match={getMatch('Quarter Finals 6')} label="Quarter Finals 6" conference="west" onSelect={handleCardSelect} />
                </div>
                {/* Row 11: Space for West CF */}
                <div style={{ height: ROW_H }} />
                {/* Row 12: QF 7 */}
                <div style={{ height: ROW_H }} className="flex items-center justify-center">
                  <ModernMatchupCard match={getMatch('Quarter Finals 7')} label="Quarter Finals 7" conference="west" onSelect={handleCardSelect} />
                </div>
                {/* Row 13: Space for SF 4 */}
                <div style={{ height: ROW_H }} />
                {/* Row 14: QF 8 */}
                <div style={{ height: ROW_H }} className="flex items-center justify-center">
                  <ModernMatchupCard match={getMatch('Quarter Finals 8')} label="Quarter Finals 8" conference="west" onSelect={handleCardSelect} />
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* CONNECTOR 1: QF -> SF (Forks at Rows 0-2, 4-6, 8-10, 12-14)    */}
              {/* ------------------------------------------------------------- */}
              <div style={{ height: ROW_H * 15 }} className="w-[40px] shrink-0">
                <svg width="40" height={ROW_H * 15} viewBox={`0 0 40 ${ROW_H * 15}`} fill="none" stroke="#0f172a" strokeWidth="2">
                  {/* Fork 1: QF 1 (Row 0) & QF 2 (Row 2) -> SF 1 (Row 1) */}
                  <path d={`M 0 ${centerY(0)} H 20 V ${centerY(2)} H 0`} />
                  <path d={`M 20 ${centerY(1)} H 40`} />

                  {/* Fork 2: QF 3 (Row 4) & QF 4 (Row 6) -> SF 2 (Row 5) */}
                  <path d={`M 0 ${centerY(4)} H 20 V ${centerY(6)} H 0`} />
                  <path d={`M 20 ${centerY(5)} H 40`} />

                  {/* Fork 3: QF 5 (Row 8) & QF 6 (Row 10) -> SF 3 (Row 9) */}
                  <path d={`M 0 ${centerY(8)} H 20 V ${centerY(10)} H 0`} />
                  <path d={`M 20 ${centerY(9)} H 40`} />

                  {/* Fork 4: QF 7 (Row 12) & QF 8 (Row 14) -> SF 4 (Row 13) */}
                  <path d={`M 0 ${centerY(12)} H 20 V ${centerY(14)} H 0`} />
                  <path d={`M 20 ${centerY(13)} H 40`} />
                </svg>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* COLUMN 2: SEMIFINALS (Rows 1, 5, 9, 13)                        */}
              {/* ------------------------------------------------------------- */}
              <div className="w-[310px] flex flex-col shrink-0">
                <div style={{ height: ROW_H }} />
                {/* Row 1: Semifinal 1 */}
                <div style={{ height: ROW_H }} className="flex items-center justify-center">
                  <ModernMatchupCard match={getMatch('Semi Finals 1')} label="Semi Finals 1" conference="east" onSelect={handleCardSelect} />
                </div>
                <div style={{ height: ROW_H * 3 }} />
                {/* Row 5: Semifinal 2 */}
                <div style={{ height: ROW_H }} className="flex items-center justify-center">
                  <ModernMatchupCard match={getMatch('Semi Finals 2')} label="Semi Finals 2" conference="east" onSelect={handleCardSelect} />
                </div>
                <div style={{ height: ROW_H * 3 }} />
                {/* Row 9: Semifinal 3 */}
                <div style={{ height: ROW_H }} className="flex items-center justify-center">
                  <ModernMatchupCard match={getMatch('Semi Finals 3')} label="Semi Finals 3" conference="west" onSelect={handleCardSelect} />
                </div>
                <div style={{ height: ROW_H * 3 }} />
                {/* Row 13: Semifinal 4 */}
                <div style={{ height: ROW_H }} className="flex items-center justify-center">
                  <ModernMatchupCard match={getMatch('Semi Finals 4')} label="Semi Finals 4" conference="west" onSelect={handleCardSelect} />
                </div>
                <div style={{ height: ROW_H }} />
              </div>

              {/* ------------------------------------------------------------- */}
              {/* CONNECTOR 2: SF -> CF (Forks at Rows 1-5 and 9-13)            */}
              {/* ------------------------------------------------------------- */}
              <div style={{ height: ROW_H * 15 }} className="w-[40px] shrink-0">
                <svg width="40" height={ROW_H * 15} viewBox={`0 0 40 ${ROW_H * 15}`} fill="none" stroke="#0f172a" strokeWidth="2">
                  {/* Fork from SF 1 (Row 1) & SF 2 (Row 5) -> East CF (Row 3) */}
                  <path d={`M 0 ${centerY(1)} H 20 V ${centerY(5)} H 0`} />
                  <path d={`M 20 ${centerY(3)} H 40`} />

                  {/* Fork from SF 3 (Row 9) & SF 4 (Row 13) -> West CF (Row 11) */}
                  <path d={`M 0 ${centerY(9)} H 20 V ${centerY(13)} H 0`} />
                  <path d={`M 20 ${centerY(11)} H 40`} />
                </svg>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* COLUMN 3: CONFERENCE FINALS (Rows 3, 11)                      */}
              {/* ------------------------------------------------------------- */}
              <div className="w-[310px] flex flex-col shrink-0">
                <div style={{ height: ROW_H * 3 }} />
                {/* Row 3: Conference Final 1 (East) */}
                <div style={{ height: ROW_H }} className="flex items-center justify-center">
                  <ModernMatchupCard match={getMatch('Conference Finals 1')} label="Conference Finals 1" conference="east" onSelect={handleCardSelect} />
                </div>
                <div style={{ height: ROW_H * 7 }} />
                {/* Row 11: Conference Final 2 (West) */}
                <div style={{ height: ROW_H }} className="flex items-center justify-center">
                  <ModernMatchupCard match={getMatch('Conference Finals 2')} label="Conference Finals 2" conference="west" onSelect={handleCardSelect} />
                </div>
                <div style={{ height: ROW_H * 3 }} />
              </div>

              {/* ------------------------------------------------------------- */}
              {/* CONNECTOR 3: CF -> FINALS (Fork from Row 3 to Row 11 into Row 7) */}
              {/* ------------------------------------------------------------- */}
              <div style={{ height: ROW_H * 15 }} className="w-[50px] shrink-0">
                <svg width="50" height={ROW_H * 15} viewBox={`0 0 50 ${ROW_H * 15}`} fill="none" stroke="#0f172a" strokeWidth="2">
                  <path d={`M 0 ${centerY(3)} H 25 V ${centerY(11)} H 0`} />
                  <path d={`M 25 ${centerY(7)} H 50`} />
                </svg>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* COLUMN 4: CHAMPIONSHIP FINALS (Row 7)                         */}
              {/* ------------------------------------------------------------- */}
              <div className="w-[310px] flex flex-col shrink-0">
                <div style={{ height: ROW_H * 7 }} />
                {/* Row 7: Championship Finals */}
                <div style={{ height: ROW_H }} className="flex items-center justify-center">
                  <ModernMatchupCard
                    match={getMatch('Finals')}
                    label="CHAMPIONSHIP FINALS"
                    conference="finals"
                    isChampionship={true}
                    onSelect={handleCardSelect}
                  />
                </div>
                <div style={{ height: ROW_H * 7 }} />
              </div>

              {/* ------------------------------------------------------------- */}
              {/* CONNECTOR 4: FINALS -> TROPHY & WINNER SHOWCASE                */}
              {/* ------------------------------------------------------------- */}
              <div style={{ height: ROW_H * 15 }} className="w-[40px] shrink-0">
                <svg width="40" height={ROW_H * 15} viewBox={`0 0 40 ${ROW_H * 15}`} fill="none" stroke="#0f172a" strokeWidth="2">
                  <path d={`M 0 ${centerY(7)} H 40`} />
                </svg>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* COLUMN 5: TROPHY & WINNER SHOWCASE (OFF TO THE RIGHT!)        */}
              {/* ------------------------------------------------------------- */}
              <div className="w-[230px] flex flex-col shrink-0 pl-2">
                <div style={{ height: ROW_H * 6 }} />
                {/* Aligned with Finals (Row 7) */}
                <div style={{ height: ROW_H * 3 }} className="flex items-center justify-center">
                  <div className="flex flex-col items-center justify-center text-center p-4 bg-amber-50/80 border-2 border-amber-400 rounded-xl shadow-md w-full">
                    {cupMeta.trophyUrl && (
                      <img
                        src={cupMeta.trophyUrl}
                        alt={cupMeta.title}
                        className="h-20 w-auto object-contain filter drop-shadow-md mb-2"
                      />
                    )}
                    <div className="bg-slate-900 text-amber-300 px-3 py-1 rounded text-xs font-black uppercase tracking-widest shadow-xs whitespace-nowrap mb-2">
                      ★ {cupMeta.title} ★
                    </div>
                    {championData ? (
                      <div className="text-center w-full border-t border-amber-200 pt-2 mt-1">
                        <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest block mb-1">
                          CHAMPION
                        </span>
                        {championData.team?.banner_url ? (
                          <img
                            src={championData.team.banner_url}
                            alt={championData.team.team_name}
                            className="h-6 w-auto max-w-[140px] object-contain mx-auto my-1 filter contrast-110"
                          />
                        ) : (
                          <div className="text-sm font-black text-slate-900 truncate">
                            {championData.team?.team_name}
                          </div>
                        )}
                        <div className="text-xs text-emerald-700 font-mono font-black mt-1">
                          Won Series {championData.score}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs font-semibold text-slate-500 mt-1 font-mono">
                        Awaiting Champion
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ height: ROW_H * 6 }} />
              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* FORMAT B: 6-TEAM BRACKET (Q01 STYLE)                      */}
          {/* ========================================================= */}
          {playoffFormat === '6-team' && (
            <div className="flex bg-white p-6 rounded-lg border border-slate-200 shadow-xs">
              
              {/* Column 0: Vertical Conference Labels */}
              <div className="w-[36px] flex flex-col shrink-0 mr-3">
                <div style={{ height: ROW_H * 3 }} className="flex items-center justify-center">
                  <div className="w-[32px] h-[240px] bg-[#831843] text-white rounded-lg flex items-center justify-center font-bold tracking-widest uppercase text-xs shadow-xs border border-rose-950 [writing-mode:vertical-rl] rotate-180 select-none">
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-rose-300 shrink-0" />
                      <span>EASTERN</span>
                    </div>
                  </div>
                </div>
                <div style={{ height: ROW_H }} />
                <div style={{ height: ROW_H * 3 }} className="flex items-center justify-center">
                  <div className="w-[32px] h-[240px] bg-[#1e3a8a] text-white rounded-lg flex items-center justify-center font-bold tracking-widest uppercase text-xs shadow-xs border border-blue-950 [writing-mode:vertical-rl] rotate-180 select-none">
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                      <span>WESTERN</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Col 1: Semifinals */}
              <div className="w-[310px] flex flex-col shrink-0">
                <div style={{ height: ROW_H }} className="flex items-center justify-center">
                  <ModernMatchupCard match={getMatch('Semi Finals 1')} label="Semi Finals 1" conference="east" onSelect={handleCardSelect} />
                </div>
                <div style={{ height: ROW_H * 3 }} />
                <div style={{ height: ROW_H }} className="flex items-center justify-center">
                  <ModernMatchupCard match={getMatch('Semi Finals 3')} label="Semi Finals 3" conference="west" onSelect={handleCardSelect} />
                </div>
              </div>

              {/* Connector 1: Straight leads into CF */}
              <div style={{ height: ROW_H * 5 }} className="w-[40px] shrink-0">
                <svg width="40" height={ROW_H * 5} viewBox={`0 0 40 ${ROW_H * 5}`} fill="none" stroke="#0f172a" strokeWidth="2">
                  <path d={`M 0 ${centerY(0)} H 40`} />
                  <path d={`M 0 ${centerY(4)} H 40`} />
                </svg>
              </div>

              {/* Col 2: Conference Finals */}
              <div className="w-[310px] flex flex-col shrink-0">
                <div style={{ height: ROW_H }} className="flex items-center justify-center">
                  <ModernMatchupCard match={getMatch('Conference Finals 1')} label="Conference Finals 1" conference="east" onSelect={handleCardSelect} />
                </div>
                <div style={{ height: ROW_H * 3 }} />
                <div style={{ height: ROW_H }} className="flex items-center justify-center">
                  <ModernMatchupCard match={getMatch('Conference Finals 2')} label="Conference Finals 2" conference="west" onSelect={handleCardSelect} />
                </div>
              </div>

              {/* Connector 2: Fork into Finals */}
              <div style={{ height: ROW_H * 5 }} className="w-[50px] shrink-0">
                <svg width="50" height={ROW_H * 5} viewBox={`0 0 50 ${ROW_H * 5}`} fill="none" stroke="#0f172a" strokeWidth="2">
                  <path d={`M 0 ${centerY(0)} H 25 V ${centerY(4)} H 0`} />
                  <path d={`M 25 ${centerY(2)} H 50`} />
                </svg>
              </div>

              {/* Col 3: Finals */}
              <div className="w-[310px] flex flex-col shrink-0">
                <div style={{ height: ROW_H * 2 }} />
                <div style={{ height: ROW_H }} className="flex items-center justify-center">
                  <ModernMatchupCard
                    match={getMatch('Finals')}
                    label="CHAMPIONSHIP FINALS"
                    conference="finals"
                    isChampionship={true}
                    onSelect={handleCardSelect}
                  />
                </div>
                <div style={{ height: ROW_H * 2 }} />
              </div>

              {/* Connector 3: Lead into Trophy Showcase */}
              <div style={{ height: ROW_H * 5 }} className="w-[40px] shrink-0">
                <svg width="40" height={ROW_H * 5} viewBox={`0 0 40 ${ROW_H * 5}`} fill="none" stroke="#0f172a" strokeWidth="2">
                  <path d={`M 0 ${centerY(2)} H 40`} />
                </svg>
              </div>

              {/* Col 4: Trophy Showcase */}
              <div className="w-[230px] flex flex-col shrink-0 pl-2">
                <div style={{ height: ROW_H }} />
                <div style={{ height: ROW_H * 3 }} className="flex items-center justify-center">
                  <div className="flex flex-col items-center justify-center text-center p-4 bg-amber-50/80 border-2 border-amber-400 rounded-xl shadow-md w-full">
                    {cupMeta.trophyUrl && (
                      <img src={cupMeta.trophyUrl} alt={cupMeta.title} className="h-16 w-auto object-contain filter drop-shadow-md mb-2" />
                    )}
                    <div className="bg-slate-900 text-amber-300 px-3 py-1 rounded text-xs font-black uppercase tracking-widest shadow-xs mb-1">
                      ★ {cupMeta.title} ★
                    </div>
                    {championData && (
                      <div className="text-center w-full border-t border-amber-200 pt-1 mt-1">
                        <span className="text-[9px] font-black text-amber-800 uppercase tracking-widest block">CHAMPION</span>
                        <div className="text-xs font-black text-slate-900 truncate">{championData.team?.team_name}</div>
                        <div className="text-[10px] text-emerald-700 font-mono font-bold">Won {championData.score}</div>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ height: ROW_H }} />
              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* FORMAT C: 12-TEAM BRACKET                                  */}
          {/* ========================================================= */}
          {playoffFormat === '12-team' && (
            <div className="flex bg-white p-6 rounded-lg border border-slate-200 shadow-xs">
              
              {/* Vertical Conference Labels on Far Left */}
              <div className="w-[36px] flex flex-col shrink-0 mr-3">
                <div style={{ height: ROW_H * 7 }} className="flex items-center justify-center">
                  <div className="w-[32px] h-[580px] bg-[#831843] text-white rounded-lg flex items-center justify-center font-bold tracking-widest uppercase text-xs shadow-xs border border-rose-950 [writing-mode:vertical-rl] rotate-180 select-none">
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-rose-300 shrink-0" />
                      <span>EASTERN CONFERENCE</span>
                    </div>
                  </div>
                </div>
                <div style={{ height: ROW_H }} />
                <div style={{ height: ROW_H * 7 }} className="flex items-center justify-center">
                  <div className="w-[32px] h-[580px] bg-[#1e3a8a] text-white rounded-lg flex items-center justify-center font-bold tracking-widest uppercase text-xs shadow-xs border border-blue-950 [writing-mode:vertical-rl] rotate-180 select-none">
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                      <span>WESTERN CONFERENCE</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Col 1: Opening Round */}
              <div className="w-[310px] flex flex-col shrink-0">
                <div style={{ height: ROW_H }} className="flex items-center justify-center"><ModernMatchupCard match={matches[0] || getMatch('Quarter Finals 1')} label="Wild Card 1" conference="east" onSelect={handleCardSelect} /></div>
                <div style={{ height: ROW_H }} />
                <div style={{ height: ROW_H }} className="flex items-center justify-center"><ModernMatchupCard match={matches[1] || getMatch('Quarter Finals 2')} label="Wild Card 2" conference="east" onSelect={handleCardSelect} /></div>
                <div style={{ height: ROW_H * 5 }} />
                <div style={{ height: ROW_H }} className="flex items-center justify-center"><ModernMatchupCard match={matches[2] || getMatch('Quarter Finals 3')} label="Wild Card 3" conference="west" onSelect={handleCardSelect} /></div>
                <div style={{ height: ROW_H }} />
                <div style={{ height: ROW_H }} className="flex items-center justify-center"><ModernMatchupCard match={matches[3] || getMatch('Quarter Finals 4')} label="Wild Card 4" conference="west" onSelect={handleCardSelect} /></div>
                <div style={{ height: ROW_H * 4 }} />
              </div>

              {/* Connector 1: Opening -> Semis */}
              <div style={{ height: ROW_H * 15 }} className="w-[40px] shrink-0">
                <svg width="40" height={ROW_H * 15} viewBox={`0 0 40 ${ROW_H * 15}`} fill="none" stroke="#0f172a" strokeWidth="2">
                  <path d={`M 0 ${centerY(0)} H 40`} />
                  <path d={`M 0 ${centerY(2)} H 40`} />
                  <path d={`M 0 ${centerY(8)} H 40`} />
                  <path d={`M 0 ${centerY(10)} H 40`} />
                </svg>
              </div>

              {/* Col 2: Semifinals */}
              <div className="w-[310px] flex flex-col shrink-0">
                <div style={{ height: ROW_H }} className="flex items-center justify-center"><ModernMatchupCard match={matches[4] || getMatch('Semi Finals 1')} label="East Semi 1" conference="east" onSelect={handleCardSelect} /></div>
                <div style={{ height: ROW_H }} />
                <div style={{ height: ROW_H }} className="flex items-center justify-center"><ModernMatchupCard match={matches[5] || getMatch('Semi Finals 2')} label="East Semi 2" conference="east" onSelect={handleCardSelect} /></div>
                <div style={{ height: ROW_H * 5 }} />
                <div style={{ height: ROW_H }} className="flex items-center justify-center"><ModernMatchupCard match={matches[6] || getMatch('Semi Finals 3')} label="West Semi 1" conference="west" onSelect={handleCardSelect} /></div>
                <div style={{ height: ROW_H }} />
                <div style={{ height: ROW_H }} className="flex items-center justify-center"><ModernMatchupCard match={matches[7] || getMatch('Semi Finals 4')} label="West Semi 2" conference="west" onSelect={handleCardSelect} /></div>
                <div style={{ height: ROW_H * 4 }} />
              </div>

              {/* Connector 2: Semis -> CF */}
              <div style={{ height: ROW_H * 15 }} className="w-[40px] shrink-0">
                <svg width="40" height={ROW_H * 15} viewBox={`0 0 40 ${ROW_H * 15}`} fill="none" stroke="#0f172a" strokeWidth="2">
                  <path d={`M 0 ${centerY(0)} H 20 V ${centerY(2)} H 0`} />
                  <path d={`M 20 ${centerY(1)} H 40`} />
                  <path d={`M 0 ${centerY(8)} H 20 V ${centerY(10)} H 0`} />
                  <path d={`M 20 ${centerY(9)} H 40`} />
                </svg>
              </div>

              {/* Col 3: Conference Finals */}
              <div className="w-[310px] flex flex-col shrink-0">
                <div style={{ height: ROW_H }} />
                <div style={{ height: ROW_H }} className="flex items-center justify-center"><ModernMatchupCard match={matches[8] || getMatch('Conference Finals 1')} label="East Final" conference="east" onSelect={handleCardSelect} /></div>
                <div style={{ height: ROW_H * 7 }} />
                <div style={{ height: ROW_H }} className="flex items-center justify-center"><ModernMatchupCard match={matches[9] || getMatch('Conference Finals 2')} label="West Final" conference="west" onSelect={handleCardSelect} /></div>
                <div style={{ height: ROW_H * 5 }} />
              </div>

              {/* Connector 3: CF -> Finals */}
              <div style={{ height: ROW_H * 15 }} className="w-[50px] shrink-0">
                <svg width="50" height={ROW_H * 15} viewBox={`0 0 50 ${ROW_H * 15}`} fill="none" stroke="#0f172a" strokeWidth="2">
                  <path d={`M 0 ${centerY(1)} H 25 V ${centerY(9)} H 0`} />
                  <path d={`M 25 ${centerY(5)} H 50`} />
                </svg>
              </div>

              {/* Col 4: Finals */}
              <div className="w-[310px] flex flex-col shrink-0">
                <div style={{ height: ROW_H * 5 }} />
                <div style={{ height: ROW_H }} className="flex items-center justify-center">
                  <ModernMatchupCard match={matches[10] || getMatch('Finals')} label="CHAMPIONSHIP FINALS" conference="finals" isChampionship={true} onSelect={handleCardSelect} />
                </div>
                <div style={{ height: ROW_H * 9 }} />
              </div>

              {/* Connector 4: Finals -> Showcase */}
              <div style={{ height: ROW_H * 15 }} className="w-[40px] shrink-0">
                <svg width="40" height={ROW_H * 15} viewBox={`0 0 40 ${ROW_H * 15}`} fill="none" stroke="#0f172a" strokeWidth="2">
                  <path d={`M 0 ${centerY(5)} H 40`} />
                </svg>
              </div>

              {/* Col 5: Showcase */}
              <div className="w-[230px] flex flex-col shrink-0 pl-2">
                <div style={{ height: ROW_H * 4 }} />
                <div style={{ height: ROW_H * 3 }} className="flex items-center justify-center">
                  <div className="flex flex-col items-center justify-center text-center p-4 bg-amber-50/80 border-2 border-amber-400 rounded-xl shadow-md w-full">
                    {cupMeta.trophyUrl && <img src={cupMeta.trophyUrl} alt={cupMeta.title} className="h-16 w-auto object-contain mb-2" />}
                    <div className="bg-slate-900 text-amber-300 px-3 py-1 rounded text-xs font-black uppercase tracking-widest shadow-xs mb-1">
                      ★ {cupMeta.title} ★
                    </div>
                    {championData && (
                      <div className="text-center w-full border-t border-amber-200 pt-1 mt-1">
                        <span className="text-[9px] font-black text-amber-800 uppercase tracking-widest block">CHAMPION</span>
                        <div className="text-xs font-black text-slate-900 truncate">{championData.team?.team_name}</div>
                        <div className="text-[10px] text-emerald-700 font-mono font-bold">Won {championData.score}</div>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ height: ROW_H * 8 }} />
              </div>

            </div>
          )}

          {/* Footer Legend Bar */}
          <div className="mt-6 px-4 py-3 bg-white border border-slate-200 rounded-lg shadow-xs flex flex-wrap items-center justify-between text-xs text-slate-600 gap-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              <span>Click on any matchup card to view the complete game-by-game boxscores, skater and goalie stats.</span>
            </div>
            <div className="flex items-center gap-4 font-mono text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-[#831843] text-white flex items-center justify-center font-bold text-[9px]">E</span>
                <span>Eastern Conference</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-[9px]">W</span>
                <span>Western Conference</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-neutral-900 text-white flex items-center justify-center font-bold text-[9px]">4</span>
                <span>Series Winner</span>
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Boxscore Modal */}
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