// The one hand-designed level: the Meridian Archive at night. Walls and crates
// block movement and line of sight; bushes hide the player; shadow zones halve
// how fast guards grow suspicious. Coordinates are world pixels (1600 x 1000).

export const WALLS = [
  // Border.
  { x: 0, y: 0, w: 1600, h: 40 },
  { x: 0, y: 960, w: 1600, h: 40 },
  { x: 0, y: 0, w: 40, h: 1000 },
  { x: 1560, y: 0, w: 40, h: 1000 },
  // West gallery divider: a gap at y 400-600 is the corridor between halls.
  { x: 420, y: 40, w: 40, h: 360 },
  { x: 420, y: 600, w: 40, h: 360 },
  // Central spine: gap at the top (y 40-280) is the north passage.
  { x: 820, y: 280, w: 40, h: 680 },
  // South-east room divider: gap at x 820-880 is its door.
  { x: 880, y: 620, w: 680, h: 40 },
  // North-east reading room divider.
  { x: 1080, y: 40, w: 40, h: 220 },
  // Small pillar walls in the central hall.
  { x: 600, y: 700, w: 120, h: 40 },
  { x: 1150, y: 380, w: 40, h: 160 },
];

export const CRATES = [
  // West hall cover, near the first intel.
  { x: 180, y: 180, w: 90, h: 90 },
  { x: 290, y: 260, w: 70, h: 70 },
  { x: 120, y: 480, w: 80, h: 80 },
  // Central hall cover row.
  { x: 520, y: 470, w: 90, h: 90 },
  { x: 640, y: 620, w: 70, h: 70 },
  { x: 940, y: 180, w: 90, h: 90 },
  { x: 1060, y: 250, w: 70, h: 70 },
  // East hall cover, on the way to the exit.
  { x: 1300, y: 180, w: 90, h: 90 },
  { x: 1420, y: 330, w: 70, h: 70 },
  { x: 1240, y: 700, w: 90, h: 90 },
  { x: 1400, y: 760, w: 70, h: 70 },
  // South hall cover.
  { x: 240, y: 760, w: 90, h: 90 },
  { x: 560, y: 840, w: 70, h: 70 },
  { x: 900, y: 800, w: 90, h: 90 },
];

export const BUSHES = [
  { x: 330, y: 130, r: 58 },
  { x: 150, y: 640, r: 58 },
  { x: 560, y: 330, r: 58 },
  { x: 760, y: 880, r: 58 },
  { x: 1000, y: 470, r: 58 },
  { x: 1290, y: 480, r: 58 },
  { x: 1480, y: 560, r: 54 },
  { x: 380, y: 880, r: 54 },
];

export const SHADOWS = [
  // Dark stretches where the skylights do not reach: detection fills half as fast.
  { x: 60, y: 620, w: 220, h: 130 },
  { x: 480, y: 60, w: 260, h: 120 },
  { x: 900, y: 420, w: 190, h: 130 },
  { x: 1200, y: 80, w: 220, h: 110 },
  { x: 980, y: 700, w: 240, h: 120 },
  { x: 60, y: 320, w: 150, h: 110 },
];

export const INTEL_SPOTS = [
  { x: 210, y: 120, label: 'LEDGER A' },
  { x: 1450, y: 880, label: 'LEDGER B' },
  { x: 960, y: 110, label: 'LEDGER C' },
];

export const EXIT = { x: 1460, y: 60, w: 80, h: 70 };

export const PLAYER_SPAWN = { x: 110, y: 880 };

/** Patrol waypoints per guard, in world pixels. */
export const GUARD_PATROLS = [
  // North-west gallery sweeper.
  [{ x: 520, y: 130 }, { x: 760, y: 130 }],
  // Central hall vertical walker.
  [{ x: 700, y: 360 }, { x: 700, y: 880 }],
  // Central hall loop.
  [{ x: 900, y: 430 }, { x: 1350, y: 430 }, { x: 1350, y: 560 }, { x: 900, y: 560 }],
  // North-east reader, guarding Ledger C and the exit approach.
  [{ x: 1180, y: 130 }, { x: 1500, y: 130 }],
  // South hall sweeper.
  [{ x: 300, y: 880 }, { x: 780, y: 880 }],
  // East hall vertical walker, guarding Ledger B's approach.
  [{ x: 1450, y: 460 }, { x: 1450, y: 850 }],
];

/** Security cameras: fixed mounts that sweep a cone and raise the alarm. */
export const CAMERA_MOUNTS = [
  { x: 640, y: 60, baseAngle: Math.PI / 2 },
  { x: 880, y: 640, baseAngle: 0 },
];

/** Every rectangle that blocks movement and sight: walls plus crates. */
export function blockingRects() {
  return [...WALLS, ...CRATES];
}

/** True when the point is inside any bush (hiding cover). */
export function pointInBush(x, y) {
  for (const bush of BUSHES) {
    const dx = x - bush.x;
    const dy = y - bush.y;
    if (dx * dx + dy * dy < bush.r * bush.r) return true;
  }
  return false;
}

/** True when the point is inside a shadow zone (detection fills half as fast). */
export function pointInShadow(x, y) {
  for (const zone of SHADOWS) {
    if (x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h) return true;
  }
  return false;
}
