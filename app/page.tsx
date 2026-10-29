"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

interface SeasonOption {
  id: number;
  label: string;
  league: 'W' | 'O' | 'V' | 'G' | 'Q';
}

// All defined seasons with their ID, code label, and league type
const ALL_SEASONS: SeasonOption[] = [
  { id: 40, label: 'W18', league: 'W' },
  { id: 39, label: 'O01', league: 'O' },
  { id: 38, label: 'W17', league: 'W' },
  { id: 37, label: 'W16', league: 'W' },
  { id: 36, label: 'Q19', league: 'Q' },
  { id: 35, label: 'W15', league: 'W' },
  { id: 34, label: 'Q18', league: 'Q' },
  { id: 33, label: 'W14', league: 'W' },
  { id: 32, label: 'Q17', league: 'Q' },
  { id: 31, label: 'W13', league: 'W' },
  { id: 30, label: 'Q16', league: 'Q' },
  { id: 29, label: 'Q15', league: 'Q' },
  { id: 28, label: 'W12', league: 'W' },
  { id: 27, label: 'Q14', league: 'Q' },
  { id: 26, label: 'Q13', league: 'Q' },
  { id: 25, label: 'Q12', league: 'Q' },
  { id: 24, label: 'W11', league: 'W' },
  { id: 23, label: 'Q11', league: 'Q' },
  { id: 22, label: 'W10', league: 'W' },
  { id: 21, label: 'Q10', league: 'Q' },
  { id: 20, label: 'V01', league: 'V' },
  { id: 19, label: 'Q09', league: 'Q' },
  { id: 18, label: 'W09', league: 'W' },
  { id: 17, label: 'Q08', league: 'Q' },
  { id: 16, label: 'G01', league: 'G' },
  { id: 15, label: 'Q07', league: 'Q' },
  { id: 14, label: 'W08', league: 'W' },
  { id: 13, label: 'Q06', league: 'Q' },
  { id: 12, label: 'Q05', league: 'Q' },
  { id: 11, label: 'W07', league: 'W' },
  { id: 10, label: 'Q04', league: 'Q' },
  { id: 9, label: 'W06', league: 'W' },
  { id: 8, label: 'Q03', league: 'Q' },
  { id: 7, label: 'Q02', league: 'Q' },
  { id: 6, label: 'W05', league: 'W' },
  { id: 5, label: 'Q01', league: 'Q' },
  { id: 4, label: 'W04', league: 'W' },
  { id: 3, label: 'W03', league: 'W' },
  { id: 2, label: 'W02', league: 'W' },
  { id: 1, label: 'W01', league: 'W' }
];

// Mapping season IDs to their prefix type for trophy logic
const SEASON_TYPES: Record<number, string> = {
  1: 'W', 2: 'W', 3: 'W', 4: 'W', 5: 'Q', 6: 'W', 7: 'Q', 8: 'Q', 9: 'W', 10: 'Q',
  11: 'W', 12: 'Q', 13: 'Q', 14: 'W', 15: 'Q', 16: 'G', 17: 'Q', 18: 'W', 19: 'Q', 20: 'V',
  21: 'Q', 22: 'W', 23: 'Q', 24: 'W', 25: 'Q', 26: 'Q', 27: 'Q', 28: 'W', 29: 'Q', 30: 'Q',
  31: 'W', 32: 'Q', 33: 'W', 34: 'Q', 35: 'W', 36: 'Q', 37: 'W', 38: 'W', 39: 'O', 40: 'W'
};

const getTrophyUrl = (seasonId: number) => {
  const type = SEASON_TYPES[seasonId];
  if (type === 'W') return 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/brule_cup.png';
  if (type === 'Q') return 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/q_cup.png';
  if (type === 'V') return 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/grail_cup.png';
  if (type === 'O') return 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Original%206.png';
  if (type === 'G') return 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Golden%20Era.png';
  return null;
};

const DEFAULT_BRIEFING = {
  updated_at: "Today • Late Edition",
  headline: "GAELICGOPHER CLAIMS TO HATE CHINESE BUFFET VLOGGER (CONFESSES TO BINGING EVERY EPISODE)",
  subheadline: "Unholy Blindly Confirms Sabres Identity; Segathon Floods the Tape Room With High-Stakes Twitch Reels",
  quote_of_the_day: {
    quote: "I can't view it, but yes that's me.",
    author: "Unholy",
    context: "Confirming archival Sabres footage through pure aura"
  },
  bulletin: {
    title: "COMMISSIONER'S DESK: SEASON 40 PUCK DROP",
    text: "All team managers are instructed to confirm their active rosters and check emulator netplay configs. Rulebook updates regarding manual goalies and crease violations are now in full effect.",
    author: "League HQ",
    date: "Today"
  },
  nhl_wire: [
    {
      title: "NHL - The Home of the Puck",
      link: "https://www.nhl.com",
      date: "Today"
    },
    {
      title: "The Competing Website",
      link: "https://wn95-online.vercel.app/",
      date: "Today"
    },
    {
      title: "The Other Sega Hockey Game",
      link: "https://nhl94.com/",
      date: "Today"
    }
  ],
  events: [
    {
      date: "LIVE NOW",
      time: "",
      title: "W18 Exhibition Series: Segathon vs Unholy",
      description: "Genesis Netplay showdown streaming live in #highlights.",
      url: "https://www.twitch.tv/segathonsow",
      is_live: true,
      interested: 8
    },
    {
      date: "June 28",
      time: "8:00 PM",
      title: "Trade Deadline",
      description: "Rosters lock for playoffs. Final buzzer on all blockbuster trades.",
      is_live: false,
      interested: 14
    },
    {
      date: "July 01",
      time: "7:00 PM",
      title: "Draft Lottery",
      description: "Ping pong balls decide franchise future.",
      is_live: false,
      interested: 18
    },
    {
      date: "July 05",
      time: "12:00 PM",
      title: "Free Agency Opens",
      description: "High-stakes contract negotiations begin on the wire.",
      is_live: false,
      interested: 12
    }
  ],
  sections: [
    {
      channel: "cooking-with-puss",
      badge: "CULINARY CONTROVERSY",
      title: "Late Night Buffet Rants",
      commentary: "At 2:43 AM, GaelicGopher called out an anonymous Chinese buffet influencer as 'horrible' before immediately admitting to hate-watching the entire filmography.",
      messages: [
        {
          time: "02:43",
          author: "GaelicGopher",
          text: "@segathon FYI, that Chinese buffet loser....he's horrible (and I've somehow watched every single episode)"
        }
      ]
    },
    {
      channel: "knightsvision",
      badge: "HOT SCOOP",
      title: "Sabres Classics Identification Incident",
      commentary: "Segathon uncovered mystery vintage tape. Unholy confirmed it was 100% him on the ice without even loading the link.",
      messages: [
        {
          time: "16:04",
          author: "segathon",
          text: "is this you @Unholy (https://x.com/SabresClassics/...)"
        },
        {
          time: "16:32",
          author: "Unholy",
          text: "I can't view it, but yes that's me."
        }
      ]
    },
    {
      channel: "highlights",
      badge: "TAPE ROOM",
      title: "Segathon Drops Triple Twitch Bombshell",
      commentary: "Three high-octane clips dropped in rapid succession featuring textbook manual goalie saves and cross-crease snipes.",
      clips: [
        {
          name: "HilariousHumbleCake",
          url: "https://www.twitch.tv/segathonsow/clip/HilariousHumbleCakeOptimizePrime-jXgK-FCJEkSEPWRN"
        },
        {
          name: "ProtectiveTangibleLlama",
          url: "https://www.twitch.tv/segathonsow/clip/ProtectiveTangibleLlamaDoubleRainbow-SheU_4EQkkT-SvHC"
        },
        {
          name: "CrepuscularAltruisticSandwich",
          url: "https://www.twitch.tv/segathonsow/clip/CrepuscularAltruisticSandwichAMPEnergyCherry-qp00z_PkiDpFAEEZ"
        }
      ],
      messages: [
        {
          time: "13:15 - 13:23",
          author: "segathon",
          text: "Posted 3 Twitch highlight reels"
        }
      ]
    },
    {
      channel: "crib-notes-with-pinot-and-gummies",
      badge: "LATE NIGHT INTEL",
      title: "The Monday Night Detour",
      commentary: "Under the influence of premium pinot and gummies, GaelicGopher declared 'Monday night de tour'. Scouts are analyzing the playbook.",
      messages: [
        {
          time: "02:14",
          author: "GaelicGopher",
          text: "Monday night de tour"
        }
      ]
    }
  ]
};

interface RecentGameItem {
  game_id: number | string;
  isPlayoff: boolean;
  roundLabel?: string;
  home_team_id: number;
  away_team_id: number;
  home_abbr: string;
  away_abbr: string;
  home_name: string;
  away_name: string;
  home_logo: string | null;
  away_logo: string | null;
  home_coach?: string;
  away_coach?: string;
  home_score: number;
  away_score: number;
  isOT: boolean;
  otLabel: string;
  home_shots: number | null;
  away_shots: number | null;
}

interface PlayoffSeriesSummary {
  id: string;
  roundName: string;
  matchLabel: string;
  homeAbbr: string;
  awayAbbr: string;
  homeName: string;
  awayName: string;
  homeLogo: string | null;
  awayLogo: string | null;
  homeSeed?: number | string;
  awaySeed?: number | string;
  homeWins: number;
  awayWins: number;
  seriesLength: number;
  statusPill: string;
  isComplete: boolean;
  leader: 'home' | 'away' | 'tied' | null;
  games: { gameNumber: number; homeScore: number; awayScore: number; isOT: boolean }[];
}

function normalizeName(str: string) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export default function HomePage() {
  // Defaulting to 40 (W18)
  const [selectedLeague, setSelectedLeague] = useState<string>('ALL');
  const [selectedSeason, setSelectedSeason] = useState<number>(40);
  const [standings, setStandings] = useState<any[]>([]);
  const [briefing, setBriefing] = useState<any>(DEFAULT_BRIEFING);

  // Center Hub state
  const [recentGames, setRecentGames] = useState<RecentGameItem[]>([]);
  const [gameFilter, setGameFilter] = useState<'ALL' | 'PLAYOFFS' | 'REG'>('ALL');
  const [playoffSeries, setPlayoffSeries] = useState<PlayoffSeriesSummary[]>([]);
  const [regStatLeaders, setRegStatLeaders] = useState<{ skaters: any[]; goalies: any[] }>({ skaters: [], goalies: [] });
  const [poStatLeaders, setPoStatLeaders] = useState<{ skaters: any[]; goalies: any[] }>({ skaters: [], goalies: [] });
  const [statsPhase, setStatsPhase] = useState<'REG' | 'PLAYOFFS'>('REG');
  const [leaderTab, setLeaderTab] = useState<'PTS' | 'G' | 'A' | 'GAA' | 'SV%' | 'W'>('PTS');
  const [showAudioLogs, setShowAudioLogs] = useState<boolean>(false);

  // Expandable Boxscore Drawer State
  const [expandedGameKey, setExpandedGameKey] = useState<string | null>(null);
  const [boxscoreDetails, setBoxscoreDetails] = useState<{
    loading: boolean;
    scoring: any[];
    topPlayers: any[];
  }>({ loading: false, scoring: [], topPlayers: [] });

  // Filter seasons based on selected league
  const filteredSeasons = useMemo(() => {
    if (selectedLeague === 'ALL') return ALL_SEASONS;
    return ALL_SEASONS.filter((s) => s.league === selectedLeague);
  }, [selectedLeague]);

  const activeSeasonLabel = useMemo(() => {
    return ALL_SEASONS.find((s) => s.id === selectedSeason)?.label || `S${selectedSeason}`;
  }, [selectedSeason]);

  // Handle switching league filter buttons
  const handleLeagueChange = (league: string) => {
    setSelectedLeague(league);
    const available = league === 'ALL'
      ? ALL_SEASONS
      : ALL_SEASONS.filter((s) => s.league === league);

    if (available.length > 0 && !available.some((s) => s.id === selectedSeason)) {
      setSelectedSeason(available[0].id);
    }
  };

  useEffect(() => {
    fetch(`/daily_briefing.json?t=${Date.now()}`, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data) => setBriefing(data))
      .catch(() => {
        console.log("Using cached Gazette briefing");
      });
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadStandingsAndHub() {
      const numericLeagueId = Number(selectedSeason) || 40;

      try {
        const [
          schedRes,
          statsRes,
          teamsRes,
          standingsRes,
          playoffsRes,
          poGamesRes,
          apiStatsRes,
          regMasterRes,
          poMasterRes,
          coachesRes,
          rostersRes
        ] = await Promise.all([
          supabase
            .from('league_schedule')
            .select('game_id, home_team_id, away_team_id, played, league_id, home_score, away_score, game_meta')
            .eq('league_id', numericLeagueId)
            .order('game_id', { ascending: true }),
          supabase
            .from('league_gamestats')
            .select('game_id, home_score, away_score, game_meta, league_id, home_team_id, away_team_id, home_stats, away_stats, home_coach, away_coach')
            .eq('league_id', numericLeagueId)
            .order('game_id', { ascending: false }),
          supabase
            .from('league_teams')
            .select('team_id, team_name, abbreviation, logo_url, coach_id, league_id'),
          supabase
            .from('league_standings')
            .select(`
              team_id, gp, w, l, t, otl, pts, gf, ga, gd, is_champion,
              league_teams(team_id, abbreviation, logo_url, team_name)
            `)
            .eq('season_id', numericLeagueId)
            .order('pts', { ascending: false }),
          supabase
            .from('league_playoffs')
            .select('*')
            .eq('league_id', numericLeagueId)
            .order('playoff_id', { ascending: true })
            .then(r => r, () => ({ data: [] as any[], error: null })),
          supabase
            .from('league_playoff_gamestats')
            .select('*')
            .eq('league_id', numericLeagueId)
            .order('game_id', { ascending: false })
            .then(r => r, () => ({ data: [] as any[], error: null })),
          supabase
            .from('api_stats_with_names')
            .select('*')
            .eq('league_id', numericLeagueId)
            .then(r => r, () => ({ data: [] as any[], error: null })),
          supabase
            .from('league_player_stats_master')
            .select('*')
            .eq('league_id', numericLeagueId)
            .then(r => r, () => ({ data: [] as any[], error: null })),
          supabase
            .from('league_playoff_player_stats_master')
            .select('*')
            .eq('league_id', numericLeagueId)
            .then(r => r, () => ({ data: [] as any[], error: null })),
          supabase
            .from('league_coaches')
            .select('coach_id, coach_name')
            .then(r => r, () => ({ data: [] as any[], error: null })),
          supabase
            .from('league_rosters')
            .select('player_id, player_name, pos')
            .eq('league_id', numericLeagueId)
            .then(r => r, () => ({ data: [] as any[], error: null }))
        ]);

        if (!isMounted) return;

        const allScheduleData = schedRes.data || [];
        const statsData = statsRes.data || [];
        const allTeamsData = teamsRes.data || [];
        const standardData = standingsRes.data || [];
        const playoffsData = playoffsRes.data || [];
        const poGamesData = poGamesRes.data || [];
        const apiStatsData = apiStatsRes.data || [];
        const regMasterData = regMasterRes.data || [];
        const poMasterData = poMasterRes.data || [];
        const coachesData = coachesRes.data || [];
        const rostersData = rostersRes.data || [];

        const coachesMap = new Map<number, string>();
        coachesData.forEach((c: any) => {
          if (c.coach_id !== undefined && c.coach_name) {
            coachesMap.set(Number(c.coach_id), String(c.coach_name).trim());
          }
        });

        // Champion mapping
        const championMap = new Map<number, boolean>();
        standardData.forEach((row: any) => {
          if (row.is_champion) championMap.set(Number(row.team_id), true);
        });

        // Team base metadata map (prefer row matching numericLeagueId)
        const baseTeamMap = new Map<number, any>();
        allTeamsData.forEach((t: any) => {
          const tId = Number(t.team_id);
          const existing = baseTeamMap.get(tId);
          if (!existing || Number(t.league_id) === numericLeagueId) {
            baseTeamMap.set(tId, t);
          }
        });

        let freshStandings: any[] = [];

        // Check if there are any played games in gamestats or schedule
        const hasPlayedGames = statsData.length > 0 || allScheduleData.some((g: any) => {
          const rawPlayed = String(g.played || '').trim().toLowerCase();
          return rawPlayed === 'true' || rawPlayed === '1' || rawPlayed === 'y';
        });

        if (hasPlayedGames) {
          const teamMap: Record<number, any> = {};

          // Collect active team IDs for this season
          const activeTeamIds = new Set<number>();
          allTeamsData.forEach((t: any) => {
            if (Number(t.league_id) === numericLeagueId) activeTeamIds.add(Number(t.team_id));
          });
          allScheduleData.forEach((g: any) => {
            const h = Number(g.home_team_id);
            const a = Number(g.away_team_id);
            if (h && h !== 999 && h !== 0 && h !== 68) activeTeamIds.add(h);
            if (a && a !== 999 && a !== 0 && a !== 68) activeTeamIds.add(a);
          });
          statsData.forEach((s: any) => {
            const h = Number(s.home_team_id);
            const a = Number(s.away_team_id);
            if (h && h !== 999 && h !== 0 && h !== 68) activeTeamIds.add(h);
            if (a && a !== 999 && a !== 0 && a !== 68) activeTeamIds.add(a);
          });
          standardData.forEach((s: any) => {
            const tId = Number(s.team_id);
            if (tId && tId !== 999 && tId !== 0 && tId !== 68) activeTeamIds.add(tId);
          });

          activeTeamIds.forEach((tId) => {
            const tInfo = baseTeamMap.get(tId);
            const savedRow = standardData.find((s: any) => Number(s.team_id) === tId);

            teamMap[tId] = {
              team_id: tId,
              gp: 0,
              w: 0,
              wins: 0,
              l: 0,
              losses: 0,
              t: 0,
              ties: 0,
              otl: 0,
              otLosses: 0,
              pts: 0,
              gf: 0,
              ga: 0,
              is_champion: Boolean(championMap.get(tId) || savedRow?.is_champion),
              league_teams: {
                abbreviation: tInfo?.abbreviation || savedRow?.league_teams?.abbreviation || `TM${tId}`,
                logo_url: tInfo?.logo_url || savedRow?.league_teams?.logo_url || null,
                team_name: tInfo?.team_name || savedRow?.league_teams?.team_name || `Team ${tId}`
              }
            };
          });

          const resolveTeamKey = (id: any): number | null => {
            const num = Number(id);
            if (!num || num === 999 || num === 0 || num === 68) return null;
            if (teamMap[num]) return num;

            const matchTeam = allTeamsData.find((t: any) =>
              Number(t.team_id) === num || Number(t.coach_id) === num
            );

            if (matchTeam) {
              const seasonMatch = allTeamsData.find((t: any) =>
                Number(t.league_id) === numericLeagueId &&
                (
                  (t.abbreviation && t.abbreviation.trim().toUpperCase() === (matchTeam.abbreviation || '').trim().toUpperCase()) ||
                  (t.team_name && t.team_name.trim().toUpperCase() === (matchTeam.team_name || '').trim().toUpperCase()) ||
                  (Number(t.coach_id) > 0 && Number(t.coach_id) === Number(matchTeam.coach_id))
                )
              );

              if (seasonMatch && teamMap[Number(seasonMatch.team_id)]) {
                return Number(seasonMatch.team_id);
              }
            }

            const tInfo = matchTeam || baseTeamMap.get(num);
            teamMap[num] = {
              team_id: num,
              gp: 0,
              w: 0,
              wins: 0,
              l: 0,
              losses: 0,
              t: 0,
              ties: 0,
              otl: 0,
              otLosses: 0,
              pts: 0,
              gf: 0,
              ga: 0,
              is_champion: Boolean(championMap.get(num)),
              league_teams: {
                abbreviation: tInfo?.abbreviation || `TM${num}`,
                logo_url: tInfo?.logo_url || null,
                team_name: tInfo?.team_name || `Team ${num}`
              }
            };
            return num;
          };

          const applyGame = (rawHId: any, rawAId: any, homeScore: number, awayScore: number, gameMeta: any, statsObj?: any) => {
            const hId = resolveTeamKey(rawHId);
            const aId = resolveTeamKey(rawAId);

            if (!hId || !aId || hId === aId) return;
            if (!teamMap[hId] || !teamMap[aId]) return;

            let isOT = false;
            let isTie = false;

            if (gameMeta) {
              try {
                const meta = typeof gameMeta === 'string' ? JSON.parse(gameMeta) : gameMeta;
                isOT = meta.is_ot === true || meta.is_ot === 'true' || meta.is_ot === 1 || meta.is_ot === '1' ||
                       meta.isOT === true || meta.isOT === 'true' || meta.isOT === 1;
                isTie = meta.is_tie === true || meta.is_tie === 'true' || meta.is_tie === 1 || meta.is_tie === '1';
              } catch {
                const lowStr = String(gameMeta || '').toLowerCase();
                isOT = lowStr.includes('"is_ot":true') || lowStr.includes('"is_ot":"true"') || lowStr.includes('"is_ot":1') ||
                       lowStr.includes('"isot":true') || lowStr.includes('"isot":"true"');
                isTie = lowStr.includes('"is_tie":true') || lowStr.includes('"is_tie":"true"') || lowStr.includes('"is_tie":1');
              }
            }

            if (!isOT && statsObj) {
              try {
                const hStats = typeof statsObj.home_stats === 'string' ? JSON.parse(statsObj.home_stats) : statsObj.home_stats;
                const aStats = typeof statsObj.away_stats === 'string' ? JSON.parse(statsObj.away_stats) : statsObj.away_stats;
                if (Number(hStats?.home_ot_goals) > 0 || Number(aStats?.away_ot_goals) > 0 ||
                    Number(hStats?.home_ot_shots) > 0 || Number(aStats?.away_ot_shots) > 0) {
                  isOT = true;
                }
              } catch {}
            }

            if (homeScore === awayScore && !isOT) {
              isTie = true;
            }

            teamMap[hId].gp += 1;
            teamMap[aId].gp += 1;
            teamMap[hId].gf += homeScore;
            teamMap[hId].ga += awayScore;
            teamMap[aId].gf += awayScore;
            teamMap[aId].ga += homeScore;

            if (isTie) {
              teamMap[hId].t += 1;
              teamMap[hId].ties += 1;
              teamMap[hId].pts += 1;

              teamMap[aId].t += 1;
              teamMap[aId].ties += 1;
              teamMap[aId].pts += 1;
            } else if (homeScore > awayScore) {
              teamMap[hId].w += 1;
              teamMap[hId].wins += 1;
              teamMap[hId].pts += 2;

              if (isOT) {
                teamMap[aId].otl += 1;
                teamMap[aId].otLosses += 1;
                teamMap[aId].pts += 1;
              } else {
                teamMap[aId].l += 1;
                teamMap[aId].losses += 1;
              }
            } else if (awayScore > homeScore) {
              teamMap[aId].w += 1;
              teamMap[aId].wins += 1;
              teamMap[aId].pts += 2;

              if (isOT) {
                teamMap[hId].otl += 1;
                teamMap[hId].otLosses += 1;
                teamMap[hId].pts += 1;
              } else {
                teamMap[hId].l += 1;
                teamMap[hId].losses += 1;
              }
            }
          };

          const processedStatsGameIds = new Set<string>();
          statsData.forEach((stats: any) => {
            const gIdStr = String(stats.game_id).trim();
            processedStatsGameIds.add(gIdStr);
            const homeScore = Number(stats.home_score) || 0;
            const awayScore = Number(stats.away_score) || 0;
            applyGame(stats.home_team_id, stats.away_team_id, homeScore, awayScore, stats.game_meta, stats);
          });

          allScheduleData.forEach((game: any) => {
            const gIdStr = String(game.game_id).trim();
            const rawPlayed = String(game.played || '').trim().toLowerCase();
            const isPlayed = rawPlayed === 'true' || rawPlayed === '1' || rawPlayed === 'y';

            if (isPlayed && !processedStatsGameIds.has(gIdStr) && game.game_meta) {
              const homeScore = Number(game.home_score) || 0;
              const awayScore = Number(game.away_score) || 0;
              applyGame(game.home_team_id, game.away_team_id, homeScore, awayScore, game.game_meta, game);
            }
          });

          freshStandings = Object.values(teamMap);
        }

        // Fallback to standardData if no games computed or if freshStandings all have 0 gp
        if (freshStandings.length === 0 || freshStandings.every((t: any) => t.gp === 0)) {
          freshStandings = standardData.map((row: any) => {
            const tId = Number(row.team_id);
            const tInfo = baseTeamMap.get(tId);
            return {
              ...row,
              team_id: tId,
              gp: Number(row.gp) || 0,
              w: Number(row.w) || 0,
              wins: Number(row.w) || 0,
              l: Number(row.l) || 0,
              losses: Number(row.l) || 0,
              t: Number(row.t) || 0,
              ties: Number(row.t) || 0,
              otl: Number(row.otl) || 0,
              otLosses: Number(row.otl) || 0,
              pts: Number(row.pts) || 0,
              gf: Number(row.gf) || 0,
              ga: Number(row.ga) || 0,
              is_champion: Boolean(row.is_champion),
              league_teams: {
                abbreviation: tInfo?.abbreviation || row.league_teams?.abbreviation || `TM${tId}`,
                logo_url: tInfo?.logo_url || row.league_teams?.logo_url || null,
                team_name: tInfo?.team_name || row.league_teams?.team_name || `Team ${tId}`
              }
            };
          });
        }

        freshStandings.sort((a: any, b: any) => {
          if (b.pts !== a.pts) return b.pts - a.pts;
          if ((b.w || b.wins || 0) !== (a.w || a.wins || 0)) return (b.w || b.wins || 0) - (a.w || a.wins || 0);
          const gdA = (a.gf || 0) - (a.ga || 0);
          const gdB = (b.gf || 0) - (b.ga || 0);
          if (gdB !== gdA) return gdB - gdA;
          return (a.league_teams?.abbreviation || '').localeCompare(b.league_teams?.abbreviation || '');
        });

        setStandings(freshStandings);

        // Helper to resolve team display info
        const getTeamDisplay = (rawId: any) => {
          const tId = Number(rawId);
          const tObj = baseTeamMap.get(tId) || allTeamsData.find((t: any) => Number(t.team_id) === tId);
          const stObj = freshStandings.find((s: any) => Number(s.team_id) === tId);
          const coachId = Number(tObj?.coach_id);
          return {
            id: tId,
            abbr: tObj?.abbreviation || stObj?.league_teams?.abbreviation || `TM${tId}`,
            name: tObj?.team_name || stObj?.league_teams?.team_name || `Team ${tId}`,
            logo: tObj?.logo_url || stObj?.league_teams?.logo_url || null,
            coach: (coachId && coachesMap.get(coachId)) || ''
          };
        };

        // Parse OT & Shots from game row
        const parseGameExtra = (g: any) => {
          let isOT = false;
          let otLabel = 'OT';
          if (g.game_meta) {
            try {
              const m = typeof g.game_meta === 'string' ? JSON.parse(g.game_meta) : g.game_meta;
              if (m?.is_ot === true || m?.is_ot === 'true' || m?.is_ot === 1 || m?.isOT === true) {
                isOT = true;
                if (Number(m?.ot_period) > 1) otLabel = `${m.ot_period}OT`;
              }
            } catch {}
          }
          let homeShots: number | null = null;
          let awayShots: number | null = null;
          try {
            const hS = typeof g.home_stats === 'string' ? JSON.parse(g.home_stats) : g.home_stats;
            const aS = typeof g.away_stats === 'string' ? JSON.parse(g.away_stats) : g.away_stats;
            if (hS) {
              const s = Number(hS.home_shots ?? hS.shots ?? (Number(hS.home_1st_shots || 0) + Number(hS.home_2nd_shots || 0) + Number(hS.home_3rd_shots || 0) + Number(hS.home_ot_shots || 0)));
              if (!isNaN(s) && s > 0) homeShots = s;
              if (!isOT && (Number(hS.home_ot_goals) > 0 || Number(hS.home_ot_shots) > 0)) isOT = true;
            }
            if (aS) {
              const s = Number(aS.away_shots ?? aS.shots ?? (Number(aS.away_1st_shots || 0) + Number(aS.away_2nd_shots || 0) + Number(aS.away_3rd_shots || 0) + Number(aS.away_ot_shots || 0)));
              if (!isNaN(s) && s > 0) awayShots = s;
              if (!isOT && (Number(aS.away_ot_goals) > 0 || Number(aS.away_ot_shots) > 0)) isOT = true;
            }
          } catch {}
          return { isOT, otLabel, homeShots, awayShots };
        };

        // 1. Build Recent Games Feed (Playoffs + Regular Season)
        const playoffLabelById = new Map<number, string>();
        playoffsData.forEach((p: any) => {
          if (p.playoff_id) {
            playoffLabelById.set(Number(p.playoff_id), p.round_name || p.match_label || 'PLAYOFFS');
          }
        });

        const recentPoItems: RecentGameItem[] = poGamesData.slice(0, 12).map((g: any) => {
          const h = getTeamDisplay(g.home_team_id);
          const a = getTeamDisplay(g.away_team_id);
          const extra = parseGameExtra(g);
          return {
            game_id: g.game_id,
            isPlayoff: true,
            roundLabel: playoffLabelById.get(Number(g.playoff_id)) || 'PLAYOFFS',
            home_team_id: h.id,
            away_team_id: a.id,
            home_abbr: h.abbr,
            away_abbr: a.abbr,
            home_name: h.name,
            away_name: a.name,
            home_logo: h.logo,
            away_logo: a.logo,
            home_coach: g.home_coach || h.coach,
            away_coach: g.away_coach || a.coach,
            home_score: Number(g.home_score) || 0,
            away_score: Number(g.away_score) || 0,
            isOT: extra.isOT,
            otLabel: extra.otLabel,
            home_shots: extra.homeShots,
            away_shots: extra.awayShots
          };
        });

        const recentRegItems: RecentGameItem[] = statsData.slice(0, 12).map((g: any) => {
          const h = getTeamDisplay(g.home_team_id);
          const a = getTeamDisplay(g.away_team_id);
          const extra = parseGameExtra(g);
          return {
            game_id: g.game_id,
            isPlayoff: false,
            home_team_id: h.id,
            away_team_id: a.id,
            home_abbr: h.abbr,
            away_abbr: a.abbr,
            home_name: h.name,
            away_name: a.name,
            home_logo: h.logo,
            away_logo: a.logo,
            home_coach: g.home_coach || h.coach,
            away_coach: g.away_coach || a.coach,
            home_score: Number(g.home_score) || 0,
            away_score: Number(g.away_score) || 0,
            isOT: extra.isOT,
            otLabel: extra.otLabel,
            home_shots: extra.homeShots,
            away_shots: extra.awayShots
          };
        });

        setRecentGames([...recentPoItems, ...recentRegItems]);

        // 2. Build Playoff Series Tracker
        const poGamesAsc = [...poGamesData].sort((a: any, b: any) => Number(a.game_id) - Number(b.game_id));
        const seriesSummaries: PlayoffSeriesSummary[] = [];

        playoffsData.forEach((p: any) => {
          const hId = Number(p.home_team_id);
          const aId = Number(p.away_team_id);
          if (!hId && !aId) return;

          const h = hId ? getTeamDisplay(hId) : { id: 0, abbr: 'TBD', name: 'TBD', logo: null, coach: '' };
          const a = aId ? getTeamDisplay(aId) : { id: 0, abbr: 'TBD', name: 'TBD', logo: null, coach: '' };

          const matchedGames = poGamesAsc.filter((g: any) => {
            if (p.playoff_id && Number(g.playoff_id) === Number(p.playoff_id)) return true;
            const gh = Number(g.home_team_id);
            const ga = Number(g.away_team_id);
            return hId > 0 && aId > 0 && ((gh === hId && ga === aId) || (gh === aId && ga === hId));
          });

          let homeWins = 0;
          let awayWins = 0;
          const gameList: { gameNumber: number; homeScore: number; awayScore: number; isOT: boolean }[] = [];

          matchedGames.forEach((g: any, idx: number) => {
            const gh = Number(g.home_team_id);
            const gHomeScore = Number(g.home_score) || 0;
            const gAwayScore = Number(g.away_score) || 0;
            const topScore = gh === hId ? gHomeScore : gAwayScore;
            const botScore = gh === hId ? gAwayScore : gHomeScore;
            if (topScore > botScore) homeWins++;
            else if (botScore > topScore) awayWins++;
            const extra = parseGameExtra(g);
            gameList.push({
              gameNumber: idx + 1,
              homeScore: topScore,
              awayScore: botScore,
              isOT: extra.isOT
            });
          });

          const seriesLen = Number(p.series_length) || 7;
          const winsNeeded = Math.floor(seriesLen / 2) + 1;
          const isComplete = homeWins >= winsNeeded || awayWins >= winsNeeded || Boolean(p.winner_id);
          let leader: 'home' | 'away' | 'tied' | null = null;
          if (homeWins > awayWins) leader = 'home';
          else if (awayWins > homeWins) leader = 'away';
          else if (homeWins > 0 && homeWins === awayWins) leader = 'tied';

          let statusPill = `BO${seriesLen}`;
          if (isComplete) {
            const winAbbr = homeWins >= awayWins ? h.abbr : a.abbr;
            statusPill = `${winAbbr} WINS ${Math.max(homeWins, awayWins)}-${Math.min(homeWins, awayWins)}`;
          } else if (homeWins > 0 || awayWins > 0) {
            if (homeWins === awayWins) {
              statusPill = `TIED ${homeWins}-${awayWins}`;
            } else {
              const leadAbbr = homeWins > awayWins ? h.abbr : a.abbr;
              statusPill = `${leadAbbr} LEADS ${Math.max(homeWins, awayWins)}-${Math.min(homeWins, awayWins)}`;
            }
          }

          seriesSummaries.push({
            id: String(p.playoff_id || `${hId}-${aId}-${p.match_label}`),
            roundName: p.round_name || p.match_label || 'Playoff Series',
            matchLabel: p.match_label || p.round_name || 'Series',
            homeAbbr: h.abbr,
            awayAbbr: a.abbr,
            homeName: h.name,
            awayName: a.name,
            homeLogo: h.logo,
            awayLogo: a.logo,
            homeSeed: p.home_team_seed ?? undefined,
            awaySeed: p.away_team_seed ?? undefined,
            homeWins,
            awayWins,
            seriesLength: seriesLen,
            statusPill,
            isComplete,
            leader,
            games: gameList
          });
        });

        // Sort active series with games played first, then completed series
        seriesSummaries.sort((a, b) => {
          const aActive = !a.isComplete && (a.homeWins + a.awayWins > 0) ? 1 : 0;
          const bActive = !b.isComplete && (b.homeWins + b.awayWins > 0) ? 1 : 0;
          if (bActive !== aActive) return bActive - aActive;
          return (b.homeWins + b.awayWins) - (a.homeWins + a.awayWins);
        });

        setPlayoffSeries(seriesSummaries);

        // 3. Build Season Stat Leaders (Regular Season & Playoffs)
        // Collect unique player IDs that need name resolution
        const unknownIds = new Set<number>();
        [...regMasterData, ...poMasterData].forEach((r: any) => {
          const pid = Number(r.player_id);
          if (pid > 1 && !r.player_name) unknownIds.add(pid);
        });

        const playerDbMap = new Map<number, { name: string; pos: string }>();
        apiStatsData.forEach((s: any) => {
          const pid = Number(s.player_id);
          if (pid > 1 && s.player_name) {
            playerDbMap.set(pid, { name: String(s.player_name).trim(), pos: String(s.pos || s.pos_played || '').toUpperCase() });
          }
        });
        rostersData.forEach((r: any) => {
          const pid = Number(r.player_id);
          if (pid > 1 && r.player_name) {
            playerDbMap.set(pid, { name: String(r.player_name).trim(), pos: String(r.pos || '').toUpperCase() });
          }
        });

        if (unknownIds.size > 0) {
          const idsArr = Array.from(unknownIds).filter(id => !playerDbMap.has(id)).slice(0, 500);
          if (idsArr.length > 0) {
            const { data: pRows } = await supabase
              .from('league_player_database')
              .select('player_id, player_name, pos')
              .in('player_id', idsArr);
            (pRows || []).forEach((p: any) => {
              if (p.player_id && p.player_name) {
                playerDbMap.set(Number(p.player_id), {
                  name: String(p.player_name).trim(),
                  pos: String(p.pos || '').toUpperCase()
                });
              }
            });
          }
        }

        const aggregateMasterRows = (rows: any[]) => {
          const map = new Map<string, any>();
          rows.forEach((r: any) => {
            const pid = Number(r.player_id);
            const dbInfo = pid > 1 ? playerDbMap.get(pid) : undefined;
            const pName = String(r.player_name || dbInfo?.name || '').trim();
            if (!pName || pName === 'Goalie' || pName === 'Skater') return;
            const pos = String(r.pos_played || dbInfo?.pos || 'F').toUpperCase();
            const isG = pos === 'G' || Number(r.shots_against || 0) > 0 || Number(r.saves || 0) > 0;
            const tInfo = getTeamDisplay(r.team_id);
            const key = `${isG ? 'G' : 'S'}_${pid > 1 ? pid : normalizeName(pName)}`;

            if (!map.has(key)) {
              map.set(key, {
                player_id: pid,
                player_name: pName,
                team_id: r.team_id,
                team_abbr: tInfo.abbr,
                team_name: tInfo.name,
                logo_url: tInfo.logo,
                pos: isG ? 'G' : pos,
                gp: 0,
                goals: 0,
                assists: 0,
                points: 0,
                wins: 0,
                shutouts: 0,
                shots_against: 0,
                saves: 0,
                goals_against: 0
              });
            }
            const cur = map.get(key);
            cur.gp += 1;
            const g = Number(r.goals || 0);
            const a = Number(r.assists || 0);
            cur.goals += g;
            cur.assists += a;
            cur.points += (g + a);
            if (isG) {
              cur.shots_against += Number(r.shots_against || 0);
              cur.saves += Number(r.saves || 0);
              cur.goals_against += Number(r.goals_against || 0);
              if (r.is_win) cur.wins += 1;
              if (Number(r.goals_against || 0) === 0 && (Number(r.shots_against || 0) > 0 || r.is_win)) {
                cur.shutouts += 1;
              }
            }
          });

          const skaters: any[] = [];
          const goalies: any[] = [];
          map.forEach((p) => {
            if (p.pos === 'G') {
              p.gaa = p.gp > 0 ? Number((p.goals_against / p.gp).toFixed(2)) : 999;
              p.sv_pct = p.shots_against > 0 ? Number((p.saves / p.shots_against).toFixed(3)) : 0;
              goalies.push(p);
            } else {
              skaters.push(p);
            }
          });
          return { skaters, goalies };
        };

        // Regular season leaders: prefer api_stats_with_names if populated, else aggregate regMasterData
        let regSkaters: any[] = [];
        let regGoalies: any[] = [];

        if (apiStatsData.length > 0) {
          apiStatsData.forEach((s: any) => {
            const pName = String(s.player_name || '').trim();
            if (!pName) return;
            const pos = String(s.pos_played || s.pos || '').toUpperCase();
            const isG = pos === 'G' || Number(s.shots_against ?? s.total_shots_against ?? 0) > 0;
            const tInfo = getTeamDisplay(s.team_id);
            const gp = Number(s.gp ?? s.games_played ?? 0);
            if (gp <= 0) return;

            if (isG) {
              const ga = Number(s.goals_against ?? s.total_goals_against ?? s.ga ?? 0);
              const sa = Number(s.shots_against ?? s.total_shots_against ?? s.sa ?? 0);
              const sv = Number(s.saves ?? s.total_saves ?? s.sv ?? 0);
              regGoalies.push({
                player_id: s.player_id,
                player_name: pName,
                team_abbr: tInfo.abbr || s.team_name || '',
                team_name: tInfo.name || s.team_name || '',
                logo_url: s.logo_url || tInfo.logo,
                pos: 'G',
                gp,
                wins: Number(s.wins ?? 0),
                shutouts: Number(s.shutouts ?? 0),
                gaa: s.gaa != null && Number(s.gaa) > 0 ? Number(s.gaa) : (gp > 0 ? Number((ga / gp).toFixed(2)) : 999),
                sv_pct: s.sv_pct != null && Number(s.sv_pct) > 0 ? Number(s.sv_pct) : (sa > 0 ? Number((sv / sa).toFixed(3)) : 0)
              });
            } else {
              const goals = Number(s.total_goals ?? s.goals ?? 0);
              const assists = Number(s.total_assists ?? s.assists ?? 0);
              const points = Number(s.total_points ?? s.points ?? (goals + assists));
              regSkaters.push({
                player_id: s.player_id,
                player_name: pName,
                team_abbr: tInfo.abbr || s.team_name || '',
                team_name: tInfo.name || s.team_name || '',
                logo_url: s.logo_url || tInfo.logo,
                pos: pos || 'F',
                gp,
                goals,
                assists,
                points
              });
            }
          });
        } else if (regMasterData.length > 0) {
          const agg = aggregateMasterRows(regMasterData);
          regSkaters = agg.skaters;
          regGoalies = agg.goalies;
        }

        const poAgg = aggregateMasterRows(poMasterData);
        setRegStatLeaders({ skaters: regSkaters, goalies: regGoalies });
        setPoStatLeaders(poAgg);

        if (poAgg.skaters.length > 0 && regSkaters.length === 0) {
          setStatsPhase('PLAYOFFS');
        } else {
          setStatsPhase('REG');
        }
      } catch (err) {
        console.error("DEBUG - Error loading standings and hub:", err);
      }
    }

    loadStandingsAndHub();

    // Polling backup every 15s to guarantee fresh standings even if websockets lag
    const interval = setInterval(loadStandingsAndHub, 15000);

    // Subscribe to real-time changes on league_standings, league_gamestats, and league_schedule
    const channel = supabase
      .channel(`realtime-standings-${selectedSeason}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'league_standings' },
        () => {
          loadStandingsAndHub();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'league_gamestats' },
        () => {
          loadStandingsAndHub();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'league_schedule' },
        () => {
          loadStandingsAndHub();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [selectedSeason]);

  // Toggle and load inline boxscore summary for a recent game
  const handleToggleBoxscore = async (game: RecentGameItem) => {
    const key = `${game.isPlayoff ? 'PO' : 'REG'}_${game.game_id}`;
    if (expandedGameKey === key) {
      setExpandedGameKey(null);
      return;
    }
    setExpandedGameKey(key);
    setBoxscoreDetails({ loading: true, scoring: [], topPlayers: [] });

    try {
      const scoringTable = game.isPlayoff ? 'league_playoff_scoring' : 'league_scoring';
      const playerTable = game.isPlayoff ? 'league_playoff_player_stats_master' : 'league_player_stats_master';

      const [scRes, plRes] = await Promise.all([
        supabase.from(scoringTable).select('*').eq('game_id', game.game_id).order('period', { ascending: true }),
        supabase.from(playerTable).select('*').eq('game_id', game.game_id)
      ]);

      const scoringRows = scRes.data || [];
      const playerRows = plRes.data || [];

      // Build player ID -> player_name map from scoring rows, league_player_database, and league_rosters
      const nameById = new Map<number, string>();
      scoringRows.forEach((sc: any) => {
        if (sc.scorer_id && sc.scorer && !String(sc.scorer).startsWith('Player #')) {
          nameById.set(Number(sc.scorer_id), String(sc.scorer).trim());
        }
        if (sc.assist1_id && sc.assist1 && sc.assist1 !== '--' && !String(sc.assist1).startsWith('Player #')) {
          nameById.set(Number(sc.assist1_id), String(sc.assist1).trim());
        }
        if (sc.assist2_id && sc.assist2 && sc.assist2 !== '--' && !String(sc.assist2).startsWith('Player #')) {
          nameById.set(Number(sc.assist2_id), String(sc.assist2).trim());
        }
      });

      const missingIds = Array.from(
        new Set(
          playerRows
            .map((p: any) => Number(p.player_id))
            .filter((id: number) => !isNaN(id) && id > 0 && !nameById.has(id))
        )
      );

      if (missingIds.length > 0) {
        const [dbByPid, dbById, rosterByPid] = await Promise.all([
          supabase.from('league_player_database').select('player_id, player_name').in('player_id', missingIds).then(r => r, () => ({ data: null })),
          supabase.from('league_player_database').select('id, player_name').in('id', missingIds).then(r => r, () => ({ data: null })),
          supabase.from('league_rosters').select('player_id, player_name').in('player_id', missingIds).then(r => r, () => ({ data: null }))
        ]);

        (dbByPid.data || []).forEach((row: any) => {
          if (row.player_id && row.player_name) nameById.set(Number(row.player_id), String(row.player_name).trim());
        });
        (dbById.data || []).forEach((row: any) => {
          if (row.id && row.player_name) nameById.set(Number(row.id), String(row.player_name).trim());
        });
        (rosterByPid.data || []).forEach((row: any) => {
          if (row.player_id && row.player_name) nameById.set(Number(row.player_id), String(row.player_name).trim());
        });
      }

      // Also tally G / A / PTS directly from scoringRows by player name
      const tallyByName = new Map<string, { name: string; g: number; a: number; pts: number }>();
      const addTally = (rawName: any, isGoal: boolean) => {
        const clean = String(rawName || '').trim();
        if (!clean || clean === '--' || clean.toLowerCase() === 'none' || clean.toLowerCase() === 'unassisted' || clean.startsWith('Player #')) return;
        const k = clean.toLowerCase();
        const cur = tallyByName.get(k) || { name: clean, g: 0, a: 0, pts: 0 };
        if (isGoal) cur.g += 1;
        else cur.a += 1;
        cur.pts = cur.g + cur.a;
        tallyByName.set(k, cur);
      };

      scoringRows.forEach((sc: any) => {
        addTally(sc.scorer, true);
        addTally(sc.assist1, false);
        addTally(sc.assist2, false);
      });

      const fromScoringLog = Array.from(tallyByName.values()).sort((a, b) => b.pts - a.pts || b.g - a.g);

      let topSkaters = playerRows
        .filter((p: any) => (Number(p.goals || 0) + Number(p.assists || 0)) > 0)
        .map((p: any) => {
          const pid = Number(p.player_id);
          const resolvedName =
            (p.player_name && !String(p.player_name).startsWith('Player #') ? String(p.player_name).trim() : '') ||
            nameById.get(pid) ||
            '';
          return {
            name: resolvedName,
            team_id: Number(p.team_id),
            g: Number(p.goals || 0),
            a: Number(p.assists || 0),
            pts: Number(p.goals || 0) + Number(p.assists || 0)
          };
        })
        .sort((a: any, b: any) => b.pts - a.pts || b.g - a.g);

      // If any skater row still lacks a resolved name, match from the scoring log or use the scoring log directly
      if (fromScoringLog.length > 0 && (topSkaters.length === 0 || topSkaters.some((s: any) => !s.name))) {
        const usedNames = new Set(topSkaters.map((s: any) => s.name.toLowerCase()).filter(Boolean));
        topSkaters = topSkaters.map((s: any) => {
          if (s.name) return s;
          const match = fromScoringLog.find(
            ( item ) => !usedNames.has(item.name.toLowerCase()) && item.g === s.g && item.a === s.a
          ) || fromScoringLog.find((item) => !usedNames.has(item.name.toLowerCase()));
          if (match) {
            usedNames.add(match.name.toLowerCase());
            return { ...s, name: match.name };
          }
          return s;
        });

        if (topSkaters.some((s: any) => !s.name)) {
          topSkaters = fromScoringLog;
        }
      }

      topSkaters = topSkaters
        .filter((s: any) => Boolean(s.name))
        .slice(0, 6);

      setBoxscoreDetails({
        loading: false,
        scoring: scoringRows,
        topPlayers: topSkaters
      });
    } catch {
      setBoxscoreDetails({ loading: false, scoring: [], topPlayers: [] });
    }
  };

  // Filtered recent games for scoreboard wire
  const displayedRecentGames = useMemo(() => {
    let list = recentGames;
    if (gameFilter === 'PLAYOFFS') list = recentGames.filter(g => g.isPlayoff);
    else if (gameFilter === 'REG') list = recentGames.filter(g => !g.isPlayoff);
    return list.slice(0, 8);
  }, [recentGames, gameFilter]);

  // Active stat leaders list based on phase & tab
  const activeLeaderList = useMemo(() => {
    const source = statsPhase === 'PLAYOFFS' ? poStatLeaders : regStatLeaders;
    const isGoalieTab = leaderTab === 'GAA' || leaderTab === 'SV%' || leaderTab === 'W';

    if (isGoalieTab) {
      const minGP = statsPhase === 'PLAYOFFS' ? 2 : 5;
      let goalies = source.goalies.filter((g: any) => g.gp >= minGP);
      if (goalies.length === 0) goalies = [...source.goalies];

      if (leaderTab === 'GAA') {
        return goalies.sort((a, b) => a.gaa - b.gaa || b.wins - a.wins).slice(0, 6);
      }
      if (leaderTab === 'SV%') {
        return goalies.sort((a, b) => b.sv_pct - a.sv_pct || b.wins - a.wins).slice(0, 6);
      }
      return goalies.sort((a, b) => b.wins - a.wins || a.gaa - b.gaa).slice(0, 6);
    }

    const skaters = [...source.skaters];
    if (leaderTab === 'G') {
      return skaters.sort((a, b) => b.goals - a.goals || b.points - a.points).slice(0, 6);
    }
    if (leaderTab === 'A') {
      return skaters.sort((a, b) => b.assists - a.assists || b.points - a.points).slice(0, 6);
    }
    return skaters.sort((a, b) => b.points - a.points || b.goals - a.goals).slice(0, 6);
  }, [regStatLeaders, poStatLeaders, statsPhase, leaderTab]);

  const formatLeaderValue = (p: any) => {
    if (!p) return '-';
    if (leaderTab === 'GAA') return Number(p.gaa).toFixed(2);
    if (leaderTab === 'SV%') return Number(p.sv_pct).toFixed(3);
    if (leaderTab === 'W') return p.wins;
    if (leaderTab === 'G') return p.goals;
    if (leaderTab === 'A') return p.assists;
    return p.points;
  };

  // All Twitch clips from briefing
  const allTapeRoomClips = useMemo(() => {
    const clips: { name: string; url: string; channel: string }[] = [];
    (briefing?.sections || []).forEach((sec: any) => {
      (sec.clips || []).forEach((c: any) => {
        clips.push({ name: c.name, url: c.url, channel: sec.channel });
      });
    });
    return clips;
  }, [briefing]);

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-black font-serif p-2 sm:p-4 md:p-6">
      <header className="border-b-4 border-black pb-3 sm:pb-4 mb-4 text-center">
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tighter">NHL95 Gazette</h1>
        <p className="text-xs sm:text-sm italic">"Welcome to the Darkside of NHL95"</p>
      </header>

      {/* Real-World NHL Current News Wire Bar (only shown when live/updated articles exist, not static placeholders) */}
      {(() => {
        const STATIC_TITLES = new Set([
          'NHL Offseason: Trade Buzz Intensifies as Training Camps Near',
          'Scouting Reports: Top Prospects Gear Up for Rookie Showcase',
          'Free Agency Rewind: Big Moves That Shifted Division Balance',
          'NHL - The Home of the Puck',
          'The Competing Website',
          'The Other Sega Hockey Game'
        ]);
        const liveWire = (briefing?.nhl_wire || []).filter(
          (story: any) =>
            story?.title &&
            story?.link &&
            story.link !== 'https://www.nhl.com' &&
            !STATIC_TITLES.has(String(story.title).trim())
        );
        if (liveWire.length === 0) return null;
        return (
          <div className="border-y-2 border-black py-1.5 px-3 mb-6 bg-neutral-100 flex items-center gap-3 overflow-hidden text-xs">
            <span className="bg-black text-white font-mono uppercase font-black px-1.5 py-0.5 text-[10px] tracking-wider shrink-0">
              NHL.com Updates
            </span>
            <div className="flex items-center gap-6 overflow-x-auto whitespace-nowrap no-scrollbar text-neutral-800">
              {liveWire.map((story: any, sIdx: number) => (
                <a
                  key={sIdx}
                  href={story.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold hover:text-blue-800 hover:underline flex items-center gap-1.5"
                >
                  <span>•</span>
                  <span>{story.title}</span>
                  <span className="text-[10px] text-neutral-500 font-normal">({story.date})</span>
                </a>
              ))}
            </div>
          </div>
        );
      })()}
      {false && (
        <div className="border-y-2 border-black py-1.5 px-3 mb-6 bg-neutral-100 flex items-center gap-3 overflow-hidden text-xs">
          <span className="bg-black text-white font-mono uppercase font-black px-1.5 py-0.5 text-[10px] tracking-wider shrink-0">
            NHL.com Updates
          </span>
          <div className="flex items-center gap-6 overflow-x-auto whitespace-nowrap no-scrollbar text-neutral-800">
            {briefing.nhl_wire.map((story: any, sIdx: number) => (
              <a
                key={sIdx}
                href={story.link}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold hover:text-blue-800 hover:underline flex items-center gap-1.5"
              >
                <span>•</span>
                <span>{story.title}</span>
                <span className="text-[10px] text-neutral-500 font-normal">({story.date})</span>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-4 sm:gap-6 md:gap-8">
        <section className="col-span-12 md:col-span-3 border-r-0 md:border-r border-black pr-0 md:pr-2 pb-4 md:pb-0 border-b md:border-b-0 space-y-4 sm:space-y-6">
          {/* 1. Live Now Section (if any live events) */}
          {briefing?.events?.some((e: any) => e.is_live) && (
            <div className="border-2 border-red-700 bg-red-50 p-3 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider text-red-900 font-mono">
                  HAPPENING NOW
                </span>
              </div>
              {briefing.events
                .filter((e: any) => e.is_live)
                .map((liveEvt: any, lIdx: number) => (
                  <div key={lIdx} className="space-y-1">
                    <h3 className="font-black text-xs text-neutral-900 leading-snug">{liveEvt.title}</h3>
                    {liveEvt.description && (
                      <p className="text-[11px] text-neutral-700 italic">{liveEvt.description}</p>
                    )}
                    {liveEvt.url && (
                      <a
                        href={liveEvt.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-1 text-[10px] font-bold font-mono bg-red-600 hover:bg-red-700 text-white px-2 py-0.5"
                      >
                        Watch Live Stream →
                      </a>
                    )}
                  </div>
                ))}
            </div>
          )}

          {/* 2. Upcoming Discord Events */}
          <div>
            <div className="flex items-center justify-between border-b border-black mb-3 pb-1">
              <h2 className="font-bold uppercase tracking-tight text-sm">Upcoming Events</h2>
              <span className="text-[9px] font-mono uppercase bg-neutral-200 px-1 py-0.5">
                DISCORD
              </span>
            </div>

            <div className="space-y-3">
              {briefing?.events && briefing.events.filter((e: any) => !e.is_live).length > 0 ? (
                briefing.events
                  .filter((e: any) => !e.is_live)
                  .map((evt: any, idx: number) => (
                    <div key={idx} className="border border-neutral-300 bg-white/60 p-2.5 shadow-xs">
                      <div className="flex items-start gap-2.5">
                        <div className="bg-black text-white text-center px-1.5 py-1 min-w-[48px] shrink-0 font-mono rounded-none">
                          <div className="text-[10px] font-black uppercase leading-none">{evt.date}</div>
                          {evt.time && <div className="text-[8px] opacity-75 mt-0.5 leading-none">{evt.time}</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-xs leading-snug text-neutral-900">{evt.title}</h3>
                          {evt.description && (
                            <p className="text-[10px] text-neutral-600 italic mt-0.5 leading-tight">{evt.description}</p>
                          )}
                          {evt.url ? (
                            <a
                              href={evt.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block mt-1 text-[9px] font-mono font-bold text-blue-800 hover:underline"
                            >
                              Join in Discord →
                            </a>
                          ) : evt.interested ? (
                            <span className="inline-block mt-1 text-[8px] font-mono text-neutral-500">
                              ★ {evt.interested} interested
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))
              ) : (
                <p className="text-xs italic text-neutral-500">No scheduled events on the wire.</p>
              )}
            </div>
          </div>

          {/* 3. League Special Bulletin / Announcements */}
          {briefing?.bulletin && (
            <div className="border border-black bg-amber-50/50 p-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-black/20 pb-1 mb-1.5">
                <span className="text-[9px] font-black uppercase font-mono tracking-wider text-neutral-800">
                  SPECIAL BULLETIN
                </span>
                <span className="text-[9px] font-mono text-neutral-500">{briefing.bulletin.date}</span>
              </div>
              <h3 className="font-bold text-xs leading-snug text-neutral-900 mb-1">
                {briefing.bulletin.title}
              </h3>
              <p className="text-[11px] text-neutral-700 leading-relaxed font-serif">
                {briefing.bulletin.text}
              </p>
              <div className="text-[9px] font-mono text-right text-neutral-500 mt-1.5">
                — {briefing.bulletin.author}
              </div>
            </div>
          )}
        </section>

        {/* CENTER COLUMN: FULL LEAGUE HUB */}
        <main className="col-span-12 md:col-span-6 space-y-6">
          {/* SECTION 1: RECENT SCOREBOARD & BOXSCORE WIRE */}
          <section className="border-2 border-black bg-white/80 p-3.5 shadow-[3px_3px_0px_#000]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black pb-2 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-black text-white font-mono text-[10px] font-black px-1.5 py-0.5 uppercase tracking-wider">
                    {activeSeasonLabel} WIRE
                  </span>
                  <h2 className="font-black uppercase tracking-tight text-base sm:text-lg leading-none">
                    Recent Games &amp; Boxscores
                  </h2>
                </div>
                <p className="text-[10px] text-neutral-600 italic mt-0.5">
                  Click any matchup to inspect scoring summary &amp; top stars
                </p>
              </div>

              <div className="flex items-center gap-1 font-mono text-[10px]">
                {(['ALL', 'PLAYOFFS', 'REG'] as const).map((flt) => (
                  <button
                    key={flt}
                    type="button"
                    onClick={() => setGameFilter(flt)}
                    className={`px-2 py-0.5 font-bold uppercase border border-black transition-colors cursor-pointer ${
                      gameFilter === flt
                        ? 'bg-black text-white'
                        : 'bg-[#f4f1ea] text-black hover:bg-neutral-200'
                    }`}
                  >
                    {flt === 'REG' ? 'REG SEASON' : flt}
                  </button>
                ))}
              </div>
            </div>

            {displayedRecentGames.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {displayedRecentGames.map((g) => {
                  const key = `${g.isPlayoff ? 'PO' : 'REG'}_${g.game_id}`;
                  const isExpanded = expandedGameKey === key;
                  const awayWon = g.away_score > g.home_score;
                  const homeWon = g.home_score > g.away_score;

                  return (
                    <div
                      key={key}
                      className={`border border-black transition-all ${
                        isExpanded ? 'sm:col-span-2 bg-amber-50/60 shadow-sm' : 'bg-[#faf8f3] hover:bg-white'
                      }`}
                    >
                      <div
                        onClick={() => handleToggleBoxscore(g)}
                        className="p-2.5 cursor-pointer select-none"
                      >
                        <div className="flex items-center justify-between text-[9px] font-mono uppercase mb-1.5 pb-1 border-b border-neutral-200">
                          <span className={`font-black px-1.5 py-0.2 ${
                            g.isPlayoff ? 'bg-amber-400 text-black border border-black' : 'bg-neutral-200 text-neutral-800'
                          }`}>
                            {g.isPlayoff ? (g.roundLabel || 'PLAYOFFS') : 'REGULAR SEASON'}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {g.home_shots !== null && g.away_shots !== null && (
                              <span className="text-neutral-500">
                                SOG {g.away_shots}-{g.home_shots}
                              </span>
                            )}
                            <span className={`font-bold px-1 ${g.isOT ? 'bg-red-700 text-white' : 'text-neutral-700'}`}>
                              {g.isOT ? `FINAL/${g.otLabel}` : 'FINAL'}
                            </span>
                          </div>
                        </div>

                        {/* Away Row */}
                        <div className="flex items-center justify-between py-0.5">
                          <div className="flex items-center gap-2 min-w-0">
                            {g.away_logo ? (
                              <img src={g.away_logo} alt={g.away_abbr} className="w-5 h-5 object-contain shrink-0" />
                            ) : (
                              <div className="w-5 h-5 bg-neutral-200 border border-neutral-400 text-[8px] font-mono font-bold flex items-center justify-center shrink-0">
                                {g.away_abbr.slice(0, 3)}
                              </div>
                            )}
                            <span className={`text-xs uppercase truncate ${awayWon ? 'font-black text-black' : 'font-semibold text-neutral-600'}`}>
                              {g.away_abbr}
                            </span>
                            {g.away_coach && (
                              <span className="text-[9px] font-mono text-neutral-400 truncate">
                                ({g.away_coach})
                              </span>
                            )}
                          </div>
                          <span className={`font-mono text-sm ${awayWon ? 'font-black text-black' : 'font-bold text-neutral-500'}`}>
                            {g.away_score}
                          </span>
                        </div>

                        {/* Home Row */}
                        <div className="flex items-center justify-between py-0.5">
                          <div className="flex items-center gap-2 min-w-0">
                            {g.home_logo ? (
                              <img src={g.home_logo} alt={g.home_abbr} className="w-5 h-5 object-contain shrink-0" />
                            ) : (
                              <div className="w-5 h-5 bg-neutral-200 border border-neutral-400 text-[8px] font-mono font-bold flex items-center justify-center shrink-0">
                                {g.home_abbr.slice(0, 3)}
                              </div>
                            )}
                            <span className={`text-xs uppercase truncate ${homeWon ? 'font-black text-black' : 'font-semibold text-neutral-600'}`}>
                              {g.home_abbr}
                            </span>
                            {g.home_coach && (
                              <span className="text-[9px] font-mono text-neutral-400 truncate">
                                ({g.home_coach})
                              </span>
                            )}
                          </div>
                          <span className={`font-mono text-sm ${homeWon ? 'font-black text-black' : 'font-bold text-neutral-500'}`}>
                            {g.home_score}
                          </span>
                        </div>
                      </div>

                      {/* Expanded Boxscore Summary */}
                      {isExpanded && (
                        <div className="border-t border-black bg-white p-2.5 text-[11px] font-mono space-y-2">
                          <div className="flex items-center justify-between border-b border-neutral-200 pb-1">
                            <span className="font-black uppercase text-[10px]">
                              Game #{g.game_id} Boxscore Summary ({g.away_name} @ {g.home_name})
                            </span>
                            <button
                              type="button"
                              onClick={() => setExpandedGameKey(null)}
                              className="text-[10px] font-bold underline hover:text-red-700 cursor-pointer"
                            >
                              [CLOSE ×]
                            </button>
                          </div>

                          {boxscoreDetails.loading ? (
                            <div className="py-2 text-center italic text-neutral-500">Loading game tape...</div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <div className="text-[9px] font-black uppercase text-neutral-500 mb-1">
                                  Scoring Summary ({boxscoreDetails.scoring.length} Goals)
                                </div>
                                {boxscoreDetails.scoring.length > 0 ? (
                                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                                    {boxscoreDetails.scoring.map((sc: any, idx: number) => (
                                      <div key={idx} className="text-[10px] leading-tight border-b border-neutral-100 pb-0.5">
                                        <span className="font-bold text-neutral-500">P{sc.period} {sc.time_formatted || ''}</span>{' '}
                                        <span className="font-black text-black">{sc.scorer}</span>
                                        {sc.assist1 && sc.assist1 !== '--' && (
                                          <span className="text-neutral-600"> ({sc.assist1}{sc.assist2 && sc.assist2 !== '--' ? `, ${sc.assist2}` : ''})</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-[10px] italic text-neutral-400">Detailed goal log unavailable.</div>
                                )}
                              </div>

                              <div>
                                <div className="text-[9px] font-black uppercase text-neutral-500 mb-1">
                                  Top Performers
                                </div>
                                {boxscoreDetails.topPlayers.length > 0 ? (
                                  <div className="space-y-1">
                                    {boxscoreDetails.topPlayers.map((tp: any, idx: number) => (
                                      <div key={idx} className="flex items-center justify-between text-[10px] border-b border-neutral-100 pb-0.5">
                                        <span className="font-bold truncate">{tp.name}</span>
                                        <span className="font-black shrink-0 ml-2">
                                          {tp.g}G {tp.a}A ({tp.pts}P)
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-[10px] italic text-neutral-400">Player stats summary unavailable.</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-xs italic text-neutral-500 border border-dashed border-neutral-300">
                No completed games recorded for {activeSeasonLabel} under this filter.
              </div>
            )}

            <div className="flex items-center justify-between mt-3 pt-2 border-t border-neutral-200 text-[10px] font-mono font-bold">
              <a href="/schedule" className="hover:underline text-blue-900">
                Full Season Schedule &amp; Boxscores →
              </a>
              <a href="/playoffs" className="hover:underline text-blue-900">
                Playoff Series Hub →
              </a>
            </div>
          </section>

          {/* SECTION 2: PLAYOFF SERIES TRACKER OR CHAMPIONSHIP RACE */}
          <section className="border-2 border-black bg-white/80 p-3.5 shadow-[3px_3px_0px_#000]">
            <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="bg-amber-400 text-black border border-black font-mono text-[10px] font-black px-1.5 py-0.5 uppercase tracking-wider">
                  POSTSEASON
                </span>
                <h2 className="font-black uppercase tracking-tight text-base sm:text-lg leading-none">
                  {playoffSeries.length > 0 ? `${activeSeasonLabel} Playoff Series Tracker` : `${activeSeasonLabel} Top Table & Cutline Watch`}
                </h2>
              </div>
              <a href="/playoffs" className="text-[10px] font-mono font-bold uppercase underline hover:text-blue-800">
                Full Bracket →
              </a>
            </div>

            {playoffSeries.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {playoffSeries.slice(0, 8).map((ser) => (
                  <a
                    key={ser.id}
                    href="/playoffs"
                    className="block border border-black bg-[#faf8f3] hover:bg-amber-50/50 p-2.5 transition-colors"
                  >
                    <div className="flex items-center justify-between text-[9px] font-mono uppercase mb-1.5 pb-1 border-b border-neutral-200">
                      <span className="font-bold text-neutral-600 truncate">{ser.matchLabel}</span>
                      <span className={`font-black px-1.5 py-0.2 ${
                        ser.isComplete
                          ? 'bg-black text-white'
                          : ser.leader
                          ? 'bg-amber-300 text-black border border-black'
                          : 'bg-neutral-200 text-neutral-700'
                      }`}>
                        {ser.statusPill}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {ser.homeSeed !== undefined && (
                            <span className="text-[9px] font-mono font-bold text-neutral-400 w-4">
                              #{ser.homeSeed}
                            </span>
                          )}
                          {ser.homeLogo && (
                            <img src={ser.homeLogo} alt={ser.homeAbbr} className="w-4 h-4 object-contain shrink-0" />
                          )}
                          <span className={`text-xs uppercase truncate ${ser.homeWins > ser.awayWins ? 'font-black' : 'font-semibold text-neutral-700'}`}>
                            {ser.homeName}
                          </span>
                        </div>
                        <span className="font-mono text-sm font-black">{ser.homeWins}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {ser.awaySeed !== undefined && (
                            <span className="text-[9px] font-mono font-bold text-neutral-400 w-4">
                              #{ser.awaySeed}
                            </span>
                          )}
                          {ser.awayLogo && (
                            <img src={ser.awayLogo} alt={ser.awayAbbr} className="w-4 h-4 object-contain shrink-0" />
                          )}
                          <span className={`text-xs uppercase truncate ${ser.awayWins > ser.homeWins ? 'font-black' : 'font-semibold text-neutral-700'}`}>
                            {ser.awayName}
                          </span>
                        </div>
                        <span className="font-mono text-sm font-black">{ser.awayWins}</span>
                      </div>
                    </div>

                    {ser.games.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2 pt-1.5 border-t border-neutral-200 font-mono text-[9px]">
                        {ser.games.map((gm) => (
                          <span key={gm.gameNumber} className="bg-white border border-neutral-300 px-1 py-0.2 text-neutral-700">
                            G{gm.gameNumber}: <strong>{gm.homeScore}-{gm.awayScore}</strong>{gm.isOT ? ' OT' : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </a>
                ))}
              </div>
            ) : standings.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="border border-neutral-300 bg-[#faf8f3] p-2.5">
                  <div className="text-[10px] font-mono font-black uppercase border-b border-black pb-1 mb-2">
                    ★ Top 4 Championship Contenders
                  </div>
                  <div className="space-y-1.5">
                    {standings.slice(0, 4).map((t: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-[10px] w-4">#{idx + 1}</span>
                          {t.league_teams?.logo_url && (
                            <img src={t.league_teams.logo_url} alt="" className="w-4 h-4 object-contain" />
                          )}
                          <span className="font-bold">{t.league_teams?.team_name || t.league_teams?.abbreviation}</span>
                        </div>
                        <span className="font-mono font-black text-xs">{t.pts} PTS</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-neutral-300 bg-[#faf8f3] p-2.5">
                  <div className="text-[10px] font-mono font-black uppercase border-b border-black pb-1 mb-2">
                    ⚔ Playoff Cutline Battle (Seeds 13–18)
                  </div>
                  <div className="space-y-1.5">
                    {standings.slice(12, 18).map((t: any, idx: number) => {
                      const seed = idx + 13;
                      return (
                        <div key={seed} className={`flex items-center justify-between text-xs ${seed === 16 ? 'border-b border-dashed border-red-700 pb-1' : ''}`}>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-[10px] w-5">#{seed}</span>
                            {t.league_teams?.logo_url && (
                              <img src={t.league_teams.logo_url} alt="" className="w-4 h-4 object-contain" />
                            )}
                            <span className="font-bold">{t.league_teams?.abbreviation}</span>
                          </div>
                          <span className="font-mono text-[11px] font-bold">
                            {t.gp}GP • {t.pts} PTS
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs italic text-neutral-500">No playoff bracket data available for this season.</p>
            )}
          </section>

          {/* SECTION 3: LEAGUE STATISTICAL LEADERS SPOTLIGHT */}
          <section className="border-2 border-black bg-white/80 p-3.5 shadow-[3px_3px_0px_#000]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black pb-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="bg-black text-white font-mono text-[10px] font-black px-1.5 py-0.5 uppercase tracking-wider">
                  LEADERS
                </span>
                <h2 className="font-black uppercase tracking-tight text-base sm:text-lg leading-none">
                  {activeSeasonLabel} Statistical Leaders
                </h2>
              </div>

              <div className="flex items-center gap-1 font-mono text-[10px]">
                <button
                  type="button"
                  onClick={() => setStatsPhase('REG')}
                  className={`px-2 py-0.5 font-bold uppercase border border-black cursor-pointer ${
                    statsPhase === 'REG' ? 'bg-black text-white' : 'bg-[#f4f1ea] text-black hover:bg-neutral-200'
                  }`}
                >
                  REG SEASON
                </button>
                {poStatLeaders.skaters.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setStatsPhase('PLAYOFFS')}
                    className={`px-2 py-0.5 font-bold uppercase border border-black cursor-pointer ${
                      statsPhase === 'PLAYOFFS' ? 'bg-amber-400 text-black font-black' : 'bg-[#f4f1ea] text-black hover:bg-neutral-200'
                    }`}
                  >
                    PLAYOFFS
                  </button>
                )}
              </div>
            </div>

            {/* Category Sub-Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-neutral-200">
              <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                {([
                  { id: 'PTS', label: 'POINTS' },
                  { id: 'G', label: 'GOALS' },
                  { id: 'A', label: 'ASSISTS' },
                  { id: 'W', label: 'GOALIE WINS' },
                  { id: 'GAA', label: 'GAA' },
                  { id: 'SV%', label: 'SV%' }
                ] as const).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setLeaderTab(tab.id)}
                    className={`px-2 py-0.5 font-bold uppercase border border-black transition-colors cursor-pointer ${
                      leaderTab === tab.id ? 'bg-black text-white' : 'bg-white text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <a href="/stats" className="text-[10px] font-mono font-bold underline hover:text-blue-800">
                Full Stats Hub →
              </a>
            </div>

            {activeLeaderList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-stretch">
                {/* #1 Leader Spotlight Card */}
                <div className="sm:col-span-5 border border-black bg-[#faf8f3] p-3 flex flex-col justify-between items-center text-center">
                  <div className="w-full flex items-center justify-between text-[9px] font-mono uppercase text-neutral-500 border-b border-neutral-200 pb-1 mb-2">
                    <span className="font-black text-black">#1 {leaderTab} LEADER</span>
                    <span>{activeLeaderList[0].gp} GP</span>
                  </div>

                  {activeLeaderList[0].logo_url ? (
                    <img
                      src={activeLeaderList[0].logo_url}
                      alt={activeLeaderList[0].team_abbr}
                      className="w-14 h-14 object-contain my-1"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-neutral-200 border border-black flex items-center justify-center font-mono font-black text-sm my-1">
                      {activeLeaderList[0].team_abbr || 'NHL'}
                    </div>
                  )}

                  <div className="mt-1">
                    <div className="font-black text-sm uppercase leading-tight text-black">
                      {activeLeaderList[0].player_name}
                    </div>
                    <div className="text-[10px] font-mono font-bold text-neutral-500 uppercase">
                      {activeLeaderList[0].team_name || activeLeaderList[0].team_abbr}
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-neutral-200 w-full">
                    <div className="text-3xl font-black font-mono leading-none text-black">
                      {formatLeaderValue(activeLeaderList[0])}
                    </div>
                    <div className="text-[9px] font-mono uppercase font-bold text-neutral-500 mt-0.5">
                      {leaderTab === 'PTS'
                        ? `${activeLeaderList[0].goals}G • ${activeLeaderList[0].assists}A`
                        : leaderTab === 'GAA' || leaderTab === 'SV%' || leaderTab === 'W'
                        ? `${activeLeaderList[0].wins}W • ${activeLeaderList[0].shutouts || 0} SO`
                        : `${activeLeaderList[0].points} TOTAL PTS`}
                    </div>
                  </div>
                </div>

                {/* Top 6 Table */}
                <div className="sm:col-span-7 flex flex-col justify-between border border-neutral-300 bg-white p-2.5">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-black text-[10px] font-mono uppercase text-neutral-500">
                        <th className="pb-1 text-left">RK</th>
                        <th className="pb-1 text-left">PLAYER</th>
                        <th className="pb-1 text-center">TM</th>
                        <th className="pb-1 text-center">GP</th>
                        <th className="pb-1 text-right">{leaderTab}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeLeaderList.map((p: any, idx: number) => (
                        <tr key={idx} className={`border-b border-neutral-100 ${idx === 0 ? 'bg-amber-50/70 font-bold' : ''}`}>
                          <td className="py-1.5 font-mono text-[11px] font-bold">{idx + 1}</td>
                          <td className="py-1.5 truncate max-w-[140px] font-bold text-neutral-900">
                            {p.player_name}
                          </td>
                          <td className="py-1.5 text-center">
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold">
                              {p.logo_url && (
                                <img src={p.logo_url} alt="" className="w-3.5 h-3.5 object-contain" />
                              )}
                              {p.team_abbr}
                            </span>
                          </td>
                          <td className="py-1.5 text-center font-mono text-[11px] text-neutral-500">{p.gp}</td>
                          <td className="py-1.5 text-right font-mono font-black text-sm">{formatLeaderValue(p)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs italic text-neutral-500">
                No player statistics recorded yet for {activeSeasonLabel}.
              </div>
            )}
          </section>

          {/* SECTION 4: COMPACT DISCORD GAZETTE HIGHLIGHTS & TAPE ROOM */}
          {briefing && (
            <section className="border-2 border-black bg-white/70 p-3.5 shadow-[3px_3px_0px_#000] space-y-3">
              <div className="flex items-center justify-between border-b-2 border-black pb-1.5">
                <div className="flex items-center gap-2">
                  <span className="bg-black text-white font-mono text-[10px] font-black px-1.5 py-0.5 uppercase">
                    LOCKER ROOM WIRE
                  </span>
                  <h2 className="font-black uppercase tracking-tight text-sm sm:text-base">
                    Daily Discord Gazette Highlights
                  </h2>
                </div>
                <span className="text-[9px] font-mono uppercase text-neutral-500">
                  {briefing.updated_at || 'LIVE WIRE'}
                </span>
              </div>

              {/* Compact Headline + Quote */}
              <div className="border-b border-neutral-300 pb-2.5">
                <h3 className="text-lg sm:text-xl font-black uppercase leading-tight tracking-tight">
                  {briefing.headline}
                </h3>
                {briefing.subheadline && (
                  <p className="text-xs italic text-neutral-700 mt-0.5">{briefing.subheadline}</p>
                )}
              </div>

              {briefing.quote_of_the_day && (
                <div className="bg-amber-50/80 border-l-4 border-black p-2.5">
                  <div className="text-[9px] font-mono font-black uppercase tracking-widest text-neutral-500">
                    ★ Quote of the Day
                  </div>
                  <blockquote className="text-xs sm:text-sm font-bold italic mt-0.5">
                    "{briefing.quote_of_the_day.quote}"
                  </blockquote>
                  <div className="text-[10px] text-right font-semibold text-neutral-700 mt-0.5">
                    — {briefing.quote_of_the_day.author}{' '}
                    <span className="font-normal italic text-neutral-500">({briefing.quote_of_the_day.context})</span>
                  </div>
                </div>
              )}

              {/* Tape Room Clips Strip */}
              {allTapeRoomClips.length > 0 && (
                <div className="p-2.5 bg-purple-50 border border-purple-300">
                  <div className="text-[10px] font-mono font-black uppercase text-purple-950 mb-1.5 flex items-center gap-1.5">
                    <span>📼</span> Tape Room Highlight Reels:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {allTapeRoomClips.map((clip, idx) => (
                      <a
                        key={idx}
                        href={clip.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-mono font-bold bg-purple-700 hover:bg-purple-900 text-white px-2 py-1 transition-colors flex items-center gap-1"
                      >
                        <span>▶</span> {clip.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Compact 2-Column Dispatches Grid */}
              {briefing.sections && briefing.sections.length > 0 && (
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {briefing.sections.map((sec: any, idx: number) => (
                      <div key={idx} className="border border-neutral-300 bg-[#faf8f3] p-2.5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[8px] font-mono font-black uppercase bg-black text-white px-1.5 py-0.5">
                              {sec.badge}
                            </span>
                            <span className="text-[9px] font-mono text-neutral-500">#{sec.channel}</span>
                          </div>
                          <h4 className="font-bold text-xs text-neutral-900 leading-snug mb-1">{sec.title}</h4>
                          <p className="text-[11px] text-neutral-700 leading-snug">{sec.commentary}</p>
                        </div>

                        {showAudioLogs && sec.messages && sec.messages.length > 0 && (
                          <div className="bg-neutral-100 border-t border-neutral-200 pt-1.5 mt-2 space-y-1 font-mono text-[10px] text-neutral-700 max-h-32 overflow-y-auto">
                            {sec.messages.map((m: any, mIdx: number) => (
                              <div key={mIdx} className="leading-tight">
                                <span className="text-neutral-400">[{m.time}]</span>{' '}
                                <span className="font-bold text-black">{m.author}:</span>{' '}
                                <span className="italic">{m.text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAudioLogs(!showAudioLogs)}
                    className="mt-2.5 w-full py-1 border border-black bg-[#f4f1ea] hover:bg-neutral-200 text-[10px] font-mono font-bold uppercase cursor-pointer"
                  >
                    {showAudioLogs ? '▲ Hide Raw Discord Audio Logs' : '▼ Expand Intercepted Discord Audio Logs'}
                  </button>
                </div>
              )}
            </section>
          )}
        </main>

        <aside className="col-span-12 md:col-span-3 border-l-0 md:border-l border-black pl-0 md:pl-4 pt-4 md:pt-0 border-t md:border-t-0">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-bold uppercase text-sm">STANDINGS</h2>
            <select
              className="text-[10px] border border-black p-1 bg-transparent font-bold cursor-pointer"
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(Number(e.target.value))}
            >
              {filteredSeasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* League Filter / Sort Buttons */}
          <div className="flex items-center gap-1 mb-3 overflow-x-auto no-scrollbar max-w-full pb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 mr-0.5 shrink-0">League:</span>
            {(['ALL', 'W', 'Q', 'O', 'V', 'G'] as const).map((league) => (
              <button
                key={league}
                type="button"
                onClick={() => handleLeagueChange(league)}
                className={`text-[10px] font-bold px-1.5 py-0.5 border border-black transition-colors shrink-0 ${
                  selectedLeague === league
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-neutral-200'
                }`}
              >
                {league}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[10px] border-collapse min-w-[240px]">
              <thead>
                <tr className="border-b border-black text-left">
                  <th className="pb-1 font-bold">RK</th>
                  <th className="pb-1 font-bold">TM</th>
                  <th className="pb-1 font-bold text-center">W-L-T-OTL</th>
                  <th className="pb-1 font-bold text-center">PTS</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s: any, index: number) => (
                  <tr key={index} className="border-b border-slate-200">
                    <td className="py-1 font-bold">{index + 1}</td>
                    <td className="py-1 font-bold flex items-center gap-1.5">
                      {s.league_teams?.logo_url && (
                        <img
                          src={s.league_teams.logo_url}
                          alt={s.league_teams.abbreviation}
                          className="w-4 h-4 object-contain shrink-0"
                        />
                      )}
                      <span>{s.league_teams?.abbreviation || 'N/A'}</span>

                      {s.is_champion && getTrophyUrl(selectedSeason) && (
                        <img
                          src={getTrophyUrl(selectedSeason)!}
                          alt="Championship Winner"
                          className="w-4 h-4 ml-1 object-contain shrink-0"
                          title="Championship Winner"
                        />
                      )}
                    </td>
                    <td className="py-1 text-center font-mono">
                      {(s.w ?? s.wins ?? 0)}-{(s.l ?? s.losses ?? 0)}-{(s.t ?? s.ties ?? 0)}-{(s.otl ?? s.otLosses ?? 0)}
                    </td>
                    <td className="py-1 font-bold text-center">{s.pts ?? 0}</td>
                  </tr>
                ))}
                {standings.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-3 text-center text-slate-500 italic">
                      No standings available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <a href="/standings" className="block mt-4 text-[9px] underline italic text-slate-600 hover:text-black">
            View full standings →
          </a>
        </aside>
      </div>
    </div>
  );
}
