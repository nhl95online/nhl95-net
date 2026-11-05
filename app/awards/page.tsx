"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Trophy, ChevronDown, Award, Star, Shield } from 'lucide-react';

const W_SEASON_MAP: Record<number, string> = {
  1: 'W01',
  2: 'W02',
  3: 'W03',
  4: 'W04',
  6: 'W05',
  9: 'W06',
  11: 'W07',
  14: 'W08',
  18: 'W09',
  22: 'W10',
  24: 'W11',
  28: 'W12',
  31: 'W13',
  33: 'W14',
  35: 'W15',
  37: 'W16',
  38: 'W17',
  40: 'W18'
};

const COMPLETED_W_SEASON_IDS = [38, 37, 35, 33, 31, 28, 24, 22, 18, 14, 11, 9, 6, 4, 3, 2, 1];

const AWARD_DEFINITIONS: Record<
  number,
  {
    award_id: number;
    name: string;
    nhl_comparable: string;
    description: string;
    category: 'goalie' | 'skater' | 'playoff_skater' | 'team' | 'coach';
    default_url: string;
  }
> = {
  11: {
    award_id: 11,
    name: 'Brule Cup',
    nhl_comparable: 'Stanley Cup',
    description: 'W League Playoff Champion',
    category: 'team',
    default_url: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/brule_cup.png'
  },
  8: {
    award_id: 8,
    name: 'Classic',
    nhl_comparable: "President's Trophy",
    description: 'Best regular season team record in the W League',
    category: 'team',
    default_url: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Classic%20Cup.png'
  },
  15: {
    award_id: 15,
    name: 'Patrick Swayze',
    nhl_comparable: 'Hart Memorial Trophy (League MVP)',
    description: 'Most Valuable Player as voted by W League coaches',
    category: 'skater',
    default_url: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/SwayzeTrophy.png'
  },
  6: {
    award_id: 6,
    name: 'Royal Flush',
    nhl_comparable: 'Art Ross Trophy',
    description: 'Most points by a player in the regular season',
    category: 'skater',
    default_url: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/royal%20flush%20award.png'
  },
  2: {
    award_id: 2,
    name: 'Sniper',
    nhl_comparable: 'Maurice "Rocket" Richard Trophy',
    description: 'Most goals scored by a player in the regular season',
    category: 'skater',
    default_url: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Sniper%20Trophy.png'
  },
  14: {
    award_id: 14,
    name: 'Gretzky',
    nhl_comparable: 'Conn Smythe Trophy',
    description: 'Player with the most points in the W League Playoffs',
    category: 'playoff_skater',
    default_url: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Gretzky%20Award.png'
  },
  1: {
    award_id: 1,
    name: 'Brick Wall',
    nhl_comparable: 'Vezina Trophy',
    description: 'Goaltender with the lowest GAA (30+ GP)',
    category: 'goalie',
    default_url: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Brick%20Wall%20Award.png'
  },
  3: {
    award_id: 3,
    name: 'Too Touchy',
    nhl_comparable: 'James Norris Memorial Trophy',
    description: 'Top defenseman combining high points, checks, and discipline',
    category: 'skater',
    default_url: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Too%20Touchy%20Cup.png'
  },
  13: {
    award_id: 13,
    name: 'Chet Stedman',
    nhl_comparable: 'Calder Memorial Trophy',
    description: 'Top rookie performer in the W League',
    category: 'skater',
    default_url: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Stedman.png'
  },
  7: {
    award_id: 7,
    name: 'Game Theory',
    nhl_comparable: 'William M. Jennings Trophy',
    description: 'Team / Goaltending tandem with lowest goals against (30+ GP)',
    category: 'goalie',
    default_url: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Game%20Theory%20Award.png'
  },
  4: {
    award_id: 4,
    name: 'Gadget',
    nhl_comparable: 'Special Teams Specialist',
    description: 'Best special teams specialist (combined PP & SH points)',
    category: 'skater',
    default_url: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Gadget%20Award.png'
  },
  12: {
    award_id: 12,
    name: 'Go Getter',
    nhl_comparable: 'Heavy Hitter Award',
    description: 'Player recording the most body checks in the season',
    category: 'skater',
    default_url: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Go%20Getter.png'
  },
  5: {
    award_id: 5,
    name: 'Street Fighter',
    nhl_comparable: 'Enforcer Award',
    description: 'Most penalized player in the W League',
    category: 'skater',
    default_url: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/street%20fighter%20cup.png'
  },
  20: {
    award_id: 20,
    name: 'Sopranoless',
    nhl_comparable: 'Lady Byng Memorial Trophy',
    description: 'Lowest PIMs combined with elite scoring (35+ GP)',
    category: 'skater',
    default_url: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Sopranoless.png'
  },
  9: {
    award_id: 9,
    name: 'Aftershock Cup',
    nhl_comparable: 'Jack Adams / Builder Award',
    description: 'Top involved W League coach & community pillar',
    category: 'coach',
    default_url: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Gentleman_s%20Cup.png'
  },
  16: {
    award_id: 16,
    name: 'Comeback Kid (Props)',
    nhl_comparable: 'Most Improved Coach',
    description: 'Coach & franchise with the biggest season-over-season turnaround',
    category: 'coach',
    default_url: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Most%20Improved%20Coach.png'
  },
  18: {
    award_id: 18,
    name: 'MoneyBall',
    nhl_comparable: 'Jim Gregory GM of the Year',
    description: 'Best General Manager & roster architect in the W League',
    category: 'coach',
    default_url: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/GM%20of%20the%20Year.png'
  },
  19: {
    award_id: 19,
    name: 'Rebound',
    nhl_comparable: 'Bill Masterton / Comeback Franchise',
    description: 'Comeback team of the year in the W League',
    category: 'team',
    default_url: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Comeback%20Team%20of%20the%20Year.png'
  },
  10: {
    award_id: 10,
    name: 'Shitty Bill',
    nhl_comparable: 'Draft Lottery Champion',
    description: "Loser's Bracket / Toilet Bowl Winner",
    category: 'team',
    default_url: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Shitty%20Bill1.png'
  },
  17: {
    award_id: 17,
    name: 'Hot!Hot!Hot!',
    nhl_comparable: 'Highest Scoring Heater',
    description: 'Most electrifying single-season goal per game pace in the W',
    category: 'skater',
    default_url: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/JustBabes.png'
  },
  21: {
    award_id: 21,
    name: 'Jekyll & Hyde',
    nhl_comparable: 'Power Forward / Sin Bin Scorer',
    description: 'Elite scorer who also lives in the penalty box (High PTS + High PIM)',
    category: 'skater',
    default_url: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Jeykl&Hyde.png'
  },
  22: {
    award_id: 22,
    name: 'Hall Of Fame',
    nhl_comparable: 'WN95HL Ring of Honor',
    description: 'All-time W League dynasty & career statistical excellence',
    category: 'skater',
    default_url: 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/WN95HL%20HoF1.png'
  }
};

const DISPLAY_ORDER = [11, 8, 15, 6, 2, 14, 1, 3, 13, 7, 4, 12, 5, 20, 9, 16, 18, 19, 10, 17, 21, 22];

interface WinnerEntry {
  league_id: number;
  season_badge: string;
  winner_name: string;
  subtitle_name?: string;
  team_name: string;
  team_abbr: string;
  team_logo: string | null;
  stat_line: string;
  stat_badges: Array<{ label: string; value: string }>;
}

interface AwardCardData {
  award_id: number;
  award_name: string;
  trophy_image_url: string;
  nhl_comparable: string;
  description: string;
  winners: WinnerEntry[];
}

export default function AwardsPage() {
  const [awards, setAwards] = useState<AwardCardData[]>([]);
  const [selectedWinnerIndexByAward, setSelectedWinnerIndexByAward] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadAllWLeagueAwards() {
      setLoading(true);
      try {
        const wSeasonIds = Object.keys(W_SEASON_MAP).map(Number);

        const [
          awardsTableRes,
          leagueAwardsRes,
          teamsRes,
          coachesRes,
          playerDbRes,
          standingsRes,
          statsPage0,
          statsPage1,
          statsPage2,
          statsPage3,
          poMasterRes
        ] = await Promise.all([
          supabase.from('awards').select('*').order('award_id', { ascending: true }),
          supabase.from('league_awards').select('*').order('league_id', { ascending: false }),
          supabase.from('league_teams').select('team_id, league_id, coach_id, team_name, abbreviation, logo_url'),
          supabase.from('league_coaches').select('coach_id, coach_name'),
          supabase.from('league_player_database').select('player_id, player_name, pos').range(0, 9999),
          supabase.from('league_standings').select('season_id, team_id, gp, w, l, t, otl, pts, gf, ga, is_champion').in('season_id', wSeasonIds).range(0, 1999),
          supabase.from('api_stats_with_names').select('*').in('league_id', wSeasonIds).range(0, 999),
          supabase.from('api_stats_with_names').select('*').in('league_id', wSeasonIds).range(1000, 1999),
          supabase.from('api_stats_with_names').select('*').in('league_id', wSeasonIds).range(2000, 2999),
          supabase.from('api_stats_with_names').select('*').in('league_id', wSeasonIds).range(3000, 3999),
          supabase.from('league_playoff_player_stats_master').select('league_id, team_id, player_id, goals, assists, shots, checks, pim').in('league_id', wSeasonIds).range(0, 4999).then(r => r, () => ({ data: [] as any[] }))
        ]);

        const rawAwardsMeta = awardsTableRes.data || [];
        const rawLeagueAwards = (leagueAwardsRes.data || []).filter((r: any) => W_SEASON_MAP[Number(r.league_id)]);
        const rawTeams = teamsRes.data || [];
        const rawCoaches = coachesRes.data || [];
        const rawPlayers = playerDbRes.data || [];
        const rawStandings = standingsRes.data || [];
        const rawApiStats = [
          ...(statsPage0.data || []),
          ...(statsPage1.data || []),
          ...(statsPage2.data || []),
          ...(statsPage3.data || [])
        ];
        const rawPoMaster = poMasterRes.data || [];

        // Build lookup maps
        const coachMap = new Map<number, string>();
        rawCoaches.forEach((c: any) => {
          if (c.coach_id != null && c.coach_name) {
            coachMap.set(Number(c.coach_id), String(c.coach_name).trim());
          }
        });

        const teamMap = new Map<number, { team_id: number; league_id: number; coach_id: number | null; coach_name: string; team_name: string; abbr: string; logo_url: string | null }>();
        rawTeams.forEach((t: any) => {
          const tid = Number(t.team_id);
          const cid = t.coach_id != null ? Number(t.coach_id) : null;
          const cname = (cid && coachMap.get(cid)) || '';
          teamMap.set(tid, {
            team_id: tid,
            league_id: Number(t.league_id) || 1,
            coach_id: cid,
            coach_name: cname,
            team_name: String(t.team_name || `Team #${tid}`).trim(),
            abbr: String(t.abbreviation || 'TM').trim().toUpperCase(),
            logo_url: t.logo_url || null
          });
        });

        const playerMap = new Map<number, { name: string; pos: string }>();
        rawPlayers.forEach((p: any) => {
          if (p.player_id != null && p.player_name) {
            playerMap.set(Number(p.player_id), {
              name: String(p.player_name).trim(),
              pos: String(p.pos || '').trim().toUpperCase()
            });
          }
        });

        // Map (league_id, player_id) -> season stats from api_stats_with_names
        const playerSeasonStatsMap = new Map<string, any>();
        const statsBySeason = new Map<number, any[]>();
        rawApiStats.forEach((s: any) => {
          const lid = Number(s.league_id);
          const pid = Number(s.player_id);
          if (lid && pid) {
            playerSeasonStatsMap.set(`${lid}-${pid}`, s);
            if (!playerMap.has(pid) && s.player_name) {
              playerMap.set(pid, { name: String(s.player_name).trim(), pos: String(s.pos_played || '').toUpperCase() });
            }
          }
          if (lid) {
            const arr = statsBySeason.get(lid) || [];
            arr.push(s);
            statsBySeason.set(lid, arr);
          }
        });

        // Map (league_id, player_id) -> aggregated playoff stats
        const poPlayerSeasonMap = new Map<string, { gp: number; g: number; a: number; pts: number; sog: number; chks: number; pim: number; team_id: number; player_id: number }>();
        rawPoMaster.forEach((row: any) => {
          const lid = Number(row.league_id);
          const pid = Number(row.player_id);
          if (!lid || !pid) return;
          const key = `${lid}-${pid}`;
          const cur = poPlayerSeasonMap.get(key) || { gp: 0, g: 0, a: 0, pts: 0, sog: 0, chks: 0, pim: 0, team_id: Number(row.team_id) || 0, player_id: pid };
          const g = Number(row.goals) || 0;
          const a = Number(row.assists) || 0;
          cur.gp += 1;
          cur.g += g;
          cur.a += a;
          cur.pts += g + a;
          cur.sog += Number(row.shots) || 0;
          cur.chks += Number(row.checks) || 0;
          cur.pim += Number(row.pim) || 0;
          if (!cur.team_id && row.team_id) cur.team_id = Number(row.team_id);
          poPlayerSeasonMap.set(key, cur);
        });

        // Map (season_id, team_id) -> standings row
        const teamStandingsMap = new Map<string, any>();
        const standingsBySeason = new Map<number, any[]>();
        rawStandings.forEach((st: any) => {
          const sid = Number(st.season_id);
          const tid = Number(st.team_id);
          if (sid && tid) {
            teamStandingsMap.set(`${sid}-${tid}`, st);
          }
          if (sid) {
            const arr = standingsBySeason.get(sid) || [];
            arr.push(st);
            standingsBySeason.set(sid, arr);
          }
        });

        // Helper to format stat line for a player/team/coach in a season
        const buildWinnerEntry = (
          aid: number,
          lid: number,
          pid: number | null,
          tid: number | null,
          cid: number | null
        ): WinnerEntry | null => {
          const sBadge = W_SEASON_MAP[lid] || `W${String(lid).padStart(2, '0')}`;
          const def = AWARD_DEFINITIONS[aid];
          const pStat = pid ? playerSeasonStatsMap.get(`${lid}-${pid}`) : null;
          const poStat = pid ? poPlayerSeasonMap.get(`${lid}-${pid}`) : null;

          const resolvedTeamId = tid || (pStat?.team_id ? Number(pStat.team_id) : null) || (poStat?.team_id ? Number(poStat.team_id) : null);
          let tInfo = resolvedTeamId ? teamMap.get(resolvedTeamId) : undefined;
          if (!tInfo && cid) {
            tInfo = Array.from(teamMap.values()).find(t => t.league_id === lid && t.coach_id === cid);
          }

          const tStand = resolvedTeamId ? teamStandingsMap.get(`${lid}-${resolvedTeamId}`) : null;
          const pInfo = pid ? playerMap.get(pid) : undefined;
          const pName = pStat?.player_name || pInfo?.name || '';
          const cName = (cid && coachMap.get(cid)) || tInfo?.coach_name || '';
          const tName = tInfo?.team_name || pStat?.team_name || '';
          const tAbbr = tInfo?.abbr || (tName ? tName.slice(0, 3).toUpperCase() : 'W');
          const tLogo = tInfo?.logo_url || pStat?.logo_url || null;

          if (!pName && !cName && !tName) return null;

          // Determine primary winner display name & subtitle
          let winnerName = pName || cName || tName;
          let subtitleName = '';
          if (def?.category === 'team') {
            winnerName = tName || cName;
            subtitleName = cName ? `Coach: ${cName}` : '';
          } else if (def?.category === 'coach') {
            winnerName = cName || tName;
            subtitleName = tName || '';
          } else {
            winnerName = pName || cName || tName;
            subtitleName = cName ? `${tName} (${cName})` : tName;
          }

          // Build stat line & badges
          let statLine = '';
          const statBadges: Array<{ label: string; value: string }> = [];

          if (def?.category === 'playoff_skater' && poStat && poStat.gp > 0) {
            statLine = `${poStat.gp} GP • ${poStat.g} G • ${poStat.a} A • ${poStat.pts} PTS (Playoffs)`;
            statBadges.push(
              { label: 'PO GP', value: String(poStat.gp) },
              { label: 'G', value: String(poStat.g) },
              { label: 'A', value: String(poStat.a) },
              { label: 'PTS', value: String(poStat.pts) },
              { label: 'SOG', value: String(poStat.sog) }
            );
          } else if ((def?.category === 'goalie' || pInfo?.pos === 'G' || pStat?.pos_played === 'G') && pStat && Number(pStat.gp) > 0) {
            const gp = Number(pStat.gp) || 0;
            const w = Number(pStat.wins) || 0;
            const l = Number(pStat.losses) || 0;
            const t = Number(pStat.ties) || 0;
            const gaa = pStat.gaa != null ? Number(pStat.gaa).toFixed(2) : '0.00';
            const rawSv = pStat.sv_pct != null ? Number(pStat.sv_pct) : 0;
            const svStr = rawSv > 0 ? (rawSv <= 1 ? `.${Math.round(rawSv * 1000).toString().padStart(3, '0')}` : `${rawSv.toFixed(1)}%`) : '--';
            const so = Number(pStat.shutouts) || 0;
            statLine = `${gp} GP • ${w}-${l}-${t} • ${gaa} GAA • ${svStr} SV% • ${so} SO`;
            statBadges.push(
              { label: 'GP', value: String(gp) },
              { label: 'W-L-T', value: `${w}-${l}-${t}` },
              { label: 'GAA', value: gaa },
              { label: 'SV%', value: svStr },
              { label: 'SO', value: String(so) }
            );
          } else if (pStat && Number(pStat.gp) > 0) {
            const gp = Number(pStat.gp) || 0;
            const g = Number(pStat.total_goals) || 0;
            const a = Number(pStat.total_assists) || 0;
            const pts = Number(pStat.total_points) || 0;
            const sog = Number(pStat.total_sog) || 0;
            const chks = Number(pStat.total_chks) || 0;
            const pim = Number(pStat.total_pim) || 0;
            statLine = `${gp} GP • ${g} G • ${a} A • ${pts} PTS • ${chks} CHK • ${pim} PIM`;
            statBadges.push(
              { label: 'GP', value: String(gp) },
              { label: 'G', value: String(g) },
              { label: 'A', value: String(a) },
              { label: 'PTS', value: String(pts) },
              { label: 'SOG', value: String(sog) },
              { label: 'CHK', value: String(chks) },
              { label: 'PIM', value: String(pim) }
            );
          } else if (tStand) {
            const gp = Number(tStand.gp) || 0;
            const w = Number(tStand.w) || 0;
            const l = Number(tStand.l) || 0;
            const t = Number(tStand.t) || 0;
            const otl = Number(tStand.otl) || 0;
            const pts = tStand.pts != null ? Number(tStand.pts) : w * 2 + t + otl;
            const gf = Number(tStand.gf) || 0;
            const ga = Number(tStand.ga) || 0;
            const gaa = gp > 0 ? (ga / gp).toFixed(2) : '0.00';
            if (aid === 7) {
              statLine = `${gp} GP • ${w}-${l}-${t} • ${ga} GA (${gaa} GAA) • ${pts} PTS`;
              statBadges.push(
                { label: 'GP', value: String(gp) },
                { label: 'REC', value: `${w}-${l}-${t}` },
                { label: 'GA', value: String(ga) },
                { label: 'TEAM GAA', value: gaa },
                { label: 'PTS', value: String(pts) }
              );
            } else {
              statLine = `${gp} GP • ${w}-${l}-${t}${otl ? `-${otl}` : ''} • ${pts} PTS • ${gf} GF - ${ga} GA`;
              statBadges.push(
                { label: 'GP', value: String(gp) },
                { label: 'RECORD', value: `${w}-${l}-${t}${otl ? `-${otl}` : ''}` },
                { label: 'PTS', value: String(pts) },
                { label: 'GF-GA', value: `${gf}-${ga}` },
                { label: 'DIFF', value: `${gf - ga >= 0 ? '+' : ''}${gf - ga}` }
              );
            }
          } else {
            statLine = `${sBadge} Season Honoree`;
            statBadges.push({ label: 'SEASON', value: sBadge });
          }

          return {
            league_id: lid,
            season_badge: sBadge,
            winner_name: winnerName,
            subtitle_name: subtitleName,
            team_name: tName || 'W League',
            team_abbr: tAbbr,
            team_logo: tLogo,
            stat_line: statLine,
            stat_badges: statBadges
          };
        };

        // Group existing DB winners by award_id & season
        const winnersByAwardSeason = new Map<string, WinnerEntry>();
        const metaByAwardId = new Map<number, { name: string; url: string; comp: string; desc: string }>();

        rawAwardsMeta.forEach((a: any) => {
          const aid = Number(a.award_id);
          const def = AWARD_DEFINITIONS[aid];
          metaByAwardId.set(aid, {
            name: def?.name || a.award_names || `Award #${aid}`,
            url: a.award_url || def?.default_url || '',
            comp: def?.nhl_comparable || '--',
            desc: def?.description || ''
          });
        });

        rawLeagueAwards.forEach((row: any) => {
          const aid = Number(row.award_id);
          const lid = Number(row.league_id);
          if (!aid || !lid) return;

          const existingMeta = metaByAwardId.get(aid);
          const def = AWARD_DEFINITIONS[aid];
          if (!existingMeta) {
            metaByAwardId.set(aid, {
              name: def?.name || row.award_name || `Award #${aid}`,
              url: row.trophy_image_url || def?.default_url || '',
              comp: row.nhl_comparable && row.nhl_comparable !== '--' && row.nhl_comparable !== '0' ? row.nhl_comparable : (def?.nhl_comparable || '--'),
              desc: row.description || def?.description || ''
            });
          } else {
            if (row.nhl_comparable && row.nhl_comparable !== '--' && row.nhl_comparable !== '0' && existingMeta.comp === '--') {
              existingMeta.comp = row.nhl_comparable;
            }
            if (row.description && !existingMeta.desc) {
              existingMeta.desc = row.description;
            }
          }

          const entry = buildWinnerEntry(
            aid,
            lid,
            row.player_id ? Number(row.player_id) : null,
            row.team_id ? Number(row.team_id) : null,
            row.coach_id ? Number(row.coach_id) : null
          );
          if (entry) {
            winnersByAwardSeason.set(`${aid}-${lid}`, entry);
          }
        });

        // Populate statistical W League awards across completed W seasons where DB row was missing or null
        COMPLETED_W_SEASON_IDS.forEach((lid) => {
          const seasonStats = statsBySeason.get(lid) || [];
          const seasonStandings = standingsBySeason.get(lid) || [];
          const skaters = seasonStats.filter((s: any) => String(s.pos_played || '').toUpperCase() !== 'G' && Number(s.gp) > 0);
          const goalies = seasonStats.filter((s: any) => (String(s.pos_played || '').toUpperCase() === 'G' || Number(s.gaa) > 0) && Number(s.gp) >= 20);

          const ensureAward = (aid: number, pid: number | null, tid: number | null, cid: number | null = null) => {
            const key = `${aid}-${lid}`;
            if (winnersByAwardSeason.has(key)) return;
            const built = buildWinnerEntry(aid, lid, pid, tid, cid);
            if (built) winnersByAwardSeason.set(key, built);
          };

          // 1: Brick Wall (Lowest GAA goalie)
          if (goalies.length > 0) {
            const bestG = [...goalies].sort((a, b) => Number(a.gaa || 99) - Number(b.gaa || 99))[0];
            if (bestG) ensureAward(1, Number(bestG.player_id), Number(bestG.team_id));
          }

          // 2: Sniper (Most Goals)
          if (skaters.length > 0) {
            const bestG = [...skaters].sort((a, b) => Number(b.total_goals || 0) - Number(a.total_goals || 0) || Number(b.total_points || 0) - Number(a.total_points || 0))[0];
            if (bestG) ensureAward(2, Number(bestG.player_id), Number(bestG.team_id));
          }

          // 3: Too Touchy (Top Defenseman)
          const dmen = skaters.filter((s: any) => String(s.pos_played || '').toUpperCase() === 'D');
          if (dmen.length > 0) {
            const bestD = [...dmen].sort((a, b) => Number(b.total_points || 0) - Number(a.total_points || 0) || Number(b.total_chks || 0) - Number(a.total_chks || 0))[0];
            if (bestD) ensureAward(3, Number(bestD.player_id), Number(bestD.team_id));
          }

          // 5: Street Fighter (Most PIM)
          if (skaters.length > 0) {
            const bestPim = [...skaters].sort((a, b) => Number(b.total_pim || 0) - Number(a.total_pim || 0) || Number(b.total_chks || 0) - Number(a.total_chks || 0))[0];
            if (bestPim && Number(bestPim.total_pim) > 0) ensureAward(5, Number(bestPim.player_id), Number(bestPim.team_id));
          }

          // 6: Royal Flush (Most Points)
          if (skaters.length > 0) {
            const bestPts = [...skaters].sort((a, b) => Number(b.total_points || 0) - Number(a.total_points || 0) || Number(b.total_goals || 0) - Number(a.total_goals || 0))[0];
            if (bestPts) ensureAward(6, Number(bestPts.player_id), Number(bestPts.team_id));
          }

          // 7: Game Theory (Team lowest GA)
          if (seasonStandings.length > 0) {
            const validSt = seasonStandings.filter((s: any) => Number(s.gp) >= 20 && Number(s.ga) > 0);
            if (validSt.length > 0) {
              const bestDefTeam = [...validSt].sort((a, b) => (Number(a.ga) / Number(a.gp)) - (Number(b.ga) / Number(b.gp)))[0];
              if (bestDefTeam) ensureAward(7, null, Number(bestDefTeam.team_id));
            }
          }

          // 8: Classic (President's Trophy - Best Regular Season Record)
          if (seasonStandings.length > 0) {
            const bestTeam = [...seasonStandings].sort((a, b) => Number(b.pts || 0) - Number(a.pts || 0) || Number(b.w || 0) - Number(a.w || 0))[0];
            if (bestTeam) ensureAward(8, null, Number(bestTeam.team_id));
          }

          // 11: Brule Cup (Champion in standings)
          if (seasonStandings.length > 0) {
            const champ = seasonStandings.find((s: any) => Boolean(s.is_champion));
            if (champ) ensureAward(11, null, Number(champ.team_id));
          }

          // 12: Go Getter (Most Checks)
          if (skaters.length > 0) {
            const bestChk = [...skaters].sort((a, b) => Number(b.total_chks || 0) - Number(a.total_chks || 0))[0];
            if (bestChk && Number(bestChk.total_chks) > 0) ensureAward(12, Number(bestChk.player_id), Number(bestChk.team_id));
          }

          // 13: Chet Stedman (Top Rookie)
          const rookies = skaters.filter((s: any) => Boolean(s.is_rookie));
          if (rookies.length > 0) {
            const bestRookie = [...rookies].sort((a, b) => Number(b.total_points || 0) - Number(a.total_points || 0))[0];
            if (bestRookie) ensureAward(13, Number(bestRookie.player_id), Number(bestRookie.team_id));
          }

          // 14: Gretzky (Playoff Points Leader)
          const poForSeason = Array.from(poPlayerSeasonMap.entries())
            .filter(([k]) => k.startsWith(`${lid}-`))
            .map(([, v]) => v)
            .sort((a, b) => b.pts - a.pts || b.g - a.g);
          if (poForSeason.length > 0 && poForSeason[0].pts > 0) {
            ensureAward(14, poForSeason[0].player_id, poForSeason[0].team_id);
          }

          // 17: Hot!Hot!Hot! (Highest Goals Per Game heater, 30+ GP)
          const heaterPool = skaters.filter((s: any) => Number(s.gp) >= 30);
          if (heaterPool.length > 0) {
            const bestHeater = [...heaterPool].sort(
              (a, b) => (Number(b.total_goals || 0) / Number(b.gp || 1)) - (Number(a.total_goals || 0) / Number(a.gp || 1))
            )[0];
            if (bestHeater) ensureAward(17, Number(bestHeater.player_id), Number(bestHeater.team_id));
          }

          // 20: Sopranoless (Lady Byng: 35+ GP, lowest PIM + high points)
          const byngPool = skaters.filter((s: any) => Number(s.gp) >= 35 && Number(s.total_points) >= 40);
          if (byngPool.length > 0) {
            const bestByng = [...byngPool].sort(
              (a, b) => Number(a.total_pim || 0) - Number(b.total_pim || 0) || Number(b.total_points || 0) - Number(a.total_points || 0)
            )[0];
            if (bestByng) ensureAward(20, Number(bestByng.player_id), Number(bestByng.team_id));
          }

          // 21: Jekyll & Hyde (High Points + High PIM combo)
          const jhPool = skaters.filter((s: any) => Number(s.total_pim) >= 20 && Number(s.total_points) >= 30);
          if (jhPool.length > 0) {
            const bestJH = [...jhPool].sort(
              (a, b) => (Number(b.total_points || 0) + Number(b.total_pim || 0) * 1.5) - (Number(a.total_points || 0) + Number(a.total_pim || 0) * 1.5)
            )[0];
            if (bestJH) ensureAward(21, Number(bestJH.player_id), Number(bestJH.team_id));
          }
        });

        // 22: Hall Of Fame (All-Time W League Career Legends & Multi-Cup Champions)
        if (!Array.from(winnersByAwardSeason.keys()).some(k => k.startsWith('22-'))) {
          const careerMap = new Map<number, { pid: number; name: string; gp: number; g: number; a: number; pts: number; chks: number; pim: number; tid: number }>();
          rawApiStats.forEach((s: any) => {
            if (String(s.pos_played || '').toUpperCase() === 'G') return;
            const pid = Number(s.player_id);
            if (!pid) return;
            const cur = careerMap.get(pid) || { pid, name: s.player_name, gp: 0, g: 0, a: 0, pts: 0, chks: 0, pim: 0, tid: Number(s.team_id) || 0 };
            cur.gp += Number(s.gp) || 0;
            cur.g += Number(s.total_goals) || 0;
            cur.a += Number(s.total_assists) || 0;
            cur.pts += Number(s.total_points) || 0;
            cur.chks += Number(s.total_chks) || 0;
            cur.pim += Number(s.total_pim) || 0;
            if (s.team_id) cur.tid = Number(s.team_id);
            careerMap.set(pid, cur);
          });
          const topLegends = Array.from(careerMap.values()).sort((a, b) => b.pts - a.pts).slice(0, 10);
          topLegends.forEach((leg, idx) => {
            const tInfo = teamMap.get(leg.tid);
            const syntheticLid = 38 - idx;
            winnersByAwardSeason.set(`22-${syntheticLid}`, {
              league_id: syntheticLid,
              season_badge: `HOF #${idx + 1}`,
              winner_name: leg.name,
              subtitle_name: tInfo ? `${tInfo.team_name} (${tInfo.coach_name || 'W League'})` : 'W League Legend',
              team_name: tInfo?.team_name || 'W League All-Time',
              team_abbr: tInfo?.abbr || 'HOF',
              team_logo: tInfo?.logo_url || null,
              stat_line: `Career: ${leg.gp} GP • ${leg.g} G • ${leg.a} A • ${leg.pts} PTS • ${leg.chks} CHK`,
              stat_badges: [
                { label: 'CAREER GP', value: String(leg.gp) },
                { label: 'G', value: String(leg.g) },
                { label: 'A', value: String(leg.a) },
                { label: 'PTS', value: String(leg.pts) },
                { label: 'CHK', value: String(leg.chks) }
              ]
            });
          });
        }

        // Compile final ordered AwardCardData list
        const allAwardIds = Array.from(new Set([...DISPLAY_ORDER, ...Array.from(metaByAwardId.keys())]));
        const compiledAwards: AwardCardData[] = [];

        allAwardIds.forEach((aid) => {
          const def = AWARD_DEFINITIONS[aid];
          const meta = metaByAwardId.get(aid);
          const winners: WinnerEntry[] = [];

          Array.from(winnersByAwardSeason.entries()).forEach(([key, val]) => {
            const [kAid] = key.split('-').map(Number);
            if (kAid === aid) {
              winners.push(val);
            }
          });

          winners.sort((a, b) => b.league_id - a.league_id);

          if (winners.length > 0) {
            compiledAwards.push({
              award_id: aid,
              award_name: def?.name || meta?.name || `Award #${aid}`,
              trophy_image_url: meta?.url || def?.default_url || '',
              nhl_comparable: def?.nhl_comparable || meta?.comp || '--',
              description: def?.description || meta?.desc || '',
              winners
            });
          }
        });

        setAwards(compiledAwards);
      } catch (err) {
        console.error('Error loading W League awards:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAllWLeagueAwards();
  }, []);

  return (
    <div className="min-h-screen bg-[#f4f1ea] p-3 sm:p-8 font-serif text-black">
      <header className="max-w-7xl mx-auto text-center border-b-4 border-black pb-4 sm:pb-6 mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-2 bg-black text-white px-3 py-1 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-2">
          <Trophy className="w-3.5 h-3.5 text-yellow-400" />
          WN95HL • W League Official Trophy Case
        </div>
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tighter uppercase">
          The Trophy Case
        </h1>
        <p className="text-xs sm:text-sm font-bold text-stone-700 mt-1 uppercase tracking-wider">
          W League Hardware, Reigning Champions &amp; All-Time Winners With Season Stat Lines
        </p>
      </header>

      {loading ? (
        <div className="max-w-7xl mx-auto py-16 text-center font-black uppercase tracking-widest text-sm">
          Loading W League Trophy Case &amp; Winner Stat Lines...
        </div>
      ) : (
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {awards.map((award) => {
            const selectedIdx = selectedWinnerIndexByAward[award.award_id] ?? 0;
            const activeWinner = award.winners[selectedIdx] || award.winners[0];
            const isLatest = selectedIdx === 0;

            return (
              <div
                key={award.award_id}
                className="flex flex-col justify-between border-2 border-black bg-[#fdfaf5] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden"
              >
                {/* Top Black Banner */}
                <div>
                  <div className="bg-black text-white px-3 py-2 flex items-center justify-between gap-2 border-b-2 border-black">
                    <div className="flex items-center gap-2 min-w-0">
                      <Award className="w-4 h-4 text-yellow-400 shrink-0" />
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white truncate">
                        {award.award_name}
                      </h3>
                    </div>
                    <span className="bg-yellow-400 text-black font-black text-[10px] uppercase px-2 py-0.5 shrink-0">
                      {activeWinner ? activeWinner.season_badge : 'W'}
                    </span>
                  </div>

                  {/* Main Winner Showcase */}
                  <div className="p-4">
                    <div className="flex gap-4 items-center mb-3">
                      {award.trophy_image_url ? (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white border border-black/20 p-1.5 flex items-center justify-center shrink-0 shadow-xs">
                          <img
                            src={award.trophy_image_url}
                            alt={award.award_name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-neutral-100 border border-black/20 flex items-center justify-center shrink-0">
                          <Trophy className="w-10 h-10 text-yellow-600" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-black text-white">
                            {isLatest ? `LATEST WINNER (${activeWinner?.season_badge})` : `${activeWinner?.season_badge} WINNER`}
                          </span>
                        </div>
                        <p className="text-lg sm:text-xl font-black italic leading-tight text-black truncate" title={activeWinner?.winner_name}>
                          {activeWinner?.winner_name || 'N/A'}
                        </p>

                        <div className="flex items-center gap-2 mt-1.5">
                          {activeWinner?.team_logo ? (
                            <img
                              src={activeWinner.team_logo}
                              alt={activeWinner.team_name}
                              className="w-5 h-5 object-contain shrink-0"
                            />
                          ) : (
                            <Shield className="w-4 h-4 text-stone-500 shrink-0" />
                          )}
                          <p className="font-bold text-xs uppercase tracking-tight text-stone-800 truncate">
                            {activeWinner?.subtitle_name || activeWinner?.team_name}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Active Winner Stat Line Badges */}
                    {activeWinner && (
                      <div className="bg-black text-white p-2.5 border border-black mb-3">
                        <div className="text-[9px] font-black uppercase tracking-widest text-yellow-400 mb-1 flex items-center justify-between">
                          <span>{activeWinner.season_badge} WINNING STAT LINE</span>
                          <span className="text-white">{activeWinner.team_abbr}</span>
                        </div>
                        {activeWinner.stat_badges.length > 1 ? (
                          <div className="grid grid-cols-5 gap-1 text-center">
                            {activeWinner.stat_badges.slice(0, 5).map((b, i) => (
                              <div key={i} className="bg-neutral-900 text-white px-1 py-1 border border-neutral-700">
                                <div className="text-[8px] font-bold text-neutral-300 uppercase">{b.label}</div>
                                <div className="text-xs font-black text-white">{b.value}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs font-mono font-bold text-white">{activeWinner.stat_line}</p>
                        )}
                        <p className="text-[10px] font-mono text-neutral-200 mt-1.5 truncate">
                          {activeWinner.stat_line}
                        </p>
                      </div>
                    )}

                    {/* Previous Winners Dropdown with Stat Lines */}
                    <div className="mt-2">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-black mb-1">
                        Previous W League Winners &amp; Stat Lines ({award.winners.length}):
                      </label>
                      <div className="relative">
                        <select
                          value={selectedIdx}
                          onChange={(e) =>
                            setSelectedWinnerIndexByAward((prev) => ({
                              ...prev,
                              [award.award_id]: Number(e.target.value)
                            }))
                          }
                          className="w-full bg-white border-2 border-black px-2.5 py-1.5 pr-7 text-xs font-bold text-black cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-black"
                        >
                          {award.winners.map((w, idx) => (
                            <option key={`${w.league_id}-${idx}`} value={idx}>
                              {w.season_badge}: {w.winner_name} ({w.team_abbr}) — {w.stat_line}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-black absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Description & NHL Comparable */}
                <div className="px-4 py-2.5 bg-stone-100 border-t-2 border-black flex items-center justify-between gap-2">
                  <p className="text-[11px] italic text-stone-800 truncate">{award.description}</p>
                  {award.nhl_comparable && award.nhl_comparable !== '--' && (
                    <span className="text-[9px] font-black uppercase bg-black text-white px-2 py-0.5 shrink-0">
                      NHL: {award.nhl_comparable}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
