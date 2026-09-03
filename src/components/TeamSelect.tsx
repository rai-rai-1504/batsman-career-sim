import React, { useState } from 'react';
import { ArrowLeft, Check, Shield, Star, Users } from 'lucide-react';
import { Team } from '../types';
import { soundManager } from '../audio/soundManager';

interface TeamSelectProps {
  teams: Team[];
  onBack: () => void;
  onConfirmTeam: (teamId: string) => void;
}

export const TeamSelect: React.FC<TeamSelectProps> = ({ teams, onBack, onConfirmTeam }) => {
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0].id);

  const selectedTeam = teams.find((t) => t.id === selectedTeamId) || teams[0];

  const handleConfirm = () => {
    soundManager.playUiChime('success');
    onConfirmTeam(selectedTeamId);
  };

  return (
    <div className="min-h-screen bg-[#0B1220] flex flex-col items-center justify-center p-4 sm:p-6 select-none">
      <div className="w-full max-w-5xl bg-[#141B2D] border border-[#23304E] rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
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
            <span>BACK TO PLAYER CREATION</span>
          </button>
          <div className="text-xs font-bold uppercase tracking-widest text-[#00D4A5]">
            STEP 2 OF 2 • SELECT YOUR DOMESTIC TEAM
          </div>
        </div>

        {/* 6 Teams Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {teams.map((team) => {
            const isSelected = team.id === selectedTeamId;
            return (
              <div
                key={team.id}
                onClick={() => {
                  soundManager.playUiChime('click');
                  setSelectedTeamId(team.id);
                }}
                className={`cursor-pointer rounded-xl border p-4 transition-all relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#1B243B] border-[#00D4A5] ring-2 ring-[#00D4A5]/40 shadow-xl scale-[1.02]'
                    : 'bg-[#0B1220] border-[#23304E] hover:border-[#8A93A6]/40 opacity-80 hover:opacity-100'
                }`}
              >
                {/* Team Colors Ribbon */}
                <div className="flex h-2.5 w-full rounded-full overflow-hidden mb-3">
                  <div className="flex-1" style={{ backgroundColor: team.primaryColor }} />
                  <div className="flex-1" style={{ backgroundColor: team.secondaryColor }} />
                  <div className="w-4" style={{ backgroundColor: team.accentColor }} />
                </div>

                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-extrabold text-base text-[#F5F7FA]">{team.name}</h3>
                      <span className="text-xs font-bold text-[#00D4A5]">{team.shortName}</span>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-[#00D4A5] text-[#0B1220] flex items-center justify-center shadow">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-[#8A93A6] mt-2 line-clamp-2">{team.tagline}</p>
                </div>

                {/* Rating & Strength */}
                <div className="mt-4 pt-3 border-t border-[#23304E]/50 flex justify-between items-center text-xs">
                  <span className="text-[#8A93A6]">Team Strength</span>
                  <div className="flex items-center space-x-1">
                    <span className="font-extrabold text-[#FFB020]">{team.overallStrength}</span>
                    <span className="text-[#8A93A6] text-[10px]">/ 100</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Team Squad Preview */}
        <div className="bg-[#0B1220] border border-[#23304E] rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-[#00D4A5]" />
              <span className="text-xs font-bold uppercase text-[#F5F7FA]">
                {selectedTeam.name} Roster (11 Players)
              </span>
            </div>
            <span className="text-xs text-[#8A93A6]">You will join this lineup at your chosen slot</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
            {selectedTeam.squad.slice(0, 11).map((player, idx) => (
              <div key={player.id} className="bg-[#141B2D] p-2 rounded-lg border border-[#23304E]/60">
                <div className="text-[10px] text-[#8A93A6] font-semibold">#{idx + 1}</div>
                <div className="font-bold text-[#F5F7FA] truncate">{player.name}</div>
                <div className="text-[10px] text-[#00D4A5] mt-0.5">
                  Bat: {player.battingSkill} • Bowl: {player.bowlingSkill}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Confirm Action */}
        <div className="flex justify-end">
          <button
            onClick={handleConfirm}
            className="py-3.5 px-8 rounded-xl bg-gradient-to-r from-[#00D4A5] to-[#0E7490] hover:from-[#00E5B3] hover:to-[#155E75] text-[#0B1220] font-extrabold text-sm tracking-wider uppercase flex items-center space-x-2 shadow-lg shadow-[#00D4A5]/20 transition transform active:scale-95"
          >
            <span>SIGN CONTRACT & BEGIN CAREER</span>
            <Check className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </div>
    </div>
  );
};
