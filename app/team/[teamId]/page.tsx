"use client";

import React, { useState, useEffect, useMemo, use, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const SEASON_TYPES: Record<number, string> = {
  1: 'W', 2: 'W', 3: 'W', 4: 'W', 5: 'Q', 6: 'W', 7: 'Q', 8: 'Q', 9: 'W', 10: 'Q',
  11: 'W', 12: 'Q', 13: 'Q', 14: 'W', 15: 'Q', 16: 'G', 17: 'Q', 18: 'W', 19: 'Q', 20: 'V',
  21: 'Q', 22: 'W', 23: 'Q', 24: 'W', 25: 'Q', 26: 'Q', 27: 'Q', 28: 'W', 29: 'Q', 30: 'Q',
  31: 'W', 32: 'Q', 33: 'W', 34: 'Q', 35: 'W', 36: 'Q', 37: 'W', 38: 'W', 39: 'O', 40: 'W'
};

const formatSeasonBadge = (seasonId: number | string, seasonName?: string) => {
  if (seasonName) {
    const trimmed = seasonName.trim();
    const match = trimmed.match(/^([A-Za-z]+)\s*(\d+)$/);
    if (match) {
      const prefix = match[1].toUpperCase();
      const num = match[2].padStart(2, '0');
      return `${prefix}${num}`;
    }
    if (/^[A-Za-z]\d+$/i.test(trimmed)) {
      return trimmed.toUpperCase();
    }
  }
  const numId = Number(seasonId);
  const type = SEASON_TYPES[numId] || 'W';
  return `${type}${String(numId).padStart(2, '0')}`;
};

function TeamPageContent({ teamId }: { teamId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const seasonParam = searchParams.get('season');

  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(
    seasonParam ? Number(seasonParam) : null
  );
  const [allLeagueTeams, setAllLeagueTeams] = useState<any[]>([]);
  const [team, setTeam] = useState<any>(null);
  const [coachName, setCoachName] = useState<string>('TBA');
  const [coachId, setCoachId] = useState<number | null>(null);
  const [arenaName, setArenaName] = useState<string>('TBD');
  const [currentStanding, setCurrentStanding] = useState<any>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'roster' | 'schedule' | 'seasons' | 'records'>('roster');

  // Season Specific Data
  const [roster, setRoster] = useState<any[]>([]);
  const [playerStats, setPlayerStats] = useState<any[]>([]);
  const [scheduleGames, setScheduleGames] = useState<any[]>([]);

  // Coach Career Data Across ALL Seasons
  const [coachSeasonsStandings, setCoachSeasonsStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch seasons dynamically
  useEffect(() => {
    async function init() {
      try {
        let { data: seasonData, error } = await supabase
          .from('league_seasons')
          .select('*')
          .order('league_id', { ascending: false });

        if (error || !seasonData || seasonData.length === 0) {
          const fallback = await supabase
            .from('leagues')
            .select('*')
            .order('league_id', { ascending: false });

          if (fallback.data && fallback.data.length > 0) {
            seasonData = fallback.data.map((l: any) => ({
              ...l,
              league_id: l.league_id || l.id,
              season_name: l.league_name || l.name || `Season ${l.league_id || l.id}`
            }));
          }
        }

        const validSeasons = seasonData || [];
        setSeasons(validSeasons);

        if (seasonParam) {
          setSelectedSeason(Number(seasonParam));
        } else if (validSeasons.length > 0 && selectedSeason === null) {
          setSelectedSeason(Number(validSeasons[0].league_id));
        }
      } catch (e) {
        console.error("Seasons load error:", e);
      }
    }
    init();
  }, [seasonParam]);

  // 2. Fetch all teams once for opponent names/logos and cross-season tracking
  useEffect(() => {
    async function loadAllTeams() {
      const { data } = await supabase.from('league_teams').select('*');
      setAllLeagueTeams(data || []);
    }
    loadAllTeams();
  }, []);

  // 3. Fetch Team, Roster, Player Stats, Schedule & Coach All-Season Standings
  useEffect(() => {
    async function loadData() {
      if (!teamId || selectedSeason === null) return;
      setLoading(true);

      try {
        // A. Team Metadata for active season
        let { data: teamData } = await supabase
          .from('league_teams')
          .select('*')
          .eq('team_id', teamId)
          .eq('league_id', selectedSeason)
          .maybeSingle();

        if (!teamData) {
          const fallback = await supabase
            .from('league_teams')
            .select('*')
            .eq('team_id', teamId)
            .limit(1)
            .maybeSingle();
          teamData = fallback.data;
        }

        let resolvedCoachId: number | null = null;
        let resolvedCoachName = 'TBA';

        if (teamData) {
          setTeam(teamData);
          resolvedCoachId = teamData.coach_id ? Number(teamData.coach_id) : null;
          setCoachId(resolvedCoachId);

          // Parse Arena
          let parsedArena = teamData.arena || teamData.arena_name || '';
          if (!parsedArena && teamData.team_meta) {
            if (typeof teamData.team_meta === 'object') {
              parsedArena = teamData.team_meta.arena || teamData.team_meta.arena_name || teamData.team_meta.stadium || '';
            } else if (typeof teamData.team_meta === 'string') {
              try {
                const parsed = JSON.parse(teamData.team_meta);
                parsedArena = parsed.arena || parsed.arena_name || parsed.stadium || '';
              } catch {
                parsedArena = teamData.team_meta;
              }
            }
          }
          setArenaName(parsedArena || 'TBD');

          // Fetch Coach Name
          if (teamData.coach_id) {
            const { data: coachData } = await supabase
              .from('league_coaches')
              .select('coach_name')
              .eq('coach_id', teamData.coach_id)
              .maybeSingle();
            resolvedCoachName = coachData?.coach_name || teamData.coach_name || 'TBA';
          } else {
            resolvedCoachName = teamData.coach_name || 'TBA';
          }
          setCoachName(resolvedCoachName);
        }

        // B. Roster for this team in the selected season
        const { data: rosterData } = await supabase
          .from('league_rosters')
          .select('*')
          .eq('team_id', Number(teamId))
          .eq('league_id', Number(selectedSeason));

        setRoster(rosterData || []);

        // C. Player Stats for this season
        const { data: statsData } = await supabase
          .from('api_stats_with_names')
          .select('*')
          .eq('league_id', Number(selectedSeason));

        setPlayerStats(statsData || []);

        // D. Schedule & Gamestats for this team in the selected season
        const [schedRes, gamestatsRes] = await Promise.all([
          supabase
            .from('league_schedule')
            .select('*')
            .eq('league_id', Number(selectedSeason))
            .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
            .order('game_id', { ascending: true }),
          supabase
            .from('league_gamestats')
            .select('*')
            .eq('league_id', Number(selectedSeason))
            .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
            .order('game_id', { ascending: true })
        ]);

        const scheduleList = schedRes.data || [];
        const gamestatsList = gamestatsRes.data || [];

        // Merge schedule with actual results
        const mergedGames = scheduleList.map((sched: any) => {
          const matchedStats = gamestatsList.find((g: any) => String(g.game_id) === String(sched.game_id));
          const isHome = Number(sched.home_team_id) === Number(teamId);
          const oppId = isHome ? sched.away_team_id : sched.home_team_id;

          const homeScore = matchedStats?.home_score ?? sched.home_score ?? null;
          const awayScore = matchedStats?.away_score ?? sched.away_score ?? null;

          const teamScore = isHome ? homeScore : awayScore;
          const oppScore = isHome ? awayScore : homeScore;

          let outcome: 'W' | 'L' | 'T' | 'OTL' | '-' = '-';
          if (teamScore !== null && oppScore !== null) {
            let isOT = false;
            let isTie = false;
            const meta = matchedStats?.game_meta || sched.game_meta;
            if (meta) {
              try {
                const pMeta = typeof meta === 'string' ? JSON.parse(meta) : meta;
                isOT = pMeta.is_ot === true || pMeta.is_ot === 'true' || pMeta.is_ot === 1;
                isTie = pMeta.is_tie === true || pMeta.is_tie === 'true' || pMeta.is_tie === 1;
              } catch { }
            }
            if (teamScore === oppScore) {
              outcome = isOT ? 'OTL' : 'T';
            } else if (teamScore > oppScore) {
              outcome = 'W';
            } else {
              outcome = isOT ? 'OTL' : 'L';
            }
          }

          return {
            ...sched,
            isHome,
            oppId,
            teamScore,
            oppScore,
            outcome,
            played: sched.played || matchedStats !== undefined
          };
        });

        // Add any played games in gamestats that weren't in schedule table
        gamestatsList.forEach((g: any) => {
          if (!mergedGames.some((m: any) => String(m.game_id) === String(g.game_id))) {
            const isHome = Number(g.home_team_id) === Number(teamId);
            const oppId = isHome ? g.away_team_id : g.home_team_id;
            const teamScore = isHome ? g.home_score : g.away_score;
            const oppScore = isHome ? g.away_score : g.home_score;
            let outcome: 'W' | 'L' | 'T' | 'OTL' | '-' = '-';
            if (teamScore !== null && oppScore !== null) {
              if (teamScore > oppScore) outcome = 'W';
              else if (teamScore < oppScore) outcome = 'L';
              else outcome = 'T';
            }
            mergedGames.push({
              game_id: g.game_id,
              league_id: selectedSeason,
              home_team_id: g.home_team_id,
              away_team_id: g.away_team_id,
              isHome,
              oppId,
              teamScore,
              oppScore,
              outcome,
              played: true
            });
          }
        });

        setScheduleGames(mergedGames.sort((a: any, b: any) => Number(a.game_id) - Number(b.game_id)));

        // E. Standings for Current Season for this specific team
        const { data: currentStandRes } = await supabase
          .from('league_standings')
          .select('*')
          .eq('team_id', Number(teamId))
          .eq('season_id', Number(selectedSeason))
          .maybeSingle();

        setCurrentStanding(currentStandRes || null);

        // F. FETCH ALL SEASONS FOR THIS COACH (ACROSS ALL TEAMS)
        let coachTeamsList: any[] = [];
        if (resolvedCoachId) {
          const { data: cTeams } = await supabase
            .from('league_teams')
            .select('*')
            .eq('coach_id', resolvedCoachId);
          coachTeamsList = cTeams || [];
        }

        if (coachTeamsList.length === 0 && resolvedCoachName && resolvedCoachName !== 'TBA') {
          const { data: nameTeams } = await supabase
            .from('league_teams')
            .select('*')
            .ilike('coach_name', `%${resolvedCoachName}%`);
          if (nameTeams && nameTeams.length > 0) {
            coachTeamsList = nameTeams;
          }
        }

        if (coachTeamsList.length === 0 && teamData) {
          coachTeamsList = [teamData];
        }

        const coachTeamIds = Array.from(new Set(coachTeamsList.map((t: any) => Number(t.team_id))));

        const { data: coachAllStandingsData } = await supabase
          .from('league_standings')
          .select('*')
          .in('team_id', coachTeamIds);

        const mappedCoachStandings = (coachAllStandingsData || []).map((s: any) => {
          const matchingTeam = coachTeamsList.find((t: any) =>
            Number(t.team_id) === Number(s.team_id) && Number(t.league_id) === Number(s.season_id)
          ) || coachTeamsList.find((t: any) => Number(t.team_id) === Number(s.team_id))
            || teamData;

          const seasonObj = seasons.find((sea: any) => Number(sea.league_id) === Number(s.season_id));
          const sName = seasonObj?.season_name || `Season ${s.season_id}`;
          const sCode = formatSeasonBadge(s.season_id, sName);

          const w = Number(s.w) || 0;
          const l = Number(s.l) || 0;
          const t = Number(s.t) || 0;
          const otl = Number(s.otl) || 0;
          const pts = s.pts !== undefined ? Number(s.pts) : (w * 2 + otl + t);
          const gf = Number(s.gf) || 0;
          const ga = Number(s.ga) || 0;
          const gd = gf - ga;

          return {
            ...s,
            season_name: sName,
            season_code: sCode,
            team_id: matchingTeam?.team_id || s.team_id,
            team_name: matchingTeam?.team_name || teamData?.team_name || 'Team',
            logo_url: matchingTeam?.logo_url || teamData?.logo_url || '',
            w, l, t, otl, pts, gf, ga, gd
          };
        });

        setCoachSeasonsStandings(mappedCoachStandings);

      } catch (err) {
        console.error("Error loading team page data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [teamId, selectedSeason, seasons]);

  const handleSeasonChange = (newSeason: number, targetTeamId?: number) => {
    setSelectedSeason(newSeason);
    const destTeamId = targetTeamId || teamId;
    router.push(`/team/${destTeamId}?season=${newSeason}`);
  };

  // Helper map to find opponent team name & logo
  const opponentMap = useMemo(() => {
    const map: Record<number, { name: string; logo: string; abbr: string }> = {};
    allLeagueTeams.forEach((t: any) => {
      map[Number(t.team_id)] = {
        name: t.team_name,
        logo: t.logo_url,
        abbr: t.abbreviation || t.team_name?.slice(0, 3) || 'TM'
      };
    });
    return map;
  }, [allLeagueTeams]);

  // Combine Roster with Player Stats
  const combinedRosterStats = useMemo(() => {
    return roster.map((p: any) => {
      const cleanName = (p.player_name || '').trim().toLowerCase();
      const matchedStat = playerStats.find((s: any) => {
        const sClean = (s.player_name || '').trim().toLowerCase();
        return (p.player_id && Number(s.player_id) === Number(p.player_id)) || (cleanName && sClean === cleanName);
      });

      return {
        ...p,
        gp: matchedStat?.gp ?? 0,
        goals: matchedStat?.total_goals ?? matchedStat?.goals ?? 0,
        assists: matchedStat?.total_assists ?? matchedStat?.assists ?? 0,
        points: matchedStat?.total_points ?? matchedStat?.points ?? 0,
        shots: matchedStat?.shots ?? 0,
        pim: matchedStat?.pim ?? 0,
        gaa: matchedStat?.gaa ?? null,
        sv_pct: matchedStat?.sv_pct ?? null,
        shutouts: matchedStat?.shutouts ?? 0,
        wins: matchedStat?.wins ?? 0,
        losses: matchedStat?.losses ?? 0
      };
    }).sort((a: any, b: any) => (b.points || 0) - (a.points || 0) || (b.overall || 0) - (a.overall || 0));
  }, [roster, playerStats]);

  // Skaters vs Goalies
  const skaters = useMemo(() => combinedRosterStats.filter((p: any) => (p.pos || '').toUpperCase() !== 'G'), [combinedRosterStats]);
  const goalies = useMemo(() => combinedRosterStats.filter((p: any) => (p.pos || '').toUpperCase() === 'G'), [combinedRosterStats]);

  // Comparative Coach Career Statistics & Records Across All Seasons
  const coachCareerRecords = useMemo(() => {
    if (coachSeasonsStandings.length === 0) return null;

    let totalGP = 0;
    let totalW = 0;
    let totalL = 0;
    let totalT = 0;
    let totalOTL = 0;
    let totalPTS = 0;
    let totalGF = 0;
    let totalGA = 0;

    let bestSeasonByPts: any = null;
    let bestSeasonByWins: any = null;
    let mostGFSeason: any = null;
    let bestGDSeason: any = null;

    coachSeasonsStandings.forEach((s: any) => {
      const gp = Number(s.gp) || 0;
      const w = Number(s.w) || 0;
      const l = Number(s.l) || 0;
      const t = Number(s.t) || 0;
      const otl = Number(s.otl) || 0;
      const pts = s.pts !== undefined ? Number(s.pts) : (w * 2 + otl + t);
      const gf = Number(s.gf) || 0;
      const ga = Number(s.ga) || 0;
      const gd = gf - ga;

      totalGP += gp;
      totalW += w;
      totalL += l;
      totalT += t;
      totalOTL += otl;
      totalPTS += pts;
      totalGF += gf;
      totalGA += ga;

      if (!bestSeasonByPts || pts > (bestSeasonByPts.pts || 0)) {
        bestSeasonByPts = { ...s, pts };
      }
      if (!bestSeasonByWins || w > (bestSeasonByWins.w || 0)) {
        bestSeasonByWins = { ...s, w };
      }
      if (!mostGFSeason || gf > (mostGFSeason.gf || 0)) {
        mostGFSeason = { ...s, gf };
      }
      if (!bestGDSeason || gd > (bestGDSeason.gd || 0)) {
        bestGDSeason = { ...s, gd };
      }
    });

    const winPct = totalGP > 0 ? ((totalW + totalT * 0.5) / totalGP).toFixed(3) : '.000';

    return {
      totalSeasons: coachSeasonsStandings.length,
      totalGP,
      totalW,
      totalL,
      totalT,
      totalOTL,
      totalPTS,
      totalGF,
      totalGA,
      winPct,
      bestSeasonByPts,
      bestSeasonByWins,
      mostGFSeason,
      bestGDSeason
    };
  }, [coachSeasonsStandings]);

  // Coach seasons list for the archive dropdown
  const coachSeasonsList = useMemo(() => {
    if (coachSeasonsStandings.length === 0) {
      return seasons.filter(s => Number(s.league_id) === Number(selectedSeason));
    }
    return [...coachSeasonsStandings].sort((a, b) => Number(b.season_id) - Number(a.season_id));
  }, [coachSeasonsStandings, seasons, selectedSeason]);

  if (loading) return <div className="p-8 font-serif italic text-sm text-center">Loading Gazette Team & Coach Archives...</div>;
  if (!team) return <div className="p-8 font-serif italic text-sm text-center">Team file not found.</div>;

  const currentSeasonName = seasons.find(s => Number(s.league_id) === Number(selectedSeason))?.season_name || `Season ${selectedSeason}`;
  const currentSeasonBadge = formatSeasonBadge(selectedSeason || '', currentSeasonName);

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-black font-serif p-4 sm:p-6">
      {/* 1. Header Banner */}
      <header className="border-b-4 border-black pb-6 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white border-2 border-black p-2 flex items-center justify-center rounded shadow-sm">
              <img src={team.logo_url} alt={team.team_name} className="max-h-full max-w-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter">{team.team_name}</h1>
                <span className="bg-black text-white px-2 py-0.5 text-xs font-bold uppercase rounded">
                  {currentSeasonBadge}
                </span>
              </div>
              <p className="text-xs font-bold uppercase italic mt-1 text-gray-700">
                Official Gazette Team Roster & Coach Career Archives
              </p>
            </div>
          </div>
          <Link
            href="/team"
            className="bg-black text-white border-2 border-black px-4 py-2 text-xs font-black uppercase hover:bg-neutral-800 transition shadow-xs flex items-center gap-1.5 self-start md:self-center cursor-pointer"
          >
            &larr; Return to Teams
          </Link>
        </div>

        {/* Season Selector & Key Info Pills */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 bg-white/80 border border-black/20 p-3 rounded">
          <div className="flex items-center gap-3">
            <label className="text-xs uppercase font-black">Archive Season:</label>
            <select
              value={selectedSeason || ""}
              onChange={(e) => {
                const chosenSeasonId = Number(e.target.value);
                const chosenRecord = coachSeasonsList.find(s => Number(s.season_id) === chosenSeasonId);
                handleSeasonChange(chosenSeasonId, chosenRecord?.team_id ? Number(chosenRecord.team_id) : undefined);
              }}
              className="bg-white border-2 border-black px-3 py-1 text-xs font-black uppercase cursor-pointer outline-none"
            >
              {coachSeasonsList.map(s => {
                const sBadge = s.season_code || s.season_name || `Season ${s.season_id}`;
                const tName = s.team_name ? ` - ${s.team_name}` : '';
                return (
                  <option key={`${s.season_id}-${s.team_id}`} value={s.season_id}>
                    {sBadge}{tName}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Team & Coach Summary Pills with Black Lettering */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-bold uppercase">
            <span className="bg-black text-white px-2.5 py-1 rounded">
              Coach: {coachName}
            </span>
            <span className="bg-black text-white px-2.5 py-1 rounded">
              Arena: {arenaName}
            </span>
            {currentStanding && (
              <span className="bg-yellow-400 text-black px-2.5 py-1 rounded font-black border border-black">
                Season: {currentStanding.w}-{currentStanding.l}-{currentStanding.t}-{currentStanding.otl} ({currentStanding.pts} pts)
              </span>
            )}
            {coachCareerRecords && (
              <span className="bg-white text-black px-2.5 py-1 rounded font-black border-2 border-black shadow-xs">
                Coach Career: {coachCareerRecords.totalW}-{coachCareerRecords.totalL}-{coachCareerRecords.totalT}-{coachCareerRecords.totalOTL} ({coachCareerRecords.totalPTS} pts)
              </span>
            )}
          </div>
        </div>
      </header>

      {/* 2. Navigation Tabs */}
      <nav className="flex flex-wrap gap-2 border-b-2 border-black pb-2 mb-6">
        <button
          onClick={() => setActiveTab('roster')}
          className={`px-4 py-2 text-xs font-black uppercase transition border border-black cursor-pointer ${activeTab === 'roster' ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'
            }`}
        >
          Roster & Stats ({roster.length})
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2 text-xs font-black uppercase transition border border-black cursor-pointer ${activeTab === 'schedule' ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'
            }`}
        >
          Schedule & Results ({scheduleGames.length})
        </button>
        <button
          onClick={() => setActiveTab('seasons')}
          className={`px-4 py-2 text-xs font-black uppercase transition border border-black cursor-pointer ${activeTab === 'seasons' ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'
            }`}
        >
          Coach All-Time Season Log ({coachSeasonsStandings.length} Seasons)
        </button>
        <button
          onClick={() => setActiveTab('records')}
          className={`px-4 py-2 text-xs font-black uppercase transition border border-black cursor-pointer ${activeTab === 'records' ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'
            }`}
        >
          Coach Career Records & Bests
        </button>
      </nav>

      {/* 3. Tab Contents */}

      {/* TAB 1: ROSTER & PLAYER STATS */}
      {activeTab === 'roster' && (
        <div className="space-y-8">
          {/* Skaters Table */}
          <section className="bg-white border-2 border-black p-4 shadow-sm">
            <h2 className="text-xl font-black uppercase tracking-tight mb-3 pb-2 border-b-2 border-black flex justify-between items-center">
              <span>{currentSeasonName} Skaters</span>
              <span className="text-xs font-bold text-gray-500">{skaters.length} Players</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-black text-white uppercase text-[10px] font-black">
                    <th className="p-2">#</th>
                    <th className="p-2">Player Name</th>
                    <th className="p-2 text-center">Pos</th>
                    <th className="p-2 text-center">Ovr</th>
                    <th className="p-2 text-center">GP</th>
                    <th className="p-2 text-center">G</th>
                    <th className="p-2 text-center">A</th>
                    <th className="p-2 text-center font-black bg-gray-900">PTS</th>
                    <th className="p-2 text-center">SOG</th>
                    <th className="p-2 text-center">PIM</th>
                  </tr>
                </thead>
                <tbody>
                  {skaters.length > 0 ? (
                    skaters.map((p, idx) => (
                      <tr key={p.roster_id || idx} className={`border-b border-gray-200 font-bold hover:bg-yellow-50 ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                        <td className="p-2 text-gray-600">{p.jersey_number || '-'}</td>
                        <td className="p-2 uppercase font-black text-black">{p.player_name || 'Unknown'}</td>
                        <td className="p-2 text-center">{p.pos || '-'}</td>
                        <td className="p-2 text-center text-blue-700 font-black">{p.overall || '-'}</td>
                        <td className="p-2 text-center">{p.gp}</td>
                        <td className="p-2 text-center">{p.goals}</td>
                        <td className="p-2 text-center">{p.assists}</td>
                        <td className="p-2 text-center font-black bg-gray-100 text-black">{p.points}</td>
                        <td className="p-2 text-center">{p.shots}</td>
                        <td className="p-2 text-center">{p.pim}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="p-4 text-center text-xs font-bold uppercase italic text-gray-500">
                        No skater records found for {currentSeasonName}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Goalies Table */}
          {goalies.length > 0 && (
            <section className="bg-white border-2 border-black p-4 shadow-sm">
              <h2 className="text-xl font-black uppercase tracking-tight mb-3 pb-2 border-b-2 border-black flex justify-between items-center">
                <span>{currentSeasonName} Goalies</span>
                <span className="text-xs font-bold text-gray-500">{goalies.length} Goalies</span>
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-black text-white uppercase text-[10px] font-black">
                      <th className="p-2">#</th>
                      <th className="p-2">Goalie Name</th>
                      <th className="p-2 text-center">Pos</th>
                      <th className="p-2 text-center">Ovr</th>
                      <th className="p-2 text-center">GP</th>
                      <th className="p-2 text-center">W</th>
                      <th className="p-2 text-center">L</th>
                      <th className="p-2 text-center">GAA</th>
                      <th className="p-2 text-center">SV%</th>
                      <th className="p-2 text-center">SO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {goalies.map((p, idx) => (
                      <tr key={p.roster_id || idx} className={`border-b border-gray-200 font-bold hover:bg-yellow-50 ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                        <td className="p-2 text-gray-600">{p.jersey_number || '-'}</td>
                        <td className="p-2 uppercase font-black text-black">{p.player_name || 'Unknown'}</td>
                        <td className="p-2 text-center">{p.pos || 'G'}</td>
                        <td className="p-2 text-center text-blue-700 font-black">{p.overall || '-'}</td>
                        <td className="p-2 text-center">{p.gp}</td>
                        <td className="p-2 text-center">{p.wins}</td>
                        <td className="p-2 text-center">{p.losses}</td>
                        <td className="p-2 text-center">{p.gaa != null ? Number(p.gaa).toFixed(2) : '-'}</td>
                        <td className="p-2 text-center">{p.sv_pct != null ? Number(p.sv_pct).toFixed(3) : '-'}</td>
                        <td className="p-2 text-center">{p.shutouts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {/* TAB 2: SCHEDULE & RESULTS */}
      {activeTab === 'schedule' && (
        <section className="bg-white border-2 border-black p-4 shadow-sm">
          <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-4">
            <h2 className="text-xl font-black uppercase tracking-tight">
              {currentSeasonName} Schedule & Game Logs
            </h2>
            <span className="text-xs font-bold uppercase text-gray-600">
              {scheduleGames.filter(g => g.played).length} Played / {scheduleGames.length} Total
            </span>
          </div>

          {scheduleGames.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-black text-white uppercase text-[10px] font-black">
                    <th className="p-2">Game #</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Opponent</th>
                    <th className="p-2 text-center">Score</th>
                    <th className="p-2 text-center">Result</th>
                    <th className="p-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleGames.map((game, idx) => {
                    const opp = opponentMap[Number(game.oppId)] || {
                      name: `Team #${game.oppId}`,
                      logo: '',
                      abbr: `TM${game.oppId}`
                    };

                    let badgeColor = 'bg-gray-200 text-gray-700';
                    if (game.outcome === 'W') badgeColor = 'bg-green-600 text-white';
                    if (game.outcome === 'L') badgeColor = 'bg-red-600 text-white';
                    if (game.outcome === 'T') badgeColor = 'bg-blue-600 text-white';
                    if (game.outcome === 'OTL') badgeColor = 'bg-amber-600 text-white';

                    return (
                      <tr key={game.game_id || idx} className={`border-b border-gray-200 font-bold hover:bg-yellow-50 ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                        <td className="p-2 text-gray-600 font-mono">#{game.game_id || idx + 1}</td>
                        <td className="p-2 uppercase text-[11px]">
                          {game.isHome ? (
                            <span className="bg-gray-200 text-black px-1.5 py-0.5 rounded font-black">HOME</span>
                          ) : (
                            <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-black">AWAY</span>
                          )}
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            {opp.logo && (
                              <img src={opp.logo} alt={opp.name} className="w-5 h-5 object-contain flex-shrink-0" />
                            )}
                            <Link href={`/team/${game.oppId}?season=${selectedSeason}`} className="uppercase hover:underline text-black font-black">
                              {opp.name}
                            </Link>
                          </div>
                        </td>
                        <td className="p-2 text-center font-mono font-black text-sm">
                          {game.played && game.teamScore !== null && game.oppScore !== null ? (
                            <span>{game.teamScore} - {game.oppScore}</span>
                          ) : (
                            <span className="text-gray-400 font-normal">--</span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          {game.outcome !== '-' ? (
                            <span className={`px-2 py-0.5 text-[10px] font-black rounded ${badgeColor}`}>
                              {game.outcome}
                            </span>
                          ) : (
                            <span className="text-gray-400 font-normal">-</span>
                          )}
                        </td>
                        <td className="p-2 text-center uppercase text-[10px]">
                          {game.played ? (
                            <span className="text-green-700 font-black">FINAL</span>
                          ) : (
                            <span className="text-gray-500 italic">UPCOMING</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-xs font-bold uppercase italic text-gray-500">
              No schedule games recorded for {currentSeasonName}.
            </div>
          )}
        </section>
      )}

      {/* TAB 3: COACH ALL-TIME SEASON LOG (ACROSS ALL SEASONS & TEAMS) */}
      {activeTab === 'seasons' && (
        <section className="bg-white border-2 border-black p-4 shadow-sm">
          <div className="border-b-2 border-black pb-2 mb-4">
            <h2 className="text-xl font-black uppercase tracking-tight">
              All-Time Career Seasons for Coach: {coachName}
            </h2>
            <p className="text-xs font-bold uppercase italic text-gray-600 mt-0.5">
              Historical records across all seasons & teams coached by {coachName}. Click any season to load that team archive.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-black text-white uppercase text-[10px] font-black">
                  <th className="p-2">Season</th>
                  <th className="p-2">Team Coached</th>
                  <th className="p-2 text-center">GP</th>
                  <th className="p-2 text-center">W</th>
                  <th className="p-2 text-center">L</th>
                  <th className="p-2 text-center">T</th>
                  <th className="p-2 text-center">OTL</th>
                  <th className="p-2 text-center font-black bg-gray-900">PTS</th>
                  <th className="p-2 text-center">GF</th>
                  <th className="p-2 text-center">GA</th>
                  <th className="p-2 text-center">Diff</th>
                  <th className="p-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {coachSeasonsStandings.length > 0 ? (
                  coachSeasonsStandings
                    .sort((a, b) => Number(b.season_id) - Number(a.season_id))
                    .map((s, idx) => {
                      const isCurrent = Number(s.season_id) === Number(selectedSeason) && Number(s.team_id) === Number(teamId);
                      const w = Number(s.w) || 0;
                      const l = Number(s.l) || 0;
                      const t = Number(s.t) || 0;
                      const otl = Number(s.otl) || 0;
                      const pts = s.pts !== undefined ? Number(s.pts) : (w * 2 + otl + t);
                      const gf = Number(s.gf) || 0;
                      const ga = Number(s.ga) || 0;
                      const diff = gf - ga;

                      return (
                        <tr
                          key={`${s.season_id}-${s.team_id || idx}`}
                          onClick={() => handleSeasonChange(Number(s.season_id), Number(s.team_id))}
                          className={`border-b border-gray-200 font-bold cursor-pointer transition ${isCurrent
                              ? 'bg-yellow-200 border-2 border-black font-black'
                              : idx % 2 === 0 ? 'bg-gray-50 hover:bg-yellow-50' : 'bg-white hover:bg-yellow-50'
                            }`}
                        >
                          <td className="p-2 uppercase flex items-center gap-2">
                            <span className="font-black">{s.season_code || s.season_name}</span>
                            {isCurrent && (
                              <span className="bg-black text-white text-[9px] px-1.5 py-0.5 rounded font-black">
                                ACTIVE
                              </span>
                            )}
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              {s.logo_url && (
                                <img src={s.logo_url} alt={s.team_name} className="w-5 h-5 object-contain flex-shrink-0" />
                              )}
                              <span className="font-black uppercase text-black">{s.team_name}</span>
                            </div>
                          </td>
                          <td className="p-2 text-center">{s.gp || (w + l + t + otl)}</td>
                          <td className="p-2 text-center">{w}</td>
                          <td className="p-2 text-center">{l}</td>
                          <td className="p-2 text-center">{t}</td>
                          <td className="p-2 text-center">{otl}</td>
                          <td className="p-2 text-center font-black bg-gray-100 text-black">{pts}</td>
                          <td className="p-2 text-center">{gf}</td>
                          <td className="p-2 text-center">{ga}</td>
                          <td className={`p-2 text-center font-black ${diff > 0 ? 'text-green-700' : diff < 0 ? 'text-red-700' : 'text-gray-500'}`}>
                            {diff > 0 ? `+${diff}` : diff}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSeasonChange(Number(s.season_id), Number(s.team_id));
                              }}
                              className={`text-[10px] uppercase font-black px-2 py-0.5 border border-black rounded transition cursor-pointer ${isCurrent ? 'bg-black text-white' : 'bg-white hover:bg-black hover:text-white'
                                }`}
                            >
                              {isCurrent ? 'Viewing' : 'Select'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                ) : (
                  <tr>
                    <td colSpan={12} className="p-4 text-center text-xs font-bold uppercase italic text-gray-500">
                      No career standings archived for coach {coachName}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 4: COACH CAREER RECORDS & ALL-TIME BESTS */}
      {activeTab === 'records' && coachCareerRecords && (
        <div className="space-y-6">
          {/* Summary Box */}
          <div className="bg-white border-2 border-black p-6 shadow-sm">
            <h2 className="text-2xl font-black uppercase tracking-tight border-b-2 border-black pb-2 mb-4">
              Coach Career Totals & All-Time Highs ({coachName})
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 text-center">
              <div className="border border-black p-3 bg-gray-50">
                <p className="text-[10px] font-black uppercase text-gray-600">Seasons Coached</p>
                <p className="text-2xl font-black">{coachCareerRecords.totalSeasons}</p>
              </div>
              <div className="border border-black p-3 bg-gray-50">
                <p className="text-[10px] font-black uppercase text-gray-600">Career Record</p>
                <p className="text-xl font-black">{coachCareerRecords.totalW}-{coachCareerRecords.totalL}-{coachCareerRecords.totalT}-{coachCareerRecords.totalOTL}</p>
              </div>
              <div className="border border-black p-3 bg-gray-50">
                <p className="text-[10px] font-black uppercase text-gray-600">Career Points</p>
                <p className="text-2xl font-black text-blue-700">{coachCareerRecords.totalPTS}</p>
              </div>
              <div className="border border-black p-3 bg-gray-50">
                <p className="text-[10px] font-black uppercase text-gray-600">Career Win %</p>
                <p className="text-2xl font-black text-green-700">{coachCareerRecords.winPct}</p>
              </div>
            </div>

            {/* Coach Career Highs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-black p-4 bg-white">
                <h3 className="text-xs font-black uppercase text-gray-500 mb-1">Most Points in a Single Season</h3>
                <p className="text-2xl font-black text-black">
                  {coachCareerRecords.bestSeasonByPts?.pts || 0} PTS
                </p>
                <p className="text-xs font-bold text-gray-700 uppercase mt-1">
                  Achieved in {coachCareerRecords.bestSeasonByPts?.season_code || `Season ${coachCareerRecords.bestSeasonByPts?.season_id}`} with {coachCareerRecords.bestSeasonByPts?.team_name} ({coachCareerRecords.bestSeasonByPts?.w} Wins)
                </p>
              </div>

              <div className="border border-black p-4 bg-white">
                <h3 className="text-xs font-black uppercase text-gray-500 mb-1">Most Wins in a Single Season</h3>
                <p className="text-2xl font-black text-black">
                  {coachCareerRecords.bestSeasonByWins?.w || 0} Wins
                </p>
                <p className="text-xs font-bold text-gray-700 uppercase mt-1">
                  Achieved in {coachCareerRecords.bestSeasonByWins?.season_code || `Season ${coachCareerRecords.bestSeasonByWins?.season_id}`} with {coachCareerRecords.bestSeasonByWins?.team_name}
                </p>
              </div>

              <div className="border border-black p-4 bg-white">
                <h3 className="text-xs font-black uppercase text-gray-500 mb-1">Most Goals Scored in a Season</h3>
                <p className="text-2xl font-black text-black">
                  {coachCareerRecords.mostGFSeason?.gf || 0} Goals
                </p>
                <p className="text-xs font-bold text-gray-700 uppercase mt-1">
                  Achieved in {coachCareerRecords.mostGFSeason?.season_code || `Season ${coachCareerRecords.mostGFSeason?.season_id}`} with {coachCareerRecords.mostGFSeason?.team_name}
                </p>
              </div>

              <div className="border border-black p-4 bg-white">
                <h3 className="text-xs font-black uppercase text-gray-500 mb-1">Best Goal Differential</h3>
                <p className="text-2xl font-black text-green-700">
                  +{coachCareerRecords.bestGDSeason?.gd || 0} Diff
                </p>
                <p className="text-xs font-bold text-gray-700 uppercase mt-1">
                  Achieved in {coachCareerRecords.bestGDSeason?.season_code || `Season ${coachCareerRecords.bestGDSeason?.season_id}`} with {coachCareerRecords.bestGDSeason?.team_name}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Return to Teams navigation */}
      <div className="mt-10 pt-6 border-t-2 border-black flex flex-col sm:flex-row justify-between items-center gap-4">
        <Link
          href="/team"
          className="bg-black text-white border-2 border-black px-5 py-2 text-xs font-black uppercase hover:bg-neutral-800 transition shadow-sm inline-flex items-center gap-2 cursor-pointer"
        >
          &larr; Return to All Teams Directory
        </Link>
        <span className="text-xs font-bold uppercase italic text-gray-600">
          Official NHL95 League Gazette Archive
        </span>
      </div>
    </div>
  );
}

export default function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const resolvedParams = use(params);
  const { teamId } = resolvedParams;

  return (
    <Suspense fallback={<div className="p-8 font-serif italic text-sm text-center">Loading Gazette Team Files...</div>}>
      <TeamPageContent teamId={teamId} />
    </Suspense>
  );
}