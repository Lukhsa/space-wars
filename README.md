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

1. Click **1st Expeditionary**, search for **Nexus**, then click an individual planet. Shift-click adds fleets to the selection; Escape clears it. The inspector also provides **Claim planet → Launch assault**.
2. Hold an uncontested planet for 20 seconds. Each system has 3–5 planets; strict majority (2/3, 3/4, 3/5) grants system control. Other owners keep their remaining planets. Suns are landmarks.
3. Open a home asteroid deposit and choose **Mine once** or **Continue mining**. A separate civilian miner extracts and returns cargo in 40 seconds. Each controlled system supports one miner; a new craft costs 250 Credits / 100 Alloy.
4. **Build a ship** lets you select an owned shipyard planet. Completed ships enter that yard’s reserve. **Fleets** selects a yard for formation, or reinforces a fleet docked at any owned yard.
5. Seeded pirates guard resource lanes beyond your two neutral starting buffers. They intercept mining returns, steal cargo and damage miners. **Attack resource-lane hostiles** clears the route; pirates regroup four minutes after destruction.
6. Planetary battles begin with a six-second approach. Choose a stance, including **Focus defenses**, and watch volleys, losses and fleet power. Retreat takes six seconds. Stations and railguns defend only their own planet.
7. Highest Dominion at 40 minutes wins. Holding 29 of 48 external systems for 75 seconds wins early. Guardian, Leviathan and Core events remain active.

Drag to pan, scroll to zoom, or use the minimap. Arrow keys pan a focused map; `+` / `-` zoom and `Home` returns home. Close zoom reveals planets and asteroid fields around each star. The sidebars scroll on shorter screens.

## Rules and verification

- **Current planet-conquest playtest:** [rules and validation](docs/PLANET_PLAYTEST_REPORT.md), [design contracts](docs/PLANET_CONQUEST_DESIGN.md), [six simulations](docs/PLANET_PLAYTEST_SIMULATIONS.json). This replaces earlier whole-system conquest and combat-fleet mining.


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
| `src/demo/galaxy.ts`, `random.ts`, `routes.ts`          | Seeded 56-system generation and lane routing                                               |
| `src/demo/commands.ts`                                  | Shared human/bot build, formation, movement, retreat and stance commands                   |
| `src/demo/simulation.ts`                                | Fixed one-second economy, movement, capture, mining, scoring and match lifecycle           |
| `src/demo/combat.ts`                                    | Per-ship hull damage, simultaneous volleys, casualties and rewards                         |
| `src/demo/ai.ts`, `objectives.ts`                       | Local utility policies, objective schedules, roaming threat and curated chat               |
| `src/components/GalaxyMap.tsx`, `src/demo/territory.ts` | Existing SVG camera and territory renderer, extended with system interiors and map battles |
| `src/App.tsx`, `src/components/QuickConquest.tsx`       | Existing dashboard plus match HUD, commands, standings, chat, dev tools and results        |
| `scripts/generate-assets.mjs`                           | Reproducible original SVG stars, belts, facilities and neutral objectives                  |

The earlier [architecture](docs/PROJECT_ARCHITECTURE.md), [reuse audit](docs/REFERENCE_REUSE_AUDIT.md), [galaxy](docs/GALAXY_MODEL.md), [security](docs/PVP_SECURITY_MODEL.md), [bots](docs/BOT_ARCHITECTURE.md) and [implementation plan](docs/IMPLEMENTATION_PLAN.md) remain future Campaign/multiplayer reference. Their production scope and Battle Lab V2 requirements are superseded **for this local phase** by [prompt_02.txt](prompt_02.txt). No production work is authorized by this implementation. Read [AGENTS.md](AGENTS.md); reference repositories remain read-only.

Economy and planetary defenses: [rules, costs, simulation evidence and remaining risks](docs/ECONOMY_DEFENSE_BALANCE_REPORT.md). Select a system and planet to build, upgrade or repair orbital stations and railguns.
