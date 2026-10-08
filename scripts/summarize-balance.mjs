import fs from "node:fs";
const sum = (a) => a.reduce((n, x) => n + x, 0);
const mean = (a) => sum(a) / a.length;
const tally = (a) => a.reduce((r, k) => ((r[k] = (r[k] ?? 0) + 1), r), {});
const result = {};
for (const [label, file] of [
  ["baseline", "ECONOMY_DEFENSE_BASELINE"],
  ["revised", "ECONOMY_DEFENSE_SIMULATIONS"],
]) {
  const matches = JSON.parse(fs.readFileSync("docs/" + file + ".json", "utf8")),
    cs = matches.flatMap((m) => m.commanders);
  const mined = (c) => c.telemetry?.minedAlloy ?? c.minedAlloy;
  const passive = (c) => c.telemetry?.passive.alloy ?? c.passive.alloy;
  const salvage = (c) => c.telemetry?.salvageAlloy ?? c.pirates * 240;
  result[label] = {
    matches: matches.length,
    commanders: cs.length,
    seeds: matches.map((m) => m.seed),
    victories: tally(matches.map((m) => m.reason)),
    winnerSeats: tally(matches.map((m) => m.winner)),
    personalities: Object.fromEntries(
      Object.entries(tally(cs.map((c) => c.personality))).map(([p, starts]) => [
        p,
        {
          starts,
          wins: matches.filter((m) => m.winnerPersonality === p).length,
        },
      ]),
    ),
    meanScore: mean(cs.map((c) => c.score)),
    meanShipsBuilt: mean(cs.map((c) => c.built)),
    builtClasses: [0, 1, 2, 3].map((i) =>
      sum(cs.map((c) => c.builtClasses?.[i] ?? 0)),
    ),
    meanShipsLost: mean(cs.map((c) => 9 + c.built - sum(c.shipsRemaining))),
    meanCaptures: mean(cs.map((c) => c.captures)),
    meanPassiveAlloy: mean(cs.map(passive)),
    meanMinedAlloy: mean(cs.map(mined)),
    extractionShare:
      sum(cs.map(mined)) /
      sum(cs.map((c) => passive(c) + mined(c) + salvage(c))),
    meanMiningFleetUtilization: mean(
      cs.map(
        (c) =>
          (c.telemetry?.miningSeconds ?? c.miningSeconds) / c.fleetSeconds || 0,
      ),
    ),
    meanResourcesRemaining: Object.fromEntries(
      ["credits", "alloy", "fuel"].map((k) => [
        k,
        mean(cs.map((c) => c.resources[k])),
      ]),
    ),
    meanSpent: Object.fromEntries(
      ["credits", "alloy", "fuel"].map((k) => [
        k,
        label === "revised" ? mean(cs.map((c) => c.telemetry.spent[k])) : null,
      ]),
    ),
    minFuel: Math.min(...cs.map((c) => c.minimumFuel ?? c.resources.fuel)),
    defenseTotals: Object.fromEntries(
      [
        "defensesBuilt",
        "defensesUpgraded",
        "defensesDestroyed",
        "defenseBattles",
        "defenseWins",
        "repairs",
        "repairAlloy",
        "ownershipFlips",
      ].map((k) => [k, sum(cs.map((c) => c.telemetry?.[k] ?? 0))]),
    ),
    guardianKills: matches.filter((m) => m.guardian !== null).length,
    leviathanKills: matches.filter((m) => m.leviathan !== null).length,
    comebackCount: cs.filter((c) => c.comeback).length,
    longestBattleSeconds: Math.max(...matches.map((m) => m.maxBattleSeconds)),
    meanFirstDreadnoughtSeconds: mean(
      cs.filter((c) => c.firstBuilt?.[3] !== null).map((c) => c.firstBuilt[3]),
    ),
    commandersBuildingDreadnoughts: cs.filter((c) => c.firstBuilt?.[3] !== null)
      .length,
  };
}
fs.writeFileSync(
  "docs/ECONOMY_DEFENSE_SUMMARY.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(JSON.stringify(result, null, 2));
