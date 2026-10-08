import { BALANCE } from "./balance";
import { randomFrom } from "./random";
import { log, moving } from "./model";
import { planetOffset } from "./planets";
import type { DemoState, Miner, System } from "./types";
export function spawnDeposit(system: System, seed: string, time: number) {
  if (system.deposits.length >= BALANCE.mining.maximumDeposits) return;
  const random = randomFrom(`${seed}:deposit:${system.id}:${time}`);
  const slot = Array.from({ length: 24 }, (_, i) => i).find(
    (slot) =>
      !system.deposits.some((d) => d.slot === slot) &&
      (() => {
        const angle = (slot * Math.PI * 2) / 12,
          radius = slot < 12 ? 100 : 245;
        return system.planets.every((p) => {
          const q = planetOffset(system, p.id);
          return (
            Math.hypot(
              q.x - Math.cos(angle) * radius,
              q.y - Math.sin(angle) * radius,
            ) > 50
          );
        });
      })(),
  );
  if (slot === undefined) return;
  const angle = (slot * Math.PI * 2) / 12,
    radius = slot < 12 ? 100 : 245;
  const richness = Math.round(system.richness * (0.9 + random() * 0.2));
  system.deposits.push({
    id: system.id * 100000 + time * 10 + slot,
    slot,
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
    richness,
    reserves: richness * BALANCE.mining.reservesCycles,
  });
  system.belts = system.deposits.length;
  system.asteroid = true;
}
export function seedDeposits(system: System, seed: string) {
  const count = system.capital ? 6 : 6 + (system.id % 2);
  for (let i = 0; i < count; i++) spawnDeposit(system, seed, i);
  system.nextDeposit = 70 + (system.id % 40);
}
export const makeMiner = (
  s: DemoState,
  owner: number,
  system: number,
): Miner => ({
  id: ++s.serial,
  owner,
  system,
  deposit: null,
  status: "Idle",
  elapsed: 0,
  cargo: 0,
  hp: BALANCE.mining.hull,
  repeat: false,
});
export function commissionMiner(
  s: DemoState,
  owner: number,
  system: number,
): string | null {
  const x = s.systems[system],
    c = s.commanders[owner];
  if (s.status !== "playing" || !c || x?.owner !== owner)
    return "Control a majority of this system to commission its mining craft.";
  if (s.miners.some((m) => m.system === system))
    return "This system already has a mining craft.";
  if (
    c.resources.credits < BALANCE.mining.credits ||
    c.resources.alloy < BALANCE.mining.alloy
  )
    return "Insufficient mining-craft resources.";
  c.resources.credits -= BALANCE.mining.credits;
  c.resources.alloy -= BALANCE.mining.alloy;
  c.telemetry.spent.credits += BALANCE.mining.credits;
  c.telemetry.spent.alloy += BALANCE.mining.alloy;
  s.miners.push(makeMiner(s, owner, system));
  return null;
}
export function orderMiner(
  s: DemoState,
  owner: number,
  system: number,
  deposit: number,
  repeat = true,
): string | null {
  const m = s.miners.find((m) => m.system === system && m.owner === owner),
    x = s.systems[system];
  if (s.status !== "playing" || !m || x.owner !== owner)
    return "A controlled system and its mining craft are required.";
  if (m.status !== "Idle")
    return "The mining craft is already on an expedition.";
  if (!x.deposits.some((d) => d.id === deposit && d.reserves > 0))
    return "Deposit unavailable.";
  m.deposit = deposit;
  m.repeat = repeat;
  m.elapsed = 0;
  m.status = "Outbound";
  return null;
}
export function recallMiner(s: DemoState, owner: number, system: number) {
  const m = s.miners.find((m) => m.owner === owner && m.system === system);
  if (s.status !== "playing" || !m) return "Mining craft unavailable.";
  m.repeat = false;
  m.elapsed = 0;
  m.status = m.cargo > 0 ? "Returning" : "Idle";
  return null;
}
export function miningTick(s: DemoState) {
  for (const x of s.systems)
    if (s.time >= x.nextDeposit) {
      spawnDeposit(x, s.seed, s.time);
      const r = randomFrom(`${s.seed}:replenish:${x.id}:${s.time}`);
      x.nextDeposit =
        s.time +
        BALANCE.mining.spawnMinimum +
        Math.floor(r() * BALANCE.mining.spawnJitter);
    }
  for (const m of s.miners) {
    const x = s.systems[m.system],
      c = s.commanders[m.owner];
    if (x.owner !== m.owner) {
      m.repeat = false;
      m.cargo = 0;
      m.status = "Idle";
      m.deposit = null;
      continue;
    }
    if (m.status === "Idle") {
      m.hp = Math.min(BALANCE.mining.hull, m.hp + 2);
      continue;
    }
    c.telemetry.miningSeconds++;
    m.elapsed++;
    if (m.status === "Outbound" && m.elapsed >= BALANCE.mining.outbound) {
      m.status = "Extracting";
      m.elapsed = 0;
    } else if (
      m.status === "Extracting" &&
      m.elapsed >= BALANCE.mining.extraction
    ) {
      const d = x.deposits.find((d) => d.id === m.deposit);
      if (!d) {
        m.status = "Idle";
        m.elapsed = 0;
        continue;
      }
      const base = Math.min(d.reserves, d.richness);
      m.cargo = Math.round(
        base *
          (s.surgeUntil > s.time ? 1 + BALANCE.surge.alloy : 1) *
          (s.systems.some(
            (x) => x.owner === m.owner && x.strategic === "titanium",
          )
            ? 1 + BALANCE.buffs.titanium
            : 1),
      );
      d.reserves -= base;
      x.deposits = x.deposits.filter((d) => d.reserves > 0);
      x.belts = x.deposits.length;
      m.status = "Returning";
      m.elapsed = 0;
      const pirates = s.fleets.some(
        (f) =>
          f.neutral === "pirates" &&
          f.system === x.id &&
          !moving(f) &&
          f.status !== "Battle",
      );
      if (pirates) {
        m.cargo = Math.floor(m.cargo * (1 - BALANCE.mining.cargoStolen));
        m.hp -= BALANCE.mining.pirateDamage;
        m.status = "Intercepted";
        log(
          s,
          "battle",
          "Mining convoy intercepted",
          `${x.name}: pirates stole cargo and damaged the civilian craft. Clear the resource lanes.`,
          x.id,
          m.owner === 0,
          m.owner === 0,
        );
      }
    } else if (
      m.status === "Intercepted" &&
      m.elapsed >= BALANCE.mining.interception
    ) {
      m.status = "Returning";
      m.elapsed = 0;
    } else if (
      m.status === "Returning" &&
      m.elapsed >= BALANCE.mining.returning
    ) {
      c.resources.alloy += m.cargo;
      c.stats.mined += m.cargo;
      c.telemetry.minedAlloy += m.cargo;
      log(
        s,
        "mining",
        "Cargo delivered",
        `${x.name} mining craft: +${m.cargo} Alloy.`,
        x.id,
        m.owner === 0,
      );
      m.cargo = 0;
      m.elapsed = 0;
      m.status = "Idle";
      const next = x.deposits.find((d) => d.id === m.deposit) ?? x.deposits[0];
      if (m.repeat && next && m.hp > 0) {
        m.deposit = next.id;
        m.status = "Outbound";
      }
    }
    if (m.hp <= 0)
      log(
        s,
        "battle",
        "Mining craft destroyed",
        `Pirates destroyed the returning craft at ${x.name}. Its cargo was lost.`,
        x.id,
        m.owner === 0,
        m.owner === 0,
      );
  }
  s.miners = s.miners.filter(
    (m) => m.hp > 0 && s.systems[m.system].owner === m.owner,
  );
}
