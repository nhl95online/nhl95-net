'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { FileSpreadsheet, Trophy, Shield, Flame, Activity } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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

const getLeaguePrefix = (league: { league_id: number | string; league_name?: string }) => {
  const name = String(league.league_name || '').trim().toUpperCase();
  if (name) {
    if (name.includes('ORIGINAL') || name.startsWith('O6') || name.startsWith('O')) return 'O';
    if (name.includes('THE Q') || name.startsWith('Q')) return 'Q';
    if (name.includes('VINTAGE') || name.startsWith('V')) return 'V';
    if (name.includes('GOLDEN') || name.startsWith('G')) return 'G';
    if (name.includes('W LEAGUE') || name.startsWith('W')) return 'W';
    const match = name.match(/^[A-Z]+/);
    if (match && match[0]) return match[0];
  }
  const idNum = Number(league.league_id);
  if (SEASON_TYPES[idNum]) return SEASON_TYPES[idNum];
  return 'W';
};

interface TeamLeaderCardProps {
  title: string;
  data: any[];
  subTabs: string[];
  defaultSubTab?: string;
  onTabClick: (tab: string) => void;
  hoveredTeam: any;
  setHoveredTeam: (team: any) => void;
  targetTabName: string;
}

const TeamStatCard: React.FC<TeamLeaderCardProps> = ({
  title,
  data,
  subTabs,
  defaultSubTab,
  onTabClick,
  hoveredTeam,
  setHoveredTeam,
  targetTabName
}) => {
  const [activeSubTab, setActiveSubTab] = useState(defaultSubTab || subTabs[0]);

  const sorted = useMemo(() => {
    const list = [...data];
    return list.sort((a, b) => {
      // Lower is better for Goals Against (GA), GA/G, Shots Against (SA), SA/G
      if (activeSubTab === 'GA') {
        const gaA = Number(a.ga ?? 0);
        const gaB = Number(b.ga ?? 0);
        if (gaA !== gaB) return gaA - gaB;
        return Number(b.pts ?? 0) - Number(a.pts ?? 0);
      }
      if (activeSubTab === 'GA/G') {
        const gaGA = Number(a.ga_per_game ?? (a.gp ? a.ga / a.gp : 999));
        const gaGB = Number(b.ga_per_game ?? (b.gp ? b.ga / b.gp : 999));
        if (gaGA !== gaGB) return gaGA - gaGB;
        return Number(b.pts ?? 0) - Number(a.pts ?? 0);
      }
      if (activeSubTab === 'SA' || activeSubTab === 'SA/G') {
        const saA = activeSubTab === 'SA' ? Number(a.sa ?? 0) : Number(a.sa_per_game ?? (a.gp ? a.sa / a.gp : 999));
        const saB = activeSubTab === 'SA' ? Number(b.sa ?? 0) : Number(b.sa_per_game ?? (b.gp ? b.sa / b.gp : 999));
        if (saA !== saB) return saA - saB;
        return Number(b.pts ?? 0) - Number(a.pts ?? 0);
      }

      // Higher is better for all other metrics
      if (activeSubTab === 'PTS') {
        const pA = Number(a.pts ?? 0);
        const pB = Number(b.pts ?? 0);
        if (pA !== pB) return pB - pA;
        return Number(b.wins ?? 0) - Number(a.wins ?? 0);
      }
      if (activeSubTab === 'Wins' || activeSubTab === 'W') {
        const wA = Number(a.wins ?? 0);
        const wB = Number(b.wins ?? 0);
        if (wA !== wB) return wB - wA;
        return Number(b.pts ?? 0) - Number(a.pts ?? 0);
      }
      if (activeSubTab === 'OTW') {
        const otwA = Number(a.otWins ?? 0);
        const otwB = Number(b.otWins ?? 0);
        if (otwA !== otwB) return otwB - otwA;
        return Number(b.wins ?? 0) - Number(a.wins ?? 0);
      }
      if (activeSubTab === 'P%' || activeSubTab === 'Win%') {
        const ptA = Number(a.win_pct ?? (a.gp ? (a.pts / (a.gp * 2)) : 0));
        const ptB = Number(b.win_pct ?? (b.gp ? (b.pts / (b.gp * 2)) : 0));
        if (ptA !== ptB) return ptB - ptA;
        return Number(b.pts ?? 0) - Number(a.pts ?? 0);
      }
      if (activeSubTab === 'DIFF' || activeSubTab === 'GD') {
        const dA = Number(a.gd ?? (a.gf - a.ga) ?? 0);
        const dB = Number(b.gd ?? (b.gf - b.ga) ?? 0);
        if (dA !== dB) return dB - dA;
        return Number(b.pts ?? 0) - Number(a.pts ?? 0);
      }
      if (activeSubTab === 'GF') {
        const gfA = Number(a.gf ?? 0);
        const gfB = Number(b.gf ?? 0);
        if (gfA !== gfB) return gfB - gfA;
        return Number(b.pts ?? 0) - Number(a.pts ?? 0);
      }
      if (activeSubTab === 'GF/G') {
        const gfgA = Number(a.gf_per_game ?? (a.gp ? a.gf / a.gp : 0));
        const gfgB = Number(b.gf_per_game ?? (b.gp ? b.gf / b.gp : 0));
        if (gfgA !== gfgB) return gfgB - gfgA;
        return Number(b.pts ?? 0) - Number(a.pts ?? 0);
      }
      if (activeSubTab === 'SOG' || activeSubTab === 'SOG/G') {
        const sA = activeSubTab === 'SOG' ? Number(a.sog ?? 0) : Number(a.sog_per_game ?? (a.gp ? a.sog / a.gp : 0));
        const sB = activeSubTab === 'SOG' ? Number(b.sog ?? 0) : Number(b.sog_per_game ?? (b.gp ? b.sog / b.gp : 0));
        if (sA !== sB) return sB - sA;
        return Number(b.pts ?? 0) - Number(a.pts ?? 0);
      }
      if (activeSubTab === 'SH%') {
        const shA = Number(a.sh_pct ?? (a.sog > 0 ? (a.gf / a.sog) * 100 : 0));
        const shB = Number(b.sh_pct ?? (b.sog > 0 ? (b.gf / b.sog) * 100 : 0));
        if (shA !== shB) return shB - shA;
        return Number(b.gf ?? 0) - Number(a.gf ?? 0);
      }
      if (activeSubTab === 'SV%') {
        const svA = Number(a.sv_pct ?? (a.sa > 0 ? ((a.sa - a.ga) / a.sa) : 0));
        const svB = Number(b.sv_pct ?? (b.sa > 0 ? ((b.sa - b.ga) / b.sa) : 0));
        if (svA !== svB) return svB - svA;
        return Number(b.pts ?? 0) - Number(a.pts ?? 0);
      }
      if (activeSubTab === 'PPG') {
        const ppA = Number(a.ppg ?? 0);
        const ppB = Number(b.ppg ?? 0);
        if (ppA !== ppB) return ppB - ppA;
        return Number(b.gf ?? 0) - Number(a.gf ?? 0);
      }
      if (activeSubTab === 'SHG') {
        const shA = Number(a.shg ?? 0);
        const shB = Number(b.shg ?? 0);
        if (shA !== shB) return shB - shA;
        return Number(b.gf ?? 0) - Number(a.gf ?? 0);
      }
      if (activeSubTab === 'PIM' || activeSubTab === 'PIM/G') {
        const pA = activeSubTab === 'PIM' ? Number(a.pim ?? 0) : Number(a.pim_per_game ?? (a.gp ? a.pim / a.gp : 0));
        const pB = activeSubTab === 'PIM' ? Number(b.pim ?? 0) : Number(b.pim_per_game ?? (b.gp ? b.pim / b.gp : 0));
        return pB - pA;
      }
      if (activeSubTab === 'CHKS' || activeSubTab === 'CHKS/G') {
        const cA = activeSubTab === 'CHKS' ? Number(a.chks ?? 0) : Number(a.chks_per_game ?? (a.gp ? a.chks / a.gp : 0));
        const cB = activeSubTab === 'CHKS' ? Number(b.chks ?? 0) : Number(b.chks_per_game ?? (b.gp ? b.chks / b.gp : 0));
        return cB - cA;
      }
      if (activeSubTab === 'SO') {
        const soA = Number(a.shutouts ?? 0);
        const soB = Number(b.shutouts ?? 0);
        if (soA !== soB) return soB - soA;
        return Number(b.wins ?? 0) - Number(a.wins ?? 0);
      }

      return Number(b.pts ?? 0) - Number(a.pts ?? 0);
    });
  }, [data, activeSubTab]);

  const defaultTop = sorted[0];
  const activeTop = hoveredTeam && sorted.some(t => Number(t.team_id) === Number(hoveredTeam.team_id))
    ? sorted.find(t => Number(t.team_id) === Number(hoveredTeam.team_id))
    : defaultTop;

  const top = activeTop || defaultTop;

  const getValue = (t: any) => {
    if (!t) return '-';
    if (activeSubTab === 'PTS') return Number(t.pts ?? 0);
    if (activeSubTab === 'Wins' || activeSubTab === 'W') return Number(t.wins ?? 0);
    if (activeSubTab === 'OTW') return Number(t.otWins ?? 0);
    if (activeSubTab === 'P%' || activeSubTab === 'Win%') {
      const pct = t.win_pct != null ? Number(t.win_pct) : (t.gp ? t.pts / (t.gp * 2) : 0);
      return pct.toFixed(3);
    }
    if (activeSubTab === 'DIFF' || activeSubTab === 'GD') {
      const diff = Number(t.gd ?? (t.gf - t.ga) ?? 0);
      return diff > 0 ? `+${diff}` : String(diff);
    }
    if (activeSubTab === 'GF') return Number(t.gf ?? 0);
    if (activeSubTab === 'GF/G') {
      const gfg = t.gf_per_game != null ? Number(t.gf_per_game) : (t.gp ? t.gf / t.gp : 0);
      return gfg.toFixed(2);
    }
    if (activeSubTab === 'GA') return Number(t.ga ?? 0);
    if (activeSubTab === 'GA/G') {
      const gag = t.ga_per_game != null ? Number(t.ga_per_game) : (t.gp ? t.ga / t.gp : 0);
      return gag.toFixed(2);
    }
    if (activeSubTab === 'SOG') return Number(t.sog ?? 0);
    if (activeSubTab === 'SOG/G') {
      const sogg = t.sog_per_game != null ? Number(t.sog_per_game) : (t.gp ? t.sog / t.gp : 0);
      return sogg.toFixed(1);
    }
    if (activeSubTab === 'SA') return Number(t.sa ?? 0);
    if (activeSubTab === 'SA/G') {
      const sag = t.sa_per_game != null ? Number(t.sa_per_game) : (t.gp ? t.sa / t.gp : 0);
      return sag.toFixed(1);
    }
    if (activeSubTab === 'SH%') {
      const sh = t.sh_pct != null ? Number(t.sh_pct) : (t.sog > 0 ? (t.gf / t.sog) * 100 : 0);
      return `${sh.toFixed(1)}%`;
    }
    if (activeSubTab === 'SV%') {
      const sv = t.sv_pct != null ? Number(t.sv_pct) : (t.sa > 0 ? (t.sa - t.ga) / t.sa : 0);
      return sv.toFixed(3);
    }
    if (activeSubTab === 'PPG') return Number(t.ppg ?? 0);
    if (activeSubTab === 'SHG') return Number(t.shg ?? 0);
    if (activeSubTab === 'PIM') return Number(t.pim ?? 0);
    if (activeSubTab === 'PIM/G') {
      const pimg = t.pim_per_game != null ? Number(t.pim_per_game) : (t.gp ? t.pim / t.gp : 0);
      return pimg.toFixed(1);
    }
    if (activeSubTab === 'CHKS') return Number(t.chks ?? 0);
    if (activeSubTab === 'CHKS/G') {
      const chkg = t.chks_per_game != null ? Number(t.chks_per_game) : (t.gp ? t.chks / t.gp : 0);
      return chkg.toFixed(1);
    }
    if (activeSubTab === 'SO') return Number(t.shutouts ?? 0);
    return Number(t.pts ?? 0);
  };

  return (
    <div className="border border-black p-4 bg-white shadow-sm">
      <h2
        className="font-black text-sm uppercase mb-3 cursor-pointer hover:underline flex items-baseline justify-between"
        onClick={() => onTabClick(targetTabName)}
      >
        <span>{title} &gt;</span>
        <span className="text-[10px] font-normal text-gray-500 lowercase tracking-normal">
          (click to view full table)
        </span>
      </h2>
      <div className="flex gap-4 border-b border-gray-200 mb-4 text-[10px] font-bold uppercase overflow-x-auto no-scrollbar pb-1">
        {subTabs.map(tab => (
          <button
            key={tab}
            className={activeSubTab === tab ? 'border-b-2 border-black pb-0.5 text-black' : 'text-gray-400 pb-0.5 hover:text-black'}
            onClick={() => setActiveSubTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      {top ? (
        <div className="flex gap-6 sm:gap-8">
          <div className="text-center w-1/3 border-r border-gray-100 pr-3 sm:pr-4 flex flex-col items-center justify-center">
            {top.logo_url ? (
              <img src={top.logo_url} className="h-16 w-16 mx-auto mb-2 object-contain" alt={top.team_name} />
            ) : (
              <div className="h-16 w-16 bg-neutral-100 border border-black/20 flex items-center justify-center font-black text-lg mx-auto mb-2">
                {top.abbreviation || 'TM'}
              </div>
            )}
            <p className="font-bold text-xs truncate max-w-full">{top.team_name}</p>
            <p className="text-[10px] text-gray-500 mb-1">{top.coach_name ? `Coach: ${top.coach_name}` : (top.abbreviation || '')}</p>
            <p className="text-3xl font-black text-black">{getValue(top)}</p>
            <span className="text-[9px] uppercase font-bold text-gray-400 mt-0.5">#{1} in {activeSubTab}</span>
          </div>
          <div className="w-2/3 flex flex-col justify-between">
            {sorted.slice(0, 10).map((t, i) => {
              const isHovered = hoveredTeam && Number(t.team_id) === Number(hoveredTeam.team_id);
              return (
                <div
                  key={t.team_id || i}
                  className={`flex justify-between items-center text-[11px] py-1 border-b border-gray-50 cursor-pointer px-1.5 transition-colors ${
                    isHovered ? 'bg-yellow-100 font-bold' : 'hover:bg-gray-50'
                  }`}
                  onMouseEnter={() => setHoveredTeam(t)}
                  onMouseLeave={() => setHoveredTeam(null)}
                >
                  <div className="flex items-center gap-1.5 truncate flex-1 pr-2">
                    <span className="font-mono text-[10px] text-gray-400 w-4">{i + 1}.</span>
                    {t.logo_url && (
                      <img src={t.logo_url} className="h-4 w-4 object-contain shrink-0" alt="" />
                    )}
                    <span className="truncate">{t.team_name}</span>
                  </div>
                  <span className="font-black text-black ml-4 shrink-0">{getValue(t)}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-gray-500 font-bold uppercase italic">
          No qualifying teams found
        </div>
      )}
    </div>
  );
};

export default function TeamStatsPage() {
  const [activeTab, setActiveTab] = useState<'Home' | 'All Teams' | 'Offense' | 'Defense' | 'Special Teams'>('Home');
  const [leagues, setLeagues] = useState<any[]>([]);
  const [selectedLeagueType, setSelectedLeagueType] = useState<string>('ALL');
  const [selectedLeague, setSelectedLeague] = useState<string>('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('All');
  const [teamStats, setTeamStats] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sortConfig, setSortConfig] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [hoveredTeam, setHoveredTeam] = useState<any>(null);

  // 1. Fetch available leagues and seasons
  useEffect(() => {
    async function fetchLeagues() {
      try {
        let { data, error } = await supabase
          .from('league_seasons')
          .select('league_id, season_name')
          .order('league_id', { ascending: false });

        if (error || !data || data.length === 0) {
          const fallback = await supabase
            .from('leagues')
            .select('league_id, league_name')
            .order('league_id', { ascending: false });

          if (fallback.data && fallback.data.length > 0) {
            data = fallback.data.map((l: any) => ({
              league_id: l.league_id,
              season_name: l.league_name || `Season ${l.league_id}`
            }));
          }
        }

        if (data && data.length > 0) {
          const formatted = data.map((l: any) => ({
            league_id: String(l.league_id),
            league_name: l.season_name || l.league_name || `Season ${l.league_id}`
          }));
          setLeagues(formatted);
          const latest = formatted[0];
          setSelectedLeague(String(latest.league_id));
          loadTeamStats(String(latest.league_id));
        }
      } catch (err) {
        console.error("Error fetching leagues:", err);
      }
    }
    fetchLeagues();
  }, []);

  const availableLeagueTypes = useMemo(() => {
    const extracted = new Set<string>();
    leagues.forEach(l => {
      const p = getLeaguePrefix(l);
      if (p) extracted.add(p);
    });
    if (extracted.size === 0) {
      return ['W', 'Q', 'O', 'V', 'G'];
    }
    const priority = ['W', 'Q', 'O', 'V', 'G'];
    return Array.from(extracted).sort((a, b) => {
      const idxA = priority.indexOf(a);
      const idxB = priority.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [leagues]);

  const filteredLeagues = useMemo(() => {
    if (selectedLeagueType === 'ALL') return leagues;
    return leagues.filter(l => getLeaguePrefix(l) === selectedLeagueType);
  }, [leagues, selectedLeagueType]);

  const handleLeagueTypeChange = (type: string) => {
    setSelectedLeagueType(type);
    const list = type === 'ALL' ? leagues : leagues.filter(l => getLeaguePrefix(l) === type);
    if (list.length > 0) {
      const nextId = String(list[0].league_id);
      setSelectedLeague(nextId);
      loadTeamStats(nextId);
    }
  };

  // 2. Load and compute comprehensive team statistics for selected league/season
  async function loadTeamStats(leagueId: string) {
    setLoading(true);
    const numericLeagueId = parseInt(String(leagueId).replace(/\D/g, '')) || 40;

    try {
      // Parallel fetch of all essential tables matching StandingsPage & RecordPage architecture
      const [teamsRes, standingsRes, schedRes, gamestatsRes, masterRes, statsRes, coachesRes] = await Promise.all([
        supabase.from('league_teams').select('*'),
        supabase.from('league_standings').select('*').eq('season_id', numericLeagueId),
        supabase.from('league_schedule').select('*').eq('league_id', numericLeagueId).order('game_id', { ascending: true }),
        supabase.from('league_gamestats').select('*').eq('league_id', numericLeagueId),
        supabase.from('league_player_stats_master').select('*').eq('league_id', numericLeagueId),
        supabase.from('api_stats_with_names').select('*').eq('league_id', numericLeagueId).then(r => r, () => ({ data: null, error: null })),
        supabase.from('league_coaches').select('coach_id, coach_name')
      ]);

      const coachMap = new Map<number, string>();
      (coachesRes.data || []).forEach((c: any) => {
        if (c.coach_id != null) coachMap.set(Number(c.coach_id), c.coach_name);
      });

      const allTeamsData = teamsRes.data || [];
      const seasonTeams = allTeamsData.filter((t: any) => Number(t.league_id) === numericLeagueId);
      const effectiveTeams = seasonTeams.length > 0 ? seasonTeams : allTeamsData;

      // Identify active team IDs for the season
      const activeTeamIds = new Set<number>();
      effectiveTeams.forEach((t: any) => activeTeamIds.add(Number(t.team_id)));
      (schedRes.data || []).forEach((g: any) => {
        const h = Number(g.home_team_id);
        const a = Number(g.away_team_id);
        if (h && h !== 999 && h !== 0 && h !== 68) activeTeamIds.add(h);
        if (a && a !== 999 && a !== 0 && a !== 68) activeTeamIds.add(a);
      });
      (gamestatsRes.data || []).forEach((s: any) => {
        const h = Number(s.home_team_id);
        const a = Number(s.away_team_id);
        if (h && h !== 999 && h !== 0 && h !== 68) activeTeamIds.add(h);
        if (a && a !== 999 && a !== 0 && a !== 68) activeTeamIds.add(a);
      });

      // Initialize teamMap with base structure
      const teamMap: Record<number, any> = {};

      activeTeamIds.forEach((tId: number) => {
        const tInfo = allTeamsData.find((t: any) => Number(t.team_id) === tId) ||
                      effectiveTeams.find((t: any) => Number(t.team_id) === tId);
        const cName = (tInfo?.coach_id && coachMap.get(Number(tInfo.coach_id))) || tInfo?.coach_name || 'TBA';

        teamMap[tId] = {
          team_id: tId,
          team_name: tInfo?.team_name || `Club #${tId}`,
          abbreviation: tInfo?.abbreviation || `TM${tId}`,
          logo_url: tInfo?.logo_url || '',
          coach_name: cName,
          conference: tInfo?.conference || '',
          division: tInfo?.division || '',
          league_id: numericLeagueId,
          gp: 0,
          wins: 0,
          losses: 0,
          ties: 0,
          otWins: 0,
          otLosses: 0,
          pts: 0,
          gf: 0,
          ga: 0,
          gd: 0,
          homeWins: 0,
          homeLosses: 0,
          homeTies: 0,
          awayWins: 0,
          awayLosses: 0,
          awayTies: 0,
          sog: 0,
          sa: 0,
          saves: 0,
          pim: 0,
          chks: 0,
          ppg: 0,
          shg: 0,
          shutouts: 0,
          history: [] as string[],
          streak: '-',
          l10: '0-0-0',
          homeRecord: '0-0-0',
          awayRecord: '0-0-0'
        };
      });

      // Flexible team key resolver matching StandingsPage & recalculate-standings
      const resolveTeamKey = (id: any, teamName?: string, coachId?: any): number | null => {
        const num = Number(id);
        if (num && teamMap[num]) return num;

        const matchTeam = allTeamsData.find((t: any) => 
          (num && (Number(t.team_id) === num || Number(t.coach_id) === num)) ||
          (coachId && Number(t.coach_id) === Number(coachId)) ||
          (teamName && t.team_name && t.team_name.trim().toLowerCase() === teamName.trim().toLowerCase()) ||
          (teamName && t.abbreviation && t.abbreviation.trim().toLowerCase() === teamName.trim().toLowerCase())
        );

        if (matchTeam) {
          const seasonMatch = allTeamsData.find((t: any) => 
            Number(t.league_id) === numericLeagueId && 
            (
              (t.abbreviation && matchTeam.abbreviation && t.abbreviation.trim().toUpperCase() === matchTeam.abbreviation.trim().toUpperCase()) ||
              (t.team_name && matchTeam.team_name && t.team_name.trim().toUpperCase() === matchTeam.team_name.trim().toUpperCase()) ||
              (Number(t.coach_id) > 0 && Number(t.coach_id) === Number(matchTeam.coach_id)) ||
              (Number(t.team_id) === Number(matchTeam.team_id))
            )
          );

          if (seasonMatch && teamMap[Number(seasonMatch.team_id)]) {
            return Number(seasonMatch.team_id);
          }
          if (teamMap[Number(matchTeam.team_id)]) {
            return Number(matchTeam.team_id);
          }
        }

        if (num && num !== 999 && num !== 0 && num !== 68) {
          if (!teamMap[num]) {
            const tInfo = matchTeam || allTeamsData.find((t: any) => Number(t.team_id) === num);
            const cName = (tInfo?.coach_id && coachMap.get(Number(tInfo.coach_id))) || tInfo?.coach_name || 'TBA';
            teamMap[num] = {
              team_id: num,
              team_name: tInfo?.team_name || `Club #${num}`,
              abbreviation: tInfo?.abbreviation || `TM${num}`,
              logo_url: tInfo?.logo_url || '',
              coach_name: cName,
              conference: tInfo?.conference || '',
              division: tInfo?.division || '',
              league_id: numericLeagueId,
              gp: 0, wins: 0, losses: 0, ties: 0, otWins: 0, otLosses: 0, pts: 0, gf: 0, ga: 0, gd: 0,
              homeWins: 0, homeLosses: 0, homeTies: 0, awayWins: 0, awayLosses: 0, awayTies: 0,
              sog: 0, sa: 0, saves: 0, pim: 0, chks: 0, ppg: 0, shg: 0, shutouts: 0,
              history: [], streak: '-', l10: '0-0-0', homeRecord: '0-0-0', awayRecord: '0-0-0'
            };
          }
          return num;
        }

        return null;
      };

      // Helper to process game results
      const processGame = (rawHId: any, rawAId: any, homeScore: number, awayScore: number, gameMeta: any, statsObj?: any) => {
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
          teamMap[hId].ties += 1;
          teamMap[hId].homeTies += 1;
          teamMap[hId].pts += 1;
          teamMap[hId].history.push('T');

          teamMap[aId].ties += 1;
          teamMap[aId].awayTies += 1;
          teamMap[aId].pts += 1;
          teamMap[aId].history.push('T');
        } else if (homeScore > awayScore) {
          // Home Team Wins
          teamMap[hId].wins += 1;
          teamMap[hId].homeWins += 1;
          teamMap[hId].pts += 2;
          teamMap[hId].history.push('W');

          if (isOT) {
            teamMap[hId].otWins += 1;
            teamMap[aId].otLosses += 1;
            teamMap[aId].pts += 1;
            teamMap[aId].history.push('OTL');
          } else {
            teamMap[aId].losses += 1;
            teamMap[aId].awayLosses += 1;
            teamMap[aId].history.push('L');
          }
        } else if (awayScore > homeScore) {
          // Away Team Wins
          teamMap[aId].wins += 1;
          teamMap[aId].awayWins += 1;
          teamMap[aId].pts += 2;
          teamMap[aId].history.push('W');

          if (isOT) {
            teamMap[aId].otWins += 1;
            teamMap[hId].otLosses += 1;
            teamMap[hId].pts += 1;
            teamMap[hId].history.push('OTL');
          } else {
            teamMap[hId].losses += 1;
            teamMap[hId].homeLosses += 1;
            teamMap[hId].history.push('L');
          }
        }

        // Parse shots, checks, pim, ppg from home_stats & away_stats if available
        if (statsObj) {
          try {
            const hStats = typeof statsObj.home_stats === 'string' ? JSON.parse(statsObj.home_stats) : statsObj.home_stats;
            const aStats = typeof statsObj.away_stats === 'string' ? JSON.parse(statsObj.away_stats) : statsObj.away_stats;

            if (hStats) {
              const hShots = Number(hStats.shots ?? hStats.total_shots ?? hStats.home_shots ?? hStats.sog ?? 0);
              const hPim = Number(hStats.pim ?? hStats.penalty_minutes ?? hStats.home_pim ?? 0);
              const hChks = Number(hStats.checks ?? hStats.total_checks ?? hStats.home_checks ?? hStats.chks ?? 0);
              const hPpg = Number(hStats.ppg ?? hStats.pp_goals ?? hStats.home_ppg ?? 0);
              const hShg = Number(hStats.shg ?? hStats.sh_goals ?? hStats.home_shg ?? 0);

              teamMap[hId].sog += hShots;
              teamMap[aId].sa += hShots;
              teamMap[hId].pim += hPim;
              teamMap[hId].chks += hChks;
              teamMap[hId].ppg += hPpg;
              teamMap[hId].shg += hShg;
            }

            if (aStats) {
              const aShots = Number(aStats.shots ?? aStats.total_shots ?? aStats.away_shots ?? aStats.sog ?? 0);
              const aPim = Number(aStats.pim ?? aStats.penalty_minutes ?? aStats.away_pim ?? 0);
              const aChks = Number(aStats.checks ?? aStats.total_checks ?? aStats.away_checks ?? aStats.chks ?? 0);
              const aPpg = Number(aStats.ppg ?? aStats.pp_goals ?? aStats.away_ppg ?? 0);
              const aShg = Number(aStats.shg ?? aStats.sh_goals ?? aStats.away_shg ?? 0);

              teamMap[aId].sog += aShots;
              teamMap[hId].sa += aShots;
              teamMap[aId].pim += aPim;
              teamMap[aId].chks += aChks;
              teamMap[aId].ppg += aPpg;
              teamMap[aId].shg += aShg;
            }
          } catch {}
        }
      };

      // 1. Process all played gamestats
      const processedStatsGameIds = new Set<string>();
      (gamestatsRes.data || []).forEach((stats: any) => {
        const gIdStr = String(stats.game_id).trim();
        processedStatsGameIds.add(gIdStr);

        const homeScore = Number(stats.home_score) || 0;
        const awayScore = Number(stats.away_score) || 0;
        processGame(stats.home_team_id, stats.away_team_id, homeScore, awayScore, stats.game_meta, stats);
      });

      // 2. Also process any schedule matches marked played not yet in gamestats
      (schedRes.data || []).forEach((game: any) => {
        const gIdStr = String(game.game_id).trim();
        const rawPlayed = String(game.played || '').trim().toLowerCase();
        const isPlayed = rawPlayed === 'true' || rawPlayed === '1' || rawPlayed === 'y';

        if (isPlayed && !processedStatsGameIds.has(gIdStr) && (game as any).game_meta) {
          const homeScore = Number((game as any).home_score) || 0;
          const awayScore = Number((game as any).away_score) || 0;
          processGame(game.home_team_id, game.away_team_id, homeScore, awayScore, (game as any).game_meta, game);
        }
      });

      // 3. Merge or fallback with pre-calculated league_standings
      (standingsRes.data || []).forEach((row: any) => {
        const resolvedId = resolveTeamKey(row.team_id, row.team_name, row.coach_id);
        if (resolvedId && teamMap[resolvedId]) {
          const t = teamMap[resolvedId];
          const standGP = Number(row.gp || 0);
          if (standGP > t.gp || t.gp === 0) {
            t.gp = standGP;
            t.wins = Number(row.w ?? row.wins ?? t.wins);
            t.losses = Number(row.l ?? row.losses ?? t.losses);
            t.ties = Number(row.t ?? row.ties ?? t.ties);
            t.otWins = Number(row.otw ?? row.otWins ?? t.otWins);
            t.otLosses = Number(row.otl ?? row.otLosses ?? t.otLosses);
            t.pts = row.pts !== undefined ? Number(row.pts) : (t.wins * 2 + t.otLosses + t.ties);
            t.gf = Number(row.gf ?? t.gf);
            t.ga = Number(row.ga ?? t.ga);
            t.gd = t.gf - t.ga;
            if (row.strk) t.streak = row.strk;
            if (row.l10) t.l10 = row.l10;
            if (row.home) t.homeRecord = row.home;
            if (row.away) t.awayRecord = row.away;
          }
        }
      });

      // 4. Aggregate detailed player stats from master and api_stats into teams
      if (masterRes.data && masterRes.data.length > 0) {
        masterRes.data.forEach((row: any) => {
          const tId = resolveTeamKey(row.team_id, row.team_name, row.coach_id);
          if (!tId || !teamMap[tId]) return;
          const t = teamMap[tId];
          const pos = String(row.pos_played || '').toUpperCase();
          const isG = pos === 'G' || Number(row.shots_against || 0) > 0 || Number(row.saves || 0) > 0;

          if (isG) {
            t.sa = Math.max(t.sa, t.sa + Number(row.shots_against || 0));
            t.saves += Number(row.saves || 0);
            if (Number(row.goals_against || 0) === 0 && (Number(row.shots_against || 0) > 0 || row.is_win)) {
              t.shutouts += 1;
            }
          } else {
            t.sog = Math.max(t.sog, t.sog + Number(row.shots || 0));
            t.chks += Number(row.checks || 0);
            t.pim += Number(row.pim || 0);
            t.ppg += Number(row.pp_goals || (row.ppg ? 1 : 0) || 0);
            t.shg += Number(row.sh_goals || (row.shg ? 1 : 0) || 0);
          }
        });
      } else if (statsRes.data && statsRes.data.length > 0) {
        statsRes.data.forEach((row: any) => {
          const tId = resolveTeamKey(row.team_id, row.team_name, row.coach_id);
          if (!tId || !teamMap[tId]) return;
          const t = teamMap[tId];
          const pos = String(row.pos_played || row.pos || '').toUpperCase();
          const isG = pos === 'G' || Number(row.shots_against || row.sa || 0) > 0;

          if (isG) {
            t.sa = Math.max(t.sa, t.sa + Number(row.shots_against ?? row.total_shots_against ?? row.total_sa ?? row.sa ?? 0));
            t.saves += Number(row.saves ?? row.total_saves ?? row.sv ?? 0);
            t.shutouts += Number(row.shutouts ?? 0);
          } else {
            t.sog = Math.max(t.sog, t.sog + Number(row.total_sog ?? row.sog ?? row.shots ?? 0));
            t.chks += Number(row.total_chks ?? row.chks ?? row.checks ?? 0);
            t.pim += Number(row.total_pim ?? row.pim ?? 0);
            t.ppg += Number(row.ppg ?? row.total_ppg ?? 0);
            t.shg += Number(row.shg ?? row.total_shg ?? 0);
          }
        });
      }

      // 5. Final format and calculations for all teams
      const compiled: any[] = Object.values(teamMap).map((t: any) => {
        const gp = t.gp;
        const gf = t.gf;
        const ga = t.ga;
        const gd = gf - ga;
        const pts = t.pts !== undefined && t.pts > 0 ? t.pts : (t.wins * 2 + t.otLosses + t.ties);
        const winPct = gp > 0 ? Number(((t.wins * 2 + t.ties + t.otLosses) / (gp * 2)).toFixed(3)) : 0;
        const gfPerGame = gp > 0 ? Number((gf / gp).toFixed(2)) : 0;
        const gaPerGame = gp > 0 ? Number((ga / gp).toFixed(2)) : 0;

        // Auto fallback calculation for shots if not captured per player
        const sog = t.sog > 0 ? t.sog : (gf * 4 || 0);
        const sa = t.sa > 0 ? t.sa : (ga * 4 || 0);
        const saves = t.saves > 0 ? t.saves : Math.max(0, sa - ga);
        const sogPerGame = gp > 0 ? Number((sog / gp).toFixed(1)) : 0;
        const saPerGame = gp > 0 ? Number((sa / gp).toFixed(1)) : 0;
        const shPct = sog > 0 ? Number(((gf / sog) * 100).toFixed(1)) : 0;
        const svPct = sa > 0 ? Number((saves / sa).toFixed(3)) : 0;
        const pimPerGame = gp > 0 ? Number((t.pim / gp).toFixed(1)) : 0;
        const chksPerGame = gp > 0 ? Number((t.chks / gp).toFixed(1)) : 0;

        // Calculate streaks & L10 if available
        let streakStr = t.streak || '-';
        if (streakStr === '-' && t.history.length > 0) {
          const lastResult = t.history[t.history.length - 1];
          let count = 0;
          for (let i = t.history.length - 1; i >= 0; i--) {
            if (t.history[i] === lastResult) count++;
            else break;
          }
          streakStr = `${lastResult}${count}`;
        }

        let l10Str = t.l10 || '0-0-0';
        if (l10Str === '0-0-0' && t.history.length > 0) {
          const last10 = t.history.slice(-10);
          const l10W = last10.filter((r: string) => r === 'W').length;
          const l10L = last10.filter((r: string) => r === 'L').length;
          const l10T = last10.filter((r: string) => r === 'T').length;
          const l10OTL = last10.filter((r: string) => r === 'OTL').length;
          l10Str = l10OTL > 0
            ? (l10T > 0 ? `${l10W}-${l10L}-${l10T}-${l10OTL}` : `${l10W}-${l10L}-${l10OTL}`)
            : `${l10W}-${l10L}-${l10T}`;
        }

        const homeRec = t.homeRecord !== '0-0-0' ? t.homeRecord : `${t.homeWins}-${t.homeLosses}-${t.homeTies}`;
        const awayRec = t.awayRecord !== '0-0-0' ? t.awayRecord : `${t.awayWins}-${t.awayLosses}-${t.awayTies}`;

        return {
          ...t,
          pts,
          gd,
          gf_per_game: gfPerGame,
          ga_per_game: gaPerGame,
          win_pct: winPct,
          sog,
          sa,
          saves,
          sog_per_game: sogPerGame,
          sa_per_game: saPerGame,
          sh_pct: shPct,
          sv_pct: svPct,
          pim_per_game: pimPerGame,
          chks_per_game: chksPerGame,
          streak: streakStr,
          l10: l10Str,
          homeRecord: homeRec,
          awayRecord: awayRec
        };
      });

      // Default sort by PTS descending, then Wins, then GD
      compiled.sort((a, b) => (b.pts - a.pts) || (b.wins - a.wins) || (b.gd - a.gd));
      setTeamStats(compiled);
    } catch (err) {
      console.error("Error loading team stats:", err);
    } finally {
      setLoading(false);
    }
  }

  const teamNames = useMemo(() => {
    return ['All', ...Array.from(new Set(teamStats.map(t => t.team_name))).filter(Boolean).sort()];
  }, [teamStats]);

  const filteredTeams = useMemo(() => {
    if (selectedTeamFilter === 'All') return teamStats;
    return teamStats.filter(t => t.team_name === selectedTeamFilter);
  }, [teamStats, selectedTeamFilter]);

  const sortedTeams = useMemo(() => {
    if (!sortConfig) return filteredTeams;
    return [...filteredTeams].sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortConfig.dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      valA = Number(valA ?? 0);
      valB = Number(valB ?? 0);

      if (valA === valB) {
        return Number(b.pts ?? 0) - Number(a.pts ?? 0);
      }

      return sortConfig.dir === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [filteredTeams, sortConfig]);

  const requestSort = (key: string) => {
    setSortConfig({
      key,
      dir: sortConfig?.key === key && sortConfig.dir === 'desc' ? 'asc' : 'desc'
    });
  };

  const handleResetFilters = () => {
    setSelectedLeagueType('ALL');
    setSelectedTeamFilter('All');
    setSortConfig(null);
    setHoveredTeam(null);
    if (leagues.length > 0) {
      const latestId = String(leagues[0].league_id);
      setSelectedLeague(latestId);
      loadTeamStats(latestId);
    }
  };

  const exportToCSV = () => {
    if (sortedTeams.length === 0) return;
    const headers = [
      'TEAM', 'ABBR', 'COACH', 'GP', 'W', 'L', 'T', 'OTW', 'OTL', 'PTS', 'P%',
      'GF', 'GA', 'DIFF', 'GF/G', 'GA/G', 'SOG', 'SOG/G', 'SA', 'SA/G', 'SH%', 'SV%',
      'PPG', 'SHG', 'PIM', 'PIM/G', 'CHKS', 'CHKS/G', 'SO', 'STREAK', 'HOME', 'AWAY'
    ];

    const rows = sortedTeams.map(t => [
      t.team_name,
      t.abbreviation,
      t.coach_name,
      String(t.gp),
      String(t.wins),
      String(t.losses),
      String(t.ties),
      String(t.otWins),
      String(t.otLosses),
      String(t.pts),
      t.win_pct.toFixed(3),
      String(t.gf),
      String(t.ga),
      String(t.gd),
      t.gf_per_game.toFixed(2),
      t.ga_per_game.toFixed(2),
      String(t.sog),
      t.sog_per_game.toFixed(1),
      String(t.sa),
      t.sa_per_game.toFixed(1),
      `${t.sh_pct.toFixed(1)}%`,
      t.sv_pct.toFixed(3),
      String(t.ppg),
      String(t.shg),
      String(t.pim),
      t.pim_per_game.toFixed(1),
      String(t.chks),
      t.chks_per_game.toFixed(1),
      String(t.shutouts),
      t.streak,
      t.homeRecord,
      t.awayRecord
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => JSON.stringify(cell ?? '')).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `team_stats_season_${selectedLeague}.csv`);
    link.click();
  };

  // Identify leaders for highlighting in tables
  const leaders = useMemo(() => {
    if (teamStats.length === 0) return {};
    const maxVals: Record<string, number> = {};
    const minVals: Record<string, number> = {};

    const maxKeys = ['pts', 'wins', 'otWins', 'win_pct', 'gf', 'gf_per_game', 'gd', 'sog', 'sog_per_game', 'sh_pct', 'sv_pct', 'ppg', 'shg', 'pim', 'pim_per_game', 'chks', 'chks_per_game', 'shutouts'];
    maxKeys.forEach(k => {
      let max = -Infinity;
      teamStats.forEach(t => {
        const val = Number(t[k] ?? 0);
        if (val > max) max = val;
      });
      if (max > 0) maxVals[k] = max;
    });

    const minKeys = ['ga', 'ga_per_game', 'sa', 'sa_per_game'];
    minKeys.forEach(k => {
      let min = Infinity;
      teamStats.forEach(t => {
        if (t.gp > 0) {
          const val = Number(t[k] ?? 0);
          if (val < min) min = val;
        }
      });
      if (min !== Infinity) minVals[k] = min;
    });

    return { max: maxVals, min: minVals };
  }, [teamStats]);

  const renderCell = (val: any, isLeader: boolean = false, isBold: boolean = false) => (
    <td className="p-2 text-center">
      {isLeader ? (
        <span className="font-black text-black bg-yellow-100/70 px-1 py-0.5 rounded-2xs shadow-2xs border border-amber-300">
          {val}
        </span>
      ) : (
        <span className={isBold ? 'font-bold text-black' : 'text-neutral-700'}>{val}</span>
      )}
    </td>
  );

  return (
    <div className="bg-[#f4f1ea] text-black min-h-screen p-2 sm:p-4 font-serif text-sm">
      <header className="border-b-4 border-black pb-2 mb-4 text-center">
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter flex items-center justify-center gap-2">
          <Trophy className="w-7 h-7 sm:w-8 sm:h-8" />
          <span>Team Statistics</span>
        </h1>
        <p className="text-xs uppercase tracking-widest text-gray-600 mt-1">Official League Team Leaders & Analytics</p>
      </header>

      {/* Responsive Filter Toolbar */}
      <div className="mb-4 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        <div className="flex flex-wrap gap-2 sm:gap-4 items-center">
          {/* League Type Filter Badges */}
          <div className="flex items-center gap-1.5 bg-white border-2 border-black p-1 shadow-xs overflow-x-auto max-w-full no-scrollbar">
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

          <div className="flex items-center gap-2 flex-wrap">
            {/* Season Selector */}
            <select
              value={selectedLeague}
              onChange={(e) => {
                setSelectedLeague(e.target.value);
                loadTeamStats(e.target.value);
              }}
              className="bg-transparent border-b-2 border-black font-bold uppercase p-1 cursor-pointer text-xs sm:text-sm"
            >
              {filteredLeagues.map((l) => (
                <option key={l.league_id} value={l.league_id}>
                  {l.league_name}
                </option>
              ))}
            </select>

            {/* Team Filter Selector */}
            <select
              value={selectedTeamFilter}
              onChange={(e) => setSelectedTeamFilter(e.target.value)}
              className="bg-transparent border-b-2 border-black font-bold uppercase p-1 cursor-pointer text-xs sm:text-sm"
            >
              {teamNames.map((t) => (
                <option key={t} value={t}>
                  {t === 'All' ? 'All Teams' : t}
                </option>
              ))}
            </select>

            <button
              onClick={handleResetFilters}
              className="bg-black text-white px-2.5 sm:px-3 py-1 text-xs font-bold uppercase hover:bg-gray-800 rounded-xs cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 bg-black text-white px-3 py-1 text-xs font-bold uppercase hover:bg-gray-800 rounded-xs w-full sm:w-auto justify-center cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex gap-2 sm:gap-4 mb-4 text-xs uppercase border-b border-black pb-2 justify-center flex-wrap">
        {[
          { id: 'Home', label: 'League Leaders' },
          { id: 'All Teams', label: 'All Teams Table' },
          { id: 'Offense', label: 'Offense' },
          { id: 'Defense', label: 'Defense & Goaltending' },
          { id: 'Special Teams', label: 'Special Teams & Physical' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              setSortConfig(null);
            }}
            className={`py-1 px-3 rounded-xs uppercase font-bold text-xs transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'bg-black text-white shadow-xs'
                : 'text-gray-600 hover:text-black hover:bg-black/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white border border-black p-12 text-center text-sm font-bold uppercase tracking-wider shadow-sm">
          Loading team statistics and league leaders...
        </div>
      ) : (
        <>
          {/* HOME TAB: 4 LEAGUE LEADER CARDS */}
          {activeTab === 'Home' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Card 1: Standings & Record Leaders */}
              <TeamStatCard
                title="Standings & Record Leaders"
                data={filteredTeams}
                subTabs={['PTS', 'Wins', 'OTW', 'P%', 'DIFF']}
                defaultSubTab="PTS"
                onTabClick={(tab) => setActiveTab(tab as any)}
                hoveredTeam={hoveredTeam}
                setHoveredTeam={setHoveredTeam}
                targetTabName="All Teams"
              />

              {/* Card 2: Offensive Leaders */}
              <TeamStatCard
                title="Offensive Scoring Leaders"
                data={filteredTeams}
                subTabs={['GF', 'GF/G', 'SOG', 'SH%']}
                defaultSubTab="GF"
                onTabClick={(tab) => setActiveTab(tab as any)}
                hoveredTeam={hoveredTeam}
                setHoveredTeam={setHoveredTeam}
                targetTabName="Offense"
              />

              {/* Card 3: Defensive Leaders */}
              <TeamStatCard
                title="Defense & Goaltending Leaders"
                data={filteredTeams}
                subTabs={['GA', 'GA/G', 'SA', 'SV%']}
                defaultSubTab="GA"
                onTabClick={(tab) => setActiveTab(tab as any)}
                hoveredTeam={hoveredTeam}
                setHoveredTeam={setHoveredTeam}
                targetTabName="Defense"
              />

              {/* Card 4: Special Teams & Physical Leaders */}
              <TeamStatCard
                title="Special Teams & Physical Leaders"
                data={filteredTeams}
                subTabs={['PPG', 'SHG', 'PIM', 'CHKS', 'SO']}
                defaultSubTab="PPG"
                onTabClick={(tab) => setActiveTab(tab as any)}
                hoveredTeam={hoveredTeam}
                setHoveredTeam={setHoveredTeam}
                targetTabName="Special Teams"
              />
            </div>
          )}

          {/* TABLE VIEWS: ALL TEAMS / OFFENSE / DEFENSE / SPECIAL TEAMS */}
          {activeTab !== 'Home' && (
            <div>
              {/* Mobile Swipe Notice */}
              <div className="md:hidden flex items-center justify-between text-[10px] font-sans font-bold text-black/60 px-3 py-1.5 bg-[#ebd9c0]/50 border border-black/15 mb-2 rounded-xs uppercase tracking-wider">
                <span>↔ Swipe table sideways for full stats</span>
                <span>{sortedTeams.length} Teams</span>
              </div>

              <div className="overflow-x-auto -mx-2 sm:mx-0 border border-gray-300 shadow-sm rounded-xs bg-white">
                <table className="w-full text-[11px] border-collapse whitespace-nowrap min-w-[950px]">
                  <thead className="bg-black text-white font-sans text-xs">
                    <tr>
                      <th className="sticky left-0 bg-black z-20 p-2 text-center w-10 border-r border-neutral-700">#</th>
                      <th className="sticky left-10 bg-black z-20 p-2 text-left min-w-[160px] border-r border-neutral-700">TEAM</th>

                      {activeTab === 'All Teams' && (
                        <>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('gp')}>GP</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('wins')}>W</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('losses')}>L</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('ties')}>T</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('otWins')}>OTW</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('otLosses')}>OTL</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800 font-black text-amber-300" onClick={() => requestSort('pts')}>PTS</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('win_pct')}>P%</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('gf')}>GF</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('ga')}>GA</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('gd')}>DIFF</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('gf_per_game')}>GF/G</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('ga_per_game')}>GA/G</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('sog')}>SOG</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('sa')}>SA</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('sh_pct')}>SH%</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('sv_pct')}>SV%</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('ppg')}>PPG</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('shg')}>SHG</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('pim')}>PIM</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('chks')}>CHKS</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('shutouts')}>SO</th>
                          <th className="p-2 text-center">STREAK</th>
                          <th className="p-2 text-center">HOME</th>
                          <th className="p-2 text-center">AWAY</th>
                        </>
                      )}

                      {activeTab === 'Offense' && (
                        <>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('gp')}>GP</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800 font-black text-amber-300" onClick={() => requestSort('gf')}>GF</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('gf_per_game')}>GF/G</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('sog')}>SOG</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('sog_per_game')}>SOG/G</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('sh_pct')}>SH%</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('ppg')}>PPG</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('shg')}>SHG</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('pts')}>PTS</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('gd')}>DIFF</th>
                        </>
                      )}

                      {activeTab === 'Defense' && (
                        <>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('gp')}>GP</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800 font-black text-amber-300" onClick={() => requestSort('ga')}>GA</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('ga_per_game')}>GA/G</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('sa')}>SA</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('sa_per_game')}>SA/G</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('saves')}>SAVES</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('sv_pct')}>SV%</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('shutouts')}>SO</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('wins')}>W</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('pts')}>PTS</th>
                        </>
                      )}

                      {activeTab === 'Special Teams' && (
                        <>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('gp')}>GP</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800 font-black text-amber-300" onClick={() => requestSort('ppg')}>PPG</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('shg')}>SHG</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('pim')}>PIM</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('pim_per_game')}>PIM/G</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('chks')}>CHKS</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('chks_per_game')}>CHKS/G</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('shutouts')}>SO</th>
                          <th className="p-2 text-center cursor-pointer hover:bg-neutral-800" onClick={() => requestSort('pts')}>PTS</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTeams.map((t, i) => {
                      const diffFormatted = t.gd > 0 ? `+${t.gd}` : String(t.gd);
                      const isPointsLeader = t.pts > 0 && t.pts === leaders.max?.pts;
                      const isGfLeader = t.gf > 0 && t.gf === leaders.max?.gf;
                      const isGaLeader = t.gp > 0 && t.ga === leaders.min?.ga;
                      const isSvLeader = t.sv_pct > 0 && t.sv_pct === leaders.max?.sv_pct;
                      const isShLeader = t.sh_pct > 0 && t.sh_pct === leaders.max?.sh_pct;
                      const isSogLeader = t.sog > 0 && t.sog === leaders.max?.sog;
                      const isSaLeader = t.gp > 0 && t.sa === leaders.min?.sa;
                      const isPpgLeader = t.ppg > 0 && t.ppg === leaders.max?.ppg;
                      const isShgLeader = t.shg > 0 && t.shg === leaders.max?.shg;
                      const isPimLeader = t.pim > 0 && t.pim === leaders.max?.pim;
                      const isChksLeader = t.chks > 0 && t.chks === leaders.max?.chks;
                      const isSoLeader = t.shutouts > 0 && t.shutouts === leaders.max?.shutouts;

                      return (
                        <tr key={t.team_id || i} className="group border-b border-gray-200 hover:bg-yellow-50/50 transition-colors">
                          <td className="sticky left-0 bg-white group-hover:bg-yellow-50/80 z-10 p-2 text-center w-10 border-r border-gray-200 font-mono text-gray-500 font-bold">
                            {i + 1}
                          </td>
                          <td className="sticky left-10 bg-white group-hover:bg-yellow-50/80 z-10 p-2 border-r border-gray-200 shadow-[2px_0_4px_rgba(0,0,0,0.03)]">
                            <Link
                              href={`/team/${t.team_id}?season=${selectedLeague}`}
                              className="flex items-center gap-2 hover:text-red-700 transition font-bold"
                            >
                              {t.logo_url ? (
                                <img src={t.logo_url} className="h-5 w-5 object-contain shrink-0" alt="" />
                              ) : (
                                <span className="w-5 h-5 bg-neutral-200 border border-black/20 flex items-center justify-center text-[10px] font-black shrink-0">
                                  {t.abbreviation}
                                </span>
                              )}
                              <span className="truncate">{t.team_name}</span>
                            </Link>
                          </td>

                          {activeTab === 'All Teams' && (
                            <>
                              {renderCell(t.gp)}
                              {renderCell(t.wins, t.wins > 0 && t.wins === leaders.max?.wins)}
                              {renderCell(t.losses)}
                              {renderCell(t.ties)}
                              {renderCell(t.otWins, t.otWins > 0 && t.otWins === leaders.max?.otWins)}
                              {renderCell(t.otLosses)}
                              {renderCell(t.pts, isPointsLeader, true)}
                              {renderCell(t.win_pct.toFixed(3))}
                              {renderCell(t.gf, isGfLeader)}
                              {renderCell(t.ga, isGaLeader)}
                              {renderCell(diffFormatted, t.gd > 0 && t.gd === leaders.max?.gd)}
                              {renderCell(t.gf_per_game.toFixed(2))}
                              {renderCell(t.ga_per_game.toFixed(2))}
                              {renderCell(t.sog, isSogLeader)}
                              {renderCell(t.sa, isSaLeader)}
                              {renderCell(`${t.sh_pct.toFixed(1)}%`, isShLeader)}
                              {renderCell(t.sv_pct.toFixed(3), isSvLeader)}
                              {renderCell(t.ppg, isPpgLeader)}
                              {renderCell(t.shg, isShgLeader)}
                              {renderCell(t.pim, isPimLeader)}
                              {renderCell(t.chks, isChksLeader)}
                              {renderCell(t.shutouts, isSoLeader)}
                              {renderCell(t.streak)}
                              {renderCell(t.homeRecord)}
                              {renderCell(t.awayRecord)}
                            </>
                          )}

                          {activeTab === 'Offense' && (
                            <>
                              {renderCell(t.gp)}
                              {renderCell(t.gf, isGfLeader, true)}
                              {renderCell(t.gf_per_game.toFixed(2))}
                              {renderCell(t.sog, isSogLeader)}
                              {renderCell(t.sog_per_game.toFixed(1))}
                              {renderCell(`${t.sh_pct.toFixed(1)}%`, isShLeader)}
                              {renderCell(t.ppg, isPpgLeader)}
                              {renderCell(t.shg, isShgLeader)}
                              {renderCell(t.pts, isPointsLeader)}
                              {renderCell(diffFormatted, t.gd > 0 && t.gd === leaders.max?.gd)}
                            </>
                          )}

                          {activeTab === 'Defense' && (
                            <>
                              {renderCell(t.gp)}
                              {renderCell(t.ga, isGaLeader, true)}
                              {renderCell(t.ga_per_game.toFixed(2))}
                              {renderCell(t.sa, isSaLeader)}
                              {renderCell(t.sa_per_game.toFixed(1))}
                              {renderCell(t.saves)}
                              {renderCell(t.sv_pct.toFixed(3), isSvLeader)}
                              {renderCell(t.shutouts, isSoLeader)}
                              {renderCell(t.wins)}
                              {renderCell(t.pts, isPointsLeader)}
                            </>
                          )}

                          {activeTab === 'Special Teams' && (
                            <>
                              {renderCell(t.gp)}
                              {renderCell(t.ppg, isPpgLeader, true)}
                              {renderCell(t.shg, isShgLeader)}
                              {renderCell(t.pim, isPimLeader)}
                              {renderCell(t.pim_per_game.toFixed(1))}
                              {renderCell(t.chks, isChksLeader)}
                              {renderCell(t.chks_per_game.toFixed(1))}
                              {renderCell(t.shutouts, isSoLeader)}
                              {renderCell(t.pts, isPointsLeader)}
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
