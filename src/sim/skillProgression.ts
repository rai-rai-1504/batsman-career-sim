import { Player, BallEvent } from '../types';

export interface PostMatchProgressionResult {
  updatedPlayer: Player;
  runsBonus: number;
  milestoneBonus: number;
  timingBonus: number;
  totalSkillGain: number;
  formChange: number;
  milestoneAchieved?: 'fifty' | 'hundred';
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function calculateSkillProgression(
  player: Player,
  userBalls: BallEvent[],
  runsScored: number,
  isNotOut: boolean
): PostMatchProgressionResult {
  // 1. Calculations
  const runsBonus = Math.floor(runsScored / 10);
  
  let milestoneBonus = 0;
  let milestoneAchieved: 'fifty' | 'hundred' | undefined;

  if (runsScored >= 100) {
    milestoneBonus = 12;
    milestoneAchieved = 'hundred';
  } else if (runsScored >= 50) {
    milestoneBonus = 5;
    milestoneAchieved = 'fifty';
  }

  // Count perfect timing shots
  const perfectCount = userBalls.filter((b) => b.timingQuality === 'perfect').length;
  const timingBonus = Math.round(perfectCount * 0.3);

  // Raw gain
  const rawSkillGain = clamp(runsBonus + milestoneBonus + timingBonus, 0, 8);

  // Diminishing returns curve as skill approaches 99
  const diminishingFactor = Math.max(0.2, 1 - player.battingSkill / 120);
  const totalSkillGain = Math.max(0, Math.round(rawSkillGain * diminishingFactor));

  // Form adjustment: +2 if >30 runs, -2 if <10 runs, 0 otherwise
  let formChange = 0;
  if (runsScored >= 30) formChange = +2;
  else if (runsScored < 10 && userBalls.length >= 3) formChange = -2;

  // New stats
  const stats = { ...player.careerStats };
  stats.matches += 1;
  if (userBalls.length > 0) {
    stats.innings += 1;
  }
  stats.runs += runsScored;
  stats.balls += userBalls.filter((b) => b.outcome !== 'wide').length;
  stats.fours += userBalls.filter((b) => b.outcome === '4').length;
  stats.sixes += userBalls.filter((b) => b.outcome === '6').length;
  if (runsScored >= 100) stats.hundreds += 1;
  else if (runsScored >= 50) stats.fifties += 1;
  if (runsScored > stats.highScore) stats.highScore = runsScored;
  if (isNotOut && userBalls.length > 0) stats.notOuts += 1;

  // Check last ball for dismissal
  const dismissalBall = userBalls.find((b) => b.outcome === 'wicket');
  if (dismissalBall && dismissalBall.dismissalType) {
    stats.dismissals[dismissalBall.dismissalType] = (stats.dismissals[dismissalBall.dismissalType] || 0) + 1;
  }

  const updatedPlayer: Player = {
    ...player,
    battingSkill: clamp(player.battingSkill + totalSkillGain, 0, 99),
    form: clamp(player.form + formChange, -10, 10),
    careerStats: stats,
  };

  return {
    updatedPlayer,
    runsBonus,
    milestoneBonus,
    timingBonus,
    totalSkillGain,
    formChange,
    milestoneAchieved,
  };
}
