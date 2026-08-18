import { SeasonConfig, TeamPositionCount } from './types';

export const DEFAULT_TEAM_CODES: Record<number, string> = {
  0: 'AUT', 1: 'BAR', 2: 'BAY', 3: 'BFC', 4: 'DHG', 5: 'GRH',
  6: 'HAM', 7: 'HIG', 8: 'ING', 9: 'ITA', 10: 'KAR', 11: 'MHA',
  12: 'MHT', 13: 'MGG', 14: 'NBK', 15: 'OCW', 16: 'PIT', 17: 'PRO',
  18: 'RIC', 19: 'ROC', 20: 'SHS', 21: 'SVF', 22: 'SUM', 23: 'TAI',
  24: 'TEG', 25: 'TBP', 26: 'VHV', 27: 'WDY', 28: 'ETI'
};

export const W_LEAGUE_POSITION_COUNTS: Record<string, TeamPositionCount> = {
  AUT: { goalies: 2, forwards: 5, defensemen: 3 },
  BAR: { goalies: 2, forwards: 5, defensemen: 3 },
  BAY: { goalies: 2, forwards: 5, defensemen: 3 },
  BFC: { goalies: 2, forwards: 5, defensemen: 3 },
  DHG: { goalies: 2, forwards: 5, defensemen: 3 },
  GRH: { goalies: 2, forwards: 5, defensemen: 3 },
  HAM: { goalies: 2, forwards: 5, defensemen: 3 },
  HIG: { goalies: 2, forwards: 5, defensemen: 3 },
  ING: { goalies: 2, forwards: 5, defensemen: 3 },
  ITA: { goalies: 2, forwards: 5, defensemen: 3 },
  KAR: { goalies: 2, forwards: 5, defensemen: 3 },
  MHA: { goalies: 2, forwards: 5, defensemen: 3 },
  MHT: { goalies: 2, forwards: 5, defensemen: 3 },
  MGG: { goalies: 2, forwards: 5, defensemen: 3 },
  NBK: { goalies: 2, forwards: 5, defensemen: 3 },
  OCW: { goalies: 2, forwards: 5, defensemen: 3 },
  PIT: { goalies: 2, forwards: 5, defensemen: 3 },
  PRO: { goalies: 2, forwards: 5, defensemen: 3 },
  RIC: { goalies: 2, forwards: 5, defensemen: 3 },
  ROC: { goalies: 2, forwards: 5, defensemen: 3 },
  SHS: { goalies: 2, forwards: 5, defensemen: 3 },
  SVF: { goalies: 2, forwards: 5, defensemen: 3 },
  SUM: { goalies: 2, forwards: 5, defensemen: 3 },
  TAI: { goalies: 2, forwards: 5, defensemen: 3 },
  TEG: { goalies: 2, forwards: 5, defensemen: 3 },
  TBP: { goalies: 2, forwards: 5, defensemen: 3 },
  VHV: { goalies: 2, forwards: 5, defensemen: 3 },
  WDY: { goalies: 2, forwards: 5, defensemen: 3 },
  ETI: { goalies: 2, forwards: 5, defensemen: 3 }
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
  AUT: [
    'Joe Pavelski', 'Martin St. Louis', 'Ryan Johansen', 'Brad Richards', 'Wayne Simmonds',
    'Mark Giordano', 'Dustin Byfuglien', 'Sergei Gonchar'
  ],
  BAR: [
    'Steve Sullivan', 'Gabriel Landeskog', 'Filip Forsberg', 'Artem Anisimov', 'James Neal',
    'Trevor Daley', 'Joni Pitkanen', 'Dougie Hamilton'
  ],
  BAY: [
    'Vincent Lecavalier', 'Jonathan Toews', 'Jason Spezza', 'Tyler Johnson', 'Zach Parise',
    'Tyler Myers', 'Victor Hedman', 'Mike Green'
  ],
  BFC: [
    'Nail Yakupov', 'Olli Jokinen', 'Sidney Crosby', 'Tyler Seguin', 'Brandon Saad',
    'Zdeno Chara', 'Kris Letang', 'Nick Leddy'
  ],
  DHG: [
    'Joffrey Lupul', 'Alex Tanguay', 'Ondrej Palat', 'David Desharnais', 'Chris Kreider',
    'Eric Brewer', 'Cory Sarich', 'Jake Muzzin'
  ],
  GRH: [
    'Paul Stastny', 'Jonathan Huberdeau', 'P.A. Parenteau', 'Alexander Semin', 'Brandon Dubinsky',
    'Dan Boyle', 'Jack Johnson', 'Radko Gudas'
  ],
  HAM: [
    'Vladimir Tarasenko', 'Jaden Schwartz', 'Daniel Briere', 'David Backes', 'Troy Brouwer',
    'Kimmo Timonen', 'Alex Goligoski', 'Jack Hillen'
  ],
  HIG: [
    'Corey Perry', 'Sean Couturier', 'Carl Hagelin', 'Mark Stone', 'Cam Atkinson',
    'Brent Seabrook', 'Niklas Hjalmarsson', 'Ryan Ellis'
  ],
  ING: [
    'Teemu Selanne', 'Patrick Kane', 'Dainius Zubrus', 'Jaromir Jagr', 'Jamie Langenbrunner',
    'Drew Doughty', 'Rostislav Klesla', 'Erik Karlsson'
  ],
  ITA: [
    'Michael Grabner', 'Gustav Nyquist', 'Mats Zuccarello', 'Darren Helm', 'Andrew Cogliano',
    'Tyson Barrie', 'T.J. Brodie', 'Braydon Coburn'
  ],
  KAR: [
    'Evgeni Malkin', 'Alex Ovechkin', 'Brendan Gallagher', 'Blake Wheeler', 'Pavel Datsyuk',
    'Oliver Ekman-Larsson', 'John Carlson', 'Brent Burns'
  ],
  MHA: [
    'Alexander Steen', 'Jordan Staal', 'Ryan Kesler', 'Mike Richards', 'Ryan Smyth',
    'Roman Hamrlik', 'Cody Franson', 'Ed Jovanovski'
  ],
  MHT: [
    'Phil Kessel', 'Jean-Gabriel Pageau', 'Chris Stewart', 'Marian Gaborik', 'Jeff Skinner',
    'Torey Krug', 'Justin Schultz', 'Cam Fowler'
  ],
  MGG: [
    'Jarome Iginla', 'J.T. Miller', 'Mark Scheifele', 'Patrick Marleau', 'Ryan Getzlaf',
    'Paul Martin', 'Chris Phillips', 'P.K. Subban'
  ],
  NBK: [
    'Jordan Eberle', 'Jiri Hudler', 'Ray Whitney', 'Logan Couture', 'Claude Giroux',
    'Duncan Keith', 'Ryan McDonagh', 'Roman Josi'
  ],
  OCW: [
    'John Tavares', 'T.J. Oshie', 'Alex Galchenyuk', 'David Krejci', 'Patrice Bergeron',
    'Shea Weber', 'Alex Pietrangelo', 'Keith Yandle'
  ],
  PIT: [
    'Marian Hossa', 'Mika Zibanejad', 'Brad Marchand', 'Ryan Callahan', 'Jakob Silfverberg',
    'Jordan Leopold', 'Erik Johnson', 'Tomas Kaberle'
  ],
  PRO: [
    'Milan Hejduk', 'Chris Kunitz', 'Tomas Plekanec', 'Thomas Vanek', 'James Van Riemsdyk',
    'Andrew Ference', 'Andy Greene', 'Hal Gill'
  ],
  RIC: [
    'Cory Conacher', 'Max Pacioretty', 'Jason Pominville', 'Joe Thornton', 'Kyle Okposo',
    'Derek Morris', 'Andrei Markov', 'Ryan Suter'
  ],
  ROC: [
    'Ryan Nugent-Hopkins', 'Richard Panik', 'Nathan Horton', 'Bobby Ryan', 'Valtteri Filppula',
    'Chris Pronger', 'Brian Campbell', 'Jonas Brodin'
  ],
  SHS: [
    'Beau Bennett', 'Daniel Alfredsson', 'Jamie Benn', 'Eric Staal', 'Bryan Little',
    'Marc-Edouard Vlasic', 'Justin Faulk', 'Kevin Shattenkirk'
  ],
  SVF: [
    'Evander Kane', 'Shane Doan', 'Tyler Bozak', 'Brayden Schenn', 'Anze Kopitar',
    'Jared Spurgeon', 'Zach Bogosian', 'Brayden McNabb'
  ],
  SUM: [
    'Daniel Sedin', 'Henrik Sedin', 'Jiri Tlusty', 'Derek Stepan', 'Tyler Ennis',
    'Niklas Kronwall', 'Marc Staal', 'Alec Martinez'
  ],
  TAI: [
    'Vaclav Prospal', 'Matt Frattin', 'Taylor Hall', 'Mike Fisher', 'Matt Duchene',
    'Lubomir Visnovsky', 'Tobias Enstrom', 'James Wisniewski'
  ],
  TEG: [
    'Todd Bertuzzi', 'Mikael Granlund', 'Justin Williams', 'Nazem Kadri', 'Steven Stamkos',
    'Brad Stuart', 'Matt Niskanen', 'Dion Phaneuf'
  ],
  TBP: [
    'Anders Lee', 'Rick Nash', 'Milan Lucic', 'Jeff Carter', 'Patrik Elias',
    'Anton Stralman', 'Chris Tanev', 'Alexander Edler'
  ],
  VHV: [
    'Dustin Brown', 'David Perron', 'Ryan O\'Reilly', 'Mike Ribeiro', 'Mikko Koivu',
    'Andrej Sekera', 'Willie Mitchell', 'Mark Streit'
  ],
  WDY: [
    'Kyle Turris', 'Simon Gagne', 'Andrew Ladd', 'Jakub Voracek', 'Nicklas Backstrom',
    'Mark Cundari', 'Grant Clitsome', 'Matt Carle'
  ],
  ETI: [
    'Marcus Johansson', 'Nick Bonino', 'Michal Handzus', 'Alex Chiasson', 'Matt Kassian',
    'Raphael Diaz', 'Bryce Salvador', 'Jay Rosehill'
  ]
};

export const O_LEAGUE_TEAM_CODES: Record<number, string> = {
  0: 'BOS',
  1: 'CHI',
  2: 'DTC',
  3: 'MTL',
  4: 'NYR',
  5: 'TOR'
};

export const O_LEAGUE_POSITION_COUNTS: Record<string, TeamPositionCount> = {
  BOS: { goalies: 2, forwards: 5, defensemen: 3 },
  CHI: { goalies: 2, forwards: 5, defensemen: 3 },
  DTC: { goalies: 2, forwards: 5, defensemen: 3 },
  MTL: { goalies: 2, forwards: 5, defensemen: 3 },
  NYR: { goalies: 2, forwards: 5, defensemen: 3 },
  TOR: { goalies: 2, forwards: 5, defensemen: 3 }
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
  },
  {
    seasonId: 38,
    seasonName: 'W League - Season 38 (W17)',
    leagueType: 'W',
    teamCodes: DEFAULT_TEAM_CODES,
    teamPositionCounts: W_LEAGUE_POSITION_COUNTS,
    goalies: W_LEAGUE_GOALIES,
    skaters: W_LEAGUE_SKATERS
  }
];

export function getSeasonConfig(seasonId: number | string): SeasonConfig {
  const matched = AVAILABLE_SEASONS.find(s => String(s.seasonId) === String(seasonId));
  if (matched) return matched;

  if (Number(seasonId) === 39) {
    return {
      seasonId: 39,
      seasonName: 'O League - Season 1 (O01 / Season 39)',
      leagueType: 'O',
      teamCodes: O_LEAGUE_TEAM_CODES,
      teamPositionCounts: O_LEAGUE_POSITION_COUNTS,
      goalies: O_LEAGUE_GOALIES,
      skaters: O_LEAGUE_SKATERS
    };
  }

  return {
    seasonId,
    seasonName: `Season ${seasonId}`,
    leagueType: 'W',
    teamCodes: DEFAULT_TEAM_CODES,
    teamPositionCounts: W_LEAGUE_POSITION_COUNTS,
    goalies: W_LEAGUE_GOALIES,
    skaters: W_LEAGUE_SKATERS
  };
}
