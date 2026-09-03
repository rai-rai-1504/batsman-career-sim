import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, RotateCcw, Target, Zap, Shield, Sparkles } from 'lucide-react';
import { BowlingType, BallLength, BallLine, DeliveryCombination, ShotDirection, TimingQuality, BallOutcome } from '../types';
import { calculateTimingWindow, generateBallDelivery, gradeDeliveryTiming, gradeTiming, getDirectionMatch, simulateBall } from '../sim/ballEngine';
import { soundManager } from '../audio/soundManager';

interface NetsPracticeProps {
  onBack: () => void;
}

export const NetsPractice: React.FC<NetsPracticeProps> = ({ onBack }) => {
  const [bowlerType, setBowlerType] = useState<BowlingType>('pace-fast');
  const [bowlerSkill, setBowlerSkill] = useState<number>(55);
  const [battingState, setBattingState] = useState<'idle' | 'bowling' | 'ready_for_shot' | 'result'>('idle');

  const [currentLine, setCurrentLine] = useState<BallLine>('mid');
  const [currentLength, setCurrentLength] = useState<BallLength>('length');
  const [currentCombination, setCurrentCombination] = useState<DeliveryCombination>('length_mid');
  const [windowWidthMs, setWindowWidthMs] = useState<number>(200);
  const [ballReleaseTime, setBallReleaseTime] = useState<number>(0);
  const [idealContactTime, setIdealContactTime] = useState<number>(0);

  const [lastResult, setLastResult] = useState<{
    timingQuality: TimingQuality;
    directionMatch: 'exact' | 'adjacent' | 'wrong';
    shotDirection: ShotDirection;
    line: BallLine;
    length?: BallLength;
    combination?: DeliveryCombination;
    outcome: BallOutcome;
    runs: number;
    offsetMs: number;
    commentary: string;
  } | null>(null);

  const [streak, setStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startDelivery = () => {
    soundManager.playUiChime('click');
    setBattingState('bowling');
    setLastResult(null);

    const window = calculateTimingWindow(bowlerSkill);
    setWindowWidthMs(window);

    const delivery = generateBallDelivery(bowlerType);
    setCurrentLine(delivery.line);
    setCurrentLength(delivery.length);
    setCurrentCombination(delivery.combination);

    // Short run-up delay (600ms), then ball active
    setTimeout(() => {
      const now = Date.now();
      const idealTime = now + Math.round(delivery.releaseSpeed * 0.72);
      setBallReleaseTime(now);
      setIdealContactTime(idealTime);
      setBattingState('ready_for_shot');

      // Auto miss timer if no key pressed
      const totalFlightTime = delivery.releaseSpeed;
      timerRef.current = setTimeout(() => {
        handleDirectionInput('straight', true);
      }, totalFlightTime + 100);
    }, 600);
  };

  const handleDirectionInput = (direction: ShotDirection, isTimeout: boolean = false) => {
    if (battingState !== 'ready_for_shot') return;
    if (timerRef.current) clearTimeout(timerRef.current);

    const now = Date.now();
    const elapsed = isTimeout ? 1100 : Math.max(0, now - ballReleaseTime);
    const progressRatio = isTimeout ? 1.0 : Math.min(1, elapsed / 1000);
    const offsetMs = isTimeout ? 9999 : now - idealContactTime;
    const timingQuality = isTimeout ? 'very_late' : gradeDeliveryTiming(progressRatio, currentCombination);
    const dirMatch = getDirectionMatch(direction, currentLine);

    const dummyBatter = { name: 'Practice Batter', battingSkill: 70 };
    const dummyBowler = {
      id: 'npc_net_bowler',
      name: 'Net Specialist',
      battingSkill: 30,
      bowlingSkill: bowlerSkill,
      bowlingType: bowlerType,
      battingHand: 'right' as const,
    };

    const ballEvent = simulateBall(dummyBatter, dummyBowler, {
      over: 0,
      ballInOver: 1,
      isUserBatting: true,
      deliveryLine: currentLine,
      deliveryLength: currentLength,
      deliveryCombination: currentCombination,
      userInput: {
        direction,
        timingOffsetMs: offsetMs,
        windowWidthMs,
        timingQuality,
        progressRatio,
      },
      isPractice: true,
    });

    if (ballEvent.outcome === '6') {
      soundManager.playBatCrack('huge');
      soundManager.playCheer(true);
      soundManager.playUiChime('timing');
      setStreak((s) => {
        const next = s + 1;
        if (next > bestStreak) setBestStreak(next);
        return next;
      });
    } else if (ballEvent.outcome === '4') {
      soundManager.playBatCrack('medium');
      soundManager.playCheer(false);
      if (timingQuality === 'perfect') soundManager.playUiChime('timing');
      setStreak((s) => {
        const next = s + 1;
        if (next > bestStreak) setBestStreak(next);
        return next;
      });
    } else if (ballEvent.outcome === 'wicket' || ballEvent.outcome === 'dot') {
      if (ballEvent.outcome === 'wicket') soundManager.playWicketSound();
      setStreak(0);
    } else {
      soundManager.playBatCrack('soft');
      setStreak((s) => {
        const next = s + 1;
        if (next > bestStreak) setBestStreak(next);
        return next;
      });
    }

    setLastResult({
      timingQuality,
      directionMatch: dirMatch,
      shotDirection: direction,
      line: currentLine,
      length: currentLength,
      combination: currentCombination,
      outcome: ballEvent.outcome,
      runs: ballEvent.runs,
      offsetMs,
      commentary: ballEvent.commentary,
    });

    setBattingState('result');
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (battingState === 'ready_for_shot') {
        if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
          e.preventDefault();
          handleDirectionInput('leg');
        } else if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') {
          e.preventDefault();
          handleDirectionInput('straight');
        } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
          e.preventDefault();
          handleDirectionInput('off');
        }
      } else if (battingState === 'idle' || battingState === 'result') {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          startDelivery();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [battingState, idealContactTime, windowWidthMs, currentLine, bowlerSkill, bowlerType]);

  return (
    <div className="min-h-screen bg-[#0B1220] flex flex-col items-center justify-between p-4 sm:p-6 select-none">
      {/* Header */}
      <div className="w-full max-w-4xl flex justify-between items-center bg-[#141B2D] p-4 rounded-xl border border-[#23304E]">
        <button
          onClick={() => {
            soundManager.playUiChime('click');
            onBack();
          }}
          className="flex items-center space-x-2 text-xs font-semibold text-[#8A93A6] hover:text-[#F5F7FA] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>EXIT PRACTICE NETS</span>
        </button>

        <div className="flex items-center space-x-4 text-xs font-bold">
          <div className="flex items-center space-x-1.5 text-[#FFB020]">
            <Sparkles className="w-4 h-4" />
            <span>Streak: {streak}</span>
          </div>
          <div className="text-[#8A93A6]">Best: {bestStreak}</div>
        </div>
      </div>

      {/* Main Practice Stage */}
      <div className="w-full max-w-4xl my-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Settings Panel */}
        <div className="bg-[#141B2D] p-5 rounded-2xl border border-[#23304E] space-y-5">
          <div>
            <h3 className="font-extrabold text-sm uppercase text-[#F5F7FA] tracking-wide flex items-center space-x-2 mb-3">
              <Target className="w-4 h-4 text-[#00D4A5]" />
              <span>Bowler Config</span>
            </h3>

            {/* Bowler Type */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-[#8A93A6]">Bowling Style</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {(['pace-fast', 'pace-medium', 'spin-off', 'spin-leg'] as BowlingType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      soundManager.playUiChime('click');
                      setBowlerType(type);
                    }}
                    className={`py-2 px-2 rounded-lg font-bold transition border capitalize ${
                      bowlerType === type
                        ? 'bg-[#00D4A5] text-[#0B1220] border-[#00D4A5]'
                        : 'bg-[#0B1220] text-[#8A93A6] border-[#23304E] hover:border-[#8A93A6]'
                    }`}
                  >
                    {type.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bowler Skill Slider */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-[10px] uppercase font-bold text-[#8A93A6]">Bowler Skill Level</span>
              <span className="font-extrabold text-[#FFB020]">{bowlerSkill} / 99</span>
            </div>
            <input
              type="range"
              min={25}
              max={95}
              value={bowlerSkill}
              onChange={(e) => setBowlerSkill(Number(e.target.value))}
              className="w-full accent-[#00D4A5] bg-[#0B1220] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#8A93A6] mt-1">
              <span>Rookie (Wide Window)</span>
              <span>Elite (Tight Window)</span>
            </div>
          </div>

          {/* Timing Window Info */}
          <div className="bg-[#0B1220] p-3 rounded-xl border border-[#23304E] text-xs">
            <span className="text-[10px] uppercase font-bold text-[#8A93A6] block">Active Timing Window</span>
            <span className="text-lg font-extrabold text-[#00D4A5]">
              {calculateTimingWindow(bowlerSkill)} ms
            </span>
            <p className="text-[11px] text-[#8A93A6] mt-1">
              Higher bowler skill shrinks the contact window and punishes mistimed shots.
            </p>
          </div>
        </div>

        {/* Center/Right Practice Interactive Canvas/Box */}
        <div className="md:col-span-2 bg-[#141B2D] p-6 rounded-2xl border border-[#23304E] flex flex-col justify-between items-center text-center relative overflow-hidden min-h-[380px]">
          {/* Status Header */}
          <div className="w-full flex justify-between items-center border-b border-[#23304E] pb-3">
            <span className="text-xs font-bold uppercase text-[#8A93A6]">Practice Pitch</span>
            <span
              className={`text-xs font-extrabold uppercase px-2.5 py-1 rounded-full ${
                battingState === 'ready_for_shot'
                  ? 'bg-[#FFB020] text-[#0B1220] animate-pulse'
                  : battingState === 'bowling'
                  ? 'bg-[#38BDF8] text-[#0B1220]'
                  : 'bg-[#23304E] text-[#8A93A6]'
              }`}
            >
              {battingState === 'ready_for_shot'
                ? '⚡ SWING NOW!'
                : battingState === 'bowling'
                ? 'Bowler in Run-up...'
                : 'Waiting for Delivery'}
            </span>
          </div>

          {/* Center Arena */}
          <div className="my-auto py-6 flex flex-col items-center justify-center space-y-4 w-full">
            {battingState === 'ready_for_shot' && (
              <div className="space-y-3 animate-in zoom-in-90 duration-150">
                <div className="text-sm font-bold uppercase text-[#8A93A6]">Incoming Delivery Line:</div>
                <div
                  className={`text-2xl font-black uppercase px-6 py-2 rounded-xl inline-block shadow-lg ${
                    currentLine === 'leg'
                      ? 'bg-[#38BDF8] text-[#0B1220]'
                      : currentLine === 'straight'
                      ? 'bg-[#00D4A5] text-[#0B1220]'
                      : 'bg-[#FFB020] text-[#0B1220]'
                  }`}
                >
                  {currentLine} SIDE
                </div>
              </div>
            )}

            {battingState === 'result' && lastResult && (
              <div className="space-y-3 animate-in zoom-in-95 duration-200">
                <div
                  className={`text-4xl font-extrabold uppercase drop-shadow-md ${
                    lastResult.outcome === '6'
                      ? 'text-[#FFB020]'
                      : lastResult.outcome === '4'
                      ? 'text-[#00D4A5]'
                      : lastResult.outcome === 'wicket'
                      ? 'text-[#FF4757]'
                      : 'text-[#F5F7FA]'
                  }`}
                >
                  {lastResult.outcome === 'wicket'
                    ? 'OUT!'
                    : lastResult.outcome === '6'
                    ? 'SIX! 6 RUNS'
                    : lastResult.outcome === '4'
                    ? 'FOUR! 4 RUNS'
                    : `${lastResult.runs} RUN${lastResult.runs === 1 ? '' : 'S'}`}
                </div>

                <div className="flex items-center justify-center gap-2 text-xs">
                  <span
                    className={`font-bold px-2.5 py-1 rounded-lg uppercase ${
                      lastResult.timingQuality === 'perfect'
                        ? 'bg-emerald-500 text-black'
                        : lastResult.timingQuality === 'good'
                        ? 'bg-teal-500 text-black'
                        : 'bg-amber-500 text-black'
                    }`}
                  >
                    Timing: {lastResult.timingQuality}
                  </span>
                  <span className="bg-[#0B1220] px-2.5 py-1 rounded-lg border border-[#23304E] text-[#8A93A6]">
                    Direction: {lastResult.directionMatch}
                  </span>
                </div>

                <p className="text-xs text-[#8A93A6] max-w-md italic mt-2">"{lastResult.commentary}"</p>
              </div>
            )}

            {battingState === 'idle' && (
              <div className="text-[#8A93A6] text-sm max-w-sm">
                Press <span className="text-[#00D4A5] font-bold">Bowl Ball</span> to trigger the delivery, then press
                Left, Up, or Right to strike toward that field sector.
              </div>
            )}
          </div>

          {/* Directional Controls Bar */}
          <div className="w-full space-y-3 pt-4 border-t border-[#23304E]">
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                disabled={battingState !== 'ready_for_shot'}
                onClick={() => handleDirectionInput('leg')}
                className={`py-3 px-4 rounded-xl font-extrabold text-xs uppercase flex flex-col items-center justify-center transition border ${
                  battingState === 'ready_for_shot'
                    ? 'bg-[#1B243B] hover:bg-[#38BDF8] hover:text-[#0B1220] border-[#38BDF8]/60 shadow-lg cursor-pointer active:scale-95'
                    : 'bg-[#0B1220] border-[#23304E] text-[#8A93A6] opacity-50 cursor-not-allowed'
                }`}
              >
                <span>⬅️ LEG SIDE</span>
                <span className="text-[10px] text-[#8A93A6]">[Left / A]</span>
              </button>

              <button
                type="button"
                disabled={battingState !== 'ready_for_shot'}
                onClick={() => handleDirectionInput('straight')}
                className={`py-3 px-4 rounded-xl font-extrabold text-xs uppercase flex flex-col items-center justify-center transition border ${
                  battingState === 'ready_for_shot'
                    ? 'bg-[#1B243B] hover:bg-[#00D4A5] hover:text-[#0B1220] border-[#00D4A5]/60 shadow-lg cursor-pointer active:scale-95'
                    : 'bg-[#0B1220] border-[#23304E] text-[#8A93A6] opacity-50 cursor-not-allowed'
                }`}
              >
                <span>⬆️ STRAIGHT</span>
                <span className="text-[10px] text-[#8A93A6]">[Up / W]</span>
              </button>

              <button
                type="button"
                disabled={battingState !== 'ready_for_shot'}
                onClick={() => handleDirectionInput('off')}
                className={`py-3 px-4 rounded-xl font-extrabold text-xs uppercase flex flex-col items-center justify-center transition border ${
                  battingState === 'ready_for_shot'
                    ? 'bg-[#1B243B] hover:bg-[#FFB020] hover:text-[#0B1220] border-[#FFB020]/60 shadow-lg cursor-pointer active:scale-95'
                    : 'bg-[#0B1220] border-[#23304E] text-[#8A93A6] opacity-50 cursor-not-allowed'
                }`}
              >
                <span>➡️ OFF SIDE</span>
                <span className="text-[10px] text-[#8A93A6]">[Right / D]</span>
              </button>
            </div>

            {/* Bowl Button */}
            {(battingState === 'idle' || battingState === 'result') && (
              <button
                onClick={startDelivery}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#00D4A5] to-[#0E7490] hover:from-[#00E5B3] hover:to-[#155E75] text-[#0B1220] font-extrabold text-sm tracking-wider uppercase flex items-center justify-center space-x-2 shadow-lg shadow-[#00D4A5]/20 transition transform active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>BOWL BALL (SPACEBAR / ENTER)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="text-xs text-[#8A93A6] mt-4">
        Practice Mode • Outcomes never affect your Career statistics or League standings
      </div>
    </div>
  );
};
