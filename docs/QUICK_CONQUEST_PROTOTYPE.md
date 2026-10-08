# Quick Conquest local prototype

The economy/defense update implements `prompt_03.txt`; exact balance, verification and limitations are recorded in [ECONOMY_DEFENSE_BALANCE_REPORT.md](ECONOMY_DEFENSE_BALANCE_REPORT.md).

Phase 2 originally implemented the owner's `prompt_02.txt`. This is a gameplay validation build, not the future persistent Campaign or production multiplayer architecture. The existing React/Vite dashboard, SVG camera, territory geometry, visual palette, event navigation and asset catalog were extended rather than discarded.

## Match and galaxy

- One human, seven clearly labeled local AI commanders; DEV can replace the human with an eighth bot. Eight civilizations have visual identities but identical mechanical starting conditions. No teams or alliances.
- Normal duration: **2,400 simulated seconds**. Quick Test: **600 seconds**. DEV also supports 20/30/60 minutes. ×1/×2/×5/×10 advance the same rules clock. Short-duration presets proportionally move phase/objective schedules; build, travel and combat balance remains in simulated seconds.
- **28 star systems**: eight protected outer homes, eight safe initial frontier systems, eight contested middle systems, four Core systems. Homes have two outbound routes. Every commander has equal resources, hulls, home output and nearby opportunity categories.
- A seeded, perturbed sector layout keeps starts approximately evenly spaced, with shared approaches into the middle and Core. All homes have two routes; the connected graph is symmetric in opportunity, with modest travel differences from geometry. Planet appearances, stars, belt counts, strategic placement, personality allocation and objective sites vary deterministically.
- Each system has a star, 2–4 planets (homes have three), 0–2 asteroid fields (homes/frontier have one), optional facilities and present fleets. The lane graph connects **systems**, never planets. Controlling a system controls all its worlds and output. For the default seed there are 118 internal worlds/fields/facilities (81 planets, 29 fields, eight facilities), plus 28 stars.
- Homes cannot be captured, attacked, entered or used as transit by foreign fleets. Their output is permanent; they do not score or count toward domination.
- Capture requires **20 consecutive seconds** with only one commander's occupying fleets and no hostile presence, including operational planetary defenses. Scouting-only or withdrawing fleets do not initiate capture. Any hostile presence interrupts occupation, including third parties waiting for combat.

## Economy and production

Every commander starts with **1,800 Credits / 1,100 Alloy / 600 Fuel**, an expedition of **5 Frigates + 2 Destroyers**, and a prospecting fleet of **2 Frigates**. Combined starting power: 2,800.

| Source   | Credits/min | Alloy/min | Fuel/min |
| -------- | ----------: | --------: | -------: |
| Home     |         360 |        90 |       30 |
| Frontier |         150 |        25 |        8 |
| Middle   |         200 |        40 |       12 |
| Core     |         260 |        55 |       16 |

Credits finance construction. Alloy is the main shipbuilding constraint. Fuel pays for movement. Base output is shown per system; the top Credits rate includes current territory and applicable buffs.

Mining requires friendly control and an asteroid field. Choose Mine once or Continue mining: each 40-second cycle yields 90 / 108 / 135 / 162 base Alloy in Home / Frontier / Middle / Core systems. Titanium and the temporary Alloy Surge modify actual yield. Mining provides no Fuel. One extraction fleet may be assigned per system, including inbound orders, regardless of belt count. Repeat orders run until cancelled, displaced, attacked or ownership is lost; interrupted cycles award nothing and combat requires a new mining order afterward. Deposits do not deplete. Richness is symmetric by starting region, with stronger opportunities toward contested territory.

| Class       | Credits / Alloy | Base build |  Hull | Attack/tick | Armor | Power | Speed | Role                           |
| ----------- | --------------- | ---------: | ----: | ----------: | ----: | ----: | ----: | ------------------------------ |
| Frigate     | 240 / 150       |        25s |   180 |          12 |     1 |   240 |  1.12 | Cheap, fast expansion          |
| Destroyer   | 480 / 280       |        42s |   430 |          27 |     2 |   560 |  1.00 | Escort killer / general combat |
| Cruiser     | 1,000 / 600     |        75s | 1,050 |          62 |     4 | 1,250 |  0.90 | Sustained line combat          |
| Dreadnought | 2,100 / 1,400   |       150s | 2,500 |         135 |     7 | 2,700 |  0.75 | Heavy commitment               |

Two production berths process a FIFO queue of up to ten ships. Costs are paid when queued. Quantity controls accept 1/2/3/5. Completion adds actual hulls to reserve; reserve allocations form fleets or reinforce ships at the home shipyard. Maximum five fleets per commander, 32 hulls per fleet. Home repairs restore 1.2% of maximum hull per simulated second. Mobile home repair remains free; stationary planetary defenses use paid timed repairs.

Movement costs 12 Fuel per hop plus 3 / 6 / 12 / 20 per Frigate / Destroyer / Cruiser / Dreadnought per hop, before the existing 8% Logistics discount. The full route is paid on ordering; retreat also pays for its return route. Travel is physical along each lane, at 16 map units/sec divided by the slowest hull's speed factor, with a 20-second minimum per hop. A route traverses all intermediate systems; hostile stationary fleets stop it and start battle. Ordinary orders cannot redirect fleets while travelling. The UI previews the full route and total travel time, then shows each current leg's countdown.

## Combat and player commands

Combat occurs on the galaxy map. Every one-second tick snapshots both sides' volleys, applies them simultaneously, removes destroyed hulls and recalculates remaining power. Power reflects surviving hull fractions and is an estimate, not an instant victory comparison.

Damage per shot is `max(1, attack − target armor) × stance offense × target stance defense × class matchup × objective buff × seeded variation × escalation`. Seeded variation is 0.94–1.06. Destroyers deal ×1.3 against Frigates. Dreadnoughts deal ×0.75 against Frigates. Each living hull attacks once per tick, including a hull destroyed by the simultaneous return volley. After 30 seconds, damage gradually increases to terminate protracted engagements.

| Command        | Effect                                                                          |
| -------------- | ------------------------------------------------------------------------------- |
| Balanced       | Default damage and targeting                                                    |
| Aggressive     | ×1.22 offense; ×1.18 damage taken                                               |
| Defensive      | ×0.82 offense; ×0.78 damage taken                                               |
| Focus capitals | Target the highest available class first                                        |
| Focus escorts  | Target the lowest available class first                                         |
| Defend         | Hold the current system; automatically fight incoming enemies                   |
| Retreat        | Prepay homeward Fuel; endure six seconds of fire; then travel to protected home |

Typical similar-sized engagements take tens of seconds. Very uneven forces can resolve faster. Multiple systems fight simultaneously. Two owners fight at one location at a time; additional owners wait for the next deterministic engagement. Arriving fleets of an active owner reinforce that side. Neutral owners sort first, then commander IDs: this is reproducible but not a production fairness mechanism. No formal alliances, battle instancing, unit steering or Battle Lab V2 integration.

Retreat is not a teleport. Surviving ships physically traverse a valid route; another hostile fleet along that route can intercept them. Sufficient withdrawal Fuel is required. Uncommitted fleets can also order retreat home. Bot reaction delay applies to withdrawal decisions too.

## Pirates, strategic sites and major objectives

Eight middle systems initially host seeded-strength Black Ledger pirate forces: **Raider Camp** (3 Frigates), **Pirate Patrol** (3 Frigates + Destroyer), or **Stronghold** (4 Frigates + 2 Destroyers). Defeating one fleet pays **450 Credits / 120 Alloy / 45 Fuel / 75 Dominion** exactly once. The initial distribution is rotated by seed, not perfectly equal by individual encounter. One surviving pirate fleet may raid a neighboring owned, non-home system every 210 seconds. Pirates do not respawn continuously or control planets themselves.

Each middle sector has a strategic facility. The seed rotates six bonus types across eight sites; Forge and Relay occur twice. Duplicate bonuses **do not stack**.

| Facility              | Ownership bonus                  |
| --------------------- | -------------------------------- |
| Helios Forge          | +8% construction progress/sec    |
| Nexus Relay           | +7% fleet travel speed           |
| Deep Sensor Array     | One extra hop of fleet detection |
| Titanium Belt         | +10% passive and mined Alloy     |
| Ancient Logistics Hub | −8% movement Fuel, rounded up    |
| Trade Nexus           | +10% Credits income              |

**Ancient Guardian:** a stationary original orbital machine at one seeded Core site. It awakens at 37.5% elapsed (15:00 normal). Force: 2 Destroyers + 3 Cruisers + 1 Dreadnought, base power 7,570. The commander landing the lethal fleet kill receives **400 Dominion and +10% fleet damage for 180 seconds**. Participation is recorded for commanders starting engagements with it. The system still requires occupation to capture. It never respawns.

**Void Leviathan:** an original armored cosmic organism appearing at 62.5% elapsed (25:00 normal). Force: 4 Cruisers + 2 Dreadnoughts, power 10,400. It chooses connected non-home destinations at 65-second decision intervals while outside combat and physically travels between them. It attacks hostile forces and blocks capture while present. Defeat awards **650 Dominion, +10% speed and +8% damage for 180 seconds**. It never respawns. Neutrals can fight each other; if a neutral destroys an objective, no commander gets its score/buff.

Major-objective lore/art is original Space Wars work. No characters or names from unrelated franchises were copied. Guardians/Leviathans use the common hull resolver as a prototype shortcut, not a dedicated boss AI or component damage model.

## Phases, events and victory

| Normal time | Phase / event                                        |
| ----------- | ---------------------------------------------------- |
| 0–5m        | Opening                                              |
| 5–15m       | Expansion                                            |
| 10m         | Alloy Surge: +40% asteroid Alloy extraction for 120s |
| 15–25m      | War; Ancient Signal awakens Guardian                 |
| 25–35m      | Escalation; Cosmic Disturbance spawns Leviathan      |
| 34m         | Core Ascendancy warning                              |
| 35–40m      | Endgame; Core Ascendancy doubles Core score          |

These are three principal opportunity events plus the announced endgame escalation. No frequent punitive random events are added. Event sites, roaming choices and pirate raids are seeded.

Dominion accumulates every second, with rates expressed per minute:

`score += (12 × ordinary external systems + 20 × strategic systems + 32 × Core systems × endgame multiplier) / 60`

The categories are exclusive. Homes give zero. The Core multiplier is 1 normally and 2 in Endgame. Add 75 per pirate fleet, 400 per Guardian kill, 650 per Leviathan kill, and **2 per enemy commander hull destroyed**. Neutral hull kills do not add this PvP kill score. Score is retained after territory loss; territory-time is intended to matter more than a last-second land grab.

At the timer cutoff, highest Dominion wins. Exact-score ties use current external territory, then commander ID. The ID tie-break is a documented local simplification. An early domination win requires **12 of the 20 capturable systems (60%) for 75 consecutive seconds**. Homes are excluded. Dropping below 12 resets the countdown. The warning identifies the contender and remaining time. A domination winner ranks first even if someone else has more historical score.

The final screen shows all eight standings, score, territory, hulls built/destroyed, the selected commander's peak territory, battle/win totals, pirate clears, Guardian participation, Leviathan kills, resources mined, recovery count, objective winners and score history. Play Again / New Seed / Return to Dashboard restart local state.

## Recovery and intelligence

A commander who previously held external territory and loses it all receives **Emergency Mobilization**: +20% home income and +15% Frigate/Destroyer construction progress for 120 seconds. Recapturing any external system cancels it. A five-minute cooldown and a new territory-loss transition are required to re-trigger. Starting with only a home does not grant recovery. No free fleet is created; bots follow the same rule.

Ownership and topology are public. Friendly systems/fleets reveal neighboring systems, with an extra hop from Sensors. Detected enemy power is rounded into a 70–130% range; completed scouting tightens it to 90–110% for 90 seconds. Exact enemy composition is not shown in the inspector. Own rosters are exact. Active participant battles show live force power; unrelated battle reports use approximate power. Public major-objective markers remain visible. This is presentation/policy filtering within a local state object, **not network-grade secrecy**.

## Local AI and chat

Bots share human construction, fleet formation, reinforcement, movement and retreat commands. They have the same resources, home repair, build timers, travel, mining, combat and recovery. No resource gifts, instant builds, teleportation, LLM calls or network service exists.

Weighted utility considers public territory, strategic value, lane distance, detected strength bands, friendly reinforcement, risk, mining, nearby owned territory under attack, objective opportunity and late Core pressure. Unknown systems use a conservative generic threat estimate. Bots save toward a chosen ship class, including capital hulls. They react every **9–17 simulated seconds**, perturb risk estimates and utility with seeded noise, and choose a second-ranked candidate roughly 9% of the time.

- Expansionist: prefers unclaimed systems.
- Aggressor: accepts more risk and prefers rival territory.
- Industrialist: favors mining and secures extraction sites; all profiles mine according to Alloy demand, fleet suitability, travel and danger. Repeat orders avoid repeated clicks.
- Turtle: prioritizes visible threats to owned territory.
- Opportunist: prefers weak resistance and exposed objectives.

Seven profiles are assigned from a seeded shuffled pool with duplication. Bots can retreat, return weakened fleets to reinforce, rebuild after destruction, and attack major objectives when estimated capacity permits. Turtles commit up to 32% of acquired-plus-starting Alloy to defenses, Industrialists 25%, Opportunists 22%, Expansionists 18% and Aggressors 10%. These are spending ceilings, not grants. Bots prefer exposed valuable systems, preserve a shipbuilding reserve, repair damaged installations, upgrade after early expansion, and avoid visible imminent overwhelming attacks. Fortifications enter their threat estimates. Their policy implementation has access to the local world for topology/commands, but enemy-force decisions are taken through visibility/estimate helpers; it is not the strict future server observation DTO boundary.

Global Chat accepts human text as ordinary escaped React text, limited to 240 characters. A curated context-aware bot message appears every 65–129 seconds. AI messages are labeled; chat has no diplomacy effects and does not transmit anywhere.

## DEV, determinism and implementation limits

DEV is visually separate: seed, regenerate, restart, pause, ×1/×2/×5/×10, next-match duration, eight-bot observer, resources, reveal, forced objectives, phase simulation, full-match simulation and bot inspector (profile, economy, fleets, goal, target reasoning). Phase controls execute the intervening ticks rather than editing the clock or granting ships. Dev resource grants are explicitly isolated UI actions and not called by bot policy. Debug reveal does not improve bot intelligence.

Rules use one-second ticks plus a fractional browser accumulator; a given seed and timed action sequence repeats. Browser animation interpolates within a tick and is not authoritative. Background tabs pause. No `Math.random()` exists in gameplay. New Seed intentionally constructs a new seed from wall-clock time, then all gameplay uses seeded randomness. Snapshots of score/territory are recorded every 30 seconds. Headless execution calls the identical tick engine.

Known shortcuts: memory-only session; no independent planet warfare; unlimited deposits; simple repairs; no fleet merge/split away from home; generic cross-faction hulls; neutral objectives represented as common hull groups; two-side engagement ordering; modest intelligence bands; no procedural three-dimensional orbit physics; no collision-free map-label solver; no audio; no elaborate save history. These are deliberate prototype boundaries. Build costs and all core timings/rewards are centralized in `src/demo/balance.ts`; policy heuristics remain in `ai.ts`.

Supabase, authentication, real multiplayer/chat, server, matchmaking, persistence, payments/ads, guilds, alliances, progression/research, diplomacy, persistent Campaign, mobile-native work and full Battle Lab V2 remain postponed. Stop here for owner review.

## Planetary defenses

Each planet supports one Orbital Defense Station and one Planetary Railgun Battery, each up to level 3. Every primary home planet starts with both at level 1, free; homes remain protected. Build, upgrade and repair through the existing system inspector’s planet selector. One active job per system and two per commander. Costs/times, stats and lifecycle are listed in [the balance report](ECONOMY_DEFENSE_BALANCE_REPORT.md).

Structures use the same simultaneous combat tick and escalation as ships, remain stationary, retain damage, and block capture while operational. Stations fire every tick with an escort bonus; railguns fire every four ticks, prefer large targets, and do reduced damage to small ships. Existing installations remain combat-capable while upgrading or repairing, but work pauses whenever hostile stationary forces are present. Upgrades preserve condition fraction; repair restores hull only on completion. Destruction cancels paid jobs with no refund. Rebuilding starts at level 1. Capture clears ruins and incomplete jobs, with no inherited defenses or salvage. Additional planets cost 50% more per planet index (1×, 1.5×, 2×, 2.5×); effects add rather than multiply.
