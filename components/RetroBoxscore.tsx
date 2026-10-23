import React from 'react';

// ==========================================
// Shared presentational "retro" NHL95 boxscore screen.
// Data is passed in already normalized so any page (schedule, playoffs, ...)
// can render the same screen from its own data source.
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

const DEFAULT_LEAGUE_LOGO =
  'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/brule_cup.png';

export function formatSavePct(pct: number): string {
  if (!isFinite(pct) || pct <= 0) return '.000';
  if (pct >= 1) return '1.000';
  return `.${Math.round(pct * 1000).toString().padStart(3, '0')}`;
}

function TeamBanner({ team }: { team: RetroTeam }) {
  return (
    <div className="flex items-center justify-between bg-black pb-2 mb-2">
      <div className="flex items-center gap-3">
        {team.logoUrl ? (
          <img
            src={team.logoUrl}
            alt={team.name}
            className="h-10 max-h-12 max-w-[280px] object-contain drop-shadow-md"
          />
        ) : (
          <div className="bg-neutral-900 border border-white/40 px-3 py-1 text-white font-black text-xs uppercase tracking-wider">
            {team.name}
          </div>
        )}
      </div>
      <span className="font-mono font-black text-4xl text-[#00ff00] px-2 drop-shadow-[0_0_10px_rgba(0,255,0,0.9)]">
        {team.score}
      </span>
    </div>
  );
}

function TeamTables({ team }: { team: RetroTeam }) {
  return (
    <div>
      <TeamBanner team={team} />

      <div className="mb-4">
        <table className="w-full text-[11px] text-left">
          <thead>
            <tr className="text-white border-b border-white/40">
              <th className="font-normal w-32">Goalies</th>
              <th className="font-normal text-center">G</th>
              <th className="font-normal text-center">A</th>
              <th className="font-normal text-center">PTS</th>
              <th className="font-normal text-center">SO</th>
              <th className="font-normal text-center">GA</th>
              <th className="font-normal text-center">SV</th>
              <th className="font-normal text-center">SH</th>
              <th className="font-normal text-center">SV%</th>
              <th className="font-normal text-right">TOI</th>
            </tr>
          </thead>
          <tbody className="text-white">
            {team.goalies.map((g, i) => (
              <tr key={i} className="hover:bg-white/5">
                <td className="truncate max-w-[130px]">{g.name}</td>
                <td className="text-center">{g.goals || 0}</td>
                <td className="text-center">{g.assists || 0}</td>
                <td className="text-center">{(g.goals || 0) + (g.assists || 0)}</td>
                <td className="text-center">{g.so ?? (g.ga === 0 && g.saves > 0 ? 1 : 0)}</td>
                <td className="text-center">{g.ga}</td>
                <td className="text-center">{g.saves}</td>
                <td className="text-center">{g.shots}</td>
                <td className="text-center font-mono">{formatSavePct(g.savePct)}</td>
                <td className="text-right">{g.toi}</td>
              </tr>
            ))}
            {team.goalies.length === 0 && (
              <tr>
                <td colSpan={10} className="text-slate-500 py-1 italic">No goalie stats logged.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <table className="w-full text-[11px] text-left">
          <thead>
            <tr className="text-white border-b border-white/40">
              <th className="font-normal w-32">Players</th>
              <th className="font-normal text-center">G</th>
              <th className="font-normal text-center">A</th>
              <th className="font-normal text-center">PTS</th>
              <th className="font-normal text-center">SOG</th>
              <th className="font-normal text-center">CHK</th>
              <th className="font-normal text-center">PIM</th>
              <th className="font-normal text-center">PPP</th>
              <th className="font-normal text-center">SHP</th>
              <th className="font-normal text-right">TOI</th>
            </tr>
          </thead>
          <tbody className="text-white">
            {team.skaters.map((s, i) => (
              <tr key={i} className="hover:bg-white/5">
                <td className="truncate max-w-[130px]">{s.name}</td>
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
  return (
    <div className="bg-black text-white p-4 font-mono select-none border-4 border-neutral-900 shadow-2xl rounded-xs">
      {/* Sections wrap onto new rows when the container is narrow */}
      <div className="flex flex-wrap gap-x-6 gap-y-8 items-start text-xs">
        {/* LEFT: Away & Home rosters */}
        <div className="flex-[5_1_380px] min-w-0 space-y-6">
          <TeamTables team={away} />
          <TeamTables team={home} />
        </div>

        {/* CENTER: League logo, period line score, game stats */}
        <div className="flex-[3_1_240px] min-w-0 space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-white p-1 flex items-center justify-center border-2 border-neutral-700 shadow-md">
              <img
                src={leagueLogoUrl || DEFAULT_LEAGUE_LOGO}
                alt="League"
                className="w-12 h-12 object-contain"
              />
            </div>
          </div>

          <div className="border border-white/40 p-1.5 text-center bg-black">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/30 text-white">
                  <th className="text-left font-normal py-0.5"></th>
                  <th className="font-normal">1rst</th>
                  <th className="font-normal">2nd</th>
                  <th className="font-normal">3rd</th>
                  <th className="font-normal">OT</th>
                  <th className="font-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { code: away.code, p: periods.away },
                  { code: home.code, p: periods.home },
                ].map((row, idx) => (
                  <tr key={idx} className={idx === 0 ? 'border-b border-white/10' : ''}>
                    <td className="text-left font-bold text-[#00ff00] bg-neutral-900 px-1">{row.code}</td>
                    <td>{row.p.p1}</td>
                    <td>{row.p.p2}</td>
                    <td>{row.p.p3}</td>
                    <td>{row.p.ot}</td>
                    <td className="font-bold text-[#00ff00]">{row.p.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border border-white/40 p-2 bg-black">
            <div className="flex items-center justify-between border-b border-white/30 pb-1 mb-2 px-1">
              {away.logoUrl ? (
                <img src={away.logoUrl} alt={away.code} className="w-6 h-6 object-contain" />
              ) : (
                <span className="text-[10px] text-[#00ff00] font-bold">{away.code}</span>
              )}
              <span className="font-bold uppercase text-white tracking-wider text-xs">Games Stats</span>
              {home.logoUrl ? (
                <img src={home.logoUrl} alt={home.code} className="w-6 h-6 object-contain" />
              ) : (
                <span className="text-[10px] text-[#00ff00] font-bold">{home.code}</span>
              )}
            </div>

            <div className="space-y-1 text-[11px]">
              {statRows.map((row, idx) => (
                <div key={idx} className="flex justify-between items-center px-1 hover:bg-white/5">
                  <span className="font-bold text-left w-14">{row.away}</span>
                  <span className="text-[#00ff00] text-center flex-1">{row.label}</span>
                  <span className="font-bold text-right w-14">{row.home}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Scoring & Penalty summaries */}
        <div className="flex-[4_1_340px] min-w-0 space-y-6">
          <div>
            <div className="text-center text-xs text-white border-b border-white/40 pb-1 mb-2">
              Scoring Summary
            </div>
            <table className="w-full text-[11px] text-left">
              <thead>
                <tr className="border-b border-white/30 text-white">
                  <th className="font-normal py-0.5">Per.</th>
                  <th className="font-normal">Time</th>
                  <th className="font-normal">Team</th>
                  <th className="font-normal">Goal</th>
                  <th className="font-normal">Primary</th>
                  <th className="font-normal">Secondary</th>
                  <th className="font-normal text-right">Type</th>
                </tr>
              </thead>
              <tbody className="text-white">
                {goals.map((g, i) => (
                  <tr key={i} className="hover:bg-white/5">
                    <td className="py-0.5">{g.period}</td>
                    <td>{g.time}</td>
                    <td>{g.team}</td>
                    <td className="truncate max-w-[100px]">{g.scorer}</td>
                    <td className="truncate max-w-[90px]">{g.assist1 && g.assist1 !== '--' ? g.assist1 : ''}</td>
                    <td className="truncate max-w-[90px]">{g.assist2 && g.assist2 !== '--' ? g.assist2 : ''}</td>
                    <td className="text-right">{g.type || 'EV'}</td>
                  </tr>
                ))}
                {goals.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-slate-500 py-2 italic">No scoring in this match.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div>
            <div className="text-center text-xs text-white border-b border-white/40 pb-1 mb-2">
              Penalty Summary
            </div>
            <table className="w-full text-[11px] text-left">
              <thead>
                <tr className="border-b border-white/30 text-white">
                  <th className="font-normal py-0.5">Per.</th>
                  <th className="font-normal">Time</th>
                  <th className="font-normal">Team</th>
                  <th className="font-normal">Player</th>
                  <th className="font-normal text-right">Penalty</th>
                </tr>
              </thead>
              <tbody className="text-white">
                {penalties.map((p, i) => (
                  <tr key={i} className="hover:bg-white/5">
                    <td className="py-0.5">{p.period}</td>
                    <td>{p.time}</td>
                    <td>{p.team}</td>
                    <td className="truncate max-w-[130px]">{p.player}</td>
                    <td className="text-right">{p.type}</td>
                  </tr>
                ))}
                {penalties.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-slate-500 py-2 italic">No penalties assessed.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
