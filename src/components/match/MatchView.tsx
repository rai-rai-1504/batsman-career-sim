import React, { useEffect, useState } from 'react';
import { useMatchStore } from '../../state/matchStore';
import { MatchCanvas } from './MatchCanvas';
import { ScoreboardHUD } from './ScoreboardHUD';
import { BattingControls } from './BattingControls';
import { TimingMeter } from './TimingMeter';
import { PreMatchModal } from './PreMatchModal';
import { PostMatchSummary } from './PostMatchSummary';
import { BroadcastSimScreen } from './BroadcastSimScreen';
import { Play, RotateCcw, X, VolumeX } from 'lucide-react';

interface MatchViewProps {
  onExitMatch: () => void;
}

export const MatchView: React.FC<MatchViewProps> = ({ onExitMatch }) => {
  const {
    phase,
    isOnField3D,
    strikerIndex,
    lineup,
    startBowlerRunup,
    onDirectionInput,
  } = useMatchStore();

  const [showPreMatchModal, setShowPreMatchModal] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const striker = lineup[strikerIndex];
  const isUserStriker = striker?.isUser ?? false;

  // Auto-initiate bowler run-up after 3 seconds when scene is loaded and ready
  useEffect(() => {
    let timer: number | null = null;
    if (isOnField3D && isUserStriker && phase === 'ready' && !isPaused) {
      timer = window.setTimeout(() => {
        startBowlerRunup();
      }, 3000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isOnField3D, isUserStriker, phase, isPaused]);

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC Key toggles pause
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsPaused((prev) => !prev);
        return;
      }

      if (isPaused) return;

      if (isOnField3D && isUserStriker) {
        // STRICT: We won't register an input until the ball has been released (important)
        if (phase === 'ball_active') {
          if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
            e.preventDefault();
            onDirectionInput('leg');
          } else if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') {
            e.preventDefault();
            onDirectionInput('straight');
          } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
            e.preventDefault();
            onDirectionInput('off');
          } else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') {
            e.preventDefault();
            onDirectionInput('straight');
          }
        } else if (phase === 'ready') {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            startBowlerRunup();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, isUserStriker, isOnField3D, isPaused]);

  const handleStartMatchFromToss = () => {
    setShowPreMatchModal(false);
  };

  return (
    <div className="relative w-screen h-screen bg-[#0B1220] overflow-hidden select-none">
      {/* 1. If user is on the 3D field, render the Babylon canvas, HUD, Timing Meter, and Controls */}
      {isOnField3D ? (
        <>
          <MatchCanvas />
          <ScoreboardHUD onPause={() => setIsPaused(true)} />
          <TimingMeter />
          <BattingControls />
        </>
      ) : (
        /* 2. When not on the 3D field, show the Broadcast Scoreboard Sim */
        <BroadcastSimScreen />
      )}

      {/* Pause Modal (Toggle with ESC) */}
      {isPaused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none animate-in zoom-in-95 duration-150">
          <div className="w-full max-w-sm bg-[#141B2D] border border-[#23304E] rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <h3 className="text-xl font-black text-[#F5F7FA] uppercase tracking-wider">
              MATCH PAUSED
            </h3>
            <p className="text-xs text-[#8A93A6]">Press ESC or click Resume to continue playing.</p>

            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => setIsPaused(false)}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#00D4A5] to-[#0E7490] hover:from-[#00E5B3] hover:to-[#155E75] text-[#0B1220] font-extrabold text-sm uppercase tracking-wide flex items-center justify-center space-x-2 shadow-lg transition"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>RESUME MATCH (ESC)</span>
              </button>

              <button
                onClick={() => {
                  setIsPaused(false);
                  onExitMatch();
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#1B243B] hover:bg-[#23304E] text-[#FF4757] border border-[#23304E] font-bold text-xs uppercase tracking-wide flex items-center justify-center space-x-2 transition"
              >
                <X className="w-4 h-4" />
                <span>EXIT TO CAREER HUB</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Match Toss Modal */}
      {showPreMatchModal && <PreMatchModal onStartMatch={handleStartMatchFromToss} />}

      {/* Post-Match Summary */}
      {phase === 'match_finished' && <PostMatchSummary onReturnToHub={onExitMatch} />}
    </div>
  );
};
