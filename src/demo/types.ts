export type Point = { x: number; y: number };
import type { Strategic } from "./balance";
export type Mission = "move" | "attack" | "mine" | "scout" | "defend";
export type Stance =
  | "Balanced"
  | "Aggressive"
  | "Defensive"
  | "Focus capitals"
  | "Focus escorts"
  | "Focus defenses";
export type Personality =
  "Expansionist" | "Aggressor" | "Industrialist" | "Turtle" | "Opportunist";
export type Resources = { credits: number; alloy: number; fuel: number };
export type ShipUnit = { kind: number; hp: number };
export type DefenseKind = "station" | "railgun";
export interface Planet {
  id: number;
  art: number;
  owner: number | null;
  capture: { owner: number; elapsed: number } | null;
  capturedAt: number;
  shipyard: boolean;
  reserve: number[];
  queue: BuildJob[];
}
export interface Deposit extends Point {
  id: number;
  richness: number;
  reserves: number;
  slot: number;
}
export interface Miner {
  id: number;
  owner: number;
  system: number;
  deposit: number | null;
  status: "Idle" | "Outbound" | "Extracting" | "Returning" | "Intercepted";
  elapsed: number;
  cargo: number;
  hp: number;
  repeat: boolean;
}
export interface Installation {
  planet: number;
  kind: DefenseKind;
  level: number;
  hp: number;
  job: {
    action: "build" | "upgrade" | "repair";
    level: number;
    elapsed: number;
    duration: number;
  } | null;
}
export interface Telemetry {
  passive: Resources;
  spent: Resources;
  minedAlloy: number;
  miningSeconds: number;
  salvageAlloy: number;
  builtClasses: number[];
  defensesBuilt: number;
  defensesUpgraded: number;
  defensesDestroyed: number;
  defenseBattles: number;
  defenseWins: number;
  repairs: number;
  repairAlloy: number;
  ownershipFlips: number;
}
export interface Stats {
  peak: number;
  battles: number;
  wins: number;
  destroyed: number;
  pirates: number;
  guardian: number;
  leviathan: number;
  mined: number;
  built: number;
  recoveries: number;
  captures: number;
  orders: number;
}
export type ShipClass = "Frigate" | "Destroyer" | "Cruiser" | "Dreadnought";
export type Filter =
  "All" | "Owned" | "Neutral" | "Hostile" | "Fleets" | "Asteroids";
export interface Civilization {
  id: string;
  name: string;
  color: string;
  emblem?: string;
  portrait?: string;
}
export interface Commander {
  telemetry: Telemetry;
  id: number;
  name: string;
  civilization: number;
  center: Point;
  bot: boolean;
  personality: Personality;
  resources: Resources;
  reserve: number[];
  queue: BuildJob[];
  score: number;
  stats: Stats;
  nextDecision: number;
  goal: string;
  target: number | null;
  reasoning: string;
  buildPlan?: ShipClass;
  recoveryUntil: number;
  recoveryCooldown: number;
  hadExternal: boolean;
  buffs: { kind: "guardian" | "leviathan"; until: number }[];
  intel: Record<number, number>;
}
export interface System extends Point {
  installations: Installation[];
  id: number;
  name: string;
  owner: number | null;
  planet: number;
  capital: boolean;
  population: number;
  defense: number;
  asteroid: boolean;
  richness: number;
  scouted: boolean;
  capturedAt: number;
  output: [number, number, number];
  star: number;
  planets: Planet[];
  deposits: Deposit[];
  nextDeposit: number;
  belts: number;
  region: "Home" | "Frontier" | "Mid" | "Core";
  strategic?: Strategic;
  capture: { owner: number; elapsed: number } | null;
}
export interface Lane {
  a: number;
  b: number;
  length: number;
}
export interface Fleet {
  planet: number;
  targetPlanet: number;
  id: number;
  name: string;
  owner: number;
  power: number;
  ships: number[];
  system: number;
  status:
    | "Idle"
    | "Defending"
    | "Moving"
    | "Attacking"
    | "Mining"
    | "Scouting"
    | "Battle"
    | "Retreating"
    | "Capturing";
  route: number[];
  elapsed: number;
  duration: number;
  mission: Mission;
  miningElapsed: number;
  repeatMining: boolean;
  units: ShipUnit[];
  stance: Stance;
  previous: number;
  retreatAt: number | null;
  retreatFuel: number;
  lastOrder: number;
  neutral?: "pirates" | "guardian" | "leviathan";
}
export interface LogEvent {
  id: number;
  time: number;
  kind: "fleet" | "mining" | "battle" | "build" | "world" | "scout";
  title: string;
  detail: string;
  system: number;
  player: boolean;
  priority?: boolean;
}
export interface BuildJob {
  id: number;
  kind: ShipClass;
  elapsed: number;
  duration: number;
}
export interface Report {
  id: number;
  victory: boolean;
  system: number;
  attacker: number;
  defender: number;
  fleet: string;
  time: number;
}
export interface DemoState {
  miners: Miner[];
  pirateCamps: { system: number; tier: number; nextSpawn: number }[];
  seed: string;
  systems: System[];
  lanes: Lane[];
  commanders: Commander[];
  fleets: Fleet[];
  resources: { credits: number; alloy: number; fuel: number };
  reserve: number[];
  queue: BuildJob[];
  events: LogEvent[];
  time: number;
  nextRival: number;
  serial: number;
  reports: Report[];
  duration: number;
  accumulator: number;
  battles: Battle[];
  completedBattles: number;
  status: "playing" | "finished";
  winner: number | null;
  endReason: "timer" | "domination" | null;
  domination: { owner: number; elapsed: number } | null;
  chat: { id: number; owner: number; text: string; time: number }[];
  nextChat: number;
  objectives: { guardian: Objective; leviathan: Objective };
  globalEvents: string[];
  surgeUntil: number;
  nextRaid: number;
  history: { time: number; scores: number[]; territory: number[] }[];
  devReveal: boolean;
}
export interface Objective {
  active: boolean;
  spawned: boolean;
  fleet: number | null;
  system: number;
  killer: number | null;
  nextMove: number;
}
export interface Battle {
  planet: number;
  shots: { from: number; to: number; damage: number; railgun: boolean }[];
  id: number;
  system: number;
  owners: number[];
  start: number;
  initial: number[];
  casualties: number[];
  power: number[];
  participants: number[];
}
