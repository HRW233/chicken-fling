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
- **Exposed enemy spots.** Template weasel positions sit on roofs, ledges and open ground, never sealed inside a box. Tall factory columns and tower shafts shadow the ground behind them, so ground spots were moved outside the column/roofline; otherwise the last weasel could be unreachable from every angle.

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
