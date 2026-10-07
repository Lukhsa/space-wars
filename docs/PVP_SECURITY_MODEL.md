# Space Wars PvP security and concurrency model

Status: proposed trust boundary and event rules for owner review. The existing backend's `docs/PVP_READINESS.md` explicitly warns that private PvE ownership/RLS is not a shared PvP model. Current source supports that warning: battle workers, fleets, receipts and synchronization are largely keyed to one `user_id`. Space Wars must preserve private information while allowing a server transaction to affect multiple actors.

## Information classes

Public means visible to admitted members of the same galaxy/season, not automatically accessible to the unauthenticated internet. Website marketing/public spectator access can be designed later.

| Data | Authorized audience and representation | Never include |
| --- | --- | --- |
| Active topology, systems, planets, asteroid locations | Galaxy members; explicit public map projection | Unannounced sectors and hidden generation seed |
| Ownership, civilization, commander name, control state | Galaxy members; current control version | Auth UUID/email, login status or exact military strength |
| Leaderboard | Galaxy members; chosen score/current territory | Wallet totals, hidden ship values or build costs |
| Exact resources, ships, builds, fleet routes/orders | Controlling human's actor-private view; trusted workers | Foreign actor rows in an owner's snapshot |
| Enemy fleet presence | Viewer-specific contact while detected; ephemeral contact ID | Stable private ship IDs, full destination/route, exact cargo |
| Enemy power | Versioned approximate bands or bounded estimates at observation time | Fresh exact fleet counts disguised in another field |
| Scout report | Owner-only immutable observation with time, source, confidence/expiry | A live relation that rehydrates the opponent's latest roster |
| Battle inputs and seed before completion | Trusted combat worker | Full frozen input in public map/events |
| Completed battle report/replay | Participants, with explicitly approved battle-visible detail | Uninvolved fleets, build queues, wallets or private future orders |
| Bot memory, scheduler, action diagnostics | Internal operations only | Knowledge sources beyond the actor's legal observations |

A participant may learn the exact ships that fought through a completed battle replay. That is a deliberate observation of that historical roster, not access to the enemy's current ship table. Each replay unit uses a report-local ID. Report access is checked from server-created participant membership. Nonparticipants receive at most the territory outcome/event allowed by public rules.

RLS cannot hide individual sensitive columns in a row returned by a broad view. Use separate projection tables or rigorously constructed DTO functions. Do not expose private fleet/ship rows using a shared owner UUID, `owner_id != me`, or permissive participant joins.

## Auth and authorization

Human commands resolve `auth.uid()` to an active actor membership on the server. A request may identify the desired galaxy/season, but cannot impersonate an arbitrary actor. Guest Auth users receive the same gameplay validation as Google users. Supabase distinguishes authenticated anonymous users from the `anon` role; account linking preserves identity when successful. See [anonymous authentication](https://supabase.com/docs/guides/auth/auth-anonymous).

Bots have server-owned actors without Auth accounts. An internal enqueue function accepts an actor only after validating controller kind, membership, bot scheduler lease/fence and allowed command kind. It converges on the same command envelope and domain handler as humans. Humans cannot invoke this entry point, and bots cannot use lifecycle/admin operations to fund themselves.

Prefer unexposed schemas for canonical state, reservations, seeds and queue details. In exposed schemas, revoke default grants, enable/force RLS on application tables, permit narrowly scoped SELECT and no direct client mutation. Human-private read policies join membership to the verified Auth identity; public read policies require galaxy membership; observations additionally require viewer actor ownership. Index these joins. Explicitly test views/RPCs because their execution privileges can change whether policies apply. See [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

Security-definer RPCs require fixed empty/safe search paths, qualified object references, strict field allowlists, no user-built dynamic SQL, revoked PUBLIC execution, and explicit grants. Never treat a service key as automatically scoped: RLS-bypassing worker credentials require separate narrow function grants or a minimal trusted adapter, protected from browsers. Verify exposed schemas, function grants, views, GraphQL if enabled, Storage and Realtime in the new project; do not copy a historical advisor count as evidence of safety.

## Shared domain and command contract

Proposed envelope: `schema_version`, `galaxy_id`, `season_id`, action kind/arguments, `idempotency_key`, expected own actor/fleet versions where relevant. It contains no trusted timestamp, cost, reward, seed, winner, arbitrary owner or enemy-private version. The authenticated adapter establishes the principal. Private internal context includes controller identity and a registered worker fence.

Admission durably stores a canonical request hash, server-assigned command ID and processing tick. It checks syntactic limits, membership, throttles and outstanding-command caps. Return `PENDING` with a status lookup; this is not a promise that the action is legal after earlier scheduled events run. Bots use the same pending/result contract.

The trusted domain executor checks resources, fleet control, route edges, protection, reservations, visibility prerequisites and action-specific limits against current canonical state. The resulting effect plan is internal. A transactional commit verifies the current galaxy fence/sequence and complete read versions, applies only the registered effect shape, and records a terminal success or rejection. Schema constraints enforce nonnegative resources, unique ownership, valid references and one active reservation even if a handler is buggy. Test the SQL and in-memory adapters against the same rules and vectors.

## MVP event ordering

Use one logical sequencer per galaxy, with short PostgreSQL transactions and CPU work outside locks. This sacrifices some parallel throughput to make chronology testable. Each sequencer lease has a monotonically increasing fencing token; every state commit checks it. Lease expiry alone is insufficient because an old worker may still be running.

Use **one-second strategic ticks**. Admission is serialized briefly with the galaxy's admission marker and assigns a future open tick based on server time, never the client clock. Once a tick closes, no new command may be inserted into it. Already-scheduled travel deadlines are rounded according to the pinned rules. Keep a committed processing watermark; recovery resumes from it.

Within a closed tick process:

1. Predeclared season/lifecycle barriers, following the season cutoff policy.
2. Due battle settlements and ordinary job completions, in a stable event ordering.
3. Fleet arrivals and resulting engagement admission.
4. Capture hold completions, after arrivals can contest them.
5. Human and bot commands, including departures, using the same tie-break policy.

For equal-time competing arrivals/commands, use a persisted server-generated event ID and a deterministic rank derived from a private season tie-break seed, then ID as final tie-break. Do not rank by human/bot type, client-chosen key, HTTP completion or worker selection order. Bots do not receive that seed. One active order per fleet plus admission quotas prevents free duplicate rerolls. This is a proposed gameplay rule requiring owner approval, not a claim of perfect multiplayer fairness.

Milliseconds inside one tick are deliberately treated as simultaneous. A fleet arriving in an earlier tick acts first; two arrivals in the same tick use the tie-break regardless of subsecond receipt differences. This avoids pretending a database race is a game rule. If exact millisecond first-arrival priority is preferred, it needs a different explicitly tested policy.

At engagement admission commit roster reservations, versions, input hash and a fixed strategic completion tick. Battle workers can compute different engagements concurrently. At a scheduled settlement event, a missing result prevents the sequencer advancing past that event; admission may continue as pending, with backlog status visible. Never allow browser arrival, worker speed or response loss to decide which battle result wins. A repeated failure goes to operational recovery with the same frozen inputs, not automatic victory, new seed or silent reservation release.

This global barrier is intentionally simple but can cause head-of-line blocking. Benchmark it before the 500-slot target; bound rosters and CPU. Independent system queues/sector sequencers are a later optimization requiring equivalent cross-system ordering tests, not an unreviewed performance patch.

## Transaction and locking discipline

For the initial sequencer, all authoritative world mutation transactions first lock/check the galaxy execution row and fence. Then lock affected systems in sorted ID order, affected actor balances/revisions in sorted actor order, fleets/ships in sorted ID order, and associated jobs/battle rows. Admission uses its short dedicated marker/receipt transaction and never holds locks during simulation. Standardize the hierarchy in the persistence adapter; no action-specific reversal.

Maintain unique constraints for actor/season/key receipts, job completion, battle settlement, ship reservation and active capture. Lock the balance rows for spending and write ledger/receipt together. Verify all reads influencing an effect through either locked context or expected versions; re-evaluate on a stale context, never apply a partial plan. Serialization/deadlock retries are bounded and reuse persisted inputs and keys.

PostgreSQL row locks last to transaction end; consistent lock order and bounded retries matter. [PostgreSQL explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html). Use `SKIP LOCKED` to claim independent worker jobs/galaxies, not to skip an earlier contested event and change strategic ordering. Its inconsistent view is suitable for queue consumers, not general chronological state reads. [PostgreSQL SELECT locking clauses](https://www.postgresql.org/docs/current/sql-select.html).

## Required concurrency outcomes

| Case | Required rule and atomic boundary | Verification |
| --- | --- | --- |
| Two fleets attack the same neutral system simultaneously | Tick tie-break chooses provisional claimant; second arrival challenges before hold completion. One capture/engagement slot; no double owner | Reverse worker launch order and get identical result |
| One attacker arrives milliseconds earlier | Earlier tick wins priority; within one tick both use deterministic tie-break | Test just before/after boundary and same-tick permutations |
| Defender leaves as attack arrives | Earlier-tick departure succeeds. Same-tick arrival/reservation precedes departure; departure is rejected if fleet is now reserved | Both transaction launch orders and network delay |
| Ownership changes during travel | Route remains pinned; arrival checks current owner and mission stance. Reinforce does not silently attack a new owner | Ownership transfer immediately before arrival |
| Move command races with being attacked | Same priority rule; active engagement reservation blocks movement/reorganization | No ship both travelling and in battle |
| Construction finishes during battle | Complete into home reserve; never mutate frozen participants. If completion predates admission, only legally assigned ships can participate | Snapshot hash stable across completion |
| Two commands spend the same balance | Serialize domain application and balance debit. Depending on own expected version, second rejects stale or insufficient funds | No negative balance; no partial ledger on rejection |
| Bot and human target the same system/asteroid | Same ordering, occupancy, resource and visibility validators; no bot preference | Swap controller kinds while preserving scenario seed |
| Two miners claim the last field reserve | Lock/reserve remaining extractable amount at cycle admission; interrupted work releases only its unmined reservation | Sum of paid yield and outstanding reservations never exceeds available reserve |
| Reinforcement arrives during combat | Queue at system; cannot join existing snapshot. Re-evaluate after settlement | Original participant set unchanged |
| Network timeout after command admission | Identical key/body returns existing pending command or terminal receipt | No duplicate debit/job/order |
| Battle commits but response is lost | Natural unique battle settlement plus participant receipts permit status/replay fetch | Both actors, ownership, ledgers and events unchanged on retry |
| Worker crashes between simulation and commit | New fenced worker recomputes/loads same input/version; stale fence cannot commit | Kill/restart at every boundary |
| Two workers finish the same battle | Unique settlement + reservation/version/fence checks admit one result | Same result receipt, no duplicate salvage |
| Season closes with orders outstanding | Process eligible events through cutoff, drain required battles, reject/cancel later work under declared policy | Old-season retry cannot create new-season state |

## Combat trust boundary

Use the selected top-down engine from `src/game/war2`, not the older turn/tactical engines or the arcade game. Adapt its BLUE/ORANGE roles into neutral side identifiers internally; neither side receives tutorial hull floors, unearned officers or PvE rewards. Test the same roster on either side to expose legacy asymmetries. Frigate/Destroyer/Cruiser/Dreadnought motion/stat mappings are explicit catalog data.

Admission freezes both players' ship definitions, current hull, approved combat modifiers, standing orders, deterministic roster ordering, server seed, engine/catalog/formation versions and hash. No mutable catalog lookup may affect an existing battle. Reservations prohibit moving, repairing, assigning or destroying those ships through another action until settlement. Other unreserved ships and home construction remain usable.

Worker resolution has a maximum roster, steps, simulated duration, CPU/memory budget and validated result shape. Initial candidate cap: 32 participating ships per side (64 total), reflecting an existing reference guard, subject to profiling. A cap is enforced at fleet formation/admission, not by silently dropping ships from a submitted roster. If multi-fleet defence exceeds it, use the versioned challenge/defence queue policy and test for strategic abuse.

Settlement atomically verifies input hash, rules, phase, fence and reservations; applies both sides' hull/losses/retreats; records any allowed ledger effects; changes contest/capture state; releases reservations; and appends durable receipts/reports/events. A technical error never grants a winner. Retain a failed job for retry/inspection without rerolling. A strategic stalemate is an engine/rules outcome, distinct from infrastructure failure.

Watch is read-only playback of committed evidence. Prefer server-recorded trajectory checkpoints/effects for robust browser playback; deterministic resimulation may be an optimization if cross-runtime vectors demonstrate fidelity. In either case the recorded server result wins. A playback divergence cannot alter settlement. Keep seeds/hidden inputs private until the approved report disclosure point.

## Fog of war and intelligence

Visibility is a server projection function of viewer, current legal sensors/presence, scouting results and historical observations. Bots call this same observation boundary. Proposed V1: public ownership everywhere in active topology; nearby/visited fleet presence and approximate power; timed scouting improves information for a bounded interval. Exact ranges, bands and TTLs require owner approval.

Every observation has `observed_at`, `valid_until` where applicable, source and permitted fields. When contact is lost, emit a viewer-specific contact removal/update and mark retained information stale. Never keep sending live coordinates under a stale badge. A scout report is immutable; a later report is a new observation. A report may describe uncertainty rather than leak a hidden status through error text.

Projection events, counters, cursor spaces and invalidation hints must not reveal foreign private changes. Do not publish a global sequence that increments on every hidden order: use public and viewer stream cursors. Event rendering and browser redaction are not access controls. A cache contains only data previously authorized for that viewer; identity switching must not display the previous actor's cache. Screenshots/remembered observations cannot be revoked retroactively, so disclosures must be acceptable when sent.

Read APIs derive the viewer from the session, cap scope/size and return consistent snapshots/cursors. Avoid existence oracles from arbitrary foreign IDs: return a common unavailable response when a target is not authorized. URLs and Storage object paths are not secrecy; authorize reports/replays and use short-lived access or API delivery when private.

## Idempotency and reconnect

Scope keys to actor, galaxy and season, bind them to the canonical request including expected versions, and look up an existing receipt before comparing current versions. Same key with different content yields `IDEMPOTENCY_MISMATCH`. A timeout means unknown outcome, not permission to issue a new key. Keep natural uniqueness for onboarding, jobs and battles even when generic request retention ends. Retain compact tombstones/results through the season/archive retry window so receipt cleanup cannot re-enable an old command.

The client persists one durable in-flight intent per actor initially, as in the reference cache pattern; expand to multiple independent intents only with dependencies defined. Pending admission and terminal settlement are different receipts. On reconnect restore identity, fetch authorized snapshot/cursors, reconcile pending command status, and retry only the identical ambiguous request. An explicitly rejected stale action requires reconsideration and a new key after refreshed state. Reports can be fetched repeatedly without resettlement.

## Abuse and operations

Apply per-account/actor and per-network admission limits, anonymous account creation controls, payload/route/roster bounds, command queue caps, and separate budgets for expensive scouting/battles. Prevent user-controlled seed selection and free repeated attack-preview queries. Use public names as text, never HTML. Rate limits complement transaction security; neither substitutes for the other.

Use audit correlation IDs, action/actor IDs, input/result hashes, rules versions, lease fences and latency; exclude tokens, credentials and unnecessarily precise enemy state from client errors/logs. Internal decision traces and full snapshots require restricted operator access and retention. Alert on queue age, repeated combat failures, unexpected minting, rejected impersonation and stale-fence attempts.

Security acceptance requires genuine independent PostgreSQL connections and separate Guest A, Guest B, Google and unauthenticated sessions in a future disposable Space Wars environment. Test raw REST/RPC/read projections, ID guessing, report access, bot entry points, Storage, Realtime if enabled, retry/replay, account switch and all races above. Existing PGlite and hosted-test patterns are useful scaffolding, not proof of shared-world correctness or current deployed reference behavior.
