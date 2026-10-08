// Browser and headless simulator share this fixed one-second local rules engine.
import { BALANCE } from "./balance";
import { activeDefenses, defensePower, defenseTick } from "./defenses";
import { botTick } from "./ai";
import { combatTick } from "./combat";
import { routeFor, travelTime } from "./commands";
import {
  external,
  hasBonus,
  log,
  moving,
  refreshFleet,
  standings,
  syncPlayer,
} from "./model";
import { ownedPlanets, ownedYards, updateControl, planetName } from "./planets";
import { miningTick } from "./mining";
import { objectiveTick } from "./objectives";
import { shipClasses } from "./catalog";
import type { DemoState, Fleet } from "./types";
export {
  buildShip,
  createFleet,
  fleetPosition,
  launchFleet,
  reinforceFleet,
  travelTime,
  retreatFleet,
  setStance,
} from "./commands";
export { moving } from "./model";
export const MINING_SECONDS = BALANCE.miningSeconds;

function movementTick(s: DemoState, f: Fleet) {
  if (f.retreatAt !== null && s.time >= f.retreatAt) {
    f.route = routeFor(s, f, f.owner);
    f.retreatAt = null;
    f.retreatFuel = 0;
    f.elapsed = 0;
    f.mission = "move";
    f.status = "Moving";
    f.duration = travelTime(s, f.route.slice(0, 2), f);
    log(
      s,
      "fleet",
      "Fleet withdrawing",
      `${f.name} is returning to ${s.systems[f.owner].name}.`,
      f.system,
      f.owner === 0,
    );
  }
  if (!moving(f)) return;
  f.elapsed++;
  if (f.elapsed < f.duration) return;
  f.previous = f.system;
  f.system = f.route[1];
  f.route.shift();
  f.elapsed = 0;
  const x = s.systems[f.system];
  if (f.owner >= 0 && f.mission === "scout") {
    s.commanders[f.owner].intel[f.system] = s.time + BALANCE.scoutingSeconds;
    if (f.owner === 0) x.scouted = true;
  }
  f.planet = f.route.length > 1 ? -1 : f.targetPlanet;
  if (f.route.length > 1) {
    f.duration = travelTime(s, f.route.slice(0, 2), f);
    return;
  }
  f.route = [];
  f.status = x.planets[f.planet]?.owner === f.owner ? "Defending" : "Idle";
  log(
    s,
    f.mission === "scout" ? "scout" : "fleet",
    f.mission === "scout" ? "Reconnaissance complete" : "Fleet arrived",
    `${f.name} reached ${x.name}.`,
    x.id,
    f.owner === 0,
  );
}
function economyTick(s: DemoState) {
  for (const c of s.commanders) {
    const before = { ...c.resources };
    const owned = s.systems.filter((x) => x.owner === c.id),
      territory = external(s, c.id);
    c.stats.peak = Math.max(c.stats.peak, owned.length);
    if (territory.length) {
      c.hadExternal = true;
      c.recoveryUntil = 0;
    } else if (c.hadExternal && s.time >= c.recoveryCooldown) {
      c.hadExternal = false;
      c.recoveryUntil = s.time + BALANCE.recovery.duration;
      c.recoveryCooldown = s.time + BALANCE.recovery.cooldown;
      c.stats.recoveries++;
      log(
        s,
        "world",
        "Emergency Mobilization",
        `${c.name}: modest home income and light construction boost for 120s.`,
        c.id,
        c.id === 0,
        c.id === 0,
      );
    }
    const recovering = c.recoveryUntil > s.time;
    for (const { system: x } of ownedPlanets(s, c.id)) {
      const multiplier =
        x.capital && recovering ? 1 + BALANCE.recovery.income : 1;
      c.resources.credits +=
        (x.output[0] / x.planets.length / 60) *
        multiplier *
        (hasBonus(s, c.id, "trade") ? 1 + BALANCE.buffs.trade : 1);
      c.resources.alloy +=
        (x.output[1] / x.planets.length / 60) *
        multiplier *
        (hasBonus(s, c.id, "titanium") ? 1 + BALANCE.buffs.titanium : 1);
      c.resources.fuel += (x.output[2] / x.planets.length / 60) * multiplier;
      if (!x.capital) {
        const rate =
          x.region === "Core"
            ? BALANCE.score.core
            : x.strategic
              ? BALANCE.score.strategic
              : BALANCE.score.normal;
        c.score +=
          (rate / x.planets.length / 60) *
          (x.region === "Core" && s.time / s.duration >= BALANCE.phases[4]
            ? BALANCE.score.endgameMultiplier
            : 1);
      }
    }
    const forge = hasBonus(s, c.id, "forge") ? BALANCE.buffs.forge : 0;
    for (const key of ["credits", "alloy", "fuel"] as const)
      c.telemetry.passive[key] += c.resources[key] - before[key];
    for (const { system, planet } of ownedYards(s, c.id)) {
      if (
        s.fleets.some(
          (f) =>
            f.system === system.id &&
            f.planet === planet.id &&
            f.owner !== c.id &&
            !moving(f),
        )
      )
        continue;
      for (const job of planet.queue.slice(0, BALANCE.berths)) {
        job.elapsed +=
          1 +
          forge +
          (recovering && ["Frigate", "Destroyer"].includes(job.kind)
            ? BALANCE.recovery.build
            : 0);
        if (job.elapsed >= job.duration) {
          planet.reserve[shipClasses.indexOf(job.kind)]++;
          c.stats.built++;
          c.telemetry.builtClasses[shipClasses.indexOf(job.kind)]++;
          log(
            s,
            "build",
            "Ship construction complete",
            `${job.kind} ready at ${planetName(system, planet.id)}.`,
            c.id,
            c.id === 0,
          );
        }
      }
      planet.queue = planet.queue.filter((j) => j.elapsed < j.duration);
    }
    c.buffs = c.buffs.filter((b) => b.until > s.time);
  }
}
function territoryTick(s: DemoState) {
  for (const x of s.systems) {
    x.defense = s.fleets
      .filter((f) => f.system === x.id && f.owner !== 0 && !moving(f))
      .reduce((n, f) => n + f.power, defensePower(x));
    x.scouted =
      x.planets.some((p) => p.owner === 0) ||
      (s.commanders[0].intel[x.id] ?? 0) > s.time;
    for (const p of x.planets) {
      const present = s.fleets.filter(
        (f) => f.system === x.id && f.planet === p.id && !moving(f),
      );
      const owners = [...new Set(present.map((f) => f.owner))],
        owner = owners[0];
      if (
        x.capital ||
        owners.length !== 1 ||
        owner === undefined ||
        owner < 0 ||
        p.owner === owner ||
        activeDefenses(x, p.id).length ||
        present.every((f) => f.mission === "scout" || f.retreatAt !== null)
      ) {
        p.capture = null;
        continue;
      }
      if (p.capture?.owner !== owner) p.capture = { owner, elapsed: 0 };
      p.capture.elapsed++;
      for (const f of present) if (f.retreatAt === null) f.status = "Capturing";
      if (p.capture.elapsed >= BALANCE.captureSeconds) {
        const old = p.owner;
        x.installations = x.installations.filter((d) => d.planet !== p.id);
        p.owner = owner;
        p.capture = null;
        p.capturedAt = s.time;
        p.queue = [];
        p.reserve = [0, 0, 0, 0];
        if (old !== null) s.commanders[owner].telemetry.ownershipFlips++;
        s.commanders[owner].stats.captures++;
        for (const f of present)
          if (f.retreatAt === null) f.status = "Defending";
        log(
          s,
          "world",
          "Planet captured",
          s.commanders[owner].name +
            " controls " +
            planetName(x, p.id) +
            (p.shipyard ? " and its shipyard." : "."),
          x.id,
          owner === 0 || old === 0,
          old === 0,
        );
      }
    }
    const old = x.owner;
    updateControl(x);
    if (old !== x.owner) {
      x.capturedAt = s.time;
      log(
        s,
        "world",
        "System control changed",
        x.name +
          " strict majority: " +
          (x.owner === null ? "contested" : s.commanders[x.owner].name),
        x.id,
        old === 0 || x.owner === 0,
      );
    }
    x.capture = x.planets.find((p) => p.capture)?.capture ?? null;
  }
}
function activityTick(s: DemoState) {
  for (const f of s.fleets) {
    if (
      f.owner < 0 ||
      moving(f) ||
      f.status === "Battle" ||
      f.retreatAt !== null
    )
      continue;
    const p = s.systems[f.system].planets[f.planet];
    if (p?.shipyard && p.owner === f.owner) {
      for (const u of f.units)
        u.hp = Math.min(
          BALANCE.ships[u.kind].hull,
          u.hp + BALANCE.ships[u.kind].hull * BALANCE.repairPerSecond,
        );
      refreshFleet(f);
    }
  }
}
function victoryTick(s: DemoState) {
  const capturable = s.systems.filter((x) => !x.capital).length;
  const contender = s.commanders.find(
    (c) =>
      external(s, c.id).length >=
      Math.ceil(capturable * BALANCE.domination.fraction),
  );
  if (contender) {
    if (s.domination?.owner !== contender.id) {
      s.domination = { owner: contender.id, elapsed: 0 };
      log(
        s,
        "world",
        "Domination countdown",
        `${contender.name} controls 60% of the frontier. Break control within 75 seconds.`,
        contender.target ?? contender.id,
        true,
        true,
      );
    }
    s.domination.elapsed++;
  } else if (s.domination) {
    s.domination = null;
    log(
      s,
      "world",
      "Domination interrupted",
      "The frontier remains contested.",
      24,
      true,
      true,
    );
  }
  if (s.domination && s.domination.elapsed >= BALANCE.domination.seconds) {
    s.winner = s.domination.owner;
    s.endReason = "domination";
  } else if (s.time >= s.duration) {
    s.winner = standings(s)[0].id;
    s.endReason = "timer";
  }
  if (s.winner !== null) {
    s.status = "finished";
    log(
      s,
      "world",
      "Match complete",
      `${s.commanders[s.winner].name} wins by ${s.endReason}.`,
      s.winner,
      true,
      true,
    );
  }
}
export function stepMatch(s: DemoState) {
  if (s.status !== "playing") return;
  s.time++;
  economyTick(s);
  objectiveTick(s);
  for (const f of s.fleets) movementTick(s, f);
  combatTick(s);
  defenseTick(s);
  territoryTick(s);
  activityTick(s);
  miningTick(s);
  botTick(s);
  victoryTick(s);
  if (s.time % 30 === 0 || s.winner !== null)
    s.history.push({
      time: s.time,
      scores: s.commanders.map((c) => Math.floor(c.score)),
      territory: s.commanders.map((c) => external(s, c.id).length),
    });
  syncPlayer(s);
}
export function advanceDemo(input: DemoState, seconds: number): DemoState {
  if (!Number.isFinite(seconds) || seconds <= 0 || input.status === "finished")
    return input;
  if (input.accumulator + seconds + 1e-8 < BALANCE.tick)
    return { ...input, accumulator: input.accumulator + seconds };
  const s = structuredClone(input);
  s.accumulator += seconds;
  while (s.accumulator + 1e-8 >= BALANCE.tick && s.status === "playing") {
    s.accumulator = Math.max(0, s.accumulator - BALANCE.tick);
    stepMatch(s);
  }
  return s;
}
