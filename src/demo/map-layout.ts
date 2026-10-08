import { asteroidAppearance } from "./asteroid-art";
import { planetOffset } from "./planets";
import type { Point, System } from "./types";
export interface PlanetVisual extends Point {
  kind: number;
  orbit: number;
  diameter: number;
}
export interface AsteroidVisual extends Point {
  system: number;
  deposit: number;
  angle: number;
  appearance: ReturnType<typeof asteroidAppearance>;
}
export const FIELD_RADIUS = 12;
export const FIELD_GAP = 8;
export function createMapLayout(systems: System[], seed: string) {
  const planets = systems.map((s) =>
    s.planets.map((p, i): PlanetVisual => ({
      ...planetOffset(s, i),
      kind: p.art,
      orbit: 145 + i * 14,
      diameter: p.art === 5 ? 44 : 30 + ((s.id + i) % 3) * 6,
    })),
  );
  const fields: AsteroidVisual[] = systems.flatMap((s) =>
    s.deposits.map((d) => ({
      system: s.id,
      deposit: d.id,
      x: s.x + d.x,
      y: s.y + d.y,
      angle: d.slot * 37,
      appearance: asteroidAppearance(seed, d.id),
    })),
  );
  return { planets, fields };
}
