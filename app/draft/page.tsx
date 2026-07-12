"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

interface DraftData {
  team: string;
  rd: number;
  pk: number;
  player: string;
  pos: string | null;
  ovr: number | null;
  transaction: string;
  logo: string;
  year: number;
}

interface League {
  id: number;
  league_name: string;
}

export default function DraftPage() {
  const [data, setData] = useState<DraftData[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [showCapital, setShowCapital] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeague, setSelectedLeague] = useState('ALL');
  const [podium, setPodium] = useState<DraftData | null>(null);

  useEffect(() => {
    async function fetchData() {
      // 1. Fetch Leagues
      const { data: leagueData } = await supabase.from('leagues').select('id, league_name');
      if (leagueData) setLeagues(leagueData);

      // 2. Fetch Draft Data
      const { data: rawData, error } = await supabase
        .from('league_drafts')
        .select(`
          round, pick_number, year, transaction_type,
          league_player_database (*),
          league_teams (*)
        `);

      if (error) console.error("Supabase Query Error:", error);

      if (rawData) {
        setData(rawData.map((d: any) => {
          const p = d.league_player_database;
          const t = d.league_teams;
          // Accessing JSON meta 'ovr' from ratings if it's stored as an object/JSON
          const ovr = p?.ratings?.ovr || null;

          return {
            team: t?.team_name || "Unknown",
            rd: d.round,
            pk: d.pick_number,
            player: p?.player_name || "N/A",
            pos: p?.pos || "N/A",
            ovr: ovr,
            transaction: d.transaction_type,
            logo: t?.banner_filename || "",
            year: d.year
          };
        }));
      }
    }
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    return data.filter(d => {
      const isCapitalRow = (!d.player || d.player === "N/A");
      const viewMatch = showCapital ? isCapitalRow : !isCapitalRow;
      const search = searchQuery.toLowerCase();
      const matchSearch = d.team.toLowerCase().includes(search) || d.player.toLowerCase().includes(search);
      return viewMatch && matchSearch;
    });
  }, [data, showCapital, searchQuery]);

  return (
    <div className="min-h-screen bg-[#0d0d0d] p-8 text-white font-serif">
      <div className="max-w-6xl mx-auto">

        {/* Header & Controls */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-widest mb-4">DRAFT CENTRAL</h1>
            <div className="flex gap-4">
              <select value={selectedLeague} onChange={(e) => setSelectedLeague(e.target.value)} className="bg-white text-black px-2 py-1 font-bold uppercase text-sm cursor-pointer border border-gray-300">
                <option value="ALL">ALL LEAGUES</option>
                <option value="W01">W01 (1995)</option>
                {leagues.map(l => <option key={l.id} value={l.id}>{l.league_name}</option>)}
              </select>
              <input placeholder="Search..." onChange={(e) => setSearchQuery(e.target.value)} className="bg-white text-black px-2 py-1 text-sm w-48 focus:outline-none border border-gray-300" />
              <button onClick={() => setShowCapital(!showCapital)} className="bg-white text-black px-4 py-1 text-sm font-bold uppercase hover:bg-gray-200 border border-gray-300">
                {showCapital ? "View Picks" : "View Capital"}
              </button>
            </div>
          </div>

          {/* Podium */}
          <div className="w-64 bg-white text-black p-4 border border-gray-300 shadow-lg">
            <h3 className="text-[10px] font-bold uppercase tracking-widest border-b border-black mb-2">PODIUM</h3>
            {podium ? (
              <div className="text-center">
                <p className="text-md font-black uppercase">{podium.player}</p>
                <p className="text-xs font-bold text-gray-700 mb-1">{podium.pos} | OVR: {podium.ovr ?? 'N/A'}</p>
                <p className="text-[10px] italic border-t border-black pt-1">{podium.team} • Pick {podium.pk}</p>
              </div>
            ) : (
              <p className="text-[10px] italic text-gray-500 py-4">No player selected</p>
            )}
          </div>
        </div>

        {/* Table */}
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-gray-500 text-xs uppercase tracking-widest border-b border-gray-800">
              <th className="py-3">YEAR</th>
              <th className="py-3">TEAM</th>
              <th className="py-3">RD</th>
              <th className="py-3">PK</th>
              <th className="py-3">PLAYER</th>
              <th className="py-3">POS</th>
              <th className="py-3">OVR</th>
              <th className="py-3">TRANSACTION</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((d, i) => (
              <tr key={i} onClick={() => setPodium(d)} className={`border-b border-gray-900 cursor-pointer hover:bg-gray-900 transition-colors ${podium?.player === d.player ? 'bg-gray-800' : ''}`}>
                <td className="py-4 text-sm font-bold">{d.year}</td>
                <td className="py-4 flex items-center gap-2 text-sm">{d.logo && <img src={d.logo} className="w-6 h-6 object-contain" alt="" />} {d.team}</td>
                <td className="py-4 text-sm">{d.rd}</td>
                <td className="py-4 text-sm">{d.pk}</td>
                <td className="py-4 text-sm font-bold">{d.player}</td>
                <td className="py-4 text-sm">{d.pos}</td>
                <td className="py-4 text-sm">{d.ovr}</td>
                <td className="py-4 text-sm text-gray-400">{d.transaction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}