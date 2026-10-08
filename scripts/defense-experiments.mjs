import { createServer } from "vite";
import fs from "node:fs";
const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
});
try {
  const { generateGalaxy } = await server.ssrLoadModule("/src/demo/galaxy.ts");
  const { stepMatch } = await server.ssrLoadModule("/src/demo/simulation.ts");
  const { makeFleet } = await server.ssrLoadModule("/src/demo/model.ts");
  const { defenseSpec } = await server.ssrLoadModule("/src/demo/defenses.ts");
  const { BALANCE } = await server.ssrLoadModule("/src/demo/balance.ts");
  const fleets = {
    frigates: [20, 0, 0, 0],
    destroyers: [0, 10, 0, 0],
    cruisers: [0, 0, 5, 0],
    dreadnoughts: [0, 0, 0, 2],
    mixed: [4, 2, 1, 1],
    siege: [6, 6, 10, 10],
    light: [5, 2, 0, 0],
  };
  const results = [];
  for (const [name, counts] of Object.entries(fleets))
    for (const defense of [
      "none",
      "station",
      "railgun",
      "combined",
      "maximum",
    ]) {
      let captures = 0,
        losses = 0,
        seconds = 0;
      for (let seed = 0; seed < 20; seed++) {
        const s = generateGalaxy("SIEGE-" + seed);
        s.commanders.forEach((c) => (c.bot = false));
        s.systems[8].owner = 1;
        s.fleets = [];
        if (defense === "none" || defense === "combined")
          s.fleets.push(makeFleet(s, 1, 8, "Garrison", [4, 2, 0, 0]));
        for (const kind of ["station", "railgun"])
          if (
            defense === kind ||
            defense === "combined" ||
            defense === "maximum"
          ) {
            const level = defense === "maximum" ? 3 : 2;
            for (
              let planet = 0;
              planet <
              (defense === "maximum" ? s.systems[8].planets.length : 1);
              planet++
            )
              s.systems[8].installations.push({
                planet,
                kind,
                level,
                hp: defenseSpec(kind, level).hull,
                job: null,
              });
          }
        const f = makeFleet(s, 0, 8, "Assault", counts);
        s.fleets.push(f);
        while (
          s.time < 180 &&
          s.systems[8].owner !== 0 &&
          s.fleets.some((f) => f.owner === 0)
        )
          stepMatch(s);
        if (s.systems[8].owner === 0) captures++;
        losses += counts.reduce((a, b) => a + b, 0) - f.units.length;
        seconds += s.time;
      }
      results.push({
        fleet: name,
        counts,
        alloy: counts.reduce(
          (n, count, i) => n + count * BALANCE.ships[i].alloy,
          0,
        ),
        defense,
        matches: 20,
        captures,
        meanLosses: losses / 20,
        meanSeconds: seconds / 20,
      });
    }
  fs.writeFileSync(
    "docs/DEFENSE_COMBAT_EXPERIMENTS.json",
    JSON.stringify(results, null, 2) + "\n",
  );
  console.log("700 controlled siege trials complete");
} finally {
  await server.close();
}
