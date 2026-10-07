import { BALANCE, type Strategic } from "./balance";
import { randomFrom } from "./random";
import { distance } from "./routes";
import { makeFleet } from "./model";
import type { Commander, DemoState, Lane, Personality, System } from "./types";
export { randomFrom } from "./random";
export { distance, routeBetween } from "./routes";
const names = [
  "Nova Prime",
  "Sera",
  "Kareth",
  "Korrak",
  "Sol",
  "Haven",
  "Glint",
  "Myr",
  "Nexus",
  "Vega",
  "Pallas",
  "Helix",
  "Vesper",
  "Tycho",
  "Lumina",
  "Aegis",
  "Caldera",
  "Orion",
  "Meridian",
  "Altair",
  "Sable",
  "Talos",
  "Elysium",
  "Sirius",
  "Aureole",
  "The Crucible",
  "Eidolon",
  "Eventide",
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
];
export function generateGalaxy(
  seed: string,
  duration: number = BALANCE.duration,
  allBots = false,
): DemoState {
  const random = randomFrom(seed);
  const personalities: Personality[] = [
    "Expansionist",
    "Aggressor",
    "Industrialist",
    "Turtle",
    "Opportunist",
    "Aggressor",
    "Expansionist",
    "Opportunist",
  ];
  for (let i = personalities.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [personalities[i], personalities[j]] = [personalities[j], personalities[i]];
  }
  const commanders: Commander[] = commanderNames.map((name, id) => ({
    id,
    name,
    civilization: id,
    center: { x: 0, y: 0 },
    bot: id > 0 || allBots,
    personality: personalities[id],
    resources: { ...BALANCE.startingResources },
    reserve: [0, 0, 0, 0],
    queue: [],
    score: 0,
    stats: {
      peak: 1,
      battles: 0,
      wins: 0,
      destroyed: 0,
      pirates: 0,
      guardian: 0,
      leviathan: 0,
      mined: 0,
      built: 0,
      recoveries: 0,
      captures: 0,
      orders: 0,
    },
    nextDecision: 3 + Math.floor(random() * 8),
    goal: "Prepare expansion",
    target: null,
    reasoning: "Equal homeworld start",
    recoveryUntil: 0,
    recoveryCooldown: 0,
    hadExternal: false,
    buffs: [],
    intel: {},
  }));
  const rotation = random() * 0.16;
  const systems: System[] = Array.from({ length: 28 }, (_, id) => {
    const ring = Math.floor(id / 8),
      slot = id % 8;
    const angle =
      (ring === 3 ? (slot * Math.PI) / 2 : (slot * Math.PI) / 4) +
      Math.PI * 0.72 +
      rotation +
      (ring === 1 ? 0.12 : 0) +
      (random() - 0.5) * 0.09;
    const rx = [1080, 760, 445, 170][ring],
      ry = [790, 555, 335, 145][ring];
    const x = 1600 + Math.cos(angle) * rx + (random() - 0.5) * 42,
      y = 1150 + Math.sin(angle) * ry + (random() - 0.5) * 42;
    const planet = Math.floor(random() * 8),
      belts = id < 16 ? 1 : Math.floor(random() * 3);
    const s: System = {
      id,
      name: names[id],
      x,
      y,
      owner: id < 8 ? id : null,
      capital: id < 8,
      planet,
      star: Math.floor(random() * 8),
      planets: Array.from(
        { length: 2 + Math.floor(random() * 3) },
        (_, i) => (planet + i * 3) % 8,
      ),
      belts,
      asteroid: belts > 0,
      population: 0,
      defense: 0,
      richness: BALANCE.miningAlloy,
      scouted: id === 0,
      capturedAt: -100,
      output: [
        ...(id < 8
          ? BALANCE.homeIncome
          : id < 16
            ? BALANCE.expansionIncome
            : id < 24
              ? BALANCE.midIncome
              : BALANCE.coreIncome),
      ],
      region: id < 8 ? "Home" : id < 16 ? "Frontier" : id < 24 ? "Mid" : "Core",
      capture: null,
    };
    if (id < 8) {
      commanders[id].center = { x, y };
      s.planets = [0, 2, 5];
      s.star = id;
      s.belts = 1;
    }
    return s;
  });
  const bonus: Strategic[] = [
    "forge",
    "relay",
    "sensors",
    "titanium",
    "logistics",
    "trade",
    "forge",
    "relay",
  ];
  const shift = Math.floor(random() * 8);
  for (let i = 0; i < 8; i++)
    systems[16 + i].strategic = bonus[(i + shift) % 8];
  const lanes: Lane[] = [];
  const edge = (a: number, b: number) => {
    if (
      !lanes.some((l) => (l.a === a && l.b === b) || (l.b === a && l.a === b))
    )
      lanes.push({ a, b, length: distance(systems[a], systems[b]) });
  };
  for (let i = 0; i < 8; i++) {
    edge(i, 8 + i);
    edge(i, 8 + ((i + 7) % 8));
    edge(8 + i, 16 + i);
    edge(8 + i, 16 + ((i + 7) % 8));
    edge(16 + i, 16 + ((i + 1) % 8));
    edge(16 + i, 24 + Math.floor(i / 2));
  }
  for (let i = 0; i < 4; i++) edge(24 + i, 24 + ((i + 1) % 4));
  const state: DemoState = {
    seed,
    systems,
    lanes,
    commanders,
    fleets: [],
    resources: commanders[0].resources,
    reserve: commanders[0].reserve,
    queue: commanders[0].queue,
    events: [
      {
        id: 1,
        time: 0,
        kind: "world",
        title: "Quick Conquest begins",
        detail: "Eight commanders. Expand, mine and contest the Core.",
        system: 0,
        player: true,
      },
    ],
    time: 0,
    nextRival: 0,
    serial: 10,
    reports: [],
    duration: Number.isFinite(duration)
      ? Math.max(60, duration)
      : BALANCE.duration,
    accumulator: 0,
    battles: [],
    completedBattles: 0,
    status: "playing",
    winner: null,
    endReason: null,
    domination: null,
    chat: [],
    nextChat: 70,
    objectives: {
      guardian: {
        active: false,
        spawned: false,
        fleet: null,
        system: 24 + Math.floor(random() * 4),
        killer: null,
        nextMove: 0,
      },
      leviathan: {
        active: false,
        spawned: false,
        fleet: null,
        system: 24 + Math.floor(random() * 4),
        killer: null,
        nextMove: 0,
      },
    },
    globalEvents: [],
    surgeUntil: 0,
    nextRaid: BALANCE.pirates.raidInterval,
    history: [],
    devReveal: false,
  };
  for (const c of commanders) {
    state.fleets.push(
      makeFleet(
        state,
        c.id,
        c.id,
        c.id === 0 ? "1st Expeditionary" : `${c.name} Vanguard`,
        [...BALANCE.startingFleet],
      ),
    );
    state.fleets.push(
      makeFleet(
        state,
        c.id,
        c.id,
        c.id === 0 ? "Mining Group Alpha" : `${c.name} Prospectors`,
        [...BALANCE.startingMiner],
      ),
    );
  }
  for (let i = 0; i < 8; i++) {
    const tier = (i + shift) % 3;
    const f = makeFleet(
      state,
      -1,
      16 + i,
      ["Raider Camp", "Pirate Patrol", "Black Ledger Stronghold"][tier],
      [...BALANCE.pirates.fleets[tier]],
    );
    f.neutral = "pirates";
    state.fleets.push(f);
    systems[16 + i].defense = f.power;
  }
  return state;
}
