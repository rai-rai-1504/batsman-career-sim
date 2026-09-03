import { Team, Fixture, LeagueTableRow, MatchResult } from '../types';

/**
 * Circle method for round-robin schedule:
 * 6 teams => 5 rounds, 3 matches per round = 15 fixtures total.
 * Each team plays every other team exactly once.
 */
export function generateRoundRobinFixtures(teams: Team[]): Fixture[] {
  const fixtures: Fixture[] = [];
  const teamIds = teams.map((t) => t.id);
  const n = teamIds.length; // 6
  if (n % 2 !== 0) throw new Error('Teams count must be even for standard circle method');

  const pool = [...teamIds];
  const fixed = pool[0];
  const rotating = pool.slice(1); // 5 elements

  let fixtureIdCounter = 1;

  for (let round = 1; round < n; round++) {
    const roundTeams = [fixed, ...rotating];

    for (let i = 0; i < n / 2; i++) {
      const t1 = roundTeams[i];
      const t2 = roundTeams[n - 1 - i];

      // Alternate home/away based on round + match index for variety
      const [homeTeamId, awayTeamId] = (round + i) % 2 === 0 ? [t1, t2] : [t2, t1];

      fixtures.push({
        id: `fix_r${round}_m${i + 1}_${fixtureIdCounter++}`,
        round,
        homeTeamId,
        awayTeamId,
        played: false,
      });
    }

    // Rotate array clockwise: last element goes to the front of rotating array
    const last = rotating.pop()!;
    rotating.unshift(last);
  }

  return fixtures;
}

/**
 * Recalculates the league table with NRR and Points
 * Points: Win = 2, Tie/No-result = 1, Loss = 0
 * NRR = (Total Runs Scored / Total Overs Batted) - (Total Runs Conceded / Total Overs Bowled)
 */
export function calculateLeagueTable(teams: Team[], fixtures: Fixture[]): LeagueTableRow[] {
  const tableMap = new Map<string, LeagueTableRow>();

  for (const team of teams) {
    tableMap.set(team.id, {
      teamId: team.id,
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      points: 0,
      runsScored: 0,
      oversBatted: 0,
      runsConceded: 0,
      oversBowled: 0,
      nrr: 0,
    });
  }

  for (const fixture of fixtures) {
    if (!fixture.played || !fixture.result) continue;

    const result = fixture.result;
    const [inn1, inn2] = result.innings;

    const team1Row = tableMap.get(inn1.battingTeamId);
    const team2Row = tableMap.get(inn2.battingTeamId);

    if (team1Row && team2Row) {
      team1Row.played += 1;
      team2Row.played += 1;

      // If all out, cricket rules treat overs faced as full quota (e.g. 10.0 overs)
      const inn1OversBatted = inn1.wickets >= 10 ? inn1.maxOvers : inn1.oversFaced;
      const inn2OversBatted = inn2.wickets >= 10 ? inn2.maxOvers : inn2.oversFaced;

      team1Row.runsScored += inn1.totalRuns;
      team1Row.oversBatted += Math.max(1, inn1OversBatted);
      team1Row.runsConceded += inn2.totalRuns;
      team1Row.oversBowled += Math.max(1, inn2OversBatted);

      team2Row.runsScored += inn2.totalRuns;
      team2Row.oversBatted += Math.max(1, inn2OversBatted);
      team2Row.runsConceded += inn1.totalRuns;
      team2Row.oversBowled += Math.max(1, inn1OversBatted);

      if (result.winnerTeamId === 'tie') {
        team1Row.tied += 1;
        team2Row.tied += 1;
        team1Row.points += 1;
        team2Row.points += 1;
      } else if (result.winnerTeamId === inn1.battingTeamId) {
        team1Row.won += 1;
        team1Row.points += 2;
        team2Row.lost += 1;
      } else {
        team2Row.won += 1;
        team2Row.points += 2;
        team1Row.lost += 1;
      }
    }
  }

  // Calculate NRR for each team
  const tableRows = Array.from(tableMap.values()).map((row) => {
    const battingRunRate = row.oversBatted > 0 ? row.runsScored / row.oversBatted : 0;
    const bowlingRunRate = row.oversBowled > 0 ? row.runsConceded / row.oversBowled : 0;
    const rawNrr = battingRunRate - bowlingRunRate;
    return {
      ...row,
      nrr: Number(rawNrr.toFixed(3)),
    };
  });

  // Sort by Points (descending), then NRR (descending), then Total Runs Scored
  return tableRows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.nrr !== a.nrr) return b.nrr - a.nrr;
    return b.runsScored - a.runsScored;
  });
}
