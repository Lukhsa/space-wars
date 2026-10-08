import { createServer } from "vite";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
const baseline = process.argv.includes("--baseline");
const prefix = baseline ? "/.tools/balance-baseline" : "";
if (baseline) {
  const files = execFileSync(
    "git",
    ["ls-tree", "-r", "--name-only", "a31e203", "src/demo"],
    { encoding: "utf8" },
  )
    .trim()
    .split(/\r?\n/)
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
  for (const file of files) {
    const destination = path.join(".tools/balance-baseline", file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(
      destination,
      execFileSync("git", ["show", `a31e203:${file}`]),
    );
  }
}
const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
});
try {
  const { generateGalaxy } = await server.ssrLoadModule(
    prefix + "/src/demo/galaxy.ts",
  );
  const { stepMatch } = await server.ssrLoadModule(
    prefix + "/src/demo/simulation.ts",
  );
  const { incomePerMinute } = await server.ssrLoadModule(
    prefix + "/src/demo/model.ts",
  );
  const { BALANCE } = await server.ssrLoadModule(
    prefix + "/src/demo/balance.ts",
  );
  const { shipClasses } = await server.ssrLoadModule(
    prefix + "/src/demo/catalog.ts",
  );
  const results = [];
  for (let seed = 0; seed < 30; seed++) {
    const s = generateGalaxy(`BALANCE-${seed}`, 2400, true);
    const passive = s.commanders.map(() => ({ credits: 0, alloy: 0, fuel: 0 }));
    const fleetSeconds = s.commanders.map(() => 0);
    const firstBuilt = s.commanders.map(() => [null, null, null, null]);
    const builtClasses = s.commanders.map(() => [0, 0, 0, 0]);
    const minedAlloy = s.commanders.map(() => 0);
    const miningSeconds = s.commanders.map(() => 0);
    const minimumFuel = s.commanders.map((c) => c.resources.fuel);
    let maxBattleSeconds = 0;
    while (s.status === "playing") {
      for (const c of s.commanders) {
        const income = incomePerMinute(s, c.id);
        for (const k of Object.keys(income)) passive[c.id][k] += income[k] / 60;
        miningSeconds[c.id] += s.fleets.filter(
          (f) =>
            f.owner === c.id &&
            f.status === "Mining" &&
            s.systems[f.system].owner === c.id,
        ).length;
      }
      stepMatch(s);
      for (const event of s.events.filter(
        (e) => e.time === s.time && e.title === "Mining complete",
      )) {
        const owner = s.systems[event.system].owner;
        if (owner !== null)
          minedAlloy[owner] += Number(
            event.detail.match(/\+(\d+) Alloy/)?.[1] ?? 0,
          );
      }
      for (const event of s.events.filter(
        (e) => e.time === s.time && e.title === "Ship construction complete",
      )) {
        const kind = shipClasses.findIndex((kind) =>
          event.detail.startsWith(kind),
        );
        if (kind >= 0) {
          builtClasses[event.system][kind]++;
          if (firstBuilt[event.system][kind] === null)
            firstBuilt[event.system][kind] = s.time;
        }
      }
      for (const c of s.commanders) {
        fleetSeconds[c.id] += s.fleets.filter((f) => f.owner === c.id).length;
        minimumFuel[c.id] = Math.min(minimumFuel[c.id], c.resources.fuel);
      }
      for (const b of s.battles)
        maxBattleSeconds = Math.max(maxBattleSeconds, s.time - b.start);
      if (
        s.commanders.some((c) =>
          Object.values(c.resources).some(
            (n) => !Number.isFinite(n) || n < -1e-6,
          ),
        )
      )
        throw Error(`Invalid resources ${s.seed}:${s.time}`);
      if (s.time > 2400) throw Error("Stalled match");
    }
    for (const c of s.commanders)
      if (c.telemetry) {
        const earned = {
          credits: c.stats.pirates * BALANCE.pirates.credits,
          alloy: c.telemetry.minedAlloy + c.telemetry.salvageAlloy,
          fuel: c.stats.pirates * BALANCE.pirates.fuel,
        };
        for (const k of ["credits", "alloy", "fuel"]) {
          const expected =
            BALANCE.startingResources[k] +
            c.telemetry.passive[k] +
            earned[k] -
            c.telemetry.spent[k];
          if (Math.abs(expected - c.resources[k]) > 0.001)
            throw Error(
              "Resource conservation failed: " + s.seed + ":" + c.id + ":" + k,
            );
        }
        for (const x of s.systems) {
          const slots = x.installations.map((d) => d.planet + ":" + d.kind);
          if (
            new Set(slots).size !== slots.length ||
            x.installations.some((d) => d.level > 3)
          )
            throw Error("Invalid defense slots");
        }
      }
    results.push({
      seed: s.seed,
      duration: s.time,
      reason: s.endReason,
      winner: s.winner,
      winnerPersonality: s.commanders[s.winner].personality,
      battles: s.completedBattles,
      maxBattleSeconds,
      guardian: s.objectives.guardian.killer,
      leviathan: s.objectives.leviathan.killer,
      commanders: s.commanders.map((c) => ({
        id: c.id,
        personality: c.personality,
        score: c.score,
        ...c.stats,
        passive: passive[c.id],
        resources: c.resources,
        telemetry: c.telemetry,
        fleetSeconds: fleetSeconds[c.id],
        minimumFuel: minimumFuel[c.id],
        firstBuilt: firstBuilt[c.id],
        builtClasses: builtClasses[c.id],
        minedAlloy: minedAlloy[c.id],
        miningSeconds: miningSeconds[c.id],
        shipsRemaining: s.fleets
          .filter((f) => f.owner === c.id)
          .reduce((a, f) => a.map((n, i) => n + f.ships[i]), [...c.reserve]),
        comeback:
          s.history.some((h) => h.time >= 600 && h.territory[c.id] === 0) &&
          s.history.at(-1).territory[c.id] > 0,
      })),
    });
  }
  const output =
    process.argv.slice(2).find((x) => !x.startsWith("--")) ??
    (baseline
      ? "docs/ECONOMY_DEFENSE_BASELINE.json"
      : "docs/ECONOMY_DEFENSE_SIMULATIONS.json");
  fs.writeFileSync(output, JSON.stringify(results, null, 2) + "\n");
  console.log(`${results.length} complete matches saved to ${output}`);
} finally {
  await server.close();
}
