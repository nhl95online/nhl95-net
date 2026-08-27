'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  getAllSeasons,
  getSeasonConfig,
  W_LEAGUE_GOALIES,
  W_LEAGUE_SKATERS,
  W_LEAGUE_POSITION_COUNTS,
  O_LEAGUE_GOALIES,
  O_LEAGUE_SKATERS,
  O_LEAGUE_POSITION_COUNTS
} from '@/lib/seasons';

// Helper to normalize player names for foolproof exact matching
const normalizeName = (name: string) => {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[.'’\-\s_]/g, '');
};

// Build static lookup sets for all known goalies, forwards, and defensemen across all registered seasons
const KNOWN_GOALIES_SET = new Set<string>();
const KNOWN_FORWARDS_SET = new Set<string>();
const KNOWN_DEFENSE_SET = new Set<string>();

const populateKnownPositions = () => {
  try {
    const allConfigs = getAllSeasons();
    allConfigs.forEach(cfg => {
      if (cfg.goalies) {
        Object.values(cfg.goalies).forEach(names => {
          if (Array.isArray(names)) {
            names.forEach(n => {
              if (n && n !== '--') KNOWN_GOALIES_SET.add(normalizeName(n));
            });
          }
        });
      }
      if (cfg.skaters) {
        Object.entries(cfg.skaters).forEach(([team, names]) => {
          if (Array.isArray(names)) {
            const fCount = cfg.teamPositionCounts?.[team]?.forwards ?? cfg.defaultPositionCounts?.forwards ?? 5;
            names.slice(0, fCount).forEach(n => {
              if (n && n !== '--') KNOWN_FORWARDS_SET.add(normalizeName(n));
            });
            names.slice(fCount).forEach(n => {
              if (n && n !== '--') KNOWN_DEFENSE_SET.add(normalizeName(n));
            });
          }
        });
      }
    });
  } catch {
    // Fallback if getAllSeasons is not ready
  }

  // Ensure base W and O leagues are always populated
  if (W_LEAGUE_GOALIES) {
    Object.values(W_LEAGUE_GOALIES).forEach(names => {
      if (Array.isArray(names)) {
        names.forEach(n => {
          if (n && n !== '--') KNOWN_GOALIES_SET.add(normalizeName(n));
        });
      }
    });
  }
  if (O_LEAGUE_GOALIES) {
    Object.values(O_LEAGUE_GOALIES).forEach(names => {
      if (Array.isArray(names)) {
        names.forEach(n => {
          if (n && n !== '--') KNOWN_GOALIES_SET.add(normalizeName(n));
        });
      }
    });
  }

  if (W_LEAGUE_SKATERS) {
    Object.entries(W_LEAGUE_SKATERS).forEach(([team, names]) => {
      if (Array.isArray(names)) {
        const fCount = W_LEAGUE_POSITION_COUNTS?.[team]?.forwards ?? 5;
        names.slice(0, fCount).forEach(n => {
          if (n && n !== '--') KNOWN_FORWARDS_SET.add(normalizeName(n));
        });
        names.slice(fCount).forEach(n => {
          if (n && n !== '--') KNOWN_DEFENSE_SET.add(normalizeName(n));
        });
      }
    });
  }

  if (O_LEAGUE_SKATERS) {
    Object.entries(O_LEAGUE_SKATERS).forEach(([team, names]) => {
      if (Array.isArray(names)) {
        const fCount = O_LEAGUE_POSITION_COUNTS?.[team]?.forwards ?? 5;
        names.slice(0, fCount).forEach(n => {
          if (n && n !== '--') KNOWN_FORWARDS_SET.add(normalizeName(n));
        });
        names.slice(fCount).forEach(n => {
          if (n && n !== '--') KNOWN_DEFENSE_SET.add(normalizeName(n));
        });
      }
    });
  }
};
populateKnownPositions();

const parseTOI = (val: any): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) || val <= 0 ? 0 : val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed === '-' || trimmed === '--' || trimmed === '0' || trimmed === '0:00' || trimmed === '00:00' || trimmed === '0:00:00') return 0;
    if (trimmed.includes(':')) {
      const parts = trimmed.split(':').map(Number);
      if (parts.length === 3) {
        return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
      }
      return (parts[0] || 0) * 60 + (parts[1] || 0);
    }
    const num = parseFloat(trimmed);
    return isNaN(num) || num <= 0 ? 0 : num;
  }
  return 0;
};

const formatSecondsToMMSS = (seconds: number | string): string => {
  const s = typeof seconds === 'string' ? parseInt(seconds, 10) : seconds;
  if (isNaN(s) || s <= 0) return '0:00';
  const m = Math.floor(s / 60);
  const remS = Math.round(s % 60);
  return `${m}:${remS < 10 ? '0' : ''}${remS}`;
};

// Check if player has positive recorded Time on Ice (TOI > 0)
const hasPositiveTOI = (p: any): boolean => {
  if (!p) return false;
  const toiVals = [p.toi_seconds, p.toiSeconds, p.toi_minutes, p.toi, p.time_on_ice, p.toi_min, p.toiSec];
  for (const v of toiVals) {
    if (v !== undefined && v !== null && parseTOI(v) > 0) {
      return true;
    }
  }
  return false;
};

// Check if player has participated (strictly requires TOI > 0 for all players)
const hasPlayed = (p: any): boolean => {
  if (!p) return false;
  return hasPositiveTOI(p);
};

const resolvePlayerPosition = (p: any, posMap: Map<string, string>): 'G' | 'D' | 'F' => {
  const norm = normalizeName(p.player_name);
  if (KNOWN_GOALIES_SET.has(norm)) return 'G';
  if (KNOWN_DEFENSE_SET.has(norm)) return 'D';
  if (KNOWN_FORWARDS_SET.has(norm)) return 'F';

  const directPos = String(p.pos_played || p.pos || p.position || p.player_pos || '').trim().toUpperCase();
  if (directPos === 'G' || directPos.includes('GOALIE') || directPos.includes('GK') || directPos.includes('GOALTENDER')) return 'G';
  if (directPos === 'D' || directPos.includes('DEF') || directPos === 'LD' || directPos === 'RD') return 'D';
  if (directPos === 'F' || directPos === 'C' || directPos === 'LW' || directPos === 'RW' || directPos.includes('FORW')) return 'F';

  const idKey = p.player_id && String(p.player_id) !== '1' && String(p.player_id) !== '0' ? String(p.player_id) : '';
  const rawName = String(p.player_name || '').trim().toLowerCase();
  const dbPos = String(
    (idKey ? posMap.get(idKey) : '') ||
    posMap.get(rawName) ||
    posMap.get(norm) ||
    ''
  ).trim().toUpperCase();

  if (dbPos === 'G' || dbPos.includes('GOALIE') || dbPos.includes('GK') || dbPos.includes('GOALTENDER')) return 'G';
  if (dbPos === 'D' || dbPos.includes('DEF') || dbPos === 'LD' || dbPos === 'RD') return 'D';
  if (dbPos === 'F' || dbPos === 'C' || dbPos === 'LW' || dbPos === 'RW' || dbPos.includes('FORW')) return 'F';

  const sa = Number(p.shots_against ?? p.total_shots_against ?? p.total_sa ?? p.sa ?? 0);
  const sv = Number(p.saves ?? p.total_saves ?? p.sv ?? 0);
  const sog = Number(p.total_sog ?? p.sog ?? p.shots ?? 0);
  const chks = Number(p.total_chks ?? p.chks ?? p.checks ?? 0);
  if ((sa > 0 || sv > 0 || Number(p.wins ?? 0) > 0 || Number(p.shutouts ?? 0) > 0) && sog === 0 && chks === 0) {
    return 'G';
  }

  return 'F';
};

const StatCard = ({ title, data, category, minGP = 10, onTabClick, hoveredPlayer, setHoveredPlayer }: any) => {
  const [activeSubTab, setActiveSubTab] = useState(category === 'Goalies' ? 'GAA' : 'Points');
  const getSubTabs = () => (category === 'Goalies' ? ['GAA', 'SV%', 'SO'] : ['Points', 'Goals', 'Assists']);

  const sorted = useMemo(() => {
    let list = [...data];
    if (category === 'Goalies') {
      const minGames = minGP !== undefined ? minGP : 10;
      list = list.filter(p => Number(p.gp || 0) >= minGames && hasPositiveTOI(p));

      if (activeSubTab === 'GAA') {
        return list.sort((a, b) => {
          const gaaA = a.gaa != null && !isNaN(Number(a.gaa)) && Number(a.gaa) > 0
            ? Number(a.gaa)
            : ((Number(a.gp || 0) > 0 || Number(a.shots_against || 0) > 0)
              ? (Number(a.goals_against ?? a.total_goals_against ?? a.total_ga ?? a.ga ?? 0) / Math.max(1, Number(a.gp || 1)))
              : 999);
          const gaaB = b.gaa != null && !isNaN(Number(b.gaa)) && Number(b.gaa) > 0
            ? Number(b.gaa)
            : ((Number(b.gp || 0) > 0 || Number(b.shots_against || 0) > 0)
              ? (Number(b.goals_against ?? b.total_goals_against ?? b.total_ga ?? b.ga ?? 0) / Math.max(1, Number(b.gp || 1)))
              : 999);
          if (gaaA !== gaaB) return gaaA - gaaB;
          return (Number(b.wins) || 0) - (Number(a.wins) || 0);
        });
      }
      if (activeSubTab === 'SV%') {
        return list.sort((a, b) => {
          const svA = a.sv_pct != null && !isNaN(Number(a.sv_pct))
            ? Number(a.sv_pct)
            : ((Number(a.shots_against || 0) > 0) ? (Number(a.saves || 0) / Number(a.shots_against || 1)) : 0);
          const svB = b.sv_pct != null && !isNaN(Number(b.sv_pct))
            ? Number(b.sv_pct)
            : ((Number(b.shots_against || 0) > 0) ? (Number(b.saves || 0) / Number(b.shots_against || 1)) : 0);
          if (svA !== svB) return svB - svA;
          return (Number(b.saves) || 0) - (Number(a.saves) || 0);
        });
      }
      return list.sort((a, b) => {
        const soA = Number(a.shutouts) || 0;
        const soB = Number(b.shutouts) || 0;
        if (soA !== soB) return soB - soA;
        return (Number(b.wins) || 0) - (Number(a.wins) || 0);
      });
    }
    if (activeSubTab === 'Goals') {
      return list.sort((a, b) => Number(b.total_goals ?? b.goals ?? 0) - Number(a.total_goals ?? a.goals ?? 0));
    }
    if (activeSubTab === 'Assists') {
      return list.sort((a, b) => Number(b.total_assists ?? b.assists ?? 0) - Number(a.total_assists ?? a.assists ?? 0));
    }
    return list.sort((a, b) => {
      const pA = Number(a.total_points ?? a.points ?? (Number(a.total_goals ?? a.goals ?? 0) + Number(a.total_assists ?? a.assists ?? 0)));
      const pB = Number(b.total_points ?? b.points ?? (Number(b.total_goals ?? b.goals ?? 0) + Number(b.total_assists ?? b.assists ?? 0)));
      return pB - pA;
    });
  }, [data, activeSubTab, category, minGP]);

  const defaultTop = sorted[0];
  const activeTop = hoveredPlayer && sorted.some(p => (p.player_id && p.player_id === hoveredPlayer.player_id) || (p.player_name && p.player_name === hoveredPlayer.player_name))
    ? sorted.find(p => (p.player_id && p.player_id === hoveredPlayer.player_id) || (p.player_name && p.player_name === hoveredPlayer.player_name))
    : defaultTop;

  const top = activeTop || defaultTop;

  const getValue = (p: any) => {
    if (!p) return 0;
    if (activeSubTab === 'GAA') {
      if (p.gaa != null && !isNaN(Number(p.gaa)) && Number(p.gaa) > 0) return Number(p.gaa).toFixed(2);
      const gp = Number(p.gp ?? 0);
      const ga = Number(p.goals_against ?? p.total_goals_against ?? p.total_ga ?? p.ga ?? 0);
      return gp > 0 ? (ga / gp).toFixed(2) : '-';
    }
    if (activeSubTab === 'SV%') {
      if (p.sv_pct != null && !isNaN(Number(p.sv_pct)) && Number(p.sv_pct) > 0) return Number(p.sv_pct).toFixed(3);
      const sa = Number(p.shots_against ?? p.total_shots_against ?? p.total_sa ?? p.sa ?? 0);
      const sv = Number(p.saves ?? p.total_saves ?? p.sv ?? 0);
      return sa > 0 ? (sv / sa).toFixed(3) : '-';
    }
    if (activeSubTab === 'Goals') return p.total_goals ?? p.goals ?? 0;
    if (activeSubTab === 'Assists') return p.total_assists ?? p.assists ?? 0;
    if (activeSubTab === 'SO') return p.shutouts ?? 0;
    return p.total_points ?? p.points ?? ((p.total_goals ?? p.goals ?? 0) + (p.total_assists ?? p.assists ?? 0));
  };

  return (
    <div className="border border-black p-4 bg-white shadow-sm">
      <h2
        className="font-black text-sm uppercase mb-3 cursor-pointer hover:underline flex items-baseline justify-between"
        onClick={() => onTabClick(category === 'Goalies' ? 'Goalies' : 'Skaters')}
      >
        <span>{title} &gt;</span>
        {category === 'Goalies' && (
          <span className="text-[10px] font-normal text-gray-500 lowercase tracking-normal">
            (min. {minGP} gp)
          </span>
        )}
      </h2>
      <div className="flex gap-4 border-b border-gray-200 mb-4 text-[10px] font-bold uppercase">
        {getSubTabs().map(tab => (
          <button
            key={tab}
            className={activeSubTab === tab ? 'border-b-2 border-black pb-1' : 'text-gray-400 pb-1'}
            onClick={() => setActiveSubTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      {top ? (
        <div className="flex gap-8">
          <div className="text-center w-1/3 border-r border-gray-100 pr-4">
            <img src={top.logo_url || '/placeholder.png'} className="h-16 w-16 mx-auto mb-2 object-contain" alt="Team" />
            <p className="font-bold text-xs truncate">{top.player_name} {(top.is_rookie === true || top.is_rookie === 'true' || top.is_rookie === 1) && <span className="text-red-600 font-black">[R]</span>}</p>
            <p className="text-[10px] text-gray-500 mb-2">{top.team_name}</p>
            <p className="text-3xl font-black text-black">{getValue(top)}</p>
          </div>
          <div className="w-2/3 flex flex-col justify-between">
            {sorted.slice(0, 10).map((p, i) => {
              const isHovered = hoveredPlayer && ((p.player_id && p.player_id === hoveredPlayer.player_id) || (p.player_name && p.player_name === hoveredPlayer.player_name));
              return (
                <div
                  key={i}
                  className={`flex justify-between items-center text-[11px] py-1 border-b border-gray-50 cursor-pointer px-1 ${isHovered ? 'bg-yellow-100 font-bold' : 'hover:bg-gray-50'}`}
                  onMouseEnter={() => setHoveredPlayer(p)}
                  onMouseLeave={() => setHoveredPlayer(null)}
                >
                  <span className="truncate flex-1">
                    {i + 1}. {p.player_name} {(p.is_rookie === true || p.is_rookie === 'true' || p.is_rookie === 1) && <span className="text-red-600 font-black text-[9px]">[R]</span>}
                  </span>
                  <span className="font-black text-black ml-12">{getValue(p)}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-gray-500 font-bold uppercase italic">
          {category === 'Goalies' ? `No qualifying goalies (Min. ${minGP} GP)` : 'No qualifying players'}
        </div>
      )}
    </div>
  );
};

const LEAGUE_LOGOS: Record<string, { name: string; logoUrl: string; fallbackUrl?: string }> = {
  W: { name: 'W League', logoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/WN95HL.png', fallbackUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/WN95HL.png' },
  Q: { name: 'The Q', logoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/TheQ.png', fallbackUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/TheQ.png' },
  O: { name: 'Original 6', logoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/Original6.png', fallbackUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Original6.png' },
  V: { name: 'Vintage', logoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/Vintage.png', fallbackUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Vintage.png' },
  G: { name: 'Golden Era', logoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/Golden%20Era.png', fallbackUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Golden%20Era.png' }
};

const SEASON_TYPES: Record<number, string> = {
  1: 'W', 2: 'W', 3: 'W', 4: 'W', 5: 'Q', 6: 'W', 7: 'Q', 8: 'Q', 9: 'W', 10: 'Q',
  11: 'W', 12: 'Q', 13: 'Q', 14: 'W', 15: 'Q', 16: 'G', 17: 'Q', 18: 'W', 19: 'Q', 20: 'V',
  21: 'Q', 22: 'W', 23: 'Q', 24: 'W', 25: 'Q', 26: 'Q', 27: 'Q', 28: 'W', 29: 'Q', 30: 'Q',
  31: 'W', 32: 'Q', 33: 'W', 34: 'Q', 35: 'W', 36: 'Q', 37: 'W', 38: 'W', 39: 'O', 40: 'W'
};

// Dynamic helper: extracts league type (W, Q, O, V, G, etc.) from league name or code automatically
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

export default function NewspaperPage() {
  const [activeTab, setActiveTab] = useState('Home');
  const [leagues, setLeagues] = useState<any[]>([]);
  const [selectedLeagueType, setSelectedLeagueType] = useState<string>('ALL');
  const [selectedLeague, setSelectedLeague] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('All');
  const [data, setData] = useState<any[]>([]);
  const [posMap, setPosMap] = useState<Map<string, string>>(new Map());
  const [sortConfig, setSortConfig] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);

  const [hoveredSkater, setHoveredSkater] = useState<any>(null);
  const [hoveredGoalie, setHoveredGoalie] = useState<any>(null);
  const [hoveredDefense, setHoveredDefense] = useState<any>(null);
  const [hoveredRookie, setHoveredRookie] = useState<any>(null);

  useEffect(() => {
    async function fetchLeagues() {
      const { data } = await supabase
        .from('leagues')
        .select('league_id, league_name')
        .order('league_id', { ascending: false });

      if (data && data.length > 0) {
        setLeagues(data);
        const latest = data.reduce((prev, curr) => (Number(curr.league_id) > Number(prev.league_id) ? curr : prev), data[0]);
        const latestId = String(latest.league_id);
        setSelectedLeague(latestId);
        loadData(latestId);
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
      const latestInType = list.reduce((prev, curr) => (Number(curr.league_id) > Number(prev.league_id) ? curr : prev), list[0]);
      const nextId = String(latestInType.league_id);
      setSelectedLeague(nextId);
      loadData(nextId);
    }
  };

  async function loadData(leagueId: string) {
    const sId = parseInt(leagueId, 10);

    // Dynamic config refresh for the active league/season
    try {
      const cfg = getSeasonConfig(sId);
      if (cfg?.goalies) {
        Object.values(cfg.goalies).forEach(names => {
          if (Array.isArray(names)) {
            names.forEach(n => {
              if (n && n !== '--') KNOWN_GOALIES_SET.add(normalizeName(n));
            });
          }
        });
      }
      if (cfg?.skaters) {
        Object.entries(cfg.skaters).forEach(([team, names]) => {
          if (Array.isArray(names)) {
            const fCount = cfg.teamPositionCounts?.[team]?.forwards ?? cfg.defaultPositionCounts?.forwards ?? 5;
            names.slice(0, fCount).forEach(n => {
              if (n && n !== '--') KNOWN_FORWARDS_SET.add(normalizeName(n));
            });
            names.slice(fCount).forEach(n => {
              if (n && n !== '--') KNOWN_DEFENSE_SET.add(normalizeName(n));
            });
          }
        });
      }
    } catch { }

    try {
      // Fetch stats, master player game stats, rosters, database, and teams in parallel
      const [statsRes, masterRes, rosterRes, playerDbRes, teamsRes] = await Promise.all([
        supabase.from('api_stats_with_names').select('*').eq('league_id', sId),
        supabase.from('league_player_stats_master').select('*').eq('league_id', sId),
        supabase.from('league_rosters').select('*').eq('league_id', sId),
        supabase.from('league_player_database').select('*'),
        supabase.from('league_teams').select('*')
      ]);

      // Build team lookup map
      const teamMap = new Map<string, { name: string; logo: string; abbr: string }>();
      (teamsRes.data || []).forEach((t: any) => {
        const tId = String(t.team_id);
        const abbr = String(t.abbreviation || '').trim().toUpperCase();
        const name = String(t.team_name || '').trim();
        const obj = { name, logo: t.logo_url || '', abbr };
        if (tId) teamMap.set(tId, obj);
        if (abbr) teamMap.set(abbr, obj);
        if (name) teamMap.set(name.toLowerCase(), obj);
      });

      // Build player / roster lookup map
      const newPosMap = new Map<string, string>();
      const playerMetaMap = new Map<string, any>();

      if (playerDbRes.data) {
        playerDbRes.data.forEach((p: any) => {
          const pos = String(p.pos || '').trim().toUpperCase();
          const pName = String(p.player_name || '').trim();
          const norm = normalizeName(pName);
          const pId = p.player_id && String(p.player_id) !== '1' && String(p.player_id) !== '0' ? String(p.player_id) : '';
          if (pos) {
            if (pId) newPosMap.set(pId, pos);
            if (pName) newPosMap.set(pName.toLowerCase(), pos);
            if (norm) newPosMap.set(norm, pos);
          }
          if (pId) playerMetaMap.set(pId, p);
          if (pName) playerMetaMap.set(pName.toLowerCase(), p);
          if (norm) playerMetaMap.set(norm, p);
        });
      }

      if (rosterRes.data) {
        rosterRes.data.forEach((p: any) => {
          const pos = String(p.pos || p.position || '').trim().toUpperCase();
          const pName = String(p.player_name || '').trim();
          const norm = normalizeName(pName);
          const pId = p.player_id && String(p.player_id) !== '1' && String(p.player_id) !== '0' ? String(p.player_id) : '';
          if (pos) {
            if (pId) newPosMap.set(pId, pos);
            if (pName) newPosMap.set(pName.toLowerCase(), pos);
            if (norm) newPosMap.set(norm, pos);
          }
          if (pId) playerMetaMap.set(pId, { ...(playerMetaMap.get(pId) || {}), ...p });
          if (pName) playerMetaMap.set(pName.toLowerCase(), { ...(playerMetaMap.get(pName.toLowerCase()) || {}), ...p });
          if (norm) playerMetaMap.set(norm, { ...(playerMetaMap.get(norm) || {}), ...p });
        });
      }

      setPosMap(newPosMap);

      // Aggregate stats from league_player_stats_master if available
      const masterAggregatedMap = new Map<string, any>();
      if (masterRes.data && masterRes.data.length > 0) {
        masterRes.data.forEach((row: any) => {
          const directPos = String(row.pos_played || '').toUpperCase();
          const pId = row.player_id && String(row.player_id) !== '1' && String(row.player_id) !== '0' ? String(row.player_id) : '';
          const rawPName = String(row.player_name || '').trim();
          const norm = normalizeName(rawPName);
          const meta = (pId ? playerMetaMap.get(pId) : null) || (rawPName ? playerMetaMap.get(rawPName.toLowerCase()) : null) || (norm ? playerMetaMap.get(norm) : null);
          const resolvedName = meta?.player_name || rawPName || (pId ? `Player #${pId}` : (directPos === 'G' ? 'Goalie' : 'Skater'));

          const isG = directPos === 'G' || KNOWN_GOALIES_SET.has(normalizeName(resolvedName)) || (Number(row.shots_against || 0) > 0 || Number(row.saves || 0) > 0);
          const key = (isG ? 'G_' : 'S_') + (pId ? pId : (normalizeName(resolvedName) + '_' + String(row.team_id || '')));

          const tInfo = teamMap.get(String(row.team_id)) || (meta?.team_default ? teamMap.get(meta.team_default) : null);
          const teamName = tInfo?.name || row.team_name || 'Team';
          const logoUrl = tInfo?.logo || row.logo_url || '';
          const isRookie = meta?.is_rookie === true || meta?.is_rookie === 'true' || meta?.is_rookie === 1 || row.is_rookie === true;

          if (!masterAggregatedMap.has(key)) {
            masterAggregatedMap.set(key, {
              player_id: row.player_id,
              player_name: resolvedName,
              team_id: row.team_id,
              team_name: teamName,
              logo_url: logoUrl,
              is_rookie: isRookie,
              pos_played: isG ? 'G' : (row.pos_played || 'F'),
              gp: 0,
              total_goals: 0,
              total_assists: 0,
              total_points: 0,
              total_sog: 0,
              total_chks: 0,
              total_pim: 0,
              pp_points: 0,
              sh_points: 0,
              ppg: 0,
              shg: 0,
              evg: 0,
              gwg: 0,
              otg: 0,
              toi_seconds: 0,
              shots_against: 0,
              saves: 0,
              goals_against: 0,
              wins: 0,
              losses: 0,
              ties: 0,
              otl: 0,
              shutouts: 0
            });
          }

          const cur = masterAggregatedMap.get(key);
          cur.gp += 1;
          cur.toi_seconds += Number(row.toi || 0);

          if (isG) {
            cur.shots_against += Number(row.shots_against || 0);
            cur.saves += Number(row.saves || 0);
            cur.goals_against += Number(row.goals_against || 0);
            if (row.is_win) cur.wins += 1;
            if (row.is_loss) cur.losses += 1;
            if (row.is_tie) cur.ties += 1;
            if (row.is_otl) cur.otl += 1;
            if (Number(row.goals_against || 0) === 0 && (Number(row.shots_against || 0) > 0 || row.is_win)) {
              cur.shutouts += 1;
            }
            cur.total_goals += Number(row.goals || 0);
            cur.total_assists += Number(row.assists || 0);
            cur.total_points += (Number(row.goals || 0) + Number(row.assists || 0));
          } else {
            cur.total_goals += Number(row.goals || 0);
            cur.total_assists += Number(row.assists || 0);
            cur.total_points += (Number(row.goals || 0) + Number(row.assists || 0));
            cur.total_sog += Number(row.shots || 0);
            cur.total_chks += Number(row.checks || 0);
            cur.total_pim += Number(row.pim || 0);
            cur.pp_points += Number(row.pp_points || 0);
            cur.sh_points += Number(row.sh_points || 0);
            cur.evg += Number(row.evg || 0);
            cur.gwg += Number(row.gwg || 0);
            cur.otg += Number(row.otg || 0);
          }
        });
      }

      // Format master rows with calculated fields
      const masterList: any[] = [];
      masterAggregatedMap.forEach((p: any) => {
        const sa = p.shots_against || 0;
        const sv = p.saves || 0;
        const ga = p.goals_against || 0;
        const gp = p.gp || 0;

        masterList.push({
          ...p,
          toi_minutes: formatSecondsToMMSS(p.toi_seconds),
          sv_pct: sa > 0 ? Number((sv / sa).toFixed(3)) : 0,
          gaa: gp > 0 ? Number((ga / gp).toFixed(2)) : 0,
          pts_per_game: gp > 0 ? Number((p.total_points / gp).toFixed(2)) : 0
        });
      });

      // Merge api_stats_with_names with master stats
      const combinedMap = new Map<string, any>();

      // 1. Add aggregated master stats
      masterList.forEach((m: any) => {
        const isG = m.pos_played === 'G';
        const norm = normalizeName(m.player_name);
        const pId = m.player_id && String(m.player_id) !== '1' && String(m.player_id) !== '0' ? String(m.player_id) : '';
        const key = (isG ? 'G_' : 'S_') + (pId ? pId : `${norm}_${m.team_id || m.team_name || ''}`);
        combinedMap.set(key, m);
      });

      // 2. Merge / add api_stats_with_names
      if (statsRes.data && statsRes.data.length > 0) {
        statsRes.data.forEach((s: any) => {
          const sName = String(s.player_name || '').trim();
          const norm = normalizeName(sName);
          const resolvedPPos = resolvePlayerPosition(s, newPosMap);
          const isG = resolvedPPos === 'G';
          const pId = s.player_id && String(s.player_id) !== '1' && String(s.player_id) !== '0' ? String(s.player_id) : '';
          const key = (isG ? 'G_' : 'S_') + (pId ? pId : `${norm}_${s.team_id || s.team_name || ''}`);

          const sa = Number(s.shots_against ?? s.total_shots_against ?? s.total_sa ?? s.sa ?? 0);
          const sv = Number(s.saves ?? s.total_saves ?? s.sv ?? 0);
          const ga = Number(s.goals_against ?? s.total_goals_against ?? s.total_ga ?? s.ga ?? 0);
          const gp = Number(s.gp ?? s.games_played ?? 0);
          const svPct = isG ? (s.sv_pct != null && !isNaN(Number(s.sv_pct)) ? Number(s.sv_pct) : (sa > 0 ? Number((sv / sa).toFixed(3)) : 0)) : null;
          const gaa = isG ? (s.gaa != null && !isNaN(Number(s.gaa)) ? Number(s.gaa) : (gp > 0 ? Number((ga / gp).toFixed(2)) : 0)) : null;

          if (combinedMap.has(key)) {
            const existing = combinedMap.get(key);
            combinedMap.set(key, {
              ...existing,
              ...s,
              pos_played: isG ? 'G' : (s.pos_played || s.pos || resolvedPPos || existing.pos_played),
              gp: Math.max(Number(existing.gp || 0), gp),
              wins: isG ? Math.max(Number(s.wins ?? 0), Number(existing.wins ?? 0)) : 0,
              losses: isG ? Math.max(Number(s.losses ?? 0), Number(existing.losses ?? 0)) : 0,
              ties: isG ? Math.max(Number(s.ties ?? 0), Number(existing.ties ?? 0)) : 0,
              otl: isG ? Math.max(Number(s.otl ?? 0), Number(existing.otl ?? 0)) : 0,
              saves: isG ? Math.max(sv, Number(existing.saves ?? 0)) : 0,
              shots_against: isG ? Math.max(sa, Number(existing.shots_against ?? 0)) : 0,
              goals_against: isG ? Math.max(ga, Number(existing.goals_against ?? 0)) : 0,
              shutouts: isG ? Math.max(Number(s.shutouts ?? 0), Number(existing.shutouts ?? 0)) : 0,
              sv_pct: isG ? (svPct ?? existing.sv_pct) : null,
              gaa: isG ? (gaa ?? existing.gaa) : null
            });
          } else {
            const tInfo = teamMap.get(String(s.team_id)) || (s.team_name ? teamMap.get(s.team_name.toLowerCase()) : null);
            combinedMap.set(key, {
              ...s,
              pos_played: isG ? 'G' : (s.pos_played || s.pos || resolvedPPos),
              team_name: tInfo?.name || s.team_name || 'Team',
              logo_url: tInfo?.logo || s.logo_url || '',
              shots_against: sa,
              saves: sv,
              goals_against: ga,
              sv_pct: svPct,
              gaa: gaa,
              gp: gp
            });
          }
        });
      }

      const finalList = Array.from(combinedMap.values());
      setData(finalList);
    } catch (err) {
      console.error('Error loading stats data:', err);
    }
  }

  const uniqueData = useMemo(() => {
    const map = new Map<string, any>();
    data.forEach(item => {
      // Strictly exclude any player whose TOI is 0 or unrecorded
      if (!hasPositiveTOI(item)) return;

      const rawName = String(item.player_name || '').trim();
      const norm = normalizeName(rawName);
      if (!norm && !item.player_id) return;

      const resolvedPos = resolvePlayerPosition(item, posMap);
      const enrichedItem = {
        ...item,
        pos: resolvedPos
      };

      const pId = item.player_id && String(item.player_id) !== '1' && String(item.player_id) !== '0' ? String(item.player_id) : '';
      const teamKey = String(item.team_id || item.team_name || '');
      const key = (resolvedPos === 'G' ? 'G_' : 'S_') + (pId ? pId : `${norm}_${teamKey}`);

      if (!map.has(key)) {
        map.set(key, enrichedItem);
      } else {
        const existing = map.get(key);
        if (Number(item.gp || 0) > Number(existing.gp || 0) || Number(item.total_points || 0) > Number(existing.total_points || 0)) {
          map.set(key, enrichedItem);
        }
      }
    });
    return Array.from(map.values());
  }, [data, posMap]);

  const teams = useMemo(() => ['All', ...Array.from(new Set(uniqueData.map(p => p.team_name))).filter(Boolean).sort()], [uniqueData]);

  const filteredData = useMemo(() => {
    if (selectedTeam === 'All') return uniqueData;
    return uniqueData.filter(p => p.team_name === selectedTeam);
  }, [uniqueData, selectedTeam]);

  const sortedData = useMemo(() => {
    const effectiveSortConfig = sortConfig || (
      activeTab === 'Goalies'
        ? { key: 'sv_pct', dir: 'desc' as const }
        : activeTab === 'Skaters'
          ? { key: 'total_points', dir: 'desc' as const }
          : null
    );

    if (!effectiveSortConfig) return filteredData;
    return [...filteredData].sort((a, b) => {
      let valA: any = a[effectiveSortConfig.key];
      let valB: any = b[effectiveSortConfig.key];

      if (effectiveSortConfig.key === 'pts_per_game') {
        const p1 = Number(a.total_points ?? a.points ?? 0);
        const p2 = Number(b.total_points ?? b.points ?? 0);
        valA = a.gp ? p1 / a.gp : 0;
        valB = b.gp ? p2 / b.gp : 0;
      } else if (effectiveSortConfig.key === 'evg') {
        valA = Number(a.evg ?? a.total_evg ?? 0);
        valB = Number(b.evg ?? b.total_evg ?? 0);
      } else if (effectiveSortConfig.key === 'ev_points') {
        const pA = Number(a.total_points ?? a.points ?? 0);
        const ppA = Number(a.pp_points ?? a.total_pp_points ?? a.ppp ?? 0);
        const shA = Number(a.sh_points ?? a.total_sh_points ?? a.shp ?? 0);
        valA = Number(a.ev_points ?? a.total_ev_points ?? a.ev_pts ?? Math.max(0, pA - ppA - shA));

        const pB = Number(b.total_points ?? b.points ?? 0);
        const ppB = Number(b.pp_points ?? b.total_pp_points ?? b.ppp ?? 0);
        const shB = Number(b.sh_points ?? b.total_sh_points ?? b.shp ?? 0);
        valB = Number(b.ev_points ?? b.total_ev_points ?? b.ev_pts ?? Math.max(0, pB - ppB - shB));
      } else if (effectiveSortConfig.key === 'ppg') {
        valA = Number(a.ppg ?? a.total_ppg ?? a.pp_goals ?? a.total_pp_goals ?? 0);
        valB = Number(b.ppg ?? b.total_ppg ?? b.pp_goals ?? b.total_pp_goals ?? 0);
      } else if (effectiveSortConfig.key === 'pp_points') {
        valA = Number(a.pp_points ?? a.total_pp_points ?? a.ppp ?? a.pp_pts ?? 0);
        valB = Number(b.pp_points ?? b.total_pp_points ?? b.ppp ?? b.pp_pts ?? 0);
      } else if (effectiveSortConfig.key === 'shg') {
        valA = Number(a.shg ?? a.total_shg ?? a.sh_goals ?? a.total_sh_goals ?? 0);
        valB = Number(b.shg ?? b.total_shg ?? b.sh_goals ?? b.total_sh_goals ?? 0);
      } else if (effectiveSortConfig.key === 'sh_points') {
        valA = Number(a.sh_points ?? a.total_sh_points ?? a.shp ?? a.sh_pts ?? 0);
        valB = Number(b.sh_points ?? b.total_sh_points ?? b.shp ?? b.sh_pts ?? 0);
      } else if (effectiveSortConfig.key === 'gwg') {
        valA = Number(a.gwg ?? a.total_gwg ?? 0);
        valB = Number(b.gwg ?? b.total_gwg ?? 0);
      } else if (effectiveSortConfig.key === 'otg') {
        valA = Number(a.otg ?? a.total_otg ?? 0);
        valB = Number(b.otg ?? b.total_otg ?? 0);
      } else if (effectiveSortConfig.key === 'total_sog') {
        valA = Number(a.total_sog ?? a.sog ?? a.shots ?? 0);
        valB = Number(b.total_sog ?? b.sog ?? b.shots ?? 0);
      } else if (effectiveSortConfig.key === 'total_chks') {
        valA = Number(a.total_chks ?? a.chks ?? a.checks ?? 0);
        valB = Number(b.total_chks ?? b.chks ?? b.checks ?? 0);
      } else if (effectiveSortConfig.key === 'total_pim') {
        valA = Number(a.total_pim ?? a.pim ?? 0);
        valB = Number(b.total_pim ?? b.pim ?? 0);
      } else if (effectiveSortConfig.key === 'toi_minutes') {
        valA = parseTOI(a.toi_minutes ?? a.toi);
        valB = parseTOI(b.toi_minutes ?? b.toi);
      } else if (effectiveSortConfig.key === 'shots_against') {
        valA = Number(a.shots_against ?? a.total_shots_against ?? a.total_sa ?? a.sa ?? 0);
        valB = Number(b.shots_against ?? b.total_shots_against ?? b.total_sa ?? b.sa ?? 0);
      } else if (effectiveSortConfig.key === 'saves') {
        valA = Number(a.saves ?? a.total_saves ?? a.sv ?? 0);
        valB = Number(b.saves ?? b.total_saves ?? b.sv ?? 0);
      } else if (effectiveSortConfig.key === 'goals_against') {
        valA = Number(a.goals_against ?? a.total_goals_against ?? a.total_ga ?? a.ga ?? 0);
        valB = Number(b.goals_against ?? b.total_goals_against ?? b.total_ga ?? b.ga ?? 0);
      } else if (effectiveSortConfig.key === 'shutouts') {
        valA = Number(a.shutouts ?? 0);
        valB = Number(b.shutouts ?? 0);
      } else if (effectiveSortConfig.key === 'sv_pct') {
        const saA = Number(a.shots_against ?? a.total_shots_against ?? a.total_sa ?? a.sa ?? 0);
        const svA = Number(a.saves ?? a.total_saves ?? a.sv ?? 0);
        valA = a.sv_pct != null && !isNaN(Number(a.sv_pct)) && Number(a.sv_pct) > 0 ? Number(a.sv_pct) : (saA > 0 ? (svA / saA) : 0);

        const saB = Number(b.shots_against ?? b.total_shots_against ?? b.total_sa ?? b.sa ?? 0);
        const svB = Number(b.saves ?? b.total_saves ?? b.sv ?? 0);
        valB = b.sv_pct != null && !isNaN(Number(b.sv_pct)) && Number(b.sv_pct) > 0 ? Number(b.sv_pct) : (saB > 0 ? (svB / saB) : 0);
      } else if (effectiveSortConfig.key === 'gaa') {
        valA = a.gaa != null && !isNaN(Number(a.gaa)) && Number(a.gaa) > 0 ? Number(a.gaa) : 999;
        valB = b.gaa != null && !isNaN(Number(b.gaa)) && Number(b.gaa) > 0 ? Number(b.gaa) : 999;
      } else if (effectiveSortConfig.key === 'wins') {
        valA = Number(a.wins ?? 0);
        valB = Number(b.wins ?? 0);
      } else if (effectiveSortConfig.key === 'losses') {
        valA = Number(a.losses ?? 0);
        valB = Number(b.losses ?? 0);
      } else if (effectiveSortConfig.key === 'ties') {
        valA = Number(a.ties ?? 0);
        valB = Number(b.ties ?? 0);
      } else if (effectiveSortConfig.key === 'otl') {
        valA = Number(a.otl ?? 0);
        valB = Number(b.otl ?? 0);
      } else if (effectiveSortConfig.key === 'total_goals') {
        valA = Number(a.total_goals ?? a.goals ?? 0);
        valB = Number(b.total_goals ?? b.goals ?? 0);
      } else if (effectiveSortConfig.key === 'total_assists') {
        valA = Number(a.total_assists ?? a.assists ?? 0);
        valB = Number(b.total_assists ?? b.assists ?? 0);
      } else if (effectiveSortConfig.key === 'total_points') {
        valA = Number(a.total_points ?? a.points ?? (Number(a.total_goals ?? a.goals ?? 0) + Number(a.total_assists ?? a.assists ?? 0)));
        valB = Number(b.total_points ?? b.points ?? (Number(b.total_goals ?? b.goals ?? 0) + Number(b.total_assists ?? b.assists ?? 0)));
      } else if (effectiveSortConfig.key === 'gp') {
        valA = Number(a.gp ?? 0);
        valB = Number(b.gp ?? 0);
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return effectiveSortConfig.dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      valA = valA ?? 0;
      valB = valB ?? 0;

      if (valA === valB) {
        if (effectiveSortConfig.key === 'sv_pct') {
          const svA = Number(a.saves ?? a.total_saves ?? a.sv ?? 0);
          const svB = Number(b.saves ?? b.total_saves ?? b.sv ?? 0);
          if (svA !== svB) return effectiveSortConfig.dir === 'asc' ? svA - svB : svB - svA;
          return effectiveSortConfig.dir === 'asc' ? Number(a.wins || 0) - Number(b.wins || 0) : Number(b.wins || 0) - Number(a.wins || 0);
        }
        if (effectiveSortConfig.key === 'total_points') {
          const gA = Number(a.total_goals ?? a.goals ?? 0);
          const gB = Number(b.total_goals ?? b.goals ?? 0);
          if (gA !== gB) return effectiveSortConfig.dir === 'asc' ? gA - gB : gB - gA;
        }
      }

      return effectiveSortConfig.dir === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [filteredData, sortConfig, activeTab]);

  const getFilteredData = (category: 'skaters' | 'goalies' | 'defense', sourceList?: any[]) => {
    const list = sourceList || sortedData;
    return list.filter(p => {
      // Must have positive TOI
      if (!hasPositiveTOI(p)) return false;
      const pos = (p.pos || '').toUpperCase();
      if (category === 'goalies') return pos === 'G';
      if (category === 'defense') return pos === 'D';
      return pos !== 'G';
    });
  };

  const requestSort = (header: string) => {
    const key = sortMap[header];
    if (!key) return;
    setSortConfig({ key, dir: sortConfig?.key === key && sortConfig.dir === 'desc' ? 'asc' : 'desc' });
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setHoveredSkater(null);
    setHoveredGoalie(null);
    setHoveredDefense(null);
    setHoveredRookie(null);
    if (tab === 'Skaters') {
      setSortConfig({ key: 'total_points', dir: 'desc' });
    } else if (tab === 'Goalies') {
      setSortConfig({ key: 'sv_pct', dir: 'desc' });
    } else {
      setSortConfig(null);
    }
  };

  const handleResetFilters = () => {
    setSelectedLeagueType('ALL');
    setSelectedTeam('All');
    setHoveredSkater(null);
    setHoveredGoalie(null);
    setHoveredDefense(null);
    setHoveredRookie(null);
    setSortConfig(null);
    if (leagues.length > 0) {
      const latest = leagues.reduce((prev, curr) => (Number(curr.league_id) > Number(prev.league_id) ? curr : prev), leagues[0]);
      const latestId = String(latest.league_id);
      setSelectedLeague(latestId);
      loadData(latestId);
    }
  };

  const exportToCSV = () => {
    const isGoalieTab = activeTab === 'Goalies';
    const currentList = getFilteredData(isGoalieTab ? 'goalies' : 'skaters');
    if (currentList.length === 0) return;

    let headers: string[] = [];
    let rows: string[][] = [];

    if (isGoalieTab) {
      headers = ['TEAM', 'PLAYER', 'GP', 'W', 'L', 'T', 'OTL', 'SA', 'SV', 'GA', 'SO', 'SV%', 'GAA', 'G', 'A', 'P'];
      rows = currentList.map(r => {
        const sa = Number(r.shots_against ?? r.total_shots_against ?? r.total_sa ?? r.sa ?? 0);
        const sv = Number(r.saves ?? r.total_saves ?? r.sv ?? 0);
        const ga = Number(r.goals_against ?? r.total_goals_against ?? r.total_ga ?? r.ga ?? 0);
        const gp = Number(r.gp || 0);
        const svPct = r.sv_pct != null && !isNaN(Number(r.sv_pct)) ? Number(r.sv_pct).toFixed(3) : (sa > 0 ? (sv / sa).toFixed(3) : '-');
        const gaa = r.gaa != null && !isNaN(Number(r.gaa)) ? Number(r.gaa).toFixed(2) : (gp > 0 ? (ga / gp).toFixed(2) : '-');
        const g = Number(r.total_goals ?? r.goals ?? 0);
        const a = Number(r.total_assists ?? r.assists ?? 0);
        const p = Number(r.total_points ?? r.points ?? (g + a));

        return [
          r.team_name || '',
          r.player_name || '',
          String(gp),
          String(r.wins ?? 0),
          String(r.losses ?? 0),
          String(r.ties ?? 0),
          String(r.otl ?? 0),
          String(sa),
          String(sv),
          String(ga),
          String(r.shutouts ?? 0),
          svPct,
          gaa,
          String(g),
          String(a),
          String(p)
        ];
      });
    } else {
      headers = ['TEAM', 'PLAYER', 'POS', 'GP', 'G', 'A', 'PTS', 'PTS/G', 'EVG', 'EV PTS', 'PPG', 'PP PTS', 'SHG', 'SH PTS', 'GWG', 'OTG', 'SOG', 'CHKS', 'PIM', 'TOI'];
      rows = currentList.map(r => {
        const gp = Number(r.gp || 0);
        const g = Number(r.total_goals ?? r.goals ?? 0);
        const a = Number(r.total_assists ?? r.assists ?? 0);
        const pts = Number(r.total_points ?? r.points ?? (g + a));
        const ptsPerG = gp > 0 ? (pts / gp).toFixed(2) : '0.00';
        const ppp = Number(r.pp_points ?? r.total_pp_points ?? r.ppp ?? 0);
        const shp = Number(r.sh_points ?? r.total_sh_points ?? r.shp ?? 0);
        const evPoints = Number(r.ev_points ?? r.total_ev_points ?? r.ev_pts ?? Math.max(0, pts - ppp - shp));
        const evg = Number(r.evg ?? r.total_evg ?? 0);
        const ppg = Number(r.ppg ?? r.total_ppg ?? r.pp_goals ?? r.total_pp_goals ?? 0);
        const shg = Number(r.shg ?? r.total_shg ?? r.sh_goals ?? r.total_sh_goals ?? 0);
        const gwg = Number(r.gwg ?? r.total_gwg ?? 0);
        const otg = Number(r.otg ?? r.total_otg ?? 0);
        const sog = Number(r.total_sog ?? r.sog ?? r.shots ?? 0);
        const chks = Number(r.total_chks ?? r.chks ?? r.checks ?? 0);
        const pim = Number(r.total_pim ?? r.pim ?? 0);
        const toi = r.toi_minutes ?? r.toi ?? '-';

        return [
          r.team_name || '',
          r.player_name || '',
          r.pos || 'F',
          String(gp),
          String(g),
          String(a),
          String(pts),
          ptsPerG,
          String(evg),
          String(evPoints),
          String(ppg),
          String(ppp),
          String(shg),
          String(shp),
          String(gwg),
          String(otg),
          String(sog),
          String(chks),
          String(pim),
          String(toi)
        ];
      });
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => JSON.stringify(cell ?? '')).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `league_stats_${activeTab.toLowerCase()}.csv`);
    link.click();
  };

  const sortMap: Record<string, string> = {
    'TEAM': 'team_name', 'PLAYER': 'player_name', 'GP': 'gp', 'G': 'total_goals',
    'A': 'total_assists', 'PTS': 'total_points', 'P': 'total_points',
    'PTS/G': 'pts_per_game', 'EVG': 'evg', 'EV PTS': 'ev_points',
    'PPG': 'ppg', 'PP PTS': 'pp_points', 'SHG': 'shg', 'SH PTS': 'sh_points',
    'GWG': 'gwg', 'OTG': 'otg',
    'SOG': 'total_sog', 'CHKS': 'total_chks',
    'PIM': 'total_pim', 'TOI': 'toi_minutes', 'W': 'wins', 'L': 'losses',
    'T': 'ties', 'OTL': 'otl', 'SA': 'shots_against', 'SV': 'saves',
    'GA': 'goals_against', 'SO': 'shutouts', 'SV%': 'sv_pct', 'GAA': 'gaa'
  };

  const skaterList = useMemo(() => getFilteredData('skaters'), [sortedData]);
  const goalieList = useMemo(() => getFilteredData('goalies'), [sortedData]);

  const skaterLeaders = useMemo(() => {
    if (skaterList.length === 0) return {};
    const maxVals: Record<string, number> = {};

    const getNum = (p: any, key: string): number => {
      if (key === 'total_goals') return Number(p.total_goals ?? p.goals ?? 0);
      if (key === 'total_assists') return Number(p.total_assists ?? p.assists ?? 0);
      if (key === 'total_points') return Number(p.total_points ?? p.points ?? (Number(p.total_goals ?? p.goals ?? 0) + Number(p.total_assists ?? p.assists ?? 0)));
      if (key === 'pts_per_game') return p.gp ? (Number(p.total_points ?? p.points ?? 0)) / p.gp : 0;
      if (key === 'evg') return Number(p.evg ?? p.total_evg ?? 0);
      if (key === 'ev_points') {
        const pts = Number(p.total_points ?? p.points ?? 0);
        const ppp = Number(p.pp_points ?? p.total_pp_points ?? p.ppp ?? 0);
        const shp = Number(p.sh_points ?? p.total_sh_points ?? p.shp ?? 0);
        return Number(p.ev_points ?? p.total_ev_points ?? p.ev_pts ?? Math.max(0, pts - ppp - shp));
      }
      if (key === 'ppg') return Number(p.ppg ?? p.total_ppg ?? p.pp_goals ?? p.total_pp_goals ?? 0);
      if (key === 'pp_points') return Number(p.pp_points ?? p.total_pp_points ?? p.ppp ?? p.pp_pts ?? 0);
      if (key === 'shg') return Number(p.shg ?? p.total_shg ?? p.sh_goals ?? p.total_sh_goals ?? 0);
      if (key === 'sh_points') return Number(p.sh_points ?? p.total_sh_points ?? p.shp ?? p.sh_pts ?? 0);
      if (key === 'gwg') return Number(p.gwg ?? p.total_gwg ?? 0);
      if (key === 'otg') return Number(p.otg ?? p.total_otg ?? 0);
      if (key === 'total_sog') return Number(p.total_sog ?? p.sog ?? p.shots ?? 0);
      if (key === 'total_chks') return Number(p.total_chks ?? p.chks ?? p.checks ?? 0);
      if (key === 'total_pim') return Number(p.total_pim ?? p.pim ?? 0);
      if (key === 'toi') return parseTOI(p.toi_minutes ?? p.toi);
      if (key === 'gp') return Number(p.gp ?? 0);
      return 0;
    };

    const keys = [
      'gp', 'total_goals', 'total_assists', 'total_points', 'pts_per_game',
      'evg', 'ev_points', 'ppg', 'pp_points', 'shg', 'sh_points',
      'gwg', 'otg', 'total_sog', 'total_chks', 'total_pim', 'toi'
    ];

    keys.forEach(k => {
      let max = -Infinity;
      skaterList.forEach(p => {
        const val = getNum(p, k);
        if (val > max) max = val;
      });
      if (max > 0) {
        maxVals[k] = max;
      }
    });

    return maxVals;
  }, [skaterList]);

  const goalieLeaders = useMemo(() => {
    if (goalieList.length === 0) return {};
    const leaders: Record<string, number> = {};

    const getNum = (p: any, key: string): number => {
      if (key === 'gp') return Number(p.gp ?? 0);
      if (key === 'wins') return Number(p.wins ?? 0);
      if (key === 'shots_against') return Number(p.shots_against ?? p.total_shots_against ?? p.total_sa ?? p.sa ?? 0);
      if (key === 'saves') return Number(p.saves ?? p.total_saves ?? p.sv ?? 0);
      if (key === 'shutouts') return Number(p.shutouts ?? 0);
      if (key === 'sv_pct') {
        const sa = Number(p.shots_against ?? p.total_shots_against ?? p.total_sa ?? p.sa ?? 0);
        const sv = Number(p.saves ?? p.total_saves ?? p.sv ?? 0);
        return p.sv_pct != null && !isNaN(Number(p.sv_pct)) ? Number(p.sv_pct) : (sa > 0 ? sv / sa : 0);
      }
      if (key === 'gaa') {
        const gp = Number(p.gp ?? 0);
        const ga = Number(p.goals_against ?? p.total_goals_against ?? p.total_ga ?? p.ga ?? 0);
        return p.gaa != null && !isNaN(Number(p.gaa)) && Number(p.gaa) > 0 ? Number(p.gaa) : (gp > 0 ? ga / gp : 999);
      }
      if (key === 'total_goals') return Number(p.total_goals ?? p.goals ?? 0);
      if (key === 'total_assists') return Number(p.total_assists ?? p.assists ?? 0);
      if (key === 'total_points') return Number(p.total_points ?? p.points ?? (Number(p.total_goals ?? p.goals ?? 0) + Number(p.total_assists ?? p.assists ?? 0)));
      return 0;
    };

    const maxKeys = ['gp', 'wins', 'shots_against', 'saves', 'shutouts', 'sv_pct', 'total_goals', 'total_assists', 'total_points'];
    maxKeys.forEach(k => {
      let max = -Infinity;
      goalieList.forEach(p => {
        const val = getNum(p, k);
        if (val > max) max = val;
      });
      if (max > 0) {
        leaders[k] = max;
      }
    });

    let minGAA = Infinity;
    goalieList.forEach(p => {
      const gaaVal = getNum(p, 'gaa');
      if (gaaVal > 0 && gaaVal < minGAA) {
        minGAA = gaaVal;
      }
    });
    if (minGAA !== Infinity) {
      leaders['gaa'] = minGAA;
    }

    return leaders;
  }, [goalieList]);

  const renderStatCell = (val: any, isLeader: boolean, isBold: boolean = false) => {
    return (
      <td className="p-1">
        {isLeader ? (
          <span className="font-black text-black">
            {val}
          </span>
        ) : (
          <span className={isBold ? 'font-bold text-black' : ''}>{val}</span>
        )}
      </td>
    );
  };

  return (
    <div className="bg-[#f4f1ea] text-black min-h-screen p-2 sm:p-4 font-serif text-sm">
      <header className="border-b-4 border-black pb-2 mb-4 text-center">
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter">League Statistics</h1>
      </header>

      {/* Responsive Filter Toolbar */}
      <div className="mb-4 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        <div className="flex flex-wrap gap-2 sm:gap-4 items-center">
          <div className="flex items-center gap-1.5 bg-white border-2 border-black p-1 shadow-xs overflow-x-auto max-w-full no-scrollbar">
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

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedLeague}
              onChange={(e) => {
                setSelectedLeague(e.target.value);
                loadData(e.target.value);
              }}
              className="bg-transparent border-b-2 border-black font-bold uppercase p-1 cursor-pointer text-xs sm:text-sm"
            >
              {filteredLeagues.map((l) => (
                <option key={l.league_id} value={l.league_id}>
                  {l.league_name}
                </option>
              ))}
            </select>

            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="bg-transparent border-b-2 border-black font-bold uppercase p-1 cursor-pointer text-xs sm:text-sm"
            >
              {teams.map((t) => (
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
          <button onClick={exportToCSV} className="flex items-center gap-1.5 bg-black text-white px-3 py-1 text-xs font-bold uppercase hover:bg-gray-800 rounded-xs w-full sm:w-auto justify-center cursor-pointer">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-4 text-xs uppercase border-b border-black pb-2 justify-center">
        {['Home', 'Skaters', 'Goalies'].map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`py-1 px-3 rounded-xs uppercase font-bold text-xs transition-colors cursor-pointer ${activeTab === tab ? 'bg-black text-white' : 'text-gray-600 hover:text-black hover:bg-black/5'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Home' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <StatCard
            title="Skaters"
            data={getFilteredData('skaters', filteredData)}
            category="Skaters"
            onTabClick={handleTabChange}
            hoveredPlayer={hoveredSkater}
            setHoveredPlayer={setHoveredSkater}
          />
          <StatCard
            title="Goalies"
            data={getFilteredData('goalies', filteredData)}
            category="Goalies"
            minGP={10}
            onTabClick={handleTabChange}
            hoveredPlayer={hoveredGoalie}
            setHoveredPlayer={setHoveredGoalie}
          />
          <StatCard
            title="Defensemen"
            data={getFilteredData('defense', filteredData)}
            category="Skaters"
            onTabClick={handleTabChange}
            hoveredPlayer={hoveredDefense}
            setHoveredPlayer={setHoveredDefense}
          />
          <StatCard
            title="Rookie Scoring Leaders"
            data={getFilteredData('skaters', filteredData).filter(p => p.is_rookie === true || p.is_rookie === 'true' || p.is_rookie === 1)}
            category="Skaters"
            onTabClick={handleTabChange}
            hoveredPlayer={hoveredRookie}
            setHoveredPlayer={setHoveredRookie}
          />
        </div>
      )}

      {(activeTab === 'Skaters' || activeTab === 'Goalies') && (
        <div>
          {/* Mobile Swipe Notice */}
          <div className="md:hidden flex items-center justify-between text-[10px] font-sans font-bold text-black/60 px-3 py-1.5 bg-[#ebd9c0]/50 border border-black/15 mb-2 rounded-xs uppercase tracking-wider">
            <span>↔ Swipe table sideways for full stats</span>
            <span>{getFilteredData(activeTab === 'Skaters' ? 'skaters' : 'goalies').length} Players</span>
          </div>

          <div className="overflow-x-auto -mx-2 sm:mx-0 border border-gray-300 shadow-sm rounded-xs bg-white">
            <table className="w-full text-[11px] border-collapse whitespace-nowrap min-w-[850px]">
              <thead className="bg-black text-white">
                <tr>
                  <th className="sticky left-0 bg-black z-20 p-1.5 text-center w-10 border-r border-neutral-700">TEAM</th>
                  <th className="sticky left-10 bg-black z-20 p-1.5 text-left min-w-[140px] border-r border-neutral-700">PLAYER</th>
                  {activeTab === 'Skaters'
                    ? ['GP', 'G', 'A', 'PTS', 'PTS/G', 'EVG', 'EV PTS', 'PPG', 'PP PTS', 'SHG', 'SH PTS', 'GWG', 'OTG', 'SOG', 'CHKS', 'PIM', 'TOI'].map(h => <th key={h} className="p-1.5 text-left cursor-pointer hover:bg-gray-800" onClick={() => requestSort(h)}>{h}</th>)
                    : ['GP', 'W', 'L', 'T', 'OTL', 'SA', 'SV', 'GA', 'SO', 'SV%', 'GAA', 'G', 'A', 'P'].map(h => <th key={h} className="p-1.5 text-left cursor-pointer hover:bg-gray-800" onClick={() => requestSort(h)}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {getFilteredData(activeTab === 'Skaters' ? 'skaters' : 'goalies').map((r, i) => (
                  <tr key={i} className="group border-b border-gray-200 hover:bg-gray-50">
                    <td className="sticky left-0 bg-white group-hover:bg-gray-50 z-10 p-1 text-center w-10 border-r border-gray-200">
                      {r.logo_url ? <img src={r.logo_url} className="h-5 w-5 object-contain mx-auto" alt="" /> : r.team_name}
                    </td>
                    <td className="sticky left-10 bg-white group-hover:bg-gray-50 z-10 p-1 font-bold border-r border-gray-200 shadow-[2px_0_4px_rgba(0,0,0,0.03)]">
                      {r.player_name} {(r.is_rookie === true || r.is_rookie === 'true' || r.is_rookie === 1) && <span className="text-red-600 font-black">[R]</span>}
                    </td>
                    {renderStatCell(r.gp, r.gp > 0 && r.gp === (activeTab === 'Skaters' ? skaterLeaders.gp : goalieLeaders.gp))}
                    {activeTab === 'Skaters' ? (
                      (() => {
                        const goals = Number(r.total_goals ?? r.goals ?? 0);
                        const assists = Number(r.total_assists ?? r.assists ?? 0);
                        const points = Number(r.total_points ?? r.points ?? (goals + assists));
                        const ptsPerGame = r.gp ? ((points / r.gp)).toFixed(2) : '0.00';
                        const ptsPerGameNum = r.gp ? points / r.gp : 0;
                        const evg = Number(r.evg ?? r.total_evg ?? 0);
                        const ppp = Number(r.pp_points ?? r.total_pp_points ?? r.ppp ?? 0);
                        const shp = Number(r.sh_points ?? r.total_sh_points ?? r.shp ?? 0);
                        const evPoints = Number(r.ev_points ?? r.total_ev_points ?? r.ev_pts ?? Math.max(0, points - ppp - shp));
                        const ppg = Number(r.ppg ?? r.total_ppg ?? r.pp_goals ?? r.total_pp_goals ?? 0);
                        const shg = Number(r.shg ?? r.total_shg ?? r.sh_goals ?? r.total_sh_goals ?? 0);
                        const gwg = Number(r.gwg ?? r.total_gwg ?? 0);
                        const otg = Number(r.otg ?? r.total_otg ?? 0);
                        const sog = Number(r.total_sog ?? r.sog ?? r.shots ?? 0);
                        const chks = Number(r.total_chks ?? r.chks ?? r.checks ?? 0);
                        const pim = Number(r.total_pim ?? r.pim ?? 0);
                        const toiStr = r.toi_minutes ?? r.toi ?? '-';
                        const toiSec = parseTOI(toiStr);

                        return (
                          <>
                            {renderStatCell(goals, goals > 0 && goals === skaterLeaders.total_goals)}
                            {renderStatCell(assists, assists > 0 && assists === skaterLeaders.total_assists)}
                            {renderStatCell(points, points > 0 && points === skaterLeaders.total_points, true)}
                            {renderStatCell(ptsPerGame, ptsPerGameNum > 0 && ptsPerGameNum === skaterLeaders.pts_per_game)}
                            {renderStatCell(evg, evg > 0 && evg === skaterLeaders.evg)}
                            {renderStatCell(evPoints, evPoints > 0 && evPoints === skaterLeaders.ev_points)}
                            {renderStatCell(ppg, ppg > 0 && ppg === skaterLeaders.ppg)}
                            {renderStatCell(ppp, ppp > 0 && ppp === skaterLeaders.pp_points)}
                            {renderStatCell(shg, shg > 0 && shg === skaterLeaders.shg)}
                            {renderStatCell(shp, shp > 0 && shp === skaterLeaders.sh_points)}
                            {renderStatCell(gwg, gwg > 0 && gwg === skaterLeaders.gwg)}
                            {renderStatCell(otg, otg > 0 && otg === skaterLeaders.otg)}
                            {renderStatCell(sog, sog > 0 && sog === skaterLeaders.total_sog)}
                            {renderStatCell(chks, chks > 0 && chks === skaterLeaders.total_chks)}
                            {renderStatCell(pim, pim > 0 && pim === skaterLeaders.total_pim)}
                            {renderStatCell(toiStr, toiSec > 0 && toiSec === skaterLeaders.toi)}
                          </>
                        );
                      })()
                    ) : (
                      (() => {
                        const wins = Number(r.wins ?? 0);
                        const losses = Number(r.losses ?? 0);
                        const ties = Number(r.ties ?? 0);
                        const otl = Number(r.otl ?? 0);
                        const sa = Number(r.shots_against ?? r.total_shots_against ?? r.total_sa ?? r.sa ?? 0);
                        const sv = Number(r.saves ?? r.total_saves ?? r.sv ?? 0);
                        const ga = Number(r.goals_against ?? r.total_goals_against ?? r.total_ga ?? r.ga ?? 0);
                        const so = Number(r.shutouts ?? 0);
                        const svPctNum = r.sv_pct != null && !isNaN(Number(r.sv_pct))
                          ? Number(r.sv_pct)
                          : (sa > 0 ? (sv / sa) : null);
                        const svPctStr = svPctNum != null ? svPctNum.toFixed(3) : '-';
                        const gaaNum = r.gaa != null && !isNaN(Number(r.gaa))
                          ? Number(r.gaa)
                          : (Number(r.gp || 0) > 0 ? (ga / Number(r.gp)) : null);
                        const gaaStr = gaaNum != null ? gaaNum.toFixed(2) : '-';
                        const goals = Number(r.total_goals ?? r.goals ?? 0);
                        const assists = Number(r.total_assists ?? r.assists ?? 0);
                        const points = Number(r.total_points ?? r.points ?? (goals + assists));

                        return (
                          <>
                            {renderStatCell(wins, wins > 0 && wins === goalieLeaders.wins)}
                            {renderStatCell(losses, false)}
                            {renderStatCell(ties, false)}
                            {renderStatCell(otl, false)}
                            {renderStatCell(sa, sa > 0 && sa === goalieLeaders.shots_against)}
                            {renderStatCell(sv, sv > 0 && sv === goalieLeaders.saves)}
                            {renderStatCell(ga, false)}
                            {renderStatCell(so, so > 0 && so === goalieLeaders.shutouts, true)}
                            {renderStatCell(svPctStr, svPctNum != null && svPctNum > 0 && svPctNum === goalieLeaders.sv_pct)}
                            {renderStatCell(gaaStr, gaaNum != null && gaaNum === goalieLeaders.gaa)}
                            {renderStatCell(goals, goals > 0 && goals === goalieLeaders.total_goals)}
                            {renderStatCell(assists, assists > 0 && assists === goalieLeaders.total_assists)}
                            {renderStatCell(points, points > 0 && points === goalieLeaders.total_points, true)}
                          </>
                        );
                      })()
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}