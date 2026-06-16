import { db } from '../../database/drizzle/client';
import { AnalysisContext, AnalysisScope } from '../types';

export const calculate = (ctx: AnalysisContext, scope: AnalysisScope, metrics: Metrics[]) => {
  // Get all reports in the specified scope
  const reports = [];

  await db.query.scoutReports.findMany({
};
