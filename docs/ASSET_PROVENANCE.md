# Asset provenance

These 29 artwork files were selectively copied, byte-for-byte, from the read-only Space Explorer RPG Web repository for the owner-requested Phase 1 visual prototype. Source checkout: `097ded6f82bffbeb0957441e75b8818e07998bef`. No reference source code, secrets, client configuration or deployment files were copied. Space Wars loads only its own assets.

SHA-256 digests are recorded in [`public/assets/provenance.json`](../public/assets/provenance.json). Existing ownership/licensing of the source art remains unchanged; this manifest records origin and use, not a new distribution license.

| Original repository    | Original path                                                   | Space Wars destination                                     | Use                                                      |
| ---------------------- | --------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------- |
| Space Explorer RPG Web | `src/assets/artwork/species_solari.jpg`                         | `public/assets/species_solari.jpg`                         | Civilization intelligence card portrait                  |
| Space Explorer RPG Web | `src/assets/artwork/species_aether_weavers.jpg`                 | `public/assets/species_aether_weavers.jpg`                 | Civilization intelligence card portrait                  |
| Space Explorer RPG Web | `src/assets/artwork/species_zetari.jpg`                         | `public/assets/species_zetari.jpg`                         | Civilization intelligence card portrait                  |
| Space Explorer RPG Web | `src/assets/artwork/species_saurian_remnant.png`                | `public/assets/species_saurian_remnant.png`                | Civilization intelligence card portrait                  |
| Space Explorer RPG Web | `src/assets/artwork/species_gorgrak_engine_burners.jpg`         | `public/assets/species_gorgrak_engine_burners.jpg`         | Civilization intelligence card portrait                  |
| Space Explorer RPG Web | `src/assets/artwork/species_glint_tik_collective.jpg`           | `public/assets/species_glint_tik_collective.jpg`           | Civilization intelligence card portrait                  |
| Space Explorer RPG Web | `src/assets/artwork/species_myrmex_logistics.jpg`               | `public/assets/species_myrmex_logistics.jpg`               | Civilization intelligence card portrait                  |
| Space Explorer RPG Web | `src/assets/artwork/faction_emblem_gorgrak_engine_burners.webp` | `public/assets/faction_emblem_gorgrak_engine_burners.webp` | Civilization intelligence and system owner emblem        |
| Space Explorer RPG Web | `src/assets/artwork/faction_emblem_saurian_remnant.webp`        | `public/assets/faction_emblem_saurian_remnant.webp`        | Civilization intelligence and system owner emblem        |
| Space Explorer RPG Web | `src/assets/artwork/faction_emblem_zetari.webp`                 | `public/assets/faction_emblem_zetari.webp`                 | Civilization intelligence and system owner emblem        |
| Space Explorer RPG Web | `src/assets/artwork/faction_emblem_solari.webp`                 | `public/assets/faction_emblem_solari.webp`                 | Civilization intelligence and system owner emblem        |
| Space Explorer RPG Web | `src/assets/artwork/faction_emblem_sylvari_aether_weavers.webp` | `public/assets/faction_emblem_sylvari_aether_weavers.webp` | Civilization intelligence and system owner emblem        |
| Space Explorer RPG Web | `src/assets/artwork/faction_emblem_glint_tik_collective.webp`   | `public/assets/faction_emblem_glint_tik_collective.webp`   | Civilization intelligence and system owner emblem        |
| Space Explorer RPG Web | `src/assets/artwork/faction_emblem_myrmex_logistics.webp`       | `public/assets/faction_emblem_myrmex_logistics.webp`       | Civilization intelligence and system owner emblem        |
| Space Explorer RPG Web | `src/assets/artwork/war2_human_frigate.webp`                    | `public/assets/war2_human_frigate.webp`                    | Fleet composition and ship production artwork            |
| Space Explorer RPG Web | `src/assets/artwork/war2_human_cruiser.webp`                    | `public/assets/war2_human_cruiser.webp`                    | Fleet composition and ship production artwork            |
| Space Explorer RPG Web | `src/assets/artwork/war2_human_dreadnought.webp`                | `public/assets/war2_human_dreadnought.webp`                | Fleet composition and ship production artwork            |
| Space Explorer RPG Web | `src/assets/artwork/war2_engine_burner_overburn_destroyer.webp` | `public/assets/war2_engine_burner_overburn_destroyer.webp` | Fleet composition and ship production artwork            |
| Space Explorer RPG Web | `src/assets/artwork/asteroid_small_01.png`                      | `public/assets/asteroid_small_01.png`                      | Interactive asteroid fields, inspector and mining orders |
| Space Explorer RPG Web | `src/assets/artwork/asteroid_medium_01.png`                     | `public/assets/asteroid_medium_01.png`                     | Interactive asteroid fields, inspector and mining orders |
| Space Explorer RPG Web | `src/assets/artwork/asteroid_large_01.webp`                     | `public/assets/asteroid_large_01.webp`                     | Interactive asteroid fields, inspector and mining orders |
| Space Explorer RPG Web | `src/assets/artwork/planet_terran_base_01.png`                  | `public/assets/planet_terran_base_01.png`                  | Galaxy system, inspector and order artwork               |
| Space Explorer RPG Web | `src/assets/artwork/planet_second_earth_base_01.webp`           | `public/assets/planet_second_earth_base_01.webp`           | Galaxy system, inspector and order artwork               |
| Space Explorer RPG Web | `src/assets/artwork/planet_ocean_base_01.png`                   | `public/assets/planet_ocean_base_01.png`                   | Galaxy system, inspector and order artwork               |
| Space Explorer RPG Web | `src/assets/artwork/planet_desert_base_01.png`                  | `public/assets/planet_desert_base_01.png`                  | Galaxy system, inspector and order artwork               |
| Space Explorer RPG Web | `src/assets/artwork/planet_frozen_base_01.webp`                 | `public/assets/planet_frozen_base_01.webp`                 | Galaxy system, inspector and order artwork               |
| Space Explorer RPG Web | `src/assets/artwork/planet_volcanic_base_01.webp`               | `public/assets/planet_volcanic_base_01.webp`               | Galaxy system, inspector and order artwork               |
| Space Explorer RPG Web | `src/assets/artwork/planet_gas_giant_base_01.png`               | `public/assets/planet_gas_giant_base_01.png`               | Galaxy system, inspector and order artwork               |
| Space Explorer RPG Web | `src/assets/artwork/planet_crystal_world_base_01.png`           | `public/assets/planet_crystal_world_base_01.png`           | Galaxy system, inspector and order artwork               |

## Identity mapping

Current source authority: `src/data/catalogs/civilizations.json`, `species.json`, `faction-emblems.json`, `fleet-ships.json` and `topdown-ships.json` in Space Explorer RPG Web. Only names/art identities were adapted; no race bonuses or combat statistics were imported.

| Display identity | Existing source identity                   | Phase 1 treatment                                     |
| ---------------- | ------------------------------------------ | ----------------------------------------------------- |
| Humans           | Human hulls in the fleet/top-down catalogs | Player civilization; new simple vector command emblem |
| Engine-Burners   | `gorgrak_engine_burners`                   | Orange                                                |
| Kraggs           | `saurian_remnant`                          | Red                                                   |
| Zetari           | `zetari`                                   | Violet                                                |
| Solari           | `solari`                                   | Gold                                                  |
| Aether-Weavers   | `sylvari_aether_weavers`                   | Sylvari / space-elf equivalent; green                 |
| Glin'Tok         | `glint_tik_collective`                     | Blue-gray                                             |
| Myrmex           | `myrmex_logistics`                         | Mauve                                                 |

The candidate name **Winter Collective** was not found in the current civilization/species catalogs. Glin'Tok and Myrmex are the additional supported identities used here; neither is presented as an alias for Winter Collective.

The generic prototype Destroyer uses `war2_engine_burner_overburn_destroyer.webp` temporarily. Frigate, Cruiser and Dreadnought use Human hulls. This is an art stand-in, not a lore or balance change. The Human emblem/favicon, starfield, nebula gradients, territory geometry and map overlays were authored in Space Wars. UI glyphs come from the `lucide-react` dependency, not copied reference files.

No assets were copied from Space Explorer RPG Backend.

## Phase 2: Quick Conquest

The Phase 1 assets remain in use: eight planet types, three asteroid sprites, four top-down hulls, seven faction emblems and seven portraits. They are loaded from Space Wars, without a runtime dependency on the reference checkout. New art follows the existing dark navy interface, muted cyan/gold accents, top-down silhouettes, rim lighting and restrained strategic-map detail. Star geometry, surface arcs, corona shapes and facility motifs were authored procedurally as SVG; no external image-generation service or stock imagery was used.

Three additional files were copied byte-for-byte from the read-only Web checkout at `3efaa082edb008cc05ff807a3eea0be89af394aa`:

| Original repository    | Original path                                      | Space Wars destination                        | Use                                |
| ---------------------- | -------------------------------------------------- | --------------------------------------------- | ---------------------------------- |
| Space Explorer RPG Web | `src/assets/artwork/war2_pirate_ragtooth.webp`     | `public/assets/war2_pirate_ragtooth.webp`     | Raider camp and pirate map contact |
| Space Explorer RPG Web | `src/assets/artwork/war2_pirate_needlejack.webp`   | `public/assets/war2_pirate_needlejack.webp`   | Pirate patrol inspector            |
| Space Explorer RPG Web | `src/assets/artwork/war2_pirate_black_ledger.webp` | `public/assets/war2_pirate_black_ledger.webp` | Stronghold inspector               |

All assets below are **ORIGINAL SPACE WARS ASSET**. Their source is the checked-in, deterministic authoring script [`scripts/generate-assets.mjs`](../scripts/generate-assets.mjs), and their destination is `public/assets/original/`. SHA-256 hashes are recorded in the `originalAssets` section of the manifest.

| File                                     | Intended use / distinct design                                        |
| ---------------------------------------- | --------------------------------------------------------------------- |
| `star-0.svg`                             | Yellow main-sequence sun, granular surface strokes and compact corona |
| `star-1.svg`                             | Orange sun with prominent looping magnetic prominences                |
| `star-2.svg`                             | Small red dwarf with subdued halo and tighter surface texture         |
| `star-3.svg`                             | Blue-white star with sharp cross-shaped rays                          |
| `star-4.svg`                             | Large red giant with broader limb and extended flares                 |
| `star-5.svg`                             | Compact pale-white star with strong axial rays                        |
| `star-6.svg`                             | Binary pair: warm primary and smaller blue companion                  |
| `star-7.svg`                             | Energetic flux star with tilted emission ring and jets                |
| `belt-0.svg`, `belt-1.svg`, `belt-2.svg` | Three field geometries/densities for zoomed-in system interiors       |
| `objective-forge.svg`                    | Helios Forge industrial facility marker                               |
| `objective-relay.svg`                    | Nexus Relay travel facility marker                                    |
| `objective-sensors.svg`                  | Deep Sensor Array detection marker                                    |
| `objective-titanium.svg`                 | Titanium Belt resource marker                                         |
| `objective-logistics.svg`                | Ancient Logistics Hub route/fuel marker                               |
| `objective-trade.svg`                    | Trade Nexus exchange marker                                           |
| `guardian.svg`                           | Original stationary Ancient Guardian orbital machine                  |
| `leviathan.svg`                          | Original Void Leviathan armored cosmic organism                       |

Map capture arcs, fleet battle rings, weapon traces and score history charts are also original Space Wars code-native SVG overlays in `GalaxyMap.tsx` / `QuickConquest.tsx`. Existing Lucide glyphs continue under that dependency's license. The result uses **32 copied reference artwork files and 19 new original SVG files**. No reference repositories were edited, no backend assets/configuration were copied, and no unrelated franchise lore or creature art was introduced.
