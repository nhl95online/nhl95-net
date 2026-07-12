"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

type LeagueType = 'W' | 'The Q' | 'Vintage' | 'ALL';

export default function TradesPage() {
  const [activeLeague, setActiveLeague] = useState<LeagueType>('ALL');
  const [selectedSeason, setSelectedSeason] = useState<number>(0);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [teamMetadata, setTeamMetadata] = useState<Record<string, any>>({});
  const [playerMap, setPlayerMap] = useState<Record<string, number>>({});
  const [draftPicks, setDraftPicks] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const pickValueWeights: Record<string, number> = { '1st': 100, '2nd': 50, '3rd': 30, '4th': 15, '5th': 8 };

  useEffect(() => {
    async function initializeTradeCenter() {
      setLoading(true);
      try {
        const [seasonRes, teams, players, draft, tradesRes] = await Promise.all([
          supabase.from('league_seasons').select('league_id, season_name').order('league_id', { ascending: false }),
          supabase.from('league_teams').select('team_name, abbreviation, logo_url'),
          supabase.from('league_player_database').select('player_name, ratings'),
          supabase.from('league_drafts').select('*'),
          supabase.from('league_trades').select('*').order('trade id', { ascending: false })
        ]);

        setSeasons(seasonRes.data || []);

        const teamsMap: Record<string, any> = {};
        teams.data?.forEach((t: any) => {
          const abbrKey = String(t.abbreviation || '').trim().toUpperCase();
          teamsMap[abbrKey] = { name: t.team_name, abbr: t.abbreviation, logo: t.logo_url };
        });
        setTeamMetadata(teamsMap);

        const pMap: Record<string, number> = {};
        players.data?.forEach((p: any) => {
          try {
            const r = typeof p.ratings === 'string' ? JSON.parse(p.ratings) : p.ratings;
            pMap[p.player_name.trim().toLowerCase()] = parseInt(r?.Ovr || r?.overall || r?.OVR) || 70;
          } catch { }
        });
        setPlayerMap(pMap);

        setDraftPicks(draft.data || []);
        setTrades(tradesRes.data || []);
      } catch (err: any) {
        console.error("Initialization Failed:", err);
      } finally {
        setLoading(false);
      }
    }
    initializeTradeCenter();
  }, []);

  const evaluateAssetsValue = (assetsString: string) => {
    if (!assetsString || assetsString === '-' || assetsString === 'NULL') return { items: [], totalValue: 0 };
    const items = assetsString.split(/[,;\n]+/).map(i => i.trim()).filter(Boolean);
    let total = 0;
    items.forEach((item) => {
      const lower = item.toLowerCase();
      let found = false;
      for (const [k, v] of Object.entries(pickValueWeights)) {
        if (lower.includes(k.toLowerCase())) { total += v; found = true; break; }
      }
      if (!found) total += Object.entries(playerMap).find(([name]) => lower.includes(name))?.[1] || 75;
    });
    return { items, totalValue: total };
  };

  const filteredTrades = trades.filter((t) => {
    // 1. Season Filter
    if (selectedSeason !== 0) {
      const selectedName = seasons.find(s => s.league_id === selectedSeason)?.season_name;
      if (t.lg !== selectedName) return false;
    }
    // 2. League Filter
    if (activeLeague !== 'ALL') {
      const lg = String(t.lg || '').toUpperCase();
      let tab: LeagueType = 'Vintage';
      if (lg.startsWith('W')) tab = 'W';
      else if (lg.startsWith('Q')) tab = 'The Q';
      if (tab !== activeLeague) return false;
    }
    // 3. Search Filter
    const q = searchQuery.toLowerCase();
    return [t.team, t.team_1, t.trade, t.trade_1].some(v => String(v || '').toLowerCase().includes(q));
  });

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-black font-serif px-4 py-8 select-none">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black uppercase tracking-tight italic">Authorized Trade Matrix</h1>

          <div className="mt-6 flex justify-center items-center gap-4">
            <label className="font-bold uppercase tracking-widest text-sm">Select Archive Season:</label>
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(Number(e.target.value))}
              className="bg-transparent border-b-2 border-black font-bold uppercase p-1 cursor-pointer"
            >
              <option value={0}>ALL SEASONS</option>
              {seasons.map(s => <option key={s.league_id} value={s.league_id}>{s.season_name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="flex-1 flex gap-2">
            {(['ALL', 'W', 'The Q', 'Vintage'] as LeagueType[]).map((l) => (
              <button key={l} onClick={() => setActiveLeague(l)}
                className={`px-6 py-2 font-black uppercase text-xs border ${activeLeague === l ? 'bg-black text-white' : 'bg-white border-black'}`}>
                {l}
              </button>
            ))}
          </div>
          <input className="w-60 border border-black p-2 text-xs font-sans" placeholder="Global Search..." onChange={(e) => setSearchQuery(e.target.value)} />
        </div>

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-9 space-y-4">
            {loading ? <p>Loading Trade Data...</p> : filteredTrades.map((t, i) => {
              const m1 = teamMetadata[String(t.team).trim().toUpperCase()];
              const m2 = teamMetadata[String(t.team_1).trim().toUpperCase()];
              const v1 = evaluateAssetsValue(t.trade);
              const v2 = evaluateAssetsValue(t.trade_1);
              const diff = Math.abs(v1.totalValue - v2.totalValue);
              const winner = v1.totalValue > v2.totalValue + 15 ? m1?.abbr : v2.totalValue > v1.totalValue + 15 ? m2?.abbr : 'DRAW';

              return (
                <div key={i} className="bg-[#1c1c1f] text-white p-4 border-l-4 border-red-600">
                  <div className="flex justify-between text-[10px] uppercase font-bold text-gray-400 mb-4">
                    <span>ID: #{t["trade id"]} • {t.lg}</span>
                    <span>{winner !== 'DRAW' ? `${winner} WINS` : 'BALANCED'} (+{diff} PTS)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      {m1?.logo && <img src={m1.logo} className="w-12 h-12 mx-auto mb-2 object-contain" alt="" />}
                      <p className="font-bold text-emerald-400 text-sm uppercase">{m1?.name || t.team}</p>
                      {v1.items.map((it, idx) => <p key={idx} className="text-[10px]">▶ {it}</p>)}
                    </div>
                    <div>
                      {m2?.logo && <img src={m2.logo} className="w-12 h-12 mx-auto mb-2 object-contain" alt="" />}
                      <p className="font-bold text-blue-400 text-sm uppercase">{m2?.name || t.team_1}</p>
                      {v2.items.map((it, idx) => <p key={idx} className="text-[10px]">▶ {it}</p>)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <aside className="col-span-3">
            <div className="bg-[#1c1c1f] text-white p-4">
              <h3 className="font-black text-xs uppercase border-b border-red-500 pb-2 mb-4 text-red-500">DRAFT PICKS</h3>
              {draftPicks.map((pick, i) => (
                <div key={i} className="mb-2 text-[10px] uppercase font-bold text-white/70">
                  {pick.team} - {pick.round}rd Round
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}