# Legacy parity ledger

This file tracks behavior migrated from `lovat-server` into the v2 modular API. A feature is
complete only when its routes, authorization, persistence behavior, OpenAPI contracts, and
tests are present.

## Complete

- [x] PostgreSQL schema, constraints, relations, Zod schemas, and OpenAPI model schemas
- [x] Auth0 dashboard authentication and current-account read/delete
- [x] Account username and team/tournament source-rule settings
- [x] API-key list/create/rename/revoke
- [x] Team catalog search and pagination
- [x] Tournament catalog, participation ordering, and tournament team list
- [x] Scouter roster list/create/rename/archive/unarchive
- [x] Team scouter-schedule read with assignment positions and content hash

## Remaining manager and scouting work

- [x] Scouter-schedule create/update/delete
- [ ] Automatic scouter-schedule generation
- [x] Authenticated scout-report create/read/delete, legacy event timelines, and notes updates
- [ ] Public team-code scout-report upload, on-demand match import, and break warnings
- [x] Database-backed match catalog, public match existence, source-aware report counts, and
      schedule progress
- [ ] Match results, team tournament status, and on-demand TBA match refresh
- [x] Mutable picklist CRUD
- [x] Shared/scored picklist CRUD with legacy metric defaults and team-wide access
- [ ] Registered-team onboarding, verification, approval, and rejection
- [ ] Team code and public scouter onboarding flows
- [ ] Team email and website management
- [ ] Team user list, analyst list, and scouting-lead promotion

## Remaining analysis work

- [ ] Core team and multi-team metric analysis
- [ ] Team lookup details, categories, breakdowns, notes, and flags
- [ ] Match and alliance predictions
- [ ] Qualification ranking predictions
- [ ] Picklist analysis and z-score ranking
- [ ] Scouting-lead progress and report quality views
- [ ] CSV team and scout-report exports
- [ ] Pit display

## Remaining integrations and operations

- [ ] The Blue Alliance tournament, team, match, ranking, and result imports
- [ ] Cached-analysis calculation/storage and external cache invalidation (report mutations already
      invalidate PostgreSQL cache metadata)
- [ ] Slack OAuth, commands, events, subscriptions, and warnings
- [ ] Email verification delivery and resend throttling
- [ ] Scheduled imports, cleanup jobs, and deployment-time jobs
- [ ] API-key authentication for legacy-compatible read endpoints
- [ ] PostHog request analytics

## Final parity gate

- [ ] Every legacy route has a v2 replacement or an explicitly documented retirement
- [ ] Production migration reviewed against the current database
- [ ] Integration tests run against PostgreSQL
- [ ] OpenAPI document covers every supported route and contains no private fields
- [ ] Operational jobs and external integrations pass staging smoke tests
