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
    output: [0, 0, 0],
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
export function seedPlanetOutput(system: System) {
  // Habitable worlds favor Credits, rocky worlds Alloy, gas/ice worlds Fuel.
  const weights = [
    [5, 2, 1],
    [5, 2, 1],
    [3, 1, 3],
    [2, 4, 1],
    [1, 2, 5],
    [1, 5, 2],
    [1, 1, 6],
    [3, 5, 1],
  ];
  for (const resource of [0, 1, 2] as const) {
    const total = system.planets.reduce(
      (n, p) => n + weights[p.art][resource],
      0,
    );
    const shares = system.planets.map((planet) => {
      const exact =
        (system.output[resource] * weights[planet.art][resource]) / total;
      planet.output[resource] = Math.floor(exact);
      return { planet, remainder: exact - Math.floor(exact) };
    });
    const remaining =
      system.output[resource] -
      system.planets.reduce((n, p) => n + p.output[resource], 0);
    shares.sort(
      (a, b) => b.remainder - a.remainder || a.planet.id - b.planet.id,
    );
    for (let i = 0; i < remaining; i++) shares[i].planet.output[resource]++;
  }
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
