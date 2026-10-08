import { test, expect } from "@playwright/test";
test("commissions and independently orders three miners with visible income rates", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("credits-rate")).toHaveText("+6/s");
  await expect(page.getByTestId("alloy-rate")).toHaveText("+1.5/s");
  await expect(page.getByTestId("fuel-rate")).toHaveText("+0.5/s");
  await page.locator(".asteroid-opportunity").click();
  const panel = page.getByRole("region", { name: "Civilian mining" });
  const commission = panel.getByRole("button", { name: /Commission miner/ });
  await commission.click();
  await commission.click();
  await expect(panel).toContainText("3/3 CRAFT");
  await expect(commission).toBeDisabled();
  await expect(page.locator(".miner-marker")).toHaveCount(3);
  const picker = page.getByLabel("Mining craft", { exact: true });
  for (let i = 0; i < 3; i++) {
    await picker.selectOption({ index: i });
    await panel
      .getByRole("button", { name: "Continue mining", exact: true })
      .click();
  }
  await expect(picker.locator("option")).toHaveText([
    /Miner 1 · (Outbound|Extracting)/,
    /Miner 2 · (Outbound|Extracting)/,
    /Miner 3 · (Outbound|Extracting)/,
  ]);
  await expect(page.locator(".miner-marker").first()).toHaveCSS(
    "transition-duration",
    "0.21s",
  );
  await picker.selectOption({ index: 1 });
  await expect(page.locator('.miner-marker[aria-pressed="true"]')).toHaveCount(
    1,
  );
  await page.screenshot({ path: "docs/screenshots/three-miners.png" });
  await panel
    .getByRole("button", { name: "Recall miner", exact: true })
    .click();
  await expect(picker.locator("option").nth(1)).toHaveText(
    /Miner 2 · (Returning|Idle)/,
  );
  await expect(picker.locator("option").nth(0)).toHaveText(
    /Miner 1 · (Outbound|Extracting)/,
  );
});
test("all income rates remain visible on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  for (const k of ["credits", "alloy", "fuel"]) {
    const rate = page.getByTestId(k + "-rate");
    await expect(rate).toBeVisible();
    const box = (await rate.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
  }
  await page.screenshot({ path: "docs/screenshots/income-mobile.png" });
});
