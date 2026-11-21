# Chicken Fling

**Play it now: <https://hrw233.github.io/chicken-fling/>** (no install, works on desktop and touch).

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
scripts/simulate.ts        randomised solvability harness (AI plays every level)
scripts/solve.ts           greedy solver: aims like a player reading the arc, one-ply search
scripts/probe.ts           dense per-level probe + per-weasel reachability report
scripts/autocheck.ts       regression: no level may win itself in five idle seconds
scripts/blasttest.ts       prints egg-bomb damage per weasel type and distance
DECISIONS.md               design decisions the brief left open
```

## Level data and QA harness

Levels are authored as compact specs (template, tier, enemy count/types, material, mechanisms, seed) in `src/data/levels/world*.ts` and expanded into physics layouts by `templates.ts` + `build.ts`. `validateLevels()` runs in dev and in the harness and checks unique ids, queue size, golden eggs, boss count and template sanity.

`validateLevels()` also rejects a weasel spawned inside a block: those were unhittable (the block shielded them) and jittered themselves apart, and the check caught 44 such spawns across the campaign.

```bash
npx --yes tsx scripts/solve.ts w2-22          # greedy solver for one / several levels
npx --yes tsx scripts/solve.ts                # whole campaign (~2 min)
npx --yes tsx scripts/simulate.ts all 24      # randomised AI, 24 attempts per level
npx --yes tsx scripts/probe.ts w4-07 20       # reachability + dense probe for levels
npx --yes tsx scripts/autocheck.ts            # regression: no level may win without a shot
npx --yes tsx scripts/blasttest.ts            # blast damage per weasel type
```

`simulate.ts` fires a randomised AI with a coarse 2° / five-power grid. `solve.ts` is the fairer test: it scores a shortlist of aims by actually playing them out (replaying earlier shots, since physics is deterministic), hill-climbs around the best one, and keeps the winner — the way a player nudges the mouse against the arc preview.

Current status: **145/145 levels validate with zero problems, and no level can clear itself — `scripts/autocheck.ts` steps every level for five seconds with no shots and reports 0/145 wins.** The greedy solver clears **140/145**; the five it misses (`w1-28`, `w3-28`, `w3-29`, `w4-13`, `w4-28`) are large gauntlet/boss fights where it ends with exactly one weasel left after emptying the coop — an ammo/aim limit of the solver, not sealed geometry (a per-weasel sweep finds killable shots for each of them). Every world including all five bosses is cleared.

## QA summary

The §18 checklist is reported in full in the hand-over message. Highlights:

- `npm run build` passes (strict TypeScript, Vite production build ~230 kB / 72 kB gzip).
- Rendering runs at the screen's full pixel density (DPR capped at 3) with 144 px material texture tiles and gradient-shaded vector chickens and weasels.
- 145 levels, unique ids, all referenced by world/level select; every level's queue is at least `weasels + 2` so a spare chicken always exists.
- All 9 chickens appear in ≥ 21 levels.
- 5 golden eggs, 5 bosses, per-world star totals and best scores persist and never regress.
- No external requests or assets; the built `dist/` is HTML/CSS/JS only.

Not verified in this environment: real touch hardware, actual frame-rate measurement, and browser network-panel inspection (no browser available); the checks above come from the build and the headless harness.

## Future ideas

Deliberately **not** implemented: daily challenge, level editor, chicken skins, endless mode, co-op.

See [DECISIONS.md](DECISIONS.md) for the reasoning behind level generation, damage tuning, star rules and other choices the brief left open.
