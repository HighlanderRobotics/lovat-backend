export type ComputationOp =
  | 'eventSum'
  | 'eventCount'
  | 'pairedDuration'
  | 'points'
  | 'rate'
  | 'reportAvg'
  | 'reportMode'
  | 'reportRatio'
  | 'valueMap'
  | 'climbTime';

export type Metric = {
  id: string;
  name: string;
  description?: string;
  type: MetricType;
  unit?: string;
  category: MetricCategory;
  year: number;
  op: ComputationOp;
  event?: string[];
  report?: string;
  config?: MetricConfig;
};

export type MetricConfig = {
  useQuantity?: boolean;
  position?: string;
  pairedAction?: string;
  dualPaired?: string[];
  valueMap?: Record<number, number>;
  pointBonuses?: {
    includeAutoClimb?: boolean;
    includeEndgameClimb?: boolean;
    applyAccuracy?: boolean;
  };
  climbLevel?: 'auto' | 'L1' | 'L2' | 'L3';
  trueValues?: string[];
  excludeValues?: string[];
};

export type MetricType = 'NUMBER' | 'TIME' | 'ENUM' | 'BOOLEAN';

export type MetricCategory =
  | 'AUTONOMOUS'
  | 'TELEOP'
  | 'ENDGAME'
  | 'SCORING'
  | 'FEEDING'
  | 'DEFENSE'
  | 'DRIVER'
  | 'OTHER';
