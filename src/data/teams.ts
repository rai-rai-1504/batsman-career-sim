import { Team, NpcPlayer, BowlingType, BattingHand } from '../types';

interface TeamSeed {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  overallStrength: number;
  city: string;
}

export const TEAM_SEEDS: TeamSeed[] = [
  {
    id: 'falcons',
    name: 'Metropolis Falcons',
    shortName: 'FAL',
    tagline: 'Precision, flight, and dominance in the sky.',
    primaryColor: '#1E3A8A',
    secondaryColor: '#FFFFFF',
    accentColor: '#FDB913',
    overallStrength: 74,
    city: 'Metropolis',
  },
  {
    id: 'titans',
    name: 'Apex Titans',
    shortName: 'TIT',
    tagline: 'Unyielding power and legendary bowling attack.',
    primaryColor: '#B91C1C',
    secondaryColor: '#111111',
    accentColor: '#F5F5F5',
    overallStrength: 86,
    city: 'Apex City',
  },
  {
    id: 'panthers',
    name: 'Shadow Panthers',
    shortName: 'PAN',
    tagline: 'Silent stalkers, lethal in the death overs.',
    primaryColor: '#111827',
    secondaryColor: '#7C3AED',
    accentColor: '#C0C0C0',
    overallStrength: 68,
    city: 'Shadow Haven',
  },
  {
    id: 'strikers',
    name: 'Blaze Strikers',
    shortName: 'STR',
    tagline: 'High-octane aggression and boundary hunters.',
    primaryColor: '#EA580C',
    secondaryColor: '#111111',
    accentColor: '#FFFFFF',
    overallStrength: 80,
    city: 'Blazeport',
  },
  {
    id: 'cobras',
    name: 'Emerald Cobras',
    shortName: 'COB',
    tagline: 'Venomous spin web and tactical masterminds.',
    primaryColor: '#166534',
    secondaryColor: '#FACC15',
    accentColor: '#111111',
    overallStrength: 62,
    city: 'Emerald Coast',
  },
  {
    id: 'riders',
    name: 'Coastal Riders',
    shortName: 'RID',
    tagline: 'Young energetic squad, fearless underdogs.',
    primaryColor: '#0E7490',
    secondaryColor: '#F97316',
    accentColor: '#FFFFFF',
    overallStrength: 55,
    city: 'Port Rider',
  },
];

const FIRST_NAMES = [
  'Aarav', 'Liam', 'Rashid', 'Marcus', 'Devon', 'Zayn', 'Trent', 'Mitchell',
  'Rohit', 'David', 'Sam', 'Kagiso', 'Virat', 'Glenn', 'Shaheen', 'Jos',
  'Ben', 'Pat', 'Hardik', 'Jasprit', 'Kane', 'Andre', 'Shubman', 'Travis',
  'Heinrich', 'Rishabh', 'Quinton', 'Anrich', 'Kuldeep', 'Ravindra', 'Steve'
];

const LAST_NAMES = [
  'Sharma', 'Warner', 'Khan', 'Stoinis', 'Conway', 'Malik', 'Boult', 'Starc',
  'Gill', 'Miller', 'Curran', 'Rabada', 'Kohli', 'Maxwell', 'Afridi', 'Buttler',
  'Stokes', 'Cummins', 'Pandya', 'Bumrah', 'Williamson', 'Russell', 'Head',
  'Klaasen', 'Pant', 'de Kock', 'Nortje', 'Yadav', 'Jadeja', 'Smith', 'Archer'
];

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const BOWLING_TYPES: BowlingType[] = ['pace-fast', 'pace-medium', 'spin-off', 'spin-leg'];
const BATTING_HANDS: BattingHand[] = ['right', 'right', 'right', 'left'];

export function generateTeamRoster(teamSeed: TeamSeed): NpcPlayer[] {
  const squad: NpcPlayer[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < 11; i++) {
    let name = '';
    do {
      name = `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`;
    } while (usedNames.has(name));
    usedNames.add(name);

    // Roll skills around team seed ± 15, clamped 20-99
    const variance1 = (Math.random() * 30) - 15;
    const variance2 = (Math.random() * 30) - 15;
    
    // Top 6 are specialist batsmen / all-rounders, bottom 5 are bowlers
    let battingSkill = 0;
    let bowlingSkill = 0;

    if (i < 5) {
      // Specialist Batsman
      battingSkill = clamp(teamSeed.overallStrength + 6 + variance1, 35, 99);
      bowlingSkill = clamp(teamSeed.overallStrength - 25 + variance2, 20, 65);
    } else if (i < 7) {
      // All-rounder
      battingSkill = clamp(teamSeed.overallStrength - 4 + variance1, 35, 90);
      bowlingSkill = clamp(teamSeed.overallStrength + variance2, 35, 90);
    } else {
      // Specialist Bowler
      battingSkill = clamp(teamSeed.overallStrength - 35 + variance1, 20, 50);
      bowlingSkill = clamp(teamSeed.overallStrength + 8 + variance2, 45, 99);
    }

    squad.push({
      id: `${teamSeed.id}_p_${i + 1}`,
      name,
      battingSkill,
      bowlingSkill,
      bowlingType: randomChoice(BOWLING_TYPES),
      battingHand: randomChoice(BATTING_HANDS),
    });
  }

  return squad;
}

export function generateAllTeams(): Team[] {
  return TEAM_SEEDS.map((seed) => ({
    ...seed,
    squad: generateTeamRoster(seed),
  }));
}
