import { randomFrom } from "./random";

// Existing game artwork: material, silhouette and scale vary independently of
// mining rewards. Every site has one dominant, selectable asteroid.
export const ASTEROID_ART = [
  {
    art: "asteroid_large_01.webp",
    material: "Fractured core",
    color: "#d78a5a",
    size: 78,
  },
  {
    art: "asteroid_large_02.webp",
    material: "Icebound mass",
    color: "#80cbd9",
    size: 90,
  },
  {
    art: "asteroid_large_03.webp",
    material: "Crystal-veined mass",
    color: "#ab93d6",
    size: 82,
  },
  {
    art: "asteroid_medium_01.png",
    material: "Pitted iron",
    color: "#c3a581",
    size: 64,
  },
  {
    art: "asteroid_medium_02.webp",
    material: "Cobalt outcrop",
    color: "#75b8cd",
    size: 68,
  },
  {
    art: "asteroid_medium_03.webp",
    material: "Layered ore",
    color: "#ada698",
    size: 62,
  },
  {
    art: "asteroid_small_01.png",
    material: "Carbon fragment",
    color: "#9ca8b7",
    size: 44,
  },
  {
    art: "asteroid_small_02.webp",
    material: "Iron fragment",
    color: "#b49b80",
    size: 51,
  },
  {
    art: "asteroid_small_03.webp",
    material: "Ice fragment",
    color: "#94cdd9",
    size: 49,
  },
] as const;

export function asteroidAppearance(seed: string, system: number) {
  const random = randomFrom(`resource-art:${seed}`);
  const offset = Math.floor(random() * ASTEROID_ART.length);
  const variant = (system * 5 + offset) % ASTEROID_ART.length;
  const local = randomFrom(`resource-detail:${seed}:${system}`);
  const drift = system % 4 === 0;
  return {
    ...ASTEROID_ART[variant],
    variant,
    drift,
    suffix: drift ? "Drift" : "Deposit",
    size:
      Math.max(drift ? 78 : 0, ASTEROID_ART[variant].size) *
      (0.9 + local() * 0.2),
    angle: (local() - 0.5) * 105,
    fragments: drift
      ? Array.from({ length: 24 }, () => {
          const angle = local() * Math.PI * 2;
          const radius = 28 + local() * 56;
          return {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius * 0.7,
            size: 0.4 + local() * 1.3,
            opacity: 0.1 + local() * 0.3,
          };
        })
      : [],
  };
}

export const asteroidSiteName = (seed: string, system: number, name: string) =>
  `${name} ${asteroidAppearance(seed, system).suffix}`;
