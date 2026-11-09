import React, { useState, useEffect } from 'react';

// ==========================================
// Shared presentational "retro" NHL95 boxscore screen.
// Matches the exact classic WN95HL black/green boxscore layout.
// ==========================================

export interface RetroGoalie {
  name: string;
  goals?: number;
  assists?: number;
  so?: number;
  ga: number;
  saves: number;
  shots: number;
  savePct: number;
  toi: string;
}

export interface RetroSkater {
  name: string;
  goals: number;
  assists: number;
  points: number;
  sog: number;
  checks: number;
  pim: number;
  ppp: number;
  shp: number;
  toi: string;
}

export interface RetroTeam {
  code: string;
  name: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  bannerFallbackUrls?: string[];
  score: number | string;
  goalies: RetroGoalie[];
  skaters: RetroSkater[];
}

export interface RetroPeriodScore {
  p1: number | string;
  p2: number | string;
  p3: number | string;
  ot: number | string;
  total: number | string;
}

export interface RetroGoalEvent {
  period: number | string;
  time: string;
  team: string;
  scorer: string;
  assist1?: string;
  assist2?: string;
  type?: string;
}

export interface RetroPenaltyEvent {
  period: number | string;
  time: string;
  team: string;
  player: string;
  type: string;
}

export interface RetroStatRow {
  label: string;
  away: string | number;
  home: string | number;
}

export interface RetroBoxscoreProps {
  away: RetroTeam;
  home: RetroTeam;
  periods: { away: RetroPeriodScore; home: RetroPeriodScore };
  statRows: RetroStatRow[];
  goals: RetroGoalEvent[];
  penalties: RetroPenaltyEvent[];
  leagueLogoUrl?: string;
}

const WN95HL_LEAGUE_LOGO =
  'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/WN95HL.png';
const ORIGINAL_SIX_LOGO =
  'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/Original6.png';

const ORIGINAL_SIX_CODES = new Set(['BOS', 'CHI', 'DET', 'DTC', 'MTL', 'NYR', 'TOR']);

const TEAM_BANNER_FILENAMES: Record<string, string> = {
  AUT: 'autobahn_autobahn.png', BAR: 'barrie_dolts.png', BAY: 'baytown_thunder.png',
  BFC: 'betty_ford_clinic.png', DHG: 'devin_hill_goblins.png', ETI: 'easter_island_stoneheads.png',
  GRH: 'grand_river_herons.png', HAM: 'hamilton_mustangs.png', HIG: 'highland_wolf.png',
  ING: 'inglewood_monstars.png', ITA: 'italy_ebc.png', KAR: 'karolina_kaos.png',
  MGG: 'minnesota_golden_gophers.png', MHA: 'maryhill_alumni.png', MHT: 'minhattrick_swayzes.png',
  NBK: 'north_bay_knights.png', OCW: 'orange_county_weststars.png', PIT: 'pitt_intramurals.png',
  PRO: 'providence_sea_bass.png', RIC: 'richfield_oracles.png', ROC: 'rockford_villains.png',
  SHS: 'south_hills_shindigaz.png', SUM: 'sumter_trash.png', SVF: 'sugar_valley_firebirds.png',
  TAI: 'taipei_typhoons.png', TBP: 'thunder_bay_pike.png', TEG: 'tegucigalpa_ticklepuss.png',
  VHV: 'valhalla_vikings.png', WDY: 'woodlynne_rats.png',
  BOS: 'boston_bruins.png', CHI: 'chicago_black_hawks.png', DET: 'detroit_cougars.png',
  DTC: 'detroit_cougars.png', MTL: 'montreal_canadiens.png', NYR: 'new_york_rangers.png',
  TOR: 'toronto_maple_leafs1.png'
};

const TEAM_SMALL_LOGO_URLS: Record<string, string> = {
  AUT: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/teams/Autobahn%20Autobahn%20Logo.png',
  BAR: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/teams/Barrie%20Dolts%20Logo.png',
  BAY: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/teams/Baytown%20Thunder%20Logo.png',
  BFC: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/teams/Betty%20Ford%20Clinic%20Logo.png',
  DHG: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/teams/Devin%20Hill%20Goblins%20Logo.png',
  ETI: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/teams/Easter%20Island%20Stone%20Heads%20Logo.png',
  GRH: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/teams/Grand%20River%20Herons%20Logo.png',
  HAM: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/teams/hamilton_mustangs.png',
  HIG: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/teams/Highland%20Wolf%20Logo.png',
  ING: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/teams/Inglewood%20Monstars%20Logo%20S3.png',
  ITA: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/teams/Italy%20EBC%20Logo%20S12.png',
  KAR: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/teams/Karolina%20Kaos%20Logo.png',
  MGG: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/teams/Minnesota%20Golden%20Gophers%20Logo.png',
  MHA: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/teams/Maryhill%20Alumni%20Logo.png',
  MHT: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/teams/Minhattrick%20Swayzes%20Logo%20S13.png',
  NBK: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/teams/North%20Bay%20Knights%20Logo.png',
  OCW: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/teams/Orange%20County%20Weststars%20Logo.png',
  PIT: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/teams/Pitt%20Intramurals%20Logo.png',
  PRO: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/teams/Providence%20Sea%20Bass%20Logo.png',
  RIC: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/teams/Richfield%20Oracles%20Logo.png',
  ROC: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/teams/Rockford%20Villains%20Logo.png',
  SHS: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/teams/South%20Hills%20Shindigaz%20Logo.png',
  SUM: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/teams/Sumter%20Trash%20Logo.png',
  SVF: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/teams/Sugar%20Valley%20Firebirds%20Logo%20S3.png',
  TAI: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/teams/Taipei%20Typhoons%20Logo.png',
  TBP: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/teams/Thunder%20Bay%20Pike%20Logo.png',
  TEG: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/teams/Tegucigalpa%20Ticklepuss%20Logo.png',
  VHV: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/teams/Valhalla%20Vikings%20Logo.png',
  WDY: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/teams/Woodlynne%20Rats%20Logo.png',
  BOS: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/nhl%20logo/boston_bruins%201927.png',
  CHI: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/nhl%20logo/chicago_black_hawks%201927.png',
  DET: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/nhl%20logo/detroit_cougars%201927.png',
  DTC: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/nhl%20logo/detroit_cougars%201927.png',
  MTL: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/nhl%20logo/montreal_canadiens%201927.png',
  NYR: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/nhl%20logo/new_york_rangers%201927.png',
  TOR: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/nhl%20logo/toronto_maple_leafs%201927.png'
};

export function resolveBannerCandidates(team: RetroTeam): string[] {
  const candidates: string[] = [];
  if (team.bannerUrl) candidates.push(team.bannerUrl);
  if (team.bannerFallbackUrls && team.bannerFallbackUrls.length > 0) {
    candidates.push(...team.bannerFallbackUrls);
  }
  const code = (team.code || '').trim().toUpperCase();
  if (code) {
    const isO6 = ORIGINAL_SIX_CODES.has(code);
    const knownFile = TEAM_BANNER_FILENAMES[code];
    if (knownFile) {
      const encKnown = encodeURIComponent(knownFile);
      candidates.push(
        isO6
          ? `https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/nhl%20banners/${encKnown}`
          : `https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/banners/${encKnown}`
      );
    }
    const encoded = encodeURIComponent(`${code}.png`);
    if (isO6) {
      candidates.push(
        `https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/nhl%20banners/${encoded}`,
        `https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/banners/${encoded}`
      );
    } else {
      candidates.push(
        `https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/banners/${encoded}`,
        `https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/nhl%20banners/${encoded}`
      );
    }
  }
  if (team.logoUrl) candidates.push(team.logoUrl);
  return Array.from(new Set(candidates.filter(Boolean)));
}

export function resolveSmallLogoUrl(team: RetroTeam): string | null {
  if (team.logoUrl) return team.logoUrl.trim();
  const code = (team.code || '').trim().toUpperCase();
  if (!code) return null;
  if (TEAM_SMALL_LOGO_URLS[code]) return TEAM_SMALL_LOGO_URLS[code];
  return `https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/logos/${encodeURIComponent(code)}.png`;
}

export function formatSavePct(pct: number): string {
  if (!isFinite(pct) || pct <= 0) return '.000';
  if (pct >= 1) return '1.000';
  return `.${Math.round(pct * 1000).toString().padStart(3, '0')}`;
}

function TeamBanner({ team }: { team: RetroTeam }) {
  const bannerUrls = resolveBannerCandidates(team);
  const [urlIdx, setUrlIdx] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setUrlIdx(0);
    setFailed(false);
  }, [team.code, team.bannerUrl, team.logoUrl]);

  const activeUrl = !failed && bannerUrls[urlIdx] ? bannerUrls[urlIdx] : null;

  return (
    <div className="flex items-center bg-black pb-2 mb-1.5">
      <div className="w-[215px] shrink-0 flex items-center">
        {activeUrl ? (
          <img
            src={activeUrl}
            alt={team.name}
            className="h-11 w-[205px] object-contain object-left"
            onError={() => {
              if (urlIdx + 1 < bannerUrls.length) {
                setUrlIdx(urlIdx + 1);
              } else {
                setFailed(true);
              }
            }}
          />
        ) : (
          <div className="bg-neutral-900 border border-white/50 px-3 py-1.5 text-white font-black text-xs uppercase tracking-wider">
            {team.name}
          </div>
        )}
      </div>
      <div className="flex-1 flex justify-center pr-6">
        <span className="font-sans font-normal text-5xl leading-none text-[#00ff00]">
          {team.score}
        </span>
      </div>
    </div>
  );
}

function TeamTables({ team }: { team: RetroTeam }) {
  return (
    <div>
      <TeamBanner team={team} />

      <div className="mb-3.5">
        <table className="w-full text-[12px] leading-[1.35] text-left border-collapse">
          <thead>
            <tr className="text-white border-b border-white/80">
              <th className="font-normal py-0.5 w-[140px]">Goalies</th>
              <th className="font-normal text-center w-6">G</th>
              <th className="font-normal text-center w-6">A</th>
              <th className="font-normal text-center w-8">PTS</th>
              <th className="font-normal text-center w-7">SO</th>
              <th className="font-normal text-center w-7">GA</th>
              <th className="font-normal text-center w-7">SV</th>
              <th className="font-normal text-center w-7">SH</th>
              <th className="font-normal text-center w-12">SV%</th>
              <th className="font-normal text-right w-12">TOI</th>
            </tr>
          </thead>
          <tbody className="text-white tabular-nums">
            {team.goalies.map((g, i) => {
              const shots = Number(g.shots || 0);
              const saves = Number(g.saves || 0);
              const ga = Number(g.ga || 0);
              const computedSo = ga === 0 && (shots > 0 || saves > 0) ? 1 : 0;
              return (
                <tr key={i} className="hover:bg-white/5">
                  <td className="truncate max-w-[140px] pr-1">{g.name}</td>
                  <td className="text-center">{g.goals || 0}</td>
                  <td className="text-center">{g.assists || 0}</td>
                  <td className="text-center">{(g.goals || 0) + (g.assists || 0)}</td>
                  <td className="text-center">{computedSo}</td>
                  <td className="text-center">{ga}</td>
                  <td className="text-center">{saves}</td>
                  <td className="text-center">{shots}</td>
                  <td className="text-center">{formatSavePct(g.savePct)}</td>
                  <td className="text-right">{g.toi}</td>
                </tr>
              );
            })}
            {team.goalies.length === 0 && (
              <tr>
                <td colSpan={10} className="text-slate-500 py-1 italic">No goalie stats logged.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <table className="w-full text-[12px] leading-[1.35] text-left border-collapse">
          <thead>
            <tr className="text-white border-b border-white/80">
              <th className="font-normal py-0.5 w-[140px]">Players</th>
              <th className="font-normal text-center w-6">G</th>
              <th className="font-normal text-center w-6">A</th>
              <th className="font-normal text-center w-8">PTS</th>
              <th className="font-normal text-center w-8">SOG</th>
              <th className="font-normal text-center w-8">CHK</th>
              <th className="font-normal text-center w-8">PIM</th>
              <th className="font-normal text-center w-8">PPP</th>
              <th className="font-normal text-center w-8">SHP</th>
              <th className="font-normal text-right w-12">TOI</th>
            </tr>
          </thead>
          <tbody className="text-white tabular-nums">
            {team.skaters.map((s, i) => (
              <tr key={i} className="hover:bg-white/5">
                <td className="truncate max-w-[140px] pr-1">{s.name}</td>
                <td className="text-center">{s.goals}</td>
                <td className="text-center">{s.assists}</td>
                <td className="text-center">{s.points}</td>
                <td className="text-center">{s.sog}</td>
                <td className="text-center">{s.checks}</td>
                <td className="text-center">{s.pim}</td>
                <td className="text-center">{s.ppp}</td>
                <td className="text-center">{s.shp}</td>
                <td className="text-right">{s.toi}</td>
              </tr>
            ))}
            {team.skaters.length === 0 && (
              <tr>
                <td colSpan={10} className="text-slate-500 py-1 italic">No skater stats logged.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function RetroBoxscore({
  away,
  home,
  periods,
  statRows,
  goals,
  penalties,
  leagueLogoUrl,
}: RetroBoxscoreProps) {
  const isO6 =
    ORIGINAL_SIX_CODES.has((away.code || '').toUpperCase()) ||
    ORIGINAL_SIX_CODES.has((home.code || '').toUpperCase());
  const defaultLogo = isO6 ? ORIGINAL_SIX_LOGO : WN95HL_LEAGUE_LOGO;
  const awaySmallLogo = resolveSmallLogoUrl(away);
  const homeSmallLogo = resolveSmallLogoUrl(home);

  return (
    <div className="bg-black text-white p-4 font-sans select-none border-2 border-neutral-900 shadow-2xl overflow-x-auto">
      <div className="min-w-[980px] grid grid-cols-12 gap-x-5 items-start text-[12px]">
        {/* LEFT COLUMN (5 cols): Away & Home Banners, Goalies, and Players */}
        <div className="col-span-5 space-y-5">
          <TeamTables team={away} />
          <TeamTables team={home} />
        </div>

        {/* CENTER COLUMN (2 cols): League Circle Logo, Period Grid Table, Borderless Games Stats */}
        <div className="col-span-2 flex flex-col items-center pt-1">
          {/* Circular League Emblem */}
          <div className="mb-5 flex justify-center">
            <div className="w-24 h-24 rounded-full bg-white p-1 flex items-center justify-center border-2 border-[#00a2e8] shadow-md overflow-hidden">
              <img
                src={leagueLogoUrl || defaultLogo}
                alt="League"
                className="w-20 h-20 object-contain"
              />
            </div>
          </div>

          {/* Period Score Grid Table */}
          <div className="w-full mb-3">
            <table className="w-full text-[12px] text-center border-collapse tabular-nums">
              <thead>
                <tr className="text-white">
                  <th className="font-normal pb-0.5"></th>
                  <th className="font-normal pb-0.5 px-1">1rst</th>
                  <th className="font-normal pb-0.5 px-1">2nd</th>
                  <th className="font-normal pb-0.5 px-1">3rd</th>
                  <th className="font-normal pb-0.5 px-1">OT</th>
                  <th className="font-normal pb-0.5 px-1">Total</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { code: away.code, p: periods.away },
                  { code: home.code, p: periods.home },
                ].map((row, idx) => (
                  <tr key={idx}>
                    <td className="border border-white/70 px-1.5 py-0 text-center font-normal text-[#00ff00]">
                      {row.code}
                    </td>
                    <td className="border border-white/70 px-1.5 py-0 text-white">{row.p.p1}</td>
                    <td className="border border-white/70 px-1.5 py-0 text-white">{row.p.p2}</td>
                    <td className="border border-white/70 px-1.5 py-0 text-white">{row.p.p3}</td>
                    <td className="border border-white/70 px-1.5 py-0 text-white">{row.p.ot}</td>
                    <td className="border border-white/70 px-1.5 py-0 text-white">{row.p.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Borderless Games Stats Section */}
          <div className="w-full">
            <div className="flex items-center justify-between px-1 mb-1.5">
              {awaySmallLogo ? (
                <img src={awaySmallLogo} alt={away.code} className="w-7 h-7 object-contain" />
              ) : (
                <span className="text-[11px] text-[#00ff00] font-bold">{away.code}</span>
              )}
              <span className="text-white text-[12px] tracking-tight">Games Stats</span>
              {homeSmallLogo ? (
                <img src={homeSmallLogo} alt={home.code} className="w-7 h-7 object-contain" />
              ) : (
                <span className="text-[11px] text-[#00ff00] font-bold">{home.code}</span>
              )}
            </div>

            <div className="space-y-0.5 text-[12px] leading-[1.3] tabular-nums">
              {statRows.map((row, idx) => (
                <div key={idx} className="flex justify-between items-center px-0.5">
                  <span className="text-white text-center w-10">{row.away}</span>
                  <span className="text-[#00ff00] text-center flex-1 whitespace-nowrap px-1">
                    {row.label}
                  </span>
                  <span className="text-white text-center w-10">{row.home}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (5 cols): Scoring Summary (Top) & Penalty Summary (Bottom) */}
        <div className="col-span-5 flex flex-col justify-between min-h-[450px]">
          {/* Scoring Summary */}
          <div className="min-h-[215px]">
            <div className="text-center text-[12px] text-white pb-0.5">
              Scoring Summary
            </div>
            <table className="w-full text-[12px] leading-[1.35] text-left border-collapse">
              <thead>
                <tr className="border-y border-white/80 text-white">
                  <th className="font-normal py-0.5 w-8">Per.</th>
                  <th className="font-normal w-11">Time</th>
                  <th className="font-normal w-11">Team</th>
                  <th className="font-normal">Goal</th>
                  <th className="font-normal">Primary</th>
                  <th className="font-normal">Secondary</th>
                  <th className="font-normal text-right w-9">Type</th>
                </tr>
              </thead>
              <tbody className="text-white tabular-nums">
                {goals.map((g, i) => (
                  <tr key={i} className="hover:bg-white/5">
                    <td className="py-0.5">{g.period}</td>
                    <td>{g.time}</td>
                    <td>{g.team}</td>
                    <td className="truncate max-w-[115px] pr-1">{g.scorer}</td>
                    <td className="truncate max-w-[110px] pr-1">
                      {g.assist1 && g.assist1 !== '--' ? g.assist1 : ''}
                    </td>
                    <td className="truncate max-w-[110px] pr-1">
                      {g.assist2 && g.assist2 !== '--' ? g.assist2 : ''}
                    </td>
                    <td className="text-right">{g.type || 'EV'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Penalty Summary */}
          <div className="min-h-[210px] pt-4">
            <div className="text-center text-[12px] text-white pb-0.5">
              Penalty Summary
            </div>
            <table className="w-full text-[12px] leading-[1.35] text-left border-collapse">
              <thead>
                <tr className="border-y border-white/80 text-white">
                  <th className="font-normal py-0.5 w-8">Per.</th>
                  <th className="font-normal w-11">Time</th>
                  <th className="font-normal w-11">Team</th>
                  <th className="font-normal w-[145px]">Player</th>
                  <th className="font-normal text-left">Penalty</th>
                </tr>
              </thead>
              <tbody className="text-white tabular-nums">
                {penalties.map((p, i) => (
                  <tr key={i} className="hover:bg-white/5">
                    <td className="py-0.5">{p.period}</td>
                    <td>{p.time}</td>
                    <td>{p.team}</td>
                    <td className="truncate max-w-[145px] pr-2">{p.player}</td>
                    <td className="text-left">{p.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
