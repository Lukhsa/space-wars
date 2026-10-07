import { BALANCE, PHASES } from "./balance";
import type { Strategic } from "./balance";
import type { DemoState, Fleet, LogEvent, Resources, ShipUnit } from "./types";
export const moving = (f: Fleet) => f.route.length > 1;
export function unitsFrom(counts: number[]): ShipUnit[] {
  return counts.flatMap((count, kind) =>
    Array.from({ length: count }, () => ({
      kind,
      hp: BALANCE.ships[kind].hull,
    })),
  );
}
export function refreshFleet(f: Fleet) {
  f.units = f.units.filter((u) => u.hp > 0);
  f.ships = [0, 0, 0, 0];
  f.power = 0;
  for (const u of f.units) {
    f.ships[u.kind]++;
    f.power +=
      (BALANCE.ships[u.kind].power * u.hp) / BALANCE.ships[u.kind].hull;
  }
  f.power = Math.round(f.power);
}
export function makeFleet(
  s: DemoState,
  owner: number,
  system: number,
  name: string,
  counts: number[],
): Fleet {
  const f: Fleet = {
    id: ++s.serial,
    owner,
    system,
    name,
    power: 0,
    ships: counts,
    units: unitsFrom(counts),
    status: "Idle",
    route: [],
    elapsed: 0,
    duration: 0,
    mission: "move",
    miningElapsed: 0,
    stance: "Balanced",
    previous: system,
    retreatAt: null,
    retreatFuel: 0,
    lastOrder: s.time,
  };
  refreshFleet(f);
  return f;
}
export function log(
  s: DemoState,
  kind: LogEvent["kind"],
  title: string,
  detail: string,
  system: number,
  player = true,
  priority = false,
) {
  s.events.unshift({
    id: ++s.serial,
    time: s.time,
    kind,
    title,
    detail,
    system,
    player,
    priority,
  });
  s.events = s.events.slice(0, 160);
}
export const hasBonus = (s: DemoState, owner: number, kind: Strategic) =>
  s.systems.some((x) => x.owner === owner && x.strategic === kind);
export const activeBuff = (
  s: DemoState,
  owner: number,
  kind: "guardian" | "leviathan",
) =>
  !!s.commanders[owner]?.buffs.some((b) => b.kind === kind && b.until > s.time);
export const phase = (s: DemoState) =>
  PHASES[
    BALANCE.phases.reduce<number>(
      (index, start, i) => (s.time / s.duration >= start ? i : index),
      0,
    )
  ];
export const external = (s: DemoState, owner: number) =>
  s.systems.filter((x) => !x.capital && x.owner === owner);
export function standings(s: DemoState) {
  return [...s.commanders].sort(
    (a, b) =>
      (s.status === "finished"
        ? a.id === s.winner
          ? -1
          : b.id === s.winner
            ? 1
            : 0
        : 0) ||
      b.score - a.score ||
      external(s, b.id).length - external(s, a.id).length ||
      a.id - b.id,
  );
}
export const ownerName = (s: DemoState, owner: number) =>
  owner >= 0
    ? s.commanders[owner].name
    : owner === -1
      ? "Black Ledger Pirates"
      : owner === -2
        ? "Ancient Guardian"
        : "Void Leviathan";
export function visibleSystems(s: DemoState, owner: number) {
  const seen = new Set(
    s.systems.filter((x) => x.owner === owner).map((x) => x.id),
  );
  for (const f of s.fleets) if (f.owner === owner) seen.add(f.system);
  const hops = hasBonus(s, owner, "sensors") ? 2 : 1;
  for (let i = 0; i < hops; i++)
    for (const id of [...seen])
      for (const l of s.lanes) {
        if (l.a === id) seen.add(l.b);
        if (l.b === id) seen.add(l.a);
      }
  for (const [id, until] of Object.entries(s.commanders[owner].intel))
    if (until > s.time) seen.add(+id);
  return seen;
}
export function strengthEstimate(
  s: DemoState,
  owner: number,
  system: number,
): [number, number] | null {
  if (
    !visibleSystems(s, owner).has(system) &&
    !(owner === 0 && s.devReveal && !s.commanders[0].bot)
  )
    return null;
  const p = s.fleets
    .filter((f) => f.owner !== owner && f.system === system && !moving(f))
    .reduce((n, f) => n + f.power, 0);
  const scout = (s.commanders[owner].intel[system] ?? 0) > s.time;
  return [
    Math.floor((p * (scout ? 0.9 : 0.7)) / 100) * 100,
    Math.ceil((p * (scout ? 1.1 : 1.3)) / 100) * 100,
  ];
}
export function syncPlayer(s: DemoState) {
  s.resources = s.commanders[0].resources;
  s.reserve = s.commanders[0].reserve;
  s.queue = s.commanders[0].queue;
}
export function incomePerMinute(s: DemoState, owner: number): Resources {
  const income = { credits: 0, alloy: 0, fuel: 0 };
  const recovery = s.commanders[owner].recoveryUntil > s.time;
  for (const x of s.systems.filter((x) => x.owner === owner)) {
    const boost = x.capital && recovery ? 1 + BALANCE.recovery.income : 1;
    income.credits += x.output[0] * boost;
    income.alloy += x.output[1] * boost;
    income.fuel += x.output[2] * boost;
  }
  if (hasBonus(s, owner, "trade")) income.credits *= 1 + BALANCE.buffs.trade;
  if (hasBonus(s, owner, "titanium"))
    income.alloy *= 1 + BALANCE.buffs.titanium;
  return income;
}
