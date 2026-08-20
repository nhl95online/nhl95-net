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
      .select('team_id, team_name, abbreviation, coach_id, league_id, logo_url, league_coaches(coach_id, coach_name)')
      .eq('league_id', sId);

    if (seasonTeams && seasonTeams.length > 0) {
      teamsData = seasonTeams;
    } else {
      const { data: allTeams } = await supabase
        .from('league_teams')
        .select('team_id, team_name, abbreviation, coach_id, league_id, logo_url, league_coaches(coach_id, coach_name)');
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

    const parseToiSeconds = (toiVal: any): number => {
      if (typeof toiVal === 'number') return isNaN(toiVal) ? 0 : toiVal;
      if (typeof toiVal === 'string') {
        const trimmed = toiVal.trim();
        if (!trimmed || trimmed === '-' || trimmed === '--' || trimmed === '0:00' || trimmed === '00:00') return 0;
        if (trimmed.includes(':')) {
          const parts = trimmed.split(':').map(Number);
          if (parts.length === 3) return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
          return (parts[0] || 0) * 60 + (parts[1] || 0);
        }
        const num = parseFloat(trimmed);
        return isNaN(num) ? 0 : num;
      }
      return 0;
    };

    const hasSkaterPlayed = (s: any): boolean => {
      if (!s) return false;
      const name = String(s.name || s.player || s.player_name || '').trim();
      if (!name || name === '--') return false;
      const toiSec = parseToiSeconds(s.toiSeconds ?? s.toi_seconds ?? s.toi);
      const goals = Number(s.goals ?? s.g) || 0;
      const assists = Number(s.assists ?? s.a) || 0;
      const points = Number(s.points ?? s.pts) || 0;
      const shots = Number(s.sog ?? s.shots) || 0;
      const checks = Number(s.checks ?? s.chk) || 0;
      const pim = Number(s.pim) || 0;
      const ppp = Number(s.ppp ?? s.pp_points) || 0;
      const shp = Number(s.shp ?? s.sh_points) || 0;
      return toiSec > 0 || goals > 0 || assists > 0 || points > 0 || shots > 0 || checks > 0 || pim > 0 || ppp > 0 || shp > 0;
    };

    const hasGoaliePlayed = (g: any): boolean => {
      if (!g) return false;
      const name = String(g.name || g.goalie || g.player || g.player_name || '').trim();
      if (!name || name === '--') return false;
      const toiSec = parseToiSeconds(g.toiSeconds ?? g.toi_seconds ?? g.toi);
      const shots = Number(g.shots ?? g.shots_against ?? g.sog) || 0;
      const saves = Number(g.saves ?? g.sv) || 0;
      const ga = Number(g.ga ?? g.goals_against) || 0;
      const goals = Number(g.goals ?? g.g) || 0;
      const assists = Number(g.assists ?? g.a) || 0;
      const hasDecision = Boolean(g.w) || Boolean(g.l) || Boolean(g.t) || Boolean(g.otl);
      return toiSec > 0 || shots > 0 || saves > 0 || ga > 0 || hasDecision || goals > 0 || assists > 0;
    };

    const playerStatsRows: any[] = [];

    // Away Skaters
    (game.awaySkaters || []).forEach((s: any) => {
      if (!hasSkaterPlayed(s)) return;
      const sName = String(s.name || s.player || s.player_name || '').trim();
      const ppg = (game.goals || []).filter((g: any) => g.scorer === sName && g.type?.startsWith('PP')).length;
      const shg = (game.goals || []).filter((g: any) => g.scorer === sName && g.type?.startsWith('SH')).length;
      const goals = Number(s.goals ?? s.g) || 0;
      const assists = Number(s.assists ?? s.a) || 0;
      const shots = Number(s.sog ?? s.shots) || 0;
      const checks = Number(s.checks ?? s.chk) || 0;
      const pim = Number(s.pim) || 0;
      const ppp = Number(s.ppp ?? s.pp_points) || 0;
      const shp = Number(s.shp ?? s.sh_points) || 0;
      const evg = Math.max(0, goals - ppg - shg);
      const isGWG = gwgScorerName && sName.toLowerCase() === gwgScorerName.trim().toLowerCase() ? 1 : 0;
      const isOTG = otgScorerName && sName.toLowerCase() === otgScorerName.trim().toLowerCase() ? 1 : 0;

      playerStatsRows.push({
        game_id: finalGameId,
        league_id: sId,
        team_id: awayTeamId,
        player_id: getPlayerId(sName, awayTeamId),
        pos_played: s.pos || 'F',
        goals,
        assists,
        shots,
        checks,
        pim,
        pp_points: ppp,
        sh_points: shp,
        evg,
        gwg: isGWG,
        otg: isOTG,
        toi: parseToiSeconds(s.toiSeconds ?? s.toi_seconds ?? s.toi),
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
      if (!hasSkaterPlayed(s)) return;
      const sName = String(s.name || s.player || s.player_name || '').trim();
      const ppg = (game.goals || []).filter((g: any) => g.scorer === sName && g.type?.startsWith('PP')).length;
      const shg = (game.goals || []).filter((g: any) => g.scorer === sName && g.type?.startsWith('SH')).length;
      const goals = Number(s.goals ?? s.g) || 0;
      const assists = Number(s.assists ?? s.a) || 0;
      const shots = Number(s.sog ?? s.shots) || 0;
      const checks = Number(s.checks ?? s.chk) || 0;
      const pim = Number(s.pim) || 0;
      const ppp = Number(s.ppp ?? s.pp_points) || 0;
      const shp = Number(s.shp ?? s.sh_points) || 0;
      const evg = Math.max(0, goals - ppg - shg);
      const isGWG = gwgScorerName && sName.toLowerCase() === gwgScorerName.trim().toLowerCase() ? 1 : 0;
      const isOTG = otgScorerName && sName.toLowerCase() === otgScorerName.trim().toLowerCase() ? 1 : 0;

      playerStatsRows.push({
        game_id: finalGameId,
        league_id: sId,
        team_id: homeTeamId,
        player_id: getPlayerId(sName, homeTeamId),
        pos_played: s.pos || 'F',
        goals,
        assists,
        shots,
        checks,
        pim,
        pp_points: ppp,
        sh_points: shp,
        evg,
        gwg: isGWG,
        otg: isOTG,
        toi: parseToiSeconds(s.toiSeconds ?? s.toi_seconds ?? s.toi),
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
      if (!hasGoaliePlayed(g)) return;
      const gName = String(g.name || g.goalie || g.player || g.player_name || '').trim();
      playerStatsRows.push({
        game_id: finalGameId,
        league_id: sId,
        team_id: awayTeamId,
        player_id: getPlayerId(gName, awayTeamId),
        pos_played: 'G',
        goals: Number(g.goals ?? g.g) || 0,
        assists: Number(g.assists ?? g.a) || 0,
        shots: 0,
        checks: 0,
        pim: 0,
        pp_points: 0,
        sh_points: 0,
        evg: 0,
        gwg: 0,
        otg: 0,
        toi: parseToiSeconds(g.toiSeconds ?? g.toi_seconds ?? g.toi),
        saves: Number(g.saves ?? g.sv) || 0,
        shots_against: Number(g.shots ?? g.shots_against ?? g.sog) || 0,
        goals_against: Number(g.ga ?? g.goals_against) || 0,
        is_win: Boolean(g.w),
        is_loss: Boolean(g.l),
        is_tie: Boolean(g.t),
        is_otl: Boolean(g.otl)
      });
    });

    // Home Goalies
    (game.homeGoalies || []).forEach((g: any) => {
      if (!hasGoaliePlayed(g)) return;
      const gName = String(g.name || g.goalie || g.player || g.player_name || '').trim();
      playerStatsRows.push({
        game_id: finalGameId,
        league_id: sId,
        team_id: homeTeamId,
        player_id: getPlayerId(gName, homeTeamId),
        pos_played: 'G',
        goals: Number(g.goals ?? g.g) || 0,
        assists: Number(g.assists ?? g.a) || 0,
        shots: 0,
        checks: 0,
        pim: 0,
        pp_points: 0,
        sh_points: 0,
        evg: 0,
        gwg: 0,
        otg: 0,
        toi: parseToiSeconds(g.toiSeconds ?? g.toi_seconds ?? g.toi),
        saves: Number(g.saves ?? g.sv) || 0,
        shots_against: Number(g.shots ?? g.shots_against ?? g.sog) || 0,
        goals_against: Number(g.ga ?? g.goals_against) || 0,
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
        homeTeam: homeTeam || { team_name: homeTeamCode, abbreviation: homeTeamCode },
        awayTeam: awayTeam || { team_name: awayTeamCode, abbreviation: awayTeamCode },
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
  homeTeam: any;
  awayTeam: any;
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

  const { game, seasonId, gameId, homeTeam, awayTeam, homeCoachName, awayCoachName } = params;
  const awayCode = (game.awayTeam?.teamCode || awayTeam?.abbreviation || 'AWAY').toUpperCase();
  const homeCode = (game.homeTeam?.teamCode || homeTeam?.abbreviation || 'HOME').toUpperCase();
  const awayName = awayTeam?.team_name || W_LEAGUE_COACH_MAP[awayCode]?.city || awayCode;
  const homeName = homeTeam?.team_name || W_LEAGUE_COACH_MAP[homeCode]?.city || homeCode;
  const awayGoals = Number(game.awayTeam?.goals || 0);
  const homeGoals = Number(game.homeTeam?.goals || 0);
  const isOT = Boolean(game.isOT);

  const awayLogo = awayTeam?.logo_url || null;
  const homeLogo = homeTeam?.logo_url || null;
  const winningLogo = awayGoals > homeGoals ? awayLogo : (homeGoals > awayGoals ? homeLogo : (homeLogo || awayLogo));

  // Helper string padder
  const pad = (val: any, len: number, alignLeft = true): string => {
    const s = String(val ?? '').slice(0, len);
    return alignLeft ? s.padEnd(len) : s.padStart(len);
  };

  // 1. Period Line Score
  const periodTable = `\`\`\`\n` +
    `Team   1st  2nd  3rd  OT  Total\n` +
    `${pad(awayCode, 5, true)}  ${pad(game.awayTeam?.goalsP1 || 0, 2, false)}   ${pad(game.awayTeam?.goalsP2 || 0, 2, false)}   ${pad(game.awayTeam?.goalsP3 || 0, 2, false)}   ${isOT ? pad(game.awayTeam?.goalsOT || 0, 2, false) + '   ' : ' 0   '}${pad(awayGoals, 2, false)}\n` +
    `${pad(homeCode, 5, true)}  ${pad(game.homeTeam?.goalsP1 || 0, 2, false)}   ${pad(game.homeTeam?.goalsP2 || 0, 2, false)}   ${pad(game.homeTeam?.goalsP3 || 0, 2, false)}   ${isOT ? pad(game.homeTeam?.goalsOT || 0, 2, false) + '   ' : ' 0   '}${pad(homeGoals, 2, false)}\n` +
    `\`\`\``;

  // 2. Side-by-Side Game Stats Table (matching exact layout from retro screen)
  const aShots = game.awayTeam?.shots || 0;
  const hShots = game.homeTeam?.shots || 0;
  const aShoot = aShots > 0 ? ((awayGoals / aShots) * 100).toFixed(2) + '%' : '0.00%';
  const hShoot = hShots > 0 ? ((homeGoals / hShots) * 100).toFixed(2) + '%' : '0.00%';

  const totalFaceoffs = (Number(game.awayTeam?.faceoffWins) || 0) + (Number(game.homeTeam?.faceoffWins) || 0);
  const aFO = `${game.awayTeam?.faceoffWins || 0}/${totalFaceoffs}`;
  const hFO = `${game.homeTeam?.faceoffWins || 0}/${totalFaceoffs}`;

  const aPP = `${game.awayTeam?.ppGoals || 0}/${game.awayTeam?.ppTries || 0}`;
  const hPP = `${game.homeTeam?.ppGoals || 0}/${game.homeTeam?.ppTries || 0}`;

  const aBrk = `${game.awayTeam?.breakawayGoals || 0}/${game.awayTeam?.breakawayTries || 0}`;
  const hBrk = `${game.homeTeam?.breakawayGoals || 0}/${game.homeTeam?.breakawayTries || 0}`;

  const a1T = `${game.awayTeam?.oneTimerGoals || 0}/${game.awayTeam?.oneTimerTries || 0}`;
  const h1T = `${game.homeTeam?.oneTimerGoals || 0}/${game.homeTeam?.oneTimerTries || 0}`;

  const aPS = `${game.awayTeam?.penaltyShotGoals || 0}/${game.awayTeam?.penaltyShotTries || 0}`;
  const hPS = `${game.homeTeam?.penaltyShotGoals || 0}/${game.homeTeam?.penaltyShotTries || 0}`;

  const statsRows = [
    `${pad(aShots, 7, false)}       Shots       ${pad(hShots, 7, true)}`,
    `${pad(game.awayTeam?.shotsP1 || 0, 7, false)}    1st Period    ${pad(game.homeTeam?.shotsP1 || 0, 7, true)}`,
    `${pad(game.awayTeam?.shotsP2 || 0, 7, false)}    2nd Period    ${pad(game.homeTeam?.shotsP2 || 0, 7, true)}`,
    `${pad(game.awayTeam?.shotsP3 || 0, 7, false)}    3rd Period    ${pad(game.homeTeam?.shotsP3 || 0, 7, true)}`,
    `${pad(game.awayTeam?.shotsOT || 0, 7, false)}     Overtime     ${pad(game.homeTeam?.shotsOT || 0, 7, true)}`,
    `${pad(aShoot, 7, false)}    Shooting %    ${pad(hShoot, 7, true)}`,
    `${pad(aPP, 7, false)}    PowerPlay     ${pad(hPP, 7, true)}`,
    `${pad(game.awayTeam?.ppShots || 0, 7, false)}  PowerPlay Shots  ${pad(game.homeTeam?.ppShots || 0, 7, true)}`,
    `${pad(game.awayTeam?.shGoals || 0, 7, false)}  Shorthanded G    ${pad(game.homeTeam?.shGoals || 0, 7, true)}`,
    `${pad(aBrk, 7, false)}    Breakaways    ${pad(hBrk, 7, true)}`,
    `${pad(a1T, 7, false)}    One-Timers    ${pad(h1T, 7, true)}`,
    `${pad(aPS, 7, false)}  Penalty Shots   ${pad(hPS, 7, true)}`,
    `${pad(aFO, 7, false)}     Faceoffs     ${pad(hFO, 7, true)}`,
    `${pad(game.awayTeam?.checks || 0, 7, false)}   Body Checks    ${pad(game.homeTeam?.checks || 0, 7, true)}`,
    `${pad(game.awayTeam?.penalties || 0, 7, false)}    Penalties     ${pad(game.homeTeam?.penalties || 0, 7, true)}`,
    `${pad(game.awayTeam?.attackZoneTime || '0:00', 7, false)}   Attack Zone    ${pad(game.homeTeam?.attackZoneTime || '0:00', 7, true)}`
  ];

  const gameStatsTable = `\`\`\`\n${pad(awayName.toUpperCase(), 14, true)}   Game Stats   ${pad(homeName.toUpperCase(), 14, false)}\n` +
    statsRows.join('\n') + `\n\`\`\``;

  // 3. Lineup Boxscores (Goalies + Skaters with G-A, Pts, SOG, CHK, PIM, PPP, SHP, TOI)
  const formatBoxscoreBlock = (goalies: any[], skaters: any[]) => {
    let gLines = `Goalies            G-A Pts SO GA SV SH   SV%   TOI\n`;
    (goalies || []).forEach(g => {
      const gName = pad(g.name || 'Goalie', 18, true);
      const ga = pad(g.ga ?? g.goals_against ?? 0, 2, false);
      const sv = pad(g.saves ?? g.sv ?? 0, 2, false);
      const sh = pad(g.shots ?? g.shots_against ?? (Number(g.saves || 0) + Number(g.ga || 0)) ?? 0, 2, false);
      const svPct = typeof g.savePct === 'number' ? g.savePct.toFixed(3) : (Number(sh) > 0 ? (Number(sv) / Number(sh)).toFixed(3) : '0.000');
      const toi = pad(g.toi || '15:00', 5, false);
      const so = pad(g.so ?? (Number(ga) === 0 ? 1 : 0), 2, false);
      gLines += `${gName} 0-0   0 ${so} ${ga} ${sv} ${sh} ${svPct} ${toi}\n`;
    });

    let sLines = `Players            G-A Pts SOG CHK PIM PPP SHP   TOI\n`;
    (skaters || []).forEach(s => {
      const sName = pad(s.name || 'Player', 18, true);
      const goals = Number(s.goals ?? s.g) || 0;
      const assists = Number(s.assists ?? s.a) || 0;
      const gaStr = `${goals}-${assists}`;
      const pts = pad(goals + assists, 3, false);
      const sog = pad(s.sog ?? s.shots ?? 0, 3, false);
      const chk = pad(s.checks ?? s.chk ?? 0, 3, false);
      const pim = pad(s.pim ?? 0, 3, false);
      const ppp = pad(s.ppp ?? s.pp_points ?? 0, 3, false);
      const shp = pad(s.shp ?? s.sh_points ?? 0, 3, false);
      const toi = pad(s.toi || '15:00', 5, false);
      sLines += `${sName} ${pad(gaStr, 4, true)} ${pts} ${sog} ${chk} ${pim} ${ppp} ${shp} ${toi}\n`;
    });

    return `\`\`\`\n${gLines}\n${sLines}\`\`\``;
  };

  // 4. Scoring Summary Table
  let scoringBlock = `\`\`\`\nPer. Time Team Goal             Primary          Secondary        Type\n`;
  if (game.goals && game.goals.length > 0) {
    game.goals.forEach((g: any) => {
      const per = pad(g.period, 3, false);
      const time = pad(g.time, 5, false);
      const team = pad(g.team, 4, false);
      const scorer = pad(g.scorer, 16, true);
      const a1 = pad(g.assist1 && g.assist1 !== '--' ? g.assist1 : '--', 16, true);
      const a2 = pad(g.assist2 && g.assist2 !== '--' ? g.assist2 : '--', 16, true);
      const type = pad(g.type || 'EV', 4, true);
      scoringBlock += `${per} ${time} ${team} ${scorer} ${a1} ${a2} ${type}\n`;
    });
    scoringBlock += `\`\`\``;
  } else {
    scoringBlock = "`No goals scored in this match.`";
  }

  // 5. Penalty Summary Table
  let penaltyBlock = `\`\`\`\nPer. Time Team Player             Penalty\n`;
  if (game.penalties && game.penalties.length > 0) {
    game.penalties.forEach((p: any) => {
      const per = pad(p.period, 3, false);
      const time = pad(p.time, 5, false);
      const team = pad(p.team, 4, false);
      const player = pad(p.player, 18, true);
      const type = pad(p.type, 15, true);
      penaltyBlock += `${per} ${time} ${team} ${player} ${type}\n`;
    });
    penaltyBlock += `\`\`\``;
  } else {
    penaltyBlock = "`No penalties assessed.`";
  }

  // Build Rich Discord Embed
  const embed = {
    author: {
      name: `WN95HL OFFICIAL BOXSCORE • SEASON ${seasonId} (${getLeagueCode(seasonId)})`,
      icon_url: "https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/brule_cup.png"
    },
    title: `🏒 ${awayName.toUpperCase()} (${awayGoals}) at ${homeName.toUpperCase()} (${homeGoals})${isOT ? ' [OT]' : ''}`,
    description: `**Game #${gameId}** • Nostradamus Coliseum\n**Matchup:** ${awayName} (${awayCoachName}) vs ${homeName} (${homeCoachName})`,
    color: awayGoals > homeGoals ? 0x2b82d9 : 0xd9532b,
    thumbnail: winningLogo ? { url: winningLogo } : undefined,
    fields: [
      { name: "📊 Period Summary", value: periodTable, inline: false },
      { name: "⚡ Game Stats", value: gameStatsTable, inline: false },
      { name: `🔴 ${awayName.toUpperCase()} (${awayCode}) LINEUP`, value: formatBoxscoreBlock(game.awayGoalies, game.awaySkaters), inline: false },
      { name: `🔵 ${homeName.toUpperCase()} (${homeCode}) LINEUP`, value: formatBoxscoreBlock(game.homeGoalies, game.homeSkaters), inline: false },
      { name: "🚨 Scoring Summary", value: scoringBlock, inline: false },
      { name: "🛑 Penalty Summary", value: penaltyBlock, inline: false }
    ],
    footer: {
      text: "NHL95 Gazette Boxscore System • nhl95.net",
      icon_url: "https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/brule_cup.png"
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


