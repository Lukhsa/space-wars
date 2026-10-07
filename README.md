# Space Wars — Quick Conquest

A complete **local-only, eight-commander free-for-all**: one human against seven seeded utility bots. Expand across star systems, build fleets, mine, fight pirates and rivals, contest major objectives, and finish with a Dominion leaderboard. Normal matches last 40 simulated minutes; protected homes let defeated fleets rebuild.

The Phase 1 dashboard, map camera, territory geometry and approved Space Explorer artwork are retained. Phase 2 replaces mock gameplay with shared, deterministic local rules. No backend, accounts, Supabase, network chat or sibling repository is needed.

## Run

Node **22.12+** and npm are required (validated with Node 24 on Windows).

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5173/**. A match starts immediately. Refresh resets it; active-match saving is intentionally postponed. Time pauses while the page is hidden.

## Your first match

1. Select **1st Expeditionary**, search for **Nexus**, then **Claim system → Launch assault**. Hold the cleared system for 20 seconds to gain its worlds, income and score.
2. Select **Mining Group Alpha**, open **Nova Prime Belt**, and **Send mining fleet**. A 40-second cycle yields 200 Alloy and 65 Fuel. Mining is one cycle per order.
3. **Build a ship** supports quantities of 1, 2, 3 or 5. Two berths work through a ten-ship queue. **Fleets** lets you allocate reserve hulls to a new fleet or reinforce a fleet at home.
4. Scout before fighting. **Caldera** and the other contested middle systems hold pirates and strategic bonuses. Hostile fleets intercept at intermediate systems on a route.
5. During battle, select your fleet and choose **Aggressive**, **Defensive**, **Focus capitals**, **Focus escorts**, or **Retreat**. Withdrawal takes six exposed seconds, then the survivors travel home. The rest of the galaxy remains usable.
6. Watch **Standings**, **Global Chat**, the event log and the objective indicators. At 15 minutes the Guardian awakens; at 25 minutes the Leviathan appears; the final five minutes double Core score.

Drag to pan, scroll to zoom, or use the minimap. Arrow keys pan a focused map; `+` / `-` zoom and `Home` returns home. Close zoom reveals planets and asteroid fields around each star. The sidebars scroll on shorter screens.

## Rules and verification

- [Complete rules, exact balance, controls and shortcuts](docs/QUICK_CONQUEST_PROTOTYPE.md)
- [Validation, gameplay observations and remaining issues](docs/PHASE2_VALIDATION.md)
- [Bot simulation results](docs/BOT_SIMULATION_RESULTS.json)
- [Asset provenance](docs/ASSET_PROVENANCE.md)
- [Opening](docs/screenshots/quick-conquest-opening.png) · [Map combat](docs/screenshots/quick-conquest-battle.png) · [Escalation](docs/screenshots/quick-conquest-escalation.png) · [Results](docs/screenshots/quick-conquest-result.png)

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run simulate -- --save
npm run simulate -- MY-SEED --duration=600
```

`simulate` runs eight bots without rendering and prints full leaderboard, combat, economy, recovery and objective statistics. `--save` writes the three default seeds to `docs/BOT_SIMULATION_RESULTS.json`. In the browser, **DEV** provides restart/seed, 10/20/30/40/60-minute presets, pause, ×1/×2/×5/×10, resources, reveal, objectives, phase simulation and a bot inspector. Duration/controller settings apply to the next restart. Phase jumps execute every intervening rules tick.

## Code map

| File                                                    | Responsibility                                                                             |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `src/demo/balance.ts`                                   | Central ship stats, timings, costs, income, score, buffs and objective balance             |
| `src/demo/galaxy.ts`, `random.ts`, `routes.ts`          | Seeded 28-system generation and lane routing                                               |
| `src/demo/commands.ts`                                  | Shared human/bot build, formation, movement, retreat and stance commands                   |
| `src/demo/simulation.ts`                                | Fixed one-second economy, movement, capture, mining, scoring and match lifecycle           |
| `src/demo/combat.ts`                                    | Per-ship hull damage, simultaneous volleys, casualties and rewards                         |
| `src/demo/ai.ts`, `objectives.ts`                       | Local utility policies, objective schedules, roaming threat and curated chat               |
| `src/components/GalaxyMap.tsx`, `src/demo/territory.ts` | Existing SVG camera and territory renderer, extended with system interiors and map battles |
| `src/App.tsx`, `src/components/QuickConquest.tsx`       | Existing dashboard plus match HUD, commands, standings, chat, dev tools and results        |
| `scripts/generate-assets.mjs`                           | Reproducible original SVG stars, belts, facilities and neutral objectives                  |

The earlier [architecture](docs/PROJECT_ARCHITECTURE.md), [reuse audit](docs/REFERENCE_REUSE_AUDIT.md), [galaxy](docs/GALAXY_MODEL.md), [security](docs/PVP_SECURITY_MODEL.md), [bots](docs/BOT_ARCHITECTURE.md) and [implementation plan](docs/IMPLEMENTATION_PLAN.md) remain future Campaign/multiplayer reference. Their production scope and Battle Lab V2 requirements are superseded **for this local phase** by [prompt_02.txt](prompt_02.txt). No production work is authorized by this implementation. Read [AGENTS.md](AGENTS.md); reference repositories remain read-only.
