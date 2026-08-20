import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase as defaultSupabase } from '@/lib/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://prdfunbzqsvqlyiwmuqp.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = serviceKey
  ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  : defaultSupabase;

import {
  parseTimeToDayFraction,
  getLeagueCode,
  TEAM_CITY_ALIASES,
  W_LEAGUE_COACH_MAP,
  matchTeamFromList
} from '@/lib/seasons';

export {
  parseTimeToDayFraction,
  getLeagueCode,
  TEAM_CITY_ALIASES,
  W_LEAGUE_COACH_MAP,
  matchTeamFromList
};

function generateDeterministicId(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash) % 100000 + 1000;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { game, seasonId, targetGameId, allowOverwrite } = body as {
      game: any;
      seasonId: number | string;
      targetGameId?: number;
      allowOverwrite?: boolean;
    };

    if (!game) {
      return NextResponse.json({ error: 'No game data provided' }, { status: 400 });
    }


    const sId = Number(seasonId) || 40;
    const homeTeamCode = (game.homeTeam?.teamCode || 'HOME').toUpperCase();
    const awayTeamCode = (game.awayTeam?.teamCode || 'AWAY').toUpperCase();

    // 1. Fetch Teams and Coaches from Supabase (scoped to season first)
    let teamsData: any[] | null = null;
    const { data: seasonTeams } = await supabase
      .from('league_teams')
      .select('team_id, team_name, abbreviation, coach_id, league_id, league_coaches(coach_id, coach_name)')
      .eq('league_id', sId);

    if (seasonTeams && seasonTeams.length > 0) {
      teamsData = seasonTeams;
    } else {
      const { data: allTeams } = await supabase
        .from('league_teams')
        .select('team_id, team_name, abbreviation, coach_id, league_id, league_coaches(coach_id, coach_name)');
      teamsData = allTeams;
    }

    const knownHome = W_LEAGUE_COACH_MAP[homeTeamCode];
    const knownAway = W_LEAGUE_COACH_MAP[awayTeamCode];

    const homeTeam = matchTeamFromList(homeTeamCode, teamsData || []);
    const awayTeam = matchTeamFromList(awayTeamCode, teamsData || []);

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

    // 2. Fetch ALL Rosters for this active season (league_id: sId)
    const { data: seasonRosters } = await supabase
      .from('league_rosters')
      .select('player_id, player_name, team_id, league_id')
      .eq('league_id', sId);

    // Also fetch all rosters across all seasons for these two teams as secondary fallback
    const { data: allSeasonRosters } = await supabase
      .from('league_rosters')
      .select('player_id, player_name, team_id, league_id')
      .in('team_id', [homeTeamId, awayTeamId]);

    const getPlayerId = (name: string, teamId: number): number => {
      if (!name || name === '--') return 1;
      const clean = name.trim().toLowerCase();
      const lastName = clean.split(' ').pop() || clean;

      // 1. EXACT match on this specific team in the active season roster
      const exactTeamRoster = seasonRosters?.find(
        r => Number(r.team_id) === Number(teamId) && r.player_name?.trim().toLowerCase() === clean
      );
      if (exactTeamRoster?.player_id) return Number(exactTeamRoster.player_id);

      // 2. PARTIAL / CONTAINS match on this specific team in the active season roster
      const partialTeamRoster = seasonRosters?.find(
        r => Number(r.team_id) === Number(teamId) && (
          r.player_name?.trim().toLowerCase().includes(clean) ||
          clean.includes(r.player_name?.trim().toLowerCase()) ||
          (lastName.length > 2 && r.player_name?.trim().toLowerCase().includes(lastName))
        )
      );
      if (partialTeamRoster?.player_id) return Number(partialTeamRoster.player_id);

      // 3. ANY team in the active season roster (handles player trades / line switches)
      const anySeasonRoster = seasonRosters?.find(
        r => r.player_name?.trim().toLowerCase() === clean ||
             (lastName.length > 2 && r.player_name?.trim().toLowerCase().includes(lastName))
      );
      if (anySeasonRoster?.player_id) return Number(anySeasonRoster.player_id);

      // 4. Historical rosters for this team in any previous season
      const historicalTeamRoster = allSeasonRosters?.find(
        r => Number(r.team_id) === Number(teamId) && (
          r.player_name?.trim().toLowerCase() === clean ||
          (lastName.length > 2 && r.player_name?.trim().toLowerCase().includes(lastName))
        )
      );
      if (historicalTeamRoster?.player_id) return Number(historicalTeamRoster.player_id);

      // 5. Default fallback to 1
      return 1;
    };

    // 3. Resolve Game ID (Matching schedule or Target Game ID or next available)
    let finalGameId = targetGameId ? Number(targetGameId) : 0;

    // Check for scheduled games in this season for this matchup
    const { data: scheduledGames } = await supabase
      .from('league_schedule')
      .select('game_id, played, home_team_id, away_team_id')
      .eq('league_id', sId)
      .eq('home_team_id', homeTeamId)
      .eq('away_team_id', awayTeamId)
      .order('game_id', { ascending: true });

    if (!finalGameId) {
      if (scheduledGames && scheduledGames.length > 0) {
        const schedIds = scheduledGames.map(g => g.game_id);
        const { data: playedGames } = await supabase
          .from('league_gamestats')
          .select('game_id')
          .in('game_id', schedIds);

        const playedSet = new Set((playedGames || []).map(p => p.game_id));
        const unplayed = scheduledGames.find(g => {
          const rawPlayed = String(g.played || '').trim().toLowerCase();
          const isPlayed = rawPlayed === 'true' || rawPlayed === '1' || rawPlayed === 'y' || rawPlayed === 'yes';
          return !isPlayed && !playedSet.has(g.game_id);
        });

        if (unplayed) {
          finalGameId = Number(unplayed.game_id);
        } else {
          // ALL scheduled games between these teams for this season have ALREADY been played!
          if (!allowOverwrite) {
            return NextResponse.json({
              error: `Matchup already completed! All scheduled games between ${awayTeamCode} and ${homeTeamCode} for Season ${sId} have already been played and recorded in league_schedule (Game #${schedIds.join(', #')}). Another game cannot be submitted to prevent duplicate entries.`,
              alreadyPlayed: true,
              playedGameIds: schedIds
            }, { status: 409 });
          } else {
            // Overwrite allowed: overwrite the last played game
            finalGameId = Number(schedIds[schedIds.length - 1]);
          }
        }
      }
    }

    if (!finalGameId) {
      const { data: latestGame } = await supabase
        .from('league_gamestats')
        .select('game_id')
        .order('game_id', { ascending: false })
        .limit(1);

      finalGameId = (latestGame && latestGame.length > 0 && latestGame[0].game_id)
        ? Number(latestGame[0].game_id) + 1
        : 1;
    }

    // 4. Format game_meta and game_results
    const gameMeta = {
      is_ot: Boolean(game.isOT),
      is_tie: Number(game.homeTeam?.goals) === Number(game.awayTeam?.goals),
      league: getLeagueCode(sId),
      league_mode: 'Season'
    };

    const gameResults = `${awayTeamCode} ${game.awayTeam?.goals || 0} - ${game.homeTeam?.goals || 0} ${homeTeamCode}`;

    // 5. Format home_stats and away_stats JSON
    const homeStats = {
      home_atk: parseTimeToDayFraction(game.homeTeam?.attackZoneTime),
      home_pen: String(game.homeTeam?.penalties || 0),
      home_pim: String(game.homeTeam?.pim || 0),
      home_goals: String(game.homeTeam?.goals || 0),
      home_shots: String(game.homeTeam?.shots || 0),
      home_pp_opps: String(game.homeTeam?.ppTries || 0),
      home_ot_goals: String(game.homeTeam?.goalsOT || 0),
      home_ot_shots: String(game.homeTeam?.shotsOT || 0),
      home_pp_goals: String(game.homeTeam?.ppGoals || 0),
      home_pp_shots: String(game.homeTeam?.ppShots || 0),
      home_sh_goals: String(game.homeTeam?.shGoals || 0),
      home_1st_goals: String(game.homeTeam?.goalsP1 || 0),
      home_1st_shots: String(game.homeTeam?.shotsP1 || 0),
      home_2nd_goals: String(game.homeTeam?.goalsP2 || 0),
      home_2nd_shots: String(game.homeTeam?.shotsP2 || 0),
      home_3rd_goals: String(game.homeTeam?.goalsP3 || 0),
      home_3rd_shots: String(game.homeTeam?.shotsP3 || 0),
      home_onetimers: String(game.homeTeam?.oneTimerTries || 0),
      home_bodychecks: String(game.homeTeam?.checks || 0),
      home_breakaways: String(game.homeTeam?.breakawayTries || 0),
      home_pp_minutes: parseTimeToDayFraction(game.homeTeam?.ppTime),
      home_faceoff_won: String(game.homeTeam?.faceoffWins || 0),
      home_pass_attempts: String(game.homeTeam?.passTries || 0),
      home_penalty_shots: String(game.homeTeam?.penaltyShotTries || 0),
      home_onetimer_goals: String(game.homeTeam?.oneTimerGoals || 0),
      home_breakaway_goals: String(game.homeTeam?.breakawayGoals || 0),
      home_pass_completions: String(game.homeTeam?.passComps || 0),
      home_penalty_shot_goals: String(game.homeTeam?.penaltyShotGoals || 0)
    };

    const awayStats = {
      away_atk: parseTimeToDayFraction(game.awayTeam?.attackZoneTime),
      away_pen: String(game.awayTeam?.penalties || 0),
      away_pim: String(game.awayTeam?.pim || 0),
      away_goals: String(game.awayTeam?.goals || 0),
      away_shots: String(game.awayTeam?.shots || 0),
      away_pp_opps: String(game.awayTeam?.ppTries || 0),
      away_ot_goals: String(game.awayTeam?.goalsOT || 0),
      away_ot_shots: String(game.awayTeam?.shotsOT || 0),
      away_pp_goals: String(game.awayTeam?.ppGoals || 0),
      away_pp_shots: String(game.awayTeam?.ppShots || 0),
      away_sh_goals: String(game.awayTeam?.shGoals || 0),
      away_1st_goals: String(game.awayTeam?.goalsP1 || 0),
      away_1st_shots: String(game.awayTeam?.shotsP1 || 0),
      away_2nd_goals: String(game.awayTeam?.goalsP2 || 0),
      away_2nd_shots: String(game.awayTeam?.shotsP2 || 0),
      away_3rd_goals: String(game.awayTeam?.goalsP3 || 0),
      away_3rd_shots: String(game.awayTeam?.shotsP3 || 0),
      away_onetimers: String(game.awayTeam?.oneTimerTries || 0),
      away_bodychecks: String(game.awayTeam?.checks || 0),
      away_breakaways: String(game.awayTeam?.breakawayTries || 0),
      away_pp_minutes: parseTimeToDayFraction(game.awayTeam?.ppTime),
      away_faceoff_won: String(game.awayTeam?.faceoffWins || 0),
      away_pass_attempts: String(game.awayTeam?.passTries || 0),
      away_penalty_shots: String(game.awayTeam?.penaltyShotTries || 0),
      away_onetimer_goals: String(game.awayTeam?.oneTimerGoals || 0),
      away_breakaway_goals: String(game.awayTeam?.breakawayGoals || 0),
      away_pass_completions: String(game.awayTeam?.passComps || 0),
      away_penalty_shot_goals: String(game.awayTeam?.penaltyShotGoals || 0)
    };

    const rawGameLength = game.gameLength || '15:00';
    const formattedGameLength = rawGameLength.includes(':') && rawGameLength.split(':').length === 2
      ? `${rawGameLength}:00`
      : rawGameLength;

    // 6. Assemble Row for league_gamestats
    const gamestatsRow = {
      game_id: finalGameId,
      league_id: sId,
      game_meta: gameMeta,
      game_results: gameResults,
      home_team_id: homeTeamId,
      home_coach_id: homeCoachId,
      home_coach: homeCoachName,
      home_score: Number(game.homeTeam?.goals || 0),
      home_stats: homeStats,
      away_team_id: awayTeamId,
      away_coach_id: awayCoachId,
      away_coach: awayCoachName,
      away_score: Number(game.awayTeam?.goals || 0),
      away_stats: awayStats,
      total_faceoffs: Number(game.totalFaceoffs || 0),
      game_length: formattedGameLength
    };

    // 7. Insert into league_gamestats (UPSERT to avoid unique collision)
    const { data: insertedGame, error: insertGameErr } = await supabase
      .from('league_gamestats')
      .upsert(gamestatsRow, { onConflict: 'game_id' })
      .select();

    if (insertGameErr) {
      console.error('Supabase gamestats insert error:', insertGameErr);
      return NextResponse.json({
        error: insertGameErr.message,
        details: insertGameErr.details || insertGameErr.hint
      }, { status: 500 });
    }

    // 8. Assemble Rows for league_player_stats_master
    // Determine Game Winning Goal (GWG) and Overtime Goal (OTG)
    const homeGoals = Number(game.homeTeam?.goals || 0);
    const awayGoals = Number(game.awayTeam?.goals || 0);
    const isHomeWin = homeGoals > awayGoals;
    const isAwayWin = awayGoals > homeGoals;

    let gwgScorerName: string | null = null;
    let otgScorerName: string | null = null;

    if (isHomeWin) {
      const homeScoringGoals = (game.goals || []).filter((g: any) => g.side === 'Home');
      if (homeScoringGoals[awayGoals]) {
        gwgScorerName = homeScoringGoals[awayGoals].scorer;
      }
    } else if (isAwayWin) {
      const awayScoringGoals = (game.goals || []).filter((g: any) => g.side === 'Away');
      if (awayScoringGoals[homeGoals]) {
        gwgScorerName = awayScoringGoals[homeGoals].scorer;
      }
    }

    if (game.isOT && (isHomeWin || isAwayWin)) {
      const lastGoal = (game.goals || [])[game.goals?.length - 1];
      if (lastGoal && Number(lastGoal.period) >= 4) {
        otgScorerName = lastGoal.scorer;
      }
    }

    const playerStatsRows: any[] = [];

    // Away Skaters
    (game.awaySkaters || []).forEach((s: any) => {
      const ppg = (game.goals || []).filter((g: any) => g.scorer === s.name && g.type?.startsWith('PP')).length;
      const shg = (game.goals || []).filter((g: any) => g.scorer === s.name && g.type?.startsWith('SH')).length;
      const evg = Math.max(0, (Number(s.goals) || 0) - ppg - shg);
      const isGWG = gwgScorerName && s.name?.trim().toLowerCase() === gwgScorerName.trim().toLowerCase() ? 1 : 0;
      const isOTG = otgScorerName && s.name?.trim().toLowerCase() === otgScorerName.trim().toLowerCase() ? 1 : 0;

      playerStatsRows.push({
        game_id: finalGameId,
        league_id: sId,
        team_id: awayTeamId,
        player_id: getPlayerId(s.name, awayTeamId),
        pos_played: s.pos || 'F',
        goals: Number(s.goals) || 0,
        assists: Number(s.assists) || 0,
        shots: Number(s.sog) || 0,
        checks: Number(s.checks) || 0,
        pim: Number(s.pim) || 0,
        pp_points: Number(s.ppp) || 0,
        sh_points: Number(s.shp) || 0,
        evg: Number(evg) || 0,
        gwg: isGWG,
        otg: isOTG,
        toi: Number(s.toiSeconds) || 0,
        saves: 0,
        shots_against: 0,
        goals_against: 0,
        is_win: false,
        is_loss: false,
        is_tie: false,
        is_otl: false
      });
    });

    // Home Skaters
    (game.homeSkaters || []).forEach((s: any) => {
      const ppg = (game.goals || []).filter((g: any) => g.scorer === s.name && g.type?.startsWith('PP')).length;
      const shg = (game.goals || []).filter((g: any) => g.scorer === s.name && g.type?.startsWith('SH')).length;
      const evg = Math.max(0, (Number(s.goals) || 0) - ppg - shg);
      const isGWG = gwgScorerName && s.name?.trim().toLowerCase() === gwgScorerName.trim().toLowerCase() ? 1 : 0;
      const isOTG = otgScorerName && s.name?.trim().toLowerCase() === otgScorerName.trim().toLowerCase() ? 1 : 0;

      playerStatsRows.push({
        game_id: finalGameId,
        league_id: sId,
        team_id: homeTeamId,
        player_id: getPlayerId(s.name, homeTeamId),
        pos_played: s.pos || 'F',
        goals: Number(s.goals) || 0,
        assists: Number(s.assists) || 0,
        shots: Number(s.sog) || 0,
        checks: Number(s.checks) || 0,
        pim: Number(s.pim) || 0,
        pp_points: Number(s.ppp) || 0,
        sh_points: Number(s.shp) || 0,
        evg: Number(evg) || 0,
        gwg: isGWG,
        otg: isOTG,
        toi: Number(s.toiSeconds) || 0,
        saves: 0,
        shots_against: 0,
        goals_against: 0,
        is_win: false,
        is_loss: false,
        is_tie: false,
        is_otl: false
      });
    });

    // Away Goalies
    (game.awayGoalies || []).forEach((g: any) => {
      playerStatsRows.push({
        game_id: finalGameId,
        league_id: sId,
        team_id: awayTeamId,
        player_id: getPlayerId(g.name, awayTeamId),
        pos_played: 'G',
        goals: Number(g.goals) || 0,
        assists: Number(g.assists) || 0,
        shots: 0,
        checks: 0,
        pim: 0,
        pp_points: 0,
        sh_points: 0,
        evg: 0,
        gwg: 0,
        otg: 0,
        toi: Number(g.toiSeconds) || 0,
        saves: Number(g.saves) || 0,
        shots_against: Number(g.shots) || 0,
        goals_against: Number(g.ga) || 0,
        is_win: Boolean(g.w),
        is_loss: Boolean(g.l),
        is_tie: Boolean(g.t),
        is_otl: Boolean(g.otl)
      });
    });

    // Home Goalies
    (game.homeGoalies || []).forEach((g: any) => {
      playerStatsRows.push({
        game_id: finalGameId,
        league_id: sId,
        team_id: homeTeamId,
        player_id: getPlayerId(g.name, homeTeamId),
        pos_played: 'G',
        goals: Number(g.goals) || 0,
        assists: Number(g.assists) || 0,
        shots: 0,
        checks: 0,
        pim: 0,
        pp_points: 0,
        sh_points: 0,
        evg: 0,
        gwg: 0,
        otg: 0,
        toi: Number(g.toiSeconds) || 0,
        saves: Number(g.saves) || 0,
        shots_against: Number(g.shots) || 0,
        goals_against: Number(g.ga) || 0,
        is_win: Boolean(g.w),
        is_loss: Boolean(g.l),
        is_tie: Boolean(g.t),
        is_otl: Boolean(g.otl)
      });
    });

    // Clean existing rows for this game and insert new player stats
    await supabase.from('league_player_stats_master').delete().eq('game_id', finalGameId);
    const { error: insertPlayerErr } = await supabase
      .from('league_player_stats_master')
      .insert(playerStatsRows);

    if (insertPlayerErr) {
      console.error('Error inserting league_player_stats_master:', insertPlayerErr);
    }

    // 9. Assemble Rows for league_scoring (matching exact schema with time, team, scorer, assist1, assist2, way)
    const scoringRows = (game.goals || []).map((g: any) => {
      const gTeamId = g.side === 'Home' ? homeTeamId : awayTeamId;
      const gTeamCode = g.side === 'Home' ? homeTeamCode : awayTeamCode;

      const scorerId = getPlayerId(g.scorer, gTeamId);
      const a1Valid = g.assist1 && g.assist1 !== '--';
      const a2Valid = g.assist2 && g.assist2 !== '--';

      const a1Id = a1Valid ? (getPlayerId(g.assist1, gTeamId) || null) : null;
      const a2Id = a2Valid ? (getPlayerId(g.assist2, gTeamId) || null) : null;

      return {
        game_id: finalGameId,
        league_id: sId,
        period: Number(g.period),
        time: String(g.time),
        team_id: gTeamId,
        team: gTeamCode,
        scorer_id: scorerId,
        scorer: String(g.scorer),
        assist1_id: a1Id,
        assist1: a1Valid ? String(g.assist1) : null,
        assist2_id: a2Id,
        assist2: a2Valid ? String(g.assist2) : null,
        way: String(g.type || 'EV')
      };
    });

    await supabase.from('league_scoring').delete().eq('game_id', finalGameId);
    let insertScoringErr: any = null;
    if (scoringRows.length > 0) {
      const res = await supabase
        .from('league_scoring')
        .insert(scoringRows);
      insertScoringErr = res.error;

      if (insertScoringErr) {
        console.error('Error inserting league_scoring:', insertScoringErr);
      }
    }

    // 10. Assemble Rows for league_penalties (matching exact schema with period, time, team_id, team, player_id, player, penalty_type)
    const penaltyRows = (game.penalties || []).map((p: any) => {
      const pTeamId = p.side === 'Home' ? homeTeamId : awayTeamId;
      const pTeamCode = p.side === 'Home' ? homeTeamCode : awayTeamCode;
      const playerId = getPlayerId(p.player, pTeamId);
      return {
        game_id: finalGameId,
        league_id: sId,
        period: Number(p.period),
        time: String(p.time),
        team_id: pTeamId,
        team: pTeamCode,
        player_id: playerId,
        player: String(p.player),
        penalty_type: String(p.type)
      };
    });

    await supabase.from('league_penalties').delete().eq('game_id', finalGameId);
    let insertPenErr: any = null;
    if (penaltyRows.length > 0) {
      const res = await supabase
        .from('league_penalties')
        .insert(penaltyRows);
      insertPenErr = res.error;

      if (insertPenErr) {
        console.error('Error inserting league_penalties:', insertPenErr);
      }
    }

    // 11. Update league_schedule to mark this game as played (played: true)
    let scheduleUpdateSuccess = false;
    let scheduleUpdateErr: any = null;

    const schedUpdateRes = await supabase
      .from('league_schedule')
      .update({
        played: true,
        game_meta: gameMeta
      })
      .eq('game_id', finalGameId);

    if (schedUpdateRes.error) {
      console.error('Error updating league_schedule by game_id:', schedUpdateRes.error);
      scheduleUpdateErr = schedUpdateRes.error;

      // Fallback: try updating with string 'true' or string game_id
      const fallbackRes = await supabase
        .from('league_schedule')
        .update({
          played: 'true' as any,
          game_meta: gameMeta
        })
        .eq('game_id', String(finalGameId));

      if (!fallbackRes.error) {
        scheduleUpdateSuccess = true;
        scheduleUpdateErr = null;
      }
    } else {
      scheduleUpdateSuccess = true;
    }

    if (homeTeamId && awayTeamId) {
      await supabase
        .from('league_schedule')
        .update({
          played: true,
          game_meta: gameMeta
        })
        .eq('league_id', sId)
        .eq('home_team_id', homeTeamId)
        .eq('away_team_id', awayTeamId)
        .eq('game_id', finalGameId);
    }

    // 12. Recalculate and synchronize league_standings for this active season
    const standingsResult = await recalculateAndSaveSeasonStandings(sId);

    // 13. Automatically broadcast rich Boxscore to Discord server
    let discordSent = false;
    try {
      await sendDiscordBoxscore({
        game,
        seasonId: sId,
        gameId: finalGameId,
        homeTeamName: homeTeam?.team_name || homeTeamCode,
        awayTeamName: awayTeam?.team_name || awayTeamCode,
        homeCoachName,
        awayCoachName
      });
      discordSent = true;
    } catch (discErr) {
      console.warn("Could not post boxscore to Discord:", discErr);
    }

    const tableErrors: Record<string, string> = {};
    if (insertPlayerErr) tableErrors['league_player_stats_master'] = insertPlayerErr.message || JSON.stringify(insertPlayerErr);
    if (insertScoringErr) tableErrors['league_scoring'] = insertScoringErr.message || JSON.stringify(insertScoringErr);
    if (insertPenErr) tableErrors['league_penalties'] = insertPenErr.message || JSON.stringify(insertPenErr);
    if (scheduleUpdateErr) tableErrors['league_schedule'] = scheduleUpdateErr.message || JSON.stringify(scheduleUpdateErr);
    if (!standingsResult.success) tableErrors['league_standings'] = standingsResult.error || 'Failed updating standings';

    return NextResponse.json({
      success: true,
      gameId: finalGameId,
      message: `Game #${finalGameId} (${gameResults}) saved to Supabase!`,
      details: {
        gamestats: true,
        scheduleUpdated: !scheduleUpdateErr,
        standingsUpdated: standingsResult.success,
        standingsTeamsUpdated: standingsResult.updatedRows || 0,
        playerStatsInserted: !insertPlayerErr,
        playerRows: playerStatsRows.length,
        scoringInserted: !insertScoringErr,
        scoringRows: scoringRows.length,
        penaltiesInserted: !insertPenErr,
        penaltyRows: penaltyRows.length,
        discordBroadcast: discordSent,
        tableErrors: Object.keys(tableErrors).length > 0 ? tableErrors : undefined
      },
      insertedRow: insertedGame?.[0] || gamestatsRow
    });
  } catch (error: any) {
    console.error('Error saving game to Supabase:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save game to Supabase' },
      { status: 500 }
    );
  }
}

async function recalculateAndSaveSeasonStandings(sId: number): Promise<{ success: boolean; updatedRows?: number; error?: string }> {
  try {
    // 1. Fetch all schedule fixtures for this season
    const { data: scheduleData, error: schedErr } = await supabase
      .from('league_schedule')
      .select('game_id, home_team_id, away_team_id, played, league_id')
      .eq('league_id', sId)
      .order('game_id', { ascending: true });

    if (schedErr) {
      console.error('recalculateAndSaveSeasonStandings schedule query error:', schedErr);
      return { success: false, error: schedErr.message };
    }

    // 2. Fetch all gamestats results for this season
    const { data: statsData, error: statsErr } = await supabase
      .from('league_gamestats')
      .select('game_id, home_score, away_score, game_meta, league_id, home_team_id, away_team_id')
      .eq('league_id', sId);

    if (statsErr) {
      console.error('recalculateAndSaveSeasonStandings gamestats query error:', statsErr);
      return { success: false, error: statsErr.message };
    }

    // 3. Fetch team metadata and current standings to preserve division/conference/clinch/champion flags
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

    if (standingsRows.length === 0) {
      return { success: true, updatedRows: 0 };
    }

    // 8. Upsert into league_standings (with fallback to delete + insert)
    const { error: upsertErr } = await supabase
      .from('league_standings')
      .upsert(standingsRows, { onConflict: 'season_id,team_id' });

    if (upsertErr) {
      console.warn('league_standings upsert warning, fallback to delete+insert:', upsertErr.message);
      await supabase.from('league_standings').delete().eq('season_id', sId);
      const { error: insertErr } = await supabase.from('league_standings').insert(standingsRows);
      if (insertErr) {
        console.error('Error inserting into league_standings:', insertErr);
        return { success: false, error: insertErr.message };
      }
    }

    return { success: true, updatedRows: standingsRows.length };
  } catch (err: any) {
    console.error('Exception in recalculateAndSaveSeasonStandings:', err);
    return { success: false, error: err.message };
  }
}

async function sendDiscordBoxscore(params: {
  game: any;
  seasonId: number | string;
  gameId: number;
  homeTeamName: string;
  awayTeamName: string;
  homeCoachName: string;
  awayCoachName: string;
}) {
  const webhookUrl = process.env.DISCORD_BOXSCORE_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_BOXSCORE_CHANNEL_ID || process.env.DISCORD_CHANNEL_ID;

  if (!webhookUrl && (!botToken || !channelId)) {
    console.log("No Discord Boxscore Webhook or Channel configured, skipping Discord boxscore push.");
    return { skipped: true };
  }

  const { game, seasonId, gameId, homeCoachName, awayCoachName } = params;
  const awayCode = (game.awayTeam?.teamCode || 'AWAY').toUpperCase();
  const homeCode = (game.homeTeam?.teamCode || 'HOME').toUpperCase();
  const awayGoals = Number(game.awayTeam?.goals || 0);
  const homeGoals = Number(game.homeTeam?.goals || 0);
  const isOT = Boolean(game.isOT);

  // Determine top performers / 3 stars
  const allSkaters = [
    ...(game.awaySkaters || []).map((s: any) => ({ ...s, side: awayCode })),
    ...(game.homeSkaters || []).map((s: any) => ({ ...s, side: homeCode }))
  ].sort((a: any, b: any) => (Number(b.points) || 0) - (Number(a.points) || 0) || (Number(b.goals) || 0) - (Number(a.goals) || 0));

  const allGoalies = [
    ...(game.awayGoalies || []).map((g: any) => ({ ...g, side: awayCode })),
    ...(game.homeGoalies || []).map((g: any) => ({ ...g, side: homeCode }))
  ].sort((a: any, b: any) => (Number(b.saves) || 0) - (Number(a.saves) || 0));

  const stars: string[] = [];
  if (allSkaters[0] && (allSkaters[0].points > 0 || allSkaters[0].goals > 0)) {
    stars.push(`🥇 **${allSkaters[0].name}** (${allSkaters[0].side}) — ${allSkaters[0].goals}G, ${allSkaters[0].assists}A (${allSkaters[0].points} PTS)`);
  }
  if (allSkaters[1] && (allSkaters[1].points > 0 || allSkaters[1].goals > 0)) {
    stars.push(`🥈 **${allSkaters[1].name}** (${allSkaters[1].side}) — ${allSkaters[1].goals}G, ${allSkaters[1].assists}A (${allSkaters[1].points} PTS)`);
  }
  if (allGoalies[0] && allGoalies[0].shots > 0) {
    stars.push(`🥉 **${allGoalies[0].name}** (${allGoalies[0].side}) — ${allGoalies[0].saves} SV, ${allGoalies[0].shots} SH (.${Math.round((allGoalies[0].savePct || 0) * 1000)} SV%)`);
  }

  // Scoring list
  const scoringLines = (game.goals || []).slice(0, 12).map((g: any) => {
    const assists = [g.assist1, g.assist2].filter((a: any) => a && a !== '--').join(', ');
    const assistStr = assists ? ` (${assists})` : '';
    const typeStr = g.type && g.type !== 'EV' ? ` [${g.type}]` : '';
    return `• **P${g.period} ${g.time}** - ${g.team} **${g.scorer}**${assistStr}${typeStr}`;
  });

  const periodTable = `\`\`\`\n` +
    `Team   1   2   3  ${isOT ? 'OT  ' : ''}T\n` +
    `${awayCode.padEnd(5)} ${String(game.awayTeam?.goalsP1 || 0).padStart(2)}  ${String(game.awayTeam?.goalsP2 || 0).padStart(2)}  ${String(game.awayTeam?.goalsP3 || 0).padStart(2)}  ${isOT ? String(game.awayTeam?.goalsOT || 0).padStart(2) + '  ' : ''}${String(awayGoals).padStart(2)}\n` +
    `${homeCode.padEnd(5)} ${String(game.homeTeam?.goalsP1 || 0).padStart(2)}  ${String(game.homeTeam?.goalsP2 || 0).padStart(2)}  ${String(game.homeTeam?.goalsP3 || 0).padStart(2)}  ${isOT ? String(game.homeTeam?.goalsOT || 0).padStart(2) + '  ' : ''}${String(homeGoals).padStart(2)}\n` +
    `\`\`\``;

  const teamStatsBlock = 
    `**Shots on Goal:** ${awayCode} ${game.awayTeam?.shots || 0} - ${game.homeTeam?.shots || 0} ${homeCode}\n` +
    `**Powerplays:** ${awayCode} ${game.awayTeam?.ppGoals || 0}/${game.awayTeam?.ppTries || 0} - ${homeCode} ${game.homeTeam?.ppGoals || 0}/${game.homeTeam?.ppTries || 0}\n` +
    `**Body Checks:** ${awayCode} ${game.awayTeam?.checks || 0} - ${homeCode} ${game.homeTeam?.checks || 0}\n` +
    `**Faceoffs Won:** ${awayCode} ${game.awayTeam?.faceoffWins || 0} - ${homeCode} ${game.homeTeam?.faceoffWins || 0}\n` +
    `**Pass %:** ${awayCode} ${Math.round(((game.awayTeam?.passComps || 0) / Math.max(1, game.awayTeam?.passTries || 1)) * 100)}% - ${homeCode} ${Math.round(((game.homeTeam?.passComps || 0) / Math.max(1, game.homeTeam?.passTries || 1)) * 100)}%`;

  const embed = {
    title: `🏒 FINAL: ${awayCode} (${awayGoals}) @ ${homeCode} (${homeGoals})${isOT ? ' [OT]' : ''}`,
    description: `**Season ${seasonId} (${getLeagueCode(seasonId)}) • Game #${gameId}**\n**Coaches:** ${awayCoachName} vs ${homeCoachName}`,
    color: awayGoals > homeGoals ? 0x2b82d9 : 0xd9532b,
    fields: [
      { name: "📊 Line Score", value: periodTable, inline: false },
      { name: "⚡ Team Stats", value: teamStatsBlock, inline: true },
      { name: "⭐ Top Performers", value: stars.length > 0 ? stars.join("\n") : "No individual points", inline: true },
      ...(scoringLines.length > 0 ? [{ name: "🚨 Scoring Summary", value: scoringLines.join("\n"), inline: false }] : [])
    ],
    footer: {
      text: "NHL95 Gazette Boxscore System • nhl95.net"
    },
    timestamp: new Date().toISOString()
  };

  const payload = {
    username: "NHL95 Boxscore Wire",
    avatar_url: "https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/brule_cup.png",
    embeds: [embed]
  };

  try {
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      console.log("✅ Discord Boxscore sent successfully via Webhook!");
    } else if (botToken && channelId) {
      await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bot ${botToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      console.log("✅ Discord Boxscore sent successfully via Bot API!");
    }
    return { success: true };
  } catch (err: any) {
    console.error("Failed to push boxscore to Discord:", err);
    return { error: err.message };
  }
}

