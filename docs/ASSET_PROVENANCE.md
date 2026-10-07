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
