"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function SchedulePage() {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [selectedGame, setSelectedGame] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [loading, setLoading] = useState(true);

  // 1. Fetch seasons on mount
  useEffect(() => {
    async function init() {
      const { data: seasonData } = await supabase
        .from('league_seasons')
        .select('*')
        .order('league_id', { ascending: false });

      setSeasons(seasonData || []);

      if (seasonData && seasonData.length > 0) {
        const recent = Number(seasonData[0].league_id);
        setSelectedSeason(recent);
        fetchGamesForSeason(recent);
      } else {
        setLoading(false);
      }
    }
    init();
  }, []);

  // 2. Fetch data specifically for one season (Targeted query bypasses row limits)
  async function fetchGamesForSeason(leagueId: number) {
    setLoading(true);

    // Step A: Get all games for this specific season
    const { data: scheduleData } = await supabase
      .from('league_schedule')
      .select('*')
      .eq('league_id', leagueId);

    const gameIds = scheduleData?.map(g => g.game_id) || [];

    // Step B: Fetch only the necessary teams and stats for THESE games
    const [teamRes, statsRes] = await Promise.all([
      supabase.from('league_teams').select('team_id, team_name, logo_url'),
      supabase.from('league_gamestats').select('*').in('game_id', gameIds)
    ]);

    // Step C: Map data with OT/Tie visual logic
    const combined = (scheduleData || []).map(game => {
      // Process game_meta for OT/Tie visual cues
      const meta = typeof game.game_meta === 'string' ? JSON.parse(game.game_meta) : (game.game_meta || {});
      let glowClass = "border-black";
      if (meta.is_tie) glowClass = "shadow-[0_0_8px_rgba(34,197,94,0.6)] border-green-500";
      else if (meta.is_ot) glowClass = "shadow-[0_0_8px_rgba(59,130,246,0.6)] border-blue-500";

      const homeTeam = (teamRes.data || []).find(t => t.team_id === game.home_team_id);
      const awayTeam = (teamRes.data || []).find(t => t.team_id === game.away_team_id);
      const stats = (statsRes.data || []).find(s => s.game_id === game.game_id) || {
        home_score: '0',
        away_score: '0'
      };

      return { ...game, homeTeam, awayTeam, stats, glowClass };
    });

    setSchedule(combined);
    setLoading(false);
  }

  const handleSeasonChange = (id: number) => {
    setSelectedSeason(id);
    setSelectedGame(null);
    fetchGamesForSeason(id);
  };

  return (
    <div className="min-h-screen bg-[#f4f1ea] p-6 font-serif text-black">
      <h1 className="text-4xl font-black uppercase border-b-4 border-black mb-6 tracking-tighter">League Schedule</h1>

      {loading ? (
        <div className="p-4 font-bold uppercase">Loading season data...</div>
      ) : (
        <>
          <select
            onChange={(e) => handleSeasonChange(Number(e.target.value))}
            className="bg-transparent border border-black p-2 mb-6 font-bold uppercase text-sm cursor-pointer"
            value={selectedSeason || ""}
          >
            {seasons.map(s => <option key={s.league_id} value={s.league_id}>{s.season_name}</option>)}
          </select>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              {schedule.length > 0 ? schedule.map((game) => (
                <button
                  key={game.game_id}
                  onClick={() => { setSelectedGame(game); setActiveTab('summary'); }}
                  className={`w-full flex items-center justify-between p-3 border transition text-xs font-bold uppercase hover:bg-black hover:text-white ${game.glowClass}`}
                >
                  <div className="flex items-center gap-2">
                    <img src={game.awayTeam?.logo_url} className="w-6 h-6 object-contain" alt="away" />
                    <span>{game.awayTeam?.team_name} {game.stats.away_score}</span>
                  </div>
                  <span>@</span>
                  <div className="flex items-center gap-2">
                    <span>{game.stats.home_score} {game.homeTeam?.team_name}</span>
                    <img src={game.homeTeam?.logo_url} className="w-6 h-6 object-contain" alt="home" />
                  </div>
                </button>
              )) : <div className="p-4 text-xs font-bold uppercase opacity-50">No games found for this season.</div>}
            </div>

            <div className="border-4 border-black p-6 bg-white min-h-[400px]">
              {selectedGame ? (
                <>
                  <div className="flex justify-between items-center mb-6 border-b-2 border-black pb-4">
                    <div className="text-center w-1/3"><img src={selectedGame.awayTeam?.logo_url} className="w-16 h-16 mx-auto mb-2" alt="away" /><p className="font-bold text-xs">{selectedGame.awayTeam?.team_name}</p><p className="text-3xl font-black">{selectedGame.stats.away_score}</p></div>
                    <div className="text-xs font-bold uppercase italic opacity-50">Final</div>
                    <div className="text-center w-1/3"><img src={selectedGame.homeTeam?.logo_url} className="w-16 h-16 mx-auto mb-2" alt="home" /><p className="font-bold text-xs">{selectedGame.homeTeam?.team_name}</p><p className="text-3xl font-black">{selectedGame.stats.home_score}</p></div>
                  </div>

                  <div className="flex border-b border-black mb-4">
                    {['summary', 'penalties', 'stats', 'players'].map(tab => (
                      <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-xs font-bold uppercase ${activeTab === tab ? 'bg-black text-white' : 'hover:bg-gray-100'}`}>{tab}</button>
                    ))}
                  </div>
                  <div className="text-xs uppercase font-bold p-4 bg-gray-50 italic text-gray-500">
                    {activeTab === 'summary' && "Scoring Summary module coming soon..."}
                    {activeTab === 'penalties' && "Penalty details for this game will appear here."}
                    {activeTab === 'stats' && "Detailed team performance metrics."}
                    {activeTab === 'players' && "Individual player stats and goal scorers."}
                  </div>
                </>
              ) : <div className="text-center mt-20 text-gray-400 font-bold uppercase text-xs">Select a game to view the boxscore.</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}