"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar, Clock, Shield, Award, Upload, Search,
  ChevronRight, AlertCircle, CheckCircle2, Trophy, Activity, Filter
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ==========================================
// 1. LEAGUE CONSTANTS & ROSTERS CONFIG
// ==========================================

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

const getLeaguePrefix = (league: { league_id: number | string; league_name?: string; season_name?: string }) => {
  const name = String(league.league_name || league.season_name || '').trim().toUpperCase();
  if (name) {
    const match = name.match(/^[A-Z]+/);
    if (match && match[0]) return match[0];
  }
  const idNum = Number(league.league_id);
  if (SEASON_TYPES[idNum]) return SEASON_TYPES[idNum];
  return 'W';
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

// ==========================================
// 2. MAIN COMPONENT
// ==========================================

export default function SchedulePage() {
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedLeagueType, setSelectedLeagueType] = useState<string>('ALL');
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);

  // Teams & Schedule State
  const [schedule, setSchedule] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PLAYED' | 'REMAINING'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Game & Details
  const [selectedGame, setSelectedGame] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'team_stats' | 'skaters' | 'goalies' | 'scoring' | 'penalties'>('summary');
  const [gameBoxscore, setGameBoxscore] = useState<{
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

  const [loading, setLoading] = useState(true);

  // 1. Fetch seasons on mount
  useEffect(() => {
    async function init() {
      let { data: seasonData, error } = await supabase
        .from('league_seasons')
        .select('*');

      if (error || !seasonData || seasonData.length === 0) {
        const fallbackQuery = await supabase
          .from('leagues')
          .select('*')
          .order('league_id', { ascending: false });
        seasonData = fallbackQuery.data || [];
      }

      const formatted = (seasonData || []).map((row: any) => {
        const lId = row.league_id !== undefined ? row.league_id : (row.id || row.season_id);
        const dynamicName = row.league_name || row.name || row.season_name || `Season ${lId}`;
        return {
          league_id: Number(lId),
          season_name: dynamicName,
          league_name: dynamicName
        };
      }).sort((a, b) => b.league_id - a.league_id);

      setSeasons(formatted);

      if (formatted.length > 0) {
        const recent = formatted[0].league_id;
        setSelectedSeason(recent);
        fetchSeasonData(recent);
      } else {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Compute available league types from loaded seasons
  const availableLeagueTypes = useMemo(() => {
    const extracted = new Set<string>();
    seasons.forEach(l => {
      const p = getLeaguePrefix(l);
      if (p) extracted.add(p);
    });
    if (extracted.size === 0) return ['W', 'Q', 'O', 'V'];
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
    setSelectedTeamFilter('ALL');
    setSelectedGame(null);
    const list = type === 'ALL' ? seasons : seasons.filter(s => getLeaguePrefix(s) === type);
    if (list.length > 0) {
      const nextId = Number(list[0].league_id);
      setSelectedSeason(nextId);
      fetchSeasonData(nextId);
    }
  };

  // 2. Fetch all schedule fixtures, teams, and gamestats for the selected season
  async function fetchSeasonData(leagueId: number) {
    setLoading(true);
    setSelectedGame(null);

    try {
      const [schedRes, teamRes, statsRes] = await Promise.all([
        supabase
          .from('league_schedule')
          .select('*')
          .eq('league_id', leagueId)
          .order('game_id', { ascending: true }),
        supabase
          .from('league_teams')
          .select('team_id, team_name, abbreviation, logo_url, coach_id, league_id, league_coaches(coach_id, coach_name)')
          .or(`league_id.eq.${leagueId},league_id.is.null`),
        supabase
          .from('league_gamestats')
          .select('*')
          .eq('league_id', leagueId)
      ]);

      const scheduleData = schedRes.data || [];
      const statsList = statsRes.data || [];

      let teamsList = (teamRes.data || []).filter(t => Number(t.league_id) === leagueId);
      if (teamsList.length === 0) {
        teamsList = teamRes.data || [];
      }

      const teamIdMap = new Map<number, any>();
      teamsList.forEach(t => teamIdMap.set(Number(t.team_id), t));

      const combined = scheduleData.map((game: any) => {
        const hId = Number(game.home_team_id);
        const aId = Number(game.away_team_id);
        const homeTeam = teamIdMap.get(hId) || { team_id: hId, team_name: `Team #${hId}`, abbreviation: `TM${hId}` };
        const awayTeam = teamIdMap.get(aId) || { team_id: aId, team_name: `Team #${aId}`, abbreviation: `TM${aId}` };

        const stats = statsList.find((s: any) => String(s.game_id).trim() === String(game.game_id).trim()) || null;

        const rawPlayed = String(game.played || '').trim().toLowerCase();
        const isPlayed = rawPlayed === 'true' || rawPlayed === '1' || rawPlayed === 'y' || rawPlayed === 'yes' || stats !== null;

        let meta: any = {};
        if (stats?.game_meta) {
          meta = typeof stats.game_meta === 'string' ? JSON.parse(stats.game_meta) : stats.game_meta;
        } else if (game.game_meta) {
          meta = typeof game.game_meta === 'string' ? JSON.parse(game.game_meta) : game.game_meta;
        }

        const isOT = Boolean(meta.is_ot);
        const isTie = Boolean(meta.is_tie) || (stats && Number(stats.home_score) === Number(stats.away_score));

        let glowClass = "border-black bg-white";
        let statusBadge = isPlayed ? (isOT ? "FINAL (OT)" : isTie ? "FINAL (TIE)" : "FINAL") : "UPCOMING";

        if (isPlayed) {
          if (isTie) {
            glowClass = "shadow-[0_0_8px_rgba(34,197,94,0.4)] border-green-600 bg-green-50/20";
          } else if (isOT) {
            glowClass = "shadow-[0_0_8px_rgba(59,130,246,0.4)] border-blue-600 bg-blue-50/20";
          }
        } else {
          glowClass = "border-dashed border-black/40 bg-[#faf8f5] opacity-80 hover:opacity-100 hover:border-black";
        }

        const homeScore = stats ? Number(stats.home_score) : null;
        const awayScore = stats ? Number(stats.away_score) : null;

        return {
          ...game,
          homeTeam,
          awayTeam,
          stats,
          isPlayed,
          isOT,
          isTie,
          statusBadge,
          glowClass,
          homeScore,
          awayScore
        };
      });

      const activeSeasonTeamsMap = new Map<number, any>();
      combined.forEach(g => {
        if (g.homeTeam?.team_id && g.homeTeam.team_id !== 999 && g.homeTeam.team_id !== 0) {
          activeSeasonTeamsMap.set(g.homeTeam.team_id, g.homeTeam);
        }
        if (g.awayTeam?.team_id && g.awayTeam.team_id !== 999 && g.awayTeam.team_id !== 0) {
          activeSeasonTeamsMap.set(g.awayTeam.team_id, g.awayTeam);
        }
      });

      const uniqueSeasonTeams = Array.from(activeSeasonTeamsMap.values()).sort((a, b) =>
        (a.team_name || '').localeCompare(b.team_name || '')
      );

      setTeams(uniqueSeasonTeams);
      setSchedule(combined);

      if (combined.length > 0) {
        const firstPlayed = combined.find(g => g.isPlayed) || combined[0];
        handleSelectGame(firstPlayed);
      }
    } catch (err) {
      console.error("Failed fetching season schedule:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleSeasonChange = (id: number) => {
    setSelectedSeason(id);
    setSelectedTeamFilter('ALL');
    fetchSeasonData(id);
  };

  // 3. Detailed Boxscore Ingestion & Multi-Source Player Name Resolution
  async function handleSelectGame(game: any) {
    setSelectedGame(game);
    setActiveTab('summary');

    if (!game || !game.isPlayed) {
      setGameBoxscore({ skaters: [], goalies: [], scoring: [], penalties: [], loading: false });
      return;
    }

    setGameBoxscore(prev => ({ ...prev, loading: true }));

    try {
      const gId = game.game_id;
      const sId = selectedSeason || 40;
      const hId = Number(game.home_team_id);
      const aId = Number(game.away_team_id);

      // Fetch player stats, scoring log, penalties log, and all relevant roster sources in parallel
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

      // Collect all player IDs present in this game
      const playerIds = Array.from(new Set(
        rawPlayers.map((p: any) => Number(p.player_id)).filter((id: number) => !isNaN(id) && id > 0)
      ));

      // Also query league_player_database for these exact player IDs
      let playerDbRows: any[] = [];
      if (playerIds.length > 0) {
        const { data: dbData } = await supabase
          .from('league_player_database')
          .select('player_id, player_name, pos')
          .in('player_id', playerIds);
        playerDbRows = dbData || [];
      }

      // Build Master Name Resolution Map
      const nameMap = new Map<number, string>();

      // 1. From league_player_database
      playerDbRows.forEach((p: any) => {
        if (p.player_id && p.player_name) {
          nameMap.set(Number(p.player_id), String(p.player_name).trim());
        }
      });

      // 2. From league_rosters (active season + team rosters)
      (seasonRostersRes.data || []).forEach((r: any) => {
        if (r.player_id && r.player_name) {
          nameMap.set(Number(r.player_id), String(r.player_name).trim());
        }
      });

      (teamRostersRes.data || []).forEach((r: any) => {
        if (r.player_id && r.player_name) {
          nameMap.set(Number(r.player_id), String(r.player_name).trim());
        }
      });

      // 3. Harvest names directly from league_scoring and league_penalties logs
      scoringData.forEach((g: any) => {
        if (g.scorer_id && g.scorer && !String(g.scorer).startsWith('Player #')) {
          nameMap.set(Number(g.scorer_id), String(g.scorer).trim());
        }
        if (g.assist1_id && g.assist1 && g.assist1 !== '--' && !String(g.assist1).startsWith('Player #')) {
          nameMap.set(Number(g.assist1_id), String(g.assist1).trim());
        }
        if (g.assist2_id && g.assist2 && g.assist2 !== '--' && !String(g.assist2).startsWith('Player #')) {
          nameMap.set(Number(g.assist2_id), String(g.assist2).trim());
        }
      });

      penaltyData.forEach((p: any) => {
        if (p.player_id && p.player && !String(p.player).startsWith('Player #')) {
          nameMap.set(Number(p.player_id), String(p.player).trim());
        }
      });

      // Pre-compute official team codes for roster dictionary fallback
      const awayCode = resolveTeamCode(game.awayTeam);
      const homeCode = resolveTeamCode(game.homeTeam);

      const awaySkatersDict = W_LEAGUE_SKATERS[awayCode] || O_LEAGUE_SKATERS[awayCode] || [];
      const homeSkatersDict = W_LEAGUE_SKATERS[homeCode] || O_LEAGUE_SKATERS[homeCode] || [];
      const awayGoaliesDict = W_LEAGUE_GOALIES[awayCode] || O_LEAGUE_GOALIES[awayCode] || [];
      const homeGoaliesDict = W_LEAGUE_GOALIES[homeCode] || O_LEAGUE_GOALIES[homeCode] || [];

      // Assemble Skaters and Goalies
      const skatersList: any[] = [];
      const goaliesList: any[] = [];

      // Track indexes per team/position for fallback
      let awaySkaterIdx = 0;
      let homeSkaterIdx = 0;
      let awayGoalieIdx = 0;
      let homeGoalieIdx = 0;

      rawPlayers.forEach((p: any) => {
        const pId = Number(p.player_id);
        const isGoalie = p.pos_played === 'G';
        const isAway = Number(p.team_id) === aId;

        // Resolve Player Name: (DB Map -> Row Name -> Scoring/Penalties -> Official Roster Dictionary)
        let resolvedName = nameMap.get(pId) || p.player_name || '';

        if (!resolvedName || resolvedName.startsWith('Player #')) {
          if (isGoalie) {
            resolvedName = isAway ? (awayGoaliesDict[awayGoalieIdx] || '') : (homeGoaliesDict[homeGoalieIdx] || '');
          } else {
            resolvedName = isAway ? (awaySkatersDict[awaySkaterIdx] || '') : (homeSkatersDict[homeSkaterIdx] || '');
          }
        }

        if (!resolvedName) {
          resolvedName = `Player #${pId || (isGoalie ? 'G' : 'F')}`;
        }

        if (isGoalie) {
          if (isAway) awayGoalieIdx++;
          else homeGoalieIdx++;

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
            ga,
            saves,
            shots,
            savePct,
            so: ga === 0 && saves > 0 ? 1 : 0,
            decision: isWin ? 'W' : isLoss ? 'L' : isOtl ? 'OTL' : isTie ? 'T' : '-',
            toi: formatSecondsToMMSS(p.toi)
          });
        } else {
          if (isAway) awaySkaterIdx++;
          else homeSkaterIdx++;

          const g = Number(p.goals || 0);
          const a = Number(p.assists || 0);
          skatersList.push({
            ...p,
            name: resolvedName,
            pos: p.pos_played || 'F',
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

      // Format Scoring Log
      const scoringList = scoringData.map((goal: any, idx: number) => {
        const scorerId = Number(goal.scorer_id);
        const a1Id = goal.assist1_id ? Number(goal.assist1_id) : null;
        const a2Id = goal.assist2_id ? Number(goal.assist2_id) : null;

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
          team: goal.team || (Number(goal.team_id) === hId ? game.homeTeam?.abbreviation : game.awayTeam?.abbreviation),
          side: Number(goal.team_id) === hId ? 'Home' : 'Away',
          scorer: scorerName,
          assist1: a1Name,
          assist2: a2Name,
          type: goal.way || 'EV'
        };
      });

      // Format Penalties Log
      const penaltiesList = penaltyData.map((pen: any, idx: number) => {
        const pId = Number(pen.player_id);
        const pName = (pen.player && !String(pen.player).startsWith('Player #'))
          ? pen.player
          : (nameMap.get(pId) || pen.player || `Player #${pId}`);

        return {
          penNum: idx + 1,
          period: pen.period,
          time: pen.time,
          team: pen.team || (Number(pen.team_id) === hId ? game.homeTeam?.abbreviation : game.awayTeam?.abbreviation),
          side: Number(pen.team_id) === hId ? 'Home' : 'Away',
          player: pName,
          type: pen.penalty_type || 'Penalty'
        };
      });

      setGameBoxscore({
        skaters: skatersList,
        goalies: goaliesList,
        scoring: scoringList,
        penalties: penaltiesList,
        loading: false
      });
    } catch (err) {
      console.error("Failed fetching detailed game stats:", err);
      setGameBoxscore({ skaters: [], goalies: [], scoring: [], penalties: [], loading: false });
    }
  }

  // 4. Filter Schedule List based on Team, Status, and Search Query
  const filteredSchedule = useMemo(() => {
    return schedule.filter((g: any) => {
      // Team Filter
      if (selectedTeamFilter !== 'ALL') {
        const teamIdNum = Number(selectedTeamFilter);
        const matchesHome = Number(g.home_team_id) === teamIdNum;
        const matchesAway = Number(g.away_team_id) === teamIdNum;
        if (!matchesHome && !matchesAway) return false;
      }

      // Status Filter
      if (statusFilter === 'PLAYED' && !g.isPlayed) return false;
      if (statusFilter === 'REMAINING' && g.isPlayed) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const homeName = (g.homeTeam?.team_name || '').toLowerCase();
        const awayName = (g.awayTeam?.team_name || '').toLowerCase();
        const homeAbbr = (g.homeTeam?.abbreviation || '').toLowerCase();
        const awayAbbr = (g.awayTeam?.abbreviation || '').toLowerCase();
        const matchStr = `${awayName} ${awayAbbr} @ ${homeName} ${homeAbbr} game ${g.game_id}`;
        if (!matchStr.includes(q)) return false;
      }

      return true;
    });
  }, [schedule, selectedTeamFilter, statusFilter, searchQuery]);

  // Counts for tabs
  const scheduleCounts = useMemo(() => {
    let played = 0;
    let remaining = 0;
    schedule.forEach(g => {
      if (selectedTeamFilter !== 'ALL') {
        const tId = Number(selectedTeamFilter);
        if (Number(g.home_team_id) !== tId && Number(g.away_team_id) !== tId) return;
      }
      if (g.isPlayed) played++;
      else remaining++;
    });
    return { all: played + remaining, played, remaining };
  }, [schedule, selectedTeamFilter]);

  // Extract Home / Away Stats JSON Objects
  const homeStatsObj = useMemo(() => {
    if (!selectedGame?.stats?.home_stats) return {};
    const raw = selectedGame.stats.home_stats;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }, [selectedGame]);

  const awayStatsObj = useMemo(() => {
    if (!selectedGame?.stats?.away_stats) return {};
    const raw = selectedGame.stats.away_stats;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }, [selectedGame]);

  // Compute Period & Shot Metrics for Period-by-Period Table
  const periodSummary = useMemo(() => {
    if (!selectedGame?.isPlayed) return null;
    const h = homeStatsObj;
    const a = awayStatsObj;

    const awayG1 = Number(a.away_1st_goals || 0);
    const awayG2 = Number(a.away_2nd_goals || 0);
    const awayG3 = Number(a.away_3rd_goals || 0);
    const awayGOT = Number(a.away_ot_goals || 0);
    const awayTotalG = selectedGame.awayScore !== null ? selectedGame.awayScore : Number(a.away_goals || 0);

    const homeG1 = Number(h.home_1st_goals || 0);
    const homeG2 = Number(h.home_2nd_goals || 0);
    const homeG3 = Number(h.home_3rd_goals || 0);
    const homeGOT = Number(h.home_ot_goals || 0);
    const homeTotalG = selectedGame.homeScore !== null ? selectedGame.homeScore : Number(h.home_goals || 0);

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
      away: { g1: awayG1, g2: awayG2, g3: awayG3, got: awayGOT, totalG: awayTotalG, s1: awayS1, s2: awayS2, s3: awayS3, sot: awaySOT, totalS: awayTotalShots },
      home: { g1: homeG1, g2: homeG2, g3: homeG3, got: homeGOT, totalG: homeTotalG, s1: homeS1, s2: homeS2, s3: homeS3, sot: homeSOT, totalS: homeTotalShots }
    };
  }, [selectedGame, homeStatsObj, awayStatsObj]);

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-black font-serif pb-16">
      {/* Header Banner */}
      <div className="border-b-4 border-black pb-4 mb-6 text-center">
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight">
          League Schedule & Boxscores
        </h1>
        <p className="text-xs md:text-sm uppercase tracking-widest mt-1 text-slate-700 italic">
          Official Gazette Fixtures, Completed Boxscores & Remaining Schedule
        </p>
      </div>

      {/* Main Container */}
      <div className="max-w-[1400px] mx-auto px-4">
        {/* Controls & Filter Strip */}
        <div className="border-y-2 border-black p-3 flex flex-col xl:flex-row items-center justify-between gap-4 bg-[#ede8dc] mb-6 shadow-sm">
          {/* League Type Buttons */}
          <div className="flex items-center gap-2 bg-white border-2 border-black p-1.5 shadow-xs overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => handleLeagueTypeChange('ALL')}
              className={`px-4 py-1.5 h-12 md:h-14 flex items-center justify-center text-xs md:text-sm font-black uppercase transition-all shrink-0 cursor-pointer ${selectedLeagueType === 'ALL'
                  ? 'bg-black text-white shadow-xs'
                  : 'text-black hover:bg-neutral-100'
                }`}
              title="All Leagues"
            >
              ALL
            </button>
            {availableLeagueTypes.map((type) => {
              const config = LEAGUE_LOGOS[type];
              const isSelected = selectedLeagueType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleLeagueTypeChange(type)}
                  className={`px-3 py-1 flex items-center justify-center transition-all h-12 md:h-14 border-2 shrink-0 cursor-pointer ${isSelected
                      ? 'bg-yellow-100 border-black shadow-xs ring-2 ring-black'
                      : 'border-transparent bg-transparent opacity-70 hover:opacity-100 hover:border-black/30 hover:bg-neutral-50'
                    }`}
                  title={config?.name || `${type} League`}
                >
                  {config?.logoUrl ? (
                    <img
                      src={config.logoUrl}
                      alt={config.name || `${type} League`}
                      className="h-9 md:h-11 w-auto max-w-[110px] md:max-w-[130px] object-contain block"
                      onError={(e) => {
                        if (config.fallbackUrl && e.currentTarget.src !== config.fallbackUrl) {
                          e.currentTarget.src = config.fallbackUrl;
                        }
                      }}
                    />
                  ) : (
                    <span className="font-black text-sm md:text-base uppercase px-2">{type}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Season & Team Dropdowns (High Visibility) */}
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            {/* Season Selector */}
            <div className="flex items-center gap-2 bg-white border-2 border-black px-3 py-1.5 shadow-xs">
              <label className="font-black text-[11px] uppercase tracking-wider text-slate-800">Season:</label>
              <select
                value={selectedSeason || ""}
                onChange={(e) => handleSeasonChange(Number(e.target.value))}
                className="bg-white text-black font-bold uppercase text-xs md:text-sm border-0 focus:outline-none cursor-pointer p-0.5"
              >
                {filteredSeasons.map((s) => (
                  <option key={s.league_id} value={s.league_id} className="bg-white text-black font-bold py-1">
                    {s.season_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Team Filter Dropdown */}
            <div className="flex items-center gap-2 bg-white border-2 border-black px-3 py-1.5 shadow-xs">
              <label className="font-black text-[11px] uppercase tracking-wider text-slate-800">Team:</label>
              <select
                value={selectedTeamFilter}
                onChange={(e) => setSelectedTeamFilter(e.target.value)}
                className="bg-white text-black font-bold uppercase text-xs md:text-sm border-0 focus:outline-none cursor-pointer max-w-[200px] truncate p-0.5"
              >
                <option value="ALL" className="bg-white text-black font-bold py-1">All Teams</option>
                {teams.map((t) => (
                  <option key={t.team_id} value={t.team_id} className="bg-white text-black font-bold py-1">
                    {t.team_name} {t.abbreviation ? `(${t.abbreviation})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Matchup Search Input */}
            <div className="relative flex-1 sm:w-44 min-w-[140px]">
              <Search className="absolute left-2.5 top-2.5 text-slate-500 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Search Matchup..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border-2 border-black text-xs pl-8 pr-2 py-1.5 font-sans font-bold focus:outline-none placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Schedule Sub-Header: Filter Chips & Status Summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          {/* Status Tabs (All, Played, Remaining) */}
          <div className="flex items-center gap-1 bg-white border-2 border-black p-1 shadow-xs text-xs font-bold uppercase">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 transition cursor-pointer ${statusFilter === 'ALL' ? 'bg-black text-white' : 'hover:bg-slate-100 text-black'
                }`}
            >
              All Fixtures ({scheduleCounts.all})
            </button>
            <button
              onClick={() => setStatusFilter('PLAYED')}
              className={`px-3 py-1 transition cursor-pointer flex items-center gap-1 ${statusFilter === 'PLAYED' ? 'bg-green-800 text-white' : 'hover:bg-green-50 text-green-900'
                }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Final / Played ({scheduleCounts.played})
            </button>
            <button
              onClick={() => setStatusFilter('REMAINING')}
              className={`px-3 py-1 transition cursor-pointer flex items-center gap-1 ${statusFilter === 'REMAINING' ? 'bg-amber-800 text-white' : 'hover:bg-amber-50 text-amber-900'
                }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Remaining ({scheduleCounts.remaining})
            </button>
          </div>

          {selectedTeamFilter !== 'ALL' && (
            <div className="text-xs font-bold uppercase text-slate-700 bg-amber-100 px-3 py-1 border border-amber-300">
              Showing schedule for: <strong>{teams.find(t => String(t.team_id) === String(selectedTeamFilter))?.team_name || 'Selected Team'}</strong>
              <button
                onClick={() => setSelectedTeamFilter('ALL')}
                className="ml-2 underline text-red-700 hover:text-black cursor-pointer"
              >
                Clear Filter
              </button>
            </div>
          )}
        </div>

        {/* Main 2-Column Layout */}
        {loading ? (
          <div className="bg-white border-2 border-black p-12 text-center text-sm font-bold uppercase tracking-wider animate-pulse">
            Loading schedule fixtures and game statistics...
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6">
            {/* Left Column: Fixtures List */}
            <div className="col-span-12 lg:col-span-5 space-y-2 max-h-[850px] overflow-y-auto pr-1">
              {filteredSchedule.length > 0 ? (
                filteredSchedule.map((game: any) => {
                  const isSelected = selectedGame?.game_id === game.game_id;
                  return (
                    <div
                      key={game.game_id}
                      onClick={() => handleSelectGame(game)}
                      className={`w-full p-3 border-2 transition text-xs font-bold uppercase cursor-pointer flex items-center justify-between gap-2 shadow-xs ${isSelected
                          ? 'border-black bg-yellow-100 ring-2 ring-black font-black'
                          : game.glowClass
                        }`}
                    >
                      {/* Away Team */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {game.awayTeam?.logo_url ? (
                          <img
                            src={game.awayTeam.logo_url}
                            className="w-7 h-7 object-contain shrink-0"
                            alt={game.awayTeam.team_name}
                          />
                        ) : (
                          <span className="w-7 h-7 bg-slate-200 border border-black flex items-center justify-center text-[10px] shrink-0 font-mono">
                            {game.awayTeam?.abbreviation || 'AWY'}
                          </span>
                        )}
                        <div className="truncate">
                          <p className="truncate text-xs font-black">{game.awayTeam?.team_name || 'Away'}</p>
                          <span className="text-[10px] text-slate-500 font-mono">AWAY</span>
                        </div>
                      </div>

                      {/* Center Score / Status */}
                      <div className="flex flex-col items-center justify-center px-2 shrink-0">
                        {game.isPlayed ? (
                          <div className="flex items-center gap-2 font-mono">
                            <span className={`text-base font-black ${game.awayScore > game.homeScore ? 'text-green-800' : 'text-slate-700'}`}>
                              {game.awayScore}
                            </span>
                            <span className="text-slate-400 text-xs">@</span>
                            <span className={`text-base font-black ${game.homeScore > game.awayScore ? 'text-green-800' : 'text-slate-700'}`}>
                              {game.homeScore}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">@</span>
                        )}
                        <span className={`text-[9px] px-1.5 py-0.2 border uppercase font-mono mt-0.5 ${game.isPlayed
                            ? game.isOT
                              ? 'bg-blue-100 text-blue-900 border-blue-400 font-bold'
                              : game.isTie
                                ? 'bg-green-100 text-green-900 border-green-400 font-bold'
                                : 'bg-black text-white border-black font-bold'
                            : 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                          }`}>
                          {game.statusBadge}
                        </span>
                      </div>

                      {/* Home Team */}
                      <div className="flex items-center gap-2 flex-1 justify-end min-w-0 text-right">
                        <div className="truncate">
                          <p className="truncate text-xs font-black">{game.homeTeam?.team_name || 'Home'}</p>
                          <span className="text-[10px] text-slate-500 font-mono">HOME</span>
                        </div>
                        {game.homeTeam?.logo_url ? (
                          <img
                            src={game.homeTeam.logo_url}
                            className="w-7 h-7 object-contain shrink-0"
                            alt={game.homeTeam.team_name}
                          />
                        ) : (
                          <span className="w-7 h-7 bg-slate-200 border border-black flex items-center justify-center text-[10px] shrink-0 font-mono">
                            {game.homeTeam?.abbreviation || 'HOM'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="bg-white border-2 border-dashed border-black/40 p-8 text-center text-xs font-bold uppercase text-slate-500">
                  No fixtures found matching current criteria.
                </div>
              )}
            </div>

            {/* Right Column: Detailed Boxscore View / Matchup Preview */}
            <div className="col-span-12 lg:col-span-7">
              {selectedGame ? (
                selectedGame.isPlayed ? (
                  /* ==================================================== */
                  /* PLAYED GAME: FULL SAVE-STATE PARSER BOXSCORE TABS     */
                  /* ==================================================== */
                  <div className="bg-white border-2 border-black shadow-sm">
                    {/* Scoreboard Header */}
                    <div className="bg-black text-white p-5 md:p-6">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        {/* Away Team */}
                        <div className="text-center md:text-left flex items-center gap-3">
                          {selectedGame.awayTeam?.logo_url && (
                            <img
                              src={selectedGame.awayTeam.logo_url}
                              className="w-12 h-12 md:w-14 md:h-14 object-contain"
                              alt="Away Team Logo"
                            />
                          )}
                          <div>
                            <div className="text-[10px] uppercase font-sans font-bold text-slate-400">Away Team</div>
                            <div className="text-2xl md:text-3xl font-black">{selectedGame.awayTeam?.team_name}</div>
                            <div className="text-xs text-slate-300 font-mono">
                              {selectedGame.stats?.away_coach ? `Coach: ${selectedGame.stats.away_coach}` : ''}
                            </div>
                            <div className="text-xs text-yellow-300 font-mono">
                              {periodSummary?.away.totalS || 0} SOG
                            </div>
                          </div>
                          <div className="text-4xl md:text-5xl font-black font-mono ml-3 text-yellow-400">
                            {selectedGame.awayScore}
                          </div>
                        </div>

                        {/* Center Matchup & Game Meta */}
                        <div className="text-center px-4 border-y md:border-y-0 md:border-x border-white/20 py-2">
                          <div className="text-xs uppercase tracking-widest font-black text-yellow-400">
                            {selectedGame.statusBadge}
                          </div>
                          <div className="text-lg md:text-xl font-black tracking-tight my-1">
                            {selectedGame.awayTeam?.abbreviation || 'AWY'} @ {selectedGame.homeTeam?.abbreviation || 'HOM'}
                          </div>
                          <div className="text-[11px] text-slate-300 font-mono flex items-center justify-center gap-2 flex-wrap">
                            <span>Game #{selectedGame.game_id}</span>
                            <span>•</span>
                            <span>Time: {selectedGame.stats?.game_length ? formatDayFractionOrTime(selectedGame.stats.game_length) : '15:00'}</span>
                            <span>•</span>
                            <span>FO: {selectedGame.stats?.total_faceoffs || 0}</span>
                          </div>
                        </div>

                        {/* Home Team */}
                        <div className="text-center md:text-right flex items-center gap-3 flex-row-reverse md:flex-row">
                          <div className="text-4xl md:text-5xl font-black font-mono mr-3 text-yellow-400">
                            {selectedGame.homeScore}
                          </div>
                          <div>
                            <div className="text-[10px] uppercase font-sans font-bold text-slate-400">Home Team</div>
                            <div className="text-2xl md:text-3xl font-black">{selectedGame.homeTeam?.team_name}</div>
                            <div className="text-xs text-slate-300 font-mono">
                              {selectedGame.stats?.home_coach ? `Coach: ${selectedGame.stats.home_coach}` : ''}
                            </div>
                            <div className="text-xs text-yellow-300 font-mono">
                              {periodSummary?.home.totalS || 0} SOG
                            </div>
                          </div>
                          {selectedGame.homeTeam?.logo_url && (
                            <img
                              src={selectedGame.homeTeam.logo_url}
                              className="w-12 h-12 md:w-14 md:h-14 object-contain"
                              alt="Home Team Logo"
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Period by Period Summary Table */}
                    {periodSummary && (
                      <div className="bg-[#f4f1ea] border-b-2 border-black p-3 overflow-x-auto">
                        <table className="w-full text-xs font-mono text-center">
                          <thead>
                            <tr className="border-b border-black/20 text-slate-600 font-sans uppercase">
                              <th className="text-left font-bold py-1">Team</th>
                              <th>1st</th>
                              <th>2nd</th>
                              <th>3rd</th>
                              {selectedGame.isOT && <th>OT</th>}
                              <th className="font-bold">Total</th>
                              <th className="font-bold">Shots</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-black/10">
                              <td className="text-left font-bold font-sans py-1">{selectedGame.awayTeam?.team_name}</td>
                              <td>{periodSummary.away.g1}</td>
                              <td>{periodSummary.away.g2}</td>
                              <td>{periodSummary.away.g3}</td>
                              {selectedGame.isOT && <td>{periodSummary.away.got}</td>}
                              <td className="font-bold text-sm bg-yellow-50">{periodSummary.away.totalG}</td>
                              <td className="text-slate-600">{periodSummary.away.totalS}</td>
                            </tr>
                            <tr>
                              <td className="text-left font-bold font-sans py-1">{selectedGame.homeTeam?.team_name}</td>
                              <td>{periodSummary.home.g1}</td>
                              <td>{periodSummary.home.g2}</td>
                              <td>{periodSummary.home.g3}</td>
                              {selectedGame.isOT && <td>{periodSummary.home.got}</td>}
                              <td className="font-bold text-sm bg-yellow-50">{periodSummary.home.totalG}</td>
                              <td className="text-slate-600">{periodSummary.home.totalS}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Navigation Tabs */}
                    <div className="flex border-b-2 border-black bg-white overflow-x-auto text-xs font-bold uppercase">
                      {[
                        { id: 'summary', label: 'Summary' },
                        { id: 'team_stats', label: 'Team Stats' },
                        { id: 'skaters', label: `Skaters (${gameBoxscore.skaters.length})` },
                        { id: 'goalies', label: `Goalies (${gameBoxscore.goalies.length})` },
                        { id: 'scoring', label: `Goals (${gameBoxscore.scoring.length})` },
                        { id: 'penalties', label: `Penalties (${gameBoxscore.penalties.length})` }
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setActiveTab(t.id as any)}
                          className={`px-4 py-2.5 transition whitespace-nowrap border-r border-black/20 cursor-pointer ${activeTab === t.id ? 'bg-black text-white' : 'hover:bg-slate-100 text-black'
                            }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {/* Tab Content Area */}
                    <div className="p-5">
                      {gameBoxscore.loading ? (
                        <div className="p-8 text-center text-xs font-bold uppercase text-slate-500 animate-pulse">
                          Fetching player statistics and game logs from database...
                        </div>
                      ) : (
                        <>
                          {/* 1. Summary Tab */}
                          {activeTab === 'summary' && (
                            <div className="space-y-6">
                              <div>
                                <h3 className="font-bold text-xs uppercase border-b border-black pb-1 mb-3 flex items-center gap-1.5">
                                  <Activity className="w-3.5 h-3.5" /> Game Recap
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                  <div className="p-3 bg-[#faf8f5] border border-black/20">
                                    <span className="font-bold text-slate-600 uppercase">Powerplay Efficiency:</span>
                                    <p className="mt-1 font-mono">
                                      <strong>{selectedGame.awayTeam?.abbreviation || 'AWAY'}:</strong> {awayStatsObj.away_pp_goals || 0}/{awayStatsObj.away_pp_opps || 0} ({formatDayFractionOrTime(awayStatsObj.away_pp_minutes)} TOI)
                                    </p>
                                    <p className="mt-1 font-mono">
                                      <strong>{selectedGame.homeTeam?.abbreviation || 'HOME'}:</strong> {homeStatsObj.home_pp_goals || 0}/{homeStatsObj.home_pp_opps || 0} ({formatDayFractionOrTime(homeStatsObj.home_pp_minutes)} TOI)
                                    </p>
                                  </div>
                                  <div className="p-3 bg-[#faf8f5] border border-black/20">
                                    <span className="font-bold text-slate-600 uppercase">Zone Time & Physicality:</span>
                                    <p className="mt-1 font-mono">
                                      <strong>Attack Zone:</strong> {formatDayFractionOrTime(awayStatsObj.away_atk)} vs {formatDayFractionOrTime(homeStatsObj.home_atk)}
                                    </p>
                                    <p className="mt-1 font-mono">
                                      <strong>Body Checks:</strong> {awayStatsObj.away_bodychecks || 0} vs {homeStatsObj.home_bodychecks || 0}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Top Performers */}
                              <div>
                                <h3 className="font-bold text-xs uppercase border-b border-black pb-1 mb-3 flex items-center gap-1.5">
                                  <Trophy className="w-3.5 h-3.5" /> Top Performers
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Away Leaders */}
                                  <div className="border border-black p-3 bg-white">
                                    <div className="font-bold text-xs uppercase mb-2 text-red-700">
                                      {selectedGame.awayTeam?.team_name} Leaders
                                    </div>
                                    <div className="space-y-1 text-xs">
                                      {gameBoxscore.skaters
                                        .filter(s => Number(s.team_id) === Number(selectedGame.away_team_id))
                                        .sort((a, b) => b.points - a.points || b.goals - a.goals)
                                        .slice(0, 3)
                                        .map((s, i) => (
                                          <div key={i} className="flex justify-between font-mono py-0.5 border-b border-slate-100">
                                            <span>{s.name} ({s.pos})</span>
                                            <span className="font-bold">{s.goals}G, {s.assists}A ({s.points} PTS)</span>
                                          </div>
                                        ))}
                                      {gameBoxscore.skaters.filter(s => Number(s.team_id) === Number(selectedGame.away_team_id)).length === 0 && (
                                        <p className="text-slate-400 italic text-[11px]">No skater stats logged.</p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Home Leaders */}
                                  <div className="border border-black p-3 bg-white">
                                    <div className="font-bold text-xs uppercase mb-2 text-blue-700">
                                      {selectedGame.homeTeam?.team_name} Leaders
                                    </div>
                                    <div className="space-y-1 text-xs">
                                      {gameBoxscore.skaters
                                        .filter(s => Number(s.team_id) === Number(selectedGame.home_team_id))
                                        .sort((a, b) => b.points - a.points || b.goals - a.goals)
                                        .slice(0, 3)
                                        .map((s, i) => (
                                          <div key={i} className="flex justify-between font-mono py-0.5 border-b border-slate-100">
                                            <span>{s.name} ({s.pos})</span>
                                            <span className="font-bold">{s.goals}G, {s.assists}A ({s.points} PTS)</span>
                                          </div>
                                        ))}
                                      {gameBoxscore.skaters.filter(s => Number(s.team_id) === Number(selectedGame.home_team_id)).length === 0 && (
                                        <p className="text-slate-400 italic text-[11px]">No skater stats logged.</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 2. Team Stats Comparison Tab */}
                          {activeTab === 'team_stats' && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs font-mono">
                                <thead>
                                  <tr className="border-b-2 border-black font-sans uppercase text-slate-600">
                                    <th className="text-left py-2 font-bold">{selectedGame.awayTeam?.team_name} (Away)</th>
                                    <th className="text-center py-2 font-bold text-black">Metric</th>
                                    <th className="text-right py-2 font-bold">{selectedGame.homeTeam?.team_name} (Home)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-black/10">
                                  {[
                                    { label: 'Total Goals', away: selectedGame.awayScore, home: selectedGame.homeScore },
                                    { label: 'Shots on Goal', away: awayStatsObj.away_shots || periodSummary?.away.totalS || 0, home: homeStatsObj.home_shots || periodSummary?.home.totalS || 0 },
                                    {
                                      label: 'Shooting %',
                                      away: `${(((Number(selectedGame.awayScore) || 0) / Math.max(1, Number(awayStatsObj.away_shots) || Number(periodSummary?.away.totalS) || 1)) * 100).toFixed(1)}%`,
                                      home: `${(((Number(selectedGame.homeScore) || 0) / Math.max(1, Number(homeStatsObj.home_shots) || Number(periodSummary?.home.totalS) || 1)) * 100).toFixed(1)}%`
                                    },
                                    { label: 'Power Play Goals / Opps', away: `${awayStatsObj.away_pp_goals || 0} / ${awayStatsObj.away_pp_opps || 0}`, home: `${homeStatsObj.home_pp_goals || 0} / ${homeStatsObj.home_pp_opps || 0}` },
                                    { label: 'Power Play Time', away: formatDayFractionOrTime(awayStatsObj.away_pp_minutes), home: formatDayFractionOrTime(homeStatsObj.home_pp_minutes) },
                                    { label: 'Power Play Shots', away: awayStatsObj.away_pp_shots || 0, home: homeStatsObj.home_pp_shots || 0 },
                                    { label: 'Short Handed Goals', away: awayStatsObj.away_sh_goals || 0, home: homeStatsObj.home_sh_goals || 0 },
                                    { label: 'Faceoffs Won', away: awayStatsObj.away_faceoff_won || 0, home: homeStatsObj.home_faceoff_won || 0 },
                                    { label: 'Body Checks', away: awayStatsObj.away_bodychecks || 0, home: homeStatsObj.home_bodychecks || 0 },
                                    { label: 'Penalties / PIM', away: `${awayStatsObj.away_pen || 0} (${awayStatsObj.away_pim || 0} min)`, home: `${homeStatsObj.home_pen || 0} (${homeStatsObj.home_pim || 0} min)` },
                                    { label: 'Attack Zone Time', away: formatDayFractionOrTime(awayStatsObj.away_atk), home: formatDayFractionOrTime(homeStatsObj.home_atk) },
                                    { label: 'Pass Comps / Attempts', away: `${awayStatsObj.away_pass_completions || 0} / ${awayStatsObj.away_pass_attempts || 0}`, home: `${homeStatsObj.home_pass_completions || 0} / ${homeStatsObj.home_pass_attempts || 0}` },
                                    { label: 'Breakaway Goals / Tries', away: `${awayStatsObj.away_breakaway_goals || 0} / ${awayStatsObj.away_breakaways || 0}`, home: `${homeStatsObj.home_breakaway_goals || 0} / ${homeStatsObj.home_breakaways || 0}` },
                                    { label: 'One-Timer Goals / Tries', away: `${awayStatsObj.away_onetimer_goals || 0} / ${awayStatsObj.away_onetimers || 0}`, home: `${homeStatsObj.home_onetimer_goals || 0} / ${homeStatsObj.home_onetimers || 0}` },
                                    { label: 'Penalty Shot Goals / Tries', away: `${awayStatsObj.away_penalty_shot_goals || 0} / ${awayStatsObj.away_penalty_shots || 0}`, home: `${homeStatsObj.home_penalty_shot_goals || 0} / ${homeStatsObj.home_penalty_shots || 0}` }
                                  ].map((m, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                      <td className="py-2 text-left font-bold">{m.away}</td>
                                      <td className="py-2 text-center font-sans text-slate-700">{m.label}</td>
                                      <td className="py-2 text-right font-bold">{m.home}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* 3. Skaters Tab */}
                          {activeTab === 'skaters' && (
                            <div className="space-y-6">
                              {/* Away Skaters */}
                              <div>
                                <h4 className="font-bold text-xs uppercase border-b-2 border-black pb-1 mb-2 text-red-800">
                                  {selectedGame.awayTeam?.team_name} Skaters (Away)
                                </h4>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs font-mono text-center">
                                    <thead>
                                      <tr className="border-b border-black/20 text-slate-600 font-sans uppercase">
                                        <th className="text-left py-1">Player</th>
                                        <th>Pos</th>
                                        <th className="font-bold">G</th>
                                        <th className="font-bold">A</th>
                                        <th className="font-bold">PTS</th>
                                        <th>SOG</th>
                                        <th>CHK</th>
                                        <th>PIM</th>
                                        <th>PPP</th>
                                        <th>SHP</th>
                                        <th>TOI</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/10">
                                      {gameBoxscore.skaters
                                        .filter(s => Number(s.team_id) === Number(selectedGame.away_team_id))
                                        .map((s, i) => (
                                          <tr key={i} className={s.toi === '0:00' ? 'opacity-40' : 'hover:bg-slate-50'}>
                                            <td className="text-left font-bold font-sans py-1">{s.name}</td>
                                            <td>{s.pos}</td>
                                            <td className="font-bold">{s.goals}</td>
                                            <td className="font-bold">{s.assists}</td>
                                            <td className="font-bold text-sm bg-yellow-50">{s.points}</td>
                                            <td>{s.sog}</td>
                                            <td>{s.checks}</td>
                                            <td>{s.pim}</td>
                                            <td>{s.ppp}</td>
                                            <td>{s.shp}</td>
                                            <td>{s.toi}</td>
                                          </tr>
                                        ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              {/* Home Skaters */}
                              <div>
                                <h4 className="font-bold text-xs uppercase border-b-2 border-black pb-1 mb-2 text-blue-800">
                                  {selectedGame.homeTeam?.team_name} Skaters (Home)
                                </h4>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs font-mono text-center">
                                    <thead>
                                      <tr className="border-b border-black/20 text-slate-600 font-sans uppercase">
                                        <th className="text-left py-1">Player</th>
                                        <th>Pos</th>
                                        <th className="font-bold">G</th>
                                        <th className="font-bold">A</th>
                                        <th className="font-bold">PTS</th>
                                        <th>SOG</th>
                                        <th>CHK</th>
                                        <th>PIM</th>
                                        <th>PPP</th>
                                        <th>SHP</th>
                                        <th>TOI</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/10">
                                      {gameBoxscore.skaters
                                        .filter(s => Number(s.team_id) === Number(selectedGame.home_team_id))
                                        .map((s, i) => (
                                          <tr key={i} className={s.toi === '0:00' ? 'opacity-40' : 'hover:bg-slate-50'}>
                                            <td className="text-left font-bold font-sans py-1">{s.name}</td>
                                            <td>{s.pos}</td>
                                            <td className="font-bold">{s.goals}</td>
                                            <td className="font-bold">{s.assists}</td>
                                            <td className="font-bold text-sm bg-yellow-50">{s.points}</td>
                                            <td>{s.sog}</td>
                                            <td>{s.checks}</td>
                                            <td>{s.pim}</td>
                                            <td>{s.ppp}</td>
                                            <td>{s.shp}</td>
                                            <td>{s.toi}</td>
                                          </tr>
                                        ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 4. Goalies Tab */}
                          {activeTab === 'goalies' && (
                            <div className="space-y-6">
                              {/* Away Goalies */}
                              <div>
                                <h4 className="font-bold text-xs uppercase border-b-2 border-black pb-1 mb-2 text-red-800">
                                  {selectedGame.awayTeam?.team_name} Goaltenders (Away)
                                </h4>
                                <table className="w-full text-xs font-mono text-center">
                                  <thead>
                                    <tr className="border-b border-black/20 text-slate-600 font-sans uppercase">
                                      <th className="text-left py-1">Goalie</th>
                                      <th>GA</th>
                                      <th>Saves</th>
                                      <th>Shots</th>
                                      <th>SV%</th>
                                      <th>SO</th>
                                      <th>Dec</th>
                                      <th>TOI</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-black/10">
                                    {gameBoxscore.goalies
                                      .filter(g => Number(g.team_id) === Number(selectedGame.away_team_id))
                                      .map((g, i) => (
                                        <tr key={i} className={g.toi === '0:00' ? 'opacity-40' : 'hover:bg-slate-50'}>
                                          <td className="text-left font-bold font-sans py-1">{g.name}</td>
                                          <td className="font-bold text-red-700">{g.ga}</td>
                                          <td className="font-bold">{g.saves}</td>
                                          <td>{g.shots}</td>
                                          <td className="font-bold font-mono">{(g.savePct * 100).toFixed(1)}%</td>
                                          <td>{g.so}</td>
                                          <td className="font-bold">{g.decision}</td>
                                          <td>{g.toi}</td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              </div>

                              {/* Home Goalies */}
                              <div>
                                <h4 className="font-bold text-xs uppercase border-b-2 border-black pb-1 mb-2 text-blue-800">
                                  {selectedGame.homeTeam?.team_name} Goaltenders (Home)
                                </h4>
                                <table className="w-full text-xs font-mono text-center">
                                  <thead>
                                    <tr className="border-b border-black/20 text-slate-600 font-sans uppercase">
                                      <th className="text-left py-1">Goalie</th>
                                      <th>GA</th>
                                      <th>Saves</th>
                                      <th>Shots</th>
                                      <th>SV%</th>
                                      <th>SO</th>
                                      <th>Dec</th>
                                      <th>TOI</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-black/10">
                                    {gameBoxscore.goalies
                                      .filter(g => Number(g.team_id) === Number(selectedGame.home_team_id))
                                      .map((g, i) => (
                                        <tr key={i} className={g.toi === '0:00' ? 'opacity-40' : 'hover:bg-slate-50'}>
                                          <td className="text-left font-bold font-sans py-1">{g.name}</td>
                                          <td className="font-bold text-red-700">{g.ga}</td>
                                          <td className="font-bold">{g.saves}</td>
                                          <td>{g.shots}</td>
                                          <td className="font-bold font-mono">{(g.savePct * 100).toFixed(1)}%</td>
                                          <td>{g.so}</td>
                                          <td className="font-bold">{g.decision}</td>
                                          <td>{g.toi}</td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* 5. Scoring Log Tab */}
                          {activeTab === 'scoring' && (
                            <div>
                              <h4 className="font-bold text-xs uppercase border-b-2 border-black pb-1 mb-3">Scoring Log</h4>
                              {gameBoxscore.scoring.length > 0 ? (
                                <table className="w-full text-xs font-mono text-left">
                                  <thead>
                                    <tr className="border-b border-black/20 text-slate-600 font-sans uppercase">
                                      <th className="py-1">#</th>
                                      <th>Per</th>
                                      <th>Time</th>
                                      <th>Team</th>
                                      <th>Goal Scorer</th>
                                      <th>Assist 1</th>
                                      <th>Assist 2</th>
                                      <th>Type</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-black/10">
                                    {gameBoxscore.scoring.map((g, i) => (
                                      <tr key={i} className="hover:bg-slate-50">
                                        <td className="py-1">{g.goalNum}</td>
                                        <td className="font-bold">{g.period}</td>
                                        <td>{g.time}</td>
                                        <td className="font-bold font-sans">{g.team}</td>
                                        <td className="font-bold text-green-900">{g.scorer}</td>
                                        <td className="text-slate-600">{g.assist1}</td>
                                        <td className="text-slate-600">{g.assist2}</td>
                                        <td>
                                          <span className="px-1.5 py-0.5 bg-black text-white text-[10px] uppercase font-sans font-bold">
                                            {g.type}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <p className="text-xs italic text-slate-500">No scoring events recorded in database.</p>
                              )}
                            </div>
                          )}

                          {/* 6. Penalties Log Tab */}
                          {activeTab === 'penalties' && (
                            <div>
                              <h4 className="font-bold text-xs uppercase border-b-2 border-black pb-1 mb-3">Penalty Log</h4>
                              {gameBoxscore.penalties.length > 0 ? (
                                <table className="w-full text-xs font-mono text-left">
                                  <thead>
                                    <tr className="border-b border-black/20 text-slate-600 font-sans uppercase">
                                      <th className="py-1">#</th>
                                      <th>Per</th>
                                      <th>Time</th>
                                      <th>Team</th>
                                      <th>Player</th>
                                      <th>Infraction</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-black/10">
                                    {gameBoxscore.penalties.map((p, i) => (
                                      <tr key={i} className="hover:bg-slate-50">
                                        <td className="py-1">{p.penNum}</td>
                                        <td className="font-bold">{p.period}</td>
                                        <td>{p.time}</td>
                                        <td className="font-bold font-sans">{p.team}</td>
                                        <td className="font-bold">{p.player}</td>
                                        <td>
                                          <span className="px-1.5 py-0.5 bg-red-100 text-red-800 border border-red-300 text-[10px] uppercase font-sans font-bold">
                                            {p.type}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <p className="text-xs italic text-slate-500">No penalties recorded in database.</p>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  /* ==================================================== */
                  /* UNPLAYED / REMAINING GAME: UPCOMING FIXTURE CARD      */
                  /* ==================================================== */
                  <div className="bg-white border-2 border-black p-8 text-center shadow-sm">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 border border-amber-400 text-amber-900 text-xs font-black uppercase tracking-wider mb-6">
                      <Clock className="w-4 h-4 text-amber-700" />
                      Upcoming Fixture • Game #{selectedGame.game_id}
                    </div>

                    <div className="flex items-center justify-around gap-6 my-6 border-y-2 border-black/10 py-8">
                      {/* Away Team */}
                      <div className="text-center flex-1">
                        {selectedGame.awayTeam?.logo_url ? (
                          <img
                            src={selectedGame.awayTeam.logo_url}
                            className="w-20 h-20 mx-auto object-contain mb-3"
                            alt="Away Logo"
                          />
                        ) : (
                          <div className="w-20 h-20 mx-auto bg-slate-100 border-2 border-black flex items-center justify-center font-bold text-sm mb-3">
                            {selectedGame.awayTeam?.abbreviation || 'AWY'}
                          </div>
                        )}
                        <h3 className="font-black text-base md:text-lg uppercase">{selectedGame.awayTeam?.team_name}</h3>
                        <p className="text-xs text-slate-500 uppercase font-mono mt-1">Visiting Team</p>
                      </div>

                      <div className="text-center">
                        <span className="text-3xl font-black font-mono text-slate-400">VS</span>
                      </div>

                      {/* Home Team */}
                      <div className="text-center flex-1">
                        {selectedGame.homeTeam?.logo_url ? (
                          <img
                            src={selectedGame.homeTeam.logo_url}
                            className="w-20 h-20 mx-auto object-contain mb-3"
                            alt="Home Logo"
                          />
                        ) : (
                          <div className="w-20 h-20 mx-auto bg-slate-100 border-2 border-black flex items-center justify-center font-bold text-sm mb-3">
                            {selectedGame.homeTeam?.abbreviation || 'HOM'}
                          </div>
                        )}
                        <h3 className="font-black text-base md:text-lg uppercase">{selectedGame.homeTeam?.team_name}</h3>
                        <p className="text-xs text-slate-500 uppercase font-mono mt-1">Home Team</p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 max-w-md mx-auto mb-6 italic">
                      This game has not been submitted yet. Play the fixture in RetroArch and drop your save state in the ingestion terminal to publish the boxscore.
                    </p>

                    <Link
                      href="/upload"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white hover:bg-slate-800 text-xs font-bold uppercase transition border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]"
                    >
                      <Upload className="w-4 h-4" /> Go to Save State Uploader &rarr;
                    </Link>
                  </div>
                )
              ) : (
                <div className="bg-white border-2 border-dashed border-black/30 p-12 text-center min-h-[400px] flex flex-col items-center justify-center">
                  <Shield className="w-12 h-12 text-slate-300 mb-3" />
                  <h3 className="text-sm font-bold uppercase text-slate-600 mb-1">
                    Select a Scheduled Game
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Click any matchup on the left to inspect period-by-period scoring, skater statlines, goalie save percentages, and penalty logs.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}