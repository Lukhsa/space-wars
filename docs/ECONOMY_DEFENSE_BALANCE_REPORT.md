> Historical rules/report. The current playtest uses [planet conquest, civilian mining and forward shipyards](PLANET_PLAYTEST_REPORT.md). Values and measurements below describe the earlier implementation.

# Economy and planetary defense balance pass

Implemented 8 October 2026 for the local eight-player Quick Conquest prototype. Branch: `feature/economy-planetary-defenses`. Baseline: `a31e203`. No backend, Supabase, authentication, multiplayer or deployment work is included.

## Economy

Values remain in `src/demo/balance.ts`. Starting resources and ships are unchanged. The objective is modest protected rebuilding with extraction funding sustained military activity.

| Source | Credits/min, unchanged | Alloy/min: old → new | Fuel/min: old → new |
| --- | ---: | ---: | ---: |
| Home | 360 | 240 → 90 | 100 → 30 |
| Frontier | 150 | 55 → 25 | 35 → 8 |
| Middle | 200 | 90 → 40 | 45 → 12 |
| Core | 260 | 100 → 55 | 55 → 16 |

| Ship | Credits | Alloy: old → new | Construction | Hull / attack per tick / armor |
| --- | ---: | ---: | ---: | --- |
| Frigate | 240 | 140 → 150 | 25s | 180 / 12 / 1 |
| Destroyer | 480 | 280 → 280 | 42s | 430 / 27 / 2 |
| Cruiser | 1,000 | 600 → 600 | 75s | 1,050 / 62 / 4 |
| Dreadnought | 2,100 | 1,300 → 1,400 | 150s | 2,500 / 135 / 7 |

Frigates retain speed and cheap deployment; Destroyers retain their existing ×1.3 anti-Frigate damage; Cruisers remain durable line ships; Dreadnoughts retain high commitment and their ×0.75 damage against Frigates. The modest Frigate/Dreadnought cost increases discourage cheap swarm replacement and earliest capital rushes without replacing the resolver. These roles are not a claim that every equal-cost composition is equally effective.

Protected passive Alloy buys a replacement Frigate approximately every 100 seconds after initial resources run out. Home extraction adds 135 Alloy/min, reducing that resource accumulation interval to 40 seconds. A controlled 20-minute identical-economy test produces over 50% more ships with extraction. Starting resources still support immediate shipbuilding without mining. In the tournament, 162 of 240 commanders built a Dreadnought; their average first completion was 27:55. Humans can save for one earlier; no research gate was introduced.

### Mining

The old cycle paid 200 Alloy + 65 Fuel every 40 seconds but required a new command each time. New cycles remain 40 seconds and pay only Alloy:

| System region | Base yield/cycle | Base Alloy/min |
| --- | ---: | ---: |
| Home | 90 | 135 |
| Frontier | 108 | 162 |
| Middle | 135 | 202.5 |
| Core | 162 | 243 |

All eight homes and their immediate frontiers have identical extraction categories. Seeded inner belt placement varies; moving inward offers richer, contested sites. Multiple belt artworks in one system represent one shared extraction capacity. One fleet may be assigned to extract per system, including inbound orders. This bounds repeat income without depletion bookkeeping or stacking mining fleets on the protected home.

Players choose **Mine once** or **Continue mining** in the existing order dialog. Continue mining repeats full cycles while stationary, friendly-owned, legal and out of combat. A new order or Cancel mining discards partial progress. Hostile combat, retreat or ownership loss cancels the order and resets its progress; combat does not silently resume mining afterward. Completed cycles pay exactly once. The selected fleet shows its order, actual modified yield, cycle time and progress. A second operation on the same system is rejected before charging Fuel.

The +10% Titanium bonus and temporary +40% Alloy Surge are retained and affect extraction; the inspector and order preview use the same yield calculation as payout. Passive Titanium, Credits Trade, recovery and other strategic bonuses are retained. Recovery still grants +20% protected income and +15% light construction for 120 seconds with the existing 300-second cooldown and loss-of-territory trigger; it does not grant repeatable lump-sum resources.

Pirate salvage changed from **450 C / 240 A / 90 F** to **450 C / 120 A / 45 F**. Dominion remains 75. This keeps pirates worthwhile without making salvage a substitute for asteroid control. No new salvage is awarded for defenses or ownership flips.

### Fuel

Movement now costs, per hop, **12 + 3 per Frigate + 6 per Destroyer + 12 per Cruiser + 20 per Dreadnought**, rounded after the existing 8% Logistics discount. The full route is paid at issue time. Retreat pays the return route through the same calculation. Travel times/speeds remain unchanged. A two-Frigate miner costs 18 per hop; the starting seven-ship expedition costs 39; four Cruisers and two Dreadnoughts cost 100. Long expeditions therefore need an operating reserve.

An initial pass still left 2,112 Fuel per commander and never went below 287. Reducing passive Fuel further and increasing hull-based movement charges produced a final average reserve of **540**, with some temporary near-zero budgets. Fuel recovered through protected income and all matches completed. The fixed-step rules reject unaffordable moves atomically. The evidence establishes usable budgets in these bot policies, not immunity from a human stranding a very large fleet after spending all Fuel.

## Planetary defenses

Every planet has at most one slot for each type. Ownership remains at star-system level. Maximum level is 3. The primary planet of each of the eight protected homes starts with both structures at level 1, free; protected homes remain non-attackable, non-capturable and closed to foreign transit.

These are **incremental build/upgrade prices for the primary planet**, not cumulative level prices:

| Installation | Level | Credits | Alloy | Time | Hull | Attack | Armor | Estimated power |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Orbital Defense Station | 1 | 450 | 250 | 60s | 800 | 28/tick | 3 | 850 |
| Orbital Defense Station | 2 | 750 | 450 | 90s | 1,200 | 43/tick | 4 | 1,300 |
| Orbital Defense Station | 3 | 1,200 | 750 | 130s | 1,700 | 62/tick | 5 | 1,900 |
| Planetary Railgun Battery | 1 | 400 | 220 | 45s | 420 | 160/shot | 2 | 700 |
| Planetary Railgun Battery | 2 | 700 | 400 | 80s | 630 | 240/shot | 3 | 1,050 |
| Planetary Railgun Battery | 3 | 1,100 | 650 | 120s | 900 | 350/shot | 4 | 1,550 |

Fuel is not required. Planet 2/3/4 build and upgrade prices multiply by **1.5 / 2 / 2.5** and round upward. Durations are unchanged. There is one active defense job per system and at most two per commander. Bots use the same command validation and pay the same prices. A job pays once when accepted; retries while its lane is occupied cannot spend again. Structures do not consume mobile fleet or ship slots.

### Combat and lifecycle

- Stations attack every simulated second and deal ×1.2 against Frigates and Destroyers. Their durability and broad weapons provide general protection. No separate missile/interception subsystem was invented.
- Railguns fire at battle start and every four ticks afterward, prefer the highest target class, and deal ×0.35 against Frigates/Destroyers. They are less durable than stations. Capital focus therefore has a real cost; escorts remain useful.
- Both participate alongside friendly stationed fleets in the existing simultaneous-volley, seeded-variation, stance and escalation model. Attackers can select their existing focus stances; installations are eligible targets. Defenses are direct combatants referencing planetary hull state, never movable entries in the fleet registry.
- Active hostile defenses intercept through-routes and prevent capture. After fleets and operational defenses are gone, the normal 20-second occupation begins. The same combat system clears remaining structures, so no separate siege screen or inaccessible target remains.
- Damage persists. Repairs cost **25% of that level's primary-planet price × missing hull fraction**, rounded up for each resource. Repair time is **max(20s, level construction time × missing fraction rounded up)**. Hull is restored only on completion. There is no extra-planet multiplier on repair.
- Upgrades require each prior level, retain the old installation until completion, and preserve its current hull percentage when the new level activates. They are not a free heal. Existing installations can still fight during upgrading/repairing; all construction progress pauses whenever hostile stationary forces are present.
- Destruction sets hull to zero and cancels the paid job without refund. Ruins can be rebuilt at level 1 for the normal level-1 price/time; they cannot be repaired into a free high-level installation.
- Capture clears destroyed slots and incomplete jobs. No inherited operational defenses, duplicated installations, construction refunds or defense salvage are granted.

### Bots

All profiles value mining based on Alloy reserves, pending production, field yield, travel, danger, competing expansion and fleet suitability. They use repeat orders, reserve small fleets for extraction when useful, leave mining when reserves are sufficient, and avoid reinforcing a stationary miner with the whole shipyard reserve. Industrialists retain a smaller mining preference after an intermediate policy won 11/30 matches.

Defense spending ceilings relative to initial plus produced/mined Alloy are Turtle 32%, Industrialist 25%, Opportunist 22%, Expansionist 18%, Aggressor 10%. These are limits, not income bonuses. Bots retain a shipbuilding reserve, prioritize strategic/Core/asteroid and exposed border systems, build both types, upgrade after the opening and repair surviving damage. They concentrate investment on a system's primary planet rather than automatically fortifying every world. Visible hostile forces arriving before a basic station can finish count against the investment decision. Their attack/retreat estimates include hostile fortification power; stronger resistance can divert them elsewhere.

## Simulations and correctness

The baseline was recorded before balance edits, then reproduced from an ignored snapshot of commit `a31e203` to add class/progression metrics. Final comparison: **30 original + 30 final matches**, seeds **BALANCE-0 through BALANCE-29**, eight bots, 2,400-second limit, seeded personality/spawn combinations. Intermediate 30-match tuning batches were used for Fuel and Industrialist adjustments; the following table describes only the final selected balance.

Full data: [baseline](ECONOMY_DEFENSE_BASELINE.json), [final matches](ECONOMY_DEFENSE_SIMULATIONS.json), [summary](ECONOMY_DEFENSE_SUMMARY.json), [700 controlled siege trials](DEFENSE_COMBAT_EXPERIMENTS.json). Match files include per-commander Dominion, captures, classes built, ships remaining, resources, mining, defenses, repairs, objective outcomes and recoveries.

| Metric | Original | Final |
| --- | ---: | ---: |
| Matches completed | 30/30 | 30/30 |
| Timer / domination wins | 30 / 0 | 30 / 0 |
| Mean ships built per commander | 53.04 | 32.23 |
| Mean ships lost, excluding neutrals | 56.33 | 33.63 |
| Mean Dominion | 2,108 | 2,082 |
| Mean captures | 32.82 | 22.35 |
| Mean passive Alloy | 17,259 | 7,194 |
| Mean extracted Alloy | 101 | 6,424 |
| Extraction fraction of acquired Alloy | 0.58% | **46.76%** |
| Mean mining share of fleet-seconds | 0.61% | 53.46% |
| Mean ending Credits / Alloy / Fuel | 4,551 / 379 / 6,297 | 11,040 / 349 / 540 |
| Mean spent Credits / Alloy / Fuel | Not instrumented | 24,203 / 14,490 / 2,361 |
| Guardian / Leviathan kills | 20 / 6 | 16 / 19 |
| Commanders rebuilding external territory after a late wipe | 118 | 96 |
| Longest observed active battle | 33s | 30s |

Acquired Alloy means passive + extraction + pirate salvage, excluding starting stock. This aggregate is a tuning measure, not a guarantee for every commander. Original passive income is sampled at tick boundaries; final telemetry records actual production. Original extraction is reconstructed exactly from payout events; mining fleet utilization is sampled before ticks. Final telemetry records active extraction ticks. The old engine lacked expenditure telemetry; that column is intentionally unavailable instead of claiming an exact baseline measurement. Comeback means zero external territory in a 30-second history sample at/after minute 10 and positive territory at the end; it does not necessarily mean recovering a competitive score position.

Final completed production totals: **2,968 Frigates, 2,336 Destroyers, 2,177 Cruisers, 254 Dreadnoughts**. Defensive totals: **1,844 built, 169 upgraded, 1,356 destroyed, 90 repairs**, costing 3,024 repair Alloy. There were **2,057 commander participations in defense battles**, not 2,057 unique engagements, and 149 victories with surviving defending structures. **4,765 captures changed an already-owned system**; border turnover remains frequent.

| Personality | Commander appearances | Baseline wins | Final wins |
| --- | ---: | ---: | ---: |
| Expansionist | 60 | 8 | 7 |
| Aggressor | 60 | 5 | 6 |
| Industrialist | 30 | 4 | 9 |
| Turtle | 30 | 3 | 4 |
| Opportunist | 60 | 10 | 4 |

All eight spawn seats won at least once. Final wins by seat 0–7: **4, 3, 7, 1, 4, 4, 3, 4**. Thirty seeds are insufficient to certify positional or personality parity. Industrialist remains a notable advantage rather than a solved balance question.

The final tournament checks finite nonnegative resources on every tick, exact final resource conservation against starting resources/actual production/mining/salvage/spending, unique defense slots and level limits. No failures occurred. Resource conservation checks do not use rounded report values.

### Fortification experiments

Twenty seeds for seven fleet compositions against five defensive scenarios give **700 trials**. The small 5-Frigate/2-Destroyer force captured an unfortified 4-Frigate/2-Destroyer garrison in 20/20 trials but failed in 20/20 when the same garrison had a level-2 station and railgun. Approximately 2,800–3,160-Alloy forces defeated that combined position, at differing losses/damage and movement costs. Twenty Frigates lost an average 6.15 hulls there; ten Destroyers lost none. This does not establish that mixed fleets always beat specialized forces.

Maximum level-3 installations on every generated planet stopped every approximately 3,000-Alloy force. A 32-ship mixed siege fleet costing 22,580 Alloy captured those positions in **20/20 trials**. Additional-planet escalating prices make such fortresses comparably large investments. The regression suite independently tests maximum multi-planet fortification capture. Fortifications add a real commitment requirement but are not invulnerable.

## Interface and verification

The existing dashboard, map, asteroid art and navigation remain. The system inspector adds a compact planetary-defense section with planet selection, both original Web artworks, levels, hull, construction state/progress, cost/time, Build/Upgrade/Repair actions and attack status. Small close-zoom planetary markers show installation type, level, construction or ruins. Battles remain on the strategic map. Mining adds a mode selector and cancel/status controls. Displayed mining yields include current bonuses.

Automated browser coverage includes free home structures, another planet's price multiplier, paid construction and upgrades, railgun construction, visible bot construction, combat participation, damaged survivors, paid repairs, destruction, defended capture/ruins cleanup, repeat cycles, cancellation and shipbuilding requiring mined Alloy. Existing map/asteroid, phone, production, chat, retreat, objectives and 10/40-minute clock-completion tests remain included. Test scenario injection is confined to a Vite test entry under `tests/fixtures`; the production entry always generates a normal match and has no state-injection URL or global control.

| Quality gate | Result |
| --- | --- |
| TypeScript | Passed |
| ESLint | Passed, zero warnings |
| Unit tests | 51 passed, including 20 new economy/defense cases |
| Browser tests | 14 passed, including full 10- and 40-minute clock runs |
| Production build | Passed; JS 341.43 kB / 107.49 kB gzip, CSS 60.69 kB / 14.18 kB gzip |
| Final bot tournament | 30/30 completed; nonnegative finite resources, conservation and unique-slot checks passed |
| Controlled siege trials | 700 completed |
| Artwork | Both copies byte-identical to reference; loaded in browser |

The original single 100-seed map-layout stress case exceeded its 15-second timeout on this machine in two late runs. Its identical 100 seeds and assertions now run as four 25-seed batches, each retaining the 15-second timeout. The complete unit suite then passed in 20.18 seconds. No layout rule or assertion was removed.

Screenshots: [construction](screenshots/planetary-defense-construction.png), [combat](screenshots/planetary-defense-battle.png). The inspected construction screenshot shows the compact inspector, both loaded original artworks, intact textured celestial bodies and asteroid fields.

Reproduce with `node scripts/balance-tournament.mjs --baseline`, `node scripts/balance-tournament.mjs`, `node scripts/summarize-balance.mjs`, `node scripts/defense-experiments.mjs`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`, and `npm run build`. The baseline command reads committed source using `git show` into ignored `.tools/balance-baseline`; it does not switch/reset the working tree. This Windows session required the installed Node runtime outside the restricted shell and the existing `.tools/browsers` Chromium directory.

## Remaining risks and owner playtesting

1. **Industrialist strength:** 9/30 wins despite only one seat per match, after reducing its preference. Test a separate holdout seed set and human counterplay before further tuning; do not overfit this same tournament.
2. **Credits surplus:** average 11,040 unspent Credits. Alloy is deliberately restrictive, but Credits may need a later reduction if humans also stop making credit-related decisions. No arbitrary new sinks were added.
3. **Fuel commitment:** some budgets approach zero. Protected income permits recovery; very large distant fleets require deliberate reserves. Human retreat affordability needs attention.
4. **Comebacks and churn:** fewer sampled comebacks than baseline, and many ownership flips remain. They are not stuck battles or duplicate rewards, but human pacing may still feel repetitive. Recovery duration/bonus was deliberately retained rather than granting exploitable windfalls.
5. **Heavy-ship efficiency:** specialized Destroyer/Cruiser forces remain efficient in controlled battles; Dreadnought-only fleets still have strong durability. Railgun targeting and operating costs add tradeoffs, not a complete counter system. Do not interpret diverse bot construction as proof of optimal class balance.
6. **Objective pressure:** Guardian fell in 16/30 and Leviathan in 19/30; both remain reachable and neither was removed. No domination wins occurred in the final set, though correctness tests cover domination and intermediate tournaments reached it.

These are human playtest priorities, not reasons to begin backend/multiplayer work. No further implementation requiring owner approval was undertaken.

## Reference safety

Web artwork and `src/game/frontier/installations.ts` were read only. Web remained at `097ded6f82bffbeb0957441e75b8818e07998bef`, with no tracked source edits. Its untracked prompt filename changed externally during this session (`prompt_01.txt` initially, `prompt_02.txt` at final inspection); neither file was edited by this task. Backend was only searched/read and remained at `3cd7b32b0dd4fb1f3bfe66b6e9b73622cb70cf44` with its existing untracked `backend_prompt_02.txt` and `docs/original_prompt.txt`. Android was not used. This task wrote only to Space Wars. The two copied artwork files were byte-compared to their Web sources and recorded with SHA-256 in `public/assets/provenance.json`.
