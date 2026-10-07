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
  const field = page.getByRole("button", {
    name: "Nova Prime asteroid field",
    exact: true,
  });
  await expect(field.locator("image")).toHaveCount(1);
  expect((await field.locator("image").boundingBox())!.width).toBeGreaterThan(
    120,
  );
  await field.press("Space");
  await expect(page.locator(".system-title h1")).toHaveText("Nova Prime Belt");
  await page.getByRole("button", { name: "Hide system panel" }).click();
  await page.getByRole("button", { name: "Hide command panel" }).click();
  expect(await stage.boundingBox()).toEqual(initial);
  await page.getByRole("button", { name: "Zoom out", exact: true }).click();
  await page.getByRole("button", { name: "Zoom out", exact: true }).click();
  await expect(home.locator(".planet-texture").first()).toBeVisible();
  await expect(field.locator("image")).toBeVisible();
  await page.getByRole("button", { name: "View entire galaxy" }).click();
  await expect(page.locator("[data-system]")).toHaveCount(28);
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
      name: "Select Mining Group Alpha",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hide command panel" }).click();
  await page.getByRole("button", { name: "System", exact: true }).click();
  await expect(page.locator(".system-title h1")).toHaveText("Nova Prime");
  await page.getByRole("button", { name: "Hide system panel" }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
});

test("the entire belt is clickable and opens its mining order", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".asteroid-opportunity").click();
  const field = page.getByRole("button", {
    name: "Nova Prime asteroid field",
    exact: true,
  });
  await expect(field).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(async () => {
      const bounds = (await field.locator(".field-hit-area").boundingBox())!;
      return Math.abs(bounds.x + bounds.width / 2 - 720);
    })
    .toBeLessThan(2);
  for (const fraction of [0.08, 0.5, 0.92]) {
    await page
      .getByRole("button", { name: "View system", exact: true })
      .click();
    await expect(field).toHaveAttribute("aria-pressed", "false");
    const box = (await field.locator(".field-hit-area").boundingBox())!;
    await page.mouse.click(
      box.x + box.width * fraction,
      box.y + box.height * 0.45,
    );
    await expect(field).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".system-title h1")).toHaveText(
      "Nova Prime Belt",
    );
  }
  await page
    .getByRole("button", { name: "Send mining fleet", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Nova Prime Belt");
  await page.getByRole("button", { name: "Close dialog" }).click();
  // A drag across the belt must pan the map without selecting it.
  await page.getByRole("button", { name: "View system", exact: true }).click();
  const box = (await field.locator(".field-hit-area").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 70,
    box.y + box.height / 2 + 50,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect(field).toHaveAttribute("aria-pressed", "false");
});
