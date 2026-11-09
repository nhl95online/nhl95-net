"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import ActiveRostersFuturesView from '@/components/ActiveRostersFuturesView';
import CoachProfileView, { W_LEAGUE_COACH_FALLBACK } from '@/components/CoachProfileView';
import { W_SEASON_CONFIG, O_SEASON_CONFIG, W_LEAGUE_COACH_MAP } from '@/lib/seasons';
import {
  Search,
  Users,
  Shield,
  Swords,
  Table as TableIcon,
  Layers,
  Trophy,
  MapPin,
  Activity
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
    logoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/Original6.png',
    fallbackUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/Original6.png'
  },
  V: {
    name: 'Vintage',
    logoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/Vintage.png',
    fallbackUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Vintage.png'
  },
  G: {
    name: 'Golden Era',
    logoUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/GoldenEra.png',
    fallbackUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Golden%20Era.png'
  }
};

const SEASON_TYPES: Record<number, string> = {
  1: 'W', 2: 'W', 3: 'W', 4: 'W', 5: 'Q', 6: 'W', 7: 'Q', 8: 'Q', 9: 'W', 10: 'Q',
  11: 'W', 12: 'Q', 13: 'Q', 14: 'W', 15: 'Q', 16: 'G', 17: 'Q', 18: 'W', 19: 'Q', 20: 'V',
  21: 'Q', 22: 'W', 23: 'Q', 24: 'W', 25: 'Q', 26: 'Q', 27: 'Q', 28: 'W', 29: 'Q', 30: 'Q',
  31: 'W', 32: 'Q', 33: 'W', 34: 'Q', 35: 'W', 36: 'Q', 37: 'W', 38: 'W', 39: 'O', 40: 'W'
};

export const getLeaguePrefix = (league: { league_id: number | string; season_name?: string; league_name?: string }) => {
  const name = String(league.season_name || league.league_name || '').trim().toUpperCase();
  if (name) {
    const match = name.match(/^[A-Z]+/);
    if (match && match[0] && LEAGUE_LOGOS[match[0]]) return match[0];
  }
  const idNum = Number(league.league_id);
  if (SEASON_TYPES[idNum]) return SEASON_TYPES[idNum];
  return 'W';
};

export const formatSeasonBadge = (seasonId: number | string, seasonName?: string) => {
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

interface ConsolidatedFranchiseEntry {
  key: string;
  primary_team_id: number;
  latest_league_id: number;
  latest_season_badge: string;
  team_name: string;
  abbreviation: string;
  logo_url: string | null;
  banner_filename?: string;
  league_type: string;
  division: string;
  arenaName: string;
  coachId: number | null;
  coachName: string;
  seasons_count: number;
  season_badges: string[];
  allTimeRecord: {
    gp: number;
    w: number;
    l: number;
    t: number;
    otl: number;
    pts: number;
    gf: number;
    ga: number;
    gd: number;
    winPct: number;
    gpg: number;
    gaa: number;
  };
  latestRecord: {
    gp: number;
    w: number;
    l: number;
    t: number;
    otl: number;
    pts: number;
    gf: number;
    ga: number;
    gd: number;
  };
  recentOutcomes: Array<'W' | 'L' | 'T' | 'OTL'>;
  lastGameText?: string;
  goaliesPreview: string[];
  skatersPreview: string[];
  sisterTeams: Array<{
    key: string;
    team_id: number;
    league_id: number;
    team_name: string;
    abbreviation: string;
    league_type: string;
    logo_url: string | null;
    w: number;
    l: number;
    t: number;
    otl: number;
    pts: number;
  }>;
  coachTotalRecord: {
    gp: number;
    w: number;
    l: number;
    t: number;
    otl: number;
    pts: number;
    winPct: number;
  };
}

export default function AllTeamsContent() {
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedLeagueType, setSelectedLeagueType] = useState<string>('ALL');
  const searchParams = useSearchParams();
  const router = useRouter();
  const coachParam = searchParams.get('coach') || "";
  const teamParam = searchParams.get('team') || "";
  const tabParam = (searchParams.get('tab') || "").toLowerCase();
  const query = searchParams.get('q') || "";
  const [searchVal, setSearchVal] = useState(query);
  const [sortBy, setSortBy] = useState<'pts' | 'winPct' | 'gp' | 'gd' | 'name' | 'coach'>('pts');

  const resolveTabFromParam = (tp: string): 'directory' | 'rosters' | 'coach' => {
    if (tp === 'futures' || tp === 'active' || tp === 'rosters' || tp === 'league-rosters') return 'rosters';
    if (tp === 'coach' || tp === 'coaches' || tp === 'managers' || tp === 'coach-profile') return 'coach';
    return 'directory';
  };

  const [activeTab, setActiveTab] = useState<'directory' | 'rosters' | 'coach'>(
    resolveTabFromParam(tabParam)
  );
  const [franchises, setFranchises] = useState<ConsolidatedFranchiseEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setSearchVal(query);
  }, [query]);

  useEffect(() => {
    setActiveTab(resolveTabFromParam(tabParam));
  }, [tabParam]);

  const availableLeagueTypes = ['W', 'Q', 'O', 'V', 'G'];

  useEffect(() => {
    async function fetchDirectoryData() {
      setLoading(true);
      try {
        const [seasonsRes, teamsRes, coachesRes, standingsRes, statsRes, schedRes] = await Promise.all([
          supabase.from('leagues').select('league_id, league_name').order('league_id', { ascending: false }),
          supabase.from('league_teams').select('*').order('league_id', { ascending: false }),
          supabase.from('league_coaches').select('coach_id, coach_name'),
          supabase.from('league_standings').select('*'),
          supabase
            .from('league_gamestats')
            .select('game_id, home_score, away_score, game_meta, league_id, home_team_id, away_team_id, home_stats, away_stats')
            .order('game_id', { ascending: false })
            .range(0, 4999),
          supabase
            .from('league_schedule')
            .select('game_id, home_score, away_score, game_meta, league_id, home_team_id, away_team_id, played')
            .order('game_id', { ascending: false })
            .range(0, 4999)
        ]);

        const seasonData = (seasonsRes.data || []).map((l: any) => ({
          league_id: l.league_id,
          season_name: l.league_name || `Season ${l.league_id}`
        }));
        setSeasons(seasonData);

        const seasonNameMap = new Map<number, string>();
        seasonData.forEach((s: any) => {
          seasonNameMap.set(Number(s.league_id), s.season_name);
        });

        const allTeamsData = teamsRes.data || [];
        const coachesData = coachesRes.data || [];
        const standingsData = standingsRes.data || [];
        const statsData = statsRes.data || [];
        const schedData = schedRes.data || [];

        const coachMap: Record<number, string> = {};
        const coachNameLookup: Record<string, number> = {};
        coachesData.forEach((c: any) => {
          if (c.coach_id !== undefined && c.coach_id !== null) {
            coachMap[Number(c.coach_id)] = c.coach_name;
            coachNameLookup[String(c.coach_name || '').trim().toLowerCase()] = Number(c.coach_id);
          }
        });

        // Compute live records per (league_id, team_id)
        const computedBySeasonTeam = new Map<
          string,
          {
            gp: number;
            w: number;
            l: number;
            t: number;
            otl: number;
            pts: number;
            gf: number;
            ga: number;
            gd: number;
            outcomes: Array<'W' | 'L' | 'T' | 'OTL'>;
            lastGameText?: string;
          }
        >();

        const ensureRecord = (sId: number, tId: number) => {
          const key = `${sId}-${tId}`;
          let rec = computedBySeasonTeam.get(key);
          if (!rec) {
            rec = { gp: 0, w: 0, l: 0, t: 0, otl: 0, pts: 0, gf: 0, ga: 0, gd: 0, outcomes: [] };
            computedBySeasonTeam.set(key, rec);
          }
          return rec;
        };

        const resolveTeamKeyInSeason = (rawId: any, sId: number): number | null => {
          const num = Number(rawId);
          if (!num || num === 999 || num === 0 || num === 68) return null;
          const direct = allTeamsData.find((t: any) => Number(t.team_id) === num && Number(t.league_id) === sId);
          if (direct) return Number(direct.team_id);

          const matchTeam = allTeamsData.find((t: any) => Number(t.team_id) === num || Number(t.coach_id) === num);
          if (matchTeam) {
            const seasonMatch = allTeamsData.find(
              (t: any) =>
                Number(t.league_id) === sId &&
                ((t.abbreviation &&
                  t.abbreviation.trim().toUpperCase() === (matchTeam.abbreviation || '').trim().toUpperCase()) ||
                  (t.team_name &&
                    t.team_name.trim().toUpperCase() === (matchTeam.team_name || '').trim().toUpperCase()) ||
                  (Number(t.coach_id) > 0 && Number(t.coach_id) === Number(matchTeam.coach_id)))
            );
            if (seasonMatch) return Number(seasonMatch.team_id);
          }
          return num;
        };

        const applyGame = (
          sId: number,
          rawHId: any,
          rawAId: any,
          homeScore: number,
          awayScore: number,
          gameMeta: any,
          statsObj?: any
        ) => {
          if (!sId) return;
          const hId = resolveTeamKeyInSeason(rawHId, sId);
          const aId = resolveTeamKeyInSeason(rawAId, sId);
          if (!hId || !aId || hId === aId) return;

          let isOT = false;
          let isTie = false;
          if (gameMeta) {
            try {
              const meta = typeof gameMeta === 'string' ? JSON.parse(gameMeta) : gameMeta;
              isOT =
                meta.is_ot === true ||
                meta.is_ot === 'true' ||
                meta.is_ot === 1 ||
                meta.is_ot === '1' ||
                meta.isOT === true ||
                meta.isOT === 'true' ||
                meta.isOT === 1;
              isTie = meta.is_tie === true || meta.is_tie === 'true' || meta.is_tie === 1 || meta.is_tie === '1';
            } catch {
              const lowStr = String(gameMeta || '').toLowerCase();
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
          if (!isOT && statsObj) {
            try {
              const hStats =
                typeof statsObj.home_stats === 'string' ? JSON.parse(statsObj.home_stats) : statsObj.home_stats;
              const aStats =
                typeof statsObj.away_stats === 'string' ? JSON.parse(statsObj.away_stats) : statsObj.away_stats;
              if (
                Number(hStats?.home_ot_goals) > 0 ||
                Number(aStats?.away_ot_goals) > 0 ||
                Number(hStats?.home_ot_shots) > 0 ||
                Number(aStats?.away_ot_shots) > 0
              ) {
                isOT = true;
              }
            } catch {}
          }
          if (homeScore === awayScore && !isOT) {
            isTie = true;
          }

          const hRec = ensureRecord(sId, hId);
          const aRec = ensureRecord(sId, aId);
          hRec.gp += 1;
          aRec.gp += 1;
          hRec.gf += homeScore;
          hRec.ga += awayScore;
          hRec.gd = hRec.gf - hRec.ga;
          aRec.gf += awayScore;
          aRec.ga += homeScore;
          aRec.gd = aRec.gf - aRec.ga;

          let hOut: 'W' | 'L' | 'T' | 'OTL' = 'L';
          let aOut: 'W' | 'L' | 'T' | 'OTL' = 'L';

          if (isTie) {
            hRec.t += 1;
            hRec.pts += 1;
            aRec.t += 1;
            aRec.pts += 1;
            hOut = 'T';
            aOut = 'T';
          } else if (homeScore > awayScore) {
            hRec.w += 1;
            hRec.pts += 2;
            hOut = 'W';
            if (isOT) {
              aRec.otl += 1;
              aRec.pts += 1;
              aOut = 'OTL';
            } else {
              aRec.l += 1;
              aOut = 'L';
            }
          } else if (awayScore > homeScore) {
            aRec.w += 1;
            aRec.pts += 2;
            aOut = 'W';
            if (isOT) {
              hRec.otl += 1;
              hRec.pts += 1;
              hOut = 'OTL';
            } else {
              hRec.l += 1;
              hOut = 'L';
            }
          }

          hRec.outcomes.push(hOut);
          aRec.outcomes.push(aOut);
          if (!hRec.lastGameText) hRec.lastGameText = `${hOut} ${homeScore}-${awayScore}`;
          if (!aRec.lastGameText) aRec.lastGameText = `${aOut} ${awayScore}-${homeScore}`;
        };

        const processedStatsGameIds = new Set<string>();
        statsData.forEach((stats: any) => {
          const gIdStr = `${stats.league_id}-${String(stats.game_id).trim()}`;
          processedStatsGameIds.add(gIdStr);
          applyGame(
            Number(stats.league_id),
            stats.home_team_id,
            stats.away_team_id,
            Number(stats.home_score) || 0,
            Number(stats.away_score) || 0,
            stats.game_meta,
            stats
          );
        });

        schedData.forEach((game: any) => {
          const gIdStr = `${game.league_id}-${String(game.game_id).trim()}`;
          const rawPlayed = String(game.played || '').trim().toLowerCase();
          const isPlayed = rawPlayed === 'true' || rawPlayed === '1' || rawPlayed === 'y';
          if (isPlayed && !processedStatsGameIds.has(gIdStr) && game.game_meta) {
            applyGame(
              Number(game.league_id),
              game.home_team_id,
              game.away_team_id,
              Number(game.home_score) || 0,
              Number(game.away_score) || 0,
              game.game_meta,
              game
            );
          }
        });

        const seasonsWithComputedGames = new Set<number>();
        computedBySeasonTeam.forEach((rec, key) => {
          if (rec.gp > 0) {
            seasonsWithComputedGames.add(Number(key.split('-')[0]));
          }
        });

        // Consolidate all season rows into grouped Franchises (not broken down by season!)
        const franchiseMap = new Map<string, ConsolidatedFranchiseEntry>();

        // Sort teams newest season first so the first one encountered for a franchise is its latest active identity
        const sortedRawTeams = [...allTeamsData].sort((a, b) => Number(b.league_id) - Number(a.league_id));

        sortedRawTeams.forEach((team: any) => {
          const sId = Number(team.league_id) || 1;
          const tId = Number(team.team_id);
          const sName = seasonNameMap.get(sId) || `Season ${sId}`;
          const lType = getLeaguePrefix({ league_id: sId, season_name: sName });
          const sBadge = formatSeasonBadge(sId, sName);
          const abbr = String(team.abbreviation || team.team_name?.slice(0, 3) || 'TM').trim().toUpperCase();

          const computedRec = computedBySeasonTeam.get(`${sId}-${tId}`);
          const dbRecord = standingsData.find(
            (s: any) => Number(s.team_id) === tId && Number(s.season_id) === sId
          );

          const useComputed = seasonsWithComputedGames.has(sId) || (computedRec && computedRec.gp > 0);
          const w = useComputed ? (computedRec?.w || 0) : (Number(dbRecord?.w) || 0);
          const l = useComputed ? (computedRec?.l || 0) : (Number(dbRecord?.l) || 0);
          const t = useComputed ? (computedRec?.t || 0) : (Number(dbRecord?.t) || 0);
          const otl = useComputed ? (computedRec?.otl || 0) : (Number(dbRecord?.otl) || 0);
          const gp = useComputed ? (computedRec?.gp || (w + l + t + otl)) : (Number(dbRecord?.gp) || (w + l + t + otl));
          const gf = useComputed ? (computedRec?.gf || 0) : (Number(dbRecord?.gf) || 0);
          const ga = useComputed ? (computedRec?.ga || 0) : (Number(dbRecord?.ga) || 0);
          const gd = gf - ga;
          const pts = useComputed
            ? (computedRec?.pts ?? (w * 2 + otl + t))
            : (dbRecord?.pts !== undefined ? Number(dbRecord.pts) : (w * 2 + otl + t));

          let arenaName = team.arena || team.arena_name || '';
          if (!arenaName && team.team_meta) {
            if (typeof team.team_meta === 'object') {
              arenaName = team.team_meta.arena || team.team_meta.arena_name || team.team_meta.stadium || '';
            } else if (typeof team.team_meta === 'string') {
              try {
                const parsed = JSON.parse(team.team_meta);
                arenaName = parsed.arena || parsed.arena_name || parsed.stadium || '';
              } catch {
                arenaName = team.team_meta;
              }
            }
          }

          let resolvedCoachId = team.coach_id ? Number(team.coach_id) : null;
          let resolvedCoachName =
            (resolvedCoachId && coachMap[resolvedCoachId]) ||
            team.coach_name ||
            '';

          if (!resolvedCoachName && lType === 'W' && W_LEAGUE_COACH_FALLBACK[abbr]) {
            resolvedCoachId = W_LEAGUE_COACH_FALLBACK[abbr].coach_id;
            resolvedCoachName = W_LEAGUE_COACH_FALLBACK[abbr].coach_name;
          }
          if (!resolvedCoachId && resolvedCoachName) {
            resolvedCoachId = coachNameLookup[resolvedCoachName.trim().toLowerCase()] || null;
          }
          if (!resolvedCoachName) resolvedCoachName = 'TBA';

          const fKey = `${lType}:${abbr}`;
          let existing = franchiseMap.get(fKey);

          if (!existing) {
            const goaliesPreview =
              lType === 'W'
                ? (W_SEASON_CONFIG.goalies?.[abbr] || []).filter((g: string) => g && g !== '--')
                : lType === 'O'
                ? (O_SEASON_CONFIG.goalies?.[abbr] || []).filter((g: string) => g && g !== '--')
                : [];
            const skatersPreview =
              lType === 'W'
                ? (W_SEASON_CONFIG.skaters?.[abbr] || []).slice(0, 4)
                : lType === 'O'
                ? (O_SEASON_CONFIG.skaters?.[abbr] || []).slice(0, 4)
                : [];

            existing = {
              key: fKey,
              primary_team_id: tId,
              latest_league_id: sId,
              latest_season_badge: sBadge,
              team_name: team.team_name || abbr,
              abbreviation: abbr,
              logo_url: team.logo_url || null,
              banner_filename: team.banner_filename || undefined,
              league_type: lType,
              division: team.division ? String(team.division).trim() : '',
              arenaName: arenaName || W_LEAGUE_COACH_MAP[abbr]?.city || 'League Arena',
              coachId: resolvedCoachId,
              coachName: resolvedCoachName,
              seasons_count: 1,
              season_badges: [sBadge],
              allTimeRecord: {
                gp,
                w,
                l,
                t,
                otl,
                pts,
                gf,
                ga,
                gd,
                winPct: gp > 0 ? Math.round((w / gp) * 1000) / 10 : 0,
                gpg: gp > 0 ? Math.round((gf / gp) * 100) / 100 : 0,
                gaa: gp > 0 ? Math.round((ga / gp) * 100) / 100 : 0
              },
              latestRecord: { gp, w, l, t, otl, pts, gf, ga, gd },
              recentOutcomes: (computedRec?.outcomes || []).slice(0, 5),
              lastGameText: computedRec?.lastGameText,
              goaliesPreview,
              skatersPreview,
              sisterTeams: [],
              coachTotalRecord: { gp: 0, w: 0, l: 0, t: 0, otl: 0, pts: 0, winPct: 0 }
            };
            franchiseMap.set(fKey, existing);
          } else {
            existing.seasons_count += 1;
            if (!existing.season_badges.includes(sBadge)) {
              existing.season_badges.push(sBadge);
            }
            if (!existing.logo_url && team.logo_url) {
              existing.logo_url = team.logo_url;
            }
            if ((!existing.coachName || existing.coachName === 'TBA') && resolvedCoachName !== 'TBA') {
              existing.coachName = resolvedCoachName;
              existing.coachId = resolvedCoachId;
            }
            if (existing.latestRecord.gp === 0 && gp > 0) {
              existing.latestRecord = { gp, w, l, t, otl, pts, gf, ga, gd };
              existing.latest_season_badge = sBadge;
            }
            if (existing.recentOutcomes.length < 5 && computedRec?.outcomes?.length) {
              existing.recentOutcomes = [
                ...existing.recentOutcomes,
                ...computedRec.outcomes
              ].slice(0, 5);
            }
            if (!existing.lastGameText && computedRec?.lastGameText) {
              existing.lastGameText = computedRec.lastGameText;
            }

            existing.allTimeRecord.gp += gp;
            existing.allTimeRecord.w += w;
            existing.allTimeRecord.l += l;
            existing.allTimeRecord.t += t;
            existing.allTimeRecord.otl += otl;
            existing.allTimeRecord.pts += pts;
            existing.allTimeRecord.gf += gf;
            existing.allTimeRecord.ga += ga;
            existing.allTimeRecord.gd = existing.allTimeRecord.gf - existing.allTimeRecord.ga;
            existing.allTimeRecord.winPct =
              existing.allTimeRecord.gp > 0
                ? Math.round((existing.allTimeRecord.w / existing.allTimeRecord.gp) * 1000) / 10
                : 0;
            existing.allTimeRecord.gpg =
              existing.allTimeRecord.gp > 0
                ? Math.round((existing.allTimeRecord.gf / existing.allTimeRecord.gp) * 100) / 100
                : 0;
            existing.allTimeRecord.gaa =
              existing.allTimeRecord.gp > 0
                ? Math.round((existing.allTimeRecord.ga / existing.allTimeRecord.gp) * 100) / 100
                : 0;
          }
        });

        // Link sister teams controlled by the same coach & compute coachTotalRecord
        const allFranchisesList = Array.from(franchiseMap.values());
        allFranchisesList.forEach(fran => {
          if (!fran.coachName || fran.coachName === 'TBA') return;
          const normCoach = fran.coachName.trim().toLowerCase();
          const sameCoachTeams = allFranchisesList.filter(
            other => other.coachName.trim().toLowerCase() === normCoach
          );
          fran.sisterTeams = sameCoachTeams.map(other => ({
            key: other.key,
            team_id: other.primary_team_id,
            league_id: other.latest_league_id,
            team_name: other.team_name,
            abbreviation: other.abbreviation,
            league_type: other.league_type,
            logo_url: other.logo_url,
            w: other.allTimeRecord.w,
            l: other.allTimeRecord.l,
            t: other.allTimeRecord.t,
            otl: other.allTimeRecord.otl,
            pts: other.allTimeRecord.pts
          }));

          const tot = sameCoachTeams.reduce(
            (acc, item) => {
              acc.gp += item.allTimeRecord.gp;
              acc.w += item.allTimeRecord.w;
              acc.l += item.allTimeRecord.l;
              acc.t += item.allTimeRecord.t;
              acc.otl += item.allTimeRecord.otl;
              acc.pts += item.allTimeRecord.pts;
              return acc;
            },
            { gp: 0, w: 0, l: 0, t: 0, otl: 0, pts: 0 }
          );
          fran.coachTotalRecord = {
            ...tot,
            winPct: tot.gp > 0 ? Math.round((tot.w / tot.gp) * 1000) / 10 : 0
          };
        });

        setFranchises(allFranchisesList);
      } catch (err: any) {
        console.error("fetchDirectoryData error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDirectoryData();
  }, []);

  const filteredFranchises = useMemo(() => {
    const q = (searchVal || query).toLowerCase().trim();
    return franchises
      .filter(f => {
        if (selectedLeagueType !== 'ALL' && f.league_type !== selectedLeagueType) return false;
        if (!q) return true;
        return (
          f.team_name.toLowerCase().includes(q) ||
          f.abbreviation.toLowerCase().includes(q) ||
          f.coachName.toLowerCase().includes(q) ||
          f.arenaName.toLowerCase().includes(q) ||
          f.division.toLowerCase().includes(q) ||
          f.goaliesPreview.some(g => g.toLowerCase().includes(q)) ||
          f.skatersPreview.some(s => s.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.team_name.localeCompare(b.team_name);
        if (sortBy === 'coach') return a.coachName.localeCompare(b.coachName);
        if (sortBy === 'winPct') return b.allTimeRecord.winPct - a.allTimeRecord.winPct || b.allTimeRecord.pts - a.allTimeRecord.pts;
        if (sortBy === 'gp') return b.allTimeRecord.gp - a.allTimeRecord.gp || b.allTimeRecord.pts - a.allTimeRecord.pts;
        if (sortBy === 'gd') return b.allTimeRecord.gd - a.allTimeRecord.gd || b.allTimeRecord.pts - a.allTimeRecord.pts;
        return b.allTimeRecord.pts - a.allTimeRecord.pts || b.allTimeRecord.w - a.allTimeRecord.w;
      });
  }, [franchises, selectedLeagueType, searchVal, query, sortBy]);

  const directorySummary = useMemo(() => {
    const uniqueCoaches = new Set(
      filteredFranchises.map(f => f.coachName.toLowerCase()).filter(c => c && c !== 'tba')
    );
    const totalGames = Math.round(
      filteredFranchises.reduce((acc, f) => acc + f.allTimeRecord.gp, 0) / 2
    );
    const totalGoals = Math.round(
      filteredFranchises.reduce((acc, f) => acc + f.allTimeRecord.gf, 0)
    );
    return {
      franchisesCount: filteredFranchises.length,
      coachesCount: uniqueCoaches.size,
      totalGames,
      totalGoals
    };
  }, [filteredFranchises]);

  return (
    <div className="min-h-screen bg-[#f4f1ea] p-3 sm:p-5 font-serif text-black">
      {/* Top Header Bar with 3 Unified Rosters Tabs: League Directory | League Rosters | Coach Profile */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end border-b-4 border-black mb-4 pb-3 gap-3">
        <div>
          <span className="bg-black text-white font-mono text-[10px] font-black uppercase px-2 py-0.5 tracking-widest inline-block mb-1">
            Official NHL95 League Rosters, Franchises &amp; Coaching Ledger
          </span>
          <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tighter">
            {activeTab === 'rosters'
              ? 'League Rosters'
              : activeTab === 'coach'
              ? 'Coach Profile'
              : 'League Directory'}
          </h1>
          <p className="text-xs font-bold uppercase italic text-gray-700 mt-0.5">
            {activeTab === 'rosters'
              ? 'Active Team Rosters, Positional Depth & Multi-Year OVR Progression Matrix'
              : activeTab === 'coach'
              ? 'Coach Profiles, Grouped Controlled Franchises, Head-to-Head Records & Recent Matchup Scores'
              : 'Comprehensive Franchise Profiles, Coaching Assignments, All-Time Records, Active Roster Previews & Sister Teams'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center w-full lg:w-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab('directory');
              router.push('/team');
            }}
            className={`font-black border-2 border-black px-3.5 py-1.5 text-xs uppercase transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'directory'
                ? 'bg-black text-white shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>League Directory</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('rosters');
              router.push('/team?tab=rosters');
            }}
            className={`font-black border-2 border-black px-3.5 py-1.5 text-xs uppercase transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'rosters'
                ? 'bg-black text-white shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                : 'bg-emerald-50 text-emerald-950 hover:bg-emerald-100'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>League Rosters</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('coach');
              router.push('/team?tab=coach');
            }}
            className={`font-black border-2 border-black px-3.5 py-1.5 text-xs uppercase transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'coach'
                ? 'bg-black text-white shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                : 'bg-amber-50 text-amber-950 hover:bg-amber-100'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Coach Profile</span>
          </button>
        </div>
      </div>

      {/* TAB 2: LEAGUE ROSTERS (Attached 1 with dead space removed) */}
      {activeTab === 'rosters' ? (
        <ActiveRostersFuturesView
          initialLeagueType={selectedLeagueType === 'O' ? 'O' : 'W'}
          initialTeamAbbr={teamParam || 'ALL'}
        />
      ) : activeTab === 'coach' ? (
        /* TAB 3: COACH PROFILE (Attached 2 + Grouped Teams Controlled by Coach) */
        <CoachProfileView
          initialCoachName={coachParam || query}
          hideHeader={true}
        />
      ) : (
        /* TAB 1: DETAILED LEAGUE DIRECTORY (Grouped by Franchise & Coach, not broken down by season) */
        <div className="space-y-4">
          {/* Compact Control & Summary Bar */}
          <div className="bg-[#fdfaf5] border-2 border-black p-2.5 sm:p-3 shadow-[3px_3px_0px_rgba(0,0,0,1)] flex flex-wrap items-center justify-between gap-3 font-sans">
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
                {availableLeagueTypes.map((type) => {
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
                          alt={config.name || `${type} League`}
                          className="h-4 w-auto max-w-[52px] object-contain block"
                          onError={(e) => {
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

              {/* Search Input */}
              <div className="relative w-52 sm:w-64">
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2 top-1.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="SEARCH TEAM, COACH, PLAYER, ARENA..."
                  className="border-2 border-black pl-7 pr-2.5 py-1 text-xs font-bold uppercase bg-white text-black outline-none w-full"
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                />
              </div>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-black text-white border-2 border-black px-2.5 py-1 text-xs font-mono font-bold uppercase cursor-pointer outline-none"
              >
                <option value="pts">Sort: Franchise Points</option>
                <option value="winPct">Sort: Win Percentage</option>
                <option value="gd">Sort: Goal Differential</option>
                <option value="gp">Sort: Games Played</option>
                <option value="name">Sort: Team Name (A–Z)</option>
                <option value="coach">Sort: Coach Name (A–Z)</option>
              </select>
            </div>

            {/* League Directory Summary Pills */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="bg-white border border-black px-2 py-1 font-bold uppercase">
                <strong className="font-black">{directorySummary.franchisesCount}</strong> Franchises
              </span>
              <span className="bg-white border border-black px-2 py-1 font-bold uppercase">
                <strong className="font-black">{directorySummary.coachesCount}</strong> Coaches
              </span>
              <span className="bg-white border border-black px-2 py-1 font-bold uppercase">
                <strong className="font-black">{directorySummary.totalGoals.toLocaleString()}</strong> Total Goals
              </span>
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center font-bold text-sm italic border-2 border-black bg-white">
              Loading detailed league directory, franchise records, active rosters &amp; coach assignments...
            </div>
          ) : filteredFranchises.length === 0 ? (
            <div className="p-10 text-center font-bold text-sm italic border-2 border-black bg-white">
              No franchises found matching your search criteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredFranchises.map((franchise) => (
                <DetailedFranchiseCard key={franchise.key} franchise={franchise} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailedFranchiseCard({ franchise }: { franchise: ConsolidatedFranchiseEntry }) {
  const [imgError, setImgError] = useState(false);
  const teamLink = `/team/${franchise.primary_team_id}?season=${franchise.latest_league_id}`;
  const coachProfileLink = `/team/${franchise.primary_team_id}?tab=coach`;
  const leagueRosterLink = `/team?tab=rosters&team=${encodeURIComponent(franchise.abbreviation)}`;

  const otherSisterTeams = useMemo(() => {
    return franchise.sisterTeams.filter(s => s.key !== franchise.key);
  }, [franchise.sisterTeams, franchise.key]);

  return (
    <div className="border-2 border-black bg-[#fdfaf5] shadow-[3px_3px_0px_rgba(0,0,0,1)] p-3.5 flex flex-col justify-between hover:bg-white transition duration-150 font-sans">
      <div>
        {/* 1. Top Header: Team Logo + Team Name + League Badge + Seasons Count */}
        <div className="flex items-start gap-3 border-b-2 border-black pb-2.5 mb-2.5">
          <Link
            href={teamLink}
            className="w-14 h-14 shrink-0 flex items-center justify-center bg-white border-2 border-black p-1 shadow-2xs"
          >
            {franchise.logo_url && !imgError ? (
              <img
                src={franchise.logo_url}
                alt={franchise.team_name}
                onError={() => setImgError(true)}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <span className="text-sm font-mono font-black uppercase text-neutral-600">
                {franchise.abbreviation}
              </span>
            )}
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <Link
                  href={teamLink}
                  className="font-serif font-black text-lg sm:text-xl uppercase tracking-tight text-black hover:text-red-800 hover:underline truncate"
                >
                  {franchise.team_name}
                </Link>
                <span className="font-mono text-[10px] font-black bg-neutral-200 text-black border border-black px-1.5 py-0.5 shrink-0">
                  {franchise.abbreviation}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <span className="font-mono text-[10px] font-black uppercase bg-black text-white px-2 py-0.5">
                  {LEAGUE_LOGOS[franchise.league_type]?.name || `${franchise.league_type} League`}
                </span>
                <span className="font-mono text-[10px] font-bold bg-amber-100 text-amber-950 border border-amber-400 px-1.5 py-0.5">
                  {franchise.seasons_count} {franchise.seasons_count === 1 ? 'Season' : 'Seasons'}
                </span>
              </div>
            </div>

            {/* Coach Profile Row + Arena + Division */}
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs mt-1">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] font-black uppercase text-neutral-500">COACH:</span>
                <Link
                  href={coachProfileLink}
                  className="font-black text-red-900 hover:underline uppercase text-xs"
                  title={`Open Coach Profile & H2H for ${franchise.coachName}`}
                >
                  {franchise.coachName}
                </Link>
                {franchise.coachTotalRecord.gp > 0 && (
                  <span className="text-[10px] font-mono text-slate-600 font-bold">
                    (Career: {franchise.coachTotalRecord.w}-{franchise.coachTotalRecord.l}-{franchise.coachTotalRecord.t}
                    {franchise.coachTotalRecord.otl > 0 ? `-${franchise.coachTotalRecord.otl}` : ''} • {franchise.coachTotalRecord.winPct}%)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-600 font-medium">
                <span className="inline-flex items-center gap-0.5">
                  <MapPin className="w-3 h-3 text-neutral-400" />
                  <strong className="text-black font-bold">{franchise.arenaName}</strong>
                </span>
                {franchise.division && (
                  <>
                    <span>&bull;</span>
                    <span className="uppercase font-bold text-slate-700">{franchise.division}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Detailed Statistical Breakdown Grid (6 Metrics) */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 font-mono text-xs mb-2.5">
          <div className="bg-white border border-black p-1.5 text-center">
            <div className="text-[9px] text-neutral-500 uppercase font-bold">ALL-TIME REC</div>
            <div className="font-black text-black text-xs mt-0.5 whitespace-nowrap">
              {franchise.allTimeRecord.w}-{franchise.allTimeRecord.l}-{franchise.allTimeRecord.t}
              {franchise.allTimeRecord.otl > 0 ? `-${franchise.allTimeRecord.otl}` : ''}
            </div>
            <div className="text-[9px] text-neutral-500">{franchise.allTimeRecord.gp} GP</div>
          </div>

          <div className="bg-white border border-black p-1.5 text-center">
            <div className="text-[9px] text-neutral-500 uppercase font-bold">POINTS &amp; WIN%</div>
            <div className="font-black text-blue-900 text-xs mt-0.5">
              {franchise.allTimeRecord.pts} PTS
            </div>
            <div className="text-[9px] font-bold text-emerald-800">{franchise.allTimeRecord.winPct}% W</div>
          </div>

          <div className="bg-white border border-black p-1.5 text-center">
            <div className="text-[9px] text-neutral-500 uppercase font-bold">GOALS (GF-GA)</div>
            <div className="font-black text-black text-xs mt-0.5 whitespace-nowrap">
              {franchise.allTimeRecord.gf}&ndash;{franchise.allTimeRecord.ga}
            </div>
            <div
              className={`text-[9px] font-bold ${
                franchise.allTimeRecord.gd >= 0 ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              Diff: {franchise.allTimeRecord.gd >= 0 ? `+${franchise.allTimeRecord.gd}` : franchise.allTimeRecord.gd}
            </div>
          </div>

          <div className="bg-white border border-black p-1.5 text-center">
            <div className="text-[9px] text-neutral-500 uppercase font-bold">GPG / GAA</div>
            <div className="font-black text-black text-xs mt-0.5">
              {franchise.allTimeRecord.gpg.toFixed(2)}
            </div>
            <div className="text-[9px] text-neutral-500">{franchise.allTimeRecord.gaa.toFixed(2)} GAA</div>
          </div>

          <div className="bg-white border border-black p-1.5 text-center">
            <div className="text-[9px] text-neutral-500 uppercase font-bold">
              LATEST ({franchise.latest_season_badge})
            </div>
            <div className="font-black text-black text-xs mt-0.5 whitespace-nowrap">
              {franchise.latestRecord.w}-{franchise.latestRecord.l}-{franchise.latestRecord.t}
              {franchise.latestRecord.otl > 0 ? `-${franchise.latestRecord.otl}` : ''}
            </div>
            <div className="text-[9px] text-amber-900 font-bold">{franchise.latestRecord.pts} PTS</div>
          </div>

          <div className="bg-white border border-black p-1.5 text-center">
            <div className="text-[9px] text-neutral-500 uppercase font-bold">RECENT FORM</div>
            {franchise.recentOutcomes.length > 0 ? (
              <div className="flex items-center justify-center gap-0.5 mt-1">
                {franchise.recentOutcomes.map((res, idx) => (
                  <span
                    key={idx}
                    className={`w-3.5 h-3.5 text-[8px] font-black flex items-center justify-center ${
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
            ) : (
              <div className="text-[10px] text-neutral-400 mt-1">—</div>
            )}
            <div className="text-[8.5px] text-neutral-500 truncate mt-0.5">
              {franchise.lastGameText || 'No recent gm'}
            </div>
          </div>
        </div>

        {/* 3. Active Roster Snapshot (Goalies & Key Skaters) */}
        {(franchise.goaliesPreview.length > 0 || franchise.skatersPreview.length > 0) && (
          <div className="bg-white border border-black/30 px-2.5 py-1.5 mb-2 text-[11px] space-y-0.5">
            {franchise.goaliesPreview.length > 0 && (
              <div className="truncate">
                <span className="font-mono text-[10px] font-black uppercase bg-black text-white px-1 py-0.2 mr-1.5">
                  G
                </span>
                <span className="font-bold text-black">{franchise.goaliesPreview.join(' / ')}</span>
              </div>
            )}
            {franchise.skatersPreview.length > 0 && (
              <div className="truncate text-slate-700">
                <span className="font-mono text-[10px] font-black uppercase bg-neutral-800 text-white px-1 py-0.2 mr-1.5">
                  KEY SKATERS
                </span>
                <span className="font-semibold">{franchise.skatersPreview.join(', ')}</span>
              </div>
            )}
          </div>
        )}

        {/* 4. Other Franchises Controlled by this Coach (Grouped by Coach) */}
        {otherSisterTeams.length > 0 && (
          <div className="bg-amber-50/70 border border-black/25 px-2.5 py-1.5 mb-2 flex items-center gap-1.5 flex-wrap text-[11px]">
            <span className="font-mono text-[9px] font-black uppercase text-amber-950 shrink-0">
              OTHER TEAMS CONTROLLED BY {franchise.coachName}:
            </span>
            {otherSisterTeams.map(st => (
              <Link
                key={st.key}
                href={`/team/${st.team_id}?season=${st.league_id}`}
                className="inline-flex items-center gap-1 bg-white border border-black px-1.5 py-0.5 text-[10px] font-mono font-bold hover:bg-black hover:text-white transition"
                title={`${st.team_name} (${st.w}-${st.l}-${st.t} • ${st.pts} PTS)`}
              >
                {st.logo_url && (
                  <img src={st.logo_url} alt={st.abbreviation} className="w-3 h-3 object-contain" />
                )}
                <span>{st.abbreviation}</span>
                <span className="text-[8.5px] opacity-75">[{st.league_type}]</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 5. Footer Action Links */}
      <div className="pt-2 border-t border-black/20 flex items-center justify-between gap-2 flex-wrap text-xs font-bold">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link
            href={teamLink}
            className="bg-black text-white hover:bg-neutral-800 px-2.5 py-1 text-[11px] font-black uppercase transition"
          >
            Team Page
          </Link>
          <Link
            href={coachProfileLink}
            className="bg-amber-400 text-black border border-black hover:bg-amber-300 px-2.5 py-1 text-[11px] font-black uppercase transition"
          >
            Coach Profile &amp; H2H
          </Link>
          {(franchise.league_type === 'W' || franchise.league_type === 'O') && (
            <Link
              href={leagueRosterLink}
              className="bg-emerald-100 text-emerald-950 border border-black hover:bg-emerald-200 px-2 py-1 text-[11px] font-black uppercase transition"
            >
              League Roster
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-blue-800 font-bold">
          <Link href={`${teamLink}&tab=schedule`} className="hover:underline">
            Schedule
          </Link>
          <span className="text-neutral-300">|</span>
          <Link href={`/stats?season=${franchise.latest_league_id}`} className="hover:underline">
            Stats
          </Link>
        </div>
      </div>
    </div>
  );
}
