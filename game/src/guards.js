// Guard and camera AI: patrol routes the player can learn, a suspicion meter
// that fills when the player is seen, investigation of the last seen spot, a
// full alarm only after sustained sight, then a search and a calm return to
// patrol. Noise (running footsteps) pulls nearby guards to investigate.
// Pure logic, no DOM: Node can import this for tests.

import { CAMERA, GUARD, STEP } from './config.js';
import { angleDifference, canSeePlayer, circleHitsRects } from './vision.js';

export const STATE_PATROL = 'patrol';
export const STATE_SUSPICIOUS = 'suspicious';
export const STATE_INVESTIGATE = 'investigate';
export const STATE_CHASE = 'chase';
export const STATE_SEARCH = 'search';
export const STATE_RETURN = 'return';

/** One patrolling guard from a waypoint list. */
export function createGuard(patrol) {
  const start = patrol[0];
  return {
    kind: 'guard',
    x: start.x,
    y: start.y,
    angle: 0,
    patrol,
    waypointIndex: 1 % patrol.length,
    state: STATE_PATROL,
    suspicion: 0,
    lastSeen: null,
    loseSightTimer: 0,
    searchTimer: 0,
    pauseTimer: 0,
    speed: 0,
  };
}

/** One fixed security camera that sweeps its cone back and forth. */
export function createCamera(mount) {
  return {
    kind: 'camera',
    x: mount.x,
    y: mount.y,
    angle: mount.baseAngle,
    baseAngle: mount.baseAngle,
    sweepPhase: 0,
    state: STATE_PATROL,
    suspicion: 0,
    lastSeen: null,
    viewRange: CAMERA.viewRange,
    viewHalfAngle: CAMERA.viewHalfAngle,
  };
}

/** Move a guard toward (tx, ty) at `speed`, sliding along blocking rects. */
export function moveTowardGuard(guard, tx, ty, speed, dt, rects) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1) return true;
  const step = Math.min(distance, speed * dt);
  const nx = guard.x + (dx / distance) * step;
  const ny = guard.y + (dy / distance) * step;
  guard.angle = Math.atan2(dy, dx);
  if (!circleHitsRects(nx, guard.y, GUARD.radius, rects)) guard.x = nx;
  if (!circleHitsRects(guard.x, ny, GUARD.radius, rects)) guard.y = ny;
  return distance - step < 2;
}

/**
 * Advance every guard and camera one step.
 * `player` carries x, y, hidden (in a bush), inShadow, crouched and a noise
 * object {x, y, radius} while moving, else null. `hooks` receives
 * onAlarm(watcher), onSuspicion(watcher) and onCaught(guard) callbacks.
 * Returns true when a guard caught the player.
 */
export function stepGuards(watchers, player, rects, dt, hooks) {
  let caught = false;
  for (const watcher of watchers) {
    if (watcher.kind === 'camera') {
      stepCamera(watcher, player, rects, dt, hooks, watchers);
      continue;
    }
    stepGuard(watcher, player, rects, dt, hooks);
    if (watcher.state === STATE_CHASE) {
      const distance = Math.hypot(player.x - watcher.x, player.y - watcher.y);
      if (distance < GUARD.catchDistance) {
        caught = true;
        hooks.onCaught?.(watcher);
      }
    }
  }
  return caught;
}

function watcherView(watcher) {
  return {
    x: watcher.x,
    y: watcher.y,
    angle: watcher.angle,
    viewRange: watcher.viewRange ?? GUARD.viewRange,
    viewHalfAngle: watcher.viewHalfAngle ?? GUARD.viewHalfAngle,
  };
}

function fillSuspicion(watcher, player, rects, dt) {
  const seen = canSeePlayer(watcherView(watcher), player, rects, player.hidden, GUARD.bushSpotDistance);
  if (seen) {
    watcher.lastSeen = { x: player.x, y: player.y };
    const distance = Math.hypot(player.x - watcher.x, player.y - watcher.y);
    const proximity = distance < 90 ? 1.3 : distance > 180 ? 0.8 : 1;
    const darkness = player.inShadow ? 0.5 : 1;
    const crouch = player.crouched ? 0.75 : 1;
    watcher.suspicion = Math.min(1, watcher.suspicion + GUARD.suspicionFill * proximity * darkness * crouch * dt);
    watcher.loseSightTimer = 0;
  } else {
    watcher.suspicion = Math.max(0, watcher.suspicion - GUARD.suspicionDrain * dt);
    watcher.loseSightTimer += dt;
  }
  return seen;
}

function stepCamera(camera, player, rects, dt, hooks, watchers) {
  camera.sweepPhase += dt * CAMERA.sweepSpeed;
  camera.angle = camera.baseAngle + Math.sin(camera.sweepPhase) * CAMERA.sweepArc;
  const seen = fillSuspicion(camera, player, rects, dt);
  if (camera.suspicion >= 1) {
    // A camera never chases: it trips the alarm and the guards come running.
    camera.suspicion = 0.55;
    hooks.onAlarm?.(camera);
    for (const other of watchers) {
      if (other.kind !== 'guard') continue;
      other.state = STATE_INVESTIGATE;
      other.lastSeen = { x: player.x, y: player.y };
      other.suspicion = Math.max(other.suspicion, 0.6);
    }
  } else if (camera.suspicion >= GUARD.suspiciousAt && seen) {
    hooks.onSuspicion?.(camera);
  }
}

function stepGuard(guard, player, rects, dt, hooks) {
  const seen = fillSuspicion(guard, player, rects, dt);
  const heard = player.noise && Math.hypot(player.noise.x - guard.x, player.noise.y - guard.y) < player.noise.radius;

  if (guard.suspicion >= 1) {
    if (guard.state !== STATE_CHASE) hooks.onAlarm?.(guard);
    guard.state = STATE_CHASE;
  }

  switch (guard.state) {
    case STATE_CHASE: {
      if (seen) {
        moveTowardGuard(guard, player.x, player.y, GUARD.chaseSpeed, dt, rects);
      } else if (guard.lastSeen) {
        moveTowardGuard(guard, guard.lastSeen.x, guard.lastSeen.y, GUARD.chaseSpeed, dt, rects);
      }
      if (guard.loseSightTimer > 3) {
        guard.state = STATE_SEARCH;
        guard.searchTimer = GUARD.searchSeconds;
      }
      break;
    }
    case STATE_SUSPICIOUS:
    case STATE_INVESTIGATE: {
      // Walk to the last seen (or heard) spot while any suspicion remains;
      // only give up and return to patrol once suspicion has fully drained.
      if (guard.lastSeen && (guard.suspicion > 0 || seen)) {
        const arrived = moveTowardGuard(guard, guard.lastSeen.x, guard.lastSeen.y, GUARD.investigateSpeed, dt, rects);
        if (arrived) {
          guard.state = STATE_SEARCH;
          guard.searchTimer = GUARD.searchSeconds;
        }
      } else {
        guard.state = STATE_PATROL;
      }
      break;
    }
    case STATE_SEARCH: {
      // Scan the room: slow turn, looking for the player.
      guard.angle += dt * 1.6;
      guard.searchTimer -= dt;
      if (seen) {
        guard.state = guard.suspicion >= 1 ? STATE_CHASE : STATE_INVESTIGATE;
      } else if (guard.searchTimer <= 0) {
        guard.suspicion = 0;
        guard.state = STATE_RETURN;
      }
      break;
    }
    case STATE_RETURN: {
      const target = guard.patrol[guard.waypointIndex];
      const arrived = moveTowardGuard(guard, target.x, target.y, GUARD.patrolSpeed, dt, rects);
      if (arrived) guard.state = STATE_PATROL;
      break;
    }
    case STATE_PATROL:
    default: {
      if (seen && guard.suspicion >= GUARD.suspiciousAt) {
        guard.state = STATE_SUSPICIOUS;
        hooks.onSuspicion?.(guard);
      } else if (heard && guard.suspicion < GUARD.suspiciousAt) {
        // Footsteps: walk over and check where the noise came from.
        guard.state = STATE_INVESTIGATE;
        guard.lastSeen = { x: player.noise.x, y: player.noise.y };
        guard.suspicion = Math.max(guard.suspicion, GUARD.suspiciousAt);
        hooks.onSuspicion?.(guard);
      } else {
        const target = guard.patrol[guard.waypointIndex];
        if (guard.pauseTimer > 0) {
          guard.pauseTimer -= dt;
        } else {
          const arrived = moveTowardGuard(guard, target.x, target.y, GUARD.patrolSpeed, dt, rects);
          if (arrived) {
            guard.waypointIndex = (guard.waypointIndex + 1) % guard.patrol.length;
            guard.pauseTimer = 0.7;
          }
        }
      }
      break;
    }
  }
}

/** The highest suspicion across all watchers: the HUD's detection meter. */
export function maxSuspicion(watchers) {
  let top = 0;
  for (const watcher of watchers) top = Math.max(top, watcher.suspicion);
  return top;
}

/** True while any guard is chasing: the global alarm state. */
export function anyChasing(watchers) {
  return watchers.some((watcher) => watcher.state === STATE_CHASE);
}

export { STEP };
