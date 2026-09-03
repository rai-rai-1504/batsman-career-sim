import React, { useState } from 'react';
import {
  Play,
  RotateCw,
  Trophy,
  Award,
  Calendar,
  Target,
  Flame,
  Zap,
  TrendingUp,
  Volume2,
  VolumeX,
  Sparkles,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { useCareerStore } from '../state/careerStore';
import { LeagueTable } from './LeagueTable';
import { FixtureList } from './FixtureList';
import { CareerStatsModal } from './CareerStatsModal';
import { AVATAR_PRESETS } from '../data/avatars';
import { soundManager } from '../audio/soundManager';

interface CareerHubProps {
  onPlayMatch: (fixtureId: string) => void;
  onOpenNets: () => void;
  onResetCareer: () => void;
}

export const CareerHub: React.FC<CareerHubProps> = ({
  onPlayMatch,
  onOpenNets,
  onResetCareer,
}) => {
  const {
    player,
    playerTeamId,
    teams,
    fixtures,
    currentRound,
    totalRounds,
    leagueTable,
    milestoneToasts,
    dismissToast,
    settings,
    updateSettings,
    simulateCurrentRoundNonPlayerMatches,
    advanceToNextRound,
  } = useCareerStore();

  const [activeTab, setActiveTab] = useState<'table' | 'fixtures'>('table');
  const [showStatsModal, setShowStatsModal] = useState(false);

  if (!player || !playerTeamId) return null;

  const playerTeam = teams.find((t) => t.id === playerTeamId)!;
  const avatar = AVATAR_PRESETS.find((a) => a.id === player.avatarId) || AVATAR_PRESETS[0];

  // Find user's upcoming fixture in current round
  const currentRoundUserFixture = fixtures.find(
    (f) =>
      f.round === currentRound &&
      !f.played &&
      (f.homeTeamId === playerTeamId || f.awayTeamId === playerTeamId)
  );

  // Check if all matches in round are played
  const roundFixtures = fixtures.filter((f) => f.round === currentRound);
  const isRoundComplete = roundFixtures.every((f) => f.played);
  const isSeasonComplete = currentRound >= totalRounds && isRoundComplete;

  const opponentTeamId = currentRoundUserFixture
    ? currentRoundUserFixture.homeTeamId === playerTeamId
      ? currentRoundUserFixture.awayTeamId
      : currentRoundUserFixture.homeTeamId
    : null;
  const opponentTeam = opponentTeamId ? teams.find((t) => t.id === opponentTeamId) : null;

  const handleSimulateRestOfRound = () => {
    soundManager.playUiChime('click');
    simulateCurrentRoundNonPlayerMatches();
  };

  const handleAdvanceRound = () => {
    soundManager.playUiChime('success');
    advanceToNextRound();
  };

  const toggleSound = () => {
    const next = !settings.soundEnabled;
    updateSettings({ soundEnabled: next });
    soundManager.setSoundEnabled(next);
    if (next) soundManager.playUiChime('click');
  };

  return (
    <div className="min-h-screen bg-[#0B1220] flex flex-col p-4 sm:p-6 select-none">
      {/* Toast Bar */}
      {milestoneToasts.length > 0 && (
        <div className="mb-4 space-y-2 max-w-5xl mx-auto w-full">
          {milestoneToasts.slice(-3).map((toast, idx) => (
            <div
              key={idx}
              className="bg-[#1B243B] border border-[#00D4A5]/40 text-[#F5F7FA] px-4 py-2.5 rounded-xl text-xs flex items-center justify-between shadow-lg animate-in slide-in-from-top-2"
            >
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[#FFB020]" />
                <span>{toast}</span>
              </div>
              <button
                onClick={() => dismissToast(idx)}
                className="text-[#8A93A6] hover:text-[#F5F7FA] text-xs ml-4"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Top Bar Navigation */}
      <div className="max-w-6xl mx-auto w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#141B2D] p-4 rounded-2xl border border-[#23304E] shadow-xl mb-6">
        <div className="flex items-center space-x-3">
          <span className="text-3xl">{avatar.emoji}</span>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-extrabold text-base text-[#F5F7FA]">{player.name}</h2>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded uppercase"
                style={{ backgroundColor: playerTeam.primaryColor, color: '#FFF' }}
              >
                {playerTeam.shortName}
              </span>
            </div>
            <div className="text-xs text-[#8A93A6]">
              Position #{player.battingPosition} • Career Runs: <span className="text-[#00D4A5] font-bold">{player.careerStats.runs}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => {
              soundManager.playUiChime('click');
              setShowStatsModal(true);
            }}
            className="flex items-center space-x-1.5 bg-[#1B243B] hover:bg-[#23304E] text-[#F5F7FA] px-3 py-2 rounded-xl border border-[#23304E] text-xs font-semibold transition"
          >
            <Award className="w-4 h-4 text-[#FFB020]" />
            <span>Career Stats</span>
          </button>

          <button
            onClick={() => {
              soundManager.playUiChime('click');
              onOpenNets();
            }}
            className="flex items-center space-x-1.5 bg-[#1B243B] hover:bg-[#23304E] text-[#00D4A5] px-3 py-2 rounded-xl border border-[#00D4A5]/30 text-xs font-semibold transition"
          >
            <Target className="w-4 h-4" />
            <span>Practice Nets</span>
          </button>

          <button
            onClick={toggleSound}
            className="p-2 rounded-xl bg-[#1B243B] hover:bg-[#23304E] text-[#8A93A6] border border-[#23304E] transition"
            title="Toggle Sound"
          >
            {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-[#00D4A5]" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Player Status & Next Fixture CTA */}
        <div className="space-y-6">
          {/* Player Progress Card */}
          <div className="bg-[#141B2D] p-5 rounded-2xl border border-[#23304E] shadow-xl">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-[#8A93A6] mb-4 flex items-center justify-between">
              <span>Player Attributes</span>
              <span className="text-[#00D4A5] font-bold">LVL {Math.floor(player.battingSkill / 10)}</span>
            </h3>

            {/* Batting Skill Meter */}
            <div className="space-y-1.5 mb-4">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-[#F5F7FA]">Batting Skill</span>
                <span className="text-[#00D4A5]">{player.battingSkill} / 99</span>
              </div>
              <div className="w-full bg-[#0B1220] h-2.5 rounded-full overflow-hidden border border-[#23304E]">
                <div
                  className="bg-gradient-to-r from-[#00D4A5] to-[#38BDF8] h-full rounded-full transition-all duration-500"
                  style={{ width: `${player.battingSkill}%` }}
                />
              </div>
            </div>

            {/* Form Momentum */}
            <div className="bg-[#0B1220] p-3 rounded-xl border border-[#23304E] flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <Flame className={`w-4 h-4 ${player.form > 0 ? 'text-[#FFB020]' : player.form < 0 ? 'text-[#FF4757]' : 'text-[#8A93A6]'}`} />
                <span className="font-semibold text-[#8A93A6]">Current Form:</span>
              </div>
              <span className={`font-extrabold ${player.form > 0 ? 'text-[#FFB020]' : player.form < 0 ? 'text-[#FF4757]' : 'text-[#F5F7FA]'}`}>
                {player.form > 0 ? `+${player.form} (In Prime)` : player.form < 0 ? `${player.form} (Slump)` : '0 (Neutral)'}
              </span>
            </div>
          </div>

          {/* Next Match Action Card */}
          <div className="bg-gradient-to-b from-[#1B243B] to-[#141B2D] p-5 rounded-2xl border border-[#00D4A5]/30 shadow-2xl space-y-4">
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-[#8A93A6]">
              <span>Upcoming Fixture</span>
              <span className="text-[#00D4A5]">Round {currentRound} / {totalRounds}</span>
            </div>

            {currentRoundUserFixture && opponentTeam ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-[#0B1220] rounded-xl border border-[#23304E]">
                  <div className="text-center flex-1">
                    <span className="text-xs font-bold text-[#F5F7FA] block truncate">{playerTeam.shortName}</span>
                    <span className="text-[10px] text-[#00D4A5] font-semibold">Your Team</span>
                  </div>
                  <span className="text-xs font-black text-[#8A93A6] px-2">VS</span>
                  <div className="text-center flex-1">
                    <span className="text-xs font-bold text-[#F5F7FA] block truncate">{opponentTeam.shortName}</span>
                    <span className="text-[10px] text-[#FFB020] font-semibold">Str: {opponentTeam.overallStrength}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    soundManager.playUiChime('success');
                    onPlayMatch(currentRoundUserFixture.id);
                  }}
                  className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#00D4A5] to-[#0E7490] hover:from-[#00E5B3] hover:to-[#155E75] text-[#0B1220] font-extrabold text-sm tracking-wider uppercase flex items-center justify-center space-x-2 shadow-lg shadow-[#00D4A5]/25 transition transform active:scale-95"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>PLAY MATCH IN 3D</span>
                </button>
              </div>
            ) : isSeasonComplete ? (
              <div className="text-center py-4 space-y-3">
                <Trophy className="w-10 h-10 text-[#FFB020] mx-auto animate-bounce" />
                <div className="text-sm font-extrabold text-[#F5F7FA]">SEASON COMPLETE!</div>
                <p className="text-xs text-[#8A93A6]">
                  All 5 rounds have concluded. Check your final standings in the league table!
                </p>
                <button
                  onClick={onResetCareer}
                  className="py-2.5 px-4 rounded-xl bg-[#23304E] hover:bg-[#2F416A] text-[#F5F7FA] font-bold text-xs transition"
                >
                  Start Fresh Season
                </button>
              </div>
            ) : isRoundComplete ? (
              <div className="space-y-3">
                <div className="p-3 bg-[#0B1220] rounded-xl border border-[#23304E] text-xs text-[#8A93A6] text-center">
                  All Round {currentRound} matches completed.
                </div>
                <button
                  onClick={handleAdvanceRound}
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#FFB020] to-[#EA580C] hover:from-[#FFC04D] hover:to-[#F97316] text-[#0B1220] font-extrabold text-xs tracking-wider uppercase flex items-center justify-center space-x-2 shadow-lg transition"
                >
                  <span>ADVANCE TO ROUND {currentRound + 1}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-[#0B1220] rounded-xl border border-[#23304E] text-xs text-[#8A93A6] text-center">
                  You have finished your match for this round. Simulate the remaining matches on the calendar.
                </div>
                <button
                  onClick={handleSimulateRestOfRound}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#1B243B] hover:bg-[#23304E] text-[#00D4A5] font-extrabold text-xs tracking-wider uppercase flex items-center justify-center space-x-2 border border-[#00D4A5]/40 transition"
                >
                  <RotateCw className="w-4 h-4" />
                  <span>SIMULATE OTHER ROUND MATCHES</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right 2 Columns: Tabs for Table & Fixtures */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex space-x-2 border-b border-[#23304E] pb-2">
            <button
              onClick={() => {
                soundManager.playUiChime('click');
                setActiveTab('table');
              }}
              className={`py-2 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wide transition ${
                activeTab === 'table'
                  ? 'bg-[#00D4A5] text-[#0B1220] shadow-md'
                  : 'bg-[#141B2D] text-[#8A93A6] hover:text-[#F5F7FA]'
              }`}
            >
              League Standings
            </button>
            <button
              onClick={() => {
                soundManager.playUiChime('click');
                setActiveTab('fixtures');
              }}
              className={`py-2 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wide transition ${
                activeTab === 'fixtures'
                  ? 'bg-[#00D4A5] text-[#0B1220] shadow-md'
                  : 'bg-[#141B2D] text-[#8A93A6] hover:text-[#F5F7FA]'
              }`}
            >
              Full Calendar (5 Rounds)
            </button>
          </div>

          {activeTab === 'table' ? (
            <LeagueTable table={leagueTable} teams={teams} playerTeamId={playerTeamId} />
          ) : (
            <FixtureList
              fixtures={fixtures}
              teams={teams}
              playerTeamId={playerTeamId}
              currentRound={currentRound}
            />
          )}
        </div>
      </div>

      {/* Career Stats Modal */}
      {showStatsModal && (
        <CareerStatsModal player={player} onClose={() => setShowStatsModal(false)} />
      )}
    </div>
  );
};
