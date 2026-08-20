"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Helper: Visual Rating Bars (1-6 scale)
const RatingBar = ({ label, value }: { label: number | string, value: number }) => {
  const max = 6;
  const getColor = (v: number) => (v <= 2 ? "#dc2626" : v <= 4 ? "#ea580c" : "#16a34a");
  return (
    <div className="flex justify-between items-center text-[9px] uppercase gap-2 mb-0.5">
      <span className="w-10 font-bold truncate text-slate-700">{label}</span>
      <div className="flex gap-0.5 border border-black w-20">
        {[...Array(max)].map((_, i) => (
          <div key={i} className={`w-2.5 h-2.5 ${i < value ? "" : "bg-transparent"}`} style={{ backgroundColor: i < value ? getColor(value) : 'transparent' }} />
        ))}
      </div>
      <span className="font-mono font-black w-4 text-right">{value}</span>
    </div>
  );
};

// Helper: Weight Conversion
const calculateWeight = (idx: any) => {
  const weights = [120, 132, 140, 148, 156, 164, 172, 180, 188, 196, 204, 212, 220, 228, 236, 244, 252, 260];
  const indices = [0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

  const numericIdx = Number(idx);
  if (isNaN(numericIdx) || numericIdx < 0 || numericIdx >= indices.length) return "N/A";

  const weightVal = weights[numericIdx];
  return weightVal;
};

// Helper: Career OVR Trend Chart
const SeasonTrend = ({ careerData, leagueAverages }: { careerData: any[], leagueAverages: Record<string, number> }) => {
  const minOvr = 25;
  const maxOvr = 125;
  const width = 600;
  const height = 200;

  const data = (careerData && Array.isArray(careerData)) ? [...careerData].sort((a, b) => a.year - b.year) : [];
  const getY = (ovr: number) => height - 40 - ((Math.min(ovr, 125) - minOvr) / (maxOvr - minOvr)) * (height - 80);

  const points = data.map((s, i) => ({
    x: data.length > 1 ? (i / (data.length - 1)) * (width - 60) + 40 : width / 2,
    playerY: getY(s.ovr),
    avgY: getY(leagueAverages[s.year] || 75)
  }));

  return (
    <div className="mt-8 border-t-2 border-black pt-4 p-2">
      <p className="text-[12px] font-black uppercase text-center mb-2">CAREER OVR VS LEAGUE AVERAGE</p>
      {data.length > 0 ? (
        <svg width="100%" height="220" viewBox={`0 0 ${width} ${height}`} className="bg-[#F5F2E6] border border-black overflow-visible">
          {[25, 50, 75, 100, 125].map((val, i) => (
            <text key={i} x="35" y={getY(val) + 5} textAnchor="end" fontSize="12" fontWeight="bold">{val}</text>
          ))}
          {[25, 50, 75, 100, 125].map((val, i) => (
            <line key={i} x1="40" y1={getY(val)} x2={width - 20} y2={getY(val)} stroke="#ccc" />
          ))}
          <polyline fill="none" stroke="#000000" strokeWidth="3" points={points.map(p => `${p.x},${p.avgY}`).join(' ')} />
          <polyline fill="none" stroke="#16a34a" strokeWidth="4" points={points.map(p => `${p.x},${p.playerY}`).join(' ')} />
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.playerY} r="5" fill="#16a34a" />
              <text x={p.x} y={height - 15} textAnchor="middle" fontSize="10" fontWeight="bold">{data[i].year.toString().slice(-2)}</text>
            </g>
          ))}
        </svg>
      ) : (
        <div className="h-[200px] flex items-center justify-center border border-dashed border-black text-[10px] text-black">NO HISTORICAL DATA FOUND</div>
      )}
    </div>
  );
};

// Helper: Player Portrait
const PlayerPortrait = ({ name, url }: { name: string, url: string }) => {
  const filename = name.toLowerCase().replace(/ /g, '_');
  const [imgSrc, setImgSrc] = useState(`${url}/${filename}.png`);
  useEffect(() => { setImgSrc(`${url}/${filename}.png`); }, [name, url, filename]);
  return (
    <img
      key={name}
      src={imgSrc}
      className="w-24 h-24 object-cover border-2 border-black bg-slate-100 mb-2"
      onError={() => {
        if (imgSrc.endsWith('.png')) setImgSrc(`${url}/${filename}.jpg`);
        else setImgSrc('/placeholder-player.png');
      }}
    />
  );
};

export default function PlayersPage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [year, setYear] = useState('');
  const [page, setPage] = useState(0);
  const [leagueAverages, setLeagueAverages] = useState<Record<string, number>>({});
  const [sort, setSort] = useState({ column: 'player_name', asc: true });

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://prdfunbzqsvqlyiwmuqp.supabase.co';
  const PORTRAIT_BUCKET = "nhl%20players";
  const BANNER_BUCKET = "nhl%20banners";
  const years = Array.from({ length: 2026 - 1909 + 1 }, (_, i) => 1909 + i);

  useEffect(() => { fetchPlayers(); }, [page, sort]);

  const fetchPlayers = async (s = search, y = year, pg = page) => {
    let query = supabase.from('league_player_database').select('*');
    if (s) query = query.ilike('player_name', `%${s}%`);
    if (y) query = query.eq('player_info->>source_year', y);

    const { data } = await query;
    let processedData = [...(data || [])];

    processedData.sort((a, b) => {
      let valA = sort.column === 'Ovr' ? Number(a.ratings?.Ovr || 0) : sort.column === 'Year' ? Number(a.player_info?.source_year || 0) : String(a[sort.column] || '');
      let valB = sort.column === 'Ovr' ? Number(b.ratings?.Ovr || 0) : sort.column === 'Year' ? Number(b.player_info?.source_year || 0) : String(b[sort.column] || '');
      return sort.asc ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });

    setPlayers(processedData.slice(pg * 50, (pg * 50) + 50));

    if (data) {
      const avgs: Record<string, { sum: number, count: number }> = {};
      data.forEach(p => {
        const year = p.player_info?.source_year;
        const ovr = Number(p.ratings?.Ovr || 0);
        if (year) {
          if (!avgs[year]) avgs[year] = { sum: 0, count: 0 };
          avgs[year].sum += ovr;
          avgs[year].count += 1;
        }
      });
      const finalAvgs: Record<string, number> = {};
      Object.keys(avgs).forEach(y => finalAvgs[y] = Math.round(avgs[y].sum / avgs[y].count));
      setLeagueAverages(finalAvgs);
    }
  };

  const handleSort = (col: string) => {
    setSort(prev => ({ column: col, asc: prev.column === col ? !prev.asc : true }));
  };

  const downloadCSV = () => {
    const headers = ["Player,Pos,Team,Year,Ovr"];
    const rows = players.map(p => `${p.player_name},${p.pos},${p.team_default},${p.player_info?.source_year},${p.ratings?.Ovr}`);
    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nhl_players.csv';
    a.click();
  };

  const selectedCareerData = selected
    ? players.filter(p => p.player_name === selected.player_name).map(p => ({ year: p.player_info?.source_year, ovr: Number(p.ratings?.Ovr || 0) }))
    : [];

  return (
    <div className="p-2 sm:p-4 max-w-7xl mx-auto grid grid-cols-12 gap-4 font-mono bg-[#E5E0D5] min-h-screen text-[10px]">
      <div className="col-span-12 lg:col-span-7 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          <input className="sm:col-span-2 bg-[#F5F2E6] border-2 border-black p-1.5 text-[10px] uppercase text-black" placeholder="SEARCH PLAYER..." onChange={(e) => { setSearch(e.target.value); setPage(0); fetchPlayers(e.target.value, year, 0) }} />
          <select className="bg-[#F5F2E6] border-2 border-black p-1.5 text-[10px] uppercase text-black" onChange={(e) => { setYear(e.target.value); setPage(0); fetchPlayers(search, e.target.value, 0) }}>
            <option value="">ALL YEARS</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={downloadCSV} className="bg-black text-white p-1.5 uppercase font-bold hover:bg-green-700">Download CSV</button>
        </div>

        <div className="flex justify-between items-center text-xs text-black border-y border-black py-2">
          <button disabled={page === 0} onClick={() => setPage(page - 1)} className="hover:text-green-700 font-bold cursor-pointer disabled:opacity-40">◀ PREV</button>
          <span className="font-bold">PAGE {page + 1}</span>
          <button onClick={() => setPage(page + 1)} className="hover:text-green-700 font-bold cursor-pointer">NEXT ▶</button>
        </div>

        <div className="bg-[#F5F2E6] border-2 border-black rounded overflow-x-auto">
          <table className="w-full text-left text-[9px] uppercase text-black min-w-[320px]">
            <thead className="bg-black text-white">
              <tr>
                <th className="p-1.5 cursor-pointer" onClick={() => handleSort('player_name')}>PLAYER ↕</th>
                <th className="p-1.5">POS</th>
                <th className="p-1.5">TEAM</th>
                <th className="p-1.5 cursor-pointer" onClick={() => handleSort('Year')}>YEAR ↕</th>
                <th className="p-1.5 cursor-pointer" onClick={() => handleSort('Ovr')}>OVR ↕</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black">
              {players.map(p => (
                <tr key={p.player_id} onClick={() => setSelected(p)} className="cursor-pointer hover:bg-slate-200">
                  <td className="p-1.5 font-bold">{p.player_name}</td>
                  <td className="p-1.5">{p.pos}</td>
                  <td className="p-1.5">{p.team_default}</td>
                  <td className="p-1.5">{p.player_info?.source_year}</td>
                  <td className="p-1.5 font-bold">{p.ratings?.Ovr || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-5">
        {selected ? (
          <div className="relative w-full bg-[#F5F2E6] text-black p-3 sm:p-4 border-[3px] border-black shadow-[5px_5px_0px_rgba(0,0,0,1)] rounded-lg lg:sticky lg:top-4">
            <div className="flex justify-between items-center mb-3 border-b-2 border-black pb-1">
              <h2 className="text-xl font-black uppercase italic tracking-tighter">{selected.player_name}</h2>
              <div className="bg-black text-white px-3 py-1 font-black text-lg">OVR {selected.ratings?.Ovr || '0'}</div>
            </div>

            <div className="bg-slate-200 border-2 border-black h-20 mb-3 overflow-hidden rounded">
              <img src={`${SUPABASE_URL}/storage/v1/object/public/${BANNER_BUCKET}/${selected.player_info?.source_team?.toLowerCase().replace(/ /g, '_')}.png`} className="w-full h-full object-cover block" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col items-center">
                <PlayerPortrait name={selected.player_name} url={`${SUPABASE_URL}/storage/v1/object/public/${PORTRAIT_BUCKET}`} />
                <div className="text-[9px] uppercase font-bold text-center">
                  <p>Team: {selected.team_default}</p>
                  <p>Weight: {calculateWeight(selected.player_info?.weight)} LBS</p>
                  <p>Jersey: #{selected.player_info?.jersey_num || '??'}</p>
                </div>
              </div>
              <div className="space-y-0.5">
                {selected.ratings && Object.entries(selected.ratings)
                  .filter(([k]) => k !== 'Ovr')
                  .map(([k, v]: [string, any]) => (
                    <RatingBar key={k} label={k} value={v} />
                  ))}
              </div>
            </div>

            <SeasonTrend careerData={selectedCareerData} leagueAverages={leagueAverages} />
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center border-4 border-dashed border-black text-black uppercase italic rounded-xl text-[10px]">
            SELECT A PLAYER
          </div>
        )}
      </div>
    </div>
  );
}