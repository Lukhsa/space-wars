import { asset, MINER_ART } from "../demo/catalog";
import { BALANCE } from "../demo/balance";
import { commissionMiner, orderMiner, recallMiner } from "../demo/mining";
import type { DemoState } from "../demo/types";
import type { Mutate } from "./QuickConquest";
export function MiningPanel({
  state: s,
  system,
  deposit,
  selectedMiner,
  onMiner,
  mutate,
}: {
  state: DemoState;
  system: number;
  deposit: number | null;
  selectedMiner: number | null;
  onMiner: (id: number) => void;
  mutate: Mutate;
}) {
  const x = s.systems[system],
    miners = s.miners.filter((m) => m.system === system && m.owner === 0),
    m = miners.find((m) => m.id === selectedMiner) ?? miners[0],
    d = x.deposits.find((d) => d.id === deposit) ?? x.deposits[0];
  const pirates = s.fleets.some(
    (f) => f.system === system && f.neutral === "pirates",
  );
  return (
    <section className="planetary-defenses" aria-label="Civilian mining">
      <span className="eyebrow">
        CIVILIAN MINING · {miners.length}/{BALANCE.mining.perSystem} CRAFT
      </span>
      <img
        className="mining-craft-portrait"
        src={asset(MINER_ART)}
        alt="Human civilian mining craft"
      />
      <p>
        {x.deposits.length} deposits ·{" "}
        {d
          ? `${d.reserves} Alloy remaining in selected deposit`
          : "Deposits replenishing"}
      </p>
      {pirates && (
        <p className="defense-alert">
          Pirates intercept returning cargo. Send a combat fleet to clear the
          resource lanes.
        </p>
      )}
      {x.owner === 0 && (
        <>
          <button
            disabled={
              miners.length >= BALANCE.mining.perSystem ||
              s.resources.credits < BALANCE.mining.credits ||
              s.resources.alloy < BALANCE.mining.alloy
            }
            onClick={() => mutate((t) => commissionMiner(t, 0, system))}
          >
            Commission miner · {BALANCE.mining.credits} C /{" "}
            {BALANCE.mining.alloy} A
          </button>
          {miners.length > 0 && (
            <label className="miner-picker">
              Mining craft
              <select
                aria-label="Mining craft"
                value={m.id}
                onChange={(e) => onMiner(Number(e.target.value))}
              >
                {miners.map((craft) => (
                  <option key={craft.id} value={craft.id}>
                    Miner {craft.berth + 1} · {craft.status} · {craft.cargo}{" "}
                    Alloy
                  </option>
                ))}
              </select>
            </label>
          )}
        </>
      )}
      {x.owner !== 0 ? (
        <p>
          Control a strict majority of planets to operate this system’s mining
          craft.
        </p>
      ) : m ? (
        <>
          <strong>
            {m.status} · Hull {m.hp}/{BALANCE.mining.hull}
          </strong>
          <p>Cargo aboard: {m.cargo} Alloy · paid on return</p>
          {m.status === "Idle" && m.repeat && (
            <>
              <p>Waiting for deposits to replenish.</p>
              <button
                onClick={() => mutate((t) => recallMiner(t, 0, system, m.id))}
              >
                Stop repeat mining
              </button>
            </>
          )}
          {m.status !== "Idle" && (
            <progress
              value={m.elapsed}
              max={m.status === "Extracting" ? 24 : 8}
            />
          )}
          {m.status === "Idle" ? (
            <div className="action-pair">
              <button
                disabled={!d}
                onClick={() =>
                  mutate((t) => orderMiner(t, 0, system, d!.id, false, m.id))
                }
              >
                Mine once
              </button>
              <button
                disabled={!d}
                onClick={() =>
                  mutate((t) => orderMiner(t, 0, system, d!.id, true, m.id))
                }
              >
                Continue mining
              </button>
            </div>
          ) : (
            <button
              onClick={() => mutate((t) => recallMiner(t, 0, system, m.id))}
            >
              Recall miner
            </button>
          )}
          <small>
            8s outbound · 24s extraction · 8s return. Military fleets escort and
            fight; miners do not occupy a fleet slot.
          </small>
        </>
      ) : null}
    </section>
  );
}
