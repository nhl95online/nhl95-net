"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function RecordsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<number>(1);

  // Using the season mapping for the record book filter
  const SEASON_MAP = [
    { id: 1, name: "W01" }, { id: 2, name: "W02" }, { id: 3, name: "W03" }, { id: 4, name: "W04" },
    { id: 5, name: "Q01" }, { id: 6, name: "W05" }, { id: 7, name: "Q02" }, { id: 8, name: "Q03" },
    { id: 9, name: "W06" }, { id: 10, name: "Q04" }, { id: 11, name: "W07" }, { id: 12, name: "Q05" },
    { id: 13, name: "Q06" }, { id: 14, name: "W08" }, { id: 15, name: "Q07" }, { id: 16, name: "G01" },
    { id: 17, name: "Q08" }, { id: 18, name: "W09" }, { id: 19, name: "Q09" }, { id: 20, name: "V01" },
    { id: 21, name: "Q10" }, { id: 22, name: "W10" }, { id: 23, name: "Q11" }, { id: 24, name: "W11" },
    { id: 25, name: "Q12" }, { id: 26, name: "Q13" }, { id: 27, name: "Q14" }, { id: 28, name: "W12" },
    { id: 29, name: "Q15" }, { id: 30, name: "Q16" }, { id: 31, name: "W13" }, { id: 32, name: "Q17" },
    { id: 33, name: "W14" }, { id: 34, name: "Q18" }, { id: 35, name: "W15" }, { id: 36, name: "Q19" },
    { id: 37, name: "W16" }, { id: 38, name: "W17" }
  ];

  useEffect(() => {
    async function fetchRecords() {
      const { data, error } = await supabase
        .from('league_records')
        .select('*')
        .eq('league_id', selectedLeagueId)
        .order('record_title', { ascending: true });

      if (error) console.error("Error fetching records:", error);
      else setRecords(data || []);
    }
    fetchRecords();
  }, [selectedLeagueId]);

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-black font-serif p-8">
      <header className="border-b-4 border-black pb-4 mb-8">
        <h1 className="text-5xl font-black uppercase tracking-tighter">League Record Book</h1>
        <div className="mt-4">
          <label className="text-sm font-bold mr-2 uppercase">Select League:</label>
          <select
            value={selectedLeagueId}
            onChange={(e) => setSelectedLeagueId(Number(e.target.value))}
            className="p-1 bg-transparent border-b-2 border-black font-bold uppercase"
          >
            {SEASON_MAP.map((s) => (
              <option key={s.id} value={s.id}>Season {s.name}</option>
            ))}
          </select>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {records.length > 0 ? records.map((r) => (
          <div key={r.record_id} className="border border-black p-4 bg-white">
            <h3 className="font-bold border-b border-black mb-2 uppercase text-xs">{r.record_title}</h3>
            <p className="text-xl font-black">{r.value}</p>
            <p className="text-sm italic mt-1">{r.player_name}</p>
          </div>
        )) : (
          <p className="col-span-full italic">No records found for this league.</p>
        )}
      </div>
    </div>
  );
}