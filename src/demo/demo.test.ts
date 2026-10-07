import { describe, expect, it } from "vitest";
import { generateGalaxy, routeBetween } from "./galaxy";
import { advanceDemo, stepMatch } from "./simulation";
import {
  buildShip,
  createFleet,
  fleetPosition,
  launchFleet,
  reinforceFleet,
  retreatFleet,
  setStance,
} from "./commands";
import { BALANCE } from "./balance";
import {
  external,
  makeFleet,
  moving,
  standings,
  strengthEstimate,
  visibleSystems,
} from "./model";
import { triggerObjective } from "./objectives";
import { botTick } from "./ai";
import { createCells, territoryPaths } from "./territory";
import type { DemoState } from "./types";
function quiet(seed = "test") {
  const s = generateGalaxy(seed);
  s.commanders.forEach((c) => (c.bot = false));
  return s;
}
function run(s: DemoState, seconds: number) {
  for (let i = 0; i < seconds; i++) stepMatch(s);
  return s;
}

describe("seeded star systems", () => {
  it("repeats full initial state, changes layout and objectives with seed", () => {
    expect(generateGalaxy("a")).toEqual(generateGalaxy("a"));
    expect(generateGalaxy("a").systems).not.toEqual(
      generateGalaxy("b").systems,
    );
  });
  it.each(["orion", "abc", "123", "vega", "28"])(
    "has eight equal spawns and a connected 28-node graph: %s",
    (seed) => {
      const s = generateGalaxy(seed);
      expect(s.systems).toHaveLength(28);
      expect(s.commanders).toHaveLength(8);
      expect(s.commanders.filter((c) => c.bot)).toHaveLength(7);
      expect(s.systems.filter((x) => x.capital)).toHaveLength(8);
      expect(new Set(s.systems.map((x) => x.name)).size).toBe(28);
      for (const x of s.systems) {
        expect(routeBetween(s, 0, x.id).at(-1)).toBe(x.id);
        expect(x.planets.length).toBeGreaterThanOrEqual(1);
      }
      for (const c of s.commanders) {
        expect(s.systems[c.id].owner).toBe(c.id);
        expect(s.systems[c.id].output).toEqual([...BALANCE.homeIncome]);
        expect(
          s.lanes.filter((l) => l.a === c.id || l.b === c.id),
        ).toHaveLength(2);
        expect(c.resources).toEqual(s.commanders[0].resources);
      }
      expect(s.systems.slice(16, 24).every((x) => x.strategic)).toBe(true);
    },
  );
  it("preserves prior frames and fixed-step equivalence", () => {
    const s = quiet(),
      copy = structuredClone(s);
    const a = advanceDemo(s, 50);
    let b = s;
    for (let i = 0; i < 250; i++) b = advanceDemo(b, 0.2);
    expect(s).toEqual(copy);
    expect(a).toEqual(b);
  });
});
describe("economy and fleets", () => {
  it("charges a bulk build once, uses two berths and completes reserve ships", () => {
    const s = quiet(),
      start = s.resources.credits;
    expect(buildShip(s, "Frigate", 0, 3)).toBeNull();
    expect(s.resources.credits).toBe(start - 720);
    run(s, 25);
    expect(s.reserve[0]).toBe(2);
    expect(s.queue).toHaveLength(1);
    run(s, 25);
    expect(s.reserve[0]).toBe(3);
    expect(s.commanders[0].stats.built).toBe(3);
  });
  it("mines owned deposits once and cannot extract from hostile control", () => {
    const s = quiet(),
      f = s.fleets[1];
    expect(launchFleet(s, f.id, 0, "mine")).toBeNull();
    run(s, 40);
    expect(s.commanders[0].stats.mined).toBe(265);
    run(s, 40);
    expect(s.commanders[0].stats.mined).toBe(265);
  });
  it("forms and reinforces fleets without duplicating ships", () => {
    const s = quiet();
    s.reserve[0] = 6;
    expect(createFleet(s, 0, [2, 0, 0, 0])).toBeNull();
    expect(s.reserve[0]).toBe(4);
    const f = s.fleets.at(-1)!;
    expect(reinforceFleet(s, f.id)).toBeNull();
    expect(f.ships[0]).toBe(6);
    expect(s.reserve[0]).toBe(0);
    expect(reinforceFleet(s, f.id)).not.toBeNull();
  });
  it("travels on lanes and captures after an occupation delay", () => {
    const s = quiet(),
      f = s.fleets[0],
      before = territoryPaths(s.systems, createCells(s.systems))[0].path;
    expect(launchFleet(s, f.id, 8, "attack")).toBeNull();
    const duration = f.duration;
    run(s, Math.floor(duration / 2));
    expect(fleetPosition(s, f).x).not.toBe(s.systems[0].x);
    expect(s.systems[8].owner).toBeNull();
    run(s, Math.ceil(duration / 2));
    expect(f.system).toBe(8);
    expect(s.systems[8].owner).toBeNull();
    run(s, 20);
    expect(s.systems[8].owner).toBe(0);
    expect(territoryPaths(s.systems, createCells(s.systems))[0].path).not.toBe(
      before,
    );
  });
  it("rejects protected homes, unaffordable builds and invalid numbers", () => {
    const s = quiet();
    expect(launchFleet(s, s.fleets[0].id, 1, "attack")).not.toBeNull();
    expect(buildShip(s, "Dreadnought", 0, 10)).not.toBeNull();
    expect(buildShip(s, "Frigate", 0, NaN)).not.toBeNull();
    expect(createFleet(s, 0, [-1, 0, 0, 0])).not.toBeNull();
    expect(s.systems[1].owner).toBe(1);
  });
});
describe("combat and information", () => {
  function battle() {
    const s = quiet("combat");
    s.fleets = s.fleets.filter((f) => f.owner < 0);
    const a = makeFleet(s, 0, 8, "Alpha", [5, 2, 0, 0]),
      b = makeFleet(s, 1, 8, "Beta", [5, 2, 0, 0]);
    s.fleets.push(a, b);
    return { s, a, b };
  }
  it("resolves over time with casualties and repeats exactly", () => {
    const { s } = battle(),
      copy = structuredClone(s);
    run(s, 5);
    expect(s.battles).toHaveLength(1);
    run(s, 90);
    run(copy, 95);
    expect(s).toEqual(copy);
    expect(s.battles).toHaveLength(0);
    expect(
      s.commanders[0].stats.destroyed + s.commanders[1].stats.destroyed,
    ).toBeGreaterThan(0);
    expect(s.completedBattles).toBe(1);
  });
  it("retreat takes exposed time and then travels home", () => {
    const { s, a } = battle();
    stepMatch(s);
    setStance(s, a.id, "Defensive");
    expect(retreatFleet(s, a.id)).toBeNull();
    run(s, 5);
    expect(a.system).toBe(8);
    expect(moving(a)).toBe(false);
    run(s, 1);
    expect(moving(a)).toBe(true);
    expect(a.system).toBe(8);
    run(s, 100);
    expect(s.fleets.find((f) => f.id === a.id)?.system).toBe(0);
    expect(a.retreatAt).toBeNull();
  });
  it("supports concurrent battles and deterministic third-party followups", () => {
    const { s } = battle();
    s.fleets.push(
      makeFleet(s, 2, 8, "Third", [4, 2, 1, 0]),
      makeFleet(s, 3, 9, "C", [3, 1, 0, 0]),
      makeFleet(s, 4, 9, "D", [3, 1, 0, 0]),
    );
    run(s, 3);
    expect(s.battles).toHaveLength(2);
    run(s, 150);
    expect(s.battles).toHaveLength(0);
    expect(s.completedBattles).toBeGreaterThanOrEqual(3);
  });
  it("keeps distant fleet composition hidden and scout estimates temporary", () => {
    const s = quiet();
    expect(visibleSystems(s, 0).has(4)).toBe(false);
    expect(strengthEstimate(s, 0, 4)).toBeNull();
    s.commanders[0].intel[4] = 90;
    expect(strengthEstimate(s, 0, 4)).not.toBeNull();
    run(s, 91);
    expect(strengthEstimate(s, 0, 4)).toBeNull();
  });
  it("pirates pay rewards only when defeated", () => {
    const s = quiet(),
      p = s.fleets.find((f) => f.neutral === "pirates")!;
    s.fleets.push(makeFleet(s, 0, p.system, "Raid", [0, 0, 4, 1]));
    run(s, 90);
    expect(s.commanders[0].stats.pirates).toBe(1);
    expect(s.commanders[0].score).toBeGreaterThanOrEqual(75);
    run(s, 10);
    expect(s.commanders[0].stats.pirates).toBe(1);
  });
  it("major objectives spawn once, move on lanes, grant kill buffs", () => {
    const s = quiet();
    expect(triggerObjective(s, "guardian")).toBeNull();
    expect(triggerObjective(s, "guardian")).not.toBeNull();
    const o = s.objectives.guardian;
    s.fleets.push(makeFleet(s, 0, o.system, "Heavy", [0, 0, 10, 5]));
    run(s, 90);
    expect(o.killer).toBe(0);
    expect(s.commanders[0].buffs.some((b) => b.kind === "guardian")).toBe(true);
    s.fleets = s.fleets.filter((f) => f.owner < 0);
    triggerObjective(s, "leviathan");
    run(s, 66);
    const l = s.fleets.find((f) => f.id === s.objectives.leviathan.fleet)!;
    expect(moving(l)).toBe(true);
    expect(
      s.lanes.some(
        (e) =>
          [e.a, e.b].includes(l.route[0]) && [e.a, e.b].includes(l.route[1]),
      ),
    ).toBe(true);
  });
});
describe("score and match lifecycle", () => {
  it("Leviathan defeat pays once and its temporary buff expires", () => {
    const s = quiet("leviathan-reward");
    triggerObjective(s, "leviathan");
    const objective = s.objectives.leviathan;
    s.fleets.push(
      makeFleet(s, 0, objective.system, "Objective assault", [0, 0, 12, 8]),
    );
    run(s, 50);
    expect(objective.active).toBe(false);
    expect(objective.killer).toBe(0);
    expect(s.commanders[0].stats.leviathan).toBe(1);
    expect(s.commanders[0].score).toBeGreaterThanOrEqual(
      BALANCE.leviathan.score,
    );
    expect(s.commanders[0].buffs.some((b) => b.kind === "leviathan")).toBe(
      true,
    );
    run(s, 200);
    expect(s.commanders[0].buffs).toHaveLength(0);
    expect(s.commanders[0].stats.leviathan).toBe(1);
  });
  it("neutral destruction closes an objective without awarding a commander", () => {
    const s = quiet("neutral-objectives");
    triggerObjective(s, "guardian");
    s.fleets.push(
      makeFleet(
        s,
        -3,
        s.objectives.guardian.system,
        "Neutral threat",
        [0, 0, 12, 8],
      ),
    );
    run(s, 80);
    expect(s.objectives.guardian.active).toBe(false);
    expect(s.objectives.guardian.killer).toBeNull();
    expect(s.commanders.every((c) => c.buffs.length === 0)).toBe(true);
  });
  it("bots cannot grant themselves resources or skip the build queue", () => {
    const s = generateGalaxy("empty", 2400, true);
    s.time = 30;
    for (const c of s.commanders)
      c.resources = { credits: 0, alloy: 0, fuel: 0 };
    botTick(s);
    for (const c of s.commanders) {
      expect(c.resources).toEqual({ credits: 0, alloy: 0, fuel: 0 });
      expect(c.queue).toHaveLength(0);
      expect(c.reserve).toEqual([0, 0, 0, 0]);
    }
  });
  it("scores territory only, applies strategic and endgame rates", () => {
    const s = quiet();
    s.fleets = s.fleets.filter((f) => f.owner >= 0);
    s.systems[8].owner = 0;
    s.systems[16].owner = 0;
    s.systems[24].owner = 0;
    run(s, 60);
    expect(s.commanders[0].score).toBeCloseTo(12 + 20 + 32);
    s.time = 2100;
    s.commanders[0].score = 0;
    run(s, 60);
    expect(s.commanders[0].score).toBeCloseTo(12 + 20 + 64);
  });
  it("breaks domination when control falls below twelve, and wins after a full hold", () => {
    const s = quiet();
    s.fleets = [];
    for (let i = 8; i < 20; i++) s.systems[i].owner = 0;
    run(s, 30);
    expect(s.domination?.elapsed).toBe(30);
    s.systems[8].owner = null;
    run(s, 1);
    expect(s.domination).toBeNull();
    s.systems[8].owner = 0;
    run(s, 75);
    expect(s.winner).toBe(0);
    expect(s.endReason).toBe("domination");
  });
  it("recovery requires lost territory and expires on recapture", () => {
    const s = quiet();
    run(s, 1);
    expect(s.commanders[0].recoveryUntil).toBe(0);
    s.systems[8].owner = 0;
    run(s, 1);
    s.systems[8].owner = null;
    run(s, 1);
    expect(s.commanders[0].stats.recoveries).toBe(1);
    s.systems[8].owner = 0;
    run(s, 1);
    expect(s.commanders[0].recoveryUntil).toBe(0);
  });
  it("finishes an untouched normal human match and freezes further commands", () => {
    const s = quiet();
    run(s, 2400);
    expect(s.status).toBe("finished");
    expect(s.winner).not.toBeNull();
    expect(standings(s)).toHaveLength(8);
    expect(buildShip(s, "Frigate")).not.toBeNull();
    expect(advanceDemo(s, 20)).toBe(s);
  });
  it("bots build, expand, mine, fight and complete an accelerated full match with valid resources", () => {
    const s = generateGalaxy("AI-acceptance", 2400, true);
    run(s, 2400);
    expect(s.status).toBe("finished");
    expect(s.completedBattles).toBeGreaterThan(10);
    for (const c of s.commanders) {
      expect(c.stats.orders).toBeGreaterThan(0);
      expect(c.stats.built).toBeGreaterThan(0);
      expect(c.stats.captures).toBeGreaterThan(0);
      for (const v of Object.values(c.resources))
        expect(Number.isFinite(v) && v >= 0).toBe(true);
    }
    for (const f of s.fleets) {
      expect(f.ships.reduce((a, b) => a + b, 0)).toBe(f.units.length);
      expect(f.units.every((u) => u.hp > 0)).toBe(true);
    }
    expect(external(s, s.winner!).length).toBeGreaterThan(0);
  }, 30000);
});
