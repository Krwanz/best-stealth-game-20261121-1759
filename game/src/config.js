// Every tuning number and colour in one place. The world is a fixed 1600x1000
// archive floor; the renderer scales the camera view to the window, so no rule
// below depends on the screen size.

export const WORLD = { width: 1600, height: 1000 };

export const VIEW = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 14,
  walkSpeed: 175,
  runSpeed: 265,
  crouchSpeed: 95,
  /** Noise radius in pixels while moving: run loud, walk quiet, crouch silent. */
  noiseRun: 155,
  noiseWalk: 70,
  noiseCrouch: 26,
};

export const GUARD = {
  radius: 15,
  patrolSpeed: 78,
  investigateSpeed: 135,
  chaseSpeed: 205,
  /** Vision cone: how far a guard can see, and its half-angle in radians. */
  viewRange: 235,
  viewHalfAngle: 0.62,
  /** Suspicion 0..1. Fills while the player is seen, drains while hidden. */
  suspicionFill: 0.85,
  suspicionDrain: 0.22,
  /** Above this the guard turns suspicious ("?"); at 1.0 the alarm sounds ("!"). */
  suspiciousAt: 0.35,
  /** A guard that loses the player searches this long, then calms back to patrol. */
  searchSeconds: 5,
  /** Catch distance while chasing: a guard that close grabs the player. */
  catchDistance: 26,
  /** How close a guard must be to spot a player hiding in a bush. */
  bushSpotDistance: 72,
};

export const CAMERA = {
  viewRange: 200,
  viewHalfAngle: 0.5,
  sweepSpeed: 0.55,
  sweepArc: 1.1,
};

export const INTEL_COUNT = 3;

export const PALETTE = {
  backdrop: '#0b0e14',
  floorA: '#232833',
  floorB: '#20242e',
  floorLine: '#2b3040',
  wall: '#3a4152',
  wallTop: '#4b5468',
  crate: '#6b5433',
  crateTop: '#8a6f45',
  bush: '#1f4d2e',
  bushLight: '#2e6b40',
  shadow: 'rgba(4, 6, 12, 0.55)',
  shadowEdge: 'rgba(120, 150, 255, 0.10)',
  coneCalm: 'rgba(242, 201, 76, 0.20)',
  coneCalmEdge: 'rgba(242, 201, 76, 0.45)',
  coneAlert: 'rgba(229, 83, 75, 0.28)',
  coneAlertEdge: 'rgba(229, 83, 75, 0.65)',
  guard: '#e8b23a',
  guardAlert: '#e5534b',
  camera: '#9aa7bd',
  player: '#4fc3f7',
  playerCrouch: '#2f8fb8',
  intel: '#7df0c0',
  exit: '#3ddc84',
  exitLocked: '#8b93a3',
  panel: 'rgba(10, 13, 20, 0.82)',
  text: '#eef1f5',
  muted: '#9aa3b5',
  danger: '#ff6b5e',
  gold: '#f2c94c',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const LEVEL_NAME = 'THE MERIDIAN ARCHIVE';
export const LEVEL_SUB = 'Night shift · 3 intel files · one way out';
