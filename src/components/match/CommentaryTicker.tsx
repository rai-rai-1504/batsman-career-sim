import React from 'react';
import { useMatchStore } from '../../state/matchStore';
import { Radio, Mic } from 'lucide-react';

export const CommentaryTicker: React.FC = () => {
  const lastBallEvent = useMatchStore((s) => s.lastBallEvent);
  const recentBallLogs = useMatchStore((s) => s.recentBallLogs);

  const activeEvent = lastBallEvent || recentBallLogs[0];

  return (
    <div className="absolute bottom-2 left-0 right-0 px-4 pointer-events-none flex justify-center select-none z-20">
      <div className="w-full max-w-4xl bg-[#141B2D]/90 backdrop-blur-md border border-[#23304E] rounded-xl px-4 py-2 flex items-center space-x-3 shadow-lg pointer-events-auto">
        <div className="flex items-center space-x-1.5 text-[#00D4A5] text-[10px] font-extrabold uppercase tracking-widest flex-shrink-0 bg-[#0B1220] px-2 py-0.5 rounded border border-[#23304E]">
          <Mic className="w-3 h-3 text-[#FF4757] animate-pulse" />
          <span>LIVE COMMS</span>
        </div>

        <div className="text-xs text-[#F5F7FA] font-medium truncate flex-1">
          {activeEvent ? (
            <span>
              <span className="font-bold text-[#00D4A5] mr-1.5 font-mono">
                [{activeEvent.over}.{activeEvent.ballInOver}]
              </span>
              {activeEvent.commentary}
            </span>
          ) : (
            <span className="text-[#8A93A6]">
              Bowler is marking their run-up at the top of the mark...
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
