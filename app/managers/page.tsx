"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function ManagersPage() {
  const [coaches, setCoaches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadCoaches() {
      setLoading(true);
      const { data, error } = await supabase
        .from('league_coaches')
        .select(`
          coach_id,
          coach_name,
          league_teams (
            team_id,
            team_name,
            abbreviation,
            logo_url
          )
        `)
        .order('coach_name', { ascending: true });

      if (error) {
        console.error("Error loading coaches:", error);
      } else {
        setCoaches(data || []);
      }
      setLoading(false);
    }
    loadCoaches();
  }, []);

  const filtered = coaches.filter(c => {
    const q = search.toLowerCase();
    const nameMatch = (c.coach_name || "").toLowerCase().includes(q);
    const teamMatch = (c.league_teams?.team_name || "").toLowerCase().includes(q);
    return !q || nameMatch || teamMatch;
  });

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-black font-serif p-3 sm:p-6">
      <header className="border-b-4 border-black pb-3 sm:pb-4 mb-4 sm:mb-6 text-center">
        <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter">Managers & Coaches</h1>
        <p className="text-xs font-bold uppercase italic mt-1">NHL95 League Staff & Front Office Directory</p>
      </header>

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center mb-4 sm:mb-6 border-b border-black pb-3 gap-3">
        <div className="text-xs font-bold uppercase tracking-wider">
          Total Registered Front Office: <span className="font-mono">{filtered.length}</span>
        </div>
        <input
          type="text"
          placeholder="SEARCH COACH OR TEAM..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-black px-3 py-1.5 text-xs font-bold uppercase bg-transparent w-full sm:w-64 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs font-bold uppercase italic text-gray-500">
          Loading Staff Directory...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-xs font-bold uppercase italic text-gray-500">
          No coaches or managers found.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div
              key={c.coach_id}
              className="border-2 border-black p-4 bg-[#fdfaf5] shadow-[3px_3px_0px_rgba(0,0,0,1)] flex items-center gap-4"
            >
              {c.league_teams?.logo_url ? (
                <img
                  src={c.league_teams.logo_url}
                  alt={c.league_teams.team_name}
                  className="w-14 h-14 object-contain shrink-0"
                />
              ) : (
                <div className="w-14 h-14 bg-black/5 border border-black/20 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                  NHL95
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-black uppercase truncate">{c.coach_name || "TBA"}</h2>
                <p className="text-xs font-bold text-slate-700 uppercase mt-0.5 truncate">
                  {c.league_teams?.team_name || "Free Agent / Unassigned"}
                </p>
                {c.league_teams?.team_id && (
                  <Link
                    href={`/team/${c.league_teams.team_id}`}
                    className="inline-block text-[10px] font-bold text-red-700 uppercase hover:underline mt-2"
                  >
                    View Team File &rarr;
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
