import { BALANCE } from "./balance";
import {
  constructDefense,
  contested,
  defenseKinds,
  defensePower,
  defenseQuote,
  defenseSpec,
} from "./defenses";
import {
  buildShip,
  createFleet,
  launchFleet,
  reinforceFleet,
  retreatFleet,
  routeFor,
} from "./commands";
import { external, moving, strengthEstimate, visibleSystems } from "./model";
import { randomFrom } from "./random";
import { shipClasses } from "./catalog";
import type { DemoState, Mission } from "./types";

export function botTick(s: DemoState) {
  for (const c of s.commanders) {
    if (!c.bot || s.time < c.nextDecision) continue;
    const random = randomFrom(`${s.seed}:bot:${c.id}:${s.time}`);
    c.nextDecision =
      s.time +
      BALANCE.botMinReaction +
      Math.floor(random() * BALANCE.botReactionJitter);
    const fleets = s.fleets.filter((f) => f.owner === c.id),
      reserve = c.reserve.reduce((a, b) => a + b, 0);
    // Same construction/formation commands and budgets as the human.
    if (c.queue.length < 3) {
      if (!c.buildPlan) {
        const roll = random();
        const preference =
          s.time > s.duration * 0.35 && roll > 0.92
            ? 3
            : roll > 0.65
              ? 2
              : roll > 0.35
                ? 1
                : 0;
        c.buildPlan = shipClasses[preference];
      }
      // Save for the chosen hull; do not endlessly spend the heavy-ship budget on escorts.
      if (!fleets.length && reserve < 3) c.buildPlan = "Frigate";
      if (!buildShip(s, c.buildPlan, c.id)) c.buildPlan = undefined;
    }
    const atHome = fleets.find(
      (f) =>
        f.system === c.id &&
        !moving(f) &&
        f.status !== "Mining" &&
        f.units.length < 24,
    );
    if (atHome && reserve) reinforceFleet(s, atHome.id);
    else if (reserve >= 4 || (!fleets.length && reserve)) {
      const counts = [0, 0, 0, 0];
      let room = 24;
      for (let i = 3; i >= 0; i--) {
        counts[i] = Math.min(room, c.reserve[i]);
        room -= counts[i];
      }
      createFleet(s, c.id, counts);
    }
    const seen = visibleSystems(s, c.id);
    // Budget stationary protection against the same Alloy needed for the fleet.
    const defensePreference = {
      Turtle: 0.32,
      Industrialist: 0.25,
      Expansionist: 0.18,
      Aggressor: 0.1,
      Opportunist: 0.22,
    }[c.personality];
    const defenseBudget =
      (c.telemetry.passive.alloy +
        c.telemetry.minedAlloy +
        BALANCE.startingResources.alloy) *
      defensePreference;
    const defenseSpent =
      c.telemetry.spent.alloy -
      c.telemetry.builtClasses.reduce(
        (n, count, i) => n + count * BALANCE.ships[i].alloy,
        0,
      ) -
      c.queue.reduce(
        (n, j) => n + BALANCE.ships[shipClasses.indexOf(j.kind)].alloy,
        0,
      );
    const strongholds = external(s, c.id)
      .filter(
        (x) =>
          !contested(s, x) &&
          !x.installations.some((d) => d.job) &&
          s.time - x.capturedAt > 30,
      )
      .map((x) => ({
        x,
        value:
          (x.strategic ? 35 : 0) +
          (x.region === "Core" ? 35 : 0) +
          (x.asteroid ? (c.personality === "Industrialist" ? 35 : 15) : 0) +
          s.lanes.filter(
            (l) =>
              (l.a === x.id || l.b === x.id) &&
              s.systems[l.a === x.id ? l.b : l.a].owner !== c.id,
          ).length *
            12,
      }))
      .sort((a, b) => b.value - a.value);
    for (const { x } of strongholds) {
      const incoming = s.fleets
        .filter(
          (f) =>
            f.owner !== c.id &&
            seen.has(f.system) &&
            moving(f) &&
            f.route[1] === x.id &&
            f.duration - f.elapsed < BALANCE.defenses.station[0].seconds,
        )
        .reduce((n, f) => n + f.power, 0);
      const threat = (strengthEstimate(s, c.id, x.id)?.[1] ?? 0) + incoming;
      const support = fleets
        .filter((f) => f.system === x.id && !moving(f))
        .reduce((n, f) => n + f.power, defensePower(x));
      if (
        threat > support ||
        c.resources.alloy < 350 ||
        defenseSpent >= defenseBudget
      )
        continue;
      const planet = 0;
      const damaged = x.installations.find(
        (d) => d.hp > 0 && d.hp < defenseSpec(d.kind, d.level).hull * 0.8,
      );
      const kind =
        damaged?.kind ??
        defenseKinds.find(
          (kind) =>
            !x.installations.some(
              (d) => d.planet === planet && d.kind === kind && d.hp > 0,
            ),
        ) ??
        (random() < 0.6 ? "station" : "railgun");
      const q = defenseQuote(x, damaged?.planet ?? planet, kind, !!damaged);
      if (
        !q ||
        q.alloy > defenseBudget - defenseSpent ||
        c.resources.alloy - q.alloy < 150 ||
        (q.level > 1 && s.time < q.level * 240)
      )
        continue;
      if (
        !constructDefense(
          s,
          c.id,
          x.id,
          damaged?.planet ?? planet,
          kind,
          !!damaged,
        )
      )
        break;
    }
    for (const f of fleets) {
      if (moving(f) || f.retreatAt !== null) continue;
      const here = strengthEstimate(s, c.id, f.system),
        risk = (here ? (here[0] + here[1]) / 2 : 0) * (0.85 + random() * 0.3);
      if (f.status === "Battle") {
        const friendly = fleets
          .filter((x) => x.system === f.system && !moving(x))
          .reduce((n, x) => n + x.power, 0);
        if (risk > friendly * (c.personality === "Aggressor" ? 1.7 : 1.2))
          retreatFleet(s, f.id);
        else
          f.stance =
            risk > friendly
              ? "Defensive"
              : random() < 0.4
                ? "Focus capitals"
                : "Aggressive";
        continue;
      }
      if (f.status === "Capturing") continue;
      if (f.status === "Mining") {
        if (
          c.resources.alloy <
            (c.personality === "Industrialist" ? 1800 : 1600) &&
          risk === 0
        )
          continue;
        launchFleet(s, f.id, f.system, "defend");
      }
      if (
        f.system === c.id &&
        f.units.some((u) => u.hp < BALANCE.ships[u.kind].hull * 0.85)
      )
        continue;
      if (f.system !== c.id && f.power < 1000 && c.reserve.some(Boolean)) {
        launchFleet(s, f.id, c.id, "move");
        continue;
      }
      const candidates: {
        target: number;
        mission: Mission;
        utility: number;
        reason: string;
      }[] = [];
      for (const x of s.systems) {
        if (x.capital && x.owner !== c.id) continue;
        const route = routeFor(s, f, x.id);
        if (!route.length || route.length > 4) continue;
        const estimate = seen.has(x.id)
          ? strengthEstimate(s, c.id, x.id)
          : null;
        const threat = estimate ? (estimate[0] + estimate[1]) / 2 : 1400;
        const strength = threat * (0.8 + random() * 0.4);
        const friendly = fleets
          .filter((y) => y.id !== f.id && y.system === x.id && !moving(y))
          .reduce((n, y) => n + y.power, 0);
        const distancePenalty = (route.length - 1) * 12;
        const duplicate = fleets.some(
          (y) => y.id !== f.id && moving(y) && y.route.at(-1) === x.id,
        );
        if (
          x.owner !== c.id &&
          !x.capital &&
          f.power + friendly >
            strength * (c.personality === "Aggressor" ? 0.85 : 1.12)
        ) {
          let utility =
            50 +
            (x.owner === null ? 20 : 10) +
            (x.strategic ? 25 : 0) +
            (x.region === "Core" ? (s.time / s.duration > 0.7 ? 70 : 20) : 0) -
            distancePenalty -
            strength / 120 -
            (duplicate ? 35 : 0);
          if (c.personality === "Expansionist" && x.owner === null)
            utility += 25;
          if (c.personality === "Aggressor" && x.owner !== null) utility += 30;
          if (c.personality === "Opportunist" && strength < f.power * 0.4)
            utility += 25;
          candidates.push({
            target: x.id,
            mission: "attack",
            utility,
            reason:
              "Territory / strategic score; estimated resistance and lane distance",
          });
        }
        if (
          x.owner === c.id &&
          strength > 0 &&
          f.power + friendly > strength * 0.8
        )
          candidates.push({
            target: x.id,
            mission: "defend",
            utility:
              100 - distancePenalty + (c.personality === "Turtle" ? 35 : 0),
            reason: "Visible threat to owned territory",
          });
        if (
          x.asteroid &&
          x.owner === c.id &&
          strength === 0 &&
          !fleets.some(
            (y) =>
              y.id !== f.id &&
              y.mission === "mine" &&
              (y.route.at(-1) ?? y.system) === x.id,
          )
        )
          candidates.push({
            target: x.id,
            mission: "mine",
            utility:
              35 +
              Math.min(
                45,
                Math.max(
                  0,
                  (1000 + c.queue.length * 120 - c.resources.alloy) / 20,
                ),
              ) +
              (x.richness - BALANCE.miningAlloy) / 4 -
              distancePenalty +
              (c.personality === "Industrialist" ? 10 : 0) +
              (f.power < 1000 ? 35 : -25) -
              (c.resources.alloy > 1600 ? 70 : 0),
            reason:
              "Alloy demand, queued production, field richness, travel and safety",
          });
        const objective = Object.values(s.objectives).find(
          (o) => o.active && o.system === x.id,
        );
        if (objective && seen.has(x.id) && f.power + friendly > strength * 1.2)
          candidates.push({
            target: x.id,
            mission: "attack",
            utility: 105 - distancePenalty,
            reason: "Visible major objective within fleet capacity",
          });
      }
      if (!external(s, c.id).length)
        candidates.forEach((x) => {
          if (x.mission === "attack") x.utility += 20;
        });
      candidates.forEach((x) => (x.utility += random() * 20));
      candidates.sort((a, b) => b.utility - a.utility);
      const best = candidates[random() < 0.09 && candidates.length > 1 ? 1 : 0];
      if (
        best &&
        !launchFleet(
          s,
          f.id,
          best.target,
          best.mission,
          best.mission === "mine",
        )
      ) {
        c.goal = `${best.mission} ${s.systems[best.target].name}`;
        c.target = best.target;
        c.reasoning = `${best.reason}. Utility ${Math.round(best.utility)}; imperfect risk estimate.`;
      } else {
        c.goal = "Rebuild / hold position";
        c.reasoning = "No affordable, sufficiently safe order.";
      }
    }
  }
}
