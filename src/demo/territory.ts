import { WORLD } from "./catalog";
import type { Point, System } from "./types";

type Cell = Point[];
function clip(poly: Cell, a: number, b: number, c: number): Cell {
  const out: Cell = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i],
      q = poly[(i + 1) % poly.length],
      dp = a * p.x + b * p.y - c,
      dq = a * q.x + b * q.y - c;
    if (dp <= 0.001) out.push(p);
    if (dp < 0 !== dq < 0) {
      const t = dp / (dp - dq);
      out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
    }
  }
  return out;
}
export function createCells(systems: System[]): Cell[] {
  // Outer unowned sites keep edge territories from expanding to the rectangular world bounds.
  const sites: Point[] = [...systems];
  for (let x = 0; x <= WORLD.width; x += 180)
    sites.push({ x, y: 0 }, { x, y: WORLD.height });
  for (let y = 180; y < WORLD.height; y += 180)
    sites.push({ x: 0, y }, { x: WORLD.width, y });
  return systems.map((s) => {
    let cell: Cell = [
      { x: 0, y: 0 },
      { x: WORLD.width, y: 0 },
      { x: WORLD.width, y: WORLD.height },
      { x: 0, y: WORLD.height },
    ];
    for (const other of sites) {
      if (other === s) continue;
      cell = clip(
        cell,
        other.x - s.x,
        other.y - s.y,
        (other.x ** 2 + other.y ** 2 - s.x ** 2 - s.y ** 2) / 2,
      );
      if (!cell.length) break;
    }
    return cell;
  });
}
const key = (p: Point) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
export function territoryPaths(
  systems: System[],
  cells: Cell[],
): { owner: number; path: string; center: Point; count: number }[] {
  const owners = [
    ...new Set(
      systems.map((s) => s.owner).filter((o): o is number => o !== null),
    ),
  ];
  return owners.map((owner) => {
    const edges = new Map<string, { p: Point; q: Point }>();
    const owned = systems.filter((s) => s.owner === owner);
    for (const s of owned) {
      const cell = cells[s.id];
      for (let i = 0; i < cell.length; i++) {
        const p = cell[i],
          q = cell[(i + 1) % cell.length],
          pk = key(p),
          qk = key(q),
          edgeKey = [pk, qk].sort().join("|");
        if (edges.has(edgeKey)) edges.delete(edgeKey);
        else edges.set(edgeKey, { p, q });
      }
    }
    const outgoing = new Map<string, { p: Point; q: Point }[]>();
    for (const edge of edges.values()) {
      const k = key(edge.p);
      outgoing.set(k, [...(outgoing.get(k) ?? []), edge]);
    }
    let path = "";
    while (outgoing.size) {
      const first = outgoing.values().next().value![0];
      const loop: Point[] = [];
      let edge = first;
      let guard = 0;
      while (edge && guard++ < 2000) {
        loop.push(edge.p);
        const list = outgoing.get(key(edge.p))!;
        list.splice(list.indexOf(edge), 1);
        if (!list.length) outgoing.delete(key(edge.p));
        const next = outgoing.get(key(edge.q))?.[0];
        if (!next) break;
        edge = next;
      }
      if (loop.length < 3) continue;
      // Small quadratic corner radii preserve strategic shape, while avoiding jagged cells.
      const near = (a: Point, b: Point) => {
        const t = Math.min(
          0.15,
          10 / Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        );
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      };
      const start = near(loop[0], loop[loop.length - 1]);
      path += `M${start.x},${start.y}`;
      loop.forEach((p, i) => {
        const prev = near(p, loop[(i + loop.length - 1) % loop.length]),
          next = near(p, loop[(i + 1) % loop.length]);
        path += `L${prev.x},${prev.y}Q${p.x},${p.y} ${next.x},${next.y}`;
      });
      path += "Z";
    }
    return {
      owner,
      path,
      center: {
        x: owned.reduce((a, s) => a + s.x, 0) / owned.length,
        y: owned.reduce((a, s) => a + s.y, 0) / owned.length,
      },
      count: owned.length,
    };
  });
}
