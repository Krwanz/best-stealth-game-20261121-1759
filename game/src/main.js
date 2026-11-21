// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between five screens: title, play,
// paused, caught and win.
//
// ?shot=start|play|alert|win stages that scene instead of running the loop,
// paints it twice and sets window.__shotReady for a screenshot.

import { INTEL_COUNT, STEP } from './config.js';
import { blockingRects, CAMERA_MOUNTS, GUARD_PATROLS, INTEL_SPOTS, PLAYER_SPAWN, EXIT } from './levels.js';
import { anyChasing, createCamera, createGuard, maxSuspicion, stepGuards } from './guards.js';
import { createPlayer, playerHiding, stepPlayer } from './player.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);
const audio = createAudio();
const rects = blockingRects();

function readBest() {
  try {
    return Number.parseFloat(window.localStorage.getItem('shadow-ledger-best') ?? '0') || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem('shadow-ledger-best', String(value));
  } catch {
    // Storage can be off: the best time then lasts this visit only.
  }
}

function runShot(name) {
  const staged = stageShot(name);
  let painted = 0;
  function paint() {
    renderer.draw(staged.view, staged.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

if (shot) {
  runShot(shot);
} else {
  runGame();
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  let player = createPlayer(PLAYER_SPAWN);
  let watchers = freshWatchers();
  let intelTaken = INTEL_SPOTS.map(() => false);
  let time = 0;
  let guardStepTimer = 0;
  let wasAlarmed = false;
  let wasSuspicious = false;

  function freshWatchers() {
    const list = GUARD_PATROLS.map((patrol) => createGuard(patrol));
    for (const mount of CAMERA_MOUNTS) list.push(createCamera(mount));
    return list;
  }

  function intelCount() {
    return intelTaken.filter(Boolean).length;
  }

  function exitOpen() {
    return intelCount() >= INTEL_COUNT;
  }

  function alertLevel() {
    if (anyChasing(watchers)) return 'ALARM';
    if (maxSuspicion(watchers) >= 0.35) return 'SUSPICIOUS';
    return 'CALM';
  }

  function announce(message) {
    status.textContent = message;
  }

  function resetGame() {
    player = createPlayer(PLAYER_SPAWN);
    watchers = freshWatchers();
    intelTaken = INTEL_SPOTS.map(() => false);
    time = 0;
    accumulator = 0;
    wasAlarmed = false;
    wasSuspicious = false;
  }

  function startGame() {
    audio.unlock();
    resetGame();
    screen = SCREEN_PLAY;
    announce('Playing. Steal three ledgers and reach the exit unseen.');
  }

  function endGame(caught) {
    audio.unlock();
    screen = caught ? SCREEN_OVER : SCREEN_WIN;
    if (!caught) {
      if (best === 0 || time < best) {
        best = time;
        saveBest(best);
      }
      audio.win();
      announce(`Clean getaway in ${time.toFixed(0)} seconds.`);
    } else {
      audio.caught();
      announce(`Caught after ${time.toFixed(0)} seconds with ${intelCount()} ledgers.`);
    }
  }

  function stanceHint() {
    if (player.crouched) return 'CROUCHED · hidden';
    if (player.running) return 'RUNNING · loud';
    return 'WASD · Shift run · C crouch';
  }

  function view() {
    const hiding = playerHiding(player);
    return {
      player,
      watchers,
      intelTaken,
      intelCount: intelCount(),
      exitOpen: exitOpen(),
      time,
      alertLevel: alertLevel(),
      maxSuspicion: maxSuspicion(watchers),
      playerHidden: hiding.hidden,
      stanceHint: stanceHint(),
      bestTime: best,
    };
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM) {
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN) startGame();
      else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
  }

  function step() {
    if (screen !== SCREEN_PLAY) return;
    time += STEP;

    // Steering: keys, or hold the mouse to walk toward the cursor.
    let direction = input.keyDirection();
    if (direction.x === 0 && direction.y === 0 && input.mouseHeld()) {
      const mouse = input.mousePosition();
      const rect = canvas.getBoundingClientRect();
      const scale = Math.min(canvas.width / 1280, canvas.height / 720);
      const mouseWorldX = cameraX() + ((mouse.x - rect.left) * (canvas.width / rect.width)) / scale;
      const mouseWorldY = cameraY() + ((mouse.y - rect.top) * (canvas.height / rect.height)) / scale;
      const dx = mouseWorldX - player.x;
      const dy = mouseWorldY - player.y;
      const length = Math.hypot(dx, dy);
      if (length > 12) direction = { x: dx / length, y: dy / length };
    }
    const stance = input.stance();
    const footstep = stepPlayer(player, direction.x, direction.y, stance, STEP, rects);
    if (footstep === 'step') audio.footstep(player.running, 0);

    // Guard footsteps: the nearest patrolling guard, so the player hears them coming.
    guardStepTimer -= STEP;
    if (guardStepTimer <= 0) {
      guardStepTimer = 0.5;
      let nearest = null;
      let nearestDistance = Infinity;
      for (const watcher of watchers) {
        if (watcher.kind !== 'guard') continue;
        const distance = Math.hypot(player.x - watcher.x, player.y - watcher.y);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = watcher;
        }
      }
      if (nearest && nearestDistance < 420) audio.guardStep(nearestDistance);
    }

    const hiding = playerHiding(player);
    const seenPlayer = {
      x: player.x,
      y: player.y,
      hidden: hiding.hidden,
      inShadow: hiding.inShadow,
      crouched: hiding.crouched,
      noise: player.noise,
    };
    const hooks = {
      onAlarm() {
        audio.alarm();
        announce('Alarm! A guard is chasing you.');
      },
      onSuspicion() {
        audio.suspicious();
      },
      onCaught() {},
    };
    const caught = stepGuards(watchers, seenPlayer, rects, STEP, hooks);

    // Alarm edge: one sting when the alarm starts, one calm phrase when it ends.
    const alarmed = anyChasing(watchers);
    if (alarmed && !wasAlarmed) announce('Alarm! Run and break line of sight.');
    if (!alarmed && wasAlarmed) audio.calmDown();
    wasAlarmed = alarmed;
    const suspicious = maxSuspicion(watchers) >= 0.35;
    if (suspicious && !wasSuspicious) announce('A guard is suspicious.');
    wasSuspicious = suspicious;

    // Pick up intel: walk over a glowing ledger.
    for (let i = 0; i < INTEL_SPOTS.length; i += 1) {
      if (intelTaken[i]) continue;
      const spot = INTEL_SPOTS[i];
      if (Math.hypot(player.x - spot.x, player.y - spot.y) < 34) {
        intelTaken[i] = true;
        audio.pickup();
        if (exitOpen()) {
          audio.unlockExit();
          announce('All three ledgers. The exit is open — go!');
        } else {
          announce(`Ledger ${intelCount()} of ${INTEL_COUNT}.`);
        }
      }
    }

    // Reach the open exit to win.
    if (exitOpen() && player.x > EXIT.x - 6 && player.x < EXIT.x + EXIT.w + 6 && player.y > EXIT.y - 6 && player.y < EXIT.y + EXIT.h + 6) {
      endGame(false);
      return;
    }
    if (caught) endGame(true);
  }

  // Camera origin in world pixels, mirroring the renderer's camera math, so
  // mouse steering aims at the right world point.
  function cameraX() {
    const scale = Math.min(canvas.width / 1280, canvas.height / 720);
    const visibleW = canvas.width / scale;
    let x = player.x - visibleW / 2;
    x = Math.max(0, Math.min(1600 - visibleW, x));
    return x;
  }

  function cameraY() {
    const scale = Math.min(canvas.width / 1280, canvas.height / 720);
    const visibleH = canvas.height / scale;
    let y = player.y - visibleH / 2;
    y = Math.max(0, Math.min(1000 - visibleH, y));
    return y;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(view(), screen);
  }

  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyM' && !event.repeat) audio.toggleMute();
  });

  // Debug hook for automated play-testing: read-only state plus a warp that
  // moves the player (used by the maker's own headless tests, never by play).
  window.__shadowLedger = {
    state() {
      return {
        screen,
        time,
        player: { x: Math.round(player.x), y: Math.round(player.y) },
        intelCount: intelCount(),
        exitOpen: exitOpen(),
        alertLevel: alertLevel(),
        maxSuspicion: maxSuspicion(watchers),
        watchers: watchers.map((watcher) => ({ kind: watcher.kind, state: watcher.state, suspicion: watcher.suspicion })),
      };
    },
    warp(x, y) {
      player.x = x;
      player.y = y;
    },
  };

  requestAnimationFrame(frame);
}
