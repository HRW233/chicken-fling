# Chicken Fling — Mega Prompt

A single, paste-ready build brief for creating **Chicken Fling**: an Angry Birds–style physics destruction game where a **barn cannon** replaces the slingshot and an arsenal of **chickens** replaces the birds.

**Contents of the brief:**

- The cannon: aiming, drag-to-charge powder meter, recoil, muzzle flash, trajectory preview, loading animation
- A 9-chicken roster, each with a distinct mass and a one-shot tap-in-flight ability
- A full physics and destruction spec: material HP, impulse damage, crush damage, settle detection, chain reactions
- Weasel enemies (grunts, helmets, brutes, kings, bosses) and their comedy KO behaviour
- **5 worlds × 29 levels = 145 levels**, each level named with the single idea it teaches
- Level data schema in TypeScript, with two worked examples
- Scoring, three-star thresholds, golden eggs, save format, and screen-by-screen UI
- Procedural art and synthesised audio rules (no external assets at all)
- Fixed-timestep architecture, file layout, build order, and a QA checklist for "done"

## How to use it

1. Open [CHICKEN-FLING-MEGA-PROMPT.md](CHICKEN-FLING-MEGA-PROMPT.md).
2. Copy everything from `===== BEGIN PROMPT =====` to the end of the file.
3. Paste it into your coding agent and let it build.

The brief is written to be self-contained: the agent should not need to ask you a single question.

## The pitch, in one line

*Load the coop's finest into the cannon, aim true, and knock the egg-thieving weasels out of their fortresses across five worlds and 145 levels.*
