# Design decisions

Choices made where the brief was silent or left room for interpretation.

## Level authoring

- **Templates + specs instead of 145 hand-written layouts.** Each level is a compact spec (template id, `tier`, `en`, enemy types, material, mechanisms, x offset, seed) expanded by one of 19 parameterised structure templates in `src/data/levels/templates.ts`. This keeps 145 levels consistent, tweakable in one place, and impossible to leave with invalid geometry. Hand-authoring 145 JSON layouts was the brief's suggested format, but the same `Level` shape is produced either way; the specs are the source of truth.
- **Queue top-up.** Every level's chicken queue is padded to `min(8, weasels + 2)` (bosses: 8). This guarantees at least one spare chicken, which the 3-star rule requires, and keeps every level solvable even after a bad shot.
- **Star rule exception.** Three stars normally require clearing with an unused chicken; one-chicken levels are exempt (there is no spare to keep).
- **Procedural-but-seeded.** Each level gets a deterministic seed derived from world and index, so layouts are identical across devices and reloads while still looking varied.

## Physics and tuning

- **Fixed 1/120 s physics step** with an accumulator, so behaviour is frame-rate independent. matter.js 0.20 treats velocities as per-1/60 s, so `PX_PER_STEP = 60` converts simulation units to pixels.
- **Weasel damage is speed-based** (`(closing speed − 150 px/s) × 0.03`). The earlier impulse-based rule punished heavy weasels for standing still: solver jitter on a resting contact produced small impulses every frame, so kings and brutes slowly bruised themselves to death while untouched. Closing speed is mass-independent, so a direct full-power hit still takes a big bite out of a grunt while standing still costs nothing.
- **Static bodies contribute no closing speed.** A balloon mechanism was writing an upward velocity onto its static deck; the impact maths read that as a 150 px/s collision and shattered the tower resting on it every time the level loaded.
- **Structure stability.** Twenty position iterations, twelve velocity iterations and engine sleeping keep tall stacks from squashing and leaning on their own; hay/wood/ice crush thresholds are far above a normal beam load so lintels no longer crush their own pillars. Towers get wider legs and at most four storeys.
- **Force-based mechanisms divide by 7200** because matter.js applies forces per 1/60 s base delta; using 3600 made wind and magnets exactly twice as strong as intended at 120 Hz.
- **Metal is a wall, not a target.** Multi-target forts whose primary material is metal are rebuilt from wood (worlds 1–4) or crystal (world 5), while factory columns, machinery, braces and single-target "teaching" forts stay metal. An all-metal 30 HP fort with three weasels inside was technically solvable but miserable; this keeps the "metal bounces shots" idea without turning levels into chores.
- **Exposed enemy spots, checked by tooling.** Template weasel positions must sit in open air: a weasel spawned inside a block can never be hit and jitters itself apart. `validateLevels()` now tests every spawn circle against every block AABB and reported 44 bad spawns, which were fixed at the template level:
  - island: the arch under the roof is sealed by its pillars, so weasels stand on the open roof and on the ground outside the platform overhang (the ledge bales are decoration). The upper pillar pair also made a 72 px slot that no shot could drop into — it is now a single off-centre roof beacon.
  - balloons: the crates and roof beam sealed the deck pocket, so the deck is wider and weasels stand on its outer lips or on the cargo beam.
  - gate: the lintel weasel sits on the near lip instead of mid-roof (mid-roof showed only its top half to incoming shots, and gate levels park a press piston at centre).
  - factory: the rooftop machine housing moved to the far side of the roof, where it neither buries the roof weasel nor shields it from the cannon side.
  - wall/bridge/bunker/gauntlet: roof spots sat half a block too low, and ground spots sat inside a brute's radius of the columns. Both were corrected; the bridge's centre keystone post (which spawned a weasel half inside the planks) was removed.
  - Press piston in `w2-22`: its head was buried in the stone lintel and knocked the roof weasel off for a free kill; it now hovers just above the roof as a hazard.
  - Ground spots beside tall columns were pushed out of the column's shadow, or the last weasel was unhittable from every approach.
- **Blast damage.** Egg bombs now detonate on contact with a weasel instead of bouncing away and burning their fuse somewhere harmless, and blast damage is `18 + 22 × falloff` (was `26 × falloff`). A direct egg bomb therefore always kills a grunt or helmet, a brute near the centre, while a king or boss needs several. `scripts/blasttest.ts` prints the numbers per type and distance.

## Aiming and preview

- **The preview is the real trajectory.** It uses the loaded chicken's radius, drag, gravity, wind and launched mass, and now stops on the first live block instead of passing through forts; the landing ring turns from yellow (ground) to coral (block hit). This fixed a class of "the arc lied" misses on ground weasels.
- **Idle preview at 0.7 power.** While not charging, the arc is drawn at 70% power as a readable default; it switches to the live charge as soon as the player drags.

## Campaign and saves

- **Golden egg placements** are fixed per world (levels 18, 24, 18, 25, 22) so they are discoverable and memorable rather than random.
- **Versioned save with best-ever stars.** The save stores per-level best stars and best score, golden eggs, unlocked worlds and options. Unknown/corrupt save data is discarded rather than merged, and a version bump resets cleanly. Stars only ever increase.
- **Options.** Reduced motion and high contrast are real toggles that change particles/shake and palette contrast respectively; aim assist can be short (10 dots), full (28 dots + landing ring) or off.

## Presentation

- **Canvas-only UI.** Menus, buttons, level select and HUD are drawn on the same canvas as the game with a small widget layer, so there is no DOM/CSS UI to drift out of sync and no external fonts.
- **Everything procedural.** Textures, chickens, weasels, backgrounds and sound are generated at runtime (canvas paths + WebAudio oscillators/noise). Nothing is fetched; the build has no asset pipeline.
- **Resolution.** The canvas renders at the screen's full device pixel ratio (capped at 3) with high-quality image smoothing, and material swatches are painted into 144 px tiles (up from 72) so blocks stay crisp when zoomed or on high-DPI screens. Chickens and weasels are vector art drawn in body-radius units, so they scale without pixelation; they use gradients, layered feathers/fur, hatched wings and detailed gear rather than flat fills.
