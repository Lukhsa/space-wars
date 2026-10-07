import { WORLD } from "./catalog";
import { randomFrom } from "./random";
import type { Point, System } from "./types";

export interface PlanetVisual extends Point {
  kind: number;
  orbit: number;
  diameter: number;
}
export interface AsteroidVisual extends Point {
  system: number;
  angle: number;
}
export const FIELD_WIDTH = 168;
export const FIELD_HEIGHT = 64;
// Covers the rotated artwork, complete pointer target and label at every zoom.
export const FIELD_RADIUS = 108;
export const FIELD_GAP = 24;

export function createMapLayout(systems: System[], seed: string) {
  const occupied: (Point & { radius: number })[] = [];
  const planets = systems.map((s) => {
    occupied.push({ x: s.x, y: s.y, radius: 88 });
    const reach = Math.max(
      145,
      Math.min(
        205,
        Math.min(
          ...systems
            .filter((other) => other.id !== s.id)
            .map((other) => Math.hypot(s.x - other.x, s.y - other.y)),
        ) * 0.48,
      ),
    );
    return s.planets.map((kind, i): PlanetVisual => {
      const base = i * 2.399 + s.id * 1.73 + 0.4;
      const angle =
        base +
        (Math.sin(base) > 0.45 && Math.abs(Math.cos(base)) < 0.45 ? 0.7 : 0);
      const orbit = reach * (0.62 + i * 0.12);
      const diameter = kind === 5 ? 44 : 30 + ((s.id + i) % 3) * 6;
      const planet = {
        x: Math.cos(angle) * orbit,
        y: Math.sin(angle) * orbit * 0.85,
        kind,
        orbit,
        diameter,
      };
      occupied.push({
        x: s.x + planet.x,
        y: s.y + planet.y,
        radius: diameter / 2 + 9,
      });
      return planet;
    });
  });
  const random = randomFrom(`asteroid-layout:${seed}`);
  const fields: AsteroidVisual[] = [];
  const clear = (p: Point) =>
    p.x >= FIELD_RADIUS &&
    p.y >= FIELD_RADIUS &&
    p.x <= WORLD.width - FIELD_RADIUS &&
    p.y <= WORLD.height - FIELD_RADIUS &&
    occupied.every(
      (body) =>
        Math.hypot(p.x - body.x, p.y - body.y) >=
        FIELD_RADIUS + body.radius + FIELD_GAP,
    );
  for (const system of systems.filter((s) => s.asteroid)) {
    const heading =
      system.id === 0 ? -2.7 + random() * 0.2 : random() * Math.PI * 2;
    let position: Point | undefined;
    // Seeded candidates favor nearby open space, outside the planetary orbits.
    for (let radius = 220; radius <= 820 && !position; radius += 35) {
      for (let step = 0; step < 48; step++) {
        const angle = heading + (step * Math.PI * 2) / 48;
        const candidate = {
          x: system.x + Math.cos(angle) * radius,
          y: system.y + Math.sin(angle) * radius,
        };
        if (clear(candidate)) {
          position = candidate;
          break;
        }
      }
    }
    if (!position) {
      const candidates: Point[] = [];
      for (let y = FIELD_RADIUS; y <= WORLD.height - FIELD_RADIUS; y += 48)
        for (let x = FIELD_RADIUS; x <= WORLD.width - FIELD_RADIUS; x += 48)
          if (clear({ x, y })) candidates.push({ x, y });
      candidates.sort(
        (a, b) =>
          Math.hypot(a.x - system.x, a.y - system.y) -
          Math.hypot(b.x - system.x, b.y - system.y),
      );
      position = candidates[0];
    }
    if (!position)
      throw new Error(`No clear asteroid location for ${system.name}`);
    fields.push({
      ...position,
      system: system.id,
      angle: (random() - 0.5) * 50,
    });
    occupied.push({ ...position, radius: FIELD_RADIUS });
  }
  return { planets, fields };
}
