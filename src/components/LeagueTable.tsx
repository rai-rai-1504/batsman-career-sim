import React from 'react';
import { LeagueTableRow, Team } from '../types';
import { Trophy } from 'lucide-react';

interface LeagueTableProps {
  table: LeagueTableRow[];
  teams: Team[];
  playerTeamId: string | null;
}

export const LeagueTable: React.FC<LeagueTableProps> = ({ table, teams, playerTeamId }) => {
  const getTeam = (teamId: string) => teams.find((t) => t.id === teamId);

  return (
    <div className="bg-[#141B2D] border border-[#23304E] rounded-xl overflow-hidden shadow-lg">
      <div className="p-4 border-b border-[#23304E] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Trophy className="w-4 h-4 text-[#FFB020]" />
          <h3 className="font-extrabold text-sm uppercase text-[#F5F7FA] tracking-wide">
            Domestic Premier League Standings
          </h3>
        </div>
        <span className="text-[11px] text-[#8A93A6]">Top 2 qualify for Final</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0B1220] text-[#8A93A6] uppercase text-[10px] tracking-wider border-b border-[#23304E]">
            <tr>
              <th className="py-2.5 px-3 text-center">Pos</th>
              <th className="py-2.5 px-3">Team</th>
              <th className="py-2.5 px-2 text-center">P</th>
              <th className="py-2.5 px-2 text-center">W</th>
              <th className="py-2.5 px-2 text-center">L</th>
              <th className="py-2.5 px-3 text-center">NRR</th>
              <th className="py-2.5 px-3 text-center font-bold text-[#F5F7FA]">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#23304E]/50">
            {table.map((row, idx) => {
              const team = getTeam(row.teamId);
              const isUserTeam = row.teamId === playerTeamId;

              return (
                <tr
                  key={row.teamId}
                  className={`transition ${
                    isUserTeam
                      ? 'bg-[#00D4A5]/10 font-semibold text-[#F5F7FA]'
                      : 'hover:bg-[#1B243B]/60 text-[#8A93A6]'
                  }`}
                >
                  <td className="py-2.5 px-3 text-center font-bold text-[#F5F7FA]">
                    <span
                      className={`inline-block w-5 h-5 rounded-full text-center leading-5 text-[10px] ${
                        idx === 0
                          ? 'bg-[#FFB020] text-[#0B1220] font-black'
                          : idx === 1
                          ? 'bg-[#00D4A5] text-[#0B1220] font-bold'
                          : 'bg-[#23304E] text-[#8A93A6]'
                      }`}
                    >
                      {idx + 1}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: team?.primaryColor || '#999' }}
                      />
                      <span className={`truncate font-medium ${isUserTeam ? 'text-[#00D4A5] font-bold' : 'text-[#F5F7FA]'}`}>
                        {team ? team.name : row.teamId}
                      </span>
                      {isUserTeam && (
                        <span className="text-[9px] bg-[#00D4A5] text-[#0B1220] px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                          YOU
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-center">{row.played}</td>
                  <td className="py-2.5 px-2 text-center text-emerald-400 font-bold">{row.won}</td>
                  <td className="py-2.5 px-2 text-center text-rose-400">{row.lost}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-[11px]">
                    {row.nrr > 0 ? `+${row.nrr.toFixed(3)}` : row.nrr.toFixed(3)}
                  </td>
                  <td className="py-2.5 px-3 text-center font-extrabold text-sm text-[#FFB020]">
                    {row.points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
