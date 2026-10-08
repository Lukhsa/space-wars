# Planet conquest playtest redesign

The owner's ten-minute playtest replaces the previous system-conquest requirement. This is an explicitly requested local prototype redesign, not backend work.

## Contracts

- Planets are the authoritative ownership and combat locations. A system's controller is derived from a strict majority (2/3, 3/4, 3/5); control never transfers other planets automatically. Planet income and score accrue separately. System bonuses and up to three mining slots require majority control.
- Every system has 3–5 planets. Expand from 28 to 56 systems, with two uncontested neutral systems along each commander's initial approach. Retain protected home systems, each fully owned at start.
- Planet defenses belong to their planet's owner and only fight there. Battles and captures are keyed by system and planet. Multiple battles may occur at different planets within one system. Suns are visual landmarks, not attack targets.
- Fleets carry current and destination planet addresses. Orders support local orbital travel and inter-system routes. Shift-click selects multiple friendly fleets; clicking a planet issues a validated group order. Existing inspector/order controls remain available.
- Preserve the hull-level simultaneous combat resolver, adding an approach window, more readable engagement duration, explicit focus-defenses targeting and shot feedback. Capture begins only after hostile ships and that planet's defenses are defeated.
- Mining uses separate civilian craft, up to three commissioned slots per controlled system. Each craft has separate orders, cargo and recall. Craft travel to deposits, extract, then return cargo. Only delivery pays; pirates can intercept returning cargo. Military fleets cannot mine.
- Start each system with 6–7 asteroid deposits. Asteroids render smaller than planets; stars are 15% larger. Deposits have bounded reserves and seeded replenishment over time, with stable positions and a system cap.
- Pirates occupy seeded resource-space locations beyond the initial buffer, never conquer planets, and respawn after a cooldown. Clearing them protects deliveries as well as providing salvage.
- Home shipyards remain. Seed one forward yard opportunity per sector plus inner strategic yards. Production and reserves belong to the yard's planet; capture discards hostile jobs/reserves. Fleets can form/reinforce locally at an owned yard.

## Validation

Adapt old tests to planet addresses rather than preserving contradictory system-ownership assumptions. Verify independent planetary capture/combat, majority ties, defense ownership, multi-order atomicity, yard capture, separate miners, delivered-only rewards, pirate interception/respawn, all generated bodies' spacing, determinism and complete bot matches. Exercise selection, attacks, forward production and mining in Chromium; retain the existing dashboard and inspect screenshots.

This supersedes the system-conquest and military-fleet mining sections of the previous reports. Historical balance results are not evidence for the redesigned loop. Human playtesting remains necessary to assess whether the new decisions are engaging.
