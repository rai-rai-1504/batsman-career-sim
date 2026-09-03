import { Team, InningsResult, BallEvent, MatchResult, NpcPlayer, Player, DismissalType } from '../types';
import { simulateBall, SkillLike } from './ballEngine';

export interface InningsSimulationOptions {
  battingTeam: Team;
  bowlingTeam: Team;
  maxOvers?: number;
  target?: number; // if chasing in 2nd innings
  userPlayer?: Player | null;
  userTeamId?: string | null;
}

/**
 * Fast-forward simulates an entire innings (10 overs max by default)
 */
export function simulateFullInnings(options: InningsSimulationOptions): InningsResult {
  const { battingTeam, bowlingTeam, maxOvers = 10, target, userPlayer, userTeamId } = options;

  const isUserTeamBatting = userTeamId === battingTeam.id;
  const userBattingPos = userPlayer?.battingPosition ?? 4;

  // Setup batting lineup: replace slot with user if user is in this team
  const lineup: { name: string; isUser: boolean; battingSkill: number; form: number }[] = [];
  
  for (let i = 0; i < 11; i++) {
    if (isUserTeamBatting && userPlayer && i + 1 === userBattingPos) {
      lineup.push({
        name: userPlayer.name,
        isUser: true,
        battingSkill: userPlayer.battingSkill,
        form: userPlayer.form,
      });
    } else {
      const npc = battingTeam.squad[i];
      lineup.push({
        name: npc ? npc.name : `Player ${i + 1}`,
        isUser: false,
        battingSkill: npc ? npc.battingSkill : 50,
        form: 0,
      });
    }
  }

  // Setup bowler rotation (typically bowlers 6 to 10 from squad)
  const bowlers = bowlingTeam.squad.filter((_, idx) => idx >= 5);
  const bowlerPool = bowlers.length >= 2 ? bowlers : bowlingTeam.squad.slice(-4);

  let totalRuns = 0;
  let wickets = 0;
  let ballsBowled = 0;
  let strikerIdx = 0;
  let nonStrikerIdx = 1;
  let nextBatterIdx = 2;

  const ballLog: BallEvent[] = [];

  const playerScores = lineup.map((p) => ({
    name: p.name,
    isUser: p.isUser,
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    dismissal: undefined as { type: DismissalType; bowler: string } | undefined,
  }));

  const bowlerFiguresMap = new Map<string, { overs: number; balls: number; maidens: number; runs: number; wickets: number }>();
  for (const b of bowlerPool) {
    bowlerFiguresMap.set(b.name, { overs: 0, balls: 0, maidens: 0, runs: 0, wickets: 0 });
  }

  for (let over = 0; over < maxOvers; over++) {
    if (wickets >= 10) break;
    if (target && totalRuns >= target) break;

    // Pick bowler for this over (rotate through pool)
    const currentBowler = bowlerPool[over % bowlerPool.length];
    let runsInThisOver = 0;
    let validBallsInOver = 0;

    while (validBallsInOver < 6) {
      if (wickets >= 10) break;
      if (target && totalRuns >= target) break;

      const striker = lineup[strikerIdx];
      const context = {
        over,
        ballInOver: validBallsInOver + 1,
        isUserBatting: false, // simulated
      };

      const event = simulateBall(striker, currentBowler, context);
      ballLog.push(event);

      const bStats = bowlerFiguresMap.get(currentBowler.name) || { overs: 0, balls: 0, maidens: 0, runs: 0, wickets: 0 };
      bowlerFiguresMap.set(currentBowler.name, bStats);

      if (event.outcome === 'wide' || event.outcome === 'no-ball') {
        totalRuns += 1;
        runsInThisOver += 1;
        bStats.runs += 1;
      } else {
        validBallsInOver += 1;
        ballsBowled += 1;
        bStats.balls += 1;

        const strikerScore = playerScores[strikerIdx];
        strikerScore.balls += 1;

        if (event.outcome === 'wicket') {
          wickets += 1;
          bStats.wickets += 1;
          strikerScore.dismissal = {
            type: event.dismissalType || 'caught',
            bowler: currentBowler.name,
          };
          if (nextBatterIdx < 11) {
            strikerIdx = nextBatterIdx++;
          }
        } else {
          totalRuns += event.runs;
          runsInThisOver += event.runs;
          bStats.runs += event.runs;
          strikerScore.runs += event.runs;
          if (event.runs === 4) strikerScore.fours += 1;
          if (event.runs === 6) strikerScore.sixes += 1;

          // Rotate strike on odd runs
          if (event.runs % 2 !== 0) {
            const temp = strikerIdx;
            strikerIdx = nonStrikerIdx;
            nonStrikerIdx = temp;
          }
        }
      }
    }

    if (runsInThisOver === 0 && validBallsInOver === 6) {
      const bStats = bowlerFiguresMap.get(currentBowler.name);
      if (bStats) bStats.maidens += 1;
    }

    // End of over: switch strike
    const temp = strikerIdx;
    strikerIdx = nonStrikerIdx;
    nonStrikerIdx = temp;
  }

  const oversFaced = Number((Math.floor(ballsBowled / 6) + (ballsBowled % 6) / 10).toFixed(1));

  const bowlerFigures = Array.from(bowlerFiguresMap.entries()).map(([name, s]) => ({
    name,
    overs: Number((Math.floor(s.balls / 6) + (s.balls % 6) / 10).toFixed(1)),
    maidens: s.maidens,
    runs: s.runs,
    wickets: s.wickets,
  }));

  return {
    battingTeamId: battingTeam.id,
    bowlingTeamId: bowlingTeam.id,
    totalRuns,
    wickets,
    oversFaced,
    maxOvers,
    ballLog,
    playerScores,
    bowlerFigures,
  };
}

/**
 * Simulates an entire match between two NPC teams
 */
export function simulateNpcMatch(team1: Team, team2: Team, maxOvers: number = 10): MatchResult {
  // Coin toss
  const tossWinner = Math.random() < 0.5 ? team1 : team2;
  const tossLoser = tossWinner.id === team1.id ? team2 : team1;
  // 60% chance toss winner bats first
  const tossDecision: 'bat' | 'bowl' = Math.random() < 0.6 ? 'bat' : 'bowl';

  const firstBattingTeam = tossDecision === 'bat' ? tossWinner : tossLoser;
  const secondBattingTeam = tossDecision === 'bat' ? tossLoser : tossWinner;

  // Innings 1
  const inn1 = simulateFullInnings({
    battingTeam: firstBattingTeam,
    bowlingTeam: secondBattingTeam,
    maxOvers,
  });

  // Innings 2 (chase target = inn1.totalRuns + 1)
  const inn2 = simulateFullInnings({
    battingTeam: secondBattingTeam,
    bowlingTeam: firstBattingTeam,
    maxOvers,
    target: inn1.totalRuns + 1,
  });

  let winnerTeamId = 'tie';
  let margin = 'Match Tied';

  if (inn2.totalRuns > inn1.totalRuns) {
    winnerTeamId = secondBattingTeam.id;
    const wicketsLeft = 10 - inn2.wickets;
    margin = `won by ${wicketsLeft} wicket${wicketsLeft > 1 ? 's' : ''}`;
  } else if (inn1.totalRuns > inn2.totalRuns) {
    winnerTeamId = firstBattingTeam.id;
    const runDiff = inn1.totalRuns - inn2.totalRuns;
    margin = `won by ${runDiff} run${runDiff > 1 ? 's' : ''}`;
  }

  return {
    tossWinnerId: tossWinner.id,
    tossDecision,
    innings: [inn1, inn2],
    winnerTeamId,
    margin,
  };
}
