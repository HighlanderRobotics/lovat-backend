import { NotFound } from '../../platform/http/errors';
import type { AnalysisReport, AnalysisRepository } from './analysis.repository';

const metricNames = [
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

export function createAnalysisService(repository: AnalysisRepository) {
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
      return Object.fromEntries(
        metricNames.map((metric) => [metric, aggregate(metric, reports)])
      ) as CategoryMetrics;
    },
  };
}

export type AnalysisService = ReturnType<typeof createAnalysisService>;
