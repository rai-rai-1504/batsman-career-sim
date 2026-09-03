import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useMatchStore } from '../../state/matchStore';
import { useCareerStore } from '../../state/careerStore';
import { Trophy, Award, TrendingUp, Sparkles, Check, ArrowRight, Shield } from 'lucide-react';
import { soundManager } from '../../audio/soundManager';

interface PostMatchSummaryProps {
  onReturnToHub: () => void;
}

export const PostMatchSummary: React.FC<PostMatchSummaryProps> = ({ onReturnToHub }) => {
  const {
    fixture,
    homeTeam,
    awayTeam,
    finalMatchResult,
    userProgressionResult,
    userPlayer,
    userTeamId,
    userBallsFaced,
  } = useMatchStore();

  const recordPlayedMatchResult = useCareerStore((s) => s.recordPlayedMatchResult);

  if (!fixture || !finalMatchResult || !homeTeam || !awayTeam) return null;

  const [inn1, inn2] = finalMatchResult.innings;
  const isUserWinner = finalMatchResult.winnerTeamId === userTeamId;

  // Trigger confetti on win or milestone
  useEffect(() => {
    if (isUserWinner || userProgressionResult?.milestoneAchieved) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [isUserWinner, userProgressionResult]);

  const handleFinish = () => {
    soundManager.playUiChime('success');
    if (fixture && finalMatchResult) {
      recordPlayedMatchResult(
        fixture.id,
        finalMatchResult,
        userProgressionResult || undefined
      );
    }
    onReturnToHub();
  };

  const inn1Team = inn1.battingTeamId === homeTeam.id ? homeTeam : awayTeam;
  const inn2Team = inn2.battingTeamId === homeTeam.id ? homeTeam : awayTeam;

  const userBatterScore =
    inn1.playerScores.find((p) => p.isUser) || inn2.playerScores.find((p) => p.isUser);

  const perfectCount = userBallsFaced.filter((b) => b.timingQuality === 'perfect').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none">
      <div className="w-full max-w-3xl bg-[#141B2D] border border-[#23304E] rounded-3xl p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh] space-y-6 animate-in zoom-in-95 duration-200">
        {/* Header Result Banner */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-[#0B1220] rounded-full border border-[#00D4A5]/40 text-[#00D4A5] text-xs font-bold">
            <Trophy className="w-4 h-4 text-[#FFB020]" />
            <span>MATCH CONCLUDED</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-[#F5F7FA] uppercase tracking-wide">
            {finalMatchResult.winnerTeamId === 'tie'
              ? 'MATCH TIED'
              : `${
                  finalMatchResult.winnerTeamId === homeTeam.id ? homeTeam.name : awayTeam.name
                } ${finalMatchResult.margin}`}
          </h2>
        </div>

        {/* Innings Summary Scorecard Box */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#0B1220] p-4 rounded-2xl border border-[#23304E]">
          {/* Innings 1 */}
          <div className="p-3 bg-[#141B2D] rounded-xl border border-[#23304E]">
            <div className="flex justify-between items-center text-xs text-[#8A93A6] mb-1">
              <span className="font-bold text-[#F5F7FA]">{inn1Team.name}</span>
              <span>1st Innings</span>
            </div>
            <div className="text-2xl font-black text-[#F5F7FA] font-mono">
              {inn1.totalRuns}/{inn1.wickets}{' '}
              <span className="text-xs text-[#8A93A6]">({inn1.oversFaced} ov)</span>
            </div>
          </div>

          {/* Innings 2 */}
          <div className="p-3 bg-[#141B2D] rounded-xl border border-[#23304E]">
            <div className="flex justify-between items-center text-xs text-[#8A93A6] mb-1">
              <span className="font-bold text-[#F5F7FA]">{inn2Team.name}</span>
              <span>2nd Innings</span>
            </div>
            <div className="text-2xl font-black text-[#F5F7FA] font-mono">
              {inn2.totalRuns}/{inn2.wickets}{' '}
              <span className="text-xs text-[#8A93A6]">({inn2.oversFaced} ov)</span>
            </div>
          </div>
        </div>

        {/* Player Performance Breakdown */}
        {userBatterScore && (
          <div className="bg-[#1B243B] p-5 rounded-2xl border border-[#00D4A5]/30 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-[#FFB020]" />
                <h3 className="font-extrabold text-sm uppercase text-[#F5F7FA]">
                  Your Batting Performance ({userBatterScore.name})
                </h3>
              </div>
              <span className="text-xs text-[#00D4A5] font-bold">
                {userBatterScore.dismissal ? `Out (${userBatterScore.dismissal.type})` : 'Not Out (⭐)'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-[#0B1220] p-3 rounded-xl border border-[#23304E]">
                <span className="text-[10px] uppercase font-bold text-[#8A93A6] block">Runs (Balls)</span>
                <span className="text-xl font-black text-[#00D4A5]">
                  {userBatterScore.runs}{' '}
                  <span className="text-xs text-[#8A93A6]">({userBatterScore.balls}b)</span>
                </span>
              </div>

              <div className="bg-[#0B1220] p-3 rounded-xl border border-[#23304E]">
                <span className="text-[10px] uppercase font-bold text-[#8A93A6] block">Boundaries</span>
                <span className="text-lg font-bold text-[#F5F7FA]">
                  {userBatterScore.fours} <span className="text-xs text-[#8A93A6]">(4s)</span> • {userBatterScore.sixes}{' '}
                  <span className="text-xs text-[#8A93A6]">(6s)</span>
                </span>
              </div>

              <div className="bg-[#0B1220] p-3 rounded-xl border border-[#23304E]">
                <span className="text-[10px] uppercase font-bold text-[#8A93A6] block">Strike Rate</span>
                <span className="text-lg font-bold text-[#38BDF8]">
                  {userBatterScore.balls > 0
                    ? ((userBatterScore.runs / userBatterScore.balls) * 100).toFixed(1)
                    : '0.0'}
                </span>
              </div>

              <div className="bg-[#0B1220] p-3 rounded-xl border border-[#23304E]">
                <span className="text-[10px] uppercase font-bold text-[#8A93A6] block">Perfect Timings</span>
                <span className="text-lg font-bold text-[#FFB020]">{perfectCount} shots</span>
              </div>
            </div>
          </div>
        )}

        {/* Career Growth XP Card */}
        {userProgressionResult && (
          <div className="bg-[#0B1220] p-4 rounded-2xl border border-[#23304E] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Sparkles className="w-6 h-6 text-[#00D4A5]" />
              <div>
                <div className="font-extrabold text-sm text-[#F5F7FA]">
                  Career Attribute Growth
                </div>
                <div className="text-xs text-[#8A93A6]">
                  Runs bonus (+{userProgressionResult.runsBonus}) • Timing bonus (+{userProgressionResult.timingBonus})
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-lg font-black text-[#00D4A5]">
                +{userProgressionResult.totalSkillGain} Batting Skill
              </div>
              <div className="text-[11px] font-bold text-[#FFB020]">
                {userProgressionResult.formChange > 0
                  ? `Form Boost: +${userProgressionResult.formChange}`
                  : userProgressionResult.formChange < 0
                  ? `Form Slump: ${userProgressionResult.formChange}`
                  : 'Form Stable'}
              </div>
            </div>
          </div>
        )}

        {/* Return Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleFinish}
            className="w-full sm:w-auto py-4 px-8 rounded-xl bg-gradient-to-r from-[#00D4A5] to-[#0E7490] hover:from-[#00E5B3] hover:to-[#155E75] text-[#0B1220] font-extrabold text-sm uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-[#00D4A5]/25 transition transform active:scale-95"
          >
            <span>RETURN TO CAREER HUB</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
