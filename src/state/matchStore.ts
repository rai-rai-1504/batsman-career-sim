import { create } from 'zustand';
import {
  BallEvent,
  BallLength,
  BallLine,
  BowlerCategory,
  DeliveryCombination,
  DismissalType,
  Fixture,
  InningsResult,
  MatchResult,
  NpcPlayer,
  Player,
  ShotDirection,
  ShotStrokeType,
  Team,
  TimingQuality
} from '../types';
import { calculateTimingWindow, generateBallDelivery, gradeDeliveryTiming, simulateBall } from '../sim/ballEngine';
import { calculateSkillProgression, PostMatchProgressionResult } from '../sim/skillProgression';
import { soundManager } from '../audio/soundManager';

export type MatchPhase =
  | 'toss'
  | 'lineups'
  | 'ready'
  | 'bowling_runup'
  | 'ball_active'
  | 'hit_impact'
  | 'ball_flight'
  | 'simulating_ai_ball'
  | 'over_break'
  | 'innings_break'
  | 'match_finished';

interface BatterState {
  name: string;
  isUser: boolean;
  battingSkill: number;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  dismissal?: { type: DismissalType; bowler: string };
}

export interface LiveMatchState {
  fixture: Fixture | null;
  homeTeam: Team | null;
  awayTeam: Team | null;
  userPlayer: Player | null;
  userTeamId: string | null;
  tossWinnerId: string | null;
  tossDecision: 'bat' | 'bowl' | null;
  currentInningsNum: 1 | 2;
  innings1: InningsResult | null;
  innings2: InningsResult | null;
  
  // Current Innings dynamic state
  battingTeam: Team | null;
  bowlingTeam: Team | null;
  totalRuns: number;
  wickets: number;
  oversFacedBalls: number; // total valid balls bowled in innings
  maxOvers: number;
  targetRuns: number | null; // chasing in 2nd innings
  
  // Lineup tracking
  lineup: BatterState[];
  strikerIndex: number;
  nonStrikerIndex: number;
  nextBatterIndex: number;
  bowlerPool: NpcPlayer[];
  currentBowlerIndex: number;

  // Active Ball State
  phase: MatchPhase;
  currentBallLine: BallLine;
  currentBallLength: BallLength;
  currentBallCombination: DeliveryCombination;
  currentBallSpeed: number; // ms
  currentBallSpeedKmph: number; // km/h
  lastBallSpeedKmph: number | null; // for speedometer HUD
  currentBowlerCategory: BowlerCategory;
  showSpeedometer: boolean;
  ballReleaseTimestamp: number;
  idealContactTimestamp: number;
  timingWindowMs: number;
  hasUserActedOnCurrentBall: boolean;
  queuedDirection: ShotDirection | null;
  pendingShotEvent: BallEvent | null;
  pendingShotDirection: ShotDirection | null;
  currentTimingQuality: TimingQuality | null;
  currentTimingProgress: number | null;
  lastBallEvent: BallEvent | null;
  recentBallLogs: BallEvent[];
  userBallsFaced: BallEvent[];

  // Sim vs 3D Field Flow
  isOnField3D: boolean;
  isWalkoutAlertActive: boolean;

  // Hit impact juice
  hitStopActive: boolean;
  screenShakeIntensity: number; // 0 to 1

  // Final match results & user XP
  finalMatchResult: MatchResult | null;
  userProgressionResult: PostMatchProgressionResult | null;
}

interface MatchActions {
  initializeMatch: (fixture: Fixture, userPlayer: Player, userTeamId: string, allTeams: Team[]) => void;
  executeToss: () => void;
  startInnings: (inningsNum: 1 | 2) => void;
  prepareNextBall: () => void;
  confirmWalkoutAndLoad3D: () => void;
  startBowlerRunup: () => void;
  releaseBall: () => void;
  onDirectionInput: (direction: ShotDirection, timestamp?: number, strokeType?: ShotStrokeType) => void;
  executeContactImpact: () => void;
  onBallMissedTimeout: () => void;
  stepSimScoreboardBall: () => void;
  simulateUntilUserTurn: () => void;
  finishBallAndAdvance: () => void;
  concludeMatch: () => void;
  resetMatch: () => void;
}

const initialMatchState: LiveMatchState = {
  fixture: null,
  homeTeam: null,
  awayTeam: null,
  userPlayer: null,
  userTeamId: null,
  tossWinnerId: null,
  tossDecision: null,
  currentInningsNum: 1,
  innings1: null,
  innings2: null,
  battingTeam: null,
  bowlingTeam: null,
  totalRuns: 0,
  wickets: 0,
  oversFacedBalls: 0,
  maxOvers: 5,
  targetRuns: null,
  lineup: [],
  strikerIndex: 0,
  nonStrikerIndex: 1,
  nextBatterIndex: 2,
  bowlerPool: [],
  currentBowlerIndex: 0,
  phase: 'toss',
  currentBallLine: 'mid',
  currentBallLength: 'length',
  currentBallCombination: 'length_mid',
  currentBallSpeed: 1000,
  currentBallSpeedKmph: 110.0,
  lastBallSpeedKmph: null,
  currentBowlerCategory: 'medium',
  showSpeedometer: false,
  ballReleaseTimestamp: 0,
  idealContactTimestamp: 0,
  timingWindowMs: 200,
  hasUserActedOnCurrentBall: false,
  queuedDirection: null,
  pendingShotEvent: null,
  pendingShotDirection: null,
  currentTimingQuality: null,
  currentTimingProgress: null,
  lastBallEvent: null,
  recentBallLogs: [],
  userBallsFaced: [],
  isOnField3D: false,
  isWalkoutAlertActive: false,
  hitStopActive: false,
  screenShakeIntensity: 0,
  finalMatchResult: null,
  userProgressionResult: null,
};

export const useMatchStore = create<LiveMatchState & MatchActions>((set, get) => ({
  ...initialMatchState,

  initializeMatch: (fixture, userPlayer, userTeamId, allTeams) => {
    const homeTeam = allTeams.find((t) => t.id === fixture.homeTeamId)!;
    const awayTeam = allTeams.find((t) => t.id === fixture.awayTeamId)!;

    set({
      ...initialMatchState,
      fixture,
      homeTeam,
      awayTeam,
      userPlayer,
      userTeamId,
      phase: 'toss',
      isOnField3D: false,
      isWalkoutAlertActive: false,
    });
  },

  executeToss: () => {
    const { homeTeam, awayTeam, userTeamId } = get();
    if (!homeTeam || !awayTeam) return;

    const tossWinner = Math.random() < 0.5 ? homeTeam : awayTeam;
    let tossDecision: 'bat' | 'bowl';

    if (tossWinner.id === userTeamId) {
      tossDecision = Math.random() < 0.7 ? 'bat' : 'bowl';
    } else {
      tossDecision = Math.random() < 0.6 ? 'bat' : 'bowl';
    }

    set({
      tossWinnerId: tossWinner.id,
      tossDecision,
      phase: 'ready',
    });

    get().startInnings(1);
  },

  startInnings: (inningsNum) => {
    const { homeTeam, awayTeam, tossWinnerId, tossDecision, userPlayer, userTeamId, maxOvers, innings1 } = get();
    if (!homeTeam || !awayTeam || !tossWinnerId || !tossDecision) return;

    const tossLoser = tossWinnerId === homeTeam.id ? awayTeam : homeTeam;
    const tossWinner = tossWinnerId === homeTeam.id ? homeTeam : awayTeam;

    let battingTeam: Team;
    let bowlingTeam: Team;

    if (inningsNum === 1) {
      battingTeam = tossDecision === 'bat' ? tossWinner : tossLoser;
      bowlingTeam = tossDecision === 'bat' ? tossLoser : tossWinner;
    } else {
      battingTeam = tossDecision === 'bat' ? tossLoser : tossWinner;
      bowlingTeam = tossDecision === 'bat' ? tossWinner : tossLoser;
    }

    const isUserTeamBatting = battingTeam.id === userTeamId;
    const userPos = userPlayer?.battingPosition ?? 4;

    const lineup: BatterState[] = [];
    for (let i = 0; i < 11; i++) {
      if (isUserTeamBatting && userPlayer && i + 1 === userPos) {
        lineup.push({
          name: userPlayer.name,
          isUser: true,
          battingSkill: userPlayer.battingSkill,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
        });
      } else {
        const npc = battingTeam.squad[i];
        lineup.push({
          name: npc ? npc.name : `Batter ${i + 1}`,
          isUser: false,
          battingSkill: npc ? npc.battingSkill : 50,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
        });
      }
    }

    const bowlerPool = bowlingTeam.squad.filter((_, idx) => idx >= 5);
    const targetRuns = inningsNum === 2 && innings1 ? innings1.totalRuns + 1 : null;

    set({
      currentInningsNum: inningsNum,
      battingTeam,
      bowlingTeam,
      totalRuns: 0,
      wickets: 0,
      oversFacedBalls: 0,
      targetRuns,
      lineup,
      strikerIndex: 0,
      nonStrikerIndex: 1,
      nextBatterIndex: 2,
      bowlerPool: bowlerPool.length >= 2 ? bowlerPool : bowlingTeam.squad.slice(-4),
      currentBowlerIndex: 0,
      phase: 'ready',
      recentBallLogs: [],
      isOnField3D: false,
      isWalkoutAlertActive: false,
    });

    get().prepareNextBall();
  },

  prepareNextBall: () => {
    const { phase, wickets, oversFacedBalls, maxOvers, targetRuns, totalRuns, currentInningsNum, lineup, strikerIndex, isOnField3D } = get();

    const maxBalls = maxOvers * 6;
    const isInningsOver = wickets >= 10 || oversFacedBalls >= maxBalls || (targetRuns !== null && totalRuns >= targetRuns);

    if (isInningsOver) {
      if (currentInningsNum === 1) {
        const inn1 = buildInningsResult(get());
        set({
          innings1: inn1,
          phase: 'innings_break',
          isOnField3D: false,
          isWalkoutAlertActive: false,
        });
      } else {
        const inn2 = buildInningsResult(get());
        set({
          innings2: inn2,
          phase: 'match_finished',
          isOnField3D: false,
          isWalkoutAlertActive: false,
        });
        get().concludeMatch();
      }
      return;
    }

    const striker = lineup[strikerIndex];
    const isUserStriker = striker?.isUser ?? false;

    // Check if user is set to bat but not yet on field -> Trigger Walkout Alert & Pause!
    if (isUserStriker && !isOnField3D) {
      soundManager.playUiChime('success');
      set({
        isWalkoutAlertActive: true,
      });
    }

    const { bowlerPool } = get();
    const overNumber = Math.floor(oversFacedBalls / 6);
    const currentBowler = bowlerPool[overNumber % bowlerPool.length];
    const timingWindow = calculateTimingWindow(currentBowler.bowlingSkill);
    const delivery = generateBallDelivery(
      currentBowler.bowlingType,
      currentBowler.bowlerCategory,
      currentBowler.bowlingSkill,
      currentBowler.basePaceKmph
    );

    set({
      currentBallLine: delivery.line,
      currentBallLength: delivery.length,
      currentBallCombination: delivery.combination,
      currentBallSpeed: delivery.releaseSpeed,
      currentBallSpeedKmph: delivery.speedKmph,
      currentBowlerCategory: delivery.bowlerCategory,
      showSpeedometer: false,
      timingWindowMs: timingWindow,
      hasUserActedOnCurrentBall: false,
      queuedDirection: null,
      currentTimingQuality: null,
      currentTimingProgress: null,
      hitStopActive: false,
      screenShakeIntensity: 0,
      phase: 'ready',
    });
  },

  confirmWalkoutAndLoad3D: () => {
    soundManager.playUiChime('click');
    set({
      isWalkoutAlertActive: false,
      isOnField3D: true,
      phase: 'ready',
    });
  },

  startBowlerRunup: () => {
    const { phase } = get();
    if (phase !== 'ready') return;
    set({ phase: 'bowling_runup' });
  },

  releaseBall: () => {
    const now = Date.now();
    const { currentBallSpeed } = get();
    const idealTime = now + Math.round(currentBallSpeed * 0.72);

    set({
      phase: 'ball_active',
      ballReleaseTimestamp: now,
      idealContactTimestamp: idealTime,
      hasUserActedOnCurrentBall: false,
      currentTimingQuality: null,
      currentTimingProgress: null,
      queuedDirection: null,
    });
  },

  onDirectionInput: (direction, timestamp, strokeType) => {
    const state = get();
    if (state.hasUserActedOnCurrentBall) return;

    // STRICT RULE: We won't register an input until the ball has been released (important)
    if (state.phase !== 'ball_active') return;

    const striker = state.lineup[state.strikerIndex];
    if (!striker || !striker.isUser) return;

    const pressTime = timestamp || Date.now();
    const totalFlightMs = state.currentBallSpeed || 1000;
    const elapsedMs = Math.max(0, pressTime - state.ballReleaseTimestamp);
    const progressRatio = Math.max(0, Math.min(1, elapsedMs / totalFlightMs));
    const timingQuality = gradeDeliveryTiming(progressRatio, state.currentBallCombination);

    const currentBowler = state.bowlerPool[Math.floor(state.oversFacedBalls / 6) % state.bowlerPool.length];
    const overNum = Math.floor(state.oversFacedBalls / 6);
    const ballInOver = (state.oversFacedBalls % 6) + 1;

    const event = simulateBall(striker, currentBowler, {
      over: overNum,
      ballInOver,
      isUserBatting: true,
      deliveryLine: state.currentBallLine,
      deliveryLength: state.currentBallLength,
      deliveryCombination: state.currentBallCombination,
      bowlerCategory: state.currentBowlerCategory,
      speedKmph: state.currentBallSpeedKmph,
      userInput: {
        direction,
        timingOffsetMs: pressTime - state.idealContactTimestamp,
        windowWidthMs: state.timingWindowMs,
        timingQuality,
        progressRatio,
        strokeType: strokeType || 'standard',
      },
    });

    if (event.outcome === '6') {
      soundManager.playBatCrack('huge');
    } else if (event.outcome === '4') {
      soundManager.playBatCrack('medium');
    } else if (event.outcome === 'wicket') {
      soundManager.playWicketSound();
    } else if (event.runs > 0 || strokeType === 'defense') {
      soundManager.playBatCrack('soft');
    }

    const isHitStop = (timingQuality === 'ideal' || event.timingQuality === 'perfect') && (event.outcome === '6' || event.outcome === '4');
    const shake = event.outcome === '6' ? 1.0 : event.outcome === '4' ? 0.6 : 0;

    // Instant bat contact when key is pressed:
    // Meter freezes at exact progressRatio, sound plays, and ball launches off bat!
    set({
      hasUserActedOnCurrentBall: true,
      lastBallEvent: event,
      pendingShotEvent: null,
      pendingShotDirection: null,
      currentTimingQuality: timingQuality,
      currentTimingProgress: progressRatio,
      lastBallSpeedKmph: state.currentBallSpeedKmph || event.speedKmph || 110,
      showSpeedometer: true,
      hitStopActive: isHitStop,
      screenShakeIntensity: shake,
      phase: isHitStop ? 'hit_impact' : 'ball_flight',
      userBallsFaced: [...state.userBallsFaced, event],
    });

    if (isHitStop) {
      setTimeout(() => {
        set({ hitStopActive: false, phase: 'ball_flight' });
      }, 90);
    }
  },

  /**
   * Called when ball reaches the batsman without user input (timeout / leave)
   */
  executeContactImpact: () => {
    const state = get();
    if (state.phase !== 'ball_active') return;
    get().onBallMissedTimeout();
  },

  onBallMissedTimeout: () => {
    const state = get();
    if (state.phase !== 'ball_active') return;

    const striker = state.lineup[state.strikerIndex];
    if (!striker || !striker.isUser) return;

    const currentBowler = state.bowlerPool[Math.floor(state.oversFacedBalls / 6) % state.bowlerPool.length];
    const overNum = Math.floor(state.oversFacedBalls / 6);
    const ballInOver = (state.oversFacedBalls % 6) + 1;

    const event = simulateBall(striker, currentBowler, {
      over: overNum,
      ballInOver,
      isUserBatting: true,
      deliveryLine: state.currentBallLine,
      deliveryLength: state.currentBallLength,
      deliveryCombination: state.currentBallCombination,
      bowlerCategory: state.currentBowlerCategory,
      speedKmph: state.currentBallSpeedKmph,
      userInput: {
        direction: 'straight',
        timingOffsetMs: 9999,
        windowWidthMs: state.timingWindowMs,
        timingQuality: 'very_late',
        progressRatio: 1.0,
      },
    });

    if (event.outcome === 'wicket') {
      soundManager.playWicketSound();
    }

    set({
      hasUserActedOnCurrentBall: true,
      lastBallEvent: event,
      pendingShotEvent: null,
      pendingShotDirection: null,
      currentTimingQuality: 'very_late',
      currentTimingProgress: 1.0,
      lastBallSpeedKmph: state.currentBallSpeedKmph || event.speedKmph || 110,
      showSpeedometer: true,
      phase: 'ball_flight',
      userBallsFaced: [...state.userBallsFaced, event],
    });
  },

  stepSimScoreboardBall: () => {
    const state = get();
    if (state.isWalkoutAlertActive || state.isOnField3D) return;

    const striker = state.lineup[state.strikerIndex];
    if (!striker) return;

    // If user is striker, pause simulation and prompt walkout!
    if (striker.isUser) {
      soundManager.playUiChime('success');
      set({ isWalkoutAlertActive: true });
      return;
    }

    const currentBowler = state.bowlerPool[Math.floor(state.oversFacedBalls / 6) % state.bowlerPool.length];
    const overNum = Math.floor(state.oversFacedBalls / 6);
    const ballInOver = (state.oversFacedBalls % 6) + 1;

    const event = simulateBall(striker, currentBowler, {
      over: overNum,
      ballInOver,
      isUserBatting: false,
    });

    if (event.outcome === '6' || event.outcome === '4') {
      soundManager.playBatCrack('medium');
    } else if (event.outcome === 'wicket') {
      soundManager.playWicketSound();
    }

    // Apply outcome to state
    let { totalRuns, wickets, oversFacedBalls, strikerIndex, nonStrikerIndex, nextBatterIndex, lineup } = state;
    const updatedLineup = [...lineup];
    const currentStriker = { ...updatedLineup[strikerIndex] };

    const isExtra = event.outcome === 'wide' || event.outcome === 'no-ball';

    if (isExtra) {
      totalRuns += 1;
    } else {
      oversFacedBalls += 1;
      currentStriker.balls += 1;

      if (event.outcome === 'wicket') {
        wickets += 1;
        currentStriker.dismissal = {
          type: event.dismissalType || 'caught',
          bowler: event.bowlerName,
        };
        updatedLineup[strikerIndex] = currentStriker;

        if (nextBatterIndex < 11) {
          strikerIndex = nextBatterIndex;
          nextBatterIndex += 1;
        }
      } else {
        totalRuns += event.runs;
        currentStriker.runs += event.runs;
        if (event.runs === 4) currentStriker.fours += 1;
        if (event.runs === 6) currentStriker.sixes += 1;
        updatedLineup[strikerIndex] = currentStriker;

        if (event.runs % 2 !== 0) {
          const temp = strikerIndex;
          strikerIndex = nonStrikerIndex;
          nonStrikerIndex = temp;
        }
      }

      if (oversFacedBalls % 6 === 0) {
        const temp = strikerIndex;
        strikerIndex = nonStrikerIndex;
        nonStrikerIndex = temp;
      }
    }

    const updatedLogs = [event, ...state.recentBallLogs].slice(0, 15);

    set({
      totalRuns,
      wickets,
      oversFacedBalls,
      strikerIndex,
      nonStrikerIndex,
      nextBatterIndex,
      lineup: updatedLineup,
      recentBallLogs: updatedLogs,
      lastBallEvent: event,
    });

    get().prepareNextBall();
  },

  simulateUntilUserTurn: () => {
    let safetyLimit = 120;
    while (safetyLimit-- > 0) {
      const state = get();
      if (state.phase === 'match_finished' || state.phase === 'innings_break') break;

      const striker = state.lineup[state.strikerIndex];
      if (striker && striker.isUser) {
        soundManager.playUiChime('success');
        set({ isWalkoutAlertActive: true });
        break;
      }

      get().stepSimScoreboardBall();
    }
  },

  finishBallAndAdvance: () => {
    const state = get();
    const event = state.lastBallEvent;
    if (!event) {
      get().prepareNextBall();
      return;
    }

    let { totalRuns, wickets, oversFacedBalls, strikerIndex, nonStrikerIndex, nextBatterIndex, lineup } = state;
    const updatedLineup = [...lineup];
    const striker = { ...updatedLineup[strikerIndex] };

    const isExtra = event.outcome === 'wide' || event.outcome === 'no-ball';
    let userGotOut = false;

    if (isExtra) {
      totalRuns += 1;
    } else {
      oversFacedBalls += 1;
      striker.balls += 1;

      if (event.outcome === 'wicket') {
        wickets += 1;
        if (striker.isUser) {
          userGotOut = true;
        }
        striker.dismissal = {
          type: event.dismissalType || 'caught',
          bowler: event.bowlerName,
        };
        updatedLineup[strikerIndex] = striker;

        if (nextBatterIndex < 11) {
          strikerIndex = nextBatterIndex;
          nextBatterIndex += 1;
        }
      } else {
        totalRuns += event.runs;
        striker.runs += event.runs;
        if (event.runs === 4) striker.fours += 1;
        if (event.runs === 6) striker.sixes += 1;
        updatedLineup[strikerIndex] = striker;

        if (event.runs % 2 !== 0) {
          const temp = strikerIndex;
          strikerIndex = nonStrikerIndex;
          nonStrikerIndex = temp;
        }
      }

      if (oversFacedBalls % 6 === 0) {
        const temp = strikerIndex;
        strikerIndex = nonStrikerIndex;
        nonStrikerIndex = temp;
      }
    }

    const updatedLogs = [event, ...state.recentBallLogs].slice(0, 15);

    // If user got out on this ball, return to Broadcast Scorecard!
    const shouldExitField = userGotOut || (!updatedLineup[strikerIndex]?.isUser && state.isOnField3D);

    set({
      totalRuns,
      wickets,
      oversFacedBalls,
      strikerIndex,
      nonStrikerIndex,
      nextBatterIndex,
      lineup: updatedLineup,
      recentBallLogs: updatedLogs,
      lastBallEvent: null,
      isOnField3D: shouldExitField ? false : state.isOnField3D,
      phase: 'ready',
    });

    get().prepareNextBall();
  },

  concludeMatch: () => {
    const state = get();
    const { innings1, homeTeam, awayTeam, tossWinnerId, tossDecision, userPlayer, userBallsFaced } = state;
    if (!innings1 || !homeTeam || !awayTeam || !tossWinnerId || !tossDecision) return;

    const inn1 = innings1;
    const inn2 = buildInningsResult(state);

    let winnerTeamId = 'tie';
    let margin = 'Match Tied';

    const inn1Team = inn1.battingTeamId === homeTeam.id ? homeTeam : awayTeam;
    const inn2Team = inn2.battingTeamId === homeTeam.id ? homeTeam : awayTeam;

    if (inn2.totalRuns > inn1.totalRuns) {
      winnerTeamId = inn2Team.id;
      const wicketsLeft = 10 - inn2.wickets;
      margin = `won by ${wicketsLeft} wicket${wicketsLeft > 1 ? 's' : ''}`;
    } else if (inn1.totalRuns > inn2.totalRuns) {
      winnerTeamId = inn1Team.id;
      const runDiff = inn1.totalRuns - inn2.totalRuns;
      margin = `won by ${runDiff} run${runDiff > 1 ? 's' : ''}`;
    }

    const matchResult: MatchResult = {
      tossWinnerId,
      tossDecision,
      innings: [innings1, inn2],
      winnerTeamId,
      margin,
    };

    let userProgression: PostMatchProgressionResult | null = null;
    if (userPlayer) {
      const userBatter = state.lineup.find((b) => b.isUser) || innings1.playerScores.find((p) => p.isUser);
      const runs = userBatter ? userBatter.runs : 0;
      const isNotOut = userBatter ? !userBatter.dismissal : true;
      userProgression = calculateSkillProgression(userPlayer, userBallsFaced, runs, isNotOut);
    }

    soundManager.playUiChime('success');

    set({
      finalMatchResult: matchResult,
      userProgressionResult: userProgression,
      phase: 'match_finished',
      isOnField3D: false,
    });
  },

  resetMatch: () => {
    set({ ...initialMatchState });
  },
}));

function buildInningsResult(state: LiveMatchState): InningsResult {
  const oversFaced = Number((Math.floor(state.oversFacedBalls / 6) + (state.oversFacedBalls % 6) / 10).toFixed(1));
  return {
    battingTeamId: state.battingTeam?.id || '',
    bowlingTeamId: state.bowlingTeam?.id || '',
    totalRuns: state.totalRuns,
    wickets: state.wickets,
    oversFaced,
    maxOvers: state.maxOvers,
    ballLog: state.recentBallLogs,
    playerScores: state.lineup.map((p) => ({
      name: p.name,
      isUser: p.isUser,
      runs: p.runs,
      balls: p.balls,
      fours: p.fours,
      sixes: p.sixes,
      dismissal: p.dismissal,
    })),
    bowlerFigures: state.bowlerPool.map((b) => ({
      name: b.name,
      overs: 2.0,
      maidens: 0,
      runs: Math.round(state.totalRuns / Math.max(1, state.bowlerPool.length)),
      wickets: Math.round(state.wickets / Math.max(1, state.bowlerPool.length)),
    })),
  };
}
