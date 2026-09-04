import React from 'react';
import { useMatchStore } from '../../state/matchStore';
import { ShotDirection } from '../../types';

export const BattingControls: React.FC = () => {
  const phase = useMatchStore((s) => s.phase);
  const currentBallLine = useMatchStore((s) => s.currentBallLine);
  const striker = useMatchStore((s) => s.lineup[s.strikerIndex]);

  const isUserStriker = striker?.isUser ?? false;

  return (
    <div className="absolute bottom-4 left-0 right-0 pointer-events-none flex flex-col items-center justify-center select-none z-20">
      {/* Clean, unobtrusive keyboard helper pill for browser play */}
      <div className="bg-[#0B1220]/85 backdrop-blur-md px-5 py-2 rounded-full border border-[#23304E] shadow-xl flex items-center space-x-4 text-xs text-[#8A93A6] font-medium flex-wrap justify-center gap-y-1">
        <div className="flex items-center space-x-1.5">
          <kbd className="px-2 py-0.5 bg-[#1B243B] text-[#38BDF8] border border-[#23304E] rounded font-bold font-mono text-[11px]">
            ← / A
          </kbd>
          <span>Leg / Pull</span>
        </div>

        <div className="w-1 h-1 rounded-full bg-[#23304E]" />

        <div className="flex items-center space-x-1.5">
          <kbd className="px-2 py-0.5 bg-[#1B243B] text-[#00D4A5] border border-[#23304E] rounded font-bold font-mono text-[11px]">
            ↑ / W
          </kbd>
          <span>Straight</span>
        </div>

        <div className="w-1 h-1 rounded-full bg-[#23304E]" />

        <div className="flex items-center space-x-1.5">
          <kbd className="px-2 py-0.5 bg-[#1B243B] text-[#FFB020] border border-[#23304E] rounded font-bold font-mono text-[11px]">
            → / D
          </kbd>
          <span>Off / Cut</span>
        </div>

        <div className="w-1 h-1 rounded-full bg-[#23304E]" />

        <div className="flex items-center space-x-1.5">
          <kbd className="px-2 py-0.5 bg-[#1B243B] text-[#A78BFA] border border-[#23304E] rounded font-bold font-mono text-[11px]">
            ↓ / S
          </kbd>
          <span>Defend</span>
        </div>

        <div className="w-1 h-1 rounded-full bg-[#23304E]" />

        <div className="flex items-center space-x-1.5">
          <kbd className="px-2 py-0.5 bg-[#1B243B] text-[#EC4899] border border-[#23304E] rounded font-bold font-mono text-[11px]">
            M + ←/→
          </kbd>
          <span>Sweep / Rev (Early)</span>
        </div>

        <div className="w-1 h-1 rounded-full bg-[#23304E]" />

        <div className="flex items-center space-x-1.5 text-[#94A3B8]">
          <kbd className="px-2 py-0.5 bg-[#1B243B] text-[#F5F7FA] border border-[#23304E] rounded font-bold font-mono text-[10px]">
            ESC
          </kbd>
          <span>Pause</span>
        </div>
      </div>
    </div>
  );
};
