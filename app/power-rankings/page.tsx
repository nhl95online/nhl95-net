"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Flame, TrendingUp, TrendingDown, Minus, Calendar, Search, Trophy, Sparkles, ShieldCheck } from 'lucide-react';
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

  let daysSinceMonday = (dow + 6) % 7;
  if (dow === 1 && hour < 8) {
    daysSinceMonday = 7;
  }

  const editionDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  editionDate.setUTCDate(editionDate.getUTCDate() - daysSinceMonday);

  const nextMondayDate = new Date(editionDate.getTime());
  nextMondayDate.setUTCDate(nextMondayDate.getUTCDate() + 7);

  const editionKey = editionDate.toISOString().slice(0, 10);
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
  isPlayoffTeam: boolean;
  powerRank: number;
  prevRank: number;
  rankDelta: number;
  powerScore: number;
  standingScore60: number;
  recentScore20: number;
  gdScore10: number;
  streakScore10: number;
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
    standingsSeed: number;
    isPlayoffTeam: boolean;
    totalTeams: number;
  },
  editionKey: string,
  seasonName: string
): { headline: string; body: string; coachQuote: string } {
  const coach =
    team.coach_name && team.coach_name !== 'Unassigned' && team.coach_name !== 'TBA'
      ? team.coach_name
      : `Coach ${team.abbr}`;
  const club = team.name || team.abbr;
  const abbr = team.abbr || 'CLUB';
  const gpg = team.gp > 0 ? (team.gf / team.gp).toFixed(2) : '0.00';
  const gapg = team.gp > 0 ? (team.ga / team.gp).toFixed(2) : '0.00';
  const gdStr = team.gd > 0 ? `+${team.gd}` : `${team.gd}`;
  const recordStr = `${team.wins}-${team.losses}-${team.ties}`;
  const seed = hashSeed(`${editionKey}:${seasonName}:${team.team_id}:${team.powerRank}`);

  const isTopTier = team.powerRank <= Math.max(3, Math.ceil(team.totalTeams * 0.2));
  const isUpperMid = !isTopTier && team.isPlayoffTeam;
  const isBubble = !isTopTier && !isUpperMid && team.powerRank <= Math.ceil(team.totalTeams * 0.78);

  const topHeadlines = [
    `${coach.toUpperCase()} HAS ${club.toUpperCase()} OPERATING LIKE A 16-BIT DEATH STAR`,
    `LEAGUE INVESTIGATING ${coach.toUpperCase()} FOR SMUGGLING GAME GENIE CODES INTO ${abbr} BENCH`,
    `${club.toUpperCase()} (${recordStr}) REFUSING TO LET ANYONE ELSE HAVE FUN THIS WEEK`,
    `${coach.toUpperCase()} SPOTTED MEASURE-FITTING CHAMPIONSHIP RINGS IN THE SECOND PERIOD`,
    `OPPONENTS DEMAND CONTROLLER INSPECTION FOR ${coach.toUpperCase()} AFTER ${club.toUpperCase()} SURGES TO ${gdStr} DIFF`,
    `${coach.toUpperCase()} TURNS ${club.toUpperCase()} INTO AN UNSTOPPABLE ONE-TIMER FACTORY`,
    `NOBODY SAFE IN THE SLOT AS ${coach.toUpperCase()} & ${club.toUpperCase()} TERRORIZE THE LEAGUE`,
    `${coach.toUpperCase()} ACCUSED OF TAPING DOWN THE TURBO BUTTON BEHIND THE ${abbr} BENCH`,
  ];

  const midHeadlines = [
    `${coach.toUpperCase()} & ${club.toUpperCase()} LOCKED INTO THE PLAYOFF PICTURE ON PURE CAFFEINE AND VIBES`,
    `NOBODY KNOWS WHICH ${club.toUpperCase()} TEAM WILL SHOW UP—ESPECIALLY ${coach.toUpperCase()}`,
    `${coach.toUpperCase()} INSISTS ${club.toUpperCase()} IS "PEAKING AT THE EXACT RIGHT TIME"`,
    `BLOOD PRESSURE MONITORS MANDATORY ON THE ${club.toUpperCase()} BENCH THIS WEEK`,
    `${club.toUpperCase()} (${recordStr}) ALTERNATING BETWEEN MASTERPIECE HOCKEY AND TOTAL CARNAGE`,
    `${coach.toUpperCase()} RUNNING THE "SCORE ${gpg} AND PRAY" SYSTEM TO PERFECTION IN ${abbr}`,
    `PLAYOFF BOOST KEEPS ${coach.toUpperCase()}'S ${club.toUpperCase()} SQUAD DANGEROUS AT #${team.powerRank}`,
    `${coach.toUpperCase()} PROMISES ${club.toUpperCase()} IS BUILT FOR 7-GAME WARFARE`,
  ];

  const bubbleHeadlines = [
    `${coach.toUpperCase()} SWEARING AT THE SEGA CONTROLLER AS ${club.toUpperCase()} CHASES THE CUTLINE`,
    `${club.toUpperCase()} GOALIE FILED FOR HAZARD PAY AFTER ALLOWING ${gapg} GOALS A NIGHT`,
    `${coach.toUpperCase()} CLAIMS ${abbr}'S ${recordStr} RECORD IS "JUST ROPE-A-DOPE FOR THE PLAYOFFS"`,
    `CHAOS REIGNS IN ${club.toUpperCase()} LOCKER ROOM AS ${coach.toUpperCase()} SHUFFLES LINES AGAIN`,
    `${club.toUpperCase()} KEEPING PLAYOFF HOPES ALIVE WITH DUCT TAPE, HEART, AND LATE POKE CHECKS`,
    `${coach.toUpperCase()} BLAMES ICE TILT, WIFI, AND MERCURY IN RETROGRADE FOR ${abbr} SLUMP`,
  ];

  const bottomHeadlines = [
    `${coach.toUpperCase()} ALREADY SCOUTING NEXT SEASON'S DRAFT CLASS FROM THE ${abbr} BENCH`,
    `${club.toUpperCase()} DEFENSE CURRENTLY OPTIONAL AS ${coach.toUpperCase()} EMBRACES SPOILER MODE`,
    `LOCAL FIRE MARSHAL CALLED TO PUT OUT THE DUMPSTER FIRE BEHIND ${coach.toUpperCase()}'S BENCH`,
    `${club.toUpperCase()} (${recordStr}) PLAYING LIKE THEIR CONTROLLERS ARE UNPLUGGED IN THE 3RD`,
    `${coach.toUpperCase()} PROMISES REBUILD IS "ONLY 14 TRADES AWAY" FOR ${club.toUpperCase()}`,
    `FANS IN ${club.toUpperCase()} WEARING PAPER BAGS WHILE ${coach.toUpperCase()} DRAWS PLAYS ON A NAPKIN`,
  ];

  const topBodies = [
    `Sitting at #${team.powerRank} on the Power Board (Seed #${team.standingsSeed}, ${recordStr}, ${team.pts} PTS) with a filthy ${gdStr} goal differential, ${coach} has ${club} playing like they taped down the B-button and bribed the Sega Genesis referees. Averaging ${gpg} goals per game while only surrendering ${gapg}, ${abbr} (${team.l10} in their last 10, ${team.streak} streak) isn't just beating teams—they're making opposing coaches contemplate retirement mid-second period.`,
    `At ${recordStr} (${team.pts} PTS), ${coach} is strutting around the ${club} locker room in a velvet tracksuit like Scotty Bowman with a 6-button controller. ${abbr} has pumped in ${team.gf} goals against just ${team.ga} allowed (${gdStr} diff), going ${team.l10} over their last 10. Rumor has it ${coach} doesn't even call timeouts anymore—just stares into the Discord voice channel until the other guy pulls his goalie.`,
    `There is wagon status, and then whatever ${coach} is cooking up with ${club} right now. Posting ${team.pts} points (${recordStr}) with ${team.gf} goals for (${gpg}/gm) and a ${team.streak} run, ${abbr} has turned every home game into a track meet. Opposing defensemen are reportedly faking internet outages rather than face ${coach}'s forecheck.`,
    `${coach} has ${club} humming at #${team.powerRank} overall (Seed #${team.standingsSeed}, ${recordStr}, ${team.pts} PTS, ${gdStr} GD). Between lighting the lamp ${team.gf} times and clamping down to ${gapg} GA/G, the only thing slowing ${abbr} down is waiting for terrified opponents to answer their pings in #season-games.`,
    `With a ${recordStr} record (${team.pts} PTS) and a ${team.l10} clip over the last 10, ${coach} has ${club} firing on all cylinders. ${abbr} is outscoring opponents ${team.gf} to ${team.ga} (${gdStr}), and league sources confirm three rival GMs have already filed formal complaints about ${coach}'s crease-cut one-timers.`,
    `Nobody in ${seasonName} wants a piece of ${coach} and ${club} right now. Ranked #${team.powerRank} with ${team.pts} points (${recordStr}), ${gpg} GF/G, and a ${team.streak} streak, ${abbr} is treating the regular season like a speedrun while ${coach} sips coffee and collects two points a night.`,
  ];

  const midBodies = [
    `Backed by the automatic playoff-berth boost at Seed #${team.standingsSeed}, ${coach}'s ${club} squad checks in at #${team.powerRank} with a ${recordStr} record (${team.pts} PTS, ${gdStr} GD) and a ${team.l10} mark over the last 10. One night ${abbr} looks like a Brule Cup juggernaut scoring ${gpg} goals a game; the next night they're trading breakaways like Pokémon cards. Still, nobody in the bracket wants to draw ${coach} in a 7-game rock fight.`,
    `Holding down #${team.powerRank} on the Power Poll (Seed #${team.standingsSeed}, ${recordStr}, ${team.pts} PTS), ${coach} has ${club} playing high-event, heart-attack 95 hockey. With ${team.gf} goals scored and ${team.ga} allowed (${gdStr}), every ${abbr} broadcast requires a cardiologist on standby. ${coach} swears the defensive breakdowns are "just baiting them into a false sense of security."`,
    `At ${recordStr} (${team.pts} PTS) and riding a ${team.streak} streak inside the playoff cut, ${club} is the ultimate postseason landmine under ${coach}. Averaging ${gpg} GF/G against ${gapg} GA/G, ${abbr} can beat a top seed by four at 11:00 PM and then sweat out an overtime thriller at 11:20 PM. Pure box-office entertainment.`,
    `${coach} has guided ${club} into playoff position (Seed #${team.standingsSeed}, ${team.pts} PTS, ${recordStr}, ${team.l10} L10) through sheer stubbornness and manual-goalie gymnastics. With a ${gdStr} goal differential and ${team.otWins} overtime wins, ${abbr} refuses to play a normal, stress-free 15-minute game.`,
    `Locked into the postseason picture at #${team.powerRank} (${recordStr}, ${team.pts} PTS), ${coach} has ${club} humming along at ${gpg} goals per game. Critics point to the ${gapg} goals allowed per night, but ${coach} just points to the scoreboard and reminds everyone that style points don't count in the standings.`,
    `With ${team.pts} points (${recordStr}) and a ${team.l10} recent stretch, ${coach}'s ${club} crew is battle-tested and playoff-bound. ${abbr} has potted ${team.gf} goals on the campaign (${gdStr} diff), and ${coach} has reportedly already laminated the playoff playbook.`,
  ];

  const bubbleBodies = [
    `Outside the playoff cutline at Seed #${team.standingsSeed} (#${team.powerRank} Power Rank, ${recordStr}, ${team.pts} PTS, ${gdStr} GD), ${coach} has been spotted pacing the ${club} press box muttering about passing accuracy and phantom tripping calls. Allowing ${gapg} goals a game while going ${team.l10} over their last 10 has ${abbr} scrambling for points, though ${coach} insists a 6-game heater is imminent.`,
    `Life on the bubble is aging ${coach} in dog years. ${club} sits at ${recordStr} (${team.pts} PTS) with ${team.gf} GF and ${team.ga} GA (${gdStr} diff) and a ${team.streak} streak. The offense (${gpg} GF/G) shows flashes of brilliance, right before the defense parts like the Red Sea and leaves the goalie stranded on an island.`,
    `${coach} and ${club} (#${team.powerRank}, ${recordStr}, ${team.pts} PTS) are treating every remaining game like Game 7 overtime—mostly because they have to. With ${team.ga} goals against (${gapg}/gm) and a ${team.l10} last-10 clip, ${abbr} is one hot goalie week away from crashing the playoff party or one bad bounce away from throwing a CRT television out the window.`,
    `Checking in at #${team.powerRank} (${recordStr}, ${gdStr} GD), ${club} has tested every ounce of ${coach}'s patience. Sources inside the arena say ${coach} blew his voice out yelling "CLEAR THE PUCK" during their ${team.l10} recent stretch, yet ${abbr} remains feisty enough to ruin anyone's night.`,
  ];

  const bottomBodies = [
    `It has been a long, character-building campaign for ${coach} and ${club} (#${team.powerRank}, ${recordStr}, ${team.pts} PTS). With a ${gdStr} goal differential (${gpg} GF/G vs. ${gapg} GA/G) and a ${team.l10} mark in their last 10, the ${abbr} defense has been accused of practicing social distancing in the slot. On the bright side, ${coach} leads the league in post-game comedic relief.`,
    `At ${recordStr} (${team.pts} PTS, ${gdStr} GD), ${coach} has officially entered the philosophical phase of the ${club} season. Giving up ${team.ga} goals (${gapg}/gm) while riding a ${team.streak} streak would break lesser managers, but ${coach} is still showing up, talking trash in Discord, and threatening to ruin somebody's seeding out of pure spite.`,
    `${club} checks in at #${team.powerRank} (${recordStr}, ${team.pts} PTS) after another week where the scoreboard operator got carpal tunnel syndrome from logging ${team.ga} goals against. Rumor has it ${coach} tried to trade the team bus for a 90-speed winger and a six-pack, but the Commissioner vetoed it.`,
    `Sitting at #${team.powerRank} with a ${recordStr} record and ${gdStr} differential, ${coach}'s ${club} squad is playing spoiler—mostly to their own goalies' save percentages (${gapg} GA/G). Still, any contender who sleeps on ${coach} and ${abbr} is asking to get ambushed on a Tuesday night.`,
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
    `"We're in the playoffs—nobody can scout us if we don't know what we're doing either." — ${coach}`,
  ];

  const bubbleQuotes = [
    `"One bounce goes our way and we're back in the bracket. Ignore the goal differential." — ${coach}`,
    `"My goalie owes me a new controller after that last third period." — ${coach}`,
    `"Ice tilt is real and I have a 40-page slideshow to prove it." — ${coach}`,
    `"Nobody wants to see ${abbr} when we get desperate. Especially my cardiologist." — ${coach}`,
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
  const [playoffCutoffCount, setPlayoffCutoffCount] = useState<number>(16);

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

    // Determine playoff cutoff for this season
    let playoffCutoff = matchedSeason?.playoff_teams ? Number(matchedSeason.playoff_teams) : 0;

    // Fetch all required tables using select('*') so no missing-column error or 1000-row cap ever drops teams
    const [schedRes, statsRes, seasonTeamsRes, standingsRes, coachesRes, playoffsRes] =
      await Promise.all([
        supabase
          .from('league_schedule')
          .select('game_id, home_team_id, away_team_id, played, league_id, home_score, away_score, game_meta')
          .eq('league_id', numericLeagueId)
          .order('game_id', { ascending: true }),
        supabase
          .from('league_gamestats')
          .select('*')
          .eq('league_id', numericLeagueId),
        supabase
          .from('league_teams')
          .select('*')
          .eq('league_id', numericLeagueId),
        supabase
          .from('league_standings')
          .select('*')
          .eq('season_id', numericLeagueId),
        supabase
          .from('league_coaches')
          .select('*'),
        supabase
          .from('league_playoffs')
          .select('*')
          .eq('league_id', numericLeagueId)
          .then((r) => r, () => ({ data: [] as any[], error: null })),
      ]);

    const allScheduleData = schedRes.data || [];
    const statsData = statsRes.data || [];
    const seasonTeamsData = seasonTeamsRes.data || [];
    const standardData = standingsRes.data || [];
    const allCoaches = coachesRes.data || [];
    const playoffsData = playoffsRes.data || [];

    // Collect all active team IDs referenced in this season's schedule, stats, standings, or teams
    const preliminaryTeamIds = new Set<number>();
    seasonTeamsData.forEach((t: any) => {
      if (t.team_id) preliminaryTeamIds.add(Number(t.team_id));
    });
    allScheduleData.forEach((g: any) => {
      if (g.home_team_id) preliminaryTeamIds.add(Number(g.home_team_id));
      if (g.away_team_id) preliminaryTeamIds.add(Number(g.away_team_id));
    });
    statsData.forEach((s: any) => {
      if (s.home_team_id) preliminaryTeamIds.add(Number(s.home_team_id));
      if (s.away_team_id) preliminaryTeamIds.add(Number(s.away_team_id));
    });
    standardData.forEach((s: any) => {
      if (s.team_id) preliminaryTeamIds.add(Number(s.team_id));
    });

    // Explicitly fetch league_teams rows for every active team_id so PostgREST's 1000-row cap never misses high team_ids (e.g. 848, 854, 855)
    let idMatchedTeams: any[] = [];
    const idList = Array.from(preliminaryTeamIds).filter((id) => id > 0 && id !== 999 && id !== 68);
    if (idList.length > 0) {
      try {
        const byIdsRes = await supabase
          .from('league_teams')
          .select('*')
          .in('team_id', idList);
        if (byIdsRes.data) idMatchedTeams = byIdsRes.data;
      } catch {}
    }

    const allTeamsData = [...seasonTeamsData, ...idMatchedTeams];

    // Explicit playoff teams set if bracket rows exist
    const explicitPlayoffTeamIds = new Set<number>();
    playoffsData.forEach((p: any) => {
      if (p.team_id) explicitPlayoffTeamIds.add(Number(p.team_id));
      if (p.home_team_id) explicitPlayoffTeamIds.add(Number(p.home_team_id));
      if (p.away_team_id) explicitPlayoffTeamIds.add(Number(p.away_team_id));
      if (p.team1_id) explicitPlayoffTeamIds.add(Number(p.team1_id));
      if (p.team2_id) explicitPlayoffTeamIds.add(Number(p.team2_id));
    });

    if (!playoffCutoff) {
      if (explicitPlayoffTeamIds.size > 0) {
        playoffCutoff = explicitPlayoffTeamIds.size;
      } else {
        playoffCutoff = numericLeagueId === 39 ? 4 : numericLeagueId >= 38 ? 16 : 8;
      }
    }
    setPlayoffCutoffCount(playoffCutoff);

    const coachMap = new Map<number, string>();
    allCoaches.forEach((c: any) => {
      if (c.coach_id != null && c.coach_name) {
        coachMap.set(Number(c.coach_id), String(c.coach_name).trim());
      }
    });

    // Also harvest coach names from game stats (home_coach / away_coach) by team_id as a fallback
    const gameCoachByTeamId = new Map<number, string>();
    statsData.forEach((g: any) => {
      if (g.home_team_id && g.home_coach && String(g.home_coach).trim()) {
        gameCoachByTeamId.set(Number(g.home_team_id), String(g.home_coach).trim());
      }
      if (g.away_team_id && g.away_coach && String(g.away_coach).trim()) {
        gameCoachByTeamId.set(Number(g.away_team_id), String(g.away_coach).trim());
      }
    });

    const baseTeamMap: Record<number, any> = {};

    const registerTeamRow = (t: any, preferOverwrite: boolean) => {
      if (!t || t.team_id == null) return;
      const tId = Number(t.team_id);
      if (!tId || tId === 999 || tId === 0 || tId === 68) return;
      if (baseTeamMap[tId] && !preferOverwrite) return;

      const { primaryUrl, fallbackUrls } = getTeamBannerUrls(t, numericLeagueId);
      const cId = Number(t.coach_id || 0);
      const resolvedCoach =
        (cId && coachMap.get(cId)) ||
        t.coach_name ||
        gameCoachByTeamId.get(tId) ||
        'Unassigned';

      baseTeamMap[tId] = {
        id: tId,
        name: t.team_name || `Club #${tId}`,
        abbr: t.abbreviation || `TM${tId}`,
        logo_url: t.logo_url || null,
        banner_url: primaryUrl,
        fallback_urls: fallbackUrls,
        coach_id: cId,
        coach_name: resolvedCoach,
      };
    };

    allTeamsData.forEach((t: any) => {
      registerTeamRow(t, Number(t.league_id) === numericLeagueId);
    });

    standardData.forEach((row: any) => {
      if (row.league_teams) {
        const lt = Array.isArray(row.league_teams) ? row.league_teams[0] : row.league_teams;
        if (lt) registerTeamRow({ ...lt, team_id: row.team_id, league_id: numericLeagueId }, false);
      }
    });

    const teamMap: Record<number, any> = {};
    const activeTeamIds = new Set<number>();

    seasonTeamsData.forEach((t: any) => {
      const tId = Number(t.team_id);
      if (tId && tId !== 999 && tId !== 0 && tId !== 68) activeTeamIds.add(tId);
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
        coach_name: gameCoachByTeamId.get(tId) || 'Unassigned',
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
        h2h: {} as Record<number, { wins: number; pts: number; gf: number; ga: number }>,
      };
    });

    const resolveTeamKey = (rawId: any): number | null => {
      const num = Number(rawId);
      if (!num || num === 999 || num === 0 || num === 68) return null;
      if (teamMap[num]) return num;

      const matchTeam = allTeamsData.find(
        (t: any) => Number(t.team_id) === num || Number(t.coach_id) === num
      );
      if (matchTeam) {
        const seasonMatch = seasonTeamsData.find(
          (t: any) =>
            (t.abbreviation &&
              t.abbreviation.trim().toUpperCase() === (matchTeam.abbreviation || '').trim().toUpperCase()) ||
            (t.team_name &&
              t.team_name.trim().toUpperCase() === (matchTeam.team_name || '').trim().toUpperCase()) ||
            (Number(t.coach_id) > 0 && Number(t.coach_id) === Number(matchTeam.coach_id))
        );
        if (seasonMatch && teamMap[Number(seasonMatch.team_id)]) {
          return Number(seasonMatch.team_id);
        }
      }
      return num;
    };

    const statsMap = new Map<number, any>();
    statsData.forEach((st: any) => {
      statsMap.set(Number(st.game_id), st);
    });

    const recordGameResult = (
      rawHId: number,
      rawAId: number,
      hScore: number,
      aScore: number,
      isOT: boolean
    ) => {
      const hId = resolveTeamKey(rawHId);
      const aId = resolveTeamKey(rawAId);
      if (!hId || !aId || hId === aId) return;

      const home = teamMap[hId];
      const away = teamMap[aId];
      if (!home || !away) return;

      home.gp += 1;
      home.gf += hScore;
      home.ga += aScore;
      away.gp += 1;
      away.gf += aScore;
      away.ga += hScore;

      if (!home.h2h[aId]) home.h2h[aId] = { wins: 0, pts: 0, gf: 0, ga: 0 };
      if (!away.h2h[hId]) away.h2h[hId] = { wins: 0, pts: 0, gf: 0, ga: 0 };
      home.h2h[aId].gf += hScore;
      home.h2h[aId].ga += aScore;
      away.h2h[hId].gf += aScore;
      away.h2h[hId].ga += hScore;

      if (hScore > aScore) {
        home.wins += 1;
        home.pts += 2;
        if (isOT) home.otWins += 1;
        home.history.push('W');
        home.h2h[aId].wins += 1;
        home.h2h[aId].pts += 2;

        if (isOT) {
          away.otLosses += 1;
          away.losses += 1;
          away.pts += 1;
          away.history.push('OTL');
          away.h2h[hId].pts += 1;
        } else {
          away.losses += 1;
          away.history.push('L');
        }
      } else if (aScore > hScore) {
        away.wins += 1;
        away.pts += 2;
        if (isOT) away.otWins += 1;
        away.history.push('W');
        away.h2h[hId].wins += 1;
        away.h2h[hId].pts += 2;

        if (isOT) {
          home.otLosses += 1;
          home.losses += 1;
          home.pts += 1;
          home.history.push('OTL');
          home.h2h[aId].pts += 1;
        } else {
          home.losses += 1;
          home.history.push('L');
        }
      } else {
        home.ties += 1;
        home.pts += 1;
        home.history.push('T');
        home.h2h[aId].pts += 1;

        away.ties += 1;
        away.pts += 1;
        away.history.push('T');
        away.h2h[hId].pts += 1;
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
      recordGameResult(
        Number(st.home_team_id),
        Number(st.away_team_id),
        Number(st.home_score || 0),
        Number(st.away_score || 0),
        isOT
      );
    });

    let rawList = Object.values(teamMap).filter((t: any) => t.gp > 0);

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
          coach_name: gameCoachByTeamId.get(tId) || 'Unassigned',
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
          h2h: {},
        };
      });
    }

    // 1. Sort by Official League Standings Tiebreakers:
    //    Points -> Most Overall Wins -> Head-to-Head series -> Head-to-Head GD -> Season GD
    const sortedByStandings = [...rawList].sort((a: any, b: any) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.wins !== a.wins) return b.wins - a.wins;
      const aVsB = a.h2h?.[Number(b.team_id)];
      const bVsA = b.h2h?.[Number(a.team_id)];
      if (aVsB || bVsA) {
        const h2hWinsDiff = (bVsA?.wins || 0) - (aVsB?.wins || 0);
        if (h2hWinsDiff !== 0) return h2hWinsDiff;
        const h2hPtsDiff = (bVsA?.pts || 0) - (aVsB?.pts || 0);
        if (h2hPtsDiff !== 0) return h2hPtsDiff;
        const h2hGdA = (aVsB?.gf || 0) - (aVsB?.ga || 0);
        const h2hGdB = (bVsA?.gf || 0) - (bVsA?.ga || 0);
        if (h2hGdB !== h2hGdA) return h2hGdB - h2hGdA;
      }
      const gdA = a.gf - a.ga;
      const gdB = b.gf - b.ga;
      if (gdB !== gdA) return gdB - gdA;
      return String(a.abbr || '').localeCompare(String(b.abbr || ''));
    });

    const totalTeams = sortedByStandings.length || 1;
    const minGd = Math.min(...sortedByStandings.map((t: any) => t.gf - t.ga), 0);
    const maxGd = Math.max(...sortedByStandings.map((t: any) => t.gf - t.ga), 1);
    const gdRange = Math.max(1, maxGd - minGd);

    // 2. Compute the 4 Weighted Power Components:
    //    SEASON STANDING 60% · RECENT RECORD 20% · GOAL DIFF 10% · STREAK 10%
    //    + PLAYOFF TEAMS RECEIVE AUTOMATIC BOOST ABOVE NON-PLAYOFF TEAMS
    const scoredList = sortedByStandings.map((t: any, idx: number) => {
      const standingsSeed = idx + 1;
      const isPlayoffTeam =
        explicitPlayoffTeamIds.size > 0
          ? explicitPlayoffTeamIds.has(t.team_id) || standingsSeed <= playoffCutoff
          : standingsSeed <= playoffCutoff;

      const gd = t.gf - t.ga;
      let streak = t.streak || '-';
      let l10 = t.l10 || '0-0-0';
      let l10Wins = 0;
      let l10Losses = 0;
      let l10PtsPct = t.gp > 0 ? t.pts / (t.gp * 2) : 0.5;

      if (Array.isArray(t.history) && t.history.length > 0) {
        const last10 = t.history.slice(-10);
        l10Wins = last10.filter((r: string) => r === 'W').length;
        const l10RegL = last10.filter((r: string) => r === 'L').length;
        const l10T = last10.filter((r: string) => r === 'T').length;
        const l10Otl = last10.filter((r: string) => r === 'OTL').length;
        l10Losses = l10RegL + l10Otl;
        l10 = l10Otl > 0 ? `${l10Wins}-${l10RegL}-${l10T}-${l10Otl}` : `${l10Wins}-${l10RegL}-${l10T}`;
        const l10Pts = l10Wins * 2 + l10T + l10Otl;
        l10PtsPct = last10.length > 0 ? l10Pts / (last10.length * 2) : 0.5;

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
        const regL = parts[1] || 0;
        const ties = parts[2] || 0;
        const otl = parts[3] || 0;
        l10Losses = regL + otl;
        const totalG = Math.max(1, l10Wins + regL + ties + otl);
        l10PtsPct = (l10Wins * 2 + ties + otl) / (totalG * 2);
      }

      // Component 1: SEASON STANDING (60% max = 60.0 pts)
      const rankPct = totalTeams > 1 ? (totalTeams - standingsSeed) / (totalTeams - 1) : 1;
      const ptsPct = t.gp > 0 ? Math.min(1, t.pts / (t.gp * 2)) : 0;
      const standingScore60 = Number((60 * (0.65 * rankPct + 0.35 * ptsPct)).toFixed(1));

      // Component 2: RECENT RECORD / L10 (20% max = 20.0 pts)
      const recentScore20 = Number((20 * Math.max(0, Math.min(1, l10PtsPct))).toFixed(1));

      // Component 3: GOAL DIFF (10% max = 10.0 pts)
      const gdNorm = Math.max(0, Math.min(1, (gd - minGd) / gdRange));
      const gdScore10 = Number((10 * gdNorm).toFixed(1));

      // Component 4: STREAK (10% max = 10.0 pts, 5.0 neutral)
      const streakCount = parseInt(streak.replace(/\D/g, ''), 10) || 1;
      let streakRaw = 5.0;
      if (streak.startsWith('W')) {
        streakRaw = Math.min(10, 5 + streakCount * 1.0);
      } else if (streak.startsWith('L')) {
        streakRaw = Math.max(0, 5 - streakCount * 1.0);
      } else if (streak.startsWith('OTL')) {
        streakRaw = Math.max(1.5, 5 - streakCount * 0.6);
      }
      const streakScore10 = Number(streakRaw.toFixed(1));

      const basePowerScore = Number(
        (standingScore60 + recentScore20 + gdScore10 + streakScore10).toFixed(1)
      );

      return {
        ...t,
        gd,
        streak,
        l10,
        l10Wins,
        l10Losses,
        standingsSeed,
        isPlayoffTeam,
        standingScore60,
        recentScore20,
        gdScore10,
        streakScore10,
        powerScore: basePowerScore,
      };
    });

    // 3. Sort Power Rankings:
    //    Playoff teams ALWAYS rank above non-playoff teams, then by composite Power Score
    const byPower = [...scoredList].sort((a, b) => {
      if (a.isPlayoffTeam !== b.isPlayoffTeam) {
        return a.isPlayoffTeam ? -1 : 1;
      }
      if (b.powerScore !== a.powerScore) return b.powerScore - a.powerScore;
      return a.standingsSeed - b.standingsSeed;
    });

    const finalRanked: RankedTeam[] = byPower.map((t, idx) => {
      const powerRank = idx + 1;
      const prevRank = t.standingsSeed;
      const rankDelta = prevRank - powerRank;

      let tier: RankedTeam['tier'] = 'CONTENDER';
      if (t.isPlayoffTeam && powerRank <= Math.max(4, Math.ceil(totalTeams * 0.16))) {
        tier = 'WAGON ALERT';
      } else if (t.isPlayoffTeam) {
        tier = 'CONTENDER';
      } else if (powerRank <= playoffCutoff + 5) {
        tier = 'CHAOS BUBBLE';
      } else if (powerRank <= Math.ceil(totalTeams * 0.85)) {
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

          {/* Formula Banner */}
          <div className="mt-3 max-w-3xl mx-auto bg-black text-white border-2 border-black px-3 py-2 font-sans">
            <div className="text-[10px] sm:text-xs font-black tracking-widest uppercase text-amber-400">
              SEASON STANDING 60% · RECENT RECORD 20% · GOAL DIFF 10% · STREAK 10%
            </div>
            <div className="text-[9px] sm:text-[10px] font-bold tracking-wider uppercase text-emerald-400 mt-0.5">
              ★ PLAYOFF TEAMS (TOP {playoffCutoffCount}) RECEIVE AUTOMATIC BOOST ABOVE NON-PLAYOFF TEAMS ★
            </div>
          </div>

          {/* Edition Status Strip */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-[11px] sm:text-xs font-sans font-bold uppercase tracking-wider">
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
            {visibleRankings.map((team, idx) => {
              const isTop3 = team.powerRank <= 3;
              const prevTeam = idx > 0 ? visibleRankings[idx - 1] : null;
              const showPlayoffCutline =
                !searchQuery.trim() && prevTeam && prevTeam.isPlayoffTeam && !team.isPlayoffTeam;

              return (
                <React.Fragment key={team.team_id}>
                  {showPlayoffCutline && (
                    <div className="my-6 flex items-center gap-3 font-sans">
                      <div className="flex-1 border-t-2 border-dashed border-red-700" />
                      <span className="bg-red-700 text-white px-3 py-1 text-[11px] font-black uppercase tracking-widest border border-black">
                        ▲ PLAYOFF TEAMS (AUTOMATIC BOOST) • ▼ NON-PLAYOFF CHASERS
                      </span>
                      <div className="flex-1 border-t-2 border-dashed border-red-700" />
                    </div>
                  )}

                  <article
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

                        {/* Movement vs Official Standings Seed */}
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

                        {/* Team Logo in Header Bar */}
                        {team.logo_url && (
                          <img
                            src={team.logo_url}
                            alt={team.name}
                            className="w-7 h-7 object-contain bg-white/10 rounded-xs p-0.5 border border-white/20"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}

                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/team/${team.team_id}?season=${encodeURIComponent(String(selectedLeagueId))}`}
                            className="font-black text-sm sm:text-base uppercase tracking-wider hover:text-amber-400 transition"
                          >
                            {team.name}
                          </Link>
                          <span className="text-[11px] text-amber-400 font-bold uppercase">
                            • COACH: {team.coach_name}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {team.isPlayoffTeam && (
                          <span className="inline-flex items-center gap-1 bg-emerald-950 text-emerald-300 border border-emerald-500/60 text-[10px] font-black uppercase px-2 py-0.5">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            PLAYOFF BOOST
                          </span>
                        )}
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
                      {/* Left: Club Logo, Banner, Coach & Quick Vitals */}
                      <div className="lg:col-span-4 flex flex-col justify-between bg-[#f4f1ea] border border-black p-3">
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {team.logo_url ? (
                              <img
                                src={team.logo_url}
                                alt={team.name}
                                className="w-11 h-11 object-contain shrink-0 bg-white border border-black/20 p-1"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-11 h-11 shrink-0 bg-black text-amber-400 flex items-center justify-center font-sans font-black text-xs border border-black">
                                {team.abbr}
                              </div>
                            )}

                            <div className="min-w-0">
                              {team.banner_url ? (
                                <img
                                  src={team.banner_url}
                                  alt={team.name}
                                  className="h-7 sm:h-8 object-contain max-w-[145px]"
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
                                <div className="font-black text-sm uppercase truncate">{team.name}</div>
                              )}
                              <div className="text-[11px] font-sans font-black uppercase text-neutral-700 truncate mt-0.5">
                                Coach: <span className="text-black">{team.coach_name}</span>
                              </div>
                            </div>
                          </div>

                          <span className="text-[10px] font-sans font-black uppercase bg-black text-white px-2 py-0.5 shrink-0">
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

                        {/* 60 / 20 / 10 / 10 Formula Breakdown Strip */}
                        <div className="mt-2 pt-1.5 border-t border-black/15 flex items-center justify-between text-[9px] font-sans font-bold uppercase text-neutral-600">
                          <span>STND: {team.standingScore60}/60</span>
                          <span>L10: {team.recentScore20}/20</span>
                          <span>GD: {team.gdScore10}/10</span>
                          <span>STRK: {team.streakScore10}/10</span>
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
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
