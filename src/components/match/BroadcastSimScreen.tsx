import React, { useEffect, useState } from 'react';
import { useMatchStore } from '../../state/matchStore';
import { Play, FastForward, Sparkles, Trophy, Zap, Shield, ArrowRight, Activity, Flame } from 'lucide-react';
import { soundManager } from '../../audio/soundManager';

export const BroadcastSimScreen: React.FC = () => {
  const {
    battingTeam,
    bowlingTeam,
    totalRuns,
    wickets,
    oversFacedBalls,
    maxOvers,
    targetRuns,
    currentInningsNum,
    lineup,
    strikerIndex,
    nonStrikerIndex,
    bowlerPool,
    recentBallLogs,
    isWalkoutAlertActive,
    stepSimScoreboardBall,
    simulateUntilUserTurn,
    confirmWalkoutAndLoad3D,
    userPlayer,
    userTeamId,
    phase,
    startInnings,
  } = useMatchStore();

  const [isAutoSimming, setIsAutoSimming] = useState(true);

  const striker = lineup[strikerIndex];
  const nonStriker = lineup[nonStrikerIndex];
  const currentOver = Math.floor(oversFacedBalls / 6);
  const ballsInCurrentOver = oversFacedBalls % 6;
  const oversFormatted = `${currentOver}.${ballsInCurrentOver}`;
  const currentBowler = bowlerPool[currentOver % bowlerPool.length];

  const currentRunRate =
    oversFacedBalls > 0 ? ((totalRuns / oversFacedBalls) * 6).toFixed(2) : '0.00';

  const ballsRemaining = maxOvers * 6 - oversFacedBalls;
  const runsNeeded = targetRuns ? targetRuns - totalRuns : 0;
  const requiredRunRate =
    targetRuns && ballsRemaining > 0
      ? ((runsNeeded / ballsRemaining) * 6).toFixed(2)
      : '0.00';

  // Keyboard listener for Enter to take strike
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isWalkoutAlertActive) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          confirmWalkoutAndLoad3D();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isWalkoutAlertActive]);

  // Auto-simulation interval
  useEffect(() => {
    let timer: number | null = null;
    if (isAutoSimming && !isWalkoutAlertActive && phase !== 'innings_break' && phase !== 'match_finished') {
      timer = window.setTimeout(() => {
        stepSimScoreboardBall();
      }, 550);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isAutoSimming, isWalkoutAlertActive, oversFacedBalls, phase]);

  if (!battingTeam || !bowlingTeam) return null;

  return (
    <div className="relative min-h-screen bg-[#0B1220] flex flex-col p-4 sm:p-6 select-none overflow-y-auto">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#00D4A5]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#FFB020]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top TV Broadcast Header */}
      <div className="w-full max-w-6xl mx-auto bg-[#141B2D] border border-[#23304E] rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 z-10">
        {/* Teams & Score */}
        <div className="flex items-center space-x-4">
          <div
            className="w-4 h-12 rounded-full shadow"
            style={{ backgroundColor: battingTeam.primaryColor }}
          />
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-base uppercase text-[#F5F7FA] tracking-wider">
                {battingTeam.name}
              </span>
              <span className="text-[10px] text-[#00D4A5] font-black bg-[#0B1220] px-2.5 py-0.5 rounded-full border border-[#23304E]">
                INNINGS {currentInningsNum} OF 2
              </span>
            </div>
            <div className="flex items-baseline space-x-2.5 mt-0.5">
              <span className="text-4xl font-black text-[#F5F7FA] font-mono tracking-tight">
                {totalRuns}/{wickets}
              </span>
              <span className="text-xs font-extrabold text-[#8A93A6]">
                ({oversFormatted} / {maxOvers} ov)
              </span>
            </div>
          </div>
        </div>

        {/* Center: Rates & Target */}
        <div className="text-center bg-[#0B1220] px-5 py-2.5 rounded-xl border border-[#23304E] text-xs">
          <div className="text-[#8A93A6] font-bold uppercase text-[10px]">
            Run Rate: <span className="text-[#00D4A5] font-mono text-sm">{currentRunRate} RPO</span>
          </div>
          {targetRuns ? (
            <div className="text-xs font-black text-[#FFB020] mt-0.5">
              Target: {targetRuns} • Need {runsNeeded} off {ballsRemaining}b (RRR: {requiredRunRate})
            </div>
          ) : (
            <div className="text-[11px] text-[#8A93A6] mt-0.5">
              1st Innings: Projecting {Math.round(Number(currentRunRate) * maxOvers)} runs
            </div>
          )}
        </div>

        {/* Right: Simulation Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              soundManager.playUiChime('click');
              setIsAutoSimming(!isAutoSimming);
            }}
            className={`py-2 px-3.5 rounded-xl text-xs font-extrabold uppercase tracking-wide flex items-center space-x-1.5 border transition ${
              isAutoSimming
                ? 'bg-[#00D4A5] text-[#0B1220] border-[#00D4A5] shadow-lg shadow-[#00D4A5]/20'
                : 'bg-[#1B243B] text-[#8A93A6] border-[#23304E] hover:text-[#F5F7FA]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{isAutoSimming ? 'Simulating Live...' : 'Simulation Paused'}</span>
          </button>

          <button
            onClick={() => {
              soundManager.playUiChime('click');
              simulateUntilUserTurn();
            }}
            className="py-2 px-3.5 rounded-xl bg-[#1B243B] hover:bg-[#23304E] text-[#FFB020] border border-[#FFB020]/30 text-xs font-extrabold uppercase tracking-wide flex items-center space-x-1.5 transition"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>Sim to My Turn</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 my-6 z-10">
        {/* Left 2 Columns: Match Scorecard & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Batters & Bowler Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Batters */}
            <div className="bg-[#141B2D] p-4 rounded-2xl border border-[#23304E] space-y-3">
              <div className="text-[10px] font-extrabold uppercase text-[#8A93A6] tracking-wider">
                Batting Middle Order
              </div>

              {/* Striker */}
              <div className="flex justify-between items-center bg-[#0B1220] p-3 rounded-xl border border-[#23304E]">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#00D4A5] animate-ping" />
                  <div>
                    <div className="font-extrabold text-xs text-[#F5F7FA] flex items-center space-x-1">
                      <span>{striker?.name || 'Batter'}</span>
                      {striker?.isUser && (
                        <span className="text-[9px] bg-[#00D4A5] text-[#0B1220] px-1 rounded font-black">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#8A93A6]">Striker</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-black text-[#00D4A5] text-base font-mono">
                    {striker?.runs || 0}
                  </span>
                  <span className="text-[10px] text-[#8A93A6] ml-1">({striker?.balls || 0}b)</span>
                  <div className="text-[9px] text-[#8A93A6]">
                    4s: {striker?.fours || 0} • 6s: {striker?.sixes || 0}
                  </div>
                </div>
              </div>

              {/* Non-Striker */}
              <div className="flex justify-between items-center bg-[#0B1220] p-3 rounded-xl border border-[#23304E]">
                <div>
                  <div className="font-semibold text-xs text-[#8A93A6]">
                    {nonStriker?.name || 'Partner'}
                  </div>
                  <div className="text-[10px] text-[#8A93A6]">Non-Striker</div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-[#F5F7FA] text-sm font-mono">
                    {nonStriker?.runs || 0}
                  </span>
                  <span className="text-[10px] text-[#8A93A6] ml-1">({nonStriker?.balls || 0}b)</span>
                </div>
              </div>
            </div>

            {/* Bowler */}
            <div className="bg-[#141B2D] p-4 rounded-2xl border border-[#23304E] space-y-3">
              <div className="text-[10px] font-extrabold uppercase text-[#8A93A6] tracking-wider">
                Current Bowling Attack
              </div>

              <div className="bg-[#0B1220] p-3 rounded-xl border border-[#23304E] flex justify-between items-center">
                <div>
                  <div className="font-extrabold text-xs text-[#F5F7FA]">
                    {currentBowler?.name || 'Bowler'}
                  </div>
                  <div className="text-[10px] text-[#00D4A5] capitalize">
                    {currentBowler?.bowlingType.replace('-', ' ')} • Skill: {currentBowler?.bowlingSkill}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-[#FFB020] font-mono">2.0 overs</div>
                  <div className="text-[10px] text-[#8A93A6]">Economy: {currentRunRate}</div>
                </div>
              </div>

              {/* Ball-by-ball chip stream */}
              <div>
                <div className="text-[10px] font-bold text-[#8A93A6] uppercase mb-1.5">
                  Recent Deliveries
                </div>
                <div className="flex items-center space-x-1.5 overflow-x-auto py-1">
                  {recentBallLogs.slice(0, 10).map((event, idx) => (
                    <span
                      key={idx}
                      className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center font-mono shadow ${
                        event.outcome === '6'
                          ? 'bg-[#FFB020] text-[#0B1220]'
                          : event.outcome === '4'
                          ? 'bg-[#00D4A5] text-[#0B1220]'
                          : event.outcome === 'wicket'
                          ? 'bg-[#FF4757] text-[#0B1220]'
                          : event.runs > 0
                          ? 'bg-[#1E3A8A] text-[#F5F7FA]'
                          : 'bg-[#141B2D] text-[#8A93A6] border border-[#23304E]'
                      }`}
                    >
                      {event.outcome === 'wicket' ? 'W' : event.outcome === 'dot' ? '•' : event.runs}
                    </span>
                  ))}
                  {recentBallLogs.length === 0 && (
                    <span className="text-xs text-[#8A93A6] italic">Overs commencing...</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Full Lineup Scorecard Table */}
          <div className="bg-[#141B2D] border border-[#23304E] rounded-2xl overflow-hidden shadow-xl">
            <div className="p-3.5 bg-[#1B243B] border-b border-[#23304E] flex justify-between items-center">
              <span className="font-extrabold text-xs uppercase text-[#F5F7FA] tracking-wide">
                {battingTeam.name} Lineup
              </span>
              <span className="text-[10px] text-[#8A93A6]">10 Overs Match</span>
            </div>

            <div className="divide-y divide-[#23304E]/50 text-xs">
              {lineup.map((batter, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 px-4 flex items-center justify-between transition ${
                    batter.isUser
                      ? 'bg-[#00D4A5]/10 font-bold text-[#00D4A5]'
                      : idx === strikerIndex || idx === nonStrikerIndex
                      ? 'bg-[#1B243B]/40 text-[#F5F7FA]'
                      : 'text-[#8A93A6]'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-[10px] font-mono text-[#8A93A6]">#{idx + 1}</span>
                    <span className="font-semibold">
                      {batter.name} {batter.isUser && '(YOU)'}
                    </span>
                    {batter.dismissal ? (
                      <span className="text-[10px] text-[#FF4757]">
                        c/b {batter.dismissal.bowler} ({batter.dismissal.type})
                      </span>
                    ) : idx === strikerIndex || idx === nonStrikerIndex ? (
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-black">
                        NOT OUT *
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#8A93A6]/60">Yet to bat</span>
                    )}
                  </div>

                  <div className="flex items-center space-x-4 font-mono">
                    <span className="text-sm font-bold text-[#F5F7FA]">{batter.runs}</span>
                    <span className="text-[10px] text-[#8A93A6]">({batter.balls}b)</span>
                    <span className="text-[10px] text-[#8A93A6]">
                      {batter.fours}×4, {batter.sixes}×6
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Commentary Log */}
        <div className="bg-[#141B2D] p-4 rounded-2xl border border-[#23304E] shadow-xl flex flex-col justify-between h-[520px]">
          <div>
            <div className="font-extrabold text-xs uppercase text-[#F5F7FA] tracking-wider mb-3 flex items-center space-x-2">
              <Activity className="w-4 h-4 text-[#00D4A5]" />
              <span>Broadcast Commentary Feed</span>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-[420px] pr-2">
              {recentBallLogs.map((log, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-[#0B1220] rounded-xl border border-[#23304E]/70 text-xs space-y-1"
                >
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-[#00D4A5] font-mono">
                      Over {log.over}.{log.ballInOver}
                    </span>
                    <span
                      className={`font-black uppercase px-1.5 py-0.2 rounded text-[9px] ${
                        log.outcome === '6'
                          ? 'bg-[#FFB020] text-black'
                          : log.outcome === '4'
                          ? 'bg-[#00D4A5] text-black'
                          : log.outcome === 'wicket'
                          ? 'bg-[#FF4757] text-black'
                          : 'text-[#8A93A6]'
                      }`}
                    >
                      {log.outcome === 'wicket' ? 'WICKET' : log.outcome.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[#F5F7FA] font-medium text-[11px]">{log.commentary}</p>
                </div>
              ))}

              {recentBallLogs.length === 0 && (
                <div className="text-xs text-[#8A93A6] italic text-center py-12">
                  Match commentary will stream here live ball-by-ball.
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-[#23304E] text-[10px] text-[#8A93A6] text-center">
            Simulation automatically pauses when your batsman is called to strike.
          </div>
        </div>
      </div>

      {/* Full-Screen Dramatic Walkout Modal when User is Next to Bat */}
      {isWalkoutAlertActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg select-none animate-in zoom-in-95 duration-200">
          <div className="w-full max-w-lg bg-gradient-to-b from-[#1B243B] to-[#141B2D] border-2 border-[#00D4A5] rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5 relative overflow-hidden">
            <div className="w-16 h-16 rounded-full bg-[#00D4A5]/20 border-2 border-[#00D4A5] mx-auto flex items-center justify-center text-3xl animate-bounce">
              🏏
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-black uppercase text-[#00D4A5] tracking-widest">
                ⚡ BATSMAN CROSSING THE ROPES
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#F5F7FA] uppercase tracking-wide">
                YOUR TURN TO BAT!
              </h2>
              <p className="text-xs text-[#8A93A6]">
                {userPlayer?.name} is walking out to the pitch at position #{userPlayer?.battingPosition}.
              </p>
            </div>

            <div className="bg-[#0B1220] p-3.5 rounded-2xl border border-[#23304E] text-xs flex justify-around">
              <div>
                <span className="text-[10px] text-[#8A93A6] uppercase block">Team Score</span>
                <span className="font-mono font-black text-lg text-[#F5F7FA]">
                  {totalRuns}/{wickets}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#8A93A6] uppercase block">Overs</span>
                <span className="font-mono font-black text-lg text-[#00D4A5]">
                  {oversFormatted} / {maxOvers}
                </span>
              </div>
            </div>

            <button
              onClick={confirmWalkoutAndLoad3D}
              className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#00D4A5] to-[#0E7490] hover:from-[#00E5B3] hover:to-[#155E75] text-[#0B1220] font-black text-sm uppercase tracking-wider flex items-center justify-center space-x-2 shadow-xl shadow-[#00D4A5]/30 transition transform active:scale-95 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>TAKE STRIKE (PRESS ENTER / CLICK)</span>
            </button>
          </div>
        </div>
      )}

      {/* Innings Break Modal */}
      {phase === 'innings_break' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none">
          <div className="bg-[#141B2D] border border-[#23304E] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-4 animate-in zoom-in-95">
            <div className="text-xs uppercase font-bold text-[#FFB020] tracking-widest">
              INNINGS 1 COMPLETE
            </div>
            <h3 className="text-2xl font-black text-[#F5F7FA]">
              Score: {totalRuns}/{wickets}
            </h3>
            <p className="text-xs text-[#8A93A6]">
              Target set: <span className="font-bold text-[#00D4A5]">{totalRuns + 1} runs</span> needed from{' '}
              {maxOvers} overs.
            </p>
            <button
              onClick={() => {
                soundManager.playUiChime('success');
                startInnings(2);
              }}
              className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#00D4A5] to-[#0E7490] hover:from-[#00E5B3] hover:to-[#155E75] text-[#0B1220] font-extrabold text-sm uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg transition"
            >
              <span>BEGIN 2ND INNINGS (CHASE)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
