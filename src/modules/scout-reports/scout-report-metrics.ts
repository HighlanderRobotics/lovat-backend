import type { ScoutEvent, ScoutReport } from './scout-reports.repository';

export type ReportWithEvents = ScoutReport & { events: ScoutEvent[] };

const endgamePoints = { NOT_ATTEMPTED: 0, FAILED: 0, L1: 10, L2: 20, L3: 30 } as const;

function firstEventTime(
  events: ScoutEvent[],
  action: ScoutEvent['action'],
  predicate?: (time: number) => boolean
) {
  return events
    .filter((event) => event.action === action && (!predicate || predicate(event.time)))
    .sort((left, right) => left.time - right.time)[0]?.time;
}

export function pairedDuration(
  events: ScoutEvent[],
  start: ScoutEvent['action'],
  stop: ScoutEvent['action'],
  minimum = 0
) {
  const relevant = events
    .filter(({ action }) => action === start || action === stop)
    .sort((left, right) => left.time - right.time);
  let total = 0;
  for (let index = 0; index < relevant.length; index += 2) {
    if (relevant[index]?.action === start && relevant[index + 1]?.action === stop) {
      const duration = relevant[index + 1].time - relevant[index].time;
      if (duration >= minimum) total += duration;
    }
  }
  return total;
}

export function calculateScoutReportMetrics(report: ReportWithEvents) {
  const scoringStops = report.events.filter(({ action }) => action === 'STOP_SCORING');
  const firstScoringStop = [...scoringStops].sort((a, b) => a.time - b.time)[0]?.time;
  const scoringDuration = firstScoringStop ? firstScoringStop - (report.events[0]?.time ?? 0) : 150;
  const feedingTime = pairedDuration(report.events, 'START_FEEDING', 'STOP_FEEDING', 0.5);
  const totalBallsFed = report.events
    .filter(({ action }) => action === 'STOP_FEEDING')
    .reduce((total, event) => total + (event.quantity ?? 0), 0);
  const contactDefenseTime = pairedDuration(report.events, 'START_DEFENDING', 'STOP_DEFENDING');
  const campingDefenseTime = pairedDuration(report.events, 'START_CAMPING', 'STOP_CAMPING');
  const autoClimbEventTime = firstEventTime(report.events, 'CLIMB', (time) => time <= 23);
  const climbEventTime = firstEventTime(report.events, 'CLIMB', (time) => time > 23);
  const eventPoints = report.events.reduce((total, event) => total + event.points, 0);
  return {
    totalPoints: endgamePoints[report.endgameClimb] + eventPoints,
    autoPoints:
      report.events
        .filter(({ time }) => time <= 23)
        .reduce((total, event) => total + event.points, 0) +
      (report.autoClimb === 'SUCCEEDED' ? 10 : 0),
    teleopPoints: report.events
      .filter(({ time }) => time > 23)
      .reduce((total, event) => total + event.points, 0),
    autoClimbStartTime: autoClimbEventTime === undefined ? undefined : 153 - autoClimbEventTime,
    climbStartTime: climbEventTime === undefined ? undefined : 153 - climbEventTime,
    contactDefenseTime,
    campingDefenseTime,
    totalDefenseTime: contactDefenseTime + campingDefenseTime,
    scoringRate:
      scoringDuration > 0
        ? scoringStops.reduce((total, event) => total + (event.quantity ?? 0), 0) / scoringDuration
        : 0,
    feedingRate: feedingTime > 0 ? totalBallsFed / feedingTime : 0,
    feeds: report.events.filter(({ action }) => action === 'STOP_FEEDING').length,
    volleys: report.events.filter(({ action }) => action === 'START_SCORING').length,
    totalBallsFed,
    totalFuelOutputted: report.events
      .filter(({ action }) => action === 'STOP_FEEDING' || action === 'STOP_SCORING')
      .reduce((total, event) => total + (event.quantity ?? 0), 0),
  };
}
