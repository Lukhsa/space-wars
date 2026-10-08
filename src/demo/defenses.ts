import { BALANCE } from "./balance";
import type { DefenseKind, DemoState, Installation, System } from "./types";

export const defenseKinds: DefenseKind[] = ["station", "railgun"];
export const defenseNames = {
  station: "Orbital Defense Station",
  railgun: "Planetary Railgun Battery",
};
export const defenseAssets = {
  station: "colony_orbital_defense_station_01.webp",
  railgun: "colony_planetary_railgun_battery_01.webp",
};
export const defenseSpec = (kind: DefenseKind, level: number) =>
  BALANCE.defenses[kind][level - 1];
export const activeDefenses = (x: System) =>
  x.installations.filter((d) => d.level > 0 && d.hp > 0);
export const defensePower = (x: System) =>
  activeDefenses(x).reduce(
    (n, d) =>
      n +
      (defenseSpec(d.kind, d.level).power * d.hp) /
        defenseSpec(d.kind, d.level).hull,
    0,
  );
export const contested = (s: DemoState, x: System) =>
  s.fleets.some(
    (f) =>
      f.system === x.id &&
      f.route.length < 2 &&
      f.owner !== x.owner &&
      f.units.length > 0,
  );
export function defenseQuote(
  x: System,
  planet: number,
  kind: DefenseKind,
  repair = false,
) {
  const d = x.installations.find((d) => d.planet === planet && d.kind === kind);
  const level = repair ? (d?.level ?? 0) : d && d.hp > 0 ? d.level + 1 : 1;
  if (level < 1 || level > 3 || (repair && (!d || d.hp <= 0))) return null;
  const spec = defenseSpec(kind, level);
  const fraction = repair ? Math.max(0, 1 - (d?.hp ?? 0) / spec.hull) : 1;
  // Additional planets are increasingly expensive; no multiplicative combat bonuses.
  const scale = repair
    ? BALANCE.defenses.repairCost * fraction
    : 1 + planet * BALANCE.defenses.extraPlanetCost;
  return {
    level,
    credits: Math.ceil(spec.credits * scale),
    alloy: Math.ceil(spec.alloy * scale),
    duration: repair
      ? Math.max(
          BALANCE.defenses.repairMinimum,
          Math.ceil(spec.seconds * fraction),
        )
      : spec.seconds,
  };
}
export function constructDefense(
  s: DemoState,
  owner: number,
  system: number,
  planet: number,
  kind: DefenseKind,
  repair = false,
): string | null {
  const x = s.systems[system],
    c = s.commanders[owner];
  if (s.status !== "playing" || !c || !x || x.owner !== owner)
    return "Select a planet in your territory.";
  if (
    !defenseKinds.includes(kind) ||
    !Number.isInteger(planet) ||
    planet < 0 ||
    planet >= x.planets.length
  )
    return "Invalid planetary slot.";
  if (contested(s, x))
    return "Construction is suspended while enemies are present.";
  if (x.installations.some((d) => d.job))
    return "This system's construction lane is occupied.";
  if (
    s.systems
      .filter((x) => x.owner === owner)
      .flatMap((x) => x.installations)
      .filter((d) => d.job).length >= BALANCE.defenses.concurrentJobs
  )
    return "Two defense construction crews are already deployed.";
  const q = defenseQuote(x, planet, kind, repair);
  if (!q || (repair && q.alloy === 0))
    return "Maximum level reached or repair unavailable.";
  if (c.resources.credits < q.credits || c.resources.alloy < q.alloy)
    return "Insufficient construction resources.";
  let d = x.installations.find((d) => d.planet === planet && d.kind === kind);
  if (!d) {
    d = { planet, kind, level: 0, hp: 0, job: null };
    x.installations.push(d);
  }
  c.resources.credits -= q.credits;
  c.resources.alloy -= q.alloy;
  c.telemetry.spent.credits += q.credits;
  c.telemetry.spent.alloy += q.alloy;
  if (repair) c.telemetry.repairAlloy += q.alloy;
  d.job = {
    action: repair ? "repair" : d.hp > 0 ? "upgrade" : "build",
    level: q.level,
    elapsed: 0,
    duration: q.duration,
  };
  return null;
}
export function defenseTick(s: DemoState) {
  for (const x of s.systems) {
    if (x.owner === null || contested(s, x)) continue;
    for (const d of x.installations) {
      const j = d.job;
      if (!j || ++j.elapsed < j.duration) continue;
      const t = s.commanders[x.owner].telemetry;
      if (j.action === "repair") t.repairs++;
      else if (j.action === "upgrade") t.defensesUpgraded++;
      else t.defensesBuilt++;
      const condition =
        j.action === "upgrade" ? d.hp / defenseSpec(d.kind, d.level).hull : 1;
      d.level = j.level;
      d.hp = defenseSpec(d.kind, d.level).hull * condition;
      d.job = null;
    }
  }
}
export function homeDefenses(): Installation[] {
  return defenseKinds.map((kind) => ({
    planet: 0,
    kind,
    level: 1,
    hp: defenseSpec(kind, 1).hull,
    job: null,
  }));
}
