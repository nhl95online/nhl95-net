"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  31: 'W', 32: 'Q', 33: 'W', 34: 'Q', 35: 'W', 36: 'Q', 37: 'W', 38: 'W', 39: 'O', 40: 'W',
  41: 'W', 42: 'W', 43: 'W', 44: 'W', 45: 'W', 46: 'W', 47: 'W', 48: 'W', 49: 'W', 50: 'W',
  51: 'W', 52: 'W', 53: 'W', 54: 'O', 55: 'O', 56: 'O', 57: 'O', 58: 'O', 59: 'O', 60: 'O'
};

const SEASON_LABELS: Record<number, string> = {
  1: 'W01', 2: 'W02', 3: 'W03', 4: 'W04', 5: 'Q01', 6: 'W05', 7: 'Q02', 8: 'Q03', 9: 'W06', 10: 'Q04',
  11: 'W07', 12: 'Q05', 13: 'Q06', 14: 'W08', 15: 'Q07', 16: 'G01', 17: 'Q08', 18: 'W09', 19: 'Q09', 20: 'V01',
  21: 'Q10', 22: 'W10', 23: 'Q11', 24: 'W11', 25: 'Q12', 26: 'Q13', 27: 'Q14', 28: 'W12', 29: 'Q15', 30: 'Q16',
  31: 'W13', 32: 'Q17', 33: 'W14', 34: 'Q18', 35: 'W15', 36: 'Q19', 37: 'W16', 38: 'W17', 39: 'O01', 40: 'W18',
  41: 'W19', 42: 'W20', 43: 'W21', 44: 'W22', 45: 'W23', 46: 'W24', 47: 'W25', 48: 'W26', 49: 'W27', 50: 'W28',
  51: 'W29', 52: 'W30', 53: 'W31', 54: 'O02', 55: 'O03', 56: 'O04', 57: 'O05', 58: 'O06', 59: 'O07', 60: 'O08'
};

const getLeaguePrefix = (seasonId: number | string, seasonName?: string): string => {
  if (seasonName) {
    const trimmed = String(seasonName).trim().toUpperCase();
    if (trimmed.includes('ORIGINAL') || trimmed.startsWith('O6') || trimmed.startsWith('O')) return 'O';
    if (trimmed.includes('THE Q') || trimmed.startsWith('Q')) return 'Q';
    if (trimmed.includes('VINTAGE') || trimmed.startsWith('V')) return 'V';
    if (trimmed.includes('GOLDEN') || trimmed.startsWith('G')) return 'G';
    if (trimmed.includes('W LEAGUE') || trimmed.startsWith('W')) return 'W';
    const match = trimmed.match(/^[A-Z]+/);
    if (match && match[0]) return match[0];
  }
  const numId = Number(seasonId);
  if (!isNaN(numId) && SEASON_TYPES[numId]) return SEASON_TYPES[numId];
  return 'W';
};

const formatSeasonBadge = (seasonId: number | string, seasonNameMap?: Map<number, string>): string => {
  const numId = Number(seasonId);
  if (isNaN(numId) || numId <= 0) return String(seasonId || 'Career');
  if (SEASON_LABELS[numId]) return SEASON_LABELS[numId];
  const rawName = seasonNameMap?.get(numId);
  if (rawName) {
    const trimmed = rawName.trim();
    const match = trimmed.match(/^([A-Za-z]+)\s*(\d+)$/);
    if (match) {
      return `${match[1].toUpperCase()}${match[2].padStart(2, '0')}`;
    }
    if (/^[A-Za-z]\d+$/i.test(trimmed)) {
      return trimmed.toUpperCase();
    }
  }
  const type = getLeaguePrefix(numId, rawName);
  return `${type}${String(numId).padStart(2, '0')}`;
};

const DISPLAY_NAME_OVERRIDES: Record<string, string> = {
  'Martin St.Louis': 'Martin St. Louis',
  'P.A. Parenteau': 'P.A. Parenteau',
  'P.K. Subban': 'P.K. Subban',
  'T.J. Oshie': 'T.J. Oshie',
  'T.J. Brodie': 'T.J. Brodie',
  'J.T. Miller': 'J.T. Miller'
};

// Normalize player name so all entries of the same player across all seasons/ROMs/IDs merge into one
const normalizePlayerKey = (name: string): string => {
  const cleaned = String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[.'’`\-_,]/g, ' ')
    .replace(/\s+/g, ' ');

  if (!cleaned) return '';

  const fullOverride: Record<string, string> = {
    'p a parenteau': 'paparenteau',
    'pierre alexandre parenteau': 'paparenteau',
    'pa parenteau': 'paparenteau',
    't j brodie': 'tjbrodie',
    'tj brodie': 'tjbrodie',
    't j oshie': 'tjoshie',
    'tj oshie': 'tjoshie',
    'p k subban': 'pksubban',
    'pk subban': 'pksubban',
    'j t miller': 'jtmiller',
    'jt miller': 'jtmiller',
    'jean sebastien giguere': 'jsgiguere',
    'j s giguere': 'jsgiguere',
    'js giguere': 'jsgiguere',
    'marc andre fleury': 'marcandrefleury',
    'marc edouard vlasic': 'marcedouardvlasic',
    'john ross roach': 'johnrossroach',
    'charley mcveigh': 'charliemcveigh',
    'charlie mcveigh': 'charliemcveigh',
    'martin st louis': 'martinstlouis'
  };
  if (fullOverride[cleaned]) return fullOverride[cleaned];

  const parts = cleaned.split(' ').filter(Boolean);
  if (parts.length < 2) return cleaned.replace(/[^a-z0-9]/g, '');

  const firstMap: Record<string, string> = {
    alexander: 'alex',
    michael: 'mike',
    matthew: 'matt',
    christopher: 'chris',
    nicholas: 'nick',
    daniel: 'dan',
    steven: 'steve',
    stephen: 'steve',
    anthony: 'tony',
    thomas: 'tom',
    william: 'bill',
    robert: 'bob',
    edward: 'ed',
    joseph: 'joe',
    zachary: 'zach',
    bradley: 'brad',
    patrick: 'pat',
    samuel: 'sam',
    benjamin: 'ben',
    jonathan: 'jon',
    evgeny: 'evgeni'
  };
  const first = firstMap[parts[0]] || parts[0];
  return `${first}${parts.slice(1).join('')}`.replace(/[^a-z0-9]/g, '');
};

const isInvalidPlayerName = (name: string): boolean => {
  const c = String(name || '').trim();
  if (!c || c === '--' || c === '-') return true;
  const low = c.toLowerCase();
  if (
    low === 'n/a' ||
    low === 'unknown' ||
    low === 'unknown player' ||
    low === 'goalie' ||
    low === 'skater' ||
    low === 'player' ||
    low === 'none' ||
    /^player\s*#?\d+$/i.test(c) ||
    /^skater\s*#?\d+$/i.test(c) ||
    /^goalie\s*#?\d+$/i.test(c)
  ) {
    return true;
  }
  return false;
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
  const [teamRecordWatch, setTeamRecordWatch] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [masterEnriched, setMasterEnriched] = useState<boolean>(false);

  const archiveCacheRef = useRef<{
    loaded: boolean;
    masterLoaded: boolean;
    masterLoadingPromise: Promise<void> | null;
    apiRows: any[];
    masterRows: any[];
    teamsData: any[];
    leaguesData: any[];
    coachesData: any[];
    standingsData: any[];
    playerNameById: Map<number, string>;
    seasonPidToMeta: Map<string, { name: string; teamId: number }>;
  } | null>(null);

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

  // 2. Fetch or Calculate Records from Supabase across ALL seasons
  useEffect(() => {
    let cancelled = false;

    async function fetchAllPaginated(
      table: string,
      selectCols = '*',
      waveSize = 5,
      maxRows = 60000,
      applyFilter?: (q: any) => any
    ): Promise<any[]> {
      const all: any[] = [];
      const pageSize = 1000;
      let offset = 0;

      const fetchPageWithRetry = async (from: number, to: number): Promise<{ data: any[] | null; done: boolean }> => {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            let query: any = supabase.from(table).select(selectCols);
            if (applyFilter) {
              query = applyFilter(query);
            }
            const res = await query.range(from, to);
            if (!res.error && Array.isArray(res.data)) {
              return { data: res.data, done: res.data.length < pageSize };
            }
            const errCode = String((res.error as any)?.code || (res.error as any)?.status || '');
            const errMsg = String((res.error as any)?.message || '');
            if (errCode === '416' || errCode === 'PGRST103' || errMsg.includes('Range Not Satisfiable')) {
              return { data: [], done: true };
            }
          } catch {
            // retry on transient network error
          }
          await new Promise((r) => setTimeout(r, 120 * (attempt + 1)));
        }
        return { data: [], done: true };
      };

      while (offset < maxRows) {
        const promises: Promise<{ data: any[] | null; done: boolean }>[] = [];
        for (let i = 0; i < waveSize && offset + i * pageSize < maxRows; i++) {
          const from = offset + i * pageSize;
          const to = from + pageSize - 1;
          promises.push(fetchPageWithRetry(from, to));
        }

        const results = await Promise.all(promises);
        let reachedEnd = false;
        for (const res of results) {
          if (res.data && res.data.length > 0) {
            all.push(...res.data);
          }
          if (res.done || !res.data || res.data.length < pageSize) {
            reachedEnd = true;
            break;
          }
        }
        if (reachedEnd) break;
        offset += waveSize * pageSize;
      }

      return all;
    }

    async function ensureArchiveLoaded() {
      if (archiveCacheRef.current?.loaded) {
        return archiveCacheRef.current;
      }

      const [
        apiRows,
        teamsRes,
        leaguesRes,
        coachesRes,
        standingsRows
      ] = await Promise.all([
        fetchAllPaginated('api_stats_with_names', '*', 5, 20000),
        Promise.resolve(
          supabase
            .from('league_teams')
            .select('team_id, team_name, abbreviation, logo_url, coach_id, league_id')
            .range(0, 4999)
        ).catch(() => ({ data: [] })),
        Promise.resolve(
          supabase.from('leagues').select('*').range(0, 999)
        ).catch(() => ({ data: [] })),
        Promise.resolve(
          supabase.from('league_coaches').select('coach_id, coach_name').range(0, 999)
        ).catch(() => ({ data: [] })),
        fetchAllPaginated(
          'league_standings',
          'season_id, team_id, gp, w, l, t, otl, pts, gf, ga, gd, league_teams(team_id, team_name, abbreviation, logo_url)',
          3,
          5000
        )
      ]);

      const playerNameById = new Map<number, string>();
      const seasonPidToMeta = new Map<string, { name: string; teamId: number }>();

      apiRows.forEach((r: any) => {
        const pid = Number(r.player_id || 0);
        const sid = Number(r.league_id ?? r.season_id ?? 0);
        const name = String(r.player_name || r.name || '').trim();
        if (pid > 1 && name && !isInvalidPlayerName(name)) {
          const clean = DISPLAY_NAME_OVERRIDES[name] || name;
          playerNameById.set(pid, clean);
          if (sid > 0) {
            seasonPidToMeta.set(`${sid}_${pid}`, {
              name: clean,
              teamId: Number(r.team_id || 0)
            });
          }
        }
      });

      const cacheObj = {
        loaded: true,
        masterLoaded: false,
        masterLoadingPromise: null as Promise<void> | null,
        apiRows,
        masterRows: [] as any[],
        teamsData: teamsRes?.data || [],
        leaguesData: leaguesRes?.data || [],
        coachesData: coachesRes?.data || [],
        standingsData: standingsRows || [],
        playerNameById,
        seasonPidToMeta
      };
      archiveCacheRef.current = cacheObj;

      // Kick off background fetch of multi-point games from league_player_stats_master
      // so Single-Game Highs and 2+/3+/4+/5+ Point Game records populate without blocking initial load
      cacheObj.masterLoadingPromise = (async () => {
        try {
          const multiPtRows = await fetchAllPaginated(
            'league_player_stats_master',
            'game_id, league_id, team_id, player_id, pos_played, goals, assists',
            6,
            60000,
            (q) => q.or('goals.gte.2,assists.gte.2,and(goals.gte.1,assists.gte.1)')
          );
          cacheObj.masterRows = multiPtRows;
          cacheObj.masterLoaded = true;
          setMasterEnriched(true);
        } catch {
          cacheObj.masterLoaded = true;
        }
      })();

      return cacheObj;
    }

    async function loadRecordsData() {
      if (!archiveCacheRef.current?.loaded) {
        setLoading(true);
      }

      try {
        const archive = await ensureArchiveLoaded();
        const needsMasterImmediately =
          specificRecord.startsWith('max_game_') ||
          specificRecord.endsWith('_pt_games');
        if (needsMasterImmediately && !archive.masterLoaded && archive.masterLoadingPromise) {
          await archive.masterLoadingPromise;
        }
        if (cancelled) return;

        // Build season label & league prefix maps combining static maps + DB leagues table
        const dynamicSeasonLabels = new Map<number, string>();
        const dynamicSeasonPrefix = new Map<number, string>();
        Object.entries(SEASON_LABELS).forEach(([k, v]) => {
          const sid = Number(k);
          dynamicSeasonLabels.set(sid, v);
          dynamicSeasonPrefix.set(sid, getLeaguePrefix(sid));
        });
        archive.leaguesData.forEach((l: any) => {
          const sid = Number(l.league_id);
          if (!Number.isFinite(sid) || sid <= 0) return;
          const label = String(l.season_label || l.league_name || l.name || '').trim();
          if (label && !dynamicSeasonLabels.has(sid)) {
            dynamicSeasonLabels.set(sid, formatSeasonBadge(sid, new Map([[sid, label]])));
          }
          const lType = String(l.league_type || '').trim().toUpperCase();
          if (lType && ['W', 'Q', 'O', 'V', 'G'].includes(lType)) {
            dynamicSeasonPrefix.set(sid, lType);
          } else if (!dynamicSeasonPrefix.has(sid)) {
            dynamicSeasonPrefix.set(sid, getLeaguePrefix(sid, label));
          }
        });

        const getSeasonBadgeLocal = (seasonId: number | string | null | undefined): string => {
          if (seasonId === null || seasonId === undefined || seasonId === '') return 'Career';
          const num = Number(seasonId);
          if (!isNaN(num) && dynamicSeasonLabels.has(num)) return dynamicSeasonLabels.get(num)!;
          return formatSeasonBadge(seasonId);
        };

        const matchesSelectedLeague = (seasonId: number): boolean => {
          if (selectedLeague === 'ALL') return true;
          if (!Number.isFinite(seasonId) || seasonId <= 0) return false;
          const pref = dynamicSeasonPrefix.get(seasonId) || getLeaguePrefix(seasonId);
          return pref === selectedLeague;
        };

        // Team metadata lookup by team_id
        const teamById = new Map<number, { name: string; abbr: string; logo: string; seasonId: number }>();
        archive.teamsData.forEach((t: any) => {
          const tid = Number(t.team_id || 0);
          if (tid > 0) {
            teamById.set(tid, {
              name: String(t.team_name || `Team ${tid}`).trim(),
              abbr: String(t.abbreviation || '').trim(),
              logo: String(t.logo_url || '').trim(),
              seasonId: Number(t.league_id || 0)
            });
          }
        });

        // Canonical display name per normalized player key (prefer clean full names)
        const canonicalNameByKey = new Map<string, string>();
        const registerDisplayName = (rawName: string) => {
          const clean = DISPLAY_NAME_OVERRIDES[rawName.trim()] || rawName.trim();
          if (!clean || isInvalidPlayerName(clean)) return '';
          const pKey = normalizePlayerKey(clean);
          if (!pKey) return '';
          const existing = canonicalNameByKey.get(pKey);
          if (!existing || (clean.length > existing.length && !clean.includes('.'))) {
            canonicalNameByKey.set(pKey, clean);
          }
          return pKey;
        };

        // STAGE 1A: Aggregate api_stats_with_names per (pKey, seasonId) across all teams & positions
        type SeasonTeamBucket = {
          gp: number;
          goals: number;
          assists: number;
          points: number;
          shots: number;
          pim: number;
          twoPt: number;
          threePt: number;
          fourPt: number;
          fivePt: number;
          teamName: string;
          teamLogo: string;
        };

        const apiPerPlayerSeasonTeam = new Map<string, Map<string, SeasonTeamBucket>>();

        archive.apiRows.forEach((row: any) => {
          const sid = Number(row.league_id ?? row.season_id ?? 0);
          if (!sid || !matchesSelectedLeague(sid)) return;

          const pos = String(row.pos ?? row.position ?? row.pos_played ?? '').trim().toUpperCase();
          if (pos === 'G') return;

          const pid = Number(row.player_id || 0);
          let rawName = String(row.player_name || row.name || '').trim();
          if ((!rawName || isInvalidPlayerName(rawName)) && pid > 1) {
            rawName =
              archive.seasonPidToMeta.get(`${sid}_${pid}`)?.name ||
              archive.playerNameById.get(pid) ||
              '';
          }
          if (!rawName || isInvalidPlayerName(rawName)) return;

          const gp = Number(row.gp ?? row.games_played ?? 0);
          const goals = Number(row.total_goals ?? row.goals ?? 0);
          const assists = Number(row.total_assists ?? row.assists ?? 0);
          const points = Number(row.total_points ?? row.points ?? goals + assists);
          const shots = Number(row.total_sog ?? row.shots ?? row.sog ?? 0);
          const pim = Number(row.total_pim ?? row.pim ?? 0);
          const twoPt = Number(row.two_pt_games ?? 0);
          const threePt = Number(row.three_pt_games ?? 0);
          const fourPt = Number(row.four_pt_games ?? 0);
          const fivePt = Number(row.five_pt_games ?? 0);

          // Ignore placeholder player_id 25000 (Jay Mazur 0-stat dummy bench entries across 19 teams)
          if (pid === 25000 && points <= 0 && goals <= 0 && assists <= 0) {
            return;
          }
          if (gp <= 0 && goals <= 0 && assists <= 0 && points <= 0 && shots <= 0 && pim <= 0) {
            return;
          }

          const pKey = registerDisplayName(rawName);
          if (!pKey) return;

          const tid = Number(row.team_id || 0);
          const tmMeta = tid > 0 ? teamById.get(tid) : undefined;
          const tName = String(row.team_name || tmMeta?.name || '').trim();
          const tLogo = String(row.logo_url || tmMeta?.logo || '').trim();
          // Include position in bucket key so a player who played both F and D on the same team has both rows summed
          const teamPosKey = `${(tName || (tid > 0 ? `tid_${tid}` : 'default')).toLowerCase()}__${pos || 'S'}`;

          const psKey = `${pKey}__${sid}`;
          if (!apiPerPlayerSeasonTeam.has(psKey)) {
            apiPerPlayerSeasonTeam.set(psKey, new Map());
          }
          const teamMap = apiPerPlayerSeasonTeam.get(psKey)!;
          const existing = teamMap.get(teamPosKey);
          if (!existing) {
            teamMap.set(teamPosKey, {
              gp,
              goals,
              assists,
              points,
              shots,
              pim,
              twoPt,
              threePt,
              fourPt,
              fivePt,
              teamName: tName,
              teamLogo: tLogo
            });
          } else {
            existing.gp = Math.max(existing.gp, gp);
            existing.goals = Math.max(existing.goals, goals);
            existing.assists = Math.max(existing.assists, assists);
            existing.points = Math.max(existing.points, points, existing.goals + existing.assists);
            existing.shots = Math.max(existing.shots, shots);
            existing.pim = Math.max(existing.pim, pim);
            existing.twoPt = Math.max(existing.twoPt, twoPt);
            existing.threePt = Math.max(existing.threePt, threePt);
            existing.fourPt = Math.max(existing.fourPt, fourPt);
            existing.fivePt = Math.max(existing.fivePt, fivePt);
            if (!existing.teamName && tName) existing.teamName = tName;
            if (!existing.teamLogo && tLogo) existing.teamLogo = tLogo;
          }
        });

        type SeasonAgg = {
          pKey: string;
          seasonId: number;
          gp: number;
          goals: number;
          assists: number;
          points: number;
          shots: number;
          pim: number;
          twoPt: number;
          threePt: number;
          fourPt: number;
          fivePt: number;
          maxGamePoints: number;
          maxGameGoals: number;
          maxGameAssists: number;
          teams: string[];
          logos: string[];
        };

        const mergedPlayerSeasons = new Map<string, SeasonAgg>();

        apiPerPlayerSeasonTeam.forEach((teamMap, psKey) => {
          const [pKey, sidStr] = psKey.split('__');
          const seasonId = Number(sidStr);
          let gp = 0;
          let goals = 0;
          let assists = 0;
          let points = 0;
          let shots = 0;
          let pim = 0;
          let twoPt = 0;
          let threePt = 0;
          let fourPt = 0;
          let fivePt = 0;
          const teams: string[] = [];
          const logos: string[] = [];

          teamMap.forEach((b) => {
            gp += b.gp;
            goals += b.goals;
            assists += b.assists;
            points += Math.max(b.points, b.goals + b.assists);
            shots += b.shots;
            pim += b.pim;
            twoPt += b.twoPt;
            threePt += b.threePt;
            fourPt += b.fourPt;
            fivePt += b.fivePt;
            if (b.teamName && !teams.includes(b.teamName)) teams.push(b.teamName);
            if (b.teamLogo && !logos.includes(b.teamLogo)) logos.push(b.teamLogo);
          });

          mergedPlayerSeasons.set(psKey, {
            pKey,
            seasonId,
            gp,
            goals,
            assists,
            points,
            shots,
            pim,
            twoPt,
            threePt,
            fourPt,
            fivePt,
            maxGamePoints: 0,
            maxGameGoals: 0,
            maxGameAssists: 0,
            teams,
            logos
          });
        });

        // STAGE 1B: Enrich multi-point game counts & single-game highs from league_player_stats_master
        // Deduplicate by (pKey, seasonId, gameId) so duplicate boxscore entries aren't counted twice
        const masterGamesByPlayerSeason = new Map<
          string,
          {
            pKey: string;
            seasonId: number;
            seenGames: Set<string>;
            twoPt: number;
            threePt: number;
            fourPt: number;
            fivePt: number;
            maxGamePoints: number;
            maxGameGoals: number;
            maxGameAssists: number;
            teams: string[];
            logos: string[];
          }
        >();

        archive.masterRows.forEach((row: any, idx: number) => {
          const sid = Number(row.league_id ?? row.season_id ?? 0);
          if (!sid || !matchesSelectedLeague(sid)) return;

          const pos = String(row.pos_played ?? row.pos ?? '').trim().toUpperCase();
          if (pos === 'G') return;

          const pid = Number(row.player_id || 0);
          let rawName = String(row.player_name || '').trim();
          if ((!rawName || isInvalidPlayerName(rawName)) && pid > 1) {
            rawName =
              archive.seasonPidToMeta.get(`${sid}_${pid}`)?.name ||
              archive.playerNameById.get(pid) ||
              '';
          }
          if (!rawName || isInvalidPlayerName(rawName)) return;

          const pKey = registerDisplayName(rawName);
          if (!pKey) return;

          const psKey = `${pKey}__${sid}`;
          const gId = row.game_id != null ? String(row.game_id) : `row_${idx}`;

          if (!masterGamesByPlayerSeason.has(psKey)) {
            masterGamesByPlayerSeason.set(psKey, {
              pKey,
              seasonId: sid,
              seenGames: new Set<string>(),
              twoPt: 0,
              threePt: 0,
              fourPt: 0,
              fivePt: 0,
              maxGamePoints: 0,
              maxGameGoals: 0,
              maxGameAssists: 0,
              teams: [],
              logos: []
            });
          }

          const bucket = masterGamesByPlayerSeason.get(psKey)!;
          if (bucket.seenGames.has(gId)) return;
          bucket.seenGames.add(gId);

          const gGoals = Number(row.goals || 0);
          const gAssists = Number(row.assists || 0);
          const gPoints = Number(row.points ?? gGoals + gAssists);

          if (gPoints >= 2) bucket.twoPt += 1;
          if (gPoints >= 3) bucket.threePt += 1;
          if (gPoints >= 4) bucket.fourPt += 1;
          if (gPoints >= 5) bucket.fivePt += 1;

          if (gPoints > bucket.maxGamePoints) bucket.maxGamePoints = gPoints;
          if (gGoals > bucket.maxGameGoals) bucket.maxGameGoals = gGoals;
          if (gAssists > bucket.maxGameAssists) bucket.maxGameAssists = gAssists;

          const tid = Number(row.team_id || archive.seasonPidToMeta.get(`${sid}_${pid}`)?.teamId || 0);
          const tmMeta = tid > 0 ? teamById.get(tid) : undefined;
          if (tmMeta?.name && !bucket.teams.includes(tmMeta.name)) {
            bucket.teams.push(tmMeta.name);
          }
          if (tmMeta?.logo && !bucket.logos.includes(tmMeta.logo)) {
            bucket.logos.push(tmMeta.logo);
          }
        });

        // Merge Stage 1B (multi-point & single-game highs) into Stage 1A (api season rows)
        masterGamesByPlayerSeason.forEach((mBucket, psKey) => {
          const existing = mergedPlayerSeasons.get(psKey);
          if (existing) {
            existing.twoPt = Math.max(existing.twoPt, mBucket.twoPt);
            existing.threePt = Math.max(existing.threePt, mBucket.threePt);
            existing.fourPt = Math.max(existing.fourPt, mBucket.fourPt);
            existing.fivePt = Math.max(existing.fivePt, mBucket.fivePt);
            existing.maxGamePoints = Math.max(existing.maxGamePoints, mBucket.maxGamePoints);
            existing.maxGameGoals = Math.max(existing.maxGameGoals, mBucket.maxGameGoals);
            existing.maxGameAssists = Math.max(existing.maxGameAssists, mBucket.maxGameAssists);
            mBucket.teams.forEach((t) => {
              if (t && !existing.teams.includes(t)) existing.teams.push(t);
            });
            mBucket.logos.forEach((l) => {
              if (l && !existing.logos.includes(l)) existing.logos.push(l);
            });
          }
        });

        // STAGE 2: Combine all seasons for each player (pKey) into ONE unified career entry
        const playerAggMap = new Map<string, any>();

        // Sort seasons chronologically so team history & season badges accumulate in order
        const sortedSeasonEntries = Array.from(mergedPlayerSeasons.values()).sort(
          (a, b) => a.seasonId - b.seasonId
        );

        sortedSeasonEntries.forEach((sRow) => {
          const { pKey, seasonId } = sRow;
          const displayName = canonicalNameByKey.get(pKey) || pKey;
          const sBadge = getSeasonBadgeLocal(seasonId);

          if (!playerAggMap.has(pKey)) {
            playerAggMap.set(pKey, {
              player_key: pKey,
              player_name: displayName,
              teams: [...sRow.teams],
              team_logos: [...sRow.logos],
              first_season: sBadge,
              last_season: sBadge,
              seasons_played: [seasonId],
              total_points: sRow.points,
              total_goals: sRow.goals,
              total_assists: sRow.assists,
              total_games: sRow.gp,
              total_shots: sRow.shots,
              total_pim: sRow.pim,
              two_pt_games: sRow.twoPt,
              three_pt_games: sRow.threePt,
              four_pt_games: sRow.fourPt,
              five_pt_games: sRow.fivePt,
              max_season_points: sRow.points,
              max_season_points_season: sBadge,
              max_season_goals: sRow.goals,
              max_season_goals_season: sBadge,
              max_season_assists: sRow.assists,
              max_season_assists_season: sBadge,
              max_game_points: sRow.maxGamePoints,
              max_game_points_season: sRow.maxGamePoints > 0 ? sBadge : '',
              max_game_goals: sRow.maxGameGoals,
              max_game_goals_season: sRow.maxGameGoals > 0 ? sBadge : '',
              max_game_assists: sRow.maxGameAssists,
              max_game_assists_season: sRow.maxGameAssists > 0 ? sBadge : ''
            });
          } else {
            const cur = playerAggMap.get(pKey);
            cur.player_name = canonicalNameByKey.get(pKey) || cur.player_name;

            sRow.teams.forEach((t) => {
              if (t && !cur.teams.includes(t)) cur.teams.push(t);
            });
            sRow.logos.forEach((l) => {
              if (l && !cur.team_logos.includes(l)) cur.team_logos.push(l);
            });

            cur.total_points += sRow.points;
            cur.total_goals += sRow.goals;
            cur.total_assists += sRow.assists;
            cur.total_games += sRow.gp;
            cur.total_shots += sRow.shots;
            cur.total_pim += sRow.pim;
            cur.two_pt_games += sRow.twoPt;
            cur.three_pt_games += sRow.threePt;
            cur.four_pt_games += sRow.fourPt;
            cur.five_pt_games += sRow.fivePt;

            if (sRow.points > cur.max_season_points) {
              cur.max_season_points = sRow.points;
              cur.max_season_points_season = sBadge;
            }
            if (sRow.goals > cur.max_season_goals) {
              cur.max_season_goals = sRow.goals;
              cur.max_season_goals_season = sBadge;
            }
            if (sRow.assists > cur.max_season_assists) {
              cur.max_season_assists = sRow.assists;
              cur.max_season_assists_season = sBadge;
            }

            if (sRow.maxGamePoints > cur.max_game_points) {
              cur.max_game_points = sRow.maxGamePoints;
              cur.max_game_points_season = sBadge;
            }
            if (sRow.maxGameGoals > cur.max_game_goals) {
              cur.max_game_goals = sRow.maxGameGoals;
              cur.max_game_goals_season = sBadge;
            }
            if (sRow.maxGameAssists > cur.max_game_assists) {
              cur.max_game_assists = sRow.maxGameAssists;
              cur.max_game_assists_season = sBadge;
            }

            if (!cur.seasons_played.includes(seasonId)) {
              cur.seasons_played.push(seasonId);
            }
            const minS = Math.min(...cur.seasons_played);
            const maxS = Math.max(...cur.seasons_played);
            cur.first_season = getSeasonBadgeLocal(minS);
            cur.last_season = getSeasonBadgeLocal(maxS);
          }
        });

        // Convert Map to array
        const aggregatedList = Array.from(playerAggMap.values());

        // Helper to get formatted value & record season for any metric
        const getMetricRecordList = (metricKey: string) => {
          const isSeasonStat = metricKey.startsWith('max_season_');
          const isGameStat = metricKey.startsWith('max_game_');

          const list = [...aggregatedList].filter(p => (Number(p[metricKey]) || 0) > 0);

          list.sort((a, b) => {
            const diff = (Number(b[metricKey]) || 0) - (Number(a[metricKey]) || 0);
            if (diff !== 0) return diff;
            return (Number(b.total_points) || 0) - (Number(a.total_points) || 0);
          });

          return list.map((row, idx) => {
            const seasonsCount = Array.isArray(row.seasons_played) ? row.seasons_played.length : 1;
            let recordSeason = 'Career';
            if (isSeasonStat) {
              recordSeason = row[`${metricKey}_season`] || row.last_season || 'Season';
            } else if (isGameStat) {
              recordSeason = row[`${metricKey}_season`] || row.last_season || 'Single Game';
            } else {
              const spanText =
                row.first_season === row.last_season
                  ? row.first_season
                  : `${row.first_season} - ${row.last_season}`;
              recordSeason = `${seasonsCount} ${seasonsCount === 1 ? 'Season' : 'Seasons'} (${spanText})`;
            }

            return {
              rank: idx + 1,
              player_name: row.player_name,
              teams:
                Array.isArray(row.teams) && row.teams.length > 0
                  ? row.teams.join(', ')
                  : 'League Alumni',
              team_logo: row.team_logos?.[row.team_logos.length - 1] || row.team_logos?.[0] || '',
              value: row[metricKey] ?? 0,
              record_season: recordSeason,
              first_season: row.first_season,
              last_season: row.last_season,
              seasons_count: seasonsCount
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

        // F. Compute Team Record Book Watch (Active Season Teams on Track to Beat Single-Season Records)
        try {
          const targetSeasonIds: number[] = [];
          dynamicSeasonPrefix.forEach((pref, sid) => {
            if (selectedLeague === 'ALL' || pref === selectedLeague) {
              targetSeasonIds.push(sid);
            }
          });

          const allStandings = archive.standingsData || [];
          const allTeams = archive.teamsData || [];
          const coachById = new Map<number, string>();
          (archive.coachesData || []).forEach((c: any) => {
            if (c.coach_id != null && c.coach_name) {
              coachById.set(Number(c.coach_id), String(c.coach_name).trim());
            }
          });

          const standingsSeasonsInScope = Array.from(
            new Set(
              allStandings
                .map((r: any) => Number(r.season_id || 0))
                .filter((sid: number) => sid > 0 && matchesSelectedLeague(sid))
            )
          ).sort((a, b) => b - a);

          const activeSeasonId =
            standingsSeasonsInScope[0] ||
            (targetSeasonIds.length > 0 ? Math.max(...targetSeasonIds) : 40);

          const resolveTeamMeta = (row: any) => {
            const tid = Number(row?.team_id || 0);
            const lt = Array.isArray(row?.league_teams) ? row.league_teams[0] : row?.league_teams;
            const tm = allTeams.find((t: any) => Number(t.team_id) === tid);
            const name = lt?.team_name || tm?.team_name || `Team ${tid}`;
            const abbr = lt?.abbreviation || tm?.abbreviation || `TM${tid}`;
            const logo = lt?.logo_url || tm?.logo_url || '';
            const coach = (tm?.coach_id && coachById.get(Number(tm.coach_id))) || 'Assigned Coach';
            return { tid, name, abbr, logo, coach };
          };

          const curRows = allStandings.filter(
            (r: any) => Number(r.season_id) === activeSeasonId && Number(r.gp || 0) >= 5
          );
          const histRows = allStandings.filter(
            (r: any) =>
              Number(r.season_id) !== activeSeasonId &&
              Number(r.gp || 0) >= 20 &&
              matchesSelectedLeague(Number(r.season_id))
          );

          const maxGpCur = curRows.reduce((m: number, r: any) => Math.max(m, Number(r.gp || 0)), 0);
          const targetGp = Math.max(maxGpCur, 56);

          let recPts = { val: 92, holder: 'Historical Record', season: 'W17' };
          let recWins = { val: 45, holder: 'Historical Record', season: 'W17' };
          let recGf = { val: 218, holder: 'Historical Record', season: 'W17' };
          let recGd = { val: 112, holder: 'Historical Record', season: 'W17' };
          let recGag = { val: 1.62, holder: 'Historical Record', season: 'W17' };

          if (histRows.length > 0) {
            const topPts = [...histRows].sort((a, b) => Number(b.pts || 0) - Number(a.pts || 0))[0];
            if (topPts && Number(topPts.pts) > 0) {
              const m = resolveTeamMeta(topPts);
              recPts = { val: Number(topPts.pts), holder: `${m.name} (${m.abbr})`, season: getSeasonBadgeLocal(topPts.season_id) };
            }
            const topW = [...histRows].sort((a, b) => Number(b.w || 0) - Number(a.w || 0))[0];
            if (topW && Number(topW.w) > 0) {
              const m = resolveTeamMeta(topW);
              recWins = { val: Number(topW.w), holder: `${m.name} (${m.abbr})`, season: getSeasonBadgeLocal(topW.season_id) };
            }
            const topGf = [...histRows].sort((a, b) => Number(b.gf || 0) - Number(a.gf || 0))[0];
            if (topGf && Number(topGf.gf) > 0) {
              const m = resolveTeamMeta(topGf);
              recGf = { val: Number(topGf.gf), holder: `${m.name} (${m.abbr})`, season: getSeasonBadgeLocal(topGf.season_id) };
            }
            const topGd = [...histRows].sort(
              (a, b) => (Number(b.gf || 0) - Number(b.ga || 0)) - (Number(a.gf || 0) - Number(a.ga || 0))
            )[0];
            if (topGd && Number(topGd.gf || 0) - Number(topGd.ga || 0) > 0) {
              const m = resolveTeamMeta(topGd);
              recGd = {
                val: Number(topGd.gf || 0) - Number(topGd.ga || 0),
                holder: `${m.name} (${m.abbr})`,
                season: getSeasonBadgeLocal(topGd.season_id)
              };
            }
            const topGag = [...histRows]
              .filter((r: any) => Number(r.gp || 0) >= 25 && Number(r.ga || 0) > 0)
              .sort((a, b) => Number(a.ga) / Number(a.gp) - Number(b.ga) / Number(b.gp))[0];
            if (topGag) {
              const m = resolveTeamMeta(topGag);
              recGag = {
                val: Number((Number(topGag.ga) / Number(topGag.gp)).toFixed(2)),
                holder: `${m.name} (${m.abbr})`,
                season: getSeasonBadgeLocal(topGag.season_id)
              };
            }
          }

          const watchList: any[] = [];
          const activeSeasonBadge = getSeasonBadgeLocal(activeSeasonId);

          if (curRows.length > 0) {
            const byPts = [...curRows].sort(
              (a, b) => Number(b.pts || 0) / Number(b.gp || 1) - Number(a.pts || 0) / Number(a.gp || 1)
            )[0];
            if (byPts) {
              const m = resolveTeamMeta(byPts);
              const gp = Math.max(1, Number(byPts.gp || 1));
              const tGp = Math.max(gp, targetGp);
              const curVal = Number(byPts.pts || 0);
              const projVal = Math.round((curVal / gp) * tGp);
              watchList.push({
                category: 'Most Points, Single Season (Team)',
                season: activeSeasonBadge,
                teamName: m.name,
                teamAbbr: m.abbr,
                teamLogo: m.logo,
                coach: m.coach,
                currentText: `${curVal} PTS (${gp} GP)`,
                paceText: `${projVal} PTS (${tGp} GP)`,
                recordText: `${recPts.val} PTS`,
                holderText: `${recPts.holder} • ${recPts.season}`,
                onTrack: projVal >= recPts.val,
                broken: curVal > recPts.val
              });
            }

            const byWins = [...curRows].sort(
              (a, b) => Number(b.w || 0) / Number(b.gp || 1) - Number(a.w || 0) / Number(a.gp || 1)
            )[0];
            if (byWins) {
              const m = resolveTeamMeta(byWins);
              const gp = Math.max(1, Number(byWins.gp || 1));
              const tGp = Math.max(gp, targetGp);
              const curVal = Number(byWins.w || 0);
              const projVal = Math.round((curVal / gp) * tGp);
              watchList.push({
                category: 'Most Wins, Single Season (Team)',
                season: activeSeasonBadge,
                teamName: m.name,
                teamAbbr: m.abbr,
                teamLogo: m.logo,
                coach: m.coach,
                currentText: `${curVal} W (${gp} GP)`,
                paceText: `${projVal} W (${tGp} GP)`,
                recordText: `${recWins.val} W`,
                holderText: `${recWins.holder} • ${recWins.season}`,
                onTrack: projVal >= recWins.val,
                broken: curVal > recWins.val
              });
            }

            const byGd = [...curRows].sort(
              (a, b) =>
                (Number(b.gf || 0) - Number(b.ga || 0)) / Number(b.gp || 1) -
                (Number(a.gf || 0) - Number(a.ga || 0)) / Number(a.gp || 1)
            )[0];
            if (byGd) {
              const m = resolveTeamMeta(byGd);
              const gp = Math.max(1, Number(byGd.gp || 1));
              const tGp = Math.max(gp, targetGp);
              const curVal = Number(byGd.gf || 0) - Number(byGd.ga || 0);
              const projVal = Math.round((curVal / gp) * tGp);
              watchList.push({
                category: 'Best Goal Differential, Single Season',
                season: activeSeasonBadge,
                teamName: m.name,
                teamAbbr: m.abbr,
                teamLogo: m.logo,
                coach: m.coach,
                currentText: `+${curVal} GD (${gp} GP)`,
                paceText: `+${projVal} GD (${tGp} GP)`,
                recordText: `+${recGd.val} GD`,
                holderText: `${recGd.holder} • ${recGd.season}`,
                onTrack: projVal >= recGd.val,
                broken: curVal > recGd.val
              });
            }

            const byGf = [...curRows].sort(
              (a, b) => Number(b.gf || 0) / Number(b.gp || 1) - Number(a.gf || 0) / Number(a.gp || 1)
            )[0];
            if (byGf) {
              const m = resolveTeamMeta(byGf);
              const gp = Math.max(1, Number(byGf.gp || 1));
              const tGp = Math.max(gp, targetGp);
              const curVal = Number(byGf.gf || 0);
              const projVal = Math.round((curVal / gp) * tGp);
              watchList.push({
                category: 'Most Goals For, Single Season (Team)',
                season: activeSeasonBadge,
                teamName: m.name,
                teamAbbr: m.abbr,
                teamLogo: m.logo,
                coach: m.coach,
                currentText: `${curVal} GF (${(curVal / gp).toFixed(2)}/G)`,
                paceText: `${projVal} GF (${tGp} GP)`,
                recordText: `${recGf.val} GF`,
                holderText: `${recGf.holder} • ${recGf.season}`,
                onTrack: projVal >= recGf.val,
                broken: curVal > recGf.val
              });
            }

            const byGag = [...curRows].sort(
              (a, b) => Number(a.ga || 0) / Number(a.gp || 1) - Number(b.ga || 0) / Number(b.gp || 1)
            )[0];
            if (byGag) {
              const m = resolveTeamMeta(byGag);
              const gp = Math.max(1, Number(byGag.gp || 1));
              const tGp = Math.max(gp, targetGp);
              const curGa = Number(byGag.ga || 0);
              const curGagVal = Number((curGa / gp).toFixed(2));
              const projGa = Math.round((curGa / gp) * tGp);
              watchList.push({
                category: 'Lowest Goals Against / Game (Team)',
                season: activeSeasonBadge,
                teamName: m.name,
                teamAbbr: m.abbr,
                teamLogo: m.logo,
                coach: m.coach,
                currentText: `${curGagVal.toFixed(2)} GA/G (${curGa} GA)`,
                paceText: `${projGa} GA (${tGp} GP)`,
                recordText: `${recGag.val.toFixed(2)} GA/G`,
                holderText: `${recGag.holder} • ${recGag.season}`,
                onTrack: curGagVal <= recGag.val,
                broken: false
              });
            }
          }

          setTeamRecordWatch(watchList);
        } catch {
          setTeamRecordWatch([]);
        }

      } catch (err) {
        console.error("Error loading records:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRecordsData();
    return () => {
      cancelled = true;
    };
  }, [selectedLeague, specificRecord, masterEnriched]);

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
    return LEAGUES.find(l => l.id === selectedLeague) || LEAGUES[0];
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
          <div className="flex items-center gap-2 bg-white border-2 border-black p-1.5 shadow-sm self-start md:self-center rounded-xs overflow-x-auto max-w-full no-scrollbar">
            {LEAGUES.map((l) => {
              const isSelected = selectedLeague === l.id;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setSelectedLeague(l.id)}
                  title={l.name}
                  className={`h-10 sm:h-12 px-2.5 sm:px-3 flex items-center justify-center transition cursor-pointer border-2 rounded-xs shrink-0 ${
                    isSelected
                      ? 'bg-black text-white border-black shadow-sm ring-2 ring-yellow-400'
                      : 'bg-[#faf8f5] text-black border-neutral-300 hover:border-black hover:bg-neutral-100'
                  }`}
                >
                  {l.logoUrl ? (
                    <img
                      src={l.logoUrl}
                      alt={l.name}
                      className="h-6 sm:h-8 max-w-[40px] sm:max-w-[48px] object-contain"
                      onError={(e) => {
                        if (l.fallbackUrl && (e.currentTarget as HTMLImageElement).src !== l.fallbackUrl) {
                          (e.currentTarget as HTMLImageElement).src = l.fallbackUrl;
                        }
                      }}
                    />
                  ) : (
                    <span className={`text-xs font-black uppercase tracking-wider px-1 ${
                      isSelected ? 'text-yellow-400 font-black' : 'text-black'
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
        <div className="mt-4 sm:mt-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4 bg-white border-2 border-black p-3 sm:p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-xs font-black uppercase text-gray-600 mr-1 sm:mr-2">Category:</span>
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
                className={`px-3 py-1 text-xs font-black uppercase border border-black rounded transition cursor-pointer ${
                  recordType === cat.id
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
      {/* 2.5 RECORD BOOK WATCH: TEAMS ON TRACK TO BEAT RECORD */}
      {/* ==================================================== */}
      {teamRecordWatch.length > 0 && (
        <section className="mb-8">
          <div className="bg-neutral-950 text-white border-4 border-black p-4 sm:p-6 shadow-md rounded-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
                <div>
                  <h2 className="text-lg sm:text-2xl font-black uppercase tracking-tight text-white">
                    Record Book Watch — Teams On Track to Beat a Record
                  </h2>
                  <p className="text-xs text-neutral-400 font-serif italic">
                    Live single-season pace projections comparing active clubs against all-time {leagueName} team benchmarks
                  </p>
                </div>
              </div>
              <span className="bg-emerald-400 text-black font-mono font-black text-xs uppercase px-2.5 py-1 self-start sm:self-center">
                LIVE PACE TRACKER
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {teamRecordWatch.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-neutral-900 border border-neutral-800 hover:border-emerald-400/70 p-3.5 flex flex-col justify-between transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-mono font-black uppercase text-amber-400 tracking-wider">
                        {item.category}
                      </span>
                      <span
                        className={`text-[9px] font-mono font-black uppercase px-1.5 py-0.5 shrink-0 ${
                          item.broken || item.onTrack
                            ? 'bg-emerald-400 text-black'
                            : 'bg-amber-400 text-black'
                        }`}
                      >
                        {item.broken ? 'NEW RECORD 🏆' : item.onTrack ? 'ON TRACK TO BEAT 🔥' : 'CHASING RECORD ⚡'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 mb-3">
                      {item.teamLogo ? (
                        <img
                          src={item.teamLogo}
                          alt={item.teamAbbr}
                          className="w-8 h-8 object-contain bg-white/10 p-1 shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-neutral-800 border border-neutral-700 flex items-center justify-center font-mono font-black text-xs text-amber-400 shrink-0">
                          {item.teamAbbr}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-black text-sm uppercase text-white truncate">
                          {item.teamName} <span className="text-amber-400 font-mono text-xs">({item.teamAbbr})</span>
                        </div>
                        <div className="text-[11px] font-mono text-neutral-400 truncate">
                          Coach: {item.coach} • {item.season}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-black/80 border border-neutral-800 p-2 text-xs font-mono space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">CURRENT:</span>
                      <span className="text-white font-bold">{item.currentText}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-400 font-bold">SEASON PACE:</span>
                      <span className="text-emerald-300 font-black">{item.paceText}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-neutral-800 pt-1">
                      <span className="text-amber-400">RECORD TO BEAT:</span>
                      <span className="text-amber-300 font-bold">
                        {item.recordText} <span className="text-neutral-500 text-[10px]">({item.holderText})</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

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

          {/* Mobile Swipe Notice */}
          <div className="md:hidden flex items-center justify-between text-[10px] font-sans font-bold text-black/60 px-3 py-1.5 bg-[#ebd9c0]/50 border border-black/15 mb-2 rounded-xs uppercase tracking-wider">
            <span>↔ Swipe table sideways for full records</span>
            <span>{leaderboard.length} Leaders</span>
          </div>

          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="w-full text-left text-xs border-collapse min-w-[650px]">
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
                        className={`transition font-bold ${
                          isFirst
                            ? 'bg-yellow-100 font-black hover:bg-yellow-200'
                            : index % 2 === 0 ? 'bg-gray-50 hover:bg-yellow-50' : 'bg-white hover:bg-yellow-50'
                        }`}
                      >
                        <td className="py-3 px-3 border-r border-black/20 text-center font-mono font-black">
                          {isFirst ? (
                            <span className="bg-black text-white px-1.5 py-0.5 rounded text-[11px]">
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
                  className={`flex flex-col md:flex-row items-start md:items-center justify-between p-3.5 transition cursor-pointer gap-3 ${
                    isSelected ? 'bg-yellow-200 font-black' : 'hover:bg-yellow-50 bg-white'
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
                    <span className={`text-xs font-black uppercase tracking-wider ${
                      isSelected ? 'text-black underline' : 'text-blue-700 hover:underline'
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