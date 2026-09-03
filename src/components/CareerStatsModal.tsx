import React from 'react';
import { X, Award, BarChart3, TrendingUp, Flame, Target } from 'lucide-react';
import { Player } from '../types';
import { soundManager } from '../audio/soundManager';

interface CareerStatsModalProps {
  player: Player;
  onClose: () => void;
}

export const CareerStatsModal: React.FC<CareerStatsModalProps> = ({ player, onClose }) => {
  const { careerStats } = player;

  const strikeRate =
    careerStats.balls > 0 ? ((careerStats.runs / careerStats.balls) * 100).toFixed(1) : '0.0';

  const completedInnings = careerStats.innings - careerStats.notOuts;
  const battingAverage =
    completedInnings > 0 ? (careerStats.runs / completedInnings).toFixed(2) : careerStats.runs.toString();

  const totalDismissals = Object.values(careerStats.dismissals).reduce((a, b) => a + b, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="w-full max-w-2xl bg-[#141B2D] border border-[#23304E] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-[#23304E] flex items-center justify-between bg-[#1B243B]">
          <div className="flex items-center space-x-3">
            <Award className="w-6 h-6 text-[#FFB020]" />
            <div>
              <h2 className="text-lg font-extrabold text-[#F5F7FA] uppercase tracking-wide">
                {player.name} • Career Statistics
              </h2>
              <span className="text-xs text-[#00D4A5] font-semibold">
                Batting Skill: {player.battingSkill}/99 • Form: {player.form > 0 ? `+${player.form}` : player.form}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              soundManager.playUiChime('click');
              onClose();
            }}
            className="p-1.5 rounded-lg bg-[#0B1220] text-[#8A93A6] hover:text-[#F5F7FA] border border-[#23304E] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#0B1220] p-3.5 rounded-xl border border-[#23304E]">
              <span className="text-[10px] uppercase font-bold text-[#8A93A6] block">Matches / Innings</span>
              <span className="text-xl font-extrabold text-[#F5F7FA]">
                {careerStats.matches} <span className="text-xs text-[#8A93A6]">({careerStats.innings} inn)</span>
              </span>
            </div>

            <div className="bg-[#0B1220] p-3.5 rounded-xl border border-[#23304E]">
              <span className="text-[10px] uppercase font-bold text-[#8A93A6] block">Total Runs</span>
              <span className="text-xl font-extrabold text-[#00D4A5]">{careerStats.runs}</span>
            </div>

            <div className="bg-[#0B1220] p-3.5 rounded-xl border border-[#23304E]">
              <span className="text-[10px] uppercase font-bold text-[#8A93A6] block">Batting Average</span>
              <span className="text-xl font-extrabold text-[#FFB020]">{battingAverage}</span>
            </div>

            <div className="bg-[#0B1220] p-3.5 rounded-xl border border-[#23304E]">
              <span className="text-[10px] uppercase font-bold text-[#8A93A6] block">Strike Rate</span>
              <span className="text-xl font-extrabold text-[#38BDF8]">{strikeRate}</span>
            </div>
          </div>

          {/* Boundaries & Milestones */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#0B1220] p-3.5 rounded-xl border border-[#23304E]">
              <span className="text-[10px] uppercase font-bold text-[#8A93A6] block">High Score</span>
              <span className="text-lg font-bold text-[#F5F7FA]">{careerStats.highScore}</span>
            </div>

            <div className="bg-[#0B1220] p-3.5 rounded-xl border border-[#23304E]">
              <span className="text-[10px] uppercase font-bold text-[#8A93A6] block">50s / 100s</span>
              <span className="text-lg font-bold text-[#F5F7FA]">
                {careerStats.fifties} <span className="text-xs text-[#8A93A6]">/ {careerStats.hundreds}</span>
              </span>
            </div>

            <div className="bg-[#0B1220] p-3.5 rounded-xl border border-[#23304E]">
              <span className="text-[10px] uppercase font-bold text-[#8A93A6] block">Fours (4s)</span>
              <span className="text-lg font-bold text-emerald-400">{careerStats.fours}</span>
            </div>

            <div className="bg-[#0B1220] p-3.5 rounded-xl border border-[#23304E]">
              <span className="text-[10px] uppercase font-bold text-[#8A93A6] block">Sixes (6s)</span>
              <span className="text-lg font-bold text-amber-400">{careerStats.sixes}</span>
            </div>
          </div>

          {/* Dismissal Breakdown */}
          <div className="bg-[#0B1220] p-4 rounded-xl border border-[#23304E]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#8A93A6] mb-3 flex items-center space-x-2">
              <Target className="w-4 h-4 text-[#FF4757]" />
              <span>Dismissal Methods Breakdown ({totalDismissals} total dismissals)</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
              <div className="bg-[#141B2D] p-2.5 rounded-lg border border-[#23304E]">
                <span className="text-[10px] text-[#8A93A6] block">Caught</span>
                <span className="font-extrabold text-[#F5F7FA] text-base">{careerStats.dismissals.caught}</span>
              </div>
              <div className="bg-[#141B2D] p-2.5 rounded-lg border border-[#23304E]">
                <span className="text-[10px] text-[#8A93A6] block">Bowled</span>
                <span className="font-extrabold text-[#F5F7FA] text-base">{careerStats.dismissals.bowled}</span>
              </div>
              <div className="bg-[#141B2D] p-2.5 rounded-lg border border-[#23304E]">
                <span className="text-[10px] text-[#8A93A6] block">LBW</span>
                <span className="font-extrabold text-[#F5F7FA] text-base">{careerStats.dismissals.lbw}</span>
              </div>
              <div className="bg-[#141B2D] p-2.5 rounded-lg border border-[#23304E]">
                <span className="text-[10px] text-[#8A93A6] block">Run Out</span>
                <span className="font-extrabold text-[#F5F7FA] text-base">{careerStats.dismissals.runOut}</span>
              </div>
              <div className="bg-[#141B2D] p-2.5 rounded-lg border border-[#23304E]">
                <span className="text-[10px] text-[#8A93A6] block">Stumped</span>
                <span className="font-extrabold text-[#F5F7FA] text-base">{careerStats.dismissals.stumped}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#23304E] bg-[#1B243B] flex justify-end">
          <button
            onClick={() => {
              soundManager.playUiChime('click');
              onClose();
            }}
            className="py-2 px-6 rounded-xl bg-[#00D4A5] hover:bg-[#00E5B3] text-[#0B1220] font-extrabold text-xs tracking-wider uppercase transition shadow"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
