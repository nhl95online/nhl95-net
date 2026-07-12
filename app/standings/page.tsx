"use client";

import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, ArrowUp, ArrowDown, Globe, Maximize2, Minimize2, List, Grid, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type SortField = 'seed' | 'wins' | 'losses' | 'ties' | 'pts' | 'gf' | 'ga' | 'gd' | 'otWins' | 'otLosses' | 'season_id';
type SortOrder = 'asc' | 'desc';

export default function StandingsPage() {
  const [seasons, setSeasons] = useState<any[]>([]);
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

  // Playoff Cutoff Count State
  const [playoffCutoffCount, setPlayoffCutoffCount] = useState<number>(0);

  // 1. Dynamic Load: Fetch all valid seasons and rules configurations
  useEffect(() => {
    const fetchSeasons = async () => {
      let { data, error } = await supabase
        .from('league_seasons')
        .select('*');

      if (error || !data || data.length === 0) {
        const fallbackQuery = await supabase
          .from('leagues')
          .select('*');

        data = fallbackQuery.data;
        error = fallbackQuery.error;
      }

      if (error || !data || data.length === 0) {
        const emergencyFallback = Array.from({ length: 38 }, (_, i) => {
          const id = i + 1;
          return { league_id: String(id), league_name: `Season ${id.toString().padStart(2, '0')}` };
        });
        setSeasons(emergencyFallback);
        setActiveSeasonId("38");
        setSelectedLeagueId("38");
        return;
      }

      const formattedList = data.map((row: any) => {
        const lId = row.league_id !== undefined ? row.league_id : (row.id || row.season_id);
        const dynamicName = row.league_name || row.name || row.season_name || `Season ${lId}`;

        // Dynamic extraction of schedule lengths from rules JSON definition fields
        let customGamesLimit = 82;
        try {
          if (row.rules_json) {
            const parsedRules = typeof row.rules_json === 'string' ? JSON.parse(row.rules_json) : row.rules_json;
            if (parsedRules?.games_per_team) {
              customGamesLimit = parseInt(parsedRules.games_per_team) || 82;
            }
          }
        } catch (e) {
          console.error("Failed parsing rules_json", e);
        }

        return {
          league_id: String(lId).trim(),
          league_name: String(dynamicName).trim(),
          games_per_team: customGamesLimit
        };
      })
        .sort((a, b) => Number(a.league_id) - Number(b.league_id));

      setSeasons(formattedList);

      const latestSeason = formattedList[formattedList.length - 1];
      if (latestSeason) {
        setActiveSeasonId(latestSeason.league_id);
        setSelectedLeagueId(latestSeason.league_id);
        setGamesPerTeam(latestSeason.games_per_team || 82);
      }
    };

    fetchSeasons();
  }, []);

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

  const getTeamMetadataMap = async () => {
    const { data: teamsData } = await supabase
      .from('league_teams')
      .select('team_id, team_name, abbreviation, banner_filename');

    const baseTeamMap: Record<number, any> = {};
    teamsData?.forEach((t: any) => {
      const tId = Number(t.team_id);
      const bannerFile = t.banner_filename?.trim();
      const publicUrl = bannerFile ? supabase.storage.from('banners').getPublicUrl(bannerFile).data.publicUrl : null;

      baseTeamMap[tId] = {
        id: tId,
        name: t.team_name,
        abbr: t.abbreviation,
        banner_url: publicUrl
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
      const meta = baseTeamMap[tId] || { name: `Retro Club #${tId}`, abbr: `TM${tId}`, banner_url: null };
      const matchingSeason = seasons.find(s => String(s.league_id) === String(row.season_id));

      return {
        ...meta,
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
    const baseTeamMap = await getTeamMetadataMap();

    const { data: playoffData } = await supabase
      .from('league_playoffs')
      .select('team_id')
      .eq('season_id', numericLeagueId);

    if (playoffData && playoffData.length > 0) {
      const uniquePlayoffTeams = new Set(playoffData.map(p => p.team_id));
      setPlayoffCutoffCount(uniquePlayoffTeams.size);
    } else {
      setPlayoffCutoffCount(0);
    }

    let freshStandings: any[] = [];

    if (String(leagueId) !== String(activeSeasonId) || !activeSeasonId) {
      const { data: standardData } = await supabase
        .from('league_standings')
        .select('*')
        .eq('season_id', numericLeagueId);

      freshStandings = (standardData || [])
        .map((row: any) => {
          const tId = Number(row.team_id);
          const meta = baseTeamMap[tId] || { name: `Retro Club #${tId}`, abbr: `TM${tId}`, banner_url: null };

          return {
            ...meta,
            season_id: numericLeagueId,
            season_display_name: '',
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
    } else {
      const { data: allScheduleData } = await supabase
        .from('league_schedule')
        .select('game_id, home_team_id, away_team_id, played, league_id')
        .eq('league_id', numericLeagueId)
        .order('game_id', { ascending: true });

      const { data: statsData } = await supabase
        .from('league_gamestats')
        .select('game_id, home_score, away_score, game_meta, league_id')
        .eq('league_id', numericLeagueId);

      const teamMap: Record<number, any> = {};

      Object.keys(baseTeamMap).forEach((idStr) => {
        const tId = Number(idStr);
        const isTeamInLeague = allScheduleData?.some(g => Number(g.home_team_id) === tId || Number(g.away_team_id) === tId);

        if (isTeamInLeague && tId !== 999 && tId !== 0 && tId !== 68) {
          teamMap[tId] = {
            ...baseTeamMap[tId],
            season_id: numericLeagueId,
            season_display_name: '',
            gp: 0, wins: 0, losses: 0, ties: 0, pts: 0, gf: 0, ga: 0,
            homeWins: 0, homeLosses: 0, homeTies: 0,
            awayWins: 0, awayLosses: 0, awayTies: 0,
            otWins: 0, otLosses: 0,
            history: [],
            conference: null,
            division: null,
            clinch: ''
          };
        }
      });

      allScheduleData?.forEach((game: any) => {
        const rawPlayed = String(game.played).trim().toLowerCase();
        const isPlayed = rawPlayed === "true" || rawPlayed === "1" || rawPlayed === "y" || rawPlayed === "yes";
        if (!isPlayed) return;

        const statsMatch = statsData?.find((s: any) => s.game_id?.toString().trim() === game.game_id?.toString().trim());
        if (!statsMatch) return;

        let isOT = false;
        let isTie = false;

        try {
          if (statsMatch.game_meta) {
            const parsedMeta = typeof statsMatch.game_meta === 'string' ? JSON.parse(statsMatch.game_meta) : statsMatch.game_meta;
            isOT = parsedMeta.is_ot === true || parsedMeta.is_ot === "true" || parsedMeta.is_ot === 1 || parsedMeta.is_ot === "1";
            isTie = parsedMeta.is_tie === true || parsedMeta.is_tie === "true" || parsedMeta.is_tie === 1 || parsedMeta.is_tie === "1";
          }
        } catch (e) {
          const lowStr = String(statsMatch.game_meta || "").toLowerCase();
          isOT = lowStr.includes('"is_ot":true') || lowStr.includes('"is_ot":"true"') || lowStr.includes('"is_ot":1');
          isTie = lowStr.includes('"is_tie":true') || lowStr.includes('"is_tie":"true"') || lowStr.includes('"is_tie":1');
        }

        const homeScore = Number(statsMatch.home_score) || 0;
        const awayScore = Number(statsMatch.away_score) || 0;
        const hId = Number(game.home_team_id);
        const aId = Number(game.away_team_id);

        if (hId === 999 || aId === 999 || hId === 0 || aId === 0 || hId === 68 || aId === 68) return;

        if (homeScore === awayScore && !isOT) {
          isTie = true;
        }

        if (teamMap[hId] && teamMap[aId]) {
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
            teamMap[hId].history.push("T");

            teamMap[aId].ties += 1;
            teamMap[aId].awayTies += 1;
            teamMap[aId].pts += 1;
            teamMap[aId].history.push("T");
          } else if (homeScore > awayScore) {
            teamMap[hId].wins += 1;
            teamMap[hId].homeWins += 1;
            teamMap[hId].pts += 2;
            teamMap[hId].history.push("W");

            teamMap[aId].losses += 1;
            teamMap[aId].awayLosses += 1;
            teamMap[aId].history.push("L");

            if (isOT) {
              teamMap[hId].otWins += 1;
              teamMap[aId].otLosses += 1;
            }
          } else if (awayScore > homeScore) {
            teamMap[aId].wins += 1;
            teamMap[aId].awayWins += 1;
            teamMap[aId].pts += 2;
            teamMap[aId].history.push("W");

            teamMap[hId].losses += 1;
            teamMap[hId].homeLosses += 1;
            teamMap[hId].history.push("L");

            if (isOT) {
              teamMap[aId].otWins += 1;
              teamMap[hId].otLosses += 1;
            }
          }
        }
      });

      freshStandings = Object.values(teamMap).map((team: any) => {
        let streakStr = "-";
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

        const last10Games = team.history.slice(-10);
        const l10W = last10Games.filter((r: string) => r === "W").length;
        const l10L = last10Games.filter((r: string) => r === "L").length;
        const l10T = last10Games.filter((r: string) => r === "T").length;

        return {
          ...team,
          gd: team.gf - team.ga,
          streak: streakStr,
          l10: `${l10W}-${l10L}-${l10T}`,
          homeRecord: `${team.homeWins}-${team.homeLosses}-${team.homeTies}`,
          awayRecord: `${team.awayWins}-${team.awayLosses}-${team.awayTies}`
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

  // Dynamic Mathematical Elimination Logic Processing Block ($E\#$)
  const getEliminationNumber = (team: any, currentIndex: number) => {
    if (isGlobalMode || playoffCutoffCount <= 0 || currentIndex < playoffCutoffCount) return null;

    // Fetch the team right on the edge of the active playoff bubble line
    const cutoffTeam = processedStandings[playoffCutoffCount - 1];
    if (!cutoffTeam) return null;

    const totalAvailablePoints = gamesPerTeam * 2;
    const teamMaxPossiblePoints = team.pts + ((gamesPerTeam - team.gp) * 2);

    if (teamMaxPossiblePoints < cutoffTeam.pts) return 0;

    const eliminationValue = totalAvailablePoints - team.pts - ((gamesPerTeam - cutoffTeam.gp) * 2) - cutoffTeam.pts + 1;
    return eliminationValue <= 0 ? 0 : eliminationValue;
  };

  const downloadCSV = () => {
    if (processedStandings.length === 0) return;

    const headers = [
      "Scope Context", "Seed ID", "Club Name", "Abbr", "Clinch Status", "Elimination Number",
      "GP", "W", "L", "T", "PTS", "GF", "GA", "+/-", "Home", "Away", "OTW", "OTL", "Streak", "L10"
    ];

    const rows = processedStandings.map((t: any, idx: number) => [
      isGlobalMode ? t.season_display_name : `Season ID ${t.season_id}`,
      t.seed || "-",
      `"${t.name}"`,
      t.abbr,
      t.clinch || "-",
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

  const topFiveClinch = processedStandings.slice(0, 5).map((team) => {
    const dummyMagicNumber = Math.max(0, 14 - team.wins);
    return {
      name: team.name,
      mn: team.clinch ? `Clinched (${team.clinch})` : (dummyMagicNumber === 0 ? "Clinched (x)" : dummyMagicNumber)
    };
  });

  const hasGroups = availableConferences.length > 0 || availableDivisions.length > 0;
  const colSpanCount = 13;

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-black font-serif overflow-x-hidden">
      <div className={isFullScreen ? 'fixed inset-0 bg-[#f4f1ea] z-50 overflow-y-auto p-4 md:p-8' : 'max-w-[1400px] mx-auto px-4 py-8'}>

        <div className="border-b-4 border-black pt-4 pb-4 text-center relative">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight">League Standings</h1>
          <p className="text-sm uppercase tracking-widest mt-2 italic">The Official Record of NHL95 Athletics</p>

          {isFullScreen && (
            <button
              onClick={() => setIsFullScreen(false)}
              className="absolute right-2 top-4 flex items-center gap-1 text-xs border border-black px-2 py-1 font-sans font-bold uppercase hover:bg-black hover:text-white transition-all rounded-xs"
            >
              <Minimize2 className="w-3 h-3" /> Close Full Screen
            </button>
          )}
        </div>

        <div className="border-y border-black p-2 flex flex-col lg:flex-row items-center justify-between mt-4 mb-3 gap-4">
          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            <div className="flex items-center gap-2">
              <label className="font-bold text-xs uppercase opacity-70">Context Scope:</label>
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
                className="bg-transparent font-bold text-xs uppercase border-none focus:outline-none cursor-pointer font-sans"
              >
                {!isGlobalMode && seasons.map((s) => (
                  <option key={s.league_id} value={s.league_id} className="bg-[#fdfaf5]">
                    {s.league_name}
                  </option>
                ))}
                {isGlobalMode && <option value="GLOBAL" className="bg-[#fdfaf5]">All Historical Seasons Active</option>}
                <hr />
                <option value={activeSeasonId}>Return to Single Seasons</option>
              </select>
            </div>

            <div className="flex items-center gap-1 border-l border-black/20 pl-4 font-sans font-bold text-xs">
              <button
                onClick={() => setIsCompactView(!isCompactView)}
                className={`p-1 border rounded-xs mr-1 transition-colors ${isCompactView ? 'bg-black text-white border-black' : 'border-black/20 text-black/60 hover:text-black'}`}
                title="Toggle Compact Spacing View"
              >
                {isCompactView ? <Grid className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
              </button>
              <span className="opacity-60 hidden sm:inline">Compact</span>

              {!isFullScreen && (
                <button
                  onClick={() => setIsFullScreen(true)}
                  className="p-1 border border-black/20 rounded-xs ml-3 text-black/60 hover:text-black hover:border-black transition-colors"
                  title="Maximize to Full Screen Display"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto justify-end">
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

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={downloadCSV}
                className="flex items-center gap-1 text-xs border border-black/20 font-sans font-bold uppercase px-2.5 py-1 hover:border-black transition-colors text-black/70 hover:text-black rounded-xs"
                title="Export Active Lines to Spreadsheets"
              >
                <Download className="w-3 h-3" /> Export CSV
              </button>

              <button
                onClick={() => {
                  setIsGlobalMode(!isGlobalMode);
                  if (isGlobalMode) setSortField('pts');
                }}
                className={`flex items-center gap-1.5 text-xs font-black uppercase shrink-0 px-2.5 py-1 border transition-all duration-75 ${isGlobalMode ? 'bg-black text-white border-black rounded-xs' : 'border-black/20 hover:border-black rounded-xs text-black/70 hover:text-black'
                  }`}
              >
                <Globe className="w-3 h-3" />
                Global Query {isGlobalMode ? 'Active' : ''} <ChevronDown className="w-3 h-3 opacity-40" />
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
              <div className="md:col-span-2 border-r border-black/10 pr-2">
                <div className="font-sans font-black text-[10px] tracking-widest text-black/40 uppercase mb-2">League</div>
                <button
                  onClick={() => setCurrentTab('ALL')}
                  className={`w-full text-left px-2 py-1 font-black uppercase tracking-tight text-[11px] rounded-xs transition-all ${currentTab === 'ALL' ? 'bg-black text-white shadow-xs' : 'text-black/70 hover:bg-black/5 hover:text-black'
                    }`}
                >
                  Overall League
                </button>
              </div>

              <div className="md:col-span-3 border-r border-black/10 pr-2">
                <div className="font-sans font-black text-[10px] tracking-widest text-black/40 uppercase mb-2">Conference</div>
                {hasGroups && availableConferences.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {availableConferences.map((conf) => (
                      <button
                        key={conf}
                        onClick={() => setCurrentTab(conf)}
                        className={`text-left px-2 py-1 font-bold uppercase text-[11px] rounded-xs transition-all ${currentTab === conf ? 'bg-black text-white' : 'text-black/70 hover:bg-black/5 hover:text-black'
                          }`}
                      >
                        {conf} Conference
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] font-bold uppercase tracking-wider text-black/30 italic py-1 pl-2">— None Found</div>
                )}
              </div>

              <div className="md:col-span-7">
                <div className="font-sans font-black text-[10px] tracking-widest text-black/40 uppercase mb-2">Divisions</div>
                {hasGroups && availableDivisions.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                    {availableDivisions.map((div) => (
                      <button
                        key={div}
                        onClick={() => setCurrentTab(div)}
                        className={`text-left px-2 py-1 font-bold uppercase text-[11px] rounded-xs transition-all whitespace-nowrap overflow-hidden text-ellipsis ${currentTab === div ? 'bg-black text-white' : 'text-black/70 hover:bg-black/5 hover:text-black'
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

        {/* Core Visual Standings Display Board */}
        <div className="bg-white border border-gray-300 shadow-sm overflow-x-auto select-none rounded-xs">
          {loading ? (
            <div className="p-12 text-center text-xs font-black uppercase tracking-widest opacity-40 font-sans">
              Aggregating statistics lines...
            </div>
          ) : processedStandings.length === 0 ? (
            <div className="p-12 text-center text-xs font-black uppercase tracking-widest opacity-40 font-sans">
              No matching records found.
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[1050px] transition-all text-[12px]">
              <thead>
                <tr className="border-b-2 border-black uppercase text-[10px] font-sans font-black tracking-wider text-black/70 bg-black/[0.01]">
                  {!isGlobalMode ? (
                    <th onClick={() => handleSort('seed')} className="text-center cursor-pointer hover:bg-black/[0.03] transition-colors py-2 px-1 w-[65px]">
                      Seed {renderSortIcon('seed')}
                    </th>
                  ) : (
                    <th onClick={() => handleSort('season_id')} className="text-center bg-black/[0.03] cursor-pointer hover:bg-black/[0.06] transition-colors font-black text-black py-2 px-1 w-[110px]">
                      Season {renderSortIcon('season_id')}
                    </th>
                  )}

                  <th className="w-[260px] text-center bg-black/[0.01] py-2 px-1">Club Identity</th>
                  <th className="w-[60px] text-center font-sans font-black tracking-wider text-[9px] text-black/30 select-none py-2 px-1">Clinch</th>
                  <th className="w-[50px] text-center font-sans font-black tracking-wider text-[9px] text-red-700/40 select-none py-2 px-1">E #</th>

                  <th className="text-center w-[50px] text-black/40 py-2 px-1">GP</th>
                  <th onClick={() => handleSort('wins')} className="text-center w-[55px] cursor-pointer hover:bg-black/[0.03] transition-colors py-2 px-1">
                    W {renderSortIcon('wins')}
                  </th>
                  <th onClick={() => handleSort('losses')} className="text-center w-[55px] cursor-pointer hover:bg-black/[0.03] transition-colors py-2 px-1">
                    L {renderSortIcon('losses')}
                  </th>
                  <th onClick={() => handleSort('ties')} className="text-center w-[55px] cursor-pointer hover:bg-black/[0.03] transition-colors py-2 px-1">
                    T {renderSortIcon('ties')}
                  </th>
                  <th onClick={() => handleSort('pts')} className="text-center w-[70px] font-black bg-black/[0.03] cursor-pointer hover:bg-black/[0.06] transition-colors py-2 px-1">
                    PTS {renderSortIcon('pts')}
                  </th>
                  <th onClick={() => handleSort('gf')} className="text-center w-[55px] cursor-pointer hover:bg-black/[0.03] transition-colors py-2 px-1">
                    GF {renderSortIcon('gf')}
                  </th>
                  <th onClick={() => handleSort('ga')} className="text-center w-[55px] cursor-pointer hover:bg-black/[0.03] transition-colors py-2 px-1">
                    GA {renderSortIcon('ga')}
                  </th>
                  <th onClick={() => handleSort('gd')} className="text-center w-[55px] cursor-pointer hover:bg-black/[0.03] transition-colors py-2 px-1">
                    +/- {renderSortIcon('gd')}
                  </th>
                  <th className="text-center w-[90px] py-2 px-1">HOME</th>
                  <th className="text-center w-[90px] py-2 px-1">AWAY</th>
                  <th onClick={() => handleSort('otWins')} className="text-center w-[65px] text-emerald-700 bg-emerald-50/30 cursor-pointer hover:bg-emerald-50/50 transition-colors py-2 px-1">
                    OTW {renderSortIcon('otWins')}
                  </th>
                  <th onClick={() => handleSort('otLosses')} className="text-center w-[65px] text-rose-700 bg-rose-50/30 cursor-pointer hover:bg-rose-50/50 transition-colors py-2 px-1">
                    OTL {renderSortIcon('otLosses')}
                  </th>
                  <th className="text-center w-[65px] py-2 px-1">STRK</th>
                  <th className="text-center w-[80px] py-2 px-1">L10</th>
                </tr>
              </thead>
              <tbody className="font-sans font-bold">
                {processedStandings.map((team: any, index: number) => {
                  const isPlayoffBoundaryLine = !isGlobalMode && playoffCutoffCount > 0 && index + 1 === playoffCutoffCount;
                  const eNumber = getEliminationNumber(team, index);

                  return (
                    <React.Fragment key={`${team.id}-${team.season_id}-${index}`}>
                      <tr className="group border-b border-gray-200 hover:bg-gray-50 transition-colors duration-75 max-h-[36px]">
                        <td className="text-center font-mono font-black text-gray-400 py-1 px-1 text-[11px] align-middle">
                          {isGlobalMode ? team.season_display_name : team.seed}
                        </td>

                        <td className="flex justify-center items-center whitespace-nowrap py-1 px-1 w-[260px] align-middle">
                          {team.banner_url ? (
                            <div className="w-full flex justify-center max-h-[28px] items-center">
                              <img
                                src={team.banner_url}
                                alt={team.abbr}
                                className="object-contain block filter contrast-125 saturate-110 drop-shadow-xs mix-blend-multiply max-w-full w-40 h-7 transition-transform duration-75 group-hover:scale-102 rounded-xs"
                              />
                            </div>
                          ) : (
                            <div className="bg-black/5 border border-black/20 rounded-xs flex items-center justify-center font-sans font-black text-black/60 tracking-widest w-full h-7 shadow-inner text-[13px]">
                              {team.abbr}
                            </div>
                          )}
                        </td>

                        <td className="text-center font-mono select-none py-1 px-1 align-middle">
                          {team.clinch ? (
                            <span className="inline-block bg-blue-600 text-white font-mono text-[10px] px-2 py-0.5 rounded-sm font-black tracking-wider uppercase shadow-xs">
                              {team.clinch}
                            </span>
                          ) : (
                            <span className="text-gray-200 font-normal font-mono">-</span>
                          )}
                        </td>

                        {/* Elimination Number Content Cell */}
                        <td className="text-center font-mono select-none py-1 px-1 align-middle">
                          {eNumber !== null ? (
                            eNumber === 0 ? (
                              <span className="inline-block bg-red-100 text-red-700 font-mono text-[10px] px-1.5 py-0.5 rounded-xs font-black tracking-wide uppercase">
                                Elim
                              </span>
                            ) : (
                              <span className="text-red-600 font-black font-mono text-[11px]">{eNumber}</span>
                            )
                          ) : (
                            <span className="text-gray-200 font-normal font-mono">-</span>
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
                        <td className={`text-center font-mono font-black py-1 px-1 align-middle ${team.streak?.startsWith('W') ? 'text-emerald-600' : team.streak?.startsWith('L') ? 'text-rose-600' : 'text-gray-400'}`}>{team.streak}</td>
                        <td className="text-center font-mono text-gray-400 font-normal py-1 px-1 align-middle">{team.l10}</td>
                      </tr>

                      {/* Clean Solid Dashed Playoff Border Line Injection Point */}
                      {isPlayoffBoundaryLine && (
                        <tr key={`cutoff-${team.season_id}-${index}`} className="bg-red-50/40 border-b-2 border-dashed border-red-400/70 select-none">
                          <td colSpan={colSpanCount} className="p-1 text-center font-sans font-black tracking-widest text-[9px] text-red-700/80 uppercase align-middle">
                            ✂️ Playoff Cutoff Line Above • Postseason Bracket Limit
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
              <p><strong>PTS</strong> Points (Win = 2, Tie = 1)</p> <p><strong>+/-</strong> Goal Differential</p>
              <p><strong>HOME / AWAY</strong> Split Venue Records</p> <p><strong>OTW / OTL</strong> Overtime Wins / Losses</p>
              <p><strong>STRK</strong> Active Hot/Cold Streak</p> <p><strong>L10</strong> Record Over Past 10 Matchups</p>
              <p><strong>E #</strong> Elimination Number (Points needed to mathematically lock out from playoffs)</p>
            </div>
          </div>

          <div>
            <h3 className="font-black uppercase text-sm mb-4">Clinch Watch (Top 5)</h3>
            <div className="bg-white border border-gray-300 p-4 text-[12px] font-sans font-bold">
              {loading ? (
                <div className="text-center py-2 opacity-40 uppercase text-[10px] tracking-wider">Evaluating positions...</div>
              ) : topFiveClinch.map((team: any, i: number) => (
                <div key={i} className="flex justify-between border-b border-gray-100 py-1.5 last:border-0 items-center">
                  <span className="font-serif font-black text-[13px]">{team.name}</span>
                  <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded-sm ${team.mn.toString().includes('Clinched') ? 'text-emerald-700 bg-emerald-50 font-black' : 'text-blue-600 bg-blue-50'}`}>
                    {typeof team.mn === 'number' ? `Magic #: ${team.mn}` : team.mn}
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