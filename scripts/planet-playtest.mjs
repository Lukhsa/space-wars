import { createServer } from "vite";
import fs from "node:fs";
const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const { generateGalaxy } = await server.ssrLoadModule("/src/demo/galaxy.ts");
  const { stepMatch } = await server.ssrLoadModule("/src/demo/simulation.ts");
  const results = [];
  for (const duration of [600, 2400])
    for (const seed of ["ORION-7742", "HELIOS-2026", "VEGA-28"]) {
      const s = generateGalaxy(seed, duration, true),
        firstContact = {};
      let maxBattles = 0,
        firstCapture = null,
        firstMajority = null;
      const started = performance.now();
      while (s.status === "playing") {
        stepMatch(s);
        maxBattles = Math.max(maxBattles, s.battles.length);
        if (firstCapture === null && s.commanders.some((c) => c.stats.captures))
          firstCapture = s.time;
        if (
          firstMajority === null &&
          s.systems.some((x) => !x.capital && x.owner !== null)
        )
          firstMajority = s.time;
        for (const b of s.battles)
          if (b.owners.every((o) => o >= 0))
            for (const owner of b.owners) firstContact[owner] ??= s.time;
        for (const c of s.commanders)
          for (const v of Object.values(c.resources))
            if (!Number.isFinite(v) || v < 0) throw Error("Invalid resources");
      }
      const report = {
        seed,
        duration,
        ended: s.time,
        winner: s.winner,
        reason: s.endReason,
        wallMs: Math.round(performance.now() - started),
        firstCapture,
        firstMajority,
        firstPlayerBattles: firstContact,
        battles: s.completedBattles,
        maxBattles,
        commanders: s.commanders.map((c) => ({
          id: c.id,
          score: Math.floor(c.score),
          systems: s.systems.filter((x) => x.owner === c.id).length,
          planets: s.systems
            .flatMap((x) => x.planets)
            .filter((p) => p.owner === c.id).length,
          yards: s.systems
            .flatMap((x) => x.planets)
            .filter((p) => p.owner === c.id && p.shipyard).length,
          mined: c.telemetry.minedAlloy,
          defenses: c.telemetry.defensesBuilt,
          ...c.stats,
        })),
      };
      results.push(report);
      console.log(
        JSON.stringify({
          seed,
          duration,
          battles: report.battles,
          firstCapture,
          firstMajority,
          wallMs: report.wallMs,
        }),
      );
    }
  fs.writeFileSync(
    "docs/PLANET_PLAYTEST_SIMULATIONS.json",
    JSON.stringify(results, null, 2) + "\n",
  );
} finally {
  await server.close();
}
