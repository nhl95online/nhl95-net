"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
  ArrowLeftRight, Check, Copy, RotateCcw, AlertTriangle, ShieldCheck,
  Sparkles, Scale, History, Flame, Trophy, Clock, Calendar, UserCheck,
  Search, SlidersHorizontal, ArrowUpDown, Layers, Award, ChevronRight, X,
  TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowRight, ArrowLeft,
  CheckCircle2, Filter, BarChart3, RefreshCw, MessageSquare, Info, Shield, Users,
  Maximize2, Minimize2, List, Grid, Download, Globe, ChevronDown
} from 'lucide-react';

type TabView = 'simulator' | 'W' | 'O' | 'Q' | 'V' | 'ALL';

interface Team {
  team_id: number | string;
  team_name: string;
  abbreviation: string;
  logo_url: string;
  coach_name?: string;
  league_id?: number | string;
}

interface PlayerAsset {
  id: string | number;
  name: string;
  pos: string;
  ovr: number;
  source_year?: number | string;
  team_id: number | string;
}

interface PickAsset {
  id: string;
  round: string;
  year: number | string;
  value: number;
  team_id: number | string;
}

const PICK_WEIGHTS: Record<string, number> = {
  '1st': 100,
  '2nd': 50,
  '3rd': 30,
  '4th': 15,
  '5th': 8
};

// Current active leagues metadata configuration with exact official bucket logos
const CURRENT_LEAGUES_CONFIG = [
  {
    id: 'W',
    name: 'W League',
    currentSeasonName: 'W18 (2013)',
    seasonYear: 2013,
    ratingSourceYear: 2012, // Prior season ratings baseline
    seasonId: 38,
    prefix: 'W',
    futureDraftYears: [2014, 2015, 2016],
    draftRounds: ['1st', '2nd'],
    accentColor: 'emerald',
    badgeText: 'Active Season',
    logoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/WN95HL.png',
    fallbackLogoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/WN95HL.png'
  },
  {
    id: 'O',
    name: 'Original 6',
    currentSeasonName: 'O01 (1927)',
    seasonYear: 1927,
    ratingSourceYear: 1926, // Prior season ratings baseline
    seasonId: 'O01',
    prefix: 'O',
    futureDraftYears: [1928, 1929, 1930],
    draftRounds: ['1st', '2nd', '3rd'],
    accentColor: 'amber',
    badgeText: 'Classic Era',
    logoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/Original%206.png',
    fallbackLogoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Original%206.png'
  },
  {
    id: 'Q',
    name: 'The Q',
    currentSeasonName: 'Q19 (1998)',
    seasonYear: 1998,
    ratingSourceYear: 1997, // Prior season ratings baseline
    seasonId: 36,
    prefix: 'Q',
    futureDraftYears: [1999, 2000, 2001],
    draftRounds: ['1st', '2nd'],
    accentColor: 'blue',
    badgeText: '90s Classic',
    logoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/TheQ.png',
    fallbackLogoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/TheQ.png'
  },
  {
    id: 'V',
    name: 'Vintage',
    currentSeasonName: 'V01 (1917)',
    seasonYear: 1917,
    ratingSourceYear: 1916, // Prior season ratings baseline
    seasonId: 20,
    prefix: 'V',
    futureDraftYears: [1918, 1919, 1920],
    draftRounds: ['1st', '2nd'],
    accentColor: 'purple',
    badgeText: 'Pioneer Era',
    logoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/Vintage.png',
    fallbackLogoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Vintage.png'
  }
];

export default function TradesPage() {
  // Main Top-Level Tab State
  const [activeTab, setActiveTab] = useState<TabView>('simulator');

  // Simulator Specific League Scope State (Defaults to W League)
  const [simLeague, setSimLeague] = useState<'W' | 'O' | 'Q' | 'V'>('W');

  // Active Config for the selected league scope
  const activeSimConfig = useMemo(() => {
    return CURRENT_LEAGUES_CONFIG.find(c => c.id === simLeague) || CURRENT_LEAGUES_CONFIG[0];
  }, [simLeague]);

  // Filtered Teams in the Selected Simulator League
  const [leagueTeams, setLeagueTeams] = useState<Team[]>([]);
  const [loadingLeagueTeams, setLoadingLeagueTeams] = useState(true);

  // Selected Teams in Simulator
  const [teamAId, setTeamAId] = useState<string>('');
  const [teamBId, setTeamBId] = useState<string>('');
  const [teamARoster, setTeamARoster] = useState<PlayerAsset[]>([]);
  const [teamBRoster, setTeamBRoster] = useState<PlayerAsset[]>([]);
  const [teamAPicks, setTeamAPicks] = useState<PickAsset[]>([]);
  const [teamBPicks, setTeamBPicks] = useState<PickAsset[]>([]);

  // Roster Filter / Search per Workbench
  const [posFilterA, setPosFilterA] = useState<'ALL' | 'F' | 'D' | 'G'>('ALL');
  const [posFilterB, setPosFilterB] = useState<'ALL' | 'F' | 'D' | 'G'>('ALL');
  const [searchRosterA, setSearchRosterA] = useState('');
  const [searchRosterB, setSearchRosterB] = useState('');

  // Selected Assets in Simulator
  const [teamASendingPlayers, setTeamASendingPlayers] = useState<PlayerAsset[]>([]);
  const [teamASendingPicks, setTeamASendingPicks] = useState<PickAsset[]>([]);
  const [teamBSendingPlayers, setTeamBSendingPlayers] = useState<PlayerAsset[]>([]);
  const [teamBSendingPicks, setTeamBSendingPicks] = useState<PickAsset[]>([]);

  const [copied, setCopied] = useState(false);

  // Archive / History State
  const [seasons, setSeasons] = useState<any[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [selectedSeasonFilter, setSelectedSeasonFilter] = useState<string>('CURRENT');
  const [selectedFranchiseFilter, setSelectedFranchiseFilter] = useState<string>('ALL');
  const [ledgerSortOrder, setLedgerSortOrder] = useState<'NEWEST' | 'BIGGEST' | 'LOPSIDED'>('NEWEST');
  const [trades, setTrades] = useState<any[]>([]);
  const [allDrafts, setAllDrafts] = useState<any[]>([]);
  const [teamMetadata, setTeamMetadata] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loadingArchive, setLoadingArchive] = useState<boolean>(true);

  // Helper: extract OVR rating from ratings column in league_player_database
  const parsePlayerOvr = (ratings: any): number => {
    if (!ratings) return 75;
    try {
      const r = typeof ratings === 'string' ? JSON.parse(ratings) : ratings;
      const candidates = [
        r?.Ovr,
        r?.OVR,
        r?.OVERALL,
        r?.overall,
        r?.Overall,
        r?.ovr
      ];
      for (const numCandidate of candidates) {
        const num = Number(numCandidate);
        if (!isNaN(num) && num > 0) return num;
      }
      return 75;
    } catch {
      return 75;
    }
  };

  // Helper: extract source_year from player_info column in league_player_database
  const parseSourceYear = (player_info: any): number | null => {
    if (!player_info) return null;
    try {
      const info = typeof player_info === 'string' ? JSON.parse(player_info) : player_info;
      const y = Number(info?.source_year ?? info?.SourceYear ?? info?.year ?? info?.Year);
      return (!isNaN(y) && y > 0) ? y : null;
    } catch {
      return null;
    }
  };

  // 1. Initial Load for Seasons, Global Metadata, Historical Trades & Drafts
  useEffect(() => {
    async function initGlobalData() {
      setLoadingArchive(true);
      try {
        const [seasonRes, teamsRes, tradesRes, draftsRes] = await Promise.all([
          supabase.from('league_seasons').select('*').order('league_id', { ascending: false }),
          supabase.from('league_teams').select('team_id, team_name, abbreviation, logo_url, league_id, league_coaches(coach_name)'),
          supabase.from('league_trades').select('*').order('trade id', { ascending: false }),
          supabase.from('league_drafts').select(`
            round, pick_number, year, transaction_type, league_id,
            league_player_database (player_id, player_name, pos, ratings, player_info),
            league_teams (team_id, team_name, abbreviation, logo_url)
          `)
        ]);

        const loadedSeasons = seasonRes.data || [];
        setSeasons(loadedSeasons);

        const loadedTeams = (teamsRes.data || []).map((t: any) => ({
          team_id: t.team_id,
          team_name: t.team_name,
          abbreviation: t.abbreviation,
          logo_url: t.logo_url,
          coach_name: t.league_coaches?.coach_name,
          league_id: t.league_id
        }));
        setAllTeams(loadedTeams);

        // Metadata Map for Historical Archive display
        const tMap: Record<string, any> = {};
        loadedTeams.forEach((t: any) => {
          const abbr = String(t.abbreviation || '').trim().toUpperCase();
          tMap[abbr] = { name: t.team_name, abbr: t.abbreviation, logo: t.logo_url, coach: t.coach_name };
        });
        setTeamMetadata(tMap);

        setTrades(tradesRes.data || []);
        setAllDrafts(draftsRes.data || []);
      } catch (err) {
        console.error("Global Init Error:", err);
      } finally {
        setLoadingArchive(false);
      }
    }
    initGlobalData();
  }, []);

  // 2. Draft Pick Generator: strictly future seasons ONLY (Current season draft is finished!)
  const generateLeagueDraftPicks = (tId: string, leagueType: 'W' | 'O' | 'Q' | 'V'): PickAsset[] => {
    const config = CURRENT_LEAGUES_CONFIG.find(c => c.id === leagueType);
    const futureYears = config?.futureDraftYears || [2014, 2015, 2016];
    const rounds = config?.draftRounds || ['1st', '2nd'];

    const generated: PickAsset[] = [];
    futureYears.forEach((yr) => {
      rounds.forEach((rd) => {
        generated.push({
          id: `${tId}-pick-${yr}-${rd}`,
          round: rd,
          year: yr,
          value: PICK_WEIGHTS[rd] || 50,
          team_id: tId
        });
      });
    });

    return generated;
  };

  // 3. Fetch ONLY teams actively playing in the selected simulator league/season
  useEffect(() => {
    async function loadTeamsForSelectedLeague() {
      setLoadingLeagueTeams(true);
      const matchedConfig = CURRENT_LEAGUES_CONFIG.find(c => c.id === simLeague);
      const targetSeasonId = matchedConfig?.seasonId;

      try {
        let teamsList: Team[] = [];

        // Special handling for Original 6 (O01) if not loaded in DB yet: Fallback to classic O6 franchises
        if (simLeague === 'O') {
          const { data: allTeamsData } = await supabase
            .from('league_teams')
            .select('team_id, team_name, abbreviation, logo_url, league_id, league_coaches(coach_name)');

          const originalSixNames = ['Bruins', 'Blackhawks', 'Black Hawks', 'Red Wings', 'Canadiens', 'Rangers', 'Maple Leafs'];
          const o6Teams = (allTeamsData || []).filter((t: any) => {
            const name = (t.team_name || '').toUpperCase();
            return originalSixNames.some(o6 => name.includes(o6.toUpperCase())) || name.startsWith('O ') || t.league_id === 1;
          });

          if (o6Teams.length > 0) {
            const seen = new Set<string>();
            o6Teams.forEach((t: any) => {
              const baseName = t.team_name.split(' ').pop();
              if (!seen.has(baseName)) {
                seen.add(baseName);
                teamsList.push({
                  team_id: String(t.team_id),
                  team_name: t.team_name,
                  abbreviation: t.abbreviation || 'O6',
                  logo_url: t.logo_url || '',
                  coach_name: t.league_coaches?.coach_name || 'Front Office',
                  league_id: 'O01'
                });
              }
            });
          }
        } else {
          // Standard query for W, Q, V from league_standings
          if (targetSeasonId !== undefined && typeof targetSeasonId === 'number') {
            const { data: standingsData } = await supabase
              .from('league_standings')
              .select(`
                team_id,
                season_id,
                league_teams (
                  team_id,
                  team_name,
                  abbreviation,
                  logo_url,
                  league_id,
                  league_coaches (coach_name)
                )
              `)
              .eq('season_id', targetSeasonId);

            if (standingsData && standingsData.length > 0) {
              const seen = new Set<string>();
              standingsData.forEach((row: any) => {
                const t = row.league_teams;
                if (t && !seen.has(String(t.team_id))) {
                  seen.add(String(t.team_id));
                  teamsList.push({
                    team_id: String(t.team_id),
                    team_name: t.team_name || `Team ${t.team_id}`,
                    abbreviation: t.abbreviation || `TM${t.team_id}`,
                    logo_url: t.logo_url || '',
                    coach_name: t.league_coaches?.coach_name || 'Front Office',
                    league_id: targetSeasonId
                  });
                }
              });
            }
          }

          // Fallback if standings empty for that season
          if (teamsList.length === 0) {
            let teamQuery = supabase
              .from('league_teams')
              .select('team_id, team_name, abbreviation, logo_url, league_id, league_coaches(coach_name)');

            if (typeof targetSeasonId === 'number') {
              teamQuery = teamQuery.eq('league_id', targetSeasonId);
            }

            const { data: directTeams } = await teamQuery;
            if (directTeams && directTeams.length > 0) {
              teamsList = directTeams.map((t: any) => ({
                team_id: String(t.team_id),
                team_name: t.team_name || `Team ${t.team_id}`,
                abbreviation: t.abbreviation || `TM${t.team_id}`,
                logo_url: t.logo_url || '',
                coach_name: t.league_coaches?.coach_name || 'Front Office',
                league_id: t.league_id
              }));
            }
          }
        }

        // Sort alphabetically
        teamsList.sort((a, b) => a.team_name.localeCompare(b.team_name));
        setLeagueTeams(teamsList);

        // Assign default Team A and Team B from the filtered league teams
        if (teamsList.length >= 2) {
          setTeamAId(String(teamsList[0].team_id));
          setTeamBId(String(teamsList[1].team_id));
        } else if (teamsList.length === 1) {
          setTeamAId(String(teamsList[0].team_id));
          setTeamBId('');
        } else {
          setTeamAId('');
          setTeamBId('');
        }

        handleResetTrade();
      } catch (err) {
        console.error("Error loading league teams:", err);
      } finally {
        setLoadingLeagueTeams(false);
      }
    }

    loadTeamsForSelectedLeague();
  }, [simLeague]);

  // 4. Targeted Real-Time Roster & OVR Resolution for Selected Teams (Prior Season Baseline)
  useEffect(() => {
    async function loadTeamRosterWithDatabaseOvr(
      tId: string,
      setRoster: (p: PlayerAsset[]) => void,
      setPicks: (pk: PickAsset[]) => void
    ) {
      if (!tId) {
        setRoster([]);
        setPicks([]);
        return;
      }

      // Generate strictly the 3 future seasons of draft picks based on league rules
      const picks = generateLeagueDraftPicks(tId, simLeague);
      setPicks(picks);

      const matchedConfig = CURRENT_LEAGUES_CONFIG.find(c => c.id === simLeague);
      // Prior season ratings baseline (e.g. 2012 for 2013 season, 1926 for 1927, 1997 for 1998, 1916 for 1917)
      const targetPriorRatingYear = matchedConfig?.ratingSourceYear || 2012;
      const targetSeasonYear = matchedConfig?.seasonYear || 2013;
      const matchedTeam = leagueTeams.find(t => String(t.team_id) === String(tId));
      const teamName = matchedTeam?.team_name || '';
      const abbr = matchedTeam?.abbreviation || '';

      try {
        // STEP 1: Query league_rosters to see who is on this team's roster
        let rosterQuery = supabase
          .from('league_rosters')
          .select('*')
          .eq('team_id', Number(tId));

        if (typeof matchedConfig?.seasonId === 'number') {
          rosterQuery = rosterQuery.eq('league_id', matchedConfig.seasonId);
        }

        let { data: rosterRows } = await rosterQuery;

        if (!rosterRows || rosterRows.length === 0) {
          const { data: generalRoster } = await supabase
            .from('league_rosters')
            .select('*')
            .eq('team_id', Number(tId));
          if (generalRoster && generalRoster.length > 0) {
            rosterRows = generalRoster;
          }
        }

        // If roster rows exist, do a targeted query into league_player_database for these players
        if (rosterRows && rosterRows.length > 0) {
          const playerNames = rosterRows
            .map((r: any) => String(r.player_name || '').trim())
            .filter(Boolean);

          // Real-time query to league_player_database for these exact players
          const { data: dbPlayers } = await supabase
            .from('league_player_database')
            .select('*')
            .in('player_name', playerNames);

          const finalRoster: PlayerAsset[] = rosterRows.map((r: any) => {
            const pName = String(r.player_name || '').trim();
            const pNameLower = pName.toLowerCase();

            // Find matching entries in league_player_database
            const matches = (dbPlayers || []).filter(
              (p: any) => String(p.player_name || '').trim().toLowerCase() === pNameLower
            );

            // PRIORITY 1: Exact match for the prior season year (e.g. 2012 for 2013, 1926 for 1927, etc.)
            let matchedDbEntry = matches.find((p: any) => parseSourceYear(p.player_info) === targetPriorRatingYear);

            // PRIORITY 2: Match for current season year if prior year isn't present
            if (!matchedDbEntry) {
              matchedDbEntry = matches.find((p: any) => parseSourceYear(p.player_info) === targetSeasonYear);
            }

            // PRIORITY 3: Match closest available prior season
            if (!matchedDbEntry && matches.length > 0) {
              const sortedByYear = [...matches].sort((a, b) => {
                const yA = parseSourceYear(a.player_info) || 0;
                const yB = parseSourceYear(b.player_info) || 0;
                return Math.abs(yA - targetPriorRatingYear) - Math.abs(yB - targetPriorRatingYear);
              });
              matchedDbEntry = sortedByYear[0];
            }

            let ovr = 75;
            let srcYr: number | string | undefined = targetPriorRatingYear;

            if (matchedDbEntry) {
              ovr = parsePlayerOvr(matchedDbEntry.ratings);
              srcYr = parseSourceYear(matchedDbEntry.player_info) || targetPriorRatingYear;
            } else if (Number(r.overall) > 0) {
              ovr = Number(r.overall);
            }

            return {
              id: r.roster_id || r.player_id || pName,
              name: pName,
              pos: r.pos || matchedDbEntry?.pos || 'F',
              ovr: ovr,
              source_year: srcYr,
              team_id: tId
            };
          });

          finalRoster.sort((a, b) => b.ovr - a.ovr);
          setRoster(finalRoster);
        } else {
          // Fallback: If league_rosters has no rows for this team, query league_player_database by team franchise keyword
          const franchiseKeyword = teamName.split(' ').pop() || abbr;

          const { data: fallbackPlayers } = await supabase
            .from('league_player_database')
            .select('player_id, player_name, pos, team_default, player_info, ratings')
            .or(`team_default.ilike.%${franchiseKeyword}%,team_default.ilike.%${abbr}%`)
            .limit(30);

          if (fallbackPlayers && fallbackPlayers.length > 0) {
            const fallbackList: PlayerAsset[] = fallbackPlayers.map((p: any) => {
              const pName = String(p.player_name || '').trim();
              const srcYr = parseSourceYear(p.player_info) || targetPriorRatingYear;
              const ovr = parsePlayerOvr(p.ratings);

              return {
                id: p.player_id || pName,
                name: pName,
                pos: p.pos || 'F',
                ovr: ovr,
                source_year: srcYr,
                team_id: tId
              };
            });

            fallbackList.sort((a, b) => b.ovr - a.ovr);
            setRoster(fallbackList);
          } else {
            setRoster([]);
          }
        }
      } catch (err) {
        console.error("Error loading roster with OVR:", err);
      }
    }

    if (teamAId) {
      loadTeamRosterWithDatabaseOvr(teamAId, setTeamARoster, setTeamAPicks);
      setTeamASendingPlayers([]);
      setTeamASendingPicks([]);
    }
    if (teamBId) {
      loadTeamRosterWithDatabaseOvr(teamBId, setTeamBRoster, setTeamBPicks);
      setTeamBSendingPlayers([]);
      setTeamBSendingPicks([]);
    }
  }, [teamAId, teamBId, simLeague, leagueTeams]);

  // Simulator Calculations
  const teamA = leagueTeams.find(t => String(t.team_id) === String(teamAId));
  const teamB = leagueTeams.find(t => String(t.team_id) === String(teamBId));

  const teamAPlayersVal = teamASendingPlayers.reduce((sum, p) => sum + p.ovr, 0);
  const teamAPicksVal = teamASendingPicks.reduce((sum, p) => sum + p.value, 0);
  const teamATotalVal = teamAPlayersVal + teamAPicksVal;

  const teamBPlayersVal = teamBSendingPlayers.reduce((sum, p) => sum + p.ovr, 0);
  const teamBPicksVal = teamBSendingPicks.reduce((sum, p) => sum + p.value, 0);
  const teamBTotalVal = teamBPlayersVal + teamBPicksVal;

  const valDifference = Math.abs(teamATotalVal - teamBTotalVal);
  const maxVal = Math.max(teamATotalVal, teamBTotalVal, 1);
  const marginPercent = Math.round((valDifference / maxVal) * 100);

  // Verdict calculation
  let verdictBadge = { text: 'AWAITING ASSETS', color: 'bg-neutral-100 text-black border-black', icon: Scale };
  if (teamATotalVal > 0 || teamBTotalVal > 0) {
    if (valDifference <= 15) {
      verdictBadge = { text: 'FAIR & BALANCED DEAL', color: 'bg-emerald-100 text-emerald-950 border-emerald-700', icon: ShieldCheck };
    } else if (valDifference <= 35) {
      const leader = teamATotalVal > teamBTotalVal ? teamA?.abbreviation : teamB?.abbreviation;
      verdictBadge = { text: `SLIGHT EDGE TO ${leader}`, color: 'bg-amber-100 text-amber-950 border-amber-600', icon: Sparkles };
    } else if (valDifference <= 65) {
      const leader = teamATotalVal > teamBTotalVal ? teamA?.abbreviation : teamB?.abbreviation;
      verdictBadge = { text: `HEAVILY FAVORS ${leader}`, color: 'bg-orange-100 text-orange-950 border-orange-600', icon: AlertTriangle };
    } else {
      verdictBadge = { text: 'UNBALANCED / VETO RISK', color: 'bg-red-100 text-red-950 border-red-700', icon: AlertTriangle };
    }
  }

  // Toggle Selection Helpers
  const togglePlayerA = (p: PlayerAsset) => {
    setTeamASendingPlayers(prev =>
      prev.some(item => item.id === p.id) ? prev.filter(item => item.id !== p.id) : [...prev, p]
    );
  };
  const togglePickA = (pick: PickAsset) => {
    setTeamASendingPicks(prev =>
      prev.some(item => item.id === pick.id) ? prev.filter(item => item.id !== pick.id) : [...prev, pick]
    );
  };
  const togglePlayerB = (p: PlayerAsset) => {
    setTeamBSendingPlayers(prev =>
      prev.some(item => item.id === p.id) ? prev.filter(item => item.id !== p.id) : [...prev, p]
    );
  };
  const togglePickB = (pick: PickAsset) => {
    setTeamBSendingPicks(prev =>
      prev.some(item => item.id === pick.id) ? prev.filter(item => item.id !== pick.id) : [...prev, pick]
    );
  };
  const handleResetTrade = () => {
    setTeamASendingPlayers([]);
    setTeamASendingPicks([]);
    setTeamBSendingPlayers([]);
    setTeamBSendingPicks([]);
  };

  const copyTradeForDiscord = () => {
    const activeLeagueName = activeSimConfig.currentSeasonName;
    const aPlayerList = teamASendingPlayers.map(p => `• ${p.name}${p.source_year ? ` ('${String(p.source_year).slice(-2)})` : ''} (${p.pos}, OVR: ${p.ovr})`).join('\n') || '• No players';
    const aPickList = teamASendingPicks.map(pk => `• ${pk.year} ${pk.round} Round Pick (${pk.value} pts)`).join('\n') || '• No draft picks';
    const bPlayerList = teamBSendingPlayers.map(p => `• ${p.name}${p.source_year ? ` ('${String(p.source_year).slice(-2)})` : ''} (${p.pos}, OVR: ${p.ovr})`).join('\n') || '• No players';
    const bPickList = teamBSendingPicks.map(pk => `• ${pk.year} ${pk.round} Round Pick (${pk.value} pts)`).join('\n') || '• No draft picks';

    const text = `🏒 **NHL95 TRADE PROPOSAL [${activeLeagueName}]** 🏒\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📤 **${teamA?.team_name || 'Team A'} Sends:**\n${aPlayerList}\n${aPickList}\n📊 *Package Value: ${teamATotalVal} pts*\n\n📥 **${teamB?.team_name || 'Team B'} Sends:**\n${bPlayerList}\n${bPickList}\n📊 *Package Value: ${teamBTotalVal} pts*\n\n⚖️ **Trade Verdict:** ${verdictBadge.text} (Margin: ${valDifference} pts)\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Helper to parse individual asset items (players vs draft picks) and resolve drafted players
  const parseDetailedAssets = (assetsString: string, teamAbbr?: string, draftsList: any[] = allDrafts) => {
    if (!assetsString || assetsString === '-' || assetsString === 'NULL') return { items: [], totalValue: 0 };
    const rawList = assetsString.split(/[,;\n]+/).map(i => i.trim()).filter(Boolean);
    let total = 0;

    const items = rawList.map((item) => {
      const lower = item.toLowerCase();
      const isPick = lower.includes('1st') || lower.includes('2nd') || lower.includes('3rd') || lower.includes('4th') || lower.includes('5th') || lower.includes('rdpk') || lower.includes('round') || lower.includes('pick');

      let itemVal = 75;
      let pickRound = 'Draft Pick';
      let pickYear = '';
      let pickNum: number | undefined = undefined;
      let rdNum = 1;
      let draftedPlayer: {
        name: string;
        pos?: string;
        ovr?: number;
        pickNumber?: number;
        round?: number;
        teamAbbr?: string;
        wasPassed?: boolean;
      } | null = null;
      let isDraftOccurred = false;

      if (isPick) {
        if (lower.includes('1st')) { pickRound = '1st Round'; rdNum = 1; itemVal = PICK_WEIGHTS['1st'] || 100; }
        else if (lower.includes('2nd')) { pickRound = '2nd Round'; rdNum = 2; itemVal = PICK_WEIGHTS['2nd'] || 50; }
        else if (lower.includes('3rd')) { pickRound = '3rd Round'; rdNum = 3; itemVal = PICK_WEIGHTS['3rd'] || 30; }
        else if (lower.includes('4th')) { pickRound = '4th Round'; rdNum = 4; itemVal = PICK_WEIGHTS['4th'] || 15; }
        else if (lower.includes('5th')) { pickRound = '5th Round'; rdNum = 5; itemVal = PICK_WEIGHTS['5th'] || 8; }

        const yearMatch = item.match(/\b(19\d\d|20\d\d)\b/);
        if (yearMatch) pickYear = yearMatch[1];
        const numYear = pickYear ? parseInt(pickYear, 10) : 0;

        // Check for parenthetical notes like (26), (42), (1-1 F Vincent Lecavalier), (2-62 PASS), etc.
        const parenMatch = item.match(/\(([^)]+)\)/);
        const insideParen = parenMatch ? parenMatch[1].trim() : '';

        if (insideParen) {
          if (insideParen.toUpperCase().includes('PASS')) {
            const numM = insideParen.match(/(\d+)-(\d+)|#?(\d+)/);
            if (numM) pickNum = parseInt(numM[2] || numM[3] || numM[1], 10);
            draftedPlayer = {
              name: 'PASS',
              wasPassed: true,
              pickNumber: pickNum,
              round: rdNum
            };
            isDraftOccurred = true;
          } else {
            // Check if it's purely a pick number like (26) or (42) or (#8)
            const numOnly = insideParen.match(/^#?(\d+)$/);
            if (numOnly) {
              pickNum = parseInt(numOnly[1], 10);
            } else {
              const rdPkM = insideParen.match(/(\d+)-(\d+)/);
              if (rdPkM) {
                rdNum = parseInt(rdPkM[1], 10);
                pickNum = parseInt(rdPkM[2], 10);
              } else {
                const hashM = insideParen.match(/#(\d+)/);
                if (hashM) pickNum = parseInt(hashM[1], 10);
              }

              // Check if player name is explicitly embedded
              const pPattern = /(?:(?:from[A-Za-z0-9]+\s+)?(?:\d+-\d+|\#\d+)\s+)?([FfDdGg]\s+)?([A-Za-z\s.'-]+)/;
              const pM = insideParen.match(pPattern);
              if (pM) {
                const embeddedPos = pM[1] ? pM[1].trim().toUpperCase() : undefined;
                const embeddedName = pM[2] ? pM[2].trim() : '';
                if (embeddedName && !/^\d+$/.test(embeddedName) && embeddedName.length > 2 && !embeddedName.toUpperCase().startsWith('FROM')) {
                  const matchingDraft = (draftsList || []).find((d: any) =>
                    (numYear ? d.year === numYear : true) &&
                    d.league_player_database?.player_name?.toLowerCase().includes(embeddedName.toLowerCase())
                  );
                  const ovr = matchingDraft ? parsePlayerOvr(matchingDraft.league_player_database?.ratings) : undefined;
                  draftedPlayer = {
                    name: embeddedName,
                    pos: embeddedPos || matchingDraft?.league_player_database?.pos || 'F',
                    ovr: ovr || undefined,
                    pickNumber: pickNum || matchingDraft?.pick_number,
                    round: rdNum || matchingDraft?.round,
                    teamAbbr
                  };
                  isDraftOccurred = true;
                }
              }
            }
          }
        }

        // If not already resolved from embedded text, cross-reference draftsList
        if (!draftedPlayer && numYear > 0 && draftsList && draftsList.length > 0) {
          let matchedDraft: any = null;

          // A. Try matching by exact Year and Pick Number (e.g. 2012 1st RdPk (26) -> Year 2012, Pick 26)
          if (pickNum !== undefined) {
            matchedDraft = draftsList.find((d: any) => d.year === numYear && Number(d.pick_number) === pickNum);
          }

          // B. Try matching by Year + Round + Team Abbreviation
          if (!matchedDraft && teamAbbr) {
            const cleanTeam = teamAbbr.trim().toUpperCase();
            matchedDraft = draftsList.find((d: any) =>
              d.year === numYear &&
              Number(d.round) === rdNum &&
              (
                String(d.league_teams?.abbreviation || '').toUpperCase() === cleanTeam ||
                String(d.transaction_type || '').toUpperCase().includes(cleanTeam)
              )
            );
          }

          if (matchedDraft && matchedDraft.league_player_database?.player_name) {
            const p = matchedDraft.league_player_database;
            const pName = p.player_name;
            if (pName && pName !== 'N/A' && pName !== '-') {
              draftedPlayer = {
                name: pName,
                pos: p.pos || 'F',
                ovr: parsePlayerOvr(p.ratings) || undefined,
                pickNumber: Number(matchedDraft.pick_number) || pickNum,
                round: Number(matchedDraft.round) || rdNum,
                teamAbbr: matchedDraft.league_teams?.abbreviation || teamAbbr
              };
              isDraftOccurred = true;
            }
          }
        }

        if (numYear > 0 && numYear <= 2013) {
          isDraftOccurred = true;
        }
      } else {
        itemVal = 75;
      }

      total += itemVal;

      return {
        raw: item,
        isPick,
        pickRound: pickRound || 'Draft Pick',
        pickYear,
        pickNumber: pickNum || draftedPlayer?.pickNumber,
        draftedPlayer,
        isDraftOccurred,
        value: itemVal
      };
    });

    return { items, totalValue: total };
  };

  // Comprehensive Outcome & Grade Evaluator for Past Trades
  const evaluateTradeOutcome = (trade: any) => {
    const sentByT1 = parseDetailedAssets(trade.trade, trade.team, allDrafts);
    const sentByT2 = parseDetailedAssets(trade.trade_1, trade.team_1, allDrafts);

    const receivedByT1 = sentByT2; // Value T1 gained
    const receivedByT2 = sentByT1; // Value T2 gained

    const netImpactT1 = receivedByT1.totalValue - sentByT1.totalValue;
    const netImpactT2 = receivedByT2.totalValue - sentByT2.totalValue;

    const totalVolume = receivedByT1.totalValue + receivedByT2.totalValue;
    const t1Share = totalVolume > 0 ? Math.round((receivedByT1.totalValue / totalVolume) * 100) : 50;
    const t2Share = totalVolume > 0 ? 100 - t1Share : 50;

    let verdict = {
      label: 'EVEN EXCHANGE',
      color: 'bg-neutral-100 text-black border-black',
      icon: Scale,
      winner: 'DRAW',
      summary: 'Balanced swap with equal strategic value.'
    };

    let gradeT1 = 'A';
    let gradeT2 = 'A';

    if (netImpactT1 >= 30) {
      verdict = {
        label: `${trade.team} CLEAR WINNER`,
        color: 'bg-emerald-100 text-emerald-950 border-emerald-700',
        icon: TrendingUp,
        winner: trade.team,
        summary: `${trade.team} secured a +${netImpactT1} pts surplus.`
      };
      gradeT1 = 'A+';
      gradeT2 = 'C';
    } else if (netImpactT1 >= 15) {
      verdict = {
        label: `${trade.team} SLIGHT EDGE`,
        color: 'bg-amber-100 text-amber-950 border-amber-600',
        icon: Sparkles,
        winner: trade.team,
        summary: `${trade.team} gained favorable point differential (+${netImpactT1} pts).`
      };
      gradeT1 = 'A-';
      gradeT2 = 'B';
    } else if (netImpactT2 >= 30) {
      verdict = {
        label: `${trade.team_1} CLEAR WINNER`,
        color: 'bg-blue-100 text-blue-950 border-blue-700',
        icon: TrendingUp,
        winner: trade.team_1,
        summary: `${trade.team_1} dominated the exchange (+${netImpactT2} pts).`
      };
      gradeT1 = 'C';
      gradeT2 = 'A+';
    } else if (netImpactT2 >= 15) {
      verdict = {
        label: `${trade.team_1} SLIGHT EDGE`,
        color: 'bg-amber-100 text-amber-950 border-amber-600',
        icon: Sparkles,
        winner: trade.team_1,
        summary: `${trade.team_1} secured favorable value (+${netImpactT2} pts).`
      };
      gradeT1 = 'B';
      gradeT2 = 'A-';
    }

    return {
      sentByT1,
      sentByT2,
      receivedByT1,
      receivedByT2,
      netImpactT1,
      netImpactT2,
      t1Share,
      t2Share,
      verdict,
      gradeT1,
      gradeT2
    };
  };

  // Filter Historical Trades for Active League Tab
  const filteredLeagueTrades = useMemo(() => {
    let result = trades.filter((t) => {
      const lg = String(t.lg || '').toUpperCase();

      // League Tab Filtering
      if (activeTab === 'W' && !lg.startsWith('W')) return false;
      if (activeTab === 'O' && !lg.startsWith('O')) return false;
      if (activeTab === 'Q' && !lg.startsWith('Q')) return false;
      if (activeTab === 'V' && !lg.startsWith('V')) return false;

      // Current Season Only Filter vs All Seasons in this league
      if (selectedSeasonFilter === 'CURRENT') {
        if (activeTab === 'W' && t.lg !== 'W18' && t.lg !== 'W17') return false;
        if (activeTab === 'O' && t.lg !== 'O01') return false;
        if (activeTab === 'Q' && t.lg !== 'Q19') return false;
        if (activeTab === 'V' && t.lg !== 'V01') return false;
      } else if (selectedSeasonFilter !== 'ALL') {
        if (t.lg !== selectedSeasonFilter) return false;
      }

      // Franchise specific filter
      if (selectedFranchiseFilter !== 'ALL') {
        const teamMatch = String(t.team || '').toUpperCase() === selectedFranchiseFilter.toUpperCase() ||
          String(t.team_1 || '').toUpperCase() === selectedFranchiseFilter.toUpperCase();
        if (!teamMatch) return false;
      }

      // Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return [t.team, t.team_1, t.trade, t.trade_1, t.lg].some(v => String(v || '').toLowerCase().includes(q));
      }

      return true;
    });

    // Sort order
    if (ledgerSortOrder === 'BIGGEST') {
      result.sort((a, b) => {
        const vA = parseDetailedAssets(a.trade).totalValue + parseDetailedAssets(a.trade_1).totalValue;
        const vB = parseDetailedAssets(b.trade).totalValue + parseDetailedAssets(b.trade_1).totalValue;
        return vB - vA;
      });
    } else if (ledgerSortOrder === 'LOPSIDED') {
      result.sort((a, b) => {
        const diffA = Math.abs(parseDetailedAssets(a.trade).totalValue - parseDetailedAssets(a.trade_1).totalValue);
        const diffB = Math.abs(parseDetailedAssets(b.trade).totalValue - parseDetailedAssets(b.trade_1).totalValue);
        return diffB - diffA;
      });
    }

    return result;
  }, [trades, allDrafts, activeTab, selectedSeasonFilter, selectedFranchiseFilter, searchQuery, ledgerSortOrder]);

  // Helper to group picks by future season year for display
  const groupPicksByYear = (picks: PickAsset[]) => {
    const groups: Record<string, PickAsset[]> = {};
    picks.forEach(p => {
      const y = String(p.year);
      if (!groups[y]) groups[y] = [];
      groups[y].push(p);
    });
    return groups;
  };

  // Filter Roster by Search + Position helper
  const filterRosterList = (roster: PlayerAsset[], search: string, pos: string) => {
    return roster.filter(p => {
      const matchesPos = pos === 'ALL' || p.pos.toUpperCase().startsWith(pos.toUpperCase());
      const matchesSearch = !search.trim() || p.name.toLowerCase().includes(search.toLowerCase());
      return matchesPos && matchesSearch;
    });
  };

  // Rating color helper
  const getOvrColor = (ovr: number) => {
    if (ovr >= 90) return 'bg-emerald-600 text-white font-black';
    if (ovr >= 84) return 'bg-emerald-100 text-emerald-950 font-bold border border-emerald-400';
    if (ovr >= 76) return 'bg-blue-100 text-blue-950 font-bold border border-blue-300';
    return 'bg-neutral-100 text-neutral-800 border border-neutral-300';
  };

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-black font-serif overflow-x-hidden pb-12">
      <div className="max-w-[1400px] mx-auto px-2 sm:px-4 py-3 sm:py-6">

        {/* 1. OFFICIAL SITE HEADER (STANDINGS / RECORDS STYLE) */}
        <div className="border-b-4 border-black pt-2 pb-4 text-center relative">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight">Trade Machine</h1>
          <p className="text-xs sm:text-sm uppercase tracking-widest mt-1 italic">The Official Record of NHL95 Athletics</p>
        </div>

        {/* 2. CONTEXT / MODE NAVIGATION BAR */}
        <div className="border-y border-black p-2 flex flex-col lg:flex-row items-stretch lg:items-center justify-between mt-3 mb-4 gap-3 bg-[#f4f1ea]">
          {/* Left: Tab Switchers */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar max-w-full pb-1">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`px-3 sm:px-4 py-1.5 font-bold uppercase text-xs transition border border-black flex items-center gap-1.5 cursor-pointer shrink-0 ${activeTab === 'simulator'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-neutral-100'
                }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Simulator</span>
            </button>

            <button
              onClick={() => { setActiveTab('W'); setSelectedSeasonFilter('CURRENT'); setSelectedFranchiseFilter('ALL'); }}
              className={`px-3.5 py-1.5 font-bold uppercase text-xs transition border border-black cursor-pointer ${activeTab === 'W'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-neutral-100'
                }`}
            >
              W League
            </button>

            <button
              onClick={() => { setActiveTab('O'); setSelectedSeasonFilter('CURRENT'); setSelectedFranchiseFilter('ALL'); }}
              className={`px-3.5 py-1.5 font-bold uppercase text-xs transition border border-black cursor-pointer ${activeTab === 'O'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-neutral-100'
                }`}
            >
              Original 6
            </button>

            <button
              onClick={() => { setActiveTab('Q'); setSelectedSeasonFilter('CURRENT'); setSelectedFranchiseFilter('ALL'); }}
              className={`px-3.5 py-1.5 font-bold uppercase text-xs transition border border-black cursor-pointer ${activeTab === 'Q'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-neutral-100'
                }`}
            >
              The Q
            </button>

            <button
              onClick={() => { setActiveTab('V'); setSelectedSeasonFilter('CURRENT'); setSelectedFranchiseFilter('ALL'); }}
              className={`px-3.5 py-1.5 font-bold uppercase text-xs transition border border-black cursor-pointer ${activeTab === 'V'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-neutral-100'
                }`}
            >
              Vintage
            </button>

            <button
              onClick={() => { setActiveTab('ALL'); setSelectedSeasonFilter('ALL'); setSelectedFranchiseFilter('ALL'); }}
              className={`px-3.5 py-1.5 font-bold uppercase text-xs transition border border-black cursor-pointer ${activeTab === 'ALL'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-neutral-100'
                }`}
            >
              All Trades
            </button>
          </div>

          {/* Right: Quick Scope Indicator */}
          <div className="flex items-center gap-2 text-xs font-sans font-bold uppercase text-black/70">
            <span>Active Horizon:</span>
            <span className="bg-black text-white px-2 py-0.5 font-mono text-[11px]">
              {activeSimConfig.currentSeasonName} (Draft {activeSimConfig.futureDraftYears.join(', ')})
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: INTERACTIVE TRADE SIMULATOR                                        */}
        {/* ========================================================================= */}
        {activeTab === 'simulator' && (
          <div className="space-y-4">

            {/* LEAGUE SELECTOR 4 CARDS (STANDINGS STYLE DECK) */}
            <div className="bg-[#ebd9c0]/40 border border-black/20 rounded-xs p-3 font-sans select-none text-xs">
              <div className="font-sans font-black text-[10px] tracking-widest text-black/60 uppercase mb-2 flex items-center justify-between">
                <span>Select League Scope (Blended Ratings: 2012 for W18, 1926 for O01, 1997 for Q19, 1916 for V01)</span>
                <span className="font-mono text-neutral-600">4 Active Leagues</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {CURRENT_LEAGUES_CONFIG.map(cfg => {
                  const isSelected = simLeague === cfg.id;
                  return (
                    <button
                      key={cfg.id}
                      onClick={() => setSimLeague(cfg.id as any)}
                      className={`p-2.5 border text-left flex items-center gap-3 transition-all cursor-pointer rounded-xs ${isSelected
                          ? 'bg-black text-white border-black shadow-sm'
                          : 'bg-white/80 text-black border-black/20 hover:border-black hover:bg-white'
                        }`}
                    >
                      <img
                        src={cfg.logoUrl}
                        alt={cfg.name}
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (cfg.fallbackLogoUrl && target.src !== cfg.fallbackLogoUrl) {
                            target.src = cfg.fallbackLogoUrl;
                          }
                        }}
                        className={`w-12 h-12 object-contain p-0.5 border shrink-0 ${isSelected ? 'bg-white border-white/20' : 'bg-[#f4f1ea] border-black/10'
                          }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-black text-xs uppercase truncate leading-tight">{cfg.name}</div>
                        <div className={`text-[10px] font-mono uppercase mt-0.5 truncate ${isSelected ? 'text-emerald-300' : 'text-neutral-600'}`}>
                          {cfg.currentSeasonName}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* DEAL ASSESSMENT VISUALIZER (MATCHING USER MOCKUP EXACTLY) */}
            <div className="bg-white border border-black p-4 md:p-5 shadow-sm space-y-4">

              {/* Header: Status Verdict & Controls (Clean Gazette Outline Style) */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-3 border-b border-black pb-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-black">ASSESSMENT STATUS:</span>

                  {/* Verdict Badge in Clean Bordered Box */}
                  <div className="border border-black bg-white px-3 py-1 text-xs font-black uppercase flex items-center gap-1.5 shadow-2xs">
                    <verdictBadge.icon className="w-3.5 h-3.5" />
                    <span>{verdictBadge.text}</span>
                  </div>

                  {/* Margin Differential Box */}
                  {valDifference > 0 && (teamATotalVal > 0 || teamBTotalVal > 0) && (
                    <div className="border border-black bg-white px-2.5 py-1 text-xs font-mono font-bold text-black shadow-2xs">
                      (Margin: ±{valDifference} pts / {marginPercent}%)
                    </div>
                  )}
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyTradeForDiscord}
                    className="flex items-center gap-1.5 bg-black text-white border border-black text-xs font-bold uppercase px-3.5 py-1.5 hover:bg-neutral-800 transition cursor-pointer"
                    title="Copy formatted proposal for Discord"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "COPIED!" : "COPY FOR DISCORD"}</span>
                  </button>
                  <button
                    onClick={handleResetTrade}
                    className="flex items-center gap-1 bg-white text-black border border-black text-xs font-bold uppercase px-3 py-1.5 hover:bg-black hover:text-white transition cursor-pointer"
                    title="Clear all selected assets"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>RESET</span>
                  </button>
                </div>
              </div>

              {/* FIVE-SECTION HORIZONTAL DECK (AS SHOWN IN USER MOCKUP) */}
              <div className="border border-black bg-[#f4f1ea] p-3 md:p-4">
                <div className="flex flex-col lg:flex-row items-stretch gap-3">

                  {/* 1. TEAM A SUMMARY CARD (LEFT) */}
                  <div className="w-full lg:w-[28%] bg-white border border-black p-3.5 flex flex-col justify-between shadow-2xs">
                    <div>
                      <div className="flex items-start gap-3">
                        {teamA?.logo_url ? (
                          <img
                            src={teamA.logo_url}
                            alt={teamA.team_name}
                            style={{ width: '100px', height: '100px', minWidth: '100px', minHeight: '100px' }}
                            className="w-[100px] h-[100px] object-contain p-1 border border-black bg-white shrink-0"
                          />
                        ) : (
                          <div
                            style={{ width: '100px', height: '100px', minWidth: '100px', minHeight: '100px' }}
                            className="w-[100px] h-[100px] bg-neutral-100 border border-black flex items-center justify-center font-black text-xl shrink-0"
                          >
                            {teamA?.abbreviation || 'TM1'}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-bold uppercase border border-black bg-white px-2 py-0.5 inline-block font-mono mb-1">
                            TEAM A
                          </span>
                          <h4 className="font-black text-sm md:text-base uppercase tracking-tight leading-snug text-black">
                            {teamA?.team_name || 'Team A'}
                          </h4>
                          <p className="text-[11px] text-neutral-600 font-sans mt-0.5 truncate">
                            Coach: {teamA?.coach_name || 'Front Office'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-2 border-t border-black/15 flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-neutral-600 tracking-wider">OUTGOING TOTAL</span>
                      <div className="border border-black bg-white px-3 py-1 font-black font-mono text-base text-black shadow-2xs">
                        {teamATotalVal} PTS
                      </div>
                    </div>
                  </div>

                  {/* 2. TEAM A OUTGOING ASSET PACKAGE */}
                  <div className="w-full lg:w-[22%] bg-[#fdfaf5] border border-black p-3 flex flex-col justify-between shadow-2xs">
                    <div>
                      <div className="border border-black bg-white px-2.5 py-1 text-xs font-mono font-black uppercase text-center mb-2.5 shadow-2xs">
                        {teamA?.abbreviation || 'TEAM A'} SENDS ({teamATotalVal} PTS)
                      </div>

                      {teamASendingPlayers.length === 0 && teamASendingPicks.length === 0 ? (
                        <p className="text-[11px] italic text-neutral-500 py-4 text-center font-sans">
                          No assets selected from {teamA?.abbreviation || 'Team A'}.
                        </p>
                      ) : (
                        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                          {teamASendingPlayers.map(p => (
                            <div
                              key={p.id}
                              className="border border-black bg-white px-2.5 py-1 text-xs font-bold flex items-center justify-between shadow-2xs"
                            >
                              <span className="truncate">{p.name}</span>
                              <span className="font-mono text-[10px] bg-neutral-100 border border-neutral-300 px-1.5 py-0.2 ml-1 font-black shrink-0">
                                OVR {p.ovr}
                              </span>
                            </div>
                          ))}
                          {teamASendingPicks.map(pk => (
                            <div
                              key={pk.id}
                              className="border border-black bg-white px-2.5 py-1 text-xs font-bold flex items-center justify-between shadow-2xs"
                            >
                              <span>{pk.year} {pk.round} Rd</span>
                              <span className="font-mono text-[10px] bg-neutral-100 border border-neutral-300 px-1.5 py-0.2 ml-1 font-black shrink-0">
                                {pk.value} pts
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex justify-end">
                      <div className="bg-black text-white px-3 py-1 text-[11px] font-mono font-bold flex items-center gap-1.5 shadow-2xs">
                        <span>Going to {teamB?.abbreviation || 'Team B'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>

                  {/* 3. CENTRAL BALANCE INDICATOR */}
                  <div className="w-full lg:w-[6%] flex items-center justify-center py-2 lg:py-0">
                    <div className="bg-black text-white border border-black px-2.5 py-1.5 text-[10px] font-mono font-bold uppercase flex items-center gap-1 shadow-2xs whitespace-nowrap">
                      <Scale className="w-3 h-3" />
                      <span>DIFF: ±{valDifference} PTS</span>
                    </div>
                  </div>

                  {/* 4. TEAM B OUTGOING ASSET PACKAGE */}
                  <div className="w-full lg:w-[22%] bg-[#fdfaf5] border border-black p-3 flex flex-col justify-between shadow-2xs">
                    <div>
                      <div className="border border-black bg-white px-2.5 py-1 text-xs font-mono font-black uppercase text-center mb-2.5 shadow-2xs">
                        {teamB?.abbreviation || 'TEAM B'} SENDS ({teamBTotalVal} PTS)
                      </div>

                      {teamBSendingPlayers.length === 0 && teamBSendingPicks.length === 0 ? (
                        <p className="text-[11px] italic text-neutral-500 py-4 text-center font-sans">
                          No assets selected from {teamB?.abbreviation || 'Team B'}.
                        </p>
                      ) : (
                        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                          {teamBSendingPlayers.map(p => (
                            <div
                              key={p.id}
                              className="border border-black bg-white px-2.5 py-1 text-xs font-bold flex items-center justify-between shadow-2xs"
                            >
                              <span className="truncate">{p.name}</span>
                              <span className="font-mono text-[10px] bg-neutral-100 border border-neutral-300 px-1.5 py-0.2 ml-1 font-black shrink-0">
                                OVR {p.ovr}
                              </span>
                            </div>
                          ))}
                          {teamBSendingPicks.map(pk => (
                            <div
                              key={pk.id}
                              className="border border-black bg-white px-2.5 py-1 text-xs font-bold flex items-center justify-between shadow-2xs"
                            >
                              <span>{pk.year} {pk.round} Rd</span>
                              <span className="font-mono text-[10px] bg-neutral-100 border border-neutral-300 px-1.5 py-0.2 ml-1 font-black shrink-0">
                                {pk.value} pts
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex justify-start">
                      <div className="bg-black text-white px-3 py-1 text-[11px] font-mono font-bold flex items-center gap-1.5 shadow-2xs">
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Going to {teamA?.abbreviation || 'Team A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 5. TEAM B SUMMARY CARD (RIGHT) */}
                  <div className="w-full lg:w-[28%] bg-white border border-black p-3.5 flex flex-col justify-between shadow-2xs">
                    <div>
                      <div className="flex items-start gap-3 justify-end text-right">
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-bold uppercase border border-black bg-white px-2 py-0.5 inline-block font-mono mb-1">
                            TEAM B
                          </span>
                          <h4 className="font-black text-sm md:text-base uppercase tracking-tight leading-snug text-black">
                            {teamB?.team_name || 'Team B'}
                          </h4>
                          <p className="text-[11px] text-neutral-600 font-sans mt-0.5 truncate">
                            Coach: {teamB?.coach_name || 'Front Office'}
                          </p>
                        </div>
                        {teamB?.logo_url ? (
                          <img
                            src={teamB.logo_url}
                            alt={teamB.team_name}
                            style={{ width: '100px', height: '100px', minWidth: '100px', minHeight: '100px' }}
                            className="w-[100px] h-[100px] object-contain p-1 border border-black bg-white shrink-0"
                          />
                        ) : (
                          <div
                            style={{ width: '100px', height: '100px', minWidth: '100px', minHeight: '100px' }}
                            className="w-[100px] h-[100px] bg-neutral-100 border border-black flex items-center justify-center font-black text-xl shrink-0"
                          >
                            {teamB?.abbreviation || 'TM2'}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-2 border-t border-black/15 flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-neutral-600 tracking-wider">OUTGOING TOTAL</span>
                      <div className="border border-black bg-white px-3 py-1 font-black font-mono text-base text-black shadow-2xs">
                        {teamBTotalVal} PTS
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* PROPORTIONAL VOLUME BALANCE METER (SOLID BLACK VS WHITE AS IN MOCKUP) */}
              <div>
                <div className="flex justify-between text-[11px] font-mono font-bold text-black mb-1">
                  <span>{teamA?.abbreviation || 'Team A'}: {teamATotalVal} pts ({teamATotalVal + teamBTotalVal > 0 ? Math.round((teamATotalVal / (teamATotalVal + teamBTotalVal)) * 100) : 50}%)</span>
                  <span>{teamB?.abbreviation || 'Team B'}: {teamBTotalVal} pts ({teamATotalVal + teamBTotalVal > 0 ? Math.round((teamBTotalVal / (teamATotalVal + teamBTotalVal)) * 100) : 50}%)</span>
                </div>
                <div className="w-full bg-white h-3 border-2 border-black overflow-hidden flex">
                  <div
                    className="bg-black h-full transition-all duration-300"
                    style={{ width: `${teamATotalVal + teamBTotalVal > 0 ? (teamATotalVal / (teamATotalVal + teamBTotalVal)) * 100 : 50}%` }}
                  />
                  <div
                    className="bg-white h-full transition-all duration-300"
                    style={{ width: `${teamATotalVal + teamBTotalVal > 0 ? (teamBTotalVal / (teamATotalVal + teamBTotalVal)) * 100 : 50}%` }}
                  />
                </div>
              </div>

            </div>

            {/* DUAL TEAMS SIDE BY SIDE ROSTER WORKBENCH (2-COLUMN GRID) */}
            {loadingLeagueTeams ? (
              <div className="p-12 text-center bg-white border border-black font-bold uppercase text-xs">
                Loading teams & blended player ratings for {activeSimConfig.currentSeasonName}...
              </div>
            ) : leagueTeams.length === 0 ? (
              <div className="p-12 text-center bg-white border border-black font-bold uppercase text-xs text-red-700">
                No teams found for {activeSimConfig.currentSeasonName}.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">

                {/* ===================== TEAM A (LEFT COLUMN) ===================== */}
                <div className="border border-black bg-white p-4 shadow-sm flex flex-col">
                  {/* Header with Selector and 100x100 Logo */}
                  <div className="border-b border-black pb-3 mb-3 flex items-center gap-3">
                    {teamA?.logo_url ? (
                      <img
                        src={teamA.logo_url}
                        alt={teamA.team_name}
                        style={{ width: '100px', height: '100px', minWidth: '100px', minHeight: '100px' }}
                        className="w-[100px] h-[100px] object-contain p-1 border border-black bg-white shadow-2xs"
                      />
                    ) : (
                      <div
                        style={{ width: '100px', height: '100px', minWidth: '100px', minHeight: '100px' }}
                        className="w-[100px] h-[100px] bg-neutral-100 border border-black flex items-center justify-center font-black text-lg shrink-0"
                      >
                        {teamA?.abbreviation || 'TM1'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-black/70 block">
                        Team A (Sender)
                      </label>
                      <select
                        value={teamAId}
                        onChange={(e) => setTeamAId(e.target.value)}
                        className="font-black uppercase text-sm bg-[#f4f1ea] border border-black w-full p-1.5 focus:outline-none cursor-pointer block mt-1"
                      >
                        {leagueTeams.map(t => (
                          <option key={t.team_id} value={t.team_id} disabled={String(t.team_id) === String(teamBId)}>
                            {t.team_name} ({t.abbreviation})
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-neutral-600 mt-1 uppercase font-bold truncate">
                        Coach: {teamA?.coach_name}
                      </p>
                    </div>
                  </div>

                  {/* Team A Roster & Draft Capital */}
                  <div className="space-y-3">
                    {/* Active Roster */}
                    <div>
                      <div className="flex flex-wrap justify-between items-center gap-2 mb-1.5 border-b border-black/15 pb-1">
                        <span className="text-xs font-black uppercase flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5" />
                          Active Roster ({teamARoster.length})
                        </span>

                        <div className="flex items-center gap-1 text-[10px] font-bold">
                          {(['ALL', 'F', 'D', 'G'] as const).map(pos => (
                            <button
                              key={pos}
                              onClick={() => setPosFilterA(pos)}
                              className={`px-1.5 py-0.5 border transition cursor-pointer ${posFilterA === pos
                                  ? 'bg-black text-white border-black font-black'
                                  : 'bg-neutral-100 border-neutral-300 hover:bg-neutral-200'
                                }`}
                            >
                              {pos}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Search */}
                      <div className="relative mb-2">
                        <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2" />
                        <input
                          type="text"
                          placeholder="Filter Team A roster..."
                          value={searchRosterA}
                          onChange={(e) => setSearchRosterA(e.target.value)}
                          className="w-full pl-8 pr-3 py-1 text-xs bg-[#f4f1ea] border border-black/30 font-sans focus:outline-none focus:border-black"
                        />
                        {searchRosterA && (
                          <button onClick={() => setSearchRosterA('')} className="absolute right-2.5 top-1.5 text-neutral-400 hover:text-black">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Roster Scroll */}
                      <div className="max-h-48 overflow-y-auto border border-black/20 divide-y divide-neutral-100 text-xs">
                        {filterRosterList(teamARoster, searchRosterA, posFilterA).length === 0 ? (
                          <div className="p-3 text-center text-neutral-400 italic text-[11px]">No matching players.</div>
                        ) : (
                          filterRosterList(teamARoster, searchRosterA, posFilterA).map(p => {
                            const isSelected = teamASendingPlayers.some(item => item.id === p.id);
                            return (
                              <div
                                key={p.id}
                                onClick={() => togglePlayerA(p)}
                                className={`flex items-center justify-between p-1.5 cursor-pointer transition ${isSelected ? 'bg-neutral-200 font-black' : 'hover:bg-neutral-50'
                                  }`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="w-4 text-[10px] font-mono text-neutral-500 uppercase font-bold shrink-0">{p.pos}</span>
                                  <span className="truncate font-sans font-semibold text-xs">{p.name}</span>
                                  {p.source_year && (
                                    <span className="text-[9px] font-mono bg-neutral-100 border border-neutral-300 px-1 rounded-xs shrink-0">
                                      '{String(p.source_year).slice(-2)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className={`font-mono px-1.5 py-0.2 text-[10px] ${getOvrColor(p.ovr)}`}>
                                    OVR {p.ovr}
                                  </span>
                                  <span className="text-xs font-black">{isSelected ? '✓' : '+'}</span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Draft Capital */}
                    <div>
                      <h5 className="text-[11px] font-black uppercase tracking-wider text-black/70 mb-1 border-b border-black/15 pb-0.5 flex items-center justify-between">
                        <span>Draft Capital (3 Future Seasons)</span>
                        <span className="text-[9px] font-mono text-neutral-500">
                          {activeSimConfig.draftRounds.length === 3 ? 'Rounds 1–3' : 'Rounds 1–2'}
                        </span>
                      </h5>
                      <div className="space-y-1.5">
                        {Object.entries(groupPicksByYear(teamAPicks)).map(([yr, yearPicks]) => (
                          <div key={yr} className="bg-neutral-50 p-1.5 border border-neutral-200">
                            <div className="text-[10px] font-black uppercase text-neutral-700 mb-1 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{yr} Draft Picks</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                              {yearPicks.map(pk => {
                                const isSelected = teamASendingPicks.some(item => item.id === pk.id);
                                return (
                                  <button
                                    key={pk.id}
                                    onClick={() => togglePickA(pk)}
                                    className={`p-1 text-left border text-[10px] font-bold transition flex justify-between items-center cursor-pointer ${isSelected
                                        ? 'bg-black text-white border-black'
                                        : 'bg-white border-neutral-300 hover:border-black'
                                      }`}
                                  >
                                    <span>{pk.round} Rd</span>
                                    <span className="opacity-75 font-mono">+{pk.value}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ===================== TEAM B (RIGHT COLUMN) ===================== */}
                <div className="border border-black bg-white p-4 shadow-sm flex flex-col">
                  {/* Header with Selector and 100x100 Logo */}
                  <div className="border-b border-black pb-3 mb-3 flex items-center gap-3">
                    {teamB?.logo_url ? (
                      <img
                        src={teamB.logo_url}
                        alt={teamB.team_name}
                        style={{ width: '100px', height: '100px', minWidth: '100px', minHeight: '100px' }}
                        className="w-[100px] h-[100px] object-contain shrink-0 p-1 border border-black bg-white shadow-2xs"
                      />
                    ) : (
                      <div
                        style={{ width: '100px', height: '100px', minWidth: '100px', minHeight: '100px' }}
                        className="w-[100px] h-[100px] bg-neutral-100 border border-black flex items-center justify-center font-black text-lg shrink-0"
                      >
                        {teamB?.abbreviation || 'TM2'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-black/70 block">
                        Team B (Sender)
                      </label>
                      <select
                        value={teamBId}
                        onChange={(e) => setTeamBId(e.target.value)}
                        className="font-black uppercase text-sm bg-[#f4f1ea] border border-black w-full p-1.5 focus:outline-none cursor-pointer block mt-1"
                      >
                        {leagueTeams.map(t => (
                          <option key={t.team_id} value={t.team_id} disabled={String(t.team_id) === String(teamAId)}>
                            {t.team_name} ({t.abbreviation})
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-neutral-600 mt-1 uppercase font-bold truncate">
                        Coach: {teamB?.coach_name}
                      </p>
                    </div>
                  </div>

                  {/* Team B Roster & Draft Capital */}
                  <div className="space-y-3">
                    {/* Active Roster */}
                    <div>
                      <div className="flex flex-wrap justify-between items-center gap-2 mb-1.5 border-b border-black/15 pb-1">
                        <span className="text-xs font-black uppercase flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5" />
                          Active Roster ({teamBRoster.length})
                        </span>

                        <div className="flex items-center gap-1 text-[10px] font-bold">
                          {(['ALL', 'F', 'D', 'G'] as const).map(pos => (
                            <button
                              key={pos}
                              onClick={() => setPosFilterB(pos)}
                              className={`px-1.5 py-0.5 border transition cursor-pointer ${posFilterB === pos
                                  ? 'bg-black text-white border-black font-black'
                                  : 'bg-neutral-100 border-neutral-300 hover:bg-neutral-200'
                                }`}
                            >
                              {pos}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Search */}
                      <div className="relative mb-2">
                        <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2" />
                        <input
                          type="text"
                          placeholder="Filter Team B roster..."
                          value={searchRosterB}
                          onChange={(e) => setSearchRosterB(e.target.value)}
                          className="w-full pl-8 pr-3 py-1 text-xs bg-[#f4f1ea] border border-black/30 font-sans focus:outline-none focus:border-black"
                        />
                        {searchRosterB && (
                          <button onClick={() => setSearchRosterB('')} className="absolute right-2.5 top-1.5 text-neutral-400 hover:text-black">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Roster Scroll */}
                      <div className="max-h-48 overflow-y-auto border border-black/20 divide-y divide-neutral-100 text-xs">
                        {filterRosterList(teamBRoster, searchRosterB, posFilterB).length === 0 ? (
                          <div className="p-3 text-center text-neutral-400 italic text-[11px]">No matching players.</div>
                        ) : (
                          filterRosterList(teamBRoster, searchRosterB, posFilterB).map(p => {
                            const isSelected = teamBSendingPlayers.some(item => item.id === p.id);
                            return (
                              <div
                                key={p.id}
                                onClick={() => togglePlayerB(p)}
                                className={`flex items-center justify-between p-1.5 cursor-pointer transition ${isSelected ? 'bg-neutral-200 font-black' : 'hover:bg-neutral-50'
                                  }`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="w-4 text-[10px] font-mono text-neutral-500 uppercase font-bold shrink-0">{p.pos}</span>
                                  <span className="truncate font-sans font-semibold text-xs">{p.name}</span>
                                  {p.source_year && (
                                    <span className="text-[9px] font-mono bg-neutral-100 border border-neutral-300 px-1 rounded-xs shrink-0">
                                      '{String(p.source_year).slice(-2)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className={`font-mono px-1.5 py-0.2 text-[10px] ${getOvrColor(p.ovr)}`}>
                                    OVR {p.ovr}
                                  </span>
                                  <span className="text-xs font-black">{isSelected ? '✓' : '+'}</span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Draft Capital */}
                    <div>
                      <h5 className="text-[11px] font-black uppercase tracking-wider text-black/70 mb-1 border-b border-black/15 pb-0.5 flex items-center justify-between">
                        <span>Draft Capital (3 Future Seasons)</span>
                        <span className="text-[9px] font-mono text-neutral-500">
                          {activeSimConfig.draftRounds.length === 3 ? 'Rounds 1–3' : 'Rounds 1–2'}
                        </span>
                      </h5>
                      <div className="space-y-1.5">
                        {Object.entries(groupPicksByYear(teamBPicks)).map(([yr, yearPicks]) => (
                          <div key={yr} className="bg-neutral-50 p-1.5 border border-neutral-200">
                            <div className="text-[10px] font-black uppercase text-neutral-700 mb-1 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{yr} Draft Picks</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                              {yearPicks.map(pk => {
                                const isSelected = teamBSendingPicks.some(item => item.id === pk.id);
                                return (
                                  <button
                                    key={pk.id}
                                    onClick={() => togglePickB(pk)}
                                    className={`p-1 text-left border text-[10px] font-bold transition flex justify-between items-center cursor-pointer ${isSelected
                                        ? 'bg-black text-white border-black'
                                        : 'bg-white border-neutral-300 hover:border-black'
                                      }`}
                                  >
                                    <span>{pk.round} Rd</span>
                                    <span className="opacity-75 font-mono">+{pk.value}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TABS 2-6: LEAGUE-SPECIFIC HISTORICAL TRADE LEDGER (GAZETTE STYLE)         */}
        {/* ========================================================================= */}
        {activeTab !== 'simulator' && (
          <div className="space-y-4">

            {/* SORT & FILTER CONTROLLER BAR (STANDINGS STYLE) */}
            <div className="bg-[#ebd9c0]/40 border border-black/20 rounded-xs p-3 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black uppercase bg-black text-white px-2.5 py-1">
                  {activeTab === 'ALL' ? 'All Leagues' : `${activeTab} League Ledger`}
                </span>

                {/* Season Filter Dropdown */}
                <select
                  value={selectedSeasonFilter}
                  onChange={(e) => setSelectedSeasonFilter(e.target.value)}
                  className="bg-white border border-black text-xs font-bold uppercase px-2 py-1 cursor-pointer focus:outline-none font-sans"
                >
                  <option value="CURRENT">⚡ Current Season Only</option>
                  <option value="ALL">📚 All Historical Seasons</option>
                  {seasons
                    .filter(s => activeTab === 'ALL' || String(s.season_name || '').startsWith(activeTab))
                    .map(s => <option key={s.league_id} value={s.season_name}>{s.season_name}</option>)}
                </select>

                {/* Team / Franchise Filter Dropdown */}
                <select
                  value={selectedFranchiseFilter}
                  onChange={(e) => setSelectedFranchiseFilter(e.target.value)}
                  className="bg-white border border-black text-xs font-bold uppercase px-2 py-1 cursor-pointer focus:outline-none font-sans"
                >
                  <option value="ALL">🏢 All Franchises</option>
                  {Array.from(new Set(trades.flatMap(t => [t.team, t.team_1]).filter(Boolean)))
                    .sort((a, b) => a.localeCompare(b))
                    .map(tm => <option key={tm} value={tm}>{tm}</option>)}
                </select>

                {/* Sort Order Selector */}
                <div className="flex items-center border border-black divide-x divide-black text-xs font-bold uppercase bg-white">
                  <button
                    onClick={() => setLedgerSortOrder('NEWEST')}
                    className={`px-2.5 py-1 transition cursor-pointer ${ledgerSortOrder === 'NEWEST' ? 'bg-black text-white' : 'hover:bg-neutral-100'}`}
                  >
                    Newest
                  </button>
                  <button
                    onClick={() => setLedgerSortOrder('BIGGEST')}
                    className={`px-2.5 py-1 transition cursor-pointer ${ledgerSortOrder === 'BIGGEST' ? 'bg-black text-white' : 'hover:bg-neutral-100'}`}
                  >
                    Blockbusters
                  </button>
                  <button
                    onClick={() => setLedgerSortOrder('LOPSIDED')}
                    className={`px-2.5 py-1 transition cursor-pointer ${ledgerSortOrder === 'LOPSIDED' ? 'bg-black text-white' : 'hover:bg-neutral-100'}`}
                  >
                    Fleeces
                  </button>
                </div>

                <span className="text-xs font-mono font-bold text-neutral-600 bg-white px-2 py-1 border border-black/20">
                  {filteredLeagueTrades.length} Confirmed Trades
                </span>
              </div>

              {/* Instant Search Bar */}
              <div className="relative w-full lg:w-64">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2" />
                <input
                  className="w-full border border-black pl-8 pr-7 py-1 text-xs font-sans focus:outline-none bg-white"
                  placeholder="Search team or player..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1.5 text-neutral-400 hover:text-black cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* FULL HISTORICAL LEDGER: RETRO GAZETTE STYLE CARDS */}
            <div className="space-y-4">
              {loadingArchive ? (
                <p className="p-12 text-center italic text-xs uppercase font-bold bg-white border border-black">
                  Loading Trade Ledger...
                </p>
              ) : filteredLeagueTrades.length === 0 ? (
                <div className="p-12 text-center bg-white border border-black">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-neutral-400" />
                  <p className="italic text-xs uppercase font-bold text-neutral-500">
                    No trades found matching active season / franchise filter.
                  </p>
                </div>
              ) : (
                filteredLeagueTrades.map((t, i) => {
                  const m1 = teamMetadata[String(t.team).trim().toUpperCase()];
                  const m2 = teamMetadata[String(t.team_1).trim().toUpperCase()];
                  const outcome = evaluateTradeOutcome(t);

                  const team1Name = m1?.name || t.team;
                  const team2Name = m2?.name || t.team_1;

                  const formatAssetHeadline = (item: any) => {
                    if (item.draftedPlayer && !item.draftedPlayer.wasPassed) {
                      return `${item.raw} (→ ${item.draftedPlayer.pos ? item.draftedPlayer.pos + ' ' : ''}${item.draftedPlayer.name})`;
                    }
                    return item.raw;
                  };

                  const t1AcquiredText = outcome.receivedByT1.items.map(formatAssetHeadline).join(', ') || 'No assets';
                  const t2AcquiredText = outcome.receivedByT2.items.map(formatAssetHeadline).join(', ') || 'No assets';

                  return (
                    <div
                      key={i}
                      className="bg-white text-black border border-black shadow-sm overflow-hidden"
                    >
                      {/* Top Header Bar */}
                      <div className="bg-black text-white px-3 py-2 border-b border-black flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-mono font-bold">
                          <span className="text-white font-black tracking-wider flex items-center gap-1">
                            <ArrowLeftRight className="w-3 h-3" />
                            TRADE
                          </span>
                          <span className="text-neutral-500">•</span>
                          <span className="text-neutral-200">Season {t.lg}</span>
                          <span className="text-neutral-500">•</span>
                          <span className="text-neutral-400">ID #{t["trade id"]}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold uppercase border ${outcome.verdict.color}`}>
                            <outcome.verdict.icon className="w-3 h-3" />
                            {outcome.verdict.label}
                          </span>
                        </div>
                      </div>

                      {/* Summary Headline Block */}
                      <div className="bg-[#f5f2eb] px-4 py-2.5 border-b border-black flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <p className="text-xs md:text-sm font-serif font-bold text-black leading-relaxed">
                          The <strong className="underline">{team1Name}</strong> acquired{' '}
                          <span className="text-red-800 font-sans font-bold">{t1AcquiredText}</span> from the{' '}
                          <strong className="underline">{team2Name}</strong> for{' '}
                          <span className="text-blue-900 font-sans font-bold">{t2AcquiredText}</span>.
                        </p>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="bg-white border border-black px-2 py-0.5 text-[10px] font-mono text-black flex items-center gap-1">
                            <BarChart3 className="w-3 h-3" />
                            <span>Volume: <strong>{outcome.sentByT1.totalValue + outcome.sentByT2.totalValue} PTS</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Dual Team Exchange Cards with 100x100 Logos */}
                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-black">

                        {/* ================= TEAM 1 COLUMN ================= */}
                        <div className="p-3 bg-white flex flex-col justify-between">
                          <div>
                            {/* Team Header: 100x100 LOGO + NET IMPACT STATS */}
                            <div className="flex items-center justify-between gap-3 pb-2.5 mb-2.5 border-b border-black/10">
                              <div className="flex items-center gap-2.5 min-w-0">
                                {m1?.logo ? (
                                  <img
                                    src={m1.logo}
                                    alt={team1Name}
                                    style={{ width: '100px', height: '100px', minWidth: '100px', minHeight: '100px' }}
                                    className="w-[100px] h-[100px] object-contain p-1 border border-black bg-[#fdfaf5] shrink-0"
                                  />
                                ) : (
                                  <div
                                    style={{ width: '100px', height: '100px', minWidth: '100px', minHeight: '100px' }}
                                    className="w-[100px] h-[100px] bg-neutral-100 border border-black flex items-center justify-center font-black text-lg text-neutral-700 shrink-0"
                                  >
                                    {m1?.abbr || t.team}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <h3 className="font-black text-sm text-black uppercase tracking-tight truncate">{team1Name}</h3>
                                  <span className="text-[10px] font-mono text-neutral-500 uppercase font-bold">{m1?.abbr || t.team}</span>
                                </div>
                              </div>

                              <div className="text-right shrink-0 space-y-0.5">
                                <div className="flex items-center justify-end gap-1">
                                  <span className="text-[9px] uppercase font-mono text-neutral-600 font-bold">NET:</span>
                                  <span className={`px-1.5 py-0.2 text-[11px] font-mono font-black border ${outcome.netImpactT1 >= 0
                                      ? 'bg-emerald-100 text-emerald-950 border-emerald-600'
                                      : 'bg-red-100 text-red-950 border-red-600'
                                    }`}>
                                    {outcome.netImpactT1 >= 0 ? `+${outcome.netImpactT1} PTS` : `${outcome.netImpactT1} PTS`}
                                  </span>
                                </div>
                                <div className="text-[9px] font-mono text-neutral-500">
                                  Grade: <strong className="text-black text-xs">{outcome.gradeT1}</strong> ({outcome.t1Share}%)
                                </div>
                              </div>
                            </div>

                            {/* Acquired Assets Sub-Cards */}
                            <div className="space-y-1.5">
                              <p className="text-[9px] font-mono uppercase font-black tracking-wider text-black flex items-center gap-1">
                                <span>📥 ACQUIRED ASSETS ({outcome.receivedByT1.totalValue} PTS)</span>
                              </p>
                              {outcome.receivedByT1.items.length === 0 ? (
                                <div className="p-2 bg-neutral-50 border border-dashed border-neutral-300 text-neutral-400 text-xs italic text-center">
                                  No assets acquired.
                                </div>
                              ) : (
                                outcome.receivedByT1.items.map((item, idx) => {
                                  if (item.isPick && item.draftedPlayer) {
                                    return (
                                      <div
                                        key={idx}
                                        className="bg-[#fdfaf5] border-2 border-black p-2.5 shadow-2xs hover:border-black transition-all group"
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-8 h-8 bg-black text-amber-400 border border-black flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                              <Sparkles className="w-4 h-4 text-amber-400" />
                                            </div>

                                            <div className="min-w-0">
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="text-xs font-sans font-bold text-black">
                                                  {item.pickYear ? `${item.pickYear} ` : ''}{item.pickRound}
                                                  {item.draftedPlayer.pickNumber ? ` (#${item.draftedPlayer.pickNumber})` : ''}
                                                </span>
                                                <span className="text-[9px] font-mono font-bold bg-amber-200 text-amber-950 px-1.5 py-0.2 border border-amber-500 uppercase tracking-tight">
                                                  🎯 Selection Made
                                                </span>
                                              </div>

                                              <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                                                {item.draftedPlayer.wasPassed ? (
                                                  <span className="text-[11px] font-mono text-neutral-500 italic">
                                                    Pick Passed (No Selection)
                                                  </span>
                                                ) : (
                                                  <>
                                                    <Link
                                                      href={`/players?q=${encodeURIComponent(item.draftedPlayer.name)}`}
                                                      className="text-xs font-sans font-black text-blue-900 group-hover:underline flex items-center gap-1 uppercase"
                                                    >
                                                      <span>{item.draftedPlayer.pos ? `${item.draftedPlayer.pos} ` : ''}{item.draftedPlayer.name}</span>
                                                      <ArrowUpRight className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                                                    </Link>
                                                    {item.draftedPlayer.ovr && (
                                                      <span className="text-[10px] font-mono font-black bg-black text-white px-1 py-0.2">
                                                        OVR {item.draftedPlayer.ovr}
                                                      </span>
                                                    )}
                                                  </>
                                                )}
                                              </div>
                                            </div>
                                          </div>

                                          <div className="text-right shrink-0">
                                            <span className="text-[10px] font-mono font-black text-black bg-neutral-100 px-1.5 py-0.5 border border-neutral-300">
                                              {item.value} PTS
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div
                                      key={idx}
                                      className="bg-[#fbf9f5] border border-black/20 hover:border-black p-2 flex items-center justify-between gap-2"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-6 h-6 bg-black text-white flex items-center justify-center font-bold text-xs shrink-0">
                                          {item.isPick ? <Calendar className="w-3 h-3 text-white" /> : <UserCheck className="w-3 h-3 text-white" />}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-xs font-sans font-bold text-black truncate">{item.raw}</p>
                                          <p className="text-[9px] font-mono text-neutral-500">
                                            {item.isPick ? `${item.pickYear || 'Future'} Draft Pick (Pending Selection)` : 'Roster Asset'}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="text-right shrink-0">
                                        <span className="text-[10px] font-mono font-black text-black bg-neutral-100 px-1.5 py-0.5 border border-neutral-300">
                                          {item.value} PTS
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          <div className="mt-3 pt-1.5 border-t border-black/10 text-[9px] font-mono text-neutral-500 flex justify-between">
                            <span>Sent: <strong>{outcome.sentByT1.totalValue} pts</strong></span>
                            <span>Acquired: <strong>{outcome.receivedByT1.totalValue} pts</strong></span>
                          </div>
                        </div>

                        {/* ================= TEAM 2 COLUMN ================= */}
                        <div className="p-3 bg-white flex flex-col justify-between">
                          <div>
                            {/* Team Header: 100x100 LOGO + NET IMPACT STATS */}
                            <div className="flex items-center justify-between gap-3 pb-2.5 mb-2.5 border-b border-black/10">
                              <div className="flex items-center gap-2.5 min-w-0">
                                {m2?.logo ? (
                                  <img
                                    src={m2.logo}
                                    alt={team2Name}
                                    style={{ width: '100px', height: '100px', minWidth: '100px', minHeight: '100px' }}
                                    className="w-[100px] h-[100px] object-contain p-1 border border-black bg-[#fdfaf5] shrink-0"
                                  />
                                ) : (
                                  <div
                                    style={{ width: '100px', height: '100px', minWidth: '100px', minHeight: '100px' }}
                                    className="w-[100px] h-[100px] bg-neutral-100 border border-black flex items-center justify-center font-black text-lg text-neutral-700 shrink-0"
                                  >
                                    {m2?.abbr || t.team_1}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <h3 className="font-black text-sm text-black uppercase tracking-tight truncate">{team2Name}</h3>
                                  <span className="text-[10px] font-mono text-neutral-500 uppercase font-bold">{m2?.abbr || t.team_1}</span>
                                </div>
                              </div>

                              <div className="text-right shrink-0 space-y-0.5">
                                <div className="flex items-center justify-end gap-1">
                                  <span className="text-[9px] uppercase font-mono text-neutral-600 font-bold">NET:</span>
                                  <span className={`px-1.5 py-0.2 text-[11px] font-mono font-black border ${outcome.netImpactT2 >= 0
                                      ? 'bg-emerald-100 text-emerald-950 border-emerald-600'
                                      : 'bg-red-100 text-red-950 border-red-600'
                                    }`}>
                                    {outcome.netImpactT2 >= 0 ? `+${outcome.netImpactT2} PTS` : `${outcome.netImpactT2} PTS`}
                                  </span>
                                </div>
                                <div className="text-[9px] font-mono text-neutral-500">
                                  Grade: <strong className="text-black text-xs">{outcome.gradeT2}</strong> ({outcome.t2Share}%)
                                </div>
                              </div>
                            </div>

                            {/* Acquired Assets Sub-Cards */}
                            <div className="space-y-1.5">
                              <p className="text-[9px] font-mono uppercase font-black tracking-wider text-black flex items-center gap-1">
                                <span>📥 ACQUIRED ASSETS ({outcome.receivedByT2.totalValue} PTS)</span>
                              </p>
                              {outcome.receivedByT2.items.length === 0 ? (
                                <div className="p-2 bg-neutral-50 border border-dashed border-neutral-300 text-neutral-400 text-xs italic text-center">
                                  No assets acquired.
                                </div>
                              ) : (
                                outcome.receivedByT2.items.map((item, idx) => {
                                  if (item.isPick && item.draftedPlayer) {
                                    return (
                                      <div
                                        key={idx}
                                        className="bg-[#fdfaf5] border-2 border-black p-2.5 shadow-2xs hover:border-black transition-all group"
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-8 h-8 bg-black text-amber-400 border border-black flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                              <Sparkles className="w-4 h-4 text-amber-400" />
                                            </div>

                                            <div className="min-w-0">
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="text-xs font-sans font-bold text-black">
                                                  {item.pickYear ? `${item.pickYear} ` : ''}{item.pickRound}
                                                  {item.draftedPlayer.pickNumber ? ` (#${item.draftedPlayer.pickNumber})` : ''}
                                                </span>
                                                <span className="text-[9px] font-mono font-bold bg-amber-200 text-amber-950 px-1.5 py-0.2 border border-amber-500 uppercase tracking-tight">
                                                  🎯 Selection Made
                                                </span>
                                              </div>

                                              <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                                                {item.draftedPlayer.wasPassed ? (
                                                  <span className="text-[11px] font-mono text-neutral-500 italic">
                                                    Pick Passed (No Selection)
                                                  </span>
                                                ) : (
                                                  <>
                                                    <Link
                                                      href={`/players?q=${encodeURIComponent(item.draftedPlayer.name)}`}
                                                      className="text-xs font-sans font-black text-blue-900 group-hover:underline flex items-center gap-1 uppercase"
                                                    >
                                                      <span>{item.draftedPlayer.pos ? `${item.draftedPlayer.pos} ` : ''}{item.draftedPlayer.name}</span>
                                                      <ArrowUpRight className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                                                    </Link>
                                                    {item.draftedPlayer.ovr && (
                                                      <span className="text-[10px] font-mono font-black bg-black text-white px-1 py-0.2">
                                                        OVR {item.draftedPlayer.ovr}
                                                      </span>
                                                    )}
                                                  </>
                                                )}
                                              </div>
                                            </div>
                                          </div>

                                          <div className="text-right shrink-0">
                                            <span className="text-[10px] font-mono font-black text-black bg-neutral-100 px-1.5 py-0.5 border border-neutral-300">
                                              {item.value} PTS
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div
                                      key={idx}
                                      className="bg-[#fbf9f5] border border-black/20 hover:border-black p-2 flex items-center justify-between gap-2"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-6 h-6 bg-black text-white flex items-center justify-center font-bold text-xs shrink-0">
                                          {item.isPick ? <Calendar className="w-3 h-3 text-white" /> : <UserCheck className="w-3 h-3 text-white" />}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-xs font-sans font-bold text-black truncate">{item.raw}</p>
                                          <p className="text-[9px] font-mono text-neutral-500">
                                            {item.isPick ? `${item.pickYear || 'Future'} Draft Pick (Pending Selection)` : 'Roster Asset'}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="text-right shrink-0">
                                        <span className="text-[10px] font-mono font-black text-black bg-neutral-100 px-1.5 py-0.5 border border-neutral-300">
                                          {item.value} PTS
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          <div className="mt-3 pt-1.5 border-t border-black/10 text-[9px] font-mono text-neutral-500 flex justify-between">
                            <span>Sent: <strong>{outcome.sentByT2.totalValue} pts</strong></span>
                            <span>Acquired: <strong>{outcome.receivedByT2.totalValue} pts</strong></span>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}