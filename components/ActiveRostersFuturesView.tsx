"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { W_SEASON_CONFIG, O_SEASON_CONFIG, W_LEAGUE_COACH_MAP } from '@/lib/seasons';
import { Search, Download, Filter, RotateCcw, Users, Columns2, Table as TableIcon, UserCheck, X, ArrowLeftRight, Plus, Undo2 } from 'lucide-react';

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
  slotId: string;
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
  isOpenSlot?: boolean;
  tradedFrom?: string;
  replacedFrom?: string;
  isCustomEdit?: boolean;
}

interface RosterPlannerState {
  removed: Record<string, true>;
  replaced: Record<string, { playerName: string; pos: 'G' | 'F' | 'D' }>;
}

const EMPTY_PLANNER_STATE: RosterPlannerState = { removed: {}, replaced: {} };

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
  const [posFilter, setPosFilter] = useState<'ALL' | 'G' | 'F' | 'D' | 'OPEN'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [splitColumns, setSplitColumns] = useState<boolean>(false);
  const [teamsMetaByAbbr, setTeamsMetaByAbbr] = useState<
    Record<string, { team_id?: number; team_name: string; coach_name?: string; coach_id?: number; banner_filename?: string }>
  >({});
  const [tradesRows, setTradesRows] = useState<any[]>([]);
  const [playerDbMap, setPlayerDbMap] = useState<
    Map<string, { pos: 'G' | 'F' | 'D'; hand: string; canonicalName: string; ovrByYear: Record<number, number> }>
  >(new Map());
  const [loading, setLoading] = useState<boolean>(true);
  const [plannerEdits, setPlannerEdits] = useState<RosterPlannerState>(EMPTY_PLANNER_STATE);
  const [pickerTarget, setPickerTarget] = useState<{
    slotId: string;
    teamAbbr: string;
    teamName: string;
    pos: 'G' | 'F' | 'D';
    currentName?: string;
  } | null>(null);
  const [pickerQuery, setPickerQuery] = useState<string>('');
  const [pickerPosFilter, setPickerPosFilter] = useState<'MATCH' | 'ALL'>('MATCH');

  // Persist interactive roster planner edits per league in localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(`nhl95_roster_planner_v1_${leagueType}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        setPlannerEdits({
          removed: parsed?.removed && typeof parsed.removed === 'object' ? parsed.removed : {},
          replaced: parsed?.replaced && typeof parsed.replaced === 'object' ? parsed.replaced : {},
        });
      } else {
        setPlannerEdits(EMPTY_PLANNER_STATE);
      }
    } catch {
      setPlannerEdits(EMPTY_PLANNER_STATE);
    }
  }, [leagueType]);

  const updatePlannerEdits = (updater: (prev: RosterPlannerState) => RosterPlannerState) => {
    setPlannerEdits((prev) => {
      const next = updater(prev);
      try {
        window.localStorage.setItem(`nhl95_roster_planner_v1_${leagueType}`, JSON.stringify(next));
      } catch {
        // ignore storage quota errors
      }
      return next;
    });
  };

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
        const [teamsRes, coachesRes, tradesRes] = await Promise.all([
          supabase.from('league_teams').select('*').in('league_id', [38, 39, 40]),
          supabase.from('league_coaches').select('coach_id, coach_name'),
          supabase.from('league_trades').select('*').order('trade id', { ascending: true }),
        ]);

        if (cancelled) return;
        setTradesRows(tradesRes.data || []);
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
          { pos: 'G' | 'F' | 'D'; hand: string; canonicalName: string; ovrByYear: Record<number, number> }
        >();

        const registerEntry = (
          key: string,
          pos: 'G' | 'F' | 'D',
          yr: number,
          ovr: number,
          hand: string,
          rawName: string
        ) => {
          let existing = compiled.get(key);
          if (!existing) {
            existing = {
              pos,
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
            const mappedPos: 'G' | 'F' | 'D' = isG ? 'G' : rawPos.includes('D') ? 'D' : 'F';
            const prefix = isG ? 'G' : 'S';
            const hand = extractHandedness(pInfo, rObj);

            const nKey = `${prefix}:${normName(rawName)}`;
            registerEntry(nKey, mappedPos, yr, ovr, hand, rawName);

            const aKey = `${prefix}:${normAlias(rawName)}`;
            if (aKey !== nKey) {
              registerEntry(aKey, mappedPos, yr, ovr, hand, rawName);
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

  // Searchable list of all DB players for the interactive replacement picker
  const allDbPlayersList = useMemo(() => {
    const seen = new Set<string>();
    const list: Array<{
      name: string;
      pos: 'G' | 'F' | 'D';
      hand: string;
      peakOvr: number;
      avgOvr: number;
    }> = [];

    playerDbMap.forEach((entry) => {
      const dedupKey = `${entry.pos === 'G' ? 'G' : 'S'}:${normName(entry.canonicalName)}`;
      if (seen.has(dedupKey)) return;
      seen.add(dedupKey);
      const vals = Object.values(entry.ovrByYear).filter((v) => v > 0);
      if (vals.length === 0) return;
      const peakOvr = Math.max(...vals);
      const avgOvr = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      list.push({
        name: entry.canonicalName,
        pos: entry.pos,
        hand: entry.hand || 'L',
        peakOvr,
        avgOvr,
      });
    });

    return list.sort((a, b) => b.peakOvr - a.peakOvr || b.avgOvr - a.avgOvr);
  }, [playerDbMap]);

  // 3. Build complete matrix rows in exact team & positional order (2 G, 5 F, 3 D),
  //    synced with confirmed league_trades and interactive planner edits
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

    // Build mutable per-team positional rosters starting from seasonConfig
    type TeamSlotEntry = { name: string; pos: 'G' | 'F' | 'D'; tradedFrom?: string };
    const rostersByTeam: Record<string, { G: TeamSlotEntry[]; F: TeamSlotEntry[]; D: TeamSlotEntry[] }> = {};

    orderedTeamAbbrs.forEach((abbr) => {
      const posCounts =
        seasonConfig.teamPositionCounts?.[abbr] || seasonConfig.defaultPositionCounts || {
          goalies: 2,
          forwards: 5,
          defensemen: 3,
        };
      const numForwards = posCounts.forwards || 5;
      const teamGoalies = (goaliesByTeam[abbr] || [])
        .map((n: string) => String(n || '').trim())
        .filter((n: string) => n && n !== '--')
        .map((name: string): TeamSlotEntry => ({ name, pos: 'G' }));

      const teamSkaters = (skatersByTeam[abbr] || [])
        .map((n: string) => String(n || '').trim())
        .filter((n: string) => n && n !== '--');

      const teamForwards: TeamSlotEntry[] = [];
      const teamDefense: TeamSlotEntry[] = [];
      teamSkaters.forEach((name: string, idx: number) => {
        if (idx < numForwards) {
          teamForwards.push({ name, pos: 'F' });
        } else {
          teamDefense.push({ name, pos: 'D' });
        }
      });

      rostersByTeam[abbr] = { G: teamGoalies, F: teamForwards, D: teamDefense };
    });

    // Apply confirmed player trades from league_trades chronologically
    const parseTradePlayers = (tradeStr: string): Array<{ pos: 'G' | 'F' | 'D'; name: string }> => {
      if (!tradeStr) return [];
      return tradeStr
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part && !/rdpk|pick|round|\b\d{4}\b/i.test(part))
        .map((part) => {
          const m = part.match(/^(F|D|G|LW|RW|C|LD|RD)\s+(.+)$/i);
          if (m) {
            const pRaw = m[1].toUpperCase();
            const pos: 'G' | 'F' | 'D' = pRaw === 'G' ? 'G' : pRaw.includes('D') ? 'D' : 'F';
            return { pos, name: m[2].trim() };
          }
          return { pos: 'F' as const, name: part };
        });
    };

    const sortedTrades = [...tradesRows].sort((a, b) => Number(a['trade id'] || 0) - Number(b['trade id'] || 0));
    sortedTrades.forEach((tr: any) => {
      const lg = String(tr.lg || '').trim().toUpperCase();
      if (leagueType === 'W') {
        if (!/^W(?:1[89]|2\d)/i.test(lg)) return;
      } else {
        if (!/^O0?[12345]/i.test(lg)) return;
      }

      const tA = String(tr.team || '').trim().toUpperCase();
      const tB = String(tr.team_1 || '').trim().toUpperCase();
      if (!tA || !tB) return;

      const movePlayers = (fromAbbr: string, toAbbr: string, assetsStr: string) => {
        const players = parseTradePlayers(assetsStr);
        const fromRoster = rostersByTeam[fromAbbr];
        const toRoster = rostersByTeam[toAbbr];
        if (!players.length) return;

        players.forEach((pl) => {
          const targetNorm = normName(pl.name);
          const targetAlias = normAlias(pl.name);
          let resolvedPos: 'G' | 'F' | 'D' = pl.pos;

          if (fromRoster) {
            for (const bucket of ['G', 'F', 'D'] as const) {
              const idx = fromRoster[bucket].findIndex(
                (item) => normName(item.name) === targetNorm || normAlias(item.name) === targetAlias
              );
              if (idx !== -1) {
                resolvedPos = fromRoster[bucket][idx].pos;
                fromRoster[bucket].splice(idx, 1);
                break;
              }
            }
          }

          if (toRoster) {
            const alreadyOnTeam = (['G', 'F', 'D'] as const).some((bucket) =>
              toRoster[bucket].some(
                (item) => normName(item.name) === targetNorm || normAlias(item.name) === targetAlias
              )
            );
            if (!alreadyOnTeam) {
              toRoster[resolvedPos].push({
                name: pl.name,
                pos: resolvedPos,
                tradedFrom: fromAbbr,
              });
            }
          }
        });
      };

      movePlayers(tA, tB, tr.trade);
      movePlayers(tB, tA, tr.trade_1);
    });

    const buildPlayerRow = (
      slotId: string,
      abbr: string,
      teamName: string,
      meta: any,
      coachName: string,
      coachId: number | null,
      playerName: string,
      pos: 'G' | 'F' | 'D',
      extras?: { isOpenSlot?: boolean; tradedFrom?: string; replacedFrom?: string; isCustomEdit?: boolean }
    ): RosterMatrixPlayerRow => {
      if (extras?.isOpenSlot) {
        const emptyYears: Record<number, number | null> = {};
        years.forEach((yr) => {
          emptyYears[yr] = null;
        });
        return {
          slotId,
          teamAbbr: abbr,
          teamName,
          teamId: meta?.team_id ?? null,
          coachName,
          coachId,
          bannerFilename: meta?.banner_filename,
          playerName: '',
          displayPlayerName: `OPEN ${pos} SPOT`,
          pos,
          hand: '—',
          ovrByYear: emptyYears,
          peakOvr: null,
          avgOvr: null,
          activeYearsCount: 0,
          isOpenSlot: true,
          replacedFrom: extras.replacedFrom,
          isCustomEdit: extras.isCustomEdit,
        };
      }

      const prefix = pos === 'G' ? 'G' : 'S';
      const nKey = `${prefix}:${normName(playerName)}`;
      const aKey = `${prefix}:${normAlias(playerName)}`;
      const matched = playerDbMap.get(nKey) || playerDbMap.get(aKey);

      const ovrByYear: Record<number, number | null> = {};
      years.forEach((yr) => {
        ovrByYear[yr] = matched?.ovrByYear?.[yr] ?? null;
      });
      const { peakOvr, avgOvr, activeYearsCount } = computeSummaryMetrics(ovrByYear);

      return {
        slotId,
        teamAbbr: abbr,
        teamName,
        teamId: meta?.team_id ?? null,
        coachName,
        coachId,
        bannerFilename: meta?.banner_filename,
        playerName,
        displayPlayerName: DISPLAY_NAME_OVERRIDES[playerName] || matched?.canonicalName || playerName,
        pos,
        hand: matched?.hand || 'L',
        ovrByYear,
        peakOvr,
        avgOvr,
        activeYearsCount,
        tradedFrom: extras?.tradedFrom,
        replacedFrom: extras?.replacedFrom,
        isCustomEdit: extras?.isCustomEdit,
      };
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

      const teamRoster = rostersByTeam[abbr] || { G: [], F: [], D: [] };
      const targetCounts: Record<'G' | 'F' | 'D', number> = {
        G: posCounts.goalies ?? 2,
        F: posCounts.forwards ?? 5,
        D: posCounts.defensemen ?? 3,
      };

      (['G', 'F', 'D'] as const).forEach((bucket) => {
        const list = teamRoster[bucket];
        const totalSlots = Math.max(list.length, targetCounts[bucket]);

        for (let i = 0; i < totalSlots; i++) {
          const entry = list[i];
          const slotId = entry
            ? `${abbr}:${bucket}:${normName(entry.name)}`
            : `${abbr}:${bucket}:open-${i}`;

          const customReplacement = plannerEdits.replaced[slotId];
          const isRemoved = Boolean(plannerEdits.removed[slotId]);

          if (customReplacement) {
            rows.push(
              buildPlayerRow(
                slotId,
                abbr,
                teamName,
                meta,
                coachName,
                coachId,
                customReplacement.playerName,
                bucket,
                {
                  replacedFrom: entry?.name,
                  isCustomEdit: true,
                }
              )
            );
          } else if (!entry || isRemoved) {
            rows.push(
              buildPlayerRow(slotId, abbr, teamName, meta, coachName, coachId, '', bucket, {
                isOpenSlot: true,
                replacedFrom: entry?.name,
                isCustomEdit: isRemoved,
              })
            );
          } else {
            rows.push(
              buildPlayerRow(slotId, abbr, teamName, meta, coachName, coachId, entry.name, bucket, {
                tradedFrom: entry.tradedFrom,
              })
            );
          }
        }
      });
    });

    return rows;
  }, [seasonConfig, orderedTeamAbbrs, teamsMetaByAbbr, leagueType, playerDbMap, years, tradesRows, plannerEdits]);

  const openSpotsCount = useMemo(
    () =>
      allMatrixRows.filter(
        (r) => r.isOpenSlot && (selectedTeamAbbr === 'ALL' || r.teamAbbr === selectedTeamAbbr)
      ).length,
    [allMatrixRows, selectedTeamAbbr]
  );

  const customEditsCount = useMemo(
    () => Object.keys(plannerEdits.removed).length + Object.keys(plannerEdits.replaced).length,
    [plannerEdits]
  );

  // 4. Filter rows by selected team, position, and search query
  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allMatrixRows.filter((r) => {
      if (selectedTeamAbbr !== 'ALL' && r.teamAbbr !== selectedTeamAbbr) return false;
      if (posFilter === 'OPEN') {
        if (!r.isOpenSlot) return false;
      } else if (posFilter !== 'ALL' && r.pos !== posFilter) {
        return false;
      }
      if (q) {
        const matchPlayer = r.displayPlayerName.toLowerCase().includes(q) || r.playerName.toLowerCase().includes(q);
        const matchTeam = r.teamName.toLowerCase().includes(q) || r.teamAbbr.toLowerCase().includes(q);
        const matchCoach = (r.coachName || '').toLowerCase().includes(q);
        if (!matchPlayer && !matchTeam && !matchCoach) return false;
      }
      return true;
    });
  }, [allMatrixRows, selectedTeamAbbr, posFilter, searchQuery]);

  const pickerFilteredPlayers = useMemo(() => {
    if (!pickerTarget) return [];
    const q = pickerQuery.trim().toLowerCase();
    return allDbPlayersList
      .filter((p) => {
        if (pickerPosFilter === 'MATCH' && p.pos !== pickerTarget.pos) return false;
        if (q && !p.name.toLowerCase().includes(q)) return false;
        return true;
      })
      .slice(0, 60);
  }, [pickerTarget, pickerQuery, pickerPosFilter, allDbPlayersList]);

  const handleRemovePlayerToOpen = (slotId: string) => {
    updatePlannerEdits((prev) => {
      const nextReplaced = { ...prev.replaced };
      delete nextReplaced[slotId];
      return {
        removed: { ...prev.removed, [slotId]: true },
        replaced: nextReplaced,
      };
    });
  };

  const handleRestoreSlot = (slotId: string) => {
    updatePlannerEdits((prev) => {
      const nextRemoved = { ...prev.removed };
      const nextReplaced = { ...prev.replaced };
      delete nextRemoved[slotId];
      delete nextReplaced[slotId];
      return { removed: nextRemoved, replaced: nextReplaced };
    });
  };

  const handleAssignReplacement = (slotId: string, playerName: string, pos: 'G' | 'F' | 'D') => {
    const clean = playerName.trim();
    if (!clean) return;
    updatePlannerEdits((prev) => {
      const nextRemoved = { ...prev.removed };
      delete nextRemoved[slotId];
      return {
        removed: nextRemoved,
        replaced: {
          ...prev.replaced,
          [slotId]: { playerName: clean, pos },
        },
      };
    });
    setPickerTarget(null);
    setPickerQuery('');
  };

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
          <th className={`bg-black border border-black ${splitColumns ? 'w-[175px]' : 'w-[225px]'} py-1.5 px-2 text-left uppercase`}>
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

              {/* Col C: Player Name + Trade / Open Slot / Remove & Replace Actions */}
              <td
                className={`border border-[#d0d0d0] px-1.5 py-0 text-[12.5px] font-semibold whitespace-nowrap align-middle ${
                  row.isOpenSlot
                    ? 'bg-amber-50 text-amber-950'
                    : row.isCustomEdit
                    ? 'bg-sky-50 text-black'
                    : 'bg-white text-black'
                }`}
              >
                <div className="flex items-center justify-between gap-1 group">
                  {row.isOpenSlot ? (
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-tight bg-amber-200 text-amber-950 border border-amber-500 px-1 py-0 shrink-0">
                        OPEN {row.pos}
                      </span>
                      {row.replacedFrom && (
                        <span className="text-[10px] text-neutral-500 line-through truncate" title={`Removed: ${row.replacedFrom}`}>
                          {row.replacedFrom}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 min-w-0">
                      <Link
                        href={`/players?q=${encodeURIComponent(row.displayPlayerName)}`}
                        className="hover:underline hover:text-blue-800 truncate"
                        title={`View ${row.displayPlayerName} in Player Database`}
                      >
                        {row.displayPlayerName}
                      </Link>
                      {row.tradedFrom && (
                        <span
                          className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-400 px-1 py-0 shrink-0"
                          title={`Acquired via trade from ${row.tradedFrom}`}
                        >
                          VIA {row.tradedFrom}
                        </span>
                      )}
                      {row.isCustomEdit && (
                        <span
                          className="text-[9px] font-black uppercase bg-sky-100 text-sky-900 border border-sky-400 px-1 py-0 shrink-0"
                          title={row.replacedFrom ? `Replaced ${row.replacedFrom}` : 'Custom planner replacement'}
                        >
                          PLAN
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-0.5 shrink-0">
                    {row.isCustomEdit && (
                      <button
                        type="button"
                        onClick={() => handleRestoreSlot(row.slotId)}
                        className="p-0.5 text-neutral-600 hover:text-black hover:bg-neutral-200 rounded-xs cursor-pointer"
                        title={row.replacedFrom ? `Restore ${row.replacedFrom}` : 'Restore slot'}
                      >
                        <Undo2 className="w-3 h-3" />
                      </button>
                    )}
                    {row.isOpenSlot ? (
                      <button
                        type="button"
                        onClick={() => {
                          setPickerTarget({
                            slotId: row.slotId,
                            teamAbbr: row.teamAbbr,
                            teamName: row.teamName,
                            pos: row.pos,
                          });
                          setPickerPosFilter('MATCH');
                          setPickerQuery('');
                        }}
                        className="px-1 py-0 text-[9.5px] font-black uppercase bg-black text-amber-300 hover:bg-neutral-800 border border-black cursor-pointer flex items-center gap-0.5"
                        title="Fill open spot with a player"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        Fill
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setPickerTarget({
                              slotId: row.slotId,
                              teamAbbr: row.teamAbbr,
                              teamName: row.teamName,
                              pos: row.pos,
                              currentName: row.displayPlayerName,
                            });
                            setPickerPosFilter('MATCH');
                            setPickerQuery('');
                          }}
                          className="opacity-40 group-hover:opacity-100 p-0.5 text-blue-700 hover:bg-blue-100 rounded-xs cursor-pointer transition-opacity"
                          title={`Replace ${row.displayPlayerName}`}
                        >
                          <ArrowLeftRight className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemovePlayerToOpen(row.slotId)}
                          className="opacity-40 group-hover:opacity-100 p-0.5 text-red-700 hover:bg-red-100 rounded-xs cursor-pointer transition-opacity"
                          title={`Remove ${row.displayPlayerName} (create open ${row.pos} spot)`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
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
              {(['ALL', 'G', 'F', 'D', 'OPEN'] as const).map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => setPosFilter(pos)}
                  className={`px-2 py-1 text-xs font-black uppercase cursor-pointer transition-colors ${
                    posFilter === pos
                      ? pos === 'OPEN'
                        ? 'bg-amber-400 text-black'
                        : 'bg-black text-white'
                      : 'bg-white text-black hover:bg-neutral-100'
                  }`}
                >
                  {pos === 'ALL' ? 'All Pos' : pos === 'OPEN' ? `Open (${openSpotsCount})` : pos}
                </button>
              ))}
            </div>

            {customEditsCount > 0 && (
              <button
                type="button"
                onClick={() => updatePlannerEdits(() => EMPTY_PLANNER_STATE)}
                className="bg-sky-100 hover:bg-sky-200 text-sky-950 border-2 border-black px-2 py-1 text-xs font-black uppercase flex items-center gap-1 cursor-pointer transition-colors"
                title="Clear all custom roster planner removals and replacements"
              >
                <Undo2 className="w-3 h-3" />
                Reset Plan ({customEditsCount})
              </button>
            )}

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

      {/* Interactive Player Replacement / Fill Open Spot Modal */}
      {pickerTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setPickerTarget(null)}
        >
          <div
            className="bg-[#fdfaf5] border-2 border-black shadow-[6px_6px_0px_rgba(0,0,0,1)] w-full max-w-lg max-h-[85vh] flex flex-col font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-black text-white px-3.5 py-2.5 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                  {pickerTarget.teamAbbr} — {pickerTarget.teamName}
                </div>
                <div className="text-sm font-black uppercase">
                  {pickerTarget.currentName
                    ? `Replace ${pickerTarget.currentName} (${pickerTarget.pos})`
                    : `Fill Open ${pickerTarget.pos} Roster Spot`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPickerTarget(null)}
                className="p-1 hover:bg-neutral-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-black/20 space-y-2 bg-white">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2 pointer-events-none" />
                  <input
                    type="text"
                    autoFocus
                    value={pickerQuery}
                    onChange={(e) => setPickerQuery(e.target.value)}
                    placeholder="SEARCH PLAYER OR TYPE CUSTOM NAME..."
                    className="w-full border-2 border-black pl-8 pr-2.5 py-1 text-xs font-bold uppercase outline-none bg-white text-black"
                  />
                </div>
                <div className="flex items-center border-2 border-black bg-white">
                  <button
                    type="button"
                    onClick={() => setPickerPosFilter('MATCH')}
                    className={`px-2 py-1 text-[10px] font-black uppercase cursor-pointer ${
                      pickerPosFilter === 'MATCH' ? 'bg-black text-white' : 'bg-white text-black'
                    }`}
                  >
                    {pickerTarget.pos} Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickerPosFilter('ALL')}
                    className={`px-2 py-1 text-[10px] font-black uppercase cursor-pointer border-l border-black ${
                      pickerPosFilter === 'ALL' ? 'bg-black text-white' : 'bg-white text-black'
                    }`}
                  >
                    All
                  </button>
                </div>
              </div>

              {pickerQuery.trim() && (
                <button
                  type="button"
                  onClick={() =>
                    handleAssignReplacement(pickerTarget.slotId, pickerQuery.trim(), pickerTarget.pos)
                  }
                  className="w-full text-left px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 border border-black text-xs font-black uppercase flex items-center justify-between cursor-pointer"
                >
                  <span>Use &ldquo;{pickerQuery.trim()}&rdquo; as {pickerTarget.pos}</span>
                  <span className="text-[10px] bg-black text-amber-300 px-1.5 py-0.5">+ Place</span>
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-neutral-200 bg-white">
              {pickerFilteredPlayers.length === 0 ? (
                <div className="p-6 text-center text-xs font-bold uppercase text-neutral-500">
                  No matching players found in {years[0]}–{years[years.length - 1]} database.
                </div>
              ) : (
                pickerFilteredPlayers.map((pl) => (
                  <button
                    key={`${pl.pos}-${pl.name}`}
                    type="button"
                    onClick={() => handleAssignReplacement(pickerTarget.slotId, pl.name, pickerTarget.pos)}
                    className="w-full px-3 py-1.5 text-left hover:bg-yellow-50 flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="bg-black text-white text-[10px] font-black px-1.5 py-0.5 w-6 text-center shrink-0">
                        {pl.pos}
                      </span>
                      <span className="text-xs font-bold text-black truncate">{pl.name}</span>
                      <span className="text-[10px] font-mono text-neutral-500 shrink-0">({pl.hand})</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px] font-black">
                      <span className="bg-emerald-100 border border-emerald-400 px-1.5 py-0.5 text-emerald-950">
                        PK {pl.peakOvr}
                      </span>
                      <span className="bg-neutral-100 border border-neutral-300 px-1.5 py-0.5 text-neutral-800">
                        AVG {pl.avgOvr}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
