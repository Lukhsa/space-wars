# Map presentation revision

The previous 1440 × 900 layout gave the galaxy a 890 × 315 canvas (22% of the viewport). The revised canvas is 1440 × 822 (91%), beneath translucent, independently collapsible System and Command panels. Activity opens on demand. The mobile canvas is 390 × 742 on a 390 × 844 screen, with side panels initially closed.

Planets and textured asteroid fields remain visible at the starting zoom and in the galaxy overview. Planets use wider, varied orbital positions, and a clear wedge below each star protects its label. Belts use the existing three rock textures with a continuous pointer target and keyboard selection. Distant fields render fewer, larger fragments instead of disappearing. A local copy of the reference project's nebula artwork gives the map a richer background.

The new sun is a transparent raster created with the built-in imagegen tool. Its source texture is saved at `public/assets/original/sun-photosphere.webp`; eight cached spectral variants are saved as `public/assets/original/sun-type-0.webp` through `sun-type-7.webp`. The complete generation prompt, source attribution and checksums are recorded in [asset provenance](../public/assets/provenance.json). `node scripts/prepare-star-textures.mjs` rebuilds the color variants from the source texture, preserving alpha. The binary system also renders a companion star.

The camera now reads current viewport dimensions throughout animation, fixing transient incorrect centering on load and resize. Stationary system artwork is memoized by visual state. Sun colors are baked into textures and translucent surfaces avoid live background blur to keep the enlarged map responsive.

Validation: production build, lint, 26 unit tests and eight browser scenarios passed, including map coverage, planet spacing, belt visibility, keyboard selection, panel toggles, mobile access, fleet orders, mining, construction, chat, battles and complete timed matches. Final production screenshots had no failed resource requests or runtime errors. Six-second Chromium samples at 1440 × 1000 measured 60.1 FPS at opening and 56.6 FPS in the busy overview; see [performance results](BROWSER_PERFORMANCE.json). These short samples are not a hardware-wide performance guarantee.

Screenshots: [desktop](screenshots/map-redesign-desktop.png), [panels hidden](screenshots/map-redesign-unobstructed.png), [phone](screenshots/map-redesign-mobile.png).
