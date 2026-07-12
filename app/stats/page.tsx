'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const StatCard = ({ title, data, category, onTabClick }: any) => {
  const [activeSubTab, setActiveSubTab] = useState(category === 'Goalies' ? 'GAA' : 'Points');
  const getSubTabs = () => (category === 'Goalies' ? ['GAA', 'SV%', 'SO'] : ['Points', 'Goals', 'Assists']);

  const sorted = useMemo(() => {
    const list = [...data];
    if (category === 'Goalies') {
      if (activeSubTab === 'GAA') return list.sort((a, b) => (a.gaa || 0) - (b.gaa || 0));
      if (activeSubTab === 'SV%') return list.sort((a, b) => (b.sv_pct || 0) - (a.sv_pct || 0));
      return list.sort((a, b) => (b.shutouts || 0) - (a.shutouts || 0));
    }
    if (activeSubTab === 'Goals') return list.sort((a, b) => (b.total_goals || 0) - (a.total_goals || 0));
    if (activeSubTab === 'Assists') return list.sort((a, b) => (b.total_assists || 0) - (a.total_assists || 0));
    return list.sort((a, b) => (b.total_points || 0) - (a.total_points || 0));
  }, [data, activeSubTab, category]);

  const top = sorted[0];

  return (
    <div className="border border-black p-4 bg-white shadow-sm">
      <h2 className="font-black text-sm uppercase mb-3 cursor-pointer hover:underline" onClick={() => onTabClick(category === 'Goalies' ? 'Goalies' : 'Skaters')}>
        {title} &gt;
      </h2>
      <div className="flex gap-4 border-b border-gray-200 mb-4 text-[10px] font-bold uppercase">
        {getSubTabs().map(tab => (
          <button key={tab} className={activeSubTab === tab ? 'border-b-2 border-black pb-1' : 'text-gray-400 pb-1'} onClick={() => setActiveSubTab(tab)}>{tab}</button>
        ))}
      </div>
      {top && (
        <div className="flex gap-8">
          <div className="text-center w-1/3 border-r border-gray-100 pr-4">
            <img src={top.logo_url || '/placeholder.png'} className="h-16 w-16 mx-auto mb-2 object-contain" alt="Team" />
            <p className="font-bold text-xs truncate">{top.player_name} {top.is_rookie && <span className="text-red-600 font-black">[R]</span>}</p>
            <p className="text-[10px] text-gray-500 mb-2">{top.team_name}</p>
            <p className="text-3xl font-black">
              {activeSubTab === 'GAA' ? top.gaa?.toFixed(2) : activeSubTab === 'SV%' ? top.sv_pct?.toFixed(3) : activeSubTab === 'Goals' ? top.total_goals : activeSubTab === 'Assists' ? top.total_assists : top.total_points}
            </p>
          </div>
          <div className="w-2/3 flex flex-col justify-between">
            {sorted.slice(0, 10).map((p, i) => (
              <div key={i} className="flex justify-between items-center text-[11px] py-1 border-b border-gray-50">
                <span className="truncate flex-1">
                  {i + 1}. {p.player_name} {p.is_rookie && <span className="text-red-600 font-black text-[9px]">[R]</span>}
                </span>
                <span className="font-bold ml-12">
                  {activeSubTab === 'GAA' ? p.gaa?.toFixed(2) : activeSubTab === 'SV%' ? p.sv_pct?.toFixed(3) : activeSubTab === 'Goals' ? p.total_goals : activeSubTab === 'Assists' ? p.total_assists : p.total_points}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function NewspaperPage() {
  const [activeTab, setActiveTab] = useState('Home');
  const [leagues, setLeagues] = useState<any[]>([]);
  const [selectedLeague, setSelectedLeague] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('All');
  const [data, setData] = useState<any[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string, dir: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
    async function fetchLeagues() {
      const { data } = await supabase.from('leagues').select('league_id, league_name').order('league_id', { ascending: true });
      if (data) {
        setLeagues(data);
        if (data.length > 0) {
          const firstId = String(data[0].league_id);
          setSelectedLeague(firstId);
          loadData(firstId);
        }
      }
    }
    fetchLeagues();
  }, []);

  async function loadData(leagueId: string) {
    const { data: stats } = await supabase.from('api_stats_with_names').select('*').eq('league_id', parseInt(leagueId, 10));
    if (stats) setData(stats);
  }

  const teams = useMemo(() => ['All', ...Array.from(new Set(data.map(p => p.team_name))).filter(Boolean).sort()], [data]);
  const filteredData = useMemo(() => {
    if (selectedTeam === 'All') return data;
    return data.filter(p => p.team_name === selectedTeam);
  }, [data, selectedTeam]);

  const sortMap: Record<string, string> = {
    'TEAM': 'team_name', 'PLAYER': 'player_name', 'GP': 'gp', 'G': 'total_goals',
    'A': 'total_assists', 'P': 'total_points', 'SOG': 'total_sog', 'CHKS': 'total_chks',
    'PIM': 'total_pim', 'TOI': 'toi_minutes', 'W': 'wins', 'L': 'losses',
    'T': 'ties', 'OTL': 'otl', 'SO': 'shutouts', 'SV%': 'sv_pct', 'GAA': 'gaa'
  };

  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = a[sortConfig.key] ?? 0;
      const valB = b[sortConfig.key] ?? 0;
      return sortConfig.dir === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [filteredData, sortConfig]);

  const requestSort = (header: string) => {
    const key = sortMap[header];
    if (!key) return;
    setSortConfig({ key, dir: sortConfig?.key === key && sortConfig.dir === 'desc' ? 'asc' : 'desc' });
  };

  const getFilteredData = (type: 'skaters' | 'goalies' | 'defense') => {
    if (type === 'defense') return sortedData.filter(p => p.pos_played === 'D');
    return sortedData.filter(p => type === 'skaters' ? p.pos_played !== 'G' : p.pos_played === 'G');
  };

  return (
    <div className="bg-[#f4f1ea] text-black min-h-screen p-4 font-serif text-sm">
      <header className="border-b-4 border-black pb-2 mb-4 text-center">
        <h1 className="text-4xl font-black uppercase tracking-tighter">League Statistics</h1>
      </header>
      <div className="mb-4 flex justify-between items-center">
        <div className="flex gap-4">
          <select value={selectedLeague} onChange={(e) => { setSelectedLeague(e.target.value); loadData(e.target.value); }} className="bg-transparent border-b-2 border-black font-bold uppercase p-1 cursor-pointer">
            {leagues.map((l) => <option key={l.league_id} value={l.league_id}>{l.league_name}</option>)}
          </select>
          {activeTab === 'Home' && (
            <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)} className="bg-transparent border-b-2 border-black font-bold uppercase p-1 cursor-pointer">
              {teams.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
        </div>
      </div>
      <div className="flex gap-4 mb-4 text-xs uppercase border-b border-black pb-2 justify-center">
        {['Home', 'Skaters', 'Goalies'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={activeTab === tab ? 'font-bold' : 'text-gray-600'}>{tab}</button>
        ))}
      </div>
      {activeTab === 'Home' && (
        <div className="grid grid-cols-2 gap-6">
          <StatCard title="Skaters" data={getFilteredData('skaters')} category="Skaters" onTabClick={setActiveTab} />
          <StatCard title="Goalies" data={getFilteredData('goalies')} category="Goalies" onTabClick={setActiveTab} />
          <StatCard title="Defensemen" data={getFilteredData('defense')} category="Skaters" onTabClick={setActiveTab} />
          <StatCard title="Rookie Scoring Leaders" data={sortedData.filter(p => p.is_rookie)} category="Skaters" onTabClick={setActiveTab} />
        </div>
      )}
      {(activeTab === 'Skaters' || activeTab === 'Goalies') && (
        <table className="w-full text-[11px] border-collapse border-t border-b border-black">
          <thead className="bg-black text-white">
            <tr>
              {activeTab === 'Skaters'
                ? ['TEAM', 'PLAYER', 'GP', 'G', 'A', 'P', 'SOG', 'CHKS', 'PIM', 'TOI'].map(h => <th key={h} className="p-1 text-left cursor-pointer hover:bg-gray-800" onClick={() => requestSort(h)}>{h}</th>)
                : ['TEAM', 'PLAYER', 'GP', 'W', 'L', 'T', 'OTL', 'SO', 'SV%', 'GAA'].map(h => <th key={h} className="p-1 text-left cursor-pointer hover:bg-gray-800" onClick={() => requestSort(h)}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {getFilteredData(activeTab === 'Skaters' ? 'skaters' : 'goalies').map((r, i) => (
              <tr key={i} className="border-b border-gray-300 hover:bg-gray-200">
                <td className="p-1">{r.logo_url ? <img src={r.logo_url} className="h-6 w-6 object-contain" /> : r.team_name}</td>
                <td className="p-1 font-bold">{r.player_name} {r.is_rookie && <span className="text-red-600 font-black">[R]</span>}</td>
                <td className="p-1">{r.gp}</td>
                {activeTab === 'Skaters' ? (
                  <><td className="p-1">{r.total_goals}</td><td className="p-1">{r.total_assists}</td><td className="p-1 font-bold">{r.total_points}</td><td className="p-1">{r.total_sog}</td><td className="p-1">{r.total_chks}</td><td className="p-1">{r.total_pim}</td><td className="p-1">{r.toi_minutes}</td></>
                ) : (
                  <><td className="p-1">{r.wins}</td><td className="p-1">{r.losses}</td><td className="p-1">{r.ties}</td><td className="p-1">{r.otl}</td><td className="p-1 font-bold">{r.shutouts}</td><td className="p-1">{r.sv_pct?.toFixed(3)}</td><td className="p-1">{r.gaa?.toFixed(2)}</td></>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}