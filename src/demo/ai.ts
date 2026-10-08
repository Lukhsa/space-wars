import { BALANCE } from "./balance";
import { constructDefense, contested, defensePower } from "./defenses";
import {
  buildShip,
  createFleet,
  launchFleet,
  reinforceFleet,
  retreatFleet,
  routeFor,
} from "./commands";
import { moving, strengthEstimate, visibleSystems } from "./model";
import { commissionMiner, orderMiner } from "./mining";
import { ownedPlanets, ownedYards, planetName } from "./planets";
import { randomFrom } from "./random";
import { shipClasses } from "./catalog";
import type { DemoState } from "./types";

export function botTick(s: DemoState) {
  for (const c of s.commanders) {
    if (!c.bot || s.time < c.nextDecision) continue;
    const random = randomFrom(s.seed + ":bot:" + c.id + ":" + s.time);
    c.nextDecision =
      s.time +
      BALANCE.botMinReaction +
      Math.floor(random() * BALANCE.botReactionJitter);
    const fleets = s.fleets.filter((f) => f.owner === c.id),
      seen = visibleSystems(s, c.id);
    const yards = ownedYards(s, c.id).sort((a, b) => b.system.id - a.system.id);
    for (const { system, planet } of yards) {
      if (contested(s, system, planet.id)) continue;
      if (planet.queue.length < 3) {
        if (!c.buildPlan) {
          const r = random();
          c.buildPlan =
            shipClasses[
              s.time > s.duration * 0.35 && r > 0.93
                ? 3
                : r > 0.65
                  ? 2
                  : r > 0.32
                    ? 1
                    : 0
            ];
        }
        if (!fleets.length && !planet.reserve.some(Boolean))
          c.buildPlan = "Frigate";
        if (!buildShip(s, c.buildPlan, c.id, 1, system.id, planet.id))
          c.buildPlan = undefined;
      }
      const available = planet.reserve.reduce((a, b) => a + b, 0);
      const docked = fleets.find(
        (f) =>
          f.system === system.id &&
          f.planet === planet.id &&
          !moving(f) &&
          f.status !== "Battle" &&
          f.units.length < 24,
      );
      if (docked && available) reinforceFleet(s, docked.id);
      else if (available >= 4 || (!fleets.length && available)) {
        let room = 24;
        const counts = [0, 0, 0, 0];
        for (let i = 3; i >= 0; i--) {
          counts[i] = Math.min(room, planet.reserve[i]);
          room -= counts[i];
        }
        createFleet(s, c.id, counts, system.id, planet.id);
      }
    }
    for (const x of s.systems.filter((x) => x.owner === c.id)) {
      const pirates = s.fleets.some(
        (f) => f.system === x.id && f.neutral === "pirates",
      );
      let miner = s.miners.find((m) => m.system === x.id && m.owner === c.id);
      if (!miner && !pirates && c.resources.alloy > 400) {
        commissionMiner(s, c.id, x.id);
        miner = s.miners.find((m) => m.system === x.id);
      }
      if (miner?.status === "Idle" && x.deposits.length && !pirates)
        orderMiner(s, c.id, x.id, x.deposits[0].id, true);
    }
    if (
      c.resources.alloy > 650 &&
      random() < (c.personality === "Turtle" ? 0.65 : 0.3)
    ) {
      const target = ownedPlanets(s, c.id)
        .filter(
          ({ system, planet }) =>
            !system.capital &&
            !contested(s, system, planet.id) &&
            s.time - planet.capturedAt > 30,
        )
        .sort(
          (a, b) => Number(b.planet.shipyard) - Number(a.planet.shipyard),
        )[0];
      if (target) {
        const { system: x, planet: p } = target;
        const kind = x.installations.some(
          (d) => d.planet === p.id && d.kind === "station" && d.hp > 0,
        )
          ? "railgun"
          : "station";
        constructDefense(s, c.id, x.id, p.id, kind);
      }
    }
    for (const f of fleets) {
      if (moving(f) || f.retreatAt !== null) continue;
      if (f.status === "Battle") {
        const estimate = strengthEstimate(s, c.id, f.system, f.planet),
          risk = estimate ? (estimate[0] + estimate[1]) / 2 : 0;
        const support = fleets
          .filter(
            (v) => v.system === f.system && v.planet === f.planet && !moving(v),
          )
          .reduce(
            (n, v) => n + v.power,
            s.systems[f.system].planets[f.planet]?.owner === c.id
              ? defensePower(s.systems[f.system], f.planet)
              : 0,
          );
        if (risk > support * (c.personality === "Aggressor" ? 1.8 : 1.35))
          retreatFleet(s, f.id);
        else
          f.stance = s.systems[f.system].installations.some(
            (d) => d.planet === f.planet && d.hp > 0,
          )
            ? "Focus defenses"
            : random() < 0.5
              ? "Focus capitals"
              : "Balanced";
        continue;
      }
      if (f.status === "Capturing") continue;
      const here = s.systems[f.system].planets[f.planet];
      if (
        here?.shipyard &&
        here.owner === c.id &&
        f.units.some((u) => u.hp < BALANCE.ships[u.kind].hull * 0.85)
      )
        continue;
      const candidates: { system: number; planet: number; value: number }[] =
        [];
      for (const x of s.systems) {
        if (x.capital) continue;
        const route = routeFor(s, f, x.id);
        if (!route.length || route.length > 4) continue;
        for (const planet of [-1, ...x.planets.map((p) => p.id)]) {
          const p = x.planets[planet],
            enemies = s.fleets.filter(
              (v) =>
                v.system === x.id &&
                v.planet === planet &&
                v.owner !== c.id &&
                !moving(v),
            );
          if (planet === -1 && (!seen.has(x.id) || !enemies.length)) continue;
          if (p?.owner === c.id && !enemies.length) continue;
          const estimate = seen.has(x.id)
            ? strengthEstimate(s, c.id, x.id, planet)
            : null;
          const threat = estimate
            ? (estimate[0] + estimate[1]) / 2
            : p?.owner === null
              ? 0
              : 1400;
          const friendly = fleets
            .filter(
              (v) =>
                v.id !== f.id &&
                v.system === x.id &&
                v.planet === planet &&
                !moving(v),
            )
            .reduce((n, v) => n + v.power, 0);
          if (
            f.power + friendly <
            threat * (c.personality === "Aggressor" ? 0.95 : 1.15)
          )
            continue;
          const duplicate = fleets.some(
            (v) =>
              v.id !== f.id &&
              v.targetPlanet === planet &&
              (v.route.at(-1) ?? v.system) === x.id,
          );
          let value =
            80 -
            (route.length - 1) * 20 -
            threat / 140 -
            (duplicate ? 55 : 0) +
            (p?.shipyard ? 28 : 0) +
            (x.region === "Core" ? 25 : 0) +
            (x.strategic ? 15 : 0);
          if (p?.owner === c.id) value += 65;
          if (planet === -1) value += x.owner === c.id ? 70 : 10;
          if (p?.owner === null && c.personality === "Expansionist")
            value += 20;
          if (
            p?.owner !== null &&
            p?.owner !== c.id &&
            c.personality === "Aggressor"
          )
            value += 20;
          candidates.push({
            system: x.id,
            planet,
            value: value + random() * 12,
          });
        }
      }
      candidates.sort((a, b) => b.value - a.value);
      const best = candidates[0];
      if (
        best &&
        !launchFleet(
          s,
          f.id,
          best.system,
          s.systems[best.system].planets[best.planet]?.owner === c.id
            ? "defend"
            : "attack",
          false,
          best.planet,
        )
      ) {
        c.goal = "Secure " + planetName(s.systems[best.system], best.planet);
        c.target = best.system;
        c.reasoning =
          "Planet resistance, distance, shipyard access and mining safety.";
      } else if (!here?.shipyard) {
        const yard = yards.find((y) => y.planet.reserve.some(Boolean));
        if (yard)
          launchFleet(s, f.id, yard.system.id, "move", false, yard.planet.id);
      }
    }
  }
}
