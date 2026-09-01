import { BadRequest, Forbidden, NotFound } from '../../platform/http/errors';
import type { ScoutReportsRepository } from './scout-reports.repository';

const actions = [
  'START_SCORING',
  'STOP_SCORING',
  'START_MATCH',
  'START_CAMPING',
  'STOP_CAMPING',
  'START_DEFENDING',
  'STOP_DEFENDING',
  'INTAKE',
  'OUTTAKE',
  'DISRUPT',
  'CROSS',
  'CLIMB',
  'START_FEEDING',
  'STOP_FEEDING',
] as const;
const positions = [
  'LEFT_TRENCH',
  'LEFT_BUMP',
  'HUB',
  'RIGHT_TRENCH',
  'RIGHT_BUMP',
  'NEUTRAL_ZONE',
  'DEPOT',
  'OUTPOST',
  'NONE',
] as const;
const malformedTimelineVersions = new Set(['26.0.3', '26.0.4']);

type CreateInput = {
  uuid: string;
  tournamentKey: string;
  matchType: 'QUALIFICATION' | 'ELIMINATION';
  matchNumber: number;
  startTime: number;
  notes: string;
  robotRoles: ('CYCLING' | 'SCORING' | 'FEEDING' | 'DEFENDING' | 'IMMOBILE')[];
  mobility: 'TRENCH' | 'BUMP' | 'BOTH' | 'NONE';
  climbPosition?: 'SIDE' | 'MIDDLE' | null;
  climbSide?: 'FRONT' | 'BACK' | null;
  beached: 'ON_FUEL' | 'ON_BUMP' | 'BOTH' | 'NEITHER';
  feederTypes: ('CONTINUOUS' | 'STOP_TO_SHOOT' | 'DUMP')[];
  intakeType: 'GROUND' | 'OUTPOST' | 'BOTH' | 'NEITHER';
  robotBrokeDescription?: string | null;
  driverAbility: number;
  accuracy?: number | null;
  disrupts: boolean;
  defenseEffectiveness: number;
  scoresWhileMoving: boolean;
  autoClimb: 'NOT_ATTEMPTED' | 'FAILED' | 'SUCCEEDED';
  endgameClimb: 'NOT_ATTEMPTED' | 'FAILED' | 'L1' | 'L2' | 'L3';
  scouterUuid: string;
  teamNumber: number;
  appVersion?: string;
  events: number[][];
};

function normalizeEvents(input: CreateInput) {
  const filtered = malformedTimelineVersions.has(input.appVersion ?? '')
    ? input.events.filter((event, index, all) => {
        const action = actions[event[1]];
        if (!action?.startsWith('START_') || action === 'START_MATCH') return true;
        return actions[all[index + 1]?.[1]] === action.replace('START_', 'STOP_');
      })
    : input.events;
  let active: string | null = null;
  const errors: string[] = [];
  for (const event of filtered) {
    const action = actions[event[1]];
    const position = positions[event[2]];
    if (!action || !position) throw new BadRequest('Invalid event action or position');
    const [kind, name] = action.split('_');
    if (kind === 'START' && name !== 'MATCH') {
      if (active !== null)
        errors.push(`Invalid input. Cannot start ${name} event while in ${active} event.`);
      else active = name;
    } else if (kind === 'STOP') {
      if (active === null)
        errors.push(`Invalid input. Cannot stop ${name} event while not in any event.`);
      else if (active !== name)
        errors.push(`Invalid input. Cannot stop ${name} event while in ${active} event.`);
      else active = null;
    }
  }
  if (active !== null) errors.push(`Invalid input. Missing stop event for ${active} event.`);
  if (errors.length > 0) throw new BadRequest(errors.join(' '));
  return filtered.map((event) => {
    const action = actions[event[1]]!;
    const quantity = action === 'STOP_SCORING' || action === 'STOP_FEEDING' ? (event[3] ?? 0) : 0;
    return {
      time: event[0],
      action,
      position: positions[event[2]]!,
      points: action === 'STOP_SCORING' ? (event[3] ?? 0) : 0,
      quantity,
    };
  });
}

export function createScoutReportsService(repository: ScoutReportsRepository) {
  async function account(userId: string) {
    const row = await repository.findAccount(userId);
    if (!row) throw new NotFound('Account not found');
    return row;
  }
  async function report(uuid: string) {
    const row = await repository.findReport(uuid);
    if (!row) throw new NotFound('Scout report not found');
    return row;
  }
  async function modifiable(userId: string, uuid: string) {
    const [user, row] = await Promise.all([account(userId), report(uuid)]);
    if (user.role !== 'SCOUTING_LEAD' || user.teamNumber !== row.sourceTeamNumber)
      throw new Forbidden('Only the report team’s scouting lead can modify this report');
    return row;
  }
  return {
    async create(userId: string, input: CreateInput) {
      const [user, scouter, match] = await Promise.all([
        account(userId),
        repository.findScouter(input.scouterUuid),
        repository.findMatch(input),
      ]);
      if (!scouter) throw new BadRequest('This scouter has been deleted or never existed');
      if (user.teamNumber === null || user.teamNumber !== scouter.sourceTeamNumber)
        throw new Forbidden('Not on the same team as the scouter');
      if (!match) throw new NotFound('Match does not exist');
      const normalized = normalizeEvents(input);
      const eventRows = normalized.map((event) => ({ ...event, scoutReportUuid: input.uuid }));
      try {
        await repository.create(
          {
            uuid: input.uuid,
            teamMatchKey: match.key,
            startTime: new Date(input.startTime),
            notes: input.notes,
            robotRoles: input.robotRoles,
            driverAbility: input.driverAbility,
            scouterUuid: input.scouterUuid,
            robotBrokeDescription: input.robotBrokeDescription ?? null,
            accuracy: input.accuracy ?? null,
            beached: input.beached,
            climbPosition: input.climbPosition ?? null,
            climbSide: input.climbSide ?? null,
            defenseEffectiveness: input.defenseEffectiveness,
            feederTypes: input.feederTypes,
            intakeType: input.intakeType,
            fieldTraversal: input.mobility,
            scoresWhileMoving: input.scoresWhileMoving,
            disrupts: input.disrupts,
            endgameClimb: input.endgameClimb,
            autoClimb: input.autoClimb,
          },
          eventRows,
          match
        );
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === '23505'
        )
          throw new BadRequest('Scout report already uploaded');
        throw error;
      }
      return this.get(userId, input.uuid);
    },
    async get(userId: string, uuid: string) {
      const [user, row, reportEvents] = await Promise.all([
        account(userId),
        report(uuid),
        repository.listEvents(uuid),
      ]);
      const sameTeam = user.teamNumber !== null && user.teamNumber === row.sourceTeamNumber;
      const {
        sourceTeamNumber: _sourceTeamNumber,
        teamNumber: _teamNumber,
        tournamentKey: _tournamentKey,
        scouterName,
        ...publicReport
      } = row;
      void _sourceTeamNumber;
      void _teamNumber;
      void _tournamentKey;
      return {
        scoutReport: { ...publicReport, ...(sameTeam ? { scouterName } : {}) },
        events: reportEvents,
        canModify: sameTeam && user.role === 'SCOUTING_LEAD',
      };
    },
    async updateNotes(userId: string, uuid: string, notes: string) {
      const row = await modifiable(userId, uuid);
      if (!(await repository.updateNotes(uuid, notes, row)))
        throw new NotFound('Scout report not found');
      return this.get(userId, uuid);
    },
    async delete(userId: string, uuid: string) {
      const row = await modifiable(userId, uuid);
      if (!(await repository.delete(uuid, row))) throw new NotFound('Scout report not found');
    },
    async timeline(userId: string, uuid: string) {
      await account(userId);
      await report(uuid);
      return (await repository.listEvents(uuid, true)).map(
        (event): [number, number, number] | [number, number, number, number] => {
          const base: [number, number, number] = [
            event.time,
            actions.indexOf(event.action),
            positions.indexOf(event.position),
          ];
          return event.points !== 0 ? [...base, event.points] : base;
        }
      );
    },
  };
}
export type ScoutReportsService = ReturnType<typeof createScoutReportsService>;
