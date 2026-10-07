# Space Wars reference reuse audit

Audit date: 7 October 2026. Source is the local working trees at Web commit `097ded6f82bffbeb0957441e75b8818e07998bef` and Backend commit `ab918ba2bc35c822fcc7f8cc99a41bfe7a06dce4`. Findings establish code presence and behavior from inspection, not successful tests or the state of a hosted deployment.

Path prefixes used below:

- **W** = `C:/Users/lukicne/Desktop/Mobile/Space Explorer RPG Web`
- **B** = `C:/Users/lukicne/Desktop/Mobile/Space Explorer RPG Backend`
- **SW** = this repository, `C:/Users/lukicne/Desktop/Mobile/Space Wars`, whose origin is `https://github.com/Lukhsa/space-wars`.

`AGENTS.md` was read first. The reference working trees had no tracked changes; existing untracked Web `prompt_01.txt` and Backend `backend_prompt.txt` / `docs/original_prompt.txt` were not changed. Reference environment files, hosted credentials and deployment targets were not used. Reference tests/builds/simulations were inspected, not executed: some generate `.tmp`/reports or operate against hosted services. No production access or migrations were performed.

## Principal findings

The current Web entry point `W/src/main.tsx` mounts `CloudGate`, not the legacy local `App` directly. `W/src/cloud/session.ts` implements anonymous login, Google OAuth, guest linking, identity verification, cache recovery and durable requests. The presence of `src/data/persistence/repository.ts` does not mean the current production account is a locally authoritative save.

Backend migrations extend a foundation through account commissioning, crossplay accounts, authoritative fleet/mining rules, exploration, encounters and colonies. The latest inspected migration is `B/supabase/migrations/202610060019_exploration_release_gate.sql`. Read these as a chain: earlier functions are wrapped/replaced and foundation actions may be restricted. A table/model alone is not evidence of a currently allowed public action.

The selected combat is **Battle Lab V2 / top-down engine 10**. `W/src/screens/BattleLab2Screen.tsx` uses `WarEngine`; `W/src/game/war2/campaign.ts` runs it headlessly; `W/src/game/combat/tactical-engine.ts` delegates engine versions 10+ to that spatial path. The older tactical engines and the arcade game are not alternative implementations to port for Space Wars.

There are two materially different backend combat paths. `B/packages/server/battle-worker.ts` is an older pinned AUTO/WATCH worker that rejects interactive histories and caps the roster at 64. The newer `B/packages/encounters/{http,worker,resolver,journal}.ts` and migration 015 implement server preparation, journal validation, frozen resolution and transactional settlement for PvE pirate encounters. Migration 019 changes advertised release capability flags; it does not create shared PvP. Neither path atomically settles two human-owned empires today.

The existing `B/docs/PVP_READINESS.md` agrees with the current private ownership model and warns against exposing another player's ships. `B/docs/SECURITY_MODEL.md` includes useful threat boundaries but also historical claims about the write surface and unimplemented workers that later code supersedes. Its table counts, hosted advisor reports and rollout status are not treated as current deployment facts.

## Classification

1. **COPY/ADAPT DIRECTLY**: identifiable code/content can be copied after provenance review, dependency extraction and tests. This never means an unchanged folder dump.
2. **REUSE PATTERN ONLY**: preserve an approach or invariant, write Space Wars-specific code.
3. **REWRITE FOR SPACE WARS**: the existing domain meaning is incompatible; new design is required.
4. **DO NOT REUSE**: excluded scope, unsafe configuration, obsolete behavior or unwanted product coupling.

## Web reuse matrix

| Area and current source | Class | Evidence and Space Wars adaptation |
| --- | --- | --- |
| `W/package.json`, `vite.config.ts`, `tsconfig*.json` | REUSE PATTERN ONLY | React, TypeScript, Vite, Zod, idb, Vitest and Playwright are present. Create a clean workspace toolchain; do not inherit all scripts/version requirements |
| `W/src/cloud/client.ts` | COPY/ADAPT DIRECTLY | Supabase client with PKCE/persisted session and public configuration; replace project/env/storage namespaces and callback routing |
| `W/src/cloud/session.ts`, `CloudGate.tsx`, `errors.ts` | COPY/ADAPT DIRECTLY, selected auth methods | `playAsGuest`/`createGuest`, `signIn`, `linkGoogle` verify identity and separate linking from account switching. Extract auth/session logic; remove campaign-specific commissioning/compatibility capabilities |
| `W/src/cloud/session.test.ts`, `CloudGate.test.tsx`, `test-fixtures.ts` | COPY/ADAPT DIRECTLY | SDK method, identity-change, duplicate guest and outbox failure cases; replace fixtures/DTOs and add actor/season tests |
| `W/src/cloud/cache.ts` | COPY/ADAPT DIRECTLY | IndexedDB snapshots/heads/outbox; owner namespace and monotonic snapshot revision. Currently one intent per owner, not a general command queue. Add project/actor/galaxy/season/cursor scope |
| `W/src/cloud/session.ts` action path and `contracts.ts` | REUSE PATTERN ONLY | Persists intent before sending, validates owner/revision/receipt and handles conflicts. New pending-command API and visibility DTOs cannot reuse the full private campaign snapshot contract |
| `W/src/cloud/release.ts`, `exploration.ts`, `encounters.ts`, `colonies.ts` | REUSE PATTERN ONLY | Typed adapters and capability/quote validation; their action vocabulary is RPG-specific |
| `W/src/cloud/production-session.ts`, `production-projection.ts`, `ProductionApp.tsx` | REWRITE FOR SPACE WARS | Production UI projection bridges canonical rows into existing campaign views. Space Wars needs separate public map, own actor state and viewer intelligence |
| `W/src/cloud/session.ts` `serverNow()` | COPY/ADAPT DIRECTLY | Server snapshot time plus `performance.now()` elapsed; reset after reconnect/suspend and never settle locally |
| `W/src/app/useClock.ts`, `components/game/operation-time.ts` | REUSE PATTERN ONLY | Focus/visibility refresh is useful. Local `Date.now()` is not authority; minute rounding is unsuitable for 15-second construction |
| `W/src/data/persistence/repository.ts`, `migrations.ts`, `W/src/app/GameSession.ts` | DO NOT REUSE as authoritative storage | Local save/import/migration/settlement machinery belongs to the RPG. Browser caches cannot mint ships/resources in shared PvP |
| `W/src/screens/BattleLab2Screen.tsx`, `W/src/components/game/war2/renderer.ts`, `artwork.ts`, `space-background.ts` | COPY/ADAPT DIRECTLY | Selected top-down Canvas presentation. Extract Watch viewer; remove pilot controls, campaign checkpoint writes and page-blur pausing as gameplay authority |
| `W/src/components/game/war2/CampaignBattle.tsx`, `CampaignPreparation.tsx` | REUSE PATTERN ONLY | UI arrangement/standing-order vocabulary useful; current GameSession dependencies and checkpoint flow need a new authoritative report adapter |
| `W/src/components/game/topdown-art.ts` | COPY/ADAPT DIRECTLY | Art lookup, alpha bounds and mount transformation; separate pure mount math from Canvas drawing and cosmetic entitlements |
| `W/src/components/game/battle-audio.ts`, `battle-audio.test.ts`, `shield-effects.ts` | COPY/ADAPT DIRECTLY where used by selected viewer | Reusable effects/audio controls; validate actual V2 integration and keep mute/reduced-motion behavior |
| `W/src/game/combat/replay.ts` | REUSE PATTERN ONLY | Committed-evidence projection is sound; spatial V2 uses its own replay/state model, so do not substitute this older event projector |
| `W/src/components/layout/AppShell.tsx`, `StationIcon.tsx`, `W/src/styles/{tokens,desktop,war2}.css` | COPY/ADAPT DIRECTLY in selected pieces | Icons/tokens/responsive panel behavior; replace RPG navigation with central galaxy map and inspector |
| `W/src/data/catalogs/artwork.ts` | COPY/ADAPT DIRECTLY | Vite asset URL mapping and missing-art fallback; curate a smaller manifest and lazy loading rather than copying all images into the initial payload |
| `W/src/app/analytics/*`, local import/backup screens, arcade screens | DO NOT REUSE for MVP | Product-specific analytics destinations, save import and arcade rewards are unnecessary coupling |

## Backend reuse matrix

All SQL below is reference evidence, not migration files to install into Space Wars.

| Area and current source | Class | Evidence and adaptation |
| --- | --- | --- |
| `B/supabase/migrations/202610040001_domain.sql` owner RLS, composite FKs and grants | REUSE PATTERN ONLY | Authenticated SELECT scoped by `auth.uid()`, no normal client writes. Replace per-user world ownership with actor membership and dedicated visibility projections |
| `202610050006_hosted_privilege_hardening.sql` | REUSE PATTERN ONLY | Revokes broad default table privileges and unnecessary helper execution. Recheck actual defaults in a future Space Wars environment |
| `202610050007_account_commissioning.sql`, `202610050009_crossplay_accounts.sql`, `B/packages/server/crossplay-auth.ts` | REUSE PATTERN ONLY | Account/identity admission, unique starter receipts and link verification. New commissioning must also allocate a shared safe spawn atomically |
| `B/supabase/migrations/202610040003_actions.sql` `private.game_now`, `private.fail`, action envelope | REUSE PATTERN ONLY | Server clock, structured errors, strict arguments and receipt-before-revision comparison. New shared action dispatch must handle multiple actors and pending commands |
| Same file, `private.change_balance` | REUSE PATTERN ONLY | Bounded balances and atomic ledger entry under a held owner lock. Adapt to Credits/Alloy/Fuel and multi-actor transactions; not the old material catalog |
| `202610050010_release_economy_fleet.sql` `release_action`, quotes, timer/completion receipts | REUSE PATTERN ONLY | Server costs, frozen jobs, lane/reservation checks, timer settlement and receipts are substantive current implementations. Replace hours/rank/license/pet economy and add independent world scheduling |
| `202610060017_colony_authority.sql`, `202610060018_colony_fleet_guards.sql`, `B/packages/colonies/worker.ts` | REUSE PATTERN ONLY | Context/resolve/commit separation, request-bound receipts and shared repair-lane guard. Do not port deep colony/resident/social economics |
| `B/packages/contracts/index.ts`, `combat.ts`, `crossplay.ts`, `encounters.ts` | COPY/ADAPT DIRECTLY for selected schema techniques/types | Runtime validation and versioned combat references are useful. New galaxy/action/public/intel contracts are required; discard device-bound/native import vocabulary |
| `202610050008_combat_integrity.sql`, `202610060015_encounter_settlement.sql` | REUSE PATTERN ONLY | Frozen participants, reservations, trusted preparation/commit and unique settlements. Redesign one-user settlement into one transaction for both actors and the system |
| `B/packages/server/battle-worker.ts` | REUSE PATTERN ONLY | Rebuilds results from persisted input and validates participant metadata; useful restrictive AUTO/WATCH baseline, not the newest encounter feature set or a PvP worker |
| `B/packages/encounters/{http,worker,resolver,journal}.ts` | REUSE PATTERN ONLY | Verified user -> server context -> resolution -> privileged commit; bounded retries and recovery. Pirate reward/escape/tutorial/mobile logic must not enter PvP |
| `B/supabase/functions/encounters/index.ts`, `colonies/index.ts`, `exploration/index.ts` | REUSE PATTERN ONLY | Thin environment/handler entry points; build new handlers with dedicated configuration. Existing functions are not a persistent galaxy scheduler |
| `B/packages/server/reference.ts`, `packages/reference-web/README.md`, provenance files | REUSE PATTERN ONLY | Internally copied frozen source avoids sibling runtime dependencies. Extract a normal Space Wars combat package instead of runtime esbuild into `.tmp` |
| `B/catalogs/*`, `scripts/build-release-core.mjs`, `build-foundation-release.ts`, `source-hash.mjs` | REUSE PATTERN ONLY | Immutable releases, generated catalogs and hash/provenance checks; Space Wars gets independent names, costs, rules and migration history |
| `B/packages/server/db.ts`, `tests/harness.ts` | REUSE PATTERN ONLY | PGlite harness, emulated auth and disposable clock make repeatable tests. These are not production Auth or proof of parallel connection behavior |
| `B/tests/{security,transactions,worker,combat-contracts,combat-wire,release-core,crossplay,encounters,colonies}.test.ts` | COPY/ADAPT DIRECTLY for assertions/scenarios | Ownership isolation, rollback, receipts, deterministic resolution and parity vectors. Rebuild fixtures and add two-owner/world/observation races |
| `B/scripts/hosted-smoke.ts`, `hosted-crossplay.ts`, `hosted-release-core.ts`, `hosted-encounters.ts` | REUSE PATTERN ONLY | Real token/HTTP checks and disposable-environment gates. New scripts must hard-fail outside explicitly allowed Space Wars test environments; never run these reference scripts |
| `B/scripts/simulate.ts` | REUSE PATTERN ONLY | Virtual time, counters and invariant summaries. It is a 4-player historical economy fixture through migration 011, inserts test targets and uses synthetic battle results; it is not a legal-action galaxy AI |
| Existing schema/migration chain wholesale | DO NOT REUSE | Would import per-user campaign semantics, historical compatibility wrappers and irrelevant economy; fresh Space Wars schema comes only after review |
| `.env*`, `supabase/config.toml`, deployment scripts/IDs, reference hosted reports as fixtures | DO NOT REUSE | Environment and production coupling. Never copy credentials or point new code at the existing game |

## Combat and gameplay reuse matrix

| Current source | Class | Required work |
| --- | --- | --- |
| `W/src/game/war2/engine.ts`, `models.ts`, `campaign.ts`, `replay.ts` | COPY/ADAPT DIRECTLY | Preserve Battle Lab V2 simulation. Extract pure dependencies, use explicit class/motion roles, pin versions/PRNG, make both sides real reserved fleets |
| `W/src/game/war2/{war2,campaign,deployment,fleet-config,pilot}.test.ts` | COPY/ADAPT DIRECTLY, relevant cases | Determinism, deployment, roster and replay checks; omit interactive-only MVP acceptance while preserving engine behavior |
| `W/src/game/combat/{profiles,warheads,pdc,ramming,umbral,civilizations,spatial}.ts` | COPY/ADAPT DIRECTLY only along V2 dependency closure | Reuse weapon/shield/motion/formation helpers that V2 actually calls. Freeze approved Space Wars rules; do not import all old engine branches by convenience |
| `W/src/game/random.ts`, `random` consumers and PRNG vectors in Backend tests | COPY/ADAPT DIRECTLY | Seeded XorWow/Kotlin-compatible random logic; preserve the source's Apache-2.0 attribution and any required third-party notices |
| `W/src/game/war2/engine.ts` `WarEngine.campaign` formation mapping | COPY/ADAPT DIRECTLY with explicit mapping change | Existing roster spreads groups/slots and infers legacy hull role from speed/size. Use explicit Space Wars role data; test side symmetry and fleet ordering |
| `W/src/game/fleet/models.ts`, `config.ts`, `actions.ts`, `state.ts`, `officers.ts` | REUSE PATTERN ONLY | Valuable constraints and ship stats vocabulary; local save mutation, campaign IDs, officer/rank restrictions and reserve/colony deployment do not model a shared galaxy |
| `W/src/data/catalogs/fleet-ships.json`, `fleet-rules.json`, `combat-catalog.json`, `civilization-combat.json` | COPY/ADAPT DIRECTLY as reviewed input content | Preserve approved names/art/stat concepts, then create four-class Space Wars balance. Original costs, unlocks, buildHours, tiers and NPC bias are not balanced PvP values |
| `W/src/game/mining/actions.ts`, `W/src/game/colonies/*`, `W/src/game/frontier/*` | REWRITE FOR SPACE WARS | Private discoveries/claims/colony simulation must become shared targets, territory and competitive jobs; retain invariants, not campaign mutation functions |
| `W/src/game/combat/tactical-engine-v2.ts` through `-v8.ts`, older tactical branch, `W/src/game/arcade/*` | DO NOT REUSE as Space Wars battle systems | Owner selected the top-down V2 engine. Retain only any necessary pure utility dependency, not parallel legacy gameplay/replay compatibility |
| `W/src/game/war2/campaign-actions.ts`, local settlement/reward/import logic | DO NOT REUSE as authority | Client checkpoint or result submission must never settle shared PvP. Server-only snapshot/result pipeline replaces it |
| Captains/officers, companions, colony residents, mobile journeys/GPS, payments/ads, achievements | DO NOT REUSE for MVP | Outside the requested fast territorial loop; frozen PvP inputs use neutral defaults rather than hidden progression bonuses |

### Top-down extraction risks

The V2 engine is headless-capable today via `simulateSpatialBattle`, but it is not already a standalone package. It imports mount math from `W/src/components/game/topdown-art.ts`, which also imports cosmetic catalogs and defines Canvas drawing. Extract the pure geometry without bringing browser image APIs into a worker. `WarEngine.campaign` maps all definitions onto `human_corvette`, `human_frigate`, `human_cruiser` or `human_dreadnought`; Destroyer is not a fifth ready-made motion role. The internal BLUE side also carries ownership/tutorial concepts. Explicitly disable tutorial hull floors and campaign-only rewards and measure side bias before PvP.

The backend's `packages/reference-web` README pins an earlier Web commit (`38598dd26c9145115e4eee0edffc950209842b1e`), whereas the inspected Web HEAD is newer. Encounter reference bundles have their own provenance. Do not assume all frozen copies equal current Web V2. Before extraction, choose the current Web V2 source as the owner's reference, inventory its transitive files, record hashes, and use old backend bundles only as behavioral evidence where versions match.

## Exact content and asset candidates

These files exist in W and are candidates for independent copying after owner approval of reuse. Presence and a source manifest establish provenance, not blanket licensing/approval. This pass copies no assets. Art should be curated with file hash, original path, owner approval/license, derivative settings and destination in a new Space Wars manifest.

| Content | Exact paths in W | Class and use |
| --- | --- | --- |
| Civilization identities | `src/data/catalogs/civilizations.json`, `species.json`, `homeworlds.json`, `faction-introductions.json`, `civilization-doctrines.json` | COPY/ADAPT DIRECTLY for names/lore; current civilizations catalog contains 19 entries, choose 6–8 deliberately |
| Candidate race portraits | `src/assets/artwork/species_glint_tik_collective.jpg`, `species_myrmex_logistics.jpg`, `species_crustacean_clans.png`, `species_saurian_remnant.png` | COPY/ADAPT DIRECTLY, subject to approval: Glin'Tok, Myrmex, Kethrik, Kraggs |
| Other candidate race portraits | `src/assets/artwork/species_gorgrak_engine_burners.jpg`, `species_umbral_void_menders.jpg`, `species_gourmand_blob_dominion.png`, `species_varn.jpg` | COPY/ADAPT DIRECTLY, subject to approval: Engine-Burners, Umbral, Ulmar, Varn |
| Faction emblems | `src/data/catalogs/faction-emblems.json`, `src/components/game/FactionEmblem.tsx`; e.g. `src/assets/artwork/faction_emblem_glint_tik_collective.webp`, `faction_emblem_crustacean_clans.webp` | COPY/ADAPT DIRECTLY for ownership/race UI; preserve IDs carefully because display names and artwork keys differ |
| Planet art | `src/assets/artwork/planet_terran_base_01.png`, `planet_desert_base_01.png`, `planet_ocean_base_01.png`, `planet_frozen_base_01.webp`; `src/data/catalogs/planets.json` | COPY/ADAPT DIRECTLY visuals, REWRITE generated world instances; selected planet thumbnails for the map/inspector |
| Asteroid art | `src/assets/artwork/asteroid_small_01.png`, `asteroid_medium_01.png`, `asteroid_large_01.webp`, plus numbered 02/03 variants | COPY/ADAPT DIRECTLY visuals; REWRITE reserve/composition balance for three resources |
| Top-down primary hulls | `src/assets/artwork/war2_human_frigate.webp`, `war2_human_cruiser.webp`, `war2_human_dreadnought.webp`, `war2_human_corvette.webp` | COPY/ADAPT DIRECTLY approved art; Corvette is source art/role, not a fifth Space Wars class |
| Destroyer candidate | `src/assets/artwork/war2_engine_burner_overburn_destroyer.webp`, original `engine_burner_overburn_destroyer.webp` | COPY/ADAPT DIRECTLY if approved; no assumption that its faction-specific stats suit the shared Destroyer class |
| Top-down metadata/background | `src/data/catalogs/topdown-ships.json`, `war2-artwork.json`, `ship-engine-mounts.json`; `src/assets/artwork/war2_nebula_battlefield.webp` | COPY/ADAPT DIRECTLY with matching sprites; validate dimensions, alpha bounds, nozzle/mount coordinate systems |
| UI icons | `src/components/layout/StationIcon.tsx` | COPY/ADAPT DIRECTLY selected fleet/mining/radar/defence/resources/shipyard SVG paths |
| Typography | `src/assets/fonts/ibm_plex_sans_regular.ttf`, `ibm_plex_mono_regular.ttf`, `barlow_condensed_semibold.ttf`, `barlow_condensed_bold.ttf` | REUSE PATTERN ONLY until license/notice inventory is recorded; no need to bundle all weights |
| Asset source inventory | `src/data/catalogs/source-manifest.json` | REUSE PATTERN ONLY for hash/provenance tracking; it references Space Commute source and is not itself permission to copy that project |
| Paid/cosmetic liveries and brand/site artifacts | `src/data/catalogs/topdown-liveries.json`, skin assets, `public/space-explorer-bastion.png`, favicon/sitemap | DO NOT REUSE for initial product branding/entitlements; new game requires its own selected identity |

The top-down metadata describes orthographic dorsal sprites facing up and contains crop bounds, engine and weapon origins. Preserve metadata with its matching image; a generic resized/cropped image can change mount geometry. Split visual origins from authoritative weapon definitions when extracting. Optimize browser derivatives within Space Wars while retaining the approved original hash.

## What must be newly built

No reviewed source establishes a ready-made shared galaxy, sector expansion, contested graph ownership, multi-actor movement ordering, viewer-scoped fog of war, stale scout intelligence, two-player atomic battle settlement, strategic bot populations, seasons or leaderboard. Existing local frontier/diplomacy/campaign concepts may inspire terminology but do not provide those trust boundaries.

New implementations must include actor/membership identity independent of Auth, public/private/redacted read contracts, the common human/bot domain action layer, world event scheduling, worker leases/fencing, shared resource reservations, capture/protection rules, safe population retirement and a reproducible legal-action simulator. These are the dominant architectural risks.

## Feasible reuse and limits

Real reuse is substantial in the selected combat engine, renderer, art/metadata and account/cache helpers. It is moderate in backend patterns and tests, and low in the authoritative shared-world domain/schema. This is a new strategy game with a reused combat core and selected platform components, not a port. A percentage of total effort would be speculative before the combat dependency extraction and shared-state prototype; file counts are not effort estimates.

Confidence is highest in identifiable mechanisms: auth SDK calls, outbox-before-send, server time, SQL receipt ordering, bounded ledger writes, frozen combat inputs, headless V2 simulation and exact asset availability. Deployment readiness, throughput at 500 slots, cross-runtime replay equivalence, PvP balance and asset permission completeness remain implementation/review gates. Existing tests were inspected but not rerun, and no production readiness claim is made.

## Safe extraction procedure after approval

1. Record the selected source commit and per-file hashes, including transitive dependencies and third-party notices.
2. Copy only approved code/art into SW; change imports to local workspace packages and remove reference endpoints/configuration.
3. Capture characterization vectors for current V2 before changing class mappings; assign a new Space Wars engine/catalog version for intentional changes.
4. Adapt tests around contracts and invariants, not old campaign output values. Add real concurrent PostgreSQL and visibility tests.
5. Build/test with sibling repositories unavailable and scan for absolute/sibling imports, URLs and secret configuration.
6. Record deviations, ownership of future rules and approved asset licenses in SW. Never edit a reference file to make extraction easier.
