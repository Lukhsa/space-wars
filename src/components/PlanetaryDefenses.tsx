import { BALANCE } from "../demo/balance";
import { asset } from "../demo/catalog";
import {
  constructDefense,
  contested,
  defenseAssets,
  defenseKinds,
  defenseNames,
  defenseQuote,
  defenseSpec,
} from "../demo/defenses";
import { visibleSystems } from "../demo/model";
import type { DemoState } from "../demo/types";
import type { Mutate } from "./QuickConquest";

export function PlanetaryDefenses({
  state: s,
  selected,
  planet,
  onPlanet,
  mutate,
}: {
  state: DemoState;
  selected: number;
  planet: number;
  onPlanet: (n: number) => void;
  mutate: Mutate;
}) {
  const x = s.systems[selected];
  if (planet < 0) return null;
  const own = x.planets[planet]?.owner === 0,
    blocked = contested(s, x, planet),
    busy = x.installations.some((d) => d.job);
  if (!own && !s.devReveal && !visibleSystems(s, 0).has(selected)) return null;
  return (
    <section className="planetary-defenses" aria-label="Planetary defenses">
      <span className="eyebrow">PLANETARY DEFENSES</span>
      <label>
        Planet{" "}
        <select
          aria-label="Defense planet"
          value={planet}
          onChange={(e) => onPlanet(Number(e.target.value))}
        >
          {x.planets.map((_, i) => (
            <option key={i} value={i}>
              Planet {i + 1}
              {i === 0 && x.capital ? " · Homeworld" : ""}
            </option>
          ))}
        </select>
      </label>
      {blocked && (
        <p className="defense-alert">
          Under attack · installations firing · construction paused
        </p>
      )}
      {defenseKinds.map((kind) => {
        const d = x.installations.find(
          (d) => d.planet === planet && d.kind === kind,
        );
        const q = defenseQuote(x, planet, kind),
          repair = defenseQuote(x, planet, kind, true);
        const max = d?.level ? defenseSpec(kind, d.level).hull : 0;
        const state = d?.job
          ? d.job.action === "repair"
            ? "Repairing"
            : d.job.action === "upgrade"
              ? "Upgrading"
              : "Constructing"
          : !d?.level
            ? "Not built"
            : d.hp <= 0
              ? "Destroyed"
              : d.hp < max
                ? "Damaged"
                : "Operational";
        const label = !d?.hp ? (d?.level ? "Rebuild" : "Build") : "Upgrade";
        return (
          <article
            key={kind}
            className="defense-card"
            data-testid={`defense-${kind}`}
          >
            <img src={asset(defenseAssets[kind])} alt={defenseNames[kind]} />
            <div>
              <strong>{defenseNames[kind]}</strong>
              <small>
                Level {d?.level ?? 0} / 3 · {state}
              </small>
              <small>
                {kind === "station"
                  ? "Durable protection · anti-escort weapons"
                  : `Anti-capital weapon · fires every ${BALANCE.defenses.railgunCadence}s`}
              </small>
              {!!d?.level && (
                <>
                  <progress
                    aria-label={`${kind} hull`}
                    value={d.hp}
                    max={max}
                  />
                  <small>
                    Hull {Math.ceil(d.hp)} / {max}
                  </small>
                </>
              )}
            </div>
            {d?.job && (
              <div className="defense-work">
                <progress
                  aria-label={`${kind} construction`}
                  value={d.job.elapsed}
                  max={d.job.duration}
                />
                <small>
                  {d.job.duration - d.job.elapsed}s remaining · Level{" "}
                  {d.job.level}
                </small>
              </div>
            )}
            {own && !d?.job && (
              <div className="defense-actions">
                {q && (
                  <>
                    <small>
                      Next: Level {q.level} · {q.credits} Credits / {q.alloy}{" "}
                      Alloy · {q.duration}s
                    </small>
                    <button
                      disabled={
                        busy ||
                        blocked ||
                        s.status !== "playing" ||
                        s.resources.credits < q.credits ||
                        s.resources.alloy < q.alloy
                      }
                      onClick={() =>
                        mutate((t) =>
                          constructDefense(t, 0, selected, planet, kind),
                        )
                      }
                    >
                      {label} {kind === "station" ? "station" : "railgun"}
                    </button>
                  </>
                )}
                {d && d.hp > 0 && d.hp < max && repair && (
                  <button
                    disabled={
                      busy ||
                      blocked ||
                      s.status !== "playing" ||
                      s.resources.credits < repair.credits ||
                      s.resources.alloy < repair.alloy
                    }
                    onClick={() =>
                      mutate((t) =>
                        constructDefense(t, 0, selected, planet, kind, true),
                      )
                    }
                  >
                    Repair {kind} · {repair.credits} C / {repair.alloy} A ·{" "}
                    {repair.duration}s
                  </button>
                )}
              </div>
            )}
          </article>
        );
      })}
      {own && (
        <small>
          One construction lane per system · two crews per commander. Additional
          planets cost more.
        </small>
      )}
    </section>
  );
}
