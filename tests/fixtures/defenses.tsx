// Vite-only test entry: production index.html never imports this fixture.
import ReactDOM from "react-dom/client";
import App from "../../src/App";
import { generateGalaxy } from "../../src/demo/galaxy";
import { homeDefenses } from "../../src/demo/defenses";
import { makeFleet } from "../../src/demo/model";
import { stepMatch } from "../../src/demo/simulation";
import "../../src/styles.css";
import "../../src/quick-conquest.css";
import "../../src/map-view.css";
const s = generateGalaxy("BROWSER-DEFENSES");
s.commanders.forEach((c) => {
  c.bot = false;
});
const mode = new URLSearchParams(location.search).get("mode");
s.systems[8].owner = mode === "siege" ? 1 : 0;
s.resources.credits = s.resources.alloy = 12000;
if (mode === "mine") s.resources.alloy = 0;
if (mode === "bots") {
  s.commanders.forEach((c) => {
    c.bot = true;
  });
  s.resources.credits = 1800;
  s.resources.alloy = 1100;
  s.systems[8].owner = null;
  while (
    s.time < 900 &&
    !s.systems.some(
      (x) => !x.capital && x.owner !== 0 && x.installations.some((d) => d.job),
    )
  )
    stepMatch(s);
  const target = s.systems.find(
    (x) => !x.capital && x.owner !== 0 && x.installations.some((d) => d.job),
  );
  if (!target) throw Error("No bot construction in fixture");
  document.documentElement.dataset.botSystem = target.name;
  s.devReveal = true;
}
if (mode === "repair" || mode === "siege" || mode === "defend") {
  s.systems[8].installations = homeDefenses();
  if (mode === "repair") s.systems[8].installations[0].hp = 400;
  if (mode === "siege")
    s.fleets.push(makeFleet(s, 0, 8, "Siege armada", [4, 4, 3, 1]));
  if (mode === "defend")
    s.fleets.push(makeFleet(s, 1, 8, "Raiding escort", [1, 0, 0, 0]));
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <App initialState={s} />,
);
