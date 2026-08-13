"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function RecordsPage() {
  const [selectedLeague, setSelectedLeague] = useState<string>('W');
  const [viewMode, setViewMode] = useState<'ranked' | 'summary'>('ranked');
  const [recordType, setRecordType] = useState<string>('points');
  const [specificRecord, setSpecificRecord] = useState<string>('total_points');

  const [records, setRecords] = useState<any[]>([]);
  const [allTimeSummary, setAllTimeSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const LEAGUES = [
    { id: 'W', name: 'W League' },
    { id: 'Q', name: 'Q League' },
    { id: 'O', name: 'O League' },
    { id: 'V', name: 'V League' }
  ];

  const SUB_CATEGORIES: Record<string, { id: string; label: string; orderBy: string; statKey: string }[]> = {
    points: [
      { id: 'total_points', label: 'Most Career Points', orderBy: 'total_points', statKey: 'total_points' },
      { id: 'max_season_points', label: 'Most Points, Single Season', orderBy: 'max_season_points', statKey: 'max_season_points' },
      { id: 'max_game_points', label: 'Most Points, Single Game', orderBy: 'max_game_points', statKey: 'max_game_points' }
    ],
    goals: [
      { id: 'total_goals', label: 'Most Career Goals', orderBy: 'total_goals', statKey: 'total_goals' },
      { id: 'max_season_goals', label: 'Most Goals, Single Season', orderBy: 'max_season_goals', statKey: 'max_season_goals' },
      { id: 'max_game_goals', label: 'Most Goals, Single Game', orderBy: 'max_game_goals', statKey: 'max_game_goals' }
    ],
    assists: [
      { id: 'total_assists', label: 'Most Career Assists', orderBy: 'total_assists', statKey: 'total_assists' },
      { id: 'max_season_assists', label: 'Most Assists, Single Season', orderBy: 'max_season_assists', statKey: 'max_season_assists' },
      { id: 'max_game_assists', label: 'Most Assists, Single Game', orderBy: 'max_game_assists', statKey: 'max_game_assists' }
    ],
    dominance: [
      { id: 'two_pt_games', label: 'Most 2+ Point Games (Dominance)', orderBy: 'two_pt_games', statKey: 'two_pt_games' },
      { id: 'three_pt_games', label: 'Most 3+ Point Games (Dominance)', orderBy: 'three_pt_games', statKey: 'three_pt_games' },
      { id: 'four_pt_games', label: 'Most 4+ Point Games (Dominance)', orderBy: 'four_pt_games', statKey: 'four_pt_games' },
      { id: 'five_pt_games', label: 'Most 5+ Point Games (Dominance)', orderBy: 'five_pt_games', statKey: 'five_pt_games' }
    ],
    games: [
      { id: 'total_games', label: 'Most Games Played, Career', orderBy: 'total_games', statKey: 'total_games' }
    ]
  };

  const handleRecordTypeChange = (newType: string) => {
    setRecordType(newType);
    const firstSubCat = SUB_CATEGORIES[newType]?.[0]?.id || '';
    setSpecificRecord(firstSubCat);
  };

  useEffect(() => {
    async function fetchRecordData() {
      setLoading(true);

      if (viewMode === 'ranked') {
        const currentCategory = SUB_CATEGORIES[recordType]?.find(item => item.id === specificRecord);
        const orderByColumn = currentCategory ? currentCategory.orderBy : 'total_points';
        const statKey = currentCategory ? currentCategory.statKey : 'total_points';

        const { data, error } = await supabase
          .from('view_all_time_skater_records')
          .select('*')
          .ilike('league_id', selectedLeague)
          .order(orderByColumn, { ascending: false })
          .limit(25);

        if (error) {
          console.error("Error fetching ranked records:", JSON.stringify(error, null, 2));
          setRecords([]);
        } else {
          const formatted = (data || []).map((row, index) => ({
            rank: index + 1,
            player_name: row.player_name,
            teams: row.teams,
            value: row[statKey],
            record_season: specificRecord.includes('season') || specificRecord.includes('game') ? row.best_season_name : 'Career',
            first_season: row.first_season,
            last_season: row.last_season
          }));
          setRecords(formatted);
        }
      } else {
        const categoriesToFetch = [
          { key: 'total_points', label: 'Most Career Points', sort: 'total_points' },
          { key: 'total_goals', label: 'Most Career Goals', sort: 'total_goals' },
          { key: 'total_assists', label: 'Most Career Assists', sort: 'total_assists' },
          { key: 'max_season_points', label: 'Most Points, Single Season', sort: 'max_season_points' },
          { key: 'max_game_points', label: 'Most Points, Single Game', sort: 'max_game_points' },
          { key: 'two_pt_games', label: 'Most 2+ Point Games', sort: 'two_pt_games' },
          { key: 'five_pt_games', label: 'Most 5+ Point Games', sort: 'five_pt_games' }
        ];

        const summaryResults = await Promise.all(
          categoriesToFetch.map(async (cat) => {
            const { data, error } = await supabase
              .from('view_all_time_skater_records')
              .select('*')
              .ilike('league_id', selectedLeague)
              .order(cat.sort, { ascending: false })
              .limit(1);

            const topRow = data?.[0];

            if (error || !topRow) {
              return {
                label: cat.label,
                metricKey: cat.key,
                holder: 'No Record',
                value: 0
              };
            }

            return {
              label: cat.label,
              metricKey: cat.key,
              holder: topRow.player_name || 'Unknown',
              value: topRow[cat.sort] ?? 0
            };
          })
        );

        setAllTimeSummary(summaryResults);
      }

      setLoading(false);
    }

    fetchRecordData();
  }, [selectedLeague, viewMode, recordType, specificRecord]);

  const currentTitle = SUB_CATEGORIES[recordType]?.find(item => item.id === specificRecord)?.label || 'League Records';

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-black font-serif p-8">

      {/* Header & League Switcher */}
      <header className="border-b-4 border-black pb-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">League Record Book</h1>

          {/* League Tabs (W, V, Q, O) */}
          <div className="flex space-x-1 bg-white border border-black p-1 shadow-sm">
            {LEAGUES.map((l) => (
              <button
                key={l.id}
                onClick={() => setSelectedLeague(l.id)}
                className={`px-4 py-1.5 font-bold uppercase text-sm transition ${selectedLeague === l.id
                  ? 'bg-black text-white'
                  : 'bg-transparent text-black hover:bg-neutral-100'
                  }`}
              >
                {l.name}
              </button>
            ))}
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="mt-6 flex space-x-4 border-b border-black pb-3">
          <button
            onClick={() => setViewMode('ranked')}
            className={`text-sm font-bold uppercase tracking-wider pb-1 border-b-2 transition ${viewMode === 'ranked' ? 'border-red-700 text-red-700' : 'border-transparent text-neutral-600 hover:text-black'
              }`}
          >
            Ranked Leaderboards
          </button>
          <button
            onClick={() => setViewMode('summary')}
            className={`text-sm font-bold uppercase tracking-wider pb-1 border-b-2 transition ${viewMode === 'summary' ? 'border-red-700 text-red-700' : 'border-transparent text-neutral-600 hover:text-black'
              }`}
          >
            Single-Line Summary
          </button>
        </div>

        {/* Filters (Only active in Ranked mode) */}
        {viewMode === 'ranked' && (
          <div className="mt-6 flex flex-wrap items-center gap-6 bg-white border border-black p-4 shadow-sm">
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold uppercase tracking-wider">Record Type:</label>
              <select
                value={recordType}
                onChange={(e) => handleRecordTypeChange(e.target.value)}
                className="bg-[#f4f1ea] border border-black text-sm p-1.5 font-bold uppercase cursor-pointer"
              >
                <option value="points">Points</option>
                <option value="goals">Goals</option>
                <option value="assists">Assists</option>
                <option value="dominance">Dominance (Multi-Point Games)</option>
                <option value="games">Seasons & Games</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 flex-grow max-w-md">
              <label className="text-xs font-bold uppercase tracking-wider">Record:</label>
              <select
                value={specificRecord}
                onChange={(e) => setSpecificRecord(e.target.value)}
                className="bg-[#f4f1ea] border border-black text-sm p-1.5 font-bold uppercase flex-grow cursor-pointer"
              >
                {SUB_CATEGORIES[recordType]?.map((sub) => (
                  <option key={sub.id} value={sub.id}>{sub.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </header>

      {/* Conditional Rendering */}
      {viewMode === 'ranked' ? (
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight mb-4">{currentTitle} ({selectedLeague} League)</h2>

          <div className="bg-white border border-black overflow-x-auto shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black text-white text-xs uppercase tracking-wider">
                  <th className="py-3 px-4 border-r border-neutral-800 w-16">Rank</th>
                  <th className="py-3 px-4 border-r border-neutral-800">Player</th>
                  <th className="py-3 px-4 border-r border-neutral-800">Teams</th>
                  <th className="py-3 px-4 text-center bg-neutral-900 border-r border-neutral-800 w-32">Stat</th>
                  <th className="py-3 px-4 text-center border-r border-neutral-800 w-36">Record Season</th>
                  <th className="py-3 px-4 text-center border-r border-neutral-800 w-28">First Season</th>
                  <th className="py-3 px-4 text-center w-28">Last Season</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center italic text-neutral-500">Loading league records...</td>
                  </tr>
                ) : records.length > 0 ? (
                  records.map((r, index) => (
                    <tr key={index} className="hover:bg-neutral-50 transition">
                      <td className="py-3 px-4 border-r border-black font-bold">{r.rank}</td>
                      <td className="py-3 px-4 border-r border-black font-bold text-blue-900 hover:underline cursor-pointer">{r.player_name}</td>
                      <td className="py-3 px-4 border-r border-black text-xs font-mono truncate max-w-xs">{r.teams}</td>
                      <td className="py-3 px-4 text-center font-black bg-blue-50/50 border-r border-black text-red-700 text-base">{r.value}</td>
                      <td className="py-3 px-4 text-center font-bold text-xs font-mono border-r border-black bg-neutral-50">{r.record_season}</td>
                      <td className="py-3 px-4 text-center text-xs font-mono border-r border-black">{r.first_season}</td>
                      <td className="py-3 px-4 text-center text-xs font-mono">{r.last_season}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center italic text-neutral-500">No records found for {selectedLeague} league.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight mb-4">All-Time Record Summary ({selectedLeague} League)</h2>

          <div className="bg-white border border-black shadow-sm">
            <div className="divide-y divide-black">
              {loading ? (
                <div className="p-8 text-center italic text-neutral-500">Loading summary view...</div>
              ) : allTimeSummary.map((item, index) => {
                const parentGroupKey = Object.keys(SUB_CATEGORIES).find(groupKey =>
                  SUB_CATEGORIES[groupKey].some(sc => sc.id === item.metricKey)
                ) || 'points';

                return (
                  <div key={index} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 hover:bg-neutral-50 transition gap-4">
                    <div className="w-full md:w-1/3 font-bold uppercase text-sm">{item.label}</div>
                    <div className="w-full md:w-1/3 flex items-center space-x-3">
                      <span className="font-black text-blue-950 text-base">{item.holder}</span>
                      <span className="bg-blue-50 text-red-700 px-2 py-0.5 font-black text-xs border border-blue-200">{item.value}</span>
                    </div>
                    <div className="w-full md:w-auto text-right">
                      <button
                        onClick={() => {
                          setViewMode('ranked');
                          setRecordType(parentGroupKey);
                          setSpecificRecord(item.metricKey);
                        }}
                        className="text-xs font-bold uppercase tracking-wider text-blue-600 hover:underline"
                      >
                        View All Trailing Players &rarr;
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}