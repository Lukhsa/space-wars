import { chromium } from "@playwright/test";
import fs from "node:fs";

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(
    process.env.SPACE_WARS_PREVIEW_URL || "http://127.0.0.1:4173",
  );
  await page.waitForTimeout(1000);
  const measure = () =>
    page.evaluate(
      () =>
        new Promise((resolve) => {
          const frames = [];
          let last = performance.now();
          const start = last;
          function frame(now) {
            frames.push(now - last);
            last = now;
            if (now - start < 6000) requestAnimationFrame(frame);
            else {
              frames.sort((a, b) => a - b);
              resolve({
                frames: frames.length,
                elapsedMs: Math.round(now - start),
                fps: +((frames.length * 1000) / (now - start)).toFixed(1),
                medianMs: +frames[Math.floor(frames.length * 0.5)].toFixed(1),
                p95Ms: +frames[Math.floor(frames.length * 0.95)].toFixed(1),
              });
            }
          }
          requestAnimationFrame(frame);
        }),
    );
  const opening = await measure();
  await page.getByRole("button", { name: "DEV", exact: true }).click();
  await page.getByLabel("8 bots / observer (next restart)").check();
  await page
    .getByRole("button", { name: "Restart match", exact: true })
    .click();
  await page.getByLabel("Jump to phase").selectOption("3");
  await page.getByRole("button", { name: "Close developer controls" }).click();
  await page.getByRole("button", { name: "View entire galaxy" }).click();
  await page.waitForTimeout(1200);
  const escalation = await measure();
  await page.screenshot({
    path: "docs/screenshots/quick-conquest-overview.png",
  });
  const assets = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .filter((e) => e.name.includes("/assets/"))
      .map((e) => ({
        name: e.name.split("/").at(-1),
        bytes: e.decodedBodySize,
      })),
  );
  const result = {
    environment:
      "Windows, Playwright headless Chromium, production Vite preview, 1440x1000, 6-second requestAnimationFrame samples; not a sustained hardware certification",
    opening,
    escalation,
    assetRequests: assets.length,
    decodedAssetBytes: assets.reduce((n, a) => n + a.bytes, 0),
    runtimeErrors: errors,
  };
  fs.writeFileSync(
    "docs/BROWSER_PERFORMANCE.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
