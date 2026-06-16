export type SourceRule<T> = {
  mode: 'INCLUDE' | 'EXCLUDE';
  items: T[];
};

export type AnalysisContext = {
  user: {
    id: string;
    teamSource: SourceRule<number>;
    tournamentSource: SourceRule<string>;
  };
};
