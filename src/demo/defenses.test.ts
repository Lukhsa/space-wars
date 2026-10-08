import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { generateGalaxy } from "./galaxy";
import {
  constructDefense,
  defenseQuote,
  defenseSpec,
  defenseTick,
  homeDefenses,
} from "./defenses";
import { buildShip, launchFleet, retreatFleet } from "./commands";
import { makeFleet } from "./model";
import { advanceDemo, stepMatch } from "./simulation";
import { botTick } from "./ai";
import type { DemoState, DefenseKind, Installation } from "./types";
function quiet() {
  const s = generateGalaxy("defense-acceptance");
  s.commanders.forEach((c) => {
    c.bot = false;
  });
  s.systems[8].owner = 0;
  return s;
}
function run(s: DemoState, n: number) {
  for (let i = 0; i < n; i++) stepMatch(s);
}
function rich(s: DemoState) {
  s.commanders[0].resources.credits = s.commanders[0].resources.alloy = 10000;
}
function installed(s: DemoState, kind: DefenseKind, level = 1) {
  const d: Installation = {
    planet: 0,
    kind,
    level,
    hp: defenseSpec(kind, level).hull,
    job: null,
  };
  s.systems[8].installations.push(d);
  return d;
}
describe("planetary defense lifecycle", () => {
  it("gives all eight protected homes identical free level-one structures on the primary planet", () => {
    const s = quiet();
    for (let i = 0; i < 8; i++) {
      expect(s.systems[i].installations).toEqual(homeDefenses());
      expect(s.commanders[i].resources).toEqual(BALANCE.startingResources);
      expect(s.commanders[i].telemetry.defensesBuilt).toBe(0);
    }
    expect(launchFleet(s, s.fleets[0].id, 1, "attack")).toMatch(/protected/);
  });
  it("pays once, constructs over time and forbids duplicate jobs or slots", () => {
    const s = quiet(),
      before = { ...s.resources },
      fleetCount = s.fleets.length;
    expect(constructDefense(s, 0, 8, 0, "station")).toBeNull();
    const paid = { ...s.resources };
    expect(before.alloy - paid.alloy).toBe(250);
    expect(constructDefense(s, 0, 8, 0, "station")).toMatch(/occupied/);
    expect(s.resources).toEqual(paid);
    const d = s.systems[8].installations[0];
    expect(d.hp).toBe(0);
    run(s, 59);
    expect(d.level).toBe(0);
    run(s, 1);
    expect(d.level).toBe(1);
    expect(s.fleets.length).toBe(fleetCount);
    expect(s.systems[8].installations).toHaveLength(1);
  });
  it("rejects enemy, neutral, invalid planets, kinds and unaffordable orders atomically", () => {
    const s = quiet(),
      before = structuredClone(s);
    for (const id of [1, 9])
      expect(constructDefense(s, 0, id, 0, "station")).toBeTruthy();
    for (const p of [-1, 99, 0.5])
      expect(constructDefense(s, 0, 8, p, "station")).toBeTruthy();
    expect(constructDefense(s, 0, 8, 0, "invalid" as DefenseKind)).toBeTruthy();
    expect(s).toEqual(before);
    s.resources.alloy = 0;
    expect(constructDefense(s, 0, 8, 0, "railgun")).toBeTruthy();
  });
  it("upgrades sequentially to three, preserves damage fraction, and cannot skip or exceed levels", () => {
    const s = quiet();
    rich(s);
    const d = installed(s, "station");
    d.hp /= 2;
    for (const level of [2, 3]) {
      expect(constructDefense(s, 0, 8, 0, "station")).toBeNull();
      run(s, defenseSpec("station", level).seconds);
      expect(d.level).toBe(level);
      expect(d.hp).toBe(defenseSpec("station", level).hull / 2);
    }
    const before = { ...s.resources };
    expect(constructDefense(s, 0, 8, 0, "station")).toBeTruthy();
    expect(s.resources).toEqual(before);
  });
  it("bounds crews and increases costs on additional planets", () => {
    const s = quiet();
    rich(s);
    s.systems[9].owner = 0;
    expect(defenseQuote(s.systems[8], 1, "station")!.alloy).toBeGreaterThan(
      defenseQuote(s.systems[8], 0, "station")!.alloy,
    );
    expect(constructDefense(s, 0, 8, 0, "station")).toBeNull();
    expect(constructDefense(s, 0, 9, 0, "railgun")).toBeNull();
    expect(constructDefense(s, 0, 0, 1, "station")).toMatch(/crews/);
    expect(constructDefense(s, 0, 8, 1, "railgun")).toMatch(/occupied/);
  });
  it("repairs persistently damaged structures with paid time and reconstructs ruins at level one", () => {
    const s = quiet();
    rich(s);
    const d = installed(s, "station", 3);
    d.hp /= 2;
    run(s, 10);
    expect(d.hp).toBe(850);
    const q = defenseQuote(s.systems[8], 0, "station", true)!;
    expect(constructDefense(s, 0, 8, 0, "station", true)).toBeNull();
    expect(s.commanders[0].telemetry.repairAlloy).toBe(q.alloy);
    run(s, q.duration - 1);
    expect(d.hp).toBe(850);
    run(s, 1);
    expect(d.hp).toBe(1700);
    d.hp = 0;
    expect(constructDefense(s, 0, 8, 0, "station", true)).toBeTruthy();
    expect(constructDefense(s, 0, 8, 0, "station")).toBeNull();
    run(s, 60);
    expect(d.level).toBe(1);
    expect(s.systems[8].installations).toHaveLength(1);
  });
  it("pauses work during enemy presence and never completes repairs in battle", () => {
    const s = quiet();
    const d = installed(s, "station");
    d.hp = 400;
    expect(constructDefense(s, 0, 8, 0, "station", true)).toBeNull();
    d.job!.elapsed = d.job!.duration - 1;
    s.fleets.push(makeFleet(s, 1, 8, "Hostile", [1, 0, 0, 0]));
    defenseTick(s);
    expect(d.hp).toBe(400);
    expect(d.job).not.toBeNull();
    expect(constructDefense(s, 0, 8, 1, "railgun")).toMatch(/enemies/);
  });
});
describe("defense combat and capture", () => {
  it("fires without a defending fleet, takes damage, blocks capture, then is destroyed by a stronger assault", () => {
    const s = quiet();
    const d = installed(s, "station");
    const f = makeFleet(s, 1, 8, "Siege", [0, 2, 3, 1]);
    s.fleets.push(f);
    run(s, 1);
    expect(d.hp).toBeLessThan(800);
    expect(f.units.some((u) => u.hp < BALANCE.ships[u.kind].hull)).toBe(true);
    expect(s.systems[8].capture).toBeNull();
    expect(s.battles).toHaveLength(1);
    run(s, 100);
    expect(s.systems[8].owner).toBe(1);
    expect(s.systems[8].installations).toEqual([]);
    expect(s.commanders[0].telemetry.defensesDestroyed).toBe(1);
    expect(s.commanders[1].telemetry.salvageAlloy).toBe(0);
  });
  it("railguns favor capital ships, fire every four ticks, and are weaker against escorts", () => {
    const s = quiet();
    installed(s, "railgun", 3);
    const f = makeFleet(s, 1, 8, "Mixed", [1, 0, 0, 1]);
    s.fleets.push(f);
    run(s, 1);
    const capital = f.units.find((u) => u.kind === 3)!;
    const hp = capital.hp;
    expect(hp).toBeLessThan(2500);
    expect(f.units.find((u) => u.kind === 0)!.hp).toBe(180);
    run(s, 3);
    expect(capital.hp).toBe(hp);
    run(s, 1);
    expect(capital.hp).toBeLessThan(hp);
    const a = quiet();
    installed(a, "railgun");
    const small = makeFleet(a, 1, 8, "Small", [1, 0, 0, 0]);
    a.fleets.push(small);
    run(a, 1);
    expect(180 - small.units[0].hp).toBeLessThan((2500 - hp) * 0.5);
  });
  it("maximum multi-planet fortification remains conquerable and produces no stalled battle", () => {
    const s = quiet();
    for (let planet = 0; planet < s.systems[8].planets.length; planet++)
      for (const kind of ["station", "railgun"] as const) {
        const d = installed(s, kind, 3);
        d.planet = planet;
      }
    s.fleets.push(makeFleet(s, 1, 8, "Siege armada", [6, 6, 10, 10]));
    run(s, 180);
    expect(s.systems[8].owner).toBe(1);
    expect(s.battles).toHaveLength(0);
  });
  it("never turns an installation into a mobile fleet and cancels destroyed upgrade jobs", () => {
    const s = quiet();
    rich(s);
    const d = installed(s, "station");
    constructDefense(s, 0, 8, 0, "station");
    const before = s.fleets.map((f) => f.id);
    expect(launchFleet(s, -100, 9, "attack")).toBeTruthy();
    s.fleets.push(makeFleet(s, 1, 8, "Overwhelming", [0, 0, 0, 20]));
    run(s, 1);
    expect(d.hp).toBe(0);
    expect(d.job).toBeNull();
    expect(s.fleets.filter((f) => before.includes(f.id))).toHaveLength(
      before.length,
    );
  });
  it("clears unfinished enemy jobs on capture without transferring paid upgrades or granting salvage", () => {
    const s = quiet();
    constructDefense(s, 0, 8, 0, "railgun");
    s.fleets.push(makeFleet(s, 1, 8, "Occupier", [3, 0, 0, 0]));
    run(s, 25);
    expect(s.systems[8].owner).toBe(1);
    expect(s.systems[8].installations).toHaveLength(0);
    expect(s.commanders[1].telemetry.salvageAlloy).toBe(0);
    run(s, 60);
    expect(s.systems[8].installations).toHaveLength(0);
  });
  it("intercepts travel through hostile stationary defenses", () => {
    const s = quiet();
    s.systems[8].owner = 1;
    installed(s, "station");
    const f = s.fleets.find((f) => f.owner === 0)!;
    f.route = [0, 8, 16];
    f.duration = 1;
    f.status = "Moving";
    run(s, 1);
    expect(f.system).toBe(8);
    expect(f.route).toEqual([]);
    expect(f.status).toBe("Battle");
  });
});
describe("repeat mining and economy", () => {
  it("pays exactly once per cycle, repeats, and cancels without a partial reward", () => {
    const s = quiet(),
      f = s.fleets.find((f) => f.owner === 0)!;
    expect(launchFleet(s, f.id, 0, "mine", true)).toBeNull();
    run(s, 120);
    expect(s.commanders[0].telemetry.minedAlloy).toBe(270);
    expect(f.status).toBe("Mining");
    run(s, 20);
    launchFleet(s, f.id, 0, "defend");
    run(s, 60);
    expect(s.commanders[0].telemetry.minedAlloy).toBe(270);
  });
  it("bounds extraction capacity and rejects unowned mining orders", () => {
    const s = quiet(),
      fs = s.fleets.filter((f) => f.owner === 0);
    launchFleet(s, fs[0].id, 0, "mine", true);
    expect(launchFleet(s, fs[1].id, 0, "mine", true)).toMatch(/assigned/);
    expect(launchFleet(s, fs[1].id, 9, "mine", true)).toMatch(/Control/);
  });
  it("cancels repeat orders and partial cycles upon battle, ownership loss, or retreat", () => {
    const s = quiet(),
      f = s.fleets.find((f) => f.owner === 0)!;
    f.system = 8;
    launchFleet(s, f.id, 8, "mine", true);
    run(s, 20);
    s.fleets.push(makeFleet(s, 1, 8, "Interruption", [1, 0, 0, 0]));
    run(s, 1);
    expect(f.repeatMining).toBe(false);
    expect(f.miningElapsed).toBe(0);
    expect(s.commanders[0].telemetry.minedAlloy).toBe(0);
    const other = quiet(),
      miner = other.fleets[0];
    launchFleet(other, miner.id, 0, "mine", true);
    other.systems[0].owner = 1;
    run(other, 1);
    expect(miner.repeatMining).toBe(false);
    const retreat = quiet(),
      r = retreat.fleets[0];
    r.system = 8;
    launchFleet(retreat, r.id, 8, "mine", true);
    expect(retreatFleet(retreat, r.id)).toBeNull();
    expect(r.repeatMining).toBe(false);
  });
  it("sustained extraction supports materially more shipbuilding than an identical no-mining economy", () => {
    const ships = [false, true].map((mine) => {
      const s = quiet();
      s.systems[8].owner = null;
      if (mine) launchFleet(s, s.fleets[0].id, 0, "mine", true);
      for (let i = 0; i < 1200; i++) {
        if (i % 25 === 0) buildShip(s, "Frigate");
        stepMatch(s);
      }
      expect(s.resources.alloy).toBeGreaterThanOrEqual(0);
      return s.commanders[0].stats.built;
    });
    expect(ships[1]).toBeGreaterThan(ships[0] * 1.5);
  });
  it("normal and accelerated time use identical defense, combat and mining rules", () => {
    const s = quiet();
    constructDefense(s, 0, 8, 0, "station");
    launchFleet(s, s.fleets[0].id, 0, "mine", true);
    let slow = structuredClone(s);
    for (let i = 0; i < 160; i++) slow = advanceDemo(slow, 0.5);
    expect(advanceDemo(s, 80)).toEqual(slow);
  });
  it("bot construction uses legal budgets and completed matches have finite nonnegative economies", () => {
    const s = generateGalaxy("bot-defense-correctness", 2400, true);
    run(s, 2400);
    expect(s.status).toBe("finished");
    expect(s.commanders.some((c) => c.telemetry.defensesBuilt > 0)).toBe(true);
    for (const c of s.commanders)
      for (const n of Object.values(c.resources)) {
        expect(Number.isFinite(n)).toBe(true);
        expect(n).toBeGreaterThanOrEqual(0);
      }
    const empty = quiet();
    empty.commanders[0].bot = true;
    empty.resources.alloy = empty.resources.credits = 0;
    empty.time = 500;
    botTick(empty);
    expect(empty.systems[8].installations).toHaveLength(0);
  });
  it("does not apply defense damage or construction after match completion", () => {
    const s = quiet();
    installed(s, "station");
    s.status = "finished";
    expect(constructDefense(s, 0, 8, 1, "railgun")).toBeTruthy();
    const copy = structuredClone(s);
    stepMatch(s);
    expect(s).toEqual(copy);
  });
});
