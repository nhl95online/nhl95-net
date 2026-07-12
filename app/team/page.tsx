"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

export default function AllTeamsPage() {
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number>(0);
  const [teams, setTeams] = useState<any[]>([]);
  const [searchVal, setSearchVal] = useState("");

  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || "";

  useEffect(() => {
    async function init() {
      const { data: seasonData } = await supabase
        .from('league_seasons')
        .select('league_id, season_name')
        .order('league_id', { ascending: false });

      setSeasons(seasonData || []);
    }
    init();
  }, []);

  useEffect(() => {
    async function fetchTeams() {
      let queryBuilder = supabase
        .from('league_teams')
        .select('team_id, team_name, logo_url, coach_id, league_id, league_coaches(coach_name)');

      if (selectedSeason !== 0) {
        queryBuilder = queryBuilder.eq('league_id', selectedSeason);
      }

      const { data: teamsData, error: teamsError } = await queryBuilder;
      if (teamsError) return console.error("Teams Error:", teamsError);

      let standingsQuery = supabase
        .from('league_standings')
        .select('team_id, w, l, t, otl, season_id');

      if (selectedSeason !== 0) {
        standingsQuery = standingsQuery.eq('season_id', selectedSeason);
      }

      const { data: standingsData, error: standingsError } = await standingsQuery;
      if (standingsError) console.error("Standings Error:", standingsError);

      const combined = teamsData?.map(team => {
        const record = standingsData?.find(s => Number(s.team_id) === Number(team.team_id));
        const w = record?.w || 0;
        const otl = record?.otl || 0;
        const points = (w * 2) + otl;
        return {
          ...team,
          record: record || { w: 0, l: 0, t: 0, otl: 0 },
          points: points
        };
      }) || [];

      const sorted = combined.sort((a, b) => b.points - a.points);
      setTeams(sorted);
    }
    fetchTeams();
  }, [selectedSeason]);

  const filteredTeams = teams.filter(t =>
    !query || t.team_name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f4f1ea] p-6 font-serif text-black">
      <div className="flex justify-between items-end border-b-4 border-black mb-6 pb-2">
        <h1 className="text-4xl font-black uppercase tracking-tighter">League Directory</h1>
        <div className="flex gap-4 items-center">
          <Link href="/team" className="font-bold border border-black px-3 py-1 text-xs uppercase hover:bg-black hover:text-white transition">All Teams</Link>
          <input
            type="text"
            placeholder="SEARCH TEAMS..."
            className="border border-black px-2 py-1 text-xs font-bold bg-transparent"
            value={searchVal}
            onChange={(e) => {
              setSearchVal(e.target.value);
              router.push(`/team?q=${e.target.value}`);
            }}
          />
        </div>
      </div>

      <div className="mb-8">
        <label className="font-bold uppercase text-xs mr-2">Select Archive Season:</label>
        <select
          value={selectedSeason}
          onChange={(e) => setSelectedSeason(Number(e.target.value))}
          className="bg-transparent border border-black p-1 text-xs font-bold cursor-pointer uppercase"
        >
          <option value={0}>ALL SEASONS</option>
          {seasons.map(s => (
            <option key={s.league_id} value={s.league_id}>{s.season_name}</option>
          ))}
        </select>
      </div>

      {/* 3-COLUMN GRID LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredTeams.map((team, index) => (
          <Link
            key={team.team_id}
            href={`/team/${team.team_id}`}
            className="border-2 border-black p-4 hover:bg-black hover:text-white transition-colors duration-200 flex flex-col items-center group text-center relative"
          >
            <span className="absolute top-0 left-0 text-[10px] font-black uppercase bg-black text-white px-2 py-0.5 rounded-br">
              {seasons.find(s => s.league_id === team.league_id)?.season_name || `S${team.league_id}`}
            </span>

            <img src={team.logo_url} alt={team.team_name} className="w-20 h-20 object-contain mb-3 mt-4" />
            <h2 className="font-black text-sm uppercase mb-1">{team.team_name}</h2>
            <p className="text-[10px] uppercase tracking-wider opacity-70 italic mb-1">
              Coach: {team.league_coaches?.coach_name || 'TBA'}
            </p>
            <div className="mt-auto pt-2 w-full">
              <p className="text-[11px] font-bold bg-black text-white px-2 py-1 rounded">
                {team.record.w}-{team.record.l}-{team.record.t}-{team.record.otl}
              </p>
              <p className="text-[10px] uppercase font-bold mt-1">Rank: {index + 1}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}