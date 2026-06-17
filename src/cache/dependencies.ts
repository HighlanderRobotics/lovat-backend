export const deps = {
  team: (teamNumber: number) => `team:${teamNumber}`,

  tournament: (key: string) => `tournament:${key}`,

  user: (id: string) => `user:${id}`,
};
