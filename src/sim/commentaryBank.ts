import { BallOutcome, TimingQuality, ShotDirection, DismissalType } from '../types';

export const COMMENTARY_BANK = {
  six: {
    perfect: [
      "BOOM! Absolutely smoked deep into the upper stands!",
      "PURE PERFECTION! Sweet sound off the bat as it clears the boundary by miles!",
      "MAJESTIC! High, handsome, and that has landed on the stadium roof!",
      "STAND AND DELIVER! That is an unbelievable hit over the ropes!"
    ],
    good: [
      "HIGH AND HANDSOME! It clears the boundary fielder for a maximum!",
      "Into the crowd! He caught enough of that to send it all the way!",
      "Lofted cleanly and sailed over the rope! Six runs added to the tally."
    ],
    lucky: [
      "Top edge... and it carries all the way over the third man boundary! Six runs!",
      "Muscled away over mid-wicket, just had enough power to clear the rope!"
    ]
  },
  four: {
    perfect: [
      "CRACK! Pierces the gap with surgical precision, racing away for four!",
      "GLORIOUS STROKE! Fast outfield and nobody is chasing that one!",
      "Timing at its absolute peak! Off the middle and bulleting to the boundary rope.",
      "Pure class! Opened the blade and bisected the cover fielders for four!"
    ],
    good: [
      "Nicely punched through the infield, beats the chasing fielder for four.",
      "Controlled and placed well! Races across the turf for a boundary.",
      "Great shot selection, finding the vacant gap for four."
    ],
    early_late: [
      "Thick edge, squirts past slip and scampers away to the fence for four.",
      "Mistimed slightly, but finds the gap between fielders for four runs."
    ]
  },
  runs: {
    three: [
      "Great running between the wickets! Pushed into the deep for three quick runs.",
      "Swept into the vast expanses, good hustle from both batters to come back for the third."
    ],
    two: [
      "Pushed into the gap, loud call of 'TWO!' and they complete it comfortably.",
      "Nicely nudged off the pads for a brisk brace.",
      "Soft hands into the cover region, excellent sprint for a pair."
    ],
    one: [
      "Tapped into the off side and scampers through for a sharp single.",
      "Worked off the hips toward deep square leg for one.",
      "Driven down to long-on to rotate the strike.",
      "Dropped with soft hands onto the pitch, good communication for a single."
    ]
  },
  dot: {
    miss: [
      "PLAYED AND MISSED! Whistles past the outside edge into the keeper's gloves!",
      "Beaten for pace! The batter had no clue about that delivery.",
      "Past the swinging bat! Superb variation from the bowler."
    ],
    cramped: [
      "Defended solidly back down the pitch. No run.",
      "Pushed straight to the fielder at mid-off, no chance of a single.",
      "Tucked towards short mid-wicket, fielder gathers quickly. Dot ball."
    ]
  },
  wicket: {
    bowled: [
      "TIMBER! Cleaned him up! The stumps are shattered into pieces!",
      "BOWLED HIM! Deceived by the trajectory and the middle stump is uprooted!",
      "KNOCKED OVER! Through the gate and crashes into the woodwork!"
    ],
    caught: [
      "IN THE AIR AND TAKEN! A simple catch for the fielder in the deep!",
      "EDGED AND GONE! Thick edge straight into the safe gloves of the keeper!",
      "CAUGHT! Tried to muscle it across the line and pays the ultimate price!"
    ],
    lbw: [
      "LOUD APPEAL... AND GIVEN! Trapped plumb right in front of all three!",
      "HUGE SHOUT FOR LBW! Finger goes straight up! That looked stone dead!"
    ],
    stumped: [
      "STUMPED! Stepped out of the crease, missed the spin, and bails are whipped off!",
      "Lightning work by the wicketkeeper! Batter was inches out of the ground."
    ],
    runOut: [
      "RUN OUT! Direct hit at the bowler's end! Desperate dive is not enough!"
    ]
  },
  extras: {
    wide: [
      "Wide ball called! Bowled well outside the tramlines.",
      "Strayed way down the leg side, umpire stretches arms out. Wide."
    ],
    noBall: [
      "NO BALL! Overstepped the front line! Free run and warning for the bowler."
    ]
  }
};

export function getCommentary(params: {
  outcome: BallOutcome;
  runs: number;
  line: string;
  batterName: string;
  bowlerName: string;
  timing?: TimingQuality;
  shotDir?: ShotDirection;
  dismissalType?: DismissalType;
}): string {
  const { outcome, runs, timing, dismissalType } = params;

  if (outcome === 'wide') {
    return COMMENTARY_BANK.extras.wide[Math.floor(Math.random() * COMMENTARY_BANK.extras.wide.length)];
  }
  if (outcome === 'no-ball') {
    return COMMENTARY_BANK.extras.noBall[Math.floor(Math.random() * COMMENTARY_BANK.extras.noBall.length)];
  }

  if (outcome === 'wicket') {
    const dType = dismissalType || 'caught';
    const lines = COMMENTARY_BANK.wicket[dType] || COMMENTARY_BANK.wicket.caught;
    return lines[Math.floor(Math.random() * lines.length)];
  }

  if (outcome === '6') {
    if (timing === 'ideal' || timing === 'perfect') {
      return COMMENTARY_BANK.six.perfect[Math.floor(Math.random() * COMMENTARY_BANK.six.perfect.length)];
    }
    if (timing === 'good' || timing === 'early' || timing === 'late') {
      return COMMENTARY_BANK.six.good[Math.floor(Math.random() * COMMENTARY_BANK.six.good.length)];
    }
    return COMMENTARY_BANK.six.lucky[Math.floor(Math.random() * COMMENTARY_BANK.six.lucky.length)];
  }

  if (outcome === '4') {
    if (timing === 'ideal' || timing === 'perfect') {
      return COMMENTARY_BANK.four.perfect[Math.floor(Math.random() * COMMENTARY_BANK.four.perfect.length)];
    }
    if (timing === 'good') {
      return COMMENTARY_BANK.four.good[Math.floor(Math.random() * COMMENTARY_BANK.four.good.length)];
    }
    return COMMENTARY_BANK.four.early_late[Math.floor(Math.random() * COMMENTARY_BANK.four.early_late.length)];
  }

  if (runs === 3) {
    return COMMENTARY_BANK.runs.three[Math.floor(Math.random() * COMMENTARY_BANK.runs.three.length)];
  }
  if (runs === 2) {
    return COMMENTARY_BANK.runs.two[Math.floor(Math.random() * COMMENTARY_BANK.runs.two.length)];
  }
  if (runs === 1) {
    return COMMENTARY_BANK.runs.one[Math.floor(Math.random() * COMMENTARY_BANK.runs.one.length)];
  }

  if (timing === 'miss') {
    return COMMENTARY_BANK.dot.miss[Math.floor(Math.random() * COMMENTARY_BANK.dot.miss.length)];
  }
  return COMMENTARY_BANK.dot.cramped[Math.floor(Math.random() * COMMENTARY_BANK.dot.cramped.length)];
}
