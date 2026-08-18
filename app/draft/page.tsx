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
          const ovr = p?.ratings?.ovr || p?.ratings?.Ovr || null;

          return {
            team: t?.team_name || "Unknown",
            rd: d.round,
            pk: d.pick_number,
            player: p?.player_name || "N/A",
            pos: p?.pos || "N/A",
            ovr: ovr,
            transaction: d.transaction_type,
            logo: t?.logo_url || "",
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
    <div className="bg-[#f4f1ea] text-black min-h-screen p-3 sm:p-8 font-serif text-sm">
      <div className="max-w-7xl mx-auto">
        <header className="border-b-4 border-black pb-4 mb-6 text-center">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tighter">The Draft Floor</h1>
          <p className="text-xs uppercase tracking-widest font-sans font-bold text-gray-700 mt-1">Official Selection Archives & Draft Capital</p>
        </header>

        <div className="flex flex-col md:flex-row justify-between items-start gap-4 sm:gap-6 mb-6">
          <div className="space-y-3 w-full md:w-auto">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <select
                value={selectedLeague}
                onChange={(e) => setSelectedLeague(e.target.value)}
                className="bg-[#fdfaf5] text-black px-3 py-1.5 font-bold uppercase text-xs cursor-pointer border-2 border-black"
              >
                <option value="ALL">ALL LEAGUES</option>
                <option value="W01">W01 (1995)</option>
                {leagues.map(l => <option key={l.id} value={l.id}>{l.league_name}</option>)}
              </select>
              <input
                placeholder="SEARCH DRAFT..."
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#fdfaf5] text-black px-3 py-1.5 text-xs font-bold uppercase w-full sm:w-48 focus:outline-none border-2 border-black"
              />
              <button
                onClick={() => setShowCapital(!showCapital)}
                className="bg-black text-white px-3 sm:px-4 py-1.5 text-xs font-bold uppercase hover:bg-neutral-800 border-2 border-black"
              >
                {showCapital ? "View Selections" : "View Capital Picks"}
              </button>
            </div>
          </div>

          {/* Podium */}
          <div className="w-full md:w-72 bg-[#fdfaf5] text-black p-3 sm:p-4 border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)]">
            <h3 className="text-[10px] font-black uppercase tracking-widest border-b-2 border-black pb-1 mb-2 text-center bg-black text-white">
              PODIUM SELECTION
            </h3>
            {podium ? (
              <div className="text-center">
                <p className="text-base font-black uppercase">{podium.player}</p>
                <p className="text-xs font-bold text-gray-700 mb-1">{podium.pos} | OVR: {podium.ovr ?? 'N/A'}</p>
                <p className="text-[11px] italic border-t border-black pt-1 font-bold">{podium.team} • Pick #{podium.pk} (Rd {podium.rd})</p>
              </div>
            ) : (
              <p className="text-[11px] italic text-gray-500 py-3 text-center">Click any row to view on podium</p>
            )}
          </div>
        </div>

        {/* Mobile Swipe Notice */}
        <div className="md:hidden flex items-center justify-between text-[10px] font-sans font-bold text-black/60 px-3 py-1.5 bg-[#ebd9c0]/50 border border-black/15 mb-2 rounded-xs uppercase tracking-wider">
          <span>↔ Swipe table sideways for all draft columns</span>
          <span>{filteredData.length} Picks</span>
        </div>

        {/* Table */}
        <div className="bg-white border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] overflow-x-auto -mx-1 sm:mx-0">
          <table className="w-full text-left border-collapse text-xs min-w-[650px]">
            <thead>
              <tr className="bg-black text-white text-[10px] uppercase tracking-wider">
                <th className="py-2.5 px-3">YEAR</th>
                <th className="py-2.5 px-3">TEAM</th>
                <th className="py-2.5 px-3 text-center">RD</th>
                <th className="py-2.5 px-3 text-center">PK</th>
                <th className="py-2.5 px-3">PLAYER</th>
                <th className="py-2.5 px-3 text-center">POS</th>
                <th className="py-2.5 px-3 text-center">OVR</th>
                <th className="py-2.5 px-3">TRANSACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center italic text-gray-500 font-bold uppercase">
                    No draft records found matching query.
                  </td>
                </tr>
              ) : (
                filteredData.map((d, i) => (
                  <tr
                    key={i}
                    onClick={() => setPodium(d)}
                    className={`cursor-pointer hover:bg-yellow-50 transition-colors ${podium?.player === d.player && podium?.pk === d.pk ? 'bg-yellow-100 font-bold' : ''
                      }`}
                  >
                    <td className="py-2.5 px-3 font-mono font-bold">{d.year}</td>
                    <td className="py-2.5 px-3 flex items-center gap-2 font-bold uppercase">
                      {d.logo && <img src={d.logo} className="w-5 h-5 object-contain" alt="" />}
                      <span>{d.team}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">{d.rd}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold">#{d.pk}</td>
                    <td className="py-2.5 px-3 font-bold uppercase">{d.player}</td>
                    <td className="py-2.5 px-3 text-center font-mono">{d.pos}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold">{d.ovr ?? '-'}</td>
                    <td className="py-2.5 px-3 text-gray-600 font-sans text-[11px]">{d.transaction || 'Original Selection'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}