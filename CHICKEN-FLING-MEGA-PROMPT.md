# CHICKEN FLING — MEGA PROMPT

**A paste-ready build brief for an AI coding agent. One shot, no follow-ups needed.**

> **How to use this file:** copy everything from `===== BEGIN PROMPT =====` to the end of the file and paste it into your coding agent (Codex, Cursor, Claude Code, Codebuff in Code mode, etc.). It is written as a single self-contained brief: the agent should be able to build the whole game from it without asking you questions.

---

===== BEGIN PROMPT =====

## 0. YOUR ROLE

You are a senior game developer and technical designer building a finished, shippable browser game from a single brief. You own the physics, the game feel, the level design, the UI, the art direction and the audio. You do not ask clarifying questions — when the brief is silent, decide, write the decision down in `DECISIONS.md`, and keep going. You deliver a **playable build**, not a prototype, not a scaffold, not a plan.

## 1. THE GAME

**Chicken Fling** — a physics destruction game in the lineage of Angry Birds, but the slingshot is replaced by a **black-powder barn cannon** and the birds are replaced by **an arsenal of chickens**.

The player loads chickens into a cannon, aims the barrel, charges the shot, and fires. Chickens arc across the level, slam into fortresses built of hay, wood, ice, stone, metal and crystal, and knock down the **weasels** who have been stealing eggs from the coop. Clear every weasel to win the level.

**One-liner:** *Load the coop's finest into the cannon, aim true, and knock the egg-thieving weasels out of their fortresses across five worlds and 145 levels.*

**Tone:** warm, chunky, cartoon-barnyard. Silly but not childish. Every explosion is funny, never gory. Nobody dies — weasels get bounced, bonked and launched off-screen with a comic *boing*.

## 2. NON-NEGOTIABLE CONSTRAINTS

**Must have**

1. **A cannon, never a slingshot.** No rubber bands, no forks, no pull-back-and-release slingshot metaphor. The cannon is a physical object on screen with a barrel that visibly rotates, a powder charge meter, recoil, muzzle flash and smoke.
2. **Chickens as ammunition.** Each chicken is a distinct projectile with its own mass, shape, and *tap-in-flight ability*.
3. **Five worlds, 29 levels each — exactly 145 levels.** Numbered `1-1` through `5-29`. Every level must be playable, winnable and distinct.
4. **Destructible fortresses** with a real damage model: materials have hit points, take damage from impact impulse and crushing weight, and collapse.
5. **Three-star scoring** per level, persistent progression, per-level best score.
6. **Runs offline in a browser** with no backend, no network calls at runtime, no login.

**Must NOT have** (do not build these, even as extras)

- No accounts, sign-in, cloud save, backend, database, or API of any kind.
- No ads, in-app purchases, currency, energy timers, loot boxes or monetisation.
- No external image, font, audio or model assets. **Everything is drawn and synthesised in code** (see §14).
- No level editor, no multiplayer, no leaderboards, no analytics, no telemetry.
- No frameworks beyond the stack in §3. No React, no Phaser, no Unity export, no WebGL requirement.
- No placeholder art shipped. No "TODO" left in gameplay code.

## 3. TECH STACK (fixed)

- **Vite + TypeScript**, strict mode on. `npm run dev` for development, `npm run build` produces a static `dist/` that works from any static host and from `file://`-adjacent static serving.
- **Canvas 2D** rendering. One full-screen canvas, `devicePixelRatio`-aware, letterboxed to a **1280×720 design space** with `contain` scaling.
- **matter.js** (pinned exact version in `package.json`) as the rigid-body solver, wrapped in your own thin layer:
  - Fixed timestep **1/120 s** with an accumulator, max 8 substeps per frame, and `Matter.Runner` disabled (you drive `Engine.update` yourself).
  - Seeded PRNG (`mulberry32`) for all randomised gameplay values, so a level replays identically from the same shot inputs. Cosmetic randomness (dust, feathers) may use `Math.random`.
  - No gameplay logic inside render code and no rendering inside physics code.
- **WebAudio API** for all sound (§14). No audio files.
- **localStorage** for save data (§12). Single key, versioned, migration-safe.
- Zero runtime dependencies other than `matter`. Dev dependencies limited to Vite, TypeScript, and types.

## 4. GAME FEEL PILLARS

1. **The cannon is the star.** It must feel heavy: slow barrel rotation with a settle wobble, a charge that ramps with a rising pitch, a punch of recoil that shoves the whole screen 6–10 px, a two-frame white flash, a cone of smoke that drifts, and a lingering powder haze. The player should fire shots just to feel it.
2. **Readable destruction.** Every hit reads instantly: a crunch sound scaled to material, chunky debris, a star-burst hit marker on the impact point, and a slow-motion beat (0.25× time for 0.25 s) on the first weasel of a shot that clears the level.
3. **Forgiving aim, punishing planning.** The trajectory preview is generous, so *missing* is rare but *clearing efficiently* is hard. Skill lives in shot ordering and chicken choice, not in pixel precision.
4. **30-second levels.** Most levels clear in 20–60 seconds. Restart must be instant (`R` key or button, no confirm, no loading).
5. **Zero friction.** From page load to firing a shot in under 3 seconds, with no clicks required beyond one "Play".

## 5. THE CANNON

### Placement
- The cannon sits at the left edge of the level (default `x=120`, muzzle pivot `y=600` in design space) on a wooden carriage with two spoked wheels.
- Level JSON may override position and allowable angles.
- The cannon is static (never moves, never falls).

### Aiming
- **Pointer down anywhere in the play area** begins aiming. Drag: horizontal drag rotates the barrel, vertical drag at close range also contributes — use a single rule: *the barrel points at the pointer* while dragging, clamped to the level's `minAngleDeg`/`maxAngleDeg` (default `-10` to `95`, where 0 = horizontal right, increasing counter-clockwise).
- Barrel rotation is *eased*, not snapped: `angle += (target - angle) * 0.35` per frame, with a 3–5° overshoot spring for weight. While easing, the preview arc shows the *current* barrel angle, so the player learns to wait for the settle.
- **Power:** a separate horizontal "powder" slider fills while the pointer moves *away from the barrel* past a dead zone of 40 px; 0–100%. Alternatively, hold and the charge auto-ramps at 120%/s and releases on pointer up. Implement the **drag-to-charge** model as primary (map drag distance 40→400 px to 0→100%) because it is precise on touch.
- Charge meter is a vertical brass gauge beside the cannon, with a red zone above 95% (inaccuracy: ±1.5° random spread, seeded). Sweet spot 85–95% shows a gold tick.
- Release to fire. A shot cannot be cancelled once released; during charge, dragging back under 40 px cancels the shot (barrel returns to idle).

### Firing
- Muzzle velocity = `700 + 620 * power` px/s along the barrel axis.
- Recoil: cannon carriage translates back 14 px and up 4 px over 90 ms, then springs home over 220 ms with 2 oscillations. Screen shake amplitude `3 + 6*power` px for 180 ms (disableable in options).
- Muzzle flash: 90 ms, two overlapping shapes (white core, orange outer), plus 8–14 smoke puffs that expand, fade and drift up-left over 1.2 s.
- Audio: layered thump (low sine sweep 120→45 Hz) + noise burst through a lowpass + a short metallic "clank" of the carriage.

### Trajectory preview
- Dotted arc of 28 dots simulating the actual projectile's launch (including wind from §7) for 0.9 s of flight, integrated at 1/120 s.
- Dots fade and shrink with distance; the first 6 are opaque.
- Preview is **on** by default; options toggle "Aim assist: Full / Short / Off" (Full = arc + landing marker ring on first surface, Short = 10 dots, Off = none).
- The arc must account for the *currently loaded chicken's* mass and drag coefficient, not a generic projectile.

### Loading
- The cannon visibly loads the next chicken: a chicken walks/hopping from the queue rail into the barrel over 380 ms with a *pop* sound, then the barrel glows faintly amber (loaded state).
- While a shot is in flight the queue is visible but the loading animation waits for the shot to resolve.
- The queue is drawn as a row of chicken portraits with the active one highlighted; a "next" preview arrow shows order.

## 6. CHICKEN ROSTER

Every chicken: same aiming, different mass, radius, drag, and a **single tap-in-flight ability** (tap anywhere, or press `Space`). An ability can be used **once** and only while the chicken is airborne and moving. Unused abilities retry nothing; a chicken that lands without tapping is a wasted ability, which is a core skill.

| # | Name | Mass | Radius | Look | Ability (tap in flight) | Unlock |
|---|------|------|--------|------|------------------------|--------|
| 1 | **Cluck** | 1.00 | 16 | Plain white hen, red comb, determined eyebrows | None. Pure ballistic baseline. | 1-1 |
| 2 | **Speckle** | 1.15 | 17 | Grey speckled hen with a satchel | **Egg bomb** — drops an egg that detonates 0.35 s after release: radius 90, impulse 1600, destroys hay instantly and wood within 45 px. Chicken keeps flying. | 1-4 |
| 3 | **Drumstick** | 1.30 | 18 | Buff muscular hen, tiny cape | **Dash** — doubles forward velocity instantly (capped at 1900 px/s), triples impact damage for 0.6 s. Leaves a motion streak. | 1-11 |
| 4 | **Puff** | 0.70 | 15 | Round fluffy silkie, huge eyes | **Inflate** — grows to radius 42 over 0.15 s, mass ×2.2, high restitution (0.6). A soft wrecking ball that bounces and shoves without shattering. | 2-6 |
| 5 | **Nugget** | 0.55 | 12 | Tiny yellow chick, oversized helmet | **Split** — becomes three chicks in a 25° fan, each 0.33 mass, all keep momentum ×0.85. Perfect for wide structures. | 2-15 |
| 6 | **Bantam** | 2.40 | 14 | Small, dense, steel-grey, drill-beak | **Pierce** — for 0.5 s ignores armour and deals ×3 damage; passes through one block without losing speed (no bounce). | 3-9 |
| 7 | **Pepper** | 0.95 | 16 | Scorched orange hen, smoking tailfeathers | **Fire burst** — ignites all hay and wood within 110 px: burning blocks lose 4 HP/s for 3 s and spread fire to touching flammables. | 4-2 |
| 8 | **Snowbell** | 1.05 | 17 | White hen, blue scarf, frosty breath | **Freeze burst** — converts all ice within 130 px into brittle shards (ice HP → 1) and slows nearby physics bodies 50% for 1 s. | 3-20 |
| 9 | **Mother Hen** | 3.20 | 22 | Enormous brooding hen, apron | **Mega egg** — drops a single huge egg (radius 40, mass 3) that falls with gravity and detonates on contact: radius 150, impulse 3200, screen-shaking. | 4-18 |

Behaviour requirements:
- Each chicken has a distinct silhouette readable at 32 px on screen, a distinct death/idle squawk, and a distinct impact sound pitch.
- Damaged/landed chickens do not disappear instantly: they bounce, flop, and fade out over 1.2 s with feather particles. A landed chicken is inert (no hitbox after 1.5 s) and cannot be tapped.
- The active chicken is outlined with a 2 px gold rim so the player never loses it.
- Ability input must be buffered: a tap within 100 ms of launch still registers.

## 7. PHYSICS AND DESTRUCTION SPEC

All values in design-space pixels and seconds.

**World**
- Gravity `{ x: 0, y: 2200 }`. Per-level optional override (e.g. low-gravity sky world `y: 1500`).
- **Wind:** per-level `{ x, y }` acceleration applied only to airborne chickens and light debris (not to the static world). Displayed as a HUD flag with a tail blowing in the wind direction. World 5 introduces strong wind, 250–600 px/s², with gusts that change every 2.5 s (seeded, telegraphed by the flag whipping harder 0.5 s before).
- Air drag on chickens: linear damping `0.035/s` scaled by `dragCoefficient` per chicken (Cluck 1.0, Nugget 1.4, Mother Hen 0.7).
- Ground at `y=660` unless overridden; friction 0.6.

**Materials**

| Material | HP | Restitution | Friction | Density | Notes |
|---|---|---|---|---|---|
| hay | 3 | 0.05 | 0.8 | 0.0008 | Flammable; collapses into soft debris, no bounce |
| wood | 6 | 0.12 | 0.45 | 0.0015 | Standard building block |
| ice | 2 | 0.05 | 0.15 | 0.0012 | Shatters into shards; very slippery |
| stone | 14 | 0.08 | 0.6 | 0.0030 | Heavy, crushes what's beneath it |
| metal | 30 | 0.15 | 0.35 | 0.0045 | Immovable-ish; bounces shots, immune to fire |
| crystal | 8 | 0.35 | 0.2 | 0.0020 | High restitution, chains energy to neighbours, glows when hit |
| dirt / terrain | — | 0.2 | 0.6 | static | Indestructible ground |

**Damage model**
- On a collision event, compute relative normal impulse `J`. `damage = max(0, (J - threshold) * k)` where threshold is 120 for wood/hay/ice, 260 for stone, 420 for metal, and `k = 0.02`. Tune so a full-power Cluck direct hit deals roughly 3–4 HP.
- Both bodies take damage; the lighter body takes more.
- **Crush damage:** every 0.25 s, each non-static body sums the mass supported above it along the gravity axis; if supported mass implies pressure above the material's `crushThreshold`, apply `0.6 HP` per tick. This is what makes towers collapse realistically.
- **Settle detection:** a body is asleep after 0.5 s below 4 px/s; the level evaluates its win/lose state only when *all* bodies are asleep or 4 s have passed since the last shot resolved.
- **Destruction:** at 0 HP, remove the body, spawn 4–9 debris pieces per material (hay: fluffy chunks; ice: sharp shards; wood: planks; stone: pebbles; metal: bent plates) as short-lived non-colliding cosmetics with simple velocity, plus a puff of dust. Play a material-specific crunch with pitch variance ±8%.
- Debris must be capped at 220 live particles; recycle oldest first.
- **Chain reactions:** fire spreads to touching flammables at 1.5 s intervals; crystal transfers 40% of received impulse to touching crystal bodies (max 3 hops).

**Enemies — Weasels**
- Shapes: `grunt` (radius 22, HP 10), `helmet` (radius 22 + metal helmet, HP 10 + 10 armour that absorbs the first 10 damage), `brute` (radius 30, HP 22, mass ×2), `king` (radius 36, HP 40, wears a crown, ground-shakes on landing), `boss` (radius 46, HP 90, level 29 of each world, has a two-phase state: at 50% it hurls a crate upward into the structure).
- Weasels have a hit flash (white overlay 80 ms), a squash-stretch on impact, and expressions: smug → worried (at 60% HP) → dazed (at 30%) → KO.
- On death: they pop into a spinning "X-eyes" ragdoll that tumbles off-screen with a comic slide-whistle-down and a *boing*, then despawn after 1.5 s. No blood, no gore, ever.
- A weasel that falls below the kill plane (`y > 900`) counts as defeated.
- Armoured/brute/king weasels must be beatable with the chickens supplied in their level — validate every level in §10 against this.

## 8. WORLD MAP AND WORLDS

**Five worlds, 29 levels each.** Each world has its own sky, ground, palette, particle ambience, music bed, material focus, gimmick, and a boss at level 29.

| World | Name | Material focus | Gimmick introduced | Palette (bg / mid / accent) |
|---|---|---|---|---|
| 1 | **Barnyard Basics** | hay, wood | fundamentals, gentle slopes | `#8ED9F2` / `#7BC950` / `#F4E4B2` |
| 2 | **Rusty Ranch** | wood, metal | conveyor belts, magnets, swinging hooks | `#F3C98B` / `#6B7280` / `#C2410C` |
| 3 | **Frostbite Farm** | ice, wood | slippery ground, avalanches, frozen (thawing) chickens | `#1E3A8A` / `#93C5FD` / `#DBEAFE` |
| 4 | **Volcano Roost** | stone, hay | lava pools (instakill zone), fire spread, geysers | `#3F1414` / `#44403C` / `#F97316` |
| 5 | **Sky Fortress** | crystal, metal | floating islands, wind, balloon anchors | `#0EA5E9` / `#A78BFA` / `#F0ABFC` |

**Level order rules**
- Each level introduces at most **one** new idea, and reinforces it for 2–3 levels.
- Within a world: levels 1–6 teach that world's gimmick, 7–18 combine it with prior worlds' ideas, 19–27 are expert puzzles, 28 is a "gauntlet", 29 is the boss.
- Difficulty is a smooth curve 1→10 across the whole game: level 1-1 = 1, 1-29 = 3, 2-29 = 5, 3-29 = 6.5, 4-29 = 8, 5-29 = 10.

**Levels per world (names + the one idea each level tests).** Build all 145 exactly.

### World 1 — Barnyard Basics
| # | Name | Idea |
|---|---|---|
| 1 | First Feathers | Aim and fire at a single hay wall and one weasel |
| 2 | Powder Primer | Power meter: hit a high weasel you cannot reach at low power |
| 3 | Two Birds, One Barn | Two shots, two weasels, learn the reload rhythm |
| 4 | Egg Drop | Introduce Speckle's egg bomb on a canopy of hay |
| 5 | Haystack Hurdle | Lob over a tall hay wall; direct line is blocked |
| 6 | Lean-To | Topple a simple A-frame by hitting its leg |
| 7 | Windmill Wobble | Hit a spinning windmill blade to swing it into a weasel |
| 8 | Piggy-back? No, Weasel-back | Stacked weasels: one shot to the base wins |
| 9 | Crate Expectations | Wood crates: same impulse, less damage — aim better |
| 10 | The Long Pitch | Long-range shot at max angle with wind indicator off |
| 11 | Cape and Cannon | Introduce Drumstick's dash through a crate wall |
| 12 | Tunnel Vision | Fire through a gap between two towers |
| 13 | Hay Bale Bowling | Roll a bale (round hay body) into three weasels |
| 14 | Chicken Little | Tiny target behind a big shield; must arc |
| 15 | Double Decker | Two-storey barn, one weasel per floor |
| 16 | Swing Low | Knock a hanging hay bundle onto a weasel |
| 17 | Tight Squeeze | Limited 2-chicken queue, 3 weasels |
| 18 | The Egg Vault | Golden egg tucked in a protected pocket |
| 19 | Rooftop Run | Weasel on a roof; must collapse the roof |
| 20 | Split the Coop | Structure with two load paths — break the right one |
| 21 | Sky High Hay | Elevated platform, low angle forbidden |
| 22 | Reverse Angle | Cannon angles limited to a narrow high band |
| 23 | Dominoes | Wooden plank chain reaction |
| 24 | The Long Barn | Wide structure, weak point at the far end |
| 25 | Wind Changes | Wind shifts direction mid-level |
| 26 | Scarcity | 1 chicken, 4 weasels, perfect shot required |
| 27 | Tower of Hay | Tall thin tower; break the base, not the top |
| 28 | The Gauntlet | Full roster, three structures in sequence |
| 29 | **Boss: Big Barn Bill** | Boss weasel in a fortified barn; hit the powder barrel |

### World 2 — Rusty Ranch
| # | Name | Idea |
|---|---|---|
| 1 | Rust Never Sleeps | Metal braces: shots bounce instead of breaking |
| 2 | Conveyor Welcome | Conveyor belt carries a weasel into a crusher |
| 3 | Gears and Grins | Spinning gear deflects shots; time the gap |
| 4 | Hook, Line, Sinker | Metal hook holds a stone slab; break the chain |
| 5 | Magnetism | Magnet pulls metal projectiles/plates toward it |
| 6 | Soft Landing | Introduce Puff: bounce around corners |
| 7 | The Anvil Chorus | Drop an anvil on a weasel's helmet |
| 8 | Windmill Row | Three windmills, one shared axle |
| 9 | Bolt Cutters | Chains (low-HP metal links) as structural joins |
| 10 | Piston Alley | Timed pistons block the flight path |
| 11 | Sprocket Shot | Hit a specific gear tooth to reverse a mechanism |
| 12 | The Scrapheap | Unstable pile — small nudge, big collapse |
| 13 | Crane Game | Crane lifts a crate; drop it at the right moment |
| 14 | Rivet Run | Long corridor of metal plates, one weak rivet |
| 15 | Fan Out | Introduce Nugget: three-way split past a pillar |
| 16 | The Big Magnet | Giant magnet above the fortress; use it against them |
| 17 | Greased Lightning | Slippery metal roof, shots deflect upward |
| 18 | Chain Reaction | Chain of hanging weights |
| 19 | Factory Floor | Multi-tier factory with conveyor logistics |
| 20 | Reverse Conveyor | Belt runs the wrong way; shoot the switch |
| 21 | Tin Can Alley | Five weasels, helmets, tight grouping |
| 22 | The Press | Hydraulic press arm; time the shot between cycles |
| 23 | Scaffolding | Metal scaffold with wood infill — pick the joints |
| 24 | Bolt Action | Only 2 shots, 5 weasels, use the mechanism |
| 25 | Rust Bucket | Corroded metal (HP 12) looks like metal but isn't |
| 26 | Whirligig | Rotating platform fortress |
| 27 | The Iron Barn | Nearly all metal: must use internal stone |
| 28 | The Gauntlet: Foundry | Conveyor + pistons + magnet in one run |
| 29 | **Boss: Rustbucket Rita** | Boss with a metal shield; break it with Bantam/pierce or the press |

### World 3 — Frostbite Farm
| # | Name | Idea |
|---|---|---|
| 1 | Cold Open | Ice is fragile but slippery; first shatter |
| 2 | Avalanche Alley | Snow shelf above the fortress; knock it loose |
| 3 | Thin Ice | Weight limits: overloading a shelf collapses it |
| 4 | Freezer Burn | Weasels inside an ice box; break in |
| 5 | Slippery When Frozen | Weasels slide on ice into a pit |
| 6 | Icicle Fall | Ceiling icicles drop when disturbed |
| 7 | Snowball | Roll a giant snowball down a slope |
| 8 | Cold Storage | Frozen chicken (thaws in 3 s) — wait before firing |
| 9 | Deep Drill | Introduce Bantam's pierce through 3 ice layers |
| 10 | Glacier Gap | Long shot across an ice chasm |
| 11 | Frost Pattern | Crystal-ice (World 5 preview) chains energy |
| 12 | Whiteout | Strong wind + snow; reduced visibility (still fair) |
| 13 | The Igloo | Dome structure; no flat faces to hit |
| 14 | Frozen Lake | Break the ice under a weasel's feet |
| 15 | Penguin? No. Weasel. | Weasels on sleds descend a slope |
| 16 | Cold Chain | Ice columns holding up stone — break ice, drop stone |
| 17 | Blizzard Timing | Gusty wind pulses must be timed |
| 18 | The Deep Freeze | Frozen weasels (armoured by ice, HP +8) |
| 19 | Shard Storm | Shattering a big pane creates damaging shards |
| 20 | Frost Bell | Introduce Snowbell's freeze burst |
| 21 | Iceberg Theory | Only 20% of the fortress is visible |
| 22 | Double Glaze | Two ice shells, one wooden core |
| 23 | Sleet Sniper | Long, precise shot with crosswind |
| 24 | The Vault of Ice | Golden egg encased in triple-layer ice |
| 25 | Thaw Point | Frozen chickens: choose which to thaw when |
| 26 | Cold Shoulder | Narrow-angle level, high wind, one shot |
| 27 | The Ice Palace | Large multi-room fortress |
| 28 | The Gauntlet: Whiteout | Avalanche + wind + frozen weasels |
| 29 | **Boss: Frostbite Floyd** | Boss inside an ice armour shell; freeze it, then shatter |

### World 4 — Volcano Roost
| # | Name | Idea |
|---|---|---|
| 1 | Warm Welcome | Lava pool is an instant-kill zone for chickens and weasels |
| 2 | Peppers and Powder | Introduce Pepper; burn a hay bridge |
| 3 | Ash and Bone | Stone fortress; find the one crack |
| 4 | Geyser Games | Timed geysers launch anything standing on them |
| 5 | Lava Flow | Rising lava over 60 s forces a fast clear |
| 6 | Firebreak | Burn a wooden firebreak to drop a stone ceiling |
| 7 | Magma Chamber | Weasels on an island surrounded by lava |
| 8 | Soot Sniper | Smoke reduces visibility but the arc stays visible |
| 9 | The Furnace | Burning blocks spread fire — start at the right end |
| 10 | Basalt Column | Columns collapse in sequence |
| 11 | Hot Air | Rising thermal lifts a chicken mid-flight |
| 12 | Caldera Rim | Shoot across a crater |
| 13 | Ember Rain | Falling embers ignite hay roofs |
| 14 | The Mine Cart | A cart on rails carries a weasel; derail it |
| 15 | Steam Vents | Vents push the chicken off course; use them as boosts |
| 16 | Obsidian Wall | Metal-tier HP stone; plan for 3 hits |
| 17 | The Roost | Weasel nest fortress with a chimney |
| 18 | Mother of Invention | Introduce Mother Hen's mega egg |
| 19 | Two Fires | Two separate fortresses, one shared queue |
| 20 | Lava Tube | Underground passage; the shot must enter a small mouth |
| 21 | Powder Keg | Chain of explosive barrels |
| 22 | The Bridge of Sighs | Fragile suspension bridge over lava |
| 23 | Smoke Signal | Hidden weasels revealed only when smoke clears |
| 24 | Thermal Timing | Geyser timing puzzle with a 1-shot solution |
| 25 | The Golden Egg Forge | Golden egg guarded by fire |
| 26 | Scorched Earth | 6 weasels, 4 chickens, all materials |
| 27 | The Volcano's Throat | Vertical level; shoot almost straight up |
| 28 | The Gauntlet: Eruption | Rising lava + geysers + full roster |
| 29 | **Boss: Magma Maggie** | Two-phase boss, hurls fire crates, weak point exposed in phase 2 |

### World 5 — Sky Fortress
| # | Name | Idea |
|---|---|---|
| 1 | Cloud Nine | Floating islands; low gravity (1500) |
| 2 | Wind Wanderer | Strong steady wind; aim far upwind |
| 3 | Balloon Boy | Balloons hold up structures; pop them |
| 4 | Crystal Clear | Crystal chains energy between blocks |
| 5 | Anchor Away | Anchors tether islands; break the anchors |
| 6 | The Long Fall | Weasels fall off the world when unsupported |
| 7 | Gust Front | Gusts every 2.5 s, telegraphed |
| 8 | Skybridge | Narrow crystal bridge, high value |
| 9 | Updraft | Vertical thermal columns to ride |
| 10 | The Kite | A kite tugs a structure sideways |
| 11 | Floating Market | Three small islands, three weasels |
| 12 | Pressure Drop | Low gravity + wind: long, floaty shots |
| 13 | Crystal City | Tall crystal towers, chain-collapse puzzle |
| 14 | Thunderhead | Lightning strikes a metal rod periodically |
| 15 | The Hanging Garden | Everything suspended from one beam |
| 16 | Balloon Barrage | Pop 6 balloons in the right order |
| 17 | Sky Pirates | Weasels on a moving airship platform |
| 18 | The Aerie | Big multi-island fortress |
| 19 | Thin Air | Reduced gravity, reduced drag, extreme range |
| 20 | Crosswind Canyon | Canyon walls, wind funnel |
| 21 | Shatterpoint | One crystal to shatter for total collapse |
| 22 | The Cloud Vault | Golden egg on the highest island |
| 23 | Eye of the Storm | Calm centre, violent edges |
| 24 | Falling With Style | 1 chicken, 7 weasels, pure physics |
| 25 | The Skyhook | Hook drops a metal weight |
| 26 | Final Approach | Full roster, all five gimmicks |
| 27 | The Longest Shot | Maximum range across the whole level |
| 28 | The Gauntlet: Skyfall | Islands collapse progressively |
| 29 | **Boss: The Egg Baron** | Final boss: 3 phases, 6 chickens, everything you learned |

## 9. LEVEL DESIGN RULES

1. **Every level must be solvable with the chickens in its queue**, and with at least one alternative solution (different shot order or chicken choice) that also clears it.
2. **Stars:** `1 star` = cleared. `2 stars` = score ≥ `starScore[1]`. `3 stars` = clear with at least one chicken unused **and** score ≥ `starScore[2]`. Score = `5000 per weasel + 1000 per destroyed block + 8000 per unused chicken + 10000 per golden egg`. Set `starScore[2]` to roughly 0.85× the score of a good clean solution, so 3 stars is achievable but demands efficiency.
3. **Do not gate the win on 3 stars.** Stars are score, not a lock.
4. **Difficulty comes from structure, not from removing information.** Never hide the arc, never remove the wind indicator to make a level hard.
5. **Golden eggs:** exactly one per world (5 total, placed at levels 18, 24, 18, 25, 22 as listed). They are optional collectibles that unlock cosmetics on the world select screen. Never required to progress.
6. **No soft-locks.** Validate: if the player destroys every block, any remaining weasel must be reachable by a shot.
7. **Level bounds:** all geometry within `x ∈ [0, 1280]`, `y ∈ [-600, 900]`. Camera follows the chicken with a dead zone and eases back to the cannon between shots; levels wider than the screen (optional, max 2× width) must pan smoothly.
8. **Par time** is recorded per level and shown as a personal best, but never scored.

## 10. LEVEL DATA FORMAT

All 145 levels live in `src/data/levels/worldN.ts` exporting a typed array. The type is the contract; add fields only if you update every level.

```ts
type Vec2 = { x: number; y: number };

type Material = 'hay' | 'wood' | 'ice' | 'stone' | 'metal' | 'crystal' | 'terrain';

type Block = {
  id: string;                       // unique within the level
  shape: 'box' | 'circle' | 'polygon';
  x: number; y: number;             // centre, design space
  w?: number; h?: number;           // box
  r?: number;                       // circle
  points?: Vec2[];                  // polygon, local, relative to centre
  angle?: number;                   // degrees, default 0
  material: Material;
  static?: boolean;                 // default false
  isGround?: boolean;               // terrain: indestructible
  explosive?: boolean;              // powder barrel: detonates at 0 HP
  chain?: string;                   // structural link group (metal links)
  tags?: string[];                  // 'flammable', 'magnet', 'goal' etc.
};

type Weasel = {
  id: string;
  x: number; y: number;
  type: 'grunt' | 'helmet' | 'brute' | 'king' | 'boss';
  facing?: 1 | -1;
  patrol?: { axis: 'x' | 'y'; range: number; speed: number };
};

type Level = {
  id: string;                       // 'w1-07'
  world: 1 | 2 | 3 | 4 | 5;
  index: number;                    // 1..29
  name: string;
  difficulty: number;               // 1..10
  parTimeSec: number;
  starScore: [0, number, number];
  wind: Vec2;                       // px/s^2, usually {x:0,y:0}
  gravity?: Vec2;                   // default {x:0,y:2200}
  worldWidth?: number;              // default 1280
  cannon: { x: number; y: number; minAngleDeg: number; maxAngleDeg: number };
  queue: ChickenId[];
  blocks: Block[];
  weasels: Weasel[];
  pickups?: { type: 'goldenEgg'; x: number; y: number }[];
  mechanisms?: (
    | { kind: 'conveyor'; x: number; y: number; w: number; speed: number }
    | { kind: 'magnet'; x: number; y: number; radius: number; strength: number }
    | { kind: 'piston'; x: number; y: number; axis: 'x' | 'y'; travel: number; periodS: number }
    | { kind: 'geyser'; x: number; y: number; radius: number; force: number; periodS: number; phaseS: number }
    | { kind: 'balloon'; x: number; y: number; blockId: string; lift: number }
    | { kind: 'lava'; x: number; y: number; w: number; h: number }
    | { kind: 'windZone'; x: number; y: number; w: number; h: number; wind: Vec2 }
  )[];
};
```

**Example — 1-1**

```ts
{
  id: 'w1-01', world: 1, index: 1, name: 'First Feathers', difficulty: 1,
  parTimeSec: 25, starScore: [0, 16000, 24000],
  wind: { x: 0, y: 0 },
  cannon: { x: 120, y: 600, minAngleDeg: -10, maxAngleDeg: 95 },
  queue: ['cluck', 'cluck'],
  blocks: [
    { id: 'g', shape: 'box', x: 640, y: 700, w: 1280, h: 80, material: 'terrain', static: true, isGround: true },
    { id: 'h1', shape: 'box', x: 900, y: 610, w: 30, h: 100, material: 'hay' },
    { id: 'h2', shape: 'box', x: 960, y: 610, w: 30, h: 100, material: 'hay' },
    { id: 'h3', shape: 'box', x: 930, y: 545, w: 110, h: 30, material: 'hay' },
  ],
  weasels: [{ id: 'e1', x: 930, y: 510, type: 'grunt' }],
  pickups: [],
}
```

**Example — 4-21 (mechanism level)**

```ts
{
  id: 'w4-21', world: 4, index: 21, name: 'Powder Keg', difficulty: 7,
  parTimeSec: 55, starScore: [0, 42000, 61000],
  wind: { x: 90, y: 0 },
  cannon: { x: 120, y: 600, minAngleDeg: -5, maxAngleDeg: 80 },
  queue: ['pepper', 'cluck', 'drumstick', 'speckle'],
  blocks: [
    { id: 'g', shape: 'box', x: 640, y: 700, w: 1280, h: 80, material: 'terrain', static: true, isGround: true },
    { id: 'keg1', shape: 'box', x: 780, y: 630, w: 40, h: 44, material: 'wood', explosive: true },
    { id: 'keg2', shape: 'box', x: 900, y: 630, w: 40, h: 44, material: 'wood', explosive: true },
    { id: 'keg3', shape: 'box', x: 1020, y: 630, w: 40, h: 44, material: 'wood', explosive: true },
    { id: 's1', shape: 'box', x: 840, y: 560, w: 200, h: 26, material: 'stone' },
    { id: 's2', shape: 'box', x: 960, y: 500, w: 200, h: 26, material: 'stone' },
  ],
  weasels: [
    { id: 'e1', x: 860, y: 520, type: 'helmet' },
    { id: 'e2', x: 980, y: 460, type: 'grunt' },
    { id: 'e3', x: 1100, y: 620, type: 'grunt', patrol: { axis: 'x', range: 90, speed: 40 } },
  ],
  mechanisms: [
    { kind: 'lava', x: 1150, y: 640, w: 130, h: 60 },
    { kind: 'geyser', x: 700, y: 660, radius: 60, force: 2600, periodS: 4, phaseS: 0 },
  ],
}
```

## 11. PROGRESSION AND SAVE DATA

- Three worlds-agnostic states per level: `locked` (world-level 1 is unlocked when the previous level is cleared; a world unlocks when the previous world's level 27 is cleared), `playable`, `cleared`.
- **Save shape** (`localStorage` key `chicken-fling-save-v1`):

```ts
type SaveV1 = {
  version: 1;
  levels: Record<string, { stars: 0 | 1 | 2 | 3; bestScore: number; bestTimeSec: number; goldenEgg: boolean }>;
  totalStars: number;
  settings: {
    masterVolume: number;   // 0..1
    musicVolume: number;    // 0..1
    sfxVolume: number;      // 0..1
    screenShake: boolean;
    aimAssist: 'full' | 'short' | 'off';
    reducedMotion: boolean;
    highContrast: boolean;
    showStarsOnHud: boolean;
  };
  cosmetics: { unlocked: string[]; equipped: string | null };
};
```

- Write on every meaningful change (debounced 250 ms) plus on `visibilitychange` and `pagehide`.
- Migrate unknown versions forward; on corrupt JSON, start fresh and log one line — never crash.

## 12. SCREENS AND UI

All screens are canvas-rendered (no DOM overlays except a single loading div), with a consistent chunky wooden-sign visual language.

1. **Boot / Loading** — barn doors opening; asset generation happens here (procedural textures, audio graphs). Never blocks longer than 500 ms.
2. **Title** — logo `CHICKEN FLING`, a cannon with a chicken peeking out, buttons: **Play**, **Worlds**, **Options**, **Credits**. One-shot gunpowder animation loop behind the logo.
3. **World select** — five big cards, locked worlds greyed with a padlock and a "clear 1-27" hint, star totals per world, golden egg counter (x/5).
4. **Level select** — 29 nodes per world on a winding path, stars under each node, best score on hover, locked nodes dim. Must be scrollable and thumb-friendly on mobile.
5. **In-game HUD** — chicken queue (bottom-left), shot counter, star progress meter, score (top-left), pause (top-right), world/level label, wind flag, golden egg indicator if present, subtle "tap to use ability" hint on the first airborne chicken of a session.
6. **Pause** — dimmed playfield, **Resume / Restart / Options / Quit to level select**, plus a "restart" hotkey hint.
7. **Level complete** — banner slam-in, star-by-star pop with sound, score tally counting up, unused chicken bonus, **Next** and **Replay**, and a "3 stars: perfect!" flourish.
8. **Level failed** — "Out of chickens!" with a sulking chicken, **Retry** (instant), **Quit**. No forced ad, no wait.
9. **Options** — sliders and toggles for everything in `SaveV1.settings`, plus **Reset progress** (double confirm).
10. **Credits** — a short scroll: made with a cannon, some chickens, and no external assets.

**Input**
- Mouse and touch both first-class. Drag to aim/charge, tap/space to use ability. `Esc`/`P` pause, `R` restart, `M` mute, `N` next level after a win.
- All hit targets ≥ 44×44 CSS px. Nothing relies on hover.
- Pause automatically on `blur` and on `visibilitychange`.

## 13. ART DIRECTION (procedural, no assets)

- **Style:** flat vector shapes with 3 px chunky outlines, 2–3 tone shading per object, thick cartoon proportions, no gradients beyond a soft sky gradient and a vignette.
- **Line weight scales** with object size so small blocks don't look like noise.
- **Every object is code-drawn**: blocks are rounded rects/polygons with wood grain, plank seams, ice highlights, stone speckles, hay strands, rivets on metal, facets on crystal. Build a tiny `Textures` module with cached offscreen canvases per material variant (max 24 cached canvases, regenerate on DPR change).
- **Chickens**: 42–56 px tall, big eyes, distinct comb/hat/props per roster entry, and a 6-frame procedural squash-stretch rig (no sprite sheets). Idle: breathing bob + occasional blink + head tilt.
- **Weasels**: long snouts, tiny ears, smug half-lidded eyes, mustard-brown fur, dark mask around the eyes.
- **Backgrounds**: 3 parallax layers per world (far sky shapes, mid hills/silhouettes, near grass/ash/snow), parallax factors 0.15 / 0.4 / 0.75, plus world-specific ambient particles (pollen, embers, snow, sparks, petals). Cap particles at 180.
- **Foreground**: subtle vignette, sun glint, and a dust haze near the ground.
- **Type:** system rounded stack — `ui-rounded, "Nunito", "Baloo 2", "Trebuchet MS", system-ui, sans-serif`. No webfont downloads. Sizes: 72 title / 32 heading / 20 body / 14 hint.
- **Reduced motion** disables shake, slow-mo and parallax drift; **high contrast** thickens outlines to 5 px and darkens block fills.

## 14. AUDIO (100% synthesised with WebAudio)

No files. Build a small `Audio` module with a master chain: `masterGain → compressor → destination`, plus separate `musicBus` and `sfxBus`.

Required sounds, all procedural:
- Cannon fire (noise burst + 120→45 Hz sine sweep + carriage clank), scaled by power.
- Charge loop (rising sawtooth + filtered noise, pitch maps to charge).
- Barrel rotate (creaking, low-rate noise + resonant filter).
- Material crunches: hay (soft filtered noise), wood (crack + low knock), ice (bright shatter, 3 detuned sine pings), stone (heavy thud + gravel noise), metal (metallic ring, 2 detuned triangle waves).
- Chicken launch squawk, ability sounds per chicken (egg fuse hiss, dash whoosh, inflate pop, split chirps, drill whirr, fire whoomph, freeze shimmer, mega egg rumble).
- Weasel hit (boing), weasel KO (slide-whistle down + pop), level win jingle (5-note major arpeggio on a soft square), level fail (3-note descending minor), star pop (bright blip, rising pitch per star), UI click/hover.
- Music: two 8-bar loops per world, generated from a seeded note table (soft marimba/bell timbre for worlds 1–3, low drones + percussion for 4–5), crossfaded over 0.8 s on world change. Music must duck to 40% while a shot resolves.
- **Voice limiting:** max 12 simultaneous voices; drop the quietest. All nodes disconnected after use. No clicks, no pops, no clipping — keep master peak below −1 dBFS.
- Audio must be unlocked by the first user gesture (browser autoplay policy) and survive `visibilitychange` without duplicating nodes.

## 15. PERFORMANCE AND QUALITY BARS

- 60 fps at 1280×720 on a mid-range laptop with a 3-tier fortress and 60 bodies; never drop below 45 fps.
- Frame budget: physics ≤ 6 ms, render ≤ 8 ms. No per-frame allocations in hot loops (pool vectors, particles, arrays).
- Only redraw dirty regions if profiling shows it helps; otherwise full redraw with cached backgrounds.
- Steady memory: particle pools, no unbounded arrays, no listener leaks across level restarts.
- No layout thrash; the canvas resizes on `resize`/DPR change only.
- All gameplay runs at a fixed timestep, so behaviour is identical at 30/60/120 Hz displays.
- Bundle under 400 KB gzipped total (matter is most of it). No code splitting needed.

## 16. PROJECT STRUCTURE

```
chicken-fling/
├─ index.html
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ README.md
├─ DECISIONS.md
├─ src/
│  ├─ main.ts                 # boot, canvas setup, main loop
│  ├─ core/
│  │  ├─ loop.ts              # fixed timestep, accumulator, time scale
│  │  ├─ input.ts             # pointer/keyboard, tap buffering
│  │  ├─ rng.ts               # mulberry32 + helpers
│  │  ├─ events.ts            # tiny typed event bus
│  │  └─ pool.ts
│  ├─ game/
│  │  ├─ Game.ts              # state machine: menu → level → result
│  │  ├─ LevelRuntime.ts      # builds matter world from Level data
│  │  ├─ Cannon.ts            # aim, charge, recoil, loading
│  │  ├─ Chicken.ts           # projectile + abilities
│  │  ├─ Weasel.ts
│  │  ├─ Damage.ts            # impulse→damage, crush, settle
│  │  ├─ Mechanisms.ts        # conveyors, magnets, pistons, geysers, lava, wind, balloons
│  │  ├─ Scoring.ts
│  │  └─ Camera.ts
│  ├─ render/
│  │  ├─ Renderer.ts          # layered draw order
│  │  ├─ Textures.ts          # cached procedural material canvases
│  │  ├─ DrawChicken.ts  DrawWeasel.ts  DrawCannon.ts
│  │  ├─ Particles.ts
│  │  └─ Backgrounds.ts       # 5 parallax worlds
│  ├─ audio/Audio.ts
│  ├─ ui/
│  │  ├─ Screens.ts  Hud.ts  LevelSelect.ts  Options.ts
│  │  └─ widgets.ts           # buttons, sliders, stars, panels
│  ├─ data/
│  │  ├─ types.ts
│  │  ├─ chickens.ts  materials.ts  worlds.ts
│  │  └─ levels/world1.ts … world5.ts
│  └─ save/Save.ts
```

Rules: no file over 600 lines; no cross-imports from `render/` into `game/`; `data/` imports nothing from `game/`; `Game.ts` is the only place that mutates top-level state.

## 17. BUILD ORDER (do it in this sequence, verify each step)

1. **Bootable shell** — Vite + TS + canvas scaling + loop + input. Ship a moving square that responds to drag. *Verify: `npm run dev` and `npm run build` both work.*
2. **Physics sandbox** — matter world, ground, blocks, a projectile fired by the cannon with aim/charge/preview/recoil. *Verify: a shot knocks a hay tower over and it looks heavy.*
3. **Damage, destruction, debris, settle detection.**
4. **Weasels, win/lose, scoring, stars.**
5. **Full chicken roster with abilities.**
6. **UI: HUD, level select, world select, results, options, save.**
7. **World 1 all 29 levels + boss.** Playtest and tune.
8. **Worlds 2–5, all 116 remaining levels, world palette/parallax/ambience per world, mechanisms.**
9. **Audio pass, particles pass, game feel pass (shake, slow-mo, easing), polish.**
10. **Hardening:** mobile touch, resize, reduced-motion, high-contrast, save migration, performance, final QA.

Commit after each step with a clear message. Never leave the game un-runnable between commits.

## 18. DEFINITION OF DONE — QA CHECKLIST

Verify and report each of these explicitly:

- [ ] `npm run build` succeeds with no TypeScript errors and no console warnings on load.
- [ ] 145 levels exist, all with unique ids, valid JSON, and every id referenced by the world/level select.
- [ ] Every level is completable; no level requires more chickens than its queue holds; no soft-lock possible.
- [ ] All 9 chickens appear in at least 8 levels each; every ability works and is single-use.
- [ ] All 5 bosses exist and are beatable.
- [ ] Stars compute correctly, persist across reload, and never regress.
- [ ] Golden eggs: 5 exist, all collectable, tracked in the save, shown on world select.
- [ ] Win, lose, restart, quit-to-map, and next-level all work with no state leaking between levels (verify by restarting a level 10 times in a row — memory and behaviour must be stable).
- [ ] Cannon: aim, charge, cancel, fire, recoil, reload, power scaling, and the preview arc all behave as specified.
- [ ] No external network request at runtime (check the network panel on a built `dist/` preview).
- [ ] No external assets: HTML/CSS/JS only, no fonts, images or audio files.
- [ ] Runs at ≥ 45 fps in the busiest levels; no unbounded growth in particle or body counts.
- [ ] Touch works: drag-aim, tap-ability, and all menus usable at 390×844.
- [ ] Audio unlocks on first gesture, mutes fully, and does not clip.
- [ ] Reduced-motion and high-contrast modes visibly change the game.
- [ ] Save survives a reload, a corrupt-value injection, and a version bump.

## 19. STRETCH GOALS — DO NOT BUILD THEM

Mention these in `README.md` under "Future ideas" only: daily challenge, level editor, chicken skins, endless mode, co-op. **Do not implement any of them.** Finish the 145 levels first.

## 20. HOW TO REPORT BACK

When you finish, output:

1. A one-paragraph summary of what the game is and how it plays.
2. The exact commands to install, run, and build.
3. A file tree of what you created.
4. The QA checklist from §18 with each item marked ✅ or ❌ (and a one-line reason for any ❌).
5. The three levels you think are the best-designed and why.
6. Anything you decided that the brief did not specify, listed as bullet points linking to `DECISIONS.md`.

Do not stop to ask questions. Build the whole thing.

===== END PROMPT =====
