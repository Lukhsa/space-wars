import type { DemoState, Point } from "./types";
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);
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
