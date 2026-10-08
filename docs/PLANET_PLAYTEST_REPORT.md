# Planet conquest playtest

Implements the owner's ten-minute feedback, including the confirmed strict-majority and home-plus-capturable-yard choices. Local prototype only. The existing hull combat engine, dashboard and approved assets are retained.

## Rules and controls

- 56 systems, 3–5 planets each, two neutral buffer systems on each home route. Planets retain their previous rendered diameters; stars are 15% larger. Asteroids render at 18 world pixels, smaller than every planet.
- Each planet has independent ownership, capture, defenses and income. A 20-second uncontested occupation captures only that planet. Strict majority grants system territory, strategic bonuses and one civilian mining slot. Ties are contested. Homes remain protected.
- Click a fleet, Shift-click more, then click a planet to issue a group order. Invalid or unaffordable group orders change nothing. Escape clears the selection. Keyboard Enter/Shift+Enter also works. The planet inspector retains an explicit order dialog.
- Fleets use approved ship artwork sized by the strongest hull class (24–36 pixels) and show ship count; selected fleets show their name. Battles are centered on the target planet or resource lane. A six-second approach precedes simultaneous volleys; damage is 45% of previous per-second damage. Stances, escort/capital matchups, persistent hull damage and timed retreat remain. Focus defenses prioritizes installations. Separate planets can host separate battles.
- Station and railgun prices, levels, upgrade/repair rules and attack profiles remain as in the previous balance report. Installations belong to the planet owner, fight only there and block occupation until destroyed. Capturing a planet clears its ruins and unfinished jobs; neighboring defenses remain intact.
- Every home has a free civilian miner. Additional controlled systems may commission one for 250 Credits / 100 Alloy, separate from the five military-fleet limit. Hull is 100; idle repair is 2/second. Losing majority removes that system's craft and unbanked cargo.
- Civilian trips take 8s outbound, 24s extraction, 8s returning. Cargo pays once on return. Repeat mining reuses the deposit, then selects another when depleted. Recall cancels incomplete extraction or returns loaded cargo. A deposit contains four base extraction cycles; yield varies ±10% around its region's previous richness, with surge/titanium bonuses applied to cargo. No mining Fuel payout; passive Fuel income remains.
- Systems start with 6–7 deposits. The first replenishment occurs at 70–109 seconds, then every seeded 65–119 seconds, capped at nine live deposits per system. Empty deposits disappear.
- Sixteen pirate camps start beyond the opening buffers. Pirates do not invade or capture planets. An uncontested camp intercepts a miner as it begins its return: 50% cargo stolen, 40 hull damage and an eight-second delay. Destroyed craft lose their cargo. Fighting pirates keeps them occupied; clearing them also grants existing salvage/score rewards. Camps respawn 240 seconds after destruction is detected.
- Home shipyards remain; eight outer forward-yard planets and eight Core yard planets are capturable. Each yard has its own two berths, ten-job queue and local reserve. Build, form fleets, reinforce and repair at owned yard planets even without system majority. Enemy presence pauses production. Capture discards paid enemy jobs and reserve hulls.
- Passive output is divided equally among a system's planets. Owning every planet yields the same base system income as before. Score follows owned planets; system majority remains the domination condition (29/48 external systems for 75s).
- Bots use the same commands and budgets, choose individual targets, build at local yards, operate civilian miners, protect forward holdings and clear mining threats.

## Validation

All 63 unit cases pass, covering ownership, majority ties, independent battles, approach timing, group-order atomicity, local yard inventory/capture, mining returns and interception, finite resources, deterministic rules, complete bot matches, and body spacing across 100 seeds. All 15 Chromium scenarios passed across the full run and targeted reruns after fixes, including multiple fleet selection, minority planet ownership and production/formation at a forward yard. Both 10- and 40-minute browser-clock matches reach results. TypeScript, ESLint and production build pass.

Reproduce headless playtests with **node scripts/planet-playtest.mjs**. All six matches finished at the timer with finite, nonnegative resources. These are bot observations, not a claim that human enjoyment or balance is solved.

| Seed | Length | First planet | First majority | First rival battle | Battles | Peak concurrent |
|---|---:|---:|---:|---:|---:|---:|
| ORION-7742 | 10 min | 43s | 77s | 249s | 18 | 4 |
| HELIOS-2026 | 10 min | 45s | 113s | 304s | 18 | 4 |
| VEGA-28 | 10 min | 43s | 85s | 271s | 16 | 3 |
| ORION-7742 | 40 min | 43s | 77s | 249s | 146 | 7 |
| HELIOS-2026 | 40 min | 45s | 113s | 304s | 141 | 5 |
| VEGA-28 | 40 min | 43s | 85s | 271s | 151 | 5 |

Raw commander outcomes, mining, shipbuilding, defenses and captures: [simulation data](PLANET_PLAYTEST_SIMULATIONS.json).

## Next human playtest

Open http://127.0.0.1:5173 and refresh for a fresh match. Try capturing several Nexus planets, group orders, building planetary defenses, then securing Aureole's shipyard and clearing its pirate camp. Check whether the longer combat gives enough time to choose focus targets and retreat, and whether forward production reduces travel frustration.

Remaining tuning questions: civilian mining scales with majority-controlled systems; passive Fuel can constrain large armies; a single majority can strand a rival's mining craft; sequential planet occupation increases early travel and click count. The approach window and slower damage improve readability but preserve automatic per-hull combat. A ten-minute mode naturally has less time for heavy ships and Core objectives. No save migration exists; refresh starts the new rules.
