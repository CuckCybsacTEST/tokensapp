# Mundial 2026 Execution Plan

## Objective

Build an isolated mini-app at `/mundial2026` for World Cup 2026 predictions.

The module must:

- work as a public flow with no mandatory customer login
- have its own prize catalog, separate from the current `Prize` / token systems
- allow one prediction per WhatsApp per match
- generate a blocked QR after saving a prediction
- unlock winners after admin confirms the result
- let staff validate and redeem the prize once

## Non-Negotiable Decisions

These decisions are considered closed for implementation:

1. The app lives at `/mundial2026`.
2. It is a new isolated domain inside the repo, not a variation of the current token system.
3. Mundial 2026 prizes do not reuse the existing `Prize` catalog.
4. Public participation does not depend on `Customer` or `CustomerSession`.
5. WhatsApp is the anti-abuse identity key.
6. One WhatsApp can participate in many matches, but only once per match.
7. Staff redemption must be auditable and one-time.

## Phased Delivery Plan

## Phase 1 - Functional Blueprint and Contracts

Status: in progress

Goal:
Close the module boundaries before touching Prisma, pages, or APIs.

Deliverables:

- domain model definition
- route map for public, admin, and staff flows
- state machine for predictions and QR claims
- operational rules for prize assignment
- rollout order for implementation

### Closed Scope For Phase 1

The first implementation slice will include:

- daily matches list
- match prediction form
- delayed capture of `name` and `whatsapp`
- unique prediction guard per WhatsApp and match
- blocked QR after successful submission
- admin result confirmation
- unlock of winning predictions
- staff validation and redemption

The first implementation slice will not include:

- WhatsApp notifications
- customer loyalty integration
- real-time sockets
- advanced raffles
- cross-campaign analytics

### Target Domain Model

Proposed Prisma models:

#### `Mundial2026Campaign`

Purpose:
Top-level configuration container for the activation.

Core fields:

- `id`
- `slug`
- `name`
- `status` (`draft | active | archived`)
- `startsAt`
- `endsAt`
- `timezone`
- `createdAt`
- `updatedAt`

#### `Mundial2026Match`

Purpose:
Store each match and prediction window.

Core fields:

- `id`
- `campaignId`
- `externalKey`
- `stage`
- `homeTeam`
- `awayTeam`
- `startsAt`
- `predictionClosesAt`
- `status` (`draft | scheduled | open | closed | finished | settled | cancelled`)
- `result` (`home | draw | away | void`)
- `settledAt`
- `createdAt`
- `updatedAt`

Indexes and constraints:

- unique `externalKey`
- index on `startsAt`
- index on `status`

#### `Mundial2026Prize`

Purpose:
Private prize catalog for this mini-app only.

Core fields:

- `id`
- `campaignId`
- `key`
- `label`
- `description`
- `color`
- `imageUrl`
- `stockTotal`
- `stockReserved`
- `stockClaimed`
- `active`
- `priority`
- `claimWindowHours`
- `createdAt`
- `updatedAt`

Indexes and constraints:

- unique `(campaignId, key)`
- index on `active`
- index on `priority`

#### `Mundial2026MatchPrize`

Purpose:
Define which prizes apply to a match and how they are assigned.

Core fields:

- `id`
- `matchId`
- `prizeId`
- `assignmentMode` (`direct_first_n | fallback | raffle_pool`)
- `maxWinners`
- `sortOrder`
- `active`
- `createdAt`
- `updatedAt`

Indexes and constraints:

- unique `(matchId, prizeId)`
- index on `matchId`

#### `Mundial2026Participant`

Purpose:
Represent a person identified by WhatsApp for this activation.

Core fields:

- `id`
- `campaignId`
- `name`
- `whatsappRaw`
- `whatsappNormalized`
- `createdAt`
- `updatedAt`

Indexes and constraints:

- unique `(campaignId, whatsappNormalized)`
- index on `name`

#### `Mundial2026Prediction`

Purpose:
Main business record for one prediction in one match.

Core fields:

- `id`
- `campaignId`
- `matchId`
- `participantId`
- `pick` (`home | draw | away`)
- `status` (`pending | won | lost | void | expired`)
- `qrCode`
- `signature`
- `signatureVersion`
- `claimStatus` (`blocked | available | redeemed | expired | rejected`)
- `assignedPrizeId`
- `availableAt`
- `claimExpiresAt`
- `redeemedAt`
- `redeemedByUserId`
- `createdAt`
- `updatedAt`

Indexes and constraints:

- unique `(matchId, participantId)`
- unique `qrCode`
- index on `status`
- index on `claimStatus`
- index on `createdAt`

#### `Mundial2026RedemptionLog`

Purpose:
Audit every validation and redemption attempt.

Core fields:

- `id`
- `predictionId`
- `action` (`validate | redeem | reject`)
- `result` (`ok | already_redeemed | blocked | expired | not_winner | invalid`)
- `byUserId`
- `device`
- `location`
- `notes`
- `createdAt`

Indexes:

- index on `predictionId`
- index on `createdAt`

### State Machines

#### Match lifecycle

- `draft`: hidden, editable
- `scheduled`: visible but not yet open
- `open`: predictions allowed
- `closed`: no more predictions
- `finished`: result captured but not yet assigned
- `settled`: winners and losers resolved
- `cancelled`: match voided

#### Prediction lifecycle

- `pending`: prediction saved, waiting for result
- `won`: correct result
- `lost`: incorrect result
- `void`: match voided or manually invalidated
- `expired`: winner did not claim within window

#### Claim lifecycle

- `blocked`: created but not claimable yet
- `available`: winner with claimable prize
- `redeemed`: already used in bar
- `expired`: claim window elapsed
- `rejected`: invalid or manually blocked

## Phase 2 - Database and Backend Foundations

Goal:
Create the Prisma schema, migration, repository helpers, and protected API contracts.

Deliverables:

- Prisma models and migration
- normalization helper for WhatsApp
- QR/signature helper for prediction codes
- public APIs for listing matches and saving predictions
- admin APIs for matches, prizes, and settlement
- staff API for validation and redemption

Exit criteria:

- DB schema migrated cleanly
- one prediction per WhatsApp per match enforced in DB
- signed QR can be generated and verified

## Phase 3 - Public Mini-App `/mundial2026`

Goal:
Deliver the public user journey from QR entry to blocked QR.

Deliverables:

- `/mundial2026`
- `/mundial2026/partidos/[matchId]`
- `/mundial2026/mis-jugadas` or `/mundial2026/jugada/[qrCode]`
- prediction UI and post-submit QR page
- duplicate participation handling

Exit criteria:

- user can enter, choose match, predict, submit data, and receive blocked QR

## Phase 4 - Admin Module `/admin/mundial2026`

Goal:
Give operations full control of matches, prizes, and outcomes.

Deliverables:

- campaign dashboard
- match CRUD
- prize catalog CRUD
- match prize assignment UI
- predictions table with filters
- result settlement action

Exit criteria:

- admin can configure a match end-to-end and settle it safely

## Phase 5 - Staff Claim Flow

Goal:
Enable bar staff to validate and redeem unlocked QRs.

Deliverables:

- staff scanner or scanner extension for Mundial 2026
- claim validation screen
- redeem action with audit log
- rejected / expired / already redeemed handling

Exit criteria:

- one successful claim consumes the prize and blocks reuse

## Phase 6 - QA, Metrics, and Rollout

Goal:
Stabilize the feature before live operation.

Deliverables:

- test coverage for core business rules
- operational checklist
- admin seed data for demo or staging
- smoke test flow
- post-launch metrics definition

Exit criteria:

- end-to-end happy path tested
- failure cases tested
- operations can run the activation without manual DB intervention

## Execution Order Inside The Codebase

Recommended implementation order:

1. Prisma schema and migration
2. domain helpers in `src/lib/mundial2026/`
3. API routes in `src/app/api/mundial2026/`
4. public pages in `src/app/mundial2026/`
5. admin pages in `src/app/admin/mundial2026/`
6. staff validation flow
7. tests and smoke scripts

## Phase 1 Output

Phase 1 is considered started with this document.

The next concrete build step is:

- implement the Prisma schema for the isolated Mundial 2026 domain

That should be the first code phase because all public, admin, and scanner flows depend on these contracts.