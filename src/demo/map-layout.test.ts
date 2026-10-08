import { describe, expect, it } from "vitest";
import { generateGalaxy } from "./galaxy";
import { createMapLayout, FIELD_GAP, FIELD_RADIUS } from "./map-layout";
import { WORLD } from "./catalog";

describe("asteroid placement", () => {
  // Keep all 100 seeds and assertions, with bounded batches on slower machines.
  it.each([0, 25, 50, 75])(
    "keeps fields clear of suns, planets, labels and other fields: seed batch %s",
    (start) => {
      for (let seed = start; seed < start + 25; seed++) {
        const state = generateGalaxy(
          seed === 0 ? "ORION-7742" : `BELT-SPACING-${seed}`,
        );
        const layout = createMapLayout(state.systems, state.seed);
        expect(layout.fields.map((f) => f.system)).toEqual(
          state.systems.filter((s) => s.asteroid).map((s) => s.id),
        );
        for (const field of layout.fields) {
          expect(field.x).toBeGreaterThanOrEqual(FIELD_RADIUS);
          expect(field.y).toBeGreaterThanOrEqual(FIELD_RADIUS);
          expect(field.x).toBeLessThanOrEqual(WORLD.width - FIELD_RADIUS);
          expect(field.y).toBeLessThanOrEqual(WORLD.height - FIELD_RADIUS);
          for (const system of state.systems) {
            expect(
              Math.hypot(field.x - system.x, field.y - system.y),
            ).toBeGreaterThanOrEqual(FIELD_RADIUS + 88 + FIELD_GAP);
            for (const planet of layout.planets[system.id]) {
              expect(
                Math.hypot(
                  field.x - system.x - planet.x,
                  field.y - system.y - planet.y,
                ),
              ).toBeGreaterThanOrEqual(
                FIELD_RADIUS + planet.diameter / 2 + 9 + FIELD_GAP,
              );
            }
          }
          for (const other of layout.fields.filter(
            (other) => other.system !== field.system,
          )) {
            expect(
              Math.hypot(field.x - other.x, field.y - other.y),
            ).toBeGreaterThanOrEqual(FIELD_RADIUS * 2 + FIELD_GAP);
          }
        }
      }
    },
    15000,
  );
  it("uses reproducible field positions that remain stable when ownership changes", () => {
    const state = generateGalaxy("ORION-7742");
    const first = createMapLayout(state.systems, state.seed);
    expect(createMapLayout(state.systems, state.seed)).toEqual(first);
    state.systems.forEach((s) => {
      s.owner = 0;
    });
    expect(createMapLayout(state.systems, state.seed)).toEqual(first);
  });
});
