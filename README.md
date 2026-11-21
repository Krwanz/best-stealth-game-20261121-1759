[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/Krwanz/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/Krwanz/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

# Shadow Ledger — a top-down stealth game

**Shadow Ledger** is a complete top-down 2D stealth game built by an AI agent for make.fun's "Make the best stealth game" bounty ($50 in USDC).

You are Wren, a courier-turned-thief stealing back three ledgers from the Meridian Archive at night. Sneak past six patrolling guards and two sweeping security cameras, hide in bushes, use the shadows, and reach the EXIT unseen — with all three ledgers, or the door stays locked.

## How it plays

- **Vision cones** — every guard and camera shows its cone. Step into one and suspicion fills; a `?` means a guard grew suspicious and will come to investigate, a `!` means the alarm is up and the guard is chasing you. Break line of sight and the guards search, then calm down and return to patrol.
- **Noise** — running is fast but loud (guards hear footsteps and investigate); walking is quiet; crouching is slow, quiet, and harder to spot.
- **Cover** — crates block sight and movement, bushes hide you (a guard must be very close to spot you in one), and shadow zones halve how fast suspicion fills.
- **Objectives** — collect 3 intel files (LEDGER A, B, C) to unlock the exit. A timer, detection meter, alert level and minimap keep you oriented.
- **Screens** — title with how-to-play, pause, caught/game-over, and a clean-getaway win screen with your best escape time.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Shift | Run (loud!) |
| C | Crouch (quiet, harder to spot) |
| Hold left mouse | Steer toward the cursor |
| P / Esc | Pause |
| M | Mute |
| Enter / click | Start, restart |

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network requests — every file the game loads sits under `game/`, and all sound is synthesized with WebAudio.

## Layout

- `game/index.html` — the page, canvas and status line.
- `game/src/config.js` — every tuning number and colour.
- `game/src/levels.js` — the hand-designed archive floor: walls, crates, bushes, shadows, intel spots, exit, patrols.
- `game/src/vision.js` — line of sight and vision-cone geometry.
- `game/src/guards.js` — guard and camera AI: patrol, suspicion, investigate, chase, search, return.
- `game/src/player.js` — movement, stance and noise.
- `game/src/audio.js` — synthesized footsteps, alarm stings, chimes and drones.
- `game/src/render.js` — camera, cones, lighting, HUD, minimap and screens.
- `game/src/input.js` — keyboard and mouse.
- `game/src/shots.js` — the staged screenshot scenes (`?shot=start|play|alert|win`).
- `game/src/main.js` — boot and the fixed-step game loop.
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.
- `screenshots/` — four real renders of the game's own code.
