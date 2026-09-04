import React, { useEffect, useRef, useState } from 'react';
import { useMatchStore } from '../../state/matchStore';
import { TIMING_PARTITIONS, SWEEP_TIMING_PARTITIONS } from '../../sim/ballEngine';
import { Sparkles, Target } from 'lucide-react';

export const TimingMeter: React.FC = () => {
  const phase = useMatchStore((s) => s.phase);
  const isOnField3D = useMatchStore((s) => s.isOnField3D);
  const ballReleaseTimestamp = useMatchStore((s) => s.ballReleaseTimestamp);
  const currentBallSpeed = useMatchStore((s) => s.currentBallSpeed);
  const currentBallLine = useMatchStore((s) => s.currentBallLine);
  const currentBallLength = useMatchStore((s) => s.currentBallLength);
  const currentBallCombination = useMatchStore((s) => s.currentBallCombination);
  const currentTimingQuality = useMatchStore((s) => s.currentTimingQuality);
  const currentTimingProgress = useMatchStore((s) => s.currentTimingProgress);

  const [liveProgress, setLiveProgress] = useState<number>(0);
  const [isHoldingM, setIsHoldingM] = useState<boolean>(false);
  const rafRef = useRef<number | null>(null);

  // Active delivery partition (adapts to sweep window when M key is held)
  const combKey = currentBallCombination || 'length_mid';
  const partition = isHoldingM
    ? SWEEP_TIMING_PARTITIONS
    : (TIMING_PARTITIONS[combKey] || TIMING_PARTITIONS.length_mid);

  // Keyboard listener for M key to show sweep early timing window
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'm') setIsHoldingM(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'm') setIsHoldingM(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Real-time animation loop when ball is in flight
  useEffect(() => {
    if (phase === 'ball_active' && ballReleaseTimestamp > 0) {
      const update = () => {
        const now = Date.now();
        const elapsed = now - ballReleaseTimestamp;
        const total = currentBallSpeed || 1000;
        const p = Math.max(0, Math.min(1, elapsed / total));
        setLiveProgress(p);

        if (p < 1) {
          rafRef.current = requestAnimationFrame(update);
        }
      };
      rafRef.current = requestAnimationFrame(update);
    } else if (phase === 'hit_impact' || phase === 'ball_flight') {
      if (currentTimingProgress !== null && currentTimingProgress !== undefined) {
        setLiveProgress(currentTimingProgress);
      }
    } else if (phase === 'ready' || phase === 'bowling_runup') {
      setLiveProgress(0);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, ballReleaseTimestamp, currentBallSpeed, currentTimingProgress]);

  // Only render on 3D field when ball is relevant
  if (!isOnField3D) return null;
  const isBallPhase =
    phase === 'ready' ||
    phase === 'bowling_runup' ||
    phase === 'ball_active' ||
    phase === 'hit_impact' ||
    phase === 'ball_flight';

  if (!isBallPhase) return null;

  // Compute partition heights as percentages of total height
  const pVeryEarlyH = partition.veryEarlyEnd * 100;
  const pEarlyH = (partition.earlyEnd - partition.veryEarlyEnd) * 100;
  const pIdealH = (partition.idealEnd - partition.earlyEnd) * 100;
  const pLateH = (partition.lateEnd - partition.idealEnd) * 100;
  const pVeryLateH = (1.0 - partition.lateEnd) * 100;

  // Visual needle position clamped 0..100%
  const needleTopPercent = Math.max(0, Math.min(100, liveProgress * 100));

  // Determine active zone for styling
  const isHitRecorded = phase === 'hit_impact' || phase === 'ball_flight';
  const quality = currentTimingQuality;

  return (
    <aside
      aria-label="Batting Timing Meter"
      className="fixed right-5 top-1/2 -translate-y-1/2 z-30 pointer-events-none select-none flex flex-col items-center"
    >
      {/* Container Card */}
      <div className="bg-[#0B132B]/90 backdrop-blur-md border border-[#1E3A8A]/70 rounded-2xl p-3 shadow-[0_10px_35px_rgba(0,0,0,0.6)] flex flex-col items-center w-24">
        {/* Header Badge */}
        <div className="text-center mb-2 w-full">
          <div className="flex items-center justify-center space-x-1 text-[10px] font-black tracking-widest uppercase">
            <Target className={`w-3 h-3 ${isHoldingM ? 'text-[#EC4899]' : 'text-[#38BDF8]'}`} />
            <span className={isHoldingM ? 'text-[#EC4899]' : 'text-[#38BDF8]'}>
              {isHoldingM ? 'SWEEP' : 'TIMING'}
            </span>
          </div>
          <div className="text-[9px] font-mono font-bold uppercase text-[#94A3B8] truncate">
            {isHoldingM ? 'EARLY WINDOW' : `${currentBallLength} • ${currentBallLine === 'mid' ? '4th' : currentBallLine}`}
          </div>
        </div>

        {/* The Vertical Gauge Track */}
        <div className="relative w-11 h-64 rounded-xl overflow-hidden border-2 border-[#1E293B] shadow-inner bg-[#030712] flex flex-col">
          {/* Zone 1: Very Early */}
          <div
            style={{ height: `${pVeryEarlyH}%` }}
            className="w-full bg-gradient-to-b from-red-950/80 to-rose-900/40 border-b border-rose-900/30 flex items-center justify-center relative"
            title="Very Early"
          >
            <span className="text-[8px] font-bold text-rose-400/80 -rotate-90 tracking-tighter uppercase whitespace-nowrap">
              V. Early
            </span>
          </div>

          {/* Zone 2: Early */}
          <div
            style={{ height: `${pEarlyH}%` }}
            className="w-full bg-gradient-to-b from-amber-900/40 to-yellow-800/40 border-b border-amber-700/30 flex items-center justify-center relative"
            title="Early"
          >
            <span className="text-[8px] font-bold text-amber-300/85 -rotate-90 tracking-tighter uppercase whitespace-nowrap">
              Early
            </span>
          </div>

          {/* Zone 3: Ideal (Sweet Spot) */}
          <div
            style={{ height: `${pIdealH}%` }}
            className="w-full bg-gradient-to-b from-emerald-500/40 via-emerald-400/50 to-emerald-500/40 border-y-2 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center justify-center relative z-10 animate-pulse"
            title="Ideal Sweet Spot"
          >
            <div className="flex items-center space-x-0.5 -rotate-90">
              <Sparkles className="w-2.5 h-2.5 text-emerald-300" />
              <span className="text-[9px] font-black text-emerald-200 tracking-wider uppercase">
                IDEAL
              </span>
            </div>
          </div>

          {/* Zone 4: Late */}
          <div
            style={{ height: `${pLateH}%` }}
            className="w-full bg-gradient-to-b from-orange-800/40 to-amber-900/40 border-b border-orange-700/30 flex items-center justify-center relative"
            title="Late"
          >
            <span className="text-[8px] font-bold text-orange-300/85 -rotate-90 tracking-tighter uppercase whitespace-nowrap">
              Late
            </span>
          </div>

          {/* Zone 5: Very Late */}
          <div
            style={{ height: `${pVeryLateH}%` }}
            className="w-full bg-gradient-to-b from-rose-900/40 to-red-950/80 flex items-center justify-center relative"
            title="Very Late"
          >
            <span className="text-[8px] font-bold text-red-400/80 -rotate-90 tracking-tighter uppercase whitespace-nowrap">
              V. Late
            </span>
          </div>

          {/* Moving Indicator Needle & Ball Bead */}
          {(phase === 'ball_active' || isHitRecorded) && (
            <div
              className="absolute left-0 right-0 z-20 transition-all duration-75 ease-out pointer-events-none"
              style={{
                top: `${needleTopPercent}%`,
                transform: 'translateY(-50%)',
              }}
            >
              {/* Horizontal glowing line */}
              <div className="w-full h-0.5 bg-white shadow-[0_0_8px_#FFFFFF]" />

              {/* Glowing cricket ball bead */}
              <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gradient-to-br from-[#EF4444] to-[#991B1B] border-2 border-white shadow-[0_0_10px_#EF4444] flex items-center justify-center">
                <div className="w-1.5 h-0.5 bg-white/80 rounded-full" />
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Timing Result Pill */}
        <div className="mt-2.5 w-full flex flex-col items-center">
          {phase === 'ready' || phase === 'bowling_runup' ? (
            <div className="px-2 py-0.5 rounded-full bg-[#1E293B] border border-[#334155] text-[9px] font-bold text-[#94A3B8] tracking-wider uppercase text-center">
              WATCH BALL
            </div>
          ) : phase === 'ball_active' && !isHitRecorded ? (
            <div className="px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/50 text-[9px] font-black text-emerald-400 tracking-wider uppercase text-center animate-pulse">
              HIT NOW!
            </div>
          ) : quality ? (
            <div
              className={`px-2 py-1 rounded-lg text-[9px] font-black tracking-wider uppercase text-center shadow-lg border w-full ${
                quality === 'ideal' || quality === 'perfect'
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                  : quality === 'early'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : quality === 'late'
                  ? 'bg-orange-500/20 border-orange-400 text-orange-300'
                  : quality === 'very_early'
                  ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                  : 'bg-red-500/20 border-red-500 text-red-300'
              }`}
            >
              {quality === 'ideal' || quality === 'perfect'
                ? '★ IDEAL ★'
                : quality.replace('_', ' ')}
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
};
