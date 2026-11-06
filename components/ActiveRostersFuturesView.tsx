"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { W_SEASON_CONFIG, O_SEASON_CONFIG, W_LEAGUE_COACH_MAP } from '@/lib/seasons';
import { Search, Download, Filter, RotateCcw, Users, Columns2, Table as TableIcon, UserCheck } from 'lucide-react';

const W_YEARS = [2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
const O_YEARS = [1927, 1928, 1929, 1930, 1931, 1932, 1933, 1934, 1935, 1936, 1937, 1938];

const W_TEAM_DEFAULT_NAMES: Record<string, string> = {
  AUT: 'Autobahn',
  BAR: 'Barrie',
  BAY: 'Baytown',
  BFC: 'Betty Ford',
  DHG: 'Devil Hill Goblins',
  GRH: 'Grand Rapids',
  HAM: 'Hamilton',
  HIG: 'Highland',
  ING: 'Inglewood',
  ITA: 'Italy',
  KAR: 'Karlstad',
  MHA: 'Manhattan',
  MHT: 'Manotick',
  MGG: 'Magog',
  NBK: 'New Brunswick',
  OCW: 'Ottawa',
  PIT: 'Pittsburgh',
  PRO: 'Providence',
  RIC: 'Richmond',
  ROC: 'Rochester',
  SHS: 'Sherwood',
  SVF: 'Saint-Vincent',
  SUM: 'Summerside',
  TAI: 'Taipei',
  TEG: 'Tegucigalpa',
  TBP: 'Tampa Bay',
  VHV: 'Victoriaville',
  WDY: 'Woodbury',
  ETI: 'Etobicoke',
};

const O_TEAM_DEFAULT_NAMES: Record<string, string> = {
  BOS: 'Boston Bruins',
  CHI: 'Chicago Black Hawks',
  DTC: 'Detroit Cougars',
  MTL: 'Montreal Canadiens',
  NYR: 'New York Rangers',
  TOR: 'Toronto Maple Leafs',
};

const DISPLAY_NAME_OVERRIDES: Record<string, string> = {
  'Martin St.Louis': 'Martin St. Louis',
};

function normName(name: string): string {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function normAlias(name: string): string {
  const cleaned = String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[.'’-]/g, ' ')
    .replace(/\s+/g, ' ');

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
  };
  if (fullOverride[cleaned]) return fullOverride[cleaned];

  const parts = cleaned.split(' ').filter(Boolean);
  if (parts.length < 2) return normName(name);
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
    evgeny: 'evgeni',
  };
  const first = firstMap[parts[0]] || parts[0];
  return `${first}${parts.slice(1).join('')}`.replace(/[^a-z0-9]/g, '');
}

function parseJsonSafe(val: any): Record<string, any> {
  if (!val) return {};
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return {};
    }
  }
  return {};
}

function extractHandedness(playerInfo: any, ratings: any): string {
  const candidates = [
    playerInfo?.hand,
    playerInfo?.Hand,
    playerInfo?.shoots,
    playerInfo?.Shoots,
    playerInfo?.catches,
    playerInfo?.Catches,
    playerInfo?.handedness,
    playerInfo?.Handedness,
    playerInfo?.h,
    playerInfo?.H,
    ratings?.hand,
    ratings?.Hand,
    ratings?.shoots,
    ratings?.Shoots,
    ratings?.catches,
    ratings?.Catches,
    ratings?.h,
    ratings?.H,
  ];

  for (const raw of candidates) {
    if (raw === undefined || raw === null || raw === '') continue;
    if (typeof raw === 'number') {
      if (raw === 0) return 'L';
      if (raw === 1) return 'R';
    }
    const str = String(raw).trim().toUpperCase();
    if (str === '0' || str === 'L' || str === 'LEFT') return 'L';
    if (str === '1' || str === 'R' || str === 'RIGHT') return 'R';
  }
  return 'L';
}

function extractOvr(row: any, ratings: any, playerInfo: any): number | null {
  const candidates = [
    ratings?.Ovr,
    ratings?.ovr,
    ratings?.OVERALL,
    ratings?.overall,
    playerInfo?.ovr,
    playerInfo?.Ovr,
    row?.ovr,
    row?.overall,
  ];
  for (const c of candidates) {
    if (c !== undefined && c !== null && c !== '') {
      const n = Math.round(Number(c));
      if (!isNaN(n) && n > 0) return n;
    }
  }
  return null;
}

/**
 * Computes the Google Sheets 3-color conditional formatting background color:
 * - Low OVR (~40-50): #e06666 (soft salmon red)
 * - Mid OVR (~73-74): #ffffff (pure white)
 * - High OVR (~98-104): #57bb8a (rich spreadsheet green)
 */
function getOvrHeatmapStyle(ovr: number | null | undefined): React.CSSProperties {
  if (ovr === null || ovr === undefined || isNaN(ovr) || ovr <= 0) {
    return {
      backgroundColor: '#000000',
      color: '#000000',
    };
  }

  const minVal = 42;
  const midVal = 73.5;
  const maxVal = 99;

  let r = 255;
  let g = 255;
  let b = 255;

  if (ovr < midVal) {
    const t = Math.max(0, Math.min(1, (midVal - ovr) / (midVal - minVal)));
    r = Math.round(255 - t * (255 - 224));
    g = Math.round(255 - t * (255 - 102));
    b = Math.round(255 - t * (255 - 102));
  } else if (ovr > midVal) {
    const t = Math.max(0, Math.min(1, (ovr - midVal) / (maxVal - midVal)));
    r = Math.round(255 - t * (255 - 87));
    g = Math.round(255 - t * (255 - 187));
    b = Math.round(255 - t * (255 - 138));
  }

  return {
    backgroundColor: `rgb(${r}, ${g}, ${b})`,
    color: '#000000',
  };
}

function buildTeamBannerCandidateUrls(abbr: string, isOriginalSix: boolean, bannerFilename?: string): string[] {
  const code = abbr.trim().toUpperCase();
  const baseFile = bannerFilename?.trim()
    ? bannerFilename.trim().includes('.')
      ? bannerFilename.trim()
      : `${bannerFilename.trim()}.png`
    : `${code}.png`;

  const encoded = encodeURIComponent(baseFile);
  const primaryBucket = isOriginalSix ? 'nhl%20banners' : 'banners';
  const secondaryBucket = isOriginalSix ? 'banners' : 'nhl%20banners';

  return [
    `https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/${primaryBucket}/${encoded}`,
    `https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/${secondaryBucket}/${encoded}`,
    `https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/banners/${encodeURIComponent(code + '.png')}`,
    `https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/nhl%20banners/${encodeURIComponent(code + '.png')}`,
  ];
}

function TeamBannerCell({
  abbr,
  teamName,
  isOriginalSix,
  bannerFilename,
  onSelectTeam,
}: {
  abbr: string;
  teamName: string;
  teamId?: number | null;
  seasonId: number | string;
  isOriginalSix: boolean;
  bannerFilename?: string;
  onSelectTeam?: (abbr: string) => void;
}) {
  const urls = useMemo(
    () => buildTeamBannerCandidateUrls(abbr, isOriginalSix, bannerFilename),
    [abbr, isOriginalSix, bannerFilename]
  );
  const [urlIdx, setUrlIdx] = useState(0);
  const [failedAll, setFailedAll] = useState(false);

  useEffect(() => {
    setUrlIdx(0);
    setFailedAll(false);
  }, [abbr, isOriginalSix, bannerFilename]);

  const currentUrl = urls[urlIdx];

  return (
    <div
      onClick={() => onSelectTeam?.(abbr)}
      title={`${teamName} (${abbr}) — Click to filter team`}
      className="w-full h-[22px] bg-black flex items-center justify-center overflow-hidden cursor-pointer select-none"
    >
      {!failedAll && currentUrl ? (
        <img
          src={currentUrl}
          alt={teamName}
          className="w-full h-full object-fill block"
          onError={() => {
            if (urlIdx + 1 < urls.length) {
              setUrlIdx((prev) => prev + 1);
            } else {
              setFailedAll(true);
            }
          }}
        />
      ) : (
        <span className="text-white font-bold text-[11.5px] leading-none tracking-tight px-1 truncate font-sans">
          {teamName}
        </span>
      )}
    </div>
  );
}

interface RosterMatrixPlayerRow {
  teamAbbr: string;
  teamName: string;
  teamId?: number | null;
  coachName?: string;
  coachId?: number | null;
  bannerFilename?: string;
  playerName: string;
  displayPlayerName: string;
  pos: 'G' | 'F' | 'D';
  hand: string;
  ovrByYear: Record<number, number | null>;
  peakOvr: number | null;
  avgOvr: number | null;
  activeYearsCount: number;
}

export interface ActiveRostersFuturesViewProps {
  initialLeagueType?: 'W' | 'O';
  initialTeamAbbr?: string;
  compactHeader?: boolean;
}

export default function ActiveRostersFuturesView({
  initialLeagueType = 'W',
  initialTeamAbbr = 'ALL',
}: ActiveRostersFuturesViewProps) {
  const [leagueType, setLeagueType] = useState<'W' | 'O'>(initialLeagueType);
  const [selectedTeamAbbr, setSelectedTeamAbbr] = useState<string>(initialTeamAbbr);
  const [posFilter, setPosFilter] = useState<'ALL' | 'G' | 'F' | 'D'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [splitColumns, setSplitColumns] = useState<boolean>(false);
  const [teamsMetaByAbbr, setTeamsMetaByAbbr] = useState<
    Record<string, { team_id?: number; team_name: string; coach_name?: string; coach_id?: number; banner_filename?: string }>
  >({});
  const [playerDbMap, setPlayerDbMap] = useState<
    Map<string, { hand: string; canonicalName: string; ovrByYear: Record<number, number> }>
  >(new Map());
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (initialTeamAbbr) {
      setSelectedTeamAbbr(initialTeamAbbr);
    }
  }, [initialTeamAbbr]);

  const years = useMemo(() => (leagueType === 'W' ? W_YEARS : O_YEARS), [leagueType]);
  const seasonConfig = useMemo(() => (leagueType === 'W' ? W_SEASON_CONFIG : O_SEASON_CONFIG), [leagueType]);
  const activeSeasonId = seasonConfig.seasonId;

  const orderedTeamAbbrs = useMemo(() => {
    const codesObj = seasonConfig.teamCodes || {};
    return Object.keys(codesObj)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => codesObj[k]);
  }, [seasonConfig]);

  useEffect(() => {
    if (selectedTeamAbbr !== 'ALL' && !orderedTeamAbbrs.includes(selectedTeamAbbr)) {
      setSelectedTeamAbbr('ALL');
    }
  }, [leagueType, orderedTeamAbbrs, selectedTeamAbbr]);

  // 1. Load team metadata from league_teams + league_coaches
  useEffect(() => {
    let cancelled = false;
    async function loadTeamsMeta() {
      try {
        const [teamsRes, coachesRes] = await Promise.all([
          supabase.from('league_teams').select('*').in('league_id', [38, 39, 40]),
          supabase.from('league_coaches').select('coach_id, coach_name'),
        ]);

        if (cancelled) return;
        const coachMap: Record<number, string> = {};
        (coachesRes.data || []).forEach((c: any) => {
          if (c.coach_id !== undefined && c.coach_id !== null) {
            coachMap[Number(c.coach_id)] = c.coach_name;
          }
        });

        const map: Record<string, { team_id?: number; team_name: string; coach_name?: string; coach_id?: number; banner_filename?: string }> = {};
        (teamsRes.data || []).forEach((t: any) => {
          const abbr = String(t.abbreviation || '').trim().toUpperCase();
          if (!abbr) return;
          if (map[abbr] && Number(t.league_id) !== Number(activeSeasonId)) return;
          const cId = Number(t.coach_id) || W_LEAGUE_COACH_MAP[abbr]?.coach_id || undefined;
          const cName =
            (t.coach_id && coachMap[Number(t.coach_id)]) ||
            t.coach_name ||
            W_LEAGUE_COACH_MAP[abbr]?.coach_name ||
            '';
          map[abbr] = {
            team_id: Number(t.team_id),
            team_name: t.team_name || W_TEAM_DEFAULT_NAMES[abbr] || O_TEAM_DEFAULT_NAMES[abbr] || abbr,
            coach_name: cName,
            coach_id: cId,
            banner_filename: t.banner_filename || undefined,
          };
        });

        setTeamsMetaByAbbr(map);
      } catch (e) {
        console.error('Error loading teams metadata for league rosters view:', e);
      }
    }
    loadTeamsMeta();
    return () => {
      cancelled = true;
    };
  }, [activeSeasonId]);

  // 2. Load player ratings across all target years in parallel
  useEffect(() => {
    let cancelled = false;
    async function loadYearsData() {
      setLoading(true);
      try {
        const yearPromises = years.map(async (yr) => {
          const { data, error } = await supabase
            .from('league_player_database')
            .select('player_name, pos, ratings, player_info')
            .eq('player_info->>source_year', String(yr))
            .range(0, 999);
          if (error) {
            console.error(`Error fetching year ${yr}:`, error);
            return { yr, rows: [] as any[] };
          }
          return { yr, rows: data || [] };
        });

        const results = await Promise.all(yearPromises);
        if (cancelled) return;

        const compiled = new Map<
          string,
          { hand: string; canonicalName: string; ovrByYear: Record<number, number> }
        >();

        const registerEntry = (
          key: string,
          yr: number,
          ovr: number,
          hand: string,
          rawName: string
        ) => {
          let existing = compiled.get(key);
          if (!existing) {
            existing = {
              hand: hand || 'L',
              canonicalName: rawName,
              ovrByYear: {},
            };
            compiled.set(key, existing);
          } else if (hand && (!existing.hand || existing.hand === '-')) {
            existing.hand = hand;
          }
          const prevOvr = existing.ovrByYear[yr];
          if (prevOvr === undefined || ovr > prevOvr) {
            existing.ovrByYear[yr] = ovr;
          }
        };

        results.forEach(({ yr, rows }) => {
          rows.forEach((row: any) => {
            const rawName = String(row.player_name || '').trim();
            if (!rawName) return;
            const pInfo = parseJsonSafe(row.player_info);
            const rObj = parseJsonSafe(row.ratings);
            const ovr = extractOvr(row, rObj, pInfo);
            if (ovr === null) return;

            const rawPos = String(row.pos || pInfo?.pos || '').trim().toUpperCase();
            const isG = rawPos === 'G';
            const prefix = isG ? 'G' : 'S';
            const hand = extractHandedness(pInfo, rObj);

            const nKey = `${prefix}:${normName(rawName)}`;
            registerEntry(nKey, yr, ovr, hand, rawName);

            const aKey = `${prefix}:${normAlias(rawName)}`;
            if (aKey !== nKey) {
              registerEntry(aKey, yr, ovr, hand, rawName);
            }
          });
        });

        setPlayerDbMap(compiled);
      } catch (err) {
        console.error('Error building league rosters matrix:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadYearsData();
    return () => {
      cancelled = true;
    };
  }, [years]);

  // 3. Build complete matrix rows in exact team & positional order (2 G, 5 F, 3 D)
  const allMatrixRows = useMemo<RosterMatrixPlayerRow[]>(() => {
    const rows: RosterMatrixPlayerRow[] = [];
    const goaliesByTeam = seasonConfig.goalies || {};
    const skatersByTeam = seasonConfig.skaters || {};

    const computeSummaryMetrics = (ovrByYear: Record<number, number | null>) => {
      const vals = Object.values(ovrByYear).filter((v): v is number => v !== null && v !== undefined && v > 0);
      if (vals.length === 0) return { peakOvr: null, avgOvr: null, activeYearsCount: 0 };
      const peakOvr = Math.max(...vals);
      const avgOvr = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      return { peakOvr, avgOvr, activeYearsCount: vals.length };
    };

    orderedTeamAbbrs.forEach((abbr) => {
      const meta = teamsMetaByAbbr[abbr];
      const defaultName =
        leagueType === 'W'
          ? W_TEAM_DEFAULT_NAMES[abbr] || W_LEAGUE_COACH_MAP[abbr]?.city || abbr
          : O_TEAM_DEFAULT_NAMES[abbr] || abbr;
      const teamName = meta?.team_name || defaultName;
      const coachName = meta?.coach_name || W_LEAGUE_COACH_MAP[abbr]?.coach_name || '';
      const coachId = meta?.coach_id || W_LEAGUE_COACH_MAP[abbr]?.coach_id || null;
      const posCounts =
        seasonConfig.teamPositionCounts?.[abbr] || seasonConfig.defaultPositionCounts || {
          goalies: 2,
          forwards: 5,
          defensemen: 3,
        };

      const teamGoalies = goaliesByTeam[abbr] || [];
      const teamSkaters = skatersByTeam[abbr] || [];

      teamGoalies.forEach((gName: string) => {
        const clean = String(gName || '').trim();
        if (!clean || clean === '--') return;
        const nKey = `G:${normName(clean)}`;
        const aKey = `G:${normAlias(clean)}`;
        const matched = playerDbMap.get(nKey) || playerDbMap.get(aKey);

        const ovrByYear: Record<number, number | null> = {};
        years.forEach((yr) => {
          ovrByYear[yr] = matched?.ovrByYear?.[yr] ?? null;
        });
        const { peakOvr, avgOvr, activeYearsCount } = computeSummaryMetrics(ovrByYear);

        rows.push({
          teamAbbr: abbr,
          teamName,
          teamId: meta?.team_id ?? null,
          coachName,
          coachId,
          bannerFilename: meta?.banner_filename,
          playerName: clean,
          displayPlayerName: DISPLAY_NAME_OVERRIDES[clean] || matched?.canonicalName || clean,
          pos: 'G',
          hand: matched?.hand || 'L',
          ovrByYear,
          peakOvr,
          avgOvr,
          activeYearsCount,
        });
      });

      const numForwards = posCounts.forwards || 5;
      teamSkaters.forEach((sName: string, idx: number) => {
        const clean = String(sName || '').trim();
        if (!clean || clean === '--') return;
        const pos: 'F' | 'D' = idx < numForwards ? 'F' : 'D';
        const nKey = `S:${normName(clean)}`;
        const aKey = `S:${normAlias(clean)}`;
        const matched = playerDbMap.get(nKey) || playerDbMap.get(aKey);

        const ovrByYear: Record<number, number | null> = {};
        years.forEach((yr) => {
          ovrByYear[yr] = matched?.ovrByYear?.[yr] ?? null;
        });
        const { peakOvr, avgOvr, activeYearsCount } = computeSummaryMetrics(ovrByYear);

        rows.push({
          teamAbbr: abbr,
          teamName,
          teamId: meta?.team_id ?? null,
          coachName,
          coachId,
          bannerFilename: meta?.banner_filename,
          playerName: clean,
          displayPlayerName: DISPLAY_NAME_OVERRIDES[clean] || matched?.canonicalName || clean,
          pos,
          hand: matched?.hand || 'L',
          ovrByYear,
          peakOvr,
          avgOvr,
          activeYearsCount,
        });
      });
    });

    return rows;
  }, [seasonConfig, orderedTeamAbbrs, teamsMetaByAbbr, leagueType, playerDbMap, years]);

  // 4. Filter rows by selected team, position, and search query
  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allMatrixRows.filter((r) => {
      if (selectedTeamAbbr !== 'ALL' && r.teamAbbr !== selectedTeamAbbr) return false;
      if (posFilter !== 'ALL' && r.pos !== posFilter) return false;
      if (q) {
        const matchPlayer = r.displayPlayerName.toLowerCase().includes(q) || r.playerName.toLowerCase().includes(q);
        const matchTeam = r.teamName.toLowerCase().includes(q) || r.teamAbbr.toLowerCase().includes(q);
        const matchCoach = (r.coachName || '').toLowerCase().includes(q);
        if (!matchPlayer && !matchTeam && !matchCoach) return false;
      }
      return true;
    });
  }, [allMatrixRows, selectedTeamAbbr, posFilter, searchQuery]);

  // Split rows into 2 balanced columns when splitColumns is enabled
  const splitGroups = useMemo(() => {
    if (!splitColumns || filteredRows.length <= 10) return [filteredRows];
    const mid = Math.ceil(filteredRows.length / 2);
    return [filteredRows.slice(0, mid), filteredRows.slice(mid)];
  }, [filteredRows, splitColumns]);

  const handleDownloadCsv = () => {
    const header = ['Team', 'Abbr', 'Coach', 'Player', 'Pos', 'H', 'Peak', 'Avg', ...years.map(String)].join(',');
    const lines = filteredRows.map((r) => {
      const yrVals = years.map((yr) => (r.ovrByYear[yr] !== null && r.ovrByYear[yr] !== undefined ? r.ovrByYear[yr] : ''));
      return [
        `"${r.teamName}"`,
        r.teamAbbr,
        `"${r.coachName || ''}"`,
        `"${r.displayPlayerName}"`,
        r.pos,
        r.hand,
        r.peakOvr ?? '',
        r.avgOvr ?? '',
        ...yrVals,
      ].join(',');
    });
    const csv = [header, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nhl95_${leagueType.toLowerCase()}_league_rosters.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderRosterTable = (rowsSlice: RosterMatrixPlayerRow[]) => (
    <table
      className="w-full table-fixed border-collapse select-text"
      style={{
        fontFamily: "'Arial Narrow', 'Roboto Condensed', 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      <thead>
        <tr className="bg-black text-white text-[12.5px] font-bold leading-none sticky top-0 z-20">
          <th className="bg-black border border-black w-[132px] py-1.5 px-1 text-center uppercase">
            Team
          </th>
          {!splitColumns && (
            <th className="bg-black border border-black w-[124px] py-1.5 px-1.5 text-left uppercase">
              Coach
            </th>
          )}
          <th className={`bg-black border border-black ${splitColumns ? 'w-[140px]' : 'w-[175px]'} py-1.5 px-2 text-left uppercase`}>
            Player
          </th>
          <th className="bg-black border border-black w-[34px] py-1.5 px-0.5 text-center">
            Pos
          </th>
          <th className="bg-black border border-black w-[26px] py-1.5 px-0.5 text-center">
            H
          </th>
          {!splitColumns && (
            <>
              <th className="bg-neutral-900 text-amber-300 border border-black w-[38px] py-1.5 px-0.5 text-center uppercase" title="Peak OVR across window">
                Peak
              </th>
              <th className="bg-neutral-900 text-cyan-300 border border-black w-[36px] py-1.5 px-0.5 text-center uppercase" title="Average OVR across active years">
                Avg
              </th>
            </>
          )}
          {years.map((yr) => (
            <th
              key={yr}
              className="bg-black border border-black py-1.5 px-0.5 text-center font-bold tracking-tight"
            >
              {yr}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rowsSlice.map((row, idx) => {
          const prevRow = idx > 0 ? rowsSlice[idx - 1] : null;
          const isNewTeamGroup = prevRow && prevRow.teamAbbr !== row.teamAbbr;

          return (
            <tr
              key={`${row.teamAbbr}-${row.pos}-${row.playerName}-${idx}`}
              className={`h-[22px] leading-none ${
                isNewTeamGroup ? 'border-t-2 border-t-black' : ''
              }`}
            >
              {/* Col A: Team Banner */}
              <td className="p-0 border border-[#bdbdbd] bg-black align-middle">
                <TeamBannerCell
                  abbr={row.teamAbbr}
                  teamName={row.teamName}
                  teamId={row.teamId}
                  seasonId={activeSeasonId}
                  isOriginalSix={leagueType === 'O'}
                  bannerFilename={row.bannerFilename}
                  onSelectTeam={(abbr) =>
                    setSelectedTeamAbbr((prev) => (prev === abbr ? 'ALL' : abbr))
                  }
                />
              </td>

              {/* Col B: Coach (links to Coach Profile) */}
              {!splitColumns && (
                <td className="bg-[#f9f6f0] text-black border border-[#d0d0d0] px-1.5 py-0 text-[12px] font-bold whitespace-nowrap align-middle truncate">
                  {row.coachName ? (
                    <Link
                      href={`/team?tab=coach&coach=${encodeURIComponent(row.coachName)}`}
                      className="hover:underline hover:text-red-800 block truncate"
                      title={`View Coach Profile: ${row.coachName}`}
                    >
                      {row.coachName}
                    </Link>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </td>
              )}

              {/* Col C: Player Name */}
              <td className="bg-white text-black border border-[#d0d0d0] px-1.5 py-0 text-[13px] font-semibold whitespace-nowrap align-middle truncate">
                <Link
                  href={`/players?q=${encodeURIComponent(row.displayPlayerName)}`}
                  className="hover:underline hover:text-blue-800 block truncate"
                  title={`View ${row.displayPlayerName} in Player Database`}
                >
                  {row.displayPlayerName}
                </Link>
              </td>

              {/* Col D: Position */}
              <td className="bg-black text-white border border-[#222222] text-center font-bold text-[12.5px] align-middle">
                {row.pos}
              </td>

              {/* Col E: Handedness */}
              <td className="bg-white text-black border border-[#d0d0d0] text-center font-semibold text-[12.5px] align-middle">
                {row.hand}
              </td>

              {/* Peak & Avg OVR */}
              {!splitColumns && (
                <>
                  <td
                    style={getOvrHeatmapStyle(row.peakOvr)}
                    className="text-center text-[12.5px] font-black border border-[#bdbdbd] align-middle"
                    title="Peak OVR"
                  >
                    {row.peakOvr ?? '—'}
                  </td>
                  <td
                    style={getOvrHeatmapStyle(row.avgOvr)}
                    className="text-center text-[12px] font-bold border border-[#bdbdbd] align-middle"
                    title="Average OVR"
                  >
                    {row.avgOvr ?? '—'}
                  </td>
                </>
              )}

              {/* Year OVR Cells */}
              {years.map((yr) => {
                const ovr = row.ovrByYear[yr];
                const hasOvr = ovr !== null && ovr !== undefined && ovr > 0;
                const cellStyle = getOvrHeatmapStyle(ovr);

                return (
                  <td
                    key={yr}
                    style={cellStyle}
                    className={`text-center text-[13px] font-semibold align-middle ${
                      hasOvr ? 'border border-[#d0d0d0]/80' : 'border border-black'
                    }`}
                  >
                    {hasOvr ? ovr : ''}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <div className="space-y-3">
      {/* Compact Zero-Dead-Space Control Bar */}
      <div className="bg-[#fdfaf5] border-2 border-black p-2.5 sm:p-3 shadow-[3px_3px_0px_rgba(0,0,0,1)] font-sans">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left: League Toggle + Search + Team Select + Position Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center border-2 border-black bg-white">
              <button
                type="button"
                onClick={() => setLeagueType('W')}
                className={`px-2.5 py-1 text-xs font-black uppercase cursor-pointer transition-colors ${
                  leagueType === 'W' ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
                }`}
              >
                W League (2013–24)
              </button>
              <button
                type="button"
                onClick={() => setLeagueType('O')}
                className={`px-2.5 py-1 text-xs font-black uppercase cursor-pointer transition-colors border-l border-black ${
                  leagueType === 'O' ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
                }`}
              >
                Original 6 (1927–38)
              </button>
            </div>

            <div className="relative w-48 sm:w-56">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="PLAYER, TEAM, OR COACH..."
                className="w-full bg-white border-2 border-black pl-7 pr-2 py-1 text-xs font-bold uppercase text-black outline-none"
              />
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2 top-1.5 pointer-events-none" />
            </div>

            <select
              value={selectedTeamAbbr}
              onChange={(e) => setSelectedTeamAbbr(e.target.value)}
              className="bg-white border-2 border-black px-2 py-1 text-xs font-black uppercase cursor-pointer outline-none max-w-[220px]"
            >
              <option value="ALL">ALL TEAMS ({orderedTeamAbbrs.length})</option>
              {orderedTeamAbbrs.map((abbr) => {
                const tName =
                  teamsMetaByAbbr[abbr]?.team_name ||
                  (leagueType === 'W' ? W_TEAM_DEFAULT_NAMES[abbr] : O_TEAM_DEFAULT_NAMES[abbr]) ||
                  abbr;
                const cName =
                  teamsMetaByAbbr[abbr]?.coach_name || W_LEAGUE_COACH_MAP[abbr]?.coach_name || '';
                return (
                  <option key={abbr} value={abbr}>
                    {abbr} — {tName} {cName ? `(${cName})` : ''}
                  </option>
                );
              })}
            </select>

            {/* Position Filter Buttons */}
            <div className="flex items-center border-2 border-black bg-white">
              {(['ALL', 'G', 'F', 'D'] as const).map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => setPosFilter(pos)}
                  className={`px-2 py-1 text-xs font-black uppercase cursor-pointer transition-colors ${
                    posFilter === pos ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
                  }`}
                >
                  {pos === 'ALL' ? 'All Pos' : pos}
                </button>
              ))}
            </div>

            {(selectedTeamAbbr !== 'ALL' || posFilter !== 'ALL' || searchQuery.trim() !== '') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTeamAbbr('ALL');
                  setPosFilter('ALL');
                  setSearchQuery('');
                }}
                className="bg-neutral-200 hover:bg-black hover:text-white text-black border border-black px-2 py-1 text-xs font-bold uppercase flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>

          {/* Right: OVR Scale Legend + 2-Col Split Toggle + Slot Count + CSV Export */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
            <div className="hidden xl:flex items-center gap-1 bg-white border border-black px-2 py-0.5">
              <span className="text-[10px] font-black uppercase text-neutral-600 mr-0.5">OVR:</span>
              <span className="px-1 py-0.5 text-[10px] font-bold border border-black/20" style={{ backgroundColor: '#57bb8a', color: '#000' }}>90+</span>
              <span className="px-1 py-0.5 text-[10px] font-bold border border-black/20" style={{ backgroundColor: '#a2d9be', color: '#000' }}>80–89</span>
              <span className="px-1 py-0.5 text-[10px] font-bold border border-black/20" style={{ backgroundColor: '#ffffff', color: '#000' }}>73–75</span>
              <span className="px-1 py-0.5 text-[10px] font-bold border border-black/20" style={{ backgroundColor: '#f2b8b5', color: '#000' }}>60–71</span>
              <span className="px-1 py-0.5 text-[10px] font-bold border border-black/20" style={{ backgroundColor: '#e06666', color: '#000' }}>&lt;60</span>
              <span className="px-1 py-0.5 text-[10px] font-bold bg-black text-white border border-black">Ret</span>
            </div>

            <button
              type="button"
              onClick={() => setSplitColumns((prev) => !prev)}
              className={`hidden lg:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-black uppercase border border-black cursor-pointer transition ${
                splitColumns ? 'bg-amber-400 text-black' : 'bg-white text-black hover:bg-neutral-100'
              }`}
              title="Toggle 1-Column Full Matrix vs 2-Column Side-by-Side Split"
            >
              {splitColumns ? <TableIcon className="w-3.5 h-3.5" /> : <Columns2 className="w-3.5 h-3.5" />}
              <span>{splitColumns ? '1-Col View' : '2-Col Split'}</span>
            </button>

            <span className="text-[11px] font-mono font-black text-black bg-white border border-black px-2 py-1 uppercase">
              {filteredRows.length} Slots
            </span>

            <button
              type="button"
              onClick={handleDownloadCsv}
              className="bg-black text-white hover:bg-neutral-800 px-2.5 py-1 text-xs font-black uppercase border border-black flex items-center gap-1 cursor-pointer"
              title="Download CSV Spreadsheet"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
          </div>
        </div>
      </div>

      {/* Spreadsheet Matrix Table(s) */}
      {loading ? (
        <div className="bg-white border-2 border-black p-10 text-center font-sans font-bold text-sm uppercase tracking-wider animate-pulse">
          Loading League Rosters &amp; Multi-Year OVR Matrix ({years[0]}–{years[years.length - 1]})...
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="bg-white border-2 border-black p-8 text-center font-sans font-bold text-sm uppercase text-neutral-600">
          No roster players match your current filter criteria.
        </div>
      ) : splitGroups.length === 2 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 items-start">
          {splitGroups.map((slice, sIdx) => (
            <div key={sIdx} className="bg-white border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] overflow-x-auto">
              {renderRosterTable(slice)}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] overflow-x-auto">
          {renderRosterTable(filteredRows)}
        </div>
      )}
    </div>
  );
}
