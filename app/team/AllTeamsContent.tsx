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
    logoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/Original6.png',
    fallbackUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Original6.png'
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
  const [selectedSeason, setSelectedSeason] = useState<number>(0);
  const [teams, setTeams] = useState<any[]>([]);
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || "";
  const [searchVal, setSearchVal] = useState(query);
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
        let queryBuilder = supabase
          .from('league_teams')
          .select('*');

        if (selectedSeason !== 0) {
          queryBuilder = queryBuilder.eq('league_id', selectedSeason);
        }

        const { data: teamsData, error: teamsError } = await queryBuilder;
        if (teamsError) {
          console.error("Teams Error:", teamsError.message || teamsError);
        }

        // Fetch coaches separately for resilient mapping without relying on Supabase relationship joins
        const { data: coachesData, error: coachesError } = await supabase
          .from('league_coaches')
          .select('coach_id, coach_name');

        if (coachesError) {
          console.error("Coaches Error:", coachesError.message || coachesError);
        }

        const coachMap: Record<number, string> = {};
        (coachesData || []).forEach((c: any) => {
          if (c.coach_id !== undefined && c.coach_id !== null) {
            coachMap[Number(c.coach_id)] = c.coach_name;
          }
        });

        let standingsQuery = supabase
          .from('league_standings')
          .select('*');

        if (selectedSeason !== 0) {
          standingsQuery = standingsQuery.eq('season_id', selectedSeason);
        }

        const { data: standingsData, error: standingsError } = await standingsQuery;
        if (standingsError) {
          console.error("Standings Error:", standingsError.message || standingsError);
        }

        const combined = (teamsData || []).map((team: any) => {
          const record = standingsData?.find((s: any) =>
            Number(s.team_id) === Number(team.team_id) &&
            (selectedSeason === 0 ? Number(s.season_id) === Number(team.league_id) : true)
          );
          const w = Number(record?.w) || 0;
          const l = Number(record?.l) || 0;
          const t = Number(record?.t) || 0;
          const otl = Number(record?.otl) || 0;
          const points = record?.pts !== undefined ? Number(record.pts) : (w * 2) + otl + t;

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
            record: record || { w, l, t, otl },
            points
          };
        });

        const sorted = combined.sort((a, b) => b.points - a.points);
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
              className={`px-2.5 py-1 h-8 md:h-9 flex items-center justify-center text-xs font-black uppercase transition-all shrink-0 cursor-pointer ${selectedLeagueType === 'ALL'
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
                  className={`px-2 py-0.5 flex items-center justify-center transition-all h-8 md:h-9 border-2 shrink-0 cursor-pointer ${isSelected
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
            <span className="text-gray-700">{team.coachName}</span>
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
          <Link href="/schedule" className="hover:underline">
            Schedule
          </Link>
          <span className="text-gray-300">|</span>
          <Link href="/stats" className="hover:underline">
            Statistics
          </Link>
        </div>
      </div>
    </div>
  );
}