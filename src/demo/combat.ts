import { BALANCE } from "./balance";
import { activeBuff, log, moving, ownerName, refreshFleet } from "./model";
import { randomFrom } from "./random";
import type { Battle, DemoState, Fleet, ShipUnit } from "./types";

function rewardNeutral(s: DemoState, f: Fleet, winner: number) {
  if (!f.neutral) return;
  if (f.neutral !== "pirates") {
    const objective = s.objectives[f.neutral];
    objective.active = false;
    if (winner < 0) {
      log(
        s,
        "world",
        `${f.name} destroyed`,
        `${ownerName(s, winner)} destroyed the objective. No commander receives its reward.`,
        f.system,
        true,
        true,
      );
      return;
    }
  }
  if (winner < 0) return;
  const c = s.commanders[winner];
  if (f.neutral === "pirates") {
    c.stats.pirates++;
    c.score += BALANCE.pirates.score;
    c.resources.credits += BALANCE.pirates.credits;
    c.resources.alloy += BALANCE.pirates.alloy;
    c.resources.fuel += BALANCE.pirates.fuel;
    log(
      s,
      "battle",
      "Pirate stronghold cleared",
      `${c.name} salvaged Credits, Alloy and Fuel.`,
      f.system,
      winner === 0,
    );
  } else {
    const kind = f.neutral,
      rule = BALANCE[kind],
      o = s.objectives[kind];
    o.active = false;
    o.killer = winner;
    c.score += rule.score;
    c.buffs.push({ kind, until: s.time + rule.duration });
    if (kind === "leviathan") c.stats.leviathan++;
    log(
      s,
      "world",
      kind === "guardian"
        ? "Ancient Guardian defeated"
        : "Void Leviathan defeated",
      `${c.name} earned ${rule.score} Dominion and a 3-minute fleet buff.`,
      f.system,
      true,
      true,
    );
  }
}
function finish(s: DemoState, b: Battle) {
  const alive = s.fleets.filter(
    (f) =>
      f.system === b.system &&
      !moving(f) &&
      f.units.length &&
      b.owners.includes(f.owner),
  );
  const owners = [...new Set(alive.map((f) => f.owner))];
  if (owners.length > 1) return false;
  const winner = owners[0];
  if (winner !== undefined && winner >= 0) s.commanders[winner].stats.wins++;
  for (const f of alive)
    if (f.retreatAt === null)
      f.status = f.mission === "mine" ? "Mining" : "Idle";
  log(
    s,
    "battle",
    winner === undefined ? "Mutual destruction" : "Battle resolved",
    `${winner === undefined ? "No fleet survived" : ownerName(s, winner) + " holds the field"} at ${s.systems[b.system].name}.`,
    b.system,
    b.owners.includes(0),
    b.owners.includes(0),
  );
  if (b.owners.includes(0))
    s.reports.unshift({
      id: ++s.serial,
      victory: winner === 0,
      system: b.system,
      attacker: b.initial[b.owners.indexOf(0)],
      defender: b.initial[b.owners.indexOf(0) === 0 ? 1 : 0],
      fleet: "Local engagement",
      time: s.time,
    });
  s.completedBattles++;
  return true;
}
export function combatTick(s: DemoState) {
  s.battles = s.battles.filter((b) => !finish(s, b));
  for (const system of s.systems) {
    if (system.capital || s.battles.some((b) => b.system === system.id))
      continue;
    const present = s.fleets.filter(
      (f) => f.system === system.id && !moving(f) && f.units.length,
    );
    const owners = [...new Set(present.map((f) => f.owner))].sort(
      (a, b) => a - b,
    );
    if (owners.length < 2) continue;
    // Two deterministic sides; further arrivals join their side or await the next engagement.
    const chosen = owners.slice(0, 2),
      forces = chosen.map((o) => present.filter((f) => f.owner === o));
    const b: Battle = {
      id: ++s.serial,
      system: system.id,
      owners: chosen,
      start: s.time,
      initial: forces.map((fs) => fs.reduce((n, f) => n + f.power, 0)),
      power: [],
      casualties: [0, 0],
      participants: [],
    };
    b.power = [...b.initial];
    s.battles.push(b);
    system.capture = null;
    for (const o of chosen)
      if (o >= 0) {
        s.commanders[o].stats.battles++;
        if (chosen.includes(-2)) s.commanders[o].stats.guardian++;
      }
    log(
      s,
      "battle",
      `Battle of ${system.name}`,
      `${ownerName(s, chosen[0])} vs ${ownerName(s, chosen[1])}`,
      system.id,
      chosen.includes(0) || system.owner === 0,
      chosen.includes(0) || system.owner === 0,
    );
  }
  for (const b of s.battles) {
    const forces = b.owners.map((owner) =>
      s.fleets.filter(
        (f) =>
          f.owner === owner &&
          f.system === b.system &&
          !moving(f) &&
          f.units.length,
      ),
    );
    for (const fs of forces)
      for (const f of fs) {
        if (!b.participants.includes(f.id)) b.participants.push(f.id);
        if (f.retreatAt === null) f.status = "Battle";
      }
    const random = randomFrom(`${s.seed}:combat:${b.id}:${s.time}`);
    // Snapshot volleys, then apply simultaneously. Units killed this tick still fire.
    const hits: {
      target: ShipUnit;
      damage: number;
      source: number;
      fleet: Fleet;
    }[] = [];
    forces.forEach((fs, side) => {
      const targets = forces[1 - side].flatMap((f) =>
        f.units.map((u) => ({ f, u })),
      );
      for (const f of fs)
        for (const u of f.units) {
          if (!targets.length) continue;
          const sorted = [...targets].sort((a, b) =>
            f.stance === "Focus capitals"
              ? b.u.kind - a.u.kind
              : f.stance === "Focus escorts"
                ? a.u.kind - b.u.kind
                : 0,
          );
          const pool = f.stance.startsWith("Focus")
            ? sorted.filter((t) => t.u.kind === sorted[0].u.kind)
            : sorted;
          const t = pool[Math.floor(random() * pool.length)],
            spec = BALANCE.ships[u.kind],
            armor = BALANCE.ships[t.u.kind].armor;
          const offense =
            f.stance === "Aggressive"
              ? BALANCE.combat.aggressiveAttack
              : f.stance === "Defensive"
                ? BALANCE.combat.defensiveAttack
                : 1;
          const defense =
            t.f.stance === "Defensive"
              ? BALANCE.combat.defensiveDamage
              : t.f.stance === "Aggressive"
                ? BALANCE.combat.aggressiveDamage
                : 1;
          const role =
            u.kind === 1 && t.u.kind === 0
              ? BALANCE.combat.antiEscort
              : u.kind === 3 && t.u.kind === 0
                ? BALANCE.combat.capitalVsSmall
                : 1;
          const buff =
            1 +
            (activeBuff(s, f.owner, "guardian") ? BALANCE.guardian.damage : 0) +
            (activeBuff(s, f.owner, "leviathan")
              ? BALANCE.leviathan.damage
              : 0);
          const escalation =
            1 +
            Math.max(0, s.time - b.start - BALANCE.combat.escalationStarts) /
              BALANCE.combat.escalationStep;
          hits.push({
            target: t.u,
            fleet: t.f,
            source: f.owner,
            damage:
              Math.max(1, spec.attack - armor) *
              offense *
              defense *
              role *
              buff *
              (1 -
                BALANCE.combat.variation / 2 +
                random() * BALANCE.combat.variation) *
              escalation,
          });
        }
    });
    const killers = new Map<number, number>();
    for (const h of hits) {
      const alive = h.target.hp > 0;
      h.target.hp -= h.damage;
      if (alive && h.target.hp <= 0) {
        const side = b.owners.indexOf(h.fleet.owner);
        b.casualties[side]++;
        killers.set(h.fleet.id, h.source);
        if (h.source >= 0) {
          s.commanders[h.source].stats.destroyed++;
          if (h.fleet.owner >= 0)
            s.commanders[h.source].score += BALANCE.score.kill;
        }
      }
    }
    for (const fs of forces)
      for (const f of fs) {
        refreshFleet(f);
        if (!f.units.length) rewardNeutral(s, f, killers.get(f.id) ?? -1);
      }
    b.power = forces.map((fs) => fs.reduce((n, f) => n + f.power, 0));
  }
  s.fleets = s.fleets.filter((f) => f.units.length > 0);
  s.battles = s.battles.filter((b) => !finish(s, b));
  s.reports = s.reports.slice(0, 60);
}
