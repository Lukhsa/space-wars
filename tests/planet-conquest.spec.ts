import { test, expect } from "@playwright/test";
test("selects two fleets, attacks one planet and produces at a forward shipyard", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const now = new Date();
  await page.clock.install({ time: now });
  await page.clock.pauseAt(now);
  await page.goto("/tests/fixtures/defenses.html?mode=orders");
  await page.getByRole("button", { name: "DEV", exact: true }).click();
  await page.getByRole("button", { name: "×10", exact: true }).click();
  await page.getByRole("button", { name: "Close developer controls" }).click();
  await page
    .getByRole("button", { name: "1st Expeditionary fleet", exact: true })
    .press("Enter");
  await page
    .getByRole("button", { name: "Second Expeditionary fleet", exact: true })
    .press("Shift+Enter");
  await expect(page.locator(".selection-hint")).toContainText(
    "2 fleet(s) selected",
  );
  await page.getByRole('button',{name:'Select Second Expeditionary',exact:true}).click({modifiers:['Shift']});
  await expect(page.locator('.selection-hint')).toContainText('1 fleet(s) selected');
  await page.getByRole('button',{name:'Select Second Expeditionary',exact:true}).click({modifiers:['Shift']});
  await expect(page.locator('.selection-hint')).toContainText('2 fleet(s) selected');
  await page.getByLabel("Find a system").fill("Caldera");
  await page
    .locator(".search-results button")
    .filter({ hasText: "Caldera" })
    .first()
    .click();
  await page.clock.runFor(1000);
  await page.locator('[data-system="16"] [data-planet="1"]').press("Enter");
  await expect(page.locator(".selection-hint")).toHaveCount(0);
  await page.clock.runFor(12000);
  await expect(page.locator(".system-title h1")).toHaveText("Caldera II");
  await expect(page.locator(".relation")).toHaveText("YOUR TERRITORY");
  await expect(page.locator(".system-details")).toContainText(
    "System control: Contested",
  );
  await page.locator('[data-system="16"] [data-planet="0"]').press("Enter");
  await expect(page.locator(".relation")).toHaveText("NEUTRAL FRONTIER");
  await page.getByRole("button", { name: "Build a ship", exact: true }).click();
  await page.getByLabel("Production shipyard").selectOption("24:0");
  await page
    .locator(".ship-option")
    .first()
    .getByRole("button", { name: "Build", exact: true })
    .click();
  await page.clock.runFor(2600);
  await expect(page.locator(".modal-bottom-note")).toContainText(
    "3 ships in reserve",
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "FLEETS", exact: true }).click();
  await page.getByLabel("Formation shipyard").selectOption("24:0");
  await page.getByLabel("Frigate allocation").fill("3");
  await page.getByRole("button", { name: "Create fleet", exact: true }).click();
  await expect(page.locator(".registry-row").last()).toContainText("Aureole");
  await page.screenshot({ path: "docs/screenshots/planet-forward-yard.png" });
  expect(errors).toEqual([]);
});
