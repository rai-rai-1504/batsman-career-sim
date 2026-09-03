import React, { useState } from 'react';
import { useMatchStore } from '../../state/matchStore';
import { Pause, Circle, Volume2, Volume1, VolumeX } from 'lucide-react';
import { soundManager } from '../../audio/soundManager';

interface ScoreboardHUDProps {
  onPause?: () => void;
}

export const ScoreboardHUD: React.FC<ScoreboardHUDProps> = ({ onPause }) => {
  const [volume, setVolumeState] = useState(() => soundManager.getVolume());
  const [isMuted, setIsMutedState] = useState(() => soundManager.getIsMuted());
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const handleVolumeChange = (newVal: number) => {
    soundManager.setVolume(newVal);
    setVolumeState(newVal);
    setIsMutedState(soundManager.getIsMuted());
  };

  const handleToggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMutedState(muted);
  };

  const {
    battingTeam,
    bowlingTeam,
    totalRuns,
    wickets,
    oversFacedBalls,
    maxOvers,
    targetRuns,
    lineup,
    strikerIndex,
    nonStrikerIndex,
    bowlerPool,
    phase,
    lastBallEvent,
    currentBallLine,
    currentBallLength,
  } = useMatchStore();

  if (!battingTeam || !bowlingTeam) return null;

  const currentOver = Math.floor(oversFacedBalls / 6);
  const ballsInCurrentOver = oversFacedBalls % 6;
  const oversFormatted = `${currentOver}.${ballsInCurrentOver}`;

  const striker = lineup[strikerIndex];
  const nonStriker = lineup[nonStrikerIndex];
  const currentBowler = bowlerPool[currentOver % bowlerPool.length];

  return (
    <div className="absolute inset-0 p-4 pointer-events-none flex flex-col justify-between select-none z-20">
      {/* Top Header Row */}
      <div className="flex justify-between items-start w-full pointer-events-auto">
        {/* Top-Left Scorecard Box matching Benchmark */}
        <div className="bg-[#111827]/95 border border-[#1E3A8A] rounded-lg overflow-hidden shadow-2xl w-64 text-xs font-sans">
          {/* Main Score Header */}
          <div className="bg-[#1D4ED8] p-2.5 px-3 flex justify-between items-center text-white font-extrabold">
            <span className="text-base tracking-wider uppercase">{battingTeam.shortName}</span>
            <span className="text-lg font-black font-mono">
              {totalRuns}/{wickets}
            </span>
          </div>

          {/* Match Details */}
          <div className="p-2.5 space-y-1.5 bg-[#0F172A] text-[#94A3B8] font-medium border-b border-[#1E293B]">
            <div className="flex justify-between">
              <span>Overs</span>
              <span className="font-bold text-[#F8FAFC] font-mono">{oversFormatted}</span>
            </div>
            <div className="flex justify-between">
              <span>Target</span>
              <span className="font-bold text-[#F8FAFC] font-mono">{targetRuns || (maxOvers * 12)}</span>
            </div>
          </div>

          {/* Batters Table */}
          <div className="p-2.5 space-y-1 bg-[#1E293B]/80 text-[#F8FAFC] border-b border-[#334155]">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold truncate max-w-[140px] text-[#38BDF8]">
                {striker?.name}*
              </span>
              <span className="font-mono font-extrabold">
                {striker?.runs || 0} <span className="text-[10px] text-[#94A3B8]">({striker?.balls || 0})</span>
              </span>
            </div>
            <div className="flex justify-between items-center text-xs text-[#94A3B8]">
              <span className="truncate max-w-[140px]">
                {nonStriker?.name}
              </span>
              <span className="font-mono">
                {nonStriker?.runs || 0} <span className="text-[10px] text-[#64748B]">({nonStriker?.balls || 0})</span>
              </span>
            </div>
          </div>

          {/* Bowler Details */}
          <div className="p-2 px-2.5 bg-[#0F172A] flex justify-between items-center text-[11px] text-[#94A3B8]">
            <span className="font-medium truncate max-w-[130px]">{currentBowler?.name}</span>
            <span className="font-mono font-bold text-[#F8FAFC]">0/12 (1.0)</span>
          </div>

          {/* Delivery Line & Length Badge */}
          <div className="p-1.5 px-2.5 bg-[#0B1220] flex justify-between items-center text-[10px] border-t border-[#1E293B]">
            <span className="font-bold uppercase tracking-wider text-[#64748B]">Delivery</span>
            <span className="font-mono font-bold uppercase px-2 py-0.5 rounded bg-[#1E293B] text-[#38BDF8]">
              {currentBallLength || 'length'} • {currentBallLine === 'mid' ? '4th stump' : currentBallLine || 'mid'}
            </span>
          </div>
        </div>

        {/* Top-Right: Mini-map Field Radar + Volume Control + Pause Button */}
        <div className="flex items-start space-x-2.5">
          {/* Circular Field Radar matching Benchmark */}
          <div className="w-24 h-24 rounded-full bg-[#166534]/80 border-2 border-[#22C55E]/60 shadow-2xl relative overflow-hidden flex items-center justify-center backdrop-blur-sm">
            {/* Center Pitch Rect */}
            <div className="w-1.5 h-8 bg-[#FDE047]/90 rounded-xs" />
            {/* Striker Dot */}
            <div className="absolute w-2 h-2 rounded-full bg-red-500 bottom-6" />
            {/* Fielder Dots */}
            <div className="absolute w-1.5 h-1.5 rounded-full bg-white top-3 left-6" />
            <div className="absolute w-1.5 h-1.5 rounded-full bg-white top-4 right-6" />
            <div className="absolute w-1.5 h-1.5 rounded-full bg-white bottom-6 left-3" />
            <div className="absolute w-1.5 h-1.5 rounded-full bg-white bottom-5 right-3" />
            <div className="absolute w-1.5 h-1.5 rounded-full bg-white top-7 left-3" />
            <div className="absolute w-1.5 h-1.5 rounded-full bg-white top-7 right-3" />
          </div>

          {/* Volume Control Pill */}
          <div
            className="relative flex items-center bg-[#0F172A]/90 backdrop-blur-md border border-[#1E293B] rounded-xl p-1 shadow-xl transition-all duration-200"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <button
              onClick={handleToggleMute}
              title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
              className="w-8 h-8 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-white flex items-center justify-center transition active:scale-95"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-[#EF4444]" />
              ) : volume < 0.5 ? (
                <Volume1 className="w-4 h-4 text-[#38BDF8]" />
              ) : (
                <Volume2 className="w-4 h-4 text-[#38BDF8]" />
              )}
            </button>

            {/* Expandable volume slider on hover/focus */}
            <div
              className={`flex items-center space-x-2 px-1.5 overflow-hidden transition-all duration-200 ${
                showVolumeSlider ? 'w-32 opacity-100' : 'w-0 opacity-0 pointer-events-none'
              }`}
            >
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-20 h-1.5 bg-[#334155] rounded-lg appearance-none cursor-pointer accent-[#00D4A5]"
              />
              <span className="text-[10px] font-mono font-bold text-[#94A3B8] w-6 text-right">
                {Math.round((isMuted ? 0 : volume) * 100)}%
              </span>
            </div>
          </div>

          {/* Pause Button matching Benchmark */}
          <button
            onClick={onPause}
            className="w-10 h-10 rounded-xl bg-[#1D4ED8] hover:bg-[#2563EB] text-white flex items-center justify-center shadow-lg transition active:scale-95"
          >
            <Pause className="w-5 h-5 fill-current" />
          </button>
        </div>
      </div>

      {/* Dismissal / Boundary Stinger Banner */}
      {lastBallEvent && lastBallEvent.outcome === 'wicket' && phase === 'ball_flight' && (
        <div className="self-center bg-[#EF4444] text-white font-black text-2xl px-10 py-3 rounded-full uppercase tracking-widest shadow-2xl animate-bounce">
          OUT! {lastBallEvent.dismissalType?.toUpperCase() || 'BOWLED'}
        </div>
      )}

      {lastBallEvent && (lastBallEvent.outcome === '6' || lastBallEvent.outcome === '4') && phase === 'ball_flight' && (
        <div
          className={`self-center font-black text-2xl px-10 py-3 rounded-full uppercase tracking-widest shadow-2xl animate-bounce ${
            lastBallEvent.outcome === '6'
              ? 'bg-[#EAB308] text-black shadow-yellow-500/50'
              : 'bg-[#10B981] text-black shadow-emerald-500/50'
          }`}
        >
          {lastBallEvent.outcome === '6' ? '💥 MAXIMUM 6 RUNS!' : '⚡ CRACKING 4 RUNS!'}
        </div>
      )}
    </div>
  );
};
