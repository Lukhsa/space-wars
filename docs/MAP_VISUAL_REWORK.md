# Map presentation revision

The previous 1440 × 900 layout gave the galaxy a 890 × 315 canvas (22% of the viewport). The revised canvas is 1440 × 822 (91%), beneath translucent, independently collapsible System and Command panels. Activity opens on demand. The mobile canvas is 390 × 742 on a 390 × 844 screen, with side panels initially closed.

Planets and textured asteroid fields remain visible at the starting zoom and in the galaxy overview. Planets use wider, varied orbital positions, and a clear wedge below each star protects its label. A local copy of the reference project's nebula artwork gives the map a richer background.

The asteroid follow-up removes the repeated individual-rock clusters. Every mineable system has one coherent belt sprite, independently positioned in open space using deterministic seeded placement. The placement checks all suns, planets, labels and already placed belts, with clearance preserved at the minimum zoom. One complete pointer target covers the rotated artwork and label, so both ends and the center activate the same field. Selection highlights the whole belt and shows its connection to the associated system. The inspector's belt shortcut focuses the actual field. Decorative loose rocks are not presented as false mining targets.

The new belt artwork was created with built-in imagegen and saved to `public/assets/original/asteroid-belt.webp`. Its complete prompt and checksum are recorded in [asset provenance](../public/assets/provenance.json). Asteroid validation: all 28 unit tests passed, including overlap checks across 100 seeds and stable placement after ownership changes; four focused browser scenarios passed, including clicks at both ends and the middle, drag without accidental selection, keyboard selection, mobile panels and the normal mining flow. Build, lint and typecheck passed.

The new sun is a transparent raster created with the built-in imagegen tool. Its source texture is saved at `public/assets/original/sun-photosphere.webp`; eight cached spectral variants are saved as `public/assets/original/sun-type-0.webp` through `sun-type-7.webp`. The complete generation prompt, source attribution and checksums are recorded in [asset provenance](../public/assets/provenance.json). `node scripts/prepare-star-textures.mjs` rebuilds the color variants from the source texture, preserving alpha. The binary system also renders a companion star.

The camera now reads current viewport dimensions throughout animation, fixing transient incorrect centering on load and resize. Stationary system artwork is memoized by visual state. Sun colors are baked into textures and translucent surfaces avoid live background blur to keep the enlarged map responsive.

Validation: production build, lint, 26 unit tests and eight browser scenarios passed, including map coverage, planet spacing, belt visibility, keyboard selection, panel toggles, mobile access, fleet orders, mining, construction, chat, battles and complete timed matches. Final production screenshots had no failed resource requests or runtime errors. Six-second Chromium samples at 1440 × 1000 measured 60.1 FPS at opening and 56.6 FPS in the busy overview; see [performance results](BROWSER_PERFORMANCE.json). These short samples are not a hardware-wide performance guarantee.

Current asteroid screenshots: [separated fields](screenshots/asteroid-fields.png), [selected field and mining controls](screenshots/asteroid-field-selected.png).

Earlier viewport revision screenshots: [desktop](screenshots/map-redesign-desktop.png), [panels hidden](screenshots/map-redesign-unobstructed.png), [phone](screenshots/map-redesign-mobile.png).
