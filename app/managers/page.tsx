"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useCoachAuth } from '@/lib/coach-auth';
import Link from 'next/link';
import {
  Users,
  Search,
  Shield,
  Trophy,
  ExternalLink,
  Swords,
  ArrowLeftRight,
  Activity,
  ChevronRight,
  X
} from 'lucide-react';

const LEAGUE_LOGOS: Record<string, { name: string; logoUrl: string; fallbackUrl?: string }> = {
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

const W_LEAGUE_COACH_FALLBACK: Record<string, { coach_id: number; coach_name: string }> = {
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

interface CoachTeamInfo {
  team_id: number;
  team_name: string;
  abbreviation: string;
  logo_url: string | null;
  league_id: number;
  season_name: string;
  season_badge: string;
  league_type: string;
}

interface CoachEntry {
  coach_id: number;
  coach_name: string;
  discord_tag?: string;
  teams: CoachTeamInfo[];
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

export default function ManagersPage() {
  const { currentCoach } = useCoachAuth();
  const h2hSectionRef = useRef<HTMLDivElement>(null);

  const [coaches, setCoaches] = useState<CoachEntry[]>([]);
  const [allMatches, setAllMatches] = useState<CoachMatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLeagueType, setSelectedLeagueType] = useState<string>('ALL');

  // Head-to-Head State
  const [selectedCoachId, setSelectedCoachId] = useState<number | null>(null);
  const [selectedOpponentId, setSelectedOpponentId] = useState<number | 'ALL'>('ALL');
  const [h2hPhaseFilter, setH2hPhaseFilter] = useState<'ALL' | 'REG' | 'PLAYOFFS'>('ALL');
  const [h2hSeasonFilter, setH2hSeasonFilter] = useState<number | 'ALL'>('ALL');
  const [h2hOpponentSearch, setH2hOpponentSearch] = useState('');
  const [h2hSortField, setH2hSortField] = useState<'gp' | 'w' | 'pts' | 'winPct' | 'gf' | 'gd'>('gp');
  const [recentScoresLimit, setRecentScoresLimit] = useState<number>(20);

  const availableLeagueTypes = ['W', 'Q', 'O', 'V', 'G'];

  useEffect(() => {
    async function loadManagersAndH2HData() {
      setLoading(true);
      try {
        const REG_COLS =
          'game_id, league_id, home_team_id, away_team_id, home_coach_id, away_coach_id, home_coach, away_coach, home_score, away_score, game_meta';
        const PO_COLS =
          'game_id, playoff_id, game_number, league_id, home_team_id, away_team_id, home_coach_id, away_coach_id, home_coach, away_coach, home_score, away_score, game_meta';

        const fetchRegWave = async (startPage: number, pageCount: number) => {
          const pages = await Promise.all(
            Array.from({ length: pageCount }, (_, idx) => {
              const page = startPage + idx;
              return supabase
                .from('league_gamestats')
                .select(REG_COLS)
                .order('league_id', { ascending: false })
                .order('game_id', { ascending: false })
                .range(page * 1000, page * 1000 + 999)
                .then(r => r.data || [], () => [] as any[]);
            })
          );
          return pages.flat();
        };

        const [
          coachesRes,
          teamsRes,
          seasonsRes,
          regWave1,
          poPage0,
          poPage1,
          poPage2,
          schedPage0,
          schedPage1
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
          fetchRegWave(0, 8),
          supabase
            .from('league_playoff_gamestats')
            .select(PO_COLS)
            .order('league_id', { ascending: false })
            .order('game_id', { ascending: false })
            .range(0, 999)
            .then(r => r.data || [], () => [] as any[]),
          supabase
            .from('league_playoff_gamestats')
            .select(PO_COLS)
            .order('league_id', { ascending: false })
            .order('game_id', { ascending: false })
            .range(1000, 1999)
            .then(r => r.data || [], () => [] as any[]),
          supabase
            .from('league_playoff_gamestats')
            .select(PO_COLS)
            .order('league_id', { ascending: false })
            .order('game_id', { ascending: false })
            .range(2000, 2999)
            .then(r => r.data || [], () => [] as any[]),
          supabase
            .from('league_schedule')
            .select('game_id, league_id, home_team_id, away_team_id, home_score, away_score, game_meta, played')
            .not('home_score', 'is', null)
            .not('away_score', 'is', null)
            .order('league_id', { ascending: false })
            .order('game_id', { ascending: false })
            .range(0, 999)
            .then(r => r.data || [], () => [] as any[]),
          supabase
            .from('league_schedule')
            .select('game_id, league_id, home_team_id, away_team_id, home_score, away_score, game_meta, played')
            .not('home_score', 'is', null)
            .not('away_score', 'is', null)
            .order('league_id', { ascending: false })
            .order('game_id', { ascending: false })
            .range(1000, 1999)
            .then(r => r.data || [], () => [] as any[])
        ]);

        // Fetch remaining regular season waves (pages 8..15 and 16..23 -> covers all 21,508+ games across all 40 seasons)
        const [regWave2, regWave3] = await Promise.all([
          fetchRegWave(8, 8),
          fetchRegWave(16, 8)
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

        // Group teams by coach_id / coach_name
        const coachMap = new Map<number, CoachEntry>();
        const coachNameLookup = new Map<string, number>();

        rawCoaches.forEach((c: any) => {
          const cId = Number(c.coach_id);
          const cName = c.coach_name || `Manager #${cId}`;
          coachMap.set(cId, {
            coach_id: cId,
            coach_name: cName,
            discord_tag: c.discord_tag || c.discord_name || c.coach_tag || c.discord_handle || undefined,
            teams: []
          });
          coachNameLookup.set(normalizeCoachStr(cName), cId);
        });

        // Lookup maps for resolving games -> teams & coaches
        const seasonTeamMap = new Map<string, CoachTeamInfo & { coach_id: number }>();
        const anyTeamIdMap = new Map<number, CoachTeamInfo & { coach_id: number }>();

        rawTeams.forEach((t: any) => {
          let cId = Number(t.coach_id);
          const tLeagueId = Number(t.league_id) || 1;
          const sName = seasonMap.get(tLeagueId) || `Season ${tLeagueId}`;
          const lType = getLeaguePrefix(tLeagueId, sName);
          const sBadge = formatSeasonBadge(tLeagueId, sName);
          const abbr = (t.abbreviation || 'TM').trim().toUpperCase();

          // Resolve coach_id if not directly on team row
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
            league_type: lType
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
              teams: [teamInfo]
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

        // Helper to resolve (seasonId, rawTeamId, rawCoachId, rawCoachName) -> { coach_id, coach_name, team }
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

          // 1. Direct coach_id on the game row (present on 100% of league_gamestats & league_playoff_gamestats)
          let resolvedCoachId = 0;
          if (explicitCoachId && coachMap.has(explicitCoachId)) {
            resolvedCoachId = explicitCoachId;
          } else if (rawCoachName) {
            const byName = coachNameLookup.get(normalizeCoachStr(String(rawCoachName)));
            if (byName && coachMap.has(byName)) {
              resolvedCoachId = byName;
            }
          }

          // 2. Fallback to (season, team_id) or cross-season team lookup
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

          // 3. If game row has a valid coach_id + coach_name not yet in coachMap, register it dynamically
          if (!resolvedCoachId && explicitCoachId && rawCoachName) {
            const cleanName = String(rawCoachName).trim();
            coachMap.set(explicitCoachId, {
              coach_id: explicitCoachId,
              coach_name: cleanName,
              teams: directTeam ? [directTeam] : []
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

        // Helper to parse OT / Tie from a game row
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

        const regGameRows = [...regWave1, ...regWave2, ...regWave3];

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

        // Include any played schedule games not already in league_gamestats
        const schedRows = [...schedPage0, ...schedPage1];
        schedRows.forEach((row: any) => {
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

        // Include ALL playoff games from league_playoff_gamestats across all seasons
        const seenPoKeys = new Set<string>();
        const poGameRows = [...poPage0, ...poPage1, ...poPage2];
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

        // Sort each coach's teams by latest season descending
        const compiledCoaches = Array.from(coachMap.values())
          .map(c => ({
            ...c,
            teams: c.teams.sort((a, b) => b.league_id - a.league_id)
          }))
          .sort((a, b) => a.coach_name.localeCompare(b.coach_name));

        setCoaches(compiledCoaches);

        // Sort all matches most recent first (by league_id desc, then playoff after reg in same season, then game_id desc)
        compiledMatches.sort((a, b) => {
          if (b.league_id !== a.league_id) return b.league_id - a.league_id;
          if (a.is_playoff !== b.is_playoff) return a.is_playoff ? -1 : 1;
          return Number(b.game_id) - Number(a.game_id);
        });

        setAllMatches(compiledMatches);
      } catch (err) {
        console.error('Error loading coaches and head-to-head data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadManagersAndH2HData();
  }, []);

  // Auto-select logged-in coach or first active coach with matches
  useEffect(() => {
    if (coaches.length === 0) return;
    if (selectedCoachId !== null && coaches.some(c => c.coach_id === selectedCoachId)) return;

    if (currentCoach?.coach_id && coaches.some(c => c.coach_id === Number(currentCoach.coach_id))) {
      setSelectedCoachId(Number(currentCoach.coach_id));
      return;
    }

    const firstWithGames = coaches.find(c =>
      allMatches.some(m => m.home_coach_id === c.coach_id || m.away_coach_id === c.coach_id)
    );
    setSelectedCoachId((firstWithGames || coaches[0]).coach_id);
  }, [coaches, allMatches, currentCoach, selectedCoachId]);

  // Career summary map for every coach (for Manager Cards)
  const careerRecordByCoach = useMemo(() => {
    const map = new Map<
      number,
      { gp: number; w: number; l: number; t: number; otl: number; pts: number; gf: number; ga: number }
    >();
    allMatches.forEach(m => {
      if (selectedLeagueType !== 'ALL' && m.league_type !== selectedLeagueType) return;

      const ensure = (id: number) => {
        let r = map.get(id);
        if (!r) {
          r = { gp: 0, w: 0, l: 0, t: 0, otl: 0, pts: 0, gf: 0, ga: 0 };
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
        if (m.is_ot && !m.is_playoff) {
          aRec.otl += 1;
          aRec.pts += 1;
        } else {
          aRec.l += 1;
        }
      } else {
        aRec.w += 1;
        aRec.pts += 2;
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

  // Active Coach object for Head-to-Head section
  const activeH2HCoach = useMemo(() => {
    return coaches.find(c => c.coach_id === selectedCoachId) || null;
  }, [coaches, selectedCoachId]);

  const activeOpponentCoach = useMemo(() => {
    if (selectedOpponentId === 'ALL') return null;
    return coaches.find(c => c.coach_id === Number(selectedOpponentId)) || null;
  }, [coaches, selectedOpponentId]);

  // Available seasons for the selected Coach A (across all seasons & leagues)
  const availableCoachSeasons = useMemo(() => {
    if (!selectedCoachId) return [];
    const map = new Map<number, { league_id: number; badge: string; name: string; league_type: string }>();
    allMatches.forEach(m => {
      if (m.home_coach_id !== selectedCoachId && m.away_coach_id !== selectedCoachId) return;
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
  }, [allMatches, selectedCoachId]);

  // All matches involving selectedCoachId across ALL seasons regardless of season
  const coachMatchesFiltered = useMemo(() => {
    if (!selectedCoachId) return [];
    return allMatches.filter(m => {
      if (m.home_coach_id !== selectedCoachId && m.away_coach_id !== selectedCoachId) return false;
      if (h2hPhaseFilter === 'REG' && m.is_playoff) return false;
      if (h2hPhaseFilter === 'PLAYOFFS' && !m.is_playoff) return false;
      return true;
    });
  }, [allMatches, selectedCoachId, h2hPhaseFilter]);

  // Compute Head-to-Head summaries against every opponent coach
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

    // coachMatchesFiltered is already ordered newest-first
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

    const summaries: OpponentH2HSummary[] = Array.from(oppMap.values()).map(e => {
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

    return summaries;
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

  // Specific 1-on-1 summary when an opponent coach is selected
  const activeOneOnOneSummary = useMemo(() => {
    if (selectedOpponentId === 'ALL') return null;
    return (
      h2hOpponentSummaries.find(s => s.opponentId === Number(selectedOpponentId)) || {
        opponentId: Number(selectedOpponentId),
        opponentName: activeOpponentCoach?.coach_name || 'Opponent',
        opponentTeams: activeOpponentCoach?.teams.map(t => t.abbreviation).slice(0, 3) || [],
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

  // Overall stats for Coach A in the current filter
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
        return acc;
      },
      { gp: 0, w: 0, l: 0, t: 0, otl: 0, pts: 0, gf: 0, ga: 0 }
    );
  }, [h2hOpponentSummaries]);

  // Recent scores feed (filtered by selectedOpponentId if not 'ALL')
  const displayedRecentMatches = useMemo(() => {
    if (selectedOpponentId === 'ALL') return coachMatchesFiltered;
    const oppIdNum = Number(selectedOpponentId);
    return coachMatchesFiltered.filter(
      m => m.home_coach_id === oppIdNum || m.away_coach_id === oppIdNum
    );
  }, [coachMatchesFiltered, selectedOpponentId]);

  // Filter coaches by search query and selected league type for the directory cards
  const filteredCoaches = useMemo(() => {
    return coaches.filter(c => {
      if (selectedLeagueType !== 'ALL') {
        const hasTeamInLeague = c.teams.some(t => t.league_type === selectedLeagueType);
        if (!hasTeamInLeague) return false;
      }

      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      const nameMatch = c.coach_name.toLowerCase().includes(q);
      const teamMatch = c.teams.some(
        t =>
          t.team_name.toLowerCase().includes(q) ||
          t.abbreviation.toLowerCase().includes(q) ||
          t.season_badge.toLowerCase().includes(q)
      );

      return nameMatch || teamMatch;
    });
  }, [coaches, search, selectedLeagueType]);

  const totalTeamsManaged = useMemo(() => {
    return coaches.reduce((acc, c) => acc + c.teams.length, 0);
  }, [coaches]);

  const handleJumpToCoachH2H = (coachId: number) => {
    setSelectedCoachId(coachId);
    setSelectedOpponentId('ALL');
    h2hSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-black font-serif p-3 sm:p-6">
      {/* Header */}
      <header className="border-b-4 border-black pb-3 sm:pb-4 mb-4 sm:mb-6 text-center">
        <span className="bg-black text-white font-mono text-[10px] sm:text-xs font-black uppercase px-2.5 py-0.5 tracking-widest inline-block mb-1">
          Front Office Staff, Head-to-Head Rivalries &amp; Franchise Leadership
        </span>
        <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter">
          Managers &amp; Coaches
        </h1>
        <p className="text-xs font-bold uppercase italic mt-1 text-slate-700">
          Head-to-Head Coaching Records, Recent Matchup Scores, Official Rosters &amp; Franchise History Across All Leagues
        </p>
      </header>

      {/* Control Bar: League Filters & Search */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center mb-6 border-b border-black pb-4 gap-4">
        {/* League Type Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-white border-2 border-black p-1 shadow-xs overflow-x-auto max-w-full no-scrollbar">
          <button
            type="button"
            onClick={() => {
              setSelectedLeagueType('ALL');
              setH2hSeasonFilter('ALL');
            }}
            className={`px-3 py-1 text-xs font-black uppercase transition-all shrink-0 cursor-pointer ${
              selectedLeagueType === 'ALL'
                ? 'bg-black text-white shadow-xs'
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
                onClick={() => {
                  setSelectedLeagueType(type);
                  setH2hSeasonFilter('ALL');
                }}
                className={`px-2 py-0.5 flex items-center justify-center transition-all h-8 border-2 shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-yellow-100 border-black shadow-xs ring-1 ring-black'
                    : 'border-transparent bg-transparent opacity-65 hover:opacity-100 hover:border-black/30 hover:bg-neutral-50'
                }`}
                title={config?.name || `${type} League`}
              >
                {config?.logoUrl ? (
                  <img
                    src={config.logoUrl}
                    alt={config.name}
                    className="h-5 w-auto max-w-[60px] object-contain block"
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

        {/* Stats Summary & Search Box */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-700 font-sans">
            <span className="font-black text-black font-mono">{filteredCoaches.length}</span> Managers &bull;{' '}
            <span className="font-black text-black font-mono">{totalTeamsManaged}</span> Franchises &bull;{' '}
            <span className="font-black text-black font-mono">{allMatches.length}</span> Tracked Games
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-neutral-400" />
            <input
              type="text"
              placeholder="SEARCH MANAGER OR TEAM..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border border-black pl-8 pr-3 py-1.5 text-xs font-bold uppercase bg-white text-black w-full sm:w-64 focus:outline-none font-sans"
            />
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* COACH HEAD-TO-HEAD RECORDS & RECENT SCORES CENTER                   */}
      {/* =================================================================== */}
      <section
        ref={h2hSectionRef}
        className="mb-8 border-2 border-black bg-[#fdfaf5] shadow-[4px_4px_0px_rgba(0,0,0,1)] overflow-hidden"
      >
        {/* Top Banner of Head-to-Head Center */}
        <div className="bg-black text-white px-4 sm:px-6 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b-2 border-black">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500 text-black border border-white flex items-center justify-center shrink-0 rounded-xs">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-black">
                COACH VS. COACH RIVALRY &amp; MATCHUP LEDGER
              </div>
              <h2 className="text-lg sm:text-2xl font-black uppercase tracking-tight text-white">
                Head-to-Head Records &amp; Recent Scores
              </h2>
            </div>
          </div>

          {/* Coach & Opponent Selectors */}
          <div className="flex flex-wrap items-center gap-2 font-sans text-xs">
            <div className="flex items-center gap-1.5 bg-neutral-900 text-white border border-neutral-700 px-2.5 py-1.5 rounded-xs">
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
                className="bg-black text-white font-bold uppercase text-xs px-2 py-0.5 border border-neutral-600 focus:outline-none cursor-pointer"
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
              className="p-1.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-white border border-neutral-700 rounded-xs cursor-pointer transition"
              title="Swap Coach and Opponent"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 bg-neutral-900 text-white border border-neutral-700 px-2.5 py-1.5 rounded-xs">
              <span className="text-[10px] font-mono uppercase text-cyan-400 font-black">VS OPPONENT:</span>
              <select
                value={selectedOpponentId}
                onChange={e => {
                  const val = e.target.value;
                  setSelectedOpponentId(val === 'ALL' ? 'ALL' : Number(val));
                  setRecentScoresLimit(20);
                }}
                className="bg-black text-white font-bold uppercase text-xs px-2 py-0.5 border border-neutral-600 focus:outline-none cursor-pointer"
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
                  className="text-neutral-400 hover:text-white ml-1 cursor-pointer"
                  title="Show All Opponents"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sub-Filter Bar: Season, Phase (Reg / Playoffs), and Overall Coach Record Strip */}
        <div className="bg-white border-b-2 border-black px-4 sm:px-6 py-3 flex flex-col xl:flex-row xl:items-center justify-between gap-3 font-sans">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Phase Filter */}
            <div className="flex items-center border border-black bg-[#f4f1ea] p-0.5">
              {(
                [
                  { id: 'ALL', label: 'All Games' },
                  { id: 'REG', label: 'Regular Season' },
                  { id: 'PLAYOFFS', label: 'Playoffs' }
                ] as const
              ).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setH2hPhaseFilter(p.id)}
                  className={`px-2.5 py-1 text-[11px] font-black uppercase cursor-pointer transition ${
                    h2hPhaseFilter === p.id
                      ? 'bg-black text-white'
                      : 'text-black hover:bg-black/10'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* All Seasons Badge */}
            <div className="flex items-center gap-1.5 bg-black text-white px-2.5 py-1 text-[11px] font-mono font-black uppercase border border-black">
              <span>All Seasons Included ({availableCoachSeasons.length} Seasons • {coachMatchesFiltered.length} Games)</span>
            </div>
          </div>

          {/* Active Coach Overall Totals Pill */}
          {activeH2HCoach && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-mono bg-[#f4f1ea] border border-black px-3 py-1.5">
              <span className="font-black uppercase text-black">
                {activeH2HCoach.coach_name} Overall:
              </span>
              <span>
                <strong className="text-black">{activeCoachOverallTotals.gp}</strong> GP
              </span>
              <span className="font-black text-emerald-800">
                {activeCoachOverallTotals.w}-{activeCoachOverallTotals.l}-{activeCoachOverallTotals.t}
                {activeCoachOverallTotals.otl > 0 ? `-${activeCoachOverallTotals.otl}` : ''}
              </span>
              <span>
                <strong className="text-blue-900">{activeCoachOverallTotals.pts}</strong> PTS
              </span>
              <span>
                WIN%:{' '}
                <strong className="text-black">
                  {activeCoachOverallTotals.gp > 0
                    ? `${((activeCoachOverallTotals.w / activeCoachOverallTotals.gp) * 100).toFixed(1)}%`
                    : '0.0%'}
                </strong>
              </span>
              <span>
                GF-GA:{' '}
                <strong className="text-black">
                  {activeCoachOverallTotals.gf}-{activeCoachOverallTotals.ga}
                </strong>{' '}
                (
                <span
                  className={
                    activeCoachOverallTotals.gf - activeCoachOverallTotals.ga >= 0
                      ? 'text-emerald-700 font-bold'
                      : 'text-red-700 font-bold'
                  }
                >
                  {activeCoachOverallTotals.gf - activeCoachOverallTotals.ga >= 0
                    ? `+${activeCoachOverallTotals.gf - activeCoachOverallTotals.ga}`
                    : activeCoachOverallTotals.gf - activeCoachOverallTotals.ga}
                </span>
                )
              </span>
            </div>
          )}
        </div>

        {/* DIRECT 1-ON-1 RIVALRY BANNER (WHEN AN OPPONENT COACH IS SELECTED) */}
        {activeOneOnOneSummary && activeH2HCoach && (
          <div className="bg-black text-white border-b-2 border-black p-4 sm:p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-black">
                  DIRECT HEAD-TO-HEAD COACHING TALE OF THE TAPE
                </div>
                <h3 className="text-lg sm:text-2xl font-black uppercase text-white flex items-center gap-2 flex-wrap">
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
                className="self-start md:self-auto px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-600 font-mono text-xs font-bold uppercase cursor-pointer flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                <span>Show All Opponents</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 font-mono text-xs mb-4">
              <div className="bg-neutral-900 text-white border border-neutral-700 p-3">
                <div className="text-[10px] text-neutral-400 uppercase font-bold">H2H RECORD</div>
                <div className="text-lg font-black text-white mt-0.5">
                  {activeOneOnOneSummary.w}-{activeOneOnOneSummary.l}-{activeOneOnOneSummary.t}
                  {activeOneOnOneSummary.otl > 0 ? `-${activeOneOnOneSummary.otl}` : ''}
                </div>
                <div className="text-[10px] text-amber-400">
                  {activeOneOnOneSummary.gp} Games Played • {activeOneOnOneSummary.pts} PTS
                </div>
              </div>

              <div className="bg-neutral-900 text-white border border-neutral-700 p-3">
                <div className="text-[10px] text-neutral-400 uppercase font-bold">WIN PERCENTAGE</div>
                <div className="text-lg font-black text-emerald-400 mt-0.5">
                  {activeOneOnOneSummary.winPct}%
                </div>
                <div className="text-[10px] text-neutral-400">
                  Streak: <strong className="text-white">{activeOneOnOneSummary.streak}</strong>
                </div>
              </div>

              <div className="bg-neutral-900 text-white border border-neutral-700 p-3">
                <div className="text-[10px] text-neutral-400 uppercase font-bold">GOALS FOR / AGAINST</div>
                <div className="text-lg font-black text-white mt-0.5">
                  {activeOneOnOneSummary.gf} &ndash; {activeOneOnOneSummary.ga}
                </div>
                <div className="text-[10px] text-neutral-400">
                  Diff:{' '}
                  <strong
                    className={
                      activeOneOnOneSummary.gd >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }
                  >
                    {activeOneOnOneSummary.gd >= 0
                      ? `+${activeOneOnOneSummary.gd}`
                      : activeOneOnOneSummary.gd}
                  </strong>{' '}
                  • {activeOneOnOneSummary.gpg} GPG
                </div>
              </div>

              <div className="bg-neutral-900 text-white border border-neutral-700 p-3">
                <div className="text-[10px] text-neutral-400 uppercase font-bold">HOME ICE RECORD</div>
                <div className="text-lg font-black text-white mt-0.5">
                  {activeOneOnOneSummary.homeW}-{activeOneOnOneSummary.homeL}-{activeOneOnOneSummary.homeT}
                  {activeOneOnOneSummary.homeOtl > 0 ? `-${activeOneOnOneSummary.homeOtl}` : ''}
                </div>
                <div className="text-[10px] text-neutral-400">As Home Coach</div>
              </div>

              <div className="bg-neutral-900 text-white border border-neutral-700 p-3">
                <div className="text-[10px] text-neutral-400 uppercase font-bold">ROAD RECORD</div>
                <div className="text-lg font-black text-white mt-0.5">
                  {activeOneOnOneSummary.awayW}-{activeOneOnOneSummary.awayL}-{activeOneOnOneSummary.awayT}
                  {activeOneOnOneSummary.awayOtl > 0 ? `-${activeOneOnOneSummary.awayOtl}` : ''}
                </div>
                <div className="text-[10px] text-neutral-400">As Visiting Coach</div>
              </div>

              <div className="bg-neutral-900 text-white border border-neutral-700 p-3">
                <div className="text-[10px] text-neutral-400 uppercase font-bold">CLUTCH / PLAYOFFS</div>
                <div className="text-sm font-black text-white mt-1">
                  OT: {activeOneOnOneSummary.otW}-{activeOneOnOneSummary.otL}
                </div>
                <div className="text-[10px] text-amber-400 mt-0.5">
                  Playoffs: {activeOneOnOneSummary.poW}-{activeOneOnOneSummary.poL}
                </div>
              </div>
            </div>

            {/* Visual Win Share Bar */}
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
                <div className="w-full h-3 bg-neutral-800 border border-neutral-600 flex overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all"
                    style={{
                      width: `${(activeOneOnOneSummary.w / activeOneOnOneSummary.gp) * 100}%`
                    }}
                  />
                  <div
                    className="bg-neutral-400 h-full transition-all"
                    style={{
                      width: `${(activeOneOnOneSummary.t / activeOneOnOneSummary.gp) * 100}%`
                    }}
                  />
                  <div
                    className="bg-cyan-500 h-full transition-all"
                    style={{
                      width: `${((activeOneOnOneSummary.l + activeOneOnOneSummary.otl) / activeOneOnOneSummary.gp) * 100}%`
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* MAIN H2H TWO-COLUMN BODY: RECORDS VS ALL COACHES LEFT + RECENT SCORES RIGHT */}
        <div className="p-4 sm:p-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* LEFT 7 COLS: HEAD-TO-HEAD RECORDS AGAINST ALL OTHER COACHES */}
          <div className="xl:col-span-7 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b-2 border-black">
              <div>
                <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-black">
                  {activeH2HCoach?.coach_name || 'Coach'} &mdash; Record vs. Every Coach (
                  {sortedAndFilteredH2HOpponents.length})
                </h3>
                <p className="text-[11px] font-sans text-slate-600">
                  Click any opponent coach row to filter recent scores and inspect the 1-on-1 rivalry breakdown.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={h2hOpponentSearch}
                    onChange={e => setH2hOpponentSearch(e.target.value)}
                    placeholder="Filter opponent..."
                    className="pl-7 pr-2.5 py-1 text-xs border border-black bg-white text-black font-sans w-40 focus:outline-none"
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
              <div className="p-10 text-center font-mono text-xs uppercase text-slate-500 border border-black bg-white">
                Computing Head-to-Head Coaching Records...
              </div>
            ) : sortedAndFilteredH2HOpponents.length === 0 ? (
              <div className="p-10 text-center font-sans text-xs italic text-slate-500 border border-black bg-white">
                No head-to-head matchups found for this coach in the selected filter.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[520px] overflow-y-auto border-2 border-black bg-white">
                <table className="w-full text-left border-collapse font-mono text-xs">
                  <thead className="bg-black text-white sticky top-0 z-10 text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-2.5 border-b border-neutral-800">Opponent Coach</th>
                      <th className="py-2.5 px-2 border-b border-neutral-800 text-center">GP</th>
                      <th className="py-2.5 px-2 border-b border-neutral-800 text-center">W-L-T-OTL</th>
                      <th className="py-2.5 px-2 border-b border-neutral-800 text-center">PTS</th>
                      <th className="py-2.5 px-2 border-b border-neutral-800 text-center">WIN%</th>
                      <th className="py-2.5 px-2 border-b border-neutral-800 text-center">GF-GA</th>
                      <th className="py-2.5 px-2 border-b border-neutral-800 text-center">DIFF</th>
                      <th className="py-2.5 px-2 border-b border-neutral-800 text-center">LAST 5</th>
                      <th className="py-2.5 px-2.5 border-b border-neutral-800 text-right">LAST SCORE</th>
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
                          <td className="py-2 px-2.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-black">{opp.opponentName}</span>
                              {opp.opponentTeams.slice(0, 2).map(abbr => (
                                <span
                                  key={abbr}
                                  className="bg-black text-white text-[9px] px-1 py-0.1 font-black"
                                >
                                  {abbr}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-slate-700">{opp.gp}</td>
                          <td className="py-2 px-2 text-center font-black text-black whitespace-nowrap">
                            {opp.w}-{opp.l}-{opp.t}
                            {opp.otl > 0 ? `-${opp.otl}` : ''}
                          </td>
                          <td className="py-2 px-2 text-center font-black text-blue-900">{opp.pts}</td>
                          <td className="py-2 px-2 text-center">
                            <span
                              className={`font-bold ${
                                opp.winPct >= 50 ? 'text-emerald-800' : 'text-slate-700'
                              }`}
                            >
                              {opp.winPct}%
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center text-slate-700 whitespace-nowrap">
                            {opp.gf}-{opp.ga}
                          </td>
                          <td
                            className={`py-2 px-2 text-center font-bold ${
                              opp.gd > 0
                                ? 'text-emerald-700'
                                : opp.gd < 0
                                ? 'text-red-700'
                                : 'text-slate-500'
                            }`}
                          >
                            {opp.gd > 0 ? `+${opp.gd}` : opp.gd}
                          </td>
                          <td className="py-2 px-2 text-center">
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
                          <td className="py-2 px-2.5 text-right whitespace-nowrap">
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
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b-2 border-black">
              <div>
                <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-black">
                  {selectedOpponentId === 'ALL'
                    ? `${activeH2HCoach?.coach_name || 'Coach'} — Recent Scores (${displayedRecentMatches.length})`
                    : `${activeH2HCoach?.coach_name} vs. ${activeOpponentCoach?.coach_name} Scores (${displayedRecentMatches.length})`}
                </h3>
                <p className="text-[11px] font-sans text-slate-600">
                  {selectedOpponentId === 'ALL'
                    ? 'Latest scores across all opponents (click any opponent to filter)'
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
              <div className="p-10 text-center font-mono text-xs uppercase text-slate-500 border border-black bg-white">
                Loading Recent Matchup Scores...
              </div>
            ) : displayedRecentMatches.length === 0 ? (
              <div className="p-10 text-center font-sans text-xs italic text-slate-500 border border-black bg-white">
                No games played between these coaches in the selected filter.
              </div>
            ) : (
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
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
                  const myShots = isHome ? match.home_shots : match.away_shots;
                  const oppShots = isHome ? match.away_shots : match.home_shots;

                  let outcome: 'W' | 'L' | 'T' | 'OTL' = 'L';
                  if (match.is_tie || myScore === oppScore) outcome = 'T';
                  else if (myScore > oppScore) outcome = 'W';
                  else if (match.is_ot && !match.is_playoff) outcome = 'OTL';

                  return (
                    <div
                      key={match.id}
                      className="bg-white border-2 border-black p-2.5 flex items-center justify-between gap-2 hover:bg-amber-50/40 transition-colors"
                    >
                      {/* Outcome Badge & Season Info */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`w-8 h-8 shrink-0 font-mono text-xs font-black flex items-center justify-center border border-black ${
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

                          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-600 mt-0.5 truncate">
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

                      {/* Final Score & Shots */}
                      <div className="text-right shrink-0 font-mono">
                        <div className="text-sm sm:text-base font-black text-black">
                          {myScore} &ndash; {oppScore}
                        </div>
                        {myShots !== null && oppShots !== null ? (
                          <div className="text-[9px] text-slate-500">
                            SOG: {myShots}-{oppShots}
                          </div>
                        ) : (
                          <div className="text-[9px] text-slate-400 uppercase">
                            {isHome ? 'HOME' : 'AWAY'}
                          </div>
                        )}
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
      {/* MANAGERS & FRANCHISE DIRECTORY GRID                                 */}
      {/* =================================================================== */}
      <div className="mb-3 flex items-center justify-between border-b-2 border-black pb-2">
        <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
          All League Managers Directory ({filteredCoaches.length})
        </h2>
        <span className="text-xs font-mono text-slate-600 hidden sm:inline">
          Click &ldquo;Head-to-Head &amp; Scores&rdquo; on any manager card to inspect their matchups
        </span>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs font-black uppercase tracking-widest text-gray-500 font-mono">
          Loading Staff Directory, Head-to-Head Records &amp; Team Logos across all historical seasons...
        </div>
      ) : filteredCoaches.length === 0 ? (
        <div className="p-16 text-center text-xs font-bold uppercase italic text-gray-500 border border-black bg-white">
          No coaches or managers found matching &ldquo;{search}&rdquo;.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCoaches.map(coach => (
            <ManagerCard
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
    </div>
  );
}

function ManagerCard({
  coach,
  selectedLeagueType,
  careerRecord,
  isSelectedForH2H,
  onSelectH2H
}: {
  coach: CoachEntry;
  selectedLeagueType: string;
  careerRecord?: { gp: number; w: number; l: number; t: number; otl: number; pts: number; gf: number; ga: number };
  isSelectedForH2H: boolean;
  onSelectH2H: () => void;
}) {
  const displayedTeams = useMemo(() => {
    if (selectedLeagueType === 'ALL') return coach.teams;
    return coach.teams.filter(t => t.league_type === selectedLeagueType);
  }, [coach.teams, selectedLeagueType]);

  // Extract unique leagues this coach participates in
  const uniqueLeagues = useMemo(() => {
    return Array.from(new Set(coach.teams.map(t => t.league_type)));
  }, [coach.teams]);

  const primaryTeam = displayedTeams[0] || coach.teams[0];

  return (
    <div
      className={`border-2 border-black p-4 bg-[#fdfaf5] shadow-[4px_4px_0px_rgba(0,0,0,1)] flex flex-col justify-between transition-transform duration-100 hover:translate-y-[-1px] ${
        isSelectedForH2H ? 'ring-2 ring-amber-500' : ''
      }`}
    >
      <div>
        {/* Manager Header Row */}
        <div className="flex justify-between items-start border-b-2 border-black pb-2.5 mb-3 gap-2">
          <div className="min-w-0 flex-1">
            {primaryTeam ? (
              <Link
                href={`/team/${primaryTeam.team_id}?season=${primaryTeam.league_id}`}
                className="group inline-flex items-center gap-1.5"
                title={`Open ${coach.coach_name}'s team file for ${primaryTeam.season_badge}`}
              >
                <h2 className="text-base sm:text-lg font-black uppercase truncate text-black group-hover:text-red-800 group-hover:underline leading-tight">
                  {coach.coach_name}
                </h2>
                <ExternalLink className="w-3.5 h-3.5 text-neutral-400 group-hover:text-red-800 transition-colors shrink-0" />
              </Link>
            ) : (
              <h2 className="text-base sm:text-lg font-black uppercase truncate text-black leading-tight">
                {coach.coach_name}
              </h2>
            )}
            {coach.discord_tag && (
              <p className="text-[11px] font-mono text-slate-600 font-bold truncate">
                @{coach.discord_tag}
              </p>
            )}
          </div>

          {/* League Badges */}
          <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
            {uniqueLeagues.map(lType => {
              const conf = LEAGUE_LOGOS[lType];
              return (
                <span
                  key={lType}
                  className="font-mono text-[9px] font-black uppercase px-1.5 py-0.5 bg-black text-white rounded-none"
                  title={conf?.name || `${lType} League`}
                >
                  {lType}
                </span>
              );
            })}
          </div>
        </div>

        {/* Career Record & Quick H2H Button */}
        <div className="mb-3 bg-white border border-black p-2 flex items-center justify-between gap-2 font-mono text-xs">
          {careerRecord && careerRecord.gp > 0 ? (
            <div>
              <div className="text-[9px] uppercase text-slate-500 font-bold">
                OVERALL RECORD ({careerRecord.gp} GP)
              </div>
              <div className="font-black text-black">
                {careerRecord.w}-{careerRecord.l}-{careerRecord.t}
                {careerRecord.otl > 0 ? `-${careerRecord.otl}` : ''}{' '}
                <span className="text-emerald-800 text-[10px]">
                  ({((careerRecord.w / careerRecord.gp) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-slate-500">No tracked games yet</div>
          )}

          <button
            type="button"
            onClick={onSelectH2H}
            className="px-2.5 py-1 bg-black hover:bg-neutral-800 text-white font-mono text-[10px] font-black uppercase cursor-pointer flex items-center gap-1 shrink-0"
          >
            <Swords className="w-3 h-3" />
            <span>H2H &amp; Scores</span>
          </button>
        </div>

        {/* Team Assignments with Logos */}
        <div className="mb-2">
          <div className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
            <span>Teams &amp; Seasons Coached ({displayedTeams.length})</span>
            {displayedTeams.length > 0 && (
              <span className="text-[9px] text-slate-400">Click team to view season</span>
            )}
          </div>

          {displayedTeams.length === 0 ? (
            <div className="p-3 bg-neutral-100 border border-neutral-200 text-center text-xs italic text-slate-500 font-sans">
              No active team in this specific league tier.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {displayedTeams.map((team, idx) => (
                <TeamRow key={`${team.team_id}-${team.league_id}-${idx}`} team={team} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer link to primary team */}
      {primaryTeam && (
        <div className="pt-3 mt-3 border-t border-black/15 flex justify-between items-center text-xs">
          <span className="font-mono text-[10px] text-slate-600 font-bold uppercase">
            Active: {primaryTeam.abbreviation} ({primaryTeam.season_badge})
          </span>
          <Link
            href={`/team/${primaryTeam.team_id}?season=${primaryTeam.league_id}`}
            className="font-bold text-red-800 uppercase hover:underline text-[11px] flex items-center gap-1"
            title={`View team page for Season ${primaryTeam.season_badge}`}
          >
            Go to Team Page &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}

function TeamRow({ team }: { team: CoachTeamInfo }) {
  const [imgError, setImgError] = useState(false);

  return (
    <Link
      href={`/team/${team.team_id}?season=${team.league_id}`}
      className="flex items-center gap-2.5 p-2 bg-white border border-neutral-300 hover:border-black hover:bg-amber-50/50 transition-colors group"
    >
      {/* Team Logo */}
      <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-neutral-50 border border-neutral-200 p-0.5">
        {team.logo_url && !imgError ? (
          <img
            src={team.logo_url}
            alt={team.team_name}
            onError={() => setImgError(true)}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-[10px] font-mono font-black uppercase text-neutral-600">
            {team.abbreviation}
          </span>
        )}
      </div>

      {/* Team Name and Season Badge */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="font-bold text-xs text-neutral-900 group-hover:text-blue-800 group-hover:underline truncate block">
            {team.team_name}
          </span>
          <span className="text-[10px] font-mono font-black text-amber-800 bg-amber-100 px-1 py-0.2 shrink-0 border border-amber-300">
            {team.season_badge}
          </span>
        </div>
        <div className="text-[10px] font-mono text-neutral-500 truncate">
          {team.season_name}
        </div>
      </div>
    </Link>
  );
}
