import { test, expect } from "@playwright/test";
test("highlights individual bodies and ships without orbital focus boxes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const now = new Date();
  await page.clock.install({ time: now });
  await page.clock.pauseAt(new Date(now.getTime() + 60_000));
  await page.goto("/");
  await page.getByRole("button", { name: "Hide system panel" }).click();
  await page.getByRole("button", { name: "Hide command panel" }).click();
  const planet = page.locator('[data-system="0"] [data-planet="1"]');
  await planet.press("Enter");
  await expect(planet).toHaveAttribute("aria-pressed", "true");
  await expect(planet).toHaveCSS("outline-style", "none");
  await expect(planet.locator("ellipse")).toHaveCount(0);
  expect((await planet.boundingBox())!.width).toBeLessThan(85);
  await expect(planet.locator(".object-highlight")).toHaveCSS("opacity", "1");
  const deposits = page.locator('[data-asteroid-system="0"]');
  await deposits.nth(0).press("Enter");
  await deposits.nth(1).press("Enter");
  await expect(deposits.nth(0)).toHaveAttribute("aria-pressed", "false");
  await expect(deposits.nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('.map-object[aria-pressed="true"]')).toHaveCount(1);
  await expect(deposits.nth(1)).toHaveCSS("outline-style", "none");
  const miner = page.getByRole("button", {
    name: "Nova Prime civilian miner",
    exact: true,
  });
  await miner.press("Enter");
  await expect(miner).toHaveAttribute("aria-pressed", "true");
  await expect(miner.locator("image")).toHaveAttribute(
    "href",
    "/assets/human_mining_craft_01.png",
  );
  await expect(miner).toHaveCSS("outline-style", "none");
  await expect(page.locator('.map-object[aria-pressed="true"]')).toHaveCount(1);
  const alpha = await page
    .locator(".mining-craft-portrait")
    .evaluate(async (el) => {
      const img = el as HTMLImageElement;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      return [
        ctx.getImageData(0, 0, 1, 1).data[3],
        ctx.getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data[3],
      ];
    });
  expect(alpha[0]).toBe(0);
  expect(alpha[1]).toBeGreaterThan(250);
  await page.screenshot({ path: "docs/screenshots/miner-selection.png" });
  const fleet = page.getByRole("button", {
    name: "1st Expeditionary fleet",
    exact: true,
  });
  await fleet.press("Enter");
  await expect(fleet).toHaveAttribute("aria-pressed", "true");
  await expect(fleet).toHaveCSS("outline-style", "none");
  await expect(fleet.locator("image")).toHaveAttribute("href", /war2_human_/);
  await expect(page.locator('.map-object[aria-pressed="true"]')).toHaveCount(1);
  await page.screenshot({ path: "docs/screenshots/fleet-selection.png" });
  expect(errors).toEqual([]);
});
test("Human production uses Human hulls and rivals keep their own designs", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Build a ship", exact: true }).click();
  const paths = await page
    .locator(".ship-option img")
    .evaluateAll((imgs) => imgs.map((i) => i.getAttribute("src")));
  expect(paths).toHaveLength(4);
  expect(paths.every((p) => p?.includes("war2_human_"))).toBe(true);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByLabel("Find a system").fill("Sera");
  await page
    .locator(".search-results button")
    .filter({ hasText: "Sera" })
    .first()
    .click();
  await page.getByRole("button", { name: "DEV", exact: true }).click();
  await page.getByRole("button", { name: "Reveal map", exact: true }).click();
  await page.getByRole("button", { name: "Close developer controls" }).click();
  await expect(
    page.locator('.fleet-marker[data-owner="1"]').first().locator("image"),
  ).toHaveAttribute("href", /war2_engine_burner_/);
  await expect(
    page.locator('.fleet-marker[data-owner="2"]').first().locator("image"),
  ).toHaveAttribute("href", /war2_kragg_/);
  await expect(
    page.locator('.fleet-marker[data-owner="3"]').first().locator("image"),
  ).toHaveAttribute("href", /war2_zetari_/);
});
