import {
  SeasonConfig,
  ParsedGame,
  ParsedTeamStats,
  ParsedGoal,
  ParsedPenalty,
  ParsedSkaterStat,
  ParsedGoalieStat
} from '../seasons/types';
import { DEFAULT_TEAM_CODES } from '../seasons';

export const GOAL_TYPE_DICT: Record<number, { side: 'Home' | 'Away'; status: string }> = {
  0: { side: 'Home', status: 'SH2' },
  1: { side: 'Home', status: 'SH' },
  2: { side: 'Home', status: 'EV' },
  3: { side: 'Home', status: 'PP' },
  4: { side: 'Home', status: 'PP2' },
  128: { side: 'Away', status: 'SH2' },
  129: { side: 'Away', status: 'SH' },
  130: { side: 'Away', status: 'EV' },
  131: { side: 'Away', status: 'PP' },
  132: { side: 'Away', status: 'PP2' }
};

export const PENALTY_DICT: Record<number, { side: 'Home' | 'Away'; type: string }> = {
  18: { side: 'Home', type: 'Boarding' },
  22: { side: 'Home', type: 'Charging' },
  24: { side: 'Home', type: 'Slashing' },
  26: { side: 'Home', type: 'Roughing' },
  28: { side: 'Home', type: 'Cross-Checking' },
  30: { side: 'Home', type: 'Hooking' },
  32: { side: 'Home', type: 'Tripping' },
  34: { side: 'Home', type: 'Interference' },
  36: { side: 'Home', type: 'Holding' },
  38: { side: 'Home', type: 'Fighting' },
  146: { side: 'Away', type: 'Boarding' },
  150: { side: 'Away', type: 'Charging' },
  152: { side: 'Away', type: 'Slashing' },
  154: { side: 'Away', type: 'Roughing' },
  156: { side: 'Away', type: 'Cross-Checking' },
  158: { side: 'Away', type: 'Hooking' },
  160: { side: 'Away', type: 'Tripping' },
  162: { side: 'Away', type: 'Interference' },
  164: { side: 'Away', type: 'Holding' },
  166: { side: 'Away', type: 'Fighting' }
};

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function parseSaveStateBuffer(
  buffer: Uint8Array,
  config?: Partial<SeasonConfig>
): ParsedGame {
  const teamCodes = config?.teamCodes || DEFAULT_TEAM_CODES;
  const teamPositionCounts = config?.teamPositionCounts || {};
  const goalieDict = config?.goalies || {};
  const skaterDict = config?.skaters || {};

  // Check minimum size (NHL95 save states are usually 65KB+)
  if (buffer.length < 52000) {
    throw new Error(`Invalid save state: file size too small (${buffer.length} bytes, minimum 52KB expected).`);
  }

  // Header offset for Genesis Plus GX / RetroArch
  let offset = 32;

  // Auto-detection fallback if offset 32 isn't aligned
  if (buffer[48980 + offset] > 30 && buffer[48980] <= 30) {
    offset = 0;
  }

  const d = buffer;

  // 1. Away Team General Stats
  const awayGoals = d[50682 + offset];
  const awayPPGoals = d[50672 + offset];
  const awayPPTries = d[50674 + offset];
  const awayPPTime1 = d[51522 + offset];
  const awayPPTime2 = d[51523 + offset] * 256;
  const awayPPTimeSec = awayPPTime1 + awayPPTime2;
  const awayPPShots = d[51524 + offset];
  const awaySHGoals = d[51526 + offset];
  const awayBreakGoals = d[51530 + offset];
  const awayBreakTries = d[51528 + offset];
  const awayOneTimerGoals = d[51534 + offset];
  const awayOneTimerTries = d[51532 + offset];
  const awayPenShotGoals = d[51538 + offset];
  const awayPenShotTries = d[51536 + offset];
  const awayFaceoffWins = d[50684 + offset];
  const awayChecks = d[50686 + offset];
  const awayPenalties = d[50676 + offset];
  const awayPIM = d[50678 + offset];
  const awayAttackZoneTime1 = d[50680 + offset];
  const awayAttackZoneTime2 = d[50681 + offset] * 256;
  const awayAttackZoneTimeSec = awayAttackZoneTime1 + awayAttackZoneTime2;
  const awayPassComps = d[50690 + offset];
  let awayPassTries = d[50688 + offset];
  if (awayPassTries < awayPassComps) {
    awayPassTries += 256;
  }
  const awayGoalsP1 = d[51506 + offset];
  const awayGoalsP2 = d[51508 + offset];
  const awayGoalsP3 = d[51510 + offset];
  const awayGoalsOT = d[51512 + offset];
  const awayShotsP1 = d[51514 + offset];
  const awayShotsP2 = d[51516 + offset];
  const awayShotsP3 = d[51518 + offset];
  const awayShotsOT = d[51520 + offset];

  const awayTeamCodeByte = d[48982 + offset];
  const awayTeamCode = teamCodes[awayTeamCodeByte] || `TM_${awayTeamCodeByte}`;
  const awayShots = awayShotsP1 + awayShotsP2 + awayShotsP3 + awayShotsOT;
  const awayShootPct = awayShots > 0 ? Number((awayGoals / awayShots).toFixed(3)) : 0;

  // 2. Home Team General Stats
  const homeGoals = d[49812 + offset];
  const homePPGoals = d[49802 + offset];
  const homePPTries = d[49804 + offset];
  const homePPTime1 = d[50652 + offset];
  const homePPTime2 = d[50653 + offset] * 256;
  const homePPTimeSec = homePPTime1 + homePPTime2;
  const homePPShots = d[50654 + offset];
  const homeSHGoals = d[50656 + offset];
  const homeBreakGoals = d[50660 + offset];
  const homeBreakTries = d[50658 + offset];
  const homeOneTimerGoals = d[50664 + offset];
  const homeOneTimerTries = d[50662 + offset];
  const homePenShotGoals = d[50668 + offset];
  const homePenShotTries = d[50666 + offset];
  const homeFaceoffWins = d[49814 + offset];
  const homeChecks = d[49816 + offset];
  const homePenalties = d[49806 + offset];
  const homePIM = d[49808 + offset];
  const homeAttackZoneTime1 = d[49810 + offset];
  const homeAttackZoneTime2 = d[49811 + offset] * 256;
  const homeAttackZoneTimeSec = homeAttackZoneTime1 + homeAttackZoneTime2;
  const homePassComps = d[49820 + offset];
  let homePassTries = d[49818 + offset];
  if (homePassTries < homePassComps) {
    homePassTries += 256;
  }
  const homeGoalsP1 = d[50636 + offset];
  const homeGoalsP2 = d[50638 + offset];
  const homeGoalsP3 = d[50640 + offset];
  const homeGoalsOT = d[50642 + offset];
  const homeShotsP1 = d[50644 + offset];
  const homeShotsP2 = d[50646 + offset];
  const homeShotsP3 = d[50648 + offset];
  const homeShotsOT = d[50650 + offset];

  const homeTeamCodeByte = d[48980 + offset];
  const homeTeamCode = teamCodes[homeTeamCodeByte] || `TM_${homeTeamCodeByte}`;
  const homeShots = homeShotsP1 + homeShotsP2 + homeShotsP3 + homeShotsOT;
  const homeShootPct = homeShots > 0 ? Number((homeGoals / homeShots).toFixed(3)) : 0;

  // 3. Roster Info & Player Names
  const defaultPos = config?.defaultPositionCounts || { goalies: 2, forwards: 5, defensemen: 3 };
  const awayGCount = teamPositionCounts[awayTeamCode]?.goalies ?? defaultPos.goalies;
  const awayFCount = teamPositionCounts[awayTeamCode]?.forwards ?? defaultPos.forwards;
  const awayDCount = teamPositionCounts[awayTeamCode]?.defensemen ?? defaultPos.defensemen;

  const homeGCount = teamPositionCounts[homeTeamCode]?.goalies ?? defaultPos.goalies;
  const homeFCount = teamPositionCounts[homeTeamCode]?.forwards ?? defaultPos.forwards;
  const homeDCount = teamPositionCounts[homeTeamCode]?.defensemen ?? defaultPos.defensemen;

  // Assemble Away player roster with positions
  const awayGoalieNames = goalieDict[awayTeamCode] || ['Goalie 1', 'Goalie 2'];
  const awaySkaterNames = skaterDict[awayTeamCode] || [
    'Forward 1', 'Forward 2', 'Forward 3', 'Forward 4', 'Forward 5', 'Forward 6',
    'Defense 1', 'Defense 2', 'Defense 3', 'Defense 4'
  ];

  const awayPlayers: Array<{ name: string; pos: 'G' | 'F' | 'D' }> = [];
  for (let i = 0; i < awayGCount; i++) {
    awayPlayers.push({ name: awayGoalieNames[i] || `Goalie ${i + 1}`, pos: 'G' });
  }
  for (let i = 0; i < awayFCount; i++) {
    awayPlayers.push({ name: awaySkaterNames[i] || `Forward ${i + 1}`, pos: 'F' });
  }
  for (let i = 0; i < awayDCount; i++) {
    awayPlayers.push({ name: awaySkaterNames[awayFCount + i] || `Defense ${i + 1}`, pos: 'D' });
  }

  // Assemble Home player roster with positions
  const homeGoalieNames = goalieDict[homeTeamCode] || ['Goalie 1', 'Goalie 2'];
  const homeSkaterNames = skaterDict[homeTeamCode] || [
    'Forward 1', 'Forward 2', 'Forward 3', 'Forward 4', 'Forward 5', 'Forward 6',
    'Defense 1', 'Defense 2', 'Defense 3', 'Defense 4'
  ];

  const homePlayers: Array<{ name: string; pos: 'G' | 'F' | 'D' }> = [];
  for (let i = 0; i < homeGCount; i++) {
    homePlayers.push({ name: homeGoalieNames[i] || `Goalie ${i + 1}`, pos: 'G' });
  }
  for (let i = 0; i < homeFCount; i++) {
    homePlayers.push({ name: homeSkaterNames[i] || `Forward ${i + 1}`, pos: 'F' });
  }
  for (let i = 0; i < homeDCount; i++) {
    homePlayers.push({ name: homeSkaterNames[homeFCount + i] || `Defense ${i + 1}`, pos: 'D' });
  }

  // 4. Scoring Summary
  const numGoals = Math.floor(d[49196 + offset] / 6);
  const startGoalByte = 49198 + offset;
  const parsedGoals: ParsedGoal[] = [];

  for (let i = 0; i < numGoals; i++) {
    const b1 = d[startGoalByte + 1 + i * 6];
    let perFactor = 0;
    if (b1 < 64) perFactor = 0;
    else if (b1 < 128) perFactor = 64;
    else if (b1 < 192) perFactor = 128;
    else perFactor = 192;

    const periodNum = Math.floor(perFactor / 64) + 1;
    const secondsNum = (b1 - perFactor) * 256 + d[startGoalByte + i * 6];
    const typeCode = d[startGoalByte + 3 + i * 6];
    const goalTypeObj = GOAL_TYPE_DICT[typeCode] || {
      side: typeCode >= 128 ? 'Away' : 'Home',
      status: 'EV'
    };

    const side = goalTypeObj.side;
    const goalTeam = side === 'Home' ? homeTeamCode : awayTeamCode;

    const scorerSlot = d[startGoalByte + 2 + i * 6];
    const assist1Slot = d[startGoalByte + 5 + i * 6];
    const assist2Slot = d[startGoalByte + 4 + i * 6];

    const rosterList = side === 'Home' ? homePlayers : awayPlayers;
    const scorer = rosterList[scorerSlot]?.name || `Player #${scorerSlot + 1}`;
    const assist1 = assist1Slot === 255 ? '--' : (rosterList[assist1Slot]?.name || `Player #${assist1Slot + 1}`);
    const assist2 = assist2Slot === 255 ? '--' : (rosterList[assist2Slot]?.name || `Player #${assist2Slot + 1}`);

    parsedGoals.push({
      goalNum: i + 1,
      period: periodNum,
      time: formatTime(secondsNum),
      seconds: secondsNum,
      team: goalTeam,
      side,
      scorer,
      assist1,
      assist2,
      type: goalTypeObj.status
    });
  }

  // 5. Penalty Summary
  const numPens = Math.floor(d[49558 + offset] / 4);
  const startPenByte = 49560 + offset;
  const parsedPenalties: ParsedPenalty[] = [];

  for (let i = 0; i < numPens; i++) {
    const b1 = d[startPenByte + 1 + i * 4];
    let perFactor = 0;
    if (b1 < 64) perFactor = 0;
    else if (b1 < 128) perFactor = 64;
    else if (b1 < 192) perFactor = 128;
    else perFactor = 192;

    const periodNum = Math.floor(perFactor / 64) + 1;
    const secondsNum = (b1 - perFactor) * 256 + d[startPenByte + i * 4];
    const penCode = d[startPenByte + 3 + i * 4];
    const penObj = PENALTY_DICT[penCode] || {
      side: penCode >= 146 ? 'Away' : 'Home',
      type: 'Penalty'
    };

    const side = penObj.side;
    const penTeam = side === 'Home' ? homeTeamCode : awayTeamCode;
    const playerSlot = d[startPenByte + 2 + i * 4];
    const rosterList = side === 'Home' ? homePlayers : awayPlayers;
    const player = rosterList[playerSlot]?.name || `Player #${playerSlot + 1}`;

    parsedPenalties.push({
      penNum: i + 1,
      period: periodNum,
      time: formatTime(secondsNum),
      seconds: secondsNum,
      team: penTeam,
      side,
      player,
      type: penObj.type
    });
  }

  // 6. Game Length & OT
  const hasOT =
    awayGoalsOT > 0 ||
    awayShotsOT > 0 ||
    homeGoalsOT > 0 ||
    homeShotsOT > 0 ||
    (parsedPenalties.length > 0 && parsedPenalties[parsedPenalties.length - 1].period === 4);

  let gameLengthSec = 900;
  if (hasOT) {
    if (homeGoals === awayGoals) {
      gameLengthSec = 1200;
    } else {
      const otLength = parsedGoals.length > 0 ? parsedGoals[parsedGoals.length - 1].seconds : 0;
      gameLengthSec = 900 + otLength;
    }
  }

  // 7. Away Player & Goalie Extraction
  const awayTotalSlots = awayGCount + awayFCount + awayDCount;
  const awayRawPlayerStats: any[] = [];
  let awaySwapVal = 1;
  const awayStartByte = 50852 + offset;

  for (let i = 0; i < awayTotalSlots; i++) {
    const goals = d[awayStartByte + 0 + i + awaySwapVal];
    const assists = d[awayStartByte + 26 + i + awaySwapVal];
    const shots = d[awayStartByte + 52 + i + awaySwapVal];
    const checks = d[awayStartByte + 104 + i + awaySwapVal];
    const pim = d[awayStartByte + 78 + i + awaySwapVal];

    const toiMin = d[awayStartByte + 130 + 1 + i * 2] * 256;
    const toiSec = d[awayStartByte + 130 + i * 2];
    const rawToi = toiMin + toiSec;
    const toi = Math.min(rawToi, gameLengthSec);

    awayRawPlayerStats.push({
      name: awayPlayers[i]?.name || `Away Player ${i + 1}`,
      pos: awayPlayers[i]?.pos || 'F',
      goals,
      assists,
      points: goals + assists,
      shots,
      checks,
      pim,
      toi
    });

    awaySwapVal *= -1;
  }

  // 8. Home Player & Goalie Extraction
  const homeTotalSlots = homeGCount + homeFCount + homeDCount;
  const homeRawPlayerStats: any[] = [];
  let homeSwapVal = 1;
  const homeStartByte = 49982 + offset;

  for (let i = 0; i < homeTotalSlots; i++) {
    const goals = d[homeStartByte + 0 + i + homeSwapVal];
    const assists = d[homeStartByte + 26 + i + homeSwapVal];
    const shots = d[homeStartByte + 52 + i + homeSwapVal];
    const checks = d[homeStartByte + 104 + i + homeSwapVal];
    const pim = d[homeStartByte + 78 + i + homeSwapVal];

    const toiMin = d[homeStartByte + 130 + 1 + i * 2] * 256;
    const toiSec = d[homeStartByte + 130 + i * 2];
    const rawToi = toiMin + toiSec;
    const toi = Math.min(rawToi, gameLengthSec);

    homeRawPlayerStats.push({
      name: homePlayers[i]?.name || `Home Player ${i + 1}`,
      pos: homePlayers[i]?.pos || 'F',
      goals,
      assists,
      points: goals + assists,
      shots,
      checks,
      pim,
      toi
    });

    homeSwapVal *= -1;
  }

  // 9. Format Away Goalies & Skaters
  const awayRecGoalieIdx = (awayRawPlayerStats[0]?.toi || 0) >= (awayRawPlayerStats[1]?.toi || 0) ? 0 : 1;
  const awayGoalies: ParsedGoalieStat[] = [];
  for (let i = 0; i < awayGCount; i++) {
    const gRaw = awayRawPlayerStats[i];
    if (!gRaw) continue;
    const gName = gRaw.name;
    const gGoals = parsedGoals.filter(g => g.scorer === gName).length;
    const isRec = awayRecGoalieIdx === i;

    const w = isRec && awayGoals > homeGoals ? 1 : 0;
    const l = isRec && awayGoals < homeGoals && !hasOT ? 1 : 0;
    const t = isRec && awayGoals === homeGoals ? 1 : 0;
    const otl = isRec && awayGoals < homeGoals && hasOT ? 1 : 0;

    const ga = gRaw.goals; // In goalie slot, slot 0 stores Goals Against
    const assists = gRaw.assists;
    const shots = gRaw.shots; // In goalie slot, slot 2 stores Shots Against
    const saves = shots >= ga ? shots - ga : 0;
    const savePct = shots > 0 ? Number(((shots - ga) / shots).toFixed(3)) : 0;
    const so = ga === 0 && isRec && shots > 0 ? 1 : 0;

    // Filter out goalies who did not play
    if ((gRaw.toi || 0) === 0 && shots === 0 && saves === 0 && ga === 0 && !w && !l && !t && !otl && gGoals === 0 && assists === 0) {
      continue;
    }

    awayGoalies.push({
      name: gName,
      pos: 'G',
      team: awayTeamCode,
      side: 'Away',
      goals: gGoals,
      assists,
      points: gGoals + assists,
      so,
      ga,
      saves,
      shots,
      savePct,
      w,
      l,
      t,
      otl,
      toi: formatTime(gRaw.toi),
      toiSeconds: gRaw.toi
    });
  }

  const awaySkaters: ParsedSkaterStat[] = [];
  for (let i = awayGCount; i < awayTotalSlots; i++) {
    const sRaw = awayRawPlayerStats[i];
    if (!sRaw) continue;
    const sName = sRaw.name;

    let ppp = 0;
    let shp = 0;
    for (const goal of parsedGoals) {
      const isPart = goal.scorer === sName || goal.assist1 === sName || goal.assist2 === sName;
      if (isPart) {
        if (goal.type.startsWith('PP')) ppp++;
        if (goal.type.startsWith('SH')) shp++;
      }
    }

    // Filter out skaters who did not play
    if ((sRaw.toi || 0) === 0 && sRaw.goals === 0 && sRaw.assists === 0 && sRaw.shots === 0 && sRaw.checks === 0 && sRaw.pim === 0 && ppp === 0 && shp === 0) {
      continue;
    }

    awaySkaters.push({
      name: sName,
      pos: sRaw.pos as 'F' | 'D',
      team: awayTeamCode,
      side: 'Away',
      goals: sRaw.goals,
      assists: sRaw.assists,
      points: sRaw.points,
      sog: sRaw.shots,
      checks: sRaw.checks,
      pim: sRaw.pim,
      ppp,
      shp,
      toi: formatTime(sRaw.toi),
      toiSeconds: sRaw.toi
    });
  }

  // 10. Format Home Goalies & Skaters
  const homeRecGoalieIdx = (homeRawPlayerStats[0]?.toi || 0) >= (homeRawPlayerStats[1]?.toi || 0) ? 0 : 1;
  const homeGoalies: ParsedGoalieStat[] = [];
  for (let i = 0; i < homeGCount; i++) {
    const gRaw = homeRawPlayerStats[i];
    if (!gRaw) continue;
    const gName = gRaw.name;
    const gGoals = parsedGoals.filter(g => g.scorer === gName).length;
    const isRec = homeRecGoalieIdx === i;

    const w = isRec && homeGoals > awayGoals ? 1 : 0;
    const l = isRec && homeGoals < awayGoals && !hasOT ? 1 : 0;
    const t = isRec && homeGoals === awayGoals ? 1 : 0;
    const otl = isRec && homeGoals < awayGoals && hasOT ? 1 : 0;

    const ga = gRaw.goals;
    const assists = gRaw.assists;
    const shots = gRaw.shots;
    const saves = shots >= ga ? shots - ga : 0;
    const savePct = shots > 0 ? Number(((shots - ga) / shots).toFixed(3)) : 0;
    const so = ga === 0 && isRec && shots > 0 ? 1 : 0;

    // Filter out goalies who did not play
    if ((gRaw.toi || 0) === 0 && shots === 0 && saves === 0 && ga === 0 && !w && !l && !t && !otl && gGoals === 0 && assists === 0) {
      continue;
    }

    homeGoalies.push({
      name: gName,
      pos: 'G',
      team: homeTeamCode,
      side: 'Home',
      goals: gGoals,
      assists,
      points: gGoals + assists,
      so,
      ga,
      saves,
      shots,
      savePct,
      w,
      l,
      t,
      otl,
      toi: formatTime(gRaw.toi),
      toiSeconds: gRaw.toi
    });
  }

  const homeSkaters: ParsedSkaterStat[] = [];
  for (let i = homeGCount; i < homeTotalSlots; i++) {
    const sRaw = homeRawPlayerStats[i];
    if (!sRaw) continue;
    const sName = sRaw.name;

    let ppp = 0;
    let shp = 0;
    for (const goal of parsedGoals) {
      const isPart = goal.scorer === sName || goal.assist1 === sName || goal.assist2 === sName;
      if (isPart) {
        if (goal.type.startsWith('PP')) ppp++;
        if (goal.type.startsWith('SH')) shp++;
      }
    }

    // Filter out skaters who did not play
    if ((sRaw.toi || 0) === 0 && sRaw.goals === 0 && sRaw.assists === 0 && sRaw.shots === 0 && sRaw.checks === 0 && sRaw.pim === 0 && ppp === 0 && shp === 0) {
      continue;
    }

    homeSkaters.push({
      name: sName,
      pos: sRaw.pos as 'F' | 'D',
      team: homeTeamCode,
      side: 'Home',
      goals: sRaw.goals,
      assists: sRaw.assists,
      points: sRaw.points,
      sog: sRaw.shots,
      checks: sRaw.checks,
      pim: sRaw.pim,
      ppp,
      shp,
      toi: formatTime(sRaw.toi),
      toiSeconds: sRaw.toi
    });
  }

  const homeTeamStats: ParsedTeamStats = {
    teamCode: homeTeamCode,
    goals: homeGoals,
    shots: homeShots,
    shootingPct: homeShootPct,
    ppGoals: homePPGoals,
    ppTries: homePPTries,
    ppTime: formatTime(homePPTimeSec),
    ppShots: homePPShots,
    shGoals: homeSHGoals,
    breakawayGoals: homeBreakGoals,
    breakawayTries: homeBreakTries,
    oneTimerGoals: homeOneTimerGoals,
    oneTimerTries: homeOneTimerTries,
    penaltyShotGoals: homePenShotGoals,
    penaltyShotTries: homePenShotTries,
    faceoffWins: homeFaceoffWins,
    checks: homeChecks,
    penalties: homePenalties,
    pim: homePIM,
    attackZoneTime: formatTime(awayAttackZoneTimeSec ? homeAttackZoneTimeSec : 0),
    passComps: homePassComps,
    passTries: homePassTries,
    goalsP1: homeGoalsP1,
    goalsP2: homeGoalsP2,
    goalsP3: homeGoalsP3,
    goalsOT: homeGoalsOT,
    shotsP1: homeShotsP1,
    shotsP2: homeShotsP2,
    shotsP3: homeShotsP3,
    shotsOT: homeShotsOT
  };

  const awayTeamStats: ParsedTeamStats = {
    teamCode: awayTeamCode,
    goals: awayGoals,
    shots: awayShots,
    shootingPct: awayShootPct,
    ppGoals: awayPPGoals,
    ppTries: awayPPTries,
    ppTime: formatTime(awayPPTimeSec),
    ppShots: awayPPShots,
    shGoals: awaySHGoals,
    breakawayGoals: awayBreakGoals,
    breakawayTries: awayBreakTries,
    oneTimerGoals: awayOneTimerGoals,
    oneTimerTries: awayOneTimerTries,
    penaltyShotGoals: awayPenShotGoals,
    penaltyShotTries: awayPenShotTries,
    faceoffWins: awayFaceoffWins,
    checks: awayChecks,
    penalties: awayPenalties,
    pim: awayPIM,
    attackZoneTime: formatTime(awayAttackZoneTimeSec),
    passComps: awayPassComps,
    passTries: awayPassTries,
    goalsP1: awayGoalsP1,
    goalsP2: awayGoalsP2,
    goalsP3: awayGoalsP3,
    goalsOT: awayGoalsOT,
    shotsP1: awayShotsP1,
    shotsP2: awayShotsP2,
    shotsP3: awayShotsP3,
    shotsOT: awayShotsOT
  };

  return {
    matchup: `${awayTeamCode} @ ${homeTeamCode}`,
    homeTeam: homeTeamStats,
    awayTeam: awayTeamStats,
    isOT: hasOT,
    gameLength: formatTime(gameLengthSec),
    totalFaceoffs: awayFaceoffWins + homeFaceoffWins,
    goals: parsedGoals,
    penalties: parsedPenalties,
    homeGoalies,
    awayGoalies,
    homeSkaters,
    awaySkaters
  };
}
