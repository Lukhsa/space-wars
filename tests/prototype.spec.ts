import { test, expect, type Page } from "@playwright/test";

async function dev(page: Page) {
  await page.getByRole("button", { name: "DEV", exact: true }).click();
}
async function closeDev(page: Page) {
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
async function start(page: Page) {
  const now = new Date();
  await page.clock.install({ time: now });
  await page.clock.pauseAt(now);
  await page.goto("/");
  await dev(page);
  await page.getByRole("button", { name: "×10", exact: true }).click();
  await closeDev(page);
}

test("opening: inspect eight commanders, capture, mine, queue ships, form fleet and chat", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  await expect(page.locator(".standings-list>button")).toHaveCount(8);
  await expect(page.getByTestId("match-timer")).toHaveText("40:00");
  await find(page, "Nexus");
  await page.getByRole("button", { name: "Claim system", exact: true }).click();
  await expect(page.locator(".route-summary")).toContainText("Nova Prime");
  await page.getByRole("button", { name: "Launch assault" }).click();
  await page.clock.runFor(7000);
  await expect(page.locator(".relation")).toHaveText("YOUR TERRITORY");
  await page
    .getByRole("button", { name: "Select Mining Group Alpha", exact: true })
    .click();
  await page.locator(".asteroid-opportunity").click();
  await page.getByRole("button", { name: "Send mining fleet" }).click();
  await page
    .getByRole("button", { name: "Deploy fleet", exact: false })
    .click();
  await page.clock.runFor(4100);
  await expect(page.locator(".event-items")).toContainText("Mining complete");
  await page.getByRole("button", { name: "Build a ship", exact: true }).click();
  await page.getByLabel("Build quantity").selectOption("3");
  await page
    .locator(".ship-option")
    .first()
    .getByRole("button", { name: "Build", exact: true })
    .click();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.clock.runFor(5100);
  await expect(page.getByTestId("reserve-count")).toHaveText("3");
  await page.getByRole("button", { name: "FLEETS", exact: true }).click();
  await page.getByLabel("Frigate allocation").fill("3");
  await page.getByRole("button", { name: "Create fleet", exact: true }).click();
  await expect(page.getByRole("dialog").locator(".registry-row")).toHaveCount(
    3,
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "GLOBAL CHAT", exact: true }).click();
  await page.getByLabel("Global chat message").fill("The Core is contested.");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.locator(".chat-messages")).toContainText(
    "The Core is contested.",
  );
  await page.screenshot({
    path: "docs/screenshots/quick-conquest-opening.png",
  });
  expect(errors).toEqual([]);
});

test("camera, protected homes, seed controls, pause and responsive layout", async ({
  page,
}) => {
  await page.goto("/");
  await dev(page);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await closeDev(page);
  const svg = page.getByRole("application"),
    bounds = (await svg.boundingBox())!;
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.wheel(0, -450);
  await expect(page.locator(".map-tools>span")).not.toHaveText("65%");
  const before = await page.locator(".coordinate-value").textContent();
  await page.mouse.down();
  await page.mouse.move(bounds.x + 100, bounds.y + 100, { steps: 12 });
  await page.mouse.up();
  await expect(page.locator(".coordinate-value")).not.toHaveText(before!);
  await find(page, "Sera");
  await expect(
    page.getByRole("button", { name: "Protected home", exact: true }),
  ).toBeDisabled();
  await dev(page);
  await page.getByLabel("GALAXY SEED").fill("SECOND-FRONTIER");
  await page
    .getByRole("button", { name: "Regenerate galaxy", exact: true })
    .click();
  await expect(page.getByLabel("GALAXY SEED")).toHaveValue("SECOND-FRONTIER");
  await closeDev(page);
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    await expect(svg).toBeVisible();
  }
});

test("map battle stays playable; stances and a timed retreat preserve survivors", async ({
  page,
}) => {
  await start(page);
  await find(page, "Caldera");
  await page.getByRole("button", { name: "Claim system", exact: true }).click();
  const eta = (
    await page.locator(".order-stats>div").last().locator("strong").innerText()
  )
    .split(":")
    .map(Number);
  await page.getByRole("button", { name: "Launch assault" }).click();
  await page.clock.runFor((eta[0] * 60 + eta[1] + 1) * 100);
  await expect(page.locator(".battle-tray")).toContainText("Caldera");
  await expect(page.locator(".fleet-card").first()).toContainText("Battle");
  await page
    .getByLabel("Fleet stance", { exact: true })
    .selectOption("Defensive");
  await page.getByRole("button", { name: "Retreat", exact: true }).click();
  await expect(page.locator(".fleet-orders")).toContainText("Withdrawing");
  await page.screenshot({ path: "docs/screenshots/quick-conquest-battle.png" });
  // The shipyard and chat remain usable during a fight.
  await page.getByRole("button", { name: "Build a ship", exact: true }).click();
  await page
    .locator(".ship-option")
    .first()
    .getByRole("button", { name: "Build", exact: true })
    .click();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.clock.runFor(300);
  await expect(page.locator(".fleet-card").first()).toContainText("Retreating");
  await page.clock.runFor(400);
  await expect(page.locator(".fleet-card").first()).toContainText("Moving");
  await page.clock.runFor(13000);
  await expect(page.locator(".fleet-card").first()).toContainText("Nova Prime");
  await expect(page.locator(".fleet-card").first()).toContainText("Defending");
  await page.getByRole("button", { name: "FLEETS", exact: true }).click();
  await page
    .locator(".registry-row")
    .first()
    .getByRole("button", { name: "Reinforce" })
    .click();
  await page.getByRole("button", { name: "Close dialog" }).click();
});

test("normal rules reach objectives, simultaneous battles, endgame and final leaderboard", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  await dev(page);
  await page.getByLabel("8 bots / observer (next restart)").check();
  await page
    .getByRole("button", { name: "Restart match", exact: true })
    .click();
  await page.getByLabel("Jump to phase").selectOption("2");
  await expect(page.locator(".match-hud")).toContainText("WAR");
  await expect(page.locator(".objective-status").first()).toContainText(
    "ACTIVE",
  );
  await page.getByLabel("Jump to phase").selectOption("3");
  await expect(page.locator(".match-hud")).toContainText("ESCALATION");
  await closeDev(page);
  await page.getByRole("button", { name: "View entire galaxy" }).click();
  await page.clock.runFor(1000);
  await page.screenshot({
    path: "docs/screenshots/quick-conquest-escalation.png",
  });
  await dev(page);
  await page.getByLabel("Jump to phase").selectOption("4");
  await expect(page.locator(".match-hud")).toContainText("ENDGAME");
  await page
    .getByRole("button", { name: "Simulate to match end", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Match results" }),
  ).toBeVisible();
  await expect(page.locator(".match-result tbody tr")).toHaveCount(8);
  await expect(page.locator(".result-stats")).toContainText("Resources mined");
  await page.screenshot({ path: "docs/screenshots/quick-conquest-result.png" });
  await page.getByRole("button", { name: "New seed", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Match results" })).toHaveCount(
    0,
  );
  await expect(page.getByTestId("match-timer")).toHaveText("40:00");
  expect(errors).toEqual([]);
});

for (const duration of [600, 2400])
  test(`${duration / 60}-minute match completes from the ticking browser clock without phase jumps`, async ({
    page,
  }) => {
    await start(page);
    await dev(page);
    await page
      .getByLabel("Match duration", { exact: true })
      .selectOption(String(duration));
    await page
      .getByRole("button", { name: "Restart match", exact: true })
      .click();
    await closeDev(page);
    await page.clock.runFor(duration * 100 + 500);
    await expect(
      page.getByRole("dialog", { name: "Match results" }),
    ).toBeVisible();
    await expect(page.locator(".match-result tbody tr")).toHaveCount(8);
  });
