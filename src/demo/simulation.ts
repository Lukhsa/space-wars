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
  miningYield,
  refreshFleet,
  standings,
  syncPlayer,
} from "./model";
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
  const hostile = s.fleets.some(
    (other) =>
      other.id !== f.id &&
      other.system === f.system &&
      other.owner !== f.owner &&
      !moving(other),
  );
  // Hostile fleets intercept at intermediate systems. Lanes cannot skip battles.
  if (
    (hostile || (x.owner !== f.owner && activeDefenses(x).length)) &&
    !x.capital
  )
    f.route = [];
  if (f.route.length > 1) {
    f.duration = travelTime(s, f.route.slice(0, 2), f);
    return;
  }
  f.route = [];
  f.status =
    f.mission === "mine" && x.asteroid
      ? "Mining"
      : x.owner === f.owner
        ? "Defending"
        : "Idle";
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
    for (const x of owned) {
      const multiplier =
        x.capital && recovering ? 1 + BALANCE.recovery.income : 1;
      c.resources.credits +=
        (x.output[0] / 60) *
        multiplier *
        (hasBonus(s, c.id, "trade") ? 1 + BALANCE.buffs.trade : 1);
      c.resources.alloy +=
        (x.output[1] / 60) *
        multiplier *
        (hasBonus(s, c.id, "titanium") ? 1 + BALANCE.buffs.titanium : 1);
      c.resources.fuel += (x.output[2] / 60) * multiplier;
      if (!x.capital) {
        const rate =
          x.region === "Core"
            ? BALANCE.score.core
            : x.strategic
              ? BALANCE.score.strategic
              : BALANCE.score.normal;
        c.score +=
          (rate / 60) *
          (x.region === "Core" && s.time / s.duration >= BALANCE.phases[4]
            ? BALANCE.score.endgameMultiplier
            : 1);
      }
    }
    const forge = hasBonus(s, c.id, "forge") ? BALANCE.buffs.forge : 0;
    for (const key of ["credits", "alloy", "fuel"] as const)
      c.telemetry.passive[key] += c.resources[key] - before[key];
    for (const job of c.queue.slice(0, BALANCE.berths)) {
      job.elapsed +=
        1 +
        forge +
        (recovering && ["Frigate", "Destroyer"].includes(job.kind)
          ? BALANCE.recovery.build
          : 0);
      if (job.elapsed >= job.duration) {
        c.reserve[shipClasses.indexOf(job.kind)]++;
        c.stats.built++;
        c.telemetry.builtClasses[shipClasses.indexOf(job.kind)]++;
        log(
          s,
          "build",
          "Ship construction complete",
          `${job.kind} ready at ${s.systems[c.id].name}.`,
          c.id,
          c.id === 0,
        );
      }
    }
    c.queue = c.queue.filter((j) => j.elapsed < j.duration);
    c.buffs = c.buffs.filter((b) => b.until > s.time);
  }
}
function territoryTick(s: DemoState) {
  for (const x of s.systems) {
    const present = s.fleets.filter((f) => f.system === x.id && !moving(f));
    x.defense = present
      .filter((f) => f.owner !== 0)
      .reduce((n, f) => n + f.power, x.owner !== 0 ? defensePower(x) : 0);
    x.scouted = x.owner === 0 || (s.commanders[0].intel[x.id] ?? 0) > s.time;
    const owners = [...new Set(present.map((f) => f.owner))];
    const owner = owners[0];
    if (
      x.capital ||
      owners.length !== 1 ||
      owner < 0 ||
      owner === undefined ||
      x.owner === owner ||
      activeDefenses(x).length > 0 ||
      present.every((f) => f.mission === "scout" || f.retreatAt !== null)
    ) {
      x.capture = null;
      continue;
    }
    if (!x.capture || x.capture.owner !== owner)
      x.capture = { owner, elapsed: 0 };
    x.capture.elapsed++;
    for (const f of present) if (f.retreatAt === null) f.status = "Capturing";
    if (x.capture.elapsed >= BALANCE.captureSeconds) {
      const old = x.owner;
      x.installations = []; // Ruins and unfinished jobs yield no salvage or inherited structures.
      if (old !== null) s.commanders[owner].telemetry.ownershipFlips++;
      x.owner = owner;
      x.capturedAt = s.time;
      x.capture = null;
      s.commanders[owner].stats.captures++;
      for (const f of present)
        if (f.retreatAt === null)
          f.status = f.mission === "mine" ? "Mining" : "Defending";
      log(
        s,
        "world",
        x.strategic ? "Strategic system captured" : "System captured",
        `${s.commanders[owner].name} controls ${x.name}${old !== null ? ` — taken from ${s.commanders[old].name}` : ""}.`,
        x.id,
        owner === 0 || old === 0,
        old === 0,
      );
    }
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
    const c = s.commanders[f.owner],
      x = s.systems[f.system];
    if (f.mission === "mine" && (x.owner !== f.owner || !x.asteroid)) {
      f.repeatMining = false;
      f.miningElapsed = 0;
      f.mission = "defend";
      f.status = "Idle";
    }
    if (f.system === f.owner) {
      for (const u of f.units)
        u.hp = Math.min(
          BALANCE.ships[u.kind].hull,
          u.hp + BALANCE.ships[u.kind].hull * BALANCE.repairPerSecond,
        );
      refreshFleet(f);
    }
    if (f.status === "Mining" && x.owner === f.owner && x.asteroid) {
      // One extraction operation per system, even if a malformed save bypasses commands.
      if (
        s.fleets.some(
          (other) =>
            other.id < f.id &&
            other.system === x.id &&
            other.owner === f.owner &&
            other.status === "Mining",
        )
      )
        continue;
      c.telemetry.miningSeconds++;
      f.miningElapsed++;
      if (f.miningElapsed >= BALANCE.miningSeconds) {
        const alloy = miningYield(s, f.owner, x);
        c.resources.alloy += alloy;
        c.resources.fuel += BALANCE.miningFuel;
        c.stats.mined += alloy + BALANCE.miningFuel;
        c.telemetry.minedAlloy += alloy;
        f.miningElapsed = 0;
        f.status = f.repeatMining ? "Mining" : "Idle";
        if (!f.repeatMining) f.mission = "defend";
        log(
          s,
          "mining",
          "Mining complete",
          `${f.name}: +${alloy} Alloy / +${BALANCE.miningFuel} Fuel.`,
          x.id,
          f.owner === 0,
        );
      }
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
