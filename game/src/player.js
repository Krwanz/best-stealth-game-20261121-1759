// The infiltrator: Wren, a courier-turned-thief stealing back the Meridian
// ledgers. Walk, run (loud) or crouch (slow, quiet, harder to spot). Pure
// logic, no DOM: Node can import this for tests.

import { PLAYER } from './config.js';
import { circleHitsRects } from './vision.js';
import { pointInBush, pointInShadow } from './levels.js';

export function createPlayer(spawn) {
  return {
    x: spawn.x,
    y: spawn.y,
    angle: -Math.PI / 2,
    crouched: false,
    running: false,
    moving: false,
    /** Footstep timer: a step sounds each time it reaches zero while moving. */
    stepTimer: 0,
    /** The noise this step makes, or null while standing still. */
    noise: null,
  };
}

/**
 * Move the player one step from a direction vector (dx, dy, already normalised
 * or zero) and a stance: 'run' | 'walk' | 'crouch'. Returns the footstep event
 * ('step' when a footstep sounds this step, else null) for the audio layer.
 */
export function stepPlayer(player, dx, dy, stance, dt, rects) {
  const speed = stance === 'run' ? PLAYER.runSpeed : stance === 'crouch' ? PLAYER.crouchSpeed : PLAYER.walkSpeed;
  player.running = stance === 'run';
  player.crouched = stance === 'crouch';
  player.moving = dx !== 0 || dy !== 0;
  if (!player.moving) {
    player.noise = null;
    return null;
  }
  player.angle = Math.atan2(dy, dx);
  const step = speed * dt;
  const nx = player.x + dx * step;
  const ny = player.y + dy * step;
  if (!circleHitsRects(nx, player.y, PLAYER.radius, rects)) player.x = nx;
  if (!circleHitsRects(player.x, ny, PLAYER.radius, rects)) player.y = ny;
  player.noise = {
    x: player.x,
    y: player.y,
    radius: stance === 'run' ? PLAYER.noiseRun : stance === 'crouch' ? PLAYER.noiseCrouch : PLAYER.noiseWalk,
  };
  // Footsteps come faster when running, slower when crouching.
  const interval = stance === 'run' ? 0.28 : stance === 'crouch' ? 0.55 : 0.38;
  player.stepTimer -= dt;
  if (player.stepTimer <= 0) {
    player.stepTimer = interval;
    return 'step';
  }
  return null;
}

/** Hiding state the vision layer needs: in a bush, in shadow, crouched. */
export function playerHiding(player) {
  const hidden = pointInBush(player.x, player.y);
  return { hidden, inShadow: pointInShadow(player.x, player.y), crouched: player.crouched };
}
