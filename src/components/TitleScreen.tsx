import React from 'react';
import { Play, RotateCcw, Target, Award, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { useCareerStore } from '../state/careerStore';
import { soundManager } from '../audio/soundManager';

interface TitleScreenProps {
  onNewCareer: () => void;
  onContinue: () => void;
  onNetsPractice: () => void;
  hasSavedCareer: boolean;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onNewCareer,
  onContinue,
  onNetsPractice,
  hasSavedCareer,
}) => {
  const { settings, updateSettings, player } = useCareerStore();

  const toggleSound = () => {
    const next = !settings.soundEnabled;
    updateSettings({ soundEnabled: next });
    soundManager.setSoundEnabled(next);
    if (next) soundManager.playUiChime('click');
  };

  return (
    <div className="relative min-h-screen w-full bg-[#0B1220] flex flex-col items-center justify-between p-6 overflow-hidden select-none">
      {/* Dynamic Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#00D4A5]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#FFB020]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar */}
      <div className="w-full max-w-5xl flex justify-between items-center z-10">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🏏</span>
          <span className="font-bold text-xs tracking-widest text-[#00D4A5] uppercase bg-[#141B2D] px-3 py-1 rounded-full border border-[#00D4A5]/20">
            PROTOTYPE v1.0 • BABYLON 3D
          </span>
        </div>

        <button
          onClick={toggleSound}
          className="flex items-center space-x-2 bg-[#141B2D] hover:bg-[#1B243B] text-[#F5F7FA] px-3 py-1.5 rounded-lg border border-[#23304E] text-xs transition"
          title="Toggle Sound Effects"
        >
          {settings.soundEnabled ? (
            <>
              <Volume2 className="w-4 h-4 text-[#00D4A5]" />
              <span>Audio On</span>
            </>
          ) : (
            <>
              <VolumeX className="w-4 h-4 text-[#8A93A6]" />
              <span>Audio Muted</span>
            </>
          )}
        </button>
      </div>

      {/* Hero Branding */}
      <div className="flex flex-col items-center text-center my-auto z-10 max-w-3xl">
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-[#141B2D]/80 rounded-full border border-[#00D4A5]/30 text-[#00D4A5] text-xs font-semibold mb-4 shadow-lg">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Stick-Cricket Style Timing & Direction Batting</span>
        </div>

        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-[#F5F7FA] uppercase leading-none font-sans drop-shadow-2xl">
          CRICKET <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00D4A5] via-[#38BDF8] to-[#FFB020]">CAREER</span>
        </h1>
        <p className="text-sm sm:text-lg text-[#8A93A6] mt-3 max-w-xl">
          Rise from domestic leagues to international stardom. Master the timing windows, execute 3-way shots in vibrant 3D, and forge your legacy.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mt-8 w-full max-w-md">
          {hasSavedCareer && player ? (
            <button
              onClick={() => {
                soundManager.playUiChime('click');
                onContinue();
              }}
              className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#00D4A5] to-[#0E7490] hover:from-[#00E5B3] hover:to-[#155E75] text-[#0B1220] font-extrabold text-base tracking-wide flex items-center justify-center space-x-3 shadow-lg shadow-[#00D4A5]/25 transition transform active:scale-95"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>CONTINUE CAREER ({player.name})</span>
            </button>
          ) : null}

          <button
            onClick={() => {
              soundManager.playUiChime('click');
              onNewCareer();
            }}
            className={`w-full py-4 px-6 rounded-xl font-extrabold text-base tracking-wide flex items-center justify-center space-x-3 transition transform active:scale-95 ${
              hasSavedCareer
                ? 'bg-[#141B2D] hover:bg-[#1B243B] text-[#F5F7FA] border border-[#23304E]'
                : 'bg-gradient-to-r from-[#00D4A5] to-[#0E7490] hover:from-[#00E5B3] hover:to-[#155E75] text-[#0B1220] shadow-lg shadow-[#00D4A5]/25'
            }`}
          >
            <RotateCcw className="w-5 h-5" />
            <span>NEW CAREER</span>
          </button>
        </div>

        {/* Nets Practice Link */}
        <button
          onClick={() => {
            soundManager.playUiChime('click');
            onNetsPractice();
          }}
          className="mt-4 flex items-center space-x-2 text-sm font-semibold text-[#00D4A5] hover:text-[#38BDF8] transition underline underline-offset-4"
        >
          <Target className="w-4 h-4" />
          <span>Warm up in the Practice Nets (No Stakes)</span>
        </button>
      </div>

      {/* Footer Info */}
      <div className="w-full max-w-5xl flex flex-col sm:flex-row justify-between items-center text-xs text-[#8A93A6] border-t border-[#23304E]/50 pt-4 z-10 gap-2">
        <div>Controlled Batting • Unified Sim Engine • Round-Robin League</div>
        <div className="flex items-center space-x-3">
          <span>Arrows / WASD Controls</span>
          <span>•</span>
          <span>Web Audio Synthesis</span>
        </div>
      </div>
    </div>
  );
};
