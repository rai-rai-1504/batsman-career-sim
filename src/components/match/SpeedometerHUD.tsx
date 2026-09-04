import React, { useEffect, useState } from 'react';
import { useMatchStore } from '../../state/matchStore';
import { getBowlerCategoryBadge } from '../../sim/ballEngine';
import { Gauge, Zap } from 'lucide-react';

export const SpeedometerHUD: React.FC = () => {
  const showSpeedometer = useMatchStore((s) => s.showSpeedometer);
  const lastBallSpeedKmph = useMatchStore((s) => s.lastBallSpeedKmph);
  const currentBowlerCategory = useMatchStore((s) => s.currentBowlerCategory);
  const currentBowler = useMatchStore((s) => {
    const { bowlerPool, oversFacedBalls } = s;
    if (!bowlerPool.length) return null;
    return bowlerPool[Math.floor(oversFacedBalls / 6) % bowlerPool.length];
  });
  const isOnField3D = useMatchStore((s) => s.isOnField3D);

  const [displaySpeed, setDisplaySpeed] = useState<number>(0);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  const targetSpeed = lastBallSpeedKmph || 110.0;
  const badge = getBowlerCategoryBadge(currentBowlerCategory);

  // Animated speedometer number tick-up when triggered
  useEffect(() => {
    if (showSpeedometer && targetSpeed > 0) {
      setIsVisible(true);
      const startTime = performance.now();
      const duration = 280; // fast punchy 280ms radar tick-up
      const initialSpeed = Math.max(40, targetSpeed - 45);

      let animId: number;
      const tick = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        // Ease-out cubic
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = initialSpeed + (targetSpeed - initialSpeed) * ease;
        setDisplaySpeed(parseFloat(current.toFixed(1)));

        if (progress < 1) {
          animId = requestAnimationFrame(tick);
        } else {
          setDisplaySpeed(targetSpeed);
        }
      };

      animId = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(animId);
    } else if (!showSpeedometer) {
      // Fade out after ball advances
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [showSpeedometer, targetSpeed]);

  if (!isOnField3D || !isVisible) return null;

  // Percentage on 80-160 km/h gauge
  const gaugePercent = Math.max(0, Math.min(100, ((displaySpeed - 80) / (160 - 80)) * 100));

  return (
    <aside
      aria-label="Ball Speed Radar"
      className="fixed left-6 bottom-24 z-30 pointer-events-none select-none transition-all duration-300 ease-out"
      style={{
        transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.95)',
        opacity: isVisible ? 1 : 0,
      }}
    >
      <div className="bg-[#0B132B]/95 backdrop-blur-md border border-[#1E3A8A]/80 rounded-2xl p-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.7)] flex flex-col w-64">
        {/* Header: Bowler Name & Category */}
        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[#1E293B]">
          <div className="flex items-center space-x-1.5">
            <Gauge className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span className="text-[10px] font-black uppercase tracking-wider text-[#94A3B8]">
              {currentBowler?.name || 'BOWLER'}
            </span>
          </div>
          <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full ${badge.badgeClass}`}>
            {badge.shortLabel}
          </span>
        </div>

        {/* Center: Digital Speed Readout */}
        <div className="flex items-baseline justify-between px-1 my-1">
          <div className="flex items-baseline space-x-1.5">
            <span
              className="text-4xl font-black font-mono tracking-tight"
              style={{ color: badge.color }}
            >
              {displaySpeed.toFixed(1)}
            </span>
            <span className="text-xs font-black uppercase tracking-widest text-[#F8FAFC]/80">
              KMPH
            </span>
          </div>

          {currentBowlerCategory === 'bolt' && (
            <div className="flex items-center space-x-1 text-red-500 animate-pulse">
              <Zap className="w-4 h-4 fill-red-500" />
              <span className="text-[9px] font-black tracking-wider uppercase">EXPRESS</span>
            </div>
          )}
        </div>

        {/* Speed Arc / Radial Gauge Bar */}
        <div className="w-full mt-1.5">
          <div className="w-full bg-[#1E293B] h-2 rounded-full overflow-hidden p-0.5 border border-[#334155]/60 flex items-center">
            <div
              className="h-full rounded-full transition-all duration-150 ease-out"
              style={{
                width: `${gaugePercent}%`,
                background:
                  currentBowlerCategory === 'bolt'
                    ? 'linear-gradient(90deg, #F97316 0%, #EF4444 60%, #DC2626 100%)'
                    : currentBowlerCategory === 'fast'
                    ? 'linear-gradient(90deg, #F59E0B 0%, #F97316 100%)'
                    : currentBowlerCategory === 'medium'
                    ? 'linear-gradient(90deg, #38BDF8 0%, #F59E0B 100%)'
                    : 'linear-gradient(90deg, #10B981 0%, #38BDF8 100%)',
                boxShadow: `0 0 10px ${badge.color}`,
              }}
            />
          </div>

          <div className="flex justify-between text-[8px] font-mono text-[#64748B] mt-1 px-0.5 font-bold">
            <span>90</span>
            <span>110</span>
            <span>130</span>
            <span>150+</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
