# Chicken Fling

A barn-cannon physics game where a flock of very brave chickens is fired at weasel forts. Load a chicken into the cannon, aim and charge, and let momentum do the demolition: wood splinters, glass shatters, hay burns, stone cracks and metal just laughs at you. Every chicken has one single-use ability you can trigger in mid-air, five worlds of weasels stand between you and the Golden Eggs, and each of the 145 levels is scored out of three stars.

Built with Vite, TypeScript (strict) and matter.js. No frameworks, no image/font/audio files, no network calls — all art and sound is drawn and synthesised in code, and progress is stored in `localStorage`.

## Install and run

```bash
npm install       # once
npm run dev       # dev server at http://localhost:5173
npm run build     # typecheck + production build into dist/
npm run preview   # serve the built dist/ locally
npm run typecheck # tsc --noEmit only
```

## How to play

| Input | Action |
| --- | --- |
| Mouse / touch drag | Aim the cannon; drag further from the barrel to charge power |
| Release | Fire |
| Right-click / Esc / drag back into the barrel | Cancel the shot |
| Space (hold) | Charge, release to fire |
| `A` / `D` or `←` / `→` | Fine-tune angle |
| `W` / `S` or `↑` / `↓` | Fine-tune power |
| Click / tap in flight | Trigger the loaded chicken's ability (once per chicken) |
| `R` | Restart level |
| `M` | Mute |
| `Esc` | Pause / back |

The dotted arc is a real ballistic simulation of the loaded chicken (its mass and ability are taken into account), and it stops on the first solid surface so the landing ring is honest.

### Chickens

Nine chickens, each with a single-use mid-air ability: Cluck (extra flap), Speckle (egg drop), Drumstick (dive), Puff (air burst), Nugget (heavy), Bantam (split into three), Pepper (fire trail), Snowbell (freeze), Mother Cluck (summon chicks). Heavier chickens hit harder but fly shorter.

### Worlds

1. **Barnyard Basics** — wood, glass, hay; teaches aim, charge and abilities.
2. **Rusty Ranch** — conveyors, magnets, pistons; wood and metal.
3. **Frostbite Farm** — ice, brittle glass, snow; wind and slippery ground.
4. **Volcano Roost** — stone, lava, geysers; hay burns and lava destroys anything that falls in.
5. **Sky Fortress** — crystal, balloons, wind; floating islands and the biggest forts.

Each world has 29 levels (145 total), the 29th of each being a boss with a bigger queue and a fortified keep. Five Golden Eggs are hidden across the campaign (worlds 1–5 at levels 18, 24, 18, 25 and 22); collecting one is saved permanently and shown on the world map.

## Project structure

```
index.html                 single canvas + loading shim
src/
  main.ts                  bootstraps the Game, dev-only level validation
  core/                    rng, fixed-step loop, pointer/keyboard input
  data/
    chickens.ts            9 chicken definitions + abilities
    materials.ts           7 materials (hp, density, restitution, friction)
    worlds.ts              5 world palettes and level counts
    types.ts               shared data types
    levels/
      builder.ts           level-building helpers (box, terrain, mechanisms)
      templates.ts         19 parameterised structure templates
      build.ts             spec → Level (queue top-up, stars, par)
      world1..5.ts         29 level specs per world
      index.ts             LEVELS, findLevel, world grouping
      validate.ts          data sanity checks
  game/
    Game.ts                app state machine, screens wiring, save
    LevelRuntime.ts        physics world, destruction, abilities, scoring
    Cannon.ts              aim/charge/recoil/reload
    Trajectory.ts          ballistic preview simulation
    Mechanisms.ts          conveyors, magnets, pistons, geysers, balloons, lava, wind
    Entities.ts            chicken/weasel/egg entity wrappers
    Camera.ts              follow + shake
    fx.ts                  effects interface
  render/                  procedural textures, backgrounds, sprites, renderer, particles
  audio/Audio.ts           WebAudio synthesis (no files)
  save/Save.ts             versioned localStorage save + star rules
  ui/                      HUD, screens, level select, options, canvas widgets
scripts/simulate.ts        headless solvability harness (AI plays every level)
DECISIONS.md               design decisions the brief left open
```

## Level data and QA harness

Levels are authored as compact specs (template, tier, enemy count/types, material, mechanisms, seed) in `src/data/levels/world*.ts` and expanded into physics layouts by `templates.ts` + `build.ts`. `validateLevels()` runs in dev and in the harness and checks unique ids, queue size, golden eggs, boss count and template sanity.

```bash
npx --yes tsx scripts/simulate.ts            # all levels, default attempts
npx --yes tsx scripts/simulate.ts w2 24      # one world, 24 attempts per level
npx --yes tsx scripts/simulate.ts all 24
```

The harness plays each level with a headless AI that uses the same trajectory model as the preview plus block occlusion, and reports clears, near misses and chicken coverage.

Current status: **145/145 levels validated, 144/145 cleared by the random AI (24 attempts each); the remaining level (`4-09 The Furnace`) was verified solvable with a targeted 2-shot search (48° @ 0.9, then 8° @ 0.8).** All five bosses are beatable.

## QA summary

The §18 checklist is reported in full in the hand-over message. Highlights:

- `npm run build` passes (strict TypeScript, Vite production build ~223 kB / 70 kB gzip).
- 145 levels, unique ids, all referenced by world/level select; every level's queue is at least `weasels + 2` so a spare chicken always exists.
- All 9 chickens appear in ≥ 21 levels.
- 5 golden eggs, 5 bosses, per-world star totals and best scores persist and never regress.
- No external requests or assets; the built `dist/` is HTML/CSS/JS only.

Not verified in this environment: real touch hardware, actual frame-rate measurement, and browser network-panel inspection (no browser available); the checks above come from the build and the headless harness.

## Future ideas

Deliberately **not** implemented: daily challenge, level editor, chicken skins, endless mode, co-op.

See [DECISIONS.md](DECISIONS.md) for the reasoning behind level generation, damage tuning, star rules and other choices the brief left open.
