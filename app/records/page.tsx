"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

// ==========================================
// 1. LEAGUE & SEASON MAPPINGS WITH LOGOS
// ==========================================

const LEAGUES: { id: string; name: string; shortName: string; logoUrl?: string; fallbackUrl?: string }[] = [
  {
    id: 'ALL',
    name: 'All Leagues',
    shortName: 'ALL',
    logoUrl: ''
  },
  {
    id: 'W',
    name: 'W League',
    shortName: 'W',
    logoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/WN95HL.png',
    fallbackUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/WN95HL.png'
  },
  {
    id: 'Q',
    name: 'The Q',
    shortName: 'Q',
    logoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/TheQ.png',
    fallbackUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/TheQ.png'
  },
  {
    id: 'O',
    name: 'Original 6',
    shortName: 'O6',
    logoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/Original%206.png',
    fallbackUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Original%206.png'
  },
  {
    id: 'V',
    name: 'Vintage',
    shortName: 'V',
    logoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/Vintage.png',
    fallbackUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Vintage.png'
  },
  {
    id: 'G',
    name: 'Golden Era',
    shortName: 'G',
    logoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/Golden%20Era.png',
    fallbackUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Golden%20Era.png'
  }
];

const SEASON_TYPES: Record<number, string> = {
  1: 'W', 2: 'W', 3: 'W', 4: 'W', 5: 'Q', 6: 'W', 7: 'Q', 8: 'Q', 9: 'W', 10: 'Q',
  11: 'W', 12: 'Q', 13: 'Q', 14: 'W', 15: 'Q', 16: 'G', 17: 'Q', 18: 'W', 19: 'Q', 20: 'V',
  21: 'Q', 22: 'W', 23: 'Q', 24: 'W', 25: 'Q', 26: 'Q', 27: 'Q', 28: 'W', 29: 'Q', 30: 'Q',
  31: 'W', 32: 'Q', 33: 'W', 34: 'Q', 35: 'W', 36: 'Q', 37: 'W', 38: 'W', 39: 'O', 40: 'W'
};

const formatSeasonBadge = (seasonId: number | string) => {
  const numId = Number(seasonId);
  if (isNaN(numId) || numId <= 0) return String(seasonId || 'Career');
  const type = SEASON_TYPES[numId] || 'W';
  return `${type}${String(numId).padStart(2, '0')}`;
};

const SUB_CATEGORIES: Record<string, { id: string; label: string; unit: string; group: string; isSeasonHigh?: boolean; isGameHigh?: boolean }[]> = {
  points: [
    { id: 'total_points', label: 'Most Career Points', unit: 'PTS', group: 'points' },
    { id: 'max_season_points', label: 'Most Points, Single Season', unit: 'PTS', group: 'points', isSeasonHigh: true },
    { id: 'max_game_points', label: 'Most Points, Single Game', unit: 'PTS', group: 'points', isGameHigh: true }
  ],
  goals: [
    { id: 'total_goals', label: 'Most Career Goals', unit: 'Goals', group: 'goals' },
    { id: 'max_season_goals', label: 'Most Goals, Single Season', unit: 'Goals', group: 'goals', isSeasonHigh: true },
    { id: 'max_game_goals', label: 'Most Goals, Single Game', unit: 'Goals', group: 'goals', isGameHigh: true }
  ],
  assists: [
    { id: 'total_assists', label: 'Most Career Assists', unit: 'Assists', group: 'assists' },
    { id: 'max_season_assists', label: 'Most Assists, Single Season', unit: 'Assists', group: 'assists', isSeasonHigh: true },
    { id: 'max_game_assists', label: 'Most Assists, Single Game', unit: 'Assists', group: 'assists', isGameHigh: true }
  ],
  dominance: [
    { id: 'two_pt_games', label: 'Most 2+ Point Games', unit: 'Games', group: 'dominance' },
    { id: 'three_pt_games', label: 'Most 3+ Point Games', unit: 'Games', group: 'dominance' },
    { id: 'four_pt_games', label: 'Most 4+ Point Games', unit: 'Games', group: 'dominance' },
    { id: 'five_pt_games', label: 'Most 5+ Point Games', unit: 'Games', group: 'dominance' }
  ],
  games: [
    { id: 'total_games', label: 'Most Games Played, Career', unit: 'GP', group: 'games' },
    { id: 'total_shots', label: 'Most Career Shots on Goal', unit: 'SOG', group: 'games' },
    { id: 'total_pim', label: 'Most Career Penalty Minutes', unit: 'PIM', group: 'games' }
  ]
};

// Summary metrics to display on the quick single-line summary section
const SUMMARY_METRICS = [
  { id: 'total_points', label: 'Most Career Points', unit: 'PTS', group: 'points' },
  { id: 'total_goals', label: 'Most Career Goals', unit: 'Goals', group: 'goals' },
  { id: 'total_assists', label: 'Most Career Assists', unit: 'Assists', group: 'assists' },
  { id: 'max_season_points', label: 'Most Points, Single Season', unit: 'PTS', group: 'points' },
  { id: 'max_season_goals', label: 'Most Goals, Single Season', unit: 'Goals', group: 'goals' },
  { id: 'max_game_points', label: 'Most Points, Single Game', unit: 'PTS', group: 'points' },
  { id: 'two_pt_games', label: 'Most 2+ Point Games', unit: 'Games', group: 'dominance' },
  { id: 'five_pt_games', label: 'Most 5+ Point Games', unit: 'Games', group: 'dominance' },
  { id: 'total_games', label: 'Most Games Played', unit: 'GP', group: 'games' }
];

export default function RecordsPage() {
  const [selectedLeague, setSelectedLeague] = useState<string>('W');
  const [recordType, setRecordType] = useState<string>('points');
  const [specificRecord, setSpecificRecord] = useState<string>('total_points');

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [summaryList, setSummaryList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper to switch main category
  const handleRecordTypeChange = (newType: string) => {
    setRecordType(newType);
    const firstSubCat = SUB_CATEGORIES[newType]?.[0]?.id || 'total_points';
    setSpecificRecord(firstSubCat);
  };

  // Helper to switch specific record directly
  const handleSelectSpecificRecord = (recordId: string) => {
    setSpecificRecord(recordId);
    for (const [group, subs] of Object.entries(SUB_CATEGORIES)) {
      if (subs.some(s => s.id === recordId)) {
        setRecordType(group);
        break;
      }
    }
  };

  // 2. Fetch or Calculate Records from Supabase
  useEffect(() => {
    async function loadRecordsData() {
      setLoading(true);

      try {
        // Resolve season IDs for selected league
        const targetSeasonIds: number[] = [];
        for (const [sIdStr, lType] of Object.entries(SEASON_TYPES)) {
          const sId = Number(sIdStr);
          if (selectedLeague === 'ALL' || lType === selectedLeague) {
            targetSeasonIds.push(sId);
          }
        }

        // A. Attempt fetching from view_all_time_skater_records
        let viewData: any[] = [];
        try {
          let viewQuery = supabase.from('view_all_time_skater_records').select('*');
          if (selectedLeague !== 'ALL') {
            viewQuery = viewQuery.or(`league_id.eq.${selectedLeague},league_type.eq.${selectedLeague},league_id.in.(${targetSeasonIds.join(',')})`);
          }
          const { data: vRows, error: vErr } = await viewQuery.limit(500);
          if (!vErr && vRows && vRows.length > 0) {
            viewData = vRows;
          }
        } catch {
          viewData = [];
        }

        // B. Fetch detailed player stats from api_stats_with_names as source / fallback
        let statsQuery = supabase.from('api_stats_with_names').select('*');
        if (selectedLeague !== 'ALL') {
          statsQuery = statsQuery.in('league_id', targetSeasonIds);
        }
        const { data: rawStats } = await statsQuery;
        const allSeasonStats = rawStats || [];

        // Also fetch game single-game records from league_player_stats_master if possible
        let gameStatsMaster: any[] = [];
        try {
          const { data: gRows } = await supabase
            .from('league_player_stats_master')
            .select('player_id, player_name, goals, assists, points, shots, pim, game_id, team_id')
            .order('points', { ascending: false })
            .limit(500);
          gameStatsMaster = gRows || [];
        } catch { }

        // C. Aggregate Stats per Player
        const playerAggMap = new Map<string, any>();

        allSeasonStats.forEach((row: any) => {
          const pName = (row.player_name || '').trim();
          if (!pName) return;

          const pKey = row.player_id ? String(row.player_id) : pName.toLowerCase();
          const sPoints = Number(row.total_points ?? row.points ?? 0);
          const sGoals = Number(row.total_goals ?? row.goals ?? 0);
          const sAssists = Number(row.total_assists ?? row.assists ?? 0);
          const sGp = Number(row.gp ?? 0);
          const sShots = Number(row.shots ?? row.sog ?? 0);
          const sPim = Number(row.pim ?? 0);
          const sTwoPt = Number(row.two_pt_games ?? 0);
          const sThreePt = Number(row.three_pt_games ?? 0);
          const sFourPt = Number(row.four_pt_games ?? 0);
          const sFivePt = Number(row.five_pt_games ?? 0);
          const sLeagueId = Number(row.league_id);
          const sName = formatSeasonBadge(sLeagueId);
          const tName = row.team_name || 'Team';
          const tLogo = row.logo_url || '';

          if (!playerAggMap.has(pKey)) {
            playerAggMap.set(pKey, {
              player_id: row.player_id,
              player_name: pName,
              teams: [tName],
              team_logos: tLogo ? [tLogo] : [],
              first_season: sName,
              last_season: sName,
              seasons_played: [sLeagueId],
              total_points: sPoints,
              total_goals: sGoals,
              total_assists: sAssists,
              total_games: sGp,
              total_shots: sShots,
              total_pim: sPim,
              two_pt_games: sTwoPt,
              three_pt_games: sThreePt,
              four_pt_games: sFourPt,
              five_pt_games: sFivePt,
              max_season_points: sPoints,
              max_season_points_season: sName,
              max_season_goals: sGoals,
              max_season_goals_season: sName,
              max_season_assists: sAssists,
              max_season_assists_season: sName,
              max_game_points: 0,
              max_game_goals: 0,
              max_game_assists: 0
            });
          } else {
            const cur = playerAggMap.get(pKey);
            if (tName && !cur.teams.includes(tName)) cur.teams.push(tName);
            if (tLogo && !cur.team_logos.includes(tLogo)) cur.team_logos.push(tLogo);

            cur.total_points += sPoints;
            cur.total_goals += sGoals;
            cur.total_assists += sAssists;
            cur.total_games += sGp;
            cur.total_shots += sShots;
            cur.total_pim += sPim;
            cur.two_pt_games += sTwoPt;
            cur.three_pt_games += sThreePt;
            cur.four_pt_games += sFourPt;
            cur.five_pt_games += sFivePt;

            if (sPoints > cur.max_season_points) {
              cur.max_season_points = sPoints;
              cur.max_season_points_season = sName;
            }
            if (sGoals > cur.max_season_goals) {
              cur.max_season_goals = sGoals;
              cur.max_season_goals_season = sName;
            }
            if (sAssists > cur.max_season_assists) {
              cur.max_season_assists = sAssists;
              cur.max_season_assists_season = sName;
            }

            cur.seasons_played.push(sLeagueId);
            const minS = Math.min(...cur.seasons_played);
            const maxS = Math.max(...cur.seasons_played);
            cur.first_season = formatSeasonBadge(minS);
            cur.last_season = formatSeasonBadge(maxS);
          }
        });

        // Attach single game highs if available
        gameStatsMaster.forEach((gm: any) => {
          const gmName = (gm.player_name || '').trim();
          const pKey = gm.player_id ? String(gm.player_id) : gmName.toLowerCase();
          const gPts = Number(gm.points ?? ((gm.goals || 0) + (gm.assists || 0)));
          const gGoals = Number(gm.goals || 0);
          const gAssists = Number(gm.assists || 0);

          if (playerAggMap.has(pKey)) {
            const cur = playerAggMap.get(pKey);
            if (gPts > cur.max_game_points) cur.max_game_points = gPts;
            if (gGoals > cur.max_game_goals) cur.max_game_goals = gGoals;
            if (gAssists > cur.max_game_assists) cur.max_game_assists = gAssists;
          }
        });

        // Convert Map to array
        const aggregatedList = Array.from(playerAggMap.values());

        // Helper to get formatted value & record season for any metric
        const getMetricRecordList = (metricKey: string) => {
          const isSeasonStat = metricKey.startsWith('max_season_');
          const isGameStat = metricKey.startsWith('max_game_');

          const list = [...aggregatedList].filter(p => (Number(p[metricKey]) || 0) > 0);

          list.sort((a, b) => (Number(b[metricKey]) || 0) - (Number(a[metricKey]) || 0));

          return list.map((row, idx) => {
            let recordSeason = 'Career';
            if (isSeasonStat) {
              recordSeason = row[`${metricKey}_season`] || row.last_season || 'Season';
            } else if (isGameStat) {
              recordSeason = row.last_season || 'Single Game';
            } else {
              recordSeason = `${row.first_season} - ${row.last_season}`;
            }

            return {
              rank: idx + 1,
              player_name: row.player_name,
              teams: Array.isArray(row.teams) ? row.teams.join(', ') : (row.teams || 'Team'),
              team_logo: row.team_logos?.[0] || '',
              value: row[metricKey] ?? 0,
              record_season: recordSeason,
              first_season: row.first_season,
              last_season: row.last_season
            };
          });
        };

        // D. Build Leaderboard for Current Specific Record (strictly Top 10)
        const currentRanked = getMetricRecordList(specificRecord).slice(0, 10);
        setLeaderboard(currentRanked);

        // E. Build Summary Cards across all key metrics
        const summaries = SUMMARY_METRICS.map(m => {
          const topList = getMetricRecordList(m.id);
          const topOne = topList[0] || null;

          return {
            id: m.id,
            label: m.label,
            unit: m.unit,
            group: m.group,
            holder: topOne?.player_name || 'No Record',
            teams: topOne?.teams || '-',
            team_logo: topOne?.team_logo || '',
            value: topOne?.value ?? 0,
            record_season: topOne?.record_season || 'Career'
          };
        });

        setSummaryList(summaries);

      } catch (err) {
        console.error("Error loading records:", err);
      } finally {
        setLoading(false);
      }
    }

    loadRecordsData();
  }, [selectedLeague, specificRecord]);

  // Current active sub-category definition
  const currentCategoryDef = useMemo(() => {
    for (const group of Object.values(SUB_CATEGORIES)) {
      const match = group.find(s => s.id === specificRecord);
      if (match) return match;
    }
    return { id: specificRecord, label: 'League Record', unit: 'PTS', group: 'points' };
  }, [specificRecord]);

  // Top #1 Record Holder for the active specific record
  const topRecordHolder = useMemo(() => {
    if (leaderboard.length === 0) return null;
    return leaderboard[0];
  }, [leaderboard]);

  const activeLeagueObj = useMemo(() => {
    return LEAGUES.find(l => l.id === selectedLeague) || LEAGUES[1];
  }, [selectedLeague]);

  const leagueName = activeLeagueObj.name || `${selectedLeague} League`;

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-black font-serif p-4 sm:p-8">

      {/* 1. Header & League Switcher */}
      <header className="border-b-4 border-black pb-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter">
                League Record Book
              </h1>
              <span className="bg-black text-white px-2.5 py-0.5 text-xs font-black uppercase rounded">
                {selectedLeague === 'ALL' ? 'ALL-TIME' : `${selectedLeague} LEAGUE`}
              </span>
            </div>
            <p className="text-xs font-bold uppercase italic text-gray-700 mt-1">
              Official Historical Gazette Record Archive & All-Time Top 10 Leaderboards
            </p>
          </div>

          {/* League Selector Tabs with League Logos */}
          <div className="flex flex-wrap items-center gap-2 bg-white border-2 border-black p-1.5 shadow-sm self-start md:self-center rounded-xs">
            {LEAGUES.map((l) => {
              const isSelected = selectedLeague === l.id;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setSelectedLeague(l.id)}
                  title={l.name}
                  className={`h-12 px-3 flex items-center justify-center transition cursor-pointer border-2 rounded-xs ${isSelected
                      ? 'bg-black text-white border-black shadow-sm ring-2 ring-yellow-400'
                      : 'bg-[#faf8f5] text-black border-neutral-300 hover:border-black hover:bg-neutral-100'
                    }`}
                >
                  {l.logoUrl ? (
                    <img
                      src={l.logoUrl}
                      alt={l.name}
                      className="h-8 max-w-[48px] object-contain"
                      onError={(e) => {
                        if (l.fallbackUrl && (e.currentTarget as HTMLImageElement).src !== l.fallbackUrl) {
                          (e.currentTarget as HTMLImageElement).src = l.fallbackUrl;
                        }
                      }}
                    />
                  ) : (
                    <span className={`text-xs font-black uppercase tracking-wider px-1 ${isSelected ? 'text-yellow-400 font-black' : 'text-black'
                      }`}>
                      ALL
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Category Buttons & Selectors */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 bg-white border-2 border-black p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black uppercase text-gray-600 mr-2">Category:</span>
            {[
              { id: 'points', label: 'Points' },
              { id: 'goals', label: 'Goals' },
              { id: 'assists', label: 'Assists' },
              { id: 'dominance', label: 'Dominance (Multi-Pt)' },
              { id: 'games', label: 'Games & Milestones' }
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleRecordTypeChange(cat.id)}
                className={`px-3 py-1 text-xs font-black uppercase border border-black rounded transition cursor-pointer ${recordType === cat.id
                    ? 'bg-black text-white'
                    : 'bg-[#faf8f5] text-black hover:bg-gray-100'
                  }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-grow max-w-sm">
            <label className="text-xs font-black uppercase text-gray-600 shrink-0">Stat Record:</label>
            <select
              value={specificRecord}
              onChange={(e) => handleSelectSpecificRecord(e.target.value)}
              className="bg-[#f4f1ea] border-2 border-black text-xs p-1.5 font-black uppercase flex-grow cursor-pointer outline-none"
            >
              {SUB_CATEGORIES[recordType]?.map((sub) => (
                <option key={sub.id} value={sub.id}>{sub.label}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* ==================================================== */}
      {/* 2. TOP RECORD: SINGLE-LINE SUMMARY BANNER            */}
      {/* ==================================================== */}
      <section className="mb-8">
        <div className="bg-black text-white border-4 border-black p-4 sm:p-6 shadow-md rounded-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left: Stat & Holder Details */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-yellow-400 text-black border-2 border-black flex flex-col items-center justify-center font-black rounded shrink-0 shadow-inner">
                <span className="text-[9px] uppercase tracking-widest leading-none">RANK</span>
                <span className="text-xl sm:text-2xl font-mono leading-none mt-0.5">#1</span>
              </div>

              <div>
                <div className="flex items-center gap-2 text-xs font-black uppercase text-yellow-300 tracking-wider">
                  {activeLeagueObj.logoUrl && (
                    <img
                      src={activeLeagueObj.logoUrl}
                      alt={activeLeagueObj.name}
                      className="h-4 w-auto object-contain bg-white/20 p-0.5 rounded"
                    />
                  )}
                  <span>{currentCategoryDef.label} • {leagueName}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mt-0.5">
                  {topRecordHolder ? topRecordHolder.player_name : (loading ? 'Loading Record...' : 'No Record Established')}
                </div>
                <div className="text-xs font-bold text-gray-300 uppercase mt-0.5 flex flex-wrap items-center gap-2">
                  <span>Teams: {topRecordHolder?.teams || '-'}</span>
                  <span>•</span>
                  <span className="text-yellow-200">Scope: {topRecordHolder?.record_season || 'Career'}</span>
                </div>
              </div>
            </div>

            {/* Right: Record Value Badge */}
            <div className="text-left md:text-right bg-neutral-900 border border-neutral-700 px-5 py-3 rounded self-start md:self-center">
              <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                ALL-TIME HIGH RECORD
              </div>
              <div className="text-3xl sm:text-4xl font-mono font-black text-yellow-400">
                {topRecordHolder ? topRecordHolder.value : 0}{' '}
                <span className="text-base font-sans font-black text-white">{currentCategoryDef.unit}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================== */}
      {/* 3. RANKED TOP 10 LEADERBOARD TABLE                   */}
      {/* ==================================================== */}
      <section className="mb-10">
        <div className="bg-white border-2 border-black shadow-sm p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-black pb-3 mb-4 gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                {activeLeagueObj.logoUrl && (
                  <img
                    src={activeLeagueObj.logoUrl}
                    alt={activeLeagueObj.name}
                    className="h-6 w-auto object-contain"
                  />
                )}
                <span>{currentCategoryDef.label} — Top 10 Leaderboard ({leagueName})</span>
              </h2>
              <p className="text-xs font-bold uppercase italic text-gray-600 mt-0.5">
                All-time top 10 historical record holders in {leagueName}.
              </p>
            </div>
            <span className="text-xs font-black uppercase text-black bg-yellow-300 px-2.5 py-1 border border-black rounded">
              Top 10 Leaders
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-black text-white uppercase text-[10px] font-black">
                  <th className="py-3 px-3 border-r border-neutral-800 w-14 text-center">Rank</th>
                  <th className="py-3 px-3 border-r border-neutral-800">Player</th>
                  <th className="py-3 px-3 border-r border-neutral-800">Teams</th>
                  <th className="py-3 px-3 text-center bg-neutral-900 border-r border-neutral-800 w-28">
                    {currentCategoryDef.unit}
                  </th>
                  <th className="py-3 px-3 text-center border-r border-neutral-800 w-36">Record Scope</th>
                  <th className="py-3 px-3 text-center border-r border-neutral-800 w-24">First</th>
                  <th className="py-3 px-3 text-center w-24">Last</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs font-bold uppercase italic text-neutral-500 animate-pulse">
                      Retrieving all-time record archives...
                    </td>
                  </tr>
                ) : leaderboard.length > 0 ? (
                  leaderboard.map((r, index) => {
                    const isFirst = r.rank === 1;
                    return (
                      <tr
                        key={index}
                        className={`transition font-bold ${isFirst
                            ? 'bg-yellow-100 font-black hover:bg-yellow-200'
                            : index % 2 === 0 ? 'bg-gray-50 hover:bg-yellow-50' : 'bg-white hover:bg-yellow-50'
                          }`}
                      >
                        <td className="py-3 px-3 border-r border-black/20 text-center font-mono font-black">
                          {isFirst ? (
                            <span className="bg-black text-yellow-400 px-1.5 py-0.5 rounded text-[11px]">
                              #1
                            </span>
                          ) : (
                            <span className="text-gray-700">#{r.rank}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 border-r border-black/20 uppercase font-black text-black">
                          <div className="flex items-center gap-2">
                            {r.team_logo && (
                              <img src={r.team_logo} alt="Team" className="w-4 h-4 object-contain flex-shrink-0" />
                            )}
                            <span className={isFirst ? 'text-black font-black' : 'text-blue-900'}>
                              {r.player_name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 border-r border-black/20 text-xs font-mono truncate max-w-xs text-gray-700">
                          {r.teams}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-black border-r border-black/20 bg-blue-50/60 text-red-700 text-sm">
                          {r.value}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-xs font-mono border-r border-black/20 bg-neutral-50">
                          {r.record_season}
                        </td>
                        <td className="py-3 px-3 text-center text-xs font-mono border-r border-black/20 text-gray-600">
                          {r.first_season}
                        </td>
                        <td className="py-3 px-3 text-center text-xs font-mono text-gray-600">
                          {r.last_season}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs font-bold uppercase italic text-neutral-500">
                      No records found for {leagueName}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ==================================================== */}
      {/* 4. ALL CATEGORIES: SINGLE-LINE SUMMARY DIRECTORY    */}
      {/* ==================================================== */}
      <section className="mb-10">
        <div className="bg-white border-2 border-black shadow-sm p-4 sm:p-6">
          <div className="border-b-2 border-black pb-3 mb-4">
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight flex items-center gap-2">
              {activeLeagueObj.logoUrl && (
                <img
                  src={activeLeagueObj.logoUrl}
                  alt={activeLeagueObj.name}
                  className="h-5 w-auto object-contain"
                />
              )}
              <span>All-Time Single-Line Summary ({leagueName})</span>
            </h2>
            <p className="text-xs font-bold uppercase italic text-gray-600 mt-0.5">
              Click any record below to switch the active top 10 leaderboard above.
            </p>
          </div>

          <div className="divide-y divide-black/20 border border-black/20">
            {summaryList.map((item, idx) => {
              const isSelected = item.id === specificRecord;
              return (
                <div
                  key={idx}
                  onClick={() => handleSelectSpecificRecord(item.id)}
                  className={`flex flex-col md:flex-row items-start md:items-center justify-between p-3.5 transition cursor-pointer gap-3 ${isSelected ? 'bg-yellow-200 font-black' : 'hover:bg-yellow-50 bg-white'
                    }`}
                >
                  {/* Metric Label */}
                  <div className="w-full md:w-1/3 font-black uppercase text-xs text-black flex items-center gap-2">
                    {isSelected && <span className="text-red-700 font-black">&bull;</span>}
                    <span>{item.label}</span>
                  </div>

                  {/* Holder & Value */}
                  <div className="w-full md:w-1/3 flex items-center gap-3">
                    {item.team_logo && (
                      <img src={item.team_logo} alt="Logo" className="w-4 h-4 object-contain flex-shrink-0" />
                    )}
                    <span className="font-black text-black text-sm uppercase">
                      {item.holder}
                    </span>
                    <span className="bg-black text-yellow-400 px-2 py-0.5 font-mono font-black text-xs rounded">
                      {item.value} {item.unit}
                    </span>
                    <span className="text-[10px] font-mono text-gray-600 uppercase">
                      ({item.record_season})
                    </span>
                  </div>

                  {/* Action Link */}
                  <div className="w-full md:w-auto text-right">
                    <span className={`text-xs font-black uppercase tracking-wider ${isSelected ? 'text-black underline' : 'text-blue-700 hover:underline'
                      }`}>
                      {isSelected ? 'Currently Viewing' : 'View Top 10 &rarr;'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer Return Link */}
      <div className="pt-4 border-t-2 border-black flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-bold uppercase text-gray-600">
        <Link href="/team" className="bg-black text-white px-4 py-2 font-black uppercase hover:bg-neutral-800 transition">
          &larr; Return to Teams
        </Link>
        <span className="italic">
          Official NHL95 Gazette Record Book Archive
        </span>
      </div>

    </div>
  );
}