import { useEffect, useMemo, useRef, useState } from "react";
import {
  Crosshair,
  Minus,
  Plus,
  Maximize2,
  Orbit,
  Navigation,
  ScanLine,
} from "lucide-react";
import {
  asset,
  civilizations,
  planets,
  ships,
  shipClasses,
  WORLD,
} from "../demo/catalog";
import { BALANCE } from "../demo/balance";
import { visibleSystems } from "../demo/model";
import { randomFrom } from "../demo/galaxy";
import { fleetPosition, moving } from "../demo/simulation";
import { createCells, territoryPaths } from "../demo/territory";
import { createMapLayout } from "../demo/map-layout";
import { ASTEROID_ART, asteroidSiteName } from "../demo/asteroid-art";
import type { DemoState, Filter, Point } from "../demo/types";

interface Props {
  state: DemoState;
  selected: number;
  selectedAsteroid: boolean;
  selectedFleet: number | null;
  filter: Filter;
  onSelect: (id: number, asteroid?: boolean) => void;
  onFleet: (id: number) => void;
  focus: { id: number; nonce: number; point?: Point; asteroid?: boolean };
  preview: number[];
  paused: boolean;
}
type Camera = Point & { z: number };
export default function GalaxyMap({
  state,
  selected,
  selectedAsteroid,
  selectedFleet,
  filter,
  onSelect,
  onFleet,
  focus,
  preview,
  paused,
}: Props) {
  const container = useRef<HTMLDivElement>(null),
    svg = useRef<SVGSVGElement>(null);
  const worldLayer = useRef<SVGGElement>(null),
    lastCameraPaint = useRef(0);
  const [size, setSize] = useState({ width: 1000, height: 740 });
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const [camera, setCamera] = useState<Camera>(() => ({
    x: state.systems[0].x + (window.innerWidth > 900 ? 200 : 0),
    y: state.systems[0].y - (window.innerWidth > 900 ? 85 : 0),
    z: 0.94,
  }));
  const cameraRef = useRef(camera),
    target = useRef(camera),
    frame = useRef(0);
  const drag = useRef({ active: false, moved: false, x: 0, y: 0 });
  const [hover, setHover] = useState<number | null>(null),
    [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [hoverAsteroid, setHoverAsteroid] = useState(false);
  const mapLayout = useMemo(
    () => createMapLayout(state.systems, state.seed),
    [state.seed],
  );
  const geometry = useMemo(() => createCells(state.systems), [state.seed]); // Geometry is immutable within a seed.
  const owners = state.systems.map((s) => s.owner ?? "n").join(",");
  const territories = useMemo(
    () => territoryPaths(state.systems, geometry),
    [owners, geometry],
  );
  const stars = useMemo(() => {
    const r = randomFrom("starfield:" + state.seed);
    return Array.from({ length: 1000 }, () => ({
      x: r() * WORLD.width,
      y: r() * WORLD.height,
      r: 0.4 + r() * 1.2,
      opacity: 0.2 + r() * 0.55,
    }));
  }, [state.seed]);
  const starfield = useMemo(
    () => (
      <g>
        {stars.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill="#b4c9d4"
            opacity={s.opacity}
          />
        ))}
      </g>
    ),
    [stars],
  );
  const detail = camera.z > 0.72 ? "close" : camera.z > 0.43 ? "medium" : "far";
  const transformFor = (c: Camera) =>
    `translate(${sizeRef.current.width / 2} ${sizeRef.current.height / 2}) scale(${c.z}) translate(${-c.x} ${-c.y})`;
  const paintCamera = (next: Camera, settled = false) => {
    cameraRef.current = next;
    // Move the SVG immediately; refresh labels/culling less often than the camera.
    worldLayer.current?.setAttribute("transform", transformFor(next));
    const now = performance.now();
    if (settled || now - lastCameraPaint.current > 100) {
      setCamera(next);
      lastCameraPaint.current = now;
    }
  };
  const animate = () => {
    cancelAnimationFrame(frame.current);
    const tick = () => {
      const c = cameraRef.current,
        t = target.current;
      const next = {
        x: c.x + (t.x - c.x) * 0.23,
        y: c.y + (t.y - c.y) * 0.23,
        z: c.z + (t.z - c.z) * 0.23,
      };
      const unsettled =
        Math.abs(next.x - t.x) +
          Math.abs(next.y - t.y) +
          Math.abs(next.z - t.z) * 100 >
        0.03;
      paintCamera(next, !unsettled);
      if (unsettled) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };
  const aim = (next: Camera) => {
    target.current = {
      x: Math.max(-150, Math.min(WORLD.width + 150, next.x)),
      y: Math.max(-150, Math.min(WORLD.height + 150, next.y)),
      z: Math.max(0.18, Math.min(2.5, next.z)),
    };
    animate();
  };
  const zoom = (factor: number, point?: Point) => {
    const c = target.current,
      z = Math.max(0.22, Math.min(2.5, c.z * factor)),
      p = point ?? { x: size.width / 2, y: size.height / 2 };
    aim({
      x: c.x + (p.x - size.width / 2) * (1 / c.z - 1 / z),
      y: c.y + (p.y - size.height / 2) * (1 / c.z - 1 / z),
      z,
    });
  };
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setSize({ width: rect.width, height: rect.height });
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      zoom(Math.exp(-event.deltaY * 0.0015), {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  });
  useEffect(() => {
    const s =
      focus.point ??
      (focus.asteroid
        ? mapLayout.fields.find((field) => field.system === focus.id)
        : undefined) ??
      state.systems[focus.id];
    if (s)
      aim({
        x:
          s.x +
          (focus.id === 0 &&
          !focus.point &&
          !focus.asteroid &&
          window.innerWidth > 900
            ? 200
            : 0),
        y:
          s.y -
          (focus.id === 0 &&
          !focus.point &&
          !focus.asteroid &&
          window.innerWidth > 900
            ? 85
            : 0),
        z: focus.id === 0 ? 0.94 : Math.max(1, cameraRef.current.z),
      });
  }, [focus.nonce, state.seed]);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const color = (owner: number | null) =>
    owner === null
      ? "#728596"
      : owner < 0
        ? owner === -3
          ? "#b599db"
          : "#d6ad73"
        : civilizations[state.commanders[owner].civilization].color;
  const emphasized = (id: number) => {
    const s = state.systems[id];
    return (
      filter === "All" ||
      (filter === "Owned" && s.owner === 0) ||
      (filter === "Neutral" && s.owner === null) ||
      (filter === "Hostile" && s.owner !== null && s.owner !== 0) ||
      (filter === "Asteroids" && s.asteroid) ||
      (filter === "Fleets" && state.fleets.some((f) => f.system === id))
    );
  };
  const visible = visibleSystems(state, 0);
  const selectedRoutes = state.fleets.filter(
    (f) => moving(f) && (f.id === selectedFleet || f.owner === 0),
  );
  const selectedSystem = state.systems[selected];
  const fleetSystems =
    filter === "Fleets" ? state.fleets.map((f) => f.system).join(",") : "";
  const captureClock = state.systems.some((s) => state.time - s.capturedAt < 4)
    ? Math.floor(state.time * 10)
    : 0;
  // Clock ticks must not reconcile every stationary planet and label.
  const systemNodes = useMemo(
    () =>
      state.systems.map((s) => {
        const active = s.id === selected,
          hovered = hover === s.id,
          r = s.star === 4 ? 36 : s.star === 2 ? 23 : 30;
        const visible =
          s.x > camera.x - size.width / camera.z / 2 - 240 &&
          s.x < camera.x + size.width / camera.z / 2 + 240 &&
          s.y > camera.y - size.height / camera.z / 2 - 240 &&
          s.y < camera.y + size.height / camera.z / 2 + 240;
        if (!visible) return null;
        const labels = true;
        return (
          <g
            key={s.id}
            transform={`translate(${s.x} ${s.y})`}
            opacity={emphasized(s.id) || active ? 1 : 0.2}
            className={`system ${active ? "selected" : ""}`}
            role="button"
            tabIndex={0}
            aria-label={`${s.name}, ${s.owner === 0 ? "owned" : s.owner === null ? "neutral" : "rival"} system`}
            data-system={s.id}
            onClick={(e) => {
              e.stopPropagation();
              if (!drag.current.moved) onSelect(s.id);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(s.id);
              }
            }}
            onPointerEnter={() => {
              setHoverAsteroid(false);
              if (!drag.current.active) setHover(s.id);
            }}
            onPointerLeave={() => setHover(null)}
          >
            <circle r={r + 15} fill="transparent" />
            {(active || hovered || s.id === 0) && (
              <circle r={r * 2.5} fill="url(#sunGlow)" />
            )}
            {active && (
              <>
                <circle
                  r={r + 13}
                  className="selection-ring"
                  fill="none"
                  stroke="#bcdce2"
                  strokeWidth="1"
                  strokeDasharray="28 7"
                />
                <circle
                  r={r + 18}
                  fill="none"
                  stroke="#87c9d4"
                  strokeOpacity=".16"
                  strokeWidth="1"
                />
                <path
                  d={`M-${r + 24} 0h5M${r + 19} 0h5M0 -${r + 24}v5M0 ${r + 19}v5`}
                  stroke="#c6e5e8"
                />
              </>
            )}
            {state.time - s.capturedAt < 4 && (
              <circle
                r={r + 25 + (state.time - s.capturedAt) * 18}
                fill="none"
                stroke="#b5ded7"
                strokeWidth="2"
                opacity={Math.max(0, 1 - (state.time - s.capturedAt) / 4)}
              />
            )}
            <circle
              r={r + 3}
              fill="none"
              stroke={color(s.owner)}
              strokeWidth={s.capital ? 1.4 : 1}
              strokeOpacity=".7"
            />

            <image
              href={asset(`original/sun-type-${s.star}.webp`)}
              x={-r * 1.85}
              y={-r * 1.85}
              width={r * 3.7}
              height={r * 3.7}
              className={`star-art star-type-${s.star}`}
            />
            {s.star === 6 && (
              <image
                href={asset("original/sun-type-3.webp")}
                x={17}
                y={-46}
                width={48}
                height={48}
                className="star-art star-type-3"
              />
            )}

            {s.capital && (
              <path
                d={`M-4 -${r + 10}l4-4 4 4-4 4z`}
                fill={s.owner === 0 ? "#e0c08c" : color(s.owner)}
              />
            )}
            {
              <g className="system-interior">
                {mapLayout.planets[s.id].map((planet, i) => {
                  const { orbit, x: px, y: py } = planet;
                  const diameter = Math.max(planet.diameter, 9 / camera.z);
                  return (
                    <g key={i} className="orbital-planet">
                      <ellipse
                        rx={orbit}
                        ry={orbit * 0.85}
                        fill="none"
                        stroke={color(s.owner)}
                        strokeOpacity={active || hovered ? ".18" : ".055"}
                        strokeWidth=".7"
                      />
                      <image
                        href={asset(planets[planet.kind])}
                        x={px - diameter / 2}
                        y={py - diameter / 2}
                        width={diameter}
                        height={diameter}
                        className="planet-texture"
                      />
                    </g>
                  );
                })}
              </g>
            }
            {s.strategic && (
              <image
                href={asset(`original/objective-${s.strategic}.svg`)}
                x="-48"
                y="-42"
                width="24"
                height="24"
              />
            )}
            {labels && (
              <>
                <text
                  y={r + 35}
                  textAnchor="middle"
                  className={`system-label ${s.owner === 0 ? "owned-label" : ""}`}
                  style={{
                    fontSize:
                      detail === "far"
                        ? 9 / camera.z
                        : detail === "medium"
                          ? 10 / camera.z
                          : 13,
                  }}
                >
                  {s.name}
                </text>
                {(active || s.id === 0 || detail === "close") && (
                  <text
                    y={r + 51}
                    textAnchor="middle"
                    className="system-subtitle"
                    fill={color(s.owner)}
                  >
                    {s.id === 0
                      ? "HOMEWORLD"
                      : s.owner === 0
                        ? "VALE EXPANSE"
                        : s.owner === null
                          ? "UNCLAIMED"
                          : state.commanders[s.owner].name.toUpperCase()}
                  </text>
                )}
              </>
            )}
          </g>
        );
      }),
    [
      state.seed,
      owners,
      selected,
      hover,
      filter,
      fleetSystems,
      captureClock,
      camera,
      size,
      detail,
      onSelect,
      mapLayout,
    ],
  );

  return (
    <div
      ref={container}
      className={`galaxy-stage ${paused ? "is-paused" : ""}`}
    >
      <div className="map-atmosphere" />
      <svg
        ref={svg}
        className="galaxy-svg"
        role="application"
        aria-label="Interactive galaxy map. Drag to pan, scroll to zoom. Use Home to focus your homeworld."
        viewBox={`0 0 ${size.width} ${size.height}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "Home") {
            aim({ ...state.systems[0], z: 0.65 });
            e.preventDefault();
          }
          if (
            ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
          ) {
            const c = target.current;
            aim({
              ...c,
              x:
                c.x +
                (e.key === "ArrowLeft"
                  ? -100
                  : e.key === "ArrowRight"
                    ? 100
                    : 0) /
                  c.z,
              y:
                c.y +
                (e.key === "ArrowUp" ? -100 : e.key === "ArrowDown" ? 100 : 0) /
                  c.z,
            });
            e.preventDefault();
          }
          if (e.key === "+" || e.key === "=") zoom(1.25);
          if (e.key === "-") zoom(0.8);
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          drag.current = {
            active: true,
            moved: false,
            x: e.clientX,
            y: e.clientY,
          };
        }}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          if (!drag.current.active && hover !== null)
            setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          if (!drag.current.active) return;
          const dx = e.clientX - drag.current.x,
            dy = e.clientY - drag.current.y;
          if (Math.abs(dx) + Math.abs(dy) > 3) drag.current.moved = true;
          if (drag.current.moved) {
            svg.current?.setPointerCapture(e.pointerId);
            cancelAnimationFrame(frame.current);
            const c = cameraRef.current;
            const next = {
              ...c,
              x: Math.max(-150, Math.min(WORLD.width + 150, c.x - dx / c.z)),
              y: Math.max(-150, Math.min(WORLD.height + 150, c.y - dy / c.z)),
            };
            target.current = next;
            paintCamera(next);
            setHover(null);
            drag.current.x = e.clientX;
            drag.current.y = e.clientY;
          }
        }}
        onPointerUp={(e) => {
          drag.current.active = false;
          if (drag.current.moved) paintCamera(cameraRef.current, true);
          if (svg.current?.hasPointerCapture(e.pointerId))
            svg.current.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => {
          drag.current.active = false;
        }}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          {ASTEROID_ART.map((art, i) => (
            <radialGradient key={i} id={`mineralDust-${i}`}>
              <stop stopColor={art.color} stopOpacity=".12" />
              <stop offset=".5" stopColor={art.color} stopOpacity=".05" />
              <stop offset="1" stopColor={art.color} stopOpacity="0" />
            </radialGradient>
          ))}
          <radialGradient id="nebulaBlue">
            <stop stopColor="#315c6d" stopOpacity=".2" />
            <stop offset="1" stopColor="#152b39" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="nebulaRust">
            <stop stopColor="#674838" stopOpacity=".16" />
            <stop offset="1" stopColor="#674838" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="sunGlow">
            <stop stopColor="#a0dfef" stopOpacity=".3" />
            <stop offset="1" stopColor="#63abc6" stopOpacity="0" />
          </radialGradient>
          <pattern
            id="map-grid"
            width="240"
            height="240"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M240 0H0V240"
              fill="none"
              stroke="#7896a0"
              strokeOpacity=".04"
              strokeWidth="1"
            />
            <path
              d="M0 6V0H6"
              fill="none"
              stroke="#7a9aac"
              strokeOpacity=".2"
              strokeWidth="1"
            />
          </pattern>
          <pattern
            id="contested"
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(30)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="10"
              stroke="#d2b079"
              strokeOpacity=".045"
              strokeWidth="3"
            />
          </pattern>
          <marker
            id="route-arrow"
            markerWidth="7"
            markerHeight="7"
            refX="5"
            refY="3.5"
            orient="auto"
          >
            <path
              d="m0 0 6 3.5L0 7"
              fill="none"
              stroke="#b4e5e9"
              strokeWidth="1"
            />
          </marker>
        </defs>
        <g ref={worldLayer} transform={transformFor(cameraRef.current)}>
          <rect
            x="-1000"
            y="-1000"
            width="5200"
            height="4300"
            fill="url(#map-grid)"
          />
          <ellipse
            cx="1450"
            cy="1150"
            rx="1300"
            ry="440"
            fill="url(#nebulaBlue)"
            transform="rotate(-25 1450 1150)"
          />
          <ellipse
            cx="2200"
            cy="720"
            rx="800"
            ry="650"
            fill="url(#nebulaRust)"
          />
          {starfield}
          <text className="space-region" x="2100" y="350">
            THE CINDER REACH
          </text>
          <text className="space-region" x="650" y="1710">
            VEIL OF PERSEUS
          </text>
          <text className="space-region" x="2350" y="1680">
            OUTER FRONTIER
          </text>
          <g className="territories">
            {territories.map((t) => (
              <g key={t.owner} data-territory={t.owner}>
                <path
                  d={t.path}
                  fill={color(t.owner)}
                  fillOpacity={
                    t.owner === 0 ? 0.065 : detail === "far" ? 0.08 : 0.035
                  }
                  stroke={color(t.owner)}
                  strokeWidth={t.owner === 0 ? 1.8 : 1.1}
                  strokeOpacity={t.owner === 0 ? 0.75 : 0.36}
                  strokeLinejoin="round"
                />
                {t.owner === 0 && (
                  <path
                    d={t.path}
                    fill="url(#contested)"
                    stroke={color(0)}
                    strokeWidth="7"
                    strokeOpacity=".045"
                  />
                )}
                {detail === "far" && (
                  <text
                    x={t.center.x}
                    y={t.center.y - 32}
                    fill={color(t.owner)}
                    className="empire-label"
                    style={{
                      fontSize: Math.min(34, 9 / camera.z),
                      letterSpacing: 1.5,
                    }}
                    textAnchor="middle"
                  >
                    {t.owner === 0
                      ? "VALE EXPANSE"
                      : state.commanders[t.owner].name.toUpperCase()}
                  </text>
                )}
              </g>
            ))}
          </g>
          <g className="travel-lanes">
            {state.lanes.map((l) => (
              <line
                key={`${l.a}-${l.b}`}
                x1={state.systems[l.a].x}
                y1={state.systems[l.a].y}
                x2={state.systems[l.b].x}
                y2={state.systems[l.b].y}
                stroke={
                  l.a === selected || l.b === selected ? "#95c4d0" : "#8293a1"
                }
                strokeWidth={l.a === selected || l.b === selected ? 1.3 : 0.8}
                strokeOpacity={
                  l.a === selected || l.b === selected ? 0.4 : 0.16
                }
              />
            ))}
          </g>
          {selectedRoutes.map((f) => (
            <polyline
              key={f.id}
              points={f.route
                .map((id) => `${state.systems[id].x},${state.systems[id].y}`)
                .join(" ")}
              className="fleet-route"
              fill="none"
              stroke={f.mission === "attack" ? "#d7a677" : "#8bcbd4"}
              strokeWidth={f.id === selectedFleet ? 2.3 : 1.2}
              strokeOpacity={f.id === selectedFleet ? 0.8 : 0.45}
              strokeDasharray="5 7"
              markerEnd="url(#route-arrow)"
            />
          ))}
          {preview.length > 1 && (
            <polyline
              points={preview
                .map((id) => `${state.systems[id].x},${state.systems[id].y}`)
                .join(" ")}
              className="route-preview"
              fill="none"
              stroke="#e2c38a"
              strokeWidth="2"
              strokeDasharray="3 6"
              markerEnd="url(#route-arrow)"
            />
          )}
          {systemNodes}
          {detail === "close" &&
            state.systems
              .filter((s) => visible.has(s.id) || state.devReveal)
              .flatMap((s) =>
                s.installations.map((d) => {
                  const p = mapLayout.planets[s.id][d.planet];
                  if (!p) return null;
                  return (
                    <g
                      key={`${s.id}-${d.planet}-${d.kind}`}
                      className="defense-map-marker"
                      pointerEvents="none"
                      transform={`translate(${s.x + p.x} ${s.y + p.y + (d.kind === "station" ? 25 : 38)})`}
                    >
                      <text
                        textAnchor="middle"
                        fontSize="10"
                        fill={
                          state.battles.some((b) => b.system === s.id)
                            ? "#ffa47f"
                            : d.hp > 0
                              ? "#9fd8d0"
                              : "#8d8c90"
                        }
                      >
                        {d.kind === "station" ? "◆" : "⌖"}{" "}
                        {d.job
                          ? "BUILD"
                          : d.hp <= 0
                            ? "RUINS"
                            : ["", "I", "II", "III"][d.level]}
                      </text>
                    </g>
                  );
                }),
              )}
          <g className="asteroid-fields">
            {mapLayout.fields.map((field) => {
              const s = state.systems[field.system];
              const active = selectedAsteroid && selected === s.id;
              const hovered = hoverAsteroid && hover === s.id;
              if (
                Math.abs(field.x - camera.x) >
                  size.width / camera.z / 2 + 140 ||
                Math.abs(field.y - camera.y) > size.height / camera.z / 2 + 140
              )
                return null;
              const art = field.appearance;
              const diameter = Math.max(art.size, 18 / camera.z);
              const angle = (art.angle * Math.PI) / 180;
              const extent =
                ((Math.abs(Math.cos(angle)) + Math.abs(Math.sin(angle))) *
                  diameter) /
                2;
              const halfWidth = art.drift ? Math.max(84, extent) : extent;
              const halfHeight = art.drift ? Math.max(56, extent) : extent;
              return (
                <g key={s.id} opacity={emphasized(s.id) || active ? 1 : 0.2}>
                  {(active || hovered) && (
                    <line
                      x1={s.x}
                      y1={s.y}
                      x2={field.x}
                      y2={field.y}
                      stroke="#d4bd86"
                      strokeOpacity=".4"
                      strokeDasharray="4 8"
                      pointerEvents="none"
                    />
                  )}
                  <g
                    transform={`translate(${field.x} ${field.y})`}
                    className={`asteroid-field ${art.drift ? "debris-drift" : "single-asteroid"} ${active ? "selected" : ""}`}
                    data-asteroid-system={s.id}
                    data-art-variant={art.variant}
                    style={{ color: art.color }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${s.name} asteroid field`}
                    aria-pressed={active}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!drag.current.moved) onSelect(s.id, true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        onSelect(s.id, true);
                      }
                    }}
                    onPointerEnter={() => {
                      if (!drag.current.active) {
                        setHover(s.id);
                        setHoverAsteroid(true);
                      }
                    }}
                    onPointerLeave={() => setHover(null)}
                  >
                    <rect
                      className="field-hit-area"
                      x={-halfWidth - 8}
                      y={-halfHeight - 8}
                      width={halfWidth * 2 + 16}
                      height={halfHeight * 2 + 42}
                      rx="12"
                      fill="transparent"
                      pointerEvents="all"
                    />
                    {art.drift && detail !== "far" && (
                      <g className="mineral-dust" pointerEvents="none">
                        <ellipse
                          rx="82"
                          ry="47"
                          fill={`url(#mineralDust-${art.variant})`}
                          transform={`rotate(${art.angle / 3})`}
                        />
                        <ellipse
                          cx="26"
                          cy="12"
                          rx="58"
                          ry="28"
                          fill={`url(#mineralDust-${art.variant})`}
                          opacity=".55"
                        />
                        {art.fragments.map((fragment, i) => (
                          <path
                            key={i}
                            d={`M${fragment.x} ${fragment.y - fragment.size}l${fragment.size} ${fragment.size * 0.6} ${-fragment.size * 0.3} ${fragment.size} ${-fragment.size * 1.4} ${-fragment.size * 0.25}Z`}
                            fill={i % 3 === 0 ? art.color : "#9babb6"}
                            opacity={fragment.opacity}
                          />
                        ))}
                      </g>
                    )}
                    <image
                      className="resource-asteroid-art"
                      href={asset(art.art)}
                      x={-diameter / 2}
                      y={-diameter / 2}
                      width={diameter}
                      height={diameter}
                      transform={`rotate(${art.angle})`}
                      pointerEvents="none"
                    />
                    {(active || hovered) && (
                      <circle
                        className="resource-selection"
                        r={diameter * 0.63}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeDasharray="9 6"
                        pointerEvents="none"
                      />
                    )}
                    {(detail !== "far" || active || hovered) && (
                      <>
                        <text
                          y={halfHeight + 14}
                          textAnchor="middle"
                          className="field-name"
                          pointerEvents="none"
                        >
                          {s.name} {art.suffix}
                        </text>
                        <text
                          y={halfHeight + 26}
                          textAnchor="middle"
                          className="asteroid-label"
                          pointerEvents="none"
                        >
                          {art.material.toUpperCase()} · MINEABLE
                        </text>
                      </>
                    )}
                  </g>
                </g>
              );
            })}
          </g>
          {state.battles.map((b) => (
            <g
              key={b.id}
              transform={`translate(${state.systems[b.system].x} ${state.systems[b.system].y})`}
              className="map-battle"
              onClick={() => onSelect(b.system)}
            >
              <circle
                r="52"
                fill="none"
                stroke="#e6a179"
                strokeDasharray="6 7"
              />
              {detail !== "far" &&
                b.owners.flatMap((owner, side) =>
                  state.fleets
                    .filter(
                      (f) =>
                        f.system === b.system &&
                        f.owner === owner &&
                        !moving(f),
                    )
                    .flatMap((f) => f.units)
                    .slice(0, 3)
                    .map((u, i) => (
                      <image
                        key={`${side}-${i}`}
                        href={asset(ships[shipClasses[u.kind]].art)}
                        x={side === 0 ? -47 : 23}
                        y={-28 + i * 20}
                        width="22"
                        height="29"
                        transform={side === 0 ? "rotate(22)" : "rotate(-22)"}
                      />
                    )),
                )}
              <path
                d="M-35 -16 32 20M-24 24 29-28"
                stroke="#f1bc80"
                strokeWidth="2"
              />
              <text y="-60" textAnchor="middle">
                BATTLE · {b.casualties.reduce((a, c) => a + c, 0)} LOST
              </text>
            </g>
          ))}
          {state.systems
            .filter((x) => x.capture)
            .map((x) => (
              <g key={x.id} transform={`translate(${x.x} ${x.y})`}>
                <circle
                  r="47"
                  fill="none"
                  stroke="#acdade"
                  strokeWidth="3"
                  strokeDasharray={`${(x.capture!.elapsed / BALANCE.captureSeconds) * 295} 295`}
                  transform="rotate(-90)"
                />
              </g>
            ))}
          {state.fleets.map((f) => {
            if (
              f.owner !== 0 &&
              !visible.has(f.system) &&
              !state.devReveal &&
              !f.neutral
            )
              return null;
            const p = fleetPosition(state, f),
              selectedF = f.id === selectedFleet,
              isMoving = moving(f),
              offset = isMoving
                ? 0
                : 48 +
                  state.fleets.filter(
                    (x) => x.system === f.system && !moving(x) && x.id < f.id,
                  ).length *
                    25;
            return (
              <g
                key={f.id}
                role="button"
                tabIndex={0}
                aria-label={`${f.name} fleet`}
                className={`fleet-marker ${selectedF ? "active" : ""}`}
                style={{
                  transform: `translate(${p.x + offset}px, ${p.y - (!isMoving ? 30 : 0)}px)`,
                  transition: paused ? "none" : "transform 210ms linear",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!drag.current.moved) onFleet(f.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onFleet(f.id);
                }}
              >
                <circle r="16" fill="transparent" />
                {f.neutral && (
                  <image
                    href={asset(
                      f.neutral === "pirates"
                        ? "war2_pirate_ragtooth.webp"
                        : `original/${f.neutral}.svg`,
                    )}
                    x="-26"
                    y="-26"
                    width="52"
                    height="52"
                  />
                )}
                {selectedF && (
                  <circle
                    r="16"
                    fill="#0b1820"
                    stroke="#a5d9e1"
                    strokeOpacity=".8"
                    strokeWidth="1"
                  />
                )}
                {isMoving && (
                  <path
                    d={`M-5 0h-22`}
                    stroke={color(f.owner)}
                    strokeWidth="2"
                    opacity=".3"
                    transform={`rotate(${p.angle})`}
                  />
                )}
                <path
                  d="m-5-5 13 5-13 5 3-5z"
                  fill={color(f.owner)}
                  stroke="#08111b"
                  strokeWidth="1"
                  transform={`rotate(${isMoving ? p.angle : -45})`}
                />
                {f.status === "Mining" && (
                  <circle
                    r="13"
                    fill="none"
                    stroke="#d1b878"
                    strokeWidth="1.6"
                    strokeDasharray={`${(f.miningElapsed / BALANCE.miningSeconds) * 81} 81`}
                    transform="rotate(-90)"
                  />
                )}
                {selectedF && (
                  <text x="19" y="-10" className="fleet-label">
                    {f.name}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      <div className="map-coordinate">
        <span>ORION EXPANSE</span>
        <i /> SECTOR 07{" "}
        <span className="coordinate-value">
          {Math.round(camera.x)} : {Math.round(camera.y)}
        </span>
      </div>
      <div className="map-legend">
        <span>
          <i className="legend-dot owned" />
          Your territory
        </span>
        <span>
          <i className="legend-dot rival" />
          Rival empire
        </span>
        <span>
          <i className="legend-dot neutral" />
          Neutral frontier
        </span>
      </div>
      <div className="map-tools">
        <button aria-label="Zoom in" title="Zoom in" onClick={() => zoom(1.3)}>
          <Plus size={16} />
        </button>
        <span>{Math.round(camera.z * 100)}%</span>
        <button
          aria-label="Zoom out"
          title="Zoom out"
          onClick={() => zoom(1 / 1.3)}
        >
          <Minus size={16} />
        </button>
        <div />
        <button
          aria-label="Focus homeworld"
          title="Homeworld · Home"
          onClick={() => aim({ ...state.systems[0], z: 0.82 })}
        >
          <Crosshair size={17} />
        </button>
        <button
          aria-label="View entire galaxy"
          title="Entire galaxy"
          onClick={() =>
            aim({
              x: 1600,
              y: 1150,
              z: Math.min(size.width / 3400, size.height / 2450),
            })
          }
        >
          <Maximize2 size={16} />
        </button>
      </div>
      <div className="map-help">
        <Navigation size={11} /> DRAG TO EXPLORE <span>·</span> SCROLL TO ZOOM
      </div>
      <div className="minimap">
        <div>
          <ScanLine size={12} />
          <span>GALAXY OVERVIEW</span>
          <small>{state.systems.length} SYSTEMS</small>
        </div>
        <svg
          viewBox={`0 0 ${WORLD.width} ${WORLD.height}`}
          aria-label="Galaxy minimap"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter") aim({ x: 1600, y: 1150, z: 0.3 });
          }}
          onClick={(e) => {
            const matrix = e.currentTarget.getScreenCTM();
            if (matrix) {
              const point = new DOMPoint(e.clientX, e.clientY).matrixTransform(
                matrix.inverse(),
              );
              aim({ x: point.x, y: point.y, z: camera.z });
            }
          }}
        >
          {territories.map((t) => (
            <path
              key={t.owner}
              d={t.path}
              fill={color(t.owner)}
              fillOpacity={t.owner === 0 ? 0.55 : 0.22}
            />
          ))}
          {state.systems
            .filter((s) => s.capital)
            .map((s) => (
              <circle
                key={s.id}
                cx={s.x}
                cy={s.y}
                r="10"
                fill={color(s.owner)}
              />
            ))}
          <rect
            x={camera.x - size.width / camera.z / 2}
            y={camera.y - size.height / camera.z / 2}
            width={size.width / camera.z}
            height={size.height / camera.z}
            fill="#93c6d6"
            fillOpacity=".035"
            stroke="#b3d9e3"
            strokeWidth="9"
          />
        </svg>
      </div>
      {hover !== null && !drag.current.active && (
        <div
          className="map-tooltip"
          style={{
            left: Math.min(size.width - 215, Math.max(8, mouse.x + 20)),
            top: Math.min(size.height - 95, Math.max(8, mouse.y + 15)),
          }}
        >
          <Orbit size={16} />
          <div>
            <strong>
              {hoverAsteroid
                ? asteroidSiteName(state.seed, hover, state.systems[hover].name)
                : state.systems[hover].name}
            </strong>
            <span>
              {state.systems[hover].owner === null
                ? "Neutral frontier"
                : state.commanders[state.systems[hover].owner!].name}
            </span>
            <small>
              {hoverAsteroid
                ? "Click the field to send a mining fleet"
                : "Click to inspect system"}
            </small>
          </div>
        </div>
      )}
      <span className="sr-only">Selected system: {selectedSystem.name}</span>
    </div>
  );
}
