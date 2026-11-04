"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Flame, TrendingUp, TrendingDown, Minus, Calendar, Search, Trophy, ShieldAlert, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getTeamBannerUrls, extractGamesPerTeam, extractPlayoffTeams } from '@/app/standings/page';

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

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Computes the Monday Morning (8:00 AM ET) edition anchor date and next Monday update timestamp.
 */
function getMondayEditionInfo(now = new Date()) {
  // Convert current time to America/New_York parts
  const etParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const partMap: Record<string, string> = {};
  etParts.forEach((p) => {
    partMap[p.type] = p.value;
  });

  const year = parseInt(partMap.year || '2026', 10);
  const month = parseInt(partMap.month || '1', 10);
  const day = parseInt(partMap.day || '1', 10);
  const hour = parseInt(partMap.hour || '0', 10);
  const weekdayStr = partMap.weekday || 'Mon';

  const dayIndexMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dow = dayIndexMap[weekdayStr] ?? 1;

  // Days since most recent Monday 8:00 AM ET
  let daysSinceMonday = (dow + 6) % 7; // Mon=0, Tue=1, ..., Sun=6
  if (dow === 1 && hour < 8) {
    // Before 8:00 AM ET on Monday -> still showing previous Monday's edition
    daysSinceMonday = 7;
  }

  const editionDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  editionDate.setUTCDate(editionDate.getUTCDate() - daysSinceMonday);

  const nextMondayDate = new Date(editionDate.getTime());
  nextMondayDate.setUTCDate(nextMondayDate.getUTCDate() + 7);

  const editionKey = editionDate.toISOString().slice(0, 10); // YYYY-MM-DD (Monday)
  const editionDisplay = editionDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const nextEditionDisplay = nextMondayDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

  return {
    editionKey,
    editionDisplay,
    nextEditionDisplay,
  };
}

interface RankedTeam {
  team_id: number;
  name: string;
  abbr: string;
  coach_name: string;
  logo_url: string | null;
  banner_url: string | null;
  fallback_urls: string[];
  gp: number;
  wins: number;
  losses: number;
  ties: number;
  otWins: number;
  otLosses: number;
  pts: number;
  gf: number;
  ga: number;
  gd: number;
  streak: string;
  l10: string;
  l10Wins: number;
  l10Losses: number;
  standingsSeed: number;
  powerRank: number;
  prevRank: number;
  rankDelta: number;
  powerScore: number;
  tier: 'WAGON ALERT' | 'CONTENDER' | 'CHAOS BUBBLE' | 'COACH ON HOT SEAT' | 'BASEMENT DWELLER';
  recapHeadline: string;
  recapBody: string;
  coachQuote: string;
}

function generateFunnyCoachTeamRecap(
  team: {
    team_id: number;
    name: string;
    abbr: string;
    coach_name: string;
    gp: number;
    wins: number;
    losses: number;
    ties: number;
    otWins: number;
    otLosses: number;
    pts: number;
    gf: number;
    ga: number;
    gd: number;
    streak: string;
    l10: string;
    l10Wins: number;
    powerRank: number;
    totalTeams: number;
  },
  editionKey: string,
  seasonName: string
): { headline: string; body: string; coachQuote: string } {
  const coach = team.coach_name && team.coach_name !== 'Unassigned' ? team.coach_name : `Coach ${team.abbr}`;
  const club = team.name || team.abbr;
  const abbr = team.abbr || 'CLUB';
  const gpg = team.gp > 0 ? (team.gf / team.gp).toFixed(2) : '0.00';
  const gapg = team.gp > 0 ? (team.ga / team.gp).toFixed(2) : '0.00';
  const gdStr = team.gd > 0 ? `+${team.gd}` : `${team.gd}`;
  const recordStr = `${team.wins}-${team.losses}-${team.ties}`;
  const seed = hashSeed(`${editionKey}:${seasonName}:${team.team_id}:${team.powerRank}`);

  const isTopTier = team.powerRank <= Math.max(3, Math.ceil(team.totalTeams * 0.2));
  const isUpperMid = !isTopTier && team.powerRank <= Math.ceil(team.totalTeams * 0.5);
  const isBubble = !isTopTier && !isUpperMid && team.powerRank <= Math.ceil(team.totalTeams * 0.78);

  // Pool of funny headlines by tier
  const topHeadlines = [
    `${coach.toUpperCase()} HAS ${club.toUpperCase()} OPERATING LIKE A 16-BIT DEATH STAR`,
    `LEAGUE INVESTIGATING ${coach.toUpperCase()} FOR SMUGGLING GAME GENIE CODES INTO ${abbr} BENCH`,
    `${club.toUpperCase()} (${recordStr}) REFUSING TO LET ANYONE ELSE HAVE FUN THIS WEEK`,
    `${coach.toUpperCase()} SPOTTED MEASURE-FITTING CHAMPIONSHIP RINGS IN THE SECOND PERIOD`,
    `OPPONENTS DEMAND DRUG TEST FOR ${club.toUpperCase()} AFTER ${gdStr} GOAL DIFFERENTIAL SURGE`,
    `${coach.toUpperCase()} TURNS ${club.toUpperCase()} INTO AN UNSTOPPABLE ONE-TIMER FACTORY`,
  ];

  const midHeadlines = [
    `${coach.toUpperCase()} & ${club.toUpperCase()} RIDING PURE VIBES AND CAFFEINE AT #${team.powerRank}`,
    `NOBODY KNOWS WHICH ${club.toUpperCase()} TEAM WILL SHOW UP—ESPECIALLY ${coach.toUpperCase()}`,
    `${coach.toUpperCase()} INSISTS ${club.toUpperCase()} IS "PEAKING AT THE EXACT RIGHT TIME"`,
    `BLOOD PRESSURE MONITORS MANDATORY ON THE ${club.toUpperCase()} BENCH THIS WEEK`,
    `${club.toUpperCase()} (${recordStr}) ALTERNATING BETWEEN MASTERPIECE HOCKEY AND TOTAL CARNAGE`,
    `${coach.toUpperCase()} RUNNING THE "SCORE ${gpg} AND PRAY" SYSTEM TO PERFECTION`,
  ];

  const bubbleHeadlines = [
    `${coach.toUpperCase()} SWEARING AT THE SEGA CONTROLLER AS ${club.toUpperCase()} LIVES ON THE EDGE`,
    `${club.toUpperCase()} GOALIE FILED FOR HAZARD PAY AFTER ALLOWING ${gapg} GOALS A NIGHT`,
    `${coach.toUpperCase()} CLAIMS ${abbr}'S ${recordStr} RECORD IS "JUST ROPE-A-DOPE FOR THE PLAYOFFS"`,
    `CHAOS REIGNS IN ${club.toUpperCase()} LOCKER ROOM AS ${coach.toUpperCase()} SHUFFLES LINES AGAIN`,
    `${club.toUpperCase()} KEEPING PLAYOFF HOPES ALIVE WITH DUCT TAPE, HEART, AND LATE POKE CHECKS`,
    `${coach.toUpperCase()} BLAMES ICE TILT, WIFI, AND MERCURY IN RETROGRADE FOR ${abbr} SLUMP`,
  ];

  const bottomHeadlines = [
    `${coach.toUpperCase()} ALREADY SCOUTING NEXT SEASON'S DRAFT CLASS FROM THE ${abbr} BENCH`,
    `${club.toUpperCase()} DEFENSE CURRENTLY OPTIONAL AS ${coach.toUpperCase()} EMBRACES FULL TANK COMMANDER MODE`,
    `LOCAL FIRE MARSHAL CALLED TO PUT OUT THE DUMPSTER FIRE BEHIND ${coach.toUpperCase()}'S BENCH`,
    `${club.toUpperCase()} (${recordStr}) PLAYING LIKE THEIR CONTROLLERS ARE UNPLUGGED IN THE 3RD`,
    `${coach.toUpperCase()} PROMISES REBUILD IS "ONLY 14 TRADES AWAY" FOR ${club.toUpperCase()}`,
    `FANS IN ${club.toUpperCase()} WEARING PAPER BAGS WHILE ${coach.toUpperCase()} DRAWS PLAYS ON A NAPKIN`,
  ];

  // Funny body paragraphs combining real stats + coach personality
  const topBodies = [
    `Sitting pretty at #${team.powerRank} overall with a ${recordStr} mark (${team.pts} PTS) and a filthy ${gdStr} goal differential, ${coach} has ${club} playing like they taped down the B-button and bribed the Sega Genesis referees. Averaging ${gpg} goals per game while only surrendering ${gapg}, ${abbr} (${team.l10} in their last 10, ${team.streak} streak) isn't just beating teams—they're making opposing coaches contemplate retirement mid-second period.`,
    `At ${recordStr} (${team.pts} PTS), ${coach} is strutting around the ${club} locker room in a velvet tracksuit like Scotty Bowman with a turbo controller. ${abbr} has pumped in ${team.gf} goals against just ${team.ga} allowed (${gdStr} diff), going ${team.l10} over their last 10. Rumor has it ${coach} doesn't even call timeouts anymore—just stares into the webcam until the other guy pulls his goalie.`,
    `There is wagon status, and then whatever ${coach} is cooking up with ${club} right now. Posting ${team.pts} points (${recordStr}) with ${team.gf} goals for (${gpg}/gm) and a ${team.streak} run, ${abbr} has turned every home game into a track meet. Opposing defensemen are reportedly faking controller disconnects rather than face ${coach}'s forecheck.`,
    `${coach} has ${club} humming at #${team.powerRank} on the board (${recordStr}, ${team.pts} PTS, ${gdStr} GD). Between lighting the lamp ${team.gf} times and clamping down to ${gapg} GA/G, the only thing slowing ${abbr} down is waiting for terrified opponents to answer their pings in Discord.`,
  ];

  const midBodies = [
    `${coach}'s ${club} squad checks in at #${team.powerRank} with a ${recordStr} record (${team.pts} PTS, ${gdStr} GD) and a ${team.l10} mark over the last 10. One night ${abbr} looks like a Brule Cup lock scoring ${gpg} goals a game; the next night they're giving up breakaways like free samples at Costco. Still, nobody in the bracket wants to draw ${coach} in a 7-game rock fight.`,
    `Holding down the #${team.powerRank} spot at ${recordStr} (${team.pts} PTS), ${coach} has ${club} playing high-event, heart-attack 95 hockey. With ${team.gf} goals scored and ${team.ga} allowed (${gdStr}), every ${abbr} broadcast requires a cardiologist on standby. ${coach} swears the defensive breakdowns are "just baiting them into a false sense of security."`,
    `At ${recordStr} (${team.pts} PTS) and riding a ${team.streak} streak, ${club} is the ultimate wild card under ${coach}. Averaging ${gpg} GF/G against ${gapg} GA/G, ${abbr} can beat the #1 seed by four at 11:00 PM and then lose a barnburner to a lottery team at 11:20 PM. Pure box-office entertainment.`,
    `${coach} has guided ${club} to ${team.pts} points (${recordStr}, ${team.l10} L10) through sheer stubbornness and manual-goalie gymnastics. With a ${gdStr} goal differential and ${team.otWins} overtime wins, ${abbr} refuses to play a normal, stress-free 15-minute game.`,
  ];

  const bubbleBodies = [
    `Ranked #${team.powerRank} this Monday at ${recordStr} (${team.pts} PTS, ${gdStr} GD), ${coach} has been spotted pacing the ${club} press box muttering about passing accuracy and phantom tripping calls. Allowing ${gapg} goals a game while going ${team.l10} over their last 10 has ${abbr} white-knuckling the playoff cutline, though ${coach} insists a 6-game heater is imminent.`,
    `Life on the bubble is aging ${coach} in dog years. ${club} sits at ${recordStr} (${team.pts} PTS) with ${team.gf} GF and ${team.ga} GA (${gdStr} diff) and a ${team.streak} streak. The offense (${gpg} GF/G) shows flashes of brilliance, right before the defense parts like the Red Sea and leaves the goalie stranded on an island.`,
    `${coach} and ${club} (#${team.powerRank}, ${recordStr}, ${team.pts} PTS) are treating every regular-season game like Game 7 overtime—mostly because they have to. With ${team.ga} goals against (${gapg}/gm) and a ${team.l10} last-10 clip, ${abbr} is one hot goalie week away from climbing the ladder or one bad bounce away from throwing a CRT television out the window.`,
    `Checking in at #${team.powerRank} (${recordStr}, ${gdStr} GD), ${club} has tested every ounce of ${coach}'s patience. Sources inside the arena say ${coach} blew his voice out yelling "CLEAR THE PUCK" during their ${team.l10} recent stretch, yet ${abbr} remains dangerously within striking distance.`,
  ];

  const bottomBodies = [
    `It has been a long, character-building campaign for ${coach} and ${club} (#${team.powerRank}, ${recordStr}, ${team.pts} PTS). With a ${gdStr} goal differential (${gpg} GF/G vs. ${gapg} GA/G) and a ${team.l10} mark in their last 10, the ${abbr} defense has been accused of practicing social distancing in the slot. On the bright side, ${coach} leads the league in post-game comedic relief.`,
    `At ${recordStr} (${team.pts} PTS, ${gdStr} GD), ${coach} has officially entered the philosophical phase of the ${club} season. Giving up ${team.ga} goals (${gapg}/gm) while riding a ${team.streak} streak would break lesser managers, but ${coach} is still showing up,talking trash in Discord, and threatening to ruin somebody's playoff seeding out of pure spite.`,
    `${club} checks in at #${team.powerRank} (${recordStr}, ${team.pts} PTS) after another week where the scoreboard operator got carpal tunnel syndrome from logging ${team.ga} goals against. Rumor has it ${coach} tried to trade the team bus for a 90-speed winger and a six-pack, but the Commissioner vetoed it.`,
    `Sitting at #${team.powerRank} with a ${recordStr} record and ${gdStr} differential, ${coach}'s ${club} squad is playing spoiler—mostly to their own goalies' save percentages (${gapg} GA/G). Still, any contender who sleeps on ${coach} and ${abbr} is asking to get embarrassed on a Tuesday night.`,
  ];

  const topQuotes = [
    `"Tell the rest of the league to keep practicing in Exhibition Mode." — ${coach}`,
    `"We don't play defense, we just keep the puck in their net for 15 minutes." — ${coach}`,
    `"My thumb has a callus the size of a hockey puck and I regret nothing." — ${coach}`,
    `"If we lose a game this week, the ROM was obviously corrupted." — ${coach}`,
  ];

  const midQuotes = [
    `"Are we a wagon or a rollercoaster? Yes." — ${coach}`,
    `"Our system is simple: chaotic neutral forechecking and vibes." — ${coach}`,
    `"Wait until my guys figure out which button passes to the open man." — ${coach}`,
    `"We're exactly where we want to be—nobody can scout us if we don't know what we're doing either." — ${coach}`,
  ];

  const bubbleQuotes = [
    `"One bounce goes our way and we're winning the Cup. Ignore the goal differential." — ${coach}`,
    `"My goalie owes me a new controller after that last third period." — ${coach}`,
    `"Ice tilt is real and I have a 40-page slideshow to prove it." — ${coach}`,
    `"Nobody wants to see ${abbr} in Round 1. Especially my cardiologist." — ${coach}`,
  ];

  const bottomQuotes = [
    `"We have them right where we want them—completely overconfident." — ${coach}`,
    `"I'm not tanking, I'm conducting an advanced defensive stress test." — ${coach}`,
    `"Next week starts the 20-game winning streak. Put it on the board." — ${coach}`,
    `"At least the arena nachos are still undefeated." — ${coach}`,
  ];

  const headlines = isTopTier
    ? topHeadlines
    : isUpperMid
    ? midHeadlines
    : isBubble
    ? bubbleHeadlines
    : bottomHeadlines;
  const bodies = isTopTier
    ? topBodies
    : isUpperMid
    ? midBodies
    : isBubble
    ? bubbleBodies
    : bottomBodies;
  const quotes = isTopTier
    ? topQuotes
    : isUpperMid
    ? midQuotes
    : isBubble
    ? bubbleQuotes
    : bottomQuotes;

  return {
    headline: headlines[seed % headlines.length],
    body: bodies[(seed >>> 3) % bodies.length],
    coachQuote: quotes[(seed >>> 6) % quotes.length],
  };
}

export default function PowerRankingsPage() {
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedLeagueType, setSelectedLeagueType] = useState<string>('ALL');
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('');
  const [rankings, setRankings] = useState<RankedTeam[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const editionInfo = useMemo(() => getMondayEditionInfo(new Date()), []);

  useEffect(() => {
    const fetchActiveSeasons = async () => {
      let data: any = null;
      try {
        const res1 = await supabase.from('leagues').select('*');
        if (!res1.error && res1.data && res1.data.length > 0) data = res1.data;
      } catch {}

      if (!data || data.length === 0) {
        try {
          const res2 = await supabase.from('league_seasons').select('*');
          if (!res2.error && res2.data && res2.data.length > 0) data = res2.data;
        } catch {}
      }

      if (!data || data.length === 0) {
        const fallback = [{ league_id: '40', league_name: 'W18', games_per_team: 56, playoff_teams: 16 }];
        setSeasons(fallback);
        setSelectedLeagueId('40');
        return;
      }

      const formattedList = data
        .map((row: any) => {
          const lId = row.league_id !== undefined ? row.league_id : row.id || row.season_id;
          const dynamicName = row.league_name || row.name || row.season_name || `Season ${lId}`;
          return {
            id: row.id,
            league_id: String(lId).trim(),
            league_name: String(dynamicName).trim(),
            games_per_team: extractGamesPerTeam(row),
            playoff_teams: extractPlayoffTeams(row) || null,
          };
        })
        .sort((a: any, b: any) => Number(b.league_id) - Number(a.league_id));

      const loadedSeasonIds = new Set<string>();
      try {
        const [standingsSeasonsRes, statsSeasonsRes] = await Promise.all([
          supabase.from('league_standings').select('season_id'),
          supabase.from('league_gamestats').select('league_id'),
        ]);
        (standingsSeasonsRes.data || []).forEach((r: any) => {
          if (r.season_id != null) loadedSeasonIds.add(String(r.season_id).trim());
        });
        (statsSeasonsRes.data || []).forEach((r: any) => {
          if (r.league_id != null) loadedSeasonIds.add(String(r.league_id).trim());
        });
      } catch {}

      const activeSeasonsList = formattedList.filter((s: any) => {
        const idNum = Number(s.league_id);
        if (idNum <= 40) return true;
        return loadedSeasonIds.has(String(s.league_id));
      });

      setSeasons(activeSeasonsList);
      if (activeSeasonsList.length > 0) {
        setSelectedLeagueId(activeSeasonsList[0].league_id);
      }
    };

    fetchActiveSeasons();
  }, []);

  const filteredSeasons = useMemo(() => {
    if (selectedLeagueType === 'ALL') return seasons;
    return seasons.filter((s) => getLeaguePrefix(s) === selectedLeagueType);
  }, [seasons, selectedLeagueType]);

  const handleLeagueTypeChange = (type: string) => {
    setSelectedLeagueType(type);
    const list = type === 'ALL' ? seasons : seasons.filter((s) => getLeaguePrefix(s) === type);
    if (list.length > 0) {
      setSelectedLeagueId(String(list[0].league_id));
    }
  };

  useEffect(() => {
    if (!selectedLeagueId) return;
    loadPowerRankings(selectedLeagueId);
  }, [selectedLeagueId, seasons]);

  const loadPowerRankings = async (leagueId: string | number) => {
    setLoading(true);
    const numericLeagueId = parseInt(String(leagueId).replace(/\D/g, ''), 10) || 40;
    const matchedSeason = seasons.find((s) => String(s.league_id) === String(numericLeagueId));
    const seasonName = matchedSeason?.league_name || `Season ${numericLeagueId}`;

    const [schedRes, statsRes, teamsRes, standingsRes, coachesRes] = await Promise.all([
      supabase
        .from('league_schedule')
        .select('game_id, home_team_id, away_team_id, played, league_id, home_score, away_score, game_meta')
        .eq('league_id', numericLeagueId)
        .order('game_id', { ascending: true }),
      supabase
        .from('league_gamestats')
        .select('game_id, home_score, away_score, game_meta, league_id, home_team_id, away_team_id, home_stats, away_stats')
        .eq('league_id', numericLeagueId),
      supabase
        .from('league_teams')
        .select('team_id, team_name, abbreviation, conference, division, league_id, banner_filename, logo_url, coach_id'),
      supabase.from('league_standings').select('*').eq('season_id', numericLeagueId),
      supabase.from('league_coaches').select('coach_id, coach_name'),
    ]);

    const allScheduleData = schedRes.data || [];
    const statsData = statsRes.data || [];
    const allTeamsData = teamsRes.data || [];
    const standardData = standingsRes.data || [];
    const allCoaches = coachesRes.data || [];

    const coachMap = new Map<number, string>();
    allCoaches.forEach((c: any) => {
      if (c.coach_id != null && c.coach_name) {
        coachMap.set(Number(c.coach_id), String(c.coach_name).trim());
      }
    });

    const baseTeamMap: Record<number, any> = {};
    allTeamsData.forEach((t: any) => {
      const tId = Number(t.team_id);
      const existing = baseTeamMap[tId];
      if (!existing || Number(t.league_id) === numericLeagueId) {
        const { primaryUrl, fallbackUrls } = getTeamBannerUrls(t, numericLeagueId);
        const cId = Number(t.coach_id || 0);
        baseTeamMap[tId] = {
          id: tId,
          name: t.team_name || `Team ${tId}`,
          abbr: t.abbreviation || `TM${tId}`,
          logo_url: t.logo_url || null,
          banner_url: primaryUrl,
          fallback_urls: fallbackUrls,
          coach_name: (cId && coachMap.get(cId)) || 'Unassigned',
        };
      }
    });

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
    standardData.forEach((s: any) => {
      const tId = Number(s.team_id);
      if (tId && tId !== 999 && tId !== 0 && tId !== 68) activeTeamIds.add(tId);
    });

    activeTeamIds.forEach((tId) => {
      const meta = baseTeamMap[tId] || {
        id: tId,
        name: `Club #${tId}`,
        abbr: `TM${tId}`,
        logo_url: null,
        banner_url: null,
        fallback_urls: [],
        coach_name: 'Unassigned',
      };
      teamMap[tId] = {
        ...meta,
        team_id: tId,
        gp: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        pts: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        otWins: 0,
        otLosses: 0,
        history: [] as ('W' | 'L' | 'T' | 'OTL')[],
      };
    });

    const statsMap = new Map<number, any>();
    statsData.forEach((st: any) => {
      statsMap.set(Number(st.game_id), st);
    });

    const recordGameResult = (
      hId: number,
      aId: number,
      hScore: number,
      aScore: number,
      isOT: boolean
    ) => {
      const home = teamMap[hId];
      const away = teamMap[aId];
      if (home) {
        home.gp += 1;
        home.gf += hScore;
        home.ga += aScore;
      }
      if (away) {
        away.gp += 1;
        away.gf += aScore;
        away.ga += hScore;
      }

      if (hScore > aScore) {
        if (home) {
          home.wins += 1;
          home.pts += 2;
          if (isOT) home.otWins += 1;
          home.history.push('W');
        }
        if (away) {
          if (isOT) {
            away.otLosses += 1;
            away.losses += 1;
            away.pts += 1;
            away.history.push('OTL');
          } else {
            away.losses += 1;
            away.history.push('L');
          }
        }
      } else if (aScore > hScore) {
        if (away) {
          away.wins += 1;
          away.pts += 2;
          if (isOT) away.otWins += 1;
          away.history.push('W');
        }
        if (home) {
          if (isOT) {
            home.otLosses += 1;
            home.losses += 1;
            home.pts += 1;
            home.history.push('OTL');
          } else {
            home.losses += 1;
            home.history.push('L');
          }
        }
      } else {
        if (home) {
          home.ties += 1;
          home.pts += 1;
          home.history.push('T');
        }
        if (away) {
          away.ties += 1;
          away.pts += 1;
          away.history.push('T');
        }
      }
    };

    const processedStatsIds = new Set<number>();

    allScheduleData.forEach((game: any) => {
      const gId = Number(game.game_id);
      const st = statsMap.get(gId);
      const rawPlayed = String(game.played || '').trim().toLowerCase();
      const isMarkedPlayed = rawPlayed === 'true' || rawPlayed === '1' || rawPlayed === 'y';
      if (!isMarkedPlayed && !st) return;

      let meta: any = {};
      const rawMeta = st?.game_meta || game.game_meta;
      if (rawMeta) {
        try {
          meta = typeof rawMeta === 'string' ? JSON.parse(rawMeta) : rawMeta;
        } catch {}
      }
      if (meta.is_playoff === true || meta.is_playoff === 'true' || meta.game_type === 'playoff') {
        if (st) processedStatsIds.add(gId);
        return;
      }

      const hScore = Number(st?.home_score ?? game.home_score ?? 0);
      const aScore = Number(st?.away_score ?? game.away_score ?? 0);
      if (!st && hScore === 0 && aScore === 0) return;

      const isOT = Boolean(meta.is_ot || Number(meta.ot_Winner) > 0 || Number(meta.ot_winner) > 0);
      if (st) processedStatsIds.add(gId);
      recordGameResult(Number(game.home_team_id), Number(game.away_team_id), hScore, aScore, isOT);
    });

    statsData.forEach((st: any) => {
      const gId = Number(st.game_id);
      if (processedStatsIds.has(gId)) return;
      let meta: any = {};
      if (st.game_meta) {
        try {
          meta = typeof st.game_meta === 'string' ? JSON.parse(st.game_meta) : st.game_meta;
        } catch {}
      }
      if (meta.is_playoff === true || meta.is_playoff === 'true' || meta.game_type === 'playoff') return;
      const isOT = Boolean(meta.is_ot || Number(meta.ot_Winner) > 0 || Number(meta.ot_winner) > 0);
      recordGameResult(Number(st.home_team_id), Number(st.away_team_id), Number(st.home_score || 0), Number(st.away_score || 0), isOT);
    });

    let rawList = Object.values(teamMap).filter((t: any) => t.gp > 0);

    // Fallback to league_standings rows if no individual game rows
    if (rawList.length === 0 && standardData.length > 0) {
      rawList = standardData.map((row: any) => {
        const tId = Number(row.team_id);
        const meta = baseTeamMap[tId] || {
          id: tId,
          name: `Club #${tId}`,
          abbr: `TM${tId}`,
          logo_url: null,
          banner_url: null,
          fallback_urls: [],
          coach_name: 'Unassigned',
        };
        return {
          ...meta,
          team_id: tId,
          gp: Number(row.gp || 0),
          wins: Number(row.w || 0),
          losses: Number(row.l || 0),
          ties: Number(row.t || 0),
          pts: Number(row.pts || 0),
          gf: Number(row.gf || 0),
          ga: Number(row.ga || 0),
          gd: Number(row.gd ?? Number(row.gf || 0) - Number(row.ga || 0)),
          otWins: Number(row.otw || 0),
          otLosses: Number(row.otl || 0),
          streak: row.strk || '-',
          l10: row.l10 || '0-0-0',
          history: [],
        };
      });
    }

    // Compute streak, L10, and standings seed
    const processed = rawList.map((t: any) => {
      const gd = t.gf - t.ga;
      let streak = t.streak || '-';
      let l10 = t.l10 || '0-0-0';
      let l10Wins = 0;
      let l10Losses = 0;

      if (Array.isArray(t.history) && t.history.length > 0) {
        const last10 = t.history.slice(-10);
        l10Wins = last10.filter((r: string) => r === 'W').length;
        const l10RegL = last10.filter((r: string) => r === 'L').length;
        const l10T = last10.filter((r: string) => r === 'T').length;
        const l10Otl = last10.filter((r: string) => r === 'OTL').length;
        l10Losses = l10RegL + l10Otl;
        l10 = l10Otl > 0 ? `${l10Wins}-${l10RegL}-${l10T}-${l10Otl}` : `${l10Wins}-${l10RegL}-${l10T}`;

        let sCount = 0;
        const lastRes = t.history[t.history.length - 1];
        for (let i = t.history.length - 1; i >= 0; i--) {
          if (t.history[i] === lastRes) sCount++;
          else break;
        }
        streak = `${lastRes}${sCount}`;
      } else if (typeof l10 === 'string') {
        const parts = l10.split('-').map((n: string) => parseInt(n, 10) || 0);
        l10Wins = parts[0] || 0;
        l10Losses = parts[1] || 0;
      }

      // Power Score: blends Points %, Goal Diff per game, L10 momentum, and current streak
      const ptsPct = t.gp > 0 ? t.pts / (t.gp * 2) : 0;
      const gdPerGame = t.gp > 0 ? gd / t.gp : 0;
      const l10Pct = l10Wins + l10Losses > 0 ? l10Wins / Math.min(10, Math.max(1, t.gp)) : ptsPct;
      const streakBonus = streak.startsWith('W')
        ? Math.min(6, parseInt(streak.slice(1), 10) || 1) * 1.15
        : streak.startsWith('L')
        ? -Math.min(6, parseInt(streak.slice(1), 10) || 1) * 1.05
        : 0;

      const rawPowerScore = ptsPct * 68 + l10Pct * 20 + gdPerGame * 4.5 + streakBonus;
      const powerScore = Math.max(10, Math.min(99.9, Number(rawPowerScore.toFixed(1))));

      return {
        ...t,
        gd,
        streak,
        l10,
        l10Wins,
        l10Losses,
        powerScore,
      };
    });

    // Determine official standings seed first
    const byStandings = [...processed].sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.gd - a.gd;
    });
    const standingsSeedMap = new Map<number, number>();
    byStandings.forEach((t, idx) => standingsSeedMap.set(t.team_id, idx + 1));

    // Sort by Power Score descending for Monday Power Rankings
    const byPower = [...processed].sort((a, b) => {
      if (b.powerScore !== a.powerScore) return b.powerScore - a.powerScore;
      if (b.pts !== a.pts) return b.pts - a.pts;
      return b.gd - a.gd;
    });

    const totalTeams = byPower.length;
    const finalRanked: RankedTeam[] = byPower.map((t, idx) => {
      const powerRank = idx + 1;
      const standingsSeed = standingsSeedMap.get(t.team_id) || powerRank;
      // Previous Monday rank comparisons: blends standings seed difference with deterministic Monday delta
      const seedNoise = ((hashSeed(`${editionInfo.editionKey}:${t.team_id}`) % 3) - 1);
      const prevRank = Math.max(1, Math.min(totalTeams, standingsSeed + seedNoise));
      const rankDelta = prevRank - powerRank;

      let tier: RankedTeam['tier'] = 'CONTENDER';
      if (powerRank <= Math.max(3, Math.ceil(totalTeams * 0.18))) {
        tier = 'WAGON ALERT';
      } else if (powerRank <= Math.ceil(totalTeams * 0.45)) {
        tier = 'CONTENDER';
      } else if (powerRank <= Math.ceil(totalTeams * 0.72)) {
        tier = 'CHAOS BUBBLE';
      } else if (powerRank <= Math.ceil(totalTeams * 0.88)) {
        tier = 'COACH ON HOT SEAT';
      } else {
        tier = 'BASEMENT DWELLER';
      }

      const recap = generateFunnyCoachTeamRecap(
        {
          ...t,
          powerRank,
          totalTeams,
        },
        editionInfo.editionKey,
        seasonName
      );

      return {
        ...t,
        standingsSeed,
        powerRank,
        prevRank,
        rankDelta,
        tier,
        recapHeadline: recap.headline,
        recapBody: recap.body,
        coachQuote: recap.coachQuote,
      };
    });

    setRankings(finalRanked);
    setLoading(false);
  };

  const visibleRankings = useMemo(() => {
    if (!searchQuery.trim()) return rankings;
    const q = searchQuery.toLowerCase();
    return rankings.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.abbr.toLowerCase().includes(q) ||
        r.coach_name.toLowerCase().includes(q) ||
        r.tier.toLowerCase().includes(q)
    );
  }, [rankings, searchQuery]);

  const currentSeasonObj = seasons.find((s) => String(s.league_id) === String(selectedLeagueId));

  const getTierBadgeStyle = (tier: RankedTeam['tier']) => {
    switch (tier) {
      case 'WAGON ALERT':
        return 'bg-amber-400 text-black border-black';
      case 'CONTENDER':
        return 'bg-emerald-700 text-white border-black';
      case 'CHAOS BUBBLE':
        return 'bg-blue-800 text-white border-black';
      case 'COACH ON HOT SEAT':
        return 'bg-orange-600 text-white border-black';
      case 'BASEMENT DWELLER':
        return 'bg-red-800 text-white border-black';
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-black font-serif p-2 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Masthead Header */}
        <header className="border-b-4 border-black pb-4 mb-5 text-center">
          <div className="inline-flex items-center gap-2 bg-black text-amber-400 px-3 py-1 text-[10px] sm:text-xs font-sans font-black uppercase tracking-widest mb-2 border border-black">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>NHL95 Gazette Weekly Roast & Power Poll</span>
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tighter">
            Monday Power Rankings
          </h1>
          <p className="text-xs sm:text-sm italic text-neutral-700 mt-1">
            Official Weekly Coach & Club Inspection — Published Every Monday Morning at 8:00 AM ET
          </p>

          {/* Edition Status Strip */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-[11px] sm:text-xs font-sans font-bold uppercase tracking-wider">
            <span className="bg-black text-white px-3 py-1 border border-black flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>MONDAY EDITION: {editionInfo.editionDisplay}</span>
            </span>
            <span className="bg-amber-400/30 text-black px-3 py-1 border border-black flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-800" />
              <span>NEXT AUTO-UPDATE: MONDAY, {editionInfo.nextEditionDisplay} (8:00 AM ET)</span>
            </span>
          </div>
        </header>

        {/* Controls Bar: League Filter, Season Dropdown, Search */}
        <div className="bg-[#ece8de] border-2 border-black p-3 mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 font-sans">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center border border-black bg-white">
              {['ALL', 'W', 'Q', 'O', 'V', 'G'].map((type) => (
                <button
                  key={type}
                  onClick={() => handleLeagueTypeChange(type)}
                  className={`px-2.5 py-1 text-xs font-black uppercase transition cursor-pointer ${
                    selectedLeagueType === type
                      ? 'bg-black text-white'
                      : 'text-black hover:bg-black/10'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-neutral-700">
                SEASON:
              </span>
              <select
                value={selectedLeagueId}
                onChange={(e) => setSelectedLeagueId(e.target.value)}
                className="bg-white border border-black px-2.5 py-1 text-xs font-black uppercase outline-none cursor-pointer"
              >
                {filteredSeasons.map((s) => (
                  <option key={s.league_id} value={s.league_id}>
                    {s.league_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search team, coach, or tier..."
              className="w-full bg-white border border-black pl-8 pr-3 py-1 text-xs font-bold outline-none"
            />
          </div>
        </div>

        {/* Rankings List */}
        {loading ? (
          <div className="border-2 border-black bg-white p-12 text-center font-sans font-bold uppercase tracking-widest text-sm animate-pulse">
            Compiling Monday Morning Coach Roasts & Power Index...
          </div>
        ) : visibleRankings.length === 0 ? (
          <div className="border-2 border-black bg-white p-12 text-center font-sans font-bold uppercase tracking-widest text-sm text-neutral-600">
            No teams matched your filter for {currentSeasonObj?.league_name || 'this season'}.
          </div>
        ) : (
          <div className="space-y-4">
            {visibleRankings.map((team) => {
              const isTop3 = team.powerRank <= 3;
              return (
                <article
                  key={team.team_id}
                  className={`border-2 border-black bg-[#fdfaf3] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition hover:translate-x-[1px] hover:translate-y-[1px] ${
                    isTop3 ? 'ring-2 ring-amber-500/60' : ''
                  }`}
                >
                  {/* Top Bar of Card */}
                  <div className="bg-black text-white px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 font-sans">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <span
                        className={`inline-flex items-center justify-center min-w-[36px] h-8 px-2 font-black text-base sm:text-lg border ${
                          team.powerRank === 1
                            ? 'bg-amber-400 text-black border-amber-300'
                            : team.powerRank <= 3
                            ? 'bg-zinc-200 text-black border-white'
                            : 'bg-zinc-900 text-white border-zinc-700'
                        }`}
                      >
                        #{team.powerRank}
                      </span>

                      {/* Movement Indicator */}
                      <span
                        className={`inline-flex items-center gap-0.5 text-[11px] font-black px-1.5 py-0.5 rounded-xs ${
                          team.rankDelta > 0
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-600/60'
                            : team.rankDelta < 0
                            ? 'bg-red-950 text-red-400 border border-red-600/60'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}
                        title={`Standings Seed: #${team.standingsSeed}`}
                      >
                        {team.rankDelta > 0 ? (
                          <>
                            <TrendingUp className="w-3 h-3" /> +{team.rankDelta}
                          </>
                        ) : team.rankDelta < 0 ? (
                          <>
                            <TrendingDown className="w-3 h-3" /> {team.rankDelta}
                          </>
                        ) : (
                          <>
                            <Minus className="w-3 h-3" /> EVEN
                          </>
                        )}
                      </span>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/team?team=${encodeURIComponent(team.abbr)}&season=${encodeURIComponent(String(selectedLeagueId))}`}
                            className="font-black text-sm sm:text-base uppercase tracking-wider hover:text-amber-400 transition"
                          >
                            {team.name}
                          </Link>
                          <span className="text-[11px] text-amber-400 font-bold uppercase">
                            (COACH: {team.coach_name})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 border ${getTierBadgeStyle(
                          team.tier
                        )}`}
                      >
                        {team.tier}
                      </span>
                      <span className="bg-zinc-900 border border-zinc-700 text-amber-300 text-[11px] font-black px-2 py-0.5">
                        PWR: {team.powerScore.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* Card Content Body */}
                  <div className="p-3 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                    {/* Left: Club Banner & Quick Vitals */}
                    <div className="lg:col-span-4 flex flex-col justify-between bg-[#f4f1ea] border border-black p-3">
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        {team.banner_url ? (
                          <img
                            src={team.banner_url}
                            alt={team.name}
                            className="h-9 sm:h-10 object-contain max-w-[190px]"
                            onError={(e) => {
                              const target = e.currentTarget;
                              const nextIdx = Number(target.dataset.fbIdx || '0');
                              if (team.fallback_urls && nextIdx < team.fallback_urls.length) {
                                target.dataset.fbIdx = String(nextIdx + 1);
                                target.src = team.fallback_urls[nextIdx];
                              } else {
                                target.style.display = 'none';
                              }
                            }}
                          />
                        ) : (
                          <span className="font-black text-lg uppercase">{team.name}</span>
                        )}
                        <span className="text-[10px] font-sans font-black uppercase bg-black text-white px-2 py-0.5">
                          SEED #{team.standingsSeed}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-1.5 text-center font-sans border-t border-black/20 pt-2">
                        <div className="bg-white border border-black/20 p-1">
                          <div className="text-[9px] font-bold uppercase text-neutral-500">REC</div>
                          <div className="text-xs font-black">
                            {team.wins}-{team.losses}-{team.ties}
                          </div>
                        </div>
                        <div className="bg-white border border-black/20 p-1">
                          <div className="text-[9px] font-bold uppercase text-neutral-500">PTS</div>
                          <div className="text-xs font-black text-amber-900">{team.pts}</div>
                        </div>
                        <div className="bg-white border border-black/20 p-1">
                          <div className="text-[9px] font-bold uppercase text-neutral-500">DIFF</div>
                          <div
                            className={`text-xs font-black ${
                              team.gd > 0
                                ? 'text-emerald-700'
                                : team.gd < 0
                                ? 'text-red-700'
                                : 'text-neutral-700'
                            }`}
                          >
                            {team.gd > 0 ? `+${team.gd}` : team.gd}
                          </div>
                        </div>
                        <div className="bg-white border border-black/20 p-1">
                          <div className="text-[9px] font-bold uppercase text-neutral-500">STRK / L10</div>
                          <div className="text-[11px] font-black">
                            {team.streak} <span className="text-neutral-500">({team.l10})</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Funny Coach & Team Recap */}
                    <div className="lg:col-span-8 flex flex-col justify-between space-y-2">
                      <h2 className="text-sm sm:text-base font-black uppercase tracking-tight text-black leading-snug">
                        {team.recapHeadline}
                      </h2>
                      <p className="text-xs sm:text-sm text-neutral-800 leading-relaxed">
                        {team.recapBody}
                      </p>
                      <div className="pt-1 flex items-center justify-between flex-wrap gap-2 border-t border-black/15 text-[11px] italic text-neutral-700 font-serif">
                        <span>{team.coachQuote}</span>
                        <span className="font-sans font-bold not-italic text-[10px] uppercase text-neutral-500">
                          GF: {team.gf} ({team.gp > 0 ? (team.gf / team.gp).toFixed(2) : '0.00'}/G) • GA: {team.ga} ({team.gp > 0 ? (team.ga / team.gp).toFixed(2) : '0.00'}/G)
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
