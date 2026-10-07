# Space Wars bot architecture

Status: proposed design for review. Bots are a core gameplay and test system. They run deterministic/weighted utility policies, with no LLM calls, and obey the same legal actions, resource costs, travel, combat and information limits as human commanders.

## Actor model decision

| Option | Advantages | Costs and risks | Decision |
| --- | --- | --- | --- |
| A: actual Supabase Auth users | Can reuse an HTTP human path without an internal identity adapter | Hundreds of artificial accounts, sessions/provider lifecycle, misleading activity metrics, cleanup and token handling; does not itself guarantee legal bot behavior | Reject for production bots; temporary real test users remain useful for Auth/RLS tests |
| B: independent server actors with their own mutation logic | No fake accounts; simple initial scripting | Parallel rules drift, direct resource edits, privileged knowledge, difficult simulator parity | Reject the separate-rule interpretation; internal actor storage itself is appropriate |
| C: server-owned actors sharing the human domain/action layer | No artificial Auth lifecycle; equivalent legal validation; clean headless reuse | Requires an explicit controller adapter and tested privileged admission boundary | Recommend |

The distinction between B and C is the action boundary, not a fundamentally different database row. Choose internal actors as storage, and require every ordinary bot action to traverse the shared domain executor. Supabase Auth represents humans; it should not be the universal owner type for ships or empires.

An actor has controller kind, civilization and public commander identity. A membership scopes resources, homeworld and fleets to a season. A bot profile specifies archetype, difficulty, decision version and deterministic PRNG stream. Internal scheduler state holds next decision time, last processed observation/receipt, memory version and lease/fence. An active bot cannot also have a human controller.

Human adapter: verified Auth identity -> controlled membership -> durable command. Bot adapter: trusted scheduled task -> active BOT membership + current lease -> the same command. Only the principal binding differs. A bot never supplies a human Auth UUID or uses an unrestricted resource setter.

## Policy and execution boundary

```text
authorized actor observation + compact memory + policy/rules versions
    -> generate candidate intents
    -> filter locally known illegal/impossible choices
    -> utility scoring and bounded seeded selection
    -> shared command admission
    -> shared authoritative validation and transactional execution
    -> receipt and next authorized observation
    -> memory update and next decision deadline
```

Local candidate filtering is an efficiency feature; legality still belongs to the server executor. State may change before execution. A rejected action consumes the normal scheduling budget, records a reason and causes reconsideration after a delay. It must not trigger a privileged retry that bypasses a cost or reservation.

The policy module only receives `ActorObservation`: public topology/ownership, its own resources/queues/fleets, viewer-authorized contacts/scout reports, visible events and permitted action definitions. It has no raw galaxy object, database handle, enemy orders, private seed or opponent wallets. Keep this boundary equally strict in simulation; omniscient aggregate state is for the evaluator/report writer, not the bots.

## Archetypes

| Profile | Higher utility for | Restraint or characteristic failure |
| --- | --- | --- |
| Expansionist | Nearby neutral capture, connected territory, route access | Can overextend; still preserves fuel and a basic home reserve |
| Aggressor | Favorable attacks, pressure on a visible rival, contested choke points | Greater acceptable estimated losses; occasionally attacks on stale estimates |
| Industrialist | Mining throughput, resource efficiency, balanced fleet growth | May delay expansion while investing; no extra income privileges |
| Turtle | Border defence, reserve fleets, shorter supply exposure | Misses opportunities; home safety must not make this dominant |
| Opportunist | Weakly defended visible targets, post-battle openings, short profitable raids | Waits for an opening and can misjudge stale reports |
| Explorer, later | Scouting and frontier information | Extra decision breadth, not extra vision |
| Erratic, later | Larger seeded exploration of the candidate set | Legal inconsistency, never random illegal commands |

Profiles modify weights, desired reserves and horizons. They do not alter combat stats, build speed, resource grants or sensor rules. Civilization and personality are independent so simulations can distinguish race balance from policy bias.

## Utility policy

Generate a bounded candidate set: build an affordable class; form or reinforce a fleet; mine a reachable field; scout an uncertain target; capture adjacent neutral territory; attack a sufficiently favorable observed target; defend a threatened owned system; retreat/hold; or do nothing. All candidates include travel time, resource cost, commitment time and uncertainty.

One proposed score is:

```text
utility = territory_value + expected_resource_gain + strategic_position
        + defence_urgency + information_value
        - expected_losses - fuel_cost - commitment_time - uncertainty_penalty
```

Normalize features by stable catalog scales, not changing global extrema. Archetype weights convert features into a score; a bounded lookahead estimates consequences. Enemy estimates use permitted power bands and stale-age discounts, never hidden truth. Retain a small hysteresis bonus for an existing legal plan to avoid repeated retargeting.

Select from the best legal candidates with seeded weighted sampling or softmax and a small exploration probability. Clamp scores/temperature and define all tie-breaks and rounding. Separate PRNG streams for policy choice, reaction timing, generation and combat so diagnostic logging cannot alter outcomes. Persist the decision counter/seed state with the admitted command/memory transition or reconstruct it deterministically from stable IDs. Use deterministic simulation IDs rather than wall time or random UUID creation order.

Do not repeatedly ask the battle resolver for the true outcome against hidden enemy inputs. A cheap force estimate may use public/observed stats; an exact future result oracle would be cheating even if the final attack uses legal commands.

## Difficulty and imperfect behavior

Difficulty changes candidate budget, planning horizon, how well the bot manages reserves, its response delay and probability of selecting a lower-ranked legal action. Easy bots may overlook a visible target or underestimate uncertainty. Hard bots use more of the same authorized information and plan better. Neither gets faster ships, free resources, teleports, exact hidden observations or exempt rate limits.

Prototype timing distributions might be 8–25 seconds between routine decisions, with faster but bounded response to an observed attack and occasional longer idle periods. Schedule jitter per actor to prevent synchronized swarms. Real-time production decisions must honor these delays even when the worker could execute faster. Headless runs advance virtual time and preserve the same deadlines rather than removing them.

Imperfections are bounded: choosing a suboptimal legal attack is allowed; indefinitely spending all Fuel until stuck is not useful test coverage unless that scenario is deliberate. Include a low-resource recovery/hold policy. Rejected commands back off rather than spin. Every behavior threshold is versioned and reported so a policy change cannot masquerade as a race balance improvement.

## Small strategic memory

Keep a bounded record per bot: current objective/target with expiry, a few recently seen threats and their observation times, recent target outcomes, preferred rally system, intended reserve budget, last command/receipt and a short cooldown list for failed targets. Provisional caps: 32 remembered targets, 20 recent outcomes and a 16 KB serialized state ceiling. Expire old observations; never upgrade a remembered estimate with hidden database truth.

Store long decision traces in restricted diagnostics with retention, not in policy memory. Memory writes use a version check so two scheduled tasks cannot make independent decisions for the same bot. A worker restart recovers the pending command before selecting another action. Missing/corrupt memory falls back to a safe policy and emits a diagnostic, without restoring extra resources.

## Scheduler and worker behavior

Use the same persistent worker application as galaxy execution, with a separate bounded task pool. An indexed due queue supports priority for observed urgent events and normal deadlines. One active decision lease per bot, fencing on write, and a recorded command key prevent duplicate decisions. Reserve capacity for human commands and due settlements so bot load cannot starve them; that is infrastructure scheduling, not combat priority.

The bot scheduler can obtain only authorized observations and enqueue allowed gameplay actions. Population lifecycle operations are separate privileged tasks with an audit trail. A bot policy cannot request grants, create another bot, retire an enemy, reveal a map sector or move the clock.

Bound decisions per second, candidates per decision, pending commands per bot and CPU time. On overload delay decisions visibly in operational metrics; do not compress delays into a burst of retroactive actions. Galaxy actions still execute under the common chronological rules in [PVP_SECURITY_MODEL.md](PVP_SECURITY_MODEL.md).

## Headless simulator

Future command, not implemented in this documentation pass:

```sh
npm run simulate:galaxy -- --players 100 --days 30 --seed 12345
```

Here `players` means total simulated commanders, controlled by bots or deterministic scripted human policies; `days` is virtual game time. Default to a declared balanced mix of the five initial archetypes, civilizations and spawn positions. Additional planned options include rules/profile versions, roster cap, scenario, seeds/runs and output directory. Validate ranges; print the resolved configuration before a long run.

Two backends serve different purposes:

1. A fast in-memory state adapter drives an event heap and virtual clock through the same domain/galaxy/combat/policy packages. It is for many seeds and long-horizon balancing. It is not proof of RLS or real locking behavior.
2. A disposable PostgreSQL adapter runs smaller conformance and real concurrency scenarios through actual admission/commit functions. It checks persistence, retries, lease fencing and legal equivalence. It must never load reference environment files or connect to production.

Advance to the next event/decision deadline, not every animation frame of a 30-day world. Battles still run the selected top-down engine under its fixed simulation step; fast-forward world time does not replace combat with a different formula. Bound combat work and optionally cache identical input hashes only within the exact engine/catalog version. Large runs may be expensive; first profile 10 actors/1 day, then 100/30, then 500/burst scenarios. Record throughput and skipped/failed work; never report an incomplete run as complete.

Initialize scenario state once using an explicit fixture/generation phase recorded in the run manifest. After the run starts, all actor actions use normal command validation and all economic changes use legal jobs/lifecycle rules. Fault injection may interrupt/retry operations, but cannot be the balance policy. The reference `scripts/simulate.ts` directly creates test assets and uses historical migrations; copy its reporting/testing ideas, not its gameplay loop.

Reproducibility requires seed, generator/rules/combat/policy versions and hashes, configuration, deterministic IDs, event order, virtual start time and final state/event digests. The same inputs must reproduce the same digest on the supported pinned runtime. Browser replay equivalence gets separate tests; do not assume floating-point math is universally bit-identical across runtimes.

## Simulation reports

Write machine-readable JSON/CSV and a human-readable summary under a Space Wars run directory. Keep optional per-decision/per-event traces bounded or compressed. Include:

| Metric | Required interpretation |
| --- | --- |
| Battles | Started/settled/failed, participant counts, duration, losses, defender/attacker outcomes |
| Territory changes | Transfers, failed captures, contested duration, expansion and recapture rate |
| Empire sizes | Distribution over time, median/p90/max, connected components, external wipeouts |
| Resource inflation | Minted minus spent/destroyed by source and resource, balance distribution and per-active-actor trend; no market price index in V1 |
| Race win rates | Battle wins and season score wins separately, by matchup, sample count, side and spawn; paired seeds and uncertainty intervals |
| Fleet composition | Class shares by count, cost and battle participation; survival and efficiency |
| Snowballing | Territory concentration/top-decile share, Gini, early-leader final-rank correlation, time to dominance and comeback rate |
| Eliminated/recovering actors | External wipeouts, permanent elimination if scenario permits it, time to viable fleet and expansion again |
| Bot outcomes | Profile/difficulty score, action mix, idle time, legal rejection rate, objectives achieved, stale-intel mistakes |
| Correctness and operations | Invariant violations, duplicate effects, queue lag, retries, battle CPU/memory and simulation throughput |

A battle win rate is not a civilization win rate. Equalize personality/difficulty and rotate spawn/side assignments when comparing races. Run multiple seeds and report sample sizes; one 100-player world cannot justify balance claims. Maintain adversarial scenarios for turtles, crowded spawns, depleted asteroids, inactive humans, simultaneous attacks, worker delays and mass reconnects.

## Production population and retirement

The population manager has a target activity density and safety budget, not an obligation to occupy all 500 slots immediately. New bots receive the same standard start and available information as humans through a recorded spawn lifecycle action. Label bots as bots; do not present them as real logged-in people.

As humans grow, reduce new bot admissions first. Retire eligible quiet bots gradually using hysteresis/minimum lifetime, preferring those without active battles or imminent attacks. Do not despawn an engaged enemy, erase a player's target, transfer bot wealth to a new human or reset a bot into a free farming source.

Recommended retirement sequence: mark RETIRING; stop new offensive/expansion plans; finish existing jobs and settlements; use legal retreat/movement to consolidate; hold a public retirement deadline; then perform an audited lifecycle abandonment at a safe boundary. No transition can invalidate a frozen battle. Lifecycle abandonment neutralizes holdings and removes retired fleets/resources according to an explicit no-reward policy, rather than paying an opponent. This is a transparent world lifecycle rule, not an ordinary bot action or secret resource edit.

Free a reusable home slot only after pending references, reservations and observations are reconciled and the slot passes the spawn evaluator. A new human starts with a normal fresh package, never inherits hidden bot orders/memory. If retirement cannot safely complete, expand or defer admission. Keep tombstones so old receipts and reports remain valid. Exact retirement notice, inactivity and slot reuse times require owner approval.

## Debugging and acceptance

For a selected bot expose an operator-only decision trace: observation digest/version, top candidate feature scores, weights, sampled choice, PRNG counter, memory change, command ID/receipt and next deadline. A debug replay reconstructs that decision from the permitted observation. No production UI should expose this information to opponents.

Acceptance requires no illegal direct bot mutations; identical validation for equivalent human/bot intents; no observation leaks; reproducible seeds; bounded memory; correct restart recovery; five distinct measurable profiles; no duplicate decisions after lease expiry; and retirement that preserves active combat. The simulator must report both policy failures and infrastructure/invariant failures rather than hiding them in aggregate win rates.
