export type Point = { x: number; y: number };
export type Mission = "move" | "attack" | "mine" | "scout";
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
  id: number;
  name: string;
  civilization: number;
  center: Point;
}
export interface System extends Point {
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
}
export interface Lane {
  a: number;
  b: number;
  length: number;
}
export interface Fleet {
  id: number;
  name: string;
  owner: number;
  power: number;
  ships: number[];
  system: number;
  status: "Idle" | "Defending" | "Moving" | "Attacking" | "Mining" | "Scouting";
  route: number[];
  elapsed: number;
  duration: number;
  mission: Mission;
  miningElapsed: number;
}
export interface LogEvent {
  id: number;
  time: number;
  kind: "fleet" | "mining" | "battle" | "build" | "world" | "scout";
  title: string;
  detail: string;
  system: number;
  player: boolean;
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
}
