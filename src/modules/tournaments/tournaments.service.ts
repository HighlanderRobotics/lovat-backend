import { BadRequest, Forbidden, NotFound } from '../../platform/http/errors';
import { createHash } from 'node:crypto';
import type {
  MatchReportRow,
  ShiftWrite,
  TournamentListOptions,
  TournamentsRepository,
} from './tournaments.repository';

type MatchTeam = {
  number: number;
  scouters: { name: string | null; scouted: boolean }[];
  externalReports: number;
};

function parseTeamFilter(value?: string) {
  if (value === undefined) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || !parsed.every((team) => Number.isInteger(team) && team > 0))
      throw new Error();
    if (parsed.length > 6) throw new BadRequest('Too many team filters');
    return parsed as number[];
  } catch (error) {
    if (error instanceof BadRequest) throw error;
    throw new BadRequest('Teams must be a JSON array of team numbers');
  }
}

function groupMatchRows(
  rows: MatchReportRow[],
  account: { teamNumber: number; teamSourceRule: { mode: 'INCLUDE' | 'EXCLUDE'; items: number[] } },
  shifts: Awaited<ReturnType<TournamentsRepository['listScouterShifts']>>,
  teamFilter?: number[]
) {
  const sourceItems = new Set(account.teamSourceRule.items);
  if (account.teamSourceRule.mode === 'EXCLUDE') sourceItems.delete(account.teamNumber);
  else sourceItems.add(account.teamNumber);
  const allowed = (source: number) =>
    account.teamSourceRule.mode === 'INCLUDE' ? sourceItems.has(source) : !sourceItems.has(source);
  const matches = new Map<string, Map<number, MatchReportRow[]>>();
  for (const row of rows) {
    const key = `${row.matchType}:${row.matchNumber}`;
    const station = Number(row.key.at(-1));
    if (!Number.isInteger(station) || station < 0 || station > 5) continue;
    const teams = matches.get(key) ?? new Map<number, MatchReportRow[]>();
    const stationRows = teams.get(station) ?? [];
    stationRows.push(row);
    teams.set(station, stationRows);
    matches.set(key, teams);
  }
  const lastQualification = Math.max(
    0,
    ...rows
      .filter(({ matchType }) => matchType === 'QUALIFICATION')
      .map(({ matchNumber }) => matchNumber)
  );
  const lastFinished = Math.max(
    0,
    ...rows
      .filter(({ matchType, reportUuid }) => matchType === 'QUALIFICATION' && reportUuid !== null)
      .map(({ matchNumber }) => matchNumber)
  );
  return [...matches.entries()]
    .map(([key, stations]) => {
      const [type, numberText] = key.split(':');
      const matchNumber = Number(numberText);
      const ordinal = type === 'QUALIFICATION' ? matchNumber : lastQualification + matchNumber;
      const shift = shifts.find(
        ({ startMatchOrdinalNumber, endMatchOrdinalNumber }) =>
          ordinal >= startMatchOrdinalNumber && ordinal <= endMatchOrdinalNumber
      );
      const teams = Array.from({ length: 6 }, (_, station): MatchTeam | null => {
        const stationRows = stations.get(station);
        if (!stationRows?.length) return null;
        const reports = stationRows.filter(({ reportUuid }) => reportUuid !== null);
        const valid = reports.filter(
          ({ reportSourceTeamNumber }) =>
            reportSourceTeamNumber !== null && allowed(reportSourceTeamNumber)
        );
        const own = reports.filter(
          ({ reportSourceTeamNumber }) => reportSourceTeamNumber === account.teamNumber
        );
        const scouters = own.map(({ reportScouterName }) => ({
          name: reportScouterName,
          scouted: true,
        }));
        const assignedScouters = shift
          ? [shift.team1, shift.team2, shift.team3, shift.team4, shift.team5, shift.team6][station]
          : [];
        for (const assigned of assignedScouters) {
          if (!own.some(({ reportScouterUuid }) => reportScouterUuid === assigned.uuid))
            scouters.push({ name: assigned.name, scouted: false });
        }
        return {
          number: stationRows[0].teamNumber,
          scouters,
          externalReports: valid.length - own.length,
        };
      });
      if (teams.some((team) => team === null)) return null;
      const concrete = teams as MatchTeam[];
      if (teamFilter?.some((required) => !concrete.some(({ number }) => number === required)))
        return null;
      return {
        matchNumber,
        matchType: type === 'QUALIFICATION' ? (0 as const) : (1 as const),
        scouted: concrete.some((_, station) =>
          (stations.get(station) ?? []).some(
            ({ reportSourceTeamNumber }) =>
              reportSourceTeamNumber !== null && allowed(reportSourceTeamNumber)
          )
        ),
        finished: type === 'QUALIFICATION' && matchNumber <= lastFinished,
        team1: concrete[0],
        team2: concrete[1],
        team3: concrete[2],
        team4: concrete[3],
        team5: concrete[4],
        team6: concrete[5],
      };
    })
    .filter((match): match is NonNullable<typeof match> => match !== null)
    .sort(
      (left, right) => left.matchType - right.matchType || left.matchNumber - right.matchNumber
    );
}

type ListOptions = Pick<TournamentListOptions, 'filter' | 'limit' | 'offset'>;

export function createTournamentsService(repository: TournamentsRepository) {
  async function scheduleAccount(userId: string, requireLead = false) {
    const account = await repository.findScheduleAccount(userId);
    if (!account || account.teamNumber === null || account.emailVerified !== true)
      throw new Forbidden('A verified team is required');
    if (requireLead && account.role !== 'SCOUTING_LEAD')
      throw new Forbidden('Only scouting leads can change schedules');
    return account.teamNumber;
  }
  async function validateShift(
    teamNumber: number,
    key: string,
    input: ShiftWrite,
    excludeUuid?: string
  ) {
    const ids = [
      ...input.team1,
      ...input.team2,
      ...input.team3,
      ...input.team4,
      ...input.team5,
      ...input.team6,
    ];
    if (new Set(ids).size !== ids.length)
      throw new BadRequest('A scouter may only appear once in a shift');
    const active = await repository.findActiveScouterIds(teamNumber, ids);
    if (active.length !== ids.length)
      throw new BadRequest('Every assigned scouter must be active and on your team');
    if (
      await repository.hasOverlappingShift(
        teamNumber,
        key,
        input.startMatchOrdinalNumber,
        input.endMatchOrdinalNumber,
        excludeUuid
      )
    )
      throw new BadRequest('Shift overlaps an existing shift');
  }
  return {
    async list(userId: string, options: ListOptions) {
      const teamNumber = await repository.findUserTeamNumber(userId);
      if (teamNumber === undefined) throw new NotFound('Account not found');
      return repository.list({ ...options, teamNumber });
    },

    async listTeams(key: string) {
      if (!(await repository.exists(key))) throw new NotFound('Tournament not found');
      return repository.listTeams(key);
    },

    async checkMatch(input: {
      tournamentKey: string;
      teamNumber: number;
      matchNumber: number;
      isElim: boolean;
    }) {
      const match = await repository.findTeamMatch({
        ...input,
        matchType: input.isElim ? 'ELIMINATION' : 'QUALIFICATION',
      });
      if (!match) throw new NotFound('Match not found');
      return {
        match,
        alliance: Number(match.key.at(-1)) < 3 ? ('red' as const) : ('blue' as const),
      };
    },

    async listMatches(userId: string, key: string, teams?: string) {
      if (!(await repository.exists(key))) throw new NotFound('Tournament not found');
      const account = await repository.findScheduleAccount(userId);
      if (!account || account.teamNumber === null || account.emailVerified !== true)
        throw new Forbidden('A verified team is required');
      const [rows, shifts] = await Promise.all([
        repository.listMatchReportRows(key),
        repository.listScouterShifts(account.teamNumber, key),
      ]);
      return groupMatchRows(
        rows,
        { teamNumber: account.teamNumber, teamSourceRule: account.teamSourceRule },
        shifts,
        parseTeamFilter(teams)
      );
    },

    async getPublicScouterSchedule(code: string, key: string) {
      const teamNumber = await repository.findTeamNumberByCode(code);
      if (teamNumber === null) throw new NotFound('Team code not found');
      if (!(await repository.exists(key))) throw new NotFound('Tournament not found');
      const [rows, shifts] = await Promise.all([
        repository.listMatchReportRows(key),
        repository.listScouterShifts(teamNumber, key),
      ]);
      const highestQualification = Math.max(
        0,
        ...rows
          .filter(({ matchType }) => matchType === 'QUALIFICATION')
          .map(({ matchNumber }) => matchNumber)
      );
      if (highestQualification === 0) throw new BadRequest('Matches are not available');
      const data: {
        matchType: 0 | 1;
        matchNumber: number;
        scouters: Record<string, { team: number; alliance: 'red' | 'blue' }>;
      }[] = [];
      for (const shift of shifts) {
        for (
          let ordinal = shift.startMatchOrdinalNumber;
          ordinal <= shift.endMatchOrdinalNumber;
          ordinal += 1
        ) {
          const matchType = ordinal > highestQualification ? (1 as const) : (0 as const);
          const matchNumber = matchType === 1 ? ordinal - highestQualification : ordinal;
          const databaseType = matchType === 1 ? 'ELIMINATION' : 'QUALIFICATION';
          const matchRows = rows.filter(
            (row) => row.matchType === databaseType && row.matchNumber === matchNumber
          );
          const stations = new Map<number, MatchReportRow>();
          for (const row of matchRows) stations.set(Number(row.key.at(-1)), row);
          if (stations.size === 0) continue;
          if (stations.size !== 6) throw new BadRequest('Match has not imported correctly');
          const assignments = [
            shift.team1,
            shift.team2,
            shift.team3,
            shift.team4,
            shift.team5,
            shift.team6,
          ];
          const scouterMap: Record<string, { team: number; alliance: 'red' | 'blue' }> = {};
          for (let station = 0; station < 6; station += 1) {
            for (const scouter of assignments[station]) {
              scouterMap[scouter.uuid] = {
                team: stations.get(station)!.teamNumber,
                alliance: station < 3 ? 'red' : 'blue',
              };
            }
          }
          data.push({ matchType, matchNumber, scouters: scouterMap });
        }
      }
      return {
        hash: createHash('sha256').update(JSON.stringify(shifts)).digest('hex'),
        data,
      };
    },

    async getScouterSchedule(userId: string, key: string) {
      if (!(await repository.exists(key))) throw new NotFound('Tournament not found');
      const teamNumber = await repository.findVerifiedUserTeamNumber(userId);
      if (teamNumber === null) throw new Forbidden('A verified team is required');
      const data = await repository.listScouterShifts(teamNumber, key);
      return {
        hash: createHash('sha256').update(JSON.stringify(data)).digest('hex'),
        data,
      };
    },
    async createScouterShift(userId: string, key: string, input: ShiftWrite) {
      if (!(await repository.exists(key))) throw new NotFound('Tournament not found');
      const teamNumber = await scheduleAccount(userId, true);
      await validateShift(teamNumber, key, input);
      return { uuid: await repository.createShift(teamNumber, key, input) };
    },
    async updateScouterShift(userId: string, key: string, uuid: string, input: ShiftWrite) {
      const teamNumber = await scheduleAccount(userId, true);
      const shift = await repository.findShift(uuid);
      if (!shift || shift.tournamentKey !== key) throw new NotFound('Scouter shift not found');
      if (shift.sourceTeamNumber !== teamNumber)
        throw new Forbidden('Scouter shift belongs to another team');
      await validateShift(teamNumber, key, input, uuid);
      if (!(await repository.updateShift(uuid, input)))
        throw new NotFound('Scouter shift not found');
    },
    async deleteScouterShift(userId: string, key: string, uuid: string) {
      const teamNumber = await scheduleAccount(userId, true);
      const shift = await repository.findShift(uuid);
      if (!shift || shift.tournamentKey !== key) throw new NotFound('Scouter shift not found');
      if (shift.sourceTeamNumber !== teamNumber)
        throw new Forbidden('Scouter shift belongs to another team');
      if (!(await repository.deleteShift(uuid))) throw new NotFound('Scouter shift not found');
    },
  };
}

export type TournamentsService = ReturnType<typeof createTournamentsService>;
