import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { formatTime } from '@/lib/parsers/savestate';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://prdfunbzqsvqlyiwmuqp.supabase.co';
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0'
};

const STORAGE_PATH = 'arena-records/arena_records_v1.json';

export interface CoachAiScoutingProfile {
  coachName: string;
  gamesAnalyzed: number;
  oneTimerRate: number;      // 0..100
  breakawayRate: number;     // 0..100
  passFrequency: number;     // 0..100
  checkAggression: number;   // 0..100
  attackZoneShare: number;   // 0..100
  preferredTactic: string;
  aiCounterStrategy: string;
  counterWeights: {
    oneTimerDefense: number;
    breakawayTrap: number;
    forecheckAggression: number;
    faceoffCounter: number;
    slotLockdown: number;
  };
  updatedAt: string;
}

export interface AdaptiveAiModelState {
  generation: number;
  eloRating: number;
  gamesLearned: number;
  wins: number;
  losses: number;
  ties: number;
  goalsFor: number;
  goalsAgainst: number;
  lastLearnedSummary: string;
  globalWeights: {
    oneTimerDefense: number;
    breakawayTrap: number;
    slotCoverage: number;
    forecheckAggression: number;
    faceoffTimingSkill: number;
    clutchFactor: number;
  };
  coachProfiles: Record<string, CoachAiScoutingProfile>;
}

export interface StoredArenaMatch {
  id: string;
  sessionId?: string;
  signature: string;
  playedAt: string;
  romLabel: string;
  seasonId: string | number;
  homeTeam: string;
  awayTeam: string;
  homeCoach: string;
  awayCoach: string;
  homeGoals: number;
  awayGoals: number;
  isOT: boolean;
  homeShots: number;
  awayShots: number;
  homeChecks: number;
  awayChecks: number;
  homeOneTimerGoals: number;
  awayOneTimerGoals: number;
  homeBreakawayGoals: number;
  awayBreakawayGoals: number;
  homeFaceoffWins: number;
  awayFaceoffWins: number;
  fastestGoalSec: number | null;
  fastestGoalPeriod: number | null;
  fastestGoalScorer: string | null;
  fastestGoalTeam: string | null;
  fastestGoalCoach: string | null;
  fastestTwoGoalsSpanSec: number | null;
  fastestTwoGoalsCoach: string | null;
  fastestTwoGoalsTeam: string | null;
  fastestThreeGoalsSpanSec: number | null;
  fastestThreeGoalsCoach: string | null;
  fastestThreeGoalsTeam: string | null;
  fastestOtGoalSec: number | null;
  fastestOtGoalScorer: string | null;
  fastestOtGoalCoach: string | null;
  topPlayerGoalsName: string | null;
  topPlayerGoalsCount: number;
  topPlayerGoalsCoach: string | null;
  topPlayerPointsName: string | null;
  topPlayerPointsCount: number;
  topPlayerPointsCoach: string | null;
  isVsAi: boolean;
}

interface StoredArenaData {
  aiModel: AdaptiveAiModelState;
  matches: StoredArenaMatch[];
  updatedAt: string;
}

const DEFAULT_AI_MODEL: AdaptiveAiModelState = {
  generation: 1,
  eloRating: 1200,
  gamesLearned: 0,
  wins: 0,
  losses: 0,
  ties: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  lastLearnedSummary: '95-AI Neural CPU online — learns exclusively from live games played in the NHL95.NET Online Arena and scales difficulty with every game.',
  globalWeights: {
    oneTimerDefense: 55,
    breakawayTrap: 55,
    slotCoverage: 58,
    forecheckAggression: 54,
    faceoffTimingSkill: 56,
    clutchFactor: 60
  },
  coachProfiles: {}
};

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}

async function loadStoredArenaData(supabase: any): Promise<StoredArenaData> {
  try {
    const { data, error } = await supabase.storage.from('roms').download(STORAGE_PATH);
    if (!error && data) {
      const text = await data.text();
      const parsed = JSON.parse(text);
      const matches: StoredArenaMatch[] = Array.isArray(parsed.matches) ? parsed.matches : [];
      const rawAi = parsed.aiModel || {};
      // If storage had the old pre-seeded default (gamesLearned: 42, generation: 14) with 0 Arena matches, reset to clean Arena-only baseline
      const isLegacyPreseed = matches.length === 0 && rawAi.gamesLearned === 42 && rawAi.generation === 14;
      const aiModel: AdaptiveAiModelState = isLegacyPreseed
        ? { ...DEFAULT_AI_MODEL, coachProfiles: {} }
        : {
            ...DEFAULT_AI_MODEL,
            ...rawAi,
            globalWeights: {
              ...DEFAULT_AI_MODEL.globalWeights,
              ...(rawAi.globalWeights || {})
            },
            coachProfiles: rawAi.coachProfiles || {}
          };
      return {
        aiModel,
        matches,
        updatedAt: parsed.updatedAt || new Date().toISOString()
      };
    }
  } catch {}
  return {
    aiModel: { ...DEFAULT_AI_MODEL, coachProfiles: {} },
    matches: [],
    updatedAt: new Date().toISOString()
  };
}

async function saveStoredArenaData(supabase: any, payload: StoredArenaData): Promise<void> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload, null, 2));
  const { error } = await supabase.storage.from('roms').upload(STORAGE_PATH, bytes, {
    contentType: 'application/json',
    cacheControl: '0',
    upsert: true
  });
  if (error) {
    await supabase.storage.from('roms').remove([STORAGE_PATH]);
    await supabase.storage.from('roms').upload(STORAGE_PATH, bytes, {
      contentType: 'application/json',
      cacheControl: '0',
      upsert: true
    });
  }
}

function updateAiModelFromTelemetry(
  aiModel: AdaptiveAiModelState,
  coachName: string,
  teamStats: {
    goals: number;
    oppGoals: number;
    shots: number;
    oneTimerGoals: number;
    oneTimerTries: number;
    breakawayGoals: number;
    breakawayTries: number;
    passComps: number;
    passTries: number;
    checks: number;
    faceoffWins: number;
    oppFaceoffWins: number;
    attackZoneSec: number;
    oppAttackZoneSec: number;
  },
  isVsAi: boolean
): AdaptiveAiModelState {
  const cleanCoach = (coachName || 'Arena Coach').trim();
  const key = cleanCoach.toLowerCase();
  const prev = aiModel.coachProfiles[key] || {
    coachName: cleanCoach,
    gamesAnalyzed: 0,
    oneTimerRate: 35,
    breakawayRate: 25,
    passFrequency: 50,
    checkAggression: 45,
    attackZoneShare: 50,
    preferredTactic: 'Balanced 200-Foot Attack',
    aiCounterStrategy: 'Hybrid Slot Containment + Active Stick Poke Check',
    counterWeights: {
      oneTimerDefense: 70,
      breakawayTrap: 68,
      forecheckAggression: 65,
      faceoffCounter: 70,
      slotLockdown: 72
    },
    updatedAt: new Date().toISOString()
  };

  const shots = Math.max(1, teamStats.shots || 10);
  const obsOneTimerRate = clamp(((teamStats.oneTimerTries || teamStats.oneTimerGoals * 2) / shots) * 100, 5, 98);
  const obsBreakawayRate = clamp(((teamStats.breakawayTries || teamStats.breakawayGoals * 2) / shots) * 100, 5, 98);
  const obsPassFreq = clamp((teamStats.passComps / Math.max(1, teamStats.passComps + shots)) * 100, 10, 95);
  const obsCheckAgg = clamp((teamStats.checks / 28) * 100, 10, 98);
  const totalAz = Math.max(1, (teamStats.attackZoneSec || 180) + (teamStats.oppAttackZoneSec || 180));
  const obsAzShare = clamp(((teamStats.attackZoneSec || 180) / totalAz) * 100, 15, 85);

  // Exponential moving average so AI adapts smoothly and remembers history
  const alpha = prev.gamesAnalyzed === 0 ? 0.75 : 0.35;
  const nextOneTimer = clamp(prev.oneTimerRate * (1 - alpha) + obsOneTimerRate * alpha, 5, 99);
  const nextBreakaway = clamp(prev.breakawayRate * (1 - alpha) + obsBreakawayRate * alpha, 5, 99);
  const nextPass = clamp(prev.passFrequency * (1 - alpha) + obsPassFreq * alpha, 10, 99);
  const nextCheck = clamp(prev.checkAggression * (1 - alpha) + obsCheckAgg * alpha, 10, 99);
  const nextAz = clamp(prev.attackZoneShare * (1 - alpha) + obsAzShare * alpha, 15, 90);

  let preferredTactic = 'Balanced 200-Foot Attack';
  let aiCounterStrategy = 'Disciplined Gap Control + High-Percentage Counter-Attacks';

  if (nextOneTimer >= 42 && nextOneTimer >= nextBreakaway) {
    preferredTactic = 'Cross-Crease One-Timer Specialist';
    aiCounterStrategy = 'Shadow Backdoor Wingers + Intercept Royal-Road Pass Lanes';
  } else if (nextBreakaway >= 35) {
    preferredTactic = 'Speed-Burst Breakaway Rusher';
    aiCounterStrategy = 'Sagging Blue-Line Trap + Aggressive Poke-Check Timing';
  } else if (nextCheck >= 62) {
    preferredTactic = 'Heavy Enforcer Forecheck & Hit Parade';
    aiCounterStrategy = 'Quick 1-Touch Outlet Passes + Draw PowerPlay Penalties';
  } else if (nextAz >= 58) {
    preferredTactic = 'Relentless O-Zone Cycling & Slot Pressure';
    aiCounterStrategy = 'Collapsed Net-Front Box + Stretch-Pass Breakouts';
  }

  const humanWon = teamStats.goals > teamStats.oppGoals;
  const boost = humanWon ? 4 : 2;

  const updatedProfile: CoachAiScoutingProfile = {
    coachName: cleanCoach,
    gamesAnalyzed: prev.gamesAnalyzed + 1,
    oneTimerRate: nextOneTimer,
    breakawayRate: nextBreakaway,
    passFrequency: nextPass,
    checkAggression: nextCheck,
    attackZoneShare: nextAz,
    preferredTactic,
    aiCounterStrategy,
    counterWeights: {
      oneTimerDefense: clamp(Math.max(prev.counterWeights.oneTimerDefense, nextOneTimer + 18) + (teamStats.oneTimerGoals > 1 ? boost : 1), 50, 99),
      breakawayTrap: clamp(Math.max(prev.counterWeights.breakawayTrap, nextBreakaway + 20) + (teamStats.breakawayGoals > 0 ? boost : 1), 50, 99),
      forecheckAggression: clamp(prev.counterWeights.forecheckAggression + (humanWon ? 3 : 1), 50, 99),
      faceoffCounter: clamp(prev.counterWeights.faceoffCounter + (teamStats.faceoffWins > teamStats.oppFaceoffWins ? 3 : 1), 50, 99),
      slotLockdown: clamp(prev.counterWeights.slotLockdown + (teamStats.goals >= 4 ? 4 : 2), 55, 99)
    },
    updatedAt: new Date().toISOString()
  };

  const nextGlobal = {
    oneTimerDefense: clamp(aiModel.globalWeights.oneTimerDefense + (teamStats.oneTimerGoals > 1 ? 2 : 1), 60, 99),
    breakawayTrap: clamp(aiModel.globalWeights.breakawayTrap + (teamStats.breakawayGoals > 0 ? 2 : 1), 60, 99),
    slotCoverage: clamp(aiModel.globalWeights.slotCoverage + 1, 60, 99),
    forecheckAggression: clamp(aiModel.globalWeights.forecheckAggression + 1, 60, 99),
    faceoffTimingSkill: clamp(aiModel.globalWeights.faceoffTimingSkill + 1, 60, 99),
    clutchFactor: clamp(aiModel.globalWeights.clutchFactor + 1, 65, 99)
  };

  let nextWins = aiModel.wins;
  let nextLosses = aiModel.losses;
  let nextTies = aiModel.ties;
  let nextElo = aiModel.eloRating;

  if (isVsAi) {
    if (teamStats.oppGoals > teamStats.goals) {
      nextWins++;
      nextElo = clamp(nextElo + 14, 1100, 2400);
    } else if (teamStats.goals > teamStats.oppGoals) {
      nextLosses++;
      // Even on a loss, AI learns from the coach's attack and increases its neural generation!
      nextElo = clamp(nextElo + 6, 1100, 2400);
    } else {
      nextTies++;
      nextElo = clamp(nextElo + 8, 1100, 2400);
    }
  } else {
    nextElo = clamp(nextElo + 3, 1100, 2400);
  }

  return {
    ...aiModel,
    generation: aiModel.generation + 1,
    eloRating: nextElo,
    gamesLearned: aiModel.gamesLearned + 1,
    wins: nextWins,
    losses: nextLosses,
    ties: nextTies,
    goalsFor: aiModel.goalsFor + (isVsAi ? teamStats.oppGoals : 0),
    goalsAgainst: aiModel.goalsAgainst + (isVsAi ? teamStats.goals : 0),
    lastLearnedSummary: `Gen ${aiModel.generation + 1}: Learned from ${cleanCoach} (${preferredTactic}) → ${aiCounterStrategy}.`,
    globalWeights: nextGlobal,
    coachProfiles: {
      ...aiModel.coachProfiles,
      [key]: updatedProfile
    }
  };
}

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const storedArena = await loadStoredArenaData(supabase);

    interface CoachAgg {
      coachKey: string;
      coachName: string;
      favoriteTeam: string;
      teamCounts: Record<string, number>;
      gp: number;
      wins: number;
      losses: number;
      ties: number;
      otl: number;
      points: number;
      winPct: number;
      goalsFor: number;
      goalsAgainst: number;
      goalDiff: number;
      gpg: number;
      shotsFor: number;
      shootingPct: number;
      checks: number;
      totalChecks: number;
      oneTimerGoals: number;
      breakawayGoals: number;
      shutouts: number;
      mostGoalsInGame: number;
      fastestGoalSec: number | null;
      fastestGoalLabel: string | null;
      arenaGamesPlayed: number;
      vsAiWins: number;
      vsAiLosses: number;
    }

    const coachMap = new Map<string, CoachAgg>();

    const getOrCreateCoach = (rawName: string): CoachAgg => {
      const clean = (rawName || 'Unknown Coach').trim();
      const key = clean.toLowerCase();
      let entry = coachMap.get(key);
      if (!entry) {
        entry = {
          coachKey: key,
          coachName: clean,
          favoriteTeam: '',
          teamCounts: {},
          gp: 0,
          wins: 0,
          losses: 0,
          ties: 0,
          otl: 0,
          points: 0,
          winPct: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDiff: 0,
          gpg: 0,
          shotsFor: 0,
          shootingPct: 0,
          checks: 0,
          totalChecks: 0,
          oneTimerGoals: 0,
          breakawayGoals: 0,
          shutouts: 0,
          mostGoalsInGame: 0,
          fastestGoalSec: null,
          fastestGoalLabel: null,
          arenaGamesPlayed: 0,
          vsAiWins: 0,
          vsAiLosses: 0
        };
        coachMap.set(key, entry);
      }
      return entry;
    };

    const singleGameGoalsRecords: Array<{ coachName: string; team: string; value: number; detail: string; romLabel: string }> = [];
    const combinedGameGoalsRecords: Array<{ coachName: string; team: string; value: number; detail: string; romLabel: string }> = [];
    const checksSingleGameRecords: Array<{ coachName: string; team: string; value: number; detail: string; romLabel: string }> = [];
    const oneTimerSingleGameRecords: Array<{ coachName: string; team: string; value: number; detail: string; romLabel: string }> = [];
    const blowoutRecords: Array<{ coachName: string; team: string; value: number; detail: string; romLabel: string }> = [];
    const fastestOpeningGoals: Array<{ coachName: string; team: string; seconds: number; value: string; detail: string; romLabel: string }> = [];
    const fastestTwoGoalsList: Array<{ coachName: string; team: string; seconds: number; value: string; detail: string; romLabel: string }> = [];
    const fastestThreeGoalsList: Array<{ coachName: string; team: string; seconds: number; value: string; detail: string; romLabel: string }> = [];
    const fastestOtGoalsList: Array<{ coachName: string; team: string; seconds: number; value: string; detail: string; romLabel: string }> = [];

    // Process ONLY games played online in the NHL95.NET Arena (storedArena.matches)
    for (const m of storedArena.matches) {
      const hName = m.homeCoach || 'Home Coach';
      const aName = m.awayCoach || 'Away Coach';
      const hGoals = Number(m.homeGoals || 0);
      const aGoals = Number(m.awayGoals || 0);
      const isOt = Boolean(m.isOT);

      const processSide = (
        cName: string,
        oppName: string,
        myTeam: string,
        oppTeam: string,
        gf: number,
        ga: number,
        shots: number,
        checks: number,
        oneTimers: number,
        breakaways: number
      ) => {
        if (cName.toUpperCase() === 'CPU' || cName.includes('95-AI')) return;
        const c = getOrCreateCoach(cName);
        c.gp++;
        c.arenaGamesPlayed++;
        if (myTeam) {
          c.teamCounts[myTeam] = (c.teamCounts[myTeam] || 0) + 1;
        }
        c.goalsFor += gf;
        c.goalsAgainst += ga;
        c.shotsFor += shots;
        c.checks += checks;
        c.totalChecks += checks;
        c.oneTimerGoals += oneTimers;
        c.breakawayGoals += breakaways;
        if (gf > c.mostGoalsInGame) c.mostGoalsInGame = gf;
        if (ga === 0 && (gf > 0 || shots > 0)) c.shutouts++;

        if (gf > ga) {
          c.wins++;
          c.points += 2;
          if (m.isVsAi) c.vsAiWins++;
        } else if (gf < ga) {
          if (isOt) {
            c.otl++;
            c.points += 1;
          } else {
            c.losses++;
          }
          if (m.isVsAi) c.vsAiLosses++;
        } else {
          c.ties++;
          c.points += 1;
        }

        singleGameGoalsRecords.push({
          coachName: cName,
          team: myTeam || '',
          value: gf,
          detail: `${myTeam} ${gf} vs ${oppTeam} ${ga} (vs ${oppName})`,
          romLabel: m.romLabel || 'W16'
        });

        if (checks > 0) {
          checksSingleGameRecords.push({
            coachName: cName,
            team: myTeam || '',
            value: checks,
            detail: `${checks} Checks • ${myTeam} vs ${oppTeam} (${oppName})`,
            romLabel: m.romLabel || 'W16'
          });
        }

        if (oneTimers > 0) {
          oneTimerSingleGameRecords.push({
            coachName: cName,
            team: myTeam || '',
            value: oneTimers,
            detail: `${oneTimers} 1T Goals • ${myTeam} vs ${oppTeam} (${oppName})`,
            romLabel: m.romLabel || 'W16'
          });
        }

        if (gf > ga) {
          blowoutRecords.push({
            coachName: cName,
            team: myTeam || '',
            value: gf - ga,
            detail: `+${gf - ga} Diff (${myTeam} ${gf} - ${ga} ${oppTeam} vs ${oppName})`,
            romLabel: m.romLabel || 'W16'
          });
        }
      };

      processSide(
        hName,
        aName,
        m.homeTeam,
        m.awayTeam,
        hGoals,
        aGoals,
        m.homeShots || 0,
        m.homeChecks || 0,
        m.homeOneTimerGoals || 0,
        m.homeBreakawayGoals || 0
      );
      processSide(
        aName,
        hName,
        m.awayTeam,
        m.homeTeam,
        aGoals,
        hGoals,
        m.awayShots || 0,
        m.awayChecks || 0,
        m.awayOneTimerGoals || 0,
        m.awayBreakawayGoals || 0
      );

      combinedGameGoalsRecords.push({
        coachName: `${aName} vs ${hName}`,
        team: `${m.awayTeam}@${m.homeTeam}`,
        value: hGoals + aGoals,
        detail: `${m.awayTeam} ${aGoals} @ ${m.homeTeam} ${hGoals}`,
        romLabel: m.romLabel || 'W16'
      });

      if (typeof m.fastestGoalSec === 'number' && m.fastestGoalSec >= 0) {
        const fCoach = m.fastestGoalCoach || hName;
        const label = `${formatTime(m.fastestGoalSec)} (P${m.fastestGoalPeriod || 1})`;
        fastestOpeningGoals.push({
          coachName: fCoach,
          team: m.fastestGoalTeam || '',
          seconds: m.fastestGoalSec + ((m.fastestGoalPeriod || 1) - 1) * 300,
          value: label,
          detail: `${m.fastestGoalScorer || 'Scorer'} (${m.fastestGoalTeam || ''}) • ${m.awayTeam} @ ${m.homeTeam}`,
          romLabel: m.romLabel || 'W16'
        });

        const coachObj = coachMap.get(fCoach.toLowerCase());
        if (coachObj && (coachObj.fastestGoalSec === null || m.fastestGoalSec < coachObj.fastestGoalSec)) {
          coachObj.fastestGoalSec = m.fastestGoalSec;
          coachObj.fastestGoalLabel = `${label} (${m.fastestGoalScorer || 'Goal'})`;
        }
      }

      if (typeof m.fastestTwoGoalsSpanSec === 'number' && m.fastestTwoGoalsSpanSec >= 0) {
        fastestTwoGoalsList.push({
          coachName: m.fastestTwoGoalsCoach || hName,
          team: m.fastestTwoGoalsTeam || '',
          seconds: m.fastestTwoGoalsSpanSec,
          value: `${formatTime(m.fastestTwoGoalsSpanSec)} span`,
          detail: `${m.fastestTwoGoalsTeam || ''} • ${m.awayTeam} @ ${m.homeTeam}`,
          romLabel: m.romLabel || 'W16'
        });
      }

      if (typeof m.fastestThreeGoalsSpanSec === 'number' && m.fastestThreeGoalsSpanSec >= 0) {
        fastestThreeGoalsList.push({
          coachName: m.fastestThreeGoalsCoach || hName,
          team: m.fastestThreeGoalsTeam || '',
          seconds: m.fastestThreeGoalsSpanSec,
          value: `${formatTime(m.fastestThreeGoalsSpanSec)} span`,
          detail: `${m.fastestThreeGoalsTeam || ''} Hat-Trick Burst • ${m.awayTeam} @ ${m.homeTeam}`,
          romLabel: m.romLabel || 'W16'
        });
      }

      if (typeof m.fastestOtGoalSec === 'number' && m.fastestOtGoalSec >= 0) {
        fastestOtGoalsList.push({
          coachName: m.fastestOtGoalCoach || hName,
          team: '',
          seconds: m.fastestOtGoalSec,
          value: `${formatTime(m.fastestOtGoalSec)} OT`,
          detail: `${m.fastestOtGoalScorer || 'OT Winner'} • ${m.awayTeam} @ ${m.homeTeam}`,
          romLabel: m.romLabel || 'W16'
        });
      }
    }

    // Finalize derived coach ratios strictly from Arena games
    const coachLeaderboard = Array.from(coachMap.values())
      .filter(c => c.gp > 0)
      .map(c => {
        const winPct = c.gp > 0 ? Number(((c.wins / c.gp) * 100).toFixed(1)) : 0;
        const gpg = c.gp > 0 ? Number((c.goalsFor / c.gp).toFixed(2)) : 0;
        const shootingPct = c.shotsFor > 0 ? Number(((c.goalsFor / c.shotsFor) * 100).toFixed(1)) : 0;
        const favTeam =
          Object.entries(c.teamCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
        return {
          ...c,
          favoriteTeam: favTeam,
          goalDiff: c.goalsFor - c.goalsAgainst,
          winPct,
          gpg,
          shootingPct
        };
      })
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.goalDiff - a.goalDiff;
      });

    // Sort All-Time Arena Records lists
    singleGameGoalsRecords.sort((a, b) => b.value - a.value);
    combinedGameGoalsRecords.sort((a, b) => b.value - a.value);
    checksSingleGameRecords.sort((a, b) => b.value - a.value);
    oneTimerSingleGameRecords.sort((a, b) => b.value - a.value);
    blowoutRecords.sort((a, b) => b.value - a.value);
    fastestOpeningGoals.sort((a, b) => a.seconds - b.seconds);
    fastestTwoGoalsList.sort((a, b) => a.seconds - b.seconds);
    fastestThreeGoalsList.sort((a, b) => a.seconds - b.seconds);
    fastestOtGoalsList.sort((a, b) => a.seconds - b.seconds);

    const topWinsCoach = [...coachLeaderboard].sort((a, b) => b.wins - a.wins)[0];
    const topGoalsCoach = [...coachLeaderboard].sort((a, b) => b.goalsFor - a.goalsFor)[0];
    const topShutoutsCoach = [...coachLeaderboard].filter(c => c.shutouts > 0).sort((a, b) => b.shutouts - a.shutouts)[0];

    const makeCard = (
      category: string,
      valueLabel: string,
      holderCoach: string,
      holderTeam: string,
      detail: string,
      seasonLabel = 'ONLINE ARENA'
    ) => ({
      category,
      valueLabel,
      holderCoach,
      holderTeam,
      detail,
      seasonLabel
    });

    const allTimeRecords = {
      mostWinsCareer: topWinsCoach
        ? makeCard(
            'Most Arena Wins',
            `${topWinsCoach.wins} Wins`,
            topWinsCoach.coachName,
            topWinsCoach.favoriteTeam,
            `${topWinsCoach.wins}-${topWinsCoach.losses}-${topWinsCoach.ties} (${topWinsCoach.winPct}% Win • ${topWinsCoach.gp} Arena GP)`
          )
        : makeCard('Most Arena Wins', '0 Wins', 'Open Record', '', 'Play an online Arena match to claim #1!'),

      mostGoalsCareer: topGoalsCoach
        ? makeCard(
            'Most Arena Goals (Career)',
            `${topGoalsCoach.goalsFor} Goals`,
            topGoalsCoach.coachName,
            topGoalsCoach.favoriteTeam,
            `${topGoalsCoach.gpg} GPG across ${topGoalsCoach.gp} Arena Games (${topGoalsCoach.shootingPct}% SH)`
          )
        : makeCard('Most Arena Goals (Career)', '0 Goals', 'Open Record', '', 'Score in the Online Arena to claim #1!'),

      mostGoalsSingleGame: singleGameGoalsRecords[0]
        ? makeCard(
            'Most Goals (Single Game)',
            `${singleGameGoalsRecords[0].value} Goals`,
            singleGameGoalsRecords[0].coachName,
            singleGameGoalsRecords[0].team,
            singleGameGoalsRecords[0].detail,
            `ARENA • ${singleGameGoalsRecords[0].romLabel}`
          )
        : makeCard('Most Goals (Single Game)', '0 Goals', 'Open Record', '', 'Single-game Arena goal record open!'),

      mostCombinedGoalsGame: combinedGameGoalsRecords[0]
        ? makeCard(
            'Highest Scoring Arena Game',
            `${combinedGameGoalsRecords[0].value} Combined G`,
            combinedGameGoalsRecords[0].coachName,
            combinedGameGoalsRecords[0].team,
            combinedGameGoalsRecords[0].detail,
            `ARENA • ${combinedGameGoalsRecords[0].romLabel}`
          )
        : makeCard('Highest Scoring Arena Game', '0 Goals', 'Open Record', '', 'Combined single-game goal record open!'),

      fastestGoal: fastestOpeningGoals[0]
        ? makeCard(
            'Fastest Opening Goal',
            fastestOpeningGoals[0].value,
            fastestOpeningGoals[0].coachName,
            fastestOpeningGoals[0].team,
            fastestOpeningGoals[0].detail,
            `ARENA • ${fastestOpeningGoals[0].romLabel}`
          )
        : makeCard('Fastest Opening Goal', '—', 'Open Record', '', 'Fastest goal from opening puck drop in the Arena'),

      fastestTwoGoals: fastestTwoGoalsList[0]
        ? makeCard(
            'Fastest 2 Goals',
            fastestTwoGoalsList[0].value,
            fastestTwoGoalsList[0].coachName,
            fastestTwoGoalsList[0].team,
            fastestTwoGoalsList[0].detail,
            `ARENA • ${fastestTwoGoalsList[0].romLabel}`
          )
        : makeCard('Fastest 2 Goals', '—', 'Open Record', '', 'Fastest 2 consecutive goals by 1 coach in the Arena'),

      fastestThreeGoals: fastestThreeGoalsList[0]
        ? makeCard(
            'Fastest 3 Goals (Burst)',
            fastestThreeGoalsList[0].value,
            fastestThreeGoalsList[0].coachName,
            fastestThreeGoalsList[0].team,
            fastestThreeGoalsList[0].detail,
            `ARENA • ${fastestThreeGoalsList[0].romLabel}`
          )
        : makeCard('Fastest 3 Goals (Burst)', '—', 'Open Record', '', 'Fastest 3-goal outburst in an online Arena game'),

      fastestOvertimeGoal: fastestOtGoalsList[0]
        ? makeCard(
            'Fastest Overtime Winner',
            fastestOtGoalsList[0].value,
            fastestOtGoalsList[0].coachName,
            fastestOtGoalsList[0].team,
            fastestOtGoalsList[0].detail,
            `ARENA • ${fastestOtGoalsList[0].romLabel}`
          )
        : makeCard('Fastest Overtime Winner', '—', 'Open Record', '', 'Fastest sudden-death OT winner in the Arena'),

      mostChecksSingleGame: checksSingleGameRecords[0]
        ? makeCard(
            'Most Body Checks (Game)',
            `${checksSingleGameRecords[0].value} Checks`,
            checksSingleGameRecords[0].coachName,
            checksSingleGameRecords[0].team,
            checksSingleGameRecords[0].detail,
            `ARENA • ${checksSingleGameRecords[0].romLabel}`
          )
        : makeCard('Most Body Checks (Game)', '0 Checks', 'Open Record', '', 'Most body checks in an online Arena match'),

      mostOneTimersSingleGame: oneTimerSingleGameRecords[0]
        ? makeCard(
            'Most One-Timers (Game)',
            `${oneTimerSingleGameRecords[0].value} One-Timers`,
            oneTimerSingleGameRecords[0].coachName,
            oneTimerSingleGameRecords[0].team,
            oneTimerSingleGameRecords[0].detail,
            `ARENA • ${oneTimerSingleGameRecords[0].romLabel}`
          )
        : makeCard('Most One-Timers (Game)', '0 1T Goals', 'Open Record', '', 'Most one-timer goals in an online Arena match'),

      biggestBlowout: blowoutRecords[0]
        ? makeCard(
            'Biggest Arena Blowout',
            `+${blowoutRecords[0].value} Goal Margin`,
            blowoutRecords[0].coachName,
            blowoutRecords[0].team,
            blowoutRecords[0].detail,
            `ARENA • ${blowoutRecords[0].romLabel}`
          )
        : makeCard('Biggest Arena Blowout', '+0 Margin', 'Open Record', '', 'Largest victory margin in an online Arena match'),

      mostShutoutsCareer: topShutoutsCoach
        ? makeCard(
            'Most Arena Shutouts',
            `${topShutoutsCoach.shutouts} Shutouts`,
            topShutoutsCoach.coachName,
            topShutoutsCoach.favoriteTeam,
            `${topShutoutsCoach.gp} Arena GP • ${topShutoutsCoach.goalsAgainst} GA`
          )
        : makeCard('Most Arena Shutouts', '0 Shutouts', 'Open Record', '', 'Hold an opponent scoreless in the Online Arena!')
    };

    const gw = storedArena.aiModel.globalWeights;
    const normalizedProfiles: Record<string, any> = {};
    for (const [k, prof] of Object.entries(storedArena.aiModel.coachProfiles || {})) {
      const cw = prof.counterWeights || {
        oneTimerDefense: 55,
        breakawayTrap: 55,
        forecheckAggression: 55,
        faceoffCounter: 55,
        slotLockdown: 55
      };
      normalizedProfiles[k] = {
        ...prof,
        counterWeights: {
          oneTimerDefense: cw.oneTimerDefense > 1 ? cw.oneTimerDefense / 100 : cw.oneTimerDefense,
          breakawayTrap: cw.breakawayTrap > 1 ? cw.breakawayTrap / 100 : cw.breakawayTrap,
          forecheckAggression: cw.forecheckAggression > 1 ? cw.forecheckAggression / 100 : cw.forecheckAggression,
          faceoffCounter: cw.faceoffCounter > 1 ? cw.faceoffCounter / 100 : cw.faceoffCounter,
          slotLockdown: cw.slotLockdown > 1 ? cw.slotLockdown / 100 : cw.slotLockdown
        }
      };
      // Also index by exact display case so coachProfiles[myDisplayName] matches directly
      normalizedProfiles[prof.coachName] = normalizedProfiles[k];
    }

    const aiResponse = {
      ...storedArena.aiModel,
      aiWins: storedArena.aiModel.wins,
      aiLosses: storedArena.aiModel.losses,
      aiTies: storedArena.aiModel.ties,
      weights: {
        oneTimerDefense: gw.oneTimerDefense > 1 ? gw.oneTimerDefense / 100 : gw.oneTimerDefense,
        breakawayTrap: gw.breakawayTrap > 1 ? gw.breakawayTrap / 100 : gw.breakawayTrap,
        forecheckAggression: gw.forecheckAggression > 1 ? gw.forecheckAggression / 100 : gw.forecheckAggression,
        faceoffCounter: gw.faceoffTimingSkill > 1 ? gw.faceoffTimingSkill / 100 : gw.faceoffTimingSkill,
        slotLockdown: gw.slotCoverage > 1 ? gw.slotCoverage / 100 : gw.slotCoverage
      },
      coachProfiles: normalizedProfiles
    };

    return NextResponse.json(
      {
        totalGamesAnalyzed: storedArena.matches.length,
        aiModel: aiResponse,
        coachLeaderboard,
        recentArenaMatches: storedArena.matches.slice(0, 25),
        allTimeRecords
      },
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to load Arena records' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const stored = await loadStoredArenaData(supabase);

    const { action } = body;

    // 1. Live Mid-Game AI Learning Telemetry Tick (supports both flat fields and nested telemetry)
    if (action === 'ai-learn-tick') {
      const coachName = body.coachName || 'Arena Coach';
      const t = body.telemetry || body;
      stored.aiModel = updateAiModelFromTelemetry(
        stored.aiModel,
        coachName,
        {
          goals: Number(t.goals ?? t.homeGoals ?? 0),
          oppGoals: Number(t.oppGoals ?? t.awayGoals ?? 0),
          shots: Number(t.shots ?? t.homeShots ?? 10),
          oneTimerGoals: Number(t.oneTimerGoals ?? t.homeOneTimerGoals ?? 0),
          oneTimerTries: Number(t.oneTimerTries ?? t.homeOneTimers ?? 0),
          breakawayGoals: Number(t.breakawayGoals ?? t.homeBreakawayGoals ?? 0),
          breakawayTries: Number(t.breakawayTries ?? t.homeBreakaways ?? 0),
          passComps: Number(t.passComps ?? 0),
          passTries: Number(t.passTries ?? 0),
          checks: Number(t.checks ?? t.homeChecks ?? 0),
          faceoffWins: Number(t.faceoffWins ?? t.homeFaceoffs ?? 0),
          oppFaceoffWins: Number(t.oppFaceoffWins ?? t.awayFaceoffs ?? 0),
          attackZoneSec: Number(t.attackZoneSec ?? t.homeAttackZone ?? 120),
          oppAttackZoneSec: Number(t.oppAttackZoneSec ?? t.awayAttackZone ?? 120)
        },
        body.isVsAi !== undefined ? Boolean(body.isVsAi) : true
      );
      stored.updatedAt = new Date().toISOString();
      await saveStoredArenaData(supabase, stored);
      return NextResponse.json({ success: true, aiModel: stored.aiModel }, { status: 200, headers: NO_CACHE_HEADERS });
    }

    // 2. Record Full or Live Auto-Saved Arena Match & Train AI Model
    // Supports both flat payload from app/arena/page.tsx (action === 'record-match') and nested { game } payload
    const game = body.game;
    const ht = game?.homeTeam || {
      teamCode: body.homeTeam || 'HOME',
      goals: Number(body.homeGoals ?? 0),
      shots: Number(body.homeShots ?? 0),
      checks: Number(body.homeChecks ?? 0),
      oneTimerGoals: Number(body.homeOneTimerGoals ?? 0),
      oneTimerTries: Number(body.homeOneTimerTries ?? 0),
      breakawayGoals: Number(body.homeBreakawayGoals ?? 0),
      breakawayTries: Number(body.homeBreakawayTries ?? 0),
      faceoffWins: Number(body.homeFaceoffs ?? 0),
      passComps: Number(body.homePassComps ?? 0),
      passTries: Number(body.homePassTries ?? 0),
      attackZoneTime: body.homeAttackZoneTime
    };
    const at = game?.awayTeam || {
      teamCode: body.awayTeam || 'AWAY',
      goals: Number(body.awayGoals ?? 0),
      shots: Number(body.awayShots ?? 0),
      checks: Number(body.awayChecks ?? 0),
      oneTimerGoals: Number(body.awayOneTimerGoals ?? 0),
      oneTimerTries: Number(body.awayOneTimerTries ?? 0),
      breakawayGoals: Number(body.awayBreakawayGoals ?? 0),
      breakawayTries: Number(body.awayBreakawayTries ?? 0),
      faceoffWins: Number(body.awayFaceoffs ?? 0),
      passComps: Number(body.awayPassComps ?? 0),
      passTries: Number(body.awayPassTries ?? 0),
      attackZoneTime: body.awayAttackZoneTime
    };

    const isVsAi = Boolean(body.isVsAi);
    const hCoachClean = (body.homeCoach || 'Home Coach').trim();
    const aCoachClean = (body.awayCoach || (isVsAi ? '95-AI Neural CPU' : 'Away Coach')).trim();
    const romLabel = body.romLabel || body.romId || 'W16';
    const seasonId = body.seasonId || body.seasonLabel || 'ARENA';
    const sessionId = body.sessionId ? String(body.sessionId) : undefined;

    const goalsList = Array.isArray(game?.goals) ? game.goals : Array.isArray(body.goals) ? body.goals : [];
    const goalsKey = goalsList.map((g: any) => `${g.period}:${g.seconds}:${g.scorer}`).join('|');
    const signature = `${romLabel}_${at.teamCode}_${at.goals}_${ht.teamCode}_${ht.goals}_${at.shots}_${ht.shots}_${goalsKey}`;

    const existingSigIdx = stored.matches.findIndex(m => m.signature === signature);
    const existingSessionIdx = sessionId ? stored.matches.findIndex(m => m.sessionId === sessionId) : -1;

    // Compute fastest goal, fastest 2 goals, fastest 3 goals, fastest OT goal from goalsList
    let fastestGoalSec: number | null = null;
    let fastestGoalPeriod: number | null = null;
    let fastestGoalScorer: string | null = null;
    let fastestGoalTeam: string | null = null;
    let fastestGoalCoach: string | null = null;

    let fastestTwoGoalsSpanSec: number | null = null;
    let fastestTwoGoalsCoach: string | null = null;
    let fastestTwoGoalsTeam: string | null = null;

    let fastestThreeGoalsSpanSec: number | null = null;
    let fastestThreeGoalsCoach: string | null = null;
    let fastestThreeGoalsTeam: string | null = null;

    let fastestOtGoalSec: number | null = null;
    let fastestOtGoalScorer: string | null = null;
    let fastestOtGoalCoach: string | null = null;

    const sortedGoals = [...goalsList]
      .filter((g: any) => typeof g.seconds === 'number' && g.seconds >= 0)
      .map((g: any) => {
        const teamStr = String(g.team || '').toUpperCase();
        const inferredSide =
          g.side ||
          (teamStr && teamStr === String(ht.teamCode || '').toUpperCase() ? 'Home' : 'Away');
        return {
          ...g,
          side: inferredSide,
          absSeconds: ((Number(g.period) || 1) - 1) * 300 + Number(g.seconds)
        };
      })
      .sort((a, b) => a.absSeconds - b.absSeconds);

    if (sortedGoals.length > 0) {
      const first = sortedGoals[0];
      fastestGoalSec = Number(first.seconds);
      fastestGoalPeriod = Number(first.period) || 1;
      fastestGoalScorer = first.scorer || 'Skater';
      fastestGoalTeam = first.team || '';
      fastestGoalCoach = first.side === 'Home' ? hCoachClean : aCoachClean;
    }

    for (const side of ['Home', 'Away'] as const) {
      const sideGoals = sortedGoals.filter(g => g.side === side);
      const sideCoach = side === 'Home' ? hCoachClean : aCoachClean;
      const sideTeam = side === 'Home' ? ht.teamCode : at.teamCode;

      for (let i = 1; i < sideGoals.length; i++) {
        const span2 = Math.max(1, sideGoals[i].absSeconds - sideGoals[i - 1].absSeconds);
        if (fastestTwoGoalsSpanSec === null || span2 < fastestTwoGoalsSpanSec) {
          fastestTwoGoalsSpanSec = span2;
          fastestTwoGoalsCoach = sideCoach;
          fastestTwoGoalsTeam = sideTeam;
        }
      }

      for (let i = 2; i < sideGoals.length; i++) {
        const span3 = Math.max(2, sideGoals[i].absSeconds - sideGoals[i - 2].absSeconds);
        if (fastestThreeGoalsSpanSec === null || span3 < fastestThreeGoalsSpanSec) {
          fastestThreeGoalsSpanSec = span3;
          fastestThreeGoalsCoach = sideCoach;
          fastestThreeGoalsTeam = sideTeam;
        }
      }
    }

    const otGoals = sortedGoals.filter(g => Number(g.period) >= 4);
    if (otGoals.length > 0) {
      const otFirst = otGoals[0];
      fastestOtGoalSec = Number(otFirst.seconds);
      fastestOtGoalScorer = otFirst.scorer || 'Skater';
      fastestOtGoalCoach = otFirst.side === 'Home' ? hCoachClean : aCoachClean;
    }

    const allSkaters = [
      ...(game?.homeSkaters || []).map((s: any) => ({ ...s, coach: hCoachClean })),
      ...(game?.awaySkaters || []).map((s: any) => ({ ...s, coach: aCoachClean }))
    ];
    let topPlayerGoalsName: string | null = null;
    let topPlayerGoalsCount = 0;
    let topPlayerGoalsCoach: string | null = null;
    let topPlayerPointsName: string | null = null;
    let topPlayerPointsCount = 0;
    let topPlayerPointsCoach: string | null = null;

    for (const sk of allSkaters) {
      const g = Number(sk.goals || 0);
      const pts = Number(sk.points || g + Number(sk.assists || 0));
      if (g > topPlayerGoalsCount) {
        topPlayerGoalsCount = g;
        topPlayerGoalsName = sk.name;
        topPlayerGoalsCoach = sk.coach;
      }
      if (pts > topPlayerPointsCount) {
        topPlayerPointsCount = pts;
        topPlayerPointsName = sk.name;
        topPlayerPointsCoach = sk.coach;
      }
    }

    const parseTimeSec = (str?: string, fallbackSec?: number): number => {
      if (typeof fallbackSec === 'number' && fallbackSec > 0) return fallbackSec;
      if (!str || !str.includes(':')) return 120;
      const [m, s] = str.split(':').map(Number);
      return (m || 0) * 60 + (s || 0);
    };

    const matchEntry: StoredArenaMatch = {
      id: existingSessionIdx !== -1 ? stored.matches[existingSessionIdx].id : `match_${Date.now().toString(36)}`,
      sessionId,
      signature,
      playedAt: new Date().toISOString(),
      romLabel,
      seasonId,
      homeTeam: ht.teamCode || 'HOME',
      awayTeam: at.teamCode || 'AWAY',
      homeCoach: hCoachClean,
      awayCoach: aCoachClean,
      homeGoals: Number(ht.goals || 0),
      awayGoals: Number(at.goals || 0),
      isOT: Boolean(game?.isOT ?? body.isOvertime),
      homeShots: Number(ht.shots || 0),
      awayShots: Number(at.shots || 0),
      homeChecks: Number(ht.checks || 0),
      awayChecks: Number(at.checks || 0),
      homeOneTimerGoals: Number(ht.oneTimerGoals || 0),
      awayOneTimerGoals: Number(at.oneTimerGoals || 0),
      homeBreakawayGoals: Number(ht.breakawayGoals || 0),
      awayBreakawayGoals: Number(at.breakawayGoals || 0),
      homeFaceoffWins: Number(ht.faceoffWins || 0),
      awayFaceoffWins: Number(at.faceoffWins || 0),
      fastestGoalSec,
      fastestGoalPeriod,
      fastestGoalScorer,
      fastestGoalTeam,
      fastestGoalCoach,
      fastestTwoGoalsSpanSec,
      fastestTwoGoalsCoach,
      fastestTwoGoalsTeam,
      fastestThreeGoalsSpanSec,
      fastestThreeGoalsCoach,
      fastestThreeGoalsTeam,
      fastestOtGoalSec,
      fastestOtGoalScorer,
      fastestOtGoalCoach,
      topPlayerGoalsName,
      topPlayerGoalsCount,
      topPlayerGoalsCoach,
      topPlayerPointsName,
      topPlayerPointsCount,
      topPlayerPointsCoach,
      isVsAi
    };

    if (existingSigIdx === -1) {
      if (existingSessionIdx !== -1) {
        // Update in-progress Arena match in place as score/stats advance
        stored.matches[existingSessionIdx] = matchEntry;
      } else {
        stored.matches.unshift(matchEntry);
        if (stored.matches.length > 250) {
          stored.matches = stored.matches.slice(0, 250);
        }
      }

      // Train the Adaptive AI Model on the human coach(es) from this Arena game!
      stored.aiModel = updateAiModelFromTelemetry(
        stored.aiModel,
        hCoachClean,
        {
          goals: Number(ht.goals || 0),
          oppGoals: Number(at.goals || 0),
          shots: Number(ht.shots || 10),
          oneTimerGoals: Number(ht.oneTimerGoals || 0),
          oneTimerTries: Number(ht.oneTimerTries || 0),
          breakawayGoals: Number(ht.breakawayGoals || 0),
          breakawayTries: Number(ht.breakawayTries || 0),
          passComps: Number(ht.passComps || 0),
          passTries: Number(ht.passTries || 0),
          checks: Number(ht.checks || 0),
          faceoffWins: Number(ht.faceoffWins || 0),
          oppFaceoffWins: Number(at.faceoffWins || 0),
          attackZoneSec: parseTimeSec(ht.attackZoneTime, Number(body.homeAttackZoneSec)),
          oppAttackZoneSec: parseTimeSec(at.attackZoneTime, Number(body.awayAttackZoneSec))
        },
        isVsAi
      );

      if (!isVsAi && aCoachClean && !aCoachClean.includes('95-AI') && aCoachClean.toUpperCase() !== 'CPU') {
        stored.aiModel = updateAiModelFromTelemetry(
          stored.aiModel,
          aCoachClean,
          {
            goals: Number(at.goals || 0),
            oppGoals: Number(ht.goals || 0),
            shots: Number(at.shots || 10),
            oneTimerGoals: Number(at.oneTimerGoals || 0),
            oneTimerTries: Number(at.oneTimerTries || 0),
            breakawayGoals: Number(at.breakawayGoals || 0),
            breakawayTries: Number(at.breakawayTries || 0),
            passComps: Number(at.passComps || 0),
            passTries: Number(at.passTries || 0),
            checks: Number(at.checks || 0),
            faceoffWins: Number(at.faceoffWins || 0),
            oppFaceoffWins: Number(ht.faceoffWins || 0),
            attackZoneSec: parseTimeSec(at.attackZoneTime, Number(body.awayAttackZoneSec)),
            oppAttackZoneSec: parseTimeSec(ht.attackZoneTime, Number(body.homeAttackZoneSec))
          },
          false
        );
      }

      stored.updatedAt = new Date().toISOString();
      await saveStoredArenaData(supabase, stored);
    }

    return NextResponse.json(
      {
        success: true,
        alreadyRecorded: existingSigIdx !== -1,
        match: matchEntry,
        aiModel: stored.aiModel
      },
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to record Arena match' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
