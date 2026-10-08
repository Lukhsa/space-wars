import { shipArtwork } from "./demo/catalog";
import { MiningPanel } from "./components/MiningPanel";
import { ownedYards, planetName } from "./demo/planets";
import { orderFleets } from "./demo/commands";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  ChevronRight,
  CircleDot,
  CircleHelp,
  Coins,
  Crosshair,
  Flag,
  FlaskConical,
  Fuel,
  Globe2,
  Hammer,
  Layers,
  Map,
  Navigation,
  Orbit,
  Pause,
  Play,
  Radar,
  Radio,
  RefreshCw,
  Rocket,
  Search,
  Shield,
  Sparkles,
  Swords,
  Timer,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BALANCE, STAR_NAMES } from "./demo/balance";
import {
  strengthEstimate,
  syncPlayer,
  incomePerMinute,
  miningYield,
} from "./demo/model";
import { routeFor, fuelCost } from "./demo/commands";
import {
  MatchHUD,
  SystemDetails,
  FleetOrders,
  BattleTray,
  CommandFeed,
  FleetFormation,
  DevExtras,
  MatchResult,
  ShipQuantity,
  shipRole,
} from "./components/QuickConquest";
import GalaxyMap from "./components/GalaxyMap";
import { PlanetaryDefenses } from "./components/PlanetaryDefenses";
import { asteroidAppearance, asteroidSiteName } from "./demo/asteroid-art";
import {
  asset,
  civilizations,
  planets,
  shipClasses,
  ships,
} from "./demo/catalog";
import { generateGalaxy } from "./demo/galaxy";
import {
  advanceDemo,
  buildShip,
  fleetPosition,
  launchFleet,
  MINING_SECONDS,
  moving,
  reinforceFleet,
  travelTime,
} from "./demo/simulation";
import type {
  DemoState,
  Filter,
  LogEvent,
  Mission,
  Point,
  ShipClass,
} from "./demo/types";

const format = (n: number) => Math.floor(n).toLocaleString("en-US");
const time = (n: number) => {
  const seconds = Math.ceil(Math.max(0, n));
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
};
const eventIcons: Record<LogEvent["kind"], LucideIcon> = {
  fleet: Navigation,
  mining: Boxes,
  battle: Swords,
  build: Hammer,
  world: Globe2,
  scout: Radar,
};
function HumanEmblem({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m24 5 16 32-16-8-16 8z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M24 15v26M14 31h20M9 13l-5 8v12l7 10m28-30 5 8v12l-7 10"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}
function FactionEmblem({
  civilization,
  className = "",
}: {
  civilization: number;
  className?: string;
}) {
  const c = civilizations[civilization];
  return c.emblem ? (
    <img className={className} src={asset(c.emblem)} alt={`${c.name} emblem`} />
  ) : (
    <HumanEmblem className={className} />
  );
}
function Progress({ value, tone = "" }: { value: number; tone?: string }) {
  return (
    <div className={`progress ${tone}`}>
      <i style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }} />
    </div>
  );
}
function Modal({
  title,
  eyebrow,
  onClose,
  children,
}: {
  title: string;
  eyebrow: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const el = dialog.current;
    el?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && el) {
        const items = Array.from(
          el.querySelectorAll<HTMLElement>(
            'button:not(:disabled), select, input, [tabindex="0"]',
          ),
        );
        const first = items[0],
          last = items.at(-1);
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === el)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={dialog}
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">{eyebrow}</span>
            <h2>{title}</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function App({
  initialState,
}: { initialState?: DemoState } = {}) {
  const [state, setState] = useState(
    () => initialState ?? generateGalaxy("ORION-7742"),
  );
  const [selectionKind, setSelectionKind] = useState<
      "planet" | "fleet" | "deposit" | "miner"
    >("planet"),
    [selectedMiner, setSelectedMiner] = useState<number | null>(null);
  const [selectedPlanet, setSelectedPlanet] = useState(0),
    [selectedDeposit, setSelectedDeposit] = useState<number | null>(null),
    [selectedFleetIds, setSelectedFleetIds] = useState<number[]>([]),
    [yardKey, setYardKey] = useState("0:0");
  const yards = ownedYards(state, 0);
  const yard =
    yards.find((y) => y.system.id + ":" + y.planet.id === yardKey) ?? yards[0];
  const [repeatMining, setRepeatMining] = useState(false);
  const [selected, setSelected] = useState(0),
    [asteroid, setAsteroid] = useState(false),
    [selectedFleet, setSelectedFleet] = useState<number | null>(
      state.fleets[0].id,
    );
  const [filter, setFilter] = useState<Filter>("All"),
    [focus, setFocus] = useState<{
      id: number;
      nonce: number;
      point?: Point;
      asteroid?: boolean;
    }>({
      id: 0,
      nonce: 0,
    });
  const [paused, setPaused] = useState(false),
    [speed, setSpeed] = useState(1),
    [dev, setDev] = useState(false),
    [seedInput, setSeedInput] = useState(state.seed);
  const [order, setOrder] = useState<{
      target: number;
      mission: Mission;
      planet: number;
      fleet: number;
    } | null>(null),
    [overlay, setOverlay] = useState<
      "build" | "intel" | "fleets" | "help" | null
    >(null);
  const [toast, setToast] = useState<string | null>(null),
    [eventFilter, setEventFilter] = useState<"all" | "mine">("all"),
    [search, setSearch] = useState("");
  const [matchDuration, setMatchDuration] = useState<number>(BALANCE.duration),
    [allBots, setAllBots] = useState(false),
    [quantity, setQuantity] = useState(1);
  const [reportId, setReportId] = useState<number | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(
    () => window.innerWidth > 900,
  );
  const [operationsOpen, setOperationsOpen] = useState(
    () => window.innerWidth > 1100,
  );
  const [activityOpen, setActivityOpen] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const fleetSection = useRef<HTMLDivElement>(null),
    productionSection = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (paused) return;
    let last = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now(),
        dt = Math.min(0.5, (now - last) / 1000) * speed;
      last = now;
      if (!document.hidden) setState((s) => advanceDemo(s, dt));
    }, 200);
    return () => clearInterval(interval);
  }, [paused, speed]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  const latestAlert = state.events.find((e) => e.priority);
  useEffect(() => {
    if (latestAlert) setToast(latestAlert.title + " — " + latestAlert.detail);
  }, [latestAlert?.id]);
  const s = state.systems[selected],
    world = s.planets[selectedPlanet] ?? s.planets[0],
    owner = world.owner === null ? null : state.commanders[world.owner],
    civ = owner ? civilizations[owner.civilization] : null;
  const own = world.owner === 0,
    neutral = world.owner === null,
    relation = own
      ? "YOUR TERRITORY"
      : neutral
        ? "NEUTRAL FRONTIER"
        : "RIVAL TERRITORY";
  const playerFleets = state.fleets.filter((f) => f.owner === 0),
    available = playerFleets.filter(
      (f) => !moving(f) && f.status !== "Battle" && f.retreatAt === null,
    );
  const currentFleet = state.fleets.find((f) => f.id === selectedFleet);
  const selectedOrderFleet = order
    ? state.fleets.find((f) => f.id === order.fleet)
    : undefined;
  const preview =
    order && selectedOrderFleet
      ? routeFor(state, selectedOrderFleet, order.target)
      : [];
  const ownedCount = state.systems.filter((s) => s.owner === 0).length;
  const inspect = useCallback((id: number, belt = false) => {
    setSelectionKind(belt ? "deposit" : "planet");
    setSelectedMiner(null);
    setSelected(id);
    setSelectedPlanet(0);
    setSelectedDeposit(null);
    setAsteroid(belt);
    setInspectorOpen(true);
  }, []);
  const focusOn = (id: number, belt = false) => {
    inspect(id, belt);
    setFocus((f) => ({ id, nonce: f.nonce + 1, asteroid: belt }));
  };
  const selectFleet = (id: number, additive = false) => {
    const fleet = state.fleets.find((f) => f.id === id)!;
    setSelectedFleet(id);
    if (fleet.owner === 0)
      setSelectedFleetIds((ids) =>
        additive
          ? ids.includes(id)
            ? ids.filter((x) => x !== id)
            : [...ids, id]
          : [id],
      );
    else setSelectedFleetIds([]);
    inspect(moving(fleet) ? fleet.route.at(-1)! : fleet.system);
    setSelectionKind("fleet");
    setFocus((f) => ({
      id: fleet.system,
      nonce: f.nonce + 1,
      point: fleetPosition(state, fleet),
    }));
  };
  const openOrder = (mission: Mission) => {
    setRepeatMining(false);
    const preferred =
      available.find((f) => f.id === selectedFleet) ?? available[0];
    if (!preferred) {
      setToast(
        "Your fleets are underway. Wait for an arrival to issue another order.",
      );
      return;
    }
    setOrder({
      target: selected,
      planet: selectedPlanet,
      mission,
      fleet: preferred.id,
    });
  };
  const mutate = (
    fn: (draft: DemoState) => string | null,
    success?: string,
  ) => {
    const draft = structuredClone(stateRef.current),
      error = fn(draft);
    if (error) {
      setToast(error);
      return false;
    }
    syncPlayer(draft);
    stateRef.current = draft;
    setState(draft);
    if (success) setToast(success);
    return true;
  };
  const selectPlanet = (system: number, planet: number) => {
    if (
      selectedFleetIds.length &&
      mutate(
        (d) => orderFleets(d, 0, selectedFleetIds, system, planet),
        "Fleet orders confirmed.",
      )
    )
      setSelectedFleetIds([]);
    inspect(system);
    setSelectedPlanet(planet);
  };
  useEffect(() => {
    const clear = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedFleetIds([]);
    };
    window.addEventListener("keydown", clear);
    return () => window.removeEventListener("keydown", clear);
  }, []);
  const reset = (seed: string) => {
    setSelectionKind("planet");
    setSelectedMiner(null);
    setSelectedPlanet(0);
    setSelectedFleetIds([]);
    setSelectedDeposit(null);
    setYardKey("0:0");
    const next = generateGalaxy(
      seed.trim() || "ORION-7742",
      matchDuration,
      allBots,
    );
    setState(next);
    stateRef.current = next;
    setSeedInput(next.seed);
    setSelected(0);
    setSelectedFleet(next.fleets[0].id);
    setAsteroid(false);
    setOrder(null);
    setOverlay(null);
    setReportId(null);
    setFilter("All");
    setSearch("");
    setFocus((f) => ({ id: 0, nonce: f.nonce + 1 }));
    setToast("A fresh frontier awaits.");
  };
  const commission = (kind: ShipClass) =>
    mutate(
      (d) => buildShip(d, kind, 0, quantity, yard.system.id, yard.planet.id),
      `${kind} added to the shipyard.`,
    );
  const results = search.trim()
    ? state.systems
        .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
        .slice(0, 7)
    : [];
  const events = state.events.filter((e) => eventFilter === "all" || e.player);
  const activeReport =
    reportId === null ? null : state.reports.find((r) => r.id === reportId);
  return (
    <div
      className={`app-shell ${inspectorOpen ? "inspector-open" : ""} ${operationsOpen ? "operations-open" : ""}`}
    >
      <header className="topbar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            focusOn(0);
          }}
          aria-label="Space Wars home"
        >
          <HumanEmblem />
          <div>
            SPACE<span>WARS</span>
            <small>QUICK CONQUEST</small>
          </div>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <button
            className={!overlay ? "active" : ""}
            onClick={() => {
              setOverlay(null);
            }}
          >
            <Globe2 size={15} />
            GALAXY
          </button>
          <button
            className={overlay === "fleets" ? "active" : ""}
            onClick={() => setOverlay("fleets")}
          >
            <Navigation size={15} />
            FLEETS
          </button>
          <button
            className={overlay === "intel" ? "active" : ""}
            onClick={() => setOverlay("intel")}
          >
            <Radar size={15} />
            INTELLIGENCE
          </button>
        </nav>
        <div className="resources">
          <div>
            <Coins className="gold" size={18} />
            <span>
              <small>CREDITS</small>
              <strong data-testid="credits">
                {format(state.resources.credits)}
              </strong>
            </span>
            <em>+{format(incomePerMinute(state, 0).credits)}/m</em>
          </div>
          <div>
            <Boxes className="blue" size={18} />
            <span>
              <small>ALLOY</small>
              <strong data-testid="alloy">
                {format(state.resources.alloy)}
              </strong>
            </span>
          </div>
          <div>
            <Fuel className="green" size={17} />
            <span>
              <small>FUEL</small>
              <strong>{format(state.resources.fuel)}</strong>
            </span>
          </div>
          <div className="power-resource">
            <Shield size={18} />
            <span>
              <small>FLEET POWER</small>
              <strong>
                {format(playerFleets.reduce((sum, f) => sum + f.power, 0))}
              </strong>
            </span>
          </div>
        </div>
        <div className="profile">
          <HumanEmblem />
          <span>
            Cmdr. Vale
            <small>
              {state.commanders[0].bot ? "AI OBSERVER MODE" : "HUMAN COMMANDER"}
            </small>
          </span>
        </div>
      </header>
      <div className="command-strip">
        <div>
          <span className="live-dot" /> ORION EXPANSE{" "}
          <span className="slash">/</span>
          <span>GALACTIC COMMAND</span>
          <span className="prototype-tag">LOCAL PROTOTYPE</span>
        </div>
        <div>
          <span>{ownedCount} systems controlled</span>
          <i />
          <span>8 commanders · FFA</span>
          <button
            className="icon-button"
            title="Help and controls"
            aria-label="Help and controls"
            onClick={() => setOverlay("help")}
          >
            <CircleHelp size={16} />
          </button>
          <button
            className={`dev-toggle ${dev ? "active" : ""}`}
            onClick={() => setDev(!dev)}
          >
            <FlaskConical size={12} />
            DEV
          </button>
        </div>
      </div>
      <main className="dashboard">
        <div className="panel-switches" aria-label="Map panels">
          <button
            aria-expanded={inspectorOpen}
            aria-controls="system-panel"
            onClick={() => setInspectorOpen(!inspectorOpen)}
          >
            <Crosshair size={14} /> System
          </button>
          <button
            aria-expanded={operationsOpen}
            aria-controls="operations-panel"
            onClick={() => setOperationsOpen(!operationsOpen)}
          >
            <Navigation size={14} /> Command
          </button>
          <button
            aria-expanded={activityOpen}
            aria-controls="activity-panel"
            onClick={() => setActivityOpen(!activityOpen)}
          >
            <Activity size={14} /> Activity
          </button>
        </div>
        <aside
          id="system-panel"
          className="system-inspector panel"
          hidden={!inspectorOpen}
        >
          <div className="panel-heading">
            <span>
              <Crosshair size={14} />
              SYSTEM INTELLIGENCE
            </span>
            <button
              className="icon-button"
              aria-label="Hide system panel"
              onClick={() => setInspectorOpen(false)}
            >
              <X size={14} />
            </button>
          </div>
          <div className="system-title">
            <div
              className={`relation ${own ? "friendly" : neutral ? "neutral" : "hostile"}`}
            >
              <i />
              {relation}
            </div>
            <h1>
              {asteroid
                ? asteroidSiteName(state.seed, s.id, s.name)
                : planetName(s, selectedPlanet)}
            </h1>
            <p>
              {asteroid
                ? `${asteroidAppearance(state.seed, s.id).material} · Mining site`
                : `${STAR_NAMES[s.star]} · ${s.region}`}
            </p>
          </div>
          <div className={`planet-hero ${asteroid ? "asteroid-hero" : ""}`}>
            <div className="orbit-ring one" />
            <div className="orbit-ring two" />
            <div className="hero-crosshair" />
            <img
              key={`${selected}-${asteroid}`}
              src={asset(
                asteroid
                  ? asteroidAppearance(state.seed, s.id).art
                  : planets[world.art],
              )}
              className={asteroid ? "" : "planet-texture"}
              alt={
                asteroid
                  ? `${s.name} asteroid field`
                  : planetName(s, selectedPlanet)
              }
            />
            <span className="hero-coordinate">
              {Math.round(s.x / 10)}° N <span>·</span> {Math.round(s.y / 10)}° E
            </span>
            {s.capital && (
              <span className="homeworld-label">
                <Flag size={10} />
                {own ? "HOMEWORLD" : "CAPITAL SYSTEM"}
              </span>
            )}
          </div>
          <div className="inspector-content">
            <div className="owner-row">
              <div className="owner-emblem" style={{ color: civ?.color }}>
                {owner ? (
                  <FactionEmblem civilization={owner.civilization} />
                ) : (
                  <Orbit size={26} />
                )}
              </div>
              <div>
                <span className="eyebrow">
                  {owner ? "CONTROLLED BY" : "SOVEREIGNTY"}
                </span>
                <strong>{owner?.name ?? "Unclaimed planet"}</strong>
                <small style={{ color: civ?.color }}>
                  {civ?.name ?? "Beyond established borders"}
                </small>
              </div>
              {own && <Shield size={15} className="blue" />}
            </div>
            {asteroid ? (
              <>
                <div className="stat-grid">
                  <div>
                    <small>RESOURCE</small>
                    <strong className="gold">Alloy</strong>
                  </div>
                  <div>
                    <small>RICHNESS</small>
                    <strong>
                      {s.region === "Home"
                        ? "Standard"
                        : s.region === "Frontier"
                          ? "Enriched"
                          : s.region === "Mid"
                            ? "Rich"
                            : "Exceptional"}{" "}
                      <span className="richness-bars">▂▃▅</span>
                    </strong>
                  </div>
                </div>
                <div className="yield-box">
                  <Boxes size={23} />
                  <div>
                    <small>ESTIMATED EXTRACTION</small>
                    <strong>
                      +{format(miningYield(state, 0, s))} <span>Alloy</span>
                    </strong>
                  </div>
                  <span>{BALANCE.miningSeconds}s</span>
                </div>
              </>
            ) : (
              <>
                <div className="stat-grid">
                  <div>
                    <small>
                      <Users size={11} />
                      PLANETS
                    </small>
                    <strong>
                      {s.planets.length}
                      <span> worlds</span>
                    </strong>
                  </div>
                  <div>
                    <small>
                      <Shield size={11} />
                      DEFENSE
                    </small>
                    <strong>
                      {s.capital
                        ? "Protected"
                        : strengthEstimate(state, 0, selected, selectedPlanet)
                          ? `≈ ${format(strengthEstimate(state, 0, selected, selectedPlanet)![1])}`
                          : "Unknown"}
                    </strong>
                  </div>
                </div>
                <div className="fleet-presence">
                  <Navigation size={13} />
                  <span>Fleet presence</span>
                  <strong>
                    {state.fleets.filter(
                      (f) =>
                        f.system === selected &&
                        f.planet === selectedPlanet &&
                        !moving(f),
                    ).length || "No"}{" "}
                    {state.fleets.filter(
                      (f) =>
                        f.system === selected &&
                        f.planet === selectedPlanet &&
                        !moving(f),
                    ).length === 1
                      ? "fleet"
                      : "fleets"}
                  </strong>
                </div>
                <div className="resource-output">
                  <span className="eyebrow">
                    PLANET OUTPUT <small>/ MIN</small>
                  </span>
                  <div>
                    <span>
                      <Coins size={13} />+
                      {format(s.output[0] / s.planets.length)}
                    </span>
                    <span>
                      <Boxes size={13} />+
                      {format(s.output[1] / s.planets.length)}
                    </span>
                    <span>
                      <Fuel size={13} />+
                      {format(s.output[2] / s.planets.length)}
                    </span>
                  </div>
                </div>
              </>
            )}
            {s.asteroid && !asteroid && (
              <button
                className="asteroid-opportunity"
                onClick={() => focusOn(selected, true)}
              >
                <img
                  src={asset(asteroidAppearance(state.seed, s.id).art)}
                  alt=""
                />
                <span>
                  <strong>{asteroidSiteName(state.seed, s.id, s.name)}</strong>
                  <small>Rich Alloy deposits</small>
                </span>
                <ChevronRight size={14} />
              </button>
            )}
            <div className="context-actions">
              {asteroid ? (
                <MiningPanel
                  state={state}
                  system={selected}
                  deposit={selectedDeposit}
                  mutate={mutate}
                />
              ) : own ? (
                <button
                  className="primary-button"
                  onClick={() => openOrder("move")}
                >
                  <Navigation size={15} />
                  Send fleet
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  className={`primary-button ${!neutral ? "attack-button" : ""}`}
                  disabled={s.capital}
                  onClick={() => openOrder("attack")}
                >
                  <Flag size={15} />
                  {s.capital
                    ? "Protected home"
                    : selectedPlanet < 0
                      ? "Clear resource lanes"
                      : neutral
                        ? "Claim planet"
                        : "Attack planet"}
                  <ArrowRight size={14} />
                </button>
              )}
              <div className="action-pair">
                {asteroid ? (
                  <button onClick={() => setAsteroid(false)}>
                    <Globe2 size={13} />
                    View system
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setFocus((f) => ({ id: selected, nonce: f.nonce + 1 }));
                    }}
                  >
                    <Crosshair size={13} />
                    Focus
                  </button>
                )}
                {!own ? (
                  <button onClick={() => openOrder("scout")}>
                    <Radar size={13} />
                    Scout
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setOverlay("build");
                    }}
                  >
                    <Hammer size={13} />
                    Shipyard
                  </button>
                )}
              </div>
            </div>
            <SystemDetails
              state={state}
              selected={selected}
              planet={selectedPlanet}
              onPlanet={(p) => {
                setSelectionKind("planet");
                setSelectedPlanet(p);
                setAsteroid(false);
              }}
              onClearPirates={() => {
                setSelectedPlanet(-1);
                const f =
                  available.find((f) => f.id === selectedFleet) ?? available[0];
                if (f)
                  setOrder({
                    target: selected,
                    planet: -1,
                    mission: "attack",
                    fleet: f.id,
                  });
              }}
            />
            {!asteroid && (
              <PlanetaryDefenses
                key={selected + ":" + selectedPlanet}
                planet={selectedPlanet}
                onPlanet={(p) => {
                  setSelectionKind("planet");
                  setSelectedPlanet(p);
                }}
                state={state}
                selected={selected}
                mutate={mutate}
              />
            )}
            <div className="inspector-note">
              <Radio size={12} />
              {own
                ? "Command link established"
                : s.scouted
                  ? "Reconnaissance data available"
                  : "Long-range sensor estimate"}
            </div>
          </div>
          <div className="empire-summary">
            <span className="eyebrow">YOUR EXPANSE</span>
            <div>
              <strong>
                {ownedCount}
                <small>SYSTEMS</small>
              </strong>
              <span />
              <strong>
                {playerFleets.length}
                <small>FLEETS</small>
              </strong>
              <span />
              <strong>
                {state.reserve.reduce((a, b) => a + b, 0)}
                <small>RESERVE</small>
              </strong>
            </div>
            <Progress value={ownedCount / 24} />
            <small>A foothold today. An empire tomorrow.</small>
          </div>
        </aside>
        <section className="map-column">
          <MatchHUD state={state} onFocus={focusOn} />
          <div className="map-header">
            <div className="map-title">
              <span className="eyebrow">STRATEGIC VIEW</span>
              <h2>
                The Orion Expanse <span>SECTOR 07</span>
              </h2>
            </div>
            <div className="map-search">
              <Search size={14} />
              <input
                aria-label="Find a system"
                placeholder="Find a system..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button aria-label="Clear search" onClick={() => setSearch("")}>
                  <X size={13} />
                </button>
              )}
              {search && (
                <div className="search-results">
                  {results.length ? (
                    results.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          focusOn(r.id);
                          setSearch("");
                        }}
                      >
                        <CircleDot size={12} />
                        {r.name}
                        <small>
                          {r.owner === 0
                            ? "OWNED"
                            : r.owner === null
                              ? "NEUTRAL"
                              : "RIVAL"}
                        </small>
                      </button>
                    ))
                  ) : (
                    <p>No systems found</p>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="map-filterbar">
            <div>
              {(
                [
                  "All",
                  "Owned",
                  "Neutral",
                  "Hostile",
                  "Fleets",
                  "Asteroids",
                ] as Filter[]
              ).map((f) => (
                <button
                  key={f}
                  className={filter === f ? "active" : ""}
                  onClick={() => setFilter(f)}
                >
                  {f === "All" && <Layers size={12} />} {f}
                </button>
              ))}
            </div>
            <span>
              <span className={`live-dot ${paused ? "paused" : ""}`} />
              {paused ? "SIMULATION PAUSED" : "LIVE GALAXY"}
            </span>
          </div>
          <GalaxyMap
            state={state}
            selected={selected}
            selectedAsteroid={asteroid}
            selectedFleet={selectedFleet}
            selectedPlanet={selectedPlanet}
            selectionKind={selectionKind}
            selectedDeposit={selectedDeposit}
            selectedMiner={selectedMiner}
            onMiner={(id) => {
              const m = state.miners.find((m) => m.id === id);
              if (!m) return;
              inspect(m.system, true);
              setSelectionKind("miner");
              setSelectedMiner(id);
              setSelectedFleetIds([]);
            }}
            selectedFleetIds={selectedFleetIds}
            onPlanet={selectPlanet}
            onDeposit={(system, id) => {
              inspect(system, true);
              setSelectedDeposit(id);
              setSelectedFleetIds([]);
            }}
            filter={filter}
            onSelect={inspect}
            onFleet={selectFleet}
            focus={focus}
            preview={preview}
            paused={paused}
          />
          <div className="fleet-dock">
            {selectedFleetIds.length > 0 && (
              <button
                className="selection-hint"
                onClick={() => setSelectedFleetIds([])}
              >
                {selectedFleetIds.length} fleet(s) selected · Shift-click to add
                · click a planet to order · Escape to clear
              </button>
            )}
            <BattleTray state={state} onFocus={focusOn} />
            {currentFleet?.owner === 0 && (
              <FleetOrders state={state} fleet={currentFleet} mutate={mutate} />
            )}
            {currentFleet?.owner === 0 && (
              <div className="selected-fleet-bar">
                <div>
                  <Navigation size={16} />
                  <span>
                    <strong>{currentFleet.name}</strong>
                    <small>
                      {moving(currentFleet)
                        ? `En route to ${state.systems[currentFleet.route.at(-1)!].name}`
                        : "Select a destination on the map"}
                    </small>
                  </span>
                </div>
                <span className="fleet-power">
                  {format(currentFleet.power)} <small>PWR</small>
                </span>
                <button
                  disabled={
                    moving(currentFleet) ||
                    currentFleet.status === "Battle" ||
                    currentFleet.retreatAt !== null
                  }
                  onClick={() =>
                    openOrder(world.owner !== 0 ? "attack" : "move")
                  }
                >
                  {moving(currentFleet)
                    ? time(currentFleet.duration - currentFleet.elapsed)
                    : "Set course"}
                  <ArrowRight size={13} />
                </button>
              </div>
            )}
          </div>
        </section>
        <aside
          id="operations-panel"
          className="operations-panel panel"
          hidden={!operationsOpen}
        >
          <div ref={fleetSection} className="fleets-section">
            <div className="panel-heading">
              <span>
                <Navigation size={14} />
                YOUR FLEETS
              </span>
              <button
                className="icon-button"
                aria-label="Hide command panel"
                onClick={() => setOperationsOpen(false)}
              >
                <X size={14} />
              </button>
            </div>
            <div className="fleet-list">
              {playerFleets.map((f) => (
                <button
                  key={f.id}
                  className={`fleet-card ${selectedFleet === f.id ? "selected" : ""}`}
                  onClick={(e) => selectFleet(f.id, e.shiftKey)}
                  aria-label={`Select ${f.name}`}
                >
                  <div className="fleet-card-top">
                    <span>{f.name}</span>
                    <ChevronRight size={13} />
                  </div>
                  <div className="fleet-card-mid">
                    <div className="ship-silhouettes">
                      {f.ships.map(
                        (n, i) =>
                          n > 0 && (
                            <img
                              key={i}
                              src={asset(
                                shipArtwork(
                                  state.commanders[f.owner].civilization,
                                  i,
                                ),
                              )}
                              alt={`${n} ${shipClasses[i]}`}
                            />
                          ),
                      )}
                    </div>
                    <span>
                      {format(f.power)}
                      <small>POWER</small>
                    </span>
                  </div>
                  <div className="fleet-card-bottom">
                    <span>
                      <CircleDot size={10} />
                      {state.systems[f.system].name}
                    </span>
                    <span className={`fleet-status ${f.status.toLowerCase()}`}>
                      {f.status === "Mining" ? (
                        <Hammer size={10} />
                      ) : moving(f) ? (
                        <ArrowUpRight size={10} />
                      ) : (
                        <i />
                      )}
                      {f.status}
                    </span>
                  </div>
                  {moving(f) && (
                    <div className="fleet-progress">
                      <div>
                        <span>→ {state.systems[f.route.at(-1)!].name}</span>
                        <strong>{time(f.duration - f.elapsed)}</strong>
                      </div>
                      <Progress value={f.elapsed / f.duration} />
                    </div>
                  )}
                  {f.status === "Mining" && (
                    <div className="fleet-progress">
                      <div>
                        <span>Extracting Alloy</span>
                        <strong>
                          {time(MINING_SECONDS - f.miningElapsed)}
                        </strong>
                      </div>
                      <Progress
                        value={f.miningElapsed / MINING_SECONDS}
                        tone="gold"
                      />
                    </div>
                  )}
                </button>
              ))}
            </div>
            <button
              className="text-button"
              onClick={() => setOverlay("fleets")}
            >
              Fleet command
              <ArrowUpRight size={12} />
            </button>
          </div>
          <div className="production-section" ref={productionSection}>
            <div className="panel-heading">
              <span>
                <Hammer size={14} />
                SHIP PRODUCTION
              </span>
              <span className="tiny-number">{state.queue.length}/10</span>
            </div>
            <div className="shipyard-location">
              <span className="live-dot" />
              Nova Prime Shipyard<small>OPERATIONAL</small>
            </div>
            <div className="queue-list">
              {state.queue.length ? (
                state.queue.map((job, index) => (
                  <div key={job.id} className="queue-item">
                    <img src={asset(ships[job.kind].art)} alt="" />
                    <div>
                      <strong>
                        {job.kind}
                        <small>{time(job.duration - job.elapsed)}</small>
                      </strong>
                      <span>
                        {index < 2
                          ? "Assembly in progress"
                          : "Waiting for berth"}
                      </span>
                      <Progress
                        value={job.elapsed / job.duration}
                        tone="gold"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-queue">
                  <Hammer size={18} />
                  <span>
                    Construction berths available
                    <small>Your next fleet starts here.</small>
                  </span>
                </div>
              )}
            </div>
            <button
              className="build-button"
              aria-label="Build a ship"
              onClick={() => setOverlay("build")}
            >
              <Hammer size={14} />
              Build a ship <span>+</span>
            </button>
            <div className="reserve-row">
              <Boxes size={13} />
              <span>Ships in reserve</span>
              <strong data-testid="reserve-count">
                {state.reserve.reduce((a, b) => a + b, 0)}
              </strong>
            </div>
          </div>
          <CommandFeed state={state} mutate={mutate} onFocus={focusOn} />
        </aside>
      </main>
      <section id="activity-panel" className="event-log" hidden={!activityOpen}>
        <div className="event-heading">
          <span>
            <Activity size={14} />
            WORLD ACTIVITY
            <span className="live-dot" />
          </span>
          <div>
            <button
              aria-label="Hide activity panel"
              onClick={() => setActivityOpen(false)}
            >
              <X size={14} />
            </button>
            <button
              className={eventFilter === "all" ? "active" : ""}
              onClick={() => setEventFilter("all")}
            >
              All events
            </button>
            <button
              className={eventFilter === "mine" ? "active" : ""}
              onClick={() => setEventFilter("mine")}
            >
              Your empire
            </button>
            <span className="event-clock">
              <Timer size={11} />
              CYCLE {time(state.time)}
            </span>
          </div>
        </div>
        <div className="event-items">
          {events.slice(0, 5).map((e) => {
            const Icon = eventIcons[e.kind];
            return (
              <button
                key={e.id}
                className={`event-item ${e.kind}`}
                onClick={() => {
                  focusOn(e.system, e.kind === "mining");
                  if (e.kind === "battle" && e.player) {
                    const r = state.reports.find((r) => r.system === e.system);
                    if (r) setReportId(r.id);
                  }
                }}
              >
                <span className="event-icon">
                  <Icon size={16} />
                </span>
                <div>
                  <span className="event-item-title">
                    {e.title}
                    <time>{time(e.time)}</time>
                  </span>
                  <p>{e.detail}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>
      <footer className="statusbar">
        <span>
          <Radio size={10} />
          {paused ? "Simulation paused" : "All systems nominal"}
          <i />
          LOCAL SESSION
        </span>
        <span>
          ORION-{state.seed.replace("ORION-", "")}
          <i />
          56 STAR SYSTEMS
          <span className="footer-version">SPACE WARS / 0.2</span>
        </span>
      </footer>

      {toast && (
        <div className="toast" role="status">
          <Sparkles size={18} />
          <span>{toast}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {dev && (
        <section className="dev-panel" aria-label="Developer controls">
          <div>
            <FlaskConical size={14} />
            <strong>LOCAL MATCH · DEV</strong>
            <button
              aria-label="Close developer controls"
              onClick={() => setDev(false)}
            >
              <X size={14} />
            </button>
          </div>
          <label>
            GALAXY SEED
            <input
              value={seedInput}
              onChange={(e) => setSeedInput(e.target.value)}
              maxLength={80}
            />
          </label>
          <button className="primary-button" onClick={() => reset(seedInput)}>
            <RefreshCw size={13} />
            Regenerate galaxy
          </button>
          <div className="dev-actions">
            <button onClick={() => setPaused(!paused)}>
              {paused ? <Play size={13} /> : <Pause size={13} />}{" "}
              {paused ? "Resume" : "Pause"}
            </button>
            <button onClick={() => reset(state.seed)}>
              <RefreshCw size={13} />
              Restart match
            </button>
          </div>
          <div className="speed-controls">
            <span>SIMULATION</span>
            {[1, 2, 5, 10].map((n) => (
              <button
                key={n}
                className={speed === n ? "active" : ""}
                onClick={() => setSpeed(n)}
              >
                ×{n}
              </button>
            ))}
          </div>
          <DevExtras
            state={state}
            mutate={mutate}
            duration={matchDuration}
            setDuration={setMatchDuration}
            allBots={allBots}
            setAllBots={setAllBots}
          />
          <p>
            Everything runs in this browser. Refreshing resets the world.
            Pausing freezes travel, production and rival activity.
          </p>
        </section>
      )}
      {order && selectedOrderFleet && (
        <Modal
          eyebrow="FLEET COMMAND"
          title={
            order.mission === "attack"
              ? "Expand your frontier"
              : order.mission === "mine"
                ? "Deploy mining operation"
                : order.mission === "scout"
                  ? "Scout the unknown"
                  : "Plot a new course"
          }
          onClose={() => setOrder(null)}
        >
          <div className="order-destination">
            <img
              src={asset(
                order.mission === "mine"
                  ? asteroidAppearance(state.seed, order.target).art
                  : planets[
                      state.systems[order.target].planets[
                        Math.max(0, order.planet)
                      ].art
                    ],
              )}
              alt=""
            />
            <div>
              <span className="eyebrow">DESTINATION</span>
              <h3>
                {planetName(state.systems[order.target], order.planet)}
                {order.mission === "mine"
                  ? ` ${asteroidAppearance(state.seed, order.target).suffix}`
                  : ""}
              </h3>
              <p>
                {order.planet < 0
                  ? "Resource-lane hostiles"
                  : state.systems[order.target].planets[order.planet].owner ===
                      null
                    ? "Unclaimed planet"
                    : state.commanders[
                        state.systems[order.target].planets[order.planet].owner!
                      ].name}
              </p>
            </div>
            <Flag size={22} />
          </div>
          <label className="field-label">
            ASSIGN FLEET
            <select
              value={order.fleet}
              onChange={(e) =>
                setOrder({ ...order, fleet: Number(e.target.value) })
              }
            >
              {available.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} · {format(f.power)} power
                </option>
              ))}
            </select>
          </label>
          <div className="order-stats">
            <div>
              <small>FLEET POWER</small>
              <strong>{format(selectedOrderFleet.power)}</strong>
            </div>
            <div>
              <small>
                {order.mission === "attack"
                  ? "DEFENSE ESTIMATE"
                  : order.mission === "mine"
                    ? "ALLOY YIELD"
                    : "JUMPS"}
              </small>
              <strong>
                {order.mission === "attack"
                  ? (strengthEstimate(state, 0, order.target, order.planet)
                      ?.map(format)
                      .join("–") ?? "Unknown")
                  : order.mission === "mine"
                    ? `+${format(miningYield(state, 0, state.systems[order.target]))}`
                    : preview.length - 1}
              </strong>
            </div>
            <div>
              <small>TRAVEL TIME</small>
              <strong>
                {preview.length === 1
                  ? time(
                      selectedOrderFleet.planet === order.planet
                        ? 0
                        : BALANCE.orbitalTravel,
                    )
                  : time(travelTime(state, preview, selectedOrderFleet))}
              </strong>
            </div>
          </div>
          <div className="route-summary">
            <Navigation size={14} />
            <span>
              {preview.map((id) => state.systems[id].name).join("  →  ")}
            </span>
          </div>
          <div className="order-note">
            <CircleHelp size={14} />
            <span>
              {order.mission === "attack"
                ? "Combat starts with a 6-second approach. Clear this planet’s fleet and defenses, then hold for 20 seconds. Other planets remain independent."
                : order.mission === "mine"
                  ? `Extract Alloy every ${BALANCE.miningSeconds}s. One extraction fleet per system. Combat cancels mining; new orders cancel the current cycle.`
                  : "Your fleet follows the connected travel lanes. Orders cannot change while underway."}
            </span>
          </div>
          {order.mission === "mine" && (
            <label className="repeat-mining-choice">
              Mining order
              <select
                aria-label="Mining mode"
                value={repeatMining ? "repeat" : "once"}
                onChange={(e) => setRepeatMining(e.target.value === "repeat")}
              >
                <option value="once">Mine once</option>
                <option value="repeat">Continue mining</option>
              </select>
            </label>
          )}
          <div className="modal-footer">
            <button className="secondary-button" onClick={() => setOrder(null)}>
              Cancel
            </button>
            <button
              className="primary-button"
              onClick={() => {
                if (
                  mutate(
                    (d) =>
                      launchFleet(
                        d,
                        order.fleet,
                        order.target,
                        order.mission,
                        repeatMining,
                        order.planet,
                      ),
                    "Orders confirmed. Fleet underway.",
                  )
                ) {
                  setSelectedFleet(order.fleet);
                  setOrder(null);
                }
              }}
            >
              <Navigation size={15} />
              {order.mission === "attack"
                ? "Launch assault"
                : order.mission === "mine"
                  ? "Deploy fleet"
                  : "Confirm orders"}
              <span>
                {fuelCost(state, selectedOrderFleet, preview)}{" "}
                <Fuel size={12} />
              </span>
            </button>
          </div>
        </Modal>
      )}
      {overlay === "build" && (
        <Modal
          eyebrow="PLANETARY SHIPYARDS"
          title="Commission a warship"
          onClose={() => setOverlay(null)}
        >
          <p className="modal-intro">
            Completed ships enter the reserve at the selected shipyard planet.
            Capture a yard to build closer to the front.
          </p>
          <label className="quantity-field">
            SHIPYARD
            <select
              aria-label="Production shipyard"
              value={yard.system.id + ":" + yard.planet.id}
              onChange={(e) => setYardKey(e.target.value)}
            >
              {yards.map((y) => (
                <option
                  key={y.system.id + ":" + y.planet.id}
                  value={y.system.id + ":" + y.planet.id}
                >
                  {planetName(y.system, y.planet.id)}
                </option>
              ))}
            </select>
          </label>
          <ShipQuantity quantity={quantity} setQuantity={setQuantity} />
          <div className="ship-catalog">
            {shipClasses.map((kind) => {
              const spec = ships[kind],
                disabled =
                  yard.planet.queue.length + quantity > BALANCE.queueLimit ||
                  state.resources.credits < spec.credits * quantity ||
                  state.resources.alloy < spec.alloy * quantity;
              return (
                <div key={kind} className="ship-option">
                  <div className="ship-option-art">
                    <img src={asset(spec.art)} alt={`${kind} top-down view`} />
                  </div>
                  <div>
                    <h3>{kind}</h3>
                    <small>{shipRole(kind)}</small>
                    <span>
                      {format(spec.power)} POWER <i /> {spec.seconds}s BUILD
                    </span>
                    <p>
                      <Coins size={12} />
                      {format(spec.credits)}
                      <Boxes size={12} />
                      {format(spec.alloy)}
                    </p>
                  </div>
                  <button disabled={disabled} onClick={() => commission(kind)}>
                    {yard.planet.queue.length + quantity > BALANCE.queueLimit
                      ? "Full"
                      : "Build"}
                    <Hammer size={12} />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="modal-bottom-note">
            <Hammer size={13} />
            {yard.planet.queue.map((job) => (
              <span key={job.id}>
                {job.kind} · {Math.ceil(job.duration - job.elapsed)}s{" "}
              </span>
            ))}
            {yard.planet.queue.length} / 10 queue slots used · 2 active berths{" "}
            <span>
              {yard.planet.reserve.reduce((a, b) => a + b, 0)} ships in reserve
            </span>
          </div>
        </Modal>
      )}
      {overlay === "fleets" && (
        <Modal
          eyebrow="YOUR EXPEDITIONARY FORCES"
          title="Fleet command"
          onClose={() => setOverlay(null)}
        >
          <p className="modal-intro">
            Select a fleet to plot its next mission. Reserve ships can join a
            fleet stationed at any owned shipyard planet.
          </p>
          <FleetFormation state={state} mutate={mutate} />
          {playerFleets.map((f) => (
            <div className="registry-row" key={f.id}>
              <Navigation size={22} />
              <div>
                <strong>{f.name}</strong>
                <small>
                  {f.ships
                    .map((n, i) => (n ? `${n} ${shipClasses[i]}` : ""))
                    .filter(Boolean)
                    .join(" · ")}
                </small>
                <span>
                  {f.status} · {state.systems[f.system].name} ·{" "}
                  {format(f.power)} power
                </span>
              </div>
              <button
                onClick={() => {
                  selectFleet(f.id);
                  setOverlay(null);
                }}
              >
                Focus
                <Crosshair size={13} />
              </button>
              {state.systems[f.system].planets[f.planet]?.shipyard &&
                state.systems[f.system].planets[f.planet]?.owner === 0 &&
                !moving(f) && (
                  <button
                    disabled={
                      !state.systems[f.system].planets[f.planet].reserve.some(
                        Boolean,
                      )
                    }
                    onClick={() =>
                      mutate(
                        (d) => reinforceFleet(d, f.id),
                        "Reserve ships assigned to fleet.",
                      )
                    }
                  >
                    <Rocket size={13} />
                    Reinforce
                  </button>
                )}
            </div>
          ))}
          <div className="modal-bottom-note">
            <Boxes size={14} />
            {state.reserve.reduce((a, b) => a + b, 0)} ships waiting at Nova
            Prime
          </div>
        </Modal>
      )}
      {overlay === "intel" && (
        <Modal
          eyebrow="GALACTIC INTELLIGENCE"
          title="Powers of the Expanse"
          onClose={() => setOverlay(null)}
        >
          <p className="modal-intro">
            Eight civilizations. One human and seven local AI commanders. No
            alliances.
          </p>
          <div className="civilization-grid">
            {civilizations.map((c, i) => (
              <button
                key={c.id}
                style={{ "--faction": c.color } as React.CSSProperties}
                onClick={() => {
                  const target = state.systems.find(
                    (s) =>
                      s.owner !== null &&
                      state.commanders[s.owner].civilization === i,
                  );
                  if (target) focusOn(target.id);
                  setOverlay(null);
                }}
              >
                <FactionEmblem civilization={i} />
                {c.portrait && (
                  <img
                    className="civilization-portrait"
                    src={asset(c.portrait)}
                    alt=""
                  />
                )}
                <div>
                  <strong>{c.name}</strong>
                  <span>
                    {
                      state.systems.filter(
                        (s) =>
                          s.owner !== null &&
                          state.commanders[s.owner].civilization === i,
                      ).length
                    }{" "}
                    controlled systems
                  </span>
                </div>
                <ArrowUpRight size={13} />
              </button>
            ))}
          </div>
          {state.reports.length > 0 && (
            <div className="report-links">
              <span className="eyebrow">BATTLE REPORTS</span>
              {state.reports.slice(0, 4).map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setOverlay(null);
                    setReportId(r.id);
                  }}
                >
                  <Swords size={13} />
                  {state.systems[r.system].name}
                  <span>{r.victory ? "Victory" : "Withdrawal"}</span>
                  <ChevronRight size={12} />
                </button>
              ))}
            </div>
          )}
        </Modal>
      )}
      {overlay === "help" && (
        <Modal
          eyebrow="WELCOME, COMMANDER"
          title="A galaxy at your fingertips"
          onClose={() => setOverlay(null)}
        >
          <div className="help-steps">
            <p>
              <Map />
              <span>
                <strong>Explore the Expanse</strong>Drag to pan. Scroll to zoom
                around the pointer. Use the minimap to jump across the galaxy;
                Home returns to Nova Prime.
              </span>
            </p>
            <p>
              <Navigation />
              <span>
                <strong>Give your fleet a destination</strong>Click a fleet,
                Shift-click to add more, then click a planet to send them.
                Escape clears the selection. Planet panels also offer explicit
                orders.
              </span>
            </p>
            <p>
              <Flag />
              <span>
                <strong>Leave your mark</strong>Conquer planets and hold a
                strict majority to control each system. Use civilian miners for
                Alloy and capture shipyard planets for forward production.
                Highest score at 40 minutes wins; hold 29 of 48 external systems
                for 75 seconds to win early.
              </span>
            </p>
            <p>
              <FlaskConical />
              <span>
                <strong>A local playground</strong>The DEV control changes the
                seed, resets the demo, pauses time or accelerates it. All
                battles and rivals are simulated locally.
              </span>
            </p>
          </div>
        </Modal>
      )}
      {state.status === "finished" && (
        <MatchResult
          state={state}
          onRestart={() => reset(state.seed)}
          onNewSeed={() =>
            reset(`ORION-${Date.now().toString(36).toUpperCase()}`)
          }
        />
      )}
      {activeReport && (
        <Modal
          eyebrow="AFTER-ACTION REPORT"
          title={activeReport.victory ? "Battle won" : "Battle lost"}
          onClose={() => setReportId(null)}
        >
          <div
            className={`battle-result ${activeReport.victory ? "victory" : ""}`}
          >
            <Flag size={40} />
            <h3>{state.systems[activeReport.system].name}</h3>
            <p>
              {activeReport.victory
                ? "Your fleet holds the field. Uncontested occupation secures territory."
                : "Check your surviving forces and rebuild at Nova Prime."}
            </p>
          </div>
          <div className="order-stats">
            <div>
              <small>YOUR FLEET</small>
              <strong>{format(activeReport.attacker)}</strong>
            </div>
            <div>
              <small>DEFENDERS</small>
              <strong>{format(activeReport.defender)}</strong>
            </div>
            <div>
              <small>RESULT</small>
              <strong>{activeReport.victory ? "VICTORY" : "REPELLED"}</strong>
            </div>
          </div>
          <p className="modal-intro">
            {activeReport.fleet} · Local prototype combat. The full top-down
            battle system is reserved for a later phase.
          </p>
          <div className="modal-footer">
            <button
              className="primary-button"
              onClick={() => {
                focusOn(activeReport.system);
                setReportId(null);
              }}
            >
              View system
              <ArrowRight size={14} />
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
