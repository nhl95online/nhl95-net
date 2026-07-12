"use client";

import React, { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';

export default function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const resolvedParams = use(params);
  const { teamId } = resolvedParams;

  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [team, setTeam] = useState<any>(null);
  const [roster, setRoster] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch seasons dynamically (Same as Schedule page)
  useEffect(() => {
    async function init() {
      const { data: seasonData } = await supabase
        .from('league_seasons')
        .select('*')
        .order('league_id', { ascending: false });

      setSeasons(seasonData || []);
      if (seasonData && seasonData.length > 0) {
        setSelectedSeason(Number(seasonData[0].league_id));
      }
    }
    init();
  }, []);

  // 2. Fetch Team and Roster data
  useEffect(() => {
    async function loadData() {
      if (!teamId || selectedSeason === null) return;
      setLoading(true);

      const { data: teamData } = await supabase
        .from('league_teams')
        .select('*')
        .eq('team_id', teamId)
        .single();

      if (teamData) setTeam(teamData);

      const { data: rosterData } = await supabase
        .from('league_rosters')
        .select('*')
        .eq('team_id', Number(teamId))
        .eq('league_id', Number(selectedSeason));

      setRoster(rosterData || []);
      setLoading(false);
    }
    loadData();
  }, [teamId, selectedSeason]);

  if (loading) return <div className="p-6 font-serif italic text-sm">Loading Gazette Team Files...</div>;
  if (!team) return <div className="p-6 font-serif italic text-sm">Team file not found.</div>;

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-black font-serif p-6">
      <header className="border-b-4 border-black pb-4 mb-8">
        <div className="flex items-center gap-6">
          <img src={team.logo_url} alt={team.team_name} className="w-20 h-20 object-contain" />
          <div>
            <h1 className="text-5xl font-black uppercase tracking-tighter">{team.team_name}</h1>
            <p className="text-xs font-bold uppercase italic mt-1">Gazette Archive — Official Roster</p>
          </div>
        </div>

        <div className="mt-6">
          <label className="text-[10px] uppercase font-black mr-3">Select Archive Season:</label>
          <select
            value={selectedSeason || ""}
            onChange={(e) => setSelectedSeason(Number(e.target.value))}
            className="bg-transparent border border-black p-1 text-[10px] font-bold uppercase cursor-pointer"
          >
            {seasons.map(s => (
              <option key={s.league_id} value={s.league_id}>{s.season_name}</option>
            ))}
          </select>
        </div>
      </header>

      {/* THREE SECTION LAYOUT: ROSTER | SEASONS | RECORDS */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

        {/* LEFT: ROSTER */}
        <section className="col-span-12 md:col-span-4">
          <h2 className="font-black border-b-2 border-black mb-4 uppercase text-lg">Roster</h2>
          <div className="border border-black bg-white">
            <div className="grid grid-cols-6 text-[9px] font-black uppercase bg-black text-white p-1">
              <div className="col-span-3">Name</div>
              <div className="col-span-1 text-center">Pos</div>
              <div className="col-span-1 text-center">Ovr</div>
              <div className="col-span-1 text-center">#</div>
            </div>
            {roster.length > 0 ? (
              roster.map((p, index) => (
                <div key={p.roster_id} className={`grid grid-cols-6 text-[10px] font-bold p-1 border-b border-gray-200 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                  <div className="col-span-3 truncate uppercase">{p.player_name || "Unknown"}</div>
                  <div className="col-span-1 text-center">{p.pos || "-"}</div>
                  <div className="col-span-1 text-center">{p.overall || "-"}</div>
                  <div className="col-span-1 text-center">{p.jersey_number || "-"}</div>
                </div>
              ))
            ) : (
              <div className="p-2 text-[10px] font-bold uppercase italic">No archived data.</div>
            )}
          </div>
        </section>

        {/* CENTER: TEAM SEASONS */}
        <main className="col-span-12 md:col-span-4">
          <h2 className="font-black border-b-2 border-black mb-4 uppercase text-lg">Season Log</h2>
          <div className="border border-black bg-white text-[10px] p-2 font-bold uppercase italic">
            <p>Archive of team performance across all seasons...</p>
          </div>
        </main>

        {/* RIGHT: RECORDS */}
        <aside className="col-span-12 md:col-span-4">
          <h2 className="font-black border-b-2 border-black mb-4 uppercase text-lg">Records</h2>
          <div className="border border-black bg-white text-[10px] p-2 font-bold uppercase italic">
            <p>Franchise high scores and legacy statistics...</p>
          </div>
        </aside>
      </div>
    </div>
  );
}