export interface TeamPositionCount {
  goalies: number;
  forwards: number;
  defensemen: number;
}

export interface SeasonConfig {
  seasonId: number | string;
  seasonName: string;
  leagueType: string; // 'W', 'Q', 'O', 'V', etc.
  leagueCode?: string;
  teamCodes: Record<number | string, string>;
  defaultPositionCounts?: TeamPositionCount;
  teamPositionCounts: Record<string, TeamPositionCount>;
  goalies: Record<string, string[]>;
  skaters: Record<string, string[]>;
}

export function isValidSeasonConfig(obj: any): obj is SeasonConfig {
  if (!obj || typeof obj !== 'object') return false;
  if (obj.seasonId === undefined || obj.seasonId === null) return false;
  if (typeof obj.seasonName !== 'string' || !obj.seasonName.trim()) return false;
  if (!obj.teamCodes || typeof obj.teamCodes !== 'object') return false;
  if (!obj.goalies || typeof obj.goalies !== 'object') return false;
  if (!obj.skaters || typeof obj.skaters !== 'object') return false;
  return true;
}

export function normalizeSeasonConfig(raw: any, fallbackId?: number | string): SeasonConfig {
  const sId = raw.seasonId !== undefined && raw.seasonId !== null ? raw.seasonId : (fallbackId || 40);
  const lType = String(raw.leagueType || 'W').toUpperCase();
  const defaultCounts: TeamPositionCount = raw.defaultPositionCounts || { goalies: 2, forwards: 5, defensemen: 3 };

  const rawTeamCodes = raw.teamCodes || {};
  const teamCodes: Record<string | number, string> = {};
  Object.entries(rawTeamCodes).forEach(([k, v]) => {
    teamCodes[k] = String(v);
  });

  const teamPositionCounts: Record<string, TeamPositionCount> = {};
  const rawPosCounts = raw.teamPositionCounts || {};
  Object.entries(rawPosCounts).forEach(([team, counts]: [string, any]) => {
    teamPositionCounts[team] = {
      goalies: Number(counts?.goalies ?? defaultCounts.goalies),
      forwards: Number(counts?.forwards ?? defaultCounts.forwards),
      defensemen: Number(counts?.defensemen ?? defaultCounts.defensemen)
    };
  });

  Object.values(teamCodes).forEach(team => {
    if (!teamPositionCounts[team]) {
      teamPositionCounts[team] = { ...defaultCounts };
    }
  });

  return {
    seasonId: sId,
    seasonName: raw.seasonName || `Season ${sId}`,
    leagueType: lType,
    leagueCode: raw.leagueCode || `${lType}${String(sId).padStart(2, '0')}`,
    teamCodes,
    defaultPositionCounts: defaultCounts,
    teamPositionCounts,
    goalies: raw.goalies || {},
    skaters: raw.skaters || {}
  };
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
