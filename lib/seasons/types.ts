export interface TeamPositionCount {
  goalies: number;
  forwards: number;
  defensemen: number;
}

export interface SeasonConfig {
  seasonId: number | string;
  seasonName: string;
  leagueType: string; // 'W', 'Q', 'O', 'V', etc.
  teamCodes: Record<number, string>;
  teamPositionCounts: Record<string, TeamPositionCount>;
  goalies: Record<string, string[]>;
  skaters: Record<string, string[]>;
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
  teamName?: string;
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
  rawStatsDict?: Record<string, any>;
}
