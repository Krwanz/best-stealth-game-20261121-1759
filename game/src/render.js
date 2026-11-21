// The renderer: a top-down camera that follows the player, vision cones drawn
// under the walls so cover reads at a glance, dark shadow zones that show what
// is safe, and a HUD with objectives, alert level, detection meter and timer.
// Canvas 2D only, no assets.

import { GUARD, LEVEL_NAME, LEVEL_SUB, PALETTE, VIEW, WORLD } from './config.js';
import { BUSHES, CRATES, EXIT, INTEL_SPOTS, SHADOWS, WALLS } from './levels.js';
import { FONT } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * ratio);
    canvas.height = Math.floor(window.innerHeight * ratio);
  }
  resize();
  window.addEventListener('resize', resize);

  /** Camera: world rectangle currently visible, following the player (or a
   * staged focus point for screenshots). */
  function cameraFor(view) {
    const focus = view.cameraFocus ?? view.player;
    const scale = Math.min(canvas.width / VIEW.width, canvas.height / VIEW.height);
    const visibleW = canvas.width / scale;
    const visibleH = canvas.height / scale;
    let x = focus.x - visibleW / 2;
    let y = focus.y - visibleH / 2;
    x = Math.max(0, Math.min(WORLD.width - visibleW, x));
    y = Math.max(0, Math.min(WORLD.height - visibleH, y));
    if (visibleW >= WORLD.width) x = (WORLD.width - visibleW) / 2;
    if (visibleH >= WORLD.height) y = (WORLD.height - visibleH) / 2;
    return { x, y, scale, visibleW, visibleH };
  }

  function drawFloor(camera) {
    const tile = 80;
    const x0 = Math.max(0, Math.floor(camera.x / tile) * tile);
    const y0 = Math.max(0, Math.floor(camera.y / tile) * tile);
    const x1 = Math.min(WORLD.width, camera.x + camera.visibleW);
    const y1 = Math.min(WORLD.height, camera.y + camera.visibleH);
    for (let y = y0; y < y1; y += tile) {
      for (let x = x0; x < x1; x += tile) {
        const even = ((x / tile) + (y / tile)) % 2 === 0;
        ctx.fillStyle = even ? PALETTE.floorA : PALETTE.floorB;
        ctx.fillRect(x, y, tile, tile);
        ctx.strokeStyle = PALETTE.floorLine;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, tile, tile);
      }
    }
  }

  function drawShadowZones() {
    for (const zone of SHADOWS) {
      ctx.fillStyle = PALETTE.shadow;
      ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
      ctx.strokeStyle = PALETTE.shadowEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);
    }
  }

  function drawCone(watcher, alerted) {
    const range = watcher.viewRange ?? GUARD.viewRange;
    const half = watcher.viewHalfAngle ?? GUARD.viewHalfAngle;
    ctx.beginPath();
    ctx.moveTo(watcher.x, watcher.y);
    ctx.arc(watcher.x, watcher.y, range, watcher.angle - half, watcher.angle + half);
    ctx.closePath();
    ctx.fillStyle = alerted ? PALETTE.coneAlert : PALETTE.coneCalm;
    ctx.fill();
    ctx.strokeStyle = alerted ? PALETTE.coneAlertEdge : PALETTE.coneCalmEdge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawWalls() {
    for (const wall of WALLS) {
      ctx.fillStyle = PALETTE.wall;
      ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
      ctx.fillStyle = PALETTE.wallTop;
      ctx.fillRect(wall.x, wall.y, wall.w, 6);
      ctx.strokeStyle = '#232833';
      ctx.lineWidth = 2;
      ctx.strokeRect(wall.x + 1, wall.y + 1, wall.w - 2, wall.h - 2);
    }
  }

  function drawCrates() {
    for (const crate of CRATES) {
      ctx.fillStyle = PALETTE.crate;
      ctx.fillRect(crate.x, crate.y, crate.w, crate.h);
      ctx.fillStyle = PALETTE.crateTop;
      ctx.fillRect(crate.x, crate.y, crate.w, 8);
      ctx.strokeStyle = '#3d2f1a';
      ctx.lineWidth = 2;
      ctx.strokeRect(crate.x + 1, crate.y + 1, crate.w - 2, crate.h - 2);
      ctx.beginPath();
      ctx.moveTo(crate.x, crate.y);
      ctx.lineTo(crate.x + crate.w, crate.y + crate.h);
      ctx.moveTo(crate.x + crate.w, crate.y);
      ctx.lineTo(crate.x, crate.y + crate.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  function drawBushes() {
    for (const bush of BUSHES) {
      ctx.fillStyle = PALETTE.bush;
      ctx.beginPath();
      ctx.arc(bush.x, bush.y, bush.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.bushLight;
      for (let i = 0; i < 5; i += 1) {
        const angle = (i / 5) * Math.PI * 2 + 0.4;
        ctx.beginPath();
        ctx.arc(bush.x + Math.cos(angle) * bush.r * 0.45, bush.y + Math.sin(angle) * bush.r * 0.45, bush.r * 0.32, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawIntel(view, time) {
    for (let i = 0; i < INTEL_SPOTS.length; i += 1) {
      if (view.intelTaken[i]) continue;
      const spot = INTEL_SPOTS[i];
      const pulse = 0.5 + 0.5 * Math.sin(time * 3 + i * 2);
      ctx.save();
      ctx.shadowColor = PALETTE.intel;
      ctx.shadowBlur = 12 + pulse * 10;
      ctx.fillStyle = '#eafff3';
      ctx.fillRect(spot.x - 10, spot.y - 13, 20, 26);
      ctx.restore();
      ctx.strokeStyle = PALETTE.intel;
      ctx.lineWidth = 2;
      ctx.strokeRect(spot.x - 10, spot.y - 13, 20, 26);
      ctx.fillStyle = '#1d7a4a';
      ctx.fillRect(spot.x - 6, spot.y - 8, 12, 2);
      ctx.fillRect(spot.x - 6, spot.y - 3, 12, 2);
      ctx.fillRect(spot.x - 6, spot.y + 2, 8, 2);
      ctx.fillStyle = PALETTE.intel;
      ctx.font = `bold 11px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(spot.label, spot.x, spot.y - 20);
    }
  }

  function drawExit(view, time) {
    const open = view.exitOpen;
    const pulse = open ? 0.5 + 0.5 * Math.sin(time * 4) : 0;
    ctx.save();
    if (open) {
      ctx.shadowColor = PALETTE.exit;
      ctx.shadowBlur = 14 + pulse * 10;
    }
    ctx.fillStyle = open ? '#0d3d24' : '#2a2f3a';
    ctx.fillRect(EXIT.x, EXIT.y, EXIT.w, EXIT.h);
    ctx.restore();
    ctx.strokeStyle = open ? PALETTE.exit : PALETTE.exitLocked;
    ctx.lineWidth = 3;
    ctx.strokeRect(EXIT.x, EXIT.y, EXIT.w, EXIT.h);
    ctx.fillStyle = open ? PALETTE.exit : PALETTE.exitLocked;
    ctx.font = `bold 20px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', EXIT.x + EXIT.w / 2, EXIT.y + EXIT.h / 2 + 7);
    if (!open) {
      ctx.font = `11px ${FONT}`;
      ctx.fillStyle = PALETTE.muted;
      ctx.fillText('LOCKED', EXIT.x + EXIT.w / 2, EXIT.y + EXIT.h + 16);
    }
  }

  function drawWatcherMark(watcher) {
    const alerted = watcher.state === 'chase';
    const suspicious = watcher.suspicion >= 0.35 && !alerted;
    if (watcher.kind === 'camera') {
      ctx.fillStyle = PALETTE.camera;
      ctx.beginPath();
      ctx.arc(watcher.x, watcher.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = alerted ? PALETTE.guardAlert : '#dfe6f2';
      ctx.beginPath();
      ctx.arc(watcher.x + Math.cos(watcher.angle) * 8, watcher.y + Math.sin(watcher.angle) * 8, 4, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.fillStyle = alerted ? PALETTE.guardAlert : PALETTE.guard;
    ctx.beginPath();
    ctx.arc(watcher.x, watcher.y, GUARD.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Facing tick: which way the guard looks.
    ctx.beginPath();
    ctx.moveTo(watcher.x, watcher.y);
    ctx.lineTo(watcher.x + Math.cos(watcher.angle) * 20, watcher.y + Math.sin(watcher.angle) * 20);
    ctx.strokeStyle = '#11141b';
    ctx.lineWidth = 4;
    ctx.stroke();
    // Helmet dot.
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.arc(watcher.x, watcher.y, 6, 0, Math.PI * 2);
    ctx.fill();
    if (alerted || suspicious) {
      ctx.font = 'bold 26px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillStyle = alerted ? PALETTE.danger : PALETTE.gold;
      ctx.fillText(alerted ? '!' : '?', watcher.x, watcher.y - 26);
    }
  }

  function drawPlayer(view) {
    const player = view.player;
    const hidden = view.playerHidden;
    ctx.save();
    if (hidden) ctx.globalAlpha = 0.55;
    ctx.fillStyle = player.crouched ? PALETTE.playerCrouch : PALETTE.player;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.crouched ? 11 : 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.x + Math.cos(player.angle) * 20, player.y + Math.sin(player.angle) * 20);
    ctx.strokeStyle = '#0b2a3a';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
    if (hidden) {
      ctx.font = 'bold 11px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillStyle = PALETTE.intel;
      ctx.fillText('HIDDEN', player.x, player.y - 22);
    }
    if (player.noise && player.running) {
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.noise.radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 220, 120, 0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function drawHud(view) {
    const w = canvas.width;
    const scale = Math.min(canvas.width / VIEW.width, canvas.height / VIEW.height);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(0, 0, w, 46 * scale);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold ${Math.round(15 * scale)}px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(LEVEL_NAME, 14 * scale, 19 * scale);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `${Math.round(11 * scale)}px ${FONT}`;
    ctx.fillText(LEVEL_SUB, 14 * scale, 35 * scale);

    const intelText = `INTEL ${view.intelCount}/${INTEL_SPOTS.length}`;
    ctx.font = `bold ${Math.round(14 * scale)}px ${FONT}`;
    ctx.fillStyle = view.intelCount >= INTEL_SPOTS.length ? PALETTE.intel : PALETTE.gold;
    ctx.textAlign = 'right';
    ctx.fillText(intelText, w - 320 * scale, 19 * scale);

    const alert = view.alertLevel;
    ctx.fillStyle = alert === 'ALARM' ? PALETTE.danger : alert === 'SUSPICIOUS' ? PALETTE.gold : PALETTE.intel;
    ctx.fillText(alert, w - 210 * scale, 19 * scale);

    // Detection meter, second row: label left of the bar, stance hint far right.
    const meterW = 130 * scale;
    const meterX = w - 320 * scale;
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `${Math.round(10 * scale)}px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText('DETECTED', meterX - 8 * scale, 36 * scale);
    ctx.fillStyle = '#2a3040';
    ctx.fillRect(meterX, 28 * scale, meterW, 8 * scale);
    ctx.fillStyle = view.maxSuspicion >= 1 ? PALETTE.danger : view.maxSuspicion >= 0.35 ? PALETTE.gold : PALETTE.intel;
    ctx.fillRect(meterX, 28 * scale, meterW * Math.min(1, view.maxSuspicion), 8 * scale);
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `${Math.round(13 * scale)}px ${FONT}`;
    ctx.fillText(formatTime(view.time), w - 14 * scale, 19 * scale);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `${Math.round(10 * scale)}px ${FONT}`;
    ctx.fillText(view.stanceHint, w - 14 * scale, 36 * scale);
    ctx.restore();
  }

  function drawMinimap(view) {
    const scale = Math.min(canvas.width / VIEW.width, canvas.height / VIEW.height);
    const mw = 150 * scale;
    const mh = 94 * scale;
    const mx = canvas.width - mw - 12 * scale;
    const my = canvas.height - mh - 12 * scale;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(10, 13, 20, 0.75)';
    ctx.fillRect(mx, my, mw, mh);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.strokeRect(mx, my, mw, mh);
    const sx = mw / WORLD.width;
    const sy = mh / WORLD.height;
    for (const wall of WALLS) {
      ctx.fillStyle = '#4b5468';
      ctx.fillRect(mx + wall.x * sx, my + wall.y * sy, Math.max(1, wall.w * sx), Math.max(1, wall.h * sy));
    }
    for (let i = 0; i < INTEL_SPOTS.length; i += 1) {
      if (view.intelTaken[i]) continue;
      ctx.fillStyle = PALETTE.intel;
      ctx.fillRect(mx + INTEL_SPOTS[i].x * sx - 2, my + INTEL_SPOTS[i].y * sy - 2, 4, 4);
    }
    ctx.fillStyle = PALETTE.exit;
    ctx.fillRect(mx + EXIT.x * sx, my + EXIT.y * sy, 6, 5);
    for (const watcher of view.watchers) {
      ctx.fillStyle = watcher.state === 'chase' ? PALETTE.danger : PALETTE.guard;
      ctx.beginPath();
      ctx.arc(mx + watcher.x * sx, my + watcher.y * sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.arc(mx + view.player.x * sx, my + view.player.y * sy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  function drawOverlay(title, lines, accent, dim = 0.72) {
    const scale = Math.min(canvas.width / VIEW.width, canvas.height / VIEW.height);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = `rgba(5, 8, 14, ${dim})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = `bold ${Math.round(44 * scale)}px ${FONT}`;
    ctx.fillText(title, cx, cy - 110 * scale);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `${Math.round(16 * scale)}px ${FONT}`;
    lines.forEach((line, index) => {
      ctx.fillText(line, cx, cy - 62 * scale + index * 26 * scale);
    });
    ctx.restore();
  }

  function drawTitleOverlay(view) {
    drawOverlay('SHADOW LEDGER', [
      'Steal back the three Meridian ledgers. Reach the EXIT unseen.',
      'WASD / arrows — move · Shift — run (loud!) · C — crouch (quiet, harder to spot)',
      'Hold mouse — steer toward the cursor · P — pause · M — mute',
      'Bushes hide you. Shadows halve detection. Guards investigate noise —',
      'a "?" means suspicious, a "!" means RUN. Cameras sweep and raise the alarm.',
      view.bestTime ? `Best escape: ${formatTime(view.bestTime)}` : 'No escape yet. The archive is waiting.',
      '',
      'Press Enter or click to begin',
    ], PALETTE.gold, 0.45);
  }

  function draw(view, screen) {
    const camera = cameraFor(view);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(camera.scale, 0, 0, camera.scale, -camera.x * camera.scale, -camera.y * camera.scale);
    drawFloor(camera);
    drawShadowZones();
    for (const watcher of view.watchers) {
      drawCone(watcher, watcher.state === 'chase' || watcher.suspicion >= 0.8);
    }
    drawWalls();
    drawCrates();
    drawBushes();
    drawIntel(view, view.time);
    drawExit(view, view.time);
    for (const watcher of view.watchers) drawWatcherMark(watcher);
    drawPlayer(view);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (screen !== SCREEN_TITLE) {
      drawHud(view);
      drawMinimap(view);
    }
    if (screen === SCREEN_TITLE) drawTitleOverlay(view);
    else if (screen === SCREEN_PAUSED) {
      drawOverlay('PAUSED', ['Take a breath. The guards keep their routes.', 'Press P or Enter to keep sneaking.'], PALETTE.text);
    } else if (screen === SCREEN_OVER) {
      drawOverlay('CAUGHT', [
        `The guards found you after ${formatTime(view.time)} with ${view.intelCount} of ${INTEL_SPOTS.length} ledgers.`,
        'The archive keeps its secrets — this time.',
        '',
        'Press Enter or click to try again',
      ], PALETTE.danger);
    } else if (screen === SCREEN_WIN) {
      drawOverlay('CLEAN GETAWAY', [
        `All three ledgers, unseen, in ${formatTime(view.time)}.`,
        'Wren slips into the night. The Meridian Archive never knew.',
        view.bestTime ? `Best escape: ${formatTime(view.bestTime)}` : '',
        '',
        'Press Enter or click to play again',
      ], PALETTE.exit);
    }
  }

  return { draw };
}

function formatTime(seconds) {
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}
