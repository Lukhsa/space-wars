import { WORLD } from "./catalog";
import type { Commander, DemoState, Fleet, Lane, Point, System } from "./types";

export function randomFrom(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let n = Math.imul(h ^ (h >>> 15), 1 | h);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const names = [
  "Helix",
  "Erebus",
  "Kareth",
  "Vesper",
  "Tycho",
  "Dravos",
  "Cinder",
  "Caldera",
  "Arcturus",
  "Orion",
  "Meridian",
  "Altair",
  "Sable",
  "Talos",
  "Elysium",
  "Haven",
  "Sirius",
  "Osiris",
  "Vega",
  "Lacuna",
  "Riven",
  "Cygnus",
  "Oberon",
  "Valkyr",
  "Solis",
  "Nox",
  "Iskander",
  "Eidolon",
  "Caelum",
  "Halcyon",
  "Thalos",
  "Kepler",
  "Lyra",
  "Adara",
  "Antares",
  "Eos",
  "Hesper",
  "Sagan",
  "Carina",
  "Polaris",
];
const commanderNames = [
  "Cmdr. Vale",
  "Admiral Sera",
  "Cmdr. Vex",
  "Korrak",
  "Tal Kir",
  "Havel",
  "Marshal Rowan",
  "Ilyra",
  "Aster Vor",
  "Kael",
  "Cmdr. Neris",
  "Ashara",
  "Draxen",
  "Oryn",
  "Vesh Tal",
  "Admiral Sol",
  "Kestrel",
  "Navar",
  "Thren",
  "Liora",
  "Rook",
  "Voss",
  "Cmdr. Elian",
  "Kharos",
  "Talon",
  "Isara",
  "Elder Keth",
  "Nym",
  "Sorren",
  "Veyla",
  "Arden",
  "Eris",
];
function intersects(a: Point, b: Point, c: Point, d: Point) {
  const side = (p: Point, q: Point, r: Point) =>
    (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  return side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0;
}
export function generateGalaxy(seed: string): DemoState {
  const random = randomFrom(seed);
  const commanders: Commander[] = [
    {
      id: 0,
      name: commanderNames[0],
      civilization: 0,
      center: { x: 1340, y: 1160 },
    },
  ];
  for (let i = 1; i < 32; i++) {
    const angle = i * 2.39996 + (random() - 0.5) * 0.25;
    const radius = Math.sqrt(i / 32);
    const center = {
      x: 1600 + Math.cos(angle) * radius * 1310,
      y: 1150 + Math.sin(angle) * radius * 880,
    };
    const dx = center.x - 1340,
      dy = center.y - 1160,
      homeDistance = Math.hypot(dx, dy);
    if (homeDistance < 460) {
      center.x = 1340 + (dx / homeDistance) * 460;
      center.y = 1160 + (dy / homeDistance) * 460;
    }
    commanders.push({
      id: i,
      name: commanderNames[i],
      civilization: 1 + (i % 7),
      center,
    });
  }
  const systems: System[] = [];
  const add = (
    point: Point,
    owner: number | null,
    capital: boolean,
    name?: string,
  ) => {
    const id = systems.length;
    systems.push({
      ...point,
      id,
      name:
        name ??
        `${names[(id * 7 + Math.floor(random() * 6)) % names.length]} ${["", " Reach", " Minor", " Prime", " Gate"][Math.floor(id / 40)]}`,
      owner,
      capital,
      planet: Math.floor(random() * 8),
      population: +(random() * 8.5 + 0.2).toFixed(1),
      defense: Math.round(400 + random() * 2700),
      asteroid: random() < 0.34,
      richness: Math.round(900 + random() * 1400),
      scouted: owner === 0,
      capturedAt: -100,
      output: [
        Math.round(30 + random() * 100),
        Math.round(10 + random() * 55),
        Math.round(5 + random() * 25),
      ],
    });
  };
  const homeLayout: [number, number, string][] = [
    [1340, 1160, "Nova Prime"],
    [1190, 1050, "Aegis"],
    [1480, 1095, "Nexus"],
    [1445, 1280, "Pallas"],
    [1190, 1230, "Procyon"],
    [1325, 970, "Lumina"],
    [1580, 1220, "Vesper"],
    [1330, 1385, "Bastion"],
  ];
  homeLayout.forEach(([x, y, name], i) =>
    add(
      {
        x: x + (i ? (random() - 0.5) * 18 : 0),
        y: y + (i ? (random() - 0.5) * 18 : 0),
      },
      i === 2 || i === 6 ? null : 0,
      i === 0,
      name,
    ),
  );
  systems[0].planet = 0;
  systems[0].defense = 3850;
  systems[0].population = 8.4;
  systems[0].asteroid = false;
  systems[2].defense = 1350;
  systems[2].planet = 2;
  systems[3].asteroid = true;
  systems[3].richness = 1600;
  systems[6].asteroid = true;
  for (const commander of commanders.slice(1)) {
    for (let j = 0; j < 4; j++) {
      let point = commander.center;
      let best = point,
        spacing = 0;
      for (let attempt = 0; attempt < 120; attempt++) {
        const a = random() * Math.PI * 2,
          r =
            j === 0 && attempt === 0
              ? 0
              : 35 + random() * (attempt > 60 ? 200 : 135);
        point = {
          x: Math.max(
            130,
            Math.min(WORLD.width - 130, commander.center.x + Math.cos(a) * r),
          ),
          y: Math.max(
            120,
            Math.min(WORLD.height - 120, commander.center.y + Math.sin(a) * r),
          ),
        };
        const gap = Math.min(...systems.map((s) => distance(s, point)));
        if (gap > spacing) {
          best = point;
          spacing = gap;
        }
        if (gap > 90) break;
      }
      add(best, commander.id, j === 0);
    }
  }
  while (systems.length < 160) {
    let point = { x: 0, y: 0 },
      gap = 0;
    for (let n = 0; n < 80; n++) {
      const p = { x: 140 + random() * 2920, y: 150 + random() * 2000 };
      const g = Math.min(...systems.map((s) => distance(s, p)));
      if (g > gap) {
        point = p;
        gap = g;
      }
    }
    add(point, null, false);
  }
  // Disambiguate generated names without numeric placeholder labels.
  const used = new Set<string>();
  systems.forEach((s) => {
    while (used.has(s.name)) s.name += " IV";
    used.add(s.name);
  });
  const candidates: Lane[] = [];
  for (let a = 0; a < systems.length; a++)
    for (let b = a + 1; b < systems.length; b++)
      candidates.push({ a, b, length: distance(systems[a], systems[b]) });
  candidates.sort((a, b) => a.length - b.length);
  const parent = systems.map((s) => s.id),
    degree = systems.map(() => 0),
    lanes: Lane[] = [];
  const root = (n: number): number =>
    parent[n] === n ? n : (parent[n] = root(parent[n]));
  for (const edge of candidates)
    if (root(edge.a) !== root(edge.b)) {
      parent[root(edge.a)] = root(edge.b);
      lanes.push(edge);
      degree[edge.a]++;
      degree[edge.b]++;
    }
  for (const edge of candidates) {
    if (
      edge.length > 270 ||
      degree[edge.a] >= 4 ||
      degree[edge.b] >= 4 ||
      lanes.some((l) => l.a === edge.a && l.b === edge.b)
    )
      continue;
    if (
      lanes.some(
        (l) =>
          ![l.a, l.b].includes(edge.a) &&
          ![l.a, l.b].includes(edge.b) &&
          intersects(
            systems[edge.a],
            systems[edge.b],
            systems[l.a],
            systems[l.b],
          ),
      )
    )
      continue;
    if (random() < 0.68) {
      lanes.push(edge);
      degree[edge.a]++;
      degree[edge.b]++;
    }
  }
  const fleet = (
    id: number,
    owner: number,
    system: number,
    name: string,
    power: number,
  ) => ({
    id,
    owner,
    system,
    name,
    power,
    ships: [4, 2, 1, 0],
    status: "Idle" as const,
    route: [],
    elapsed: 0,
    duration: 0,
    mission: "move" as const,
    miningElapsed: 0,
  });
  const fleets: Fleet[] = [
    fleet(0, 0, 0, "1st Expeditionary", 3850),
    {
      ...fleet(1, 0, 1, "2nd Defense Fleet", 2400),
      status: "Defending" as const,
      ships: [4, 1, 0, 0],
    },
    {
      ...fleet(2, 0, 3, "Mining Group Alpha", 820),
      status: "Mining" as const,
      mission: "mine" as const,
      miningElapsed: 7,
      ships: [2, 0, 0, 0],
    },
  ];
  for (let i = 1; i < 32; i++)
    fleets.push({
      ...fleet(
        i + 2,
        i,
        systems.find((s) => s.owner === i)!.id,
        `${commanders[i].name.replace(/Cmdr\.|Admiral|Marshal|Elder/g, "").trim()} Vanguard`,
        Math.round(900 + random() * 2500),
      ),
    });
  const state: DemoState = {
    seed,
    systems,
    lanes,
    commanders,
    fleets,
    resources: { credits: 12480, alloy: 8640, fuel: 4250 },
    reserve: [2, 1, 0, 0],
    queue: [{ id: 1, kind: "Destroyer", elapsed: 5, duration: 20 }],
    events: [
      {
        id: 0,
        time: 0,
        kind: "world",
        title: "The frontier is yours",
        detail: "Six systems. Three fleets. An uncharted opportunity.",
        system: 0,
        player: true,
      },
      {
        id: 1,
        time: 0,
        kind: "mining",
        title: "Extraction underway",
        detail: "Mining Group Alpha is working the Pallas Belt.",
        system: 3,
        player: true,
      },
    ],
    time: 0,
    nextRival: 4,
    serial: 10,
    reports: [],
  };
  // A handful of real, local moving fleets make the opening tableau feel inhabited.
  for (const f of state.fleets.slice(3, 10)) {
    const edge = lanes.find((l) => l.a === f.system || l.b === f.system)!;
    f.route = [f.system, edge.a === f.system ? edge.b : edge.a];
    f.status = "Moving";
    f.duration = 28 + random() * 20;
    f.elapsed = random() * 15;
  }
  return state;
}

export function routeBetween(
  state: Pick<DemoState, "systems" | "lanes">,
  start: number,
  target: number,
): number[] {
  if (start === target) return [start];
  const costs = state.systems.map(() => Infinity),
    previous = state.systems.map(() => -1),
    seen = new Set<number>();
  costs[start] = 0;
  while (seen.size < state.systems.length) {
    let current = -1;
    costs.forEach((cost, i) => {
      if (!seen.has(i) && (current === -1 || cost < costs[current]))
        current = i;
    });
    if (current === -1 || !Number.isFinite(costs[current])) break;
    if (current === target) {
      const path = [target];
      while (path[0] !== start) path.unshift(previous[path[0]]);
      return path;
    }
    seen.add(current);
    for (const edge of state.lanes) {
      const next =
        edge.a === current ? edge.b : edge.b === current ? edge.a : -1;
      if (next >= 0 && costs[current] + edge.length < costs[next]) {
        costs[next] = costs[current] + edge.length;
        previous[next] = current;
      }
    }
  }
  return [];
}
