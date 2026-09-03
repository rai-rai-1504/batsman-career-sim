import React, { useState } from 'react';
import { useMatchStore } from '../../state/matchStore';
import { Shield, Sparkles, Trophy, Play, Check } from 'lucide-react';
import { soundManager } from '../../audio/soundManager';

interface PreMatchModalProps {
  onStartMatch: () => void;
}

export const PreMatchModal: React.FC<PreMatchModalProps> = ({ onStartMatch }) => {
  const {
    homeTeam,
    awayTeam,
    userTeamId,
    tossWinnerId,
    tossDecision,
    executeToss,
  } = useMatchStore();

  const [tossDone, setTossDone] = useState(false);
  const [flipping, setFlipping] = useState(false);

  if (!homeTeam || !awayTeam) return null;

  const handleFlipCoin = () => {
    soundManager.playUiChime('timing');
    setFlipping(true);

    setTimeout(() => {
      executeToss();
      setFlipping(false);
      setTossDone(true);
      soundManager.playUiChime('success');
    }, 1200);
  };

  const tossWinner = tossWinnerId === homeTeam.id ? homeTeam : awayTeam;
  const isUserTossWinner = tossWinnerId === userTeamId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none">
      <div className="w-full max-w-xl bg-[#141B2D] border border-[#23304E] rounded-3xl p-6 sm:p-8 shadow-2xl text-center relative overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Top Tag */}
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-[#0B1220] rounded-full border border-[#00D4A5]/30 text-[#00D4A5] text-xs font-bold mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>OFFICIAL MATCH TOSS & PITCH REPORT</span>
        </div>

        {/* Teams Matchup Header */}
        <div className="flex items-center justify-around bg-[#0B1220] p-4 rounded-2xl border border-[#23304E] mb-6">
          <div className="flex flex-col items-center">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm shadow-md"
              style={{ backgroundColor: homeTeam.primaryColor, color: '#FFF' }}
            >
              {homeTeam.shortName}
            </div>
            <span className="font-bold text-xs text-[#F5F7FA] mt-1.5">{homeTeam.name}</span>
            {homeTeam.id === userTeamId && (
              <span className="text-[9px] text-[#00D4A5] font-black">YOUR TEAM</span>
            )}
          </div>

          <span className="text-xl font-black text-[#8A93A6]">VS</span>

          <div className="flex flex-col items-center">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm shadow-md"
              style={{ backgroundColor: awayTeam.primaryColor, color: '#FFF' }}
            >
              {awayTeam.shortName}
            </div>
            <span className="font-bold text-xs text-[#F5F7FA] mt-1.5">{awayTeam.name}</span>
            {awayTeam.id === userTeamId && (
              <span className="text-[9px] text-[#00D4A5] font-black">YOUR TEAM</span>
            )}
          </div>
        </div>

        {/* Coin Toss Interactive Area */}
        {!tossDone ? (
          <div className="space-y-4 my-6">
            <div
              className={`w-20 h-20 rounded-full bg-gradient-to-tr from-[#FFB020] to-[#FDB913] border-4 border-[#FFF3D6] mx-auto flex items-center justify-center text-3xl shadow-xl transition-all duration-300 ${
                flipping ? 'animate-spin scale-110' : ''
              }`}
            >
              🪙
            </div>

            <div className="text-sm text-[#8A93A6]">
              Both captains meet at the center pitch for the official coin toss.
            </div>

            <button
              onClick={handleFlipCoin}
              disabled={flipping}
              className="py-3.5 px-8 rounded-xl bg-gradient-to-r from-[#00D4A5] to-[#0E7490] hover:from-[#00E5B3] hover:to-[#155E75] text-[#0B1220] font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-[#00D4A5]/25 transition transform active:scale-95 disabled:opacity-50"
            >
              {flipping ? 'FLIPPING COIN...' : 'SPIN THE COIN'}
            </button>
          </div>
        ) : (
          <div className="space-y-4 my-6 animate-in fade-in duration-300">
            <div className="p-4 bg-[#0B1220] rounded-2xl border border-[#00D4A5]/40 text-center">
              <div className="text-xs uppercase font-bold text-[#8A93A6]">Toss Result</div>
              <div className="text-lg font-black text-[#00D4A5] mt-1">
                {tossWinner?.name} won the toss!
              </div>
              <div className="text-xs text-[#F5F7FA] mt-1">
                Decided to <span className="font-bold text-[#FFB020] uppercase">{tossDecision} FIRST</span>
              </div>
            </div>

            <button
              onClick={() => {
                soundManager.playUiChime('click');
                onStartMatch();
              }}
              className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#00D4A5] to-[#0E7490] hover:from-[#00E5B3] hover:to-[#155E75] text-[#0B1220] font-extrabold text-sm uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-[#00D4A5]/25 transition transform active:scale-95"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>TAKE THE FIELD & START PLAY</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
