import {
  BallEvent,
  BallLength,
  BallLine,
  BallOutcome,
  BowlerCategory,
  BowlingType,
  DeliveryCombination,
  DismissalType,
  NpcPlayer,
  Player,
  ShotDirection,
  ShotStrokeType,
  TimingQuality,
  TimingWindowPartition
} from '../types';
import { getCommentary } from './commentaryBank';

export interface BallContext {
  over: number;
  ballInOver: number;
  isUserBatting: boolean;
  userInput?: {
    direction: ShotDirection;
    timingOffsetMs: number; // offset from ideal contact point (in ms)
    windowWidthMs: number;
    timingQuality?: TimingQuality;
    progressRatio?: number;
    strokeType?: ShotStrokeType;
  };
  isPractice?: boolean;
  deliveryLine?: BallLine;
  deliveryLength?: BallLength;
  deliveryCombination?: DeliveryCombination;
  bowlerCategory?: BowlerCategory;
  speedKmph?: number;
}

export type SkillLike = {
  name: string;
  battingSkill: number;
  form?: number;
  isUser?: boolean;
};

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export const ALL_DELIVERY_COMBINATIONS: DeliveryCombination[] = [
  'short_leg',
  'short_mid',
  'short_off',
  'length_leg',
  'length_mid',
  'length_off',
  'yorker_leg',
  'yorker_mid',
  'yorker_off',
];

// ─────────────────────────────────────────────────────────────────────────────
// 5-ZONE TIMING WINDOW PARTITIONS FOR EACH OF THE 9 COMBINATIONS
// Window begins at bowler ball release (t=0) and ends as ball passes batsman (t=1.0)
// Divided into 5 distinct zones:
// [0..veryEarlyEnd)   -> very_early
// [veryEarlyEnd..earlyEnd) -> early
// [earlyEnd..idealEnd)     -> ideal
// [idealEnd..lateEnd)      -> late
// [lateEnd..1.0]           -> very_late
// ─────────────────────────────────────────────────────────────────────────────
export const TIMING_PARTITIONS: Record<DeliveryCombination, TimingWindowPartition> = {
  // ─── 1. GOOD LENGTH BALLS (Pitches at 0.80, arrives at bat at 0.76-0.90) ─────
  length_off: {
    veryEarlyEnd: 0.55,
    earlyEnd: 0.76,
    idealEnd: 0.90,
    lateEnd: 0.97,
  },
  length_mid: {
    veryEarlyEnd: 0.55,
    earlyEnd: 0.76,
    idealEnd: 0.90,
    lateEnd: 0.97,
  },
  length_leg: {
    veryEarlyEnd: 0.55,
    earlyEnd: 0.76,
    idealEnd: 0.90,
    lateEnd: 0.97,
  },

  // ─── 2. SHORT BALLS (Pitches halfway at 0.54, reaches batsman at 0.74-0.88) ──
  short_off: {
    veryEarlyEnd: 0.50,
    earlyEnd: 0.74,
    idealEnd: 0.88,
    lateEnd: 0.96,
  },
  short_mid: {
    veryEarlyEnd: 0.50,
    earlyEnd: 0.74,
    idealEnd: 0.88,
    lateEnd: 0.96,
  },
  short_leg: {
    veryEarlyEnd: 0.50,
    earlyEnd: 0.74,
    idealEnd: 0.88,
    lateEnd: 0.96,
  },

  // ─── 3. YORKER BALLS (Dips into blockhole; contact at 0.78-0.92) ─────────────
  yorker_leg: {
    veryEarlyEnd: 0.55,
    earlyEnd: 0.78,
    idealEnd: 0.92,
    lateEnd: 0.98,
  },
  yorker_mid: {
    veryEarlyEnd: 0.55,
    earlyEnd: 0.78,
    idealEnd: 0.92,
    lateEnd: 0.98,
  },
  yorker_off: {
    veryEarlyEnd: 0.55,
    earlyEnd: 0.78,
    idealEnd: 0.92,
    lateEnd: 0.98,
  },
};

/**
 * Dedicated early timing partitions for pre-meditated sweep and reverse sweep.
 * Batsman commits early while ball is pitching (0.48 - 0.72) to execute kneeling posture.
 */
export const SWEEP_TIMING_PARTITIONS: TimingWindowPartition = {
  veryEarlyEnd: 0.30,
  earlyEnd: 0.48,
  idealEnd: 0.72,
  lateEnd: 0.84,
};

/**
 * Grade timing from normalized flight progress (0.0 to 1.0)
 */
export function gradeDeliveryTiming(
  progressRatio: number,
  combination: DeliveryCombination = 'length_mid',
  strokeType?: ShotStrokeType
): TimingQuality {
  const p = (strokeType === 'sweep' || strokeType === 'reverse_sweep')
    ? SWEEP_TIMING_PARTITIONS
    : (TIMING_PARTITIONS[combination] || TIMING_PARTITIONS.length_mid);
  const u = clamp(progressRatio, 0, 1);
  if (u < p.veryEarlyEnd) return 'very_early';
  if (u < p.earlyEnd) return 'early';
  if (u < p.idealEnd) return 'ideal';
  if (u < p.lateEnd) return 'late';
  return 'very_late';
}

/**
 * Exact probability table specified for user batting outcomes based on timing tier and line
 */
export function resolveUserTimingOutcome(
  timing: TimingQuality,
  line: BallLine
): { outcome: BallOutcome; runs: number } {
  const normLine: 'leg' | 'mid' | 'off' =
    line === 'leg' ? 'leg' : line === 'off' ? 'off' : 'mid';

  let normTiming: 'very_early' | 'early' | 'ideal' | 'late' | 'very_late';
  if (timing === 'ideal' || timing === 'perfect') normTiming = 'ideal';
  else if (timing === 'very_early') normTiming = 'very_early';
  else if (timing === 'early') normTiming = 'early';
  else if (timing === 'late') normTiming = 'late';
  else if (timing === 'very_late') normTiming = 'very_late';
  else if (timing === 'good') normTiming = 'ideal';
  else normTiming = 'very_late';

  const table: Record<
    'very_early' | 'early' | 'ideal' | 'late' | 'very_late',
    Record<'leg' | 'mid' | 'off', [BallOutcome, number][]>
  > = {
    very_early: {
      // ball on leg -> wicket: 70%, dot: 20%, 1: 10%
      leg: [['wicket', 70], ['dot', 20], ['1', 10]],
      // ball on 4th stump -> wicket: 50%, dot: 40%, 1: 10%
      mid: [['wicket', 50], ['dot', 40], ['1', 10]],
      // ball on offside -> wicket: 10%, dot: 87%, 1: 3%
      off: [['wicket', 10], ['dot', 87], ['1', 3]],
    },
    early: {
      // ball on leg -> wicket: 20%, dot: 20%, 1: 35%, 2: 20%, 4: 5%
      leg: [['1', 35], ['wicket', 20], ['dot', 20], ['2', 20], ['4', 5]],
      // ball on 4th stump -> wicket: 30%, dot: 25%, 1: 30%, 2: 5%, 4: 10%
      mid: [['wicket', 30], ['1', 30], ['dot', 25], ['4', 10], ['2', 5]],
      // ball on offside -> wicket: 35%, dot: 30%, 1: 20%, 2: 5%, 4: 10%
      off: [['wicket', 35], ['dot', 30], ['1', 20], ['4', 10], ['2', 5]],
    },
    ideal: {
      // ball on leg -> wicket: 0%, dot: 0%, 1: 5%, 2: 5%, 4: 60%, 6: 30%
      leg: [['4', 60], ['6', 30], ['1', 5], ['2', 5]],
      // ball on 4th stump -> wicket: 0%, dot: 0%, 1: 5%, 2: 5%, 4: 65%, 6: 25%
      mid: [['4', 65], ['6', 25], ['1', 5], ['2', 5]],
      // ball on offside -> wicket: 0%, dot: 0%, 1: 5%, 2: 5%, 4: 65%, 6: 25%
      off: [['4', 65], ['6', 25], ['1', 5], ['2', 5]],
    },
    late: {
      // ball on leg -> wicket: 30%, dot: 15%, 1: 30%, 2: 20%, 4: 5%
      leg: [['wicket', 30], ['1', 30], ['2', 20], ['dot', 15], ['4', 5]],
      // ball on 4th stump -> wicket: 40%, dot: 20%, 1: 25%, 2: 5%, 4: 10%
      mid: [['wicket', 40], ['1', 25], ['dot', 20], ['4', 10], ['2', 5]],
      // ball on offside -> wicket: 45%, dot: 25%, 1: 15%, 2: 5%, 4: 10%
      off: [['wicket', 45], ['dot', 25], ['1', 15], ['4', 10], ['2', 5]],
    },
    very_late: {
      // ball on leg -> wicket: 70%, dot: 20%, 1: 10%
      leg: [['wicket', 70], ['dot', 20], ['1', 10]],
      // ball on 4th stump -> wicket: 50%, dot: 40%, 1: 10%
      mid: [['wicket', 50], ['dot', 40], ['1', 10]],
      // ball on offside -> wicket: 50%, dot: 35%, 1: 15%
      off: [['wicket', 50], ['dot', 35], ['1', 15]],
    },
  };

  const pool = table[normTiming][normLine];
  const totalWeight = pool.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * totalWeight;

  for (const [outcome, weight] of pool) {
    roll -= weight;
    if (roll <= 0) {
      const runs = outcome === '6' ? 6 : outcome === '4' ? 4 : outcome === '2' ? 2 : outcome === '1' ? 1 : 0;
      return { outcome, runs };
    }
  }

  const [fallbackOutcome] = pool[0];
  const runs = fallbackOutcome === '6' ? 6 : fallbackOutcome === '4' ? 4 : fallbackOutcome === '2' ? 2 : fallbackOutcome === '1' ? 1 : 0;
  return { outcome: fallbackOutcome, runs };
}

/**
 * Resolves defense stroke:
 * - Wicket probability is significantly decreased across all timing tiers.
 * - All remaining probability results in 0 runs ('dot').
 * - It never results in runs.
 */
export function resolveDefenseOutcome(
  timing: TimingQuality
): { outcome: BallOutcome; runs: number } {
  let normTiming: 'very_early' | 'early' | 'ideal' | 'late' | 'very_late';
  if (timing === 'ideal' || timing === 'perfect') normTiming = 'ideal';
  else if (timing === 'very_early') normTiming = 'very_early';
  else if (timing === 'early') normTiming = 'early';
  else if (timing === 'late') normTiming = 'late';
  else if (timing === 'very_late') normTiming = 'very_late';
  else if (timing === 'good') normTiming = 'ideal';
  else normTiming = 'very_late';

  // Significantly reduced wicket chances:
  // ideal: 0% wicket, 100% dot
  // early: 5% wicket, 95% dot
  // late: 8% wicket, 92% dot
  // very_early: 25% wicket, 75% dot
  // very_late: 30% wicket, 70% dot
  const wicketChance: Record<'very_early' | 'early' | 'ideal' | 'late' | 'very_late', number> = {
    ideal: 0.0,
    early: 0.05,
    late: 0.08,
    very_early: 0.25,
    very_late: 0.30,
  };

  const roll = Math.random();
  if (roll < wicketChance[normTiming]) {
    return { outcome: 'wicket', runs: 0 };
  }
  return { outcome: 'dot', runs: 0 };
}

/**
 * Determines which batsman animation should be played based on user rules:
 * 1. Pull shot: short ball (leg, straight/mid, off) hit to leg side -> ALWAYS pull shot regardless of outcome.
 * 2. Flick shot: ball is in leg (yorker, length) and player hits for 1 or 2 runs -> flick shot.
 * 3. Defense: down key defense -> defense.
 * 4. Sweep shot: m + left key -> sweep shot.
 * 5. Reverse sweep: m + right key -> reverse sweep.
 * 6. Straight hit (loft): straight hit for 6 runs -> 50% loft, 50% baseball strike.
 * 7. Straight hit (chip): straight hit for 1-2 runs -> 50% chip, 50% baseball strike.
 * 8. Straight hit for 4: 33.3% loft, 33.3% chip, 33.4% baseball strike.
 * 9. Default fallback: baseball strike.
 */
export function selectBatterShotAnimation(params: {
  strokeType?: ShotStrokeType;
  deliveryLength: BallLength;
  deliveryLine: BallLine;
  shotDirection: ShotDirection;
  outcome: BallOutcome;
  runs: number;
}): string {
  const { strokeType, deliveryLength, deliveryLine, shotDirection, outcome, runs } = params;

  // 1. Pull Shot: Short ball (leg, straight/mid, off) hit to leg side -> plays regardless of outcome
  if (deliveryLength === 'short' && shotDirection === 'leg') {
    return 'pull_shot';
  }

  // 2. Defense
  if (strokeType === 'defense') {
    return 'defense';
  }

  // 3. Sweep
  if (strokeType === 'sweep') {
    return 'sweep_shot';
  }

  // 4. Reverse Sweep
  if (strokeType === 'reverse_sweep') {
    return 'reverse_sweep';
  }

  // 5. Flick Shot: ball is in the leg (yorker, length) and player hits for 1 or 2 runs
  const isLegLine = deliveryLine === 'leg';
  const isYorkerOrLength = deliveryLength === 'yorker' || deliveryLength === 'length';
  if (isLegLine && isYorkerOrLength && (runs === 1 || runs === 2) && outcome !== 'wicket') {
    return 'flick_shot';
  }

  // 6. Straight hits:
  if (shotDirection === 'straight' && outcome !== 'wicket') {
    // 6 runs: 50-50 loft or baseball strike
    if (outcome === '6' || runs === 6) {
      return Math.random() < 0.5 ? 'straight_hit_loft' : 'baseball_strike';
    }
    // 1-2 runs: 50-50 chip or baseball strike
    if (runs === 1 || runs === 2) {
      return Math.random() < 0.5 ? 'straight_hit_chip' : 'baseball_strike';
    }
    // 4 runs: 33-33-33 loft, chip, baseball strike
    if (outcome === '4' || runs === 4) {
      const r = Math.random();
      if (r < 0.333) return 'straight_hit_loft';
      if (r < 0.666) return 'straight_hit_chip';
      return 'baseball_strike';
    }
  }

  // Fallback
  return 'baseball_strike';
}

/**
 * Generate a ball delivery with equal 1/9 (11.11%) probability across all 9 combinations:
 * - short leg
 * - short mid
 * - short off
 * - length leg
 * - length mid
 * - length off
 * - yorker leg
 * - yorker mid
 * - yorker off
 */
/**
 * Generates an exact ball speed in km/h based on the bowler's category, baseline, and skill
 * Categories specified by user:
 * - slow: 90 - 100 km/h
 * - medium: 100 - 120 km/h
 * - fast: 120 - 140 km/h
 * - bolt: 140 - 150 km/h
 */
export function calculateDeliverySpeedKmph(
  category: BowlerCategory = 'medium',
  bowlerSkill: number = 50,
  basePace?: number
): number {
  let minSpeed = 100.0;
  let maxSpeed = 120.0;

  switch (category) {
    case 'slow':
      minSpeed = 90.0;
      maxSpeed = 100.0;
      break;
    case 'medium':
      minSpeed = 100.0;
      maxSpeed = 120.0;
      break;
    case 'fast':
      minSpeed = 120.0;
      maxSpeed = 140.0;
      break;
    case 'bolt':
      minSpeed = 140.0;
      maxSpeed = 150.0;
      break;
  }

  const base = basePace && basePace >= minSpeed && basePace <= maxSpeed
    ? basePace
    : minSpeed + ((maxSpeed - minSpeed) * (0.25 + (bowlerSkill / 100) * 0.55));

  // Small organic per-ball variation: ±1.8 km/h
  const variance = (Math.random() * 3.6) - 1.8;
  const finalSpeed = Math.max(minSpeed, Math.min(maxSpeed, base + variance));

  return parseFloat(finalSpeed.toFixed(1));
}

/**
 * Maps speed in km/h (90 to 150) to delivery flight duration in milliseconds
 * Calibration: Every ball is faster, and 145+ feels truly express & unplayable!
 * - 90-95 km/h: 1040ms -> 990ms (steady, readable flight)
 * - 95-100 km/h: 990ms -> 930ms
 * - 100-110 km/h: 930ms -> 820ms
 * - 110-120 km/h: 820ms -> 710ms
 * - 120-135 km/h: 710ms -> 530ms (crisp fast pace)
 * - 135-140 km/h: 530ms -> 460ms (very brisk)
 * - 140-145 km/h: 460ms -> 395ms (sharp reflex test)
 * - 145-150 km/h: 395ms -> 340ms (screaming thunderbolt, truly unplayable!)
 */
export function speedKmphToDurationMs(kmph: number): number {
  const speed = Math.max(90, Math.min(150, kmph));

  if (speed <= 110) {
    // 90 km/h = 1040ms, 110 km/h = 820ms (11ms per km/h)
    return Math.round(1040 - (speed - 90) * 11);
  } else if (speed <= 135) {
    // 110 km/h = 820ms, 135 km/h = 530ms (11.6ms per km/h)
    return Math.round(820 - (speed - 110) * 11.6);
  } else if (speed <= 140) {
    // 135 km/h = 530ms, 140 km/h = 460ms (70ms drop over 5 km/h -> 14ms/km/h)
    return Math.round(530 - (speed - 135) * 14);
  } else if (speed <= 145) {
    // 140 km/h = 460ms, 145 km/h = 395ms (65ms drop over 5 km/h -> 13ms/km/h)
    return Math.round(460 - (speed - 140) * 13);
  } else {
    // 145 km/h = 395ms, 150 km/h = 340ms (55ms drop over 5 km/h -> 11ms/km/h)
    return Math.round(395 - (speed - 145) * 11);
  }
}

export function getBowlerCategoryBadge(category: BowlerCategory = 'medium'): {
  label: string;
  shortLabel: string;
  range: string;
  color: string;
  badgeClass: string;
} {
  switch (category) {
    case 'slow':
      return {
        label: 'Slow',
        shortLabel: 'SLOW',
        range: '90-100 KMPH',
        color: '#38BDF8',
        badgeClass: 'bg-sky-500/20 text-sky-400 border border-sky-500/40',
      };
    case 'medium':
      return {
        label: 'Medium',
        shortLabel: 'MED',
        range: '100-120 KMPH',
        color: '#F59E0B',
        badgeClass: 'bg-amber-500/20 text-amber-400 border border-amber-500/40',
      };
    case 'fast':
      return {
        label: 'Fast',
        shortLabel: 'FAST',
        range: '120-140 KMPH',
        color: '#F97316',
        badgeClass: 'bg-orange-500/20 text-orange-400 border border-orange-500/40',
      };
    case 'bolt':
      return {
        label: '⚡ Bolt',
        shortLabel: '⚡ BOLT',
        range: '140-150 KMPH',
        color: '#EF4444',
        badgeClass: 'bg-red-500/25 text-red-400 border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.35)]',
      };
  }
}

/**
 * Generate a ball delivery with equal 1/9 (11.11%) probability across all 9 combinations:
 * - short leg, short mid, short off
 * - length leg, length mid, length off
 * - yorker leg, yorker mid, yorker off
 * Pacing is calculated from bowler category and skill!
 */
export function generateBallDelivery(
  bowlerType?: BowlingType,
  bowlerCategory?: BowlerCategory,
  bowlerSkill: number = 50,
  basePaceKmph?: number
): {
  combination: DeliveryCombination;
  length: BallLength;
  line: BallLine;
  releaseSpeed: number; // ms to travel to pitch & contact
  speedKmph: number;    // exact ball speed in km/h
  bowlerCategory: BowlerCategory;
} {
  // Exactly equal probability (1/9) for each of the 9 combinations
  const combination = ALL_DELIVERY_COMBINATIONS[Math.floor(Math.random() * ALL_DELIVERY_COMBINATIONS.length)];
  const [length, line] = combination.split('_') as [BallLength, BallLine];

  // Derive bowler category if not explicitly provided
  let cat: BowlerCategory = bowlerCategory || 'medium';
  if (!bowlerCategory && bowlerType) {
    if (bowlerType.startsWith('spin')) cat = 'slow';
    else if (bowlerType === 'pace-fast') cat = bowlerSkill >= 80 ? 'bolt' : 'fast';
    else cat = 'medium';
  }

  const speedKmph = calculateDeliverySpeedKmph(cat, bowlerSkill, basePaceKmph);
  const releaseSpeed = speedKmphToDurationMs(speedKmph);

  return { combination, length, line, releaseSpeed, speedKmph, bowlerCategory: cat };
}

/**
 * Timing window calculation based on bowler skill
 */
export function calculateTimingWindow(bowlerSkill: number): number {
  const baseWindowMs = 260;
  const windowWidthMs = baseWindowMs - bowlerSkill * 1.4;
  return clamp(windowWidthMs, 60, 260);
}

/**
 * Grade user timing
 */
export function gradeTiming(absOffsetMs: number, windowWidthMs: number, signedOffsetMs: number): TimingQuality {
  if (absOffsetMs >= 9000) {
    return 'miss';
  }
  const ratio = absOffsetMs / Math.max(1, windowWidthMs);
  if (ratio < 0.25) return 'ideal';
  if (signedOffsetMs < 0) {
    return ratio < 0.65 ? 'early' : 'very_early';
  } else {
    return ratio < 0.65 ? 'late' : 'very_late';
  }
}

/**
 * Evaluate direction match
 */
export function getDirectionMatch(shotDir: ShotDirection, ballLine: BallLine): 'exact' | 'adjacent' | 'wrong' {
  const normalizedLine: 'leg' | 'straight' | 'off' = ballLine === 'mid' ? 'straight' : ballLine;
  if (shotDir === normalizedLine) return 'exact';
  if (
    (shotDir === 'straight' && (normalizedLine === 'leg' || normalizedLine === 'off')) ||
    (normalizedLine === 'straight' && (shotDir === 'leg' || shotDir === 'off'))
  ) {
    return 'adjacent';
  }
  return 'wrong'; // leg vs off or off vs leg
}

/**
 * Main simulation function for resolving a single delivery
 */
export function simulateBall(
  batter: SkillLike,
  bowler: NpcPlayer,
  context: BallContext
): BallEvent {
  const { over, ballInOver, isUserBatting, userInput } = context;

  // 1. Roll or use delivery line and length
  const delivery = context.deliveryCombination
    ? {
        combination: context.deliveryCombination,
        line: context.deliveryLine || (context.deliveryCombination.split('_')[1] as BallLine),
        length: context.deliveryLength || (context.deliveryCombination.split('_')[0] as BallLength),
        releaseSpeed: 1000,
      }
    : generateBallDelivery(bowler.bowlingType);

  const line = delivery.line;
  const length = delivery.length;
  const combination = delivery.combination;

  // 2. Extras (~2.5% chance)
  const extrasRoll = Math.random();
  if (extrasRoll < 0.015) {
    return {
      over,
      ballInOver,
      batterName: batter.name,
      bowlerName: bowler.name,
      bowlerType: bowler.bowlingType,
      line,
      length,
      combination,
      outcome: 'wide',
      runs: 1,
      isUserBall: isUserBatting,
      commentary: getCommentary({
        outcome: 'wide',
        runs: 1,
        line,
        batterName: batter.name,
        bowlerName: bowler.name,
      }),
    };
  }
  if (extrasRoll < 0.025) {
    return {
      over,
      ballInOver,
      batterName: batter.name,
      bowlerName: bowler.name,
      bowlerType: bowler.bowlingType,
      line,
      length,
      combination,
      outcome: 'no-ball',
      runs: 1,
      isUserBall: isUserBatting,
      commentary: getCommentary({
        outcome: 'no-ball',
        runs: 1,
        line,
        batterName: batter.name,
        bowlerName: bowler.name,
      }),
    };
  }

  // 3. User Batting Resolution (Strictly following the 5-tier timing probability table)
  if (isUserBatting) {
    let timingQuality: TimingQuality = 'very_late';
    let shotDirection: ShotDirection = 'straight';

    if (userInput) {
      shotDirection = userInput.direction;
      if (userInput.timingQuality) {
        timingQuality = userInput.timingQuality;
      } else if (userInput.progressRatio !== undefined) {
        timingQuality = gradeDeliveryTiming(userInput.progressRatio, combination, userInput.strokeType);
      } else {
        const absOffset = Math.abs(userInput.timingOffsetMs);
        timingQuality = gradeTiming(absOffset, userInput.windowWidthMs, userInput.timingOffsetMs);
      }
    }

    const strokeType = userInput?.strokeType || 'standard';
    let rawOutcome: BallOutcome;
    let runs: number;

    if (strokeType === 'defense') {
      // Forward Defense: significantly decreased wicket probability, always 0 runs
      const defRes = resolveDefenseOutcome(timingQuality);
      rawOutcome = defRes.outcome;
      runs = defRes.runs;
    } else if ((strokeType === 'sweep' || strokeType === 'reverse_sweep') && length === 'short') {
      // Sweep and reverse sweep against short ball ALWAYS result in a dot ball
      rawOutcome = 'dot';
      runs = 0;
    } else {
      // Exact probability resolution based on timing quality and bowling line
      const res = resolveUserTimingOutcome(timingQuality, line);
      rawOutcome = res.outcome;
      runs = res.runs;
    }

    let dismissalType: DismissalType | undefined;
    if (rawOutcome === 'wicket') {
      const normLine = line === 'leg' ? 'leg' : line === 'off' ? 'off' : 'mid';
      if (normLine === 'off') {
        dismissalType = Math.random() < 0.75 ? 'caught' : 'bowled';
      } else if (normLine === 'leg') {
        const r = Math.random();
        dismissalType = r < 0.60 ? 'bowled' : r < 0.85 ? 'lbw' : 'caught';
      } else {
        const r = Math.random();
        dismissalType = r < 0.50 ? 'bowled' : r < 0.85 ? 'caught' : 'lbw';
      }
    }

    const outcome: BallOutcome = rawOutcome;
    const shotAnimName = selectBatterShotAnimation({
      strokeType,
      deliveryLength: length,
      deliveryLine: line,
      shotDirection,
      outcome,
      runs,
    });

    const bowlerCat: BowlerCategory =
      bowler.bowlerCategory ||
      (context.bowlerCategory
        ? context.bowlerCategory
        : bowler.bowlingType.startsWith('spin')
        ? 'slow'
        : bowler.bowlingType === 'pace-fast' && bowler.bowlingSkill >= 80
        ? 'bolt'
        : bowler.bowlingType === 'pace-fast'
        ? 'fast'
        : 'medium');
    const ballSpeed = context.speedKmph || calculateDeliverySpeedKmph(bowlerCat, bowler.bowlingSkill, bowler.basePaceKmph);

    return {
      over,
      ballInOver,
      batterName: batter.name,
      bowlerName: bowler.name,
      bowlerType: bowler.bowlingType,
      bowlerCategory: bowlerCat,
      speedKmph: ballSpeed,
      line,
      length,
      combination,
      outcome,
      runs,
      dismissalType,
      isUserBall: true,
      timingQuality,
      shotDirection,
      strokeType,
      shotAnimName,
      commentary: getCommentary({
        outcome,
        runs,
        line,
        batterName: batter.name,
        bowlerName: bowler.name,
        timing: timingQuality,
        shotDir: shotDirection,
        dismissalType,
      }),
    };
  }

  // 4. Realistic 10-Over (T10) NPC vs NPC Ball Resolution
  // 60 balls total per innings. Target team totals: 80 to 200 runs (Average ~ 115 - 150)
  const skillDelta = batter.battingSkill - bowler.bowlingSkill; // -99..+99
  const formBonus = (batter.form || 0) * 0.4;
  
  // Power bonus in death overs (overs 7-9)
  const deathOverBonus = over >= 7 ? 6 : over < 3 ? 3 : 0;
  const contestScore = Math.random() * 100 + skillDelta * 0.35 + formBonus + deathOverBonus;

  let outcome: BallOutcome = 'dot';
  let runs = 0;
  let dismissalType: DismissalType | undefined;

  // Calibrated distribution for 80-200 run matches:
  // ~10-15% Sixes, ~16-22% Fours, ~10-15% Twos, ~28-35% Singles, ~20-25% Dots, ~5-7% Wickets
  if (contestScore > 86) {
    outcome = '6';
    runs = 6;
  } else if (contestScore > 68) {
    outcome = '4';
    runs = 4;
  } else if (contestScore > 56) {
    outcome = '2';
    runs = 2;
  } else if (contestScore > 26) {
    outcome = '1';
    runs = 1;
  } else if (contestScore > 7) {
    outcome = 'dot';
    runs = 0;
  } else {
    // Wicket
    outcome = 'wicket';
    runs = 0;
    const dRand = Math.random();
    if (dRand < 0.60) dismissalType = 'caught';
    else if (dRand < 0.82) dismissalType = 'bowled';
    else if (dRand < 0.94) dismissalType = 'lbw';
    else dismissalType = 'stumped';
  }

  const npcBowlerCat: BowlerCategory =
    bowler.bowlerCategory ||
    (bowler.bowlingType.startsWith('spin')
      ? 'slow'
      : bowler.bowlingType === 'pace-fast' && bowler.bowlingSkill >= 80
      ? 'bolt'
      : bowler.bowlingType === 'pace-fast'
      ? 'fast'
      : 'medium');
  const npcBallSpeed = calculateDeliverySpeedKmph(npcBowlerCat, bowler.bowlingSkill, bowler.basePaceKmph);

  return {
    over,
    ballInOver,
    batterName: batter.name,
    bowlerName: bowler.name,
    bowlerType: bowler.bowlingType,
    bowlerCategory: npcBowlerCat,
    speedKmph: npcBallSpeed,
    line,
    length,
    combination,
    outcome,
    runs,
    dismissalType,
    isUserBall: false,
    commentary: getCommentary({
      outcome,
      runs,
      line,
      batterName: batter.name,
      bowlerName: bowler.name,
      dismissalType,
    }),
  };
}
