import { SeasonConfig, TeamPositionCount, isValidSeasonConfig, normalizeSeasonConfig } from './types';
import wSeasonRaw from './w_season.json';
import oSeasonRaw from './o_season.json';

export * from './types';

// ==========================================
// 1. PRIMARY BASE CONFIGS FROM JSON FILES
// ==========================================

export const W_SEASON_CONFIG: SeasonConfig = normalizeSeasonConfig(wSeasonRaw, 40);
export const O_SEASON_CONFIG: SeasonConfig = normalizeSeasonConfig(oSeasonRaw, 39);

// Season 38 (W17) derived from W-League
export const W17_SEASON_CONFIG: SeasonConfig = {
  ...W_SEASON_CONFIG,
  seasonId: 38,
  seasonName: 'W League - Season 17 (W17 / Season 38)',
  leagueCode: 'W17'
};

// ==========================================
// 2. BACKWARD-COMPATIBLE DERIVED EXPORTS
// ==========================================

export const DEFAULT_TEAM_CODES: Record<number, string> = Object.entries(W_SEASON_CONFIG.teamCodes).reduce(
  (acc, [k, v]) => {
    acc[Number(k)] = v;
    return acc;
  },
  {} as Record<number, string>
);

export const W_LEAGUE_POSITION_COUNTS: Record<string, TeamPositionCount> = W_SEASON_CONFIG.teamPositionCounts;
export const W_LEAGUE_GOALIES: Record<string, string[]> = W_SEASON_CONFIG.goalies;
export const W_LEAGUE_SKATERS: Record<string, string[]> = W_SEASON_CONFIG.skaters;

export const O_LEAGUE_TEAM_CODES: Record<number, string> = Object.entries(O_SEASON_CONFIG.teamCodes).reduce(
  (acc, [k, v]) => {
    acc[Number(k)] = v;
    return acc;
  },
  {} as Record<number, string>
);

export const O_LEAGUE_POSITION_COUNTS: Record<string, TeamPositionCount> = O_SEASON_CONFIG.teamPositionCounts;
export const O_LEAGUE_GOALIES: Record<string, string[]> = O_SEASON_CONFIG.goalies;
export const O_LEAGUE_SKATERS: Record<string, string[]> = O_SEASON_CONFIG.skaters;

// ==========================================
// 3. DYNAMIC SEASON REGISTRY SYSTEM
// ==========================================

const registeredSeasonsMap = new Map<string, SeasonConfig>();

// Register base seasons
registeredSeasonsMap.set('40', W_SEASON_CONFIG);
registeredSeasonsMap.set('39', O_SEASON_CONFIG);
registeredSeasonsMap.set('38', W17_SEASON_CONFIG);

/**
 * Register a new season configuration into the system at runtime.
 * Can be called when a user imports a JSON file or when a plugin/script adds a season.
 */
export function registerSeason(config: SeasonConfig | any): SeasonConfig {
  const normalized = normalizeSeasonConfig(config);
  registeredSeasonsMap.set(String(normalized.seasonId), normalized);
  return normalized;
}

/**
 * Parses and registers a season from a JSON string or object.
 */
export function loadSeasonFromJson(jsonInput: string | object): SeasonConfig {
  let parsed: any;
  if (typeof jsonInput === 'string') {
    try {
      parsed = JSON.parse(jsonInput);
    } catch (e: any) {
      throw new Error(`Invalid Season JSON: ${e.message}`);
    }
  } else {
    parsed = jsonInput;
  }

  if (!isValidSeasonConfig(parsed)) {
    throw new Error('Season JSON is missing required fields (seasonId, seasonName, teamCodes, goalies, or skaters).');
  }

  return registerSeason(parsed);
}

/**
 * Returns all currently registered seasons.
 */
export function getAllSeasons(): SeasonConfig[] {
  return Array.from(registeredSeasonsMap.values());
}

/**
 * Exported mutable / reactive list of available seasons.
 */
export const AVAILABLE_SEASONS: SeasonConfig[] = [
  W_SEASON_CONFIG,
  O_SEASON_CONFIG,
  W17_SEASON_CONFIG
];

/**
 * Look up a season configuration by its ID, code, or name.
 * Generates an automatic smart fallback if not explicitly registered.
 */
export function getSeasonConfig(seasonId: number | string): SeasonConfig {
  const sKey = String(seasonId);
  if (registeredSeasonsMap.has(sKey)) {
    return registeredSeasonsMap.get(sKey)!;
  }

  const matched = Array.from(registeredSeasonsMap.values()).find(
    s => String(s.seasonId) === sKey || s.leagueCode === sKey || s.seasonName.toLowerCase().includes(sKey.toLowerCase())
  );
  if (matched) return matched;

  // Fallback for Original 6
  if (Number(seasonId) === 39) {
    return O_SEASON_CONFIG;
  }

  // Dynamic fallback for any new or unregistered season ID
  const isOLeague = String(seasonId).toLowerCase().startsWith('o');
  const baseConfig = isOLeague ? O_SEASON_CONFIG : W_SEASON_CONFIG;

  const fallback: SeasonConfig = {
    ...baseConfig,
    seasonId,
    seasonName: `Season ${seasonId}`,
    leagueCode: `${baseConfig.leagueType}${String(seasonId).padStart(2, '0')}`
  };

  // Cache dynamically so subsequent lookups are instant
  registeredSeasonsMap.set(sKey, fallback);
  return fallback;
}

// ==========================================
// 4. SHARED LEAGUE & TEAM UTILITY HELPERS
// ==========================================

export function parseTimeToDayFraction(timeStr: string): string {
  if (!timeStr) return '0';
  const parts = timeStr.split(':').map(Number);
  const minutes = parts[0] || 0;
  const seconds = parts[1] || 0;
  const totalFraction = (minutes + seconds / 60) / 24;
  return totalFraction.toString();
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
