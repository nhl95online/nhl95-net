"use client";

import React, { useState, useEffect } from 'react';
import {
  Upload, FileCode, CheckCircle, AlertTriangle, Download,
  Database, RefreshCw, Sliders, Settings, FileSpreadsheet, Eye, Check, Code
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ==========================================
// 1. DATA TYPES & INTERFACES
// ==========================================

export interface TeamPositionCount {
  goalies: number;
  forwards: number;
  defensemen: number;
}

export interface SeasonConfig {
  seasonId: number | string;
  seasonName: string;
  leagueCode?: string;
  leagueType: string;
  teamCodes: Record<number, string>;
  teamPositionCounts: Record<string, TeamPositionCount>;
  goalies: Record<string, string[]>;
  skaters: Record<string, string[]>;
}

export function getLeagueCode(seasonId: number | string): string {
  const sId = Number(seasonId);
  const map: Record<number, string> = {
    40: 'W18',
    39: 'O01',
    38: 'W17',
    1: 'W01'
  };
  return map[sId] || `W${String(sId).padStart(2, '0')}`;
}

export interface ParsedGoal {
  goalNum: number;
  period: number;
  time: string;
  seconds: number;
  team: string;
  side: 'Home' | 'Away';
  scorer: string;
  assist1: string;
  assist2: string;
  type: string;
}

export interface ParsedPenalty {
  penNum: number;
  period: number;
  time: string;
  seconds: number;
  team: string;
  side: 'Home' | 'Away';
  player: string;
  type: string;
}

export interface ParsedSkaterStat {
  name: string;
  pos: 'F' | 'D';
  team: string;
  side: 'Home' | 'Away';
  goals: number;
  assists: number;
  points: number;
  sog: number;
  checks: number;
  pim: number;
  ppp: number;
  shp: number;
  toi: string;
  toiSeconds: number;
}

export interface ParsedGoalieStat {
  name: string;
  pos: 'G';
  team: string;
  side: 'Home' | 'Away';
  goals: number;
  assists: number;
  points: number;
  so: number;
  ga: number;
  saves: number;
  shots: number;
  savePct: number;
  w: number;
  l: number;
  t: number;
  otl: number;
  toi: string;
  toiSeconds: number;
}

export interface ParsedTeamStats {
  teamCode: string;
  goals: number;
  shots: number;
  shootingPct: number;
  ppGoals: number;
  ppTries: number;
  ppTime: string;
  ppShots: number;
  shGoals: number;
  breakawayGoals: number;
  breakawayTries: number;
  oneTimerGoals: number;
  oneTimerTries: number;
  penaltyShotGoals: number;
  penaltyShotTries: number;
  faceoffWins: number;
  checks: number;
  penalties: number;
  pim: number;
  attackZoneTime: string;
  passComps: number;
  passTries: number;
  goalsP1: number;
  goalsP2: number;
  goalsP3: number;
  goalsOT: number;
  shotsP1: number;
  shotsP2: number;
  shotsP3: number;
  shotsOT: number;
}

export interface ParsedGame {
  matchup: string;
  homeTeam: ParsedTeamStats;
  awayTeam: ParsedTeamStats;
  isOT: boolean;
  gameLength: string;
  totalFaceoffs: number;
  goals: ParsedGoal[];
  penalties: ParsedPenalty[];
  homeGoalies: ParsedGoalieStat[];
  awayGoalies: ParsedGoalieStat[];
  homeSkaters: ParsedSkaterStat[];
  awaySkaters: ParsedSkaterStat[];
}

// ==========================================
// 2. OFFICIAL W-LEAGUE ROSTERS & CONSTANTS
// ==========================================

export const DEFAULT_TEAM_CODES: Record<number, string> = {
  0: 'AUT', 1: 'BAR', 2: 'BAY', 3: 'BFC', 4: 'DHG', 5: 'GRH',
  6: 'HAM', 7: 'HIG', 8: 'ING', 9: 'ITA', 10: 'KAR', 11: 'MHA',
  12: 'MHT', 13: 'MGG', 14: 'NBK', 15: 'OCW', 16: 'PIT', 17: 'PRO',
  18: 'RIC', 19: 'ROC', 20: 'SHS', 21: 'SVF', 22: 'SUM', 23: 'TAI',
  24: 'TEG', 25: 'TBP', 26: 'VHV', 27: 'WDY', 28: 'ETI'
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

export const W_LEAGUE_POSITION_COUNTS: Record<string, TeamPositionCount> = Object.keys(W_LEAGUE_SKATERS).reduce((acc, team) => {
  acc[team] = { goalies: 2, forwards: 5, defensemen: 3 };
  return acc;
}, {} as Record<string, TeamPositionCount>);

export const O_LEAGUE_TEAM_CODES: Record<number, string> = {
  0: 'BOS',
  1: 'CHI',
  2: 'DTC',
  3: 'MTL',
  4: 'NYR',
  5: 'TOR'
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
  BOS: [
    'Percy Galbraith', 'Jimmy Herbert', 'Harry Oliver', 'Frank Fredrickson', 'Carson Cooper',
    'Lionel Hitchman', 'Eddie Shore', 'Billy Stuart'
  ],
  CHI: [
    'Babe Dye', 'George Hay', 'Dick Irvin', 'Mickey MacKay', 'Charley McVeigh',
    'Bob Trapp', 'Percy Traub', 'Gord Fraser'
  ],
  DTC: [
    'Duke Keats', 'Frank Foyston', 'Fred Gordon', 'Johnny Sheppard', 'Jack Walker',
    'Jack Arbour', 'Art Duncan', 'Clem Loughlin'
  ],
  MTL: [
    'Pit Lepine', 'Howie Morenz', 'Art Gagne', 'Aurele Joliat', 'Billy Boucher',
    'Albert Leduc', 'Herb Gardiner', 'Sylvio Mantha'
  ],
  NYR: [
    'Frank Boucher', 'Bill Cook', 'Bun Cook', 'Murray Murdoch', 'Paul Thompson',
    'Reg Mackey', 'Stan Brown', 'Clarence Abel'
  ],
  TOR: [
    'Ace Bailey', 'Bill Carson', 'George Patterson', 'Butch Keeling', 'Corb Denneny',
    'Hap Day', 'Bert Corbeau', 'Bill Brydge'
  ]
};

export const O_LEAGUE_POSITION_COUNTS: Record<string, TeamPositionCount> = Object.keys(O_LEAGUE_SKATERS).reduce((acc, team) => {
  acc[team] = { goalies: 2, forwards: 5, defensemen: 3 };
  return acc;
}, {} as Record<string, TeamPositionCount>);

export const AVAILABLE_SEASONS: SeasonConfig[] = [
  {
    seasonId: 39,
    seasonName: 'O League - Season 1 (O01 / Season 39)',
    leagueType: 'O',
    teamCodes: O_LEAGUE_TEAM_CODES,
    teamPositionCounts: O_LEAGUE_POSITION_COUNTS,
    goalies: O_LEAGUE_GOALIES,
    skaters: O_LEAGUE_SKATERS
  },
  {
    seasonId: 40,
    seasonName: 'W League - Season 18 (W18 / Season 40)',
    leagueType: 'W',
    teamCodes: DEFAULT_TEAM_CODES,
    teamPositionCounts: W_LEAGUE_POSITION_COUNTS,
    goalies: W_LEAGUE_GOALIES,
    skaters: W_LEAGUE_SKATERS
  }
];

export const GOAL_TYPE_DICT: Record<number, { side: 'Home' | 'Away'; status: string }> = {
  0: { side: 'Home', status: 'SH2' },
  1: { side: 'Home', status: 'SH' },
  2: { side: 'Home', status: 'EV' },
  3: { side: 'Home', status: 'PP' },
  4: { side: 'Home', status: 'PP2' },
  128: { side: 'Away', status: 'SH2' },
  129: { side: 'Away', status: 'SH' },
  130: { side: 'Away', status: 'EV' },
  131: { side: 'Away', status: 'PP' },
  132: { side: 'Away', status: 'PP2' }
};

export const PENALTY_DICT: Record<number, { side: 'Home' | 'Away'; type: string }> = {
  18: { side: 'Home', type: 'Boarding' },
  22: { side: 'Home', type: 'Charging' },
  24: { side: 'Home', type: 'Slashing' },
  26: { side: 'Home', type: 'Roughing' },
  28: { side: 'Home', type: 'Cross-Checking' },
  30: { side: 'Home', type: 'Hooking' },
  32: { side: 'Home', type: 'Tripping' },
  34: { side: 'Home', type: 'Interference' },
  36: { side: 'Home', type: 'Holding' },
  38: { side: 'Home', type: 'Fighting' },
  146: { side: 'Away', type: 'Boarding' },
  150: { side: 'Away', type: 'Charging' },
  152: { side: 'Away', type: 'Slashing' },
  154: { side: 'Away', type: 'Roughing' },
  156: { side: 'Away', type: 'Cross-Checking' },
  158: { side: 'Away', type: 'Hooking' },
  160: { side: 'Away', type: 'Tripping' },
  162: { side: 'Away', type: 'Interference' },
  164: { side: 'Away', type: 'Holding' },
  166: { side: 'Away', type: 'Fighting' }
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function parseTimeToDayFraction(timeStr: string): string {
  if (!timeStr) return '0';
  const parts = timeStr.split(':').map(Number);
  const minutes = parts[0] || 0;
  const seconds = parts[1] || 0;
  const totalFraction = (minutes + seconds / 60) / 24;
  return totalFraction.toString();
}

export const TEAM_CITY_ALIASES: Record<string, string> = {
  // W League
  AUT: 'AUTOBAHN', BAR: 'BARRIE', BAY: 'BAYTOWN', BFC: 'BETTY FORD', DHG: 'DEVIN HILL',
  GRH: 'GRAND RIVER', HAM: 'HAMILTON', HIG: 'HIGHLAND', ING: 'INGLEWOOD', ITA: 'ITALY',
  KAR: 'KAROLINA', MHA: 'MARYHILL', MHT: 'MINHATTRICK', MGG: 'MINNESOTA', NBK: 'NORTH BAY',
  OCW: 'ORANGE COUNTY', PIT: 'PITTSBURGH', PRO: 'PROVIDENCE', RIC: 'RICHFIELD', ROC: 'ROCKFORD',
  SHS: 'SOUTH HILLS', SVF: 'SUGAR VALLEY', SUM: 'SUMTER', TAI: 'TAIPEI', TEG: 'TEGUCIGALPA',
  TBP: 'THUNDER BAY', VHV: 'VALHALLA', WDY: 'WOODLYNNE', ETI: 'EASTER ISLAND',
  // O League
  BOS: 'BOSTON', CHI: 'CHICAGO', DTC: 'DETROIT', MTL: 'MONTREAL', NYR: 'NEW YORK', TOR: 'TORONTO',
  DET: 'DETROIT', NY: 'NEW YORK', 'DEVN HILL': 'DEVIN HILL', RICHMOND: 'RICHFIELD', RFD: 'RICHFIELD'
};

export const W_LEAGUE_COACH_MAP: Record<string, { coach_id: number; coach_name: string; city: string }> = {
  AUT: { coach_id: 2, coach_name: 'Autobahn', city: 'AUTOBAHN' },
  BAR: { coach_id: 65, coach_name: 'Dasri', city: 'BARRIE' },
  BAY: { coach_id: 49, coach_name: 'Jer_33', city: 'BAYTOWN' },
  BFC: { coach_id: 58, coach_name: 'Krav1', city: 'BETTY FORD' },
  DHG: { coach_id: 67, coach_name: 'vancecookcobxin', city: 'DEVIN HILL' },
  GRH: { coach_id: 25, coach_name: 'Moses Bogart', city: 'GRAND RIVER' },
  HAM: { coach_id: 37, coach_name: 'Derek Sutton', city: 'HAMILTON' },
  HIG: { coach_id: 9, coach_name: 'wolf_of_highland', city: 'HIGHLAND' },
  ING: { coach_id: 50, coach_name: 'Don Don', city: 'INGLEWOOD' },
  ITA: { coach_id: 14, coach_name: 'Marcus Vick EBC', city: 'ITALY' },
  KAR: { coach_id: 39, coach_name: 'MattyA', city: 'KAROLINA' },
  MHA: { coach_id: 54, coach_name: 'red', city: 'MARYHILL' },
  MHT: { coach_id: 13, coach_name: 'segathon', city: 'MINHATTRICK' },
  MGG: { coach_id: 12, coach_name: 'gaelicgopher', city: 'MINNESOTA' },
  NBK: { coach_id: 26, coach_name: 'Unholy Grail', city: 'NORTH BAY' },
  OCW: { coach_id: 51, coach_name: 'MNYoda84', city: 'ORANGE COUNTY' },
  PIT: { coach_id: 17, coach_name: 'Adolf Oliver Nipples', city: 'PITTSBURGH' },
  PRO: { coach_id: 30, coach_name: 'Lloyd10Xmas', city: 'PROVIDENCE' },
  RIC: { coach_id: 19, coach_name: 'bclinton_666', city: 'RICHFIELD' },
  ROC: { coach_id: 66, coach_name: 'The Villain CTJ', city: 'ROCKFORD' },
  SHS: { coach_id: 60, coach_name: 'marylandmike.', city: 'SOUTH HILLS' },
  SVF: { coach_id: 20, coach_name: 'Chalkitup7777', city: 'SUGAR VALLEY' },
  SUM: { coach_id: 21, coach_name: 'Pink Elephants', city: 'SUMTER' },
  TAI: { coach_id: 28, coach_name: 'NathanMB', city: 'TAIPEI' },
  TEG: { coach_id: 24, coach_name: 'Ticklepuss', city: 'TEGUCIGALPA' },
  TBP: { coach_id: 29, coach_name: 'shawnbell', city: 'THUNDER BAY' },
  VHV: { coach_id: 15, coach_name: 'UltraMagnus', city: 'VALHALLA' },
  WDY: { coach_id: 63, coach_name: 'NewJerseyKiller', city: 'WOODLYNNE' },
  ETI: { coach_id: 18, coach_name: 'LHX', city: 'EASTER ISLAND' }
};

export function matchTeamFromList(code: string, teamsList: any[]) {
  if (!code) return undefined;
  const cleanCode = code.trim().toUpperCase();
  const alias = (TEAM_CITY_ALIASES[cleanCode] || cleanCode).toUpperCase();
  const known = W_LEAGUE_COACH_MAP[cleanCode];

  if (teamsList && teamsList.length > 0) {
    // 1. Exact Abbreviation Match
    const exactAbbr = teamsList.find(t => (t.abbreviation || '').trim().toUpperCase() === cleanCode);
    if (exactAbbr) return exactAbbr;

    // 2. Exact Team Name Match to City/Alias or Code
    const exactName = teamsList.find(t => {
      const name = (t.team_name || '').trim().toUpperCase();
      if (name === alias || name === cleanCode) return true;
      if (cleanCode === 'RIC' && (name === 'RICHFIELD' || name === 'RICHMOND')) return true;
      if (cleanCode === 'MHT' && (name === 'MANOTICK' || name === 'MHT')) return true;
      return false;
    });
    if (exactName) return exactName;

    // 3. Exact Coach ID Match if known
    if (known && known.coach_id) {
      const coachMatch = teamsList.find(t => Number(t.coach_id) === Number(known.coach_id));
      if (coachMatch) return coachMatch;
    }

    // 4. Exact Coach Name Match if known
    if (known && known.coach_name) {
      const coachNameMatch = teamsList.find(t => {
        const cName = ((t.league_coaches?.coach_name || (Array.isArray(t.league_coaches) ? t.league_coaches[0]?.coach_name : null)) || '').trim().toLowerCase();
        return cName === known.coach_name.toLowerCase();
      });
      if (coachNameMatch) return coachNameMatch;
    }

    // 5. Word Boundary Match on City/Alias
    const wordBoundaryMatch = teamsList.find(t => {
      const name = (t.team_name || '').trim().toUpperCase();
      const regex = new RegExp(`\\b${alias}\\b`, 'i');
      if (regex.test(name)) return true;
      if (cleanCode === 'RIC' && /\b(RICHFIELD|RICHMOND)\b/i.test(name)) return true;
      if (cleanCode === 'MHT' && /\bMANOTICK\b/i.test(name)) return true;
      return false;
    });
    if (wordBoundaryMatch) return wordBoundaryMatch;

    // 6. StartsWith Match with word separator
    const startsWithMatch = teamsList.find(t => {
      const name = (t.team_name || '').trim().toUpperCase();
      if (name.startsWith(alias + ' ') || name.startsWith(cleanCode + ' ')) return true;
      if (cleanCode === 'RIC' && (name.startsWith('RICHFIELD') || name.startsWith('RICHMOND'))) return true;
      if (cleanCode === 'MHT' && name.startsWith('MANOTICK')) return true;
      return false;
    });
    if (startsWithMatch) return startsWithMatch;

    // 7. Contains Match
    const containsMatch = teamsList.find(t => {
      const name = (t.team_name || '').trim().toUpperCase();
      if (name.includes(alias) || (cleanCode === 'RIC' && (name.includes('RICHFIELD') || name.includes('RICHMOND')))) return true;
      if (cleanCode === 'MHT' && name.includes('MANOTICK')) return true;
      return false;
    });
    if (containsMatch) return containsMatch;
  }

  // Fallback if not found in dbTeams but known in map
  if (known) {
    return {
      team_id: 0,
      team_name: known.city,
      abbreviation: cleanCode,
      coach_id: known.coach_id,
      league_coaches: { coach_id: known.coach_id, coach_name: known.coach_name }
    };
  }

  return undefined;
}

export function parseSaveStateBuffer(buffer: Uint8Array, config?: Partial<SeasonConfig>): ParsedGame {
  const teamCodes = config?.teamCodes || DEFAULT_TEAM_CODES;
  const teamPositionCounts = config?.teamPositionCounts || W_LEAGUE_POSITION_COUNTS;
  const goalieDict = config?.goalies || W_LEAGUE_GOALIES;
  const skaterDict = config?.skaters || W_LEAGUE_SKATERS;

  if (buffer.length < 52000) {
    throw new Error(`Invalid save state: file size too small (${buffer.length} bytes, minimum 52KB expected).`);
  }

  let offset = 32;
  if (buffer[48980 + offset] > 30 && buffer[48980] <= 30) {
    offset = 0;
  }

  const d = buffer;

  // Away General Stats
  const awayGoals = d[50682 + offset];
  const awayPPGoals = d[50672 + offset];
  const awayPPTries = d[50674 + offset];
  const awayPPTimeSec = d[51522 + offset] + d[51523 + offset] * 256;
  const awayPPShots = d[51524 + offset];
  const awaySHGoals = d[51526 + offset];
  const awayBreakGoals = d[51530 + offset];
  const awayBreakTries = d[51528 + offset];
  const awayOneTimerGoals = d[51534 + offset];
  const awayOneTimerTries = d[51532 + offset];
  const awayPenShotGoals = d[51538 + offset];
  const awayPenShotTries = d[51536 + offset];
  const awayFaceoffWins = d[50684 + offset];
  const awayChecks = d[50686 + offset];
  const awayPenalties = d[50676 + offset];
  const awayPIM = d[50678 + offset];
  const awayAttackZoneTimeSec = d[50680 + offset] + d[50681 + offset] * 256;
  const awayPassComps = d[50690 + offset];
  let awayPassTries = d[50688 + offset];
  if (awayPassTries < awayPassComps) awayPassTries += 256;

  const awayGoalsP1 = d[51506 + offset];
  const awayGoalsP2 = d[51508 + offset];
  const awayGoalsP3 = d[51510 + offset];
  const awayGoalsOT = d[51512 + offset];
  const awayShotsP1 = d[51514 + offset];
  const awayShotsP2 = d[51516 + offset];
  const awayShotsP3 = d[51518 + offset];
  const awayShotsOT = d[51520 + offset];

  const awayTeamCodeByte = d[48982 + offset];
  const awayTeamCode = teamCodes[awayTeamCodeByte] || `TM_${awayTeamCodeByte}`;
  const awayShots = awayShotsP1 + awayShotsP2 + awayShotsP3 + awayShotsOT;
  const awayShootPct = awayShots > 0 ? Number((awayGoals / awayShots).toFixed(3)) : 0;

  // Home General Stats
  const homeGoals = d[49812 + offset];
  const homePPGoals = d[49802 + offset];
  const homePPTries = d[49804 + offset];
  const homePPTimeSec = d[50652 + offset] + d[50653 + offset] * 256;
  const homePPShots = d[50654 + offset];
  const homeSHGoals = d[50656 + offset];
  const homeBreakGoals = d[50660 + offset];
  const homeBreakTries = d[50658 + offset];
  const homeOneTimerGoals = d[50664 + offset];
  const homeOneTimerTries = d[50662 + offset];
  const homePenShotGoals = d[50668 + offset];
  const homePenShotTries = d[50666 + offset];
  const homeFaceoffWins = d[49814 + offset];
  const homeChecks = d[49816 + offset];
  const homePenalties = d[49806 + offset];
  const homePIM = d[49808 + offset];
  const homeAttackZoneTimeSec = d[49810 + offset] + d[49811 + offset] * 256;
  const homePassComps = d[49820 + offset];
  let homePassTries = d[49818 + offset];
  if (homePassTries < homePassComps) homePassTries += 256;

  const homeGoalsP1 = d[50636 + offset];
  const homeGoalsP2 = d[50638 + offset];
  const homeGoalsP3 = d[50640 + offset];
  const homeGoalsOT = d[50642 + offset];
  const homeShotsP1 = d[50644 + offset];
  const homeShotsP2 = d[50646 + offset];
  const homeShotsP3 = d[50648 + offset];
  const homeShotsOT = d[50650 + offset];

  const homeTeamCodeByte = d[48980 + offset];
  const homeTeamCode = teamCodes[homeTeamCodeByte] || `TM_${homeTeamCodeByte}`;
  const homeShots = homeShotsP1 + homeShotsP2 + homeShotsP3 + homeShotsOT;
  const homeShootPct = homeShots > 0 ? Number((homeGoals / homeShots).toFixed(3)) : 0;

  // Roster Configuration
  const awayGCount = teamPositionCounts[awayTeamCode]?.goalies ?? 2;
  const awayFCount = teamPositionCounts[awayTeamCode]?.forwards ?? 5;
  const awayDCount = teamPositionCounts[awayTeamCode]?.defensemen ?? 3;

  const homeGCount = teamPositionCounts[homeTeamCode]?.goalies ?? 2;
  const homeFCount = teamPositionCounts[homeTeamCode]?.forwards ?? 5;
  const homeDCount = teamPositionCounts[homeTeamCode]?.defensemen ?? 3;

  const awayGoalieNames = goalieDict[awayTeamCode] || ['Goalie 1', 'Goalie 2'];
  const awaySkaterNames = skaterDict[awayTeamCode] || ['F1', 'F2', 'F3', 'F4', 'F5', 'D1', 'D2', 'D3'];

  const awayPlayers: Array<{ name: string; pos: 'G' | 'F' | 'D' }> = [];
  for (let i = 0; i < awayGCount; i++) awayPlayers.push({ name: awayGoalieNames[i] || `Goalie ${i + 1}`, pos: 'G' });
  for (let i = 0; i < awayFCount; i++) awayPlayers.push({ name: awaySkaterNames[i] || `Forward ${i + 1}`, pos: 'F' });
  for (let i = 0; i < awayDCount; i++) awayPlayers.push({ name: awaySkaterNames[awayFCount + i] || `Defense ${i + 1}`, pos: 'D' });

  const homeGoalieNames = goalieDict[homeTeamCode] || ['Goalie 1', 'Goalie 2'];
  const homeSkaterNames = skaterDict[homeTeamCode] || ['F1', 'F2', 'F3', 'F4', 'F5', 'D1', 'D2', 'D3'];

  const homePlayers: Array<{ name: string; pos: 'G' | 'F' | 'D' }> = [];
  for (let i = 0; i < homeGCount; i++) homePlayers.push({ name: homeGoalieNames[i] || `Goalie ${i + 1}`, pos: 'G' });
  for (let i = 0; i < homeFCount; i++) homePlayers.push({ name: homeSkaterNames[i] || `Forward ${i + 1}`, pos: 'F' });
  for (let i = 0; i < homeDCount; i++) homePlayers.push({ name: homeSkaterNames[homeFCount + i] || `Defense ${i + 1}`, pos: 'D' });

  // Scoring Summary
  const numGoals = Math.floor(d[49196 + offset] / 6);
  const startGoalByte = 49198 + offset;
  const parsedGoals: ParsedGoal[] = [];

  for (let i = 0; i < numGoals; i++) {
    const b1 = d[startGoalByte + 1 + i * 6];
    let perFactor = 0;
    if (b1 < 64) perFactor = 0;
    else if (b1 < 128) perFactor = 64;
    else if (b1 < 192) perFactor = 128;
    else perFactor = 192;

    const periodNum = Math.floor(perFactor / 64) + 1;
    const secondsNum = (b1 - perFactor) * 256 + d[startGoalByte + i * 6];
    const typeCode = d[startGoalByte + 3 + i * 6];
    const goalTypeObj = GOAL_TYPE_DICT[typeCode] || { side: typeCode >= 128 ? 'Away' : 'Home', status: 'EV' };

    const side = goalTypeObj.side;
    const goalTeam = side === 'Home' ? homeTeamCode : awayTeamCode;
    const scorerSlot = d[startGoalByte + 2 + i * 6];
    const assist1Slot = d[startGoalByte + 5 + i * 6];
    const assist2Slot = d[startGoalByte + 4 + i * 6];

    const rosterList = side === 'Home' ? homePlayers : awayPlayers;
    const scorer = rosterList[scorerSlot]?.name || `Player #${scorerSlot + 1}`;
    const assist1 = assist1Slot === 255 ? '--' : (rosterList[assist1Slot]?.name || `Player #${assist1Slot + 1}`);
    const assist2 = assist2Slot === 255 ? '--' : (rosterList[assist2Slot]?.name || `Player #${assist2Slot + 1}`);

    parsedGoals.push({
      goalNum: i + 1,
      period: periodNum,
      time: formatTime(secondsNum),
      seconds: secondsNum,
      team: goalTeam,
      side,
      scorer,
      assist1,
      assist2,
      type: goalTypeObj.status
    });
  }

  // Penalty Summary
  const numPens = Math.floor(d[49558 + offset] / 4);
  const startPenByte = 49560 + offset;
  const parsedPenalties: ParsedPenalty[] = [];

  for (let i = 0; i < numPens; i++) {
    const b1 = d[startPenByte + 1 + i * 4];
    let perFactor = 0;
    if (b1 < 64) perFactor = 0;
    else if (b1 < 128) perFactor = 64;
    else if (b1 < 192) perFactor = 128;
    else perFactor = 192;

    const periodNum = Math.floor(perFactor / 64) + 1;
    const secondsNum = (b1 - perFactor) * 256 + d[startPenByte + i * 4];
    const penCode = d[startPenByte + 3 + i * 4];
    const penObj = PENALTY_DICT[penCode] || { side: penCode >= 146 ? 'Away' : 'Home', type: 'Penalty' };

    const side = penObj.side;
    const penTeam = side === 'Home' ? homeTeamCode : awayTeamCode;
    const playerSlot = d[startPenByte + 2 + i * 4];
    const rosterList = side === 'Home' ? homePlayers : awayPlayers;
    const player = rosterList[playerSlot]?.name || `Player #${playerSlot + 1}`;

    parsedPenalties.push({
      penNum: i + 1,
      period: periodNum,
      time: formatTime(secondsNum),
      seconds: secondsNum,
      team: penTeam,
      side,
      player,
      type: penObj.type
    });
  }

  // OT & Game Length
  const hasOT =
    awayGoalsOT > 0 || awayShotsOT > 0 || homeGoalsOT > 0 || homeShotsOT > 0 ||
    (parsedPenalties.length > 0 && parsedPenalties[parsedPenalties.length - 1].period === 4);

  let gameLengthSec = 900;
  if (hasOT) {
    if (homeGoals === awayGoals) gameLengthSec = 1200;
    else {
      const otLength = parsedGoals.length > 0 ? parsedGoals[parsedGoals.length - 1].seconds : 0;
      gameLengthSec = 900 + otLength;
    }
  }

  // Away Player Extraction
  const awayTotalSlots = awayGCount + awayFCount + awayDCount;
  const awayRawPlayerStats: any[] = [];
  let awaySwapVal = 1;
  const awayStartByte = 50852 + offset;

  for (let i = 0; i < awayTotalSlots; i++) {
    const goals = d[awayStartByte + 0 + i + awaySwapVal];
    const assists = d[awayStartByte + 26 + i + awaySwapVal];
    const shots = d[awayStartByte + 52 + i + awaySwapVal];
    const checks = d[awayStartByte + 104 + i + awaySwapVal];
    const pim = d[awayStartByte + 78 + i + awaySwapVal];
    const toiMin = d[awayStartByte + 130 + 1 + i * 2] * 256;
    const toiSec = d[awayStartByte + 130 + i * 2];
    const toi = Math.min(toiMin + toiSec, gameLengthSec);

    awayRawPlayerStats.push({
      name: awayPlayers[i]?.name || `Away Player ${i + 1}`,
      pos: awayPlayers[i]?.pos || 'F',
      goals, assists, points: goals + assists, shots, checks, pim, toi
    });
    awaySwapVal *= -1;
  }

  // Home Player Extraction
  const homeTotalSlots = homeGCount + homeFCount + homeDCount;
  const homeRawPlayerStats: any[] = [];
  let homeSwapVal = 1;
  const homeStartByte = 49982 + offset;

  for (let i = 0; i < homeTotalSlots; i++) {
    const goals = d[homeStartByte + 0 + i + homeSwapVal];
    const assists = d[homeStartByte + 26 + i + homeSwapVal];
    const shots = d[homeStartByte + 52 + i + homeSwapVal];
    const checks = d[homeStartByte + 104 + i + homeSwapVal];
    const pim = d[homeStartByte + 78 + i + homeSwapVal];
    const toiMin = d[homeStartByte + 130 + 1 + i * 2] * 256;
    const toiSec = d[homeStartByte + 130 + i * 2];
    const toi = Math.min(toiMin + toiSec, gameLengthSec);

    homeRawPlayerStats.push({
      name: homePlayers[i]?.name || `Home Player ${i + 1}`,
      pos: homePlayers[i]?.pos || 'F',
      goals, assists, points: goals + assists, shots, checks, pim, toi
    });
    homeSwapVal *= -1;
  }

  // Format Away Goalies & Skaters
  const awayRecGoalieIdx = (awayRawPlayerStats[0]?.toi || 0) >= (awayRawPlayerStats[1]?.toi || 0) ? 0 : 1;
  const awayGoalies: ParsedGoalieStat[] = [];
  for (let i = 0; i < awayGCount; i++) {
    const gRaw = awayRawPlayerStats[i];
    if (!gRaw) continue;
    const gName = gRaw.name;
    const gGoals = parsedGoals.filter(g => g.scorer === gName).length;
    const isRec = awayRecGoalieIdx === i;

    const w = isRec && awayGoals > homeGoals ? 1 : 0;
    const l = isRec && awayGoals < homeGoals && !hasOT ? 1 : 0;
    const t = isRec && awayGoals === homeGoals ? 1 : 0;
    const otl = isRec && awayGoals < homeGoals && hasOT ? 1 : 0;

    const ga = gRaw.goals;
    const assists = gRaw.assists;
    const shots = gRaw.shots;
    const saves = shots >= ga ? shots - ga : 0;
    const savePct = shots > 0 ? Number(((shots - ga) / shots).toFixed(3)) : 0;
    const so = ga === 0 && isRec && shots > 0 ? 1 : 0;

    awayGoalies.push({
      name: gName,
      pos: 'G',
      team: awayTeamCode,
      side: 'Away',
      goals: gGoals,
      assists,
      points: gGoals + assists,
      so, ga, saves, shots, savePct, w, l, t, otl,
      toi: formatTime(gRaw.toi),
      toiSeconds: gRaw.toi
    });
  }

  const awaySkaters: ParsedSkaterStat[] = [];
  for (let i = awayGCount; i < awayTotalSlots; i++) {
    const sRaw = awayRawPlayerStats[i];
    if (!sRaw) continue;
    const sName = sRaw.name;

    let ppp = 0;
    let shp = 0;
    for (const goal of parsedGoals) {
      if (goal.scorer === sName || goal.assist1 === sName || goal.assist2 === sName) {
        if (goal.type.startsWith('PP')) ppp++;
        if (goal.type.startsWith('SH')) shp++;
      }
    }

    awaySkaters.push({
      name: sName,
      pos: sRaw.pos as 'F' | 'D',
      team: awayTeamCode,
      side: 'Away',
      goals: sRaw.goals,
      assists: sRaw.assists,
      points: sRaw.points,
      sog: sRaw.shots,
      checks: sRaw.checks,
      pim: sRaw.pim,
      ppp, shp,
      toi: formatTime(sRaw.toi),
      toiSeconds: sRaw.toi
    });
  }

  // Format Home Goalies & Skaters
  const homeRecGoalieIdx = (homeRawPlayerStats[0]?.toi || 0) >= (homeRawPlayerStats[1]?.toi || 0) ? 0 : 1;
  const homeGoalies: ParsedGoalieStat[] = [];
  for (let i = 0; i < homeGCount; i++) {
    const gRaw = homeRawPlayerStats[i];
    if (!gRaw) continue;
    const gName = gRaw.name;
    const gGoals = parsedGoals.filter(g => g.scorer === gName).length;
    const isRec = homeRecGoalieIdx === i;

    const w = isRec && homeGoals > awayGoals ? 1 : 0;
    const l = isRec && homeGoals < awayGoals && !hasOT ? 1 : 0;
    const t = isRec && homeGoals === awayGoals ? 1 : 0;
    const otl = isRec && homeGoals < awayGoals && hasOT ? 1 : 0;

    const ga = gRaw.goals;
    const assists = gRaw.assists;
    const shots = gRaw.shots;
    const saves = shots >= ga ? shots - ga : 0;
    const savePct = shots > 0 ? Number(((shots - ga) / shots).toFixed(3)) : 0;
    const so = ga === 0 && isRec && shots > 0 ? 1 : 0;

    homeGoalies.push({
      name: gName,
      pos: 'G',
      team: homeTeamCode,
      side: 'Home',
      goals: gGoals,
      assists,
      points: gGoals + assists,
      so, ga, saves, shots, savePct, w, l, t, otl,
      toi: formatTime(gRaw.toi),
      toiSeconds: gRaw.toi
    });
  }

  const homeSkaters: ParsedSkaterStat[] = [];
  for (let i = homeGCount; i < homeTotalSlots; i++) {
    const sRaw = homeRawPlayerStats[i];
    if (!sRaw) continue;
    const sName = sRaw.name;

    let ppp = 0;
    let shp = 0;
    for (const goal of parsedGoals) {
      if (goal.scorer === sName || goal.assist1 === sName || goal.assist2 === sName) {
        if (goal.type.startsWith('PP')) ppp++;
        if (goal.type.startsWith('SH')) shp++;
      }
    }

    homeSkaters.push({
      name: sName,
      pos: sRaw.pos as 'F' | 'D',
      team: homeTeamCode,
      side: 'Home',
      goals: sRaw.goals,
      assists: sRaw.assists,
      points: sRaw.points,
      sog: sRaw.shots,
      checks: sRaw.checks,
      pim: sRaw.pim,
      ppp, shp,
      toi: formatTime(sRaw.toi),
      toiSeconds: sRaw.toi
    });
  }

  const homeTeamStats: ParsedTeamStats = {
    teamCode: homeTeamCode,
    goals: homeGoals,
    shots: homeShots,
    shootingPct: homeShootPct,
    ppGoals: homePPGoals,
    ppTries: homePPTries,
    ppTime: formatTime(homePPTimeSec),
    ppShots: homePPShots,
    shGoals: homeSHGoals,
    breakawayGoals: homeBreakGoals,
    breakawayTries: homeBreakTries,
    oneTimerGoals: homeOneTimerGoals,
    oneTimerTries: homeOneTimerTries,
    penaltyShotGoals: homePenShotGoals,
    penaltyShotTries: homePenShotTries,
    faceoffWins: homeFaceoffWins,
    checks: homeChecks,
    penalties: homePenalties,
    pim: homePIM,
    attackZoneTime: formatTime(awayAttackZoneTimeSec ? homeAttackZoneTimeSec : 0),
    passComps: homePassComps,
    passTries: homePassTries,
    goalsP1: homeGoalsP1,
    goalsP2: homeGoalsP2,
    goalsP3: homeGoalsP3,
    goalsOT: homeGoalsOT,
    shotsP1: homeShotsP1,
    shotsP2: homeShotsP2,
    shotsP3: homeShotsP3,
    shotsOT: homeShotsOT
  };

  const awayTeamStats: ParsedTeamStats = {
    teamCode: awayTeamCode,
    goals: awayGoals,
    shots: awayShots,
    shootingPct: awayShootPct,
    ppGoals: awayPPGoals,
    ppTries: awayPPTries,
    ppTime: formatTime(awayPPTimeSec),
    ppShots: awayPPShots,
    shGoals: awaySHGoals,
    breakawayGoals: awayBreakGoals,
    breakawayTries: awayBreakTries,
    oneTimerGoals: awayOneTimerGoals,
    oneTimerTries: awayOneTimerTries,
    penaltyShotGoals: awayPenShotGoals,
    penaltyShotTries: awayPenShotTries,
    faceoffWins: awayFaceoffWins,
    checks: awayChecks,
    penalties: awayPenalties,
    pim: awayPIM,
    attackZoneTime: formatTime(awayAttackZoneTimeSec),
    passComps: awayPassComps,
    passTries: awayPassTries,
    goalsP1: awayGoalsP1,
    goalsP2: awayGoalsP2,
    goalsP3: awayGoalsP3,
    goalsOT: awayGoalsOT,
    shotsP1: awayShotsP1,
    shotsP2: awayShotsP2,
    shotsP3: awayShotsP3,
    shotsOT: awayShotsOT
  };

  return {
    matchup: `${awayTeamCode} @ ${homeTeamCode}`,
    homeTeam: homeTeamStats,
    awayTeam: awayTeamStats,
    isOT: hasOT,
    gameLength: formatTime(gameLengthSec),
    totalFaceoffs: awayFaceoffWins + homeFaceoffWins,
    goals: parsedGoals,
    penalties: parsedPenalties,
    homeGoalies,
    awayGoalies,
    homeSkaters,
    awaySkaters
  };
}

// ==========================================
// 3. REACT UPLOAD COMPONENT
// ==========================================

export default function UploadPage() {
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | string>(40);
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedGame, setParsedGame] = useState<ParsedGame | null>(null);

  const [activeTab, setActiveTab] = useState<'summary' | 'team_stats' | 'skaters' | 'goalies' | 'scoring' | 'penalties' | 'supabase_payload' | 'export'>('summary');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [insertedRowData, setInsertedRowData] = useState<any | null>(null);

  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [customConfigJson, setCustomConfigJson] = useState<string>('');
  const [configAppliedMessage, setConfigAppliedMessage] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{ testing: boolean; message: string | null; error: boolean }>({ testing: false, message: null, error: false });
  const [dbTeams, setDbTeams] = useState<any[]>([]);

  // Schedule Matchup Validation (Check if game is already played)
  const [scheduleStatus, setScheduleStatus] = useState<{
    loading: boolean;
    checked: boolean;
    totalScheduled: number;
    playedCount: number;
    unplayedGameId: number | null;
    playedGameIds: number[];
    isAllPlayed: boolean;
    message: string | null;
  }>({
    loading: false,
    checked: false,
    totalScheduled: 0,
    playedCount: 0,
    unplayedGameId: null,
    playedGameIds: [],
    isAllPlayed: false,
    message: null
  });
  const [allowOverwrite, setAllowOverwrite] = useState<boolean>(false);

  const testSupabaseConnection = async () => {
    setConnectionStatus({ testing: true, message: null, error: false });
    try {
      const sId = Number(selectedSeasonId) || 40;
      const [teamsRes, gamesRes] = await Promise.all([
        supabase.from('league_teams').select('team_id, team_name').eq('league_id', sId),
        supabase.from('league_gamestats').select('game_id').order('game_id', { ascending: false }).limit(1)
      ]);

      if (teamsRes.error) throw teamsRes.error;

      const teamCount = teamsRes.data?.length || 0;
      const latestGameId = gamesRes.data?.[0]?.game_id || '0';
      setConnectionStatus({
        testing: false,
        message: `Supabase Connected! Found ${teamCount} teams for Season ${sId}. Latest Game ID: #${latestGameId}.`,
        error: false
      });
    } catch (err: any) {
      setConnectionStatus({
        testing: false,
        message: `Connection Failed: ${err.message || 'Could not reach Supabase'}`,
        error: true
      });
    }
  };

  useEffect(() => {
    async function fetchDbTeams() {
      const sId = Number(selectedSeasonId) || 40;
      let { data: seasonTeams } = await supabase
        .from('league_teams')
        .select('team_id, team_name, abbreviation, coach_id, league_id, league_coaches(coach_id, coach_name)')
        .eq('league_id', sId);

      if (!seasonTeams || seasonTeams.length === 0) {
        const { data: allTeams } = await supabase
          .from('league_teams')
          .select('team_id, team_name, abbreviation, coach_id, league_id, league_coaches(coach_id, coach_name)');
        seasonTeams = allTeams;
      }
      setDbTeams(seasonTeams || []);
    }
    fetchDbTeams();
  }, [selectedSeasonId]);

  useEffect(() => {
    const config = AVAILABLE_SEASONS.find(s => String(s.seasonId) === String(selectedSeasonId)) || AVAILABLE_SEASONS[0];
    setCustomConfigJson(JSON.stringify(config, null, 2));
  }, [selectedSeasonId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setParseError(null);
      setSaveSuccess(null);
      setSaveError(null);
      processFile(selected);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      setFile(dropped);
      setParseError(null);
      setSaveSuccess(null);
      setSaveError(null);
      processFile(dropped);
    }
  };

  const processFile = async (f: File) => {
    setIsParsing(true);
    setParseError(null);

    try {
      const arrayBuffer = await f.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      let customConfig: Partial<SeasonConfig> = AVAILABLE_SEASONS.find(s => String(s.seasonId) === String(selectedSeasonId)) || AVAILABLE_SEASONS[0];
      if (customConfigJson.trim()) {
        try {
          const parsed = JSON.parse(customConfigJson);
          customConfig = { ...customConfig, ...parsed };
        } catch (err) {
          console.warn("Could not parse custom config JSON, using default:", err);
        }
      }

      const result = parseSaveStateBuffer(buffer, customConfig);
      setParsedGame(result);
    } catch (err: any) {
      console.error("Parsing error:", err);
      setParseError(err.message || "Failed to parse save state file. Make sure it is a valid RetroArch .state file.");
      setParsedGame(null);
    } finally {
      setIsParsing(false);
    }
  };

  // Generate the exact Supabase league_gamestats row
  const generateSupabaseRow = (game: ParsedGame, seasonId: number | string) => {
    const sId = Number(seasonId) || 40;
    const seasonPrefix = String(sId).padStart(2, '0');
    const homeTeamCode = game.homeTeam.teamCode.toUpperCase();
    const awayTeamCode = game.awayTeam.teamCode.toUpperCase();

    const homeStats = {
      home_atk: parseTimeToDayFraction(game.homeTeam.attackZoneTime),
      home_pen: String(game.homeTeam.penalties),
      home_pim: String(game.homeTeam.pim),
      home_goals: String(game.homeTeam.goals),
      home_shots: String(game.homeTeam.shots),
      home_pp_opps: String(game.homeTeam.ppTries),
      home_ot_goals: String(game.homeTeam.goalsOT),
      home_ot_shots: String(game.homeTeam.shotsOT),
      home_pp_goals: String(game.homeTeam.ppGoals),
      home_pp_shots: String(game.homeTeam.ppShots),
      home_sh_goals: String(game.homeTeam.shGoals),
      home_1st_goals: String(game.homeTeam.goalsP1),
      home_1st_shots: String(game.homeTeam.shotsP1),
      home_2nd_goals: String(game.homeTeam.goalsP2),
      home_2nd_shots: String(game.homeTeam.shotsP2),
      home_3rd_goals: String(game.homeTeam.goalsP3),
      home_3rd_shots: String(game.homeTeam.shotsP3),
      home_onetimers: String(game.homeTeam.oneTimerTries),
      home_bodychecks: String(game.homeTeam.checks),
      home_breakaways: String(game.homeTeam.breakawayTries),
      home_pp_minutes: parseTimeToDayFraction(game.homeTeam.ppTime),
      home_faceoff_won: String(game.homeTeam.faceoffWins),
      home_pass_attempts: String(game.homeTeam.passTries),
      home_penalty_shots: String(game.homeTeam.penaltyShotTries),
      home_onetimer_goals: String(game.homeTeam.oneTimerGoals),
      home_breakaway_goals: String(game.homeTeam.breakawayGoals),
      home_pass_completions: String(game.homeTeam.passComps),
      home_penalty_shot_goals: String(game.homeTeam.penaltyShotGoals)
    };

    const awayStats = {
      away_atk: parseTimeToDayFraction(game.awayTeam.attackZoneTime),
      away_pen: String(game.awayTeam.penalties),
      away_pim: String(game.awayTeam.pim),
      away_goals: String(game.awayTeam.goals),
      away_shots: String(game.awayTeam.shots),
      away_pp_opps: String(game.awayTeam.ppTries),
      away_ot_goals: String(game.awayTeam.goalsOT),
      away_ot_shots: String(game.awayTeam.shotsOT),
      away_pp_goals: String(game.awayTeam.ppGoals),
      away_pp_shots: String(game.awayTeam.ppShots),
      away_sh_goals: String(game.awayTeam.shGoals),
      away_1st_goals: String(game.awayTeam.goalsP1),
      away_1st_shots: String(game.awayTeam.shotsP1),
      away_2nd_goals: String(game.awayTeam.goalsP2),
      away_2nd_shots: String(game.awayTeam.shotsP2),
      away_3rd_goals: String(game.awayTeam.goalsP3),
      away_3rd_shots: String(game.awayTeam.shotsP3),
      away_onetimers: String(game.awayTeam.oneTimerTries),
      away_bodychecks: String(game.awayTeam.checks),
      away_breakaways: String(game.awayTeam.breakawayTries),
      away_pp_minutes: parseTimeToDayFraction(game.awayTeam.ppTime),
      away_faceoff_won: String(game.awayTeam.faceoffWins),
      away_pass_attempts: String(game.awayTeam.passTries),
      away_penalty_shots: String(game.awayTeam.penaltyShotTries),
      away_onetimer_goals: String(game.awayTeam.oneTimerGoals),
      away_breakaway_goals: String(game.awayTeam.breakawayGoals),
      away_pass_completions: String(game.awayTeam.passComps),
      away_penalty_shot_goals: String(game.awayTeam.penaltyShotGoals)
    };

    const knownHome = W_LEAGUE_COACH_MAP[homeTeamCode];
    const knownAway = W_LEAGUE_COACH_MAP[awayTeamCode];

    const homeTeam = matchTeamFromList(homeTeamCode, dbTeams);
    const awayTeam = matchTeamFromList(awayTeamCode, dbTeams);

    const homeTeamId = homeTeam?.team_id || 0;
    const awayTeamId = awayTeam?.team_id || 0;

    const homeCoachId = (homeTeam?.coach_id && homeTeam.coach_id !== 0)
      ? homeTeam.coach_id
      : (knownHome?.coach_id || homeTeamId);

    const awayCoachId = (awayTeam?.coach_id && awayTeam.coach_id !== 0)
      ? awayTeam.coach_id
      : (knownAway?.coach_id || awayTeamId);

    const homeCoachName = (homeTeam as any)?.league_coaches?.coach_name ||
      (homeTeam as any)?.league_coaches?.[0]?.coach_name ||
      knownHome?.coach_name ||
      homeTeam?.team_name ||
      homeTeamCode;

    const awayCoachName = (awayTeam as any)?.league_coaches?.coach_name ||
      (awayTeam as any)?.league_coaches?.[0]?.coach_name ||
      knownAway?.coach_name ||
      awayTeam?.team_name ||
      awayTeamCode;

    return {
      league_id: sId,
      game_meta: {
        is_ot: game.isOT,
        is_tie: game.homeTeam.goals === game.awayTeam.goals,
        league: getLeagueCode(sId),
        league_mode: "Season"
      },
      game_results: `${awayTeamCode} ${game.awayTeam.goals} - ${game.homeTeam.goals} ${homeTeamCode}`,
      home_team_id: homeTeamId,
      home_coach_id: homeCoachId,
      home_coach: homeCoachName,
      home_score: game.homeTeam.goals,
      home_stats: homeStats,
      away_team_id: awayTeamId,
      away_coach_id: awayCoachId,
      away_coach: awayCoachName,
      away_score: game.awayTeam.goals,
      away_stats: awayStats,
      total_faceoffs: game.totalFaceoffs,
      game_length: game.gameLength.includes(':') && game.gameLength.split(':').length === 2 ? `${game.gameLength}:00` : game.gameLength
    };
  };

  // Real-time schedule check to prevent duplicate submissions
  useEffect(() => {
    async function checkScheduleStatus() {
      if (!parsedGame) {
        setScheduleStatus({ loading: false, checked: false, totalScheduled: 0, playedCount: 0, unplayedGameId: null, playedGameIds: [], isAllPlayed: false, message: null });
        return;
      }

      setScheduleStatus(prev => ({ ...prev, loading: true }));
      const sId = Number(selectedSeasonId) || 40;
      const homeCode = parsedGame.homeTeam.teamCode.toUpperCase();
      const awayCode = parsedGame.awayTeam.teamCode.toUpperCase();

      const homeTeam = matchTeamFromList(homeCode, dbTeams);
      const awayTeam = matchTeamFromList(awayCode, dbTeams);

      const hId = homeTeam?.team_id || 0;
      const aId = awayTeam?.team_id || 0;

      if (!hId || !aId) {
        setScheduleStatus({ loading: false, checked: true, totalScheduled: 0, playedCount: 0, unplayedGameId: null, playedGameIds: [], isAllPlayed: false, message: null });
        return;
      }

      const { data: scheduledGames } = await supabase
        .from('league_schedule')
        .select('game_id, played, home_team_id, away_team_id')
        .eq('league_id', sId)
        .eq('home_team_id', hId)
        .eq('away_team_id', aId)
        .order('game_id', { ascending: true });

      if (!scheduledGames || scheduledGames.length === 0) {
        setScheduleStatus({ loading: false, checked: true, totalScheduled: 0, playedCount: 0, unplayedGameId: null, playedGameIds: [], isAllPlayed: false, message: null });
        return;
      }

      const schedIds = scheduledGames.map(g => g.game_id);
      const { data: playedStats } = await supabase
        .from('league_gamestats')
        .select('game_id')
        .in('game_id', schedIds);

      const playedSet = new Set((playedStats || []).map(p => p.game_id));
      const unplayed = scheduledGames.find(g => {
        const rawPlayed = String(g.played || '').trim().toLowerCase();
        const isPlayed = rawPlayed === 'true' || rawPlayed === '1' || rawPlayed === 'y' || rawPlayed === 'yes';
        return !isPlayed && !playedSet.has(g.game_id);
      });

      const playedList = scheduledGames.filter(g => {
        const rawPlayed = String(g.played || '').trim().toLowerCase();
        return rawPlayed === 'true' || rawPlayed === '1' || rawPlayed === 'y' || rawPlayed === 'yes' || playedSet.has(g.game_id);
      }).map(g => g.game_id);

      const isAllPlayed = scheduledGames.length > 0 && !unplayed;

      setScheduleStatus({
        loading: false,
        checked: true,
        totalScheduled: scheduledGames.length,
        playedCount: playedList.length,
        unplayedGameId: unplayed ? Number(unplayed.game_id) : null,
        playedGameIds: playedList,
        isAllPlayed,
        message: isAllPlayed
          ? `All scheduled games for this matchup are already marked as PLAYED (Game #${playedList.join(', #')}).`
          : `Scheduled fixture Game #${unplayed?.game_id} is unplayed and ready for submission.`
      });
    }

    checkScheduleStatus();
  }, [parsedGame, selectedSeasonId, dbTeams]);

  const [saveDetails, setSaveDetails] = useState<any | null>(null);

  const handleSaveToSupabase = async () => {
    if (!parsedGame) return;
    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);
    setSaveDetails(null);

    try {
      const response = await fetch('/api/save-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game: parsedGame,
          seasonId: selectedSeasonId,
          targetGameId: scheduleStatus.unplayedGameId || undefined,
          allowOverwrite: allowOverwrite
        })
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || data.details || 'Failed to save game data to Supabase');
      }

      setSaveSuccess(data.message || `Successfully committed ${parsedGame.matchup} to Supabase!`);
      setSaveDetails(data.details || null);
      setInsertedRowData(data.insertedRow || null);

      // Update schedule status to reflected played
      setScheduleStatus(prev => ({
        ...prev,
        isAllPlayed: true,
        playedCount: prev.playedCount + 1,
        unplayedGameId: null
      }));
    } catch (err: any) {
      setSaveError(err.message || 'Error occurred while saving to Supabase.');
    } finally {
      setIsSaving(false);
    }
  };

  const loadDemoGame = () => {
    setFile(null);
    setParseError(null);
    setSaveSuccess(null);
    setSaveError(null);
    setInsertedRowData(null);

    const demoGame: ParsedGame = {
      matchup: "RIC @ BAY",
      homeTeam: {
        teamCode: "BAY",
        goals: 1,
        shots: 11,
        shootingPct: 0.091,
        ppGoals: 0,
        ppTries: 1,
        ppTime: "0:47",
        ppShots: 0,
        shGoals: 0,
        breakawayGoals: 0,
        breakawayTries: 2,
        oneTimerGoals: 0,
        oneTimerTries: 2,
        penaltyShotGoals: 0,
        penaltyShotTries: 0,
        faceoffWins: 11,
        checks: 18,
        penalties: 3,
        pim: 3,
        attackZoneTime: "5:24",
        passComps: 22,
        passTries: 39,
        goalsP1: 0,
        goalsP2: 1,
        goalsP3: 0,
        goalsOT: 0,
        shotsP1: 3,
        shotsP2: 5,
        shotsP3: 3,
        shotsOT: 0
      },
      awayTeam: {
        teamCode: "RIC",
        goals: 6,
        shots: 14,
        shootingPct: 0.429,
        ppGoals: 1,
        ppTries: 3,
        ppTime: "2:02",
        ppShots: 1,
        shGoals: 1,
        breakawayGoals: 0,
        breakawayTries: 2,
        oneTimerGoals: 3,
        oneTimerTries: 12,
        penaltyShotGoals: 0,
        penaltyShotTries: 0,
        faceoffWins: 6,
        checks: 13,
        penalties: 1,
        pim: 1,
        attackZoneTime: "6:09",
        passComps: 37,
        passTries: 64,
        goalsP1: 2,
        goalsP2: 2,
        goalsP3: 2,
        goalsOT: 0,
        shotsP1: 3,
        shotsP2: 4,
        shotsOT: 0,
        shotsP3: 7
      },
      isOT: false,
      gameLength: "15:00",
      totalFaceoffs: 17,
      goals: [
        { goalNum: 1, period: 1, time: "3:22", seconds: 202, team: "RIC", side: "Away", scorer: "Cory Conacher", assist1: "Joe Thornton", assist2: "Andrei Markov", type: "EV" },
        { goalNum: 2, period: 1, time: "11:45", seconds: 705, team: "RIC", side: "Away", scorer: "Max Pacioretty", assist1: "Cory Conacher", assist2: "Jason Pominville", type: "PP" },
        { goalNum: 3, period: 2, time: "2:14", seconds: 134, team: "BAY", side: "Home", scorer: "Vincent Lecavalier", assist1: "Jonathan Toews", assist2: "Jason Spezza", type: "EV" },
        { goalNum: 4, period: 2, time: "8:30", seconds: 510, team: "RIC", side: "Away", scorer: "Joe Thornton", assist1: "Kyle Okposo", assist2: "Ryan Suter", type: "EV" },
        { goalNum: 5, period: 2, time: "13:50", seconds: 830, team: "RIC", side: "Away", scorer: "Jason Pominville", assist1: "Joe Thornton", assist2: "--", type: "SH" },
        { goalNum: 6, period: 3, time: "4:12", seconds: 252, team: "RIC", side: "Away", scorer: "Max Pacioretty", assist1: "Kyle Okposo", assist2: "Derek Morris", type: "EV" },
        { goalNum: 7, period: 3, time: "9:20", seconds: 560, team: "RIC", side: "Away", scorer: "Cory Conacher", assist1: "Andrei Markov", assist2: "--", type: "EV" }
      ],
      penalties: [
        { penNum: 1, period: 1, time: "10:15", seconds: 615, team: "BAY", side: "Home", player: "Tyler Myers", type: "Tripping" },
        { penNum: 2, period: 2, time: "12:30", seconds: 750, team: "RIC", side: "Away", player: "Ryan Suter", type: "Hooking" },
        { penNum: 3, period: 3, time: "14:00", seconds: 840, team: "BAY", side: "Home", player: "Mike Green", type: "Slashing" }
      ],
      homeGoalies: [
        { name: "Cory Schneider", pos: "G", team: "BAY", side: "Home", goals: 0, assists: 0, points: 0, so: 0, ga: 6, saves: 8, shots: 14, savePct: 0.571, w: 0, l: 1, t: 0, otl: 0, toi: "15:00", toiSeconds: 900 },
        { name: "Jimmy Howard", pos: "G", team: "BAY", side: "Home", goals: 0, assists: 0, points: 0, so: 0, ga: 0, saves: 0, shots: 0, savePct: 0, w: 0, l: 0, t: 0, otl: 0, toi: "0:00", toiSeconds: 0 }
      ],
      awayGoalies: [
        { name: "Ben Bishop", pos: "G", team: "RIC", side: "Away", goals: 0, assists: 0, points: 0, so: 0, ga: 1, saves: 10, shots: 11, savePct: 0.909, w: 1, l: 0, t: 0, otl: 0, toi: "15:00", toiSeconds: 900 },
        { name: "Jonathan Bernier", pos: "G", team: "RIC", side: "Away", goals: 0, assists: 0, points: 0, so: 0, ga: 0, saves: 0, shots: 0, savePct: 0, w: 0, l: 0, t: 0, otl: 0, toi: "0:00", toiSeconds: 0 }
      ],
      homeSkaters: [
        { name: "Vincent Lecavalier", pos: "F", team: "BAY", side: "Home", goals: 1, assists: 0, points: 1, sog: 3, checks: 4, pim: 0, ppp: 0, shp: 0, toi: "12:15", toiSeconds: 735 },
        { name: "Jonathan Toews", pos: "F", team: "BAY", side: "Home", goals: 0, assists: 1, points: 1, sog: 2, checks: 3, pim: 0, ppp: 0, shp: 0, toi: "11:30", toiSeconds: 690 },
        { name: "Jason Spezza", pos: "F", team: "BAY", side: "Home", goals: 0, assists: 1, points: 1, sog: 2, checks: 2, pim: 0, ppp: 0, shp: 0, toi: "10:45", toiSeconds: 645 },
        { name: "Tyler Johnson", pos: "F", team: "BAY", side: "Home", goals: 0, assists: 0, points: 0, sog: 1, checks: 2, pim: 0, ppp: 0, shp: 0, toi: "08:10", toiSeconds: 490 },
        { name: "Zach Parise", pos: "F", team: "BAY", side: "Home", goals: 0, assists: 0, points: 0, sog: 1, checks: 2, pim: 0, ppp: 0, shp: 0, toi: "07:50", toiSeconds: 470 },
        { name: "Tyler Myers", pos: "D", team: "BAY", side: "Home", goals: 0, assists: 0, points: 0, sog: 1, checks: 2, pim: 2, ppp: 0, shp: 0, toi: "13:20", toiSeconds: 800 },
        { name: "Victor Hedman", pos: "D", team: "BAY", side: "Home", goals: 0, assists: 0, points: 0, sog: 1, checks: 2, pim: 0, ppp: 0, shp: 0, toi: "12:50", toiSeconds: 770 },
        { name: "Mike Green", pos: "D", team: "BAY", side: "Home", goals: 0, assists: 0, points: 0, sog: 0, checks: 1, pim: 1, ppp: 0, shp: 0, toi: "08:40", toiSeconds: 520 }
      ],
      awaySkaters: [
        { name: "Cory Conacher", pos: "F", team: "RIC", side: "Away", goals: 2, assists: 1, points: 3, sog: 3, checks: 2, pim: 0, ppp: 1, shp: 0, toi: "11:45", toiSeconds: 705 },
        { name: "Max Pacioretty", pos: "F", team: "RIC", side: "Away", goals: 2, assists: 0, points: 2, sog: 3, checks: 2, pim: 0, ppp: 1, shp: 0, toi: "11:20", toiSeconds: 680 },
        { name: "Joe Thornton", pos: "F", team: "RIC", side: "Away", goals: 1, assists: 2, points: 3, sog: 2, checks: 2, pim: 0, ppp: 0, shp: 1, toi: "12:10", toiSeconds: 730 },
        { name: "Jason Pominville", pos: "F", team: "RIC", side: "Away", goals: 1, assists: 1, points: 2, sog: 2, checks: 1, pim: 0, ppp: 1, shp: 1, toi: "10:30", toiSeconds: 630 },
        { name: "Kyle Okposo", pos: "F", team: "RIC", side: "Away", goals: 0, assists: 2, points: 2, sog: 1, checks: 2, pim: 0, ppp: 0, shp: 0, toi: "08:40", toiSeconds: 520 },
        { name: "Derek Morris", pos: "D", team: "RIC", side: "Away", goals: 0, assists: 1, points: 1, sog: 1, checks: 2, pim: 0, ppp: 0, shp: 0, toi: "13:00", toiSeconds: 780 },
        { name: "Andrei Markov", pos: "D", team: "RIC", side: "Away", goals: 0, assists: 2, points: 2, sog: 1, checks: 1, pim: 0, ppp: 0, shp: 0, toi: "12:40", toiSeconds: 760 },
        { name: "Ryan Suter", pos: "D", team: "RIC", side: "Away", goals: 0, assists: 1, points: 1, sog: 1, checks: 1, pim: 1, ppp: 0, shp: 0, toi: "10:15", toiSeconds: 615 }
      ]
    };

    setParsedGame(demoGame);
  };

  const downloadCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  };

  const exportTeamStatsCSV = () => {
    if (!parsedGame) return;
    const h = parsedGame.homeTeam;
    const a = parsedGame.awayTeam;
    const headers = [
      'GameID', 'Matchup', 'HomeTeam', 'AwayTeam',
      'AwaySHOTS', 'AwayPENALTIES', 'AwayPIM', 'AwayATTACK', 'AwayGOALS', 'AwayFACEOFFS_WON',
      'AwayCHECKS', 'AwayPASS_ATT', 'AwayPASS_COMP', 'AwayPP_MIN', 'AwayPP_GOALS', 'AwayPP_OPP',
      'AwayPP_SHOTS', 'AwaySHG', 'AwayBREAKAWAY', 'AwayBREAKAWAY_GOALS', 'Away1X_ATT', 'Away1X_GOALS',
      'AwayPENALTY_SHOTS', 'AwayPENALTY_SHOT_GOALS', 'Away1ST_SHOTS', 'Away2ND_SHOTS', 'Away3RD_SHOTS',
      'AwayOT_SHOTS', 'Away1ST_GOALS', 'Away2ND_GOALS', 'Away3RD_GOALS', 'AwayOT_GOALS',
      'HomeSHOTS', 'HomePENALTIES', 'HomePIM', 'HomeATTACK', 'HomeGOALS', 'HomeFACEOFFS_WON',
      'HomeCHECKS', 'HomePASS_ATT', 'HomePASS_COMP', 'HomePP_MIN', 'HomePP_GOALS', 'HomePP_OPP',
      'HomePP_SHOTS', 'HomeSHG', 'HomeBREAKAWAY', 'HomeBREAKAWAY_GOALS', 'Home1X_ATT', 'Home1X_GOALS',
      'HomePENALTY_SHOTS', 'HomePENALTY_SHOT_GOALS', 'Home1ST_SHOTS', 'Home2ND_SHOTS', 'Home3RD_SHOTS',
      'HomeOT_SHOTS', 'Home1ST_GOALS', 'Home2ND_GOALS', 'Home3RD_GOALS', 'HomeOT_GOALS',
      'TOTAL_FO', 'OT_Game', 'GAME_LENGTH'
    ];
    const row = [
      1, parsedGame.matchup, h.teamCode, a.teamCode,
      a.shots, a.penalties, a.pim, a.attackZoneTime, a.goals, a.faceoffWins,
      a.checks, a.passTries, a.passComps, a.ppTime, a.ppGoals, a.ppTries,
      a.ppShots, a.shGoals, a.breakawayTries, a.breakawayGoals, a.oneTimerTries, a.oneTimerGoals,
      a.penaltyShotTries, a.penaltyShotGoals, a.shotsP1, a.shotsP2, a.shotsP3,
      a.shotsOT, a.goalsP1, a.goalsP2, a.goalsP3, a.goalsOT,
      h.shots, h.penalties, h.pim, h.attackZoneTime, h.goals, h.faceoffWins,
      h.checks, h.passTries, h.passComps, h.ppTime, h.ppGoals, h.ppTries,
      h.ppShots, h.shGoals, h.breakawayTries, h.breakawayGoals, h.oneTimerTries, h.oneTimerGoals,
      h.penaltyShotTries, h.penaltyShotGoals, h.shotsP1, h.shotsP2, h.shotsP3,
      h.shotsOT, h.goalsP1, h.goalsP2, h.goalsP3, h.goalsOT,
      parsedGame.totalFaceoffs, parsedGame.isOT ? 1 : 0, parsedGame.gameLength
    ];
    downloadCSV('WN95HL_Game_Stats.csv', headers, [row]);
  };

  const exportPlayerStatsCSV = () => {
    if (!parsedGame) return;
    const headers = ['GameID', 'Team', 'Name', 'Pos', 'G', 'A', 'PTS', 'SO', 'GA', 'SV', 'SH', 'W', 'L', 'T', 'OTL', 'TOI'];
    const rows: any[] = [];

    parsedGame.awayGoalies.forEach(g => {
      if (g.toi !== '0:00') rows.push([1, g.team, g.name, g.pos, g.goals, g.assists, g.points, g.so, g.ga, g.saves, g.shots, g.w, g.l, g.t, g.otl, g.toi]);
    });
    parsedGame.homeGoalies.forEach(g => {
      if (g.toi !== '0:00') rows.push([1, g.team, g.name, g.pos, g.goals, g.assists, g.points, g.so, g.ga, g.saves, g.shots, g.w, g.l, g.t, g.otl, g.toi]);
    });
    parsedGame.awaySkaters.forEach(s => {
      if (s.toi !== '0:00') rows.push([1, s.team, s.name, s.pos, s.goals, s.assists, s.points, 0, 0, 0, s.sog, 0, 0, 0, 0, s.toi]);
    });
    parsedGame.homeSkaters.forEach(s => {
      if (s.toi !== '0:00') rows.push([1, s.team, s.name, s.pos, s.goals, s.assists, s.points, 0, 0, 0, s.sog, 0, 0, 0, 0, s.toi]);
    });

    downloadCSV('WN95HL_Player_Stats.csv', headers, rows);
  };

  const exportScoringSummaryCSV = () => {
    if (!parsedGame) return;
    const headers = ['GameID', 'Goal#', 'Period', 'TIME', 'TEAM', 'GOALscorer', 'ASSIST_1', 'ASSIST_2', 'TYPE'];
    const rows = parsedGame.goals.map(g => [1, g.goalNum, g.period, g.time, g.team, g.scorer, g.assist1, g.assist2, g.type]);
    downloadCSV('WN95HL_Scoring_Summary.csv', headers, rows);
  };

  const exportPenaltySummaryCSV = () => {
    if (!parsedGame) return;
    const headers = ['GameID', 'Pen#', 'PERIOD', 'TIME', 'TEAM', 'Player', 'Type'];
    const rows = parsedGame.penalties.map(p => [1, p.penNum, p.period, p.time, p.team, p.player, p.type]);
    downloadCSV('WN95HL_Penalty_Summary.csv', headers, rows);
  };

  const exportAllJSON = () => {
    if (!parsedGame) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(parsedGame, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `game_${parsedGame.homeTeam.teamCode}_vs_${parsedGame.awayTeam.teamCode}.json`);
    downloadAnchor.click();
  };

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-black font-serif pb-16">
      {/* Header Banner */}
      <div className="border-b-4 border-black pb-4 mb-6 text-center">
        <span className="text-xs uppercase tracking-widest font-sans font-bold text-red-700 bg-red-100 px-3 py-0.5 border border-red-700">
          Official Gazette Ingestion Terminal
        </span>
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mt-2">
          Save State Upload & Data Exporter
        </h1>
        <p className="text-xs md:text-sm italic mt-1 text-slate-700">
          Upload RetroArch Genesis save states (.state / .sav) to parse game metrics and commit to Supabase.
        </p>
      </div>

      {/* Control Strip & Season Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border-2 border-black p-4 mb-6 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-xs uppercase font-black tracking-wider">Active Season:</label>
          <select
            className="border-2 border-black bg-[#f4f1ea] px-3 py-1 text-xs font-bold font-sans cursor-pointer focus:outline-none"
            value={selectedSeasonId}
            onChange={(e) => {
              setSelectedSeasonId(e.target.value);
              if (file) processFile(file);
            }}
          >
            {AVAILABLE_SEASONS.map(s => (
              <option key={s.seasonId} value={s.seasonId}>
                {s.seasonName}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowConfigModal(!showConfigModal)}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase border border-black bg-slate-100 hover:bg-black hover:text-white transition"
          >
            <Sliders className="w-3.5 h-3.5" />
            Season Rosters & Team Counts
          </button>

          <button
            onClick={testSupabaseConnection}
            disabled={connectionStatus.testing}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase border-2 border-black bg-amber-100 hover:bg-black hover:text-white transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${connectionStatus.testing ? 'animate-spin' : ''}`} />
            {connectionStatus.testing ? "Testing..." : "Test Supabase Connection"}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={parsedGame ? handleSaveToSupabase : () => document.getElementById('file-input')?.click()}
            disabled={isSaving || (Boolean(parsedGame) && scheduleStatus.isAllPlayed && !allowOverwrite)}
            style={{
              backgroundColor: (parsedGame && scheduleStatus.isAllPlayed && !allowOverwrite) ? '#991b1b' : '#16a34a',
              color: '#ffffff'
            }}
            className="flex items-center gap-2.5 px-5 py-2.5 hover:opacity-90 text-white font-black text-xs md:text-sm uppercase tracking-wider border-2 border-black transition shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            title={parsedGame ? "Save parsed game stats to Supabase" : "Click to select a save state file and submit"}
          >
            <Database className="w-4 h-4 md:w-5 md:h-5 text-white shrink-0" />
            <span>
              {isSaving
                ? "Publishing to Supabase..."
                : parsedGame
                  ? (scheduleStatus.isAllPlayed && !allowOverwrite ? "Matchup Already Played" : "Push to Supabase")
                  : "Submit to Supabase"}
            </span>
          </button>
        </div>
      </div>

      {/* Schedule Fixture Match Status Alert */}
      {parsedGame && scheduleStatus.checked && (
        <div className="mb-6">
          {scheduleStatus.isAllPlayed ? (
            <div className="p-4 bg-red-50 border-2 border-red-800 text-red-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-red-700 shrink-0" />
                <div>
                  <span className="font-black text-xs uppercase block">Matchup Already Completed in Schedule (Played: TRUE)</span>
                  <p className="text-[11px] text-red-900 mt-0.5">
                    All scheduled games between <strong>{parsedGame.awayTeam.teamCode}</strong> and <strong>{parsedGame.homeTeam.teamCode}</strong> in Season {selectedSeasonId} have already been recorded (Game #{scheduleStatus.playedGameIds.join(', #')}). Submitting a duplicate game is blocked.
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 bg-white px-3 py-1.5 border-2 border-red-800 text-xs font-black uppercase shrink-0 cursor-pointer hover:bg-red-50">
                <input
                  type="checkbox"
                  checked={allowOverwrite}
                  onChange={(e) => setAllowOverwrite(e.target.checked)}
                  className="cursor-pointer"
                />
                Allow Resubmit / Overwrite
              </label>
            </div>
          ) : scheduleStatus.unplayedGameId ? (
            <div className="p-3 bg-green-50 border-2 border-green-800 text-green-950 flex items-center justify-between text-xs font-bold uppercase shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-700 shrink-0" />
                <span>
                  Matching Fixture Found: <strong>Game #{scheduleStatus.unplayedGameId} ({parsedGame.matchup})</strong> • Status: <strong>Unplayed</strong> (will trigger Played = TRUE upon submit).
                </span>
              </div>
              <span className="text-[10px] font-mono bg-green-200 text-green-900 px-2 py-0.5 border border-green-500 font-bold">
                Ready for Ingestion
              </span>
            </div>
          ) : null}
        </div>
      )}

      {/* Connection Test Banner */}
      {connectionStatus.message && (
        <div className={`mb-6 p-4 border-2 text-xs font-bold uppercase flex items-center justify-between ${connectionStatus.error ? 'bg-red-50 border-red-800 text-red-900' : 'bg-green-50 border-green-800 text-green-900'
          }`}>
          <div className="flex items-center gap-2">
            {connectionStatus.error ? (
              <AlertTriangle className="w-5 h-5 text-red-700 shrink-0" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-700 shrink-0" />
            )}
            <span>{connectionStatus.message}</span>
          </div>
          <button
            onClick={() => setConnectionStatus({ testing: false, message: null, error: false })}
            className="text-[10px] underline ml-4 hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Season Roster / Team Counts Configuration Drawer */}
      {showConfigModal && (
        <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-900 shadow-md">
          <div className="flex justify-between items-center mb-2 border-b border-amber-900/30 pb-2">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-amber-900" />
              <h3 className="text-sm font-black uppercase text-amber-950">
                Season Roster, Skater & Goalie Setup (JSON)
              </h3>
            </div>
            <button
              onClick={() => setShowConfigModal(false)}
              className="text-xs font-bold uppercase underline hover:text-red-700"
            >
              Close
            </button>
          </div>
          <p className="text-xs text-amber-900/80 mb-3">
            Loaded with all 29 teams, 58 goalies, and 232 skaters (5 Forwards, 3 Defencemen, 2 Goalies per team).
          </p>

          <textarea
            rows={8}
            className="w-full font-mono text-xs p-3 bg-white border border-amber-900/40 text-black outline-none"
            value={customConfigJson}
            onChange={(e) => setCustomConfigJson(e.target.value)}
          />

          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={() => {
                if (file) processFile(file);
                setConfigAppliedMessage("Season configuration updated and re-applied!");
                setTimeout(() => setConfigAppliedMessage(null), 3000);
              }}
              className="px-4 py-1.5 bg-black text-white text-xs font-bold uppercase hover:bg-slate-800 transition"
            >
              Apply Config to Parser
            </button>
            {configAppliedMessage && (
              <span className="text-xs font-bold text-green-700 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> {configAppliedMessage}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Notification Banners */}
      {saveSuccess && (
        <div className="mb-6 p-4 bg-green-50 border-2 border-green-800 text-green-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-700 shrink-0" />
              <span className="font-bold text-xs uppercase">{saveSuccess}</span>
            </div>
            <div className="flex gap-3 text-xs font-bold uppercase underline">
              <a href="/schedule" className="hover:text-green-950">View in Schedule &rarr;</a>
              <a href="/standings" className="hover:text-green-950">View Standings &rarr;</a>
            </div>
          </div>

          {/* 4-Table Ingestion Status Breakdown */}
          {saveDetails && (
            <div className="mt-3 pt-3 border-t border-green-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="p-2 bg-white border border-green-300 font-sans">
                <div className="font-bold text-[11px] uppercase text-blue-900">1. league_gamestats</div>
                <div className="text-[11px] text-green-700 font-bold mt-0.5">✅ 1 Game Row Saved</div>
              </div>

              <div className="p-2 bg-white border border-green-300 font-sans">
                <div className="font-bold text-[11px] uppercase text-green-900">2. player_stats_master</div>
                <div className={`text-[11px] font-bold mt-0.5 ${saveDetails.playerStatsInserted ? 'text-green-700' : 'text-red-700'}`}>
                  {saveDetails.playerStatsInserted ? `✅ ${saveDetails.playerRows} Skaters/Goalies` : `❌ ${saveDetails.tableErrors?.league_player_stats_master || 'RLS/Schema Blocked'}`}
                </div>
              </div>

              <div className="p-2 bg-white border border-green-300 font-sans">
                <div className="font-bold text-[11px] uppercase text-amber-900">3. league_scoring</div>
                <div className={`text-[11px] font-bold mt-0.5 ${saveDetails.scoringInserted ? 'text-green-700' : 'text-red-700'}`}>
                  {saveDetails.scoringInserted ? `✅ ${saveDetails.scoringRows} Goals Logged` : `❌ ${saveDetails.tableErrors?.league_scoring || 'RLS/Schema Blocked'}`}
                </div>
              </div>

              <div className="p-2 bg-white border border-green-300 font-sans">
                <div className="font-bold text-[11px] uppercase text-red-900">4. league_penalties</div>
                <div className={`text-[11px] font-bold mt-0.5 ${saveDetails.penaltiesInserted ? 'text-green-700' : 'text-red-700'}`}>
                  {saveDetails.penaltiesInserted ? `✅ ${saveDetails.penaltyRows} Penalties Logged` : `❌ ${saveDetails.tableErrors?.league_penalties || 'RLS/Schema Blocked'}`}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {saveError && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-800 text-red-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-700 shrink-0" />
          <span className="font-bold text-xs uppercase">{saveError}</span>
        </div>
      )}

      {/* Main Grid: Upload Zone + Preview */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Drag & Drop Dropzone */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white border-2 border-black p-5 shadow-sm">
            <h2 className="text-sm font-black uppercase border-b-2 border-black pb-2 mb-4 flex items-center gap-2">
              <Upload className="w-4 h-4" />
              1. Select Save State File
            </h2>

            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-black/40 hover:border-black p-8 text-center bg-[#faf8f5] transition cursor-pointer flex flex-col items-center justify-center min-h-[220px]"
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <FileCode className="w-10 h-10 text-slate-500 mb-3" />
              <p className="text-xs font-bold uppercase tracking-wider mb-1">
                Drag & Drop Save State (.state / .sav)
              </p>
              <p className="text-[11px] text-slate-500 italic mb-4">
                or click to browse your computer
              </p>
              <span className="px-3 py-1 bg-black text-white text-[11px] font-bold uppercase hover:bg-slate-800">
                Choose File
              </span>
              <input
                id="file-input"
                type="file"
                className="hidden"
                accept=".state,.sav,.srm,.state1,.state2,.state3,.state4,.state5,.state6,.state7,.state8,.state9"
                onChange={handleFileChange}
              />
            </div>

            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={loadDemoGame}
                className="w-full py-2 px-3 bg-slate-100 hover:bg-black hover:text-white border-2 border-black text-xs font-bold uppercase transition flex items-center justify-center gap-2 cursor-pointer shadow-[2px_2px_0px_rgba(0,0,0,1)]"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-700" />
                Load Demo Game (RIC @ BAY)
              </button>
            </div>

            {file && (
              <div className="mt-4 p-3 bg-slate-50 border border-slate-300 text-xs">
                <div className="flex justify-between items-center font-bold">
                  <span className="truncate max-w-[200px]">{file.name}</span>
                  <span className="text-slate-500 font-mono">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
                {isParsing && (
                  <div className="mt-2 text-blue-700 italic flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Parsing RetroArch memory offsets...
                  </div>
                )}
              </div>
            )}

            {parseError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-500 text-red-700 text-xs font-bold">
                {parseError}
              </div>
            )}

            {/* Quick Helper / Instructions */}
            <div className="mt-6 border-t border-black/20 pt-4 text-[11px] text-slate-600 space-y-2">
              <p className="font-bold uppercase text-black">Parser Specifications:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Compatible with RetroArch, Genesis Plus GX, and Sega Genesis state files.</li>
                <li>Extracts Game Length, 4-period shots/goals, Attack Zone Time, PP/SH, Faceoffs, and Checks.</li>
                <li>Calculates full skater statlines, goalie save percentages, scoring summaries, and penalties.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Boxscore Preview */}
        <div className="col-span-12 lg:col-span-8">
          {parsedGame ? (
            <div className="bg-white border-2 border-black shadow-sm">
              {/* Scoreboard Header */}
              <div className="bg-black text-white p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  {/* Away Team */}
                  <div className="text-center md:text-left flex items-center gap-4">
                    <div>
                      <div className="text-xs uppercase font-sans font-bold text-slate-400">Away Team</div>
                      <div className="text-3xl md:text-4xl font-black">{parsedGame.awayTeam.teamCode}</div>
                      <div className="text-xs text-slate-300 font-mono">{parsedGame.awayTeam.shots} Shots</div>
                    </div>
                    <div className="text-5xl font-black font-mono ml-4 text-yellow-400">
                      {parsedGame.awayTeam.goals}
                    </div>
                  </div>

                  {/* Center Matchup & Game Meta */}
                  <div className="text-center px-4 border-y md:border-y-0 md:border-x border-white/20 py-2">
                    <div className="text-xs uppercase tracking-widest font-bold text-yellow-400">
                      {parsedGame.isOT ? "FINAL (OT)" : "FINAL"}
                    </div>
                    <div className="text-2xl font-black tracking-tight my-1">
                      {parsedGame.matchup}
                    </div>
                    <div className="text-[11px] text-slate-300 font-mono flex items-center justify-center gap-3">
                      <span>Time: {parsedGame.gameLength}</span>
                      <span>•</span>
                      <span>Faceoffs: {parsedGame.totalFaceoffs}</span>
                    </div>
                  </div>

                  {/* Home Team */}
                  <div className="text-center md:text-right flex items-center gap-4 flex-row-reverse md:flex-row">
                    <div className="text-5xl font-black font-mono mr-4 text-yellow-400">
                      {parsedGame.homeTeam.goals}
                    </div>
                    <div>
                      <div className="text-xs uppercase font-sans font-bold text-slate-400">Home Team</div>
                      <div className="text-3xl md:text-4xl font-black">{parsedGame.homeTeam.teamCode}</div>
                      <div className="text-xs text-slate-300 font-mono">{parsedGame.homeTeam.shots} Shots</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Period by Period Summary Table */}
              <div className="bg-[#f4f1ea] border-b-2 border-black p-3 overflow-x-auto">
                <table className="w-full text-xs font-mono text-center">
                  <thead>
                    <tr className="border-b border-black/20 text-slate-600 font-sans uppercase">
                      <th className="text-left font-bold py-1">Team</th>
                      <th>1st</th>
                      <th>2nd</th>
                      <th>3rd</th>
                      {parsedGame.isOT && <th>OT</th>}
                      <th className="font-bold">Total</th>
                      <th className="font-bold">Shots</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-black/10">
                      <td className="text-left font-bold font-sans py-1">{parsedGame.awayTeam.teamCode}</td>
                      <td>{parsedGame.awayTeam.goalsP1}</td>
                      <td>{parsedGame.awayTeam.goalsP2}</td>
                      <td>{parsedGame.awayTeam.goalsP3}</td>
                      {parsedGame.isOT && <td>{parsedGame.awayTeam.goalsOT}</td>}
                      <td className="font-bold text-sm">{parsedGame.awayTeam.goals}</td>
                      <td className="text-slate-600">{parsedGame.awayTeam.shots}</td>
                    </tr>
                    <tr>
                      <td className="text-left font-bold font-sans py-1">{parsedGame.homeTeam.teamCode}</td>
                      <td>{parsedGame.homeTeam.goalsP1}</td>
                      <td>{parsedGame.homeTeam.goalsP2}</td>
                      <td>{parsedGame.homeTeam.goalsP3}</td>
                      {parsedGame.isOT && <td>{parsedGame.homeTeam.goalsOT}</td>}
                      <td className="font-bold text-sm">{parsedGame.homeTeam.goals}</td>
                      <td className="text-slate-600">{parsedGame.homeTeam.shots}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b-2 border-black bg-white overflow-x-auto text-xs font-bold uppercase">
                {[
                  { id: 'summary', label: 'Summary' },
                  { id: 'team_stats', label: 'Team Stats' },
                  { id: 'skaters', label: 'Skaters' },
                  { id: 'goalies', label: 'Goalies' },
                  { id: 'scoring', label: `Goals (${parsedGame.goals.length})` },
                  { id: 'penalties', label: `Penalties (${parsedGame.penalties.length})` },
                  { id: 'supabase_payload', label: 'Supabase Payload' },
                  { id: 'export', label: 'Export & CSV' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`px-4 py-2.5 transition whitespace-nowrap border-r border-black/20 ${activeTab === t.id ? 'bg-black text-white' : 'hover:bg-slate-100 text-black'
                      }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab Content Area */}
              <div className="p-5">
                {/* 1. Summary Tab */}
                {activeTab === 'summary' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-bold text-xs uppercase border-b border-black pb-1 mb-3">Game Recap</h3>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="p-3 bg-[#faf8f5] border border-black/20">
                          <span className="font-bold text-slate-500 uppercase">Powerplay Efficiency:</span>
                          <p className="mt-1 font-mono">
                            <strong>{parsedGame.awayTeam.teamCode}:</strong> {parsedGame.awayTeam.ppGoals}/{parsedGame.awayTeam.ppTries} ({parsedGame.awayTeam.ppTime} TOI)
                          </p>
                          <p className="mt-1 font-mono">
                            <strong>{parsedGame.homeTeam.teamCode}:</strong> {parsedGame.homeTeam.ppGoals}/{parsedGame.homeTeam.ppTries} ({parsedGame.homeTeam.ppTime} TOI)
                          </p>
                        </div>
                        <div className="p-3 bg-[#faf8f5] border border-black/20">
                          <span className="font-bold text-slate-500 uppercase">Zone Time & Physicality:</span>
                          <p className="mt-1 font-mono">
                            <strong>Attack Zone:</strong> {parsedGame.awayTeam.attackZoneTime} vs {parsedGame.homeTeam.attackZoneTime}
                          </p>
                          <p className="mt-1 font-mono">
                            <strong>Body Checks:</strong> {parsedGame.awayTeam.checks} vs {parsedGame.homeTeam.checks}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-xs uppercase border-b border-black pb-1 mb-3">Top Performers</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border border-black p-3">
                          <div className="font-bold text-xs uppercase mb-2 text-red-700">{parsedGame.awayTeam.teamCode} Leaders</div>
                          <div className="space-y-1 text-xs">
                            {parsedGame.awaySkaters.slice().sort((a, b) => b.points - a.points).slice(0, 3).map((s, i) => (
                              <div key={i} className="flex justify-between font-mono">
                                <span>{s.name} ({s.pos})</span>
                                <span className="font-bold">{s.goals}G, {s.assists}A ({s.points} PTS)</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="border border-black p-3">
                          <div className="font-bold text-xs uppercase mb-2 text-blue-700">{parsedGame.homeTeam.teamCode} Leaders</div>
                          <div className="space-y-1 text-xs">
                            {parsedGame.homeSkaters.slice().sort((a, b) => b.points - a.points).slice(0, 3).map((s, i) => (
                              <div key={i} className="flex justify-between font-mono">
                                <span>{s.name} ({s.pos})</span>
                                <span className="font-bold">{s.goals}G, {s.assists}A ({s.points} PTS)</span>
                              </div>
                            ))}
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
                          <th className="text-left py-2 font-bold">{parsedGame.awayTeam.teamCode} (Away)</th>
                          <th className="text-center py-2 font-bold text-black">Metric</th>
                          <th className="text-right py-2 font-bold">{parsedGame.homeTeam.teamCode} (Home)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/10">
                        {[
                          { label: 'Total Goals', away: parsedGame.awayTeam.goals, home: parsedGame.homeTeam.goals },
                          { label: 'Shots on Goal', away: parsedGame.awayTeam.shots, home: parsedGame.homeTeam.shots },
                          { label: 'Shooting %', away: `${(parsedGame.awayTeam.shootingPct * 100).toFixed(1)}%`, home: `${(parsedGame.homeTeam.shootingPct * 100).toFixed(1)}%` },
                          { label: 'Power Play Goals / Opps', away: `${parsedGame.awayTeam.ppGoals} / ${parsedGame.awayTeam.ppTries}`, home: `${parsedGame.homeTeam.ppGoals} / ${parsedGame.homeTeam.ppTries}` },
                          { label: 'Power Play Time', away: parsedGame.awayTeam.ppTime, home: parsedGame.homeTeam.ppTime },
                          { label: 'Power Play Shots', away: parsedGame.awayTeam.ppShots, home: parsedGame.homeTeam.ppShots },
                          { label: 'Short Handed Goals', away: parsedGame.awayTeam.shGoals, home: parsedGame.homeTeam.shGoals },
                          { label: 'Faceoffs Won', away: parsedGame.awayTeam.faceoffWins, home: parsedGame.homeTeam.faceoffWins },
                          { label: 'Body Checks', away: parsedGame.awayTeam.checks, home: parsedGame.homeTeam.checks },
                          { label: 'Penalties / PIM', away: `${parsedGame.awayTeam.penalties} (${parsedGame.awayTeam.pim} min)`, home: `${parsedGame.homeTeam.penalties} (${parsedGame.homeTeam.pim} min)` },
                          { label: 'Attack Zone Time', away: parsedGame.awayTeam.attackZoneTime, home: parsedGame.homeTeam.attackZoneTime },
                          { label: 'Pass Comps / Attempts', away: `${parsedGame.awayTeam.passComps} / ${parsedGame.awayTeam.passTries}`, home: `${parsedGame.homeTeam.passComps} / ${parsedGame.homeTeam.passTries}` },
                          { label: 'Breakaway Goals / Tries', away: `${parsedGame.awayTeam.breakawayGoals} / ${parsedGame.awayTeam.breakawayTries}`, home: `${parsedGame.homeTeam.breakawayGoals} / ${parsedGame.homeTeam.breakawayTries}` },
                          { label: 'One-Timer Goals / Tries', away: `${parsedGame.awayTeam.oneTimerGoals} / ${parsedGame.awayTeam.oneTimerTries}`, home: `${parsedGame.homeTeam.oneTimerGoals} / ${parsedGame.homeTeam.oneTimerTries}` },
                          { label: 'Penalty Shot Goals / Tries', away: `${parsedGame.awayTeam.penaltyShotGoals} / ${parsedGame.awayTeam.penaltyShotTries}`, home: `${parsedGame.homeTeam.penaltyShotGoals} / ${parsedGame.homeTeam.penaltyShotTries}` },
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
                      <h4 className="font-bold text-xs uppercase border-b-2 border-black pb-1 mb-2">
                        {parsedGame.awayTeam.teamCode} Skaters (Away)
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
                            {parsedGame.awaySkaters.map((s, i) => (
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
                      <h4 className="font-bold text-xs uppercase border-b-2 border-black pb-1 mb-2">
                        {parsedGame.homeTeam.teamCode} Skaters (Home)
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
                            {parsedGame.homeSkaters.map((s, i) => (
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
                    <div>
                      <h4 className="font-bold text-xs uppercase border-b-2 border-black pb-1 mb-2">
                        {parsedGame.awayTeam.teamCode} Goaltenders (Away)
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
                          {parsedGame.awayGoalies.map((g, i) => (
                            <tr key={i} className={g.toi === '0:00' ? 'opacity-40' : 'hover:bg-slate-50'}>
                              <td className="text-left font-bold font-sans py-1">{g.name}</td>
                              <td className="font-bold text-red-700">{g.ga}</td>
                              <td className="font-bold">{g.saves}</td>
                              <td>{g.shots}</td>
                              <td className="font-bold font-mono">{(g.savePct * 100).toFixed(1)}%</td>
                              <td>{g.so}</td>
                              <td className="font-bold">{g.w ? 'W' : g.l ? 'L' : g.otl ? 'OTL' : g.t ? 'T' : '-'}</td>
                              <td>{g.toi}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div>
                      <h4 className="font-bold text-xs uppercase border-b-2 border-black pb-1 mb-2">
                        {parsedGame.homeTeam.teamCode} Goaltenders (Home)
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
                          {parsedGame.homeGoalies.map((g, i) => (
                            <tr key={i} className={g.toi === '0:00' ? 'opacity-40' : 'hover:bg-slate-50'}>
                              <td className="text-left font-bold font-sans py-1">{g.name}</td>
                              <td className="font-bold text-red-700">{g.ga}</td>
                              <td className="font-bold">{g.saves}</td>
                              <td>{g.shots}</td>
                              <td className="font-bold font-mono">{(g.savePct * 100).toFixed(1)}%</td>
                              <td>{g.so}</td>
                              <td className="font-bold">{g.w ? 'W' : g.l ? 'L' : g.otl ? 'OTL' : g.t ? 'T' : '-'}</td>
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
                    {parsedGame.goals.length > 0 ? (
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
                          {parsedGame.goals.map((g, i) => (
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
                      <p className="text-xs italic text-slate-500">No goals recorded in this game.</p>
                    )}
                  </div>
                )}

                {/* 6. Penalties Log Tab */}
                {activeTab === 'penalties' && (
                  <div>
                    <h4 className="font-bold text-xs uppercase border-b-2 border-black pb-1 mb-3">Penalty Log</h4>
                    {parsedGame.penalties.length > 0 ? (
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
                          {parsedGame.penalties.map((p, i) => (
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
                      <p className="text-xs italic text-slate-500">No penalties recorded in this game.</p>
                    )}
                  </div>
                )}

                {/* 7. Supabase Payload Preview Tab */}
                {activeTab === 'supabase_payload' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap justify-between items-center gap-3 border-b-2 border-black pb-2">
                      <div>
                        <h4 className="font-bold text-xs uppercase">Supabase 4-Table Ingestion Payload</h4>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Pushing will simultaneously populate all 4 database tables for this game.
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-mono bg-green-100 text-green-800 font-bold px-2 py-0.5 border border-green-300">
                          4 Tables Linked by Game ID
                        </span>
                        <button
                          onClick={handleSaveToSupabase}
                          disabled={isSaving || (Boolean(parsedGame) && scheduleStatus.isAllPlayed && !allowOverwrite)}
                          style={{
                            backgroundColor: (parsedGame && scheduleStatus.isAllPlayed && !allowOverwrite) ? '#991b1b' : '#16a34a',
                            color: '#ffffff'
                          }}
                          className="flex items-center gap-2 px-4 py-1.5 hover:opacity-90 text-white font-black text-xs uppercase border-2 border-black transition shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Database className="w-3.5 h-3.5 text-white" />
                          {isSaving ? "Publishing..." : (scheduleStatus.isAllPlayed && !allowOverwrite ? "Matchup Already Played" : "Push to Supabase")}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Table 1: league_gamestats */}
                      <div className="border border-black p-3 bg-white">
                        <div className="flex justify-between items-center mb-2 pb-1 border-b border-black/20">
                          <span className="font-bold text-xs uppercase text-blue-900">1. league_gamestats</span>
                          <span className="text-[10px] font-mono text-slate-500">1 Row</span>
                        </div>
                        <pre className="p-2 bg-slate-900 text-green-400 font-mono text-[10px] overflow-x-auto max-h-[160px]">
                          {JSON.stringify(generateSupabaseRow(parsedGame, selectedSeasonId), null, 2)}
                        </pre>
                      </div>

                      {/* Table 2: league_player_stats_master */}
                      <div className="border border-black p-3 bg-white">
                        <div className="flex justify-between items-center mb-2 pb-1 border-b border-black/20">
                          <span className="font-bold text-xs uppercase text-green-900">2. league_player_stats_master</span>
                          <span className="text-[10px] font-mono text-slate-500">{parsedGame.homeSkaters.length + parsedGame.awaySkaters.length + parsedGame.homeGoalies.length + parsedGame.awayGoalies.length} Player Rows</span>
                        </div>
                        <pre className="p-2 bg-slate-900 text-amber-300 font-mono text-[10px] overflow-x-auto max-h-[160px]">
                          {JSON.stringify([
                            ...parsedGame.awaySkaters.slice(0, 2).map(s => ({ player: s.name, pos: s.pos, g: s.goals, a: s.assists, pts: s.points, sog: s.sog, chk: s.checks, pim: s.pim, ppp: s.ppp, shp: s.shp, toi: s.toiSeconds })),
                            ...parsedGame.awayGoalies.slice(0, 1).map(g => ({ goalie: g.name, pos: 'G', ga: g.ga, sv: g.saves, sog: g.shots, w: g.w, l: g.l, t: g.t, otl: g.otl, toi: g.toiSeconds }))
                          ], null, 2)}
                        </pre>
                      </div>

                      {/* Table 3: league_scoring */}
                      <div className="border border-black p-3 bg-white">
                        <div className="flex justify-between items-center mb-2 pb-1 border-b border-black/20">
                          <span className="font-bold text-xs uppercase text-amber-900">3. league_scoring</span>
                          <span className="text-[10px] font-mono text-slate-500">{parsedGame.goals.length} Goal Rows</span>
                        </div>
                        <pre className="p-2 bg-slate-900 text-cyan-300 font-mono text-[10px] overflow-x-auto max-h-[140px]">
                          {JSON.stringify(parsedGame.goals.map(g => ({
                            period: g.period,
                            time: g.time,
                            team: g.team,
                            scorer_id: 27520,
                            scorer: g.scorer,
                            assist1_id: g.assist1 !== '--' ? 24644 : null,
                            assist1: g.assist1 !== '--' ? g.assist1 : null,
                            assist2_id: g.assist2 !== '--' ? 27519 : null,
                            assist2: g.assist2 !== '--' ? g.assist2 : null,
                            way: g.type
                          })), null, 2)}
                        </pre>
                      </div>

                      {/* Table 4: league_penalties */}
                      <div className="border border-black p-3 bg-white">
                        <div className="flex justify-between items-center mb-2 pb-1 border-b border-black/20">
                          <span className="font-bold text-xs uppercase text-red-900">4. league_penalties</span>
                          <span className="text-[10px] font-mono text-slate-500">{parsedGame.penalties.length} Penalty Rows</span>
                        </div>
                        <pre className="p-2 bg-slate-900 text-pink-300 font-mono text-[10px] overflow-x-auto max-h-[140px]">
                          {JSON.stringify(parsedGame.penalties.map(p => ({
                            period: p.period,
                            time: p.time,
                            team: p.team,
                            player_id: 27949,
                            player: p.player,
                            penalty_type: p.type
                          })), null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}

                {/* 8. Export & CSV Tab */}
                {activeTab === 'export' && (
                  <div className="space-y-4">
                    <h4 className="font-bold text-xs uppercase border-b-2 border-black pb-1 mb-3">Export File Datasets</h4>
                    <p className="text-xs text-slate-600">
                      Download individual CSV files formatted for archives, analysis, or local record keeping.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={exportTeamStatsCSV}
                        className="flex items-center justify-between p-3 border-2 border-black bg-white hover:bg-black hover:text-white transition text-xs font-bold uppercase cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-green-700" />
                          WN95HL_Game_Stats.csv
                        </span>
                        <Download className="w-4 h-4" />
                      </button>

                      <button
                        onClick={exportPlayerStatsCSV}
                        className="flex items-center justify-between p-3 border-2 border-black bg-white hover:bg-black hover:text-white transition text-xs font-bold uppercase cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-blue-700" />
                          WN95HL_Player_Stats.csv
                        </span>
                        <Download className="w-4 h-4" />
                      </button>

                      <button
                        onClick={exportScoringSummaryCSV}
                        className="flex items-center justify-between p-3 border-2 border-black bg-white hover:bg-black hover:text-white transition text-xs font-bold uppercase cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-amber-700" />
                          WN95HL_Scoring_Summary.csv
                        </span>
                        <Download className="w-4 h-4" />
                      </button>

                      <button
                        onClick={exportPenaltySummaryCSV}
                        className="flex items-center justify-between p-3 border-2 border-black bg-white hover:bg-black hover:text-white transition text-xs font-bold uppercase cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-red-700" />
                          WN95HL_Penalty_Summary.csv
                        </span>
                        <Download className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="pt-4 border-t border-black/20">
                      <button
                        onClick={exportAllJSON}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 border border-black text-xs font-bold uppercase hover:bg-black hover:text-white transition cursor-pointer"
                      >
                        <Download className="w-4 h-4" /> Download Complete JSON Bundle
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border-2 border-dashed border-black/30 p-12 text-center min-h-[400px] flex flex-col items-center justify-center">
              <Eye className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="text-sm font-bold uppercase text-slate-600 mb-1">
                Awaiting Save State Upload
              </h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Drop your RetroArch Genesis .state file on the left panel to immediately decode the game score, boxscore, player stats, and scoring log.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
