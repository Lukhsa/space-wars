import { BALANCE } from "./balance";
import { launchFleet, postChat } from "./commands";
import { log, makeFleet, moving, ownerName, standings } from "./model";
import { randomFrom } from "./random";
import type { DemoState } from "./types";

export function triggerObjective(
  s: DemoState,
  kind: "guardian" | "leviathan",
): string | null {
  const o = s.objectives[kind];
  if (o.spawned || s.status !== "playing")
    return "Objective already appeared or match ended.";
  const f = makeFleet(
    s,
    kind === "guardian" ? -2 : -3,
    o.system,
    kind === "guardian" ? "Ancient Guardian" : "Void Leviathan",
    [...BALANCE[kind].fleet],
  );
  f.neutral = kind;
  f.status = "Defending";
  s.fleets.push(f);
  o.spawned = true;
  o.active = true;
  o.fleet = f.id;
  o.nextMove = s.time + BALANCE.leviathan.moveInterval;
  log(
    s,
    "world",
    kind === "guardian"
      ? "Ancient Signal — Guardian awakens"
      : "Cosmic Disturbance — Leviathan appears",
    `${f.name} detected at ${s.systems[o.system].name}. A major Dominion reward awaits.`,
    o.system,
    true,
    true,
  );
  return null;
}
export function objectiveTick(s: DemoState) {
  const fraction = s.time / s.duration;
  if (fraction >= BALANCE.surge.fraction && !s.globalEvents.includes("surge")) {
    s.globalEvents.push("surge");
    s.surgeUntil = s.time + BALANCE.surge.duration;
    log(
      s,
      "world",
      "Alloy Surge",
      `Asteroid extraction +40% for ${BALANCE.surge.duration}s.`,
      16,
      true,
      true,
    );
  }
  if (fraction >= BALANCE.guardianFraction && !s.objectives.guardian.spawned)
    triggerObjective(s, "guardian");
  if (fraction >= BALANCE.leviathanFraction && !s.objectives.leviathan.spawned)
    triggerObjective(s, "leviathan");
  if (
    fraction >= BALANCE.coreWarningFraction &&
    !s.globalEvents.includes("core-warning")
  ) {
    s.globalEvents.push("core-warning");
    log(
      s,
      "world",
      "Core Ascendancy approaching",
      "Core systems will generate double Dominion during Endgame.",
      24,
      true,
      true,
    );
  }
  if (fraction >= BALANCE.phases[4] && !s.globalEvents.includes("core")) {
    s.globalEvents.push("core");
    log(
      s,
      "world",
      "Core Ascendancy active",
      "All four Core systems now generate double Dominion.",
      24,
      true,
      true,
    );
  }
  const o = s.objectives.leviathan,
    f = s.fleets.find((f) => f.id === o.fleet);
  if (o.active && f) {
    o.system = f.system;
    if (s.time >= o.nextMove && !moving(f) && f.status !== "Battle") {
      const options = s.lanes
        .filter((l) => l.a === f.system || l.b === f.system)
        .map((l) => (l.a === f.system ? l.b : l.a))
        .filter((id) => !s.systems[id].capital);
      const r = randomFrom(`${s.seed}:leviathan:${s.time}`),
        target = options[Math.floor(r() * options.length)];
      if (target !== undefined) {
        launchFleet(s, f.id, target, "move");
        log(
          s,
          "world",
          "Leviathan is moving",
          `Void wake approaching ${s.systems[target].name}.`,
          target,
          true,
          true,
        );
      }
      o.nextMove = s.time + BALANCE.leviathan.moveInterval;
    }
  }
  if (s.time >= s.nextRaid) {
    s.nextRaid += BALANCE.pirates.raidInterval;
    const raiders = s.fleets.filter(
      (f) => f.neutral === "pirates" && !moving(f) && f.status !== "Battle",
    );
    const random = randomFrom(`${s.seed}:raid:${s.time}`),
      raider = raiders[Math.floor(random() * raiders.length)];
    if (raider) {
      const target = s.lanes
        .filter((l) => l.a === raider.system || l.b === raider.system)
        .map((l) => s.systems[l.a === raider.system ? l.b : l.a])
        .find((x) => !x.capital && x.owner !== null);
      if (target) launchFleet(s, raider.id, target.id, "attack");
    }
  }
  if (s.time >= s.nextChat) {
    const random = randomFrom(`${s.seed}:chat:${s.time}`),
      bots = s.commanders.filter((c) => c.bot),
      c = bots[Math.floor(random() * bots.length)];
    if (c) {
      const target = s.systems[c.target ?? c.id].name;
      const message = o.active
        ? `Void wake near ${s.systems[o.system].name}. Watch your approach.`
        : s.battles.length
          ? `${ownerName(s, standings(s)[0].id)} is ahead. The Core is still contested.`
          : c.personality === "Aggressor"
            ? `Stay out of ${target}.`
            : `Setting a course for ${target}. Every system counts.`;
      postChat(s, c.id, message);
    }
    s.nextChat = s.time + 65 + Math.floor(random() * 65);
  }
}
