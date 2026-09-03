import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, User, Shield, Zap, Sparkles } from 'lucide-react';
import { AVATAR_PRESETS, BAT_COLORS } from '../data/avatars';
import { Player } from '../types';
import { soundManager } from '../audio/soundManager';

interface PlayerCreationProps {
  onBack: () => void;
  onNext: (playerData: {
    name: string;
    avatarId: string;
    batColor: string;
    position: Player['battingPosition'];
  }) => void;
}

const POSITION_ROLES: Record<Player['battingPosition'], { title: string; desc: string; icon: string }> = {
  1: { title: 'Opening Batter', desc: 'Faces the brand new ball and aggressive pace attack. Sets the early tone.', icon: '⚡' },
  2: { title: 'Opening Batter (Partner)', desc: 'Dominates the powerplay with clean strokeplay against swinging deliveries.', icon: '⚡' },
  3: { title: 'Top Order Anchor', desc: 'The backbone of the lineup. Stabilizes after early wickets or accelerates.', icon: '🛡️' },
  4: { title: 'Middle Order Maestro', desc: 'Versatile playmaker. Controls the middle overs and punishes spin.', icon: '🎯' },
  5: { title: 'Middle Order Engine', desc: 'Bridges the middle and death overs with proactive strike rotation and boundaries.', icon: '⚙️' },
  6: { title: 'Death Overs Finisher', desc: 'Explosive power-hitter designed to slaughter bowling attacks in the final overs.', icon: '💥' },
  7: { title: 'Lower-Order Finisher', desc: 'Clutch boundary hunter who seals tight finishes and chases down big targets.', icon: '🚀' },
};

export const PlayerCreation: React.FC<PlayerCreationProps> = ({ onBack, onNext }) => {
  const [name, setName] = useState('Alex Hunter');
  const [selectedAvatarId, setSelectedAvatarId] = useState(AVATAR_PRESETS[0].id);
  const [selectedBatColor, setSelectedBatColor] = useState(BAT_COLORS[0].hex);
  const [selectedPosition, setSelectedPosition] = useState<Player['battingPosition']>(4);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    soundManager.playUiChime('click');
    onNext({
      name: name.trim() || 'Master Blaster',
      avatarId: selectedAvatarId,
      batColor: selectedBatColor,
      position: selectedPosition,
    });
  };

  const selectedAvatar = AVATAR_PRESETS.find((a) => a.id === selectedAvatarId) || AVATAR_PRESETS[0];

  return (
    <div className="min-h-screen bg-[#0B1220] flex flex-col items-center justify-center p-4 sm:p-6 select-none">
      <div className="w-full max-w-4xl bg-[#141B2D] border border-[#23304E] rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#23304E] pb-4 mb-6">
          <button
            onClick={() => {
              soundManager.playUiChime('click');
              onBack();
            }}
            className="flex items-center space-x-2 text-xs font-semibold text-[#8A93A6] hover:text-[#F5F7FA] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>BACK TO TITLE</span>
          </button>
          <div className="text-xs font-bold uppercase tracking-widest text-[#00D4A5]">
            STEP 1 OF 2 • CREATE YOUR BATSMAN
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Top Row: Name & Avatar Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Live Card Preview */}
            <div className="bg-[#1B243B] p-5 rounded-xl border border-[#23304E] flex flex-col items-center text-center">
              <div className="text-6xl mb-2 filter drop-shadow-md">{selectedAvatar.emoji}</div>
              <div className="font-extrabold text-lg text-[#F5F7FA]">{name || 'Your Player'}</div>
              <div className="text-xs text-[#00D4A5] font-semibold mt-1">
                Position #{selectedPosition} • {POSITION_ROLES[selectedPosition].title}
              </div>

              {/* Bat & Skill Preview */}
              <div className="w-full mt-4 pt-3 border-t border-[#23304E]/60 flex justify-around text-xs text-[#8A93A6]">
                <div>
                  <span className="block text-[10px] uppercase">Batting Skill</span>
                  <span className="font-bold text-[#F5F7FA] text-sm">40 / 99</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase">Bat Tint</span>
                  <div
                    className="w-4 h-4 rounded-full mx-auto mt-0.5 border border-white/20 shadow-inner"
                    style={{ backgroundColor: selectedBatColor }}
                  />
                </div>
              </div>
            </div>

            {/* Inputs Column */}
            <div className="md:col-span-2 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#8A93A6] uppercase tracking-wider mb-2">
                  Player Name
                </label>
                <input
                  type="text"
                  maxLength={24}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your cricketer name"
                  className="w-full bg-[#0B1220] border border-[#23304E] focus:border-[#00D4A5] rounded-xl px-4 py-3 text-[#F5F7FA] font-medium text-sm outline-none transition"
                  required
                />
              </div>

              {/* Avatar Preset Grid */}
              <div>
                <label className="block text-xs font-bold text-[#8A93A6] uppercase tracking-wider mb-2">
                  Select Visual Persona
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {AVATAR_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        soundManager.playUiChime('click');
                        setSelectedAvatarId(preset.id);
                      }}
                      className={`p-2 rounded-xl text-2xl flex flex-col items-center justify-center transition border ${
                        selectedAvatarId === preset.id
                          ? 'bg-[#00D4A5]/15 border-[#00D4A5] shadow-lg shadow-[#00D4A5]/10 scale-105'
                          : 'bg-[#0B1220] border-[#23304E] hover:border-[#8A93A6]'
                      }`}
                    >
                      <span>{preset.emoji}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bat Color Swatches */}
              <div>
                <label className="block text-xs font-bold text-[#8A93A6] uppercase tracking-wider mb-2">
                  Custom Bat Willow / Neon Tint
                </label>
                <div className="flex flex-wrap gap-2.5 items-center">
                  {BAT_COLORS.map((bat) => (
                    <button
                      key={bat.name}
                      type="button"
                      onClick={() => {
                        soundManager.playUiChime('click');
                        setSelectedBatColor(bat.hex);
                      }}
                      title={bat.name}
                      style={{ backgroundColor: bat.hex }}
                      className={`w-7 h-7 rounded-full transition transform ${
                        selectedBatColor === bat.hex
                          ? 'ring-2 ring-[#00D4A5] ring-offset-2 ring-offset-[#141B2D] scale-110'
                          : 'opacity-80 hover:opacity-100 hover:scale-105'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Batting Position Selector (1 to 7) */}
          <div className="pt-4 border-t border-[#23304E]">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold text-[#8A93A6] uppercase tracking-wider">
                Batting Order Slot in Starting XI (1 to 7)
              </label>
              <span className="text-xs text-[#00D4A5] font-semibold">
                {POSITION_ROLES[selectedPosition].icon} {POSITION_ROLES[selectedPosition].title}
              </span>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {([1, 2, 3, 4, 5, 6, 7] as Player['battingPosition'][]).map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => {
                    soundManager.playUiChime('click');
                    setSelectedPosition(pos);
                  }}
                  className={`py-2.5 rounded-xl font-bold text-sm transition border flex flex-col items-center ${
                    selectedPosition === pos
                      ? 'bg-[#00D4A5] text-[#0B1220] border-[#00D4A5] shadow-lg shadow-[#00D4A5]/20 font-extrabold'
                      : 'bg-[#0B1220] text-[#8A93A6] border-[#23304E] hover:border-[#00D4A5]/50 hover:text-[#F5F7FA]'
                  }`}
                >
                  <span className="text-xs">No.</span>
                  <span className="text-lg leading-none">{pos}</span>
                </button>
              ))}
            </div>

            {/* Tactical role explanation */}
            <div className="mt-3 p-3 bg-[#0B1220]/70 rounded-xl border border-[#23304E] text-xs text-[#8A93A6]">
              <span className="font-bold text-[#F5F7FA]">Tactical Role: </span>
              {POSITION_ROLES[selectedPosition].desc}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="py-3.5 px-8 rounded-xl bg-gradient-to-r from-[#00D4A5] to-[#0E7490] hover:from-[#00E5B3] hover:to-[#155E75] text-[#0B1220] font-extrabold text-sm tracking-wider uppercase flex items-center space-x-2 shadow-lg shadow-[#00D4A5]/20 transition transform active:scale-95"
            >
              <span>NEXT: CHOOSE FRANCHISE</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
