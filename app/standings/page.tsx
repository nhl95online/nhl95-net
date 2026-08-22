"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Search, ChevronDown, ArrowUp, ArrowDown, Globe, Maximize2, Minimize2, List, Grid, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type SortField = 'seed' | 'wins' | 'losses' | 'ties' | 'pts' | 'gf' | 'ga' | 'gd' | 'otWins' | 'otLosses' | 'season_id';
type SortOrder = 'asc' | 'desc';

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
    fallbackUrl: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Original6.png'
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

const getLeaguePrefix = (league: { league_id: number | string; league_name?: string }) => {
  const name = String(league.league_name || '').trim().toUpperCase();
  if (name) {
    const match = name.match(/^[A-Z]+/);
    if (match && match[0]) return match[0];
  }
  const idNum = Number(league.league_id);
  if (SEASON_TYPES[idNum]) return SEASON_TYPES[idNum];
  return 'W';
};

export const getTeamBannerUrls = (t: {
  team_id?: number | string;
  abbreviation?: string;
  team_name?: string;
  banner_filename?: string;
  league_id?: number | string;
}, currentSeasonId?: number | string) => {
  const abbr = String(t.abbreviation || '').trim().toUpperCase();
  const name = String(t.team_name || '').trim().toUpperCase();
  const tLeagueId = Number(t.league_id !== undefined ? t.league_id : currentSeasonId || 0);

  const isOriginalSix =
    ['BOS', 'CHI', 'DET', 'DTC', 'MTL', 'NYR', 'TOR'].includes(abbr) ||
    tLeagueId === 39 ||
    SEASON_TYPES[tLeagueId] === 'O' ||
    name.includes('BOSTON') || name.includes('BRUINS') ||
    name.includes('CHICAGO') || name.includes('BLACKHAWKS') ||
    name.includes('DETROIT') || name.includes('COUGARS') || name.includes('RED WINGS') ||
    name.includes('MONTREAL') || name.includes('CANADIENS') ||
    name.includes('NEW YORK RANGERS') || name.includes('RANGERS') ||
    name.includes('TORONTO') || name.includes('MAPLE LEAFS');

  let bannerFile = t.banner_filename?.trim();
  if (!bannerFile && abbr) {
    bannerFile = `${abbr}.png`;
  }
  if (!bannerFile) return { primaryUrl: null, fallbackUrls: [] };

  if (!bannerFile.includes('.')) {
    bannerFile = `${bannerFile}.png`;
  }

  const primaryBucket = isOriginalSix ? 'nhl banners' : 'banners';
  const secondaryBucket = isOriginalSix ? 'banners' : 'nhl banners';

  const primaryUrl = supabase.storage.from(primaryBucket).getPublicUrl(bannerFile).data.publicUrl;
  const fallbackUrl1 = supabase.storage.from(secondaryBucket).getPublicUrl(bannerFile).data.publicUrl;

  const encodedFileName = encodeURIComponent(bannerFile);
  const fallbackUrl2 = `https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/${encodeURIComponent(primaryBucket)}/${encodedFileName}`;
  const fallbackUrl3 = `https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/${encodeURIComponent(secondaryBucket)}/${encodedFileName}`;
  const fallbackUrl4 = `https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/nhl_banners/${encodedFileName}`;
  const fallbackUrl5 = `https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/nhl%20banners/${encodedFileName}`;
  const fallbackUrl6 = `https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/banners/${encodedFileName}`;

  const allUrls = [primaryUrl, fallbackUrl1, fallbackUrl2, fallbackUrl3, fallbackUrl4, fallbackUrl5, fallbackUrl6];
  const uniqueUrls = Array.from(new Set(allUrls.filter(Boolean))) as string[];

  return {
    primaryUrl: uniqueUrls[0] || null,
    fallbackUrls: uniqueUrls.slice(1)
  };
};

export const extractPlayoffTeams = (row: any): number => {
  if (!row) return 0;
  const val = row.playoff_teams ?? row.playoffs ?? row.playoff_spots ?? row.playoff_team_count ?? row.playoffteams ?? row.playoff_count ?? row.playoff_teams_count;
  if (val !== undefined && val !== null) {
    const parsed = parseInt(String(val), 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (row.rules_json) {
    try {
      const rules = typeof row.rules_json === 'string' ? JSON.parse(row.rules_json) : row.rules_json;
      const rVal = rules?.playoff_teams ?? rules?.playoffs ?? rules?.playoff_spots ?? rules?.playoff_team_count;
      if (rVal !== undefined && rVal !== null) {
        const parsed = parseInt(String(rVal), 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch { }
  }
  return 0;
};

export const extractGamesPerTeam = (row: any): number => {
  if (!row) return 82;

  // 1. Primary source: leagues table rules_json -> game_per_team (or games_per_team)
  if (row.rules_json) {
    try {
      const rules = typeof row.rules_json === 'string' ? JSON.parse(row.rules_json) : row.rules_json;
      const rVal = rules?.game_per_team ?? rules?.games_per_team ?? rules?.game_count ?? rules?.games_count ?? rules?.games;
      if (rVal !== undefined && rVal !== null) {
        const parsed = parseInt(String(rVal), 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch (e) {
      console.error("Failed to parse rules_json for game_per_team", e);
    }
  }

  // 2. Direct column check on table row
  const val = row.game_per_team ?? row.games_per_team ?? row.games ?? row.schedule_games ?? row.games_count;
  if (val !== undefined && val !== null) {
    const parsed = parseInt(String(val), 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  return 82;
};

export default function StandingsPage() {
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedLeagueType, setSelectedLeagueType] = useState<string>('ALL');
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | string>('');
  const [activeSeasonId, setActiveSeasonId] = useState<number | string>('');
  const [standings, setStandings] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [gamesPerTeam, setGamesPerTeam] = useState<number>(82); // Default fallback

  // Layout Modification States
  const [isGlobalMode, setIsGlobalMode] = useState<boolean>(false);
  const [isCompactView, setIsCompactView] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  // Sorting Configuration States
  const [sortField, setSortField] = useState<SortField>('pts');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Tab Management State
  const [currentTab, setCurrentTab] = useState<string>('ALL');
  const [availableConferences, setAvailableConferences] = useState<string[]>([]);
  const [availableDivisions, setAvailableDivisions] = useState<string[]>([]);

  // Playoff Cutoff Count State (loaded from Leagues table playoff_teams column)
  const [playoffCutoffCount, setPlayoffCutoffCount] = useState<number>(8);

  // 1. Dynamic Load: Fetch all valid seasons and rules configurations from leagues table
  useEffect(() => {
    const fetchSeasons = async () => {
      let data: any = null;
      let error: any = null;

      try {
        const res1 = await supabase.from('leagues').select('*');
        if (!res1.error && res1.data && res1.data.length > 0) {
          data = res1.data;
        }
      } catch { }

      if (!data || data.length === 0) {
        try {
          const res2 = await supabase.from('Leagues').select('*');
          if (!res2.error && res2.data && res2.data.length > 0) {
            data = res2.data;
          }
        } catch { }
      }

      if (!data || data.length === 0) {
        try {
          const fallbackQuery = await supabase.from('league_seasons').select('*');
          data = fallbackQuery.data;
          error = fallbackQuery.error;
        } catch { }
      }

      if (error || !data || data.length === 0) {
        const emergencyFallback = Array.from({ length: 40 }, (_, i) => {
          const id = 40 - i;
          return { league_id: String(id), league_name: `Season ${id.toString().padStart(2, '0')}`, games_per_team: 82, playoff_teams: 8 };
        });
        setSeasons(emergencyFallback);
        setActiveSeasonId("40");
        setSelectedLeagueId("40");
        setPlayoffCutoffCount(8);
        return;
      }

      const formattedList = data.map((row: any) => {
        const lId = row.league_id !== undefined ? row.league_id : (row.id || row.season_id);
        const dynamicName = row.league_name || row.name || row.season_name || `Season ${lId}`;
        const customGamesLimit = extractGamesPerTeam(row);
        const customPlayoffTeams = extractPlayoffTeams(row);

        return {
          id: row.id,
          league_id: String(lId).trim(),
          league_name: String(dynamicName).trim(),
          games_per_team: customGamesLimit,
          playoff_teams: customPlayoffTeams > 0 ? customPlayoffTeams : null,
          raw_data: row
        };
      }).sort((a: any, b: any) => Number(b.league_id) - Number(a.league_id));

      setSeasons(formattedList);

      const latestSeason = formattedList[0];
      if (latestSeason) {
        setActiveSeasonId(latestSeason.league_id);
        setSelectedLeagueId(latestSeason.league_id);
        setGamesPerTeam(latestSeason.games_per_team || 82);
        const pCutoff = latestSeason.playoff_teams || (Number(latestSeason.league_id) === 39 ? 4 : 8);
        setPlayoffCutoffCount(pCutoff);
      }
    };

    fetchSeasons();
  }, []);

  const availableLeagueTypes = useMemo(() => {
    const extracted = new Set<string>();
    seasons.forEach(l => {
      const p = getLeaguePrefix(l);
      if (p) extracted.add(p);
    });
    if (extracted.size === 0) {
      return ['W', 'Q', 'O', 'V'];
    }
    const priority = ['W', 'Q', 'O', 'V', 'G'];
    return Array.from(extracted).sort((a, b) => {
      const idxA = priority.indexOf(a);
      const idxB = priority.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [seasons]);

  const filteredSeasons = useMemo(() => {
    if (selectedLeagueType === 'ALL') return seasons;
    return seasons.filter(s => getLeaguePrefix(s) === selectedLeagueType);
  }, [seasons, selectedLeagueType]);

  const handleLeagueTypeChange = (type: string) => {
    setSelectedLeagueType(type);
    setIsGlobalMode(false);
    const list = type === 'ALL' ? seasons : seasons.filter(s => getLeaguePrefix(s) === type);
    if (list.length > 0) {
      const latestInType = list[0];
      const nextId = String(latestInType.league_id);
      setSelectedLeagueId(nextId);
    }
  };

  // 2. Trigger loading whenever season context or global view switches
  useEffect(() => {
    if (isGlobalMode) {
      setPlayoffCutoffCount(0);
      loadGlobalStandings();
    } else if (selectedLeagueId !== undefined && selectedLeagueId !== '') {
      setCurrentTab('ALL');
      setSortField('pts');
      setSortOrder('desc');

      const currentMatchedSeason = seasons.find(s => String(s.league_id) === String(selectedLeagueId));
      if (currentMatchedSeason) {
        setGamesPerTeam(currentMatchedSeason.games_per_team || 82);
      }

      loadStandings(selectedLeagueId);
    }
  }, [selectedLeagueId, activeSeasonId, isGlobalMode, seasons]);

  const getTeamMetadataMap = async (currentSeasonId?: number | string) => {
    const { data: teamsData } = await supabase
      .from('league_teams')
      .select('team_id, team_name, abbreviation, banner_filename, league_id');

    const baseTeamMap: Record<number, any> = {};
    teamsData?.forEach((t: any) => {
      const tId = Number(t.team_id);
      const { primaryUrl, fallbackUrls } = getTeamBannerUrls(t, currentSeasonId);

      baseTeamMap[tId] = {
        id: tId,
        name: t.team_name,
        abbr: t.abbreviation,
        banner_url: primaryUrl,
        fallback_urls: fallbackUrls
      };
    });
    return baseTeamMap;
  };

  const loadGlobalStandings = async () => {
    setLoading(true);
    const baseTeamMap = await getTeamMetadataMap();

    const { data: globalData, error } = await supabase
      .from('league_standings')
      .select('*');

    if (error) {
      setLoading(false);
      return;
    }

    const compiledGlobalRows = (globalData || []).map((row: any) => {
      const tId = Number(row.team_id);
      const matchingSeason = seasons.find(s => String(s.league_id) === String(row.season_id));
      const sId = matchingSeason ? matchingSeason.league_id : row.season_id;
      const meta = baseTeamMap[tId] || { name: `Retro Club #${tId}`, abbr: `TM${tId}`, banner_url: null, fallback_urls: [] };

      // Re-evaluate banner in context of the specific season if needed
      const bannerInfo = getTeamBannerUrls({
        team_id: tId,
        team_name: meta.name,
        abbreviation: meta.abbr,
        banner_filename: meta.banner_filename,
        league_id: sId
      }, sId);

      return {
        ...meta,
        banner_url: meta.banner_url || bannerInfo.primaryUrl,
        fallback_urls: meta.fallback_urls?.length ? meta.fallback_urls : bannerInfo.fallbackUrls,
        season_id: row.season_id,
        season_display_name: matchingSeason ? matchingSeason.league_name : `Season ${row.season_id}`,
        gp: row.gp,
        wins: row.w,
        losses: row.l,
        ties: row.t,
        pts: row.pts,
        gf: row.gf,
        ga: row.ga,
        gd: row.gd,
        otWins: row.otw,
        otLosses: row.otl,
        streak: row.strk,
        l10: row.l10,
        homeRecord: row.home,
        awayRecord: row.away,
        conference: row.conference?.trim() || null,
        division: row.division?.trim() || null,
        clinch: row.clinch || ''
      };
    });

    setAvailableConferences([]);
    setAvailableDivisions([]);
    setStandings(compiledGlobalRows);
    setLoading(false);
  };

  const loadStandings = async (leagueId: number | string) => {
    setLoading(true);
    const numericLeagueId = parseInt(String(leagueId).replace(/\D/g, '')) || 1;
    const baseTeamMap = await getTeamMetadataMap(numericLeagueId);

    // 1. Check in-memory loaded seasons list first
    const matchedSeason = seasons.find(s =>
      String(s.league_id) === String(leagueId) ||
      String(s.league_id) === String(numericLeagueId) ||
      String(s.id) === String(leagueId) ||
      String(s.id) === String(numericLeagueId)
    );

    let playoffCutoff = matchedSeason?.playoff_teams ? Number(matchedSeason.playoff_teams) : 0;
    let customGamesLimit = matchedSeason?.games_per_team ? Number(matchedSeason.games_per_team) : 0;

    // 2. Query leagues / Leagues table with select('*') to safely extract playoff_teams
    if (!playoffCutoff) {
      try {
        let leaguesData = (await supabase.from('leagues').select('*')).data;
        if (!leaguesData || leaguesData.length === 0) {
          leaguesData = (await supabase.from('Leagues').select('*')).data;
        }

        if (leaguesData && leaguesData.length > 0) {
          const lRow = leaguesData.find((r: any) =>
            Number(r.league_id) === numericLeagueId ||
            Number(r.id) === numericLeagueId ||
            Number(r.season_id) === numericLeagueId ||
            String(r.league_name || '').includes(String(numericLeagueId))
          );
          if (lRow) {
            const p = extractPlayoffTeams(lRow);
            if (p > 0) playoffCutoff = p;
            const g = extractGamesPerTeam(lRow);
            if (g > 0 && !customGamesLimit) customGamesLimit = g;
          }
        }
      } catch (e) {
        console.error("Error querying leagues table:", e);
      }
    }

    // 3. Fallback check against league_seasons table
    if (!playoffCutoff) {
      try {
        const { data: seasonsData } = await supabase
          .from('league_seasons')
          .select('*');

        if (seasonsData && seasonsData.length > 0) {
          const sRow = seasonsData.find((r: any) =>
            Number(r.league_id) === numericLeagueId ||
            Number(r.id) === numericLeagueId ||
            Number(r.season_id) === numericLeagueId
          );
          if (sRow) {
            const p = extractPlayoffTeams(sRow);
            if (p > 0) playoffCutoff = p;
            const g = extractGamesPerTeam(sRow);
            if (g > 0 && !customGamesLimit) customGamesLimit = g;
          }
        }
      } catch (e) { }
    }

    // 4. Fallback check against league_playoffs table
    if (!playoffCutoff) {
      try {
        const { data: playoffData } = await supabase
          .from('league_playoffs')
          .select('team_id')
          .eq('season_id', numericLeagueId);

        if (playoffData && playoffData.length > 0) {
          const uniquePlayoffTeams = new Set(playoffData.map((p: any) => p.team_id));
          if (uniquePlayoffTeams.size > 0) {
            playoffCutoff = uniquePlayoffTeams.size;
          }
        }
      } catch { }
    }

    // 5. Default guarantee: Original 6 = 4 teams, W/Q/Vintage/etc. = 8 teams
    if (!playoffCutoff || playoffCutoff <= 0) {
      playoffCutoff = numericLeagueId === 39 ? 4 : 8;
    }

    setPlayoffCutoffCount(playoffCutoff);

    const [schedRes, statsRes, teamsRes, standingsRes] = await Promise.all([
      supabase
        .from('league_schedule')
        .select('game_id, home_team_id, away_team_id, played, league_id')
        .eq('league_id', numericLeagueId)
        .order('game_id', { ascending: true }),
      supabase
        .from('league_gamestats')
        .select('game_id, home_score, away_score, game_meta, league_id, home_team_id, away_team_id, home_stats, away_stats')
        .eq('league_id', numericLeagueId),
      supabase
        .from('league_teams')
        .select('team_id, team_name, abbreviation, conference, division, league_id, banner_filename'),
      supabase
        .from('league_standings')
        .select('*')
        .eq('season_id', numericLeagueId)
    ]);

    const allScheduleData = schedRes.data || [];
    const statsData = statsRes.data || [];
    const allTeamsData = teamsRes.data || [];
    const standardData = standingsRes.data || [];

    let freshStandings: any[] = [];

    // If there are played games in gamestats or schedule, compute live standings
    if (statsData.length > 0 || allScheduleData.length > 0) {

      const teamMap: Record<number, any> = {};

      const activeTeamIds = new Set<number>();
      allTeamsData.forEach((t: any) => {
        if (Number(t.league_id) === numericLeagueId) activeTeamIds.add(Number(t.team_id));
      });
      allScheduleData.forEach((g: any) => {
        const h = Number(g.home_team_id);
        const a = Number(g.away_team_id);
        if (h && h !== 999 && h !== 0 && h !== 68) activeTeamIds.add(h);
        if (a && a !== 999 && a !== 0 && a !== 68) activeTeamIds.add(a);
      });
      statsData.forEach((s: any) => {
        const h = Number(s.home_team_id);
        const a = Number(s.away_team_id);
        if (h && h !== 999 && h !== 0 && h !== 68) activeTeamIds.add(h);
        if (a && a !== 999 && a !== 0 && a !== 68) activeTeamIds.add(a);
      });

      activeTeamIds.forEach((tId) => {
        const tInfo = allTeamsData.find((t: any) => Number(t.team_id) === tId);
        const bannerInfo = getTeamBannerUrls({
          team_id: tId,
          team_name: tInfo?.team_name,
          abbreviation: tInfo?.abbreviation,
          banner_filename: tInfo?.banner_filename,
          league_id: tInfo?.league_id || numericLeagueId
        }, numericLeagueId);

        teamMap[tId] = {
          ...(baseTeamMap[tId] || {
            id: tId,
            name: tInfo?.team_name || `Retro Club #${tId}`,
            abbr: tInfo?.abbreviation || `TM${tId}`,
            banner_url: bannerInfo.primaryUrl,
            fallback_urls: bannerInfo.fallbackUrls
          }),
          season_id: numericLeagueId,
          season_display_name: '',
          gp: 0, wins: 0, losses: 0, ties: 0, pts: 0, gf: 0, ga: 0,
          homeWins: 0, homeLosses: 0, homeTies: 0,
          awayWins: 0, awayLosses: 0, awayTies: 0,
          otWins: 0, otLosses: 0,
          history: [] as string[],
          conference: tInfo?.conference?.trim() || null,
          division: tInfo?.division?.trim() || null,
          clinch: ''
        };
      });

      const resolveTeamKey = (id: any): number | null => {
        const num = Number(id);
        if (!num || num === 999 || num === 0 || num === 68) return null;
        if (teamMap[num]) return num;

        // Try finding by coach_id or team_id in allTeamsData
        const matchTeam = allTeamsData.find((t: any) =>
          Number(t.team_id) === num ||
          Number(t.coach_id) === num
        );

        if (matchTeam) {
          // Look for this team in active season teamMap
          const seasonMatch = allTeamsData.find((t: any) =>
            Number(t.league_id) === numericLeagueId &&
            (
              (t.abbreviation && t.abbreviation.trim().toUpperCase() === (matchTeam.abbreviation || '').trim().toUpperCase()) ||
              (t.team_name && t.team_name.trim().toUpperCase() === (matchTeam.team_name || '').trim().toUpperCase()) ||
              (Number(t.coach_id) > 0 && Number(t.coach_id) === Number(matchTeam.coach_id))
            )
          );

          if (seasonMatch && teamMap[Number(seasonMatch.team_id)]) {
            return Number(seasonMatch.team_id);
          }
        }

        // Fallback: auto-register in teamMap so game is never dropped
        const tInfo = matchTeam || allTeamsData.find((t: any) => Number(t.team_id) === num);
        teamMap[num] = {
          id: num,
          name: tInfo?.team_name || `Club #${num}`,
          abbr: tInfo?.abbreviation || `TM${num}`,
          banner_url: null,
          fallback_urls: [],
          season_id: numericLeagueId,
          season_display_name: '',
          gp: 0, wins: 0, losses: 0, ties: 0, pts: 0, gf: 0, ga: 0,
          homeWins: 0, homeLosses: 0, homeTies: 0,
          awayWins: 0, awayLosses: 0, awayTies: 0,
          otWins: 0, otLosses: 0,
          history: [] as string[],
          conference: tInfo?.conference?.trim() || null,
          division: tInfo?.division?.trim() || null,
          clinch: ''
        };
        return num;
      };

      const applyGame = (rawHId: any, rawAId: any, homeScore: number, awayScore: number, gameMeta: any, statsObj?: any) => {
        const hId = resolveTeamKey(rawHId);
        const aId = resolveTeamKey(rawAId);

        if (!hId || !aId || hId === aId) return;
        if (!teamMap[hId] || !teamMap[aId]) return;

        let isOT = false;
        let isTie = false;

        if (gameMeta) {
          try {
            const meta = typeof gameMeta === 'string' ? JSON.parse(gameMeta) : gameMeta;
            isOT = meta.is_ot === true || meta.is_ot === 'true' || meta.is_ot === 1 || meta.is_ot === '1' ||
              meta.isOT === true || meta.isOT === 'true' || meta.isOT === 1;
            isTie = meta.is_tie === true || meta.is_tie === 'true' || meta.is_tie === 1 || meta.is_tie === '1';
          } catch {
            const lowStr = String(gameMeta || '').toLowerCase();
            isOT = lowStr.includes('"is_ot":true') || lowStr.includes('"is_ot":"true"') || lowStr.includes('"is_ot":1') ||
              lowStr.includes('"isot":true') || lowStr.includes('"isot":"true"');
            isTie = lowStr.includes('"is_tie":true') || lowStr.includes('"is_tie":"true"') || lowStr.includes('"is_tie":1');
          }
        }

        if (!isOT && statsObj) {
          try {
            const hStats = typeof statsObj.home_stats === 'string' ? JSON.parse(statsObj.home_stats) : statsObj.home_stats;
            const aStats = typeof statsObj.away_stats === 'string' ? JSON.parse(statsObj.away_stats) : statsObj.away_stats;
            if (Number(hStats?.home_ot_goals) > 0 || Number(aStats?.away_ot_goals) > 0 ||
              Number(hStats?.home_ot_shots) > 0 || Number(aStats?.away_ot_shots) > 0) {
              isOT = true;
            }
          } catch { }
        }

        if (homeScore === awayScore && !isOT) {
          isTie = true;
        }

        teamMap[hId].gp += 1;
        teamMap[aId].gp += 1;
        teamMap[hId].gf += homeScore;
        teamMap[hId].ga += awayScore;
        teamMap[aId].gf += awayScore;
        teamMap[aId].ga += homeScore;

        if (isTie) {
          teamMap[hId].ties += 1;
          teamMap[hId].homeTies += 1;
          teamMap[hId].pts += 1;
          teamMap[hId].history.push('T');

          teamMap[aId].ties += 1;
          teamMap[aId].awayTies += 1;
          teamMap[aId].pts += 1;
          teamMap[aId].history.push('T');
        } else if (homeScore > awayScore) {
          // Home Team Wins
          teamMap[hId].wins += 1;
          teamMap[hId].homeWins += 1;
          teamMap[hId].pts += 2;
          teamMap[hId].history.push('W');

          if (isOT) {
            teamMap[hId].otWins += 1;
            // Away Team loses in OT: gets 1 point, 0 regulation losses, increment OTL
            teamMap[aId].otLosses += 1;
            teamMap[aId].pts += 1;
            teamMap[aId].history.push('OTL');
          } else {
            // Away Team loses in Regulation: increment regulation losses (L)
            teamMap[aId].losses += 1;
            teamMap[aId].awayLosses += 1;
            teamMap[aId].history.push('L');
          }
        } else if (awayScore > homeScore) {
          // Away Team Wins
          teamMap[aId].wins += 1;
          teamMap[aId].awayWins += 1;
          teamMap[aId].pts += 2;
          teamMap[aId].history.push('W');

          if (isOT) {
            teamMap[aId].otWins += 1;
            // Home Team loses in OT: gets 1 point, 0 regulation losses, increment OTL
            teamMap[hId].otLosses += 1;
            teamMap[hId].pts += 1;
            teamMap[hId].history.push('OTL');
          } else {
            // Home Team loses in Regulation: increment regulation losses (L)
            teamMap[hId].losses += 1;
            teamMap[hId].homeLosses += 1;
            teamMap[hId].history.push('L');
          }
        }
      };

      // Process all games in league_gamestats
      const processedStatsGameIds = new Set<string>();
      statsData.forEach((stats: any) => {
        const gIdStr = String(stats.game_id).trim();
        processedStatsGameIds.add(gIdStr);

        const homeScore = Number(stats.home_score) || 0;
        const awayScore = Number(stats.away_score) || 0;
        const hId = stats.home_team_id;
        const aId = stats.away_team_id;
        applyGame(hId, aId, homeScore, awayScore, stats.game_meta, stats);
      });

      // Also process any schedule matches marked played not yet in gamestats
      allScheduleData.forEach((game: any) => {
        const gIdStr = String(game.game_id).trim();
        const rawPlayed = String(game.played || '').trim().toLowerCase();
        const isPlayed = rawPlayed === 'true' || rawPlayed === '1' || rawPlayed === 'y';

        if (isPlayed && !processedStatsGameIds.has(gIdStr) && game.game_meta) {
          const homeScore = Number(game.home_score) || 0;
          const awayScore = Number(game.away_score) || 0;
          applyGame(game.home_team_id, game.away_team_id, homeScore, awayScore, game.game_meta, game);
        }
      });

      freshStandings = Object.values(teamMap).map((team: any) => {
        let streakStr = '-';
        if (team.history.length > 0) {
          const lastResult = team.history[team.history.length - 1];
          let count = 0;
          for (let i = team.history.length - 1; i >= 0; i--) {
            if (team.history[i] === lastResult) {
              count++;
            } else {
              break;
            }
          }
          streakStr = `${lastResult}${count}`;
        }

        const last10 = team.history.slice(-10);
        const l10W = last10.filter((r: string) => r === 'W').length;
        const l10L = last10.filter((r: string) => r === 'L').length;
        const l10T = last10.filter((r: string) => r === 'T').length;
        const l10OTL = last10.filter((r: string) => r === 'OTL').length;

        const l10Str = l10OTL > 0
          ? (l10T > 0 ? `${l10W}-${l10L}-${l10T}-${l10OTL}` : `${l10W}-${l10L}-${l10OTL}`)
          : `${l10W}-${l10L}-${l10T}`;

        return {
          ...team,
          gd: team.gf - team.ga,
          streak: streakStr,
          l10: l10Str,
          homeRecord: `${team.homeWins}-${team.homeLosses}-${team.homeTies}`,
          awayRecord: `${team.awayWins}-${team.awayLosses}-${team.awayTies}`
        };
      });
    }

    if (freshStandings.length === 0 && standardData.length > 0) {
      freshStandings = standardData.map((row: any) => {
        const tId = Number(row.team_id);
        const meta = baseTeamMap[tId] || { name: `Retro Club #${tId}`, abbr: `TM${tId}`, banner_url: null, fallback_urls: [] };

        return {
          ...meta,
          season_id: numericLeagueId,
          season_display_name: '',
          gp: Number(row.gp) || 0,
          wins: Number(row.w) || 0,
          losses: Number(row.l) || 0,
          ties: Number(row.t) || 0,
          pts: Number(row.pts) || 0,
          gf: Number(row.gf) || 0,
          ga: Number(row.ga) || 0,
          gd: Number(row.gd) || 0,
          otWins: Number(row.otw) || 0,
          otLosses: Number(row.otl) || 0,
          streak: row.strk || '-',
          l10: row.l10 || '0-0-0',
          homeRecord: row.home || '0-0-0',
          awayRecord: row.away || '0-0-0',
          conference: row.conference?.trim() || null,
          division: row.division?.trim() || null,
          clinch: row.clinch || ''
        };
      });
    }

    freshStandings.sort((a: any, b: any) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.gd - a.gd;
    });

    const standardSeededList = freshStandings.map((team, idx) => ({
      ...team,
      seed: idx + 1
    }));

    const confs: string[] = Array.from(
      new Set(standardSeededList.map((t) => t.conference).filter(Boolean))
    ) as string[];

    const divs: string[] = Array.from(
      new Set(standardSeededList.map((t) => t.division).filter(Boolean))
    ) as string[];

    // Extract actual schedule length from schedule data or games played
    let maxSchedGames = 0;
    if (allScheduleData && allScheduleData.length > 0) {
      const teamSchedCounts: Record<number, number> = {};
      allScheduleData.forEach((g: any) => {
        const h = Number(g.home_team_id);
        const a = Number(g.away_team_id);
        if (h && h !== 999 && h !== 0 && h !== 68) {
          teamSchedCounts[h] = (teamSchedCounts[h] || 0) + 1;
        }
        if (a && a !== 999 && a !== 0 && a !== 68) {
          teamSchedCounts[a] = (teamSchedCounts[a] || 0) + 1;
        }
      });
      const counts = Object.values(teamSchedCounts);
      if (counts.length > 0) {
        maxSchedGames = Math.max(...counts);
      }
    }

    const maxPlayedInSeason = freshStandings.reduce((max: number, t: any) => Math.max(max, Number(t.gp) || 0), 0);
    const resolvedGamesPerTeam = customGamesLimit > 0
      ? customGamesLimit
      : Math.max(maxSchedGames, maxPlayedInSeason, 82);
    if (resolvedGamesPerTeam > 0) {
      setGamesPerTeam(resolvedGamesPerTeam);
    }

    setAvailableConferences(confs.sort());
    setAvailableDivisions(divs.sort());
    setStandings(standardSeededList);
    setLoading(false);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 inline ml-1" /> : <ArrowDown className="w-3 h-3 inline ml-1" />;
  };

  const processedStandings = standings
    .filter((team: any) => {
      if (isGlobalMode) return true;
      if (currentTab === 'ALL') return true;
      return team.conference === currentTab || team.division === currentTab;
    })
    .sort((a: any, b: any) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'season_id') {
        return sortOrder === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
      }

      if (valA !== valB) {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.gd - a.gd;
    })
    .filter((team: any) => {
      const normalizedQuery = searchQuery.trim().toLowerCase();
      if (!normalizedQuery) return true;

      const teamName = String(team.name || "").toLowerCase();
      const teamAbbr = String(team.abbr || "").toLowerCase();

      return teamName.includes(normalizedQuery) || teamAbbr.includes(normalizedQuery);
    });

  // Ranked standings pool for the active tab before search filtering
  const rankedPool = useMemo(() => {
    if (isGlobalMode) return standings;
    if (currentTab === 'ALL') return standings;
    return standings.filter((team: any) => team.conference === currentTab || team.division === currentTab);
  }, [standings, isGlobalMode, currentTab]);

  // Determine active cutoff count based on current view tab
  const activeCutoffCount = useMemo(() => {
    if (isGlobalMode || playoffCutoffCount <= 0) return 0;
    if (currentTab === 'ALL') return playoffCutoffCount;
    if (availableConferences.includes(currentTab) && availableConferences.length > 0) {
      return Math.ceil(playoffCutoffCount / availableConferences.length);
    }
    return playoffCutoffCount;
  }, [isGlobalMode, playoffCutoffCount, currentTab, availableConferences]);

  // Max points possible for a team in the current season
  const getMaxPossiblePoints = (team: any) => {
    const gp = Number(team.gp) || 0;
    const pts = Number(team.pts) || 0;
    const gLimit = gamesPerTeam > 0 ? gamesPerTeam : 82;
    return pts + Math.max(0, (gLimit - gp) * 2);
  };

  // Dynamic Mathematical Magic Number Logic Processing Block (M#)
  // For teams currently AT or ABOVE the playoff cutoff line
  const getMagicNumber = (team: any, currentIndex?: number) => {
    if (isGlobalMode || activeCutoffCount <= 0) return null;

    const rankIndex = currentIndex !== undefined && searchQuery.trim() === ''
      ? currentIndex
      : rankedPool.findIndex((t: any) => t.id === team.id);

    if (rankIndex === -1 || rankIndex >= activeCutoffCount) return null;
    if (rankedPool.length <= activeCutoffCount) return 0; // Entire pool advances

    // Find the highest maximum possible points among all chasing teams below the playoff line
    const chasers = rankedPool.slice(activeCutoffCount);
    if (chasers.length === 0) return 0;

    let maxChaserPoints = 0;
    chasers.forEach((chaser: any) => {
      const maxPts = getMaxPossiblePoints(chaser);
      if (maxPts > maxChaserPoints) {
        maxChaserPoints = maxPts;
      }
    });

    const teamPts = Number(team.pts) || 0;
    if (team.clinch || teamPts > maxChaserPoints) return 0;

    const magicNumber = maxChaserPoints - teamPts + 1;
    return magicNumber <= 0 ? 0 : magicNumber;
  };

  // Dynamic Mathematical Elimination Logic Processing Block (E#)
  // For teams currently BELOW the playoff cutoff line
  const getEliminationNumber = (team: any, currentIndex?: number) => {
    if (isGlobalMode || activeCutoffCount <= 0) return null;

    const rankIndex = currentIndex !== undefined && searchQuery.trim() === ''
      ? currentIndex
      : rankedPool.findIndex((t: any) => t.id === team.id);

    if (rankIndex === -1 || rankIndex < activeCutoffCount) return null;

    // Fetch the team right on the edge of the active playoff bubble line (last qualifying spot)
    const cutoffTeam = rankedPool[activeCutoffCount - 1];
    if (!cutoffTeam) return null;

    const teamMaxPts = getMaxPossiblePoints(team);
    const cutoffPts = Number(cutoffTeam.pts) || 0;

    if (teamMaxPts < cutoffPts) return 0;

    const eliminationValue = teamMaxPts - cutoffPts + 1;
    return eliminationValue <= 0 ? 0 : eliminationValue;
  };

  const downloadCSV = () => {
    if (processedStandings.length === 0) return;

    const headers = [
      "Scope Context", "Seed ID", "Club Name", "Abbr", "Clinch Status", "Magic Number", "Elimination Number",
      "GP", "W", "L", "T", "PTS", "GF", "GA", "+/-", "Home", "Away", "OTW", "OTL", "Streak", "L10"
    ];

    const rows = processedStandings.map((t: any, idx: number) => [
      isGlobalMode ? t.season_display_name : `Season ID ${t.season_id}`,
      t.seed || "-",
      `"${t.name}"`,
      t.abbr,
      t.clinch || (getMagicNumber(t, idx) === 0 ? "x" : "-"),
      getMagicNumber(t, idx) ?? "-",
      getEliminationNumber(t, idx) ?? "-",
      t.gp, t.wins, t.losses, t.ties, t.pts, t.gf, t.ga, t.gd,
      t.homeRecord, t.awayRecord, t.otWins, t.otLosses, t.streak, t.l10
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `standings_${isGlobalMode ? 'global' : `season_${selectedLeagueId}`}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const topFiveClinch = useMemo(() => {
    const pool = rankedPool.length > 0 ? rankedPool : processedStandings;
    if (pool.length === 0) return [];
    return pool.slice(0, 5).map((team: any, idx: number) => {
      const mn = getMagicNumber(team, idx);
      const targetSeason = isGlobalMode ? team.season_id : (selectedLeagueId || team.season_id);
      const teamLink = targetSeason ? `/team/${team.id}?season=${targetSeason}` : `/team/${team.id}`;

      let statusText = '-';
      let isClinched = false;

      if (team.clinch) {
        statusText = `Clinched (${team.clinch})`;
        isClinched = true;
      } else if (mn === 0) {
        statusText = 'Clinched (x)';
        isClinched = true;
      } else if (mn !== null && mn > 0) {
        statusText = `Magic #: ${mn}`;
      } else if (isGlobalMode || activeCutoffCount <= 0) {
        statusText = `${team.pts} PTS`;
      } else {
        statusText = `${team.pts} PTS`;
      }

      return {
        id: team.id,
        name: team.name,
        abbr: team.abbr,
        link: teamLink,
        statusText,
        isClinched
      };
    });
  }, [rankedPool, processedStandings, isGlobalMode, activeCutoffCount, selectedLeagueId, gamesPerTeam]);

  const hasGroups = availableConferences.length > 0 || availableDivisions.length > 0;
  const colSpanCount = 19;

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-black font-serif overflow-x-hidden">
      <div className={isFullScreen ? 'fixed inset-0 bg-[#f4f1ea] z-50 overflow-y-auto p-4 md:p-8' : 'max-w-[1400px] mx-auto px-4 py-8'}>

        <div className="border-b-4 border-black pt-2 sm:pt-4 pb-3 sm:pb-4 text-center relative">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight">League Standings</h1>
          <p className="text-xs sm:text-sm uppercase tracking-widest mt-1 sm:mt-2 italic">The Official Record of NHL95 Athletics</p>

          {isFullScreen && (
            <button
              onClick={() => setIsFullScreen(false)}
              className="absolute right-2 top-2 sm:top-4 flex items-center gap-1 text-xs border border-black px-2 py-1 font-sans font-bold uppercase hover:bg-black hover:text-white transition-all rounded-xs cursor-pointer"
            >
              <Minimize2 className="w-3 h-3" /> <span className="hidden sm:inline">Close Full Screen</span>
            </button>
          )}
        </div>

        <div className="border-y border-black p-2 flex flex-col lg:flex-row items-center justify-between mt-3 sm:mt-4 mb-3 gap-3 sm:gap-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full lg:w-auto">
            {/* League Type Buttons */}
            <div className="flex items-center gap-1.5 bg-white border-2 border-black p-1 shadow-xs overflow-x-auto max-w-full no-scrollbar">
              <button
                type="button"
                onClick={() => handleLeagueTypeChange('ALL')}
                className={`px-2.5 py-1 h-8 md:h-9 flex items-center justify-center text-xs font-black uppercase transition-all shrink-0 cursor-pointer ${selectedLeagueType === 'ALL' && !isGlobalMode
                  ? 'bg-black text-white shadow-xs'
                  : 'text-black hover:bg-neutral-100'
                  }`}
                title="All Leagues"
              >
                ALL
              </button>
              {availableLeagueTypes.map((type) => {
                const config = LEAGUE_LOGOS[type];
                const isSelected = selectedLeagueType === type && !isGlobalMode;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleLeagueTypeChange(type)}
                    className={`px-2 py-0.5 flex items-center justify-center transition-all h-8 md:h-9 border-2 shrink-0 cursor-pointer ${isSelected
                      ? 'bg-yellow-100 border-black shadow-xs ring-1 ring-black'
                      : 'border-transparent bg-transparent opacity-65 hover:opacity-100 hover:border-black/30 hover:bg-neutral-50'
                      }`}
                    title={config?.name || `${type} League`}
                  >
                    {config?.logoUrl ? (
                      <img
                        src={config.logoUrl}
                        alt={config.name || `${type} League`}
                        className="h-5 md:h-6 w-auto max-w-[60px] md:max-w-[80px] object-contain block"
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

            {/* Season Selector */}
            <div className="flex items-center gap-2">
              <label className="font-bold text-xs uppercase opacity-70">Season:</label>
              <select
                value={isGlobalMode ? 'GLOBAL' : selectedLeagueId}
                onChange={(e) => {
                  if (e.target.value === 'GLOBAL') {
                    setIsGlobalMode(true);
                  } else {
                    setIsGlobalMode(false);
                    setSelectedLeagueId(e.target.value);
                  }
                }}
                className="bg-transparent font-bold text-xs md:text-sm uppercase border-b-2 border-black focus:outline-none cursor-pointer font-sans p-1"
              >
                {!isGlobalMode && filteredSeasons.map((s) => (
                  <option key={s.league_id} value={s.league_id} className="bg-[#fdfaf5]">
                    {s.league_name}
                  </option>
                ))}
                {isGlobalMode && <option value="GLOBAL" className="bg-[#fdfaf5]">All Historical Seasons Active</option>}
                <hr />
                <option value={activeSeasonId}>Latest Active Season</option>
              </select>
            </div>

            <div className="flex items-center gap-1 border-l border-black/20 pl-3 sm:pl-4 font-sans font-bold text-xs">
              <button
                onClick={() => setIsCompactView(!isCompactView)}
                className={`p-1 border rounded-xs mr-1 transition-colors cursor-pointer ${isCompactView ? 'bg-black text-white border-black' : 'border-black/20 text-black/60 hover:text-black'}`}
                title="Toggle Compact Spacing View"
              >
                {isCompactView ? <Grid className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
              </button>
              <span className="opacity-60 hidden sm:inline">Compact</span>

              {!isFullScreen && (
                <button
                  onClick={() => setIsFullScreen(true)}
                  className="p-1 border border-black/20 rounded-xs ml-2 sm:ml-3 text-black/60 hover:text-black hover:border-black transition-colors cursor-pointer"
                  title="Maximize to Full Screen Display"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full lg:w-auto justify-end">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2 top-1.5 text-gray-500 w-3 h-3" />
              <input
                type="text"
                placeholder={isGlobalMode ? "Global Search Team..." : "Search Team..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-b border-black text-xs pl-8 pb-1 focus:outline-none w-full sm:w-48 font-sans"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
              <button
                onClick={downloadCSV}
                className="flex items-center gap-1 text-xs border border-black/20 font-sans font-bold uppercase px-2.5 py-1 hover:border-black transition-colors text-black/70 hover:text-black rounded-xs cursor-pointer"
                title="Export Active Lines to Spreadsheets"
              >
                <Download className="w-3 h-3" /> <span className="hidden sm:inline">Export</span> CSV
              </button>

              <button
                onClick={() => {
                  setIsGlobalMode(!isGlobalMode);
                  if (isGlobalMode) setSortField('pts');
                }}
                className={`flex items-center gap-1.5 text-xs font-black uppercase shrink-0 px-2.5 py-1 border transition-all duration-75 cursor-pointer ${isGlobalMode ? 'bg-black text-white border-black rounded-xs' : 'border-black/20 hover:border-black rounded-xs text-black/70 hover:text-black'
                  }`}
              >
                <Globe className="w-3 h-3" />
                Global {isGlobalMode ? 'Active' : ''} <ChevronDown className="w-3 h-3 opacity-40" />
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Structural Grid Layout Area */}
        <div className="bg-[#ebd9c0]/40 border border-black/20 rounded-xs p-3 mb-4 font-sans select-none text-xs">
          {isGlobalMode ? (
            <div className="text-[10px] font-sans font-bold uppercase text-emerald-800 py-1 italic tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Cross-Season Global Query Grid Enabled: Search filters historical standings for all iterations of a matching club.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              <div className="md:col-span-2 border-b md:border-b-0 md:border-r border-black/10 pb-2 md:pb-0 md:pr-2">
                <div className="font-sans font-black text-[10px] tracking-widest text-black/40 uppercase mb-1 md:mb-2">League</div>
                <button
                  onClick={() => setCurrentTab('ALL')}
                  className={`w-full text-left px-2 py-1 font-black uppercase tracking-tight text-[11px] rounded-xs transition-all cursor-pointer ${currentTab === 'ALL' ? 'bg-black text-white shadow-xs' : 'text-black/70 hover:bg-black/5 hover:text-black'
                    }`}
                >
                  Overall League
                </button>
              </div>

              <div className="md:col-span-3 border-b md:border-b-0 md:border-r border-black/10 pb-2 md:pb-0 md:pr-2">
                <div className="font-sans font-black text-[10px] tracking-widest text-black/40 uppercase mb-1 md:mb-2">Conference</div>
                {hasGroups && availableConferences.length > 0 ? (
                  <div className="flex flex-wrap md:flex-col gap-1">
                    {availableConferences.map((conf) => (
                      <button
                        key={conf}
                        onClick={() => setCurrentTab(conf)}
                        className={`text-left px-2 py-1 font-bold uppercase text-[11px] rounded-xs transition-all cursor-pointer ${currentTab === conf ? 'bg-black text-white' : 'text-black/70 hover:bg-black/5 hover:text-black'
                          }`}
                      >
                        {conf} Conf.
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] font-bold uppercase tracking-wider text-black/30 italic py-1 pl-2">— None Found</div>
                )}
              </div>

              <div className="md:col-span-7">
                <div className="font-sans font-black text-[10px] tracking-widest text-black/40 uppercase mb-1 md:mb-2">Divisions</div>
                {hasGroups && availableDivisions.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                    {availableDivisions.map((div) => (
                      <button
                        key={div}
                        onClick={() => setCurrentTab(div)}
                        className={`text-left px-2 py-1 font-bold uppercase text-[11px] rounded-xs transition-all whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer ${currentTab === div ? 'bg-black text-white' : 'text-black/70 hover:bg-black/5 hover:text-black'
                          }`}
                        title={`${div} Division`}
                      >
                        {div} Div.
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] font-bold uppercase tracking-wider text-black/30 italic py-1 pl-2">— None Found</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Swipe Notice */}
        <div className="md:hidden flex items-center justify-between text-[10px] font-sans font-bold text-black/60 px-3 py-1.5 bg-[#ebd9c0]/50 border border-black/15 mb-2 rounded-xs uppercase tracking-wider">
          <span>↔ Swipe table sideways for full stats</span>
          <span>{processedStandings.length} Teams</span>
        </div>

        {/* Core Visual Standings Display Board */}
        <div className="bg-white border border-gray-300 shadow-sm overflow-x-auto select-none rounded-xs -mx-2 sm:mx-0">
          {loading ? (
            <div className="p-12 text-center text-xs font-black uppercase tracking-widest opacity-40 font-sans">
              Aggregating statistics lines...
            </div>
          ) : processedStandings.length === 0 ? (
            <div className="p-12 text-center text-xs font-black uppercase tracking-widest opacity-40 font-sans">
              No matching records found.
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[1020px] md:min-w-[1120px] transition-all text-[12px]">
              <thead>
                <tr className="border-b-2 border-black uppercase text-[10px] font-sans font-black tracking-wider text-black/70 bg-black/[0.01]">
                  {!isGlobalMode ? (
                    <th onClick={() => handleSort('seed')} className="sticky left-0 bg-[#fdfaf5] z-20 text-center cursor-pointer hover:bg-black/[0.03] transition-colors py-2 px-1 w-[50px] sm:w-[65px] border-r border-black/10">
                      Seed {renderSortIcon('seed')}
                    </th>
                  ) : (
                    <th onClick={() => handleSort('season_id')} className="sticky left-0 bg-[#fdfaf5] z-20 text-center cursor-pointer hover:bg-black/[0.06] transition-colors font-black text-black py-2 px-1 w-[90px] sm:w-[110px] border-r border-black/10">
                      Season {renderSortIcon('season_id')}
                    </th>
                  )}

                  <th className="sticky left-[50px] sm:left-[65px] bg-[#fdfaf5] z-20 w-[180px] sm:w-[260px] text-center py-2 px-1 border-r border-black/10 shadow-[2px_0_4px_rgba(0,0,0,0.04)]">
                    Club Identity
                  </th>
                  <th className="w-[45px] sm:w-[50px] text-center font-sans font-black tracking-wider text-[9px] text-black/40 select-none py-2 px-1" title="Clinch Status (x = Playoff, y = Division, z = Conference, p = Presidents' Trophy)">
                    Clinch
                  </th>
                  <th className="w-[45px] sm:w-[55px] text-center font-sans font-black tracking-wider text-[9px] text-emerald-800 select-none py-2 px-1" title="Magic Number: Points required to clinch playoff qualification">
                    M #
                  </th>
                  <th className="w-[45px] sm:w-[55px] text-center font-sans font-black tracking-wider text-[9px] text-red-700 select-none py-2 px-1" title="Elimination Number: Points before mathematical elimination">
                    E #
                  </th>

                  <th className="text-center w-[45px] sm:w-[50px] text-black/40 py-2 px-1">GP</th>
                  <th onClick={() => handleSort('wins')} className="text-center w-[50px] sm:w-[55px] cursor-pointer hover:bg-black/[0.03] transition-colors py-2 px-1">
                    W {renderSortIcon('wins')}
                  </th>
                  <th onClick={() => handleSort('losses')} className="text-center w-[50px] sm:w-[55px] cursor-pointer hover:bg-black/[0.03] transition-colors py-2 px-1">
                    L {renderSortIcon('losses')}
                  </th>
                  <th onClick={() => handleSort('ties')} className="text-center w-[50px] sm:w-[55px] cursor-pointer hover:bg-black/[0.03] transition-colors py-2 px-1">
                    T {renderSortIcon('ties')}
                  </th>
                  <th onClick={() => handleSort('pts')} className="text-center w-[60px] sm:w-[70px] font-black bg-black/[0.03] cursor-pointer hover:bg-black/[0.06] transition-colors py-2 px-1">
                    PTS {renderSortIcon('pts')}
                  </th>
                  <th onClick={() => handleSort('gf')} className="text-center w-[50px] sm:w-[55px] cursor-pointer hover:bg-black/[0.03] transition-colors py-2 px-1">
                    GF {renderSortIcon('gf')}
                  </th>
                  <th onClick={() => handleSort('ga')} className="text-center w-[50px] sm:w-[55px] cursor-pointer hover:bg-black/[0.03] transition-colors py-2 px-1">
                    GA {renderSortIcon('ga')}
                  </th>
                  <th onClick={() => handleSort('gd')} className="text-center w-[50px] sm:w-[55px] cursor-pointer hover:bg-black/[0.03] transition-colors py-2 px-1">
                    +/- {renderSortIcon('gd')}
                  </th>
                  <th className="text-center w-[75px] sm:w-[90px] py-2 px-1">HOME</th>
                  <th className="text-center w-[75px] sm:w-[90px] py-2 px-1">AWAY</th>
                  <th onClick={() => handleSort('otWins')} className="text-center w-[55px] sm:w-[65px] text-emerald-700 bg-emerald-50/30 cursor-pointer hover:bg-emerald-50/50 transition-colors py-2 px-1">
                    OTW {renderSortIcon('otWins')}
                  </th>
                  <th onClick={() => handleSort('otLosses')} className="text-center w-[55px] sm:w-[65px] text-rose-700 bg-rose-50/30 cursor-pointer hover:bg-rose-50/50 transition-colors py-2 px-1">
                    OTL {renderSortIcon('otLosses')}
                  </th>
                  <th className="text-center w-[55px] sm:w-[65px] py-2 px-1">STRK</th>
                  <th className="text-center w-[70px] sm:w-[80px] py-2 px-1">L10</th>
                </tr>
              </thead>
              <tbody className="font-sans font-bold">
                {processedStandings.map((team: any, index: number) => {
                  const isPlayoffBoundaryLine = !isGlobalMode && activeCutoffCount > 0 && index + 1 === activeCutoffCount;
                  const mNumber = getMagicNumber(team, index);
                  const eNumber = getEliminationNumber(team, index);
                  const targetSeason = isGlobalMode ? team.season_id : (selectedLeagueId || team.season_id);
                  const teamHref = targetSeason ? `/team/${team.id}?season=${targetSeason}` : `/team/${team.id}`;

                  return (
                    <React.Fragment key={`${team.id}-${team.season_id}-${index}`}>
                      <tr className="group border-b border-gray-200 hover:bg-gray-50 transition-colors duration-75 max-h-[36px]">
                        <td className="sticky left-0 bg-white group-hover:bg-gray-50 z-10 text-center font-mono font-black text-gray-400 py-1 px-1 text-[11px] align-middle border-r border-black/5">
                          {isGlobalMode ? team.season_display_name : team.seed}
                        </td>

                        {/* Team Selection Link */}
                        <td className="sticky left-[50px] sm:left-[65px] bg-white group-hover:bg-gray-50 z-10 flex justify-center items-center whitespace-nowrap py-1 px-1 w-[180px] sm:w-[260px] align-middle border-r border-black/5 shadow-[2px_0_4px_rgba(0,0,0,0.03)]">
                          <Link
                            href={teamHref}
                            className="w-full flex justify-center items-center group/link cursor-pointer hover:opacity-85 transition-all duration-75"
                            title={`View ${team.name || team.abbr} Team Page`}
                          >
                            {team.banner_url ? (
                              <div className="w-full flex justify-center max-h-[28px] items-center relative">
                                <img
                                  src={team.banner_url}
                                  alt={team.abbr}
                                  className="object-contain block filter contrast-125 saturate-110 drop-shadow-xs mix-blend-multiply max-w-full w-32 sm:w-40 h-6 sm:h-7 transition-transform duration-75 group-hover/link:scale-102 rounded-xs"
                                  onError={(e) => {
                                    const target = e.currentTarget;
                                    const fallbacks: string[] = team.fallback_urls || [];
                                    const triedList = (target.dataset.tried || '').split('|');
                                    const nextUrl = fallbacks.find((url: string) => url && !triedList.includes(url) && url !== target.src);

                                    if (nextUrl) {
                                      target.dataset.tried = `${target.dataset.tried || ''}|${nextUrl}`;
                                      target.src = nextUrl;
                                    } else {
                                      target.style.display = 'none';
                                      const fallbackDiv = target.parentElement?.querySelector('.team-abbr-fallback') as HTMLElement | null;
                                      if (fallbackDiv) fallbackDiv.style.display = 'flex';
                                    }
                                  }}
                                />
                                <div
                                  style={{ display: 'none' }}
                                  className="team-abbr-fallback bg-black/5 border border-black/20 rounded-xs items-center justify-center font-sans font-black text-black/60 tracking-widest w-full h-6 sm:h-7 shadow-inner text-[12px] sm:text-[13px]"
                                >
                                  {team.abbr}
                                </div>
                              </div>
                            ) : (
                              <div className="bg-black/5 border border-black/20 rounded-xs flex items-center justify-center font-sans font-black text-black/60 tracking-widest w-full h-6 sm:h-7 shadow-inner text-[12px] sm:text-[13px] group-hover/link:bg-black/10 transition-colors">
                                {team.abbr}
                              </div>
                            )}
                          </Link>
                        </td>

                        {/* Clinch Status Cell */}
                        <td className="text-center font-mono select-none py-1 px-1 align-middle">
                          {team.clinch ? (
                            <span className="inline-block bg-blue-600 text-white font-mono text-[10px] px-1.5 py-0.5 rounded-xs font-black tracking-wider uppercase shadow-xs" title={`Clinched: ${team.clinch}`}>
                              {team.clinch}
                            </span>
                          ) : mNumber === 0 ? (
                            <span className="inline-block bg-emerald-600 text-white font-mono text-[10px] px-1.5 py-0.5 rounded-xs font-black tracking-wider uppercase shadow-xs" title="Clinched Playoff Spot">
                              x
                            </span>
                          ) : (
                            <span className="text-gray-300 font-normal font-mono">-</span>
                          )}
                        </td>

                        {/* Magic Number (M #) Content Cell */}
                        <td className="text-center font-mono select-none py-1 px-1 align-middle">
                          {mNumber !== null ? (
                            mNumber === 0 ? (
                              <span className="inline-block bg-emerald-100 text-emerald-800 font-mono text-[10px] px-1.5 py-0.5 rounded-xs font-black tracking-wide uppercase">
                                Clinched
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-black font-mono text-[11px] bg-emerald-50 px-1.5 py-0.5 rounded-xs border border-emerald-200/50">
                                {mNumber}
                              </span>
                            )
                          ) : (
                            <span className="text-gray-300 font-normal font-mono">-</span>
                          )}
                        </td>

                        {/* Elimination Number (E #) Content Cell */}
                        <td className="text-center font-mono select-none py-1 px-1 align-middle">
                          {eNumber !== null ? (
                            eNumber === 0 ? (
                              <span className="inline-block bg-red-100 text-red-700 font-mono text-[10px] px-1.5 py-0.5 rounded-xs font-black tracking-wide uppercase">
                                Elim
                              </span>
                            ) : (
                              <span className="text-red-600 font-black font-mono text-[11px] bg-red-50 px-1.5 py-0.5 rounded-xs border border-red-200/50">
                                {eNumber}
                              </span>
                            )
                          ) : (
                            <span className="text-gray-300 font-normal font-mono">-</span>
                          )}
                        </td>

                        <td className="text-center font-mono text-gray-600 py-1 px-1 align-middle">{team.gp}</td>
                        <td className="text-center font-mono text-emerald-700 font-black py-1 px-1 align-middle">{team.wins}</td>
                        <td className="text-center font-mono text-rose-600 py-1 px-1 align-middle">{team.losses}</td>
                        <td className="text-center font-mono text-gray-500 py-1 px-1 align-middle">{team.ties}</td>
                        <td className="text-center font-mono font-black text-black bg-black/[0.02] py-1 px-1 text-[13px] align-middle">
                          {team.pts}
                        </td>
                        <td className="text-center font-mono text-gray-400 font-medium py-1 px-1 align-middle">{team.gf}</td>
                        <td className="text-center font-mono text-gray-400 font-medium py-1 px-1 align-middle">{team.ga}</td>
                        <td className={`text-center font-mono font-black py-1 px-1 align-middle ${team.gd > 0 ? 'text-emerald-600' : team.gd < 0 ? 'text-rose-600' : 'text-gray-300'}`}>
                          {team.gd > 0 ? `+${team.gd}` : team.gd}
                        </td>
                        <td className="text-center font-mono text-gray-500 font-normal py-1 px-1 align-middle">{team.homeRecord}</td>
                        <td className="text-center font-mono text-gray-500 font-normal py-1 px-1 align-middle">{team.awayRecord}</td>
                        <td className="text-center font-mono text-emerald-700 bg-emerald-50/10 font-bold py-1 px-1 align-middle">{team.otWins}</td>
                        <td className="text-center font-mono text-rose-600 bg-rose-50/10 font-bold py-1 px-1 align-middle">{team.otLosses}</td>
                        <td className={`text-center font-mono font-black py-1 px-1 align-middle ${team.streak?.startsWith('W') ? 'text-emerald-600' : team.streak?.startsWith('OTL') ? 'text-amber-600' : team.streak?.startsWith('L') ? 'text-rose-600' : 'text-gray-400'}`}>{team.streak}</td>
                        <td className="text-center font-mono text-gray-400 font-normal py-1 px-1 align-middle">{team.l10}</td>
                      </tr>

                      {/* Clean Solid Dashed Playoff Border Line Injection Point */}
                      {isPlayoffBoundaryLine && (
                        <tr key={`cutoff-boundary-${team.season_id}-${index}`} className="bg-amber-100/90 border-y-2 border-dashed border-amber-600 select-none">
                          <td colSpan={colSpanCount} className="py-2 px-3 text-center font-sans font-black tracking-widest text-[10px] text-amber-950 uppercase align-middle bg-gradient-to-r from-amber-200/60 via-amber-100 to-amber-200/60 shadow-xs">
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-amber-700 font-bold">★ ★ ★</span>
                              <span>PLAYOFF CUTOFF LINE • TOP {activeCutoffCount} QUALIFY FOR POSTSEASON</span>
                              <span className="text-amber-700 font-bold">★ ★ ★</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="h-12"></div>

        {/* Footer info panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-black pt-6">
          <div>
            <h3 className="font-black uppercase text-sm mb-4">League Legend & Column Glossary</h3>
            <div className="grid grid-cols-2 text-[11px] gap-y-2 font-sans font-semibold text-black/80">
              <p><strong>GP</strong> Games Played</p> <p><strong>W / L / T</strong> Wins / Losses / Ties</p>
              <p><strong>PTS</strong> Points (Win = 2, Tie/OTL = 1)</p> <p><strong>+/-</strong> Goal Differential</p>
              <p><strong>HOME / AWAY</strong> Split Venue Records</p> <p><strong>OTW / OTL</strong> Overtime Wins / Losses</p>
              <p><strong>STRK</strong> Active Hot/Cold Streak</p> <p><strong>L10</strong> Record Over Past 10 Matchups</p>
              <p><strong>M #</strong> Magic Number (Points to clinch playoff spot)</p>
              <p><strong>E #</strong> Elimination Number (Points before mathematical lockout)</p>
            </div>
          </div>

          <div>
            <h3 className="font-black uppercase text-sm mb-4">Clinch Watch (Top 5)</h3>
            <div className="bg-white border border-gray-300 p-4 text-[12px] font-sans font-bold">
              {loading ? (
                <div className="text-center py-2 opacity-40 uppercase text-[10px] tracking-wider">Evaluating positions...</div>
              ) : topFiveClinch.map((team: any, i: number) => (
                <div key={i} className="flex justify-between border-b border-gray-100 py-1.5 last:border-0 items-center">
                  <Link
                    href={team.link}
                    className="font-serif font-black text-[13px] hover:underline hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    {team.name}
                  </Link>
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded-xs font-bold ${team.isClinched
                      ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                      : 'text-blue-700 bg-blue-50 border border-blue-200'
                    }`}>
                    {team.statusText}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}