// Deliberately local prototype rules. Not the Battle Lab V2 combat engine.
import { shipClasses, ships } from "./catalog";
import { distance, randomFrom, routeBetween } from "./galaxy";
import type {
  DemoState,
  Fleet,
  LogEvent,
  Mission,
  Point,
  ShipClass,
} from "./types";

export const MINING_SECONDS = 18;
export const moving = (f: Fleet) => f.route.length > 1;
export function log(
  state: DemoState,
  kind: LogEvent["kind"],
  title: string,
  detail: string,
  system: number,
  player = true,
) {
  state.events.unshift({
    id: ++state.serial,
    time: state.time,
    kind,
    title,
    detail,
    system,
    player,
  });
  state.events = state.events.slice(0, 80);
}
export function travelTime(state: DemoState, route: number[]) {
  let length = 0;
  for (let i = 1; i < route.length; i++)
    length += distance(state.systems[route[i - 1]], state.systems[route[i]]);
  return Math.min(60, Math.max(15, Math.round(length / 14)));
}
export function fleetPosition(
  state: Pick<DemoState, "systems">,
  fleet: Fleet,
): Point & { angle: number } {
  if (!moving(fleet)) return { ...state.systems[fleet.system], angle: 0 };
  const segments = fleet.route
    .slice(1)
    .map((id, i) => distance(state.systems[fleet.route[i]], state.systems[id]));
  let remaining =
    segments.reduce((a, b) => a + b, 0) *
    Math.min(1, fleet.elapsed / fleet.duration);
  for (let i = 0; i < segments.length; i++) {
    if (remaining <= segments[i] || i === segments.length - 1) {
      const a = state.systems[fleet.route[i]],
        b = state.systems[fleet.route[i + 1]],
        t = Math.min(1, remaining / segments[i]);
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
      };
    }
    remaining -= segments[i];
  }
  return { ...state.systems[fleet.system], angle: 0 };
}
export function launchFleet(
  state: DemoState,
  fleetId: number,
  target: number,
  mission: Mission,
): string | null {
  const f = state.fleets.find((f) => f.id === fleetId),
    system = state.systems[target];
  if (!f || !system || moving(f)) return "This fleet is already underway.";
  if (mission === "mine" && !system.asteroid)
    return "Select an asteroid field to mine.";
  if (mission === "attack" && system.owner === f.owner)
    return "This system is already under your control.";
  if (mission === "move" && f.system === target)
    return "This fleet is already stationed here.";
  const route = routeBetween(state, f.system, target);
  if (!route.length) return "No navigable route found.";
  const fuel = route.length === 1 ? 0 : 20 * (route.length - 1);
  if (f.owner === 0 && state.resources.fuel < fuel)
    return "Insufficient Fuel for this route.";
  if (f.owner === 0) state.resources.fuel -= fuel;
  f.mission = mission;
  f.route = route;
  f.duration = travelTime(state, route);
  f.elapsed = 0;
  f.miningElapsed = 0;
  f.status =
    mission === "attack"
      ? "Attacking"
      : mission === "scout"
        ? "Scouting"
        : "Moving";
  log(
    state,
    "fleet",
    mission === "attack" ? "Assault fleet launched" : "Fleet orders confirmed",
    `${f.name} → ${system.name}${mission === "mine" ? " Belt" : ""}.`,
    target,
    f.owner === 0,
  );
  if (route.length === 1) arrive(state, f);
  return null;
}
export function buildShip(state: DemoState, kind: ShipClass): string | null {
  const spec = ships[kind];
  if (state.queue.length >= 2) return "Both construction berths are occupied.";
  if (
    state.resources.credits < spec.credits ||
    state.resources.alloy < spec.alloy
  )
    return "Insufficient construction resources.";
  state.resources.credits -= spec.credits;
  state.resources.alloy -= spec.alloy;
  state.queue.push({
    id: ++state.serial,
    kind,
    duration: spec.seconds,
    elapsed: 0,
  });
  log(
    state,
    "build",
    "Construction started",
    `${kind} commissioned at Nova Prime.`,
    0,
  );
  return null;
}
export function reinforceFleet(
  state: DemoState,
  fleetId: number,
): string | null {
  const f = state.fleets.find((f) => f.id === fleetId);
  if (!f || f.owner !== 0 || moving(f) || f.system !== 0)
    return "Return this fleet to Nova Prime to take on reserve ships.";
  if (!state.reserve.some(Boolean))
    return "No ships in reserve. Commission a ship first.";
  state.reserve.forEach((n, i) => {
    f.ships[i] += n;
    f.power += n * ships[shipClasses[i]].power;
  });
  state.reserve = [0, 0, 0, 0];
  log(
    state,
    "fleet",
    "Fleet reinforced",
    `${f.name} took on the available reserve ships.`,
    0,
  );
  return null;
}
export function mockResolveAttack(
  seed: string,
  attack: number,
  defense: number,
) {
  return attack * (0.92 + randomFrom(seed)() * 0.16) >= defense;
}
function arrive(state: DemoState, f: Fleet) {
  const origin = f.route[0] ?? f.system,
    target = f.route.at(-1) ?? f.system,
    system = { ...state.systems[target] },
    oldRoute = [...f.route];
  // Preserve identity for unchanged map objects between clock ticks.
  state.systems = [...state.systems];
  state.systems[target] = system;
  f.system = target;
  f.route = [];
  f.elapsed = 0;
  if (f.mission === "mine") {
    f.status = "Mining";
    f.miningElapsed = 0;
    log(
      state,
      "mining",
      "Mining operation started",
      `${f.name} deployed at ${system.name} Belt.`,
      target,
      f.owner === 0,
    );
    return;
  }
  if (f.mission === "scout") {
    system.scouted = true;
    f.status = "Idle";
    log(
      state,
      "scout",
      "Reconnaissance complete",
      `${system.name}: defensive strength ${system.defense.toLocaleString()}.`,
      target,
      f.owner === 0,
    );
    return;
  }
  if (f.mission === "attack" && system.owner !== f.owner) {
    const defense = system.defense;
    const victory = mockResolveAttack(
      `${state.seed}:${f.id}:${target}:${state.serial}`,
      f.power,
      defense,
    );
    if (f.owner === 0)
      state.reports.unshift({
        id: ++state.serial,
        victory,
        system: target,
        attacker: f.power,
        defender: defense,
        fleet: f.name,
        time: state.time,
      });
    if (victory) {
      system.owner = f.owner;
      system.capturedAt = state.time;
      system.defense = Math.round(f.power * 0.45);
      system.scouted = f.owner === 0;
      f.power = Math.max(300, Math.round(f.power * 0.94));
      f.status = "Defending";
      if (f.owner === 0) {
        state.resources.credits += 450;
        state.resources.alloy += 120;
      }
      log(
        state,
        "battle",
        f.owner === 0 ? "Territory secured" : "Territory changed",
        `${state.commanders[f.owner].name} captured ${system.name}.`,
        target,
        f.owner === 0,
      );
    } else {
      log(
        state,
        "battle",
        "Assault repelled",
        `${f.name} is withdrawing from ${system.name}.`,
        target,
        f.owner === 0,
      );
      f.power = Math.max(250, Math.round(f.power * 0.85));
      f.mission = "move";
      f.status = "Moving";
      f.route = oldRoute.length > 1 ? oldRoute.reverse() : [target, origin];
      f.duration = travelTime(state, f.route);
    }
    return;
  }
  f.status = system.owner === f.owner ? "Defending" : "Idle";
  log(
    state,
    "fleet",
    "Fleet arrived",
    `${f.name} reached ${system.name}.`,
    target,
    f.owner === 0,
  );
}
function rivalActivity(state: DemoState) {
  const random = randomFrom(
    `${state.seed}:activity:${Math.floor(state.nextRival)}`,
  );
  const available = state.fleets.filter(
    (f) => f.owner !== 0 && !moving(f) && f.status !== "Mining",
  );
  const f = available[Math.floor(random() * available.length)];
  if (!f) return;
  const near = state.lanes
    .filter((l) => l.a === f.system || l.b === f.system)
    .map((l) => state.systems[l.a === f.system ? l.b : l.a])
    .filter((s) => s.owner !== 0);
  if (!near.length) return;
  const target = near[Math.floor(random() * near.length)];
  // Deliberately restrained: most activity is travel, occasional extraction or conquest.
  const mission: Mission =
    target.asteroid && random() < 0.3
      ? "mine"
      : target.owner !== f.owner && Math.floor(state.time / 8) % 5 === 0
        ? "attack"
        : "move";
  launchFleet(state, f.id, target.id, mission);
}
export function advanceDemo(input: DemoState, seconds: number): DemoState {
  if (seconds <= 0) return input;
  const state: DemoState = {
    ...input,
    fleets: input.fleets.map((f) => ({ ...f })),
    resources: { ...input.resources },
    queue: input.queue.map((job) => ({ ...job })),
    reserve: [...input.reserve],
    events: [...input.events],
    reports: [...input.reports],
  };
  // Fixed substeps make coarse test advances equivalent to normal animation ticks.
  let remaining = seconds;
  while (remaining > 0) {
    const dt = Math.min(0.1, remaining);
    remaining -= dt;
    state.time += dt;
    state.resources.credits += dt * 0.8;
    for (const f of state.fleets) {
      if (moving(f)) {
        f.elapsed += dt;
        if (f.elapsed + 1e-7 >= f.duration) arrive(state, f);
      } else if (f.status === "Mining") {
        f.miningElapsed += dt;
        if (f.miningElapsed + 1e-7 >= MINING_SECONDS) {
          const s = state.systems[f.system];
          if (f.owner === 0) state.resources.alloy += s.richness;
          log(
            state,
            "mining",
            "Mining complete",
            `${s.name} Belt produced ${s.richness.toLocaleString()} Alloy.`,
            s.id,
            f.owner === 0,
          );
          f.status = "Idle";
          f.miningElapsed = 0;
        }
      }
    }
    state.queue = state.queue.filter((job) => {
      job.elapsed += dt;
      if (job.elapsed + 1e-7 < job.duration) return true;
      state.reserve[shipClasses.indexOf(job.kind)]++;
      log(
        state,
        "build",
        "Ship complete",
        `${job.kind} ready in the Nova Prime reserve.`,
        0,
      );
      return false;
    });
    if (state.time >= state.nextRival) {
      rivalActivity(state);
      state.nextRival += 8;
    }
  }
  return state;
}
