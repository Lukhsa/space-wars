import { describe, it, expect } from "vitest";
import { generateGalaxy } from "./galaxy";
import { createMapLayout, FIELD_RADIUS, FIELD_GAP } from "./map-layout";
import { WORLD } from "./catalog";
describe("body spacing across 100 seeds", () => {
  it.each([0, 25, 50, 75])(
    "keeps planets and small deposits clear of suns and other bodies: %i",
    (start) => {
      let minStar = Infinity,
        minPlanet = Infinity,
        minDeposit = Infinity,
        minWorld = Infinity;
      for (let seed = start; seed < start + 25; seed++) {
        const s = generateGalaxy(
            seed === 0 ? "ORION-7742" : "BELT-SPACING-" + seed,
          ),
          l = createMapLayout(s.systems, s.seed);
        expect(l.fields.length).toBe(
          s.systems.reduce((n, x) => n + x.deposits.length, 0),
        );
        const worlds = s.systems.flatMap((x) =>
          l.planets[x.id].map((p) => ({ ...p, x: p.x + x.x, y: p.y + x.y })),
        );
        for (const x of s.systems) {
          expect(x.deposits.length).toBeGreaterThanOrEqual(6);
          expect(x.deposits.length).toBeLessThanOrEqual(7);
          expect(x.planets.length).toBeGreaterThanOrEqual(3);
          expect(x.planets.length).toBeLessThanOrEqual(5);
        }
        for (const f of l.fields) {
          expect(
            f.x >= FIELD_RADIUS &&
              f.y >= FIELD_RADIUS &&
              f.x <= WORLD.width - FIELD_RADIUS &&
              f.y <= WORLD.height - FIELD_RADIUS,
          ).toBe(true);
          for (const x of s.systems)
            minStar = Math.min(minStar, Math.hypot(f.x - x.x, f.y - x.y));
          for (const p of worlds)
            minPlanet = Math.min(
              minPlanet,
              Math.hypot(f.x - p.x, f.y - p.y) - p.diameter / 2,
            );
          for (const other of l.fields)
            if (f.deposit !== other.deposit)
              minDeposit = Math.min(
                minDeposit,
                Math.hypot(f.x - other.x, f.y - other.y),
              );
        }
        for (let i = 0; i < worlds.length; i++)
          for (let j = i + 1; j < worlds.length; j++) {
            const a = worlds[i],
              b = worlds[j];
            minWorld = Math.min(
              minWorld,
              Math.hypot(a.x - b.x, a.y - b.y) - (a.diameter + b.diameter) / 2,
            );
          }
      }
      expect(minStar).toBeGreaterThanOrEqual(FIELD_RADIUS + 70 + FIELD_GAP);
      expect(minPlanet).toBeGreaterThanOrEqual(FIELD_RADIUS + FIELD_GAP);
      expect(minDeposit).toBeGreaterThanOrEqual(FIELD_RADIUS * 2 + FIELD_GAP);
      expect(minWorld).toBeGreaterThan(20);
    },
  );
  it("keeps positions stable when ownership changes", () => {
    const s = generateGalaxy("ORION-7742"),
      first = createMapLayout(s.systems, s.seed);
    s.systems.forEach((x) => (x.owner = 0));
    expect(createMapLayout(s.systems, s.seed)).toEqual(first);
  });
});
