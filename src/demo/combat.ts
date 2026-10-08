import { BALANCE } from "./balance";
import { activeBuff, log, moving, ownerName, refreshFleet } from "./model";
import { activeDefenses, defenseSpec } from "./defenses";
import { randomFrom } from "./random";
import type {
  Battle,
  DemoState,
  Fleet,
  ShipUnit,
  Installation,
  Stance,
} from "./types";

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
    c.telemetry.salvageAlloy += BALANCE.pirates.alloy;
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

// A combatant references an actual hull or planetary installation. Structures never enter s.fleets.
type Combatant = {
  owner: number;
  unit: ShipUnit | Installation;
  kind: number;
  stance: Stance;
  fleet?: Fleet;
  installation?: Installation;
};
function present(s: DemoState, system: number): Combatant[] {
  const x = s.systems[system];
  const units: Combatant[] = s.fleets
    .filter((f) => f.system === system && !moving(f))
    .flatMap((f) =>
      f.units.map((unit) => ({
        owner: f.owner,
        unit,
        kind: unit.kind,
        stance: f.stance,
        fleet: f,
      })),
    );
  if (x.owner !== null)
    for (const d of activeDefenses(x))
      units.push({
        owner: x.owner,
        unit: d,
        kind: 2,
        stance: "Balanced",
        installation: d,
      });
  return units;
}
function spec(c: Combatant) {
  return c.installation
    ? defenseSpec(c.installation.kind, c.installation.level)
    : BALANCE.ships[c.kind];
}
const power = (cs: Combatant[]) =>
  cs.reduce(
    (n, c) => n + (spec(c).power * Math.max(0, c.unit.hp)) / spec(c).hull,
    0,
  );
function finish(s: DemoState, b: Battle) {
  const alive = present(s, b.system).filter(
    (c) => c.unit.hp > 0 && b.owners.includes(c.owner),
  );
  const owners = [...new Set(alive.map((c) => c.owner))];
  if (owners.length > 1) return false;
  const winner = owners[0];
  if (winner !== undefined && winner >= 0) {
    s.commanders[winner].stats.wins++;
    if (alive.some((c) => c.installation))
      s.commanders[winner].telemetry.defenseWins++;
  }
  for (const c of alive)
    if (c.fleet && c.fleet.retreatAt === null) c.fleet.status = "Idle";
  log(
    s,
    "battle",
    winner === undefined ? "Mutual destruction" : "Battle resolved",
    (winner === undefined
      ? "No forces survived"
      : ownerName(s, winner) + " holds the field") +
      " at " +
      s.systems[b.system].name +
      ".",
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
  for (const x of s.systems) {
    if (x.capital || s.battles.some((b) => b.system === x.id)) continue;
    const cs = present(s, x.id),
      owners = [...new Set(cs.map((c) => c.owner))].sort((a, b) => a - b);
    if (owners.length < 2) continue;
    const chosen = owners.slice(0, 2),
      initial = chosen.map((o) => power(cs.filter((c) => c.owner === o)));
    const b: Battle = {
      id: ++s.serial,
      system: x.id,
      owners: chosen,
      start: s.time,
      initial,
      power: [...initial],
      casualties: [0, 0],
      participants: [],
    };
    s.battles.push(b);
    x.capture = null;
    for (const o of chosen)
      if (o >= 0) {
        s.commanders[o].stats.battles++;
        if (chosen.includes(-2)) s.commanders[o].stats.guardian++;
        if (cs.some((c) => c.installation && chosen.includes(c.owner)))
          s.commanders[o].telemetry.defenseBattles++;
      }
    log(
      s,
      "battle",
      "Battle of " + x.name,
      ownerName(s, chosen[0]) +
        " vs " +
        ownerName(s, chosen[1]) +
        (activeDefenses(x).length ? " · planetary defenses engaged" : ""),
      x.id,
      chosen.includes(0),
      chosen.includes(0),
    );
  }
  for (const b of s.battles) {
    const cs = present(s, b.system),
      forces = b.owners.map((o) => cs.filter((c) => c.owner === o));
    // Any hostile arrival cancels extraction, including owners awaiting a two-side engagement.
    for (const f of s.fleets.filter(
      (f) => f.system === b.system && !moving(f),
    )) {
      if (f.mission === "mine") {
        f.repeatMining = false;
        f.miningElapsed = 0;
        f.mission = "defend";
      }
      if (b.owners.includes(f.owner)) {
        if (!b.participants.includes(f.id)) b.participants.push(f.id);
        if (f.retreatAt === null) f.status = "Battle";
      } else if (f.status === "Mining") f.status = "Idle";
    }
    const random = randomFrom(s.seed + ":combat:" + b.id + ":" + s.time);
    const hits: { target: Combatant; damage: number; source: number }[] = [];
    const escalation =
      1 +
      Math.max(0, s.time - b.start - BALANCE.combat.escalationStarts) /
        BALANCE.combat.escalationStep;
    forces.forEach((force, side) => {
      for (const c of force) {
        const railgun = c.installation?.kind === "railgun";
        if (
          railgun &&
          (s.time - b.start) % BALANCE.defenses.railgunCadence !== 0
        )
          continue;
        let targets = [...forces[1 - side]];
        if (!targets.length) continue;
        if (railgun || c.stance.startsWith("Focus")) {
          targets.sort((a, b) =>
            c.stance === "Focus escorts" ? a.kind - b.kind : b.kind - a.kind,
          );
          targets = targets.filter((t) => t.kind === targets[0].kind);
        }
        const t = targets[Math.floor(random() * targets.length)];
        const offense =
          c.stance === "Aggressive"
            ? BALANCE.combat.aggressiveAttack
            : c.stance === "Defensive"
              ? BALANCE.combat.defensiveAttack
              : 1;
        const defense =
          t.stance === "Defensive"
            ? BALANCE.combat.defensiveDamage
            : t.stance === "Aggressive"
              ? BALANCE.combat.aggressiveDamage
              : 1;
        const role =
          railgun && t.kind < 2
            ? BALANCE.defenses.railgunVsSmall
            : c.installation?.kind === "station" && t.kind < 2
              ? BALANCE.defenses.stationVsEscort
              : !c.installation && c.kind === 1 && t.kind === 0
                ? BALANCE.combat.antiEscort
                : !c.installation && c.kind === 3 && t.kind === 0
                  ? BALANCE.combat.capitalVsSmall
                  : 1;
        const buff = c.installation
          ? 1
          : 1 +
            (activeBuff(s, c.owner, "guardian") ? BALANCE.guardian.damage : 0) +
            (activeBuff(s, c.owner, "leviathan")
              ? BALANCE.leviathan.damage
              : 0);
        hits.push({
          target: t,
          source: c.owner,
          damage:
            Math.max(1, spec(c).attack - spec(t).armor) *
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
      const t = h.target,
        alive = t.unit.hp > 0;
      t.unit.hp = Math.max(0, t.unit.hp - h.damage);
      if (alive && t.unit.hp <= 0) {
        if (t.installation) {
          t.installation.job = null;
          if (t.owner >= 0) s.commanders[t.owner].telemetry.defensesDestroyed++;
        } else if (t.fleet) {
          b.casualties[b.owners.indexOf(t.owner)]++;
          killers.set(t.fleet.id, h.source);
          if (h.source >= 0) {
            s.commanders[h.source].stats.destroyed++;
            if (t.owner >= 0)
              s.commanders[h.source].score += BALANCE.score.kill;
          }
        }
      }
    }
    for (const f of s.fleets.filter(
      (f) => f.system === b.system && b.owners.includes(f.owner) && !moving(f),
    )) {
      refreshFleet(f);
      if (!f.units.length) rewardNeutral(s, f, killers.get(f.id) ?? -1);
    }
    b.power = forces.map(power);
  }
  s.fleets = s.fleets.filter((f) => f.units.length > 0);
  s.battles = s.battles.filter((b) => !finish(s, b));
  s.reports = s.reports.slice(0, 60);
}
