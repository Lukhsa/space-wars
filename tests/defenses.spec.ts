import { test, expect, type Page } from "@playwright/test";
test("bots visibly construct defenses through the shared rules", async ({
  page,
}) => {
  await start(page, "bots");
  const name = await page.locator("html").getAttribute("data-bot-system");
  await find(page, name!);
  await page
    .getByLabel("Defense planet")
    .selectOption(
      (await page.locator("html").getAttribute("data-bot-planet"))!,
    );
  await expect(page.locator(".planetary-defenses")).toContainText(
    "Constructing",
  );
  await expect(
    page.locator('.planetary-defenses progress[aria-label$="construction"]'),
  ).toHaveCount(1);
  await page.clock.runFor(6100);
  await expect(page.locator(".planetary-defenses")).toContainText(
    /Operational|Damaged|Upgrading/,
  );
});
async function start(page: Page, mode = "build") {
  const now = new Date();
  await page.clock.install({ time: now });
  await page.clock.pauseAt(now);
  await page.goto(`/tests/fixtures/defenses.html?mode=${mode}`);
  await page.getByRole("button", { name: "DEV", exact: true }).click();
  await page.getByRole("button", { name: "×10", exact: true }).click();
  await page.getByRole("button", { name: "Close developer controls" }).click();
}
async function find(page: Page, name: string) {
  await page.getByLabel("Find a system").fill(name);
  await page
    .locator(".search-results button")
    .filter({ hasText: name })
    .first()
    .click();
}
test("home structures, planetary selection, build, upgrade, repair, costs and artwork", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  for (const kind of ["station", "railgun"])
    await expect(page.getByTestId(`defense-${kind}`)).toContainText(
      "Level 1 / 3 · Operational",
    );
  expect(
    await page
      .locator(".defense-card img")
      .evaluateAll((imgs) =>
        imgs.every((i) => (i as HTMLImageElement).naturalWidth > 0),
      ),
  ).toBe(true);
  await find(page, "Nexus");
  await page.getByLabel("Defense planet").selectOption("1");
  await expect(page.getByTestId("defense-station")).toContainText("375 Alloy");
  await page.getByLabel("Defense planet").selectOption("0");
  await page
    .getByRole("button", { name: "Build station", exact: true })
    .click();
  await expect(page.getByTestId("defense-station")).toContainText(
    "Constructing",
  );
  await expect(
    page.getByRole("button", { name: "Build railgun", exact: true }),
  ).toBeDisabled();
  await page.clock.runFor(6100);
  await expect(page.getByTestId("defense-station")).toContainText(
    "Level 1 / 3 · Operational",
  );
  await page
    .getByRole("button", { name: "Upgrade station", exact: true })
    .click();
  await page.clock.runFor(9100);
  await expect(page.getByTestId("defense-station")).toContainText(
    "Level 2 / 3 · Operational",
  );
  await page
    .getByRole("button", { name: "Build railgun", exact: true })
    .click();
  await page.clock.runFor(4600);
  await expect(page.getByTestId("defense-railgun")).toContainText(
    "Level 1 / 3 · Operational",
  );
  await page.screenshot({
    path: "docs/screenshots/planetary-defense-construction.png",
  });
  expect(errors).toEqual([]);
});
test("surviving defenses remain damaged and paid repair takes time", async ({
  page,
}) => {
  await start(page, "defend");
  await find(page, "Nexus");
  await page.clock.runFor(200);
  await expect(page.locator(".defense-alert")).toContainText("Under attack");
  await expect(page.locator(".battle-tray")).toContainText("Nexus");
  await page.clock.runFor(4000);
  await expect(page.locator(".planetary-defenses")).toContainText("Damaged");
  const button = page
    .getByRole("button", { name: /Repair (station|railgun)/ })
    .first();
  await button.click();
  await expect(page.locator(".planetary-defenses")).toContainText("Repairing");
  await page.clock.runFor(6100);
  await expect(page.locator(".planetary-defenses")).not.toContainText(
    "Repairing",
  );
});
test("siege destroys defenses, blocks early capture and clears hostile ruins", async ({
  page,
}) => {
  await start(page, "siege");
  await find(page, "Nexus");
  await page.clock.runFor(100);
  await expect(page.locator(".relation")).not.toHaveText("YOUR TERRITORY");
  await expect(page.locator(".planetary-defenses")).toContainText(
    "Under attack",
  );
  await page.screenshot({
    path: "docs/screenshots/planetary-defense-battle.png",
  });
  await page.clock.runFor(2000);
  await expect(page.locator(".planetary-defenses")).toContainText("Destroyed");
  await page.clock.runFor(5000);
  await expect(page.locator(".relation")).toHaveText("YOUR TERRITORY");
  await expect(page.getByTestId("defense-station")).toContainText("Not built");
  await expect(page.getByTestId("defense-railgun")).toContainText("Not built");
});
test("repeat mining pays multiple cycles, supplies construction and can be cancelled", async ({
  page,
}) => {
  await start(page, "mine");
  await page.locator(".asteroid-opportunity").click();
  await page
    .getByRole("button", { name: "Continue mining", exact: true })
    .click();
  await page.clock.runFor(8100);
  await expect(page.locator(".event-items")).toContainText("Cargo delivered");
  await expect(
    page.getByRole("region", { name: "Civilian mining" }),
  ).toContainText("Outbound");
  await page.getByRole("button", { name: "Recall miner", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Civilian mining" }),
  ).toContainText("Idle");
  await page.getByRole("button", { name: "Build a ship", exact: true }).click();
  await page.getByLabel("Build quantity").selectOption("2");
  await page
    .locator(".ship-option")
    .first()
    .getByRole("button", { name: "Build", exact: true })
    .click();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.clock.runFor(2600);
  await expect(page.getByTestId("reserve-count")).toHaveText("2");
});
