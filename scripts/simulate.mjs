import { createServer } from "vite";
import fs from "node:fs";
const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const { generateGalaxy } = await server.ssrLoadModule("/src/demo/galaxy.ts");
  const { stepMatch } = await server.ssrLoadModule("/src/demo/simulation.ts");
  const { standings, external } =
    await server.ssrLoadModule("/src/demo/model.ts");
  const args = process.argv.slice(2),
    seeds = args.filter((x) => !x.startsWith("--"));
  const duration = Number(
    args.find((x) => x.startsWith("--duration="))?.split("=")[1] ?? 2400,
  );
  const results = [];
  for (const seed of seeds.length
    ? seeds
    : ["ORION-7742", "HELIOS-2026", "VEGA-28"]) {
    const s = generateGalaxy(seed, duration, true),
      start = performance.now();
    let activeBattleSeconds = 0,
      maxBattles = 0;
    while (s.status === "playing") {
      stepMatch(s);
      if (s.battles.length) activeBattleSeconds++;
      maxBattles = Math.max(maxBattles, s.battles.length);
    }
    const report = {
      seed,
      duration: s.time,
      reason: s.endReason,
      winner: s.commanders[s.winner].name,
      wallMs: Math.round(performance.now() - start),
      battles: s.completedBattles,
      activeBattleSeconds,
      maxSimultaneousBattles: maxBattles,
      guardianKiller:
        s.objectives.guardian.killer === null
          ? null
          : s.commanders[s.objectives.guardian.killer].name,
      leviathanKiller:
        s.objectives.leviathan.killer === null
          ? null
          : s.commanders[s.objectives.leviathan.killer].name,
      leaderboard: standings(s).map((c, i) => ({
        rank: i + 1,
        name: c.name,
        personality: c.personality,
        score: Math.floor(c.score),
        systems: external(s, c.id).length + 1,
        ...c.stats,
        resources: Object.fromEntries(
          Object.entries(c.resources).map(([k, v]) => [k, Math.floor(v)]),
        ),
        bonuses: s.systems
          .filter((x) => x.owner === c.id && x.strategic)
          .map((x) => x.strategic),
      })),
    };
    results.push(report);
    console.log(JSON.stringify(report, null, 2));
  }
  if (args.includes("--save"))
    fs.writeFileSync(
      "docs/BOT_SIMULATION_RESULTS.json",
      JSON.stringify(results, null, 2) + "\n",
    );
} finally {
  await server.close();
}
