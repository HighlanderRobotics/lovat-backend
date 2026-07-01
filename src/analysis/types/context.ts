export type SourceRule<T> = {
  mode: 'INCLUDE' | 'EXCLUDE';
  items: T[];
};

export type AnalysisContext = {
  user: {
    id: string;
    team: number;
    tournament: string;
    teamSource: SourceRule<number>;
    tournamentSource: SourceRule<string>;
  };
  scope: AnalysisScope;
};

export type AnalysisScope = {
  report?: string;
  match?: string;
  team?: number;
  tournament?: string;
  all?: boolean;
};
