# Lovat Backend

The in-progress v2 Lovat API, structured as a Hono modular monolith.

## Runtime

- Bun is used for local development and tests.
- SST packages the same Hono application for AWS Lambda.
- PostgreSQL is accessed through Drizzle.

## Setup

1. Install dependencies:

   ```sh
   bun install
   ```

2. Copy `.env.example` to `.env` and provide local values.

3. Start the local API:

   ```sh
   bun run dev
   ```

The health endpoint is available at `GET /v2/health`.

## Quality checks

```sh
bun run typecheck
bun run lint
bun run format:check
bun run test
```

## Database migrations

The TypeScript schema in `src/platform/database/schema` is the intended source of truth.

```sh
bun run db:generate
bun run db:migrate
```

The existing migration predates the restarted implementation and must not be applied to
production until its compatibility with the current Lovat database has been reviewed.

## Modules

Each business capability owns its routes, contracts, service, repository, policies, and
tests under `src/modules`. Shared runtime concerns live under `src/platform`, while
external systems live under `src/integrations`.
