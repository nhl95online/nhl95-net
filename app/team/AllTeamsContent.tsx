"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

const LEAGUE_LOGOS: Record<string, { name: string; logoUrl: string; fallbackUrl?: string }> = {
  W: {
    name: 'W League',
    logoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/WN95HL.png',
    fallbackUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/WN95HL.png'
  },
  Q: {
    name: 'The Q',
    logoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/TheQ.png',
    fallbackUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/TheQ.png'
  },
  O: {
    name: 'Original 6',
    logoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/Original%206.png',
    fallbackUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Original%206.png'
  },
  V: {
    name: 'Vintage',
    logoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/Vintage.png',
    fallbackUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Vintage.png'
  },
  G: {
    name: 'Golden Era',
    logoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/Golden%20Era.png',
    fallbackUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Golden%20Era.png'
  }
};

const SEASON_TYPES: Record<number, string> = {
  1: 'W', 2: 'W', 3: 'W', 4: 'W', 5: 'Q', 6: 'W', 7: 'Q', 8: 'Q', 9: 'W', 10: 'Q',
  11: 'W', 12: 'Q', 13: 'Q', 14: 'W', 15: 'Q', 16: 'G', 17: 'Q', 18: 'W', 19: 'Q', 20: 'V',
  21: 'Q', 22: 'W', 23: 'Q', 24: 'W', 25: 'Q', 26: 'Q', 27: 'Q', 28: 'W', 29: 'Q', 30: 'Q',
  31: 'W', 32: 'Q', 33: 'W', 34: 'Q', 35: 'W', 36: 'Q', 37: 'W', 38: 'W', 39: 'O', 40: 'W'
};

export const getLeaguePrefix = (league: { league_id: number | string; season_name?: string; league_name?: string }) => {
  const name = String(league.season_name || league.league_name || '').trim().toUpperCase();
  if (name) {
    const match = name.match(/^[A-Z]+/);
    if (match && match[0] && LEAGUE_LOGOS[match[0]]) return match[0];
  }
  const idNum = Number(league.league_id);
  if (SEASON_TYPES[idNum]) return SEASON_TYPES[idNum];
  return 'W';
};

export const formatSeasonBadge = (seasonId: number | string, seasonName?: string) => {
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

export default function AllTeamsContent() {
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedLeagueType, setSelectedLeagueType] = useState<string>('ALL');
  const searchParams = useSearchParams();
  const router = useRouter();
  const coachParam = searchParams.get('coach') || "";
  const seasonParam = searchParams.get('season');
  const query = searchParams.get('q') || coachParam || "";
  const [searchVal, setSearchVal] = useState(query);
  const [selectedSeason, setSelectedSeason] = useState<number>(seasonParam ? Number(seasonParam) : 0);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setSearchVal(query);
  }, [query]);

  const availableLeagueTypes = ['W', 'Q', 'O', 'V', 'G'];

  useEffect(() => {
    async function init() {
      try {
        let { data: seasonData, error } = await supabase
          .from('league_seasons')
          .select('league_id, season_name')
          .order('league_id', { ascending: false });

        if (error || !seasonData || seasonData.length === 0) {
          const fallback = await supabase
            .from('leagues')
            .select('league_id, league_name')
            .order('league_id', { ascending: false });

          if (fallback.data && fallback.data.length > 0) {
            seasonData = fallback.data.map((l: any) => ({
              league_id: l.league_id,
              season_name: l.league_name || `Season ${l.league_id}`
            }));
          }
        }

        setSeasons(seasonData || []);
      } catch (e) {
        console.error("Seasons load error:", e);
      }
    }
    init();
  }, []);

  useEffect(() => {
    async function fetchTeams() {
      setLoading(true);
      try {
        const { data: allTeamsData, error: teamsError } = await supabase
          .from('league_teams')
          .select('*');
        if (teamsError) {
          console.error("Teams Error:", teamsError.message || teamsError);
        }

        const teamsData = selectedSeason !== 0
          ? (allTeamsData || []).filter((t: any) => Number(t.league_id) === Number(selectedSeason))
          : (allTeamsData || []);

        let standingsQuery = supabase.from('league_standings').select('*');
        let statsQuery = supabase
          .from('league_gamestats')
          .select('game_id, home_score, away_score, game_meta, league_id, home_team_id, away_team_id, home_stats, away_stats');
        let schedQuery = supabase
          .from('league_schedule')
          .select('game_id, home_score, away_score, game_meta, league_id, home_team_id, away_team_id, played');

        if (selectedSeason !== 0) {
          standingsQuery = standingsQuery.eq('season_id', selectedSeason);
          statsQuery = statsQuery.eq('league_id', selectedSeason);
          schedQuery = schedQuery.eq('league_id', selectedSeason);
        }

        const [coachesRes, standingsRes, statsRes, schedRes] = await Promise.all([
          supabase.from('league_coaches').select('coach_id, coach_name'),
          standingsQuery,
          statsQuery,
          schedQuery
        ]);

        const coachesData = coachesRes.data || [];
        const standingsData = standingsRes.data || [];
        const statsData = statsRes.data || [];
        const schedData = schedRes.data || [];

        const coachMap: Record<number, string> = {};
        coachesData.forEach((c: any) => {
          if (c.coach_id !== undefined && c.coach_id !== null) {
            coachMap[Number(c.coach_id)] = c.coach_name;
          }
        });

        // Compute live records per (league_id, team_id) from league_gamestats & league_schedule (same formula as /standings)
        const computedBySeasonTeam = new Map<string, { gp: number; w: number; l: number; t: number; otl: number; pts: number; gf: number; ga: number; gd: number }>();

        const ensureRecord = (sId: number, tId: number) => {
          const key = `${sId}-${tId}`;
          let rec = computedBySeasonTeam.get(key);
          if (!rec) {
            rec = { gp: 0, w: 0, l: 0, t: 0, otl: 0, pts: 0, gf: 0, ga: 0, gd: 0 };
            computedBySeasonTeam.set(key, rec);
          }
          return rec;
        };

        const resolveTeamKeyInSeason = (rawId: any, sId: number): number | null => {
          const num = Number(rawId);
          if (!num || num === 999 || num === 0 || num === 68) return null;
          const direct = (allTeamsData || []).find((t: any) => Number(t.team_id) === num && Number(t.league_id) === sId);
          if (direct) return Number(direct.team_id);

          const matchTeam = (allTeamsData || []).find((t: any) => Number(t.team_id) === num || Number(t.coach_id) === num);
          if (matchTeam) {
            const seasonMatch = (allTeamsData || []).find((t: any) =>
              Number(t.league_id) === sId &&
              (
                (t.abbreviation && t.abbreviation.trim().toUpperCase() === (matchTeam.abbreviation || '').trim().toUpperCase()) ||
                (t.team_name && t.team_name.trim().toUpperCase() === (matchTeam.team_name || '').trim().toUpperCase()) ||
                (Number(t.coach_id) > 0 && Number(t.coach_id) === Number(matchTeam.coach_id))
              )
            );
            if (seasonMatch) return Number(seasonMatch.team_id);
          }
          return num;
        };

        const applyGame = (sId: number, rawHId: any, rawAId: any, homeScore: number, awayScore: number, gameMeta: any, statsObj?: any) => {
          if (!sId) return;
          const hId = resolveTeamKeyInSeason(rawHId, sId);
          const aId = resolveTeamKeyInSeason(rawAId, sId);
          if (!hId || !aId || hId === aId) return;

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

          const hRec = ensureRecord(sId, hId);
          const aRec = ensureRecord(sId, aId);
          hRec.gp += 1;
          aRec.gp += 1;
          hRec.gf += homeScore;
          hRec.ga += awayScore;
          hRec.gd = hRec.gf - hRec.ga;
          aRec.gf += awayScore;
          aRec.ga += homeScore;
          aRec.gd = aRec.gf - aRec.ga;

          if (isTie) {
            hRec.t += 1;
            hRec.pts += 1;
            aRec.t += 1;
            aRec.pts += 1;
          } else if (homeScore > awayScore) {
            hRec.w += 1;
            hRec.pts += 2;
            if (isOT) {
              aRec.otl += 1;
              aRec.pts += 1;
            } else {
              aRec.l += 1;
            }
          } else if (awayScore > homeScore) {
            aRec.w += 1;
            aRec.pts += 2;
            if (isOT) {
              hRec.otl += 1;
              hRec.pts += 1;
            } else {
              hRec.l += 1;
            }
          }
        };

        const processedStatsGameIds = new Set<string>();
        statsData.forEach((stats: any) => {
          const gIdStr = `${stats.league_id}-${String(stats.game_id).trim()}`;
          processedStatsGameIds.add(gIdStr);
          applyGame(
            Number(stats.league_id),
            stats.home_team_id,
            stats.away_team_id,
            Number(stats.home_score) || 0,
            Number(stats.away_score) || 0,
            stats.game_meta,
            stats
          );
        });

        schedData.forEach((game: any) => {
          const gIdStr = `${game.league_id}-${String(game.game_id).trim()}`;
          const rawPlayed = String(game.played || '').trim().toLowerCase();
          const isPlayed = rawPlayed === 'true' || rawPlayed === '1' || rawPlayed === 'y';
          if (isPlayed && !processedStatsGameIds.has(gIdStr) && game.game_meta) {
            applyGame(
              Number(game.league_id),
              game.home_team_id,
              game.away_team_id,
              Number(game.home_score) || 0,
              Number(game.away_score) || 0,
              game.game_meta,
              game
            );
          }
        });

        const seasonsWithComputedGames = new Set<number>();
        computedBySeasonTeam.forEach((rec, key) => {
          if (rec.gp > 0) {
            seasonsWithComputedGames.add(Number(key.split('-')[0]));
          }
        });

        const combined = (teamsData || []).map((team: any) => {
          const sId = selectedSeason !== 0 ? Number(selectedSeason) : Number(team.league_id);
          const tId = Number(team.team_id);
          const computedRec = computedBySeasonTeam.get(`${sId}-${tId}`);
          const dbRecord = standingsData?.find((s: any) =>
            Number(s.team_id) === tId &&
            (selectedSeason === 0 ? Number(s.season_id) === sId : true)
          );

          const useComputed = seasonsWithComputedGames.has(sId) || (computedRec && computedRec.gp > 0);
          const w = useComputed ? (computedRec?.w || 0) : (Number(dbRecord?.w) || 0);
          const l = useComputed ? (computedRec?.l || 0) : (Number(dbRecord?.l) || 0);
          const t = useComputed ? (computedRec?.t || 0) : (Number(dbRecord?.t) || 0);
          const otl = useComputed ? (computedRec?.otl || 0) : (Number(dbRecord?.otl) || 0);
          const gd = useComputed ? (computedRec?.gd || 0) : (Number(dbRecord?.gd) || 0);
          const points = useComputed
            ? (computedRec?.pts ?? ((w * 2) + otl + t))
            : (dbRecord?.pts !== undefined ? Number(dbRecord.pts) : (w * 2) + otl + t);

          // Parse arena name from team_meta or direct column
          let arenaName = team.arena || team.arena_name || '';
          if (!arenaName && team.team_meta) {
            if (typeof team.team_meta === 'object') {
              arenaName = team.team_meta.arena || team.team_meta.arena_name || team.team_meta.stadium || '';
            } else if (typeof team.team_meta === 'string') {
              try {
                const parsed = JSON.parse(team.team_meta);
                arenaName = parsed.arena || parsed.arena_name || parsed.stadium || '';
              } catch {
                arenaName = team.team_meta;
              }
            }
          }

          const coachName = (team.coach_id && coachMap[Number(team.coach_id)])
            || team.coach_name
            || team.league_coaches?.coach_name
            || (Array.isArray(team.league_coaches) ? team.league_coaches[0]?.coach_name : null)
            || 'TBA';

          return {
            ...team,
            coachName,
            arenaName: arenaName || 'TBD',
            record: { w, l, t, otl, gd },
            points
          };
        });

        const sorted = combined.sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.record.w !== a.record.w) return b.record.w - a.record.w;
          return (b.record.gd || 0) - (a.record.gd || 0);
        });
        setTeams(sorted);
      } catch (err: any) {
        console.error("fetchTeams error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTeams();
  }, [selectedSeason]);

  // Filter seasons by active league type
  const filteredSeasons = useMemo(() => {
    if (selectedLeagueType === 'ALL') return seasons;
    return seasons.filter(s => getLeaguePrefix(s) === selectedLeagueType);
  }, [seasons, selectedLeagueType]);

  // Filter teams by selected league type and query
  const leagueFilteredTeams = useMemo(() => {
    return teams.filter(t => {
      if (selectedLeagueType === 'ALL') return true;
      const lPrefix = getLeaguePrefix({ league_id: t.league_id });
      return lPrefix === selectedLeagueType;
    });
  }, [teams, selectedLeagueType]);

  const filteredTeams = useMemo(() => {
    if (!query) return leagueFilteredTeams;
    const lowerQuery = query.toLowerCase().trim();
    return leagueFilteredTeams.filter(t => {
      const teamName = String(t.team_name || '').toLowerCase();
      const abbr = String(t.abbreviation || '').toLowerCase();
      const coach = String(t.coachName || '').toLowerCase();
      const arena = String(t.arenaName || '').toLowerCase();
      const division = String(t.division || '').toLowerCase();

      return (
        teamName.includes(lowerQuery) ||
        abbr.includes(lowerQuery) ||
        coach.includes(lowerQuery) ||
        arena.includes(lowerQuery) ||
        division.includes(lowerQuery)
      );
    });
  }, [leagueFilteredTeams, query]);

  // Group teams by Division (if divisions exist in current dataset)
  const divisionGroups = useMemo(() => {
    const groups: Record<string, typeof filteredTeams> = {};
    let hasDivisions = false;

    filteredTeams.forEach(t => {
      const rawDiv = t.division ? t.division.trim() : '';
      if (rawDiv) hasDivisions = true;
      const key = rawDiv || 'Other Teams';
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });

    return { groups, hasDivisions };
  }, [filteredTeams]);

  const handleLeagueTypeChange = (type: string) => {
    setSelectedLeagueType(type);
    setSelectedSeason(0);
  };

  return (
    <div className="min-h-screen bg-[#f4f1ea] p-4 sm:p-6 font-serif text-black">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b-4 border-black mb-6 pb-3 gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter">League Directory</h1>
          <p className="text-xs font-bold uppercase italic text-gray-700 mt-0.5">Official Team Information & Rosters</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
          <Link
            href="/team"
            onClick={() => {
              setSearchVal("");
              setSelectedLeagueType("ALL");
              setSelectedSeason(0);
              router.push("/team");
            }}
            className="font-bold border border-black px-3 py-1 text-xs uppercase hover:bg-black hover:text-white transition cursor-pointer"
          >
            All Teams
          </Link>
          <input
            type="text"
            placeholder="SEARCH TEAMS..."
            className="border border-black px-2.5 py-1 text-xs font-bold bg-white text-black outline-none w-full sm:w-56"
            value={searchVal}
            onChange={(e) => {
              setSearchVal(e.target.value);
              router.push(`/team?q=${encodeURIComponent(e.target.value)}`);
            }}
          />
        </div>
      </div>

      {/* League Selection Buttons & Season archive selector */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* League Type Buttons */}
          <div className="flex items-center gap-1.5 bg-white border-2 border-black p-1 shadow-xs overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => handleLeagueTypeChange('ALL')}
              className={`px-2.5 py-1 h-8 md:h-9 flex items-center justify-center text-xs font-black uppercase transition-all shrink-0 cursor-pointer ${
                selectedLeagueType === 'ALL'
                  ? 'bg-black text-white shadow-xs'
                  : 'text-black hover:bg-neutral-100'
              }`}
              title="All Leagues"
            >
              ALL
            </button>
            {availableLeagueTypes.map((type) => {
              const config = LEAGUE_LOGOS[type];
              const isSelected = selectedLeagueType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleLeagueTypeChange(type)}
                  className={`px-2 py-0.5 flex items-center justify-center transition-all h-8 md:h-9 border-2 shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-yellow-100 border-black shadow-xs ring-1 ring-black'
                      : 'border-transparent bg-transparent opacity-65 hover:opacity-100 hover:border-black/30 hover:bg-neutral-50'
                  }`}
                  title={config?.name || `${type} League`}
                >
                  {config?.logoUrl ? (
                    <img
                      src={config.logoUrl}
                      alt={config.name || `${type} League`}
                      className="h-5 md:h-6 w-auto max-w-[60px] md:max-w-[80px] object-contain block"
                      onError={(e) => {
                        if (config.fallbackUrl && e.currentTarget.src !== config.fallbackUrl) {
                          e.currentTarget.src = config.fallbackUrl;
                        }
                      }}
                    />
                  ) : (
                    <span className="font-black text-xs uppercase px-1">{type}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Season archive selector */}
          <div className="flex items-center gap-2">
            <label className="font-bold uppercase text-xs">Archive Season:</label>
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(Number(e.target.value))}
              className="bg-white border border-black px-2 py-1 text-xs font-bold cursor-pointer uppercase outline-none"
            >
              <option value={0}>
                {selectedLeagueType === 'ALL' ? 'ALL SEASONS' : `ALL ${selectedLeagueType} SEASONS`}
              </option>
              {filteredSeasons.map(s => (
                <option key={s.league_id} value={s.league_id}>{s.season_name}</option>
              ))}
            </select>
          </div>
        </div>

        {query && (
          <span className="text-xs font-bold text-gray-700 italic">
            Showing results for &ldquo;{query}&rdquo; ({filteredTeams.length} teams found)
          </span>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center font-bold text-sm italic">Loading teams directory...</div>
      ) : filteredTeams.length === 0 ? (
        <div className="p-8 text-center font-bold text-sm italic border border-black bg-white">
          No teams found matching your criteria.
        </div>
      ) : divisionGroups.hasDivisions && !query && selectedSeason !== 0 ? (
        /* Division-Grouped View */
        <div className="space-y-8">
          {Object.entries(divisionGroups.groups).map(([divisionName, groupTeams]) => {
            const displayTitle = divisionName.toLowerCase().includes('division')
              ? divisionName
              : `${divisionName} Division`;

            return (
              <div key={divisionName} className="border-t-2 border-black pt-4">
                <h2 className="text-xl font-black uppercase tracking-tight text-black mb-4">
                  {displayTitle}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  {groupTeams.map((team, idx) => (
                    <TeamCard
                      key={`${team.team_id}-${team.league_id || idx}`}
                      team={team}
                      selectedSeason={selectedSeason}
                      seasonName={seasons.find(s => Number(s.league_id) === Number(team.league_id))?.season_name}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 2-Column Flat Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {filteredTeams.map((team, idx) => (
            <TeamCard
              key={`${team.team_id}-${team.league_id || idx}`}
              team={team}
              selectedSeason={selectedSeason}
              seasonName={seasons.find(s => Number(s.league_id) === Number(team.league_id))?.season_name}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TeamCard({ team, selectedSeason, seasonName }: { team: any; selectedSeason: number; seasonName?: string }) {
  const [imgError, setImgError] = useState(false);
  const targetSeason = selectedSeason !== 0 ? selectedSeason : (team.league_id || '');
  const teamLink = targetSeason ? `/team/${team.team_id}?season=${targetSeason}` : `/team/${team.team_id}`;

  const seasonBadge = useMemo(() => {
    return formatSeasonBadge(team.league_id, seasonName);
  }, [team.league_id, seasonName]);

  return (
    <div className="flex items-start gap-4 p-3 bg-white/70 hover:bg-white rounded border border-black/15 hover:border-black/50 transition duration-150 shadow-xs">
      {/* Team Logo on the Left */}
      <div className="w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 flex items-center justify-center bg-gray-50 border border-gray-200 rounded p-1">
        {team.logo_url && !imgError ? (
          <img
            src={team.logo_url}
            alt={team.team_name}
            onError={() => setImgError(true)}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-base font-black uppercase text-gray-500">
            {team.abbreviation || team.team_name?.slice(0, 3) || 'NHL'}
          </span>
        )}
      </div>

      {/* Details on the Right */}
      <div className="flex-1 min-w-0">
        {/* Team Name and Season Code on top right */}
        <div className="flex items-baseline justify-between gap-2">
          <Link
            href={teamLink}
            className="font-black text-base sm:text-lg text-black hover:text-blue-700 hover:underline leading-tight truncate block"
          >
            {team.team_name}
          </Link>
          {seasonBadge && (
            <span className="text-xs font-serif font-bold text-gray-600 italic tracking-wider flex-shrink-0">
              {seasonBadge}
            </span>
          )}
        </div>

        {/* Coach, Record, Arena */}
        <div className="text-xs text-gray-800 mt-1 space-y-0.5 font-medium">
          <div>
            <span className="font-bold text-black uppercase text-[11px]">COACH:</span>{' '}
            <Link
              href={teamLink}
              className="text-gray-900 font-bold hover:text-red-700 hover:underline"
              title={`View ${team.team_name} season file`}
            >
              {team.coachName}
            </Link>
          </div>
          <div className="flex flex-wrap gap-x-2 items-center">
            <div>
              <span className="font-bold text-black uppercase text-[11px]">RECORD:</span>{' '}
              <span className="font-semibold text-black">
                {team.record.w}-{team.record.l}-{team.record.t}-{team.record.otl}
              </span>
              <span className="text-gray-600 text-[11px] ml-1 font-bold">({team.points} pts)</span>
            </div>
            <span className="text-gray-400 hidden sm:inline">&bull;</span>
            <div>
              <span className="font-bold text-black uppercase text-[11px]">ARENA:</span>{' '}
              <span className="text-gray-700">{team.arenaName}</span>
            </div>
          </div>
        </div>

        {/* Links below to team page and sub-pages */}
        <div className="flex items-center gap-1.5 text-xs text-blue-600 font-bold mt-2 flex-wrap">
          <Link href={teamLink} className="hover:underline">
            Team Page
          </Link>
          <span className="text-gray-300">|</span>
          <Link href={teamLink} className="hover:underline">
            Roster
          </Link>
          <span className="text-gray-300">|</span>
          <Link href={`/schedule?season=${targetSeason}`} className="hover:underline">
            Schedule
          </Link>
          <span className="text-gray-300">|</span>
          <Link href={`/stats?season=${targetSeason}`} className="hover:underline">
            Statistics
          </Link>
          <span className="text-gray-300">|</span>
          <Link
            href={`/managers?q=${encodeURIComponent(team.coachName)}`}
            className="text-neutral-600 hover:text-black hover:underline"
            title={`View ${team.coachName} in Front Office Directory`}
          >
            Coach File
          </Link>
        </div>
      </div>
    </div>
  );
}