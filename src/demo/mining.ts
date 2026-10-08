import { BALANCE } from "./balance";
import { randomFrom } from "./random";
import { log, moving } from "./model";
import { planetOffset, planetPosition } from "./planets";
import type { DemoState, Miner, System } from "./types";
export function spawnDeposit(
  system: System,
  seed: string,
  time: number,
  systems: readonly System[] = [system],
) {
  if (system.deposits.length >= BALANCE.mining.maximumDeposits) return;
  const random = randomFrom(`${seed}:deposit:${system.id}:${time}`);
  const slot = Array.from({ length: 24 }, (_, i) => i).find(
    (slot) => !system.deposits.some((d) => d.slot === slot),
  );
  if (slot === undefined) return;
  const placement = randomFrom(`${seed}:deposit-position:${system.id}:${time}`);
  const neighbors = systems.filter(
    (x) => Math.hypot(x.x - system.x, x.y - system.y) < 550,
  );
  const sectorWidth = (Math.PI * 2) / 6;
  const counts = Array.from({ length: 6 }, () => 0);
  for (const d of system.deposits) {
    const angle = (Math.atan2(d.y, d.x) + Math.PI * 2) % (Math.PI * 2);
    counts[Math.floor(angle / sectorWidth)]++;
  }
  // Fill sparse directions, varying both angle and distance instead of using a ring.
  const sectors = counts
    .map((count, sector) => ({ count, sector, tie: placement() }))
    .sort((a, b) => a.count - b.count || a.tie - b.tie);
  let position: { x: number; y: number } | undefined;
  for (const { sector } of sectors) {
    for (let attempt = 0; attempt < 32; attempt++) {
      const angle = (sector + placement()) * sectorWidth;
      const radius = Math.sqrt(95 ** 2 + placement() * (245 ** 2 - 95 ** 2));
      const candidate = {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      };
      if (
        neighbors.every((x) => {
          const dx = system.x + candidate.x - x.x,
            dy = system.y + candidate.y - x.y;
          return (
            Math.hypot(dx, dy) > 90 &&
            x.planets.every((p) => {
              const q = planetOffset(x, p.id);
              return Math.hypot(q.x - dx, q.y - dy) > 50;
            }) &&
            x.deposits.every((d) => Math.hypot(d.x - dx, d.y - dy) > 38)
          );
        })
      ) {
        position = candidate;
        break;
      }
    }
    if (position) break;
  }
  if (!position) return;
  const richness = Math.round(system.richness * (0.9 + random() * 0.2));
  system.deposits.push({
    id: system.id * 100000 + time * 10 + slot,
    slot,
    ...position,
    richness,
    reserves: richness * BALANCE.mining.reservesCycles,
  });
  system.belts = system.deposits.length;
  system.asteroid = true;
}
export function seedDeposits(
  system: System,
  seed: string,
  systems: readonly System[] = [system],
) {
  const count = system.capital ? 6 : 6 + (system.id % 2);
  for (let i = 0; i < count; i++) spawnDeposit(system, seed, i, systems);
  system.nextDeposit = 70 + (system.id % 40);
}
export const makeMiner = (
  s: DemoState,
  owner: number,
  system: number,
): Miner => ({
  berth:
    Array.from({ length: BALANCE.mining.perSystem }, (_, i) => i).find(
      (i) =>
        !s.miners.some(
          (m) => m.system === system && m.owner === owner && m.berth === i,
        ),
    ) ?? 0,
  site: null,
  travel: 0,
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
  if (
    s.miners.filter((m) => m.system === system && m.owner === owner).length >=
    BALANCE.mining.perSystem
  )
    return `This system has all ${BALANCE.mining.perSystem} mining craft.`;
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
  minerId?: number,
): string | null {
  const m = s.miners.find(
      (m) =>
        m.system === system &&
        m.owner === owner &&
        (minerId === undefined ? m.status === "Idle" : m.id === minerId),
    ),
    x = s.systems[system];
  if (s.status !== "playing" || !m || x.owner !== owner)
    return "A controlled system and its mining craft are required.";
  if (m.status !== "Idle")
    return "The mining craft is already on an expedition.";
  const d = x.deposits.find((d) => d.id === deposit && d.reserves > 0);
  if (!d) return "Deposit unavailable.";
  m.deposit = deposit;
  m.site = { x: d.x, y: d.y };
  m.travel = 0;
  m.repeat = repeat;
  m.elapsed = 0;
  m.status = "Outbound";
  return null;
}
export function recallMiner(
  s: DemoState,
  owner: number,
  system: number,
  minerId?: number,
) {
  const m = s.miners.find(
    (m) =>
      m.owner === owner &&
      m.system === system &&
      (minerId === undefined || m.id === minerId),
  );
  if (s.status !== "playing" || !m) return "Mining craft unavailable.";
  m.repeat = false;
  m.elapsed = 0;
  m.status = m.travel > 0 ? "Returning" : "Idle";
  return null;
}
export function minerPosition(s: DemoState, m: Miner) {
  const x = s.systems[m.system];
  const base = planetPosition(
    x,
    x.planets.find((p) => p.owner === m.owner)?.id ?? 0,
  );
  const end = m.site ? { x: x.x + m.site.x, y: x.y + m.site.y } : base;
  const t = Math.max(
    0,
    Math.min(
      1,
      m.travel +
        (m.status === "Outbound"
          ? s.accumulator / BALANCE.mining.outbound
          : m.status === "Returning"
            ? -s.accumulator / BALANCE.mining.returning
            : 0),
    ),
  );
  return {
    x: base.x + (end.x - base.x) * t + m.berth * 42,
    y: base.y + (end.y - base.y) * t + 32,
  };
}
export function miningTick(s: DemoState) {
  for (const x of s.systems)
    if (s.time >= x.nextDeposit) {
      spawnDeposit(x, s.seed, s.time, s.systems);
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
      if (m.repeat && x.deposits.length)
        orderMiner(s, m.owner, m.system, x.deposits[0].id, true, m.id);
      continue;
    }
    c.telemetry.miningSeconds++;
    m.elapsed++;
    if (m.status === "Outbound")
      m.travel = Math.min(1, m.travel + 1 / BALANCE.mining.outbound);
    if (m.status === "Returning")
      m.travel = Math.max(0, m.travel - 1 / BALANCE.mining.returning);
    if (m.status === "Outbound" && m.elapsed >= BALANCE.mining.outbound) {
      m.status = "Extracting";
      m.elapsed = 0;
    } else if (
      m.status === "Extracting" &&
      m.elapsed >= BALANCE.mining.extraction
    ) {
      const d = x.deposits.find((d) => d.id === m.deposit);
      if (!d) {
        m.status = "Returning";
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
    } else if (m.status === "Returning" && m.travel <= 0) {
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
        m.site = { x: next.x, y: next.y };
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
