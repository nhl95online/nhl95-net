"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Mapping season IDs to their prefix type for trophy logic
const SEASON_TYPES: Record<number, string> = {
  1: 'W', 2: 'W', 3: 'W', 4: 'W', 5: 'Q', 6: 'W', 7: 'Q', 8: 'Q', 9: 'W', 10: 'Q',
  11: 'W', 12: 'Q', 13: 'Q', 14: 'W', 15: 'Q', 16: 'G', 17: 'Q', 18: 'W', 19: 'Q', 20: 'V',
  21: 'Q', 22: 'W', 23: 'Q', 24: 'W', 25: 'Q', 26: 'Q', 27: 'Q', 28: 'W', 29: 'Q', 30: 'Q',
  31: 'W', 32: 'Q', 33: 'W', 34: 'Q', 35: 'W', 36: 'Q', 37: 'W', 38: 'W'
};

const getTrophyUrl = (seasonId: number) => {
  const type = SEASON_TYPES[seasonId];
  if (type === 'W') return 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/brule_cup.png';
  if (type === 'Q') return 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/q_cup.png';
  if (type === 'V') return 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/grail_cup.png';
  return null;
};

export default function HomePage() {
  // Defaulting to 38
  const [selectedSeason, setSelectedSeason] = useState<number>(38);
  const [standings, setStandings] = useState<any[]>([]);

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
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold uppercase text-sm">STANDINGS</h2>
            <select
              className="text-[10px] border p-1 bg-transparent"
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(Number(e.target.value))}
            >
              <option value={1}>W01</option> <option value={2}>W02</option>
              <option value={3}>W03</option> <option value={4}>W04</option>
              <option value={5}>Q01</option> <option value={6}>W05</option>
              <option value={7}>Q02</option> <option value={8}>Q03</option>
              <option value={9}>W06</option> <option value={10}>Q04</option>
              <option value={11}>W07</option> <option value={12}>Q05</option>
              <option value={13}>Q06</option> <option value={14}>W08</option>
              <option value={15}>Q07</option> <option value={16}>G01</option>
              <option value={17}>Q08</option> <option value={18}>W09</option>
              <option value={19}>Q09</option> <option value={20}>V01</option>
              <option value={21}>Q10</option> <option value={22}>W10</option>
              <option value={23}>Q11</option> <option value={24}>W11</option>
              <option value={25}>Q12</option> <option value={26}>Q13</option>
              <option value={27}>Q14</option> <option value={28}>W12</option>
              <option value={29}>Q15</option> <option value={30}>Q16</option>
              <option value={31}>W13</option> <option value={32}>Q17</option>
              <option value={33}>W14</option> <option value={34}>Q18</option>
              <option value={35}>W15</option> <option value={36}>Q19</option>
              <option value={37}>W16</option> <option value={38}>W17</option>
            </select>
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
            </tbody>
          </table>
          <a href="/standings" className="block mt-4 text-[9px] underline italic text-slate-600">
            View full standings →
          </a>
        </aside>
      </div>
    </div>
  );
}