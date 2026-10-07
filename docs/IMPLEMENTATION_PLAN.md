# Space Wars implementation plan

Status: architecture review deliverable, 7 October 2026. **Stop after this documentation pass until the owner reviews and approves the architecture.** No implementation, project provisioning, migrations or deployment is authorized by this plan. Future phases describe work to authorize, not work already completed.

## Recommended decisions

Adopt the React/TypeScript/Vite monorepo, an independent Supabase Auth/PostgreSQL project, and one worker deployment. Separate human accounts from galaxy actors and use server-owned bot actors through the same legal domain actions. Preserve the owner's selected **Battle Lab V2 top-down combat engine**; Simulate and Watch must resolve identically on the server. Begin with explicit public/private/viewer-redacted projections and durable ordered events, rather than treating the existing private RPG schema as shared PvP.

Use polling/cursor reconciliation first, SVG for the strategic map and the existing Canvas approach for battle playback. Start with one logical galaxy sequencer, bounded asynchronous combat jobs, and an explicit load gate before promising 500 active slots. These recommendations are detailed in [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md), [GALAXY_MODEL.md](GALAXY_MODEL.md), [PVP_SECURITY_MODEL.md](PVP_SECURITY_MODEL.md), [BOT_ARCHITECTURE.md](BOT_ARCHITECTURE.md) and [REFERENCE_REUSE_AUDIT.md](REFERENCE_REUSE_AUDIT.md).

## Phases and dependencies

| Phase | Work and dependency | Acceptance criteria and tests |
| --- | --- | --- |
| 0 — Owner review | Current documentation only. Resolve the architecture-critical decisions below and approve the first implementation slice | Six documents reviewed; source versions recorded; reference projects untouched; explicit scope authorization before code |
| 1 — Local foundations and combat extraction | Depends on 0. Create minimal npm workspaces/contracts/domain boundaries; copy approved current Web V2 dependency closure into `packages/combat`; retain provenance/notices | Clean checkout builds without sibling repos, reference URLs or credentials. Characterization vectors preserve selected V2 movement/weapons/formations; headless module imports without DOM. Explicit four-class mapping and neutral two-sided input; tutorial floors/rewards excluded |
| 2 — Local authoritative vertical slice | Depends on 1 and approval of world/event policy. Design and implement Space Wars schema in a disposable local database, with actor/membership separation, admission/receipt pipeline, sequencer leases, resources/build jobs and visibility DTOs | Same rule handlers accept human/bot principal adapters. Raw client mutations denied, foreign IDs rejected, duplicate onboarding/spending prevented. Genuine independent PostgreSQL connections verify lock order, lease fencing, rollback and concurrent spends. No hosted project required |
| 3 — Headless world and bot slice | Depends on 2's contracts/commit semantics and 1's combat. Implement graph/spawn, travel, asteroids, capture, visibility, five bot profiles and virtual-time runner; use in-memory adapter plus PostgreSQL conformance scenarios | Seeded graph reachability/fairness checks; legal bot commands only; bounded memory and no hidden intel. First run 10 actors/1 day, then 100/30 across multiple seeds. Reports and invariant failures are reproducible, not synthetic scripted rewards |
| 4 — PvP and failure correctness | Depends on 3. Both-side reservation, frozen top-down simulation, settlement, capture/retreat, reports and crash recovery | All concurrency cases in security model pass; no double battle/reward/capture, no ship movement while reserved, stable outcome after lost response/restart, side-swap tests and maximum-roster CPU/memory benchmark |
| 5 — Browser and Guest milestone | Depends on 2–4. Guest entry, commander/civilization creation, central map, own-state inspector, build/fleet/mine/move/attack/defend UI, reports/event log and durable reconnect | Two independent browser sessions plus bots share one galaxy. No opponent private data in network/cache/events. Desktop usability, phone viewport smoke tests, keyboard system list, stale-intel labeling, server timers and pending command states. First playable criteria below met locally |
| 6 — Dedicated hosted test and recovery | Requires explicit authorization to create a Space Wars project and deploy test components. Configure independent Auth, HTTP adapters, worker and web; add Google login/linking and account-switch safeguards | Project identity allowlist fails closed; no production reference access. Real Guest/Google linking preserves actor and starter receipt. Test RLS/RPC/Storage plus Realtime only if enabled, multiple connections, network loss, worker restart and account switching in disposable Space Wars environment |
| 7 — Population, seasons and scale | Depends on 4–6. Tune density, recovery, retirement, scoring and season closure; load profile up to 500 slots; operational telemetry and retention | Multi-seed balance reports, no silent bot cheats, safe retirement during inbound attacks, old-season key isolation, score cutoff consistency, resource ledger reconciliation. Prove chosen queue/read/frame-time budgets and recovery behavior before launch |

The sequence allows UI mockups with approved synthetic DTO fixtures alongside later local phases, but gameplay authority and information boundaries must exist before connecting them to real players. Do not turn phase 1 into a complete game build. Report each phase's evidence and unresolved decisions before expanding scope.

## First playable milestone

The local milestone has Guest login, unique commander creation, approved race selection, one active shared galaxy, a central system/planet/asteroid map, a safe homeworld, Credits/Alloy/Fuel, Frigate/Destroyer/Cruiser/Dreadnought construction, fleet formation/movement, mining, neutral conquest, PvP, battle reports, bot commanders and an event log.

A concrete acceptance scenario:

1. Two independent Guests choose civilizations, receive distinct homes and one starter grant each. A duplicate request gives no additional grant.
2. Each builds ships, forms a fleet, mines and claims a neutral system while bots independently perform legal actions.
3. Both attack the same contested system. One ordered result changes control; resources, losses and reports reconcile for both sides.
4. A spectator sees ownership and permitted contacts, not exact resources, orders or build queues. Scouting yields a dated report that becomes stale without turning into a live enemy feed.
5. One player watches the top-down replay, the other closes the browser. The same server result settles exactly once; neither playback nor disconnect changes the outcome.
6. A worker restarts and a response is lost. Retrying the original keys finds the same pending/settled command and battle receipt. No duplicate ships, income, movement or ownership.
7. A weakened player can rebuild through the approved recovery rule, and bots remain active with all human browsers closed.

The first local milestone is not the public launch. Google linking, hosted security checks, abuse controls, monitoring and approved retention/recovery policy are release gates for public operation.

## Validation strategy

| Layer | Evidence required |
| --- | --- |
| Domain/property tests | Nonnegative resources, legal ownership and graph movement, valid job transitions, one fleet/reservation per ship, deterministic integer rounding and conservation/mint rules |
| Combat characterization | Current V2 baseline fixtures, version hashes, repeat seed equality, side/roster permutation checks, explicit class-role mapping, serialized snapshots, step/duration bounds and representative visual replay checks |
| Adapter conformance | Same command/event scenario yields equal receipts and state digests in memory and PostgreSQL; in-memory success alone is insufficient |
| Database concurrency | Independent connections with synchronization barriers, varied call order and fault injection for every race in the security matrix; transaction rollback and stale-fence rejection |
| Security/visibility | Guest A/B/linked account/unauthenticated/admin separation; guessed foreign IDs, public vs private projections, scout expiry, participant reports, cache account switching, hidden-state changes do not change public event streams |
| Auth/browser | Guest restoration, concurrent entry, PKCE callback, linking vs existing-account switch, durable outbox write failure, lost response, reconnect, no local timer settlement |
| Bots/simulator | Same legal actions and observations as human policy, five distinct profiles, bounded memory, deterministic timing, no direct grants, paired race/side/spawn seed comparisons and reproducible report hashes |
| Load/operations | 100-player/30-day headless baseline, 500-slot active/idle scenarios, maximum fleet encounters, 250 read requests/second example, worker backlog, retry storms and safe resume |

Prefer meaningful behavioral tests over mirroring implementation. Retain characterization fixtures only where they protect an intentional combat/rule contract. Keep hosted tests explicitly gated to disposable Space Wars projects. No reference repo tests or migrations are prerequisites to execute in place.

Proposed load acceptance is p95 normal command settlement and due-event lag under 2 seconds at an agreed active-actor mix, plus a usable 60 fps desktop map target on a named test device with viewport culling. These are measurement targets to approve, not observed results. Report hardware, world size, fleet size, payloads and worker count with every benchmark. A long simulation may finish slower than real time under pathological combat; report completion and work budgets honestly.

## Decisions requiring owner approval

| ID | Decision | Recommendation | Needed before |
| --- | --- | --- | --- |
| D1 | Overall topology and authoritative domain boundary | One monorepo; separate Supabase project; one worker; shared TypeScript rules and transactional PostgreSQL commit boundary | Phase 1 |
| D2 | Shared event ordering and same-time fairness | One-second strategic ticks; completions then arrivals then capture then departures/commands; seeded persisted tie-break and one logical galaxy sequencer | Phase 2 |
| D3 | Strategic engagement duration and reinforcement behavior | Fixed versioned 10-second initial occupancy; top-down Watch duration independent; no late addition to frozen roster; deterministic two-sided challenge queue | Phase 3–4 |
| D4 | Homeworld defeat/recovery | Non-capturable, non-attackable home system for MVP; limited baseline rebuilding and contestable external empire; no permanent human elimination | Phase 2–3 |
| D5 | Initial civilizations and their mechanical differences | Choose 6–8; proposed eight in galaxy model. Begin strategic racial bonuses at parity; explicitly review combat definitions rather than inherit RPG tiers | Phase 1 content extraction, phase 3 balance |
| D6 | Art/code provenance and Destroyer role | Approve selected portraits/top-down hulls/planet/asteroid/UI assets; define Destroyer motion profile instead of inheriting Corvette accidentally; retain required third-party notices | Phase 1 copying |
| D7 | Information disclosure | Public ownership; viewer-specific presence/power bands; timed scout improvements; exact historical combat roster visible only to participants after settlement | Phase 2 DTOs and phase 3 visibility |
| D8 | Economy and pace | Three resources; home shipyard; bounded passive income plus mining; requested build/travel ranges as simulator inputs; no complex colony economy | Phase 2–3 |
| D9 | Fleet limits and crowded battles | Initially test 32 ships per side; bound fleet count/queues; versioned overflow/defence challenge rules, never silently drop participants | Phase 3–4 |
| D10 | Bot actor model and disclosure | C: internal actors, same legal actions/observations, no fake Auth users; label bots | Phase 2 |
| D11 | Population expansion and bot retirement | Small active core, bots for activity, hysteresis, expansion before forced eviction; safe retirement lifecycle with no live target disappearance | Phase 3 simulation, phase 7 production |
| D12 | Season length, scoring and reset | Compare 7/30-day worlds; territory-time excluding homes; freeze at announced cutoff; no wealth carryover | Phase 3 reporting, phase 7 lifecycle |
| D13 | Inactivity, anonymous retention and account deletion | Preserve shared history; do not auto-command inactive human accounts; choose notice/expiry rules before public release | Phase 6–7 |
| D14 | Hosting, budget and scale scenario | Static web + independent Supabase + nearby persistent worker; approve cost envelope and define how many of 500 actors are simultaneously active | Before provisioning and phase 7 load gate |
| D15 | Google timing | Guest first local milestone; Google sign-in/linking before public launch; no implicit account merging | Phase 6 |

The top-down combat engine choice is already settled by the owner. Its extraction and PvP adaptation still require testing; there is no proposal to replace it with the older tactical or arcade engines. Approval of this architecture also does not silently authorize reference project changes or a production deployment.

## Biggest technical risks and mitigations

| Risk | Mitigation/gate |
| --- | --- |
| Private data leaks through projections, events, IDs or replay | Explicit DTO field sets and viewer streams; raw network/cache tests; participant-only historical disclosure |
| Shared races create duplicated ships/resources/control | Ordered event policy, complete transaction read sets, reservations, multi-actor settlement, unique receipts and real concurrency tests |
| Extracted V2 retains PvE assumptions or diverges across runtimes | Current Web source provenance, pure dependency extraction, tutorial removal, explicit roles, side-swap and golden replay tests |
| Slow combat stalls the galaxy sequencer | Bound rosters/steps, measure CPU, precompute outside locks, fenced retries, queue alarms; gate 500-slot scale and revisit partitions only with evidence |
| Economy snowballs or invulnerable homes dominate | Multi-seed matched policy/race/spawn simulations, territory concentration and comeback metrics, explicit sinks/home caps |
| Bot advantage hides in data access or test fixtures | Observation-only policy API, common domain handler, controller-swap scenarios and separate evaluator access |
| Asset reuse or copied config introduces product coupling | Approved manifest/notices; no reference environment/deploy files; isolated checkout/build checks |

## Postpone

Interactive tactical PvP/pilot controls, live multiplayer battle synchronization, research trees, deep colonies/population simulation, captains/officers, a marketplace, guilds, battle passes, many resources, mobile-native clients/GPS, payments/ads, mature Space Explorer save imports, inherited cosmetics/entitlements, LLM bots and microservices are outside MVP.

Also postpone a heavy strategic-map engine, Realtime as a correctness dependency, cross-sector parallel execution and elaborate diplomacy until evidence warrants them. Keep extension points for neutral/allied/hostile presentation, multiple galaxies and seasons without implementing speculative systems.

## Review deliverable and handoff

This pass produces the six architecture documents and a documentation-only commit on Space Wars `main`. `AGENTS.md` is preserved as the project's operating rules. It does not create gameplay code, dependencies, assets, database migrations or infrastructure. Review D1–D10 before the local implementation slices; later operational/product decisions can be settled before their listed phase, with provisional values confined to named simulations.
