// Keyboard and mouse input. Held keys give a steering direction; one-shot
// presses (start, restart, pause) are queued as bit flags and taken once by the
// loop, so a press between two frames is never lost and never counted twice.
// Mouse: click to confirm on menus, and click-drag to steer is not needed —
// the mouse aims the player's facing on click-to-move. Holding the left button
// steers the player toward the cursor.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const RUN = new Set(['ShiftLeft', 'ShiftRight']);
const CROUCH = new Set(['KeyC', 'ControlLeft']);

export function createInput(target) {
  let up = false;
  let down = false;
  let left = false;
  let right = false;
  let run = false;
  let crouch = false;
  let mouseDown = false;
  let mouseX = 0;
  let mouseY = 0;
  let actions = 0;

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code)) up = true;
    else if (DOWN.has(event.code)) down = true;
    else if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (RUN.has(event.code)) run = true;
    else if (CROUCH.has(event.code)) crouch = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
    else if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (RUN.has(event.code)) run = false;
    else if (CROUCH.has(event.code)) crouch = false;
  });
  window.addEventListener('blur', () => {
    up = down = left = right = run = crouch = mouseDown = false;
  });
  target.addEventListener('pointerdown', (event) => {
    mouseDown = true;
    mouseX = event.clientX;
    mouseY = event.clientY;
    actions |= ACTION_CONFIRM;
  });
  target.addEventListener('pointermove', (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
  });
  target.addEventListener('pointerup', () => {
    mouseDown = false;
  });

  return {
    /** Normalised steering direction from the held keys, or {x:0, y:0}. */
    keyDirection() {
      const x = (right ? 1 : 0) - (left ? 1 : 0);
      const y = (down ? 1 : 0) - (up ? 1 : 0);
      if (x === 0 && y === 0) return { x: 0, y: 0 };
      const length = Math.hypot(x, y);
      return { x: x / length, y: y / length };
    },
    /** 'run' | 'crouch' | 'walk' from the held stance keys. */
    stance() {
      if (crouch) return 'crouch';
      if (run) return 'run';
      return 'walk';
    },
    /** True while the left mouse button is held: steer toward the cursor. */
    mouseHeld() {
      return mouseDown;
    },
    mousePosition() {
      return { x: mouseX, y: mouseY };
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
