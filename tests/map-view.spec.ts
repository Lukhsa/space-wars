import { test, expect } from "@playwright/test";

test("galaxy fills the viewport, keeps textured bodies visible and supports overlay controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const stage = page.locator(".galaxy-stage");
  const initial = (await stage.boundingBox())!;
  expect((initial.width * initial.height) / (1440 * 900)).toBeGreaterThan(0.9);
  const home = page.locator('[data-system="0"]');
  await expect(home.locator(".orbital-planet")).toHaveCount(3);
  const planet = (await home.locator(".planet-texture").first().boundingBox())!;
  expect(planet.width).toBeGreaterThan(24);
  const sun = (await home.locator(".star-art").first().boundingBox())!;
  expect(
    Math.hypot(
      planet.x + planet.width / 2 - sun.x - sun.width / 2,
      planet.y + planet.height / 2 - sun.y - sun.height / 2,
    ),
  ).toBeGreaterThan(75);
  const field = page
    .getByRole("button", {
      name: /Nova Prime asteroid /,
    })
    .first();
  await expect(field.locator("image")).toHaveCount(1);
  expect((await field.locator("image").boundingBox())!.width).toBeLessThan(
    planet.width,
  );
  await field.press("Space");
  await expect(page.locator(".system-title h1")).toHaveText("Nova Prime Drift");
  await page.getByRole("button", { name: "Hide system panel" }).click();
  await page.getByRole("button", { name: "Hide command panel" }).click();
  expect(await stage.boundingBox()).toEqual(initial);
  await page.getByRole("button", { name: "Zoom out", exact: true }).click();
  await page.getByRole("button", { name: "Zoom out", exact: true }).click();
  await expect(home.locator(".planet-texture").first()).toBeVisible();
  await expect(field.locator("image")).toBeVisible();
  await page.getByRole("button", { name: "View entire galaxy" }).click();
  await expect(page.locator("[data-system]")).toHaveCount(56);
  const appearances = await page
    .locator(".resource-asteroid-art")
    .evaluateAll((images) => images.map((image) => image.getAttribute("href")));
  expect(new Set(appearances).size).toBe(9);
  expect(
    appearances.every((path) => path?.startsWith("/assets/asteroid_")),
  ).toBe(true);
  await page.getByRole("button", { name: "Focus homeworld" }).click();
  await expect
    .poll(() =>
      page
        .locator(".galaxy-svg > g")
        .evaluate(
          (el) => (el as SVGGElement).transform.baseVal.getItem(0).matrix.e,
        ),
    )
    .toBe(720);
  await page.setViewportSize({ width: 1100, height: 844 });
  await expect
    .poll(() =>
      page
        .locator(".galaxy-svg > g")
        .evaluate(
          (el) => (el as SVGGElement).transform.baseVal.getItem(0).matrix.e,
        ),
    )
    .toBe(550);
  expect(errors).toEqual([]);
});

test("phone opens onto the map with command panels available on demand", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const bounds = (await page.locator(".galaxy-stage").boundingBox())!;
  expect((bounds.width * bounds.height) / (390 * 844)).toBeGreaterThan(0.87);
  await expect(page.locator(".system-inspector")).toBeHidden();
  await expect(page.locator(".operations-panel")).toBeHidden();
  await page.getByRole("button", { name: "Command", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Select 1st Expeditionary",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hide command panel" }).click();
  await page.getByRole("button", { name: "System", exact: true }).click();
  await expect(page.locator(".system-title h1")).toHaveText("Nova Prime I");
  await page.getByRole("button", { name: "Hide system panel" }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
});

test("small deposits select civilian mining without a military order dialog", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".asteroid-opportunity").click();
  const miner = page.getByRole("region", { name: "Civilian mining" });
  await expect(miner).toContainText("1/3 CRAFT");
  await page.getByRole("button", { name: "Mine once", exact: true }).click();
  await expect(miner).toContainText("Outbound");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Recall miner", exact: true }).click();
  await expect(miner).toContainText("Idle");
});
