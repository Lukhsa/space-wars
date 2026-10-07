# Phase 2 validation and review notes

Validated 7 October 2026 on Windows, Node 24.21.0, npm, Vitest and Playwright Chromium. This report concerns the **local Quick Conquest prototype only**.

## Delivered

The Phase 1 dashboard, camera, territory renderer, asset catalog and styling remain the foundation. The implementation adds a shared local rules engine, 28 seeded star systems, eight equal commanders, actual utility bots, production and reserves, ship-level tick combat, capture, mining, scouting, pirates, strategic facilities, Guardian/Leviathan objectives, scoring, recovery, chat, phase events, match completion and developer/simulation tools. Exact rules are in [QUICK_CONQUEST_PROTOTYPE.md](QUICK_CONQUEST_PROTOTYPE.md); the executable tuning source is `src/demo/balance.ts`.

## Quality gates

| Check                                          | Result                                                                                                                |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                                       | Passed; 154 packages installed; zero reported vulnerabilities                                                         |
| `npm run dev`                                  | Passed on localhost:5173; also started automatically by Playwright                                                    |
| Typecheck                                      | Passed                                                                                                                |
| ESLint                                         | Passed, zero warnings                                                                                                 |
| Vitest                                         | **26 tests passed**                                                                                                   |
| Playwright                                     | **6 scenarios passed**; final complete run approximately 108 seconds                                                  |
| Production build                               | Passed; JS 323.21 kB / 101.57 kB gzip, CSS 49.40 kB / 11.80 kB gzip                                                   |
| Normal local match                             | 40-minute match completed through the browser clock at ×10, without phase jumps, injected resources, or manual finish |
| Quick local match                              | 10-minute match completed through the browser clock at ×10                                                            |
| Bot-only matches                               | Three 40-minute seeds completed headlessly using the same engine                                                      |
| Copied assets                                  | All 32 local files matched provenance and current reference source SHA-256                                            |
| Original assets                                | 19 SVGs with checksums and a reproducible authoring script                                                            |
| Runtime errors                                 | None observed in checked browser flows or production performance samples                                              |
| Backend / secrets / runtime sibling dependency | None added                                                                                                            |

One repeat `npm ci` attempt initially encountered a Windows file lock because the running Vite server held the native Rolldown module. Stopping that Space Wars process and rerunning the clean install succeeded. This was a local tooling lock, not a dependency workaround; no force install, elevated access or reference process changes were used.

## Acceptance flows exercised

These were tool-driven browser interactions and inspected screenshots, supplemented by deterministic rules tests. They are not a human playtest study or a claim that a person played an uninterrupted 40-minute session.

| Requested flow                | Evidence                                                                                                                                            |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Start and see seven opponents | Browser standings have eight rows, with seven AI labels in normal mode                                                                              |
| Expand, mine and build        | Browser claimed Nexus, completed a home-belt extraction, queued three Frigates and formed a reserve fleet                                           |
| Pirates and map combat        | Browser entered the Battle of Caldera; simultaneous activity elsewhere remained visible                                                             |
| Stance and withdrawal         | Browser selected Defensive, ordered retreat, used the shipyard during battle, observed the countdown/travel, returned survivors home and reinforced |
| Rival borders and PvP         | Bot simulation and two-/three-owner combat tests; browser battle tray also showed other commanders fighting                                         |
| Strategic control             | Engine capture tests and bot match results show real facility ownership and bonuses; UI exposes facility details and active bonuses                 |
| Defend territory              | Shared defend order holds a system and participates in hostile arrival combat; concurrent combat/capture tests cover contested occupancy            |
| Guardian                      | Browser War activation, full-match defeat/participation statistics, and deterministic reward/buff test                                              |
| Leviathan                     | Browser Escalation appearance/marker; lane movement test, lethal assault/reward/expiry test; survived the three balance seeds                       |
| Standings and endgame         | Live score/rank, Core warning/activation, score multiplier test, browser Endgame and complete leaderboard                                           |
| Domination                    | Threshold, interruption/reset and hold-to-win tested deterministically; not reached in the three balance seeds                                      |
| Recovery                      | Transition/expiry test and 14–16 aggregate recoveries per bot match                                                                                 |
| New match                     | Browser New Seed, regenerate, restart and duration selection verified                                                                               |
| Scouting                      | Visibility bands and scout expiry tested; protected enemy homes reject foreign entry                                                                |
| Camera and layout             | Drag, wheel, minimap/home/overview, system search, pause; no horizontal overflow at 1100px and 390px                                                |
| Local chat                    | Human message sent and rendered; curated AI messages observed                                                                                       |

Unit coverage also checks same-seed equality, five-seed graph/spawn validity, prior-frame immutability, fixed-step equivalence, production costs/berths, mining payout once, reserve conservation, lane travel, protected homes, invalid quantities, simultaneous combat/casualties, third-party engagements, neutral-on-neutral objective destruction, score rates, bot budgets with zero resources, valid hull state, timer/ranking and frozen post-match commands.

## Bot-only balance observation

Full eight-player tables, remaining resources, production, kills, battles, mining, bonuses, recovery and objective results are in [BOT_SIMULATION_RESULTS.json](BOT_SIMULATION_RESULTS.json). Run `npm run simulate -- --save` to reproduce the same gameplay results (wall time varies).

| Seed        | Winner     | Dominion | Battles resolved | Peak simultaneous battles | Guardian killer | Leviathan killer | Headless wall time |
| ----------- | ---------- | -------: | ---------------: | ------------------------: | --------------- | ---------------- | -----------------: |
| ORION-7742  | Cmdr. Vex  |    3,794 |              131 |                         5 | Cmdr. Vale      | None             |              477ms |
| HELIOS-2026 | Cmdr. Vale |    3,768 |              123 |                         6 | Cmdr. Vale      | None             |              371ms |
| VEGA-28     | Ilyra      |    5,207 |              117 |                         6 | Ilyra           | None             |              332ms |

All three ended at the timer. Every commander built and expanded. Winners differed; this does **not** establish faction/spawn balance. The three-seed sample is small. Early bot production initially overspent on small hulls; it now saves toward a chosen hull class, including capital ships. No hidden resource bonuses were added.

## Performance and visuals

[BROWSER_PERFORMANCE.json](BROWSER_PERFORMANCE.json) records six-second production-preview samples in headless Chromium at 1440×1000: **60.2 FPS opening**, **60.1 FPS escalation**, median 16.7ms and p95 16.8ms frame intervals in both samples. The measured view requested 42 asset resources totaling approximately 4.97 MB decoded. No runtime errors occurred. These short samples are not a sustained guarantee, physical-GPU benchmark, cross-browser certification, or worst-case six-battle profile.

The existing direct camera-transform animation, seeded starfield memoization and owner-dependent territory cache remain. Rules advance at one-second ticks; between ticks, the UI retains system references and interpolates fleet movement at its 200ms update cadence. The scene has 28 strategic nodes rather than 160. Default seed: **81 planets, 29 fields, eight facilities and 52 lanes**.

Reviewed screenshots: [opening](screenshots/quick-conquest-opening.png), [combat/retreat](screenshots/quick-conquest-battle.png), [escalation](screenshots/quick-conquest-escalation.png), [whole galaxy](screenshots/quick-conquest-overview.png), [results](screenshots/quick-conquest-result.png). Overview labels were enlarged after inspection; selected-fleet labels no longer stack every friendly fleet name on the same system.

## Honest game-feel assessment

| Question                               | Observation                                                                                                                                                                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Does capture feel meaningful?          | It changes the border, income, score stream and ownership. The visible occupation countdown establishes a clear commitment.                                                                                                     |
| Does losing a system matter?           | It removes continuing income/score and a possible facility bonus. Homes prevent elimination. Score already earned remains, so losses do not erase the whole match.                                                              |
| Do strategic bonuses change decisions? | The modest economic/movement bonuses and higher score create identifiable targets. They need more human playtesting to establish whether 7–10% is noticeable enough.                                                            |
| Are pirates tempting?                  | They offer useful opening salvage and access to higher-value systems. Since every middle system starts guarded, they are more of a frontier gate than a fully optional side activity. This is a balance/design issue to review. |
| Does Guardian create conflict?         | It was attacked and defeated in all three seeds, with participation from competing commanders. Its 400-point reward is visible in the score history.                                                                            |
| Is Leviathan memorable?                | Its arrival, separate silhouette and roaming marker give the match a clear escalation event. It remained undefeated in the sample; contestability is not yet convincing.                                                        |
| Do bots apply pressure?                | Yes. They take territory, kill fleets, fight each other and force recoveries. Minor early encounters can occur much earlier than the nominal War phase.                                                                         |
| Can simultaneous battles be read?      | The map remains controllable, a compact tray lists engagements, and own stances/retreat remain available. Five or six battle cards require horizontal tray scrolling.                                                           |
| Is there time to think?                | Orders, travel, two production berths and capture run automatically. There is no unit micro. Some openings have 20–40 seconds of waiting between commitments; multiple fleets add decisions.                                    |
| Is mining busywork?                    | One-cycle mining avoids endless hidden behavior, but repeated mining orders can become repetitive. A future repeat toggle may be worthwhile.                                                                                    |
| Does the match build to a climax?      | Guardian, Leviathan and double-score Core activation produce a deliberate sequence. Historical score leads can still blunt late tension.                                                                                        |
| Would a player immediately replay?     | Unproven. The complete loop and different seeded outcomes support testing that question; automated results cannot establish fun or replayability.                                                                               |

## Most obvious remaining issues

- **Balance:** Fuel often becomes abundant, while Alloy constrains shipbuilding. Mining utility varies sharply by personality. Some commanders repeatedly lose/recapture small territories; recovery helps rebuilding but does not ensure competitiveness. Guardian reward can make a material score jump. Leviathan appears too difficult for typical independently operating bot fleets. No seed tournament, policy tuning search or human balance study was performed.
- **Pacing:** Small scout/prospecting fleets can fight in the opening minute. Nominal phase names do not lock combat. Overwhelming fights may finish in under ten seconds; similar-size fights last longer. Test at ×1 for actual decision cadence; ×10 is a verification convenience.
- **Visuals:** Close asteroid rings can dominate small stars; vector stars/facilities are cleaner than the textured reference hulls. Crowded Core labels/markers can still overlap. Very wide territory cells at the edge and sidebar scrolling on short screens remain visible. There is no label-collision solver or dedicated touch-first design.
- **Prototype shortcuts:** Common hull groups represent bosses, home repair is free, deposits are unlimited, scouting is an approximate local view, and same-location FFA uses deterministic two-owner engagements. No fleet merging outside home. These are documented rules, not production-ready systems.
- **Postponed:** Save/reload, backend/Supabase, accounts, actual multiplayer/chat, matchmaking, progression, research, diplomacy, alliances/guilds, payments/ads, Campaign and full Battle Lab V2. Nothing was deployed.

## Reference safety

Only the `space-wars` repository was written. The Web reference retained HEAD `3efaa082edb008cc05ff807a3eea0be89af394aa` and its pre-existing modified `Space-Explorer-Web.code-workspace`. The Backend reference retained HEAD `24ca0f26e4de8423341542d7220d8fed2053663f` and its clean working tree. No reference branches, files, migrations, processes or deployments were changed. Other reference folders were not used. The local app has no sibling imports, external artwork paths, Supabase dependency or secrets.

The owner explicitly requested committing and pushing this phase to `main`. Commit and final clean-tree verification are reported in the handoff message; this file avoids embedding its own circular commit hash. Stop after this phase and await owner review.
