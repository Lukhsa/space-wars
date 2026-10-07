# Map presentation revision

The previous 1440 × 900 layout gave the galaxy a 890 × 315 canvas (22% of the viewport). The revised canvas is 1440 × 822 (91%), beneath translucent, independently collapsible System and Command panels. Activity opens on demand. The mobile canvas is 390 × 742 on a 390 × 844 screen, with side panels initially closed.

Planets and textured asteroid fields remain visible at the starting zoom and in the galaxy overview. Planets use wider, varied orbital positions, and a clear wedge below each star protects its label. A local copy of the reference project's nebula artwork gives the map a richer background.

Resource sites use nine original Space Explorer asteroid images: fractured, icy, crystal-veined, pitted, layered and small fragment variants. The three previously copied images are joined by six unchanged local copies. Seeded material, rotation and size choices give the sites varied silhouettes. Most are standalone asteroids; a minority have restrained mineral dust and tiny debris around one dominant, mineable rock. The crescent belt asset has been removed.

Each site is placed independently with clearance from all suns, planets, labels and other sites. The complete rotated artwork and label have one pointer target. A selection ring highlights the main rock and a subtle line identifies its associated system. The inspector shortcut focuses the site, and its portrait, material description and order dialog match the selected asteroid. Resource appearances are cosmetic; mining rules remain unchanged. Sources and checksums are in [asset provenance](../public/assets/provenance.json).

Resource-site validation: all 28 unit tests passed, including overlap checks across 100 seeds and stable placement after ownership changes. Four focused browser scenarios passed, checking all nine original textures in the overview, more standalone asteroids than debris sites, matching inspector artwork, clicks across the site, drag without accidental selection, keyboard selection, mobile panels and the normal mining flow. Build, lint and typecheck passed. Desktop overlays also retain separate space for the panel switches and minimap when side panels are closed.

The new sun is a transparent raster created with the built-in imagegen tool. Its source texture is saved at `public/assets/original/sun-photosphere.webp`; eight cached spectral variants are saved as `public/assets/original/sun-type-0.webp` through `sun-type-7.webp`. The complete generation prompt, source attribution and checksums are recorded in [asset provenance](../public/assets/provenance.json). `node scripts/prepare-star-textures.mjs` rebuilds the color variants from the source texture, preserving alpha. The binary system also renders a companion star.

The camera now reads current viewport dimensions throughout animation, fixing transient incorrect centering on load and resize. Stationary system artwork is memoized by visual state. Sun colors are baked into textures and translucent surfaces avoid live background blur to keep the enlarged map responsive.

Earlier viewport revision validation: production build, lint, 26 unit tests and eight browser scenarios passed, including map coverage, planet spacing, resource visibility, keyboard selection, panel toggles, mobile access, fleet orders, mining, construction, chat, battles and complete timed matches. Six-second Chromium samples at 1440 × 1000 measured 60.1 FPS at opening and 56.6 FPS in the busy overview; see [performance results](BROWSER_PERFORMANCE.json). These short samples are not a hardware-wide performance guarantee.

Current asteroid screenshots: [desktop](screenshots/resource-sites-desktop.png), [selected asteroid and mining controls](screenshots/resource-sites-selected.png), [galaxy overview](screenshots/resource-sites-overview.png).

Earlier viewport revision screenshots: [desktop](screenshots/map-redesign-desktop.png), [panels hidden](screenshots/map-redesign-unobstructed.png), [phone](screenshots/map-redesign-mobile.png).
