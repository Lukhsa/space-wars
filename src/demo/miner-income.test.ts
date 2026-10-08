import { describe, expect, it } from "vitest";
import { generateGalaxy } from "./galaxy";
import {
  commissionMiner,
  orderMiner,
  recallMiner,
  minerPosition,
} from "./mining";
import { incomePerMinute } from "./model";
import { stepMatch } from "./simulation";
import { updateControl } from "./planets";
import type { DemoState } from "./types";
const quiet = () => {
  const s = generateGalaxy("miner-income");
  s.commanders.forEach((c) => (c.bot = false));
  return s;
};
const run = (s: DemoState, n: number) => {
  for (let i = 0; i < n; i++) stepMatch(s);
};
describe("civilian mining and planet income", () => {
  it("commissions three independent miners, charges only successful builds and rejects a fourth", () => {
    const s = quiet(),
      before = { ...s.resources };
    expect(commissionMiner(s, 0, 0)).toBeNull();
    expect(commissionMiner(s, 0, 0)).toBeNull();
    expect(commissionMiner(s, 0, 0)).toMatch(/all 3/);
    expect(s.resources.credits).toBe(before.credits - 500);
    expect(s.resources.alloy).toBe(before.alloy - 200);
    const miners = s.miners.filter((m) => m.owner === 0),
      x = s.systems[0];
    expect(new Set(miners.map((m) => m.berth)).size).toBe(3);
    for (const [i, m] of miners.entries())
      expect(orderMiner(s, 0, 0, x.deposits[i].id, false, m.id)).toBeNull();
    run(s, 40);
    expect(s.commanders[0].telemetry.minedAlloy).toBe(
      x.deposits.slice(0, 3).reduce((n, d) => n + d.richness, 0),
    );
    expect(miners.every((m) => m.status === "Idle" && m.cargo === 0)).toBe(
      true,
    );
    expect(commissionMiner(s, 0, 8)).toMatch(/majority/);
  });
  it("recalls only the selected craft and moves continuously between ticks", () => {
    const s = quiet();
    commissionMiner(s, 0, 0);
    const [a, b] = s.miners.filter((m) => m.owner === 0),
      d = s.systems[0].deposits[0];
    orderMiner(s, 0, 0, d.id, true, a.id);
    orderMiner(s, 0, 0, d.id, true, b.id);
    run(s, 4);
    const start = minerPosition(s, a);
    s.accumulator = 0.5;
    const between = minerPosition(s, a);
    expect(between).not.toEqual(start);
    s.accumulator = 0;
    recallMiner(s, 0, 0, a.id);
    expect(minerPosition(s, a)).toEqual(start);
    expect(a.status).toBe("Returning");
    expect(b.status).toBe("Outbound");
    run(s, 4);
    expect(a.status).toBe("Idle");
    expect(b.status).toBe("Extracting");
  });
  it("shares finite reserves safely and retains the return location after depletion", () => {
    const s = quiet();
    commissionMiner(s, 0, 0);
    commissionMiner(s, 0, 0);
    const x = s.systems[0],
      d = x.deposits[0],
      miners = s.miners.filter((m) => m.owner === 0);
    d.reserves = d.richness + 10;
    for (const m of miners) orderMiner(s, 0, 0, d.id, false, m.id);
    run(s, 31);
    const atSite = miners.map((m) => minerPosition(s, m));
    run(s, 1);
    expect(x.deposits.some((v) => v.id === d.id)).toBe(false);
    expect(miners.map((m) => minerPosition(s, m))).toEqual(atSite);
    run(s, 8);
    expect(s.commanders[0].telemetry.minedAlloy).toBe(d.richness + 10);
    expect(miners.every((m) => m.status === "Idle")).toBe(true);
  });
  it("assigns different planet yields without changing regional income budgets", () => {
    const s = quiet();
    for (const x of s.systems)
      for (const k of [0, 1, 2] as const)
        expect(x.planets.reduce((n, p) => n + p.output[k], 0)).toBe(
          x.output[k],
        );
    expect(
      new Set(s.systems[0].planets.map((p) => p.output.join(","))).size,
    ).toBe(3);
    expect(incomePerMinute(s, 0)).toEqual({
      credits: 360,
      alloy: 90,
      fuel: 30,
    });
  });
  it("pays each captured planet immediately without majority and stops paying its previous owner", () => {
    const s = quiet(),
      x = s.systems[8],
      p = x.planets[0];
    p.owner = 0;
    updateControl(x);
    expect(x.owner).toBeNull();
    const income = incomePerMinute(s, 0),
      before = { ...s.resources };
    expect(income).toEqual({
      credits: 360 + p.output[0],
      alloy: 90 + p.output[1],
      fuel: 30 + p.output[2],
    });
    run(s, 1);
    for (const k of ["credits", "alloy", "fuel"] as const)
      expect(s.resources[k] - before[k]).toBeCloseTo(income[k] / 60, 8);
    p.owner = 1;
    const lost = incomePerMinute(s, 0);
    expect(lost).toEqual({ credits: 360, alloy: 90, fuel: 30 });
    const rival = incomePerMinute(s, 1),
      previous = { ...s.commanders[1].resources };
    run(s, 1);
    for (const k of ["credits", "alloy", "fuel"] as const)
      expect(s.commanders[1].resources[k] - previous[k]).toBeCloseTo(
        rival[k] / 60,
        8,
      );
  });
});
