export const SUPABASE_ROM_IMAGES_URL = 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/rom-images';
export const SUPABASE_ROMS_URL = 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/roms';

/**
 * Resolves an image path to a full URL.
 * If path starts with http://, https://, or /, it returns it directly.
 * Otherwise, resolves against the Supabase `rom-images` public storage bucket.
 */
export function getRomImageUrl(imagePath?: string): string | undefined {
  if (!imagePath || !imagePath.trim()) return undefined;
  const path = imagePath.trim();
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/')) {
    return path;
  }
  return `${SUPABASE_ROM_IMAGES_URL}/${encodeURI(path)}`;
}

/**
 * Resolves a ROM download URL.
 * If a custom URL is provided, returns that.
 * Otherwise, builds a direct download URL against the Supabase `roms` storage bucket with ?download flag.
 */
export function getRomDownloadUrl(fileName: string, customUrl?: string): string {
  if (customUrl && customUrl.trim()) return customUrl.trim();
  return `${SUPABASE_ROMS_URL}/${encodeURIComponent(fileName)}?download`;
}

export interface LeagueRom {
  id: string;
  league: string;
  leagueCode: 'W' | 'Q' | 'V' | 'G' | 'O' | 'OTHER';
  seasonName: string;
  fileName: string;
  fileSize: string;
  md5: string;
  releaseDate: string;
  description: string;
  imageUrl?: string;
  downloadUrl?: string;
  badge?: string;
  isActive?: boolean;
}

export interface HistoricalNhlRom {
  id: string;
  year: number;
  seasonLabel: string;
  era: 'pre-war' | 'original-six' | 'expansion-70s' | 'dynasties-80s' | 'golden-90s' | 'modern-2000s' | 'modern-2010s' | 'present-2020s';
  eraLabel: string;
  champion?: string;
  runnerUp?: string;
  notableTeams?: string[];
  features: string;
  modder?: string;
  fileName: string;
  fileSize: string;
  imageUrl?: string;
  downloadUrl?: string;
}

export interface MiscRom {
  id: string;
  title: string;
  category: 'Cross-Sport' | 'Arcade Mashup' | 'International' | 'College' | 'Pop Culture';
  platform: string;
  fileName: string;
  fileSize: string;
  releaseYear: string;
  author: string;
  description: string;
  imageUrl?: string;
  coverImage?: string;
  downloadUrl?: string;
  tags: string[];
}

export interface UtilityPack {
  id: string;
  title: string;
  category: 'Emulator' | 'Broadcast' | 'Audio' | 'Tool';
  fileName: string;
  fileSize: string;
  desc: string;
  imageUrl?: string;
  downloadUrl?: string;
}

// ============================================================================
// 1. OFFICIAL LEAGUE ROMS (W, Q, VINTAGE, GOLDEN ERA, ORIGINAL 6)
// ============================================================================
export const OFFICIAL_LEAGUE_ROMS: LeagueRom[] = [
  {
    id: 'w18',
    league: 'The W League',
    leagueCode: 'W',
    seasonName: 'Season 40 (W18 Official)',
    fileName: 'NHL95_Season40_W18_Official.bin',
    fileSize: '2.0 MB',
    md5: 'a4f8e219b678c0024e819fa281b379c1',
    releaseDate: 'Active Season',
    description: 'The official active competitive season ROM featuring updated team rosters, custom franchise center ice logos, and manual goalie reaction profiles.',
    imageUrl: 'w18.png',
    badge: 'ACTIVE SEASON',
    isActive: true
  },
  {
    id: 'w17',
    league: 'The W League',
    leagueCode: 'W',
    seasonName: 'Season 39 (W17 Vault)',
    fileName: 'NHL95_Season39_W17_Vault.bin',
    fileSize: '2.0 MB',
    md5: '8b3c10294fec9817ad91740283b49f22',
    releaseDate: 'Previous Season',
    imageUrl: 'w17.png',
    description: 'W17 tournament build with full historical line combination balance and competitive exhibition netplay settings.'
  },
  {
    id: 'q19',
    league: 'The Q League',
    leagueCode: 'Q',
    seasonName: 'Season 36 (Q19 Official)',
    fileName: 'NHL95_TheQ_Q19_Official.bin',
    fileSize: '2.0 MB',
    md5: '7c32d90a1841e5492d19bc2981a54ee3',
    releaseDate: 'Active Tier',
    imageUrl: 'q19.png',
    description: 'Premier tier Q League competitive edition tuned for lightning-fast skating speed, high-aggression defense mechanics, and manual shot controls.',
    badge: 'PREMIER'
  },
  {
    id: 'q18',
    league: 'The Q League',
    leagueCode: 'Q',
    seasonName: 'Season 35 (Q18 Vault)',
    fileName: 'NHL95_TheQ_Q18_Vault.bin',
    fileSize: '2.0 MB',
    md5: '6d123e4a908b1a2387cf91823ab02814',
    releaseDate: 'Archival Vault',
    imageUrl: 'q18.png',
    description: 'Previous Q League championship tournament build preserved for historical playoff series recreation.'
  },
  {
    id: 'v01',
    league: 'Vintage Grail Cup',
    leagueCode: 'V',
    seasonName: 'Season 20 (V01 Grail)',
    fileName: 'NHL95_Vintage_V01_Grail.bin',
    fileSize: '2.0 MB',
    md5: 'e5b29c01824a77d13b610fa728bc991a',
    releaseDate: 'Archival Vault',
    imageUrl: 'v01.png',
    description: 'The Grail Cup vintage league edition celebrating 80s icons, classic wooden stick shot physics, and arena organ charge tracks.',
    badge: 'GRAIL CUP'
  },
  {
    id: 'g01',
    league: 'Golden Era',
    leagueCode: 'G',
    seasonName: 'Season 16 (G01 Golden)',
    fileName: 'NHL95_GoldenEra_G01.bin',
    fileSize: '2.0 MB',
    md5: 'f819ac29b710e6648c291ba8192ec405',
    releaseDate: 'Archival Vault',
    imageUrl: 'g01.png',
    description: 'Golden Era showcase ROM celebrating the greatest 90s offensive dynasties, heavy checking, and high-scoring showdowns.',
    badge: 'GOLDEN ERA'
  },
  {
    id: 'o01',
    league: 'Original Six',
    leagueCode: 'O',
    seasonName: 'Season 39 (O01 Classic)',
    fileName: 'NHL95_OriginalSix_O01.bin',
    fileSize: '2.0 MB',
    md5: 'd7a1e582c918b4317f229eb914a88f02',
    releaseDate: 'Archival Vault',
    imageUrl: 'o01.png',
    description: 'Vintage Original Six tournament ROM (BOS, CHI, DET, MTL, NYR, TOR) with vintage sweaters, leather pads, and classic rinks.',
    badge: 'ORIGINAL 6'
  }
];

// ============================================================================
// 2. ALL HISTORICAL NHL ROMS (1909 - PRESENT DAY)
// Organized across all eras of hockey history
// ============================================================================
export const HISTORICAL_NHL_ROMS: HistoricalNhlRom[] = [
  // --- PRESENT DAY & 2020s ---
  {
    id: 'nhl-2025-26',
    year: 2025,
    seasonLabel: '2025-26 Present NHL Season',
    era: 'present-2020s',
    eraLabel: '2020s & Present',
    champion: 'Current Season',
    notableTeams: ['Florida Panthers', 'Edmonton Oilers', 'Utah Hockey Club', 'NY Rangers'],
    features: 'Up-to-the-minute 2025-26 rosters, Utah HC inaugural branding, updated player faces, new salary cap rosters.',
    modder: 'NHL95 Community Mod Team',
    fileName: 'NHL95_Season_2025-26_v1.0.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-4nations-2025',
    year: 2025,
    seasonLabel: '2025 4 Nations Face-Off',
    era: 'present-2020s',
    eraLabel: '2020s & Present',
    champion: 'International Showcase',
    notableTeams: ['Canada', 'USA', 'Sweden', 'Finland'],
    features: 'Official 4 Nations tournament mod featuring McDavid, MacKinnon, Matthews, Barkov with authentic country jerseys.',
    modder: 'Euro95 & Blitz',
    fileName: 'NHL95_4Nations_2025_Special.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-2024-25',
    year: 2024,
    seasonLabel: '2024-25 NHL Season',
    era: 'present-2020s',
    eraLabel: '2020s & Present',
    champion: 'Florida Panthers',
    runnerUp: 'Edmonton Oilers',
    notableTeams: ['Florida Panthers', 'Edmonton Oilers', 'Dallas Stars', 'NY Rangers'],
    features: 'Stanley Cup championship rosters, Reinhart 57-goal profile, McDavid playoff scoring ratings.',
    modder: 'Scribe & Coach',
    fileName: 'NHL95_Season_2024-25.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-2023-24',
    year: 2023,
    seasonLabel: '2023-24 NHL Season',
    era: 'present-2020s',
    eraLabel: '2020s & Present',
    champion: 'Vegas Golden Knights',
    runnerUp: 'Florida Panthers',
    notableTeams: ['Vegas Golden Knights', 'Carolina Hurricanes', 'Florida Panthers'],
    features: 'Conn Smythe Marchessault profile, expansion champion Vegas golden sweaters, 32-team custom schedule.',
    modder: 'ChaosNHL',
    fileName: 'NHL95_Season_2023-24.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-2021-22',
    year: 2021,
    seasonLabel: '2021-22 NHL Season (Kraken Debut)',
    era: 'present-2020s',
    eraLabel: '2020s & Present',
    champion: 'Colorado Avalanche',
    runnerUp: 'Tampa Bay Lightning',
    notableTeams: ['Colorado Avalanche', 'Seattle Kraken', 'Tampa Bay Lightning'],
    features: 'Inaugural Seattle Kraken 32nd franchise inclusion, Makar Conn Smythe dominant ratings.',
    modder: 'NHL95 Reborn',
    fileName: 'NHL95_Season_2021-22_Kraken.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-2020-21',
    year: 2020,
    seasonLabel: '2020-21 NHL Season (COVID Bubble Cup)',
    era: 'present-2020s',
    eraLabel: '2020s & Present',
    champion: 'Tampa Bay Lightning',
    runnerUp: 'Montreal Canadiens',
    notableTeams: ['Tampa Bay Lightning', 'Montreal Canadiens', 'NY Islanders', 'Vegas'],
    features: 'All-Canadian North Division structure, bubble tournament playoffs, Kucherov & Point playoff dominance.',
    modder: 'Blitz Community',
    fileName: 'NHL95_Season_2020-21_Bubble.bin',
    fileSize: '2.0 MB'
  },

  // --- 2010s MODERN ERA ---
  {
    id: 'nhl-2018-19',
    year: 2018,
    seasonLabel: '2018-19 NHL Season (Blues Historic Run)',
    era: 'modern-2010s',
    eraLabel: '2010s Modern Era',
    champion: 'St. Louis Blues',
    runnerUp: 'Boston Bruins',
    notableTeams: ['St. Louis Blues', 'Tampa Bay Lightning (62 wins)', 'Boston Bruins'],
    features: 'From last place to Stanley Cup champion Blues, 62-win Lightning historic regular season squad.',
    modder: 'RetroHacks',
    fileName: 'NHL95_Season_2018-19.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-2017-18',
    year: 2017,
    seasonLabel: '2017-18 NHL Season (Ovechkin Cup & Vegas Inaugural)',
    era: 'modern-2010s',
    eraLabel: '2010s Modern Era',
    champion: 'Washington Capitals',
    runnerUp: 'Vegas Golden Knights',
    notableTeams: ['Washington Capitals', 'Vegas Golden Knights', 'Winnipeg Jets'],
    features: 'Alex Ovechkin maiden Stanley Cup championship, Vegas Golden Knights inaugural run to finals.',
    modder: 'Wuply & Coach',
    fileName: 'NHL95_Season_2017-18_CapsCup.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-2015-16',
    year: 2015,
    seasonLabel: '2015-16 NHL Season (Penguins Back-to-Back Part 1)',
    era: 'modern-2010s',
    eraLabel: '2010s Modern Era',
    champion: 'Pittsburgh Penguins',
    runnerUp: 'San Jose Sharks',
    notableTeams: ['Pittsburgh Penguins', 'San Jose Sharks', 'Chicago Blackhawks'],
    features: 'HBK line (Hagelin-Bonino-Kessel) speed boost, Crosby Conn Smythe, Sharks first Finals appearance.',
    modder: 'SteelCityNHL',
    fileName: 'NHL95_Season_2015-16.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-2013-14',
    year: 2013,
    seasonLabel: '2013-14 NHL Season (LA Kings 2nd Cup)',
    era: 'modern-2010s',
    eraLabel: '2010s Modern Era',
    champion: 'Los Angeles Kings',
    runnerUp: 'New York Rangers',
    notableTeams: ['Los Angeles Kings', 'New York Rangers', 'Chicago Blackhawks'],
    features: 'Epic 7-game Western Final physics, Doughty-Kopitar-Quick defensive fortress.',
    modder: 'GenesisPuck',
    fileName: 'NHL95_Season_2013-14_Kings.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-2012-13',
    year: 2012,
    seasonLabel: '2012-13 NHL Season (Blackhawks 17-Second Magic)',
    era: 'modern-2010s',
    eraLabel: '2010s Modern Era',
    champion: 'Chicago Blackhawks',
    runnerUp: 'Boston Bruins',
    notableTeams: ['Chicago Blackhawks (24-game point streak)', 'Boston Bruins', 'Pittsburgh Penguins'],
    features: 'Historic 24-game start without regulation loss, Kane & Toews dynasty peak.',
    modder: 'Madhouse95',
    fileName: 'NHL95_Season_2012-13.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-2010-11',
    year: 2010,
    seasonLabel: '2010-11 NHL Season (Bruins vs Canucks)',
    era: 'modern-2010s',
    eraLabel: '2010s Modern Era',
    champion: 'Boston Bruins',
    runnerUp: 'Vancouver Canucks',
    notableTeams: ['Boston Bruins', 'Vancouver Canucks', 'Tampa Bay Lightning'],
    features: 'Tim Thomas Conn Smythe god-mode goaltending, Sedin twins artful cycling ratings, Chara heavy checking.',
    modder: 'BeantownMods',
    fileName: 'NHL95_Season_2010-11.bin',
    fileSize: '2.0 MB'
  },

  // --- 2000s MODERN ERA ---
  {
    id: 'nhl-2008-09',
    year: 2008,
    seasonLabel: '2008-09 NHL Season (Crosby vs Zetterberg)',
    era: 'modern-2000s',
    eraLabel: '2000s Era',
    champion: 'Pittsburgh Penguins',
    runnerUp: 'Detroit Red Wings',
    notableTeams: ['Pittsburgh Penguins', 'Detroit Red Wings', 'Chicago Blackhawks'],
    features: 'Rematch of the century: Crosby & Malkin vs Datsyuk & Zetterberg. Max Talbot game 7 heroics.',
    modder: 'Vintage95',
    fileName: 'NHL95_Season_2008-09.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-2005-06',
    year: 2005,
    seasonLabel: '2005-06 NHL Season (Post-Lockout Crosby/Ovi Rookies)',
    era: 'modern-2000s',
    eraLabel: '2000s Era',
    champion: 'Carolina Hurricanes',
    runnerUp: 'Edmonton Oilers',
    notableTeams: ['Carolina Hurricanes', 'Edmonton Oilers', 'Buffalo Sabres', 'Ottawa Senators'],
    features: 'Rookie phenoms Sidney Crosby and Alex Ovechkin, Ward Conn Smythe, high-speed shootout era.',
    modder: 'PuckMaster95',
    fileName: 'NHL95_Season_2005-06_Rookies.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-2003-04',
    year: 2003,
    seasonLabel: '2003-04 NHL Season (Lightning It Was In)',
    era: 'modern-2000s',
    eraLabel: '2000s Era',
    champion: 'Tampa Bay Lightning',
    runnerUp: 'Calgary Flames',
    notableTeams: ['Tampa Bay Lightning', 'Calgary Flames', 'Philadelphia Flyers', 'San Jose Sharks'],
    features: 'St. Louis, Lecavalier, Richards triumvirate vs Iginla and Kiprusoff. Classic 7-game final.',
    modder: 'Bolt95',
    fileName: 'NHL95_Season_2003-04.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-2001-02',
    year: 2001,
    seasonLabel: '2001-02 NHL Season (Red Wings Hall of Fame Superteam)',
    era: 'modern-2000s',
    eraLabel: '2000s Era',
    champion: 'Detroit Red Wings',
    runnerUp: 'Carolina Hurricanes',
    notableTeams: ['Detroit Red Wings', 'Colorado Avalanche', 'Toronto Maple Leafs', 'Carolina Hurricanes'],
    features: 'Ten future Hall of Famers on one roster (Yzerman, Fedorov, Shanahan, Hull, Robitaille, Lidstrom, Hasek, Larionov, Chelios, Datsyuk).',
    modder: 'HockeyTownMod',
    fileName: 'NHL95_Season_2001-02_RedWingsHOF.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-2000-01',
    year: 2000,
    seasonLabel: '2000-01 NHL Season (Bourque Lifts The Cup)',
    era: 'modern-2000s',
    eraLabel: '2000s Era',
    champion: 'Colorado Avalanche',
    runnerUp: 'New Jersey Devils',
    notableTeams: ['Colorado Avalanche', 'New Jersey Devils', 'Pittsburgh Penguins', 'St. Louis Blues'],
    features: 'Ray Bourque 22-year quest fulfilled, Sakic, Forsberg, Roy vs Brodeur, Stevens, Elias.',
    modder: 'AvalancheVault',
    fileName: 'NHL95_Season_2000-01_Bourque.bin',
    fileSize: '2.0 MB'
  },

  // --- 1990s GOLDEN ERA ---
  {
    id: 'nhl-1998-99',
    year: 1998,
    seasonLabel: '1998-99 NHL Season (Hull In The Crease)',
    era: 'golden-90s',
    eraLabel: '1990s Golden Era',
    champion: 'Dallas Stars',
    runnerUp: 'Buffalo Sabres',
    notableTeams: ['Dallas Stars', 'Buffalo Sabres', 'Colorado Avalanche', 'Toronto Maple Leafs'],
    features: 'Triple overtime Game 6 skate in the crease drama, Belfour vs Hasek goaltending masterclass.',
    modder: 'RetroStars',
    fileName: 'NHL95_Season_1998-99.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-1996-97',
    year: 1996,
    seasonLabel: '1996-97 NHL Season (Blood Rivalry & Wings Sweep)',
    era: 'golden-90s',
    eraLabel: '1990s Golden Era',
    champion: 'Detroit Red Wings',
    runnerUp: 'Philadelphia Flyers',
    notableTeams: ['Detroit Red Wings', 'Philadelphia Flyers (Legion of Doom)', 'Colorado Avalanche'],
    features: 'Wings end 42-year drought, Lindros Legion of Doom vs Russian Five legendary showdown.',
    modder: 'Vintage95',
    fileName: 'NHL95_Season_1996-97_RussianFive.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-1995-96',
    year: 1995,
    seasonLabel: '1995-96 NHL Season (Year of the Rat & Avs Sweep)',
    era: 'golden-90s',
    eraLabel: '1990s Golden Era',
    champion: 'Colorado Avalanche',
    runnerUp: 'Florida Panthers',
    notableTeams: ['Colorado Avalanche', 'Florida Panthers', 'Detroit Red Wings (62 wins)', 'Pittsburgh Penguins'],
    features: 'Inaugural Colorado Avalanche season following Quebec move, Patrick Roy mid-season trade, Rat Trick Panthers.',
    modder: 'MileHighMod',
    fileName: 'NHL95_Season_1995-96.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-1994-95',
    year: 1994,
    seasonLabel: '1994-95 NHL Season (Vanilla NHL95 Canonical)',
    era: 'golden-90s',
    eraLabel: '1990s Golden Era',
    champion: 'New Jersey Devils',
    runnerUp: 'Detroit Red Wings',
    notableTeams: ['New Jersey Devils', 'Detroit Red Wings', 'Quebec Nordiques', 'Philadelphia Flyers'],
    features: 'The canonical EA Sports NHL95 launch roster & engine tuning. The baseline of competitive 16-bit athletics.',
    modder: 'EA Sports (Official Release)',
    fileName: 'NHL95_Original_Vanilla_1994.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-1993-94',
    year: 1993,
    seasonLabel: '1993-94 NHL Season (Rangers 54-Year Curse Broken)',
    era: 'golden-90s',
    eraLabel: '1990s Golden Era',
    champion: 'New York Rangers',
    runnerUp: 'Vancouver Canucks',
    notableTeams: ['New York Rangers', 'Vancouver Canucks', 'New Jersey Devils', 'Toronto Maple Leafs'],
    features: 'Messier guarantee, Richter penalty shot save on Bure, Matteau Matteau double OT Eastern final.',
    modder: 'BroadwayBlues',
    fileName: 'NHL95_Season_1993-94_Rangers.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-1992-93',
    year: 1992,
    seasonLabel: '1992-93 NHL Season (The Greatest Season in Hockey)',
    era: 'golden-90s',
    eraLabel: '1990s Golden Era',
    champion: 'Montreal Canadiens',
    runnerUp: 'Los Angeles Kings',
    notableTeams: ['Montreal Canadiens', 'Los Angeles Kings', 'Pittsburgh Penguins', 'Toronto Maple Leafs'],
    features: 'Canadiens record 10 straight overtime playoff wins, Gretzky vs Gilmour western final, Lemieux 160-point comeback.',
    modder: 'CanadiensLegends',
    fileName: 'NHL95_Season_1992-93_Centennial.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-1991-92',
    year: 1991,
    seasonLabel: '1991-92 NHL Season (Penguins Back-to-Back)',
    era: 'golden-90s',
    eraLabel: '1990s Golden Era',
    champion: 'Pittsburgh Penguins',
    runnerUp: 'Chicago Blackhawks',
    notableTeams: ['Pittsburgh Penguins', 'Chicago Blackhawks', 'Boston Bruins', 'Detroit Red Wings'],
    features: 'Lemieux, Jagr, Francis, Stevens powerhouse, Badger Bob Johnson tribute season.',
    modder: 'PensEra',
    fileName: 'NHL95_Season_1991-92.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-1990-91',
    year: 1990,
    seasonLabel: '1990-91 NHL Season (Lemieux First Cup)',
    era: 'golden-90s',
    eraLabel: '1990s Golden Era',
    champion: 'Pittsburgh Penguins',
    runnerUp: 'Minnesota North Stars',
    notableTeams: ['Pittsburgh Penguins', 'Minnesota North Stars', 'Boston Bruins', 'Edmonton Oilers'],
    features: 'Lemieux iconic deuce-split goal against North Stars, Cinderella North Stars run, Brett Hull 86 goals.',
    modder: 'RetroNHL',
    fileName: 'NHL95_Season_1990-91.bin',
    fileSize: '2.0 MB'
  },

  // --- 1980s DYNASTY ERA ---
  {
    id: 'nhl-1988-89',
    year: 1988,
    seasonLabel: '1988-89 NHL Season (Calgary Flames Only Cup)',
    era: 'dynasties-80s',
    eraLabel: '1980s Dynasty Era',
    champion: 'Calgary Flames',
    runnerUp: 'Montreal Canadiens',
    notableTeams: ['Calgary Flames', 'Montreal Canadiens', 'Pittsburgh Penguins', 'Los Angeles Kings'],
    features: 'Lanny McDonald fairy tale farewell, MacInnis slapshot velocity Conn Smythe, Gretzky Kings debut season.',
    modder: 'Saddledome95',
    fileName: 'NHL95_Season_1988-89_Flames.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-1987-88',
    year: 1987,
    seasonLabel: '1987-88 NHL Season (Oilers Power Outage Final)',
    era: 'dynasties-80s',
    eraLabel: '1980s Dynasty Era',
    champion: 'Edmonton Oilers',
    runnerUp: 'Boston Bruins',
    notableTeams: ['Edmonton Oilers', 'Boston Bruins', 'Detroit Red Wings', 'Montreal Canadiens'],
    features: 'Gretzky final season in Edmonton, Boston Garden fog game and power blackout.',
    modder: 'OilerDynasty',
    fileName: 'NHL95_Season_1987-88.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-1986-87',
    year: 1986,
    seasonLabel: '1986-87 NHL Season (Epic 7-Game Oilers vs Flyers)',
    era: 'dynasties-80s',
    eraLabel: '1980s Dynasty Era',
    champion: 'Edmonton Oilers',
    runnerUp: 'Philadelphia Flyers',
    notableTeams: ['Edmonton Oilers', 'Philadelphia Flyers', 'Montreal Canadiens', 'Detroit Red Wings'],
    features: 'Ron Hextall Conn Smythe losing goalie, high-octane 80s run-and-gun scoring pace.',
    modder: 'GretzkyEraMods',
    fileName: 'NHL95_Season_1986-87.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-1984-85',
    year: 1984,
    seasonLabel: '1984-85 NHL Season (Peak 80s Firewagon Hockey)',
    era: 'dynasties-80s',
    eraLabel: '1980s Dynasty Era',
    champion: 'Edmonton Oilers',
    runnerUp: 'Philadelphia Flyers',
    notableTeams: ['Edmonton Oilers (400+ goals)', 'Philadelphia Flyers', 'Chicago Black Hawks', 'Quebec Nordiques'],
    features: 'Wayne Gretzky 208-point season, Jari Kurri 71 goals, high-event offense.',
    modder: 'Firewagon95',
    fileName: 'NHL95_Season_1984-85_Firewagon.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-1983-84',
    year: 1983,
    seasonLabel: '1983-84 NHL Season (Oilers Dethrone Islanders)',
    era: 'dynasties-80s',
    eraLabel: '1980s Dynasty Era',
    champion: 'Edmonton Oilers',
    runnerUp: 'New York Islanders',
    notableTeams: ['Edmonton Oilers', 'New York Islanders', 'Minnesota North Stars', 'Montreal Canadiens'],
    features: 'Passing of the torch from Islanders 4-cup dynasty to Oilers 5-cup dynasty.',
    modder: 'DynastyPuck',
    fileName: 'NHL95_Season_1983-84.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-1981-82',
    year: 1981,
    seasonLabel: '1981-82 NHL Season (Islanders Drive For 4 & Gretzky 92 Goals)',
    era: 'dynasties-80s',
    eraLabel: '1980s Dynasty Era',
    champion: 'New York Islanders',
    runnerUp: 'Vancouver Canucks',
    notableTeams: ['New York Islanders', 'Vancouver Canucks', 'Edmonton Oilers', 'Boston Bruins'],
    features: 'Bossy, Trottier, Potvin, Smith dynasty. Gretzky breaks record with 92 goals in 80 games.',
    modder: 'LongIslandHockey',
    fileName: 'NHL95_Season_1981-82.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-1979-80',
    year: 1979,
    seasonLabel: '1979-80 NHL Season (WHA Merger & First Isles Cup)',
    era: 'dynasties-80s',
    eraLabel: '1980s Dynasty Era',
    champion: 'New York Islanders',
    runnerUp: 'Philadelphia Flyers (35-game streak)',
    notableTeams: ['New York Islanders', 'Philadelphia Flyers', 'Edmonton Oilers (WHA)', 'Hartford Whalers (Gordie Howe)'],
    features: 'Gordie Howe final season at age 52, 4 WHA franchises debut (Oilers, Whalers, Jets, Nordiques).',
    modder: 'WHA_Vault',
    fileName: 'NHL95_Season_1979-80_WHAMerger.bin',
    fileSize: '2.0 MB'
  },

  // --- EXPANSION & 1970s ERA ---
  {
    id: 'nhl-1976-77',
    year: 1976,
    seasonLabel: '1976-77 NHL Season (The Greatest Montreal Team)',
    era: 'expansion-70s',
    eraLabel: 'Expansion & 1970s Era',
    champion: 'Montreal Canadiens',
    runnerUp: 'Boston Bruins',
    notableTeams: ['Montreal Canadiens (132 points, 8 losses)', 'Boston Bruins', 'Philadelphia Flyers'],
    features: 'Scotty Bowman Canadiens 60-8-12 regular season, Guy Lafleur Art Ross, Ken Dryden wall in net.',
    modder: 'ForumLegends',
    fileName: 'NHL95_Season_1976-77_Canadiens.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-1974-75',
    year: 1974,
    seasonLabel: '1974-75 NHL Season (Broad Street Bullies Repeat)',
    era: 'expansion-70s',
    eraLabel: 'Expansion & 1970s Era',
    champion: 'Philadelphia Flyers',
    runnerUp: 'Buffalo Sabres',
    notableTeams: ['Philadelphia Flyers', 'Buffalo Sabres (French Connection)', 'Montreal Canadiens'],
    features: 'Bernie Parent Conn Smythe, Bobby Clarke, Dave Schultz heavy checking engine physics.',
    modder: 'BroadStreet95',
    fileName: 'NHL95_Season_1974-75_Bullies.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-1971-72',
    year: 1971,
    seasonLabel: '1971-72 NHL Season & Summit Series Special',
    era: 'expansion-70s',
    eraLabel: 'Expansion & 1970s Era',
    champion: 'Boston Bruins',
    runnerUp: 'New York Rangers',
    notableTeams: ['Boston Bruins', 'New York Rangers', 'Team Canada 72', 'Soviet Red Army'],
    features: 'Bobby Orr peak mobility ratings, Phil Esposito 66 goals, plus bonus Team Canada vs USSR summit rosters.',
    modder: 'Summit72Project',
    fileName: 'NHL95_Season_1971-72_SummitSeries.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-1969-70',
    year: 1969,
    seasonLabel: '1969-70 NHL Season (Bobby Orr Flying Goal)',
    era: 'expansion-70s',
    eraLabel: 'Expansion & 1970s Era',
    champion: 'Boston Bruins',
    runnerUp: 'St. Louis Blues',
    notableTeams: ['Boston Bruins', 'St. Louis Blues', 'Chicago Black Hawks', 'Detroit Red Wings'],
    features: 'Bobby Orr historic MVP/Norris/Art Ross/Conn Smythe clean sweep, vintage Garden ice.',
    modder: 'BigBadBruins',
    fileName: 'NHL95_Season_1969-70_OrrFly.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-1967-68',
    year: 1967,
    seasonLabel: '1967-68 NHL Season (The Great Expansion 12 Teams)',
    era: 'expansion-70s',
    eraLabel: 'Expansion & 1970s Era',
    champion: 'Montreal Canadiens',
    runnerUp: 'St. Louis Blues',
    notableTeams: ['Montreal Canadiens', 'St. Louis Blues', 'Philadelphia Flyers', 'LA Kings'],
    features: 'The original 1967 Expansion Six join the league (Flyers, Blues, Kings, Seals, Penguins, North Stars).',
    modder: 'RetroExpansionMod',
    fileName: 'NHL95_Season_1967-68_Expansion.bin',
    fileSize: '2.0 MB'
  },

  // --- ORIGINAL SIX ERA (1942 - 1967) ---
  {
    id: 'nhl-1966-67',
    year: 1966,
    seasonLabel: '1966-67 NHL Season (Final Original Six Stanley Cup)',
    era: 'original-six',
    eraLabel: 'Original Six Era (1942-1967)',
    champion: 'Toronto Maple Leafs',
    runnerUp: 'Montreal Canadiens',
    notableTeams: ['Toronto Maple Leafs', 'Montreal Canadiens', 'Chicago Black Hawks', 'New York Rangers'],
    features: 'The last Stanley Cup champion of the Original Six era before the 1967 expansion.',
    modder: 'VintageO6',
    fileName: 'NHL95_Season_1966-67_LeafsCup.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-1960-61',
    year: 1960,
    seasonLabel: '1960-61 NHL Season (Chicago Golden Jet)',
    era: 'original-six',
    eraLabel: 'Original Six Era (1942-1967)',
    champion: 'Chicago Black Hawks',
    runnerUp: 'Detroit Red Wings',
    notableTeams: ['Chicago Black Hawks', 'Detroit Red Wings', 'Montreal Canadiens', 'Toronto Maple Leafs'],
    features: 'Bobby Hull, Stan Mikita, and Glenn Hall bring Chicago its first Cup in 23 years.',
    modder: 'StadiumPuck',
    fileName: 'NHL95_Season_1960-61.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-1955-56',
    year: 1955,
    seasonLabel: '1955-56 NHL Season (Canadiens Dynasty Begins)',
    era: 'original-six',
    eraLabel: 'Original Six Era (1942-1967)',
    champion: 'Montreal Canadiens',
    runnerUp: 'Detroit Red Wings',
    notableTeams: ['Montreal Canadiens (1st of 5 straight)', 'Detroit Red Wings', 'New York Rangers'],
    features: 'Maurice Rocket Richard, Jean Beliveau, Jacques Plante start the legendary 5-Cup dynasty.',
    modder: 'O6Heritage',
    fileName: 'NHL95_Season_1955-56_Rocket.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-1950-51',
    year: 1950,
    seasonLabel: '1950-51 NHL Season (Bill Barilko Overtime Winner)',
    era: 'original-six',
    eraLabel: 'Original Six Era (1942-1967)',
    champion: 'Toronto Maple Leafs',
    runnerUp: 'Montreal Canadiens',
    notableTeams: ['Toronto Maple Leafs', 'Montreal Canadiens', 'Detroit Red Wings'],
    features: 'Every game in the Finals went to overtime. Bill Barilko legendary final goal.',
    modder: 'VintageHockey',
    fileName: 'NHL95_Season_1950-51_Barilko.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-1944-45',
    year: 1944,
    seasonLabel: '1944-45 NHL Season (Rocket Richard 50 Goals in 50 Games)',
    era: 'original-six',
    eraLabel: 'Original Six Era (1942-1967)',
    champion: 'Toronto Maple Leafs',
    runnerUp: 'Detroit Red Wings',
    notableTeams: ['Montreal Canadiens (Punch Line)', 'Toronto Maple Leafs', 'Detroit Red Wings'],
    features: 'Maurice Richard historic first 50-in-50 season, Lach, Blake, Richard Punch Line.',
    modder: 'PreWarO6',
    fileName: 'NHL95_Season_1944-45_Rocket50.bin',
    fileSize: '2.0 MB'
  },

  // --- EARLY & PRE-WAR ERA (1909 - 1941) ---
  {
    id: 'nhl-1939-40',
    year: 1939,
    seasonLabel: '1939-40 NHL Season (Rangers 1940 Cup)',
    era: 'pre-war',
    eraLabel: 'Early & Pre-War (1909-1941)',
    champion: 'New York Rangers',
    runnerUp: 'Toronto Maple Leafs',
    notableTeams: ['New York Rangers', 'Toronto Maple Leafs', 'Boston Bruins'],
    features: 'The famous 1940 Cup winning squad that initiated the 54-year curse until 1994.',
    modder: 'PioneerPuck',
    fileName: 'NHL95_Season_1939-40_Rangers.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-1926-27',
    year: 1926,
    seasonLabel: '1926-27 NHL Season (NHL Exclusively Competes For Stanley Cup)',
    era: 'pre-war',
    eraLabel: 'Early & Pre-War (1909-1941)',
    champion: 'Ottawa Senators',
    runnerUp: 'Boston Bruins',
    notableTeams: ['Ottawa Senators', 'Boston Bruins', 'Montreal Maroons', 'NY Rangers'],
    features: 'First season Stanley Cup becomes the exclusive championship trophy of the NHL.',
    modder: 'PioneerPuck',
    fileName: 'NHL95_Season_1926-27.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-1917-18',
    year: 1917,
    seasonLabel: '1917-18 Inaugural NHL Season',
    era: 'pre-war',
    eraLabel: 'Early & Pre-War (1909-1941)',
    champion: 'Toronto Arenas',
    runnerUp: 'Vancouver Millionaires (PCHA)',
    notableTeams: ['Toronto Arenas', 'Montreal Canadiens', 'Ottawa Senators', 'Montreal Wanderers'],
    features: 'The inaugural 4-franchise birth of the National Hockey League, Joe Malone 44 goals in 20 games.',
    modder: 'BirthOfHockey95',
    fileName: 'NHL95_Inaugural_1917-18.bin',
    fileSize: '2.0 MB'
  },
  {
    id: 'nhl-1909-10',
    year: 1909,
    seasonLabel: '1909-10 National Hockey Association (NHA Genesis)',
    era: 'pre-war',
    eraLabel: 'Early & Pre-War (1909-1941)',
    champion: 'Montreal Wanderers',
    runnerUp: 'Ottawa Senators',
    notableTeams: ['Montreal Wanderers', 'Ottawa Senators', 'Cobalt Silver Kings', 'Haileybury Comets'],
    features: 'The founding grandfather league of the NHL. 7-man hockey (rover position included!), wooden stick physics, vintage outdoor rinks.',
    modder: 'OriginOfPuck',
    fileName: 'NHL95_NHA_Genesis_1909-10.bin',
    fileSize: '2.0 MB'
  }
];

// ============================================================================
// 3. MISC ROMS & OTHER GAMES (CROSS-SPORT, ARCADE, POP CULTURE)
// Themed with the synthwave / crossover collage artwork
// ============================================================================
export const MISC_ROMS: MiscRom[] = [
  {
    id: 'misc-nba-jam-hockey',
    title: 'NBA On Ice: Jam Tournament Edition',
    category: 'Cross-Sport',
    platform: 'Sega Genesis / Mega Drive',
    fileName: 'NBA_On_Ice_Genesis_JamMod.bin',
    fileSize: '2.0 MB',
    releaseYear: '2024',
    author: 'RetroMashup Studios',
    description: 'What if Michael Jordan, Shaq, Barkley, and Pippen played professional hockey? Features on-fire turbo sprint mechanics, shatterable glass backboards on slapshots, and arcade dunk animations after scoring.',
    imageUrl: 'NBA On Ice.png',
    coverImage: '/images/roms-hero-banner.jpg',
    tags: ['NBA', 'Michael Jordan', 'On Fire', 'Arcade']
  },
  {
    id: 'misc-street-fighter-puck',
    title: 'Street Fighter II: World Warrior Hockey',
    category: 'Arcade Mashup',
    platform: 'Sega Genesis',
    fileName: 'StreetFighter_Hockey_Turbo.bin',
    fileSize: '2.0 MB',
    releaseYear: '2023',
    author: 'CapcomPuck',
    description: 'Ryu, Ken, Guile, Chun-Li, and Zangief take to the ice! Custom sound effects (Hadouken on slapshots, Sonic Boom one-timers), custom fight engine replacement for bench-clearing brawls.',
    imageUrl: 'Street Fighter II.png',
    coverImage: '/images/roms-hero-banner.jpg',
    tags: ['Street Fighter', 'Fighting', 'Capcom', 'Custom Sounds']
  },
  {
    id: 'misc-genesis-allstars',
    title: 'Sega 16-Bit All-Stars Hockey Brawl',
    category: 'Pop Culture',
    platform: 'Sega Genesis',
    fileName: 'Sega_AllStars_Hockey_Brawl.bin',
    fileSize: '2.0 MB',
    releaseYear: '2024',
    author: 'BlastProcessing',
    description: 'Sonic the Hedgehog, ToeJam & Earl, Axel Stone (Streets of Rage), Shinobi, and Vectorman battle it out in a neon retro synthwave arena.',
    imageUrl: 'Sega 16-Bit All-Stars Hockey Brawl.png',
    coverImage: '/images/roms-hero-banner.jpg',
    tags: ['Sonic', 'ToeJam & Earl', 'Streets of Rage', 'Synthwave']
  },
  {
    id: 'misc-iihf-world',
    title: 'IIHF World Hockey Championship Mega Pack',
    category: 'International',
    platform: 'Sega Genesis',
    fileName: 'NHL95_IIHF_WorldChampionship_32Teams.bin',
    fileSize: '2.0 MB',
    releaseYear: '2024',
    author: 'Euro95 Federation',
    description: 'Comprehensive 32-nation international tournament ROM featuring Olympic ice dimensions, European team sweaters, IIHF hybrid icing rules, and international shootout format.',
    imageUrl: 'IIHF World Hockey Championship.png',
    coverImage: '/images/roms-hero-banner.jpg',
    tags: ['International', 'Olympics', 'Team Canada', 'USA', 'Sweden', 'Finland']
  },
  {
    id: 'misc-ncaa-frozen-four',
    title: 'NCAA Frozen Four College Hockey Edition',
    category: 'College',
    platform: 'Sega Genesis',
    fileName: 'NCAA_FrozenFour_CollegeHockey95.bin',
    fileSize: '2.0 MB',
    releaseYear: '2023',
    author: 'CampusModder',
    description: 'Features Michigan, Boston College, Minnesota, North Dakota, Boston University, Denver, and classic college rivalries with authentic marching band fight songs.',
    imageUrl: 'NCAA Frozen Four College Hockey.png',
    coverImage: '/images/roms-hero-banner.jpg',
    tags: ['NCAA', 'College', 'Fight Songs', 'Rivalries']
  },
  {
    id: 'misc-mortal-kombat-ice',
    title: 'Mortal Kombat: Ice Kampground (Sub-Zero Cup)',
    category: 'Arcade Mashup',
    platform: 'Sega Genesis',
    fileName: 'MortalKombat_Ice_Kamp.bin',
    fileSize: '2.0 MB',
    releaseYear: '2024',
    author: 'Midway95',
    description: 'Scorpion, Sub-Zero, Raiden, and Liu Kang swap martial arts for hockey sticks. High-velocity freeze pucks, arena stage hazards, and gory checking animations.',
    imageUrl: 'Mortal Kombat Ice Kampground.png',
    coverImage: '/images/roms-hero-banner.jpg',
    tags: ['Mortal Kombat', 'Sub-Zero', 'Scorpion', 'Arcade']
  }
];

// ============================================================================
// 4. UTILITIES, EMULATOR STARTER PACKS & BROADCAST MEDIA
// ============================================================================
export const UTILITY_PACKS_DATA: UtilityPack[] = [
  {
    id: 'retroarch-starter',
    title: 'RetroArch NHL95 Pre-Configured Starter Pack v2.4',
    category: 'Emulator',
    fileName: 'RetroArch_NHL95_StarterKit_v2.4.zip',
    fileSize: '48.5 MB',
    imageUrl: 'RetroArch Starter Pack.png',
    desc: 'Turnkey competitive package including optimized Genesis Plus GX core, sub-millisecond audio latency setup, Netplay hotkeys, and pre-mapped 6-button controller profiles.'
  },
  {
    id: 'obs-stream-overlays',
    title: 'OBS 16:9 Stream Overlays & Scorebug Graphics',
    category: 'Broadcast',
    fileName: 'NHL95_OBS_StreamOverlays_Pack.zip',
    fileSize: '18.2 MB',
    imageUrl: 'OBS Stream Overlays.png',
    desc: 'High-resolution pillarbox graphic borders for retro 4:3 Genesis games on modern 16:9 monitors, lower-third starting goalies comparison, and intermission period summaries.'
  },
  {
    id: 'arena-audio-sfx',
    title: 'Authentic 90s Arena Sound & Organ Mod Pack',
    category: 'Audio',
    fileName: 'NHL95_Audio_ArenaMusic_Mod.zip',
    fileSize: '6.4 MB',
    imageUrl: 'Arena Sound Mod.png',
    desc: 'Digitally restored crowd ambiance, vintage arena air-horns, synthesizer organ charge melodies, and custom whistle sound effects.'
  },
  {
    id: 'nhl95-rom-editor',
    title: 'NHL95 Suite PC Attribute & Palette Editor',
    category: 'Tool',
    fileName: 'NHL95_Editor_Suite_v3.1.zip',
    fileSize: '12.8 MB',
    imageUrl: 'NHL95 Suite Editor.png',
    desc: 'Windows utility for modifying player attributes, lines, jersey colors, center ice graphics, and team rosters on any Genesis NHL95 binary ROM.'
  }
];
