// Vision: what a guard or camera can see. A watcher sees the player when the
// player is inside its cone, nothing blocks the line of sight, and the player is
// not hidden in a bush (unless the watcher is very close). Darkness and crouching
// do not hide the player outright — they slow how fast suspicion fills, which
// lives in guards.js. Pure geometry, no DOM: Node can import this for tests.

/** True when the segment (x1,y1)-(x2,y2) touches any blocking rectangle. */
export function segmentBlocked(x1, y1, x2, y2, rects) {
  for (const rect of rects) {
    if (segmentHitsRect(x1, y1, x2, y2, rect)) return true;
  }
  return false;
}

function segmentHitsRect(x1, y1, x2, y2, rect) {
  // Quick reject: both ends on one outside side.
  if (x1 < rect.x && x2 < rect.x) return false;
  if (x1 > rect.x + rect.w && x2 > rect.x + rect.w) return false;
  if (y1 < rect.y && y2 < rect.y) return false;
  if (y1 > rect.y + rect.h && y2 > rect.y + rect.h) return false;
  // An end inside the rect means the segment enters it.
  if (pointInRect(x1, y1, rect) || pointInRect(x2, y2, rect)) return true;
  // Otherwise test the four edges.
  return (
    segmentsCross(x1, y1, x2, y2, rect.x, rect.y, rect.x + rect.w, rect.y) ||
    segmentsCross(x1, y1, x2, y2, rect.x + rect.w, rect.y, rect.x + rect.w, rect.y + rect.h) ||
    segmentsCross(x1, y1, x2, y2, rect.x + rect.w, rect.y + rect.h, rect.x, rect.y + rect.h) ||
    segmentsCross(x1, y1, x2, y2, rect.x, rect.y + rect.h, rect.x, rect.y)
  );
}

function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function segmentsCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1 = direction(cx, cy, dx, dy, ax, ay);
  const d2 = direction(cx, cy, dx, dy, bx, by);
  const d3 = direction(ax, ay, bx, by, cx, cy);
  const d4 = direction(ax, ay, bx, by, dx, dy);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

function direction(ax, ay, bx, by, px, py) {
  return (px - ax) * (by - ay) - (py - ay) * (bx - ax);
}

/** Smallest absolute angle between two headings, in radians. */
export function angleDifference(a, b) {
  let diff = a - b;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff);
}

/**
 * Can this watcher see the player right now? `watcher` has x, y, angle,
 * viewRange and viewHalfAngle. `hidden` is true when the player crouches in a
 * bush; `bushSpotDistance` is how close a watcher must be to see through it.
 */
export function canSeePlayer(watcher, player, rects, hidden, bushSpotDistance) {
  const dx = player.x - watcher.x;
  const dy = player.y - watcher.y;
  const distance = Math.hypot(dx, dy);
  if (distance > watcher.viewRange) return false;
  if (hidden && distance > bushSpotDistance) return false;
  if (distance > 1 && angleDifference(Math.atan2(dy, dx), watcher.angle) > watcher.viewHalfAngle) return false;
  return !segmentBlocked(watcher.x, watcher.y, player.x, player.y, rects);
}

/** True when a circle of `radius` at (x, y) overlaps any blocking rectangle. */
export function circleHitsRects(x, y, radius, rects) {
  for (const rect of rects) {
    const nearestX = Math.max(rect.x, Math.min(x, rect.x + rect.w));
    const nearestY = Math.max(rect.y, Math.min(y, rect.y + rect.h));
    const dx = x - nearestX;
    const dy = y - nearestY;
    if (dx * dx + dy * dy < radius * radius) return true;
  }
  return false;
}
