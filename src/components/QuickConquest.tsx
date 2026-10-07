import { useState } from "react";
import { BALANCE, PHASES, STAR_NAMES, STRATEGIC } from "../demo/balance";
import {
  asset,
  civilizations,
  planets,
  shipClasses,
  ships,
} from "../demo/catalog";
import {
  createFleet,
  launchFleet,
  postChat,
  retreatFleet,
  setStance,
} from "../demo/commands";
import {
  external,
  moving,
  ownerName,
  phase,
  standings,
  strengthEstimate,
  visibleSystems,
} from "../demo/model";
import { triggerObjective } from "../demo/objectives";
import { stepMatch } from "../demo/simulation";
import type { DemoState, Fleet, Stance } from "../demo/types";

export const clockText = (n: number) =>
  `${Math.floor(Math.max(0, n) / 60)
    .toString()
    .padStart(2, "0")}:${Math.ceil(Math.max(0, n) % 60)
    .toString()
    .padStart(2, "0")}`;
const number = (n: number) => Math.floor(n).toLocaleString("en-US");
export type Mutate = (
  fn: (s: DemoState) => string | null,
  success?: string,
) => boolean;
type Props = { state: DemoState; mutate: Mutate };

export function MatchHUD({
  state: s,
  onFocus,
}: {
  state: DemoState;
  onFocus: (id: number) => void;
}) {
  const rank = standings(s).findIndex((c) => c.id === 0) + 1;
  return (
    <div className="match-hud">
      <div>
        <small>{phase(s)}</small>
        <strong data-testid="match-timer">
          {clockText(s.duration - s.time)}
        </strong>
      </div>
      <div>
        <small>DOMINION</small>
        <strong>
          {number(s.commanders[0].score)} <em>#{rank} / 8</em>
        </strong>
      </div>
      <div className="objective-status">
        {(["guardian", "leviathan"] as const).map((kind) => {
          const o = s.objectives[kind];
          return (
            <button key={kind} onClick={() => onFocus(o.system)}>
              <img src={asset(`original/${kind}.svg`)} alt="" />
              <span>
                {kind === "guardian" ? "GUARDIAN" : "LEVIATHAN"}
                <small>
                  {o.killer !== null
                    ? `Claimed by ${ownerName(s, o.killer)}`
                    : o.active
                      ? "ACTIVE · LOCATE"
                      : o.spawned
                        ? "DESTROYED"
                        : `${clockText(s.duration * (kind === "guardian" ? BALANCE.guardianFraction : BALANCE.leviathanFraction) - s.time)} until arrival`}
                </small>
              </span>
            </button>
          );
        })}
      </div>
      {s.domination && (
        <button
          className="domination-alert"
          onClick={() => onFocus(s.domination!.owner)}
        >
          DOMINATION · {ownerName(s, s.domination.owner)} ·{" "}
          {clockText(BALANCE.domination.seconds - s.domination.elapsed)}
        </button>
      )}
    </div>
  );
}
export function SystemDetails({
  state: s,
  selected,
}: {
  state: DemoState;
  selected: number;
}) {
  const x = s.systems[selected],
    estimate = strengthEstimate(s, 0, selected);
  const enemies = s.fleets.filter(
    (f) => f.owner !== 0 && f.system === selected && !moving(f),
  );
  const visible = visibleSystems(s, 0).has(selected) || s.devReveal;
  return (
    <div className="system-details">
      <span className="eyebrow">
        {x.region.toUpperCase()} · {STAR_NAMES[x.star]}
      </span>
      <div className="planet-roster">
        {x.planets.map((p, i) => (
          <img key={i} src={asset(planets[p])} alt={`Planet ${i + 1}`} />
        ))}
        <small>
          {x.planets.length} worlds
          <br />
          {x.belts} asteroid {x.belts === 1 ? "field" : "fields"}
        </small>
      </div>
      {x.strategic && (
        <div className="strategic-bonus">
          <img src={asset(`original/objective-${x.strategic}.svg`)} alt="" />
          <span>
            <strong>{STRATEGIC[x.strategic].name}</strong>
            <small>{STRATEGIC[x.strategic].description}</small>
          </span>
        </div>
      )}
      {x.capital && (
        <p className="subtle-note">
          Protected home system · cannot be attacked or captured.
        </p>
      )}
      {x.capture && (
        <div className="capture-status">
          Securing control · {ownerName(s, x.capture.owner)}
          <progress max={BALANCE.captureSeconds} value={x.capture.elapsed} />
          <small>{BALANCE.captureSeconds - x.capture.elapsed}s remaining</small>
        </div>
      )}
      {!x.capital && (
        <p className="contact-estimate">
          {estimate
            ? `Hostile estimate: ${number(estimate[0])}–${number(estimate[1])} power`
            : "Unknown fleet strength · scout to improve intelligence"}
        </p>
      )}
      {visible &&
        enemies
          .filter((f) => f.neutral)
          .map((f) => (
            <div className="neutral-contact" key={f.id}>
              <img
                src={asset(
                  f.neutral === "pirates"
                    ? f.name.includes("Stronghold")
                      ? "war2_pirate_black_ledger.webp"
                      : f.name.includes("Patrol")
                        ? "war2_pirate_needlejack.webp"
                        : "war2_pirate_ragtooth.webp"
                    : `original/${f.neutral}.svg`,
                )}
                alt=""
              />
              <span>
                <strong>{f.name}</strong>
                <small>
                  {f.neutral === "pirates"
                    ? "Salvage +450 C / +240 A / +90 F · 75 Dominion"
                    : f.neutral === "guardian"
                      ? "400 Dominion · +10% damage / 3 min"
                      : "650 Dominion · +10% speed, +8% damage / 3 min"}
                </small>
              </span>
            </div>
          ))}
    </div>
  );
}
export function FleetOrders({
  state: s,
  fleet: f,
  mutate,
}: Props & { fleet: Fleet }) {
  if (f.owner !== 0) return null;
  const stances: Stance[] = [
    "Balanced",
    "Aggressive",
    "Defensive",
    "Focus capitals",
    "Focus escorts",
  ];
  return (
    <div className="fleet-orders">
      <label>
        FLEET STANCE
        <select
          aria-label="Fleet stance"
          value={f.stance}
          onChange={(e) =>
            mutate((d) => setStance(d, f.id, e.target.value as Stance))
          }
        >
          {stances.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
      <button
        disabled={moving(f) || f.status === "Battle" || f.retreatAt !== null}
        onClick={() => mutate((d) => launchFleet(d, f.id, f.system, "defend"))}
      >
        Defend
      </button>
      <button
        disabled={moving(f) || f.system === 0 || f.retreatAt !== null}
        onClick={() => mutate((d) => retreatFleet(d, f.id))}
      >
        {f.retreatAt !== null
          ? `Withdrawing ${clockText(f.retreatAt - s.time)}`
          : "Retreat"}
      </button>
      <small>
        {f.ships
          .map((n, i) => (n ? `${n} ${shipClasses[i]}` : ""))
          .filter(Boolean)
          .join(" · ")}
      </small>
    </div>
  );
}
export function BattleTray({
  state: s,
  onFocus,
}: {
  state: DemoState;
  onFocus: (id: number) => void;
}) {
  if (!s.battles.length) return null;
  return (
    <div className="battle-tray" aria-label="Active battles">
      {s.battles.map((b) => (
        <button key={b.id} onClick={() => onFocus(b.system)}>
          <span className="live-dot" />
          <strong>{s.systems[b.system].name}</strong>
          <small>
            {b.owners
              .map(
                (o, i) =>
                  `${ownerName(s, o)} ${o === 0 || b.owners.includes(0) || s.devReveal ? number(b.power[i]) : "≈" + number(Math.round(b.power[i] / 500) * 500)}`,
              )
              .join(" vs ")}
          </small>
          <progress
            value={b.power.reduce((a, c) => a + c, 0)}
            max={b.initial.reduce((a, c) => a + c, 0)}
          />
          <small>
            {b.casualties.reduce((a, c) => a + c, 0)} ships lost ·{" "}
            {s.time - b.start}s
          </small>
        </button>
      ))}
    </div>
  );
}
export function CommandFeed({
  state: s,
  mutate,
  onFocus,
}: Props & { onFocus: (id: number) => void }) {
  const [tab, setTab] = useState("standings"),
    [message, setMessage] = useState("");
  const c = s.commanders[0];
  return (
    <section className="command-feed">
      <div className="feed-tabs">
        <button
          className={tab === "standings" ? "active" : ""}
          onClick={() => setTab("standings")}
        >
          STANDINGS
        </button>
        <button
          className={tab === "chat" ? "active" : ""}
          onClick={() => setTab("chat")}
        >
          GLOBAL CHAT
        </button>
      </div>
      {tab === "standings" ? (
        <div className="standings-list">
          {standings(s).map((c, i) => (
            <button
              key={c.id}
              onClick={() => onFocus(c.id)}
              className={c.id === 0 ? "own-ranking" : ""}
            >
              <b>{i + 1}</b>
              <i style={{ background: civilizations[c.civilization].color }} />
              <span>
                {c.name}
                <small>
                  {civilizations[c.civilization].name} · {c.bot ? "AI" : "YOU"}{" "}
                  · {external(s, c.id).length} external
                </small>
              </span>
              <strong>{number(c.score)}</strong>
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="chat-messages" aria-live="polite">
            {s.chat.length ? (
              s.chat.slice(-12).map((m) => (
                <p key={m.id}>
                  <strong
                    style={{
                      color:
                        civilizations[s.commanders[m.owner].civilization].color,
                    }}
                  >
                    {ownerName(s, m.owner)}{" "}
                    {s.commanders[m.owner].bot ? "[AI]" : ""}
                  </strong>
                  <span>{m.text}</span>
                  <small>{clockText(m.time)}</small>
                </p>
              ))
            ) : (
              <p>Local channel open. Seven AI commanders are listening.</p>
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (mutate((d) => postChat(d, 0, message))) setMessage("");
            }}
          >
            <input
              aria-label="Global chat message"
              placeholder="Message the galaxy…"
              maxLength={240}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button type="submit">Send</button>
          </form>
        </>
      )}
      <div className="active-bonuses">
        <span className="eyebrow">ACTIVE STRATEGIC BONUSES</span>
        {s.systems
          .filter((x) => x.owner === 0 && x.strategic)
          .map((x) => (
            <button key={x.id} onClick={() => onFocus(x.id)}>
              {STRATEGIC[x.strategic!].name}
              <small>{STRATEGIC[x.strategic!].description}</small>
            </button>
          ))}
        {c.buffs.map((b) => (
          <p key={b.kind}>
            {b.kind === "guardian"
              ? "Guardian insight · +10% damage"
              : "Leviathan resonance · +10% speed / +8% damage"}
            <small>{clockText(b.until - s.time)}</small>
          </p>
        ))}
        {c.recoveryUntil > s.time && (
          <p>
            Emergency Mobilization
            <small>{clockText(c.recoveryUntil - s.time)}</small>
          </p>
        )}
        {s.surgeUntil > s.time && (
          <p>
            Alloy Surge · +40% extraction
            <small>{clockText(s.surgeUntil - s.time)}</small>
          </p>
        )}
        {!s.systems.some((x) => x.owner === 0 && x.strategic) &&
          !c.buffs.length && <p>Capture a strategic system to gain an edge.</p>}
      </div>
    </section>
  );
}
export function FleetFormation({ state: s, mutate }: Props) {
  const [counts, setCounts] = useState([0, 0, 0, 0]);
  return (
    <div className="fleet-formation">
      <span className="eyebrow">FORM A FLEET FROM RESERVE</span>
      <div>
        {shipClasses.map((kind, i) => (
          <label key={kind}>
            {kind}
            <input
              aria-label={`${kind} allocation`}
              type="number"
              min="0"
              max={s.reserve[i]}
              value={counts[i]}
              onChange={(e) =>
                setCounts(
                  counts.map((n, k) => (k === i ? Number(e.target.value) : n)),
                )
              }
            />
            <small>{s.reserve[i]} available</small>
          </label>
        ))}
      </div>
      <button
        className="primary-button"
        onClick={() => {
          if (
            mutate(
              (d) => createFleet(d, 0, counts),
              "Fleet commissioned at Nova Prime.",
            )
          )
            setCounts([0, 0, 0, 0]);
        }}
      >
        Create fleet
      </button>
    </div>
  );
}
export function DevExtras({
  state: s,
  mutate,
  duration,
  setDuration,
  allBots,
  setAllBots,
}: Props & {
  duration: number;
  setDuration: (n: number) => void;
  allBots: boolean;
  setAllBots: (b: boolean) => void;
}) {
  const [bot, setBot] = useState(1),
    c = s.commanders[bot];
  return (
    <div className="dev-extras">
      <label>
        NEXT MATCH DURATION
        <select
          aria-label="Match duration"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
        >
          {[10, 20, 30, 40, 60].map((n) => (
            <option key={n} value={n * 60}>
              {n} minutes{" "}
              {n === 40 ? "· NORMAL" : n === 10 ? "· QUICK TEST" : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={allBots}
          onChange={(e) => setAllBots(e.target.checked)}
        />
        8 bots / observer (next restart)
      </label>
      <div className="dev-actions">
        <button
          onClick={() =>
            mutate((d) => {
              d.commanders[0].resources.credits += 5000;
              d.commanders[0].resources.alloy += 5000;
              d.commanders[0].resources.fuel += 1000;
              return null;
            })
          }
        >
          Add resources
        </button>
        <button
          onClick={() =>
            mutate((d) => {
              d.devReveal = !d.devReveal;
              return null;
            })
          }
        >
          {s.devReveal ? "Hide debug reveal" : "Reveal map"}
        </button>
      </div>
      <div className="dev-actions">
        <button onClick={() => mutate((d) => triggerObjective(d, "guardian"))}>
          Trigger Guardian
        </button>
        <button onClick={() => mutate((d) => triggerObjective(d, "leviathan"))}>
          Trigger Leviathan
        </button>
      </div>
      <label>
        SIMULATE TO PHASE
        <select
          aria-label="Jump to phase"
          value=""
          onChange={(e) => {
            const target = Number(e.target.value);
            mutate((d) => {
              while (
                d.time < d.duration * BALANCE.phases[target] &&
                d.status === "playing"
              )
                stepMatch(d);
              return null;
            });
          }}
        >
          <option value="">Choose phase…</option>
          {PHASES.slice(1).map((p, i) => (
            <option key={p} value={i + 1}>
              {p}
            </option>
          ))}
        </select>
      </label>
      <button
        onClick={() =>
          mutate((d) => {
            while (d.status === "playing") stepMatch(d);
            return null;
          })
        }
      >
        Simulate to match end
      </button>
      <label>
        BOT INSPECTOR
        <select
          aria-label="Inspect bot"
          value={bot}
          onChange={(e) => setBot(Number(e.target.value))}
        >
          {s.commanders
            .filter((c) => c.bot)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
      </label>
      <div className="bot-inspector">
        <strong>{c.personality}</strong>
        <p>{c.goal}</p>
        <small>{c.reasoning}</small>
        <p>
          C {number(c.resources.credits)} · A {number(c.resources.alloy)} · F{" "}
          {number(c.resources.fuel)}
        </p>
        <small>
          {s.fleets
            .filter((f) => f.owner === bot)
            .map((f) => `${f.name}: ${f.status} / ${number(f.power)}`)
            .join("; ")}
        </small>
      </div>
    </div>
  );
}
export function MatchResult({
  state: s,
  onRestart,
  onNewSeed,
}: {
  state: DemoState;
  onRestart: () => void;
  onNewSeed: () => void;
}) {
  const rankings = standings(s),
    placement = rankings.findIndex((c) => c.id === 0) + 1,
    c = s.commanders[0];
  const max = Math.max(1, ...s.history.flatMap((h) => h.scores));
  return (
    <div className="modal-backdrop result-backdrop">
      <section
        className="match-result"
        role="dialog"
        aria-modal="true"
        aria-label="Match results"
        tabIndex={-1}
        ref={(el) => {
          el?.focus();
        }}
      >
        <span className="eyebrow">
          QUICK CONQUEST · {s.endReason?.toUpperCase()} VICTORY ·{" "}
          {clockText(s.time)}
        </span>
        <h1>
          {s.commanders[0].bot
            ? "MATCH COMPLETE"
            : s.winner === 0
              ? "VICTORY"
              : "DEFEAT"}
        </h1>
        <p>
          {ownerName(s, s.winner!)} commands the Expanse.{" "}
          {s.commanders[0].bot ? "Observed commander placed" : "You placed"}{" "}
          <strong>#{placement}</strong> with{" "}
          <strong>{number(c.score)} Dominion</strong>.
        </p>
        <div className="result-layout">
          <div>
            <table>
              <thead>
                <tr>
                  <th>Rank / Commander</th>
                  <th>Dominion</th>
                  <th>Systems</th>
                  <th>Built</th>
                  <th>Kills</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((c, i) => (
                  <tr key={c.id} className={c.id === 0 ? "own-ranking" : ""}>
                    <td>
                      {i + 1}. {c.name}{" "}
                      <small>
                        {c.bot ? "AI" : "YOU"}
                        {s.winner === c.id ? " · WINNER" : ""}
                      </small>
                    </td>
                    <td>{number(c.score)}</td>
                    <td>{external(s, c.id).length + 1}</td>
                    <td>{c.stats.built}</td>
                    <td>{c.stats.destroyed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <span className="eyebrow">DOMINION OVER TIME</span>
            <svg
              className="history-chart"
              viewBox="0 0 500 110"
              role="img"
              aria-label="Score progression for eight commanders"
            >
              {s.commanders.map((c) => (
                <polyline
                  key={c.id}
                  fill="none"
                  stroke={civilizations[c.civilization].color}
                  strokeWidth={c.id === 0 ? 3 : 1.5}
                  points={s.history
                    .map(
                      (h) =>
                        `${(h.time / s.duration) * 500},${105 - (h.scores[c.id] / max) * 100}`,
                    )
                    .join(" ")}
                />
              ))}
            </svg>
          </div>
          <div className="result-stats">
            {Object.entries({
              "Systems controlled": external(s, 0).length + 1,
              "Peak territory": c.stats.peak,
              "Battles fought": c.stats.battles,
              "Battles won": c.stats.wins,
              "Enemy ships destroyed": c.stats.destroyed,
              "Pirates defeated": c.stats.pirates,
              "Guardian participation": c.stats.guardian,
              "Leviathan kills": c.stats.leviathan,
              "Resources mined": c.stats.mined,
              "Ships built": c.stats.built,
              Recoveries: c.stats.recoveries,
            }).map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{number(value)}</strong>
              </div>
            ))}
            <p>
              Guardian:{" "}
              {s.objectives.guardian.killer === null
                ? "Undefeated"
                : ownerName(s, s.objectives.guardian.killer)}
              <br />
              Leviathan:{" "}
              {s.objectives.leviathan.killer === null
                ? "Undefeated"
                : ownerName(s, s.objectives.leviathan.killer)}
            </p>
          </div>
        </div>
        <div className="result-actions">
          <button className="primary-button" onClick={onRestart}>
            Play again
          </button>
          <button className="secondary-button" onClick={onNewSeed}>
            New seed
          </button>
          <button className="secondary-button" onClick={onRestart}>
            Return to dashboard / restart
          </button>
        </div>
      </section>
    </div>
  );
}
export function ShipQuantity({
  quantity,
  setQuantity,
}: {
  quantity: number;
  setQuantity: (n: number) => void;
}) {
  return (
    <label className="quantity-field">
      BUILD QUANTITY
      <select
        aria-label="Build quantity"
        value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
      >
        {[1, 2, 3, 5].map((n) => (
          <option key={n}>{n}</option>
        ))}
      </select>
      <small>Two active berths · ten queued ships · costs shown per ship</small>
    </label>
  );
}
export const shipRole = (kind: keyof typeof ships) =>
  BALANCE.ships[shipClasses.indexOf(kind)].role;
