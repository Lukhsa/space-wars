# Space Wars galaxy model

Status: proposed rules and conceptual entities for review. Names below are design vocabulary, not SQL migrations. Timing, density, scoring and protection numbers are initial simulation inputs.

## World and membership

| Entity | Responsibility and essential fields | Invariant |
| --- | --- | --- |
| Galaxy | Stable world identity, name, capacity ceiling, active season | World capacity includes human and bot commanders |
| Season | Galaxy, opening/closing ticks, status, generator version, rules/catalog versions | New season has new state and IDs; old results remain archived |
| Actor | Commander identity, HUMAN/BOT controller kind, optional account binding, civilization | A bot has no fake Auth account; controller changes are privileged lifecycle events |
| Membership | Actor, galaxy/season, active/recovering/inactive/retiring status, homeworld | One active human membership per account per galaxy/season |
| Sector | Season, stable coordinates, sealed/announced/active state, slot budget | Activating new sectors cannot relocate occupied systems |
| System | Sector, position, type, owner actor or neutral, control version, contest state | At most one owner and one active engagement/capture state |
| System edge | Two system IDs, length/travel weight, activation version | No self edges; canonical endpoint ordering; no duplicate edge |
| Planet | System, visual catalog key, role/yield category, homeworld reservation | Planet control derives from system control in V1 |
| Asteroid field | System, resource reserves/cycle rules, visual key | Depletion and mining reservations settle under shared ordering |
| Fleet and ships | Actor/season, roster, docked/travelling/reserved state, individual hull | One ship in at most one fleet/reservation; no cross-season transfer |
| Order and travel leg | Fleet, mission, route, departure/arrival ticks, pinned fuel/rules | One active strategic order per fleet; no client timestamps |
| Capture | System, claimant, start/deadline, progress/state | Claimant must retain eligible uncontested presence |
| Observation | Viewer actor, target, field set, observation/expiry times and source | A historical sighting does not become a live fleet reference |
| Battle | System, participants, reservations, frozen inputs/hash, version, seed, deadlines, result receipt | Both sides settle together exactly once |

Planets and asteroids share the system graph; they are not extra graph vertices. A homeworld is a planet in a reserved home system. A civilization's lore homeworld name is not a unique live planet shared by all players of that race. Repeated civilizations receive different generated homes, with lore used as flavor.

`galaxy_id` and `season_id` scope every strategic entity and command. Composite keys/foreign keys prevent foreign fleets, edges or actors entering another season. Deleting an Auth user must not cascade-delete a contested system, an opponent's report or a shared battle; detach/anonymize the controller through a lifecycle action and preserve world/history consistency.

## Graph and sectors

Generate a seeded graph with bounded node degree, a connected backbone and extra loops. Validate reachability, no isolated spawn, path cost distributions, choke points and comparable early expansion choices. Visual distance can inform travel weight, but final weights are explicit and versioned. Borders show adjacent control or shaded cells around nodes and never determine travel legality.

Begin with an active core sized for actual population, for example 16–32 commanders including bots. A 500-slot ceiling may need several thousand systems; an initial experiment is 6–10 systems per available slot across the eventual map, with a smaller portion active. Measure conflict density and time to first contact before fixing either ratio.

Pre-generate expansion sectors or derive them from independent server-side seed streams. Reveal a sector's public topology only when announced; keep unrevealed generation details out of public bundles. Activate sectors through scheduled lifecycle events when safe spawn capacity runs low or sustained occupancy passes a threshold. Candidate policy: announce at 75% occupied safe slots, then activate after a delay. Thresholds, sector size and delay are configurable.

Do not shrink occupied sectors, delete traveled edges or move fleets to improve density. When population falls, stop expansion and increase appropriate bot activity within existing active space. Retire/compact the world only at a season boundary. Publish topology changes with a version and ensure queued routes refer to valid versions.

## Spawn and onboarding

Guest authentication and commander creation are separate idempotent actions. Commissioning validates a bounded commander name and an approved civilization ID, then atomically reserves a safe home slot, creates membership, grants one standard starter package and writes a durable onboarding receipt. A retry or Google link cannot grant it again.

Use the same spawn evaluator and starter budget for humans and bots. Candidate checks include unused home reservation, path distance to active rivals, nearby Alloy/Fuel access, at least two viable expansion routes where topology permits, and no pending attack/capture reservation. Tie-break with a persisted seeded decision. The slot allocation and actor creation commit together; never select a vacant home on the client.

If safe slots are exhausted, activate capacity or present admission as waiting/full. Do not take an active bot's homeworld and teleport its fleet away. Population management and replacement are described in [BOT_ARCHITECTURE.md](BOT_ARCHITECTURE.md).

Recommend eight initial candidates from the existing catalog: Glin'Tok, Myrmex, Kethrik, Kraggs, Engine-Burners, Umbral, Ulmar and Varn. The owner chooses the final 6–8 and art. Start strategic racial bonuses at parity to measure the base loop; retain the selected combat system's mechanics only through explicitly reviewed Space Wars definitions. Existing civilization dispositions are lore, not automatic player alliances or enemy rules.

## Resources and construction

Use only Credits, Alloy and Fuel. Proposed roles: Credits and Alloy buy ships; Fuel pays travel and mining deployment. A modest homeworld baseline prevents a defeated commander becoming permanently unable to act. Asteroids provide additional Alloy/Fuel; held planets provide a small bounded Credits income. Define mint/sink and depletion rules in a versioned economy catalog before implementation.

All balances are integer quantities. Income accrues from server-owned intervals and fractional carries where needed; ownership change closes the previous owner's interval at the transfer tick. A capture never retroactively awards the old owner's production or steals an entire private wallet. Spending is applied once on accepted execution, not at HTTP submission. Cancellation refunds derive from the recorded payment policy, not current prices.

Keep ship construction at the protected home shipyard for MVP. This avoids captured-queue transfer rules and deep colony facilities. Construction produces an unassigned reserve ship; adding it to a fleet requires a legal action. A completion cannot alter a frozen battle. No ship class unlock tree is required.

| Class/action | Initial pacing range to test |
| --- | --- |
| Frigate | 15–30 seconds build |
| Destroyer | 45–90 seconds build |
| Cruiser | 2–4 minutes build |
| Dreadnought | 5–10 minutes build |
| Local movement | 20 seconds–3 minutes |
| Strategic movement | 3–10 minutes |
| Unopposed capture | Initial experiment: 15 seconds hold |
| Strategic battle occupancy | Initial experiment: 10 seconds, independent of Watch duration |

These are placeholders. The existing Battle Lab V2 motion roles include Corvette rather than Destroyer; explicitly define Space Wars class-to-motion profiles rather than renaming and accidentally inheriting the wrong role.

## Movement and orders

Commands cover build, form/reorganize fleet, move, scout, mine, attack/capture, defend and reinforce. Fleet rosters may change only while docked and unreserved. No mid-flight split/merge or teleportation. Use deterministic shortest-path routing with a stable tie-break and explicit server validation of every active edge; keep route length bounded.

At departure pin the legal path, per-leg durations, fleet speed, fuel debit and mission stance. Reserve enough fuel for the accepted route; a new route requires a new legal order. Each leg has a scheduled arrival event. Fleets meet at systems, not through lane interception in V1. Travel is visible only when the observer's rules permit it; map animations cannot reveal private destinations.

Hostile/scouting missions must also declare a server-validated fallback system/path and reserve its Fuel cost at admission. A retreat uses ordinary timed legs and consumes that reserve; it cannot return instantly. If the fallback becomes illegal, a versioned rule chooses a reachable safe alternative within the remaining budget or leaves the surviving fleet stranded/holding for an owner decision. No hidden refund, teleport or free replacement fleet resolves that case. A combat retreat and strategic return are separate state transitions.

Evaluate occupancy, hostility and protection at arrival. A queued destination becoming hostile does not turn a peaceful reinforcement into an automatic attack. A hostile stance can engage the current hostile occupant; a cautious transit/reinforce stance halts or takes a predeclared retreat route and returns an owner-visible report. That policy prevents silently declaring a different war based on stale intel. Departure from a system contested at that tick follows the event priorities in the security model.

Treat defend as standing at a system with defensive participation enabled. Reinforce moves to a friendly system and joins its available defensive presence after arrival. No guild or treaty UI is required for MVP; the relation DTO reserves neutral/allied/hostile values for later diplomacy. Initially, self is friendly and other commanders are rivals subject to protection; civilization does not confer friendship.

Scouting is a timed fleet mission, not an instant arbitrary enemy lookup. A scout obtains only the report allowed at its legal observation point; hostile arrival can expose it to combat under the normal stance rules. Mining requires a legally present, unreserved fleet at an accessible field. Reserve a bounded extraction amount when a cycle starts so two miners cannot overdraw a shared reserve. If combat reserves that fleet or access is lost before the cycle completes, interrupt the cycle under a pinned yield/refund rule (initial proposal: no uncompleted yield and release the unmined reservation). Completed cycles settle before same-tick arrivals according to the common priority table.

## Capture and combat

System ownership is the only transferable territory unit in V1. Planets inherit it and borders derive from it. A legal fleet captures an empty neutral system by holding it through the capture deadline. Optional neutral garrisons use the same combat machinery with an unowned NPC defender and a published difficulty category; they are distinct from strategic bot commanders.

Against an occupied system, reserve the participating attacker and available defending ships, freeze both rosters, and start a two-sided Battle Lab V2 engagement. The strategic engagement runs automatically and resolves even if nobody watches. A victory begins capture if eligible; it does not bypass the hold/protection rules. Defeated/destroyed units, retreat destinations and any permitted salvage settle in the same result transaction. Draw/budget exhaustion cannot grant victory: use a versioned stalemate outcome and legal retreat/hold policy, preserving damage only when produced by a valid engine result.

There is one engagement per system. Same-owner arrivals may combine only before a battle snapshot is frozen. Later reinforcements wait for that engagement's settlement and can participate in the next one. Multiple hostile attackers form a deterministic challenge queue; no automatic alliance and no unsupported three-sided engine match. Pending challengers reserve their arriving fleet, consume a bounded queue slot, and cannot be in another battle. After each settlement, re-evaluate control and the next challenge.

Two fleets reaching a neutral system together do not both receive it: ordered arrival processing establishes the first provisional claimant, then the second challenges it before capture completion. This gives tie order strategic significance; run symmetric side/order tests and publish the one-second tick rule. See the complete concurrency matrix in [PVP_SECURITY_MODEL.md](PVP_SECURITY_MODEL.md).

## Homeworld safety and recovery

Recommended MVP policy: a permanently reserved, non-capturable home system with limited production/storage and no offensive attacks launched while a special recovery protection is active. Outlying territory remains fully contestable. Decide whether attacks on home systems are prohibited entirely; the simplest prototype prohibits them, while recovery occurs after loss of the external empire.

Do not create endlessly regrantable free fleets. Recovery uses normal baseline income/building and, if playtests require a stipend, a versioned once-per-cooldown lifecycle grant recorded in the same ledger for humans and bots. A protected player cannot use recovery protection to stage attacks from invulnerable fleets. Limits on home production/storage/fleet concentration need simulation to prevent turtling from dominating.

Track ACTIVE, RECOVERING and INACTIVE membership explicitly. With permanent homes there is no permanent human elimination in MVP; reports still count external wipeouts and recovery time. Simulator scenarios can test an alternative capturable-home/respawn policy, but do not mix policies inside a season or silently implement it instead of the selected rule.

## Population and inactivity

Population measures distinguish registered memberships, recent human activity, active bots and safely reusable slots. Provisional policy: bots fill a target density, with human reservations counted before scheduling replacement. Use hysteresis and minimum residency to avoid repeated spawn/retire cycles.

A human becoming inactive retains ownership and normal vulnerability outside home protection. Do not secretly give their account to an aggressive bot. A later, owner-approved abandonment rule may move long-inactive memberships into a retirement sequence after notice, evacuating through legal movement and preserving pending battles. Guest identity retention and inactivity eviction are different policies and must be approved before public launch.

## Scores and seasons

For an initial leaderboard use time-held non-home systems as the primary score, with current territory and battle record as separate public statistics. Accumulate territory-time at ownership changes/checkpoints; do not reward rapid reciprocal capture farming. Starting homes grant no conquest points. Publish score timing and a stable tie-break; do not infer score from exact wealth or private fleet composition. Show bots explicitly and provide human-only and all-commander standings.

Season length is open; test 7-day and 30-day scenarios before choosing. At a predeclared cutoff stop new admissions and new orders. Settle events due at or before cutoff, wait for required combat results, then cancel later jobs/orders under a published policy and freeze final scores. Archive receipts/reports under the old season; initialize a new graph and starter memberships only through new-season admission. Old keys and queued requests cannot affect the new season. No account wipe, cross-season wealth transfer or destructive production reset script is part of this pass.
