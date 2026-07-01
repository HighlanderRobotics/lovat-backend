import { db } from '../database/drizzle/client';
import { scoutReports } from '../database/drizzle/schema';
import { AnalysisContext, AnalysisScope } from './types';
import { Metric } from './types/metric';
import { eq } from 'drizzle-orm';

export type MetricResult = {
  id: string;
  value: number | string | boolean | null;
};

const AUTO_END = 15;
const ENDGAME_CUTOFF = 158;
const MIN_DURATION = 0.5;

const ACCURACY_PCT: Record<number, number> = {
  0: 25, 1: 55, 2: 65, 3: 75, 4: 85, 5: 95,
};
const ENDGAME_PTS: Record<string, number> = {
  L1: 10, L2: 20, L3: 30,
};

// ---- engine entry point ----

export const calculate = async (
  ctx: AnalysisContext,
  scope: AnalysisScope,
  metrics: Metric[],
): Promise<MetricResult[]> => {
  const reports = await getReports(ctx, scope);

  return metrics.map((metric) => ({
    id: metric.id,
    value: dispatch(reports, metric),
  }));
};

function dispatch(
  reports: any[],
  metric: Metric,
): number | string | boolean | null {
  switch (metric.op) {
    case 'eventSum':
      return eventSum(reports, metric);
    case 'eventCount':
      return eventCount(reports, metric);
    case 'pairedDuration':
      return pairedDurationOp(reports, metric);
    case 'points':
      return pointsOp(reports, metric);
    case 'rate':
      return rateOp(reports, metric);
    case 'reportAvg':
      return reportAvg(reports, metric);
    case 'reportMode':
      return reportMode(reports, metric);
    case 'reportRatio':
      return reportRatio(reports, metric);
    case 'valueMap':
      return valueMapOp(reports, metric);
    case 'climbTime':
      return climbTimeOp(reports, metric);
  }
}

// ---- helpers ----

function avg(nums: number[]): number {
  return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function perReport(reports: any[], fn: (r: any) => number | null): number | null {
  const vals = reports.map(fn).filter((v): v is number => v !== null);
  return vals.length > 0 ? avg(vals) : null;
}

function filterEvents(events: any[], actions: string[], metric: Metric): any[] {
  return events.filter((e: any) => {
    if (!actions.includes(e.action)) return false;
    if (metric.config?.position && e.position !== metric.config.position) return false;
    if (metric.category === 'AUTONOMOUS' && e.time >= AUTO_END) return false;
    if (metric.category === 'TELEOP' && e.time < AUTO_END) return false;
    return true;
  });
}

function pairedDuration(events: any[], label: string): number {
  const sorted = events
    .filter((e: any) => e.action === `START_${label}` || e.action === `STOP_${label}`)
    .sort((a: any, b: any) => a.time - b.time);

  let total = 0;
  for (let i = 0; i < sorted.length - 1; i += 2) {
    const d = sorted[i + 1].time - sorted[i].time;
    if (d >= MIN_DURATION) total += d;
  }
  return total;
}

// ---- op handlers ----

function eventSum(reports: any[], metric: Metric): number | null {
  return perReport(reports, (r) => {
    const evts = filterEvents(r.events ?? [], metric.event!, metric);
    return evts.reduce(
      (s: number, e: any) => s + (metric.config?.useQuantity ? (e.quantity ?? 0) : (e.points ?? 0)),
      0,
    );
  });
}

function eventCount(reports: any[], metric: Metric): number | null {
  return perReport(reports, (r) => filterEvents(r.events ?? [], metric.event!, metric).length);
}

function pairedDurationOp(reports: any[], metric: Metric): number | null {
  if (metric.config?.dualPaired) {
    return perReport(reports, (r) =>
      metric.config!.dualPaired!.reduce((sum, label) => sum + pairedDuration(r.events ?? [], label), 0),
    );
  }
  return perReport(reports, (r) => pairedDuration(r.events ?? [], metric.config!.pairedAction!));
}

function pointsOp(reports: any[], metric: Metric): number | null {
  return perReport(reports, (r) => {
    const events = r.events ?? [];

    const auto = events
      .filter((e: any) => e.action === 'STOP_SCORING' && e.time <= AUTO_END)
      .reduce((a: number, b: any) => a + b.points, 0);
    const tele = events
      .filter((e: any) => e.action === 'STOP_SCORING' && e.time > AUTO_END)
      .reduce((a: number, b: any) => a + b.points, 0);

    let total = 0;
    if (metric.category === 'AUTONOMOUS') total = auto;
    else if (metric.category === 'TELEOP') total = tele;
    else total = auto + tele;

    const accPct =
      metric.config?.pointBonuses?.applyAccuracy && r.accuracy !== null && r.accuracy !== undefined
        ? (ACCURACY_PCT[r.accuracy as number] ?? 100) / 100
        : 1;

    const aClimb =
      metric.config?.pointBonuses?.includeAutoClimb && r.autoClimb === 'SUCCEEDED' ? 15 : 0;

    const endgame =
      metric.config?.pointBonuses?.includeEndgameClimb
        ? (ENDGAME_PTS[r.endgameClimb as string] ?? 0)
        : 0;

    return total * accPct + aClimb + endgame;
  });
}

function rateOp(reports: any[], metric: Metric): number | null {
  return perReport(reports, (r) => {
    const d = pairedDuration(r.events ?? [], metric.config!.pairedAction!);
    if (d <= 0) return 0;
    const stopAction = `STOP_${metric.config!.pairedAction}`;
    const value = metric.config?.useQuantity
      ? (r.events ?? []).filter((e: any) => e.action === stopAction).reduce((s: number, e: any) => s + (e.quantity ?? 0), 0)
      : (r.events ?? []).filter((e: any) => e.action === stopAction).length;
    return value / d;
  });
}

function reportAvg(reports: any[], metric: Metric): number | null {
  const vals = reports
    .map((r) => r[metric.report!] as number)
    .filter((v): v is number => v !== null && v !== undefined);
  return vals.length > 0 ? avg(vals) : null;
}

function reportMode(reports: any[], metric: Metric): string | null {
  const vals = reports.flatMap((r) => {
    const v = r[metric.report!];
    return Array.isArray(v) ? v.filter(Boolean) : v ? [v] : [];
  });
  if (vals.length === 0) return null;
  const freq = new Map<string, number>();
  vals.forEach((v) => freq.set(String(v), (freq.get(String(v)) ?? 0) + 1));
  return [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function reportRatio(reports: any[], metric: Metric): number | null {
  const vals = reports
    .map((r) => r[metric.report!])
    .filter((v) => v !== null && v !== undefined);
  if (vals.length === 0) return null;

  const excluded = new Set(metric.config?.excludeValues ?? []);
  const population = vals.filter((v) => !excluded.has(v));
  if (population.length === 0) return null;

  if (metric.config?.trueValues) {
    const trues = population.filter((v) => metric.config!.trueValues!.includes(v));
    return trues.length / population.length;
  }
  const trues = population.filter(Boolean);
  return trues.length / population.length;
}

function valueMapOp(reports: any[], metric: Metric): number | null {
  const vals = reports
    .map((r) => {
      const raw = r[metric.report!] as number;
      return raw !== null && raw !== undefined ? metric.config!.valueMap![raw] : undefined;
    })
    .filter((v): v is number => v !== undefined);
  return vals.length > 0 ? avg(vals) : null;
}

function climbTimeOp(reports: any[], metric: Metric): number | null {
  const level = metric.config?.climbLevel;
  const times = reports.map((r) => {
    if (level === 'auto') {
      if (r.autoClimb !== 'SUCCEEDED') return null;
      const evt = (r.events ?? [])
        .filter((e: any) => e.action === 'CLIMB' && e.time <= AUTO_END)
        .sort((a: any, b: any) => a.time - b.time)[0];
      return evt ? Math.max(AUTO_END - evt.time, 0) : null;
    }
    if (r.endgameClimb !== level) return null;
    const evt = (r.events ?? [])
      .filter((e: any) => e.action === 'CLIMB' && e.time > AUTO_END && e.time <= ENDGAME_CUTOFF)
      .sort((a: any, b: any) => a.time - b.time)[0];
    return evt ? Math.max(ENDGAME_CUTOFF - evt.time, 0) : null;
  });
  const valid = times.filter((t): t is number => t !== null);
  return valid.length > 0 ? avg(valid) : -1;
}

// ---- data fetching ----

async function getReports(ctx: AnalysisContext, scope: AnalysisScope) {
  switch (scope) {
    case 'REPORT':
      return db.query.scoutReports.findMany({
        with: { events: true, teamMatch: true },
        where: eq(scoutReports.uuid, ctx.scope.report!),
      });

    case 'TEAM': {
      const reports = await db.query.scoutReports.findMany({
        with: { events: true, teamMatch: true },
      });
      return reports.filter(
        (r) => (r as any).teamMatch?.teamNumber === ctx.scope.team,
      );
    }

    case 'TOURNAMENT': {
      const reports = await db.query.scoutReports.findMany({
        with: { events: true, teamMatch: true },
      });
      return reports.filter(
        (r) => (r as any).teamMatch?.tournamentKey === ctx.scope.tournament,
      );
    }

    case 'ALL':
      return db.query.scoutReports.findMany({
        with: { events: true, teamMatch: true },
      });

    default:
      throw new Error(`Invalid scope: ${scope}`);
  }
}
