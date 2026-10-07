# SPACE WARS

A locally playable strategic galaxy prototype in the Space Explorer universe. Phase 1 focuses on the map, territory, fleet movement and the feel of commanding a growing empire.

[Dashboard screenshot](docs/screenshots/dashboard.png) · [Conquest screenshot](docs/screenshots/conquest.png) · [Validation and known limitations](docs/PHASE1_VALIDATION.md)

## Run locally

Use Node.js **22.12+** (tested with Node 24) and npm. From this repository:

```sh
npm install
npm run dev
```

Open **http://127.0.0.1:5173/**. Cmdr. Vale's empire loads immediately; there is no login or setup screen. No backend, environment variables, account, Supabase project or sibling repository is required. Refreshing the page resets the session.

## Your first expedition

1. Drag the galaxy to pan, scroll to zoom around the pointer, or click the minimap. The map also supports arrow keys, `+`, `-` and `Home` when focused. Use the overview button to see the whole galaxy.
2. Select **1st Expeditionary**, then **Nexus**. Click **Claim system**, review the connected route and launch. Travel takes 15–60 simulated seconds. Victory changes ownership and redraws your border.
3. Inspect **Pallas Belt**, choose **Send mining fleet**, and assign a fleet. After travel, extraction takes 18 seconds and awards Alloy.
4. Open **Build a ship**. Frigate / Destroyer / Cruiser / Dreadnought take 10 / 20 / 40 / 60 seconds. Two construction berths are available. Ships enter reserve; **Fleet command → Reinforce** assigns reserve ships to a fleet at Nova Prime.
5. Use **Scout** on a rival or neutral system for a local reconnaissance result. Click world events to focus their locations and your battle events to open reports.

The fleet course bar also supports movement, assault and mining according to the selected target. Orders cannot be redirected in flight. Search finds systems throughout the galaxy; filters emphasize owned, neutral, hostile, fleet or asteroid locations. Intelligence introduces the eight civilizations and provides recent battle reports.

## Demo controls

The separate **DEV** control opens the current seed, **Regenerate galaxy**, **Reset demo**, **Pause / Resume** and **×1 / ×2 / ×5** speed controls. Default seed: `ORION-7742`.

The same seed produces the same initial world: **160 systems, 32 commanders, 34 fleets**, including your six controlled systems and three fleets. Rival regions, neutral gaps, art and lanes vary between seeds. The starting neighborhood stays recognizable so comparing seeds is easy. Seeded rival schedules provide reproducible local activity; player actions and timing influence subsequent events.

Pause freezes all simulation time, including production and movement. Time also pauses while the page is hidden. Reset rebuilds the current seed and retains the chosen pause/speed controls. Regenerate uses the entered seed. Nothing persists beyond the page session.

## Deliberately local and temporary

All commanders, resources, orders, reports and events exist in browser memory. Mock combat compares fleet power with system defense plus a bounded seeded variation. It is isolated in `src/demo/simulation.ts`; **Battle Lab V2 top-down combat has not been extracted or integrated**.

Rivals follow lightweight seeded activity schedules, not production bot AI. They travel, mine, occasionally assault one another and change borders; they leave the player's territory alone. There is no multiplayer, authentication, server authority, fog-of-war security, diplomacy, seasonal lifecycle or production persistence. Rival information is illustrative and available locally. Civilization differences are visual only.

Population, system output estimates, defenses, costs, initial fleet power and capture rewards are placeholder balance. Only the global Credits trickle, mining Alloy, order Fuel costs, ship construction and capture rewards affect resources. System output rows are display estimates, not a simulated colony economy. Mining deposits do not deplete. Fleets use abstract power attrition rather than per-ship battle damage. The Destroyer temporarily uses Engine-Burner art alongside Human hulls.

## Verification

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

Optional Chromium interaction checks:

```sh
npx playwright install chromium
npm run test:e2e
```

Playwright starts the dev server if needed. Tests cover deterministic generation, graph connectivity, spawn validity, movement, capture/territory mutation, mining, construction, reserve assignment, invalid orders and simulation invariants. Browser checks exercise the camera, local action flows, seed controls and responsive layout.

## Visual iteration

- `src/App.tsx`: dashboard, inspectors, fleet cards, orders and dialogs.
- `src/styles.css`: typography, panel density, color, responsive layout and feedback.
- `src/components/GalaxyMap.tsx`: SVG scene, detail levels, camera, routes and minimap.
- `src/demo/galaxy.ts`: seeded generation, initial state and graph routing.
- `src/demo/territory.ts`: Voronoi cells, merged owner boundaries and corner smoothing.
- `src/demo/simulation.ts`: temporary movement, battle, mining, construction and rival behavior.
- `src/demo/catalog.ts`: civilization palette, independent art references and prototype ship values.

Only a small asset selection was copied into this repository. Every copied file, original path and use is recorded in [asset provenance](docs/ASSET_PROVENANCE.md), with checksums in `public/assets/provenance.json`.

Desktop is the design target. Side panels scroll at short laptop heights; narrow screens expose fleet management through navigation and stack the inspector below the map. Full mobile interaction design, collision-free labeling at every scale and final faction-specific hull sets remain future visual work.

Read [AGENTS.md](AGENTS.md) before working here. All Space Explorer reference repositories remain read-only. [The Phase 1 brief](phase1_prompt.txt) supersedes the implementation priority in the earlier architecture documents. Those six documents remain future reference: [architecture](docs/PROJECT_ARCHITECTURE.md), [reuse audit](docs/REFERENCE_REUSE_AUDIT.md), [galaxy](docs/GALAXY_MODEL.md), [security](docs/PVP_SECURITY_MODEL.md), [bots](docs/BOT_ARCHITECTURE.md), [implementation plan](docs/IMPLEMENTATION_PLAN.md). Their proposed production systems are not part of this prototype. **Phase 2 has not started.**
