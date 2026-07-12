"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AwardsPage() {
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number>(0);
  const [awards, setAwards] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [hoveredAward, setHoveredAward] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  // 1. Fetch seasons dynamically
  useEffect(() => {
    async function init() {
      const { data: seasonData } = await supabase
        .from('league_seasons')
        .select('league_id, season_name')
        .order('league_id', { ascending: false });

      setSeasons(seasonData || []);
      if (seasonData && seasonData.length > 0) {
        setSelectedSeason(seasonData[0].league_id);
      }
    }
    init();
  }, []);

  // 2. Fetch History for Hover (Synced with dropdown names)
  async function fetchAwardHistory(awardName: string) {
    const { data } = await supabase
      .from('league_awards')
      .select(`
        league_id, 
        league_player_database (player_name), 
        league_coaches (coach_name), 
        awards!inner (award_names)
      `)
      .eq('awards.award_names', awardName);

    if (data) {
      setHistory(data.map((item: any) => { // Add : any here
        const seasonObj = seasons.find(s => s.league_id === item.league_id);
        return {
          season: seasonObj ? seasonObj.season_name : `Season ${item.league_id}`,
          // Ensure we access it correctly based on whether it's an object or an array
          winner: item.league_player_database?.player_name
            || item.league_coaches?.coach_name
            || "N/A"
        };
      }));
    }
  }

  // 3. Fetch Awards for Selected Season
  useEffect(() => {
    async function fetchData() {
      if (selectedSeason === 0) return;
      setLoading(true);
      const { data } = await supabase
        .from('league_awards')
        .select(`
          description, nhl_comparable, player_id, team_id, coach_id,
          awards!inner (award_names, award_url),
          league_player_database (player_name),
          league_teams (team_name, logo_url),
          league_coaches (coach_name)
        `)
        .eq('league_id', selectedSeason);

      const formatted = (data || []).map(item => {
        const playerName = item.league_player_database?.player_name;
        const coachName = item.league_coaches?.coach_name;
        const getWinner = () => {
          if (playerName && playerName !== "N/A" && playerName !== "--") return playerName;
          if (coachName && coachName !== "N/A" && coachName !== "--") return coachName;
          return "";
        };
        return {
          award_name: item.awards?.award_names || "Unknown",
          trophy_image_url: item.awards?.award_url,
          description: item.description,
          nhl_comparable: item.nhl_comparable,
          winner_name: getWinner(),
          team_name: item.league_teams?.team_name || "N/A",
          team_logo: item.league_teams?.logo_url
        };
      });
      setAwards(formatted);
      setLoading(false);
    }
    fetchData();
  }, [selectedSeason]);

  return (
    <div className="min-h-screen bg-[#f4f1ea] p-8 font-serif text-black">
      <header className="text-center border-b-4 border-black pb-8 mb-8">
        <h1 className="text 7xl font-black bold tracking-tighter uppercase mb-2">The Trophy Case</h1>
        <div className="mt-6 flex justify-center items-center gap-4">
          <label className="font-bold uppercase tracking-widest text-sm">Select Archive Season:</label>
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(Number(e.target.value))}
            className="bg-transparent border-b-2 border-black font-bold uppercase p-1 cursor-pointer"
          >
            {seasons.map(s => (
              <option key={s.league_id} value={s.league_id}>{s.season_name}</option>
            ))}
          </select>
        </div>
      </header>

      {/* 3-Column Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-6">
        {awards.map((a, idx) => (
          <div key={idx} className="p-4 border border-black bg-[#fdfaf5] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div
              className="relative cursor-help"
              onMouseEnter={() => { setHoveredAward(a.award_name); fetchAwardHistory(a.award_name); }}
              onMouseLeave={() => setHoveredAward(null)}
            >
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-white bg-black px-2 py-1 mb-3">
                {a.award_name}
              </h3>

              {hoveredAward === a.award_name && (
                <div className="absolute top-0 left-0 w-full bg-black text-white p-3 text-[13px] z-50">
                  <p className="font-bold border-b border-white mb-2 uppercase text-[11px]">All-Time Winners</p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {history.map((h, i) => (
                      <p key={i}> {h.season}: {h.winner}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 items-center mb-4">
              {a.trophy_image_url && <img src={a.trophy_image_url} className="w-20 h-20 object-contain" />}
              <div>
                <p className="text-2xl font-black italic leading-tight">{a.winner_name || "\u00A0"}</p>
                <div className="flex items-center gap-2 mt-1">
                  {a.team_logo && <img src={a.team_logo} className="w-6 h-6 object-contain" />}
                  <p className="font-bold text-xs uppercase tracking-tight">{a.team_name}</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t-2 border-black">
              <p className="font-bold text-[10px] uppercase">{a.nhl_comparable}</p>
              <p className="text-[12px] italic text-stone-700">{a.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}