export type DismissalType = 'bowled' | 'caught' | 'lbw' | 'runOut' | 'stumped';

export type BowlingType = 'pace-fast' | 'pace-medium' | 'spin-off' | 'spin-leg';

export type BattingHand = 'right' | 'left';

export type ShotDirection = 'leg' | 'straight' | 'off';

export type BallLength = 'short' | 'length' | 'yorker';

export type BallLine = 'leg' | 'mid' | 'off' | 'straight';

export type DeliveryCombination =
  | 'short_leg'
  | 'short_mid'
  | 'short_off'
  | 'length_leg'
  | 'length_mid'
  | 'length_off'
  | 'yorker_leg'
  | 'yorker_mid'
  | 'yorker_off';

export type TimingQuality =
  | 'very_early'
  | 'early'
  | 'ideal'
  | 'late'
  | 'very_late'
  | 'miss'
  | 'perfect'
  | 'good';

export interface TimingWindowPartition {
  veryEarlyEnd: number; // 0..veryEarlyEnd
  earlyEnd: number;     // veryEarlyEnd..earlyEnd
  idealEnd: number;     // earlyEnd..idealEnd
  lateEnd: number;      // idealEnd..lateEnd
}

export type BallOutcome = 'dot' | '1' | '2' | '3' | '4' | '6' | 'wicket' | 'wide' | 'no-ball';

export type Player = {
  id: string;
  name: string;
  battingPosition: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  avatarId: string;
  batColor: string;
  battingSkill: number; // 0-99, starts 40
  bowlingSkill: number; // 0-99, starts 40
  form: number;         // -10..+10, short-term momentum, decays each match
  careerStats: {
    matches: number;
    innings: number;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    fifties: number;
    hundreds: number;
    highScore: number;
    notOuts: number;
    dismissals: Record<DismissalType, number>;
  };
};

export type NpcPlayer = {
  id: string;
  name: string;
  battingSkill: number;
  bowlingSkill: number;
  bowlingType: BowlingType;
  battingHand: BattingHand;
};

export type Team = {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  overallStrength: number;
  squad: NpcPlayer[];
};

export type BallEvent = {
  over: number;
  ballInOver: number;
  batterName: string;
  bowlerName: string;
  bowlerType: BowlingType;
  line: BallLine;
  length?: BallLength;
  combination?: DeliveryCombination;
  outcome: BallOutcome;
  runs: number;
  dismissalType?: DismissalType;
  isUserBall: boolean;
  timingQuality?: TimingQuality;
  shotDirection?: ShotDirection;
  commentary: string;
};

export type InningsResult = {
  battingTeamId: string;
  bowlingTeamId: string;
  totalRuns: number;
  wickets: number;
  oversFaced: number;
  maxOvers: number;
  ballLog: BallEvent[];
  playerScores: {
    name: string;
    isUser: boolean;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    dismissal?: { type: DismissalType; bowler: string };
  }[];
  bowlerFigures: {
    name: string;
    overs: number;
    maidens: number;
    runs: number;
    wickets: number;
  }[];
};

export type MatchResult = {
  tossWinnerId: string;
  tossDecision: 'bat' | 'bowl';
  innings: [InningsResult, InningsResult];
  winnerTeamId: string; // or 'tie'
  margin: string;       // e.g. "won by 24 runs" / "won by 4 wickets"
};

export type Fixture = {
  id: string;
  round: number;
  homeTeamId: string;
  awayTeamId: string;
  played: boolean;
  result?: MatchResult;
};

export type LeagueTableRow = {
  teamId: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  points: number;
  runsScored: number;
  oversBatted: number;
  runsConceded: number;
  oversBowled: number;
  nrr: number; // Net Run Rate: (Runs Scored / Overs Faced) - (Runs Conceded / Overs Bowled)
};

export type CareerState = {
  version: number;
  player: Player | null;
  playerTeamId: string | null;
  teams: Team[];
  fixtures: Fixture[];
  currentRound: number;
  totalRounds: number;
  leagueTable: LeagueTableRow[];
  milestoneToasts: string[];
  settings: {
    soundEnabled: boolean;
    sfxVolume: number;
    musicVolume: number;
    visualQuality: 'high' | 'medium' | 'low';
    controlsLayout: 'arrows' | 'wasd' | 'both';
  };
};
