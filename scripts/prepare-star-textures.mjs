// Bake the map's spectral color filters into textures so SVG animation does not
// reapply image filters to every sun on every frame. Requires Playwright Chromium.
import { chromium } from "@playwright/test";
import fs from "node:fs";

const filters = [
  "saturate(.85)",
  "hue-rotate(-14deg) saturate(1.2)",
  "hue-rotate(-30deg) saturate(1.4)",
  "hue-rotate(175deg) saturate(.55) brightness(1.3)",
  "hue-rotate(-30deg) saturate(1.4)",
  "saturate(.15) brightness(1.4)",
  "none",
  "hue-rotate(220deg) saturate(.7) brightness(1.2)",
];
const source =
  "data:image/webp;base64," +
  fs
    .readFileSync("public/assets/original/sun-photosphere.webp")
    .toString("base64");
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const [id, filter] of filters.entries()) {
    const data = await page.evaluate(
      async ({ source, filter }) => {
        const image = new Image();
        image.src = source;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 512;
        const ctx = canvas.getContext("2d");
        ctx.filter = filter;
        ctx.drawImage(image, 0, 0, 512, 512);
        return canvas.toDataURL("image/webp", 0.9).split(",")[1];
      },
      { source, filter },
    );
    fs.writeFileSync(
      `public/assets/original/sun-type-${id}.webp`,
      Buffer.from(data, "base64"),
    );
  }
} finally {
  await browser.close();
}
