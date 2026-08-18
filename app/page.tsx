"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

interface SeasonOption {
  id: number;
  label: string;
  league: 'W' | 'O' | 'V' | 'G' | 'Q';
}

// All defined seasons with their ID, code label, and league type
const ALL_SEASONS: SeasonOption[] = [
  { id: 40, label: 'W18', league: 'W' },
  { id: 39, label: 'O01', league: 'O' },
  { id: 38, label: 'W17', league: 'W' },
  { id: 37, label: 'W16', league: 'W' },
  { id: 36, label: 'Q19', league: 'Q' },
  { id: 35, label: 'W15', league: 'W' },
  { id: 34, label: 'Q18', league: 'Q' },
  { id: 33, label: 'W14', league: 'W' },
  { id: 32, label: 'Q17', league: 'Q' },
  { id: 31, label: 'W13', league: 'W' },
  { id: 30, label: 'Q16', league: 'Q' },
  { id: 29, label: 'Q15', league: 'Q' },
  { id: 28, label: 'W12', league: 'W' },
  { id: 27, label: 'Q14', league: 'Q' },
  { id: 26, label: 'Q13', league: 'Q' },
  { id: 25, label: 'Q12', league: 'Q' },
  { id: 24, label: 'W11', league: 'W' },
  { id: 23, label: 'Q11', league: 'Q' },
  { id: 22, label: 'W10', league: 'W' },
  { id: 21, label: 'Q10', league: 'Q' },
  { id: 20, label: 'V01', league: 'V' },
  { id: 19, label: 'Q09', league: 'Q' },
  { id: 18, label: 'W09', league: 'W' },
  { id: 17, label: 'Q08', league: 'Q' },
  { id: 16, label: 'G01', league: 'G' },
  { id: 15, label: 'Q07', league: 'Q' },
  { id: 14, label: 'W08', league: 'W' },
  { id: 13, label: 'Q06', league: 'Q' },
  { id: 12, label: 'Q05', league: 'Q' },
  { id: 11, label: 'W07', league: 'W' },
  { id: 10, label: 'Q04', league: 'Q' },
  { id: 9, label: 'W06', league: 'W' },
  { id: 8, label: 'Q03', league: 'Q' },
  { id: 7, label: 'Q02', league: 'Q' },
  { id: 6, label: 'W05', league: 'W' },
  { id: 5, label: 'Q01', league: 'Q' },
  { id: 4, label: 'W04', league: 'W' },
  { id: 3, label: 'W03', league: 'W' },
  { id: 2, label: 'W02', league: 'W' },
  { id: 1, label: 'W01', league: 'W' }
];

// Mapping season IDs to their prefix type for trophy logic
const SEASON_TYPES: Record<number, string> = {
  1: 'W', 2: 'W', 3: 'W', 4: 'W', 5: 'Q', 6: 'W', 7: 'Q', 8: 'Q', 9: 'W', 10: 'Q',
  11: 'W', 12: 'Q', 13: 'Q', 14: 'W', 15: 'Q', 16: 'G', 17: 'Q', 18: 'W', 19: 'Q', 20: 'V',
  21: 'Q', 22: 'W', 23: 'Q', 24: 'W', 25: 'Q', 26: 'Q', 27: 'Q', 28: 'W', 29: 'Q', 30: 'Q',
  31: 'W', 32: 'Q', 33: 'W', 34: 'Q', 35: 'W', 36: 'Q', 37: 'W', 38: 'W', 39: 'O', 40: 'W'
};

const getTrophyUrl = (seasonId: number) => {
  const type = SEASON_TYPES[seasonId];
  if (type === 'W') return 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/brule_cup.png';
  if (type === 'Q') return 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/q_cup.png';
  if (type === 'V') return 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/grail_cup.png';
  if (type === 'O') return 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Original%206.png';
  if (type === 'G') return 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Golden%20Era.png';
  return null;
};

export default function HomePage() {
  // Defaulting to 40 (W18)
  const [selectedLeague, setSelectedLeague] = useState<string>('ALL');
  const [selectedSeason, setSelectedSeason] = useState<number>(40);
  const [standings, setStandings] = useState<any[]>([]);

  // Filter seasons based on selected league
  const filteredSeasons = useMemo(() => {
    if (selectedLeague === 'ALL') return ALL_SEASONS;
    return ALL_SEASONS.filter((s) => s.league === selectedLeague);
  }, [selectedLeague]);

  // Handle switching league filter buttons
  const handleLeagueChange = (league: string) => {
    setSelectedLeague(league);
    const available = league === 'ALL'
      ? ALL_SEASONS
      : ALL_SEASONS.filter((s) => s.league === league);

    if (available.length > 0 && !available.some((s) => s.id === selectedSeason)) {
      setSelectedSeason(available[0].id);
    }
  };

  useEffect(() => {
    async function loadStandings() {
      const { data, error } = await supabase
        .from('league_standings')
        .select(`
          gp, w, l, t, otl, pts, is_champion,
          league_teams(abbreviation, logo_url)
        `)
        .eq('season_id', Number(selectedSeason))
        .order('pts', { ascending: false });

      if (error) {
        console.error("DEBUG - Supabase Error:", JSON.stringify(error, null, 2));
      } else {
        setStandings(data || []);
      }
    }
    loadStandings();
  }, [selectedSeason]);

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-black font-serif p-6">
      <header className="border-b-4 border-black pb-4 mb-6 text-center">
        <h1 className="text-6xl font-black uppercase tracking-tighter">NHL95 Gazette</h1>
        <p className="text-sm italic">"Ask Ticklepuss where you want to be tickled"</p>
      </header>

      <div className="grid grid-cols-12 gap-8">
        <section className="col-span-12 md:col-span-3 border-r border-black">
          <h2 className="font-bold border-b border-black mb-4 pb-1 uppercase">Upcoming Events</h2>
          <ul className="text-sm space-y-4">
            <li><strong>June 28:</strong> Trade Deadline</li>
            <li><strong>July 01:</strong> Draft Lottery</li>
            <li><strong>July 05:</strong> Free Agency Opens</li>
          </ul>
        </section>

        <main className="col-span-12 md:col-span-6">
          <h2 className="font-bold border-b border-black mb-4 pb-1 uppercase">Daily Discord Briefing</h2>
          <div className="bg-slate-100 p-4 border border-slate-300 italic text-sm">
            [Visual Basic Integration]: "Summarizing daily messages..."
          </div>
        </main>

        <aside className="col-span-12 md:col-span-3 border-l border-black pl-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-bold uppercase text-sm">STANDINGS</h2>
            <select
              className="text-[10px] border border-black p-1 bg-transparent font-bold cursor-pointer"
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(Number(e.target.value))}
            >
              {filteredSeasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* League Filter / Sort Buttons */}
          <div className="flex flex-wrap items-center gap-1 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 mr-0.5">League:</span>
            {(['ALL', 'W', 'Q', 'O', 'V', 'G'] as const).map((league) => (
              <button
                key={league}
                type="button"
                onClick={() => handleLeagueChange(league)}
                className={`text-[10px] font-bold px-1.5 py-0.5 border border-black transition-colors ${selectedLeague === league
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-neutral-200'
                  }`}
              >
                {league}
              </button>
            ))}
          </div>

          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="border-b border-black text-left">
                <th className="pb-1 font-bold">RK</th>
                <th className="pb-1 font-bold">TM</th>
                <th className="pb-1 font-bold">W-L-T</th>
                <th className="pb-1 font-bold">PTS</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s: any, index: number) => (
                <tr key={index} className="border-b border-slate-200">
                  <td className="py-1 font-bold">{index + 1}</td>
                  <td className="py-1 font-bold flex items-center gap-2">
                    {s.league_teams?.logo_url && (
                      <img
                        src={s.league_teams.logo_url}
                        alt={s.league_teams.abbreviation}
                        className="w-4 h-4 object-contain"
                      />
                    )}
                    {s.league_teams?.abbreviation || 'N/A'}

                    {s.is_champion && getTrophyUrl(selectedSeason) && (
                      <img
                        src={getTrophyUrl(selectedSeason)!}
                        alt="Championship Winner"
                        className="w-4 h-4 ml-1 object-contain"
                        title="Championship Winner"
                      />
                    )}
                  </td>
                  <td className="py-1">{s.w}-{s.l}-{s.t}</td>
                  <td className="py-1 font-bold">{s.pts}</td>
                </tr>
              ))}
              {standings.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-3 text-center text-slate-500 italic">
                    No standings available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <a href="/standings" className="block mt-4 text-[9px] underline italic text-slate-600 hover:text-black">
            View full standings →
          </a>
        </aside>
      </div>
    </div>
  );
}