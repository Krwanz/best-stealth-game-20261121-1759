// Screenshot scenes behind ?shot=start|play|alert|win. Each one builds a real
// game state with the same rules (guards mid-patrol, real suspicion values,
// real intel counts) and stages it deterministically, so the frame is what a
// short game really looks like and the same scene always gives the same frame.

import { INTEL_COUNT } from './config.js';
import { createCamera, createGuard, STATE_CHASE, STATE_INVESTIGATE } from './guards.js';
import { CAMERA_MOUNTS, GUARD_PATROLS, INTEL_SPOTS, PLAYER_SPAWN } from './levels.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

function baseWatchers() {
  const watchers = GUARD_PATROLS.map((patrol) => createGuard(patrol));
  for (const mount of CAMERA_MOUNTS) watchers.push(createCamera(mount));
  return watchers;
}

function placeGuardAtPatrol(watchers, index, waypoint, fraction) {
  const guard = watchers[index];
  const from = guard.patrol[waypoint];
  const to = guard.patrol[(waypoint + 1) % guard.patrol.length];
  guard.x = from.x + (to.x - from.x) * fraction;
  guard.y = from.y + (to.y - from.y) * fraction;
  guard.angle = Math.atan2(to.y - from.y, to.x - from.x);
  guard.waypointIndex = (waypoint + 1) % guard.patrol.length;
}

/**
 * Build the staged state for a shot name and return { view, screen, bestTime }.
 * `view` is exactly what the renderer draws in normal play.
 */
export function stageShot(name) {
  const watchers = baseWatchers();
  const intelTaken = INTEL_SPOTS.map(() => false);
  let player = { x: PLAYER_SPAWN.x, y: PLAYER_SPAWN.y, angle: -Math.PI / 2, crouched: false, running: false, noise: null };
  let time = 0;
  let screen = SCREEN_TITLE;

  if (name === 'play') {
    // Mid-play: Wren crouched in the bush by the central hall, a guard's cone
    // sweeping past, one ledger already pocketed, suspicion half full.
    placeGuardAtPatrol(watchers, 1, 0, 0.35);
    placeGuardAtPatrol(watchers, 2, 0, 0.5);
    placeGuardAtPatrol(watchers, 0, 0, 0.6);
    watchers[1].suspicion = 0.45;
    watchers[1].state = STATE_INVESTIGATE;
    watchers[1].lastSeen = { x: 560, y: 330 };
    watchers[1].angle = Math.atan2(330 - watchers[1].y, 560 - watchers[1].x);
    player = { x: 560, y: 330, angle: Math.PI / 4, crouched: true, running: false, noise: null };
    intelTaken[0] = true;
    time = 74;
    screen = SCREEN_PLAY;
  } else if (name === 'alert') {
    // Near-miss turned alarm: spotted crossing the north passage, a guard
    // chasing, the camera red, two ledgers in hand.
    placeGuardAtPatrol(watchers, 3, 0, 0.5);
    watchers[3].x = 1330;
    watchers[3].y = 170;
    watchers[3].angle = Math.atan2(210 - 170, 1290 - 1330);
    watchers[3].suspicion = 1;
    watchers[3].state = STATE_CHASE;
    watchers[3].lastSeen = { x: 1290, y: 210 };
    watchers[6].suspicion = 0.8;
    watchers[6].angle = Math.atan2(210 - 60, 1290 - 640);
    player = { x: 1290, y: 210, angle: -Math.PI / 2, crouched: false, running: true, noise: { x: 1290, y: 210, radius: 155 } };
    intelTaken[0] = true;
    intelTaken[2] = true;
    time = 148;
    screen = SCREEN_PLAY;
  } else if (name === 'win') {
    // The getaway: all three ledgers, Wren at the open exit.
    for (const watcher of watchers) {
      watcher.suspicion = 0;
    }
    placeGuardAtPatrol(watchers, 3, 0, 0.2);
    player = { x: 1500, y: 152, angle: -Math.PI / 2, crouched: false, running: false, noise: null };
    intelTaken[0] = true;
    intelTaken[1] = true;
    intelTaken[2] = true;
    time = 214;
    screen = SCREEN_WIN;
  } else {
    // Title: the archive at rest, guards on their routes, Wren at the door.
    placeGuardAtPatrol(watchers, 0, 0, 0.3);
    placeGuardAtPatrol(watchers, 1, 0, 0.6);
    placeGuardAtPatrol(watchers, 4, 0, 0.4);
    screen = SCREEN_TITLE;
  }

  const intelCount = intelTaken.filter(Boolean).length;
  return {
    view: {
      player,
      // Title shot: frame the whole archive — exit, cones, cover — at once.
      cameraFocus: name === 'play' || name === 'alert' || name === 'win' ? undefined : { x: 900, y: 380 },
      watchers,
      intelTaken,
      intelCount,
      exitOpen: intelCount >= INTEL_COUNT,
      time,
      alertLevel: watchers.some((w) => w.state === STATE_CHASE) ? 'ALARM' : watchers.some((w) => w.suspicion >= 0.35) ? 'SUSPICIOUS' : 'CALM',
      maxSuspicion: Math.max(...watchers.map((w) => w.suspicion)),
      playerHidden: name === 'play',
      stanceHint: name === 'play' ? 'CROUCHED · hidden' : 'WASD · Shift run · C crouch',
    },
    screen,
    bestTime: name === 'win' ? 214 : 0,
  };
}
