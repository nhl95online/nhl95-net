import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { matchTeamFromList } from '@/lib/seasons';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://prdfunbzqsvqlyiwmuqp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                    '';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});


export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const seasonParam = searchParams.get('seasonId') || searchParams.get('league_id') || '40';
    const sId = Number(seasonParam) || 40;

    const result = await recalculateSeasonStandings(sId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error in GET /api/recalculate-standings:', err);
    return NextResponse.json({ error: err.message || 'Failed to recalculate standings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { seasonId, reassignGames, fixMhtToRic } = body as {
      seasonId?: number | string;
      reassignGames?: Array<{ fromTeam: string; toTeam: string; gameId?: number }>;
      fixMhtToRic?: boolean;
    };

    const sId = Number(seasonId) || 40;

    // 1. If fixMhtToRic is true or reassignGames specified, swap/reassign games in league_gamestats & league_schedule
    if (fixMhtToRic || (reassignGames && reassignGames.length > 0)) {
      // Fetch teams for this specific season
      const { data: seasonTeamsData } = await supabase
        .from('league_teams')
        .select('team_id, team_name, abbreviation, coach_id, league_id, league_coaches(coach_id, coach_name)')
        .eq('league_id', sId);

      const { data: allTeamsData } = await supabase
        .from('league_teams')
        .select('team_id, team_name, abbreviation, coach_id, league_id, league_coaches(coach_id, coach_name)');

      const seasonTeams = seasonTeamsData && seasonTeamsData.length > 0 ? seasonTeamsData : (allTeamsData || []);
      const allTeams = allTeamsData || [];

      // Identify MHT and RIC within this season
      const mhtTeamSeason = matchTeamFromList('MHT', seasonTeams);
      const ricTeamSeason = matchTeamFromList('RIC', seasonTeams);

      const mhtId = mhtTeamSeason?.team_id ? Number(mhtTeamSeason.team_id) : 0;
      const ricId = ricTeamSeason?.team_id ? Number(ricTeamSeason.team_id) : 0;

      // Find all possible team_ids for MHT across the database
      const allMhtIds = new Set<number>();
      if (mhtId) allMhtIds.add(mhtId);
      allTeams.forEach((t: any) => {
        const abbr = (t.abbreviation || '').trim().toUpperCase();
        const name = (t.team_name || '').trim().toUpperCase();
        const cId = Number(t.coach_id);
        if (abbr === 'MHT' || cId === 13 || name.includes('MINHATTRICK') || name.includes('MANOTICK')) {
          allMhtIds.add(Number(t.team_id));
        }
      });

      if (fixMhtToRic || reassignGames?.some(r => r.fromTeam === 'MHT' && r.toTeam === 'RIC')) {
        const targetRicId = ricId || (matchTeamFromList('RIC', allTeams)?.team_id ? Number(matchTeamFromList('RIC', allTeams)?.team_id) : 0);

        if (targetRicId) {
          const mhtIdArray = Array.from(allMhtIds);

          // Update gamestats home_team_id
          for (const mId of mhtIdArray) {
            await supabase
              .from('league_gamestats')
              .update({ 
                home_team_id: targetRicId,
                home_coach_id: 19,
                home_coach: 'bclinton_666'
              })
              .eq('league_id', sId)
              .eq('home_team_id', mId);

            await supabase
              .from('league_gamestats')
              .update({ 
                away_team_id: targetRicId,
                away_coach_id: 19,
                away_coach: 'bclinton_666'
              })
              .eq('league_id', sId)
              .eq('away_team_id', mId);
          }

          // Also update any gamestats that had coach_id 13 (segathon) in this season
          await supabase
            .from('league_gamestats')
            .update({
              home_team_id: targetRicId,
              home_coach_id: 19,
              home_coach: 'bclinton_666'
            })
            .eq('league_id', sId)
            .eq('home_coach_id', 13);

          await supabase
            .from('league_gamestats')
            .update({
              away_team_id: targetRicId,
              away_coach_id: 19,
              away_coach: 'bclinton_666'
            })
            .eq('league_id', sId)
            .eq('away_coach_id', 13);

          // Also clean up game_results strings in league_gamestats
          const { data: gamestatsRows } = await supabase
            .from('league_gamestats')
            .select('game_id, game_results')
            .eq('league_id', sId);

          if (gamestatsRows && gamestatsRows.length > 0) {
            for (const g of gamestatsRows) {
              if (g.game_results && g.game_results.includes('MHT')) {
                const updatedResults = g.game_results.replace(/\bMHT\b/g, 'RIC');
                await supabase
                  .from('league_gamestats')
                  .update({ game_results: updatedResults })
                  .eq('game_id', g.game_id);
              }
            }
          }

          // Reset schedule for MHT fixtures
          for (const mId of mhtIdArray) {
            await supabase
              .from('league_schedule')
              .update({ played: false })
              .eq('league_id', sId)
              .or(`home_team_id.eq.${mId},away_team_id.eq.${mId}`);
          }
        }
      }

      // Handle generic reassignments if specified
      if (reassignGames && reassignGames.length > 0) {
        for (const item of reassignGames) {
          const from = matchTeamFromList(item.fromTeam, seasonTeams) || matchTeamFromList(item.fromTeam, allTeams);
          const to = matchTeamFromList(item.toTeam, seasonTeams) || matchTeamFromList(item.toTeam, allTeams);
          if (from?.team_id && to?.team_id) {
            const fId = Number(from.team_id);
            const tId = Number(to.team_id);

            let queryHome = supabase
              .from('league_gamestats')
              .update({ home_team_id: tId })
              .eq('league_id', sId)
              .eq('home_team_id', fId);

            let queryAway = supabase
              .from('league_gamestats')
              .update({ away_team_id: tId })
              .eq('league_id', sId)
              .eq('away_team_id', fId);

            if (item.gameId) {
              queryHome = queryHome.eq('game_id', item.gameId);
              queryAway = queryAway.eq('game_id', item.gameId);
            }

            await Promise.all([queryHome, queryAway]);
          }
        }
      }
    }

    // 2. Perform full recalculation and sync to league_standings
    const result = await recalculateSeasonStandings(sId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error in POST /api/recalculate-standings:', err);
    return NextResponse.json({ error: err.message || 'Failed to process recalculation request' }, { status: 500 });
  }
}

async function recalculateSeasonStandings(sId: number) {
  // 1. Fetch all schedule fixtures for this season
  const { data: scheduleData, error: schedErr } = await supabase
    .from('league_schedule')
    .select('game_id, home_team_id, away_team_id, played, league_id')
    .eq('league_id', sId)
    .order('game_id', { ascending: true });

  if (schedErr) {
    console.error('Schedule query error:', schedErr);
  }

  // 2. Fetch all gamestats for this season
  const { data: statsData, error: statsErr } = await supabase
    .from('league_gamestats')
    .select('game_id, home_score, away_score, game_meta, league_id, home_team_id, away_team_id')
    .eq('league_id', sId);

  if (statsErr) {
    throw new Error(`Gamestats query failed: ${statsErr.message}`);
  }

  // 3. Fetch team metadata and existing standings
  const [teamsRes, existingStandingsRes] = await Promise.all([
    supabase.from('league_teams').select('team_id, team_name, abbreviation, conference, division, league_id'),
    supabase.from('league_standings').select('*').eq('season_id', sId)
  ]);

  const existingMap = new Map<number, any>();
  (existingStandingsRes.data || []).forEach((row: any) => {
    existingMap.set(Number(row.team_id), row);
  });

  const teamMetaMap = new Map<number, any>();
  (teamsRes.data || []).forEach((t: any) => {
    teamMetaMap.set(Number(t.team_id), t);
  });

  // 4. Identify all participating teams in this season
  const activeTeamIds = new Set<number>();
  (teamsRes.data || []).forEach((t: any) => {
    if (Number(t.league_id) === sId) {
      activeTeamIds.add(Number(t.team_id));
    }
  });

  (scheduleData || []).forEach((g: any) => {
    const h = Number(g.home_team_id);
    const a = Number(g.away_team_id);
    if (h && h !== 999 && h !== 0 && h !== 68) activeTeamIds.add(h);
    if (a && a !== 999 && a !== 0 && a !== 68) activeTeamIds.add(a);
  });

  (statsData || []).forEach((s: any) => {
    const h = Number(s.home_team_id);
    const a = Number(s.away_team_id);
    if (h && h !== 999 && h !== 0 && h !== 68) activeTeamIds.add(h);
    if (a && a !== 999 && a !== 0 && a !== 68) activeTeamIds.add(a);
  });

  // 5. Initialize team records accumulator
  const teamMap: Record<number, any> = {};
  activeTeamIds.forEach((tId: number) => {
    const existing = existingMap.get(tId);
    const teamInfo = teamMetaMap.get(tId);
    teamMap[tId] = {
      season_id: sId,
      team_id: tId,
      name: teamInfo?.team_name || `Retro Club #${tId}`,
      abbr: teamInfo?.abbreviation || `TM${tId}`,
      gp: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      pts: 0,
      gf: 0,
      ga: 0,
      otWins: 0,
      otLosses: 0,
      homeWins: 0,
      homeLosses: 0,
      homeTies: 0,
      awayWins: 0,
      awayLosses: 0,
      awayTies: 0,
      history: [] as string[],
      conference: existing?.conference?.trim() || teamInfo?.conference?.trim() || null,
      division: existing?.division?.trim() || teamInfo?.division?.trim() || null,
      clinch: existing?.clinch || null,
      is_champion: existing?.is_champion || false
    };
  });

  // 6. Aggregate played games
  const resolveTeamKey = (id: any): number | null => {
    const num = Number(id);
    if (!num || num === 999 || num === 0 || num === 68) return null;
    if (teamMap[num]) return num;

    const matchTeam = (teamsRes.data || []).find((t: any) => 
      Number(t.team_id) === num || 
      Number(t.coach_id) === num
    );

    if (matchTeam) {
      const seasonMatch = (teamsRes.data || []).find((t: any) => 
        Number(t.league_id) === sId && 
        (
          (t.abbreviation && t.abbreviation.trim().toUpperCase() === (matchTeam.abbreviation || '').trim().toUpperCase()) ||
          (t.team_name && t.team_name.trim().toUpperCase() === (matchTeam.team_name || '').trim().toUpperCase()) ||
          (Number(t.coach_id) > 0 && Number(t.coach_id) === Number(matchTeam.coach_id))
        )
      );

      if (seasonMatch && teamMap[Number(seasonMatch.team_id)]) {
        return Number(seasonMatch.team_id);
      }
    }

    const tInfo = matchTeam || (teamsRes.data || []).find((t: any) => Number(t.team_id) === num);
    teamMap[num] = {
      season_id: sId,
      team_id: num,
      name: tInfo?.team_name || `Retro Club #${num}`,
      abbr: tInfo?.abbreviation || `TM${num}`,
      gp: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      pts: 0,
      gf: 0,
      ga: 0,
      otWins: 0,
      otLosses: 0,
      homeWins: 0,
      homeLosses: 0,
      homeTies: 0,
      awayWins: 0,
      awayLosses: 0,
      awayTies: 0,
      history: [] as string[],
      conference: tInfo?.conference?.trim() || null,
      division: tInfo?.division?.trim() || null,
      clinch: null,
      is_champion: false
    };
    return num;
  };

  const processGameResult = (rawHId: any, rawAId: any, homeScore: number, awayScore: number, gameMeta: any) => {
    const hId = resolveTeamKey(rawHId);
    const aId = resolveTeamKey(rawAId);

    if (!hId || !aId || hId === aId) return;
    if (!teamMap[hId] || !teamMap[aId]) return;

    let isOT = false;
    let isTie = false;

    if (gameMeta) {
      try {
        const meta = typeof gameMeta === 'string' ? JSON.parse(gameMeta) : gameMeta;
        isOT = meta.is_ot === true || meta.is_ot === 'true' || meta.is_ot === 1 || meta.is_ot === '1';
        isTie = meta.is_tie === true || meta.is_tie === 'true' || meta.is_tie === 1 || meta.is_tie === '1';
      } catch {
        const lowStr = String(gameMeta || '').toLowerCase();
        isOT = lowStr.includes('"is_ot":true') || lowStr.includes('"is_ot":"true"') || lowStr.includes('"is_ot":1');
        isTie = lowStr.includes('"is_tie":true') || lowStr.includes('"is_tie":"true"') || lowStr.includes('"is_tie":1');
      }
    }

    if (homeScore === awayScore && !isOT) {
      isTie = true;
    }

    teamMap[hId].gp += 1;
    teamMap[aId].gp += 1;
    teamMap[hId].gf += homeScore;
    teamMap[hId].ga += awayScore;
    teamMap[aId].gf += awayScore;
    teamMap[aId].ga += homeScore;

    if (isTie) {
      teamMap[hId].ties += 1;
      teamMap[hId].homeTies += 1;
      teamMap[hId].pts += 1;
      teamMap[hId].history.push('T');

      teamMap[aId].ties += 1;
      teamMap[aId].awayTies += 1;
      teamMap[aId].pts += 1;
      teamMap[aId].history.push('T');
    } else if (homeScore > awayScore) {
      // Home Team Wins
      teamMap[hId].wins += 1;
      teamMap[hId].homeWins += 1;
      teamMap[hId].pts += 2;
      teamMap[hId].history.push('W');

      if (isOT) {
        teamMap[hId].otWins += 1;
        // Away Team loses in OT: gets 1 point, 0 regulation losses, increment OTL
        teamMap[aId].otLosses += 1;
        teamMap[aId].pts += 1;
        teamMap[aId].history.push('OTL');
      } else {
        // Away Team loses in Regulation: increment regulation losses (L)
        teamMap[aId].losses += 1;
        teamMap[aId].awayLosses += 1;
        teamMap[aId].history.push('L');
      }
    } else if (awayScore > homeScore) {
      // Away Team Wins
      teamMap[aId].wins += 1;
      teamMap[aId].awayWins += 1;
      teamMap[aId].pts += 2;
      teamMap[aId].history.push('W');

      if (isOT) {
        teamMap[aId].otWins += 1;
        // Home Team loses in OT: gets 1 point, 0 regulation losses, increment OTL
        teamMap[hId].otLosses += 1;
        teamMap[hId].pts += 1;
        teamMap[hId].history.push('OTL');
      } else {
        // Home Team loses in Regulation: increment regulation losses (L)
        teamMap[hId].losses += 1;
        teamMap[hId].homeLosses += 1;
        teamMap[hId].history.push('L');
      }
    }
  };

  // Process all games in league_gamestats
  const processedStatsGameIds = new Set<string>();
  (statsData || []).forEach((stats: any) => {
    const gIdStr = String(stats.game_id).trim();
    processedStatsGameIds.add(gIdStr);

    const homeScore = Number(stats.home_score) || 0;
    const awayScore = Number(stats.away_score) || 0;
    processGameResult(stats.home_team_id, stats.away_team_id, homeScore, awayScore, stats.game_meta);
  });

  // Also process any schedule fixtures marked played
  (scheduleData || []).forEach((game: any) => {
    const gIdStr = String(game.game_id).trim();
    const rawPlayed = String(game.played || '').trim().toLowerCase();
    const isPlayed = rawPlayed === 'true' || rawPlayed === '1' || rawPlayed === 'y';

    if (isPlayed && !processedStatsGameIds.has(gIdStr) && (game as any).game_meta) {
      const homeScore = Number((game as any).home_score) || 0;
      const awayScore = Number((game as any).away_score) || 0;
      processGameResult(game.home_team_id, game.away_team_id, homeScore, awayScore, (game as any).game_meta);
    }
  });

  // 7. Format rows for league_standings table
  const standingsRows = Object.values(teamMap).map((team: any) => {
    let streakStr = '-';
    if (team.history.length > 0) {
      const lastResult = team.history[team.history.length - 1];
      let count = 0;
      for (let i = team.history.length - 1; i >= 0; i--) {
        if (team.history[i] === lastResult) {
          count++;
        } else {
          break;
        }
      }
      streakStr = `${lastResult}${count}`;
    }

    const last10 = team.history.slice(-10);
    const l10W = last10.filter((r: string) => r === 'W').length;
    const l10L = last10.filter((r: string) => r === 'L').length;
    const l10T = last10.filter((r: string) => r === 'T').length;

    return {
      season_id: sId,
      team_id: team.team_id,
      gp: team.gp,
      w: team.wins,
      l: team.losses,
      t: team.ties,
      pts: team.pts,
      gf: team.gf,
      ga: team.ga,
      gd: team.gf - team.ga,
      otw: team.otWins,
      otl: team.otLosses,
      strk: streakStr,
      l10: `${l10W}-${l10L}-${l10T}`,
      home: `${team.homeWins}-${team.homeLosses}-${team.homeTies}`,
      away: `${team.awayWins}-${team.awayLosses}-${team.awayTies}`,
      conference: team.conference,
      division: team.division,
      clinch: team.clinch,
      is_champion: team.is_champion
    };
  });

  // 8. Overwrite / Upsert into league_standings
  const { error: upsertErr } = await supabase
    .from('league_standings')
    .upsert(standingsRows, { onConflict: 'season_id,team_id' });

  if (upsertErr) {
    await supabase.from('league_standings').delete().eq('season_id', sId);
    await supabase.from('league_standings').insert(standingsRows);
  }

  // 9. Mark all games with stats as played in league_schedule
  if (processedGameIds.size > 0) {
    const playedIds = Array.from(processedGameIds).map(Number).filter(Boolean);
    await supabase
      .from('league_schedule')
      .update({ played: true })
      .in('game_id', playedIds);
  }

  return {
    success: true,
    seasonId: sId,
    totalGamesProcessed: processedGameIds.size,
    totalTeams: standingsRows.length,
    standings: standingsRows
  };
}
