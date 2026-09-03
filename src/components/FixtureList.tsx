import React from 'react';
import { Fixture, Team } from '../types';
import { Calendar, CheckCircle2, Clock } from 'lucide-react';

interface FixtureListProps {
  fixtures: Fixture[];
  teams: Team[];
  playerTeamId: string | null;
  currentRound: number;
}

export const FixtureList: React.FC<FixtureListProps> = ({
  fixtures,
  teams,
  playerTeamId,
  currentRound,
}) => {
  const getTeam = (teamId: string) => teams.find((t) => t.id === teamId);

  // Group by round
  const rounds = [1, 2, 3, 4, 5];

  return (
    <div className="bg-[#141B2D] border border-[#23304E] rounded-xl overflow-hidden shadow-lg">
      <div className="p-4 border-b border-[#23304E] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-[#00D4A5]" />
          <h3 className="font-extrabold text-sm uppercase text-[#F5F7FA] tracking-wide">
            League Calendar & Fixtures
          </h3>
        </div>
        <span className="text-[11px] text-[#00D4A5] font-bold">Round {currentRound} of 5</span>
      </div>

      <div className="p-4 space-y-4 max-h-[420px] overflow-y-auto pr-2">
        {rounds.map((round) => {
          const roundFixtures = fixtures.filter((f) => f.round === round);
          const isCurrent = round === currentRound;

          return (
            <div key={round} className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#8A93A6]">
                <span className={isCurrent ? 'text-[#00D4A5]' : ''}>
                  Round {round} {isCurrent && '• (ACTIVE)'}
                </span>
              </div>

              <div className="space-y-1.5">
                {roundFixtures.map((fixture) => {
                  const home = getTeam(fixture.homeTeamId);
                  const away = getTeam(fixture.awayTeamId);
                  const isUserMatch =
                    fixture.homeTeamId === playerTeamId || fixture.awayTeamId === playerTeamId;

                  return (
                    <div
                      key={fixture.id}
                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition ${
                        isUserMatch
                          ? 'bg-[#1B243B] border-[#00D4A5]/40'
                          : 'bg-[#0B1220] border-[#23304E]/60'
                      }`}
                    >
                      <div className="flex items-center space-x-2 flex-1 truncate">
                        {/* Home */}
                        <span
                          className={`font-semibold truncate ${
                            fixture.homeTeamId === playerTeamId ? 'text-[#00D4A5] font-bold' : 'text-[#F5F7FA]'
                          }`}
                        >
                          {home?.shortName || fixture.homeTeamId}
                        </span>
                        <span className="text-[#8A93A6] text-[10px]">vs</span>
                        {/* Away */}
                        <span
                          className={`font-semibold truncate ${
                            fixture.awayTeamId === playerTeamId ? 'text-[#00D4A5] font-bold' : 'text-[#F5F7FA]'
                          }`}
                        >
                          {away?.shortName || fixture.awayTeamId}
                        </span>
                      </div>

                      {/* Result / Status */}
                      <div className="text-right ml-2 flex-shrink-0">
                        {fixture.played && fixture.result ? (
                          <div className="flex items-center space-x-1.5 text-emerald-400">
                            <span className="text-[10px] font-medium text-[#8A93A6]">
                              {fixture.result.margin}
                            </span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1 text-[#8A93A6]">
                            <Clock className="w-3 h-3" />
                            <span className="text-[10px] uppercase font-bold">Upcoming</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
