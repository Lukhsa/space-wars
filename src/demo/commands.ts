import { BALANCE } from "./balance";
import { shipClasses, ships } from "./catalog";
import {
  activeBuff,
  hasBonus,
  log,
  makeFleet,
  moving,
  refreshFleet,
  syncPlayer,
  unitsFrom,
} from "./model";
import { distance, routeBetween } from "./routes";
import type {
  DemoState,
  Fleet,
  Mission,
  Point,
  ShipClass,
  Stance,
} from "./types";

export function routeFor(s: DemoState, f: Fleet, target: number) {
  return routeBetween(
    {
      ...s,
      lanes: s.lanes.filter((l) =>
        [l.a, l.b].every(
          (id) => !s.systems[id].capital || s.systems[id].owner === f.owner,
        ),
      ),
    },
    f.system,
    target,
  );
}
export function travelTime(s: DemoState, route: number[], f?: Fleet) {
  if (route.length < 2) return 0;
  const hullSpeed = f
    ? Math.min(...f.units.map((u) => BALANCE.ships[u.kind].speed))
    : 1;
  const bonus = f
    ? (hasBonus(s, f.owner, "relay") ? BALANCE.buffs.relay : 0) +
      (activeBuff(s, f.owner, "leviathan") ? BALANCE.leviathan.speed : 0)
    : 0;
  return route
    .slice(1)
    .reduce(
      (n, id, i) =>
        n +
        Math.max(
          BALANCE.minTravel,
          Math.round(
            distance(s.systems[route[i]], s.systems[id]) /
              BALANCE.travelSpeed /
              hullSpeed /
              (1 + bonus),
          ),
        ),
      0,
    );
}
export const fuelCost = (s: DemoState, f: Fleet, route: number[]) =>
  Math.ceil(
    Math.max(0, route.length - 1) *
      (BALANCE.fuelPerHop +
        f.units.reduce((n, u) => n + BALANCE.fuelPerHull[u.kind], 0)) *
      (hasBonus(s, f.owner, "logistics") ? 1 - BALANCE.buffs.logistics : 1),
  );
export function fleetPosition(
  s: Pick<DemoState, "systems" | "accumulator">,
  f: Fleet,
): Point & { angle: number } {
  const a = s.systems[f.system];
  if (!moving(f)) return { ...a, angle: 0 };
  const b = s.systems[f.route[1]],
    t = Math.min(1, (f.elapsed + s.accumulator) / f.duration);
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
  };
}
export function launchFleet(
  s: DemoState,
  fleetId: number,
  target: number,
  mission: Mission,
  repeatMining = false,
): string | null {
  const f = s.fleets.find((f) => f.id === fleetId),
    system = s.systems[target];
  if (s.status !== "playing") return "This match has ended.";
  if (!f || !system || !f.units.length)
    return "Select an available fleet and destination.";
  if (moving(f) || f.status === "Battle" || f.retreatAt !== null)
    return "This fleet is committed. Use Retreat during battle.";
  if (system.capital && system.owner !== f.owner)
    return "Home systems are protected from foreign fleets.";
  if (mission === "mine" && !system.asteroid)
    return "This system has no asteroid deposits.";
  if (mission === "mine" && system.owner !== f.owner)
    return "Control this system before mining.";
  if (
    mission === "mine" &&
    s.fleets.some(
      (x) =>
        x.id !== f.id &&
        x.owner === f.owner &&
        x.mission === "mine" &&
        (x.route.at(-1) ?? x.system) === target,
    )
  )
    return "This system already has an extraction fleet assigned.";
  if (
    mission === "attack" &&
    system.owner === f.owner &&
    !s.fleets.some((x) => x.system === target && x.owner !== f.owner)
  )
    return "This system is already yours. Use Defend.";
  const route = routeFor(s, f, target);
  if (!route.length) return "No permitted route.";
  const cost = fuelCost(s, f, route),
    c = s.commanders[f.owner];
  if (c && c.resources.fuel < cost) return "Insufficient Fuel.";
  if (c) {
    c.resources.fuel -= cost;
    c.telemetry.spent.fuel += cost;
    c.stats.orders++;
  }
  f.mission = mission;
  f.repeatMining = mission === "mine" && repeatMining;
  if (mission === "scout" && route.length === 1 && c) {
    c.intel[target] = s.time + BALANCE.scoutingSeconds;
    if (f.owner === 0) system.scouted = true;
  }
  f.route = route.length > 1 ? route : [];
  f.elapsed = 0;
  f.duration = travelTime(s, route.slice(0, 2), f);
  f.miningElapsed = 0;
  f.lastOrder = s.time;
  f.status = moving(f)
    ? mission === "attack"
      ? "Attacking"
      : mission === "scout"
        ? "Scouting"
        : "Moving"
    : mission === "mine"
      ? "Mining"
      : mission === "defend"
        ? "Defending"
        : "Idle";
  log(
    s,
    "fleet",
    moving(f) ? "Fleet launched" : "Orders confirmed",
    `${f.name} → ${system.name}.`,
    target,
    f.owner === 0,
  );
  return null;
}
export function buildShip(
  s: DemoState,
  kind: ShipClass,
  owner = 0,
  quantity = 1,
): string | null {
  const c = s.commanders[owner],
    spec = ships[kind];
  if (s.status !== "playing") return "This match has ended.";
  if (
    !c ||
    !spec ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 10
  )
    return "Invalid construction order.";
  if (c.queue.length + quantity > BALANCE.queueLimit)
    return "Shipyard queue is full.";
  if (
    c.resources.credits < spec.credits * quantity ||
    c.resources.alloy < spec.alloy * quantity
  )
    return "Insufficient construction resources.";
  c.resources.credits -= spec.credits * quantity;
  c.resources.alloy -= spec.alloy * quantity;
  c.telemetry.spent.credits += spec.credits * quantity;
  c.telemetry.spent.alloy += spec.alloy * quantity;
  for (let i = 0; i < quantity; i++)
    c.queue.push({ id: ++s.serial, kind, elapsed: 0, duration: spec.seconds });
  log(
    s,
    "build",
    "Construction queued",
    `${quantity} ${kind} at ${s.systems[owner].name}.`,
    owner,
    owner === 0,
  );
  syncPlayer(s);
  return null;
}
export function reinforceFleet(s: DemoState, fleetId: number): string | null {
  const f = s.fleets.find((f) => f.id === fleetId),
    c = f && s.commanders[f.owner];
  if (s.status !== "playing") return "This match has ended.";
  if (!f || !c || moving(f) || f.system !== f.owner || f.status === "Battle")
    return "Return to your home shipyard to reinforce.";
  if (!c.reserve.some(Boolean)) return "No reserve ships available.";
  let space = BALANCE.shipLimit - f.units.length;
  if (space <= 0) return "Fleet is at its 32-ship capacity.";
  for (let i = 3; i >= 0; i--) {
    const n = Math.min(space, c.reserve[i]);
    f.units.push(...unitsFrom([0, 1, 2, 3].map((k) => (k === i ? n : 0))));
    c.reserve[i] -= n;
    space -= n;
  }
  refreshFleet(f);
  syncPlayer(s);
  return null;
}
export function createFleet(
  s: DemoState,
  owner = 0,
  counts?: number[],
): string | null {
  const c = s.commanders[owner];
  if (s.status !== "playing" || !c) return "No active commander.";
  if (s.fleets.filter((f) => f.owner === owner).length >= BALANCE.fleetLimit)
    return "Five fleets maximum. Reinforce an existing fleet.";
  const take = counts ?? [...c.reserve];
  if (
    take.length !== 4 ||
    take.some((n, i) => !Number.isInteger(n) || n < 0 || n > c.reserve[i]) ||
    take.reduce((a, b) => a + b, 0) < 1 ||
    take.reduce((a, b) => a + b, 0) > BALANCE.shipLimit
  )
    return "Choose 1–32 available reserve ships.";
  const f = makeFleet(s, owner, owner, `Task Force ${c.stats.built + 1}`, take);
  take.forEach((n, i) => (c.reserve[i] -= n));
  s.fleets.push(f);
  syncPlayer(s);
  return null;
}
export function setStance(s: DemoState, id: number, stance: Stance) {
  const f = s.fleets.find((x) => x.id === id);
  if (!f || s.status !== "playing") return "Fleet unavailable.";
  f.stance = stance;
  return null;
}
export function retreatFleet(s: DemoState, id: number): string | null {
  const f = s.fleets.find((x) => x.id === id);
  if (
    !f ||
    f.owner < 0 ||
    moving(f) ||
    f.retreatAt !== null ||
    s.status !== "playing"
  )
    return "Fleet cannot withdraw now.";
  if (f.system === f.owner) return "Already at protected homeworld.";
  const route = routeFor(s, f, f.owner);
  const cost = fuelCost(s, f, route);
  if (!route.length || s.commanders[f.owner].resources.fuel < cost)
    return "Insufficient Fuel for withdrawal home.";
  s.commanders[f.owner].resources.fuel -= cost;
  s.commanders[f.owner].telemetry.spent.fuel += cost;
  f.repeatMining = false;
  f.miningElapsed = 0;
  f.retreatFuel = cost;
  f.retreatAt = s.time + BALANCE.retreatSeconds;
  f.status = "Retreating";
  log(
    s,
    "battle",
    "Withdrawal ordered",
    `${f.name} must hold for ${BALANCE.retreatSeconds}s before departing.`,
    f.system,
    f.owner === 0,
  );
  return null;
}
export function postChat(s: DemoState, owner: number, text: string) {
  const clean = text.trim().slice(0, 240);
  if (!clean) return "Enter a message.";
  s.chat.push({ id: ++s.serial, owner, text: clean, time: s.time });
  s.chat = s.chat.slice(-80);
  return null;
}
export { shipClasses };
