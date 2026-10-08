import type { DemoState, Planet, System } from "./types";
export const majority = (system: System) =>
  Math.floor(system.planets.length / 2) + 1;
export function controller(system: System) {
  const counts = new Map<number, number>();
  for (const p of system.planets)
    if (p.owner !== null) counts.set(p.owner, (counts.get(p.owner) ?? 0) + 1);
  return [...counts].find(([, n]) => n >= majority(system))?.[0] ?? null;
}
export function updateControl(system: System) {
  system.owner = controller(system);
}
export const planetName = (system: System, planet: number) =>
  planet < 0
    ? `${system.name} resource lanes`
    : `${system.name} ${["I", "II", "III", "IV", "V"][planet]}`;
export const ownedPlanets = (s: DemoState, owner: number) =>
  s.systems.flatMap((system) =>
    system.planets
      .filter((p) => p.owner === owner)
      .map((planet) => ({ system, planet })),
  );
export const ownedYards = (s: DemoState, owner: number) =>
  ownedPlanets(s, owner).filter((x) => x.planet.shipyard);
export function makePlanet(
  id: number,
  art: number,
  owner: number | null,
  shipyard = false,
): Planet {
  return {
    id,
    art,
    owner,
    shipyard,
    capture: null,
    capturedAt: -100,
    reserve: [0, 0, 0, 0],
    queue: [],
  };
}
export function planetOffset(system: System, id: number) {
  if (id < 0) return { x: 240, y: -80 };
  const angle = id * 2.399 + system.id * 1.73 + 0.4;
  const orbit = 145 + id * 14;
  return { x: Math.cos(angle) * orbit, y: Math.sin(angle) * orbit * 0.85 };
}
export const planetPosition = (system: System, id: number) => {
  const p = planetOffset(system, id);
  return { x: system.x + p.x, y: system.y + p.y };
};
