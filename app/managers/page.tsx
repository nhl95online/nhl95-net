"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Users, Search, Shield, Trophy, ExternalLink, Globe } from 'lucide-react';

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

const getLeaguePrefix = (leagueId: number | string, seasonName?: string) => {
  if (seasonName) {
    const trimmed = seasonName.trim().toUpperCase();
    const match = trimmed.match(/^[A-Z]+/);
    if (match && match[0] && LEAGUE_LOGOS[match[0]]) return match[0];
  }
  const idNum = Number(leagueId);
  if (SEASON_TYPES[idNum]) return SEASON_TYPES[idNum];
  return 'W';
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

interface CoachEntry {
  coach_id: number;
  coach_name: string;
  discord_tag?: string;
  teams: {
    team_id: number;
    team_name: string;
    abbreviation: string;
    logo_url: string | null;
    league_id: number;
    season_name: string;
    season_badge: string;
    league_type: string;
  }[];
}

export default function ManagersPage() {
  const [coaches, setCoaches] = useState<CoachEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedLeagueType, setSelectedLeagueType] = useState<string>("ALL");

  const availableLeagueTypes = ['W', 'Q', 'O', 'V', 'G'];

  useEffect(() => {
    async function loadManagersData() {
      setLoading(true);
      try {
        const [coachesRes, teamsRes, seasonsRes] = await Promise.all([
          supabase
            .from('league_coaches')
            .select('*')
            .order('coach_name', { ascending: true }),
          supabase
            .from('league_teams')
            .select('*')
            .order('league_id', { ascending: false }),
          supabase
            .from('league_seasons')
            .select('league_id, season_name')
            .order('league_id', { ascending: false })
        ]);

        const rawCoaches = coachesRes.data || [];
        const rawTeams = teamsRes.data || [];
        let rawSeasons = seasonsRes.data || [];

        if (rawSeasons.length === 0) {
          const fallback = await supabase
            .from('leagues')
            .select('league_id, league_name')
            .order('league_id', { ascending: false });
          if (fallback.data) {
            rawSeasons = fallback.data.map((l: any) => ({
              league_id: l.league_id,
              season_name: l.league_name || `Season ${l.league_id}`
            }));
          }
        }

        const seasonMap = new Map<number, string>();
        rawSeasons.forEach((s: any) => {
          seasonMap.set(Number(s.league_id), s.season_name);
        });

        // Group teams by coach_id / coach_name
        const coachMap = new Map<number, CoachEntry>();

        rawCoaches.forEach((c: any) => {
          const cId = Number(c.coach_id);
          coachMap.set(cId, {
            coach_id: cId,
            coach_name: c.coach_name || `Manager #${cId}`,
            discord_tag: c.discord_tag || c.discord_name || c.coach_tag || null,
            teams: []
          });
        });

        // Map all teams across all seasons & leagues to their respective coaches
        rawTeams.forEach((t: any) => {
          const cId = Number(t.coach_id);
          const tLeagueId = Number(t.league_id) || 1;
          const sName = seasonMap.get(tLeagueId) || `Season ${tLeagueId}`;
          const lType = getLeaguePrefix(tLeagueId, sName);
          const sBadge = formatSeasonBadge(tLeagueId, sName);

          const teamInfo = {
            team_id: Number(t.team_id),
            team_name: t.team_name || `Team #${t.team_id}`,
            abbreviation: t.abbreviation || 'TM',
            logo_url: t.logo_url || null,
            league_id: tLeagueId,
            season_name: sName,
            season_badge: sBadge,
            league_type: lType
          };

          if (cId && coachMap.has(cId)) {
            const entry = coachMap.get(cId)!;
            // Prevent duplicate team assignments within the same season
            if (!entry.teams.some(existing => existing.team_id === teamInfo.team_id && existing.league_id === teamInfo.league_id)) {
              entry.teams.push(teamInfo);
            }
          } else if (t.coach_name) {
            // Find coach by name if coach_id wasn't linked
            let matched = false;
            for (const entry of Array.from(coachMap.values())) {
              if (entry.coach_name.trim().toLowerCase() === t.coach_name.trim().toLowerCase()) {
                if (!entry.teams.some(existing => existing.team_id === teamInfo.team_id && existing.league_id === teamInfo.league_id)) {
                  entry.teams.push(teamInfo);
                }
                matched = true;
                break;
              }
            }
            if (!matched && cId) {
              coachMap.set(cId, {
                coach_id: cId,
                coach_name: t.coach_name,
                teams: [teamInfo]
              });
            }
          }
        });

        // Sort each coach's teams by latest season descending
        const compiled = Array.from(coachMap.values()).map(c => ({
          ...c,
          teams: c.teams.sort((a, b) => b.league_id - a.league_id)
        })).sort((a, b) => a.coach_name.localeCompare(b.coach_name));

        setCoaches(compiled);
      } catch (err) {
        console.error("Error loading coaches and team logos:", err);
      } finally {
        setLoading(false);
      }
    }

    loadManagersData();
  }, []);

  // Filter coaches by search query and selected league type
  const filteredCoaches = useMemo(() => {
    return coaches.filter(c => {
      // League filter check
      if (selectedLeagueType !== 'ALL') {
        const hasTeamInLeague = c.teams.some(t => t.league_type === selectedLeagueType);
        if (!hasTeamInLeague) return false;
      }

      // Search filter check
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      const nameMatch = c.coach_name.toLowerCase().includes(q);
      const teamMatch = c.teams.some(t =>
        t.team_name.toLowerCase().includes(q) ||
        t.abbreviation.toLowerCase().includes(q) ||
        t.season_badge.toLowerCase().includes(q)
      );

      return nameMatch || teamMatch;
    });
  }, [coaches, search, selectedLeagueType]);

  const totalTeamsManaged = useMemo(() => {
    return coaches.reduce((acc, c) => acc + c.teams.length, 0);
  }, [coaches]);

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-black font-serif p-3 sm:p-6">
      {/* Header */}
      <header className="border-b-4 border-black pb-3 sm:pb-4 mb-4 sm:mb-6 text-center">
        <span className="bg-black text-white font-mono text-[10px] sm:text-xs font-black uppercase px-2.5 py-0.5 tracking-widest inline-block mb-1">
          Front Office Staff & Franchise Leadership
        </span>
        <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter">Managers & Coaches</h1>
        <p className="text-xs font-bold uppercase italic mt-1 text-slate-700">
          Official Team Rosters, Logos, and Franchise History Across All Leagues
        </p>
      </header>

      {/* Control Bar: League Filters & Search */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center mb-6 border-b border-black pb-4 gap-4">
        {/* League Type Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-white border-2 border-black p-1 shadow-xs overflow-x-auto max-w-full no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedLeagueType('ALL')}
            className={`px-3 py-1 text-xs font-black uppercase transition-all shrink-0 cursor-pointer ${selectedLeagueType === 'ALL'
                ? 'bg-black text-white shadow-xs'
                : 'text-black hover:bg-neutral-100'
              }`}
          >
            All Leagues
          </button>
          {availableLeagueTypes.map((type) => {
            const config = LEAGUE_LOGOS[type];
            const isSelected = selectedLeagueType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedLeagueType(type)}
                className={`px-2 py-0.5 flex items-center justify-center transition-all h-8 border-2 shrink-0 cursor-pointer ${isSelected
                    ? 'bg-yellow-100 border-black shadow-xs ring-1 ring-black'
                    : 'border-transparent bg-transparent opacity-65 hover:opacity-100 hover:border-black/30 hover:bg-neutral-50'
                  }`}
                title={config?.name || `${type} League`}
              >
                {config?.logoUrl ? (
                  <img
                    src={config.logoUrl}
                    alt={config.name}
                    className="h-5 w-auto max-w-[60px] object-contain block"
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

        {/* Stats Summary & Search Box */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-700 font-sans">
            <span className="font-black text-black font-mono">{filteredCoaches.length}</span> Managers &bull;{' '}
            <span className="font-black text-black font-mono">{totalTeamsManaged}</span> Franchises
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-neutral-400" />
            <input
              type="text"
              placeholder="SEARCH MANAGER OR TEAM..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-black pl-8 pr-3 py-1.5 text-xs font-bold uppercase bg-white text-black w-full sm:w-64 focus:outline-none font-sans"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-16 text-center text-xs font-black uppercase tracking-widest text-gray-500 font-mono">
          Loading Staff Directory & Team Logos across all historical seasons...
        </div>
      ) : filteredCoaches.length === 0 ? (
        <div className="p-16 text-center text-xs font-bold uppercase italic text-gray-500 border border-black bg-white">
          No coaches or managers found matching "{search}".
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCoaches.map((coach) => (
            <ManagerCard
              key={coach.coach_id}
              coach={coach}
              selectedLeagueType={selectedLeagueType}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ManagerCard({ coach, selectedLeagueType }: { coach: CoachEntry; selectedLeagueType: string }) {
  const displayedTeams = useMemo(() => {
    if (selectedLeagueType === 'ALL') return coach.teams;
    return coach.teams.filter(t => t.league_type === selectedLeagueType);
  }, [coach.teams, selectedLeagueType]);

  // Extract unique leagues this coach participates in
  const uniqueLeagues = useMemo(() => {
    return Array.from(new Set(coach.teams.map(t => t.league_type)));
  }, [coach.teams]);

  const primaryTeam = displayedTeams[0] || coach.teams[0];

  return (
    <div className="border-2 border-black p-4 bg-[#fdfaf5] shadow-[4px_4px_0px_rgba(0,0,0,1)] flex flex-col justify-between transition-transform duration-100 hover:translate-y-[-1px]">
      <div>
        {/* Manager Header Row */}
        <div className="flex justify-between items-start border-b-2 border-black pb-2.5 mb-3 gap-2">
          <div className="min-w-0 flex-1">
            {primaryTeam ? (
              <Link
                href={`/team/${primaryTeam.team_id}?season=${primaryTeam.league_id}`}
                className="group inline-flex items-center gap-1.5"
                title={`Open ${coach.coach_name}'s team file for ${primaryTeam.season_badge}`}
              >
                <h2 className="text-base sm:text-lg font-black uppercase truncate text-black group-hover:text-red-800 group-hover:underline leading-tight">
                  {coach.coach_name}
                </h2>
                <ExternalLink className="w-3.5 h-3.5 text-neutral-400 group-hover:text-red-800 transition-colors shrink-0" />
              </Link>
            ) : (
              <h2 className="text-base sm:text-lg font-black uppercase truncate text-black leading-tight">
                {coach.coach_name}
              </h2>
            )}
            {coach.discord_tag && (
              <p className="text-[11px] font-mono text-slate-600 font-bold truncate">
                @{coach.discord_tag}
              </p>
            )}
          </div>

          {/* League Badges */}
          <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
            {uniqueLeagues.map((lType) => {
              const conf = LEAGUE_LOGOS[lType];
              return (
                <span
                  key={lType}
                  className="font-mono text-[9px] font-black uppercase px-1.5 py-0.5 bg-black text-white rounded-none"
                  title={conf?.name || `${lType} League`}
                >
                  {lType}
                </span>
              );
            })}
          </div>
        </div>

        {/* Team Assignments with Logos */}
        <div className="mb-2">
          <div className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
            <span>Teams & Seasons Coached ({displayedTeams.length})</span>
            {displayedTeams.length > 0 && <span className="text-[9px] text-slate-400">Click team to view season</span>}
          </div>

          {displayedTeams.length === 0 ? (
            <div className="p-3 bg-neutral-100 border border-neutral-200 text-center text-xs italic text-slate-500 font-sans">
              No active team in this specific league tier.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {displayedTeams.map((team, idx) => (
                <TeamRow key={`${team.team_id}-${team.league_id}-${idx}`} team={team} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer link to primary team */}
      {primaryTeam && (
        <div className="pt-3 mt-3 border-t border-black/15 flex justify-between items-center text-xs">
          <span className="font-mono text-[10px] text-slate-600 font-bold uppercase">
            Active: {primaryTeam.abbreviation} ({primaryTeam.season_badge})
          </span>
          <Link
            href={`/team/${primaryTeam.team_id}?season=${primaryTeam.league_id}`}
            className="font-bold text-red-800 uppercase hover:underline text-[11px] flex items-center gap-1"
            title={`View team page for Season ${primaryTeam.season_badge}`}
          >
            Go to Team Page &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}

function TeamRow({ team }: { team: any }) {
  const [imgError, setImgError] = useState(false);

  return (
    <Link
      href={`/team/${team.team_id}?season=${team.league_id}`}
      className="flex items-center gap-2.5 p-2 bg-white border border-neutral-300 hover:border-black hover:bg-amber-50/50 transition-colors group"
    >
      {/* Team Logo */}
      <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-neutral-50 border border-neutral-200 p-0.5">
        {team.logo_url && !imgError ? (
          <img
            src={team.logo_url}
            alt={team.team_name}
            onError={() => setImgError(true)}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-[10px] font-mono font-black uppercase text-neutral-600">
            {team.abbreviation}
          </span>
        )}
      </div>

      {/* Team Name and Season Badge */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="font-bold text-xs text-neutral-900 group-hover:text-blue-800 group-hover:underline truncate block">
            {team.team_name}
          </span>
          <span className="text-[10px] font-mono font-black text-amber-800 bg-amber-100 px-1 py-0.2 shrink-0 border border-amber-300">
            {team.season_badge}
          </span>
        </div>
        <div className="text-[10px] font-mono text-neutral-500 truncate">
          {team.season_name}
        </div>
      </div>
    </Link>
  );
}
