"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useCoachAuth } from '@/lib/coach-auth';
import Link from 'next/link';
import {
  Search,
  Shield,
  Trophy,
  ExternalLink,
  Swords,
  ArrowLeftRight,
  X,
  UserCheck,
  Award,
  Layers
} from 'lucide-react';

export const LEAGUE_LOGOS: Record<string, { name: string; logoUrl: string; fallbackUrl?: string }> = {
  W: {
    name: 'W League',
    logoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/WN95HL.png',
    fallbackUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/WN95HL.png'
  },
  Q: {
    name: 'The Q',
    logoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/TheQ.png',
    fallbackUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/TheQ.png'
  },
  O: {
    name: 'Original 6',
    logoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/Original%206.png',
    fallbackUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Original%206.png'
  },
  V: {
    name: 'Vintage',
    logoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/Vintage.png',
    fallbackUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Vintage.png'
  },
  G: {
    name: 'Golden Era',
    logoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/Golden%20Era.png',
    fallbackUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Golden%20Era.png'
  }
};

const SEASON_TYPES: Record<number, string> = {
  1: 'W', 2: 'W', 3: 'W', 4: 'W', 5: 'Q', 6: 'W', 7: 'Q', 8: 'Q', 9: 'W', 10: 'Q',
  11: 'W', 12: 'Q', 13: 'Q', 14: 'W', 15: 'Q', 16: 'G', 17: 'Q', 18: 'W', 19: 'Q', 20: 'V',
  21: 'Q', 22: 'W', 23: 'Q', 24: 'W', 25: 'Q', 26: 'Q', 27: 'Q', 28: 'W', 29: 'Q', 30: 'Q',
  31: 'W', 32: 'Q', 33: 'W', 34: 'Q', 35: 'W', 36: 'Q', 37: 'W', 38: 'W', 39: 'O', 40: 'W'
};

export const W_LEAGUE_COACH_FALLBACK: Record<string, { coach_id: number; coach_name: string }> = {
  AUT: { coach_id: 2, coach_name: 'Autobahn' },
  BAR: { coach_id: 65, coach_name: 'Dasri' },
  BAY: { coach_id: 49, coach_name: 'Jer_33' },
  BFC: { coach_id: 58, coach_name: 'Krav1' },
  DHG: { coach_id: 67, coach_name: 'vancecookcobxin' },
  GRH: { coach_id: 25, coach_name: 'Moses Bogart' },
  HAM: { coach_id: 37, coach_name: 'Derek Sutton' },
  HIG: { coach_id: 9, coach_name: 'wolf_of_highland' },
  ING: { coach_id: 50, coach_name: 'Don Don' },
  ITA: { coach_id: 14, coach_name: 'Marcus Vick EBC' },
  KAR: { coach_id: 39, coach_name: 'MattyA' },
  MHA: { coach_id: 54, coach_name: 'red' },
  MHT: { coach_id: 13, coach_name: 'segathon' },
  MGG: { coach_id: 12, coach_name: 'gaelicgopher' },
  NBK: { coach_id: 26, coach_name: 'Unholy Grail' },
  OCW: { coach_id: 51, coach_name: 'MNYoda84' },
  PIT: { coach_id: 17, coach_name: 'Adolf Oliver Nipples' },
  PRO: { coach_id: 30, coach_name: 'Lloyd10Xmas' },
  RIC: { coach_id: 19, coach_name: 'bclinton_666' },
  ROC: { coach_id: 66, coach_name: 'The Villain CTJ' },
  SHS: { coach_id: 60, coach_name: 'marylandmike.' },
  SVF: { coach_id: 20, coach_name: 'Chalkitup7777' },
  SUM: { coach_id: 21, coach_name: 'Pink Elephants' },
  TAI: { coach_id: 28, coach_name: 'NathanMB' },
  TEG: { coach_id: 24, coach_name: 'Ticklepuss' },
  TBP: { coach_id: 29, coach_name: 'shawnbell' },
  VHV: { coach_id: 15, coach_name: 'UltraMagnus' },
  WDY: { coach_id: 63, coach_name: 'NewJerseyKiller' },
  ETI: { coach_id: 18, coach_name: 'LHX' }
};

const getLeaguePrefix = (leagueId: number | string, seasonName?: string) => {
  if (seasonName) {
    const trimmed = seasonName.trim().toUpperCase();
    const match = trimmed.match(/^[A-Z]+/);
    if (match && match[0] && LEAGUE_LOGOS[match[0]]) return match[0];
  }
  const idNum = Number(leagueId);
  if (SEASON_TYPES[idNum]) return SEASON_TYPES[idNum];
  return 'W';
};

const formatSeasonBadge = (seasonId: number | string, seasonName?: string) => {
  if (seasonName) {
    const trimmed = seasonName.trim();
    const match = trimmed.match(/^([A-Za-z]+)\s*(\d+)$/);
    if (match) {
      const prefix = match[1].toUpperCase();
      const num = match[2].padStart(2, '0');
      return `${prefix}${num}`;
    }
    if (/^[A-Za-z]\d+$/i.test(trimmed)) {
      return trimmed.toUpperCase();
    }
  }
  const numId = Number(seasonId);
  const type = SEASON_TYPES[numId] || 'W';
  return `${type}${String(numId).padStart(2, '0')}`;
};

export interface CoachTeamInfo {
  team_id: number;
  team_name: string;
  abbreviation: string;
  logo_url: string | null;
  league_id: number;
  season_name: string;
  season_badge: string;
  league_type: string;
  arena_name?: string;
}

export interface GroupedCoachFranchise {
  key: string;
  primary_team_id: number;
  latest_league_id: number;
  latest_season_badge: string;
  team_name: string;
  abbreviation: string;
  logo_url: string | null;
  league_type: string;
  arena_name: string;
  seasons_count: number;
  season_badges: string[];
  team_ids: number[];
  gp: number;
  w: number;
  l: number;
  t: number;
  otl: number;
  pts: number;
  gf: number;
  ga: number;
  gd: number;
}

export interface CoachEntry {
  coach_id: number;
  coach_name: string;
  discord_tag?: string;
  teams: CoachTeamInfo[];
  franchises: GroupedCoachFranchise[];
}

interface CoachMatchRecord {
  id: string;
  game_id: number | string;
  league_id: number;
  season_badge: string;
  season_name: string;
  league_type: string;
  is_playoff: boolean;
  round_label?: string;
  home_coach_id: number;
  home_coach_name: string;
  away_coach_id: number;
  away_coach_name: string;
  home_team_id: number;
  home_team_name: string;
  home_team_abbr: string;
  home_team_logo: string | null;
  away_team_id: number;
  away_team_name: string;
  away_team_abbr: string;
  away_team_logo: string | null;
  home_score: number;
  away_score: number;
  home_shots: number | null;
  away_shots: number | null;
  is_ot: boolean;
  is_tie: boolean;
}

interface OpponentH2HSummary {
  opponentId: number;
  opponentName: string;
  opponentTeams: string[];
  gp: number;
  w: number;
  l: number;
  t: number;
  otl: number;
  pts: number;
  winPct: number;
  gf: number;
  ga: number;
  gd: number;
  gpg: number;
  homeW: number;
  homeL: number;
  homeT: number;
  homeOtl: number;
  awayW: number;
  awayL: number;
  awayT: number;
  awayOtl: number;
  otW: number;
  otL: number;
  poW: number;
  poL: number;
  streak: string;
  recentOutcomes: Array<'W' | 'L' | 'T' | 'OTL'>;
  lastGame: {
    outcome: 'W' | 'L' | 'T' | 'OTL';
    myScore: number;
    oppScore: number;
    seasonBadge: string;
    isOT: boolean;
    isPlayoff: boolean;
  } | null;
}

function normalizeCoachStr(name: string): string {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '');
}

export interface CoachProfileViewProps {
  initialCoachId?: number | null;
  initialCoachName?: string;
  embeddedOnTeamPage?: boolean;
  hideHeader?: boolean;
}

export default function CoachProfileView({
  initialCoachId = null,
  initialCoachName = '',
  embeddedOnTeamPage = false,
  hideHeader = false,
}: CoachProfileViewProps) {
  const { currentCoach } = useCoachAuth();
  const h2hSectionRef = useRef<HTMLDivElement>(null);

  const [coaches, setCoaches] = useState<CoachEntry[]>([]);
  const [allMatches, setAllMatches] = useState<CoachMatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLeagueType, setSelectedLeagueType] = useState<string>('ALL');

  // Head-to-Head State
  const [selectedCoachId, setSelectedCoachId] = useState<number | null>(initialCoachId);
  const [selectedOpponentId, setSelectedOpponentId] = useState<number | 'ALL'>('ALL');
  const [h2hPhaseFilter, setH2hPhaseFilter] = useState<'ALL' | 'REG' | 'PLAYOFFS'>('ALL');
  const [h2hOpponentSearch, setH2hOpponentSearch] = useState('');
  const [h2hSortField, setH2hSortField] = useState<'gp' | 'w' | 'pts' | 'winPct' | 'gf' | 'gd'>('gp');
  const [recentScoresLimit, setRecentScoresLimit] = useState<number>(20);
  const [showDirectoryGrid, setShowDirectoryGrid] = useState<boolean>(!embeddedOnTeamPage);

  const availableLeagueTypes = ['W', 'Q', 'O', 'V', 'G'];

  useEffect(() => {
    if (initialCoachId) {
      setSelectedCoachId(Number(initialCoachId));
    }
  }, [initialCoachId]);

  useEffect(() => {
    async function loadCoachProfileAndH2HData() {
      setLoading(true);
      try {
        const REG_COLS =
          'game_id, league_id, home_team_id, away_team_id, home_coach_id, away_coach_id, home_coach, away_coach, home_score, away_score, game_meta';
        const PO_COLS =
          'game_id, playoff_id, game_number, league_id, home_team_id, away_team_id, home_coach_id, away_coach_id, home_coach, away_coach, home_score, away_score, game_meta';

        const fetchAllTableRows = async (
          table: string,
          cols: string,
          batchConcurrency: number = 4
        ): Promise<any[]> => {
          const allRows: any[] = [];
          let pageOffset = 0;
          let keepGoing = true;

          const fetchSinglePage = async (pageIdx: number): Promise<any[]> => {
            const from = pageIdx * 1000;
            const to = from + 999;
            for (let attempt = 0; attempt < 3; attempt++) {
              const res = await supabase
                .from(table)
                .select(cols)
                .order('game_id', { ascending: true })
                .range(from, to);
              if (!res.error && Array.isArray(res.data)) {
                return res.data;
              }
            }
            return [];
          };

          while (keepGoing) {
            const batchResults = await Promise.all(
              Array.from({ length: batchConcurrency }, (_, idx) => fetchSinglePage(pageOffset + idx))
            );
            for (const pageRows of batchResults) {
              allRows.push(...pageRows);
              if (pageRows.length < 1000) {
                keepGoing = false;
              }
            }
            pageOffset += batchConcurrency;
          }

          return allRows;
        };

        const [
          coachesRes,
          teamsRes,
          seasonsRes,
          regGameRows,
          poGameRows,
          schedRows
        ] = await Promise.all([
          supabase
            .from('league_coaches')
            .select('*')
            .order('coach_name', { ascending: true }),
          supabase
            .from('league_teams')
            .select('*')
            .order('league_id', { ascending: false }),
          supabase
            .from('leagues')
            .select('league_id, league_name')
            .order('league_id', { ascending: false }),
          fetchAllTableRows('league_gamestats', REG_COLS, 6),
          fetchAllTableRows('league_playoff_gamestats', PO_COLS, 3),
          fetchAllTableRows(
            'league_schedule',
            'game_id, league_id, home_team_id, away_team_id, home_score, away_score, game_meta, played',
            3
          )
        ]);

        const rawCoaches = coachesRes.data || [];
        const rawTeams = teamsRes.data || [];
        const rawSeasons = (seasonsRes.data || []).map((l: any) => ({
          league_id: l.league_id,
          season_name: l.league_name || `Season ${l.league_id}`
        }));

        const seasonMap = new Map<number, string>();
        rawSeasons.forEach((s: any) => {
          seasonMap.set(Number(s.league_id), s.season_name);
        });

        const coachMap = new Map<number, CoachEntry>();
        const coachNameLookup = new Map<string, number>();

        rawCoaches.forEach((c: any) => {
          const cId = Number(c.coach_id);
          const cName = c.coach_name || `Coach #${cId}`;
          coachMap.set(cId, {
            coach_id: cId,
            coach_name: cName,
            discord_tag: c.discord_tag || c.discord_name || c.coach_tag || c.discord_handle || undefined,
            teams: [],
            franchises: []
          });
          coachNameLookup.set(normalizeCoachStr(cName), cId);
        });

        const seasonTeamMap = new Map<string, CoachTeamInfo & { coach_id: number }>();
        const anyTeamIdMap = new Map<number, CoachTeamInfo & { coach_id: number }>();

        rawTeams.forEach((t: any) => {
          let cId = Number(t.coach_id);
          const tLeagueId = Number(t.league_id) || 1;
          const sName = seasonMap.get(tLeagueId) || `Season ${tLeagueId}`;
          const lType = getLeaguePrefix(tLeagueId, sName);
          const sBadge = formatSeasonBadge(tLeagueId, sName);
          const abbr = (t.abbreviation || 'TM').trim().toUpperCase();

          let arenaName = t.arena || t.arena_name || '';
          if (!arenaName && t.team_meta) {
            if (typeof t.team_meta === 'object') {
              arenaName = t.team_meta.arena || t.team_meta.arena_name || t.team_meta.stadium || '';
            } else if (typeof t.team_meta === 'string') {
              try {
                const parsed = JSON.parse(t.team_meta);
                arenaName = parsed.arena || parsed.arena_name || parsed.stadium || '';
              } catch {
                arenaName = t.team_meta;
              }
            }
          }

          if ((!cId || !coachMap.has(cId)) && t.coach_name) {
            const matchedByName = coachNameLookup.get(normalizeCoachStr(t.coach_name));
            if (matchedByName) cId = matchedByName;
          }
          if ((!cId || !coachMap.has(cId)) && lType === 'W' && W_LEAGUE_COACH_FALLBACK[abbr]) {
            const fb = W_LEAGUE_COACH_FALLBACK[abbr];
            const matchedByFbName = coachNameLookup.get(normalizeCoachStr(fb.coach_name));
            cId = matchedByFbName || fb.coach_id;
          }

          const teamInfo: CoachTeamInfo = {
            team_id: Number(t.team_id),
            team_name: t.team_name || `Team #${t.team_id}`,
            abbreviation: abbr,
            logo_url: t.logo_url || null,
            league_id: tLeagueId,
            season_name: sName,
            season_badge: sBadge,
            league_type: lType,
            arena_name: arenaName || undefined
          };

          if (cId && coachMap.has(cId)) {
            const entry = coachMap.get(cId)!;
            if (!entry.teams.some(existing => existing.team_id === teamInfo.team_id && existing.league_id === teamInfo.league_id)) {
              entry.teams.push(teamInfo);
            }
          } else if (t.coach_name && cId) {
            coachMap.set(cId, {
              coach_id: cId,
              coach_name: t.coach_name,
              teams: [teamInfo],
              franchises: []
            });
            coachNameLookup.set(normalizeCoachStr(t.coach_name), cId);
          }

          if (cId && coachMap.has(cId)) {
            seasonTeamMap.set(`${tLeagueId}-${teamInfo.team_id}`, { ...teamInfo, coach_id: cId });
            if (!anyTeamIdMap.has(teamInfo.team_id)) {
              anyTeamIdMap.set(teamInfo.team_id, { ...teamInfo, coach_id: cId });
            }
          } else {
            anyTeamIdMap.set(teamInfo.team_id, { ...teamInfo, coach_id: cId || 0 });
          }
        });

        const resolveSide = (
          sId: number,
          rawTeamId: any,
          rawCoachId?: any,
          rawCoachName?: any
        ): {
          coach_id: number;
          coach_name: string;
          team_id: number;
          team_name: string;
          abbreviation: string;
          logo_url: string | null;
        } | null => {
          const numTeamId = Number(rawTeamId);
          const explicitCoachId = Number(rawCoachId);
          const directTeam = numTeamId ? (seasonTeamMap.get(`${sId}-${numTeamId}`) || anyTeamIdMap.get(numTeamId)) : undefined;

          let resolvedCoachId = 0;
          if (explicitCoachId && coachMap.has(explicitCoachId)) {
            resolvedCoachId = explicitCoachId;
          } else if (rawCoachName) {
            const byName = coachNameLookup.get(normalizeCoachStr(String(rawCoachName)));
            if (byName && coachMap.has(byName)) {
              resolvedCoachId = byName;
            }
          }

          if (!resolvedCoachId && directTeam?.coach_id && coachMap.has(directTeam.coach_id)) {
            resolvedCoachId = directTeam.coach_id;
          }

          if (!resolvedCoachId && numTeamId) {
            const matchTeam = rawTeams.find(
              (t: any) => Number(t.team_id) === numTeamId || Number(t.coach_id) === numTeamId
            );
            if (matchTeam && Number(matchTeam.coach_id) && coachMap.has(Number(matchTeam.coach_id))) {
              resolvedCoachId = Number(matchTeam.coach_id);
            }
          }

          if (!resolvedCoachId && explicitCoachId && rawCoachName) {
            const cleanName = String(rawCoachName).trim();
            coachMap.set(explicitCoachId, {
              coach_id: explicitCoachId,
              coach_name: cleanName,
              teams: directTeam ? [directTeam] : [],
              franchises: []
            });
            coachNameLookup.set(normalizeCoachStr(cleanName), explicitCoachId);
            resolvedCoachId = explicitCoachId;
          }

          if (!resolvedCoachId || !coachMap.has(resolvedCoachId)) return null;

          const c = coachMap.get(resolvedCoachId)!;
          const teamForMatch =
            directTeam ||
            c.teams.find(t => t.league_id === sId) ||
            c.teams[0];

          return {
            coach_id: c.coach_id,
            coach_name: c.coach_name,
            team_id: teamForMatch?.team_id || numTeamId || 0,
            team_name: teamForMatch?.team_name || `Team #${numTeamId || c.coach_id}`,
            abbreviation: (teamForMatch?.abbreviation || `TM`).toUpperCase(),
            logo_url: teamForMatch?.logo_url || null
          };
        };

        const parseGameDetails = (row: any, homeScore: number, awayScore: number) => {
          let isOT = false;
          let isTie = false;

          if (row.game_meta) {
            try {
              const meta =
                typeof row.game_meta === 'string' ? JSON.parse(row.game_meta) : row.game_meta;
              isOT =
                meta?.is_ot === true ||
                meta?.is_ot === 'true' ||
                meta?.is_ot === 1 ||
                meta?.is_ot === '1' ||
                meta?.isOT === true ||
                meta?.isOT === 'true' ||
                meta?.isOT === 1;
              isTie =
                meta?.is_tie === true ||
                meta?.is_tie === 'true' ||
                meta?.is_tie === 1 ||
                meta?.is_tie === '1';
            } catch {
              const lowStr = String(row.game_meta || '').toLowerCase();
              isOT =
                lowStr.includes('"is_ot":true') ||
                lowStr.includes('"is_ot":"true"') ||
                lowStr.includes('"is_ot":1') ||
                lowStr.includes('"isot":true');
              isTie =
                lowStr.includes('"is_tie":true') ||
                lowStr.includes('"is_tie":"true"') ||
                lowStr.includes('"is_tie":1');
            }
          }

          if (homeScore === awayScore) {
            isTie = true;
          }

          return { isOT, isTie, homeShots: null, awayShots: null };
        };

        const compiledMatches: CoachMatchRecord[] = [];
        const seenRegKeys = new Set<string>();

        regGameRows.forEach((row: any) => {
          const sId = Number(row.league_id) || 1;
          const gIdStr = String(row.game_id).trim();
          const key = `reg-${sId}-${gIdStr}`;
          if (seenRegKeys.has(key)) return;
          seenRegKeys.add(key);

          if (row.home_score === null || row.home_score === undefined || row.away_score === null || row.away_score === undefined) {
            return;
          }
          const homeScore = Number(row.home_score);
          const awayScore = Number(row.away_score);
          if (isNaN(homeScore) || isNaN(awayScore)) return;

          const homeSide = resolveSide(sId, row.home_team_id, row.home_coach_id, row.home_coach);
          const awaySide = resolveSide(sId, row.away_team_id, row.away_coach_id, row.away_coach);
          if (!homeSide || !awaySide || homeSide.coach_id === awaySide.coach_id) return;

          const sName = seasonMap.get(sId) || `Season ${sId}`;
          const sBadge = formatSeasonBadge(sId, sName);
          const lType = getLeaguePrefix(sId, sName);
          const { isOT, isTie, homeShots, awayShots } = parseGameDetails(row, homeScore, awayScore);

          compiledMatches.push({
            id: key,
            game_id: row.game_id,
            league_id: sId,
            season_badge: sBadge,
            season_name: sName,
            league_type: lType,
            is_playoff: false,
            home_coach_id: homeSide.coach_id,
            home_coach_name: homeSide.coach_name,
            away_coach_id: awaySide.coach_id,
            away_coach_name: awaySide.coach_name,
            home_team_id: homeSide.team_id,
            home_team_name: homeSide.team_name,
            home_team_abbr: homeSide.abbreviation,
            home_team_logo: homeSide.logo_url,
            away_team_id: awaySide.team_id,
            away_team_name: awaySide.team_name,
            away_team_abbr: awaySide.abbreviation,
            away_team_logo: awaySide.logo_url,
            home_score: homeScore,
            away_score: awayScore,
            home_shots: homeShots,
            away_shots: awayShots,
            is_ot: isOT,
            is_tie: isTie
          });
        });

        schedRows.forEach((row: any) => {
          if (row.home_score === null || row.home_score === undefined || row.away_score === null || row.away_score === undefined) {
            return;
          }
          const rawPlayed = String(row.played ?? '').trim().toLowerCase();
          const isPlayed =
            rawPlayed === 'true' || rawPlayed === '1' || rawPlayed === 'y' || rawPlayed === 'yes';
          if (!isPlayed) return;

          const sId = Number(row.league_id) || 1;
          const gIdStr = String(row.game_id).trim();
          const key = `reg-${sId}-${gIdStr}`;
          if (seenRegKeys.has(key)) return;
          seenRegKeys.add(key);

          const homeScore = Number(row.home_score);
          const awayScore = Number(row.away_score);
          if (isNaN(homeScore) || isNaN(awayScore)) return;

          const homeSide = resolveSide(sId, row.home_team_id);
          const awaySide = resolveSide(sId, row.away_team_id);
          if (!homeSide || !awaySide || homeSide.coach_id === awaySide.coach_id) return;

          const sName = seasonMap.get(sId) || `Season ${sId}`;
          const sBadge = formatSeasonBadge(sId, sName);
          const lType = getLeaguePrefix(sId, sName);
          const { isOT, isTie, homeShots, awayShots } = parseGameDetails(row, homeScore, awayScore);

          compiledMatches.push({
            id: key,
            game_id: row.game_id,
            league_id: sId,
            season_badge: sBadge,
            season_name: sName,
            league_type: lType,
            is_playoff: false,
            home_coach_id: homeSide.coach_id,
            home_coach_name: homeSide.coach_name,
            away_coach_id: awaySide.coach_id,
            away_coach_name: awaySide.coach_name,
            home_team_id: homeSide.team_id,
            home_team_name: homeSide.team_name,
            home_team_abbr: homeSide.abbreviation,
            home_team_logo: homeSide.logo_url,
            away_team_id: awaySide.team_id,
            away_team_name: awaySide.team_name,
            away_team_abbr: awaySide.abbreviation,
            away_team_logo: awaySide.logo_url,
            home_score: homeScore,
            away_score: awayScore,
            home_shots: homeShots,
            away_shots: awayShots,
            is_ot: isOT,
            is_tie: isTie
          });
        });

        const seenPoKeys = new Set<string>();
        poGameRows.forEach((row: any) => {
          const sId = Number(row.league_id) || 1;
          const gIdStr = String(row.game_id).trim();
          const key = `po-${sId}-${gIdStr}`;
          if (seenPoKeys.has(key)) return;
          seenPoKeys.add(key);

          if (row.home_score === null || row.home_score === undefined || row.away_score === null || row.away_score === undefined) {
            return;
          }
          const homeScore = Number(row.home_score);
          const awayScore = Number(row.away_score);
          if (isNaN(homeScore) || isNaN(awayScore)) return;

          const homeSide = resolveSide(sId, row.home_team_id, row.home_coach_id, row.home_coach);
          const awaySide = resolveSide(sId, row.away_team_id, row.away_coach_id, row.away_coach);
          if (!homeSide || !awaySide || homeSide.coach_id === awaySide.coach_id) return;

          const sName = seasonMap.get(sId) || `Season ${sId}`;
          const sBadge = formatSeasonBadge(sId, sName);
          const lType = getLeaguePrefix(sId, sName);
          const { isOT, isTie, homeShots, awayShots } = parseGameDetails(row, homeScore, awayScore);
          const gNum = Number(row.game_number);
          const roundLabel = gNum ? `PO G${gNum}` : 'PO';

          compiledMatches.push({
            id: key,
            game_id: row.game_id,
            league_id: sId,
            season_badge: sBadge,
            season_name: sName,
            league_type: lType,
            is_playoff: true,
            round_label: roundLabel,
            home_coach_id: homeSide.coach_id,
            home_coach_name: homeSide.coach_name,
            away_coach_id: awaySide.coach_id,
            away_coach_name: awaySide.coach_name,
            home_team_id: homeSide.team_id,
            home_team_name: homeSide.team_name,
            home_team_abbr: homeSide.abbreviation,
            home_team_logo: homeSide.logo_url,
            away_team_id: awaySide.team_id,
            away_team_name: awaySide.team_name,
            away_team_abbr: awaySide.abbreviation,
            away_team_logo: awaySide.logo_url,
            home_score: homeScore,
            away_score: awayScore,
            home_shots: homeShots,
            away_shots: awayShots,
            is_ot: isOT,
            is_tie: isTie
          });
        });

        // Build per-(coach_id, team_abbr, league_type) stats from compiledMatches
        const coachFranchiseStats = new Map<
          string,
          { gp: number; w: number; l: number; t: number; otl: number; pts: number; gf: number; ga: number }
        >();

        const applyMatchToCoachFranchise = (
          cId: number,
          abbr: string,
          lType: string,
          myScore: number,
          oppScore: number,
          isOT: boolean,
          isTie: boolean,
          isPlayoff: boolean
        ) => {
          const fKey = `${cId}:${lType}:${abbr.toUpperCase()}`;
          let rec = coachFranchiseStats.get(fKey);
          if (!rec) {
            rec = { gp: 0, w: 0, l: 0, t: 0, otl: 0, pts: 0, gf: 0, ga: 0 };
            coachFranchiseStats.set(fKey, rec);
          }
          rec.gp += 1;
          rec.gf += myScore;
          rec.ga += oppScore;
          if (isTie || myScore === oppScore) {
            rec.t += 1;
            rec.pts += 1;
          } else if (myScore > oppScore) {
            rec.w += 1;
            rec.pts += 2;
          } else if (isOT && !isPlayoff) {
            rec.otl += 1;
            rec.pts += 1;
          } else {
            rec.l += 1;
          }
        };

        compiledMatches.forEach(m => {
          applyMatchToCoachFranchise(
            m.home_coach_id,
            m.home_team_abbr,
            m.league_type,
            m.home_score,
            m.away_score,
            m.is_ot,
            m.is_tie,
            m.is_playoff
          );
          applyMatchToCoachFranchise(
            m.away_coach_id,
            m.away_team_abbr,
            m.league_type,
            m.away_score,
            m.home_score,
            m.is_ot,
            m.is_tie,
            m.is_playoff
          );
        });

        // Group each coach's teams by distinct Franchise (not broken down by season!)
        const compiledCoaches = Array.from(coachMap.values())
          .map(c => {
            const sortedSeasonTeams = [...c.teams].sort((a, b) => b.league_id - a.league_id);
            const franchiseGroupMap = new Map<string, GroupedCoachFranchise>();

            sortedSeasonTeams.forEach(t => {
              const groupKey = `${t.league_type}:${t.abbreviation.toUpperCase()}`;
              let existing = franchiseGroupMap.get(groupKey);
              if (!existing) {
                const fStats = coachFranchiseStats.get(`${c.coach_id}:${groupKey}`) || {
                  gp: 0,
                  w: 0,
                  l: 0,
                  t: 0,
                  otl: 0,
                  pts: 0,
                  gf: 0,
                  ga: 0
                };
                existing = {
                  key: groupKey,
                  primary_team_id: t.team_id,
                  latest_league_id: t.league_id,
                  latest_season_badge: t.season_badge,
                  team_name: t.team_name,
                  abbreviation: t.abbreviation,
                  logo_url: t.logo_url,
                  league_type: t.league_type,
                  arena_name: t.arena_name || 'TBD',
                  seasons_count: 1,
                  season_badges: [t.season_badge],
                  team_ids: [t.team_id],
                  gp: fStats.gp,
                  w: fStats.w,
                  l: fStats.l,
                  t: fStats.t,
                  otl: fStats.otl,
                  pts: fStats.pts,
                  gf: fStats.gf,
                  ga: fStats.ga,
                  gd: fStats.gf - fStats.ga
                };
                franchiseGroupMap.set(groupKey, existing);
              } else {
                existing.seasons_count += 1;
                if (!existing.season_badges.includes(t.season_badge)) {
                  existing.season_badges.push(t.season_badge);
                }
                if (!existing.team_ids.includes(t.team_id)) {
                  existing.team_ids.push(t.team_id);
                }
                if (!existing.logo_url && t.logo_url) {
                  existing.logo_url = t.logo_url;
                }
                if (existing.arena_name === 'TBD' && t.arena_name) {
                  existing.arena_name = t.arena_name;
                }
              }
            });

            const franchises = Array.from(franchiseGroupMap.values()).sort((a, b) => {
              if (b.gp !== a.gp) return b.gp - a.gp;
              return b.latest_league_id - a.latest_league_id;
            });

            return {
              ...c,
              teams: sortedSeasonTeams,
              franchises
            };
          })
          .sort((a, b) => a.coach_name.localeCompare(b.coach_name));

        setCoaches(compiledCoaches);

        compiledMatches.sort((a, b) => {
          if (b.league_id !== a.league_id) return b.league_id - a.league_id;
          if (a.is_playoff !== b.is_playoff) return a.is_playoff ? -1 : 1;
          return Number(b.game_id) - Number(a.game_id);
        });

        setAllMatches(compiledMatches);
      } catch (err) {
        console.error('Error loading coach profile and H2H data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCoachProfileAndH2HData();
  }, []);

  // Auto-select initialCoachId, initialCoachName, logged-in coach, or first active coach
  useEffect(() => {
    if (coaches.length === 0) return;

    if (initialCoachId && coaches.some(c => c.coach_id === Number(initialCoachId))) {
      setSelectedCoachId(Number(initialCoachId));
      return;
    }

    if (initialCoachName) {
      const normTarget = normalizeCoachStr(initialCoachName);
      const matched = coaches.find(
        c =>
          normalizeCoachStr(c.coach_name) === normTarget ||
          normalizeCoachStr(c.coach_name).includes(normTarget)
      );
      if (matched) {
        setSelectedCoachId(matched.coach_id);
        return;
      }
    }

    if (selectedCoachId !== null && coaches.some(c => c.coach_id === selectedCoachId)) return;

    if (currentCoach?.coach_id && coaches.some(c => c.coach_id === Number(currentCoach.coach_id))) {
      setSelectedCoachId(Number(currentCoach.coach_id));
      return;
    }

    const firstWithGames = coaches.find(c =>
      allMatches.some(m => m.home_coach_id === c.coach_id || m.away_coach_id === c.coach_id)
    );
    setSelectedCoachId((firstWithGames || coaches[0]).coach_id);
  }, [coaches, allMatches, currentCoach, initialCoachId, initialCoachName, selectedCoachId]);

  // Career summary map for every coach
  const careerRecordByCoach = useMemo(() => {
    const map = new Map<
      number,
      { gp: number; w: number; l: number; t: number; otl: number; pts: number; gf: number; ga: number; poW: number; poL: number; otW: number; otL: number }
    >();
    allMatches.forEach(m => {
      if (selectedLeagueType !== 'ALL' && m.league_type !== selectedLeagueType) return;

      const ensure = (id: number) => {
        let r = map.get(id);
        if (!r) {
          r = { gp: 0, w: 0, l: 0, t: 0, otl: 0, pts: 0, gf: 0, ga: 0, poW: 0, poL: 0, otW: 0, otL: 0 };
          map.set(id, r);
        }
        return r;
      };

      const hRec = ensure(m.home_coach_id);
      const aRec = ensure(m.away_coach_id);

      hRec.gp += 1;
      aRec.gp += 1;
      hRec.gf += m.home_score;
      hRec.ga += m.away_score;
      aRec.gf += m.away_score;
      aRec.ga += m.home_score;

      if (m.is_tie || m.home_score === m.away_score) {
        hRec.t += 1;
        hRec.pts += 1;
        aRec.t += 1;
        aRec.pts += 1;
      } else if (m.home_score > m.away_score) {
        hRec.w += 1;
        hRec.pts += 2;
        if (m.is_playoff) {
          hRec.poW += 1;
          aRec.poL += 1;
        }
        if (m.is_ot) {
          hRec.otW += 1;
          aRec.otL += 1;
        }
        if (m.is_ot && !m.is_playoff) {
          aRec.otl += 1;
          aRec.pts += 1;
        } else {
          aRec.l += 1;
        }
      } else {
        aRec.w += 1;
        aRec.pts += 2;
        if (m.is_playoff) {
          aRec.poW += 1;
          hRec.poL += 1;
        }
        if (m.is_ot) {
          aRec.otW += 1;
          hRec.otL += 1;
        }
        if (m.is_ot && !m.is_playoff) {
          hRec.otl += 1;
          hRec.pts += 1;
        } else {
          hRec.l += 1;
        }
      }
    });
    return map;
  }, [allMatches, selectedLeagueType]);

  const activeH2HCoach = useMemo(() => {
    return coaches.find(c => c.coach_id === selectedCoachId) || null;
  }, [coaches, selectedCoachId]);

  const activeOpponentCoach = useMemo(() => {
    if (selectedOpponentId === 'ALL') return null;
    return coaches.find(c => c.coach_id === Number(selectedOpponentId)) || null;
  }, [coaches, selectedOpponentId]);

  const availableCoachSeasons = useMemo(() => {
    if (!selectedCoachId) return [];
    const map = new Map<number, { league_id: number; badge: string; name: string; league_type: string }>();
    allMatches.forEach(m => {
      if (m.home_coach_id !== selectedCoachId && m.away_coach_id !== selectedCoachId) return;
      if (selectedLeagueType !== 'ALL' && m.league_type !== selectedLeagueType) return;
      if (!map.has(m.league_id)) {
        map.set(m.league_id, {
          league_id: m.league_id,
          badge: m.season_badge,
          name: m.season_name,
          league_type: m.league_type
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.league_id - a.league_id);
  }, [allMatches, selectedCoachId, selectedLeagueType]);

  // All matches involving selectedCoachId across all seasons (grouped by coach, not broken down by season)
  const coachMatchesFiltered = useMemo(() => {
    if (!selectedCoachId) return [];
    return allMatches.filter(m => {
      if (m.home_coach_id !== selectedCoachId && m.away_coach_id !== selectedCoachId) return false;
      if (selectedLeagueType !== 'ALL' && m.league_type !== selectedLeagueType) return false;
      if (h2hPhaseFilter === 'REG' && m.is_playoff) return false;
      if (h2hPhaseFilter === 'PLAYOFFS' && !m.is_playoff) return false;
      return true;
    });
  }, [allMatches, selectedCoachId, selectedLeagueType, h2hPhaseFilter]);

  const h2hOpponentSummaries = useMemo(() => {
    if (!selectedCoachId) return [];
    const oppMap = new Map<
      number,
      {
        opponentId: number;
        opponentName: string;
        teamsSet: Set<string>;
        gp: number;
        w: number;
        l: number;
        t: number;
        otl: number;
        pts: number;
        gf: number;
        ga: number;
        homeW: number;
        homeL: number;
        homeT: number;
        homeOtl: number;
        awayW: number;
        awayL: number;
        awayT: number;
        awayOtl: number;
        otW: number;
        otL: number;
        poW: number;
        poL: number;
        outcomesNewestFirst: Array<'W' | 'L' | 'T' | 'OTL'>;
        lastGame: OpponentH2HSummary['lastGame'];
      }
    >();

    coachMatchesFiltered.forEach(m => {
      const isHome = m.home_coach_id === selectedCoachId;
      const oppId = isHome ? m.away_coach_id : m.home_coach_id;
      const oppName = isHome ? m.away_coach_name : m.home_coach_name;
      const oppAbbr = isHome ? m.away_team_abbr : m.home_team_abbr;
      const myScore = isHome ? m.home_score : m.away_score;
      const oppScore = isHome ? m.away_score : m.home_score;

      let entry = oppMap.get(oppId);
      if (!entry) {
        entry = {
          opponentId: oppId,
          opponentName: oppName,
          teamsSet: new Set<string>(),
          gp: 0,
          w: 0,
          l: 0,
          t: 0,
          otl: 0,
          pts: 0,
          gf: 0,
          ga: 0,
          homeW: 0,
          homeL: 0,
          homeT: 0,
          homeOtl: 0,
          awayW: 0,
          awayL: 0,
          awayT: 0,
          awayOtl: 0,
          otW: 0,
          otL: 0,
          poW: 0,
          poL: 0,
          outcomesNewestFirst: [],
          lastGame: null
        };
        oppMap.set(oppId, entry);
      }

      if (oppAbbr) entry.teamsSet.add(oppAbbr);
      entry.gp += 1;
      entry.gf += myScore;
      entry.ga += oppScore;

      let outcome: 'W' | 'L' | 'T' | 'OTL' = 'L';
      if (m.is_tie || myScore === oppScore) {
        outcome = 'T';
        entry.t += 1;
        entry.pts += 1;
        if (isHome) entry.homeT += 1;
        else entry.awayT += 1;
      } else if (myScore > oppScore) {
        outcome = 'W';
        entry.w += 1;
        entry.pts += 2;
        if (isHome) entry.homeW += 1;
        else entry.awayW += 1;
        if (m.is_ot) entry.otW += 1;
        if (m.is_playoff) entry.poW += 1;
      } else {
        if (m.is_ot && !m.is_playoff) {
          outcome = 'OTL';
          entry.otl += 1;
          entry.pts += 1;
          if (isHome) entry.homeOtl += 1;
          else entry.awayOtl += 1;
          entry.otL += 1;
        } else {
          outcome = 'L';
          entry.l += 1;
          if (isHome) entry.homeL += 1;
          else entry.awayL += 1;
          if (m.is_ot) entry.otL += 1;
          if (m.is_playoff) entry.poL += 1;
        }
      }

      entry.outcomesNewestFirst.push(outcome);
      if (!entry.lastGame) {
        entry.lastGame = {
          outcome,
          myScore,
          oppScore,
          seasonBadge: m.season_badge,
          isOT: m.is_ot,
          isPlayoff: m.is_playoff
        };
      }
    });

    return Array.from(oppMap.values()).map(e => {
      let streak = '-';
      if (e.outcomesNewestFirst.length > 0) {
        const first = e.outcomesNewestFirst[0];
        let count = 0;
        for (const r of e.outcomesNewestFirst) {
          if (r === first) count++;
          else break;
        }
        streak = `${first}${count}`;
      }

      const winPct = e.gp > 0 ? Math.round((e.w / e.gp) * 1000) / 10 : 0;
      const gpg = e.gp > 0 ? Math.round((e.gf / e.gp) * 100) / 100 : 0;

      return {
        opponentId: e.opponentId,
        opponentName: e.opponentName,
        opponentTeams: Array.from(e.teamsSet).slice(0, 4),
        gp: e.gp,
        w: e.w,
        l: e.l,
        t: e.t,
        otl: e.otl,
        pts: e.pts,
        winPct,
        gf: e.gf,
        ga: e.ga,
        gd: e.gf - e.ga,
        gpg,
        homeW: e.homeW,
        homeL: e.homeL,
        homeT: e.homeT,
        homeOtl: e.homeOtl,
        awayW: e.awayW,
        awayL: e.awayL,
        awayT: e.awayT,
        awayOtl: e.awayOtl,
        otW: e.otW,
        otL: e.otL,
        poW: e.poW,
        poL: e.poL,
        streak,
        recentOutcomes: e.outcomesNewestFirst.slice(0, 5),
        lastGame: e.lastGame
      };
    });
  }, [coachMatchesFiltered, selectedCoachId]);

  const sortedAndFilteredH2HOpponents = useMemo(() => {
    const q = h2hOpponentSearch.trim().toLowerCase();
    return h2hOpponentSummaries
      .filter(item => {
        if (!q) return true;
        return (
          item.opponentName.toLowerCase().includes(q) ||
          item.opponentTeams.some(t => t.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const diff = (Number(b[h2hSortField]) || 0) - (Number(a[h2hSortField]) || 0);
        if (diff !== 0) return diff;
        return b.pts - a.pts || b.w - a.w;
      });
  }, [h2hOpponentSummaries, h2hOpponentSearch, h2hSortField]);

  const activeOneOnOneSummary = useMemo(() => {
    if (selectedOpponentId === 'ALL') return null;
    return (
      h2hOpponentSummaries.find(s => s.opponentId === Number(selectedOpponentId)) || {
        opponentId: Number(selectedOpponentId),
        opponentName: activeOpponentCoach?.coach_name || 'Opponent',
        opponentTeams: activeOpponentCoach?.franchises.map(f => f.abbreviation).slice(0, 3) || [],
        gp: 0,
        w: 0,
        l: 0,
        t: 0,
        otl: 0,
        pts: 0,
        winPct: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        gpg: 0,
        homeW: 0,
        homeL: 0,
        homeT: 0,
        homeOtl: 0,
        awayW: 0,
        awayL: 0,
        awayT: 0,
        awayOtl: 0,
        otW: 0,
        otL: 0,
        poW: 0,
        poL: 0,
        streak: '-',
        recentOutcomes: [],
        lastGame: null
      }
    );
  }, [selectedOpponentId, h2hOpponentSummaries, activeOpponentCoach]);

  const activeCoachOverallTotals = useMemo(() => {
    return h2hOpponentSummaries.reduce(
      (acc, s) => {
        acc.gp += s.gp;
        acc.w += s.w;
        acc.l += s.l;
        acc.t += s.t;
        acc.otl += s.otl;
        acc.pts += s.pts;
        acc.gf += s.gf;
        acc.ga += s.ga;
        acc.poW += s.poW;
        acc.poL += s.poL;
        acc.otW += s.otW;
        acc.otL += s.otL;
        return acc;
      },
      { gp: 0, w: 0, l: 0, t: 0, otl: 0, pts: 0, gf: 0, ga: 0, poW: 0, poL: 0, otW: 0, otL: 0 }
    );
  }, [h2hOpponentSummaries]);

  const displayedRecentMatches = useMemo(() => {
    if (selectedOpponentId === 'ALL') return coachMatchesFiltered;
    const oppIdNum = Number(selectedOpponentId);
    return coachMatchesFiltered.filter(
      m => m.home_coach_id === oppIdNum || m.away_coach_id === oppIdNum
    );
  }, [coachMatchesFiltered, selectedOpponentId]);

  const filteredCoaches = useMemo(() => {
    return coaches.filter(c => {
      if (selectedLeagueType !== 'ALL') {
        const hasTeamInLeague = c.franchises.some(f => f.league_type === selectedLeagueType);
        if (!hasTeamInLeague) return false;
      }

      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      const nameMatch = c.coach_name.toLowerCase().includes(q);
      const teamMatch = c.franchises.some(
        f =>
          f.team_name.toLowerCase().includes(q) ||
          f.abbreviation.toLowerCase().includes(q)
      );

      return nameMatch || teamMatch;
    });
  }, [coaches, search, selectedLeagueType]);

  const totalUniqueFranchises = useMemo(() => {
    return coaches.reduce((acc, c) => acc + c.franchises.length, 0);
  }, [coaches]);

  const handleJumpToCoachH2H = (coachId: number) => {
    setSelectedCoachId(coachId);
    setSelectedOpponentId('ALL');
    h2hSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-4 font-serif text-black">
      {!hideHeader && (
        <header className="border-b-4 border-black pb-3 flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <span className="bg-black text-white font-mono text-[10px] font-black uppercase px-2 py-0.5 tracking-widest inline-block mb-1">
              Front Office Staff, Controlled Franchises &amp; Head-to-Head Rivalries
            </span>
            <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tighter">
              Coach Profile &amp; Head-to-Head Ledger
            </h1>
            <p className="text-xs font-bold uppercase italic text-slate-700">
              All Teams Controlled by Coach (Grouped Across Seasons), Head-to-Head Matchup Records &amp; Recent Scores
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-sans text-xs">
            <div className="bg-white border-2 border-black px-2.5 py-1 font-bold uppercase">
              <span className="font-black font-mono">{filteredCoaches.length}</span> Coaches &bull;{' '}
              <span className="font-black font-mono">{totalUniqueFranchises}</span> Controlled Teams &bull;{' '}
              <span className="font-black font-mono">{allMatches.length}</span> Games
            </div>
          </div>
        </header>
      )}

      {/* Compact Control Strip: League Filter + Coach Selector + Search */}
      <div className="bg-[#fdfaf5] border-2 border-black p-2.5 sm:p-3 shadow-[3px_3px_0px_rgba(0,0,0,1)] flex flex-wrap items-center justify-between gap-2 font-sans">
        <div className="flex flex-wrap items-center gap-2">
          {/* League Type Filter Buttons */}
          <div className="flex items-center gap-1 bg-white border-2 border-black p-0.5">
            <button
              type="button"
              onClick={() => setSelectedLeagueType('ALL')}
              className={`px-2.5 py-1 text-xs font-black uppercase transition-all cursor-pointer ${
                selectedLeagueType === 'ALL'
                  ? 'bg-black text-white'
                  : 'text-black hover:bg-neutral-100'
              }`}
            >
              All Leagues
            </button>
            {availableLeagueTypes.map(type => {
              const config = LEAGUE_LOGOS[type];
              const isSelected = selectedLeagueType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedLeagueType(type)}
                  className={`px-1.5 py-0.5 flex items-center justify-center transition-all h-7 border cursor-pointer ${
                    isSelected
                      ? 'bg-yellow-100 border-black ring-1 ring-black'
                      : 'border-transparent bg-transparent opacity-65 hover:opacity-100 hover:border-black/30'
                  }`}
                  title={config?.name || `${type} League`}
                >
                  {config?.logoUrl ? (
                    <img
                      src={config.logoUrl}
                      alt={config.name}
                      className="h-4 w-auto max-w-[52px] object-contain block"
                      onError={e => {
                        if (config.fallbackUrl && e.currentTarget.src !== config.fallbackUrl) {
                          e.currentTarget.src = config.fallbackUrl;
                        }
                      }}
                    />
                  ) : (
                    <span className="font-black text-xs uppercase px-1">{type}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Coach Quick Dropdown */}
          <div className="flex items-center gap-1.5 bg-black text-white px-2.5 py-1 border-2 border-black">
            <UserCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-[10px] font-mono uppercase text-amber-400 font-black">ACTIVE COACH PROFILE:</span>
            <select
              value={selectedCoachId ?? ''}
              onChange={e => {
                const nextId = Number(e.target.value);
                setSelectedCoachId(nextId);
                if (selectedOpponentId === nextId) {
                  setSelectedOpponentId('ALL');
                }
              }}
              className="bg-black text-white font-bold uppercase text-xs px-1.5 py-0.5 border border-neutral-600 focus:outline-none cursor-pointer"
            >
              {coaches.map(c => (
                <option key={c.coach_id} value={c.coach_id} className="bg-black text-white">
                  {c.coach_name} ({c.franchises.length} {c.franchises.length === 1 ? 'Team' : 'Teams'})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1.5 w-3.5 h-3.5 text-neutral-400" />
            <input
              type="text"
              placeholder="SEARCH COACH OR TEAM..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border-2 border-black pl-7 pr-2.5 py-1 text-xs font-bold uppercase bg-white text-black w-48 sm:w-56 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* SELECTED COACH PROFILE: GROUPED TEAMS CONTROLLED (NO SEASON SPLIT)  */}
      {/* =================================================================== */}
      {activeH2HCoach && (
        <section className="border-2 border-black bg-[#fdfaf5] shadow-[3px_3px_0px_rgba(0,0,0,1)] p-3 sm:p-4 font-sans">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b-2 border-black pb-3 mb-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="bg-black text-amber-400 font-mono text-xs font-black uppercase px-2.5 py-1 border border-black">
                COACH PROFILE
              </div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-black font-serif">
                {activeH2HCoach.coach_name}
              </h2>
              {activeH2HCoach.discord_tag && (
                <span className="text-xs font-mono font-bold text-slate-600 bg-white border border-black px-2 py-0.5">
                  @{activeH2HCoach.discord_tag}
                </span>
              )}
              <div className="flex items-center gap-1">
                {Array.from(new Set(activeH2HCoach.franchises.map(f => f.league_type))).map(lType => (
                  <span
                    key={lType}
                    className="font-mono text-[10px] font-black uppercase px-1.5 py-0.5 bg-black text-white"
                    title={LEAGUE_LOGOS[lType]?.name || `${lType} League`}
                  >
                    {LEAGUE_LOGOS[lType]?.name || lType}
                  </span>
                ))}
              </div>
            </div>

            {/* Combined Career Record Strip */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <div className="bg-white border-2 border-black px-2.5 py-1">
                <span className="text-[10px] text-neutral-500 uppercase font-bold mr-1">CAREER RECORD:</span>
                <strong className="text-black font-black">
                  {activeCoachOverallTotals.w}-{activeCoachOverallTotals.l}-{activeCoachOverallTotals.t}
                  {activeCoachOverallTotals.otl > 0 ? `-${activeCoachOverallTotals.otl}` : ''}
                </strong>
                <span className="text-neutral-600 ml-1">({activeCoachOverallTotals.gp} GP)</span>
              </div>
              <div className="bg-white border-2 border-black px-2.5 py-1">
                <span className="text-[10px] text-neutral-500 uppercase font-bold mr-1">PTS:</span>
                <strong className="text-blue-900 font-black">{activeCoachOverallTotals.pts}</strong>
              </div>
              <div className="bg-white border-2 border-black px-2.5 py-1">
                <span className="text-[10px] text-neutral-500 uppercase font-bold mr-1">WIN%:</span>
                <strong className="text-emerald-800 font-black">
                  {activeCoachOverallTotals.gp > 0
                    ? `${((activeCoachOverallTotals.w / activeCoachOverallTotals.gp) * 100).toFixed(1)}%`
                    : '0.0%'}
                </strong>
              </div>
              <div className="bg-white border-2 border-black px-2.5 py-1">
                <span className="text-[10px] text-neutral-500 uppercase font-bold mr-1">GF-GA:</span>
                <strong className="text-black font-black">
                  {activeCoachOverallTotals.gf}-{activeCoachOverallTotals.ga}
                </strong>
                <span
                  className={`ml-1 font-bold ${
                    activeCoachOverallTotals.gf - activeCoachOverallTotals.ga >= 0
                      ? 'text-emerald-700'
                      : 'text-red-700'
                  }`}
                >
                  ({activeCoachOverallTotals.gf - activeCoachOverallTotals.ga >= 0
                    ? `+${activeCoachOverallTotals.gf - activeCoachOverallTotals.ga}`
                    : activeCoachOverallTotals.gf - activeCoachOverallTotals.ga})
                </span>
              </div>
              <div className="bg-white border-2 border-black px-2.5 py-1">
                <span className="text-[10px] text-neutral-500 uppercase font-bold mr-1">PLAYOFFS:</span>
                <strong className="text-amber-900 font-black">
                  {activeCoachOverallTotals.poW}-{activeCoachOverallTotals.poL}
                </strong>
              </div>
            </div>
          </div>

          {/* Grouped Franchises Controlled by Coach (Merged across seasons) */}
          <div>
            <div className="text-[11px] font-mono font-black uppercase tracking-wider text-slate-700 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Teams Controlled by {activeH2HCoach.coach_name} ({activeH2HCoach.franchises.length} Franchises • Merged Across All Seasons)
              </span>
              <span className="text-[10px] text-slate-500">Click any franchise to open its Team Page</span>
            </div>

            {activeH2HCoach.franchises.length === 0 ? (
              <div className="p-3 bg-white border border-black text-xs italic text-slate-500">
                No franchise assignments recorded for this coach.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {activeH2HCoach.franchises.map(fran => (
                  <FranchiseControlCard key={fran.key} franchise={fran} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* =================================================================== */}
      {/* COACH HEAD-TO-HEAD RECORDS & RECENT SCORES CENTER (ATTACHED 2)      */}
      {/* =================================================================== */}
      <section
        ref={h2hSectionRef}
        className="border-2 border-black bg-[#fdfaf5] shadow-[4px_4px_0px_rgba(0,0,0,1)] overflow-hidden"
      >
        {/* Top Banner of Head-to-Head Center */}
        <div className="bg-black text-white px-3 sm:px-5 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 border-b-2 border-black">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-amber-500 text-black border border-white flex items-center justify-center shrink-0 rounded-xs">
              <Swords className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[9px] font-mono uppercase tracking-widest text-amber-400 font-black">
                COACH VS. COACH RIVALRY &amp; MATCHUP LEDGER
              </div>
              <h2 className="text-base sm:text-xl font-black uppercase tracking-tight text-white">
                Head-to-Head Records &amp; Recent Scores
              </h2>
            </div>
          </div>

          {/* Coach & Opponent Selectors + Phase Filters */}
          <div className="flex flex-wrap items-center gap-2 font-sans text-xs">
            <div className="flex items-center border border-neutral-600 bg-neutral-900 p-0.5">
              {(
                [
                  { id: 'ALL', label: 'All Games' },
                  { id: 'REG', label: 'Reg Season' },
                  { id: 'PLAYOFFS', label: 'Playoffs' }
                ] as const
              ).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setH2hPhaseFilter(p.id)}
                  className={`px-2 py-1 text-[10px] font-black uppercase cursor-pointer transition ${
                    h2hPhaseFilter === p.id
                      ? 'bg-amber-400 text-black'
                      : 'text-neutral-300 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-neutral-900 text-white border border-neutral-700 px-2 py-1 rounded-xs">
              <span className="text-[10px] font-mono uppercase text-amber-400 font-black">COACH:</span>
              <select
                value={selectedCoachId ?? ''}
                onChange={e => {
                  const nextId = Number(e.target.value);
                  setSelectedCoachId(nextId);
                  if (selectedOpponentId === nextId) {
                    setSelectedOpponentId('ALL');
                  }
                }}
                className="bg-black text-white font-bold uppercase text-xs px-1.5 py-0.5 border border-neutral-600 focus:outline-none cursor-pointer"
              >
                {coaches.map(c => (
                  <option key={c.coach_id} value={c.coach_id} className="bg-black text-white">
                    {c.coach_name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              disabled={selectedOpponentId === 'ALL'}
              onClick={() => {
                if (selectedOpponentId !== 'ALL' && selectedCoachId) {
                  const prevCoach = selectedCoachId;
                  setSelectedCoachId(Number(selectedOpponentId));
                  setSelectedOpponentId(prevCoach);
                }
              }}
              className="p-1 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-white border border-neutral-700 rounded-xs cursor-pointer transition"
              title="Swap Coach and Opponent"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-1 bg-neutral-900 text-white border border-neutral-700 px-2 py-1 rounded-xs">
              <span className="text-[10px] font-mono uppercase text-cyan-400 font-black">VS OPPONENT:</span>
              <select
                value={selectedOpponentId}
                onChange={e => {
                  const val = e.target.value;
                  setSelectedOpponentId(val === 'ALL' ? 'ALL' : Number(val));
                  setRecentScoresLimit(20);
                }}
                className="bg-black text-white font-bold uppercase text-xs px-1.5 py-0.5 border border-neutral-600 focus:outline-none cursor-pointer max-w-[220px]"
              >
                <option value="ALL" className="bg-black text-white">
                  All Opponents ({h2hOpponentSummaries.length} Coaches)
                </option>
                {coaches
                  .filter(c => c.coach_id !== selectedCoachId)
                  .map(c => {
                    const summary = h2hOpponentSummaries.find(s => s.opponentId === c.coach_id);
                    return (
                      <option key={c.coach_id} value={c.coach_id} className="bg-black text-white">
                        {c.coach_name} {summary ? `(${summary.w}-${summary.l}-${summary.t}${summary.otl ? `-${summary.otl}` : ''} • ${summary.gp} GP)` : '(0 GP)'}
                      </option>
                    );
                  })}
              </select>
              {selectedOpponentId !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedOpponentId('ALL')}
                  className="text-neutral-400 hover:text-white ml-0.5 cursor-pointer"
                  title="Show All Opponents"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* DIRECT 1-ON-1 RIVALRY BANNER (WHEN AN OPPONENT COACH IS SELECTED) */}
        {activeOneOnOneSummary && activeH2HCoach && (
          <div className="bg-black text-white border-b-2 border-black p-3 sm:p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-black">
                  DIRECT HEAD-TO-HEAD COACHING TALE OF THE TAPE
                </div>
                <h3 className="text-base sm:text-xl font-black uppercase text-white flex items-center gap-2 flex-wrap">
                  <span className="text-emerald-400">{activeH2HCoach.coach_name}</span>
                  <span className="text-xs font-mono bg-neutral-800 text-white px-2 py-0.5 border border-neutral-600">
                    VS
                  </span>
                  <span className="text-cyan-400">{activeOneOnOneSummary.opponentName}</span>
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOpponentId('ALL')}
                className="self-start md:self-auto px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-600 font-mono text-xs font-bold uppercase cursor-pointer flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Show All Opponents</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 font-mono text-xs mb-3">
              <div className="bg-neutral-900 text-white border border-neutral-700 p-2.5">
                <div className="text-[10px] text-neutral-400 uppercase font-bold">H2H RECORD</div>
                <div className="text-base font-black text-white mt-0.5">
                  {activeOneOnOneSummary.w}-{activeOneOnOneSummary.l}-{activeOneOnOneSummary.t}
                  {activeOneOnOneSummary.otl > 0 ? `-${activeOneOnOneSummary.otl}` : ''}
                </div>
                <div className="text-[10px] text-amber-400">
                  {activeOneOnOneSummary.gp} Games • {activeOneOnOneSummary.pts} PTS
                </div>
              </div>

              <div className="bg-neutral-900 text-white border border-neutral-700 p-2.5">
                <div className="text-[10px] text-neutral-400 uppercase font-bold">WIN PERCENTAGE</div>
                <div className="text-base font-black text-emerald-400 mt-0.5">
                  {activeOneOnOneSummary.winPct}%
                </div>
                <div className="text-[10px] text-neutral-400">
                  Streak: <strong className="text-white">{activeOneOnOneSummary.streak}</strong>
                </div>
              </div>

              <div className="bg-neutral-900 text-white border border-neutral-700 p-2.5">
                <div className="text-[10px] text-neutral-400 uppercase font-bold">GOALS FOR / AGAINST</div>
                <div className="text-base font-black text-white mt-0.5">
                  {activeOneOnOneSummary.gf} &ndash; {activeOneOnOneSummary.ga}
                </div>
                <div className="text-[10px] text-neutral-400">
                  Diff:{' '}
                  <strong className={activeOneOnOneSummary.gd >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {activeOneOnOneSummary.gd >= 0 ? `+${activeOneOnOneSummary.gd}` : activeOneOnOneSummary.gd}
                  </strong>{' '}
                  • {activeOneOnOneSummary.gpg} GPG
                </div>
              </div>

              <div className="bg-neutral-900 text-white border border-neutral-700 p-2.5">
                <div className="text-[10px] text-neutral-400 uppercase font-bold">HOME ICE RECORD</div>
                <div className="text-base font-black text-white mt-0.5">
                  {activeOneOnOneSummary.homeW}-{activeOneOnOneSummary.homeL}-{activeOneOnOneSummary.homeT}
                  {activeOneOnOneSummary.homeOtl > 0 ? `-${activeOneOnOneSummary.homeOtl}` : ''}
                </div>
                <div className="text-[10px] text-neutral-400">As Home Coach</div>
              </div>

              <div className="bg-neutral-900 text-white border border-neutral-700 p-2.5">
                <div className="text-[10px] text-neutral-400 uppercase font-bold">ROAD RECORD</div>
                <div className="text-base font-black text-white mt-0.5">
                  {activeOneOnOneSummary.awayW}-{activeOneOnOneSummary.awayL}-{activeOneOnOneSummary.awayT}
                  {activeOneOnOneSummary.awayOtl > 0 ? `-${activeOneOnOneSummary.awayOtl}` : ''}
                </div>
                <div className="text-[10px] text-neutral-400">As Visiting Coach</div>
              </div>

              <div className="bg-neutral-900 text-white border border-neutral-700 p-2.5">
                <div className="text-[10px] text-neutral-400 uppercase font-bold">CLUTCH / PLAYOFFS</div>
                <div className="text-sm font-black text-white mt-0.5">
                  OT: {activeOneOnOneSummary.otW}-{activeOneOnOneSummary.otL}
                </div>
                <div className="text-[10px] text-amber-400">
                  Playoffs: {activeOneOnOneSummary.poW}-{activeOneOnOneSummary.poL}
                </div>
              </div>
            </div>

            {activeOneOnOneSummary.gp > 0 && (
              <div className="space-y-1 font-mono text-[11px]">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-emerald-400">
                    {activeH2HCoach.coach_name}: {activeOneOnOneSummary.w} W
                  </span>
                  {activeOneOnOneSummary.t > 0 && (
                    <span className="text-neutral-300">{activeOneOnOneSummary.t} T</span>
                  )}
                  <span className="text-cyan-400">
                    {activeOneOnOneSummary.opponentName}: {activeOneOnOneSummary.l + activeOneOnOneSummary.otl} W
                  </span>
                </div>
                <div className="w-full h-2.5 bg-neutral-800 border border-neutral-600 flex overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all"
                    style={{ width: `${(activeOneOnOneSummary.w / activeOneOnOneSummary.gp) * 100}%` }}
                  />
                  <div
                    className="bg-neutral-400 h-full transition-all"
                    style={{ width: `${(activeOneOnOneSummary.t / activeOneOnOneSummary.gp) * 100}%` }}
                  />
                  <div
                    className="bg-cyan-500 h-full transition-all"
                    style={{ width: `${((activeOneOnOneSummary.l + activeOneOnOneSummary.otl) / activeOneOnOneSummary.gp) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* MAIN H2H TWO-COLUMN BODY: RECORDS VS ALL COACHES LEFT + RECENT SCORES RIGHT */}
        <div className="p-3 sm:p-4 grid grid-cols-1 xl:grid-cols-12 gap-4">
          {/* LEFT 7 COLS: HEAD-TO-HEAD RECORDS AGAINST ALL OTHER COACHES */}
          <div className="xl:col-span-7 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 mb-2 border-b-2 border-black">
              <div>
                <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-black">
                  {activeH2HCoach?.coach_name || 'Coach'} &mdash; Record vs. Every Coach (
                  {sortedAndFilteredH2HOpponents.length})
                </h3>
                <p className="text-[11px] font-sans text-slate-600">
                  Combined across all controlled franchises &amp; seasons. Click any opponent to filter scores.
                </p>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={h2hOpponentSearch}
                    onChange={e => setH2hOpponentSearch(e.target.value)}
                    placeholder="Filter opponent..."
                    className="pl-7 pr-2 py-1 text-xs border border-black bg-white text-black font-sans w-36 focus:outline-none"
                  />
                </div>
                <select
                  value={h2hSortField}
                  onChange={e => setH2hSortField(e.target.value as any)}
                  className="bg-black text-white border border-black px-2 py-1 text-xs font-mono font-bold uppercase cursor-pointer"
                >
                  <option value="gp">Sort: Games (GP)</option>
                  <option value="w">Sort: Wins (W)</option>
                  <option value="pts">Sort: Points (PTS)</option>
                  <option value="winPct">Sort: Win %</option>
                  <option value="gf">Sort: Goals For (GF)</option>
                  <option value="gd">Sort: Goal Diff (DIFF)</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center font-mono text-xs uppercase text-slate-500 border border-black bg-white">
                Computing Head-to-Head Coaching Records...
              </div>
            ) : sortedAndFilteredH2HOpponents.length === 0 ? (
              <div className="p-8 text-center font-sans text-xs italic text-slate-500 border border-black bg-white">
                No head-to-head matchups found for this coach in the selected filter.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[520px] overflow-y-auto border-2 border-black bg-white">
                <table className="w-full text-left border-collapse font-mono text-xs">
                  <thead className="bg-black text-white sticky top-0 z-10 text-[10px] uppercase">
                    <tr>
                      <th className="py-2 px-2 border-b border-neutral-800">Opponent Coach</th>
                      <th className="py-2 px-1.5 border-b border-neutral-800 text-center">GP</th>
                      <th className="py-2 px-1.5 border-b border-neutral-800 text-center">W-L-T-OTL</th>
                      <th className="py-2 px-1.5 border-b border-neutral-800 text-center">PTS</th>
                      <th className="py-2 px-1.5 border-b border-neutral-800 text-center">WIN%</th>
                      <th className="py-2 px-1.5 border-b border-neutral-800 text-center">GF-GA</th>
                      <th className="py-2 px-1.5 border-b border-neutral-800 text-center">DIFF</th>
                      <th className="py-2 px-1.5 border-b border-neutral-800 text-center">LAST 5</th>
                      <th className="py-2 px-2 border-b border-neutral-800 text-right">LAST SCORE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {sortedAndFilteredH2HOpponents.map(opp => {
                      const isSelectedOpp = Number(selectedOpponentId) === opp.opponentId;
                      return (
                        <tr
                          key={opp.opponentId}
                          onClick={() =>
                            setSelectedOpponentId(isSelectedOpp ? 'ALL' : opp.opponentId)
                          }
                          className={`cursor-pointer transition-colors ${
                            isSelectedOpp
                              ? 'bg-amber-100 font-black ring-1 ring-inset ring-black'
                              : 'hover:bg-amber-50/70'
                          }`}
                          title={`Click to filter scores vs ${opp.opponentName}`}
                        >
                          <td className="py-1.5 px-2">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="font-bold text-black">{opp.opponentName}</span>
                              {opp.opponentTeams.slice(0, 3).map(abbr => (
                                <span
                                  key={abbr}
                                  className="bg-black text-white text-[9px] px-1 py-0.1 font-black"
                                >
                                  {abbr}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-1.5 px-1.5 text-center font-bold text-slate-700">{opp.gp}</td>
                          <td className="py-1.5 px-1.5 text-center font-black text-black whitespace-nowrap">
                            {opp.w}-{opp.l}-{opp.t}
                            {opp.otl > 0 ? `-${opp.otl}` : ''}
                          </td>
                          <td className="py-1.5 px-1.5 text-center font-black text-blue-900">{opp.pts}</td>
                          <td className="py-1.5 px-1.5 text-center">
                            <span
                              className={`font-bold ${
                                opp.winPct >= 50 ? 'text-emerald-800' : 'text-slate-700'
                              }`}
                            >
                              {opp.winPct}%
                            </span>
                          </td>
                          <td className="py-1.5 px-1.5 text-center text-slate-700 whitespace-nowrap">
                            {opp.gf}-{opp.ga}
                          </td>
                          <td
                            className={`py-1.5 px-1.5 text-center font-bold ${
                              opp.gd > 0
                                ? 'text-emerald-700'
                                : opp.gd < 0
                                ? 'text-red-700'
                                : 'text-slate-500'
                            }`}
                          >
                            {opp.gd > 0 ? `+${opp.gd}` : opp.gd}
                          </td>
                          <td className="py-1.5 px-1.5 text-center">
                            <div className="flex items-center justify-center gap-0.5">
                              {opp.recentOutcomes.map((res, rIdx) => (
                                <span
                                  key={rIdx}
                                  className={`w-4 h-4 text-[9px] font-black flex items-center justify-center ${
                                    res === 'W'
                                      ? 'bg-emerald-600 text-white'
                                      : res === 'L'
                                      ? 'bg-red-600 text-white'
                                      : res === 'OTL'
                                      ? 'bg-amber-600 text-white'
                                      : 'bg-slate-500 text-white'
                                  }`}
                                >
                                  {res === 'OTL' ? 'O' : res}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-1.5 px-2 text-right whitespace-nowrap">
                            {opp.lastGame ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold">
                                <span
                                  className={
                                    opp.lastGame.outcome === 'W'
                                      ? 'text-emerald-700 font-black'
                                      : opp.lastGame.outcome === 'L' || opp.lastGame.outcome === 'OTL'
                                      ? 'text-red-700 font-black'
                                      : 'text-slate-700 font-black'
                                  }
                                >
                                  {opp.lastGame.outcome} {opp.lastGame.myScore}-{opp.lastGame.oppScore}
                                </span>
                                <span className="text-[9px] text-slate-500">
                                  ({opp.lastGame.seasonBadge})
                                </span>
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* RIGHT 5 COLS: RECENT SCORES & HEAD-TO-HEAD GAME LOG */}
          <div className="xl:col-span-5 flex flex-col">
            <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b-2 border-black">
              <div>
                <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-black">
                  {selectedOpponentId === 'ALL'
                    ? `${activeH2HCoach?.coach_name || 'Coach'} — Recent Scores (${displayedRecentMatches.length})`
                    : `${activeH2HCoach?.coach_name} vs. ${activeOpponentCoach?.coach_name} Scores (${displayedRecentMatches.length})`}
                </h3>
                <p className="text-[11px] font-sans text-slate-600">
                  {selectedOpponentId === 'ALL'
                    ? 'Latest scores across all controlled teams & opponents'
                    : 'Complete head-to-head game log between these two coaches'}
                </p>
              </div>
              {selectedOpponentId !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedOpponentId('ALL')}
                  className="px-2 py-1 bg-black text-white font-mono text-[10px] font-bold uppercase cursor-pointer shrink-0"
                >
                  All Opponents
                </button>
              )}
            </div>

            {loading ? (
              <div className="p-8 text-center font-mono text-xs uppercase text-slate-500 border border-black bg-white">
                Loading Recent Matchup Scores...
              </div>
            ) : displayedRecentMatches.length === 0 ? (
              <div className="p-8 text-center font-sans text-xs italic text-slate-500 border border-black bg-white">
                No games played between these coaches in the selected filter.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
                {displayedRecentMatches.slice(0, recentScoresLimit).map(match => {
                  const isHome = match.home_coach_id === selectedCoachId;
                  const myScore = isHome ? match.home_score : match.away_score;
                  const oppScore = isHome ? match.away_score : match.home_score;
                  const myTeamAbbr = isHome ? match.home_team_abbr : match.away_team_abbr;
                  const myTeamName = isHome ? match.home_team_name : match.away_team_name;
                  const myTeamLogo = isHome ? match.home_team_logo : match.away_team_logo;
                  const oppCoachId = isHome ? match.away_coach_id : match.home_coach_id;
                  const oppCoachName = isHome ? match.away_coach_name : match.home_coach_name;
                  const oppTeamAbbr = isHome ? match.away_team_abbr : match.home_team_abbr;
                  const oppTeamName = isHome ? match.away_team_name : match.home_team_name;
                  const oppTeamLogo = isHome ? match.away_team_logo : match.home_team_logo;

                  let outcome: 'W' | 'L' | 'T' | 'OTL' = 'L';
                  if (match.is_tie || myScore === oppScore) outcome = 'T';
                  else if (myScore > oppScore) outcome = 'W';
                  else if (match.is_ot && !match.is_playoff) outcome = 'OTL';

                  return (
                    <div
                      key={match.id}
                      className="bg-white border-2 border-black p-2 flex items-center justify-between gap-2 hover:bg-amber-50/40 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div
                          className={`w-7 h-7 shrink-0 font-mono text-xs font-black flex items-center justify-center border border-black ${
                            outcome === 'W'
                              ? 'bg-emerald-600 text-white'
                              : outcome === 'L'
                              ? 'bg-red-600 text-white'
                              : outcome === 'OTL'
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-600 text-white'
                          }`}
                        >
                          {outcome}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap text-xs">
                            <span className="bg-black text-white font-mono text-[9px] font-black px-1.5 py-0.2">
                              {match.season_badge}
                            </span>
                            {match.is_playoff && (
                              <span className="bg-amber-400 text-black border border-black font-mono text-[9px] font-black px-1 py-0.1">
                                {match.round_label || 'PLAYOFFS'}
                              </span>
                            )}
                            {match.is_ot && (
                              <span className="bg-blue-700 text-white font-mono text-[9px] font-black px-1 py-0.1">
                                OT
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-slate-500">
                              {isHome ? 'vs' : '@'}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedOpponentId(
                                  Number(selectedOpponentId) === oppCoachId ? 'ALL' : oppCoachId
                                )
                              }
                              className="font-black text-black hover:text-red-800 hover:underline truncate cursor-pointer text-left"
                              title={`Filter H2H vs ${oppCoachName}`}
                            >
                              {oppCoachName}
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-600 mt-0.5 truncate">
                            <span className="inline-flex items-center gap-1 font-bold text-black">
                              {myTeamLogo && (
                                <img
                                  src={myTeamLogo}
                                  alt={myTeamAbbr}
                                  className="w-3.5 h-3.5 object-contain"
                                />
                              )}
                              {myTeamAbbr} ({myTeamName})
                            </span>
                            <span>vs</span>
                            <span className="inline-flex items-center gap-1 font-bold text-slate-800">
                              {oppTeamLogo && (
                                <img
                                  src={oppTeamLogo}
                                  alt={oppTeamAbbr}
                                  className="w-3.5 h-3.5 object-contain"
                                />
                              )}
                              {oppTeamAbbr} ({oppTeamName})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 font-mono">
                        <div className="text-sm font-black text-black">
                          {myScore} &ndash; {oppScore}
                        </div>
                        <div className="text-[9px] text-slate-400 uppercase">
                          {isHome ? 'HOME' : 'AWAY'}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {displayedRecentMatches.length > recentScoresLimit && (
                  <button
                    type="button"
                    onClick={() => setRecentScoresLimit(prev => prev + 25)}
                    className="w-full py-2 bg-black hover:bg-neutral-800 text-white font-mono text-xs font-black uppercase cursor-pointer"
                  >
                    Show More Scores ({displayedRecentMatches.length - recentScoresLimit} Remaining)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* ALL COACH PROFILES DIRECTORY GRID (GROUPED BY COACH & FRANCHISES)   */}
      {/* =================================================================== */}
      <div className="pt-2">
        <div className="mb-3 flex flex-wrap items-center justify-between border-b-2 border-black pb-2 gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight">
              All League Coach Profiles ({filteredCoaches.length})
            </h2>
            {embeddedOnTeamPage && (
              <button
                type="button"
                onClick={() => setShowDirectoryGrid(prev => !prev)}
                className="px-2.5 py-1 text-xs font-mono font-black uppercase border border-black bg-white hover:bg-black hover:text-white cursor-pointer transition"
              >
                {showDirectoryGrid ? 'Hide Full Coach Directory' : 'Browse All Coach Profiles'}
              </button>
            )}
          </div>
          <span className="text-xs font-mono text-slate-600 hidden sm:inline">
            Teams are grouped by Franchise per Coach • Click &ldquo;Load Coach Profile&rdquo; to inspect H2H &amp; Scores
          </span>
        </div>

        {showDirectoryGrid && (
          <>
            {loading ? (
              <div className="p-12 text-center text-xs font-black uppercase tracking-widest text-gray-500 font-mono border border-black bg-white">
                Loading Coach Profiles, Controlled Franchises &amp; Head-to-Head Records...
              </div>
            ) : filteredCoaches.length === 0 ? (
              <div className="p-12 text-center text-xs font-bold uppercase italic text-gray-500 border border-black bg-white">
                No coaches found matching &ldquo;{search}&rdquo;.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCoaches.map(coach => (
                  <CoachProfileCard
                    key={coach.coach_id}
                    coach={coach}
                    selectedLeagueType={selectedLeagueType}
                    careerRecord={careerRecordByCoach.get(coach.coach_id)}
                    isSelectedForH2H={selectedCoachId === coach.coach_id}
                    onSelectH2H={() => handleJumpToCoachH2H(coach.coach_id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FranchiseControlCard({ franchise }: { franchise: GroupedCoachFranchise }) {
  const [imgError, setImgError] = useState(false);
  const winPct = franchise.gp > 0 ? ((franchise.w / franchise.gp) * 100).toFixed(1) : '0.0';

  return (
    <Link
      href={`/team/${franchise.primary_team_id}?season=${franchise.latest_league_id}`}
      className="flex items-center gap-3 p-2.5 bg-white border-2 border-black hover:bg-amber-50 transition shadow-[2px_2px_0px_rgba(0,0,0,1)] group"
    >
      <div className="w-11 h-11 shrink-0 flex items-center justify-center bg-neutral-50 border border-neutral-300 p-1">
        {franchise.logo_url && !imgError ? (
          <img
            src={franchise.logo_url}
            alt={franchise.team_name}
            onError={() => setImgError(true)}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-xs font-mono font-black uppercase text-neutral-700">
            {franchise.abbreviation}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0 font-sans">
        <div className="flex items-center justify-between gap-1">
          <span className="font-black text-xs sm:text-sm uppercase text-black group-hover:text-red-800 group-hover:underline truncate">
            {franchise.team_name}
          </span>
          <span className="font-mono text-[10px] font-black uppercase bg-black text-white px-1.5 py-0.5 shrink-0">
            {LEAGUE_LOGOS[franchise.league_type]?.name || `${franchise.league_type} League`}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-700 mt-0.5 flex-wrap">
          <span className="font-black text-black">
            {franchise.w}-{franchise.l}-{franchise.t}
            {franchise.otl > 0 ? `-${franchise.otl}` : ''}
          </span>
          <span className="text-blue-900 font-bold">{franchise.pts} PTS</span>
          <span className="text-emerald-800 font-bold">({winPct}%)</span>
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-0.5">
          <span>
            GF-GA: {franchise.gf}-{franchise.ga} ({franchise.gd >= 0 ? `+${franchise.gd}` : franchise.gd})
          </span>
          <span className="font-bold text-amber-900">
            {franchise.seasons_count} {franchise.seasons_count === 1 ? 'Season' : 'Seasons'}
          </span>
        </div>
      </div>
    </Link>
  );
}

function CoachProfileCard({
  coach,
  selectedLeagueType,
  careerRecord,
  isSelectedForH2H,
  onSelectH2H
}: {
  coach: CoachEntry;
  selectedLeagueType: string;
  careerRecord?: { gp: number; w: number; l: number; t: number; otl: number; pts: number; gf: number; ga: number; poW: number; poL: number };
  isSelectedForH2H: boolean;
  onSelectH2H: () => void;
}) {
  const displayedFranchises = useMemo(() => {
    if (selectedLeagueType === 'ALL') return coach.franchises;
    return coach.franchises.filter(f => f.league_type === selectedLeagueType);
  }, [coach.franchises, selectedLeagueType]);

  const uniqueLeagues = useMemo(() => {
    return Array.from(new Set(coach.franchises.map(f => f.league_type)));
  }, [coach.franchises]);

  const primaryFranchise = displayedFranchises[0] || coach.franchises[0];

  return (
    <div
      className={`border-2 border-black p-3.5 bg-[#fdfaf5] shadow-[3px_3px_0px_rgba(0,0,0,1)] flex flex-col justify-between transition-transform duration-100 ${
        isSelectedForH2H ? 'ring-2 ring-amber-500 bg-amber-50/30' : ''
      }`}
    >
      <div>
        {/* Coach Header Row */}
        <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-2.5 gap-2">
          <div className="min-w-0 flex-1">
            {primaryFranchise ? (
              <Link
                href={`/team/${primaryFranchise.primary_team_id}?tab=coach`}
                className="group inline-flex items-center gap-1.5"
                title={`Open ${coach.coach_name}'s Team & Coach Profile`}
              >
                <h3 className="text-base sm:text-lg font-black uppercase truncate text-black group-hover:text-red-800 group-hover:underline leading-tight">
                  {coach.coach_name}
                </h3>
                <ExternalLink className="w-3.5 h-3.5 text-neutral-400 group-hover:text-red-800 transition-colors shrink-0" />
              </Link>
            ) : (
              <h3 className="text-base sm:text-lg font-black uppercase truncate text-black leading-tight">
                {coach.coach_name}
              </h3>
            )}
            {coach.discord_tag && (
              <p className="text-[11px] font-mono text-slate-600 font-bold truncate">
                @{coach.discord_tag}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
            {uniqueLeagues.map(lType => {
              const conf = LEAGUE_LOGOS[lType];
              return (
                <span
                  key={lType}
                  className="font-mono text-[9px] font-black uppercase px-1.5 py-0.5 bg-black text-white"
                  title={conf?.name || `${lType} League`}
                >
                  {lType}
                </span>
              );
            })}
          </div>
        </div>

        {/* Career Record & Quick H2H Button */}
        <div className="mb-2.5 bg-white border border-black p-2 flex items-center justify-between gap-2 font-mono text-xs">
          {careerRecord && careerRecord.gp > 0 ? (
            <div>
              <div className="text-[9px] uppercase text-slate-500 font-bold">
                CAREER RECORD ({careerRecord.gp} GP • {careerRecord.pts} PTS)
              </div>
              <div className="font-black text-black">
                {careerRecord.w}-{careerRecord.l}-{careerRecord.t}
                {careerRecord.otl > 0 ? `-${careerRecord.otl}` : ''}{' '}
                <span className="text-emerald-800 text-[10px]">
                  ({((careerRecord.w / careerRecord.gp) * 100).toFixed(1)}%)
                </span>
                <span className="text-slate-500 text-[10px] ml-1.5">
                  GF-GA: {careerRecord.gf}-{careerRecord.ga}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-slate-500">No tracked games yet</div>
          )}

          <button
            type="button"
            onClick={onSelectH2H}
            className="px-2 py-1 bg-black hover:bg-neutral-800 text-white font-mono text-[10px] font-black uppercase cursor-pointer flex items-center gap-1 shrink-0"
          >
            <Swords className="w-3 h-3" />
            <span>H2H &amp; Scores</span>
          </button>
        </div>

        {/* Grouped Franchises Controlled (NOT broken down by season) */}
        <div>
          <div className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-600 mb-1.5 flex items-center justify-between">
            <span>Controlled Teams ({displayedFranchises.length})</span>
            <span className="text-[9px] text-slate-400">Combined across seasons</span>
          </div>

          {displayedFranchises.length === 0 ? (
            <div className="p-2.5 bg-neutral-100 border border-neutral-200 text-center text-xs italic text-slate-500 font-sans">
              No controlled team in this league filter.
            </div>
          ) : (
            <div className="space-y-1.5">
              {displayedFranchises.map(fran => (
                <CompactFranchiseRow key={fran.key} franchise={fran} />
              ))}
            </div>
          )}
        </div>
      </div>

      {primaryFranchise && (
        <div className="pt-2.5 mt-2.5 border-t border-black/15 flex justify-between items-center text-xs font-sans">
          <span className="font-mono text-[10px] text-slate-600 font-bold uppercase">
            {coach.teams.length} Total {coach.teams.length === 1 ? 'Season' : 'Seasons'} Coached
          </span>
          <Link
            href={`/team/${primaryFranchise.primary_team_id}?tab=coach`}
            className="font-black text-red-800 uppercase hover:underline text-[11px] flex items-center gap-1"
          >
            Team &amp; Coach Profile &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}

function CompactFranchiseRow({ franchise }: { franchise: GroupedCoachFranchise }) {
  const [imgError, setImgError] = useState(false);

  return (
    <Link
      href={`/team/${franchise.primary_team_id}?season=${franchise.latest_league_id}`}
      className="flex items-center gap-2 p-1.5 bg-white border border-neutral-300 hover:border-black hover:bg-amber-50/50 transition-colors group"
    >
      <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-neutral-50 border border-neutral-200 p-0.5">
        {franchise.logo_url && !imgError ? (
          <img
            src={franchise.logo_url}
            alt={franchise.team_name}
            onError={() => setImgError(true)}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-[10px] font-mono font-black uppercase text-neutral-600">
            {franchise.abbreviation}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0 font-sans">
        <div className="flex items-center justify-between gap-1">
          <span className="font-bold text-xs text-neutral-900 group-hover:text-blue-800 group-hover:underline truncate block">
            {franchise.team_name}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[9px] font-mono font-black text-white bg-black px-1 py-0.1">
              {franchise.league_type}
            </span>
            <span className="text-[9px] font-mono font-bold text-amber-900 bg-amber-100 px-1 py-0.1 border border-amber-300">
              {franchise.seasons_count} {franchise.seasons_count === 1 ? 'yr' : 'yrs'}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono text-neutral-600 mt-0.5">
          <span>
            Record:{' '}
            <strong className="text-black">
              {franchise.w}-{franchise.l}-{franchise.t}
              {franchise.otl > 0 ? `-${franchise.otl}` : ''}
            </strong>{' '}
            ({franchise.pts} pts)
          </span>
          <span>
            GF-GA: {franchise.gf}-{franchise.ga}
          </span>
        </div>
      </div>
    </Link>
  );
}
