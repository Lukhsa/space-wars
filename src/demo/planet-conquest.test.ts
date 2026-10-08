import { describe, expect, it } from "vitest";
import { generateGalaxy, routeBetween } from "./galaxy";
import { controller, makePlanet, updateControl } from "./planets";
import { makeFleet } from "./model";
import { stepMatch } from "./simulation";
import { orderFleets, buildShip, createFleet, launchFleet } from "./commands";
import { commissionMiner, orderMiner } from "./mining";
import { constructDefense, homeDefenses } from "./defenses";
import { BALANCE } from "./balance";
import type { DemoState } from "./types";
function quiet() {
  const s = generateGalaxy("planet-contracts");
  s.commanders.forEach((c) => (c.bot = false));
  return s;
}
function run(s: DemoState, n: number) {
  for (let i = 0; i < n; i++) stepMatch(s);
}
function claim(s: DemoState, id: number, owner: number) {
  s.systems[id].planets.forEach((p) => (p.owner = owner));
  updateControl(s.systems[id]);
}
describe("planet conquest contracts", () => {
  it.each([3, 4, 5])(
    "requires strict majority of %i planets without transferring minority worlds",
    (n) => {
      const s = quiet(),
        x = s.systems[8];
      x.planets = Array.from({ length: n }, (_, i) =>
        makePlanet(i, 0, i < Math.floor(n / 2) ? 0 : 1),
      );
      expect(controller(x)).toBe(n % 2 ? 1 : null);
      x.planets[Math.floor(n / 2)].owner = 0;
      updateControl(x);
      expect(x.owner).toBe(0);
      expect(x.planets.at(-1)!.owner).toBe(1);
    },
  );
  it("buffers every protected home with two neutral systems", () => {
    const s = quiet();
    for (let i = 0; i < 8; i++) {
      expect(s.systems[i + 8].owner).toBeNull();
      expect(s.systems[i + 16].owner).toBeNull();
      expect(routeBetween(s, i, (i + 1) % 8).length).toBeGreaterThanOrEqual(8);
      expect(s.systems[i + 8].planets.every((p) => p.owner === null)).toBe(
        true,
      );
    }
  });
  it("captures one planet while preserving nearby enemy defenses and yard inventory", () => {
    const s = quiet();
    claim(s, 24, 1);
    const x = s.systems[24];
    x.installations = homeDefenses().map((d) => ({ ...d, planet: 1 }));
    x.planets[1].reserve = [3, 0, 0, 0];
    s.fleets.push(makeFleet(s, 0, 24, "Occupier", [5, 0, 0, 0]));
    run(s, 20);
    expect(x.planets[0].owner).toBe(0);
    expect(x.planets[1].owner).toBe(1);
    expect(x.installations).toHaveLength(2);
    expect(x.planets[1].reserve[0]).toBe(3);
    expect(constructDefense(s, 0, 24, 0, "station")).toBeNull();
    expect(constructDefense(s, 0, 24, 1, "station")).toBeTruthy();
  });
  it("keeps simultaneous battles on different planets independent and allows an approach window", () => {
    const s = quiet();
    for (let p = 0; p < 2; p++)
      for (let owner = 0; owner < 2; owner++) {
        const f = makeFleet(s, owner, 8, "Squad", [4, 0, 0, 0]);
        f.planet = p;
        s.fleets.push(f);
      }
    run(s, 6);
    expect(s.battles).toHaveLength(2);
    expect(s.battles.every((b) => b.shots.length === 0)).toBe(true);
    expect(
      s.fleets
        .filter((f) => f.system === 8)
        .every((f) => f.units.every((u) => u.hp === 180)),
    ).toBe(true);
    run(s, 1);
    expect(s.battles.every((b) => b.shots.length > 0)).toBe(true);
    expect(new Set(s.battles.map((b) => b.planet)).size).toBe(2);
  });
  it("validates a group order atomically, including combined fuel and committed fleets", () => {
    const s = quiet(),
      a = s.fleets[0],
      b = makeFleet(s, 0, 0, "Second", [5, 0, 0, 0]);
    s.fleets.push(b);
    b.status = "Battle";
    const before = structuredClone(s);
    expect(orderFleets(s, 0, [a.id, b.id], 8, 1)).toBeTruthy();
    expect(s).toEqual(before);
    b.status = "Idle";
    s.resources.fuel = 30;
    const poor = structuredClone(s);
    expect(orderFleets(s, 0, [a.id, b.id], 8, 1)).toBeTruthy();
    expect(s).toEqual(poor);
    s.resources.fuel = 500;
    expect(orderFleets(s, 0, [a.id, b.id], 8, 1)).toBeNull();
    run(s, 100);
    expect(s.systems[8].planets[1].owner).toBe(0);
    expect(s.systems[8].planets[0].owner).toBeNull();
  });
  it("builds and forms fleets locally at a minority-owned forward yard", () => {
    const s = quiet(),
      x = s.systems[24];
    x.planets[0].owner = 0;
    expect(x.owner).toBeNull();
    expect(buildShip(s, "Frigate", 0, 1, 24, 0)).toBeNull();
    run(s, 25);
    expect(x.planets[0].reserve[0]).toBe(1);
    expect(s.reserve[0]).toBe(0);
    expect(createFleet(s, 0, [1, 0, 0, 0], 24, 0)).toBeNull();
    expect(s.fleets.at(-1)!.system).toBe(24);
    expect(s.fleets.at(-1)!.planet).toBe(0);
    expect(x.planets[0].reserve[0]).toBe(0);
  });
  it("pauses a contested yard and discards its jobs and reserve on capture", () => {
    const s = quiet(),
      x = s.systems[24];
    x.planets[0].owner = 0;
    buildShip(s, "Cruiser", 0, 1, 24, 0);
    x.planets[0].reserve[0] = 2;
    s.fleets.push(makeFleet(s, 1, 24, "Raid", [5, 0, 0, 0]));
    run(s, 19);
    expect(x.planets[0].queue[0].elapsed).toBe(0);
    run(s, 1);
    expect(x.planets[0].owner).toBe(1);
    expect(x.planets[0].queue).toEqual([]);
    expect(x.planets[0].reserve).toEqual([0, 0, 0, 0]);
  });
  it("pirates intercept civilian returns without conquering planets; clearing protects cargo and respawns later", () => {
    const s = quiet();
    claim(s, 24, 0);
    expect(commissionMiner(s, 0, 24)).toBeNull();
    const d = s.systems[24].deposits[0];
    orderMiner(s, 0, 24, d.id, false);
    run(s, 32);
    const m = s.miners.find((m) => m.system === 24)!;
    expect(m.status).toBe("Intercepted");
    expect(m.hp).toBe(60);
    expect(s.commanders[0].telemetry.minedAlloy).toBe(0);
    run(s, 16);
    expect(s.commanders[0].telemetry.minedAlloy).toBe(
      Math.floor(d.richness / 2),
    );
    expect(s.systems[24].planets.every((p) => p.owner === 0)).toBe(true);
    s.fleets = s.fleets.filter(
      (f) => !(f.system === 24 && f.neutral === "pirates"),
    );
    run(s, 1);
    const respawn = s.pirateCamps.find((c) => c.system === 24)!.nextSpawn;
    orderMiner(s, 0, 24, d.id, false);
    run(s, 40);
    expect(s.commanders[0].telemetry.minedAlloy).toBe(
      Math.floor(d.richness / 2) + d.richness,
    );
    run(s, respawn - s.time);
    expect(
      s.fleets.some(
        (f) => f.system === 24 && f.neutral === "pirates" && f.planet === -1,
      ),
    ).toBe(true);
  });
  it("deposits deplete, repeat mining changes targets and random spawns remain bounded", () => {
    const s = quiet(),
      x = s.systems[0],
      id = x.deposits[0].id;
    orderMiner(s, 0, 0, id, true);
    run(s, 200);
    expect(x.deposits.some((d) => d.id === id)).toBe(false);
    expect(s.miners[0].deposit).not.toBe(id);
    expect(x.deposits.length).toBeLessThanOrEqual(
      BALANCE.mining.maximumDeposits,
    );
    expect(x.deposits.length).toBeGreaterThan(0);
    expect(s.commanders[0].telemetry.minedAlloy).toBeGreaterThan(0);
  });
  it("orders pirate clearance into resource lanes, separately from planets", () => {
    const s = quiet(),
      f = s.fleets[0];
    expect(launchFleet(s, f.id, 24, "attack", false, -1)).toBeNull();
    run(s, 100);
    expect(f.planet).toBe(-1);
    expect(s.systems[24].planets.every((p) => p.owner === null)).toBe(true);
  });
});
