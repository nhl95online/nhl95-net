"use client";

import React, { useState, useEffect, useMemo, use, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// ==========================================
// 1. LEAGUE CONSTANTS & ROSTERS CONFIG
// ==========================================

const SEASON_TYPES: Record<number, string> = {
  1: 'W', 2: 'W', 3: 'W', 4: 'W', 5: 'Q', 6: 'W', 7: 'Q', 8: 'Q', 9: 'W', 10: 'Q',
  11: 'W', 12: 'Q', 13: 'Q', 14: 'W', 15: 'Q', 16: 'G', 17: 'Q', 18: 'W', 19: 'Q', 20: 'V',
  21: 'Q', 22: 'W', 23: 'Q', 24: 'W', 25: 'Q', 26: 'Q', 27: 'Q', 28: 'W', 29: 'Q', 30: 'Q',
  31: 'W', 32: 'Q', 33: 'W', 34: 'Q', 35: 'W', 36: 'Q', 37: 'W', 38: 'W', 39: 'O', 40: 'W'
};

const TEAM_CITY_ALIASES: Record<string, string> = {
  // W League
  AUT: 'AUTUN', BAR: 'BARCELONA', BAY: 'BAYFIELD', BFC: 'BUFFALO', DHG: 'DURHAM',
  GRH: 'GRAND RAPIDS', HAM: 'HAMILTON', HIG: 'HIGHLAND', ING: 'INGLEWOOD', ITA: 'ITALY',
  KAR: 'KARLSTAD', MHA: 'MANHATTAN', MHT: 'MANOTICK', MGG: 'MAGOG', NBK: 'NEW BRUNSWICK',
  OCW: 'OTTAWA', PIT: 'PITTSBURGH', PRO: 'PROVIDENCE', RIC: 'RICHMOND', ROC: 'ROCHESTER',
  SHS: 'SHERWOOD', SVF: 'SAINT-VINCENT', SUM: 'SUMMERSIDE', TAI: 'TAIPEI', TEG: 'TEGUCIGALPA',
  TBP: 'TAMPA', VHV: 'VICTORIAVILLE', WDY: 'WOODBURY', ETI: 'ETOBICOKE',
  // O League
  BOS: 'BOSTON', CHI: 'CHICAGO', DTC: 'DETROIT', MTL: 'MONTREAL', NYR: 'NEW YORK', TOR: 'TORONTO',
  DET: 'DETROIT', NY: 'NEW YORK'
};

export const W_LEAGUE_GOALIES: Record<string, string[]> = {
  AUT: ['Carey Price', 'Evgeni Nabokov'],
  BAR: ['Jean-Sebastien Giguere', 'Semyon Varlamov'],
  BAY: ['Cory Schneider', 'Jimmy Howard'],
  BFC: ['Robin Lehner', 'Braden Holtby'],
  DHG: ['Nikolai Khabibulin', 'Anders Lindback'],
  GRH: ['Ilya Bryzgalov', 'Darcy Kuemper'],
  HAM: ['Viktor Fasth', 'Tuukka Rask'],
  HIG: ['Henrik Lundqvist', 'Dan Ellis'],
  ING: ['Pekka Rinne', 'Scott Clemmensen'],
  ITA: ['Ben Scrivens', 'Matt Hackett'],
  KAR: ['Roberto Luongo', 'Jhonas Enroth'],
  MHA: ['Jose Theodore', 'Steve Mason'],
  MHT: ['Johan Hedberg', 'Carter Hutton'],
  MGG: ['Kari Lehtonen', 'Mike Smith'],
  NBK: ['Jonathan Quick', 'Jake Allen'],
  OCW: ['Marc-Andre Fleury', 'Brian Elliott'],
  PIT: ['Cam Ward', 'Martin Biron'],
  PRO: ['Chad Johnson', 'Devan Dubnyk'],
  RIC: ['Ben Bishop', 'Jonathan Bernier'],
  ROC: ['Ray Emery', 'Jacob Markstrom'],
  SHS: ['Miikka Kiprusoff', 'Al Montoya'],
  SVF: ['Martin Brodeur', 'Anton Khudobin'],
  SUM: ['Corey Crawford', 'Ryan Miller'],
  TAI: ['Craig Anderson', 'James Reimer'],
  TEG: ['Peter Budaj', 'Sergei Bobrovsky'],
  TBP: ['Jonas Hiller', 'Niklas Backstrom'],
  VHV: ['Antti Niemi', 'Thomas Greiss'],
  WDY: ['Jaroslav Halak', 'Tomas Vokoun'],
  ETI: ['Ondrej Pavelec', 'Richard Bachman']
};

export const W_LEAGUE_SKATERS: Record<string, string[]> = {
  AUT: ['Joe Pavelski', 'Martin St.Louis', 'Ryan Johansen', 'Brad Richards', 'Wayne Simmonds', 'Mark Giordano', 'Dustin Byfuglien', 'Sergei Gonchar'],
  BAR: ['Steve Sullivan', 'Gabriel Landeskog', 'Filip Forsberg', 'Artem Anisimov', 'James Neal', 'Trevor Daley', 'Joni Pitkanen', 'Dougie Hamilton'],
  BAY: ['Vincent Lecavalier', 'Jonathan Toews', 'Jason Spezza', 'Tyler Johnson', 'Zach Parise', 'Tyler Myers', 'Victor Hedman', 'Mike Green'],
  BFC: ['Nail Yakupov', 'Olli Jokinen', 'Sidney Crosby', 'Tyler Seguin', 'Brandon Saad', 'Zdeno Chara', 'Kris Letang', 'Nick Leddy'],
  DHG: ['Joffrey Lupul', 'Alex Tanguay', 'Ondrej Palat', 'David Desharnais', 'Chris Kreider', 'Eric Brewer', 'Cory Sarich', 'Jake Muzzin'],
  GRH: ['Paul Stastny', 'Jonathan Huberdeau', 'P.A. Parenteau', 'Alexander Semin', 'Brandon Dubinsky', 'Dan Boyle', 'Jack Johnson', 'Radko Gudas'],
  HAM: ['Vladimir Tarasenko', 'Jaden Schwartz', 'Daniel Briere', 'David Backes', 'Troy Brouwer', 'Kimmo Timonen', 'Alex Goligoski', 'Jack Hillen'],
  HIG: ['Corey Perry', 'Sean Couturier', 'Carl Hagelin', 'Mark Stone', 'Cam Atkinson', 'Brent Seabrook', 'Niklas Hjalmarsson', 'Ryan Ellis'],
  ING: ['Teemu Selanne', 'Patrick Kane', 'Dainius Zubrus', 'Jaromir Jagr', 'Jamie Langenbrunner', 'Drew Doughty', 'Rostislav Klesla', 'Erik Karlsson'],
  ITA: ['Michael Grabner', 'Gustav Nyquist', 'Mats Zuccarello', 'Darren Helm', 'Andrew Cogliano', 'Tyson Barrie', 'T.J. Brodie', 'Braydon Coburn'],
  KAR: ['Evgeni Malkin', 'Alex Ovechkin', 'Brendan Gallagher', 'Blake Wheeler', 'Pavel Datsyuk', 'Oliver Ekman-Larsson', 'John Carlson', 'Brent Burns'],
  MHA: ['Alexander Steen', 'Jordan Staal', 'Ryan Kesler', 'Mike Richards', 'Ryan Smyth', 'Roman Hamrlik', 'Cody Franson', 'Ed Jovanovski'],
  MHT: ['Phil Kessel', 'Jean-Gabriel Pageau', 'Chris Stewart', 'Marian Gaborik', 'Jeff Skinner', 'Torey Krug', 'Justin Schultz', 'Cam Fowler'],
  MGG: ['Jarome Iginla', 'J.T. Miller', 'Mark Scheifele', 'Patrick Marleau', 'Ryan Getzlaf', 'Paul Martin', 'Chris Phillips', 'P.K. Subban'],
  NBK: ['Jordan Eberle', 'Jiri Hudler', 'Ray Whitney', 'Logan Couture', 'Claude Giroux', 'Duncan Keith', 'Ryan McDonagh', 'Roman Josi'],
  OCW: ['John Tavares', 'T.J. Oshie', 'Alex Galchenyuk', 'David Krejci', 'Patrice Bergeron', 'Shea Weber', 'Alex Pietrangelo', 'Keith Yandle'],
  PIT: ['Marian Hossa', 'Mika Zibanejad', 'Brad Marchand', 'Ryan Callahan', 'Jakob Silfverberg', 'Jordan Leopold', 'Erik Johnson', 'Tomas Kaberle'],
  PRO: ['Milan Hejduk', 'Chris Kunitz', 'Tomas Plekanec', 'Thomas Vanek', 'James Van Riemsdyk', 'Andrew Ference', 'Andy Greene', 'Hal Gill'],
  RIC: ['Cory Conacher', 'Max Pacioretty', 'Jason Pominville', 'Joe Thornton', 'Kyle Okposo', 'Derek Morris', 'Andrei Markov', 'Ryan Suter'],
  ROC: ['Ryan Nugent-Hopkins', 'Richard Panik', 'Nathan Horton', 'Bobby Ryan', 'Valtteri Filppula', 'Chris Pronger', 'Brian Campbell', 'Jonas Brodin'],
  SHS: ['Beau Bennett', 'Daniel Alfredsson', 'Jamie Benn', 'Eric Staal', 'Bryan Little', 'Marc-Edouard Vlasic', 'Justin Faulk', 'Kevin Shattenkirk'],
  SVF: ['Evander Kane', 'Shane Doan', 'Tyler Bozak', 'Brayden Schenn', 'Anze Kopitar', 'Jared Spurgeon', 'Zach Bogosian', 'Brayden McNabb'],
  SUM: ['Daniel Sedin', 'Henrik Sedin', 'Jiri Tlusty', 'Derek Stepan', 'Tyler Ennis', 'Niklas Kronwall', 'Marc Staal', 'Alec Martinez'],
  TAI: ['Vaclav Prospal', 'Matt Frattin', 'Taylor Hall', 'Mike Fisher', 'Matt Duchene', 'Lubomir Visnovsky', 'Tobias Enstrom', 'James Wisniewski'],
  TEG: ['Todd Bertuzzi', 'Mikael Granlund', 'Justin Williams', 'Nazem Kadri', 'Steven Stamkos', 'Brad Stuart', 'Matt Niskanen', 'Dion Phaneuf'],
  TBP: ['Anders Lee', 'Rick Nash', 'Milan Lucic', 'Jeff Carter', 'Patrik Elias', 'Anton Stralman', 'Chris Tanev', 'Alexander Edler'],
  VHV: ['Dustin Brown', 'David Perron', 'Ryan O\'Reilly', 'Mike Ribeiro', 'Mikko Koivu', 'Andrej Sekera', 'Willie Mitchell', 'Mark Streit'],
  WDY: ['Kyle Turris', 'Simon Gagne', 'Andrew Ladd', 'Jakub Voracek', 'Nicklas Backstrom', 'Mark Cundari', 'Grant Clitsome', 'Matt Carle'],
  ETI: ['Marcus Johansson', 'Nick Bonino', 'Michal Handzus', 'Alex Chiasson', 'Matt Kassian', 'Raphael Diaz', 'Bryce Salvador', 'Jay Rosehill']
};

export const O_LEAGUE_GOALIES: Record<string, string[]> = {
  BOS: ['Hal Winkler', 'Charles Stewart'],
  CHI: ['Hugh Lehman', '--'],
  DTC: ['Hap Holmes', 'Herb Stuart'],
  MTL: ['George Hainsworth', '--'],
  NYR: ['Lorne Chabot', '--'],
  TOR: ['John-Ross Roach', '--']
};

export const O_LEAGUE_SKATERS: Record<string, string[]> = {
  BOS: ['Percy Galbraith', 'Jimmy Herbert', 'Harry Oliver', 'Frank Fredrickson', 'Carson Cooper', 'Lionel Hitchman', 'Eddie Shore', 'Billy Stuart'],
  CHI: ['Babe Dye', 'George Hay', 'Dick Irvin', 'Mickey MacKay', 'Charley McVeigh', 'Bob Trapp', 'Percy Traub', 'Gord Fraser'],
  DTC: ['Duke Keats', 'Frank Foyston', 'Fred Gordon', 'Johnny Sheppard', 'Jack Walker', 'Jack Arbour', 'Art Duncan', 'Clem Loughlin'],
  MTL: ['Pit Lepine', 'Howie Morenz', 'Art Gagne', 'Aurele Joliat', 'Billy Boucher', 'Albert Leduc', 'Herb Gardiner', 'Sylvio Mantha'],
  NYR: ['Frank Boucher', 'Bill Cook', 'Bun Cook', 'Murray Murdoch', 'Paul Thompson', 'Reg Mackey', 'Stan Brown', 'Clarence Abel'],
  TOR: ['Ace Bailey', 'Bill Carson', 'George Patterson', 'Butch Keeling', 'Corb Denneny', 'Hap Day', 'Bert Corbeau', 'Bill Brydge']
};

const resolveTeamCode = (team: any): string => {
  if (!team) return '';
  const abbr = (team.abbreviation || '').trim().toUpperCase();
  if (abbr && (W_LEAGUE_SKATERS[abbr] || O_LEAGUE_SKATERS[abbr])) return abbr;
  
  const name = (team.team_name || '').trim().toUpperCase();
  for (const [code, alias] of Object.entries(TEAM_CITY_ALIASES)) {
    if (abbr === code || abbr === alias || name === alias || name.includes(alias) || name.includes(code)) {
      return code;
    }
  }
  return abbr || 'TM';
};

function formatDayFractionOrTime(val: any): string {
  if (val === null || val === undefined || val === '') return '0:00';
  const str = String(val).trim();
  if (str.includes(':')) {
    const parts = str.split(':');
    if (parts.length === 3) {
      const m = parseInt(parts[1], 10) + parseInt(parts[0], 10) * 60;
      return `${m}:${parts[2]}`;
    }
    return str;
  }
  const num = parseFloat(str);
  if (isNaN(num)) return '0:00';
  if (num === 0) return '0:00';
  if (num > 100) {
    return formatSecondsToMMSS(num);
  }
  const totalMinutes = num * 24 * 60;
  const mins = Math.floor(totalMinutes);
  const secs = Math.round((totalMinutes - mins) * 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function formatSecondsToMMSS(seconds: number | string): string {
  const s = typeof seconds === 'string' ? parseInt(seconds, 10) : seconds;
  if (isNaN(s) || s <= 0) return '0:00';
  const m = Math.floor(s / 60);
  const remS = s % 60;
  return `${m}:${remS < 10 ? '0' : ''}${remS}`;
}

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

// ==========================================
// 2. MAIN COMPONENT
// ==========================================

function TeamPageContent({ teamId }: { teamId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const seasonParam = searchParams.get('season');

  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(
    seasonParam ? Number(seasonParam) : null
  );
  const [allLeagueTeams, setAllLeagueTeams] = useState<any[]>([]);
  const [team, setTeam] = useState<any>(null);
  const [coachName, setCoachName] = useState<string>('TBA');
  const [coachId, setCoachId] = useState<number | null>(null);
  const [arenaName, setArenaName] = useState<string>('TBD');
  const [currentStanding, setCurrentStanding] = useState<any>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'roster' | 'schedule' | 'seasons' | 'records'>('roster');

  // Season Specific Data
  const [roster, setRoster] = useState<any[]>([]);
  const [playerStats, setPlayerStats] = useState<any[]>([]);
  const [scheduleGames, setScheduleGames] = useState<any[]>([]);

  // Coach Career Data Across ALL Seasons
  const [coachSeasonsStandings, setCoachSeasonsStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Boxscore Modal State
  const [selectedBoxscoreGame, setSelectedBoxscoreGame] = useState<any | null>(null);
  const [boxscoreTab, setBoxscoreTab] = useState<'summary' | 'team_stats' | 'skaters' | 'goalies' | 'scoring' | 'penalties'>('summary');
  const [boxscoreData, setBoxscoreData] = useState<{
    skaters: any[];
    goalies: any[];
    scoring: any[];
    penalties: any[];
    loading: boolean;
  }>({
    skaters: [],
    goalies: [],
    scoring: [],
    penalties: [],
    loading: false
  });

  // 1. Fetch seasons dynamically
  useEffect(() => {
    async function init() {
      try {
        let { data: seasonData, error } = await supabase
          .from('league_seasons')
          .select('*')
          .order('league_id', { ascending: false });

        if (error || !seasonData || seasonData.length === 0) {
          const fallback = await supabase
            .from('leagues')
            .select('*')
            .order('league_id', { ascending: false });

          if (fallback.data && fallback.data.length > 0) {
            seasonData = fallback.data.map((l: any) => ({
              ...l,
              league_id: l.league_id || l.id,
              season_name: l.league_name || l.name || `Season ${l.league_id || l.id}`
            }));
          }
        }

        const validSeasons = seasonData || [];
        setSeasons(validSeasons);

        if (seasonParam) {
          setSelectedSeason(Number(seasonParam));
        } else if (validSeasons.length > 0 && selectedSeason === null) {
          setSelectedSeason(Number(validSeasons[0].league_id));
        }
      } catch (e) {
        console.error("Seasons load error:", e);
      }
    }
    init();
  }, [seasonParam]);

  // 2. Fetch all teams once for opponent names/logos and cross-season tracking
  useEffect(() => {
    async function loadAllTeams() {
      const { data } = await supabase.from('league_teams').select('*');
      setAllLeagueTeams(data || []);
    }
    loadAllTeams();
  }, []);

  // 3. Fetch Team, Roster, Player Stats, Schedule & Coach All-Season Standings
  useEffect(() => {
    async function loadData() {
      if (!teamId || selectedSeason === null) return;
      setLoading(true);

      try {
        // A. Team Metadata for active season
        let { data: teamData } = await supabase
          .from('league_teams')
          .select('*')
          .eq('team_id', teamId)
          .eq('league_id', selectedSeason)
          .maybeSingle();

        if (!teamData) {
          const fallback = await supabase
            .from('league_teams')
            .select('*')
            .eq('team_id', teamId)
            .limit(1)
            .maybeSingle();
          teamData = fallback.data;
        }

        let resolvedCoachId: number | null = null;
        let resolvedCoachName = 'TBA';

        if (teamData) {
          setTeam(teamData);
          resolvedCoachId = teamData.coach_id ? Number(teamData.coach_id) : null;
          setCoachId(resolvedCoachId);

          // Parse Arena
          let parsedArena = teamData.arena || teamData.arena_name || '';
          if (!parsedArena && teamData.team_meta) {
            if (typeof teamData.team_meta === 'object') {
              parsedArena = teamData.team_meta.arena || teamData.team_meta.arena_name || teamData.team_meta.stadium || '';
            } else if (typeof teamData.team_meta === 'string') {
              try {
                const parsed = JSON.parse(teamData.team_meta);
                parsedArena = parsed.arena || parsed.arena_name || parsed.stadium || '';
              } catch {
                parsedArena = teamData.team_meta;
              }
            }
          }
          setArenaName(parsedArena || 'TBD');

          // Fetch Coach Name
          if (teamData.coach_id) {
            const { data: coachData } = await supabase
              .from('league_coaches')
              .select('coach_name')
              .eq('coach_id', teamData.coach_id)
              .maybeSingle();
            resolvedCoachName = coachData?.coach_name || teamData.coach_name || 'TBA';
          } else {
            resolvedCoachName = teamData.coach_name || 'TBA';
          }
          setCoachName(resolvedCoachName);
        }

        // B. Roster for this team in the selected season
        const { data: rosterData } = await supabase
          .from('league_rosters')
          .select('*')
          .eq('team_id', Number(teamId))
          .eq('league_id', Number(selectedSeason));

        setRoster(rosterData || []);

        // C. Player Stats for this season
        const { data: statsData } = await supabase
          .from('api_stats_with_names')
          .select('*')
          .eq('league_id', Number(selectedSeason));

        setPlayerStats(statsData || []);

        // D. Schedule & Gamestats for this team in the selected season
        const [schedRes, gamestatsRes] = await Promise.all([
          supabase
            .from('league_schedule')
            .select('*')
            .eq('league_id', Number(selectedSeason))
            .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
            .order('game_id', { ascending: true }),
          supabase
            .from('league_gamestats')
            .select('*')
            .eq('league_id', Number(selectedSeason))
            .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
            .order('game_id', { ascending: true })
        ]);

        const scheduleList = schedRes.data || [];
        const gamestatsList = gamestatsRes.data || [];

        // Merge schedule with actual results
        const mergedGames = scheduleList.map((sched: any) => {
          const matchedStats = gamestatsList.find((g: any) => String(g.game_id) === String(sched.game_id));
          const isHome = Number(sched.home_team_id) === Number(teamId);
          const oppId = isHome ? sched.away_team_id : sched.home_team_id;

          const homeScore = matchedStats?.home_score ?? sched.home_score ?? null;
          const awayScore = matchedStats?.away_score ?? sched.away_score ?? null;

          const teamScore = isHome ? homeScore : awayScore;
          const oppScore = isHome ? awayScore : homeScore;

          let outcome: 'W' | 'L' | 'T' | 'OTL' | '-' = '-';
          if (teamScore !== null && oppScore !== null) {
            let isOT = false;
            let isTie = false;
            const meta = matchedStats?.game_meta || sched.game_meta;
            if (meta) {
              try {
                const pMeta = typeof meta === 'string' ? JSON.parse(meta) : meta;
                isOT = pMeta.is_ot === true || pMeta.is_ot === 'true' || pMeta.is_ot === 1;
                isTie = pMeta.is_tie === true || pMeta.is_tie === 'true' || pMeta.is_tie === 1;
              } catch {}
            }
            if (teamScore === oppScore) {
              outcome = isOT ? 'OTL' : 'T';
            } else if (teamScore > oppScore) {
              outcome = 'W';
            } else {
              outcome = isOT ? 'OTL' : 'L';
            }
          }

          return {
            ...sched,
            stats: matchedStats || null,
            isHome,
            oppId,
            teamScore,
            oppScore,
            outcome,
            played: sched.played || matchedStats !== undefined
          };
        });

        // Add any played games in gamestats that weren't in schedule table
        gamestatsList.forEach((g: any) => {
          if (!mergedGames.some((m: any) => String(m.game_id) === String(g.game_id))) {
            const isHome = Number(g.home_team_id) === Number(teamId);
            const oppId = isHome ? g.away_team_id : g.home_team_id;
            const teamScore = isHome ? g.home_score : g.away_score;
            const oppScore = isHome ? g.away_score : g.home_score;
            let outcome: 'W' | 'L' | 'T' | 'OTL' | '-' = '-';
            if (teamScore !== null && oppScore !== null) {
              if (teamScore > oppScore) outcome = 'W';
              else if (teamScore < oppScore) outcome = 'L';
              else outcome = 'T';
            }
            mergedGames.push({
              game_id: g.game_id,
              league_id: selectedSeason,
              home_team_id: g.home_team_id,
              away_team_id: g.away_team_id,
              stats: g,
              isHome,
              oppId,
              teamScore,
              oppScore,
              outcome,
              played: true
            });
          }
        });

        setScheduleGames(mergedGames.sort((a: any, b: any) => Number(a.game_id) - Number(b.game_id)));

        // E. Standings for Current Season for this specific team
        const { data: currentStandRes } = await supabase
          .from('league_standings')
          .select('*')
          .eq('team_id', Number(teamId))
          .eq('season_id', Number(selectedSeason))
          .maybeSingle();

        setCurrentStanding(currentStandRes || null);

        // F. FETCH ALL SEASONS FOR THIS COACH (ACROSS ALL TEAMS)
        let coachTeamsList: any[] = [];
        if (resolvedCoachId) {
          const { data: cTeams } = await supabase
            .from('league_teams')
            .select('*')
            .eq('coach_id', resolvedCoachId);
          coachTeamsList = cTeams || [];
        }

        if (coachTeamsList.length === 0 && resolvedCoachName && resolvedCoachName !== 'TBA') {
          const { data: nameTeams } = await supabase
            .from('league_teams')
            .select('*')
            .ilike('coach_name', `%${resolvedCoachName}%`);
          if (nameTeams && nameTeams.length > 0) {
            coachTeamsList = nameTeams;
          }
        }

        if (coachTeamsList.length === 0 && teamData) {
          coachTeamsList = [teamData];
        }

        const coachTeamIds = Array.from(new Set(coachTeamsList.map((t: any) => Number(t.team_id))));

        const { data: coachAllStandingsData } = await supabase
          .from('league_standings')
          .select('*')
          .in('team_id', coachTeamIds);

        const mappedCoachStandings = (coachAllStandingsData || []).map((s: any) => {
          const matchingTeam = coachTeamsList.find((t: any) => 
            Number(t.team_id) === Number(s.team_id) && Number(t.league_id) === Number(s.season_id)
          ) || coachTeamsList.find((t: any) => Number(t.team_id) === Number(s.team_id))
            || teamData;

          const seasonObj = seasons.find((sea: any) => Number(sea.league_id) === Number(s.season_id));
          const sName = seasonObj?.season_name || `Season ${s.season_id}`;
          const sCode = formatSeasonBadge(s.season_id, sName);

          const w = Number(s.w) || 0;
          const l = Number(s.l) || 0;
          const t = Number(s.t) || 0;
          const otl = Number(s.otl) || 0;
          const pts = s.pts !== undefined ? Number(s.pts) : (w * 2 + otl + t);
          const gf = Number(s.gf) || 0;
          const ga = Number(s.ga) || 0;
          const gd = gf - ga;

          return {
            ...s,
            season_name: sName,
            season_code: sCode,
            team_id: matchingTeam?.team_id || s.team_id,
            team_name: matchingTeam?.team_name || teamData?.team_name || 'Team',
            logo_url: matchingTeam?.logo_url || teamData?.logo_url || '',
            w, l, t, otl, pts, gf, ga, gd
          };
        });

        setCoachSeasonsStandings(mappedCoachStandings);

      } catch (err) {
        console.error("Error loading team page data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [teamId, selectedSeason, seasons]);

  const handleSeasonChange = (newSeason: number, targetTeamId?: number) => {
    setSelectedSeason(newSeason);
    const destTeamId = targetTeamId || teamId;
    router.push(`/team/${destTeamId}?season=${newSeason}`);
  };

  // Helper map to find opponent team name & logo
  const opponentMap = useMemo(() => {
    const map: Record<number, { name: string; logo: string; abbr: string; coach: string }> = {};
    allLeagueTeams.forEach((t: any) => {
      map[Number(t.team_id)] = {
        name: t.team_name,
        logo: t.logo_url,
        abbr: t.abbreviation || t.team_name?.slice(0, 3) || 'TM',
        coach: t.coach_name || ''
      };
    });
    return map;
  }, [allLeagueTeams]);

  // Combine Roster with Player Stats
  const combinedRosterStats = useMemo(() => {
    return roster.map((p: any) => {
      const cleanName = (p.player_name || '').trim().toLowerCase();
      const matchedStat = playerStats.find((s: any) => {
        const sClean = (s.player_name || '').trim().toLowerCase();
        return (p.player_id && Number(s.player_id) === Number(p.player_id)) || (cleanName && sClean === cleanName);
      });

      return {
        ...p,
        gp: matchedStat?.gp ?? 0,
        goals: matchedStat?.total_goals ?? matchedStat?.goals ?? 0,
        assists: matchedStat?.total_assists ?? matchedStat?.assists ?? 0,
        points: matchedStat?.total_points ?? matchedStat?.points ?? 0,
        shots: matchedStat?.shots ?? 0,
        pim: matchedStat?.pim ?? 0,
        gaa: matchedStat?.gaa ?? null,
        sv_pct: matchedStat?.sv_pct ?? null,
        shutouts: matchedStat?.shutouts ?? 0,
        wins: matchedStat?.wins ?? 0,
        losses: matchedStat?.losses ?? 0
      };
    }).sort((a: any, b: any) => (b.points || 0) - (a.points || 0) || (b.overall || 0) - (a.overall || 0));
  }, [roster, playerStats]);

  // Skaters vs Goalies
  const skaters = useMemo(() => combinedRosterStats.filter((p: any) => (p.pos || '').toUpperCase() !== 'G'), [combinedRosterStats]);
  const goalies = useMemo(() => combinedRosterStats.filter((p: any) => (p.pos || '').toUpperCase() === 'G'), [combinedRosterStats]);

  // Comparative Coach Career Statistics & Records Across All Seasons
  const coachCareerRecords = useMemo(() => {
    if (coachSeasonsStandings.length === 0) return null;

    let totalGP = 0;
    let totalW = 0;
    let totalL = 0;
    let totalT = 0;
    let totalOTL = 0;
    let totalPTS = 0;
    let totalGF = 0;
    let totalGA = 0;

    let bestSeasonByPts: any = null;
    let bestSeasonByWins: any = null;
    let mostGFSeason: any = null;
    let bestGDSeason: any = null;

    coachSeasonsStandings.forEach((s: any) => {
      const gp = Number(s.gp) || 0;
      const w = Number(s.w) || 0;
      const l = Number(s.l) || 0;
      const t = Number(s.t) || 0;
      const otl = Number(s.otl) || 0;
      const pts = s.pts !== undefined ? Number(s.pts) : (w * 2 + otl + t);
      const gf = Number(s.gf) || 0;
      const ga = Number(s.ga) || 0;
      const gd = gf - ga;

      totalGP += gp;
      totalW += w;
      totalL += l;
      totalT += t;
      totalOTL += otl;
      totalPTS += pts;
      totalGF += gf;
      totalGA += ga;

      if (!bestSeasonByPts || pts > (bestSeasonByPts.pts || 0)) {
        bestSeasonByPts = { ...s, pts };
      }
      if (!bestSeasonByWins || w > (bestSeasonByWins.w || 0)) {
        bestSeasonByWins = { ...s, w };
      }
      if (!mostGFSeason || gf > (mostGFSeason.gf || 0)) {
        mostGFSeason = { ...s, gf };
      }
      if (!bestGDSeason || gd > (bestGDSeason.gd || 0)) {
        bestGDSeason = { ...s, gd };
      }
    });

    const winPct = totalGP > 0 ? ((totalW + totalT * 0.5) / totalGP).toFixed(3) : '.000';

    return {
      totalSeasons: coachSeasonsStandings.length,
      totalGP,
      totalW,
      totalL,
      totalT,
      totalOTL,
      totalPTS,
      totalGF,
      totalGA,
      winPct,
      bestSeasonByPts,
      bestSeasonByWins,
      mostGFSeason,
      bestGDSeason
    };
  }, [coachSeasonsStandings]);

  // Coach seasons list for the archive dropdown
  const coachSeasonsList = useMemo(() => {
    if (coachSeasonsStandings.length === 0) {
      return seasons.filter(s => Number(s.league_id) === Number(selectedSeason));
    }
    return [...coachSeasonsStandings].sort((a, b) => Number(b.season_id) - Number(a.season_id));
  }, [coachSeasonsStandings, seasons, selectedSeason]);

  // 4. Open and Fetch Boxscore for a Game
  async function handleOpenBoxscore(game: any) {
    if (!game || !game.played) return;
    setSelectedBoxscoreGame(game);
    setBoxscoreTab('summary');
    setBoxscoreData({ skaters: [], goalies: [], scoring: [], penalties: [], loading: true });

    try {
      const gId = game.game_id;
      const sId = selectedSeason || game.league_id;
      const hId = Number(game.home_team_id);
      const aId = Number(game.away_team_id);

      const [playerStatsRes, scoringRes, penaltiesRes, seasonRostersRes, teamRostersRes] = await Promise.all([
        supabase.from('league_player_stats_master').select('*').eq('game_id', gId),
        supabase.from('league_scoring').select('*').eq('game_id', gId).order('period', { ascending: true }),
        supabase.from('league_penalties').select('*').eq('game_id', gId).order('period', { ascending: true }),
        supabase.from('league_rosters').select('player_id, player_name, team_id, pos').eq('league_id', sId),
        supabase.from('league_rosters').select('player_id, player_name, team_id, pos').in('team_id', [hId, aId])
      ]);

      const rawPlayers = playerStatsRes.data || [];
      const scoringData = scoringRes.data || [];
      const penaltyData = penaltiesRes.data || [];

      const playerIds = Array.from(new Set(
        rawPlayers.map((p: any) => Number(p.player_id)).filter((id: number) => !isNaN(id) && id > 0)
      ));

      let playerDbRows: any[] = [];
      if (playerIds.length > 0) {
        const { data: dbData } = await supabase
          .from('league_player_database')
          .select('player_id, player_name, pos')
          .in('player_id', playerIds);
        playerDbRows = dbData || [];
      }

      const nameMap = new Map<number, string>();
      playerDbRows.forEach((p: any) => {
        if (p.player_id && p.player_name) nameMap.set(Number(p.player_id), String(p.player_name).trim());
      });
      (seasonRostersRes.data || []).forEach((r: any) => {
        if (r.player_id && r.player_name) nameMap.set(Number(r.player_id), String(r.player_name).trim());
      });
      (teamRostersRes.data || []).forEach((r: any) => {
        if (r.player_id && r.player_name) nameMap.set(Number(r.player_id), String(r.player_name).trim());
      });
      scoringData.forEach((g: any) => {
        if (g.scorer_id && g.scorer && !String(g.scorer).startsWith('Player #')) nameMap.set(Number(g.scorer_id), String(g.scorer).trim());
        if (g.assist1_id && g.assist1 && g.assist1 !== '--' && !String(g.assist1).startsWith('Player #')) nameMap.set(Number(g.assist1_id), String(g.assist1).trim());
        if (g.assist2_id && g.assist2 && g.assist2 !== '--' && !String(g.assist2).startsWith('Player #')) nameMap.set(Number(g.assist2_id), String(g.assist2).trim());
      });
      penaltyData.forEach((p: any) => {
        if (p.player_id && p.player && !String(p.player).startsWith('Player #')) nameMap.set(Number(p.player_id), String(p.player).trim());
      });

      const homeTeamObj = (hId === Number(team.team_id) ? team : allLeagueTeams.find(t => Number(t.team_id) === hId && Number(t.league_id) === Number(sId))) || allLeagueTeams.find(t => Number(t.team_id) === hId) || { team_id: hId, abbreviation: 'HOM', logo_url: '', team_name: 'Home' };
      const awayTeamObj = (aId === Number(team.team_id) ? team : allLeagueTeams.find(t => Number(t.team_id) === aId && Number(t.league_id) === Number(sId))) || allLeagueTeams.find(t => Number(t.team_id) === aId) || { team_id: aId, abbreviation: 'AWY', logo_url: '', team_name: 'Away' };

      const awayCode = resolveTeamCode(awayTeamObj);
      const homeCode = resolveTeamCode(homeTeamObj);

      const awaySkatersDict = W_LEAGUE_SKATERS[awayCode] || O_LEAGUE_SKATERS[awayCode] || [];
      const homeSkatersDict = W_LEAGUE_SKATERS[homeCode] || O_LEAGUE_SKATERS[homeCode] || [];
      const awayGoaliesDict = W_LEAGUE_GOALIES[awayCode] || O_LEAGUE_GOALIES[awayCode] || [];
      const homeGoaliesDict = W_LEAGUE_GOALIES[homeCode] || O_LEAGUE_GOALIES[homeCode] || [];

      const skatersList: any[] = [];
      const goaliesList: any[] = [];
      let awaySkaterIdx = 0, homeSkaterIdx = 0, awayGoalieIdx = 0, homeGoalieIdx = 0;

      rawPlayers.forEach((p: any) => {
        const pId = Number(p.player_id);
        const isGoalie = p.pos_played === 'G';
        const isAway = Number(p.team_id) === aId;
        const playerTeam = isAway ? awayTeamObj : homeTeamObj;
        const teamAbbr = playerTeam?.abbreviation || (isAway ? 'AWY' : 'HOM');
        const teamLogo = playerTeam?.logo_url || '';
        const teamName = playerTeam?.team_name || (isAway ? 'Away' : 'Home');

        let resolvedName = nameMap.get(pId) || p.player_name || '';
        if (!resolvedName || resolvedName.startsWith('Player #')) {
          if (isGoalie) {
            resolvedName = isAway ? (awayGoaliesDict[awayGoalieIdx] || '') : (homeGoaliesDict[homeGoalieIdx] || '');
          } else {
            resolvedName = isAway ? (awaySkatersDict[awaySkaterIdx] || '') : (homeSkatersDict[homeSkaterIdx] || '');
          }
        }
        if (!resolvedName) resolvedName = `Player #${pId || (isGoalie ? 'G' : 'F')}`;

        if (isGoalie) {
          if (isAway) awayGoalieIdx++; else homeGoalieIdx++;
          const shots = Number(p.shots_against || 0);
          const ga = Number(p.goals_against || 0);
          const saves = Number(p.saves || 0);
          const savePct = shots > 0 ? (saves / shots) : 0;
          const isWin = p.is_win === true || p.is_win === 1;
          const isLoss = p.is_loss === true || p.is_loss === 1;
          const isTie = p.is_tie === true || p.is_tie === 1;
          const isOtl = p.is_otl === true || p.is_otl === 1;

          goaliesList.push({
            ...p,
            name: resolvedName,
            teamId: p.team_id,
            teamAbbr,
            teamLogo,
            teamName,
            side: isAway ? 'Away' : 'Home',
            ga,
            saves,
            shots,
            savePct,
            so: ga === 0 && saves > 0 ? 1 : 0,
            decision: isWin ? 'W' : isLoss ? 'L' : isOtl ? 'OTL' : isTie ? 'T' : '-',
            toi: formatSecondsToMMSS(p.toi)
          });
        } else {
          if (isAway) awaySkaterIdx++; else homeSkaterIdx++;
          const g = Number(p.goals || 0);
          const a = Number(p.assists || 0);
          skatersList.push({
            ...p,
            name: resolvedName,
            pos: p.pos_played || 'F',
            teamId: p.team_id,
            teamAbbr,
            teamLogo,
            teamName,
            side: isAway ? 'Away' : 'Home',
            goals: g,
            assists: a,
            points: g + a,
            sog: Number(p.shots || 0),
            checks: Number(p.checks || 0),
            pim: Number(p.pim || 0),
            ppp: Number(p.pp_points || 0),
            shp: Number(p.sh_points || 0),
            toi: formatSecondsToMMSS(p.toi)
          });
        }
      });

      const scoringList = scoringData.map((goal: any, idx: number) => {
        const scorerId = Number(goal.scorer_id);
        const a1Id = goal.assist1_id ? Number(goal.assist1_id) : null;
        const a2Id = goal.assist2_id ? Number(goal.assist2_id) : null;
        const isGoalHome = Number(goal.team_id) === hId;
        const goalTeamObj = isGoalHome ? homeTeamObj : awayTeamObj;

        const scorerName = (goal.scorer && !String(goal.scorer).startsWith('Player #'))
          ? goal.scorer
          : (nameMap.get(scorerId) || goal.scorer || `Player #${scorerId}`);

        const a1Name = goal.assist1 && goal.assist1 !== '--' && !String(goal.assist1).startsWith('Player #')
          ? goal.assist1
          : (a1Id ? (nameMap.get(a1Id) || goal.assist1 || `Player #${a1Id}`) : '--');

        const a2Name = goal.assist2 && goal.assist2 !== '--' && !String(goal.assist2).startsWith('Player #')
          ? goal.assist2
          : (a2Id ? (nameMap.get(a2Id) || goal.assist2 || `Player #${a2Id}`) : '--');

        return {
          goalNum: idx + 1,
          period: goal.period,
          time: goal.time,
          team: goal.team || goalTeamObj?.abbreviation || (isGoalHome ? 'HOM' : 'AWY'),
          teamLogo: goalTeamObj?.logo_url || '',
          side: isGoalHome ? 'Home' : 'Away',
          scorer: scorerName,
          assist1: a1Name,
          assist2: a2Name,
          type: goal.way || 'EV'
        };
      });

      const penaltiesList = penaltyData.map((pen: any, idx: number) => {
        const pId = Number(pen.player_id);
        const isPenHome = Number(pen.team_id) === hId;
        const penTeamObj = isPenHome ? homeTeamObj : awayTeamObj;

        const pName = (pen.player && !String(pen.player).startsWith('Player #'))
          ? pen.player
          : (nameMap.get(pId) || pen.player || `Player #${pId}`);

        return {
          penNum: idx + 1,
          period: pen.period,
          time: pen.time,
          team: pen.team || penTeamObj?.abbreviation || (isPenHome ? 'HOM' : 'AWY'),
          teamLogo: penTeamObj?.logo_url || '',
          side: isPenHome ? 'Home' : 'Away',
          player: pName,
          type: pen.penalty_type || 'Penalty'
        };
      });

      setBoxscoreData({
        skaters: skatersList,
        goalies: goaliesList,
        scoring: scoringList,
        penalties: penaltiesList,
        loading: false
      });
    } catch (err) {
      console.error("Boxscore load error:", err);
      setBoxscoreData({ skaters: [], goalies: [], scoring: [], penalties: [], loading: false });
    }
  }

  // Extract Home / Away Stats JSON Objects for Boxscore
  const boxscoreHomeStats = useMemo(() => {
    if (!selectedBoxscoreGame?.stats?.home_stats) return {};
    const raw = selectedBoxscoreGame.stats.home_stats;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }, [selectedBoxscoreGame]);

  const boxscoreAwayStats = useMemo(() => {
    if (!selectedBoxscoreGame?.stats?.away_stats) return {};
    const raw = selectedBoxscoreGame.stats.away_stats;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }, [selectedBoxscoreGame]);

  // Compute Period & Shot Metrics for Period Table
  const boxscorePeriodSummary = useMemo(() => {
    if (!selectedBoxscoreGame?.played) return null;
    const h = boxscoreHomeStats;
    const a = boxscoreAwayStats;

    const awayG1 = Number(a.away_1st_goals || 0);
    const awayG2 = Number(a.away_2nd_goals || 0);
    const awayG3 = Number(a.away_3rd_goals || 0);
    const awayGOT = Number(a.away_ot_goals || 0);
    const awayTotalG = selectedBoxscoreGame.isHome ? selectedBoxscoreGame.oppScore : selectedBoxscoreGame.teamScore;

    const homeG1 = Number(h.home_1st_goals || 0);
    const homeG2 = Number(h.home_2nd_goals || 0);
    const homeG3 = Number(h.home_3rd_goals || 0);
    const homeGOT = Number(h.home_ot_goals || 0);
    const homeTotalG = selectedBoxscoreGame.isHome ? selectedBoxscoreGame.teamScore : selectedBoxscoreGame.oppScore;

    const awayS1 = Number(a.away_1st_shots || 0);
    const awayS2 = Number(a.away_2nd_shots || 0);
    const awayS3 = Number(a.away_3rd_shots || 0);
    const awaySOT = Number(a.away_ot_shots || 0);
    const awayTotalShots = Number(a.away_shots || (awayS1 + awayS2 + awayS3 + awaySOT));

    const homeS1 = Number(h.home_1st_shots || 0);
    const homeS2 = Number(h.home_2nd_shots || 0);
    const homeS3 = Number(h.home_3rd_shots || 0);
    const homeSOT = Number(h.home_ot_shots || 0);
    const homeTotalShots = Number(h.home_shots || (homeS1 + homeS2 + homeS3 + homeSOT));

    return {
      away: { g1: awayG1, g2: awayG2, g3: awayG3, got: awayGOT, totalG: awayTotalG, totalS: awayTotalShots },
      home: { g1: homeG1, g2: homeG2, g3: homeG3, got: homeGOT, totalG: homeTotalG, totalS: homeTotalShots }
    };
  }, [selectedBoxscoreGame, boxscoreHomeStats, boxscoreAwayStats]);

  if (loading) return <div className="p-8 font-serif italic text-sm text-center">Loading Gazette Team & Coach Archives...</div>;
  if (!team) return <div className="p-8 font-serif italic text-sm text-center">Team file not found.</div>;

  const currentSeasonName = seasons.find(s => Number(s.league_id) === Number(selectedSeason))?.season_name || `Season ${selectedSeason}`;
  const currentSeasonBadge = formatSeasonBadge(selectedSeason || '', currentSeasonName);

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-black font-serif p-4 sm:p-6">
      {/* 1. Header Banner */}
      <header className="border-b-4 border-black pb-6 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white border-2 border-black p-2 flex items-center justify-center rounded shadow-sm">
              <img src={team.logo_url} alt={team.team_name} className="max-h-full max-w-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter">{team.team_name}</h1>
                <span className="bg-black text-white px-2 py-0.5 text-xs font-bold uppercase rounded">
                  {currentSeasonBadge}
                </span>
              </div>
              <p className="text-xs font-bold uppercase italic mt-1 text-gray-700">
                Official Gazette Team Roster & Coach Career Archives
              </p>
            </div>
          </div>
          <Link
            href="/team"
            className="bg-black text-white border-2 border-black px-4 py-2 text-xs font-black uppercase hover:bg-neutral-800 transition shadow-xs flex items-center gap-1.5 self-start md:self-center cursor-pointer"
          >
            &larr; Return to Teams
          </Link>
        </div>

        {/* Season Selector & Key Info Pills */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 bg-white/80 border border-black/20 p-3 rounded">
          <div className="flex items-center gap-3">
            <label className="text-xs uppercase font-black">Archive Season:</label>
            <select
              value={selectedSeason || ""}
              onChange={(e) => {
                const chosenSeasonId = Number(e.target.value);
                const chosenRecord = coachSeasonsList.find(s => Number(s.season_id) === chosenSeasonId);
                handleSeasonChange(chosenSeasonId, chosenRecord?.team_id ? Number(chosenRecord.team_id) : undefined);
              }}
              className="bg-white border-2 border-black px-3 py-1 text-xs font-black uppercase cursor-pointer outline-none"
            >
              {coachSeasonsList.map(s => {
                const sBadge = s.season_code || s.season_name || `Season ${s.season_id}`;
                const tName = s.team_name ? ` - ${s.team_name}` : '';
                return (
                  <option key={`${s.season_id}-${s.team_id}`} value={s.season_id}>
                    {sBadge}{tName}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Team & Coach Summary Pills with Black Lettering */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-bold uppercase">
            <Link
              href={`/managers?q=${encodeURIComponent(coachName)}`}
              className="bg-black text-white hover:bg-red-800 px-2.5 py-1 rounded transition-colors flex items-center gap-1"
              title={`View ${coachName} in Managers Directory`}
            >
              Coach: {coachName} &rarr;
            </Link>
            <span className="bg-black text-white px-2.5 py-1 rounded">
              Arena: {arenaName}
            </span>
            {currentStanding && (
              <span className="bg-yellow-400 text-black px-2.5 py-1 rounded font-black border border-black">
                Season: {currentStanding.w}-{currentStanding.l}-{currentStanding.t}-{currentStanding.otl} ({currentStanding.pts} pts)
              </span>
            )}
            {coachCareerRecords && (
              <span className="bg-white text-black px-2.5 py-1 rounded font-black border-2 border-black shadow-xs">
                Coach Career: {coachCareerRecords.totalW}-{coachCareerRecords.totalL}-{coachCareerRecords.totalT}-{coachCareerRecords.totalOTL} ({coachCareerRecords.totalPTS} pts)
              </span>
            )}
          </div>
        </div>
      </header>

      {/* 2. Navigation Tabs */}
      <nav className="flex flex-wrap gap-2 border-b-2 border-black pb-2 mb-6">
        <button
          onClick={() => setActiveTab('roster')}
          className={`px-4 py-2 text-xs font-black uppercase transition border border-black cursor-pointer ${
            activeTab === 'roster' ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'
          }`}
        >
          Roster & Stats ({roster.length})
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2 text-xs font-black uppercase transition border border-black cursor-pointer ${
            activeTab === 'schedule' ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'
          }`}
        >
          Schedule & Results ({scheduleGames.length})
        </button>
        <button
          onClick={() => setActiveTab('seasons')}
          className={`px-4 py-2 text-xs font-black uppercase transition border border-black cursor-pointer ${
            activeTab === 'seasons' ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'
          }`}
        >
          Coach All-Time Season Log ({coachSeasonsStandings.length} Seasons)
        </button>
        <button
          onClick={() => setActiveTab('records')}
          className={`px-4 py-2 text-xs font-black uppercase transition border border-black cursor-pointer ${
            activeTab === 'records' ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'
          }`}
        >
          Coach Career Records & Bests
        </button>
      </nav>

      {/* 3. Tab Contents */}

      {/* TAB 1: ROSTER & PLAYER STATS */}
      {activeTab === 'roster' && (
        <div className="space-y-8">
          {/* Skaters Table */}
          <section className="bg-white border-2 border-black p-4 shadow-sm">
            <h2 className="text-xl font-black uppercase tracking-tight mb-3 pb-2 border-b-2 border-black flex justify-between items-center">
              <span>{currentSeasonName} Skaters</span>
              <span className="text-xs font-bold text-gray-500">{skaters.length} Players</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-black text-white uppercase text-[10px] font-black">
                    <th className="p-2">#</th>
                    <th className="p-2">Player Name</th>
                    <th className="p-2 text-center">Pos</th>
                    <th className="p-2 text-center">Ovr</th>
                    <th className="p-2 text-center">GP</th>
                    <th className="p-2 text-center">G</th>
                    <th className="p-2 text-center">A</th>
                    <th className="p-2 text-center font-black bg-gray-900">PTS</th>
                    <th className="p-2 text-center">SOG</th>
                    <th className="p-2 text-center">PIM</th>
                  </tr>
                </thead>
                <tbody>
                  {skaters.length > 0 ? (
                    skaters.map((p, idx) => (
                      <tr key={p.roster_id || idx} className={`border-b border-gray-200 font-bold hover:bg-yellow-50 ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                        <td className="p-2 text-gray-600">{p.jersey_number || '-'}</td>
                        <td className="p-2 uppercase font-black text-black">{p.player_name || 'Unknown'}</td>
                        <td className="p-2 text-center">{p.pos || '-'}</td>
                        <td className="p-2 text-center text-blue-700 font-black">{p.overall || '-'}</td>
                        <td className="p-2 text-center">{p.gp}</td>
                        <td className="p-2 text-center">{p.goals}</td>
                        <td className="p-2 text-center">{p.assists}</td>
                        <td className="p-2 text-center font-black bg-gray-100 text-black">{p.points}</td>
                        <td className="p-2 text-center">{p.shots}</td>
                        <td className="p-2 text-center">{p.pim}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="p-4 text-center text-xs font-bold uppercase italic text-gray-500">
                        No skater records found for {currentSeasonName}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Goalies Table */}
          {goalies.length > 0 && (
            <section className="bg-white border-2 border-black p-4 shadow-sm">
              <h2 className="text-xl font-black uppercase tracking-tight mb-3 pb-2 border-b-2 border-black flex justify-between items-center">
                <span>{currentSeasonName} Goalies</span>
                <span className="text-xs font-bold text-gray-500">{goalies.length} Goalies</span>
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-black text-white uppercase text-[10px] font-black">
                      <th className="p-2">#</th>
                      <th className="p-2">Goalie Name</th>
                      <th className="p-2 text-center">Pos</th>
                      <th className="p-2 text-center">Ovr</th>
                      <th className="p-2 text-center">GP</th>
                      <th className="p-2 text-center">W</th>
                      <th className="p-2 text-center">L</th>
                      <th className="p-2 text-center">GAA</th>
                      <th className="p-2 text-center">SV%</th>
                      <th className="p-2 text-center">SO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {goalies.map((p, idx) => (
                      <tr key={p.roster_id || idx} className={`border-b border-gray-200 font-bold hover:bg-yellow-50 ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                        <td className="p-2 text-gray-600">{p.jersey_number || '-'}</td>
                        <td className="p-2 uppercase font-black text-black">{p.player_name || 'Unknown'}</td>
                        <td className="p-2 text-center">{p.pos || 'G'}</td>
                        <td className="p-2 text-center text-blue-700 font-black">{p.overall || '-'}</td>
                        <td className="p-2 text-center">{p.gp}</td>
                        <td className="p-2 text-center">{p.wins}</td>
                        <td className="p-2 text-center">{p.losses}</td>
                        <td className="p-2 text-center">{p.gaa != null ? Number(p.gaa).toFixed(2) : '-'}</td>
                        <td className="p-2 text-center">{p.sv_pct != null ? Number(p.sv_pct).toFixed(3) : '-'}</td>
                        <td className="p-2 text-center">{p.shutouts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {/* TAB 2: SCHEDULE & RESULTS */}
      {activeTab === 'schedule' && (
        <section className="bg-white border-2 border-black p-4 shadow-sm">
          <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-4">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">
                {currentSeasonName} Schedule & Game Logs
              </h2>
              <p className="text-xs font-bold text-gray-600 uppercase italic mt-0.5">
                Click on any played game or click &quot;Boxscore&quot; to view the full game summary & player stats.
              </p>
            </div>
            <span className="text-xs font-bold uppercase text-gray-600">
              {scheduleGames.filter(g => g.played).length} Played / {scheduleGames.length} Total
            </span>
          </div>

          {scheduleGames.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-black text-white uppercase text-[10px] font-black">
                    <th className="p-2">Game #</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Opponent</th>
                    <th className="p-2 text-center">Score</th>
                    <th className="p-2 text-center">Result</th>
                    <th className="p-2 text-center">Status</th>
                    <th className="p-2 text-center">Boxscore</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleGames.map((game, idx) => {
                    const opp = opponentMap[Number(game.oppId)] || {
                      name: `Team #${game.oppId}`,
                      logo: '',
                      abbr: `TM${game.oppId}`,
                      coach: ''
                    };

                    let badgeColor = 'bg-gray-200 text-gray-700';
                    if (game.outcome === 'W') badgeColor = 'bg-green-600 text-white';
                    if (game.outcome === 'L') badgeColor = 'bg-red-600 text-white';
                    if (game.outcome === 'T') badgeColor = 'bg-blue-600 text-white';
                    if (game.outcome === 'OTL') badgeColor = 'bg-amber-600 text-white';

                    return (
                      <tr
                        key={game.game_id || idx}
                        onClick={() => game.played && handleOpenBoxscore(game)}
                        className={`border-b border-gray-200 font-bold transition ${
                          game.played ? 'cursor-pointer hover:bg-yellow-100' : 'hover:bg-gray-50'
                        } ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                      >
                        <td className="p-2 text-gray-600 font-mono">#{game.game_id || idx + 1}</td>
                        <td className="p-2 uppercase text-[11px]">
                          {game.isHome ? (
                            <span className="bg-gray-200 text-black px-1.5 py-0.5 rounded font-black">HOME</span>
                          ) : (
                            <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-black">AWAY</span>
                          )}
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            {opp.logo && (
                              <img src={opp.logo} alt={opp.name} className="w-5 h-5 object-contain flex-shrink-0" />
                            )}
                            <Link
                              href={`/team/${game.oppId}?season=${selectedSeason}`}
                              onClick={(e) => e.stopPropagation()}
                              className="uppercase hover:underline text-black font-black"
                            >
                              {opp.name}
                            </Link>
                          </div>
                        </td>
                        <td className="p-2 text-center font-mono font-black text-sm">
                          {game.played && game.teamScore !== null && game.oppScore !== null ? (
                            <span>{game.teamScore} - {game.oppScore}</span>
                          ) : (
                            <span className="text-gray-400 font-normal">--</span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          {game.outcome !== '-' ? (
                            <span className={`px-2 py-0.5 text-[10px] font-black rounded ${badgeColor}`}>
                              {game.outcome}
                            </span>
                          ) : (
                            <span className="text-gray-400 font-normal">-</span>
                          )}
                        </td>
                        <td className="p-2 text-center uppercase text-[10px]">
                          {game.played ? (
                            <span className="text-green-700 font-black">FINAL</span>
                          ) : (
                            <span className="text-gray-500 italic">UPCOMING</span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          {game.played ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenBoxscore(game);
                              }}
                              className="bg-black text-white hover:bg-neutral-800 px-2.5 py-1 text-[10px] font-black uppercase rounded transition shadow-2xs cursor-pointer inline-flex items-center gap-1"
                            >
                              Boxscore &rarr;
                            </button>
                          ) : (
                            <span className="text-gray-400 text-xs font-mono">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-xs font-bold uppercase italic text-gray-500">
              No schedule games recorded for {currentSeasonName}.
            </div>
          )}
        </section>
      )}

      {/* TAB 3: COACH ALL-TIME SEASON LOG (ACROSS ALL SEASONS & TEAMS) */}
      {activeTab === 'seasons' && (
        <section className="bg-white border-2 border-black p-4 shadow-sm">
          <div className="border-b-2 border-black pb-2 mb-4">
            <h2 className="text-xl font-black uppercase tracking-tight">
              All-Time Career Seasons for Coach: {coachName}
            </h2>
            <p className="text-xs font-bold uppercase italic text-gray-600 mt-0.5">
              Historical records across all seasons & teams coached by {coachName}. Click any season to load that team archive.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-black text-white uppercase text-[10px] font-black">
                  <th className="p-2">Season</th>
                  <th className="p-2">Team Coached</th>
                  <th className="p-2 text-center">GP</th>
                  <th className="p-2 text-center">W</th>
                  <th className="p-2 text-center">L</th>
                  <th className="p-2 text-center">T</th>
                  <th className="p-2 text-center">OTL</th>
                  <th className="p-2 text-center font-black bg-gray-900">PTS</th>
                  <th className="p-2 text-center">GF</th>
                  <th className="p-2 text-center">GA</th>
                  <th className="p-2 text-center">Diff</th>
                  <th className="p-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {coachSeasonsStandings.length > 0 ? (
                  coachSeasonsStandings
                    .sort((a, b) => Number(b.season_id) - Number(a.season_id))
                    .map((s, idx) => {
                      const isCurrent = Number(s.season_id) === Number(selectedSeason) && Number(s.team_id) === Number(teamId);
                      const w = Number(s.w) || 0;
                      const l = Number(s.l) || 0;
                      const t = Number(s.t) || 0;
                      const otl = Number(s.otl) || 0;
                      const pts = s.pts !== undefined ? Number(s.pts) : (w * 2 + otl + t);
                      const gf = Number(s.gf) || 0;
                      const ga = Number(s.ga) || 0;
                      const diff = gf - ga;

                      return (
                        <tr
                          key={`${s.season_id}-${s.team_id || idx}`}
                          onClick={() => handleSeasonChange(Number(s.season_id), Number(s.team_id))}
                          className={`border-b border-gray-200 font-bold cursor-pointer transition ${
                            isCurrent
                              ? 'bg-yellow-200 border-2 border-black font-black'
                              : idx % 2 === 0 ? 'bg-gray-50 hover:bg-yellow-50' : 'bg-white hover:bg-yellow-50'
                          }`}
                        >
                          <td className="p-2 uppercase flex items-center gap-2">
                            <span className="font-black">{s.season_code || s.season_name}</span>
                            {isCurrent && (
                              <span className="bg-black text-white text-[9px] px-1.5 py-0.5 rounded font-black">
                                ACTIVE
                              </span>
                            )}
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              {s.logo_url && (
                                <img src={s.logo_url} alt={s.team_name} className="w-5 h-5 object-contain flex-shrink-0" />
                              )}
                              <span className="font-black uppercase text-black">{s.team_name}</span>
                            </div>
                          </td>
                          <td className="p-2 text-center">{s.gp || (w + l + t + otl)}</td>
                          <td className="p-2 text-center">{w}</td>
                          <td className="p-2 text-center">{l}</td>
                          <td className="p-2 text-center">{t}</td>
                          <td className="p-2 text-center">{otl}</td>
                          <td className="p-2 text-center font-black bg-gray-100 text-black">{pts}</td>
                          <td className="p-2 text-center">{gf}</td>
                          <td className="p-2 text-center">{ga}</td>
                          <td className={`p-2 text-center font-black ${diff > 0 ? 'text-green-700' : diff < 0 ? 'text-red-700' : 'text-gray-500'}`}>
                            {diff > 0 ? `+${diff}` : diff}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSeasonChange(Number(s.season_id), Number(s.team_id));
                              }}
                              className={`text-[10px] uppercase font-black px-2 py-0.5 border border-black rounded transition cursor-pointer ${
                                isCurrent ? 'bg-black text-white' : 'bg-white hover:bg-black hover:text-white'
                              }`}
                            >
                              {isCurrent ? 'Viewing' : 'Select'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                ) : (
                  <tr>
                    <td colSpan={12} className="p-4 text-center text-xs font-bold uppercase italic text-gray-500">
                      No career standings archived for coach {coachName}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 4: COACH CAREER RECORDS & ALL-TIME BESTS */}
      {activeTab === 'records' && coachCareerRecords && (
        <div className="space-y-6">
          {/* Summary Box */}
          <div className="bg-white border-2 border-black p-6 shadow-sm">
            <h2 className="text-2xl font-black uppercase tracking-tight border-b-2 border-black pb-2 mb-4">
              Coach Career Totals & All-Time Highs ({coachName})
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 text-center">
              <div className="border border-black p-3 bg-gray-50">
                <p className="text-[10px] font-black uppercase text-gray-600">Seasons Coached</p>
                <p className="text-2xl font-black">{coachCareerRecords.totalSeasons}</p>
              </div>
              <div className="border border-black p-3 bg-gray-50">
                <p className="text-[10px] font-black uppercase text-gray-600">Career Record</p>
                <p className="text-xl font-black">{coachCareerRecords.totalW}-{coachCareerRecords.totalL}-{coachCareerRecords.totalT}-{coachCareerRecords.totalOTL}</p>
              </div>
              <div className="border border-black p-3 bg-gray-50">
                <p className="text-[10px] font-black uppercase text-gray-600">Career Points</p>
                <p className="text-2xl font-black text-blue-700">{coachCareerRecords.totalPTS}</p>
              </div>
              <div className="border border-black p-3 bg-gray-50">
                <p className="text-[10px] font-black uppercase text-gray-600">Career Win %</p>
                <p className="text-2xl font-black text-green-700">{coachCareerRecords.winPct}</p>
              </div>
            </div>

            {/* Coach Career Highs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-black p-4 bg-white">
                <h3 className="text-xs font-black uppercase text-gray-500 mb-1">Most Points in a Single Season</h3>
                <p className="text-2xl font-black text-black">
                  {coachCareerRecords.bestSeasonByPts?.pts || 0} PTS
                </p>
                <p className="text-xs font-bold text-gray-700 uppercase mt-1">
                  Achieved in {coachCareerRecords.bestSeasonByPts?.season_code || `Season ${coachCareerRecords.bestSeasonByPts?.season_id}`} with {coachCareerRecords.bestSeasonByPts?.team_name} ({coachCareerRecords.bestSeasonByPts?.w} Wins)
                </p>
              </div>

              <div className="border border-black p-4 bg-white">
                <h3 className="text-xs font-black uppercase text-gray-500 mb-1">Most Wins in a Single Season</h3>
                <p className="text-2xl font-black text-black">
                  {coachCareerRecords.bestSeasonByWins?.w || 0} Wins
                </p>
                <p className="text-xs font-bold text-gray-700 uppercase mt-1">
                  Achieved in {coachCareerRecords.bestSeasonByWins?.season_code || `Season ${coachCareerRecords.bestSeasonByWins?.season_id}`} with {coachCareerRecords.bestSeasonByWins?.team_name}
                </p>
              </div>

              <div className="border border-black p-4 bg-white">
                <h3 className="text-xs font-black uppercase text-gray-500 mb-1">Most Goals Scored in a Season</h3>
                <p className="text-2xl font-black text-black">
                  {coachCareerRecords.mostGFSeason?.gf || 0} Goals
                </p>
                <p className="text-xs font-bold text-gray-700 uppercase mt-1">
                  Achieved in {coachCareerRecords.mostGFSeason?.season_code || `Season ${coachCareerRecords.mostGFSeason?.season_id}`} with {coachCareerRecords.mostGFSeason?.team_name}
                </p>
              </div>

              <div className="border border-black p-4 bg-white">
                <h3 className="text-xs font-black uppercase text-gray-500 mb-1">Best Goal Differential</h3>
                <p className="text-2xl font-black text-green-700">
                  +{coachCareerRecords.bestGDSeason?.gd || 0} Diff
                </p>
                <p className="text-xs font-bold text-gray-700 uppercase mt-1">
                  Achieved in {coachCareerRecords.bestGDSeason?.season_code || `Season ${coachCareerRecords.bestGDSeason?.season_id}`} with {coachCareerRecords.bestGDSeason?.team_name}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Return to Teams navigation */}
      <div className="mt-10 pt-6 border-t-2 border-black flex flex-col sm:flex-row justify-between items-center gap-4">
        <Link
          href="/team"
          className="bg-black text-white border-2 border-black px-5 py-2 text-xs font-black uppercase hover:bg-neutral-800 transition shadow-sm inline-flex items-center gap-2 cursor-pointer"
        >
          &larr; Return to All Teams Directory
        </Link>
        <span className="text-xs font-bold uppercase italic text-gray-600">
          Official NHL95 League Gazette Archive
        </span>
      </div>

      {/* ==================================================== */}
      {/* 4. MODAL: INTERACTIVE GAZETTE GAME BOXSCORE          */}
      {/* ==================================================== */}
      {selectedBoxscoreGame && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto backdrop-blur-xs animate-fadeIn">
          <div
            className="bg-white border-4 border-black w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden rounded-xs text-black font-serif"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-black text-white p-4 sm:p-5 flex items-center justify-between border-b-4 border-black">
              <div className="flex items-center gap-3">
                <span className="bg-yellow-400 text-black px-2 py-0.5 text-xs font-black uppercase rounded">
                  Game #{selectedBoxscoreGame.game_id}
                </span>
                <h3 className="text-base sm:text-xl font-black uppercase tracking-tight">
                  Official Gazette Boxscore
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBoxscoreGame(null)}
                className="text-white hover:bg-white hover:text-black border-2 border-white px-2.5 py-0.5 text-xs font-black uppercase transition cursor-pointer"
              >
                &times; Close
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-6">
              {/* Scoreboard Banner */}
              {(() => {
                const isTeamHome = selectedBoxscoreGame.isHome;
                const homeTeamData = isTeamHome
                  ? team
                  : (allLeagueTeams.find(t => Number(t.team_id) === Number(selectedBoxscoreGame.home_team_id)) || opponentMap[Number(selectedBoxscoreGame.oppId)]);
                const awayTeamData = !isTeamHome
                  ? team
                  : (allLeagueTeams.find(t => Number(t.team_id) === Number(selectedBoxscoreGame.away_team_id)) || opponentMap[Number(selectedBoxscoreGame.oppId)]);

                const homeScore = isTeamHome ? selectedBoxscoreGame.teamScore : selectedBoxscoreGame.oppScore;
                const awayScore = !isTeamHome ? selectedBoxscoreGame.teamScore : selectedBoxscoreGame.oppScore;

                return (
                  <div className="bg-black text-white p-4 sm:p-6 border-2 border-black rounded shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      {/* Away Team */}
                      <div className="flex items-center gap-3 text-center sm:text-left">
                        {awayTeamData?.logo_url && (
                          <img
                            src={awayTeamData.logo_url}
                            alt="Away Logo"
                            className="w-12 h-12 object-contain bg-white/10 p-1 rounded border border-white/20"
                          />
                        )}
                        <div>
                          <div className="text-[10px] uppercase font-bold text-gray-400">Away</div>
                          <div className="text-xl sm:text-2xl font-black uppercase">{awayTeamData?.name || awayTeamData?.team_name || 'Away'}</div>
                          <div className="text-xs text-yellow-300 font-mono">
                            {boxscorePeriodSummary?.away.totalS || 0} SOG
                          </div>
                        </div>
                        <div className="text-4xl font-mono font-black text-yellow-400 ml-2">
                          {awayScore}
                        </div>
                      </div>

                      {/* Center Final Badge */}
                      <div className="text-center px-4 py-2 border-y sm:border-y-0 sm:border-x border-white/20">
                        <span className="text-xs font-black uppercase tracking-widest text-yellow-400 bg-black px-2 py-0.5 border border-yellow-400 rounded">
                          FINAL
                        </span>
                        <div className="text-xs text-gray-300 font-mono mt-1">
                          {formatSeasonBadge(selectedSeason || '')} • Game #{selectedBoxscoreGame.game_id}
                        </div>
                        {selectedBoxscoreGame.stats?.game_length && (
                          <div className="text-[11px] text-gray-400 font-mono">
                            Time: {formatDayFractionOrTime(selectedBoxscoreGame.stats.game_length)}
                          </div>
                        )}
                      </div>

                      {/* Home Team */}
                      <div className="flex items-center gap-3 text-center sm:text-right flex-row-reverse sm:flex-row">
                        <div className="text-4xl font-mono font-black text-yellow-400 mr-2">
                          {homeScore}
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-bold text-gray-400">Home</div>
                          <div className="text-xl sm:text-2xl font-black uppercase">{homeTeamData?.name || homeTeamData?.team_name || 'Home'}</div>
                          <div className="text-xs text-yellow-300 font-mono">
                            {boxscorePeriodSummary?.home.totalS || 0} SOG
                          </div>
                        </div>
                        {homeTeamData?.logo_url && (
                          <img
                            src={homeTeamData.logo_url}
                            alt="Home Logo"
                            className="w-12 h-12 object-contain bg-white/10 p-1 rounded border border-white/20"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Period by Period Summary Table */}
              {boxscorePeriodSummary && (
                <div className="bg-[#faf8f5] border-2 border-black p-3 overflow-x-auto shadow-2xs">
                  <table className="w-full text-xs font-mono text-center">
                    <thead>
                      <tr className="border-b border-black/20 text-gray-600 font-sans uppercase font-bold text-[11px]">
                        <th className="text-left py-1">Period Breakdown</th>
                        <th>1st</th>
                        <th>2nd</th>
                        <th>3rd</th>
                        {boxscorePeriodSummary.away.got > 0 || boxscorePeriodSummary.home.got > 0 ? <th>OT</th> : null}
                        <th className="font-black bg-yellow-100">Total Goals</th>
                        <th className="font-bold">Total SOG</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-black/10">
                        <td className="text-left font-bold font-sans py-1">
                          {!selectedBoxscoreGame.isHome ? team.team_name : (opponentMap[Number(selectedBoxscoreGame.oppId)]?.name || 'Away')}
                        </td>
                        <td>{boxscorePeriodSummary.away.g1}</td>
                        <td>{boxscorePeriodSummary.away.g2}</td>
                        <td>{boxscorePeriodSummary.away.g3}</td>
                        {boxscorePeriodSummary.away.got > 0 || boxscorePeriodSummary.home.got > 0 ? <td>{boxscorePeriodSummary.away.got}</td> : null}
                        <td className="font-black text-sm bg-yellow-100">{boxscorePeriodSummary.away.totalG}</td>
                        <td className="text-gray-600">{boxscorePeriodSummary.away.totalS}</td>
                      </tr>
                      <tr>
                        <td className="text-left font-bold font-sans py-1">
                          {selectedBoxscoreGame.isHome ? team.team_name : (opponentMap[Number(selectedBoxscoreGame.oppId)]?.name || 'Home')}
                        </td>
                        <td>{boxscorePeriodSummary.home.g1}</td>
                        <td>{boxscorePeriodSummary.home.g2}</td>
                        <td>{boxscorePeriodSummary.home.g3}</td>
                        {boxscorePeriodSummary.away.got > 0 || boxscorePeriodSummary.home.got > 0 ? <td>{boxscorePeriodSummary.home.got}</td> : null}
                        <td className="font-black text-sm bg-yellow-100">{boxscorePeriodSummary.home.totalG}</td>
                        <td className="text-gray-600">{boxscorePeriodSummary.home.totalS}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Subtabs Bar */}
              <div className="flex border-b-2 border-black bg-white overflow-x-auto text-xs font-bold uppercase">
                {[
                  { id: 'summary', label: 'Summary' },
                  { id: 'team_stats', label: 'Team Stats' },
                  { id: 'skaters', label: `Skaters (${boxscoreData.skaters.length})` },
                  { id: 'goalies', label: `Goalies (${boxscoreData.goalies.length})` },
                  { id: 'scoring', label: `Goals (${boxscoreData.scoring.length})` },
                  { id: 'penalties', label: `Penalties (${boxscoreData.penalties.length})` }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setBoxscoreTab(t.id as any)}
                    className={`px-4 py-2 transition whitespace-nowrap border-r border-black/20 cursor-pointer ${
                      boxscoreTab === t.id ? 'bg-black text-white' : 'hover:bg-gray-100 text-black'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Subtab Contents */}
              <div>
                {boxscoreData.loading ? (
                  <div className="p-8 text-center text-xs font-bold uppercase text-gray-500 animate-pulse">
                    Fetching boxscore & detailed game logs from archives...
                  </div>
                ) : (
                  <>
                    {/* 1. Summary Subtab */}
                    {boxscoreTab === 'summary' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div className="p-3 bg-[#faf8f5] border border-black/30">
                            <span className="font-black uppercase text-gray-700">Powerplay Efficiency:</span>
                            <p className="mt-1 font-mono">
                              <strong>Away:</strong> {boxscoreAwayStats.away_pp_goals || 0}/{boxscoreAwayStats.away_pp_opps || 0} ({formatDayFractionOrTime(boxscoreAwayStats.away_pp_minutes)} TOI)
                            </p>
                            <p className="mt-1 font-mono">
                              <strong>Home:</strong> {boxscoreHomeStats.home_pp_goals || 0}/{boxscoreHomeStats.home_pp_opps || 0} ({formatDayFractionOrTime(boxscoreHomeStats.home_pp_minutes)} TOI)
                            </p>
                          </div>
                          <div className="p-3 bg-[#faf8f5] border border-black/30">
                            <span className="font-black uppercase text-gray-700">Zone Time & Physicality:</span>
                            <p className="mt-1 font-mono">
                              <strong>Attack Zone:</strong> {formatDayFractionOrTime(boxscoreAwayStats.away_atk)} vs {formatDayFractionOrTime(boxscoreHomeStats.home_atk)}
                            </p>
                            <p className="mt-1 font-mono">
                              <strong>Body Checks:</strong> {boxscoreAwayStats.away_bodychecks || 0} vs {boxscoreHomeStats.home_bodychecks || 0}
                            </p>
                          </div>
                        </div>

                        {/* Top Performers */}
                        <div>
                          <h4 className="font-black text-xs uppercase border-b border-black pb-1 mb-2">
                            Top Scorers in this Game
                          </h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs font-mono text-left">
                              <thead>
                                <tr className="bg-black text-white uppercase text-[10px] font-black">
                                  <th className="p-2">Player</th>
                                  <th className="p-2 text-center">Pos</th>
                                  <th className="p-2 text-center">G</th>
                                  <th className="p-2 text-center">A</th>
                                  <th className="p-2 text-center font-black bg-gray-900">PTS</th>
                                  <th className="p-2 text-center">SOG</th>
                                </tr>
                              </thead>
                              <tbody>
                                {boxscoreData.skaters.length > 0 ? (
                                  boxscoreData.skaters
                                    .sort((a, b) => b.points - a.points || b.goals - a.goals)
                                    .slice(0, 6)
                                    .map((s, i) => (
                                      <tr key={i} className={`border-b border-gray-200 font-bold ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                                        <td className="p-2 font-black font-sans uppercase">
                                          <div className="flex items-center gap-2">
                                            {s.teamLogo && (
                                              <img src={s.teamLogo} alt={s.teamAbbr} className="w-4 h-4 object-contain flex-shrink-0" />
                                            )}
                                            <span className="text-[10px] bg-black text-white px-1.5 py-0.5 rounded font-mono font-black shrink-0">
                                              {s.teamAbbr}
                                            </span>
                                            <span>{s.name}</span>
                                          </div>
                                        </td>
                                        <td className="p-2 text-center">{s.pos}</td>
                                        <td className="p-2 text-center">{s.goals}</td>
                                        <td className="p-2 text-center">{s.assists}</td>
                                        <td className="p-2 text-center font-black bg-yellow-100">{s.points}</td>
                                        <td className="p-2 text-center">{s.sog}</td>
                                      </tr>
                                    ))
                                ) : (
                                  <tr>
                                    <td colSpan={6} className="p-4 text-center text-xs font-bold uppercase italic text-gray-500">
                                      No individual skater statistics logged for this game.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2. Team Stats Comparison Subtab */}
                    {boxscoreTab === 'team_stats' && (
                      <div className="overflow-x-auto bg-white border border-black/20 p-2">
                        <table className="w-full text-xs font-mono">
                          <thead>
                            <tr className="border-b-2 border-black font-sans uppercase text-gray-700 font-black">
                              <th className="text-left py-2">Away Team</th>
                              <th className="text-center py-2 text-black">Metric</th>
                              <th className="text-right py-2">Home Team</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-black/10">
                            {[
                              { label: 'Total Goals', away: boxscorePeriodSummary?.away.totalG, home: boxscorePeriodSummary?.home.totalG },
                              { label: 'Shots on Goal', away: boxscoreAwayStats.away_shots || boxscorePeriodSummary?.away.totalS || 0, home: boxscoreHomeStats.home_shots || boxscorePeriodSummary?.home.totalS || 0 },
                              { label: 'Power Play Goals / Opps', away: `${boxscoreAwayStats.away_pp_goals || 0} / ${boxscoreAwayStats.away_pp_opps || 0}`, home: `${boxscoreHomeStats.home_pp_goals || 0} / ${boxscoreHomeStats.home_pp_opps || 0}` },
                              { label: 'Power Play Time', away: formatDayFractionOrTime(boxscoreAwayStats.away_pp_minutes), home: formatDayFractionOrTime(boxscoreHomeStats.home_pp_minutes) },
                              { label: 'Short Handed Goals', away: boxscoreAwayStats.away_sh_goals || 0, home: boxscoreHomeStats.home_sh_goals || 0 },
                              { label: 'Faceoffs Won', away: boxscoreAwayStats.away_faceoff_won || 0, home: boxscoreHomeStats.home_faceoff_won || 0 },
                              { label: 'Body Checks', away: boxscoreAwayStats.away_bodychecks || 0, home: boxscoreHomeStats.home_bodychecks || 0 },
                              { label: 'Penalties / PIM', away: `${boxscoreAwayStats.away_pen || 0} (${boxscoreAwayStats.away_pim || 0} min)`, home: `${boxscoreHomeStats.home_pen || 0} (${boxscoreHomeStats.home_pim || 0} min)` },
                              { label: 'Attack Zone Time', away: formatDayFractionOrTime(boxscoreAwayStats.away_atk), home: formatDayFractionOrTime(boxscoreHomeStats.home_atk) },
                              { label: 'Pass Comps / Attempts', away: `${boxscoreAwayStats.away_pass_completions || 0} / ${boxscoreAwayStats.away_pass_attempts || 0}`, home: `${boxscoreHomeStats.home_pass_completions || 0} / ${boxscoreHomeStats.home_pass_attempts || 0}` },
                              { label: 'Breakaway Goals / Tries', away: `${boxscoreAwayStats.away_breakaway_goals || 0} / ${boxscoreAwayStats.away_breakaways || 0}`, home: `${boxscoreHomeStats.home_breakaway_goals || 0} / ${boxscoreHomeStats.home_breakaways || 0}` },
                              { label: 'One-Timer Goals / Tries', away: `${boxscoreAwayStats.away_onetimer_goals || 0} / ${boxscoreAwayStats.away_onetimers || 0}`, home: `${boxscoreHomeStats.home_onetimer_goals || 0} / ${boxscoreHomeStats.home_onetimers || 0}` }
                            ].map((m, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="py-2 text-left font-black">{m.away}</td>
                                <td className="py-2 text-center font-sans text-gray-700 font-bold">{m.label}</td>
                                <td className="py-2 text-right font-black">{m.home}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* 3. Skaters Subtab */}
                    {boxscoreTab === 'skaters' && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs font-mono text-center">
                          <thead>
                            <tr className="bg-black text-white uppercase text-[10px] font-black">
                              <th className="text-left p-2 font-sans">Player</th>
                              <th className="p-2">Pos</th>
                              <th className="p-2 font-bold">G</th>
                              <th className="p-2 font-bold">A</th>
                              <th className="p-2 font-bold bg-gray-900">PTS</th>
                              <th className="p-2">SOG</th>
                              <th className="p-2">CHK</th>
                              <th className="p-2">PIM</th>
                              <th className="p-2">PPP</th>
                              <th className="p-2">SHP</th>
                              <th className="p-2">TOI</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-black/10">
                            {boxscoreData.skaters.length > 0 ? (
                              boxscoreData.skaters.map((s, i) => (
                                <tr key={i} className={`hover:bg-yellow-50 ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                                  <td className="text-left p-2 font-bold font-sans uppercase">
                                    <div className="flex items-center gap-2">
                                      {s.teamLogo && (
                                        <img src={s.teamLogo} alt={s.teamAbbr} className="w-5 h-5 object-contain flex-shrink-0" />
                                      )}
                                      <span className="text-[10px] bg-black text-white px-1.5 py-0.5 rounded font-mono font-black shrink-0">
                                        {s.teamAbbr}
                                      </span>
                                      <span>{s.name}</span>
                                    </div>
                                  </td>
                                  <td className="p-2">{s.pos}</td>
                                  <td className="p-2 font-bold">{s.goals}</td>
                                  <td className="p-2 font-bold">{s.assists}</td>
                                  <td className="p-2 font-black bg-yellow-100">{s.points}</td>
                                  <td className="p-2">{s.sog}</td>
                                  <td className="p-2">{s.checks}</td>
                                  <td className="p-2">{s.pim}</td>
                                  <td className="p-2">{s.ppp}</td>
                                  <td className="p-2">{s.shp}</td>
                                  <td className="p-2">{s.toi}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={11} className="p-4 text-center text-xs font-bold uppercase italic text-gray-500">
                                  No skater stats available.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* 4. Goalies Subtab */}
                    {boxscoreTab === 'goalies' && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs font-mono text-center">
                          <thead>
                            <tr className="bg-black text-white uppercase text-[10px] font-black">
                              <th className="text-left p-2 font-sans">Goalie</th>
                              <th className="p-2">GA</th>
                              <th className="p-2">Saves</th>
                              <th className="p-2">Shots</th>
                              <th className="p-2">SV%</th>
                              <th className="p-2">SO</th>
                              <th className="p-2">Dec</th>
                              <th className="p-2">TOI</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-black/10">
                            {boxscoreData.goalies.length > 0 ? (
                              boxscoreData.goalies.map((g, i) => (
                                <tr key={i} className={`hover:bg-yellow-50 ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                                  <td className="text-left p-2 font-bold font-sans uppercase">
                                    <div className="flex items-center gap-2">
                                      {g.teamLogo && (
                                        <img src={g.teamLogo} alt={g.teamAbbr} className="w-5 h-5 object-contain flex-shrink-0" />
                                      )}
                                      <span className="text-[10px] bg-black text-white px-1.5 py-0.5 rounded font-mono font-black shrink-0">
                                        {g.teamAbbr}
                                      </span>
                                      <span>{g.name}</span>
                                    </div>
                                  </td>
                                  <td className="p-2 font-bold">{g.ga}</td>
                                  <td className="p-2 font-bold">{g.saves}</td>
                                  <td className="p-2">{g.shots}</td>
                                  <td className="p-2 font-bold">{(g.savePct * 100).toFixed(1)}%</td>
                                  <td className="p-2">{g.so}</td>
                                  <td className="p-2 font-bold">{g.decision}</td>
                                  <td className="p-2">{g.toi}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={8} className="p-4 text-center text-xs font-bold uppercase italic text-gray-500">
                                  No goalie stats available.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* 5. Scoring / Goals Subtab */}
                    {boxscoreTab === 'scoring' && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs font-mono text-left">
                          <thead>
                            <tr className="bg-black text-white uppercase text-[10px] font-black">
                              <th className="p-2">#</th>
                              <th className="p-2">Per</th>
                              <th className="p-2">Time</th>
                              <th className="p-2">Team</th>
                              <th className="p-2 font-sans">Goal Scorer</th>
                              <th className="p-2 font-sans">Assist 1</th>
                              <th className="p-2 font-sans">Assist 2</th>
                              <th className="p-2 text-center">Type</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-black/10">
                            {boxscoreData.scoring.length > 0 ? (
                              boxscoreData.scoring.map((goal, i) => (
                                <tr key={i} className={`hover:bg-yellow-50 ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                                  <td className="p-2 font-bold">#{goal.goalNum}</td>
                                  <td className="p-2 font-bold">P{goal.period}</td>
                                  <td className="p-2">{goal.time || '--'}</td>
                                  <td className="p-2 font-bold uppercase">
                                    <div className="flex items-center gap-1.5">
                                      {goal.teamLogo && (
                                        <img src={goal.teamLogo} alt={goal.team} className="w-4 h-4 object-contain flex-shrink-0" />
                                      )}
                                      <span>{goal.team || goal.side}</span>
                                    </div>
                                  </td>
                                  <td className="p-2 font-black font-sans uppercase text-black">{goal.scorer}</td>
                                  <td className="p-2 font-sans uppercase text-gray-700">{goal.assist1}</td>
                                  <td className="p-2 font-sans uppercase text-gray-700">{goal.assist2}</td>
                                  <td className="p-2 text-center font-bold text-[10px] uppercase bg-gray-100">{goal.type}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={8} className="p-4 text-center text-xs font-bold uppercase italic text-gray-500">
                                  No goal event logs recorded for this game.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* 6. Penalties Subtab */}
                    {boxscoreTab === 'penalties' && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs font-mono text-left">
                          <thead>
                            <tr className="bg-black text-white uppercase text-[10px] font-black">
                              <th className="p-2">#</th>
                              <th className="p-2">Per</th>
                              <th className="p-2">Time</th>
                              <th className="p-2">Team</th>
                              <th className="p-2 font-sans">Player</th>
                              <th className="p-2">Infraction</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-black/10">
                            {boxscoreData.penalties.length > 0 ? (
                              boxscoreData.penalties.map((pen, i) => (
                                <tr key={i} className={`hover:bg-yellow-50 ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                                  <td className="p-2 font-bold">#{pen.penNum}</td>
                                  <td className="p-2 font-bold">P{pen.period}</td>
                                  <td className="p-2">{pen.time || '--'}</td>
                                  <td className="p-2 font-bold uppercase">
                                    <div className="flex items-center gap-1.5">
                                      {pen.teamLogo && (
                                        <img src={pen.teamLogo} alt={pen.team} className="w-4 h-4 object-contain flex-shrink-0" />
                                      )}
                                      <span>{pen.team || pen.side}</span>
                                    </div>
                                  </td>
                                  <td className="p-2 font-black font-sans uppercase">{pen.player}</td>
                                  <td className="p-2 font-sans uppercase text-red-700 font-bold">{pen.type}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={6} className="p-4 text-center text-xs font-bold uppercase italic text-gray-500">
                                  No penalty event logs recorded for this game.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-100 p-3 border-t-2 border-black flex justify-between items-center">
              <span className="text-xs font-bold uppercase italic text-gray-600">
                NHL95 Gazette Boxscore Archives
              </span>
              <button
                type="button"
                onClick={() => setSelectedBoxscoreGame(null)}
                className="bg-black text-white px-4 py-1.5 text-xs font-black uppercase hover:bg-neutral-800 transition rounded cursor-pointer"
              >
                Close Boxscore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const resolvedParams = use(params);
  const { teamId } = resolvedParams;

  return (
    <Suspense fallback={<div className="p-8 font-serif italic text-sm text-center">Loading Gazette Team Files...</div>}>
      <TeamPageContent teamId={teamId} />
    </Suspense>
  );
}