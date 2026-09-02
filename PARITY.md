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
- [x] Match-scoped scout-report summaries with cross-team scouter masking and modification flags
- [x] Report-specific legacy metrics and autonomous path analysis
- [x] Team notes lookup with source-rule filtering and scouter privacy
- [x] Legacy mobile scout-report upload with numeric event compatibility
- [ ] On-demand match import and Slack break warnings during scout-report upload
- [x] Database-backed match catalog, public match existence, source-aware report counts, and
      schedule progress
- [x] Team tournament qualification status backed by The Blue Alliance
- [x] Match-result alliance aggregates with legacy scout-report metrics and role counts
- [x] ETag-aware on-demand TBA qualification and playoff match refresh
- [x] Mutable picklist CRUD
- [x] Shared/scored picklist CRUD with legacy metric defaults and team-wide access
- [x] Registered-team request, join-by-code, and registration status lifecycle
- [ ] Signed email verification, approval/rejection callbacks, and notification delivery
- [x] Public team-code validation and code-scoped active scouter roster
- [x] Lead-only approved team-code retrieval
- [x] Code-authenticated public scouter schedules with match/team/alliance assignments
- [x] Code-authenticated public tournament catalog and scheduled-event views
- [x] Lead-only team contact read and authenticated website persistence
- [ ] Team email change initiation and verification delivery
- [x] Verified-team user list, analyst list, and scouting-lead promotion
- [x] Authenticated team departure with analyst-role reset

## Remaining analysis work

- [x] Core team and multi-team metric analysis
- [x] Team category metrics with source-rule filtering, per-match scout averaging, and tournament
      recency weighting
- [x] Team discrete breakdown summaries and report-level details with source filtering and scouter
      privacy
- [x] Ordered team metric flags and tournament-rank flags with TBA failure fallback
- [x] Team metric timelines, field comparisons, and grouped autonomous paths
- [x] Team lookup details, categories, breakdowns, notes, and flags
- [x] Three-team alliance metrics, roles, climb timing, fuel totals, and autonomous paths
- [x] Match and alliance predictions
- [x] Qualification ranking predictions
- [x] Picklist analysis and z-score ranking
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
- [x] Hashed API-key authentication, usage accounting, and read-only team catalog access
- [x] API-key access across migrated legacy-compatible reads with explicit JWT-only mutation guards
- [ ] PostHog request analytics

## Final parity gate

### Explicit retirements

- Unauthenticated public scouter creation and UUID-only rename are retired. Their v1 authorization
  model allowed arbitrary roster mutation; v2 roster writes require a verified-team scouting lead.

- [ ] Every legacy route has a v2 replacement or an explicitly documented retirement
- [ ] Production migration reviewed against the current database
- [ ] Integration tests run against PostgreSQL
- [ ] OpenAPI document covers every supported route and contains no private fields
- [ ] Operational jobs and external integrations pass staging smoke tests
