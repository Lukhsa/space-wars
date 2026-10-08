import { BALANCE } from "./balance";
import type { Civilization, ShipClass } from "./types";
export const asset = (name: string) => `/assets/${name}`;
export const civilizations: Civilization[] = [
  { id: "human", name: "Humans", color: "#6cbac8" },
  {
    id: "gorgrak_engine_burners",
    name: "Engine-Burners",
    color: "#dd945b",
    emblem: "faction_emblem_gorgrak_engine_burners.webp",
    portrait: "species_gorgrak_engine_burners.jpg",
  },
  {
    id: "saurian_remnant",
    name: "Kraggs",
    color: "#c3686c",
    emblem: "faction_emblem_saurian_remnant.webp",
    portrait: "species_saurian_remnant.png",
  },
  {
    id: "zetari",
    name: "Zetari",
    color: "#9e9ddb",
    emblem: "faction_emblem_zetari.webp",
    portrait: "species_zetari.jpg",
  },
  {
    id: "solari",
    name: "Solari",
    color: "#d9bf78",
    emblem: "faction_emblem_solari.webp",
    portrait: "species_solari.jpg",
  },
  {
    id: "sylvari_aether_weavers",
    name: "Aether-Weavers",
    color: "#84b8a0",
    emblem: "faction_emblem_sylvari_aether_weavers.webp",
    portrait: "species_aether_weavers.jpg",
  },
  {
    id: "glint_tik_collective",
    name: "Glin'Tok",
    color: "#a7bdd6",
    emblem: "faction_emblem_glint_tik_collective.webp",
    portrait: "species_glint_tik_collective.jpg",
  },
  {
    id: "myrmex_logistics",
    name: "Myrmex",
    color: "#ba94ac",
    emblem: "faction_emblem_myrmex_logistics.webp",
    portrait: "species_myrmex_logistics.jpg",
  },
];
export const planets = [
  "planet_second_earth_base_01.webp",
  "planet_ocean_base_01.png",
  "planet_desert_base_01.png",
  "planet_frozen_base_01.webp",
  "planet_volcanic_base_01.webp",
  "planet_gas_giant_base_01.png",
  "planet_terran_base_01.png",
  "planet_crystal_world_base_01.png",
];
export const planetTypes = [
  "Terrestrial world",
  "Ocean world",
  "Desert world",
  "Frozen world",
  "Volcanic world",
  "Gas giant",
  "Barren world",
  "Crystal world",
];
export const shipClasses: ShipClass[] = [
  "Frigate",
  "Destroyer",
  "Cruiser",
  "Dreadnought",
];
const shipArt = [
  "war2_human_frigate.webp",
  "war2_engine_burner_overburn_destroyer.webp",
  "war2_human_cruiser.webp",
  "war2_human_dreadnought.webp",
];
export const ships = Object.fromEntries(
  shipClasses.map((kind, i) => [
    kind,
    { art: shipArt[i], ...BALANCE.ships[i] },
  ]),
) as Record<ShipClass, (typeof BALANCE.ships)[number] & { art: string }>;
export const WORLD = { width: 10000, height: 9000 };
export const HOME = 0;
