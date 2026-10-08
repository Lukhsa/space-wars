# Ship artwork and map selection

Map objects now have individual circular selection and keyboard-focus halos. Planet orbital paths sit outside the interactive planet group, avoiding large focus rectangles. Asteroids select a single deposit; civilian miners and fleets highlight their own sprites. Shift-click fleet grouping remains available.

Fleet markers use the strongest ship class and the owning commander's civilization. Fleet composition cards use the same mapping. Human production uses only Human hulls.

## Source artwork

Existing hulls were copied unchanged from the read-only Space Explorer RPG Web artwork directory. See `public/assets/provenance.json` for exact paths and hashes and `src/demo/catalog.ts` for the mapping.

- Human: frigate, cruiser and dreadnought. The Human Destroyer uses the Human frigate silhouette at the Destroyer marker size; the source has no Human destroyer.
- Engine-Burner: Redline frigate and Overburn destroyer; heavier classes reuse the destroyer.
- Kragg: Gnasher, Rockjaw, Ravager and War Chief.
- Zetari: Dissection, Specimen and Containment.
- Solari: existing gold Solar Forge hull skins provide the visual mapping.
- Aether: Loom and Atlas.
- Glint: Fine Print, Liquid Assets and Compound Interest.
- Myrmex: Convoy and Foundry.

Classes without a distinct reference sprite reuse another hull from their own faction. Non-Human civilian craft visible in developer mode currently use their faction's light hull. Pirate artwork remains the existing pirate hull.

## Human mining craft

Saved asset: `public/assets/human_mining_craft_01.png`.

Method: built-in image generation with a transparent background. The existing Human frigate and cruiser images were viewed as style references. The generated PNG is copied unchanged and used both on the map and in the mining panel.

Final generation prompt:

> Use case: stylized-concept. Asset type: transparent top-down spaceship sprite for Space Wars. Generate a NEW Human civilian mining spacecraft matching the two reference Human warship sprites visible immediately above in this conversation (style references only, not edit targets). Single ship, orthographic dorsal view, nose pointing straight up and engines down, centered, full hull visible with tight comfortable margin. Match their realistic detailed game-render style, worn warm ivory armor panels, dark graphite mechanical chassis, restrained orange identification bands, tiny cyan running lights and blue engine nozzles. Distinct civilian silhouette: compact sturdy industrial hull, two short articulated mining/cutting arms beside the front, visible enclosed cargo pods along the sides, twin rear engines. No weapon turrets. Readable silhouette at 30 pixels. One ship only. Transparent background with actual alpha, no stars, no ground plane, no cast shadow, no border, no text, no watermark. Output a square PNG sprite.

Validation: TypeScript, ESLint and the production build pass. Six browser scenarios pass across map selection, desktop/mobile map views, deposit interaction, grouped fleet orders and forward shipyard production. Selection checks cover local focus bounds, individual deposits, miner transparency, Human production art and rival faction markers. Screenshots are saved in `docs/screenshots/miner-selection.png` and `docs/screenshots/fleet-selection.png`.
