import { test, expect } from "@playwright/test";

test("dashboard camera, inspection, mining, production and capture work in the browser", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Nova Prime", exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-territory="0"]')).toBeVisible();
  await page.getByRole("button", { name: "DEV", exact: true }).click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("button", { name: "Close developer controls" }).click();
  const svg = page.getByRole("application");
  const bounds = (await svg.boundingBox())!;
  await page.mouse.move(
    bounds.x + bounds.width * 0.45,
    bounds.y + bounds.height * 0.4,
  );
  await page.mouse.wheel(0, 500);
  await expect(page.locator(".map-tools>span")).not.toHaveText("82%");
  const coordinates = await page.locator(".coordinate-value").textContent();
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width * 0.45 + 100,
    bounds.y + bounds.height * 0.4 + 70,
    { steps: 12 },
  );
  await page.mouse.up();
  await expect(page.locator(".coordinate-value")).not.toHaveText(coordinates!);
  await page.getByRole("button", { name: "Focus homeworld" }).click();
  await page
    .getByRole("button", { name: "Nexus, neutral system", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Nexus", exact: true }),
  ).toBeVisible();
  const territory = await page
    .locator('[data-territory="0"] path')
    .first()
    .getAttribute("d");
  await page.getByRole("button", { name: "Claim system", exact: true }).click();
  await expect(page.locator(".route-summary")).toHaveText(/Nova Prime.*Nexus/);
  await page.getByRole("button", { name: "Launch assault" }).click();
  await expect(page.locator(".fleet-card").first()).toContainText("Attacking");
  await page.getByRole("button", { name: "DEV", exact: true }).click();
  await page.getByRole("button", { name: "×5", exact: true }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.getByRole("button", { name: "Close developer controls" }).click();
  await expect(page.locator(".relation")).toContainText("YOUR TERRITORY", {
    timeout: 20000,
  });
  await expect(
    page.locator('[data-territory="0"] path').first(),
  ).not.toHaveAttribute("d", territory!);
  await page.getByRole("button", { name: "Select Mining Group Alpha" }).click();
  await page.locator(".asteroid-opportunity").click();
  await expect(
    page.getByRole("heading", { name: "Pallas Belt" }),
  ).toBeVisible();
  const alloy = Number(
    (await page.getByTestId("alloy").textContent())!.replaceAll(",", ""),
  );
  await page.getByRole("button", { name: "Send mining fleet" }).click();
  await page
    .getByRole("button", { name: "Deploy fleet", exact: false })
    .click();
  await expect(page.getByTestId("alloy")).not.toHaveText(
    alloy.toLocaleString("en-US"),
    { timeout: 15000 },
  );
  await page.getByRole("button", { name: "Build a ship" }).click();
  const reserve = Number(await page.getByTestId("reserve-count").textContent());
  await page
    .locator(".ship-option")
    .first()
    .getByRole("button", { name: "Build", exact: true })
    .click();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(page.getByTestId("reserve-count")).toHaveText(
    String(reserve + 1),
    { timeout: 10000 },
  );
  expect(errors).toEqual([]);
});

test("rival inspection, clickable events, seed changes, reset and smaller viewports", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "INTELLIGENCE", exact: true }).click();
  await page.getByRole("button", { name: "Solari", exact: false }).click();
  await expect(page.locator(".relation")).toContainText("RIVAL TERRITORY");
  await page.locator(".event-item").first().click();
  await page.getByRole("button", { name: "DEV", exact: true }).click();
  const before = await page
    .locator('[data-territory="1"] path')
    .getAttribute("d");
  await page.getByLabel("GALAXY SEED").fill("TEST-NEW-FRONTIER");
  await page.getByRole("button", { name: "Regenerate galaxy" }).click();
  await expect(page.locator('[data-territory="1"] path')).not.toHaveAttribute(
    "d",
    before!,
  );
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Nova Prime", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close developer controls" }).click();
  await page.setViewportSize({ width: 1100, height: 820 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    1100,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await expect(page.getByRole("application")).toBeVisible();
});

test("fleets visibly travel to an asteroid, extract and receive a new move order", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "DEV", exact: true }).click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("button", { name: "×5", exact: true }).click();
  await page.getByRole("button", { name: "Close developer controls" }).click();
  await page.getByLabel("Find a system").fill("Pallas");
  await page.locator(".search-results button").click();
  await page.locator(".asteroid-opportunity").click();
  await page.getByRole("button", { name: "Send mining fleet" }).click();
  await page.getByRole("button", { name: "Deploy fleet" }).click();
  const card = page.locator(".fleet-card").first();
  await expect(card).toContainText("Moving");
  const marker = page.getByRole("button", {
    name: "1st Expeditionary fleet",
    exact: true,
  });
  const position = await marker.getAttribute("style");
  await page.getByRole("button", { name: "DEV", exact: true }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.getByRole("button", { name: "Close developer controls" }).click();
  await expect(marker).not.toHaveAttribute("style", position!);
  await expect(card).toContainText("Mining", { timeout: 18000 });
  await expect(card).toContainText("Idle", { timeout: 12000 });
  await page.getByLabel("Find a system").fill("Nova Prime");
  await page.locator(".search-results button").click();
  await page.getByRole("button", { name: "Send fleet", exact: true }).click();
  await page.getByRole("button", { name: "Confirm orders" }).click();
  await expect(card).toContainText("Moving");
  await expect(card).toContainText("Defending", { timeout: 18000 });
  await expect(card).toContainText("Nova Prime");
  await expect(page.locator(".event-items")).toContainText(
    /Fleet arrived|Mining complete|Territory changed|Fleet orders confirmed/,
  );
});
