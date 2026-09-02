import { NotFound } from '../../platform/http/errors';
import type { AnalysisReport, AnalysisRepository } from './analysis.repository';
import type { TbaClient } from '../../integrations/tba/tba-client';

export const metricNames = [
  'totalPoints',
  'autoPoints',
  'teleopPoints',
  'fuelPerSecond',
  'accuracy',
  'volleysPerMatch',
  'l1StartTime',
  'l2StartTime',
  'l3StartTime',
  'autoClimbStartTime',
  'driverAbility',
  'contactDefenseTime',
  'defenseEffectiveness',
  'campingDefenseTime',
  'totalDefenseTime',
  'timeFeeding',
  'feedingRate',
  'feedsPerMatch',
  'totalFuelOutputted',
  'totalBallsFed',
  'outpostIntakes',
] as const;
export type CategoryMetric = (typeof metricNames)[number];
export type CategoryMetrics = Record<CategoryMetric, number>;
export const metricDetailNames = [
  ...metricNames,
  'scoringRate',
  'totalBallThroughput',
  'totalBallThroughPut',
] as const;

export const breakdownNames = [
  'robotRole',
  'fieldTraversal',
  'climbResult',
  'beached',
  'scoresWhileMoving',
  'disrupts',
  'autoClimb',
  'feederType',
  'intakeType',
] as const;
export type BreakdownName = (typeof breakdownNames)[number];
const breakdownOptions = {
  robotRole: ['CYCLING', 'SCORING', 'FEEDING', 'DEFENDING', 'IMMOBILE'],
  fieldTraversal: ['TRENCH', 'BUMP', 'BOTH', 'NONE'],
  climbResult: ['NOT_ATTEMPTED', 'FAILED', 'L1', 'L2', 'L3'],
  beached: ['ON_FUEL', 'ON_BUMP', 'BOTH', 'NEITHER'],
  scoresWhileMoving: ['FALSE', 'TRUE'],
  disrupts: ['FALSE', 'TRUE'],
  autoClimb: ['NOT_ATTEMPTED', 'FAILED', 'SUCCEEDED'],
  feederType: ['CONTINUOUS', 'STOP_TO_SHOOT', 'DUMP'],
  intakeType: ['GROUND', 'OUTPOST', 'BOTH', 'NEITHER'],
} as const satisfies Record<BreakdownName, readonly string[]>;

function breakdownValues(report: AnalysisReport, breakdown: BreakdownName): string[] {
  switch (breakdown) {
    case 'robotRole':
      return report.robotRoles;
    case 'fieldTraversal':
      return [report.fieldTraversal];
    case 'climbResult':
      return [report.endgameClimb];
    case 'beached':
      return [report.beached];
    case 'scoresWhileMoving':
      return [report.scoresWhileMoving ? 'TRUE' : 'FALSE'];
    case 'disrupts':
      return [report.disrupts ? 'TRUE' : 'FALSE'];
    case 'autoClimb':
      return [report.autoClimb];
    case 'feederType':
      return report.feederTypes;
    case 'intakeType':
      return [report.intakeType];
  }
}

const accuracyPercent = [25, 55, 65, 75, 85, 95] as const;
const endgamePoints = { NOT_ATTEMPTED: 0, FAILED: 0, L1: 10, L2: 20, L3: 30 } as const;
const average = (values: number[]) =>
  values.length === 0 ? 0 : values.reduce((total, value) => total + value, 0) / values.length;

function duration(
  report: AnalysisReport,
  activity: 'SCORING' | 'FEEDING' | 'DEFENDING' | 'CAMPING'
) {
  const relevant = report.events
    .filter(({ action }) => action === `START_${activity}` || action === `STOP_${activity}`)
    .sort((left, right) => left.time - right.time);
  let total = 0;
  for (let index = 0; index < relevant.length; index += 2) {
    const start = relevant[index];
    const stop = relevant[index + 1];
    if (start && stop) {
      const elapsed = stop.time - start.time;
      if (elapsed >= 0.5) total += elapsed;
    }
  }
  return total;
}

function reportAccuracy(report: AnalysisReport) {
  return report.accuracy === null ? 100 : (accuracyPercent[report.accuracy] ?? 100);
}

function matchMetric(metric: CategoryMetric, reports: AnalysisReport[]) {
  const perReport = (calculate: (report: AnalysisReport) => number) =>
    average(reports.map(calculate));
  const quantities = (report: AnalysisReport, action: 'STOP_SCORING' | 'STOP_FEEDING') =>
    report.events
      .filter((event) => event.action === action)
      .reduce((total, event) => total + (event.quantity ?? 0), 0);
  switch (metric) {
    case 'driverAbility':
      return perReport((report) => report.driverAbility);
    case 'accuracy': {
      const defined = reports.filter((report) => report.accuracy !== null);
      return average(defined.map((report) => accuracyPercent[report.accuracy!] ?? 0));
    }
    case 'defenseEffectiveness':
      return perReport((report) => report.defenseEffectiveness);
    case 'totalPoints':
      return perReport(
        (report) =>
          report.events
            .filter((event) => event.action === 'STOP_SCORING')
            .reduce((total, event) => total + event.points * (reportAccuracy(report) / 100), 0) +
          (report.autoClimb === 'SUCCEEDED' ? 15 : 0) +
          endgamePoints[report.endgameClimb]
      );
    case 'autoPoints':
    case 'teleopPoints':
      return perReport((report) =>
        report.events
          .filter(
            (event) =>
              event.action === 'STOP_SCORING' &&
              (metric === 'autoPoints' ? event.time <= 23 : event.time > 23)
          )
          .reduce((total, event) => total + event.points * (reportAccuracy(report) / 100), 0)
      );
    case 'fuelPerSecond': {
      const time = reports.reduce((total, report) => total + duration(report, 'SCORING'), 0);
      const fuel = reports.reduce((total, report) => total + quantities(report, 'STOP_SCORING'), 0);
      return time > 0 ? fuel / time : 0;
    }
    case 'feedingRate': {
      const time = average(reports.map((report) => duration(report, 'FEEDING')));
      const fuel = reports.reduce((total, report) => total + quantities(report, 'STOP_FEEDING'), 0);
      return fuel > 0 && time > 0 ? fuel / time : 0;
    }
    case 'timeFeeding':
      return perReport((report) => duration(report, 'FEEDING'));
    case 'contactDefenseTime':
      return perReport((report) => duration(report, 'DEFENDING'));
    case 'campingDefenseTime':
      return perReport((report) => duration(report, 'CAMPING'));
    case 'totalDefenseTime':
      return perReport((report) => duration(report, 'DEFENDING') + duration(report, 'CAMPING'));
    case 'totalFuelOutputted':
      return perReport(
        (report) => quantities(report, 'STOP_SCORING') + quantities(report, 'STOP_FEEDING')
      );
    case 'totalBallsFed':
      return perReport((report) => quantities(report, 'STOP_FEEDING'));
    case 'outpostIntakes':
      return perReport(
        (report) =>
          report.events.filter((event) => event.action === 'INTAKE' && event.position === 'OUTPOST')
            .length
      );
    case 'volleysPerMatch':
      return perReport(
        (report) => report.events.filter((event) => event.action === 'START_SCORING').length
      );
    case 'feedsPerMatch':
      return perReport(
        (report) => report.events.filter((event) => event.action === 'START_FEEDING').length
      );
    case 'autoClimbStartTime': {
      const times = reports.flatMap((report) => {
        if (report.autoClimb !== 'SUCCEEDED') return [];
        const first = report.events
          .filter((event) => event.action === 'CLIMB' && event.time <= 23)
          .sort((left, right) => left.time - right.time)[0]?.time;
        return first === undefined ? [] : [Math.max(23 - first, 0)];
      });
      return times.length > 0 ? average(times) : -1;
    }
    case 'l1StartTime':
    case 'l2StartTime':
    case 'l3StartTime': {
      const required = metric === 'l1StartTime' ? 'L1' : metric === 'l2StartTime' ? 'L2' : 'L3';
      const times = reports.flatMap((report) => {
        if (report.endgameClimb !== required) return [];
        const first = report.events
          .filter((event) => event.action === 'CLIMB' && event.time > 23 && event.time <= 158)
          .sort((left, right) => left.time - right.time)[0]?.time;
        return first === undefined ? [] : [Math.max(158 - first, 0)];
      });
      return times.length > 0 ? average(times) : -1;
    }
  }
}

function aggregate(metric: CategoryMetric, reports: AnalysisReport[]) {
  const byMatch = Map.groupBy(reports, (report) => report.matchKey);
  const byTournament = new Map<string, { date: string | null; values: number[] }>();
  for (const matchReports of byMatch.values()) {
    const first = matchReports[0]!;
    const value = matchMetric(metric, matchReports);
    const tournament = byTournament.get(first.tournamentKey) ?? {
      date: first.tournamentDate,
      values: [],
    };
    tournament.values.push(value);
    byTournament.set(first.tournamentKey, tournament);
  }
  const tournamentAverages = [...byTournament.values()]
    .sort((left, right) => (left.date ?? '').localeCompare(right.date ?? ''))
    .flatMap(({ values }) => {
      const valid = values.filter((value) => value !== -1);
      return valid.length === 0 ? [] : [average(valid)];
    });
  return tournamentAverages.reduce(
    (result, value, index) => (index === 0 ? value : result * 0.2 + value * 0.8),
    0
  );
}

function metricsForReports(reports: AnalysisReport[]) {
  return Object.fromEntries(
    metricNames.map((metric) => [metric, aggregate(metric, reports)])
  ) as CategoryMetrics;
}

const actionNumber = {
  START_SCORING: 0,
  STOP_SCORING: 1,
  START_MATCH: 2,
  START_CAMPING: 3,
  STOP_CAMPING: 4,
  START_DEFENDING: 5,
  STOP_DEFENDING: 6,
  INTAKE: 7,
  OUTTAKE: 8,
  DISRUPT: 9,
  CROSS: 10,
  CLIMB: 11,
  START_FEEDING: 12,
  STOP_FEEDING: 13,
} as const;
const positionNumber = {
  LEFT_TRENCH: 0,
  LEFT_BUMP: 1,
  HUB: 2,
  RIGHT_TRENCH: 3,
  RIGHT_BUMP: 4,
  NEUTRAL_ZONE: 5,
  DEPOT: 6,
  OUTPOST: 7,
  NONE: 8,
} as const;
const roleOrder = ['CYCLING', 'SCORING', 'FEEDING', 'DEFENDING', 'IMMOBILE'] as const;

function autoPaths(reports: AnalysisReport[]) {
  type Position = { location: number; event: number; time: number; quantity?: number };
  const groups: {
    positions: Position[];
    matches: { matchKey: string; tournamentName: string }[];
    score: number[];
    frequency: number;
    maxScore: number;
  }[] = [];
  const sorted = [...reports].sort(
    (left, right) =>
      (right.tournamentDate ?? '').localeCompare(left.tournamentDate ?? '') ||
      (left.matchType === right.matchType ? 0 : left.matchType === 'ELIMINATION' ? -1 : 1) ||
      right.matchNumber - left.matchNumber
  );
  for (const report of sorted) {
    const autoEvents = report.events.filter((event) => event.time <= 23);
    if (autoEvents.length === 0) continue;
    const positions = autoEvents.map((event) => ({
      location: positionNumber[event.position],
      event: actionNumber[event.action],
      time: event.time,
      ...(event.quantity === null ? {} : { quantity: event.quantity }),
    }));
    const score = autoEvents.reduce((total, event) => total + event.points, 0);
    const group = groups.find((candidate) => {
      const shorter =
        positions.length > candidate.positions.length ? candidate.positions : positions;
      const longer =
        positions.length > candidate.positions.length ? positions : candidate.positions;
      return shorter.every(
        (position, index) =>
          longer[index]?.event === position.event && longer[index]?.location === position.location
      );
    });
    if (!group) {
      groups.push({
        positions,
        matches: [{ matchKey: report.matchKey, tournamentName: report.tournamentName }],
        score: [score],
        frequency: 1,
        maxScore: score,
      });
      continue;
    }
    if (positions.length > group.positions.length) group.positions = positions;
    if (!group.matches.some(({ matchKey }) => matchKey === report.matchKey)) {
      group.matches.push({ matchKey: report.matchKey, tournamentName: report.tournamentName });
    }
    group.score.push(score);
    group.frequency += 1;
    group.maxScore = Math.max(group.maxScore, score);
  }
  return groups;
}

function mean(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function standardDeviation(values: number[]) {
  const valueMean = mean(values);
  return Math.sqrt(
    values.reduce((total, value) => total + (value - valueMean) ** 2, 0) / values.length
  );
}

function normalCdf(z: number) {
  if (z < -6.5) return 0;
  if (z > 6.5) return 1;
  let factorial = 1;
  let sum = 0;
  let term = 1;
  let index = 0;
  while (Math.abs(term) > Math.exp(-23)) {
    term =
      (((0.3989422804 * (-1) ** index * z ** index) / (2 * index + 1) / 2 ** index) *
        z ** (index + 1)) /
      factorial;
    sum += term;
    index += 1;
    factorial *= index;
  }
  return sum + 0.5;
}

export function createAnalysisService(repository: AnalysisRepository, tbaClient?: TbaClient) {
  async function teamReports(userId: string, teamNumber: number) {
    const account = await repository.findAccount(userId);
    if (!account) throw new NotFound('Account not found');
    return { account, reports: await repository.listTeamReports(teamNumber, account) };
  }
  async function allianceAnalysis(userId: string, teamNumbers: [number, number, number]) {
    const account = await repository.findAccount(userId);
    if (!account) throw new NotFound('Account not found');
    const reportsByTeam = await Promise.all(
      teamNumbers.map((teamNumber) => repository.listTeamReports(teamNumber, account))
    );
    const teamMetrics = reportsByTeam.map(metricsForReports);
    const teamResults = teamNumbers.map((team, index) => {
      const reports = reportsByTeam[index];
      const counts = Object.fromEntries(roleOrder.map((role) => [role, 0])) as Record<
        (typeof roleOrder)[number],
        number
      >;
      for (const report of reports) {
        for (const role of report.robotRoles) counts[role] += 1;
      }
      const mainRole = roleOrder.reduce((best, role) =>
        counts[role] > counts[best] ? role : best
      );
      return {
        team,
        role: roleOrder.indexOf(mainRole),
        averagePoints: teamMetrics[index].totalPoints,
        paths: autoPaths(reports),
      };
    });
    const climbValues = (metric: 'l1StartTime' | 'l2StartTime' | 'l3StartTime') =>
      teamMetrics.map((metrics) => (metrics[metric] > 0 ? metrics[metric] : null));
    const sum = (metric: 'totalPoints' | 'totalFuelOutputted') =>
      teamMetrics.reduce((total, metrics) => total + metrics[metric], 0);
    return {
      totalPoints: sum('totalPoints'),
      teams: teamResults,
      l1StartTime: climbValues('l1StartTime'),
      l2StartTime: climbValues('l2StartTime'),
      l3StartTime: climbValues('l3StartTime'),
      totalFuelOutputted: sum('totalFuelOutputted'),
      totalBallThroughput: sum('totalFuelOutputted'),
    };
  }
  return {
    async categoryMetrics(userId: string, teamNumber: number) {
      const [account, exists, reportCount] = await Promise.all([
        repository.findAccount(userId),
        repository.teamExists(teamNumber),
        repository.countTeamReports(teamNumber),
      ]);
      if (!account) throw new NotFound('Account not found');
      if (!exists) return { error: 'TEAM_DOES_NOT_EXIST' as const };
      if (reportCount === 0) return { error: 'NO_DATA_FOR_TEAM' as const };
      const reports = await repository.listTeamReports(teamNumber, account);
      return metricsForReports(reports);
    },
    async breakdownMetrics(userId: string, teamNumber: number) {
      const [account, exists, reportCount] = await Promise.all([
        repository.findAccount(userId),
        repository.teamExists(teamNumber),
        repository.countTeamReports(teamNumber),
      ]);
      if (!account) throw new NotFound('Account not found');
      if (!exists) return { error: 'TEAM_DOES_NOT_EXIST' as const };
      if (reportCount === 0) return { error: 'NO_DATA_FOR_TEAM' as const };
      const reports = await repository.listTeamReports(teamNumber, account);
      const result: Partial<Record<BreakdownName, Record<string, number>>> = {};
      for (const breakdown of breakdownNames) {
        const counts = Object.fromEntries(
          breakdownOptions[breakdown].map((option) => [option, 0])
        ) as Record<string, number>;
        let total = 0;
        for (const report of reports) {
          for (const value of breakdownValues(report, breakdown)) {
            counts[value] = (counts[value] ?? 0) + 1;
            total += 1;
          }
        }
        if (total > 0) {
          result[breakdown] = Object.fromEntries(
            Object.entries(counts).map(([value, count]) => [value, count / total])
          );
        }
      }
      return result;
    },
    async breakdownDetails(userId: string, teamNumber: number, breakdown: BreakdownName) {
      const { account, reports } = await teamReports(userId, teamNumber);
      return [...reports]
        .sort(
          (left, right) =>
            (right.tournamentDate ?? '').localeCompare(left.tournamentDate ?? '') ||
            (left.matchType === right.matchType ? 0 : left.matchType === 'ELIMINATION' ? -1 : 1) ||
            right.matchNumber - left.matchNumber
        )
        .flatMap((report) =>
          breakdownValues(report, breakdown).map((value) => ({
            key: report.matchKey,
            tournamentName: report.tournamentName,
            breakdown: value,
            sourceTeam: report.sourceTeamNumber,
            ...(account.teamNumber === report.sourceTeamNumber && report.scouterName !== null
              ? { scouter: report.scouterName }
              : {}),
          }))
        );
    },
    async flags(userId: string, teamNumber: number, flags: string[], tournamentKey?: string) {
      const { reports } = await teamReports(userId, teamNumber);
      const metrics = metricsForReports(reports);
      const values: (number | null)[] = [];
      for (const flag of flags) {
        if (flag === 'rank') {
          if (!tournamentKey || !tbaClient) {
            values.push(0);
            continue;
          }
          try {
            const status = await tbaClient.getTeamEventStatus(tournamentKey, teamNumber);
            values.push(status.rank ?? 0);
          } catch {
            values.push(0);
          }
        } else {
          values.push(
            metricNames.includes(flag as CategoryMetric) ? metrics[flag as CategoryMetric] : null
          );
        }
      }
      return values;
    },
    async metricDetails(userId: string, teamNumber: number, requestedMetric: string) {
      const { account, reports } = await teamReports(userId, teamNumber);
      if (requestedMetric === 'autoPoints') return { paths: autoPaths(reports) };
      const alias =
        requestedMetric === 'scoringRate'
          ? 'fuelPerSecond'
          : requestedMetric === 'totalBallThroughput' || requestedMetric === 'totalBallThroughPut'
            ? 'totalFuelOutputted'
            : requestedMetric;
      const metric = alias as CategoryMetric;
      const allReports = await repository.listAllReports(account);
      const byMatch = Map.groupBy(reports, (report) => report.matchKey);
      const array = [...byMatch.values()].map((matchReports) => ({
        match: matchReports[0]!.matchKey,
        dataPoint: matchMetric(metric, matchReports),
        tournamentName: matchReports[0]!.tournamentName,
      }));
      const result = aggregate(metric, reports);
      const all = aggregate(metric, allReports);
      return { array, result, all, difference: result - all, team: teamNumber };
    },
    async alliance(userId: string, teamNumbers: [number, number, number]) {
      return allianceAnalysis(userId, teamNumbers);
    },
    async matchPrediction(
      userId: string,
      red: [number, number, number],
      blue: [number, number, number]
    ) {
      const account = await repository.findAccount(userId);
      if (!account) throw new NotFound('Account not found');
      const teams = [...red, ...blue];
      const reports = await Promise.all(
        teams.map((teamNumber) => repository.listTeamReports(teamNumber, account))
      );
      const points = reports.map((teamReports) =>
        [...Map.groupBy(teamReports, (report) => report.matchKey).values()].map((matchReports) =>
          matchMetric('totalPoints', matchReports)
        )
      );
      if (points.some((values) => values.length <= 1)) return { error: 'not enough data' as const };
      const allianceStats = (offset: number) => ({
        mean: mean(points[offset]) + mean(points[offset + 1]) + mean(points[offset + 2]),
        deviation: Math.sqrt(
          standardDeviation(points[offset]) ** 2 +
            standardDeviation(points[offset + 1]) ** 2 +
            standardDeviation(points[offset + 2]) ** 2
        ),
      });
      const redStats = allianceStats(0);
      const blueStats = allianceStats(3);
      const differentialDeviation = Math.sqrt(redStats.deviation ** 2 + blueStats.deviation ** 2);
      const redWinning = 1 - normalCdf((blueStats.mean - redStats.mean) / differentialDeviation);
      const blueWinning = 1 - redWinning;
      const [redAlliance, blueAlliance] = await Promise.all([
        allianceAnalysis(userId, red),
        allianceAnalysis(userId, blue),
      ]);
      return {
        red1: red[0],
        red2: red[1],
        red3: red[2],
        blue1: blue[0],
        blue2: blue[1],
        blue3: blue[2],
        redWinning,
        blueWinning,
        winningAlliance: redWinning >= blueWinning ? 0 : 1,
        redAlliance,
        blueAlliance,
      };
    },
  };
}

export type AnalysisService = ReturnType<typeof createAnalysisService>;
