import { create } from 'zustand';
import { CareerState, Player, Team, Fixture, MatchResult, LeagueTableRow } from '../types';
import { generateAllTeams } from '../data/teams';
import { generateRoundRobinFixtures, calculateLeagueTable } from '../sim/fixtures';
import { simulateNpcMatch } from '../sim/inningsSim';
import { calculateSkillProgression, PostMatchProgressionResult } from '../sim/skillProgression';

const STORAGE_KEY = 'cricketCareer_v1';

interface CareerActions {
  initFromStorage: () => boolean;
  createPlayer: (name: string, avatarId: string, batColor: string, position: Player['battingPosition']) => void;
  selectTeam: (teamId: string) => void;
  startNewCareer: () => void;
  simulateCurrentRoundNonPlayerMatches: () => string[];
  recordPlayedMatchResult: (fixtureId: string, result: MatchResult, userProgression?: PostMatchProgressionResult) => void;
  advanceToNextRound: () => void;
  dismissToast: (index: number) => void;
  updateSettings: (newSettings: Partial<CareerState['settings']>) => void;
  resetAll: () => void;
}

const DEFAULT_TEAMS = generateAllTeams();
const DEFAULT_FIXTURES = generateRoundRobinFixtures(DEFAULT_TEAMS);
const DEFAULT_TABLE = calculateLeagueTable(DEFAULT_TEAMS, DEFAULT_FIXTURES);

const initialCareerState: CareerState = {
  version: 1,
  player: null,
  playerTeamId: null,
  teams: DEFAULT_TEAMS,
  fixtures: DEFAULT_FIXTURES,
  currentRound: 1,
  totalRounds: 5,
  leagueTable: DEFAULT_TABLE,
  milestoneToasts: [],
  settings: {
    soundEnabled: true,
    sfxVolume: 0.8,
    musicVolume: 0.5,
    visualQuality: 'high',
    controlsLayout: 'both',
  },
};

export const useCareerStore = create<CareerState & CareerActions>((set, get) => ({
  ...initialCareerState,

  initFromStorage: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === 1 && parsed.player) {
          set(parsed);
          return true;
        }
      }
    } catch (e) {
      console.error('Failed to load career from localStorage', e);
    }
    return false;
  },

  createPlayer: (name, avatarId, batColor, position) => {
    const newPlayer: Player = {
      id: 'player_user_' + Date.now(),
      name: name.trim() || 'Master Blaster',
      battingPosition: position,
      avatarId,
      batColor,
      battingSkill: 40,
      bowlingSkill: 40,
      form: 0,
      careerStats: {
        matches: 0,
        innings: 0,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        fifties: 0,
        hundreds: 0,
        highScore: 0,
        notOuts: 0,
        dismissals: {
          bowled: 0,
          caught: 0,
          lbw: 0,
          runOut: 0,
          stumped: 0,
        },
      },
    };

    set({ player: newPlayer });
    saveToStorage(get());
  },

  selectTeam: (teamId) => {
    set({ playerTeamId: teamId });
    saveToStorage(get());
  },

  startNewCareer: () => {
    const freshTeams = generateAllTeams();
    const freshFixtures = generateRoundRobinFixtures(freshTeams);
    const freshTable = calculateLeagueTable(freshTeams, freshFixtures);

    set({
      ...initialCareerState,
      teams: freshTeams,
      fixtures: freshFixtures,
      leagueTable: freshTable,
    });
    localStorage.removeItem(STORAGE_KEY);
  },

  simulateCurrentRoundNonPlayerMatches: () => {
    const state = get();
    const { fixtures, teams, currentRound, playerTeamId } = state;
    const simResultsSummary: string[] = [];

    const updatedFixtures = fixtures.map((fix) => {
      if (fix.round === currentRound && !fix.played) {
        const isUserMatch = fix.homeTeamId === playerTeamId || fix.awayTeamId === playerTeamId;
        if (!isUserMatch) {
          const tHome = teams.find((t) => t.id === fix.homeTeamId)!;
          const tAway = teams.find((t) => t.id === fix.awayTeamId)!;
          const result = simulateNpcMatch(tHome, tAway);
          const winner = teams.find((t) => t.id === result.winnerTeamId);
          simResultsSummary.push(
            `SIM: ${winner ? winner.name : 'Match'} ${result.margin} vs ${result.winnerTeamId === tHome.id ? tAway.name : tHome.name}`
          );
          return {
            ...fix,
            played: true,
            result,
          };
        }
      }
      return fix;
    });

    const updatedTable = calculateLeagueTable(teams, updatedFixtures);
    set({
      fixtures: updatedFixtures,
      leagueTable: updatedTable,
      milestoneToasts: [...state.milestoneToasts, ...simResultsSummary],
    });

    saveToStorage(get());
    return simResultsSummary;
  },

  recordPlayedMatchResult: (fixtureId, result, userProgression) => {
    const state = get();
    const { fixtures, teams, player } = state;

    const updatedFixtures = fixtures.map((fix) => {
      if (fix.id === fixtureId) {
        return {
          ...fix,
          played: true,
          result,
        };
      }
      return fix;
    });

    const updatedTable = calculateLeagueTable(teams, updatedFixtures);
    const updatedPlayer = userProgression ? userProgression.updatedPlayer : player;

    const newToasts = [...state.milestoneToasts];
    if (userProgression) {
      if (userProgression.totalSkillGain > 0) {
        newToasts.push(`⭐ +${userProgression.totalSkillGain} Batting Skill Points earned!`);
      }
      if (userProgression.milestoneAchieved === 'fifty') {
        newToasts.push(`🔥 Milestone Reached: Sensational Half-Century (50)!`);
      } else if (userProgression.milestoneAchieved === 'hundred') {
        newToasts.push(`👑 Incredible Century (100)! Take a bow!`);
      }
    }

    set({
      fixtures: updatedFixtures,
      leagueTable: updatedTable,
      player: updatedPlayer,
      milestoneToasts: newToasts,
    });

    saveToStorage(get());
  },

  advanceToNextRound: () => {
    const state = get();
    if (state.currentRound < state.totalRounds) {
      set({ currentRound: state.currentRound + 1 });
      saveToStorage(get());
    }
  },

  dismissToast: (index) => {
    const toasts = [...get().milestoneToasts];
    toasts.splice(index, 1);
    set({ milestoneToasts: toasts });
  },

  updateSettings: (newSettings) => {
    set({
      settings: { ...get().settings, ...newSettings },
    });
    saveToStorage(get());
  },

  resetAll: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ ...initialCareerState });
  },
}));

function saveToStorage(state: CareerState) {
  try {
    const serialized = {
      version: state.version,
      player: state.player,
      playerTeamId: state.playerTeamId,
      teams: state.teams,
      fixtures: state.fixtures,
      currentRound: state.currentRound,
      totalRounds: state.totalRounds,
      leagueTable: state.leagueTable,
      settings: state.settings,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  } catch (e) {
    console.error('Error saving career state to localStorage', e);
  }
}
