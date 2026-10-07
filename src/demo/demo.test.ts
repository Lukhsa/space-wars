import { describe, expect, it } from "vitest";
import { generateGalaxy, routeBetween } from "./galaxy";
import {
  advanceDemo,
  buildShip,
  fleetPosition,
  launchFleet,
  MINING_SECONDS,
  moving,
  reinforceFleet,
} from "./simulation";
import { createCells, territoryPaths } from "./territory";

describe("seeded local galaxy", () => {
  it("advances without mutating the previous frame or its systems", () => {
    const original = generateGalaxy("immutable");
    launchFleet(original, 0, 2, "attack");
    const snapshot = structuredClone(original);
    const next = advanceDemo(original, 70);
    expect(original).toEqual(snapshot);
    expect(next.systems[2].owner).toBe(0);
    expect(next.systems[0]).toBe(original.systems[0]);
  });
  it("reproduces the entire initial galaxy from its seed", () => {
    expect(generateGalaxy("orion")).toEqual(generateGalaxy("orion"));
    expect(generateGalaxy("other").systems).not.toEqual(
      generateGalaxy("orion").systems,
    );
  });
  it.each(["orion", "12345", "a", "frontier", "7742"])(
    "has a connected graph and viable player spawn: %s",
    (seed) => {
      const s = generateGalaxy(seed);
      expect(s.systems).toHaveLength(160);
      expect(s.commanders).toHaveLength(32);
      expect(s.fleets).toHaveLength(34);
      expect(s.systems[0].owner).toBe(0);
      expect(s.systems[0].capital).toBe(true);
      for (const system of s.systems) {
        expect(routeBetween(s, 0, system.id).at(-1)).toBe(system.id);
        expect(Number.isFinite(system.x + system.y)).toBe(true);
      }
      expect(new Set(s.systems.map((s) => s.name)).size).toBe(160);
    },
  );
  it("moves along every leg and arrives without teleporting", () => {
    let s = generateGalaxy("movement");
    const path = routeBetween(s, 0, 20);
    expect(path.length).toBeGreaterThan(2);
    expect(launchFleet(s, 0, 20, "move")).toBeNull();
    const start = fleetPosition(s, s.fleets[0]);
    const duration = s.fleets[0].duration;
    s = advanceDemo(s, duration / 2);
    expect(moving(s.fleets[0])).toBe(true);
    expect(fleetPosition(s, s.fleets[0])).not.toEqual(start);
    s = advanceDemo(s, duration / 2 + 0.2);
    expect(s.fleets[0].system).toBe(20);
    expect(moving(s.fleets[0])).toBe(false);
  });
  it("captures a target, updates territory geometry and emits a report", () => {
    let s = generateGalaxy("capture");
    const cells = createCells(s.systems),
      before = territoryPaths(s.systems, cells).find(
        (t) => t.owner === 0,
      )!.path;
    s.systems[2].defense = 100;
    expect(launchFleet(s, 0, 2, "attack")).toBeNull();
    s = advanceDemo(s, 61);
    expect(s.systems[2].owner).toBe(0);
    expect(s.reports[0].victory).toBe(true);
    expect(
      territoryPaths(s.systems, cells).find((t) => t.owner === 0)!.path,
    ).not.toEqual(before);
    expect(s.events.some((e) => e.title === "Territory secured")).toBe(true);
  });
  it("mines once, awards Alloy and returns the fleet to idle", () => {
    let s = generateGalaxy("mining");
    const before = s.resources.alloy,
      yieldAmount = s.systems[3].richness;
    s.fleets[2].status = "Idle";
    expect(launchFleet(s, 2, 3, "mine")).toBeNull();
    s = advanceDemo(s, MINING_SECONDS + 0.1);
    expect(s.resources.alloy).toBe(before + yieldAmount);
    expect(s.fleets[2].status).toBe("Idle");
    s = advanceDemo(s, MINING_SECONDS);
    expect(s.resources.alloy).toBe(before + yieldAmount);
  });
  it("deducts construction costs and adds a completed ship to reserve", () => {
    let s = generateGalaxy("build");
    s.queue = [];
    const before = s.resources.credits,
      reserve = s.reserve[0];
    expect(buildShip(s, "Frigate")).toBeNull();
    expect(s.resources.credits).toBe(before - 320);
    s = advanceDemo(s, 10.1);
    expect(s.reserve[0]).toBe(reserve + 1);
    expect(s.queue).toHaveLength(0);
    const count = s.fleets[0].ships[0];
    expect(reinforceFleet(s, 0)).toBeNull();
    expect(s.fleets[0].ships[0]).toBeGreaterThan(count);
    expect(s.reserve.every((n) => n === 0)).toBe(true);
  });
  it("rejects duplicate travel and unaffordable/full production", () => {
    const s = generateGalaxy("guards");
    expect(launchFleet(s, 0, 2, "move")).toBeNull();
    expect(launchFleet(s, 0, 5, "move")).not.toBeNull();
    expect(buildShip(s, "Frigate")).toBeNull();
    expect(buildShip(s, "Cruiser")).not.toBeNull();
    s.queue = [];
    s.resources.alloy = 0;
    expect(buildShip(s, "Frigate")).not.toBeNull();
  });
  it("keeps a prolonged demo reproducible and free from invalid state", () => {
    const first = advanceDemo(generateGalaxy("soak"), 300),
      second = advanceDemo(generateGalaxy("soak"), 300);
    expect(first).toEqual(second);
    expect(first.events.some((e) => !e.player)).toBe(true);
    expect(
      Object.values(first.resources).every((n) => Number.isFinite(n) && n >= 0),
    ).toBe(true);
    for (const f of first.fleets) {
      expect(first.systems[f.system]).toBeDefined();
      expect(f.power).toBeGreaterThan(0);
      const p = fleetPosition(first, f);
      expect(Number.isFinite(p.x + p.y)).toBe(true);
    }
    for (const s of first.systems)
      if (s.owner !== null) expect(first.commanders[s.owner]).toBeDefined();
  });
});
