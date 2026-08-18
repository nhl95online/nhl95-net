'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const parseTOI = (val: any): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return 0;
    if (trimmed.includes(':')) {
      const parts = trimmed.split(':').map(Number);
      return (parts[0] || 0) * 60 + (parts[1] || 0);
    }
    const num = parseFloat(trimmed);
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

const hasPositiveTOI = (p: any): boolean => {
  if (!p) return false;
  const toiVals = [p.toi_minutes, p.toi, p.toi_seconds, p.toiSeconds, p.time_on_ice, p.toi_min];
  for (const v of toiVals) {
    if (v !== undefined && v !== null && parseTOI(v) > 0) {
      return true;
    }
  }
  return false;
};

const StatCard = ({ title, data, category, onTabClick, hoveredPlayer, setHoveredPlayer }: any) => {
  const [activeSubTab, setActiveSubTab] = useState(category === 'Goalies' ? 'GAA' : 'Points');
  const getSubTabs = () => (category === 'Goalies' ? ['GAA', 'SV%', 'SO'] : ['Points', 'Goals', 'Assists']);

  const sorted = useMemo(() => {
    const list = [...data];
    if (category === 'Goalies') {
      if (activeSubTab === 'GAA') {
        return list.sort((a, b) => {
          const gaaA = a.gaa != null ? Number(a.gaa) : 999;
          const gaaB = b.gaa != null ? Number(b.gaa) : 999;
          return gaaA - gaaB;
        });
      }
      if (activeSubTab === 'SV%') {
        return list.sort((a, b) => {
          const svA = a.sv_pct != null ? Number(a.sv_pct) : 0;
          const svB = b.sv_pct != null ? Number(b.sv_pct) : 0;
          return svB - svA;
        });
      }
      return list.sort((a, b) => (Number(b.shutouts) || 0) - (Number(a.shutouts) || 0));
    }
    if (activeSubTab === 'Goals') return list.sort((a, b) => (Number(b.total_goals) || 0) - (Number(a.total_goals) || 0));
    if (activeSubTab === 'Assists') return list.sort((a, b) => (Number(b.total_assists) || 0) - (Number(a.total_assists) || 0));
    return list.sort((a, b) => (Number(b.total_points) || 0) - (Number(a.total_points) || 0));
  }, [data, activeSubTab, category]);

  const defaultTop = sorted[0];
  const activeTop = hoveredPlayer && sorted.some(p => (p.player_id || p.player_name) === (hoveredPlayer.player_id || hoveredPlayer.player_name))
    ? sorted.find(p => (p.player_id || p.player_name) === (hoveredPlayer.player_id || hoveredPlayer.player_name))
    : defaultTop;

  const top = activeTop || defaultTop;

  const getValue = (p: any) => {
    if (!p) return 0;
    if (activeSubTab === 'GAA') return p.gaa != null && !isNaN(Number(p.gaa)) ? Number(p.gaa).toFixed(2) : '-';
    if (activeSubTab === 'SV%') return p.sv_pct != null && !isNaN(Number(p.sv_pct)) ? Number(p.sv_pct).toFixed(3) : '-';
    if (activeSubTab === 'Goals') return p.total_goals ?? 0;
    if (activeSubTab === 'Assists') return p.total_assists ?? 0;
    if (activeSubTab === 'SO') return p.shutouts ?? 0;
    return p.total_points ?? 0;
  };

  return (
    <div className="border border-black p-4 bg-white shadow-sm">
      <h2
        className="font-black text-sm uppercase mb-3 cursor-pointer hover:underline"
        onClick={() => onTabClick(category === 'Goalies' ? 'Goalies' : 'Skaters')}
      >
        {title} &gt;
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
            <p className="font-bold text-xs truncate">{top.player_name} {top.is_rookie && <span className="text-red-600 font-black">[R]</span>}</p>
            <p className="text-[10px] text-gray-500 mb-2">{top.team_name}</p>
            <p className="text-3xl font-black">{getValue(top)}</p>
          </div>
          <div className="w-2/3 flex flex-col justify-between">
            {sorted.slice(0, 10).map((p, i) => {
              const isHovered = hoveredPlayer && (p.player_id || p.player_name) === (hoveredPlayer.player_id || hoveredPlayer.player_name);
              return (
                <div
                  key={i}
                  className={`flex justify-between items-center text-[11px] py-1 border-b border-gray-50 cursor-pointer px-1 ${isHovered ? 'bg-yellow-100 font-bold' : 'hover:bg-gray-50'}`}
                  onMouseEnter={() => setHoveredPlayer(p)}
                  onMouseLeave={() => setHoveredPlayer(null)}
                >
                  <span className="truncate flex-1">
                    {i + 1}. {p.player_name} {p.is_rookie && <span className="text-red-600 font-black text-[9px]">[R]</span>}
                  </span>
                  <span className="font-bold ml-12">{getValue(p)}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-gray-500 font-bold uppercase italic">
          No qualifying players
        </div>
      )}
    </div>
  );
};

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
  31: 'W', 32: 'Q', 33: 'W', 34: 'Q', 35: 'W', 36: 'Q', 37: 'W', 38: 'W'
};

const getLeaguePrefix = (league: { league_id: number | string; league_name?: string }) => {
  const name = String(league.league_name || '').trim().toUpperCase();
  if (name) {
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
  const [sortConfig, setSortConfig] = useState<{ key: string, dir: 'asc' | 'desc' } | null>(null);

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
      return ['W', 'Q', 'O', 'V'];
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
    const { data: stats } = await supabase.from('api_stats_with_names').select('*').eq('league_id', parseInt(leagueId, 10));
    if (stats) setData(stats);
  }

  const uniqueData = useMemo(() => {
    const map = new Map();
    data.forEach(item => {
      if (!hasPositiveTOI(item)) return;
      const key = item.player_id || item.player_name;
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, { ...item });
      } else {
        const existing = map.get(key);
        if ((item.gp || 0) > (existing.gp || 0)) {
          map.set(key, { ...item });
        }
      }
    });
    return Array.from(map.values());
  }, [data]);

  const teams = useMemo(() => ['All', ...Array.from(new Set(uniqueData.map(p => p.team_name))).filter(Boolean).sort()], [uniqueData]);

  const filteredData = useMemo(() => {
    if (selectedTeam === 'All') return uniqueData;
    return uniqueData.filter(p => p.team_name === selectedTeam);
  }, [uniqueData, selectedTeam]);

  const getFilteredData = (category: 'skaters' | 'goalies' | 'defense') => {
    return uniqueData.filter(p => {
      const pos = (p.pos || p.position || '').toUpperCase();
      if (category === 'goalies') return pos.includes('G');
      if (category === 'defense') return pos.includes('D');
      return !pos.includes('G');
    });
  };

  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;
    return [...filteredData].sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];

      if (sortConfig.key === 'pts_per_game') {
        const p1 = a.total_points ?? a.points ?? 0;
        const p2 = b.total_points ?? b.points ?? 0;
        valA = a.gp ? p1 / a.gp : 0;
        valB = b.gp ? p2 / b.gp : 0;
      } else if (sortConfig.key === 'evg') {
        valA = a.evg ?? a.total_evg ?? 0;
        valB = b.evg ?? b.total_evg ?? 0;
      } else if (sortConfig.key === 'ev_points') {
        const pA = a.total_points ?? a.points ?? 0;
        const ppA = a.pp_points ?? a.total_pp_points ?? a.ppp ?? 0;
        const shA = a.sh_points ?? a.total_sh_points ?? a.shp ?? 0;
        valA = a.ev_points ?? a.total_ev_points ?? a.ev_pts ?? Math.max(0, pA - ppA - shA);

        const pB = b.total_points ?? b.points ?? 0;
        const ppB = b.pp_points ?? b.total_pp_points ?? b.ppp ?? 0;
        const shB = b.sh_points ?? b.total_sh_points ?? b.shp ?? 0;
        valB = b.ev_points ?? b.total_ev_points ?? b.ev_pts ?? Math.max(0, pB - ppB - shB);
      } else if (sortConfig.key === 'ppg') {
        valA = a.ppg ?? a.total_ppg ?? a.pp_goals ?? a.total_pp_goals ?? 0;
        valB = b.ppg ?? b.total_ppg ?? b.pp_goals ?? b.total_pp_goals ?? 0;
      } else if (sortConfig.key === 'pp_points') {
        valA = a.pp_points ?? a.total_pp_points ?? a.ppp ?? a.pp_pts ?? 0;
        valB = b.pp_points ?? b.total_pp_points ?? b.ppp ?? b.pp_pts ?? 0;
      } else if (sortConfig.key === 'shg') {
        valA = a.shg ?? a.total_shg ?? a.sh_goals ?? a.total_sh_goals ?? 0;
        valB = b.shg ?? b.total_shg ?? b.sh_goals ?? b.total_sh_goals ?? 0;
      } else if (sortConfig.key === 'sh_points') {
        valA = a.sh_points ?? a.total_sh_points ?? a.shp ?? a.sh_pts ?? 0;
        valB = b.sh_points ?? b.total_sh_points ?? b.shp ?? b.sh_pts ?? 0;
      } else if (sortConfig.key === 'gwg') {
        valA = a.gwg ?? a.total_gwg ?? 0;
        valB = b.gwg ?? b.total_gwg ?? 0;
      } else if (sortConfig.key === 'otg') {
        valA = a.otg ?? a.total_otg ?? 0;
        valB = b.otg ?? b.total_otg ?? 0;
      } else if (sortConfig.key === 'total_sog') {
        valA = a.total_sog ?? a.sog ?? a.shots ?? 0;
        valB = b.total_sog ?? b.sog ?? b.shots ?? 0;
      } else if (sortConfig.key === 'total_chks') {
        valA = a.total_chks ?? a.chks ?? a.checks ?? 0;
        valB = b.total_chks ?? b.chks ?? b.checks ?? 0;
      } else if (sortConfig.key === 'total_pim') {
        valA = a.total_pim ?? a.pim ?? 0;
        valB = b.total_pim ?? b.pim ?? 0;
      } else if (sortConfig.key === 'shots_against') {
        valA = a.shots_against ?? a.total_shots_against ?? a.total_sa ?? a.sa ?? 0;
        valB = b.shots_against ?? b.total_shots_against ?? b.total_sa ?? a.sa ?? 0;
      } else if (sortConfig.key === 'saves') {
        valA = a.saves ?? a.total_saves ?? a.sv ?? 0;
        valB = b.saves ?? b.total_saves ?? b.sv ?? 0;
      } else if (sortConfig.key === 'goals_against') {
        valA = a.goals_against ?? a.total_goals_against ?? a.total_ga ?? a.ga ?? 0;
        valB = b.goals_against ?? b.total_goals_against ?? b.total_ga ?? a.ga ?? 0;
      } else if (sortConfig.key === 'total_goals') {
        valA = a.total_goals ?? a.goals ?? 0;
        valB = b.total_goals ?? b.goals ?? 0;
      } else if (sortConfig.key === 'total_assists') {
        valA = a.total_assists ?? a.assists ?? 0;
        valB = b.total_assists ?? b.assists ?? 0;
      } else if (sortConfig.key === 'total_points') {
        valA = a.total_points ?? a.points ?? ((a.total_goals ?? a.goals ?? 0) + (a.total_assists ?? a.assists ?? 0));
        valB = b.total_points ?? b.points ?? ((b.total_goals ?? b.goals ?? 0) + (b.total_assists ?? b.assists ?? 0));
      }

      valA = valA ?? 0;
      valB = valB ?? 0;
      return sortConfig.dir === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [filteredData, sortConfig]);

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
      setSortConfig({ key: 'gaa', dir: 'asc' });
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
    const currentList = getFilteredData(activeTab === 'Goalies' ? 'goalies' : 'skaters');
    if (currentList.length === 0) return;

    const keys = Object.keys(currentList[0]);
    const csvRows = [
      keys.join(','),
      ...currentList.map(row => keys.map(k => JSON.stringify(row[k] ?? '')).join(','))
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `league_stats_${activeTab.toLowerCase()}.csv`);
    a.click();
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
      if (key === 'total_goals') return p.total_goals ?? p.goals ?? 0;
      if (key === 'total_assists') return p.total_assists ?? p.assists ?? 0;
      if (key === 'total_points') return p.total_points ?? p.points ?? 0;
      if (key === 'pts_per_game') return p.gp ? (p.total_points ?? p.points ?? 0) / p.gp : 0;
      if (key === 'evg') return p.evg ?? p.total_evg ?? 0;
      if (key === 'ev_points') {
        const pts = p.total_points ?? p.points ?? 0;
        const ppp = p.pp_points ?? p.total_pp_points ?? p.ppp ?? 0;
        const shp = p.sh_points ?? p.total_sh_points ?? p.shp ?? 0;
        return p.ev_points ?? p.total_ev_points ?? p.ev_pts ?? Math.max(0, pts - ppp - shp);
      }
      if (key === 'ppg') return p.ppg ?? p.total_ppg ?? p.pp_goals ?? p.total_pp_goals ?? 0;
      if (key === 'pp_points') return p.pp_points ?? p.total_pp_points ?? p.ppp ?? p.pp_pts ?? 0;
      if (key === 'shg') return p.shg ?? p.total_shg ?? p.sh_goals ?? p.total_sh_goals ?? 0;
      if (key === 'sh_points') return p.sh_points ?? p.total_sh_points ?? p.shp ?? p.sh_pts ?? 0;
      if (key === 'gwg') return p.gwg ?? p.total_gwg ?? 0;
      if (key === 'otg') return p.otg ?? p.total_otg ?? 0;
      if (key === 'total_sog') return p.total_sog ?? p.sog ?? p.shots ?? 0;
      if (key === 'total_chks') return p.total_chks ?? p.chks ?? p.checks ?? 0;
      if (key === 'total_pim') return p.total_pim ?? p.pim ?? 0;
      if (key === 'toi') return parseTOI(p.toi_minutes ?? p.toi);
      if (key === 'gp') return p.gp ?? 0;
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
      if (key === 'gp') return p.gp ?? 0;
      if (key === 'wins') return p.wins ?? 0;
      if (key === 'shots_against') return p.shots_against ?? p.total_shots_against ?? p.total_sa ?? p.sa ?? 0;
      if (key === 'saves') return p.saves ?? p.total_saves ?? p.sv ?? 0;
      if (key === 'shutouts') return p.shutouts ?? 0;
      if (key === 'sv_pct') return p.sv_pct != null && !isNaN(Number(p.sv_pct)) ? Number(p.sv_pct) : 0;
      if (key === 'gaa') return p.gaa != null && !isNaN(Number(p.gaa)) ? Number(p.gaa) : 999;
      if (key === 'total_goals') return p.total_goals ?? p.goals ?? 0;
      if (key === 'total_assists') return p.total_assists ?? p.assists ?? 0;
      if (key === 'total_points') return p.total_points ?? p.points ?? ((p.total_goals ?? p.goals ?? 0) + (p.total_assists ?? p.assists ?? 0));
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
      if (p.gaa != null && !isNaN(Number(p.gaa))) {
        const gaa = Number(p.gaa);
        if (gaa < minGAA) minGAA = gaa;
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
          <span className="bg-black text-red-600 font-black px-1.5 py-0.5 inline-block">
            {val}
          </span>
        ) : (
          <span className={isBold ? 'font-bold' : ''}>{val}</span>
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

            {activeTab === 'Home' && (
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
            )}

            <button
              onClick={handleResetFilters}
              className="bg-black text-white px-2.5 sm:px-3 py-1 text-xs font-bold uppercase hover:bg-gray-800 rounded-xs"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={exportToCSV} className="flex items-center gap-1.5 bg-black text-white px-3 py-1 text-xs font-bold uppercase hover:bg-gray-800 rounded-xs w-full sm:w-auto justify-center">
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
            className={`py-1 px-3 rounded-xs uppercase font-bold text-xs transition-colors ${activeTab === tab ? 'bg-black text-white' : 'text-gray-600 hover:text-black hover:bg-black/5'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Home' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <StatCard title="Skaters" data={getFilteredData('skaters')} category="Skaters" onTabClick={handleTabChange} hoveredPlayer={hoveredSkater} setHoveredPlayer={setHoveredSkater} />
          <StatCard title="Goalies" data={getFilteredData('goalies')} category="Goalies" onTabClick={handleTabChange} hoveredPlayer={hoveredGoalie} setHoveredPlayer={setHoveredGoalie} />
          <StatCard title="Defensemen" data={getFilteredData('defense')} category="Skaters" onTabClick={handleTabChange} hoveredPlayer={hoveredDefense} setHoveredPlayer={setHoveredDefense} />
          <StatCard title="Rookie Scoring Leaders" data={sortedData.filter(p => p.is_rookie)} category="Skaters" onTabClick={handleTabChange} hoveredPlayer={hoveredRookie} setHoveredPlayer={setHoveredRookie} />
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
                      {r.player_name} {r.is_rookie && <span className="text-red-600 font-black">[R]</span>}
                    </td>
                    {renderStatCell(r.gp, r.gp > 0 && r.gp === (activeTab === 'Skaters' ? skaterLeaders.gp : goalieLeaders.gp))}
                    {activeTab === 'Skaters' ? (
                      (() => {
                        const goals = r.total_goals ?? r.goals ?? 0;
                        const assists = r.total_assists ?? r.assists ?? 0;
                        const points = r.total_points ?? r.points ?? 0;
                        const ptsPerGame = r.gp ? ((points / r.gp)).toFixed(2) : '0.00';
                        const ptsPerGameNum = r.gp ? points / r.gp : 0;
                        const evg = r.evg ?? r.total_evg ?? 0;
                        const ppp = r.pp_points ?? r.total_pp_points ?? r.ppp ?? 0;
                        const shp = r.sh_points ?? r.total_sh_points ?? r.shp ?? 0;
                        const evPoints = r.ev_points ?? r.total_ev_points ?? r.ev_pts ?? Math.max(0, points - ppp - shp);
                        const ppg = r.ppg ?? r.total_ppg ?? r.pp_goals ?? r.total_pp_goals ?? 0;
                        const shg = r.shg ?? r.total_shg ?? r.sh_goals ?? r.total_sh_goals ?? 0;
                        const gwg = r.gwg ?? r.total_gwg ?? 0;
                        const otg = r.otg ?? r.total_otg ?? 0;
                        const sog = r.total_sog ?? r.sog ?? r.shots ?? 0;
                        const chks = r.total_chks ?? r.chks ?? r.checks ?? 0;
                        const pim = r.total_pim ?? r.pim ?? 0;
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
                        const wins = r.wins ?? 0;
                        const losses = r.losses ?? 0;
                        const ties = r.ties ?? 0;
                        const otl = r.otl ?? 0;
                        const sa = r.shots_against ?? r.total_shots_against ?? r.total_sa ?? r.sa ?? 0;
                        const sv = r.saves ?? r.total_saves ?? r.sv ?? 0;
                        const ga = r.goals_against ?? r.total_goals_against ?? r.total_ga ?? r.ga ?? 0;
                        const so = r.shutouts ?? 0;
                        const svPctNum = r.sv_pct != null && !isNaN(Number(r.sv_pct)) ? Number(r.sv_pct) : null;
                        const svPctStr = svPctNum != null ? svPctNum.toFixed(3) : '-';
                        const gaaNum = r.gaa != null && !isNaN(Number(r.gaa)) ? Number(r.gaa) : null;
                        const gaaStr = gaaNum != null ? gaaNum.toFixed(2) : '-';
                        const goals = r.total_goals ?? r.goals ?? 0;
                        const assists = r.total_assists ?? r.assists ?? 0;
                        const points = r.total_points ?? r.points ?? (goals + assists);

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